import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';
import { GitHubService } from './GitHubService';
import { PromptPackService } from './PromptPackService';
import { PmatService } from './PmatService';
import type {
  ScorecardData, MetricResult, MetricStatus, HealthGrade,
  SdlcCompletenessItem, OwaspIssueSummary, RepoInfo, CoverageFileDetail,
  OutdatedDependency, FitnessTestResult,
} from '../types';

const SDLC_FILES = [
  // Cheshire v2: CLAUDE.md + alice-remediation.yml are replaced by the Alice
  // maintenance-agent persona; the MCP `.mcp.json` layer is retired.
  { label: 'CI Workflow', path: '.github/workflows/ci.yml' },
  { label: 'CodeQL Workflow', path: '.github/workflows/codeql.yml' },
  { label: 'Alice (Maintenance Agent)', path: '.github/agents/alice-maintenance-agent.agent.md' },
  { label: 'PR Template', path: '.github/PULL_REQUEST_TEMPLATE.md' },
  { label: 'Security Policy', path: '.github/SECURITY.md' },
  { label: 'Repo Metadata', path: '.github/repo-metadata.yml' },
  // Code repos carry packs under .cheshire/prompts/ (Cheshire side); the mesh
  // side uses .caterpillar/prompts/. The old top-level prompts/owasp path was
  // never deployed to scaffolded repos, so this always reported "missing".
  { label: 'Prompt Packs', path: '.cheshire/prompts' },
  // Red Queen governance files
  { label: 'Red Queen Policy', path: '.redqueen/policy.json' },
  { label: 'Red Queen Decision', path: '.redqueen/decision.json' },
  { label: 'Red Queen Hooks', path: '.redqueen/hooks/validate-tool.sh' },
  { label: 'Impl Provenance Gate', path: '.github/workflows/impl-provenance.yml' },
  { label: 'AGENTS.md', path: 'AGENTS.md' },
];

const OWASP_LABELS = [
  { category: 'A01_broken_access_control', label: 'owasp/A01', displayName: 'Broken Access Control' },
  { category: 'A02_cryptographic_failures', label: 'owasp/A02', displayName: 'Cryptographic Failures' },
  { category: 'A03_injection', label: 'owasp/A03', displayName: 'Injection' },
  { category: 'A04_insecure_design', label: 'owasp/A04', displayName: 'Insecure Design' },
  { category: 'A05_security_misconfiguration', label: 'owasp/A05', displayName: 'Security Misconfiguration' },
  { category: 'A06_vulnerable_components', label: 'owasp/A06', displayName: 'Vulnerable Components' },
  { category: 'A07_authn_failures', label: 'owasp/A07', displayName: 'Authentication Failures' },
  { category: 'A08_integrity_failures', label: 'owasp/A08', displayName: 'Integrity Failures' },
  { category: 'A09_logging_failures', label: 'owasp/A09', displayName: 'Logging Failures' },
  { category: 'A10_ssrf', label: 'owasp/A10', displayName: 'SSRF' },
];

interface NpmPackageInfo { ageDays: number; latestVersion: string; }

/** Extract a bare `major.minor.patch` from a version or range, or '' if none. */
function coerceVersion(range: string): string {
  const m = String(range).match(/(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
  return m ? m[1] : '';
}

/** True when `latest` is a higher major.minor.patch than `installed`. */
function isBehind(installed: string, latest: string): boolean {
  const a = coerceVersion(installed);
  const b = coerceVersion(latest);
  if (!a || !b) { return false; }
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pb[i] || 0) > (pa[i] || 0)) { return true; }
    if ((pb[i] || 0) < (pa[i] || 0)) { return false; }
  }
  return false;
}

export class ScorecardService {
  private lastOutdatedDeps: OutdatedDependency[] = [];

  constructor(
    private readonly githubService: GitHubService,
    private readonly promptPackService: PromptPackService,
    private readonly pmatService: PmatService
  ) {}

