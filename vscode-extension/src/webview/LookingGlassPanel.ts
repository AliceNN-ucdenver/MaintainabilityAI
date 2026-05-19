import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import type {
  AbsolemCommand,
  ArchitectureDsl,
  CapabilityModelType,
  BarSummary,
  LookingGlassWebviewMessage,
  LookingGlassExtensionMessage,
  ComponentScaffoldContext,
  Criticality,
  PromptPackSelection,
  RecommendedPlatform,
  DriftWeights,
  WhiteRabbitBreadcrumb,
  ResearchSecretId,
  ResearchPrefs,
  ResearchSecretStatus,
} from '../types';
import { SECRETS, RESEARCH_SECRET_IDS, detectGovernanceRepo } from '../services/SecretsService';
import { testResearchKey } from '../services/ResearchKeyTester';
import { MeshService } from '../services/MeshService';
import { BarService } from '../services/BarService';
import { GovernanceScorer } from '../services/GovernanceScorer';
import { GitHubService, githubService } from '../services/GitHubService';
import { AgentStatusService } from '../services/AgentStatusService';
import { OrgScannerService } from '../services/OrgScannerService';
import { ThreatModelService, exportThreatModelCsv } from '../services/ThreatModelService';
import { GitSyncService, gitSyncService } from '../services/GitSyncService';
import { CapabilityModelService } from '../services/CapabilityModelService';
import { generateMermaidDiagrams } from '../services/CalmTransformer';
import { readCalmArchitectureData, readLayoutFile, writeLayoutFile } from '../services/LayoutPersistenceService';
import { applyPatch as applyCalmPatch, type CalmPatch } from '../services/CalmWriteService';
import { CalmFileWatcher } from '../services/CalmFileWatcher';
import { validate as validateCalm } from '../services/CalmValidator';
import { AbsolemService } from '../services/AbsolemService';
import { AgentDeploymentService } from '../services/AgentDeploymentService';
import { HatterTagService } from '../services/HatterTagService';
import { MESH_LABELS } from '../templates/meshLabels';
import { generateArchetype, type ArchetypeId } from '../templates/mesh/archetypeTemplates';
import type { OkrCard, OkrCreateInput, OkrUpdatePatch } from '../types/okr';
import { OkrCreateInputSchema, OkrUpdatePatchSchema } from '../types/okr';
import type { OkrAvailableBar, OkrAvailablePlatform, OkrDetailMode } from '../types';
import { promptPackService } from '../services/PromptPackService';
import { ScaffoldPanel } from './ScaffoldPanel';
import { execFileAsync } from '../utils/exec';
import { getRemoteOriginUrl, parseGitHubUrl, parseGitHubPullUrl } from '../utils/git';
import { getNonce } from '../utils/getNonce';
import { BasePanel } from './BasePanel';
import { logger } from '../utils/Logger';
import { toErrorMessage } from '../utils/errors';
import { MeshReader } from '../core/mesh-reader';
import { RedQueenService } from '../services/RedQueenService';
import { computeTier, scaffoldAgentConfig, writeScaffoldFiles } from '../mcp/config-scaffold';
import { computeDecayedScore } from '../mcp/utils/score-decay';
import type { GovernanceTimestamps } from '../types/redqueen';

export class LookingGlassPanel extends BasePanel<LookingGlassWebviewMessage, LookingGlassExtensionMessage> {
  public static currentPanel: LookingGlassPanel | undefined;
  private static readonly viewType = 'maintainabilityai.lookingGlass';

  private readonly meshService: MeshService;
  private readonly barService: BarService;
  private readonly githubService: GitHubService;
  private readonly agentStatusService: AgentStatusService;
  private readonly gitSyncService: GitSyncService;
  private readonly capabilityModelService: CapabilityModelService;
  private readonly calmFileWatcher: CalmFileWatcher;
  private readonly absolemService: AbsolemService;
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
    super(panel, context);
    this.meshService = new MeshService();
    this.barService = new BarService();
    this.githubService = githubService;
    this.agentStatusService = new AgentStatusService(this.githubService);
    this.gitSyncService = gitSyncService;
    this.capabilityModelService = new CapabilityModelService();
    this.calmFileWatcher = new CalmFileWatcher();
    this.absolemService = new AbsolemService();

