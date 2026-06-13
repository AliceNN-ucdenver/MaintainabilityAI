<div class="docs-hero docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/crown.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><span>Governance</span></div>
    <div class="docs-eyebrow">Governance <span class="docs-hero-meta">~9 min read &middot; 2026 edition</span></div>
    <h1 class="docs-hero-title">The Golden Rules of Governed AI Coding</h1>
    <p class="docs-hero-copy">Six rules. One per workshop part where you learn it. They name the discipline that turns AI from a fast typist into a governed engineering peer.</p>
    <span class="docs-hero-flourish">&ldquo;Sentence first &mdash; verdict afterwards.&rdquo; Not how we ship.</span>
  </div>
</div>

## The mental map

The six rules cluster into three zones. Each zone answers a different question.

<div class="docs-rule-zones">
  <div class="docs-rule-zone" style="--zone-accent:#67e8f9;">
    <div class="docs-rule-zone-kicker">Upstream &middot; Rules 1, 2</div>
    <div class="docs-rule-zone-title">Before the agent touches the keyboard</div>
    <div class="docs-rule-zone-body">Choose the stage of work. Write the contract. The leverage of the agentic SDLC lives here.</div>
  </div>
  <div class="docs-rule-zone" style="--zone-accent:#fbbf24;">
    <div class="docs-rule-zone-kicker">Midstream &middot; Rules 3, 4</div>
    <div class="docs-rule-zone-title">Accepting what the agent produced</div>
    <div class="docs-rule-zone-body">Review the diff against the Requirements. Wire fitness functions that prevent regression.</div>
  </div>
  <div class="docs-rule-zone" style="--zone-accent:#a5b4fc;">
    <div class="docs-rule-zone-kicker">Downstream &middot; Rules 5, 6</div>
    <div class="docs-rule-zone-title">Evidence and enforcement</div>
    <div class="docs-rule-zone-body">Version every prompt. Make advisory rules deterministic. Prove governance held after merge.</div>
  </div>
</div>

<nav class="docs-rule-nav" aria-label="Jump to rule">
  <a href="#rule-1" class="docs-rule-nav-chip"><span class="num">1</span>Choose the stage</a>
  <a href="#rule-2" class="docs-rule-nav-chip"><span class="num">2</span>Write the contract</a>
  <a href="#rule-3" class="docs-rule-nav-chip"><span class="num">3</span>Trust but verify</a>
  <a href="#rule-4" class="docs-rule-nav-chip"><span class="num">4</span>Measure to govern</a>
  <a href="#rule-5" class="docs-rule-nav-chip"><span class="num">5</span>Version the contract</a>
  <a href="#rule-6" class="docs-rule-nav-chip"><span class="num">6</span>Deterministic gates</a>
</nav>

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>Evidence for the auditor.</strong> Every rule applied here produces an artifact your security and compliance teams can point at: labelled AI-assisted commits, prompt-pack citations in the PR body, threat-coverage matrices linked to STRIDE plus OWASP, CODEOWNER approvals with rationale, and Red Queen audit logs of every allow, deny, and override. These map directly to SOC&nbsp;2 CC8.1 change-management evidence, ISO&nbsp;27001 A.8.28 secure-coding controls, NIST 800-53 SA-3, SA-11, and SA-15 expectations, the EU AI Act&rsquo;s Article 12 logging requirements, and ISO/IEC 42001 Annex A. Full clause-by-clause artifact mapping lives at <a href="/docs/governance/compliance-mapping" class="markdown-link">compliance mapping</a>.</p>
</div>

---

## What changed since 2024

The previous edition was written when AI was autocomplete and the question was *"how do I review the diff?"* The 2026 question is *"how do I govern the autonomy?"* Agents now plan, edit, and ship inside policies you wrote weeks earlier. The work moves upstream into the contract and downstream into the audit chain. These six rules name where the human still holds the pen.

The shorthand: **you move from code author to systems thinker, governance designer, and intent author.** The rules below are how you do that without losing accountability or speed.

---

<h2 id="rule-1">Rule 1. Choose the stage before you choose the prompt</h2>

<div class="docs-rule-meta">
  <span>Where you practice it:</span>
  <a href="/docs/workshop/part1-spectrum" class="markdown-link">Part 1 &middot; The Rabbit Hole</a>
</div>

The first decision is not which prompt to write. It is which **stage of maturity** the work belongs in (Vibe, AI-Assisted, Agentic) and which **autonomy tier** the repository has earned (Restricted, Supervised, Autonomous). Stage and tier together set the bar for everything that follows.

**Smell test. You are breaking this rule when:**

