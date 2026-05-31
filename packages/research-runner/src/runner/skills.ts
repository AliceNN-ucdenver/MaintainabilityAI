/**
 * skills — CLI subcommand backends for the agentic-SDLC Skills surface
 * declared in `vscode-extension/code-templates/skills/<name>/SKILL.md`.
 * Bug V (Codex round-6): WORKFLOW_EMITTABLE_KINDS narrowed; self_review
 * + review_received are agent-signed only — see allowlist definition.
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
 * Audit event format: `skill-audit-emit-event` writes the canonical
 * agentic-SDLC event taxonomy to `okrs/<id>/audit/events/<run>.jsonl`,
 * distinct from the pipeline runner's `node_kind` events. Runtime-only
 * kinds (`skill_call`, `llm_call`) are module-private emissions from
 * `runSkill()`; agent and workflow kinds enter through the public
 * `audit-emit-event` skill.
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
import { buildSearchAuditMetadata } from '../search/audit-preview';
import type { RankedSource } from '../schemas';
import { readSessionContext, type SessionContext } from './session-context';
import { withGuardrails } from './guardrails/envelope';

/**
 * Shape every skill returns. Tagged union so the agent can branch on `ok`.
 * Handlers MUST NOT throw — they return `{ok: false, reason}` instead so
 * the calling agent can keep going (per SKILL.md error contracts).
 *
 * Optional `auditMetadata` field (B28): structured key/value pairs that the
 * auto-emitter merges into the `skill_call` event payload. Handlers use it
 * to declare audit-worthy details (search-skill `queries` + `result_count`,
 * etc.) without the agent having to re-author them in an audit-emit-event
 * call. Canonical fields (`skill`, `ok`, `duration_ms`, `reason`) always
 * win on collision so handlers can't accidentally overwrite them.
 */
export type SkillResult =
  | ({ ok: true; auditMetadata?: Record<string, unknown> } & Record<string, unknown>)
  | { ok: false; reason: string; auditMetadata?: Record<string, unknown> };

export type SkillHandler = (input: unknown) => Promise<SkillResult>;

// ─────────────────────────────────────────────────────────────────────
// Mesh path resolution
// ─────────────────────────────────────────────────────────────────────

function meshPath(): string {
  return process.env.MESH_PATH || process.cwd();
}

/**
 * Codex-r3 Bug 1 (Tier 2 hand-off): target-repo working-copy root for the
 * implementation-agent. Honors `REPO_PATH` first, falls back to `process.cwd()`.
 *
 * Codex-r4 Bug 4 — the fallback exists because when the runner is invoked
 * from the target repo's working directory (the implementation-agent is
 * dispatched via custom-agent assignment — NOT a workflow `cd` — so its
 * session cwd IS the target repo), `cwd()` is the right answer without
 * any extra env-var wiring. The `REPO_PATH` env var is the explicit
 * override for tests + alternate harnesses where the runner isn't already
 * rooted at the target repo.
 *
 * Distinct from `meshPath()` — the mesh is governance-mesh state (OKR yaml,
 * audit chain ladder, design fan-out file). The repo is the TARGET code repo
 * being implemented (the impl PR lands here; its audit chain lives at
 * `<repo>/.maintainability/audit/...` so external evidence stays with the
 * code under review).
 */
function repoPath(): string {
  return process.env.REPO_PATH || process.cwd();
}

/**
 * Codex-r3 Bug 1 — audit base directory resolver.
 *
 * Routing rule: `runId` starting with `IMPL-` is the implementation phase
 * (per the D-PR7 storage contract `IMPL-<date>-<slug>-<nonce>`); its audit
 * evidence lives in the TARGET repo at `<repo>/.maintainability/audit/`.
 * Everything else (RES-*, PRD-*, WHAT-*) lives in the mesh at
 * `<mesh>/okrs/<id>/audit/`.
 *
 * The prefix check is intentionally string-based (no phase argument) so the
 * verifier — which only receives `runId` over its CLI — uses the same
 * routing as the emitter. Symmetry is mandatory; a mismatch would either
 * write to one place and verify from another (false negative) or refuse to
 * verify a legitimate chain (false positive).
 */
function auditBaseDir(okrId: string, runId: string): string {
  if (runId.startsWith('IMPL-')) {
    return path.join(repoPath(), '.maintainability', 'audit');
  }
  return path.join(meshPath(), 'okrs', okrId, 'audit');
}

function auditEventsFile(okrId: string, runId: string): string {
  return path.join(auditBaseDir(okrId, runId), 'events', `${runId}.jsonl`);
}

function auditKeysDir(okrId: string, runId: string): string {
  return path.join(auditBaseDir(okrId, runId), 'keys');
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
// Self-review provenance skills (B29) — pure-data attempt-tracking for
// prd-agent's persona-switch self-critique loop.
//
// Why these exist (PR #112 forensic):
// The persona-switch self-critique is a prompt-level reasoning step;
// pre-B29 it emitted ZERO skill_call events. So the audit chain had
// no proof that the agent entered round N of Architect or Security
// review. On PR #112 the prd-agent hallucinated `tier=restricted` and
// skipped the loop entirely, claiming `SKIPPED_RESTRICTED_TIER` in
// the PRD frontmatter — when the OKR action's actual governanceTier
// was `supervised`. The chain showed nothing wrong because nothing
// in the chain referenced self-critique at all.
//
// These skills don't "do" the review (the LLM still does that). They
// hand the agent the AUTHORITATIVE inputs: the OKR action's frozen
// tier, the resulting max_auto_rounds, a should_proceed gate, and
// the contents of `.caterpillar/prompts/prd/<persona>-review.md`.
// Because every runSkill() auto-emits, the chain proves: "agent
// entered persona X, round N, was told tier=Y, max_rounds=Z,
// should_proceed=W." If a subsequent `### Self-review — <persona>
// (round N)` block doesn't appear in the PR body, that's a clear
// contract violation visible in the audit comment.
// ─────────────────────────────────────────────────────────────────────

const SelfReviewInput = z.object({
  okrId: z.string().min(1),
  runId: z.string().min(1),
  round: z.number().int().positive(),
});

/**
 * Tier → MAX_AUTO_ROUNDS mapping per design §6.2. Restricted=0 means the
 * loop is skipped entirely (mandatory human gate). The agent SHOULD NOT
 * be inferring tier from any other source; this is the single source of
 * truth for the OKR run that's been frozen at dispatch time.
 */
function tierMaxRounds(tier: string): number {
  const t = tier.toLowerCase();
  if (t === 'autonomous') { return 3; }
  if (t === 'supervised') { return 2; }
  return 0; // restricted / unknown
}

interface OkrYamlActionShape {
  runId?: string;
  governanceTier?: string;
}
interface OkrYamlShape {
  actions?: OkrYamlActionShape[];
}

/**
 * Factory: builds a self-review skill handler for one persona. Pure
 * data — reads OKR yaml + prompt pack file, computes tier-driven gating,
 * returns the bundle. No LLM, no synthesis.
 */
function makeSelfReviewHandler(persona: 'architect' | 'security'): SkillHandler {
  return async (input) => {
    const parsed = SelfReviewInput.safeParse(input);
    if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
    const mesh = meshPath();
    const okrPath = path.join(mesh, 'okrs', parsed.data.okrId, 'okr.yaml');
    if (!fs.existsSync(okrPath)) { return { ok: false, reason: 'okr-not-found' }; }
    const card = readYaml<OkrYamlShape>(okrPath);
    const action = card?.actions?.find(a => a.runId === parsed.data.runId);
    if (!action) {
      return { ok: false, reason: `action-not-found: no actions[] entry with runId=${parsed.data.runId}` };
    }
    const tier = (action.governanceTier ?? '').toLowerCase();
    const maxAutoRounds = tierMaxRounds(tier);
    const shouldProceed = tier !== 'restricted' && parsed.data.round <= maxAutoRounds;
    // Prompt-pack filename note: the persona is "architect" but the
    // pack file is "architecture-review.md" (full word). Map explicitly
    // so we don't accidentally look for "architect-review.md".
    const promptFilename = persona === 'architect' ? 'architecture-review.md' : 'security-review.md';
    const promptPath = path.join(mesh, '.caterpillar', 'prompts', 'prd', promptFilename);
    let promptPack = '';
    let promptPackFound = false;
    if (fs.existsSync(promptPath)) {
      try { promptPack = fs.readFileSync(promptPath, 'utf8'); promptPackFound = true; } catch { /* leave empty */ }
    }
    // The chain only needs the small fields, not the whole prompt-pack
    // body — auditMetadata controls what lands in the skill_call event.
    const auditMetadata = {
      persona,
      tier,
      max_auto_rounds: maxAutoRounds,
      round: parsed.data.round,
      should_proceed: shouldProceed,
      prompt_pack_path: promptPath,
      prompt_pack_found: promptPackFound,
    };
    return {
      ok: true,
      persona,
      tier,
      maxAutoRounds,
      round: parsed.data.round,
      shouldProceed,
      promptPack,
      promptPackPath: promptPath,
      promptPackFound,
      auditMetadata,
    } as SkillResult;
  };
}

const handleSelfReviewArchitect = makeSelfReviewHandler('architect');
const handleSelfReviewSecurity = makeSelfReviewHandler('security');

// ─────────────────────────────────────────────────────────────────────
// knowledge-prd — D-PR1.v1.1 fix. Was deployed as a Skill template but
// the runner had no handler, so the code-design-agent's first attempt at
// invoking it on PR #120 returned `{"ok":false,"reason":"unknown-skill"}`.
// Agent fell back to direct file read + grep, which worked, but the chain
// has no `knowledge-prd` event proving the PRD was structurally read.
//
// Parses `okrs/<id>/how/prd.md` for FR-NN + SR-NN entries with tolerant
// regex (mirrors B31's tolerance — accepts `FR-NN` / `FR NN` / `**FR-NN**`
// heading or bold markers). Best-effort extraction of cited sources +
// STRIDE / OWASP anchors per requirement.
// ─────────────────────────────────────────────────────────────────────

const KnowledgePrdInput = z.object({ okrId: z.string().min(1) });

/**
 * Extract FR-NN / SR-NN requirement entries from a PRD body. Tolerant
 * to several markdown forms the prd-agent has emitted over time:
 *   - `### FR-01: <title>` (H3 heading)
 *   - `**FR-01**: <title>` (bold-anchor inline)
 *   - `- **FR-01**: <title>` (bullet w/ bold anchor)
 *
 * Returns one record per logical id. Same id seen twice (heading + bullet
 * form) is deduped — first occurrence wins (heading usually).
 */
function parsePrdRequirements(body: string, prefix: 'FR' | 'SR'): Array<{
  id: string;
  text: string;
  sources?: string[];
  stride?: string[];
  owasp?: string[];
}> {
  const seen = new Set<string>();
  const out: Array<{ id: string; text: string; sources?: string[]; stride?: string[]; owasp?: string[] }> = [];
  // Match the requirement id and the rest of the line. The id form
  // accepts `FR-NN` / `FR NN` (no dash) for forgiveness — same shape as
  // B31's `[CRSE]-?\d+`. Captures the text content that follows.
  const idRegex = new RegExp(`(?:^|\\s|\\*\\*)${prefix}[-\\s]?(\\d+)(?:\\*\\*)?\\s*[:.]?\\s*(.*?)(?:\\*\\*|$)`, 'gmi');
  const lines = body.split('\n');
  // Walk line-by-line and accumulate a window of context (this line +
  // next ~6 lines) so source/anchor citations on a "Traces to:" line
  // immediately following the heading get associated with the right id.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(new RegExp(`(?:^|\\s|\\*\\*)${prefix}[-\\s]?(\\d+)(?:\\*\\*)?\\s*[:.]\\s*(.*?)\\s*$`, 'i'));
    if (!m) { continue; }
    const num = m[1];
    const id = `${prefix}-${num.padStart(2, '0')}`;
    if (seen.has(id)) { continue; }
    seen.add(id);
    let text = (m[2] || '').replace(/\*\*/g, '').trim();
    // Collect 6 lines forward for source / anchor scanning.
    const window = lines.slice(i, Math.min(i + 7, lines.length)).join('\n');
    const sources = [...window.matchAll(/[CRSE]-?\d+/g)].map(x => x[0].replace(/(?<=[CRSE])\B/, '-').replace('--', '-'));
    const dedupSrc = Array.from(new Set(sources));
    const record: { id: string; text: string; sources?: string[]; stride?: string[]; owasp?: string[] } = { id, text };
    if (prefix === 'FR' && dedupSrc.length > 0) {
      record.sources = dedupSrc;
    }
    if (prefix === 'SR') {
      const stride = [...window.matchAll(/THR-\d{3}/gi)].map(x => x[0].toUpperCase());
      const owasp = [...window.matchAll(/A0[1-9]|A10/gi)].map(x => x[0].toUpperCase());
      if (stride.length > 0) { record.stride = Array.from(new Set(stride)); }
      if (owasp.length > 0) { record.owasp = Array.from(new Set(owasp)); }
    }
    out.push(record);
  }
  void idRegex;
  return out;
}

/**
 * Extract a Coverage Analysis table from the PRD body. Format expected:
 *   | FR/SR | Source | Status |
 *   |---|---|---|
 *   | FR-01 | R-2,E-1 | YES |
 *   ...
 * Returns a map id → bool (YES → true, PARTIAL/NO → false).
 */
function parsePrdCoverage(body: string): Record<string, boolean> {
  const coverage: Record<string, boolean> = {};
  const lines = body.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*\|\s*((?:FR|SR)[-\s]?\d+)\s*\|.*\|\s*(YES|PARTIAL|NO)\s*\|/i);
    if (!m) { continue; }
    const rawId = m[1].toUpperCase();
    const numMatch = rawId.match(/(\d+)/);
    if (!numMatch) { continue; }
    const id = `${rawId.startsWith('FR') ? 'FR' : 'SR'}-${numMatch[1].padStart(2, '0')}`;
    coverage[id] = m[2].toUpperCase() === 'YES';
  }
  return coverage;
}

