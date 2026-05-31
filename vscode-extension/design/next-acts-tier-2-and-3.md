# Next acts -- Tier 2 (BUILD fan-out, shipped) + Tier 2.5 (Queen's Next Act) + Tier 3 (auditor hardening)

> **Purpose of this doc.** Captured 2026-05-25 as the personal context page for "what is queued after Phase A-E shipped." Phases A, B, C, D, E are honestly complete in code (see [`agentic-sdlc.md`](agentic-sdlc.md) lead paragraph). The live cert-run on `OKR-2026Q2-IMDB-001-celeb-api` exported a whole-OKR rollup with verdict `✅ PASS -- All 3 phases present, runner-verified, and source-atomic`. The onboarding pack landed under `site-tw/public/docs/onboarding/` and the marketing page now points at it.
>
> **Revised 2026-05-25 (this pass).** Tier 2 was reframed away from a workflow-centric `design-bus.yml` design toward an **app-orchestrated fan-out engine in Looking Glass**, after a code review surfaced three things: (1) `design-bus.yml` is not deployed today and is explicitly pruned as deprecated when present ([codeRepoTemplates.ts:561 misleading comment + line 594 active entry](../src/templates/codeRepoTemplates.ts)); (2) the canonical agent-dispatch primitive is already in the app via `assignCustomCopilotAgent` ([GitHubService.ts:601](../src/services/GitHubService.ts)) and is already used for OKR phase dispatch ([LookingGlassPanel.ts:2197](../src/webview/LookingGlassPanel.ts)); (3) Cheshire already owns the per-repo scaffold (alice-remediation.yml, CodeQL, CI, prompt packs, Red Queen governance files, git init, repo create/push) at [ScaffoldPanel.ts:280,374](../src/webview/ScaffoldPanel.ts). The right architecture is: **app-orchestrated fan-out + Cheshire-owned scaffold + custom-agent assignment for dispatch + topological dependency gating before any landing issue is created**.
>
> **Codex review absorbed (this pass).** A second-pass review of the WHY/HOW/WHAT prompt family surfaced four findings that change D-PR4-prep's scope: (a) [`code-design-agent.agent.md:38`](../code-templates/agents-v4/code-design-agent.agent.md) and line 268 still frame fan-out as `design-bus.yml`-driven and need rewriting to the app-orchestrated model (greenfield through Cheshire, brownfield requiring harness pre-flight); (b) [`synthesis.md:423`](../prompt-packs/looking-glass/code-design/synthesis.md) has the Hatter Tag's `chain_root_hash` at top-level but the agent prompt requires nested `audit.chain_root_hash` (3-layer drift in the making, same shape as Bug M / Bug AA); (c) the existing sample WHAT artifact carries `<!-- Rev 2... -->` process residue and models `202 manual-review_required` as an `ApiError` (today's prompt forbids this), so the sample needs a fresh WHAT run after the prompt updates; (d) the existing sample PRD cites an undefined `C3` in FR-05 and has `/tmp/prd-run/...` references (the current PRD prompt now forbids temp paths). D-PR4-prep now ships fixes (a)+(b) and includes a sample-OKR WHAT regeneration as its validation step. A pre-D-PR4-prep HOW regeneration is recommended-but-optional for cleanest baseline. WHY is healthy and can stay.
>
> From here, the tracks:
>
> - **Tier 2 -- BUILD fan-out -- ✅ SHIPPED.** The cross-repo hand-off from WHAT (mesh-side code-design merge) to implementation PRs in target code repos is complete. All seven work items landed: D-PR3 (reference-repos Skill), D-PR4-prep (coordination contract in code-design), D-PR4 (app-side fan-out engine), D-PR5 (Stage 5 card), D-PR6 (E2E smoke), D-PR7 (implementation-agent template), D-PR8 (implementation chain in rollup). Post-cert hardening (six fixes found during cert testing 2026-05-30) is captured at the end of the Tier 2 section.
> - **Tier 2.5 -- Queen's Next Act (complete the Red Queen enforcement chain + guard the evidence boundary) -- 🟡 IN PROGRESS — slice (a) ✅ SHIPPED + cert-verified (celeb-api PR #14); (b)(c)(d) next.** Everything that finishes the Red Queen's evidence story, in four slices: **(a)** sign the enforcement chain -- the impl-provenance gate Tier 2 shipped already READS the Red Queen decision log (`rq_present`/`rq_allowed`/`rq_denied`), but that log is unsigned plain JSONL; fold those action-time allow/deny/override decisions into the same per-event Ed25519 chain a Hatter rollup verifies; **(b)** the `redqueen-action` standalone hard gate (AST semantic diff + contract diffs); **(c)** cross-chain inclusion proofs + SIEM/CloudEvents export; **(d)** Oracle Guardrails + Privacy Rails for skills and audit evidence. Slice (a) is the MVP and rides the seam Tier 2 built (promoted from the old T3-2); slice (d) is the next protection layer for STRIDE EoP / information-disclosure risks at the skill boundary. See the Tier 2.5 section below.
> - **Tier 3 -- auditor hardening.** Pure trust-posture / chief-auditor work from the seven Codex review rounds during Phase E: cosign-anchored signing (Knight's Seal v2), redacted external bundles, prompt-pack signature verification, org-separation on dual signature. No Red Queen enforcement work lives here -- that all moved up to Tier 2.5 (Queen's Next Act).
>
> Tier 1 is closed: live cert-run + onboarding pack. Tier 2 is shipped. This doc enumerates the Tier 2 record, the Tier 2.5 next act, and Tier 3.

---

## Where we stand (2026-05-25)

| Tier | Status | Done-done definition |
|---|---|---|
| **Tier 1** | ✅ shipped | Live whole-OKR cert run on `OKR-2026Q2-IMDB-001-celeb-api` returns `VERDICT: ✅ PASS`; onboarding pack live at [`/docs/onboarding/`](../site-tw/public/docs/onboarding/index.md); marketing page strengthened with the actual PASS rollup specifics. |
| **Tier 2** | ✅ shipped | The fan-out pipeline D-PR3..D-PR8 all landed; the cert run exists. IMDB-Celebs sample OKR walks the whole way: WHY → HOW → WHAT → fan-out (with `depends_on` topological ordering) → implementation PRs landing in dependency waves → whole-OKR rollup `VERDICT: ✅ PASS` with the implementation chain rollup section populated. Three target repos cover the matrix: one brownfield-with-harness, one brownfield-needing-retrofit (manual prompt), one greenfield (auto-scaffold via Cheshire). Post-cert hardening (2026-05-30) captured at the end of the Tier 2 section. |
| **Tier 2.5 -- Queen's Next Act** | 🟡 in progress | **(a) ✅ SHIPPED + cert-verified (celeb-api PR #14):** the finalize-time signer seals the PREFIX of the action-time allow/deny/override decision log (covered bytes + sha256) onto the same per-event Ed25519 implementation chain; the impl-provenance gate re-hashes that prefix at the merge SHA, **gates on a mismatch**, and names the post-seal tail as advisory; the rollup re-verifies independently. **(b)** `redqueen-action` standalone hard gate (AST + contract diffs) — queued; **(c)** cross-chain inclusion proofs + SIEM/CloudEvents export — queued; **(d)** Oracle Guardrails + Privacy Rails — queued. |
| **Tier 3 -- auditor hardening** | 🚧 queued | (a) Knight's Seal v2 third-party verifiable via cosign; (b) one-button redacted export bundle for regulators; (c) prompt-pack signature verification on load; (d) org-separation enforced on dual-signature override. Pure trust-posture; no Red Queen enforcement work. |

The single canonical reference is [`agentic-sdlc.md`](agentic-sdlc.md). Everything below should be read alongside it.

---

## Index -- where each open item is tracked

Single source of truth for what's open. When an item ships, flip it here AND in the threat model + roadmap + CLAUDE.md (nothing auto-syncs).

| Item | This doc | Threat model (`agentic-sdlc-governance.md`) | Roadmap (`agentic-governance-roadmap-2026.md`) | CLAUDE.md / Marketing |
|---|---|---|---|---|
| **Signed Red Queen enforcement chain** ✅ **SHIPPED** (cert-verified PR #14) | Tier 2.5 · slice (a, MVP) | STRIDE card now `✓ Shipped` + proof card updated | Gap 1 (SIEM) + Gap 13 (`redqueen-action`) still open | CLAUDE.md shipped; `red-queens-court.md` card `Shipped` |
| **`redqueen-action` standalone hard gate (AST diff / contract diffs)** | Tier 2.5 · slice (b) | — | Gap 13 / "Phase 9" | CLAUDE.md "Planned 🚧" |
| **Cross-chain inclusion proofs + SIEM/CloudEvents export** | Tier 2.5 · slice (c) | — | Gap 1 | CLAUDE.md "Planned 🚧" |
| **Oracle Guardrails + Privacy Rails for skills/audit** | Tier 2.5 · slice (d) | EoP + Info Disclosure rows; ASTRIDE prompt-injection / memory-poisoning controls | Gap (harness) + privacy/audit-retention hardening | Marketing pages should explain "Red Queen governs actions; Oracle Rails govern evidence entering the chain" once shipped |
| **Knight's Seal v2 (cosign/sigstore)** | Tier 3 · T3-1 | "Repudiate" row (persistent verifiability "next act") line ~1505 | Gap 8 | — |
| **Redacted external bundle** | Tier 3 · T3-3 | Info-disclosure `⚠` line ~1508 + proof card ~1457 | Gap 11 | — |
| **Prompt injection / sanitization** | Tier 2.5 · slice (d) | EoP `⚠` line ~1513; ASTRIDE | Gap (harness) | — |

---

## Tier 2 architecture -- five key calls

Read these before any work item. They are the decisions that drove the seven-item shape.

### 1. App-orchestrated fan-out, not workflow-orchestrated

**Decision.** Fan-out is a Looking Glass panel responsibility. There is no `design-bus.yml` workflow. The user clicks a "Fan out" button on the OKR detail after the code-design PR merges; the extension does the work.

**Why.** Greenfield scaffolding goes through Cheshire which is local-only (a VS Code panel, not a runner). Routing scaffold through GH Actions would mean re-implementing it on the workflow side. The extension already has the dispatch primitives (`assignCustomCopilotAgent`, `onOpenRepoInContext`, `ScaffoldPanel.createOrShow`, `MeshBranchGuard`) and the user is at the panel anyway. Workflow execution would also lose the rich per-row remediation UX (retry, edit-before-create, escalate-then-retry).

**Code references.** [`LookingGlassPanel.ts:2197-2234`](../src/webview/LookingGlassPanel.ts) for the existing custom-agent dispatch pattern; [`LookingGlassPanel.ts:5278-5347`](../src/webview/LookingGlassPanel.ts) for the existing repo-clone + add-to-workspace flow.

### 2. Custom-agent assignment owns dispatch, not a workflow YAML

**Decision.** The implementation agent is dispatched by calling `assignCustomCopilotAgent(owner, repo, issueNumber, 'implementation-agent', { customInstructions: <per-OKR context>, baseBranch: 'main' })`. There is no `.github/workflows/implementation-agent.yml`. The target repo only needs `.github/agents/implementation-agent.agent.md` installed by Cheshire scaffold.

**Why.** The custom-agent API ([`GitHubService.ts:601`](../src/services/GitHubService.ts)) is the actual GitHub primitive for picking which `.agent.md` Copilot Coding Agent loads. `agent_assignment.custom_instructions` is the "additional data" channel for per-dispatch context. Fallback is generic Copilot + `@copilot use agent <name>` comment (also already wired). A workflow YAML would duplicate functionality the API already provides.

### 3. Cheshire owns scaffold; retrofit stays user-managed

**Decision.** Cheshire's existing scaffold panel ([`ScaffoldPanel.ts:280,374`](../src/webview/ScaffoldPanel.ts)) is the source of truth for everything in `.github/`, `.cheshire/`, the CI workflows, the Red Queen governance files. The fan-out engine never writes scaffold files; it only orchestrates *when* Cheshire runs.

- **Brownfield-with-harness.** Pre-flight detects `.github/agents/implementation-agent.agent.md` present → fan-out proceeds to dispatch.
- **Brownfield-needing-retrofit.** Pre-flight detects harness missing → fan-out **refuses** with a "Open repo in workspace + run Scaffold to add missing files" message. User runs the existing Cheshire scaffold flow themselves and merges that PR. Re-runs fan-out pre-flight on the OKR card -- repo flips to ready, fan-out unblocks for that row.
- **Greenfield.** Fan-out creates the repo via `gh api orgs/{org}/repos`, clones empty repo locally, adds to workspace via `vscode.workspace.updateWorkspaceFolders` (same pattern as `onOpenRepoInContext`), launches Cheshire with the new repo selected + an OKR-context flag so Cheshire seeds `docs/code-design-spec.md` from the per-repo extract. User clicks scaffold; after scaffold writes complete, fan-out picks up where it left off and creates the landing issue.

**Why.** Cheshire is the existing, working primitive for scaffold. Reusing it preserves a single source of truth for what "the harness" is. The user is in control of when scaffold runs against an existing repo (no surprises in someone else's brownfield repo).

### 4. Topological dependency gating from day one

**Decision.** Landing issues are created in dependency-ordered waves. Repos with no unmerged dependencies fan out immediately; downstream repos stay in `pending-on-upstream` state in `design-fan-out.yaml` and only get their landing issue when their dependencies merge. Stage 5 card watches upstream PR merges and creates the next wave's landing issues automatically.

**Why.** Pure-parallel + mock-and-revise (my earlier draft) ships mocks to main, which is wrong. Topological ordering means when an impl agent runs, its dependencies are real, not mocked. Cleaner audit chain (no mid-flight revises), no mocks-in-main risk, natural backpressure. The "parallelism loss" is small for typical OKRs (depth 1-2); genuinely independent slices still fan out simultaneously because they have no `depends_on` between them.

**Cost.** `depends_on` must be produced by WHAT (the code-design phase) before fan-out can read it. That is D-PR4-prep.

### 5. `design-fan-out.yaml` is the Tier 2 audit record, not a signed event

**Decision.** For Tier 2 MVP, the per-landing audit trail is the git history of `okrs/<id>/what/design-fan-out.yaml` in the mesh repo. Every fan-out write is a **direct commit to `main`**, protected by `MeshBranchGuard` ([`MeshBranchGuard.ts:12`](../src/services/MeshBranchGuard.ts)) -- a fail-closed local-branch guard that refuses the write if the user's local checkout is not on `main` (three discriminated failure modes: `wrong-branch-clean`, `wrong-branch-dirty`, `wrong-branch-divergent`, each with a recovery UI). This matches the existing extension write pattern for Start/Reset/Redeploy/finalize. A PR-per-write would add user-friction in the middle of orchestration and is not warranted for Tier 2 MVP. No new event kind is emitted from the app.

**Why.** I previously wrote "signed `state_transition` event per landing." That is wrong. `state_transition` is workflow-owned and unsigned by contract ([`audit-emit-event/SKILL.md:26`](../code-templates/skills/audit-emit-event/SKILL.md), [`skills.ts:1875`](../../packages/research-runner/src/runner/skills.ts) `EVENT_KIND_ORIGIN`). The app cannot legitimately emit it. Inventing a new app-emitted event kind for the MVP is too much surface area to design correctly under deadline pressure.

**Future option.** When the trust posture for app-side events needs a real chain entry (likely alongside T2.5 Red Queen integration), add a new event kind `fan_out_recorded` with `origin: app` and a real emitter contract in `EVENT_KIND_ORIGIN`. Reserved here; not built.

---

## Tier 2 · BUILD fan-out next-act

Seven work items. Sequencing recommendation at the bottom of the doc.

### ✅ D-PR3 · `knowledge-reference-repos` Skill (greenfield exemplar grounding)

- **Goal.** Add an optional PURE-data Skill that clones + indexes a per-mesh-configured list of "patterns we want the agent to honor" from `mesh/.caterpillar/reference-repos/`. Tree-sitter polyglot extraction; same data model as D6 `knowledge-code` but with `reference: true` so the agent treats them as exemplars, not edit targets.
- **Why.** Greenfield WHAT runs have no in-repo grounding. Either the agent invents from prompt-pack alone (low quality, no architectural anchor), or the team configures a curated list of "build this like that auth service" exemplars. D-PR3 is the second option.
- **Acceptance.** Sample OKR on a greenfield BAR runs `code-design-agent`; `knowledge-reference-repos` is invoked once per configured reference-repo; the resulting `code-design.md` cites at least one pattern from a reference-repo with the exact file path it observed; audit chain shows the `knowledge-reference-repos` `skill_call` event with the cloned repo SHAs in payload.
- **Files to touch.**
  - `packages/research-runner/src/skills/knowledge-reference-repos.ts` (NEW; mirrors `knowledge-code.ts` shape with `reference: true`)
  - `packages/research-runner/src/skills/__tests__/knowledge-reference-repos.test.ts` (NEW)
  - [`vscode-extension/src/templates/meshSkills.ts:103`](../src/templates/meshSkills.ts) -- add the new skill to the `MESH_SKILLS` registry so Cheshire deploys the SKILL.md to mesh repos
  - [`vscode-extension/code-templates/agents-v4/code-design-agent.agent.md`](../code-templates/agents-v4/code-design-agent.agent.md) -- add `knowledge-reference-repos` to the agent's `tools:` list (direct edit; no registry indirection)
  - `vscode-extension/src/templates/codeRepoTemplates.ts` -- `.caterpillar/reference-repos/` seed README + example
  - `vscode-extension/design/agentic-sdlc-codedesigner.md` D5 -- mark shipped + add the call-site contract
- **Design docs to read first.**
  - [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D5 (spec) + D6 (shape mirror) + the "Brownfield vs Greenfield branching (canonical)" section.
  - [`agentic-sdlc.md`](agentic-sdlc.md) §6 Skill catalogue + §11.2 audit event shape.
- **Dependencies.** None. Independent of every other Tier 2 item. Can be built in parallel with D-PR4-prep as a first-wave commit.
- **Hardening lessons to apply.**
  - **Deterministic** per `(repo URL, ref hash)` -- same input → same JSON out. No clock, no env reads except `cwd`.
  - **Discriminated-union return shape** like D6: `{ ok: true, mode: 'reference', repos: [...] }` | `{ ok: false, reason: 'mesh-has-no-reference-repos' | 'clone-failed' | ... }`. Don't silently return empty array on failure; name the gap.
  - **Suppress-non-canonical** -- if a reference-repo's clone partially fails, the per-repo entry gets `status: 'fetch-error', reason: '<git stderr>'` rather than being omitted.
- **First-commit suggestion.** Skill scaffold + 5 unit tests against an in-memory fixture (mock the clone). One acceptance test against a fixture reference-repo committed to `__fixtures__/`. NO live network in CI.

### ✅ D-PR4-prep · WHAT prompt-family fixes + Cross-repo coordination contract (extends shipped Phase D agent)

- **Goal.** Extend the already-shipped `code-design-agent` so the merged `code-design.md` carries machine-readable cross-repo coordination data, AND ship two pre-existing prompt-family bugs Codex surfaced in the same commit. Without the coordination contract, fan-out has nothing to read for topological ordering. Without the prompt-family fixes, the next sample WHAT run drifts the same way the cert-run-5 series did.
- **Why.** Topological gating (Tier 2 key call #4) requires `depends_on` per target repo. The design phase is where the agent has the full cross-repo picture. The two prompt bugs (a) frame fan-out as workflow-driven (`design-bus.yml`) which contradicts the app-orchestrated architecture this whole Tier 2 sits on, and (b) demonstrate a top-level `chain_root_hash` in the synthesis-pack Hatter Tag block while the agent prompt requires nested `audit.chain_root_hash` -- exactly the 3-layer drift class Bug M / Bug AA closed last cycle.

#### Sub-tasks (ship together; gated by sample-OKR WHAT regeneration)

**4-prep.1 -- Rewrite the design-bus.yml language in the code-design agent**
- [`code-templates/agents-v4/code-design-agent.agent.md:38`](../code-templates/agents-v4/code-design-agent.agent.md) reads: *"the per-repo coding agents (Red Queen-side, out of your scope) execute when the `design-bus.yml` fan-out opens landing issues in each target repo."* Rewrite to: *"the per-repo coding agents (Red Queen-side, out of your scope) execute when **Looking Glass fan-out** opens landing issues in each target repo. Greenfield repos are scaffolded through Cheshire first; brownfield repos require the agentic harness pre-flight check to pass before fan-out."*
- [`code-templates/agents-v4/code-design-agent.agent.md:268`](../code-templates/agents-v4/code-design-agent.agent.md) reads: *"The finalize workflow then triggers `design-bus.yml`, which fans out to per-repo landing issues..."* Rewrite to: *"The user clicks `Fan out N of M ready repos` in Looking Glass after pre-flight passes. The fan-out engine creates landing issues in topological order based on the §10 coordination block. Brownfield repos with the harness already installed dispatch directly; brownfield repos without the harness require the user to retrofit via Cheshire's Scaffold flow first; greenfield repos route through Cheshire greenfield mode (create + clone + add-to-workspace + scaffold) before the landing issue opens."*
- No separate mirror needed -- the file at `code-templates/agents-v4/code-design-agent.agent.md` IS the source of truth that Cheshire's `readAgentTemplate()` at [`meshSkills.ts:73`](../src/templates/meshSkills.ts) reads directly. (Older drafts of this doc referenced an `agentTemplates.ts` indirection that does not exist; ignore.)

**4-prep.2 -- Fix the Hatter Tag mismatch in the synthesis pack**
- [`prompt-packs/looking-glass/code-design/synthesis.md:423`](../prompt-packs/looking-glass/code-design/synthesis.md) shows `chain_root_hash` at the top level of the Hatter Tag YAML block. Move it to nested under `audit:` so it matches the contract the agent prompt + workflow extractor + Bug AA closeout established:
  ```yaml
  ---
  phase: what
  okr_id: <OKR-id>
  intent_thread_uuid: <...>
  parent_intent_thread: <...>
  governance_tier: <...>
  author_did: did:github:copilot-swe-agent
  reviewer_dids: []
  evidence_mode: code
  audit:
    chain_root_hash: <YOU paste the REAL event-1 hash here -- see below>
  ---
  ```
- Update the surrounding prose ("Bug L closeout" block + Knight's Seal callout) to reflect the nested path.
- Sweep the rest of the synthesis pack for any other top-level `chain_root_hash` references; verify the agent prompt's Hatter Tag instructions already use nested (Codex confirmed agent prompt is correct).

**4-prep.3 -- Add the coordination contract to the WHAT artifact**

Each per-repo section in §1 (frontmatter) extends with:
```yaml
fanout_wave: 1
coordination_role: provider | consumer | independent | foundation
depends_on: []
provides: []
consumes: []
```

A new H3 subsection `### Cross-Repo Fan-Out & Dependency Ordering` lives inside the existing canonical §10 *Design Rationale & Research Traceability* (the workflow expects EXACTLY 10 H2 sections per [`synthesis.md:133`](../prompt-packs/looking-glass/code-design/synthesis.md); do NOT add an 11th). The subsection carries human-readable rationale + a coordination YAML block, using Codex's exact schema:

```yaml
coordination:
  - repo: AliceNN-ucdenver/celeb-api
    fanout_wave: 1
    coordination_role: provider
    depends_on: []
    provides:
      - contract: GET /api/celebs/:id
        consumed_by:
          - AliceNN-ucdenver/imdb-react-frontend
        readiness: must merge before consumers
    consumes: []
    rationale: Creates the celebrity profile API consumed by the frontend.

  - repo: AliceNN-ucdenver/imdb-react-frontend
    fanout_wave: 2
    coordination_role: consumer
    depends_on:
      - AliceNN-ucdenver/celeb-api
    provides: []
    consumes:
      - contract: GET /api/celebs/:id
        from: AliceNN-ucdenver/celeb-api
        required_for:
          - FR-01
          - FR-03
          - FR-04
    rationale: Consumes the profile endpoint and renders identity/provenance state.
```

The agent prompt for §10 must state the seven rules (Codex's list, verbatim):

1. Every `targetCodeRepos[]` repo appears exactly once in the coordination YAML.
2. `depends_on` can only reference another target repo.
3. No dependency cycles.
4. `fanout_wave: 1` means no dependencies. Wave 2+ means every dependency is in an earlier wave.
5. If a repo consumes a contract from another target repo, it must list that repo in `depends_on`.
6. Do not ship production mocks to main. Tests may mock dependencies, but implementation fan-out waits until provider repos land.
7. If ordering is uncertain, mark the repo `independent`, explain why, and do NOT invent a dependency.

**4-prep.4 -- Add the coordination verifier to the audit gate**

The `code-design-agent.yml` workflow's audit-and-drift job parses the new coordination block **using a real YAML parser** (not regex) for both per-repo §1 frontmatter and the §10 `### Cross-Repo Fan-Out & Dependency Ordering` H3 block. `provides` and `consumes` are nested arrays of objects with `contract`, `consumed_by`, `from`, `required_for` keys -- regex parsing would either reject valid YAML or accept invalid YAML silently. The verifier shells out to `yq` (already a workflow dependency) or runs a Python step that uses `PyYAML` (already in workflow runners by default).

The verifier fails `structure-invalid` when (the original 5 from Codex's first pass + 2 more from the second-pass review):

1. A target repo is missing from coordination.
2. An unknown repo appears in `depends_on`.
3. A cycle exists (Kahn's-algorithm detection).
4. `fanout_wave` does not match the topological sort (i.e., a wave-N repo has a dependency in wave-≥N).
5. A `consumes.from` target is not listed in `depends_on`.
6. **`fanout_wave` is non-minimal.** Wave MUST equal `1 + max(dep.fanout_wave)`. No-dependency repos MUST be wave 1. Without this, you can have an acyclic YAML where everything is "wave 5" and topological sort technically passes but the wave numbering is meaningless.
7. **Contract reciprocity broken.** For every `provides.consumed_by: [<consumer-slug>]` entry, the consumer's `consumes.from: <provider-slug>` MUST reference the same provider for the same contract. Otherwise the YAML can claim "A provides X to B" while B's consumes list omits X -- acyclic but misleading.

Each failure mode emits a distinct named reason:

- `coordination-missing-repo:<slug>`
- `coordination-unknown-dep:<slug>→<unknown>`
- `coordination-cycle:[a→b→c→a]`
- `coordination-wave-mismatch:<slug>@wave=N deps-in-wave=M`
- `coordination-consumes-not-in-depends:<slug>→<from>`
- `coordination-wave-nonminimal:<slug>@wave=N expected=M`
- `coordination-contract-mismatch:<provider>→<consumer>:<contract>`

No silent fallback; no collapse to a generic "failed."

**4-prep.5 -- Validation: regenerate WHAT on a NEW Tier 2 smoke OKR**

`OKR-2026Q2-IMDB-001-celeb-api` is preserved as the **Phase E planning-cert proof**. Its rollup with the residue Codex flagged is the historical record of what shipped in Phase E; we do NOT reset or regenerate it. Tier 2 work happens on a NEW OKR purpose-built to exercise the fan-out matrix.

Create `OKR-2026Q3-IMDB-002-<feature-name>` (final id TBD; suggested feature: a small profile-or-search slice that naturally touches 3 repos). Target repos sized to cover the matrix:

- One **brownfield-with-harness** (e.g., `imdb-react-frontend` if Cheshire scaffold has already added the harness to it; otherwise pick another already-harnessed repo)
- One **brownfield-needs-retrofit** (a repo Cheshire has NOT yet scaffolded -- pre-flight should detect harness missing and deflect to "open in workspace + run Scaffold")
- One **greenfield** (a new repo slug that does not yet exist -- pre-flight should detect this and route through Cheshire greenfield mode)

Topology should be linear (foundation → consumer → consumer-of-consumer) so Stage 5 auto-advance has a clear chain to walk. Concrete suggestion: rename pieces to fit the 3-target-repo story.

After 4-prep.1 through 4-prep.4 ship in templates + workflow + extension code, AND the new OKR card is created:

- Mesh redeploy on the sample OKR's mesh repo (`alicenn-ucdenver-governance-mesh`).
- Click `Start Why` → `Start How` → `Start What` on the new OKR. (If keeping HOW fast, fork the existing OKR's PRD as the seed and let HOW just verify; otherwise do a clean WHY+HOW run too.)
- Verify the WHAT artifact: (a) no `design-bus.yml` references in the artifact body; (b) Hatter Tag has nested `audit.chain_root_hash`; (c) §10 contains `### Cross-Repo Fan-Out & Dependency Ordering` with valid coordination YAML covering all 3 target repos; (d) per-repo §1 frontmatter has `fanout_wave` / `coordination_role` / `depends_on` / `provides` / `consumes`; (e) workflow audit-and-drift passes all 7 verifier conditions; (f) no `<!-- Rev 2... -->` residue; (g) no `202 manual-review_required` modeled as `ApiError`; (h) contract reciprocity holds across the linear chain.
- Commit the new sample OKR + its regenerated artifacts to the mesh repo. This becomes the input for D-PR4 + D-PR6.

**4-prep.6 (optional, recommended) -- Regenerate HOW on the new OKR for cleanest baseline**

Codex notes the existing PRD cites undefined `C3` in FR-05 and has `/tmp/prd-run/...` references. The current PRD prompt already forbids temp paths and requires `[SCRE]-N` definitions for every cite (Bug LL). The new OKR's HOW will pick up the current PRD prompt's hardenings automatically -- so a clean HOW run on the new OKR is essentially free. Do it before WHAT runs so WHAT's cosine baseline is clean too.

#### Files to touch

- [`vscode-extension/code-templates/agents-v4/code-design-agent.agent.md`](../code-templates/agents-v4/code-design-agent.agent.md) -- 4-prep.1 (lines 38, 268 direct edits) + 4-prep.3 (coordination section prompt + frontmatter fields + seven rules). **This is the source file; there is no separate `agentTemplates.ts` indirection.** Cheshire reads agent prompts via [`meshSkills.ts:73`](../src/templates/meshSkills.ts) `readAgentTemplate()` which pulls directly from `code-templates/agents-v4/<name>.agent.md`.
- [`vscode-extension/prompt-packs/looking-glass/code-design/synthesis.md`](../prompt-packs/looking-glass/code-design/synthesis.md) -- 4-prep.2 (line 423 Hatter Tag + surrounding prose) + 4-prep.3 (synthesis instructions for coordination block)
- [`vscode-extension/code-templates/workflows/code-design-agent.yml`](../code-templates/workflows/code-design-agent.yml) -- 4-prep.4 (audit-and-drift coordination verifier with the 7 named failure reasons; YAML parser, not regex). **This is the source file for the workflow; [`codeRepoTemplates.ts:440`](../src/templates/codeRepoTemplates.ts) `generateCodeDesignAgentWorkflow` reads it via `readScaffoldFile`. There is no separate `meshWorkflowTemplates.ts`.**
- [`vscode-extension/src/types/phaseSpec.ts`](../src/types/phaseSpec.ts) + [`phaseSpec.test.ts`](../src/types/__tests__/phaseSpec.test.ts) -- extend WHAT spec with the new verifier contract; ensure REQUIRED_H2 stays at 10
- New test surface: `vscode-extension/code-templates/workflows/__tests__/coordinationVerifier.test.ts` (or wherever workflow tests live in this repo's structure) -- pure-function tests over YAML fixtures, ≥10 cases
- [`vscode-extension/design/agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) -- document the coordination subsection contract as a v1.x extension to D-PR1
- Sample mesh: `okrs/<new-Tier-2-smoke-OKR-id>/what/code-design.md` -- regenerated artifact committed to the mesh repo (see 4-prep.5 below for OKR strategy; do not touch the historical `OKR-2026Q2-IMDB-001-celeb-api` Phase E rollup)

#### Design docs to read first

- This doc's **Tier 2 architecture** section (the five key calls) -- especially #4 (topological gating).
- [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D7 + the H2 verifier section in the workflow spec (so you know what shape NOT to break).
- [`agentic-sdlc.md`](agentic-sdlc.md) §13 D-PR1.v1.x + Bug M + Bug AA bug logs for the pattern of "extend the shipped agent" + "fix 3-layer drift" commits.
- [`audit-event-shape.md`](audit-event-shape.md) -- frontmatter conventions for per-repo blocks; Bug AA closeout on nested `audit.chain_root_hash`.
- [`synthesis.md:133`](../prompt-packs/looking-glass/code-design/synthesis.md) -- the canonical 10-H2 contract (don't add an 11th).

#### Dependencies

None. Independent. **First commit of Tier 2** because fan-out cannot be trustworthy without it AND the WHAT prompt-family bugs need to land before the next sample regeneration.

#### Hardening lessons to apply

- **Do not change the canonical 10 H2s.** New content goes in frontmatter + H3 subsection inside §10. Confirmed by checking [`synthesis.md:133`](../prompt-packs/looking-glass/code-design/synthesis.md) and `phaseSpec.test.ts:402-413`'s REQUIRED_H2 contract -- touching that list reopens 50+ tests' worth of risk.
- **YAML parse failure is a hard gate.** If the coordination block fails to parse OR fails any of the 7 verifier conditions, the workflow rejects the design PR with the discriminated named reason. No silent fallback.
- **Discriminated rejection reasons** (7 conditions, named individually per 4-prep.4). Each maps to a distinct fix path.
- **Same fix shape as Bug M / Bug AA.** The Hatter Tag mismatch in 4-prep.2 is the same 3-layer drift class we closed in the cert-run-5 series. The fix pattern is identical: synthesis pack ↔ agent prompt ↔ workflow extractor must agree. Sweep for any other top-level references before merging.
- **Regenerate before claiming shipped.** 4-prep does not count as shipped until the sample-OKR WHAT artifact regenerates clean. Process residue (`<!-- Rev 2... -->`) and forbidden patterns (`202 as ApiError`) in the artifact = unshipped.
- **No production mocks (rule 6 in the seven rules).** Carry this rule forward into D-PR7 (implementation agent prompt) verbatim -- the agent must never mock a dependency that exists in another target repo's slice.

#### First-commit suggestion

Sub-tasks should ship in this order within the single D-PR4-prep commit (or split into 4-6 small commits, all on a feature branch reviewed together):

1. **4-prep.4 verifier in isolation** -- pure function over YAML fixtures, 10-12 test cases (one per failure condition + happy path + edge cases like single-repo OKR and 4-deep dependency chain).
2. **4-prep.1 + 4-prep.2 prompt fixes** -- agent.md lines 38, 268 + synthesis.md line 423 + surrounding prose. Snapshot-test the agent template + synthesis pack contents.
3. **4-prep.3 coordination contract in agent prompt + synthesis** -- the §10 H3 instructions + per-repo frontmatter extension + the seven rules verbatim.
4. **4-prep.5 sample regeneration** -- live run on the sample mesh; produces the new baseline artifact; gates the merge.
5. **Optional 4-prep.6 HOW regeneration** -- if "gold" baseline matters.

### ✅ D-PR4 · Looking Glass fan-out engine (app-side orchestrator)

- **Goal.** Implement the app-side fan-out engine in Looking Glass. After the code-design PR merges, the OKR detail surfaces a per-repo pre-flight + a "Fan out" button. The engine runs pre-flight checks per target repo, reads coordination from D-PR4-prep's output, opens landing issues in topological order, and dispatches the implementation agent via `assignCustomCopilotAgent`. Writes `design-fan-out.yaml` to the mesh repo via direct commit to `main` guarded by `MeshBranchGuard`.
- **Why.** This is the cross-repo hand-off proper. Without it, `targetCodeRepos[]` is just decoration.
- **Acceptance.** OKR detail page after code-design merge shows:
  1. Pre-flight pane per target repo. Per-row status: `ready` (harness present + permissions OK + deps clear) | `harness-missing` (brownfield needs retrofit -- link to "Open repo in workspace") | `permission-blocked` (PAT can't create issues / repos) | `repo-not-found` (brownfield slug 404) | `repo-exists-conflict` (greenfield but repo already exists) | `pending-on-upstream` (deps not merged yet) | `pending-scaffold` (greenfield mid-scaffold).
  2. "Fan out N of M ready repos" button enabled only when ≥1 row is `ready`. Click → engine processes ready rows in topological order.
  3. For each `ready` row: create landing issue (per-repo + sibling-table body per Option III from earlier discussion); assign `implementation-agent` via `assignCustomCopilotAgent`; write/update `design-fan-out.yaml` row to `opened`; for greenfield, mark `repo_created: true`.
  4. For `pending-on-upstream` rows: stay in `design-fan-out.yaml` as `pending`; do NOT create landing issue. Stage 5 card will pick them up later (D-PR5).
  5. Greenfield path: create repo via `gh api orgs/{org}/repos` → clone empty → add to workspace via `vscode.workspace.updateWorkspaceFolders` → `ScaffoldPanel.createOrShow` with new repo + OKR-context flag. After Cheshire's scaffold completes, engine resumes (breadcrumb pattern like `whiteRabbitBreadcrumb` at [`LookingGlassPanel.ts:5567`](../src/webview/LookingGlassPanel.ts)) and creates the landing issue.
  6. Brownfield-needs-retrofit: row shows `harness-missing` with "Open repo in workspace" button. Click → `onOpenRepoInContext` flow. User runs Cheshire scaffold themselves, merges retrofit PR, re-clicks "Re-check" on the OKR card. Row flips to `ready`.
  7. `design-fan-out.yaml` write is a direct commit to `main` in the mesh repo, guarded by `MeshBranchGuard` (fail-closed if the user's local checkout is on a non-main branch -- recovery UI per the three discriminated failure modes). Git history of this file IS the audit trail for Tier 2 (per key call #5). NO PR-per-write in MVP.
- **Files to touch.**
  - `vscode-extension/src/webview/LookingGlassPanel.ts` -- new `onFanOutPreflight(okrId)`, `onFanOut(okrId)`, `onResumeGreenfield(okrId, repoSlug)` message handlers; new pre-flight + fan-out helpers (`getHarnessPresence`, `getRepoPermissions`, `getRepoExistence`, `topologicalSortByCoordination`); reuse existing `onOpenRepoInContext` for brownfield-needs-retrofit
  - `vscode-extension/src/services/GitHubService.ts` -- `getRepoFileStatus` for harness detection; `checkIssueWritePermission` (probe via `gh api repos/{owner}/{repo}` permissions); `createOrgRepo` for greenfield
  - `vscode-extension/src/services/MeshService.ts` -- `readCoordination(okrPath)` parser for the D-PR4-prep YAML block; `writeDesignFanOut(okrId, rows)` writer (direct commit to `main`, guarded by `MeshBranchGuard`)
  - `vscode-extension/src/webview/app/views/okrDetail.ts` -- pre-flight pane render; "Fan out N of M" button
  - `vscode-extension/src/types/webview.ts` -- add `fanOutPreflight`, `fanOut`, `resumeGreenfield` to message union
  - `vscode-extension/src/types/index.ts` -- `DesignFanOutRow` type with discriminated `status`
  - `vscode-extension/src/webview/ScaffoldPanel.ts` -- accept an optional `okrContext` parameter so greenfield knows which OKR's `docs/code-design-spec.md` to seed
  - `vscode-extension/src/webview/__tests__/fanOutPreflight.test.ts` (NEW) -- pure-function tests for topological sort + pre-flight state derivation
  - `vscode-extension/src/services/__tests__/MeshServiceFanOut.test.ts` (NEW) -- coordination parse + design-fan-out write
- **Design docs to read first.**
  - **This doc's Tier 2 architecture section above** -- the five key calls.
  - [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) "Hand-off -- per-repo fan-out from mesh to code repos (canonical)" section -- landing-issue body template + fan-out branches. **NOTE: this section currently describes a `design-bus.yml` workflow approach -- it needs a parallel rewrite as part of this PR** (see "Doc cleanup spill" below).
  - [`LookingGlassPanel.ts:2197-2234`](../src/webview/LookingGlassPanel.ts) -- existing custom-agent dispatch + fallback pattern. Reuse, don't reinvent.
  - [`LookingGlassPanel.ts:5278-5347`](../src/webview/LookingGlassPanel.ts) -- existing `onOpenRepoInContext` flow. Brownfield-needs-retrofit path reuses this.
- **Dependencies.** D-PR4-prep MUST land first (engine needs coordination data to read). D-PR3 is independent.
- **Hardening lessons to apply.**
  - **Discriminated unions for fetch results.** `getRepoFileStatus` returns `ok | not-found | fetch-error` per the Phase E pattern -- never collapse to `null`. Pre-flight uses these to distinguish "harness genuinely missing" from "couldn't tell" (don't fan-out on uncertainty).
  - **Idempotent landing-issue creation.** Each row in `design-fan-out.yaml` carries a fan-out attempt id. Re-running fan-out for a row already at `opened` is a no-op. Greenfield repo-create handles 422 "name already exists" by falling through to "is the existing repo empty? if yes, scaffold; if no, mark `repo-exists-conflict`".
  - **No mocks in main.** Topological ordering enforces this: dependents land only after their upstream PRs merge. The implementation agent always sees real dependencies.
  - **MeshBranchGuard fail-closed.** Every write to `design-fan-out.yaml` is a direct commit to `main` guarded by `MeshBranchGuard` (LOCAL-branch guard, NOT a PR mechanism). If the user's checkout is on a non-main branch, MeshBranchGuard refuses the write and the panel surfaces a recovery UI per the three discriminated failure modes (`wrong-branch-clean` → one-click switch-to-main + retry; `wrong-branch-dirty` → list dirty files + commit/stash hint; `wrong-branch-divergent` → list orphan OKR files + warn against merge). Matches existing Start/Reset/Redeploy/finalize pattern.
  - **Honest gap surfacing.** Pre-flight reasons map 1:1 to fix paths. No collapsing "failed" buckets.
  - **No claim of signed events.** The fan-out engine writes `design-fan-out.yaml`. It does NOT emit `state_transition` (workflow-owned) or any new event kind. Audit trail = git history. Future option: `fan_out_recorded` event kind (see key call #5).
- **First-commit suggestion.** Pure-function pieces first (topological sort, pre-flight state derivation, coordination parse) with 15+ tests. Then GitHub-API helpers (`getRepoFileStatus`, `checkIssueWritePermission`, `createOrgRepo`) with mocked Octokit. Then the panel wiring + the okrDetail render. Last: live integration against the IMDB-Celebs sample.

### ✅ D-PR5 · Stage 5 Per-Repo Fan-Out card in Looking Glass

- **Goal.** OKR detail card that shows per-target-repo status from `design-fan-out.yaml`, updates live by polling target-repo PRs, and auto-advances the next dependency wave when an upstream PR merges.
- **Why.** Without the live card, fan-out is fire-and-forget. The orchestrator role (Stage 5) is what keeps the topological gate honest after the initial fan-out wave.
- **Acceptance.** OKR detail page after fan-out shows:
  - Per-row status: `ready` (pre-flight passed, landing issue NOT yet opened -- waiting on user click or auto-advance trigger) | `opened` (landing issue created, agent dispatched, no PR yet) | `pending-on-upstream` (waiting on dep PR to merge before this row's landing issue is created) | `pending-scaffold` (greenfield mid-Cheshire-scaffold) | `harness-missing` (brownfield retrofit blocked -- offer "open in workspace") | `permission-blocked` (PAT can't create issue/repo) | `pr-opened` (impl PR live in target repo) | `pr-merged` (slice done) | `pr-rejected` (slice failed review).
  - Discriminated affordances per status (`harness-missing` → "Open repo in workspace"; `permission-blocked` → "Fix permissions in GitHub"; `pending-scaffold` → "Resume scaffold"; `pr-rejected` → "Revise with agent" or "Roll back").
  - Live polling: every 60s (cached), Stage 5 checks each target repo for open impl PRs labeled `oraculum-impl` (or analogous). When detected, parses the Hatter Tag from the PR body, stores in `design-fan-out.yaml` row.
  - **Auto-advance.** When an impl PR merges (detected via polling), Stage 5: (a) updates that row to `pr-merged`; (b) checks dependents -- any row in `pending-on-upstream` whose deps are now all `pr-merged` flips to `ready`; (c) prompts user with "1 row ready -- fan out next wave?" or auto-fans-out if the user pre-approved continuous mode.
  - Sibling info displayed per row: e.g. "Provides: auth-contract · Consumed by: api, frontend · Waiting on: foundation (#42)".
- **Files to touch.**
  - `vscode-extension/src/webview/app/views/okrDetail.ts` -- `renderStage5FanOutCard(okrId, fanOut, coordination)`
  - `vscode-extension/src/webview/LookingGlassPanel.ts` -- `pollFanOutPRs(okrId)` (cached for 60s); `onAutoAdvance(okrId)`; reuse existing PR-fetch helpers
  - `vscode-extension/src/services/GitHubService.ts` -- `listOpenPRsWithLabel(owner, repo, label)` if not already present
  - `vscode-extension/src/services/MeshService.ts` -- `updateFanOutRow(okrId, repoSlug, patch)` (direct commit to `main`, guarded by `MeshBranchGuard`)
  - `vscode-extension/src/types/webview.ts` -- add `pollFanOut`, `autoAdvance` to message union
  - `vscode-extension/src/webview/__tests__/stage5FanOutCard.test.ts` (NEW)
- **Design docs to read first.**
  - This doc's key call #4 (topological gating) -- Stage 5 is what enforces it after the initial fan-out wave.
  - [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D10 -- original Stage 5 spec (NOTE: was written assuming workflow-driven fan-out; the underlying data is the same `design-fan-out.yaml` but the UX patterns now own the auto-advance behavior the workflow would otherwise do).
- **Dependencies.** D-PR4 must land first (Stage 5 reads what D-PR4 writes).
- **Hardening lessons to apply.**
  - **Cache GitHub fetches.** Per-row PR polls cached for 60s with discriminated result (`ok | not-found | fetch-error`). Prevents thrashing and stays truthful about which row is unverifiable vs known-bad.
  - **Honest gap surfacing.** Missing `design-fan-out.yaml` AND WHAT phase complete → explicit message ("Fan-out file missing -- run Fan out from the OKR detail").
  - **Auto-advance is opt-in.** User toggles continuous mode per OKR; default is "prompt me before opening next wave."
  - **No mocks in main carries through.** Stage 5 never opens dependent landing issues until upstream PR is `pr-merged`. There is no shortcut.
- **First-commit suggestion.** Render-only against a fixture `design-fan-out.yaml` first (5-8 status rendering tests). Then poll wiring with mocked Octokit. Last: auto-advance state transitions with property tests for the topological gate.

### ✅ D-PR6 · End-to-end smoke (WHAT through implementation merge)

- **Goal.** Documented live smoke run of the full Tier 2 pipeline on the **new Tier 2 smoke OKR (`OKR-2026Q3-IMDB-002-<feature-name>`) created in D-PR4-prep.5** -- NOT on the historical `OKR-2026Q2-IMDB-001-celeb-api` (which stays preserved as the Phase E clean-planning proof). Three target repos covering the matrix: one brownfield-with-harness, one brownfield-needing-retrofit, one greenfield. Linear `depends_on` chain produced by the regenerated WHAT. All three slices land in waves, whole-OKR rollup verdict ✅ PASS, implementation chain section populated.
- **Why.** D-PR4 + D-PR5 + D-PR7 + D-PR8 do not count as shipped until a real end-to-end run produces a clean rollup. The smoke catches integration seams that unit tests miss (custom-agent dispatch latency, greenfield scaffold timing, MeshBranchGuard wrong-branch refuse, cross-repo PR polling). The new OKR isolates Tier 2 from Phase E history so the smoke can fail or be re-run without touching the historical record.
- **Acceptance.**
  - **Tier 2 smoke OKR exists and is fully regenerated** via D-PR4-prep.5 (and ideally 4-prep.6). The historical `OKR-2026Q2-IMDB-001-celeb-api` is NOT regenerated or modified.
  - New OKR walked: WHY (clean run), HOW (clean run), WHAT (clean run with coordination YAML covering all 3 target repos, verified by the 7 coordination-verifier conditions).
  - Fan-out pre-flight shows correct state for all three repos: foundation = `ready`, brownfield-needing-retrofit = `harness-missing`, greenfield = `repo-not-found` (will route through Cheshire greenfield create + scaffold).
  - User retrofits the harness-missing one via Cheshire -- merges retrofit PR -- re-checks pre-flight -- that row flips `harness-missing` → `ready`.
  - User starts greenfield scaffold (Cheshire greenfield mode: create repo + clone + add-to-workspace + scaffold harness + seed `docs/code-design-spec.md`) -- during scaffold, that row shows `pending-scaffold` (NOT eligible for fan-out yet). Cheshire scaffold completes -- row flips `pending-scaffold` → `ready`.
  - User clicks "Fan out 1 of 3 ready" early on the foundation row only (foundation has no `depends_on`, so it can fan out before the others finish their prerequisites). Landing issue opens, impl agent dispatches, PR opens, lands.
  - Once all three rows are `ready`, user can either fan out remaining waves manually OR let Stage 5 auto-advance: when foundation PR merges, api row's `depends_on: [foundation]` clears → api flips `pending-on-upstream` → `ready`. Fan out, land. Same for frontend after api lands.
  - Final state: 3 impl PRs merged (in dependency order: foundation → api → frontend), 3 `.maintainability/audit/events/IMPL-*.jsonl` chains in 3 target repos, 3 implementation rows in `chain-ladder.yaml`.
  - Whole-OKR rollup export: `VERDICT: ✅ PASS`, implementation chain section populates with all 3 cross-repo PRs + verified `parent_chain_root` linkage.
- **Files to touch.**
  - `vscode-extension/design/agentic-sdlc-codedesigner.md` D12 -- mark shipped + smoke checklist
  - `vscode-extension/test/integration/__tests__/whatPlusFanOut.smoke.test.ts` (NEW; opt-in `npm run test:smoke`; documents the live run pre-conditions and expected artifact paths)
  - `vscode-extension/design/demo-script-sdlc-walkthrough.md` -- update walkthrough to include the three-repo fan-out
  - A new `cert-runs/` directory or similar at the repo root, capturing the actual rollup output as a verifiable artifact (matches Phase E pattern)
- **Design docs to read first.**
  - This doc end-to-end (especially key calls #3, #4).
  - The Phase E live cert-run capture in [`agentic-sdlc.md`](agentic-sdlc.md) §13 (E section) -- same pattern of "run live, capture verdict, commit the rollup."
- **Dependencies.** D-PR3 + D-PR4-prep + D-PR4 + D-PR5 + D-PR7 + D-PR8 all shipped. D-PR6 is the closing certification.
- **Hardening lessons to apply.**
  - **Honest verdict.** If any per-repo slice fails to land, the smoke is NOT a pass. The verdict is binary: every target repo ships an impl PR that merges, or the smoke failed.
  - **Capture the rollup.** Smoke run commits the actual rollup markdown to the repo so the verdict is auditable from CI logs.
  - **Pre-flight checklist.** Before the smoke: GitHub App installed on org with `administration: write`; target greenfield name does NOT exist; brownfield-needs-retrofit target repo exists + App installed; mesh has ≥1 `.caterpillar/reference-repos/` if testing D-PR3.

### ✅ D-PR7 · Implementation-agent template (Cheshire-installed; no workflow YAML for agent dispatch)

- **Goal.** Ship `.github/agents/implementation-agent.agent.md` as part of Cheshire's scaffold output. The agent self-dispatches when the landing issue arrives (via `assignCustomCopilotAgent` from D-PR4), reads its per-repo extract + landing-issue sibling table, plans an implementation, runs Tweedles persona-switch self-critique (Architect + Security), opens PR with Hatter Tag continuation. **No workflow YAML for agent dispatch** (the GitHub custom-agent API IS the dispatch mechanism). Scaffolded CI may still include a separate workflow that VERIFIES Hatter Tag continuation on incoming implementation PRs -- that's PR-provenance enforcement, not agent invocation.
- **Why.** This is the agent that actually does the implementation work. Without it, fan-out creates a landing issue and nothing happens. The Cheshire-install pattern means every repo with the harness has the agent locally, owns it locally, can customize it locally. The dispatch-via-API + verify-via-CI split keeps each surface single-purpose: GitHub owns the agent runtime; Cheshire-scaffolded CI owns provenance enforcement on the resulting PR.
- **Acceptance.**
  - Cheshire scaffold (both retrofit + greenfield modes) installs `.github/agents/implementation-agent.agent.md` from a canonical template.
  - Template carries: prompt for reading landing-issue body (sibling table aware); skill list including `knowledge-code`, `knowledge-mesh`, `audit-emit-event`; persona-switch self-critique block (Architect + Security, same Tweedles pattern as Phase D's code-design-agent); required PR-description format (Hatter Tag continuation markers); MUST-invoke language for the `audit-emit-event` skill calls per Tweedles round.
  - When fan-out dispatches via `assignCustomCopilotAgent(owner, repo, n, 'implementation-agent', { customInstructions: <per-OKR context> })`, the agent runs end-to-end and opens a PR.
  - PR description carries valid Hatter Tag continuation per the **implementation chain storage contract** below.
  - Agent does NOT mock dependencies. It calls real code in the repo's siblings because topological ordering ensures dependencies are merged before the agent runs.

#### Canonical Cheshire scaffold inventory (the "harness")

When Cheshire scaffolds a target repo (retrofit OR greenfield), it installs this exact set. D-PR7 ADDS items 1 + 6 + optional 7; the rest are existing Cheshire output that we depend on for the harness pre-flight check in D-PR4.

| # | Path | Mode | Source | Purpose |
|---|---|---|---|---|
| 1 | `.github/agents/implementation-agent.agent.md` | **NEW (D-PR7)** | Cheshire template registry | The agent dispatched by `assignCustomCopilotAgent` |
| 2 | `.github/workflows/ci.yml` / `ci.yaml` (whichever extension the team uses; or pre-existing repo CI integration) | EXISTING | Cheshire scaffold | Lint + test + build gates |
| 3 | `.github/workflows/alice-remediation.yml` | EXISTING | Cheshire scaffold | Alice the Good Maintainer agent for CodeQL / debt fixes |
| 4 | `.github/workflows/codeql.yml` + `.github/workflows/snyk.yml` (or equivalent) | EXISTING | Cheshire scaffold | Security scans (CodeQL security-extended; Snyk dependency + SAST) |
| 5 | `.cheshire/prompts/` (per-repo prompt pack folder) | EXISTING | Cheshire scaffold | In-repo prompt pack overlay; seed README + .gitkeep |
| 6 | `.maintainability/audit/` directory + `.gitignore` exception entries | **NEW (D-PR7)** | Cheshire scaffold | Where the implementation agent writes its signed event log (see storage contract below). Cheshire adds `.maintainability/` to the repo's `.gitignore` allowlist so the agent's commits aren't rejected by language-specific ignore rules. |
| 7 | `.github/workflows/impl-pr-provenance.yml` (OPTIONAL) | **NEW (D-PR7) -- opt-in** | Cheshire scaffold | Verifies the impl PR's Hatter Tag continuation block against the mesh's `chain-ladder.yaml`. Two cross-checks required: (a) `intent_thread_uuid` matches the OKR's master thread; (b) `parent_chain_root` matches the WHAT phase's chain root from chain-ladder. Either mismatch → PR check fails with `chain-integrity-failed` label. Opt-in because not every team wants the gate; default ON for new scaffolds, opt-out via Cheshire scaffold settings. |
| 8 | Red Queen governance files (`.calm/`, `.redqueen/` if applicable; CALM hooks for the target repo's primary language) | EXISTING | Cheshire scaffold via `scaffoldAgentConfig` ([LookingGlassPanel.ts:5609-5616](../src/webview/LookingGlassPanel.ts)) | Per-tool-call validation rails (out of Tier 2 scope for content but installed alongside) |
| 9 | `.github/CODEOWNERS` | EXISTING (if missing in greenfield) | Cheshire scaffold | OKR owner as initial codeowner |

**Pre-flight harness detection** (D-PR4) looks for item 1 specifically. If `.github/agents/implementation-agent.agent.md` is missing, the repo gets `harness-missing` and pre-flight deflects to Cheshire. Cheshire's retrofit / greenfield mode installs the full set above.

#### Implementation audit chain storage contract

The cross-repo audit trail extension that Codex flagged as the biggest remaining traceability gap. The implementation agent emits signed events using the SAME `audit-emit-event` skill the planning agents use, but writes them to an in-target-repo location.

**In-repo path layout** (one set of files per implementation run):

```
<target-repo>/
└── .maintainability/
    └── audit/
        ├── events/
        │   └── <implementation_run_id>.jsonl       # signed event log; same event shape + signing
        │                                            # contract as mesh-side planning events
        └── keys/
            └── <implementation_run_id>.epoch-1.pub.pem
            └── <implementation_run_id>.epoch-2.pub.pem   # (only if a revise round opened a new epoch)
```

These files are committed into the impl PR alongside the actual code changes. The PR cannot merge without them (verified by the optional item 7 workflow when enabled, OR by Stage 5's post-merge check when not).

**`implementation_run_id` format:**

```
IMPL-<YYYY-MM-DD>-<sanitized-repo-slug>-<6-char-base32-nonce>
```

Example: `IMPL-2026-06-15-celeb-api-x7n2qk`

Sanitization: lowercase, hyphenate slashes, strip everything except `[a-z0-9-]`. Same rule as the existing planning `runId` slugs (Bug PP sanitize-naming).

**Hatter Tag continuation block** (in the impl PR body's YAML frontmatter):

```yaml
implementation_chain:
  okr_id: OKR-2026Q3-IMDB-002-celeb-profiles
  parent_phase: what
  parent_run_id: WHAT-2026-06-10-abc123
  implementation_run_id: IMPL-2026-06-15-celeb-api-x7n2qk
  mesh_repo: AliceNN-ucdenver/alicenn-ucdenver-governance-mesh
  target_repo: AliceNN-ucdenver/celeb-api
  event_log_path: .maintainability/audit/events/IMPL-2026-06-15-celeb-api-x7n2qk.jsonl
  key_path: .maintainability/audit/keys/IMPL-2026-06-15-celeb-api-x7n2qk.epoch-1.pub.pem
  parent_intent_thread: 2e28b567-ab8a-4ad0-a29d-632673f412a9   # OKR's master intent_thread_uuid
  parent_chain_root: 87edfc98924d2956...   # the WHAT phase's chain root from chain-ladder.yaml
```

All field values are required. Missing fields → PR check `chain-integrity-failed`.

**Verifier walk** (extends `skill-audit-verify-chain` per D-PR8 / T2.5):

The runner-side `audit-verify-chain` Skill receives `{ okrId, runId: <IMPL-...> }`. It:

1. Reads the mesh's `okrs/<okrId>/audit/chain-ladder.yaml` to find the implementation row matching `runId`.
2. Extracts `target_repo` + `event_log_path` + `key_path` from that row.
3. Clones (or reads from local clone of) the target repo at the impl PR's merge commit SHA.
4. Reads the event log JSONL + each public key.
5. Replays every signature against per-epoch public keys; walks the hash chain end-to-end.
6. Confirms `parent_chain_root` in the chain's first event matches the WHAT phase's chain root from the mesh chain-ladder.
7. Returns verdict per the same PASS / PARTIAL / FAIL precedence used for planning chains.

**Why `.maintainability/` and not `.cheshire/audit/`:** `.cheshire/` is the prompt pack overlay (humans + Cheshire write); `.maintainability/audit/` is agent-emission territory (agent + runner write, never humans). Keeping them in separate top-level dirs makes ownership unambiguous and matches the mesh-side `okrs/<id>/audit/events/` pattern (audit is its own subtree, not nested under config).

- **Files to touch.**
  - `vscode-extension/code-templates/.github/agents/implementation-agent.agent.md` (NEW; canonical template -- includes the storage contract above as required output)
  - `vscode-extension/code-templates/prompts/implementation/synthesis.md` (NEW; first-pass implementation prompt)
  - `vscode-extension/code-templates/prompts/implementation/architecture-review.md` (NEW; Architect persona prompt)
  - `vscode-extension/code-templates/prompts/implementation/security-review.md` (NEW; Security persona prompt)
  - `vscode-extension/code-templates/workflows/impl-pr-provenance.yml` (NEW; OPTIONAL item 7 from harness inventory)
  - **Cheshire scaffold template registry** (location TBD by inspecting [`ScaffoldPanel.ts:280,374`](../src/webview/ScaffoldPanel.ts) `scaffoldAgentConfig` and the `writeScaffoldFiles` call site at [`LookingGlassPanel.ts:5616`](../src/webview/LookingGlassPanel.ts) -- there is NO `agentTemplates.ts`; the actual writer adds the new template files to its install set) -- add items 1 + 6 + 7 to the Cheshire install set
  - `vscode-extension/src/webview/ScaffoldPanel.ts` -- ensure scaffold writes the implementation-agent files + the `.maintainability/audit/` directory + `.gitignore` exception entries (both retrofit + greenfield)
  - `packages/research-runner/src/skills/audit-verify-chain.ts` -- extend to accept `IMPL-` prefixed runIds and walk into target repos per the storage contract above (target-repo clone behavior; same verification shape as planning chains)
  - Tests: `vscode-extension/src/__tests__/implementationAgentTemplate.test.ts` (NEW) -- verifies template structure (tools, personas, MUST-invoke phrases, storage contract format)
  - Tests: `packages/research-runner/src/skills/__tests__/audit-verify-chain-impl.test.ts` (NEW) -- fixture target repo with valid + invalid chains; tests the cross-repo walk
- **Design docs to read first.**
  - This doc's key call #2 (custom-agent assignment dispatch).
  - [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D8 (persona-switch self-critique pattern from code-design-agent -- reuse the same shape).
  - [`audit-event-shape.md`](audit-event-shape.md) -- Hatter Tag continuation contract for cross-repo PRs.
  - [`audit-emit-event/SKILL.md`](../code-templates/skills/audit-emit-event/SKILL.md) -- what the agent calls vs what's runtime-emitted (Bug V/W/X/Y contracts).
- **Dependencies.** D-PR4 must land first (the agent has nothing to do without a landing issue). Can be developed in parallel with D-PR5 since they're independent surfaces.
- **Hardening lessons to apply.**
  - **No `implementation-agent.yml` workflow.** Dispatch is via `assignCustomCopilotAgent`. Custom-agent loads from `.agent.md` directly. Adding a workflow YAML would duplicate the GitHub primitive.
  - **Per-event signing.** Agent emits `self_review` per persona-round; runner signs with the per-session ephemeral Ed25519 key. Same Knight's Seal v1 contract as Phase D.
  - **Hatter Tag continuation is verified on both axes.** The optional `impl-pr-provenance.yml` workflow (harness item 7) reads the impl PR's continuation block and cross-checks BOTH (a) `intent_thread_uuid` against the OKR's master thread in `chain-ladder.yaml` AND (b) `parent_chain_root` against the WHAT phase's chain root in `chain-ladder.yaml`. Either mismatch → PR label `chain-integrity-failed`. D-PR8 surfaces this state in the rollup; only fully-verified PRs participate in the PASS verdict.
  - **No mocks.** Agent prompt explicitly says: "Dependencies have merged before you run. Call real code. Do not mock."
- **First-commit suggestion.** Template + persona prompts in isolation, with structural tests. Then ScaffoldPanel integration. Last: a manual dispatch test against a fixture landing issue in a sandbox repo to confirm the dispatch + Tweedles loop run end-to-end.

### ✅ D-PR8 · Implementation chain in whole-OKR rollup

- **Goal.** Extend the existing whole-OKR rollup exporter (Phase E E4 / E6) to include an "Implementation chain" section per target repo. The section threads cross-repo impl PRs into the OKR's audit ladder.
- **Why.** Today the rollup says "the design is provably-this" and stops at WHAT merge. With Tier 2 shipping implementation, the rollup needs to say "the implementation matches the design and here are the cross-repo PRs that delivered it, all linked via Hatter Tag continuation." Without D-PR8, the rollup understates what shipped.
- **Acceptance.**
  - Rollup `## Implementation chain` section per target repo: PR URL, PR state (open/merged/closed), `implementation_run_id`, Hatter Tag chain root, parent_intent_thread match (✓/✗), parent_chain_root match (✓/✗), event log + key paths (in target repo, per D-PR7 storage contract), runner-verify status (when T2.5 lands -- not blocking for D-PR8 MVP, shown as `not-yet-verified`).
  - `chain-ladder.yaml` extended to include implementation rows that mirror the D-PR7 storage contract:
    ```yaml
    - phase: implementation
      repo: <owner>/<slug>
      pr_url: https://github.com/<owner>/<slug>/pull/<n>
      implementation_run_id: IMPL-<date>-<repo-slug>-<nonce>
      chain_root_hash: <event-1 hash from .maintainability/audit/events/<run-id>.jsonl>
      parent_intent_thread: <OKR's intent_thread_uuid>
      parent_chain_root: <WHAT phase chain root>
      event_log_path: .maintainability/audit/events/<run-id>.jsonl  # in target_repo
      key_path: .maintainability/audit/keys/<run-id>.epoch-1.pub.pem  # in target_repo
      merged_at: 2026-06-15T17:42:00Z
    ```
  - Stage 5 card writes these rows to chain-ladder when impl PRs merge (parses the D-PR7 storage-contract Hatter Tag block from the PR body).
  - Rollup verdict precedence preserved: FAIL > PARTIAL > PASS. If any impl PR is closed-not-merged → PARTIAL with reason `implementation-pr-rejected:<slug>`. If `parent_intent_thread` mismatch → FAIL with reason `cross-repo-thread-broken:<slug>`. If `parent_chain_root` mismatch → FAIL with reason `cross-repo-chain-root-mismatch:<slug>`. If event_log_path or key_path is missing/unreadable in target repo → FAIL with reason `implementation-chain-evidence-missing:<slug>`.
- **Files to touch.**
  - `vscode-extension/src/services/AuditReportExporter.ts` -- extend `buildOkrRollupMarkdown` with implementation chain section
  - `vscode-extension/src/services/AuditReportExporter.ts` -- extend `computeOkrRollupVerdict` predicate with implementation chain checks
  - `vscode-extension/src/services/MeshService.ts` -- extend `writeChainLadder` to accept implementation rows
  - `vscode-extension/src/webview/LookingGlassPanel.ts` -- Stage 5's "PR merged" handler writes the chain-ladder row
  - `vscode-extension/src/services/__tests__/AuditReportExporter.test.ts` -- add tests for implementation chain rendering + verdict precedence
- **Design docs to read first.**
  - [`agentic-sdlc.md`](agentic-sdlc.md) §11.6 (chain-ladder writer pattern) + §11.7 (rollup spec).
  - This doc's T2.5 spec (cross-repo Red Queen chain) -- D-PR8 is the MVP placeholder for cross-repo threading; T2.5 hardens it to runner-verified.
- **Dependencies.** D-PR5 + D-PR7 must be functional (we need impl PRs to thread). D-PR8 is the closing rollup integration.
- **Hardening lessons to apply.**
  - **Per-input source tracking.** Cross-repo PR reads are GitHub canonical (live API). Sources tag includes `cross-repo:<slug>` per target repo.
  - **Verdict precedence carries through.** Any implementation-chain integrity failure (broken thread, rejected PR) participates in the rollup verdict via the same `computeOkrRollupVerdict` predicate. Don't fork.
  - **Reserve the T2.5 seam.** When T2.5 ships, "PR merged" gains "runner-verified" status. D-PR8's structure should already carry the runner-verify field (initially `not-yet-implemented`) so T2.5 is a fill-in, not a rewrite.
- **First-commit suggestion.** Test fixtures showing rollup with implementation chain section (5-8 verdict-permutation tests). Then exporter wiring. Last: hook Stage 5's PR-merged handler to write the chain-ladder row.

---

## Tier 2 doc cleanup spill

These describe the old `design-bus.yml` model and need rewriting. Two split across the work items above; the rest ship during D-PR4 since they're design-doc / template-comment hygiene:

**Absorbed into D-PR4-prep** (agent prompt + synthesis pack -- they affect the next sample WHAT run):
- [`code-templates/agents-v4/code-design-agent.agent.md:38,268`](../code-templates/agents-v4/code-design-agent.agent.md) -- handled by 4-prep.1.
- [`prompt-packs/looking-glass/code-design/synthesis.md:423`](../prompt-packs/looking-glass/code-design/synthesis.md) Hatter Tag nesting -- handled by 4-prep.2.

**Ship during D-PR4** (architecture doc + comments -- no agent-runtime impact):
- **[`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) "Hand-off -- per-repo fan-out from mesh to code repos (canonical)" section.** Currently describes `design-bus.yml` workflow as the executor. Rewrite to describe the Looking Glass fan-out engine + Cheshire-owned scaffold + custom-agent dispatch. Keep the landing-issue body template (still canonical) but update the "Trigger" and "Fan-out execution" subsections.
- **[`vscode-extension/src/templates/codeRepoTemplates.ts:561`](../src/templates/codeRepoTemplates.ts) (misleading comment) + line 594 (active entry).** The actual `DEPRECATED_MESH_FILES` entry for `design-bus.yml` is at line 594 (good -- it's already pruned on Redeploy). The PROBLEM is the comment block at line 561 which still says: *"design-bus.yml (D-PR4) -- per-repo fan-out from the merged WHAT PR to each target code repo (brownfield: open landing issue; greenfield: create repo + seed commit + open landing issue) -- is queued for D-PR4 and not yet in this list."* This comment is wrong on two counts: (1) the file IS in DEPRECATED_MESH_FILES (line 594), and (2) D-PR4 is not delivering a workflow -- it's delivering an app-side fan-out engine. **Rewrite the comment block at line 561 to:** *"design-bus.yml (formerly queued as D-PR4 workflow) was superseded -- D-PR4 ships as an app-side fan-out engine in Looking Glass (per `vscode-extension/design/next-acts-tier-2-and-3.md`). The deprecated entry below stays so pruneDeprecatedWorkflows sweeps any prior-installed copies from mesh repos on next Redeploy."*
- **`TargetRepoStatusSchema` comments and any `agentic-sdlc.md` §13 D-PR4 references** -- sweep for "design-bus" mentions. Update to "Looking Glass fan-out engine" where they describe execution; keep them where they describe spec-history.
- **[`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D9** -- currently specs `design-bus.yml workflow`. Either retire D9 entirely (replace with a pointer to this doc's D-PR4) or rewrite as "D9 - Looking Glass fan-out engine spec."

These are not separate PRs; the D-PR4 ones ship as part of D-PR4's commit; the D-PR4-prep ones already listed under their sub-tasks above.

---

## Tier 2 hardening -- found during cert testing (2026-05-30)

Six fixes that landed after the Tier 2 cert run while exercising the fan-out matrix end-to-end. All shipped:

- **Governance Court retired** -- `agent_type` review layer removed; impl-provenance gate is the sole server-side check (v0.1.223).
- **Greenfield grounding** -- scaffold now INLINES the full canonical code-design into `docs/code-design-spec.md` (was a pointer the sandbox couldn't fetch) (v0.1.224).
- **Live-BAR tier** -- fan-out re-derives the governance tier from the live BAR at dispatch (not the WHAT-frozen value); matches the runtime hook (v0.1.225).
- **"Mark PR ready"** on fan-out rows + impl-provenance `ready_for_review` trigger (v0.1.226).
- **Fan-out concurrency cap (5)** -- closes the DoS "fan-out blast radius" threat-model row; chains self-serialize, independents queue as `pending-on-cap` (v0.1.227).
- **knip:** removed court-orphaned Review Board types (v0.1.228).

---

## Tier 2.5 · Queen's Next Act — complete the Red Queen chain and guard the evidence boundary

The Red Queen's evidence story, finished. The Hatter side (planning + implementation) already signs every event; the Red Queen's own action-time decisions do not yet join that signed chain. The next testing wave also showed a second boundary: Red Queen governs what the agent may do, but oracle/search skills still need their own rails so untrusted evidence cannot become an instruction, leak PII, or poison the audit record. Tier 2.5 is the whole Queen's Next Act, in four sequenced slices:

- **(a) Sign the enforcement chain — MVP (T2.5a below). ✅ SHIPPED + cert-verified (celeb-api PR #14).** The Red Queen decision log is a live append-only sidecar (the hook fires on the agent's own final commit), so rather than per-decision chaining, the finalize-time signer **seals the prefix it read** (covered bytes + sha256) onto the per-event Ed25519 implementation chain as the agent's last governed action. The impl-provenance gate re-hashes that exact prefix at the merge SHA, **gates on a mismatch**, names the post-seal commit-time tail as advisory; the whole-OKR rollup independently re-verifies the prefix. Cert verdict: *signed & verified · 32 decisions sealed · 3 post-seal, allow-only*.
- **(b) `redqueen-action` standalone hard gate (T2.5b).** AST semantic diff + per-file import/layer-graph enforcement + contract diffs as a dedicated required status check (roadmap Gap 13 / "Phase 9"). Sketched, needs design.
- **(c) Cross-chain inclusion proofs + SIEM/CloudEvents export (T2.5c).** Tie the signed enforcement chain to the planning-intent chain and emit unified Hatter ↔ Red Queen evidence to a SIEM (roadmap Gap 1). Sketched, needs design.
- **(d) Oracle Guardrails + Privacy Rails (T2.5d).** Guard the skill boundary: query inputs, provider results, dedupe/source registry, synthesis, Red Queen logs, and audit/export retention. Deterministic checks enforce the hard contract; optional NeMo Guardrails-style rails add semantic classification for prompt injection, topic drift, hostile retrieval chunks, and PII.

Auditor-hardening work (cosign, redacted bundle, prompt-pack signing, org-separation) is **Tier 3**, not here.

### T2.5a · Sign the enforcement chain — MVP (fold action-time evidence into the same chain)

> **✅ SHIPPED + cert-verified (celeb-api PR #14, 2026-05-31).** Built as a **signed-prefix seal**, not per-decision hash-chaining: the Red Queen decision log is a live append-only sidecar (the hook fires on the agent's own final commit), so a whole-file digest taken at sign time can never match the committed file. The finalize-time runner skill `audit-sign-redqueen-decisions` seals the PREFIX it read (`covered_bytes` + `covered_sha256` + counts) into one signed `redqueen_decisions` event on the IMPL chain. The impl-provenance gate re-hashes the first `covered_bytes` of the committed log at the merge SHA, **gates on a mismatch** (tamper/corruption), classifies the uncovered post-seal tail (allow-only benign, deny/override flagged) as advisory, and the OKR rollup re-verifies the prefix independently + renders the `## Implementation chain (Red Queen)` section (Seal / Sealed decisions / Allowed / Denied / Overrides / Tail / Prefix sha256). Hardened across 3 Codex rounds (honest-zero exactness, override-tail, rollup-mirrors-gate, missing-log evidence, exact-null) + the verify-chain gate-invocation fix. Cert verdict: *signed & verified · 32 decisions sealed · 3 post-seal, allow-only*. The original per-decision-chaining acceptance below is superseded by the seal contract. (b)(c)(d) remain queued.

- **Goal.** Today the Hatter side (planning: WHY/HOW/WHAT) signs every event in a hash-chain. The Red Queen side (action-time `validate_action` decisions, per-tool-call hooks, override events) writes its own JSONL but does NOT thread into the same chain a Hatter rollup verifies. T2.5 unifies them: a single `chain-ladder.yaml` entry per OKR carries phases `why | how | what | implementation-repoX | implementation-repoY` with per-repo Red Queen chain roots threaded by `parent_intent_thread`. **Builds on D-PR8's MVP cross-repo threading.**
- **Why.** A whole-OKR rollup today says "the design is provably-this." It does NOT say "the resulting code's tool-calls were governed." For an auditor to walk OKR → design → implementation → "and here's the proof the implementation agent didn't violate Golden Rules," the Red Queen evidence has to be in the same signed chain. Otherwise the rollup story stops at the WHAT merge.
- **Acceptance.** Whole-OKR rollup export's `## Implementation chain (Red Queen)` section grows from D-PR8's MVP shape to include per-repo: chain root, signer epoch, number of `validate_action` decisions, number of allow / deny / override events, runner-verified status. The runner's `audit-verify-chain` Skill walks the cross-repo links and verifies the receiving-side chain too. FAIL verdict if any implementation chain is missing for a target repo whose implementation PR has merged.
- **Design docs to read first.**
  - [`governance-redqueen.md`](governance-redqueen.md) -- Red Queen architecture (Sections 2, 3, 4, especially §4.5 + §4.5.1).
  - [`agentic-sdlc.md`](agentic-sdlc.md) §11.6 (`chain-ladder.yaml` writer; this is the integration point).
  - [`audit-event-shape.md`](audit-event-shape.md) -- Red Queen-side event shape contract.
  - D-PR8 above (the MVP threading that T2.5 hardens to runner-verified).
- **Dependencies.** D-PR4 + D-PR5 + D-PR6 + D-PR7 + D-PR8 all shipped.
- **Signing-context input (from the 2.0 run).** A temporary diagnostic probe is wired into the hook (`generateValidateToolJs` → writes `.redqueen/hook-signing-probe.jsonl` once; the impl agent stages it into the PR). It captures, in the real Copilot sandbox, whether the per-epoch Ed25519 key / runner session context is reachable from the hook process (env names + booleans + counts only — no key material). **First T2.5a step: read that probe from the 2.0 impl PR(s)** and let it pick the signing approach. Expected result: the hook is a separate process with no private key on disk → **finalize-time sign-and-thread** (the hook writes the unsigned log live; a runner skill signs + threads it at the end), NOT hook-side signing.
- **Cleanup — do this first, before building.** The probe is diagnostic-only and must not ship in the signed-chain work. Once the 2.0 results are read, **remove it**: the `writeSigningProbeOnce` definition + its call in `generateValidateToolJs` (`config-scaffold.ts`), the `.redqueen/hook-signing-probe.jsonl` staging line in `code-templates/agents/implementation-agent.agent.md`, and scrub any committed probe files. Re-scaffold the smoke repos so the probe-free hook lands.
- **Hardening lessons to apply.**
  - **One verifier, one shell command.** Extend the same `audit-verify-chain` Skill; don't fork.
  - **Per-input source tracking.** `AuditReportInputSources` extends with `cross-repo:<slug>` discrimination per implementation chain.
  - **Suppress-non-canonical.** Implementation-chain canonicity gaps → PARTIAL with named reason.
  - **Verdict precedence carries through.** FAIL > PARTIAL > PASS across mesh + per-repo chains in the same predicate.

### T2.5b · `redqueen-action` standalone hard gate

- **Goal.** A dedicated required status check (separate from impl-provenance) that runs AST semantic diff (tree-sitter), per-file import/layer-graph enforcement, and contract diffs (oasdiff / buf / graphql-inspector) at the merge boundary. Roadmap Gap 13 / "Phase 9."
- **Status.** Sketched in the roadmap + CLAUDE.md "Planned"; needs design before code. Sequenced after T2.5a.

### T2.5c · Cross-chain inclusion proofs + SIEM/CloudEvents export

- **Goal.** Tie the (now-signed) Red Queen enforcement chain to the planning-intent chain via inclusion proofs, and emit unified Hatter ↔ Red Queen evidence as CloudEvents to a SIEM. Roadmap Gap 1.
- **Status.** Sketched; needs design. Sequenced last.

### T2.5d · Oracle Guardrails + Privacy Rails for skills and audit evidence

- **Goal.** Add a guardrail envelope around governed skills and audit persistence so untrusted oracle/search content is never treated as an instruction, PII is not retained accidentally, and every guardrail decision is visible in the audit record. This is the STRIDE protection layer that sits beside Red Queen: **Red Queen governs actions; Oracle Rails govern evidence entering the chain; Privacy Rails govern what evidence may be retained.**
- **Why.** The WHY/HOW/WHAT agents depend on external oracles (`tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search`) and mesh/code skills. Those results can carry prompt injection, poisoned snippets, malformed URLs, PII, secret-like strings, or source text that tries to steer the agent. The current deterministic source-registry hardening proves "this source existed and was cited"; T2.5d adds "this source was safe enough to enter the chain, and sensitive data was redacted or refused before retention."
- **Correctness stance.**
  - Deterministic checks are the hard gate. They run first, are testable offline, and produce stable verdicts.
  - NeMo Guardrails-style rails are optional semantic classifiers at first. They can return `PASS | WARN | BLOCK | NEEDS_REVIEW`, but a model-based verdict must be recorded with config hash, model/version, input hash, output hash, and reason. Do not make an unpinned model rail the only source of truth for a hard gate.
  - All rails are evidence, not magic. A blocked query/result/export names the rule, the input class, the remediation, and the audit event id.
- **Guardrail envelope.**
  1. **Skill input rail.** Before the provider call: validate query length/count, provider allowlist, URL/domain constraints, secret-like strings, internal repo paths, PII patterns, and prompt-injection phrasing ("ignore instructions", "exfiltrate", "act as system", etc.). Hard-fail deterministic violations; annotate semantic risk.
  2. **Retrieval/result rail.** After provider results: normalize URLs, strip HTML/scripts, reject malformed or private-network URLs, classify snippets/abstracts as untrusted, detect prompt-injection text inside titles/snippets, hash-pin raw provider response when retained, and mark provider-degraded cases honestly.
  3. **Source-registry rail.** Before dedupe and synthesis: every retained source gets `source_id`, normalized URL, provider, title, raw/result hash, guardrail verdict, and redaction summary. Dedupe never drops the guardrail provenance.
  4. **Synthesis/output rail.** Before artifact write: every formal conclusion cites source ids; every cited source exists in the registry; no oracle text appears as instructions; no private PII/secret value leaks into the artifact.
  5. **Audit-retention rail.** Before `skill_call` payloads, Red Queen logs, source registries, and exports are persisted: scan for PII/secrets; store class/count/hash/redacted preview instead of raw sensitive values; keep enough hash material for replay without retaining the sensitive string.
- **STRIDE mapping.**
  - **Spoofing:** source identity checks, canonical URL/domain normalization, provider allowlist.
  - **Tampering:** raw result hashes, source-registry hashes, guardrail verdict hashes.
  - **Repudiation:** every rail decision is attached to a `skill_call` or guardrail block with rule id + event id.
  - **Information Disclosure:** PII/secret detection and redaction before audit persistence/export.
  - **Denial of Service:** query budgets, provider result caps, fan-out/search-rate caps, timeout/degraded states.
  - **Elevation of Privilege:** external search text cannot become instructions; execution rails validate tool inputs/outputs before the agent acts on them.
- **Implementation shape.**
  - Add a pure `SkillGuardrailEnvelope` in the runner and call it around oracle skills first: `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search`, then `dedupe-and-rank`.
  - Store rail output inside existing `skill_call.payload.guardrails` first. Avoid inventing a new event kind until the data model proves stable.
  - Add a shared redaction helper used by audit JSONL, source registry, Red Queen log summary, and audit export.
  - Add optional NeMo config under a versioned path (for example `.caterpillar/guardrails/oracle/`) with a config hash recorded in each verdict. If NeMo is unavailable, deterministic rails still run and the semantic rail reports `not-invoked`, not `pass`.
- **Acceptance.**
  - Fixture tests for malicious query strings, prompt-injection snippets, malformed/private URLs, PII in provider snippets, secret-like tokens, oversized result sets, and safe happy paths.
  - A WHY run with hostile fixture provider results passes only when unsafe text is quarantined/redacted and the artifact cites only registry-safe sources.
  - Audit export shows a compact guardrail summary: inputs blocked/warned, result chunks blocked/warned, PII classes redacted, and exact rule ids.
  - No raw PII/secret fixture value appears in audit JSONL, source registry, report export, or PR comment.
- **Design docs to read first.**
  - [`agentic-sdlc-marketresearcher.md`](agentic-sdlc-marketresearcher.md) -- oracle/search skill protocol and source-registry expectations.
  - [`audit-event-shape.md`](audit-event-shape.md) -- event-kind/origin contract; start with `skill_call.payload.guardrails` rather than new event kinds.
  - [`governance-redqueen.md`](governance-redqueen.md) -- Red Queen action gate; T2.5d complements it rather than replacing it.
- **Sequencing.** Build deterministic rails first, prove them with fixtures, then add optional NeMo semantic rails. Start with WHY oracle skills; extend to implementation/code skills only after the source-registry and audit-retention contracts are stable.

---

## Tier 3 · Auditor hardening

The trust-posture work that fell out of the seven Codex chief-auditor rounds during Phase E. Some have full specs in [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md); others are sketched and need design before code.

### T3-1 · Knight's Seal v2 -- cosign / sigstore anchoring

- **Goal.** Replace v1's per-epoch ephemeral Ed25519 keypair (committed to mesh as `audit/keys/<runId>.epoch-N.pub.pem`) with a persistent GitHub-App-anchored identity in the sigstore transparency log via cosign. A third-party verifier can confirm "this artifact was signed by *the App* during the OKR's WHAT phase merge window" without trusting the audit log's contents.
- **Why.** v1's trust posture is "you trust the public keys committed in the mesh repo itself." For internal audit + regulator self-attestation, that's enough. For (a) third-party verifiability (EU AI Act Article 12 interpretation by an audit firm), (b) cross-org artifact consumption (one org's OKR feeds another org's mesh), or (c) a real supply-chain incident exposing the embedded-key weakness, v2 is the answer.
- **Acceptance.** `verify-chain` skill grows a `--cosign` mode that calls `cosign verify-blob` against the transparency log instead of (or in addition to) the embedded public key. Whole-OKR rollup's verifier-notes section carries both shell commands. At least one production OKR has its WHAT phase signed with v2 and the rollup proves it third-party verifiably.
- **Design docs to read first.**
  - [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §2 (the v1→v2 evolution path is here).
  - [`agentic-sdlc.md`](agentic-sdlc.md) §11.5 (v1 spec; v2 is a drop-in for the signing call site).
  - sigstore docs: <https://docs.sigstore.dev/cosign/overview/>
- **Triggers landing this.** (a) regulatory ask for third-party verifiability, (b) cross-org artifact consumption, (c) a real-world supply-chain incident. **None of these are present today** -- v2 is genuinely queued, not actively being built. Reserve here so we don't rebuild the seam.
- **Hardening lessons to apply.**
  - **Both modes coexist.** Don't break v1 verification -- v2 is additive. Old chains with `signer_epoch` ≥ 1 still verify under v1; new chains carry a `seal_version: 2` marker and verify under cosign.
  - **The runner is the single source of truth.** v2 verification logic lives in the runner's `audit-verify-chain` Skill, not in the extension. The extension shells out to the runner exactly as it does today.

### T3-2 → promoted to Tier 2.5 (see above)

### T3-3 · Redacted external bundle (zip for regulators)

- **Goal.** A `Export Redacted Bundle` button on the whole-OKR rollup that emits a single zip containing the rollup + per-phase artifacts + verifier-notes + a redacted copy of the audit chain JSONL, with PII / IP / secrets scrubbed via a documented + auditable redaction policy.
- **Why.** Today the rollup is *self-contained* -- every file path it cites lives in the mesh repo -- but the mesh repo is *internal*. Handing the rollup to a regulator means handing them a zip that they can verify offline against a documented scrub policy.
- **Acceptance.** Bundle includes: `README.md` (what's in here + how to verify), `rollup.md`, `phases/{why|how|what}/{artifact,chain-events}.{md,jsonl}`, `keys/<epoch-N>.pub.pem` (or sigstore-transparency-log reference under T3-1), `verify.sh` (runs `npx audit-verify-chain`), `redaction-policy.md` (documented rules + diffs of what was redacted). Verifier runs `verify.sh` from a fresh shell and gets the same verdict as the source-of-truth.
- **Design docs to read first.**
  - [`agentic-sdlc.md`](agentic-sdlc.md) §11.7 (existing Audit Report Export bundle spec).
  - [`governance-prompt-packs.md`](governance-prompt-packs.md) -- documented + machine-checkable governance pattern.
  - [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §4.
- **Hardening lessons to apply.**
  - **Redaction is an audit event itself.** Every export emits a signed `audit_redaction` event on the chain naming which fields were redacted.
  - **No silent gaps.** Bundle export REFUSES if an artifact can't be redacted safely.
  - **Bundled verify script = pinned runner version.** Don't write a new verifier; pin a version.

### T3-4 · Org-separation on dual-signature override

- **Goal.** Enforce that the two signers on a Restricted-tier dual-signature override come from organizationally separated humans. Same DID, same-team, reports-to → reject with discriminated reasons.
- **Why.** Dual-signature override is the escape hatch for Restricted tier. Without org-separation enforcement, the two-person rule is bypassable.
- **Acceptance.** `dual-signature-override.yaml` write rejects with `signers-not-org-separated: <reason>` if (a) same human via `did:gh:installation:<id>`; (b) same single GitHub team; (c) one reports to the other per `governance-org-graph.yaml`. Audit event `override_signed` carries org-separation proof.
- **Design docs to read first.**
  - [`agentic-sdlc.md`](agentic-sdlc.md) §10.9 (Dual-Signature Override UX flow).
  - [`agentic-sdlc.md`](agentic-sdlc.md) §13 `dual-signature-override` label entry + line 1779 audit YAML contract.
  - [`governance-redqueen.md`](governance-redqueen.md) §4.5.
- **Hardening lessons to apply.**
  - **Discriminated rejection reasons.** Each failure mode maps to a distinct fix path.
  - **Proof on chain.** `override_signed` carries the org-graph evidence used.
  - **Graceful degrade.** Missing org-graph → fall back to "two distinct DIDs from different teams" with weaker proof recorded.

### T3-5 · Prompt-pack signature verification on load

- **Goal.** Mesh repos refuse to load unsigned prompt packs from `.caterpillar/prompts/` (or `.cheshire/prompts/` on the code-repo side).
- **Why.** Prompt packs ARE the policy surface. Unsigned packs are a supply-chain vector.
- **Acceptance.** Mesh redeploy refuses unsigned packs. Agent dispatch emits `pack_signature_verified` audit event before first skill call. Tampered packs → `pack-signature-invalid` refuse.
- **Design docs to read first.**
  - [`governance-prompt-packs.md`](governance-prompt-packs.md).
  - [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §2.
  - [`agentic-sdlc.md`](agentic-sdlc.md) §6.
- **Dependencies.** T3-1 (cosign anchoring) must land first.
- **Hardening lessons to apply.**
  - **Per-event signing on the verification event.**
  - **Bottom-up walker for pack-set verification.**
  - **No fallback to unsigned on missing-pack-key.**

### T3-6 (open research) · Prompt injection from external research

- **Goal.** During WHY phase, `market-research-agent` calls `web-search` Skills that return external content. An attacker who controls a search result can inject prompt-injection payloads. Today the agent's prompt boundary + persona-switch self-critique are the only defenses.
- **Open research, not a build.** Candidates: sandboxed content classifier, structured-output-only agent pattern, red-team adversarial corpus. **Don't build any of these yet.** Reserve here.

### T3-7 (out of scope) · LLM-provider audit blind spot

- **Goal.** None. Captured as explicit non-goal: we cannot verify what the underlying LLM provider does between input prompt and output text.
- **Why this is out of scope.** Closing this requires running our own inference (explicit non-goal) or provider-side audit features that don't exist today. Documented; not built.

---

## Cross-cutting hardening lessons (from Phase E's 7 Codex rounds)

Every Tier 2 + Tier 3 work-item should apply these.

| Lesson | What it is | Where to apply |
|---|---|---|
| **Per-input source tracking** | `AuditReportInputSources` pattern: track provenance per input, not as a single bundled string | D-PR8 implementation-chain rollup, T2.5 cross-repo extension, T3-3 redacted bundle manifest |
| **Discriminated unions for fetch results** | `getRepoFileStatus` returns `ok | not-found | fetch-error` -- never collapse to `null` | D-PR4 pre-flight (harness detection, permissions, repo existence), D-PR5 per-row PR polling, T2.5 cross-repo chain reads |
| **No parallel verifier logic** | Always reuse the per-action paths -- don't write a second verifier | T3-1 cosign mode is a flag on the same Skill, T2.5 extends for cross-repo, T3-3 bundles a pinned version |
| **Suppress-non-canonical** | If an input can't be vouched for as canonical, don't silently fall back to local -- name the gap | D-PR4 coordination read (refuse if absent), T2.5 implementation-chain canonicity, T3-5 prompt-pack signature missing-key |
| **Bottom-up walker for parsing** | When parsing stdout / event streams, walk bottom-up and emit per-line discriminated results | T3-5 pack-set verification output, T2.5 per-repo chain verify aggregation |
| **Verdict precedence FAIL > PARTIAL > PASS** | Use the same predicate shape across new verdict surfaces | D-PR8 implementation-chain rollup verdict, T2.5 extension, T3-3 bundle integrity |
| **Compose helpers tested in isolation** | Pure functions over input shapes; integration only at the seams | D-PR3 render Skill, D-PR4 topological sort + pre-flight derivation, D-PR4-prep coordination verifier, D-PR8 verdict computer |
| **Honest gap surfacing** | Every new failure class names what went wrong, why, and what to do | D-PR4 pre-flight reasons, D-PR4-prep coordination rejection reasons, D-PR5 status rendering, T3-3 bundle-refuse cases, T3-4 org-separation reasons |
| **Per-event signing on every new event kind** | Every new event kind carries `signer_epoch` + Ed25519 signature; CI verify-chain verifies them | T2.5 cross-repo, T3-3 redaction, T3-5 pack-verification, future `fan_out_recorded` |
| **Atomicity break is its own verdict class** | When inputs claim canonical but local doesn't match, that's FAIL not PARTIAL | T2.5 cross-repo: mesh canonical but implementation-chain local-fallback → FAIL |
| **Do not invent app-emitted event kinds** | Adding a new event kind is a real design exercise (origin contract, CLI enum, verifier rules) | D-PR4 uses `design-fan-out.yaml` git history as MVP audit record; `fan_out_recorded` reserved for later |
| **Do not change the canonical 10 H2s in WHAT** | New content goes in frontmatter + H3 subsection inside section 10 | D-PR4-prep adds `depends_on`/`provides`/`consumes` to per-repo frontmatter + `### Cross-Repo Coordination` H3 |

---

## Design-document map

| Work item | Primary design docs | Supporting docs |
|---|---|---|
| **D-PR3** knowledge-reference-repos | **[`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D5+D6+Brownfield-vs-Greenfield section** | [`agentic-sdlc.md`](agentic-sdlc.md) §6 + §11.2 |
| **D-PR4-prep** coordination contract | **This doc's Tier 2 architecture key call #4** + [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D7 (workflow H2 verifier) | [`agentic-sdlc.md`](agentic-sdlc.md) §13 D-PR1.v1.x bug log pattern; `phaseSpec.test.ts:402` REQUIRED_H2 contract |
| **D-PR4** Looking Glass fan-out engine | **This doc's Tier 2 architecture key calls #1, #3, #4, #5** + [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) Hand-off section (needs rewrite as part of this PR) | [`LookingGlassPanel.ts:2197-2234`](../src/webview/LookingGlassPanel.ts), [`LookingGlassPanel.ts:5278-5347`](../src/webview/LookingGlassPanel.ts), [`GitHubService.ts:601`](../src/services/GitHubService.ts), [`ScaffoldPanel.ts:280,374`](../src/webview/ScaffoldPanel.ts), [`audit-emit-event/SKILL.md:26`](../code-templates/skills/audit-emit-event/SKILL.md), [`skills.ts:1875`](../../packages/research-runner/src/runner/skills.ts) |
| **D-PR5** Stage 5 fan-out card | **This doc's Tier 2 architecture key call #4** + [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D10 | [`agentic-sdlc.md`](agentic-sdlc.md) §13 D10/D11 |
| **D-PR6** E2E smoke | **This doc end-to-end** + [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D12 | [`demo-script-sdlc-walkthrough.md`](demo-script-sdlc-walkthrough.md), [`agentic-sdlc.md`](agentic-sdlc.md) §13 E section (live cert-run pattern) |
| **D-PR7** implementation-agent template | **This doc's Tier 2 architecture key call #2** + [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D8 (persona-switch self-critique) | [`audit-event-shape.md`](audit-event-shape.md), [`audit-emit-event/SKILL.md`](../code-templates/skills/audit-emit-event/SKILL.md), [`GitHubService.ts:601`](../src/services/GitHubService.ts) |
| **D-PR8** implementation chain in rollup | **[`agentic-sdlc.md`](agentic-sdlc.md) §11.6 + §11.7** | T2.5 spec (downstream hardening) |
| **T3-1** Knight's Seal v2 | **[`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §2** | [`agentic-sdlc.md`](agentic-sdlc.md) §11.5; cosign docs |
| **T2.5** Red Queen signed enforcement chain | **[`governance-redqueen.md`](governance-redqueen.md) §2 + §4.5 + §4.5.1** | D-PR8 (builds on); [`agentic-sdlc.md`](agentic-sdlc.md) §11.6, [`audit-event-shape.md`](audit-event-shape.md) |
| **T2.5d** Oracle Guardrails + Privacy Rails | **This doc's T2.5d section** + [`agentic-sdlc-marketresearcher.md`](agentic-sdlc-marketresearcher.md) | [`audit-event-shape.md`](audit-event-shape.md), [`governance-redqueen.md`](governance-redqueen.md), source-registry hardening from WHY cert runs |
| **T3-3** Redacted external bundle | **[`agentic-sdlc.md`](agentic-sdlc.md) §11.7** | [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §4, [`governance-prompt-packs.md`](governance-prompt-packs.md) |
| **T3-4** Org-separation override | **[`agentic-sdlc.md`](agentic-sdlc.md) §10.9** | [`governance-redqueen.md`](governance-redqueen.md) §4.5, [`agentic-sdlc.md`](agentic-sdlc.md) §13 line 1779 |
| **T3-5** Prompt-pack signature | **[`governance-prompt-packs.md`](governance-prompt-packs.md) + [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §2** | [`agentic-sdlc.md`](agentic-sdlc.md) §6 |
| **T3-6** Prompt injection from external | **[`agentic-sdlc-marketresearcher.md`](agentic-sdlc-marketresearcher.md)** | [`agentic-sdlc.md`](agentic-sdlc.md) §11 threat model |
| **T3-7** LLM-provider blind spot | n/a (out-of-scope capture) | [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §7 |

---

## Suggested sequence

**Track A -- Tier 2 (≈4-5 weeks if focused):**

1. **D-PR4-prep first** (4-6 days; now larger after Codex review). Six sub-tasks:
   - 4-prep.1 -- design-bus.yml language fixes in agent.md (lines 38, 268)
   - 4-prep.2 -- synthesis.md Hatter Tag nesting (line 423) + sweep for other top-level refs
   - 4-prep.3 -- coordination contract in §10 H3 + per-repo frontmatter + the seven rules in agent prompt
   - 4-prep.4 -- coordination verifier in audit-and-drift workflow (7 named failure conditions; YAML parser, not regex)
   - 4-prep.5 -- live regeneration of sample-OKR WHAT (validation; produces the new baseline for D-PR4 + D-PR6)
   - 4-prep.6 (optional) -- live regeneration of sample-OKR HOW for cleanest baseline (removes the C3-undefined + `/tmp/prd-run/...` residue Codex flagged)
2. **D-PR3 in parallel with D-PR4-prep** (1-2 days). Independent; lands the reference-repos Skill so greenfield WHAT runs have exemplar grounding.
3. **D-PR4** (5-8 days). The heaviest piece. Looking Glass fan-out engine: pre-flight, topological sort, brownfield/greenfield/needs-retrofit branching, Cheshire integration for greenfield, direct-commit-to-main of `design-fan-out.yaml` guarded by `MeshBranchGuard`. **Includes the architecture-doc cleanup spill (Hand-off section in codedesigner.md, the misleading "queued for D-PR4" comment at codeRepoTemplates.ts:561, TargetRepoStatusSchema comments, D9 spec).**
4. **D-PR5** (3-4 days). Stage 5 card with live polling + auto-advance.
5. **D-PR7** (3-5 days). Implementation-agent template + Cheshire-install. Can run in parallel with D-PR5 (independent surfaces).
6. **D-PR8** (2-3 days). Implementation chain in rollup. Depends on D-PR5 + D-PR7 being functional.
7. **D-PR6** (1-2 days). Live E2E smoke against the clean baseline from D-PR4-prep.5 (+ optionally 4-prep.6). Closes Tier 2.

**Track B -- Tier 3 (parallel-able after Tier 2; T3-1 first):**

1. **T3-1** (Knight's Seal v2) -- prerequisites for T3-5; valuable on its own. ~1 week with sigstore integration testing.
2. **T2.5a** (Red Queen signed chain) -- depends on Tier 2's D-PR8 cross-repo threading. ~1-2 weeks.
3. **T2.5d** (Oracle Guardrails + Privacy Rails) -- can run alongside Queen's Next Act testing after T2.5a is stable; deterministic runner envelope first, optional NeMo rails second. ~1 week for oracle-skill MVP.
4. **T3-5** (prompt-pack signing) -- after T3-1 ships. ~3-5 days.
5. **T3-3** (redacted bundle) -- depends on T2.5. ~1 week.
6. **T3-4** (org-separation override) -- independent; ~3-5 days.
7. **T3-6** + **T3-7** -- research/non-goal capture.

**Don't sequence the Codex review rounds.** Treat them as continuous -- each PR gets a chief-auditor read before merge, same posture as Phase E.

---

## Done-done definitions

### Tier 2 done-done

- [ ] D-PR3 shipped: `knowledge-reference-repos` Skill present + tested + invoked by `code-design-agent` on a greenfield run.
- [ ] D-PR4-prep shipped: code-design-agent emits `depends_on`/`provides`/`consumes` per-repo frontmatter + `### Cross-Repo Coordination` H3 inside section 10; workflow verifies all 7 coordination checks from 4-prep.4 with a real YAML parser. Canonical 10 H2s untouched.
- [ ] D-PR4 shipped: Looking Glass fan-out engine -- pre-flight (harness presence + permissions + dependencies + repo state), topological-ordered landing-issue creation via `assignCustomCopilotAgent`, brownfield-no-harness refusal with "open in workspace" deflection, greenfield → create + clone + add-to-workspace + Cheshire greenfield mode → landing issue, direct-commit-to-main of `design-fan-out.yaml` guarded by `MeshBranchGuard`. Doc cleanup spill done.
- [ ] D-PR5 shipped: Stage 5 card renders live from `design-fan-out.yaml`, polls target repos for impl PRs, auto-advances waves when upstream merges.
- [ ] D-PR6 shipped: live E2E smoke on IMDB-Celebs sample with 1 brownfield-with-harness + 1 brownfield-needs-retrofit (manual user retrofit) + 1 greenfield, linear `depends_on` chain, three impl PRs landing in waves, whole-OKR rollup ✅ PASS with implementation chain section populated.
- [ ] D-PR7 shipped: `.github/agents/implementation-agent.agent.md` template installed by Cheshire (retrofit + greenfield), Tweedles persona-switch self-critique, Hatter Tag continuation contract on PR body. NO workflow YAML.
- [ ] D-PR8 shipped: whole-OKR rollup `## Implementation chain` section, `chain-ladder.yaml` extended with implementation rows, verdict predicate includes cross-repo PR state.
- [ ] [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D5/D9/D10/D11/D12 all flipped to shipped or rewritten to match the app-orchestrated model.
- [ ] Marketing page "Live-run proof" block updated with the WHAT + fan-out + implementation verdict.

### Tier 2.5 done-done (Queen's Next Act)

- [x] **T2.5a shipped + cert-verified (celeb-api PR #14).** Shipped as a **signed-prefix seal** (not per-decision chaining — the log is a live append-only sidecar): the finalize-time signer seals the prefix it read (`covered_bytes` + `covered_sha256`) into one signed `redqueen_decisions` event on the IMPL chain; the impl-provenance gate re-hashes that prefix at the merge SHA and **gates on a mismatch**, naming the post-seal tail as advisory; the whole-OKR rollup re-verifies independently + renders the per-target-repo `## Implementation chain (Red Queen)` section. Cert verdict: *signed & verified · 32 decisions sealed · 3 post-seal, allow-only*.
- [ ] T2.5b shipped/captured: `redqueen-action` standalone hard gate (AST + contract diffs) as a required status check.
- [ ] T2.5c shipped/captured: cross-chain inclusion proofs + SIEM/CloudEvents export.
- [ ] T2.5d shipped/captured: Oracle Guardrails + Privacy Rails wrap oracle skills and audit/export retention. Deterministic rails enforce query/result/source-registry/synthesis/privacy checks; optional NeMo semantic rails are recorded with config/model hashes and never become the only hard gate. No raw PII/secret fixture values persist in audit JSONL, source registry, rollup, or PR comments.

### Tier 3 done-done (auditor hardening)

- [ ] T3-1 shipped: At least one OKR's WHAT phase signed with cosign-anchored Knight's Seal v2; rollup verifier-notes carries both v1 + v2 commands.
- [ ] T3-3 shipped: `Export Redacted Bundle` produces a regulator-ready zip with documented redaction policy + verify.sh + audit event.
- [ ] T3-4 shipped: Dual-signature override enforces org-separation with discriminated rejection reasons.
- [ ] T3-5 shipped: Mesh refuses unsigned packs; dispatch emits `pack_signature_verified`.
- [ ] T3-6 captured as open research with documented status.
- [ ] T3-7 captured as out-of-scope.

---

## Notes for tomorrow's start

- **First move: D-PR4-prep** (now 6 sub-tasks per Codex review). Two of them are pre-existing prompt bugs (4-prep.1 design-bus.yml language at agent.md lines 38+268; 4-prep.2 Hatter Tag nesting at synthesis.md:423) that need to ship inside this commit so the next sample WHAT regeneration is clean. 4-prep.5 (sample WHAT regeneration) is the validation step that gates the merge.
- **Order within D-PR4-prep:** verifier first (4-prep.4 in isolation, YAML fixtures, 10-12 test cases), then prompt fixes (4-prep.1 + 4-prep.2), then coordination contract (4-prep.3), then live regeneration (4-prep.5), optionally HOW regeneration (4-prep.6).
- **Second move: D-PR3 in parallel.** Independent; no shared files. Two devs (or two sessions) can land both before D-PR4 begins.
- **D-PR4 is the heaviest piece** but its scope is now scoped correctly: orchestrate, don't execute. Cheshire owns scaffold, custom-agent API owns dispatch, GitHub owns the repos, the engine orchestrates and records.
- **Don't claim signed app-side events for Tier 2.** `design-fan-out.yaml` git history is the audit trail. Reserve `fan_out_recorded` as a real event kind when its trust posture matters enough to design properly (probably with T2.5).
- **Don't change the canonical 10 H2s in code-design.** New machine-readable fields go in per-repo frontmatter + a new H3 subsection inside section 10. The `phaseSpec.test.ts:402` REQUIRED_H2 contract is a load-bearing test surface -- touching it reopens 50+ tests.
- **Topological gating is non-negotiable for MVP.** Pure-parallel + mock-and-revise (my earlier draft) ships mocks to main. The course correction is in this doc: dependencies land first, dependents wait.
- **Keep the source-atomicity discipline.** Every new input to the rollup verdict gets per-input source tracking (`AuditReportInputSources` pattern). Don't bundle. Don't fall back silently.
- **The onboarding pack [`/docs/onboarding/04-when-things-fail.md`](../../site-tw/public/docs/onboarding/04-when-things-fail.md)** is the spec for what "honest failure" looks like in the UX. Every new failure class added in Tier 2 + Tier 3 should be representable in the triage table format that chapter uses.
- **Commit pattern stays direct-to-main on the extension side** (per the user's standing "Phase A -- no PRs" convention). Each D-PR or T3 item gets its own commit.
- **Don't bump vsce version for design-doc-only commits.** Bump on extension code changes.

---

**Read next:**
- [`agentic-sdlc.md`](agentic-sdlc.md) -- the index. Section 13 has the running PR / Bug log.
- [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) -- Phase D detail; D-PR3-D-PR6 specs live here (Hand-off section needs the D-PR4 rewrite spill).
- [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) -- Tier 3 specs (§2 cosign, §4 bundle, §7 non-goal).
- [`governance-redqueen.md`](governance-redqueen.md) -- Red Queen architecture for T2.5 integration.
- [`audit-event-shape.md`](audit-event-shape.md) -- canonical event contract; every new event kind extends this.
- [`audit-emit-event/SKILL.md`](../code-templates/skills/audit-emit-event/SKILL.md) -- origin contract per event kind; informs key call #5.
