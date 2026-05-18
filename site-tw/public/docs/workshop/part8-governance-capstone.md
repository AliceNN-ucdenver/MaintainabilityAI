# Part 8: Through the Looking Glass

<div class="docs-workshop-hero docs-workshop-indigo">
  <div class="docs-workshop-number">8</div>
  <div>
    <div class="docs-card-kicker">Workshop Part 8 · Through the Looking Glass</div>
    <h2 class="docs-workshop-title">Through the Looking Glass</h2>
    <p class="docs-workshop-subtitle">Governance Capstone. One Cross-Cutting Feature, the Full Evidence Chain.</p>
  </div>
  <div class="docs-workshop-meta">
    <strong class="docs-strong">Duration:</strong> 120 minutes<br/>
    <strong class="docs-strong">Prerequisites:</strong> <a href="/docs/workshop/part7-red-queens-court" class="markdown-link">Part 7 complete</a>. All six Golden Rules learned. Scorecard at ~65. The celeb-api has every governance layer wired.<br/>
    <strong class="docs-strong">SDLC phase:</strong> All six. This is the synthesis.<br/>
    <strong class="docs-strong">Status:</strong> Available now
  </div>
</div>

> *"Sometimes I've believed as many as six impossible things before breakfast."* By the end of Part 8 you have shipped **one cross-cutting feature** (celebrity favorites) across all four IMDB-lite repos with the **complete evidence chain** attached. Every Golden Rule is exercised. Every artifact connects to the next. The auditor sees the whole chain from *"we wondered about this"* to *"we shipped it, here is why we trust it"* in a single git query.

---

## What you will have built when you leave

1. The **celebrity favorites feature** shipped end to end. A signed-in user can favorite a celebrity, see their favorites list, and unfavorite. The feature touches all four IMDB-lite repos.
2. Four PRs merged, one per repo: `imdb-react-frontend`, `imdb-identity`, `celeb-api`, `movie-api` (the last only minimally, a JSON field rename). All AI-assisted via the Cheshire enrich → assign → review loop you learned in Part 3.
3. **A complete evidence chain** anchored at one `project_id`. Every PR, every issue, every audit log, every Hatter's Tag points back to the same project. One `gh search` query reveals the whole story.
4. **Every Golden Rule visibly exercised:**
    - Rule 1 (stage selection): you chose AI-Assisted at Supervised tier; you did NOT pick Agentic because the cross-repo coordination work needs human checkpoints
    - Rule 2 (full contract): the RCTRO issue Cheshire produced cited 5 prompt packs (A01, A03, A09, complexity, DRY) and pre-flagged the relevant STRIDE entries
    - Rule 3 (trust but verify): each PR review caught at least one Requirement-vs-implementation drift; you sent at least one back to the agent for revision
    - Rule 4 (measurement enables governance): all 5 fitness functions stayed green through the merge; the CALM-layer one passed because the new flows match the CALM update you made first
    - Rule 5 (version the contract): every PR carries a Hatter's Tag naming the exact pack versions used; the audit chain is one query
    - Rule 6 (deterministic governance): the Red Queen denied two attempted CALM violations during implementation; both denies are in the audit log
5. **CALM model updated first.** Before any code, you added the new flow `imdb-react-frontend → celeb-api` for the favorites endpoint to `bars/APP-IMDB-002/bar.arch.json` via an architecture-decision ADR. The Red Queen then permits the implementation flows; without the CALM update, the hook would have denied.
6. Scorecard: **~65 → ~80**. The celeb-api crosses into **Autonomous tier**. Every pillar is green or close. The remaining ~15-20 points are cleanup that does not block ongoing work.
7. The auditor-ready summary: one PR description per repo carrying the full Hatter's Tag, plus a top-level "release issue" (`PRJ-IMDB-FAV-001`) that links them all. You can hand this to a SOC 2 or ISO 42001 reviewer with no further explanation.

---

## Recap from Part 7