const handleKnowledgePrd: SkillHandler = async (input) => {
  const parsed = KnowledgePrdInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const docPath = path.join(meshPath(), 'okrs', parsed.data.okrId, 'how', 'prd.md');
  if (!fs.existsSync(docPath)) { return { ok: false, reason: 'prd-not-merged-yet' }; }
  const body = fs.readFileSync(docPath, 'utf8');
  const functionalRequirements = parsePrdRequirements(body, 'FR');
  const securityRequirements = parsePrdRequirements(body, 'SR');
  const coverage = parsePrdCoverage(body);
  const auditMetadata = {
    okr_id: parsed.data.okrId,
    fr_count: functionalRequirements.length,
    sr_count: securityRequirements.length,
    coverage_rows: Object.keys(coverage).length,
  };
  return {
    ok: true,
    functionalRequirements,
    securityRequirements,
    coverage,
    docPath,
    auditMetadata,
  } as SkillResult;
};

/**
 * D-PR1 — code-phase persona-switch self-review. Same B29 pattern as the
 * PRD-phase architect/security handlers above, but reads the WHAT-phase
 * prompt packs at `.caterpillar/prompts/code-design/*` instead of the
 * PRD packs. Returns the authoritative tier + MAX_AUTO_ROUNDS so the
 * code-design-agent can't hallucinate its persona-switch budget.
 *
 * The agent's flow (per the code-design-agent.agent.md contract):
 *   1. First-pass synthesis (no persona — author voice).
 *   2. Inhabit code-architect persona → call this Skill with round=1.
 *      Read the returned promptPack as the critique criteria. Produce a
 *      structured SCORE/SEVERITY/COVERED/MISSING/CHANGES block in the PR body.
 *   3. Same for code-security persona, round=1.
 *   4. If either round-1 severity > PASS AND round < maxAutoRounds: revise
 *      the code-design, call this Skill with round=2, produce round-2 blocks.
 *   5. Restricted tier (maxAutoRounds=0) skips persona-switch entirely;
 *      shouldProceed returns false → the agent reports the un-critiqued
 *      design and the audit-and-drift workflow gates on HumanGate.
 */
function makeCodeReviewHandler(persona: 'code-architect' | 'code-security'): SkillHandler {
  return async (input) => {
    const parsed = SelfReviewInput.safeParse(input);
    if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
    const mesh = meshPath();
    const okrPath = path.join(mesh, 'okrs', parsed.data.okrId, 'okr.yaml');
    if (!fs.existsSync(okrPath)) { return { ok: false, reason: 'okr-not-found' }; }
    const card = readYaml<OkrYamlShape>(okrPath);
    const action = card?.actions?.find(a => a.runId === parsed.data.runId);
    if (!action) {
      return { ok: false, reason: `action-not-found: no actions[] entry with runId=${parsed.data.runId}` };
    }
    const tier = (action.governanceTier ?? '').toLowerCase();
    const maxAutoRounds = tierMaxRounds(tier);
    const shouldProceed = tier !== 'restricted' && parsed.data.round <= maxAutoRounds;
    // code-design prompt packs live alongside the prd packs but in a
    // separate subdir so the agent can't confuse "PRD architecture review"
    // (mesh-grounded) with "code-design architecture review" (code-grounded).
    const promptFilename = persona === 'code-architect' ? 'architecture-review.md' : 'security-review.md';
    const promptPath = path.join(mesh, '.caterpillar', 'prompts', 'code-design', promptFilename);
    let promptPack = '';
    let promptPackFound = false;
    if (fs.existsSync(promptPath)) {
      try { promptPack = fs.readFileSync(promptPath, 'utf8'); promptPackFound = true; } catch { /* leave empty */ }
    }
    const auditMetadata = {
      persona,
      phase: 'what',
      tier,
      max_auto_rounds: maxAutoRounds,
      round: parsed.data.round,
      should_proceed: shouldProceed,
      prompt_pack_path: promptPath,
      prompt_pack_found: promptPackFound,
    };
    return {
      ok: true,
      persona,
      phase: 'what',
      tier,
      maxAutoRounds,
      round: parsed.data.round,
      shouldProceed,
      promptPack,
      promptPackPath: promptPath,
      promptPackFound,
      auditMetadata,
    } as SkillResult;
  };
}

const handleSelfReviewCodeArchitect = makeCodeReviewHandler('code-architect');
const handleSelfReviewCodeSecurity = makeCodeReviewHandler('code-security');

// ─────────────────────────────────────────────────────────────────────
// Codex-r4 Bug 2 — implementation-phase self-review skills.
//
// The pre-existing self-review-code-* skills (WHAT phase) read
// `okrs/<id>/okr.yaml` from MESH_PATH and look up the actions[] entry
// by runId to authoritatively source `governanceTier`. That contract
// breaks for the implementation-agent because:
//
//   - The impl agent runs INSIDE the TARGET REPO (no MESH_PATH).
//   - The impl agent's runId is `IMPL-*` (not present in okr.yaml's
//     actions[] — those are WHY/HOW/WHAT run ids).
//
// Pre-fix the impl agent template told the agent to call
// self-review-code-architect / self-review-code-security; in the
// target-repo context those calls return `okr-not-found` (no MESH_PATH)
// or `action-not-found: no actions[] entry with runId=IMPL-…`. The
// audit chain would either lack the self-review skill_call entirely
// or carry a failed one with no signed self_review event behind it.
//
// Fix: ship two new skills that mirror the same data-only contract but
// adapt to the impl context:
//
//   - read prompt pack from `$REPO_PATH/.cheshire/prompts/implementation/
//     <persona>-review.md` (the Cheshire scaffold installs these on
//     the first fan-out into a target repo);
//   - accept `tier` inline (the landing issue's Hatter Tag carries the
//     tier the OKR was frozen at, so the agent can pass it directly);
//   - REQUIRE the runId to start with `IMPL-` (fail-loud on misuse —
//     mirrors the Bug 3 phase/runId guard);
//   - emit `phase: 'implementation'` in auditMetadata so the rollup +
//     UI metric extractors see the right phase label.
//
// The handler shape (return fields) matches makeCodeReviewHandler so
// the agent's persona-prompt block format is unchanged.
// ─────────────────────────────────────────────────────────────────────

const SelfReviewImplInput = z.object({
  okrId: z.string().min(1),
  runId: z.string().min(1),
  round: z.number().int().positive(),
  // Tier is authoritative-from-landing-issue in the impl context. The
  // landing issue's Hatter Tag continuation block carries the OKR's
  // frozen governance tier (so the agent can't drift it). Required —
  // we don't infer it because there's no mesh state to read from.
  tier: z.string().min(1),
});

/**
 * Factory: build a self-review skill handler for the IMPLEMENTATION
 * phase (one persona). Reads prompt pack from the target repo's
 * Cheshire scaffold; emits implementation-phase audit metadata.
 *
 * Sibling of makeCodeReviewHandler (WHAT phase). Same return shape so
 * UI metric extractors work unchanged.
 */
function makeImplReviewHandler(persona: 'impl-architect' | 'impl-security'): SkillHandler {
  return async (input) => {
    const parsed = SelfReviewImplInput.safeParse(input);
    if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
    // Fail-loud on misuse: this skill is for IMPL-* run ids only. An
    // accidental WHAT-* runId here would write impl-labeled audit
    // metadata under a WHAT-phase chain — same class of bug Codex-r4
    // Bug 3 closes on the audit-emit side. Defense in depth.
    if (!parsed.data.runId.startsWith('IMPL-')) {
      return {
        ok: false,
        reason: `runid-not-impl: ${persona} expects an IMPL-* run id (the implementation phase contract); got ${parsed.data.runId}. Pass parent_run_id (the WHAT run) to self-review-code-* instead.`,
      };
    }
    const tier = parsed.data.tier.toLowerCase();
    const maxAutoRounds = tierMaxRounds(tier);
    const shouldProceed = tier !== 'restricted' && parsed.data.round <= maxAutoRounds;
    // Prompt-pack filename note: persona is `impl-architect` /
    // `impl-security`; pack file is `architect-review.md` /
    // `security-review.md` (no "impl-" prefix in the filename —
    // the directory `.cheshire/prompts/implementation/` IS the
    // phase scoping).
    const promptFilename = persona === 'impl-architect' ? 'architect-review.md' : 'security-review.md';
    const promptPath = path.join(repoPath(), '.cheshire', 'prompts', 'implementation', promptFilename);
    let promptPack = '';
    let promptPackFound = false;
    if (fs.existsSync(promptPath)) {
      try { promptPack = fs.readFileSync(promptPath, 'utf8'); promptPackFound = true; } catch { /* leave empty */ }
    }
    const auditMetadata = {
      persona,
      phase: 'implementation',
      tier,
      max_auto_rounds: maxAutoRounds,
      round: parsed.data.round,
      should_proceed: shouldProceed,
      prompt_pack_path: promptPath,
      prompt_pack_found: promptPackFound,
    };
    return {
      ok: true,
      persona,
      phase: 'implementation',
      tier,
      maxAutoRounds,
      round: parsed.data.round,
      shouldProceed,
      promptPack,
      promptPackPath: promptPath,
      promptPackFound,
      auditMetadata,
    } as SkillResult;
  };
}

const handleSelfReviewImplArchitect = makeImplReviewHandler('impl-architect');
const handleSelfReviewImplSecurity = makeImplReviewHandler('impl-security');

// ─────────────────────────────────────────────────────────────────────
// knowledge-code — Phase D D6 backend. Per A12.v1.1, branches on per-repo
// `targetCodeRepoStatus`: 'connected' clones + classifies (brownfield);
// 'create' returns scaffolding hints (greenfield, no clone); 'not-connected'
// / 'unreachable' refuses with a remediation hint so the agent stops cleanly.
//
// MVP extraction is shallow (top-dirs + language map + manifest detection +
// entrypoint heuristics). Tree-sitter polyglot cross-module-call extraction
// is a follow-up (D-PR1.v1.1) — it requires per-language parsers as deps
// that bloat the runner package. The shallow shape is enough to prove the
// brownfield/greenfield contract end-to-end on the IMDB-celebs sample.
// ─────────────────────────────────────────────────────────────────────

const KnowledgeCodeInput = z.object({
  okrId: z.string().min(1),
  // Bug-Q phase 2 — `runId` is the cache key for the clone retained
  // between this skill and `knowledge-code-read`. Falls back to the
  // RUN_ID env var when omitted (the runner already sets it from
  // session context); failing both yields a clear error.
  runId: z.string().min(1).optional(),
  repoUrl: z.string().min(1),
  repoStatus: z.enum(['connected', 'not-connected', 'create', 'unreachable']),
  ref: z.string().optional(),
  maxFiles: z.number().int().positive().optional(),
});

/**
 * Map common file extensions to a primary-language label. Used for the
 * `languages` histogram in the brownfield response. Order matters when a
 * repo has multiple — the most-common wins.
 */
const LANG_EXTS: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.c': 'c', '.h': 'c',
  '.cpp': 'cpp', '.cc': 'cpp', '.hpp': 'cpp', '.hxx': 'cpp',
};

/**
 * Manifest filenames the brownfield walk surfaces so the agent can ground
 * design decisions on the repo's actual dependency posture. Keep this list
 * conservative — over-eager manifest detection is noise.
 */
const MANIFEST_FILES = new Set([
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
  'requirements.txt', 'pyproject.toml', 'Pipfile', 'Pipfile.lock', 'poetry.lock',
  'go.mod', 'go.sum',
  'Cargo.toml', 'Cargo.lock',
  'pom.xml', 'build.gradle', 'build.gradle.kts',
  'Gemfile', 'Gemfile.lock',
  'composer.json',
]);

/**
 * Walk a directory tree, capped at `maxFiles`. Returns relative paths.
 * Skips `.git/`, `node_modules/`, `__pycache__/`, and `vendor/` — the
 * convention dirs that bloat counts without informing design.
 */
function walkRepo(rootDir: string, maxFiles: number): string[] {
  const SKIP = new Set(['.git', 'node_modules', '__pycache__', 'vendor', 'dist', 'build', '.next', '.nuxt']);
  const out: string[] = [];
  function recurse(absDir: string, relBase: string): void {
    if (out.length >= maxFiles) { return; }
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(absDir, { withFileTypes: true }); }
    catch { return; }
    for (const ent of entries) {
      if (out.length >= maxFiles) { return; }
      if (SKIP.has(ent.name)) { continue; }
      const abs = path.join(absDir, ent.name);
      const rel = relBase ? `${relBase}/${ent.name}` : ent.name;
      if (ent.isDirectory()) { recurse(abs, rel); }
      else if (ent.isFile()) { out.push(rel); }
    }
  }
  recurse(rootDir, '');
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Bug-Q phase 2 — brownfield clone cache.
// ─────────────────────────────────────────────────────────────────────
// Until phase 2, `knowledge-code` cloned + classified + deleted the
// tree in one invocation. That left the agent with structural metadata
// only — no way to read actual file contents to ground its design.
// Codex audit round 2 (B1) flagged this: the prompt asks for
// `src/state/profileStore.ts`-level paths against a substrate that
// returns only top-dirs and language counts.
//
// Phase 2 splits the lifecycle:
//   1. `knowledge-code` clones + walks + classifies + RETAINS the clone
//      in a per-runId tmpdir cache.
//   2. `knowledge-code-read` reads files FROM that cache (with a
//      content-addressable re-clone fallback so a stale or expired
//      cache doesn't break the agent).
//
// The cache key is `(runId, owner, name)` — one clone per (session, repo)
// pair. Workflow runners are sandboxed per-job so tmpdir starts empty,
// so cross-run pollution is impossible. Local dev / tests can stale the
// cache; `.cache-meta.json` carries `ref` + `sha` so the read skill can
// detect staleness and re-clone.
//
// SECURITY: `knowledge-code-read` enforces a path perimeter — relative
// paths only, no `..` segments, resolved path must be a child of the
// clone root. Any escape attempt is rejected without reading bytes.
function knowledgeCodeCacheDir(runId: string, owner: string, name: string): string {
  // Filesystem-safe key. runId / owner / name are short ascii so the
  // basename can't blow up POSIX path limits.
  return path.join(os.tmpdir(), 'knowledge-code-cache', runId, `${owner}-${name}`);
}

