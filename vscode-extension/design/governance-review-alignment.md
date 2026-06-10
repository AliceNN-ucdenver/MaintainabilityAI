# Governance Reviews — inline, custom-agent, PR-based

> Captured 2026-06-04. Design for unifying the two review/research entry points
> on the OKR dispatch pattern, moving reviews inline with the application /
> platform views, and retiring the Oraculum panel + the @-mention assign path.
> Decisions below were made explicitly (not defaults): **findings land as a
> mesh PR artifact**, **the claude-code-action review path is retired**, **the
> Oraculum panel is retired fully**.

## Why this exists

Today there are three disconnected surfaces and two dispatch mechanics for
what is conceptually one thing — "run a governed agent against this scope and
record the findings":

| | Platform "Run Research" | Application "Review" (Oraculum) | OKR phases (the model) |
|---|---|---|---|
| UI | `portfolio.ts` button → separate **NewResearchPanel** | BAR detail → separate **OracularPanel** → configure page | inline on the OKR card |
| Dispatch | clean: `workflow_dispatch`/label → `archeologist.yml` runs the research-runner pipeline | **funky**: create issue → user picks claude/copilot → post literal `@claude …` comment (fires `oraculum-review.yml` → claude-code-action) or generic `copilot-swe-agent[bot]` + `@copilot` comment | `assignCustomCopilotAgent(owner, repo, issue, '<persona>-agent', { customInstructions })` → persona from mesh `.github/agents/*.agent.md` |
| Results | `research/<runId>/synthesis.md` committed | issue **comments** + `reviews.yaml` + score-history | artifact PR → audit-gated → merged to mesh |
| Inline visibility | none | none that renders (`state.activeReview` is plumbed but effectively unrendered; `reviews.yaml` history never shown) | full card lifecycle incl. issue→PR-link tracking |

Pain: the assign step is manual and modal ("which AI?" + magic comments), the
results are invisible unless you open the right panel, and reviews are the only
agent runs in the system that bypass the governed artifact chain.

## Decisions (made 2026-06-04)

1. **Findings = mesh PR artifact.** The review agent commits a report +
   updates `reviews.yaml` on a branch and opens a PR. Full OKR alignment:
   auditable bytes, issue→PR tracking (shipped 2026-06-04), gateable later
   (Oracle rails / Pocket Watch-class checks), exportable in audit reports.
2. **Retire the claude path.** `oraculum-review.yml` (claude-code-action) and
   the `@claude`/`@copilot` comment routing are removed once the new flow is
   verified. One dispatch engine: Copilot Coding Agent with a custom persona.
3. **Retire the Oraculum panel fully.** Configure moves inline; status +
   results render on BAR detail / platform view; the deep comment timeline is
   served by the issue link. `OracularPanel.ts` + `oraculum.ts` (~1,600 lines)
   + the `maintainabilityai.oraculum` command go away at the end of migration.

## Target architecture

### One run model

```ts
interface GovernanceRunRequest {
  kind: 'review' | 'research';
  scope: { level: 'application'; barPath: string } | { level: 'platform'; platformId: string };
  // review-kind
  pillars?: ReviewPillar[];           // architecture | security | risk | operations
  promptPacks?: string[];
  additionalContext?: string;
  // research-kind (the existing archeologist fields)
  topic?: string; level?: string; mode?: string; groundingThreshold?: number; maxIterations?: number;
}
```

One shared **Run Config sheet** (inline section/slide-over in the Looking
Glass webview, NOT a separate panel) renders from this shape — `kind` toggles
which fields show. This is the answer to "can the review page be aligned to
both review types": yes, one component, two field sets, one dispatch exit.

### The persona: `architecture-review-agent`

New `code-templates/agents-v4/architecture-review-agent.agent.md`, registered
in `MESH_AGENTS` (meshSkills.ts) and deployed to the mesh by Cheshire like the
three existing personas. The "Copilot architecture governance agent":

