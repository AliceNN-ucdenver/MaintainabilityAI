// ============================================================================
// RCTRO Prompt Types
// ============================================================================

export interface RctroRequirement {
  title: string;
  details: string[];
  validation: string; // ☐ checklist item
}

export interface RctroPrompt {
  title?: string;
  role: string;
  context: string;
  task: string;
  requirements: RctroRequirement[];
  output: string;
}

// ============================================================================
// Prompt Pack Types
// ============================================================================

export interface PromptPackSelection {
  owasp: string[];           // e.g., ["A03_injection", "A04_insecure_design"]
  maintainability: string[]; // e.g., ["complexity-reduction"]
  threatModeling: string[];  // e.g., ["tampering"]
}

export interface PromptPackInfo {
  id: string;                // e.g., "A03_injection"
  category: 'owasp' | 'maintainability' | 'threat-modeling';
  name: string;              // e.g., "Injection"
  filename: string;          // e.g., "A03_injection.md"
  content?: string;          // Loaded on demand
}

export interface PromptMappings {
  codeql_to_owasp: Record<string, string>;
  owasp_categories: Record<string, OwaspCategory>;
  maintainability_triggers: Record<string, MaintainabilityTrigger>;
  severity_mapping: Record<string, string>;
  label_mapping: Record<string, string>;
}

export interface OwaspCategory {
  name: string;
  prompt_file: string;
  threat_model: string[];
  maintainability: string[];
}

export interface MaintainabilityTrigger {
  prompt_file: string;
  keywords: string[];
}

// ============================================================================
// Tech Stack Types
// ============================================================================

export interface TechStack {
  language: string;          // "TypeScript", "JavaScript", "Python"
  runtime: string;           // "Node 20", "Deno", "Bun"
  framework: string;         // "Express", "Next.js", "FastAPI"
  database: string;          // "PostgreSQL", "MongoDB", "SQLite"
  testing: string;           // "Jest", "Vitest", "Mocha"
  validation: string;        // "Zod", "Joi", "Yup"
  cicd: string;              // "GitHub Actions", "GitLab CI"
  packageManager: string;    // "npm", "yarn", "pnpm"
}

// ============================================================================
// GitHub / Issue Types
// ============================================================================

export interface RepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
  remoteUrl: string;
}

export interface IssueCreationRequest {
  title: string;
  rctroPrompt: RctroPrompt;
  selectedPacks: PromptPackSelection;
  packContents: PromptPackContent[];
  techStack: TechStack;
  labels: string[];
  repo: RepoInfo;
}

export interface PromptPackContent {
  id: string;
  category: 'owasp' | 'maintainability' | 'threat-modeling';
  name: string;
  filename: string;
  content: string;
}

export interface IssueCreationResult {
  url: string;
  number: number;
  title: string;
}

export interface GitHubIssueListItem {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: { name: string; color: string }[];
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  url: string;
}

// ============================================================================
// LLM Provider Types
// ============================================================================

export type LlmProviderType = 'vscode-lm' | 'claude' | 'openai';

export interface AvailableModel {
  id: string;           // e.g., "copilot-codex"
  family: string;       // e.g., "codex" — used as the value for selectChatModels
  name: string;         // e.g., "Codex"
  vendor: string;       // e.g., "copilot"
  version: string;      // e.g., "5.3"
  maxInputTokens: number;
}

export interface LlmProvider {
  readonly name: string;
  generateRctro(
    description: string,
    techStack: TechStack,
    promptPackContents: string[],
    existingRctro?: RctroPrompt,
    modelOverride?: string
  ): Promise<RctroPrompt>;
}

// ============================================================================
// Workflow Phase Types
// ============================================================================

export type WorkflowPhase = 'input' | 'review' | 'submit' | 'assign' | 'monitor' | 'complete';

export type PhaseStatus = 'pending' | 'active' | 'completed' | 'error';

