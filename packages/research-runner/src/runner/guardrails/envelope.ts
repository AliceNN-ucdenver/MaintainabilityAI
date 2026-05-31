/**
 * Oracle & Privacy Rails — Layer 1 deterministic guardrail envelope.
 *
 * This is the **Hatter-side evidence boundary** (see
 * `vscode-extension/design/next-acts-tier-2-and-3.md` § Oracle & Privacy
 * Rails). The pure Node runner does **deterministic checks only** — no ML,
 * no network, no filesystem. It wraps the oracle skills (`tavily-search`,
 * `arxiv-search`, `uspto-search`, `hackernews-search`, `dedupe-and-rank`)
 * and:
 *   - blocks clear input-budget / forbidden-path violations BEFORE the
 *     provider call,
 *   - quarantines (drops before synthesis + the source registry) a result
 *     whose URL is malformed / non-http(s) / points at a private / loopback
 *     / link-local / cloud-metadata host, whose provider is not allowlisted,
 *     or whose text carries a high-confidence prompt-control marker (e.g.
 *     "ignore previous instructions", model control tokens),
 *   - annotates (records, keeps) weak/coarse markers — these stay
 *     **non-authoritative**; the Python replay rail decides.
 *
 * The authoritative injection / PII / groundedness decision is the local
 * **Python CI audit step** (Llama Prompt Guard 2 / Presidio / groundedness),
 * which is REPLAYED, not signed — that lands in Phases 2-4 and is a hard PR
 * gate. Here the verdict folds into the already-signed
 * `skill_call.payload.guardrails` (no new event kind), because `runSkill`
 * merges a handler's `auditMetadata` into the canonical skill_call payload.
 *
 * Architectural line: *agent/runtime events are SIGNED; audit-time rail
 * verdicts are REPLAYED.* This envelope is the signed-side, deterministic
 * first cut; it must never claim to be the authoritative classifier.
 *
 * NOTE (Phase 1 scope): config defaults live in code below. Loading +
 * hash-pinning an override from `.caterpillar/guardrails/oracle/` is a
 * deliberate later step (it co-arrives with the Python replay gate so the
 * pinned config hash is meaningful end-to-end).
 */
import type { ProviderResult } from '../../search/provider-result';
import { buildSearchAuditMetadata } from '../../search/audit-preview';
import type { SkillHandler, SkillResult } from '../skills';

/** Pins the deterministic-checks revision so the audit (and a future replay
 * of the deterministic layer) can tell envelope versions apart. */
export const ORACLE_GUARDRAIL_ENVELOPE_VERSION = 'oracle-guardrails.det.v1';

/** Oracle skills whose input is `{queries}` and output carries `results`. */
export const ORACLE_SEARCH_SKILLS = [
  'tavily-search',
  'arxiv-search',
  'uspto-search',
  'hackernews-search',
] as const;

/** The skill that ranks provider results and writes the source registry. */
export const ORACLE_REGISTRY_SKILL = 'dedupe-and-rank';

export type GuardrailBoundary = 'input' | 'result';
export type GuardrailDisposition = 'block' | 'quarantine' | 'annotate';

export interface GuardrailFinding {
  /** Stable machine-readable rule id (e.g. `url-private-network`). */
  rule: string;
  boundary: GuardrailBoundary;
  disposition: GuardrailDisposition;
  /** Bounded, human-readable hint. MUST NOT contain a raw secret/PII value —
   * names the rule + a safe locator (host, query index) only. */
  detail: string;
  /** Safe locator for the offending item (e.g. `q#2`, `#5`). */
  ref?: string;
}

export interface GuardrailVerdict {
  envelope_version: string;
  /** `block` → handler not run / call refused; `quarantined` → some results
   * dropped before synthesis; `pass` → nothing actioned. */
  verdict: 'pass' | 'block' | 'quarantined';
  /** Which deterministic checks this envelope ran (provenance for replay). */
  checks: string[];
  findings: GuardrailFinding[];
  queries_checked: number;
  results_in: number;
  results_safe: number;
  results_quarantined: number;
}

