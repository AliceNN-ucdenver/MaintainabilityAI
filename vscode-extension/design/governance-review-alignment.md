# Governance Reviews — inline, custom-agent, PR-based

> Captured 2026-06-04; **v2 design added 2026-06-11** after three live runs
> (#216, #218, #220) proved the persona flow end-to-end. Part 1 records what
> shipped and the contract that must not break. Part 2 is the v2 design:
> simplify the review config to pillars-only, make the summary instant,
> turn the drift tile into a review explorer, and add the merge-boundary
> gate (`review-agent.yml`). Decisions from 2026-06-04 (all delivered):
> **findings land as a mesh PR artifact**, **the claude-code-action review
> path is retired**, **the Oraculum panel is retired fully**.

---

# Part 1 — Delivered (live-verified 2026-06-10/11)

## What shipped

| Piece | State | Evidence |
|---|---|---|
| `architecture-review-agent` persona (`code-templates/agents-v4/`, deployed to mesh `.github/agents/`) | ✅ shipped | reviews #216, #218, #220 ran it |
| Inline review sheet on BAR detail (pillars, packs, context → one Dispatch button, zero `@`-mentions) | ✅ shipped | `renderReviewSheet` in `barDetail.ts` |
| One-click lifecycle: approve workflow runs / mark PR ready / merge, on the BAR banner | ✅ shipped | exercised on #218 → PR #219 |
| Structural issue→PR resolution (no text search) | ✅ shipped | `getClosingPrNumbers` GraphQL resolver |
| Oraculum panel + `oraculum-review.yml` + `@claude`/`@copilot` strings fully retired | ✅ shipped | knip + quality chain green |
| `review-complete` labeling at merge | ✅ v2: durable owner is `review-agent.yml` label-on-merge; extension keeps a best-effort fallback for un-redeployed meshes | `onMergeAgentPr` |
| `review-agent.yml` merge-boundary gate | ✅ **v2 shipped** (advisory; promote to required after a live green run) | `review-agent.yml` + `review-gate.mjs` |
| Report-contract parity test | ✅ **v2 shipped** (persona ↔ gate ↔ template ↔ parser) | `phase-contract-parity.test.ts` |

## Artifact consistency — the contract that must NOT break

The BAR page renders drift + scores from the review artifacts. Live-verified:
reports `review-216.md` / `review-218.md` / `review-220.md` match the section
contract byte-exactly; `reviews.yaml` carries three records with drift 66 /
60 / 36; every finding cites `repo/path:line`, CALM node, ADR, or threat id.

| Consumer | Reads | Contract |
|---|---|---|
| `BarService.readReviews` / `parseReviewsYaml` | `reviews.yaml` | snake_case fields: `issue_url`, `issue_number`, `date`, `agent`, `drift_score`, `pillars.<name>.{findings,critical,high,medium,low}` |
| BAR drift chip + sparkline | `latestDriftScore` / `reviews[last].driftScore` | **drift formula: `100 − (15·critical + 5·high + 2·medium + 1·low)`, floored at 0** (`BarService.computeDriftScore`) |
| Review explorer rows (v2) | per-pillar finding counts | pillar keys written by the persona: `architecture`, `security`, `risk`, `operations` |
| Report viewer (v2) + hat summary | `reports/review-<issue#>.md` | section contract below |

### Review report contract — ONE source of truth, parity-tested (v2)

```
## Summary
## Architecture Findings
## Security Findings
## Information Risk Findings
## Operations Findings
## Recommendations
## References
```

Pillar sections are omitted only when that pillar was not in `scope`. The
Summary opens with the drift score and a per-pillar counts table; findings
are `**[severity]**` bullets with a citation. This list is declared in the
persona, the gate's `REQUIRED_H2`, and any extension parser — pinned by the
phase-contract parity test pattern. Do not let a fourth copy drift.

### Repository grounding — verified, with one nuance

Repos travel from `app.yaml` `repos:` into the dispatch issue's `oraculum`
config block (`buildOraculumIssue` → `includeRepos: bar.repos`). Review #218
cites all three linked repos line-precisely (26 citations across
`movie-api`, `imdb-identity`, `imdb-react-frontend`). **Nuance:** the Copilot
sandbox blocked `gh repo clone` of sibling repos; the agent fell back to the
GitHub contents API and disclosed it in the Summary. The persona should bless
that fallback explicitly (v2 persona edit P3) so honesty notes stay uniform.

---

# Part 2 — v2 design (2026-06-11)

## Defects found in the 2026-06-11 audit

- **D1 — pack list shows only “Default”.** `promptPackService.setMeshPath()`
  is never called — its only caller died with the Oraculum panel — so
  `getLookingGlassPacks()` thinks there is no mesh and returns the bundled
  default only. The mesh actually has all five packs + `registry.yaml` under
  `.caterpillar/prompts/`. Root cause of “you dropped the other packs”.
- **D2 — `parseReviewsYaml` drops the Information Risk pillar.** The parser's
  variant list for the canonical `information-risk` key is
  `['information-risk','informationrisk','information_risk','infoRisk','info-risk']`
  — plain **`risk:` is missing**, and `risk:` is exactly what the persona
  writes (live records #216/218/220). Latent today (only `drift_score` and
  the sparkline render), fatal for the v2 review explorer. Fix: add `risk`
  to the variants; pin with a parser unit test fed the live record bytes.
- **D3 — stale `oraculum-issue.md` template.** It still carries the
  “Implementation Zone — Option A: `@claude` / Option B: assign Copilot”
  block and instructs the agent to *post a summary comment on this issue* —
  which 403s in the agent sandbox (verified live on #216). The template
  contradicts the persona it dispatches. Rewrite (v2 item 5).
- **D4 — embedded pack content is a silent-truncation risk.** The issue body
  embeds full pack markdown (`PACK_SECTIONS`); past ~65KB the builder slices
  the body, which can cut pack content silently. Redundant bytes: the agent
  runs in the mesh checkout and reads `.caterpillar/prompts/<id>.md` directly
  (persona §2 makes mesh files primary already).

## 1. Review config — pillars-only, packs derived, referenced not embedded

The current sheet exposes two near-mirror axes (pillars × packs), and D1
means the pack axis is broken anyway. Options considered:

- **Option A (chosen) — pillars-only.** The sheet shows pillar checkboxes +
  the context textarea. Packs are derived, never picked:

  | Pillar selected | Pack(s) included |
  |---|---|
  | *(always)* | `default` |
  | `architecture` | `architecture` |
  | `security` | `application-security` |
  | `risk` | `information-risk` |
  | `operations` | `operations` |

  Derivation rule (future-proof for custom packs, no UI): include every
  `registry.yaml` pack whose `domain` maps to a selected pillar
  (`general` → always; `architecture`/`security`/`information-risk`/
  `operations` → their pillar). Packs with `domain: custom` are excluded
  until they declare a pillar domain — documented in the registry header.
- **Option B — keep multi-select, reference-only.** Fix D1 plumbing, keep
  checkboxes for custom packs. More UI for a selection that is 1:1 with
  pillars in practice; only pays off with a large custom-pack library.
- **Option C — status quo + fix embedding.** Keeps the redundant axis and
  the D4 truncation risk. Rejected.

**Issue body changes (with Option A):** keep the ```` ```oraculum ```` config
block exactly as the persona parses it — `prompt_packs:` is now the derived
list — but **drop `PACK_SECTIONS` embedding** (D4). Keep `PACK_FILE_REFS`
(the `.caterpillar/prompts/<id>.md` paths) so the issue documents the
methodology used. Body shrinks from ~30–60KB to ~2KB.

**Persona edits:**
- **P1**: §2 — remove “the issue body embeds the pack content” fallback;
  the mesh file is the only source; a missing pack file is named in the
  Summary (rule already exists).
- **P2**: §2 — note that `prompt_packs` is derived from `scope`; tolerate
  both for back-compat.
- **P3**: §3 — bless the GitHub-contents-API fallback when `gh repo clone`
  is sandbox-blocked, with the same disclosure requirement.

**Dead code to remove:** `onLoadReviewPackOptions`, the `reviewPackOptions`
message, the pack-checkbox column, `selectedPacks` state, and (if knip
agrees) `getEffectivePacks`'s embed path. `promptPackService.setMeshPath`
gains a caller only if something else still needs mesh pack discovery —
otherwise it goes too.

## 2. Instant summary — derive it, don't generate it

Today the 🎩 hat button streams an LLM (vscode-lm) summary of the latest
report into four pillar bullet lists — on demand, with a progress bar, lost
on navigation. The ask: the summary should be **already there** when the
review lands. Options considered:

- **Option A (chosen) — deterministic derivation from the report.** The
  report is already structured: pillar H2 sections containing
  `**[severity]**` bullets (gate-enforced in v2). Parse the local report
  file at render time; “top findings” = severity-sorted bullets per pillar
  (critical → high → medium → low), top 3 per pillar, with a “+n more”
  affordance. Zero LLM, instant, offline, reproducible — and it can never
  contradict the artifact it summarizes.
- **Option B — persist the hat's LLM output at merge.** Costs an LLM call,
  only works on the machine that merged, and creates a second writer or a
  cache to invalidate. Rejected.
- **Option C — agent emits a `summary.json` sidecar.** A new contract
  surface to gate and parity-test, carrying bytes derivable from the report.
  Rejected.

**Merge → visible without leaving the page:** after a successful review-PR
merge, the extension currently *asks* the user to pull. v2: `onMergeAgentPr`
runs a fast-forward-only mesh pull (GitSyncService) and reloads the BAR —
the new review row, drift score, and derived summary appear in place. If the
pull can't fast-forward (local dirty state), fall back to today's nudge.

The hat button is retired (the derived summary replaces it). The existing
LLM deep-dive lives on in Absolem chat, which can already read the report.

## 3. Review explorer — the drift tile expands (the “pop”)

Today the tile is a score ring + sparkline + two ghost buttons. v2 makes it
the review surface:

- **Collapsed (default):** unchanged ring/label/sparkline + Review button.
- **Click tile (or chevron) → expands inline:**
  - **Latest-review summary block** (from item 2): drift score, date,
    per-pillar severity-sorted top findings.
  - **History rows**, latest first, one per `reviews.yaml` record:
    `date · drift chip (colored) · per-pillar counts (A 3 · S 2 · R 2 · O 2)
    with severity dots · issue #N link · View report`. Requires the D2
    parser fix or Information Risk renders empty.
  - **Sparkline dots become clickable** — jump to that review's row.
- **View report → in-panel viewer:** rendered with the existing
  `renderMarkdown` (`pillars/shared.ts`, already used by Absolem) — extended
  with a markdown-table pass (the Summary contains a table). Header actions:
  **Open in editor** (`vscode.workspace.openTextDocument`) and **Open
  preview** (`markdown.showPreview`) for the native experience. PR link
  resolved lazily on expand via the structural issue→PR resolver (not
  persisted — `issue_number` is the join key).
- Webview code stays in the dispatch-table + extracted-view-function shape;
  no new complexity-budget entries.

## 4. Merge-boundary gate — `review-agent.yml`

### Why it's shaped differently from the PRD agent's workflow

`prd-agent.yml` **is** the agent: an `issues: [labeled]` trigger runs the
runner pipeline in the workflow itself, so generation and validation share a
job. The review agent is a **Copilot coding agent** producing a PR from a
sandbox; the workflow's job is therefore pure **verification at the merge
boundary** — it generates nothing, re-derives everything it checks from the
PR diff + the dispatch issue, and never trusts the agent's own claims.

### Trigger

```yaml
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
    paths: ['platforms/**/reports/review-*.md', 'platforms/**/reviews.yaml']
  pull_request_target:
    types: [closed]   # merge-time labeling job only
```

### Jobs (verification, in order)

1. **Scope gate** — every changed file lives under ONE `bar_path`, and the
   only allowed files are `reports/review-<N>.md` + `reviews.yaml`. Writes
   to `app.yaml`, `score-history.yaml`, other BARs, or anything else fail
   with `scope-violation:<path>`. (Persona honesty rule §6, mechanized.)
2. **Issue resolution** — `<N>` comes from the PR's closing reference
   (GraphQL `closesIssuesReferences`), never from branch/title text (the
   PR-finder lesson). The issue must carry the `oraculum-review` label and
   contain the ```` ```oraculum ```` block; `scope` and `bar_path` are read
   from it.
3. **Structure gate** — `reports/review-<N>.md` exists; H2 set equals
   `REQUIRED_H2` minus the pillar sections not in `scope`; each pillar
   section's findings are `**[severity]**` bullets from the allowed set.
   Failures: `structure-invalid:<section|severity>`.
4. **Record gate** — the `reviews.yaml` diff appends exactly ONE record
   (no rewrites/reorders of prior records); `issue_number == N`; `date`
   parses; pillar keys == `scope`; counts are non-negative integers and
   `findings` equals the severity sum. Failures: `record-mismatch:<field>`.
5. **Math gate** — recompute `100 − (15c + 5h + 2m + 1l)` floored at 0 from
   the record's counts → must equal `drift_score`; **recount the report's
   severity bullets per pillar → must equal the record's counts** (the
   honesty rule: the report and the record cannot disagree). Failures:
   `math-mismatch:<pillar>`.
6. **Labeling at merge** (`pull_request_target: closed`, merged == true) —
   add `review-complete` to the dispatch issue with the workflow token
   (which CAN label; the 403 was the agent sandbox token). This makes the
   labeling durable — today it fires only when the merge goes through the
   extension button. The extension's best-effort labeling is then removed
   (single owner).

### Disposition

Failures post ONE PR comment listing the named reasons and apply a
`review-invalid` label (removed on the next green run). The gate runs
**advisory first** (one real review proves it), then is promoted to a
required check via branch protection — the repo's standard
advisory-then-promote pattern.

### Parity pinning (same commit as the gate)

`phase-contract-parity.test.ts` gains: persona `REQUIRED_H2` ↔ workflow
`REQUIRED_H2` ↔ any extension report parser; persona drift formula ↔
workflow recompute ↔ `BarService.computeDriftScore` weights; persona pillar
keys ↔ gate's allowed keys ↔ `parseReviewsYaml` variants (D2 fix).

## 5. Issue template rewrite (`oraculum-issue.md`)

Remove the “Implementation Zone” (Option A `@claude` / Option B generic
Copilot — both retired) and the “post a summary comment on this issue”
instruction (403s; the summary lives in the PR description per persona §5d).
Keep: the `oraculum` config block (unchanged shape), the Review Directive,
the context block, pack file references, metadata. State plainly: *this
issue is executed by the `architecture-review-agent` persona; artifacts
arrive as a PR; the issue closes on merge.*

## 6. Type/schema touches

- `ReviewRecord` stays as-is (`issueNumber` is the join key; report path is
  derivable; PR link resolved lazily). The earlier `runId`/`prUrl`/
  `reportPath` extension idea is dropped — no consumer needs persisted
  fields the resolver can derive.
- `agent` union unchanged (`copilot` in-union, persona identity in the
  report/PR) — decided 2026-06-04, reaffirmed.
- Zod/message schemas: extend BEFORE writing any new webview message fields
  (schemas strip unknown keys).

## Migration phases (each independently shippable, gates green)

**Phase 4 — config simplification + gate (the governance slice) — ✅ DELIVERED:**
pillars-only sheet (dropped pack column + `reviewPackOptions` plumbing);
`buildOraculumIssue` derives packs (`derivePacksForPillars`, registry-domain
driven) + stops embedding; template rewrite (D3); persona edits P1–P3;
`review-agent.yml` + `review-gate.mjs` + labels (`oraculum-review`,
`review-pass`, `review-invalid`, `review-complete`) via `meshLabels.ts`;
parity-test pinning (persona ↔ gate ↔ template ↔ parser); D2 parser fix +
live-bytes unit test; D1 fix (`promptPackService.setMeshPath` wired into
`loadPortfolio`). **Remaining (ops, not code):** mesh redeploy via Cheshire,
then one real review run through the gate (advisory) → promote to required.

**Phase 5 — review explorer + instant summary (the UX slice) — ✅ DELIVERED:**
deterministic report parser (`reviewReportParser.ts`, severity-sorted top
findings, no LLM) + latest-summary block; drift tile expands to review
history rows + in-panel report viewer (`renderMarkdown` + existing table
pass, open-in-editor/preview actions); merge → ff-only mesh pull → BAR reload
→ auto-loaded summary (zero clicks); retired the hat button +
`summarizeTopFindings` LLM path; extension-side `review-complete` labeling
kept as a transition fallback (the gate's label-on-merge job is the durable
owner).

**Phase 6 — research joins (separate design):** the research agent reuses
the same sheet pattern, gate skeleton, and explorer surface —
`design/research-agent-alignment.md` owns it.

## Hardening lessons to apply (from this repo's own history)

- **Persist `issueNumber` at dispatch; resolve PRs structurally** — never
  rediscover by text search (PR #212 lesson; shipped, keep it that way).
- **One section contract, parity-tested** — persona ↔ gate ↔ parser pinned
  in one test (PRD long/short-heading lesson).
- **Verify, don't trust** — every gate check re-derives from the diff +
  dispatch issue; the agent's self-reported numbers are inputs to check,
  not facts.
- **Zod schemas strip unknown keys** — extend schemas before writing fields.
- **Discriminated failure reasons** — `scope-violation:<path>`,
  `structure-invalid:<section>`, `record-mismatch:<field>`,
  `math-mismatch:<pillar>`; no generic “failed”.
- **Single writer per mesh file** — `reviews.yaml` is written only by the
  agent PR; the extension reads. The merge-time pull is a read, not a write.
- **Label descriptions ≤100 chars**; new labels land in `meshLabels.ts` so
  Deploy All provisions them.
- **Complexity budgets** — dispatch-table handlers, extracted view
  functions, no new `FILE_COMPLEXITY_BUDGETS` entries.
- **Mesh redeploy required** — persona/workflow/template changes reach the
  mesh only via Cheshire deploy; a phase isn't “shipped” until a real mesh
  run passes.
- **Advisory before required** — the gate blocks nothing until one live
  review has passed it green.

## Acceptance criteria (v2)

- Review sheet shows pillars + context only; dispatch issue carries the
  derived `prompt_packs` and **no embedded pack bodies**; a live review run
  completes with the agent reading packs from `.caterpillar/prompts/`.
- `review-agent.yml` green on a real review PR: scope, structure, record,
  math gates all pass; a deliberately broken fixture PR fails with named
  reasons; `review-complete` lands via the workflow at merge.
- Parity test pins sections, drift weights, and pillar keys across persona,
  gate, and parser; D2 unit test parses the live #216/218/220 bytes and
  yields all four pillars.
- Drift tile expands to history rows with correct per-pillar counts
  (including Information Risk); report opens in the in-panel viewer with
  tables rendered; latest-review summary is visible with zero clicks and no
  LLM call after a merge completes (auto-pull path).
- Knip + full quality chain green; no new complexity-budget entries.

## Out of scope

- Research agent (owned by `design/research-agent-alignment.md`).
- Gating review PRs with Oracle rails / Pocket Watch-class semantic checks
  (the PR-artifact shape enables it later).
- Historical comment-era review migration — old rows render as-is.
- Branch-protection automation (promotion to required check is a manual
  repo-settings step, documented in the gate's header comment).