interface CloneResult {
  ok: boolean;
  path: string;
  sha: string;
  reused: boolean;
  error?: string;
}

function ensureClone(runId: string, repoUrl: string, ref: string, owner: string, name: string): CloneResult {
  const cacheDir = knowledgeCodeCacheDir(runId, owner, name);
  const metaPath = path.join(cacheDir, '.cache-meta.json');
  // Cache hit if meta exists AND ref matches.
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as { ref?: string; sha?: string };
      if (meta.ref === ref && typeof meta.sha === 'string') {
        return { ok: true, path: cacheDir, sha: meta.sha, reused: true };
      }
    } catch { /* unreadable meta — re-clone */ }
  }
  // Clean out a stale cache before re-cloning to avoid mixing two refs.
  try { fs.rmSync(cacheDir, { recursive: true, force: true }); } catch { /* ignore */ }
  fs.mkdirSync(path.dirname(cacheDir), { recursive: true });
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
  const cloneArgs = ['clone', '--depth=1', '--filter=blob:limit=10m'];
  if (ref && ref !== 'HEAD') { cloneArgs.push('--branch', ref); }
  cloneArgs.push(repoUrl, cacheDir);
  try {
    execFileSync('git', cloneArgs, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 });
  } catch (err) {
    try { fs.rmSync(cacheDir, { recursive: true, force: true }); } catch { /* ignore */ }
    return { ok: false, path: '', sha: '', reused: false, error: err instanceof Error ? err.message : String(err) };
  }
  let sha = '';
  try {
    sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: cacheDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch { /* sha stays empty */ }
  try {
    fs.writeFileSync(metaPath, JSON.stringify({ owner, name, ref, sha, clonedAt: new Date().toISOString() }), 'utf8');
  } catch { /* meta write failure is non-fatal — next call will just re-clone */ }
  return { ok: true, path: cacheDir, sha, reused: false };
}

/**
 * Bug-Q phase 2 — extended file-level metadata.
 * A FileInfo lets the agent + the workflow path-citation gate know
 * which paths actually exist + what role each plays. Without `role`,
 * a workflow gate can't distinguish "agent cited src/state/store.ts
 * (a source path that should exist)" from "agent cited package.json
 * (a config — different validation rules)".
 */
type FileRole = 'source' | 'test' | 'config' | 'route' | 'doc' | 'other';

interface FileInfo {
  path: string;
  lang: string;
  role: FileRole;
}

function classifyRole(filePath: string, lang: string): FileRole {
  const lower = filePath.toLowerCase();
  // Tests — broadest match wins. `__tests__/` dir, `.test.`, `.spec.`,
  // or top-level `test/` / `tests/`.
  if (/(^|\/)__tests__\//.test(lower)
    || /\.(test|spec)\.(t|j)sx?$/.test(lower)
    || /\.(test|spec)\.py$/.test(lower)
    || /^test(s)?\//.test(lower)) { return 'test'; }
  // Routes — files in `routes/`, `pages/` (Next), `app/` (Next/Nuxt
  // app router), or files named `*.route(s).*`.
  if (/(^|\/)(routes|pages|app)\//.test(lower)
    || /\.routes?\.(t|j)sx?$/.test(lower)) { return 'route'; }
  // Docs — `.md`, or anything in `docs/` / `doc/`.
  if (/\.md$/i.test(lower)
    || /^docs?\//.test(lower)) { return 'doc'; }
  // Config — top-level YAML/JSON/TOML config files, manifests,
  // dot-files at root.
  const base = path.basename(filePath);
  if (MANIFEST_FILES.has(base)
    || /^\.[\w.-]+$/.test(base)  // .eslintrc, .gitignore, …
    || /(^|\/)tsconfig(\.[^.]+)?\.json$/.test(lower)
    || /(^|\/)[^/]+\.config\.(t|j)sx?$/.test(lower)) { return 'config'; }
  if (lang && lang !== 'unknown') { return 'source'; }
  return 'other';
}

/**
 * Guess the primary BAR-level language + framework from the manifest +
 * file mix, AND surface bounded file/test/route/module inventories the
 * agent + workflow gate can use to ground brownfield decisions.
 *
 * Bug-Q phase 2 (Codex audit round 2 / B1) extended the return shape
 * with `files[]`, `tests[]`, `routes[]`, `modules[]`. Before phase 2,
 * the only structural outputs were `topDirs` + `languages` + manifest
 * count — enough for the agent to KNOW what kind of repo it was, not
 * enough to GROUND specific file-level design choices.
 */
function classifyRepo(filesRaw: string[]): {
  topDirs: string[];
  languages: Record<string, number>;
  packageManifests: string[];
  files: FileInfo[];
  tests: string[];
  routes: string[];
  modules: Array<{ name: string; fileCount: number }>;
} {
  const topDirs = new Set<string>();
  const languages: Record<string, number> = {};
  const packageManifests: string[] = [];
  const files: FileInfo[] = [];
  const tests: string[] = [];
  const routes: string[] = [];
  const moduleCounts: Record<string, number> = {};
  for (const f of filesRaw) {
    const slashIdx = f.indexOf('/');
    if (slashIdx > 0) { topDirs.add(f.slice(0, slashIdx)); }
    const ext = path.extname(f).toLowerCase();
    const lang = LANG_EXTS[ext] ?? 'unknown';
    if (LANG_EXTS[ext]) { languages[lang] = (languages[lang] ?? 0) + 1; }
    const base = path.basename(f);
    if (MANIFEST_FILES.has(base)) { packageManifests.push(f); }
    const role = classifyRole(f, lang);
    files.push({ path: f, lang, role });
    if (role === 'test') { tests.push(f); }
    if (role === 'route') { routes.push(f); }
    // Modules — top-level subdirectory of `src/` if present, otherwise
    // top-level repo subdir. Skips files at the repo root (those aren't
    // module-organized).
    const srcMatch = /^src\/([^/]+)\//.exec(f);
    if (srcMatch) {
      moduleCounts[srcMatch[1]] = (moduleCounts[srcMatch[1]] ?? 0) + 1;
    } else if (slashIdx > 0) {
      const topDir = f.slice(0, slashIdx);
      // Avoid double-counting top-level dirs that are clearly not
      // modules (tests, docs, config dirs, infra dirs).
      if (!['tests', 'test', '__tests__', 'docs', 'doc', '.github', '.vscode', 'scripts'].includes(topDir)) {
        moduleCounts[topDir] = (moduleCounts[topDir] ?? 0) + 1;
      }
    }
  }
  const modules = Object.entries(moduleCounts)
    .map(([name, fileCount]) => ({ name, fileCount }))
    .sort((a, b) => b.fileCount - a.fileCount);
  return {
    topDirs: Array.from(topDirs).sort(),
    languages,
    packageManifests: packageManifests.sort(),
    files,
    tests: tests.sort(),
    routes: routes.sort(),
    modules,
  };
}

/**
 * Parse `https://github.com/<owner>/<name>` (with or without `.git` suffix,
 * with or without trailing slash). Returns null for non-GitHub URLs.
 */
function parseGithubUrl(url: string): { owner: string; name: string } | null {
  const m = url.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/);
  if (!m) { return null; }
  return { owner: m[1], name: m[2] };
}

const handleKnowledgeCode: SkillHandler = async (input) => {
  const parsed = KnowledgeCodeInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const { okrId, repoUrl, repoStatus, ref, maxFiles } = parsed.data;
  const gh = parseGithubUrl(repoUrl);
  const repoSlug = gh ? `${gh.owner}/${gh.name}` : repoUrl;

  // ─── Refuse branch (not-connected / unreachable) ───────────────────
  // The agent never grounds against ambiguous repo intent. The remediation
  // hint points the human back to the Looking Glass repo-status picker
  // — the same UI that A12.v1.1 ships.
  if (repoStatus === 'not-connected' || repoStatus === 'unreachable') {
    const auditMetadata = { phase: 'what', repo: repoSlug, mode: 'refuse', repo_status: repoStatus, okr_id: okrId };
    return {
      ok: false,
      reason: repoStatus === 'unreachable' ? 'repo-unreachable' : 'repo-not-connected',
      repo: repoSlug,
      remediation: "Open Looking Glass → OKR detail → Target Code Repos and pick a status: 'Connected' (if the repo exists and is wired) or 'Create' (if greenfield). The code-design-agent refuses to ground until every target repo's intent is explicit.",
      auditMetadata,
    } as SkillResult;
  }

  // ─── Greenfield branch (create) ────────────────────────────────────
  // No clone. Return scaffolding hints derived from the BAR's calm-node
  // language preference (if readable) so the agent's per-repo subsection
  // can lock in seed files / framework choice consistently with the rest
  // of the mesh. Optional referenceRepos (D5) plug in here when ready —
  // for D-PR1 they're an empty array placeholder.
  if (repoStatus === 'create') {
    // Conservative scaffolding hints — the agent can override these in
    // the design when it has stronger signal from BAR ADRs or the PRD.
    // We avoid over-prescribing: the goal is to seed the choice, not own it.
    const scaffoldingHints = {
      suggestedLanguage: 'typescript',
      suggestedFramework: 'express',
      seedFiles: [
        'README.md',
        'LICENSE',
        'package.json',
        'tsconfig.json',
        'src/index.ts',
        '.github/CODEOWNERS',
        '.github/workflows/red-queen-bootstrap.yml',
      ],
    };
    const auditMetadata = { phase: 'what', repo: repoSlug, mode: 'greenfield', repo_status: 'create', okr_id: okrId };
    return {
      ok: true,
      mode: 'greenfield',
      repo: repoSlug,
      reason: 'repo-status-create',
      referenceRepos: [], // D5 reference-repos integration is a follow-up
      scaffoldingHints,
      auditMetadata,
    } as SkillResult;
  }

  // ─── Brownfield branch (connected) ─────────────────────────────────
  // Bug-Q phase 2 — uses the per-runId clone cache (`ensureClone`)
  // so `knowledge-code-read` can read the same files later in the
  // session without re-cloning. The cache stays for the runner-job
  // tmpdir lifetime (workflow runners get a clean tmpdir per job, so
  // cross-run pollution is impossible).
  if (!gh) {
    return { ok: false, reason: 'repo-url-not-github', repo: repoUrl } as SkillResult;
  }
  // Resolve the session runId — explicit input wins; fall back to
  // RUN_ID env var (the runner sets this from session context).
  const runId = parsed.data.runId ?? process.env.RUN_ID;
  if (!runId) {
    return {
      ok: false,
      reason: 'missing-run-id',
      repo: repoSlug,
      remediation: "knowledge-code needs a session runId to scope the clone cache. Either pass `runId` in the skill input, or set the RUN_ID env var before invoking (the agent does this automatically via session-context export — see agent.md step 1b).",
    } as SkillResult;
  }
  const cloneRef = ref ?? 'HEAD';
  const cloneResult = ensureClone(runId, repoUrl, cloneRef, gh.owner, gh.name);
  if (!cloneResult.ok) {
    const auditMetadata = { phase: 'what', repo: repoSlug, mode: 'brownfield-clone-failed', repo_status: 'connected', okr_id: okrId };
    return {
      ok: false,
      reason: 'clone-failed',
      repo: repoSlug,
      remediation: `git clone failed for ${repoUrl}. Verify the GitHub App install is approved on this repo and the ref (${cloneRef}) exists. Underlying error: ${cloneResult.error ?? 'unknown'}`,
      auditMetadata,
    } as SkillResult;
  }
  const cloneTarget = cloneResult.path;
  const sha = cloneResult.sha;

  const cap = maxFiles ?? 200;
  const filesRaw = walkRepo(cloneTarget, cap);
  const structure = classifyRepo(filesRaw);

  // Best-effort entrypoint detection from the most-common manifest +
  // top-level layout. Conservative: only mark something as an entrypoint
  // when we have positive signal (manifest field OR conventional path).
  const entryPoints: Array<{ path: string; kind: string; framework: string }> = [];
  for (const manifestPath of structure.packageManifests) {
    if (path.basename(manifestPath) === 'package.json') {
      try {
        const pkgRaw = fs.readFileSync(path.join(cloneTarget, manifestPath), 'utf8');
        const pkg = JSON.parse(pkgRaw) as { main?: string; bin?: string | Record<string, string>; dependencies?: Record<string, string>; scripts?: Record<string, string> };
        const deps = pkg.dependencies ?? {};
        let framework = 'unknown';
        if (deps['express']) { framework = 'express'; }
        else if (deps['fastify']) { framework = 'fastify'; }
        else if (deps['hono']) { framework = 'hono'; }
        else if (deps['@nestjs/core']) { framework = 'nestjs'; }
        else if (deps['next']) { framework = 'next'; }
        else if (deps['react']) { framework = 'react'; }
        if (pkg.main) { entryPoints.push({ path: pkg.main, kind: framework === 'react' || framework === 'next' ? 'ui' : 'api', framework }); }
        if (pkg.bin) { entryPoints.push({ path: typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin)[0] ?? '', kind: 'cli', framework }); }
      } catch { /* manifest unreadable / non-JSON; skip */ }
    }
  }

  // Bug-Q phase 2 — DO NOT delete the clone here. `knowledge-code-read`
  // will reuse it through `ensureClone`. Workflow-runner tmpdir is wiped
  // when the job ends, so cleanup happens for free at the right scope.

  const primaryLanguage = Object.entries(structure.languages).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
  // Bug-Q phase 2 — surface the file/test/route/module inventory in the
  // audit payload so the workflow path-citation gate can cross-check
  // every brownfield path cited in code-design.md against what actually
  // exists in the clone. `inventory_paths` is the flat list of file
  // paths (sorted) the workflow uses as its membership set.
  const inventoryPaths = structure.files.map(f => f.path).sort();
  const auditMetadata = {
    phase: 'what',
    repo: repoSlug,
    mode: 'brownfield',
    repo_status: 'connected',
    okr_id: okrId,
    sha: sha.slice(0, 12),
    file_count: filesRaw.length,
    primary_language: primaryLanguage,
    manifests: structure.packageManifests.length,
    test_count: structure.tests.length,
    route_count: structure.routes.length,
    module_count: structure.modules.length,
    // Inventory: flat path list — bounded by the `maxFiles` cap above.
    // Workflow gate consumes this to validate cited paths.
    inventory_paths: inventoryPaths,
  };
  // Bug-R / R6 + Bug-S / S6 (Codex round-4 hardening) — persist
  // inventory to the clone cache so knowledge-code-read can strict-
  // mode validate requested paths against the same list that lands
  // in the audit chain. Round-3 caught the inventory-persist write
  // being non-fatal; round-4 flagged that as fail-open — without
  // a written inventory, knowledge-code-read's path-not-in-inventory
  // check silently falls through (the file just isn't there to
  // check against). S6 fix: persist failure is now FATAL. The
  // brownfield grounding contract requires the inventory to exist;
  // a skill_call that succeeded without writing it is a coverage lie.
  try {
    fs.writeFileSync(
      path.join(cloneTarget, '.knowledge-code-inventory.json'),
      JSON.stringify({ inventory_paths: inventoryPaths, sha, cachedAt: new Date().toISOString() }),
      'utf8',
    );
  } catch (err) {
    return {
      ok: false,
      reason: `inventory-persist-failed: ${err instanceof Error ? err.message : String(err)}`,
      repo: repoSlug,
      remediation: "knowledge-code MUST persist its file inventory so knowledge-code-read can strict-mode validate file reads against it. Check tmpdir permissions and disk space.",
    } as SkillResult;
  }
  return {
    ok: true,
    mode: 'brownfield',
    repo: { owner: gh.owner, name: gh.name, ref: cloneRef, sha },
    structure,
    entryPoints,
    auditMetadata,
  } as SkillResult;
};

