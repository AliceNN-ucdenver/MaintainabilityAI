<div class="docs-hero docs-hero-violet">
  <div class="docs-hero-glyph"><img src="/images/glyphs/spade.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/agents/">Agents</a><span class="sep">/</span><span>Multi-agent</span></div>
    <div class="docs-eyebrow">Agentic · orchestration patterns <span class="docs-hero-meta">~4 min read</span></div>
    <h1 class="docs-hero-title">Multi-agent &mdash; specialists at the Queen&rsquo;s court</h1>
    <p class="docs-hero-copy">Sequential pipelines, parallel workstreams, validator loops, and consensus review boards. When one agent isn&rsquo;t enough, these are the orchestration shapes that make handoffs auditable.</p>
    <span class="docs-hero-flourish">Five agents, one verdict. The court keeps its rules.</span>
  </div>
</div>

---

## Why Multi-Agent?

Complex tasks often require:
- **Specialized expertise**: Different agents excel at different things
- **Verification loops**: One agent validates another's output
- **Parallel workstreams**: Multiple features developed simultaneously
- **Phased workflows**: Threat model → design → implement → test → review

---

## Core Patterns

### Pattern 1: Sequential Pipeline

Each agent builds on the previous agent's output.

<figure class="docs-visual">
  <img src="/images/diagrams/agent-sequential-pipeline.svg" alt="Sequential multi-agent pipeline from threat modeler to deployment with review feedback loops." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">A sequential pipeline lets each agent sharpen the artifact before the next role acts.</figcaption>
</figure>

**Typical assignment**: Claude Code (architecture + tests) → Copilot (implementation) → Claude Code Action or Copilot Coding Agent (automated review)

### Pattern 2: Parallel Execution

Independent tasks run simultaneously, then merge.

<figure class="docs-visual">
  <img src="/images/diagrams/agent-parallel-execution.svg" alt="Parallel agent execution across auth, data, and API workstreams before integration testing." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Parallel agents work safely when the design contract and integration boundary are explicit.</figcaption>
</figure>

**When to use**: Microservice development, multi-module features with clear boundaries.

### Pattern 3: Validator Loop

One agent generates, another validates — tight feedback until approval.

<figure class="docs-visual">
  <img src="/images/diagrams/agent-validator-loop.svg" alt="Validator loop where an implementer agent generates code and a validator agent approves or sends issues back." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Separate generation from validation for security-critical changes.</figcaption>
</figure>

**When to use**: Security-critical features where implementation and review must be separate concerns.

### Pattern 4: Consensus Validation

Multiple agents review the same code from different angles. All must approve.

<figure class="docs-visual">
  <img src="/images/diagrams/agent-consensus-validation.svg" alt="Consensus validation across security, quality, and performance reviewers before approval or revision." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">High-risk work should pass multiple review lenses before it merges.</figcaption>
</figure>

**When to use**: High-risk changes where security, quality, and performance all matter.

---

## The Gold Standard: Threat Model → Implement → Validate

This is the recommended pattern for security-critical features.

### Phase 1: Threat Modeling (Claude Code)

<div class="docs-card docs-card-indigo">

<div class="docs-card docs-card-muted">

**Role:** You are a threat modeling specialist using STRIDE methodology.

**Context:**
Feature: User profile update endpoint — users can update email, name, password. Must validate ownership, log changes, notify on security-relevant updates.

**Task:**
Analyze this feature for threats using STRIDE. For each category: identify threats, map to OWASP, rate risk, suggest mitigations.

**Output:**
Threat inventory as JSON with OWASP category mapping (e.g., T1: Spoofing → A01, T2: Injection → A03).

</div>
</div>

### Phase 2: Implementation (Copilot or Claude Code)

<div class="docs-card docs-card-emerald">

<div class="docs-card docs-card-muted">

**Role:** You are a security engineer implementing threat mitigations.

**Context:**
Threat model from Phase 1: [JSON input]
Reference: [A01 prompt pack](/docs/prompts/owasp/A01_broken_access_control), [A03 prompt pack](/docs/prompts/owasp/A03_injection)

**Task:**
Implement updateUserProfile() that mitigates all identified threats:
- \[T1\] Verify requester owns profile (A01)
- \[T2\] Use parameterized queries (A03)
- \[T3\] Log security events (A09)
- \[T4\] Rate limit updates (A07)

**Output:**
Implementation with threat mitigations mapped in code comments.

</div>
</div>

### Phase 3: Validation (Claude Code)

<div class="docs-card docs-card-amber">

<div class="docs-card docs-card-muted">

**Role:** You are a security validator performing independent review.

**Context:**
Inputs: Threat model from Phase 1, implementation from Phase 2.

**Task:**
Verify each threat mitigation and generate security tests.

**Requirements:**
1. Each threat (T1-T4) is mitigated in the implementation
2. OWASP compliance per category
3. Complexity ≤10, coverage ≥80%
4. Generate tests for each threat + attack vectors

