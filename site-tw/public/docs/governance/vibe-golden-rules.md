# The Golden Rules of Vibe Coding

> **Source**: Synthesized from the work of Addy Osmani and collective experience of early adopters, as documented in Mani, A. (2025). *Beyond Vibe Coding: From Coder to AI-Era Developer*. O'Reilly Media.

> **Core Principle**: AI accelerates development, but human judgment ensures security and quality.

---

## The 6 Golden Rules

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; margin: 32px 0; border: 2px solid #4f46e5;">

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; color: #f1f5f9;">

<div style="background: rgba(99, 102, 241, 0.2); border-left: 4px solid #6366f1; padding: 20px; border-radius: 8px;">
  <div style="font-size: 28px; margin-bottom: 8px;">1</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #c7d2fe;">Be Specific and Clear</div>
  <div style="font-size: 14px; line-height: 1.6;">Clear prompts using RCTRO (Role, Context, Task, Requirements, Output) yield secure, correct code.</div>
</div>

<div style="background: rgba(239, 68, 68, 0.2); border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px;">
  <div style="font-size: 28px; margin-bottom: 8px;">2</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #fca5a5;">Trust but Verify</div>
  <div style="font-size: 14px; line-height: 1.6;">Never merge code you can't explain. Test with malicious inputs, review security controls, run scanners.</div>
</div>

<div style="background: rgba(16, 185, 129, 0.2); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px;">
  <div style="font-size: 28px; margin-bottom: 8px;">3</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #6ee7b7;">Treat AI as a Junior Dev</div>
  <div style="font-size: 14px; line-height: 1.6;">Fast and knowledgeable, but needs supervision, clear direction, and the same peer review as human code.</div>
</div>

<div style="background: rgba(139, 92, 246, 0.2); border-left: 4px solid #8b5cf6; padding: 20px; border-radius: 8px;">
  <div style="font-size: 28px; margin-bottom: 8px;">4</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #c4b5fd;">Isolate AI Changes</div>
  <div style="font-size: 14px; line-height: 1.6;">Separate commits labeled with a robot emoji enable audits, rollbacks, and quality tracking.</div>
</div>

<div style="background: rgba(244, 63, 94, 0.2); border-left: 4px solid #f43f5e; padding: 20px; border-radius: 8px;">
  <div style="font-size: 28px; margin-bottom: 8px;">5</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #fda4af;">Document Rationale</div>
  <div style="font-size: 14px; line-height: 1.6;">AI can't explain "why" — you must document decisions, tradeoffs, and context.</div>
</div>

<div style="background: rgba(234, 179, 8, 0.2); border-left: 4px solid #eab308; padding: 20px; border-radius: 8px;">
  <div style="font-size: 28px; margin-bottom: 8px;">6</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #fde047;">Share Effective Prompts</div>
  <div style="font-size: 14px; line-height: 1.6;">Build a team prompt library. Codify best practices, ensure consistency across projects.</div>
</div>

</div>

<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.2); color: #cbd5e1; font-size: 14px; text-align: center;">
  These rules ensure speed and creativity are balanced with discipline, quality, and accountability.
</div>

</div>

---

## Detailed Rule Explanations

---

### Rule 1: Be Specific and Clear About What You Want

All effective human-AI collaboration begins with a clear expression of intent. The quality of the AI's output is a direct reflection of the quality of the prompt. Vague instructions lead to ambiguous and often incorrect code.

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #6366f1;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #c7d2fe;">Bad Prompt vs Good Prompt</span><br/>
<span style="font-size: 13px; color: #94a3b8;">See the difference between vague and RCTRO-structured prompts</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

**Bad prompt:**
```
Create a login function
```

