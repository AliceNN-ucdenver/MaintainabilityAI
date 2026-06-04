import type { RctroPrompt, PromptPackSelection, PromptPackInfo } from './prompts';
import type {
  TechStack, RepoInfo, AgentAssignment, IssueComment,
  LinkedPullRequest, GitHubIssueListItem, AvailableModel,
  WorkflowPhase, PhaseStatus,
} from './github';
import type {
  AgentStatusInfo, ScorecardData, ScorecardSnapshot, TrendDirection,
} from './scorecard';
import type {
  Criticality, CapabilityModelType, ArchitectureDsl,
  BarSummary, PortfolioSummary, GovernanceDecision, MermaidDiagrams,
  AdrRecord, ThreatEntry, ThreatModelResult, OrgScanRecommendation,
  RecommendedPlatform, ExistingBarUpdate, OrgRepo, PolicyFile, NistControl,
  GitSyncStatus, ActiveReviewInfo, TopFindingsSummary, DriftWeights,
  GovernanceTier,
} from './governance';
import type { OkrCard, OkrPhaseProgress, OkrStatus } from './okr';
import type { CopilotEnvStatus } from '../services/AgentDeploymentService';

// ============================================================================
// Webview Message Protocol (IssueCreator / Rabbit Hole)
// ============================================================================

export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'generate'; description: string; packs: PromptPackSelection; template?: string; stackOverrides?: Partial<TechStack>; modelOverride?: string }
  | { type: 'regenerate'; feedback: string; currentRctro: RctroPrompt }
  | { type: 'submit'; rctro: RctroPrompt; title: string }
  | { type: 'detectStack' }
  | { type: 'loadPromptPacks' }
  | { type: 'selectTemplate'; templateId: string }
  // Phase 2-6 messages
  | { type: 'acceptRctro' }
  | { type: 'rejectRctro'; feedback: string }
  | { type: 'assignAgent'; agent: AgentAssignment }
  | { type: 'startMonitoring' }
  | { type: 'stopMonitoring' }
  | { type: 'checkoutBranch'; branch: string }
  | { type: 'openUrl'; url: string }
  | { type: 'approveAgent'; agent?: 'claude' | 'copilot' }
  | { type: 'replanAgent'; feedback: string; agent?: 'claude' | 'copilot' }
  | { type: 'listModels' }
  | { type: 'saveMetadata'; metadata: { language: string; module_system: string; testing: string; package_manager: string; modelFamily?: string } }
  | { type: 'loadIssues'; page?: number }
  | { type: 'selectIssue'; issueNumber: number; issueUrl: string }
  | { type: 'syncRepo' }
  | { type: 'backToHub' }
  | { type: 'switchFolder'; folderPath: string };

export type ExtensionMessage =
  | { type: 'rctroGenerated'; rctro: RctroPrompt; markdown: string }
  | { type: 'stackDetected'; stack: TechStack; metadata?: import('../services/RepoMetadata').RepoMetadata }
  | { type: 'issueCreated'; url: string; number: number }
  | { type: 'error'; message: string }
  | { type: 'loading'; active: boolean }
  | { type: 'promptPacks'; packs: PromptPackInfo[] }
  | { type: 'repoDetected'; repo: RepoInfo }
  | { type: 'templateLoaded'; description: string; packs: PromptPackSelection }
  // Phase 3-6 messages
  | { type: 'phaseUpdate'; phase: WorkflowPhase; status: PhaseStatus; message?: string }
  | { type: 'agentAssigned'; agent: AgentAssignment; commentUrl?: string }
  | { type: 'workflowNotFound' }
  | { type: 'commentsUpdated'; comments: IssueComment[] }
  | { type: 'prDetected'; pr: LinkedPullRequest }
  | { type: 'prStatusUpdated'; pr: LinkedPullRequest }
  | { type: 'labelsUpdated'; labels: string[] }
  | { type: 'branchCheckedOut'; branch: string }
  | { type: 'repoSynced'; message: string }
  | { type: 'availableModels'; models: AvailableModel[]; defaultFamily: string }
  | { type: 'metadataSaved' }
  | { type: 'issuesLoaded'; issues: GitHubIssueListItem[]; hasMore: boolean; page: number }
  | { type: 'prefillDescription'; description: string; packs?: { owasp: string[]; maintainability: string[]; threatModeling: string[] } }
  | { type: 'workspaceFolders'; folders: { name: string; path: string }[]; selectedPath?: string }
  // Phase 6 — Governance bridge data for Rabbit Hole
  | { type: 'governanceData'; data: import('../utils/governanceBridge').GovernanceBridgeData | null };

// ============================================================================
// Scorecard Webview Message Protocol
// ============================================================================

export type ScorecardWebviewMessage =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'openUrl'; url: string }
  | { type: 'runCommand'; command: string }
  | { type: 'installPmat' }
  | { type: 'addressTechDebt' }
  | { type: 'reduceComplexity' }
  | { type: 'refreshDeps' }
  | { type: 'runCoverage' }
  | { type: 'improveCoverage' }
  | { type: 'improveDeps' }
  | { type: 'createFeature' }
  | { type: 'checkAliceWorkflowStatus' }
  | { type: 'deployAliceWorkflow' }
  | { type: 'listModels' }
  | { type: 'savePreferredModel'; family: string }
  | { type: 'switchFolder'; folderPath: string }
  | { type: 'checkSync' }
  | { type: 'syncRepo' }
  | { type: 'pushRepo' }
  | { type: 'commitAndPush' }
  | { type: 'openScaffold' }
  | { type: 'configureSecrets' }
  | { type: 'resyncGovernance' };