export type AgentAssignment = 'claude' | 'copilot' | 'skip';

export interface IssueComment {
  id: number;
  author: string;
  authorAvatarUrl: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isBot: boolean;
}

export interface LinkedPullRequest {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  branch: string;
  checksStatus: 'pending' | 'passing' | 'failing' | 'unknown';
  mergeable: boolean;
  draft: boolean;
}

// ============================================================================
// Webview Message Protocol
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
  | { type: 'backToHub' };

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
  | { type: 'prefillDescription'; description: string; packs?: { owasp: string[]; maintainability: string[]; threatModeling: string[] } };

// ============================================================================
// Issue Templates
// ============================================================================

export interface IssueTemplate {
  id: string;
  name: string;
  defaultPacks: PromptPackSelection;
  descriptionHint: string;
}

// ============================================================================
// Scaffold Types
// ============================================================================

export interface ScaffoldOptions {
  includeClaudeMd: boolean;
  includeCopilotMd: boolean;
  includeChatgptMd: boolean;
  includeAgentsMd: boolean;
  includeAliceRemediation: boolean;
  includeCodeql: boolean;
  includeCodeqlToIssues: boolean;
  includeFitnessFunctions: boolean;
  includePromptHashes: boolean;
  includePrTemplate: boolean;
  includeSecurityPolicy: boolean;
  includeAutomation: boolean;
  includePromptPacks: boolean;
  selectedOwaspPacks: string[];
}

// ============================================================================
// Scorecard Types
// ============================================================================

export type MetricStatus = 'green' | 'yellow' | 'red' | 'unknown' | 'loading';

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F' | '?';

export interface MetricResult {
  status: MetricStatus;
  label: string;
  value: string;
  score: number;        // 0-100, -1 = unknown
  details?: string;
  lastUpdated: string;
}

export interface WorkflowRunSummary {
  name: string;
  status: 'success' | 'failure' | 'pending' | 'unknown';
  conclusion: string | null;
  url: string;
  updatedAt: string;
}

export interface SdlcCompletenessItem {
  label: string;
  present: boolean;
  path: string;
}

export interface OwaspIssueSummary {
  category: string;
  displayName: string;
  openCount: number;
}

export interface ScorecardData {
  grade: HealthGrade;
  compositeScore: number;
  metrics: {
    securityCompliance: MetricResult;
    dependencyFreshness: MetricResult;
    testCoverage: MetricResult;
    complexity: MetricResult;
    technicalDebt: MetricResult;
    cicdHealth: MetricResult;
  };
  sdlcCompleteness: SdlcCompletenessItem[];
  owaspIssues: OwaspIssueSummary[];
  pmatInstalled: boolean;
  repo: RepoInfo | null;
  lastRefreshed: string;
}

// ============================================================================
// Scorecard History Types
// ============================================================================

export interface ScorecardSnapshot {
  timestamp: string;
  compositeScore: number;
  grade: HealthGrade;
  metrics: Record<string, number>;
}

export type TrendDirection = 'improving' | 'stable' | 'declining' | 'new';

// ============================================================================
// pmat CLI Types
// ============================================================================

export interface PmatComplexityResult {
  averageComplexity: number;
  maxComplexity: number;
  totalFunctions: number;
  hotspots: { file: string; function: string; complexity: number }[];
}

export interface PmatTechDebtFile {
  filePath: string;
  grade: string;
  score: number;
  language: string;
  issues: string[];
}

export interface PmatTechDebtResult {
  score: number;
  totalItems: number;
  categories: { category: string; count: number; severity: string }[];
  /** Files graded below B (B-, C+, C, C-, D+, D, D-, F) sorted worst-first */
  problemFiles: PmatTechDebtFile[];
}

export interface CoverageFileDetail {
  filePath: string;
  linePct: number;
  branchPct: number;
  functionPct: number;
  uncoveredFunctions: string[];
}

export interface OutdatedDependency {
  name: string;
  ageDays: number;
  currentVersion: string;
}