// ─────────────────────────────────────────────────────────────────────
// knowledge-code-read — Bug-Q phase 2 (Codex audit round 2 / B1).
// ─────────────────────────────────────────────────────────────────────
// `knowledge-code` returns structural metadata; this skill returns
// bounded file CONTENTS so the agent can ground design with real code,
// not paraphrased guesses. Same session-scoped clone cache as
// `knowledge-code` — the read is essentially free after the initial
// clone.
//
// SECURITY PERIMETER: the runner only reads paths that resolve INSIDE
// the cloned repo. Path-traversal attempts (`../`, absolute paths) are
// rejected without reading bytes. The clone is a shallow git clone in
// an isolated tmpdir; even if a malicious file in the repo contained
// a symlink to /etc/passwd, the `realpath` check below would refuse.
//
// CONTENT BOUNDS: max 10 KB per response; binary files (any NUL byte)
// rejected. The agent is meant to read CODE, not blobs.
//
// AUDIT: every read auto-emits a skill_call event with file + bytes
// returned, so the chain captures exactly which files the agent
// consulted while writing the design.
const KnowledgeCodeReadInput = z.object({
  okrId: z.string().min(1),
  runId: z.string().min(1).optional(),
  repoUrl: z.string().min(1),
  ref: z.string().optional(),
  filePath: z.string().min(1),
});

const KNOWLEDGE_CODE_READ_MAX_BYTES = 10_240;  // 10 KB cap per response

const handleKnowledgeCodeRead: SkillHandler = async (input) => {
  const parsed = KnowledgeCodeReadInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const { okrId, repoUrl, ref, filePath } = parsed.data;
  const gh = parseGithubUrl(repoUrl);
  if (!gh) { return { ok: false, reason: 'repo-url-not-github', repo: repoUrl } as SkillResult; }
  const runId = parsed.data.runId ?? process.env.RUN_ID;
  if (!runId) {
    return {
      ok: false,
      reason: 'missing-run-id',
      remediation: "knowledge-code-read needs a session runId to find the clone cache shared with knowledge-code. Pass `runId` in input or set the RUN_ID env var (the agent does this via session-context export).",
    } as SkillResult;
  }
  // Security perimeter — reject obvious escape attempts BEFORE touching
  // the filesystem so the audit chain captures the rejection cleanly.
  if (path.isAbsolute(filePath)) {
    return { ok: false, reason: `path-rejected: absolute paths are forbidden (${filePath})` } as SkillResult;
  }
  // Normalize and re-check — a path like `foo/../../bar` would resolve
  // up two levels even though the literal string contains no leading
  // `../`. `path.normalize` collapses it; we then reject if it starts
  // with `..`.
  const normalized = path.normalize(filePath);
  if (normalized.startsWith('..') || normalized === '..' || normalized.includes(`${path.sep}..${path.sep}`)) {
    return { ok: false, reason: `path-rejected: path-traversal segments forbidden (${filePath} -> ${normalized})` } as SkillResult;
  }

  // Bug-R / R6 (Codex round-3) — auth tightening. A prior knowledge-
  // code call for this (runId, owner, name) MUST have populated the
  // cache before knowledge-code-read can return content. Closes two
  // gaps Codex flagged: (1) skill could read any public GitHub repo
  // by URL alone, (2) audit chain didn't prove the standard
  // brownfield-grounding pipeline ran before the file read. Test
  // mode (KNOWLEDGE_CODE_READ_ALLOW_UNCACHED=1) bypasses this for
  // unit tests that drive the skill directly.
  const cacheDir = knowledgeCodeCacheDir(runId, gh.owner, gh.name);
  const metaPath = path.join(cacheDir, '.cache-meta.json');
  const allowUncached = process.env.KNOWLEDGE_CODE_READ_ALLOW_UNCACHED === '1';
  if (!allowUncached && !fs.existsSync(metaPath)) {
    return {
      ok: false,
      reason: `no-prior-knowledge-code: knowledge-code-read requires a prior knowledge-code call for ${gh.owner}/${gh.name} in run ${runId}. Call knowledge-code first to clone + classify the repo, then knowledge-code-read can return file contents from the cached clone.`,
      remediation: "Call `knowledge-code` with the same repoUrl + runId before invoking knowledge-code-read. The audit chain then proves the agent went through brownfield grounding before reading files.",
    } as SkillResult;
  }
  // Reuse the cached clone from knowledge-code; clone fresh only in
  // test mode (allowUncached).
  const cloneResult = ensureClone(runId, repoUrl, ref ?? 'HEAD', gh.owner, gh.name);
  if (!cloneResult.ok) {
    return {
      ok: false,
      reason: 'clone-failed',
      repo: `${gh.owner}/${gh.name}`,
      remediation: `Could not access clone for ${repoUrl}. Underlying error: ${cloneResult.error ?? 'unknown'}`,
    } as SkillResult;
  }
  // Bug-R / R6 + Bug-S / S6 (Codex round-4 hardening) — validate
  // the requested path against the inventory persisted by knowledge-
  // code. Only paths knowledge-code advertised in `inventory_paths`
  // are readable. Round-3 left missing/malformed inventory as a
  // fall-through (silent pass); round-4 caught that as fail-open.
  // S6: missing inventory file or malformed JSON is now a HARD
  // FAILURE in non-test mode. The cache exists (we passed the
  // earlier no-cache check), so the inventory file MUST exist —
  // its absence means knowledge-code didn't complete normally.
  if (!allowUncached) {
    const inventoryPath = path.join(cloneResult.path, '.knowledge-code-inventory.json');
    if (!fs.existsSync(inventoryPath)) {
      return {
        ok: false,
        reason: `inventory-missing: ${gh.owner}/${gh.name}'s clone exists but .knowledge-code-inventory.json is absent. knowledge-code did not complete normally — re-run it before invoking knowledge-code-read.`,
      } as SkillResult;
    }
    let inv: { inventory_paths?: string[] };
    try {
      inv = JSON.parse(fs.readFileSync(inventoryPath, 'utf8')) as { inventory_paths?: string[] };
    } catch (err) {
      return {
        ok: false,
        reason: `inventory-malformed: .knowledge-code-inventory.json could not be parsed: ${err instanceof Error ? err.message : String(err)}`,
        remediation: "Re-run knowledge-code to regenerate the inventory.",
      } as SkillResult;
    }
    const allowed = new Set(inv.inventory_paths ?? []);
    if (allowed.size === 0) {
      return {
        ok: false,
        reason: `inventory-empty: .knowledge-code-inventory.json carries no inventory_paths. knowledge-code likely walked zero files (empty repo? maxFiles=0?). Cannot validate file reads.`,
      } as SkillResult;
    }
    if (!allowed.has(normalized)) {
      return {
        ok: false,
        reason: `path-not-in-inventory: ${normalized} is not in the knowledge-code inventory_paths for ${gh.owner}/${gh.name}. The agent can only read files knowledge-code advertised in the chain.`,
        remediation: "If the file is real but missed by the bounded walk (default maxFiles=200), call knowledge-code with a higher maxFiles before retrying.",
      } as SkillResult;
    }
  }
  const absPath = path.join(cloneResult.path, normalized);
  // Final paranoia check — resolve the real path and verify it's still
  // a child of the clone root. Defends against symlink-shaped escapes
  // (an attacker-controlled file in the repo that's a symlink to /etc).
  let realPath: string;
  try {
    realPath = fs.realpathSync.native(absPath);
  } catch {
    return { ok: false, reason: `file-not-found: ${filePath} not in ${gh.owner}/${gh.name}@${cloneResult.sha.slice(0, 12)}` } as SkillResult;
  }
  const realClone = fs.realpathSync.native(cloneResult.path);
  if (!realPath.startsWith(realClone + path.sep) && realPath !== realClone) {
    return { ok: false, reason: `path-escape: resolved path falls outside the cloned repo (${filePath} -> ${realPath})` } as SkillResult;
  }
  let stat: fs.Stats;
  try { stat = fs.statSync(realPath); }
  catch { return { ok: false, reason: `file-not-found: ${filePath}` } as SkillResult; }
  if (stat.isDirectory()) {
    return { ok: false, reason: `path-is-directory: ${filePath} is a directory; knowledge-code-read returns file contents only` } as SkillResult;
  }

  // Read + truncate + reject binary.
  let buf: Buffer;
  try { buf = fs.readFileSync(realPath); }
  catch (err) { return { ok: false, reason: `read-failed: ${err instanceof Error ? err.message : String(err)}` } as SkillResult; }
  // Heuristic: a NUL byte in the first 8 KB is a strong binary signal.
  // Strings of bytes that legitimately contain NUL bytes (gzip, images,
  // wasm) are not source code; refuse them.
  if (buf.slice(0, Math.min(buf.length, 8192)).includes(0)) {
    return { ok: false, reason: `binary-file: ${filePath} contains NUL bytes; knowledge-code-read returns text only` } as SkillResult;
  }
  const totalBytes = buf.length;
  const truncated = totalBytes > KNOWLEDGE_CODE_READ_MAX_BYTES;
  const content = (truncated ? buf.subarray(0, KNOWLEDGE_CODE_READ_MAX_BYTES) : buf).toString('utf8');
  const lang = LANG_EXTS[path.extname(filePath).toLowerCase()] ?? 'unknown';
  const lineCount = content.split('\n').length;

  const auditMetadata = {
    phase: 'what',
    repo: `${gh.owner}/${gh.name}`,
    file: normalized,
    sha: cloneResult.sha.slice(0, 12),
    bytes_returned: content.length,
    bytes_total: totalBytes,
    truncated,
    lang,
    okr_id: okrId,
  };
  return {
    ok: true,
    repo: `${gh.owner}/${gh.name}`,
    file: normalized,
    sha: cloneResult.sha,
    content,
    lang,
    lineCount,
    truncated,
    bytesReturned: content.length,
    bytesTotal: totalBytes,
    auditMetadata,
  } as SkillResult;
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

// `buildSearchAuditMetadata` (bounded `results_preview`) moved to
// `../search/audit-preview` (imported above) so the Oracle guardrail envelope
// can rebuild the preview from the post-screen SAFE subset — quarantined hits
// must not persist as trusted audit preview. The 4 search handlers still call
// it at their call sites below.

const handleTavilySearch: SkillHandler = async (input) => {
  const parsed = SearchQueriesInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) { return { ok: false, reason: 'tavily-api-key-missing', auditMetadata: { queries: parsed.data.queries, result_count: 0 } }; }
  try {
    const res = await runTavilySearch({
      apiKey,
      queries: parsed.data.queries,
      maxResultsPerQuery: parsed.data.maxResults,
    });
    const auditMetadata = buildSearchAuditMetadata(parsed.data.queries, res.results);
    const failure = detectAllQueriesFailed(res.envelopes, 'tavily-search');
    if (failure) { return { ok: false, reason: failure, envelopes: res.envelopes, auditMetadata }; }
    return { ok: true, envelopes: res.envelopes, results: res.results, auditMetadata };
  } catch (err) {
    return { ok: false, reason: `tavily-failed: ${(err as Error).message}`, auditMetadata: { queries: parsed.data.queries, result_count: 0 } };
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
    const auditMetadata = buildSearchAuditMetadata(parsed.data.queries, res.results);
    const failure = detectAllQueriesFailed(res.envelopes, 'arxiv-search');
    if (failure) { return { ok: false, reason: failure, envelopes: res.envelopes, auditMetadata }; }
    return { ok: true, envelopes: res.envelopes, results: res.results, auditMetadata };
  } catch (err) {
    return { ok: false, reason: `arxiv-failed: ${(err as Error).message}`, auditMetadata: { queries: parsed.data.queries, result_count: 0 } };
  }
};