interface LabeledPattern {
  label: string;
  re: RegExp;
}

/**
 * Prompt-control marker with a confidence tier. A `high`-confidence marker
 * in a provider RESULT quarantines it before synthesis (deterministic
 * tripwire); a `weak` marker only annotates (kept — the Python replay rail
 * is authoritative). Markers in an agent-authored QUERY always annotate
 * regardless of tier (the agent owns its own query text).
 */
export interface InjectionMarker {
  label: string;
  re: RegExp;
  confidence: 'high' | 'weak';
}

export interface OracleGuardrailConfig {
  /** Max queries per skill call (DoS / runaway-fan-out budget). */
  maxQueries: number;
  /** Max characters in a single query. */
  maxQueryLength: number;
  /** Soft cap on provider results we screen; over-cap is annotated, not cut. */
  maxResults: number;
  /** Allowed provider identifiers (the `SearchProvider` enum values). */
  providerAllowlist: readonly string[];
  /** Internal repo / secret path patterns — a hard block when seen in a
   * query (legit market-research queries never reference these). */
  forbiddenPathPatterns: readonly LabeledPattern[];
  /** Prompt-control markers. `high`-confidence quarantines a result; `weak`
   * annotates. All are NON-AUTHORITATIVE — the Python replay rail decides. */
  injectionMarkers: readonly InjectionMarker[];
}

const DEFAULT_FORBIDDEN_PATH_PATTERNS: readonly LabeledPattern[] = [
  { label: 'caterpillar', re: /\.caterpillar[/\\]/i },
  { label: 'cheshire', re: /\.cheshire[/\\]/i },
  { label: 'git-dir', re: /(^|[/\s])\.git[/\\]/i },
  { label: 'ssh-key', re: /\.ssh[/\\]|id_(ed25519|rsa|ecdsa)\b/i },
  { label: 'env-file', re: /(^|[/\s])\.env(\.|\b)/i },
  { label: 'audit-keys', re: /audit[/\\]keys/i },
  // Narrow to actual key material — `.ssh/`, `id_rsa`, `id_ed25519`,
  // `audit/keys` are covered by the patterns above, so a benign query like
  // "private key management" must not be blocked.
  { label: 'private-key-material', re: /BEGIN\s+[A-Z0-9 ]*PRIVATE\s+KEY/i },
];

// `high` = forms that essentially never appear in benign research prose, so
// quarantining a RESULT on them is safe. The rest are `weak`: this is a
// security-research tool, so legit sources routinely contain "system prompt",
// "exfiltrate", "act as admin", etc. — those annotate and let the authoritative
// Python rail (Prompt Guard 2) make the call.
const DEFAULT_INJECTION_MARKERS: readonly InjectionMarker[] = [
  { label: 'ignore-previous-instructions', confidence: 'high', re: /ignore\s+(all\s+)?(previous|prior|above|the\s+above)\s+(instructions|prompts|context)/i },
  { label: 'disregard-previous', confidence: 'high', re: /disregard\s+(all\s+)?(previous|prior|earlier|above)\s+(instructions|prompts|context|directions)/i },
  { label: 'control-token', confidence: 'high', re: /<\s*\|?\s*(system|im_start|im_end)\b/i },
  { label: 'system-prompt-reference', confidence: 'weak', re: /system\s*prompt/i },
  { label: 'new-instructions', confidence: 'weak', re: /new\s+instructions\s*:/i },
  { label: 'persona-override', confidence: 'weak', re: /you\s+are\s+now\s+(a|an|the)\b/i },
  { label: 'act-as-system', confidence: 'weak', re: /act\s+as\s+(a\s+|an\s+)?(system|developer|admin|root)/i },
  { label: 'exfiltrate', confidence: 'weak', re: /\bexfiltrat/i },
  { label: 'reveal-secrets', confidence: 'weak', re: /(reveal|print|output|dump)\s+(your\s+)?(system\s+prompt|secrets?|api[_\s-]?keys?|credentials?)/i },
];

