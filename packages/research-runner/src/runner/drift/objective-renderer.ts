/**
 * Pocket Watch v2 — canonical text rendering for the contrastive alignment rail.
 *
 * Two jobs, both PURE and DETERMINISTIC (replay-safe):
 *   1. `renderOkrIntent` — turn an OKR card into a stable "intent text" to embed.
 *      Sorted array fields + omitted-when-missing, so the same card always
 *      hashes to the same string (the input the rail pins).
 *   2. `renderPhaseScope` — extract the mission-bearing sections of a phase
 *      artifact (the text whose alignment we score), omitting bulky evidence /
 *      structure listings that dilute the signal.
 *
 * No embedding, no I/O. The workflow reads files + calls the model; these
 * helpers only shape text. See `vscode-extension/design/pocket-watch-alignment-rail.md`.
 */

/** The subset of OKR fields that carry alignment signal. Loosely typed on the
 *  parsed `okr.yaml` shape so this module stays decoupled from the extension's
 *  Zod schema. */
export interface OkrIntentInput {
  objective?: { description?: string; name?: string };
  keyResults?: Array<{ description?: string; name?: string; metric?: string }>;
  objectiveAlignment?: {
    affectedBarIds?: string[];
    targetCodeRepos?: string[];
    intentCascade?: Record<string, string>;
  };
  governance?: { maxSeverity?: string; scoreThreshold?: number };
}

/** Repo URL → bare repo name (`https://github.com/org/movie-api` → `movie-api`). */
function repoBasename(url: string): string {
  return url.split('/').filter(Boolean).pop() ?? url;
}

/**
 * Canonical, deterministic OKR intent text. Array fields are sorted and
 * empty/missing fields are omitted (never emitted as blank lines) so the
 * rendered string — and therefore its hash — is stable across runs.
 */
export function renderOkrIntent(card: OkrIntentInput): string {
  const lines: string[] = [];
  const obj = card.objective ?? {};
  const objective = (obj.description ?? obj.name ?? '').trim();
  if (objective) { lines.push(`Objective: ${objective}`); }

  const bars = [...(card.objectiveAlignment?.affectedBarIds ?? [])].map(s => s.trim()).filter(Boolean).sort();
  if (bars.length) { lines.push(`BAR: ${bars.join(', ')}`); }

  const repos = [...(card.objectiveAlignment?.targetCodeRepos ?? [])]
    .map(repoBasename).map(s => s.trim()).filter(Boolean).sort();
  if (repos.length) { lines.push(`Target repos: ${repos.join(', ')}`); }

  const krs = (card.keyResults ?? [])
    .map(k => (k.description ?? k.name ?? k.metric ?? '').trim())
    .filter(Boolean);
  if (krs.length) { lines.push(`Key results: ${krs.join('; ')}`); }

  // Intent cascade values, in a fixed role order (not object insertion order).
  const cascade = card.objectiveAlignment?.intentCascade ?? {};
  const cascadeText = ['org', 'role', 'developer', 'user']
    .map(k => (cascade[k] ?? '').trim()).filter(Boolean).join(' ');
  if (cascadeText) { lines.push(`Intent: ${cascadeText}`); }

  return lines.join('\n');
}

/** Phase → the mission-bearing artifact sections to embed (design §"Phase
 *  artifact scope"). Each section is a list of ACCEPTED heading variants
 *  (aliases): the first entry is the canonical/display name, the rest are known
 *  equivalents that must also resolve. A section matches if ANY alias is
 *  normalizeH2-equal to an artifact H2.
 *
 *  Why aliases (HOW especially): the committed PRD artifacts use the SHORT
 *  headings (`## Problem Statement`, `## Goals/Non-Goals`, …) — verified across
 *  celeb-api + movie-api prd.md — while the PRD synthesis pack and prd-validator
 *  (`CANONICAL_PRD_SECTIONS`) mandate the LONG names (`Problem Statement and
 *  Scope`, `Goals and Non-Goals`, `Functional Requirements with Traceability`,
 *  `Security Requirements with Threat Tracing`). That contract skew is real and
 *  unenforced today (validatePrd runs against the LLM draft, not the committed
 *  file), so the rail accepts BOTH shapes rather than silently going empty the
 *  day an artifact follows the pack. WHY/WHAT match their real artifacts 1:1
 *  (no alias needed); WHAT's NUMBERED headers (`## 10. …`) resolve via
 *  normalizeH2. WHAT keeps only §2 (the endpoint, the deliverable anchor) + §10
 *  (Design Rationale & Research Traceability); §1 Project Structure and §3–9 are
 *  implementation inventory that dilute the alignment signal. */
export const PHASE_SCOPE_SECTIONS: Record<string, string[][]> = {
  why: [['Executive Summary'], ['Formal Conclusions'], ['Recommendations']],
  how: [
    ['Problem Statement', 'Problem Statement and Scope'],
    ['Goals/Non-Goals', 'Goals and Non-Goals'],
    ['Functional Requirements', 'Functional Requirements with Traceability'],
    ['Security Requirements', 'Security Requirements with Threat Tracing'],
  ],
  what: [['API Endpoint Specifications'], ['Design Rationale & Research Traceability']],
};

/** Normalize an H2 title for tolerant matching against the scope names:
 *  strip a leading `N.` section number (WHAT renders `## 10. Design Rationale…`),
 *  drop whitespace around a slash (`Goals / Non-Goals` == `Goals/Non-Goals`),
 *  collapse remaining whitespace, lower-case. Without this, numbered WHAT
 *  headers and minor punctuation drift silently miss → an empty scope. */
export function normalizeH2(title: string): string {
  return title.trim()
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Extract a markdown H2 section body: everything between `## <name>` and the
 * next `## ` heading. Matching is tolerant (normalizeH2) so numbered WHAT
 * headers and `/`-spacing variants resolve. Returns '' if absent.
 */
export function extractSection(markdown: string, name: string): string {
  const target = normalizeH2(name);
  const lines = markdown.split('\n');
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const h2 = /^##\s+(.*?)\s*$/.exec(line);
    if (h2) {
      if (inSection) { break; }            // next H2 → stop
      if (normalizeH2(h2[1]) === target) { inSection = true; }
      continue;                            // never include the heading line itself
    }
    if (inSection) { out.push(line); }
  }
  return out.join('\n').trim();
}

export interface PhaseScope {
  scope: string;
  /** Sections the phase expects that were absent from the artifact. */
  missingSections: string[];
  /** `artifact-sections` when at least one section resolved, else `none`. */
  source: 'artifact-sections' | 'none';
}

/**
 * Build the phase scope text from the artifact markdown by concatenating the
 * phase's mission-bearing sections. Records which expected sections were
 * missing rather than silently producing a thin scope (design: "A missing
 * section should not silently produce a low score").
 */
export function renderPhaseScope(phase: string, markdown: string, maxChars = 3000): PhaseScope {
  const sections = PHASE_SCOPE_SECTIONS[phase.toLowerCase()] ?? PHASE_SCOPE_SECTIONS.why;
  const parts: string[] = [];
  const missing: string[] = [];
  for (const aliases of sections) {
    // First non-empty alias body wins; record the canonical name (aliases[0])
    // as missing only when NONE of the accepted variants resolved.
    let body = '';
    for (const name of aliases) {
      body = extractSection(markdown, name);
      if (body) { break; }
    }
    if (body) { parts.push(body); } else { missing.push(aliases[0]); }
  }
  const scope = parts.join('\n\n').slice(0, maxChars);
  return {
    scope,
    missingSections: missing,
    source: parts.length > 0 ? 'artifact-sections' : 'none',
  };
}