Part 7 installed the Red Queen. The CALM-layer rule from Part 4 (advisory in CI) became deterministic at the agent's tool-call boundary. A custom team rule (`SEC-101`: no unparameterized SQL in route handlers) was added and is now enforced before the agent's write lands. The repo crossed into Autonomous-tier readiness on score (~65). All six Golden Rules are operational.

Today we do the thing the whole workshop has been preparing for: **ship a feature that exercises every layer at once** and produces a single coherent audit trail.

---

## Two starting points, one destination

The capstone teaches the **same evidence chain** regardless of how you start. Pick the path that matches the team you are coaching:

- **Ad-hoc path (this Part, original).** The architect already knows the feature (celebrity favorites). The team writes an RCTRO directly, fans it out across the four IMDB-lite repos, and ships. Fast — useful when the architectural decision is already made.
- **Research-first path (v0.9 addition).** Start from an Oraculum finding. Promote it to a `research-request`. The Archeologist publishes a research doc; the PRD agent produces a spec-ready manifest; the cross-repo bridge auto-creates the per-repo RCTRO issues. Slower up front — useful when the architectural premise is contested or needs evidence the team does not yet have.

Both paths land **the same artifact chain**: project id → research → PRD → spec-ready issues → implementation PRs, every link carrying a Hatter's Tag. The ad-hoc path skips the first two links and starts at the spec-ready RCTRO issue.

If you are running the workshop with a team that has the v0.9 Looking Glass UX wired in, **walk the research-first path first** as a 30-minute prelude (see the bonus section below), then drop into the ad-hoc path for the implementation work. The team gets to see how Oraculum, the Archeologist, the PRD agent, and the spec-ready handler all fit together before doing the implementation by hand. The ad-hoc path then becomes "what happens when you trust the agents enough to skip the discovery step."

---

## Bonus: research-first path (30-minute prelude)

Prerequisites — the **[end-to-end walkthrough](/docs/walkthrough/research-prd-chain)** scaffolding requirements section. In particular:

- The mesh repo has `archeologist.yml`, `prd.yml`, `label-on-merge.yml`, `notify-code-repos.yml`, plus the `.caterpillar/prompts/research/*` and `.caterpillar/prompts/prd/*` packs (one-click via `Looking Glass` → `Settings` → `Deploy mesh workflows`)
- No workflow files needed on the code repos — the mesh opens the PRD landing-issue directly via the GitHub Issues API
- `TAVILY_API_KEY`, `ANTHROPIC_API_KEY` (or you have settled on `github-models`), and `GOVERNANCE_MESH_TOKEN` are pushed to the mesh repo's Actions secrets
- The pre-flight checklist in `New Research / PRD Run` shows all green

The five-minute version of the path:

1. **`Looking Glass` → open the celeb-api BAR → `Run Oraculum Review`.** Pick the celebrity-favorites finding (or any architecture gap the review surfaces).
2. **Open the Oraculum issue. Click 🔍 Promote to research-request.** The Archeologist workflow auto-fires on the label-add event.
3. **`Active Research / PRD Runs` shows the run.** Watch the current node update (plan_queries → tavily_search → … → synthesize_report). Adaptive cadence keeps the polling cheap.
4. **The research PR opens on the mesh repo.** Read the rendered doc + Hatter's Tag. Merge it.
5. **`label-on-merge.yml` labels the source issue `prd-ready`. `prd.yml` fires.** A second row appears in Active Runs — this is the PRD agent's multi-expert refinement loop. The published PRD includes a Refinement Loop Trace table so you can see how the score converged across iterations.
6. **Merge the PRD PR.** `notify-code-repos.yml` reads `manifest.target_repos` and **opens a PRD landing-issue directly in each code repo on the list** via the GitHub Issues API. The issue body contains the full PRD markdown + manifest JSON + audit pointers. No workflow runs on the code-repo side; the issue just appears.
7. **You are now at the start of the ad-hoc path's implementation step.** The landing-issues are already in the right repos. Use the Looking Glass **Rabbit Hole** to manually assign one as an RCTRO implementation issue (or comment `@claude please implement` on the landing-issue directly to invoke alice-remediation.yml against the embedded manifest).

