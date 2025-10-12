# Technical Debt Management — Maintainability Prompt Pack

> **Technical Debt Management** is the systematic tracking, prioritization, and paydown of accumulated code quality issues through structured debt registers, automated detection, and dedicated sprint capacity allocation.

---

## 🎯 What is Technical Debt Management?

**Definition**: A measurable approach to tracking and paying down code quality issues using structured debt registers (YAML/JSON), automated detection tools, and the 20% rule (allocate 20% of sprint capacity to debt paydown).

**Key Components**:
- **Structured tracking**: Debt items stored in `TECHNICAL-DEBT.yml` with schema (id, category, severity, effort, impact)
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

## 🤖 AI Prompt #1: Audit Existing Technical Debt

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into ChatGPT, Claude, or GitHub Copilot Chat:**

```
Role: You are a technical lead auditing a codebase for accumulated technical debt.

Context:
I have a Node.js + TypeScript project with the following characteristics:

[DESCRIBE YOUR PROJECT]
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

---

## 🤖 AI Prompt #2: Implement Debt Tracking System

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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

---

## ✅ Human Review Checklist

After AI generates the debt tracking system, **review the code carefully** before deploying. Here's what to verify in each area:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 📋 Debt Register Structure

The TECHNICAL-DEBT.yml file should follow a strict schema with all required fields. Each debt item must have a unique ID, clear title, file path with line number, and realistic effort estimate. The category and severity fields enable filtering and prioritization. Make sure the YAML is properly formatted and Git-friendly (no merge conflicts).

**Test it**: Parse the YAML file with a validator to ensure it's syntactically correct and follows the schema.

---

### 🔍 Automated Detection Logic

The detection script should find TODO/FIXME comments by scanning all TypeScript files, not just a subset. Use `ts-complex` for complexity analysis instead of manual AST traversal. When checking dependency age, query the actual npm registry publish date (not just version numbers). The script must deduplicate correctly—don't create DEBT-002 for the same issue as DEBT-001.

**Test it**: Run the script on a codebase with known issues and verify it finds them all without duplicates.

---

### 🆔 ID Generation

Debt IDs should be auto-incrementing (DEBT-001, DEBT-002, etc.) and never reused. The script must read the existing debt register, find the highest ID number, and increment from there. Pad IDs with leading zeros for sortability (DEBT-001, not DEBT-1). Use a transaction-like approach to avoid race conditions if multiple developers run the script simultaneously.

**Red flags**: Duplicate IDs, gaps in numbering, or IDs that reset to 001 after deletion.

---

### 📊 Reporting and Metrics

The debt report should provide actionable insights: which categories have the most debt, who owns which items, how long debt has been open. Track debt trend over time by comparing historical reports. Flag debt items that exceed their SLA (P0 >7 days, P1 >30 days). Generate both human-readable console output and machine-readable JSON for dashboards.

**Validate**: Check that the JSON report can be ingested by monitoring tools like Grafana or DataDog.

---

### 🚫 Debt Prevention

The CI workflow should fail fast if untracked debt is added. New TODO comments without a corresponding DEBT-XXX ticket should block the PR. Complexity increases without a refactoring plan should require justification. The workflow must comment on PRs with a summary of new debt items, making it visible to reviewers.

**Test it**: Create a test PR with a TODO comment and verify the CI fails with a clear error message.

---

### 📅 SLA Tracking

Each debt item needs a creation date so you can track age and enforce SLAs. P0 debt (security) must be fixed within 7 days. P1 debt (blocks features) within 30 days. P2 debt (maintainability) within 90 days. The debt report should highlight overdue items and calculate average time-to-resolution.

**After deployment**: Run weekly reports and escalate overdue P0/P1 debt to leadership.

---

### 👥 Ownership and Assignment

Debt items should have clear owners (assignee field). Unassigned debt never gets fixed. The detection script can leave assignee as null initially, but the weekly review meeting should assign all new debt. Track debt by assignee to ensure workload is distributed fairly across the team.

**Process**: In weekly debt review, assign top 5 highest-priority items to specific developers for the next sprint.

---

### 🔄 20% Rule Enforcement

The team must allocate 20% of sprint capacity to debt paydown, not feature work. This typically means each developer works on 1-2 debt items per 2-week sprint alongside feature work. Track debt paydown velocity (items closed per sprint) to ensure the 20% rule is actually followed, not just aspirational.

**Validate**: Review sprint retrospectives and verify debt work is actually being completed, not constantly deprioritized.

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** with ChatGPT to audit your existing technical debt
2. **Use Prompt #2** to generate the debt tracking system
3. **Review generated code** using the checklist above
4. **Create TECHNICAL-DEBT.yml**: Start with top 10-20 debt items from audit
5. **Enable automated detection**: Run scripts/detect-debt.ts weekly
6. **Set up CI prevention**: Block PRs that add untracked debt
7. **Weekly review meetings**: Tech lead + team, prioritize and assign debt
8. **Track metrics**: Debt trend, paydown velocity, SLA compliance
9. **Enforce 20% rule**: Ensure debt work isn't constantly deprioritized

---

## 📖 Additional Resources

- **[Fitness Functions Prompt Pack](fitness-functions)** — Automate complexity and coverage debt detection
- **[Dependency Hygiene](dependency-hygiene)** — Track outdated dependencies as debt
- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua)
- **Tool**: SonarQube — Automated debt detection and tracking
- **Tool**: CodeScene — Visualize debt hotspots in codebase

---

**Remember**: Technical debt isn't inherently bad. It's a trade-off for speed. The problem is invisible, untracked debt that compounds until refactoring becomes impossible.