**Output:**
Validation report (Pass/Fail per threat) + test suite. If any threat fails, provide specific feedback for the implementer.

</div>
</div>

### Phase 4: Iteration

The validator identifies gaps (e.g., "T4: No rate limiting"). The implementer fixes specifically what was flagged. Re-validate until all threats pass.

---

## Structured Handoff Format

When passing work between agents, use this template to prevent context loss:

<div class="docs-card docs-card-muted">

<div class="docs-card docs-card-indigo">

===== AGENT HANDOFF =====<br/>
FROM: [Agent Name/Role]<br/>
TO: [Next Agent Name/Role]<br/>
PHASE: [Current → Next]<br/>
<br/>
CONTEXT:<br/>
- Feature: [description]<br/>
- OWASP Categories: [A01, A03, etc.]<br/>
- Tech Stack: [Node 18, TypeScript, etc.]<br/>
<br/>
INPUT ARTIFACTS:<br/>
1. [Artifact 1 — name and location]<br/>
2. [Artifact 2 — name and location]<br/>
<br/>
TASK: [Specific task for next agent]<br/>
<br/>
SUCCESS CRITERIA:<br/>
□ [Criterion 1]<br/>
□ [Criterion 2]<br/>
<br/>
CONSTRAINTS:<br/>
- [Constraint 1]<br/>
- [Constraint 2]<br/>
===== END HANDOFF =====

</div>
</div>

---

## Mixing In-Editor and Agentic Agents

The two-tier model creates powerful orchestration possibilities:

| Phase | Agent Type | Agent | Why |
|-------|-----------|-------|-----|
| **Design** | In-editor | Claude Code | Interactive threat modeling with human |
| **Implement** | In-editor | Copilot | Fast coding with human review |
| **Automated Review** | Agentic | Claude Code Action | Governed review against CALM model |
| **Bulk Fixes** | Agentic | Alice Agent | Autonomous remediation with approval gates |
| **Cross-Repo Validation** | Agentic | Claude Code Action | Interface contract enforcement via Red Queen |

**Key insight**: Use in-editor agents for creative work (design, implementation) and agentic agents for enforcement and review. The Red Queen governs agentic agents deterministically — they can't bypass architecture constraints.

---

## Quick Reference Workflows

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">Secure Feature Development</h3>
<p class="docs-copy">
1. Claude Code: Threat model (interactive)<br/>
2. Copilot: Implementation (in-editor)<br/>
3. Claude Code: Test generation (interactive)<br/>
4. Claude Code Action: Automated security review (governed)
</p>
</div>

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">Large-Scale Refactoring</h3>
<p class="docs-copy">
1. Claude Code: Analyze codebase, create plan<br/>
2. Multiple agents in parallel: Implementation<br/>
3. Claude Code: Integration tests<br/>
4. Claude Code Action: Governance validation
</p>
</div>

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">Security Remediation</h3>
<p class="docs-copy">
1. CodeQL/Snyk: Identify vulnerabilities<br/>
2. Alice Agent: Autonomous fixes with human approval<br/>
3. Claude Code: Generate security tests<br/>
4. Claude Code Action: Validate against CALM model
</p>
</div>

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">Dependency Upgrades</h3>
<p class="docs-copy">
1. Claude Code: Breaking change analysis<br/>
2. Copilot: Code updates per package<br/>
3. Claude Code: Regression tests<br/>
4. Claude Code Action: Security scan validation
</p>
</div>

</div>

---

## Best Practices

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-muted">
<p class="docs-copy">Clear handoffs</p>
<p class="docs-copy">Use the structured format. Context loss is the #1 failure mode.</p>
</div>

<div class="docs-card docs-card-muted">
<p class="docs-copy">Different agent for validation</p>
<p class="docs-copy">Never use the same agent to implement and validate.</p>
</div>

<div class="docs-card docs-card-muted">
<p class="docs-copy">Automated checks in the loop</p>
<p class="docs-copy">Include CodeQL, Snyk, ESLint as non-agent validators.</p>
</div>

<div class="docs-card docs-card-muted">
<p class="docs-copy">Label everything</p>
<p class="docs-copy">Commits include which agent was used for traceability.</p>
</div>

<div class="docs-card docs-card-muted">
<p class="docs-copy">Human final review</p>
<p class="docs-copy">Humans resolve conflicts between agents and make final approval.</p>
</div>

</div>

---

## Further Reading

- [Claude Code (In-Editor)](/docs/agents/claude) — Interactive refactoring guide
- [Copilot (In-Editor)](/docs/agents/copilot) — In-editor code generation
- [Claude Code Action](/docs/agents/claude-code-action) — Autonomous governed agent
- [Copilot Coding Agent](/docs/agents/copilot-coding-agent) — Autonomous governed agent
- [Alice Agent](/docs/agents/alice) — Autonomous security remediation
- [SDLC Framework](/docs/sdlc/) — How agents fit into each phase
