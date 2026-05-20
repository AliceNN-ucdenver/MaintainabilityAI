/**
 * skills — CLI subcommand backends for the agentic-SDLC Skills surface
 * declared in `vscode-extension/code-templates/skills/<name>/SKILL.md`.
 *
 * Each skill is a one-shot, stateless handler: read JSON from stdin →
 * validate with zod → do the work → write JSON to stdout. Exits 1 on
 * error with `{ok: false, reason}` payload. This shape mirrors the SKILL.md
 * "Error contract" sections so the calling agent can branch deterministically
 * on `parsed.ok === false`.
 *
 * Why a single file: the registry is small (~12 handlers), each handler is
 * thin (validation + delegate to existing nodes/readers), and keeping
 * them together makes the dispatcher / capability map obvious. If a handler
 * grows past ~150 lines, lift it into its own file under `skills/`.
 *
 * Mesh path resolution: handlers that read mesh state honor `$MESH_PATH`
 * (set by `okr-bus.yml` when it shells out to the agent). Defaults to
 * `process.cwd()` for local dev.
 *
 * Audit event format: `skill-audit-emit-event` writes a new event taxonomy
 * (event_kind: skill_call | llm_call | artifact_written | review_received |
 * state_transition | human_gate) to `okrs/<id>/audit/events/<run>.jsonl`,
 * distinct from the pipeline runner's `node_kind` events. This is the
 * canonical agentic-SDLC audit format per design §11.1.6.
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { runTavilySearch } from './nodes/tavily-search';
import { runArxivSearch } from './nodes/arxiv-search';
import { runHackerNewsSearch } from './nodes/hackernews-search';
import { runUsptoSearch } from './nodes/uspto-search';
import { dedupeAndRank } from './nodes/dedupe-and-rank';
import type { ProviderResult } from '../search/provider-result';
import type { RankedSource } from '../schemas';

/**
 * Shape every skill returns. Tagged union so the agent can branch on `ok`.
 * Handlers MUST NOT throw — they return `{ok: false, reason}` instead so
 * the calling agent can keep going (per SKILL.md error contracts).
 */
export type SkillResult =
  | ({ ok: true } & Record<string, unknown>)
  | { ok: false; reason: string };

export type SkillHandler = (input: unknown) => Promise<SkillResult>;

// ─────────────────────────────────────────────────────────────────────
// Mesh path resolution
// ─────────────────────────────────────────────────────────────────────

function meshPath(): string {
  return process.env.MESH_PATH || process.cwd();
}

// ─────────────────────────────────────────────────────────────────────
// Knowledge skills — read mesh state, return structured JSON
// ─────────────────────────────────────────────────────────────────────

const KnowledgeOkrInput = z.object({ okrId: z.string().min(1) });

/**
 * `knowledge-okr` — read `okrs/<id>/okr.yaml` and return the parsed card.
 * Matches OKRService.readRaw shape. We DO NOT enforce the full BTABoK
 * schema here — agents need the data even when the schema is a few keys
 * behind. They can validate downstream if needed.
 */
const handleKnowledgeOkr: SkillHandler = async (input) => {
  const parsed = KnowledgeOkrInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const yamlPath = path.join(meshPath(), 'okrs', parsed.data.okrId, 'okr.yaml');
  if (!fs.existsSync(yamlPath)) { return { ok: false, reason: 'okr-not-found' }; }
  try {
    const card = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
    return { ok: true, card };
  } catch (err) {
    return { ok: false, reason: `yaml-parse-failed: ${(err as Error).message}` };
  }
};

const KnowledgeMeshBarInput = z.object({ barId: z.string().min(1) });

interface AppYaml {
  application?: {
    id?: string;
    name?: string;
    description?: string;
    criticality?: string;
    repos?: string[];
  };
}

/**
 * Walk platforms/<p>/bars/* looking for an app.yaml whose application.id
 * matches. Cheap on small portfolios. Returns null when not found.
 */