export type ScorecardExtensionMessage =
  | { type: 'scorecardData'; data: ScorecardData }
  | { type: 'loading'; active: boolean; message?: string }
  | { type: 'error'; message: string }
  | { type: 'repoDetected'; repo: RepoInfo }
  | { type: 'pmatStatusUpdate'; installed: boolean }
  | { type: 'historyData'; history: ScorecardSnapshot[]; trends: Record<string, TrendDirection> }
  | { type: 'techStackInfo'; packageManager: string; testing: string }
  | { type: 'aliceWorkflowStatus'; exists: boolean }
  | { type: 'aliceWorkflowDeployed' }
  | { type: 'availableModels'; models: { id: string; family: string; name: string; vendor: string }[]; defaultFamily: string }
  | { type: 'preferredModelSaved'; family: string }
  | { type: 'workspaceFolders'; folders: { name: string; path: string }[] }
  | { type: 'agentStatusUpdate'; status: AgentStatusInfo | null }
  | { type: 'syncStatus'; behind: number; ahead: number; branch: string; dirty: boolean }
  | { type: 'repoSynced' }
  // Phase 6 — Governance bridge data for Scorecard
  | { type: 'governanceData'; data: import('../utils/governanceBridge').GovernanceBridgeData | null; detectedBar?: { barName: string; barPath: string } | null };

// ============================================================================
// Oraculum (Architecture Review) Types
// ============================================================================

export type ReviewPillar = 'architecture' | 'security' | 'risk' | 'operations';

export interface ReviewScope {
  pillars: ReviewPillar[];
  promptPacks: string[];
  /** @deprecated Use promptPacks — kept for backward compat with in-flight issues */
  promptPack?: string;
  includeRepos: string[];
  additionalContext?: string;
}

export type OracularWebviewMessage =
  | { type: 'ready' }
  | { type: 'submitReview'; barPath: string; scope: ReviewScope; title: string }
  | { type: 'startMonitoring' }
  | { type: 'stopMonitoring' }
  | { type: 'openUrl'; url: string }
  | { type: 'provisionWorkflow' }
  | { type: 'assignAgent'; agent: AgentAssignment }
  | { type: 'approveAgent'; agent?: 'claude' | 'copilot' }
  | { type: 'replanAgent'; feedback: string; agent?: 'claude' | 'copilot' }
  | { type: 'loadIssues'; page: number }
  | { type: 'selectIssue'; issueNumber: number; issueUrl: string }
  | { type: 'openBar'; barPath: string }
  | { type: 'backToHub' }
  | { type: 'refreshPromptPacks' }
  | { type: 'pullMesh' }
  | { type: 'navigateToBar'; agent?: 'claude' | 'copilot' }
  | { type: 'promoteToResearchRequest' };

export type OracularExtensionMessage =
  | { type: 'meshRepoDetected'; owner: string; repo: string }
  | { type: 'promptPacksLoaded'; packs: PromptPackInfo[] }
  | { type: 'reviewCreated'; url: string; number: number }
  | { type: 'agentAssigned'; agent: AgentAssignment; commentUrl?: string }
  | { type: 'workflowNotFound' }
  | { type: 'commentsUpdated'; comments: IssueComment[] }
  | { type: 'prDetected'; pr: LinkedPullRequest }
  | { type: 'prStatusUpdated'; pr: LinkedPullRequest }
  | { type: 'labelsUpdated'; labels: string[] }
  | { type: 'issueState'; hasReviewLabel: boolean; hasComments: boolean; labels: string[]; issueKind: 'research' | 'review' }
  | { type: 'phaseUpdate'; phase: string; status: string; message?: string }
  | { type: 'workflowStatus'; exists: boolean }
  | { type: 'workflowProvisioned' }
  | { type: 'meshSyncStatus'; behind: number; ahead: number }
  | { type: 'pullComplete'; message: string }
  | { type: 'pullError'; message: string }
  | { type: 'loading'; active: boolean; message?: string }
  | { type: 'error'; message: string }
  | { type: 'issuesLoaded'; issues: GitHubIssueListItem[]; hasMore: boolean; page: number }
  | { type: 'startCreateFlow'; barPath: string; bar: BarSummary; repos: string[] };

// ============================================================================
// Absolem — Multi-Turn CALM Refinement Agent
// ============================================================================

export type AbsolemCommand = 'drift-analysis' | 'add-components' | 'validate' | 'freeform'
  | 'gap-analysis' | 'suggest-adr' | 'image-to-calm' | 'repo-to-calm';

export interface CalmPatch {
  op: 'addNode' | 'removeNode' | 'addRelationship' | 'removeRelationship'
    | 'updateField' | 'setControl' | 'removeControl' | 'setCapabilities'
    | 'setInterfaces' | 'updateComposedOf' | 'replaceFull';
  target: string;
  field?: string;
  value?: unknown;
}

// ============================================================================
// Research Settings — surfaced in the Looking Glass Settings panel
// ============================================================================

export type ResearchSecretId =
  | 'anthropic'
  | 'openai'
  | 'tavily'
  | 'uspto'
  | 'huggingface'
  | 'governance-mesh-token';

/** Per-secret status: which storage tiers it is set in. */
export interface ResearchSecretStatus {
  id: ResearchSecretId;
  label: string;
  envName: string;
  description?: string;
  /** Set in VS Code workspace configuration. */
  hasVsCodeValue: boolean;
  /** Present on the configured mesh GitHub repo's Actions secrets.
   *  `null` when we could not list repo secrets (no auth, network error). */
  hasGitHubSecret: boolean | null;
  /** Where this secret needs to be distributed; drives the
   *  'Push to all linked code repos' button visibility. */
  scope: 'mesh' | 'mesh+code';
}