What this gives the team to discuss before they start implementing:

- The PRD's grounding-loop trace tells them whether the agents agreed on the right scope. A run that took two iterations means the LLM experts disagreed on coverage and re-synthesized — surface that in the team review.
- The spec-ready issue's `derived_from_prd_run_id` is the key the audit chain joins on across repos. `gh search issues "derived_from_prd_run_id:<run_id>"` shows the whole evidence chain in one query — exactly what the auditor sees at the end.
- The `Research Library` panel now has the new research and PRD docs indexed under the celeb-api BAR. PRDs with a manifest get a `spec-ready` badge so the team can spot which artifacts already produced downstream issues vs which are still pending merge.

The remainder of Part 8 (`The capstone: celebrity favorites` onward) is unchanged regardless of which starting point you used. The audit chain rolls up cleanly because both paths terminate at the same RCTRO issue shape.

---

## The capstone: celebrity favorites

The feature description, in plain English:

> A signed-in user of the IMDB Lite app can favorite a celebrity, see their list of favorites, and unfavorite. Favorites persist server-side. The favorite/unfavorite action is logged with the user id and celebrity id (no celebrity name in logs; PII concern). The frontend uses an existing API client pattern; no new authentication code; cookies stay httpOnly.

This is **deliberately the same feature** you drafted an RCTRO for in Part 2's hand exercise. You will see how much closer that initial draft was to what Cheshire generates, now that you have the muscle memory of seven parts.

### What it touches

| Repo | Change |
|---|---|
| `imdb-react-frontend` | New `<FavoriteButton>` component on celebrity detail page + new `/favorites` page; uses existing API client |
| `imdb-identity` | No code change. The existing JWT middleware already passes user-id to downstream services. |
| `celeb-api` | New `POST/DELETE/GET /celebrities/:id/favorite` and `GET /favorites` endpoints; new `celebrity_favorites(user_id, celebrity_id)` table |
| `movie-api` | A small JSON field rename (`bio` → `biography`) the favorites UI needs for consistent display; touched only because we noticed it while reviewing the cross-cutting change |

The bulk of the work lives in `celeb-api`. The other three repos take much smaller PRs. Cross-repo coordination is the new skill the capstone teaches.

### The mental model: one `project_id`, many PRs

We assign one `project_id` (`PRJ-IMDB-FAV-001`) to the whole capstone. Every artifact carries it: the parent issue, the RCTRO issues per repo, the PRs, the Hatter's Tags, the audit logs, the merge commits. **The `project_id` is the spine of the evidence chain.** One `gh search` query later, the auditor sees: 1 parent issue + 4 RCTRO issues + 4 PRs + 4 Hatter's Tags + N audit events, all joined by `PRJ-IMDB-FAV-001`.

---

## Walkthrough: ship the cross-cutting feature

Budget 90 minutes for the implementation walkthrough; 15 for the synthesis discussion.

### Step 1. Create the parent release issue

In the mesh repo (or your portfolio coordination repo), file an issue titled `[PRJ-IMDB-FAV-001] Add celebrity favorites across IMDB-lite`. Body: the plain-English description above + a checklist of the four sub-issues you are about to create. Add labels: `project:PRJ-IMDB-FAV-001`, `cross-cutting`. **This issue is the anchor.** Everything else links back to it.

### Step 2. Update the CALM model first (Rule 1 + Rule 6 in action)

Without changing any code, edit `bars/APP-IMDB-002/bar.arch.json` to add the new flow:

```json
{
  "unique-id": "frontend-to-celeb-api-favorites",
  "relationship-type": {
    "connects": {
      "source":      { "node": "celeb-frontend" },
      "destination": { "node": "celeb-api", "interfaces": ["/celebrities/:id/favorite", "/favorites"] }
    }
  }
}
```

File ADR `bars/APP-IMDB-002/adrs/ADR-0023-celebrity-favorites.md` justifying the new flow: why we are adding it, what the user value is, what the alternatives were.

