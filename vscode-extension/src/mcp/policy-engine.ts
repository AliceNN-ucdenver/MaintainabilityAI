/**
 * The Red Queen's Court — Deterministic Governance Enforcement
 *
 * "Off with their heads!" — but only if the policy rules say so.
 *
 * Evaluates agent actions against governance constraints derived from the
 * CALM architecture model, security controls, threat models, and permission
 * tiers. Pure TypeScript engine that runs in-process — no Python sidecar,
 * no HTTP roundtrips.
 *
 * Two evaluation depths:
 *   - Layer 1 (hooks): Fast static rules from pre-computed policy.json
 *   - Layer 2 (MCP tools): Full CALM-aware evaluation from live mesh data
 */
import type { BarSummary } from '../types';
import type { GovernanceTier } from './config-scaffold';
import { computeTier } from './config-scaffold';

// ============================================================================
// Types
// ============================================================================

export interface PolicyViolation {
  ruleId: string;
  category: 'tier' | 'path' | 'security' | 'calm_flow' | 'control';
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  verdict: 'approved' | 'denied' | 'conditional';
  violations: PolicyViolation[];
  reasoning: string[];
  conditions?: string[];
}

export interface EvaluationContext {
  barId: string;
  barName: string;
  tier: GovernanceTier;
  compositeScore: number;
  actionType: string;
  toolName?: string;
  filePath?: string;
  description: string;
  sourceNode?: string;
  targetNode?: string;
  /**
   * Whether human approval has been recorded for this action. Mirrors the
   * Layer 1 hook's `REDQUEEN_PLAN_APPROVED` env / `toolInput.redqueenApproved`
   * signal. When false/undefined, tools listed under the tier's
   * `requireApproval` policy will return a conditional (warning) verdict.
   */
  approved?: boolean;
  calmModel?: {
    nodes: CalmNode[];
    relationships: CalmRelationship[];
    flows?: unknown[];
  };
  controls?: string;   // Raw YAML content
  threats?: string;     // Raw YAML content
  platformCalmModel?: {
    nodes: CalmNode[];
    relationships: CalmRelationship[];
  };
}

export interface CalmNode {
  'unique-id': string;
  name: string;
  'node-type'?: string;
  'bar-id'?: string;
  [key: string]: unknown;
}

export interface CalmRelationship {
  'unique-id': string;
  'relationship-type'?: {
    connects?: {
      source?: { node: string };
      destination?: { node: string; interfaces?: unknown[] };
    };
  };
  [key: string]: unknown;
}

/**
 * Custom team rule for the Layer 1 hook walker. Teams add entries to
 * `policy.json -> rules.customRules` to encode "we don't do it that way"
 * patterns the OWASP/STRIDE packs do not catch out of the box.
 *
 * The walker tests `denyPattern` (RE2-style regex) against the proposed
 * file content (Edit `new_string`, Write `content`) or shell command
 * (Bash `command`) when the target `appliesTo` glob matches. A match
 * fires a deny with the rule's `message` and the rule `id` is recorded
 * on the audit-log line.
 */
export interface CustomRule {
  id: string;
  category: string;
  severity: 'error' | 'warning';
  appliesTo: string[];
  denyPattern: string;
  message: string;
}

/** Static policy rules pre-computed from the mesh (for Layer 1 hooks). */
export interface StaticPolicy {
  barId: string;
  barName: string;
  tier: GovernanceTier;
  compositeScore: number;
  rules: {
    toolRestrictions: Record<GovernanceTier, {
      deny: string[];
      requireApproval: string[];
    }>;
    securityCriticalPaths: string[];
    readOnlyPaths: string[];
    allowedConnections: Array<{
      source: string;
      target: string;
      relationshipId: string;
    }>;
    /**
     * Team-extensible custom rules walked by the Layer 1 hook on every
     * Edit / Write / Bash tool call. Starts empty; teams add rules over
     * time as their institutional memory grows.
     */
    customRules: CustomRule[];
  };
  /**
   * Per-decision audit logging configuration for the Layer 1 hook.
   * When enabled, every PreToolUse decision (allow, deny, conditional)
   * appends a JSONL line to `path`. Fail-soft: if the append fails the
   * decision still emits — the hook never crashes on logging failure.
   */
  auditLog: {
    enabled: boolean;
    path: string;
  };
}

