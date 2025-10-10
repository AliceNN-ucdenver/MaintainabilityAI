# Dependency Hygiene — Prompt Pack

## For Claude Code / ChatGPT

**Role**: You are a DevOps/Platform engineer implementing the "Upgrade All The Things" kata from Evolutionary Architecture.

**Context**:
- Node 18 + TypeScript project using npm/yarn
- Target: All dependencies ≤90 days old (3-month freshness rule)
- CI/CD enforces dependency policies with automated security scanning
- Production workloads cannot tolerate breaking changes

**Security & Quality Requirements**:
- Pin all direct dependencies to exact versions (no `^` or `~` in package.json)
- Lock file (`package-lock.json`) must be committed and verified in CI
- Use `npm ci` in CI/CD (never `npm install` which ignores lock file)
- Run `npm audit` and fail on high/critical vulnerabilities
- Use Snyk or Dependabot for automated dependency PR creation
- Renovate bot configured for weekly dependency update PRs
- Breaking changes require manual review + feature flag protection
- Security patches auto-merge if tests pass (non-breaking only)

**Task**:
1. Create `scripts/check-dependency-freshness.ts` that:
   - Runs `npm outdated --json`
   - Parses output to identify dependencies >90 days old
   - Categorizes by severity: critical (security), major (breaking), minor (safe)
   - Fails CI if critical dependencies are outdated
   - Warns if major dependencies are >6 months old
   - Generates report: `dependency-freshness-report.json`
2. Create `.github/renovate.json` Renovate config:
   - Weekly schedule for dependency updates
   - Group patch updates together (auto-merge if tests pass)
   - Separate PRs for major updates (manual review required)
   - Pin Docker base images to SHA256 digests
   - Auto-label PRs: `dependencies`, `security` (if CVE exists)
3. Create `.github/workflows/dependency-check.yml`:
   - Runs `npm audit --audit-level=high` (fail on high/critical)
   - Runs `npx snyk test --severity-threshold=high`
   - Runs `node scripts/check-dependency-freshness.ts`
   - Comments on PR with summary of vulnerabilities and outdated deps
4. Update `package.json`:
   - Remove all `^` and `~` (pin exact versions)
   - Add `engines` field: `"node": "18.x"` (strict version enforcement)
   - Add `packageManager` field: `"npm@9.x"` (ensure consistent tooling)