**Good prompt (RCTRO):**
```
Role: You are a security engineer implementing authentication.

Context:
- Node 18 + TypeScript + Express
- PostgreSQL for user storage
- Must comply with OWASP A07 (Authentication Failures)

Requirements:
- Use bcrypt for password hashing (cost factor 12)
- Implement rate limiting (5 attempts per 15 minutes)
- Constant-time comparison to prevent timing attacks
- Secure session management with httpOnly cookies
- Return generic error messages (no username enumeration)

Task:
1) Implement login(username: string, password: string) function
2) Hash password check with bcrypt.compare()
3) Add rate limiting with express-rate-limit
4) Set secure session cookie with 1-hour expiration
5) Log failed attempts for monitoring
```

**Why the good prompt works:**
- **Role** sets security mindset
- **Context** defines tech stack and constraints
- **Requirements** list specific security controls
- **Task** provides step-by-step implementation guidance

</div>
</details>

---

### Rule 2: Trust but Verify

The core principle: never assume AI-generated code is correct. It must be tested, reviewed, and measured against the original requirements. You own every line in your pull request, regardless of its origin.

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #ef4444;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #fca5a5;">Verification Checklist</span><br/>
<span style="font-size: 13px; color: #94a3b8;">What to check before merging any AI-generated code</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Before Merging</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
    ✓ I understand what every line does<br/>
    ✓ I can explain why this approach was chosen<br/>
    ✓ I've tested with both valid and malicious inputs<br/>
    ✓ Security controls match the OWASP category requirements<br/>
    ✓ Error messages don't leak sensitive information<br/>
    ✓ Logging doesn't expose secrets or PII<br/>
    ✓ Dependencies are from trusted sources<br/>
    ✓ Tests cover positive and negative cases<br/>
    ✓ CodeQL and Snyk scans are clean<br/>
    ✓ I can debug this code if it fails in production
  </div>
</div>

</div>
</details>

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #f97316;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #fdba74;">Red Flags to Watch For</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Common AI mistakes that humans must catch</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

**Hard-coded secrets:**
```typescript
// AI might generate this
const apiKey = "sk-1234567890abcdef";

// Human must catch and fix
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('API_KEY not configured');
```

**Insecure defaults:**
```typescript
// AI might default to permissive
app.use(cors({ origin: '*' }));

// Human enforces allowlist
app.use(cors({
  origin: ['https://app.example.com'],
  credentials: true
}));
```

**Missing input validation:**
```typescript
// AI might skip validation
async function getUser(id: string) {
  return await db.query(`SELECT * FROM users WHERE id = ${id}`);
}

// Human adds validation + parameterization
const userIdSchema = z.string().uuid();
async function getUser(id: string) {
  const validId = userIdSchema.parse(id);
  return await db.query('SELECT * FROM users WHERE id = $1', [validId]);
}
```

</div>
</details>

---

### Rule 3: Treat AI as a Junior Developer

This is the most effective mental model for working with current AI assistants. They are knowledgeable, fast, and eager, but they lack context, experience, and critical judgment. They require clear direction, constant oversight, and the same peer review process as human-written code. No rubber-stamping.

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #6ee7b7;">What AI Does Well vs Poorly</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Junior dev tasks vs senior tasks that require human judgment</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 16px;">

<div style="background: rgba(16, 185, 129, 0.15); border-left: 4px solid #10b981; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #6ee7b7; margin-bottom: 8px;">AI Does Well (Junior Tasks)</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
    ✓ Boilerplate code generation<br/>
    ✓ Implementing known patterns from prompts<br/>
    ✓ Unit test scaffolding<br/>
    ✓ Documentation from code<br/>
    ✓ Refactoring with clear instructions
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">AI Does Poorly (Senior Tasks)</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
    ✗ Threat modeling and security architecture<br/>
    ✗ Complex business logic edge cases<br/>
    ✗ Performance optimization decisions<br/>
    ✗ Cross-system integration design<br/>
    ✗ Balancing security vs usability tradeoffs
  </div>
</div>

</div>

</div>
</details>

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #6ee7b7;">Pair Programming with AI</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Iterative feedback loop: direct, review, refine</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

