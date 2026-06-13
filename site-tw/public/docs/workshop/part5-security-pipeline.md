# Part 5: The Caterpillar's Challenge

<div class="docs-workshop-hero docs-workshop-cyan">
  <div class="docs-workshop-number">5</div>
  <div>
    <div class="docs-card-kicker">Workshop Part 5 · The Caterpillar's Challenge</div>
    <h2 class="docs-workshop-title">The Caterpillar's Challenge</h2>
    <p class="docs-workshop-subtitle">Security Pipeline. CodeQL plus Snyk plus SARIF Triage.</p>
  </div>
  <div class="docs-workshop-meta">
    <strong class="docs-strong">Duration:</strong> 75 minutes<br/>
    <strong class="docs-strong">Prerequisites:</strong> <a href="/docs/workshop/part4-fitness-functions" class="markdown-link">Part 4 complete</a>. The fitness tests running across the four structural categories. CodeQL workflow in place from Part 3.<br/>
    <strong class="docs-strong">SDLC phase:</strong> Phase 3 (Verification).<br/>
    <strong class="docs-strong">Status:</strong> Available now
  </div>
</div>

> *"Who are you?"* asked the Caterpillar. Part 5 is the part of the workshop where the scanners ask the same question of every commit. By the end the movie-api has CodeQL and Snyk running together, SARIF findings auto-triaged into RCTRO issues, one false-positive handled by a human and one true-positive handled by the agent. Scorecard crosses **35 → ~50**, and the movie-api earns its way out of Restricted into **Supervised** tier.

---

## What you will have built when you leave

1. **Snyk** wired into the movie-api alongside the existing CodeQL workflow. Two scanners, one SARIF triage pipeline.
2. Five real findings filed as GitHub Issues: 1 fresh CodeQL finding (XSS in the review render path), 2 Snyk CVE findings (`lodash@4.17.15`, `axios` outdated), 1 Snyk SAST finding (hardcoded secret in `ratings-feed.ts`), 1 deliberately planted false-positive.
3. The **false-positive triaged by a human** with the recorded rationale that closes the issue and feeds the team's exclusion list.
4. The **CVE finding remediated by an agent** through the same Cheshire enrich → assign → review loop you ran in Part 3, now extended to scanner findings.
5. A **severity policy** that decides who gets the issue: critical and high go to humans first, medium and low can be agent-assigned with a labelled review.
6. Scorecard: **~35 → ~50**. The Code Security pillar reaches green. The repo earns **Supervised tier**.
7. Golden Rule 5 (preview) internalised: signal beats noise, and triage is the human's gate.

---

## Recap from Part 4

Part 4 left you with fitness tests in CI across four structural categories — complexity, duplicated code, dead code, and architecture (import boundaries + the CALM-layer rule) — each ratcheting against a baseline floor. You also wrote your first team-owned prompt pack (`maintainability/calm-layer-enforcement.md`). The scorecard moved. **What's missing**: most of the points left to reach Supervised tier come from the Code Security pillar, which fitness functions do not cover. That is what scanners do.

---

## Scanners are not the answer. Triage is.

Adding CodeQL and Snyk to a repo is a 10-minute scaffold task. Cheshire did it for you in Part 1. The hard part is what comes *after* the first scan, which is when 47 findings land in your inbox and most of them are noise.

A team that treats every finding as work to do drowns. A team that ignores findings ships incidents. The middle path is **triage**: a written policy for who handles which finding type, at which severity, with which level of automation. This is what the Caterpillar's Challenge teaches.

### The triage matrix

| Severity | Real | False positive | Acceptable risk |
|---|---|---|---|
| **Critical** | Human reviews, human or agent remediates within 24h | Human closes with rationale, adds to exclusion list | Not a category. Critical findings either get fixed or escalated. |
| **High** | Human reviews, agent can remediate with labelled review | Human closes with rationale | Documented risk acceptance with CODEOWNER sign-off |
| **Medium** | Agent can be assigned directly with human review on PR | Auto-close with templated rationale | Risk-accepted via CODEOWNER, tracked in `.cheshire/risk-register.md` |
| **Low** | Batch-assigned weekly; agent handles multiple | Auto-close | Implicit; logged for trend tracking |

The matrix is your team's contract with the scanners. Write it once. Cheshire applies it on every finding.

### The two scanners and what they catch

**CodeQL** is GitHub's SAST. Source-code analysis for vulnerable patterns. Finds: SQL injection, XSS, SSRF, path traversal, broken authentication, insecure crypto usage. Already running on movie-api from Part 3.

**Snyk** is two scanners in one. **Snyk Open Source** is SCA (Software Composition Analysis) and finds CVEs in dependencies. **Snyk Code** is SAST that overlaps with CodeQL but catches different patterns, particularly in JavaScript/TypeScript. Together they cover the most common attack surfaces a TypeScript Express service has.

