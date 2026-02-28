# GitHub Copilot — In-Editor Guide

> **Mode**: In-editor AI assistant (human-in-the-loop, IDE-integrated)
>
> Looking for the autonomous GitHub agent? See [Copilot Coding Agent](/docs/agents/copilot-coding-agent).

GitHub Copilot excels at **fast, in-editor code generation** with security constraints. Use #codebase context for repo-aware suggestions and #file references for OWASP prompt packs.

---

## Quick Start

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**Paste into Copilot Chat to get security-aware suggestions:**

<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 20px; margin-top: 16px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

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

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #6366f1;">

<div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

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

<p style="color: #94a3b8; font-size: 13px; margin: 16px 0 0 0;">This gives Copilot explicit security constraints via #file references and ensures OWASP compliance.</p>

</div>

### 2. Use Workspace Agent for Architecture Decisions

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #8b5cf6;">

<div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

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

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #f59e0b;">

<div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7; font-family: monospace;">

<span style="color: #6b7280;">// SECURITY: OWASP A01 - Implement RBAC authorization check</span><br/>
<span style="color: #6b7280;">// - Verify user is authenticated</span><br/>
<span style="color: #6b7280;">// - Check requester owns resource OR has admin role</span><br/>
<span style="color: #6b7280;">// - Log authorization failures</span><br/>
<span style="color: #6b7280;">// - Return generic error (no info leakage)</span><br/>
<span style="color: #c084fc;">export function</span> <span style="color: #67e8f9;">getUserDocument</span>(requester: User, ownerId: string) {<br/>
&nbsp;&nbsp;<span style="color: #6b7280;">// Copilot generates secure implementation from these comments</span><br/>
}

</div>
</div>

---

## Best Practices

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 24px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #10b981; margin-top: 0; font-size: 16px; font-weight: 700;">1. Be Explicit About Security</h3>
<p style="color: #f87171; font-size: 13px; margin: 8px 0 4px 0;">Don't say: "Add authentication to the API"</p>
<p style="color: #4ade80; font-size: 13px; margin: 4px 0 12px 0;">Do say: "#file:/docs/prompts/owasp/A07_authn_failures — Implement authentication middleware with bcrypt (cost 12), rate limiting (5 attempts/15min), secure session cookies (httpOnly, secure, sameSite), generic error messages."</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #10b981; margin-top: 0; font-size: 16px; font-weight: 700;">2. Reference Existing Patterns</h3>
<p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">Use #file references to your OWASP examples: "#file:/examples/owasp/A01\_broken\_access\_control/ — Use this authorization pattern to protect the new /api/reports endpoint. Ensure ownership checks prevent IDOR attacks."</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #10b981; margin-top: 0; font-size: 16px; font-weight: 700;">3. Always Generate Tests</h3>
<p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">After generating code, ask for tests that verify: authorized users can access (200), unauthorized users are blocked (403), invalid tokens are rejected (401), and IDOR attempts are logged and denied.</p>
</div>

</div>

---

## Golden Rules Integration

Apply the [Golden Rules](/docs/governance/vibe-golden-rules) with Copilot:

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

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

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
- [Golden Rules](/docs/governance/vibe-golden-rules) — Governance principles
- [Copilot Coding Agent Guide](/docs/agents/copilot-coding-agent) — Autonomous agent version
