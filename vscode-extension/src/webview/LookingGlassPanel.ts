import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawn as childSpawn } from 'child_process';
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
import { checkMeshBranchGuard, recoverMeshBranch, formatMeshBranchGuardMessage } from '../services/MeshBranchGuard';
import { CapabilityModelService } from '../services/CapabilityModelService';
import { generateMermaidDiagrams } from '../services/CalmTransformer';
import { readCalmArchitectureData, readLayoutFile, writeLayoutFile } from '../services/LayoutPersistenceService';
import { applyPatch as applyCalmPatch, type CalmPatch } from '../services/CalmWriteService';
import { CalmFileWatcher } from '../services/CalmFileWatcher';
import { validate as validateCalm } from '../services/CalmValidator';
import { AbsolemService } from '../services/AbsolemService';
import { AgentDeploymentService } from '../services/AgentDeploymentService';
import { codingAgentSettingsUrl, copilotEnvSecretsUrl, COPILOT_ENVIRONMENT_NAME } from '../templates/codingAgentRequirements';
import { HatterTagService } from '../services/HatterTagService';
import { MESH_LABELS } from '../templates/meshLabels';
import { MESH_WORKFLOWS } from '../templates/codeRepoTemplates';
import { generateArchetype, type ArchetypeId } from '../templates/mesh/archetypeTemplates';
import type { OkrCard, OkrCreateInput, OkrUpdatePatch } from '../types/okr';
import { OkrCreateInputSchema, OkrUpdatePatchSchema } from '../types/okr';
import { isForwardStatusTransition } from '../services/OKRService';
import { phaseSpec } from '../types/phaseSpec';
import { collectAuditFailureReasons, parseAuditCommentReason } from './auditFailureLabels';
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

// Structural-id counters + WHAT artifact signal extractor live in
// their own module so unit tests can exercise them without dragging
// in the VS Code runtime. See `regexCounters.ts` for the full rationale.
import { countUniqueIds, countUniqueSourceIds, extractWhatArtifactSignals, extractSelfReviewFromArtifact } from './regexCounters';
// Audit-chain verification (Bug W / Codex round-7) — UI-side mirror
// of the runner's allowlist + signature gate. Lives in chainVerify.ts
// so vitest tests run without the VS Code runtime + the constant
// has a single home synchronized with the runner.
import { detectKnightSeal, isEventLegitimate, verifyChainForUI } from './chainVerify';
import {
  buildAuditReportMarkdown,
  buildOkrRollupMarkdown,
  composeOkrRollupSourceTag,
  composeSourceTag,
  computeOkrRollupVerdict,
  countAgentEventStats,
  extractControlMapping,
  parseChain,
  parseRunnerVerdictFromStdout,
  summarizeSelfReview,
  type AuditReportInputSources,
  type OkrRollupInput,
  type PhaseRollupDigest,
  type RunnerVerifyVerdict,
} from '../services/AuditReportExporter';
import * as YAML from 'yaml';

// Knight's Seal v1 (B27) detector + WORKFLOW_EMITTABLE_KINDS
// allowlist live in chainVerify.ts (see import above). Lifted out
// of this file so vitest can exercise them without dragging in the
// VS Code runtime + so the constant has one definition synchronized
// with the runner's `audit-verify-chain` skill.

/**
 * WHAT-phase chain signal extraction (D-PR1.v1.1).
 *
 * Walks audit JSONL lines and surfaces the four counters the UI's
 * renderWhatMetrics needs: total mesh-skill calls, knowledge-code call
 * count (per A12.v1.1 brownfield + greenfield split), and the max
 * persona-switch round across both code-* personas. Returns a sparse
 * object with only the fields it could populate; `Object.assign(result,
 * ...)` in the caller merges them onto the signal record.
 *
 * Kept out of fetchPhaseSignal to keep that function under its
 * cyclomatic-complexity ratchet (the WHY/HOW/WHAT branches together
 * push past budget when inlined).
 */
interface WhatChainSignals {
  meshSkillCalls?: number;
  knowledgeCodeCalls?: number;
  brownfieldRepoCount?: number;
  greenfieldRepoCount?: number;
  selfReviewRounds?: number;
}
/**
 * Codex E3-gold-r4 (2026-05-25) — extract the set of distinct
 * signer_epoch values present in a chain. Used by Export Audit Report
 * to enumerate which `audit/keys/<runId>.epoch-N.pub.pem` files need
 * atomic verification against canonical GitHub bytes before the
 * runner verifier can be invoked.
 *
 * Tolerant of malformed lines (skipped — the chain shape verdict
 * surfaces them separately). Tolerant of events without signer_epoch
 * (workflow events legitimately omit it).
 */
function extractSignerEpochs(chainLines: string[]): Set<number> {
  const epochs = new Set<number>();
  for (const line of chainLines) {
    try {
      const ev = JSON.parse(line) as { signer_epoch?: unknown };
      if (typeof ev.signer_epoch === 'number' && Number.isInteger(ev.signer_epoch) && ev.signer_epoch > 0) {
        epochs.add(ev.signer_epoch);
      }
    } catch { /* malformed — shape verifier handles */ }
  }
  return epochs;
}

function extractWhatChainSignals(lines: string[]): WhatChainSignals {
  let mesh = 0;
  let knowledgeCode = 0;
  let brownfieldRepos = 0;
  let greenfieldRepos = 0;
  let codeReviewMaxRound = 0;
  for (const line of lines) {
    try {
      const event = JSON.parse(line) as {
        event_kind?: string;
        signature?: string;
        payload?: { skill?: string; ok?: boolean; mode?: string; round?: number; emitted_by?: string };
      };
      // Bug W (Codex round-7) — same legitimacy gate as fetchPhaseSignal.
      // skill_call is an agent-only kind (not in WORKFLOW_EMITTABLE_KINDS);
      // a forged unsigned skill_call with emitted_by:'workflow' would
      // otherwise inflate the meshSkillCalls / knowledgeCodeCalls counts.
      if (!isEventLegitimate(event)) { continue; }
      if (event.event_kind !== 'skill_call' || event.payload?.ok === false) { continue; }
      const skill = event.payload?.skill;
      if (!skill) { continue; }
      if (skill.startsWith('knowledge-') || skill.startsWith('context-')) { mesh++; }
      if (skill === 'knowledge-code') {
        knowledgeCode++;
        if (event.payload?.mode === 'brownfield') { brownfieldRepos++; }
        else if (event.payload?.mode === 'greenfield') { greenfieldRepos++; }
      }
      if ((skill === 'self-review-code-architect' || skill === 'self-review-code-security')
        && typeof event.payload?.round === 'number'
        && event.payload.round > codeReviewMaxRound) {
        codeReviewMaxRound = event.payload.round;
      }
    } catch { /* malformed line — skip */ }
  }
  const out: WhatChainSignals = {
    meshSkillCalls: mesh,
    knowledgeCodeCalls: knowledgeCode,
    brownfieldRepoCount: brownfieldRepos,
    greenfieldRepoCount: greenfieldRepos,
  };
  if (codeReviewMaxRound > 0) { out.selfReviewRounds = codeReviewMaxRound; }
  return out;
}

// extractWhatArtifactSignals lives in regexCounters.ts — see import above.

// Bug BB — collectAuditFailureReasons + parseAuditCommentReason
// extracted to ./auditFailureLabels.ts so the vitest harness can import
// them without dragging in the vscode runtime. See that file for the
// full rationale on the umbrella-label fix.

/**
 * E4 (2026-05-25) — apply per-persona self_review scores from the chain's
 * finalReview map onto the result, using phaseSpec.personaNames for the
 * given phase. Falls back to the short names (`architect`/`security`)
 * so older chains pre-dating the agent-prompt alignment still render.
 *
 * Extracted from fetchPhaseSignal to keep that function under its
 * cyclomatic-complexity ratchet — adding an `??` per branch inline
 * pushed complexity past budget.
 *
 * Mutates `result.selfReviewArchitect` / `result.selfReviewSecurity`
 * only when the corresponding entry exists; leaves them untouched
 * otherwise so existing extraction paths (artifact-fallback at line
 * ~164) can still populate from the artifact YAML.
 */
function applyPersonaScores(
  result: Record<string, unknown>,
  finalReview: Record<string, { score?: number; severity?: string }>,
  phase: 'how' | 'what',
): void {
  const names = phaseSpec(phase).personaNames;
  const archEntry = finalReview[names.architect] ?? finalReview.architect;
  const secEntry  = finalReview[names.security]  ?? finalReview.security;
  if (archEntry) {
    result.selfReviewArchitect = { score: archEntry.score, severity: archEntry.severity };
  }
  if (secEntry) {
    result.selfReviewSecurity = { score: secEntry.score, severity: secEntry.severity };
  }
}

/**
 * Task #64 — apply artifact-side self-review fallback onto a partially-
 * populated signal result. Chain wins when it has real (non-null) scores.
 * Artifact is the fallback (3 sub-sources via extractSelfReviewFromArtifact).
 * Surfaces scores immediately on PR open, not only after audit completes.
 *
 * Extracted from fetchPhaseSignal to keep that function under its
 * cyclomatic-complexity ratchet (PR architecture-fitness test).
 */
function applyArtifactSelfReviewFallback(
  result: Record<string, unknown>,
  docText: string,
): void {
  const arch = result.selfReviewArchitect as { score?: number } | undefined;
  const sec = result.selfReviewSecurity as { score?: number } | undefined;
  const chainHasScores = (arch?.score != null) || (sec?.score != null);
  if (chainHasScores) { return; }
  const fromArtifact = extractSelfReviewFromArtifact(docText);
  if (fromArtifact.architect) {
    result.selfReviewArchitect = {
      score: fromArtifact.architect.score,
      severity: fromArtifact.architect.severity,
    };
  }
  if (fromArtifact.security) {
    result.selfReviewSecurity = {
      score: fromArtifact.security.score,
      severity: fromArtifact.security.severity,
    };
  }
  // If chain showed 0 rounds but artifact has scores, lift the round
  // count too so the card doesn't show "0 rounds" alongside real scores.
  const rounds = result.selfReviewRounds as number | undefined;
  if ((rounds == null || rounds === 0) && (fromArtifact.architect?.round || fromArtifact.security?.round)) {
    result.selfReviewRounds = Math.max(
      fromArtifact.architect?.round ?? 0,
      fromArtifact.security?.round ?? 0,
    );
  }
}

/**
 * Discriminated-union dispatch table type. Given a union `U` keyed by
 * `type`, `MessageHandlers<U>` is an object whose keys are every member's
 * `type` and whose values are handlers narrowed to that exact member.
 * Used by `LookingGlassPanel.messageHandlers` to replace a 100+ case
 * `switch` while preserving per-variant payload narrowing.
 */
