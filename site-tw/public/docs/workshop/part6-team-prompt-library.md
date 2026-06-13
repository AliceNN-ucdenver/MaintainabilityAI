# Part 6: The Hatter's Library

<div class="docs-workshop-hero docs-workshop-emerald">
  <div class="docs-workshop-number">6</div>
  <div>
    <div class="docs-card-kicker">Workshop Part 6 · The Hatter's Library</div>
    <h2 class="docs-workshop-title">The Hatter's Library</h2>
    <p class="docs-workshop-subtitle">Team Prompt Library. Versioning and Provenance.</p>
  </div>
  <div class="docs-workshop-meta">
    <strong class="docs-strong">Duration:</strong> 60 minutes<br/>
    <strong class="docs-strong">Prerequisites:</strong> <a href="/docs/workshop/part5-security-pipeline" class="markdown-link">Part 5 complete</a>. Two scanners and the four-category fitness tests (complexity, duplicate, dead-code, architecture) running in CI. Scorecard at ~50. Repo in Supervised tier.<br/>
    <strong class="docs-strong">SDLC phase:</strong> Phase 6 (Evolution).<br/>
    <strong class="docs-strong">Status:</strong> Available now
  </div>
</div>

> The Mad Hatter's watch runs on the wrong rules until somebody dips it in the tea. By Part 6 you have a pile of prompts running every PR, but none of them are versioned, and no PR carries a signed record of which prompt produced it. **That ends today.** We semver-tag every pack in `.cheshire/prompts/`, wire the **Hatter's Tag** signed-manifest footer into every AI-assisted PR, and watch what happens when OWASP refreshes a pack mid-quarter.

---

## What you will have built when you leave

1. **Every prompt pack tagged with semver.** Each file in `.cheshire/prompts/owasp/`, `/stride/`, and `/maintainability/` carries a `version:` field in its frontmatter and a `CHANGELOG.md` next to it.
2. **A `.cheshire/prompt-library.yaml`** that lists every pack, its current version, its maintainer, and the date it was last reviewed.
3. **A workflow that writes the Hatter's Tag footer** into every AI-assisted PR description: pack versions used, agent identity, model version, system-prompt hash, threat-model reference, OWASP categories, fitness results, reviewer.
4. **One demonstration pack bump.** The A03 injection pack moves from `v1.0.0` to `v1.1.0` (adding a new test-vector requirement for null-byte injection). The next PR produced through that pack carries the updated version in its Hatter's Tag.
5. **A `prompt-effectiveness.md` log** appended on every merged PR: which pack version produced what, whether the review needed re-iteration, whether the fix held up under post-merge scanning.
6. Scorecard: **~50 → ~55**. The score moves modestly. The audit chain closes completely.
7. Golden Rule 5 (full statement) internalised: **Version the contract. Every prompt has a SHA, every PR has a Tag.**

---

## Recap from Part 5

Part 5 wired CodeQL plus Snyk and taught the triage matrix. The movie-api crossed 50 and reached Supervised tier. The PreToolUse hook loosened. The Code Security pillar reached green. **What is missing**: when an auditor (or your future self) asks *"which version of which prompt produced PR #4129"*, the answer today is *"the version that was in the repo at the time of the commit, whatever that was."* That is not a credible answer. Today we make it credible.

---

## The problem with prompts that travel without papers

You have shipped roughly a dozen AI-assisted PRs by now: the A03 fix in Part 3, the fitness functions in Part 4, the CVE fix and SAST remediation in Part 5. Each one used a prompt pack from `.cheshire/prompts/`. None of them recorded *which version* of which pack.

That works until something changes. Three things will change soon:

1. **OWASP will refresh the Top 10 for Agentic Applications.** The December 2025 release added Agent Goal Hijack and Tool Misuse; the next refresh in late 2026 will tighten some packs and add new ones. Your `owasp/A03_injection.md` will not be the same file in six months.
2. **Your team will edit packs based on what worked.** You will add the unicode SQLi test requirement that Part 3 caught, the null-byte vector that Part 5's scanner surfaced, the IDOR-via-`:id` requirement nobody thought of until a reviewer caught it. Each edit improves the pack and *also* changes what "the A03 pack" means.
3. **A regression will happen.** Three months from now a previously-fixed A03 returns. Was it because the codebase changed? Or because the pack changed and stopped requiring the safeguard that previously caught it? Without versioning, **you cannot tell**, and the post-mortem becomes archaeology.

