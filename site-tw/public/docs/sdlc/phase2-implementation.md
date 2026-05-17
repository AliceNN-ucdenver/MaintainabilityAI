<div class="docs-hero docs-hero-amber">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mushroom.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/sdlc/">SDLC</a><span class="sep">/</span><span>Phase 2</span></div>
    <div class="docs-eyebrow">Phase 2 of 6 · Implement <span class="docs-hero-meta">~1 min read</span></div>
    <h1 class="docs-hero-title">Implementation &mdash; agents within the guardrails</h1>
    <p class="docs-hero-copy">Generate secure code with AI agents working from OWASP prompt packs and the architectural contract from Phase 1. This is the 70% layer &mdash; AI moves fast inside boundaries that humans set.</p>
    <span class="docs-hero-flourish">&ldquo;I can&rsquo;t go back to yesterday &mdash; I was a different person then.&rdquo;</span>
  </div>
</div>

## Phase Overview

<figure class="docs-visual">
  <img src="/images/diagrams/phase2-implementation.svg" alt="Implementation phase flow from design artifacts through agent selection, OWASP prompts, code generation, and local tests." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Implementation starts from approved architecture artifacts and loops until local quality gates pass.</figcaption>
</figure>

<div class="docs-grid docs-grid-compact">
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Duration</div>
    <div class="docs-heading">2-6 hours</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Actors</div>
    <div class="docs-heading">Copilot, Claude, ChatGPT</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Outputs</div>
    <div class="docs-copy">Implementation code, unit tests, security controls, docs</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Security Gate</div>
    <div class="docs-copy">ESLint + Jest pass, coverage ≥ 80%</div>
  </div>
</div>

---

## Agent Selection Guide

| Agent | Best For | Example |
|---|---|---|
| **Copilot** | Single-function impl, boilerplate, pattern following | `createShare()` using A01 prompt pack |
| **Claude Code** | Multi-file features, large refactorings, test generation | Refactor entire auth module + add tests |
| **ChatGPT** | Incremental development, learning patterns, iteration | Build feature step-by-step with review |