function findBarDir(mesh: string, barId: string): { barDir: string; platformSlug: string } | null {
  const platformsDir = path.join(mesh, 'platforms');
  if (!fs.existsSync(platformsDir)) { return null; }
  for (const p of fs.readdirSync(platformsDir, { withFileTypes: true })) {
    if (!p.isDirectory()) { continue; }
    const barsDir = path.join(platformsDir, p.name, 'bars');
    if (!fs.existsSync(barsDir)) { continue; }
    for (const b of fs.readdirSync(barsDir, { withFileTypes: true })) {
      if (!b.isDirectory()) { continue; }
      const candidate = path.join(barsDir, b.name);
      try {
        const app = yaml.load(fs.readFileSync(path.join(candidate, 'app.yaml'), 'utf8')) as AppYaml;
        if (app?.application?.id === barId) {
          return { barDir: candidate, platformSlug: p.name };
        }
      } catch { /* ignore non-yaml entries */ }
    }
  }
  return null;
}

function readYaml<T = unknown>(p: string): T | null {
  try { return yaml.load(fs.readFileSync(p, 'utf8')) as T; } catch { return null; }
}
function readJson<T = unknown>(p: string): T | null {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as T; } catch { return null; }
}
function readDirShallow(p: string): string[] {
  try { return fs.readdirSync(p); } catch { return []; }
}

/**
 * `knowledge-mesh-bar` — return CALM model + threats + ADRs + app.yaml for
 * one BAR. Per the SKILL.md output contract:
 *   { id, name, platformId, calmModel, appYaml, repos, adrs, threats,
 *     controls, fitnessFunctions, qualityAttributes }
 */
