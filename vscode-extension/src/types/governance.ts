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
  qualityScore: number;      // 0-100, content quality assessment
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
  scoreHistory?: GovernanceScoreSnapshot[];  // Governance score over time
  scoreTrend?: GovernanceTrend;              // Composite trend direction
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

export interface GovernanceScoreSnapshot {
  timestamp: string;         // ISO 8601
  composite: number;         // 0-100
  architecture: number;
  security: number;
  information_risk: number;
  operations: number;
}

export type GovernanceTrend = 'improving' | 'stable' | 'declining' | 'new';

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