**You (Senior)**: "We need to prevent IDOR attacks on the /api/documents/:id endpoint."

**AI (Junior)**: *Generates authorization middleware*

**You (Senior)**: "Good start, but you're not logging authorization failures. Also, the error message leaks whether the document exists. Fix both."

**AI (Junior)**: *Refactors with logging and generic errors*

**You (Senior)**: "Better. Now add tests for unauthorized access attempts."

**AI (Junior)**: *Adds test cases*

**You (Senior)**: *Reviews, tests, approves*

</div>
</details>

---

### Rule 4: Isolate AI Changes in Git

When using AI to generate significant chunks of code, commit those changes separately. This practice makes code reviews more manageable, simplifies rollbacks if an issue is discovered, and improves the overall traceability of the codebase.

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #8b5cf6;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #c4b5fd;">Commit Message Pattern & PR Template</span><br/>
<span style="font-size: 13px; color: #94a3b8;">How to label AI-assisted changes for auditability</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

**Commit message pattern:**
```bash
git commit -m "feat(auth): Add rate limiting to login endpoint

- Implement express-rate-limit (5 attempts per 15 min)
- Add Redis store for distributed rate limiting
- Return 429 status on rate limit exceeded
- Log rate limit violations for monitoring

AI-assisted with Claude Code using OWASP A07 prompt pack
Refs: #123"
```

**PR template (AI disclosure section):**

```markdown
## AI Assistance Disclosure

- [ ] This PR includes AI-generated code
- **AI Tool Used**: Claude Code / GitHub Copilot
- **Prompt Pack Used**: prompts/owasp/A07_authn_failures.md
- **Human Review**: Code reviewed line-by-line, tested with attack vectors
- **Security Verification**: CodeQL and Snyk scans passed

## Changes Made After AI Generation

- Added edge case handling for concurrent login attempts
- Strengthened error messages to prevent username enumeration
- Added integration tests with real Redis instance
```

**Why this matters:**

1. **Auditability** — Track which code came from AI for security audits
2. **Learning** — Analyze AI-generated code quality over time
3. **Accountability** — Clear ownership and review trail
4. **Incident Response** — Quickly identify AI-generated code if a vulnerability is found

</div>
</details>

---

### Rule 5: Document Rationale

AI can generate code, but it cannot explain the "why" behind a business decision or architectural trade-off. It is the developer's responsibility to document this crucial context.

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #f43f5e;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #fda4af;">Bad Documentation vs Good Documentation</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Document decisions, not descriptions of what code does</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

**Bad — describes "what":**
```typescript
// Hash the password
const hash = await bcrypt.hash(password, 12);
```

**Good — explains "why":**
```typescript
/**
 * Hash password using bcrypt with cost factor 12.
 *
 * Why bcrypt?
 * - Adaptive: cost factor can increase as hardware improves
 * - Built-in salt prevents rainbow table attacks
 * - Constant-time comparison prevents timing attacks
 *
 * Why cost factor 12?
 * - OWASP recommendation (2023): minimum 10, prefer 12+
 * - ~250ms on modern hardware (acceptable UX, strong security)
 *
 * Security: OWASP A02:2021 Cryptographic Failures
 */
const hash = await bcrypt.hash(password, 12);
```

</div>
</details>

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #f43f5e;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #fda4af;">Security Decision Record Template</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Structured format for documenting security architecture decisions</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```typescript
/**
 * SECURITY DECISION: Rate limiting strategy
 *
 * Problem: Brute force attacks on login endpoint
 *
 * Considered Options:
 * 1. IP-based rate limiting (5 req/15min)
 *    - Pro: Simple to implement
 *    - Con: Shared IPs (corporate NAT) hit limit for all users
 *
 * 2. Account-based rate limiting (5 failed attempts/15min)
 *    - Pro: Doesn't affect legitimate users on same IP
 *    - Con: Requires tracking per-account state
 *
 * 3. Hybrid: IP-based (100 req/15min) + Account-based (5 fail/15min)
 *    - Pro: Best of both worlds
 *    - Con: More complex
 *
 * DECISION: Option 3 (Hybrid)
 * Rationale: Balances security with UX for shared IP environments
 * Risk: Increased Redis memory usage (acceptable tradeoff)
 *
 * Reference: OWASP A07:2021 Authentication Failures
 */