export const DEFAULT_ORACLE_GUARDRAIL_CONFIG: OracleGuardrailConfig = {
  maxQueries: 32,
  maxQueryLength: 512,
  maxResults: 500,
  providerAllowlist: ['tavily', 'arxiv', 'uspto', 'hackernews'],
  forbiddenPathPatterns: DEFAULT_FORBIDDEN_PATH_PATTERNS,
  injectionMarkers: DEFAULT_INJECTION_MARKERS,
};

/** Static provenance of which checks the envelope runs, recorded in every
 * verdict so a reader (or replay) knows the deterministic surface. */
const CHECK_NAMES = [
  'query-budget',
  'forbidden-path',
  'coarse-injection-marker',
  'url-safety',
  'provider-allowlist',
  'result-count-cap',
];

/** Bound on findings persisted in the verdict (audit-JSONL size guard).
 * Includes the `findings-truncated` marker — the total never exceeds this. */
export const MAX_FINDINGS = 100;

// ─────────────────────────────────────────────────────────────────────
// Pure check primitives (unit-tested in isolation)
// ─────────────────────────────────────────────────────────────────────

/**
 * Bound + sanitize free-form external text before it lands in a finding
 * `detail` (which persists into signed audit metadata). Agent- and
 * provider-supplied strings must never be echoed raw — replace anything
 * outside a conservative safe set and truncate.
 */
function sanitizeForDetail(value: unknown, max = 32): string {
  const s = String(value).replace(/[^\w.:/-]/g, '·');
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * Parse + normalize a URL. Rejects anything that is not http(s) or that
 * fails to parse. Drops the fragment; lowercases the host. Returns the
 * lowercased host so the caller can classify it.
 */
export function normalizeUrl(
  raw: string,
): { ok: true; canonical: string; host: string } | { ok: false; reason: string } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: 'unparseable-url' };
  }
  const scheme = u.protocol.replace(/:$/, '').toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') {
    return { ok: false, reason: `scheme '${scheme}' not http(s)` };
  }
  u.hash = '';
  return { ok: true, canonical: u.toString(), host: u.hostname.toLowerCase() };
}

/**
 * Classify a host as unsafe (private / loopback / link-local / metadata /
 * internal / ambiguous-numeric). Returns the matching rule id, else null.
 * Deterministic, coarse, and intentionally conservative toward blocking
 * non-public hosts — the oracle skills should only ever reach public web /
 * paper / patent endpoints.
 */
export function unsafeHostRule(host: string): string | null {
  const h = host.replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  // Loopback
  if (h === 'localhost' || h.endsWith('.localhost')) { return 'url-loopback'; }
  if (h === '::1' || /^127\./.test(h)) { return 'url-loopback'; }

  // Unspecified address
  if (h === '0.0.0.0' || h === '::') { return 'url-unspecified-address'; }

  // Link-local + cloud metadata (169.254.169.254 lives here)
  if (/^169\.254\./.test(h) || /^fe80:/i.test(h)) { return 'url-link-local-or-metadata'; }

  // Private RFC1918 (IPv4) + ULA (IPv6 fc00::/7)
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) {
    return 'url-private-network';
  }
  if (/^f[cd][0-9a-f]{2}:/i.test(h)) { return 'url-private-network'; }

  // Internal DNS suffixes (e.g. metadata.google.internal, *.local)
  if (h.endsWith('.internal') || h.endsWith('.local')) { return 'url-internal-suffix'; }

  // Bare-integer / hex hosts are a classic SSRF obfuscation (2130706433 =
  // 127.0.0.1). We can't safely resolve them deterministically, so refuse.
  if (/^\d+$/.test(h) || /^0x[0-9a-f]+$/i.test(h)) { return 'url-ambiguous-numeric-host'; }

  return null;
}

