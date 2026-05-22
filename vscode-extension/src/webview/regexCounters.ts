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
