import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type {
  OracularWebviewMessage,
  OracularExtensionMessage,
  AgentAssignment,
  RepoInfo,
} from '../types';
import { MeshService } from '../services/MeshService';
import { GitHubService } from '../services/GitHubService';
import { GitSyncService } from '../services/GitSyncService';
import { IssueMonitorService } from '../services/IssueMonitorService';
import { ReviewService } from '../services/ReviewService';

const execFileAsync = promisify(execFile);

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class OracularPanel {
  public static currentPanel: OracularPanel | undefined;
  private static readonly viewType = 'maintainabilityai.oraculum';

  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private readonly meshService: MeshService;
  private readonly githubService: GitHubService;
  private readonly gitSyncService: GitSyncService;
  private readonly monitorService: IssueMonitorService;
  private readonly reviewService: ReviewService;
  private disposables: vscode.Disposable[] = [];

  private meshRepoInfo: RepoInfo | null = null;
  private currentIssueNumber: number | undefined;
  private currentIssueUrl: string | undefined;
  private initialBarPath: string | undefined;
  private reviewBarPath: string | undefined;

  public static createOrShow(context: vscode.ExtensionContext, barPath?: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (OracularPanel.currentPanel) {
      OracularPanel.currentPanel.panel.reveal(column);
      if (barPath) {
        OracularPanel.currentPanel.initialBarPath = barPath;
        OracularPanel.currentPanel.sendCreateFlowForBar(barPath);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      OracularPanel.viewType,
      'MaintainabilityAI \u2014 Oraculum',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    OracularPanel.currentPanel = new OracularPanel(panel, context, barPath);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
    barPath?: string,
  ) {
    this.panel = panel;
    this.context = context;
    this.initialBarPath = barPath;
    this.meshService = new MeshService();
    this.githubService = new GitHubService();
    this.gitSyncService = new GitSyncService();
    this.monitorService = new IssueMonitorService(this.githubService);
    this.reviewService = new ReviewService();

    // Wire monitor events -> webview
    this.monitorService.onDidUpdateComments(comments => {
      this.postMessage({ type: 'commentsUpdated', comments });
    });

    this.monitorService.onDidDetectPr(pr => {
      this.postMessage({ type: 'prDetected', pr });
    });

    this.monitorService.onDidChangePrStatus(pr => {
      this.postMessage({ type: 'prStatusUpdated', pr });
    });

    this.monitorService.onDidUpdateLabels(labels => {
      this.postMessage({ type: 'labelsUpdated', labels });
    });

    this.panel.webview.html = this.getHtmlContent(panel.webview, context.extensionUri);

    this.panel.webview.onDidReceiveMessage(
      (msg: OracularWebviewMessage) => this.handleMessage(msg),
      null,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private postMessage(msg: OracularExtensionMessage) {
    this.panel.webview.postMessage(msg);
  }

  private async handleMessage(message: OracularWebviewMessage) {
    switch (message.type) {
      case 'ready':
        await this.onReady();
        break;
      case 'submitReview':
        await this.onSubmitReview(message.barPath, message.scope, message.title);
        break;
      case 'startMonitoring':
        this.onStartMonitoring();
        break;
      case 'stopMonitoring':
        this.monitorService.stopMonitoring();
        // Re-check sync status (PR may have been merged while monitoring)
        { const mp = MeshService.getMeshPath(); if (mp) { this.checkMeshSync(mp).catch(() => {}); } }
        break;
      case 'openUrl':
        vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;
      case 'provisionWorkflow':
        await this.onProvisionWorkflow();
        break;
      case 'assignAgent':
        await this.onAssignAgent(message.agent);
        break;
      case 'approveAgent':
        await this.onApproveAgent(message.agent);
        break;
      case 'replanAgent':
        await this.onReplanAgent(message.feedback, message.agent);
        break;
      case 'loadIssues':
        await this.onLoadIssues(message.page);
        break;
      case 'selectIssue':
        await this.onSelectIssue(message.issueNumber, message.issueUrl);
        break;
      case 'openBar':
        vscode.commands.executeCommand('maintainabilityai.lookingGlass', this.reviewBarPath || message.barPath);
        break;
      case 'navigateToBar': {
        // After agent assignment, navigate to Looking Glass BAR detail and close Oraculum
        if (this.reviewBarPath) {
          // Pass active review info so banner appears immediately (no API race condition)
          const activeReview = this.currentIssueNumber && this.currentIssueUrl ? {
            issueNumber: this.currentIssueNumber,
            issueUrl: this.currentIssueUrl,
            title: `Architecture Review #${this.currentIssueNumber}`,
            agent: (message.agent || 'unknown') as 'claude' | 'copilot' | 'unknown',
          } : undefined;
          vscode.commands.executeCommand('maintainabilityai.lookingGlass', this.reviewBarPath, activeReview);
          this.panel.dispose();
        }
        break;
      }
      case 'backToHub':
        this.currentIssueNumber = undefined;
        this.currentIssueUrl = undefined;
        this.monitorService.stopMonitoring();
        break;
      case 'refreshPromptPacks':
        await this.onRefreshPromptPacks();
        break;
      case 'pullMesh':
        await this.onPullMesh();
        break;
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private async onReady() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No governance mesh configured. Open Looking Glass to initialize one.' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Loading...' });

    try {
      // Detect mesh repo (GitHub remote)
      await this.detectMeshRepo(meshPath);

      // Check if local mesh is behind remote (non-blocking best-effort)
      this.checkMeshSync(meshPath).catch(() => {});

      // Load prompt packs
      const packs = this.reviewService.loadPromptPacks(meshPath);
      this.postMessage({ type: 'promptPacksLoaded', packs });

      // Check if the Oraculum workflow exists on the mesh repo
      if (this.meshRepoInfo) {
        const workflowExists = await this.githubService.checkWorkflowExists(
          this.meshRepoInfo.owner,
          this.meshRepoInfo.repo,
          '.github/workflows/oraculum-review.yml'
        );
        this.postMessage({ type: 'workflowStatus', exists: workflowExists });
      }

      // If opened with a specific BAR, enter create mode
      if (this.initialBarPath) {
        await this.sendCreateFlowForBar(this.initialBarPath);
        this.initialBarPath = undefined;
      } else {
        // Otherwise load issues for hub view
        await this.onLoadIssues(1);
      }
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Error loading: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onRefreshPromptPacks() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) { return; }
    const packs = this.reviewService.loadPromptPacks(meshPath);
    this.postMessage({ type: 'promptPacksLoaded', packs });
  }

  private async detectMeshRepo(meshPath: string) {
    try {
      const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: meshPath });
      const url = stdout.trim();
      const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
      if (match) {
        this.meshRepoInfo = {
          owner: match[1],
          repo: match[2],
          defaultBranch: 'main',
          remoteUrl: url,
        };
        this.postMessage({ type: 'meshRepoDetected', owner: match[1], repo: match[2] });
      }
    } catch {
      // No git remote — mesh is local only
    }
  }

  // ============================================================================
  // Hub — Issue List
  // ============================================================================

  private async onLoadIssues(page: number) {
    if (!this.meshRepoInfo) { return; }
    this.postMessage({ type: 'loading', active: true, message: 'Loading reviews...' });
    try {
      const result = await this.githubService.listIssues(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        page,
        30,
        'maintainabilityai'
      );
      this.postMessage({
        type: 'issuesLoaded',
        issues: result.issues,
        hasMore: result.hasMore,
        page,
      });

      // Re-check workflow status on every refresh
      const workflowExists = await this.githubService.checkWorkflowExists(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        '.github/workflows/oraculum-review.yml'
      );
      this.postMessage({ type: 'workflowStatus', exists: workflowExists });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to load reviews: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onSelectIssue(issueNumber: number, issueUrl: string) {
    this.currentIssueNumber = issueNumber;
    this.currentIssueUrl = issueUrl;

    // Detect issue state — check labels and comments to determine which phase to start in
    if (!this.meshRepoInfo) { return; }

    // Try to recover BAR path from issue body or title for metrics saving
    try {
      const { body: issueBody, title: issueTitle } = await this.githubService.getIssueBody(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        issueNumber
      );
      const meshPath = MeshService.getMeshPath();

      // Strategy 1: Parse bar_path from issue body YAML block
      const barPathMatch = issueBody?.match(/bar_path:\s*(.+)/);
      if (barPathMatch && meshPath) {
        const path = await import('path');
        this.reviewBarPath = path.join(meshPath, barPathMatch[1].trim());
      }

      // Strategy 2: Match app name from issue title to a known BAR
      if (!this.reviewBarPath && issueTitle && meshPath) {
        const titleMatch = issueTitle.match(/^Oraculum Review:\s*(.+)/i);
        if (titleMatch) {
          const appName = titleMatch[1].trim();
          const summary = this.meshService.buildPortfolioSummary(meshPath);
          const matchedBar = summary?.allBars.find(
            b => b.name.toLowerCase() === appName.toLowerCase()
          );
          if (matchedBar) {
            this.reviewBarPath = matchedBar.path;
          }
        }
      }
    } catch { /* best effort */ }

    try {
      const labels = await this.githubService.getIssueLabels(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        issueNumber
      );

      const hasReviewLabel = labels.includes('oraculum-review');

      // Check if an agent was actually assigned (has @claude or @copilot comment)
      const comments = await this.githubService.getIssueComments(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        issueNumber
      );
      const hasAgentComment = comments.some(c =>
        c.body.includes('@claude') || c.body.includes('@copilot')
      );

      // Send comments to webview so results phase can render the report
      this.postMessage({ type: 'commentsUpdated', comments });

      this.postMessage({
        type: 'issueState',
        hasReviewLabel,
        hasComments: hasAgentComment,
        labels,
      });
    } catch {
      // If we can't detect state, the webview defaults to assign phase
    }
  }

  // ============================================================================
  // Create Flow — BAR Review
  // ============================================================================

  private async sendCreateFlowForBar(barPath: string) {
    this.reviewBarPath = barPath;
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) { return; }
    const summary = this.meshService.buildPortfolioSummary(meshPath);
    const bar = summary?.allBars.find(b => b.path === barPath);
    if (!bar) {
      this.postMessage({ type: 'error', message: `BAR not found: ${barPath}` });
      return;
    }
    this.postMessage({
      type: 'startCreateFlow',
      barPath,
      bar,
      repos: bar.repos,
    });
  }

  private async onSubmitReview(
    barPath: string,
    scope: import('../types').ReviewScope,
    title: string
  ) {
    if (!this.meshRepoInfo) {
      this.postMessage({ type: 'error', message: 'No GitHub remote detected on mesh repository. Push mesh to GitHub first.' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Creating review issue...' });
    this.postMessage({ type: 'phaseUpdate', phase: 'submit', status: 'active' });

    try {
      const meshPath = MeshService.getMeshPath();
      if (!meshPath) { throw new Error('No mesh configured'); }

      // Compute relative BAR path within the mesh
      const relativePath = barPath.replace(meshPath + '/', '').replace(meshPath + '\\', '');

      // Get app name from the BAR
      const summary = this.meshService.buildPortfolioSummary(meshPath);
      const bar = summary?.allBars.find(b => b.path === barPath);
      const appName = bar?.name || 'Unknown Application';

      // Load prompt pack content for inclusion in the issue body
      const packIds = scope.promptPacks ?? (scope.promptPack ? [scope.promptPack] : ['default']);
      const promptPacks = this.reviewService.loadMultiplePromptPacks(meshPath, packIds);

      const body = this.reviewService.buildIssueBody(
        appName,
        relativePath,
        scope,
        undefined,
        promptPacks.length > 0 ? promptPacks : undefined
      );

      // Create issue WITHOUT the trigger label — user will assign agent to start the review
      const result = await this.githubService.createIssueRaw(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        title,
        body,
        ['maintainabilityai']
      );

      this.currentIssueNumber = result.number;
      this.currentIssueUrl = result.url;

      // Replace ISSUE_NUMBER placeholders with the real issue number
      const resolvedBody = body.replace(/ISSUE_NUMBER/g, String(result.number));
      if (resolvedBody !== body) {
        this.githubService.updateIssueBody(
          this.meshRepoInfo.owner,
          this.meshRepoInfo.repo,
          result.number,
          resolvedBody
        ).catch(() => { /* best effort — issue still works with placeholders */ });
      }

      this.postMessage({ type: 'reviewCreated', url: result.url, number: result.number });
      this.postMessage({ type: 'phaseUpdate', phase: 'submit', status: 'completed' });
    } catch (err) {
      this.postMessage({ type: 'phaseUpdate', phase: 'submit', status: 'error', message: String(err) });
      this.postMessage({
        type: 'error',
        message: `Failed to create review: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  // ============================================================================
  // Manage Flow — Assign Agent + Monitor
  // ============================================================================

  private async onAssignAgent(agent: AgentAssignment) {
    if (!this.currentIssueNumber || !this.meshRepoInfo) {
      this.postMessage({ type: 'error', message: 'No review issue to assign.' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Assigning agent...' });
    this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'active', message: 'Assigning...' });

    if (agent === 'skip') {
      // Just add the trigger label, no comment
      try {
        await this.githubService.addIssueLabels(
          this.meshRepoInfo.owner,
          this.meshRepoInfo.repo,
          this.currentIssueNumber,
          ['oraculum-review']
        );
        this.postMessage({ type: 'agentAssigned', agent: 'skip' });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'completed' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.postMessage({ type: 'error', message: `Failed to assign: ${msg}` });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'error', message: msg });
      } finally {
        this.postMessage({ type: 'loading', active: false });
      }
      return;
    }

    if (agent === 'claude') {
      // Check if oraculum-review workflow exists
      const workflowExists = await this.githubService.checkWorkflowExists(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        '.github/workflows/oraculum-review.yml'
      );

      if (!workflowExists) {
        this.postMessage({ type: 'workflowNotFound' });
        // Still proceed — the comment will be posted but won't trigger automation
      }

      const commentBody = `@claude Please analyze the repositories listed in this review request against the BAR configuration and prompt pack guidelines above. Report findings organized by pillar (architecture, security, risk, operations).`;

      try {
        // Add the trigger label FIRST — the workflow checks for this label
        // when the issue_comment event fires, so it must exist before the comment
        await this.githubService.addIssueLabels(
          this.meshRepoInfo.owner,
          this.meshRepoInfo.repo,
          this.currentIssueNumber,
          ['oraculum-review']
        );

        // Now post the @claude comment — this triggers the workflow
        const result = await this.githubService.createIssueComment(
          this.meshRepoInfo.owner,
          this.meshRepoInfo.repo,
          this.currentIssueNumber,
          commentBody
        );

        this.postMessage({
          type: 'agentAssigned',
          agent: 'claude',
          commentUrl: result.url,
        });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'completed' });

        // Start monitoring
        this.monitorService.startMonitoring(
          this.currentIssueNumber,
          this.currentIssueUrl || '',
          this.meshRepoInfo
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.postMessage({ type: 'error', message: `Failed to assign: ${msg}` });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'error', message: msg });
      } finally {
        this.postMessage({ type: 'loading', active: false });
      }
      return;
    }

    if (agent === 'copilot') {
      try {
        // Add the trigger label first (consistent ordering)
        await this.githubService.addIssueLabels(
          this.meshRepoInfo.owner,
          this.meshRepoInfo.repo,
          this.currentIssueNumber,
          ['oraculum-review']
        );

        // Assign Copilot as an issue assignee — this triggers the Copilot coding agent
        await this.githubService.assignIssue(
          this.meshRepoInfo.owner,
          this.meshRepoInfo.repo,
          this.currentIssueNumber,
          ['copilot-swe-agent[bot]']
        );

        // Post a context comment for Copilot to read
        await this.githubService.createIssueComment(
          this.meshRepoInfo.owner,
          this.meshRepoInfo.repo,
          this.currentIssueNumber,
          'Please review the repositories listed in this review request against the BAR configuration and prompt pack guidelines above. Report findings organized by pillar (architecture, security, risk, operations).'
        );

        this.postMessage({ type: 'agentAssigned', agent: 'copilot' });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'completed' });

        // Start monitoring
        this.monitorService.startMonitoring(
          this.currentIssueNumber,
          this.currentIssueUrl || '',
          this.meshRepoInfo
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.postMessage({ type: 'error', message: `Failed to assign Copilot: ${msg}` });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'error', message: msg });
      } finally {
        this.postMessage({ type: 'loading', active: false });
      }
    }
  }

  private async onApproveAgent(agent?: 'claude' | 'copilot') {
    if (!this.currentIssueNumber || !this.meshRepoInfo) {
      this.postMessage({ type: 'error', message: 'No issue to approve.' });
      return;
    }

    const mention = agent === 'copilot' ? '@copilot' : '@claude';
    try {
      await this.githubService.createIssueComment(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        this.currentIssueNumber,
        `${mention} approved`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.postMessage({ type: 'error', message: `Failed to send approval: ${msg}` });
    }
  }

  private async onReplanAgent(feedback: string, agent?: 'claude' | 'copilot') {
    if (!this.currentIssueNumber || !this.meshRepoInfo) {
      this.postMessage({ type: 'error', message: 'No issue to send feedback on.' });
      return;
    }

    const mention = agent === 'copilot' ? '@copilot' : '@claude';
    try {
      await this.githubService.createIssueComment(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        this.currentIssueNumber,
        `${mention} Please revise the plan based on this feedback:\n\n${feedback}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.postMessage({ type: 'error', message: `Failed to send feedback: ${msg}` });
    }
  }

  private onStartMonitoring() {
    if (this.currentIssueNumber && this.meshRepoInfo) {
      this.monitorService.startMonitoring(
        this.currentIssueNumber,
        this.currentIssueUrl || '',
        this.meshRepoInfo
      );
    }
  }

  // ============================================================================
  // Workflow Provisioning
  // ============================================================================

  private async onProvisionWorkflow() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Provisioning Oraculum workflow...' });

    try {
      const gitRoot = this.gitSyncService.findGitRoot(meshPath);
      if (gitRoot) {
        // Pull from remote first to avoid conflicts if behind
        const pullResult = await this.gitSyncService.pullFromRemote(gitRoot);
        if (!pullResult.success) {
          this.postMessage({ type: 'error', message: `Cannot provision: ${pullResult.message}` });
          return;
        }
      }

      // Ensure GitHub Actions can create PRs (required for Oraculum review workflow)
      if (this.meshRepoInfo) {
        try {
          await execFileAsync('gh', [
            'api', `repos/${this.meshRepoInfo.owner}/${this.meshRepoInfo.repo}/actions/permissions/workflow`,
            '-X', 'PUT',
            '-f', 'default_workflow_permissions=write',
            '-F', 'can_approve_pull_request_reviews=true',
          ], { cwd: meshPath, timeout: 30_000 });
        } catch { /* non-fatal — user can enable manually in repo settings */ }
      }

      // Write workflow + prompt pack files
      this.meshService.writeOraculumWorkflow(meshPath, this.context.extensionPath);

      // Git add, commit, push — only commit if files actually changed
      await execFileAsync('git', ['add', '-A'], { cwd: meshPath });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: meshPath });
      if (diffCheck.trim()) {
        await execFileAsync('git', ['commit', '-m', 'chore: update oraculum review workflow\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: meshPath });
        await execFileAsync('git', ['push'], { cwd: meshPath, timeout: 60_000 });
      }

      this.postMessage({ type: 'workflowProvisioned' });
      this.postMessage({ type: 'workflowStatus', exists: true });
      // Refresh sync status after provisioning
      await this.checkMeshSync(meshPath);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to provision workflow: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async checkMeshSync(meshPath: string) {
    const gitRoot = this.gitSyncService.findGitRoot(meshPath);
    if (!gitRoot) { return; }

    try {
      const status = await this.gitSyncService.getStatus(meshPath, []);
      if (status.isGitRepo && status.hasRemote) {
        this.postMessage({ type: 'meshSyncStatus', behind: status.behind, ahead: status.ahead });
      }
    } catch {
      // best effort
    }
  }

  private async onPullMesh() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'pullError', message: 'No mesh configured.' });
      return;
    }

    const gitRoot = this.gitSyncService.findGitRoot(meshPath);
    if (!gitRoot) {
      this.postMessage({ type: 'pullError', message: 'Not a git repository.' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Pulling from remote...' });

    try {
      const result = await this.gitSyncService.pullFromRemote(gitRoot);
      if (result.success) {
        this.postMessage({ type: 'pullComplete', message: result.message });
        // Refresh sync status + prompt packs (may have changed on remote)
        await this.checkMeshSync(meshPath);
        const packs = this.reviewService.loadPromptPacks(meshPath);
        this.postMessage({ type: 'promptPacksLoaded', packs });
      } else {
        this.postMessage({ type: 'pullError', message: result.message });
      }
    } catch (err) {
      this.postMessage({
        type: 'pullError',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  // ============================================================================
  // HTML + Lifecycle
  // ============================================================================

  private getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'oraculum.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
  <title>Oraculum</title>
</head>
<body>
  <div id="oraculum-root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose() {
    OracularPanel.currentPanel = undefined;
    this.monitorService.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
