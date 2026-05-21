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
import { createHash, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify, createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
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
// Context skills — per-BAR slices of mesh state for PRD agent grounding
//
// The prd-agent invokes these AFTER `knowledge-mesh-bar` so the heavy
// lifting (CALM, threats, ADRs, controls) is already in its working set.
// These return a focused, persona-specific slice the agent's Architect /
// Security / Quality lenses each consume in turn during synthesis.
//
// Contract: input `{platformId, barIds}` — both required. If any BAR
// isn't resolvable in the mesh, we return ok:false (HOW agent halts per
// the "PRDs MUST be grounded" hard rule rather than fabricating).
// ─────────────────────────────────────────────────────────────────────

const ContextInput = z.object({
  platformId: z.string().min(1),
  barIds: z.array(z.string().min(1)).min(1),
});

interface PerBarContext {
  barId: string;
  platformId: string;
  /** Each handler fills its own slice (architecture / security / quality). */
  slice: Record<string, unknown>;
}

/**
 * Resolve a list of BAR ids to mesh paths. Returns ok:false on the first
 * unresolvable id so the agent fails fast rather than synthesizing
 * against a partial scope.
 */
function resolveBarsOrFail(
  barIds: string[],
): { ok: true; found: Array<{ barId: string; barDir: string; platformSlug: string }> } | { ok: false; reason: string } {
  const mesh = meshPath();
  const found: Array<{ barId: string; barDir: string; platformSlug: string }> = [];
  for (const barId of barIds) {
    const r = findBarDir(mesh, barId);
    if (!r) { return { ok: false, reason: `bar-not-found: ${barId}` }; }
    found.push({ barId, barDir: r.barDir, platformSlug: r.platformSlug });
  }
  return { ok: true, found };
}

/**
 * `context-architecture` — CALM model + ADRs + fitness functions, scoped to
 * the OKR's affected BARs. The Architect persona uses this to ground FRs
 * against declared nodes and flag CALM-drift.
 */
const handleContextArchitecture: SkillHandler = async (input) => {
  const parsed = ContextInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const resolved = resolveBarsOrFail(parsed.data.barIds);
  if (!resolved.ok) { return resolved; }
  const bars: PerBarContext[] = [];
  for (const { barId, barDir, platformSlug } of resolved.found) {
    const calmModel = readJson(path.join(barDir, 'architecture', 'bar.arch.json'));
    const fitnessFunctions = readYaml(path.join(barDir, 'architecture', 'fitness-functions.yaml'));
    const adrDir = path.join(barDir, 'architecture', 'ADRs');
    const adrs: Array<{ id: string; title: string }> = [];
    for (const name of readDirShallow(adrDir)) {
      if (!name.endsWith('.md')) { continue; }
      try {
        const body = fs.readFileSync(path.join(adrDir, name), 'utf8');
        const titleMatch = body.match(/^#\s+(.+)/m);
        adrs.push({ id: name.replace(/\.md$/, ''), title: (titleMatch?.[1] ?? name).trim() });
      } catch { /* skip */ }
    }
    bars.push({ barId, platformId: platformSlug, slice: { calmModel, fitnessFunctions, adrs } });
  }
  return { ok: true, scope: parsed.data, bars };
};

/**
 * `context-security` — threats + controls, scoped to the affected BARs.
 * The Security persona maps SRs to STRIDE THR-NNN + OWASP A0X + NIST
 * controls from this slice.
 */
const handleContextSecurity: SkillHandler = async (input) => {
  const parsed = ContextInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const resolved = resolveBarsOrFail(parsed.data.barIds);
  if (!resolved.ok) { return resolved; }
  const bars: PerBarContext[] = [];
  for (const { barId, barDir, platformSlug } of resolved.found) {
    const threats = readYaml(path.join(barDir, 'architecture', 'threat-model.yaml'));
    const controls = readYaml(path.join(barDir, 'security', 'security-controls.yaml'));
    bars.push({ barId, platformId: platformSlug, slice: { threats, controls } });
  }
  return { ok: true, scope: parsed.data, bars };
};

/**
 * `context-quality` — quality attributes + fitness functions, scoped to the
 * affected BARs. The Quality persona uses this to land NFRs (perf, SLO,
 * reliability) anchored to declared QA targets.
 */
const handleContextQuality: SkillHandler = async (input) => {
  const parsed = ContextInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const resolved = resolveBarsOrFail(parsed.data.barIds);
  if (!resolved.ok) { return resolved; }
  const bars: PerBarContext[] = [];
  for (const { barId, barDir, platformSlug } of resolved.found) {
    const qualityAttributes = readYaml(path.join(barDir, 'architecture', 'quality-attributes.yaml'));
    const fitnessFunctions = readYaml(path.join(barDir, 'architecture', 'fitness-functions.yaml'));
    bars.push({ barId, platformId: platformSlug, slice: { qualityAttributes, fitnessFunctions } });
  }
  return { ok: true, scope: parsed.data, bars };
};

// ─────────────────────────────────────────────────────────────────────
// Search skills — thin wrappers over the existing search nodes
// ─────────────────────────────────────────────────────────────────────

const SearchQueriesInput = z.object({
  queries: z.array(z.string().min(1)).min(1),
  maxResults: z.number().int().positive().optional(),
});

/**
 * Shape that every search-skill returns on success. Mirrors what
 * `Promise.allSettled` produces in the node wrappers — per-query
 * envelopes (with optional error) plus the flattened results array.
 */
type SearchEnvelope = { query: string; error?: string };

/**
 * Decide whether a per-query envelope set means "the provider was reachable
 * at least once" (=> `ok: true`) or "every single query failed" (=> `ok:
 * false, reason: all-queries-failed`).
 *
 * Why this matters: previously the handlers returned `ok: true` even when
 * 100% of queries failed (because `runTavilySearch` etc. use
 * `Promise.allSettled` and never throw). That made `result_count: 0`
 * ambiguous — could be "API reached, no matches" OR "firewall blocked
 * every call." The agentic-SDLC evidence-honesty gate (§11.1.7) counts
 * ok=true as a successful provider call; this fix is what makes that
 * count actually meaningful.
 *
 * Returns `null` when at least one query reached the provider (the
 * skill returns ok:true). Otherwise returns the failure reason string
 * the skill should surface in `reason`.
 */
function detectAllQueriesFailed(envelopes: SearchEnvelope[], skill: string): string | null {
  if (envelopes.length === 0) { return null; }
  const allErrored = envelopes.every(e => e.error !== undefined && e.error.length > 0);
  if (!allErrored) { return null; }
  const firstError = envelopes[0].error ?? 'unknown';
  // `all-queries-failed:` prefix is load-bearing for the audit-validate gate's
  // pattern matching of firewall-block vs query-quality failures.
  return `all-queries-failed: ${skill} — ${firstError}`;
}

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
    const failure = detectAllQueriesFailed(res.envelopes, 'tavily-search');
    if (failure) { return { ok: false, reason: failure, envelopes: res.envelopes }; }
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
    const failure = detectAllQueriesFailed(res.envelopes, 'arxiv-search');
    if (failure) { return { ok: false, reason: failure, envelopes: res.envelopes }; }
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
    const failure = detectAllQueriesFailed(res.envelopes, 'uspto-search');
    if (failure) { return { ok: false, reason: failure, envelopes: res.envelopes }; }
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
    const failure = detectAllQueriesFailed(res.envelopes, 'hackernews-search');
    if (failure) { return { ok: false, reason: failure, envelopes: res.envelopes }; }
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

// ─────────────────────────────────────────────────────────────────────
// Knight's Seal v1 — per-run ephemeral Ed25519 signing (B27)
//
// Each run gets an ephemeral Ed25519 keypair generated on first
// `audit-emit-event` call. The PUBLIC key is persisted beside the audit
// JSONL so verify-chain (and future external auditors) can validate
// signatures forever. The PRIVATE key lives in `os.tmpdir()` for the
// duration of the run — NEVER inside the mesh repo (so a careless
// `git add` can't commit it).
//
// Per-event flow:
//   1. Build event with event_hash='' and signature=''
//   2. event_hash = sha256(canonical(event))   ← chain integrity
//   3. signature  = Ed25519(privKey, event_hash)   ← nonrepudiation
//   4. Persist {...event, event_hash, signature}
//
// Verify flow (in audit-verify-chain):
//   1. Recompute event_hash (set signature='' AND event_hash='')
//   2. Match recorded event_hash (current chain check)
//   3. Verify Ed25519(pubKey, recorded event_hash, recorded signature)
//
// Backward compat: a chain with NO signature fields is reported as
// `sealed: false, sealVerified: false` but still passes if hashes are
// intact. A chain with PARTIAL signatures is treated as tampering.
// ─────────────────────────────────────────────────────────────────────

function knightSealPubKeyPath(okrId: string, runId: string): string {
  return path.join(meshPath(), 'okrs', okrId, 'audit', 'keys', `${runId}.pub.pem`);
}

function knightSealPrivKeyPath(okrId: string, runId: string): string {
  // Tmpdir-scoped to avoid any chance of `git add`-ing a private key.
  // Filename collision-resistant via okrId+runId.
  return path.join(os.tmpdir(), '.research-runner-keys', `${okrId.replace(/[^A-Za-z0-9_-]/g, '_')}--${runId.replace(/[^A-Za-z0-9_-]/g, '_')}.priv.pem`);
}

/**
 * Load the run's private key from tmp, or generate + persist a fresh
 * keypair if this is the first event for the run. Returns both KeyObjects.
 */
function loadOrCreateRunKeypair(okrId: string, runId: string): { privKey: KeyObject; pubKey: KeyObject } {
  const privPath = knightSealPrivKeyPath(okrId, runId);
  const pubPath = knightSealPubKeyPath(okrId, runId);

  if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
    const privPem = fs.readFileSync(privPath, 'utf8');
    const pubPem = fs.readFileSync(pubPath, 'utf8');
    return {
      privKey: createPrivateKey({ key: privPem, format: 'pem' }),
      pubKey: createPublicKey({ key: pubPem, format: 'pem' }),
    };
  }

  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  fs.mkdirSync(path.dirname(privPath), { recursive: true });
  fs.writeFileSync(privPath, privPem, { encoding: 'utf8', mode: 0o600 });

  fs.mkdirSync(path.dirname(pubPath), { recursive: true });
  fs.writeFileSync(pubPath, pubPem, 'utf8');

  return { privKey: privateKey, pubKey: publicKey };
}

/** Returns null if no public key has been persisted for this run yet. */
function tryLoadRunPublicKey(okrId: string, runId: string): KeyObject | null {
  const pubPath = knightSealPubKeyPath(okrId, runId);
  if (!fs.existsSync(pubPath)) { return null; }
  try {
    return createPublicKey({ key: fs.readFileSync(pubPath, 'utf8'), format: 'pem' });
  } catch { return null; }
}

function signEventHash(privKey: KeyObject, eventHashHex: string): string {
  // Ed25519 signs raw bytes — we sign the UTF-8 bytes of the hex digest,
  // which is the canonical chain anchor. Output: 64-byte signature, hex.
  return cryptoSign(null, Buffer.from(eventHashHex, 'utf8'), privKey).toString('hex');
}

function verifyEventSignature(pubKey: KeyObject, eventHashHex: string, signatureHex: string): boolean {
  try {
    return cryptoVerify(null, Buffer.from(eventHashHex, 'utf8'), pubKey, Buffer.from(signatureHex, 'hex'));
  } catch { return false; }
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
      const { privKey, pubKey } = loadOrCreateRunKeypair(okrId, runId);
      const publicKeyPem = pubKey.export({ type: 'spki', format: 'pem' }) as string;
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
        // Embed public key on event 1 so a single-line audit excerpt
        // still names its signer. Subsequent events reference the same
        // committed key on disk; embedding on every line would balloon
        // the JSONL with no integrity gain.
        public_key: nextEventId === 1 ? publicKeyPem : null,
        event_hash: '',
        signature: '',
      };
      const hash = sha256(canonicalStringify(draft));
      const signature = signEventHash(privKey, hash);
      const finalEvent = { ...draft, event_hash: hash, signature };
      fs.appendFileSync(filePath, JSON.stringify(finalEvent) + '\n', 'utf8');
      return { ok: true, chainHead: hash, eventId: nextEventId, sealed: true };
    } finally {
      if (lockFd !== null) { fs.closeSync(lockFd); }
      try { fs.unlinkSync(lockPath); } catch { /* lock already gone */ }
    }
  }
  return { ok: false, reason: 'audit-write-failed-after-retries' };
};

