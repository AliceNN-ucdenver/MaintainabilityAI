# Part 3: Alice Remediates

<div class="docs-workshop-hero docs-workshop-emerald">
  <div class="docs-workshop-number">3</div>
  <div>
    <div class="docs-card-kicker">Workshop Part 3 · Alice Remediates</div>
    <h2 class="docs-workshop-title">Alice Remediates</h2>
    <p class="docs-workshop-subtitle">Live A03 SQL Injection Fix. CodeQL → Cheshire → Agent → Review → Merge.</p>
  </div>
  <div class="docs-workshop-meta">
    <strong class="docs-strong">Duration:</strong> 90 minutes<br/>
    <strong class="docs-strong">Prerequisites:</strong> <a href="/docs/workshop/part2-security-prompting" class="markdown-link">Part 2 complete</a>. You have the RCTRO pattern, the three pack families, and a celeb-api with scaffolded workflows.<br/>
    <strong class="docs-strong">SDLC phase:</strong> Phase 2 (Implementation) + Phase 3 (Verification).<br/>
    <strong class="docs-strong">Status:</strong> Available now
  </div>
</div>

> Part 3 is the live class. The celeb-api goes to GitHub. CodeQL fires. Cheshire enriches the A03 SQL injection issue. You comment `@claude please remediate`. The agent opens a draft PR. **The next 60 minutes are about being a good reviewer.** Reading the diff line-by-line against the RCTRO Requirements, running the tests, deciding whether to approve or request changes, then merging with the AI disclosure footer. By the end the celeb-api scorecard moves from 5 to roughly 15.

---

## What you will have built when you leave

1. The celeb-api pushed to GitHub. CodeQL Security Analysis green-checked on the first run, finding the four planted vulnerabilities.
2. The A03 issue enriched with Cheshire (Part 2 walked the *what*; today we run it).
3. The `alice-remediation` workflow invoked. A draft PR open, with the agent's plan and diff.
4. The diff **reviewed line-by-line against the RCTRO Requirements**. At least one request-for-changes round demonstrated.
5. Tests run locally. The planted SQL injection regression test now passes against the fixed code. The same test still fails against the original.
6. The PR merged with an AI disclosure footer naming the prompt pack version, the CodeQL finding ID, and the human reviewer.
7. A second remediation run solo, on the A07 auth issue in imdb-identity, with the same workflow.
8. Scorecard: **5 → ~15**. Code Security and Test Coverage both move.
9. Golden Rule 3 internalised: **Trust but verify. Every line, every test, every Requirement.**

---

## Recap from Part 2

Part 2 was the theory class. You learned the RCTRO pattern in depth, toured the three pack families (OWASP, STRIDE, Maintainability), and drafted an RCTRO for the "Add Celebrity Favorites" feature so you could see how the packs change the Requirements section from "four things I remembered" to "thirty things institutional memory has". Part 3 is where the contract meets the agent.

---

## The live remediation loop

The flow you are about to run end-to-end is one rectangle on a diagram and seven steps in practice.

| Step | Who does it | What happens |
|---|---|---|
| 1 | Engineer | Push code to GitHub. |
| 2 | CodeQL workflow | Runs on push, produces SARIF. |
| 3 | codeql-to-issues workflow | Reads SARIF, opens GitHub Issues labelled `codeql-finding`. |
| 4 | Engineer (in VS Code) | Open Cheshire → Issue Management → pick the issue → click Enrich with RCTRO. |
| 5 | Cheshire | Loads the matching OWASP pack, writes the RCTRO body, posts back to the issue, adds the `rctro-feature` label. |
| 6 | Engineer | Comment `@claude please remediate` on the issue. |
| 7 | alice-remediation workflow | Plans the fix, opens a draft PR with the diff and a checklist. |
| 8 | Engineer | **Review the PR against the RCTRO. Run tests. Approve or request changes. Merge.** |

Step 8 is where the human does the most work. Steps 1 to 7 are plumbing. Today we focus on doing step 8 well.

---

## The agentic shift

In 2024, the engineer's core skill was *writing* the fix. In 2026-2027, the engineer's core skill is *reviewing the fix the agent wrote*. The agentic shift moves human work upstream into the contract (Part 2) and downstream into the review (Part 3). The typing in the middle becomes the agent's job.

This is not a downgrade. Reading a diff well, against a written contract, with tests as evidence, is harder than typing. The reviewer is now responsible for catching the things the agent's training data does not know about: your codebase's specific conventions, your team's tacit rules, the second-order effects on other services, the requirement that lives in a Slack thread from six months ago. That work cannot be delegated.

---

## Walkthrough: live A03 remediation

