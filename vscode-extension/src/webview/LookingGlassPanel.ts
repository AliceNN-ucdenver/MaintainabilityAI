import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type {
  ArchitectureDsl,
  CapabilityModelType,
  BarSummary,
  LookingGlassWebviewMessage,
  LookingGlassExtensionMessage,
  Criticality,
  RecommendedPlatform,
  DriftWeights,
} from '../types';
import { MeshService } from '../services/MeshService';
import { BarService } from '../services/BarService';
import { GitHubService } from '../services/GitHubService';
import { OrgScannerService } from '../services/OrgScannerService';
import { ThreatModelService, exportThreatModelCsv } from '../services/ThreatModelService';
import { GitSyncService } from '../services/GitSyncService';
import { CapabilityModelService } from '../services/CapabilityModelService';
import { generateMermaidDiagrams } from '../services/CalmTransformer';
import { readCalmArchitectureData, readLayoutFile, writeLayoutFile } from '../services/LayoutPersistenceService';
import { applyPatch as applyCalmPatch, type CalmPatch } from '../services/CalmWriteService';
import { CalmFileWatcher } from '../services/CalmFileWatcher';
import { validate as validateCalm } from '../services/CalmValidator';
import { generateArchetype, type ArchetypeId } from '../templates/scaffolding/archetypeTemplates';

const execFileAsync = promisify(execFile);

export class LookingGlassPanel {
  public static currentPanel: LookingGlassPanel | undefined;
  private static readonly viewType = 'maintainabilityai.lookingGlass';

  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private readonly meshService: MeshService;
  private readonly barService: BarService;
  private readonly githubService: GitHubService;
  private readonly gitSyncService: GitSyncService;
  private readonly capabilityModelService: CapabilityModelService;
  private readonly calmFileWatcher: CalmFileWatcher;
  private disposables: vscode.Disposable[] = [];
  private lastDrilledBarPath: string | undefined;
  private lastDrilledBarName: string | undefined;
  private activeReviewPollTimer: ReturnType<typeof setInterval> | undefined;
  private lastActiveReviewState: boolean = false;
  public pendingBarPath: string | undefined;
  private pendingActiveReview: import('../types').ActiveReviewInfo | undefined;
  private meshRepoInfo: { owner: string; repo: string } | null = null;

