/**
 * Pure predicates for identifying an OKR's fan-out artifacts (landing
 * issues + implementation PRs) on GitHub, by the markers the fan-out
 * engine + impl-agent stamp.
 *
 * WHY this lives separate from design-fan-out.yaml: the local file is
 * one row per repo, written last-writer-wins. A buggy fan-out (e.g. the
 * listener-leak that opened 20 duplicate landing issues at once) records
 * only ONE issue per repo, orphaning the rest. GitHub is the source of
 * truth for "everything this fan-out actually created" — these
 * predicates match on the stamped markers, so the Reset cleanup finds
 * all of them, dupes included.
 *
 * Markers:
 *   - landing issue: label `oraculum-design-landing` (createIssueRaw in
 *     onFanOut) + body carries `<!-- okr_id: <id> -->`
 *     (composeFanOutLandingIssueBody).
 *   - impl PR: title `[<id>] Implement <slug> slice` (impl-agent
 *     template) and/or body `implementation_chain:` block with
 *     `okr_id: <id>`.
 *
 * Standalone module (no octokit / vscode imports) so vitest can exercise
 * the matching without the GitHub runtime.
 */

export const FANOUT_LANDING_LABEL = 'oraculum-design-landing';

/** True when an issue body carries the OKR's landing-issue marker. */
export function isFanOutLandingIssue(body: string | null | undefined, okrId: string): boolean {
  return (body ?? '').includes(`<!-- okr_id: ${okrId} -->`);
}

/** True when a PR is the impl PR for the OKR's fan-out (title or body). */
export function isFanOutImplPr(
  title: string | null | undefined,
  body: string | null | undefined,
  okrId: string,
): boolean {
  // Title is the primary signal — composed by the impl-agent template
  // as `[<okr_id>] Implement <slug> slice`, bracketed so it can't
  // prefix-collide with a sibling OKR id.
  if ((title ?? '').includes(`[${okrId}]`)) return true;
  // Fallback: the implementation_chain block in the PR body.
  return (body ?? '').includes(`okr_id: ${okrId}`);
}
