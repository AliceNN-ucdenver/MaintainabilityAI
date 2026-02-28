# Architectural Fitness Functions

<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);">
  <div style="text-align: center;">
    <h2 style="margin: 0; font-size: 28px; color: #f1f5f9; font-weight: 800;">Fitness Functions</h2>
    <div style="font-size: 15px; color: #d1fae5; margin-top: 12px;">An architectural fitness function is an objective function used to assess how close an architecture is to achieving a desired architectural characteristic. They are automated, repeatable, and run continuously in CI to prevent drift.</div>
  </div>
</div>

---

## Quick Reference

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981; overflow-x: auto;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">ESLint Complexity Rules</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Configure max complexity, function length, nesting depth, and parameter count</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">CodeQL Custom Query</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Flag functions exceeding the complexity threshold during SAST analysis</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">Dependency Freshness Script</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Automated check that flags packages older than 3 months</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">Upgrade All The Things Kata</span><br/>
<span style="font-size: 13px; color: #94a3b8;">A weekly ritual for keeping dependencies current across patch, minor, and major versions</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">Security Compliance Function</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Combines CodeQL and Snyk results and enforces zero high/critical findings</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">Jest Coverage Configuration</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Global 80% threshold with 100% override for security-critical paths</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">CI Coverage Reporting</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generate coverage in CI and upload to Codecov for trend tracking</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">Performance Test Suite</span><br/>
<span style="font-size: 13px; color: #94a3b8;">p95 latency check and N+1 query detection as Jest tests</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">CodeQL Custom Queries for OWASP</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Detect SQL injection via concatenation (A03) and hardcoded secrets (A02, A05)</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">Snyk Policy File</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Document accepted risks with expiration dates for auditable suppression</span>
</summary>
<div style="padding: 4px 24px 24px 24px;">

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

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 24px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6;">
  <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Complexity</div>
  <div style="font-size: 32px; color: #93c5fd; font-weight: 800;">8.2</div>
  <div style="font-size: 13px; color: #64748b; margin-top: 4px;">avg cyclomatic</div>
  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(100, 116, 139, 0.2);">
    <span style="font-size: 12px; color: #94a3b8;">Goal: ≤10</span>
    <span style="font-size: 12px; color: #86efac; font-weight: 600;">PASS</span>
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #10b981;">
  <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Dependency Freshness</div>
  <div style="font-size: 32px; color: #86efac; font-weight: 800;">1.8 mo</div>
  <div style="font-size: 13px; color: #64748b; margin-top: 4px;">avg package age</div>
  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(100, 116, 139, 0.2);">
    <span style="font-size: 12px; color: #94a3b8;">Goal: <3 months</span>
    <span style="font-size: 12px; color: #86efac; font-weight: 600;">PASS</span>
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #ef4444;">
  <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Security Compliance</div>
  <div style="font-size: 32px; color: #fca5a5; font-weight: 800;">0</div>
  <div style="font-size: 13px; color: #64748b; margin-top: 4px;">high/critical findings</div>
  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(100, 116, 139, 0.2);">
    <span style="font-size: 12px; color: #94a3b8;">Goal: 0</span>
    <span style="font-size: 12px; color: #86efac; font-weight: 600;">PASS</span>
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #a855f7;">
  <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Test Coverage</div>
  <div style="font-size: 32px; color: #d8b4fe; font-weight: 800;">87%</div>
  <div style="font-size: 13px; color: #64748b; margin-top: 4px;">line coverage</div>
  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(100, 116, 139, 0.2);">
    <span style="font-size: 12px; color: #94a3b8;">Goal: ≥80%</span>
    <span style="font-size: 12px; color: #86efac; font-weight: 600;">PASS</span>
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #f59e0b;">
  <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Performance</div>
  <div style="font-size: 32px; color: #fcd34d; font-weight: 800;">145ms</div>
  <div style="font-size: 13px; color: #64748b; margin-top: 4px;">p95 response time</div>
  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(100, 116, 139, 0.2);">
    <span style="font-size: 12px; color: #94a3b8;">Goal: <200ms</span>
    <span style="font-size: 12px; color: #86efac; font-weight: 600;">PASS</span>
  </div>
</div>

</div>

---

## Resources

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #10b981;">
  <div style="font-size: 15px; font-weight: 700; color: #6ee7b7; margin-bottom: 8px;">Further Reading</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
    <a href="/docs/maintainability/evolutionary-architecture" style="color: #86efac; text-decoration: none;">Evolutionary Architecture</a> -- Incremental change patterns (Strangler Fig, Feature Flags, Branch by Abstraction) and refactoring with AI assistance.<br/>
    <a href="/docs/sdlc/phase3-verification" style="color: #86efac; text-decoration: none;">SDLC Phase 3: Verification</a> -- The 4 verification gates (Local Tests, CodeQL, Snyk, Fitness Functions) and CI configuration.<br/>
    <a href="https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/" style="color: #86efac; text-decoration: none;">Building Evolutionary Architectures</a> (O'Reilly) -- The definitive reference on fitness functions, incremental change, and guided architecture evolution by Neal Ford, Rebecca Parsons, and Patrick Kua.
  </div>
</div>

---

**Key principle**: Fitness functions transform architectural goals from aspirational documentation into enforceable, automated gates. If a property matters enough to write down, it matters enough to test on every commit.