  public static createOrShow(context: vscode.ExtensionContext, barPath?: string, activeReview?: import('../types').ActiveReviewInfo) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (LookingGlassPanel.currentPanel) {
      LookingGlassPanel.currentPanel.panel.reveal(column);
      if (activeReview && barPath) {
        LookingGlassPanel.currentPanel.pendingActiveReview = activeReview;
      }
      if (barPath) {
        LookingGlassPanel.currentPanel.onDrillIntoBar(barPath);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      LookingGlassPanel.viewType,
      'MaintainabilityAI \u2014 Looking Glass',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
        ],
      }
    );

    LookingGlassPanel.currentPanel = new LookingGlassPanel(panel, context);
    if (barPath) {
      // Drill in after the webview sends 'ready' — onReady already loads portfolio,
      // so we queue the drill-in to happen after init completes
      LookingGlassPanel.currentPanel.pendingBarPath = barPath;
      if (activeReview) {
        LookingGlassPanel.currentPanel.pendingActiveReview = activeReview;
      }
    }
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.context = context;
    this.meshService = new MeshService();
    this.barService = new BarService();
    this.githubService = new GitHubService();
    this.gitSyncService = new GitSyncService();
    this.capabilityModelService = new CapabilityModelService();
    this.calmFileWatcher = new CalmFileWatcher();

    // Start watching *.arch.json for external changes
    this.calmFileWatcher.start((filePath) => {
      this.onExternalCalmFileChanged(filePath);
    });

    this.panel.webview.html = this.getHtmlContent(panel.webview, context.extensionUri);

    this.panel.webview.onDidReceiveMessage(
      (msg: LookingGlassWebviewMessage) => this.handleMessage(msg),
      null,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private postMessage(msg: LookingGlassExtensionMessage) {
    this.panel.webview.postMessage(msg);
  }

  private async handleMessage(message: LookingGlassWebviewMessage) {
    switch (message.type) {
      case 'ready':
        await this.onReady();
        break;

      case 'refresh':
        await this.loadPortfolio();
        break;

      case 'pickFolder': {
        const picked = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Select folder for Initiative Mesh',
          title: 'MaintainabilityAI \u2014 Initialize Mesh',
        });
        if (picked && picked.length > 0) {
          this.postMessage({ type: 'folderPicked', path: picked[0].fsPath });
        }
        break;
      }

      case 'initMesh':
        await this.onInitMesh(message.name, message.org, message.owner, message.folderPath, message.createRepo, message.repoName, message.repoVisibility, message.architectureDsl, message.capabilityModel);
        break;

      case 'samplePlatform':
        await this.onSamplePlatform();
        break;

      case 'addPlatform':
        await this.onAddPlatform(message.name, message.abbreviation, message.owner);
        break;

      case 'scaffoldBar':
        await this.onScaffoldBar(
          message.name,
          message.platformId,
          message.criticality,
          message.template
        );
        break;

      case 'drillIntoBar':
        await this.onDrillIntoBar(message.barPath);
        break;

      case 'openFile': {
        const uri = vscode.Uri.file(message.path);
        try {
          const stat = await vscode.workspace.fs.stat(uri);
          if (stat.type === vscode.FileType.Directory) {
            vscode.commands.executeCommand('revealInExplorer', uri);
          } else {
            vscode.window.showTextDocument(uri);
          }
        } catch {
          vscode.window.showErrorMessage(`File not found: ${message.path}`);
        }
        break;
      }

      case 'detectGitHubDefaults':
        await this.onDetectGitHubDefaults();
        break;

      case 'scanOrg':
        await this.onScanOrg(message.org, message.modelFamily);
        break;

      case 'scanOrgWithRepos':
        await this.onScanOrgWithRepos(message.org, message.repoNames, message.modelFamily);
        break;

      case 'loadOrgRepos':
        await this.onLoadOrgRepos(message.org);
        break;

      case 'addReposToBar':
        await this.onAddReposToBar(message.barPath, message.repoUrls);
        break;

      case 'applyOrgScan':
        await this.onApplyOrgScan(message.platforms, message.template, message.updates);
        break;

      case 'listModels':
        await this.onListModels();
        break;

      case 'updateBarField':
        await this.onUpdateBarField(message.barPath, message.field, message.value);
        break;

      case 'updateAppYaml':
        await this.onUpdateAppYaml(message.barPath, message.fields);
        break;

      case 'listAdrs':
        await this.onListAdrs(message.barPath);
        break;

      case 'createAdr':
        await this.onCreateAdr(message.barPath, message.adr);
        break;

      case 'updateAdr':
        await this.onUpdateAdr(message.barPath, message.adr);
        break;

      case 'deleteAdr':
        await this.onDeleteAdr(message.barPath, message.adrId);
        break;

      case 'generateThreatModel':
        await this.onGenerateThreatModel(message.barPath);
        break;

      case 'exportThreatModelCsv':
        await this.onExportThreatModelCsv(message.barPath, message.threats);
        break;

      case 'syncBar':
        await this.onSyncBar(message.barPath);
        break;

      case 'pushMesh':
        await this.onPushMesh();
        break;

      case 'pullMesh':
        await this.onPullMesh();
        break;

      case 'switchCapabilityModel':
        await this.onSwitchCapabilityModel(message.modelType);
        break;

      case 'uploadCustomModel':
        await this.onUploadCustomModel(message.jsonContent);
        break;

      case 'openRepoInContext':
        await this.onOpenRepoInContext(message.repoUrl, message.barPath);
        break;

      case 'loadPolicies':
        await this.onLoadPolicies();
        break;

      case 'savePolicy':
        await this.onSavePolicy(message.filename, message.content);
        break;

      case 'lookupNistControl':
        this.onLookupNistControl(message.controlId);
        break;

      case 'createNistCatalog':
        await this.onCreateNistCatalog();
        break;

      case 'generatePolicyBaseline':
        await this.onGeneratePolicyBaseline(message.filename);
        break;

      case 'calmMutation':
        this.onCalmMutation(message.barPath, message.patch as CalmPatch[]);
        break;

      case 'applyArchetype':
        await this.onApplyArchetype(message.barPath, message.archetypeId, message.appName);
        break;

      case 'saveLayout':
        this.onSaveLayout(message.barPath, message.diagramType, message.layout as object);
        break;

      case 'exportPng':
        this.onExportPng(message.barPath, message.diagramType, message.pngDataUrl);
        break;

      case 'openOraculum':
        vscode.commands.executeCommand('maintainabilityai.oraculum', message.barPath);
        break;

      case 'summarizeTopFindings':
        this.onSummarizeTopFindings(message.barPath).catch(() => {});
        break;

      // Settings
      case 'checkWorkflowStatus':
        await this.onCheckWorkflowStatus();
        break;

      case 'provisionWorkflow':
        await this.onProvisionWorkflow();
        break;

      case 'savePreferredModel':
        await this.onSavePreferredModel(message.family);
        break;

      case 'loadIssueTemplate':
        await this.onLoadIssueTemplate();
        break;

      case 'saveIssueTemplate':
        await this.onSaveIssueTemplate(message.content);
        break;

      case 'reinitializeMesh':
        await this.onReinitializeMesh();
        break;

      case 'loadDriftWeights':
        this.onLoadDriftWeights();
        break;

      case 'saveDriftWeights':
        this.onSaveDriftWeights(message.weights);
        break;

      case 'openUrl':
        vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;

      case 'backToPortfolio':
      case 'backToPlatform':
      case 'drillIntoPlatform':
      case 'filterBars':
      case 'searchBars':
        // These are handled client-side in the webview
        break;
    }
  }

  private async onReady() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'noMeshConfigured' });
      return;
    }
    await this.loadPortfolio();
    this.detectMeshRepo(meshPath).catch(() => {});
    // If a barPath was requested (e.g. from Oraculum "View BAR"), drill in now
    if (this.pendingBarPath) {
      const barPath = this.pendingBarPath;
      this.pendingBarPath = undefined;
      await this.onDrillIntoBar(barPath);
    }
  }

  private async loadPortfolio() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'noMeshConfigured' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Scanning governance mesh...' });

    try {
      const summary = this.meshService.buildPortfolioSummary(meshPath);
      if (!summary) {
        this.postMessage({ type: 'error', message: 'Failed to read mesh.yaml' });
        return;
      }
      this.postMessage({ type: 'portfolioData', data: summary });
      // Fetch git status for sync indicators
      this.sendGitStatus(meshPath, summary.allBars);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Error scanning mesh: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onInitMesh(
    name: string,
    org: string,
    owner: string,
    folderPath: string,
    createRepo: boolean,
    repoName: string,
    repoVisibility: 'private' | 'public',
    architectureDsl: ArchitectureDsl = 'calm',
    capabilityModel: CapabilityModelType = 'insurance'
  ) {
    type StepStatus = 'pending' | 'active' | 'done' | 'error';
    interface InitStep { label: string; status: StepStatus }

    // Build step list based on whether user wants a GitHub repo
    const steps: InitStep[] = [
      { label: 'Scaffold governance mesh', status: 'pending' },
    ];
    if (createRepo && repoName) {
      steps.push(
        { label: 'Initialize git repository', status: 'pending' },
        { label: `Create GitHub repository: ${repoName}`, status: 'pending' },
        { label: 'Push to remote', status: 'pending' },
        { label: 'Add Oraculum review workflow', status: 'pending' },
        { label: 'Configure ANTHROPIC_API_KEY secret', status: 'pending' },
      );
    }
    steps.push({ label: 'Load portfolio', status: 'pending' });

    const sendProgress = () => {
      this.postMessage({ type: 'initProgress', steps: steps.map(s => ({ ...s })) });
    };

    const markActive = (index: number) => {
      if (index < steps.length) { steps[index].status = 'active'; }
      sendProgress();
    };

    const markDone = (index: number, label?: string) => {
      if (index < steps.length) {
        steps[index].status = 'done';
        if (label) { steps[index].label = label; }
      }
      sendProgress();
    };

    const markError = (index: number, label?: string) => {
      if (index < steps.length) {
        steps[index].status = 'error';
        if (label) { steps[index].label = label; }
      }
      sendProgress();
    };

    const GH_TIMEOUT = 60_000; // 60s timeout for gh commands

    this.postMessage({ type: 'loading', active: true, message: 'Initializing...' });
    markActive(0);

    try {
      // Step 1: Scaffold mesh
      const meshPath = this.meshService.initializeMesh(folderPath, name, org, owner, architectureDsl, capabilityModel);
      await MeshService.setMeshPath(meshPath);
      markDone(0);

      let repoUrl: string | undefined;
      let stepIdx = 1;

      if (createRepo && repoName) {
        // meshPath IS the mesh directory (e.g. ~/Documents/governance-mesh)
        const meshDir = meshPath;

        // Step 2: Git init + commit
        markActive(stepIdx);
        if (!fs.existsSync(path.join(meshDir, '.git'))) {
          await execFileAsync('git', ['init'], { cwd: meshDir });
          await execFileAsync('git', ['branch', '-M', 'main'], { cwd: meshDir });
        }
        await execFileAsync('git', ['add', '-A'], { cwd: meshDir });
        await execFileAsync('git', ['commit', '-m', 'chore: initialize governance mesh\n\nGenerated by MaintainabilityAI VS Code Extension — Looking Glass'], { cwd: meshDir });
        markDone(stepIdx, 'Git initialized and committed');
        stepIdx++;

        // Step 3: Create GitHub repo (--source adds remote, --push pushes)
        markActive(stepIdx);
        try {
          const ghArgs = [
            'repo', 'create', repoName,
            repoVisibility === 'private' ? '--private' : '--public',
            '--source', meshDir,
            '--remote', 'origin',
            '--push',
          ];
          const { stdout } = await execFileAsync('gh', ghArgs, { cwd: meshDir, timeout: GH_TIMEOUT });
          repoUrl = stdout.trim();
          markDone(stepIdx, `Created: ${repoName}`);
          // --push already pushed, mark step 4 done immediately
          stepIdx++;
          markDone(stepIdx, `Pushed to ${repoUrl}`);
        } catch (ghErr: unknown) {
          const errMsg = ghErr instanceof Error ? ghErr.message : String(ghErr);

          if (errMsg.includes('already exists')) {
            // Repo exists — connect remote and we'll push in step 4
            steps[stepIdx].label = 'Connect to existing repository';
            sendProgress();

            const { stdout: ownerLogin } = await execFileAsync('gh', ['api', 'user', '-q', '.login'], { cwd: meshDir, timeout: GH_TIMEOUT });
            const fullRepo = `${ownerLogin.trim()}/${repoName}`;

            try {
              await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: meshDir });
              await execFileAsync('git', ['remote', 'set-url', 'origin', `https://github.com/${fullRepo}.git`], { cwd: meshDir });
            } catch {
              await execFileAsync('git', ['remote', 'add', 'origin', `https://github.com/${fullRepo}.git`], { cwd: meshDir });
            }
            markDone(stepIdx, `Connected to ${fullRepo}`);
            repoUrl = `https://github.com/${fullRepo}`;

            // Step 4: Push to existing remote
            stepIdx++;
            markActive(stepIdx);
            await execFileAsync('git', ['push', '-u', 'origin', 'main'], { cwd: meshDir, timeout: GH_TIMEOUT });
            markDone(stepIdx, `Pushed to ${repoUrl}`);
          } else {
            markError(stepIdx, `GitHub error: ${errMsg}`);
            this.postMessage({
              type: 'error',
              message: `Mesh initialized but GitHub repo creation failed: ${errMsg}`,
            });
            // Skip step 4
            stepIdx++;
            steps[stepIdx].status = 'error';
          }
        }
        // Enable GitHub Actions to create PRs (required for Oraculum workflow)
        if (repoUrl) {
          const repoMatch = repoUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
          if (repoMatch) {
            try {
              await execFileAsync('gh', [
                'api', `repos/${repoMatch[1]}/${repoMatch[2]}/actions/permissions/workflow`,
                '-X', 'PUT',
                '-f', 'default_workflow_permissions=write',
                '-F', 'can_approve_pull_request_reviews=true',
              ], { cwd: meshPath, timeout: GH_TIMEOUT });
            } catch { /* non-fatal — user can enable manually */ }
          }
        }
        stepIdx++;

        // Step 5: Write Oraculum workflow + default prompt pack
        markActive(stepIdx);
        try {
          this.meshService.writeOraculumWorkflow(meshPath, this.context.extensionPath);
          await execFileAsync('git', ['add', '-A'], { cwd: meshPath });
          await execFileAsync('git', ['commit', '-m', 'chore: add oraculum review workflow\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: meshPath });
          await execFileAsync('git', ['push'], { cwd: meshPath, timeout: GH_TIMEOUT });
          markDone(stepIdx, 'Oraculum workflow added');
        } catch (wfErr: unknown) {
          markError(stepIdx, `Workflow error: ${wfErr instanceof Error ? wfErr.message : String(wfErr)}`);
        }
        stepIdx++;

        // Step 6: Configure ANTHROPIC_API_KEY secret
        markActive(stepIdx);
        try {
          const apiKey = await vscode.window.showInputBox({
            title: 'ANTHROPIC_API_KEY',
            prompt: 'Enter your Anthropic API key for Oraculum reviews (or press Escape to skip)',
            password: true,
            placeHolder: 'sk-ant-...',
            validateInput: (v) => {
              if (v && !v.startsWith('sk-ant-')) { return 'Anthropic API keys start with sk-ant-'; }
              return null;
            },
          });

          if (apiKey && repoUrl) {
            // Parse owner/repo from repoUrl
            const repoMatch = repoUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/);
            if (repoMatch) {
              await this.githubService.setRepoSecret(repoMatch[1], repoMatch[2], 'ANTHROPIC_API_KEY', apiKey);
              markDone(stepIdx, 'ANTHROPIC_API_KEY configured');
            } else {
              markDone(stepIdx, 'Skipped — could not parse repo URL');
            }
          } else {
            markDone(stepIdx, 'Skipped — no key provided');
          }
        } catch (secErr: unknown) {
          markError(stepIdx, `Secret error: ${secErr instanceof Error ? secErr.message : String(secErr)}`);
        }
        stepIdx++;
      }

      // Final step: Load portfolio
      markActive(steps.length - 1);

      this.postMessage({ type: 'meshInitialized', path: meshPath, repoUrl });

      if (repoUrl) {
        const action = await vscode.window.showInformationMessage(
          `Governance mesh initialized and pushed to ${repoUrl}`,
          'Open in Browser'
        );
        if (action === 'Open in Browser') {
          vscode.env.openExternal(vscode.Uri.parse(repoUrl));
        }
      }

      await this.loadPortfolio();
      markDone(steps.length - 1, 'Portfolio loaded');
    } catch (err) {
      // Mark current active step as error
      const activeIdx = steps.findIndex(s => s.status === 'active');
      if (activeIdx >= 0) { markError(activeIdx); }
      this.postMessage({
        type: 'error',
        message: `Failed to initialize mesh: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onAddPlatform(name: string, abbreviation: string, owner: string) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Adding platform...' });

    try {
      const result = this.meshService.addPlatform(meshPath, name, abbreviation, owner);
      this.postMessage({ type: 'platformAdded', id: result.id, name });
      await this.loadPortfolio();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to add platform: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onScaffoldBar(
    name: string,
    platformId: string,
    criticality: Criticality,
    template: 'minimal' | 'standard' | 'full'
  ) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Scaffolding BAR...' });

    try {
      const result = this.meshService.scaffoldBar(meshPath, platformId, name, criticality, template);
      if (!result) {
        this.postMessage({ type: 'error', message: `Platform ${platformId} not found` });
        return;
      }
      this.postMessage({ type: 'barScaffolded', id: result.id, name, path: result.path });
      await this.loadPortfolio();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to scaffold BAR: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  public async onDrillIntoBar(barPath: string) {
    // Stop polling for previous BAR's active review
    if (this.lastDrilledBarPath !== barPath) {
      this.stopActiveReviewPolling();
      this.lastActiveReviewState = false;
    }
    this.lastDrilledBarPath = barPath;
    this.postMessage({ type: 'loading', active: true, message: 'Loading BAR details...' });

    try {
      const meshPath = MeshService.getMeshPath();
      if (!meshPath) {
        this.postMessage({ type: 'error', message: 'No mesh configured' });
        return;
      }

      // Find the platform this BAR belongs to
      const summary = this.meshService.buildPortfolioSummary(meshPath);
      const bar = summary?.allBars.find(b => b.path === barPath);
      if (!bar) {
        this.postMessage({ type: 'error', message: 'BAR not found' });
        return;
      }

      const decisions = this.barService.readDecisions(barPath);
      const repoTree = this.barService.readRepoTree(barPath);
      const diagrams = generateMermaidDiagrams(barPath);
      const adrs = this.barService.listAdrs(barPath);

      // Raw CALM JSON for ReactFlow (context + logical diagrams)
      const calmData = readCalmArchitectureData(barPath);

      // Saved layout positions
      const layouts = {
        context: readLayoutFile(barPath, 'context'),
        logical: readLayoutFile(barPath, 'logical'),
      };

      this.postMessage({ type: 'barDetail', bar, decisions, repoTree, diagrams, adrs, calmData, layouts });
      // Refresh git status for sync indicators
      if (summary) {
        this.sendGitStatus(meshPath, summary.allBars);
      }
      // If we have pending active review info from Oraculum, show banner immediately
      if (this.pendingActiveReview) {
        const review = this.pendingActiveReview;
        this.pendingActiveReview = undefined;
        this.postMessage({ type: 'activeReview', barPath, review });
        this.lastActiveReviewState = true;
        this.startActiveReviewPolling(barPath, bar.name);
      } else {
        // Fire-and-forget: detect active review for this BAR
        this.onLoadActiveReview(barPath, bar.name).catch(() => { /* best effort */ });
      }
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to load BAR: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onLoadActiveReview(barPath: string, barName?: string) {
    try {
      const meshPath = MeshService.getMeshPath();
      if (!meshPath) { return; }

      // Detect mesh repo from git remote
      const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: meshPath });
      const url = stdout.trim();
      const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
      if (!match) { return; }

      const [, owner, repo] = match;
      // Use the app display name (from app.yaml) — issue titles use this, not the directory name
      const searchName = barName || path.basename(barPath);
      this.lastDrilledBarName = searchName;
      const review = await this.githubService.getActiveReviewForBar(owner, repo, searchName);

      this.postMessage({ type: 'activeReview', barPath, review });

      // Manage polling: start if active review found, stop if not
      if (review) {
        this.lastActiveReviewState = true;
        this.startActiveReviewPolling(barPath, searchName);
      } else {
        // If we previously had an active review and now it's gone, refresh BAR
        if (this.lastActiveReviewState) {
          this.lastActiveReviewState = false;
          this.stopActiveReviewPolling();
          // Review just completed — refresh BAR to pick up new artifacts
          await this.onDrillIntoBar(barPath);
        } else {
          this.stopActiveReviewPolling();
        }
      }
    } catch {
      // best effort — don't block on active review fetch failures
    }
  }

  private startActiveReviewPolling(barPath: string, barName: string) {
    // Don't create duplicate timers
    if (this.activeReviewPollTimer) { return; }

    this.activeReviewPollTimer = setInterval(async () => {
      // Only poll if we're still looking at this BAR
      if (this.lastDrilledBarPath !== barPath) {
        this.stopActiveReviewPolling();
        return;
      }
      try {
        await this.onLoadActiveReview(barPath, barName);
      } catch { /* best effort */ }
    }, 30_000); // 30 seconds
  }

  private stopActiveReviewPolling() {
    if (this.activeReviewPollTimer) {
      clearInterval(this.activeReviewPollTimer);
      this.activeReviewPollTimer = undefined;
    }
  }

  // ==========================================================================
  // Top Findings Summary (LLM-powered)
  // ==========================================================================

  private async onSummarizeTopFindings(barPath: string) {
    this.postMessage({ type: 'topFindingsProgress', barPath, step: 'Reading review report...', progress: 5 });

    // 1. Find latest review
    const reviews = this.barService.readReviews(barPath);
    if (!reviews || reviews.length === 0) {
      this.postMessage({ type: 'error', message: 'No reviews found for this BAR.' });
      this.postMessage({ type: 'topFindingsSummary', barPath, summary: null });
      return;
    }

    const latest = reviews[reviews.length - 1];
    const reportPath = path.join(barPath, 'reports', `review-${latest.issueNumber}.md`);

    // 2. Read report file
    if (!fs.existsSync(reportPath)) {
      this.postMessage({ type: 'error', message: `Report file not found: review-${latest.issueNumber}.md. Pull the latest changes from remote.` });
      this.postMessage({ type: 'topFindingsSummary', barPath, summary: null });
      return;
    }

    let reportContent: string;
    try {
      reportContent = fs.readFileSync(reportPath, 'utf8');
    } catch {
      this.postMessage({ type: 'error', message: 'Failed to read review report.' });
      this.postMessage({ type: 'topFindingsSummary', barPath, summary: null });
      return;
    }

    // Truncate to stay within context limits
    if (reportContent.length > 12000) {
      reportContent = reportContent.slice(0, 12000) + '\n\n[...truncated]';
    }

    // 3. Select LLM
    this.postMessage({ type: 'topFindingsProgress', barPath, step: 'Connecting to AI model...', progress: 15 });
    const preferred = vscode.workspace.getConfiguration('maintainabilityai.llm').get<string>('preferredFamily', 'gpt-4o');
    const families = [preferred, 'gpt-4o', 'gpt-4', 'codex', 'claude-sonnet'].filter((v, i, a) => a.indexOf(v) === i);
    let model: vscode.LanguageModelChat | null = null;
    for (const family of families) {
      const models = await vscode.lm.selectChatModels({ family });
      if (models.length > 0) { model = models[0]; break; }
    }
    if (!model) {
      const allModels = await vscode.lm.selectChatModels();
      if (allModels.length > 0) { model = allModels[0]; }
    }
    if (!model) {
      this.postMessage({ type: 'error', message: 'No VS Code Language Model available. Ensure GitHub Copilot is installed and signed in.' });
      this.postMessage({ type: 'topFindingsSummary', barPath, summary: null });
      return;
    }

    // 4. Build prompt
    this.postMessage({ type: 'topFindingsProgress', barPath, step: 'Summarizing findings...', progress: 25 });

    const systemPrompt = `You are a senior enterprise architect summarizing a governance review report.
Extract the top 2-3 most important findings for each pillar. Be concise — each finding should be a single sentence.

Output ONLY valid JSON with this exact structure (no markdown fences, no extra text):
{
  "architecture": ["finding 1", "finding 2"],
  "security": ["finding 1", "finding 2"],
  "informationRisk": ["finding 1", "finding 2"],
  "operations": ["finding 1", "finding 2"]
}

If a pillar has no findings, use an empty array. Focus on actionable issues, not passing checks.`;

    const userPrompt = `Summarize the top findings from this architecture review report:\n\n${reportContent}`;

    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt),
    ];

    // 5. Call LLM with streaming
    try {
      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

      let text = '';
      let chunkCount = 0;
      for await (const chunk of response.text) {
        text += chunk;
        chunkCount++;
        if (chunkCount % 5 === 0) {
          const progress = Math.min(25 + Math.round((text.length / 2000) * 60), 90);
          this.postMessage({ type: 'topFindingsProgress', barPath, step: `Summarizing... (${text.length} chars)`, progress });
        }
      }

      // 6. Parse JSON response
      this.postMessage({ type: 'topFindingsProgress', barPath, step: 'Complete', progress: 100 });

      const cleaned = text
        .replace(/^```(?:json)?\s*\n?/m, '')
        .replace(/\n?```\s*$/m, '')
        .trim();

      try {
        const summary = JSON.parse(cleaned);
        this.postMessage({ type: 'topFindingsSummary', barPath, summary });
      } catch {
        // Try to extract JSON from the response
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const summary = JSON.parse(jsonMatch[0]);
            this.postMessage({ type: 'topFindingsSummary', barPath, summary });
            return;
          } catch { /* fall through */ }
        }
        this.postMessage({ type: 'error', message: 'Failed to parse LLM response as JSON.' });
        this.postMessage({ type: 'topFindingsSummary', barPath, summary: null });
      }
    } catch (err) {
      this.postMessage({ type: 'error', message: `LLM request failed: ${err instanceof Error ? err.message : String(err)}` });
      this.postMessage({ type: 'topFindingsSummary', barPath, summary: null });
    }
  }

  private onSaveLayout(barPath: string, diagramType: 'context' | 'logical', layout: object): void {
    try {
      writeLayoutFile(barPath, diagramType, layout as Parameters<typeof writeLayoutFile>[2]);
    } catch (err) {
      console.error('Failed to save layout:', err);
    }
  }

  private onExportPng(barPath: string, diagramType: string, pngDataUrl: string): void {
    try {
      const archDir = path.join(barPath, 'architecture');
      if (!fs.existsSync(archDir)) {
        fs.mkdirSync(archDir, { recursive: true });
      }
      const pngBuffer = Buffer.from(pngDataUrl.split(',')[1], 'base64');
      fs.writeFileSync(path.join(archDir, `${diagramType}.png`), pngBuffer);
      this.postMessage({ type: 'info', message: `Exported ${diagramType} diagram as PNG` });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to export PNG: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private onCalmMutation(barPath: string, patches: CalmPatch[]): void {
    try {
      const archFile = path.join(barPath, 'architecture', 'bar.arch.json');
      const contentHash = applyCalmPatch(archFile, patches);

      if (contentHash) {
        // Mark as our write for echo suppression
        this.calmFileWatcher.markWritten(archFile, contentHash);

        // Run validation on the updated file
        try {
          const raw = fs.readFileSync(archFile, 'utf-8');
          const data = JSON.parse(raw);
          const errors = validateCalm(data);
          if (errors.length > 0) {
            this.postMessage({ type: 'calmValidationErrors', errors });
          }
        } catch {
          // Validation is best-effort
        }
      }
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to apply CALM mutation: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private onExternalCalmFileChanged(filePath: string): void {
    // Path format: {barPath}/architecture/bar.arch.json
    const basename = path.basename(filePath);
    if (basename !== 'bar.arch.json') return;

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const calmData = JSON.parse(raw);
      this.postMessage({ type: 'calmDataUpdated', calmData });
    } catch {
      // File might be temporarily in a bad state during external edit
    }
  }

  private async onApplyArchetype(barPath: string, archetypeId: string, appName: string): Promise<void> {
    try {
      const archDir = path.join(barPath, 'architecture');
      const archFile = path.join(archDir, 'bar.arch.json');

      // Check if file already exists
      if (fs.existsSync(archFile)) {
        const answer = await vscode.window.showWarningMessage(
          'Existing architecture file will be overwritten. Continue?',
          { modal: true },
          'Overwrite',
        );
        if (answer !== 'Overwrite') return;
      }

      // Generate from archetype
      const appId = appName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const result = generateArchetype(archetypeId as ArchetypeId, appName, appId);

      // Write file
      if (!fs.existsSync(archDir)) {
        fs.mkdirSync(archDir, { recursive: true });
      }
      fs.writeFileSync(archFile, result, 'utf-8');

      // Refresh the BAR detail view
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to apply archetype: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onSamplePlatform() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Creating sample platform...' });

    try {
      const result = this.meshService.scaffoldSamplePlatform(meshPath);
      this.postMessage({
        type: 'samplePlatformCreated',
        platformCount: result.platformCount,
        barCount: result.barCount,
      });
      await this.loadPortfolio();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to create sample platform: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onUpdateBarField(barPath: string, field: string, value: string) {
    const allowedFields = ['strategy', 'criticality', 'lifecycle'];
    if (!allowedFields.includes(field)) {
      this.postMessage({ type: 'error', message: `Cannot update field: ${field}` });
      return;
    }

    try {
      this.barService.updateField(barPath, field, value);
      // Reload the BAR detail to reflect the change
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to update ${field}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onUpdateAppYaml(barPath: string, fields: Record<string, string>) {
    try {
      this.barService.updateMultipleFields(barPath, fields);
      this.postMessage({ type: 'appYamlUpdated' });
      // Reload the BAR detail to reflect the changes
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to update app.yaml: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onListAdrs(barPath: string) {
    try {
      const adrs = this.barService.listAdrs(barPath);
      this.postMessage({ type: 'adrList', adrs });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to list ADRs: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onCreateAdr(barPath: string, adr: import('../types').AdrRecord) {
    try {
      const created = this.barService.createAdr(barPath, adr);
      this.barService.autoUpdateSuperseded(barPath, created);
      this.postMessage({ type: 'adrSaved', adr: created });
      // Refresh the BAR to update architecture pillar score and ADR list
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to create ADR: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onUpdateAdr(barPath: string, adr: import('../types').AdrRecord) {
    try {
      const updated = this.barService.updateAdr(barPath, adr);
      this.barService.autoUpdateSuperseded(barPath, updated);
      this.postMessage({ type: 'adrSaved', adr: updated });
      // Refresh the BAR to update architecture pillar score and ADR list
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to update ADR: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onDeleteAdr(barPath: string, adrId: string) {
    try {
      this.barService.deleteAdr(barPath, adrId);
      this.postMessage({ type: 'adrDeleted', adrId });
      // Refresh the BAR to update architecture pillar score
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to delete ADR: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onGenerateThreatModel(barPath: string) {
    const service = new ThreatModelService((step, progress) => {
      this.postMessage({ type: 'threatModelProgress', step, progress });
    });

    try {
      const result = await service.generateThreatModel(barPath);
      // Reload BAR FIRST to update security pillar score (threat-model.yaml now populated)
      // barDetail arrives while threatModelGenerating=true, so it won't wipe the model
      await this.onDrillIntoBar(barPath);
      // THEN send the threat model result so it arrives after barDetail
      this.postMessage({ type: 'threatModelGenerated', result });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Threat model generation failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onExportThreatModelCsv(barPath: string, threats: import('../types').ThreatEntry[]) {
    try {
      if (!threats || threats.length === 0) {
        this.postMessage({ type: 'error', message: 'No threat model data. Generate a threat model first.' });
        return;
      }

      const result = { threats, summary: { totalThreats: threats.length, byCategory: {}, byRisk: {}, unmitigatedCount: 0 }, mermaidDiagram: '' };
      const csvContent = exportThreatModelCsv(result);

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(barPath, 'security', 'threat-model.csv')),
        filters: { 'CSV Files': ['csv'], 'All Files': ['*'] },
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(csvContent, 'utf-8'));
        this.postMessage({ type: 'threatModelExported', filePath: uri.fsPath });
        vscode.window.showInformationMessage(`Threat model exported to ${uri.fsPath}`);
      }
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onDetectGitHubDefaults() {
    try {
      const { login, orgs } = await this.githubService.getAuthenticatedUser();
      // Use Documents folder to avoid OneDrive-managed home directory issues
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const documentsDir = path.join(homeDir, 'Documents');
      const defaultPath = fs.existsSync(documentsDir)
        ? path.join(documentsDir, 'governance-mesh')
        : path.join(homeDir, 'governance-mesh');
      this.postMessage({ type: 'githubDefaults', login, orgs, defaultPath });
    } catch {
      // Non-fatal — just won't pre-fill
      this.postMessage({ type: 'githubDefaults', login: '', orgs: [], defaultPath: '' });
    }
  }

  private async onScanOrg(org: string, modelFamily?: string) {
    const scanner = new OrgScannerService(
      this.githubService,
      (step, progress) => {
        this.postMessage({ type: 'orgScanProgress', step, progress });
      }
    );

    try {
      const recommendation = await scanner.scanOrg(org, modelFamily);
      this.postMessage({ type: 'orgScanResults', recommendation });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Org scan failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onListModels() {
    try {
      const preferred = vscode.workspace.getConfiguration('maintainabilityai.llm').get<string>('preferredFamily', 'gpt-4o');
      const allModels = await vscode.lm.selectChatModels();
      const models = allModels.map(m => ({
        id: m.id,
        family: m.family,
        name: m.name,
        vendor: m.vendor,
      }));
      this.postMessage({ type: 'availableModels', models, defaultFamily: preferred });
    } catch {
      // VS Code LM API not available
    }
  }

  private async onLoadOrgRepos(org: string) {
    try {
      const repos = await this.githubService.listOrgRepos(org);
      this.postMessage({ type: 'orgReposLoaded', repos });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to load repos: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onScanOrgWithRepos(org: string, repoNames: string[], modelFamily?: string) {
    // Build existing context if mesh exists
    const meshPath = MeshService.getMeshPath();
    let existingContext: import('../types').ExistingStructureContext | undefined;
    if (meshPath) {
      const summary = this.meshService.buildPortfolioSummary(meshPath);
      if (summary && summary.platforms.length > 0) {
        existingContext = {
          platforms: summary.platforms.map(p => ({
            name: p.name,
            id: p.id,
            bars: p.bars.map(b => ({
              name: b.name,
              id: b.id,
              path: b.path,
              repos: b.repos,
            })),
          })),
        };
      }
    }

    const scanner = new OrgScannerService(
      this.githubService,
      (step, progress) => {
        this.postMessage({ type: 'orgScanProgress', step, progress });
      }
    );

    try {
      const recommendation = await scanner.scanOrgWithRepos(org, repoNames, existingContext, modelFamily);
      this.postMessage({ type: 'orgScanResults', recommendation });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Org scan failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onAddReposToBar(barPath: string, repoUrls: string[]) {
    try {
      const count = this.barService.addRepos(barPath, repoUrls);
      this.postMessage({ type: 'reposAddedToBar', barPath, count });
      // Refresh the BAR detail to show the new repos
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to add repos: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onApplyOrgScan(
    platforms: RecommendedPlatform[],
    template: 'minimal' | 'standard' | 'full',
    updates?: import('../types').ExistingBarUpdate[]
  ) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured. Initialize a mesh first.' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Scaffolding platforms and BARs...' });

    try {
      const result = this.meshService.bulkScaffold(meshPath, platforms, template);

      // Apply updates to existing BARs
      if (updates && updates.length > 0) {
        for (const update of updates) {
          try {
            this.barService.addRepos(update.barPath, update.addRepos);
          } catch {
            // Non-fatal: continue with other updates
          }
        }
      }

      this.postMessage({
        type: 'orgScanApplied',
        platformCount: result.platformCount,
        barCount: result.barCount,
      });
      await this.loadPortfolio();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to apply org scan: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  // ==========================================================================
  // Git Sync
  // ==========================================================================

  private async sendGitStatus(meshPath: string, allBars: BarSummary[]) {
    try {
      const status = await this.gitSyncService.getStatus(meshPath, allBars);
      this.postMessage({ type: 'gitStatusUpdated', status });
    } catch {
      // Git status is best-effort — don't block on failures
    }
  }

  private async onSyncBar(barPath: string) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'syncError', barPath, message: 'No mesh configured.' });
      return;
    }

    try {
      // Determine the BAR ID for the commit message
      const summary = this.meshService.buildPortfolioSummary(meshPath);
      const bar = summary?.allBars.find(b => b.path === barPath);
      const barId = bar?.id || path.basename(barPath);

      const result = await this.gitSyncService.syncBar(
        meshPath,
        barPath,
        barId,
        (step) => this.postMessage({ type: 'syncProgress', barPath, step }),
      );

      this.postMessage({ type: 'syncComplete', barPath, message: result.message });

      // Refresh git status after sync
      if (summary) {
        await this.sendGitStatus(meshPath, summary.allBars);
      }
    } catch (err) {
      this.postMessage({
        type: 'syncError',
        barPath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async onPushMesh() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'pushError', message: 'No mesh configured.' });
      return;
    }

    const gitRoot = this.gitSyncService.findGitRoot(meshPath);
    if (!gitRoot) {
      this.postMessage({ type: 'pushError', message: 'Not a git repository.' });
      return;
    }

    try {
      const pushArgs = ['push', '-u', 'origin', 'main'];
      await execFileAsync('git', pushArgs, { cwd: gitRoot, timeout: 60_000 });
      this.postMessage({ type: 'pushComplete', message: 'Pushed to remote successfully.' });

      // Refresh git status after push
      const summary = this.meshService.buildPortfolioSummary(meshPath);
      if (summary) {
        await this.sendGitStatus(meshPath, summary.allBars);
      }
    } catch (err) {
      this.postMessage({
        type: 'pushError',
        message: err instanceof Error ? err.message : String(err),
      });
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

    try {
      const result = await this.gitSyncService.pullFromRemote(gitRoot);
      if (result.success) {
        this.postMessage({ type: 'pullComplete', message: result.message });

        // Refresh portfolio data + git status after pull (files may have changed)
        const summary = this.meshService.buildPortfolioSummary(meshPath);
        if (summary) {
          this.postMessage({ type: 'portfolioData', data: summary });
          await this.sendGitStatus(meshPath, summary.allBars);
        }

        // If we're drilled into a BAR, refresh its detail too
        if (this.lastDrilledBarPath) {
          await this.onDrillIntoBar(this.lastDrilledBarPath);
        }
      } else {
        this.postMessage({ type: 'pullError', message: result.message });
      }
    } catch (err) {
      this.postMessage({
        type: 'pullError',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async onSwitchCapabilityModel(modelType: CapabilityModelType) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured.' });
      return;
    }
    this.postMessage({ type: 'loading', active: true, message: 'Switching capability model...' });
    try {
      this.capabilityModelService.switchModel(meshPath, modelType);
      this.updateMeshYamlField(meshPath, 'capability_model', modelType);
      this.postMessage({ type: 'capabilityModelSwitched', modelType });
      await this.loadPortfolio();
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to switch model: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onUploadCustomModel(jsonContent: string) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured.' });
      return;
    }
    try {
      this.capabilityModelService.uploadCustomModel(meshPath, jsonContent);
      this.updateMeshYamlField(meshPath, 'capability_model', 'custom');
      await this.loadPortfolio();
    } catch (err) {
      this.postMessage({ type: 'error', message: `Invalid model JSON: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  private async onOpenRepoInContext(repoUrl: string, _barPath: string) {
    // Extract repo name from URL (e.g., https://github.com/org/repo-name → repo-name)
    let repoName = repoUrl;
    try {
      repoName = repoUrl.replace(/\.git$/, '').split('/').pop() || repoUrl;
    } catch { /* use full url */ }

    // Check if repo exists locally
    let localPath: string | null = null;

    // 1. Check workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    for (const folder of workspaceFolders) {
      if (folder.uri.fsPath.endsWith(repoName)) {
        localPath = folder.uri.fsPath;
        break;
      }
      // Check as subfolder of workspace
      const subPath = path.join(folder.uri.fsPath, repoName);
      if (fs.existsSync(subPath)) {
        localPath = subPath;
        break;
      }
    }

    // 2. Check sibling directories of mesh root
    if (!localPath) {
      const meshPath = MeshService.getMeshPath();
      if (meshPath) {
        const parentDir = path.dirname(meshPath);
        const siblingPath = path.join(parentDir, repoName);
        if (fs.existsSync(siblingPath)) {
          localPath = siblingPath;
        }
      }
    }

    // 3. Check if the URL is already a local path
    if (!localPath && fs.existsSync(repoUrl)) {
      localPath = repoUrl;
    }

    if (localPath) {
      // Open the repo folder in a new window, then open Scorecard
      const uri = vscode.Uri.file(localPath);
      await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
      // Note: Scorecard will auto-detect the repo when the new window activates
    } else {
      // Repo not found locally — open Scaffold Panel (Cheshire Cat)
      const action = await vscode.window.showInformationMessage(
        `Repository "${repoName}" not found locally. Open Scaffold Panel to set up SDLC structure?`,
        'Open Scaffold',
        'Cancel',
      );
      if (action === 'Open Scaffold') {
        vscode.commands.executeCommand('maintainabilityai.scaffoldRepo');
      }
    }
  }

  // ==========================================================================
  // Policy Management
  // ==========================================================================

  private async onLoadPolicies() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured.' });
      return;
    }

    try {
      const policies = this.meshService.readPolicies(meshPath);
      const nistControls = this.meshService.readNistControls(meshPath);
      this.postMessage({ type: 'policiesLoaded', policies, nistControls });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to load policies: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onSavePolicy(filename: string, content: string) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured.' });
      return;
    }

    try {
      this.meshService.savePolicyFile(meshPath, filename, content);
      this.postMessage({ type: 'policySaved', filename });
      // Reload policies to reflect changes
      const policies = this.meshService.readPolicies(meshPath);
      const nistControls = this.meshService.readNistControls(meshPath);
      this.postMessage({ type: 'policiesLoaded', policies, nistControls });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to save policy: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onCreateNistCatalog() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured.' });
      return;
    }

    try {
      const { generateNistControls } = await import('../templates/meshTemplates');
      this.meshService.savePolicyFile(meshPath, 'nist-800-53-controls.yaml', generateNistControls());
      // Reload policies
      const policies = this.meshService.readPolicies(meshPath);
      const nistControls = this.meshService.readNistControls(meshPath);
      this.postMessage({ type: 'policiesLoaded', policies, nistControls });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to create NIST catalog: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  private async onGeneratePolicyBaseline(filename: string) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured.' });
      return;
    }

    try {
      // For NIST catalog, reset from template (no LLM needed)
      if (filename === 'nist-800-53-controls.yaml') {
        const { generateNistControls } = await import('../templates/meshTemplates');
        this.meshService.savePolicyFile(meshPath, filename, generateNistControls());
        const policies = this.meshService.readPolicies(meshPath);
        const nistControls = this.meshService.readNistControls(meshPath);
        this.postMessage({ type: 'policiesLoaded', policies, nistControls });
        this.postMessage({ type: 'policyBaselineGenerated', filename });
        return;
      }

      // 1. Read portfolio context
      this.postMessage({ type: 'policyBaselineProgress', filename, step: 'Reading mesh context...', progress: 10 });
      const portfolio = this.meshService.readPortfolioConfig(meshPath);
      const orgName = portfolio?.org || portfolio?.name || 'Organization';

      // Read existing policy content for reference
      const policyPath = path.join(meshPath, 'policies', filename);
      const existingContent = fs.existsSync(policyPath) ? fs.readFileSync(policyPath, 'utf-8') : '';

      // Read NIST controls if available
      const nistPath = path.join(meshPath, 'policies', 'nist-800-53-controls.yaml');
      const nistContent = fs.existsSync(nistPath) ? fs.readFileSync(nistPath, 'utf-8') : '';

      // Determine policy type from filename
      const policyType = filename.replace('.yaml', '').replace(/-/g, ' ');

      // 2. Select LLM
      this.postMessage({ type: 'policyBaselineProgress', filename, step: 'Connecting to AI model...', progress: 20 });
      const preferred = vscode.workspace.getConfiguration('maintainabilityai.llm').get<string>('preferredFamily', 'gpt-4o');
    const families = [preferred, 'gpt-4o', 'gpt-4', 'codex', 'claude-sonnet'].filter((v, i, a) => a.indexOf(v) === i);
      let model: vscode.LanguageModelChat | null = null;
      for (const family of families) {
        const models = await vscode.lm.selectChatModels({ family });
        if (models.length > 0) { model = models[0]; break; }
      }
      if (!model) {
        const allModels = await vscode.lm.selectChatModels();
        if (allModels.length > 0) { model = allModels[0]; }
      }
      if (!model) {
        throw new Error('No VS Code Language Model available. Ensure GitHub Copilot is installed and signed in.');
      }

      // 3. Build prompt
      this.postMessage({ type: 'policyBaselineProgress', filename, step: `Generating ${policyType} baseline...`, progress: 30 });

      const systemPrompt = `You are an enterprise governance architect generating a comprehensive baseline policy document for an organization's governance mesh.

Output ONLY valid YAML — no markdown fences, no explanatory text, no preamble. The YAML should be detailed, actionable, and production-ready.

Guidelines:
- Include specific, measurable requirements (not vague platitudes)
- Reference industry standards where appropriate (NIST, ISO 27001, OWASP, CIS)
- Include compliance requirements, validation criteria, and review cadences
- Structure with clear hierarchical YAML sections
- Add inline comments (# ...) explaining rationale for important requirements
- Tailor to the organization name and context provided`;

      let userPrompt = `Generate a comprehensive ${policyType} baseline policy for "${orgName}".

Policy file: ${filename}
`;
      if (existingContent) {
        userPrompt += `\nThe current policy template is minimal and needs enrichment:\n\`\`\`yaml\n${existingContent}\n\`\`\`\n\nExpand this into a comprehensive, production-grade baseline. Keep the existing structure but add significantly more detail, requirements, and validation criteria.\n`;
      }
      if (nistContent) {
        userPrompt += `\nThe organization uses NIST SP 800-53 controls. Reference relevant control IDs (e.g., AC-2, SC-7) where applicable. Available controls:\n${nistContent.substring(0, 3000)}\n`;
      }

      // 4. Call LLM
      const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
        vscode.LanguageModelChatMessage.User(userPrompt),
      ];

      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

      let text = '';
      let chunkCount = 0;
      for await (const chunk of response.text) {
        text += chunk;
        chunkCount++;
        if (chunkCount % 5 === 0) {
          const progress = Math.min(30 + Math.round((text.length / 4000) * 50), 85);
          this.postMessage({ type: 'policyBaselineProgress', filename, step: `Generating... (${text.length.toLocaleString()} chars)`, progress });
        }
      }

      // 5. Clean response
      const cleaned = text
        .replace(/^```(?:yaml)?\s*\n?/m, '')
        .replace(/\n?```\s*$/m, '')
        .trim();

      // 6. Save
      this.postMessage({ type: 'policyBaselineProgress', filename, step: 'Saving policy baseline...', progress: 90 });
      this.meshService.savePolicyFile(meshPath, filename, cleaned);

      // 7. Reload policies
      this.postMessage({ type: 'policyBaselineProgress', filename, step: 'Complete', progress: 100 });
      const policies = this.meshService.readPolicies(meshPath);
      const nistControls = this.meshService.readNistControls(meshPath);
      this.postMessage({ type: 'policyBaselineGenerated', filename });
      this.postMessage({ type: 'policiesLoaded', policies, nistControls });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to generate baseline: ${err instanceof Error ? err.message : String(err)}`,
      });
      this.postMessage({ type: 'policyBaselineGenerated', filename });
    }
  }

  private onLookupNistControl(controlId: string) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'nistControlDetail', control: null });
      return;
    }

    const controls = this.meshService.readNistControls(meshPath);
    const control = controls.find(c => c.id === controlId) || null;
    this.postMessage({ type: 'nistControlDetail', control });
  }

  private updateMeshYamlField(meshPath: string, field: string, value: string): void {
    const meshYaml = path.join(meshPath, 'mesh.yaml');
    if (!fs.existsSync(meshYaml)) { return; }
    let content = fs.readFileSync(meshYaml, 'utf8');
    const regex = new RegExp(`${field}:\\s*\\S+`);
    if (regex.test(content)) {
      content = content.replace(regex, `${field}: ${value}`);
    } else {
      content = content.replace(/(architecture_dsl:\s*\S+)/, `$1\n  ${field}: ${value}`);
    }
    fs.writeFileSync(meshYaml, content, 'utf8');
  }

  // ============================================================================
  // Settings Handlers
  // ============================================================================

  private onLoadDriftWeights() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'driftWeightsLoaded', weights: MeshService.DEFAULT_DRIFT_WEIGHTS });
      return;
    }
    const weights = this.meshService.readDriftWeights(meshPath);
    this.postMessage({ type: 'driftWeightsLoaded', weights });
  }

  private onSaveDriftWeights(weights: DriftWeights) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    this.meshService.saveDriftWeights(meshPath, weights);
    this.postMessage({ type: 'driftWeightsSaved' });
    this.postMessage({ type: 'info', message: 'Drift weights saved to mesh.yaml. Sync your mesh to push changes.' });
  }

  private async detectMeshRepo(meshPath: string): Promise<void> {
    try {
      const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: meshPath });
      const url = stdout.trim();
      const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
      if (match) {
        this.meshRepoInfo = { owner: match[1], repo: match[2] };
      }
    } catch { /* no git remote — mesh is local only */ }
  }

  private async onCheckWorkflowStatus() {
    if (!this.meshRepoInfo) {
      this.postMessage({ type: 'workflowStatus', exists: false });
      return;
    }
    try {
      const exists = await this.githubService.checkWorkflowExists(
        this.meshRepoInfo.owner,
        this.meshRepoInfo.repo,
        '.github/workflows/oraculum-review.yml'
      );
      this.postMessage({ type: 'workflowStatus', exists });
    } catch {
      this.postMessage({ type: 'workflowStatus', exists: false });
    }
  }

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
        const pullResult = await this.gitSyncService.pullFromRemote(gitRoot);
        if (!pullResult.success) {
          this.postMessage({ type: 'error', message: `Cannot provision: ${pullResult.message}` });
          return;
        }
      }

      // Ensure GitHub Actions can create PRs
      if (this.meshRepoInfo) {
        try {
          await execFileAsync('gh', [
            'api', `repos/${this.meshRepoInfo.owner}/${this.meshRepoInfo.repo}/actions/permissions/workflow`,
            '-X', 'PUT',
            '-f', 'default_workflow_permissions=write',
            '-F', 'can_approve_pull_request_reviews=true',
          ], { cwd: meshPath, timeout: 30_000 });
        } catch { /* non-fatal */ }
      }

      this.meshService.writeOraculumWorkflow(meshPath, this.context.extensionPath);

      await execFileAsync('git', ['add', '-A'], { cwd: meshPath });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: meshPath });
      if (diffCheck.trim()) {
        await execFileAsync('git', ['commit', '-m', 'chore: update oraculum review workflow\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: meshPath });
        await execFileAsync('git', ['push'], { cwd: meshPath, timeout: 60_000 });
      }

      this.postMessage({ type: 'workflowProvisioned' });
      this.postMessage({ type: 'workflowStatus', exists: true });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to provision workflow: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onSavePreferredModel(family: string) {
    try {
      const config = vscode.workspace.getConfiguration('maintainabilityai');
      await config.update('llm.preferredFamily', family, vscode.ConfigurationTarget.Global);
      this.postMessage({ type: 'preferredModelSaved', family });
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to save model preference: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  private async onLoadIssueTemplate() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'issueTemplateLoaded', content: '', exists: false });
      return;
    }
    const templatePath = path.join(meshPath, '.github', 'ISSUE_TEMPLATE', 'oraculum-review.yml');
    const exists = fs.existsSync(templatePath);
    const content = exists ? fs.readFileSync(templatePath, 'utf8') : this.getDefaultIssueTemplate();
    this.postMessage({ type: 'issueTemplateLoaded', content, exists });
  }

  private async onSaveIssueTemplate(content: string) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const templateDir = path.join(meshPath, '.github', 'ISSUE_TEMPLATE');
    fs.mkdirSync(templateDir, { recursive: true });
    fs.writeFileSync(path.join(templateDir, 'oraculum-review.yml'), content, 'utf8');
    this.postMessage({ type: 'issueTemplateSaved' });
    this.postMessage({ type: 'info', message: 'Issue template saved. Sync your mesh to push changes.' });
  }

  private getDefaultIssueTemplate(): string {
    return `name: Oraculum Architecture Review
description: Request an AI-powered architecture review for a BAR
title: "Architecture Review: [APP_NAME]"
labels: ["oraculum-review"]
body:
  - type: textarea
    id: config
    attributes:
      label: Review Configuration
      description: Oraculum YAML configuration block
      render: yaml
      value: |
        bar_path: platforms/<platform>/<bar>
        prompt_packs:
          - default
        scope:
          - architecture
          - security
          - risk
          - operations
        repos:
          - https://github.com/org/repo
    validations:
      required: true
  - type: textarea
    id: context
    attributes:
      label: Additional Context
      description: Any additional context for the review
`;
  }

  private async onReinitializeMesh() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Reinitializing mesh...' });

    try {
      // Preserve portfolio identity
      const portfolio = this.meshService.readPortfolioConfig(meshPath);
      if (!portfolio) {
        this.postMessage({ type: 'error', message: 'Could not read mesh.yaml — cannot reinitialize' });
        return;
      }

      // Delete content directories
      const dirsToDelete = ['platforms', 'policies', 'governance', 'reports', 'decorators'];
      for (const dir of dirsToDelete) {
        const fullPath = path.join(meshPath, dir);
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      }

      // Re-scaffold from scratch
      const dsl = portfolio.architectureDsl || 'calm';
      const capModel = portfolio.capabilityModel || 'insurance';
      this.meshService.initializeMesh(meshPath, portfolio.name, portfolio.org, portfolio.owner, dsl, capModel);

      // Git add + commit + push
      await execFileAsync('git', ['add', '-A'], { cwd: meshPath });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: meshPath });
      if (diffCheck.trim()) {
        await execFileAsync('git', ['commit', '-m', 'chore: reinitialize governance mesh\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: meshPath });
        await execFileAsync('git', ['push'], { cwd: meshPath, timeout: 60_000 });
      }

      this.postMessage({ type: 'meshReinitialized' });
      await this.loadPortfolio();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Reinitialize failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'lookingGlass.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data: blob:;">
  <title>Looking Glass</title>
</head>
<body>
  <div id="looking-glass-root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private dispose() {
    LookingGlassPanel.currentPanel = undefined;
    this.stopActiveReviewPolling();
    this.calmFileWatcher.stop();
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
