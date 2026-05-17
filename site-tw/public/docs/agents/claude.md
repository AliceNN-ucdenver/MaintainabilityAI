<div class="docs-hero docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/agents/">Agents</a><span class="sep">/</span><span>Claude Code</span></div>
    <div class="docs-eyebrow">In-editor · human-in-the-loop <span class="docs-hero-meta">~4 min read</span></div>
    <h1 class="docs-hero-title">Claude Code &mdash; complex refactoring &amp; testing</h1>
    <p class="docs-hero-copy">Deep multi-file refactoring with security constraints, attack-vector test generation, and detailed reasoning. Strongest when the change crosses files. Looking for the autonomous GitHub agent? See <a href="/docs/agents/claude-code-action" class="markdown-link">Claude Code Action</a>.</p>
    <span class="docs-hero-flourish">&ldquo;You used to be much more&hellip; <em>muchier</em>.&rdquo; Bring back the muchness.</span>
  </div>
</div>

Claude Code excels at **complex, multi-file refactoring** with security constraints. It understands large codebases, coordinates changes across files, and generates comprehensive test suites with attack vectors.

---

## Quick Start

<div class="docs-card docs-card-indigo">

**Copy this prompt into Claude Code to get started:**

<div class="docs-card docs-card-muted">

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

<div class="docs-card docs-card-emerald">

<div class="docs-card docs-card-muted">

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

<div class="docs-card docs-card-indigo">

<div class="docs-card docs-card-muted">

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

<div class="docs-card docs-card-amber">

<div class="docs-card docs-card-muted">

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

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">1. Provide Complete Context</h3>
<p class="docs-copy">Don't say: "Fix the security issues in this file"</p>
<p class="docs-copy">Do say: "Security review src/auth/login.ts — Node 18 + TypeScript + Express + PostgreSQL. Issues: SQL injection, plain text passwords, no rate limiting. Reference A03 and A07 prompt packs."</p>
<p class="docs-copy">Include: tech stack, file paths, OWASP categories, specific requirements, and prompt pack references.</p>
</div>

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">2. Leverage Multi-File Understanding</h3>
<p class="docs-copy">List all files and their dependencies explicitly. Claude tracks cross-file relationships — tell it that login.ts uses authenticate.ts for token generation, register.ts uses User.ts for database access, and all share security.ts constants.</p>
</div>

<div class="docs-card docs-card-muted">
<h3 class="docs-heading">3. Request Explanations</h3>
<p class="docs-copy">Always ask Claude to explain: why each security control is necessary (reference OWASP), how the refactoring prevents specific attacks, performance implications, and maintenance considerations.</p>
</div>

</div>

---

## Golden Rules Integration

Apply the [Golden Rules](/docs/governance/governed-golden-rules) with Claude:

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

<div class="docs-card docs-card-muted">

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
- [Golden Rules](/docs/governance/governed-golden-rules) — Governance principles
- [Claude Code Action Guide](/docs/agents/claude-code-action) — Autonomous agent version
