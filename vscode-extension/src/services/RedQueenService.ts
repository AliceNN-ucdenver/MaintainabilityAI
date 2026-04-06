/**
 * RedQueenService — Policy Engine + Agent Configuration
 *
 * Loads orchestration policy from mesh.yaml, evaluates per-BAR
 * governance decisions, applies platform overrides, and generates
 * agent configuration files (governance-context.md, settings.json, AGENTS.md).
 *
 * Stateless class — no vscode imports. Usable from both the extension
 * host and the standalone MCP server.
 */

import type { MeshReader } from '../core/mesh-reader';
import type { BarSummary } from '../types/governance';
import type {
  OrchestrationPolicy, PlatformGovernancePolicy, OrchestrationDecision,
  PermissionTier, TierConfig, PermissionConfig, ReviewConfig,
  PromptInjectionConfig, CriticalityConfig, AgentPreferences,
  EscalationConfig, ThreatAccessTier, GovernanceTimestamps, DecayConfig,
} from '../types/redqueen';
import { computeDecayedScore } from '../mcp/utils/score-decay';

// ============================================================================
// Default Policy — used when mesh.yaml has no orchestration: section
// ============================================================================

const DEFAULT_POLICY: OrchestrationPolicy = {
  version: 1,
  permission_tiers: {
    autonomous: {
      min_score: 80,
      permissions: { mode: 'auto-edit', allow: ['Edit', 'Write', 'Bash', 'Read', 'Glob', 'Grep'], deny: [] },
      review: { agents: 1, human_approval: false },
      threat_access: 'open',
    },
    supervised: {
      min_score: 50,
      permissions: { mode: 'ask-edit', allow: ['Edit', 'Read', 'Glob', 'Grep'], deny: [] },
      review: { agents: 1, human_approval: true },
      threat_access: 'summary',
    },
    restricted: {
      min_score: 0,
      permissions: {
        mode: 'plan',
        allow: ['Read', 'Glob', 'Grep'],
        deny: ['Bash', 'Write'],
        after_plan_approval: { mode: 'ask-edit', allow: ['Edit'], deny: ['Bash', 'Write'] },
      },
      review: { agents: 2, human_approval: true, escalation: true },
      threat_access: 'restricted',
    },
  },
  prompt_injection: {
    security: {
      threshold: 60,
      packs: ['owasp-top-10', 'secure-coding'],
      constraints: ['All changes must pass security review'],
    },
    architecture: {
      threshold: 70,
      packs: ['calm-compliance'],
      constraints: ['Changes must align with CALM model'],
    },
  },
  criticality_multipliers: {
    critical: { score_threshold_boost: 15, require_multi_agent: true, require_human_approval: true },
    high: { score_threshold_boost: 10, require_human_approval: true },
    medium: { score_threshold_boost: 0 },
    low: { score_threshold_boost: -10 },
  },
  agent_preferences: {
    implementation: { primary: 'claude-code' },
    review: { primary: 'claude-code' },
  },
  escalation: {
    score_drop_threshold: 10,
    consecutive_failures: 3,
    escalation_target: 'architecture-review-board',
  },
};

// ============================================================================
// Regex helpers for YAML parsing
// ============================================================================

/** Extract a top-level YAML block (from key: to next un-indented line). */
function extractBlock(content: string, key: string): string | null {
  const regex = new RegExp(`^${key}:\\s*$`, 'm');
  const match = regex.exec(content);
  if (!match) { return null; }

  const start = match.index + match[0].length;
  const rest = content.slice(start);

  // Find end: next line that starts at column 0 and is not blank/comment
  const endMatch = rest.match(/\n[a-zA-Z]/);
  const block = endMatch ? rest.slice(0, endMatch.index) : rest;
  return block;
}

/** Extract a sub-block within an indented context. */
function extractSubBlock(block: string, key: string, indent: number): string | null {
  const prefix = ' '.repeat(indent);
  const regex = new RegExp(`^${prefix}${key}:\\s*$`, 'm');
  const match = regex.exec(block);
  if (!match) { return null; }

  const start = match.index + match[0].length;
  const rest = block.slice(start);

  // Find end: next line at same or lesser indentation
  const endRegex = new RegExp(`\n {0,${indent}}[a-zA-Z]`);
  const endMatch = endRegex.exec(rest);
  const subBlock = endMatch ? rest.slice(0, endMatch.index) : rest;
  return subBlock;
}

