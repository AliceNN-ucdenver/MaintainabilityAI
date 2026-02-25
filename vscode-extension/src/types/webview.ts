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
} from './governance';

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
  | { type: 'workspaceFolders'; folders: { name: string; path: string }[]; selectedPath?: string };

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
  | { type: 'configureSecrets' };

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
  | { type: 'syncStatus'; behind: number; ahead: number; branch: string }
  | { type: 'repoSynced' };

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

export interface ReviewFinding {
  pillar: ReviewPillar;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  location: string;
  expected: string;
  actual: string;
  action: string;
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
  | { type: 'navigateToBar'; agent?: 'claude' | 'copilot' };

export type OracularExtensionMessage =
  | { type: 'meshRepoDetected'; owner: string; repo: string }
  | { type: 'promptPacksLoaded'; packs: { id: string; name: string; description: string; domain?: string; required?: boolean; available: boolean }[] }
  | { type: 'reviewCreated'; url: string; number: number }
  | { type: 'agentAssigned'; agent: AgentAssignment; commentUrl?: string }
  | { type: 'workflowNotFound' }
  | { type: 'commentsUpdated'; comments: IssueComment[] }
  | { type: 'prDetected'; pr: LinkedPullRequest }
  | { type: 'prStatusUpdated'; pr: LinkedPullRequest }
  | { type: 'labelsUpdated'; labels: string[] }
  | { type: 'issueState'; hasReviewLabel: boolean; hasComments: boolean; labels: string[] }
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
// Looking Glass Message Protocol
// ============================================================================

export type LookingGlassWebviewMessage =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'initMesh'; name: string; org: string; owner: string; folderPath: string; createRepo: boolean; repoName: string; repoVisibility: 'private' | 'public'; architectureDsl: ArchitectureDsl; capabilityModel: CapabilityModelType }
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
  | { type: 'pushMesh' }
  | { type: 'pullMesh' }
  | { type: 'switchCapabilityModel'; modelType: CapabilityModelType }
  | { type: 'uploadCustomModel'; jsonContent: string }
  | { type: 'openRepoInContext'; repoUrl: string; barPath: string }
  | { type: 'openScorecard'; folderPath: string }
  | { type: 'scaffoldComponent'; repoUrl: string; barPath: string }
  | { type: 'loadPolicies' }
  | { type: 'savePolicy'; filename: string; content: string }
  | { type: 'lookupNistControl'; controlId: string }
  | { type: 'createNistCatalog' }
  | { type: 'generatePolicyBaseline'; filename: string }
  // Phase 2 — CALM editing
  | { type: 'calmMutation'; barPath: string; patch: { op: string; target: string; field?: string; value?: unknown }[] }
  | { type: 'applyArchetype'; barPath: string; archetypeId: 'three-tier' | 'event-driven' | 'data-pipeline'; appName: string }
  | { type: 'saveLayout'; barPath: string; diagramType: 'context' | 'logical'; layout: unknown }
  | { type: 'exportPng'; barPath: string; diagramType: string; pngDataUrl: string }
  // Oraculum integration
  | { type: 'openOraculum'; barPath: string }
  | { type: 'summarizeTopFindings'; barPath: string }
  // Settings
  | { type: 'openSettings' }
  | { type: 'checkWorkflowStatus' }
  | { type: 'provisionWorkflow' }
  | { type: 'savePreferredModel'; family: string }
  | { type: 'loadIssueTemplate' }
  | { type: 'saveIssueTemplate'; content: string }
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
  | { type: 'configureMeshSecrets' };

export type LookingGlassExtensionMessage =
  | { type: 'portfolioData'; data: PortfolioSummary; workspaceFolders?: string[] }
  | { type: 'barDetail'; bar: BarSummary; decisions: GovernanceDecision[]; repoTree: string[]; diagrams?: MermaidDiagrams; adrs?: AdrRecord[]; calmData?: object | null; layouts?: { context: object | null; logical: object | null }; savedThreatModel?: ThreatModelResult | null }
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
  | { type: 'issueTemplateLoaded'; content: string; exists: boolean }
  | { type: 'issueTemplateSaved' }
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
  | { type: 'meshRepoDetected'; owner: string; repo: string };