  async collectAll(repo: RepoInfo | null, workspaceRoot?: string): Promise<ScorecardData> {
    const root = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const pmatInstalled = await this.pmatService.isInstalled();

    const [security, deps, coverage, complexity, techDebt, cicd, owaspIssues] =
      await Promise.allSettled([
        repo ? this.collectSecurityCompliance(repo) : Promise.resolve(this.unknownMetric('Security Compliance', 'No repository detected')),
        this.collectDependencyFreshness(pmatInstalled, root),
        this.collectTestCoverage(root),
        this.collectComplexity(pmatInstalled, root),
        this.collectTechnicalDebt(pmatInstalled, root),
        repo ? this.collectCiCdHealth(repo) : Promise.resolve(this.unknownMetric('CI/CD Health', 'No repository detected')),
        repo ? this.collectOwaspIssues(repo) : Promise.resolve([]),
      ]);

    const metrics = {
      securityCompliance: this.extractResult(security, 'Security Compliance'),
      dependencyFreshness: this.extractResult(deps, 'Dependency Freshness'),
      testCoverage: this.extractResult(coverage, 'Test Coverage'),
      complexity: this.extractResult(complexity, 'Cyclomatic Complexity'),
      technicalDebt: this.extractResult(techDebt, 'Technical Debt'),
      cicdHealth: this.extractResult(cicd, 'CI/CD Health'),
    };

    const scores = Object.values(metrics).map(m => m.score).filter(s => s >= 0);
    const compositeScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : -1;

    return {
      grade: this.computeGrade(compositeScore),
      compositeScore,
      metrics,
      sdlcCompleteness: this.collectSdlcCompleteness(root),
      owaspIssues: this.extractOwaspResult(owaspIssues),
      fitnessTests: this.collectFitnessTests(root),
      pmatInstalled,
      repo,
      lastRefreshed: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Security Compliance
  // --------------------------------------------------------------------------

  private async collectSecurityCompliance(repo: RepoInfo): Promise<MetricResult> {
    const [codeql, dependabot] = await Promise.allSettled([
      this.githubService.getCodeQLAlerts(repo.owner, repo.repo),
      this.githubService.getDependabotAlerts(repo.owner, repo.repo),
    ]);

    const codeqlCounts = codeql.status === 'fulfilled' ? codeql.value : null;
    const depCounts = dependabot.status === 'fulfilled' ? dependabot.value : null;

    if (!codeqlCounts && !depCounts) {
      return this.unknownMetric('Security Compliance', 'Not configured — run scaffold to add CodeQL');
    }

    let critical = 0, high = 0, medium = 0, low = 0;
    if (codeqlCounts) { critical += codeqlCounts.critical; high += codeqlCounts.high; medium += codeqlCounts.medium; low += codeqlCounts.low; }
    if (depCounts) { critical += depCounts.critical; high += depCounts.high; medium += depCounts.medium; low += depCounts.low; }

    const score = Math.max(0, 100 - (critical * 25) - (high * 10) - (medium * 3));
    const total = critical + high + medium + low;

    const parts: string[] = [];
    if (critical > 0) { parts.push(`${critical} critical`); }
    if (high > 0) { parts.push(`${high} high`); }
    if (medium > 0) { parts.push(`${medium} medium`); }
    if (low > 0) { parts.push(`${low} low`); }

    return {
      status: this.scoreToStatus(score),
      label: 'Security Compliance',
      value: total === 0 ? 'No open alerts' : parts.join(', '),
      score,
      details: [
        codeqlCounts ? 'CodeQL enabled' : 'CodeQL not configured',
        depCounts ? 'Dependabot enabled' : 'Dependabot not configured',
      ].join(' · '),
      lastUpdated: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Dependency Freshness
  // --------------------------------------------------------------------------

  private async collectDependencyFreshness(_pmatInstalled: boolean, workspaceRoot?: string): Promise<MetricResult> {
    if (!workspaceRoot) {
      return this.unknownMetric('Dependency Freshness', 'No workspace open');
    }

    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return this.unknownMetric('Dependency Freshness', 'No package.json found');
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
      const depNames = Object.keys(allDeps).slice(0, 20);

      if (depNames.length === 0) {
        return { status: 'green', label: 'Dependency Freshness', value: 'No dependencies', score: 100, lastUpdated: new Date().toISOString() };
      }

      const installed = this.readLockfileVersions(workspaceRoot);
      const results = await Promise.allSettled(depNames.map(name => this.fetchNpmPackageInfo(name)));

      const outdated: OutdatedDependency[] = [];
      for (let i = 0; i < results.length; i++) {
        if (results[i].status !== 'fulfilled') { continue; }
        const { ageDays, latestVersion } = (results[i] as PromiseFulfilledResult<NpmPackageInfo>).value;
        const name = depNames[i];
        const declared = allDeps[name] || '';
        const installedVersion = installed.get(name) || coerceVersion(declared);

        if (installedVersion && latestVersion && isBehind(installedVersion, latestVersion)) {
          // A newer version exists — an upgrade can actually fix this.
          outdated.push({ name, ageDays, currentVersion: declared, installedVersion, latestVersion, kind: 'behind' });
        } else if (ageDays > 365) {
          // Already on the latest version, but the package itself is dormant
          // (>1yr since its last release). No upgrade can fix it — advisory only.
          outdated.push({ name, ageDays, currentVersion: declared, installedVersion, latestVersion, kind: 'dormant' });
        }
      }

      const behind = outdated.filter(d => d.kind === 'behind');
      const dormant = outdated.filter(d => d.kind === 'dormant');
      // Actionable upgrades first (newest gap on top), then dormant advisories.
      this.lastOutdatedDeps = [...behind.sort((a, b) => b.ageDays - a.ageDays), ...dormant.sort((a, b) => b.ageDays - a.ageDays)];

      // Score penalizes only actionable upgrades; dormant-at-latest is unfixable.
      const score = Math.round(((depNames.length - behind.length) / depNames.length) * 100);
      const parts: string[] = [];
      if (behind.length) { parts.push(`${behind.length} behind`); }
      if (dormant.length) { parts.push(`${dormant.length} dormant`); }

      return {
        status: this.scoreToStatus(score),
        label: 'Dependency Freshness',
        value: parts.length ? `${parts.join(', ')} of ${depNames.length}` : `All ${depNames.length} deps current`,
        score,
        details: behind.length
          ? `Upgrade: ${behind[0].name} ${behind[0].installedVersion} → ${behind[0].latestVersion}`
          : dormant.length
            ? `Dormant: ${dormant[0].name} (${dormant[0].ageDays} days since last release)`
            : undefined,
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      return this.unknownMetric('Dependency Freshness', 'Failed to parse package.json');
    }
  }

  /** Resolve top-level installed versions from package-lock.json (v1/v2/v3). */
  private readLockfileVersions(workspaceRoot: string): Map<string, string> {
    const map = new Map<string, string>();
    const lockPath = path.join(workspaceRoot, 'package-lock.json');
    if (!fs.existsSync(lockPath)) { return map; }
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      // npm v2/v3: packages keyed by "node_modules/<name>" (top-level only).
      if (lock.packages && typeof lock.packages === 'object') {
        for (const [key, val] of Object.entries(lock.packages as Record<string, { version?: string }>)) {
          const m = key.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)$/);
          if (m && val?.version) { map.set(m[1], val.version); }
        }
      }
      // npm v1 fallback: dependencies[<name>].version.
      if (map.size === 0 && lock.dependencies && typeof lock.dependencies === 'object') {
        for (const [name, val] of Object.entries(lock.dependencies as Record<string, { version?: string }>)) {
          if (val?.version) { map.set(name, val.version); }
        }
      }
    } catch { /* ignore a malformed lockfile — fall back to declared ranges */ }
    return map;
  }

  private fetchNpmPackageInfo(name: string): Promise<NpmPackageInfo> {
    return new Promise((resolve, reject) => {
      // Use the lightweight search API (~1KB response) instead of full packument (5+ MB)
      const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(name)}&size=1`;
      const req = https.get(url, { timeout: 10000 }, (res) => {
        let body = '';
        res.on('data', (chunk: string) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const pkg = data.objects?.[0]?.package;
            if (!pkg || pkg.name !== name) { resolve({ ageDays: 0, latestVersion: '' }); return; }
            const ageDays = pkg.date
              ? Math.max(0, Math.floor((Date.now() - new Date(pkg.date).getTime()) / (24 * 60 * 60 * 1000)))
              : 0;
            resolve({ ageDays, latestVersion: pkg.version || '' });
          } catch { reject(new Error('parse error')); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  }

  // --------------------------------------------------------------------------
  // Test Coverage
  // --------------------------------------------------------------------------

  private async collectTestCoverage(workspaceRoot?: string): Promise<MetricResult> {
    if (!workspaceRoot) {
      return this.unknownMetric('Test Coverage', 'No workspace open');
    }

    // Try Istanbul/Jest/nyc json-summary in common locations
    const candidates = [
      path.join(workspaceRoot, 'coverage', 'coverage-summary.json'),
      path.join(workspaceRoot, '.nyc_output', 'coverage-summary.json'),
      path.join(workspaceRoot, 'coverage-summary.json'),
    ];
    for (const summaryPath of candidates) {
      if (fs.existsSync(summaryPath)) {
        return this.parseIstanbulSummary(summaryPath);
      }
    }

    // Try Python pytest-cov JSON (coverage.json)
    const pytestResult = this.parsePytestCoverage(workspaceRoot);
    if (pytestResult) { return pytestResult; }

    // Try V8 raw coverage (c8/Node --experimental-vm-modules)
    const v8Result = this.parseV8Coverage(workspaceRoot);
    if (v8Result) { return v8Result; }

    return this.unknownMetric('Test Coverage', 'Run tests with coverage enabled');
  }

  private parseIstanbulSummary(filePath: string): MetricResult {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const lines = data.total?.lines?.pct ?? -1;
      const branches = data.total?.branches?.pct ?? -1;
      const functions = data.total?.functions?.pct ?? -1;

      if (lines < 0) {
        return this.unknownMetric('Test Coverage', 'Invalid coverage report');
      }

      const score = Math.round(lines);
      const parts = [`${lines.toFixed(1)}% lines`];
      if (branches >= 0) { parts.push(`${branches.toFixed(1)}% branches`); }
      if (functions >= 0) { parts.push(`${functions.toFixed(1)}% functions`); }

      return {
        status: this.scoreToStatus(score, 80, 60),
        label: 'Test Coverage',
        value: parts[0],
        score,
        details: parts.slice(1).join(', '),
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      return this.unknownMetric('Test Coverage', 'Failed to parse coverage report');
    }
  }

  private parsePytestCoverage(workspaceRoot: string): MetricResult | null {
    // pytest-cov --cov-report=json writes coverage.json with { totals: { percent_covered, ... }, files: { ... } }
    const candidates = [
      path.join(workspaceRoot, 'coverage.json'),
      path.join(workspaceRoot, 'coverage', 'coverage.json'),
    ];
    for (const covPath of candidates) {
      if (!fs.existsSync(covPath)) { continue; }
      try {
        const data = JSON.parse(fs.readFileSync(covPath, 'utf-8'));
        const totals = data.totals;
        if (!totals || totals.percent_covered == null) { continue; }

        const pct = totals.percent_covered;
        const score = Math.round(pct);
        const parts = [`${pct.toFixed(1)}% lines`];
        if (totals.covered_branches != null && totals.num_branches) {
          const branchPct = (totals.covered_branches / totals.num_branches) * 100;
          parts.push(`${branchPct.toFixed(1)}% branches`);
        }

        return {
          status: this.scoreToStatus(score, 80, 60),
          label: 'Test Coverage',
          value: parts[0],
          score,
          details: parts.length > 1 ? parts.slice(1).join(', ') : `${totals.covered_lines ?? '?'}/${totals.num_statements ?? '?'} statements (pytest-cov)`,
          lastUpdated: new Date().toISOString(),
        };
      } catch { /* try next */ }
    }
    return null;
  }

  private parseV8Coverage(workspaceRoot: string): MetricResult | null {
    const tmpDir = path.join(workspaceRoot, 'coverage', 'tmp');
    if (!fs.existsSync(tmpDir)) { return null; }

    try {
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
      if (files.length === 0) { return null; }

      // Use the most recent coverage file
      const latest = files
        .map(f => ({ name: f, mtime: fs.statSync(path.join(tmpDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)[0];

      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, latest.name), 'utf-8'));
      const results: { url: string; functions: { functionName: string; ranges: { count: number }[] }[] }[] = data.result ?? [];

      // Filter to project source files only (skip node_modules, node: internals)
      const projectPrefix = `file://${workspaceRoot}`;
      const projectFiles = results.filter(r =>
        r.url.startsWith(projectPrefix) &&
        !r.url.includes('/node_modules/') &&
        !r.url.includes('/test/') &&
        !r.url.includes('/__tests__/')
      );

      if (projectFiles.length === 0) { return null; }

      let totalFns = 0;
      let coveredFns = 0;
      for (const file of projectFiles) {
        for (const fn of file.functions) {
          totalFns++;
          if (fn.ranges.some(r => r.count > 0)) { coveredFns++; }
        }
      }

      if (totalFns === 0) { return null; }

      const pct = (coveredFns / totalFns) * 100;
      const score = Math.round(pct);

      return {
        status: this.scoreToStatus(score, 80, 60),
        label: 'Test Coverage',
        value: `${pct.toFixed(1)}% functions`,
        score,
        details: `${coveredFns}/${totalFns} functions across ${projectFiles.length} files (V8)`,
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Coverage Breakdown (per-file details for issue creation)
  // --------------------------------------------------------------------------

  getOutdatedDeps(): OutdatedDependency[] {
    return this.lastOutdatedDeps;
  }

  getCoverageBreakdown(threshold = 80, workspaceRoot?: string): CoverageFileDetail[] {
    workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) { return []; }

    // Try Istanbul/nyc json-summary in common locations
    const candidates = [
      path.join(workspaceRoot, 'coverage', 'coverage-summary.json'),
      path.join(workspaceRoot, '.nyc_output', 'coverage-summary.json'),
      path.join(workspaceRoot, 'coverage-summary.json'),
    ];
    for (const summaryPath of candidates) {
      if (fs.existsSync(summaryPath)) {
        return this.getIstanbulBreakdown(summaryPath, workspaceRoot, threshold);
      }
    }

    // Try Python pytest-cov
    const pytestBreakdown = this.getPytestBreakdown(workspaceRoot, threshold);
    if (pytestBreakdown.length > 0) { return pytestBreakdown; }

    // Try V8
    return this.getV8Breakdown(workspaceRoot, threshold);
  }

  private getPytestBreakdown(workspaceRoot: string, threshold: number): CoverageFileDetail[] {
    const candidates = [
      path.join(workspaceRoot, 'coverage.json'),
      path.join(workspaceRoot, 'coverage', 'coverage.json'),
    ];
    for (const covPath of candidates) {
      if (!fs.existsSync(covPath)) { continue; }
      try {
        const data = JSON.parse(fs.readFileSync(covPath, 'utf-8'));
        if (!data.files) { continue; }
        const details: CoverageFileDetail[] = [];
        for (const [filePath, entry] of Object.entries(data.files)) {
          const e = entry as { summary?: { percent_covered?: number; covered_lines?: number; num_statements?: number } };
          const pct = e.summary?.percent_covered ?? 100;
          if (pct < threshold) {
            details.push({
              filePath,
              linePct: Math.round(pct * 10) / 10,
              branchPct: 0,
              functionPct: 0,
              uncoveredFunctions: [],
            });
          }
        }
        return details.sort((a, b) => a.linePct - b.linePct);
      } catch { /* try next */ }
    }
    return [];
  }

  private getIstanbulBreakdown(filePath: string, workspaceRoot: string, threshold: number): CoverageFileDetail[] {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const details: CoverageFileDetail[] = [];

      for (const [key, entry] of Object.entries(data)) {
        if (key === 'total') { continue; }
        const e = entry as Record<string, { pct: number; covered?: number; total?: number }>;
        const linePct = e.lines?.pct ?? 100;
        const branchPct = e.branches?.pct ?? 100;
        const functionPct = e.functions?.pct ?? 100;

        if (linePct < threshold || functionPct < threshold) {
          const relativePath = key.startsWith(workspaceRoot)
            ? key.slice(workspaceRoot.length + 1)
            : key;

          details.push({
            filePath: relativePath,
            linePct: Math.round(linePct * 10) / 10,
            branchPct: Math.round(branchPct * 10) / 10,
            functionPct: Math.round(functionPct * 10) / 10,
            uncoveredFunctions: [],
          });
        }
      }

      return details.sort((a, b) => a.linePct - b.linePct);
    } catch {
      return [];
    }
  }

  private getV8Breakdown(workspaceRoot: string, threshold: number): CoverageFileDetail[] {
    const tmpDir = path.join(workspaceRoot, 'coverage', 'tmp');
    if (!fs.existsSync(tmpDir)) { return []; }

    try {
      const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
      if (files.length === 0) { return []; }

      const latest = files
        .map(f => ({ name: f, mtime: fs.statSync(path.join(tmpDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)[0];

      const data = JSON.parse(fs.readFileSync(path.join(tmpDir, latest.name), 'utf-8'));
      const results: { url: string; functions: { functionName: string; ranges: { count: number }[] }[] }[] = data.result ?? [];

      const projectPrefix = `file://${workspaceRoot}`;
      const projectFiles = results.filter(r =>
        r.url.startsWith(projectPrefix) &&
        !r.url.includes('/node_modules/') &&
        !r.url.includes('/test/') &&
        !r.url.includes('/__tests__/')
      );

      const details: CoverageFileDetail[] = [];

      for (const file of projectFiles) {
        const totalFns = file.functions.length;
        if (totalFns === 0) { continue; }

        const uncovered: string[] = [];
        let coveredFns = 0;
        for (const fn of file.functions) {
          if (fn.ranges.some(r => r.count > 0)) {
            coveredFns++;
          } else if (fn.functionName) {
            uncovered.push(fn.functionName);
          }
        }

        const fnPct = (coveredFns / totalFns) * 100;
        if (fnPct < threshold) {
          const relativePath = file.url.slice(projectPrefix.length + 1);
          details.push({
            filePath: relativePath,
            linePct: Math.round(fnPct * 10) / 10,
            branchPct: -1,
            functionPct: Math.round(fnPct * 10) / 10,
            uncoveredFunctions: uncovered.slice(0, 10),
          });
        }
      }

      return details.sort((a, b) => a.functionPct - b.functionPct);
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Complexity (pmat or local report fallback)
  // --------------------------------------------------------------------------

  private async collectComplexity(pmatInstalled: boolean, workspaceRoot?: string): Promise<MetricResult> {
    if (!workspaceRoot) {
      return this.unknownMetric('Cyclomatic Complexity', 'No workspace open');
    }

    // Use pmat if available
    if (pmatInstalled) {
      const result = await this.pmatService.analyzeComplexity(workspaceRoot);
      if (result) {
        const max = result.maxComplexity;
        const score = max <= 10 ? 100 : max <= 15 ? 70 : Math.max(0, 100 - (max - 10) * 5);
        const statusWord = max <= 10 ? 'Good' : max <= 15 ? 'Moderate' : max <= 20 ? 'High' : 'Critical';
        const hotspotDetails = result.hotspots.slice(0, 3)
          .map(h => {
            const shortFile = h.file.split('/').pop() || h.file;
            return `${shortFile}:${h.function} (${h.complexity})`;
          })
          .join(', ');
        return {
          status: this.scoreToStatus(score),
          label: 'Complexity',
          value: `${statusWord} — max ${max} across ${result.totalFunctions} functions`,
          score,
          details: hotspotDetails ? `Hotspots: ${hotspotDetails}` : undefined,
          lastUpdated: new Date().toISOString(),
        };
      }
    }

    // Fallback: check for local complexity-report.json
    const reportPath = path.join(workspaceRoot, 'complexity-report.json');
    if (fs.existsSync(reportPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        const maxComplexity = data.maxComplexity ?? data.max ?? -1;
        if (maxComplexity >= 0) {
          const score = maxComplexity <= 10 ? 100 : maxComplexity <= 15 ? 70 : Math.max(0, 100 - (maxComplexity - 10) * 5);
          return {
            status: maxComplexity <= 10 ? 'green' : maxComplexity <= 15 ? 'yellow' : 'red',
            label: 'Cyclomatic Complexity',
            value: `Max: ${maxComplexity}`,
            score,
            details: data.filesAboveThreshold ? `${data.filesAboveThreshold} files above threshold` : undefined,
            lastUpdated: new Date().toISOString(),
          };
        }
      } catch { /* fall through */ }
    }

    return this.unknownMetric('Cyclomatic Complexity', pmatInstalled ? 'Analysis failed' : 'Install pmat for local analysis');
  }

  // --------------------------------------------------------------------------
  // Technical Debt (pmat only)
  // --------------------------------------------------------------------------

  private async collectTechnicalDebt(pmatInstalled: boolean, workspaceRoot?: string): Promise<MetricResult> {
    if (!pmatInstalled) {
      return this.unknownMetric('Technical Debt', 'Install pmat for debt analysis');
    }
    if (!workspaceRoot) {
      return this.unknownMetric('Technical Debt', 'No workspace open');
    }

    const result = await this.pmatService.analyzeTechDebt(workspaceRoot);
    if (!result) {
      return this.unknownMetric('Technical Debt', 'Analysis failed');
    }

    const score = Math.max(0, Math.min(100, result.score));
    const statusWord = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Work';
    const gradeBreakdown = result.categories
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(c => `${c.count} ${c.category}`)
      .join(', ');

    return {
      status: this.scoreToStatus(score),
      label: 'Technical Debt',
      value: `${statusWord} — ${score}/100 across ${result.totalItems} files`,
      score,
      details: gradeBreakdown || undefined,
      lastUpdated: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // CI/CD Health
  // --------------------------------------------------------------------------

  private async collectCiCdHealth(repo: RepoInfo): Promise<MetricResult> {
    const runs = await this.githubService.getWorkflowRuns(repo.owner, repo.repo);

    if (runs.length === 0) {
      return this.unknownMetric('CI/CD Health', 'No workflow runs found');
    }

    const passing = runs.filter(r => r.status === 'success').length;
    const failing = runs.filter(r => r.status === 'failure').length;
    const pending = runs.filter(r => r.status === 'pending').length;

    const score = Math.max(0, Math.round((passing / runs.length) * 100));
    let status: MetricStatus = 'green';
    if (failing > 0) { status = 'red'; }
    else if (pending > 0) { status = 'yellow'; }

    return {
      status,
      label: 'CI/CD Health',
      value: `${passing}/${runs.length} workflows passing`,
      score,
      details: [
        failing > 0 ? `${failing} failing` : '',
        pending > 0 ? `${pending} pending` : '',
      ].filter(Boolean).join(', ') || undefined,
      lastUpdated: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // SDLC Completeness (synchronous, local filesystem)
  // --------------------------------------------------------------------------

  collectSdlcCompleteness(workspaceRoot?: string): SdlcCompletenessItem[] {
    workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) { return []; }

    return SDLC_FILES.map(f => ({
      label: f.label,
      present: fs.existsSync(path.join(workspaceRoot, f.path)),
      path: f.path,
    }));
  }

  // --------------------------------------------------------------------------
  // Fitness Tests — detect committed fitness-function tests by convention.
  // Detect the test, never run the gate; the ratchet numbers come from the
  // committed tests/fitness/baselines.json (the test maintains them).
  // --------------------------------------------------------------------------

  /** Convention paths per category. Slice: `duplicate` only, registry-shaped. */
  private static readonly FITNESS_CATEGORIES: ReadonlyArray<{
    category: string; group: 'structural' | 'runtime'; unit: string; paths: string[];
  }> = [
    {
      category: 'duplicate', group: 'structural', unit: '%',
      paths: [
        'tests/fitness/duplicate.test.ts', 'tests/fitness/duplicate.test.js',
        'tests/fitness/duplicate.test.tsx', 'tests/fitness/test_duplicate.py',
      ],
    },
  ];

  collectFitnessTests(workspaceRoot?: string): FitnessTestResult[] {
    workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) { return []; }
    const root = workspaceRoot;
    const baselines = this.readFitnessBaselines(root);

    return ScorecardService.FITNESS_CATEGORIES.map(c => {
      const testPath = c.paths.find(p => fs.existsSync(path.join(root, p)));
      const b = baselines[c.category] || {};
      return {
        category: c.category,
        group: c.group,
        unit: c.unit,
        status: testPath ? 'present' as const : 'absent' as const,
        testPath,
        floor: typeof b.floor === 'number' ? b.floor : undefined,
        target: typeof b.target === 'number' ? b.target : undefined,
        measured: typeof b.measured === 'number' ? b.measured : undefined,
      };
    });
  }

  /** Read the committed ratchet file (governance-managed, agent-read-only). */
  private readFitnessBaselines(root: string): Record<string, { floor?: number; target?: number; measured?: number }> {
    const p = path.join(root, 'tests', 'fitness', 'baselines.json');
    if (!fs.existsSync(p)) { return {}; }
    try {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch { return {}; }
  }

  // --------------------------------------------------------------------------
  // OWASP Issue Breakdown
  // --------------------------------------------------------------------------

  private async collectOwaspIssues(repo: RepoInfo): Promise<OwaspIssueSummary[]> {
    // Fetch all open issues in one call and count by OWASP label
    const allIssues: Array<{ labels: { name: string }[] }> = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 3) {
      const result = await this.githubService.listIssues(repo.owner, repo.repo, page, 100);
      allIssues.push(...result.issues);
      hasMore = result.hasMore;
      page++;
    }

    const summaries: OwaspIssueSummary[] = [];
    for (const owasp of OWASP_LABELS) {
      const count = allIssues.filter(issue =>
        issue.labels.some(l => l.name === owasp.label)
      ).length;
      if (count > 0) {
        summaries.push({
          category: owasp.category,
          displayName: owasp.displayName,
          openCount: count,
        });
      }
    }

    return summaries;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private unknownMetric(label: string, value: string): MetricResult {
    return { status: 'unknown', label, value, score: -1, lastUpdated: new Date().toISOString() };
  }

  private extractResult(result: PromiseSettledResult<MetricResult>, fallbackLabel: string): MetricResult {
    if (result.status === 'fulfilled') { return result.value; }
    return this.unknownMetric(fallbackLabel, 'Failed to collect');
  }

  private extractOwaspResult(result: PromiseSettledResult<OwaspIssueSummary[]>): OwaspIssueSummary[] {
    return result.status === 'fulfilled' ? result.value : [];
  }

  private scoreToStatus(score: number, greenThreshold = 90, yellowThreshold = 60): MetricStatus {
    if (score >= greenThreshold) { return 'green'; }
    if (score >= yellowThreshold) { return 'yellow'; }
    return 'red';
  }

  computeGrade(score: number): HealthGrade {
    if (score < 0) { return '?'; }
    if (score >= 90) { return 'A'; }
    if (score >= 75) { return 'B'; }
    if (score >= 60) { return 'C'; }
    if (score >= 40) { return 'D'; }
    return 'F';
  }
}