/** Non-secret runtime preferences for the research + PRD pipelines. */
export interface ResearchPrefs {
  llmProvider: 'github-models' | 'anthropic' | 'openai';
  guardrails: 'strict' | 'default' | 'lenient';
  grounding: 'strict' | 'default' | 'lenient';
  groundingThreshold: number;
  maxIterations: number;
  costCapTokens: number;
}

export interface ResearchSettingsPayload {
  secrets: ResearchSecretStatus[];
  prefs: ResearchPrefs;
  /** owner/repo of the mesh GitHub repo, when detected. Drives Push-to-GitHub. */
  meshRepo: { owner: string; repo: string } | null;
}

// ── OKR view payloads ───────────────────────────────────────────────────────

/**
 * Per-OKR row data sent to the OKR list view. Computed by the extension
 * from each OkrSummary + its primary-BAR's tier (resolved via
 * MeshService.findBarById). The webview just renders.
 */
export interface OkrListItem {
  id: string;
  objective: string;
  ownerHandle: string;
  platformId: string;
  primaryBarId: string;
  primaryBarTier: GovernanceTier;
  status: OkrStatus;
  paused: boolean;
  phaseProgress: OkrPhaseProgress;
  lastActivityAt: string;
  chainRootShort: string;
  targetCodeRepos: string[];
}

/**
 * One affected BAR's snapshot for the OKR detail view. Hydrated by the
 * extension via MeshService.findBarById so the webview doesn't have to
 * walk the mesh.
 */
export interface OkrAffectedBar {
  id: string;
  name: string;
  path: string;
  compositeScore: number;
  tier: GovernanceTier;
}

/**
 * Mesh-wide BAR option, used to populate the affected-BARs multi-select
 * on the OKR detail edit form. Pre-grouped by platform so the form can
 * render a section per platform.
 *
 * `repos` carries the BAR's app.yaml `repos[]` — full GitHub URLs — so
 * the OKR edit form can offer them as checkboxes on the Target Code
 * Repos section without a round-trip per BAR.
 */
export interface OkrAvailableBar {
  id: string;
  name: string;
  /** Filesystem path to the BAR root, used by fan-out prep to route into Cheshire. */
  path?: string;
  platformId: string;
  platformName: string;
  compositeScore: number;
  tier: GovernanceTier;
  repos: string[];
}

/**
 * Mesh-wide platform option for the platform-select on the edit form.
 */
export interface OkrAvailablePlatform {
  id: string;
  name: string;
  slug: string;
  barCount: number;
}

/**
 * Edit-mode flags carried by the okrDetail message so the webview knows
 * whether to render the view (read-only), edit (existing OKR being
 * edited), or create (blank scaffold being filled in) form.
 */
export type OkrDetailMode = 'view' | 'edit' | 'create';

// ============================================================================
// Looking Glass Message Protocol
// ============================================================================