The discipline is the same one every engineering team applies to its own code: **version it, change-log it, sign every artifact with the version that produced it.** Today we apply that discipline to prompts.

---

## The Hatter's Tag in detail

The Hatter's Tag is the signed manifest that appears in every AI-assisted PR's description. Its purpose: when anyone asks how this PR was produced, the answer is one git query.

A complete Hatter's Tag looks like:

```yaml
---
🤖 Hatter's Tag
---
agent:           alice-maintenance-agent (copilot)
model:           claude-opus-4-7-20260501
prompt-fingerprint: sha256:5f4dcc3b...   # hash of the assembled RCTRO
packs:
  - .cheshire/prompts/owasp/A03_injection.md@v1.1.0
  - .cheshire/prompts/maintainability/complexity-reduction.md@v1.0.0
finding-id:      codeql:js/sql-injection #423
threat-model:    bars/APP-IMDB-001.threats.yaml@sha:a4b5c6...
fitness-results:
  complexity:    pass (within baseline)
  duplicate:     pass (within baseline)
  dead-code:     pass
  architecture:  pass
reviewer:        @your-handle (approved 2026-05-17T14:32:08Z)
```

Eight fields. Each one ties the PR to a specific, versioned artifact. Together they answer every audit question you will be asked under SOC 2 CC8.1, ISO 27001 A.8.28, NIST 800-53 SA-11, and ISO/IEC 42001 Annex A. Cheshire generates the tag automatically once we wire the workflow today.

This is also the **preview** of what Phase 9 of the Red Queen turns into a *cryptographically signed manifest* attached to every commit. Today's version is a structured PR footer. Tomorrow's version is a signed CloudEvent in an append-only audit log. Same content, stronger guarantees.

---

## The agentic shift

In 2024, prompt engineering was a personal skill. A developer carried their best prompts in a private text file or a Notion page. When a prompt produced a bug, the developer adjusted privately. The team had no shared library, no shared learning, no shared accountability.

In 2026 prompts are a *team asset class*. They are versioned in git alongside code. They have maintainers and changelogs. They are reviewed before they merge. They carry SHAs into every PR that used them. Two developers using the same pack produce the same quality of work because the pack is the discipline, not the developer's memory.

The shift is what makes governance survive turnover. The pack is the institutional memory; the version is the receipt; the Hatter's Tag is the audit trail.

---

## Walkthrough: from unversioned packs to a Hatter's-Tag-stamped PR

### Step 1. Add version frontmatter to every pack

Cheshire ships a one-shot migration command. In VS Code, **Cheshire Cat → Prompt Library → Initialize versioning**. The panel scans `.cheshire/prompts/` and offers to add a starter `version: 1.0.0` field to the frontmatter of every pack that does not already have one. Confirm. Cheshire writes a CHANGELOG.md alongside each pack with the entry:

```markdown
# Changelog

## [1.0.0] - 2026-05-17

- Initial versioned release. Forked from MaintainabilityAI v0.1.18 starter packs.
- Maintained by: @your-team
```

Commit this in a single PR titled `chore(prompts): initialize semver versioning for prompt library`. The diff touches ~24 files (10 OWASP + 6 STRIDE + 8 maintainability) but each is a small frontmatter addition.

### Step 2. Create the library manifest

In the same `.cheshire/` directory, Cheshire's initializer creates `prompt-library.yaml`:

```yaml
library:
  name: movie-api-prompts
  maintainers:
    - @your-handle
    - @your-team-lead
  packs:
    owasp/A01_broken_access_control:
      version: 1.0.0
      last-reviewed: 2026-05-17
      maintainer: @your-handle
    owasp/A03_injection:
      version: 1.0.0
      last-reviewed: 2026-05-17
      maintainer: @your-handle
    # ... and so on for every pack
    maintainability/calm-layer-enforcement:
      version: 0.1.0
      last-reviewed: 2026-05-17
      maintainer: @your-handle
      note: team-authored in Part 4
```