Running both costs almost nothing in PR latency (both run in parallel) and the overlap is *features, not redundancy*: when both flag the same issue, your confidence is much higher.

---

## The agentic shift

Part 3 taught the loop on a CodeQL finding. Part 5 generalises it: **the same Cheshire enrich → assign → review loop works for any structured finding**, whether it comes from CodeQL, Snyk, Snyk Code, npm audit, a SARIF file from a third-party tool, or a CI test failure. The enrichment knows how to read the finding format and apply the right prompt pack. The agent reads the RCTRO. The reviewer reviews.

What changes in 2026 is the *triage step in front*. In 2024 a security team scanned, filed everything as a ticket, and asked humans to deal. In 2026 the team writes a triage matrix once, Cheshire applies it on every finding, agents handle the obvious cases, humans focus on judgment calls. The team's hours go to the calls; the automation handles the volume.

---

## Walkthrough: from a fresh scan to one merged fix and one closed false-positive

### Step 1. Add Snyk to the movie-api

The Cheshire scaffold from Part 1 included CodeQL but left Snyk optional. Open the movie-api in VS Code, click the **Cheshire Cat** icon, choose **Scaffold SDLC → Add scanner**, pick **Snyk** from the list, and confirm. Cheshire writes:

- `.github/workflows/snyk.yml` (runs `snyk test` and `snyk code test` on every PR)
- A `SNYK_TOKEN` secret prompt (you paste yours; the prompt validates against the Snyk API)
- A `.snyk` policy file (initially empty; the home for triage decisions later)

Commit, push, watch the new workflow run on the next PR.

### Step 2. Watch the first scan land

Once Snyk has scanned at least once, go to the **Issues** tab. You should see new issues alongside the existing CodeQL ones:

```
#5  [snyk-finding] [owasp/A06] CVE-2019-10744 in lodash@4.17.15 (high)
#6  [snyk-finding] [owasp/A06] axios@0.21.4 has known prototype pollution (medium)
#7  [snyk-finding] [owasp/A02] Hardcoded API key in src/services/ratings-feed.ts (high)
#8  [codeql-finding] [owasp/A03] Stored XSS in review render path (high)
#9  [snyk-finding] [owasp/A05] Express body-parser uses default config (low)  ← the false positive
```

Issue #9 is the planted false-positive. Snyk flags Express body-parser's default config as a misconfiguration; in our setup it is intentional and documented. We will close it correctly in Step 5.

### Step 3. Apply the triage matrix to issue #5 (CVE, high)

In VS Code, **Cheshire Cat → Issue Management**, pick issue #5. Click **Enrich with RCTRO**. Cheshire reads the Snyk finding, loads the matching pack (`owasp/A06_vuln_outdated.md`), and writes an RCTRO that names the upgrade target (lodash `4.17.21` or `^4.17.21`), the test surface (any code path that uses `lodash.template` or `lodash.set`), and the rollback plan.

This is a *high-severity, real* finding. From the matrix, the agent can remediate with a labelled review. **Dispatch Alice** from the issue and watch a draft PR open within minutes — governed, as always, by the repo's baked Red Queen policy.

### Step 4. Review the agent's CVE-fix PR

Same discipline as Part 3, with one extra check unique to dependency fixes:

- Did the agent change *only* the version pin, or did it also touch consuming code unnecessarily?
- Did Snyk re-scan the new lockfile and confirm the CVE is resolved? (The agent should include a comment with the re-scan output.)
- Are the existing tests still green? (CVE fixes occasionally surface latent bugs in pinned-version-dependent code.)

If clean, merge with the AI disclosure footer naming the prompt pack version (now including the Snyk version), the Snyk finding ID, and you as reviewer.

### Step 5. Triage the false-positive (#9, the body-parser misconfig)

This is the human's case. The triage matrix says: *low severity false-positive → auto-close with templated rationale*.

In VS Code, **Cheshire → Issue Management**, pick issue #9. Click **Mark as false positive**. A panel opens asking for the rationale. Write something like:

```
The default body-parser config is intentional and documented in
ADR-0014. We accept the documented behaviour (request body size
limit at the framework default). Reviewer: @your-handle.
```

Click **Submit**. Cheshire does three things:

1. Closes the GitHub Issue with the rationale comment.
2. Adds an exclusion rule to `.snyk` so the next scan does not refile the same finding.
3. Appends an entry to `.cheshire/risk-register.md` so the audit trail records every accepted-risk decision with a reviewer name.

The audit chain is the point. *"We knew about it; we decided not to fix it; here is who signed."* That sentence is worth its weight in compliance reviews.

