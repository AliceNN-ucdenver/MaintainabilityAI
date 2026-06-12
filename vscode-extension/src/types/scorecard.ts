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
  /** runId enables the in-app "Approve & run" lifecycle action. */
  workflowRun?: { name: string; url: string; runId?: number };
}

export interface ComponentScaffoldContext {
  barPath: string;
  barName: string;
  repoUrl: string;
  repoName: string;               // Just the repo name portion (e.g. "my-service")
  repoFullName?: string;           // owner/repo when repoUrl is a GitHub URL
  description: string;            // Pre-built markdown with all BAR context
  packs: PromptPackSelection;     // Pre-selected prompt packs for Rabbit Hole
  governanceTier?: string;        // Phase 6 — governance tier from Red Queen orchestration
}

/** Pre-fill for the Scorecard's inline Rabbit Hole sheet — used by the
 *  "Create Issue" command and the post-component-scaffold handoff (Cheshire v2,
 *  replacing the IssueCreatorPanel). */
export interface RabbitHolePrefill {
  taskKind: string;
  heading: string;
  description: string;
  packs: PromptPackSelection;
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

/** One row of the "Fitness Tests" section — does an executable fitness function
 *  exist in the suite for this characteristic, and what ratchet backs it. */
export interface FitnessTestResult {
  category: string;                     // 'duplicate', 'dead-code', 'complexity', …
  group: 'structural' | 'runtime';
  status: 'present' | 'absent';         // 'stale' is a future refinement
  testPath?: string;                    // matched convention file (repo-relative)
  unit?: string;                        // '%', 'violations', …
  floor?: number;                       // no-regression line (from tests/fitness/baselines.json)
  target?: number;                      // aspirational goal
  measured?: number;                    // last recorded measurement
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
  fitnessTests: FitnessTestResult[];
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
  ageDays: number;            // days since the latest version was published
  currentVersion: string;     // version range declared in package.json
  installedVersion?: string;  // resolved version from the lockfile (if found)
  latestVersion?: string;     // latest version on the npm registry
  /** `behind` = a newer version exists (an upgrade can fix it);
   *  `dormant` = already on latest, but latest is >1yr old (advisory only). */
  kind: 'behind' | 'dormant';
}
