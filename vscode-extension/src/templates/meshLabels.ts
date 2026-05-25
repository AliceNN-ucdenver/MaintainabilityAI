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
  //
  // Bug CC (2026-05) — chain-integrity-failed replaces the older
  // `chain-forgery-detected` label. The "forgery" framing was
  // misleading: it implied malicious intent for failure modes that
  // are usually honest mistakes (e.g. Bug AA's chain_root_hash
  // pasted at the wrong YAML indent). The new label covers chain-
  // verification, Knight's-Seal, chain_root_hash, unsealed-gate, and
  // forged-artifact_written failures uniformly. The audit comment's
  // `**Reason:**` line carries the specific cause; the UI surfaces
  // it via parseAuditCommentReason. Also: degraded-evidence is now
  // ONLY applied for genuine evidence-honesty causes (missing
  // evidence_mode, JSONL absent, 0 mesh-skill_calls, manifest gap) —
  // chain branches no longer set EVIDENCE_FAIL=true as a side
  // effect (Bug CC verdict-step de-spuriousing).
  { name: 'chain-integrity-failed',  description: 'Audit JSONL chain failed verification (hash chain / Knight\'s Seal / chain_root_hash / unsealed / forged artifact_written). See the audit comment Reason for the specific cause. Merge blocked.', color: 'B71C1C' },
  // Bug GG-followup (2026-05) — agents are CONTRACTUALLY forbidden from
  // mutating OKR state (okr.yaml: actions[], meta.status, runId,
  // intentThreadUuid, hatterChainRoot, createdAt, completedAt, etc.).
  // OKR state is owned by Looking Glass dispatch/reset and the finalize
  // composite action; finalize-okr-action mutates okr.yaml in a SEPARATE
  // post-merge job on main, never inside the agent's PR. Therefore ANY
  // diff to okrs/<id>/okr.yaml inside a PR carrying research-synthesis /
  // prd-draft / design-draft is a trust-boundary violation — Bug GG hard
  // rule in the agent prompts, Bug GG-followup workflow enforcement.
  // PR #140 (HOW-2026-05-25-j2gpke) tripped this exact violation: the
  // prd-agent saw a stale runId mismatch in okr.yaml (caused upstream by
  // the Bug EE reset-drift gap) and "fixed" it by editing the action's
  // runId. Even with the upstream bug fixed, the agent prompt rule alone
  // is advice; this label is the control.
  { name: 'state-integrity-failed',  description: 'Agent PR modified okrs/<id>/okr.yaml. OKR state is owned by Looking Glass dispatch/reset and finalize-okr-action, not the agent (Bug GG-followup). Merge blocked — the only legitimate okr.yaml diffs come from non-agent PRs.', color: 'AD1457' },
  { name: 'degraded-evidence',       description: 'Hatter Tag evidence_mode contradicts the audit log — e.g. declared `live` but no successful skill_calls, or JSONL absent (§11.1.7). Distinct from chain-integrity-failed. Blocks the pass label.', color: 'D32F2F' },
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

  // ── WHAT-phase audit gate labels (code-design-agent.yml — D-PR1) ───
  // Applied by code-design-agent.yml's audit-and-drift job on
  // `design-draft` PRs. Mirror the prd-* / research-* shape. Without
  // these labels declared in MESH_LABELS, the verdict step's
  // `gh pr edit --add-label design-pass` silently no-ops because the
  // label doesn't exist in the repo (the gh CLI returns an error which
  // `|| true` swallows). PR #122 hit this exact failure mode — clean
  // audit, no pass label applied, UI stuck at "audit in flight".
  { name: 'design-pass',             description: 'WHAT-phase code-design passed the audit gate (chain + mode honesty + drift). Reviewers can score.',   color: '43A047' },
  // Bug HH (2026-05) — design-degraded is now SCOPED to per-repo mode-
  // honesty + manifest gaps (the WHAT-specific causes). Pre-Bug-HH it
  // was the catch-all for every degraded verdict including chain +
  // structure; those now apply the shared chain-integrity-failed +
  // structure-invalid labels (declared above) for parity with WHY+HOW.
  { name: 'design-degraded',         description: 'WHAT-phase per-repo mode-honesty contradiction (knowledge-code mode mismatch) or manifest gap (target_code_repos[] incomplete). Distinct from chain-integrity-failed + structure-invalid. Merge blocked until revised.',   color: 'D32F2F' },
  { name: 'design-drift-detected',   description: 'WHAT-phase Pocket Watch or Caterpillar drift gate failed (§11.5). Merge blocked.',                 color: 'D32F2F' },
];