export type LookingGlassWebviewMessage =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'initMesh'; name: string; org: string; owner: string; folderPath: string; createRepo: boolean; repoName: string; repoVisibility: 'private' | 'public'; architectureDsl: ArchitectureDsl; capabilityModel: CapabilityModelType }
  | { type: 'connectMesh'; repoUrl: string }
  | { type: 'connectLocalMesh' }
  | { type: 'samplePlatform' }
  | { type: 'addPlatform'; name: string; abbreviation: string; owner: string }
  | { type: 'scaffoldBar'; name: string; platformId: string; criticality: Criticality; template: 'minimal' | 'standard' | 'full' }
  | { type: 'drillIntoPlatform'; platformId: string }
  | { type: 'drillIntoBar'; barPath: string }
  | { type: 'backToPortfolio' }
  | { type: 'backToPlatform' }
  | { type: 'pickFolder' }
  | { type: 'openFile'; path: string }
  | { type: 'openUrl'; url: string }
  | { type: 'filterBars'; filter: 'all' | 'needs-attention' | 'warnings' }
  | { type: 'searchBars'; query: string }
  | { type: 'scanOrg'; org: string; modelFamily?: string }
  | { type: 'scanOrgWithRepos'; org: string; repoNames: string[]; modelFamily?: string }
  | { type: 'applyOrgScan'; platforms: RecommendedPlatform[]; template: 'minimal' | 'standard' | 'full'; updates?: ExistingBarUpdate[] }
  | { type: 'loadOrgRepos'; org: string }
  | { type: 'addReposToBar'; barPath: string; repoUrls: string[] }
  | { type: 'detectGitHubDefaults' }
  | { type: 'listModels' }
  | { type: 'updateBarField'; barPath: string; field: string; value: string }
  | { type: 'updateAppYaml'; barPath: string; fields: Record<string, string> }
  | { type: 'generateThreatModel'; barPath: string }
  | { type: 'exportThreatModelCsv'; barPath: string; threats: ThreatEntry[] }
  | { type: 'listAdrs'; barPath: string }
  | { type: 'createAdr'; barPath: string; adr: AdrRecord }
  | { type: 'updateAdr'; barPath: string; adr: AdrRecord }
  | { type: 'deleteAdr'; barPath: string; adrId: string }
  | { type: 'syncBar'; barPath: string }
  | { type: 'commitMesh' }
  | { type: 'pushMesh' }
  | { type: 'pullMesh' }
  | { type: 'switchCapabilityModel'; modelType: CapabilityModelType }
  | { type: 'uploadCustomModel'; jsonContent: string }
  | { type: 'openRepoInContext'; repoUrl: string; barPath: string }
  | { type: 'openScorecard'; folderPath: string }
  | { type: 'scaffoldComponent'; repoUrl: string; barPath: string }
  | { type: 'deployGovernanceToRepo'; repoUrl: string; barPath: string; localPath?: string }
  | { type: 'loadPolicies' }
  | { type: 'savePolicy'; filename: string; content: string }
  | { type: 'lookupNistControl'; controlId: string }
  | { type: 'createNistCatalog' }
  | { type: 'generatePolicyBaseline'; filename: string }
  // Phase 2 — CALM editing
  | { type: 'calmMutation'; barPath: string; patch: { op: string; target: string; field?: string; value?: unknown }[] }
  | { type: 'applyArchetype'; barPath: string; archetypeId: 'three-tier' | 'event-driven' | 'data-pipeline'; appName: string }
  | { type: 'saveLayout'; barPath: string; diagramType: 'context' | 'logical' | 'platform'; layout: unknown }
  | { type: 'exportPng'; barPath: string; diagramType: string; pngDataUrl: string }
  // Phase 4 — Platform architecture
  | { type: 'loadPlatformArchitecture'; platformId: string }
  | { type: 'platformCalmMutation'; platformId: string; patch: { op: string; target: string; field?: string; value?: unknown }[] }
  // Oraculum integration
  | { type: 'openOraculum'; barPath: string }
  | { type: 'summarizeTopFindings'; barPath: string }
  // Settings
  | { type: 'checkWorkflowStatus' }
  // Bug DD cleanup (2026-05) — provisionWorkflow + provisionAgentic
  // message types deleted. The single `provisionAll` entry below is
  // the only redeploy path; its handler (onProvisionWorkflow under
  // the hood) atomically deploys workflows + composite actions +
  // agents + skills + prompts + labels in one commit. The legacy
  // types' handlers led to partial deployment foot-guns (see Bug DD
  // forensic on PR #140 in the mesh repo). OracularWebviewMessage
  // still has a provisionWorkflow type at line 148 — that's a
  // SEPARATE webview (OracularPanel) with its own handler. Don't
  // confuse them.
  | { type: 'savePreferredModel'; family: string }
  | { type: 'reinitializeMesh' }
  | { type: 'loadDriftWeights' }
  | { type: 'saveDriftWeights'; weights: DriftWeights }
  // Absolem — multi-turn CALM refinement agent
  | { type: 'absolemStart'; barPath: string; command: AbsolemCommand }
  | { type: 'absolemSend'; barPath: string; message: string }
  | { type: 'absolemAcceptPatches'; barPath: string; patches: CalmPatch[] }
  | { type: 'absolemRejectPatches'; barPath: string }
  | { type: 'absolemClose'; barPath: string }
  | { type: 'absolemImageStart'; barPath: string; imageBase64: string; mimeType: string }
  | { type: 'absolemPreviewJson'; barPath: string; json: string }
  // CALM component implementation
  | { type: 'getCalmComponents'; barPath: string }
  | { type: 'implementComponent'; barPath: string; componentId: string; repoName: string; componentName: string; componentType: string; componentDescription: string }
  | { type: 'saveWorkspace'; name: string }
  | { type: 'configureMeshSecrets' }
  | { type: 'refreshPromptPacks' }
  // Research Settings — Tavily + Anthropic/OpenAI keys + non-secret prefs
  | { type: 'loadResearchSettings' }
  | { type: 'saveResearchSecret'; id: ResearchSecretId; value: string }
  | { type: 'promptResearchSecret'; id: ResearchSecretId }
  | { type: 'createResearchSecret'; id: ResearchSecretId }
  | { type: 'testResearchSecret'; id: ResearchSecretId }
  | { type: 'pushResearchSecret'; id: ResearchSecretId }
  | { type: 'pushResearchSecretToAll'; id: ResearchSecretId }
  | { type: 'saveResearchPrefs'; prefs: ResearchPrefs }
  // Red Queen — orchestration + platform governance editors
  | { type: 'loadOrchestrationPolicy' }
  | { type: 'saveOrchestrationPolicy'; policy: { autoMinScore: number; supMinScore: number; securityThreshold: number; archThreshold: number; escScoreDrop: number; escConsecutive: number; escTarget: string } }
  | { type: 'loadPlatformGovernance'; platformId: string }
  | { type: 'savePlatformGovernance'; platformId: string; governance: { minimumScores: Record<string, number>; minTier: string; enforcementMode: string } }
  // Phase B — Mesh Provisioning status check (the deploy itself is via
  // provisionAll below; the agentic-status query stays separate because
  // the UI badge polls it independently of redeploy clicks).
  // provisionAgentic message type removed in Bug DD cleanup — see the
  // comment near checkWorkflowStatus above.
  | { type: 'checkAgenticStatus' }
  // Coding Agent Environment readiness (Settings → Coding Agent Environment)
  | { type: 'getCopilotEnvStatus' }
  | { type: 'setCopilotEnvSecret'; secretName: string }
  | { type: 'openCopilotFirewallSettings' }
  | { type: 'openCopilotEnvSecretsPage' }
  // Single "Deploy all" button (Settings → Mesh Provisioning) — atomic
  // redeploy of workflows + composite actions + agents + skills +
  // prompts + labels in one git commit. Post-Bug-DD this is the ONLY
  // redeploy entry; the prior provisionWorkflow / provisionAgentic
  // split led to partial-deployment foot-guns.
  | { type: 'provisionAll' }
  // Research dispatch from platform / BAR views — opens NewResearchPanel pre-filled with scope
  | { type: 'newResearchFromPlatform'; slug: string; name: string }
  | { type: 'newResearchFromBar'; barId: string; barName: string }
  // OKR list + detail (Phase A — inline editing on detail page;
  // Start buttons stay disabled until Phase B agent deployment)
  | { type: 'getOkrList' }
  | { type: 'drillIntoOkr'; okrId: string }
  | { type: 'backToOkrList' }
  // Fetch live per-phase signal data from GitHub API (audit JSONL counts +
  // artifact markdown structure + PR state) to populate the rich Why/How/
  // What cards on the OKR detail page. Always-live by design (per user
  // preference) — local mesh is not consulted.
  | { type: 'loadOkrPhaseSignals'; okrId: string }
  // One-click "Run Audit" from the OKR detail page — applies the phase's
  // audit-trigger label to the open artifact PR. Saves the user from
  // navigating to GitHub to apply research-synthesis / prd-draft /
  // design-draft manually.
  | { type: 'runOkrAudit'; okrId: string; phase: string; prNumber: number }
  // 📄 View artifact toggle — fetches the produced markdown file via the
  // GitHub Contents API and renders it inline in the OKR detail card.
  // Stateful: clicking again hides the panel.
  | { type: 'toggleOkrArtifact'; okrId: string; phase: string }
  // A12 + A12.v1.1 — set the per-repo intent + connection status on the
  // OKR's targetCodeRepos. Persisted into the OKR card so the Phase D
  // code-design fan-out can branch on (a) clone+ground for 'connected'
  // repos, (b) greenfield design for 'create' repos, (c) skip + prompt
  // for 'not-connected'. 'unreachable' is system-set after a probe.
  | { type: 'setOkrRepoStatus'; okrId: string; repoUrl: string; status: 'not-connected' | 'connected' | 'create' | 'unreachable' }
  // D-PR1.v1.1 — Reset an unsealed phase to its pre-run state.
  // Destructive: nukes the phase directory, audit-event JSONLs for the
  // phase, and the OKR card's actions[] entries for the phase. Refused
  // by OKRService.resetPhase if any action carries hatterChainRoot OR
  // chain-ladder.yaml has an entry for the phase. The webview confirms
  // with a native VS Code modal before posting this; the handler then
  // posts back an `okrPhaseReset` result message with what got deleted.
  | { type: 'resetOkrPhase'; okrId: string; phase: 'why' | 'how' | 'what' }
  // ✓ Merge PR — merges the artifact PR via the GitHub pulls.merge API
  // (squash). Extension prompts for confirmation natively before calling.
  // After success, finalize workflow flips action.status to complete on
  // the next push.
  | { type: 'mergeOkrPr'; okrId: string; phase: string; prNumber: number }
  // ✅ Mark PR ready — flips a stuck-in-draft PR to ready-for-review.
  // Surfaced when the agent requested a review but never marked the
  // PR ready (observed on PR #91).
  | { type: 'markOkrPrReady'; okrId: string; phase: string; prNumber: number }
  // ✅ Mark fan-out impl PR ready — flips a draft impl PR on the TARGET
  // code repo (carried by repoSlug) to ready-for-review so the
  // Implementation Provenance gate re-fires, then re-polls the pane.
  | { type: 'markFanOutImplPrReady'; okrId: string; repoSlug: string; prNumber: number }
  // 🔁 Re-run audit — removes + re-applies the trigger label after a
  // degraded verdict so the workflow fires again on the latest commit.
  | { type: 'rerunOkrAudit'; okrId: string; phase: string; prNumber: number }
  // 🤖 Revise with agent — posts a structured PR comment dispatching
  // the phase's author agent (market-research-agent / prd-agent) with
  // the audit failure reasons attached. Lets the user say "fix this"
  // without leaving Looking Glass.
  | { type: 'reviseWithAgent'; okrId: string; phase: string; prNumber: number }
  | { type: 'scaffoldOkrSample' }
  /** Open the OKR detail in 'create' mode with a blank scaffold. */
  | { type: 'createOkrDraft' }
  /** Open the OKR detail in 'edit' mode against the named OKR. */
  | { type: 'editOkr'; okrId: string }
  /** Save inline-edited fields. patch is OkrUpdatePatchSchema-shaped. */
  | { type: 'saveOkrEdits'; okrId: string; patch: unknown }
  /** Persist a brand-new OKR. draft is OkrCreateInputSchema-shaped. */
  | { type: 'createOkrFromDraft'; draft: unknown }
  /**
   * Phase B-PR3 — click `Start Why` on the OKR detail. Extension creates a
   * GitHub issue in the mesh repo with `okr-anchor` + `oraculum-research`
   * labels and the `<!-- okr_id: <id> -->` body marker per §5.5.4, then
   * appends a queued OkrAction. Phase B execution: user manually
   * @-mentions `@copilot use agent market-research-agent` to trigger
   * Copilot Coding Agent; Phase C automates this via `okr-bus.yml`.
   */
  | { type: 'startOkrWhy'; okrId: string }
  /**
   * Phase B-PR4 — click `Start How` on the OKR detail. Mirror of Why:
   * creates a GitHub issue with `okr-anchor` + `oraculum-prd` labels and
   * the `<!-- okr_id: ... -->` marker. Webview pre-gates on the Why phase
   * being complete (UI surfaces "Gated on Why merged" otherwise).
   */
  | { type: 'startOkrHow'; okrId: string }
  /**
   * Phase C-PR4 — click `Start What` on the OKR detail. Creates ONE
   * cross-cutting `oraculum-design` issue in the mesh repo per §10.2
   * step 14. The code-design-agent writes a single design.md doc
   * grounded on the merged PRD + indexed target_code_repos. After
   * THAT PR merges, the Looking Glass app-orchestrated FanOutEngine
   * (D-PR4 sub-PRs 3a/3b) fans out per-repo issues to each target
   * code repo. (The original design-bus.yml workflow was replaced by
   * the in-extension orchestrator — see `services/coordination/`.)
   */
  | { type: 'startOkrWhat'; okrId: string }
  /**
   * Phase B-PR4 — open the Hatter Tag slide-out sheet for an action's run.
   * Extension reads the artifact at the action's `artifact` path, parses
   * the embedded ## Hatter's Tag YAML block, and posts back via
   * `hatterTagSheet`.
   */
  | { type: 'loadHatterTag'; okrId: string; actionId: string }
  /**
   * Phase E E1 — Verify Chain button click on an action card. Extension
   * fetches the run's audit JSONL (GitHub Contents API + local fallback),
   * runs `verifyChainForUI`, and posts back `chainVerifySheet` with the
   * structured verdict.
   */
  | { type: 'verifyChain'; okrId: string; actionId: string }
  /**
   * Phase E E3 — Export Audit Report button click. Extension shells out
   * to the runner verifier, fetches PRD + artifact for control mapping,
   * builds the markdown closeout report, writes it to
   * `okrs/<id>/audit/exports/<runId>-report.md`, and opens it in
   * VS Code. No outbound payload — the toast + opened file ARE the UX.
   */
  | { type: 'exportAuditReport'; okrId: string; actionId: string }
  /**
   * Phase E E4 — OKR-level rollup export. Generates a whole-OKR audit
   * rollup combining all 3 phases (WHY/HOW/WHAT) into one auditor-grade
   * markdown document at okrs/<id>/audit/exports/<okrId>-rollup.md.
   * Distinct from `exportAuditReport` which is per-action. Reuses the
   * exact same decideRunnerInvocation / verifyKeysAtomicity /
   * fetchPrdAndArtifact code paths the per-action exporter uses — no
   * parallel verifier logic.
   */
  | { type: 'exportOkrRollup'; okrId: string }
  /**
   * Phase C-PR3 — HumanGate controls on the OKR detail Action card.
   * Fire when the latest action's status is `human_gate` (auto-revision
   * cycle exhausted per §6.1). The extension handles the actual GitHub
   * surface (apply governance-pass override / re-comment @copilot to
   * retry / close PR + cancel action).
   */
  | { type: 'okrHumanGateApprove'; okrId: string; actionId: string; tier: string }
  | { type: 'okrHumanGateRerun'; okrId: string; actionId: string }
  | { type: 'okrHumanGateReject'; okrId: string; actionId: string }
  /**
   * Phase B-PR3+ — flip the OKR action's status to `cancelled` without
   * touching its GitHub issue/PR. Used when the user already closed
   * the issue on GitHub directly and just wants the OKR card to stop
   * showing "Running". Distinct from HumanGateReject (which closes
   * the PR + sets status); this just disregards the in-flight run.
   */
  | { type: 'cancelOkrAction'; okrId: string; actionId: string }
  /**
   * Phase B-PR3/4 + C-PR4 — confirm posting the Start-phase issue from
   * the webview preview modal. additionalContext is appended to the
   * canned body before `gh issue create` runs.
   */
  | { type: 'confirmStartOkrPhase'; okrId: string; phase: 'why' | 'how' | 'what'; additionalContext: string }
  /**
   * D-PR4 sub-PR 3b — Looking Glass fan-out engine entry point.
   *
   * Run pre-flight for an OKR's WHAT-phase fan-out. Extension reads the
   * most-recent completed WHAT action, fetches its code-design.md
   * artifact, parses + verifies the §10 H3 coordination block, runs
   * per-repo probes (harness presence for brownfield, issue-write
   * permission, repo existence + isEmpty for greenfield), combines with
   * caller-side state (upstream PR states, scaffold status, already-
   * opened landing issues, impl PR states) and posts back a
   * `fanOutPreflightResult` with per-repo decisions + ready set + waves.
   *
   * Read-only — does NOT open landing issues, dispatch agents, or write
   * `design-fan-out.yaml`. Those land in subsequent sub-PRs.
   */
  | { type: 'fanOutPreflight'; okrId: string }
  /**
   * D-PR4 fan-out preparation — route repo prep through the owning BAR +
   * Cheshire scaffold flow instead of creating repositories directly from
   * the OKR page. Greenfield rows open Cheshire with BAR context; brownfield
   * harness-missing rows open/clone the repo so the user can run the existing
   * Cheshire retrofit scaffold.
   */
  | { type: 'prepareFanOutRepo'; okrId: string; repoSlug: string; repoUrl: string; barPath: string }
  /**
   * D-PR4 sub-PR 6 — execute fan-out for an OKR.
   *
   * Click handler for the "🚀 Fan out N of M ready" button on the
   * OKR detail's fan-out pane. Extension:
   *   1. Branch-guards against non-main writes (MeshBranchGuard).
   *   2. Re-runs pre-flight to validate the ready set hasn't changed.
   *   3. For each ready row: composes + creates the landing issue
   *      via createIssueRaw, dispatches the impl agent via
   *      assignCustomCopilotAgent('implementation-agent'), records the
   *      result in a DesignFanOutRow.
   *   4. For each non-ready row that's part of the coordination block:
   *      records its current decision status as a row (gives Stage 5
   *      something to poll once D-PR5 lands).
   *   5. Writes okrs/<okrId>/what/design-fan-out.yaml + commits +
   *      pushes (under the same git pattern as commitAndPushOkrYaml).
   *   6. Re-fires the pane's pre-flight so the UI reflects the new
   *      opened rows.
   *
   * Idempotent: re-running fan-out is a no-op on rows already at
   * `opened` (the pre-flight engine flags them via alreadyOpenedRepos,
   * sourced from the existing design-fan-out.yaml on disk).
   */
  | { type: 'fanOut'; okrId: string }
  /**
   * Reset fan-out — delete the OKR's design-fan-out.yaml so the card
   * returns to its pre-fan-out state and a clean fan-out can re-run.
   * Does NOT close landing issues or revert PRs.
   */
  | { type: 'resetFanOut'; okrId: string }
  /**
   * D-PR5 Stage 5 — poll impl PRs for an OKR.
   *
   * For each row in design-fan-out.yaml at status `opened` or
   * `pr-opened`, queries the target repo for PRs that reference the
   * landing issue. Updates the row's status (pr-opened/pr-merged/
   * pr-rejected) + impl PR URL when state changes. Writes
   * design-fan-out.yaml + commits + pushes only when something
   * actually moved (no-op otherwise — keeps git history clean).
   *
   * Re-fires `fanOutPreflight` after polling so the pane reflects new
   * states. The engine reads the updated row PR-states + derives
   * upstreamPrStates from them, which is what flips
   * pending-on-upstream rows to ready after their upstream merges.
   *
   * Webview wires this on a 60s cadence when an OKR detail with a
   * completed WHAT phase is visible; pauses on view-change.
   */
  | { type: 'pollFanOutPRs'; okrId: string };