### Step 6. The hardcoded-secret finding (#7, high)

This is the *most dangerous category*: a real high-severity finding that requires more than a code change. The hardcoded API key is in git history. Even after the agent removes it from `src/services/ratings-feed.ts`, the key is still in old commits. Rotation is required.

The matrix says: *high severity → human reviews first*. Do this work yourself, do not assign the agent. Steps:

1. **Rotate the key first.** Get a new key from the ratings-feed vendor. Update the environment variable in your deployment. Confirm the old key is dead.
2. **Then** dispatch Alice to remove the key from source and replace with `process.env.RATINGS_FEED_API_KEY`. Cheshire's pack for A02 will pull in the relevant requirements (no secrets in source, no secrets in logs, env-based config with a fallback that fails closed).
3. Merge. The Snyk re-scan on next push should close the finding automatically.
4. **Rewrite git history is optional**: in private repos, leaving the dead key in history is acceptable. In public repos, force-push history rewrite with `git-filter-repo` and notify any forks.

### Step 7. Read the scorecard

Refresh the Cheshire Cat Security Scorecard. You should see:

```
movie-api                                 51 / 100      SUPERVISED  (up from 36)
  Code Security                           19 / 25       green   (4 of 5 findings closed; 1 risk-accepted)
  Test Coverage                           13 / 20       green
  Technical Debt                           7 / 15       yellow
  Dependency Freshness                    10 / 15       green   (CVE-fixed deps current)
  Complexity                               5 / 15       yellow
  Architecture                             2 / 10       red     (CALM layer fitness function lives in Part 4)
```

The score crossed 50. **The movie-api is now in Supervised tier.** Read what changes:

- The PreToolUse hook no longer blocks `Read` on the agent. Free exploration is allowed.
- Structural edits still pass the deterministic PreToolUse policy. The CALM model still gates the work.
- Weak-pillar prompt packs (Architecture, Complexity) are still auto-injected into every agent prompt.

The tier earned the freedom. Each finding closed, each gate added, was the work that earned it.

---

## Q&amp;A

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 1. The first scan produced 47 findings. The agent can fix them all. Should I assign them all?</summary>

No. Three reasons.

**Reason one: review bandwidth.** Even if the agent opens 47 PRs in an afternoon, you will spend the next week reviewing them. Reviews are the bottleneck, not implementation. Pick the 5 highest-impact findings and ship those well.

**Reason two: regression risk.** Forty-seven simultaneous changes to a codebase produce subtle interactions. Tests pass individually; the cumulative effect breaks something. Ship in tranches, watch the gates, then ship the next tranche.

**Reason three: triage clarity.** If you assign all 47, the team loses track of which were judgment calls and which were obvious fixes. Run the triage matrix first. Close the false-positives. *Then* assign the rest in groups by severity.

The discipline: **scanners report at machine speed; humans triage at human speed; agents fix the obvious ones; humans handle the judgment.** Skip the triage step and you have just automated noise.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 2. CodeQL and Snyk Code both run SAST. Why do I need both?</summary>

They overlap but they are not the same.

**CodeQL** is best at semantic analysis: data-flow tracking, taint propagation, complex control-flow patterns. When you need to know whether user input from request handler A reaches database query B through three function calls, CodeQL is your answer. It is also free for public repos and well-integrated with GitHub.

**Snyk Code** is best at common patterns and speed: hardcoded secrets, weak crypto usage, common API misuse. It scans in seconds rather than minutes. It has stronger rules for some JavaScript/TypeScript idioms.

Running both is cheap (parallel CI jobs) and the *overlap is your confidence signal*. When both flag the same issue, you have very high confidence. When only one flags, you have an informed signal you should investigate.

The cost is the triage workload, which is why we built the matrix in Step 3. Without the matrix, two scanners is twice the noise. With the matrix, two scanners is real defense-in-depth.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 3. Why is the false-positive case so important if it is "just" a close-with-comment?</summary>

Because the close-with-comment **is the audit artifact** when this finding shows up again in six months.

Three scenarios for the future:

1. **The next reviewer sees the same finding.** Without the closed issue with rationale, they reopen it, the team re-triages, time is wasted. With the rationale on file, Cheshire surfaces it: "this finding was previously closed as a false positive by @your-handle in March 2026; here is why."
2. **An audit asks why this risk was accepted.** Without `.cheshire/risk-register.md`, the answer is "we forgot". With it, the answer is one git query: the issue number, the date, the reviewer, the rationale, the ADR if there is one.
3. **The framework version changes and the finding behaviour shifts.** Without the exclusion rule and the rationale, you re-litigate. With them, the team can knowingly re-evaluate ("our 2026 rationale was X; the 2027 framework changed Y; do we still accept?").