/** Constraints summary returned by get_constraints tool. */
export interface ConstraintsSummary {
  tier: GovernanceTier;
  compositeScore: number;
  permissions: {
    canEdit: boolean;
    canWrite: boolean;
    canBash: boolean;
    canCreateService: boolean;
    canModifyAuth: boolean;
    canModifyDatabase: boolean;
  };
  constraints: string[];
  securityCriticalPaths: string[];
}

// ============================================================================
// Default security-critical path patterns
// ============================================================================

const DEFAULT_SECURITY_CRITICAL_PATHS = [
  'src/auth/**',
  'src/crypto/**',
  'src/security/**',
  'config/security*',
  '.env*',
  '**/*secret*',
  '**/*credential*',
];

const DEFAULT_READ_ONLY_PATHS = [
  '.mcp.json',
  '.claude/**',
  'AGENTS.md',
  '.redqueen/**',
  '.github/hooks/**',
];

/**
 * Canonical per-tier tool restrictions. Used by BOTH:
 *   - generateStaticPolicy() to write .redqueen/policy.json for Layer 1 hooks
 *   - evaluateTierRule() to evaluate via MCP validate_action (Layer 2)
 * Keeping a single source ensures Layer 1 and Layer 2 verdicts agree.
 */
const TIER_TOOL_RESTRICTIONS: Record<GovernanceTier, { deny: string[]; requireApproval: string[] }> = {
  restricted: { deny: ['Bash', 'Write'], requireApproval: ['Edit'] },
  supervised: { deny: [], requireApproval: ['Bash'] },
  autonomous: { deny: [], requireApproval: [] },
};

// ============================================================================
// Path matching utility
// ============================================================================

/**
 * Simple glob-style path matching (supports * and **).
 * Not a full glob implementation — covers the patterns we need.
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  // Normalize separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Convert glob pattern to regex
  const regexStr = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape special regex chars (except * and ?)
    .replace(/\*\*/g, '{{DOUBLESTAR}}')      // Temp placeholder
    .replace(/\*/g, '[^/]*')                 // * matches within a segment
    .replace(/\{\{DOUBLESTAR\}\}/g, '.*')    // ** matches across segments
    .replace(/\?/g, '[^/]');                 // ? matches single char

  return new RegExp(`^${regexStr}$`).test(normalizedPath);
}

function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some(p => matchesPattern(filePath, p));
}

// ============================================================================
// Rule evaluators
// ============================================================================

/**
 * TIER-001/002/003/004: Check tool restrictions for the BAR's governance tier.
 *
 * Mirrors the Layer 1 hook in .redqueen/hooks/validate-tool.js, which reads the
 * same restrictions from .redqueen/policy.json (produced by generateStaticPolicy
 * below). Both layers honor:
 *   - `deny`: hard denial regardless of approval
 *   - `requireApproval`: denial unless ctx.approved === true (or equivalent
 *     env/toolInput signal at the hook layer)
 */
