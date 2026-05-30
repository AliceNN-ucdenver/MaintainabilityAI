/**
 * Fan-out concurrency cap — bounds simultaneous in-flight impl runs.
 *
 * The OKR fan-out dispatches a Copilot impl agent per target repo. Two
 * kinds of serialization already exist:
 *
 *   - Dependency chains self-serialize: a dependent repo sits at
 *     `pending-on-upstream` until its upstream PR merges, so only a
 *     chain's HEAD is ever in-flight.
 *
 * The gap this closes: a WIDE wave of *independent* repos all dispatch
 * at once → unbounded concurrent agents (a DoS row in the threat model).
 * This module adds a HARD global cap on total in-flight runs.
 *
 * "In-flight" = a row whose decision status is `'opened'` (landing issue
 * created, impl agent dispatched) OR `'pr-opened'` (impl PR live). A
 * chain head counts as 1; its tail is `pending-on-upstream`, which is
 * NOT in-flight. Independent repos count as 1 each.
 *
 * Excess ready rows (beyond the available slots) are demoted to a new
 * status `'pending-on-cap'` and drain via the existing Re-check → Fan
 * out loop — NO new auto-dispatch machinery. Admission is wave-ordered
 * so earlier waves / chain-heads win the slots.
 *
 * PURE function: no I/O, no Date/random. Mutates each demoted entry's
 * `decision` in place (the panel renders those same objects) and returns
 * counts for the report.
 */
import type { PreflightStatus } from './types';

/** Hard cap on total simultaneous in-flight impl runs. */
export const FANOUT_CONCURRENCY_CAP = 5;

/** One fan-out entry as seen by the cap — slug + its mutable decision. */
export interface ConcurrencyCapEntry {
  slug: string;
  decision: { status: PreflightStatus; reason?: string };
}

/** Counts the cap pass produced — threaded into the fan-out report. */
export interface ConcurrencyCapResult {
  /** Rows already in-flight (`'opened'` or `'pr-opened'`) at cap time. */
  inFlight: number;
  /** Ready rows admitted (kept at `'ready'`) this pass. */
  admitted: number;
  /** Ready rows demoted to `'pending-on-cap'` this pass. */
  queued: number;
}

/**
 * Apply the global concurrency cap to a set of fan-out entries.
 *
 * Algorithm (exact):
 *   1. inFlight = count of entries whose decision.status is `'opened'`
 *      or `'pr-opened'`.
 *   2. available = max(0, cap - inFlight).
 *   3. readyWaveOrdered = ready slugs (decision.status === 'ready')
 *      ordered by wave: flatten `waves` in order, keep those that are
 *      ready; then append any ready slug not found in `waves`, sorted,
 *      at the end (defensive).
 *   4. Keep the first `available` ready slugs as-is. For each ready slug
 *      BEYOND `available`, demote its decision to `'pending-on-cap'`.
 *   5. return { inFlight, admitted, queued }.
 *
 * MUTATES each demoted entry.decision in place.
 */
export function applyConcurrencyCap(
  entries: ConcurrencyCapEntry[],
  waves: string[][],
  cap: number = FANOUT_CONCURRENCY_CAP,
): ConcurrencyCapResult {
  // 1. Count rows already in-flight.
  const inFlight = entries.filter(
    e => e.decision.status === 'opened' || e.decision.status === 'pr-opened',
  ).length;

  // 2. Slots available for newly-admitted ready rows.
  const available = Math.max(0, cap - inFlight);

  // Index ready entries by slug for wave-ordered selection.
  const readyBySlug = new Map<string, ConcurrencyCapEntry>();
  for (const e of entries) {
    if (e.decision.status === 'ready') readyBySlug.set(e.slug, e);
  }

  // 3. Order ready slugs by wave (wave 0 first), then any ready slug not
  //    present in `waves`, sorted, appended defensively.
  const readyWaveOrdered: ConcurrencyCapEntry[] = [];
  const seen = new Set<string>();
  for (const wave of waves) {
    for (const slug of wave) {
      const e = readyBySlug.get(slug);
      if (e && !seen.has(slug)) {
        readyWaveOrdered.push(e);
        seen.add(slug);
      }
    }
  }
  const leftover = [...readyBySlug.keys()].filter(s => !seen.has(s)).sort();
  for (const slug of leftover) {
    const e = readyBySlug.get(slug);
    if (e) readyWaveOrdered.push(e);
  }

  const readyCount = readyWaveOrdered.length;

  // 4. Admit the first `available`; demote the rest to `pending-on-cap`.
  for (let i = available; i < readyCount; i++) {
    readyWaveOrdered[i].decision = {
      status: 'pending-on-cap',
      reason: `Concurrency cap (${cap}) reached — ${inFlight} run(s) in flight. Queued; re-check as they complete.`,
    };
  }

  // 5. Counts for the report.
  return {
    inFlight,
    admitted: Math.min(available, readyCount),
    queued: Math.max(0, readyCount - available),
  };
}