```

</div>
</details>

---

### Rule 6: Share and Reuse Effective Prompts

Well-crafted prompts are valuable intellectual assets. Teams should create a shared repository of effective prompt patterns and templates for common tasks. This ensures consistency, codifies best practices, and accelerates the entire team's ability to work effectively with AI.

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #eab308;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #fde047;">Prompt Library Structure</span><br/>
<span style="font-size: 13px; color: #94a3b8;">How to organize reusable prompts across your team</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

**Recommended directory layout:**
```
/prompts
  /owasp              # Security-focused prompts (this repo)
  /team
    /backend
      - api-endpoint.md
      - database-migration.md
    /frontend
      - react-component.md
      - form-validation.md
    /testing
      - integration-test.md
      - e2e-test.md
```

**Each prompt should include:**
- **Category**: Backend / Frontend / Testing / Security
- **AI Tools**: Claude Code, Copilot
- **When to Use**: Scenario description
- **Prerequisites**: Tech stack and context needed
- **The Prompt**: Full copy-paste ready RCTRO prompt
- **Example Output**: What good AI output looks like
- **Common Pitfalls**: What to watch for in AI responses
- **Version History**: Track iterations and improvements

</div>
</details>

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #eab308;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #fde047;">Prompt Iteration Log</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Track improvements to prompts over time</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
## Version History

v3 (2025-10-10): Added Zod validation requirement
- Problem: AI was skipping input validation
- Fix: Explicit "use Zod schema" instruction
- Result: Validation now included 100% of time

v2 (2025-09-15): Added error handling checklist
- Problem: Generic errors not being used
- Fix: Added checklist item for generic errors
- Result: Security improved, fewer schema leaks

v1 (2025-08-01): Initial version
```

</div>
</details>

---

## Measuring Success

Track these metrics to ensure the Golden Rules are working:

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6;">
  <div style="font-size: 15px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Leading Indicators (Process)</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
    ✓ Prompt Quality Score — team rates prompts 1-5 after use<br/>
    ✓ AI Code Acceptance Rate — % of AI suggestions merged without changes<br/>
    ✓ Review Cycle Time — time from AI generation to merge<br/>
    ✓ Prompt Reuse Rate — % of work using team prompt library
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #10b981;">
  <div style="font-size: 15px; font-weight: 700; color: #6ee7b7; margin-bottom: 12px;">Lagging Indicators (Outcomes)</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
    ✓ Security Findings in AI Code — CodeQL/Snyk issues per 1000 LOC<br/>
    ✓ Post-Merge Defects — bugs found in AI-generated code after merge<br/>
    ✓ Velocity — story points delivered (with quality maintained)<br/>
    ✓ Team Confidence — survey: "I trust AI-generated code" (1-5)
  </div>
</div>

</div>

---

## Enforcement in Practice

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #8b5cf6;">
  <div style="font-size: 15px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">During Development</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
    ✓ Pre-commit hook checks for AI-assisted label in commit messages<br/>
    ✓ PR template requires AI disclosure section (enforced by CI)<br/>
    ✓ Code review checklist includes Golden Rules verification
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #f43f5e;">
  <div style="font-size: 15px; font-weight: 700; color: #fda4af; margin-bottom: 12px;">During Review</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
    ✓ <strong style="color: #94a3b8;">Automated:</strong> CodeQL, Snyk, ESLint catch technical issues<br/>
    ✓ <strong style="color: #94a3b8;">Human:</strong> Reviewer validates Golden Rules compliance:<br/>
    &nbsp;&nbsp;&nbsp;1. Is the prompt specific? (Rule 1)<br/>
    &nbsp;&nbsp;&nbsp;2. Was output validated against intent? (Rule 2)<br/>
    &nbsp;&nbsp;&nbsp;3. Was AI treated as junior dev with oversight? (Rule 3)<br/>
    &nbsp;&nbsp;&nbsp;4. Are AI changes clearly labeled? (Rule 4)<br/>
    &nbsp;&nbsp;&nbsp;5. Is the "why" documented? (Rule 5)<br/>
    &nbsp;&nbsp;&nbsp;6. Should this prompt be shared? (Rule 6)
  </div>