function evaluateTierRule(ctx: EvaluationContext): PolicyViolation | null {
  if (!ctx.toolName) { return null; }

  const tierRules = TIER_TOOL_RESTRICTIONS[ctx.tier];
  if (!tierRules) { return null; }

  if (tierRules.deny.includes(ctx.toolName)) {
    const ruleId = ctx.toolName === 'Bash' ? 'TIER-001'
      : ctx.toolName === 'Write' ? 'TIER-002'
      : 'TIER-004';
    return {
      ruleId,
      category: 'tier',
      severity: 'error',
      message: `Tool "${ctx.toolName}" is denied for ${ctx.tier}-tier BARs. Composite score: ${ctx.compositeScore}/100.`,
      details: ctx.tier === 'restricted'
        ? 'Restricted BARs must plan first and get approval before executing.'
        : `Improve governance scores to lift the BAR out of ${ctx.tier} tier before using ${ctx.toolName}.`,
    };
  }

  if (tierRules.requireApproval.includes(ctx.toolName) && !ctx.approved) {
    return {
      ruleId: 'TIER-003',
      category: 'tier',
      severity: 'warning',
      message: `Tool "${ctx.toolName}" requires recorded approval for ${ctx.tier}-tier BARs.`,
      details: 'Set EvaluationContext.approved=true (or REDQUEEN_PLAN_APPROVED=true / toolInput.redqueenApproved=true at the hook layer) once a human has signed off on the plan.',
    };
  }

  return null;
}

/**
 * PATH-001: Check if the file path is in a read-only location.
 */
function evaluatePathRule(ctx: EvaluationContext): PolicyViolation | null {
  if (!ctx.filePath) { return null; }
  if (!ctx.toolName || ctx.toolName === 'Read' || ctx.toolName === 'Glob' || ctx.toolName === 'Grep') {
    return null; // Read-only tools are always allowed
  }

  if (matchesAnyPattern(ctx.filePath, DEFAULT_READ_ONLY_PATHS)) {
    return {
      ruleId: 'PATH-001',
      category: 'path',
      severity: 'error',
      message: `File "${ctx.filePath}" is in a governance-managed read-only path. These files are generated by the Red Queen scaffold.`,
      details: 'Re-run scaffold_agent_config to update governance files.',
    };
  }

  return null;
}

/**
 * SEC-001/002: Check if the file is security-critical and the tier allows modification.
 *
 * Intentional asymmetry with the Layer 1 hook:
 *   - The hook (validate-tool.js) returns binary allow/deny and only ENFORCES on
 *     restricted (silent-allow on supervised). That's correct for the hook's
 *     purpose: block the unambiguously-bad fast, let the agent proceed otherwise.
 *   - This Layer 2 evaluator can return CONDITIONAL verdicts. Supervised + a
 *     security-critical path is allowed-with-warning so the agent learns to
 *     route the change through human review even though the hook didn't block.
 * Both layers agree on the hard call (restricted = deny). The supervised
 * warning is additive signal only available through validate_action.
 */
function evaluateSecurityRule(ctx: EvaluationContext): PolicyViolation | null {
  if (!ctx.filePath) { return null; }
  if (!ctx.toolName || ctx.toolName === 'Read' || ctx.toolName === 'Glob' || ctx.toolName === 'Grep') {
    return null;
  }

  if (matchesAnyPattern(ctx.filePath, DEFAULT_SECURITY_CRITICAL_PATHS)) {
    if (ctx.tier === 'restricted') {
      return {
        ruleId: 'SEC-001',
        category: 'security',
        severity: 'error',
        message: `File "${ctx.filePath}" is security-critical and cannot be modified by restricted-tier agents.`,
        details: 'Security-critical files require autonomous or supervised tier. Improve governance scores first.',
      };
    }
    if (ctx.tier === 'supervised') {
      return {
        ruleId: 'SEC-002',
        category: 'security',
        severity: 'warning',
        message: `File "${ctx.filePath}" is security-critical. Changes will require human review before merge.`,
      };
    }
  }

  return null;
}

/**
 * CALM-001: Validate that proposed connections exist in the CALM model.
 * Only runs in Layer 2 (requires full CALM model data).
 */
