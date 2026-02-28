# Dependency Hygiene — Maintainability Prompt Pack

> **Dependency Hygiene** is the practice of keeping all dependencies fresh (≤90 days old) through automated updates, security scanning, and the "Upgrade All The Things" kata. It prevents security vulnerabilities and breaking changes from accumulating.

---

## 🎯 What is Dependency Hygiene?

**Definition**: A systematic approach to dependency management that enforces a 3-month freshness rule, pins exact versions, and automates security scanning and updates.

**Key Practices**:
- **Pin exact versions**: No ^ or ~ in package.json (prevents surprise breakage)
- **Automated updates**: Renovate/Dependabot creates weekly PRs for patches (auto-merge if tests pass)
- **Security scanning**: npm audit + Snyk on every PR (fail on high/critical CVEs)
- **90-day rule**: All dependencies must be ≤3 months old (fitness function enforces this)
- **Breaking changes**: Feature flag protection for major version upgrades

**Why It Matters**: Outdated dependencies accumulate security vulnerabilities and make upgrades increasingly risky. The 3-month rule forces incremental updates instead of massive "upgrade everything at once" migrations.

---

## 🔗 Maps to OWASP

**Primary**: [A06 - Vulnerable and Outdated Components](/docs/prompts/owasp/A06_vuln_outdated) (outdated deps have known CVEs)
**Secondary**: [A05 - Security Misconfiguration](/docs/prompts/owasp/A05_security_misconfig) (using ^ allows untested versions)

---

## Prompt 1: Audit Current Dependency State

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Audits package.json for semver ranges, outdated libraries, and missing best practices</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a DevOps engineer auditing a codebase for dependency hygiene issues.

Context:
I have a Node.js + TypeScript project. Analyze the package.json in the current workspace.

Task:
Analyze the package.json and identify:

1. Dependencies using semver ranges (`^` or `~`) instead of exact versions
2. Dependencies that appear outdated (common libraries with old major versions)
3. Security risks from pinned versions (e.g., lodash 4.17.15 has known CVEs)
4. Missing best practices:
   - No `engines` field (Node.js version not specified)
   - No `packageManager` field (npm version not locked)
   - Lock file not committed (if mentioned in .gitignore)

Format:
For each issue, provide:

**Issue**: [Description]
**Risk**: [Security/Stability/Maintainability]
**Priority**: [P0/P1/P2]
**Fix**: [Specific command or config change]

Output:
Prioritized list of 5-10 actionable fixes with npm commands ready to copy-paste.
```

</div>
</details>

---

## Prompt 2: Implement Dependency Hygiene System

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generates freshness check scripts, Renovate config, and CI workflows for automated dependency management</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a platform engineer implementing automated dependency hygiene with the "Upgrade All The Things" kata.

Context:
I have a Node.js 18 + TypeScript project using npm for package management.

Target: All dependencies ≤90 days old (3-month freshness rule)

Task: Generate the following files:

1. scripts/check-dependency-freshness.ts
   - Run `npm outdated --json` to get outdated packages
   - For each package, check publish date using `npm view <pkg>@<version> time.modified`
   - Calculate age in days: (Date.now() - publishDate) / (1000 * 60 * 60 * 24)
   - Categorize: Warn if >60 days, Fail if >90 days
   - Generate JSON report: dependency-freshness-report.json
   - Exit 1 (fail CI) if any dependency >90 days old

2. .github/renovate.json
   - Schedule: Weekly on weekends
   - Auto-merge: Patch updates if tests pass (label: dependencies, auto-merge)
   - Manual review: Minor updates (label: dependencies, review-required)
   - Breaking changes: Major updates assigned to platform team (label: dependencies, breaking-change)
   - Pin Docker images to SHA256 digests
   - Enable vulnerability alerts (label: security, assign security team)

3. .github/workflows/dependency-check.yml
   - Trigger: On PR and weekly cron (Sundays)
   - Steps:
     a. npm ci (not npm install)
     b. npm audit --audit-level=high (fail on high/critical)
     c. npx snyk test --severity-threshold=high (continue-on-error: true initially)
     d. ts-node scripts/check-dependency-freshness.ts
     e. Upload dependency-freshness-report.json as artifact

4. Update package.json
   - Remove ALL ^ and ~ symbols (use exact versions only)
   - Add "engines": { "node": "18.x", "npm": "9.x" }
   - Add "packageManager": "npm@9.8.1"

Requirements:
- All tests must be executable TypeScript (.ts files)
- Error messages must be actionable (show package name, current version, latest version, age in days)
- Thresholds configurable via environment variables (MAX_DEP_AGE_DAYS default: 90)
- Initially run in warning mode (monitor for 2 weeks), then switch to blocking

Output: Complete, executable code for all 4 files.
```

