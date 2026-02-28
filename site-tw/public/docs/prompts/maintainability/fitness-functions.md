# Fitness Functions — Maintainability Prompt Pack

> **Fitness Functions** are automated, objective quality gates that continuously validate architectural characteristics. They prevent technical debt by failing builds when code degrades beyond acceptable thresholds.

---

## 🎯 What are Fitness Functions?

**Definition**: Executable tests that measure architectural quality metrics (complexity, coverage, performance) and fail if thresholds are exceeded. Think "unit tests for architecture."

**Common Fitness Function Types**:
- **Complexity**: Cyclomatic complexity per function (threshold: ≤10)
- **Test Coverage**: Line, branch, and statement coverage (threshold: ≥80%)
- **Performance**: p95 latency for critical endpoints (threshold: <200ms)
- **Dependency Freshness**: Age of dependencies (threshold: ≤90 days)
- **Security**: High/critical vulnerabilities (threshold: 0)

**Why They Matter**: Without fitness functions, code quality degrades silently over time (architectural erosion). Manual code reviews can't catch every violation.

---

## 🔗 Maps to OWASP

**Supports**: All OWASP categories by enforcing quality standards
**Primary**: [A06 - Vulnerable Components](/docs/prompts/owasp/A06_vuln_outdated) (dependency freshness)
**Secondary**: [A04 - Insecure Design](/docs/prompts/owasp/A04_insecure_design) (complexity reduces attack surface)

---

## Prompt 1: Identify Where to Apply Fitness Functions

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Analyzes your project to recommend which fitness functions to implement and in what priority order</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are an Evolutionary Architecture engineer analyzing a codebase to determine which fitness functions would provide the most value.

Context:
Analyze the project in the current workspace.

Example:
- Node.js 18 + TypeScript
- 50K+ LOC across 200 files
- Jest test framework
- Express REST API with 30+ endpoints
- PostgreSQL database
- 15 developers contributing
- GitHub Actions CI/CD
- Current issues: high complexity in auth module, inconsistent test coverage, slow dependency updates

Task:
Analyze this project and recommend:

1. Which fitness functions to implement (complexity, coverage, performance, dependencies)
2. Priority order (which will catch the most issues fastest)
3. Baseline thresholds (what limits make sense for THIS codebase, not aspirational goals)
4. Implementation plan (which tools to use, how to integrate with CI)

Format:
For each fitness function, provide:

**Metric**: [What to measure]
**Threshold**: [Acceptable limit based on current state]
**Priority**: [High/Medium/Low]
**Rationale**: [Why this matters for this specific codebase]
**Implementation**: [Which tool/library to use - e.g., ts-complex, autocannon, npm outdated]
**CI Integration**: [How to run in GitHub Actions - be specific]

Focus Areas:
Pay special attention to:
- Hotspot files (high complexity + frequent changes = risk)
- Critical paths (auth, payment, data access)
- Legacy modules (likely candidates for complexity violations)
- Public APIs (need strong test coverage)
- Performance-critical endpoints (user-facing, data-heavy)

Output:
Provide a prioritized list of 3-5 fitness functions with specific thresholds and implementation steps. Start with the fitness function that will catch the most issues with the least effort.
```

</div>
</details>

---

## Prompt 2: Generate Fitness Function Tests

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generates executable Jest test files for complexity, coverage, dependency freshness, and performance fitness functions</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a software engineer implementing fitness functions as automated tests that run in CI/CD pipelines.

Context:
I have a Node.js 18 + TypeScript project using Jest for testing and GitHub Actions for CI/CD.

Target metrics:
- Cyclomatic complexity ≤10 per function
- Test coverage ≥80% (line + branch)
- Dependency age ≤90 days
- Performance p95 <200ms for /api/* endpoints

Task: Generate 4 executable fitness function test files:

1. tests/fitness-functions/complexity.test.ts
   - Use ts-complex library to analyze TypeScript files
   - Check cyclomatic complexity for all functions in src/
   - Fail if any function exceeds 10
   - Report violations with file:line:function name
   - Suggest refactoring strategies in error message

2. tests/fitness-functions/coverage.test.ts
   - Read coverage/coverage-summary.json (generated by Jest)
   - Check line, branch, function, statement coverage
   - Fail if any metric <80%
   - Compare against baseline/coverage-baseline.json
   - Fail if coverage dropped >2% from baseline

3. tests/fitness-functions/dependency-freshness.test.ts
   - Run "npm outdated --json" to find old packages
   - Check publish date of each dependency using "npm view <pkg>@<version> time.modified"
   - Fail if any dependency >90 days old
   - Warn if dependency >60 days old
   - Categorize by severity: critical (security), major (breaking), minor (safe)

4. tests/fitness-functions/performance.test.ts
   - Start test server programmatically
   - Use autocannon to load test GET /api/users and POST /api/orders
   - Measure p95, p99 latency and throughput
   - Compare against baseline/perf-baseline.json
   - Fail if p95 >200ms or regressed >10% from baseline
   - Clean up server process after test

Requirements:
- All tests must be Jest .test.ts files that can run with "npm test"
- Tests must fail with actionable error messages (include file paths, actual vs expected values)
- Thresholds should be configurable via environment variables (MAX_COMPLEXITY, MIN_COVERAGE, MAX_DEP_AGE_DAYS)
- Include helper functions for calculations (don't repeat code)
- Add JSDoc comments explaining what each function does

Also generate:
- .github/workflows/fitness-functions.yml (runs on every PR, uploads artifacts)
- baseline/coverage-baseline.json (example structure with 85% coverage)
- baseline/perf-baseline.json (example structure with p95: 145ms)

Output: Complete, executable TypeScript code for all files. Initially configure CI with continue-on-error: true (warning mode) so we can monitor for 2 weeks before switching to blocking mode.
```

