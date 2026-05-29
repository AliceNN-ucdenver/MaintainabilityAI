/**
 * Bug-AAC — derive the governance-tier warning surfaced on a Fan-Out
 * pre-flight row, so the user sees BEFORE dispatch when a target repo's
 * owning BAR tier will constrain the implementation agent.
 *
 * The pre-flight `ready` status only means "repo exists, harness present,
 * perms OK, upstream merged" — it does NOT consult the BAR tier. But the
 * Red Queen hook in the target repo enforces tier-based tool limits at
 * runtime (TIER_TOOL_RESTRICTIONS):
 *   - restricted → Write categorically DENIED (TIER-001) → the impl agent
 *     can only produce a plan-only PR. A greenfield repo whose security
 *     pillar hasn't cleared 50 lands here (computeTier: any pillar < 50 →
 *     restricted).
 *   - supervised → Write allowed; Edit needs plan approval
 *     (REDQUEEN_PLAN_APPROVED) → mostly fine, worth a heads-up.
 *   - autonomous → no constraint to surface.
 *
 * Pure (no vscode / octokit / BarSummary) so vitest exercises the mapping
 * directly; the panel computes the tier + weakest pillar from the BAR and
 * passes them in.
 */
import type { GovernanceTier } from '../../types';

export interface FanOutGovernanceWarning {
  tier: GovernanceTier;
  /** `block` = plan-only (restricted). `caution` = supervised heads-up. */
  severity: 'block' | 'caution';
  /** True when the Red Queen will deny Write (restricted) → plan-only PR. */
  planOnly: boolean;
  /** Human-readable chip text. */
  reason: string;
}

/**
 * Returns the warning to render on a ready row, or null when the tier
 * imposes no constraint worth surfacing (autonomous).
 *
 * `weakestPillar` is the lowest-scoring sub-50 pillar (or null when all
 * pillars are ≥ 50) — used to tell the user WHICH pillar to raise.
 */
export function deriveFanOutGovernance(
  tier: GovernanceTier,
  weakestPillar: { name: string; score: number } | null,
): FanOutGovernanceWarning | null {
  if (tier === 'restricted') {
    const pillarNote = weakestPillar
      ? ` (${weakestPillar.name} pillar ${weakestPillar.score}/100 — raise to ≥ 50)`
      : '';
    return {
      tier,
      severity: 'block',
      planOnly: true,
      reason: `restricted BAR — impl will be plan-only; Red Queen denies Write${pillarNote}`,
    };
  }
  if (tier === 'supervised') {
    return {
      tier,
      severity: 'caution',
      planOnly: false,
      reason: 'supervised BAR — Write allowed; Edit needs plan approval (REDQUEEN_PLAN_APPROVED)',
    };
  }
  return null;
}