The discipline: **every closed-without-fix is a decision; every decision deserves a written reason and a named owner.** Cheshire just makes the discipline cheap to follow.

</details>

---

## Try it yourself: triage a planted false-positive solo

Issue #9 walked you through the false-positive flow. Now do the same on a different planted finding.

### Setup

In the movie-api repo, run:

```bash
gh workflow run codeql.yml
```

After CodeQL completes, a new issue should appear:

```
#10  [codeql-finding] [owasp/A05] Express trust-proxy not explicitly set (medium)
```

This is also a **planted false-positive** in the workshop pack. Express trust-proxy is not set because the movie-api is intended to run behind a known-good reverse proxy in our deployment, and the relevant header parsing is handled at the proxy layer. In other deployment topologies, this *would* be a real finding.

### Your task

1. Open Cheshire → Issue Management → issue #10.
2. Decide: real, false-positive, or acceptable risk?
3. If false-positive, write the rationale and submit. If acceptable risk, write the risk acceptance with the CODEOWNER you would loop in.
4. Verify the exclusion lands in `.snyk` (or `.codeql/excluded.yml`, depending on tool) and the risk register entry is appended.

### Check your work

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work</summary>

For *this specific workshop deployment*, the right answer is **false-positive with rationale**: the trust-proxy is intentionally unset because the reverse proxy handles header parsing. Reference ADR-0014 in your rationale.

For *a real production deployment*, the right answer depends on your topology. If you don't know whether you sit behind a reverse proxy you control, the right answer is **acceptable risk pending verification**, with a follow-up issue to confirm the topology and revisit. Do not close as false-positive without that verification; that is how you ship the bug.

The chief-trainer rule for triage: **when in doubt, escalate to risk-accept-with-followup, not to false-positive-close.** False-positive closes are forever; risk-accepts have follow-up dates.

</details>

---

## What you learned

- **Scanners are not the answer; triage is.** CodeQL and Snyk surface findings at machine speed. The triage matrix decides who handles which, with how much automation.
- **The triage matrix has four rows** (Critical, High, Medium, Low) and three columns (Real, False positive, Acceptable risk). Write yours once; let Cheshire apply it on every finding.
- **The Cheshire enrich → assign → review loop from Part 3 generalises to scanner findings.** Different finding format, same workflow. The leverage is the pattern, not any one application.
- **CodeQL and Snyk are complementary**, not redundant. CodeQL is semantic flow analysis; Snyk Code is fast pattern matching plus dependency CVE. Together they're defense in depth.
- **Hardcoded-secret findings need rotation first, code change second.** Removing the secret from `src/` does not remove it from git history. Treat key rotation as a security incident with the right runbook before you touch code.
- **False-positive close is an audit artifact, not just a cleanup.** Every close-without-fix deserves a written reason, a named owner, an entry in `.cheshire/risk-register.md`, and (where possible) an exclusion rule so the scanner does not refile.
- **Tier-up is earned.** Crossing 50/100 lifts the movie-api from Restricted to Supervised. The PreToolUse hook loosens; weak-pillar packs auto-inject; structural edits still pass the deterministic PreToolUse policy. Each finding closed bought a piece of that freedom.

---

## The Golden Rule for this part

> **Rule 5 (preview). Signal beats noise. Triage is the human&rsquo;s gate.**
>
> Scanners produce volume. Triage matrices turn volume into work that gets done. The human's role in the agentic SDLC is not to fix every finding (the agent does that). It is to decide *which findings are real, which are noise, and which are risks the team accepts on the record*. Skip triage and you have automated the production of incidents.
>
> The full statement of Rule 5 lands in Part 6, where the same triage discipline applied to prompts becomes versioning and the Hatter&rsquo;s Tag. The shared idea: **provenance and accountability survive the change of personnel, the change of tooling, and the change of season.**

---

## What is next: Part 6. The Hatter's Library

You have four scanners (ESLint, Jest, CodeQL, Snyk) and a suite of fitness tests all running. Most importantly, you have a pile of prompts: the OWASP packs Cheshire scaffolded in Part 1, the team-specific CALM-layer pack you co-authored in Part 4, plus the implicit prompt versions baked into every PR you have shipped.

**None of them are versioned.** That is what Part 6 fixes. We tag every pack with semver, wire the **Hatter&rsquo;s Tag** signed-manifest preview into every AI-assisted PR, and watch what happens when OWASP refreshes a pack mid-quarter.

Scorecard goal for Part 6: **50 → ~55**. A modest move; the bigger value is the audit chain that closes when the Hatter's Tag lands.

[Continue to Part 6 →](/docs/workshop/part6-team-prompt-library)
