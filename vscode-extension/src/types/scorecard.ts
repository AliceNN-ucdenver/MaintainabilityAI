import type { PromptPackSelection } from './prompts';
import type { RepoInfo } from './github';

// ============================================================================
// Unified Agent Status Types
// ============================================================================

export type AgentStatusPhase =
  | 'awaiting-approval'
  | 'planning'
  | 'plan-review'
  | 'implementing'
  | 'pr-review'
  | 'pr-checks-failing'
  | 'complete';

export interface AgentStatusInfo {
  phase: AgentStatusPhase;
  agent: 'claude' | 'copilot' | 'unknown';
  issue: { number: number; url: string; title: string };
  pr?: {
    number: number; url: string; title: string;
    draft: boolean; checksStatus: 'pending' | 'passing' | 'failing' | 'unknown';
    mergeable: boolean; state: 'open' | 'closed' | 'merged';
    reviewRequested: boolean;
  };
  workflowRun?: { name: string; url: string };
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

export interface ComponentScaffoldContext {
  barPath: string;
  barName: string;
  repoUrl: string;
  repoName: string;               // Just the repo name portion (e.g. "my-service")
  description: string;            // Pre-built markdown with all BAR context
  packs: PromptPackSelection;     // Pre-selected prompt packs for Rabbit Hole
}

/** Persisted to globalState before workspace switch so activate() can resume the flow. */
export interface WhiteRabbitBreadcrumb {
  targetFolder: string;
  componentContext: ComponentScaffoldContext;
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
  status: 'success' | 'failure' | 'pending' | 'waiting' | 'unknown';
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
