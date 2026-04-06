import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { WebviewMessage, ExtensionMessage, RctroPrompt, RepoInfo, AgentAssignment, PromptPackSelection, TechStack } from '../types';
import { toErrorMessage } from '../utils/errors';
import { LlmService } from '../services/llm/LlmService';
import { GitHubService, githubService } from '../services/GitHubService';
import { promptPackService } from '../services/PromptPackService';
import { TechStackDetector } from '../services/TechStackDetector';
import { IssueMonitorService } from '../services/IssueMonitorService';
import { FolderStateService } from '../services/FolderStateService';
import { ISSUE_TEMPLATES } from '../templates/issueTemplates';
import { readRepoMetadata, writeRepoMetadata, mergeMetadata } from '../services/RepoMetadata';
import { execFileAsync } from '../utils/exec';
import { getNonce } from '../utils/getNonce';
import { BasePanel } from './BasePanel';
import { getSharedStyles } from './styles';

export class IssueCreatorPanel extends BasePanel<WebviewMessage, ExtensionMessage> {
  public static currentPanel: IssueCreatorPanel | undefined;
  private static readonly viewType = 'maintainabilityai.issueCreator';

  // Static event: broadcasts issue progress so other panels (e.g. Scorecard) can observe
  private static readonly _onProgress = new vscode.EventEmitter<{
    number: number; url: string; phase: string; status: string; repo: string;
  } | null>();
  static readonly onDidUpdateProgress = IssueCreatorPanel._onProgress.event;

  private readonly llmService: LlmService;
  private readonly githubService: GitHubService;
  private readonly techStackDetector: TechStackDetector;
  private readonly monitorService: IssueMonitorService;

  private currentRctro: RctroPrompt | undefined;
  private currentIssueNumber: number | undefined;
  private currentIssueUrl: string | undefined;
  private currentRepo: RepoInfo | undefined;
  private lastSelectedPacks: PromptPackSelection | undefined;