This file is the source of truth for which versions are *current* in your library. CI reads it; Cheshire's enrich flow reads it; the Hatter's Tag generator reads it.

### Step 3. Wire the Hatter's Tag generator

Cheshire ships a GitHub Action that runs on every AI-assisted PR (detected by the `🤖 AI-assisted` label or commit-message marker). The action:

1. Reads the issue body (the RCTRO) to find which packs were cited.
2. Looks up each pack's current version from `prompt-library.yaml`.
3. Reads the agent metadata from Alice's dispatch run (agent id, model version, system prompt hash).
4. Reads the threat model from the BAR (`bars/APP-IMDB-001.threats.yaml`).
5. Reads the fitness function CI results.
6. Writes the assembled Hatter's Tag as a YAML block at the top of the PR description.

To enable it, scaffold-add the workflow: **Cheshire Cat → Scaffold SDLC → Add Hatter's Tag workflow**. Cheshire writes `.github/workflows/hatters-tag.yml` and an accompanying script `.cheshire/scripts/assemble-tag.js`.

Commit. Push. The action runs on the next PR.

### Step 4. Make a pack bump and observe

The A03 pack is missing a test-vector requirement that Part 5 surfaced: null-byte injection (`%00` in the search term). Add it.

Open `.cheshire/prompts/owasp/A03_injection.md`. Add the new requirement under Requirements:

```markdown
- Tests must include a null-byte injection payload (`?q=alice%00DROP`),
  verifying that the validator rejects the request rather than the
  database driver silently truncating.
```

Bump the version in the frontmatter from `1.0.0` to `1.1.0`. Update `CHANGELOG.md`:

```markdown
## [1.1.0] - 2026-05-17

### Added
- Null-byte injection test vector requirement (`%00` truncation attack).

Source: regression risk surfaced by Snyk Code scan in workshop Part 5.
```

Also bump the version in `prompt-library.yaml`. Open a PR titled `feat(prompts/A03): require null-byte injection test vector (v1.0.0 → v1.1.0)`. **This is a normal PR that needs human review.** Have a teammate read the changelog entry, the requirement, and approve.

Merge.

### Step 5. Trigger an A03-using PR and read the Hatter's Tag

Pick any open issue labelled `owasp/A03` (or open a small new one: "Harden the `GET /movies?genre=` filter on the movie-api against Mongoose operator injection"). Run the Cheshire enrich step (which now pulls in `A03_injection.md@v1.1.0`). Dispatch Alice with one click from the Cheshire Security Scorecard. Wait for the draft PR on a `copilot/*` branch.

Open the PR. The description should now start with:

```yaml
---
🤖 Hatter's Tag
---
agent:    alice-maintenance-agent (copilot)
model:    claude-opus-4-7-20260501
prompt-fingerprint: sha256:7b3df982...
packs:
  - .cheshire/prompts/owasp/A03_injection.md@v1.1.0
  - .cheshire/prompts/maintainability/complexity-reduction.md@v1.0.0
finding-id:      (none — new feature)
threat-model:    bars/APP-IMDB-001.threats.yaml@sha:a4b5c6...
fitness-results: pending CI
reviewer:        unassigned
```

The Hatter's Tag is there. The pack version is `v1.1.0`, the one that includes the null-byte test. Review the PR: confirm Alice included a test case for `?genre=action%00DROP%20TABLE`. She should. The pack required it; the agent followed the pack.

Approve. Merge. The `reviewer:` field updates with your handle and the merge timestamp.

### Step 6. Log effectiveness

After merge, Cheshire appends an entry to `.cheshire/prompt-effectiveness.md`:

```markdown
## PR #4156 — fix(movie-api): harden genre filter on /movies

- packs: owasp/A03_injection@v1.1.0, maintainability/complexity-reduction@v1.0.0
- review-iterations: 1
- post-merge-scan: clean
- effectiveness: nominal
```

This file grows over time. After 50 PRs you have data: which packs require the most review iterations (signal to refine), which packs catch the most regressions (signal that the pack is doing its job), which packs are stale (signal to review).

### Step 7. Re-read the scorecard

The score moves modestly:

