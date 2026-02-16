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
  | { type: 'improveDeps' };

export type ScorecardExtensionMessage =
  | { type: 'scorecardData'; data: ScorecardData }
  | { type: 'loading'; active: boolean; message?: string }
  | { type: 'error'; message: string }
  | { type: 'repoDetected'; repo: RepoInfo }
  | { type: 'pmatStatusUpdate'; installed: boolean }
  | { type: 'historyData'; history: ScorecardSnapshot[]; trends: Record<string, TrendDirection> }
  | { type: 'techStackInfo'; packageManager: string; testing: string };