function evaluateCalmFlowRule(ctx: EvaluationContext): PolicyViolation | null {
  if (!ctx.calmModel || !ctx.sourceNode || !ctx.targetNode) { return null; }

  const { nodes, relationships } = ctx.calmModel;

  // Check that source and target nodes exist
  const sourceExists = nodes.some(n => n['unique-id'] === ctx.sourceNode);
  const targetExists = nodes.some(n => n['unique-id'] === ctx.targetNode);

  if (!sourceExists) {
    return {
      ruleId: 'CALM-001',
      category: 'calm_flow',
      severity: 'error',
      message: `Source node "${ctx.sourceNode}" is not declared in the CALM architecture model.`,
      details: 'Add the node to bar.arch.json before creating connections to it.',
    };
  }

  if (!targetExists) {
    return {
      ruleId: 'CALM-002',
      category: 'calm_flow',
      severity: 'error',
      message: `Target node "${ctx.targetNode}" is not declared in the CALM architecture model.`,
      details: 'Add the node to bar.arch.json before creating connections to it.',
    };
  }

  // Check that a relationship exists between source and target
  const connectionExists = relationships.some(rel => {
    const connects = rel['relationship-type']?.connects;
    if (!connects) { return false; }
    return connects.source?.node === ctx.sourceNode &&
           connects.destination?.node === ctx.targetNode;
  });

  if (!connectionExists) {
    // Check reverse direction
    const reverseExists = relationships.some(rel => {
      const connects = rel['relationship-type']?.connects;
      if (!connects) { return false; }
      return connects.source?.node === ctx.targetNode &&
             connects.destination?.node === ctx.sourceNode;
    });

    if (reverseExists) {
      return {
        ruleId: 'CALM-003',
        category: 'calm_flow',
        severity: 'warning',
        message: `Connection ${ctx.sourceNode} → ${ctx.targetNode} exists in reverse direction only. Verify the flow direction is correct.`,
      };
    }

    return {
      ruleId: 'CALM-004',
      category: 'calm_flow',
      severity: 'error',
      message: `No CALM relationship declares the connection ${ctx.sourceNode} → ${ctx.targetNode}.`,
      details: 'Add a relationship to bar.arch.json that connects these nodes before implementing.',
    };
  }

  return null;
}

/**
 * CTRL-001: Check that changes to controlled areas maintain compliance.
 * Only runs in Layer 2 (requires controls data).
 */
function evaluateControlRule(ctx: EvaluationContext): PolicyViolation | null {
  if (!ctx.controls || !ctx.targetNode) { return null; }

  // Parse controls YAML for requirements mentioning the target node
  const controlsText = ctx.controls.toLowerCase();
  const targetLower = ctx.targetNode.toLowerCase();

  // Simple heuristic: if controls mention the target node and the action
  // modifies authentication or encryption, flag it
  if (controlsText.includes(targetLower)) {
    const sensitiveActions = ['modify_authentication', 'modify_encryption', 'change_data_flow'];
    if (sensitiveActions.includes(ctx.actionType)) {
      return {
        ruleId: 'CTRL-001',
        category: 'control',
        severity: 'warning',
        message: `Node "${ctx.targetNode}" has security controls. Action "${ctx.actionType}" may affect compliance.`,
        details: 'Review security-controls.yaml to ensure controls are maintained after this change.',
      };
    }
  }

  return null;
}

/**
 * PLAT-001: Warn when modifying interfaces or data flows on nodes shared across BARs.
 * Only runs in Layer 2 (requires platform CALM model data).
 */
