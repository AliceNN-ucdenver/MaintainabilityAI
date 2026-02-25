import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { ScorecardWebviewMessage, ScorecardExtensionMessage, RepoInfo, ScorecardData } from '../types';
import { toErrorMessage } from '../utils/errors';
import { GitHubService } from '../services/GitHubService';
import { AgentStatusService } from '../services/AgentStatusService';
import { PromptPackService } from '../services/PromptPackService';
import { PmatService } from '../services/PmatService';
import { ScorecardService } from '../services/ScorecardService';
import { ScorecardHistoryService } from '../services/ScorecardHistoryService';
import { TechStackDetector } from '../services/TechStackDetector';
import { FolderStateService } from '../services/FolderStateService';
import { IssueCreatorPanel } from './IssueCreatorPanel';
import { generateAliceRemediationWorkflow } from '../templates/scaffoldTemplates';
import { execFileAsync } from '../utils/exec';
import { getNonce } from '../utils/getNonce';
import { BasePanel } from './BasePanel';
import { getSharedStyles } from './styles';

export class ScorecardPanel extends BasePanel<ScorecardWebviewMessage, ScorecardExtensionMessage> {
  public static currentPanel: ScorecardPanel | undefined;
  private static readonly viewType = 'maintainabilityai.scorecard';

