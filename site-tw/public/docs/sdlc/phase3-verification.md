<div class="docs-hero docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/magnifier.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/sdlc/">SDLC</a><span class="sep">/</span><span>Phase 3</span></div>
    <div class="docs-eyebrow">Phase 3 of 6 · Verify <span class="docs-hero-meta">~1 min read</span></div>
    <h1 class="docs-hero-title">Verification &mdash; four gates, one packet of evidence</h1>
    <p class="docs-hero-copy">Local tests, CodeQL SAST, Snyk dependency analysis, and fitness functions. All four pass before a human is asked to look. The packet of evidence is what they see.</p>
    <span class="docs-hero-flourish">&ldquo;Curiouser and curiouser!&rdquo; &mdash; said the scanner.</span>
  </div>
</div>

## Phase Overview

<figure class="docs-visual">
  <img src="/images/diagrams/phase3-verification.svg" alt="Verification gates covering local tests, CodeQL, Snyk, and fitness functions." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Verification provides automated evidence before work reaches human governance.</figcaption>
</figure>

<div class="docs-grid docs-grid-compact">
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Duration</div>
    <div class="docs-heading">30-60 min</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Actors</div>
    <div class="docs-heading">ESLint, Jest, CodeQL, Snyk</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Mode</div>
    <div class="docs-copy">Automated (CI/CD pipeline)</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Security Gate</div>
    <div class="docs-copy">0 high/critical findings across all scanners</div>
  </div>
</div>

---

## The 4 Verification Gates

<div class="docs-grid">

<div class="docs-card docs-card-blue">
  <div class="docs-heading">Gate 1: Local Tests</div>
  <div class="docs-copy">
    ESLint: 0 errors, complexity ≤ 10<br/>
    Jest: all pass, coverage ≥ 80%<br/>
    npm audit: 0 high/critical
  </div>
  <div class="docs-muted">Run: <code>npm run lint && npm test && npm audit</code></div>
</div>

<div class="docs-card docs-card-rose">
  <div class="docs-heading">Gate 2: CodeQL (SAST)</div>
  <div class="docs-copy">
    SQL injection, XSS, path traversal<br/>
    Hardcoded credentials, weak crypto<br/>
    0 high/critical findings
  </div>
  <div class="docs-muted">Runs in: GitHub Actions CI</div>
</div>

<div class="docs-card docs-card-amber">
  <div class="docs-heading">Gate 3: Snyk (SCA)</div>
  <div class="docs-copy">
    Known CVEs in dependencies (A06)<br/>
    License compliance<br/>
    0 high/critical vulnerabilities
  </div>
  <div class="docs-muted">Runs in: GitHub Actions CI + weekly</div>
</div>

<div class="docs-card docs-card-indigo">
  <div class="docs-heading">Gate 4: Fitness Functions</div>
  <div class="docs-copy">
    Complexity ≤ 10, Coverage ≥ 80%<br/>
    Dependencies < 3 months old<br/>
    All thresholds from Phase 1 met
  </div>
  <div class="docs-muted">Run: <code>node scripts/fitness-functions.js</code></div>
</div>

</div>

---

## CI Configuration

<details>
<summary class="docs-details-summary">CodeQL workflow (.github/workflows/codeql.yml)</summary>

```yaml
name: CodeQL Security Analysis
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript, typescript
          queries: security-extended
      - uses: github/codeql-action/analyze@v3
```

</details>

<details>
<summary class="docs-details-summary">Snyk workflow (.github/workflows/snyk.yml)</summary>

```yaml
name: Snyk Security Scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

</details>

<details>
<summary class="docs-details-summary">Fitness functions script (scripts/fitness-functions.js)</summary>

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

function checkComplexity() {
  try {
    execSync('npm run lint -- --max-warnings=0', { stdio: 'inherit' });
    console.log('✅ Complexity: PASS');
    return true;
  } catch { console.error('❌ Complexity: FAIL'); return false; }
}

function checkCoverage() {
  execSync('npm test -- --coverage --silent');
  const coverage = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json'));
  const { lines, branches, functions } = coverage.total;
  const pass = lines.pct >= 80 && branches.pct >= 80 && functions.pct >= 80;
  console.log(pass ? '✅ Coverage: PASS' : `❌ Coverage: FAIL (${lines.pct}%)`);
  return pass;
}

function checkSecurity() {
  try {
    execSync('npm audit --audit-level=high', { stdio: 'inherit' });
    console.log('✅ Security: PASS');
    return true;
  } catch { console.error('❌ Security: FAIL'); return false; }
}

const results = [checkComplexity(), checkCoverage(), checkSecurity()];
process.exit(results.every(r => r) ? 0 : 1);
```

</details>

---

## Remediation with AI

When a gate fails, use this RCTRO prompt to fix findings.

<div class="docs-card docs-card-rose">
<div class="docs-card-kicker">RCTRO Prompt — Finding Remediation</div>

