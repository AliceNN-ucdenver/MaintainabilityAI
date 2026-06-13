# Part 3: Alice Remediates

<div class="docs-workshop-hero docs-workshop-emerald">
  <div class="docs-workshop-number">3</div>
  <div>
    <div class="docs-card-kicker">Workshop Part 3 · Alice Remediates</div>
    <h2 class="docs-workshop-title">Alice Remediates</h2>
    <p class="docs-workshop-subtitle">Live A03 NoSQL Injection Fix on the brownfield movie-api. CodeQL → Cheshire → Alice → Review → Merge.</p>
  </div>
  <div class="docs-workshop-meta">
    <strong class="docs-strong">Duration:</strong> 90 minutes<br/>
    <strong class="docs-strong">Prerequisites:</strong> <a href="/docs/workshop/part2-security-prompting" class="markdown-link">Part 2 complete</a>. You have the RCTRO pattern, the three pack families, and a movie-api with scaffolded workflows.<br/>
    <strong class="docs-strong">SDLC phase:</strong> Phase 2 (Implementation) + Phase 3 (Verification).<br/>
    <strong class="docs-strong">Status:</strong> Available now
  </div>
</div>

> Part 3 is the live class, run against the **brownfield `movie-api`** — the existing repo full of planted vulnerabilities (celeb-api is the *greenfield* build track; you build it from scratch in Part 8). CodeQL fires on movie-api. Cheshire enriches the A03 NoSQL injection issue (the stack is MongoDB; A03 in 2026 is operator injection — `$ne`, `$where`, unbounded regex, request bodies fed straight into selectors). You **dispatch Alice** — the Copilot maintenance-agent persona — from the Cheshire Scorecard. Alice opens a PR under the repo's baked Red Queen policy. **The next 60 minutes are about being a good reviewer.** Reading the diff line-by-line against the RCTRO Requirements, running the tests, deciding whether to approve or request changes, then merging with the AI disclosure footer. By the end the movie-api scorecard moves up visibly.

---

## What you will have built when you leave

1. The brownfield movie-api on GitHub. CodeQL Security Analysis green-checked on the first run, finding the planted vulnerabilities.
2. The A03 issue enriched with Cheshire (Part 2 walked the *what*; today we run it).
3. **Alice dispatched** from the Scorecard — a PR open, with the agent's summary and diff, every tool call logged to `.redqueen/audit-log.jsonl`.
4. The diff **reviewed line-by-line against the RCTRO Requirements**. At least one request-for-changes round demonstrated.
5. Tests run locally. The planted NoSQL injection regression tests (operator-injection `$ne`, server-side `$where`, unbounded regex DoS) now pass against the fixed code. The same tests still fail against the original.
6. The PR merged with an AI disclosure footer naming the prompt pack version, the CodeQL finding ID, and the human reviewer.
7. A second remediation run solo, on the A01 broken-access-control issue in movie-api (unauthenticated `POST /movies`), with the same workflow.
8. Scorecard moves: Code Security and Test Coverage both improve.
9. Golden Rule 3 internalised: **Trust but verify. Every line, every test, every Requirement.**

---

## Recap from Part 2

Part 2 was the theory class. You learned the RCTRO pattern in depth, toured the three pack families (OWASP, STRIDE, Maintainability), and drafted an RCTRO for a new feature so you could see how the packs change the Requirements section from "four things I remembered" to "thirty things institutional memory has". Part 3 is where the contract meets the agent.

---

## The live remediation loop

The flow you are about to run end-to-end is one rectangle on a diagram and a handful of steps in practice.