const handleUsptoSearch: SkillHandler = async (input) => {
  const parsed = SearchQueriesInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const apiKey = process.env.USPTO_API_KEY;
  if (!apiKey) { return { ok: false, reason: 'uspto-api-key-missing', auditMetadata: { queries: parsed.data.queries, result_count: 0 } }; }
  try {
    const res = await runUsptoSearch({
      apiKey,
      queries: parsed.data.queries,
      maxResultsPerQuery: parsed.data.maxResults,
    });
    const auditMetadata = buildSearchAuditMetadata(parsed.data.queries, res.results);
    const failure = detectAllQueriesFailed(res.envelopes, 'uspto-search');
    if (failure) { return { ok: false, reason: failure, envelopes: res.envelopes, auditMetadata }; }
    return { ok: true, envelopes: res.envelopes, results: res.results, auditMetadata };
  } catch (err) {
    return { ok: false, reason: `uspto-failed: ${(err as Error).message}`, auditMetadata: { queries: parsed.data.queries, result_count: 0 } };
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
    const auditMetadata = buildSearchAuditMetadata(parsed.data.queries, res.results);
    const failure = detectAllQueriesFailed(res.envelopes, 'hackernews-search');
    if (failure) { return { ok: false, reason: failure, envelopes: res.envelopes, auditMetadata }; }
    return { ok: true, envelopes: res.envelopes, results: res.results, auditMetadata };
  } catch (err) {
    return { ok: false, reason: `hackernews-failed: ${(err as Error).message}`, auditMetadata: { queries: parsed.data.queries, result_count: 0 } };
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

// Cert-run-2 bug D fix (Task #56) — schema now accepts BOTH the
// canonical grouped shape (`ProviderResult[][]`, one inner array per
// provider) AND the agent's intuitive flat shape (`ProviderResult[]`).
// Cert run #2 chain showed the agent attempting flat-input dedupe-and-
// rank TWICE in a row (events 10+11) before figuring out grouped on
// attempt 3 — burning Zod-error feedback to converge. Lenient schema
// removes the trial-and-error: either shape works, handler normalizes
// internally before calling the pure dedupeAndRank function.
const DedupeAndRankInput = z.object({
  results: z.union([
    z.array(z.array(ProviderResultSchema)),  // canonical: grouped by provider
    z.array(ProviderResultSchema),            // lenient: flat list across providers
  ]),
  topN: z.number().int().positive().optional(),
});

interface SourceRegistryInfo {
  path: string;
  sha256: string;
  rowCount: number;
}

function sourceRegistryPath(ctx: SessionContext): string {
  return path.posix.join('okrs', ctx.okrId, 'audit', 'sources', `${ctx.runId}.source-registry.json`);
}

function sourceRegistryEntry(source: RankedSource): Record<string, unknown> {
  return {
    source_id: source.id,
    provider: source.provider,
    queries: source.queries ?? [],
    title: source.title,
    url: source.url,
    canonical_url: source.url,
    retrieved_at: source.retrieved_at,
    salience_score: source.salience_score,
    excerpt: source.excerpt,
    ...(source.published_at ? { published_at: source.published_at } : {}),
    ...(source.authors && source.authors.length > 0 ? { authors: source.authors } : {}),
  };
}

function renderSourcePremisesMarkdown(sources: RankedSource[]): string {
  return sources
    .map(s => `- **${s.id}**: [${s.title}](${s.url}) establishes: ${s.excerpt || 'source returned without excerpt'}`)
    .join('\n');
}

function renderReferencesMarkdown(sources: RankedSource[]): string {
  return sources
    .map(s => `- ${s.id}: ${s.title} — ${s.url} — retrieved ${s.retrieved_at}`)
    .join('\n');
}

function writeSourceRegistry(ctx: SessionContext, sources: RankedSource[]): SourceRegistryInfo {
  const relPath = sourceRegistryPath(ctx);
  const absPath = path.join(meshPath(), relPath);
  const body = {
    schema_version: 'source-registry.v1',
    okr_id: ctx.okrId,
    run_id: ctx.runId,
    phase: ctx.phase,
    source_count: sources.length,
    sources: sources.map(sourceRegistryEntry),
  };
  const json = `${JSON.stringify(body, null, 2)}\n`;
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, json, 'utf8');
  return {
    path: relPath,
    sha256: createHash('sha256').update(json).digest('hex'),
    rowCount: sources.length,
  };
}

const handleDedupeAndRank: SkillHandler = async (input) => {
  const parsed = DedupeAndRankInput.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  // Discriminate via first element: if it's an array → grouped (flatten);
  // else flat → use directly. Empty array → treat as empty flat (no-op).
  const r = parsed.data.results as unknown[];
  const grouped = r.length > 0 && Array.isArray(r[0]);
  const flat: ProviderResult[] = grouped
    ? (parsed.data.results as ProviderResult[][]).flat()
    : (parsed.data.results as ProviderResult[]);
  const ranked = dedupeAndRank({ results: flat, topN: parsed.data.topN ?? 50 });
  const providerCounts: Record<string, number> = {};
  for (const result of ranked) {
    providerCounts[result.provider] = (providerCounts[result.provider] ?? 0) + 1;
  }
  const ctx = readSessionContext();
  let sourceRegistry: SourceRegistryInfo | null = null;
  if (ctx) {
    try {
      sourceRegistry = writeSourceRegistry(ctx, ranked);
    } catch (err) {
      return { ok: false, reason: `source-registry-write-failed: ${(err as Error).message}` };
    }
  }
  const auditMetadata = sourceRegistry
    ? {
        source_registry_path: sourceRegistry.path,
        source_registry_sha256: sourceRegistry.sha256,
        source_registry_count: sourceRegistry.rowCount,
      }
    : undefined;
  return {
    ok: true,
    rankedSources: ranked,
    providerCounts,
    sourcePremisesMarkdown: renderSourcePremisesMarkdown(ranked),
    referencesMarkdown: renderReferencesMarkdown(ranked),
    ...(sourceRegistry ? { sourceRegistry } : {}),
    ...(auditMetadata ? { auditMetadata } : {}),
  };
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
  queries: z.array(z.string()).optional(),
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
  // Bug Y (Codex round-9) — CLI-callable kinds. Runtime-only kinds
  // (`skill_call`, `llm_call`) are NOT in this enum: only runSkill()'s
  // module-private auto-emit path can produce them. Agent-callable
  // kinds (the agent's CLI invocation): `self_review`,
  // `self_review_exhausted`, `gap_loop`, `review_received`,
  // `review_emitted`. Workflow-callable kinds (the
  // CI YAML's CLI invocation): `artifact_written`, `state_transition`,
  // `human_gate`. The runner sets `payload.emitted_by` from the
  // kind→origin map below (NOT from user input — round-9 closed the
  // hole where an agent set `payload.emitted_by:workflow` to fake
  // workflow attribution).
  eventKind: z.enum([
    // Agent-emitted (signed under per-epoch private key):
    'self_review', 'self_review_exhausted', 'gap_loop',
    'review_received', 'review_emitted',
    // Tier 2.5a — Red Queen enforcement-chain digest (agent-signed; see
    // EVENT_KIND_ORIGIN + handleAuditSignRedqueenDecisions).
    'redqueen_decisions',
    // Workflow-emitted (unsigned, re-derivable from canonical sources):
    'artifact_written', 'state_transition', 'human_gate',
    // Oracle & Privacy Rails (Phase 2) — audit-time rail verdict. REPLAYED,
    // not signed: re-derivable by re-running the pinned rail over the committed
    // artifact + source registry. Workflow-origin, unsigned.
    'rail_decision',
  ]),
  payload: z.record(z.string(), z.unknown()),
  // Codex-r3 Bug 1 — `'implementation'` is the Tier 2 hand-off phase. Run
  // IDs of shape `IMPL-*` route the writers to the TARGET repo's
  // `.maintainability/audit/...` instead of the mesh's `okrs/<id>/audit/...`
  // (see auditBaseDir). The other three phases remain mesh-scoped.
  phase: z.enum(['why', 'how', 'what', 'implementation']),
  intentThreadUuid: z.string().min(1),
});

/**
 * Internal-path schema — superset of AuditEmitInput that ALSO accepts
 * runtime-only kinds (`skill_call`, `llm_call`). Used by `runSkill()`'s
 * module-private auto-emit path. The CLI dispatcher still hits the
 * narrower AuditEmitInput schema and runtime kinds remain unreachable
 * from outside the runner.
 */
const InternalAuditEmitInput = z.object({
  okrId: z.string().min(1),
  runId: z.string().min(1),
  eventKind: z.enum([
    // Runtime-only (only the internal auto-emit path):
    'skill_call', 'llm_call',
    // Agent (signed):
    'self_review', 'self_review_exhausted', 'gap_loop',
    'review_received', 'review_emitted',
    // Tier 2.5a — Red Queen enforcement-chain digest (agent-signed; emitted
    // via the internal path by handleAuditSignRedqueenDecisions).
    'redqueen_decisions',
    // Workflow (unsigned, allowlisted):
    'artifact_written', 'state_transition', 'human_gate',
    // Oracle & Privacy Rails (Phase 2) — audit-time rail verdict, replayed.
    'rail_decision',
  ]),
  payload: z.record(z.string(), z.unknown()),
  // Codex-r3 Bug 1 — match AuditEmitInput. Runtime auto-emission for
  // implementation-agent skill_calls flows through this schema.
  phase: z.enum(['why', 'how', 'what', 'implementation']),
  intentThreadUuid: z.string().min(1),
});

/**
 * Bug Y (Codex round-9) — event_kind → origin map. Single source of
 * truth for who can emit which kind + what `payload.emitted_by` value
 * the runner stamps onto the event.
 *
 * `runtime` → only the internal `runSkill()` auto-emit path. The runner
 *   observes the actual handler invocation; agents + workflows cannot
 *   fake this from outside the runner process.
 * `agent`   → CLI invocation of `skill-audit-emit-event` from inside
 *   the agent's session. Signed under the active per-epoch private
 *   key. Persona-critique judgment lives here (`self_review`).
 * `workflow`→ CLI invocation from inside a GitHub Actions step.
 *   Unsigned (no signing key in CI). Allowed only for kinds that are
 *   re-derivable from canonical sources (git diff, PR labels, PR
 *   reviewer state) so the workflow itself can fail-loud on payload
 *   mismatch — the agent CAN call this path from its `execute` tool,
 *   but a forged payload won't match what the workflow's verdict step
 *   re-derives, producing a degraded verdict.
 *
 * The verifier (handleAuditVerifyChain) cross-checks every chain
 * event's `payload.emitted_by` against this map. A hand-written
 * line whose `event_kind` and `emitted_by` don't match the map is
 * forgery and gets rejected with `origin-kind-mismatch`.
 */
const EVENT_KIND_ORIGIN: Record<string, 'runtime' | 'agent' | 'workflow'> = {
  // Runtime — only the internal runSkill() auto-emit path can produce these.
  skill_call: 'runtime',
  llm_call: 'runtime',
  // Agent — emitted via CLI from inside the agent's persona-prompt section,
  // signed under the active per-epoch private key.
  self_review: 'agent',
  self_review_exhausted: 'agent',
  gap_loop: 'agent',
  review_received: 'agent',
  review_emitted: 'agent',
  // Tier 2.5a — Red Queen enforcement-chain digest. Emitted via CLI by the
  // implementation agent's FINAL governed action (audit-sign-redqueen-
  // decisions) while the runner still holds the live per-epoch private key.
  // The PreToolUse hook that writes .redqueen/audit-log.jsonl runs in a
  // separate process with no session key, so it CANNOT sign; this rolled-up
  // digest event signs the log's sha256 into the same IMPL hash-chain. The
  // verifier is data-driven off this map — an agent-origin kind with a valid
  // signature + signer_epoch passes the existing loops with no verifier change.
  redqueen_decisions: 'agent',
  // Workflow — emitted via CLI from inside a GitHub Actions step,
  // unsigned, re-derivable from canonical sources.
  artifact_written: 'workflow',
  state_transition: 'workflow',
  human_gate: 'workflow',
  // Oracle & Privacy Rails (Phase 2) — audit-time rail verdict. Unsigned and
  // re-derivable: the verifier RE-RUNS the pinned rail over the committed
  // artifact + source registry and compares (replay, not signature).
  rail_decision: 'workflow',
};

/**
 * Bug U (Codex round-5) + Bug V (Codex round-6) — workflow-emittable
 * event_kind allowlist.
 *
 * `payload.emitted_by === 'workflow'` may be unsigned (post-agent
 * context has no key), BUT only for event_kinds the workflow
 * legitimately produces. Workflow attribution on an agent-owned kind
 * is forgery — an attacker hand-writing the JSONL could otherwise
 * mark a fake `skill_call` or `self_review` as workflow-emitted to
 * skip the signing requirement.
 *
 * Bug V removed `self_review` and `review_received` from this set:
 *   - `self_review` is the persona-prompt's voice (Architect /
 *     Security inside the prd-agent + code-design-agent runs). It
 *     belongs to the agent, not the workflow. Agents now call
 *     `audit-emit-event` from inside their persona-prompt section
 *     while the per-epoch private key is still available, producing
 *     signed events. Codex round-6 manual repro showed unsigned
 *     `self_review` with `emitted_by:workflow` returning
 *     `ok:true, sealed:true` — that path is now closed.
 *   - `review_received` is reviewer-persona output. The separate
 *     reviewer-agent dispatch was removed in the B24 pivot
 *     (persona-switch self-critique inside the author agent), so
 *     no workflow legitimately emits `review_received` today. If
 *     reviewer-bus is ever revived, it'll be agent-signed too.
 *
 * The remaining three kinds are workflow-infrastructure events
 * re-derivable from canonical sources (git diff, PR labels, PR
 * reviewer state).
 */
const WORKFLOW_EMITTABLE_KINDS = new Set<string>([
  'artifact_written',  // workflow re-derives from `git diff`
  'state_transition',  // workflow infrastructure events (label flips)
  'human_gate',        // workflow gate events (PR reviewer state)
  'rail_decision',     // Oracle rail verdict — re-derived by re-running the pinned rail (replay)
]);

/**
 * Audit-JSONL file-lock retry budget. Sized for parallel auto-emission:
 * the agent often fires 4 search skills concurrently, each completing in
 * ~500ms–3s. When their handlers return at similar times, all 4 try to
 * grab the JSONL lock simultaneously. Pre-B28a.v1.1 the budget was
 * `3 × 50ms linear = 300ms max` which silently dropped 3 of 4 events on
 * PR #108. New budget: 20 retries with exponential 2^n backoff capped at
 * 500ms each (sequence: 100, 200, 400, 500, 500, 500, …) ≈ 9.6s total
 * wait — comfortably tolerates 4–8 parallel skill invocations while
 * staying well under the runner's overall step timeout. Total emission
 * latency stays unchanged in the happy-path single-writer case.
 */
