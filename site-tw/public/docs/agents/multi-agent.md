# Multi-Agent Orchestration Guide

> Coordinate multiple AI agents for complex security-first development workflows. Each agent has specialized strengths — orchestration gets you the best of all of them.

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

```mermaid
flowchart LR
    A[Threat Modeler] --> B[Architect]
    B --> C[Implementer]
    C --> D[Tester]
    D --> E[Reviewer]
    E --> F[Deploy]
    D --Fail--> C
    E --Fail--> C
```

**Typical assignment**: Claude Code (architecture + tests) → Copilot (implementation) → Claude Code Action or Copilot Coding Agent (automated review)

### Pattern 2: Parallel Execution

Independent tasks run simultaneously, then merge.

```mermaid
flowchart TD
    A[Design Complete] --> B[Agent 1: Auth Module]
    A --> C[Agent 2: Data Layer]
    A --> D[Agent 3: API Layer]
    B --> E[Integration]
    C --> E
    D --> E
    E --> F[Agent 4: Integration Tests]
```

**When to use**: Microservice development, multi-module features with clear boundaries.

### Pattern 3: Validator Loop

One agent generates, another validates — tight feedback until approval.

```mermaid
flowchart LR
    A[Implementer Agent] --> B[Code Generation]
    B --> C[Validator Agent]
    C -->|Issues Found| A
    C -->|Approved| D[Next Phase]
```

**When to use**: Security-critical features where implementation and review must be separate concerns.

### Pattern 4: Consensus Validation

Multiple agents review the same code from different angles. All must approve.

```mermaid
flowchart TD
    A[Implementation] --> B[Security Review]
    A --> C[Quality Review]
    A --> D[Performance Review]
    B --> E{Consensus?}
    C --> E
    D --> E
    E -->|Yes| F[Approve]
    E -->|No| G[Aggregate Feedback → Revise]
```

**When to use**: High-risk changes where security, quality, and performance all matter.

---

## The Gold Standard: Threat Model → Implement → Validate

This is the recommended pattern for security-critical features.

### Phase 1: Threat Modeling (Claude Code)

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #6366f1;">

<div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

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

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

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

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #f59e0b;">

<div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

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

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #334155;">

<div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7; font-family: monospace;">

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

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 24px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #6366f1; margin-top: 0; font-size: 16px; font-weight: 700;">Secure Feature Development</h3>
<p style="color: #e2e8f0; font-size: 13px; line-height: 1.8; margin: 0;">
1. Claude Code: Threat model (interactive)<br/>
2. Copilot: Implementation (in-editor)<br/>
3. Claude Code: Test generation (interactive)<br/>
4. Claude Code Action: Automated security review (governed)
</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #10b981; margin-top: 0; font-size: 16px; font-weight: 700;">Large-Scale Refactoring</h3>
<p style="color: #e2e8f0; font-size: 13px; line-height: 1.8; margin: 0;">
1. Claude Code: Analyze codebase, create plan<br/>
2. Multiple agents in parallel: Implementation<br/>
3. Claude Code: Integration tests<br/>
4. Claude Code Action: Governance validation
</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #f59e0b; margin-top: 0; font-size: 16px; font-weight: 700;">Security Remediation</h3>
<p style="color: #e2e8f0; font-size: 13px; line-height: 1.8; margin: 0;">
1. CodeQL/Snyk: Identify vulnerabilities<br/>
2. Alice Agent: Autonomous fixes with human approval<br/>
3. Claude Code: Generate security tests<br/>
4. Claude Code Action: Validate against CALM model
</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #8b5cf6; margin-top: 0; font-size: 16px; font-weight: 700;">Dependency Upgrades</h3>
<p style="color: #e2e8f0; font-size: 13px; line-height: 1.8; margin: 0;">
1. Claude Code: Breaking change analysis<br/>
2. Copilot: Code updates per package<br/>
3. Claude Code: Regression tests<br/>
4. Claude Code Action: Security scan validation
</p>
</div>

</div>

---

## Best Practices

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 24px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #4ade80;">
<p style="color: #4ade80; font-weight: 700; font-size: 14px; margin: 0 0 8px 0;">Clear handoffs</p>
<p style="color: #94a3b8; font-size: 13px; margin: 0;">Use the structured format. Context loss is the #1 failure mode.</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #4ade80;">
<p style="color: #4ade80; font-weight: 700; font-size: 14px; margin: 0 0 8px 0;">Different agent for validation</p>
<p style="color: #94a3b8; font-size: 13px; margin: 0;">Never use the same agent to implement and validate.</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #4ade80;">
<p style="color: #4ade80; font-weight: 700; font-size: 14px; margin: 0 0 8px 0;">Automated checks in the loop</p>
<p style="color: #94a3b8; font-size: 13px; margin: 0;">Include CodeQL, Snyk, ESLint as non-agent validators.</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #4ade80;">
<p style="color: #4ade80; font-weight: 700; font-size: 14px; margin: 0 0 8px 0;">Label everything</p>
<p style="color: #94a3b8; font-size: 13px; margin: 0;">Commits include which agent was used for traceability.</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border-left: 4px solid #4ade80;">
<p style="color: #4ade80; font-weight: 700; font-size: 14px; margin: 0 0 8px 0;">Human final review</p>
<p style="color: #94a3b8; font-size: 13px; margin: 0;">Humans resolve conflicts between agents and make final approval.</p>
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
