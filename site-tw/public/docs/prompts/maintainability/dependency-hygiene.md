# Dependency Hygiene — Maintainability Prompt Pack

> **Dependency Hygiene** is the practice of keeping all dependencies fresh (≤90 days old) through automated updates, security scanning, and the "Upgrade All The Things" kata. It prevents security vulnerabilities and breaking changes from accumulating.

---

## 🎯 What is Dependency Hygiene?

**Definition**: A systematic approach to dependency management that enforces a 3-month freshness rule, pins exact versions, and automates security scanning and updates.

**Key Practices**:
- **Pin exact versions**: No `^` or `~` in package.json (prevents surprise breakage)
- **Automated updates**: Renovate/Dependabot creates weekly PRs for patches (auto-merge if tests pass)
- **Security scanning**: npm audit + Snyk on every PR (fail on high/critical CVEs)
- **90-day rule**: All dependencies must be ≤3 months old (fitness function enforces this)
- **Breaking changes**: Feature flag protection for major version upgrades

**Why It Matters**: Outdated dependencies accumulate security vulnerabilities and make upgrades increasingly risky. The 3-month rule forces incremental updates instead of massive "upgrade everything at once" migrations.

---

## 🔗 Maps to OWASP

**Primary**: [A06 - Vulnerable and Outdated Components](/docs/prompts/owasp/A06_vuln_outdated) (outdated deps have known CVEs)
**Secondary**: [A05 - Security Misconfiguration](/docs/prompts/owasp/A05_security_misconfig) (using `^` allows untested versions)

---

## 🤖 AI Prompt #1: Audit Current Dependency State

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into ChatGPT, Claude, or GitHub Copilot Chat:**

```
Role: You are a DevOps engineer auditing a codebase for dependency hygiene issues.

Context:
I have a Node.js + TypeScript project with the following package.json:

[PASTE YOUR package.json HERE]

Task:
Analyze this package.json and identify:

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

---

## 🤖 AI Prompt #2: Implement Dependency Hygiene System

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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

---

## ✅ Human Review Checklist

After AI generates the dependency hygiene system, **review the code carefully** before running it. Here's what to verify in each area:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 📦 Package.json Configuration

Verify all dependencies are pinned to exact versions with no semver ranges. Check that the engines field specifies your Node.js and npm versions to prevent tooling mismatches across the team. The packageManager field should lock npm to a specific version for deterministic builds.

**Test it**: Run `npm ci` locally and in CI to ensure the lock file is honored and builds are reproducible.

---

### 🔍 Freshness Check Script

The script should use `npm outdated --json` to find outdated packages, then check actual publish dates using the npm registry API. Age calculations need to be accurate (don't just compare version numbers). The script must categorize packages by severity: security vulnerabilities are P0, major versions behind are P1, minor/patch updates are P2. Make sure it generates a structured JSON report for tracking trends over time.

**Test it**: Run the script and verify it correctly flags packages you know are outdated with accurate age calculations.

---

### 🤖 Renovate Configuration

Renovate should run weekly (not daily, to avoid PR spam) and group patch updates together for auto-merge. Minor and major updates need separate PRs for manual review. The config must enable vulnerability alerts that immediately notify the security team. Docker images should be pinned to SHA256 digests, not just tags, to prevent supply chain attacks.

**Test it**: After merging the config, check that Renovate creates the expected PRs with correct labels and assignees.

---

### 🔒 Security Scanning

The CI workflow should use `npm ci` (not `npm install`) to respect the lock file exactly. Both npm audit and Snyk should run, with audit configured to fail on high/critical vulnerabilities. Initially set Snyk to `continue-on-error: true` so you can monitor results for a couple weeks before switching to blocking mode. The workflow must upload the freshness report as an artifact for historical trend analysis.

**Test it**: Trigger the workflow manually and verify it catches known vulnerabilities in test dependencies.

---

### 📊 Reporting and Metrics

The dependency freshness report should include: timestamp, max age threshold, list of violations with package names and ages, list of warnings for packages approaching the threshold, and total count of outdated packages. This data enables tracking improvement over time and identifying which packages are consistently problematic.

**Validate**: Check that the JSON report is structured correctly and can be parsed by monitoring tools like Grafana or DataDog.

---

### 🚨 Exception Handling

The freshness check script needs proper error handling for edge cases: packages that were removed from npm, private packages that require authentication, monorepo packages with workspace: protocol, and dependencies with pre-release versions. These shouldn't cause the entire check to fail.

**Red flags**: Scripts that crash on npm registry API errors or incorrectly flag internal packages as outdated.

---

### 🔄 Update Workflow

Establish a clear process for handling Renovate PRs. Patch updates should auto-merge if all tests pass. Minor updates require a quick review but can usually merge within 24 hours. Major updates need thorough testing, feature flag protection for risky changes, and rollback plans. Security updates should have SLAs: critical <24 hours, high <7 days.

**After deployment**: Monitor for 2 weeks in warning mode, then switch to blocking mode by setting `continue-on-error: false`.

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** with ChatGPT to audit your current package.json
2. **Use Prompt #2** to generate the automation scripts and CI workflows
3. **Review generated code** using the checklist above
4. **Pin all dependencies**: Remove `^` and `~` from package.json
5. **Set up Renovate**: Merge .github/renovate.json configuration
6. **Enable CI checks**: Add dependency-check.yml workflow
7. **Monitor for 2 weeks**: Review Renovate PRs, track freshness report trends
8. **Switch to blocking**: Set `continue-on-error: false` after monitoring period
9. **Establish SLAs**: P0 (security) <7 days, P1 (major versions) <30 days, P2 (minor/patch) <90 days

---

## 📖 Additional Resources

- **[Fitness Functions Prompt Pack](fitness-functions)** — Automate dependency age enforcement
- **[Technical Debt Management](technical-debt)** — Track outdated dependencies as debt items
- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua) — "Upgrade All The Things" kata
- **Tool**: Renovate — Automated dependency updates
- **Tool**: Snyk — Security scanning with autofix suggestions

---

**Remember**: The 3-month rule prevents dependency upgrades from becoming scary "big bang" migrations. Small, frequent updates are safer than large, infrequent ones.
