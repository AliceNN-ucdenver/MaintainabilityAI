# Technical Debt Management — Maintainability Prompt Pack

> **Technical Debt Management** is the systematic tracking, prioritization, and paydown of accumulated code quality issues through structured debt registers, automated detection, and dedicated sprint capacity allocation.

---

## 🎯 What is Technical Debt Management?

**Definition**: A measurable approach to tracking and paying down code quality issues using structured debt registers (YAML/JSON), automated detection tools, and the 20% rule (allocate 20% of sprint capacity to debt paydown).

**Key Components**:
- **Structured tracking**: Debt items stored in TECHNICAL-DEBT.yml with schema (id, category, severity, effort, impact)
- **Automated detection**: Scripts scan for TODO comments, complexity violations, outdated deps, security issues
- **Prioritization**: P0 (security, <7 day SLA) → P1 (blocks features, <30 days) → P2 (refactoring, <90 days)
- **Debt budget**: 20% of sprint capacity dedicated to paydown (not 0%, not 100%)
- **Prevention**: CI fails if new untracked debt added (no TODO comments without debt tickets)

**Why It Matters**: Without structured tracking, technical debt grows invisibly until refactoring becomes impossible. Measuring debt objectively enables data-driven prioritization instead of gut feelings.

---

## 🔗 Maps to OWASP

**Supports**: All categories by tracking security debt explicitly
**Primary**: [A04 - Insecure Design](/docs/prompts/owasp/A04_insecure_design) (complexity debt increases attack surface)
**Secondary**: [A06 - Vulnerable Components](/docs/prompts/owasp/A06_vuln_outdated) (dependency debt tracked as P0)

---

## Prompt 1: Audit Existing Technical Debt

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Scans the codebase for security, maintainability, performance, and dependency debt items</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a technical lead auditing a codebase for accumulated technical debt.

Context:
Analyze the project in the current workspace for accumulated technical debt.

Example:
- 50K lines of code across 200 files
- 2+ years of active development
- 10 developers contributing
- Current pain points: slow CI, flaky tests, hard to add features

Task:
Analyze the codebase and identify technical debt in these categories:

1. **Security Debt**:
   - Hardcoded secrets, weak encryption, injection vulnerabilities
   - Priority: P0 (critical), must fix within 7 days

2. **Maintainability Debt**:
   - High complexity functions (>10 cyclomatic complexity)
   - Duplicate code (copy-paste across files)
   - Missing tests (coverage <80%)
   - Priority: P2, fix within 90 days

3. **Performance Debt**:
   - N+1 database queries
   - Memory leaks
   - Inefficient algorithms
   - Priority: P1 if user-facing, P2 otherwise

4. **Dependency Debt**:
   - Packages >90 days old
   - Known CVEs in dependencies
   - Deprecated libraries
   - Priority: P0 if security, P1 if major version behind

5. **Documentation Debt**:
   - Missing API docs
   - Outdated README
   - No architecture diagrams
   - Priority: P3 (low urgency)

Format:
For each debt item, provide:

**ID**: DEBT-XXX
**Title**: [Brief description]
**Category**: [security/maintainability/performance/dependency/documentation]
**Severity**: [P0/P1/P2/P3]
**Effort**: [S (<4h) / M (4-8h) / L (8-16h) / XL (>16h)]
**Impact**: [H (blocks work) / M (slows work) / L (minor)]
**File**: [path/to/file.ts:line]
**Notes**: [Why this matters and suggested fix]

Output:
Top 20 technical debt items prioritized by (severity, impact, effort). Include specific file paths and line numbers.
```

</div>
</details>

---

## Prompt 2: Implement Debt Tracking System

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generates a YAML debt register, automated detection scripts, and CI prevention workflows</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a platform engineer implementing automated technical debt tracking and management.

Context:
I have a Node.js 18 + TypeScript project with 50K+ lines of code.

Target: Track all technical debt in structured format with automated detection and CI enforcement

Task: Generate the following files:

1. TECHNICAL-DEBT.yml
   - Schema:
     - id: DEBT-XXX (auto-incrementing, 3-digit padded)
     - title: Brief description
     - category: security|performance|maintainability|testing|documentation
     - severity: P0|P1|P2|P3 (with SLAs: P0 <7d, P1 <30d, P2 <90d)
     - effort: S (<4h) | M (4-8h) | L (8-16h) | XL (>16h)
     - impact: H (blocks work) | M (slows work) | L (minor)
     - file: path/to/file.ts:line
     - created: YYYY-MM-DD
     - assignee: email@example.com or null
     - notes: Why this matters and suggested approach
   - Start with 5-10 example debt items showing variety of categories

2. scripts/detect-debt.ts
   - Automated debt detection:
     a. Scan for TODO/FIXME comments in .ts/.tsx files (use grep or AST)
     b. Run ts-complex to find functions with complexity >10
     c. Run `npm outdated --json` to find packages >90 days old
     d. Parse fitness function test failures (read test output)
   - Deduplicate: Don't re-add existing debt items (compare file:title)
   - Generate new DEBT-XXX IDs for unique debt
   - Update TECHNICAL-DEBT.yml with new items
   - Exit 1 (fail CI) if P0 debt detected

3. scripts/debt-report.ts
   - Read TECHNICAL-DEBT.yml
   - Generate metrics:
     - Total debt items by category
     - Total debt items by severity
     - List all P0 debt (critical)
     - Debt by assignee (who owns what)
   - Output: Console summary + debt-report.json for dashboards

4. .github/workflows/debt-prevention.yml
   - Trigger: On pull request
   - Steps:
     a. Run scripts/detect-debt.ts
     b. Fail if new TODO/FIXME comments without corresponding debt ticket
     c. Fail if complexity increased >5% without refactoring plan
     d. Comment on PR: "This PR adds 2 debt items (DEBT-042, DEBT-043)"
   - Goal: Prevent new untracked debt from accumulating

5. DEPENDENCY-POLICY.md
   - Document the 20% rule (allocate 20% sprint capacity to debt paydown)
   - Define SLAs: P0 <7 days, P1 <30 days, P2 <90 days, P3 best effort
   - Explain exception process (when debt can't be fixed on schedule)
   - Debt review meeting: Weekly, tech lead + team, prioritize top 5 items

Requirements:
- TypeScript with strict typing and JSDoc comments
- YAML format for debt register (human-readable, Git-friendly)
- Error messages must be actionable
- Configurable via env vars: MAX_COMPLEXITY, MAX_DEP_AGE_DAYS
- Debt IDs must be unique and auto-incrementing

Output: Complete, executable code for all 5 files.
```