/** Return every injection marker (with its confidence tier) present in `text`. */
export function coarseInjectionMarkers(text: string, config: OracleGuardrailConfig): InjectionMarker[] {
  if (!text) { return []; }
  const hits: InjectionMarker[] = [];
  for (const m of config.injectionMarkers) {
    if (m.re.test(text)) { hits.push(m); }
  }
  return hits;
}

/**
 * Input rail. Budget + forbidden-path violations are hard `block`s; coarse
 * markers in a query are `annotate` (the agent authored the query — a marker
 * there is suspicious, not authoritative). Never echoes raw query content.
 */
export function screenQueries(queries: string[], config: OracleGuardrailConfig): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  if (queries.length > config.maxQueries) {
    findings.push({
      rule: 'query-count-over-budget',
      boundary: 'input',
      disposition: 'block',
      detail: `${queries.length} queries > budget ${config.maxQueries}`,
    });
  }
  queries.forEach((q, i) => {
    if (q.length > config.maxQueryLength) {
      findings.push({
        rule: 'query-too-long',
        boundary: 'input',
        disposition: 'block',
        detail: `query length ${q.length} > ${config.maxQueryLength}`,
        ref: `q#${i}`,
      });
    }
    for (const p of config.forbiddenPathPatterns) {
      if (p.re.test(q)) {
        findings.push({
          rule: `forbidden-path:${p.label}`,
          boundary: 'input',
          disposition: 'block',
          detail: 'query references an internal path / secret pattern',
          ref: `q#${i}`,
        });
      }
    }
    for (const m of coarseInjectionMarkers(q, config)) {
      findings.push({
        rule: 'coarse-injection-marker',
        boundary: 'input',
        disposition: 'annotate',
        detail: `marker '${m.label}'`,
        ref: `q#${i}`,
      });
    }
  });
  return findings;
}

/**
 * Result rail. Quarantines results with an unsafe / malformed URL so they
 * never reach synthesis or the source registry. Annotates provider-allowlist
 * misses and coarse markers (kept — the Python rail is authoritative for
 * injection). Returns the safe subset plus the findings.
 */
export function screenResults(
  results: ProviderResult[],
  config: OracleGuardrailConfig,
): { safe: ProviderResult[]; findings: GuardrailFinding[] } {
  const findings: GuardrailFinding[] = [];
  const safe: ProviderResult[] = [];

  results.forEach((res, i) => {
    const ref = `#${i}`;
    if (!res || typeof res !== 'object') {
      findings.push({ rule: 'result-malformed', boundary: 'result', disposition: 'quarantine', detail: 'result is not an object', ref });
      return;
    }
    let quarantine = false;

    // Provider allowlist is deterministic, and dedupe accepts agent-supplied
    // provider strings — so a non-allowlisted provider is quarantined, not
    // just annotated, to keep it out of synthesis + the source registry.
    if (!config.providerAllowlist.includes(res.provider)) {
      findings.push({
        rule: 'provider-not-allowlisted',
        boundary: 'result',
        disposition: 'quarantine',
        detail: `provider '${sanitizeForDetail(res.provider)}' not in allowlist`,
        ref,
      });
      quarantine = true;
    }

    const norm = normalizeUrl(typeof res.url === 'string' ? res.url : '');
    if (!norm.ok) {
      findings.push({ rule: 'url-malformed-or-unsupported-scheme', boundary: 'result', disposition: 'quarantine', detail: norm.reason, ref });
      quarantine = true;
    } else {
      const unsafe = unsafeHostRule(norm.host);
      if (unsafe) {
        findings.push({ rule: unsafe, boundary: 'result', disposition: 'quarantine', detail: `host '${norm.host}'`, ref });
        quarantine = true;
      }
    }

    // High-confidence prompt-control markers quarantine the result before
    // synthesis; weak markers annotate (kept — Python replay is authoritative).
    const markerText = `${res.title ?? ''}\n${res.content ?? ''}`;
    for (const m of coarseInjectionMarkers(markerText, config)) {
      if (m.confidence === 'high') {
        findings.push({ rule: 'injection-marker-high-confidence', boundary: 'result', disposition: 'quarantine', detail: `marker '${m.label}'`, ref });
        quarantine = true;
      } else {
        findings.push({ rule: 'coarse-injection-marker', boundary: 'result', disposition: 'annotate', detail: `marker '${m.label}'`, ref });
      }
    }

    if (!quarantine) { safe.push(res); }
  });

  if (results.length > config.maxResults) {
    findings.push({
      rule: 'result-count-over-cap',
      boundary: 'result',
      disposition: 'annotate',
      detail: `${results.length} results > cap ${config.maxResults}`,
    });
  }

  return { safe, findings };
}