const LOCK_RETRY_LIMIT = 20;
const LOCK_RETRY_BASE_MS = 100;
const LOCK_RETRY_MAX_MS = 500;

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
// Knight's Seal — per-event, per-epoch Ed25519 signing (B27 + Bug O).
//
// Each agent session is one "signer epoch" with its own ephemeral
// Ed25519 keypair:
//   - Original agent invocation → epoch 1
//   - First revise-agent (different runner machine) → epoch 2
//   - Second revise → epoch 3
//   - ... etc
//
// Each epoch persists:
//   <runId>.epoch-N.pub.pem            (mesh, committed)
//   <okrId>--<runId>.epoch-N.priv.pem  (tmpdir, ephemeral)
//
// Per-event flow:
//   1. Build event with event_hash='' and signature=''
//   2. event_hash = sha256(canonical(event))     ← chain integrity
//   3. signature  = Ed25519(privKey, event_hash) ← nonrepudiation
//   4. Persist {...event, event_hash, signature, signer_epoch}
//
// Verify flow (in audit-verify-chain):
//   1. Recompute event_hash (set signature='' AND event_hash='')
//   2. Match recorded event_hash (chain integrity)
//   3. For every agent-emitted event (emitted_by !== 'workflow'),
//      verify Ed25519(pubKey[signer_epoch], event_hash, signature)
//
// Contract (Bug T — pre-release simplification, drops Bug O's legacy
// back-compat tail):
//   - Every agent-emitted event MUST be signed AND carry `signer_epoch`.
//   - `payload.emitted_by === 'workflow'` is the ONLY legitimate
//     unsigned attribution — post-agent context, no private key.
//   - revise-agent events MUST sign with their own epoch key.
//   - Legacy `<runId>.pub.pem` (no epoch suffix) is no longer accepted.
//   - Events without `signer_epoch` are no longer accepted.
// ─────────────────────────────────────────────────────────────────────

function knightSealEpochPubKeyPath(okrId: string, runId: string, epoch: number): string {
  // Codex-r3 Bug 1 — auditKeysDir routes IMPL-* runs to the target repo's
  // .maintainability/audit/keys/ and everything else to the mesh's
  // okrs/<id>/audit/keys/. The pub key lives next to the JSONL so a single
  // chain bundle (events + per-epoch pub keys) is self-contained.
  return path.join(auditKeysDir(okrId, runId), `${runId}.epoch-${epoch}.pub.pem`);
}

function knightSealEpochPrivKeyPath(okrId: string, runId: string, epoch: number): string {
  // Tmpdir-scoped to avoid any chance of `git add`-ing a private key.
  // The priv key stays in tmpdir regardless of phase — never the mesh,
  // never the target repo. Only the pub key crosses the on-disk boundary.
  return path.join(
    os.tmpdir(),
    '.research-runner-keys',
    `${okrId.replace(/[^A-Za-z0-9_-]/g, '_')}--${runId.replace(/[^A-Za-z0-9_-]/g, '_')}.epoch-${epoch}.priv.pem`,
  );
}

/**
 * Find the active signer epoch for this run.
 *
 * Returns the epoch number AND whether the caller should generate a
 * fresh keypair (isNewSession=true) or load the existing one (false).
 *
 * Logic (Bug T — legacy paths removed):
 *   1. Scan `audit/keys/<runId>.epoch-N.pub.pem` files → find max N.
 *   2. max=0 → genesis, return { epoch: 1, isNew: true }.
 *   3. max>0 and `<okrId>--<runId>.epoch-N.priv.pem` exists in tmp →
 *      same session, return { epoch: max, isNew: false }.
 *   4. max>0 and priv missing → new session (revise pass / different
 *      runner machine), return { epoch: max+1, isNew: true }.
 */
function findActiveEpoch(okrId: string, runId: string): { epoch: number; isNewSession: boolean } {
  // Codex-r3 Bug 1 — auditKeysDir picks the right base (mesh vs target
  // repo) per run-id prefix; rest of the scan logic is unchanged.
  const keysDir = auditKeysDir(okrId, runId);
  let maxEpoch = 0;
  if (fs.existsSync(keysDir)) {
    const escaped = runId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const epochRe = new RegExp(`^${escaped}\\.epoch-(\\d+)\\.pub\\.pem$`);
    for (const f of fs.readdirSync(keysDir)) {
      const m = f.match(epochRe);
      if (m) { maxEpoch = Math.max(maxEpoch, parseInt(m[1], 10)); }
    }
  }
  if (maxEpoch === 0) {
    return { epoch: 1, isNewSession: true };
  }
  // Check if the max-epoch's private key still exists in tmp.
  const privPath = knightSealEpochPrivKeyPath(okrId, runId, maxEpoch);
  if (fs.existsSync(privPath)) {
    return { epoch: maxEpoch, isNewSession: false };
  }
  // Priv gone → new session, advance to the next epoch.
  return { epoch: maxEpoch + 1, isNewSession: true };
}

/**
 * Load OR create the keypair for a specific (run, epoch). When
 * isNewSession is true, generates a fresh Ed25519 keypair and persists
 * BOTH the pub key (mesh) and priv key (tmpdir, mode 0600). When
 * isNewSession is false, loads the existing pair from disk.
 *
 * Bug T — legacy paths (`<runId>.pub.pem` without epoch suffix) are no
 * longer accepted. Pre-release simplification: every key file uses the
 * epoch-suffixed shape, no compat fallback.
 */
function loadOrCreateEpochKeypair(
  okrId: string,
  runId: string,
  epoch: number,
  isNewSession: boolean,
): { privKey: KeyObject; pubKey: KeyObject } {
  const privPath = knightSealEpochPrivKeyPath(okrId, runId, epoch);
  const pubPath = knightSealEpochPubKeyPath(okrId, runId, epoch);

  if (!isNewSession) {
    if (!fs.existsSync(privPath) || !fs.existsSync(pubPath)) {
      throw new Error(`epoch-keypair-load-failed: epoch=${epoch} privPath=${privPath} pubPath=${pubPath}`);
    }
    return {
      privKey: createPrivateKey({ key: fs.readFileSync(privPath, 'utf8'), format: 'pem' }),
      pubKey: createPublicKey({ key: fs.readFileSync(pubPath, 'utf8'), format: 'pem' }),
    };
  }

  // Generate + persist fresh keypair for this epoch.
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  fs.mkdirSync(path.dirname(privPath), { recursive: true });
  fs.writeFileSync(privPath, privPem, { encoding: 'utf8', mode: 0o600 });

  fs.mkdirSync(path.dirname(pubPath), { recursive: true });
  fs.writeFileSync(pubPath, pubPem, 'utf8');

  return { privKey: privateKey, pubKey: publicKey };
}

/**
 * Load every epoch's public key for this run into a Map<epoch, KeyObject>.
 * Used by audit-verify-chain.
 *
 * Bug T — legacy `<runId>.pub.pem` (no epoch suffix) is no longer
 * accepted. Pre-release simplification: a chain that pre-dates the
 * epoch-suffixed layout cannot be verified by this runner.
 */
function loadAllEpochPubKeys(okrId: string, runId: string): Map<number, KeyObject> {
  // Codex-r3 Bug 1 — same auditKeysDir routing; verifier and emitter MUST
  // resolve to the same directory or chains written to the target repo
  // would silently fail to verify against a mesh-side key lookup.
  const keysDir = auditKeysDir(okrId, runId);
  const result = new Map<number, KeyObject>();
  if (!fs.existsSync(keysDir)) { return result; }
  const escaped = runId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const epochRe = new RegExp(`^${escaped}\\.epoch-(\\d+)\\.pub\\.pem$`);
  for (const f of fs.readdirSync(keysDir)) {
    const m = f.match(epochRe);
    if (!m) { continue; }
    const epoch = parseInt(m[1], 10);
    try {
      const pem = fs.readFileSync(path.join(keysDir, f), 'utf8');
      result.set(epoch, createPublicKey({ key: pem, format: 'pem' }));
    } catch { /* skip unreadable */ }
  }
  return result;
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
 * `audit-emit-event` — append one hash-chained event to the run's JSONL.
 *
 * Path is resolved by `auditEventsFile(okrId, runId)`:
 *   - `runId` starts with `IMPL-` (implementation phase) →
 *     `<repo>/.maintainability/audit/events/<runId>.jsonl` (target repo)
 *   - any other prefix (RES-*, PRD-*, WHAT-*) →
 *     `<mesh>/okrs/<id>/audit/events/<runId>.jsonl` (governance mesh)
 *
 * Codex-r3 Bug 1 — the IMPL routing is what makes the implementation-agent's
 * cross-repo audit chain real. Pre-fix the agent's prompt promised
 * .maintainability/audit/events/IMPL-*.jsonl in the target repo but the
 * skill wrote everything to the mesh, so the impl PR's chain_root_hash
 * was a prompt-side fiction with no runtime evidence behind it.
 *
 * Cross-process serialization: we use an exclusive-create lock file
 * (`<jsonl>.lock`) with bounded retries. Each call reads the existing
 * tail, computes prev_event_hash + event_id, writes the new line, then
 * releases the lock. On terminal contention returns `{ok: false,
 * reason: 'audit-write-failed-after-retries'}` per the SKILL.md
 * contract — agents treat this as non-blocking.
 */
/**
 * Bug Y (Codex round-9) — single audit-emit code path with an
 * internal-only flag. `internal: true` accepts runtime-only kinds
 * (`skill_call`, `llm_call`) AND keeps the broader runtime input
 * schema; `internal: false` is the public/CLI surface and rejects
 * runtime kinds.
 *
 * Either way the runner DERIVES `payload.emitted_by` from the
 * kind→origin map (`EVENT_KIND_ORIGIN`) — it does NOT trust a
 * user-supplied `emitted_by`. That closes round-9 BLOCKING-1
 * (agent could fake `skill_call` evidence) + BLOCKING-2 (agent
 * could set `payload.emitted_by:workflow` on `artifact_written`
 * to land an unsigned event that the verifier accepted).
 */
async function emitAuditEvent(input: unknown, opts: { internal: boolean } = { internal: false }): Promise<SkillResult> {
  const schema = opts.internal ? InternalAuditEmitInput : AuditEmitInput;
  const parsed = schema.safeParse(input);
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }
  const { okrId, runId, eventKind, payload, phase, intentThreadUuid } = parsed.data;
  // Codex-r4 Bug 3 — phase ↔ runId-prefix consistency guard.
  //
  // auditBaseDir routes purely by runId.startsWith('IMPL-'); the
  // schemas accept `phase` independently. Pre-fix a bad env pair
  // (PHASE=implementation + RUN_ID=WHAT-…) would write
  // implementation-labeled events into the mesh's WHAT directory;
  // the inverse (PHASE=what + RUN_ID=IMPL-…) would write WHAT-
  // labeled events into the target repo's .maintainability/audit/
  // directory. Either is silent corruption of the chain provenance.
  //
  // Enforce the invariant: the two MUST agree. Fail-loud on
  // mismatch with a self-explanatory reason so the workflow logs
  // make the misconfiguration obvious.
  const runIdIsImpl = runId.startsWith('IMPL-');
  const phaseIsImpl = phase === 'implementation';
  if (runIdIsImpl !== phaseIsImpl) {
    return {
      ok: false,
      reason: `phase-runid-mismatch: phase=${phase} runId=${runId} — IMPL-* run ids MUST be paired with phase='implementation' and vice versa (implementation-phase audit chains live in the target repo, all other phases live in the mesh; routing is driven by runId prefix). Fix the agent's session-context env vars OR the audit-emit-event CLI input.`,
    };
  }
  // Defense in depth: even when internal:true, only the runtime
  // path should produce runtime kinds. (`internal:true` from CLI is
  // unreachable today — readStdin → runSkill → handler with
  // internal:false — but the check costs nothing.)
  const expectedOrigin = EVENT_KIND_ORIGIN[eventKind];
  if (expectedOrigin === 'runtime' && !opts.internal) {
    return { ok: false, reason: `runtime-only-kind: '${eventKind}' may only be emitted by the runtime auto-emit path (runSkill); agent + workflow callers must invoke their respective kinds (self_review / artifact_written / etc).` };
  }
  // Strip user-supplied `payload.emitted_by` (NEVER trusted) and set
  // it ourselves from the kind→origin map. This is the round-9 fix:
  // pre-Y an agent could pass `payload.emitted_by:workflow` to skip
  // the signing requirement on an `artifact_written` event; post-Y
  // the runner overwrites that value, so the agent's only way to
  // forge artifact_written is to live with workflow attribution +
  // unsigned, which the workflow's own reproducibility check (compare
  // payload sha to git diff) catches at verdict time.
  const cleanPayload: Record<string, unknown> = { ...payload };
  cleanPayload.emitted_by = expectedOrigin;
  // Codex-r3 Bug 1 — auditEventsFile resolves IMPL-* run ids to the
  // target repo's .maintainability/audit/events/<runId>.jsonl and
  // everything else to the mesh's okrs/<id>/audit/events/<runId>.jsonl.
  // mkdirSync covers both phases (the target repo may not have
  // .maintainability/ yet on the first IMPL run; the agent commits it
  // in the same PR as the impl code change).
  const filePath = auditEventsFile(okrId, runId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lockPath = `${filePath}.lock`;

  for (let attempt = 0; attempt < LOCK_RETRY_LIMIT; attempt++) {
    let lockFd: number | null = null;
    try {
      lockFd = fs.openSync(lockPath, 'wx');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        // Exponential backoff capped at LOCK_RETRY_MAX_MS. With 20
        // attempts the wait sequence is 100, 200, 400, 500, 500, … ≈
        // 9.6s total — enough headroom for 4–8 parallel auto-emissions
        // from skills firing concurrently (B28a.v1.1).
        const wait = Math.min(LOCK_RETRY_BASE_MS * (2 ** attempt), LOCK_RETRY_MAX_MS);
        await sleep(wait);
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
      // Bug Y (round-9) — `isWorkflowEmit` derived from the runner-set
      // origin, NOT from user-supplied `payload.emitted_by`. Pre-Y the
      // agent could set `payload.emitted_by:workflow` in its CLI input
      // to skip the signing requirement; post-Y the runner overrode
      // emitted_by from the kind→origin map above, so this branch is
      // driven entirely by `expectedOrigin`.
      const isWorkflowEmit = expectedOrigin === 'workflow';

      let privKey: KeyObject | null = null;
      let publicKeyPem: string | null = null;
      let signerEpoch: number | null = null;
      let isFirstEventOfEpoch = false;

      if (!isWorkflowEmit) {
        // Agent context (original OR revise). Determine the current
        // epoch + load-or-generate its keypair.
        const { epoch, isNewSession } = findActiveEpoch(okrId, runId);
        signerEpoch = epoch;
        const keypair = loadOrCreateEpochKeypair(okrId, runId, epoch, isNewSession);
        privKey = keypair.privKey;
        publicKeyPem = keypair.pubKey.export({ type: 'spki', format: 'pem' }) as string;
        // First event of each epoch embeds the pub key inline so a
        // single-line audit excerpt names its signer.
        if (fs.existsSync(filePath)) {
          const existing = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim().length > 0);
          isFirstEventOfEpoch = !existing.some(line => {
            try {
              const e = JSON.parse(line) as { signer_epoch?: number };
              const eEpoch = typeof e.signer_epoch === 'number' ? e.signer_epoch : 1;
              return eEpoch === epoch;
            } catch { return false; }
          });
        } else {
          isFirstEventOfEpoch = true;
        }
      }

      const draft: Record<string, unknown> = {
        event_id: nextEventId,
        ts: new Date().toISOString(),
        okr_id: okrId,
        run_id: runId,
        intent_thread_uuid: intentThreadUuid,
        phase,
        event_kind: eventKind,
        payload: cleanPayload,  // Bug Y — runner-controlled emitted_by; user input stripped
        prev_event_hash: prevHash,
        // Embed pub key on first event of each epoch (agent only).
        // Workflow events carry no public_key — they're system-trusted.
        public_key: isFirstEventOfEpoch ? publicKeyPem : null,
        event_hash: '',
        signature: '',
      };
      // signer_epoch present on all agent-signed events; absent on
      // workflow events. Older chains without this field default to
      // epoch 1 in chain-verify (backward compat).
      if (signerEpoch !== null) {
        draft.signer_epoch = signerEpoch;
      }
      const hash = sha256(canonicalStringify(draft));
      const signature = privKey ? signEventHash(privKey, hash) : '';
      const finalEvent = { ...draft, event_hash: hash, signature };
      fs.appendFileSync(filePath, JSON.stringify(finalEvent) + '\n', 'utf8');
      return { ok: true, chainHead: hash, eventId: nextEventId, sealed: signature !== '' };
    } finally {
      if (lockFd !== null) { fs.closeSync(lockFd); }
      try { fs.unlinkSync(lockPath); } catch { /* lock already gone */ }
    }
  }
  return { ok: false, reason: 'audit-write-failed-after-retries' };
}