This walkthrough takes 60 minutes if everyone is on the same page. Budget time for the agent run (3 minutes), the review (20 minutes including discussion), and one request-for-changes round (15 minutes).

### Step 1. Push the celeb-api to GitHub

In Part 1 you scaffolded the repo locally. The CodeQL workflow Cheshire added does nothing until the code lives on GitHub. Push it.

```bash
cd repos/celeb-api
gh repo create celeb-api --private --source=. --remote=origin --push
```

The push triggers the `CodeQL Security Analysis` workflow automatically.

### Step 2. Watch CodeQL run

Open the repo on GitHub. The **Actions** tab shows two workflows.

- **CodeQL Security Analysis** running now (`.github/workflows/codeql.yml`)
- **CodeQL to Security Issues** queued, waiting on CodeQL to complete (`.github/workflows/codeql-to-issues.yml`)

CodeQL takes 2 to 4 minutes on a TypeScript repo this size. The second workflow fires automatically on the `workflow_run: completed` trigger and downloads the SARIF artifact.

### Step 3. Read the auto-created issues

After both workflows complete, go to the **Issues** tab. You should see four new issues:

```
#1  [codeql-finding] [owasp/A03] SQL injection in src/routes/search.ts
#2  [codeql-finding] [owasp/A01] Missing access control on src/routes/celebrity.ts
#3  [codeql-finding] [owasp/A10] Server-side request forgery in src/routes/image-proxy.ts
#4  [codeql-finding] [owasp/A06] Vulnerable dependency: lodash@4.17.15
```

Each issue body has the CodeQL finding: file, line numbers, rule ID, severity, the OWASP category, and links to the OWASP catalogue page. What is missing is the *team's contract* for fixing it. That is what Cheshire adds next.

### Step 4. Enrich the A03 issue with Cheshire

In VS Code with the celeb-api workspace open, click the **Cheshire Cat** icon → **Issue Management**. The panel lists open issues in your repo. Find issue #1 (the SQL injection on `/search`).

Click **Enrich with RCTRO**. The panel does three things:

1. Reads the CodeQL finding and the labelled OWASP category.
2. Loads the matching prompt pack from `.cheshire/prompts/owasp/A03_injection.md`.
3. Generates an RCTRO body and posts it back to the issue, keeping the original CodeQL details in a collapsed `<details>` block.

Open the issue on GitHub. The body now has full Role / Context / Task / Requirements / Output sections, with the A03 pack's checklist expanded inline under Requirements. The labels now include `rctro-feature` alongside the original `codeql-finding`. **Both labels matter for the next step:** the `alice-remediation` workflow only fires for issues carrying one of `codeql-finding`, `rctro-feature`, or `ci-failure`.

### Step 5. Assign the remediation agent

Scroll to the bottom of the issue. In the comment box, type:

```
@claude please remediate
```

Click **Comment**. The `alice-remediation` workflow fires. It is gated on the comment containing `@claude` or `@alice` *and* the issue carrying at least one of the eligible labels. Both conditions are met.

The workflow runs in two phases.

**Phase 1: Analysis and Planning.** Claude reads the RCTRO, restates the Requirements, and posts a plan as a comment on the issue. The plan should name every Requirement section item and how the agent intends to satisfy it. If a Requirement is missing from the plan, **stop the run** (comment "do not proceed; the plan is missing the SQLi unicode payload test") and let it regenerate.

**Phase 2: Implementation.** Claude opens a draft PR with the diff. The PR description includes a checklist of every Requirement and how it was addressed.

Wait 2 to 4 minutes. The draft PR appears.

### Step 6. Review the diff against the RCTRO

This is the part of the class where you slow down. Open the PR and pull up the original issue RCTRO side by side. Walk through every Requirement in order.

For the A03 SQL injection fix, the Requirements section listed at minimum:

| Requirement from RCTRO | What you check in the PR |
|---|---|
| Parameterised queries (`pg` `$1` placeholders) | Grep the diff for any remaining string concatenation in SQL. There should be zero. The query should use `$1`, `$2` placeholders. |
| Zod validation: allowlist regex, max 100 chars | Find the new validator file. Confirm the regex is `^[a-zA-Z0-9 .\-']+$` (or equivalent allowlist, not a blocklist). Confirm length limit. |
| Hard-limit `LIMIT 20` in SQL itself, not just JS | Look at the SQL string. The `LIMIT` clause should be hardcoded in the SQL, not appended by application code. |
| Generic error messages, no schema leakage | Check the catch block. Returns "search failed" or similar, not the pg error object. No stack trace in production. |
| Tests: valid, empty, SQLi payload, oversized, unicode | Open the new test file. Count: there must be at least five test cases, including a SQLi payload like `'; DROP TABLE celebrities; --` and an oversized payload of 200+ chars. |