- Grounds in the BAR via existing skills (`knowledge-mesh-bar`,
  `knowledge-mesh-adrs`, `knowledge-mesh-threats`, `context-architecture`,
  `context-security`, `knowledge-code` for linked repos).
- Reviews the four pillars against the selected prompt packs.
- **Output contract:** commits `platforms/<plat>/bars/<bar>/reviews/<runId>/review.md`
  + appends the run's `ReviewRecord` to the BAR's `reviews.yaml`, on a branch,
  opens a PR closing the dispatch issue.
- Emits audit events via the runner skills (same shape as the OKR agents) so
  the run lands in the audit chain.

### Dispatch (the OKR pattern, verbatim)

`onRunGovernanceReview` in LookingGlassPanel:

1. `createIssueRaw(owner, repo, title, body, ['architecture-review', …])` in
   the mesh repo. Body = rendered run request (human-readable) — NOT the
   contract; the contract travels in `customInstructions`.
2. `assignCustomCopilotAgent(owner, repo, issueNumber, 'architecture-review-agent',
   { customInstructions: <structured payload>, baseBranch: 'main' })` with the
   existing fallback (generic assign + `@copilot use agent …` comment).
3. **Persist `issueNumber` + `runId` on the run record at dispatch time** (the
   PR-finder lesson, 2026-06-04: never rediscover by text search).
4. No agent picker. One button: **Run Review**.

Status tracking reuses `AgentStatusService` + `findPrByIssue` (the structural
issue→PR resolver) — the same affordances as OKR phases: draft chip, "Mark PR
ready", merge detection.

### Review report contract — ONE source of truth, parity-tested

`review.md` sections (SHORT names, per the PRD-heading lesson):

```
## Summary
## Architecture Findings
## Security Findings
## Information Risk Findings
## Operations Findings
## Recommendations
## References
```

Findings entries carry `[severity]` + cited evidence (file paths / ADR ids /
threat ids). The section list is declared in exactly the places that consume
it — agent prompt, workflow structure gate, any extension parser — and pinned
by the **phase-contract parity test pattern** (`phase-contract-parity.test.ts`)
from day one. Do not let a fourth copy drift.

### Workflow: `review-agent.yml` (replaces `oraculum-review.yml`)

Triggered on the review PR (label `architecture-review`), mirroring the
audit-job shape of the OKR agent workflows but lighter:

- Structure gate on `review.md` (sections above) → `structure-invalid`
  disposition with named reasons.
- `reviews.yaml` entry verification (the PR must add exactly one record whose
  `runId` matches the dispatch issue).
- Audit-chain verify (the persona emits skill_call events like other agents).
- `review-complete` label on merge. No finalize composite needed — the agent's
  own PR carries the state (reviews.yaml) that finalize would otherwise write.

The extension becomes a **reader** of `reviews.yaml` (BarService.readReviews
already exists); `appendReviewRecord` writes from the extension stop — single
writer (the agent PR) ends the two-writer drift risk.

### `ReviewRecord` extension (Zod first — schema strips unknown keys)

Add to the record: `runId`, `prUrl?`, `reportPath?`, persona in `agent`
(widen the `'claude' | 'copilot' | 'manual'` union to include
`'architecture-review-agent'`). `issueNumber` already exists on the type.
Old records (comment-era) remain readable — new fields optional.

### Inline UI

- **BAR detail → "Reviews" section:** rows from `reviews.yaml` (date, agent,
  drift score, per-pillar finding counts, link to report + PR) + an active-run
  row (issue link, live status chip, Mark-PR-ready when draft) + **Run Review**
  button opening the shared sheet pre-filled from the BAR (pillars all on,
  packs from governance tier).
- **Platform view → "Research" section:** runs listed from the research
  library + active archeologist runs + **Run Research** button opening the
  same sheet with `kind: research` (fields = today's NewResearchPanel
  archeologist tab). Dispatch stays the existing clean `archeologist.yml`
  pipeline — no change to its mechanics in this effort.