Commit this as a single PR titled `arch(APP-IMDB-002): declare frontend → celeb-api favorites flow (ADR-0023)`. Merge it.

**Why first?** Because the Red Queen hooks from Part 7 will deny any code change that proposes an undeclared flow. The CALM update is the prerequisite. This is Rule 1 (the stage of work) and Rule 6 (deterministic governance) working together: you cannot ship the feature until the architecture says you can.

### Step 3. Generate the four RCTRO issues with Cheshire

In VS Code, with the celeb-api workspace open, **Cheshire Cat → Issue Management → New Feature**. Paste:

```
Add per-user celebrity favorites. Signed-in user can POST to favorite,
DELETE to unfavorite, GET their list. Endpoints on celeb-api. Frontend
adds a favorite button on the celebrity detail page and a favorites page.
Audit log every favorite/unfavorite with user-id + celebrity-id, no PII
in log lines. Parent project: PRJ-IMDB-FAV-001.
```

Cheshire detects the cross-repo nature, suggests **four** RCTRO issues (one per repo):

- `[PRJ-IMDB-FAV-001] celeb-api: implement /celebrities/:id/favorite and /favorites endpoints`. Packs: A01, A03, A09, complexity, DRY
- `[PRJ-IMDB-FAV-001] imdb-react-frontend: add FavoriteButton + favorites page`. Packs: A03 (XSS on the displayed name), A05 (CSP for new pages), complexity
- `[PRJ-IMDB-FAV-001] imdb-identity: confirm JWT middleware passes user-id`. Packs: (audit only; no code change expected)
- `[PRJ-IMDB-FAV-001] movie-api: rename bio → biography for cross-service consistency`. Packs: (rename only; complexity)

Confirm packs. Click **Generate**. Cheshire creates the four issues in their respective repos, each labelled `project:PRJ-IMDB-FAV-001` and `rctro-feature`. Read each issue body. Every one has the full RCTRO with the relevant Requirements expanded inline from the cited packs.

### Step 4. Assign agents per repo

Per repo, comment `@claude please remediate` on the RCTRO issue. The `alice-remediation` workflow fires. Within 3-5 minutes per repo, four draft PRs open.