- You hesitated before accepting the diff, but accepted it anyway.
- You used Vibe mode in a repo with a CALM model and real users.
- You assigned an Agentic task to a Restricted-tier repo and overrode the hook.
- You reached for a prompt before you knew what the work *was*.

**Worked example.** A junior wants to vibe-code a search endpoint into the celeb-api. The celeb-api scored 5/100 (Restricted tier). The right answer is not "be careful". The right answer is: *this combination of stage and tier is not a thing*. Either lift the tier first or move the work to a sandbox repo. The rule is what the system enforces. The engineer&rsquo;s job is to know it before the system has to say no.

---

<h2 id="rule-2">Rule 2. Write the full contract before asking for code</h2>

<div class="docs-rule-meta">
  <span>Where you practice it:</span>
  <a href="/docs/workshop/part2-security-prompting" class="markdown-link">Part 2 &middot; Cheshire&rsquo;s Prompt Pack</a>
</div>

Every line of an **RCTRO** (Role, Context, Task, Requirements, Output) is a guardrail. Every section of a **prompt pack** is institutional memory. Skip them and the agent invents acceptance criteria from training data, not from your system.

**Smell test. You are breaking this rule when:**

- The Requirements section of your RCTRO has four bullets where Cheshire&rsquo;s would have thirty.
- The prompt did not name OWASP categories the work obviously touches.
- The contract did not pull in any of the three pack families (OWASP, STRIDE, Maintainability) when the work clearly needed them.
- You sent the agent off without a written acceptance criterion that a test could fail on.

**Worked example.** Feature: *"let users favorite a celebrity."* A bare prompt produces idempotency bugs, missing ownership checks, leaky log lines, three copies of the validation logic. The same feature run through Cheshire pulls in `owasp/A01`, `owasp/A03`, `owasp/A09`, `maintainability/complexity-reduction`, and `maintainability/dry-principle`. The agent sees twenty-five Requirements bullets where the human typed five. The pack is the difference between *"it shipped"* and *"it shipped with the team&rsquo;s checklist proven against it."*

---

<h2 id="rule-3">Rule 3. Trust but verify</h2>

<div class="docs-rule-meta">
  <span>Where you practice it:</span>
  <a href="/docs/workshop/part3-live-remediation" class="markdown-link">Part 3 &middot; Alice Remediates</a>
</div>

The agent will produce code that compiles and tests that pass. Compiling and passing are necessary, not sufficient. The reviewer&rsquo;s job is to confirm the code *does what the Requirements said*, the tests *prove the bug was actually broken before*, and nothing snuck in that the Requirements did not authorise. This is the new core skill of the agentic SDLC. It does not get easier with seniority. It gets sharper.

**Smell test. You are breaking this rule when:**

- You approved the PR without running the regression test against the unfixed code on `main`.
- You read the agent&rsquo;s plan and the diff at the same time, instead of vetting the plan first.
- The PR description does not name the prompt pack version, the finding ID, and the reviewer (you).
- You missed a Requirement and only noticed in the next sprint&rsquo;s regression.

**Worked example.** Agent fixes an A03 SQL injection. The PR adds parameterised queries and a Zod schema. Tests pass. You almost merge. Then you pull the branch and run the SQLi test against `main`, and it *also* passes, because the agent wrote a test that does not actually exercise the bug. The fix is real. The regression coverage is decoration. You send it back. Two more minutes. One less incident.

---

<h2 id="rule-4">Rule 4. Measurement enables governance</h2>

<div class="docs-rule-meta">
  <span>Where you practice it:</span>
  <a href="/docs/workshop/part4-fitness-functions" class="markdown-link">Part 4 &middot; The Looking Glass Measures</a>
</div>

A rule without a fitness function is a wish. A wish does not survive deadline pressure, reorganisations, or the new hire who never heard it. Fitness functions are *structural assertions about the codebase as a whole* (complexity, duplicated code, dead code, import boundaries, **CALM layer enforcement**), running on every PR, failing the build when the property stops holding.

**Smell test. You are breaking this rule when:**

- A team norm exists only in a Slack message from six months ago.
- A PR violates an architectural rule and CI is silent.
- A fitness function fails and the team&rsquo;s response is to disable the gate rather than fix the violation.
- The gate is blocking when it should be advisory, or advisory when it should be blocking.

**In practice.** Your team agrees code in the route layer should not import from the data layer directly. Six months later, three routes do exactly that. The agreement was a wish. Add a CALM-layer fitness function that reads the BAR&rsquo;s architecture and asserts the rule on every PR. Now the agreement is enforced at machine speed. The same rule becomes a deterministic Red Queen hook in Rule 6.

---

<h2 id="rule-5">Rule 5. Version the contract</h2>