// ─────────────────────────────────────────────────────────────────────
// Audit verify-chain — CI defense against forged audit logs
// ─────────────────────────────────────────────────────────────────────

const AuditVerifyInput = z.object({
  okrId: z.string().min(1),
  runId: z.string().min(1),
});

/**
 * `audit-verify-chain` — replay the hash chain over an existing audit
 * JSONL, returning `{ok: true, chainHead, eventCount}` if the chain is
 * intact or `{ok: false, reason}` on the first integrity failure.
 *
 * Why this skill exists: an agent that loses access to the runner could
 * (and on PR #105 did) self-write the JSONL with fabricated hashes. The
 * audit-and-drift workflow calls this skill after each run; verdict
 * fails + `chain-forgery-detected` label is applied on `ok:false`. The
 * verification rules are identical to `verifyChain()` in audit-emitter.ts:
 *   - first event prev_event_hash === null
 *   - each prev_event_hash === preceding event.event_hash
 *   - each event_hash === sha256(canonicalStringify(event-with-empty-hash))
 *   - event_id is monotonic from 1
 */
const handleAuditVerifyChain: SkillHandler = async (input) => {
  const parsed = AuditVerifyInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const { okrId, runId } = parsed.data;
  const filePath = path.join(meshPath(), 'okrs', okrId, 'audit', 'events', `${runId}.jsonl`);
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: `audit-jsonl-missing: ${filePath}` };
  }
  let lines: string[];
  try {
    lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim().length > 0);
  } catch (err) {
    return { ok: false, reason: `read-failed: ${(err as Error).message}` };
  }
  const pubKey = tryLoadRunPublicKey(okrId, runId);
  // Track signature state across the whole chain. v1 contract: either
  // EVERY event is signed (sealed=true) or NO event is signed (legacy
  // pre-B27 chain, sealed=false). Partial signatures = tampering.
  let signedCount = 0;
  let prev: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(lines[i]) as Record<string, unknown>;
    } catch (err) {
      return { ok: false, reason: `bad-jsonl-line-${i + 1}: ${(err as Error).message}` };
    }
    if (event.event_id !== i + 1) {
      return { ok: false, reason: `event-id-mismatch-line-${i + 1}: expected ${i + 1} got ${event.event_id}` };
    }
    if (event.prev_event_hash !== prev) {
      return { ok: false, reason: `prev-hash-mismatch-line-${i + 1}: expected ${prev ?? 'null'} got ${event.prev_event_hash ?? 'null'}` };
    }
    const recordedHash = event.event_hash;
    if (typeof recordedHash !== 'string') {
      return { ok: false, reason: `missing-event-hash-line-${i + 1}` };
    }
    const recordedSignature = typeof event.signature === 'string' ? event.signature : null;
    // Recompute hash with BOTH event_hash and signature zeroed, since
    // both are filled in after the hash is computed at write time.
    const draft = { ...event, event_hash: '', signature: recordedSignature !== null ? '' : undefined };
    if (recordedSignature === null) { delete (draft as Record<string, unknown>).signature; }
    const recomputed = sha256(canonicalStringify(draft));
    if (recordedHash !== recomputed) {
      return { ok: false, reason: `forged-hash-line-${i + 1}: recorded=${recordedHash.slice(0, 16)}… recomputed=${recomputed.slice(0, 16)}…` };
    }
    if (recordedSignature !== null) { signedCount++; }
    prev = recordedHash;
  }

  // Knight's Seal verification: enforce all-or-nothing.
  const sealed = signedCount > 0;
  let sealVerified = false;
  if (sealed) {
    if (signedCount !== lines.length) {
      return { ok: false, reason: `partial-signatures: ${signedCount}/${lines.length} events signed (chain tampered)` };
    }
    if (!pubKey) {
      return { ok: false, reason: `public-key-missing: events are signed but no <runId>.pub.pem found in audit/keys/` };
    }
    for (let i = 0; i < lines.length; i++) {
      const event = JSON.parse(lines[i]) as { event_hash: string; signature: string };
      if (!verifyEventSignature(pubKey, event.event_hash, event.signature)) {
        return { ok: false, reason: `signature-mismatch-line-${i + 1}: Ed25519 verify failed` };
      }
    }
    sealVerified = true;
  }
  return { ok: true, chainHead: prev, eventCount: lines.length, sealed, sealVerified };
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
  'context-architecture': handleContextArchitecture,
  'context-security': handleContextSecurity,
  'context-quality': handleContextQuality,
  'tavily-search': handleTavilySearch,
  'arxiv-search': handleArxivSearch,
  'uspto-search': handleUsptoSearch,
  'hackernews-search': handleHackerNewsSearch,
  'dedupe-and-rank': handleDedupeAndRank,
  'format-research-issue-update': handleFormatResearchIssueUpdate,
  'audit-emit-event': handleAuditEmitEvent,
  'audit-verify-chain': handleAuditVerifyChain,
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