</div>
</details>

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 16px;">After AI generates the debt tracking system, review the code carefully before deploying:</div>

<div style="display: grid; gap: 12px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Debt Register Structure</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ TECHNICAL-DEBT.yml follows strict schema with all required fields<br/>
    ✓ Each debt item has unique ID, clear title, file path with line number<br/>
    ✓ Realistic effort estimates for all items<br/>
    ✓ Category and severity fields enable filtering and prioritization<br/>
    ✓ YAML is properly formatted and Git-friendly (no merge conflicts)<br/>
    <strong style="color: #94a3b8;">Test:</strong> Parse TECHNICAL-DEBT.yml with a YAML validator and confirm schema correctness
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fdba74; margin-bottom: 8px;">Automated Detection Logic</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Script finds TODO/FIXME comments by scanning all TypeScript files<br/>
    ✓ Uses ts-complex for complexity analysis (not manual AST traversal)<br/>
    ✓ Dependency age checks query actual npm registry publish date<br/>
    ✓ Deduplication works correctly (no duplicate DEBT-XXX IDs for same issue)<br/>
    <strong style="color: #94a3b8;">Test:</strong> Run on codebase with known issues and verify complete detection
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #93c5fd; margin-bottom: 8px;">ID Generation</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Debt IDs are auto-incrementing (DEBT-001, DEBT-002, etc.) and never reused<br/>
    ✓ Script reads existing register, finds highest ID, and increments from there<br/>
    ✓ IDs padded with leading zeros for sortability (DEBT-001, not DEBT-1)<br/>
    ✓ Transaction-like approach avoids race conditions<br/>
    <strong style="color: #94a3b8;">Test:</strong> Run detection twice and verify no duplicate IDs or gaps in numbering
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #86efac; margin-bottom: 8px;">Debt Prevention</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ CI workflow fails fast if untracked debt is added<br/>
    ✓ New TODO comments without corresponding DEBT-XXX ticket block PR<br/>
    ✓ Complexity increases without refactoring plan require justification<br/>
    ✓ Workflow comments on PRs with summary of new debt items<br/>
    <strong style="color: #94a3b8;">Test:</strong> Create PR with TODO comment and verify CI fails with clear message
  </div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #c4b5fd; margin-bottom: 8px;">SLA Tracking</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Each debt item has creation date for age tracking<br/>
    ✓ P0 debt (security) fixed within 7 days<br/>
    ✓ P1 debt (blocks features) fixed within 30 days<br/>
    ✓ Report highlights overdue items and calculates average time-to-resolution<br/>
    <strong style="color: #94a3b8;">Test:</strong> Run weekly reports and escalate overdue P0/P1 debt
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Use Prompt 1** with ChatGPT to audit your existing technical debt
2. **Use Prompt 2** to generate the debt tracking system
3. **Review generated code** using the checklist above
4. **Create TECHNICAL-DEBT.yml**: Start with top 10-20 debt items from audit
5. **Enable automated detection**: Run scripts/detect-debt.ts weekly
6. **Enforce 20% rule**: Ensure debt work isn't constantly deprioritized

---

## Resources

- **[Fitness Functions Prompt Pack](fitness-functions)** — Automate complexity and coverage debt detection
- **[Dependency Hygiene](dependency-hygiene)** — Track outdated dependencies as debt
- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua)
- **Tool**: SonarQube — Automated debt detection and tracking
- **Tool**: CodeScene — Visualize debt hotspots in codebase
- [Back to Maintainability Overview](/docs/prompts/maintainability/)

---

**Key principle**: Technical debt is not inherently bad -- it is a trade-off for speed. The problem is invisible, untracked debt that compounds until refactoring becomes impossible. Track it, prioritize it, and pay it down systematically.
