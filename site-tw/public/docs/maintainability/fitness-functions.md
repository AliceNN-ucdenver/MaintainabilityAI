<div class="docs-hero docs-hero-emerald">
  <div class="docs-hero-glyph"><img src="/images/glyphs/hourglass.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/maintainability/">Maintainability</a><span class="sep">/</span><span>Fitness functions</span></div>
    <div class="docs-eyebrow">Maintainability · automated quality gates <span class="docs-hero-meta">~3 min read</span></div>
    <h1 class="docs-hero-title">Architectural fitness functions</h1>
    <p class="docs-hero-copy">An objective function that measures how close an architecture is to a desired characteristic. Automated, repeatable, and run continuously in CI &mdash; so drift is detected before it becomes debt.</p>
    <span class="docs-hero-flourish">&ldquo;If you don&rsquo;t know where you&rsquo;re going, any architecture will get you there.&rdquo;</span>
  </div>
</div>

---

## Quick Reference

<div class="docs-card docs-card-emerald">

| Fitness Function | Metric | Threshold | Tool | Enforcement |
|------------------|--------|-----------|------|-------------|
| **Complexity** | Cyclomatic complexity | ≤10 per function | ESLint | Pre-commit + CI |
| **Dependency Freshness** | Package age | <3 months | npm outdated + Snyk | Weekly scan |
| **Security Compliance** | CVE count | 0 high/critical | CodeQL + Snyk | CI (blocking) |
| **Test Coverage** | Line coverage | ≥80% overall, 100% security | Jest | CI (blocking) |
| **Performance** | Response time (p95) | <200ms | Custom tests | CI (warning) |

</div>

---

## 1. Code Complexity

Cyclomatic complexity measures the number of independent paths through a function. High complexity correlates with bugs, security vulnerabilities, and maintenance burden. The threshold of 10 per function forces extraction of sub-routines, which improves testability and readability.

ESLint enforces this at the linting stage. CodeQL custom queries catch functions that slip through. Both run in CI as blocking gates.

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">ESLint Complexity Rules</span><br/>
<span class="docs-copy">Configure max complexity, function length, nesting depth, and parameter count</span>
</summary>
<div>

```javascript
// .eslintrc.cjs
module.exports = {
  rules: {
    'complexity': ['error', { max: 10 }],
    'max-lines-per-function': ['error', { max: 50 }],
    'max-lines': ['error', { max: 300 }],
    'max-depth': ['error', 4],
    'max-params': ['error', 4]
  }
};
```

</div>
</details>

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">CodeQL Custom Query</span><br/>
<span class="docs-copy">Flag functions exceeding the complexity threshold during SAST analysis</span>
</summary>
<div>

```ql
// .github/codeql/high-complexity-functions.ql
import javascript

from Function f
where f.getCyclomaticComplexity() > 10
select f, "Function has complexity " + f.getCyclomaticComplexity() + " (max: 10)"
```

</div>
</details>

---

## 2. Dependency Freshness

All dependencies must be upgraded within 3 months of release. This ensures security patches arrive promptly, prevents accumulation of breaking changes across major versions, and maintains compatibility with the broader ecosystem.

The fitness function parses the output of npm outdated, compares each installed version's publish date against a 3-month window, and fails the build if any package falls outside it.

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">Dependency Freshness Script</span><br/>
<span class="docs-copy">Automated check that flags packages older than 3 months</span>
</summary>
<div>

```javascript
// scripts/dependency-freshness.js
const { execSync } = require('child_process');

function checkDependencyFreshness() {
  const outdated = JSON.parse(
    execSync('npm outdated --json', { encoding: 'utf-8' }) || '{}'
  );

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const stalePackages = [];

  for (const [pkg, info] of Object.entries(outdated)) {
    const currentDate = new Date(info.time?.[info.current]);

    if (currentDate < threeMonthsAgo) {
      stalePackages.push({
        package: pkg,
        current: info.current,
        latest: info.latest,
        age: Math.floor((Date.now() - currentDate) / (1000 * 60 * 60 * 24)) + ' days'
      });
    }
  }

  if (stalePackages.length > 0) {
    console.error('Stale dependencies (>3 months):');
    console.table(stalePackages);
    return false;
  }

  console.log('All dependencies are fresh (<3 months)');
  return true;
}
```

</div>
</details>

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">Upgrade All The Things Kata</span><br/>
<span class="docs-copy">A weekly ritual for keeping dependencies current across patch, minor, and major versions</span>
</summary>
<div>

