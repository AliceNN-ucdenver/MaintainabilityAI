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
  { name: 'oraculum-design-landing', description: 'Per-repo landing issue created on code-design merge (Phase 3: code-design-agent.yml).',  color: 'FF8F00' }, // amber-dark

  // ── Artifact PR draft labels (author agent applies these) ──────────
  { name: 'research-synthesis',      description: 'PR carries a Why-phase research-doc.md artifact.',                                    color: '4DD0E1' },
  { name: 'prd-draft',               description: 'PR carries a How-phase prd.md artifact.',                                             color: '26A69A' },
  { name: 'design-draft',            description: 'PR carries a What-phase code-design.md artifact.',                                    color: 'FFB300' },

  // ── Reviewer outcome labels — DEPRECATED in B24 ─────────────────────
  // Separate architect/security-reviewer agents were removed at PRD time
  // (self-critique in prd-agent replaces them). Keeping these labels on
  // disk so existing PRs that carry them aren't broken, but the canonical
  // merge gate at HOW is `prd-pass` only. `governance-pass-*` may come
  // back for WHAT phase if Phase 3 reintroduces code-grounded reviewers.
  { name: 'governance-pass-architecture', description: 'DEPRECATED in B24 — superseded by prd-agent self-critique (Architect persona).',  color: '66BB6A' }, // green
  { name: 'governance-pass-security',     description: 'DEPRECATED in B24 — superseded by prd-agent self-critique (Security persona).',   color: '66BB6A' },
  { name: 'governance-pass',         description: 'Both reviewers passed; merge unlocked subject to branch protection (§6.1).',          color: '43A047' }, // green-dark
  { name: 'revision-required',       description: 'Either reviewer flagged a finding below threshold or severity ≥ HIGH (§6.1).',         color: 'E91E63' }, // rose

  // ── State machine + escalation labels (per-agent audit jobs apply) ──
  { name: 'needs-human-review',      description: 'HumanGate — auto-revision cycle exhausted (§6.4). OKR owner must Approve / Re-run / Reject.', color: 'FB8C00' }, // orange
  { name: 'goal-drift-detected',     description: 'Pocket Watch / Caterpillar drift gate failed (§9.2). Merge blocked.',                  color: 'D32F2F' }, // red
  { name: 'tweedles-violation',      description: 'Reviewer DID matched author DID (§5.3). Workflow blocks dispatch.',                    color: 'D32F2F' },
  { name: 'restricted-tier',         description: 'Informational — OKR primary BAR is Restricted at run start (§6.2).',                   color: 'F4511E' }, // orange-deep

  // ── Round counter labels — DEPRECATED in B24 ──────────────────────
  // round-N labels were maintained by reviewer-bus / architect-reviewer
  // when multi-round auto-revision happened on PR. B24's self-critique
  // moves rounds INSIDE the agent's run — they live in the audit JSONL
  // (`event_kind: self_review`) instead of as PR labels. Keeping these
  // labels in the catalog so old PRs still have them, but workflows no
  // longer write to them.
  { name: 'round-1',                 description: 'DEPRECATED in B24 — rounds live in audit JSONL self_review events now.',               color: '90A4AE' }, // blue-grey
  { name: 'round-2',                 description: 'DEPRECATED in B24 — rounds live in audit JSONL self_review events now.',               color: '90A4AE' },
  { name: 'round-3',                 description: 'DEPRECATED in B24 — rounds live in audit JSONL self_review events now.',               color: '90A4AE' },
  { name: 'round-4',                 description: 'DEPRECATED in B24 — rounds live in audit JSONL self_review events now.',               color: '90A4AE' },
  { name: 'round-5',                 description: 'DEPRECATED in B24 — rounds live in audit JSONL self_review events now.',               color: '90A4AE' },

  // ── Drift gate + fan-out labels (Phase C-PR4 + C-PR5) ──────────────
  { name: 'drift-gate-pass',         description: 'Pocket Watch + Caterpillar drift gate passed (§9.2).',                                 color: 'AED581' }, // light-green
  { name: 'design-fan-out-partial',  description: 'Per-repo fan-out partially succeeded on code-design merge (§9.3); see PR comment.',     color: 'FB8C00' },
  { name: 'design-fan-out-failed',   description: 'Per-repo fan-out failed for ALL target repos on code-design merge (§9.3).',             color: 'D32F2F' },
  { name: 'cost-cap-reached',        description: 'Per-OKR cost cap exceeded (§17.4); per-agent dispatches refuse new runs.',              color: 'D32F2F' },

  // ── Audit-failure labels (per-agent audit jobs apply, kind-specific)
  // Each maps to a SPECIFIC cause so Looking Glass can render the
  // right reason on the "Audit failed" line. Prior catch-all behavior
  // (always applying degraded-evidence on any degraded verdict) is
  // gone — drift-only failures don't get tagged "evidence" anymore.
  { name: 'degraded-evidence',       description: 'Hatter Tag evidence_mode contradicts the audit log (§11.1.7). Blocks the pass label.',  color: 'D32F2F' },
  { name: 'structure-invalid',       description: 'Artifact missing required sections / FR-NN / SR-NN citations. Blocks the pass label.',  color: 'D32F2F' },
  { name: 'self-review-exhausted',   description: 'B24 self-review hit MAX_AUTO_ROUNDS with unresolved MISSING items. Human review required.', color: 'D32F2F' },

  // ── WHY-phase merge gate — market-research-agent.yml applies.
  // Research-synthesis PRs have no persona reviewer (synthesis is
  // descriptive, not a design decision). Merge gate is `research-pass`,
  // set when evidence-honesty + structural + Pocket Watch checks all
  // pass. Branch protection on the mesh repo should require this on
  // PRs labeled `research-synthesis`.
  { name: 'research-pass',           description: 'WHY-phase research doc passed the evidence-honesty gate. Merge unlocked (subject to branch protection).', color: '43A047' },

  // ── HOW-phase audit gate labels (prd-agent.yml — B20 Phase 2) ──────
  // Applied by prd-agent.yml's audit-and-drift job on `prd-draft` PRs.
  // prd-pass = clean verdict (evidence + structure + Pocket Watch +
  // Caterpillar's Challenge all pass). The reviewer dispatch fires
  // independently on the prd-draft label regardless; prd-pass is the
  // merge gate (branch protection should require it on prd-draft PRs).
  { name: 'prd-pass',                description: 'HOW-phase PRD passed the audit gate (evidence + structure + drift). Reviewers can score.',                color: '43A047' },

  // caterpillar-drift-detected = cross-phase drift gate failed. The PRD
  // diverged semantically from the merged research-doc Executive Summary
  // (cosine < 0.70). Same severity as goal-drift-detected; both block
  // governance-pass. Distinct label so the failure mode is legible in
  // the PR sidebar without expanding the audit comment.
  { name: 'caterpillar-drift-detected', description: "Caterpillar's Challenge: cross-phase drift from prior phase artifact (§11.5). Merge blocked.",         color: 'D32F2F' },
];
