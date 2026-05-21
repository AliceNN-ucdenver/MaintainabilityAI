# Agentic SDLC — Code Design Agent (WHAT phase)

**Companion to [`agentic-sdlc.md`](agentic-sdlc.md)** · last reviewed 2026-05-21

This document is the deep-dive on the **third and last Looking-Glass-side agent** — `code-design-agent`. It owns the WHAT phase: turning an approved PRD into a single cross-cutting code design grounded on the **actual code** in every impacted repo, then handing off to the per-repo coding agents (Red Queen territory).

For cross-cutting concerns (audit chain, OKR card, orchestration), read [`agentic-sdlc.md`](agentic-sdlc.md). For the other two agents, see [`agentic-sdlc-marketresearcher.md`](agentic-sdlc-marketresearcher.md) (WHY) and [`agentic-sdlc-prd.md`](agentic-sdlc-prd.md) (HOW). Future capabilities live in [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md).

---

## Current state

**Not yet built.** Phase D is queued — D1 will ship the synthesis prompt pack + the `code-design-agent.agent.md` + the `knowledge-code` Skill backend, gated on B27 (Knight's Seal v1) landing first so the WHAT phase's audit chain is signed from day one.

Why the WHAT phase is the *heaviest gate* in the entire pipeline:

- WHY's reviewer reads web evidence (Tavily / arXiv / USPTO / HN) — third-party content.
- HOW's reviewer reads mesh evidence (CALM model, ADRs, STRIDE catalog) — the team's own architectural intent.
- **WHAT's reviewer reads the actual code** in every `target_code_repos[]` entry. That makes the code-grounding axis genuinely independent of the author's mesh-grounding — and catches "the PRD was perfectly mesh-grounded and still proposes something the codebase can't absorb without breaking."

---

## Scope at a glance

- ONE agent (`code-design-agent`) producing ONE cross-cutting `code-design.md` per OKR — NOT per-repo. Cross-cutting features need a single design that reasons about all impacted repos together; per-repo fan-out happens AFTER this artifact merges via `design-bus.yml` (see [Hand-off](#hand-off-per-repo-fan-out-from-mesh-to-code-repos-canonical) below).
- ONE workflow file (`code-design-agent.yml`) following the Phase B per-agent pattern (B20): dispatch + audit-and-drift + finalize + design-bus fan-out trigger.
- TWO new mesh Skills (`knowledge-code`, `knowledge-reference-repos`) that clone + index code via tree-sitter (deterministic, polyglot, NOT a full code-intelligence service — see [futurethoughts §1](agentic-sdlc-futurethoughts.md#1-archaeology-research-mode--code-grounded-why-phase) for the same data model applied to WHY-phase archaeology).
- THREE new prompt packs (`design/synthesis`, `design/architecture-review`, `design/security-review`) — the review packs adapt the existing PRD-side packs to read indexed-code data, not mesh artifacts.
- ONE open decision (D8 below): whether to keep self-critique (B24 pattern from HOW) or bring separate code-grounded reviewer agents back for WHAT, since code-grounding IS an independent evidence axis (the author hasn't read the code, the reviewer has).
- ONE Caterpillar drift primitive (`code-design.md ## Approach` vs `prd.md ## Problem Statement`) — gets calibrated in D-PR1's first end-to-end run, same way B22 calibrated WHY's Pocket Watch threshold.

---

## Sub-deliverables (Phase D)

> Tracker source-of-truth is [`agentic-sdlc.md`](agentic-sdlc.md) §13. Entries below describe the design intent; check the index doc for current status.

### D0 — Code-design pipeline overview

Establishes the data flow + decision tree + verdict gates *before* writing prompt packs.

**Inputs:** PRD + every `target_code_repos[]` entry's `knowledge-code` extract + `context-architecture` + `context-security` mesh snapshots.

**Output:** ONE `okrs/<id>/what/code-design.md` with: per-repo change list, interface contracts (OpenAPI / proto / GraphQL diffs), data-ownership decisions, migration plan, rollback plan, fan-out manifest. Each section carries `addresses: [FR-X, SR-Y]` frontmatter (per-FR / per-SR traceability — feeds the §11.7 traceability matrix). Same Hatter Tag schema as HOW + the §11.5 Knight's Seal.

### D1 — Prompt pack `design/synthesis.md`

Operating contract for the code-design-agent's *first-pass* synthesis. Reads PRD + indexed code repos. Required sections (10 — mirrors HOW's contract for tooling reuse):

1. **Input Premises** — references PRD `FR-NN` + `SR-NN` ids verbatim
2. **Problem Restatement** — *one-sentence* statement of what the cross-cutting code change accomplishes
3. **Repo Inventory** — per `target_code_repos[]` entry: language, framework, primary architectural pattern, current CALM-node alignment
4. **Per-Repo Change List** — per-repo subsection with `addresses: [FR-X, SR-Y]` frontmatter; what files change, what files are added, what files are deleted
5. **Interface Contracts** — OpenAPI / protobuf / GraphQL diffs for any cross-repo interface; `oasdiff` / `buf` / `graphql-inspector` style change classification (breaking / non-breaking / additive)
6. **Data Ownership** — which repo owns which entity post-change
7. **Migration Plan** — ordered steps including rollback points
8. **Rollback Plan** — verified per repo
9. **Risk Matrix** — same shape as HOW's risk matrix but populated with code-specific risks
10. **Hatter Tag** (frontmatter at the top in YAML) — `intent_thread_uuid`, `parent_intent_thread = prd-action's intent_thread_uuid`, `evidence_mode: code` (NEW canonical value for WHAT — `live` is WHY, `mesh` is HOW, `code` is WHAT), `seal_pub` + `seal_sig` (B27)

### D2 — Prompt pack `design/architecture-review.md`

Code-grounded review pack. The reviewer reads the actual code via `knowledge-code` outputs (NOT the mesh's CALM model). Three structural checks:

- **CALM drift analysis** — does the proposed design's flow match what the code actually does today? Detected via tree-sitter cross-module-call extraction + comparison to the mesh's declared CALM node-edge graph. Drift output is `additions: [...]`, `removals: [...]`, `mutations: [...]`.
- **Interface contract diffs** — for every cross-repo interface change in §5, classify breaking / non-breaking / additive via `oasdiff` (OpenAPI) / `buf` (protobuf) / `graphql-inspector` (GraphQL). A breaking change without a matching migration step in §7 is a `SEVERITY: MAJOR` finding.
- **Module boundary respect** — does the design introduce cross-module dependencies that violate the BAR's CALM layer rules (declared in `bar.app.yaml`)? Layer-violation = `SEVERITY: BLOCKING`.

Output format: `SCORE / SEVERITY / COVERED / MISSING / CHANGES` (same NCMS structured-review shape used at PRD time).

### D3 — Prompt pack `design/security-review.md`

Code-grounded security review. Adapts OWASP pattern-scan + threat-model compliance from `application-security.md` to score the design against actual code in each impacted repo. Three structural checks:

- **OWASP pattern scan** — for every endpoint / data-handling change in §4-§5, derive applicable OWASP categories (A01-A10) from endpoint shape (auth-touching → A07; user-input → A03; etc.). A change that introduces an A0X-touching code path without a matching `SR-NN` in the PRD is a finding.
- **Threat-model compliance** — every STRIDE threat declared in the BAR's `threat-model.yaml` whose scope overlaps the design's changes MUST have either: (a) a mitigation in the design's §4-§5, or (b) an explicit `evidence_mode: pre-existing-mitigation` annotation pointing to the code path that already handles it.
- **NIST control mapping** — for any data flow that crosses a NIST-mapped trust boundary (read from `bar.app.yaml` + portfolio NIST catalog), the design must cite the relevant control families. Missing citations = finding.

Same `SCORE / SEVERITY / COVERED / MISSING / CHANGES` output format.

### D4 — `code-design-agent.agent.md`

Primary-mode dispatch on `oraculum-design` label via `assignCustomCopilotAgent` body-extension (same pattern as B-PR3's Start Why / Start How). Declares `tools:` = `knowledge-okr` + `knowledge-prd` + `knowledge-code` + `knowledge-reference-repos` + `context-architecture` + `context-security` + `audit-emit-event`. Model = `claude-sonnet-4-6` (largest context window — must hold PRD + multiple repo indices simultaneously). `max_skill_calls_per_run: 60` (higher than HOW's 40 because each `knowledge-code` call counts). System prompt mirrors `prd-agent.agent.md`'s structure including the B25 hard rule on `audit-emit-event` (never write JSONL by hand; STOP if runner unreachable).

### D5 — `knowledge-reference-repos` Skill (PURE-data)

Optional input — clones + indexes curated reference repos from `mesh/.caterpillar/reference-repos/` (a per-mesh-configured list of "patterns we want the agent to honor"). Tree-sitter polyglot extraction, same data model as `knowledge-code` but with `reference: true` flag in the output so the agent treats them as exemplars not as edit targets. Used when the team wants to anchor a code-design against a known-good pattern (e.g. "build the new celeb-api endpoint to match the auth pattern in `<org>/reference-auth-service`").

### D6 — `knowledge-code` Skill (PURE-data)

Clones + indexes ONE target code repo per call; code-design-agent invokes it once per `target_code_repos[]` entry. **Tree-sitter polyglot** extraction (`tree-sitter-typescript`, `tree-sitter-python`, `tree-sitter-go`, etc.; lazy-loaded based on detected primary language). Returns an `ObservedArchitecture` JSON shape:

- `modules[]` — per-file: path, language, exported symbols, imported symbols, primary architectural layer (inferred from path conventions + import-flow analysis).
- `cross_module_calls[]` — approximate call graph (NOT type-resolved; LSP/SCIP-grade resolution is a v2 ask, see [futurethoughts §1](agentic-sdlc-futurethoughts.md#1-archaeology-research-mode--code-grounded-why-phase) archaeology future).
- `exposed_interfaces[]` — REST routes (Express/Fastify/Hono/NestJS), proto definitions, GraphQL schemas extracted at parse time.
- `tests[]` — test-file inventory + assertion count per file (signal for "is this code well-covered").

**Deterministic** — same repo state in → same JSON out. The agent uses this output as grounding evidence; reviewers cite it back in their structured reviews.

### D7 — `code-design-agent.yml` workflow

Per-agent pattern from B20. Three jobs:

- **dispatch** — fires on `issues.labeled` with label `oraculum-design`; refuses to dispatch unless `okrs/<id>/how/prd.md` is merged on main (prerequisite check, same pattern as B-PR4's HOW-requires-WHY).
- **audit-and-drift** — fires on `pull_request_target: labeled` with `design-draft`. Verifies: audit chain (B25); Knight's Seal (B27); evidence-honesty (`code-design.md`'s Hatter Tag declares `evidence_mode: code` AND ≥1 `knowledge-code` skill_call per `target_code_repos[]` entry — partial coverage = `degraded`); structural correctness (10 H2 sections + per-repo subsections + `addresses:[FR-X, SR-Y]` frontmatter coverage); **Pocket Watch** (cosine OKR objective vs `code-design.md ## Problem Restatement`, threshold to calibrate in D-PR1 first run); **Caterpillar's Challenge** (cosine `code-design.md ## Approach` vs `prd.md ## Problem Statement`, threshold ≥ 0.70 — same as HOW's cross-phase drift); reviewer dispatch per D8 decision.
- **finalize** — fires on PR merge. Flips action.status to complete + meta.status `design-pending` → `shipped` (or `building` if WHAT triggers `design-bus.yml` next). Appends to `chain-ladder.yaml` (per B25 pattern) with `phase: what`, `parent_intent_thread = prd action's thread`. Triggers `design-bus.yml` fan-out per [Hand-off](#hand-off-per-repo-fan-out-from-mesh-to-code-repos-canonical) below.

### D8 — OPEN DECISION: reviewer dispatch pattern for code-grounded reviews

Phase B's B24 collapsed PRD-time reviewers into single-agent self-critique because the author + reviewer read the same mesh state (no independent evidence surface). For WHAT, **code-grounding IS an independent axis** — the author + reviewer can read the code differently, the reviewer can run linters / `oasdiff` / pattern scans the author skipped. Three candidates:

| Approach | How it works | Pro | Con |
|---|---|---|---|
| **(a) Persona-switch self-critique** (B24 pattern carried forward) | code-design-agent inhabits architect + security personas after first-pass synthesis; tier-bound rounds. | Simplest. Reuses the proven B24 infrastructure. | Same agent reads the same `knowledge-code` outputs — "independent code-grounding" is *evidence available* but not *evidence revealed by a separate agent*. |
| **(b) Per-reviewer tracking-issue dispatch** | `code-design-agent.yml`'s audit-and-drift job opens a tracking issue with `agent_assignment: architect-reviewer` body extension. The reviewer runs in primary mode (full `tools:`), reads `knowledge-code` outputs fresh, posts a structured review back. Same for security. | Reviewers genuinely read code with fresh eyes. Closes Tweedles loophole. | Two extra agent dispatches per WHAT run. Tracking-issue noise. Risk of MCP failure modes (see [`agentic-sdlc.md`](agentic-sdlc.md) §14.8). |
| **(c) Hybrid — self-critique by default, escalate to (b) on Restricted tier** | Autonomous + Supervised tiers use (a); Restricted tier triggers separate reviewer agents via (b). | Cost-control for happy path; rigor where it matters. | Two code paths to maintain. Tier-aware dispatch logic. |

**Recommendation pending end-to-end test:** start with **(a)** for D-PR1 to ship code-design-agent quickly; collect a few real WHAT runs; if self-critique misses code-grounded findings that a separate reviewer would catch (track via post-merge code-review feedback from humans), pivot to **(c)**. Do NOT pre-build (b)'s tracking-issue infrastructure until the data justifies it. This decision lands as a B-PR-style entry in [`agentic-sdlc.md`](agentic-sdlc.md) §13 when D-PR1 ships and produces evidence.

### D9 — `design-bus.yml` workflow

Per-repo fan-out on code-design PR merge. Full spec in [Hand-off](#hand-off-per-repo-fan-out-from-mesh-to-code-repos-canonical) below. Includes: tier-gating on the receiving repo (refuse auto-assign on Restricted-tier BAR target repos), partial-failure handling with `design-fan-out-partial` label, `okrs/<id>/what/design-fan-out.yaml` per-repo result record, cross-repo Hatter Tag continuation contract.

### D10 — Looking Glass UX — Stage 4 / Stage 5 OKR detail card

Phase D adds two new sub-cards to the OKR detail page:

- **What (3a) — Code Design** — same shape as the HOW card: agent, sources (mesh-skill calls + per-`target_code_repos[]` `knowledge-code` calls), refine (self-review rounds OR reviewer scores per D8 decision), findings (per-repo change-list count + interface-contract change count), coverage (FR/SR addressed coverage + threat-model coverage), drift (Pocket Watch + Caterpillar), Knight's Seal badge per §11.5.
- **What (3b) — Per-Repo Fan-Out** — list of `target_code_repos[]` with per-row status (opened / unreachable / forbidden / blocked-on-tier), landing-issue link, fanned-at timestamp. Retry-fan-out button per failed row. Read live from `design-fan-out.yaml` + GitHub API for each target repo's issue state.

### D11 — Hatter chain ladder visualization on OKR detail

Collapsible tree showing: OKR root → WHY action → HOW action → WHAT action → per-repo implementation PRs (cross-repo links via `parent_intent_thread`). Built from `chain-ladder.yaml` (mesh side) + per-target-repo PR Hatter Tag reads. Lands as the visual completion of §11.7 chain-ladder writer's data.

### D12 — End-to-end smoke against the IMDB sample OKR

Repeat the WHY + HOW E2E pattern but full pipeline: WHY → HOW → WHAT → per-repo fan-out on the IMDB-Celebs Restricted-tier sample. Restricted-tier path: WHY merges → HOW merges (with self-review-exhausted because the BAR is Restricted and MAX_AUTO_ROUNDS=0) → WHAT dispatches but cannot auto-progress past Run Audit because the BAR is still Restricted. Demonstrates the tier-gate works end-to-end and the Looking Glass UX surfaces the blocked state correctly.

---

## Hand-off — per-repo fan-out from mesh to code repos (canonical)

When the code-design PR merges in the mesh repo, the Looking Glass-side governance is **done**. The next move is `design-bus.yml` (a workflow, not an agent) opening one landing issue per `target_code_repos[]` entry in each target code repo. From that moment forward, governance shifts to The Red Queen's side (the coding agent in each code repo, governed by `validate_action` MCP gates — out of scope for *this* document). What stays in scope here is exactly how the hand-off is performed so the cross-repo audit chain stays intact.

**Trigger.** `design-bus.yml` fires on `pull_request_target: closed` with `merged == true`, label `design-draft`, and (for tier-gated runs) `governance-pass`. Same-repo PR check (`base.repo.full_name == head.repo.full_name`) — fork PRs skipped.

**What it reads.**
1. The merged `okrs/<id>/what/code-design.md` from main (the base ref after merge).
2. `okrs/<id>/okr.yaml` — to derive `target_code_repos[]` (= `affectedBarIds[].app.yaml.repos[]` union; each entry resolves to a `<owner>/<repo>` slug).
3. The merged code-design PR body — to extract the canonical Hatter Tag (carries `intent_thread_uuid` for this run + `chain_root_hash` for cross-repo audit traversal).
4. The latest action's `runId` from `okr.yaml` matching the merged PR — establishes the `parent_intent_thread` for the landing issues.

**Landing-issue body template (canonical — every fan-out issue MUST match this shape):**

```markdown
<!-- okr_id: OKR-2026Q2-IMDB-001-celeb-api -->
<!-- intent_thread_uuid: 2e28b567-ab8a-4ad0-a29d-632673f412a9 -->
<!-- parent_intent_thread: <code-design-action's intentThreadUuid> -->
<!-- design_pr_url: https://github.com/<mesh-org>/<mesh-repo>/pull/<n> -->
<!-- design_chain_root: 144d97db8daf60b1a669... -->
<!-- repo_scope: celeb-api -->
<!-- phase: implementation -->

## Implementation landing — from OKR-2026Q2-IMDB-001-celeb-api

**You are receiving this issue because the OKR's `target_code_repos[]` includes this repository.** Looking Glass / The Hatter's Tea Party has shipped a code-design that touches this repo. Your job (as a coding agent or human implementer) is to execute the slice relevant to this repo.

### Where to read
- **OKR (full context):** `<mesh-repo>/okrs/OKR-2026Q2-IMDB-001-celeb-api/okr.yaml`
- **PRD (the requirements):** `<mesh-repo>/okrs/OKR-2026Q2-IMDB-001-celeb-api/how/prd.md`
- **Code design (the architectural plan):** `<mesh-repo>/okrs/OKR-2026Q2-IMDB-001-celeb-api/what/code-design.md`
- **Audit chain (provenance):** `<mesh-repo>/okrs/OKR-2026Q2-IMDB-001-celeb-api/audit/events/`

### Your slice — what the code-design says about *this repo*

[per-repo extract from code-design.md based on repo_scope + the `addresses: [FR-X, SR-Y]` frontmatter]

### Cross-repo audit chain — when your PR lands

Open your implementation PR with a Hatter Tag in the description that sets:

```yaml
intent_thread_uuid: 2e28b567-ab8a-4ad0-a29d-632673f412a9   # same as this issue
parent_intent_thread: <code-design-action's intentThreadUuid>   # same as this issue
```

This keeps your code PR linked back to the OKR through the same audit thread the Hatter's Tea Party walked. The mesh-repo `verify-chain` CLI follows these markers across repositories. Governance from this point forward is The Red Queen's domain — see your repo's own pipeline.
```

**Fan-out execution (per target repo).**

1. **Authenticate.** Uses the GitHub App's installation token for the target repo (NOT a long-lived PAT). The App is installed per-org on the mesh + every `target_code_repos[]` entry; if a target repo is missing from the install, the fan-out marks it `unreachable` (see partial-failure below).
2. **Render the landing-issue body** from the template above with all canonical markers populated.
3. **Open the issue** via `gh api repos/{owner}/{repo}/issues -X POST` with labels `oraculum-design-landing` + `okr-anchor`.
4. **Emit a `state_transition` audit event** in the mesh-repo audit log (per landing): `{event_kind: "state_transition", payload: {action: "design-fan-out", target_repo: "<slug>", landing_issue_url: "...", ok: true}}`. Use `audit-emit-event` Skill so the event is hash-chained — gives the cross-repo lineage a tamper-evident record.
5. **Record per-repo result** in `okrs/<id>/what/design-fan-out.yaml` (NEW file, written by the workflow):

```yaml
# Per-repo fan-out result. One entry per target_code_repos[] entry.
# Written by design-bus.yml on code-design PR merge.
fan_out:
  - repo: celeb-api
    landing_issue_url: https://github.com/.../celeb-api/issues/42
    status: opened
    fanned_at: 2026-05-21T14:23:00Z
  - repo: imdb-react-frontend
    landing_issue_url: https://github.com/.../imdb-react-frontend/issues/18
    status: opened
    fanned_at: 2026-05-21T14:23:02Z
  - repo: imdb-identity
    landing_issue_url: null
    status: unreachable
    reason: github-app-not-installed
    fanned_at: 2026-05-21T14:23:04Z
```

6. **Commit `design-fan-out.yaml`** + push back to main (same finalize pattern as the WHY/HOW finalize steps).

**Cross-repo Hatter Tag continuation.**

When the coding agent in the target repo (out of scope here, but governed by Red Queen-side conventions) opens its implementation PR, it MUST write a Hatter Tag in the PR description carrying:
- `intent_thread_uuid` = **same value as the OKR's** (constant across the whole intent thread).
- `parent_intent_thread` = the code-design action's `intentThreadUuid` (= what the landing issue's marker said).
- `chain_root_hash` = the code repo's OWN audit chain root for this PR (NOT the mesh's — each repo has its own audit pipeline).

`verify-chain` walks `parent_intent_thread` links across repos to reconstruct the full thread: OKR root → WHY action → HOW action → WHAT action → per-repo implementation PRs. [`agentic-sdlc.md`](agentic-sdlc.md) §11.6 `chain-ladder.yaml` (written by each phase's finalize) anchors the mesh-side traversal; cross-repo traversal works by GitHub-App-token-reading each linked repo's PR Hatter Tag.

**Partial-failure handling.**

| Outcome | Per-repo status | Parent code-design PR label | Looking Glass UX |
|---|---|---|---|
| All N fan-outs opened | `opened` for all | none | Stage 5 card shows ✓ on every target-repo row |
| Some open, some fail | mix of `opened` / `unreachable` / `forbidden` | `design-fan-out-partial` (color `F59E0B`) | Stage 5 shows ✗ on failed rows + a "Retry fan-out" affordance per failed repo |
| All fail | all `unreachable` / `forbidden` | `design-fan-out-failed` (color `D32F2F`) | Stage 5 blocks the OKR from advancing to `shipped`; user must fix App install or remove `target_code_repos[]` entries |

The fan-out NEVER auto-retries on its own — failures are surfaced for human triage. Re-triggering happens via the Looking Glass "Retry fan-out" button (re-runs the fan-out step but ONLY for entries with non-`opened` status).

**Tier gating on the receiving end.**

If the target repo's primary BAR is Restricted-tier, `design-bus.yml` still opens the landing issue but adds the label `needs-human-review` + posts a comment explaining the tier gate. The coding agent in that repo can ALSO refuse to auto-assign on Restricted (its own validate_action gate); the design-bus side is best-effort attribution, not a replacement for the receiving repo's gate.

**Out of scope.** Anything that happens *inside* the target repo's coding agent — its `validate_action` decisions, its CALM-flow constraints, its security-critical-path locks. That story lives in The Red Queen's design doc.

---

**Companion docs:** [agentic-sdlc.md](agentic-sdlc.md) (index) · [marketresearcher](agentic-sdlc-marketresearcher.md) · [prd](agentic-sdlc-prd.md) · [futurethoughts](agentic-sdlc-futurethoughts.md)