Use the site guides for [Claude Code](/docs/agents/claude), [GitHub Copilot](/docs/agents/copilot), [Claude Code Action](/docs/agents/claude-code-action), and [Copilot Coding Agent](/docs/agents/copilot-coding-agent). Shared repo-level governance lives in [AGENTS.md](https://github.com/shawnmccarthy/maintainabilityai/blob/main/AGENTS.md), with Claude-specific local instructions in [CLAUDE.md](https://github.com/shawnmccarthy/maintainabilityai/blob/main/CLAUDE.md).

---

## Step 1: Apply OWASP Prompt Packs

From Phase 1 threat model, select the corresponding OWASP prompt packs for your identified threats. Use this RCTRO prompt to generate secure implementation code.

<div class="docs-card docs-card-amber">
<div class="docs-card-kicker">RCTRO Prompt — Secure Code Generation</div>

```
Role: You are a security engineer implementing OWASP [category]:2021.

Context:
- Node 18, TypeScript, Express, PostgreSQL (pg library)
- Feature: [from Phase 1 requirements]
- Architecture: [from Phase 1 design — data model, API endpoints]
- Threats to mitigate: [T1-Tn from Phase 1 threat model]

Task:
Implement the feature following the architecture design from Phase 1.
Apply security controls for each identified threat.

Requirements:
1. **Parameterized Queries**
   - Use pg query with $1, $2 placeholders (never string concatenation)
   - Validation: All queries use parameterized placeholders

2. **Input Validation**
   - Zod schemas with character allowlists
   - Max length enforcement on all string inputs
   - Validation: All user input validated before processing

3. **Authorization Controls**
   - Deny-by-default: verify ownership on every mutation
   - Generic error messages (no schema/data leaks)
   - Validation: Non-owners receive 403 with generic message

4. **Audit Logging**
   - Log all security-relevant operations
   - Redact PII (email → domain only)
   - Validation: Audit trail exists for every mutation

5. **Test Coverage**
   - Unit tests with attack payloads (SQL injection, IDOR)
   - Coverage ≥ 80% overall, 100% on security functions
   - Validation: All attack vectors tested and blocked

Output:
Complete TypeScript implementation with:
- Feature code (parameterized queries, Zod validation)
- Jest test suite (including attack vector tests)
- Security comments referencing threat IDs
```

</div>

<details>
<summary class="docs-details-summary">Example: Generated secure implementation (A03 injection prevention)</summary>

```typescript
import { z } from 'zod';
import { Client } from 'pg';

// Zod validation schema (T4: Injection prevention)
const searchQuerySchema = z.string()
  .trim()
  .max(100, 'Search query too long')
  .regex(/^[a-zA-Z0-9 _\-@]*$/, 'Invalid characters');

/**
 * SECURITY: OWASP A03 - Injection Prevention
 * Threat: T4 - SQL injection via search parameter
 * Controls: Parameterized query, Zod validation, generic errors
 */
export async function searchUsers(query: string, userId: string) {
  const validated = searchQuerySchema.parse(query);

  const sql = 'SELECT id, email, name FROM users WHERE email ILIKE $1 LIMIT 50';
  const res = await client.query(sql, [`%${validated}%`]);
  return res.rows;
}
```

</details>

---

## Step 2: Incremental Development

Build features incrementally — validate at each step before proceeding.

<figure class="docs-visual">
  <img src="/images/diagrams/phase2-incremental-implementation.svg" alt="Incremental implementation loop between developer, AI agent, and local tests." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Small tested increments keep AI-assisted implementation understandable and governable.</figcaption>
</figure>

<div class="docs-card docs-card-amber">
<div class="docs-card-kicker">RCTRO Prompt — Attack Vector Tests</div>

```
Role: You are a security test engineer writing OWASP attack vector tests.

Context:
- Feature: [feature name]
- OWASP Categories: [A01, A03, etc. from Phase 1]
- Implementation: [paste code from Step 1]
- Threats: [T1-Tn from Phase 1 threat model]

Task:
Generate comprehensive Jest test suite covering all identified
threats with actual attack payloads.

Requirements:
1. **Access Control Tests (A01)**
   - Unauthorized user attempts blocked
   - IDOR attacks return generic errors
   - Privilege escalation prevented
   - Validation: Each threat ID has at least one test

2. **Injection Tests (A03)**
   - SQL injection payloads: ' OR '1'='1, ; DROP TABLE, UNION SELECT
   - Command injection payloads: ; cat /etc/passwd, && rm -rf
   - All payloads return 400 with generic message
   - Validation: ≥5 injection payloads tested

3. **Logging Tests (A09)**
   - Security events logged on blocked attacks
   - PII redacted in log entries
   - Audit trail exists for all mutations
   - Validation: Every security event verified in logs

Output:
Jest test file with describe blocks per OWASP category,
attack payloads as test data, assertion on generic error messages.
```

</div>

<details>
<summary class="docs-details-summary">Example: Attack vector test suite</summary>

```typescript
describe('Document Sharing - Attack Vector Tests', () => {
  describe('[A01] Access Control', () => {
    it('should block IDOR attack (T6)', async () => {
      const response = await request(app)
        .post('/api/documents/doc-victim-123/shares')
        .set('Authorization', `Bearer ${attackerToken}`)
        .send({ email: 'accomplice@evil.com', permission: 'admin' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
      expect(response.body.error).not.toContain('not owner');
    });
  });

  describe('[A03] Injection', () => {
    const payloads = [
      "'; DROP TABLE users--",
      "' OR '1'='1",
      "' UNION SELECT * FROM users--",
    ];

    payloads.forEach(payload => {
      it(`should block: ${payload}`, async () => {
        const response = await request(app)
          .post('/api/documents/doc-123/shares')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ email: payload, permission: 'read' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid input');
      });
    });
  });

  describe('[A09] Audit Logging', () => {
    it('should log share creation (T5)', async () => {
      const response = await request(app)
        .post('/api/documents/doc-123/shares')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'user@example.com', permission: 'read' });

      const auditLog = await db.query(
        'SELECT * FROM share_audit_log WHERE share_id = $1',
        [response.body.id]
      );
      expect(auditLog.rows[0].action).toBe('created');
    });
  });
});
```

</details>

---

## Step 3: Local Quality Gates

Before committing, run all local checks:

```bash
npm run lint        # ESLint: 0 errors, complexity ≤ 10
npm test           # Jest: all pass, coverage ≥ 80%
npm audit          # 0 high/critical vulnerabilities
```

---

## Step 4: Commit with AI Disclosure

```bash
git commit -m "feat(shares): Implement secure document sharing

Security Controls: [A01] auth checks, [A03] parameterized queries, [A09] audit logging
Threats Mitigated: T3, T4, T5, T6, T7, T9
Tests: 95% coverage, all attack vectors tested

🤖 AI-assisted with [Agent] using OWASP A01/A03/A09 prompt packs"
```

---

## Phase Handoff → Phase 3

<div class="docs-card docs-card-amber">
<div class="docs-flex-block">
  <span class="docs-copy">2&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">→</span>
  <span class="docs-copy">3&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">Implementation → Verification</span>
</div>
<div>
  <div class="docs-card-kicker">Handoff Checklist</div>
  <div class="docs-copy">
    <div>✅ Implementation files: [list implementation + test files]</div>
    <div>✅ OWASP categories implemented: [A01, A03, etc.]</div>
    <div>✅ Threats mitigated: [T1-Tn with status]</div>
    <div>✅ ESLint: Pass — Jest: [X] tests, [Y]% coverage — npm audit: 0 high/critical</div>
  </div>
</div>
</div>

---

<div class="docs-flex-block">
  <a href="/docs/sdlc/phase1-design" class="markdown-link">← Phase 1: Design</a>
  <a href="/docs/sdlc/phase3-verification" class="docs-button-primary">Phase 3: Verification →</a>
</div>