  public static createOrShow(
    context: vscode.ExtensionContext,
    initialDescription?: string,
    initialPacks?: { owasp: string[]; maintainability: string[]; threatModeling: string[] },
    repoUrl?: string,
    stackOverride?: TechStack,
    folderPath?: string,
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (IssueCreatorPanel.currentPanel) {
      IssueCreatorPanel.currentPanel.panel.reveal(column);
      // Update folder context if provided (scorecard mode — use selected folder)
      if (folderPath) {
        IssueCreatorPanel.currentPanel.folderPath = folderPath;
      }
      // Set repo from URL if provided (component mode)
      if (repoUrl) {
        const parsed = GitHubService.parseRepoUrl(repoUrl);
        if (parsed) {
          const repo: RepoInfo = { owner: parsed.owner, repo: parsed.repo, defaultBranch: 'main', remoteUrl: repoUrl };
          IssueCreatorPanel.currentPanel.currentRepo = repo;
          IssueCreatorPanel.currentPanel.postMessage({ type: 'repoDetected', repo });
        }
      }
      // Re-detect stack for the correct folder when reusing panel
      if (folderPath && !stackOverride) {
        void IssueCreatorPanel.currentPanel.techStackDetector.detect(folderPath).then(stack => {
          const metadata = readRepoMetadata(folderPath);
          IssueCreatorPanel.currentPanel?.postMessage({ type: 'stackDetected', stack, metadata: metadata || undefined });
        });
      }
      // Set stack override if provided (component mode — folder may not be open)
      if (stackOverride) {
        IssueCreatorPanel.currentPanel.pendingStackOverride = stackOverride;
        IssueCreatorPanel.currentPanel.postMessage({ type: 'stackDetected', stack: stackOverride });
      }
      if (initialDescription !== undefined) {
        IssueCreatorPanel.currentPanel.postMessage({ type: 'prefillDescription', description: initialDescription, packs: initialPacks });
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      IssueCreatorPanel.viewType,
      'MaintainabilityAI — Rabbit Hole',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    IssueCreatorPanel.currentPanel = new IssueCreatorPanel(panel, context, initialDescription, initialPacks, repoUrl, stackOverride, folderPath);
  }

  private pendingDescription: string | undefined;
  private pendingPacks: { owasp: string[]; maintainability: string[]; threatModeling: string[] } | undefined;
  private pendingRepoUrl: string | undefined;
  private pendingStackOverride: TechStack | undefined;
  private folderPath: string | undefined;

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
    initialDescription?: string,
    initialPacks?: { owasp: string[]; maintainability: string[]; threatModeling: string[] },
    repoUrl?: string,
    stackOverride?: TechStack,
    folderPath?: string,
  ) {
    super(panel, context);
    this.pendingDescription = initialDescription;
    this.pendingPacks = initialPacks;
    this.pendingRepoUrl = repoUrl;
    this.pendingStackOverride = stackOverride;
    this.folderPath = folderPath;
    this.llmService = new LlmService();
    this.githubService = githubService;
    this.techStackDetector = new TechStackDetector();
    this.monitorService = new IssueMonitorService(this.githubService);

    // Wire monitor events → webview
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

    // Sync folder selection across panels
    this.disposables.push(
      FolderStateService.getInstance().onDidChangeFolder(newFolder => {
        if (newFolder !== this.folderPath) {
          this.folderPath = newFolder;
          this.sendWorkspaceFolders(newFolder);
          void this.githubService.detectRepoForFolder(newFolder).then(repo => {
            if (repo) {
              this.currentRepo = repo;
              this.postMessage({ type: 'repoDetected', repo });
              void this.onLoadIssues(1);
            }
          });
          void this.onDetectStack();
        }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.sendWorkspaceFolders(this.folderPath);
      })
    );
  }

  protected async handleMessage(message: WebviewMessage) {
    switch (message.type) {
      case 'ready':
        await this.onReady();
        break;
      case 'generate':
        await this.onGenerate(message);
        break;
      case 'regenerate':
        await this.onRegenerate(message);
        break;
      case 'submit':
        await this.onSubmit(message);
        break;
      case 'detectStack':
        await this.onDetectStack();
        break;
      case 'loadPromptPacks':
        this.onLoadPromptPacks();
        break;
      case 'selectTemplate':
        this.onSelectTemplate(message.templateId);
        break;
      // Phase 2
      case 'acceptRctro':
        this.postMessage({ type: 'phaseUpdate', phase: 'review', status: 'completed' });
        this.postMessage({ type: 'phaseUpdate', phase: 'submit', status: 'active' });
        break;
      case 'rejectRctro':
        if (this.currentRctro) {
          await this.onRegenerate({
            type: 'regenerate',
            feedback: message.feedback,
            currentRctro: this.currentRctro,
          });
        }
        break;
      // Phase 4
      case 'assignAgent':
        await this.onAssignAgent(message.agent);
        break;
      // Phase 5
      case 'startMonitoring':
        this.onStartMonitoring();
        break;
      case 'stopMonitoring':
        this.monitorService.stopMonitoring();
        break;
      case 'checkoutBranch':
        await this.onCheckoutBranch(message.branch);
        break;
      case 'syncRepo':
        await this.onSyncRepo();
        break;
      case 'openUrl':
        vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;
      case 'approveAgent':
        await this.onApproveAgent(message.agent);
        break;
      case 'replanAgent':
        await this.onReplanAgent(message.feedback, message.agent);
        break;
      case 'listModels':
        await this.onListModels();
        break;
      case 'saveMetadata':
        this.onSaveMetadata(message);
        break;
      case 'loadIssues':
        await this.onLoadIssues(message.page);
        break;
      case 'selectIssue':
        this.onSelectIssue(message.issueNumber, message.issueUrl);
        break;
      case 'backToHub':
        this.onBackToHub();
        break;
      case 'switchFolder':
        await this.onSwitchFolder((message as Extract<WebviewMessage, { type: 'switchFolder' }>).folderPath);
        break;
    }
  }

  // ============================================================================
  // Phase 1: Input & Generate
  // ============================================================================

  private async onReady() {
    // Resolve folder from shared state if not explicitly set
    if (!this.folderPath) {
      this.folderPath = FolderStateService.getInstance().getSelectedFolder();
    }
    this.sendWorkspaceFolders(this.folderPath);

    this.onLoadPromptPacks();
    // Use stack override from component mode if provided, otherwise detect from workspace
    if (this.pendingStackOverride) {
      this.postMessage({ type: 'stackDetected', stack: this.pendingStackOverride });
    } else {
      await this.onDetectStack();
    }
    await this.onListModels();

    // Use repo URL from component mode if provided, otherwise detect from workspace
    if (this.pendingRepoUrl) {
      const parsed = GitHubService.parseRepoUrl(this.pendingRepoUrl);
      if (parsed) {
        this.currentRepo = { owner: parsed.owner, repo: parsed.repo, defaultBranch: 'main', remoteUrl: this.pendingRepoUrl };
        this.postMessage({ type: 'repoDetected', repo: this.currentRepo });
      }
      this.pendingRepoUrl = undefined;
    } else {
      const repo = this.folderPath
        ? await this.githubService.detectRepoForFolder(this.folderPath)
        : await this.githubService.detectRepo();
      if (repo) {
        this.currentRepo = repo;
        this.postMessage({ type: 'repoDetected', repo });
        // Auto-load issues for the hub landing page
        await this.onLoadIssues(1);
      }
    }

    // Pre-fill description if opened with initial content (e.g. from scorecard)
    if (this.pendingDescription !== undefined) {
      this.postMessage({ type: 'prefillDescription', description: this.pendingDescription, packs: this.pendingPacks });
      this.pendingDescription = undefined;
      this.pendingPacks = undefined;
    }

    // Phase 6 — Send governance bridge data if available
    this.sendGovernanceData();
  }

  private sendGovernanceData() {
    if (this.folderPath) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { readGovernanceDecision } = require('../utils/governanceBridge');
        const data = readGovernanceDecision(this.folderPath);
        this.postMessage({ type: 'governanceData', data });
      } catch { /* governance bridge is best-effort */ }
    }
  }

  private sendWorkspaceFolders(selectedPath?: string) {
    const folders = FolderStateService.getInstance().getWorkspaceFolders();
    this.postMessage({
      type: 'workspaceFolders',
      folders,
      ...(selectedPath ? { selectedPath } : {}),
    } as ExtensionMessage);
  }

  private async onSwitchFolder(folderPath: string) {
    this.folderPath = folderPath;
    FolderStateService.getInstance().setSelectedFolder(folderPath);
    this.sendWorkspaceFolders(folderPath);

    // Re-detect repo for the new folder
    const repo = await this.githubService.detectRepoForFolder(folderPath);
    if (repo) {
      this.currentRepo = repo;
      this.postMessage({ type: 'repoDetected', repo });
      await this.onLoadIssues(1);
    }

    // Re-detect stack
    await this.onDetectStack();

    // Re-read governance data for new folder
    this.sendGovernanceData();
  }

  private async onListModels() {
    try {
      const allModels = await vscode.lm.selectChatModels({});
      const models = allModels.map(m => ({
        id: m.id,
        family: m.family,
        name: m.name,
        vendor: m.vendor,
        version: m.version,
        maxInputTokens: m.maxInputTokens,
      }));
      this.postMessage({ type: 'availableModels', models, defaultFamily: 'codex' });
    } catch {
      // VS Code LM API not available — webview keeps its static fallback list
    }
  }

  private async onGenerate(message: Extract<WebviewMessage, { type: 'generate' }>) {
    this.postMessage({ type: 'loading', active: true });

    try {
      this.lastSelectedPacks = message.packs;
      const packContents = promptPackService.getSelectedPackContents(message.packs);
      const defaultContent = promptPackService.getDefaultPackContent();
      const contentStrings = [
        ...(defaultContent ? [defaultContent] : []),
        ...packContents.map(p => p.content),
      ];
      const detected = this.pendingStackOverride || await this.techStackDetector.detect(this.folderPath);
      const stack = message.stackOverrides
        ? { ...detected, ...message.stackOverrides }
        : detected;

      const rctro = await this.llmService.generateRctro(
        message.description,
        stack,
        contentStrings,
        undefined,
        message.modelOverride
      );

      this.currentRctro = rctro;

      this.postMessage({
        type: 'rctroGenerated',
        rctro,
        markdown: this.rctroToMarkdown(rctro),
      });
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      this.postMessage({ type: 'error', message: errorMessage });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onRegenerate(message: Extract<WebviewMessage, { type: 'regenerate' }>) {
    this.postMessage({ type: 'loading', active: true });

    try {
      const stack = await this.techStackDetector.detect(this.folderPath);

      const rctro = await this.llmService.generateRctro(
        message.feedback,
        stack,
        [],
        message.currentRctro
      );

      this.currentRctro = rctro;

      this.postMessage({
        type: 'rctroGenerated',
        rctro,
        markdown: this.rctroToMarkdown(rctro),
      });
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      this.postMessage({ type: 'error', message: errorMessage });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  // ============================================================================
  // Phase 3: Submit to GitHub
  // ============================================================================

  private async onSubmit(message: Extract<WebviewMessage, { type: 'submit' }>) {
    this.postMessage({ type: 'loading', active: true });
    this.postMessage({ type: 'phaseUpdate', phase: 'submit', status: 'active', message: 'Creating issue...' });

    try {
      const repo = this.currentRepo || await this.githubService.detectRepo();
      if (!repo) {
        throw new Error('Could not detect GitHub repository. Open a folder with a Git remote pointing to GitHub.');
      }

      this.currentRepo = repo;
      const stack = await this.techStackDetector.detect(this.folderPath);

      // Use the packs that were selected during generation
      const selection = this.lastSelectedPacks || {
        owasp: [],
        maintainability: [],
        threatModeling: [],
      };

      const packContents = promptPackService.getSelectedPackContents(selection);

      // Always include the default pack (Security-First Baseline)
      const defaultContent = promptPackService.getDefaultPackContent();
      if (defaultContent) {
        packContents.unshift({
          id: 'default',
          category: 'default',
          name: 'Security-First Baseline',
          filename: 'default.md',
          content: defaultContent,
        });
      }

      const request = {
        title: message.title,
        rctroPrompt: message.rctro,
        selectedPacks: selection,
        packContents,
        techStack: stack,
        labels: [],
        repo,
      };

      const result = await this.githubService.createIssue(request);

      // Store for later phases
      this.currentIssueNumber = result.number;
      this.currentIssueUrl = result.url;

      this.postMessage({
        type: 'issueCreated',
        url: result.url,
        number: result.number,
      });

      this.postMessage({ type: 'phaseUpdate', phase: 'submit', status: 'completed' });
      this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'active' });
      this.emitProgress('assign', 'active');
    } catch (err) {
      const errorMessage = toErrorMessage(err);
      this.postMessage({ type: 'error', message: errorMessage });
      this.postMessage({ type: 'phaseUpdate', phase: 'submit', status: 'error', message: errorMessage });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  // ============================================================================
  // Phase 4: Assign Agent
  // ============================================================================

  private async onAssignAgent(agent: AgentAssignment) {
    if (!this.currentIssueNumber || !this.currentRepo) {
      this.postMessage({ type: 'error', message: 'No issue to assign.' });
      return;
    }

    this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'active', message: 'Assigning...' });

    if (agent === 'skip') {
      this.postMessage({ type: 'agentAssigned', agent: 'skip' });
      this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'completed' });
      this.emitProgress('assign', 'completed');
      this.switchToScorecard();
      return;
    }

    if (agent === 'claude') {
      // Check if alice-remediation workflow exists
      const workflowExists = await this.githubService.checkWorkflowExists(
        this.currentRepo.owner,
        this.currentRepo.repo,
        '.github/workflows/alice-remediation.yml'
      );

      if (!workflowExists) {
        this.postMessage({ type: 'workflowNotFound' });
        // Still proceed — the comment will be posted but won't trigger automation
      }

      const commentBody = `@claude Please analyze this feature request and provide an implementation plan following the RCTRO prompt and security guidelines above.`;

      try {
        // Add remediation label so AgentStatusService detects this as an active agent issue
        await this.githubService.addIssueLabels(
          this.currentRepo.owner,
          this.currentRepo.repo,
          this.currentIssueNumber,
          ['rctro-feature', 'remediation-planning'],
        );

        const result = await this.githubService.createIssueComment(
          this.currentRepo.owner,
          this.currentRepo.repo,
          this.currentIssueNumber,
          commentBody
        );
        this.postMessage({
          type: 'agentAssigned',
          agent: 'claude',
          commentUrl: result.url,
        });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'completed' });
        this.emitProgress('monitor', 'active');
        this.onStartMonitoring();
        this.switchToScorecard();
      } catch (err) {
        const msg = toErrorMessage(err);
        this.postMessage({ type: 'error', message: `Failed to assign: ${msg}` });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'error', message: msg });
        return;
      }
    }

    if (agent === 'copilot') {
      try {
        // Assign Copilot as issue assignee — this triggers the Copilot coding agent
        await this.githubService.assignIssue(
          this.currentRepo.owner,
          this.currentRepo.repo,
          this.currentIssueNumber,
          ['copilot-swe-agent[bot]'],
        );
        // Post context comment (no @copilot prefix — assignment triggers the agent)
        await this.githubService.createIssueComment(
          this.currentRepo.owner,
          this.currentRepo.repo,
          this.currentIssueNumber,
          'Please implement this feature following the RCTRO prompt and security guidelines above.'
        );
        this.postMessage({ type: 'agentAssigned', agent: 'copilot' });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'completed' });
        this.emitProgress('monitor', 'active');
        this.onStartMonitoring();
        this.switchToScorecard();
      } catch (err) {
        const msg = toErrorMessage(err);
        this.postMessage({ type: 'error', message: `Failed to assign Copilot: ${msg}` });
        this.postMessage({ type: 'phaseUpdate', phase: 'assign', status: 'error', message: msg });
      }
    }
  }

  /** Offer to add the repo folder to the workspace, then open the Security Scorecard. */
  private async switchToScorecard() {
    const repoName = this.currentRepo?.repo;
    if (repoName) {
      const folders = vscode.workspace.workspaceFolders || [];
      const alreadyOpen = folders.some(f =>
        f.name === repoName || f.uri.fsPath.endsWith(`/${repoName}`) || f.uri.fsPath.endsWith(`\\${repoName}`)
      );

      if (!alreadyOpen) {
        // Try to find the repo locally before asking
        const localPath = this.findRepoLocally(repoName);

        if (localPath) {
          const action = await vscode.window.showInformationMessage(
            `Found "${repoName}" at ${localPath}. Add to workspace for Security Scorecard monitoring?`,
            'Add to Workspace',
            'Skip',
          );
          if (action === 'Add to Workspace') {
            const insertIdx = vscode.workspace.workspaceFolders?.length || 0;
            vscode.workspace.updateWorkspaceFolders(insertIdx, 0, { uri: vscode.Uri.file(localPath) });
          }
        } else {
          const action = await vscode.window.showInformationMessage(
            `"${repoName}" not found locally. Locate it so the Security Scorecard can monitor it?`,
            'Browse...',
            'Skip',
          );
          if (action === 'Browse...') {
            const picked = await vscode.window.showOpenDialog({
              canSelectFolders: true, canSelectFiles: false, canSelectMany: false,
              openLabel: `Select "${repoName}" folder`,
              ...(this.getDefaultSearchDir() ? { defaultUri: vscode.Uri.file(this.getDefaultSearchDir()!) } : {}),
            });
            if (picked?.[0]) {
              const insertIdx = vscode.workspace.workspaceFolders?.length || 0;
              vscode.workspace.updateWorkspaceFolders(insertIdx, 0, { uri: picked[0] });
            }
          }
        }
      }
    }

    // Give the workspace time to settle after folder changes before opening scorecard
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Find the folder path for this repo so the scorecard auto-selects it
    const repoFolderPath = this.findRepoFolderPath(repoName);

    // Reveal the scorecard — monitoring continues in the background
    vscode.commands.executeCommand('maintainabilityai.openScorecard', repoFolderPath);
    if (this.panel.visible) {
      this.panel.reveal(vscode.ViewColumn.Beside, true);
    }
  }

  /** Find the workspace folder path for a repo by name. */
  private findRepoFolderPath(repoName: string | undefined): string | undefined {
    if (!repoName) { return undefined; }
    const folders = vscode.workspace.workspaceFolders || [];
    const match = folders.find(f =>
      f.name === repoName ||
      f.uri.fsPath.endsWith(`/${repoName}`) ||
      f.uri.fsPath.endsWith(`\\${repoName}`)
    );
    return match?.uri.fsPath;
  }

  /** Search workspace folders and sibling directories for a repo by name. */
  private findRepoLocally(repoName: string): string | null {
    const folders = vscode.workspace.workspaceFolders || [];
    // Check inside each workspace folder
    for (const folder of folders) {
      const sub = path.join(folder.uri.fsPath, repoName);
      if (fs.existsSync(sub) && fs.statSync(sub).isDirectory()) { return sub; }
    }
    // Check sibling directories of workspace folders
    for (const folder of folders) {
      const parent = path.dirname(folder.uri.fsPath);
      const sibling = path.join(parent, repoName);
      if (fs.existsSync(sibling) && fs.statSync(sibling).isDirectory()) { return sibling; }
    }
    return null;
  }

  /** Get a sensible default directory for the folder picker. */
  private getDefaultSearchDir(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return path.dirname(folders[0].uri.fsPath);
    }
    return null;
  }

  private async onApproveAgent(agent?: 'claude' | 'copilot') {
    if (!this.currentIssueNumber || !this.currentRepo) {
      this.postMessage({ type: 'error', message: 'No issue to approve.' });
      return;
    }

    const commentBody = agent === 'copilot'
      ? 'Approved — proceed with implementation.'
      : '@claude approved';

    try {
      await this.githubService.createIssueComment(
        this.currentRepo.owner,
        this.currentRepo.repo,
        this.currentIssueNumber,
        commentBody
      );
      this.postMessage({ type: 'phaseUpdate', phase: 'monitor', status: 'active', message: 'Plan approved — implementation starting...' });
    } catch (err) {
      const msg = toErrorMessage(err);
      this.postMessage({ type: 'error', message: `Failed to approve: ${msg}` });
    }
  }

  private async onReplanAgent(feedback: string, agent?: 'claude' | 'copilot') {
    if (!this.currentIssueNumber || !this.currentRepo) {
      this.postMessage({ type: 'error', message: 'No issue to send feedback on.' });
      return;
    }

    const handle = agent === 'copilot' ? 'Copilot' : '@claude';
    const commentBody = `${handle}: Please revise the plan based on this feedback:\n\n${feedback}`;

    try {
      await this.githubService.createIssueComment(
        this.currentRepo.owner,
        this.currentRepo.repo,
        this.currentIssueNumber,
        commentBody
      );
      this.postMessage({ type: 'phaseUpdate', phase: 'monitor', status: 'active', message: 'Feedback sent — waiting for revised plan...' });
    } catch (err) {
      const msg = toErrorMessage(err);
      this.postMessage({ type: 'error', message: `Failed to send feedback: ${msg}` });
    }
  }

  // ============================================================================
  // Phase 5: Monitor Progress
  // ============================================================================

  private onStartMonitoring() {
    if (!this.currentIssueNumber || !this.currentRepo || !this.currentIssueUrl) {
      return;
    }
    this.monitorService.startMonitoring(
      this.currentIssueNumber,
      this.currentIssueUrl,
      this.currentRepo
    );
    this.postMessage({ type: 'phaseUpdate', phase: 'monitor', status: 'active' });
    this.emitProgress('monitor', 'active');
  }

  // ============================================================================
  // Phase 6: Complete — Checkout Branch
  // ============================================================================

  private async onCheckoutBranch(branch: string) {
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) {
      this.postMessage({ type: 'error', message: 'No workspace folder open. Open the project folder first.' });
      return;
    }

    try {
      await execFileAsync('git', ['fetch', 'origin'], { cwd });
      await execFileAsync('git', ['checkout', branch], { cwd });
      this.postMessage({ type: 'branchCheckedOut', branch });
      vscode.window.showInformationMessage(`Switched to branch: ${branch}`);
    } catch (err) {
      const msg = toErrorMessage(err);
      if (msg.includes('uncommitted changes') || msg.includes('local changes')) {
        this.postMessage({
          type: 'error',
          message: `Cannot checkout: you have uncommitted changes. Stash or commit them first, then try again.`,
        });
      } else {
        this.postMessage({ type: 'error', message: `Checkout failed: ${msg}` });
      }
    }
  }

  // ============================================================================
  // Phase 6: Complete — Sync Repo
  // ============================================================================

  private async onSyncRepo() {
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) {
      this.postMessage({ type: 'error', message: 'No workspace folder open. Open the project folder first.' });
      return;
    }

    try {
      await execFileAsync('git', ['fetch', 'origin'], { cwd });
      await execFileAsync('git', ['pull'], { cwd });
      this.postMessage({ type: 'repoSynced', message: 'Repository synced successfully.' });
      vscode.window.showInformationMessage('Repository synced with remote.');
    } catch (err) {
      const msg = toErrorMessage(err);
      if (msg.includes('uncommitted changes') || msg.includes('local changes')) {
        this.postMessage({
          type: 'error',
          message: 'Cannot sync: you have uncommitted changes. Stash or commit them first, then try again.',
        });
      } else {
        this.postMessage({ type: 'error', message: `Sync failed: ${msg}` });
      }
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private async onDetectStack() {
    const root = this.folderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const stack = await this.techStackDetector.detect(root);
    const metadata = root ? readRepoMetadata(root) : null;
    this.postMessage({ type: 'stackDetected', stack, metadata: metadata || undefined });
  }

  private onSaveMetadata(message: Extract<WebviewMessage, { type: 'saveMetadata' }>) {
    const workspaceRoot = this.folderPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) { return; }
    try {
      const existing = readRepoMetadata(workspaceRoot);
      const updated = mergeMetadata(existing, {
        language: message.metadata.language,
        module_system: message.metadata.module_system,
        testing: message.metadata.testing,
        package_manager: message.metadata.package_manager,
        llm: message.metadata.modelFamily ? { model_family: message.metadata.modelFamily } : undefined,
      });
      writeRepoMetadata(workspaceRoot, updated);
      this.postMessage({ type: 'metadataSaved' });
    } catch {
      // Non-critical — don't surface errors for metadata save
    }
  }

  private async onLoadIssues(page?: number) {
    if (!this.currentRepo) {
      return;
    }
    this.postMessage({ type: 'loading', active: true });
    try {
      const result = await this.githubService.listIssues(
        this.currentRepo.owner,
        this.currentRepo.repo,
        page || 1
      );
      this.postMessage({
        type: 'issuesLoaded',
        issues: result.issues,
        hasMore: result.hasMore,
        page: page || 1,
      });
    } catch (err) {
      const msg = toErrorMessage(err);
      this.postMessage({ type: 'error', message: `Failed to load issues: ${msg}` });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private onSelectIssue(issueNumber: number, issueUrl: string) {
    this.currentIssueNumber = issueNumber;
    this.currentIssueUrl = issueUrl;
  }

  private onBackToHub() {
    this.monitorService.stopMonitoring();
    this.currentIssueNumber = undefined;
    this.currentIssueUrl = undefined;
    this.currentRctro = undefined;
    this.lastSelectedPacks = undefined;
    IssueCreatorPanel._onProgress.fire(null);
  }

  private emitProgress(phase: string, status: string) {
    if (this.currentIssueNumber && this.currentRepo) {
      const issueInfo = {
        number: this.currentIssueNumber,
        url: this.currentIssueUrl || '',
        phase,
        status,
        repo: `${this.currentRepo.owner}/${this.currentRepo.repo}`,
      };
      IssueCreatorPanel._onProgress.fire(issueInfo);
      // Persist so the Scorecard can pick it up even if opened later
      this.context.workspaceState.update('maintainabilityai.activeIssue', issueInfo);
    }
  }

  private onLoadPromptPacks() {
    const packs = promptPackService.getAllPacks();
    this.postMessage({ type: 'promptPacks', packs });
  }

  private onSelectTemplate(templateId: string) {
    const template = ISSUE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      this.postMessage({
        type: 'templateLoaded',
        description: template.descriptionHint,
        packs: template.defaultPacks,
      });
    }
  }

  private rctroToMarkdown(rctro: RctroPrompt): string {
    let md = '';
    md += `**Role:** ${rctro.role}\n\n`;
    md += `**Context:** ${rctro.context}\n\n`;
    md += `**Task:** ${rctro.task}\n\n`;
    md += `**Requirements:**\n\n`;
    rctro.requirements.forEach((req, i) => {
      md += `${i + 1}. **${req.title}**\n`;
      for (const detail of req.details) {
        md += `   - ${detail}\n`;
      }
      md += `   - Validation: ${req.validation}\n\n`;
    });
    md += `**Output:** ${rctro.output}\n`;
    return md;
  }

  protected getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'main.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https://avatars.githubusercontent.com https://github.com https://user-images.githubusercontent.com;">
  <title>MaintainabilityAI — Rabbit Hole</title>
  <style>
    ${getSharedStyles()}
    body { padding: 0; height: 100vh; overflow: hidden; }

    .app {
      display: grid;
      grid-template-columns: 200px 1fr;
      height: 100vh;
    }

    /* === Phase Sidebar === */
    .phase-sidebar {
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .phase-sidebar h2 {
      font-size: 13px;
      font-weight: 600;
      padding: 0 16px 16px;
      color: var(--accent);
      letter-spacing: 0.5px;
    }

    .phase-list {
      list-style: none;
      padding: 0;
      flex: 1;
    }

    .phase-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      cursor: default;
      font-size: 12px;
      color: var(--text-secondary);
      transition: background 0.15s;
    }

    .phase-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
      border: 2px solid var(--border);
      color: var(--text-secondary);
    }

    .phase-item.active {
      color: var(--text-primary);
      background: rgba(124, 58, 237, 0.08);
    }
    .phase-item.active .phase-num {
      border-color: var(--accent);
      color: var(--accent);
      background: rgba(124, 58, 237, 0.1);
    }

    .phase-item.completed .phase-num {
      border-color: var(--success);
      color: var(--success);
      background: rgba(34, 197, 94, 0.1);
    }
    .phase-item.completed { color: var(--text-secondary); }

    .phase-item.error .phase-num {
      border-color: var(--error);
      color: var(--error);
    }

    .sidebar-repo {
      padding: 12px 16px;
      font-size: 11px;
      color: var(--text-secondary);
      border-top: 1px solid var(--border);
      margin-top: auto;
    }

    /* === Main Content === */
    .phase-content {
      overflow-y: auto;
      padding: 24px 32px;
    }

    /* === Shared Styles === */
    h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    h3 {
      font-size: 13px; font-weight: 600; margin: 16px 0 8px;
      color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;
    }

    label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--text-secondary); }

    textarea, input[type="text"], select {
      width: 100%; padding: 8px 10px;
      background: var(--bg-input); border: 1px solid var(--border); border-radius: 4px;
      color: var(--text-primary); font-family: var(--vscode-font-family); font-size: 13px;
      resize: vertical;
    }
    textarea:focus, input:focus, select:focus { outline: 1px solid var(--accent); border-color: var(--accent); }

    .error-msg { margin-top: 8px; }

    .loading { display: none; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 12px; margin-top: 8px; }
    .loading.active { display: flex; }
    .loading .spinner { width: 14px; height: 14px; border-width: 2px; }

    /* === Phase-specific: Input === */
    .category-group { margin-bottom: 12px; }
    .category-group h4 { font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--accent); }
    .checkbox-item { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 12px; }
    .checkbox-item input[type="checkbox"] { accent-color: var(--accent); }
    .default-pack-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .default-pack-badge {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      padding: 2px 6px; border-radius: 3px;
      background: rgba(34, 197, 94, 0.15); color: #22c55e;
      letter-spacing: 0.5px;
    }
    .default-pack-desc {
      font-size: 12px; color: var(--text-secondary);
      padding: 8px 10px; border-radius: 4px;
      background: var(--surface-alt); border: 1px solid var(--border);
      line-height: 1.5;
    }
    .stack-display {
      background: var(--bg-input); border: 1px solid var(--border); border-radius: 4px;
      padding: 8px 10px; font-size: 12px; color: var(--text-secondary); line-height: 1.6;
    }
    .stack-item { display: flex; justify-content: space-between; }
    .stack-label { font-weight: 600; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* === Phase-specific: Review === */
    .rctro-preview {
      white-space: pre-wrap; font-family: var(--vscode-editor-font-family); font-size: 13px;
      line-height: 1.6; padding: 16px; background: var(--bg-input); border: 1px solid var(--border);
      border-radius: 4px; max-height: 50vh; overflow-y: auto;
    }
    .review-actions { display: flex; gap: 8px; margin-top: 16px; align-items: center; }
    .iteration-badge { font-size: 11px; color: var(--text-secondary); margin-left: auto; }
    .feedback-area { margin-top: 12px; }
    .feedback-area textarea { min-height: 80px; }

    /* === Phase-specific: Submit === */
    .submit-steps { margin: 16px 0; }
    .submit-step { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 13px; }
    .submit-step-icon { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
    .submit-step.done .submit-step-icon { border-color: var(--success); color: var(--success); }
    .submit-step.running .submit-step-icon { border-color: var(--running); color: var(--running); animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

    .issue-url { font-size: 13px; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 4px; margin-top: 12px; }
    .issue-url a { color: var(--success); text-decoration: underline; cursor: pointer; }

    /* === Phase-specific: Assign === */
    .agent-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
    .agent-card {
      padding: 20px 16px; border: 2px solid var(--border); border-radius: 8px; cursor: pointer;
      text-align: center; transition: border-color 0.15s, background 0.15s;
    }
    .agent-card:hover { border-color: var(--accent); background: rgba(124, 58, 237, 0.05); }
    .agent-card h4 { font-size: 14px; margin-bottom: 8px; }
    .agent-card p { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }

    .workflow-warning {
      margin-top: 12px; padding: 10px 12px; background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 4px; font-size: 12px; color: var(--running);
    }

    /* === Phase-specific: Monitor === */
    .monitor-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .monitor-header a { color: var(--accent); text-decoration: underline; cursor: pointer; font-size: 13px; }
    .polling-badge { font-size: 11px; color: var(--running); display: flex; align-items: center; gap: 4px; margin-left: auto; }
    .polling-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--running); animation: pulse 1.5s infinite; }

    .timeline { max-height: 55vh; overflow-y: auto; }
    .timeline-card {
      padding: 12px; margin-bottom: 8px; border: 1px solid var(--border); border-radius: 6px;
      border-left: 3px solid var(--border);
    }
    .timeline-card.bot { border-left-color: var(--purple); background: rgba(168, 85, 247, 0.04); }
    .timeline-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
    .timeline-avatar { width: 20px; height: 20px; border-radius: 50%; }
    .bot-badge { background: var(--purple); color: #fff; font-size: 9px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; font-weight: 700; }
    .edited-badge { background: var(--accent); color: #fff; font-size: 9px; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; font-weight: 700; }
    .timeline-time { color: var(--text-secondary); margin-left: auto; font-size: 11px; }
    .timeline-body { font-size: 12px; line-height: 1.5; word-break: break-word; max-height: 400px; overflow-y: auto; }
    .timeline-body pre { background: rgba(0,0,0,0.2); padding: 8px 10px; border-radius: 4px; overflow-x: auto; margin: 6px 0; }
    .timeline-body code { background: rgba(0,0,0,0.15); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .timeline-body pre code { background: none; padding: 0; }
    .timeline-body h3, .timeline-body h4, .timeline-body h5 { color: var(--text-primary); }
    .timeline-body img { border-radius: 4px; }
    .timeline-empty { text-align: center; padding: 40px 20px; color: var(--text-secondary); font-size: 13px; }

    .approve-banner {
      margin: 12px 0; padding: 12px 16px; border: 1px solid var(--purple); border-radius: 6px;
      background: rgba(168, 85, 247, 0.08); display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .approve-banner span { font-size: 13px; font-weight: 500; }
    .approve-banner.approved { border-color: var(--success); background: rgba(34, 197, 94, 0.06); }

    .agent-status {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin: 8px 0 12px;
      border-radius: 6px; font-size: 13px; font-weight: 500;
      border: 1px solid var(--border); background: var(--card-bg);
    }
    .agent-status span:first-child { font-size: 16px; }
    .status-analyzing { border-color: var(--running); }
    .status-planning { border-color: var(--running); }
    .status-awaiting-approval { border-color: var(--purple); background: rgba(168, 85, 247, 0.06); }
    .status-implementing { border-color: var(--accent); background: rgba(59, 130, 246, 0.06); }
    .status-testing { border-color: var(--warning, #f59e0b); }
    .status-complete { border-color: var(--success); background: rgba(34, 197, 94, 0.06); }

    .pr-banner {
      margin: 12px 0; padding: 12px 16px; border: 1px solid var(--success); border-radius: 6px;
      background: rgba(34, 197, 94, 0.06);
    }
    .pr-banner h4 { font-size: 13px; margin-bottom: 6px; }
    .pr-banner .pr-meta { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
    .pr-banner .pr-actions { display: flex; gap: 8px; }
    .checks-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
    .checks-passing { background: var(--success); }
    .checks-failing { background: var(--error); }
    .checks-pending { background: var(--running); }
    .checks-unknown { background: var(--text-secondary); }

    /* === Phase-specific: Complete === */
    .complete-card {
      text-align: center; padding: 32px; border: 1px solid var(--success); border-radius: 8px;
      background: rgba(34, 197, 94, 0.06); margin-top: 16px;
    }
    .cheshire-header { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
    .cheshire-header svg { flex-shrink: 0; border-radius: 8px; }
    .cheshire-header h2 { margin: 0; }
    .complete-card h2 { font-size: 18px; margin-bottom: 8px; }
    .complete-card p { color: var(--text-secondary); margin-bottom: 4px; font-size: 13px; }
    .complete-card .complete-actions { margin-top: 16px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }

    /* === Issue List Hub === */
    .issue-row { padding: 12px 16px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 6px; cursor: pointer; transition: background 0.15s, border-color 0.15s; display: flex; align-items: center; gap: 12px; }
    .issue-row:hover { background: rgba(124, 58, 237, 0.06); border-color: var(--accent); }
    .issue-number { font-size: 12px; color: var(--text-secondary); font-weight: 600; min-width: 40px; }
    .issue-content { flex: 1; min-width: 0; }
    .issue-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .issue-meta { margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .issue-label { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; margin-right: 2px; }
    .issue-time { text-align: right; flex-shrink: 0; font-size: 11px; color: var(--text-secondary); }
    .hub-layout { padding: 0; max-width: 800px; }
    .hub-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .hub-header h2 { margin-bottom: 4px; }
    .folder-select { background: var(--bg-input); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary); font-size: 12px; padding: 3px 8px; max-width: 200px; font-family: var(--vscode-font-family); }
    .folder-select:focus { outline: none; border-color: var(--accent); }
    .hub-empty { text-align: center; padding: 40px; color: var(--text-secondary); }
    #back-to-hub-link { padding: 8px 16px; font-size: 12px; cursor: pointer; color: var(--accent); }
    #back-to-hub-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="app">
    <nav class="phase-sidebar">
      <h2>Rabbit Hole</h2>
      <ol class="phase-list" id="phaseList">
        <li class="phase-item active" data-phase="input"><span class="phase-num">1</span><span>Input & Generate</span></li>
        <li class="phase-item pending" data-phase="review"><span class="phase-num">2</span><span>Review RCTRO</span></li>
        <li class="phase-item pending" data-phase="submit"><span class="phase-num">3</span><span>Submit to GitHub</span></li>
        <li class="phase-item pending" data-phase="assign"><span class="phase-num">4</span><span>Assign Agent</span></li>
      </ol>
      <div id="repo-info" class="sidebar-repo"></div>
    </nav>
    <main class="phase-content" id="phaseContent">
      <!-- Rendered by main.ts -->
    </main>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  protected onDispose(): void {
    this.monitorService.dispose();
  }

  protected clearCurrentPanel(): void {
    IssueCreatorPanel.currentPanel = undefined;
  }
}