```
movie-api                                 56 / 100      SUPERVISED  (up from 51)
  Code Security                           19 / 25       green
  Test Coverage                           14 / 20       green
  Technical Debt                           8 / 15       yellow
  Dependency Freshness                    10 / 15       green
  Complexity                               5 / 15       yellow
  Architecture                             3 / 10       red     (CALM gate in Part 4, governance lift in Part 7)
```

The big move from Part 6 is **not on the scorecard**. It is the audit chain that just closed. Every PR going forward carries a traceable, queryable record of how it was produced. That is the value.

---

## Q&amp;A

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 1. Semver for prompts feels heavyweight. Do I really need 1.0.0, 1.1.0, and 2.0.0 for markdown files?</summary>

Yes, and for the same reason you use semver on libraries.

- **Patch (1.0.0 → 1.0.1)**: typo fixes, clarifications in prose, no change to what the agent is required to produce. Safe to bump without notice.
- **Minor (1.0.0 → 1.1.0)**: new requirements added that are *additive*. A consumer using v1.0.0 will still produce valid output against v1.1.0's evaluation, but v1.1.0 requires more. Notify the team; bump.
- **Major (1.0.0 → 2.0.0)**: requirements changed in a way that previously-acceptable output would now fail. This forces a re-evaluation of every cited PR. Use sparingly; reserve for the OWASP-style external refreshes.

The benefit when you need it is high: a CVE in a popular crypto library can ship a major bump on the A02 pack, every team that depends on it knows to re-evaluate their crypto-touching PRs, and the audit trail makes the response auditable. The cost is one extra line in a frontmatter and a changelog entry.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 2. The Hatter's Tag adds 15 lines to every PR description. Does the team actually read it?</summary>

The team usually doesn't, and that's fine. The Hatter's Tag is for **auditors, post-mortem authors, and your future self**, not for routine PR review.

The right way to consume the Hatter's Tag in day-to-day work:

- **Review the diff and the test plan**, not the tag.
- The reviewer's eye should be on the *code* and the *tests*, not on the metadata.
- The tag silently records what produced this work; you skim it once when first orienting, then ignore until something goes wrong.

When something *does* go wrong, the tag is the difference between a 4-hour archaeology session and a 4-second git query. *"What prompt version produced the bug in PR #4156 from May?"* One grep on prompt-effectiveness.md or one read of the PR description, done.

Phase 9 of the Red Queen turns the Hatter's Tag into a *signed* manifest with cryptographic provenance for high-stakes domains (regulated industries, anything ISO 42001 certified). The current YAML form is the cost-effective version that earns its keep without a key infrastructure.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 3. How does the team know when to bump a pack vs when to fork it?</summary>

The rule of thumb: **bump if the change is universal; fork if the change is local.**

**Bump** (e.g. v1.0.0 → v1.1.0) when the new requirement is something *every team in the world using this pack would benefit from*. Null-byte injection (Part 5 example) is universal. Bump.

**Fork** (create a team-specific pack) when the new requirement is something *only your team or your domain needs*. Example: a healthcare team adds a PHI-handling requirement to every A09 logging fix. That requirement is not universal; not every team is in regulated health. Fork `owasp/A09_logging_monitoring.md` into `team/A09_logging_with_phi.md` and have your team use that one.

The team-specific pack still gets versioned, still gets a maintainer, still appears in the library manifest. It just lives in `.cheshire/prompts/team/` instead of the shared OWASP family. The CALM-layer pack you co-authored in Part 4 is the canonical example: too specific to be universal, important enough to deserve formal handling.

The chief-trainer rule: **resist the urge to fork early.** Most early forks are bumps in disguise. Try the bump first; if the rest of the world rejects the change at PR review, accept that this rule was team-local and fork it.

</details>

---

## Try it yourself: tag a pack you actually use

In Step 4 you bumped `owasp/A03_injection.md` together. Now do the same solo on a different pack.

### Setup

Pick a pack that the movie-api has *actually used* across Parts 3-5 and that you can think of one concrete improvement to. Suggestions:

- `owasp/A07_authn_failures.md` (used in Part 3 solo). Add: rate-limit-by-username, not only by IP. (Part 3 Q&A surfaced this as a common miss.)
- `maintainability/complexity-reduction.md` (used in Part 4). Add: complexity threshold per file type (JSX components allowed 12; backend handlers cap 8).
- `maintainability/dependency-hygiene.md` (used in Part 5). Add: pinned major versions only; minor drift allowed; patch drift required for security advisories.

### What to do

1. Open the pack in VS Code.
2. Add the new requirement under Requirements with a short explanation of why.
3. Bump the frontmatter version (minor for additive; major if anything previously valid would now be invalid).
4. Update the pack's `CHANGELOG.md` with a date, version, and changelog entry naming the source of the change (e.g. "regression risk surfaced in workshop Part N").
5. Bump the version in `prompt-library.yaml`.
6. Open a PR titled `feat(prompts/<pack>): <change> (v1.0.0 → v1.1.0)`.

### Check your work

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work</summary>

**The PR should be reviewable by a teammate without context.** That is the test. Open it in incognito mode; read it as though you were not the author. If the reviewer cannot tell *what changed in agent behaviour* from the diff, the changelog entry is too thin.

A good changelog entry names three things:

1. **What** the new requirement is (one sentence).
2. **Why** (the incident, the regression, the audit finding, the pack-effectiveness signal that motivated it).
3. **Impact** on existing PRs (will previously-merged work need re-evaluation? Usually no for minor bumps, yes for major).

A useful sanity check: read the changelog entry and ask *"would a new hire understand why we did this?"* If no, write more. The pack is the institutional memory; the changelog is how the institution remembers.

</details>

---

## What you learned

- **Prompts that travel without papers are not auditable.** Versioning them is the discipline that makes the audit chain credible.
- **Semver applies to prompts the same way it applies to libraries.** Patch for fixes, minor for additive requirements, major for breaking changes. The OWASP refresh cycle is the canonical major-bump trigger.
- **`prompt-library.yaml` is the source of truth.** Cheshire's enrich flow reads it. The Hatter's Tag generator reads it. CI reads it. One file, queryable.
- **The Hatter's Tag is for auditors, post-mortems, and your future self.** Not for routine PR review. Skim once, ignore until needed, query when something breaks.
- **Eight fields in the tag** answer the eight audit questions you will be asked: which agent, which model, which prompt fingerprint, which packs at which versions, which finding, which threat model, which fitness results, which human reviewer.
- **Bump vs fork is a discipline.** Bump if universal; fork if local. Most early forks are bumps in disguise.
- **`prompt-effectiveness.md` is your feedback loop.** Which packs caused review iterations, which packs caught regressions, which packs are stale. After 50 PRs you have real signal.

---

## The Golden Rule for this part

> **Rule 5. Version the contract. Every prompt has a SHA, every PR has a Tag.**
>
> In 2024 a prompt was personal. In 2026 it is a team asset class with maintainers, changelogs, and version receipts that travel with every PR. The Hatter's Tag is the manifest that ties the change to the prompt that produced it, the agent that wrote it, the threat model it was checked against, and the human who signed off. When an auditor asks how a PR came into being, the answer is one git query.

---

## What is next: Part 7. The Red Queen's Court

Rules 1 through 5 are now operational. Stage and tier (Rule 1). The contract (Rule 2). The reviewer's discipline (Rule 3). The measurement layer (Rule 4). The versioning and audit chain (Rule 5). **But every one of them is still advisory.** An over-eager agent can still violate the CALM model, skip a Requirement, take a Bash action that crosses a security-critical path. Reviewers and fitness functions catch it *after* the work happens.

Part 7 makes the constraints deterministic. We install the Red Queen — a baked `.redqueen/policy.json` plus a PreToolUse hook that fails closed and logs every decision to `.redqueen/audit-log.jsonl` — watch it block a CALM-violating action *before* the write lands, see the merge-time `impl-provenance` gate, and exercise the one-click, scoped, audited break-glass for Restricted-tier work. The CALM-layer fitness check from Part 4 is promoted from advisory to hard gate.

Scorecard goal for Part 7: **55 → ~65**. The repo crosses the threshold from Supervised toward Autonomous. The agent's autonomy is no longer trust; it is policy.

[Continue to Part 7 →](/docs/workshop/part7-red-queens-court)
