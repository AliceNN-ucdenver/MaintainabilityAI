# Cheshire Cat v2 — the Maintenance Agent + inline Rabbit Hole

> Captured 2026-06-11; decisions locked 2026-06-11. The code-repo (Cheshire)
> side modernization that mirrors the BAR/Red Queen work in
> `governance-review-alignment.md`: retire the `@claude`/`@alice`
> `claude-code-action` remediation flow, replace it with **Alice** — a Copilot
> custom maintenance agent dispatched by name — fold the separate "Rabbit Hole"
> issue page **inline** with an agent-status banner, and **ground the RCTRO in
> the real code**. One LLM engine (Copilot / GitHub Models via `GITHUB_TOKEN`);
> no Anthropic/OpenAI keys.
>
> **Locked decisions:** (1) the agent keeps the **Alice** brand — id
> `alice-maintenance-agent`, display "Alice". (2) **`copilot-setup-steps.yml`
> stays** — it pre-caches the MongoMemoryServer binary + installs deps before
> the Copilot firewall, which the maintenance agent needs to run tests. (3)
> RCTRO grounding is **task-dependent** (scorecard/CodeQL → paths + manifest +
> metadata + target-file excerpts; new feature → discover + excerpt the most
> relevant source files from the ask). (4) Maintenance PRs are gated by the
> repo's **existing CI** + extension-side labeling — no new gate workflow. (5)
> Governance for Alice is the **deterministic Red Queen policy** the repo already
> carries (baked `.redqueen/policy.json` from the mesh + the PreToolUse hook +
> `impl-provenance.yml` — no mesh/MCP/token at runtime); the unused MCP
> "live-mesh-tools" layer (`copilot-governance-steps.yml`, `COPILOT_MCP_MESH_TOKEN`,
> `mcp-runner.js`, `.mcp.json`) is **retired** as dead weight, deferred to a
> future enhancement.

## Why this exists

The Cheshire (code-repo) side still runs the pre-agentic pattern the BAR side
just shed:

| | Today (Cheshire) | The model (BAR / Red Queen, already shipped) |
|---|---|---|
| Agent | `alice-remediation.yml` — `@claude`/`@alice` issue-comment → `anthropics/claude-code-action@v1` with `ANTHROPIC_API_KEY`, plan→approve→implement | `architecture-review-agent` persona, `assignCustomCopilotAgent(...)`, no `@`-mention, `GITHUB_TOKEN` |
| Dispatch | manual magic comment, or CodeQL issue's "Claude Remediation Zone" | one click → custom-agent assignment + structural status tracking |
| Issue body | **embeds** full OWASP/maintainability pack content in `<details>` blocks | references `.caterpillar/prompts/<id>.md`; agent reads them itself |
| UI | separate **IssueCreatorPanel** ("Rabbit Hole") page: input → Generate RCTRO → review → submit → assign → manage | inline sheet on the page + `renderAgentStatus` banner (issue#, PR#, Mark-ready, Merge) |
| Grounding | RCTRO built from **tech-stack + description only** — no files, no folders, no real frameworks | agent grounds in the actual repo at runtime |
| Keys | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` on the repo (alice consumes them) | none — Copilot / GitHub Models |
| Scaffold | ships `CLAUDE.md`, `alice-remediation.yml`, `copilot-setup-steps.yml` | removes `CLAUDE.md` + `alice-remediation.yml`; **keeps `copilot-setup-steps.yml`** (pre-firewall dep + MongoMemoryServer cache) |

Pain: two engines and two key stores; the assign step is a magic comment; the
RCTRO is ungrounded ("add caching" with no idea what files exist); the work
lives on a separate page disconnected from the scorecard; CodeQL findings sit
until someone hand-types `@claude`.

## Decisions (made 2026-06-11)

1. **One maintenance agent persona, dispatched by name.** **Alice** — a Copilot
   custom agent (id `alice-maintenance-agent`, display "Alice") — replaces
   `alice-remediation.yml`, keeping the existing brand. It takes maintenance
   tasks (CodeQL findings, coverage/dependency/complexity/tech-debt
   improvements, and plain feature requests), grounds in the repo's real code +
   `.cheshire/prompts` + `.github/repo-metadata.yml`, and opens a PR. Dispatched
   via `assignCustomCopilotAgent` from the extension and **by name** from CI.
2. **Retire the claude path + its keys.** `alice-remediation.yml` (the
   `claude-code-action` workflow) and `CLAUDE.md` leave the scaffold;
   `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` leave the Cheshire settings (and the
   `SECRETS` `mesh+code` scope). `GITHUB_TOKEN` / GitHub Models only.
   **`copilot-setup-steps.yml` STAYS** — it runs before the Copilot agent's
   firewall to install deps and pre-cache the MongoMemoryServer binary
   (`fastdl.mongodb.org` is blocked post-firewall), which Alice needs to run
   the repo's tests for coverage / CI-failure tasks.
3. **Don't embed packs in issues.** The agent reads `.cheshire/prompts/` (it
   runs in the repo). Issues reference pack paths, like the mesh side now does.
4. **Inline, not a separate page.** The "Rabbit Hole" form folds into the
   Cheshire panel as a sheet; the active maintenance issue shows in a
   `renderAgentStatus` banner with the same lifecycle one-clicks as the BAR.
5. **Ground the RCTRO in the real code.** The extension scans the selected
   folder (file tree + key files + `repo-metadata.yml`) and feeds it to the
   embedded LLM, so the generated RCTRO names real files/folders/frameworks.
   CI-created issues carry the same grounding directive so the agent grounds
   itself at runtime.

## Naming — resolved: Alice

The agent keeps the **Alice** brand it already had (`@alice`,
`alice-remediation.yml`). Alice modernizes from a `claude-code-action` workflow
into a first-class Copilot custom agent. Agent id **`alice-maintenance-agent`**
(stable for the CI `@copilot use agent …` dispatch + the persona file +
labels); UI display **"Alice"**.

## Target architecture

### The persona: `alice-maintenance-agent` (`.github/agents/*.agent.md`)

New `code-templates/agents-v4/alice-maintenance-agent.agent.md`, scaffolded into
the **code repo** (not the mesh) by Cheshire "Scaffold SDLC" / "Deploy". **Alice
— the Copilot code-maintenance agent:**

- **Grounds in evidence:** it runs inside the repo, so it reads the actual
  files. It MUST read `.github/repo-metadata.yml` (language / module_system /
  testing / package_manager / framework / database) and the relevant
  `.cheshire/prompts/<category>/<id>.md` packs before changing code — the packs
  are the method (OWASP remediation patterns, maintainability rules, STRIDE),
  not embedded context.
- **Task kinds** (from the issue's label):
  - `codeql-finding` → remediate the vulnerability following the mapped OWASP
    pack; cite the rule id + file:line.
  - `rctro-feature` → implement the RCTRO (Role/Context/Task/Requirements/
    Output) in the issue body, grounded in the cited files.
  - `improve-coverage` / `improve-dependencies` / `reduce-complexity` /
    `address-tech-debt` → the scorecard-derived maintenance tasks.
  - `ci-failure` → fix the failing build/test.
- **Output contract:** branch + PR that closes the issue (first line of the PR
  body MUST be `Closes #<N>` — the BAR lesson: Copilot omits it and the issue
  never closes). Summary in the PR description. Don't comment on the issue
  (sandbox 403). The PR runs the repo's existing gates — `ci.yml`, `codeql.yml`,
  `fitness-functions.yml` — so maintenance changes are verified by the repo's
  own pipeline (no new bespoke gate needed; that's the difference from the
  review agent, whose artifact had no other gate).
- **Honesty:** never fabricate file paths — cite only files it has read; name
  any task it can't complete rather than silently partial-fixing.

### Dispatch (the OKR/BAR pattern, verbatim)

**From the extension** (Cheshire panel — Create feature / Improve *):
1. Build the issue body (RCTRO + pack references + `repo-metadata` context),
   create it with the task label.
2. `assignCustomCopilotAgent(owner, repo, issueNumber, 'alice-maintenance-agent',
   { baseBranch })` with the OKR-style generic fallback (`copilot-swe-agent[bot]`
   + `@copilot use agent alice-maintenance-agent`).
3. Persist `issueNumber` on the active-issue record; track issue→PR with the
   structural resolver (`getClosingPrNumbers`) + `AgentStatusService` — the same
   one the BAR uses.

**From CI** (`codeql-to-issues.yml`): after `process-codeql-results.cjs` creates
the finding issue, the workflow dispatches the agent **by name**. A GitHub
Actions job can't call the extension's body-extension API, so it uses the same
fallback the extension uses when the custom-agent API is unavailable: assign
`copilot-swe-agent[bot]` and post `@copilot use agent alice-maintenance-agent`
(one comment, the only place an `@copilot` mention remains — and it's the
documented activation, not a human magic word). The issue body already
references `.cheshire/prompts/` and `repo-metadata.yml`, so the agent grounds
itself.

### Inline Rabbit Hole + active-issue banner

The separate `IssueCreatorPanel` page is retired; its function moves onto the
Cheshire panel (the Scorecard view becomes the hub):

- **Active-issue banner** at the top — `renderAgentStatus(status, {
  lifecycleActions: true })` from `app/agentStatus.ts` (the BAR component,
  reused as-is): issue link, live phase chip, **Approve workflow run**, **Mark
  PR ready**, **Merge**. Backed by `AgentStatusService.detectForRepo(...)` (the
  repo-scoped sibling of `detectForBar`).
- **Inline Rabbit Hole sheet** — clicking **Create feature**, **Improve
  coverage**, **Improve dependencies**, **Reduce complexity**, or **Address
  tech debt** opens an inline sheet on the page (the BAR `renderReviewSheet`
  pattern): description textarea (pre-filled for the scorecard actions),
  derived prompt packs (from the task + `repo-metadata`), a **Generate RCTRO**
  preview, and one **Dispatch** button. No modal page, no separate webview.
- **Dispatch flow** = create issue → assign `alice-maintenance-agent` → banner
  lights up → PR draft → Mark ready → Merge. Identical to the BAR review loop.
- The existing `IssueMonitorService` polling is replaced by
  `AgentStatusService` + the structural issue→PR resolver (one mechanism for
  both sides).

### Grounded RCTRO (the big fix)

**Today** `generateRctro(description, techStack, packContents)` builds
`"## Tech Stack … ## Feature Description …"` — it knows the *language* but not
the *codebase*. A "blind feature" produces generic requirements that name no
real files.

**v2** the extension grounds it (it has filesystem access to the folder), and
the depth is **task-dependent** (locked decision):

1. **Scan the selected folder** into a compact **repo context**. The baseline
   (every task) is paths + manifest + metadata: the file tree (depth-bounded,
   gitignore-aware), `repo-metadata.yml`, and the manifest (package.json /
   pyproject). Then, by task kind:
   - **Scorecard actions + CodeQL** (`improve-*`, `codeql-finding`): include
     **excerpts of the already-known target files** — the sub-80% coverage
     files, the complexity hotspots, the outdated-dependency manifest, the
     CodeQL-flagged file:line snippet. We already have these from the
     scorecard/SARIF, so no discovery needed. (`process-codeql-results.cjs`
     applies the same baseline for the CI issue.)
   - **New / blind feature** (`rctro-feature`): **discover + excerpt the most
     relevant source files from the ask** — heuristic match of the description's
     terms against the file tree + entry points (the way Copilot would pick
     files anyway), then excerpt those. Cap the bytes; prefer paths + small
     excerpts over whole files.
2. **Feed it to the RCTRO prompt** as a `## Repository Context` block so the
   embedded LLM writes Context/Requirements that reference real files, folders,
   and the actual framework (e.g. "add a `withCache` wrapper in
   `src/services/movieApi.ts`, tested with the repo's Jest setup"). The prompt
   states plainly: *ground every requirement in the listed files; do not invent
   paths.*
3. **CI parity:** `process-codeql-results.cjs` can't run the embedded LLM, but
   it already has the file + line + snippet from the SARIF, and it references
   `.cheshire/prompts/` + `repo-metadata.yml`. The CI issue carries an explicit
   *"ground your plan in the cited file(s) and the repo's `repo-metadata.yml`;
   read `.cheshire/prompts/` for the remediation pattern"* directive, so the
   **agent** does the grounding at runtime (it has the whole repo). So both
   paths end grounded — the extension grounds the *issue*, the agent grounds the
   *work*.

`onGenerate` already detects the stack and resolves `this.folderPath`; the scan
slots in there. The grounding is **embedded-LLM-side** (no network), matching
"since we're using the embedded llm we should be able to make that clear."

### `repo-metadata.yml` everywhere

`.github/repo-metadata.yml` (language / module_system / testing /
package_manager / framework / database / llm.model_family) becomes the single
grounding handoff: the RCTRO scan reads it, the issue body cites it, and the
persona is told to read it first. The scaffold already always-writes it; keep
that.

### Red Queen governance — deterministic policy, provisioned from the mesh

Alice is governed by the **Red Queen's Court** the repo already carries — the
*deterministic policy* model documented at `/docs/red-queens-court`. It is
self-contained and needs no mesh path, MCP server, or token at runtime
(verified end-to-end on celeb-api, 2026-06-11):

1. **Provision (mesh → repo, at scaffold/Deploy time).** The extension reads
   the BAR's tier + governance rules **from the mesh** and bakes them into the
   code repo as committed `.redqueen/policy.json` + `.redqueen/decision.json`.
   The mesh is consumed ONLY here — `policy.json` is a deterministic snapshot
   of the mesh's decision, carried by the repo. Re-provision when the BAR tier
   changes.
2. **Enforce (runtime, in-repo, deterministic).** Every tool call passes the
   PreToolUse hook — `.github/hooks/redqueen.json` (Copilot) /
   `.claude/settings.json` (Claude Code) → `.redqueen/hooks/validate-tool.sh`
   → `validate-tool.js`, which reads the LOCAL `policy.json` and allows/denies
   (fail-closed), appending to `.redqueen/audit-log.jsonl`. No network, no mesh.
3. **Prove (merge time).** `impl-provenance.yml` re-hashes the committed chain
   at the merge SHA and gates on a mismatch (the signed enforcement chain
   tested on the celeb-api fan-out).

**Alice inherits this unchanged** — her PR runs under the same baked policy +
hook + impl-provenance + CI. No new governance plumbing.

### Retire the MCP "live mesh tools" layer (unused — and the source of the confusion)

A separate, OPTIONAL layer would let an agent *query the live mesh mid-run* via
the Red Queen MCP server. It is **unused and unwired** — and it's exactly the
part that read as "is the Red Queen even on?" Retire it now (revisit only as a
future enhancement; the deterministic policy above is the governance):

- `.github/copilot-governance-steps.yml` — a generated **manual-merge snippet**
  (checkout mesh + start the MCP server) that was never merged into any repo's
  `copilot-setup-steps.yml`. Stop generating it.
- `COPILOT_MCP_MESH_TOKEN` — referenced ONLY inside that snippet; no
  provisioning UI, run by nothing. Drop the reference.
- `.redqueen/mcp-runner.js` + `.mcp.json` — the local Claude-Code MCP-tools
  launcher; needs a mesh path the scaffold only writes as a portable
  placeholder (`./governance-mesh`), so it can't resolve locally anyway. Stop
  scaffolding both (the enforcement hook is independent and stays).

What STAYS (the live governance, untouched): `.redqueen/policy.json`,
`decision.json`, `governance-context.md`, `.redqueen/hooks/validate-tool.{sh,js}`,
`.github/hooks/redqueen.json`, `.claude/settings.json` (minus the MCP server
entry), and `impl-provenance.yml`. The `config-manifest.yaml` keeps fingerprints
for what remains and drops the retired files.

## Scaffold changes

`ScaffoldPanel` file set (the `SCAFFOLD_OPTIONS` list + `runScaffold`):

| File | v2 |
|---|---|
| `CLAUDE.md` (`claude-md`) | **removed** — replaced by the agent persona + repo-metadata; Copilot reads the persona, not CLAUDE.md |
| `.github/workflows/alice-remediation.yml` (`alice-remediation`) | **removed**, replaced by `.github/agents/alice-maintenance-agent.agent.md` (`maintenance-agent` option) |
| `.github/copilot-setup-steps.yml` (`copilot-setup`) | **kept** — runs before the Copilot firewall to `npm ci` + pre-cache the MongoMemoryServer binary; Alice needs it to run the repo's tests (coverage / CI-failure tasks) |
| `.github/repo-metadata.yml` | **kept** (always written) |
| `.cheshire/prompts/**` (`prompt-packs`) | **kept** — now the agent's methodology source, not issue-embed fodder |
| `codeql.yml` / `codeql-to-issues.yml` + automation | **kept**, but `process-codeql-results.cjs` stops embedding pack bodies, drops the "Claude Remediation Zone", and the workflow dispatches `alice-maintenance-agent` by name |
| `.redqueen/policy.json` / `decision.json` / `governance-context.md` / `hooks/validate-tool.{sh,js}` + `.github/hooks/redqueen.json` + `impl-provenance.yml` | **kept** — the live deterministic Red Queen governance (see above) |
| `.github/copilot-governance-steps.yml` | **removed** — orphaned MCP-tools snippet, never merged into `copilot-setup-steps.yml` |
| `.redqueen/mcp-runner.js` + `.mcp.json` | **removed** — MCP "live mesh tools" launcher; unused, can't resolve the mesh locally; deferred to a future enhancement |
| `ci.yml` / `fitness-functions.yml` / PR template / SECURITY.md | unchanged |

Deprecated-file prune: add `CLAUDE.md`, `alice-remediation.yml`,
`.github/copilot-governance-steps.yml`, `.redqueen/mcp-runner.js`, and `.mcp.json`
to a Cheshire-side prune list so "Scaffold/Deploy" removes them from
already-scaffolded repos (mirror `DEPRECATED_MESH_FILES`). NOT
`copilot-setup-steps.yml` — it stays. The MCP-server entry in
`.claude/settings.json` is dropped, but its PreToolUse hook entry stays.

## Settings cleanup (Cheshire side)

- Remove the Scaffold "Configure ANTHROPIC_API_KEY secret after creation"
  toggle + its post-scaffold secret push.
- Drop `anthropic` / `openai` from `SECRETS` once `alice-remediation` is gone
  (they had `scope: 'mesh+code'` solely for it). The Scorecard's
  `configureSecrets('workspace')` path then manages only repo-relevant secrets
  (none required for the maintenance agent — it uses the Actions `GITHUB_TOKEN`
  / the `copilot` environment).
- The Looking Glass side already dropped these (see
  `8c89aa0`); this is the symmetric Cheshire cleanup.
- **`COPILOT_MCP_MESH_TOKEN`** — drop the only reference (the generated
  `copilot-governance-steps.yml` snippet). It had no provisioning and was run by
  nothing; the deterministic policy needs no token.

## Migration phases (each independently shippable, gates green)

**Phase 1 — the spine (no UI change):** `alice-maintenance-agent.agent.md` +
scaffold wiring (add persona option; remove `CLAUDE.md` + `alice-remediation.yml`;
retire the MCP-tools layer — `copilot-governance-steps.yml`, `mcp-runner.js`,
`.mcp.json`, the `COPILOT_MCP_MESH_TOKEN` reference, the `.claude/settings.json`
MCP entry — and add them to the prune list; KEEP `copilot-setup-steps.yml` and
the deterministic policy/hook/impl-provenance files); `codeql-to-issues` +
`process-codeql-results.cjs` stop embedding packs, drop the `@claude` zone,
dispatch the agent by name; the grounded-RCTRO folder scan in `onGenerate`.
Smoke: scaffold a repo, confirm the baked `.redqueen/policy.json` + PreToolUse
hook still validate, trip a CodeQL finding, watch Alice get dispatched and open
a PR through `ci.yml` + `impl-provenance.yml`.

**Phase 2 — inline UI:** move the Rabbit Hole form inline on the Cheshire/
Scorecard panel; wire **Create feature** + the four **Improve** actions to the
inline sheet (pre-filled, grounded); add the `renderAgentStatus` banner backed
by `AgentStatusService.detectForRepo`. `IssueCreatorPanel` becomes redundant.

**Phase 3 — retirement + settings:** delete `IssueCreatorPanel` (and
`IssueMonitorService` if fully replaced), the `@alice` strings, and the
Anthropic/OpenAI scaffold toggle + `SECRETS` entries; knip + the full quality
chain green; a real scaffolded repo runs the whole loop (create → dispatch →
PR → merge → issue auto-closes via the `Closes #N` + filename fallback).

## Hardening lessons to apply (from this repo's own history)

- **Persist `issueNumber` at dispatch; resolve PRs structurally** — never text
  search (PR #212 / #225).
- **`Closes #N` is load-bearing + has a fallback** — the agent writes it; the
  extension/CI also closes the issue by tracked number (the #224/#228 fix).
- **Don't embed pack bodies** — reference `.cheshire/prompts/`; the agent reads
  them (the buildOraculumIssue lesson; also kills the 65 KB issue-truncation
  risk).
- **One dispatch engine** — `assignCustomCopilotAgent` + the generic fallback;
  no `claude-code-action`, no human magic words beyond Copilot's documented
  `@copilot use agent` activation in CI.
- **Reuse, don't fork** — `agentStatus.ts`, `AgentStatusService`, the structural
  resolver, and the inline-sheet pattern are shared with the BAR.
- **Ground in repo-metadata + a folder scan** — the RCTRO must name real files;
  embedded-LLM-side, no network.

## Decisions (locked 2026-06-11)

1. **Agent name** — keep **Alice**: id `alice-maintenance-agent`, display
   "Alice". Modernizes the existing brand rather than introducing a new one.
2. **RCTRO grounding depth** — task-dependent: paths + manifest + metadata for
   every task; **target-file excerpts** for scorecard + CodeQL tasks (files
   already known); **relevant-file discovery + excerpts** for blind features
   (heuristic match on the ask, the way Copilot picks files).
3. **Maintenance PR gate** — rely on the repo's existing `ci.yml` /
   `codeql.yml` / `fitness-functions.yml`; the extension labels
   `maintenance-complete` + closes the issue at merge. No new gate workflow.
4. **`copilot-setup-steps.yml`** — kept (pre-firewall deps + MongoMemoryServer
   cache for Alice's test runs).

## Out of scope

- The research/PRD agents (mesh side — separate designs).
- Migrating historical alice-remediation issues; old issues stay as-is.
- Multi-repo fan-out of maintenance tasks (the OKR fan-out engine already
  handles cross-repo implementation; this is single-repo maintenance).

## Future cleanup — come back to this

- **The research-runner's `llm-router` / `callLlm` generation path is dormant
  in production** (surfaced 2026-06-12 while removing the dead Anthropic client).
  Confirmed by tracing the whole chain:
  - `callLlm` is called only by the four LLM nodes (`planQueries`,
    `runGapAnalysis`, `synthesizePrd`, `runExpertReview`).
  - Those nodes are driven only by `runArcheologist` / `runPrd`.
  - `runArcheologist` / `runPrd` are called only by `cli.ts` (the
    `archeologist` / `prd` subcommands).
  - **No deployed workflow invokes those subcommands.** The mesh agent
    workflows (`market-research-agent.yml`, `prd-agent.yml`,
    `code-design-agent.yml`) run the `research-runner` binary only for the
    deterministic skill rails — `skill-audit-verify-chain` and
    `skill-pocket-watch` — neither of which touches `llm-router`. The actual
    research/PRD/design *generation* is done by the Copilot Coding Agent
    persona (`.github/agents/<name>.agent.md`), dispatched by Looking Glass via
    `assignCustomCopilotAgent` (the workflows' Job 1 only sanity-checks that the
    `.agent.md` file is deployed; they explicitly do NOT dispatch).
  - So `llm-router` + `callLlm` + the four nodes + `runArcheologist` / `runPrd`
    are reachable only via a manual `npx research-runner archeologist|prd` or
    the test suite — not on any CI path.
- **Decision needed:** either (a) retire the dormant CLI `archeologist`/`prd`
  generation pipeline + nodes + `llm-router` entirely (research generation has
  moved to the Copilot agents), keeping only the `skill-*` subcommands the
  workflows actually use; or (b) keep it as a supported local/CLI escape hatch
  and document that it is intentionally off the deployed path. Don't half-retire
  — pick one. (The Anthropic removal already trimmed it; this is the larger
  question of whether the whole LLM-generation half of the runner should go.)