/**
 * Public CLI surface for `audit-emit-event`. Always calls emitAuditEvent
 * with `internal:false`, so the narrower AuditEmitInput schema applies
 * (no `skill_call` / `llm_call`). Wrapped this way so the SkillHandler
 * type stays clean while runSkill can call the module-private emitter
 * for the runtime auto-emit path.
 */
const handleAuditEmitEvent: SkillHandler = async (input) => emitAuditEvent(input, { internal: false });

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
  // Codex-r3 Bug 1 — verifier resolves the same way as the emitter via
  // auditEventsFile. IMPL-* run ids read from the target repo's
  // .maintainability/audit/events/<runId>.jsonl; everything else from
  // the mesh's okrs/<id>/audit/events/<runId>.jsonl.
  const filePath = auditEventsFile(okrId, runId);
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: `audit-jsonl-missing: ${filePath}` };
  }
  let lines: string[];
  try {
    lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim().length > 0);
  } catch (err) {
    return { ok: false, reason: `read-failed: ${(err as Error).message}` };
  }
  // Bug O (Task #72) — load ALL epoch pub keys (epoch-1, epoch-2, ...).
  // Each agent session signs with its own epoch key. Includes legacy
  // <runId>.pub.pem as epoch-1 if no epoch-suffixed files exist.
  const epochPubKeys = loadAllEpochPubKeys(okrId, runId);
  // Track signature state across the whole chain. Bug T — pre-release
  // simplification: legacy compat removed. Only `payload.emitted_by ===
  // 'workflow'` is legitimate-unsigned (post-agent context, no key).
  // Every other event MUST be signed AND carry signer_epoch.
  let signedCount = 0;
  let workflowUnsignedCount = 0;
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
    // Bug T (pre-release simplification) + Bug U (Codex round-5) +
    // Bug V (Codex round-6): universal rule + narrow workflow-kind
    // allowlist. Only `payload.emitted_by === 'workflow'` may be
    // unsigned, AND only for event_kinds the workflow legitimately
    // produces from re-derivable canonical sources.
    //
    // Workflow-emittable kinds (post-Bug-V):
    //   - artifact_written  — re-derived from `git diff`
    //   - state_transition  — re-derived from PR labels
    //   - human_gate        — re-derived from PR reviewer state
    //
    // Removed in Bug V:
    //   - self_review       — persona-prompt's voice (Architect /
    //                         Security inside the agent run); MUST
    //                         be agent-signed via audit-emit-event
    //                         from inside the persona-prompt.
    //   - review_received   — the B24 pivot eliminated separate
    //                         reviewer agents; nothing emits this
    //                         today. Agent-signed if revived.
    //
    // All other kinds (skill_call, llm_call, self_review,
    // review_received, self_review_exhausted, review_emitted) MUST be
    // agent-emitted under a verified signature. Workflow attribution
    // on any of those kinds is forgery — an attacker hand-writing
    // JSONL could set emitted_by:'workflow' on a fake self_review to
    // skip signing (round-6 manual repro). The allowlist closes that.
    const eventPayload = (event as { payload?: { emitted_by?: string } }).payload;
    const emittedBy = eventPayload?.emitted_by;
    const eventKind = (event as { event_kind?: string }).event_kind;
    const hasSignature = recordedSignature !== null && recordedSignature !== '';
    const recordedEpoch = (event as { signer_epoch?: unknown }).signer_epoch;
    // Bug Y (round-9) — origin↔kind consistency check. The runner sets
    // `payload.emitted_by` from the kind→origin map (NEVER from user
    // input). A hand-written line whose `event_kind` and `emitted_by`
    // don't match the map is forgery — an attacker who can write to
    // the mesh repo can no longer fake a "workflow-attested skill_call"
    // or an "agent-attested artifact_written" because the verifier
    // checks the pair. Closes round-9 BLOCKING-1 (agent forging
    // skill_call) and BLOCKING-2 (agent forging workflow-attributed
    // artifact_written via emitted_by payload control).
    const expectedOriginFromKind = EVENT_KIND_ORIGIN[eventKind ?? ''];
    if (!expectedOriginFromKind) {
      return {
        ok: false,
        reason: `unknown-event-kind-line-${i + 1}: event_kind='${eventKind ?? '<missing>'}' is not in the runner's EVENT_KIND_ORIGIN map. Likely a hand-rolled JSONL line or a chain from a future runner version. Hand-rolling the JSONL is what B25 chain-forgery-detection is designed to catch.`,
      };
    }
    if (emittedBy !== expectedOriginFromKind) {
      return {
        ok: false,
        reason: `origin-kind-mismatch-line-${i + 1}: event_kind='${eventKind}' requires payload.emitted_by='${expectedOriginFromKind}' (Bug Y kind→origin map), got '${emittedBy ?? '<missing>'}'. The runner sets emitted_by from the kind; mismatch means the line was hand-written rather than emitted via runSkill / audit-emit-event.`,
      };
    }
    const claimsWorkflow = emittedBy === 'workflow';
    if (claimsWorkflow) {
      // Bug V allowlist — kind must be one the workflow legitimately produces.
      if (!WORKFLOW_EMITTABLE_KINDS.has(eventKind ?? '')) {
        return {
          ok: false,
          reason: `workflow-event-kind-not-allowed-line-${i + 1}: event_kind='${eventKind ?? 'unknown'}' is not in the workflow-emittable allowlist {${[...WORKFLOW_EMITTABLE_KINDS].join(',')}}. Workflow attribution on agent-owned event kinds is forgery.`,
        };
      }
      // Bug X (Codex round-8) — the second loop SKIPS signature
      // verification for workflow events (the workflow has no key).
      // Pre-X a hand-written workflow event with a fake signature +
      // fake signer_epoch passed the first loop, incremented
      // signedCount, and the second loop's `continue` skipped the
      // verify step → ok:true, sealed:true, sealVerified:true on a
      // fully forged workflow line. Fix: workflow events MUST be
      // empty-signature AND absent signer_epoch. Any signed workflow
      // event is forgery — the workflow has no per-epoch key to sign with.
      if (hasSignature) {
        return {
          ok: false,
          reason: `workflow-event-with-signature-line-${i + 1}: payload.emitted_by==='workflow' events must be unsigned (the workflow has no per-epoch private key). A non-empty signature on a workflow-attributed event is forgery — the second verification loop skips workflow events, so a fake signature would otherwise pass unverified.`,
        };
      }
      if (recordedEpoch !== undefined) {
        return {
          ok: false,
          reason: `workflow-event-with-signer-epoch-line-${i + 1}: payload.emitted_by==='workflow' events must not carry signer_epoch (epochs are an agent-session concept; workflow events have no session). Found signer_epoch=${JSON.stringify(recordedEpoch)}.`,
        };
      }
    }
    if (!claimsWorkflow && !hasSignature) {
      return {
        ok: false,
        reason: `unsigned-agent-event-line-${i + 1}: agent-emitted events MUST carry a non-empty signature (Knight's Seal per-event, per-epoch contract). Only payload.emitted_by==='workflow' events may be unsigned, and only for event_kinds in the workflow-emittable allowlist.`,
      };
    }
    if (hasSignature) {
      // Reached only when !claimsWorkflow (signed workflow events
      // rejected above). Every signed agent event MUST carry
      // signer_epoch — no legacy fallback.
      signedCount++;
      if (typeof recordedEpoch !== 'number') {
        return {
          ok: false,
          reason: `missing-signer-epoch-line-${i + 1}: signed agent events MUST carry signer_epoch (Bug O contract).`,
        };
      }
    } else if (claimsWorkflow) {
      workflowUnsignedCount++;
    }
    prev = recordedHash;
  }

  // Knight's Seal verification: every AGENT-emitted event must be signed
  // by its declared signer_epoch's pub key. The first loop above
  // already enforced "agent event MUST be signed" — we only reach here
  // with `signedCount === agentEventCount`. Workflow-unsigned events
  // are excluded from the denominator. Bug T — legacy paths removed.
  const sealed = signedCount > 0;
  const agentEventCount = lines.length - workflowUnsignedCount;
  let sealVerified = false;
  if (sealed) {
    if (signedCount !== agentEventCount) {
      return { ok: false, reason: `partial-signatures: ${signedCount}/${agentEventCount} agent-emitted events signed (chain tampered; ${workflowUnsignedCount} workflow-emitted unsigned by-design)` };
    }
    if (epochPubKeys.size === 0) {
      return { ok: false, reason: `public-key-missing: events are signed but no <runId>.epoch-*.pub.pem found in audit/keys/` };
    }
    for (let i = 0; i < lines.length; i++) {
      const event = JSON.parse(lines[i]) as { event_hash: string; signature: string; signer_epoch?: number; payload?: { emitted_by?: string } };
      const emittedBy = event.payload?.emitted_by;
      // Workflow events legitimately carry no signature + no signer_epoch.
      if (emittedBy === 'workflow') { continue; }
      // Every other event MUST verify. signer_epoch presence was
      // enforced in the first loop, so it's guaranteed here.
      const epoch = event.signer_epoch as number;
      const pubKey = epochPubKeys.get(epoch);
      if (!pubKey) {
        return { ok: false, reason: `pub-key-missing-for-epoch-${epoch}-line-${i + 1}: chain references epoch ${epoch} but no <runId>.epoch-${epoch}.pub.pem on disk` };
      }
      if (!verifyEventSignature(pubKey, event.event_hash, event.signature)) {
        return { ok: false, reason: `signature-mismatch-line-${i + 1}: Ed25519 verify failed against epoch-${epoch} pub key` };
      }
    }
    sealVerified = true;
  }
  return { ok: true, chainHead: prev, eventCount: lines.length, sealed, sealVerified };
};

// ─────────────────────────────────────────────────────────────────────
// audit-sign-redqueen-decisions — Tier 2.5a finalize-time chain signing
// ─────────────────────────────────────────────────────────────────────

const SignRedqueenInput = z.object({
  // Optional override; defaults to <REPO_PATH or cwd>/.redqueen/audit-log.jsonl.
  logPath: z.string().min(1).optional(),
}).passthrough();

/** Cap on the per-decision detail rows folded into the signed digest. */
const REDQUEEN_DENIALS_CAP = 50;

/**
 * `audit-sign-redqueen-decisions` (Tier 2.5a) — the implementation agent's
 * FINAL governed action. The Red Queen PreToolUse hook writes per-tool-call
 * allow/deny decisions to `<repo>/.redqueen/audit-log.jsonl` as UNSIGNED
 * plain JSON; a sandbox probe confirmed the hook (separate process, no
 * session key, no session env) cannot sign them. This skill, run while the
 * runner still holds the live per-epoch Ed25519 key, rolls the whole
 * decision log into ONE digest event and signs it onto the IMPL hash-chain.
 *
 * Why one rolled-up event (not per-decision): keeps the chain small and the
 * skill_call / self_review story readable. Verifiability is preserved by
 * signing the log's sha256 — anyone re-hashes the committed
 * `.redqueen/audit-log.jsonl` and compares it to `payload.log_sha256`.
 *
 * Back-compat / honest-zero: if the log is missing or empty (the hook may
 * never have fired) the skill STILL emits an honest-zero digest event
 * (`count:0`, `log_sha256:null`, `note:'no decision log present'`) rather
 * than crashing — the impl chain stays complete either way.
 */
