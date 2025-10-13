# ChatGPT - MaintainabilityAI Guide

> **Purpose**: ChatGPT-specific guidance for security-first AI-assisted development in the MaintainabilityAI framework.

This guide shows you how to effectively use ChatGPT (including GPT-4, Canvas, and Projects) with OWASP prompt packs, context window management, and security constraints.

---

## Quick Start

### Using Prompt Packs

ChatGPT excels when given comprehensive, structured prompts. The OWASP prompt packs in this repository are designed for ChatGPT's conversation style:

**Pattern**:
1. Copy the full prompt from `/docs/prompts/owasp/[category]`
2. Paste into ChatGPT
3. Provide your specific context (file paths, code snippets)
4. Review and iterate

**Example**:
```markdown
Reference the A03 Injection prompt pack at /docs/prompts/owasp/A03_injection

Now apply this to my code:

[paste insecure.ts code]
```

---

## Context Window Management

### Problem: ChatGPT Has Limited Context

Unlike IDE-integrated tools, ChatGPT doesn't automatically know your codebase structure.

### Solution: Structured Context Provision

#### Method 1: Project Files (ChatGPT Plus/Teams)

Upload key files to your ChatGPT project:
- OWASP prompt packs from `/docs/prompts/owasp/`
- `/docs/governance/vibe-golden-rules`
- `/docs/maintainability/fitness-functions`
- Your specific code files

ChatGPT will maintain this context across conversations.

#### Method 2: Explicit Context in Each Prompt

When you can't use Projects, include context explicitly:

```markdown
Repository Structure:
- Node 18 + TypeScript + Express + PostgreSQL
- OWASP prompt packs in /docs/prompts/owasp/
- Security scanning: CodeQL, Snyk
- Testing: Jest + ESLint
- Examples in /examples/owasp/A01-A10/

Current Task: [your task]

Security Requirements: [reference OWASP category]

Code to Refactor:
[paste code]
```

---

## Code Generation with Security Constraints

### Pattern: Layered Prompt Strategy

ChatGPT works best with progressive refinement:

#### Step 1: Set Security Context

```markdown
I'm working on a production application that must comply with OWASP Top 10 (2021).

Tech Stack:
- Node 18
- TypeScript (strict mode)
- Express.js
- PostgreSQL with pg library
- Zod for validation

Security Requirements:
- All code must pass CodeQL security scanning
- ESLint with security rules enabled
- Jest tests with >80% coverage
- Compliance with OWASP A01-A10

Acknowledge these constraints before we proceed.
```

#### Step 2: Provide Specific Task with OWASP Prompt

```markdown
I need to implement secure user authentication following OWASP A07:2021 - Authentication Failures.

Reference the A07 Authentication Failures prompt pack at /docs/prompts/owasp/A07_authn_failures

Generate the implementation.
```

#### Step 3: Iterative Refinement

```markdown
Good start. Now add:
1. Rate limiting (5 attempts per 15 minutes)
2. Constant-time password comparison
3. Secure session management with httpOnly cookies
4. Comprehensive tests including attack vectors
```

---

## Testing and Validation Patterns

### Generating Security-Focused Tests

ChatGPT excels at creating comprehensive test suites when given clear patterns:

```markdown
Generate Jest tests for the searchUsers function that verify:

Positive Cases:
1. Valid search query returns results
2. Empty query returns all users
3. Partial match works correctly

Security Cases (Must Block):
1. SQL injection: ' OR '1'='1
2. SQL injection: '; DROP TABLE users--
3. Command injection: $(whoami)
4. Path traversal: ../../../etc/passwd
5. XSS attempt: <script>alert('xss')</script>

Validation Cases (Must Reject):
1. Query exceeds 100 characters
2. Query contains invalid characters
3. Null/undefined input

Each test should:
- Use descriptive test names
- Include comments explaining attack vector
- Verify error messages are generic (no schema leaks)
- Check that security events are logged
```

### Test-Driven Security Development

Use ChatGPT to generate tests first:

```markdown
Before implementing the feature, generate comprehensive security tests based on OWASP A03 (Injection).

The tests should:
1. Define expected secure behavior
2. Include attack vectors that should be blocked
3. Verify input validation works
4. Check error handling doesn't leak information

Once tests are written, I'll implement the secure code to make them pass.
```

---

## Canvas Mode for Code Iteration

ChatGPT Canvas is ideal for iterative security hardening:

### Workflow

