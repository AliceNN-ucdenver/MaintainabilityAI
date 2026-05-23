# Agentic SDLC — Code Design Agent (WHAT phase)

**Companion to [`agentic-sdlc.md`](agentic-sdlc.md)** · last reviewed 2026-05-21

This document is the deep-dive on the **third and last Looking-Glass-side agent** — `code-design-agent`. It owns the WHAT phase: turning an approved PRD into a single cross-cutting code design grounded on the **actual code** in every impacted repo, then handing off to the per-repo coding agents (Red Queen territory).

For cross-cutting concerns (audit chain, OKR card, orchestration), read [`agentic-sdlc.md`](agentic-sdlc.md). For the other two agents, see [`agentic-sdlc-marketresearcher.md`](agentic-sdlc-marketresearcher.md) (WHY) and [`agentic-sdlc-prd.md`](agentic-sdlc-prd.md) (HOW). Future capabilities live in [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md).

---

## Current state

**Phase D — done-done pending next E2E cert run.** D-PR1 MVP + v1.1-v1.6 polish + Refactor 3a/3b/3c shipped 2026-05-22. `code-design-agent` runs the full WHY → HOW → WHAT pipeline with the same B24 persona-switch the prd-agent uses, against the same end-to-end signed audit chain. Two validated WHAT runs (PR #120 + PR #122) plus a comprehensive consistency pass mean the next run is the certification gate; once it passes cleanly, Phase D closes.

Validation evidence from PR #120 + #122 (the open `governance-mesh` repo, IMDB-Celebs sample OKR):

- **Chain**: 14 events on PR #120, 17 events on PR #122, all signed (`{sealed: true, sealVerified: true}`). PR #122 head `ba2071ffa65137ed…`.
- **Brownfield clone**: `knowledge-code` ran against `imdb-react-frontend`, returned `mode: brownfield` with real SHA `4c554fbe6392`, walked 77 files (53 TypeScript + 3 JavaScript). Brownfield section in `code-design.md` cites real paths under `src/`.
- **Greenfield design**: `knowledge-code` ran against the (nonexistent) `celeb-api` repo with `repoStatus: create`, returned `mode: greenfield` with scaffolding hints. Greenfield section is a scaffolding spec, not file-level changes.
- **Persona-switch self-critique**: 4 `self-review-code-*` skill_calls per run. Scores `Code-Architect MINOR → PASS`, `Code-Security MINOR → PASS` (0.91→0.97, 0.90→0.96 on PR #120). Same convergence shape as PR #118 PRD-phase.
- **Per-repo mode honesty**: every per-repo subsection in §4 + §5 of `code-design.md` carries `mode:` frontmatter matching the chain's knowledge-code response mode (verified by the v1.1-fixed audit-and-drift workflow).
- **Post-merge finalize**: chain-ladder.yaml WHAT entry written, action.hatterChainRoot populated, meta.status rolled design-pending → building.

**Consistency pass complete (Refactor 3a / 3b / 3c — see [`agentic-sdlc.md`](agentic-sdlc.md) §13 snapshot for full list):**

- Audit-event payload contract pinned with a regression test (eliminates the D-PR1.v1.1 #27 mode-honesty bug class).
- Phase-spec single source of truth (`src/types/phaseSpec.ts`) — cross-layer consistency tests assert every label / agent / workflow this map references is also in the deploy registries. The D-PR1.v1.2 missing-`design-pass` bug is now mechanically impossible.
- Composite `finalize-okr-action` shared across WHY + HOW + WHAT — eliminates the "5 ways to finalize" smell that caused the D-PR1.v1.4 timestamp corruption.

**Remaining Phase D work** (not blocking current end-to-end runs):

- **D5** `knowledge-reference-repos` Skill — optional reference-pattern grounding for greenfield targets. Ships in D-PR3.
- **D8** decision — persona-switch (current) vs hybrid (escalate to separate code-grounded reviewers on Restricted tier). Recommendation pending D-PR1 production runs: keep persona-switch unless human reviewers flag code-grounded findings the agent missed.
- **D9** `design-bus.yml` per-repo fan-out workflow (brownfield landing-issue + greenfield org-create + seed-commit). Ships in D-PR4.
- **D10/D11** Looking Glass deeper UX — currently WHAT card surfaces signals via the cross-phase shared renderer; D-PR5 adds a Stage 5 Per-Repo Fan-Out card + Hatter chain-ladder visualization on OKR detail.
- **D12** full pipeline E2E smoke including the fan-out hand-off. Ships in D-PR6.

Why the WHAT phase is the *heaviest gate* in the entire pipeline:

- WHY's reviewer reads web evidence (Tavily / arXiv / USPTO / HN) — third-party content.
- HOW's reviewer reads mesh evidence (CALM model, ADRs, STRIDE catalog) — the team's own architectural intent.
- **WHAT's reviewer reads the actual code** in every `target_code_repos[]` entry — *when the repo exists*. For greenfield repos the agent grounds on the PRD + mesh only (no code to read yet). The brownfield/greenfield branching is the new wrinkle Phase D's design solved with A12.v1.1's 4-state repo model.

---

## Scope at a glance

- ONE agent (`code-design-agent`) producing ONE cross-cutting `code-design.md` per OKR — NOT per-repo. Cross-cutting features need a single design that reasons about all impacted repos together; per-repo fan-out happens AFTER this artifact merges via `design-bus.yml` (see [Hand-off](#hand-off-per-repo-fan-out-from-mesh-to-code-repos-canonical) below).
- ONE workflow file (`code-design-agent.yml`) following the Phase B per-agent pattern (B20): dispatch + audit-and-drift + finalize + design-bus fan-out trigger.
- TWO new mesh Skills (`knowledge-code`, `knowledge-reference-repos`) that clone + index code via tree-sitter (deterministic, polyglot, NOT a full code-intelligence service — see [futurethoughts §1](agentic-sdlc-futurethoughts.md#1-archaeology-research-mode--code-grounded-why-phase) for the same data model applied to WHY-phase archaeology).
- THREE new prompt packs (`design/synthesis`, `design/architecture-review`, `design/security-review`) — the review packs adapt the existing PRD-side packs to read indexed-code data, not mesh artifacts.
- ONE open decision (D8 below): whether to keep self-critique (B24 pattern from HOW) or bring separate code-grounded reviewer agents back for WHAT, since code-grounding IS an independent evidence axis (the author hasn't read the code, the reviewer has).
- ONE Caterpillar drift primitive (`code-design.md ## Approach` vs `prd.md ## Problem Statement`) — gets calibrated in D-PR1's first end-to-end run, same way B22 calibrated WHY's Pocket Watch threshold.

---

## Brownfield vs Greenfield branching (canonical)

The IMDB-Celebs sample OKR exposed the gap that A12.v1.1 closed: `target_code_repos[]` carries a URL but does NOT guarantee the repo exists on GitHub. The `celeb-api` repo in the sample is *declared* but doesn't exist — it's the thing this OKR will *build*. Without an explicit greenfield signal, the code-design-agent would try `knowledge-code` clone, 404, mark the repo unreachable, and produce a design grounded on nothing.

A12.v1.1's 4-state `targetCodeRepoStatus` per-URL value drives a per-repo branch in **every** Phase D component:

| Repo status | Code-design-agent behavior | `knowledge-code` Skill response | `code-design-agent.yml` dispatch | `design-bus.yml` fan-out |
|---|---|---|---|---|
| **`connected`** (brownfield — exists + wired) | Clone + tree-sitter index the repo. Ground design on actual code: per-repo subsection in `code-design.md` cites real file paths, real exported symbols, real cross-module calls. Reviewers (D2/D3) can run `oasdiff` / `buf` / linters against real code. | `{ ok: true, mode: 'brownfield', observedArchitecture: {...} }` — full tree-sitter extract. | Proceed. | Open landing issue in the existing repo via `gh api repos/{owner}/{repo}/issues -X POST`. |
| **`create`** (greenfield — net-new repo) | Skip clone. Ground design on PRD + mesh only. Per-repo subsection in `code-design.md` reads as a *scaffolding spec*: target layout, framework/language choice (cite ADRs + reference-repos exemplars from D5), seed file list, initial test scaffold, README + LICENSE templates. The code-design carries `mode: greenfield` in the per-repo `addresses:` frontmatter. | `{ ok: true, mode: 'greenfield', reason: 'repo-status-create', referenceRepos: [...] }` — agent gets D5 reference-repos as the only "code" grounding. | Proceed. | **First** create the repo via `gh api orgs/{org}/repos -X POST -f name=...` (idempotent — refuses if repo already exists, falls back to landing-issue open), seed it with `README.md` + `LICENSE` + `.github/CODEOWNERS`, **then** open the landing issue carrying the scaffolding spec. |
| **`not-connected`** (exists but not wired) | Refuse to ground. Soft-fail in the dispatch precondition — the agent never starts. | `{ ok: false, reason: 'repo-not-connected', remediation: '...' }` if the agent retries — defense-in-depth in case the dispatch check is bypassed. | **REFUSE.** Dispatch precondition fails with annotation pointing to the Looking Glass repo-status picker. The user must explicitly pick Connect or Create before the agent runs. | N/A (run never starts). |
| **`unreachable`** (probed and failed) | Same refuse-and-prompt as `not-connected`, but with a different UI surface (⚠ warning chip; user must fix the underlying GitHub-App-install or auth issue). | `{ ok: false, reason: 'repo-unreachable', last_probe_error: '...' }`. | **REFUSE.** | N/A. |

**Why a 4-state model and not 3 + a boolean.** A common reflex would be `connected: bool` + `exists: bool`. We chose enum because the user's *intent* is what matters — picking 'create' is a deliberate signal that says "design this assuming we're building it net-new" which feeds the prompt pack, the workflow gate, and the fan-out scaffolding decision in three distinct layers. A boolean conflates intent with current state and forces every downstream consumer to re-derive intent. The enum makes intent explicit; everything downstream just reads it.

**Sample OKR demonstrates both paths.** The IMDB-Celebs OKR's `target_code_repos[]` will carry:
- `imdb-lite-app` → status `connected` (the existing app repo with the React UI) → brownfield ground on real code
- `celeb-api` → status `create` (the new microservice we're building) → greenfield design from PRD + mesh

The D12 E2E smoke validates this: chain shows ONE `code-design.md` with two distinct per-repo sections — one citing real file paths from `imdb-lite-app`, one carrying a scaffolding spec for `celeb-api`. `design-bus.yml` opens a landing issue in the existing `imdb-lite-app` and scaffolds-then-opens-issue for `celeb-api`.

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

Per-call: take ONE `target_code_repos[]` entry + its A12.v1.1 status; return a per-repo grounding payload. The Skill is the **single decision point** for brownfield-vs-greenfield: code-design-agent invokes it once per repo and branches its synthesis on the returned `mode`. Three response shapes:

**Brownfield (status `'connected'`):** Clone the repo (shallow, `--depth=1`) into a workflow-scoped tmpdir, run tree-sitter polyglot extraction (`tree-sitter-typescript`, `tree-sitter-python`, `tree-sitter-go`, etc.; lazy-loaded by detected primary language), return an `ObservedArchitecture` payload:

```json
{
  "ok": true,
  "mode": "brownfield",
  "repo": "imdb-lite-app",
  "observedArchitecture": {
    "modules": [/* per-file: path, language, exported_symbols, imported_symbols, layer */],
    "cross_module_calls": [/* approximate call graph; NOT type-resolved (LSP/SCIP-grade is v2, see futurethoughts §1) */],
    "exposed_interfaces": [/* REST (Express/Fastify/Hono/NestJS) / proto / GraphQL schemas */],
    "tests": [/* test-file inventory + assertion count per file */]
  }
}
```

**Greenfield (status `'create'`):** Skip clone. Optionally surface D5 reference-repos as exemplar grounding (if the mesh has configured reference-repos for the BAR's primary CALM layer). Return:

```json
{
  "ok": true,
  "mode": "greenfield",
  "repo": "celeb-api",
  "reason": "repo-status-create",
  "referenceRepos": [/* optional — from D5 knowledge-reference-repos; empty array if none configured */],
  "scaffoldingHints": {
    "suggestedLanguage": "typescript",     // derived from BAR's calm-node primary language
    "suggestedFramework": "express",        // derived from BAR's calm-node framework
    "seedFiles": ["README.md", "LICENSE", "package.json", "tsconfig.json", "src/index.ts", ".github/CODEOWNERS"]
  }
}
```

**Refuse (status `'not-connected'` or `'unreachable'`):** Hard-fail with a remediation hint so the agent stops cleanly:

```json
{
  "ok": false,
  "reason": "repo-not-connected" | "repo-unreachable",
  "repo": "...",
  "remediation": "Open Looking Glass → OKR detail → Target Code Repos and either click Connect Repo ↗ + flip to 'Connected', or change the status to 'Create' if this is greenfield."
}
```

**Deterministic per mode** — same `(repo URL, status, ref hash)` in → same JSON out. The agent uses this output as grounding evidence; reviewers cite it back in their structured reviews. The mode field threads through to `code-design.md`'s per-repo `addresses:` frontmatter so the audit chain records which repos were brownfield vs greenfield.

### D7 — `code-design-agent.yml` workflow

Per-agent pattern from B20. Three jobs:

- **dispatch** — fires on `issues.labeled` with label `oraculum-design`. Three prerequisite checks BEFORE assigning the agent (each emits a `state_transition` audit event recording the gate outcome):
  1. **HOW-requires-WHAT prereq:** `okrs/<id>/how/prd.md` must be merged on main (same pattern as B-PR4's HOW-requires-WHY). Soft-refuse with comment + close issue if missing.
  2. **Repo-status prereq (A12.v1.1):** Read `okrs/<id>/okr.yaml` → `objectiveAlignment.targetCodeRepoStatus`. For every entry in `targetCodeRepos[]`, status MUST be `'connected'` OR `'create'`. Any `'not-connected'` or `'unreachable'` entry blocks dispatch with a comment naming the offending repo(s) and linking to the Looking Glass repo-status picker. The agent NEVER runs against ambiguous repo intent.
  3. **Tier prereq:** Re-read the OKR's primary BAR tier (in case it changed since `Start What`). Restricted tier WITH `MAX_AUTO_ROUNDS=0` still dispatches but the audit-and-drift job will gate the merge.
- **audit-and-drift** — fires on `pull_request_target: labeled` with `design-draft`. Verifies: audit chain (B25); Knight's Seal (B27); evidence-honesty (`code-design.md`'s Hatter Tag declares `evidence_mode: code` AND ≥1 `knowledge-code` skill_call per `target_code_repos[]` entry, regardless of brownfield/greenfield mode — every repo MUST have been called); **per-repo mode honesty** (every per-repo section in `code-design.md` carries `mode: brownfield | greenfield` in `addresses:` frontmatter; the mode MUST match the `knowledge-code` response for that repo — agent can't claim brownfield grounding on a greenfield repo); structural correctness (10 H2 sections + per-repo subsections + `addresses:[FR-X, SR-Y]` frontmatter coverage); **Pocket Watch** (cosine OKR objective vs `code-design.md ## Problem Restatement`, threshold to calibrate in D-PR1 first run); **Caterpillar's Challenge** (cosine `code-design.md ## Approach` vs `prd.md ## Problem Statement`, threshold ≥ 0.70 — same as HOW's cross-phase drift); reviewer dispatch per D8 decision.
- **finalize** — fires on PR merge. Flips action.status to complete + meta.status `design-pending` → `shipped` (or `building` if WHAT triggers `design-bus.yml` next). Appends to `chain-ladder.yaml` (per B25 pattern) with `phase: what`, `parent_intent_thread = prd action's thread`. Triggers `design-bus.yml` fan-out per [Hand-off](#hand-off-per-repo-fan-out-from-mesh-to-code-repos-canonical) below.

### D8 — CLOSED 2026-05-23: persona-switch self-critique for code-grounded reviews

> **CLOSED 2026-05-23 (Bug V):** User confirmed persona-switch self-critique remains the model for **WHAT** as well as WHY + HOW. Option (a) is the chosen path. Options (b) and (c) are rejected — found less brittle to keep review contained with the author agent. The discussion below is preserved for historical context on the design space we explored.

Phase B's B24 collapsed PRD-time reviewers into single-agent self-critique because the author + reviewer read the same mesh state (no independent evidence surface). For WHAT, **code-grounding IS an independent axis** — the author + reviewer can read the code differently, the reviewer can run linters / `oasdiff` / pattern scans the author skipped. Three candidates were considered:

| Approach | How it works | Pro | Con | Status |
|---|---|---|---|---|
| **(a) Persona-switch self-critique** (B24 pattern carried forward) | code-design-agent inhabits architect + security personas after first-pass synthesis; tier-bound rounds. | Simplest. Reuses the proven B24 infrastructure. | Same agent reads the same `knowledge-code` outputs — "independent code-grounding" is *evidence available* but not *evidence revealed by a separate agent*. | **CHOSEN 2026-05-23** |
| ~~**(b) Per-reviewer tracking-issue dispatch**~~ | `code-design-agent.yml`'s audit-and-drift job opens a tracking issue with `agent_assignment: architect-reviewer` body extension. The reviewer runs in primary mode (full `tools:`), reads `knowledge-code` outputs fresh, posts a structured review back. Same for security. | Reviewers genuinely read code with fresh eyes. | Two extra agent dispatches per WHAT run. Tracking-issue noise. Risk of MCP failure modes. | **REJECTED 2026-05-23 (Bug V):** user confirmed persona-switch is the model for all phases including WHAT. |
| ~~**(c) Hybrid — self-critique by default, escalate to (b) on Restricted tier**~~ | Autonomous + Supervised tiers use (a); Restricted tier triggers separate reviewer agents via (b). | Cost-control for happy path; rigor where it matters. | Two code paths to maintain. | **REJECTED 2026-05-23 (Bug V):** same reason. |

**Decision:** Option (a) — persona-switch self-critique inside `code-design-agent`. Architect + Security personas in bounded rounds; per-persona/per-round signed `self_review` events on the audit chain; chain itself is the segregation evidence. No separate reviewer dispatch will be built.

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

**Fan-out execution (per target repo).** Two branches based on the repo's A12.v1.1 status carried through from `okr.yaml.objectiveAlignment.targetCodeRepoStatus` (the code-design merge step copies the snapshot into `okrs/<id>/what/design-fan-out-intent.yaml` so a post-merge edit to `okr.yaml` can't retroactively change the fan-out plan):

**A) Brownfield branch (status `'connected'`)** — repo exists; open the landing issue directly:

1. **Authenticate.** Uses the GitHub App's installation token for the target repo (NOT a long-lived PAT). If the App is missing from the install, mark `unreachable` (see partial-failure below).
2. **Render the landing-issue body** from the template above with all canonical markers populated.
3. **Open the issue** via `gh api repos/{owner}/{repo}/issues -X POST` with labels `oraculum-design-landing` + `okr-anchor`.

**B) Greenfield branch (status `'create'`)** — repo doesn't exist; scaffold it FIRST:

1. **Authenticate** with org-scoped permissions (GitHub App must have `administration: write` on the org for `repos/create`). If permission missing, mark `forbidden` (NEW status; see partial-failure table).
2. **Idempotent create** via `gh api orgs/{org}/repos -X POST -f name=<repo>` with `private=true`, `auto_init=false`, `has_issues=true`, `has_projects=false`, `has_wiki=false`, `visibility=internal` (or per-org default). If the create fails with 422 "name already exists," the repo was created out-of-band between A12.v1.1 status-set and fan-out — log a warning, fall through to step 4 (treat as brownfield from this point).
3. **Seed initial files** in a single squash-merged "seed commit" via `gh api repos/{owner}/{repo}/contents/<path>`:
   - `README.md` (carries the OKR-id + Hatter Tag continuation markers in HTML comments so this repo is greppable for its provenance from day one)
   - `LICENSE` (org-default; read from a mesh-side template if `.caterpillar/scaffolds/LICENSE` exists)
   - `.github/CODEOWNERS` (writes the OKR owner as the initial codeowner)
   - `.github/workflows/red-queen-bootstrap.yml` (a placeholder that prints a "this repo needs Red Queen-side governance scaffolding" notice; the actual Red Queen-side workflows land when the coding agent picks up the landing issue)
   - The per-repo subsection from `code-design.md` extracted as `docs/code-design-spec.md` so the landing issue's "Your slice" can link to a permanent file in the repo, not just the PR.
4. **Render the landing-issue body** with the scaffolding spec inlined.
5. **Open the issue** in the freshly-created repo via `gh api repos/{owner}/{repo}/issues -X POST` with labels `oraculum-design-landing` + `okr-anchor` + `greenfield-scaffold`.

**Both branches converge here:**

6. **Emit a `state_transition` audit event** in the mesh-repo audit log (per landing): `{event_kind: "state_transition", payload: {action: "design-fan-out", target_repo: "<slug>", mode: "brownfield" | "greenfield", landing_issue_url: "...", repo_created: bool, ok: true}}`. Use `audit-emit-event` Skill so the event is hash-chained — gives the cross-repo lineage a tamper-evident record. The `mode` + `repo_created` fields let auditors distinguish "we created this repo for this OKR" from "this OKR augmented an existing repo."
7. **Record per-repo result** in `okrs/<id>/what/design-fan-out.yaml` (NEW file, written by the workflow):

```yaml
# Per-repo fan-out result. One entry per target_code_repos[] entry.
# Written by design-bus.yml on code-design PR merge.
fan_out:
  - repo: celeb-api
    mode: greenfield                 # A12.v1.1 status 'create' — scaffolded by this run
    repo_created: true               # NEW — true if design-bus created the repo
    landing_issue_url: https://github.com/.../celeb-api/issues/1
    seed_commit_sha: a1b2c3d4...     # NEW — sha of the seed commit for the new repo
    status: opened
    fanned_at: 2026-05-21T14:23:00Z
  - repo: imdb-lite-app
    mode: brownfield                 # A12.v1.1 status 'connected' — pre-existing
    repo_created: false
    landing_issue_url: https://github.com/.../imdb-lite-app/issues/42
    status: opened
    fanned_at: 2026-05-21T14:23:02Z
  - repo: imdb-identity
    mode: brownfield
    repo_created: false
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

**Partial-failure handling.** Greenfield adds two new failure modes: repo-creation can fail (`scaffold-failed`) and seed-commit can fail mid-flight (`scaffold-partial` — repo exists but isn't fully seeded). Both surface for human triage, never auto-retry, and DO NOT leave the OKR in `shipped` state.

| Outcome | Per-repo status | Mode-specific reason | Parent code-design PR label | Looking Glass UX |
|---|---|---|---|---|
| All N fan-outs opened | `opened` for all | — | none | Stage 5 card shows ✓ on every target-repo row |
| Some open, some fail | mix of `opened` / `unreachable` / `forbidden` / `scaffold-failed` / `scaffold-partial` | varies | `design-fan-out-partial` (color `F59E0B`) | Stage 5 shows ✗ on failed rows + a "Retry fan-out" affordance per failed repo |
| All fail | all `unreachable` / `forbidden` / `scaffold-failed` | varies | `design-fan-out-failed` (color `D32F2F`) | Stage 5 blocks the OKR from advancing to `shipped`; user must fix App install / org-admin permissions / `target_code_repos[]` entries |
| Greenfield-specific: repo exists but seed-commit partial | `scaffold-partial` | `seed-commit-failed-mid-flight: <step>` | `design-fan-out-partial` + `greenfield-scaffold-partial` | Stage 5 row offers "Resume scaffold" affordance (re-runs the seed step idempotently); landing issue is NOT opened until scaffold completes |

The fan-out NEVER auto-retries on its own — failures are surfaced for human triage. Re-triggering happens via the Looking Glass "Retry fan-out" button (re-runs the fan-out step but ONLY for entries with non-`opened` status).

**Tier gating on the receiving end.**

If the target repo's primary BAR is Restricted-tier, `design-bus.yml` still opens the landing issue but adds the label `needs-human-review` + posts a comment explaining the tier gate. The coding agent in that repo can ALSO refuse to auto-assign on Restricted (its own validate_action gate); the design-bus side is best-effort attribution, not a replacement for the receiving repo's gate.

**Out of scope.** Anything that happens *inside* the target repo's coding agent — its `validate_action` decisions, its CALM-flow constraints, its security-critical-path locks. That story lives in The Red Queen's design doc.

---

**Companion docs:** [agentic-sdlc.md](agentic-sdlc.md) (index) · [marketresearcher](agentic-sdlc-marketresearcher.md) · [prd](agentic-sdlc-prd.md) · [futurethoughts](agentic-sdlc-futurethoughts.md)
