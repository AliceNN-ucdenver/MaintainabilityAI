<div class="docs-hero docs-hero-blue">
  <div class="docs-hero-glyph"><img src="/images/glyphs/cat.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/agents/">Agents</a><span class="sep">/</span><span>GitHub Copilot</span></div>
    <div class="docs-eyebrow">In-editor · human-in-the-loop <span class="docs-hero-meta">~3 min read</span></div>
    <h1 class="docs-hero-title">GitHub Copilot &mdash; in-editor code generation</h1>
    <p class="docs-hero-copy">Real-time IDE completion with #codebase context and #file references that pull in OWASP prompt packs. Best at fast iteration on single functions with security constraints in the prompt. Looking for the autonomous GitHub agent? See <a href="/docs/agents/copilot-coding-agent" class="markdown-link">Copilot Coding Agent</a>.</p>
    <span class="docs-hero-flourish">The Cheshire grin: half code, half guard&mdash;always smiling.</span>
  </div>
</div>

GitHub Copilot excels at **fast, in-editor code generation** with security constraints. Use #codebase context for repo-aware suggestions and #file references for OWASP prompt packs.

---

## Quick Start

<div class="docs-card docs-card-emerald">

**Paste into Copilot Chat to get security-aware suggestions:**

<div class="docs-card docs-card-muted">

**Role:** You are a security-focused developer implementing authentication middleware.

**Context:**
#codebase — Node 18 + TypeScript + Express application.
#file:/docs/prompts/owasp/A07\_authn\_failures — OWASP A07 security requirements.

**Task:**
Generate secure authentication middleware that handles login, session management, and rate limiting.

**Requirements:**
- bcrypt password hashing (cost factor 12)
- Rate limiting: 5 failed attempts per 15 minutes
- Secure session cookies (httpOnly, secure, sameSite)
- Generic error messages — no username enumeration
- Reference the A07 prompt pack constraints above

**Output:**
Middleware function + brief explanation of each security control.

</div>
</div>

**Key strengths**: Real-time completions, pattern following, fast single-function implementation. Copilot works best when you give it a focused, single-function task with explicit security constraints via #file references.

---

## Security-First Coding

### 1. Reference OWASP Prompts Directly

<div class="docs-card docs-card-indigo">

<div class="docs-card docs-card-muted">

**Role:** You are a security engineer fixing injection vulnerabilities.

**Context:**
#file:/docs/prompts/owasp/A03\_injection

**Task:**
Using the security requirements above, refactor this function to use parameterized queries.

**Requirements:**
- Replace all string concatenation with parameterized placeholders
- Add Zod input validation with allowlist regex
- Return generic error messages only

**Output:**
Refactored function + explanation of each change.

</div>

<p class="docs-copy">This gives Copilot explicit security constraints via #file references and ensures OWASP compliance.</p>

</div>

### 2. Use Workspace Agent for Architecture Decisions

<div class="docs-card docs-card-indigo">

<div class="docs-card docs-card-muted">

@workspace Review the codebase and identify:
1. Functions with cyclomatic complexity > 10
2. Modules violating the 3-month dependency freshness rule
3. Files missing error handling patterns
4. Security vulnerabilities matching OWASP A01-A10

Reference: /docs/maintainability/fitness-functions.md

</div>
</div>

### 3. Inline Completions with Security Context

Guide Copilot's inline suggestions with structured security comments:

<div class="docs-card docs-card-amber">

<div class="docs-card docs-card-muted">

<span class="docs-copy">// SECURITY: OWASP A01 - Implement RBAC authorization check</span><br/>
<span class="docs-copy">// - Verify user is authenticated</span><br/>
<span class="docs-copy">// - Check requester owns resource OR has admin role</span><br/>
<span class="docs-copy">// - Log authorization failures</span><br/>
<span class="docs-copy">// - Return generic error (no info leakage)</span><br/>
<span class="docs-copy">export function</span> <span class="docs-copy">getUserDocument</span>(requester: User, ownerId: string) {<br/>
&nbsp;&nbsp;<span class="docs-copy">// Copilot generates secure implementation from these comments</span><br/>
}

</div>
</div>

---

## Best Practices

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">1. Be Explicit About Security</h3>
<p class="docs-copy">Don't say: "Add authentication to the API"</p>
<p class="docs-copy">Do say: "#file:/docs/prompts/owasp/A07_authn_failures — Implement authentication middleware with bcrypt (cost 12), rate limiting (5 attempts/15min), secure session cookies (httpOnly, secure, sameSite), generic error messages."</p>
</div>

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">2. Reference Existing Patterns</h3>
<p class="docs-copy">Use #file references to your OWASP examples: "#file:/examples/owasp/A01\_broken\_access\_control/ — Use this authorization pattern to protect the new /api/reports endpoint. Ensure ownership checks prevent IDOR attacks."</p>
</div>

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">3. Always Generate Tests</h3>
<p class="docs-copy">After generating code, ask for tests that verify: authorized users can access (200), unauthorized users are blocked (403), invalid tokens are rejected (401), and IDOR attempts are logged and denied.</p>
</div>

</div>

---

## Golden Rules Integration

Apply the [Golden Rules](/docs/governance/governed-golden-rules) with Copilot:

| Rule | Application |
|------|-------------|
| **Be Specific** | Reference OWASP prompts, tech stack, and constraints |
| **Trust But Verify** | Review every line Copilot generates |
| **Treat as Junior Dev** | Give detailed guidance, review output carefully |
| **Isolate AI Changes** | Separate commits, labeled with agent used |
| **Document Rationale** | Add comments explaining security decisions |
| **Share Prompts** | Save successful patterns to your team's prompt library |

---

## Example: Complete A03 Injection Fix

<div class="docs-card docs-card-muted">

| Step | Action | Details |
|------|--------|---------|
| **1. Reference** | #file:/docs/prompts/owasp/A03_injection | Load security requirements into context |
| **2. Generate** | #file:/examples/owasp/A03_injection/insecure.ts | Refactor with parameterized queries, Zod validation |
| **3. Test** | Generate Jest tests | SQL injection payloads, long inputs, invalid characters |
| **4. Verify** | @workspace fitness function checks | Complexity < 10, coverage > 80% |

</div>

---

## Further Reading

- [OWASP Prompt Packs](/docs/prompts/owasp/) — Security requirements for all categories
- [Golden Rules](/docs/governance/governed-golden-rules) — Governance principles
- [Copilot Coding Agent Guide](/docs/agents/copilot-coding-agent) — Autonomous agent version