| Step | Who does it | What happens |
|---|---|---|
| 1 | Engineer | Push code to GitHub (movie-api is already on GitHub as a brownfield repo). |
| 2 | CodeQL workflow | Runs on push, produces SARIF. |
| 3 | codeql-to-issues workflow | Reads SARIF, opens GitHub Issues labelled `codeql-finding`. |
| 4 | Engineer (in VS Code) | Open Cheshire → Security Scorecard → the maintenance-issues list → pick the A03 issue → **Enrich with RCTRO**. |
| 5 | Cheshire | Loads the matching OWASP pack, grounds the RCTRO in the repo's real files, posts it back to the issue, adds the `rctro-feature` label. |
| 6 | Engineer | **Dispatch Alice** (one click on the issue's row). No magic comment — Cheshire assigns the `alice-maintenance-agent` Copilot persona. |
| 7 | Alice | Reads the RCTRO + `.cheshire/prompts/`, plans, and opens a PR (first line `Closes #N`) with the diff and a checklist — under the repo's baked Red Queen policy. |
| 8 | Engineer | **Review the PR against the RCTRO. Run tests. Approve or request changes. Merge.** |

Step 8 is where the human does the most work. Steps 1 to 7 are plumbing. Today we focus on doing step 8 well.

---

## The agentic shift

In 2024, the engineer's core skill was *writing* the fix. In 2026-2027, the engineer's core skill is *reviewing the fix the agent wrote*. The agentic shift moves human work upstream into the contract (Part 2) and downstream into the review (Part 3). The typing in the middle becomes the agent's job.

This is not a downgrade. Reading a diff well, against a written contract, with tests as evidence, is harder than typing. The reviewer is now responsible for catching the things the agent's training data does not know about: your codebase's specific conventions, your team's tacit rules, the second-order effects on other services, the requirement that lives in a Slack thread from six months ago. That work cannot be delegated.

---

## A note on governance: Alice runs under the Red Queen

Alice is not an unconstrained agent. The repo carries a **baked, deterministic Red Queen policy** (`.redqueen/policy.json`, provisioned from the mesh when you scaffolded in Part 1). Every tool call Alice makes passes a PreToolUse hook that allows or denies it against that policy — fail-closed — and appends the decision to `.redqueen/audit-log.jsonl`. There is no mid-run "please validate" round-trip; the policy is law at the tool-call boundary.

For movie-api, the BAR (`APP-IMDB-001`) is governed enough by now for Alice to open the PR directly. On a **Restricted-tier** BAR (like the sparse Celebs BAR you met in Part 1), the policy hard-denies `Write`/`Bash`, and a human would first grant a **scoped, audited break-glass** before Alice could remediate — that is the Part 7 story. Either way, the merge-time `impl-provenance` gate re-verifies the signed decision chain before the PR can land.

---

## Walkthrough: live A03 remediation

This walkthrough takes 60 minutes if everyone is on the same page. Budget time for the agent run (3 minutes), the review (20 minutes including discussion), and one request-for-changes round (15 minutes).

### Step 1. Make sure movie-api is on GitHub

The CodeQL workflow Cheshire scaffolded does nothing until the code is on GitHub. If you're starting from the workshop pack, push the brownfield movie-api:

```bash
cd repos/movie-api
gh repo create movie-api --private --source=. --remote=origin --push
```

The push triggers the `CodeQL Security Analysis` workflow automatically. (In the hosted sample the repo already exists; a `git push` is enough.)

### Step 2. Watch CodeQL run

Open the repo on GitHub. The **Actions** tab shows two workflows.

- **CodeQL Security Analysis** running now (`.github/workflows/codeql.yml`)
- **CodeQL to Security Issues** queued, waiting on CodeQL to complete (`.github/workflows/codeql-to-issues.yml`)

CodeQL takes 2 to 4 minutes on a TypeScript repo this size. The second workflow fires automatically on the `workflow_run: completed` trigger and downloads the SARIF artifact.

### Step 3. Read the auto-created issues

After both workflows complete, go to the **Issues** tab. You should see the planted findings:

```
#1  [codeql-finding] [owasp/A03] NoSQL injection in src/routes/movies.ts (user-controlled selector via ?genre=)
#2  [codeql-finding] [owasp/A01] Missing access control on POST /movies in src/routes/movies.ts
#3  [codeql-finding] [owasp/A10] Server-side request forgery in src/routes/poster-proxy.ts
#4  [codeql-finding] [owasp/A06] Vulnerable dependency: lodash@4.17.15
```

Each issue body has the CodeQL finding: file, line numbers, rule ID, severity, the OWASP category, and links to the OWASP catalogue page. What is missing is the *team's contract* for fixing it. That is what Cheshire adds next.

### Step 4. Enrich the A03 issue with Cheshire

In VS Code with the movie-api workspace open, click the **Cheshire Cat** icon → **Security Scorecard**. The panel lists the open maintenance issues in your repo. Find issue #1 (the NoSQL injection on `/movies?genre=`).

Click **Enrich with RCTRO**. The panel does three things:

1. Reads the CodeQL finding and the labelled OWASP category.
2. Loads the matching prompt pack from `.cheshire/prompts/owasp/A03_injection.md`.
3. Generates an RCTRO body **grounded in the repo's real files** and posts it back to the issue, keeping the original CodeQL details in a collapsed `<details>` block.

Open the issue on GitHub. The body now has full Role / Context / Task / Requirements / Output sections, with the A03 pack's checklist expanded inline under Requirements. The labels now include `rctro-feature` alongside the original `codeql-finding`.

### Step 5. Dispatch Alice

On the issue's row in the Scorecard (or from the issue's inline action), click **Dispatch to Alice**. Cheshire assigns the **`alice-maintenance-agent`** Copilot persona to the issue (via the Copilot Coding Agent assignment API — no `@`-mention magic word). Alice is told to read the RCTRO and the `.cheshire/prompts/` packs and to open a PR that closes the issue.