// ─────────────────────────────────────────────────────────────────────
// Verdict assembly + the skill-handler wrapper
// ─────────────────────────────────────────────────────────────────────

interface VerdictCounts {
  queriesChecked: number;
  resultsIn: number;
  resultsSafe: number;
  resultsQuarantined: number;
}

function summarizeVerdict(allFindings: GuardrailFinding[], counts: VerdictCounts): GuardrailVerdict {
  const truncated = allFindings.length > MAX_FINDINGS;
  // Reserve the last slot for the marker so the total never exceeds the cap.
  const findings = allFindings.slice(0, truncated ? MAX_FINDINGS - 1 : MAX_FINDINGS);
  if (truncated) {
    findings.push({
      rule: 'findings-truncated',
      boundary: 'result',
      disposition: 'annotate',
      detail: `${allFindings.length} findings; capped at ${MAX_FINDINGS}`,
    });
  }
  const verdict = allFindings.some(f => f.disposition === 'block')
    ? 'block'
    : allFindings.some(f => f.disposition === 'quarantine')
      ? 'quarantined'
      : 'pass';
  return {
    envelope_version: ORACLE_GUARDRAIL_ENVELOPE_VERSION,
    verdict,
    checks: CHECK_NAMES,
    findings,
    queries_checked: counts.queriesChecked,
    results_in: counts.resultsIn,
    results_safe: counts.resultsSafe,
    results_quarantined: counts.resultsQuarantined,
  };
}

function extractQueries(input: unknown): string[] | null {
  if (input && typeof input === 'object' && 'queries' in input) {
    const q = (input as { queries?: unknown }).queries;
    if (Array.isArray(q) && q.every(x => typeof x === 'string')) { return q as string[]; }
  }
  return null;
}

/** Flatten the dedupe input's `results` (accepts grouped or flat). */
function extractDedupeResults(input: unknown): ProviderResult[] | null {
  if (input && typeof input === 'object' && 'results' in input) {
    const r = (input as { results?: unknown }).results;
    if (Array.isArray(r)) {
      if (r.length === 0) { return []; }
      if (Array.isArray(r[0])) { return (r as unknown[][]).flat() as ProviderResult[]; }
      return r as ProviderResult[];
    }
  }
  return null;
}

function resultsOf(result: SkillResult): unknown {
  return (result as { results?: unknown }).results;
}

function foldVerdict(result: SkillResult, verdict: GuardrailVerdict): SkillResult {
  const existing = (result as { auditMetadata?: Record<string, unknown> }).auditMetadata ?? {};
  return { ...result, auditMetadata: { ...existing, guardrails: verdict } };
}