If any row is partial or missing, comment on the specific line in the PR. The agent will see the comment when you re-run it.

### Step 7. The deliberate request-for-changes round

To make the class real, *do not* approve the first PR. Find at least one Requirement that the agent under-delivered on. The most common misses are:

- Unicode payload test missing (the agent often does ASCII SQLi only).
- Error message includes the pg error code (still leaking schema info).
- Validator is in the route file instead of `src/validators/`.

Comment on the specific line. Then post on the issue: `@claude please address the review comments.` The workflow fires again. New commits land on the same PR.

This is the discipline. **An agent's first draft is a draft.** The reviewer's job is to keep iterating until the contract is met.

### Step 8. Run the tests locally

Pull the PR branch.

```bash
git fetch origin
git checkout claude/fix-a03-search-injection
npm install
npm test -- search
```

Confirm:

- All new test cases in `src/routes/__tests__/search.test.ts` pass.
- The SQLi payload test, run against the **original** code on `main`, **fails** (it returns rows or 500s). Run it against the new code, it passes (returns empty result with 400 or 200 and an empty array, per the RCTRO).

A test that passes against both the old and new code is not a regression test. It is decoration. Make the agent rewrite it.

### Step 9. Merge with the AI disclosure footer

When the review is complete and the tests pass:

```
Merge commit message:

fix(celeb-api): A03 SQL injection in /search endpoint

🤖 AI-assisted with Claude Code Action via alice-remediation workflow
Prompt pack: .cheshire/prompts/owasp/A03_injection.md @ v1.0.0
CodeQL finding ID: js/sql-injection (rule)
Issue: #1
Reviewer: @your-handle
```

This is the **start** of the Hatter's Tag. Part 6 turns this footer into a signed manifest. For now, the discipline is: every AI-assisted commit names what produced it and who approved it.

### Step 10. Re-read the scorecard

Switch back to VS Code → Cheshire Cat → Security Scorecard. Refresh.

```
celeb-api                                 14 / 100      RESTRICTED  (up from 5)
  Code Security                            5 / 25       yellow  (1 of 4 findings closed)
  Test Coverage                            8 / 20       yellow  (search.test.ts adds coverage)
  Technical Debt                           0 / 15       red
  Dependency Freshness                     0 / 15       red
  Complexity                               0 / 15       red
  Architecture                             1 / 10       red    (CALM linkage on the touched file)
```

The score moved. Not all the way, but *visibly*. Three more remediation runs (A01, A10, A06) plus the fitness functions in Part 4 will keep the curve climbing.

---

## Q&amp;A

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 1. The agent's PR looked correct on the first read. Should I just merge it?</summary>

No. Two things to do first.

**Pull the branch and run the SQLi regression test against `main`.** A regression test that does not fail on the unfixed code is decoration, not a test. This is the most common miss in AI-generated security fixes: the test asserts that the *new* code returns the right thing, without proving the *old* code returned the wrong thing. If you skip this check, you have shipped a test that will pass forever, including if the bug regresses.

**Read the diff line-by-line against the Requirements section of the RCTRO**, not against the CodeQL finding. The CodeQL finding tells you what is broken. The Requirements tell you what *good looks like for your team*. An agent can fix the CodeQL finding without satisfying your Requirements (e.g., it parameterised the query but skipped Zod validation). Both things have to be true for you to merge.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 2. The agent's planning comment looked thin. Can I tell it to redo the plan before it implements?</summary>

Yes, and you should. The `alice-remediation` workflow runs planning and implementation as separate phases for exactly this reason. When the planning comment lands:

1. Read it against the RCTRO Requirements.
2. If anything is missing, comment on the issue: `@claude the plan does not cover requirement X. Please regenerate the plan with X included.`
3. The workflow regenerates the plan without producing a diff.
4. Only when the plan is complete do you let it proceed: `@claude the plan is good. Please implement.`

Most teams learn this the hard way. A vague plan produces a vague diff that takes longer to review than the plan would have taken to fix. **Plan first, implement second.**

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 3. What if the agent produces a fix that is technically correct but stylistically wrong for our codebase?</summary>

Two answers, depending on whether the style issue should be enforced.

**If it should be enforced**, this is a Maintainability pack problem. Add the rule to `maintainability/single-responsibility.md` or `maintainability/dry-principle.md` (or write a new team-specific pack). The next agent run will read the updated pack and produce the right style. This is how teams accumulate institutional memory: every "we don't do it that way" becomes a pack.

**If it is one-off taste**, comment on the line, accept that the agent will not always match every preference, and merge. The cost of an extra review pass is real. The cost of a stylistic ratchet that does not catch real bugs is higher.