- Keep new webview code in dispatch-table + extracted-view-function shape
  (complexity budget ≤40, no new ratchet entries).

### Research synthesis alignment (rides along, phase 3)

The platform research flow's only "funky" step is synthesis assignment
(`@claude`/`@copilot` comment on the oraculum-research issue). It moves to the
same dispatch helper with the synthesis instructions as `customInstructions`
(persona: reuse `architecture-review-agent`? No — synthesis is a different
job; dispatch the generic agent with the synthesis pack instruction block, or
defer a dedicated persona until the review persona proves the pattern).
Decision deferred to phase 3; the helper is shared either way.

## Migration phases (each independently shippable, gates green)

**Phase 1 — the spine (no UI change):**
`architecture-review-agent.agent.md` + MESH_AGENTS + labels;
`review-agent.yml`; `ReviewRecord` schema extension; `onRunGovernanceReview`
dispatch handler + status plumbing; parity test for the report contract.
Smoke: dispatch from a temporary command, verify issue → persona → PR →
structure gate → merge → reviews.yaml row.

**Phase 2 — inline UI:**
Shared Run Config sheet; BAR-detail Reviews section; platform Research
section; wire both buttons. Oraculum's create flow becomes redundant but is
not yet removed (fallback during verification).

**Phase 3 — retirement + research synthesis:**
Remove `OracularPanel.ts`, `src/webview/app/oraculum.ts` (+ its tests/
derivation module stays — `agentStatusDerivation.ts` is reused by the inline
status chips), `oraculum-review.yml`, the `openOraculum` handler + command,
the `@claude`/`@copilot` assign strings, NewResearchPanel's archeologist tab
(PRD tab fate decided separately — out of scope here). Move research synthesis
assignment to the dispatch helper. Knip enforces no dead code remains.

## Hardening lessons to apply (from this repo's own history)

- **Persist `issueNumber` at dispatch** — never rediscover the PR by text
  search (PR #212 lesson; the resolver exists, use it).
- **One section contract, parity-tested** — pack/prompt ↔ workflow gate ↔
  parser pinned in one test (PRD long/short-heading lesson).
- **Zod schemas strip unknown keys** — extend `ReviewRecord`/message schemas
  before writing new fields, or reads silently drop them.
- **Discriminated failure reasons** — dispatch + structure gate emit named
  reasons (`persona-missing`, `structure-invalid:<section>`, …), no generic
  "failed".
- **Single writer per mesh file** — `reviews.yaml` is written only by the
  agent PR after phase 1; the extension reads.
- **Label descriptions ≤100 chars** (GitHub 422 lesson); add new labels to
  `meshLabels.ts` so Deploy All provisions them.
- **Complexity budgets** — new panel handlers join the dispatch table; view
  logic extracted per-function; no new `FILE_COMPLEXITY_BUDGETS` entries.
- **Mesh redeploy required** — the persona + workflow + labels reach the mesh
  only via Cheshire deploy; phase 1 isn't "shipped" until a real mesh run
  passes (regenerate-before-claiming-shipped rule).

## Acceptance criteria

- From BAR detail: Run Review → inline sheet → one click → issue created with
  the persona assigned (zero `@`-mention comments) → live status chip on the
  BAR → agent PR (draft → ready → merged) → review row renders inline with
  pillar counts, drift score, report + PR links.
- From platform view: Run Research → same sheet (`kind: research`) →
  archeologist run dispatched; runs visible inline.
- `reviews.yaml` rows verified by the workflow gate; report structure gate
  green on a real run; parity test pins the section contract.
- After phase 3: no `OracularPanel`, no `oraculum.ts`, no `oraculum-review.yml`,
  no `@claude`/`@copilot` assign strings; knip + full quality chain green.

## Out of scope

- NewResearchPanel's PRD tab (separate decision).
- Gating review PRs with Oracle rails / alignment rails (the PR-artifact shape
  makes this possible later; not in this effort).
- Historical comment-era reviews migration — old `reviews.yaml` rows render
  as-is; no backfill.