export interface PmatDepsResult {
  totalDeps: number;
  outdatedCount: number;
  details: { name: string; current: string; latest: string; ageDays: number }[];
}

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
  | { type: 'createFeature' };

export type ScorecardExtensionMessage =
  | { type: 'scorecardData'; data: ScorecardData }
  | { type: 'loading'; active: boolean; message?: string }
  | { type: 'error'; message: string }
  | { type: 'repoDetected'; repo: RepoInfo }
  | { type: 'pmatStatusUpdate'; installed: boolean }
  | { type: 'historyData'; history: ScorecardSnapshot[]; trends: Record<string, TrendDirection> }
  | { type: 'techStackInfo'; packageManager: string; testing: string };

// ============================================================================
// Governance Mesh Types (Looking Glass)
// ============================================================================

export type Criticality = 'critical' | 'high' | 'medium' | 'low';
export type LifecycleStage = 'build' | 'run' | 'sunset' | 'decommission';
export type PillarStatus = 'passing' | 'warning' | 'failing' | 'unknown';
export type RationalizationStrategy = 'reassess' | 'extract' | 'advance' | 'prune';
export type ArchitectureDsl = 'calm' | 'markdown';
export type CapabilityModelType = 'insurance' | 'banking' | 'custom';
export type EaLens = 'business' | 'application' | 'policies' | 'data' | 'technology' | 'integration';

export interface CapabilityDefinition {
  level: 'L1' | 'L2' | 'L3';
  name: string;
  description: string;
  children?: Record<string, CapabilityDefinition>;
}

export interface CapabilityModelFile {
  $schema: string;
  $id: string;
  'unique-id': string;
  name: string;
  'model-type': CapabilityModelType;
  'decorator-type': 'business-capability';
  definitions: Record<string, CapabilityDefinition>;
}

export interface CapabilityNode {
  key: string;
  level: 'L1' | 'L2' | 'L3';
  name: string;
  description: string;
  childCount: number;
  barCount: number;
  childKeys: string[];
  parentKey: string | null;
}

export interface CapabilityModelSummary {
  modelName: string;
  modelType: CapabilityModelType;
  l1Capabilities: CapabilityNode[];
  allNodes: Record<string, CapabilityNode>;
  capabilityToBarMap: Record<string, string[]>;
}

export interface PortfolioConfig {
  id: string;                // PF-<ORG>-<SEQ>
  name: string;
  org: string;
  owner: string;
  description: string;
  architectureDsl?: ArchitectureDsl;
  capabilityModel?: CapabilityModelType;
}

export interface PlatformConfig {
  id: string;                // PLT-<ABBR>
  name: string;
  portfolio: string;         // Back-reference to portfolio ID
  owner: string;
  description: string;
}

export interface AppManifest {
  id: string;                // APP-<PLT>-<SEQ>
  name: string;
  portfolio: string;
  platform: string;
  criticality: Criticality;
  lifecycle: LifecycleStage;
  strategy: RationalizationStrategy; // Forrester REAP: reassess | extract | advance | prune
  owner: string;
  description: string;
  repos: string[];
}

// ============================================================================
// Review Metrics Types (Design Drift)
// ============================================================================

