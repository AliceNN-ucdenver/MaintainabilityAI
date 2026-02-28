# Claude Code — In-Editor Guide

> **Mode**: In-editor AI assistant (human-in-the-loop, IDE-integrated)
>
> Looking for the autonomous GitHub agent? See [Claude Code Action](/docs/agents/claude-code-action).

Claude Code excels at **complex, multi-file refactoring** with security constraints. It understands large codebases, coordinates changes across files, and generates comprehensive test suites with attack vectors.

---

## Quick Start

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #6366f1;">

**Copy this prompt into Claude Code to get started:**

<div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 20px; margin-top: 16px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

**Role:** You are a senior security engineer specializing in OWASP compliance.

**Context:**
Repository uses Node 18 + TypeScript + Express + PostgreSQL.
Files: src/auth/\*.ts, src/middleware/auth.ts
Must comply with OWASP Top 10 (2021).

**Task:**
Refactor the authentication module following OWASP A07 best practices.

**Requirements:**
- Analyze current implementation for vulnerabilities
- Apply security controls per [OWASP A07 prompt pack](/docs/prompts/owasp/A07_authn_failures)
- Maintain cyclomatic complexity ≤10 per function
- Generate comprehensive tests with attack vectors

**Output:**
Refactored code + test suite + explanation of each security control applied.

</div>
</div>

**Key strengths**: Multi-file dependency tracking, comprehensive test generation, detailed security explanations.

---

## Security-First Refactoring

### Complex Refactoring with OWASP Compliance

Always provide full context with security constraints:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

**Role:** You are a security architect performing a secure data access layer refactoring.

**Context:**
Files: src/repositories/UserRepository.ts, src/models/User.ts
Database: PostgreSQL with pg library
Current issues: SQL injection in search, missing authorization checks, no input validation

**Task:**
Refactor the user data access layer to address OWASP A01 (Access Control) and A03 (Injection).

**Requirements:**
- Parameterized queries only (no string concatenation)
- RBAC authorization on all methods
- Zod validation for all inputs
- Generic error messages (no schema leakage)
- Reference: [A01 prompt pack](/docs/prompts/owasp/A01_broken_access_control), [A03 prompt pack](/docs/prompts/owasp/A03_injection)

**Output:**
1. Vulnerability analysis of current code
2. Refactoring plan with security controls mapped to threats
3. Secure implementation
4. Test suite with attack vectors

</div>
</div>

### Multi-File Feature Implementation

Claude's differentiator — coordinating changes across multiple files:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #8b5cf6;">

<div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

**Role:** You are a full-stack security engineer implementing a new feature with defense-in-depth.

**Context:**
Feature: Document sharing with end-to-end security
Files to create/modify: src/routes/sharing.ts (new), src/services/SharingService.ts (new), src/middleware/ownership.ts (modify), src/\_\_tests\_\_/sharing.test.ts (new)

**Task:**
Implement document sharing that addresses four OWASP categories simultaneously.

**Requirements:**
- A01: Authorization — ownership verification before sharing
- A03: Injection — parameterized queries for all database access
- A08: Integrity — tamper detection on shared documents
- A09: Logging — complete audit trail for share/unshare/access events
- Complexity ≤10 per function, test coverage ≥80%

**Output:**
Architecture design → implementation across all files → test suite with attack vectors for each OWASP category.

</div>
</div>

### Comprehensive Test Generation

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #f59e0b;">

<div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 20px; font-size: 14px; color: #e2e8f0; line-height: 1.7;">

**Role:** You are a security test engineer generating comprehensive test suites.

**Context:**
Files to test: src/auth/login.ts, src/auth/register.ts, src/middleware/authenticate.ts
Framework: Jest + TypeScript

**Task:**
Generate a complete security-focused test suite for the authentication module.

**Requirements:**
- Positive cases (happy path — valid login, registration)
- Negative cases (invalid input, missing fields)
- Security attack vectors: SQL injection attempts, password brute force, session hijacking, token forgery
- Edge cases: race conditions, timeouts, concurrent sessions
- Coverage target: ≥80% overall, 100% on security-critical paths

**Output:**
Jest test file with test categories clearly labeled, each test documenting which OWASP category it validates.

</div>
</div>

---

## Best Practices

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 24px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #6366f1; margin-top: 0; font-size: 16px; font-weight: 700;">1. Provide Complete Context</h3>
<p style="color: #f87171; font-size: 13px; margin: 8px 0 4px 0;">Don't say: "Fix the security issues in this file"</p>
<p style="color: #4ade80; font-size: 13px; margin: 4px 0 12px 0;">Do say: "Security review src/auth/login.ts — Node 18 + TypeScript + Express + PostgreSQL. Issues: SQL injection, plain text passwords, no rate limiting. Reference A03 and A07 prompt packs."</p>
<p style="color: #94a3b8; font-size: 13px; margin: 0;">Include: tech stack, file paths, OWASP categories, specific requirements, and prompt pack references.</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #6366f1; margin-top: 0; font-size: 16px; font-weight: 700;">2. Leverage Multi-File Understanding</h3>
<p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">List all files and their dependencies explicitly. Claude tracks cross-file relationships — tell it that login.ts uses authenticate.ts for token generation, register.ts uses User.ts for database access, and all share security.ts constants.</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid #334155;">
<h3 style="color: #6366f1; margin-top: 0; font-size: 16px; font-weight: 700;">3. Request Explanations</h3>
<p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">Always ask Claude to explain: why each security control is necessary (reference OWASP), how the refactoring prevents specific attacks, performance implications, and maintenance considerations.</p>
</div>

</div>

---

## Golden Rules Integration

Apply the [Golden Rules](/docs/governance/vibe-golden-rules) with Claude:

| Rule | Application |
|------|-------------|
| **Be Specific** | Provide complete context, OWASP categories, tech stack |
| **Trust But Verify** | Review Claude's output against security checklists |
| **Treat as Junior Dev** | Give complex tasks but review thoroughly — verify security controls, check edge cases |
| **Isolate AI Changes** | Separate commits, labeled with agent used |
| **Document Rationale** | Ask Claude to explain security decisions |
| **Share Prompts** | Save successful patterns to your team's prompt library |

---

## Example: Complete A03 Injection Fix

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

| Step | Action | Details |
|------|--------|---------|
| **1. Analyze** | Ask Claude to review src/search/users.ts | Identify A03 vulnerabilities |
| **2. Plan** | Get a detailed refactoring plan | Security controls mapped to each threat |
| **3. Implement** | Apply secure patterns | Parameterized queries, Zod validation, generic error messages |
| **4. Test** | Generate security test suite | SQL injection payloads, long inputs, special characters |
| **5. Verify** | Run tests and lint | Confirm all pass, complexity ≤10 |

</div>

---

## Further Reading

- [OWASP Prompt Packs](/docs/prompts/owasp/) — Security requirements for all categories
- [Golden Rules](/docs/governance/vibe-golden-rules) — Governance principles
- [Claude Code Action Guide](/docs/agents/claude-code-action) — Autonomous agent version
