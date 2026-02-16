import * as vscode from 'vscode';
import type { ScorecardWebviewMessage, ScorecardExtensionMessage, RepoInfo, ScorecardData } from '../types';
import { GitHubService } from '../services/GitHubService';
import { PromptPackService } from '../services/PromptPackService';
import { PmatService } from '../services/PmatService';
import { ScorecardService } from '../services/ScorecardService';
import { ScorecardHistoryService } from '../services/ScorecardHistoryService';
import { TechStackDetector } from '../services/TechStackDetector';
import { IssueCreatorPanel } from './IssueCreatorPanel';

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
    }
  }

  private async onReady() {
    const repo = await this.githubService.detectRepo();
    if (repo) {
      this.currentRepo = repo;
      this.postMessage({ type: 'repoDetected', repo });
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
  }

  private async onRefresh() {
    this.pmatService.clearCache();
    this.postMessage({ type: 'loading', active: true, message: 'Collecting metrics...' });
    try {
      const data = await this.scorecardService.collectAll(this.currentRepo || null);
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
      Mocha: 'npx c8 mocha',
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
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
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

    /* Empty state */
    .empty-state { text-align: center; padding: 40px; color: var(--text-secondary); }
  </style>
</head>
<body>
  <div id="scorecard-root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose() {
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
