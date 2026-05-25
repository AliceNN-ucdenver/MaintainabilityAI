// Pure helpers for mapping the audit-and-drift workflow's
// PR labels + upserted comment into human-readable failure reasons
// for the Looking Glass OKR cards.
//
// Lives in its own file (rather than inline in LookingGlassPanel.ts)
// so the vitest harness can import without dragging in the vscode
// runtime — same pattern as regexCounters.ts.
//
// Bug BB (2026-05) — see collectAuditFailureReasons for the umbrella-
// label fix. The pre-Bug-BB code returned a fixed "Hatter Tag declared
// `live` but audit shows no successful skill_calls" string for every
// `degraded-evidence` label, even when the actual workflow Reason was
// something else (e.g. PR #138's chain_root_hash placement mismatch on
// a `mesh`-evidence-mode artifact). The fix wires the workflow's
// `**Reason:**` line through when available and falls back to a
// neutral umbrella string otherwise.

import { phaseSpec } from '../types/phaseSpec';

/**
 * Map PR labels + (optional) audit-comment text into human-readable
 * failure reasons for the given phase. Pulls per-phase failure labels
 * from phaseSpec so each phase's degraded/drift labels are recognized.
 *
 * Returns an empty array when no failure labels match (clean PR or
 * audit pending).
 */
export function collectAuditFailureReasons(
  phase: 'why' | 'how' | 'what',
  labels: string[],
  auditCommentReason?: string | null,
): string[] {
  const spec = phaseSpec(phase);
  // Umbrella stock message — used only when no audit-comment reason is
  // available. Phrased to describe the LABEL's actual umbrella scope,
  // not just one branch under it.
  const degradedStock = phase === 'what'
    ? 'Design-degraded (per-repo mode honesty / FR-SR addresses[] coverage / chain failure)'
    : 'Audit degraded — could be chain integrity, chain_root_hash mismatch, evidence-mode mismatch, missing JSONL, or sealed-gate failure. See the audit comment for the specific reason.';
  const degradedMessage = (auditCommentReason && auditCommentReason.trim())
    ? `Audit degraded — ${auditCommentReason.trim()}`
    : degradedStock;
  // Bug CC — chain-integrity-failed gets the audit-comment Reason
  // when available, same as degradedLabel, so the user sees the
  // specific cause (chain verification / Knight's Seal / chain_root_
  // hash placement / unsealed / forged artifact_written) rather than
  // an umbrella string. Pre-Bug-CC this label was `chain-forgery-
  // detected` and didn't appear in the map at all, so the UI fell
  // through to the misleading degraded-evidence stock message even
  // when only the chain label was applied.
  const chainStock = 'Audit chain integrity failed — could be hash chain verification, Knight\'s Seal, chain_root_hash placement, unsealed events, or forged artifact_written. See the audit comment for the specific reason.';
  const chainMessage = (auditCommentReason && auditCommentReason.trim())
    ? `Audit chain integrity failed — ${auditCommentReason.trim()}`
    : chainStock;
  const labelToReason: Record<string, string> = {
    [spec.degradedLabel]: degradedMessage,
    [spec.driftLabel]: phase === 'what'
      ? 'Design drift detected (calibration-pending in D-PR1.MVP)'
      : phase === 'how'
      ? "Caterpillar's Challenge — cross-phase drift from prior phase artifact"
      : 'Pocket Watch — objective drift (cosine below threshold)',
    'chain-integrity-failed': chainMessage,
    // Legacy: pre-Bug-CC label name. Old PRs may still carry it.
    // Same message so the UI is consistent during the transition.
    'chain-forgery-detected': chainMessage,
    'structure-invalid': 'Structural correctness (missing required sections / FR-NN / SR-NN citations)',
    'self-review-exhausted': 'Self-review hit MAX_AUTO_ROUNDS with unresolved MISSING items',
  };
  return Object.entries(labelToReason)
    .filter(([label]) => labels.includes(label))
    .map(([, reason]) => reason);
}

/**
 * Parse the `**Reason:**` line out of an audit-and-drift workflow's
 * upserted PR comment. Returns the reason text (without the markdown
 * bold) or null when the comment has no Reason: line (e.g. clean PRs
 * say only `✅ PRD Audit — clean`).
 *
 * Used by collectAuditFailureReasons to surface the workflow's actual
 * failure cause instead of the misleading stock label text.
 */
export function parseAuditCommentReason(commentBody: string): string | null {
  const m = commentBody.match(/^\*\*Reason:\*\*\s+(.+?)(?:\n|$)/m);
  return m ? m[1].trim() : null;
}