Alice works in two visible stages:

**Plan.** Alice reads the RCTRO, restates the Requirements, and posts a plan/summary. It should name every Requirement and how it intends to satisfy it. If a Requirement is missing from the plan, say so on the PR — Alice revises on the same branch.

**Implement.** Alice opens a PR with the diff (branch `copilot/…`). The PR description's first line is `Closes #1`, followed by a checklist of every Requirement and how it was addressed.

Wait 2 to 4 minutes. The PR appears, and every tool call Alice made is in `.redqueen/audit-log.jsonl` on the branch.

### Step 6. Review the diff against the RCTRO

This is the part of the class where you slow down. Open the PR and pull up the original issue RCTRO side by side. Walk through every Requirement in order.

For the A03 NoSQL injection fix, the Requirements section listed at minimum:

| Requirement from RCTRO | What you check in the PR |
|---|---|
| Zod schema rejects `$`-prefixed keys, restricts types | Find the new validator file. Confirm the schema parses `req.query.genre` as `z.string()` (not `z.unknown()`), max length 100, allowlist regex (e.g. `^[a-zA-Z0-9 .\-']+$`), and **explicitly rejects any object whose keys start with `$`** so `?genre[$ne]=` cannot bypass it. |
| Selector built from validated value, not raw req object | Grep the diff for `Movies.find(req.` and `Movies.findOne(req.`. There should be zero hits. The selector should be built from the parsed value: `{ genre: parsed.genre }` (or `{ genre: { $regex: escapeRegex(parsed.genre), $options: 'i' } }` if substring matching is needed). |
| No `$where`, `$accumulator`, `$function`; regex inputs are escaped | Search the diff for `$where`, `$accumulator`, `$function`. None should appear in route code. Any user-derived value passed to `$regex` must go through a regex-escape helper to block ReDoS / unanchored DoS. |
| Hard `.limit(20)` on every find; projection allowlist | Look at the query call. The driver call should chain `.limit(20)` server-side, not slice the result client-side. A `.project({ ratingsInternal: 0 })` (or an explicit allowlist projection) prevents schema leakage. |
| Generic error messages, no driver error leakage | Check the catch block. Returns "search failed" or similar, not the Mongo driver error object (which can echo back the offending selector and the collection schema). No stack trace in production. |
| Tests: valid, empty, operator-injection (`$ne`), `$where`, regex DoS, oversized | Open the new test file. Count: there must be at least six test cases, including `genre[$ne]=` (operator-injection bypass), a `$where` payload, an unbounded regex like `.*.*.*.*.*x`, and an oversized payload of 200+ chars. |

If any row is partial or missing, comment on the specific line in the PR. Alice will see the comment when you re-dispatch.

### Step 7. The deliberate request-for-changes round

To make the class real, *do not* approve the first PR. Find at least one Requirement that the agent under-delivered on. The most common misses are:

- Operator-injection test missing (the agent validates *string* shape but never sends `genre[$ne]=` to prove the object-shape attack is closed).
- Error message includes the Mongo driver error (still leaking the collection name and the offending selector shape).
- Validator is in the route file instead of `src/validators/`, so the `$`-key reject isn't reusable across routes.
- `.limit()` applied to the JS array, not chained on the driver query — server still fetches every match.

Comment on the specific line. Then **re-dispatch Alice** from the issue (or comment the review note and re-assign) — Alice fires again and new commits land on the same PR.

This is the discipline. **An agent's first draft is a draft.** The reviewer's job is to keep iterating until the contract is met.

### Step 8. Run the tests locally

Pull the PR branch.

```bash
git fetch origin
git checkout copilot/fix-a03-movies-injection
npm install
npm test -- movies
```

Confirm:

- All new test cases in `src/routes/__tests__/movies.test.ts` pass.
- The `genre[$ne]=` operator-injection test, run against the **original** code on `main`, **fails** (it returns the full collection because `{ genre: { $ne: null } }` matches every document). Run it against the new code, it passes (the Zod `$`-key reject returns 400 before the selector ever reaches the driver, per the RCTRO).

A test that passes against both the old and new code is not a regression test. It is decoration. Make the agent rewrite it.

### Step 9. Merge with the AI disclosure footer

When the review is complete and the tests pass:

```
Merge commit message:

fix(movie-api): A03 NoSQL injection in /movies?genre= selector

🤖 AI-assisted with Alice (alice-maintenance-agent) under the Red Queen policy
Prompt pack: .cheshire/prompts/owasp/A03_injection.md @ v1.0.0
CodeQL finding ID: js/nosql-injection (rule)
Issue: #1
Reviewer: @your-handle
```

This is the **start** of the Hatter's Tag. Part 6 turns this footer into a signed manifest. For now, the discipline is: every AI-assisted commit names what produced it and who approved it.

### Step 10. Re-read the scorecard

Switch back to VS Code → Cheshire Cat → Security Scorecard. Refresh.

The score moved. Not all the way, but *visibly* — Code Security closes one of the findings, and Test Coverage rises as `movies.test.ts` adds coverage. Three more remediation runs (A01, A10, A06) plus the fitness functions in Part 4 will keep the curve climbing.

---

## Q&amp;A

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 1. Alice's PR looked correct on the first read. Should I just merge it?</summary>

No. Two things to do first.

**Pull the branch and run the operator-injection regression test (`genre[$ne]=`) against `main`.** A regression test that does not fail on the unfixed code is decoration, not a test. This is the most common miss in AI-generated security fixes: the test asserts that the *new* code returns the right thing, without proving the *old* code returned the wrong thing. If you skip this check, you have shipped a test that will pass forever, including if the bug regresses.

**Read the diff line-by-line against the Requirements section of the RCTRO**, not against the CodeQL finding. The CodeQL finding tells you what is broken. The Requirements tell you what *good looks like for your team*. An agent can fix the CodeQL finding without satisfying your Requirements (e.g., it stopped the operator injection but skipped the projection allowlist). Both things have to be true for you to merge.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 2. Alice's plan/summary looked thin. Can I tell it to redo the plan before it implements?</summary>

Yes, and you should. Read Alice's plan/summary against the RCTRO Requirements *before* you dig into the diff:

1. Read it against the RCTRO Requirements.
2. If anything is missing, comment on the PR: "the plan does not cover requirement X — please regenerate the approach with X included," then re-dispatch.
3. Only when the plan is complete do you let the diff stand for a full review.

Most teams learn this the hard way. A vague plan produces a vague diff that takes longer to review than the plan would have taken to fix. **Plan first, implement second.** (On a Restricted-tier BAR the Red Queen *enforces* this: the policy makes the agent plan-first and denies `Write` until a human grants break-glass — see Part 7.)

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 3. What if the agent produces a fix that is technically correct but stylistically wrong for our codebase?</summary>

Two answers, depending on whether the style issue should be enforced.

**If it should be enforced**, this is a Maintainability pack problem. Add the rule to `maintainability/single-responsibility.md` or `maintainability/dry-principle.md` (or write a new team-specific pack). The next agent run will read the updated pack and produce the right style. This is how teams accumulate institutional memory: every "we don't do it that way" becomes a pack.

**If it is one-off taste**, comment on the line, accept that the agent will not always match every preference, and merge. The cost of an extra review pass is real. The cost of a stylistic ratchet that does not catch real bugs is higher.

Part 4's fitness functions enforce the most important rules automatically. The CALM-layer enforcement we generate there is the architectural-style equivalent of "we don't do it that way".

</details>

---

## Try it yourself: A01 broken access control on movie-api's POST /movies

You walked through A03 together. Now do A01 solo on movie-api's `POST /movies` endpoint — it currently accepts unauthenticated requests and should be admin-only. Same workflow, same repo, different pack.

### Setup

movie-api is already pushed from Step 1. CodeQL has already produced the findings. The A01 one (`Missing access control on POST /movies`) is the target this round.

### The workflow

