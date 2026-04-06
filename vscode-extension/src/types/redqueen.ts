// ============================================================================
// Red Queen Orchestration Types (Phase 5)
// ============================================================================

export type PermissionTier = 'autonomous' | 'supervised' | 'restricted';
export type PermissionMode = 'auto-edit' | 'ask-edit' | 'plan';
export type ThreatAccessTier = 'open' | 'summary' | 'restricted';
export type ConsensusRule = 'unanimous' | 'majority' | 'any-flag-escalates';

// ── Permission & Review ─────────────────────────────────────────────────────

export interface PermissionConfig {
  mode: PermissionMode;
  allow: string[];
  deny: string[];
  after_plan_approval?: Omit<PermissionConfig, 'after_plan_approval'>;
}

export interface ReviewConfig {
  agents: number;
  human_approval: boolean;
  escalation?: boolean;
  consensus_rule?: ConsensusRule;
}

// ── Tier Configuration ──────────────────────────────────────────────────────

export interface TierConfig {
  min_score: number;
  permissions: PermissionConfig;
  review: ReviewConfig;
  threat_access?: ThreatAccessTier;
}

// ── Policy Configuration ────────────────────────────────────────────────────

export interface PromptInjectionConfig {
  threshold: number;
  packs: string[];
  constraints: string[];
}

export interface CriticalityConfig {
  score_threshold_boost: number;
  require_multi_agent?: boolean;
  require_human_approval?: boolean;
}

export interface AgentPreferences {
  implementation?: { primary: string; fallback?: string };
  review?: { primary: string; fallback?: string };
}

export interface EscalationConfig {
  score_drop_threshold: number;
  consecutive_failures: number;
  escalation_target: string;
}

// ── Orchestration Policy (loaded from mesh.yaml) ────────────────────────────

export interface OrchestrationPolicy {
  version: number;
  permission_tiers: Record<PermissionTier, TierConfig>;
  prompt_injection: Record<string, PromptInjectionConfig>;
  criticality_multipliers: Record<string, CriticalityConfig>;
  agent_preferences: AgentPreferences;
  escalation: EscalationConfig;
}

// ── Platform Governance (loaded from platform.yaml) ─────────────────────────

export interface PlatformGovernancePolicy {
  minimumScores: Record<string, number>;
  sharedInfrastructure: Array<{
    type: string;
    name: string;
    bars: string[];
    constraint: string;
  }>;
  crossBarReview?: {
    triggers: string[];
    reviewers: string[];
  };
  orchestrationOverrides?: {
    enforcementMode?: 'strict' | 'advisory';
    minTier?: PermissionTier;
  };
}

// ── Orchestration Decision (output of evaluatePolicy) ───────────────────────

export interface OrchestrationDecision {
  barId: string;
  barName: string;
  tier: PermissionTier;
  effectiveTier: PermissionTier;
  permissions: PermissionConfig;
  review: ReviewConfig;
  promptInjections: Array<{
    pillar: string;
    score: number;
    threshold: number;
    packs: string[];
    constraints: string[];
  }>;
  threatAccess: ThreatAccessTier;
  reasoning: string[];
  platformOverrides: string[];
  criticalityAdjustment: {
    applied: boolean;
    originalTier: PermissionTier;
    boost: number;
    reason?: string;
  };
  linkedBars: Array<{
    barName: string;
    relationship: string;
  }>;
}

// ============================================================================
// Phase 7: Review Board Types
// ============================================================================

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  id: string;
  category: 'security' | 'architecture' | 'risk' | 'operations';
  severity: Severity;
  title: string;
  description: string;
  location?: string;
  recommendation: string;
  references?: string[];
}

export interface ReviewVerdict {
  reviewer: string;
  agent: 'claude' | 'copilot';
  scope: 'security' | 'architecture';
  verdict: 'approve' | 'request-changes' | 'deny';
  confidence: number;
  findings: Finding[];
  caveats: string[];
  summary: string;
}

export interface ConsensusResult {
  finalVerdict: 'approve' | 'request-changes' | 'deny';
  verdicts: ReviewVerdict[];
  mergedFindings: Finding[];
  mergedCaveats: string[];
  reasoning: string[];
  requiresHumanReview: boolean;
  highestSeverity: Severity | null;
}

// ============================================================================
// Phase 7: Feedback Loop Types
// ============================================================================

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  barId: string;
  barName: string;
  correlationId?: string;
  prNumber?: number;
  commitSha?: string;
  workflowRunId?: string;
  payload: Record<string, unknown>;
}

export interface ScoreDelta {
  barId: string;
  barName: string;
  timestamp: string;
  previousComposite: number;
  currentComposite: number;
  delta: number;
  pillarDeltas: Record<string, number>;
  trigger: 'snapshot' | 'review' | 'decay';
}

// ============================================================================
// Phase 7: Score Decay Types
// ============================================================================

export interface DecayConfig {
  halfLifeDays: number;
  minScore: number;
  graceWindowDays: number;
}

export interface GovernanceTimestamps {
  lastAssessment: string;
  lastReview: string | null;
  lastScaffold: string | null;
}

export interface DecayedScoreResult {
  rawScore: number;
  decayedScore: number;
  decayFactor: number;
  daysSinceAssessment: number;
  inGraceWindow: boolean;
  decayApplied: boolean;
}
