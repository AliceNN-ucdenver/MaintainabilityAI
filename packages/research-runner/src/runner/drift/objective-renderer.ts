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
 *  artifact scope"). WHAT deliberately omits `Project Structure` and the
 *  per-repo change summary — file/path listings dilute alignment. */
export const PHASE_SCOPE_SECTIONS: Record<string, string[]> = {
  why: ['Executive Summary', 'Formal Conclusions', 'Recommendations'],
  how: ['Problem Statement', 'Goals / Non-Goals', 'Functional Requirements', 'Security Requirements'],
  what: ['Problem Restatement', 'Design Rationale & Research Traceability'],
};

/**
 * Extract a markdown H2 section body: everything between `## <name>` and the
 * next `## ` heading. Heading match is exact (trimmed). Returns '' if absent.
 * Mirrors the awk the workflow used so v1 and v2 read identical bytes.
 */
export function extractSection(markdown: string, name: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const h2 = /^##\s+(.*?)\s*$/.exec(line);
    if (h2) {
      if (inSection) { break; }            // next H2 → stop
      if (h2[1].trim() === name) { inSection = true; }
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
  for (const name of sections) {
    const body = extractSection(markdown, name);
    if (body) { parts.push(body); } else { missing.push(name); }
  }
  const scope = parts.join('\n\n').slice(0, maxChars);
  return {
    scope,
    missingSections: missing,
    source: parts.length > 0 ? 'artifact-sections' : 'none',
  };
}
