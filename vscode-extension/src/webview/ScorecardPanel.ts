import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { ScorecardWebviewMessage, ScorecardExtensionMessage, RepoInfo, ScorecardData } from '../types';
import { GitHubService } from '../services/GitHubService';
import { PromptPackService } from '../services/PromptPackService';
import { PmatService } from '../services/PmatService';
import { ScorecardService } from '../services/ScorecardService';
import { ScorecardHistoryService } from '../services/ScorecardHistoryService';
import { TechStackDetector } from '../services/TechStackDetector';
import { IssueCreatorPanel } from './IssueCreatorPanel';
import { generateAliceRemediationWorkflow } from '../templates/scaffoldTemplates';

const execFileAsync = promisify(execFile);

export class ScorecardPanel {
  public static currentPanel: ScorecardPanel | undefined;
  private static readonly viewType = 'maintainabilityai.scorecard';

  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private readonly githubService: GitHubService;
  private readonly pmatService: PmatService;
  private readonly scorecardService: ScorecardService;
  private readonly historyService: ScorecardHistoryService;
  private readonly techStackDetector: TechStackDetector;
  private disposables: vscode.Disposable[] = [];
  private currentRepo: RepoInfo | undefined;
  private lastData: ScorecardData | undefined;
  private detectedPackageManager = 'Unknown';
  private detectedTesting = 'Unknown';
  private selectedFolderPath: string | undefined;
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  public static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ScorecardPanel.currentPanel) {
      ScorecardPanel.currentPanel.panel.reveal(column);
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

    ScorecardPanel.currentPanel = new ScorecardPanel(panel, context);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.context = context;
    this.githubService = new GitHubService();
    this.pmatService = new PmatService();
    const promptPackService = new PromptPackService(context.extensionPath);
    this.scorecardService = new ScorecardService(this.githubService, promptPackService, this.pmatService);
    this.historyService = new ScorecardHistoryService(context.workspaceState);
    this.techStackDetector = new TechStackDetector();

    this.panel.webview.html = this.getHtmlContent(panel.webview, context.extensionUri);

    this.panel.webview.onDidReceiveMessage(
      (msg: ScorecardWebviewMessage) => this.handleMessage(msg),
      null,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Subscribe to Rabbit Hole issue progress
    this.disposables.push(
      IssueCreatorPanel.onDidUpdateProgress(update => {
        this.postMessage({ type: 'activeIssueUpdate', issue: update });
      })
    );

    // Update folder dropdown when workspace folders change
    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.sendWorkspaceFolders();
      })
    );
  }

  private async handleMessage(message: ScorecardWebviewMessage) {
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
      case 'installPmat':
        await this.onInstallPmat();
        break;
      case 'addressTechDebt':
        this.onAddressTechDebt();
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
        IssueCreatorPanel.createOrShow(this.context, '');
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
    }
  }

  private async onReady() {
    // Try to auto-select the folder matching an active issue (e.g. just assigned via Rabbit Hole)
    const activeIssue = this.context.workspaceState.get<{ repo?: string; number?: number }>('maintainabilityai.activeIssue');
    const targetRepoName = activeIssue?.repo?.split('/').pop(); // "owner/repo" → "repo"
    const folders = vscode.workspace.workspaceFolders || [];

    console.log(`[Scorecard] onReady: activeIssue=${JSON.stringify(activeIssue)}, targetRepoName=${targetRepoName}, folders=${folders.map(f => f.name).join(', ')}`);

    if (targetRepoName && folders.length > 1) {
      const match = folders.find(f =>
        f.name === targetRepoName ||
        f.uri.fsPath.endsWith(`/${targetRepoName}`) ||
        f.uri.fsPath.endsWith(`\\${targetRepoName}`)
      );
      if (match) {
        this.selectedFolderPath = match.uri.fsPath;
        console.log(`[Scorecard] matched folder: ${match.uri.fsPath}`);
      }
    }

    if (!this.selectedFolderPath) {
      this.selectedFolderPath = folders[0]?.uri.fsPath;
    }

    console.log(`[Scorecard] selectedFolderPath=${this.selectedFolderPath}`);
    this.sendWorkspaceFolders(this.selectedFolderPath);

    if (this.selectedFolderPath) {
      const repo = await this.githubService.detectRepoForFolder(this.selectedFolderPath);
      console.log(`[Scorecard] detectRepoForFolder result: ${JSON.stringify(repo)}`);
      if (repo) {
        this.currentRepo = repo;
        this.postMessage({ type: 'repoDetected', repo });
      }
    } else {
      const repo = await this.githubService.detectRepo();
      console.log(`[Scorecard] detectRepo fallback result: ${JSON.stringify(repo)}`);
      if (repo) {
        this.currentRepo = repo;
        this.postMessage({ type: 'repoDetected', repo });
      }
    }

    // Fallback: if git detection failed but we have an active issue with repo info, use that
    if (!this.currentRepo && activeIssue?.repo) {
      const parts = activeIssue.repo.split('/');
      if (parts.length === 2) {
        this.currentRepo = { owner: parts[0], repo: parts[1], defaultBranch: 'main', remoteUrl: '' };
        this.postMessage({ type: 'repoDetected', repo: this.currentRepo });
        console.log(`[Scorecard] using activeIssue fallback for repo: ${activeIssue.repo}`);
      }
    }

    console.log(`[Scorecard] currentRepo=${this.currentRepo ? `${this.currentRepo.owner}/${this.currentRepo.repo}` : 'null'}`);

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

    // Send persisted active issue immediately so banner shows before GitHub query completes
    if (activeIssue && activeIssue.repo) {
      console.log(`[Scorecard] sending persisted activeIssueUpdate: issue #${activeIssue.number}`);
      this.postMessage({ type: 'activeIssueUpdate', issue: activeIssue });
    }

    // Query GitHub for latest issue/PR state, then poll every 30s
    if (this.currentRepo) {
      console.log(`[Scorecard] calling checkForActiveIssues`);
      this.checkForActiveIssues();
    } else {
      console.log(`[Scorecard] skipping checkForActiveIssues — no currentRepo`);
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
    const folders = (vscode.workspace.workspaceFolders || []).map(f => ({
      name: f.name,
      path: f.uri.fsPath,
    }));
    this.postMessage({ type: 'workspaceFolders', folders, ...(selectedPath ? { selectedPath } : {}) });
  }

  private async onSwitchFolder(folderPath: string) {
    this.selectedFolderPath = folderPath;
    this.postMessage({ type: 'loading', active: true, message: 'Switching workspace...' });

    const repo = await this.githubService.detectRepoForFolder(folderPath);
    this.currentRepo = repo || undefined;
    if (repo) {
      this.postMessage({ type: 'repoDetected', repo });
    }

    await this.onRefresh();
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
      this.postMessage({ type: 'syncStatus', behind, ahead, branch });
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
        message: `Sync failed: ${err instanceof Error ? err.message : String(err)}. Try pulling manually.`,
      });
    }
  }

  /** Query GitHub for open issues with an agent assignee (copilot or claude). */
  private async checkForActiveIssues() {
    if (!this.currentRepo) {
      console.log(`[Scorecard] checkForActiveIssues: skipped — no currentRepo`);
      return;
    }
    try {
      console.log(`[Scorecard] checkForActiveIssues: querying ${this.currentRepo.owner}/${this.currentRepo.repo}`);
      const { issues } = await this.githubService.listIssues(
        this.currentRepo.owner, this.currentRepo.repo, 1, 10
      );
      console.log(`[Scorecard] checkForActiveIssues: ${issues.length} issues, assignees: ${issues.map(i => `#${i.number}=${i.assignee || 'none'}`).join(', ')}`);
      // Look for issues assigned to an AI agent or being handled by a remediation workflow
      const agentIssue = issues.find(i => {
        const assignee = i.assignee?.toLowerCase() || '';
        const labelNames = (i.labels || []).map(l => l.name.toLowerCase());
        return (
          assignee.includes('copilot') ||
          assignee.includes('claude') ||
          labelNames.some(l => l.includes('copilot') || l.includes('claude')) ||
          labelNames.some(l => l === 'remediation-planning' || l === 'remediation-in-progress')
        );
      });
      console.log(`[Scorecard] checkForActiveIssues: agentIssue=${agentIssue ? `#${agentIssue.number} assignee=${agentIssue.assignee} labels=${(agentIssue.labels||[]).map(l=>l.name).join(',')}` : 'none'}`);

      if (agentIssue) {
        // Detect agent type from assignee, labels, or remediation workflow labels
        let agent: 'claude' | 'copilot' | 'unknown' = 'unknown';
        const assigneeLower = agentIssue.assignee?.toLowerCase() || '';
        const labelNames = (agentIssue.labels || []).map(l => l.name.toLowerCase());
        if (assigneeLower.includes('copilot') || labelNames.some(l => l.includes('copilot'))) { agent = 'copilot'; }
        else if (assigneeLower.includes('claude') || labelNames.some(l => l.includes('claude') || l.startsWith('remediation-'))) { agent = 'claude'; }

        // Determine phase from remediation labels
        let phase = 'agent working';
        if (labelNames.includes('remediation-planning')) { phase = 'planning'; }
        else if (labelNames.includes('remediation-in-progress')) { phase = 'implementing'; }
        else if (labelNames.includes('remediation-complete')) { phase = 'complete'; }

        // Check for linked PR (prefer open PRs, ignore closed/merged)
        let pr: { number: number; url: string; title: string; draft: boolean } | undefined;
        try {
          const prs = await this.githubService.getLinkedPullRequests(
            this.currentRepo.owner, this.currentRepo.repo, agentIssue.number
          );
          const openPr = prs.find(p => p.state === 'open');
          if (openPr) {
            pr = { number: openPr.number, url: openPr.url, title: openPr.title, draft: openPr.draft };
          }
        } catch { /* best effort */ }

        const issueInfo = {
          number: agentIssue.number,
          url: agentIssue.url,
          title: agentIssue.title,
          agent,
          phase,
          status: 'active' as const,
          repo: `${this.currentRepo.owner}/${this.currentRepo.repo}`,
          pr,
        };
        this.postMessage({ type: 'activeIssueUpdate', issue: issueInfo });
        this.context.workspaceState.update('maintainabilityai.activeIssue', issueInfo);
      } else {
        // No active agent issue — clear the banner
        this.postMessage({ type: 'activeIssueUpdate', issue: null });
        this.context.workspaceState.update('maintainabilityai.activeIssue', undefined);
      }
    } catch (err) {
      console.error(`[Scorecard] checkForActiveIssues error:`, err);
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
      const msg = err instanceof Error ? err.message : String(err);
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
    const commands: Record<string, string> = {
      Jest: 'npx jest --coverage',
      Vitest: 'npx vitest run --coverage',
      Mocha: 'npx c8 mocha --exit',
    };

    const pkgCommands: Record<string, string> = {
      npm: 'npm test -- --coverage',
      yarn: 'yarn test --coverage',
      pnpm: 'pnpm test -- --coverage',
      bun: 'bun test --coverage',
      pip: 'python -m pytest --cov',
      uv: 'uv run pytest --cov',
      poetry: 'poetry run pytest --cov',
      pipenv: 'pipenv run pytest --cov',
    };

    // Prefer test-framework-specific command, fall back to package-manager-based
    const cmd = commands[this.detectedTesting] || pkgCommands[this.detectedPackageManager] || 'npm test -- --coverage';
    this.runInTerminalThenRefresh('Run Coverage', cmd);
  }

  private runInTerminalThenRefresh(name: string, cmd: string) {
    const terminal = vscode.window.createTerminal({ name });
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

    IssueCreatorPanel.createOrShow(this.context, lines.join('\n'), coveragePacks);
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

    IssueCreatorPanel.createOrShow(this.context, lines.join('\n'), depPacks);
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

    IssueCreatorPanel.createOrShow(this.context, lines.join('\n'), techDebtPacks);
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
        message: `Failed to deploy workflow: ${err instanceof Error ? err.message : String(err)}`,
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
        message: `Failed to save model preference: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private postMessage(message: ScorecardExtensionMessage) {
    this.panel.webview.postMessage(message);
  }

  private getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
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
    :root {
      --bg-primary: var(--vscode-editor-background);
      --bg-secondary: var(--vscode-sideBar-background);
      --bg-input: var(--vscode-input-background);
      --border: var(--vscode-panel-border);
      --text-primary: var(--vscode-editor-foreground);
      --text-secondary: var(--vscode-descriptionForeground);
      --accent: var(--vscode-button-background);
      --accent-hover: var(--vscode-button-hoverBackground);
      --accent-fg: var(--vscode-button-foreground);
      --error: var(--vscode-errorForeground);
      --success: #22c55e;
      --running: #f59e0b;
      --purple: #a855f7;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--text-primary);
      background: var(--bg-primary);
      padding: 24px 32px;
      overflow-y: auto;
    }

    /* Header */
    .scorecard-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left h1 { font-size: 18px; font-weight: 600; }
    .header-left p { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
    .header-right { display: flex; align-items: center; gap: 8px; }
    .last-refreshed { font-size: 11px; color: var(--text-secondary); }

    /* Buttons */
    button {
      padding: 8px 16px; border: none; border-radius: 4px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s;
    }
    .btn-primary { background: var(--accent); color: var(--accent-fg); }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-secondary { background: transparent; color: var(--text-primary); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--bg-input); }
    .btn-icon { padding: 6px 10px; font-size: 14px; line-height: 1; }

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

    /* Loading */
    .loading-overlay {
      text-align: center; padding: 60px 20px; color: var(--text-secondary);
    }
    .spinner { width: 24px; height: 24px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; margin-bottom: 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .skeleton { background: var(--bg-input); border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }

    /* Error */
    .error-msg {
      color: var(--error); font-size: 12px; padding: 8px;
      background: rgba(220, 38, 38, 0.1); border-radius: 4px; margin-bottom: 12px;
    }
    .error-msg:empty { display: none; }

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

    /* Active Issue Card */
    .active-issue-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid rgba(124, 58, 237, 0.3);
      border-left: 3px solid #7c3aed;
      background: rgba(124, 58, 237, 0.06);
      margin-bottom: 16px;
      font-size: 13px;
    }
    .active-issue-pulse {
      width: 8px; height: 8px; border-radius: 50%;
      background: #7c3aed; flex-shrink: 0;
      animation: pulse-glow 2s ease-in-out infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
      50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0); }
    }
    .active-issue-links {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, var(--text-secondary));
      margin-left: auto;
      white-space: nowrap;
    }
    .active-issue-link {
      color: var(--vscode-textLink-foreground, var(--accent, #a855f7));
      cursor: pointer; text-decoration: none; font-weight: 600;
    }
    .active-issue-link:hover { text-decoration: underline; }
    .active-issue-draft-badge {
      display: inline-block; padding: 1px 6px; border-radius: 10px;
      font-size: 10px; font-weight: 600;
      background: rgba(234, 179, 8, 0.15); color: #eab308;
    }
  </style>
</head>
<body>
  <div id="scorecard-root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined; }
    ScorecardPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      d?.dispose();
    }
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