Tier check: the celeb-api is at Supervised (this is what Part 7's policy says). The Red Queen will allow `Edit` and most `Bash` for the agent, but will deny anything crossing the layer rules from Part 7 (route → data direct imports, unparameterized SQL, undeclared CALM flows). Watch the audit feed in Looking Glass during the runs. If you see a deny event, that is the Red Queen earning its keep mid-run.

### Step 5. Review the celeb-api PR (the big one)

This is the heaviest review. Apply the discipline from Part 3 sharpened by everything since:

| Requirement section line | What you check |
|---|---|
| Parameterised queries (`pg $1` placeholders) | Grep the diff for any string concatenation in SQL. There should be zero. Custom rule `SEC-101` from Part 7 should have prevented it; verify. |
| Zod validation on `:id` path param | Confirm the validator file exists. Confirm allowlist regex on the celebrity id. |
| Audit log with structured event names | Confirm log lines use `favorite.added` / `favorite.removed`. Confirm no celebrity name in log lines (only user_id + celebrity_id). |
| Ownership check (A01) | Confirm GET `/favorites` only returns the calling user's favorites; reject any attempt to query another user's. |
| Idempotency | POST twice → still one favorite. DELETE twice → no error on the second delete. |
| Migration safe | The new `celebrity_favorites` table migration is non-destructive (CREATE IF NOT EXISTS); rolls back cleanly. |
| Tests cover attack vectors | SQLi payload in `:id`, IDOR attempt, oversized payload, concurrent POST race. |
| Hatter's Tag in PR description | Names the pack versions used, the model, the reviewer (will be you when you approve). |

If any row is partial, comment on the specific line. Re-trigger the agent with `@claude please address the review comments.` New commits land on the same PR.

**Watch the Part 7 audit log mid-review.** If the Red Queen denied any of the agent's earlier attempts (e.g., it tried to write `WHERE id = ${id}` and `SEC-101` blocked it), those denies are in the audit log even though the final PR doesn't show the attempt. Mention this in the PR thread: *"Red Queen blocked 2 SEC-101 violations during implementation; the final diff is the result of the agent's retry path."* That is your evidence chain talking.

### Step 6. Review the smaller PRs

`imdb-react-frontend`. Review for XSS in any displayed text (use the existing safe-renderer, not `dangerouslySetInnerHTML`), CSP for the new favorites page (if your team has a CSP policy), correct API client usage.

`imdb-identity`. Should be **no change** other than a confirming comment in the issue. The agent may have proposed a "small improvement" outside the RCTRO scope; reject it. Stay in scope.

`movie-api`. Pure rename. The agent should also rename the test fixtures and any documentation. Confirm the OpenAPI spec is updated.

### Step 7. Verify the fitness functions and scanners

Per PR, the CI runs:
- ESLint + Jest + the 5 fitness functions from Part 4 (complexity, duplicated code, dead code, import boundaries, CALM-layer)
- CodeQL + Snyk from Part 5
- Red Queen Review (the Part 7 required status check)

Every gate should be green. If any is red, the merge is blocked. **No exceptions.** The whole point of the workshop has been to wire these gates; ignoring them at the capstone undoes the work.

### Step 8. Merge in the right order

Order matters because the cross-repo dependencies:

1. **celeb-api** first (it owns the new endpoints; nothing else can call them until they exist)
2. **imdb-identity** second (no-code-change confirmation; closes the issue)
3. **movie-api** third (the field rename; depends on nothing)
4. **imdb-react-frontend** last (calls the new celeb-api endpoints; needs them deployed)

Each merge ships its own Hatter's Tag. Each merge updates the parent release issue's checklist. After the fourth merge, the parent issue auto-closes with a comment summarising the chain.

### Step 9. Compose the auditor's view

In the parent release issue, the auto-generated final comment is your evidence chain in one place:

```
✅ Capstone PRJ-IMDB-FAV-001 complete.

CALM update: bars/APP-IMDB-002/bar.arch.json @ commit abcd1234
  ADR: bars/APP-IMDB-002/adrs/ADR-0023-celebrity-favorites.md
  Merged: 2026-05-17T14:02Z

Implementation PRs:
  - celeb-api#4187            (Hatter's Tag: v1.1.0 packs, reviewer @you, merged 14:48Z)
  - imdb-identity#3201        (confirmation only, no code change, closed 14:51Z)
  - movie-api#1843            (rename, Hatter's Tag attached, merged 14:55Z)
  - imdb-react-frontend#5012  (Hatter's Tag, merged 15:08Z)

Governance evidence:
  - 5 fitness functions green on every merge
  - CodeQL + Snyk green
  - Red Queen Review: 4 PRs reviewed, 4 PASS verdicts
  - Red Queen audit events: 87 allows, 2 denies (both SEC-101, both correctly blocked unparameterized SQL during implementation), 0 overrides
  - Prompt packs used:
      .cheshire/prompts/owasp/A01_broken_access_control@v1.0.0
      .cheshire/prompts/owasp/A03_injection@v1.1.0
      .cheshire/prompts/owasp/A09_logging_monitoring@v1.0.0
      .cheshire/prompts/maintainability/complexity-reduction@v1.0.0
      .cheshire/prompts/maintainability/dry-principle@v1.0.0

Scorecard: 65 → 81 (Autonomous tier).
```

**One issue. Every artifact in one place. Hand this to a SOC 2 or ISO 42001 reviewer and the conversation is short.**

### Step 10. Re-read the scorecard

```
celeb-api                                 81 / 100      AUTONOMOUS  (up from 65)
  Code Security                           22 / 25       green   (favorites endpoints added clean coverage)
  Test Coverage                           17 / 20       green
  Technical Debt                          11 / 15       green   (paid down during PR review)
  Dependency Freshness                    12 / 15       green
  Complexity                              10 / 15       yellow  (still room. Favorites code is clean but one legacy area remains)
  Architecture                            10 / 10       green
```

The celeb-api is now Autonomous tier. The Red Queen hook for Autonomous tier denies almost nothing but logs everything. The next agent run on this repo will have more latitude. And the audit chain will keep growing.

---

## The six rules, combined — the operating model

The capstone exercised every rule. The combination is what makes the operating model work, not any one rule alone.

| Rule | Where it fired today |
|---|---|
| 1 — Choose the stage before the prompt | You picked AI-Assisted at Supervised tier (cross-cutting; needs human checkpoints); you did NOT pick Agentic |
| 2 — Write the full contract before code | Cheshire generated RCTRO issues with 5 packs each; the agent received the full contract, not a vibe |
| 3 — Trust but verify | You reviewed 4 PRs line-by-line; you sent at least one back; the agents addressed the comments |
| 4 — Measurement enables governance | 5 fitness functions + CodeQL + Snyk + Red Queen Review all green; scorecard moved on every merge |
| 5 — Version the contract | Each PR carries a Hatter's Tag naming pack versions; the audit chain is one query |
| 6 — Make governance deterministic | Red Queen denied 2 SEC-101 violations during implementation; those denies are evidence, not failures |

**Read together**, the six rules are an operating model. **The chain is the contract.** Every artifact in the agentic SDLC must connect to the next via a typed reference (project_id, run_id, prompt-pack@version, finding_id, ADR-NNNN, THR-NNN). That is what makes the audit defensible. That is what makes the system trustworthy. That is what separates *"we used AI to write code"* from *"we shipped governed AI-assisted engineering, here is the proof for any auditor."*

---

## Q&amp;A

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 1. What is the minimum a small team needs to adopt this. Could a 3-person startup run it?</summary>

Yes, with priorities adjusted.

**Minimum viable adoption** for a small team:
- Parts 1-2 (mental model + prompt packs) → day one
- Part 3 (live remediation flow) → first sprint
- Part 4 (fitness functions, the 5 canonical ones) → second sprint
- Defer Parts 5-7 until you have at least one production incident that retrospectively a fitness function or Red Queen rule would have caught

The full Part 7 Red Queen install + custom rules + required status checks is overhead a 3-person team can defer. **What you don't defer**: the Hatter's Tag pattern from Part 6. Even a tiny team benefits from "what produced this PR" being one query away, because turnover is real and one of the three people will leave in 18 months.

A 50-person org should run all 8 parts. A 3-person startup runs Parts 1-4 + Part 6's Hatter's Tag now, fills in 5-7 as the team grows. The framework is layered for exactly this kind of incremental adoption.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 2. How does this scale across an org with 50+ BARs?</summary>

The architecture scales because every BAR is independent. Each has its own scorecard, its own tier, its own Red Queen policy, its own audit chain. The mesh aggregates without coupling.

What scales **with effort**:
- **Prompt pack maintenance.** The shipped OWASP/STRIDE/maintainability packs are universal; your team-specific packs need owners. At 50 BARs we recommend a small Prompts Guild (3-5 people across teams) that owns the shared pack library and reviews bumps.
- **CALM model curation.** Cross-BAR flows (the platform layer) need an architect role. Without one, the platform model goes stale and the Red Queen's cross-BAR rules stop biting.
- **Score quality.** At 50 BARs a few will be Restricted, most Supervised, a few mature ones Autonomous. The tier distribution is itself a portfolio-level signal. Looking Glass surfaces this; act on it quarterly.

What scales **for free**:
- The audit chain. `gh search` works across all repos at any size.
- The Hatter's Tag pattern. Same shape per PR regardless of repo count.
- The Red Queen policy generation. `policy.json` is per-BAR but generated from one mesh; no manual scaling.
- The workshop curriculum. New hires walk Parts 1-8 on one celeb-api scenario; the muscle memory transfers to any BAR.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 3. What does the auditor's day-in-the-life look like with this evidence chain?</summary>

Faster, narrower, and more boring, in a good way.

**Before**: an SOC 2 auditor asks *"how was the celeb-api search endpoint introduced?"* The team digs through git log, finds the merge commit, traces back to a PR description that says "I asked Claude to write a search endpoint," looks for tests, reads the diff, asks the reviewer follow-up questions about why specific design decisions were made. **Two days of conversations** to confirm one feature.

**After**: the auditor opens the celeb-api PR for the search endpoint. The PR description carries a Hatter's Tag with: prompt pack name + version + fingerprint, model used, CodeQL finding ID that triggered the work, fitness function results, reviewer handle, Red Queen audit log file path. They read the audit.md (deterministic, sectioned, with hash chain). They run `research-runner verify-audit <run_id>` (or future equivalent) to confirm the chain is intact. **Twenty minutes** to confirm the same feature with stronger evidence.

The auditor's value moves up the stack. From *"reconstruct what happened"* to *"audit the policies that govern what's allowed to happen."* That is more interesting work, and the team's effort goes into governance design (durable) instead of incident archaeology (repeating).

</details>

---

## Try it yourself: ship one more small feature through the chain

You shipped the big cross-cutting feature together. The capstone exercise is to ship **one more small feature solo** to internalise the muscle memory.

### Suggested features

- **Favorite count display**. Add a `favoriteCount` field to the celebrity response (cached, refreshed nightly). One repo change (celeb-api).
- **Recently viewed celebrities**. Track per-session (no persistence needed). One repo change (imdb-react-frontend).
- **CSV export of favorites**. `GET /favorites/export.csv` for a signed-in user. One repo change (celeb-api).

### What to do (the full chain in compact form)

1. Update CALM if a new flow is needed (only the first option; the others reuse existing flows).
2. Cheshire → New Feature → generate the RCTRO with packs.
3. `@claude please remediate` → review the agent's plan → `@claude please implement`.
4. Review the diff against the Requirements.
5. Run fitness functions + scanners + Red Queen Review locally.
6. Merge with the Hatter's Tag footer.
7. Confirm the scorecard moved.

### Check your work

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work</summary>

You shipped a feature governed by all six Golden Rules if you can answer YES to every question:

1. **Stage:** Did I consciously pick AI-Assisted (or Agentic, if the score and rule shape allowed it)? Or did I default into a stage that wasn't justified?
2. **Contract:** Did Cheshire's RCTRO include every pack the work touches, or did I skip "irrelevant" ones that turned out to matter?
3. **Verify:** Did I send the agent's first PR back for at least one comment? If the first draft was perfect, am I sure I reviewed it as carefully as iteration 2 of a harder PR?
4. **Measure:** Are all fitness functions and scanners green on the merge? If not, why did I merge anyway?
5. **Version:** Does my merge commit carry a Hatter's Tag? If I look up the commit a year from now, will I know what produced it?
6. **Deterministic:** Did the Red Queen fire (allow OR deny) during the run? If not, is it because nothing risky was attempted, or because the hooks weren't wired for this code path?

**Six yeses** = governed AI-assisted engineering. **Five yeses** = the missing one is your next improvement area. **Three or fewer** = re-run earlier parts; the muscle memory hasn't set yet.

</details>

---

## What you learned (the whole workshop, distilled)

- **The 70/30 problem evolved.** The proportion of work AI handles is the same; the 30% humans uniquely own widened to include governance design, autonomy calibration, ethics, evidence chains, and systems thinking.
- **Mode + tier + score** is the operating triangle. Mode is the style; tier is the posture; score is the lever that moves the tier. You earn autonomy by improving the score.
- **The RCTRO + prompt pack is the contract.** Bare prompts produce bare bugs. Pack-driven RCTROs produce reviewable PRs. The contract is the work.
- **Reviewing an agent's diff is the new core skill.** Compiling and passing are necessary, not sufficient. The reviewer's job is to confirm the code does what the Requirements said.
- **Fitness functions turn rules into wires.** A rule without a fitness function is a wish. The five canonical functions (complexity, duplicated code, dead code, import boundaries, CALM layer) defend the codebase from the bugs the prompt packs tried to prevent.
- **Scanners produce volume; triage matrices produce decisions.** CodeQL + Snyk + SARIF triage with the right policy is defense in depth.
- **Prompts are versioned assets.** The Hatter's Tag is the manifest that ties every PR to the exact pack, model, and reviewer that produced it.
- **Governance is deterministic at the agent's tool-call boundary.** Red Queen hooks block bad changes before they happen; the audit chain records every allow, deny, and override.
- **The chain is the contract.** Every artifact connects to the next via a typed reference. The auditor’s question, *"how was this produced?"* is one git query.
- **Both Claude Code and Copilot Coding Agent are governed by the same rules.** The agent's identity does not change the contract.
- **Small teams adopt incrementally; large orgs adopt the whole framework.** Layered design means Parts 1-4 + Part 6 are the minimum viable subset; Parts 5-7 are organisational maturity work.

---

## The chain is the contract — the meta-rule

The six numbered Golden Rules are operational. They tell you what to do. **Read them together** and one meta-rule emerges:

> **Every artifact in the agentic SDLC must connect to the next via a typed reference.**

`project_id` connects the parent issue to the RCTRO issues. `run_id` connects the audit log to the deliverable. `prompt-pack@version` connects the PR to the institutional memory. `THR-NNN` / `ADR-NNNN` / `A0X` / `FR-NN` connect the requirements to the mesh artifacts that justify them. The hash chain connects every audit event to the previous one.

When every link is typed, the audit chain becomes a graph. When the graph is queryable, the audit becomes a sentence: *"PRJ-IMDB-FAV-001 was produced by Claude Opus 4.7 over four PRs governed by Red Queen at Supervised tier, addressing OWASP A01/A03/A09 and complexity/DRY packs at versions X/Y/Z, reviewed by @you and @teammate, with audit chain root sha256:abc."* That is the artifact a SOC 2 reviewer wants. That is the artifact an EU AI Act auditor will require. That is what we built across eight workshop parts.

---

## What is next: the next chapter (after the workshop ships)

The current workshop ends here. Implementation is on you and your team.

**What's coming.** A future workshop addition will start this whole chain **even earlier**, with two new agents:

- **The Archeologist** does market research and codebase archaeology grounded in the mesh, produces a versioned research document
- **The PRD agent** turns research into a structured PRD with mesh-grounded requirements, architecture review, security review, and an iterative refinement loop

The handoff goes: research PR merges in mesh → PRD PR opens → PRD PR merges → Cheshire RCTRO issue lands in code repo → alice-remediation implements (Parts 3-7 above) → ships.

You can read the [Research + PRD agents design doc](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/docs/design/research-and-prd-agents.md) for the architectural details: Looking Glass-side placement, mesh-rooted destinations, NCMS-pattern semistructured prompts with full ID-based bidirectional traceability, deterministic API calls (Tavily / arXiv / USPTO / HN), tree-sitter archaeology, the cyclic refinement loop with score progression, the four-expert review pattern (architect knowledge + security knowledge + architect review + security review), pre-call and post-call guardrails with audit integration, and the full Looking Glass UX integration.

When that lands, the workshop's full arc will be:

```
PM wonders about a feature
       ↓
Archeologist (mesh-side) → research document with audit chain
       ↓
PRD agent (mesh-side) → grounded PRD with mesh citations
       ↓
[Parts 3-7 above: Cheshire generates RCTRO, agent implements, reviewed, governed by Red Queen]
       ↓
Cross-cutting feature ships with the full chain, from wondered to shipped, every step audited
```

For now: you have a complete, working, governed AI-assisted SDLC. The remaining work is yours to ship.

---

> *"Why, sometimes I've believed as many as six impossible things before breakfast."* — The White Queen
>
> We built every one of them.