1. Open Cheshire → Security Scorecard.
2. Pick the A01 issue.
3. Click **Enrich with RCTRO**. Cheshire pulls in `.cheshire/prompts/owasp/A01_broken_access_control.md`.
4. Read the RCTRO. The Requirements section should call for: an auth middleware that verifies a valid admin JWT, deny-by-default on the route, a 401/403 (not 200) for anonymous + non-admin callers, and tests that prove an anonymous `POST /movies` is rejected.
5. **Dispatch Alice.**
6. Wait. Review. Iterate.
7. Run the tests. Confirm an anonymous create is rejected and an admin create succeeds.
8. Merge with the AI disclosure footer.

### Check your work

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work</summary>

A common agent miss on A01: adding the auth check to `POST /movies` but leaving a sibling mutating route (`PUT /movies/:id`, `DELETE /movies/:id`) wide open. Deny-by-default means the middleware guards the *router*, not one handler.

Second common miss: checking that the JWT is *valid* but not that it carries the *admin* role — any logged-in user can then create movies. The Requirement is admin-only, not authenticated-only.

Third common miss: a test that asserts the admin path works but never asserts the anonymous path is **rejected**. The regression test must prove the door was open before and is closed now.

If you caught at least two of these three in your review, you are reading like a 2026 engineer. If you missed all three, re-read Alice's plan and ask Cheshire to expand the A01 pack Requirements in the prompt.

</details>

---

## What you learned

- **The live remediation loop**: push to GitHub → CodeQL fires → `codeql-to-issues` opens labelled GitHub Issues → Cheshire **Enrich with RCTRO** grounds the pack-backed contract in the issue → **Dispatch Alice** (the `alice-maintenance-agent` Copilot persona, assigned by Cheshire — no magic comment) → Alice opens a PR under the baked Red Queen policy.
- **Alice runs governed.** Every tool call passes the deterministic PreToolUse policy and lands in `.redqueen/audit-log.jsonl`; the merge-time `impl-provenance` gate re-verifies the chain. On a Restricted-tier BAR you grant a scoped break-glass first (Part 7).
- **Read Alice's plan/summary first**, then the diff. If a Requirement is missing from the plan, say so and re-dispatch before reviewing the diff in depth. **Plan first, implement second.**
- **Review the diff against the Requirements section of the RCTRO**, not against the CodeQL finding. The finding tells you what is broken. The Requirements tell you what *good looks like for your team*. Both have to be true to merge.
- **A regression test that passes against both old and new code is decoration**, not a test. Pull the branch and confirm the test *fails* against `main` before approving.
- **The AI disclosure footer is non-negotiable.** Every AI-assisted commit names the prompt pack and version, the CodeQL finding ID, the issue number, and the human reviewer. This is the start of the **Hatter's Tag** that Part 6 turns into a signed manifest.
- **Common agent misses to catch in review:** operator-injection test skipped (the agent validates string shape but never sends `genre[$ne]=` to prove the object-shape attack is closed), error messages include the Mongo driver object (still leaking the collection name and the offending selector), `.limit()` applied to the JS array instead of chained on the driver query, validator placed in the route file instead of `src/validators/` so the `$`-key reject is not reusable. Different domain, similar pattern: A01 auth added to one handler but not its siblings, valid-JWT checked without the admin role, a test that proves the happy path but never the rejected path.
- **The agentic shift is now concrete.** Your contribution to the actual code was one click: *Dispatch Alice*. Your contribution before that (Parts 1 and 2) and after that (this review) was where the human work actually lives.

---

## The Golden Rule for this part

> **Rule 3. Trust but verify. Every line, every test, every Requirement.**
>
> The agent will produce code that compiles and tests that pass. Compiling and passing are necessary, not sufficient. The reviewer's job is to confirm that the code *does what the Requirements said it should*, the tests *prove the bug was actually broken before*, and nothing snuck in that the Requirements did not authorise. This is the new core skill of the agentic SDLC. It does not get easier with seniority. It gets sharper.

---

## What is next: Part 4. The Looking Glass Measures

The A03 is fixed today. What stops it (and its cousins) from coming back tomorrow? In Part 4 we use the same Cheshire enrich → dispatch → review workflow on movie-api, but pointed at a different problem class: generating fitness functions that prevent regression. The agent will produce a set of them, including one that reads the BAR's CALM model and enforces architectural layer rules. That last one is the bridge into Part 7's Red Queen.

Scorecard goal for Part 4: keep the curve climbing.

[Continue to Part 4 →](/docs/workshop/part4-fitness-functions)