</div>
</details>

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 16px;">After AI generates the dependency hygiene system, review the code carefully before running it:</div>

<div style="display: grid; gap: 12px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Package.json Configuration</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All dependencies pinned to exact versions with no semver ranges<br/>
    ✓ Engines field specifies Node.js and npm versions<br/>
    ✓ PackageManager field locks npm to specific version for deterministic builds<br/>
    <strong style="color: #94a3b8;">Test:</strong> run npm ci locally and in CI to ensure lock file is honored
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fdba74; margin-bottom: 8px;">Freshness Check Script</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Uses npm outdated --json to find outdated packages<br/>
    ✓ Checks actual publish dates using npm registry API<br/>
    ✓ Age calculations are accurate (not just version number comparison)<br/>
    ✓ Categorizes packages by severity: P0 (security), P1 (major versions), P2 (minor/patch)<br/>
    ✓ Generates structured JSON report for tracking trends<br/>
    <strong style="color: #94a3b8;">Test:</strong> Run script and verify age calculations match actual publish dates
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #93c5fd; margin-bottom: 8px;">Renovate Configuration</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Runs weekly (not daily) to avoid PR spam<br/>
    ✓ Groups patch updates together for auto-merge<br/>
    ✓ Separate PRs for minor and major updates requiring manual review<br/>
    ✓ Vulnerability alerts enabled to notify security team immediately<br/>
    ✓ Docker images pinned to SHA256 digests (not just tags)<br/>
    <strong style="color: #94a3b8;">Test:</strong> Verify Renovate creates expected PRs with correct labels and assignees
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #86efac; margin-bottom: 8px;">Security Scanning</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ CI workflow uses npm ci (not npm install) to respect lock file exactly<br/>
    ✓ Both npm audit and Snyk run on every PR<br/>
    ✓ Audit configured to fail on high/critical vulnerabilities<br/>
    ✓ Snyk initially set to continue-on-error: true for monitoring period<br/>
    ✓ Workflow uploads freshness report as artifact for historical trend analysis<br/>
    <strong style="color: #94a3b8;">Test:</strong> Trigger workflow manually and verify it catches known vulnerabilities
  </div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #c4b5fd; margin-bottom: 8px;">Exception Handling</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Handles packages removed from npm<br/>
    ✓ Handles private packages requiring authentication<br/>
    ✓ Handles monorepo packages with workspace: protocol<br/>
    ✓ Handles dependencies with pre-release versions<br/>
    ✓ Edge cases don't cause entire check to fail<br/>
    <strong style="color: #94a3b8;">Test:</strong> Verify script handles npm registry API errors without crashing
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Use Prompt 1** with ChatGPT to audit your current package.json
2. **Use Prompt 2** to generate the automation scripts and CI workflows
3. **Review generated code** using the checklist above
4. **Pin all dependencies**: Remove ^ and ~ from package.json
5. **Set up Renovate**: Merge .github/renovate.json configuration
6. **Monitor for 2 weeks**: Review Renovate PRs, track freshness report trends

---

## Resources

- **[Fitness Functions Prompt Pack](fitness-functions)** — Automate dependency age enforcement
- **[Technical Debt Management](technical-debt)** — Track outdated dependencies as debt items
- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua) — "Upgrade All The Things" kata
- **Tool**: Renovate — Automated dependency updates
- **Tool**: Snyk — Security scanning with autofix suggestions
- [Back to Maintainability Overview](/docs/prompts/maintainability/)

---

**Key principle**: The 3-month rule prevents dependency upgrades from becoming scary "big bang" migrations. Small, frequent updates are safer than large, infrequent ones.