1. **Initial Generation**: Paste prompt pack, get initial code in Canvas
2. **Security Review**: Ask ChatGPT to review its own code against OWASP checklist
3. **Iterative Hardening**: Apply security improvements one by one
4. **Test Generation**: Generate tests in the same Canvas session
5. **Documentation**: Add security comments explaining decisions

### Example Session

```markdown
[Step 1 - In Canvas]
Generate a login function following OWASP A07 best practices.
[ChatGPT generates code in Canvas]

[Step 2 - Refine]
Review this code against the OWASP A07 checklist from /docs/prompts/owasp/A07_authn_failures.
Identify any missing security controls.

[Step 3 - Apply]
Add the missing controls you identified.

[Step 4 - Test]
Now generate comprehensive tests including attack vectors.

[Step 5 - Document]
Add detailed security comments explaining why each control is necessary.
```

---

## OWASP Integration Strategy

### Pre-Session Preparation

Before starting a coding session with ChatGPT:

1. **Identify OWASP Categories**: Which apply to your feature?
2. **Gather Prompt Packs**: Copy relevant prompts from the [OWASP prompt library](../prompts/owasp/)
3. **Prepare Examples**: Have insecure examples ready if available
4. **Define Success Criteria**: How will you verify security?

### Session Template

```markdown
Session Goal: [Feature description]

OWASP Categories Involved:
- A01: Broken Access Control (authorization checks)
- A03: Injection (SQL queries)
- A09: Logging/Monitoring (security events)

Prompt Packs to Use:
Reference the A01 Broken Access Control prompt pack at /docs/prompts/owasp/A01_broken_access_control
Reference the A03 Injection prompt pack at /docs/prompts/owasp/A03_injection
Reference the A09 Logging/Monitoring prompt pack at /docs/prompts/owasp/A09_logging_monitoring

Tech Stack: Node 18 + TypeScript + Express + PostgreSQL

Success Criteria:
□ All OWASP checklist items addressed
□ Tests cover positive and negative cases
□ CodeQL-compatible (no security warnings)
□ Generic error messages (no info leakage)
□ Security events logged properly

Let's begin with threat modeling...
```

---

## Maintainability Integration Strategy

### Adding Evolutionary Architecture to Security Workflows

Combine OWASP security prompts with maintainability prompts for production-grade outcomes:

**Pattern**: Security + Maintainability in Same Session

```markdown
Session Goal: Implement secure document sharing API with maintainability constraints

OWASP Categories:
- A01: Broken Access Control
- A03: Injection
- A09: Logging/Monitoring

Maintainability Requirements:
- Fitness Functions: Complexity ≤10 per function
- Dependency Hygiene: Use bcrypt ≥5.1.0, pg ≥8.11.0
- Test Coverage: ≥80%
- Performance: p95 latency <200ms

Prompt Packs:
Reference the A01 Broken Access Control prompt pack at /docs/prompts/owasp/A01_broken_access_control
Reference the Fitness Functions prompt pack at /docs/prompts/maintainability/fitness-functions

Generate code that satisfies BOTH security AND maintainability constraints.
```

### Maintainability Prompt Packs

| Pattern | Use Case | ChatGPT Prompt Pattern |
|---------|----------|------------------------|
| **Fitness Functions** | Enforce quality gates (complexity, coverage, performance) | Reference `/docs/prompts/maintainability/fitness-functions` + "Create ts-morph test that fails if complexity >10" |
| **Dependency Hygiene** | 3-month freshness rule, automated updates | Reference `/docs/prompts/maintainability/dependency-hygiene` + "Generate Renovate config with weekly updates" |
| **Strangler Fig** | Incremental legacy migration | Reference `/docs/prompts/maintainability/strangler-fig` + "Create proxy layer for users service migration" |
| **Technical Debt** | Structured debt tracking | Reference `/docs/prompts/maintainability/technical-debt` + "Generate TECHNICAL-DEBT.yml with automated detection script" |

### Multi-Turn Security + Maintainability Refinement

**Turn 1**: Basic secure implementation (OWASP)
```markdown
Implement document retrieval with OWASP A01 + A03 compliance.
Reference prompt packs: /docs/prompts/owasp/A01_broken_access_control and /docs/prompts/owasp/A03_injection
```

**Turn 2**: Add maintainability constraints
```markdown
Refactor to satisfy fitness functions:
- Split functions if complexity >10
- Extract helper functions for reusability
- Add JSDoc comments for public APIs
Reference: /docs/prompts/maintainability/fitness-functions
```

**Turn 3**: Generate comprehensive tests
```markdown
Generate tests that verify:
- Security: Attack vectors (SQL injection, IDOR)
- Maintainability: Complexity check, coverage report
- Performance: p95 latency baseline
```