function evaluatePlatformRule(ctx: EvaluationContext): PolicyViolation | null {
  if (!ctx.platformCalmModel || !ctx.targetNode) { return null; }

  const crossBarActions = ['modify_interface', 'change_data_flow', 'add_endpoint'];
  if (!crossBarActions.includes(ctx.actionType)) { return null; }

  const { nodes, relationships } = ctx.platformCalmModel;

  // Find the target node in the platform CALM model (could be a BAR node or shared infra)
  const platformNode = nodes.find(n => n['unique-id'] === ctx.targetNode || n['bar-id'] === ctx.targetNode);
  if (!platformNode) { return null; }

  const platformNodeId = platformNode['unique-id'];

  // Find all BARs connected to this node
  const connectedBars: string[] = [];
  for (const rel of relationships) {
    const connects = rel['relationship-type']?.connects;
    if (!connects) { continue; }

    let otherNodeId: string | undefined;
    if (connects.source?.node === platformNodeId) {
      otherNodeId = connects.destination?.node;
    } else if (connects.destination?.node === platformNodeId) {
      otherNodeId = connects.source?.node;
    }

    if (!otherNodeId) { continue; }

    const otherNode = nodes.find(n => n['unique-id'] === otherNodeId);
    if (otherNode && otherNode['node-type'] === 'bar' && otherNode['unique-id'] !== platformNodeId) {
      connectedBars.push(otherNode.name || otherNodeId);
    }
  }

  if (connectedBars.length === 0) { return null; }

  return {
    ruleId: 'PLAT-001',
    category: 'control',
    severity: 'warning',
    message: `Node "${platformNode.name || ctx.targetNode}" is shared with ${connectedBars.join(', ')}. Changes may require coordinated updates.`,
    details: `This node has cross-BAR connections in the platform architecture. Coordinate with teams owning: ${connectedBars.join(', ')}.`,
  };
}

// ============================================================================
// Policy Engine
// ============================================================================

/**
 * Evaluate an action against all governance rules.
 *
 * For Layer 1 (hooks): Pass only tier/path/security fields — fast evaluation.
 * For Layer 2 (MCP tools): Pass calmModel/controls/threats — full evaluation.
 */
export function evaluate(ctx: EvaluationContext): PolicyDecision {
  const violations: PolicyViolation[] = [];
  const reasoning: string[] = [];

  // Always run fast rules (Layer 1 + Layer 2)
  const tierResult = evaluateTierRule(ctx);
  if (tierResult) { violations.push(tierResult); }

  const pathResult = evaluatePathRule(ctx);
  if (pathResult) { violations.push(pathResult); }

  const secResult = evaluateSecurityRule(ctx);
  if (secResult) { violations.push(secResult); }

  // Run CALM-aware rules only when data is available (Layer 2 only)
  if (ctx.calmModel) {
    const calmResult = evaluateCalmFlowRule(ctx);
    if (calmResult) { violations.push(calmResult); }
  }

  if (ctx.controls) {
    const ctrlResult = evaluateControlRule(ctx);
    if (ctrlResult) { violations.push(ctrlResult); }
  }

  // Run platform-aware rules only when data is available (Layer 2 only)
  if (ctx.platformCalmModel) {
    const platResult = evaluatePlatformRule(ctx);
    if (platResult) { violations.push(platResult); }
  }

  // Build reasoning
  reasoning.push(`BAR: ${ctx.barName} (${ctx.barId}), Tier: ${ctx.tier}, Score: ${ctx.compositeScore}/100`);
  if (ctx.toolName) { reasoning.push(`Tool: ${ctx.toolName}`); }
  if (ctx.filePath) { reasoning.push(`File: ${ctx.filePath}`); }
  if (ctx.actionType) { reasoning.push(`Action: ${ctx.actionType}`); }

  // Determine verdict
  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');

  if (errors.length > 0) {
    reasoning.push(`DENIED: ${errors.length} error(s) found`);
    return {
      allowed: false,
      verdict: 'denied',
      violations,
      reasoning,
    };
  }

  if (warnings.length > 0) {
    reasoning.push(`CONDITIONAL: ${warnings.length} warning(s) — proceed with caution`);
    return {
      allowed: true,
      verdict: 'conditional',
      violations,
      reasoning,
      conditions: warnings.map(w => w.message),
    };
  }

  reasoning.push('APPROVED: No violations found');
  return {
    allowed: true,
    verdict: 'approved',
    violations: [],
    reasoning,
  };
}

// ============================================================================
// Static Policy Generation (for Layer 1 hooks)
// ============================================================================