Part 4's fitness functions enforce the most important style rules automatically. The CALM-layer enforcement we generate there is the architectural-style equivalent of "we don't do it that way".

</details>

---

## Try it yourself: A07 auth failures on imdb-identity

You walked through A03 together. Now do A07 solo on imdb-identity. Same workflow, different repo, different pack.

### Setup

```bash
cd repos/imdb-identity
gh repo create imdb-identity --private --source=. --remote=origin --push
```

CodeQL fires. Three issues open. The A07 one (`Missing rate limit on POST /auth/login`) is the target.

### The workflow

1. Open Cheshire → Issue Management.
2. Pick the A07 issue.
3. Click **Enrich with RCTRO**. Cheshire pulls in `.cheshire/prompts/owasp/A07_authn_failures.md`.
4. Read the RCTRO. The Requirements section should call for: rate limit (5 attempts / 15 min by IP and by username), constant-time password comparison, generic "invalid credentials" error, audit log of failures.
5. Comment `@claude please remediate`.
6. Wait. Review. Iterate.
7. Run the tests. Confirm a brute-force-style test gets rate-limited.
8. Merge with the AI disclosure footer.

### Check your work

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work</summary>

A common agent miss on A07: implementing rate-limit-by-IP but not by-username. An attacker rotating IPs (residential proxies are cheap) bypasses IP-only rate limits. The pack flags this; the agent sometimes forgets it; the reviewer must catch it.

Second common miss: returning "user not found" vs "wrong password" depending on which check failed. This leaks user enumeration. Both responses must be the same generic "invalid credentials".

Third common miss: logging the failed username. This is user-enumeration via logs. The audit log should log the *event* (`auth.login.failed`) and the *outcome*, not the attempted username.

If you caught at least two of these three in your review, you are reading like a 2026 engineer. If you missed all three, run the planning phase again and ask Cheshire to expand the A07 pack Requirements in the prompt.

</details>

---

## What you learned

- **The live remediation loop**: push to GitHub → CodeQL fires → `codeql-to-issues` workflow opens labelled GitHub Issues → Cheshire **Enrich with RCTRO** posts the pack-backed contract into the issue → comment `@claude please remediate` → `alice-remediation` workflow opens a draft PR.
- **The agent's planning comment comes first**, before the diff. Read it against the RCTRO Requirements. If a Requirement is missing from the plan, comment "do not proceed" and let the planning phase regenerate. **Plan first, implement second.**
- **Review the diff against the Requirements section of the RCTRO**, not against the CodeQL finding. The finding tells you what is broken. The Requirements tell you what *good looks like for your team*. Both have to be true to merge.
- **A regression test that passes against both old and new code is decoration**, not a test. Pull the branch and confirm the test *fails* against `main` before approving.
- **The AI disclosure footer is non-negotiable.** Every AI-assisted commit names the prompt pack and version, the CodeQL finding ID, the issue number, and the human reviewer. This is the start of the **Hatter's Tag** that Part 6 turns into a signed manifest.
- **Common agent misses to catch in review:** unicode SQLi tests skipped (the agent does ASCII payloads only), error messages include pg error codes (still leaking schema), validator placed in the route file instead of `src/validators/`. Different domain, similar pattern: rate-limit-by-IP shipped without by-username (an attacker on rotating proxies bypasses it), "user not found" vs "wrong password" leaking user enumeration, logged failed usernames creating enumeration via logs.
- **The agentic shift is now concrete.** Your contribution to the actual code was nine characters: `@claude please remediate`. Your contribution before that (Parts 1 and 2) and after that (this review) was where the human work actually lives.

---

## The Golden Rule for this part

> **Rule 3. Trust but verify. Every line, every test, every Requirement.**
>
> The agent will produce code that compiles and tests that pass. Compiling and passing are necessary, not sufficient. The reviewer's job is to confirm that the code *does what the Requirements said it should*, the tests *prove the bug was actually broken before*, and nothing snuck in that the Requirements did not authorise. This is the new core skill of the agentic SDLC. It does not get easier with seniority. It gets sharper.

---

## What is next: Part 4. The Looking Glass Measures

The A03 is fixed today. What stops it (and its cousins) from coming back tomorrow? In Part 4 we use the same Cheshire enrich → assign → review workflow, but pointed at a different problem class: generating fitness functions that prevent regression. The agent will produce five of them, including one that reads the BAR's CALM model and enforces architectural layer rules. That last one is the bridge into Part 7's Red Queen.

Scorecard goal for Part 4: **15 → ~35.**

[Continue to Part 4 →](/docs/workshop/part4-fitness-functions)