5. Create `DEPENDENCY-POLICY.md`:
   - Define 3-month freshness rule
   - Exceptions process (document why a dep can't be upgraded)
   - Security patch SLA: critical <24h, high <7 days
   - Breaking change process: feature flag + gradual rollout

**Checklist**:
- [ ] All dependencies pinned to exact versions (no semver ranges)
- [ ] `package-lock.json` committed and verified in CI
- [ ] Renovate bot configured with auto-merge for patch updates
- [ ] CI fails on npm audit high/critical vulnerabilities
- [ ] CI warns (doesn't fail) on dependencies >90 days old initially
- [ ] After 2-week grace period, CI fails on dependencies >90 days old
- [ ] Breaking dependency updates protected by feature flags
- [ ] Security patches have automated PR creation + merge path
- [ ] Dependency freshness report uploaded as CI artifact
- [ ] Team calendar reminder: monthly dependency review meeting

---

## For GitHub Copilot (#codebase)

```
#codebase Implement dependency hygiene with 3-month freshness rule (Upgrade All The Things kata).

Requirements:
- Pin all dependencies to exact versions in package.json (no ^ or ~)
- Commit package-lock.json
- Renovate bot for weekly update PRs (auto-merge patches, manual review majors)
- CI: npm audit --audit-level=high (fail on vulnerabilities)
- CI: Snyk test --severity-threshold=high
- CI: Check dependency age, fail if >90 days old
- Document exceptions in DEPENDENCY-POLICY.md

Files to create:
scripts/check-dependency-freshness.ts (parse npm outdated, fail if >90 days)
.github/renovate.json (weekly schedule, group patches, separate majors)
.github/workflows/dependency-check.yml (audit + snyk + freshness check)
DEPENDENCY-POLICY.md (3-month rule, exceptions, SLAs)

Update package.json:
- Remove all ^ and ~ (find "^" and "~", replace with exact version)
- Add "engines": { "node": "18.x" }
- Add "packageManager": "npm@9.x"
```

---

## Example Remediation Pattern

### Before (Outdated Dependencies, Semver Ranges)
```json
{
  "dependencies": {
    "express": "^4.17.1",  // 2 years old, has known CVEs
    "lodash": "~4.17.15",  // 3 years old, critical security patch missed
    "axios": "^0.21.1"     // 1.5 years old, breaking changes in 1.x
  },
  "devDependencies": {
    "jest": "^27.0.0"      // 1 year old, missing features in v29
  }
}
```

**Issues**:
- `^` allows minor updates that could break builds (e.g., `^4.17.1` → `4.18.0`)
- Old versions have known security vulnerabilities
- No automated process to keep dependencies fresh

### After (Pinned Versions, Automated Updates)
```json
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  },
  "packageManager": "npm@9.8.1",
  "dependencies": {
    "express": "4.18.2",   // Pinned, Renovate will PR updates
    "lodash": "4.17.21",   // Latest, security patches applied
    "axios": "1.4.0"       // Major update reviewed manually, feature-flagged
  },
  "devDependencies": {
    "jest": "29.5.0"       // Latest, auto-merged patch updates
  }
}
```

**Renovate Config** (`.github/renovate.json`):
```json
{
  "extends": ["config:base"],
  "schedule": ["every weekend"],
  "packageRules": [
    {
      "matchUpdateTypes": ["patch", "pin", "digest"],
      "automerge": true,
      "automergeType": "pr",
      "labels": ["dependencies", "auto-merge"]
    },
    {
      "matchUpdateTypes": ["minor"],
      "automerge": false,
      "labels": ["dependencies", "review-required"]
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["dependencies", "breaking-change"],
      "assignees": ["@platform-team"]
    },
    {
      "matchDatasources": ["docker"],
      "pinDigests": true
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"],
    "assignees": ["@security-team"]
  }
}
```

**Dependency Freshness Check** (`scripts/check-dependency-freshness.ts`):
```typescript
import { execSync } from 'child_process';
import * as fs from 'fs';

const MAX_AGE_DAYS = parseInt(process.env.MAX_DEP_AGE_DAYS || '90', 10);

interface OutdatedPackage {
  current: string;
  wanted: string;
  latest: string;
  location: string;
}

try {
  const outdatedJson = execSync('npm outdated --json', { encoding: 'utf-8' });
  const outdated: Record<string, OutdatedPackage> = JSON.parse(outdatedJson);

  const violations: string[] = [];
  const warnings: string[] = [];

  Object.entries(outdated).forEach(([pkg, info]) => {
    // Check package publish date via npm view
    const publishDateStr = execSync(
      `npm view ${pkg}@${info.current} time.modified`,
      { encoding: 'utf-8' }
    ).trim();
    const publishDate = new Date(publishDateStr);
    const ageInDays = Math.floor(
      (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (ageInDays > MAX_AGE_DAYS) {
      violations.push(
        `${pkg}@${info.current} is ${ageInDays} days old (limit: ${MAX_AGE_DAYS}). Latest: ${info.latest}`
      );
    } else if (ageInDays > MAX_AGE_DAYS / 2) {
      warnings.push(
        `${pkg}@${info.current} is ${ageInDays} days old. Consider upgrading to ${info.latest}`
      );
    }
  });

  const report = {
    timestamp: new Date().toISOString(),
    maxAgeDays: MAX_AGE_DAYS,
    violations,
    warnings,
    totalOutdated: Object.keys(outdated).length,
  };

  fs.writeFileSync(
    'dependency-freshness-report.json',
    JSON.stringify(report, null, 2)
  );

  if (warnings.length > 0) {
    console.warn('⚠️  Dependency Warnings:');
    warnings.forEach(w => console.warn(`  ${w}`));
  }

  if (violations.length > 0) {
    console.error('❌ Dependency Violations:');
    violations.forEach(v => console.error(`  ${v}`));
    process.exit(1); // Fail CI
  }

  console.log(`✅ All dependencies are <${MAX_AGE_DAYS} days old`);
} catch (error) {
  console.error('Failed to check dependency freshness:', error);
  process.exit(1);
}
```

**CI Workflow** (`.github/workflows/dependency-check.yml`):
```yaml
name: Dependency Check

on:
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci  # Use ci, not install

      - name: Audit for vulnerabilities
        run: npm audit --audit-level=high

      - name: Snyk security scan
        run: npx snyk test --severity-threshold=high
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        continue-on-error: true  # Warning mode initially

      - name: Check dependency freshness
        run: |
          npm install -g ts-node
          ts-node scripts/check-dependency-freshness.ts

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: dependency-freshness-report
          path: dependency-freshness-report.json
```

---

## Common Dependency Issues

### 1. **Transitive Dependency Vulnerabilities**
**Problem**: Direct dependency is safe, but its subdependency has CVE.

**Solution**:
```bash
# Override transitive dependency version
npm install --save-exact package-name@safe-version
# Or use npm overrides in package.json (npm 8.3+)
{
  "overrides": {
    "vulnerable-subdep": "1.2.3"
  }
}
```

### 2. **Breaking Changes in Minor/Patch Releases**
**Problem**: Semver not followed by maintainers, patch update breaks build.

**Solution**:
- Pin exact versions (no `^` or `~`)
- Use Renovate to test updates in separate PRs before merging
- Run full test suite + integration tests on dependency PRs

### 3. **Abandoned Dependencies**
**Problem**: Library hasn't been updated in 2+ years, no security patches.

**Solution**:
- Replace with actively maintained alternative
- Fork and maintain internally (document in `DEPENDENCY-POLICY.md`)
- Vendor the code (copy into repo) if simple and stable

### 4. **Diamond Dependency Conflicts**
**Problem**: Two direct dependencies require incompatible versions of shared subdependency.

**Solution**:
```bash
npm ls conflicting-dep  # Visualize dependency tree
# Use overrides or upgrade one of the direct deps
```

---

## Defense Layers

1. **IDE (Pre-commit)**:
   - Snyk IDE extension highlights vulnerable dependencies
   - VS Code extension: "Dependency Analytics" shows outdated deps inline

2. **Local (Developer Machine)**:
   - Pre-commit hook: `npm audit --audit-level=high`
   - Husky hook: prevent commit if lock file not updated

3. **CI (Pull Request)**:
   - npm audit + Snyk scan on every PR
   - Dependency freshness check (fail if >90 days)
   - Renovate creates PRs weekly with updates

4. **Production (Continuous Monitoring)**:
   - Weekly cron job runs `npm audit` on main branch
   - Alerts to Slack/PagerDuty if critical CVE detected
   - Security team SLA: triage within 24h

---

## Testing Checklist

### Package Management
- [ ] All dependencies pinned to exact versions (no `^` or `~`)
- [ ] `package-lock.json` committed and matches `package.json`
- [ ] CI uses `npm ci`, not `npm install`
- [ ] `engines` field specifies Node.js version

### Automated Updates
- [ ] Renovate bot configured with weekly schedule
- [ ] Patch updates auto-merge if tests pass
- [ ] Major updates require manual review
- [ ] Security alerts assigned to security team

### Vulnerability Scanning
- [ ] `npm audit --audit-level=high` runs in CI
- [ ] Snyk scan runs on every PR
- [ ] CI fails on high/critical vulnerabilities
- [ ] Vulnerability report uploaded as artifact

### Freshness Enforcement
- [ ] Script checks dependency age (<90 days)
- [ ] CI fails if dependencies exceed age limit
- [ ] Exceptions documented in `DEPENDENCY-POLICY.md`
- [ ] Monthly dependency review meeting scheduled

---

## Integration with AI Tools

**ChatGPT**: Analyze breaking changes and suggest migration path
```
I need to upgrade from axios@0.27.0 to axios@1.4.0 (major version).
Analyze the CHANGELOG and suggest migration steps:

[paste axios CHANGELOG link]

Requirements:
- Identify breaking changes
- Suggest code changes needed
- Recommend feature flag strategy
```

**Claude Code**: Automate dependency upgrade refactoring
```
Upgrade all instances of `axios` from 0.27.x to 1.4.0.

Breaking changes:
- axios.get() response.data is now typed strictly
- axios.create() config defaults changed

Refactor all files in src/ to comply with new API.
Run tests after each file to verify.
```

**GitHub Copilot**: Suggest dependency alternatives
```
#codebase The library "moment" is deprecated. Suggest migration to date-fns with code examples.
```

---

## When to Use This Prompt Pack

✅ **Use for**:
- Production services with uptime requirements
- Applications handling sensitive data (security is critical)
- Long-lived projects (>1 year lifespan)
- Teams adopting Evolutionary Architecture (3-month rule)
- Compliance-driven environments (SOC2, HIPAA require patching SLAs)

❌ **Don't use for**:
- Prototypes or POCs (<1 month lifespan)
- Internal scripts with no external exposure
- Projects in maintenance mode (no active development)
- Environments where stability > freshness (e.g., embedded systems)

---

## References

- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua) — "Upgrade All The Things" kata
- **Tool**: Renovate (automated dependency updates)
- **Tool**: Snyk (vulnerability scanning + autofix suggestions)
- **Tool**: Dependabot (GitHub-native alternative to Renovate)
- **Pattern**: Dependency pinning + automated testing = safe continuous updates
- **Policy**: 3-month freshness rule balances security and stability