  private readonly githubService: GitHubService;
  private readonly agentStatusService: AgentStatusService;
  private readonly pmatService: PmatService;
  private readonly scorecardService: ScorecardService;
  private readonly historyService: ScorecardHistoryService;
  private readonly techStackDetector: TechStackDetector;
  private currentRepo: RepoInfo | undefined;
  private lastData: ScorecardData | undefined;
  private detectedPackageManager = 'Unknown';
  private detectedTesting = 'Unknown';
  private selectedFolderPath: string | undefined;
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  public static createOrShow(context: vscode.ExtensionContext, folderPath?: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ScorecardPanel.currentPanel) {
      ScorecardPanel.currentPanel.panel.reveal(column);
      // Switch to the requested folder if provided
      if (folderPath) {
        ScorecardPanel.currentPanel.onSwitchFolder(folderPath);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ScorecardPanel.viewType,
      'MaintainabilityAI \u2014 Security Scorecard',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    const inst = new ScorecardPanel(panel, context);
    if (folderPath) { inst.selectedFolderPath = folderPath; }
    ScorecardPanel.currentPanel = inst;
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    super(panel, context);
    this.githubService = new GitHubService();
    this.agentStatusService = new AgentStatusService(this.githubService);
    this.pmatService = new PmatService();
    const promptPackService = new PromptPackService(context.extensionPath);
    this.scorecardService = new ScorecardService(this.githubService, promptPackService, this.pmatService);
    this.historyService = new ScorecardHistoryService(context.workspaceState);
    this.techStackDetector = new TechStackDetector();

    // Update folder dropdown when workspace folders change
    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.sendWorkspaceFolders(this.selectedFolderPath);
      }),
      FolderStateService.getInstance().onDidChangeFolder(newFolder => {
        if (newFolder !== this.selectedFolderPath) {
          this.refreshForFolder(newFolder);
        }
      })
    );
  }

  protected async handleMessage(message: ScorecardWebviewMessage) {
    switch (message.type) {
      case 'ready':
        await this.onReady();
        break;
      case 'refresh':
        await this.onRefresh();
        break;
      case 'openUrl':
        vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;
      case 'runCommand':
        vscode.commands.executeCommand(message.command);
        break;
      case 'openScaffold':
        // Pass the currently selected folder so scaffold targets the right repo
        vscode.commands.executeCommand('maintainabilityai.scaffoldRepo', this.selectedFolderPath);
        break;
      case 'configureSecrets':
        vscode.commands.executeCommand('maintainabilityai.configureSecrets', 'workspace', this.selectedFolderPath);
        break;
      case 'installPmat':
        await this.onInstallPmat();
        break;
      case 'addressTechDebt':
        this.onAddressTechDebt();
        break;
      case 'reduceComplexity':
        await this.onReduceComplexity();
        break;
      case 'refreshDeps':
        this.onRefreshDeps();
        break;
      case 'runCoverage':
        this.onRunCoverage();
        break;
      case 'improveCoverage':
        this.onImproveCoverage();
        break;
      case 'improveDeps':
        this.onImproveDeps();
        break;
      case 'createFeature':
        IssueCreatorPanel.createOrShow(this.context, '', undefined, this.currentRepo?.remoteUrl, undefined, this.selectedFolderPath);
        break;
      case 'checkAliceWorkflowStatus':
        await this.onCheckAliceWorkflowStatus();
        break;
      case 'deployAliceWorkflow':
        await this.onDeployAliceWorkflow();
        break;
      case 'listModels':
        await this.onListModels();
        break;
      case 'savePreferredModel':
        await this.onSavePreferredModel(message.family);
        break;
      case 'switchFolder':
        await this.onSwitchFolder(message.folderPath);
        break;
      case 'checkSync':
        await this.onCheckSync();
        break;
      case 'syncRepo':
        await this.onSyncRepo();
        break;
      case 'pushRepo':
        await this.onPushRepo();
        break;
      case 'commitAndPush':
        await this.onCommitAndPush();
        break;
    }
  }

  private async onReady() {
    if (!this.selectedFolderPath) {
      this.selectedFolderPath = FolderStateService.getInstance().getSelectedFolder();
    }
    // Persist selection so other panels pick it up
    if (this.selectedFolderPath) {
      FolderStateService.getInstance().setSelectedFolder(this.selectedFolderPath);
    }

    this.sendWorkspaceFolders(this.selectedFolderPath);

    if (this.selectedFolderPath) {
      const repo = await this.githubService.detectRepoForFolder(this.selectedFolderPath);
      if (repo) {
        this.currentRepo = repo;
        this.postMessage({ type: 'repoDetected', repo });
      }
    } else {
      const repo = await this.githubService.detectRepo();
      if (repo) {
        this.currentRepo = repo;
        this.postMessage({ type: 'repoDetected', repo });
      }
    }

    const stack = await this.techStackDetector.detect();
    this.detectedPackageManager = stack.packageManager;
    this.detectedTesting = stack.testing;
    this.postMessage({
      type: 'techStackInfo',
      packageManager: stack.packageManager,
      testing: stack.testing,
    });

    await this.onRefresh();
    this.onCheckSync();

    // Query GitHub for agent status, then poll every 30s
    if (this.currentRepo) {
      this.checkForActiveIssues();
    }
    this.startPolling();
  }

  private startPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); }
    this.pollTimer = setInterval(() => {
      if (this.currentRepo) {
        this.checkForActiveIssues();
        this.onCheckSync();
      }
    }, 30_000);
  }

  private sendWorkspaceFolders(selectedPath?: string) {
    // Filter out workspace-container folders (e.g. the White Rabbit workspace root
    // that only contains a .code-workspace file and no git repo).
    const folders = (vscode.workspace.workspaceFolders || [])
      .filter(f => {
        try {
          return fs.existsSync(path.join(f.uri.fsPath, '.git'));
        } catch { return true; } // If we can't check, include it
      })
      .map(f => ({
        name: f.name,
        path: f.uri.fsPath,
      }));
    this.postMessage({ type: 'workspaceFolders', folders, ...(selectedPath ? { selectedPath } : {}) });
  }

  /** Called by the webview dropdown — writes shared state then refreshes. */
  private async onSwitchFolder(folderPath: string) {
    FolderStateService.getInstance().setSelectedFolder(folderPath);
    await this.refreshForFolder(folderPath);
  }

  /** Called by FolderStateService event (external change) — does NOT write back. */
  private async refreshForFolder(folderPath: string) {
    this.selectedFolderPath = folderPath;
    this.postMessage({ type: 'loading', active: true, message: 'Switching workspace...' });
    this.sendWorkspaceFolders(folderPath);

    const repo = await this.githubService.detectRepoForFolder(folderPath);
    this.currentRepo = repo || undefined;
    if (repo) {
      this.postMessage({ type: 'repoDetected', repo });
    }

    await this.onRefresh();

    // Immediately check agent status and sync for the new folder
    if (this.currentRepo) {
      this.checkForActiveIssues();
    }
    this.onCheckSync();
  }

  private async onCheckSync() {
    const cwd = this.selectedFolderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) { return; }
    try {
      // Fetch latest from remote
      await execFileAsync('git', ['fetch'], { cwd, timeout: 15_000 });
      // Get current branch
      const { stdout: branchOut } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
      const branch = branchOut.trim();
      // Count commits behind and ahead of remote tracking branch
      const { stdout: revList } = await execFileAsync(
        'git', ['rev-list', '--left-right', '--count', `${branch}...origin/${branch}`],
        { cwd }
      );
      const parts = revList.trim().split(/\s+/);
      const ahead = parseInt(parts[0] || '0', 10);
      const behind = parseInt(parts[1] || '0', 10);
      // Check for uncommitted changes (dirty working tree)
      let dirty = false;
      try {
        const { stdout: status } = await execFileAsync('git', ['status', '--porcelain'], { cwd, timeout: 5000 });
        dirty = status.trim().length > 0;
      } catch { /* ignore */ }
      this.postMessage({ type: 'syncStatus', behind, ahead, branch, dirty });
    } catch {
      // No remote tracking branch or git not available — silently ignore
    }
  }

  private async onSyncRepo() {
    const cwd = this.selectedFolderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) { return; }
    try {
      await execFileAsync('git', ['pull', '--ff-only'], { cwd, timeout: 30_000 });
      this.postMessage({ type: 'repoSynced' });
      // Re-check sync status after pull
      await this.onCheckSync();
      // Refresh scorecard with new code
      await this.onRefresh();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Sync failed: ${toErrorMessage(err)}. Try pulling manually.`,
      });
    }
  }

  private async onPushRepo() {
    const cwd = this.selectedFolderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) { return; }
    try {
      await execFileAsync('git', ['push'], { cwd, timeout: 30_000 });
      this.postMessage({ type: 'repoSynced' });
      await this.onCheckSync();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Push failed: ${toErrorMessage(err)}. Try pushing manually.`,
      });
    }
  }

  private async onCommitAndPush() {
    const cwd = this.selectedFolderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) { return; }
    try {
      this.postMessage({ type: 'loading', active: true, message: 'Committing and pushing...' });
      await execFileAsync('git', ['add', '-A'], { cwd, timeout: 10_000 });
      await execFileAsync('git', ['commit', '-m', 'chore: add MaintainabilityAI scaffold files\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd, timeout: 10_000 });
      await execFileAsync('git', ['push'], { cwd, timeout: 30_000 });
      this.postMessage({ type: 'repoSynced' });
      await this.onCheckSync();
      await this.onRefresh();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Commit & push failed: ${toErrorMessage(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  /** Query GitHub for agent status (issues, PRs, workflow approval). */
  private async checkForActiveIssues() {
    if (!this.currentRepo) { return; }
    try {
      const status = await this.agentStatusService.detectForRepo(
        this.currentRepo.owner, this.currentRepo.repo
      );
      this.postMessage({ type: 'agentStatusUpdate', status });
    } catch {
      // Best effort — don't block scorecard load
    }
  }

  private async onRefresh() {
    this.pmatService.clearCache();
    this.postMessage({ type: 'loading', active: true, message: 'Collecting metrics...' });
    try {
      const data = await this.scorecardService.collectAll(this.currentRepo || null, this.selectedFolderPath);
      this.lastData = data;
      await this.historyService.addSnapshot(data);
      this.postMessage({ type: 'scorecardData', data });
      this.postMessage({
        type: 'historyData',
        history: this.historyService.getHistory(),
        trends: this.historyService.getAllTrends(),
      });
    } catch (err) {
      const msg = toErrorMessage(err);
      this.postMessage({ type: 'error', message: msg });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onInstallPmat() {
    const steps = await this.pmatService.getInstallSteps();

    // Run install steps sequentially — each in a fresh terminal
    // (Rust install requires a new shell to pick up PATH changes)
    this.runInstallStep(steps, 0);
  }

  private runInstallStep(steps: { command: string; label: string }[], index: number) {
    if (index >= steps.length) {
      // All steps done — re-detect and refresh
      this.pmatService.clearCache();
      void this.pmatService.isInstalled().then(installed => {
        this.postMessage({ type: 'pmatStatusUpdate', installed });
        if (installed) { void this.onRefresh(); }
      });
      return;
    }

    const step = steps[index];
    const terminal = vscode.window.createTerminal({ name: step.label });
    terminal.show();
    terminal.sendText(step.command);

    const disposable = vscode.window.onDidCloseTerminal(async (closed) => {
      if (closed === terminal) {
        disposable.dispose();
        // Move to next step in a fresh terminal
        this.runInstallStep(steps, index + 1);
      }
    });
    this.disposables.push(disposable);
  }

  private onRefreshDeps() {
    // --target minor: only bump minor/patch versions (no breaking major changes)
    // Users can create .ncurc.json with { "reject": ["pkg"] } to pin specific packages
    const commands: Record<string, string> = {
      npm: 'npx npm-check-updates -u --target minor && npm install',
      yarn: 'yarn upgrade --pattern "*" --latest',
      pnpm: 'pnpm update',
      bun: 'bun update',
      pip: 'pip install --upgrade -r requirements.txt',
      uv: 'uv sync --upgrade',
      poetry: 'poetry update',
      pipenv: 'pipenv update',
    };

    const cmd = commands[this.detectedPackageManager] || 'npx npm-check-updates -u --target minor && npm install';
    this.runInTerminalThenRefresh('Refresh Dependencies', cmd);
  }

  private onRunCoverage() {
    const workspaceRoot = this.selectedFolderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const cmd = this.detectCoverageCommand(workspaceRoot);
    this.runInTerminalThenRefresh('Run Coverage', cmd);
  }

  /**
   * Read package.json / pyproject.toml to determine the best coverage command.
   * Priority:
   *   1. Existing script named "test:coverage" or "coverage" in package.json
   *   2. Coverage tool in devDependencies (nyc, c8, jest, vitest, pytest-cov)
   *   3. Fallback based on detected test framework / package manager
   */
  private detectCoverageCommand(workspaceRoot?: string): string {
    if (!workspaceRoot) { return 'npm test -- --coverage'; }

    // ── Python projects ──
    const pyprojectPath = path.join(workspaceRoot, 'pyproject.toml');
    const setupCfgPath = path.join(workspaceRoot, 'setup.cfg');
    const requirementsPath = path.join(workspaceRoot, 'requirements.txt');
    const hasPyproject = fs.existsSync(pyprojectPath);
    const hasSetupCfg = fs.existsSync(setupCfgPath);
    const hasRequirements = fs.existsSync(requirementsPath);

    if (hasPyproject || hasSetupCfg) {
      // Detect runner from pyproject.toml
      if (hasPyproject) {
        try {
          const pyContent = fs.readFileSync(pyprojectPath, 'utf-8');
          // Check for poetry
          if (pyContent.includes('[tool.poetry]')) {
            return 'poetry run pytest --cov --cov-report=json --cov-report=term';
          }
          // Check for pytest-cov config
          if (pyContent.includes('pytest-cov') || pyContent.includes('[tool.pytest')) {
            return 'python -m pytest --cov --cov-report=json --cov-report=term';
          }
        } catch { /* fall through */ }
      }
      // Generic Python
      return 'python -m pytest --cov --cov-report=json --cov-report=term';
    }

    if (hasRequirements) {
      try {
        const reqContent = fs.readFileSync(requirementsPath, 'utf-8');
        if (reqContent.includes('pytest-cov') || reqContent.includes('coverage')) {
          return 'python -m pytest --cov --cov-report=json --cov-report=term';
        }
      } catch { /* fall through */ }
    }

    // ── Node.js / TypeScript projects ──
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) { return 'npm test -- --coverage'; }

    let pkg: { scripts?: Record<string, string>; devDependencies?: Record<string, string>; dependencies?: Record<string, string> };
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      return 'npm test -- --coverage';
    }

    const scripts = pkg.scripts || {};
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    // 1. Prefer existing coverage script — append nyc/c8 report step to ensure json-summary is generated
    if (scripts['test:coverage']) {
      const runner = allDeps['yarn'] ? 'yarn' : allDeps['pnpm'] ? 'pnpm' : 'npm';
      const base = `${runner} run test:coverage`;
      if (allDeps['nyc']) { return `${base} && npx nyc report --report-dir=coverage --reporter=json-summary`; }
      if (allDeps['c8']) { return `${base} && npx c8 report -o coverage --reporter=json-summary`; }
      return base;
    }
    if (scripts['coverage']) {
      const runner = allDeps['yarn'] ? 'yarn' : allDeps['pnpm'] ? 'pnpm' : 'npm';
      const base = `${runner} run coverage`;
      if (allDeps['nyc']) { return `${base} && npx nyc report --report-dir=coverage --reporter=json-summary`; }
      if (allDeps['c8']) { return `${base} && npx c8 report -o coverage --reporter=json-summary`; }
      return base;
    }

    // 2. Detect from devDependencies — pick the coverage tool that's actually installed
    const hasNyc = !!allDeps['nyc'];
    const hasC8 = !!allDeps['c8'];
    const hasJest = !!allDeps['jest'];
    const hasVitest = !!allDeps['vitest'];
    const hasMocha = !!allDeps['mocha'];

    // jest and vitest have built-in coverage
    if (hasJest) {
      return 'npx jest --coverage --coverageReporters=json-summary --coverageReporters=text';
    }
    if (hasVitest) {
      return 'npx vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=text --coverage.reportsDirectory=coverage';
    }
    // mocha needs an external coverage tool
    if (hasMocha && hasNyc) {
      return 'npx nyc --report-dir=coverage --reporter=json-summary --reporter=text mocha --recursive --exit';
    }
    if (hasMocha && hasC8) {
      return 'npx c8 -o coverage --reporter=json-summary --reporter=text mocha --recursive --exit';
    }
    if (hasMocha) {
      // No coverage tool installed — use c8 (zero-config V8 coverage)
      return 'npx c8 -o coverage --reporter=json-summary --reporter=text mocha --recursive --exit';
    }
    // Standalone nyc or c8 with npm test
    if (hasNyc) {
      const testCmd = scripts['test'] || 'echo "no test script"';
      return `npx nyc --report-dir=coverage --reporter=json-summary --reporter=text ${testCmd}`;
    }
    if (hasC8) {
      const testCmd = scripts['test'] || 'echo "no test script"';
      return `npx c8 -o coverage --reporter=json-summary --reporter=text ${testCmd}`;
    }

    // 3. Fallback based on detected package manager
    const pmFallbacks: Record<string, string> = {
      pip: 'python -m pytest --cov --cov-report=json --cov-report=term',
      uv: 'uv run pytest --cov --cov-report=json --cov-report=term',
      poetry: 'poetry run pytest --cov --cov-report=json --cov-report=term',
      pipenv: 'pipenv run pytest --cov --cov-report=json --cov-report=term',
    };
    if (pmFallbacks[this.detectedPackageManager]) {
      return pmFallbacks[this.detectedPackageManager];
    }

    // Last resort — pass --coverage and hope the runner supports it
    if (allDeps['nyc']) { return `npx nyc --report-dir=coverage --reporter=json-summary --reporter=text npm test`; }
    if (allDeps['c8']) { return `npx c8 -o coverage --reporter=json-summary --reporter=text npm test`; }
    return 'npm test -- --coverage';
  }

  private runInTerminalThenRefresh(name: string, cmd: string) {
    const cwd = this.selectedFolderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const terminal = vscode.window.createTerminal({ name, cwd });
    terminal.show();
    terminal.sendText(cmd);

    const disposable = vscode.window.onDidCloseTerminal((closed) => {
      if (closed === terminal) {
        disposable.dispose();
        void this.onRefresh();
      }
    });
    this.disposables.push(disposable);
  }

  private onImproveCoverage() {
    const breakdown = this.scorecardService.getCoverageBreakdown(80);
    if (breakdown.length === 0) {
      vscode.window.showInformationMessage('No files below 80% coverage — run tests with coverage first.');
      return;
    }

    const lines: string[] = [];
    lines.push('## Test Coverage — Files Below 80%\n');
    lines.push(`${breakdown.length} file(s) need improved coverage:\n`);

    for (const f of breakdown) {
      const pcts = [`${f.linePct}% lines`];
      if (f.branchPct >= 0) { pcts.push(`${f.branchPct}% branches`); }
      if (f.functionPct >= 0) { pcts.push(`${f.functionPct}% functions`); }

      lines.push(`### ${f.filePath}  (${pcts.join(', ')})`);
      if (f.uncoveredFunctions.length > 0) {
        lines.push('Uncovered functions:');
        for (const fn of f.uncoveredFunctions) {
          lines.push(`- \`${fn}\``);
        }
      }
      lines.push('');
    }

    const coveragePacks = {
      owasp: [] as string[],
      maintainability: ['fitness-functions'],
      threatModeling: [] as string[],
    };

    IssueCreatorPanel.createOrShow(this.context, lines.join('\n'), coveragePacks, this.currentRepo?.remoteUrl, undefined, this.selectedFolderPath);
  }

  private onImproveDeps() {
    const outdated = this.scorecardService.getOutdatedDeps();
    if (outdated.length === 0) {
      vscode.window.showInformationMessage('No outdated dependencies detected — refresh the scorecard first.');
      return;
    }

    const lines: string[] = [];
    lines.push('## Dependency Freshness — Outdated Packages\n');
    lines.push(`${outdated.length} package(s) have not been updated in over 90 days:\n`);
    lines.push('| Package | Current Version | Days Since Last Publish |');
    lines.push('|---------|----------------|------------------------|');
    for (const dep of outdated) {
      lines.push(`| \`${dep.name}\` | ${dep.currentVersion} | ${dep.ageDays} days |`);
    }
    lines.push('');
    lines.push('### Instructions');
    lines.push('- Update each package to the latest compatible version');
    lines.push('- Run the full test suite after each update to ensure nothing breaks');
    lines.push('- If a major version bump is required, review the changelog for breaking changes');
    lines.push('- Ensure all tests pass before marking complete');

    const depPacks = {
      owasp: ['A06_vulnerable_components'] as string[],
      maintainability: ['fitness-functions'] as string[],
      threatModeling: [] as string[],
    };

    IssueCreatorPanel.createOrShow(this.context, lines.join('\n'), depPacks, this.currentRepo?.remoteUrl, undefined, this.selectedFolderPath);
  }

  private async onReduceComplexity() {
    const workspaceRoot = this.selectedFolderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showWarningMessage('No workspace open.');
      return;
    }

    const result = await this.pmatService.analyzeComplexity(workspaceRoot);
    if (!result || result.hotspots.length === 0) {
      vscode.window.showInformationMessage('No complexity hotspots found — all functions are within threshold.');
      return;
    }

    const lines: string[] = [];
    const statusWord = result.maxComplexity <= 10 ? 'Good' : result.maxComplexity <= 15 ? 'Moderate' : result.maxComplexity <= 20 ? 'High' : 'Critical';
    lines.push('## Cyclomatic Complexity — Reduce Hotspots\n');
    lines.push(`**${statusWord}** — max complexity **${result.maxComplexity}** across ${result.totalFunctions} functions.`);
    lines.push(`Target: all functions ≤ 10 cyclomatic complexity.\n`);
    lines.push(`${result.hotspots.length} function(s) exceed the threshold:\n`);
    lines.push('| File | Function | Complexity |');
    lines.push('|------|----------|-----------|');
    for (const h of result.hotspots) {
      lines.push(`| \`${h.file}\` | \`${h.function}\` | ${h.complexity} |`);
    }
    lines.push('');
    lines.push('### Refactoring Guidance');
    lines.push('- Extract helper functions to break down large conditional blocks');
    lines.push('- Replace nested if/else chains with early returns or guard clauses');
    lines.push('- Use strategy or command patterns for complex switch statements');
    lines.push('- Consider decomposing functions with more than one responsibility');

    const complexityPacks = {
      owasp: [] as string[],
      maintainability: ['complexity-reduction', 'fitness-functions'],
      threatModeling: [] as string[],
    };

    IssueCreatorPanel.createOrShow(this.context, lines.join('\n'), complexityPacks, this.currentRepo?.remoteUrl, undefined, this.selectedFolderPath);
  }

  private async onAddressTechDebt() {
    const workspaceRoot = this.selectedFolderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showWarningMessage('No workspace open.');
      return;
    }

    // Use cached result from pmatService (same data that populated the scorecard)
    const result = await this.pmatService.analyzeTechDebt(workspaceRoot);
    if (!result || result.problemFiles.length === 0) {
      vscode.window.showInformationMessage('No files graded below B — nothing to address.');
      return;
    }

    const lines: string[] = [];
    lines.push('## Technical Debt — Files Below Grade B\n');
    lines.push(`Overall score: **${result.score}/100** across ${result.totalItems} files.`);
    lines.push(`${result.problemFiles.length} file(s) need attention:\n`);

    for (const f of result.problemFiles) {
      lines.push(`### ${f.filePath}  (${f.grade}, ${f.score}/100)`);
      if (f.issues.length > 0) {
        for (const issue of f.issues) {
          lines.push(`- ${issue}`);
        }
      }
      lines.push('');
    }

    const techDebtPacks = {
      owasp: [] as string[],
      maintainability: ['technical-debt', 'complexity-reduction', 'fitness-functions'],
      threatModeling: [] as string[],
    };

    IssueCreatorPanel.createOrShow(this.context, lines.join('\n'), techDebtPacks, this.currentRepo?.remoteUrl, undefined, this.selectedFolderPath);
  }

  // ---------------------------------------------------------------------------
  // Settings handlers
  // ---------------------------------------------------------------------------

  private async onCheckAliceWorkflowStatus() {
    if (!this.currentRepo) {
      this.postMessage({ type: 'aliceWorkflowStatus', exists: false });
      return;
    }
    try {
      const exists = await this.githubService.checkWorkflowExists(
        this.currentRepo.owner,
        this.currentRepo.repo,
        '.github/workflows/alice-remediation.yml',
      );
      this.postMessage({ type: 'aliceWorkflowStatus', exists });
    } catch {
      this.postMessage({ type: 'aliceWorkflowStatus', exists: false });
    }
  }

  private async onDeployAliceWorkflow() {
    const workspaceRoot = this.selectedFolderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      this.postMessage({ type: 'error', message: 'No workspace open.' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Deploying Alice Remediation workflow...' });

    try {
      // 1. Find git root
      let gitRoot: string | null = null;
      let dir = workspaceRoot;
      for (;;) {
        if (fs.existsSync(path.join(dir, '.git'))) { gitRoot = dir; break; }
        const parent = path.dirname(dir);
        if (parent === dir) { break; }
        dir = parent;
      }
      if (!gitRoot) {
        this.postMessage({ type: 'error', message: 'Workspace is not a git repository.' });
        return;
      }

      // 2. Pull latest
      try {
        await execFileAsync('git', ['pull', '--ff-only'], { cwd: gitRoot, timeout: 30_000 });
      } catch {
        try {
          await execFileAsync('git', ['pull', '--rebase'], { cwd: gitRoot, timeout: 30_000 });
        } catch {
          try { await execFileAsync('git', ['rebase', '--abort'], { cwd: gitRoot }); } catch { /* clean */ }
          this.postMessage({ type: 'error', message: 'Pull failed — resolve branch conflicts manually.' });
          return;
        }
      }

      // 3. Enable Actions PR permissions (non-fatal)
      if (this.currentRepo) {
        try {
          await execFileAsync('gh', [
            'api', `repos/${this.currentRepo.owner}/${this.currentRepo.repo}/actions/permissions/workflow`,
            '-X', 'PUT',
            '-f', 'default_workflow_permissions=write',
            '-F', 'can_approve_pull_request_reviews=true',
          ], { cwd: gitRoot, timeout: 30_000 });
        } catch { /* non-fatal */ }
      }

      // 4. Write workflow file
      const workflowDir = path.join(gitRoot, '.github', 'workflows');
      fs.mkdirSync(workflowDir, { recursive: true });
      const content = generateAliceRemediationWorkflow(this.context.extensionPath);
      fs.writeFileSync(path.join(workflowDir, 'alice-remediation.yml'), content, 'utf8');

      // 5. Surgical git add, commit, push
      await execFileAsync('git', ['add', '.github/workflows/alice-remediation.yml'], { cwd: gitRoot });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: gitRoot });
      if (diffCheck.trim()) {
        await execFileAsync('git', ['commit', '-m', 'chore: deploy alice-remediation workflow\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: gitRoot });
        await execFileAsync('git', ['push'], { cwd: gitRoot, timeout: 60_000 });
      }

      this.postMessage({ type: 'aliceWorkflowDeployed' });
      this.postMessage({ type: 'aliceWorkflowStatus', exists: true });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to deploy workflow: ${toErrorMessage(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onListModels() {
    try {
      const preferred = vscode.workspace
        .getConfiguration('maintainabilityai.llm')
        .get<string>('preferredFamily', 'gpt-4o');
      const allModels = await vscode.lm.selectChatModels();
      const models = allModels.map(m => ({
        id: m.id,
        family: m.family,
        name: m.name,
        vendor: m.vendor,
      }));
      this.postMessage({ type: 'availableModels', models, defaultFamily: preferred });
    } catch {
      // VS Code LM API not available — send empty list with current preference
      const preferred = vscode.workspace
        .getConfiguration('maintainabilityai.llm')
        .get<string>('preferredFamily', 'gpt-4o');
      this.postMessage({ type: 'availableModels', models: [], defaultFamily: preferred });
    }
  }

  private async onSavePreferredModel(family: string) {
    try {
      const config = vscode.workspace.getConfiguration('maintainabilityai');
      await config.update('llm.preferredFamily', family, vscode.ConfigurationTarget.Global);
      this.postMessage({ type: 'preferredModelSaved', family });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to save model preference: ${toErrorMessage(err)}`,
      });
    }
  }

  protected getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'scorecard.js')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>MaintainabilityAI \u2014 Security Scorecard</title>
  <style>
    ${getSharedStyles()}
    body { padding: 24px 32px; overflow-y: auto; }

    /* Header */
    .scorecard-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left h1 { font-size: 18px; font-weight: 600; }
    .header-left p { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
    .header-right { display: flex; align-items: center; gap: 8px; }
    .last-refreshed { font-size: 11px; color: var(--text-secondary); }

    /* Grade Card */
    .grade-card {
      display: flex; align-items: center; gap: 20px;
      padding: 20px 24px; border: 1px solid var(--border); border-radius: 8px;
      margin-bottom: 24px; background: var(--bg-secondary);
    }
    .grade-circle {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 800; flex-shrink: 0;
      border: 3px solid;
    }
    .grade-A, .grade-B { border-color: var(--success); color: var(--success); background: rgba(34, 197, 94, 0.1); }
    .grade-C { border-color: var(--running); color: var(--running); background: rgba(245, 158, 11, 0.1); }
    .grade-D, .grade-F { border-color: var(--error); color: var(--error); background: rgba(220, 38, 38, 0.1); }
    .grade-unknown { border-color: var(--text-secondary); color: var(--text-secondary); background: var(--bg-input); }
    .grade-info h2 { font-size: 16px; margin-bottom: 4px; }
    .grade-info p { font-size: 12px; color: var(--text-secondary); }
    .score-bar { width: 200px; height: 6px; background: var(--bg-input); border-radius: 3px; margin-top: 6px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }

    /* Metrics Grid */
    .metrics-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;
    }
    .metric-card {
      padding: 16px; border: 1px solid var(--border); border-radius: 6px;
      border-left: 3px solid var(--border); transition: border-color 0.15s;
    }
    .metric-card.green { border-left-color: var(--success); }
    .metric-card.yellow { border-left-color: var(--running); }
    .metric-card.red { border-left-color: var(--error); }
    .metric-card.unknown { border-left-color: var(--text-secondary); opacity: 0.7; }
    .metric-card.loading { opacity: 0.5; }
    .metric-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .metric-icon { font-size: 16px; }
    .metric-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-value { font-size: 14px; font-weight: 500; }
    .metric-details { font-size: 11px; color: var(--text-secondary); margin-top: 4px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .dot-green { background: var(--success); }
    .dot-yellow { background: var(--running); }
    .dot-red { background: var(--error); }
    .dot-unknown { background: var(--text-secondary); }

    /* Metric Card Hover Action */
    .metric-card.has-action { position: relative; overflow: hidden; }
    .metric-action-overlay {
      position: absolute; top: 0; right: 0; bottom: 0;
      display: flex; align-items: center; gap: 6px; padding: 0 12px;
      background: linear-gradient(90deg, transparent, var(--bg-secondary) 30%);
      opacity: 0; transform: translateX(20px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    }
    .metric-card.has-action:hover .metric-action-overlay {
      opacity: 1; transform: translateX(0); pointer-events: auto;
    }
    .btn-metric-action {
      padding: 5px 12px; font-size: 11px; font-weight: 600;
      border-radius: 4px; white-space: nowrap;
      background: var(--accent); color: var(--accent-fg);
      border: none; cursor: pointer; transition: background 0.15s;
    }
    .btn-metric-action:hover { background: var(--accent-hover); }

    /* Section Headers */
    .section-header {
      font-size: 13px; font-weight: 600; color: var(--text-secondary);
      text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px; padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    /* OWASP Breakdown */
    .owasp-list { margin-bottom: 24px; }
    .owasp-row {
      display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px;
    }
    .owasp-label {
      display: inline-block; padding: 1px 8px; border-radius: 10px;
      font-size: 10px; font-weight: 600; background: rgba(220, 38, 38, 0.15);
      color: var(--error); border: 1px solid rgba(220, 38, 38, 0.3);
    }
    .owasp-name { flex: 1; }
    .owasp-count { font-weight: 600; color: var(--text-secondary); }

    /* SDLC Completeness */
    .sdlc-list { margin-bottom: 24px; }
    .sdlc-progress { margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
    .sdlc-bar { flex: 1; height: 6px; background: var(--bg-input); border-radius: 3px; overflow: hidden; }
    .sdlc-fill { height: 100%; background: var(--success); border-radius: 3px; transition: width 0.5s; }
    .sdlc-pct { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .sdlc-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; }
    .sdlc-check { font-size: 14px; }
    .sdlc-path { color: var(--text-secondary); margin-left: auto; font-size: 11px; font-family: var(--vscode-editor-font-family); }

    /* Quick Actions */
    .quick-actions { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }

    .spinner { margin-bottom: 12px; }
    .skeleton { background: var(--bg-input); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }

    /* pmat install banner */
    .pmat-banner {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;
      background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3);
    }
    .pmat-banner-text { font-size: 12px; color: var(--text-primary); }
    .pmat-banner-text strong { color: var(--purple); }

    /* Trend indicators */
    .trend-up { color: var(--success); font-size: 10px; margin-left: 4px; }
    .trend-down { color: var(--error); font-size: 10px; margin-left: 4px; }
    .trend-stable { color: var(--text-secondary); font-size: 10px; margin-left: 4px; }

    /* Score History */
    .history-list { margin-bottom: 24px; }
    .history-row {
      display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 12px;
    }
    .history-score { font-weight: 600; min-width: 50px; }
    .history-grade { font-weight: 700; min-width: 20px; }
    .history-date { color: var(--text-secondary); }

    /* Create Feature Banner */
    .create-feature-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      margin-bottom: 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: rgba(124, 58, 237, 0.06);
      border-left: 3px solid var(--accent);
    }

    .sync-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      margin-bottom: 16px;
      border: 1px solid var(--warning, #e5a00d);
      border-radius: 8px;
      background: rgba(229, 160, 13, 0.08);
      border-left: 3px solid var(--warning, #e5a00d);
    }

    /* Empty state */
    .empty-state { text-align: center; padding: 40px; color: var(--text-secondary); }

    /* ---- Settings Gear ---- */
    .settings-gear {
      font-size: 16px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: color 0.15s, transform 0.15s;
      background: none;
      border: none;
      padding: 2px 6px;
      line-height: 1;
    }
    .settings-gear:hover {
      color: var(--accent);
      transform: rotate(30deg);
    }

    /* ---- Settings Panel ---- */
    .settings-panel { max-width: 700px; }
    .settings-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    }
    .settings-header h2 { font-size: 16px; font-weight: 600; }
    .settings-section {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .settings-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    .settings-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 10px; gap: 12px;
    }
    .settings-label { font-weight: 500; min-width: 120px; }
    .settings-select {
      background: var(--bg-input); color: var(--text-primary);
      border: 1px solid var(--border); border-radius: 4px;
      padding: 6px 10px; font-size: 13px; min-width: 200px;
    }
    .settings-select:focus { outline: none; border-color: var(--accent); }
    .status-badge {
      display: inline-block; padding: 2px 10px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
    }
    .status-badge.deployed { background: rgba(34, 197, 94, 0.15); color: var(--success); }
    .status-badge.not-deployed { background: rgba(220, 38, 38, 0.15); color: var(--error); }
    .status-badge.checking { background: rgba(139, 148, 158, 0.15); color: var(--text-secondary); }
    .btn-ghost {
      color: var(--text-secondary); background: none; border: none;
      padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;
    }
    .btn-ghost:hover { color: var(--text-primary); background: var(--bg-input); }

    /* Folder Selector */
    .folder-select {
      background: var(--bg-input); border: 1px solid var(--border); border-radius: 4px;
      color: var(--text-primary); font-size: 12px; padding: 3px 8px; max-width: 200px;
      font-family: var(--vscode-font-family);
    }
    .folder-select:focus { outline: none; border-color: var(--accent); }

    /* Agent Status — styles injected from shared agentStatus.ts via JS import */
  </style>
</head>
<body>
  <div id="scorecard-root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  protected onDispose(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined; }
  }

  protected clearCurrentPanel(): void {
    ScorecardPanel.currentPanel = undefined;
  }
}