```markdown
Weekly Upgrade Workflow:

Monday:
- Run: npm outdated
- Identify packages >3 months old
- Check for CVEs (Snyk)

Tuesday:
- Upgrade patch versions (e.g., 1.2.3 -> 1.2.4)
- Run: npm update --depth 0
- Test: npm test

Wednesday:
- Upgrade minor versions (e.g., 1.2.0 -> 1.3.0)
- Review changelogs for breaking changes
- Test: npm test

Thursday:
- Flag major versions for human review (e.g., 1.x -> 2.x)
- Create upgrade plan
- Test in staging

Friday:
- Deploy upgrades to production
- Monitor for errors
- Rollback if needed
```

</div>
</details>

---

## 3. Security Compliance

The security fitness function aggregates findings from CodeQL (SAST) and Snyk (SCA) and enforces a zero-tolerance policy for high and critical severity issues. Any finding at those severity levels blocks the pipeline.

Lower-severity findings are tracked but do not block. Acceptable risks can be suppressed with documented justification and an expiration date in the Snyk policy file.

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">Security Compliance Function</span><br/>
<span class="docs-copy">Combines CodeQL and Snyk results and enforces zero high/critical findings</span>
</summary>
<div>

```typescript
// scripts/security-fitness.ts

interface SecurityFindings {
  codeql: { high: number; critical: number };
  snyk: { high: number; critical: number };
}

function checkSecurityCompliance(findings: SecurityFindings): boolean {
  const { codeql, snyk } = findings;

  const totalCritical = codeql.critical + snyk.critical;
  const totalHigh = codeql.high + snyk.high;

  if (totalCritical > 0) {
    console.error(`Security: ${totalCritical} critical findings`);
    return false;
  }

  if (totalHigh > 0) {
    console.error(`Security: ${totalHigh} high findings`);
    return false;
  }

  console.log('Security: 0 high/critical findings');
  return true;
}
```

</div>
</details>

---

## 4. Test Coverage

Jest enforces coverage thresholds at two levels: 80% globally and 100% for security-critical modules (auth, crypto). The global threshold catches regressions across the codebase. The per-directory overrides ensure that code handling authentication, encryption, and access control is fully exercised by tests.

Coverage reports upload to CI artifacts for trend analysis across builds.

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">Jest Coverage Configuration</span><br/>
<span class="docs-copy">Global 80% threshold with 100% override for security-critical paths</span>
</summary>
<div>

```typescript
// jest.config.ts
export default {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Security-critical code requires 100% coverage
    './src/auth/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/crypto/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
```

</div>
</details>

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">CI Coverage Reporting</span><br/>
<span class="docs-copy">Generate coverage in CI and upload to Codecov for trend tracking</span>
</summary>
<div>

```yaml
- name: Test Coverage
  run: |
    npm test -- --coverage
    npx istanbul-badges-readme

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

</div>
</details>

---

## 5. Performance

Performance fitness functions measure p95 response times and detect query scaling problems (N+1). The 200ms threshold for p95 applies to all user-facing operations. N+1 detection verifies that query count remains constant regardless of result set size.

These run as Jest test suites alongside functional tests and report as CI warnings rather than blocking gates, since performance can vary across CI runner hardware.

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">Performance Test Suite</span><br/>
<span class="docs-copy">p95 latency check and N+1 query detection as Jest tests</span>
</summary>
<div>

```typescript
// __tests__/performance.test.ts

describe('Performance Fitness Functions', () => {
  it('should complete share creation in <200ms (p95)', async () => {
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await createShare('doc-123', 'user-456', { ... });
      const end = performance.now();
      times.push(end - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(iterations * 0.95)];

    expect(p95).toBeLessThan(200);
  });

  it('should have no N+1 query problems', async () => {
    const queryCounts: number[] = [];

    // Measure queries for 1, 10, 100 shares
    for (const count of [1, 10, 100]) {
      const queryCount = await measureQueries(() => listShares(count));
      queryCounts.push(queryCount);
    }

    // Query count should be O(1), not O(n)
    expect(queryCounts[0]).toBe(queryCounts[1]);
    expect(queryCounts[1]).toBe(queryCounts[2]);
  });
});
```

</div>
</details>

---

## Implementing with CodeQL and Snyk

CodeQL custom queries extend the security fitness function beyond built-in rules. Write queries targeting project-specific patterns -- SQL injection via string concatenation, hardcoded secrets matching known formats -- and add them to the repository alongside the workflow.

The Snyk policy file documents accepted risks with expiration dates, keeping the suppression list auditable and time-bounded.

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">CodeQL Custom Queries for OWASP</span><br/>
<span class="docs-copy">Detect SQL injection via concatenation (A03) and hardcoded secrets (A02, A05)</span>
</summary>
<div>

```ql
// .github/codeql/sql-injection.ql (A03)
import javascript