export type LookingGlassExtensionMessage =
  | { type: 'portfolioData'; data: PortfolioSummary; workspaceFolders?: string[] }
  | { type: 'barDetail'; bar: BarSummary; decisions: GovernanceDecision[]; repoTree: string[]; diagrams?: MermaidDiagrams; adrs?: AdrRecord[]; calmData?: object | null; layouts?: { context: object | null; logical: object | null }; savedThreatModel?: ThreatModelResult | null; decayInfo?: { rawComposite: number; decayedComposite: number; decayFactor: number; daysSinceAssessment: number; inGraceWindow: boolean } }
  | { type: 'meshInitialized'; path: string; repoUrl?: string }
  | { type: 'platformAdded'; id: string; name: string }
  | { type: 'barScaffolded'; id: string; name: string; path: string }
  | { type: 'folderPicked'; path: string }
  | { type: 'loading'; active: boolean; message?: string }
  | { type: 'error'; message: string }
  | { type: 'info'; message: string }
  | { type: 'noMeshConfigured' }
  | { type: 'orgScanProgress'; step: string; progress: number }
  | { type: 'orgScanResults'; recommendation: OrgScanRecommendation }
  | { type: 'orgScanApplied'; platformCount: number; barCount: number }
  | { type: 'orgReposLoaded'; repos: OrgRepo[] }
  | { type: 'reposAddedToBar'; barPath: string; count: number }
  | { type: 'samplePlatformCreated'; platformCount: number; barCount: number }
  | { type: 'githubDefaults'; login: string; orgs: string[]; defaultPath: string }
  | { type: 'initProgress'; steps: { label: string; status: 'pending' | 'active' | 'done' | 'error' }[] }
  | { type: 'availableModels'; models: { id: string; family: string; name: string; vendor: string }[]; defaultFamily: string }
  | { type: 'threatModelProgress'; step: string; progress: number }
  | { type: 'threatModelGenerated'; result: ThreatModelResult }
  | { type: 'threatModelFailed' }
  | { type: 'threatModelExported'; filePath: string }
  | { type: 'adrList'; adrs: AdrRecord[] }
  | { type: 'adrSaved'; adr: AdrRecord }
  | { type: 'adrDeleted'; adrId: string }
  | { type: 'appYamlUpdated' }
  | { type: 'gitStatusUpdated'; status: GitSyncStatus }
  | { type: 'syncComplete'; barPath: string; message: string }
  | { type: 'syncError'; barPath: string; message: string }
  | { type: 'syncProgress'; barPath: string; step: string }
  | { type: 'pushComplete'; message: string }
  | { type: 'pushError'; message: string }
  | { type: 'pullComplete'; message: string }
  | { type: 'pullError'; message: string }
  | { type: 'capabilityModelSwitched'; modelType: CapabilityModelType }
  | { type: 'policiesLoaded'; policies: PolicyFile[]; nistControls: NistControl[] }
  | { type: 'policySaved'; filename: string }
  | { type: 'nistControlDetail'; control: NistControl | null }
  | { type: 'policyBaselineProgress'; filename: string; step: string; progress: number }
  | { type: 'policyBaselineGenerated'; filename: string }
  // Oraculum integration — active review detection
  | { type: 'activeReview'; barPath: string; review: ActiveReviewInfo | null }
  | { type: 'agentStatusUpdate'; barPath: string; status: AgentStatusInfo | null }
  // Top findings summary (LLM-powered)
  | { type: 'topFindingsProgress'; barPath: string; step: string; progress: number }
  | { type: 'topFindingsSummary'; barPath: string; summary: TopFindingsSummary | null }
  // Settings
  | { type: 'workflowStatus'; exists: boolean }
  | { type: 'workflowProvisioned' }
  | { type: 'preferredModelSaved'; family: string }
  // Coding Agent Environment readiness response — either status or error.
  | { type: 'copilotEnvStatus'; status: CopilotEnvStatus }
  | { type: 'copilotEnvStatus'; error: string }
  | { type: 'meshReinitialized' }
  | { type: 'driftWeightsLoaded'; weights: DriftWeights }
  | { type: 'driftWeightsSaved' }
  // Phase 2 — CALM editing
  | { type: 'calmDataUpdated'; calmData: object }
  | { type: 'calmValidationErrors'; errors: { severity: 'error' | 'warning' | 'info'; message: string; path: string; nodeId?: string }[] }
  // Absolem — multi-turn CALM refinement agent
  | { type: 'absolemChunk'; barPath: string; chunk: string; done: boolean }
  | { type: 'absolemPatches'; barPath: string; patches: CalmPatch[]; description: string }
  | { type: 'absolemPatchesApplied'; barPath: string; validationErrors: { severity: 'error' | 'warning' | 'info'; message: string; path: string; nodeId?: string }[] }
  | { type: 'absolemError'; barPath: string; message: string }
  // CALM component picker
  | { type: 'calmComponents'; components: { id: string; name: string; type: string; description: string; suggestedRepo: string }[] }
  | { type: 'meshRepoDetected'; owner: string; repo: string }
  // Phase 4 — Platform architecture
  | { type: 'platformArchData'; platformId: string; calmData: object }
  // Phase 5 — Orchestration + Platform governance
  | { type: 'orchestrationPolicyLoaded'; policy: { autoMinScore: number; supMinScore: number; securityThreshold: number; archThreshold: number; escScoreDrop: number; escConsecutive: number; escTarget: string } | null }
  | { type: 'orchestrationPolicySaved' }
  | { type: 'platformGovernanceLoaded'; platformId: string; governance: { minimumScores: Record<string, number>; minTier: string; enforcementMode: string } | null }
  | { type: 'platformGovernanceSaved'; platformId: string }
  // Research Settings
  | { type: 'researchSettings'; payload: ResearchSettingsPayload }
  | { type: 'researchSecretSaved'; id: ResearchSecretId; hasValue: boolean }
  | { type: 'researchTestResult'; id: ResearchSecretId; ok: boolean; message: string }
  | { type: 'researchSecretPushed'; id: ResearchSecretId; ok: boolean; message: string }
  | { type: 'researchSecretPushedAll'; id: ResearchSecretId; results: Array<{ repo: string; ok: boolean; message: string }>; message: string }
  | { type: 'researchPrefsSaved' }
  // Phase 6 — Cross-BAR governance context
  | { type: 'barGovernanceContext'; barPath: string; linkedBars: { barName: string; barPath: string; relationship: string; compositeScore: number; tier: string }[]; siblingBars: { name: string; id: string; path: string; compositeScore: number; tier: string }[]; platformOverrides: string[] }
  // OKR list + detail (Phase A — read-only)
  | { type: 'okrList'; okrs: OkrListItem[] }
  | {
      type: 'okrDetail';
      okr: OkrCard;
      affectedBars: OkrAffectedBar[];
      mode: OkrDetailMode;
      /** Platforms in the mesh, for the platform-select on the edit form. */
      availablePlatforms: OkrAvailablePlatform[];
      /** All BARs across the mesh, for the affected-BARs multi-select. */
      availableBars: OkrAvailableBar[];
    }
  | { type: 'okrSampleScaffolded'; okrId: string }
  | { type: 'okrSaved'; okrId: string }
  | { type: 'okrCreated'; okrId: string }
  // Live-from-GitHub per-phase signal payload — fetched on OKR detail
  // mount to populate the rich Why/How/What cards. Per-phase entries
  // omitted when there's no data (e.g. phase not run yet); the webview
  // falls back to the pre-flight "Will run" placeholder.
  | {
      type: 'okrPhaseSignals';
      okrId: string;
      signals: {
        why?: Record<string, unknown>;
        how?: Record<string, unknown>;
        what?: Record<string, unknown>;
      };
    }
  // Emitted when the Looking Glass panel becomes active after losing
  // focus. The webview reacts by re-fetching whatever view is on screen
  // (OKR detail signals, portfolio, etc.) — keeps the UI honest when a
  // workflow pushed commits while the user was elsewhere.
  | { type: 'panelActivated' }
  | { type: 'agenticStatus'; skills: { name: string; family: string; deployed: boolean }[]; agents: { name: string; deployed: boolean }[] }
  // Bug DD cleanup (2026-05) — agenticProvisioned message type
  // removed. Was only sent by the deleted onProvisionAgentic handler.
  // The unified onProvisionWorkflow posts `workflowProvisioned` for
  // the same UI signal (badge refresh + agenticStatus follow-up).
  | { type: 'okrPhaseStarted'; okrId: string; phase: 'why' | 'how' | 'what'; actionId: string; issueUrl: string }
  | {
      type: 'startPhasePreview';
      okrId: string;
      phase: 'why' | 'how' | 'what';
      agent: string;
      issueLabel: string;
      body: string;
    }
  | {
      type: 'hatterTagSheet';
      okrId: string;
      actionId: string;
      /** Parsed tag JSON, or null if the artifact had no parseable Hatter's Tag. */
      tag: unknown | null;
      /** When tag is null, why — surfaced in the sheet as a friendly message. */
      reason?: string;
    }
  /**
   * Phase E E1 — payload for the Verify Chain modal. `verdict` is the
   * ChainVerifyVerdict shape from `webview/chainVerify.ts`; carried as
   * `unknown` here to avoid a cross-package dep (the webview's render
   * function casts back to the structured shape). When `verdict` is
   * null the modal renders the `reason` string instead.
   */
  | {
      type: 'chainVerifySheet';
      okrId: string;
      actionId: string;
      runId: string;
      verdict: unknown | null;
      reason?: string;
    }
  /**
   * D-PR4 sub-PR 3b — payload for the OKR detail's fan-out pre-flight
   * pane. Discriminated on `ok`: failures map 1:1 to the engine's
   * `FanOutPreflightReport` failure variants; success carries the
   * per-repo decisions + ready set + topological waves the panel
   * renders. `report` is typed `unknown` to avoid leaking the
   * coordination types into webview message land — the webview's
   * renderer casts back to `FanOutPreflightReport` from
   * `services/coordination/fanOutEngine`.
   *
   * `skippedRepos` carries repos in `targetCodeRepos[]` whose status
   * is `not-connected` or `unreachable` (engine can't probe them);
   * surfaced as a yellow chip next to the pre-flight pane so the user
   * knows they need to set the status before fan-out can include them.
   *
   * `setupError` carries the friendly message when pre-flight couldn't
   * even start (mesh not initialized, OKR not found, no completed WHAT
   * action yet, artifact fetch failed). Webview renders this as the
   * top-level state of the card.
   */
  | {
      type: 'fanOutPreflightResult';
      okrId: string;
      ok: boolean;
      report?: unknown;
      setupError?: string;
      skippedRepos?: Array<{ slug: string; status: 'not-connected' | 'unreachable' }>;
    };