/** Parse a simple scalar value from indented YAML. */
function parseScalar(block: string, key: string): string | null {
  const regex = new RegExp(`${key}:\\s*(.+)$`, 'm');
  const match = regex.exec(block);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

/** Parse a numeric value from indented YAML. */
function parseNumber(block: string, key: string): number | null {
  const val = parseScalar(block, key);
  if (val === null) { return null; }
  const num = Number(val);
  return isNaN(num) ? null : num;
}

/** Parse a boolean value from indented YAML. */
function parseBoolean(block: string, key: string): boolean | null {
  const val = parseScalar(block, key);
  if (val === null) { return null; }
  return val === 'true' || val === 'yes';
}

/** Parse a YAML inline array [a, b, c] or flow list. */
function parseArray(block: string, key: string): string[] | null {
  const regex = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`, 'm');
  const match = regex.exec(block);
  if (match) {
    return match[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }

  // Try block-style list (- item lines)
  const blockRegex = new RegExp(`${key}:\\s*\n((?:\\s+-\\s+.+\n?)*)`, 'm');
  const blockMatch = blockRegex.exec(block);
  if (blockMatch) {
    return blockMatch[1]
      .split('\n')
      .map(line => line.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  return null;
}

// ============================================================================
// RedQueenService
// ============================================================================

export class RedQueenService {

  // ── Policy Loading ──────────────────────────────────────────────────────

  /** Load orchestration policy from mesh.yaml. Falls back to DEFAULT_POLICY. */
  loadPolicy(reader: MeshReader): OrchestrationPolicy {
    const content = reader.readMeshFile('mesh.yaml');
    if (!content) { return { ...DEFAULT_POLICY }; }

    const orchBlock = extractBlock(content, 'orchestration');
    if (!orchBlock) { return { ...DEFAULT_POLICY }; }

    try {
      return this.parseOrchestrationBlock(orchBlock);
    } catch {
      return { ...DEFAULT_POLICY };
    }
  }

  /** Load platform governance policy from platform.yaml. */
  loadPlatformPolicy(reader: MeshReader, platformId: string): PlatformGovernancePolicy | null {
    const platformPath = reader.getPlatformPath(platformId);
    if (!platformPath) { return null; }

    const content = reader.readMeshFile(`platforms/${platformPath.split('/').pop()}/platform.yaml`);
    if (!content) { return null; }

    const govBlock = extractBlock(content, '  governance') || extractBlock(content, 'governance');
    if (!govBlock) { return null; }

    return this.parsePlatformGovernance(govBlock);
  }

  // ── Policy Evaluation ─────────────────────────────────────────────────

  /** Evaluate orchestration decision for a BAR against a policy. */
  evaluatePolicy(
    bar: BarSummary,
    policy: OrchestrationPolicy,
    timestamps?: GovernanceTimestamps,
    decayConfig?: DecayConfig,
  ): OrchestrationDecision {
    const reasoning: string[] = [];

    // 1. Get criticality config
    const critConfig = policy.criticality_multipliers[bar.criticality] || { score_threshold_boost: 0 };
    const boost = critConfig.score_threshold_boost;
    reasoning.push(`Criticality: ${bar.criticality} (threshold boost: ${boost > 0 ? '+' : ''}${boost})`);

    // 1.5. Apply score decay if timestamps provided
    let effectiveComposite = bar.compositeScore;
    let effectivePillars = {
      architecture: bar.architecture.score,
      security: bar.security.score,
      'information-risk': bar.infoRisk.score,
      operations: bar.operations.score,
    };

    if (timestamps) {
      const now = new Date();
      const compositeDecay = computeDecayedScore(bar.compositeScore, timestamps, now, decayConfig);
      effectiveComposite = compositeDecay.decayedScore;

      if (compositeDecay.decayApplied) {
        reasoning.push(
          `Score decay applied: composite ${bar.compositeScore}% → ${effectiveComposite}% (${Math.round(compositeDecay.daysSinceAssessment)}d since assessment)`
        );
      }

      // Decay individual pillars
      const pillarNames = ['architecture', 'security', 'information-risk', 'operations'] as const;
      const pillarScores = [bar.architecture.score, bar.security.score, bar.infoRisk.score, bar.operations.score];
      for (let i = 0; i < pillarNames.length; i++) {
        const pillarDecay = computeDecayedScore(pillarScores[i], timestamps, now, decayConfig);
        effectivePillars[pillarNames[i]] = pillarDecay.decayedScore;
        if (pillarDecay.decayApplied && pillarDecay.decayedScore !== pillarScores[i]) {
          reasoning.push(
            `${pillarNames[i]} decayed ${pillarScores[i]}% → ${pillarDecay.decayedScore}%`
          );
        }
      }
    }

    // 2. Determine base tier from adjusted thresholds
    const autoThreshold = policy.permission_tiers.autonomous.min_score + boost;
    const supThreshold = policy.permission_tiers.supervised.min_score + boost;

    let tier: PermissionTier;
    if (effectiveComposite >= autoThreshold) {
      tier = 'autonomous';
    } else if (effectiveComposite >= supThreshold) {
      tier = 'supervised';
    } else {
      tier = 'restricted';
    }
    reasoning.push(`Composite score: ${effectiveComposite}% → tier: ${tier} (auto≥${autoThreshold}, sup≥${supThreshold})`);

    // 3. Per-pillar override: any pillar < 50 forces restricted
    const pillars = [
      { name: 'architecture', score: effectivePillars.architecture },
      { name: 'security', score: effectivePillars.security },
      { name: 'information-risk', score: effectivePillars['information-risk'] },
      { name: 'operations', score: effectivePillars.operations },
    ];
    const failingPillars = pillars.filter(p => p.score < 50);
    if (failingPillars.length > 0 && tier !== 'restricted') {
      const originalTier = tier;
      tier = 'restricted';
      reasoning.push(
        `Pillar override: ${failingPillars.map(p => `${p.name}=${p.score}%`).join(', ')} < 50% → forced restricted (was ${originalTier})`
      );
    }

    const originalTier = tier;

    // 4. Apply criticality overrides
    const review: ReviewConfig = { ...policy.permission_tiers[tier].review };
    if (critConfig.require_multi_agent) {
      review.agents = Math.max(review.agents, 2);
      reasoning.push('Multi-agent review required by criticality');
    }
    if (critConfig.require_human_approval) {
      review.human_approval = true;
      reasoning.push('Human approval required by criticality');
    }

    // 5. Determine prompt injections
    const promptInjections: OrchestrationDecision['promptInjections'] = [];
    for (const [pillar, config] of Object.entries(policy.prompt_injection)) {
      const pillarEntry = pillars.find(p => p.name === pillar || p.name.replace('-', '') === pillar.replace('-', ''));
      const pillarScore = pillarEntry?.score ?? 100;
      if (pillarScore < config.threshold) {
        promptInjections.push({
          pillar,
          score: pillarScore,
          threshold: config.threshold,
          packs: [...config.packs],
          constraints: [...config.constraints],
        });
        reasoning.push(`${pillar}: ${pillarScore}% < ${config.threshold}% → injecting ${config.packs.length} prompt pack(s)`);
      }
    }

    // 6. Determine threat access
    const threatAccess: ThreatAccessTier = policy.permission_tiers[tier].threat_access || 'summary';

    // 7. Build decision
    return {
      barId: bar.id,
      barName: bar.name,
      tier: originalTier,
      effectiveTier: tier,
      permissions: { ...policy.permission_tiers[tier].permissions },
      review,
      promptInjections,
      threatAccess,
      reasoning,
      platformOverrides: [],
      criticalityAdjustment: {
        applied: boost !== 0,
        originalTier,
        boost,
        reason: boost !== 0 ? `${bar.criticality} criticality: threshold boost ${boost > 0 ? '+' : ''}${boost}` : undefined,
      },
      linkedBars: [],
    };
  }

  /** Apply platform-level overrides to an orchestration decision. */
  applyPlatformOverrides(
    decision: OrchestrationDecision,
    platformPolicy: PlatformGovernancePolicy,
    bar: BarSummary,
    reader: MeshReader,
  ): OrchestrationDecision {
    const result = { ...decision, platformOverrides: [...decision.platformOverrides] };
    const tierRank: Record<PermissionTier, number> = { restricted: 0, supervised: 1, autonomous: 2 };

    // 1. Platform minTier — can only elevate (restrict further), never relax
    if (platformPolicy.orchestrationOverrides?.minTier) {
      const minTier = platformPolicy.orchestrationOverrides.minTier;
      if (tierRank[result.effectiveTier] > tierRank[minTier]) {
        result.platformOverrides.push(`Tier capped to "${minTier}" by platform policy (was "${result.effectiveTier}")`);
        result.reasoning.push(`Platform override: tier capped to ${minTier}`);
        result.effectiveTier = minTier;
      }
    }

    // 2. Platform minimum scores — add constraints for pillars below threshold
    if (platformPolicy.minimumScores) {
      const pillarMap: Record<string, number> = {
        architecture: bar.architecture.score,
        security: bar.security.score,
        information_risk: bar.infoRisk.score,
        informationRisk: bar.infoRisk.score,
        'information-risk': bar.infoRisk.score,
        operations: bar.operations.score,
      };

      for (const [pillar, minScore] of Object.entries(platformPolicy.minimumScores)) {
        const current = pillarMap[pillar] ?? pillarMap[pillar.replace(/_/g, '-')] ?? 100;
        if (current < minScore) {
          result.platformOverrides.push(
            `Platform requires ${pillar} ≥ ${minScore}% (current: ${current}%)`
          );
          result.reasoning.push(`Platform minimum: ${pillar} ${current}% < required ${minScore}%`);
        }
      }
    }

    // 3. Shared infrastructure constraints from platform.yaml
    if (platformPolicy.sharedInfrastructure) {
      for (const infra of platformPolicy.sharedInfrastructure) {
        if (infra.bars.includes(bar.id)) {
          result.platformOverrides.push(`Shared ${infra.type} "${infra.name}": ${infra.constraint}`);
          result.reasoning.push(`Shared ${infra.type} "${infra.name}" — ${infra.bars.length} BARs affected`);
        }
      }
    }

    // 4. Enrich with cross-BAR topology from platform.arch.json
    try {
      const linked = reader.findLinkedBars(bar.name);
      if (linked.length > 0) {
        result.linkedBars = linked.map(l => ({
          barName: l.barName,
          relationship: l.relationship,
        }));
        result.reasoning.push(`Cross-BAR links: ${linked.length} connected node(s) via platform architecture`);
      }
    } catch {
      // platform.arch.json may not exist — skip
    }

    return result;
  }

  /** Full pipeline: load policy → evaluate → apply platform overrides. */
  getOrchestrationDecision(
    reader: MeshReader,
    barName: string,
  ): OrchestrationDecision | { error: string } {
    const bar = reader.getBar(barName);
    if (!bar) {
      return { error: `BAR not found: ${barName}` };
    }

    const policy = this.loadPolicy(reader);
    let decision = this.evaluatePolicy(bar, policy);

    // Apply platform overrides if platform has governance config
    const platformPolicy = this.loadPlatformPolicy(reader, bar.platformId);
    if (platformPolicy) {
      decision = this.applyPlatformOverrides(decision, platformPolicy, bar, reader);
    } else {
      // Still enrich with cross-BAR links even without platform governance
      try {
        const linked = reader.findLinkedBars(bar.name);
        if (linked.length > 0) {
          decision = {
            ...decision,
            linkedBars: linked.map(l => ({ barName: l.barName, relationship: l.relationship })),
          };
          decision.reasoning.push(`Cross-BAR links: ${linked.length} connected node(s)`);
        }
      } catch { /* skip */ }
    }

    return decision;
  }

  // ── Generators ────────────────────────────────────────────────────────

  /** Generate governance-context.md — dynamic governance context for agents. */
  generateGovernanceContext(
    decision: OrchestrationDecision,
    bar: BarSummary,
    policy: OrchestrationPolicy,
    reader?: MeshReader,
  ): string {
    const lines: string[] = [
      '# Governance Context — Generated by The Red Queen',
      '',
      '> **Auto-generated.** Do not edit manually. Re-generate with `scaffold_agent_config`.',
      '',
      '---',
      '',
      `## Application: ${bar.name}`,
      '',
      '| Property | Value |',
      '|----------|-------|',
      `| **BAR ID** | ${bar.id} |`,
      `| **Platform** | ${bar.platformId} |`,
      `| **Criticality** | ${bar.criticality} |`,
      `| **Composite Score** | ${bar.compositeScore}% |`,
      `| **Permission Tier** | ${decision.effectiveTier} |`,
      `| **Lifecycle** | ${bar.lifecycle} |`,
      '',
      `## Permission Tier: ${decision.effectiveTier}`,
      '',
      `- **Mode:** ${decision.permissions.mode}`,
      `- **Allowed:** ${decision.permissions.allow.join(', ') || 'none'}`,
      `- **Denied:** ${decision.permissions.deny.join(', ') || 'none'}`,
    ];

    if (decision.permissions.after_plan_approval) {
      lines.push(`- **After Plan Approval:** mode=${decision.permissions.after_plan_approval.mode}, allow=${decision.permissions.after_plan_approval.allow.join(', ')}`);
    }

    lines.push(
      '',
      '## Review Requirements',
      '',
      `- **Agent Reviews:** ${decision.review.agents}`,
      `- **Human Approval:** ${decision.review.human_approval ? 'Required' : 'Not required'}`,
    );
    if (decision.review.escalation) {
      lines.push('- **Escalation:** Enabled');
    }

    // Active constraints from prompt injections
    if (decision.promptInjections.length > 0) {
      lines.push('', '## Active Constraints (MANDATORY)', '');
      for (const inj of decision.promptInjections) {
        lines.push(`### ${inj.pillar} (score ${inj.score}% < threshold ${inj.threshold}%)`);
        lines.push(`- **Prompt Packs:** ${inj.packs.join(', ')}`);
        for (const c of inj.constraints) {
          lines.push(`- ${c}`);
        }
        lines.push('');
      }
    }

    // Cross-BAR dependencies
    if (decision.linkedBars.length > 0) {
      lines.push('## Cross-BAR Dependencies', '');
      lines.push('This BAR is linked to the following BARs via platform architecture.');
      lines.push('**Changes to shared interfaces MUST be coordinated.**', '');
      for (const link of decision.linkedBars) {
        lines.push(`- **${link.barName}** (${link.relationship})`);
      }
      lines.push('');
    }

    // Shared infrastructure from platform.arch.json
    if (reader) {
      try {
        const arch = reader.readPlatformArchitecture(bar.platformId);
        if (arch) {
          const sharedInfra = (arch.nodes as Array<Record<string, unknown>>)
            .filter(n => n['node-type'] === 'shared-infrastructure');
          if (sharedInfra.length > 0) {
            lines.push('## Shared Infrastructure', '');
            for (const infra of sharedInfra) {
              lines.push(`- **${infra['name']}**: ${infra['description'] || 'Shared infrastructure'}`);
            }
            lines.push('');
          }
        }
      } catch { /* skip */ }
    }

    // Threat model access
    lines.push(
      `## Threat Model Access: ${decision.threatAccess}`,
      '',
    );
    if (decision.threatAccess === 'restricted') {
      lines.push('Threat model details are restricted at this tier. Only risk ratings are available.', '');
    } else if (decision.threatAccess === 'summary') {
      lines.push('Threat summary is available. Full attack vectors require autonomous tier.', '');
    } else {
      lines.push('Full threat model is available.', '');
    }

    // Platform overrides
    if (decision.platformOverrides.length > 0) {
      lines.push('## Platform Overrides', '');
      for (const override of decision.platformOverrides) {
        lines.push(`- ${override}`);
      }
      lines.push('');
    }

    // Escalation
    lines.push(
      '## Escalation Rules',
      '',
      `- Score drop > ${policy.escalation.score_drop_threshold} points triggers escalation`,
      `- ${policy.escalation.consecutive_failures} consecutive failures triggers escalation`,
      `- Escalation target: ${policy.escalation.escalation_target}`,
      '',
    );

    // Decision audit trail
    lines.push(
      '## Orchestration Decision Log',
      '',
      '<details>',
      '<summary>Why these constraints?</summary>',
      '',
    );
    for (const reason of decision.reasoning) {
      lines.push(`- ${reason}`);
    }
    lines.push('', '</details>', '');

    return lines.join('\n');
  }

  /** Generate .claude/settings.json with policy-driven permissions. */
  generateSettings(decision: OrchestrationDecision): string {
    // Build hook matcher: all non-read-only tools
    const readOnly = new Set(['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch']);
    const allTools = new Set([...decision.permissions.allow, ...decision.permissions.deny]);
    const hookTargets = [...allTools].filter(t => !readOnly.has(t));
    const matcher = hookTargets.length > 0 ? hookTargets.join('|') : 'Edit|Write|Bash';

    const settings: Record<string, unknown> = {
      permissions: {
        allow: decision.permissions.allow,
        deny: decision.permissions.deny,
      },
      hooks: {
        PreToolUse: [
          {
            matcher,
            hooks: [
              {
                type: 'command',
                command: './.redqueen/hooks/validate-tool.sh',
              },
            ],
          },
        ],
      },
    };

    return JSON.stringify(settings, null, 2) + '\n';
  }

  /** Generate enhanced AGENTS.md with constraints and prompt packs. */
  generateAgentsMd(
    decision: OrchestrationDecision,
    bar: BarSummary,
    policy: OrchestrationPolicy,
  ): string {
    const lines = [
      '# Agent Governance Instructions',
      '',
      'This repository is governed by **The Red Queen** governance system.',
      '',
      `## BAR: ${bar.name} (${bar.id})`,
      '',
      `- **Governance Tier:** ${decision.effectiveTier}`,
      `- **Composite Score:** ${bar.compositeScore}/100`,
      `- **Criticality:** ${bar.criticality}`,
      `- **Permission Mode:** ${decision.permissions.mode}`,
      `- **Threat Model Access:** ${decision.threatAccess}`,
      '',
    ];

    // Tier-specific instructions
    if (decision.effectiveTier === 'autonomous') {
      lines.push(
        '## Permissions (Autonomous Tier)',
        '',
        'You may implement freely within `src/`. All changes will be validated',
        'by the Red Queen pre-tool hooks automatically.',
        '',
      );
    } else if (decision.effectiveTier === 'supervised') {
      lines.push(
        '## Permissions (Supervised Tier)',
        '',
        'Changes require human review before merge. Focus on:',
        `- Improving governance scores (current: ${bar.compositeScore}/100)`,
        '- Addressing governance gaps identified by `governance_gaps`',
        '- Following architectural constraints from the CALM model',
        '',
      );
    } else {
      lines.push(
        '## Permissions (Restricted Tier)',
        '',
        '**Plan first, implement only after approval.** This BAR has governance',
        'gaps that must be addressed. Before implementing:',
        '1. Call `governance_gaps` and review all findings',
        '2. Create a remediation plan',
        '3. Get human approval before proceeding',
        '',
      );
    }

    // Allowed/denied tools
    if (decision.permissions.allow.length > 0) {
      lines.push(`**Allowed tools:** ${decision.permissions.allow.join(', ')}`);
    }
    if (decision.permissions.deny.length > 0) {
      lines.push(`**Denied tools:** ${decision.permissions.deny.join(', ')}`);
    }
    lines.push('');

    // Active constraints from prompt injections
    if (decision.promptInjections.length > 0) {
      lines.push('## Active Constraints', '');
      for (const inj of decision.promptInjections) {
        lines.push(`### ${inj.pillar} Constraints`);
        lines.push(`The ${inj.pillar} pillar score (${inj.score}/100) is below the governance threshold (${inj.threshold}).`);
        lines.push(`- Apply prompt packs: ${inj.packs.join(', ')}`);
        for (const c of inj.constraints) {
          lines.push(`- ${c}`);
        }
        lines.push('');
      }
    }

    // Cross-BAR dependencies
    if (decision.linkedBars.length > 0) {
      lines.push('## Cross-BAR Dependencies', '');
      for (const link of decision.linkedBars) {
        lines.push(`- **${link.barName}** (${link.relationship})`);
      }
      lines.push('');
    }

    // Standard sections
    lines.push(
      '## Before Making Changes',
      '',
      '1. Call `get_orchestration_decision` to understand your full governance context.',
      '2. Call `get_constraints` to understand your permission tier and boundaries.',
      '3. Call `get_bar_context` to understand the application\'s architecture,',
      '   governance scores, and active constraints.',
      '4. Call `governance_gaps` to check for existing governance issues.',
      '5. For any structural change (new service, database connection,',
      '   external call), call `validate_action` to verify governance compliance.',
      '',
      '## Required Validations',
      '',
      '- All proposed structural changes: `validate_action`',
      '- Architecture file validation: `validate_calm`',
      '- Before creating a PR: `governance_gaps()` to check for issues',
      '- Review ADRs with `get_adrs` before making architectural decisions',
      '',
      '## Governance Tiers',
      '',
      '| Tier | Min Score | Mode | Agents | Human Approval |',
      '|------|----------|------|--------|----------------|',
    );

    for (const tierName of ['autonomous', 'supervised', 'restricted'] as PermissionTier[]) {
      const tc = policy.permission_tiers[tierName];
      lines.push(
        `| ${tierName} | ${tc.min_score}% | ${tc.permissions.mode} | ${tc.review.agents} | ${tc.review.human_approval ? 'Yes' : 'No'} |`
      );
    }
    lines.push('');

    return lines.join('\n');
  }

  // ── Review Board Assembly ────────────────────────────────────────────

  /** Assemble review board steps based on tier and agent type. */
  assembleReviewBoard(
    decision: OrchestrationDecision,
    agentType: 'claude' | 'copilot' | 'both',
  ): { steps: Array<{ agent: 'claude' | 'copilot'; scope: 'security' | 'architecture' }>; consensusRule: 'any-flag-escalates' | 'unanimous' | 'majority' } {
    // Autonomous tier skips review
    if (decision.effectiveTier === 'autonomous') {
      return { steps: [], consensusRule: 'any-flag-escalates' };
    }

    const scopes: Array<'security' | 'architecture'> =
      decision.effectiveTier === 'restricted'
        ? ['security', 'architecture']
        : ['security'];  // supervised: security only (unless agents >= 2)

    // If supervised but review requires >= 2 agents, add architecture scope
    if (decision.effectiveTier === 'supervised' && decision.review.agents >= 2) {
      scopes.push('architecture');
    }

    const steps: Array<{ agent: 'claude' | 'copilot'; scope: 'security' | 'architecture' }> = [];
    const agents: Array<'claude' | 'copilot'> =
      agentType === 'both' ? ['claude', 'copilot'] : [agentType];

    for (const scope of scopes) {
      for (const agent of agents) {
        steps.push({ agent, scope });
      }
    }

    // Consensus rule: restricted uses unanimous, supervised uses any-flag-escalates
    const consensusRule = decision.effectiveTier === 'restricted' ? 'unanimous' : 'any-flag-escalates';

    return { steps, consensusRule };
  }

  // ── Private parsing helpers ───────────────────────────────────────────

  private parseOrchestrationBlock(block: string): OrchestrationPolicy {
    const version = parseNumber(block, 'version') ?? 1;

    // Parse permission tiers
    const tiersBlock = extractSubBlock(block, 'permission_tiers', 2);
    const permission_tiers = tiersBlock
      ? this.parsePermissionTiers(tiersBlock)
      : DEFAULT_POLICY.permission_tiers;

    // Parse prompt injection
    const injBlock = extractSubBlock(block, 'prompt_injection', 2);
    const prompt_injection = injBlock
      ? this.parsePromptInjection(injBlock)
      : DEFAULT_POLICY.prompt_injection;

    // Parse criticality multipliers
    const critBlock = extractSubBlock(block, 'criticality_multipliers', 2);
    const criticality_multipliers = critBlock
      ? this.parseCriticalityMultipliers(critBlock)
      : DEFAULT_POLICY.criticality_multipliers;

    // Parse agent preferences
    const agentBlock = extractSubBlock(block, 'agent_preferences', 2);
    const agent_preferences = agentBlock
      ? this.parseAgentPreferences(agentBlock)
      : DEFAULT_POLICY.agent_preferences;

    // Parse escalation
    const escBlock = extractSubBlock(block, 'escalation', 2);
    const escalation = escBlock
      ? this.parseEscalation(escBlock)
      : DEFAULT_POLICY.escalation;

    return { version, permission_tiers, prompt_injection, criticality_multipliers, agent_preferences, escalation };
  }

  private parsePermissionTiers(block: string): Record<PermissionTier, TierConfig> {
    const result = { ...DEFAULT_POLICY.permission_tiers };

    for (const tierName of ['autonomous', 'supervised', 'restricted'] as PermissionTier[]) {
      const tierBlock = extractSubBlock(block, tierName, 4);
      if (!tierBlock) { continue; }

      const min_score = parseNumber(tierBlock, 'min_score') ?? result[tierName].min_score;
      const threat_access = (parseScalar(tierBlock, 'threat_access') as ThreatAccessTier) || result[tierName].threat_access;

      // Parse permissions
      const permBlock = extractSubBlock(tierBlock, 'permissions', 6);
      const permissions: PermissionConfig = permBlock ? {
        mode: (parseScalar(permBlock, 'mode') as PermissionConfig['mode']) || result[tierName].permissions.mode,
        allow: parseArray(permBlock, 'allow') || result[tierName].permissions.allow,
        deny: parseArray(permBlock, 'deny') || result[tierName].permissions.deny,
      } : result[tierName].permissions;

      // Parse after_plan_approval if present
      if (permBlock) {
        const afterBlock = extractSubBlock(permBlock, 'after_plan_approval', 8);
        if (afterBlock) {
          permissions.after_plan_approval = {
            mode: (parseScalar(afterBlock, 'mode') as PermissionConfig['mode']) || 'ask-edit',
            allow: parseArray(afterBlock, 'allow') || ['Edit'],
            deny: parseArray(afterBlock, 'deny') || [],
          };
        }
      }

      // Parse review
      const reviewBlock = extractSubBlock(tierBlock, 'review', 6);
      const review: ReviewConfig = reviewBlock ? {
        agents: parseNumber(reviewBlock, 'agents') ?? result[tierName].review.agents,
        human_approval: parseBoolean(reviewBlock, 'human_approval') ?? result[tierName].review.human_approval,
        escalation: parseBoolean(reviewBlock, 'escalation') ?? result[tierName].review.escalation,
      } : result[tierName].review;

      result[tierName] = { min_score, permissions, review, threat_access };
    }

    return result;
  }

  private parsePromptInjection(block: string): Record<string, PromptInjectionConfig> {
    const result: Record<string, PromptInjectionConfig> = {};

    // Find all pillar names (indented at 4 spaces)
    const pillarRegex = /^ {4}(\w[\w-]*):\s*$/gm;
    let match;
    while ((match = pillarRegex.exec(block)) !== null) {
      const pillarName = match[1];
      const pillarBlock = extractSubBlock(block, pillarName, 4);
      if (!pillarBlock) { continue; }

      result[pillarName] = {
        threshold: parseNumber(pillarBlock, 'threshold') ?? 60,
        packs: parseArray(pillarBlock, 'packs') || [],
        constraints: parseArray(pillarBlock, 'constraints') || [],
      };
    }

    return Object.keys(result).length > 0 ? result : DEFAULT_POLICY.prompt_injection;
  }

  private parseCriticalityMultipliers(block: string): Record<string, CriticalityConfig> {
    const result: Record<string, CriticalityConfig> = {};

    for (const level of ['critical', 'high', 'medium', 'low']) {
      const levelBlock = extractSubBlock(block, level, 4);
      if (!levelBlock) { continue; }

      result[level] = {
        score_threshold_boost: parseNumber(levelBlock, 'score_threshold_boost') ?? 0,
        require_multi_agent: parseBoolean(levelBlock, 'require_multi_agent') ?? undefined,
        require_human_approval: parseBoolean(levelBlock, 'require_human_approval') ?? undefined,
      };
    }

    return Object.keys(result).length > 0 ? result : DEFAULT_POLICY.criticality_multipliers;
  }

  private parseAgentPreferences(block: string): AgentPreferences {
    const implBlock = extractSubBlock(block, 'implementation', 4);
    const reviewBlock = extractSubBlock(block, 'review', 4);

    return {
      implementation: implBlock ? { primary: parseScalar(implBlock, 'primary') || 'claude-code' } : undefined,
      review: reviewBlock ? { primary: parseScalar(reviewBlock, 'primary') || 'claude-code' } : undefined,
    };
  }

  private parseEscalation(block: string): EscalationConfig {
    return {
      score_drop_threshold: parseNumber(block, 'score_drop_threshold') ?? 10,
      consecutive_failures: parseNumber(block, 'consecutive_failures') ?? 3,
      escalation_target: parseScalar(block, 'escalation_target') || 'architecture-review-board',
    };
  }

  private parsePlatformGovernance(block: string): PlatformGovernancePolicy {
    const result: PlatformGovernancePolicy = {
      minimumScores: {},
      sharedInfrastructure: [],
    };

    // Parse minimumScores — 2-space indent within governance block
    const minBlock = extractSubBlock(block, 'minimumScores', 2);
    if (minBlock) {
      for (const pillar of ['architecture', 'security', 'information_risk', 'informationRisk', 'operations']) {
        const score = parseNumber(minBlock, pillar);
        if (score !== null) {
          result.minimumScores[pillar] = score;
        }
      }
    }

    // Parse orchestrationOverrides — 2-space indent within governance block
    const overrideBlock = extractSubBlock(block, 'orchestrationOverrides', 2);
    if (overrideBlock) {
      result.orchestrationOverrides = {
        enforcementMode: (parseScalar(overrideBlock, 'enforcementMode') as 'strict' | 'advisory') || undefined,
        minTier: (parseScalar(overrideBlock, 'minTier') as PermissionTier) || undefined,
      };
    }

    return result;
  }
}