/**
 * Generate a static policy JSON from a BAR's governance data.
 * This is written to .redqueen/policy.json in the code repo during scaffold.
 */
export function generateStaticPolicy(
  bar: BarSummary,
  calmModel?: EvaluationContext['calmModel'],
  tierOverride?: GovernanceTier,
): StaticPolicy {
  const tier = tierOverride || computeTier(bar);

  // Extract security-critical paths from threat model if available
  // For now, use defaults — can be extended to parse threat YAML
  const securityCriticalPaths = [...DEFAULT_SECURITY_CRITICAL_PATHS];
  const readOnlyPaths = [...DEFAULT_READ_ONLY_PATHS];
  const allowedConnections: StaticPolicy['rules']['allowedConnections'] = [];

  for (const rel of calmModel?.relationships || []) {
    const connects = rel['relationship-type']?.connects;
    const source = connects?.source?.node;
    const target = connects?.destination?.node;
    if (source && target) {
      allowedConnections.push({
        source,
        target,
        relationshipId: rel['unique-id'],
      });
    }
  }

  return {
    barId: bar.id,
    barName: bar.name,
    tier,
    compositeScore: bar.compositeScore,
    rules: {
      // Sourced from the same constant as evaluateTierRule() above, so the
      // Layer 1 hook (.redqueen/policy.json) and Layer 2 MCP validate_action
      // never disagree on tier-based tool restrictions.
      toolRestrictions: TIER_TOOL_RESTRICTIONS,
      securityCriticalPaths,
      readOnlyPaths,
      allowedConnections,
      // Empty by default. Teams add entries as institutional memory grows;
      // the hook walker walks this array on every Edit / Write / Bash call.
      customRules: [],
    },
    // Per-decision audit logging is on by default. Disable per-repo by
    // setting enabled:false; redirect by changing path. The hook writes
    // one JSONL line per decision (allow / deny / conditional) into the
    // same file that `score_snapshot` already writes to, so
    // `readAuditLog()` returns both kinds without code changes.
    auditLog: {
      enabled: true,
      path: '.redqueen/audit-log.jsonl',
    },
  };
}

// ============================================================================
// Constraints Summary (for get_constraints tool)
// ============================================================================

/**
 * Build a constraints summary for a BAR.
 * Agents call this once at session start to understand their boundaries.
 */
export function buildConstraintsSummary(bar: BarSummary): ConstraintsSummary {
  const tier = computeTier(bar);
  const constraints: string[] = [];

  if (tier === 'restricted') {
    constraints.push('Plan first, implement only after approval');
    constraints.push('Bash and Write tools are denied');
    constraints.push('Security-critical files cannot be modified');
    constraints.push('All changes require human review');
  } else if (tier === 'supervised') {
    constraints.push('Changes require human review before merge');
    constraints.push('Bash commands should be reviewed');
    constraints.push('Security-critical file changes require extra scrutiny');
  } else {
    constraints.push('Implement freely within src/');
    constraints.push('Pre-tool hooks validate automatically');
  }

  // Add pillar-specific constraints
  const pillars = ['architecture', 'security', 'infoRisk', 'operations'] as const;
  for (const pillar of pillars) {
    if (bar[pillar].score < 50) {
      constraints.push(`${pillar} pillar is failing (${bar[pillar].score}/100) — focus on improvement`);
    }
  }

  return {
    tier,
    compositeScore: bar.compositeScore,
    permissions: {
      canEdit: tier !== 'restricted' || true, // Edit allowed in all tiers (with approval in restricted)
      canWrite: tier !== 'restricted',
      canBash: tier !== 'restricted',
      canCreateService: tier === 'autonomous',
      canModifyAuth: tier !== 'restricted',
      canModifyDatabase: tier === 'autonomous',
    },
    constraints,
    securityCriticalPaths: DEFAULT_SECURITY_CRITICAL_PATHS,
  };
}