**Turn 4**: Analyze dependencies
```markdown
Review dependencies used in this implementation:
- Check for CVEs (Snyk/npm audit)
- Verify all are <90 days old
- Suggest pinned versions (no ^ or ~)
Reference: /docs/prompts/maintainability/dependency-hygiene
```

---

## Multi-Turn Security Refinement

ChatGPT's conversational nature is perfect for progressive security hardening:

### Turn 1: Basic Implementation

```markdown
Implement a basic document retrieval function that fetches user documents from PostgreSQL.
```

### Turn 2: Add OWASP A01 (Access Control)

```markdown
Now secure this against OWASP A01: Broken Access Control.
Add authorization checks to ensure users can only access their own documents.
Reference: /docs/prompts/owasp/A01_broken_access_control
```

### Turn 3: Add OWASP A03 (Injection)

```markdown
Secure this against OWASP A03: Injection.
Use parameterized queries and add input validation.
Reference: /docs/prompts/owasp/A03_injection
```

### Turn 4: Add Logging

```markdown
Add security logging following OWASP A09: Logging/Monitoring.
Log authorization failures and suspicious activity.
Reference: /docs/prompts/owasp/A09_logging_monitoring
```

### Turn 5: Generate Tests

```markdown
Generate comprehensive tests that verify:
1. Authorized access works
2. Unauthorized access is blocked
3. Injection attempts are prevented
4. Security events are logged

Include both positive and attack test cases.
```

---

## Handling Large Codebases

### Problem: Context Window Limits

ChatGPT can't process your entire codebase at once.

### Solution: Focused Refactoring

**Pattern**: Work on one module at a time with explicit dependencies

```markdown
Context: I'm refactoring the authentication module in a larger application.

Architecture:
- Auth module exports: login(), logout(), validateSession()
- Uses: UserRepository (for DB access), TokenService (for JWT)
- Called by: Express middleware, API routes

Current Focus: Secure the login() function

Dependencies I'll Handle Separately:
- UserRepository (assume it's secure)
- TokenService (assume it's secure)

Your Task: Focus only on login() function following OWASP A07.

[Paste login function code]
```

### Maintain Consistency Across Sessions

Create a "project brief" to paste at the start of each session:

```markdown
Project: MaintainabilityAI - Secure Enterprise Application

Standards:
- OWASP Top 10 (2021) compliance required
- TypeScript strict mode
- Zod validation for all inputs
- Parameterized queries only (pg library)
- bcrypt for password hashing (cost 12)
- Generic error messages (no schema/stack leaks)
- Security events logged with structured logging

Code Style:
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Interfaces: PascalCase
- Max cyclomatic complexity: 10
- Max function length: 50 lines

Testing:
- Jest with >80% coverage
- Include attack vector tests for each OWASP category
- Use descriptive test names: "should block SQL injection attempt"

[Paste this at the start of each ChatGPT session]
```

---

## Evolutionary Architecture with ChatGPT

### Incremental Refactoring Pattern

ChatGPT can guide incremental improvements:

```markdown
I have a legacy authentication module that needs modernization following evolutionary architecture principles.

Current State:
[paste legacy code]

Goal State:
- OWASP A07 compliant
- TypeScript strict mode
- Comprehensive tests
- Cyclomatic complexity <10 per function

Constraints:
- Cannot break existing API contract
- Must maintain backward compatibility
- Deploy incrementally (can't big-bang refactor)

Create a phased refactoring plan:
1. Phase 1: Add TypeScript types (no behavior change)
2. Phase 2: Add input validation (fail safely)
3. Phase 3: Migrate to bcrypt from MD5 (dual-write period)
4. Phase 4: Add security logging
5. Phase 5: Remove legacy code

For each phase:
- Provide code changes
- Explain risk mitigation
- Suggest rollback plan
- Generate tests to verify behavior unchanged

Reference: /docs/maintainability/evolutionary-architecture.md
```

### Fitness Function Implementation

```markdown
Help me implement architectural fitness functions for this codebase.

Reference: /docs/maintainability/fitness-functions.md

Create automated checks for:

1. Complexity Fitness Function:
   - Cyclomatic complexity must be ≤10 per function
   - Tool: ESLint complexity rule
   - Generate .eslintrc.cjs configuration

2. Dependency Freshness:
   - All dependencies must be <3 months old
   - Tool: npm outdated + custom script
   - Generate monitoring script

3. Security Compliance:
   - No CodeQL high-severity findings
   - No Snyk critical vulnerabilities
   - Tool: GitHub Actions workflow
   - Generate .github/workflows/security.yml

4. Test Coverage:
   - Minimum 80% code coverage
   - 100% coverage on security-critical paths
   - Tool: Jest coverage
   - Generate jest.config.ts with thresholds

For each, provide:
- Configuration files
- CI/CD integration
- Failure reporting
- Remediation guidance
```