    // Start watching *.arch.json for external changes
    this.calmFileWatcher.start((filePath) => {
      this.onExternalCalmFileChanged(filePath);
    });
  }

  protected async handleMessage(message: LookingGlassWebviewMessage) {
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

      case 'commitMesh':
        await this.onCommitMesh();
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

      case 'openScorecard':
        vscode.commands.executeCommand('maintainabilityai.openScorecard', message.folderPath);
        break;

      case 'scaffoldComponent':
        await this.onScaffoldComponent(message.repoUrl, message.barPath);
        break;

      case 'deployGovernanceToRepo':
        await this.onDeployGovernanceToRepo(message.barPath, message.localPath);
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

      case 'loadPlatformArchitecture':
        this.onLoadPlatformArchitecture(message.platformId);
        break;

      case 'platformCalmMutation':
        this.onPlatformCalmMutation(message.platformId, message.patch as CalmPatch[]);
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

      case 'provisionAgentic':
        await this.onProvisionAgentic();
        break;

      case 'checkAgenticStatus':
        this.onCheckAgenticStatus();
        break;

      case 'savePreferredModel':
        await this.onSavePreferredModel(message.family);
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

      case 'configureMeshSecrets':
        vscode.commands.executeCommand('maintainabilityai.configureSecrets', 'governance');
        break;

      case 'refreshPromptPacks':
        await this.onRefreshPromptPacks();
        break;

      // Research Settings (Tavily + research-pipeline prefs)
      case 'loadResearchSettings':
        await this.onLoadResearchSettings();
        break;

      case 'saveResearchSecret':
        await this.onSaveResearchSecret(message.id, message.value);
        break;

      case 'promptResearchSecret':
        await this.onPromptResearchSecret(message.id);
        break;

      case 'createResearchSecret':
        await this.onCreateResearchSecret(message.id);
        break;

      case 'testResearchSecret':
        await this.onTestResearchSecret(message.id);
        break;

      case 'pushResearchSecret':
        await this.onPushResearchSecret(message.id);
        break;

      case 'pushResearchSecretToAll':
        await this.onPushResearchSecretToAll(message.id);
        break;

      case 'saveResearchPrefs':
        await this.onSaveResearchPrefs(message.prefs);
        break;

      // Red Queen — orchestration + platform governance editors
      case 'loadOrchestrationPolicy':
        this.onLoadOrchestrationPolicy();
        break;

      case 'saveOrchestrationPolicy':
        this.onSaveOrchestrationPolicy(message.policy);
        break;

      case 'loadAgentType':
        this.onLoadAgentType();
        break;

      case 'saveAgentType':
        this.onSaveAgentType(message.agentType);
        break;

      case 'loadPlatformGovernance':
        this.onLoadPlatformGovernance(message.platformId);
        break;

      case 'savePlatformGovernance':
        this.onSavePlatformGovernance(message.platformId, message.governance);
        break;

      // Absolem — multi-turn CALM refinement agent
      case 'absolemStart':
        this.onAbsolemStart(message.barPath, message.command).catch(() => {});
        break;

      case 'absolemSend':
        this.onAbsolemSend(message.barPath, message.message).catch(() => {});
        break;

      case 'absolemAcceptPatches':
        this.onAbsolemAcceptPatches(message.barPath, message.patches as CalmPatch[]);
        break;

      case 'absolemRejectPatches':
        this.onAbsolemRejectPatches(message.barPath);
        break;

      case 'absolemClose':
        this.onAbsolemClose(message.barPath);
        break;

      case 'absolemImageStart':
        this.onAbsolemImageStart(message.barPath, message.imageBase64, message.mimeType).catch(() => {});
        break;

      case 'absolemPreviewJson':
        this.onAbsolemPreviewJson(message.json);
        break;

      case 'getCalmComponents':
        await this.onGetCalmComponents(message.barPath);
        break;

      case 'implementComponent':
        await this.onImplementComponent(message.barPath, message.componentId, message.repoName, message.componentName, message.componentType, message.componentDescription);
        break;

      case 'saveWorkspace':
        this.saveWorkspaceFile(message.name);
        break;

      case 'openUrl':
        vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;

      case 'newResearchFromPlatform':
        // Open the research-request wizard pre-filled with platform scope.
        // Archeologist dispatches on the `research-request` issue label.
        vscode.commands.executeCommand('maintainabilityai.createResearchRequest', {
          scopeLevel: 'platform',
          scopeId: message.slug,
          brief: `Research for platform ${message.name} (${message.slug}).`,
        });
        break;

      case 'newResearchFromBar':
        vscode.commands.executeCommand('maintainabilityai.createResearchRequest', {
          scopeLevel: 'bar',
          scopeId: message.barId,
          brief: `Research for BAR ${message.barName} (${message.barId}).`,
        });
        break;

      // OKR list + detail (Phase A — read-only; Start buttons disabled until Phase B)
      case 'getOkrList':
        await this.onGetOkrList();
        break;
      case 'drillIntoOkr':
        await this.onDrillIntoOkr(message.okrId);
        break;
      case 'scaffoldOkrSample':
        await this.onScaffoldOkrSample();
        break;
      case 'createOkrDraft':
        await this.onCreateOkrDraft();
        break;
      case 'editOkr':
        await this.onEditOkr(message.okrId);
        break;
      case 'saveOkrEdits':
        await this.onSaveOkrEdits(message.okrId, message.patch);
        break;
      case 'createOkrFromDraft':
        await this.onCreateOkrFromDraft(message.draft);
        break;
      case 'startOkrWhy':
        await this.onStartOkrPhase(message.okrId, 'why');
        break;
      case 'startOkrHow':
        await this.onStartOkrPhase(message.okrId, 'how');
        break;
      case 'startOkrWhat':
        await this.onStartOkrPhase(message.okrId, 'what');
        break;
      case 'confirmStartOkrPhase':
        await this.onConfirmStartOkrPhase(message.okrId, message.phase, message.additionalContext ?? '');
        break;
      case 'loadHatterTag':
        await this.onLoadHatterTag(message.okrId, message.actionId);
        break;
      case 'okrHumanGateApprove':
        await this.onHumanGateApprove(message.okrId, message.actionId, message.tier);
        break;
      case 'okrHumanGateRerun':
        await this.onHumanGateRerun(message.okrId, message.actionId);
        break;
      case 'okrHumanGateReject':
        await this.onHumanGateReject(message.okrId, message.actionId);
        break;
      case 'cancelOkrAction':
        await this.onCancelOkrAction(message.okrId, message.actionId);
        break;

      case 'backToPortfolio':
      case 'backToPlatform':
      case 'backToOkrList':
      case 'drillIntoPlatform':
      case 'filterBars':
      case 'searchBars':
        // These are handled client-side in the webview
        break;
    }
  }

  /**
   * Phase A — read all OKRs under <meshPath>/okrs/ and post a list view
   * payload. Each row hydrates the primary-BAR tier (computed by
   * OKRService.tierFor via the BarScoreSource adapter wired in
   * MeshService's constructor).
   */
  private async onGetOkrList() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    try {
      const okrService = this.meshService.getOkrService();
      const summaries = okrService.readAll(meshPath);
      const okrs = summaries.map(s => ({
        id: s.id,
        objective: s.objective,
        ownerHandle: s.ownerHandle,
        platformId: s.platformId,
        primaryBarId: s.primaryBarId,
        primaryBarTier: s.primaryBarTier,
        status: s.status,
        paused: s.paused,
        phaseProgress: s.phaseProgress,
        lastActivityAt: s.lastActivityAt,
        chainRootShort: s.chainRootShort,
        targetCodeRepos: s.targetCodeRepos,
      }));
      this.postMessage({ type: 'okrList', okrs });
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to load OKRs: ${toErrorMessage(err)}` });
    }
  }

  /**
   * Phase A — open OKR detail. Resolves affected BARs to {id, name, path,
   * compositeScore, tier} via MeshService.findBarById so the webview can
   * render the tier badges + "Open BAR ↗" cross-links without doing its
   * own mesh walk.
   */
  private async onDrillIntoOkr(okrId: string, mode: OkrDetailMode = 'view') {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    try {
      const okrService = this.meshService.getOkrService();
      const okr = okrService.read(meshPath, okrId);
      if (!okr) {
        this.postMessage({ type: 'error', message: `OKR not found: ${okrId}` });
        return;
      }
      this.postOkrDetail(meshPath, okr, mode);
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to load OKR: ${toErrorMessage(err)}` });
    }
  }

  private async onEditOkr(okrId: string) {
    await this.onDrillIntoOkr(okrId, 'edit');
  }

  /**
   * Open the OKR detail in 'create' mode with a blank-but-valid scaffold.
   * Nothing is written to disk until the user clicks Create in the form.
   */
  private async onCreateOkrDraft() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const summary = this.meshService.buildPortfolioSummary(meshPath);
    if (!summary || summary.platforms.length === 0) {
      this.postMessage({
        type: 'error',
        message: 'Create OKR: this mesh has no platforms yet. Scaffold one from Settings → Sample Platform first.',
      });
      return;
    }
    // Pick the first platform as the default for the form's platform-select.
    // Affected BARs start empty — user picks them from the multi-select.
    const defaultPlatform = summary.platforms[0];
    const draft = buildBlankOkrScaffold(defaultPlatform.id, readGitUserName() ?? '');
    this.postOkrDetail(meshPath, draft, 'create');
  }

  /**
   * Persist a brand-new OKR from the draft form. Validates via Zod and
   * surfaces schema errors to the user as a toast so they can fix and
   * retry without losing in-progress field values.
   */
  private async onCreateOkrFromDraft(rawDraft: unknown) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const parsed = OkrCreateInputSchema.safeParse(rawDraft);
    if (!parsed.success) {
      this.postMessage({
        type: 'error',
        message: `Cannot create OKR: ${formatZodErrors(parsed.error)}`,
      });
      return;
    }
    const draft: OkrCreateInput = parsed.data;
    // Sort affected BARs ascending by composite score so the lowest-scored
    // (most-Restricted) BAR is primary — matches the Restricted-wins gate.
    draft.objectiveAlignment.affectedBarIds = this.orderBarsByTier(meshPath, draft.objectiveAlignment.affectedBarIds);
    try {
      const okrService = this.meshService.getOkrService();
      const card = okrService.create(meshPath, draft);
      if (!card) {
        this.postMessage({ type: 'error', message: 'Failed to create OKR — id may already exist.' });
        return;
      }
      this.postMessage({ type: 'okrCreated', okrId: card.meta.id });
      vscode.window.showInformationMessage(`Created ${card.meta.id}.`);
      await this.onGetOkrList();
      await this.onDrillIntoOkr(card.meta.id, 'view');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to create OKR: ${toErrorMessage(err)}` });
    }
  }

  /**
   * Apply an inline-edit patch to an existing OKR. Re-validates the
   * resulting card via OkrCardSchema before writing so a malformed patch
   * can't corrupt the file. Returns the user to view mode on success.
   */
  private async onSaveOkrEdits(okrId: string, rawPatch: unknown) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const parsed = OkrUpdatePatchSchema.safeParse(rawPatch);
    if (!parsed.success) {
      this.postMessage({
        type: 'error',
        message: `Cannot save: ${formatZodErrors(parsed.error)}`,
      });
      return;
    }
    const patch: OkrUpdatePatch = parsed.data;
    if (patch.objectiveAlignment?.affectedBarIds) {
      patch.objectiveAlignment.affectedBarIds = this.orderBarsByTier(meshPath, patch.objectiveAlignment.affectedBarIds);
    }
    try {
      const okrService = this.meshService.getOkrService();
      const card = okrService.update(meshPath, okrId, patch);
      if (!card) {
        this.postMessage({ type: 'error', message: `OKR not found: ${okrId}` });
        return;
      }
      this.postMessage({ type: 'okrSaved', okrId });
      await this.onDrillIntoOkr(okrId, 'view');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to save OKR: ${toErrorMessage(err)}` });
    }
  }

  /**
   * Phase B-PR3 — kick off a phase's agent run.
   *
   * For B-PR3 the only wired phase is `why`. Creates an issue in the mesh
   * repo with the canonical labels + okr_id marker (§5.5.4) and appends a
   * queued OkrAction to the card so the OKR list view and detail page
   * surface "Running" immediately.
   *
   * No agent assignment in this PR — the user manually @-mentions the
   * agent in the issue once it lands, OR `okr-bus.yml` (Phase C) auto-
   * assigns. Either way, the issue + the queued action are the artifacts
   * the bus / human latches onto.
   */
  private async onStartOkrPhase(okrId: string, phase: 'why' | 'how' | 'what'): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const okrService = this.meshService.getOkrService();
    const card = okrService.read(meshPath, okrId);
    if (!card) {
      this.postMessage({ type: 'error', message: `OKR not found: ${okrId}` });
      return;
    }
    if (card.meta.paused) {
      this.postMessage({ type: 'error', message: `Cannot start: OKR ${okrId} is paused.` });
      return;
    }

    // Freeze tier at run start (§6.2 — mitigates tier creep). Computed
    // here so the prerequisite gates apply before we render the preview.
    const tier = okrService.tierForCard(meshPath, card);
    if (tier === 'restricted' && phase === 'what') {
      this.postMessage({ type: 'error', message: 'Restricted tier — escalate the BAR governance score before starting What.' });
      return;
    }
    if (phase === 'how' && !card.actions.some(a => a.phase === 'why' && a.status === 'complete')) {
      this.postMessage({ type: 'error', message: 'Cannot start How: Why phase has not merged yet.' });
      return;
    }
    if (phase === 'what' && !card.actions.some(a => a.phase === 'how' && a.status === 'complete')) {
      this.postMessage({ type: 'error', message: 'Cannot start What: How phase has not merged yet.' });
      return;
    }
    if (card.actions.some(a => a.phase === phase && (a.status === 'in_progress' || a.status === 'under_review'))) {
      this.postMessage({ type: 'error', message: `${phase.toUpperCase()} phase already running for ${okrId}.` });
      return;
    }

    const agentByPhase = { why: 'market-research-agent', how: 'prd-agent', what: 'code-design-agent' } as const;
    const labelByPhase = { why: 'oraculum-research', how: 'oraculum-prd', what: 'oraculum-design' } as const;
    const agent = agentByPhase[phase];
    const issueLabel = labelByPhase[phase];

    // Render the issue body for preview. The actual runId + actionId
    // are computed in onConfirmStartOkrPhase so each modal show
    // doesn't burn a stale stamp.
    const stamp = new Date();
    const ymd = stamp.toISOString().slice(0, 10);
    const short = Math.random().toString(36).slice(2, 8);
    const previewRunId = `${phase.toUpperCase()}-${ymd}-${short}`;
    const body = renderOkrPhaseIssueBody(card, phase, agent, previewRunId);

    this.postMessage({
      type: 'startPhasePreview',
      okrId,
      phase,
      agent,
      issueLabel,
      body,
    });
  }

  /**
   * Phase B-PR3/4 — actually create the GitHub issue + queued OkrAction
   * after the user confirms in the webview Start-phase modal. Splits the
   * preview (UI) from the action (extension-side) so the modal can render
   * formatted markdown without fighting VS Code's native dialog limits.
   */
  private async onConfirmStartOkrPhase(okrId: string, phase: 'why' | 'how' | 'what', additionalContext: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const okrService = this.meshService.getOkrService();
    const card = okrService.read(meshPath, okrId);
    if (!card) {
      this.postMessage({ type: 'error', message: `OKR not found: ${okrId}` });
      return;
    }
    // Re-run gates between preview and confirm (state may have changed).
    if (card.meta.paused) {
      this.postMessage({ type: 'error', message: `Cannot start: OKR ${okrId} is paused.` });
      return;
    }
    const tier = okrService.tierForCard(meshPath, card);
    if (card.actions.some(a => a.phase === phase && (a.status === 'in_progress' || a.status === 'under_review'))) {
      this.postMessage({ type: 'error', message: `${phase.toUpperCase()} phase already running for ${okrId}.` });
      return;
    }

    const agentByPhase = { why: 'market-research-agent', how: 'prd-agent', what: 'code-design-agent' } as const;
    const labelByPhase = { why: 'oraculum-research', how: 'oraculum-prd', what: 'oraculum-design' } as const;
    const agent = agentByPhase[phase];
    const issueLabel = labelByPhase[phase];

    const stamp = new Date();
    const ymd = stamp.toISOString().slice(0, 10);
    const short = Math.random().toString(36).slice(2, 8);
    const runId = `${phase.toUpperCase()}-${ymd}-${short}`;
    const actionId = `ACT-${card.actions.length + 1}`;

    const phaseOrder: Array<'why' | 'how' | 'what'> = ['why', 'how', 'what'];
    const priorPhase = phase === 'why' ? null : phaseOrder[phaseOrder.indexOf(phase) - 1];
    const priorAction = priorPhase
      ? [...card.actions].reverse().find(a => a.phase === priorPhase && a.status === 'complete')
      : undefined;
    const parentIntentThread = priorAction?.intentThreadUuid ?? null;

    const baseBody = renderOkrPhaseIssueBody(card, phase, agent, runId);
    const trimmed = additionalContext.trim();
    const finalBody = trimmed
      ? `${baseBody}\n\n## Additional context (added by OKR owner at dispatch)\n\n${trimmed}\n`
      : baseBody;

    this.postMessage({ type: 'loading', active: true, message: `Starting ${phase.toUpperCase()} — provisioning labels + creating GitHub issue…` });

    // Resolve the mesh repo (owner/name) for the GitHubService calls.
    // detectMeshRepo populates this.meshRepoInfo on panel open; cold-
    // start paths fall through to a fresh git-remote parse.
    let meshRepo = this.meshRepoInfo;
    if (!meshRepo) {
      const url = await getRemoteOriginUrl(meshPath);
      const parsed = url ? parseGitHubUrl(url) : null;
      if (parsed) { meshRepo = { owner: parsed.owner, repo: parsed.repo }; }
    }
    if (!meshRepo) {
      this.postMessage({ type: 'error', message: 'Cannot resolve mesh repo from git remote — is the mesh on GitHub?' });
      this.postMessage({ type: 'loading', active: false });
      return;
    }

    // Provision canonical labels first so `createIssueRaw`'s ensureLabels
    // pass doesn't fall back to the generic gray color for our anchor +
    // phase labels. Idempotent — only writes when content differs.
    const labelResult = await this.provisionMeshLabels(meshPath);
    if (labelResult.failed > 0 && labelResult.created === 0 && labelResult.updated === 0 && labelResult.unchanged === 0) {
      this.postMessage({ type: 'error', message: `Cannot provision OKR labels (${labelResult.failed}/${MESH_LABELS.length} failed). Check the GitHub App / token has Issues:write. First failure: ${labelResult.failures[0] ?? 'unknown'}` });
      this.postMessage({ type: 'loading', active: false });
      return;
    }

    const title = `[OKR] ${phase.toUpperCase()}: ${card.objective.name}`;
    let issueUrl = '';
    let issueNumber = 0;
    try {
      const result = await this.githubService.createIssueRaw(
        meshRepo.owner,
        meshRepo.repo,
        title,
        finalBody,
        ['okr-anchor', issueLabel],
      );
      issueUrl = result.url;
      issueNumber = result.number;
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to create issue: ${toErrorMessage(err)}` });
      this.postMessage({ type: 'loading', active: false });
      return;
    }
    if (!issueUrl || !issueNumber) {
      this.postMessage({ type: 'error', message: 'GitHub returned an empty issue URL/number — check the GitHub App / token has Issues:write.' });
      this.postMessage({ type: 'loading', active: false });
      return;
    }

    // Dispatch via Copilot Coding Agent — same pattern as the legacy
    // oraculum flow (IssueCreatorPanel.onAssignAgent):
    //   1. Assign `copilot-swe-agent[bot]` (the standard Copilot
    //      Coding Agent bot) — assignment auto-triggers a cloud
    //      agent session.
    //   2. Post `@copilot use agent <name>` as a follow-up comment
    //      so the right `.agent.md` persona is loaded for that
    //      session (we hope — still validating the handoff syntax).
    //
    // Custom-agent direct-assignment can come back later once we've
    // confirmed the canonical handle format Copilot exposes for
    // user-defined agents.
    this.postMessage({ type: 'loading', active: true, message: 'Assigning Copilot Coding Agent…' });
    let dispatchNote = '';
    try {
      await this.githubService.assignIssue(meshRepo.owner, meshRepo.repo, issueNumber, ['copilot-swe-agent[bot]']);
      dispatchNote = 'assigned @copilot-swe-agent[bot] (Copilot Coding Agent)';
    } catch (err) {
      dispatchNote = `Copilot assignment failed (${toErrorMessage(err)}); falling back to @-mention only`;
    }
    try {
      await this.githubService.createIssueComment(
        meshRepo.owner,
        meshRepo.repo,
        issueNumber,
        `@copilot use agent ${agent}`,
      );
    } catch (err) {
      this.postMessage({ type: 'error', message: `Issue created (${issueUrl}) but failed to post @copilot handoff comment: ${toErrorMessage(err)}` });
      this.postMessage({ type: 'loading', active: false });
      return;
    }

    try {
      okrService.appendAction(meshPath, okrId, {
        id: actionId,
        phase,
        description: phase === 'why'
          ? 'Market research synthesis (Why)'
          : phase === 'how' ? 'PRD synthesis (How)' : 'Code-design synthesis (What)',
        agent,
        runId,
        intentThreadUuid: card.meta.intentThreadUuid,
        parentIntentThread,
        reviewerScores: {},
        rounds: 0,
        governanceTier: tier,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
      });
      this.postMessage({ type: 'okrPhaseStarted', okrId, phase, actionId, issueUrl });
      void vscode.window.showInformationMessage(
        `Started ${phase.toUpperCase()} for ${okrId}. Issue: ${issueUrl}. ${dispatchNote}.`,
      );
      await this.onDrillIntoOkr(okrId, 'view');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Issue created (${issueUrl}) but failed to update OKR card: ${toErrorMessage(err)}` });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  /**
   * Phase B-PR3+ — disregard an in-flight action without touching its
   * GitHub issue/PR. Used when the user already closed the issue on
   * GitHub manually (e.g. a Copilot run died with no output) and
   * wants the OKR card to stop showing "Running" so they can re-fire
   * the phase cleanly.
   *
   * Distinct from `onHumanGateReject` which closes the PR via the
   * GitHub API as well. This one is "I already cleaned up GitHub-
   * side; just sync the OKR card."
   */
  private async onCancelOkrAction(okrId: string, actionId: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const okrService = this.meshService.getOkrService();
    const card = okrService.read(meshPath, okrId);
    if (!card) {
      this.postMessage({ type: 'error', message: `OKR not found: ${okrId}` });
      return;
    }
    const action = card.actions.find(a => a.id === actionId);
    if (!action) {
      this.postMessage({ type: 'error', message: `Action ${actionId} not found` });
      return;
    }
    const answer = await vscode.window.showWarningMessage(
      `Cancel action ${actionId} on ${okrId}?`,
      {
        modal: true,
        detail:
          `Marks the OKR action as 'cancelled' so the card stops showing "Running".\n\n` +
          `Does NOT touch the GitHub issue/PR — use this when you've already closed the issue on GitHub manually. ` +
          `If you want Looking Glass to close the issue/PR for you, use HumanGate → Reject instead.\n\n` +
          `After cancelling you can re-fire ${action.phase.toUpperCase()} from the OKR detail.`,
      },
      'Cancel run',
    );
    if (answer !== 'Cancel run') { return; }
    try {
      okrService.updateAction(meshPath, okrId, actionId, {
        status: 'cancelled',
        completedAt: new Date().toISOString(),
      });
      void vscode.window.showInformationMessage(`Cancelled ${actionId}. Re-fire ${action.phase.toUpperCase()} from the OKR detail when ready.`);
      await this.onDrillIntoOkr(okrId, 'view');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Cancel failed: ${toErrorMessage(err)}` });
    }
  }

  /**
   * Phase B-PR4 — surface the Hatter's Tag YAML block from an action's
   * artifact via the slide-out sheet on OKR detail. Read the artifact
   * markdown, parse the `## Hatter's Tag` fenced block, post the result.
   * Surface a friendly reason when no tag is found (legacy or in-progress
   * actions won't have artifact data on disk yet).
   */
  private async onLoadHatterTag(okrId: string, actionId: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const okrService = this.meshService.getOkrService();
    const card = okrService.read(meshPath, okrId);
    if (!card) {
      this.postMessage({ type: 'hatterTagSheet', okrId, actionId, tag: null, reason: 'OKR not found' });
      return;
    }
    const action = card.actions.find(a => a.id === actionId);
    if (!action) {
      this.postMessage({ type: 'hatterTagSheet', okrId, actionId, tag: null, reason: `Action ${actionId} not found on this OKR` });
      return;
    }
    if (!action.artifact) {
      this.postMessage({ type: 'hatterTagSheet', okrId, actionId, tag: null, reason: 'No artifact path on this action yet — agent may still be running or pre-Phase B' });
      return;
    }
    const artifactPath = path.join(meshPath, action.artifact);
    if (!fs.existsSync(artifactPath)) {
      this.postMessage({ type: 'hatterTagSheet', okrId, actionId, tag: null, reason: `Artifact file missing: ${action.artifact}` });
      return;
    }
    try {
      const body = fs.readFileSync(artifactPath, 'utf8');
      const tag = new HatterTagService().parseHatterTag(body);
      if (!tag) {
        this.postMessage({ type: 'hatterTagSheet', okrId, actionId, tag: null, reason: 'No Hatter’s Tag block found in artifact (or YAML failed to parse)' });
        return;
      }
      this.postMessage({ type: 'hatterTagSheet', okrId, actionId, tag });
    } catch (err) {
      this.postMessage({ type: 'hatterTagSheet', okrId, actionId, tag: null, reason: `Failed to read artifact: ${toErrorMessage(err)}` });
    }
  }

  /**
   * Phase C-PR3 — HumanGate Approve. Applies the master `governance-pass`
   * label on the PR to unblock merge, and flips the action's status to
   * 'complete' (overriding reviewer findings, as documented in §6.4).
   * For Restricted tier we require dual signature via a 2-step native
   * dialog (sequential input boxes for two distinct approver handles).
   *
   * GitHub-side: the PR's `governance-pass` label trips branch
   * protection to "merge unlocked" without requiring more reviews.
   */
  private async onHumanGateApprove(okrId: string, actionId: string, tier: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const okrService = this.meshService.getOkrService();
    const card = okrService.read(meshPath, okrId);
    if (!card) {
      this.postMessage({ type: 'error', message: `OKR not found: ${okrId}` });
      return;
    }
    const action = card.actions.find(a => a.id === actionId);
    if (!action) {
      this.postMessage({ type: 'error', message: `Action ${actionId} not found` });
      return;
    }
    if (!action.pr) {
      this.postMessage({ type: 'error', message: `Action ${actionId} has no PR URL — cannot apply governance-pass label.` });
      return;
    }

    let approvers: string[] = [];
    if (tier === 'restricted') {
      const a1 = await vscode.window.showInputBox({
        title: `HumanGate Approve · ${okrId} (Restricted tier · dual signature required)`,
        prompt: 'Approver #1 — GitHub handle',
        validateInput: v => v.trim().length === 0 ? 'Approver handle is required' : null,
        ignoreFocusOut: true,
      });
      if (!a1) { return; }
      const a2 = await vscode.window.showInputBox({
        title: `HumanGate Approve · ${okrId} (Restricted tier · dual signature required)`,
        prompt: 'Approver #2 — GitHub handle (MUST be different from #1)',
        validateInput: v => {
          if (v.trim().length === 0) { return 'Approver handle is required'; }
          if (v.trim() === a1.trim()) { return 'Must be a different approver than #1'; }
          return null;
        },
        ignoreFocusOut: true,
      });
      if (!a2) { return; }
      approvers = [a1.trim(), a2.trim()];
    } else {
      const answer = await vscode.window.showWarningMessage(
        `Approve HumanGate for ${okrId}?`,
        { modal: true, detail: `This applies the governance-pass label on ${action.pr}, overriding reviewer findings. The override is recorded in the OKR audit log.` },
        'Approve',
      );
      if (answer !== 'Approve') { return; }
    }

    const pr = parseGitHubPullUrl(action.pr);
    if (!pr) {
      this.postMessage({ type: 'error', message: `Cannot parse PR URL: ${action.pr}` });
      return;
    }
    try {
      await this.githubService.addIssueLabels(pr.owner, pr.repo, pr.number, ['governance-pass']);
      await this.githubService.removeIssueLabel(pr.owner, pr.repo, pr.number, 'needs-human-review');
      const overrideNote = approvers.length === 2
        ? `**HumanGate · Approve (dual-signature override)** — approvers: @${approvers[0]}, @${approvers[1]}. Restricted-tier OKR; reviewer findings overridden. Recorded in OKR audit chain.`
        : `**HumanGate · Approve** — reviewer findings overridden. Recorded in OKR audit chain.`;
      await this.githubService.createIssueComment(pr.owner, pr.repo, pr.number, overrideNote);
      okrService.updateAction(meshPath, okrId, actionId, { status: 'complete', completedAt: new Date().toISOString() });
      void vscode.window.showInformationMessage(`Approved ${actionId} on ${okrId}. governance-pass applied to ${action.pr}.`);
      await this.onDrillIntoOkr(okrId, 'view');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Approve failed: ${toErrorMessage(err)}` });
    }
  }

  /**
   * Phase C-PR3 — HumanGate Re-run. Removes the `needs-human-review`
   * label, re-comments `@copilot use agent <author-agent>` to retry,
   * flips action status back to in_progress + increments rounds counter.
   * The Round-N label on the PR bumps via reviewer-bus.yml on the next
   * synchronize event.
   */
  private async onHumanGateRerun(okrId: string, actionId: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const okrService = this.meshService.getOkrService();
    const card = okrService.read(meshPath, okrId);
    if (!card) { return; }
    const action = card.actions.find(a => a.id === actionId);
    if (!action || !action.pr) {
      this.postMessage({ type: 'error', message: `Action ${actionId} missing or has no PR.` });
      return;
    }
    const answer = await vscode.window.showWarningMessage(
      `Re-run agent for ${okrId} action ${actionId}?`,
      { modal: true, detail: `This re-comments @copilot use agent ${action.agent} on ${action.pr} so the author agent revises. Counts as round ${(action.rounds ?? 0) + 1}.` },
      'Re-run',
    );
    if (answer !== 'Re-run') { return; }

    const pr = parseGitHubPullUrl(action.pr);
    if (!pr) {
      this.postMessage({ type: 'error', message: `Cannot parse PR URL: ${action.pr}` });
      return;
    }
    try {
      await this.githubService.removeIssueLabel(pr.owner, pr.repo, pr.number, 'needs-human-review');
      await this.githubService.createIssueComment(pr.owner, pr.repo, pr.number,
        `**HumanGate · Re-run** (round ${(action.rounds ?? 0) + 1}) — @copilot use agent ${action.agent}`,
      );
      okrService.updateAction(meshPath, okrId, actionId, { status: 'in_progress', rounds: (action.rounds ?? 0) + 1 });
      void vscode.window.showInformationMessage(`Re-running ${action.agent} on ${action.pr}.`);
      await this.onDrillIntoOkr(okrId, 'view');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Re-run failed: ${toErrorMessage(err)}` });
    }
  }

  /**
   * Phase C-PR3 — HumanGate Reject + re-scope. Closes the PR, marks the
   * action `cancelled`, and surfaces a follow-up prompt for the user to
   * edit the OKR action's description before re-firing.
   */
  private async onHumanGateReject(okrId: string, actionId: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const okrService = this.meshService.getOkrService();
    const card = okrService.read(meshPath, okrId);
    if (!card) { return; }
    const action = card.actions.find(a => a.id === actionId);
    if (!action) {
      this.postMessage({ type: 'error', message: `Action ${actionId} not found.` });
      return;
    }
    const answer = await vscode.window.showWarningMessage(
      `Reject ${actionId} on ${okrId}?`,
      { modal: true, detail: `This closes the agent's PR (if any) and marks the action 'cancelled'. The OKR stays open; you can re-trigger the phase from the OKR detail after re-scoping.` },
      'Reject + re-scope',
    );
    if (answer !== 'Reject + re-scope') { return; }

    try {
      if (action.pr) {
        const pr = parseGitHubPullUrl(action.pr);
        if (pr) {
          await this.githubService.createIssueComment(pr.owner, pr.repo, pr.number,
            `**HumanGate · Reject + re-scope** — closed by OKR owner.`);
          await this.githubService.closeIssue(pr.owner, pr.repo, pr.number);
        }
      }
      okrService.updateAction(meshPath, okrId, actionId, { status: 'cancelled', completedAt: new Date().toISOString() });
      void vscode.window.showInformationMessage(`Rejected ${actionId}. PR closed; action marked cancelled. Re-scope from the OKR detail edit form and re-trigger the phase.`);
      await this.onDrillIntoOkr(okrId, 'view');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Reject failed: ${toErrorMessage(err)}` });
    }
  }

  /**
   * Push an okrDetail message including the supporting lists (platforms +
   * BARs across the mesh) the webview needs to render the edit form. The
   * lists are sent on every detail render so the webview never has to
   * round-trip to fetch them — small enough payload (single-digit-to-
   * low-double-digit BARs per mesh at today's scale).
   */
  private postOkrDetail(meshPath: string, okr: OkrCard, mode: OkrDetailMode): void {
    const summary = this.meshService.buildPortfolioSummary(meshPath);
    const availablePlatforms: OkrAvailablePlatform[] = (summary?.platforms ?? []).map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      barCount: p.barCount,
    }));
    const availableBars: OkrAvailableBar[] = (summary?.allBars ?? []).map(b => ({
      id: b.id,
      name: b.name,
      platformId: b.platformId,
      platformName: b.platformName,
      compositeScore: b.compositeScore,
      tier: b.compositeScore >= 80 ? 'autonomous' : b.compositeScore >= 50 ? 'supervised' : 'restricted',
      repos: b.repos ?? [],
    }));
    const affectedBars = okr.objectiveAlignment.affectedBarIds.map(barId => {
      const bar = this.meshService.findBarById(meshPath, barId);
      if (!bar) {
        return { id: barId, name: barId, path: '', compositeScore: 0, tier: 'restricted' as const };
      }
      const tier: 'autonomous' | 'supervised' | 'restricted' =
        bar.compositeScore >= 80 ? 'autonomous'
        : bar.compositeScore >= 50 ? 'supervised' : 'restricted';
      return { id: bar.id, name: bar.name, path: bar.path, compositeScore: bar.compositeScore, tier };
    });
    this.postMessage({
      type: 'okrDetail',
      okr,
      affectedBars,
      mode,
      availablePlatforms,
      availableBars,
    });
  }

  private orderBarsByTier(meshPath: string, barIds: string[]): string[] {
    return barIds
      .map(id => {
        const bar = this.meshService.findBarById(meshPath, id);
        return { id, score: bar?.compositeScore ?? 0 };
      })
      .sort((a, b) => a.score - b.score)
      .map(b => b.id);
  }

  /**
   * Phase A — scaffold the IMDB-Lite sample OKR. Idempotent at the
   * MeshService layer (returns the existing sample if one is already
   * present). Posts the resulting OKR id so the webview can navigate to
   * its detail view.
   */
  private async onScaffoldOkrSample() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    try {
      const card = this.meshService.scaffoldImdbLiteOkr(meshPath);
      if (!card) {
        this.postMessage({ type: 'error', message: 'Failed to scaffold sample OKR' });
        return;
      }
      this.postMessage({ type: 'okrSampleScaffolded', okrId: card.meta.id });
      await this.onGetOkrList();
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to scaffold sample OKR: ${toErrorMessage(err)}` });
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
      // Include open workspace folder full paths so webview can highlight active repos + navigate to scorecard
      const workspaceFolders = (vscode.workspace.workspaceFolders || []).map(f => f.uri.fsPath);
      this.postMessage({ type: 'portfolioData', data: summary, workspaceFolders });
      // Fetch git status for sync indicators
      this.sendGitStatus(meshPath, summary.allBars);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Error scanning mesh: ${toErrorMessage(err)}`,
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
          const repoParsed = parseGitHubUrl(repoUrl);
          if (repoParsed) {
            try {
              await execFileAsync('gh', [
                'api', `repos/${repoParsed.owner}/${repoParsed.repo}/actions/permissions/workflow`,
                '-X', 'PUT',
                '-f', 'default_workflow_permissions=write',
                '-F', 'can_approve_pull_request_reviews=true',
              ], { cwd: meshPath, timeout: GH_TIMEOUT });
            } catch { /* non-fatal — user can enable manually */ }
          }
        }
        stepIdx++;

        // Step 5: Seed prompt packs + write every mesh workflow
        markActive(stepIdx);
        try {
          promptPackService.seedMeshPrompts(meshPath);
          this.meshService.writeMeshWorkflows(meshPath, this.context.extensionPath);
          await execFileAsync('git', ['add', '-A'], { cwd: meshPath });
          await execFileAsync('git', ['commit', '-m', 'chore: add mesh workflows + caterpillar prompts\n\nOraculum review, archeologist (research), prd, label-on-merge bus,\nand notify-code-repos workflows; .caterpillar/prompts/ seeded.\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: meshPath });
          await execFileAsync('git', ['push'], { cwd: meshPath, timeout: GH_TIMEOUT });
          markDone(stepIdx, 'Mesh workflows + prompts added');
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
            const secretRepo = parseGitHubUrl(repoUrl);
            if (secretRepo) {
              await this.githubService.setRepoSecret(secretRepo.owner, secretRepo.repo, 'ANTHROPIC_API_KEY', apiKey);
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
        message: `Failed to initialize mesh: ${toErrorMessage(err)}`,
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
        message: `Failed to add platform: ${toErrorMessage(err)}`,
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
        message: `Failed to scaffold BAR: ${toErrorMessage(err)}`,
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

      // Record a fresh score-history snapshot for THIS BAR only — deliberate
      // recalc on drill-in. The portfolio sweep is intentionally read-only;
      // snapshots happen when the user actively opens a BAR (and via the MCP
      // `score_snapshot` tool for workflow-triggered cadence). Rounded so
      // the parser's integer regex agrees with the in-memory value.
      this.barService.appendScoreSnapshot(barPath, {
        timestamp: new Date().toISOString(),
        composite: Math.round(bar.compositeScore),
        architecture: Math.round(bar.architecture.score),
        security: Math.round(bar.security.score),
        information_risk: Math.round(bar.infoRisk.score),
        operations: Math.round(bar.operations.score),
      });

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

      // Saved threat model (if previously generated)
      const savedThreatModel = ThreatModelService.readSavedThreatModel(barPath);

      // Phase 7 — Compute score decay info
      let decayInfo: { rawComposite: number; decayedComposite: number; decayFactor: number; daysSinceAssessment: number; inGraceWindow: boolean } | undefined;
      try {
        const scoreHistory = this.barService.readScoreHistory(barPath);
        if (scoreHistory.length > 0) {
          const lastSnapshot = scoreHistory[scoreHistory.length - 1];
          const timestamps: GovernanceTimestamps = {
            lastAssessment: lastSnapshot.timestamp,
            lastReview: null,
            lastScaffold: null,
          };
          const decay = computeDecayedScore(bar.compositeScore, timestamps);
          decayInfo = {
            rawComposite: bar.compositeScore,
            decayedComposite: decay.decayedScore,
            decayFactor: decay.decayFactor,
            daysSinceAssessment: decay.daysSinceAssessment,
            inGraceWindow: decay.inGraceWindow,
          };
        }
      } catch { /* decay is best-effort */ }

      this.postMessage({ type: 'barDetail', bar, decisions, repoTree, diagrams, adrs, calmData, layouts, savedThreatModel, decayInfo });

      // Send cross-BAR governance context (best effort)
      try {
        const reader = new MeshReader(meshPath);
        const redQueen = new RedQueenService();
        const decision = redQueen.getOrchestrationDecision(reader, bar.name);
        if (!('error' in decision)) {
          const linked = decision.linkedBars.map(l => {
            const linkedBar = summary?.allBars.find(b => b.name === l.barName);
            return {
              barName: l.barName,
              barPath: linkedBar?.path ?? '',
              relationship: l.relationship,
              compositeScore: linkedBar?.compositeScore ?? 0,
              tier: linkedBar ? computeTier(linkedBar) : 'restricted' as const,
            };
          });
          const siblings = (summary?.allBars || [])
            .filter(b => b.platformId === bar.platformId && b.id !== bar.id)
            .map(b => ({ name: b.name, id: b.id, path: b.path, compositeScore: b.compositeScore, tier: computeTier(b) }));
          this.postMessage({
            type: 'barGovernanceContext',
            barPath,
            linkedBars: linked,
            siblingBars: siblings,
            platformOverrides: decision.platformOverrides,
          });
        }
      } catch { /* governance context is best-effort */ }

      // Refresh git status for sync indicators
      if (summary) {
        this.sendGitStatus(meshPath, summary.allBars);
      }
      // If we have pending active review info from Oraculum, show banner immediately
      if (this.pendingActiveReview) {
        const review = this.pendingActiveReview;
        this.pendingActiveReview = undefined;
        this.postMessage({ type: 'activeReview', barPath, review });
        // Also convert to AgentStatusInfo for the new component
        this.postMessage({ type: 'agentStatusUpdate', barPath, status: {
          phase: 'implementing' as const,
          agent: review.agent,
          issue: { number: review.issueNumber, url: review.issueUrl, title: review.title },
          pr: review.pr ? { ...review.pr, checksStatus: 'unknown' as const, mergeable: false, state: 'open' as const, reviewRequested: false } : undefined,
        }});
        this.lastActiveReviewState = true;
        this.startActiveReviewPolling(barPath, bar.name);
      } else {
        // Fire-and-forget: detect agent status for this BAR
        this.onLoadActiveReview(barPath, bar.name).catch(() => { /* best effort */ });
      }
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to load BAR: ${toErrorMessage(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  private async onLoadActiveReview(barPath: string, barName?: string) {
    try {
      if (!this.meshRepoInfo) {
        // Detect mesh repo from git remote if not already cached
        const meshPath = MeshService.getMeshPath();
        if (!meshPath) { return; }
        const url = await getRemoteOriginUrl(meshPath);
        if (!url) { return; }
        const parsed = parseGitHubUrl(url);
        if (!parsed) { return; }
        this.meshRepoInfo = { owner: parsed.owner, repo: parsed.repo };
      }

      const searchName = barName || path.basename(barPath);
      this.lastDrilledBarName = searchName;

      const status = await this.agentStatusService.detectForBar(
        this.meshRepoInfo.owner, this.meshRepoInfo.repo, searchName
      );

      // Send unified agent status
      this.postMessage({ type: 'agentStatusUpdate', barPath, status });
      // Also send legacy activeReview for any code still using it
      this.postMessage({ type: 'activeReview', barPath, review: status ? {
        issueNumber: status.issue.number,
        issueUrl: status.issue.url,
        title: status.issue.title,
        agent: status.agent,
        pr: status.pr ? { number: status.pr.number, url: status.pr.url, title: status.pr.title, draft: status.pr.draft } : undefined,
      } : null });

      // Manage polling
      if (status) {
        this.lastActiveReviewState = true;
        this.startActiveReviewPolling(barPath, searchName);
      } else {
        if (this.lastActiveReviewState) {
          this.lastActiveReviewState = false;
          this.stopActiveReviewPolling();
          await this.onDrillIntoBar(barPath);
        } else {
          this.stopActiveReviewPolling();
        }
      }
    } catch {
      // best effort
    }
  }

  private startActiveReviewPolling(barPath: string, barName: string) {
    if (this.activeReviewPollTimer) { return; }
    this.activeReviewPollTimer = setInterval(async () => {
      if (this.lastDrilledBarPath !== barPath) {
        this.stopActiveReviewPolling();
        return;
      }
      try {
        await this.onLoadActiveReview(barPath, barName);
      } catch { /* best effort */ }
    }, 30_000);
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
      this.postMessage({ type: 'error', message: `LLM request failed: ${toErrorMessage(err)}` });
      this.postMessage({ type: 'topFindingsSummary', barPath, summary: null });
    }
  }

  private onSaveLayout(barPath: string, diagramType: 'context' | 'logical' | 'platform', layout: object): void {
    try {
      writeLayoutFile(barPath, diagramType, layout as Parameters<typeof writeLayoutFile>[2]);
    } catch (err) {
      logger.error('Failed to save layout', err);
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
        message: `Failed to export PNG: ${toErrorMessage(err)}`,
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
        message: `Failed to apply CALM mutation: ${toErrorMessage(err)}`,
      });
    }
  }

  private resolvePlatformPath(platformId: string): string | null {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) { return null; }
    const platformsDir = path.join(meshPath, 'platforms');
    if (!fs.existsSync(platformsDir)) { return null; }
    for (const entry of fs.readdirSync(platformsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
      const yamlPath = path.join(platformsDir, entry.name, 'platform.yaml');
      if (!fs.existsSync(yamlPath)) { continue; }
      try {
        const content = fs.readFileSync(yamlPath, 'utf8');
        const idMatch = content.match(/^\s*id:\s*(.+)$/m);
        if (idMatch && idMatch[1].trim() === platformId) {
          return path.join(platformsDir, entry.name);
        }
      } catch { /* skip */ }
    }
    return null;
  }

  private onLoadPlatformArchitecture(platformId: string): void {
    try {
      const platformPath = this.resolvePlatformPath(platformId);
      if (!platformPath) {
        this.postMessage({ type: 'platformArchData', platformId, calmData: { nodes: [], relationships: [] } });
        return;
      }
      const archFile = path.join(platformPath, 'platform.arch.json');
      if (!fs.existsSync(archFile)) {
        this.postMessage({ type: 'info', message: 'No platform architecture file found. Use the palette to add BARs and shared infrastructure.' });
        this.postMessage({ type: 'platformArchData', platformId, calmData: { nodes: [], relationships: [] } });
        return;
      }
      const raw = fs.readFileSync(archFile, 'utf-8');
      const calmData = JSON.parse(raw);
      this.postMessage({ type: 'platformArchData', platformId, calmData });
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to load platform architecture: ${toErrorMessage(err)}` });
    }
  }

  private onPlatformCalmMutation(platformId: string, patches: CalmPatch[]): void {
    try {
      const platformPath = this.resolvePlatformPath(platformId);
      if (!platformPath) {
        this.postMessage({ type: 'error', message: `Platform not found: ${platformId}` });
        return;
      }
      const archFile = path.join(platformPath, 'platform.arch.json');
      const contentHash = applyCalmPatch(archFile, patches);

      if (contentHash) {
        this.calmFileWatcher.markWritten(archFile, contentHash);
      }
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to apply platform CALM mutation: ${toErrorMessage(err)}` });
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
      fs.mkdirSync(archDir, { recursive: true });
      fs.writeFileSync(archFile, result, 'utf-8');

      // Refresh the BAR detail view
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to apply archetype: ${toErrorMessage(err)}`,
      });
    }
  }

  private async onSamplePlatform() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    const choice = await vscode.window.showQuickPick([
      { label: 'Insurance Operations', description: '3 BARs: Claims, Policy Admin, Fraud Detection', value: 'insurance' },
      { label: 'IMDB Lite', description: '3-tier web app: React + Express API + MongoDB', value: 'imdb-lite' },
    ], { placeHolder: 'Select a sample platform template' });
    if (!choice) { return; }

    this.postMessage({ type: 'loading', active: true, message: `Creating ${choice.label}...` });

    try {
      // Detect the org from the mesh's git remote so the sample BARs end
      // up with real repo URLs (https://github.com/<that-org>/<repo>)
      // instead of the <org> placeholder. Falls back to <org> if the mesh
      // isn't a git repo or has no GitHub remote — same behavior as before.
      const githubOrg = await this.detectMeshOwner(meshPath);
      const result = choice.value === 'imdb-lite'
        ? this.meshService.scaffoldImdbLitePlatform(meshPath, githubOrg ? { githubOrg } : {})
        : this.meshService.scaffoldSamplePlatform(meshPath);
      // IMDB-Lite ships with its sample Celebs OKR — seed it inline so the
      // OKR tab is populated immediately. Idempotent at the MeshService
      // layer (returns the existing card if one is already present), so
      // re-running Sample Platform never accumulates dupes. OKR inherits
      // URLs from BAR app.yaml directly, so no need to pass githubOrg here.
      if (choice.value === 'imdb-lite') {
        try {
          this.meshService.scaffoldImdbLiteOkr(meshPath);
        } catch (okrErr) {
          // Non-fatal: platform is already on disk; surface as info so the
          // user can re-trigger from the OKR tab if needed.
          this.postMessage({
            type: 'info',
            message: `Platform created; sample OKR seed failed: ${toErrorMessage(okrErr)}`,
          });
        }
      }
      this.postMessage({
        type: 'samplePlatformCreated',
        platformCount: result.platformCount,
        barCount: result.barCount,
      });
      await this.loadPortfolio();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to create sample platform: ${toErrorMessage(err)}`,
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
        message: `Failed to update ${field}: ${toErrorMessage(err)}`,
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
        message: `Failed to update app.yaml: ${toErrorMessage(err)}`,
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
        message: `Failed to list ADRs: ${toErrorMessage(err)}`,
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
        message: `Failed to create ADR: ${toErrorMessage(err)}`,
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
        message: `Failed to update ADR: ${toErrorMessage(err)}`,
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
        message: `Failed to delete ADR: ${toErrorMessage(err)}`,
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
      logger.error('[ThreatModel] Generation failed', err);
      // Reset generating state so the webview doesn't stay stuck on progress bar
      this.postMessage({ type: 'threatModelFailed' });
      this.postMessage({
        type: 'error',
        message: `Threat model generation failed: ${toErrorMessage(err)}`,
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
        message: `Export failed: ${toErrorMessage(err)}`,
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
        message: `Org scan failed: ${toErrorMessage(err)}`,
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
        message: `Failed to load repos: ${toErrorMessage(err)}`,
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
        message: `Org scan failed: ${toErrorMessage(err)}`,
      });
    }
  }

  private async onAddReposToBar(barPath: string, repoUrls: string[]) {
    logger.info(`[addReposToBar] barPath="${barPath}" repoUrls=${JSON.stringify(repoUrls)}`);
    try {
      const count = this.barService.addRepos(barPath, repoUrls);
      logger.debug(`[addReposToBar] addRepos returned count=${count}`);
      this.postMessage({ type: 'reposAddedToBar', barPath, count });
      // Refresh the BAR detail to show the new repos
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      logger.error('[addReposToBar] error', err);
      this.postMessage({
        type: 'error',
        message: `Failed to add repos: ${toErrorMessage(err)}`,
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
        message: `Failed to apply org scan: ${toErrorMessage(err)}`,
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
        message: toErrorMessage(err),
      });
    }
  }

  private async onCommitMesh() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'syncError', barPath: '', message: 'No mesh configured.' });
      return;
    }

    const gitRoot = this.gitSyncService.findGitRoot(meshPath);
    if (!gitRoot) {
      this.postMessage({ type: 'syncError', barPath: '', message: 'Not a git repository.' });
      return;
    }

    try {
      await execFileAsync('git', ['add', '-A'], { cwd: gitRoot });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: gitRoot });
      if (!diffCheck.trim()) {
        this.postMessage({ type: 'syncComplete', barPath: '', message: 'Nothing to commit.' });
        return;
      }

      await execFileAsync('git', ['commit', '-m', 'chore: update governance mesh\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: gitRoot });
      this.postMessage({ type: 'syncComplete', barPath: '', message: 'Changes committed.' });

      // Refresh git status so banner updates
      const summary = this.meshService.buildPortfolioSummary(meshPath);
      if (summary) {
        await this.sendGitStatus(meshPath, summary.allBars);
      }
    } catch (err) {
      this.postMessage({ type: 'syncError', barPath: '', message: `Commit failed: ${toErrorMessage(err)}` });
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
        message: toErrorMessage(err),
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
          const wsFolders = (vscode.workspace.workspaceFolders || []).map(f => f.uri.fsPath);
          this.postMessage({ type: 'portfolioData', data: summary, workspaceFolders: wsFolders });
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
        message: toErrorMessage(err),
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
      this.postMessage({ type: 'error', message: `Failed to switch model: ${toErrorMessage(err)}` });
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
      this.postMessage({ type: 'error', message: `Invalid model JSON: ${toErrorMessage(err)}` });
    }
  }

  private async onOpenRepoInContext(repoUrl: string, barPath: string) {
    // Extract repo name from URL (e.g., https://github.com/org/repo-name → repo-name)
    let repoName = repoUrl;
    try {
      repoName = repoUrl.replace(/\.git$/, '').split('/').pop() || repoUrl;
    } catch { /* use full url */ }

    // Check if already in workspace (exact folder name match, not endsWith)
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const existing = workspaceFolders.find(f => path.basename(f.uri.fsPath) === repoName);
    if (existing) { return; } // Already open in workspace

    // Search for the repo locally
    const localPath = this.findLocalRepo(repoName, repoUrl);

    if (localPath) {
      // Add to current workspace instead of opening a new window
      vscode.workspace.updateWorkspaceFolders(workspaceFolders.length, 0,
        { uri: vscode.Uri.file(localPath) });
      this.refreshWorkspaceFolders();
      this.ensureNamedWorkspace(this.lastDrilledBarName);
    } else {
      // Repo not found locally — offer clone, open local, or scaffold
      const action = await vscode.window.showInformationMessage(
        `Repository "${repoName}" not found locally.`,
        'Clone & Add',
        'Open Local Folder',
        '\u{1F407} Scaffold',
      );
      if (action === 'Clone & Add') {
        const defaultDir = this.getDefaultCloneDir();
        const folders = await vscode.window.showOpenDialog({
          canSelectFolders: true, canSelectFiles: false, canSelectMany: false,
          openLabel: 'Clone here (select parent folder)',
          ...(defaultDir ? { defaultUri: vscode.Uri.file(defaultDir) } : {}),
        });
        if (!folders?.[0]) { return; }
        const parentDir = folders[0].fsPath;
        try {
          this.postMessage({ type: 'loading', active: true, message: `Cloning ${repoName}...` });
          await this.cloneRepo(repoUrl, parentDir);
          const clonedPath = path.join(parentDir, repoName);
          const current = vscode.workspace.workspaceFolders || [];
          vscode.workspace.updateWorkspaceFolders(current.length, 0,
            { uri: vscode.Uri.file(clonedPath) });
          this.refreshWorkspaceFolders();
          this.ensureNamedWorkspace(this.lastDrilledBarName);
          // Auto-open the Security Scorecard for the cloned repo
          vscode.commands.executeCommand('maintainabilityai.openScorecard', clonedPath);
        } catch (err) {
          this.postMessage({ type: 'error', message: `Clone failed: ${toErrorMessage(err)}` });
        } finally {
          this.postMessage({ type: 'loading', active: false });
        }
      } else if (action === 'Open Local Folder') {
        const picked = await vscode.window.showOpenDialog({
          canSelectFolders: true, canSelectFiles: false, canSelectMany: false,
          openLabel: `Select "${repoName}" folder`,
          ...(this.getDefaultCloneDir() ? { defaultUri: vscode.Uri.file(this.getDefaultCloneDir()!) } : {}),
        });
        if (picked?.[0]) {
          const current = vscode.workspace.workspaceFolders || [];
          vscode.workspace.updateWorkspaceFolders(current.length, 0, { uri: picked[0] });
          this.refreshWorkspaceFolders();
          this.ensureNamedWorkspace(this.lastDrilledBarName);
        }
      } else if (action === '\u{1F407} Scaffold') {
        await this.onScaffoldComponent(repoUrl, barPath);
      }
    }
  }

  private findLocalRepo(repoName: string, repoUrl: string): string | null {
    // 1. Check workspace folders (exact basename match to avoid false positives
    //    e.g. "sample-imdb-identity" should not match "imdb-identity")
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    for (const folder of workspaceFolders) {
      if (path.basename(folder.uri.fsPath) === repoName) {
        return folder.uri.fsPath;
      }
      const subPath = path.join(folder.uri.fsPath, repoName);
      if (fs.existsSync(subPath)) {
        return subPath;
      }
    }
    // 2. Check sibling directories of mesh root
    const meshPath = MeshService.getMeshPath();
    if (meshPath) {
      const parentDir = path.dirname(meshPath);
      const siblingPath = path.join(parentDir, repoName);
      if (fs.existsSync(siblingPath)) {
        return siblingPath;
      }
    }
    // 3. Check if URL is itself a local path
    if (fs.existsSync(repoUrl)) {
      return repoUrl;
    }
    return null;
  }

  private async cloneRepo(repoUrl: string, parentDir: string): Promise<void> {
    await execFileAsync('git', ['clone', repoUrl], { cwd: parentDir, timeout: 120000 });
  }

  private getDefaultCloneDir(): string | null {
    const meshPath = MeshService.getMeshPath();
    if (meshPath) { return path.dirname(meshPath); }
    const first = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (first) { return path.dirname(first); }
    return null;
  }

  private refreshWorkspaceFolders() {
    // Re-send to webview so linked repos update their "open" badges
    if (this.panel.visible) {
      this.loadPortfolio();
    }
  }

  private ensureNamedWorkspace(barName?: string) {
    // If workspace already has a .code-workspace file, skip
    if (vscode.workspace.workspaceFile && vscode.workspace.workspaceFile.scheme === 'file') { return; }

    // Derive name from BAR, mesh portfolio, or fallback
    const meshPath = MeshService.getMeshPath();
    let name = barName || 'maintainabilityai';
    if (!barName && meshPath) {
      try {
        const summary = this.meshService.buildPortfolioSummary(meshPath);
        if (summary?.portfolio?.name) { name = summary.portfolio.name; }
      } catch { /* best effort */ }
    }

    // Workspace folder updates may not propagate synchronously — wait for the
    // onDidChangeWorkspaceFolders event before checking folder count & saving.
    const disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      disposable.dispose();
      const folders = vscode.workspace.workspaceFolders || [];
      if (folders.length >= 2) {
        this.saveWorkspaceFile(name);
      }
    });

    // Fallback: if folders are already updated, save immediately
    const folders = vscode.workspace.workspaceFolders || [];
    if (folders.length >= 2) {
      disposable.dispose();
      this.saveWorkspaceFile(name);
    }
  }

  private saveWorkspaceFile(name: string) {
    const folders = (vscode.workspace.workspaceFolders || []).map(f => ({
      path: f.uri.fsPath,
    }));
    const workspaceConfig = { folders, settings: {} };
    const meshPath = MeshService.getMeshPath();
    const dir = meshPath ? path.dirname(meshPath) : (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
    if (!dir) { return; }
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const wsFile = path.join(dir, `${safeName}.code-workspace`);
    try {
      fs.writeFileSync(wsFile, JSON.stringify(workspaceConfig, null, 2), 'utf-8');
      // Don't auto-open — just save the file so the workspace is named.
    } catch {
      // Non-fatal — workspace stays untitled but user can save manually
    }
  }

  // ==========================================================================
  // CALM Component Picker
  // ==========================================================================

  private async onGetCalmComponents(barPath: string) {
    const calmData = readCalmArchitectureData(barPath);
    if (!calmData) {
      this.postMessage({ type: 'calmComponents', components: [] });
      return;
    }
    const arch = calmData as { nodes: { 'unique-id': string; 'node-type': string; name: string; description?: string }[]; relationships: { 'relationship-type': { 'composed-of'?: { container: string; nodes: string[] } } }[] };
    // Find composed-of children (the implementable components)
    const composedOfNodes = arch.relationships
      .filter(r => r['relationship-type']['composed-of'])
      .flatMap(r => r['relationship-type']['composed-of']!.nodes);

    // Use composed-of children if available, otherwise all non-actor nodes
    const componentNodes = composedOfNodes.length > 0
      ? arch.nodes.filter(n => composedOfNodes.includes(n['unique-id']))
      : arch.nodes.filter(n => n['node-type'] !== 'actor');

    const components = componentNodes.map(n => ({
      id: n['unique-id'],
      name: n.name,
      type: n['node-type'],
      description: n.description || '',
      suggestedRepo: n.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
    this.postMessage({ type: 'calmComponents', components });
  }

  private async onImplementComponent(
    barPath: string,
    componentId: string,
    repoName: string,
    componentName: string,
    componentType: string,
    componentDescription: string,
  ) {
    // Repo is already added to app.yaml by the webview (via addReposToBar message).
    // Build the repo URL from org detection.
    let org = '';
    const meshPath = MeshService.getMeshPath();
    if (meshPath) {
      try {
        const summary = this.meshService.buildPortfolioSummary(meshPath);
        org = summary?.portfolio?.org || '';
      } catch { /* best effort */ }
    }
    if (!org) {
      try {
        const manifest = this.barService.readManifest(barPath);
        const existingRepo = (manifest?.repos || [])[0] || '';
        const match = existingRepo.match(/github\.com[/:]([\w.-]+)\//);
        if (match) { org = match[1]; }
      } catch { /* best effort */ }
    }
    const repoUrl = org ? `https://github.com/${org}/${repoName}` : repoName;

    // Build the scaffold context while we still have access to the governance mesh
    let componentContext: ComponentScaffoldContext;
    try {
      componentContext = await this.buildScaffoldDescription(repoUrl, barPath, {
        id: componentId, name: componentName, type: componentType, description: componentDescription,
      });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to build scaffold context: ${toErrorMessage(err)}`,
      });
      return;
    }

    // Use the BAR name for the workspace folder (e.g. "IMDB Lite Application")
    const barName = componentContext.barName;
    const safeFolderName = barName.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || repoName;

    // Prompt user to pick the parent directory for the workspace
    const defaultDir = path.join(os.homedir(), 'projects');
    if (!fs.existsSync(defaultDir)) {
      try { fs.mkdirSync(defaultDir, { recursive: true }); } catch { /* best effort */ }
    }
    const folders = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: `Select parent folder for "${safeFolderName}"`,
      defaultUri: vscode.Uri.file(fs.existsSync(defaultDir) ? defaultDir : os.homedir()),
    });
    if (!folders?.[0]) { return; } // User cancelled

    // Create the BAR-named workspace folder
    const targetFolder = path.join(folders[0].fsPath, safeFolderName);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Create a .code-workspace file so VS Code remembers this as a named workspace
    const wsFileName = safeFolderName.replace(/\s+/g, '-').toLowerCase();
    const wsFilePath = path.join(targetFolder, `${wsFileName}.code-workspace`);
    try {
      const wsConfig = {
        folders: [{ path: '.' }],
        settings: {},
      };
      fs.writeFileSync(wsFilePath, JSON.stringify(wsConfig, null, 2), { encoding: 'utf-8', flag: 'wx' });
    } catch { /* file already exists — keep existing workspace config */ }

    // Check if we're already in the target workspace (e.g. implementing a second component).
    // If so, open ScaffoldPanel directly — calling vscode.openFolder on the same workspace
    // is a no-op, so the breadcrumb would never be consumed by activate().
    const currentWsFolders = vscode.workspace.workspaceFolders || [];
    const alreadyInWorkspace =
      vscode.workspace.workspaceFile?.fsPath === wsFilePath ||
      currentWsFolders.some(f => f.uri.fsPath === targetFolder);

    if (alreadyInWorkspace) {
      ScaffoldPanel.createOrShow(this.context, componentContext);
    } else {
      // Write breadcrumb to globalState so activate() can resume after workspace switch
      const breadcrumb: WhiteRabbitBreadcrumb = { targetFolder, componentContext };
      await this.context.globalState.update('maintainabilityai.whiteRabbitBreadcrumb', breadcrumb);

      // Open the workspace file — this gives VS Code a named workspace
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(wsFilePath));
    }
  }

  private async onScaffoldComponent(repoUrl: string, barPath: string, component?: { name: string; type: string; description: string }) {
    try {
      const context = await this.buildScaffoldDescription(repoUrl, barPath, component);
      ScaffoldPanel.createOrShow(this.context, context);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to build scaffold context: ${toErrorMessage(err)}`,
      });
    }
  }

  /**
   * Deploy Red Queen governance files to a linked repo's local clone.
   * Calls scaffoldAgentConfig() and writes files directly to the workspace folder.
   */
  private async onDeployGovernanceToRepo(barPath: string, localPath?: string) {
    if (!localPath) {
      vscode.window.showWarningMessage('Repository is not open in the workspace. Open the repo first, then deploy governance files.');
      return;
    }

    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      vscode.window.showWarningMessage('No governance mesh configured.');
      return;
    }

    const manifest = this.barService.readManifest(barPath);
    const barName = manifest?.name || path.basename(barPath);

    try {
      const reader = new MeshReader(meshPath);
      const redQueen = new RedQueenService();
      const result = scaffoldAgentConfig(reader, barName, redQueen);
      if ('error' in result) {
        vscode.window.showWarningMessage(`Governance deploy failed: ${result.error}`);
        return;
      }

      const written = writeScaffoldFiles(localPath, result.files);

      vscode.window.showInformationMessage(`Governance files deployed to ${path.basename(localPath)}: ${written} files written`);
      // Refresh BAR detail to reflect updated state
      await this.onDrillIntoBar(barPath);
    } catch (err) {
      vscode.window.showErrorMessage(`Governance deploy error: ${toErrorMessage(err)}`);
    }
  }

  private async buildScaffoldDescription(repoUrl: string, barPath: string, component?: { id?: string; name: string; type: string; description: string }): Promise<ComponentScaffoldContext> {
    // 1. BAR name & manifest
    const manifest = this.barService.readManifest(barPath);
    const barName = manifest?.name || path.basename(barPath);

    // 2. Repo name from URL
    const parsed = GitHubService.parseRepoUrl(repoUrl);
    const repoName = parsed?.repo || repoUrl.replace(/\.git$/, '').split('/').pop() || repoUrl;

    // 3. Architecture context — compressed to component scope when available
    let calmSection = '';
    const calmData = readCalmArchitectureData(barPath);
    if (calmData && component?.id) {
      calmSection = LookingGlassPanel.compressCalmForComponent(calmData, component.id, manifest);
    } else if (calmData) {
      // Whole-BAR scaffold: full JSON (truncated)
      let calmStr = JSON.stringify(calmData, null, 2);
      if (calmStr.length > 5000) { calmStr = calmStr.slice(0, 5000) + '\n... (truncated)'; }
      calmSection = `\n### Architecture (CALM)\n\`\`\`json\n${calmStr}\n\`\`\`\n`;
    }

    // 4. ADR summaries — accepted only (these are the decisions in force)
    let adrSection = '';
    const adrs = this.barService.listAdrs(barPath).filter(a => a.status === 'accepted');
    if (adrs.length > 0) {
      const lines = adrs.map(a => `- **${a.id}**: ${a.title} — ${a.decision?.slice(0, 120) || 'No decision recorded'}`);
      adrSection = `\n### Architecture Decision Records (Accepted)\n${lines.join('\n')}\n`;
    }

    // 5. Threat model — scoped to component when available
    let threatSection = '';
    if (component?.id) {
      threatSection = LookingGlassPanel.compressThreatModelForComponent(barPath, component.id, component.name);
    } else {
      const threatYamlPath = path.join(barPath, 'security', 'threat-model.yaml');
      if (fs.existsSync(threatYamlPath)) {
        try {
          const raw = fs.readFileSync(threatYamlPath, 'utf-8');
          const summary = raw.length > 3000 ? raw.slice(0, 3000) + '\n... (truncated)' : raw;
          threatSection = `\n### Threat Model\n\`\`\`yaml\n${summary}\n\`\`\`\n`;
        } catch { /* best effort */ }
      }
    }

    // 6. Linked repos from app.yaml
    let reposSection = '';
    const repos = manifest?.repos || [];
    if (repos.length > 0) {
      const lines = repos.map(r => `- ${r}`);
      reposSection = `\n### Linked Repositories\n${lines.join('\n')}\n`;
    }

    // 7. Scaffold prompt pack
    let scaffoldGuidelines = '';
    try {
      const packContent = promptPackService.getScaffoldPackContent();
      scaffoldGuidelines = `\n### Scaffold Guidelines\n${packContent}\n`;
    } catch { /* best effort */ }

    // Build the description — scoped to the selected component when available
    let componentHeader: string;
    if (component) {
      componentHeader = `## Component: ${component.name} (${component.type}) — ${barName}

**Repository**: \`${repoName}\`
${component.description ? `\n${component.description}\n` : ''}
Scaffold **only this component** following the architecture below. Do not implement other components in the architecture — focus exclusively on \`${component.name}\`.`;
    } else {
      componentHeader = `## Component: ${repoName} — ${barName}

Scaffold a new implementation of this component following the architecture below.`;
    }

    const description = `${componentHeader}
${calmSection}${adrSection}${threatSection}${reposSection}${scaffoldGuidelines}`;

    // Start with no packs pre-selected — user picks what they need (max 5)
    const packs: PromptPackSelection = {
      owasp: [],
      maintainability: [],
      threatModeling: [],
    };

    // Compute governance tier from mesh (best effort)
    let governanceTier: string | undefined;
    try {
      const meshPath = MeshService.getMeshPath();
      if (meshPath) {
        const summary = this.meshService.buildPortfolioSummary(meshPath);
        const bar = summary?.allBars.find(b => b.path === barPath);
        if (bar) { governanceTier = computeTier(bar); }
      }
    } catch { /* governance tier is best-effort */ }

    return { barPath, barName, repoUrl, repoName, description, packs, governanceTier };
  }

  // --------------------------------------------------------------------------
  // Scaffold context compression helpers
  // --------------------------------------------------------------------------

  /**
   * Compress CALM architecture JSON to focused markdown for a single component.
   * Extracts: service info, interfaces, connections in/out, related flows, controls, repos.
   */
  private static compressCalmForComponent(
    calmData: object,
    componentId: string,
    manifest: import('../types').AppManifest | null,
  ): string {
    const arch = calmData as {
      nodes: { 'unique-id': string; 'node-type': string; name: string; description?: string; 'data-classification'?: string; interfaces?: { 'unique-id': string; [k: string]: unknown }[]; controls?: Record<string, { description: string }> }[];
      relationships: { 'unique-id': string; description?: string; protocol?: string; 'relationship-type': { connects?: { source: { node: string }; destination: { node: string } }; interacts?: { actor: string; nodes: string[] }; 'composed-of'?: { container: string; nodes: string[] } }; controls?: Record<string, { description: string }> }[];
      flows?: { 'unique-id': string; name: string; description?: string; transitions: { 'relationship-unique-id': string; 'sequence-number': number; summary: string }[] }[];
      controls?: Record<string, { description: string }>;
    };

    const node = arch.nodes.find(n => n['unique-id'] === componentId);
    if (!node) { return ''; }

    const lines: string[] = ['\n### Architecture Context'];

    // Service summary
    const classif = node['data-classification'] ? ` [${node['data-classification']}]` : '';
    lines.push(`\n**Service**: ${node.name} (${node['node-type']})${classif}`);
    if (node.description) { lines.push(node.description); }

    // Interfaces on this node
    if (node.interfaces && node.interfaces.length > 0) {
      lines.push('\n**Interfaces**:');
      for (const iface of node.interfaces) {
        lines.push(`- \`${iface['unique-id']}\``);
      }
    }

    // Build a lookup of node IDs → names
    const nodeName = (id: string) => arch.nodes.find(n => n['unique-id'] === id)?.name || id;

    // Connections where this component is source or destination
    const connectsIn: string[] = [];
    const connectsOut: string[] = [];
    const relatedRelIds = new Set<string>();

    for (const rel of arch.relationships) {
      const rt = rel['relationship-type'];
      if (rt.connects) {
        if (rt.connects.destination.node === componentId) {
          connectsIn.push(`- \u2190 ${nodeName(rt.connects.source.node)} (${rel.protocol || '?'}): ${rel.description || ''}`);
          relatedRelIds.add(rel['unique-id']);
        }
        if (rt.connects.source.node === componentId) {
          connectsOut.push(`- \u2192 ${nodeName(rt.connects.destination.node)} (${rel.protocol || '?'}): ${rel.description || ''}`);
          relatedRelIds.add(rel['unique-id']);
        }
      }
      if (rt.interacts?.nodes?.includes(componentId)) {
        connectsIn.push(`- \u2190 ${nodeName(rt.interacts.actor)} (${rel.protocol || '?'}): ${rel.description || ''}`);
        relatedRelIds.add(rel['unique-id']);
      }
    }
    if (connectsIn.length > 0) { lines.push('\n**Connections In**:'); lines.push(...connectsIn); }
    if (connectsOut.length > 0) { lines.push('\n**Connections Out**:'); lines.push(...connectsOut); }

    // Flows that reference this component's relationships
    if (arch.flows) {
      const relatedFlows = arch.flows.filter(f =>
        f.transitions.some(t => relatedRelIds.has(t['relationship-unique-id'])),
      );
      if (relatedFlows.length > 0) {
        lines.push('\n**Flows**:');
        for (const flow of relatedFlows) {
          lines.push(`- **${flow.name}** — ${flow.description || ''}`);
          for (const t of flow.transitions) {
            if (relatedRelIds.has(t['relationship-unique-id'])) {
              lines.push(`  ${t['sequence-number']}. ${t.summary}`);
            }
          }
        }
      }
    }

    // Controls — collect from root, node, and related relationships
    const controlEntries: { id: string; desc: string }[] = [];
    const addControls = (ctls?: Record<string, { description: string }>) => {
      if (!ctls) { return; }
      for (const [id, ctl] of Object.entries(ctls)) {
        if (!controlEntries.some(c => c.id === id)) {
          controlEntries.push({ id, desc: ctl.description });
        }
      }
    };
    addControls(arch.controls);
    addControls(node.controls);
    for (const rel of arch.relationships) {
      if (relatedRelIds.has(rel['unique-id'])) { addControls(rel.controls); }
    }
    if (controlEntries.length > 0) {
      lines.push('\n**Controls**:');
      for (const c of controlEntries) {
        lines.push(`- \`${c.id}\`: ${c.desc}`);
      }
    }

    // Linked repos from app.yaml
    const repos = manifest?.repos || [];
    if (repos.length > 0) {
      lines.push('\n**Sibling Repos**:');
      for (const r of repos) { lines.push(`- ${r}`); }
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Extract threat model entries relevant to a specific CALM component.
   * Matches on threat.target (CALM unique-id) or threat.targetName (display name).
   */
  private static compressThreatModelForComponent(barPath: string, componentId: string, componentName: string): string {
    const result = ThreatModelService.readSavedThreatModel(barPath);
    if (!result || result.threats.length === 0) { return ''; }

    // Match threats targeting this component by CALM id or display name (case-insensitive)
    const nameLower = componentName.toLowerCase();
    const relevant = result.threats.filter(t =>
      t.target === componentId ||
      t.targetName?.toLowerCase() === nameLower ||
      t.target?.toLowerCase().includes(componentId.toLowerCase()),
    );

    if (relevant.length === 0) { return ''; }

    const lines: string[] = ['\n### Threat Model (Component-Scoped)'];
    for (const t of relevant) {
      lines.push(`- **${t.id}** [${t.category}] — ${t.description}`);
      lines.push(`  Impact: ${t.impact} | Likelihood: ${t.likelihood} | Residual: ${t.residualRisk}`);
      if (t.recommendedMitigations.length > 0) {
        lines.push(`  Mitigations: ${t.recommendedMitigations.join('; ')}`);
      }
    }
    return lines.join('\n') + '\n';
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
        message: `Failed to load policies: ${toErrorMessage(err)}`,
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
        message: `Failed to save policy: ${toErrorMessage(err)}`,
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
      const { generateNistControls } = await import('../templates/mesh');
      this.meshService.savePolicyFile(meshPath, 'nist-800-53-controls.yaml', generateNistControls());
      // Reload policies
      const policies = this.meshService.readPolicies(meshPath);
      const nistControls = this.meshService.readNistControls(meshPath);
      this.postMessage({ type: 'policiesLoaded', policies, nistControls });
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to create NIST catalog: ${toErrorMessage(err)}`,
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
        const { generateNistControls } = await import('../templates/mesh');
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
        message: `Failed to generate baseline: ${toErrorMessage(err)}`,
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
    let content: string;
    try { content = fs.readFileSync(meshYaml, 'utf8'); } catch { return; }
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

  // --------------------------------------------------------------------------
  // Research Settings — Tavily + Anthropic/OpenAI key management + non-secret prefs
  // --------------------------------------------------------------------------

  private async onLoadResearchSettings() {
    const config = vscode.workspace.getConfiguration();
    const meshRepo = await detectGovernanceRepo();
    const githubNames = meshRepo
      ? await githubService.listRepoSecretNames(meshRepo.owner, meshRepo.repo)
      : null;

    const secrets: ResearchSecretStatus[] = RESEARCH_SECRET_IDS.map(id => {
      const def = SECRETS.find(s => s.id === id)!;
      const localValue = def.settingKey ? config.get<string>(def.settingKey, '') : '';
      return {
        id,
        label: def.label,
        envName: def.envName,
        description: def.description,
        hasVsCodeValue: !!localValue && localValue.trim().length > 0,
        hasGitHubSecret: githubNames ? githubNames.has(def.envName) : null,
        scope: def.scope ?? 'mesh',
      };
    });

    const prefs: ResearchPrefs = {
      llmProvider: config.get<'github-models' | 'anthropic' | 'openai'>('maintainabilityai.research.llmProvider', 'github-models'),
      guardrails: config.get<'strict' | 'default' | 'lenient'>('maintainabilityai.research.guardrails', 'default'),
      grounding: config.get<'strict' | 'default' | 'lenient'>('maintainabilityai.research.grounding', 'default'),
      groundingThreshold: config.get<number>('maintainabilityai.research.groundingThreshold', 0.85),
      maxIterations: config.get<number>('maintainabilityai.research.maxIterations', 3),
      costCapTokens: config.get<number>('maintainabilityai.research.costCapTokens', 200000),
    };

    this.postMessage({
      type: 'researchSettings',
      payload: { secrets, prefs, meshRepo },
    });
  }

  /**
   * Create flow — currently only meaningful for governance-mesh-token.
   * GitHub has no public API to mint a user PAT (security choice on
   * their side), so this is a guided flow:
   *
   *   1. Open the GitHub fine-grained PAT creation page in the user's
   *      browser, with the name pre-filled via URL param.
   *   2. Surface a sticky info notification listing the exact repos +
   *      permissions to pick on that page (URL params don't pre-fill
   *      either, so the checklist has to come from us).
   *   3. Immediately open showInputBox so the user can paste the token
   *      back the moment they finish minting it on GitHub.
   *   4. Save via onSaveResearchSecret, then push to the mesh repo via
   *      onPushResearchSecret. One click = browser tab + checklist +
   *      input + save + push.
   */
  private async onCreateResearchSecret(id: ResearchSecretId) {
    const def = SECRETS.find(s => s.id === id);
    if (!def) {
      this.postMessage({ type: 'error', message: `Unknown research secret: ${id}` });
      return;
    }
    if (id !== 'governance-mesh-token') {
      // Other secrets are minted on third-party provider sites that we
      // can't deep-link into uniformly. They use the regular Set flow.
      await this.onPromptResearchSecret(id);
      return;
    }

    // (1) Open the GitHub PAT creation page. Name param is the only field
    //     GitHub's form currently pre-fills via URL; resource owner +
    //     repository access + permissions all require user selection.
    const meshSlug = await detectGovernanceRepo();
    const codeRepos = this.collectLinkedCodeRepos();
    const ghUrl = `https://github.com/settings/personal-access-tokens/new?name=${encodeURIComponent('GOVERNANCE_MESH_TOKEN')}`;
    void vscode.env.openExternal(vscode.Uri.parse(ghUrl));

    // (2) Sticky checklist. Lists every code repo by slug so the user can
    //     copy-paste the names into GitHub's "Only select repositories"
    //     picker. The token's permissions are deliberately narrow —
    //     Issues:read+write to open and update the landing-issue,
    //     Contents:read to cross-reference code-repo files when
    //     composing the body, Models:read to route LLM calls through
    //     the token-owner's Copilot tier (escaping the free-tier 8K cap
    //     on github-actions[bot]). Metadata:read is GitHub's
    //     auto-granted baseline. No Issues:delete, no code writes, no
    //     workflow triggers, no broader surface.
    const repoList = codeRepos.length === 0
      ? '(no linked code repos detected — add `repos:` blocks to your BAR app.yaml files)'
      : codeRepos.map(r => `  - ${r}`).join('\n');
    const meshLabel = meshSlug ? `${meshSlug.owner}/${meshSlug.repo}` : '(no mesh repo detected)';
    const instructions =
      `Mint a fine-grained PAT on the page that just opened:\n\n` +
      `Resource owner:  your org\n` +
      `Repository access:  Only select repositories →\n` +
      `${repoList}\n\n` +
      `Repository permissions:\n` +
      `  • Metadata = Read       (auto-granted by GitHub — leave selected)\n` +
      `  • Issues   = Read and write   (notify-code-repos.yml opens + updates the landing-issue)\n` +
      `  • Contents = Read       (lets the workflow cross-reference code-repo files in the issue body)\n\n` +
      `Account permissions:\n` +
      `  • Models   = Read       (archeologist.yml routes LLM calls through GitHub Models — using your Copilot tier instead of the free-tier 8K cap)\n\n` +
      `(The token cannot modify code, cannot trigger workflows, cannot read non-listed surfaces.)\n\n` +
      `Expiration: pick what fits your rotation policy.\n\n` +
      `Mesh repo for reference:  ${meshLabel}\n\n` +
      `When ready, click Continue to paste the token.`;
    const continueAction = 'Continue';
    void vscode.window.showInformationMessage(instructions, { modal: true }, continueAction);

    // (3) Prompt for the token via showInputBox (password=true). We don't
    //     gate on the modal's resolution — both can be open simultaneously
    //     and the user picks whichever they reach first.
    const token = await vscode.window.showInputBox({
      title: `Paste ${def.label}`,
      prompt: 'After clicking Generate token on GitHub, paste the value here. Will be saved + pushed to the mesh repo automatically.',
      placeHolder: 'github_pat_…',
      password: true,
      ignoreFocusOut: true,
      validateInput: (input) => {
        if (!input.trim()) { return 'Value is required.'; }
        if (!/^(github_pat_|ghp_|gho_|ghu_|ghs_|ghr_)/.test(input)) {
          return 'Does not look like a GitHub token (expected prefix github_pat_ / ghp_ / etc.).';
        }
        return null;
      },
    });
    if (token === undefined) {
      void vscode.window.showWarningMessage(`${def.label}: cancelled — no token saved.`);
      return;
    }

    // (4) Save + auto-push to mesh.
    await this.onSaveResearchSecret(id, token);
    await this.onPushResearchSecret(id);
  }

  /** Walk every BAR's app.yaml repos and return deduped owner/repo slugs. */
  private collectLinkedCodeRepos(): string[] {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) { return []; }
    try {
      const reader = new MeshReader(meshPath);
      const slugs = new Set<string>();
      for (const bar of reader.listBars()) {
        for (const url of bar.repos) {
          const parsed = parseGitHubUrl(url);
          if (parsed) { slugs.add(`${parsed.owner}/${parsed.repo}`); }
        }
      }
      return [...slugs];
    } catch {
      return [];
    }
  }

  /**
   * Webview-initiated "Set value" flow. Opens a native VS Code
   * showInputBox (with password=true so the value is masked), then
   * persists the result via onSaveResearchSecret. Replaces an earlier
   * window.prompt() call inside the webview that silently no-op'd on
   * some VS Code builds.
   */
  private async onPromptResearchSecret(id: ResearchSecretId) {
    const def = SECRETS.find(s => s.id === id);
    if (!def) {
      this.postMessage({ type: 'error', message: `Unknown research secret: ${id}` });
      return;
    }
    const value = await vscode.window.showInputBox({
      title: `Set ${def.label}`,
      prompt: `Stored as VS Code setting ${def.settingKey}. Use the per-row Push button to copy it to GitHub Actions secrets.`,
      placeHolder: def.prefix ? `${def.prefix}…` : def.envName,
      password: true,
      ignoreFocusOut: true,
      validateInput: (input) => {
        if (!input.trim()) { return 'Value is required.'; }
        if (def.prefix && !input.startsWith(def.prefix)) {
          return `${def.label} should start with "${def.prefix}".`;
        }
        return null;
      },
    });
    if (value === undefined) { return; }    // user cancelled
    await this.onSaveResearchSecret(id, value);
  }

  private async onSaveResearchSecret(id: ResearchSecretId, value: string) {
    const def = SECRETS.find(s => s.id === id);
    if (!def || !def.settingKey) {
      this.postMessage({ type: 'error', message: `Unknown research secret: ${id}` });
      return;
    }
    if (def.prefix && value && !value.startsWith(def.prefix)) {
      this.postMessage({ type: 'error', message: `${def.label} should start with "${def.prefix}".` });
      return;
    }
    try {
      const config = vscode.workspace.getConfiguration();
      await config.update(def.settingKey, value, vscode.ConfigurationTarget.Global);
      this.postMessage({ type: 'researchSecretSaved', id, hasValue: value.trim().length > 0 });
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to save ${def.label}: ${toErrorMessage(err)}` });
    }
  }

  private async onTestResearchSecret(id: ResearchSecretId) {
    const def = SECRETS.find(s => s.id === id);
    if (!def || !def.settingKey) {
      this.postMessage({ type: 'researchTestResult', id, ok: false, message: `Unknown secret: ${id}` });
      return;
    }
    const config = vscode.workspace.getConfiguration();
    const key = config.get<string>(def.settingKey, '');
    if (!key) {
      const msg = 'No key configured in VS Code settings.';
      this.postMessage({ type: 'researchTestResult', id, ok: false, message: msg });
      void vscode.window.showWarningMessage(`${def.label}: ${msg}`);
      return;
    }
    const result = await testResearchKey(id, key);
    this.postMessage({ type: 'researchTestResult', id, ok: result.ok, message: result.message });
    // Also surface as a native VS Code toast so the user can't miss the
    // result (the inline pill in the panel auto-dismisses after 6s and the
    // longer messages — e.g. USPTO's "no live test, pipeline degrades
    // gracefully" — wrap awkwardly in the narrow status column).
    const fullMsg = `${def.label}: ${result.message}`;
    if (result.ok) {
      void vscode.window.showInformationMessage(fullMsg);
    } else {
      void vscode.window.showWarningMessage(fullMsg);
    }
  }

  private async onPushResearchSecret(id: ResearchSecretId) {
    const def = SECRETS.find(s => s.id === id);
    if (!def || !def.settingKey) {
      this.postMessage({ type: 'researchSecretPushed', id, ok: false, message: `Unknown secret: ${id}` });
      return;
    }
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({
        type: 'researchSecretPushed', id, ok: false,
        message: 'No mesh GitHub repo detected. Configure a mesh path with a GitHub remote first.',
      });
      return;
    }
    const config = vscode.workspace.getConfiguration();
    const key = config.get<string>(def.settingKey, '');
    if (!key) {
      this.postMessage({
        type: 'researchSecretPushed', id, ok: false,
        message: 'No key in VS Code settings to push. Set the value first.',
      });
      return;
    }
    try {
      await githubService.setRepoSecret(meshRepo.owner, meshRepo.repo, def.envName, key);
      this.postMessage({
        type: 'researchSecretPushed', id, ok: true,
        message: `Pushed ${def.envName} to ${meshRepo.owner}/${meshRepo.repo}.`,
      });
    } catch (err) {
      this.postMessage({
        type: 'researchSecretPushed', id, ok: false,
        message: `Failed to push ${def.envName}: ${toErrorMessage(err)}`,
      });
    }
  }

  /**
   * Push a secret to the mesh repo AND every linked code repo found in
   * the union of every BAR's `app.yaml application.repos[]`. Single
   * source of truth (the local VS Code value) → fan-out to all
   * workflows that need it. Used for ANTHROPIC + OPENAI — both
   * consumed by alice-remediation.yml on each code repo. (GMT is
   * mesh-only now — see the Create flow above.)
   *
   * Returns a per-destination outcome so the UI can show a table
   * (mesh OK / code-repo-1 OK / code-repo-2 failed: 403 / …).
   */
  private async onPushResearchSecretToAll(id: ResearchSecretId) {
    const def = SECRETS.find(s => s.id === id);
    if (!def || !def.settingKey) {
      this.postMessage({ type: 'researchSecretPushedAll', id, results: [], message: `Unknown secret: ${id}` });
      return;
    }
    if (def.scope !== 'mesh+code') {
      this.postMessage({
        type: 'researchSecretPushedAll', id, results: [],
        message: `${def.envName} is a mesh-only secret; use the regular Push button.`,
      });
      return;
    }
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({
        type: 'researchSecretPushedAll', id, results: [],
        message: 'No mesh GitHub repo detected. Configure a mesh path with a GitHub remote first.',
      });
      return;
    }
    const config = vscode.workspace.getConfiguration();
    const key = config.get<string>(def.settingKey, '');
    if (!key) {
      this.postMessage({
        type: 'researchSecretPushedAll', id, results: [],
        message: 'No key in VS Code settings to push. Set the value first.',
      });
      return;
    }

    // Collect every linked code repo across every BAR's app.yaml.
    const meshPath = MeshService.getMeshPath();
    const codeRepos = new Set<string>();
    if (meshPath) {
      try {
        const reader = new MeshReader(meshPath);
        for (const bar of reader.listBars()) {
          for (const url of bar.repos) {
            const slug = parseGitHubUrl(url);
            if (slug) { codeRepos.add(`${slug.owner}/${slug.repo}`); }
          }
        }
      } catch { /* mesh empty / mid-init — fall through with just mesh push */ }
    }

    const destinations = [`${meshRepo.owner}/${meshRepo.repo}`, ...codeRepos];
    const results: Array<{ repo: string; ok: boolean; message: string }> = [];
    for (const slug of destinations) {
      const [owner, repo] = slug.split('/');
      try {
        await githubService.setRepoSecret(owner, repo, def.envName, key);
        results.push({ repo: slug, ok: true, message: 'pushed' });
      } catch (err) {
        results.push({ repo: slug, ok: false, message: toErrorMessage(err) });
      }
    }
    const okCount = results.filter(r => r.ok).length;
    this.postMessage({
      type: 'researchSecretPushedAll', id, results,
      message: `Pushed ${def.envName} to ${okCount}/${results.length} destination(s).`,
    });
  }

  private async onSaveResearchPrefs(prefs: ResearchPrefs) {
    try {
      const config = vscode.workspace.getConfiguration();
      const target = vscode.ConfigurationTarget.Global;
      await Promise.all([
        config.update('maintainabilityai.research.llmProvider', prefs.llmProvider, target),
        config.update('maintainabilityai.research.guardrails', prefs.guardrails, target),
        config.update('maintainabilityai.research.grounding', prefs.grounding, target),
        config.update('maintainabilityai.research.groundingThreshold', prefs.groundingThreshold, target),
        config.update('maintainabilityai.research.maxIterations', prefs.maxIterations, target),
        config.update('maintainabilityai.research.costCapTokens', prefs.costCapTokens, target),
      ]);
      this.postMessage({ type: 'researchPrefsSaved' });
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to save research preferences: ${toErrorMessage(err)}` });
    }
  }

  // --------------------------------------------------------------------------
  // Red Queen — Orchestration + Platform Governance Editors
  // --------------------------------------------------------------------------

  private onLoadOrchestrationPolicy() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'orchestrationPolicyLoaded', policy: null });
      return;
    }
    try {
      const content = fs.readFileSync(path.join(meshPath, 'mesh.yaml'), 'utf8');
      const scalar = (key: string): string | null => {
        const m = content.match(new RegExp(`${key}:\\s*(.+)$`, 'm'));
        return m ? m[1].trim() : null;
      };
      const num = (key: string, fallback: number): number => {
        const v = scalar(key);
        return v !== null && !isNaN(Number(v)) ? Number(v) : fallback;
      };
      // Find the first min_score (autonomous), second (supervised)
      const minScores = [...content.matchAll(/min_score:\s*(\d+)/g)].map(m => Number(m[1]));
      const secThreshold = [...content.matchAll(/threshold:\s*(\d+)/g)];
      this.postMessage({
        type: 'orchestrationPolicyLoaded',
        policy: {
          autoMinScore: minScores[0] ?? 80,
          supMinScore: minScores[1] ?? 50,
          securityThreshold: secThreshold[0] ? Number(secThreshold[0][1]) : 60,
          archThreshold: secThreshold[1] ? Number(secThreshold[1][1]) : 70,
          escScoreDrop: num('score_drop_threshold', 10),
          escConsecutive: num('consecutive_failures', 3),
          escTarget: scalar('escalation_target') || 'architecture-review-board',
        },
      });
    } catch {
      this.postMessage({ type: 'orchestrationPolicyLoaded', policy: null });
    }
  }

  private onSaveOrchestrationPolicy(policy: {
    autoMinScore: number; supMinScore: number;
    securityThreshold: number; archThreshold: number;
    escScoreDrop: number; escConsecutive: number; escTarget: string;
  }) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const meshYaml = path.join(meshPath, 'mesh.yaml');
    try {
      let content = fs.readFileSync(meshYaml, 'utf8');

      // Replace min_score values in order (autonomous first, then supervised)
      let minScoreIdx = 0;
      const targets = [policy.autoMinScore, policy.supMinScore];
      content = content.replace(/min_score:\s*\d+/g, (match) => {
        if (minScoreIdx < targets.length) {
          return `min_score: ${targets[minScoreIdx++]}`;
        }
        return match;
      });

      // Replace thresholds in order (security first, then architecture)
      let threshIdx = 0;
      const threshTargets = [policy.securityThreshold, policy.archThreshold];
      content = content.replace(/threshold:\s*\d+/g, (match) => {
        if (threshIdx < threshTargets.length) {
          return `threshold: ${threshTargets[threshIdx++]}`;
        }
        return match;
      });

      // Replace escalation values
      content = content.replace(/score_drop_threshold:\s*\d+/, `score_drop_threshold: ${policy.escScoreDrop}`);
      content = content.replace(/consecutive_failures:\s*\d+/, `consecutive_failures: ${policy.escConsecutive}`);
      content = content.replace(/escalation_target:\s*.+$/, `escalation_target: ${policy.escTarget}`);

      fs.writeFileSync(meshYaml, content, 'utf8');
      this.postMessage({ type: 'orchestrationPolicySaved' });
      this.postMessage({ type: 'info', message: 'Orchestration policy saved to mesh.yaml.' });
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to save policy: ${toErrorMessage(err)}` });
    }
  }

  private onLoadAgentType() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'agentTypeLoaded', agentType: 'claude' });
      return;
    }
    try {
      const content = fs.readFileSync(path.join(meshPath, 'mesh.yaml'), 'utf8');
      const m = content.match(/agent_type:\s*(claude|copilot|both)/m);
      this.postMessage({ type: 'agentTypeLoaded', agentType: (m?.[1] as 'claude' | 'copilot' | 'both') || 'claude' });
    } catch {
      this.postMessage({ type: 'agentTypeLoaded', agentType: 'claude' });
    }
  }

  private onSaveAgentType(agentType: 'claude' | 'copilot' | 'both') {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const meshYaml = path.join(meshPath, 'mesh.yaml');
    try {
      let content = fs.readFileSync(meshYaml, 'utf8');
      if (/agent_type:\s*(claude|copilot|both)/m.test(content)) {
        content = content.replace(/agent_type:\s*(claude|copilot|both)/m, `agent_type: ${agentType}`);
      } else {
        // Insert agent_type inside the portfolio: block (after description: line or last portfolio field)
        const portfolioInsertPoint = content.match(/^(\s+description:.*$)/m);
        if (portfolioInsertPoint) {
          content = content.replace(portfolioInsertPoint[0], `${portfolioInsertPoint[0]}\n  agent_type: ${agentType}`);
        } else {
          // Fallback: insert after portfolio: line
          const portfolioLine = content.match(/^portfolio:\s*$/m);
          if (portfolioLine) {
            content = content.replace(portfolioLine[0], `${portfolioLine[0]}\n  agent_type: ${agentType}`);
          } else {
            content = content.trimEnd() + `\nagent_type: ${agentType}\n`;
          }
        }
      }

      // Also ensure repo: field exists in mesh.yaml (needed for GitHub Actions workflows)
      if (!/^\s*repo:\s/m.test(content)) {
        try {
          const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: meshPath, encoding: 'utf8' }).toString().trim();
          const parsed = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
          if (parsed) {
            const repoName = parsed[2];
            // Insert repo: inside portfolio block (after org: line)
            const orgLine = content.match(/^(\s+org:.*$)/m);
            if (orgLine) {
              content = content.replace(orgLine[0], `${orgLine[0]}\n  repo: "${repoName}"`);
            }
          }
        } catch { /* git not available — user will add repo manually */ }
      }

      fs.writeFileSync(meshYaml, content, 'utf8');
      this.postMessage({ type: 'agentTypeSaved' });
      const label = agentType === 'claude' ? 'Claude Code Action' : agentType === 'copilot' ? 'Copilot Coding Agent' : 'Both (Claude + Copilot)';
      this.postMessage({ type: 'info', message: `Agent framework set to ${label}.` });
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to save agent type: ${toErrorMessage(err)}` });
    }
  }

  private onLoadPlatformGovernance(platformId: string) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'platformGovernanceLoaded', platformId, governance: null });
      return;
    }
    try {
      // Resolve platform directory from mesh.yaml config
      const platformDir = this.resolvePlatformPath(platformId);
      if (!platformDir) {
        this.postMessage({ type: 'platformGovernanceLoaded', platformId, governance: null });
        return;
      }
      const platformYaml = path.join(platformDir, 'platform.yaml');
      if (!fs.existsSync(platformYaml)) {
        this.postMessage({ type: 'platformGovernanceLoaded', platformId, governance: null });
        return;
      }
      const content = fs.readFileSync(platformYaml, 'utf8');
      const num = (key: string): number | undefined => {
        const m = content.match(new RegExp(`${key}:\\s*(\\d+)`, 'm'));
        return m ? Number(m[1]) : undefined;
      };
      const scalar = (key: string): string => {
        const m = content.match(new RegExp(`${key}:\\s*(.+)$`, 'm'));
        return m ? m[1].trim() : '';
      };

      const minimumScores: Record<string, number> = {};
      const arch = num('architecture');
      const sec = num('security');
      const ops = num('operations');
      if (arch !== undefined) { minimumScores.architecture = arch; }
      if (sec !== undefined) { minimumScores.security = sec; }
      if (ops !== undefined) { minimumScores.operations = ops; }

      this.postMessage({
        type: 'platformGovernanceLoaded',
        platformId,
        governance: {
          minimumScores,
          minTier: scalar('minTier'),
          enforcementMode: scalar('enforcementMode') || 'advisory',
        },
      });
    } catch {
      this.postMessage({ type: 'platformGovernanceLoaded', platformId, governance: null });
    }
  }

  private onSavePlatformGovernance(
    platformId: string,
    governance: { minimumScores: Record<string, number>; minTier: string; enforcementMode: string },
  ) {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    try {
      const platformDir = this.resolvePlatformPath(platformId);
      if (!platformDir) {
        this.postMessage({ type: 'error', message: `Platform not found: ${platformId}` });
        return;
      }
      const platformYaml = path.join(platformDir, 'platform.yaml');
      let content = fs.existsSync(platformYaml) ? fs.readFileSync(platformYaml, 'utf8') : '';

      // Build governance block
      const govLines = [
        'governance:',
        '  minimumScores:',
      ];
      for (const [pillar, score] of Object.entries(governance.minimumScores)) {
        govLines.push(`    ${pillar}: ${score}`);
      }
      if (governance.minTier || governance.enforcementMode) {
        govLines.push('  orchestrationOverrides:');
        if (governance.enforcementMode) {
          govLines.push(`    enforcementMode: ${governance.enforcementMode}`);
        }
        if (governance.minTier) {
          govLines.push(`    minTier: ${governance.minTier}`);
        }
      }
      const govBlock = govLines.join('\n');

      // Replace existing governance block or append
      const govRegex = /governance:\s*\n(?:\s+\S.*\n?)*/;
      if (govRegex.test(content)) {
        content = content.replace(govRegex, govBlock + '\n');
      } else {
        content = content.trimEnd() + '\n\n' + govBlock + '\n';
      }

      fs.writeFileSync(platformYaml, content, 'utf8');
      this.postMessage({ type: 'platformGovernanceSaved', platformId });
      this.postMessage({ type: 'info', message: `Platform governance saved for ${platformId}.` });
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to save governance: ${toErrorMessage(err)}` });
    }
  }

  // --------------------------------------------------------------------------
  // Absolem — Multi-Turn CALM Refinement Agent
  // --------------------------------------------------------------------------

  private buildAbsolemChunkCallback(barPath: string): (chunk: string, done: boolean) => void {
    return (chunk: string, done: boolean) => {
      this.postMessage({ type: 'absolemChunk', barPath, chunk, done });

      if (done) {
        const conv = this.absolemService.getConversation(barPath);
        if (conv) {
          const msgs = conv.messages;
          const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
          if (lastAssistant) {
            const result = this.absolemService.extractPatches(lastAssistant.content);
            if (result) {
              this.postMessage({
                type: 'absolemPatches',
                barPath,
                patches: result.patches,
                description: result.description,
              });
            }
          }
        }
      }
    };
  }

  private async onAbsolemStart(barPath: string, command: AbsolemCommand): Promise<void> {
    // Read CALM data (repo-to-calm can work without existing architecture)
    const calmData = readCalmArchitectureData(barPath);
    if (!calmData && command !== 'repo-to-calm') {
      this.postMessage({ type: 'absolemError', barPath, message: 'No CALM architecture data found (bar.arch.json).' });
      return;
    }

    // Read latest review report (for drift-analysis)
    let reviewReport: string | null = null;
    if (command === 'drift-analysis') {
      const reviews = this.barService.readReviews(barPath);
      if (reviews && reviews.length > 0) {
        const latest = reviews[reviews.length - 1];
        const reportPath = path.join(barPath, 'reports', `review-${latest.issueNumber}.md`);
        if (fs.existsSync(reportPath)) {
          try { reviewReport = fs.readFileSync(reportPath, 'utf8'); } catch { /* best effort */ }
        }
      }
      if (!reviewReport) {
        this.postMessage({ type: 'absolemError', barPath, message: 'No review reports found. Run an Oraculum review first, then try drift analysis.' });
        return;
      }
    }

    // Run validation (for validate command)
    let validationErrors: import('../services/CalmValidator').CalmValidationError[] | null = null;
    if (command === 'validate') {
      validationErrors = validateCalm(calmData as Record<string, unknown>);
    }

    // Gap analysis — enrich review context with all pillar artifacts
    if (command === 'gap-analysis') {
      const scorer = new GovernanceScorer();
      const scores = scorer.scoreAllPillars(barPath);
      const adrs = this.barService.listAdrs(barPath);
      const lines: string[] = ['## Governance Artifact Status\n'];
      for (const [pillarKey, pillar] of Object.entries(scores)) {
        if (pillarKey === 'compositeScore') { continue; }
        const p = pillar as { score: number; artifacts: { label: string; present: boolean; nonEmpty: boolean }[] };
        lines.push(`### ${pillarKey} (${p.score}%)`);
        for (const a of p.artifacts) {
          const status = a.present ? (a.nonEmpty ? 'present' : 'empty') : 'MISSING';
          lines.push(`- ${a.label}: ${status}`);
        }
      }
      if (adrs.length > 0) {
        lines.push('\n### ADRs');
        for (const adr of adrs) {
          lines.push(`- ${adr.id} [${adr.status}]: ${adr.title}`);
        }
      }
      reviewReport = lines.join('\n');
    }

    // ADR suggestion — inject existing ADRs as context
    if (command === 'suggest-adr') {
      const adrs = this.barService.listAdrs(barPath);
      const lines: string[] = ['## Existing ADRs\n'];
      if (adrs.length === 0) {
        lines.push('No ADRs documented yet.');
      } else {
        for (const adr of adrs) {
          lines.push(`### ${adr.id} [${adr.status}]: ${adr.title}`);
          lines.push(`Context: ${adr.context?.substring(0, 200) || '(none)'}`);
          lines.push(`Decision: ${adr.decision?.substring(0, 200) || '(none)'}\n`);
        }
      }
      reviewReport = lines.join('\n');
    }

    try {
      await this.absolemService.startConversation(
        barPath, command, calmData || { nodes: [], relationships: [] }, reviewReport, validationErrors,
        this.buildAbsolemChunkCallback(barPath),
      );
    } catch (err) {
      this.postMessage({
        type: 'absolemError',
        barPath,
        message: `Failed to start Absolem: ${toErrorMessage(err)}`,
      });
    }
  }

  private async onAbsolemSend(barPath: string, userMessage: string): Promise<void> {
    try {
      await this.absolemService.sendMessage(
        barPath, userMessage,
        this.buildAbsolemChunkCallback(barPath),
      );
    } catch (err) {
      this.postMessage({
        type: 'absolemError',
        barPath,
        message: `Absolem error: ${toErrorMessage(err)}`,
      });
    }
  }

  private onAbsolemAcceptPatches(barPath: string, patches: CalmPatch[]): void {
    try {
      const archFile = path.join(barPath, 'architecture', 'bar.arch.json');
      const contentHash = applyCalmPatch(archFile, patches);

      if (contentHash) {
        this.calmFileWatcher.markWritten(archFile, contentHash);

        const raw = fs.readFileSync(archFile, 'utf-8');
        const data = JSON.parse(raw);
        const errors = validateCalm(data);

        this.postMessage({ type: 'absolemPatchesApplied', barPath, validationErrors: errors });
        this.postMessage({ type: 'calmDataUpdated', calmData: data });
      }
    } catch (err) {
      this.postMessage({
        type: 'absolemError',
        barPath,
        message: `Failed to apply patches: ${toErrorMessage(err)}`,
      });
    }
  }

  private onAbsolemRejectPatches(barPath: string): void {
    const conv = this.absolemService.getConversation(barPath);
    if (conv) {
      // Conversation continues — patches just aren't applied
    }
  }

  private onAbsolemClose(barPath: string): void {
    this.absolemService.clearConversation(barPath);
  }

  private async onAbsolemImageStart(barPath: string, imageBase64: string, mimeType: string): Promise<void> {
    try {
      // Convert base64 to Uint8Array
      const binaryString = Buffer.from(imageBase64, 'base64');
      const imageData = new Uint8Array(binaryString);

      await this.absolemService.startImageConversation(
        barPath, imageData, mimeType,
        this.buildAbsolemChunkCallback(barPath),
      );
    } catch (err) {
      this.postMessage({
        type: 'absolemError',
        barPath,
        message: `Image analysis failed: ${toErrorMessage(err)}`,
      });
    }
  }

  private onAbsolemPreviewJson(json: string): void {
    vscode.workspace.openTextDocument({ content: json, language: 'json' }).then(doc => {
      vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside, preview: true });
    });
  }

  private async detectMeshRepo(meshPath: string): Promise<void> {
    const url = await getRemoteOriginUrl(meshPath);
    if (!url) { return; }
    const parsed = parseGitHubUrl(url);
    if (parsed) {
      this.meshRepoInfo = { owner: parsed.owner, repo: parsed.repo };
      this.postMessage({ type: 'meshRepoDetected', owner: parsed.owner, repo: parsed.repo });
    }
  }

  /**
   * Detect the GitHub org/owner the mesh repo is connected to, for use
   * as the default `githubOrg` when scaffolding sample BARs. Returns null
   * if the mesh isn't a git repo, has no GitHub remote, or the URL fails
   * to parse — callers fall back to the <org> placeholder.
   *
   * Sourced from `git remote get-url origin` on the mesh directory, the
   * same source `detectGovernanceRepo` and `detectMeshRepo` already use.
   */
  private async detectMeshOwner(meshPath: string): Promise<string | null> {
    if (this.meshRepoInfo?.owner) { return this.meshRepoInfo.owner; }
    try {
      const url = await getRemoteOriginUrl(meshPath);
      if (!url) { return null; }
      return parseGitHubUrl(url)?.owner ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Phase B/C — provision the canonical OKR label catalog in the mesh
   * repo (idempotent via `gh label create --force`). Required because
   * `gh issue create --label X,Y` REFUSES to add labels that don't
   * exist; the user otherwise sees the cryptic
   * `could not add label: 'okr-anchor' not found` error and the
   * issue never gets created.
   *
   * Wired into:
   *   - `onProvisionWorkflow` — runs alongside the workflow redeploy.
   *   - `onConfirmStartOkrPhase` self-heal — if the gh issue create
   *     command fails with "could not add label", we call this and
   *     retry once.
   *
   * Returns counts so the caller can surface a "N/M labels created"
   * summary. Individual label failures are non-fatal — we log to
   * stderr (visible in the extension dev tools) and proceed.
   */
  private async provisionMeshLabels(meshPath: string): Promise<{ created: number; updated: number; unchanged: number; failed: number; failures: string[] }> {
    // Resolve mesh owner/repo. Prefer the cached meshRepoInfo populated
    // by detectMeshRepo on panel open; fall back to a fresh git-remote
    // parse if missing (cold-start invocation from Start Why self-heal).
    let repo = this.meshRepoInfo;
    if (!repo) {
      const url = await getRemoteOriginUrl(meshPath);
      const parsed = url ? parseGitHubUrl(url) : null;
      if (parsed) { repo = { owner: parsed.owner, repo: parsed.repo }; }
    }
    if (!repo) {
      return { created: 0, updated: 0, unchanged: 0, failed: MESH_LABELS.length, failures: ['Cannot resolve mesh repo from git remote — is the mesh on GitHub?'] };
    }
    let created = 0, updated = 0, unchanged = 0, failed = 0;
    const failures: string[] = [];
    for (const label of MESH_LABELS) {
      try {
        const outcome = await this.githubService.createOrUpdateLabel(repo.owner, repo.repo, label);
        if (outcome === 'created')   { created += 1; }
        else if (outcome === 'updated') { updated += 1; }
        else                          { unchanged += 1; }
      } catch (err) {
        failed += 1;
        failures.push(`${label.name}: ${toErrorMessage(err)}`);
      }
    }
    return { created, updated, unchanged, failed, failures };
  }

  private async onCheckWorkflowStatus() {
    if (!this.meshRepoInfo) {
      this.postMessage({ type: 'workflowStatus', exists: false });
      return;
    }
    try {
      const MESH_WORKFLOW_PATHS = [
        '.github/workflows/oraculum-review.yml',
        '.github/workflows/oraculum-research.yml',
        '.github/workflows/archeologist.yml',
        '.github/workflows/prd.yml',
        '.github/workflows/label-on-merge.yml',
        '.github/workflows/notify-code-repos.yml',
      ];
      const results = await Promise.all(
        MESH_WORKFLOW_PATHS.map(p =>
          this.githubService.checkWorkflowExists(this.meshRepoInfo!.owner, this.meshRepoInfo!.repo, p)
        )
      );
      this.postMessage({ type: 'workflowStatus', exists: results.every(Boolean) });
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

      // Force overwrite — the user's intent in clicking Redeploy is to pick
      // up the extension's current prompt versions even if files already
      // exist in the mesh. The default (force=false) silently skipped
      // existing prompts, which caused V3/V2 prompt updates to never reach
      // the mesh repo and the runner to keep using the original versions.
      promptPackService.seedMeshPrompts(meshPath, true);
      const written = this.meshService.writeMeshWorkflows(meshPath, this.context.extensionPath);
      // Provision the canonical OKR label catalog idempotently via
      // GitHubService — labels-on-create REQUIRE the label to exist,
      // so Start Why / How / What would otherwise fail with
      // "could not add label" on a fresh mesh. Non-fatal on partial
      // failure (permission issues etc.) — surfaced in the toast.
      const labelResult = await this.provisionMeshLabels(meshPath);
      const touched = labelResult.created + labelResult.updated;

      await execFileAsync('git', ['add', '-A'], { cwd: meshPath });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: meshPath });
      const changedFiles = diffCheck.trim().split('\n').filter(Boolean);
      let toastMessage: string;
      if (changedFiles.length > 0) {
        const commitMsg = `chore: redeploy mesh workflows + caterpillar prompts\n\n${written.map(w => `- ${w}`).join('\n')}\n\nGenerated by MaintainabilityAI VS Code Extension`;
        await execFileAsync('git', ['commit', '-m', commitMsg], { cwd: meshPath });
        await execFileAsync('git', ['push'], { cwd: meshPath, timeout: 60_000 });
        toastMessage = `Redeployed ${written.length} workflow file(s) and ${changedFiles.length - written.length >= 0 ? changedFiles.length - written.length : 0} prompt file(s); labels: ${labelResult.created} created, ${labelResult.updated} updated, ${labelResult.unchanged} unchanged${labelResult.failed > 0 ? `, ${labelResult.failed} failed` : ''}.`;
      } else {
        toastMessage = `Workflows already up-to-date${touched > 0 ? ` (${touched} label(s) ${labelResult.created > 0 ? 'created' : 'updated'})` : ''} — nothing to commit.`;
      }

      this.postMessage({ type: 'workflowProvisioned' });
      this.postMessage({ type: 'workflowStatus', exists: true });
      // Surface explicit feedback — webview just bumps state silently,
      // which the user reported as "no feedback after clicking redeploy".
      void vscode.window.showInformationMessage(toastMessage);
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to provision workflow: ${toErrorMessage(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  /**
   * Phase B Mesh Provisioning — deploys the 18 PURE-data Skills + 4 Agents
   * into the mesh's `.github/skills/` + `.github/agents/` dirs, then commits
   * + pushes (mirroring `onProvisionWorkflow`'s git surface so the user sees
   * one consistent "redeploy" behavior).
   *
   * Idempotent at the service layer — `deploySkills` / `deployAgents` only
   * write files whose body changed. If everything is in sync the commit
   * step short-circuits with "nothing to commit."
   */
  private async onProvisionAgentic() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Deploying agents + skills…' });

    try {
      const gitRoot = this.gitSyncService.findGitRoot(meshPath);
      if (gitRoot) {
        const pullResult = await this.gitSyncService.pullFromRemote(gitRoot);
        if (!pullResult.success) {
          this.postMessage({ type: 'error', message: `Cannot provision: ${pullResult.message}` });
          return;
        }
      }

      const svc = new AgentDeploymentService(this.context.extensionPath);
      const skillsResult = svc.deploySkills(meshPath);
      const agentsResult = svc.deployAgents(meshPath);
      const warnings: string[] = [];
      for (const s of skillsResult.perSkill) {
        if (s.status === 'empty-template') {
          warnings.push(`Skill template missing for ${s.name} — re-install the extension?`);
        }
      }
      for (const a of agentsResult.perAgent) {
        if (a.status === 'empty-template') {
          warnings.push(`Agent template missing for ${a.name}.`);
        } else if (a.status === 'skill-missing') {
          warnings.push(`Agent ${a.name} declares missing skills: ${(a.missingSkills ?? []).join(', ')}`);
        }
      }

      await execFileAsync('git', ['add', '-A'], { cwd: meshPath });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: meshPath });
      const changedFiles = diffCheck.trim().split('\n').filter(Boolean);
      let toastMessage: string;
      if (changedFiles.length > 0) {
        const commitMsg = [
          'chore: deploy v4 agents + pure-data skills',
          '',
          `Skills written: ${skillsResult.written} (${skillsResult.unchanged} unchanged)`,
          `Agents written: ${agentsResult.written} (${agentsResult.unchanged} unchanged)`,
          '',
          'Generated by MaintainabilityAI VS Code Extension',
        ].join('\n');
        await execFileAsync('git', ['commit', '-m', commitMsg], { cwd: meshPath });
        await execFileAsync('git', ['push'], { cwd: meshPath, timeout: 60_000 });
        toastMessage = `Deployed ${skillsResult.written} skill + ${agentsResult.written} agent file(s); ${changedFiles.length} total file change(s).`;
      } else {
        toastMessage = 'Agents + skills already up-to-date — nothing to commit.';
      }

      this.postMessage({
        type: 'agenticProvisioned',
        skillsWritten: skillsResult.written,
        skillsUnchanged: skillsResult.unchanged,
        agentsWritten: agentsResult.written,
        agentsUnchanged: agentsResult.unchanged,
        warnings,
      });
      this.onCheckAgenticStatus();
      void vscode.window.showInformationMessage(toastMessage + (warnings.length ? ` (${warnings.length} warning${warnings.length === 1 ? '' : 's'})` : ''));
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Failed to deploy agents + skills: ${toErrorMessage(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  /**
   * Report which skills + agents are on disk in the mesh for the Settings
   * panel's "deployed: N/18" + "deployed: N/4" badges.
   */
  private onCheckAgenticStatus(): void {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'agenticStatus', skills: [], agents: [] });
      return;
    }
    const svc = new AgentDeploymentService(this.context.extensionPath);
    this.postMessage({
      type: 'agenticStatus',
      skills: svc.listDeployedSkills(meshPath),
      agents: svc.listDeployedAgents(meshPath),
    });
  }

  private async onRefreshPromptPacks() {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    this.postMessage({ type: 'loading', active: true, message: 'Refreshing prompt packs...' });
    try {
      const gitRoot = this.gitSyncService.findGitRoot(meshPath) ?? meshPath;

      // Pull first — archeologist runs auto-commit + push audit logs, so the
      // local mesh can be behind origin/main when the user clicks Refresh.
      // Skipping this caused non-fast-forward push errors and a diverged
      // local branch.
      const pullResult = await this.gitSyncService.pullFromRemote(gitRoot);
      if (!pullResult.success) {
        this.postMessage({ type: 'error', message: `Cannot refresh prompts: ${pullResult.message}` });
        return;
      }

      // Force overwrite so existing files get the new versions (no silent skip).
      promptPackService.seedMeshPrompts(meshPath, true);

      await execFileAsync('git', ['add', '.caterpillar/prompts/'], { cwd: gitRoot });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: gitRoot });
      const changed = diffCheck.trim().split('\n').filter(Boolean);
      let toast: string;
      if (changed.length > 0) {
        await execFileAsync('git', ['commit', '-m', `chore: refresh caterpillar prompt packs\n\nUpdated ${changed.length} prompt file(s).\n\nGenerated by MaintainabilityAI VS Code Extension`], { cwd: gitRoot });
        // Rebase-retry on push — handles the race where a workflow commit
        // lands between our pull and our push (rare but possible).
        let pushed = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await execFileAsync('git', ['push'], { cwd: gitRoot, timeout: 60_000 });
            pushed = true;
            break;
          } catch {
            if (attempt === 3) { throw new Error('git push failed after 3 attempts'); }
            await execFileAsync('git', ['pull', '--rebase'], { cwd: gitRoot, timeout: 30_000 });
          }
        }
        toast = pushed
          ? `Refreshed ${changed.length} prompt file(s) and pushed to the mesh repo.`
          : `Refreshed ${changed.length} prompt file(s) but push failed — check git status manually.`;
      } else {
        toast = `Prompt packs already up-to-date — nothing to commit.`;
      }
      void vscode.window.showInformationMessage(toast);

      // Refresh git status so sync banner picks up any changes
      const summary = this.meshService.buildPortfolioSummary(meshPath);
      if (summary) {
        await this.sendGitStatus(meshPath, summary.allBars);
      }
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to refresh prompt packs: ${toErrorMessage(err)}` });
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
      this.postMessage({ type: 'error', message: `Failed to save model preference: ${toErrorMessage(err)}` });
    }
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

      // Re-seed prompts + workflows so the .caterpillar/ and .github/workflows/
      // surface is restored to the bundled version after a wipe.
      promptPackService.seedMeshPrompts(meshPath, true);
      this.meshService.writeMeshWorkflows(meshPath, this.context.extensionPath);

      // Git add + commit + push
      await execFileAsync('git', ['add', '-A'], { cwd: meshPath });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: meshPath });
      if (diffCheck.trim()) {
        await execFileAsync('git', ['commit', '-m', 'chore: reinitialize governance mesh + redeploy workflows\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: meshPath });
        await execFileAsync('git', ['push'], { cwd: meshPath, timeout: 60_000 });
      }

      this.postMessage({ type: 'meshReinitialized' });
      await this.loadPortfolio();
    } catch (err) {
      this.postMessage({
        type: 'error',
        message: `Reinitialize failed: ${toErrorMessage(err)}`,
      });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  protected getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
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

  protected onDispose(): void {
    this.stopActiveReviewPolling();
    this.calmFileWatcher.stop();
  }

  protected clearCurrentPanel(): void {
    LookingGlassPanel.currentPanel = undefined;
  }
}

/**
 * Best-effort lookup of the user's git config user.name to pre-fill the
 * Owner field on the Create OKR flow. Returns null on any failure — the
 * caller treats null as "no default" and leaves the input empty.
 */
function readGitUserName(): string | null {
  try {
    const out = execFileSync('git', ['config', '--get', 'user.name'], {
      encoding: 'utf8',
      timeout: 1500,
    }).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Compose a blank-but-schema-valid OkrCard shape for the create form to
 * render against. The card never touches disk — it's the seed the webview
 * renders so all the form fields exist. Persistence happens on Save via
 * OKRService.create (which generates the real id + intentThreadUuid +
 * lifecycle timestamps).
 */
function buildBlankOkrScaffold(defaultPlatformId: string, defaultOwner: string): OkrCard {
  const now = new Date().toISOString();
  // Use a placeholder UUID + id; OKRService.create will overwrite both on save.
  return {
    meta: {
      card: 'BTABoKItem',
      id: 'OKR-DRAFT',
      owner: defaultOwner,
      status: 'draft',
      paused: false,
      createdAt: now,
      updatedAt: now,
      intentThreadUuid: '00000000-0000-4000-8000-000000000000',
    },
    overview: { name: 'OKR Card', description: '' },
    howToUse: { name: 'How to use this card', description: '' },
    objective: { name: '', description: '' },
    keyResults: [
      { id: 'KR-1', metric: '', target: '', measurement: '' },
    ],
    actions: [],
    keyResultRetrospective: { name: 'Key Result Retrospective', description: '', results: [] },
    objectiveAlignment: {
      name: 'Objective Alignment',
      description: '',
      platformId: defaultPlatformId,
      affectedBarIds: [],
      targetCodeRepos: [],
      intentCascade: { org: '', role: '', developer: '', user: '' },
    },
    valueLearning: { name: 'Value & Learning', description: '', learnings: [] },
    downloads: { name: 'Downloads', description: '', links: [] },
  };
}

/**
 * Render the canonical OKR phase-anchor issue body. The HTML-comment marker
 * for `okr_id` is the source-of-truth the agent extracts per §5.5.4 — never
 * parse human-readable text, the agent's `.agent.md` enforces this.
 *
 * Body shape is deliberately compact; the agent reads OKR state via
 * `knowledge-okr` not via the issue body. The visible markdown is for the
 * human watching the issue.
 */
function renderOkrPhaseIssueBody(card: OkrCard, phase: 'why' | 'how' | 'what', agent: string, runId: string): string {
  const phaseLabel = phase === 'why' ? 'Why · Market Research' : phase === 'how' ? 'How · PRD' : 'What · Code Design';
  const lines: string[] = [];
  lines.push(`<!-- okr_id: ${card.meta.id} -->`);
  lines.push(`<!-- phase: ${phase} -->`);
  lines.push(`<!-- intent_thread_uuid: ${card.meta.intentThreadUuid} -->`);
  lines.push(`<!-- run_id: ${runId} -->`);
  lines.push('');
  lines.push(`## ${phaseLabel}`);
  lines.push('');
  lines.push(`**Objective:** ${card.objective.name}`);
  if (card.objective.description) {
    lines.push('');
    lines.push(card.objective.description);
  }
  lines.push('');
  lines.push(`**Anchor OKR:** \`${card.meta.id}\``);
  lines.push(`**Platform:** \`${card.objectiveAlignment.platformId}\``);
  lines.push(`**Affected BARs:** ${card.objectiveAlignment.affectedBarIds.map(id => `\`${id}\``).join(', ')}`);
  lines.push('');
  lines.push(`This issue is auto-assigned to **@copilot-swe-agent[bot]** (Copilot Coding Agent) with a follow-up \`@copilot use agent ${agent}\` mention selecting the persona. Manual re-dispatch if needed: comment \`@copilot use agent ${agent}\`.`);
  lines.push('');
  lines.push('_Auto-generated by MaintainabilityAI Looking Glass — Phase B Start ' + phase.toUpperCase() + '._');
  return lines.join('\n');
}

/**
 * Format a ZodError into a one-line, user-readable hint. Strips the
 * deep object-path noise; we just want "objective.name: Required" not
 * the full issue tree.
 */
function formatZodErrors(err: { issues: { path: (string | number)[]; message: string }[] }): string {
  const top = err.issues.slice(0, 3).map(i => {
    const where = i.path.length > 0 ? i.path.join('.') : 'value';
    return `${where}: ${i.message}`;
  }).join('; ');
  return err.issues.length > 3 ? `${top} (+${err.issues.length - 3} more)` : top;
}
