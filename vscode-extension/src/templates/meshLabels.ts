/**
 * Canonical GitHub label catalog for the agentic-SDLC pipeline.
 *
 * Every workflow in `code-templates/workflows/` and every Start
 * Why/How/What dispatch from Looking Glass references labels by name.
 * GitHub's `gh issue create --label` REQUIRES the label to already
 * exist in the repo — there's no `--label-create` shortcut. So we
 * provision the canonical set up-front, idempotently, whenever the
 * user redeploys workflows (or, as a self-heal, whenever
 * `gh issue create` fails with "could not add label: '<name>' not
 * found").
 *
 * Colors mirror the design doc §3.4 label table where named. GitHub
 * label colors are 6-char hex without `#` (e.g. `cccccc`).
 */

export interface MeshLabelSpec {
  name: string;
  description: string;
  /** 6-char hex (no leading #). */
  color: string;
}

export const MESH_LABELS: MeshLabelSpec[] = [
  // ── OKR anchor + phase labels (Looking Glass on Start <phase>) ─────
  { name: 'okr-anchor',              description: 'Issue anchors an OKR-driven phase (Why / How / What).',                              color: '5C6BC0' }, // indigo
  { name: 'oraculum-research',       description: 'OKR Why phase — market research synthesis (market-research-agent).',                 color: '4DD0E1' }, // cyan
  { name: 'oraculum-prd',            description: 'OKR How phase — PRD synthesis (prd-agent).',                                          color: '26A69A' }, // emerald
  { name: 'oraculum-design',         description: 'OKR What phase — cross-cutting code design (code-design-agent).',                     color: 'FFB300' }, // amber
  { name: 'oraculum-design-landing', description: 'Per-repo landing issue created by design-bus.yml after code-design merges.',          color: 'FF8F00' }, // amber-dark

  // ── Artifact PR draft labels (author agent applies these) ──────────
  { name: 'research-synthesis',      description: 'PR carries a Why-phase research-doc.md artifact.',                                    color: '4DD0E1' },
  { name: 'prd-draft',               description: 'PR carries a How-phase prd.md artifact.',                                             color: '26A69A' },
  { name: 'design-draft',            description: 'PR carries a What-phase code-design.md artifact.',                                    color: 'FFB300' },

  // ── Reviewer outcome labels (architect/security-reviewer apply) ────
  { name: 'governance-pass-architecture', description: 'architect-reviewer scored the PR above threshold (§6.1).',                       color: '66BB6A' }, // green
  { name: 'governance-pass-security',     description: 'security-reviewer scored the PR above threshold (§6.1).',                        color: '66BB6A' },
  { name: 'governance-pass',         description: 'Both reviewers passed; merge unlocked subject to branch protection (§6.1).',          color: '43A047' }, // green-dark
  { name: 'revision-required',       description: 'Either reviewer flagged a finding below threshold or severity ≥ HIGH (§6.1).',         color: 'E91E63' }, // rose

  // ── State machine + escalation labels (okr-state-machine.yml) ──────
  { name: 'needs-human-review',      description: 'HumanGate — auto-revision cycle exhausted (§6.4). OKR owner must Approve / Re-run / Reject.', color: 'FB8C00' }, // orange
  { name: 'goal-drift-detected',     description: 'Pocket Watch / Caterpillar drift gate failed (§9.2). Merge blocked.',                  color: 'D32F2F' }, // red
  { name: 'tweedles-violation',      description: 'Reviewer DID matched author DID (§5.3). Workflow blocks dispatch.',                    color: 'D32F2F' },
  { name: 'restricted-tier',         description: 'Informational — OKR primary BAR is Restricted at run start (§6.2).',                   color: 'F4511E' }, // orange-deep

  // ── Round counter labels (reviewer-bus.yml maintains; 1..5) ────────
  // We pre-create round-1..round-5 so the workflow never has to add
  // them on its own. Five is enough for tier MAX=2 + a few HumanGate
  // re-runs; if the user goes past 5 the workflow will add round-N
  // dynamically (which works because by then we'll already have run
  // workflows that have permissions to add labels — the failure mode
  // is only on the first dispatch).
  { name: 'round-1',                 description: 'Auto-revision round counter — reviewer-bus.yml maintains.',                            color: '90A4AE' }, // blue-grey
  { name: 'round-2',                 description: 'Auto-revision round counter — reviewer-bus.yml maintains.',                            color: '90A4AE' },
  { name: 'round-3',                 description: 'Auto-revision round counter — reviewer-bus.yml maintains.',                            color: '90A4AE' },
  { name: 'round-4',                 description: 'Auto-revision round counter — reviewer-bus.yml maintains.',                            color: '90A4AE' },
  { name: 'round-5',                 description: 'Auto-revision round counter — reviewer-bus.yml maintains.',                            color: '90A4AE' },

  // ── Drift gate + fan-out labels (Phase C-PR4 + C-PR5) ──────────────
  { name: 'drift-gate-pass',         description: 'Pocket Watch + Caterpillar drift gate passed (§9.2).',                                 color: 'AED581' }, // light-green
  { name: 'design-fan-out-partial',  description: 'design-bus.yml fan-out partially succeeded (§9.3); see PR comment for details.',       color: 'FB8C00' },
  { name: 'design-fan-out-failed',   description: 'design-bus.yml fan-out failed for ALL target repos (§9.3).',                           color: 'D32F2F' },
  { name: 'cost-cap-reached',        description: 'Per-OKR cost cap exceeded (§17.4); okr-bus.yml refuses new dispatches.',                color: 'D32F2F' },
];