const handleAuditSignRedqueenDecisions: SkillHandler = async (input) => {
  const parsed = SignRedqueenInput.safeParse(input ?? {});
  if (!parsed.success) { return { ok: false, reason: `bad-input: ${parsed.error.message}` }; }

  // Guard: this is a finalize-time IMPLEMENTATION-phase skill. Fail loud on
  // any other phase / run-id shape, mirroring the phase↔runId guard style in
  // emitAuditEvent (~2438). Without a live session context there is no epoch
  // key to sign under and no IMPL chain to append to.
  const ctx = readSessionContext();
  if (!ctx) {
    return {
      ok: false,
      reason: `no-session-context: audit-sign-redqueen-decisions requires OKR_ID/RUN_ID/INTENT_THREAD_UUID/PHASE in the environment (it must run as the agent's final governed action while the per-epoch signing key is live).`,
    };
  }
  if (ctx.phase !== 'implementation' || !ctx.runId.startsWith('IMPL-')) {
    return {
      ok: false,
      reason: `not-implementation-phase: audit-sign-redqueen-decisions only runs in the implementation phase (phase='implementation' + RUN_ID='IMPL-*'); got phase='${ctx.phase}' runId='${ctx.runId}'. The Red Queen decision log lives in the target repo's .redqueen/ and is signed onto the IMPL chain only.`,
    };
  }

  // Resolve the RQ log path the same way auditBaseDir resolves the impl
  // chain root: REPO_PATH env (falls back to cwd). Optional override wins.
  const logPath = parsed.data.logPath ?? path.join(repoPath(), '.redqueen', 'audit-log.jsonl');

  // Honest-zero: never crash when the hook hasn't fired (missing/empty log).
  // Read the EXACT bytes on disk (a Buffer, not a UTF-8 round-trip) so the
  // digest is over the file verbatim — a verifier re-hashes those same bytes.
  let rawBuf = Buffer.alloc(0);
  if (fs.existsSync(logPath)) {
    try {
      rawBuf = fs.readFileSync(logPath);
    } catch (err) {
      return { ok: false, reason: `redqueen-log-read-failed: ${(err as Error).message}` };
    }
  }
  const raw = rawBuf.toString('utf8');
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    const emit = await emitAuditEvent({
      okrId: ctx.okrId,
      runId: ctx.runId,
      eventKind: 'redqueen_decisions',
      payload: {
        // Signed-prefix seal contract (T2.5a). The Red Queen log is a live
        // append-only sidecar; the hook fires on the agent's own final git
        // add/commit, so a whole-file digest taken now can never match the
        // committed file. We seal the PREFIX we actually read and let the gate
        // verify exactly that many bytes, reporting anything after as an
        // uncovered tail. Honest-zero: nothing read.
        covered_bytes: 0,
        covered_sha256: null,
        covered_count: 0,
        allowed: 0,
        denied: 0,
        overrides: 0,
        covered_through_ts: null,
        first_ts: null,
        denials: [],
        note: 'no decision log present',
      },
      phase: ctx.phase,
      intentThreadUuid: ctx.intentThreadUuid,
    }, { internal: true });
    if (!emit.ok) { return emit; }
    return {
      ok: true,
      coveredBytes: 0,
      coveredCount: 0,
      allowed: 0,
      denied: 0,
      overrides: 0,
      coveredSha256: null,
      eventId: emit.eventId,
      sealed: true,
    };
  }

  // SEAL THE PREFIX WE READ. `covered_bytes` is the exact byte length read;
  // `covered_sha256` is the sha256 of those exact bytes. The gate re-hashes
  // the first `covered_bytes` bytes of the COMMITTED log and compares — so
  // both sides hash byte-identical content (no line-join / UTF-8 round-trip
  // ambiguity). Bytes after `covered_bytes` are the agent's post-seal
  // commit-time decisions; the gate reports them as an uncovered tail.
  const covered_bytes = rawBuf.length;
  const covered_sha256 = createHash('sha256').update(rawBuf).digest('hex');

  let count = 0;
  let allowed = 0;
  let denied = 0;
  let overrides = 0;
  let first_ts: string | null = null;
  let last_ts: string | null = null;
  const denials: Array<{ tool?: unknown; filePath?: unknown; ruleId?: unknown; reason?: unknown }> = [];

  for (const line of trimmed.split('\n')) {
    const t = line.trim();
    if (t.length === 0) { continue; }
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(t) as Record<string, unknown>;
    } catch {
      // Tolerate a malformed/partial line (e.g. a torn write) — count it but
      // skip classification. Never crash on the decision log.
      count++;
      continue;
    }
    count++;
    const payloadObj = (row.payload && typeof row.payload === 'object') ? row.payload as Record<string, unknown> : undefined;
    // The Red Queen hook nests its fields under `payload` (payload.verdict);
    // accept a top-level `verdict` too for forward-compat. Reading only the
    // top level left allowed/denied at 0 while count reflected every line
    // (observed on celeb-api PR #12: count=18, allowed=0, denied=0).
    const verdict = typeof row.verdict === 'string' ? row.verdict
      : (typeof payloadObj?.verdict === 'string' ? payloadObj.verdict as string : undefined);
    const ts = typeof row.ts === 'string' ? row.ts : (typeof row.timestamp === 'string' ? row.timestamp : undefined);
    if (ts) {
      if (first_ts === null) { first_ts = ts; }
      last_ts = ts;
    }
    if (verdict === 'allow') { allowed++; }
    if (verdict === 'deny') {
      denied++;
      if (denials.length < REDQUEEN_DENIALS_CAP) {
        denials.push({
          tool: row.tool ?? payloadObj?.tool,
          filePath: row.filePath ?? payloadObj?.filePath,
          ruleId: row.ruleId ?? payloadObj?.ruleId,
          reason: row.reason ?? payloadObj?.reason,
        });
      }
    }
    if (payloadObj?.override === true || row.override === true) { overrides++; }
  }

  const emit = await emitAuditEvent({
    okrId: ctx.okrId,
    runId: ctx.runId,
    eventKind: 'redqueen_decisions',
    payload: {
      // Signed-prefix seal: covered_bytes/covered_sha256 are what the gate
      // re-hashes (first covered_bytes of the committed log). covered_count is
      // the decision count within that sealed prefix.
      covered_bytes,
      covered_sha256,
      covered_count: count,
      allowed,
      denied,
      overrides,
      log_path: logPath,
      first_ts,
      covered_through_ts: last_ts,
      denials,
    },
    phase: ctx.phase,
    intentThreadUuid: ctx.intentThreadUuid,
  }, { internal: true });
  if (!emit.ok) { return emit; }

  return {
    ok: true,
    coveredBytes: covered_bytes,
    coveredCount: count,
    allowed,
    denied,
    overrides,
    coveredSha256: covered_sha256,
    eventId: emit.eventId,
    sealed: true,
  };
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
  // D-PR1.v1.1 — knowledge-prd handler (SKILL.md was deployed but no
  // runner backend existed, causing the code-design-agent to fall back
  // to direct file read with no chain evidence on PR #120).
  'knowledge-prd': handleKnowledgePrd,
  'context-architecture': handleContextArchitecture,
  'context-security': handleContextSecurity,
  'context-quality': handleContextQuality,
  'self-review-architect': handleSelfReviewArchitect,
  'self-review-security': handleSelfReviewSecurity,
  // D-PR1 — code-phase persona-switch packs. Same B29 pattern as the
  // PRD-phase pair above; reads .caterpillar/prompts/code-design/* packs.
  'self-review-code-architect': handleSelfReviewCodeArchitect,
  'self-review-code-security': handleSelfReviewCodeSecurity,
  // Codex-r4 Bug 2 — implementation-phase analogues. The WHAT skills
  // above read mesh state; these read .cheshire/prompts in the target
  // repo. See makeImplReviewHandler for the rationale.
  'self-review-impl-architect': handleSelfReviewImplArchitect,
  'self-review-impl-security': handleSelfReviewImplSecurity,
  // D-PR1 — knowledge-code (Phase D D6). 3-mode response per A12.v1.1
  // targetCodeRepoStatus: brownfield (clone + classify), greenfield
  // (scaffolding hints, no clone), refuse (not-connected / unreachable).
  'knowledge-code': handleKnowledgeCode,
  // Bug-Q phase 2 — knowledge-code-read returns bounded file CONTENT
  // from the brownfield clone retained by knowledge-code. Lets the
  // agent ground design decisions in real code excerpts (Codex audit
  // round 2 / B1: agent was hallucinating brownfield file paths
  // because the substrate was structural metadata only).
  'knowledge-code-read': handleKnowledgeCodeRead,
  // Oracle & Privacy Rails (Phase 1) — wrap the evidence-boundary skills
  // in the Layer-1 deterministic guardrail envelope. Verdicts fold into the
  // signed `skill_call.payload.guardrails` via runSkill's auditMetadata
  // merge (no new event kind). The authoritative injection/PII/groundedness
  // gate is the local Python CI replay step (Phases 2-4), not this layer.
  'tavily-search': withGuardrails('tavily-search', handleTavilySearch),
  'arxiv-search': withGuardrails('arxiv-search', handleArxivSearch),
  'uspto-search': withGuardrails('uspto-search', handleUsptoSearch),
  'hackernews-search': withGuardrails('hackernews-search', handleHackerNewsSearch),
  'dedupe-and-rank': withGuardrails('dedupe-and-rank', handleDedupeAndRank),
  'format-research-issue-update': handleFormatResearchIssueUpdate,
  'audit-emit-event': handleAuditEmitEvent,
  'audit-verify-chain': handleAuditVerifyChain,
  // Tier 2.5a — finalize-time Red Queen enforcement-chain signer.
  'audit-sign-redqueen-decisions': handleAuditSignRedqueenDecisions,
};

export function isSkillName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(SKILLS, name);
}

/**
 * Skills whose name STARTS with one of these prefixes never trigger
 * audit-event auto-emission — they're the audit-event surface itself
 * (writer + reader). Letting them auto-emit would create either infinite
 * recursion (audit-emit-event audit-emitting itself) or a meaningless
 * `skill_call` event for a read-only verify operation.
 */
const NO_AUTO_EMIT_SKILLS = new Set([
  'audit-emit-event',
  'audit-verify-chain',
  // Tier 2.5a — this skill IS an audit-surface writer (it emits its own
  // signed redqueen_decisions digest event via the internal path). Letting
  // runSkill auto-emit a skill_call for it would double-log + muddy the
  // final-action story, exactly like audit-emit-event above.
  'audit-sign-redqueen-decisions',
]);

export async function runSkill(name: string, input: unknown): Promise<SkillResult> {
  const handler = SKILLS[name];
  if (!handler) { return { ok: false, reason: `unknown-skill: ${name}` }; }

  const t0 = Date.now();
  const result = await handler(input);
  const duration_ms = Date.now() - t0;

  // B28 — Court Recorder Auto-Logging. When the workflow has set the
  // session-context env vars (OKR_ID / RUN_ID / INTENT_THREAD_UUID / PHASE),
  // the runner deterministically emits a `skill_call` event for every
  // handler invocation. The agent CANNOT skip this — there's nothing to
  // skip; the emission happens inside the runner before the result is
  // returned to the caller. Falls back to legacy mode (no auto-emit) when
  // context env vars are absent so pre-B28 chains keep working unchanged.
  if (!NO_AUTO_EMIT_SKILLS.has(name)) {
    const ctx = readSessionContext();
    if (ctx) {
      // Merge handler-declared auditMetadata first so canonical fields
      // (skill / ok / duration_ms / reason) always win on collision —
      // handlers can't accidentally lie about what they were called.
      const extras = (result as { auditMetadata?: Record<string, unknown> }).auditMetadata ?? {};
      const payload: Record<string, unknown> = { ...extras, skill: name, ok: result.ok, duration_ms };
      if (!result.ok) { payload.reason = result.reason; }
      // Bug O (Task #72) — per-epoch signing handles revise-agent
      // context natively. handleAuditEmitEvent's findActiveEpoch()
      // detects revise-context from filesystem state and advances to
      // a fresh epoch with its own keypair. Every agent-emitted event
      // gets a real signature attributable to a specific signer_epoch
      // (Bug T removed the legacy unsigned-revise-agent back-compat;
      // the chain-verify path rejects any agent event without a
      // signer_epoch + valid signature).
      // Best-effort: an audit-write failure must not shadow the real
      // skill result. But we MUST surface the failure to stderr — pre-
      // B28a.v1.1 these were silently swallowed and PR #108 dropped 3
      // of 4 parallel-search events with no warning. The chain-verify
      // CI gate still catches gaps post-hoc; this stderr line catches
      // them at write time.
      try {
        // Bug Y/Z — runtime auto-emit goes through this module-private
        // path, which accepts runtime-only kinds (`skill_call`,
        // `llm_call`). The CLI-facing handleAuditEmitEvent wrapper
        // rejects these kinds, so agents cannot fake `skill_call`
        // evidence via the CLI surface.
        const emit = await emitAuditEvent({
          okrId: ctx.okrId,
          runId: ctx.runId,
          phase: ctx.phase,
          intentThreadUuid: ctx.intentThreadUuid,
          eventKind: 'skill_call',
          payload,
        }, { internal: true });
        if (!emit.ok) {
          process.stderr.write(`::warning::audit auto-emit failed for skill ${name}: ${emit.reason}\n`);
        }
      } catch (err) {
        process.stderr.write(`::warning::audit auto-emit threw for skill ${name}: ${(err as Error).message}\n`);
      }
    }
  }

  return result;
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