function guardSearch(handler: SkillHandler, config: OracleGuardrailConfig): SkillHandler {
  return async (input: unknown): Promise<SkillResult> => {
    const findings: GuardrailFinding[] = [];
    const queries = extractQueries(input);
    if (queries) { findings.push(...screenQueries(queries, config)); }

    // Hard block before the provider call (budget / exfil signal).
    if (findings.some(f => f.disposition === 'block')) {
      const blocked = findings.filter(f => f.disposition === 'block').map(f => f.rule);
      const verdict = summarizeVerdict(findings, {
        queriesChecked: queries?.length ?? 0,
        resultsIn: 0,
        resultsSafe: 0,
        resultsQuarantined: 0,
      });
      return { ok: false, reason: `oracle-guardrail-blocked: ${blocked.join(', ')}`, auditMetadata: { guardrails: verdict } };
    }

    const result = await handler(input);

    let counts: VerdictCounts = { queriesChecked: queries?.length ?? 0, resultsIn: 0, resultsSafe: 0, resultsQuarantined: 0 };
    let outResult = result;
    const rawResults = result.ok ? resultsOf(result) : undefined;
    if (result.ok && Array.isArray(rawResults)) {
      const screened = screenResults(rawResults as ProviderResult[], config);
      findings.push(...screened.findings);
      const quarantined = rawResults.length - screened.safe.length;
      counts = {
        queriesChecked: queries?.length ?? 0,
        resultsIn: rawResults.length,
        resultsSafe: screened.safe.length,
        resultsQuarantined: quarantined,
      };
      if (quarantined > 0) {
        // Quarantined hits must not survive as trusted audit preview either:
        // the handler built result_count + results_preview from the RAW
        // results before screening, so rebuild both from the SAFE subset. The
        // raw totals are preserved in guardrails.results_in / _quarantined.
        const existingMeta = (result as { auditMetadata?: Record<string, unknown> }).auditMetadata ?? {};
        const rebuilt = buildSearchAuditMetadata(queries ?? [], screened.safe);
        outResult = {
          ...result,
          results: screened.safe,
          auditMetadata: { ...existingMeta, result_count: rebuilt.result_count, results_preview: rebuilt.results_preview },
        };
      }
      // quarantined === 0 → leave result (and its auditMetadata) untouched.
    }

    return foldVerdict(outResult, summarizeVerdict(findings, counts));
  };
}

function guardDedupe(handler: SkillHandler, config: OracleGuardrailConfig): SkillHandler {
  return async (input: unknown): Promise<SkillResult> => {
    const findings: GuardrailFinding[] = [];
    const flat = extractDedupeResults(input);
    let counts: VerdictCounts = { queriesChecked: 0, resultsIn: 0, resultsSafe: 0, resultsQuarantined: 0 };
    let effectiveInput = input;

    if (flat) {
      const screened = screenResults(flat, config);
      findings.push(...screened.findings);
      const quarantined = flat.length - screened.safe.length;
      counts = { queriesChecked: 0, resultsIn: flat.length, resultsSafe: screened.safe.length, resultsQuarantined: quarantined };
      // Only rewrite the input when we actually dropped something — an
      // all-safe run reaches the handler byte-for-byte unchanged.
      if (quarantined > 0) {
        effectiveInput = { ...(input as Record<string, unknown>), results: screened.safe };
      }
    }

    const result = await handler(effectiveInput);
    return foldVerdict(result, summarizeVerdict(findings, counts));
  };
}

/**
 * Wrap an oracle skill handler with the Layer-1 deterministic envelope.
 * Search skills get the input+result rails; `dedupe-and-rank` gets the
 * source-registry input rail. Any other name is wrapped as a search skill
 * (defensive: input/result checks no-op when the shape doesn't match).
 */
export function withGuardrails(
  name: string,
  handler: SkillHandler,
  config: OracleGuardrailConfig = DEFAULT_ORACLE_GUARDRAIL_CONFIG,
): SkillHandler {
  if (name === ORACLE_REGISTRY_SKILL) { return guardDedupe(handler, config); }
  return guardSearch(handler, config);
}
