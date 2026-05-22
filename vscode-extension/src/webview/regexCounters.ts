/**
 * Structural-id counters for artifact markdown.
 *
 * Extracted from LookingGlassPanel.ts so unit tests can import the
 * pure helpers without the VS Code runtime. Used by fetchPhaseSignal
 * to surface UI counts that match the workflow's audit-comment counts.
 *
 * Counters share one rule across phases: **count UNIQUE ids, not raw
 * occurrences**. The agent legitimately restates ids across sections
 * (HOW PRDs write both `### FR-01` and `**FR-01**`; WHY conclusions
 * are re-referenced in §9 Recommendations). Raw-count regex returns
 * inflated numbers that contradict the artifact's truth.
 *
 *   - countUniqueIds  — B31.v1.1 pattern: unique id + per-id N-line
 *                       citation window. Used for HOW FR/SR (12-line
 *                       window) + WHY C-N conclusions (4-line window).
 *   - countUniqueSources — Task #57: Set-based unique S-N count
 *                       replacing the old max(N) reduce which was
 *                       brittle to S-numbers in titles/quotes.
 */

/**
 * Walk the document line-by-line. For each line where `markerRe`
 * matches, extract the first id via `idRe` and record its first-seen
 * line index. Then for each unique id, check a trailing window of
 * `windowLines` for a `citationRe` match. Returns:
 *   - total: count of distinct ids
 *   - covered: how many ids have a citation/anchor in their window
 */
export function countUniqueIds(
  docLines: string[],
  markerRe: RegExp,
  idRe: RegExp,
  citationRe: RegExp,
  windowLines = 12,
): { total: number; covered: number } {
  const seen = new Map<string, number>();
  for (let i = 0; i < docLines.length; i++) {
    if (!markerRe.test(docLines[i])) { continue; }
    const m = docLines[i].match(idRe);
    if (m && !seen.has(m[0])) { seen.set(m[0], i); }
  }
  let covered = 0;
  for (const [, start] of seen) {
    const win = docLines.slice(start, start + windowLines).join('\n');
    if (citationRe.test(win)) { covered++; }
  }
  return { total: seen.size, covered };
}

/**
 * Count UNIQUE S-N source-id citations in the doc text. Returns the
 * size of the set of matched ids. Distinct from the OLD reduce-to-max
 * approach which silently inflated when an artifact contained an
 * out-of-range S-number (e.g. "S99" in a quoted source title).
 *
 * Task #57: replaces `findings = sourceMatches.reduce(max)`.
 */
export function countUniqueSourceIds(docText: string): Set<string> {
  const ids = new Set<string>();
  for (const m of docText.matchAll(/\bS(\d+)\b/g)) {
    ids.add(m[0]);
  }
  return ids;
}

/**
 * WHAT-phase artifact signal extraction (Task #58 honest-metric rewrite).
 *
 * Parses code-design.md for honest FR/SR coverage signals:
 *
 *   - frCount/srCount: every UNIQUE FR-N/SR-N referenced anywhere in
 *     the doc (declared in §1 / mentioned in §4 / mentioned in §5).
 *   - frWithCites/srAnchored: of those declared FR-N/SR-N, how many
 *     are picked up by at least one per-repo §5 subsection's
 *     `addresses: [...]` frontmatter. This is the REAL coverage
 *     metric — "every FR has a repo committed to implementing it."
 *   - perRepoChangeCount: how many per-repo §5 subsections exist
 *     (each has its own `repo:` + `addresses:` frontmatter block).
 *
 * Prior bug: frWithCites was set equal to frCount as a tautology
 * — "every FR is trivially cited" — which lied about coverage. If a
 * FR appeared in §4 but no repo's addresses[] listed it, the metric
 * would still report 8/8 ✓. Now reports honest coverage including
 * the gap (e.g. 6/8 with two missing).
 */
export interface WhatArtifactSignals {
  frCount: number;
  srCount: number;
  frWithCites: number;
  srAnchored: number;
  perRepoChangeCount: number;
}

/**
 * Self-review extraction from artifact markdown (Task #64).
 *
 * Mirror of the workflow's 3-source parser so the UI surfaces scores
 * even before the audit workflow runs (or when it fails to parse).
 * The workflow's chain events are authoritative when present, but
 * the artifact carries the same data in multiple forms — extracting
 * here means the OKR card shows real scores immediately on PR open.
 *
 * Sources (each returns the same shape):
 *   1. `### Self-review — <Persona> (round N)` markdown blocks inside
 *      the artifact body (HOW + WHAT canonical inside-artifact form).
 *   2. `self_review:` YAML frontmatter block at the top of the artifact
 *      (cert-run-4 forensic — agent picked this location).
 *
 * Persona matching tolerates BOTH bare names ("Architect" / "Security"
 * for HOW) and Code-prefixed names ("Code-Architect" / "Code-Security"
 * for WHAT) so one function serves both phases.
 */
