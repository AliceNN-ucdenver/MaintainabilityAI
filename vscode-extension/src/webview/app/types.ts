/**
 * Consolidated webview types — single source of truth for all browser-side
 * type definitions. esbuild inlines this into each IIFE bundle at build time.
 *
 * These mirror the Node-side types in src/types/ but use looser typing where
 * appropriate (e.g. string instead of union literals) since the browser
 * receives JSON payloads.
 */

// ============================================================================
// VS Code API
// ============================================================================

export interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

// ============================================================================
// Prompt / Issue Creator Types
// ============================================================================

export interface PromptPackInfo {
  id: string;
  category: string;
  name: string;
  filename: string;
}

export interface RctroPrompt {
  title?: string;
  role: string;
  context: string;
  task: string;
  requirements: { title: string; details: string[]; validation: string }[];
  output: string;
}

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
  reviewRequested: boolean;
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
// Scorecard Types
// ============================================================================

export type MetricStatus = 'green' | 'yellow' | 'red' | 'unknown' | 'loading';
export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F' | '?';

export interface MetricResult {
  status: MetricStatus;
  label: string;
  value: string;
  score: number;
  details?: string;
  lastUpdated: string;
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
  repo: { owner: string; repo: string } | null;
  lastRefreshed: string;
}

export interface ScorecardSnapshot {
  timestamp: string;
  compositeScore: number;
  grade: HealthGrade;
  metrics: Record<string, number>;
}

export type TrendDirection = 'improving' | 'stable' | 'declining' | 'new';

// ============================================================================
// Agent Status Types
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
// Oraculum Types
// ============================================================================

export type ReviewPillar = 'architecture' | 'security' | 'risk' | 'operations';
export type AgentAssignment = 'claude' | 'copilot' | 'skip';

/** Slim BAR summary used by Oraculum (subset of full BarSummary). */
export interface BarSummarySlim {
  id: string;
  name: string;
  platformId: string;
  platformName: string;
  criticality: string;
  lifecycle: string;
  compositeScore: number;
  repos: string[];
  path: string;
}

export interface PromptPackOption {
  id: string;
  name: string;
  description: string;
  domain?: string;
  required?: boolean;
  available: boolean;
}

// ============================================================================
// Governance / Looking Glass Types
// ============================================================================

export type Criticality = 'critical' | 'high' | 'medium' | 'low';
export type LifecycleStage = 'build' | 'run' | 'sunset' | 'decommission';
export type PillarStatus = 'passing' | 'warning' | 'failing' | 'unknown';
export type RationalizationStrategy = 'reassess' | 'extract' | 'advance' | 'prune';

export interface PortfolioConfig {
  id: string;
  name: string;
  org: string;
  owner: string;
  description: string;
}

export interface PillarArtifact {
  label: string;
  path: string;
  present: boolean;
  nonEmpty: boolean;
  qualityScore: number;
}

export interface GovernanceScoreSnapshot {
  timestamp: string;
  composite: number;
  architecture: number;
  security: number;
  information_risk: number;
  operations: number;
}

export type GovernanceTrend = 'improving' | 'stable' | 'declining' | 'new';

export interface GovernancePillarScore {
  pillar: string;
  score: number;
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
  date: string;
  agent: 'claude' | 'copilot' | 'manual';
  pillars: Record<string, PillarFindingCounts>;
  driftScore: number;
}

export interface ActiveReviewInfo {
  issueNumber: number;
  issueUrl: string;
  title: string;
  agent: 'claude' | 'copilot' | 'unknown';
  pr?: { number: number; url: string; title: string; draft: boolean };
}

/** Full BAR summary used by Looking Glass (superset of BarSummarySlim). */
export interface BarSummary {
  id: string;
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
  repos: string[];
  repoCount: number;
  path: string;
  reviews?: ReviewRecord[];
  latestDriftScore?: number;
  scoreHistory?: GovernanceScoreSnapshot[];
  scoreTrend?: GovernanceTrend;
  pillarTrends?: {
    architecture: GovernanceTrend;
    security: GovernanceTrend;
    infoRisk: GovernanceTrend;
    operations: GovernanceTrend;
  };
}

export interface PlatformSummary {
  id: string;
  name: string;
  barCount: number;
  compositeHealth: number;
  bars: BarSummary[];
}

export interface PortfolioSummary {
  portfolio: PortfolioConfig;
  totalBars: number;
  portfolioHealth: number;
  pendingDecisions: number;
  governanceCoverage: number;
  platforms: PlatformSummary[];
  allBars: BarSummary[];
}

// ============================================================================
// Threat Model Types
// ============================================================================

export interface ThreatEntry {
  id: string;
  category: string;
  target: string;
  targetName: string;
  dataClassification: string;
  description: string;
  attackVector: string;
  impact: string;
  likelihood: string;
  existingControls: string[];
  controlEffectiveness: string;
  residualRisk: string;
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
// Capability Model Types
// ============================================================================

export type CapabilityModelType = 'insurance' | 'banking' | 'custom';
export type EaLens = 'business' | 'application' | 'policies' | 'data' | 'technology' | 'integration';

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

// ============================================================================
// Policy / NIST Types
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
// Git Sync Types
// ============================================================================

export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';

export interface PillarGitStatus {
  isDirty: boolean;
  dirtyFileCount: number;
  dirtyFiles: string[];
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
  hasUpstream: boolean;
  ahead: number;
  behind: number;
  dirtyFiles: Record<string, GitFileStatus>;
  barStatus: Record<string, BarGitStatus>;
}

// ============================================================================
// Org Scanner Types
// ============================================================================

export interface OrgRepo {
  name: string;
  fullName: string;
  description: string;
  language: string | null;
  url: string;
  defaultBranch: string;
  updatedAt: string;
  topics: string[];
  readme: string;
  isArchived: boolean;
  isFork: boolean;
}

export interface RecommendedBar {
  id: string;
  name: string;
  repos: OrgRepo[];
  criticality: Criticality;
  rationale: string;
}

export interface RecommendedPlatform {
  id: string;
  name: string;
  abbreviation: string;
  bars: RecommendedBar[];
  rationale: string;
}

export interface OrgScanRecommendation {
  platforms: RecommendedPlatform[];
  unassigned: OrgRepo[];
  updates?: ExistingBarUpdate[];
}

export interface ExistingBarUpdate {
  barPath: string;
  barName: string;
  platformName: string;
  addRepos: string[];
  rationale: string;
}

// ============================================================================
// ADR Types
// ============================================================================

export type AdrLinkType = 'supersedes' | 'depends-on' | 'related';

export interface AdrLink {
  type: AdrLinkType;
  targetId: string;
}

export interface AdrCharacteristics {
  reversibility: number;
  cost: number;
  risk: number;
  complexity: number;
  effort: number;
}

export interface AdrRecord {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  date: string;
  deciders: string;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  references?: string;
  links?: AdrLink[];
  characteristics?: AdrCharacteristics;
}
