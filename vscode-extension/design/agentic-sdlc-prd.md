# Agentic SDLC — PRD Agent (HOW phase)

**Companion to [`agentic-sdlc.md`](agentic-sdlc.md)** · last reviewed 2026-05-21

This document is the deep-dive on the **second agent in the pipeline** — `prd-agent`. It owns the HOW phase: turning a merged research-doc + the mesh's architectural / threat / quality artifacts into a fully-grounded PRD with functional + non-functional + security requirements that trace back to every input.

The PRD-time review architecture is the most important pivot in the framework: separate `architect-reviewer` + `security-reviewer` agents were tried and removed (B24). The prd-agent now inhabits Architect + Security personas inside its own run via persona-switch self-critique. The reasoning is below in [Why no separate reviewer agents at PRD time](#why-no-separate-reviewer-agents-at-prd-time-the-b24-pivot).

For cross-cutting concerns (audit chain, OKR card, orchestration), read [`agentic-sdlc.md`](agentic-sdlc.md). For the other agents see [`agentic-sdlc-marketresearcher.md`](agentic-sdlc-marketresearcher.md) (WHY) and [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) (WHAT). Future capabilities live in [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md).

---

## Current state — Tier-1 hardening complete, validation gate pending

The prd-agent runs end-to-end through the HOW phase with full audit-chain verification, Pocket Watch + Caterpillar drift gates, FR-citation + SR-anchor structural correctness, persona-switch self-critique, **Knight's Seal v1 cryptographic sealing**, and **grounded `context-*` aggregators**. Last E2E run: PR #105 (post-B25 audit-fabrication fix, pre-Tier-1). **Phase B Tier-1 hardening shipped in research-runner 0.1.26 + extension build 2026-05-21.**

**Trust state today** (post-Tier-1, validation-pending):
- ✅ Audit chain hash-verified pre-merge (B25 — `chain-forgery-detected` label blocks merge on mismatch)
- ✅ Persona-switch self-critique replaces separate reviewer agents (B24)
- ✅ Pocket Watch goal-drift: cosine of OKR objective vs `## Problem Statement` (threshold 0.65)
- ✅ Caterpillar's Challenge cross-phase drift: cosine of PRD `## Problem Statement` vs research-doc `## Executive Summary` (threshold 0.70 — tighter than Pocket Watch because cross-phase should preserve more of the upstream framing)
- ✅ Chain-ladder written on PR merge with `parent_intent_thread = WHY action's intentThreadUuid`
- ✅ FR + SR coverage parser accepts both `**FR-NN**` bold and `### FR-NN:` heading formats (B25 parser fix)
- ✅ **Knight's Seal v1 (B27 — landed).** Every audit event signed Ed25519 with a per-run ephemeral keypair. Private key in `os.tmpdir()` (NEVER in mesh). Public key persisted to `<mesh>/okrs/<id>/audit/keys/<runId>.pub.pem`. `audit-verify-chain` returns `{sealed, sealVerified}`. CI Python chain check + PR audit comment surface a `Knight's Seal (Ed25519)` row. Looking Glass shows a `🛡 Sealed` badge next to `chain_root`. Tampering modes (signature flip, partial signatures, key missing) all block the merge gate.
- ✅ **B5 `context-*` runtime backends (landed).** `context-architecture` / `context-security` / `context-quality` aggregators in `runner/skills.ts` read per-BAR slices: CALM model + ADRs + fitness functions (architecture), threats + controls (security), quality attributes + fitness functions (quality). All accept `{platformId, barIds}` and fail fast on unresolvable BARs — the agent's hard rule "PRDs MUST be grounded" is now honored at runtime. Audit-honesty gate counts real `c_arch` / `c_sec` / `c_qual` skill_calls in `prd-agent.yml`.
- ✅ **UI DRIFT-1 fixed.** HOW pre-flight signal in `okrDetail.ts` now reads "Self-critique: persona-switch pass (architect · security · quality lenses, single agent)".

**Remaining before "Phase B complete":**
- ⚠ **Validation gate** — fresh end-to-end run of WHY + HOW on the IMDB-Celebs sample against the post-Tier-1 build to confirm the `c_arch`/`c_sec`/`c_qual` columns count nonzero, both phase cards show `🛡 Sealed`, chain-ladder shows WHY→HOW lineage, and no UI lies remain. ~30 min wall-clock.
- ⚠ **Tier-2 polish** (Phase A 100% + Settings refactor) — A12 Connect Repo flow + B9 3-tab Settings refactor. Not blocking Phase D design work but completes the Phase A+B claim.

**Previously listed as a gap, now deferred:** B14 (Court Recorder CloudEvents v1.0 envelope adoption). The helper code stays in the repo as a dormant SIEM-export utility; on-disk JSONL stays flat. See [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §8 for the future-trigger conditions.

---

## Where this agent fits

```
market-research-agent → research-doc.md (merged)
                              ↓
                       Start How → prd-agent (this doc)
                              ↓
                          prd.md (PR)
                              ↓
                          [merge]
                              ↓
                       code-design-agent  ← see agentic-sdlc-codedesigner.md
```

The HOW phase is **prescriptive**, not descriptive. It makes design decisions (FRs, SRs, NFRs, risk-matrix entries) that the next phase grounds against. That's why HOW-phase PRs carry the heavy structural-correctness gate + drift gates that WHY-phase PRs skip. But the PRD's reviewers read the **same mesh state** the prd-agent grounded on — which is why the separate-reviewer-agent design was theatre (the B24 pivot).

---

## Agent surface

**File:** `vscode-extension/code-templates/agents-v4/prd-agent.agent.md`

**Trigger:** `assignCustomCopilotAgent` body-extension on an issue with the `oraculum-prd` label. Created by Looking Glass when the user clicks **Start How** on an OKR detail card (gated on the WHY phase being merged).

**Model:** `claude-sonnet-4-6`

**Budget:** `max_skill_calls_per_run: 40` (one per mesh-knowledge skill × several BARs + context-* × several personas + self_review × bounded rounds + final artifact_written).

**Declared tools (skills):**

| Skill | Purpose | Pure-data? |
|---|---|---|
| `knowledge-okr` | Reads the OKR card from the mesh | ✓ |
| `knowledge-research` | Reads the merged research-doc.md from the WHY phase | ✓ |
| `knowledge-mesh-bar` | Reads each affected BAR's CALM + ADRs + threats | ✓ |
| `knowledge-mesh-adrs` | Reads ADRs scoped to the OKR's primary concern | ✓ |
| `knowledge-mesh-threats` | Reads STRIDE threats scoped to the OKR's primary concern | ✓ |
| `context-architecture` | Pure mesh aggregator — feeds the Architect persona | ✓ |
| `context-security` | Pure mesh aggregator — feeds the Security persona | ✓ |
| `context-quality` | Pure mesh aggregator — feeds the Non-Functional Requirements (Quality persona, first-pass only) | ✓ |
| `audit-emit-event` | The ONLY legal path to the audit log (per B25 hard rule) | ✓ |

The agent inhabits **four personas inline** (no nested LLM calls):
- **Architect persona** drives Functional Requirements + the Architect self-review rounds. Cites CALM nodes + ADRs.
- **Security persona** drives Security Requirements + the Security self-review rounds. Cites STRIDE threats + OWASP categories + NIST control families.
- **Quality persona** drives Non-Functional Requirements (first-pass only — no Quality self-review).
- **Self (the PRD Author)** integrates the three persona inputs into one coherent document, then plays back as Architect + Security for self-critique.

---

## Why no separate reviewer agents at PRD time (the B24 pivot)

The original Phase 2 design dispatched `architect-reviewer` + `security-reviewer` on `prd-draft`-labeled PRs to score the artifact. In practice, **those reviewers read the same `context-architecture` / `context-security` / `knowledge-mesh-adrs` / `knowledge-mesh-threats` mesh state the prd-agent already grounded on.** There was no independent evidence surface — just a re-grade of the same inputs by a different agent name. The Tweedles segregation (author DID ≠ reviewer DID) was theatre: enforcing role separation at the agent-name level didn't catch any failure mode that the structural / drift / coverage checks in `prd-agent.yml`'s audit-and-drift job wasn't already catching.

In return for that nothing-burger, we paid:
- **Two extra agent dispatches per HOW run** (3× the MCP failure surface; PR #91 confirmed `github/update_issue` is unreliable in the runtime, so the agent couldn't even apply `prd-draft` to its own PR, blocking the reviewer dispatch chain at step zero).
- **Two more `pull_request_target` workflows** to maintain, each with its own dispatch + Tweedles + round-counter logic.
- **The bot-PR approval gate twice** (architect-reviewer + security-reviewer each tripped GitHub's "Require approval for outside collaborators" on bot-attributed PR events, leaving runs stuck as `action_required`).
- **A complex okr-state-machine** that had to merge two reviewer pass-labels into a master `governance-pass` before the merge gate flipped.

**The fix — self-critique inside the author agent.** `prd-agent.agent.md` was rewritten to switch personas after first-pass synthesis: it scores the PRD as the Architect (using the criteria from `.caterpillar/prompts/prd/architecture-review.md`) and the Security reviewer (from `.../prd/security-review.md`), emits a `self_review` audit event per persona per round, and iterates until both personas return `SEVERITY ∈ {PASS, MINOR}` with empty `MISSING`. Rounds are tier-bounded:

| Tier | MAX_AUTO_ROUNDS | Behavior |
|---|---|---|
| Autonomous | 3 | Up to 3 self-critique rounds; converge or `self_review_exhausted` |
| Supervised | 2 | Up to 2 rounds; ships with `degraded` if exhausted |
| Restricted | 0 | Skip self-critique entirely; ships straight to human review |

If the agent hits MAX without convergence, it emits a `self_review_exhausted` event and ships the PR with a clear "needs human review" signal; the audit-and-drift workflow flips the verdict to `degraded` so branch protection blocks merge.

**Audit chain enrichment from B24.** One event per persona per round means an Autonomous-tier run that needs all 3 rounds emits 6 `self_review` events plus the existing skill_call + artifact_written events. The full critique trail — what the Architect said in round 1, what changed in round 2, what the Security reviewer surfaced in round 3 — is preserved hash-chained alongside the synthesis evidence. `prd-agent.yml`'s audit-and-drift job parses these events into the upserted PR comment (table rows: "Self-review (B24) | N round(s)", "↳ Architect persona | 0.82 severity=MINOR", "↳ Security persona | 0.79 severity=PASS") and Looking Glass's HOW card renders a `Self-review: Arch X · Sec Y` line populated from the same events.

**Implications for WHAT phase.** Where reviewers ground against actual code (read repos, run pattern scans, check ADR alignment against committed implementations), the independent-evidence axis IS real — the author hasn't read the code, the reviewer has. Whether to bring back separate reviewer agents at WHAT time is an **open decision** ([codedesigner D8](agentic-sdlc-codedesigner.md#d8--open-decision-reviewer-dispatch-pattern-for-code-grounded-reviews)). Recommendation: start with self-critique (the proven B24 pattern), pivot to separate reviewers only if real WHAT runs surface code-grounded findings self-critique misses.

---

## Output artifact — prd.md

10-section structured PRD. Required structure (parsed verbatim by the audit-and-drift workflow):

1. **Input Premises** — references the OKR objective + WHY-phase research-doc R[N] findings
2. **Problem Statement** — the substantive problem framing (Pocket Watch compares against the OKR objective; Caterpillar's Challenge compares against research-doc Executive Summary)
3. **Goals / Non-Goals**
4. **Functional Requirements (FR-NN)** — each FR cites ≥1 R[N] (research finding) or E[N] (expert input). Accepted formats: `**FR-01**` bold OR `### FR-01:` heading.
5. **Non-Functional Requirements** — NFR-NN, populated by the Quality persona
6. **Security Requirements (SR-NN)** — each SR cites ≥1 STRIDE THR-NNN or OWASP A0X. Same heading-format tolerance.
7. **Coverage Analysis** — table FR/SR × source (the bidirectional traceability contract; if an R[N] finding maps to no FR, owe an Evidence Gap entry explaining why)
8. **Risk Matrix**
9. **Success Metrics**
10. **References**

**Hatter Tag** (YAML frontmatter at top) — `evidence_mode: mesh` (canonical for HOW), `chain_root_hash`, `self_review:` block summarizing rounds + final per-persona scores, `seal_pub` + `seal_sig` (post-B27).

---

## Pipeline — what happens during a run

### Synthesis (first pass)

1. **Extract OKR + run id** from issue body (HTML markers + Dispatch context table fallback)
2. **Read mesh context** — `knowledge-okr` + `knowledge-research` (refuses to dispatch if research-not-merged-yet) + one `knowledge-mesh-bar` per affected BAR + `knowledge-mesh-adrs` + `knowledge-mesh-threats`
3. **Context skills** — `context-architecture` + `context-security` + `context-quality` (each emits one `skill_call` audit event)
4. **Write first-pass PRD** to `okrs/<id>/how/prd.md` using `.caterpillar/prompts/prd/synthesis.md`

### Self-critique (bounded rounds — B24)

5. **Set `round = 1`.** Resolve `MAX_AUTO_ROUNDS` from primary BAR tier.
6. **Architect persona self-review.** Apply `.caterpillar/prompts/prd/architecture-review.md`. Produce: `SCORE / SEVERITY / COVERED / MISSING / CHANGES`. Emit `self_review` audit event with `payload.persona: architect`.
7. **Security persona self-review.** Apply `.caterpillar/prompts/prd/security-review.md`. Same five-anchor output + STRIDE / OWASP citations. Emit `self_review` audit event with `payload.persona: security`.
8. **Convergence check.**
   - If both personas: `SEVERITY ∈ {PASS, MINOR}` AND `MISSING` empty → break (PRD is converged).
   - If `round >= MAX_AUTO_ROUNDS` → break + emit `self_review_exhausted` event.
   - Otherwise → revise PRD applying the union of CHANGES from both personas; increment round; repeat from step 6.

### Ship

9. **Emit `manifest.yaml`** adjacent to the PRD with `target_code_repos:` derived from the OKR (NOT inferred — read from the card).
10. **Append Hatter Tag YAML frontmatter** with `intent_thread_uuid` + `parent_intent_thread = WHY action's intent_thread_uuid`, `evidence_mode: mesh`, `chain_root_hash`, `self_review:` summary block, `seal_pub` + `seal_sig` (B27).
11. **Open the PR ready-for-review** (NOT draft — Looking Glass's Run Audit button only surfaces on ready-for-review PRs).
12. **Final `artifact_written` audit event** referencing the PRD path + final self-review state + Knight's Seal signature (B27).

---

## HOW-phase audit gates (post-B25)

The audit-and-drift workflow (`prd-agent.yml`) verifies the run in this order. First failure stops; merge blocked.

| Gate | What it checks | Failure label |
|---|---|---|
| **Audit chain integrity** | Replay the SHA-256 chain end-to-end; recomputed hash matches recorded hash for every event | `chain-forgery-detected` (B71C1C) |
| **Knight's Seal signature** (B27) | Re-derive signing input from chain root + artifact SHA + run identity; verify Ed25519 | `seal-broken` (8E0000) |
| **Evidence honesty** | `evidence_mode: mesh` requires ≥1 successful mesh-skill `skill_call` per declared mesh source (knowledge-*, context-*) | `degraded-evidence` (D32F2F) |
| **Structural correctness** | 10 required H2 sections + every FR-NN cites R[N] or E[N] within 4 lines + every SR-NN cites STRIDE THR-NNN or OWASP A0X within 4 lines | `structure-invalid` (D32F2F) |
| **Pocket Watch goal-drift** | cosine(OKR objective, prd.md ## Problem Statement) ≥ 0.65 | `goal-drift-detected` (D32F2F) |
| **Caterpillar's Challenge** | cosine(prd.md ## Problem Statement, research-doc.md ## Executive Summary from base ref) ≥ 0.70 | `caterpillar-drift-detected` (D32F2F) |
| **Self-review convergence** | Final round's Architect + Security severity ∈ {PASS, MINOR} AND no `self_review_exhausted` event | `self-review-exhausted` (D32F2F) |

If all pass → `prd-pass` label → merge unlocked.

---

## Phase B history — HOW-specific

> Full B-PR series tracked in [`agentic-sdlc.md`](agentic-sdlc.md) §13. Entries below highlight what mattered specifically for the HOW agent.

- **B23 — Phase 2 of B20 (prd-agent.yml shipped).** Full HOW lifecycle on the per-agent workflow pattern. Evidence honesty = mesh-skill_call counts (NOT external-provider counts — distinct from WHY). Structural correctness = 10 H2 sections + FR-NN/SR-NN citation coverage. Pocket Watch threshold 0.65 (same as WHY by the same calibration logic). **Caterpillar's Challenge** (cross-phase drift) FIRST introduced here — reads the prior phase from the merged base branch (cloned into `/tmp/base`), NOT the PR head.
- **B24 — Self-critique replaces separate reviewer agents at PRD time.** Full architectural pivot — see [Why no separate reviewer agents at PRD time](#why-no-separate-reviewer-agents-at-prd-time-the-b24-pivot) above. This is the single most important architectural decision in the HOW phase's lifetime.
- **B25 — A.false-audit-fabrication defense.** The first clean HOW run (PR #105) uncovered a new threat: the agent self-admitted to fabricating the audit chain when the runner was unreachable. Prompt-level fix (invoke the audit-emit-event Skill, never write JSONL by hand) + CI-level fix (pre-merge chain re-verification + `chain-forgery-detected` label) + new `audit-verify-chain` Skill + chain-ladder writer. Full incident + fix narrative in [`agentic-sdlc.md`](agentic-sdlc.md) §13 B25.
- **B25 UI parser sync.** The bogus `FR cited 0/8 ✗` display on PR #105 was a UI-side regex that only matched `**FR-NN**` bold form while the workflow correctly accepted `### FR-NN:` heading form too. UI parser brought into sync with workflow.

**Latest clean run (post-fixes):** PR #105 (`OKR-2026Q2-IMDB-001-celeb-api`, runId `HOW-2026-05-21-728gdt`). Next E2E pending — will exercise the new audit-chain verify + audit-emit-event hard rule.

---

## Open questions (HOW-specific)

- **Are mesh-skill_call counts the right evidence-honesty signal at HOW?** Today: `evidence_mode: mesh` requires ≥1 successful call per declared mesh source. Edge case: an agent that calls each skill once but ignores the output. The structural correctness gate (FR cites R[N], SR cites THR-NNN) catches this indirectly — the citations have to land for the FRs/SRs to be valid. But a more direct signal (e.g. cosine of PRD content vs the mesh artifacts it claims to ground on) might be additive.
- **`research-runner` runtime resolution gap (DEFERRED).** PR #105 surfaced a sandbox where `npx @maintainabilityai/research-runner` resolved for WHY but not HOW. Skipped per user direction; B25 defenses catch any future fabrication regardless of cause. See [`agentic-sdlc.md`](agentic-sdlc.md) §14.9.
- **Should the Coverage Analysis table be machine-parseable?** Today the bidirectional traceability lives in a markdown table. The audit parser verifies the FR/SR markers + citations but doesn't currently parse the table itself. A future step could verify that every row in Coverage Analysis points to either a real R[N] in the merged research-doc OR an E[N] expert input emitted as an audit event. Closes a self-reporting loophole.

---

**Companion docs:** [agentic-sdlc.md](agentic-sdlc.md) (index) · [marketresearcher](agentic-sdlc-marketresearcher.md) · [codedesigner](agentic-sdlc-codedesigner.md) · [futurethoughts](agentic-sdlc-futurethoughts.md)