from StringConcatenation concat, SqlQuery query
where concat.flowsTo(query)
select query, "Potential SQL injection via string concatenation"
```

```ql
// .github/codeql/hardcoded-secrets.ql (A02, A05)
import javascript

from StringLiteral s
where s.getValue().regexpMatch("(?i)(password|secret|api[_-]?key)\\s*=\\s*['\"][^'\"]{8,}['\"]")
select s, "Potential hardcoded secret detected"
```

</div>
</details>

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">Snyk Policy File</span><br/>
<span class="docs-copy">Document accepted risks with expiration dates for auditable suppression</span>
</summary>
<div>

```yaml
# .snyk
version: v1.19.0

ignore:
  # Example: Acceptable risk (dev dependency only)
  SNYK-JS-LODASH-567890:
    - '*':
        reason: Dev dependency, not in production bundle
        expires: 2025-12-31

patch: {}
```

</div>
</details>

---

## Fitness Function Dashboard

<div class="docs-grid">

<div class="docs-card docs-card-blue">
  <div class="docs-card-kicker">Complexity</div>
  <div class="docs-icon">8.2</div>
  <div class="docs-muted">avg cyclomatic</div>
  <div class="docs-flex-block">
    <span class="docs-copy">Goal: ≤10</span>
    <span class="docs-copy">PASS</span>
  </div>
</div>

<div class="docs-card docs-card-emerald">
  <div class="docs-card-kicker">Dependency Freshness</div>
  <div class="docs-icon">1.8 mo</div>
  <div class="docs-muted">avg package age</div>
  <div class="docs-flex-block">
    <span class="docs-copy">Goal: <3 months</span>
    <span class="docs-copy">PASS</span>
  </div>
</div>

<div class="docs-card docs-card-rose">
  <div class="docs-card-kicker">Security Compliance</div>
  <div class="docs-icon">0</div>
  <div class="docs-muted">high/critical findings</div>
  <div class="docs-flex-block">
    <span class="docs-copy">Goal: 0</span>
    <span class="docs-copy">PASS</span>
  </div>
</div>

<div class="docs-card docs-card-indigo">
  <div class="docs-card-kicker">Test Coverage</div>
  <div class="docs-icon">87%</div>
  <div class="docs-muted">line coverage</div>
  <div class="docs-flex-block">
    <span class="docs-copy">Goal: ≥80%</span>
    <span class="docs-copy">PASS</span>
  </div>
</div>

<div class="docs-card docs-card-amber">
  <div class="docs-card-kicker">Performance</div>
  <div class="docs-icon">145ms</div>
  <div class="docs-muted">p95 response time</div>
  <div class="docs-flex-block">
    <span class="docs-copy">Goal: <200ms</span>
    <span class="docs-copy">PASS</span>
  </div>
</div>

</div>

---

## Resources

<div class="docs-card docs-card-emerald">
  <div class="docs-heading">Further Reading</div>
  <div class="docs-copy">
    <a href="/docs/maintainability/evolutionary-architecture" class="markdown-link">Evolutionary Architecture</a> -- Incremental change patterns (Strangler Fig, Feature Flags, Branch by Abstraction) and refactoring with AI assistance.<br/>
    <a href="/docs/sdlc/phase3-verification" class="markdown-link">SDLC Phase 3: Verification</a> -- The 4 verification gates (Local Tests, CodeQL, Snyk, Fitness Functions) and CI configuration.<br/>
    <a href="https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/" class="markdown-link">Building Evolutionary Architectures</a> (O'Reilly) -- The definitive reference on fitness functions, incremental change, and guided architecture evolution by Neal Ford, Rebecca Parsons, and Patrick Kua.
  </div>
</div>

---

**Key principle**: Fitness functions transform architectural goals from aspirational documentation into enforceable, automated gates. If a property matters enough to write down, it matters enough to test on every commit.