</div>
</details>

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 16px;">After AI generates fitness function tests, review the code carefully before running it:</div>

<div style="display: grid; gap: 12px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">File Structure</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Four test files in fitness-functions directory<br/>
    ✓ GitHub Actions workflow for CI integration<br/>
    ✓ Baseline files for tracking historical metrics<br/>
    ✓ Documentation explaining how to run and update tests<br/>
    <strong style="color: #94a3b8;">Test:</strong> Verify all files exist and are syntactically valid TypeScript
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fdba74; margin-bottom: 8px;">Complexity Analysis</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Uses dedicated tool like ts-complex (not manual AST parsing or regex)<br/>
    ✓ Correctly counts all branching structures (conditionals, loops, case statements, logical operators, exception handlers)<br/>
    ✓ Error messages pinpoint exact location and suggest specific refactoring patterns<br/>
    ✓ Threshold configurable through environment variables<br/>
    <strong style="color: #94a3b8;">Test:</strong> Run locally and verify error messages are actionable
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #93c5fd; margin-bottom: 8px;">Coverage Validation</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Reads Jest's coverage report and validates all four metrics (lines, branches, functions, statements)<br/>
    ✓ Compares current coverage against stored baseline to detect regressions<br/>
    ✓ Error messages show which metric failed, by how much, and remediation steps<br/>
    ✓ Thresholds configurable for starting with realistic values<br/>
    <strong style="color: #94a3b8;">Test:</strong> Generate coverage report first, then run fitness function
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #86efac; margin-bottom: 8px;">Dependency Freshness</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Checks actual publish dates of dependencies (not just version numbers)<br/>
    ✓ Categorizes outdated packages by severity (security vs minor version bumps)<br/>
    ✓ Provides clear upgrade paths<br/>
    ✓ Warns before failing to give teams time to plan upgrades<br/>
    <strong style="color: #94a3b8;">Test:</strong> Run check and verify age calculations are accurate
  </div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #c4b5fd; margin-bottom: 8px;">Security Review</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ No hardcoded secrets<br/>
    ✓ No arbitrary code execution patterns (eval, unsanitized exec calls)<br/>
    ✓ No external network calls that could leak data<br/>
    ✓ File system operations limited to project directory<br/>
    ✓ Tests are self-contained and offline-first<br/>
    <strong style="color: #94a3b8;">Test:</strong> Grep for eval, exec, and external URLs in generated code
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Use Prompt 1** with ChatGPT/Claude to identify which fitness functions your project needs
2. **Use Prompt 2** to generate the test code
3. **Review generated code** using the checklist above
4. **Run tests locally**: npm test tests/fitness-functions
5. **Create baselines**: Run tests once, copy results to baseline/
6. **Start in warning mode**: Monitor for 2 weeks, then switch to blocking

---

## Resources

- **[Dependency Hygiene Prompt Pack](dependency-hygiene)** — Enforce 90-day freshness rule
- **[Technical Debt Management](technical-debt)** — Track and prioritize refactoring work
- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua)
- [Back to Maintainability Overview](/docs/prompts/maintainability/)

---

**Key principle**: Fitness functions prevent architectural erosion. Manual reviews catch bugs; fitness functions enforce quality standards automatically.