---

## Prompt Library Building

### Capturing Successful Patterns

After a successful ChatGPT session, extract reusable prompts:

```markdown
That worked great! Help me create a reusable prompt for the team.

Session Summary:
- We implemented secure file upload following OWASP A08 (Integrity Failures)
- Used validation, file type checks, virus scanning, size limits
- Generated comprehensive tests

Create a prompt pack following this template:
Reference template from /docs/governance/vibe-golden-rules (Rule 6)

Save to: /prompts/team/secure-file-upload.md
```

---

## Common Pitfalls and Solutions

### Pitfall 1: ChatGPT Forgets Context

**Problem**: After many turns, ChatGPT forgets earlier security constraints

**Solution**: Periodic context refresh

```markdown
Reminder: This code must comply with OWASP Top 10 (2021).
Review the code you just generated against this checklist:
[paste relevant OWASP checklist]
```

### Pitfall 2: Over-Complicated Solutions

**Problem**: ChatGPT generates overly complex code

**Solution**: Constrain with simplicity requirements

```markdown
Simplify this implementation following these constraints:
- Max cyclomatic complexity: 10
- Max function length: 30 lines
- Single Responsibility Principle
- No nested callbacks (use async/await)

Refactor while maintaining all security controls.
```

### Pitfall 3: Generic Security Advice

**Problem**: ChatGPT gives generic advice instead of specific code

**Solution**: Demand concrete implementation

```markdown
Don't just tell me to "add input validation."

Show me:
1. Exact Zod schema for this use case
2. Where to place validation in the function
3. How to handle validation errors
4. Tests that verify validation works

Be specific and actionable.
```

---

## Integration with Development Workflow

### Pre-Implementation: Threat Modeling

```markdown
Before writing code, let's threat model this feature.

Feature: User document sharing (share documents with other users)

Using STRIDE methodology:
- Spoofing: Could attacker impersonate document owner?
- Tampering: Could shared document be modified by unauthorized user?
- Repudiation: Can we prove who shared what with whom?
- Information Disclosure: Could attacker access unshared documents?
- Denial of Service: Could sharing be abused to exhaust resources?
- Elevation of Privilege: Could recipient gain owner permissions?

For each threat:
1. Identify OWASP category
2. Suggest mitigation
3. Provide implementation guidance
4. Reference relevant prompt pack

Reference: /docs/sdlc/phase1-design
```

### Implementation: Security-First Coding

```markdown
Implement document sharing with mitigations for the threats we identified.

[Paste threat model from previous turn]

Apply OWASP prompt packs:
- A01 (Access Control): Ownership verification
- A03 (Injection): Parameterized queries
- A08 (Integrity): Verify document hasn't been tampered

Generate code that:
1. Validates share request
2. Checks authorization
3. Creates audit trail
4. Handles errors securely
```

### Verification: Test Generation

```markdown
Generate comprehensive tests for the document sharing feature.

Include:
1. Positive cases (authorized sharing works)
2. Negative cases (unauthorized access blocked)
3. Attack cases (IDOR, injection, tampering)
4. Edge cases (self-sharing, circular shares, deleted users)
5. Performance cases (sharing with 1000 users)

Tests should verify:
- OWASP security controls work
- Audit logging is complete
- Error messages are generic
- No resource leaks

Reference: /docs/sdlc/phase3-verification
```

---

## Measuring ChatGPT Effectiveness

Track these metrics to optimize usage:

### Quality Metrics
- **Security Scan Pass Rate**: % of ChatGPT code passing CodeQL/Snyk on first attempt
- **Test Coverage**: % coverage on generated code
- **Prompt Iterations**: Average turns needed to reach secure implementation
- **OWASP Compliance**: % of checklist items addressed without prompting

### Efficiency Metrics
- **Time to Implementation**: Compared to manual coding
- **Refactoring Speed**: Time to harden insecure code
- **Test Generation Speed**: Time to create comprehensive test suite

### Learning Metrics
- **Prompt Reuse Rate**: How often successful prompts are reused
- **Team Adoption**: % of developers using ChatGPT with OWASP packs
- **Security Knowledge**: Developer understanding of OWASP categories

---

## Advanced Patterns

### Multi-Agent Simulation

Use ChatGPT to simulate multiple security roles:

```markdown
Let's simulate a security review with three roles:

Role 1 - Threat Modeler:
Review this code and identify security threats using STRIDE methodology.

[You paste code, ChatGPT responds as threat modeler]

Role 2 - Security Engineer:
Address the threats identified above. Propose mitigations with code.

[ChatGPT switches roles and proposes fixes]

Role 3 - Security Reviewer:
Review the mitigated code against OWASP Top 10 checklist. Approve or request changes.

[ChatGPT switches again and reviews]

Continue until Role 3 approves.
```

### "Upgrade All The Things" Kata

```markdown
Task: Upgrade all dependencies following the 3-month freshness rule.

Reference: /docs/sdlc/phase6-evolution

Process:
1. Analyze package.json and identify outdated packages
2. For each package:
   a. Check for CVEs (npm audit, Snyk)
   b. Review changelog for breaking changes
   c. Suggest upgrade strategy (patch/minor/major)
   d. Identify test scenarios to verify upgrade
   e. Provide rollback plan if upgrade fails

3. Prioritize:
   - Security fixes first (CVEs)
   - Major version jumps with breaking changes last
   - Test infrastructure early (jest, eslint)

4. Generate upgrade script that:
   - Upgrades one package at a time
   - Runs tests after each upgrade
   - Reverts on failure
   - Logs results

Output: Step-by-step upgrade plan with commands and verification steps.
```

---

## Best Practices Summary

### Do's
- Always start with security context and OWASP categories
- Reference prompt packs explicitly in each session
- Generate tests alongside implementation code
- Use iterative refinement (don't expect perfection on first try)
- Document security decisions in code comments
- Create reusable prompts from successful sessions
- Verify AI output with CodeQL/Snyk/ESLint

### Don'ts
- Don't assume ChatGPT remembers context from previous sessions
- Don't accept generic security advice without concrete implementation
- Don't skip the verification step (tests + scans)
- Don't forget to apply Golden Rules (review, label, document)
- Don't use ChatGPT for sensitive credential handling
- Don't blindly trust output - always review for security

---

## Quick Reference: OWASP Prompt Pack Usage

| Category | When to Use | ChatGPT Command |
|----------|-------------|-----------------|
| **A01** | User authorization, resource access | Reference `/docs/prompts/owasp/A01_broken_access_control` + your code |
| **A02** | Password hashing, encryption, TLS | Reference `/docs/prompts/owasp/A02_crypto_failures` + your code |
| **A03** | Database queries, command execution | Reference `/docs/prompts/owasp/A03_injection` + your code |
| **A04** | Feature design, architecture review | Reference `/docs/prompts/owasp/A04_insecure_design` + threat model |
| **A05** | Server configuration, security headers | Reference `/docs/prompts/owasp/A05_security_misconfig` + config |
| **A06** | Dependency upgrades, vulnerability scanning | Reference `/docs/prompts/owasp/A06_vuln_outdated` + package.json |
| **A07** | Login, session management, MFA | Reference `/docs/prompts/owasp/A07_authn_failures` + auth code |
| **A08** | Software updates, package integrity | Reference `/docs/prompts/owasp/A08_integrity_failures` + deployment |
| **A09** | Logging, monitoring, alerting | Reference `/docs/prompts/owasp/A09_logging_monitoring` + logging code |
| **A10** | External API calls, URL fetching | Reference `/docs/prompts/owasp/A10_ssrf` + fetch code |

---

## Further Reading

### Security Prompts
- [OpenAI ChatGPT Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
- [OWASP Prompt Packs](../prompts/owasp/)
- [Golden Rules of Vibe Coding](/docs/governance/vibe-golden-rules)
- [SDLC Framework](/docs/sdlc/)

### Maintainability Prompts
- [Fitness Functions](/docs/prompts/maintainability/fitness-functions)
- [Dependency Hygiene](/docs/prompts/maintainability/dependency-hygiene)
- [Strangler Fig Pattern](/docs/prompts/maintainability/strangler-fig)
- [Technical Debt Management](/docs/prompts/maintainability/technical-debt)
- [Evolutionary Architecture Guide](/docs/maintainability/evolutionary-architecture)

---

**Next Steps**:
1. Create a ChatGPT Project with OWASP + Maintainability prompt packs uploaded
2. Practice with the [A03 Injection example](/examples/owasp/A03_injection/)
3. Use Canvas mode for iterative security + maintainability hardening
4. Build hybrid prompts (security + maintainability) in `/prompts/team/`
5. Track metrics: security scan pass rate, complexity adherence, time to implementation