```
Role: You are a security engineer remediating scanner findings.

Context:
- Scanner: [CodeQL / Snyk / ESLint]
- Finding: [paste finding details — rule ID, severity, location]
- Current code: [paste affected code]
- OWASP Category: [mapped category]

Task:
Fix the identified finding while maintaining existing functionality
and security controls from Phase 1 threat model.

Requirements:
1. **Root Cause**
   - Identify why the scanner flagged this code
   - Validation: Explain the attack vector

2. **Fix Implementation**
   - Apply the minimum change to resolve the finding
   - Maintain all existing security controls
   - Validation: Scanner no longer flags this code

3. **Regression Prevention**
   - Add or update tests to cover the fixed scenario
   - Validation: Test fails if vulnerability reintroduced

Output:
- Fixed code with inline comment explaining the fix
- New or updated test case
- Verification command to confirm fix
```

</div>

<details>
<summary class="docs-details-summary">Example: Complexity refactoring (fitness function failure)</summary>

```typescript
// ❌ Before: complexity 12
export async function createShare(documentId, requesterId, data) {
  const doc = await getDocument(documentId);
  if (!doc) throw new NotFoundError('Not found');
  if (doc.owner_id !== requesterId) throw new UnauthorizedError('Access denied');
  let validated;
  try { validated = shareSchema.parse(data); }
  catch (err) { throw new ValidationError('Invalid input'); }
  const existing = await db.query('SELECT * FROM shares WHERE document_id = $1 AND email = $2', [documentId, validated.email]);
  if (existing.rows.length) throw new ConflictError('Share exists');
  const share = await db.query('INSERT INTO shares (...) VALUES ($1, $2, $3)', [documentId, requesterId, validated.email]);
  await auditLog('share_created', { shareId: share.id, userId: requesterId });
  return share.rows[0];
}

// ✅ After: complexity 4, 3, 2 (extracted functions)
export async function createShare(documentId, requesterId, data) {
  await verifyOwnership(documentId, requesterId);
  const validated = validateShareInput(data);
  const share = await insertShare(documentId, requesterId, validated);
  await auditLog('share_created', { shareId: share.id, userId: requesterId });
  return share;
}
```

</details>

---

## Verification Report Template

Generate this report for Phase 4 handoff:

```markdown
# Verification Report: [Feature Name]

## Gate 1: Local Tests — [PASS/FAIL]
- ESLint: [X] errors, [X] warnings
- Jest: [X] tests, [X]% coverage
- npm audit: [X] vulnerabilities

## Gate 2: CodeQL — [PASS/FAIL]
- Findings: [X] high, [X] critical
- Queries: security-extended

## Gate 3: Snyk — [PASS/FAIL]
- Dependencies: [X] scanned
- Vulnerabilities: [X] high, [X] critical

## Gate 4: Fitness Functions — [PASS/FAIL]
- Complexity: max [X] (threshold 10)
- Coverage: [X]% (threshold 80%)
- Dependencies: all < [X] months (threshold 3)

## Threat Coverage
[T1-Tn]: ✅/❌ verified

## Recommendation: [APPROVED/BLOCKED] for Phase 4
```

<details>
<summary class="docs-details-summary">Example: Document Sharing verification report</summary>

```markdown
# Verification Report: Document Sharing

## Gate 1: Local Tests — PASS
- ESLint: 0 errors, 0 warnings
- Jest: 42 tests, 95% coverage
- npm audit: 0 vulnerabilities

## Gate 2: CodeQL — PASS
- Findings: 0 high, 0 critical
- Queries: security-extended
- Note: Parameterized queries verified, no SQL concatenation found

## Gate 3: Snyk — PASS
- Dependencies: 87 scanned
- Vulnerabilities: 0 high, 0 critical
- License: All MIT/Apache-2.0

## Gate 4: Fitness Functions — PASS
- Complexity: max 4 (threshold 10)
- Coverage: 95% (threshold 80%)
- Dependencies: all < 1 month (threshold 3)

## Threat Coverage
- T1 (JWT forgery): ✅ Token validation tests pass
- T3 (Permission escalation): ✅ Owner-only mutation tests pass
- T4 (SQL injection): ✅ 5 injection payloads blocked
- T5 (No audit trail): ✅ Audit log entries verified
- T6 (IDOR): ✅ Non-sequential UUIDs + auth check
- T7 (Metadata leaks): ✅ Generic error messages verified
- T8 (Share flooding): ✅ Rate limiting at 10/min
- T9 (Re-sharing): ✅ Owner-only sharing enforced

## Recommendation: APPROVED for Phase 4
```

</details>

---

## Phase Handoff → Phase 4

<div class="docs-card docs-card-rose">
<div class="docs-flex-block">
  <span class="docs-copy">3&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">→</span>
  <span class="docs-copy">4&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">Verification → Governance</span>
</div>
<div>
  <div class="docs-card-kicker">Handoff Checklist</div>
  <div class="docs-copy">
    <div>✅ All 4 verification gates passed</div>
    <div>✅ [X]% coverage with attack vector tests</div>
    <div>✅ 0 high/critical findings across all scanners</div>
    <div>✅ All threats from Phase 1 verified</div>
  </div>
  <div class="docs-card-kicker">Artifacts</div>
  <div class="docs-copy">
    <div>Verification report (attached) · Files for review: [list]</div>
  </div>
</div>
</div>

---

<div class="docs-flex-block">
  <a href="/docs/sdlc/phase2-implementation" class="markdown-link">← Phase 2: Implementation</a>
  <a href="/docs/sdlc/phase4-governance" class="docs-button-primary">Phase 4: Governance →</a>
</div>