export interface PillarFindingCounts {
  findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ReviewRecord {
  issueUrl: string;
  issueNumber: number;
  date: string;                    // YYYY-MM-DD
  agent: 'claude' | 'copilot' | 'manual';
  pillars: Record<string, PillarFindingCounts>;
  driftScore: number;              // 0-100 (100 = no drift)
}

export interface TopFindingsSummary {
  architecture: string[];
  security: string[];
  informationRisk: string[];
  operations: string[];
}

export interface ActiveReviewInfo {
  issueNumber: number;
  issueUrl: string;
  title: string;
  agent: 'claude' | 'copilot' | 'unknown';
  pr?: { number: number; url: string; title: string; draft: boolean };
}

export interface PillarArtifact {
  label: string;
  path: string;              // Relative path within BAR
  present: boolean;
  nonEmpty: boolean;
}

export interface GovernancePillarScore {
  pillar: 'architecture' | 'security' | 'information-risk' | 'operations';
  score: number;             // 0-100
  status: PillarStatus;
  artifacts: PillarArtifact[];
}

export interface GovernanceDecision {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  owner: string;
}

export interface BarSummary {
  id: string;                // APP-<PLT>-<SEQ>
  name: string;
  platformId: string;
  platformName: string;
  criticality: Criticality;
  lifecycle: LifecycleStage;
  strategy: RationalizationStrategy;
  architecture: GovernancePillarScore;
  security: GovernancePillarScore;
  infoRisk: GovernancePillarScore;
  operations: GovernancePillarScore;
  compositeScore: number;
  pendingDecisions: number;
  adrCount: number;
  repos: string[];           // Linked repository URLs from app.yaml
  repoCount: number;
  path: string;              // Filesystem path to BAR root
  reviews?: ReviewRecord[];         // Review history for design drift
  latestDriftScore?: number;       // Latest review drift score (shortcut)
}

export interface PlatformSummary {
  id: string;
  name: string;
  barCount: number;
  compositeHealth: number;   // Average of BAR composites
  bars: BarSummary[];
}

export interface PortfolioSummary {
  portfolio: PortfolioConfig;
  totalBars: number;
  portfolioHealth: number;   // 0-100 weighted average
  pendingDecisions: number;
  governanceCoverage: number; // % of BARs with all pillars >= warning
  platforms: PlatformSummary[];
  allBars: BarSummary[];     // Flattened for table view
  capabilityModel?: CapabilityModelSummary;
}

export interface DriftWeights {
  critical: number;   // default 15
  high: number;       // default 5
  medium: number;     // default 2
  low: number;        // default 1
}

export interface MeshScoringConfig {
  passingThreshold: number;  // default 75
  warningThreshold: number;  // default 50
  driftWeights?: DriftWeights;
}

export interface MermaidDiagrams {
  sequence?: string;     // Mermaid sequenceDiagram from bar.arch.json flows
  capability?: string;   // Mermaid mindmap from decorator mappings
  threat?: string;       // Mermaid threat diagram from security/threat-model.md
  // Context + Logical diagrams now use ReactFlow (raw CALM JSON sent to webview)
}

// ============================================================================
// Git Sync Types
// ============================================================================

export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';

export interface PillarGitStatus {
  isDirty: boolean;
  dirtyFileCount: number;
  dirtyFiles: string[];      // filenames relative to BAR dir
}

export interface BarGitStatus {
  isDirty: boolean;
  dirtyFileCount: number;
  pillarStatus: {
    architecture: PillarGitStatus;
    security: PillarGitStatus;
    infoRisk: PillarGitStatus;
    operations: PillarGitStatus;
  };
}

export interface GitSyncStatus {
  isGitRepo: boolean;
  hasRemote: boolean;
  hasUpstream: boolean;       // tracking branch configured
  ahead: number;
  behind: number;
  dirtyFiles: Record<string, GitFileStatus>;  // relative to git root
  barStatus: Record<string, BarGitStatus>;    // key = barPath
}

// ============================================================================
// Policy & NIST Control Types
// ============================================================================

export interface PolicyFile {
  filename: string;
  label: string;
  pillar: 'architecture' | 'security' | 'risk' | 'operations' | 'nist';
  content: string;
}

export interface NistControl {
  id: string;
  name: string;
  family: string;
  familyId: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Threat Model Types
// ============================================================================

export interface ThreatEntry {
  id: string;
  category: 'spoofing' | 'tampering' | 'repudiation' | 'information-disclosure' | 'denial-of-service' | 'elevation-of-privilege';
  target: string;
  targetName: string;
  dataClassification: string;
  description: string;
  attackVector: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'high' | 'medium' | 'low';
  existingControls: string[];
  controlEffectiveness: 'full' | 'partial' | 'none';
  residualRisk: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  recommendedMitigations: string[];
  nistReferences: string[];
}

export interface ThreatModelResult {
  threats: ThreatEntry[];
  summary: {
    totalThreats: number;
    byCategory: Record<string, number>;
    byRisk: Record<string, number>;
    unmitigatedCount: number;
  };
  mermaidDiagram: string;
}

// ============================================================================
// Architecture Decision Record Types (BTABoK-inspired)
// ============================================================================

export type AdrLinkType = 'supersedes' | 'depends-on' | 'related';

export interface AdrLink {
  type: AdrLinkType;
  targetId: string;   // e.g., "ADR-001"
}

export interface AdrCharacteristics {
  reversibility: number;  // 1=irreversible, 5=easily reversible
  cost: number;           // 1=very high cost, 5=minimal cost
  risk: number;           // 1=very high risk, 5=minimal risk
  complexity: number;     // 1=very complex, 5=simple
  effort: number;         // 1=very high effort, 5=minimal effort
}

export interface AdrRecord {
  id: string;                  // ADR-001, ADR-002, etc.
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  date: string;                // ISO date
  deciders: string;            // Who made the decision
  context: string;             // Background and forces at play
  decision: string;            // The chosen approach
  consequences: string;        // Positive and negative outcomes
  alternatives?: string;       // Options considered
  references?: string;         // Links, diagrams, related ADRs
  links?: AdrLink[];
  characteristics?: AdrCharacteristics;
}

// ============================================================================
// Org Scanner Types (Phase 2)
// ============================================================================

export interface OrgRepo {
  name: string;
  fullName: string;         // "org/repo"
  description: string;
  language: string | null;
  url: string;              // html_url
  defaultBranch: string;
  updatedAt: string;
  topics: string[];
  readme: string;           // README content (truncated to ~2000 chars)
  isArchived: boolean;
  isFork: boolean;
}

export interface RecommendedBar {
  id: string;               // temp client-side ID for drag/drop (e.g., "bar-1")
  name: string;
  repos: OrgRepo[];         // One or more repos in this BAR
  criticality: Criticality;
  rationale: string;        // LLM explanation of why these repos are grouped
}

export interface RecommendedPlatform {
  id: string;               // temp client-side ID (e.g., "plat-1")
  name: string;
  abbreviation: string;     // For PLT-<ABBR> ID
  bars: RecommendedBar[];
  rationale: string;
}

export interface OrgScanRecommendation {
  platforms: RecommendedPlatform[];
  unassigned: OrgRepo[];    // Repos the LLM couldn't confidently place
  updates?: ExistingBarUpdate[];  // Modifications to existing BARs (when context provided)
}

export interface ExistingBarUpdate {
  barPath: string;           // filesystem path to the existing BAR
  barName: string;           // display name
  platformName: string;      // platform the BAR belongs to
  addRepos: string[];        // repo URLs to add
  rationale: string;         // LLM explanation
}

export interface ExistingStructureContext {
  platforms: Array<{
    name: string;
    id: string;
    bars: Array<{
      name: string;
      id: string;
      path: string;
      repos: string[];
    }>;
  }>;
}

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

export type AbsolemCommand = 'drift-analysis' | 'add-components' | 'validate' | 'freeform';

export interface CalmPatch {
  op: 'addNode' | 'removeNode' | 'addRelationship' | 'removeRelationship'
    | 'updateField' | 'setControl' | 'removeControl' | 'setCapabilities'
    | 'setInterfaces' | 'updateComposedOf';
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
  | { type: 'absolemClose'; barPath: string };

export type LookingGlassExtensionMessage =
  | { type: 'portfolioData'; data: PortfolioSummary }
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
  | { type: 'absolemError'; barPath: string; message: string };