const handleKnowledgeMeshBar: SkillHandler = async (input) => {
  const parsed = KnowledgeMeshBarInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const found = findBarDir(meshPath(), parsed.data.barId);
  if (!found) { return { ok: false, reason: 'bar-not-found' }; }
  const appYaml = readYaml<AppYaml>(path.join(found.barDir, 'app.yaml')) ?? {};
  const calmModel = readJson(path.join(found.barDir, 'architecture', 'bar.arch.json'));
  const threatModel = readYaml(path.join(found.barDir, 'architecture', 'threat-model.yaml'));
  const controls = readYaml(path.join(found.barDir, 'security', 'security-controls.yaml'));
  const fitnessFunctions = readYaml(path.join(found.barDir, 'architecture', 'fitness-functions.yaml'));
  const qualityAttributes = readYaml(path.join(found.barDir, 'architecture', 'quality-attributes.yaml'));
  const adrDir = path.join(found.barDir, 'architecture', 'ADRs');
  const adrs: Array<{ id: string; title: string; body: string }> = [];
  for (const name of readDirShallow(adrDir)) {
    if (!name.endsWith('.md')) { continue; }
    try {
      const body = fs.readFileSync(path.join(adrDir, name), 'utf8');
      const titleMatch = body.match(/^#\s+(.+)/m);
      adrs.push({
        id: name.replace(/\.md$/, ''),
        title: titleMatch?.[1] ?? name,
        body,
      });
    } catch { /* skip unreadable */ }
  }
  const app = appYaml.application ?? {};
  return {
    ok: true,
    bar: {
      id: app.id ?? parsed.data.barId,
      name: app.name ?? parsed.data.barId,
      platformId: found.platformSlug,
      calmModel,
      appYaml,
      repos: Array.isArray(app.repos) ? app.repos : [],
      adrs,
      threats: threatModel,
      controls,
      fitnessFunctions,
      qualityAttributes,
    },
  };
};

const KnowledgeMeshPlatformInput = z.object({ platformId: z.string().min(1) });

/**
 * `knowledge-mesh-platform` — read platform.arch.json + platform.yaml +
 * platform.decisions.yaml + list of child BARs.
 *
 * Platform id resolution: callers pass either the slug (e.g. "imdb") or
 * the PLT-prefixed id (e.g. "PLT-IMDB"). We try both forms.
 */
const handleKnowledgeMeshPlatform: SkillHandler = async (input) => {
  const parsed = KnowledgeMeshPlatformInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const mesh = meshPath();
  const platformsDir = path.join(mesh, 'platforms');
  if (!fs.existsSync(platformsDir)) { return { ok: false, reason: 'platform-not-found' }; }
  const requested = parsed.data.platformId;
  const slug = requested.toLowerCase().replace(/^plt-/, '');
  const platformDir = path.join(platformsDir, slug);
  if (!fs.existsSync(platformDir)) { return { ok: false, reason: 'platform-not-found' }; }
  const platformYaml = readYaml<{ id?: string; name?: string }>(path.join(platformDir, 'platform.yaml')) ?? {};
  const calmModel = readJson(path.join(platformDir, 'platform.arch.json'));
  const decisions = readYaml(path.join(platformDir, 'platform.decisions.yaml'));
  const bars: Array<{ id: string; name: string }> = [];
  for (const b of readDirShallow(path.join(platformDir, 'bars'))) {
    const appYaml = readYaml<AppYaml>(path.join(platformDir, 'bars', b, 'app.yaml'));
    const app = appYaml?.application;
    if (app?.id) { bars.push({ id: app.id, name: app.name ?? app.id }); }
  }
  return {
    ok: true,
    platform: {
      id: platformYaml.id ?? `PLT-${slug.toUpperCase()}`,
      slug,
      name: platformYaml.name ?? slug,
      calmModel,
      decisions,
      bars,
    },
  };
};

const KnowledgeMeshThreatsInput = z.object({
  concern: z.string().min(1),
  maxResults: z.number().int().positive().optional(),
});

interface ThreatEntry {
  id: string;
  category?: string;
  description?: string;
  tags?: string[];
  nistControls?: string[];
  owaspCategories?: string[];
}

/**
 * Walk every `<bar>/architecture/threat-model.yaml` AND any top-level
 * `threats/` library, collect entries, return those whose tags / category /
 * description match the concern keyword (case-insensitive substring).
 */
const handleKnowledgeMeshThreats: SkillHandler = async (input) => {
  const parsed = KnowledgeMeshThreatsInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const mesh = meshPath();
  const concern = parsed.data.concern.toLowerCase();
  const maxResults = parsed.data.maxResults ?? 20;
  const out: ThreatEntry[] = [];

  // Top-level threats library (optional convention)
  const libDir = path.join(mesh, 'threats');
  for (const name of readDirShallow(libDir)) {
    if (!name.endsWith('.yaml') && !name.endsWith('.yml')) { continue; }
    const data = readYaml<{ threats?: ThreatEntry[] } | ThreatEntry[]>(path.join(libDir, name));
    const list = Array.isArray(data) ? data : data?.threats;
    if (Array.isArray(list)) { out.push(...list); }
  }

  // Per-BAR threat models
  const platformsDir = path.join(mesh, 'platforms');
  for (const p of readDirShallow(platformsDir)) {
    const barsDir = path.join(platformsDir, p, 'bars');
    for (const b of readDirShallow(barsDir)) {
      const tm = readYaml<{ threats?: ThreatEntry[] }>(path.join(barsDir, b, 'architecture', 'threat-model.yaml'));
      if (Array.isArray(tm?.threats)) { out.push(...tm.threats); }
    }
  }

  const filtered = out.filter(t => {
    const hay = JSON.stringify(t).toLowerCase();
    return hay.includes(concern);
  }).slice(0, maxResults);

  return { ok: true, threats: filtered };
};

const KnowledgeMeshAdrsInput = z.object({
  concern: z.string().min(1),
  scope: z.object({
    platformId: z.string().optional(),
    barIds: z.array(z.string()).optional(),
  }).optional(),
  maxResults: z.number().int().positive().optional(),
});

interface AdrRecord {
  id: string;
  title: string;
  status: string;
  tags: string[];
  body: string;
  barId: string;
}

/**
 * Walk every `<bar>/architecture/ADRs/*.md`, optionally filtered by
 * platform / BAR scope, return entries whose title/body matches the
 * concern (case-insensitive substring).
 */
const handleKnowledgeMeshAdrs: SkillHandler = async (input) => {
  const parsed = KnowledgeMeshAdrsInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const mesh = meshPath();
  const concern = parsed.data.concern.toLowerCase();
  const maxResults = parsed.data.maxResults ?? 20;
  const barFilter = parsed.data.scope?.barIds ? new Set(parsed.data.scope.barIds) : null;
  const platformFilter = parsed.data.scope?.platformId?.toLowerCase().replace(/^plt-/, '') ?? null;
  const out: AdrRecord[] = [];

  const platformsDir = path.join(mesh, 'platforms');
  for (const p of readDirShallow(platformsDir)) {
    if (platformFilter && p.toLowerCase() !== platformFilter) { continue; }
    const barsDir = path.join(platformsDir, p, 'bars');
    for (const b of readDirShallow(barsDir)) {
      const appYaml = readYaml<AppYaml>(path.join(barsDir, b, 'app.yaml'));
      const barId = appYaml?.application?.id ?? b;
      if (barFilter && !barFilter.has(barId)) { continue; }
      const adrDir = path.join(barsDir, b, 'architecture', 'ADRs');
      for (const name of readDirShallow(adrDir)) {
        if (!name.endsWith('.md')) { continue; }
        try {
          const body = fs.readFileSync(path.join(adrDir, name), 'utf8');
          if (!body.toLowerCase().includes(concern)) { continue; }
          const titleMatch = body.match(/^#\s+(.+)/m);
          const statusMatch = body.match(/^##\s+Status\s*\n+\s*(\S+)/im);
          out.push({
            id: name.replace(/\.md$/, ''),
            title: (titleMatch?.[1] ?? name).trim(),
            status: (statusMatch?.[1] ?? 'unknown').trim(),
            tags: [],
            body,
            barId,
          });
        } catch { /* skip */ }
      }
    }
  }
  return { ok: true, adrs: out.slice(0, maxResults) };
};

const KnowledgeResearchInput = z.object({ okrId: z.string().min(1) });

/**
 * `knowledge-research` — read `okrs/<id>/why/research-doc.md` and surface
 * the parsed structure (R-N findings + Whitespace + References).
 *
 * Parse strategy: the synthesis prompt-pack writes deterministic section
 * headings. We extract by regex; if the doc doesn't follow the schema,
 * we return the raw body so the PRD agent can still reason about it.
 */
const handleKnowledgeResearch: SkillHandler = async (input) => {
  const parsed = KnowledgeResearchInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const docPath = path.join(meshPath(), 'okrs', parsed.data.okrId, 'why', 'research-doc.md');
  if (!fs.existsSync(docPath)) { return { ok: false, reason: 'research-not-merged-yet' }; }
  const body = fs.readFileSync(docPath, 'utf8');

  /**
   * Split by R-N headings rather than regex-capture the block — JS regex
   * lacks `\Z` and the lookahead-for-end-of-input dance is error-prone.
   * Walk line-by-line, accumulate into the current finding's block.
   */
  const findings: Array<{ id: string; title: string; supporting: string[]; contradicting: string[]; confidence: string }> = [];
  const lines = body.split('\n');
  let current: { id: string; title: string; block: string[] } | null = null;
  const flush = () => {
    if (!current) { return; }
    const blockText = current.block.join('\n');
    const supporting = [...blockText.matchAll(/^\s*-\s*(?:Supporting|S):\s*(.+)$/gm)].map(x => x[1].trim());
    const contradicting = [...blockText.matchAll(/^\s*-\s*(?:Contradicting|C):\s*(.+)$/gm)].map(x => x[1].trim());
    const confidenceMatch = blockText.match(/Confidence:\s*(HIGH|MEDIUM|LOW)/i);
    findings.push({
      id: current.id,
      title: current.title,
      supporting,
      contradicting,
      confidence: confidenceMatch?.[1].toUpperCase() ?? 'MEDIUM',
    });
    current = null;
  };
  for (const line of lines) {
    const startMatch = line.match(/^###\s+(R-\d+)\s+(.+?)\s*$/);
    if (startMatch) {
      flush();
      current = { id: startMatch[1], title: startMatch[2].trim(), block: [] };
      continue;
    }
    if (/^##\s/.test(line)) { flush(); }
    if (current) { current.block.push(line); }
  }
  flush();

  /** Pull bullets out of a labelled `## Section` until the next `## ` or EOF. */
  const pullBullets = (sectionName: string): string[] => {
    const out: string[] = [];
    let inSection = false;
    for (const line of lines) {
      if (new RegExp(`^##\\s+${sectionName}\\b`, 'i').test(line)) { inSection = true; continue; }
      if (inSection && /^##\s/.test(line)) { break; }
      if (!inSection) { continue; }
      const bullet = line.match(/^\s*-\s*(.+?)\s*$/);
      if (bullet) { out.push(bullet[1]); }
    }
    return out;
  };

  const whitespace = pullBullets('Whitespace');
  const references = pullBullets('References');

  return { ok: true, findings, whitespace, references, rawBody: body };
};

// ─────────────────────────────────────────────────────────────────────
// Search skills — thin wrappers over the existing search nodes
// ─────────────────────────────────────────────────────────────────────

const SearchQueriesInput = z.object({
  queries: z.array(z.string().min(1)).min(1),
  maxResults: z.number().int().positive().optional(),
});

const handleTavilySearch: SkillHandler = async (input) => {
  const parsed = SearchQueriesInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) { return { ok: false, reason: 'tavily-api-key-missing' }; }
  try {
    const res = await runTavilySearch({
      apiKey,
      queries: parsed.data.queries,
      maxResultsPerQuery: parsed.data.maxResults,
    });
    return { ok: true, envelopes: res.envelopes, results: res.results };
  } catch (err) {
    return { ok: false, reason: `tavily-failed: ${(err as Error).message}` };
  }
};

const handleArxivSearch: SkillHandler = async (input) => {
  const parsed = SearchQueriesInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  try {
    const res = await runArxivSearch({
      queries: parsed.data.queries,
      maxResultsPerQuery: parsed.data.maxResults,
    });
    return { ok: true, envelopes: res.envelopes, results: res.results };
  } catch (err) {
    return { ok: false, reason: `arxiv-failed: ${(err as Error).message}` };
  }
};

const handleUsptoSearch: SkillHandler = async (input) => {
  const parsed = SearchQueriesInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const apiKey = process.env.USPTO_API_KEY;
  if (!apiKey) { return { ok: false, reason: 'uspto-api-key-missing' }; }
  try {
    const res = await runUsptoSearch({
      apiKey,
      queries: parsed.data.queries,
      maxResultsPerQuery: parsed.data.maxResults,
    });
    return { ok: true, envelopes: res.envelopes, results: res.results };
  } catch (err) {
    return { ok: false, reason: `uspto-failed: ${(err as Error).message}` };
  }
};

const handleHackerNewsSearch: SkillHandler = async (input) => {
  const parsed = SearchQueriesInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  try {
    const res = await runHackerNewsSearch({
      queries: parsed.data.queries,
      hitsPerQuery: parsed.data.maxResults,
    });
    return { ok: true, envelopes: res.envelopes, results: res.results };
  } catch (err) {
    return { ok: false, reason: `hackernews-failed: ${(err as Error).message}` };
  }
};

// ─────────────────────────────────────────────────────────────────────
// Pure skills — dedupe + format
// ─────────────────────────────────────────────────────────────────────

const ProviderResultSchema = z.object({
  provider: z.string(),
  fromQuery: z.string(),
  title: z.string(),
  url: z.string(),
  content: z.string(),
  score: z.number(),
  publishedDate: z.string().optional(),
  authors: z.array(z.string()).optional(),
});

const DedupeAndRankInput = z.object({
  results: z.array(z.array(ProviderResultSchema)),
  topN: z.number().int().positive().optional(),
});

const handleDedupeAndRank: SkillHandler = async (input) => {
  const parsed = DedupeAndRankInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const flat: ProviderResult[] = parsed.data.results.flat() as ProviderResult[];
  const ranked = dedupeAndRank({ results: flat, topN: parsed.data.topN ?? 50 });
  const providerCounts: Record<string, number> = {};
  for (const r of ranked) {
    providerCounts[r.provider] = (providerCounts[r.provider] ?? 0) + 1;
  }
  return { ok: true, rankedSources: ranked, providerCounts };
};

const RankedSourceSchema = z.object({
  id: z.string(),
  provider: z.string(),
  title: z.string(),
  url: z.string(),
  retrieved_at: z.string(),
  salience_score: z.number(),
  excerpt: z.string(),
  published_at: z.string().optional(),
  authors: z.array(z.string()).optional(),
});

const FormatIssueUpdateInput = z.object({
  topic: z.string(),
  runId: z.string(),
  rankedSources: z.array(RankedSourceSchema),
  providerCounts: z.record(z.string(), z.number()),
  gapSignals: z.array(z.string()).optional(),
  meshContext: z.object({
    platformId: z.string().optional(),
    barIds: z.array(z.string()).optional(),
  }),
});

const COMMENT_BYTE_CAP = 60_000;

/**
 * `format-research-issue-update` — render the OKR issue comment that the
 * market-research-agent posts after each iteration. Pure markdown; no LLM.
 * Truncates with a footer when over 60kB (GitHub issue cap is ~65k).
 */
const handleFormatResearchIssueUpdate: SkillHandler = async (input) => {
  const parsed = FormatIssueUpdateInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const { topic, runId, rankedSources, providerCounts, gapSignals = [], meshContext } = parsed.data;
  const lines: string[] = [];
  lines.push(`## 🔍 Market research update — ${topic}`);
  lines.push('');
  lines.push(`Run \`${runId}\` — platform \`${meshContext.platformId ?? '—'}\`, BARs \`${(meshContext.barIds ?? []).join(', ') || '—'}\`.`);
  lines.push('');
  lines.push('| Provider | Ranked |');
  lines.push('|---|---:|');
  for (const [provider, count] of Object.entries(providerCounts)) {
    lines.push(`| ${provider} | ${count} |`);
  }
  lines.push('');
  if (gapSignals.length > 0) {
    lines.push('### Gap signals');
    lines.push('');
    for (const g of gapSignals) { lines.push(`- \`${g}\``); }
    lines.push('');
  }
  lines.push('### Top-ranked sources');
  lines.push('');
  for (const s of rankedSources as RankedSource[]) {
    const date = s.published_at ? ` _(${s.published_at.slice(0, 10)})_` : '';
    lines.push(`- \`${s.id}\` **[${s.title}](${s.url})** — ${s.provider}, score ${s.salience_score.toFixed(2)}${date}`);
    if (s.excerpt) { lines.push(`  > ${s.excerpt.replace(/\s+/g, ' ').trim().slice(0, 400)}`); }
  }
  let markdown = lines.join('\n');
  let byteCount = Buffer.byteLength(markdown, 'utf8');
  if (byteCount > COMMENT_BYTE_CAP) {
    markdown = markdown.slice(0, COMMENT_BYTE_CAP) + '\n\n> _Truncated — original exceeded GitHub issue-comment byte cap._';
    byteCount = Buffer.byteLength(markdown, 'utf8');
  }
  return { ok: true, markdown, byteCount };
};

// ─────────────────────────────────────────────────────────────────────
// Audit skill — hash-chained JSONL append, cross-process-safe
// ─────────────────────────────────────────────────────────────────────

const AuditEmitInput = z.object({
  okrId: z.string().min(1),
  runId: z.string().min(1),
  eventKind: z.enum(['skill_call', 'llm_call', 'artifact_written', 'review_received', 'state_transition', 'human_gate']),
  payload: z.record(z.string(), z.unknown()),
  phase: z.enum(['why', 'how', 'what']),
  intentThreadUuid: z.string().min(1),
});

const LOCK_RETRY_LIMIT = 3;
const LOCK_RETRY_BASE_MS = 50;

/** Recursive key-sorted JSON stringify so the event hash is canonical. */
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') { return JSON.stringify(value); }
  if (Array.isArray(value)) { return '[' + value.map(canonicalStringify).join(',') + ']'; }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * `audit-emit-event` — append one hash-chained event to
 * `<mesh>/okrs/<id>/audit/events/<runId>.jsonl`.
 *
 * Cross-process serialization: we use an exclusive-create lock file
 * (`<jsonl>.lock`) with bounded retries. Each call reads the existing
 * tail, computes prev_event_hash + event_id, writes the new line, then
 * releases the lock. On terminal contention returns `{ok: false,
 * reason: 'audit-write-failed-after-retries'}` per the SKILL.md
 * contract — agents treat this as non-blocking.
 */
const handleAuditEmitEvent: SkillHandler = async (input) => {
  const parsed = AuditEmitInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const { okrId, runId, eventKind, payload, phase, intentThreadUuid } = parsed.data;
  const dir = path.join(meshPath(), 'okrs', okrId, 'audit', 'events');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${runId}.jsonl`);
  const lockPath = `${filePath}.lock`;

  for (let attempt = 0; attempt < LOCK_RETRY_LIMIT; attempt++) {
    let lockFd: number | null = null;
    try {
      lockFd = fs.openSync(lockPath, 'wx');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        await sleep(LOCK_RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      return { ok: false, reason: `audit-lock-failed: ${(err as Error).message}` };
    }
    try {
      let prevHash: string | null = null;
      let nextEventId = 1;
      if (fs.existsSync(filePath)) {
        const existing = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim().length > 0);
        if (existing.length > 0) {
          const last = JSON.parse(existing[existing.length - 1]) as { event_hash: string; event_id: number };
          prevHash = last.event_hash;
          nextEventId = last.event_id + 1;
        }
      }
      const draft = {
        event_id: nextEventId,
        ts: new Date().toISOString(),
        okr_id: okrId,
        run_id: runId,
        intent_thread_uuid: intentThreadUuid,
        phase,
        event_kind: eventKind,
        payload,
        prev_event_hash: prevHash,
        event_hash: '',
      };
      const hash = sha256(canonicalStringify(draft));
      const finalEvent = { ...draft, event_hash: hash };
      fs.appendFileSync(filePath, JSON.stringify(finalEvent) + '\n', 'utf8');
      return { ok: true, chainHead: hash, eventId: nextEventId };
    } finally {
      if (lockFd !== null) { fs.closeSync(lockFd); }
      try { fs.unlinkSync(lockPath); } catch { /* lock already gone */ }
    }
  }
  return { ok: false, reason: 'audit-write-failed-after-retries' };
};

// ─────────────────────────────────────────────────────────────────────
// Registry + dispatcher
// ─────────────────────────────────────────────────────────────────────

export const SKILLS: Record<string, SkillHandler> = {
  'knowledge-okr': handleKnowledgeOkr,
  'knowledge-mesh-bar': handleKnowledgeMeshBar,
  'knowledge-mesh-platform': handleKnowledgeMeshPlatform,
  'knowledge-mesh-threats': handleKnowledgeMeshThreats,
  'knowledge-mesh-adrs': handleKnowledgeMeshAdrs,
  'knowledge-research': handleKnowledgeResearch,
  'tavily-search': handleTavilySearch,
  'arxiv-search': handleArxivSearch,
  'uspto-search': handleUsptoSearch,
  'hackernews-search': handleHackerNewsSearch,
  'dedupe-and-rank': handleDedupeAndRank,
  'format-research-issue-update': handleFormatResearchIssueUpdate,
  'audit-emit-event': handleAuditEmitEvent,
};

export function isSkillName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(SKILLS, name);
}

export async function runSkill(name: string, input: unknown): Promise<SkillResult> {
  const handler = SKILLS[name];
  if (!handler) { return { ok: false, reason: `unknown-skill: ${name}` }; }
  return handler(input);
}

/**
 * Read all of stdin as a UTF-8 string. Returns '' immediately on TTY
 * (no piped input) — handlers will reject via zod with a helpful message.
 */
export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) { return ''; }
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}