</div>

</div>

---

## Full Workflow Example

**Scenario**: Implement A03 Injection Prevention

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

<div style="margin-bottom: 24px;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
    <span style="background: rgba(99, 102, 241, 0.2); color: #c7d2fe; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Rule 1</span>
    <span style="font-size: 15px; font-weight: 700; color: #f1f5f9;">Use Specific Prompt</span>
  </div>
  <div style="color: #94a3b8; font-size: 14px;">Use the A03 prompt pack from prompts/owasp/A03_injection.md</div>
</div>

<div style="margin-bottom: 24px;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
    <span style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Rule 2</span>
    <span style="font-size: 15px; font-weight: 700; color: #f1f5f9;">Review AI Output</span>
  </div>
  <div style="color: #94a3b8; font-size: 14px;">
    ✓ Parameterized queries used<br/>
    ✓ Zod validation present<br/>
    ✗ Error message leaks table name — fix manually
  </div>
</div>

<div style="margin-bottom: 24px;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
    <span style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Rule 3</span>
    <span style="font-size: 15px; font-weight: 700; color: #f1f5f9;">Mentor the AI</span>
  </div>
  <div style="color: #94a3b8; font-size: 14px;">"Good start, but change error from 'users table query failed' to 'search failed'" — AI regenerates with generic error</div>
</div>

<div style="margin-bottom: 24px;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
    <span style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Rule 4</span>
    <span style="font-size: 15px; font-weight: 700; color: #f1f5f9;">Isolated Commit</span>
  </div>
  <div style="color: #94a3b8; font-size: 14px;">Separate commit with AI-assisted label, OWASP A03 prompt pack reference</div>
</div>

<div style="margin-bottom: 24px;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
    <span style="background: rgba(244, 63, 94, 0.2); color: #fda4af; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Rule 5</span>
    <span style="font-size: 15px; font-weight: 700; color: #f1f5f9;">Document Decision</span>
  </div>
  <div style="color: #94a3b8; font-size: 14px;">Add security decision comment explaining why parameterized queries, why Zod, which attack vectors are blocked</div>
</div>

<div>
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
    <span style="background: rgba(234, 179, 8, 0.2); color: #fde047; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Rule 6</span>
    <span style="font-size: 15px; font-weight: 700; color: #f1f5f9;">Share Success</span>
  </div>
  <div style="color: #94a3b8; font-size: 14px;">Prompt worked well — add to team library, log iteration notes, notify team</div>
</div>

</div>

---

## Next Steps

1. Start with the [Framework Overview](/docs/framework) to see how these rules integrate into the full SDLC
2. Use [OWASP Prompt Packs](/docs/prompts/owasp/) to practice Rule 1 (Be Specific)
3. Follow the [Workshop](/docs/workshop/part1-spectrum) for hands-on experience applying all 6 rules
4. Read the [SDLC Guide](/docs/sdlc/) to see governance enforcement across all phases

---

## Resources

- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [OWASP AI Security and Privacy Guide](https://owasp.org/www-project-ai-security-and-privacy-guide/)
- Mani, A. (2025). *Beyond Vibe Coding: From Coder to AI-Era Developer*. O'Reilly Media.
- [Back to Documentation](/docs/)

---

**Key principle**: AI accelerates development, but human judgment ensures security and quality. These 6 rules create a sustainable practice around responsible AI-assisted engineering.