<div class="docs-rule-meta">
  <span>Where you practice it:</span>
  <a href="/docs/workshop/part6-team-prompt-library" class="markdown-link">Part 6 &middot; The Hatter&rsquo;s Library</a>
  <span class="docs-rule-preview-chip">Preview</span>
</div>

In 2024 a prompt was personal: a developer wrote it, kept it in chat history, threw it away. In 2026 prompts are versioned assets. They live in `.cheshire/prompts/`. They are code-reviewed. They appear by reference in PR descriptions. The **Hatter&rsquo;s Tag** is the signed manifest attached to every AI-assisted PR: agent identity, model version, system-prompt fingerprint, prompt-pack version, threat-model reference, OWASP categories, fitness results, reviewer rationale.

**Smell test. You are breaking this rule when:**

- An auditor asks how a PR was produced and the answer is *"I think we used Claude."*
- Two PRs cite the same pack but the pack changed between them and nobody noticed.
- A regression appears and the team cannot tell whether the prompt changed or the codebase did.
- The team&rsquo;s prompt collection is in a Notion page, not the repo.

**In the audit.** ISO 42001 Annex A asks for evidence of how an AI system reaches decisions. Your audit trail says: PR #4129 was produced by Claude Opus 4.7 against issue #1024, using `.cheshire/prompts/owasp/A03_injection.md@v1.4.2`, reviewed by @your-handle, fitness results green, CodeQL re-scan clean. That is one git query away. Without versioning, it is one all-hands away.

---

<h2 id="rule-6">Rule 6. Make governance deterministic</h2>

<div class="docs-rule-meta">
  <span>Where you practice it:</span>
  <a href="/docs/workshop/part7-red-queens-court" class="markdown-link">Part 7 &middot; The Red Queen&rsquo;s Court</a>
  <span class="docs-rule-preview-chip">Preview</span>
</div>

Prompts are advisory. Reviews are advisory. Fitness functions are advisory in the sense that they fire *after* the code is written. The Red Queen makes the same constraints **deterministic**: the PreToolUse hook blocks the write *before* it lands; the policy engine evaluates flow constraints as code, not as LLM suggestions.

**Smell test. You are breaking this rule when:**

- An advisory rule has been violated three times this quarter and is still advisory.
- A break-glass override has no scoped budget, no written reason, no time limit, no CODEOWNER signature.
- The agent&rsquo;s permission tier was raised by hand instead of earned by score.
- The audit log of allows, denies, and overrides is not where the SOC team can read it.

**In practice.** Your CALM model declares `celeb-frontend → celeb-api → celeb-db`. There is no declared flow from frontend to db. An agent decides to query the db directly for performance. *Without Red Queen:* the agent ignores the architecture in its prompt, opens a PR, maybe a reviewer catches it. *With Red Queen:* the PreToolUse hook blocks the write at the agent&rsquo;s first attempt. The agent receives a deny with the correct path: route through `celeb-api`. The conversation in the audit log is one line, not one incident.

---

## Putting the six together

Skip Rule 1 and the others do not help: the wrong stage of work on the wrong tier of repo cannot be saved by a good prompt. Skip Rule 6 and the others are a wish: every constraint above is advisory until the policy engine makes it binding.

The shorthand for the whole set: **the agent writes the code. You decide what *good* means, write down the rules that make it stick, and prove it stayed good after the agent shipped.**

---

## Where to go next

- <a href="/docs/workshop" class="markdown-link">Walk the workshop end to end</a>. The rules in their natural habitat.
- <a href="/docs/framework" class="markdown-link">Read the framework</a>. How the rules connect to Looking Glass, Cheshire Cat, and Red Queen.
- <a href="/docs/governance/compliance-mapping" class="markdown-link">See the compliance mapping</a>. How each rule&rsquo;s artifact maps to SOC 2, ISO 27001, NIST 800-53, PCI DSS, EU AI Act, NIST AI RMF, and ISO/IEC 42001.
- <a href="/docs/agentic-sdlc-governance" class="markdown-link">Read the vision</a>. The two governance modalities: <a href="/docs/hatters-tea-party" class="markdown-link">Hatter&rsquo;s Tea Party</a> for the planning side (where Rule 5 lives) and <a href="/docs/red-queens-court" class="markdown-link">Red Queen&rsquo;s Court</a> for Phase 9 enforcement (where Rule 6 lands).

---

> **Source.** Synthesised from the workshop&rsquo;s Parts 1 to 7, the framework&rsquo;s six-phase SDLC, and the body of work on agentic-era developer practice including Mani, A. (2025). *Beyond Vibe Coding: From Coder to AI-Era Developer*. O&rsquo;Reilly Media.