export interface SelfReviewScore {
  round: number;
  score?: number;
  severity?: string;
}
export interface SelfReviewExtract {
  architect?: SelfReviewScore;
  security?: SelfReviewScore;
  source: 'artifact-md' | 'artifact-frontmatter-yaml' | 'none';
}

export function extractSelfReviewFromArtifact(docText: string): SelfReviewExtract {
  if (!docText) { return { source: 'none' }; }

  // --- Source 1: markdown blocks ----------------------------------
  const mdBlockRe = /^###\s+Self-review\s+[—-]\s+(?:Code-)?(Architect|Security)\s+\(round\s+(\d+)\)\s*\n+\s*SCORE:\s*([\d.]+)\s*\n+\s*SEVERITY:\s*(\w+)/gim;
  const mdScores: Record<string, SelfReviewScore> = {};
  for (const m of docText.matchAll(mdBlockRe)) {
    const persona = m[1].toLowerCase();
    const round = parseInt(m[2], 10);
    const score = parseFloat(m[3]);
    const severity = m[4].toUpperCase();
    // Latest-round-wins per persona.
    if (!mdScores[persona] || round > mdScores[persona].round) {
      mdScores[persona] = { round, score, severity };
    }
  }
  if (mdScores.architect || mdScores.security) {
    return { architect: mdScores.architect, security: mdScores.security, source: 'artifact-md' };
  }

  // --- Source 2: YAML frontmatter ---------------------------------
  const fmMatch = docText.match(/^---\s*\n([\s\S]+?)\n---\s*\n/);
  if (!fmMatch) { return { source: 'none' }; }
  const fm = fmMatch[1];

  // Find the top-level self_review: key + its indented body.
  const srMatch = fm.match(/^self_review:\s*\n((?:[ \t]+.+\n?)+)/m);
  if (!srMatch) { return { source: 'none' }; }
  const srBody = srMatch[1];

  const roundsMatch = srBody.match(/^\s+rounds:\s*(\d+)/m);
  const roundsVal = roundsMatch ? parseInt(roundsMatch[1], 10) : 1;

  const result: SelfReviewExtract = { source: 'artifact-frontmatter-yaml' };
  for (const persona of ['architect', 'security'] as const) {
    // Tolerate both bare key (`architect:`) and Code-prefixed (`code-architect:`).
    for (const key of [persona, `code-${persona}`]) {
      const personaRe = new RegExp(`^\\s+${key}:\\s*\\n((?:\\s{4,}.+\\n?)+)`, 'mi');
      const pMatch = srBody.match(personaRe);
      if (!pMatch) { continue; }
      const pBody = pMatch[1];
      const scoreM = pBody.match(/score:\s*([\d.]+)/);
      const sevM = pBody.match(/severity:\s*(\w+)/i);
      if (scoreM || sevM) {
        result[persona] = {
          round: roundsVal,
          score: scoreM ? parseFloat(scoreM[1]) : undefined,
          severity: sevM ? sevM[1].toUpperCase() : undefined,
        };
        break;
      }
    }
  }
  if (!result.architect && !result.security) {
    return { source: 'none' };
  }
  return result;
}

export function extractWhatArtifactSignals(docText: string): WhatArtifactSignals {
  const frIds = new Set<string>();
  const srIds = new Set<string>();
  for (const m of docText.matchAll(/\bFR-\d+\b/g)) { frIds.add(m[0]); }
  for (const m of docText.matchAll(/\bSR-\d+\b/g)) { srIds.add(m[0]); }

  // Walk per-repo §5 frontmatter blocks; collect the union of every
  // id listed in any `addresses: [...]` array. A FR/SR is "covered"
  // iff at least one repo has committed to addressing it.
  const addressed = new Set<string>();
  let perRepoSubsections = 0;
  for (const m of docText.matchAll(/---\s*\n([\s\S]+?)\n---/g)) {
    const block = m[1];
    if (!/^\s*repo:\s+/m.test(block)) { continue; }
    const addrMatch = block.match(/^\s*addresses:\s*\[([^\]]*)\]/m);
    if (!addrMatch) { continue; }
    perRepoSubsections++;
    for (const raw of addrMatch[1].split(',')) {
      const id = raw.trim().replace(/^["']|["']$/g, '');
      if (id) { addressed.add(id); }
    }
  }

  // Honest coverage: intersect declared ids with addressed ids.
  let frWithCites = 0;
  for (const id of frIds) { if (addressed.has(id)) { frWithCites++; } }
  let srAnchored = 0;
  for (const id of srIds) { if (addressed.has(id)) { srAnchored++; } }

  return {
    frCount: frIds.size,
    srCount: srIds.size,
    frWithCites,
    srAnchored,
    perRepoChangeCount: perRepoSubsections,
  };
}