type MessageHandlers<U extends { type: string }> = {
  [K in U['type']]: (msg: Extract<U, { type: K }>) => void | Promise<void>;
};

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
  // D-PR1.v1.3 — track the last-drilled OKR id so onPullMesh can directly
  // re-drill (read okr.yaml + post fresh okrDetail) after a pull, instead
  // of relying on the brittle panelActivated → webview → drillIntoOkr
  // round-trip. The round-trip path worked when the webview's view was
  // 'okr-detail' AND state.currentOkr matched the OKR being refreshed,
  // but PR #122 hit a case where pull succeeded + disk was correct
  // (status: complete) but the in-memory state stayed at the pre-pull
  // OKR card. Directly re-drilling is more reliable.
  private lastDrilledOkrId: string | undefined;
  private activeReviewPollTimer: ReturnType<typeof setInterval> | undefined;
  private lastActiveReviewState: boolean = false;
  public pendingBarPath: string | undefined;
  private pendingActiveReview: import('../types').ActiveReviewInfo | undefined;
  private meshRepoInfo: { owner: string; repo: string } | null = null;
  /** Throttle for panel-activation refresh — avoids hammering the git
   *  status check on rapid tab flips. 5 second window. */
  private lastActivationRefreshAt: number = 0;
  /** Per-OKR set of phases whose artifact viewer is currently expanded.
   *  Keyed by okrId. Survives across phase-signal re-fetches so the
   *  panel stays open during panel-focus auto-refresh. */
  private artifactOpenPhases: Map<string, Set<'why' | 'how' | 'what'>> = new Map();
  /** Active poll timers — one per OKR. Cleared when a terminal state
   *  is reached or when a new audit action overrides. */
  private auditPollTimers: Map<string, ReturnType<typeof setTimeout>[]> = new Map();
  /** When the user clicked Revise with Agent on a given OKR. Drives a
   *  "🤖 Revision dispatched at HH:MM" status line on the phase card
   *  so the user gets feedback while waiting for the agent's new commits.
   *  Cleared when the next signal refresh shows commit activity newer
   *  than the dispatch time. */
  private reviseDispatchedAt: Map<string, number> = new Map();

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

    // Refresh on panel activation — previously the user had to close +
    // reopen Looking Glass to trigger pull detection after a workflow
    // pushed a finalize commit. Now: when the panel becomes active
    // (focus regained after working in another tab/window), re-run
    // loadPortfolio (which refreshes git ahead/behind state) AND notify
    // the webview so the OKR detail page can re-fetch fresh signals if
    // that's what's on screen.
    this.panel.onDidChangeViewState(
      (e) => {
        if (e.webviewPanel.active) {
          void this.handlePanelActivated();
        }
      },
      null,
      this.disposables,
    );
  }

  private async handlePanelActivated(): Promise<void> {
    const now = Date.now();
    if (now - this.lastActivationRefreshAt < 5000) {
      return;
    }
    this.lastActivationRefreshAt = now;
    try {
      await this.loadPortfolio();
      this.postMessage({ type: 'panelActivated' });
    } catch {
      // Best-effort refresh — swallow errors so a transient git issue
      // doesn't spam the user every time they focus the panel.
    }
  }

  /**
   * Inbound message -> handler dispatch table. Replaces the prior 100+
   * case switch in handleMessage (cyclomatic complexity 125). Each entry's
   * RHS is its own function whose complexity is measured independently,
   * so the router itself stays trivially simple (one lookup + one call).
   *
   * Convention: each entry forwards to a `this.onX(...)` method that
   * owns the real work. Inline arrows are used only for the handful of
   * single-line side-effects (vscode.commands.executeCommand, etc).
   * The `noop` sentinel marks message types that exist in the protocol
   * but are handled entirely client-side (back-navigation, filter
   * toggles) - listing them explicitly catches future renames at
   * compile time instead of silently dropping the message.
   */
  private readonly noop = (): void => { /* client-side handled in webview */ };
  private readonly messageHandlers: MessageHandlers<LookingGlassWebviewMessage> = {
    'ready':                       () => this.onReady(),
    'refresh':                     () => this.loadPortfolio(),
    'pickFolder':                  () => this.onPickFolder(),
    'initMesh':                    (m) => this.onInitMesh(m.name, m.org, m.owner, m.folderPath, m.createRepo, m.repoName, m.repoVisibility, m.architectureDsl, m.capabilityModel),
    'samplePlatform':              () => this.onSamplePlatform(),
    'addPlatform':                 (m) => this.onAddPlatform(m.name, m.abbreviation, m.owner),
    'scaffoldBar':                 (m) => this.onScaffoldBar(m.name, m.platformId, m.criticality, m.template),
    'drillIntoBar':                (m) => this.onDrillIntoBar(m.barPath),
    'openFile':                    (m) => this.onOpenFile(m.path),
    'detectGitHubDefaults':        () => this.onDetectGitHubDefaults(),
    'scanOrg':                     (m) => this.onScanOrg(m.org, m.modelFamily),
    'scanOrgWithRepos':            (m) => this.onScanOrgWithRepos(m.org, m.repoNames, m.modelFamily),
    'loadOrgRepos':                (m) => this.onLoadOrgRepos(m.org),
    'addReposToBar':               (m) => this.onAddReposToBar(m.barPath, m.repoUrls),
    'applyOrgScan':                (m) => this.onApplyOrgScan(m.platforms, m.template, m.updates),
    'listModels':                  () => this.onListModels(),
    'updateBarField':              (m) => this.onUpdateBarField(m.barPath, m.field, m.value),
    'updateAppYaml':               (m) => this.onUpdateAppYaml(m.barPath, m.fields),
    'listAdrs':                    (m) => this.onListAdrs(m.barPath),
    'createAdr':                   (m) => this.onCreateAdr(m.barPath, m.adr),
    'updateAdr':                   (m) => this.onUpdateAdr(m.barPath, m.adr),
    'deleteAdr':                   (m) => this.onDeleteAdr(m.barPath, m.adrId),
    'generateThreatModel':         (m) => this.onGenerateThreatModel(m.barPath),
    'exportThreatModelCsv':        (m) => this.onExportThreatModelCsv(m.barPath, m.threats),
    'syncBar':                     (m) => this.onSyncBar(m.barPath),
    'commitMesh':                  () => this.onCommitMesh(),
    'pushMesh':                    () => this.onPushMesh(),
    'pullMesh':                    () => this.onPullMesh(),
    'switchCapabilityModel':       (m) => this.onSwitchCapabilityModel(m.modelType),
    'uploadCustomModel':           (m) => this.onUploadCustomModel(m.jsonContent),
    'openRepoInContext':           (m) => this.onOpenRepoInContext(m.repoUrl, m.barPath),
    'openScorecard':               (m) => { vscode.commands.executeCommand('maintainabilityai.openScorecard', m.folderPath); },
    'scaffoldComponent':           (m) => this.onScaffoldComponent(m.repoUrl, m.barPath),
    'deployGovernanceToRepo':      (m) => this.onDeployGovernanceToRepo(m.barPath, m.localPath),
    'loadPolicies':                () => this.onLoadPolicies(),
    'savePolicy':                  (m) => this.onSavePolicy(m.filename, m.content),
    'lookupNistControl':           (m) => this.onLookupNistControl(m.controlId),
    'createNistCatalog':           () => this.onCreateNistCatalog(),
    'generatePolicyBaseline':      (m) => this.onGeneratePolicyBaseline(m.filename),
    'calmMutation':                (m) => this.onCalmMutation(m.barPath, m.patch as CalmPatch[]),
    'loadPlatformArchitecture':    (m) => this.onLoadPlatformArchitecture(m.platformId),
    'platformCalmMutation':        (m) => this.onPlatformCalmMutation(m.platformId, m.patch as CalmPatch[]),
    'applyArchetype':              (m) => this.onApplyArchetype(m.barPath, m.archetypeId, m.appName),
    'saveLayout':                  (m) => this.onSaveLayout(m.barPath, m.diagramType, m.layout as object),
    'exportPng':                   (m) => this.onExportPng(m.barPath, m.diagramType, m.pngDataUrl),
    'openOraculum':                (m) => { vscode.commands.executeCommand('maintainabilityai.oraculum', m.barPath); },
    'summarizeTopFindings':        (m) => { this.onSummarizeTopFindings(m.barPath).catch(() => {}); },
    'checkWorkflowStatus':         () => this.onCheckWorkflowStatus(),
    // Bug DD cleanup — provisionWorkflow + provisionAgentic message
    // handlers removed; provisionAll is the only redeploy entry point
    // and onProvisionWorkflow (its implementation) atomically deploys
    // workflows + composite actions + agents + skills + prompts +
    // labels in one commit. The two legacy buttons were no longer
    // mounted in the UI anyway.
    'provisionAll':                () => this.onProvisionAll(),
    'checkAgenticStatus':          () => this.onCheckAgenticStatus(),
    'getCopilotEnvStatus':         () => this.onGetCopilotEnvStatus(),
    'setCopilotEnvSecret':         (m) => this.onSetCopilotEnvSecret(m.secretName),
    'openCopilotFirewallSettings': () => this.onOpenCopilotFirewallSettings(),
    'openCopilotEnvSecretsPage':   () => this.onOpenCopilotEnvSecretsPage(),
    'savePreferredModel':          (m) => this.onSavePreferredModel(m.family),
    'reinitializeMesh':            () => this.onReinitializeMesh(),
    'loadDriftWeights':            () => this.onLoadDriftWeights(),
    'saveDriftWeights':            (m) => this.onSaveDriftWeights(m.weights),
    'configureMeshSecrets':        () => { vscode.commands.executeCommand('maintainabilityai.configureSecrets', 'governance'); },
    'refreshPromptPacks':          () => this.onRefreshPromptPacks(),
    'loadResearchSettings':        () => this.onLoadResearchSettings(),
    'saveResearchSecret':          (m) => this.onSaveResearchSecret(m.id, m.value),
    'promptResearchSecret':        (m) => this.onPromptResearchSecret(m.id),
    'createResearchSecret':        (m) => this.onCreateResearchSecret(m.id),
    'testResearchSecret':          (m) => this.onTestResearchSecret(m.id),
    'pushResearchSecret':          (m) => this.onPushResearchSecret(m.id),
    'pushResearchSecretToAll':     (m) => this.onPushResearchSecretToAll(m.id),
    'saveResearchPrefs':           (m) => this.onSaveResearchPrefs(m.prefs),
    'loadOrchestrationPolicy':     () => this.onLoadOrchestrationPolicy(),
    'saveOrchestrationPolicy':     (m) => this.onSaveOrchestrationPolicy(m.policy),
    'loadAgentType':               () => this.onLoadAgentType(),
    'saveAgentType':               (m) => this.onSaveAgentType(m.agentType),
    'loadPlatformGovernance':      (m) => this.onLoadPlatformGovernance(m.platformId),
    'savePlatformGovernance':      (m) => this.onSavePlatformGovernance(m.platformId, m.governance),
    'absolemStart':                (m) => { this.onAbsolemStart(m.barPath, m.command).catch(() => {}); },
    'absolemSend':                 (m) => { this.onAbsolemSend(m.barPath, m.message).catch(() => {}); },
    'absolemAcceptPatches':        (m) => this.onAbsolemAcceptPatches(m.barPath, m.patches as CalmPatch[]),
    'absolemRejectPatches':        (m) => this.onAbsolemRejectPatches(m.barPath),
    'absolemClose':                (m) => this.onAbsolemClose(m.barPath),
    'absolemImageStart':           (m) => { this.onAbsolemImageStart(m.barPath, m.imageBase64, m.mimeType).catch(() => {}); },
    'absolemPreviewJson':          (m) => this.onAbsolemPreviewJson(m.json),
    'getCalmComponents':           (m) => this.onGetCalmComponents(m.barPath),
    'implementComponent':          (m) => this.onImplementComponent(m.barPath, m.componentId, m.repoName, m.componentName, m.componentType, m.componentDescription),
    'saveWorkspace':               (m) => this.saveWorkspaceFile(m.name),
    'openUrl':                     (m) => { vscode.env.openExternal(vscode.Uri.parse(m.url)); },
    'newResearchFromPlatform':     (m) => {
      // Archeologist dispatches on the `research-request` issue label.
      vscode.commands.executeCommand('maintainabilityai.createResearchRequest', {
        scopeLevel: 'platform',
        scopeId: m.slug,
        brief: `Research for platform ${m.name} (${m.slug}).`,
      });
    },
    'newResearchFromBar':          (m) => {
      vscode.commands.executeCommand('maintainabilityai.createResearchRequest', {
        scopeLevel: 'bar',
        scopeId: m.barId,
        brief: `Research for BAR ${m.barName} (${m.barId}).`,
      });
    },
    'getOkrList':                  () => this.onGetOkrList(),
    'drillIntoOkr':                (m) => this.onDrillIntoOkr(m.okrId),
    'loadOkrPhaseSignals':         (m) => this.onLoadOkrPhaseSignals(m.okrId),
    'runOkrAudit':                 (m) => this.onRunOkrAudit(m.okrId, m.phase, m.prNumber),
    'toggleOkrArtifact':           (m) => this.onToggleOkrArtifact(m.okrId, m.phase),
    'mergeOkrPr':                  (m) => this.onMergeOkrPr(m.okrId, m.phase, m.prNumber),
    'markOkrPrReady':              (m) => this.onMarkOkrPrReady(m.okrId, m.phase, m.prNumber),
    'rerunOkrAudit':               (m) => this.onRerunOkrAudit(m.okrId, m.phase, m.prNumber),
    'reviseWithAgent':             (m) => this.onReviseWithAgent(m.okrId, m.phase, m.prNumber),
    'scaffoldOkrSample':           () => this.onScaffoldOkrSample(),
    'createOkrDraft':              () => this.onCreateOkrDraft(),
    'editOkr':                     (m) => this.onEditOkr(m.okrId),
    'saveOkrEdits':                (m) => this.onSaveOkrEdits(m.okrId, m.patch),
    'createOkrFromDraft':          (m) => this.onCreateOkrFromDraft(m.draft),
    'startOkrWhy':                 (m) => this.onStartOkrPhase(m.okrId, 'why'),
    'startOkrHow':                 (m) => this.onStartOkrPhase(m.okrId, 'how'),
    'startOkrWhat':                (m) => this.onStartOkrPhase(m.okrId, 'what'),
    'confirmStartOkrPhase':        (m) => this.onConfirmStartOkrPhase(m.okrId, m.phase, m.additionalContext ?? ''),
    'loadHatterTag':               (m) => this.onLoadHatterTag(m.okrId, m.actionId),
    'verifyChain':                 (m) => this.onVerifyChain(m.okrId, m.actionId),
    'exportAuditReport':           (m) => this.onExportAuditReport(m.okrId, m.actionId),
    'exportOkrRollup':             (m) => this.onExportOkrRollup(m.okrId),
    'okrHumanGateApprove':         (m) => this.onHumanGateApprove(m.okrId, m.actionId, m.tier),
    'okrHumanGateRerun':           (m) => this.onHumanGateRerun(m.okrId, m.actionId),
    'okrHumanGateReject':          (m) => this.onHumanGateReject(m.okrId, m.actionId),
    'setOkrRepoStatus':            (m) => this.onSetOkrRepoStatus(m.okrId, m.repoUrl, m.status),
    'resetOkrPhase':               (m) => this.onResetOkrPhase(m.okrId, m.phase),
    'cancelOkrAction':             (m) => this.onCancelOkrAction(m.okrId, m.actionId),
    // Client-side-only navigation / filter messages - declared so a
    // future rename surfaces at compile time instead of silently dropping.
    'backToPortfolio':             this.noop,
    'backToPlatform':              this.noop,
    'backToOkrList':               this.noop,
    'drillIntoPlatform':           this.noop,
    'filterBars':                  this.noop,
    'searchBars':                  this.noop,
  };

  protected async handleMessage(message: LookingGlassWebviewMessage): Promise<void> {
    const handler = this.messageHandlers[message.type] as
      | ((msg: LookingGlassWebviewMessage) => void | Promise<void>)
      | undefined;
    if (handler) { await handler(message); }
  }

  /**
   * `pickFolder` - open a folder picker for the Initialize Mesh flow.
   * Extracted from the prior inline `case` body so the dispatch table
   * stays uniform (each entry is one method call).
   */
  private async onPickFolder(): Promise<void> {
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
  }

  /**
   * `openFile` - open a path in the editor or reveal a directory in the
   * explorer. Resolves mesh-relative paths against the configured mesh
   * root (BAR-detail entries send absolute, OKR-detail "Open okr.yaml"
   * sends mesh-relative - without resolution the relative form lands
   * against the extension cwd and the file is never found).
   */
  private async onOpenFile(targetPath: string): Promise<void> {
    const absPath = path.isAbsolute(targetPath)
      ? targetPath
      : (() => {
          const meshPath = MeshService.getMeshPath();
          return meshPath ? path.join(meshPath, targetPath) : targetPath;
        })();
    const uri = vscode.Uri.file(absPath);
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        vscode.commands.executeCommand('revealInExplorer', uri);
      } else {
        vscode.window.showTextDocument(uri);
      }
    } catch {
      vscode.window.showErrorMessage(`File not found: ${absPath}`);
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
      // Track the last-drilled OKR id so onPullMesh can directly re-drill
      // (D-PR1.v1.3). View mode only — edit/create exit on save, so they
      // shouldn't anchor the post-pull refresh.
      if (mode === 'view') {
        this.lastDrilledOkrId = okrId;
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
   * Live-from-GitHub per-phase signal loader. Drives the rich Why/How/What
   * cards on the OKR detail page (matches the §10.2 mockup: sources +
   * providers + refine + findings + coverage for WHY; FR/SR coverage +
   * reviewer scores for HOW). Reads audit JSONL + artifact markdown via
   * GitHub Contents API — no local mesh dependency.
   *
   * Per user preference (asked at session start): always-live from GitHub.
   * If a file isn't found, that phase's signal entry is omitted from the
   * payload, and the webview falls back to the "Will run" placeholder.
   */
  private async onLoadOkrPhaseSignals(okrId: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) { return; }
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) { return; }

    const okrService = this.meshService.getOkrService();
    const okr = okrService.read(meshPath, okrId);
    if (!okr) { return; }

    const signals: { why?: Record<string, unknown>; how?: Record<string, unknown>; what?: Record<string, unknown> } = {};

    // For each phase that has an action (started or completed), fetch its
    // audit JSONL + artifact markdown live from GitHub. Skip phases with
    // no action — pre-flight rendering shows the "Will run" placeholder.
    const phases: Array<'why' | 'how' | 'what'> = ['why', 'how', 'what'];
    for (const phase of phases) {
      const action = [...okr.actions].reverse().find(a => a.phase === phase);
      if (!action) { continue; }

      try {
        const sig = await this.fetchPhaseSignal(meshRepo.owner, meshRepo.repo, okrId, phase, action);
        signals[phase] = sig as unknown as Record<string, unknown>;
      } catch (err) {
        signals[phase] = { error: toErrorMessage(err) };
      }
    }

    this.postMessage({ type: 'okrPhaseSignals', okrId, signals });
  }

  /**
   * Schedule a burst of phase-signal re-fetches after a user-initiated
   * audit action. The audit-and-drift workflow takes 10-30 seconds to
   * land its verdict labels — without polling, the user has to either
   * switch tabs (panel-focus auto-refresh) or click the manual 🔄
   * Refresh button to see the result.
   *
   * Schedule: 5s, 15s, 30s, 60s. Cleared early if a terminal state
   * is detected during one of the re-fetches.
   */
  private startAuditPoll(okrId: string): void {
    // Cancel any prior poll for this OKR — new action supersedes.
    const existing = this.auditPollTimers.get(okrId);
    if (existing) { existing.forEach(t => clearTimeout(t)); }

    const intervals = [5_000, 15_000, 30_000, 60_000];
    const timers = intervals.map(ms =>
      setTimeout(async () => {
        try {
          // Refresh phase signals (PR state, drift cosines, labels)
          // AND git status (so the Pull banner surfaces when the
          // finalize workflow's commit lands on remote main).
          await this.onLoadOkrPhaseSignals(okrId);
          await this.loadPortfolio();
        } catch {
          // Best-effort polling — swallow errors, keep firing the rest.
        }
      }, ms),
    );
    this.auditPollTimers.set(okrId, timers);
  }

  /**
   * Per-phase fetch + parse — keeps onLoadOkrPhaseSignals readable. Returns
   * the OkrPhaseSignal-shaped object the webview's renderPhaseSignals expects.
   */
  private async fetchPhaseSignal(
    owner: string,
    repo: string,
    okrId: string,
    phase: 'why' | 'how' | 'what',
    action: { runId: string; agent: string; status?: string; createdAt?: string; hatterChainRoot?: string | null },
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    if (action.hatterChainRoot) { result.chainRoot = action.hatterChainRoot; }

    // Find the PR first so we know which ref to fetch the artifact +
    // audit JSONL from. Critical: for an OPEN PR (artifact not merged
    // yet), the files live on the PR's head branch, NOT main. Fetching
    // from main returns 404 + makes the View Artifact panel + the
    // structural counts (FR/SR/H2) look at the wrong tree.
    //
    // PR matching: we filter PRs by created_at >= action.createdAt so
    // a fresh dispatch doesn't show the prior run's merged PR AND a
    // post-merge-pending-pull state still shows THIS run's merged PR
    // (local mesh hasn't pulled the finalize commit, so action.status
    // says in_progress — but the PR is real and this run's).
    result.okrId = okrId;
    const artifactPathForPr = `okrs/${okrId}/${phase}/${phase === 'why' ? 'research-doc.md' : phase === 'how' ? 'prd.md' : 'code-design.md'}`;
    const auditLabel = phaseSpec(phase).draftLabel;
    const passLabel = phaseSpec(phase).passLabel;
    let pr: Awaited<ReturnType<typeof this.findArtifactPr>> = null;
    try {
      pr = await this.findArtifactPr(owner, repo, artifactPathForPr, action.createdAt ?? null);
    } catch { /* best-effort */ }
    // Choose ref: PR head when PR is open (and not yet merged); default
    // branch otherwise (post-merge / no PR).
    const fetchRef = pr && pr.state === 'open' && !pr.merged ? pr.headRef : undefined;

    // 1. Audit JSONL — count skill_calls per name + parse self_review events.
    const auditPath = `okrs/${okrId}/audit/events/${action.runId}.jsonl`;
    const auditText = await this.githubService.getRepoFileText(owner, repo, auditPath, fetchRef);
    if (auditText) {
      const lines = auditText.split('\n').filter(l => l.trim().length > 0);
      const counts = new Map<string, number>();
      let gapLoops = 0;
      let followUps = 0;
      // B24: track self-review events per persona, keeping the
      // highest-round entry for each persona (final critique).
      const finalReview: Record<string, { round: number; score?: number; severity?: string }> = {};
      let maxRound = 0;
      let exhausted = false;
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as {
            event_kind?: string;
            signature?: string;
            payload?: {
              skill?: string; ok?: boolean; queries?: string[]; reason?: string;
              round?: number; persona?: string; score?: number; severity?: string;
              emitted_by?: string;
            };
          };
          // Bug W (Codex round-7) — gate metrics extraction on the
          // same legitimacy rules the runner's audit-verify-chain
          // enforces. Forged events (workflow attribution on a
          // non-allowlisted kind, OR unsigned agent event) MUST NOT
          // pollute the UI counts or per-persona scores.
          if (!isEventLegitimate(event)) { continue; }
          if (event.event_kind === 'skill_call' && event.payload?.skill && event.payload?.ok !== false) {
            counts.set(event.payload.skill, (counts.get(event.payload.skill) ?? 0) + 1);
          }
          if (event.event_kind === 'skill_call' && event.payload?.skill === 'gap-loop') {
            gapLoops++;
            followUps += event.payload?.queries?.length ?? 0;
          }
          if (event.event_kind === 'self_review' && event.payload?.persona && event.payload?.round != null) {
            const r = event.payload.round;
            if (r > maxRound) { maxRound = r; }
            const persona = event.payload.persona;
            if (!finalReview[persona] || r > finalReview[persona].round) {
              finalReview[persona] = { round: r, score: event.payload.score, severity: event.payload.severity };
            }
          }
          if (event.event_kind === 'self_review_exhausted') {
            exhausted = true;
          }
        } catch { /* malformed line — skip */ }
      }
      // Knight's Seal v1 (B27) — detect signatures on the events. Lifted
      // into a helper so this loop stays under the complexity budget.
      Object.assign(result, detectKnightSeal(lines));

      if (phase === 'why') {
        const tavily = counts.get('tavily-search') ?? 0;
        const arxiv = counts.get('arxiv-search') ?? 0;
        const uspto = counts.get('uspto-search') ?? 0;
        const hn = counts.get('hackernews-search') ?? 0;
        result.providers = { tavily, arxiv, uspto, hn, total: tavily + arxiv + uspto + hn };
        result.gapLoops = gapLoops;
        result.followUps = followUps;
      } else if (phase === 'how') {
        let mesh = 0;
        for (const [name, n] of counts) {
          if (name.startsWith('knowledge-') || name.startsWith('context-')) { mesh += n; }
        }
        result.meshSkillCalls = mesh;
        // B24 + E4 — surface self-review trail via shared helper so
        // fetchPhaseSignal complexity stays under its ratcheted budget.
        if (maxRound > 0) {
          result.selfReviewRounds = maxRound;
        }
        applyPersonaScores(result, finalReview, 'how');
        if (exhausted) {
          result.selfReviewExhausted = true;
        }
      } else if (phase === 'what') {
        Object.assign(result, extractWhatChainSignals(lines));
        // Bug V/W + E4 — WHAT branch surfaces per-persona scores from
        // signed `self_review` chain events; persona-aware lookup with
        // fallback handled in the pickPersonaScores helper to keep
        // fetchPhaseSignal complexity under its ratcheted budget.
        applyPersonaScores(result, finalReview, 'what');
        if (exhausted) {
          result.selfReviewExhausted = true;
        }
      }
    }

    // 2. Artifact markdown — citation + section counts. Also doubles as
    // the body for the inline View Artifact panel when the user has
    // toggled it open for this phase. We always pull the file (we need
    // structural counts regardless) — when the toggle is on we just
    // also forward the body to the webview. Read from the PR head ref
    // when the PR is open (file lives on the feature branch).
    const artifactPath = artifactPathForPr;
    const docText = await this.githubService.getRepoFileText(owner, repo, artifactPath, fetchRef);

    // Task #64 — artifact-side self-review fallback. Extracted to
    // keep fetchPhaseSignal under its complexity ratchet.
    if (docText && (phase === 'how' || phase === 'what')) {
      applyArtifactSelfReviewFallback(result, docText);
    }
    const openPhases = this.artifactOpenPhases.get(okrId);
    const isArtifactOpen = openPhases?.has(phase) === true;
    if (isArtifactOpen) {
      result.artifactOpen = true;
      result.artifactPath = artifactPath;
      result.artifactContent = docText ?? '';
    }
    if (docText) {
      // H2 section count — same canonical sets the audit-and-drift
      // workflows check, surfaced here so the Coverage line shows it.
      // Each required section is an array of acceptable heading strings —
      // the agent decides which form to write and we accept any of them.
      // PR #110 wrote "JTBD Analysis", PR #114 wrote "Jobs-to-be-Done
      // Analysis"; same section, different display string. Fighting the
      // agent over wording loses; tolerance wins.
      const requiredH2: string[][] = phase === 'why'
        ? [
          ['Source Premises'],
          ['Executive Summary'],
          ['Cross-Source Analysis'],
          ['Evidence Gaps'],
          ['JTBD Analysis', 'Jobs-to-be-Done Analysis'],
          ['Patent Landscape'],
          ['Whitespace Analysis'],
          ['Formal Conclusions'],
          ['Recommendations'],
          ['References'],
        ]
        : phase === 'how'
        ? [
          ['Input Premises'],
          ['Problem Statement'],
          ['Goals'],
          ['Functional Requirements'],
          ['Non-Functional Requirements'],
          ['Security Requirements'],
          ['Coverage Analysis'],
          ['Risk Matrix'],
          ['Success Metrics'],
          ['References'],
        ]
        // Task #70 (cert-run-5 forensic) — WHAT-phase H2s are the
        // developer-actionable set from .caterpillar/prompts/code-design/
        // synthesis.md. The prior set (Input Premises / Approach / Repo
        // Inventory / Per-Repo Change List / Interface Contracts / Data
        // Ownership / Migration Plan / Rollback Plan / Risk Matrix) was
        // planning-level and produced designs that human reviewers
        // wouldn't hand to a coding agent (no project tree, no typed
        // request/response shapes, no DB schemas, no per-component
        // frontend specs). The new set is what a coding agent needs.
        // The synthesis prompt-pack writes them with numbered prefixes
        // ("## 1. Project Structure") — the heading-match regex below
        // tolerates optional numeric prefix.
        : phase === 'what'
        ? [
          ['Project Structure'],
          ['API Endpoint Specifications'],
          ['Data Models'],
          ['Authentication Middleware Implementation'],
          ['Security Control Implementations'],
          ['Configuration and Environment Variables'],
          ['Error Handling Patterns'],
          ['Testing Strategy with Example Test Cases'],
          ['Deployment Configuration'],
          ['Design Rationale & Research Traceability'],
        ]
        : [];
      if (requiredH2.length > 0) {
        const present = requiredH2.filter(alts =>
          // Tolerant heading match — accepts both bare form (`## Input Premises`)
          // and numbered form (`## 1. Input Premises`) — WHAT synthesis pack
          // emits numeric prefixes; WHY/HOW packs don't. Pattern matches
          // optional `\d+\.\s*` between `## ` and the heading text.
          alts.some(name => new RegExp(`^##\\s+(?:\\d+\\.\\s+)?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm').test(docText)),
        ).length;
        result.h2Present = present;
        result.h2Total = requiredH2.length;
      }

      if (phase === 'why') {
        // Cert-run-2 bug C/E fix (Task #55/#57) — same unique-id dedup
        // pattern B31.v1.1 introduced for HOW phase FR/SR, now propagated
        // to WHY conclusions + source citations.
        //
        // Old bug class: `docText.match(/\*\*C\d+\*\*/g).length` counted
        // RAW occurrences. Agents legitimately restate conclusion ids in
        // §9 Recommendations ("based on **C1** and **C3** ...") so a
        // doc with 4 distinct conclusions returned 9. The S-N counter
        // had a parallel max(N) brittleness — picking the highest N
        // would silently inflate if the artifact contained an
        // accidental "S99" (e.g. inside a source title or quote).
        //
        // Both now use unique-id dedup. For conclusions, also do the
        // 4-line citation-window check so we can surface "4/4 conclusions
        // cite ≥1 source" as a coverage signal (workflow's audit
        // comment does this too, post-fix).
        const docLines = docText.split('\n');
        result.findings = countUniqueSourceIds(docText).size;
        const conclResult = countUniqueIds(
          docLines,
          /\*\*C\d+\*\*/,
          /\bC\d+\b/,
          /\bS\d+\b/,
          4,  // tighter window than HOW phase — conclusions are typically single-line list items
        );
        result.conclusions = conclResult.total;
        result.conclusionsWithCites = conclResult.covered;
        // Brief topics — heuristic: count required H3 sub-sections that
        // appear under "Cross-Source Analysis" in the canonical layout.
        const requiredTopics = ['Standards and Best Practices', 'Security and Compliance', 'Implementation Patterns', 'Market Landscape'];
        const present = requiredTopics.filter(t => new RegExp(`^###\\s+${t}\\s*$`, 'm').test(docText)).length;
        result.briefTopicsTotal = requiredTopics.length;
        result.briefTopicsCovered = present;
      } else if (phase === 'how') {
        // Match both the **FR-NN** bold form AND the ### FR-NN(:) heading
        // form — same tolerance as the workflow's structure-check awk
        // (prd-agent.yml lines 279/286). Prior bold-only regex missed
        // heading-form FRs entirely (observed on PR #105: UI showed FR=0/8
        // while workflow correctly reported FR=8/8 cited).
        // PR #118 forensic: the PRD wrote `### FR-01` AND `**FR-01**` for
        // every FR (heading + bold restatement). The old raw-marker
        // counter saw 20 markers for 10 logical FRs, and the 4-line
        // window from the heading-marker didn't reach the citation in
        // the 'Traces to:' line that lives ~5 lines later. Result: 10/20
        // even though every FR had a valid citation. Switched to
        // unique-id dedup + 12-line window (matches the workflow's
        // Python rewrite for parity).
        const FR_MARKER_RE = /^(\*\*FR-\d+\*\*|### +FR-\d+)/m;
        const NFR_MARKER_RE = /^(\*\*NFR-\d+\*\*|### +NFR-\d+)/m;
        const SR_MARKER_RE = /^(\*\*SR-\d+\*\*|### +SR-\d+)/m;
        const FR_CITE_RE = /\b[CRSE]-?\d+\b/;
        const SR_ANCHOR_RE = /\b(?:THR-?\d+|A0[1-9]|A10)\b/;

        const docLines = docText.split('\n');
        const frResult = countUniqueIds(docLines, FR_MARKER_RE, /\bFR-\d+\b/, FR_CITE_RE);
        const nfrResult = countUniqueIds(docLines, NFR_MARKER_RE, /\bNFR-\d+\b/, /./);
        const srResult = countUniqueIds(docLines, SR_MARKER_RE, /\bSR-\d+\b/, SR_ANCHOR_RE);
        result.frCount = frResult.total;
        result.nfrCount = nfrResult.total;
        result.srCount = srResult.total;
        result.frWithCites = frResult.covered;
        result.srAnchored = srResult.covered;
      } else if (phase === 'what') {
        Object.assign(result, extractWhatArtifactSignals(docText));
      }
    }

    // 3. PR state — populate from the `pr` we already fetched at the
    //    top of this method (we needed it earlier to pick the right
    //    ref for the artifact + audit reads).
    try {
      if (pr) {
        result.prNumber = pr.number;
        result.prUrl = pr.url;
        result.prState = pr.merged ? 'merged' : pr.state === 'closed' ? 'closed' : 'open';
        // Revise-in-flight surfacing: if the user dispatched a
        // revision in the last 10 minutes AND there hasn't been a new
        // commit on the PR head since then, the agent is still working.
        // We can't tell exactly when the agent will push, but we can
        // tell the user "we asked, waiting for output." Cleared by
        // checking PR head commit timestamp via a separate API call.
        const dispatchedAt = this.reviseDispatchedAt.get(okrId);
        if (dispatchedAt && Date.now() - dispatchedAt < 10 * 60 * 1000) {
          try {
            const client = await this.githubService.getClient();
            const { data: commit } = await client.rest.repos.getCommit({ owner, repo, ref: pr.headSha });
            const commitTs = new Date(commit.commit?.author?.date ?? 0).getTime();
            if (commitTs < dispatchedAt) {
              // No new commit since revise — agent still working.
              result.reviseDispatchedAt = new Date(dispatchedAt).toISOString();
            } else {
              // Agent's revision arrived; clear our local marker.
              this.reviseDispatchedAt.delete(okrId);
            }
          } catch { /* if commit lookup fails, leave marker set conservatively */ }
        }
        // GitHub uses `draft: true` on PRs the author hasn't marked
        // ready-for-review yet. The agent opens its PR in draft while
        // still working — Run Audit should NOT appear until it's
        // marked ready. We surface `draft` as a separate signal so the
        // webview can render `📝 draft` + skip the Run Audit affordance.
        result.prDraft = pr.draft;
        // Review-request signal — observed on PR #91: agent kept the
        // PR in draft but asked for a review. That's a "I think I'm
        // done" signal even though the draft flag says otherwise.
        // Webview shows a "📋 Review requested" badge + a "Mark ready"
        // affordance so the user can flip draft→open without opening
        // GitHub.
        result.prReviewRequested = pr.reviewRequested;
        result.auditLabelApplied = pr.labels.includes(auditLabel);
        result.passLabelApplied = pr.labels.includes(passLabel);

        // 4. Drift cosines + audit-comment reason — parsed from the
        //    audit-and-drift workflow's upserted comment on the PR. The
        //    workflow writes a stable `<!-- {agent}-audit -->` marker
        //    so we can find it without polling the workflow's run logs.
        //    Gives the Why/How card a visible "Pocket Watch ✓ 0.74" /
        //    "Caterpillar ✓ 0.81" line rather than just "Drift checks
        //    passed" abstract. Also extracts the workflow's `Reason:`
        //    line so the audit-failed message reflects the actual
        //    failure branch, not the umbrella label's stock text
        //    (Bug BB).
        const commentMarker = phase === 'why'
          ? '<!-- market-research-agent-audit -->'
          : phase === 'how'
          ? '<!-- prd-agent-audit -->'
          : null;
        let auditCommentReason: string | null = null;
        if (commentMarker) {
          const auditComment = await this.fetchPrCommentByMarker(owner, repo, pr.number, commentMarker);
          if (auditComment) {
            const pw = parseDriftRow(auditComment, 'Pocket Watch');
            if (pw) { result.pocketWatch = pw; }
            const cat = parseDriftRow(auditComment, "Caterpillar");
            if (cat) { result.caterpillar = cat; }
            auditCommentReason = parseAuditCommentReason(auditComment);
          }
        }

        // Audit-failed signal — workflow applied at least one failure
        // label. Task #66 (cert-run-5 forensic): pull per-phase labels
        // from phaseSpec so each phase's degraded/drift labels are
        // recognized. Bug BB (2026-05): pass auditCommentReason so the
        // umbrella `degraded-evidence` label gets a specific human
        // message instead of the misleading "declared `live`" stock
        // text. Extracted to a helper to keep fetchPhaseSignal under
        // its complexity ratchet.
        const failureReasons = collectAuditFailureReasons(phase, pr.labels, auditCommentReason);
        if (failureReasons.length > 0) {
          result.auditFailed = true;
          result.auditFailureReasons = failureReasons;
        }
      }
    } catch { /* PR resolution is best-effort — don't block the rest of the signal */ }

    return result;
  }

  /**
   * Fetch the first PR comment whose body starts with `marker`. Used to
   * find the audit-and-drift workflow's upserted summary comment so we
   * can parse the drift cosines into the OKR phase card.
   */
  private async fetchPrCommentByMarker(
    owner: string,
    repo: string,
    prNumber: number,
    marker: string,
  ): Promise<string | null> {
    try {
      const client = await this.githubService.getClient();
      const { data } = await client.rest.issues.listComments({ owner, repo, issue_number: prNumber, per_page: 100 });
      const comments = data as Array<{ body?: string }>;
      const hit = comments.find(c => typeof c.body === 'string' && c.body.startsWith(marker));
      return hit?.body ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Find the artifact PR for a given path. Strategy: list recent PRs and
   * pick the first one whose changed-files include `artifactPath`. Uses
   * the issues search API (faster than listing all PRs) — searches for
   * "is:pr <path>" which matches PRs touching the file.
   */
  private async findArtifactPr(
    owner: string,
    repo: string,
    artifactPath: string,
    /** ISO timestamp of when the OKR action was created. PRs created
     *  before this are from prior runs and we ignore them — fixes the
     *  case where a fresh dispatch shows the previous run's merged PR
     *  while the new agent is still building. Pass null to disable
     *  the filter (returns whatever PR touched the path most recently). */
    actionCreatedAt: string | null = null,
  ): Promise<{ number: number; url: string; state: 'open' | 'closed'; merged: boolean; draft: boolean; reviewRequested: boolean; headRef: string; headSha: string; labels: string[] } | null> {
    try {
      const client = await this.githubService.getClient();
      // GitHub's issues search matches against PR title + body text,
      // NOT changed-file paths. Agents typically don't paste the full
      // artifact path into the PR body — they mention the OKR id and
      // a human-readable summary. Searching for the path-string
      // returned zero matches and we showed "PR pending" even when a
      // valid PR existed (the bug PR #97 surfaced).
      //
      // Robust approach: extract the OKR id from the artifact path
      // (`okrs/<OKR-ID>/...`), search PRs whose body mentions it, then
      // confirm-match by listing the changed files of each candidate
      // and checking for the exact artifact path. Costs one extra
      // `pulls.listFiles` per candidate but always finds the right PR.
      const okrIdMatch = artifactPath.match(/^okrs\/([^/]+)\//);
      const searchTerm = okrIdMatch ? okrIdMatch[1] : artifactPath;
      const search = await client.rest.search.issuesAndPullRequests({
        q: `repo:${owner}/${repo} is:pr "${searchTerm}" sort:created-desc`,
        per_page: 15,
      });
      const allItems = (search.data.items ?? []) as Array<{ number: number; html_url: string; state: string; created_at: string; pull_request?: { merged_at: string | null }; labels: Array<{ name: string }> }>;
      if (allItems.length === 0) { return null; }
      // Filter to PRs created at-or-after the action's createdAt (when
      // we have it). PRs from prior runs are excluded.
      const eligible = actionCreatedAt
        ? allItems.filter(i => i.created_at >= actionCreatedAt)
        : allItems;
      if (eligible.length === 0) { return null; }
      // Confirm-match: list files for each candidate (cap at 5 to keep
      // the API budget tight), return the first whose files include
      // the artifact path. Iterate open-first then most-recent-first.
      const sorted = [
        ...eligible.filter(i => i.state === 'open'),
        ...eligible.filter(i => i.state !== 'open'),
      ];
      const items: typeof allItems = [];
      for (const candidate of sorted.slice(0, 5)) {
        try {
          const files = await client.rest.pulls.listFiles({ owner, repo, pull_number: candidate.number, per_page: 50 });
          if ((files.data as Array<{ filename: string }>).some(f => f.filename === artifactPath)) {
            items.push(candidate);
            break;
          }
        } catch { /* skip on listFiles failure */ }
      }
      if (items.length === 0) { return null; }
      const chosen = items[0];
      // For accurate merged + draft + review-request state we need a
      // follow-up PR.get (the search response doesn't include them
      // reliably). Cheap.
      const prFull = await client.rest.pulls.get({ owner, repo, pull_number: chosen.number });
      // `requested_reviewers` is the array of users still awaiting
      // review; `requested_teams` mirrors for team requests. Either
      // being non-empty means the agent has flagged "ready for human"
      // even if the PR's still in draft (we saw this on PR #91).
      const reviewRequested =
        (Array.isArray(prFull.data.requested_reviewers) && prFull.data.requested_reviewers.length > 0) ||
        (Array.isArray(prFull.data.requested_teams) && prFull.data.requested_teams.length > 0);
      return {
        number: chosen.number,
        url: chosen.html_url,
        state: chosen.state as 'open' | 'closed',
        merged: prFull.data.merged === true,
        draft: prFull.data.draft === true,
        reviewRequested,
        // Head ref + sha — needed so downstream fetches read from the
        // PR's branch (where the agent committed its artifact) rather
        // than from main (where the artifact doesn't exist until merge).
        headRef: prFull.data.head.ref,
        headSha: prFull.data.head.sha,
        labels: (chosen.labels ?? []).map(l => l.name),
      };
    } catch {
      return null;
    }
  }

  /**
   * Run Audit — applies the phase's audit-trigger label (research-synthesis
   * / prd-draft / design-draft) to the artifact PR, which fires the
   * audit-and-drift workflow. After applying, re-loads the phase signals
   * so the UI flips to "audit in flight" state.
   */
  private async onRunOkrAudit(okrId: string, phase: string, prNumber: number): Promise<void> {
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({ type: 'error', message: 'Cannot resolve mesh repo for Run Audit.' });
      return;
    }
    if (phase !== 'why' && phase !== 'how' && phase !== 'what') {
      this.postMessage({ type: 'error', message: `Unknown OKR phase: ${phase}` });
      return;
    }
    const labelName = phaseSpec(phase).draftLabel;
    try {
      await this.githubService.addIssueLabels(meshRepo.owner, meshRepo.repo, prNumber, [labelName]);
      void vscode.window.showInformationMessage(
        `Applied "${labelName}" to PR #${prNumber}. Audit + drift workflow firing — verdict will surface in 10-30 seconds.`,
      );
      // Re-fetch signals so the Run Audit button hides + the "audit in
      // flight" status line shows. Plus schedule polling so the
      // workflow's verdict labels land in the UI without the user
      // needing to switch tabs.
      await this.onLoadOkrPhaseSignals(okrId);
      this.startAuditPoll(okrId);
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to apply audit label: ${toErrorMessage(err)}` });
    }
  }

  /**
   * 🤖 Revise with agent — posts a structured PR comment dispatching
   * the phase's author agent with the audit failure reasons attached.
   * The agent reads the comment, revises the artifact addressing the
   * findings, and pushes a new commit on the PR's branch.
   *
   * Dispatch model: per the GitHub Copilot docs, mentioning `@copilot`
   * on a PR that was originally opened by a custom agent CONTINUES the
   * same agent — same context, same tools, same persona. We don't need
   * `@copilot use agent <name>` here; that's the dispatch syntax for
   * starting a NEW session. Continuation is faster + more reliable
   * because Copilot reuses the prior session's loaded context.
   */
  private async onReviseWithAgent(okrId: string, phaseStr: string, prNumber: number): Promise<void> {
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({ type: 'error', message: 'Cannot resolve mesh repo for Revise with agent.' });
      return;
    }
    const phase = phaseStr as 'why' | 'how' | 'what';
    const artifactName = phase === 'why' ? 'research-doc.md' : phase === 'how' ? 'prd.md' : 'code-design.md';

    // Fetch current audit failure reasons + cosine from the audit
    // comment so the dispatch carries the SPECIFIC findings (not a
    // generic "please revise"). The reasons land in the agent's
    // context so it knows what to fix.
    //
    // P8 (Bug-P closeout): pull the per-phase audit marker from the
    // phase spec instead of an inline why-vs-prd ternary. The previous
    // form silently used the PRD marker for WHAT, so revise on a WHAT
    // PR couldn't find its own audit comment and lost the failure-
    // reasons context. phaseSpec is the single source of truth.
    const auditCommentMarker = phaseSpec(phase).auditMarker;
    const auditComment = await this.fetchPrCommentByMarker(meshRepo.owner, meshRepo.repo, prNumber, auditCommentMarker);

    // No modal confirmation — the button click itself is the consent.
    // Earlier we used a modal warning here; user feedback said the
    // popup was disruptive (clicking the button already signals
    // intent). The action is reversible (the agent's revision opens
    // as a new commit on the PR branch — close the PR or `git revert`
    // if undesired).

    // Compose the revision instruction — short, structured, specific
    // about WHAT to fix. The agent's persona prompt already covers
    // the HOW (synthesis discipline, citation rules).
    const reasonsBlock = auditComment
      ? `\n\nAudit summary (from the latest \`audit-and-drift\` run):\n${this.extractAuditSummaryRows(auditComment).slice(0, 1200)}`
      : '';
    // Plain `@copilot` (not `@copilot use agent ...`) — when the PR
    // was opened by a custom agent, mentioning @copilot CONTINUES the
    // same agent session with full context + tools preserved. Adding
    // `use agent` starts a NEW session and loses the prior context.
    const body = [
      `@copilot`,
      ``,
      `**Revision request for OKR \`${okrId}\` — ${phase.toUpperCase()} phase.**`,
      ``,
      `The audit-and-drift workflow rejected this PR. Revise \`okrs/${okrId}/${phase}/${artifactName}\` on this branch to address the findings below, then push the commit.`,
      reasonsBlock,
      ``,
      `Do not open a new PR. Commit directly to the existing branch (\`${(await this.getPrHeadRef(meshRepo.owner, meshRepo.repo, prNumber)) ?? 'this PR'}\`). After the push, the human reviewer will click "Re-run Audit" in Looking Glass to re-trigger the gate.`,
    ].join('\n');

    try {
      const client = await this.githubService.getClient();
      await client.rest.issues.createComment({
        owner: meshRepo.owner,
        repo: meshRepo.repo,
        issue_number: prNumber,
        body,
      });
      // Record the dispatch timestamp so the OKR card can render a
      // "🤖 Revision dispatched at HH:MM — waiting for new commits..."
      // status line until the agent's revision arrives. Without this
      // there's no visible feedback that the revise is in flight —
      // user feedback: "i dont really see anything other than the top
      // comment is being edited."
      this.reviseDispatchedAt.set(okrId, Date.now());
      void vscode.window.showInformationMessage(
        `Posted revision dispatch to PR #${prNumber}. The card will show "🤖 Revision dispatched" until the agent pushes new commits.`,
      );
      // Refresh signals immediately so the new status line surfaces
      // without waiting for the poll.
      await this.onLoadOkrPhaseSignals(okrId);
      // Schedule polling — captures the moment the agent's revision
      // commit lands + the workflow re-fires.
      this.startAuditPoll(okrId);
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to post revision dispatch: ${toErrorMessage(err)}` });
    }
  }

  /**
   * Extract the markdown summary rows from an audit-and-drift comment
   * body (everything between the structural-correctness header and the
   * trailing run-id line). Truncated by caller — we just clip the
   * markup region.
   */
  private extractAuditSummaryRows(commentBody: string): string {
    const start = commentBody.search(/\*\*Structural correctness\*\*/);
    const end = commentBody.search(/\n_[a-z-]+\.yml/);
    if (start < 0) { return commentBody.slice(0, 1200); }
    return commentBody.slice(start, end > 0 ? end : commentBody.length);
  }

  /**
   * Lookup helper for the PR's head ref — used by the Revise dispatch
   * to include the branch name in the agent instructions.
   */
  private async getPrHeadRef(owner: string, repo: string, prNumber: number): Promise<string | null> {
    try {
      const client = await this.githubService.getClient();
      const { data } = await client.rest.pulls.get({ owner, repo, pull_number: prNumber });
      return data.head.ref ?? null;
    } catch {
      return null;
    }
  }

  /**
   * 🔁 Re-run audit — removes the trigger label, also clears stale
   * failure labels (degraded-evidence / goal-drift-detected /
   * caterpillar-drift-detected), then re-applies the trigger label to
   * fire the workflow's `labeled` event again. The agent's latest
   * commits get audited fresh — no need to push a no-op change just
   * to re-trigger.
   */
  private async onRerunOkrAudit(okrId: string, phaseStr: string, prNumber: number): Promise<void> {
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({ type: 'error', message: 'Cannot resolve mesh repo for Re-run Audit.' });
      return;
    }
    const phase = phaseStr as 'why' | 'how' | 'what';
    const spec = phaseSpec(phase);
    const labelName = spec.draftLabel;
    // Task #66 — pull the per-phase failure labels from phaseSpec so
    // WHAT's `design-degraded` / `design-drift-detected` get stripped on
    // re-audit too. Previously hardcoded to the WHY/HOW set, leaving
    // WHAT's labels stuck on the PR after a re-run.
    const staleFailureLabels = [spec.degradedLabel, spec.driftLabel];
    try {
      // Remove trigger label first.
      await this.githubService.removeIssueLabel(meshRepo.owner, meshRepo.repo, prNumber, labelName).catch(() => {/* best-effort */});
      // Remove any prior failure labels so they don't linger if the
      // re-run passes.
      for (const l of staleFailureLabels) {
        await this.githubService.removeIssueLabel(meshRepo.owner, meshRepo.repo, prNumber, l).catch(() => {/* best-effort */});
      }
      // Re-apply trigger label → fires `pull_request_target: labeled`.
      await this.githubService.addIssueLabels(meshRepo.owner, meshRepo.repo, prNumber, [labelName]);
      void vscode.window.showInformationMessage(
        `Re-applied "${labelName}" to PR #${prNumber}. Audit workflow firing — verdict will surface in 10-30 seconds.`,
      );
      await this.onLoadOkrPhaseSignals(okrId);
      this.startAuditPoll(okrId);
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to re-run audit: ${toErrorMessage(err)}` });
    }
  }

  /**
   * 📄 View artifact — toggle the inline collapsible panel for one phase.
   * State is held in artifactOpenPhases so it survives the panel-focus
   * auto-refresh cycle (otherwise the panel would close every 5 seconds
   * when the user switched tabs and back).
   */
  private async onToggleOkrArtifact(okrId: string, phaseStr: string): Promise<void> {
    const phase = phaseStr as 'why' | 'how' | 'what';
    if (phase !== 'why' && phase !== 'how' && phase !== 'what') { return; }
    let set = this.artifactOpenPhases.get(okrId);
    if (!set) { set = new Set(); this.artifactOpenPhases.set(okrId, set); }
    if (set.has(phase)) {
      set.delete(phase);
    } else {
      set.add(phase);
    }
    // Re-fetch signals so artifactOpen + artifactContent populate (or
    // empty back out, on close).
    await this.onLoadOkrPhaseSignals(okrId);
  }

  /**
   * ✓ Merge PR — confirm natively, then squash-merge via GitHub API.
   * After success, finalize workflow fires on the merge event and flips
   * action.status / meta.status; the next panel-focus refresh picks
   * those up.
   *
   * Branch protection on the mesh repo still applies — if the pass
   * label isn't a required check, the merge will succeed even if it
   * shouldn't have. That's a repo-config concern; this handler just
   * forwards the user's intent to the GitHub API.
   */
  private async onMergeOkrPr(okrId: string, phaseStr: string, prNumber: number): Promise<void> {
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({ type: 'error', message: 'Cannot resolve mesh repo for Merge.' });
      return;
    }
    // Native confirmation — webview window.confirm is unreliable in
    // VS Code per the B-PR3 fix history. Modal blocks the user from
    // accidentally clicking again while we're in flight.
    const confirm = await vscode.window.showWarningMessage(
      `Merge PR #${prNumber}?`,
      { modal: true, detail: `This will squash-merge the ${phaseStr.toUpperCase()} phase artifact into main. Branch protection still applies — if a required check is missing, GitHub will refuse the merge.` },
      'Merge (squash)',
    );
    if (confirm !== 'Merge (squash)') { return; }

    this.postMessage({ type: 'loading', active: true, message: `Merging PR #${prNumber}…` });
    try {
      const result = await this.githubService.mergePullRequest(meshRepo.owner, meshRepo.repo, prNumber, 'squash');
      if (result.ok) {
        void vscode.window.showInformationMessage(
          `Merged PR #${prNumber}. Auto-pulling mesh now; a second pull will run in ~25s to catch the finalize commit.`,
        );
        // Re-fetch so the PR state flips to merged + action ticks toward complete.
        // Plus schedule polling — the finalize workflow lands its commit
        // 10-20s after merge, and we want the Pull banner + the action
        // status flip to surface without the user needing to switch tabs.
        await this.onLoadOkrPhaseSignals(okrId);
        this.startAuditPoll(okrId);
        // Auto-pull (user feedback: "after we click merge and it completes
        // can we autotrigger a pull"). Two passes: immediate brings the
        // squash-merge artifact down; the 25s delayed pass catches the
        // finalize workflow's status-flip commit so the user doesn't have
        // to think about pulling at all.
        void this.onPullMesh();
        setTimeout(() => { void this.onPullMesh(); }, 25_000);
      } else {
        this.postMessage({
          type: 'error',
          message: `Could not merge PR #${prNumber}: ${result.reason}. Check branch protection / required checks.`,
        });
      }
    } catch (err) {
      this.postMessage({ type: 'error', message: `Merge failed: ${toErrorMessage(err)}` });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  /**
   * ✅ Mark PR ready-for-review — flips a draft PR to open via the
   * GraphQL `markPullRequestReadyForReview` mutation. Surfaced from the
   * OKR card when the agent has requested a review but didn't drop the
   * draft flag itself. After success, re-fetch signals so Run Audit
   * appears.
   */
  private async onMarkOkrPrReady(okrId: string, _phase: string, prNumber: number): Promise<void> {
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({ type: 'error', message: 'Cannot resolve mesh repo for Mark Ready.' });
      return;
    }
    const ok = await this.githubService.markPullRequestReadyForReview(meshRepo.owner, meshRepo.repo, prNumber);
    if (ok) {
      void vscode.window.showInformationMessage(`PR #${prNumber} marked ready-for-review.`);
      await this.onLoadOkrPhaseSignals(okrId);
    } else {
      this.postMessage({ type: 'error', message: `Failed to mark PR #${prNumber} ready-for-review.` });
    }
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
   * A12 + A12.v1.1 — set the per-repo intent + connection status on an
   * OKR's targetCodeRepos. Called when the user picks a status from the
   * OKR detail Target Code Repos section. Four states:
   *
   * - `'connected'` — repo exists + wired; Phase D will clone + ground on
   *   real code via `knowledge-code`.
   * - `'not-connected'` — repo exists but not wired; Phase D refuses to
   *   dispatch and prompts the user.
   * - `'create'` — greenfield; repo doesn't exist yet. Phase D designs
   *   from PRD + mesh only; fan-out manifest flags it as net-new for
   *   `design-bus.yml` to create before opening the design-landing issue.
   * - `'unreachable'` — system-set only after a probe; not user-pickable.
   *
   * The Phase D code-design-agent reads `targetCodeRepoStatus` per repo
   * to branch on brownfield (`connected` → clone + ground) vs greenfield
   * (`create` → design-only).
   */
  private async onSetOkrRepoStatus(okrId: string, repoUrl: string, status: 'not-connected' | 'connected' | 'create' | 'unreachable'): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    try {
      const okrService = this.meshService.getOkrService();
      const card = okrService.read(meshPath, okrId);
      if (!card) {
        this.postMessage({ type: 'error', message: `OKR not found: ${okrId}` });
        return;
      }
      const next = { ...(card.objectiveAlignment.targetCodeRepoStatus ?? {}) };
      next[repoUrl] = status;
      const updated = okrService.update(meshPath, okrId, {
        objectiveAlignment: { targetCodeRepoStatus: next },
      });
      if (!updated) {
        this.postMessage({ type: 'error', message: `OKR not found on update: ${okrId}` });
        return;
      }
      await this.onDrillIntoOkr(okrId, 'view');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to update repo status: ${toErrorMessage(err)}` });
    }
  }

  /**
   * D-PR1.v1.1 — Reset an unsealed phase to its pre-run state.
   *
   * Destructive but bounded. Confirms with a native VS Code modal before
   * delegating to OKRService.resetPhase (which enforces the seal-
   * immutability + cascading guards). After the local mesh delete
   * succeeds, best-effort closes any associated GitHub issues + draft
   * PRs that referenced this phase's runId so the next dispatch doesn't
   * collide. Refreshes the OKR detail view at the end so the action card
   * goes back to "Not started."
   */
  private async onResetOkrPhase(okrId: string, phase: 'why' | 'how' | 'what'): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const phaseLabel = phase.toUpperCase();

    // Bug QQ/A-plus — branch guard FIRST, before any file read. If we
    // need to recover (auto-switch to main + pull), the okr.yaml
    // contents change underneath us, so reading the card before the
    // guard would leave us with stale in-memory state. Doing the guard
    // first means the subsequent okrService.read sees main's content,
    // including any actions/state we just pulled.
    if (!await this.withMainBranchGuard(meshPath, `Reset ${phaseLabel}`)) { return; }

    const okrService = this.meshService.getOkrService();
    const card = okrService.read(meshPath, okrId);
    if (!card) {
      this.postMessage({ type: 'error', message: `OKR not found: ${okrId}` });
      return;
    }

    const actionsForPhase = card.actions.filter(a => a.phase === phase);
    const runIds = actionsForPhase.map(a => a.runId);
    // Compute what would be deleted so the confirmation modal is concrete
    // (the user sees exactly what's about to go away — never blind delete).
    const summary = [
      `okrs/${okrId}/${phase}/  — phase artifact directory`,
      `okrs/${okrId}/audit/events/${phaseLabel}-*.jsonl  — ${runIds.length} audit event file${runIds.length === 1 ? '' : 's'}`,
      `${actionsForPhase.length} entr${actionsForPhase.length === 1 ? 'y' : 'ies'} in okr.yaml actions[] for phase=${phase}`,
    ].join('\n  • ');
    const confirmed = await vscode.window.showWarningMessage(
      `Reset ${phaseLabel} phase for ${okrId}?\n\nThis will permanently delete:\n  • ${summary}\n\nOnly available because nothing for this phase is sealed yet. Cannot be undone.`,
      { modal: true },
      'Reset',
    );
    if (confirmed !== 'Reset') { return; }

    const result = okrService.resetPhase(meshPath, okrId, phase);
    if (!result.ok) {
      this.postMessage({
        type: 'error',
        message: `Cannot reset ${phaseLabel}: ${result.reason}`,
      });
      return;
    }

    // Bug EE (2026-05) — commit + push the okr.yaml change AND any
    // deleted phase files immediately. Pre-Bug-EE, resetPhase wrote
    // the cleaned okr.yaml locally but never pushed. If the user then
    // clicked Start <phase>, the local guard at line 1856 saw a clean
    // card (no in_progress action) and let dispatch through — but
    // remote main still had the stale `runId: HOW-<old>, status:
    // in_progress` action. The new dispatch's appendAction + push
    // landed alongside the (also-still-uncommitted) action removal in
    // ONE commit, so remote ended up correct in theory — UNLESS the
    // user hadn't called Reset at all and just deleted the PR
    // manually. PR #138 → PR #140 (forensic): user deleted PR #138
    // via GitHub UI, never clicked Reset, then dispatched a new HOW
    // and got a card with both the stale + new actions, then the
    // agent edited okr.yaml to "fix" the mismatch (governance
    // violation flagged separately as Bug GG).
    //
    // Net: ANY reset of state that's already on remote main MUST
    // commit+push immediately, not wait for the next "Commit All"
    // click. Otherwise we have a window where local + remote
    // disagree about whether the phase is active.
    const resetCommitResult = await this.commitAndPushReset(
      meshPath, okrId, phase, result,
    );

    // Best-effort: close associated GitHub issues + draft PRs for the
    // phase's runIds so the next Start <phase> dispatch doesn't collide
    // with a stale open issue / branch. Soft-fail — local mesh state is
    // already the source of truth at this point.
    const meshRepo = this.meshRepoInfo;
    if (meshRepo && runIds.length > 0) {
      for (const runId of runIds) {
        try {
          // Find any open issues whose body carries this runId marker.
          const client = await (this.githubService as unknown as { getClient: () => Promise<{ rest: { search: { issuesAndPullRequests: (q: { q: string }) => Promise<{ data: { items: Array<{ number: number; pull_request?: object }> } }> } } }> }).getClient();
          const q = `repo:${meshRepo.owner}/${meshRepo.repo} "${runId}" is:open`;
          const { data } = await client.rest.search.issuesAndPullRequests({ q });
          for (const item of data.items) {
            try {
              if (item.pull_request) {
                await this.githubService.closePullRequest(meshRepo.owner, meshRepo.repo, item.number);
              } else {
                await this.githubService.closeIssue(meshRepo.owner, meshRepo.repo, item.number);
              }
            } catch { /* best-effort */ }
          }
        } catch { /* search failed; skip */ }
      }
    }

    this.postMessage({
      type: 'info',
      message: `${phaseLabel} reset complete: removed ${result.removedActionIds.length} action(s), ${result.deletedEventFiles.length} audit file(s)${result.deletedPhaseDir ? ', phase directory cleared' : ''}. ${resetCommitResult}`,
    });
    await this.onDrillIntoOkr(okrId, 'view');
    await this.onLoadOkrPhaseSignals(okrId);
  }

  /**
   * Bug QQ/A-plus (2026-05-25) — fail-closed branch guard for every
   * Looking Glass write operation against the mesh repo. Reads current
   * branch via `git branch --show-current`; if not main, surfaces a
   * VS Code modal with the right recovery affordance:
   *
   *   - clean tree: "Switch to main and retry" button → caller invokes
   *     the recovered closure and the op resumes from scratch.
   *   - dirty tree: refuse (cannot safely auto-switch — would discard
   *     or fail). Modal lists the dirty files; user must commit / stash
   *     / discard manually, then re-click the original button.
   *   - divergent (branch has OKR commits not on main): warn the user
   *     NOT to merge this branch; explain main is source of truth;
   *     offer manual switch to main + retry.
   *
   * Returns true when the caller should proceed (HEAD is main, or the
   * user accepted recovery and the recovery succeeded). Returns false
   * when the caller MUST abort the write. The returned closure should
   * be invoked by the caller's continuation path — it does not block
   * here, the caller is responsible for re-entering its own logic.
   *
   * Operation label is purely cosmetic (used in the modal message) —
   * e.g. "Redeploy", "Start WHAT", "Reset HOW".
   */
  private async withMainBranchGuard(meshPath: string, operationLabel: string): Promise<boolean> {
    const gitRoot = this.gitSyncService.findGitRoot(meshPath);
    if (!gitRoot) {
      // No git repo — non-fatal in dev/test, but surface so the user
      // notices. Treat as pass-through; the underlying op will fail
      // its own way if it needs git.
      return true;
    }
    const guard = await checkMeshBranchGuard(gitRoot);
    if (guard.ok) { return true; }

    const message = formatMeshBranchGuardMessage(guard, operationLabel);
    // Only the clean-tree case offers auto-recovery; dirty and divergent
    // require manual user action so we never silently rearrange the
    // working tree (the original Bug QQ foot-gun was exactly that —
    // git operations doing things the user didn't authorize).
    const buttons: string[] = guard.kind === 'wrong-branch-clean'
      ? ['Switch to main and retry']
      : [];
    const choice = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      ...buttons,
    );
    if (choice !== 'Switch to main and retry') {
      // User cancelled, or there was no recovery offered (dirty /
      // divergent / git-error). Caller aborts.
      return false;
    }
    // User accepted recovery. Run checkout + ff-pull, then signal the
    // caller to re-enter.
    const recovery = await recoverMeshBranch(gitRoot);
    if (!recovery.success) {
      void vscode.window.showErrorMessage(recovery.message);
      return false;
    }
    void vscode.window.showInformationMessage(`${recovery.message} Resuming ${operationLabel}…`);
    return true;
  }

  /**
   * Bug EE — commit + push the okr.yaml change + phase-dir + audit-file
   * deletions that `resetPhase` made locally. Mirrors `commitAndPushOkr
   * Yaml` (the dispatch-time analog) so reset and dispatch use the same
   * pattern. Best-effort; returns a human-readable status fragment for
   * the toast.
   *
   * Why this is critical: without an immediate push, the local mesh
   * disagrees with remote main about whether the phase is active.
   * Next dispatch reads local (clean) + appends + pushes. If anything
   * goes wrong in that window (push fails, user closes the editor,
   * the agent grabs main before the commit lands), remote main keeps
   * the stale action and the agent has to "fix" it — which is a
   * governance violation (Bug GG).
   */
  private async commitAndPushReset(
    meshPath: string,
    okrId: string,
    phase: 'why' | 'how' | 'what',
    result: { removedActionIds: string[]; deletedEventFiles: string[]; deletedPhaseDir: boolean },
  ): Promise<string> {
    const gitRoot = this.gitSyncService.findGitRoot(meshPath);
    if (!gitRoot) { return ''; }
    try {
      // Stage everything under the OKR's directory — captures okr.yaml,
      // the cleared phase dir's .gitkeep, and the deleted audit JSONLs.
      await execFileAsync('git', ['add', '-A', path.join('okrs', okrId)], { cwd: gitRoot });
      const { stdout: staged } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: gitRoot });
      if (!staged.trim()) { return 'No git changes to commit (already in sync).'; }
      const phaseLabel = phase.toUpperCase();
      const summary = [
        `Removed ${result.removedActionIds.length} action(s): ${result.removedActionIds.join(', ') || '(none)'}`,
        `Deleted ${result.deletedEventFiles.length} audit file(s)`,
        result.deletedPhaseDir ? 'Cleared phase directory' : null,
      ].filter(Boolean).join('\n');
      const commitMsg = `chore(okr): ${okrId} ${phaseLabel} phase reset (unsealed)\n\n${summary}\n\nReset by Looking Glass; auto-committed so the next Start ${phaseLabel}\ndispatch sees a clean card. Without this auto-commit, remote main\nwould retain the stale action and the next agent run would see\na mismatched okr.yaml (Bug EE).`;
      await execFileAsync('git', ['commit', '-m', commitMsg], { cwd: gitRoot });
      try {
        const { stdout: upstreamCheck } = await execFileAsync(
          'git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
          { cwd: gitRoot },
        );
        if (upstreamCheck.trim()) {
          await execFileAsync('git', ['push'], { cwd: gitRoot, timeout: 30_000 });
          return 'Reset committed + pushed.';
        }
        return 'Reset committed locally (no upstream branch — push manually).';
      } catch (pushErr) {
        return `Reset committed locally — push failed (${toErrorMessage(pushErr)}). Push before next Start ${phase.toUpperCase()}.`;
      }
    } catch (err) {
      return `Reset applied to file but git commit failed (${toErrorMessage(err)}). Commit + push before next Start ${phase.toUpperCase()}.`;
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
    // A12.v1.1 — WHAT phase requires every targetCodeRepos[] entry to have
    // an explicit intent: 'connected' (brownfield — code-design-agent will
    // clone + ground on real code) or 'create' (greenfield — agent will
    // design from PRD + mesh, fan-out scaffolds the repo). 'not-connected'
    // / 'unreachable' / absent entries (which default to 'not-connected')
    // block dispatch. The workflow's dispatch precondition catches this
    // too, but surfacing it here means the user never creates an issue
    // that gets immediately rejected — they see the error in Looking
    // Glass and fix the repo statuses inline.
    if (phase === 'what') {
      const repos = card.objectiveAlignment.targetCodeRepos ?? [];
      const statusMap = card.objectiveAlignment.targetCodeRepoStatus ?? {};
      const offending: string[] = [];
      for (const url of repos) {
        const s = statusMap[url] ?? 'not-connected';
        if (s !== 'connected' && s !== 'create') {
          offending.push(`${url} (${s})`);
        }
      }
      if (offending.length > 0) {
        this.postMessage({
          type: 'error',
          message: `Cannot start What: every Target Code Repo must be set to Connected or Create before dispatch. Set status on:\n\n${offending.join('\n')}\n\nUse the dropdown next to each repo in the OKR detail Target Code Repos section.`,
        });
        return;
      }
      if (repos.length === 0) {
        this.postMessage({
          type: 'error',
          message: 'Cannot start What: no target code repos declared. Add at least one repo in the OKR detail Target Code Repos section.',
        });
        return;
      }
    }
    if (card.actions.some(a => a.phase === phase && (a.status === 'in_progress' || a.status === 'under_review'))) {
      this.postMessage({ type: 'error', message: `${phase.toUpperCase()} phase already running for ${okrId}.` });
      return;
    }

    // Refactor 3b — read from the single source of truth.
    const spec = phaseSpec(phase);
    const agent = spec.agentName;
    const issueLabel = spec.anchorLabel;

    // Render the issue body for preview. The actual runId + actionId
    // are computed in onConfirmStartOkrPhase so each modal show
    // doesn't burn a stale stamp.
    const stamp = new Date();
    const ymd = stamp.toISOString().slice(0, 10);
    const short = Math.random().toString(36).slice(2, 8);
    const previewRunId = `${phase.toUpperCase()}-${ymd}-${short}`;
    const body = renderOkrPhaseIssueBody(card, phase, agent, previewRunId, tier);

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

    // Bug QQ/A-plus — branch guard BEFORE we even read okr.yaml. If
    // the mesh checkout is on a feature branch, dispatching would
    // (a) write the action entry to THAT branch's okr.yaml so the
    // agent's self-review-code-architect / -security skills can't
    // find the dispatched action when they read main, AND (b) create
    // a GitHub issue that's only meaningful relative to that branch's
    // OKR state. Failing here means we never even create the half-
    // dispatched issue. Doing the guard before the read also means
    // recovery (auto-switch + pull) lands main's content on disk
    // before our okrService.read picks up the card.
    if (!await this.withMainBranchGuard(meshPath, `Start ${phase.toUpperCase()}`)) { return; }

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

    // Bug FF (2026-05) — pull-rebase before checking the in-progress
    // guard so we detect actions added by another path (e.g. CI
    // commit, another collaborator, or the user's PR-delete that
    // didn't trigger Reset). Pre-Bug-FF this guard read the LOCAL
    // card, which could disagree with remote main if the user
    // deleted a PR via GitHub UI without clicking Reset (Bug EE
    // forensic — PR #138 → #140). The local card was clean but
    // remote main had the stale `status: in_progress` action, so
    // dispatch went through and the agent inherited a mismatched
    // okr.yaml.
    try {
      const gitRoot = this.gitSyncService.findGitRoot(meshPath);
      if (gitRoot) {
        const pullResult = await this.gitSyncService.pullFromRemote(gitRoot);
        if (pullResult.success) {
          // Re-read after pull so the guard sees the merged remote state.
          const refreshed = okrService.read(meshPath, okrId);
          if (refreshed) { card.actions = refreshed.actions; card.meta = refreshed.meta; }
        }
      }
    } catch { /* best-effort — guard still runs on local-only state */ }

    if (card.actions.some(a => a.phase === phase && (a.status === 'in_progress' || a.status === 'under_review'))) {
      const stale = card.actions.filter(a => a.phase === phase && (a.status === 'in_progress' || a.status === 'under_review'));
      const staleIds = stale.map(a => `${a.id}/${a.runId}`).join(', ');
      this.postMessage({
        type: 'error',
        message: `${phase.toUpperCase()} phase already running for ${okrId} (action${stale.length === 1 ? '' : 's'}: ${staleIds}). Click "Reset ${phase.toUpperCase()}" first to clear the stale action — that path commits + pushes the cleanup so dispatch sees a clean card on remote main.`,
      });
      return;
    }

    // Refactor 3b — read from the single source of truth.
    const spec = phaseSpec(phase);
    const agent = spec.agentName;
    const issueLabel = spec.anchorLabel;

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

    const baseBody = renderOkrPhaseIssueBody(card, phase, agent, runId, tier);
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

    // Dispatch via Copilot Coding Agent's custom-agent API. The
    // canonical endpoint is the standard `POST .../issues/{n}/assignees`
    // with an `agent_assignment` body extension that names the custom
    // agent persona (must match a `.github/agents/<name>.agent.md`
    // file in the target repo). On failure we degrade to the generic
    // `copilot-swe-agent[bot]` assignment + `@copilot use agent <name>`
    // handoff comment as a fallback path.
    this.postMessage({ type: 'loading', active: true, message: `Assigning Copilot Coding Agent (custom agent: ${agent})…` });
    let dispatchNote = '';
    try {
      await this.githubService.assignCustomCopilotAgent(
        meshRepo.owner,
        meshRepo.repo,
        issueNumber,
        agent,
        { customInstructions: trimmed, baseBranch: 'main' },
      );
      dispatchNote = `assigned Copilot Coding Agent with custom agent \`${agent}\``;
    } catch (err) {
      const msg = toErrorMessage(err);
      // Fallback: generic assign + handoff comment. Some accounts may
      // not have custom-agent dispatch enabled yet, or the agent file
      // may not have been redeployed since changes — give the user a
      // working path either way.
      try {
        await this.githubService.assignIssue(meshRepo.owner, meshRepo.repo, issueNumber, ['copilot-swe-agent[bot]']);
        await this.githubService.createIssueComment(
          meshRepo.owner, meshRepo.repo, issueNumber,
          `@copilot use agent ${agent}`,
        );
        dispatchNote = `custom-agent dispatch unavailable (${msg}); fell back to generic Copilot Coding Agent + @-mention`;
      } catch (fallbackErr) {
        this.postMessage({ type: 'error', message: `Both custom-agent dispatch and fallback assignment failed. Custom: ${msg}. Fallback: ${toErrorMessage(fallbackErr)}` });
        this.postMessage({ type: 'loading', active: false });
        return;
      }
    }

    try {
      // Cert-run bug A fix (Task #50) — advance meta.status to the phase's
      // in-flight status BEFORE appendAction. Without this, WHY dispatch
      // leaves meta.status='draft'; the composite finalize's downgrade
      // guard then refuses to roll draft → prd-pending on merge (the
      // guard expects status='researching' as the WHY pre-merge state),
      // so the OKR master status stays stuck at 'draft' post-WHY-merge
      // and the UI summary view never reflects forward progress.
      //
      // For HOW + WHAT this is a no-op (currentMetaStatus already equals
      // the post-prior-merge status set by the prior phase's finalize).
      // isForwardStatusTransition gates against the impossible case
      // where a re-run of WHY fires after later progress shipped.
      const dispatchStatus = spec.currentMetaStatus;
      if (isForwardStatusTransition(card.meta.status, dispatchStatus)) {
        try {
          okrService.updateStatus(meshPath, okrId, dispatchStatus);
        } catch (statusErr) {
          // Non-fatal — appendAction still proceeds, dispatch still
          // happens; finalize's guard will catch this on merge.
          this.postMessage({
            type: 'error',
            message: `Dispatch-time meta.status advance failed (${toErrorMessage(statusErr)}). Dispatch will continue but finalize may skip the master-status roll.`,
          });
        }
      }

      okrService.appendAction(meshPath, okrId, {
        id: actionId,
        phase,
        description: phase === 'why'
          ? 'Market research synthesis (Why)'
          : phase === 'how' ? 'PRD synthesis (How)' : 'Code-design synthesis (What)',
        agent,
        runId,
        // Bug SS — set the canonical artifact path at dispatch time so
        // View Tag (onLoadHatterTag, line ~2370) can resolve the YAML
        // frontmatter without waiting for finalize. Pre-fix this was
        // never set, and View Tag always rendered "No artifact path on
        // this action yet — agent may still be running" for every OKR
        // every phase, even after merge + finalize. The phase-spec
        // already declares the canonical mesh-relative path so dispatch
        // and the agent landing both honor the same contract.
        artifact: spec.artifactPath(okrId),
        intentThreadUuid: card.meta.intentThreadUuid,
        parentIntentThread,
        reviewerScores: {},
        rounds: 0,
        governanceTier: tier,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
      });

      // Commit + push the action immediately so the finalize workflow
      // (which fires on PR merge ~15-60 minutes later) finds the action
      // on remote when it runs `yq select(.runId == "...")`. Without
      // this, if the user forgets to click Commit All before merge,
      // finalize silently no-ops on the action update and the OKR
      // gets stuck in `in_progress` after merge (PR #97 case earlier
      // today). Failure here is non-fatal — the action is in the
      // local file, the issue was created, the user can still recover
      // via Commit All later.
      const dispatchCommitResult = await this.commitAndPushOkrYaml(
        meshPath, okrId, actionId, runId, phase, issueUrl,
      );

      this.postMessage({ type: 'okrPhaseStarted', okrId, phase, actionId, issueUrl });
      void vscode.window.showInformationMessage(
        `Started ${phase.toUpperCase()} for ${okrId}. Issue: ${issueUrl}. ${dispatchNote}. ${dispatchCommitResult}`,
      );
      await this.onDrillIntoOkr(okrId, 'view');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Issue created (${issueUrl}) but failed to update OKR card: ${toErrorMessage(err)}` });
    } finally {
      this.postMessage({ type: 'loading', active: false });
    }
  }

  /**
   * Commit + push the okr.yaml change made by `appendAction` at dispatch
   * time. Best-effort — failure here doesn't abort the dispatch (the
   * issue is already on GitHub and the local file is correct), but it
   * does mean the user has to commit manually before the agent's PR
   * merges or finalize will silently no-op the action.runId selector.
   *
   * Returns a human-readable status fragment for the toast.
   */
  private async commitAndPushOkrYaml(
    meshPath: string,
    okrId: string,
    actionId: string,
    runId: string,
    phase: 'why' | 'how' | 'what',
    issueUrl: string,
  ): Promise<string> {
    const gitRoot = this.gitSyncService.findGitRoot(meshPath);
    if (!gitRoot) { return ''; }
    const okrFilePath = path.join('okrs', okrId, 'okr.yaml');
    try {
      await execFileAsync('git', ['add', okrFilePath], { cwd: gitRoot });
      // Defensive: skip if nothing actually staged (appendAction was a
      // no-op for some reason, or git considered it unchanged).
      const { stdout: staged } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: gitRoot });
      if (!staged.trim()) { return ''; }
      const commitMsg = `chore(okr): ${okrId} ${actionId} ${phase} dispatched (runId=${runId}, issue=${issueUrl})\n\nAuto-committed by Looking Glass at dispatch time so the finalize\nworkflow's runId selector matches when the agent's PR merges.`;
      await execFileAsync('git', ['commit', '-m', commitMsg], { cwd: gitRoot });
      // Push if upstream exists.
      try {
        const { stdout: upstreamCheck } = await execFileAsync(
          'git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
          { cwd: gitRoot },
        );
        if (upstreamCheck.trim()) {
          await execFileAsync('git', ['push'], { cwd: gitRoot, timeout: 30_000 });
          return 'Action committed + pushed.';
        }
        return 'Action committed locally (no upstream branch — push manually).';
      } catch (pushErr) {
        return `Action committed locally — push failed (${toErrorMessage(pushErr)}). Click Pull then push manually.`;
      }
    } catch (err) {
      return `Action saved to file but git commit failed (${toErrorMessage(err)}). Use Commit All before the agent's PR merges.`;
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
    // E2 polish (2026-05-25) — phaseSpec fallback for action.artifact.
    // Bug SS populated action.artifact at dispatch time, but that's
    // forward-only — actions dispatched BEFORE Bug SS landed (any
    // ACT-N in an existing okr.yaml) have artifact = undefined.
    // The artifact path is fully derivable from (phase, okrId) via
    // phaseSpec so we can compute it instead of failing closed. This
    // makes View Tag work on every existing OKR action without
    // requiring a migration of okr.yaml files.
    const artifactRel = action.artifact ?? phaseSpec(action.phase).artifactPath(okrId);
    const artifactPath = path.join(meshPath, artifactRel);
    if (!fs.existsSync(artifactPath)) {
      this.postMessage({ type: 'hatterTagSheet', okrId, actionId, tag: null, reason: `Artifact file missing locally: ${artifactRel}. The PR may not be merged yet (artifact lives on PR head ref), or you need to Pull Mesh.` });
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
   * E1 (2026-05-25) — Verify Chain button handler. Reads the per-run
   * audit JSONL via the GitHub Contents API (PR-aware: pulls from the
   * action's PR head ref when the PR is still open, else from default
   * branch). Runs the in-extension `verifyChainForUI` helper to
   * produce a UI-shaped verdict (Knight's Seal status + per-kind
   * counts + first-failure diagnosis) and ships it to the webview
   * for modal render.
   *
   * Architectural note: this mirrors the runner's `audit-verify-chain`
   * skill for SHAPE only — Ed25519 signature verification needs the
   * pub keys + crypto, which lives in the runner. The modal exposes
   * a "Re-run full verify via runner" link for users who need
   * cryptographic gold. For most reviewer flows, the shape verdict
   * matches CI's runner verdict on every check that doesn't require
   * key material (Bug V/W/X/Y closed the drift between these layers).
   */
  private async onVerifyChain(okrId: string, actionId: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }
    const okrService = this.meshService.getOkrService();
    const card = okrService.read(meshPath, okrId);
    if (!card) {
      this.postMessage({ type: 'chainVerifySheet', okrId, actionId, runId: '', verdict: null, reason: 'OKR not found' });
      return;
    }
    const action = card.actions.find(a => a.id === actionId);
    if (!action) {
      this.postMessage({ type: 'chainVerifySheet', okrId, actionId, runId: '', verdict: null, reason: `Action ${actionId} not found on this OKR` });
      return;
    }
    if (!action.runId) {
      this.postMessage({ type: 'chainVerifySheet', okrId, actionId, runId: '', verdict: null, reason: 'No runId on this action — agent may still be running or pre-Phase B' });
      return;
    }
    // Resolve owner/repo for the Contents API call. Same pattern as
    // onConfirmStartOkrPhase (line ~2110) — meshRepoInfo is populated
    // on panel open but cold-start paths need a fresh git-remote
    // parse. Pre-fix this used an IIFE that called getRemoteOriginUrl
    // WITHOUT await + discarded the result, so a cold-started panel
    // always fell to the local-file fallback and never hit GitHub
    // (Codex E3 review finding, 2026-05-25).
    let repoInfo = this.meshRepoInfo;
    if (!repoInfo) {
      const url = await getRemoteOriginUrl(meshPath);
      const parsed = url ? parseGitHubUrl(url) : null;
      if (parsed) { repoInfo = { owner: parsed.owner, repo: parsed.repo }; }
    }
    const jsonlRelPath = `okrs/${okrId}/audit/events/${action.runId}.jsonl`;
    let jsonlText: string | null = null;
    if (repoInfo) {
      try {
        jsonlText = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, jsonlRelPath);
      } catch { /* fall through to local */ }
    }
    if (jsonlText === null) {
      // Local fallback — useful in dev when the mesh hasn't been
      // pushed, or when GH API is rate-limited.
      const localPath = path.join(meshPath, jsonlRelPath);
      if (fs.existsSync(localPath)) {
        try { jsonlText = fs.readFileSync(localPath, 'utf8'); } catch { /* ignore */ }
      }
    }
    if (jsonlText === null) {
      this.postMessage({ type: 'chainVerifySheet', okrId, actionId, runId: action.runId, verdict: null, reason: `JSONL not found at ${jsonlRelPath} (tried GitHub + local mesh checkout). The chain may not exist yet — finalize writes the workflow events after PR merge.` });
      return;
    }
    const lines = jsonlText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      this.postMessage({ type: 'chainVerifySheet', okrId, actionId, runId: action.runId, verdict: null, reason: 'Chain file exists but contains zero events.' });
      return;
    }
    const verdict = verifyChainForUI(lines);
    this.postMessage({ type: 'chainVerifySheet', okrId, actionId, runId: action.runId, verdict });
  }

  /**
   * E3 (2026-05-25, post-Codex-review) — Export Audit Report handler.
   *
   * Reads okr.yaml + chain JSONL + chain-ladder.yaml from CANONICAL
   * GITHUB MAIN via Contents API (not local mesh disk). Pre-fix the
   * handler read all three from local mesh, which reintroduces the
   * stale-branch class of failure Bug QQ/A-plus closed for writes:
   * a closeout artifact for fan-out MUST source from the same place
   * CI reads from, not whatever happens to be on the user's local
   * checkout. The exported file is still written locally (under
   * okrs/<id>/audit/exports/) so the user can commit it; only the
   * inputs are reads-from-main.
   *
   * Local fallback (used only when GitHub API call fails — offline /
   * rate-limited / token missing) keeps dev-loop usable but the
   * resulting report names which source it used in the prose so a
   * reviewer can tell whether they're looking at a canonical or a
   * local-state export.
   */
  private async onExportAuditReport(okrId: string, actionId: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    // Codex E3-gold review (2026-05-25): fetch canonical okr.yaml
    // FIRST, derive runId from the canonical action, THEN fetch
    // chain/ladder/PRD/artifact keyed by the canonical runId.
    //
    // Pre-fix the handler read the LOCAL action's runId before any
    // GitHub call, then used that local runId to fetch the remote
    // JSONL. If local state was stale (e.g. user dispatched a new
    // run, local push hasn't reached origin yet, or main has a
    // newer action than local), the report could combine canonical
    // action metadata with the wrong chain — silent corruption a
    // reviewer wouldn't notice until they hit a mismatch.
    //
    // Now: GitHub okr.yaml is the source of truth for both metadata
    // AND the runId used to key downstream fetches. Local card is
    // ONLY used as fallback when remote fetch fails entirely.
    const okrService = this.meshService.getOkrService();

    // Resolve owner/repo for Contents API. Same pattern as elsewhere.
    let repoInfo = this.meshRepoInfo;
    if (!repoInfo) {
      const url = await getRemoteOriginUrl(meshPath);
      const parsed = url ? parseGitHubUrl(url) : null;
      if (parsed) { repoInfo = { owner: parsed.owner, repo: parsed.repo }; }
    }

    // Codex E3-gold-r4 (2026-05-25) — per-input source tracking.
    //
    // Every input gets its own `*Source` local. The handler composes
    // an AuditReportInputSources object at the end and passes it to
    // buildAuditReportMarkdown so the report renders an explicit
    // breakdown. Atomicity decisions (runner invocation, PRD
    // suppression, sourceTag composition) all key off these per-
    // input states — no more bundling everything under a single
    // sourceTag string that hid divergence in r3.
    //
    // Mode: when okr.yaml comes from GitHub, the report claims
    // "canonical" state. Every other input MUST come from GitHub OR
    // (in the case of locally-resident files the runner reads) MUST
    // match GitHub bytes — or the runner is NOT invoked and the
    // input is suppressed/labelled accordingly. When okr.yaml falls
    // back to local, the report is honest local-mesh state and all
    // inputs are read locally (atomic by common source).

    // Step 1: fetch canonical okr.yaml from GitHub main. Local fallback
    // only on failure.
    const okrYamlRelPath = `okrs/${okrId}/okr.yaml`;
    let okrYamlText: string | null = null;
    let okrSource: 'github' | 'local-fallback' = 'local-fallback';
    if (repoInfo) {
      try {
        okrYamlText = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, okrYamlRelPath);
        if (okrYamlText) { okrSource = 'github'; }
      } catch { /* fall through to local */ }
    }
    if (!okrYamlText) {
      const okrPath = path.join(meshPath, okrYamlRelPath);
      if (!fs.existsSync(okrPath)) {
        this.postMessage({ type: 'error', message: `okr.yaml missing on GitHub main AND local mesh: ${okrYamlRelPath}. Pull mesh + wait for finalize push, then retry.` });
        return;
      }
      try { okrYamlText = fs.readFileSync(okrPath, 'utf8'); }
      catch (err) {
        this.postMessage({ type: 'error', message: `Failed to read local okr.yaml fallback: ${toErrorMessage(err)}` });
        return;
      }
      okrSource = 'local-fallback';
    }

    // Step 2: parse canonical okr.yaml + find the action by id. The
    // runId comes from CANONICAL state, NOT local — this is the
    // Codex E3-gold blocking fix from r2.
    let actionYaml: Record<string, unknown> | null = null;
    try {
      const parsed = YAML.parse(okrYamlText) as { actions?: Array<Record<string, unknown>> };
      actionYaml = (parsed.actions ?? []).find(a => a['id'] === actionId) ?? null;
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to parse okr.yaml (source: ${okrSource}): ${toErrorMessage(err)}` });
      return;
    }
    if (!actionYaml) {
      this.postMessage({ type: 'error', message: `Action ${actionId} not in ${okrSource} okr.yaml. May not be pushed yet — wait for finalize to land, then retry.` });
      return;
    }
    const runId = actionYaml['runId'] as string | undefined;
    if (!runId) {
      this.postMessage({ type: 'error', message: `Canonical action ${actionId} has no runId (source: ${okrSource}). Cannot derive chain path.` });
      return;
    }

    // Local card is now ONLY used as a fallback source for fields
    // missing from the canonical action object (rare; defensive).
    const localCard = okrService.read(meshPath, okrId);
    const localAction = localCard?.actions.find(a => a.id === actionId);

    // Step 3a: fetch chain JSONL keyed by CANONICAL runId.
    //
    // Codex E3-gold-r4: JSONL is fetched SEPARATELY from the ladder.
    // Pre-fix used `Promise.all([JSONL, ladder])` — if ladder fetch
    // threw, JSONL was discarded and BOTH fell back to local, but
    // sourceTag still said GitHub and the atomicity guard compared
    // local-vs-local and trivially passed. Now: each input fails
    // independently and is labelled with its actual provenance.
    const jsonlRelPath = `okrs/${okrId}/audit/events/${runId}.jsonl`;
    let chainText: string | null = null;
    let chainSource: 'github' | 'local-fallback' = 'local-fallback';
    if (repoInfo && okrSource === 'github') {
      try {
        chainText = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, jsonlRelPath);
        if (chainText) { chainSource = 'github'; }
      } catch { /* fall through to local */ }
    }
    if (!chainText) {
      const jsonlPath = path.join(meshPath, jsonlRelPath);
      if (!fs.existsSync(jsonlPath)) {
        this.postMessage({ type: 'error', message: `Audit JSONL not found on GitHub OR locally: ${jsonlRelPath}. Chain may not exist yet — finalize writes workflow events after PR merge.` });
        return;
      }
      try { chainText = fs.readFileSync(jsonlPath, 'utf8'); }
      catch (err) {
        this.postMessage({ type: 'error', message: `Failed to read chain JSONL: ${toErrorMessage(err)}` });
        return;
      }
      chainSource = 'local-fallback';
    }

    // Step 3b: fetch chain-ladder.yaml independently (optional input;
    // failure does NOT force JSONL fallback — that was the r3 hole).
    //
    // Codex E3-gold-r5 (2026-05-25) — ladder follows the same
    // suppress-non-canonical rule as PRD/artifact. Pre-r5 we silently
    // fell back to local chain-ladder.yaml even in canonical mode,
    // which let a stale local cross-phase ladder render in an
    // otherwise canonical closeout under a "GitHub canonical" headline.
    // Now: in canonical mode, fetch from GitHub or suppress (don't
    // substitute local). In local-fallback mode, local is canonical
    // for this report so reading locally is atomic.
    const ladderRelPath = `okrs/${okrId}/audit/chain-ladder.yaml`;
    let chainLadderText: string | null = null;
    let ladderSource: 'github' | 'local-fallback' | 'missing' | 'suppressed-non-canonical' = 'missing';
    if (repoInfo && okrSource === 'github') {
      try {
        chainLadderText = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, ladderRelPath);
        if (chainLadderText) { ladderSource = 'github'; }
      } catch { /* optional */ }
      // Canonical mode + GitHub fetch failed but local exists →
      // suppress instead of silently substituting.
      if (!chainLadderText && fs.existsSync(path.join(meshPath, ladderRelPath))) {
        ladderSource = 'suppressed-non-canonical';
      }
    } else if (!chainLadderText) {
      // Local-fallback mode — local IS the canonical source for this
      // report, so reading the local ladder is atomic.
      const ladderPath = path.join(meshPath, ladderRelPath);
      if (fs.existsSync(ladderPath)) {
        try {
          chainLadderText = fs.readFileSync(ladderPath, 'utf8');
          ladderSource = 'local-fallback';
        } catch { /* keep missing */ }
      }
    }

    const chainLines = chainText.split('\n').filter(l => l.trim().length > 0);
    const verdict = verifyChainForUI(chainLines);

    // Step 4: keys atomicity check + runner invocation.
    //
    // Codex E3-gold-r4 BLOCKING fix #2 — see decideRunnerInvocation()
    // for the full decision tree. Extracted out of the handler to keep
    // cyclomatic complexity under the architecture-fitness budget AND
    // to make the rules testable in isolation.
    const signerEpochs = extractSignerEpochs(chainLines);
    const decision = await this.decideRunnerInvocation({
      okrId, runId, okrSource, chainSource, chainText, jsonlRelPath, meshPath, repoInfo, signerEpochs,
    });
    const keysSource = decision.keysSource;
    const runnerInputSource = decision.runnerInputSource;
    const runnerVerdict = decision.runnerVerdict;

    // Step 5: PRD + artifact fetch — source-discipline rules. See
    // fetchPrdAndArtifact() for the suppress-non-canonical rule.
    const phase = ((actionYaml['phase'] as 'why' | 'how' | 'what' | undefined) ?? localAction?.phase) as 'why' | 'how' | 'what';
    if (!phase) {
      this.postMessage({ type: 'error', message: `Canonical action ${actionId} has no phase field.` });
      return;
    }
    const artifactRel = ((actionYaml['artifact'] as string | undefined) ?? localAction?.artifact) ?? phaseSpec(phase).artifactPath(okrId);
    const prdRel = `okrs/${okrId}/how/prd.md`;
    const { prdText, prdSource, artifactText, artifactSource } = await this.fetchPrdAndArtifact({
      okrSource, repoInfo, prdRel, artifactRel, meshPath,
    });

    // Compose AuditReportInputSources for the renderer + the headline
    // sourceTag string. The sourceTag is the human-readable headline;
    // the structured `sources` object is what powers the per-input
    // breakdown table inside Trust posture.
    const sources: AuditReportInputSources = {
      okr: okrSource,
      chain: chainSource,
      ladder: ladderSource,
      keys: keysSource,
      prd: prdSource,
      artifact: artifactSource,
      runnerInput: runnerInputSource,
    };
    // Codex E3-gold-r5-followup — sourceTag composition extracted
    // to composeSourceTag() so the canonicality predicate has direct
    // unit-test coverage. See AuditReportExporter.composeSourceTag
    // for the precedence rules; the helper guarantees that any of
    // keys=mismatch/missing or runnerInput=jsonl-mismatch/missing
    // produces a MIXED tag, never a GitHub canonical headline.
    const sourceTag = composeSourceTag(sources, repoInfo);

    const markdown = buildAuditReportMarkdown({
      okrId,
      runId,
      phase,
      actionId,
      agent: (actionYaml['agent'] as string | undefined) ?? localAction?.agent ?? '',
      intentThreadUuid: (actionYaml['intentThreadUuid'] as string | undefined) ?? localAction?.intentThreadUuid ?? '',
      parentIntentThread: (actionYaml['parentIntentThread'] as string | null | undefined) ?? localAction?.parentIntentThread ?? null,
      governanceTier: (actionYaml['governanceTier'] as string | undefined) ?? localAction?.governanceTier ?? '',
      status: (actionYaml['status'] as string | undefined) ?? localAction?.status ?? '',
      createdAt: (actionYaml['createdAt'] as string | undefined) ?? localAction?.createdAt ?? null,
      completedAt: (actionYaml['completedAt'] as string | undefined) ?? localAction?.completedAt ?? null,
      hatterChainRoot: (actionYaml['hatterChainRoot'] as string | undefined) ?? localAction?.hatterChainRoot ?? null,
      prUrl: (actionYaml['pr'] as string | undefined) ?? localAction?.pr ?? null,
      artifactPath: artifactRel,
      chainLines,
      chainLadderText,
      verdict,
      sourceTag,
      runnerVerdict,
      prdText,
      artifactText,
      sources,
    });
    const exportDir = path.join(meshPath, `okrs/${okrId}/audit/exports`);
    const exportPath = path.join(exportDir, `${runId}-report.md`);
    try {
      fs.mkdirSync(exportDir, { recursive: true });
      fs.writeFileSync(exportPath, markdown, 'utf8');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to write audit report: ${toErrorMessage(err)}` });
      return;
    }
    // Open the new file in VS Code so the user sees it immediately.
    try {
      const uri = vscode.Uri.file(exportPath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch { /* non-fatal — file's still on disk */ }
    const runnerNote = runnerVerdict.invoked
      ? (runnerVerdict.ok ? ' · runner verdict: PASS' : ' · runner verdict: FAIL')
      : ' · runner: NOT INVOKED';
    void vscode.window.showInformationMessage(`Audit report exported${runnerNote}: okrs/${okrId}/audit/exports/${runId}-report.md`);
  }

  /**
   * Codex E3-gold-r4 (2026-05-25) — verify that the runner's pub-key
   * inputs are atomic with the report's claimed source.
   *
   * The runner verifier loads keys from local
   * `audit/keys/<runId>.epoch-N.pub.pem`. Codex caught that without
   * a per-key atomicity check, a stale or modified local key could
   * make the runner verify against different cryptographic material
   * than the report cites — best case a false FAIL on innocent CI,
   * worst case a false PASS that masks local tampering.
   *
   * Two modes:
   *   - `canonical-github`: caller is in canonical mode (okr came
   *     from GitHub). For every distinct signer_epoch in the chain,
   *     fetch the canonical pub key from GitHub and byte-compare to
   *     the local copy. Any miss/mismatch ⇒ `mismatch` | `missing`
   *     and caller MUST NOT invoke the runner.
   *   - `local-only`: caller is in local-fallback mode. Local IS
   *     the canonical source for this report, so the check reduces
   *     to "do the expected key files exist locally?".
   *
   * `not-checked` is returned when the chain has zero distinct
   * signer_epoch values (workflow-only chain, WHY phase) — the
   * runner has no Ed25519 work to do, so atomicity of keys is moot.
   */
  private async verifyKeysAtomicity(
    okrId: string,
    runId: string,
    signerEpochs: Set<number>,
    mode: 'canonical-github' | 'local-only',
    repoInfo: { owner: string; repo: string } | null,
  ): Promise<{ keysSource: 'github-verified' | 'local-only' | 'mismatch' | 'missing' | 'not-checked'; reason?: string }> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) { return { keysSource: 'missing', reason: 'No mesh path resolved' }; }
    if (signerEpochs.size === 0) { return { keysSource: 'not-checked' }; }
    for (const epoch of signerEpochs) {
      const keyRel = `okrs/${okrId}/audit/keys/${runId}.epoch-${epoch}.pub.pem`;
      const localKeyPath = path.join(meshPath, keyRel);
      if (!fs.existsSync(localKeyPath)) {
        return {
          keysSource: 'missing',
          reason: `Public key for epoch ${epoch} missing locally — runner verifier reads keys from local disk and cannot verify signatures without it: ${keyRel}`,
        };
      }
      if (mode === 'canonical-github') {
        if (!repoInfo) {
          return { keysSource: 'missing', reason: 'Canonical mode requires repoInfo to fetch canonical keys' };
        }
        let githubBytes: string | null = null;
        try {
          githubBytes = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, keyRel);
        } catch (err) {
          return {
            keysSource: 'missing',
            reason: `Failed to fetch canonical key for epoch ${epoch} from GitHub (${keyRel}): ${toErrorMessage(err)}`,
          };
        }
        if (!githubBytes) {
          return {
            keysSource: 'missing',
            reason: `Canonical key for epoch ${epoch} not present on GitHub default branch: ${keyRel}`,
          };
        }
        let localBytes: string;
        try {
          localBytes = fs.readFileSync(localKeyPath, 'utf8');
        } catch (err) {
          return {
            keysSource: 'missing',
            reason: `Failed to read local key for epoch ${epoch} (${keyRel}): ${toErrorMessage(err)}`,
          };
        }
        if (localBytes !== githubBytes) {
          return {
            keysSource: 'mismatch',
            reason: `Local public key for epoch ${epoch} does NOT match canonical GitHub bytes (${keyRel}). Runner would verify against different cryptographic material than this report references. Run \`git pull\` and retry.`,
          };
        }
      }
    }
    return { keysSource: mode === 'canonical-github' ? 'github-verified' : 'local-only' };
  }

  /**
   * Codex E3-gold-r4 (2026-05-25) — runner-invocation decision tree.
   *
   * Extracted from onExportAuditReport because (a) the if/else cascade
   * was driving handler complexity past the architecture-fitness budget
   * and (b) the atomicity rules deserve direct, isolated comment cover.
   *
   * Rule precedence (top → bottom is most-restrictive → least):
   *   1. okr=github + chain=local-fallback → atomicity broken; do not
   *      invoke. The report shows canonical metadata but the runner
   *      would verify local bytes — a chief-auditor trust violation.
   *   2. keys mismatch/missing → do not invoke. Runner verifies against
   *      local key files; if they don't match canonical bytes (or
   *      aren't present), verdict would describe untrusted cryptographic
   *      material.
   *   3. keys not-checked (no signed agent events) → do not invoke;
   *      runner has no Ed25519 work to do. Normal for WHY phase and
   *      pure-workflow chains.
   *   4. okr=github (atomic so far) → also confirm local JSONL bytes
   *      match canonical chainText before invoking. Belt-and-braces:
   *      keys atomicity is the new gate but per-event chain hash replay
   *      depends on the chain bytes themselves matching too.
   *   5. okr=local-fallback → invoke. Chain+keys are all local; runner
   *      verifies local, report shows local. Atomic by common source.
   */
  private async decideRunnerInvocation(params: {
    okrId: string;
    runId: string;
    okrSource: 'github' | 'local-fallback';
    chainSource: 'github' | 'local-fallback';
    chainText: string;
    jsonlRelPath: string;
    meshPath: string;
    repoInfo: { owner: string; repo: string } | undefined | null;
    signerEpochs: Set<number>;
  }): Promise<{
    runnerVerdict: RunnerVerifyVerdict;
    keysSource: AuditReportInputSources['keys'];
    runnerInputSource: AuditReportInputSources['runnerInput'];
  }> {
    const { okrId, runId, okrSource, chainSource, chainText, jsonlRelPath, meshPath, repoInfo, signerEpochs } = params;
    const keysVerdict = await this.verifyKeysAtomicity(
      okrId,
      runId,
      signerEpochs,
      okrSource === 'github' ? 'canonical-github' : 'local-only',
      okrSource === 'github' ? repoInfo ?? null : null,
    );
    const keysSource = keysVerdict.keysSource;

    // Rule 1: canonical mode but chain fell back. Atomicity broken.
    if (okrSource === 'github' && chainSource === 'local-fallback') {
      return {
        keysSource,
        runnerInputSource: 'not-applicable',
        runnerVerdict: {
          invoked: false,
          reason: 'Source atomicity broken: okr.yaml is canonical GitHub but chain JSONL fell back to local. Runner would verify bytes other than what this report shows. Run `git pull` in your mesh checkout and retry the export.',
        },
      };
    }
    // Rule 2: key files don't match canonical (or are missing).
    if (keysSource === 'mismatch' || keysSource === 'missing') {
      return {
        keysSource,
        runnerInputSource: 'not-applicable',
        runnerVerdict: {
          invoked: false,
          reason: keysVerdict.reason ?? 'Key atomicity check failed (no specific reason)',
        },
      };
    }
    // Rule 3: no signed agent events — runner has no work.
    if (keysSource === 'not-checked') {
      return {
        keysSource,
        runnerInputSource: 'not-applicable',
        runnerVerdict: {
          invoked: false,
          reason: 'Chain contains no signed agent events with signer_epoch — runner verifier has no Ed25519 work to do on this chain (expected for WHY phase / workflow-only chains).',
        },
      };
    }
    // Rule 4: canonical mode — also confirm local JSONL bytes match
    // canonical chainText (belt-and-braces; keys atomicity passes but
    // chain bytes themselves still need to match the report).
    //
    // Codex E3-gold-r5 BLOCKING fix: this branch now also returns a
    // structural `runnerInputSource` value (jsonl-missing /
    // jsonl-mismatch / github-verified) so the executive summary can
    // see the atomicity break in the sources object instead of
    // relying on parsing runnerVerdict.reason text. Pre-r5 the
    // exec summary fell through to SHAPE-CLEARED whenever runnerVerdict
    // was {invoked:false}, even when the underlying cause was a real
    // atomicity violation.
    if (okrSource === 'github') {
      const localJsonlPath = path.join(meshPath, jsonlRelPath);
      const localJsonl = fs.existsSync(localJsonlPath)
        ? (() => { try { return fs.readFileSync(localJsonlPath, 'utf8'); } catch { return null; } })()
        : null;
      if (localJsonl === null) {
        return {
          keysSource,
          runnerInputSource: 'jsonl-missing',
          runnerVerdict: {
            invoked: false,
            reason: 'Local mesh does not have a JSONL at the canonical path; runner shells out against local disk and cannot verify the GitHub-fetched bytes shown in this report. Run `git pull` in your mesh checkout and retry the export.',
          },
        };
      }
      if (localJsonl !== chainText) {
        return {
          keysSource,
          runnerInputSource: 'jsonl-mismatch',
          runnerVerdict: {
            invoked: false,
            reason: 'Local mesh JSONL does not match canonical GitHub source — runner would have verified different bytes than this report displays. Run `git pull` in your mesh checkout to sync, then retry the export.',
          },
        };
      }
      return {
        keysSource,
        runnerInputSource: 'github-verified',
        runnerVerdict: await this.invokeRunnerVerifyChain(okrId, runId),
      };
    }
    // Rule 5: local-fallback mode — atomic by common source.
    return {
      keysSource,
      runnerInputSource: 'local-only',
      runnerVerdict: await this.invokeRunnerVerifyChain(okrId, runId),
    };
  }

  /**
   * Codex E3-gold-r4 (2026-05-25) — fetch PRD + artifact with the
   * suppress-non-canonical atomicity rule.
   *
   * In canonical mode (okr came from GitHub), if a PRD/artifact fetch
   * fails OR returns null, we DO NOT silently fall back to local —
   * doing so would let the control-mapping section render canonical
   * chain metadata next to possibly-stale local design text under the
   * "GitHub canonical" headline. Instead, we suppress the input (pass
   * null to the report) and label it `suppressed-non-canonical` in
   * the sources breakdown so the auditor sees the gap.
   *
   * In local-fallback mode, local IS the canonical source for this
   * report, so reading PRD/artifact locally is atomic.
   */
  private async fetchPrdAndArtifact(params: {
    okrSource: 'github' | 'local-fallback';
    repoInfo: { owner: string; repo: string } | undefined | null;
    prdRel: string;
    artifactRel: string;
    meshPath: string;
  }): Promise<{
    prdText: string | null;
    prdSource: AuditReportInputSources['prd'];
    artifactText: string | null;
    artifactSource: AuditReportInputSources['artifact'];
  }> {
    const { okrSource, repoInfo, prdRel, artifactRel, meshPath } = params;
    let prdText: string | null = null;
    let prdSource: AuditReportInputSources['prd'] = 'missing';
    let artifactText: string | null = null;
    let artifactSource: AuditReportInputSources['artifact'] = 'missing';

    if (repoInfo && okrSource === 'github') {
      try {
        prdText = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, prdRel);
        if (prdText) { prdSource = 'github'; }
      } catch { /* suppression check below */ }
      try {
        artifactText = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, artifactRel);
        if (artifactText) { artifactSource = 'github'; }
      } catch { /* suppression check below */ }
      if (!prdText && fs.existsSync(path.join(meshPath, prdRel))) {
        prdSource = 'suppressed-non-canonical';
      }
      if (!artifactText && fs.existsSync(path.join(meshPath, artifactRel))) {
        artifactSource = 'suppressed-non-canonical';
      }
      return { prdText, prdSource, artifactText, artifactSource };
    }
    // local-fallback mode
    const localPrd = path.join(meshPath, prdRel);
    if (fs.existsSync(localPrd)) {
      try {
        prdText = fs.readFileSync(localPrd, 'utf8');
        prdSource = 'local-fallback';
      } catch { /* keep missing */ }
    }
    const localArtifact = path.join(meshPath, artifactRel);
    if (fs.existsSync(localArtifact)) {
      try {
        artifactText = fs.readFileSync(localArtifact, 'utf8');
        artifactSource = 'local-fallback';
      } catch { /* keep missing */ }
    }
    return { prdText, prdSource, artifactText, artifactSource };
  }

  /**
   * E3-gold (Codex review, 2026-05-25) — invoke the runner's crypto
   * verifier via `npx ... skill-audit-verify-chain` with stdin JSON.
   * Returns a RunnerVerifyVerdict the exporter renders. Best-effort:
   * timeouts, missing npx, runner crashes all surface as
   * `{ invoked: false, reason }` so the report is honest about
   * whether gold verification ran.
   *
   * Timeout chosen at 90s — first npx run downloads the runner pkg
   * (~5-15s on a warm cache, longer cold). Subsequent runs in the
   * same VS Code session reuse the cache and complete in 2-5s.
   */
  private async invokeRunnerVerifyChain(okrId: string, runId: string): Promise<RunnerVerifyVerdict> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      return { invoked: false, reason: 'No mesh configured.' };
    }
    const stdinJson = JSON.stringify({ okrId, runId });
    return new Promise<RunnerVerifyVerdict>((resolve) => {
      // execFile doesn't pipe stdin — use spawn so we can write the
      // okrId/runId JSON to the runner's stdin (per SKILL.md contract).
      const child = childSpawn('npx', ['-y', '@maintainabilityai/research-runner@~0.1.42', 'skill-audit-verify-chain'], {
        cwd: meshPath,
      });
      let stdout = '';
      let stderr = '';
      let resolved = false;
      const finish = (verdict: RunnerVerifyVerdict) => {
        if (resolved) { return; }
        resolved = true;
        try { child.kill(); } catch { /* already dead */ }
        clearTimeout(killTimer);
        resolve(verdict);
      };
      const killTimer = setTimeout(() => {
        finish({ invoked: false, reason: 'Shell-out to npx timed out after 90s. First-run package download may be blocked — pre-warm cache by running the command from the Verifier notes section in a terminal first.' });
      }, 90_000);
      child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
      child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
      child.on('error', (err) => {
        const msg = err.message ?? String(err);
        if (msg.includes('ENOENT')) {
          finish({ invoked: false, reason: 'npx not found on PATH. Install Node.js (and ensure npx is reachable from VS Code\'s shell) to enable in-extension runner verification.' });
          return;
        }
        finish({ invoked: false, reason: `Shell-out failed: ${msg}` });
      });
      child.on('close', (code) => {
        // Codex E3-gold-r3: parsing logic extracted to
        // `parseRunnerVerdictFromStdout` (services/AuditReportExporter.ts)
        // so it has direct unit-test coverage. Handler is now a thin
        // shim over the pure helper.
        finish(parseRunnerVerdictFromStdout(stdout, stderr, code ?? -1));
      });
      try {
        child.stdin?.write(stdinJson);
        child.stdin?.end();
      } catch (err) {
        finish({ invoked: false, reason: `Failed to write to runner stdin: ${toErrorMessage(err)}` });
      }
    });
  }

  /**
   * Phase E E4 (2026-05-25) — Whole-OKR audit rollup export handler.
   *
   * Closes a long-standing UX bug: the OKR-detail footer's `📦 Export
   * Audit Report` button was disabled with `title="Phase E feature"`
   * ever since Phase E shipped the per-action export. This handler is
   * what that button was always meant to do — generate a single
   * auditor-grade markdown document combining ALL 3 phases (WHY + HOW +
   * WHAT) of an OKR into a whole-OKR rollup at
   * `okrs/<id>/audit/exports/<okrId>-rollup.md`.
   *
   * Architecture: every phase digest comes from the SAME code paths the
   * per-action exporter uses (decideRunnerInvocation, verifyKeysAtomicity,
   * fetchPrdAndArtifact, composeSourceTag). No parallel verifier logic —
   * the rollup is a loop over the per-phase trust posture machinery.
   *
   * Trust precedence (see buildOkrRollupMarkdown):
   *   FAIL    — any completed phase: missing evidence, runner FAILED, or
   *             source atomicity broken
   *   PARTIAL — OKR isn't complete (one or more of WHY/HOW/WHAT missing)
   *   PASS    — all 3 phases present, runner-verified, source-atomic
   */
  private async onExportOkrRollup(okrId: string): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    if (!meshPath) {
      this.postMessage({ type: 'error', message: 'No mesh configured' });
      return;
    }

    // Step 1: fetch canonical okr.yaml — same source-discipline pattern
    // as onExportAuditReport. Canonical-first; local-fallback on failure.
    let repoInfo = this.meshRepoInfo;
    if (!repoInfo) {
      const url = await getRemoteOriginUrl(meshPath);
      const parsed = url ? parseGitHubUrl(url) : null;
      if (parsed) { repoInfo = { owner: parsed.owner, repo: parsed.repo }; }
    }
    const okrYamlRelPath = `okrs/${okrId}/okr.yaml`;
    let okrYamlText: string | null = null;
    let okrSource: 'github' | 'local-fallback' = 'local-fallback';
    if (repoInfo) {
      try {
        okrYamlText = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, okrYamlRelPath);
        if (okrYamlText) { okrSource = 'github'; }
      } catch { /* fall through to local */ }
    }
    if (!okrYamlText) {
      const okrPath = path.join(meshPath, okrYamlRelPath);
      if (!fs.existsSync(okrPath)) {
        this.postMessage({ type: 'error', message: `okr.yaml missing on GitHub main AND local mesh: ${okrYamlRelPath}.` });
        return;
      }
      try { okrYamlText = fs.readFileSync(okrPath, 'utf8'); }
      catch (err) {
        this.postMessage({ type: 'error', message: `Failed to read local okr.yaml fallback: ${toErrorMessage(err)}` });
        return;
      }
      okrSource = 'local-fallback';
    }

    // Step 2: parse okr.yaml to extract identity + actions list.
    let okrParsed: {
      meta?: { id?: string; owner?: string };
      objective?: { name?: string };
      objectiveAlignment?: { affectedBarIds?: string[] };
      actions?: Array<Record<string, unknown>>;
    };
    try {
      okrParsed = YAML.parse(okrYamlText) as typeof okrParsed;
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to parse okr.yaml (source: ${okrSource}): ${toErrorMessage(err)}` });
      return;
    }
    const actions = okrParsed.actions ?? [];

    // Step 3: identify which phases are started (have runId) and which
    // are missing. Sort started phases WHY → HOW → WHAT regardless of
    // append order in okr.yaml.
    const phaseOrder: Array<'why' | 'how' | 'what'> = ['why', 'how', 'what'];
    const startedActions: Array<{ phase: 'why' | 'how' | 'what'; action: Record<string, unknown> }> = [];
    const seenPhases = new Set<'why' | 'how' | 'what'>();
    for (const ph of phaseOrder) {
      const found = actions.find(a => a['phase'] === ph && typeof a['runId'] === 'string' && (a['runId'] as string).length > 0);
      if (found) {
        startedActions.push({ phase: ph, action: found });
        seenPhases.add(ph);
      }
    }
    const missingPhases = phaseOrder.filter(ph => !seenPhases.has(ph));

    // Step 4: for each started phase, run the same per-phase flow the
    // per-action exporter uses. Produce a PhaseRollupDigest.
    //
    // Codex E4-r1 MINOR fix: collect {phase, sources} pairs (not bare
    // sources[]) so composeOkrRollupSourceTag can label failing phases
    // by their actual identity instead of array position. Sequential
    // OKRs were unaffected pre-fix; malformed/reset OKRs where the
    // started-phases array didn't start at WHY would mislabel.
    const phaseDigests: PhaseRollupDigest[] = [];
    const phaseSources: Array<{ phase: 'why' | 'how' | 'what'; sources: AuditReportInputSources }> = [];
    for (const { phase, action } of startedActions) {
      const digest = await this.buildPhaseRollupDigest(okrId, phase, action, okrSource, repoInfo, meshPath);
      phaseDigests.push(digest);
      phaseSources.push({ phase: digest.phase, sources: digest.sources });
    }

    // Step 5: fetch chain-ladder.yaml ONCE for the whole OKR. Same
    // suppress-non-canonical discipline as per-action.
    const ladderRelPath = `okrs/${okrId}/audit/chain-ladder.yaml`;
    let chainLadderText: string | null = null;
    let ladderSource: AuditReportInputSources['ladder'] = 'missing';
    if (repoInfo && okrSource === 'github') {
      try {
        chainLadderText = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, ladderRelPath);
        if (chainLadderText) { ladderSource = 'github'; }
      } catch { /* optional */ }
      if (!chainLadderText && fs.existsSync(path.join(meshPath, ladderRelPath))) {
        ladderSource = 'suppressed-non-canonical';
      }
    } else if (okrSource === 'local-fallback') {
      const ladderPath = path.join(meshPath, ladderRelPath);
      if (fs.existsSync(ladderPath)) {
        try {
          chainLadderText = fs.readFileSync(ladderPath, 'utf8');
          ladderSource = 'local-fallback';
        } catch { /* keep missing */ }
      }
    }

    // Step 6: unioned control coverage — find HOW phase's PRD + WHAT
    // phase's artifact, fetch each (suppress-non-canonical discipline),
    // call extractControlMapping. If either is suppressed/missing, the
    // renderer honors the suppression with a "not rendered" note.
    const howAction = startedActions.find(s => s.phase === 'how')?.action;
    const whatAction = startedActions.find(s => s.phase === 'what')?.action;
    const prdRel = `okrs/${okrId}/how/prd.md`;
    const whatArtifactRel = (whatAction?.['artifact'] as string | undefined) ?? `okrs/${okrId}/what/code-design.md`;
    // fetchPrdAndArtifact only fires when we have at least one of the
    // two phases to look at — otherwise control mapping is trivially
    // missing.
    let controlRows: ReturnType<typeof extractControlMapping> = [];
    let prdSource: AuditReportInputSources['prd'] = 'missing';
    let artifactSource: AuditReportInputSources['artifact'] = 'missing';
    if (howAction || whatAction) {
      const fetched = await this.fetchPrdAndArtifact({ okrSource, repoInfo, prdRel, artifactRel: whatArtifactRel, meshPath });
      prdSource = fetched.prdSource;
      artifactSource = fetched.artifactSource;
      controlRows = extractControlMapping(fetched.prdText, fetched.artifactText);
    }

    // Step 7: compose OKR-level sourceTag from per-phase sources.
    const sourceTag = composeOkrRollupSourceTag(phaseSources, repoInfo);

    // Step 8: assemble identity fields + completedAt heuristic. The
    // OKR's completedAt is the latest completedAt across all phases
    // (last-completed-phase wins); null if any started phase is still
    // in progress.
    const lastCompletedAt = phaseDigests
      .map(d => d.completedAt)
      .filter((c): c is string => !!c)
      .sort()
      .pop() ?? null;
    const allStartedComplete = phaseDigests.length > 0 && phaseDigests.every(d => d.completedAt);
    const okrCompletedAt = allStartedComplete && missingPhases.length === 0 ? lastCompletedAt : null;

    const rollupInput: OkrRollupInput = {
      okrId,
      objective: okrParsed.objective?.name ?? null,
      owner: okrParsed.meta?.owner ?? null,
      tier: (phaseDigests[0]?.status === undefined
        ? null
        : (startedActions[0]?.action['governanceTier'] as string | undefined) ?? null),
      barId: okrParsed.objectiveAlignment?.affectedBarIds?.[0] ?? null,
      // okr.yaml meta block has createdAt at meta.createdAt — parse loosely.
      createdAt: ((okrParsed.meta as { createdAt?: string } | undefined)?.createdAt) ?? null,
      completedAt: okrCompletedAt,
      phases: phaseDigests,
      missingPhases,
      chainLadderText,
      ladderSource,
      controlRows,
      prdSource,
      artifactSource,
      sourceTag,
      // Codex E4-r1 MAJOR fix: thread repoInfo through so per-phase
      // Trust posture blocks render the canonical headline (not MIXED)
      // when a phase's sources match the OKR-level canonical state.
      repoInfo: repoInfo ?? null,
    };

    const markdown = buildOkrRollupMarkdown(rollupInput);
    const exportDir = path.join(meshPath, `okrs/${okrId}/audit/exports`);
    const exportPath = path.join(exportDir, `${okrId}-rollup.md`);
    try {
      fs.mkdirSync(exportDir, { recursive: true });
      fs.writeFileSync(exportPath, markdown, 'utf8');
    } catch (err) {
      this.postMessage({ type: 'error', message: `Failed to write OKR rollup: ${toErrorMessage(err)}` });
      return;
    }
    try {
      const uri = vscode.Uri.file(exportPath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch { /* non-fatal — file's still on disk */ }
    const { verdict } = computeOkrRollupVerdict(rollupInput);
    void vscode.window.showInformationMessage(`OKR rollup exported · verdict: ${verdict}: okrs/${okrId}/audit/exports/${okrId}-rollup.md`);
  }

  /**
   * E4 (2026-05-25) — build one PhaseRollupDigest from a canonical
   * okr.yaml action entry. Extracted out of onExportOkrRollup to keep
   * that handler under the architecture-fitness budget AND to make the
   * per-phase assembly testable in isolation if/when needed.
   *
   * Reuses the SAME per-phase trust machinery the per-action exporter
   * uses (decideRunnerInvocation → verifyKeysAtomicity → invokeRunner).
   * The only thing this helper adds on top is the `evidenceComplete`
   * boolean + evidenceGaps list: was chain JSONL fetched, did the
   * artifact exist, did the chain hit a finalize state_transition?
   */
  private async buildPhaseRollupDigest(
    okrId: string,
    phase: 'why' | 'how' | 'what',
    actionYaml: Record<string, unknown>,
    okrSource: 'github' | 'local-fallback',
    repoInfo: { owner: string; repo: string } | undefined | null,
    meshPath: string,
  ): Promise<PhaseRollupDigest> {
    const runId = actionYaml['runId'] as string;
    const actionId = actionYaml['id'] as string;
    const status = (actionYaml['status'] as string | undefined) ?? 'unknown';
    const completedAt = (actionYaml['completedAt'] as string | undefined) ?? null;
    const prUrl = (actionYaml['pr'] as string | undefined) ?? null;
    // Older completed actions predate the forward-only action.artifact
    // field. The artifact path is deterministic by phase, so use the
    // same phaseSpec fallback as View Tag and per-action export.
    const artifactPath = (actionYaml['artifact'] as string | undefined) ?? phaseSpec(phase).artifactPath(okrId);

    const evidenceGaps: string[] = [];

    // Fetch chain JSONL — canonical, fallback to local.
    const jsonlRelPath = `okrs/${okrId}/audit/events/${runId}.jsonl`;
    let chainText: string | null = null;
    let chainSource: 'github' | 'local-fallback' = 'local-fallback';
    if (repoInfo && okrSource === 'github') {
      try {
        chainText = await this.githubService.getRepoFileText(repoInfo.owner, repoInfo.repo, jsonlRelPath);
        if (chainText) { chainSource = 'github'; }
      } catch { /* fall through */ }
    }
    if (!chainText) {
      const jsonlPath = path.join(meshPath, jsonlRelPath);
      if (fs.existsSync(jsonlPath)) {
        try {
          chainText = fs.readFileSync(jsonlPath, 'utf8');
          chainSource = 'local-fallback';
        } catch { /* fall through */ }
      }
    }
    if (!chainText) {
      evidenceGaps.push(`chain JSONL missing at ${jsonlRelPath} (tried GitHub + local)`);
      // Cannot do any further trust analysis without a chain — return a
      // minimal digest flagged evidenceComplete=false.
      return {
        phase, runId, actionId, status, completedAt, artifactPath, prUrl,
        evidenceComplete: false, evidenceGaps,
        verdict: { seal: {}, totalEvents: 0, malformedLines: 0, unsignedAgentEvents: 0, signedWorkflowEvents: 0, originKindMismatches: 0, firstFailure: null, shapeOk: false },
        runnerVerdict: { invoked: false, reason: 'chain JSONL missing — cannot invoke runner' },
        sources: {
          okr: okrSource,
          chain: 'local-fallback',
          ladder: 'missing',
          keys: 'missing',
          prd: 'missing',
          artifact: artifactPath ? 'missing' : 'missing',
          runnerInput: 'not-applicable',
        },
        agentStats: { signedAgent: 0, totalAgent: 0 },
        reviewSummary: [],
        chainHead: null,
        eventCount: 0,
        perActionReportPath: `${runId}-report.md`,
      };
    }

    const chainLines = chainText.split('\n').filter(l => l.trim().length > 0);
    const verdict = verifyChainForUI(chainLines);
    const events = parseChain(chainLines);
    const reviewSummary = summarizeSelfReview(events);
    const agentStats = countAgentEventStats(events);

    // Run the SAME decideRunnerInvocation flow as the per-action exporter.
    const signerEpochs = extractSignerEpochs(chainLines);
    const decision = await this.decideRunnerInvocation({
      okrId, runId, okrSource, chainSource, chainText, jsonlRelPath, meshPath, repoInfo, signerEpochs,
    });

    // Check artifact presence for evidenceComplete.
    //
    // Codex E4-r1 BLOCKING fix: when okrSource === 'github' (canonical
    // mode), check GitHub FIRST so a clean canonical OKR whose merged
    // artifact hadn't been pulled into local mesh doesn't falsely fail.
    //
    // Codex E4-r1-followup MAJOR fix: use getRepoFileStatus instead of
    // getRepoFileText so we can distinguish "not on GitHub" (404 —
    // legitimately missing canonically; local file is irrelevant
    // because it was never pushed) from "couldn't fetch" (auth,
    // rate-limit, 5xx — true existence unknown; local fallback is
    // the conservative move). Pre-fix used the binary null/string
    // return and fell back to local in BOTH cases, which let an
    // uncommitted local artifact silently count as canonical evidence.
    //
    // Decision tree for okrSource === 'github':
    //   ok          → artifactExists=true. Done.
    //   not-found   → DO NOT fall back. Local file is never-pushed,
    //                 cannot count as canonical evidence.
    //                 evidenceGaps gets a clear "missing on canonical"
    //                 message.
    //   fetch-error → fall back to local existsSync. Surface the
    //                 fetch-error reason in the gap message if local
    //                 also missing, so the auditor can tell whether
    //                 the gap is "really missing" vs "couldn't check".
    //
    // For okrSource === 'local-fallback', behavior is unchanged: just
    // existsSync (atomic by common source).
    let artifactExists = false;
    if (repoInfo && okrSource === 'github') {
      const result = await this.githubService.getRepoFileStatus(
        repoInfo.owner, repoInfo.repo, artifactPath,
      );
      if (result.status === 'ok') {
        // text.length > 0 not required — an empty canonical file is
        // still a present canonical file. (Truncation/empty content
        // is an artifact-quality concern, not a presence concern.)
        artifactExists = true;
      } else if (result.status === 'not-found') {
        // Definitive: artifact not on canonical. Local cannot rescue.
        evidenceGaps.push(`artifact missing at ${artifactPath} on canonical GitHub (local file, if any, was never pushed and does not count as evidence)`);
      } else {
        // fetch-error — true existence is unknown. Fall back to
        // local existsSync; transient failure shouldn't punish if
        // local has the file.
        if (fs.existsSync(path.join(meshPath, artifactPath))) {
          artifactExists = true;
        } else {
          evidenceGaps.push(`artifact missing at ${artifactPath} (GitHub fetch failed: ${result.reason}; not on local either)`);
        }
      }
    } else {
      // local-fallback mode — atomic by common source.
      if (fs.existsSync(path.join(meshPath, artifactPath))) {
        artifactExists = true;
      } else {
        evidenceGaps.push(`artifact missing at ${artifactPath} (local mesh checkout)`);
      }
    }

    // Check finalize evidence — chain should have at least one
    // state_transition workflow event when the phase is complete.
    const hasFinalize = events.some(e => e.event_kind === 'state_transition');
    if (status === 'complete' && !hasFinalize) {
      evidenceGaps.push('phase status=complete but no state_transition event found in chain');
    }

    // For HOW + WHAT, the chain should also carry signed self_review
    // events (Bug V/W contract). WHY phase doesn't.
    if (phase !== 'why' && reviewSummary.length === 0 && status === 'complete') {
      evidenceGaps.push('phase status=complete but no signed self_review events found in chain');
    }

    const evidenceComplete = evidenceGaps.length === 0;

    const sources: AuditReportInputSources = {
      okr: okrSource,
      chain: chainSource,
      // Per-phase ladder source is N/A here — the rollup fetches ladder
      // once at the OKR level. Mark as missing so the per-phase Trust
      // posture block doesn't misclaim ladder provenance.
      ladder: 'missing',
      keys: decision.keysSource,
      // Per-phase PRD/artifact are similarly N/A — the rollup fetches
      // these once for the unioned control mapping. Per-phase trust
      // block doesn't render them.
      prd: 'missing',
      artifact: artifactExists ? 'local-fallback' : 'missing',
      runnerInput: decision.runnerInputSource,
    };

    const chainHead = decision.runnerVerdict.invoked && decision.runnerVerdict.ok
      ? decision.runnerVerdict.chainHead
      : null;

    return {
      phase, runId, actionId, status, completedAt, artifactPath, prUrl,
      evidenceComplete, evidenceGaps,
      verdict,
      runnerVerdict: decision.runnerVerdict,
      sources,
      agentStats,
      reviewSummary,
      chainHead,
      eventCount: events.length,
      perActionReportPath: `${runId}-report.md`,
    };
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

    // Bug QQ/A-plus — Commit All on the wrong branch is the original
    // foot-gun: extension writes everything to main intent, but `git
    // push` against current HEAD lands on whatever branch is checked
    // out. Guard refuses if not main.
    if (!await this.withMainBranchGuard(meshPath, 'Commit mesh')) { return; }

    try {
      await execFileAsync('git', ['add', '-A'], { cwd: gitRoot });
      const { stdout: diffCheck } = await execFileAsync('git', ['diff', '--cached', '--name-only'], { cwd: gitRoot });
      if (!diffCheck.trim()) {
        this.postMessage({ type: 'syncComplete', barPath: '', message: 'Nothing to commit.' });
        return;
      }

      await execFileAsync('git', ['commit', '-m', 'chore: update governance mesh\n\nGenerated by MaintainabilityAI VS Code Extension'], { cwd: gitRoot });

      // Auto-push when there's an upstream branch. This eliminates the
      // "committed but forgot to push" trap that caused today's
      // divergence (PR #97): user committed locally, didn't push, then
      // the finalize workflow pushed remotely → diverged. Most users
      // mentally model "Commit All" as "send my changes to remote";
      // splitting it into separate Commit + Push steps was confusing.
      // If push fails (e.g. divergence), the commit still landed
      // locally — user can retry via the Push or Pull banners.
      let toastMessage = 'Changes committed.';
      try {
        const { stdout: upstreamCheck } = await execFileAsync(
          'git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
          { cwd: gitRoot },
        );
        if (upstreamCheck.trim()) {
          await execFileAsync('git', ['push'], { cwd: gitRoot, timeout: 30_000 });
          toastMessage = 'Changes committed and pushed.';
        } else {
          toastMessage = 'Changes committed. No upstream branch configured — push manually.';
        }
      } catch (pushErr) {
        // Commit succeeded but push failed (most likely divergence).
        // Surface what happened so the user knows to pull first.
        toastMessage = `Changes committed locally — push failed (likely diverged from remote): ${toErrorMessage(pushErr)}. Click Pull, then push again.`;
      }
      this.postMessage({ type: 'syncComplete', barPath: '', message: toastMessage });

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

    // D-PR1.v1.3 — capture branch + HEAD BEFORE pull so the pullComplete
    // toast carries diagnostic context. PR #122 hit a case where pull
    // succeeded + disk was correct but the OKR detail page kept rendering
    // pre-pull state; without before/after diagnostics the user had no
    // way to tell whether pull worked or got silently no-op'd.
    let branchBefore = 'unknown';
    let headBefore = 'unknown';
    try {
      const { stdout: br } = await execFileAsync('git', ['branch', '--show-current'], { cwd: gitRoot });
      branchBefore = br.trim() || 'detached-HEAD';
      const { stdout: head } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: gitRoot });
      headBefore = head.trim();
    } catch { /* diagnostic only */ }

    try {
      const result = await this.gitSyncService.pullFromRemote(gitRoot);
      if (result.success) {
        // Capture post-pull HEAD so the toast can show "pulled X..Y" or
        // "already up to date" — the user sees concretely whether pull
        // brought down new commits.
        let headAfter = headBefore;
        try {
          const { stdout: head } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: gitRoot });
          headAfter = head.trim();
        } catch { /* diagnostic only */ }
        const diagnostic = headBefore === headAfter
          ? ` (branch=${branchBefore}, HEAD=${headAfter} — no new commits)`
          : ` (branch=${branchBefore}, HEAD ${headBefore} → ${headAfter})`;
        this.postMessage({ type: 'pullComplete', message: result.message + diagnostic });

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

        // D-PR1.v1.3 — directly re-drill the last-drilled OKR (if any).
        // Previously this relied on a panelActivated → webview-handler →
        // drillIntoOkr round-trip which PR #122 surfaced as unreliable
        // (pull succeeded + disk correct, but in-memory state stayed
        // pre-pull). Now we read okr.yaml fresh + post okrDetail +
        // re-fetch phase signals from the panel side, skipping the
        // round-trip. Also keep posting panelActivated so any other
        // page state that depends on it stays current.
        if (this.lastDrilledOkrId) {
          try {
            await this.onDrillIntoOkr(this.lastDrilledOkrId);
            await this.onLoadOkrPhaseSignals(this.lastDrilledOkrId);
          } catch (err) {
            logger.warn(`Post-pull OKR refresh failed for ${this.lastDrilledOkrId}: ${toErrorMessage(err)}`);
          }
        }

        this.postMessage({ type: 'panelActivated' });
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
      // Check against the CANONICAL workflow list (MESH_WORKFLOWS) — not a
      // hardcoded pre-B20 list. The old list checked for files that have
      // since been retired (prd.yml, archeologist.yml, oraculum-research.yml,
      // label-on-merge.yml, notify-code-repos.yml — all in
      // DEPRECATED_MESH_FILES). Hitting GitHub for each of them per
      // Settings load wasted 5-6 API calls and printed 404 noise in
      // debug logs. Source-of-truth check stays in sync with what
      // AgentDeploymentService actually writes.
      const paths = MESH_WORKFLOWS.map(w => w.relativePath);
      const results = await Promise.all(
        paths.map(p =>
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

    // Bug QQ/A-plus — branch guard BEFORE we touch anything. If the
    // mesh checkout is on a Copilot PR branch, this redeploy would
    // commit + push the new workflows + agents to THAT branch instead
    // of main, where the audit runner reads from. Fail closed and let
    // the user recover (the helper handles the modal + auto-recovery
    // for clean trees).
    if (!await this.withMainBranchGuard(meshPath, 'Redeploy')) { return; }

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
      // B20: prune workflow files we used to deploy but no longer do. Keeps
      // the mesh repo's `.github/` clean as the per-agent consolidation
      // rolls out incrementally. Safe to call every redeploy — paths that
      // don't exist are silently skipped.
      const pruned = this.meshService.pruneDeprecatedWorkflows(meshPath);
      if (pruned.length > 0) {
        console.log(`[provision-workflow] Pruned ${pruned.length} deprecated file(s): ${pruned.join(', ')}`);
      }

      // Bug DD (2026-05) — also deploy agents + skills as part of "Redeploy
      // mesh workflows". Pre-Bug-DD, this handler only wrote workflow YAML
      // + composite actions + prompts; the .agent.md files were owned by a
      // SEPARATE onProvisionAgentic handler. Result: a workflow contract
      // change paired with an agent prompt change (e.g. Bug AA: extractor
      // accepts top-level fallback + agent prompt shows canonical YAML
      // block) shipped the workflow side on Redeploy but not the agent
      // side, so the next agent run kept emitting the old shape and
      // tripping the old extractor. Forensic: PR #140 (2026-05-25) shipped
      // chain_root_hash at top level despite Bug AA being merged to main
      // 15 min earlier — user clicked "Redeploy workflows" (the only
      // button labeled "Redeploy") and got everything EXCEPT the new
      // agent prompt. Now this handler also deploys skills + agents in
      // the same git commit. The standalone onProvisionAgentic still
      // exists for any caller that needs agents-only (no current callers).
      const agentSvc = new AgentDeploymentService(this.context.extensionPath);
      const skillsResult = agentSvc.deploySkills(meshPath);
      const agentsResult = agentSvc.deployAgents(meshPath);

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
        const commitMsg = [
          'chore: redeploy mesh workflows + composite actions + agents + skills + prompts',
          '',
          `Workflows + actions: ${written.length} (re)written`,
          `Skills: ${skillsResult.written} written, ${skillsResult.unchanged} unchanged`,
          `Agents: ${agentsResult.written} written, ${agentsResult.unchanged} unchanged`,
          '',
          'Generated by MaintainabilityAI VS Code Extension',
        ].join('\n');
        await execFileAsync('git', ['commit', '-m', commitMsg], { cwd: meshPath });
        await execFileAsync('git', ['push'], { cwd: meshPath, timeout: 60_000 });
        toastMessage = `Redeployed ${written.length} workflow file(s), ${agentsResult.written} agent + ${skillsResult.written} skill file(s); labels: ${labelResult.created} created, ${labelResult.updated} updated, ${labelResult.unchanged} unchanged${labelResult.failed > 0 ? `, ${labelResult.failed} failed` : ''}.`;
      } else {
        toastMessage = `Mesh already up-to-date${touched > 0 ? ` (${touched} label(s) ${labelResult.created > 0 ? 'created' : 'updated'})` : ''} — nothing to commit.`;
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
   * Single-button "Deploy All" — the only redeploy entry point post-
   * Bug-DD cleanup. Delegates to onProvisionWorkflow, which atomically
   * deploys workflows + composite actions + agents + skills + prompts
   * + labels in one git commit. The standalone onProvisionAgentic
   * method + its provisionAgentic message handler were deleted in the
   * Bug DD cleanup — they were no longer reachable from the UI and
   * the sequential two-commit path was the original Bug DD foot-gun
   * (workflows committed, agents failed mid-push → partial deploy →
   * agent ran with stale prompt → audit failed with confusing
   * symptom). Kept as a wrapper rather than inlining the call so any
   * future "deploy variants" (e.g. dry-run, repo-scoped) hang off
   * onProvisionAll uniformly.
   */
  private async onProvisionAll() {
    await this.onProvisionWorkflow();
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

  /**
   * Compute and post the `copilot` GitHub Environment readiness status.
   * Drives the Settings → Coding Agent Environment section. Shows per-secret
   * presence (names only — values are never exposed) and the firewall host
   * list (auto-verify not possible, manual paste-in required).
   */
  private async onGetCopilotEnvStatus(): Promise<void> {
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({
        type: 'copilotEnvStatus',
        error: 'No mesh repo configured — set Repository URL in Settings → Mesh first.',
      });
      return;
    }
    try {
      const svc = new AgentDeploymentService(this.context.extensionPath);
      const status = await svc.getCopilotEnvStatus(
        `${meshRepo.owner}/${meshRepo.repo}`,
        (owner, repo, envName) => this.githubService.listEnvironmentSecretNames(owner, repo, envName),
        (owner, repo, envName) => this.githubService.environmentExists(owner, repo, envName),
      );
      this.postMessage({ type: 'copilotEnvStatus', status });
    } catch (err) {
      this.postMessage({
        type: 'copilotEnvStatus',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Prompt the user for a secret value (password-masked input) and seed it
   * into the `copilot` GitHub Environment via `gh secret set --env`. After
   * success, re-query status so the UI flips ✗ → ✓ on the row.
   */
  private async onSetCopilotEnvSecret(secretName: string): Promise<void> {
    if (!secretName || !/^[A-Z][A-Z0-9_]*$/.test(secretName)) {
      this.postMessage({ type: 'error', message: `Invalid secret name: ${secretName}` });
      return;
    }
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({ type: 'error', message: 'No mesh repo configured.' });
      return;
    }
    const value = await vscode.window.showInputBox({
      prompt: `Set ${secretName} on the \`${COPILOT_ENVIRONMENT_NAME}\` environment of ${meshRepo.owner}/${meshRepo.repo}`,
      placeHolder: 'Paste the secret value (will be encrypted before upload)',
      password: true,
      ignoreFocusOut: true,
      validateInput: v => v.trim().length === 0 ? 'Value cannot be empty' : null,
    });
    if (value === undefined) { return; }  // user cancelled

    this.postMessage({ type: 'loading', active: true, message: `Setting ${secretName}...` });
    try {
      await this.githubService.setEnvironmentSecret(
        meshRepo.owner,
        meshRepo.repo,
        COPILOT_ENVIRONMENT_NAME,
        secretName,
        value.trim(),
      );
      this.postMessage({ type: 'loading', active: false });
      vscode.window.showInformationMessage(`✓ ${secretName} set on \`${COPILOT_ENVIRONMENT_NAME}\` environment`);
      // Re-query so the UI updates.
      await this.onGetCopilotEnvStatus();
    } catch (err) {
      this.postMessage({ type: 'loading', active: false });
      const msg = err instanceof Error ? err.message : String(err);
      this.postMessage({ type: 'error', message: `Failed to set ${secretName}: ${msg}` });
    }
  }

  /** Open the Coding Agent settings page so the user can paste firewall hosts. */
  private async onOpenCopilotFirewallSettings(): Promise<void> {
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({ type: 'error', message: 'No mesh repo configured.' });
      return;
    }
    await vscode.env.openExternal(vscode.Uri.parse(codingAgentSettingsUrl(meshRepo.owner, meshRepo.repo)));
  }

  /** Open the `copilot` env secrets page as a manual fallback if API write fails. */
  private async onOpenCopilotEnvSecretsPage(): Promise<void> {
    const meshRepo = await detectGovernanceRepo();
    if (!meshRepo) {
      this.postMessage({ type: 'error', message: 'No mesh repo configured.' });
      return;
    }
    await vscode.env.openExternal(vscode.Uri.parse(copilotEnvSecretsUrl(meshRepo.owner, meshRepo.repo)));
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
    // Clear any pending audit-poll timers so they don't fire after the
    // panel is gone (would post to a disposed webview).
    for (const timers of this.auditPollTimers.values()) {
      timers.forEach(t => clearTimeout(t));
    }
    this.auditPollTimers.clear();
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
      targetCodeRepoStatus: {},
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
function renderOkrPhaseIssueBody(card: OkrCard, phase: 'why' | 'how' | 'what', agent: string, runId: string, tier: 'autonomous' | 'supervised' | 'restricted'): string {
  const phaseLabel = phase === 'why' ? 'Why · Market Research' : phase === 'how' ? 'How · PRD' : 'What · Code Design';
  const lines: string[] = [];
  // HTML-comment markers — primary machine-readable source. Stays
  // for backwards-compat + workflows that grep the raw body.
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
  // VISIBLE dispatch context — the Coding Agent runtime sanitizes HTML
  // comments before the agent sees the issue body (PR #93 case), so
  // the HTML markers alone aren't reliable as the agent's source of
  // truth for run_id. We also emit a `Dispatch context` table in
  // visible markdown — the agent extracts from EITHER source, no
  // information loss.
  lines.push('## Dispatch context');
  lines.push('');
  // Tier derivation: resolved by Looking Glass via the Restricted-wins
  // rule across affected BARs (design §6.2). Frozen here at dispatch
  // time. Agent MUST read this value — NOT infer from card content
  // (PR #112 prd-agent hallucinated tier=restricted from the OKR
  // description and skipped self-critique).
  const maxAutoRounds = tier === 'autonomous' ? 3 : tier === 'supervised' ? 2 : 0;
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| \`okr_id\` | \`${card.meta.id}\` |`);
  lines.push(`| \`run_id\` | \`${runId}\` |`);
  lines.push(`| \`phase\` | \`${phase}\` |`);
  lines.push(`| \`intent_thread_uuid\` | \`${card.meta.intentThreadUuid}\` |`);
  lines.push(`| \`agent\` | \`${agent}\` |`);
  lines.push(`| \`tier\` | \`${tier}\` (governanceTier — frozen at dispatch; MAX_AUTO_ROUNDS=${maxAutoRounds}) |`);
  lines.push('');
  lines.push('Use these EXACT values for the Hatter Tag + audit JSONL filename. Do NOT generate your own `run_id` — the finalize workflow uses this value to flip `actions[].status` to `complete` on PR merge. The `tier` value is the authoritative input for self-critique gating (HOW phase) — read it from `self-review-architect` / `self-review-security` skill responses rather than re-deriving from the OKR card.');
  lines.push('');
  // B28 Court Recorder Auto-Logging — export the session context as env
  // vars at session start so the runner can auto-emit skill_call events
  // without the agent having to call audit-emit-event explicitly.
  lines.push('### Session context env vars (B28)');
  lines.push('');
  lines.push('**At session start, before any `npx @maintainabilityai/research-runner skill-*` call, export these env vars** so the runner can auto-emit `skill_call` audit events on your behalf:');
  lines.push('');
  lines.push('```sh');
  lines.push(`export OKR_ID="${card.meta.id}" \\`);
  lines.push(`       RUN_ID="${runId}" \\`);
  lines.push(`       INTENT_THREAD_UUID="${card.meta.intentThreadUuid}" \\`);
  lines.push(`       PHASE="${phase}" \\`);
  lines.push(`       PHASE_TIER="${tier}"`);
  lines.push('```');
  lines.push('');
  lines.push('If your runtime resets the shell between `execute` calls, prepend the five `KEY=value` assignments inline to every npx invocation. `PHASE_TIER` is informational; the authoritative tier comes from the `self-review-*` skill responses for HOW-phase persona-switch gating.');
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
 * Parse a drift-check row out of an audit-and-drift workflow's PR
 * summary comment. Workflow renders rows like:
 *
 *   | Pocket Watch goal-drift | ✓ pass (cosine=0.7357 ≥ 0.65) |
 *   | Caterpillar's Challenge (PRD vs research-doc) | ✗ fail (cosine=0.4296 < 0.65) |
 *   | Pocket Watch goal-drift | — skipped (`reason`) ... |
 *
 * Returns the parsed result or null if no matching row found. The
 * `labelPrefix` is the leading text in the leftmost column (e.g.
 * "Pocket Watch", "Caterpillar") so the same parser handles both.
 */
function parseDriftRow(
  commentBody: string,
  labelPrefix: string,
): { passed: 'true' | 'false' | 'skipped'; cosine?: number; threshold?: number; reason?: string } | null {
  const escaped = labelPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rowRe = new RegExp(`\\|[^|\\n]*${escaped}[^|\\n]*\\|([^|\\n]*)\\|`, 'i');
  const m = commentBody.match(rowRe);
  if (!m) { return null; }
  const cell = m[1].trim();
  if (/^—\s*skipped/i.test(cell) || /skipped/i.test(cell)) {
    const reasonM = cell.match(/skipped\s*\(`?([^`)]+)`?\)/i);
    return { passed: 'skipped', reason: reasonM ? reasonM[1] : undefined };
  }
  const cosineM = cell.match(/cosine\s*=\s*([0-9.]+)/i);
  const thresholdM = cell.match(/[≥<]\s*([0-9.]+)/);
  const passed: 'true' | 'false' = /^✓|pass/i.test(cell) ? 'true' : 'false';
  return {
    passed,
    cosine: cosineM ? parseFloat(cosineM[1]) : undefined,
    threshold: thresholdM ? parseFloat(thresholdM[1]) : undefined,
  };
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
