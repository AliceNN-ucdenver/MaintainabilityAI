/**
 * Agent configuration scaffolding for The Red Queen's deterministic governance.
 *
 * Generates the baked policy + enforcement files for governed code repos:
 * .redqueen/policy.json + decision.json (the tier + rules compiled FROM the
 * mesh at scaffold time), .claude/settings.json + .github/hooks/redqueen.json
 * (the PreToolUse hooks), .redqueen/hooks/validate-tool.{sh,js} (the enforcer),
 * impl-provenance.yml (the merge-time chain proof), and AGENTS.md. The mesh is
 * the source of truth at SCAFFOLD time; at runtime the repo is self-contained —
 * no MCP server, no live mesh, no token.
 *
 * Update the mesh → re-scaffold to re-bake the policy into all repos.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MeshReader } from '../core/mesh-reader';
import { generateStaticPolicy } from './policy-engine';
import type { BarSummary, GovernanceTier } from '../types';
import type { RedQueenService } from '../services/RedQueenService';
import type { OrchestrationDecision } from '../types/redqueen';

// ============================================================================
// Types
// ============================================================================

// GovernanceTier moved to types/governance.ts. Re-exported here for back-compat.
export type { GovernanceTier } from '../types';

export interface ScaffoldResult {
  barName: string;
  barId: string;
  tier: GovernanceTier;
  decision?: OrchestrationDecision;    // full decision when policy-driven
  files: Record<string, string>;       // relative path → content
  manifest: ConfigManifest;
  /**
   * Non-fatal warnings surfaced to the caller (e.g. the greenfield
   * code-design seed could not be grounded from the mesh). The scaffold
   * still completes; the caller decides how to surface these.
   */
  warnings?: string[];
}

export interface ConfigManifest {
  generatedAt: string;
  barId: string;
  barName: string;
  meshPath: string;
  tier: GovernanceTier;
  compositeScore: number;
  files: { path: string; sha256: string }[];
}

export interface ScaffoldDoctorIssue {
  severity: 'error' | 'warning';
  path?: string;
  message: string;
}

export interface ScaffoldDoctorResult {
  ok: boolean;
  repoPath: string;
  checkedAt: string;
  errors: ScaffoldDoctorIssue[];
  warnings: ScaffoldDoctorIssue[];
}

const DEFAULT_MESH_CHECKOUT_PATH = './governance-mesh';

// ============================================================================
// Tier calculation — canonical impl lives in core/tier.ts so it can be reused
// from services/ without forming an mcp/ ↔ services/ import cycle.
// ============================================================================

import { computeTier } from '../core/tier';
export { computeTier };

// ============================================================================
// File generators
// ============================================================================

function generateClaudeSettings(tier: GovernanceTier): string {
  const matchers: Record<GovernanceTier, string> = {
    autonomous: 'Edit|Write|Bash',
    supervised: 'Edit|Write|Bash',
    restricted: 'Edit|Write|Bash|Read',
  };

  return JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: matchers[tier],
          hooks: [
            {
              type: 'command',
              command: 'AGENT_TYPE=claude ./.redqueen/hooks/validate-tool.sh',
            },
          ],
        },
      ],
    },
  }, null, 2) + '\n';
}

function generateAgentsMd(bar: BarSummary, tier: GovernanceTier): string {
  const lines = [
    '# Agent Governance Instructions',
    '',
    'This repository is governed by **The Red Queen** governance system.',
    '',
    `## BAR: ${bar.name} (${bar.id})`,
    '',
    `- **Governance Tier:** ${tier}`,
    `- **Composite Score:** ${bar.compositeScore}/100`,
    `- **Criticality:** ${bar.criticality}`,
    '',
    '## Before Making Changes',
    '',
    '1. Call `get_constraints` to understand your permission tier and boundaries.',
    '2. Call `get_bar_context` to understand the application\'s architecture,',
    '   governance scores, and active constraints.',
    '3. Call `governance_gaps` to check for existing governance issues.',
    '4. For any structural change (new service, database connection,',
    '   external call), call `validate_action` to verify governance compliance.',
    '',
  ];

  if (tier === 'autonomous') {
    lines.push(
      '## Permissions (Autonomous Tier)',
      '',
      'You may implement freely within `src/`. All changes will be validated',
      'by the Red Queen pre-tool hooks automatically.',
      '',
    );
  } else if (tier === 'supervised') {
    lines.push(
      '## Permissions (Supervised Tier)',
      '',
      'Changes require human review before merge. Focus on:',
      '- Improving governance scores (current: ' + bar.compositeScore + '/100)',
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
      '2. Create a remediation plan using the `remediation-plan` prompt',
      '3. Get human approval before proceeding',
      '',
    );
  }

  lines.push(
    '## Required Validations',
    '',
    '- All proposed structural changes: `validate_action`',
    '- Architecture file validation: `validate_calm`',
    '- Before creating a PR: `governance_gaps()` to check for issues',
    '- Review ADRs with `get_adrs` before making architectural decisions',
    '',
    '## Governance Tiers',
    '',
    '| Tier | Score | Permissions |',
    '|------|-------|-------------|',
    '| Autonomous | 80%+ | Implement freely within src/ |',
    '| Supervised | 50-79% | Changes require human review |',
    '| Restricted | <50% | Plan first, implement after approval |',
  );

  return lines.join('\n') + '\n';
}

function generateValidateToolJs(): string {
  return `#!/usr/bin/env node
/**
 * The Red Queen's Court — PreToolUse Hook Validator
 *
 * Called by Claude Code PreToolUse and Copilot preToolUse hooks.
 * Reads .redqueen/policy.json (pre-computed static rules from the mesh)
 * and evaluates tool calls against governance constraints.
 *
 * Claude Code: exit code 2 + stderr blocks a tool call.
 * Copilot: stdout JSON permissionDecision blocks/allows a tool call.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Read JSON from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(inputData);
    const decision = validate(input);
    emitDecision(input, decision);
  } catch (err) {
    emitHookError(err);
  }
});

function emitHookError(err) {
  const message = err && err.message ? err.message : String(err);
  const reason = '[Red Queen] Hook validation error; failing closed: ' + message;
  const agent = (process.env.AGENT_TYPE || '').toLowerCase();

  if (agent === 'copilot') {
    process.stdout.write(JSON.stringify({
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    }));
    process.exit(0);
  }

  process.stderr.write(reason + '\\n');
  process.exit(2);
}

function emitDecision(input, decision) {
  const agent = detectAgent(input);

  // Write per-decision audit line BEFORE emitting so the record is durable
  // even if the agent runtime kills us after stdout. Fail-soft: any error
  // here is swallowed so the hook still enforces.
  try { appendAuditLine(input, decision, agent); } catch (_) { /* fail-soft */ }

  if (agent === 'copilot') {
    process.stdout.write(JSON.stringify({
      permissionDecision: decision.allowed ? 'allow' : 'deny',
      permissionDecisionReason: decision.reason,
    }));
    process.exit(0);
  }

  if (!decision.allowed) {
    process.stderr.write(decision.reason + '\\n');
    process.exit(2);
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  }));
  process.exit(0);
}

function appendAuditLine(input, decision, agent) {
  const policyPath = path.join(process.cwd(), '.redqueen', 'policy.json');
  if (!fs.existsSync(policyPath)) { return; }
  let policy;
  try { policy = JSON.parse(fs.readFileSync(policyPath, 'utf8')); } catch (_) { return; }

  const auditCfg = (policy && policy.auditLog) || { enabled: true, path: '.redqueen/audit-log.jsonl' };
  if (auditCfg.enabled === false) { return; }

  const logPath = path.join(process.cwd(), auditCfg.path || '.redqueen/audit-log.jsonl');
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const toolName = canonicalToolName(input.tool_name || input.toolName || '');
  const toolInput = parseToolInput(input.tool_input || input.toolArgs || {});
  const filePath = toolInput.file_path || toolInput.filePath || toolInput.path || '';
  const sessionId = process.env.CLAUDE_SESSION_ID ||
    process.env.COPILOT_RUN_ID ||
    process.env.GITHUB_RUN_ID ||
    '';

  const entry = {
    timestamp: new Date().toISOString(),
    action: 'pre_tool_use',
    barId: policy.barId || '',
    barName: policy.barName || '',
    payload: {
      tier: policy.tier || '',
      agent: agent,
      tool: toolName,
      filePath: filePath,
      verdict: decision.allowed ? 'allow' : 'deny',
      reason: decision.reason || '',
      ruleId: decision.ruleId || null,
      // Override metadata: when a would-be deny was flipped to an allow
      // because the operator supplied REDQUEEN_TOOL_APPROVED or
      // REDQUEEN_PLAN_APPROVED (or toolInput.redqueenApproved), the
      // audit line records WHICH rule was bypassed and WHICH approval
      // source granted it. A normal allow leaves these null/false.
      override: decision.override === true,
      bypassedRuleId: decision.bypassedRuleId || null,
      approvalSource: decision.approvalSource || null,
      sessionId: sessionId,
    },
  };

  // JSONL append. Single line, single write — line-atomic on POSIX for
  // payloads under PIPE_BUF (4096 bytes). Hook payload is well under that.
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\\n', 'utf8');
}

function detectAgent(input) {
  const envAgent = (process.env.AGENT_TYPE || '').toLowerCase();
  if (envAgent === 'copilot' || envAgent === 'claude') { return envAgent; }

  // Copilot camelCase hook payloads use toolName/toolArgs. Claude and VS Code
  // compatible payloads use tool_name/tool_input.
  if (input.toolName || input.toolArgs) { return 'copilot'; }
  return 'claude';
}

function parseToolInput(value) {
  if (!value) { return {}; }
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return { command: value }; }
  }
  return value;
}

function canonicalToolName(toolName) {
  const normalized = String(toolName || '').toLowerCase();
  const map = {
    bash: 'Bash',
    powershell: 'Bash',
    terminal_command: 'Bash',
    create: 'Write',
    write: 'Write',
    file_create: 'Write',
    edit: 'Edit',
    file_edit: 'Edit',
    view: 'Read',
    read: 'Read',
    glob: 'Glob',
    grep: 'Grep',
    web_fetch: 'WebFetch',
    webfetch: 'WebFetch',
    web_search: 'WebSearch',
    websearch: 'WebSearch',
    task: 'Agent',
    agent: 'Agent',
  };
  return map[normalized] || toolName || '';
}

function validate(input) {
  const rawToolName = input.tool_name || input.toolName || '';
  const toolName = canonicalToolName(rawToolName);
  const toolInput = parseToolInput(input.tool_input || input.toolArgs || {});

  // Load policy.json
  const policyPath = path.join(process.cwd(), '.redqueen', 'policy.json');
  if (!fs.existsSync(policyPath)) {
    return {
      allowed: false,
      reason: '[Red Queen] Missing .redqueen/policy.json; failing closed. Re-run the Red Queen scaffold or doctor.',
    };
  }

  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const tier = policy.tier;
  const rules = policy.rules || {};

  // Skip validation for read-only tools after policy is loaded successfully.
  const readOnlyTools = ['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Agent'];
  if (readOnlyTools.includes(toolName)) {
    return { allowed: true, reason: '[Red Queen] Read-only tool allowed.' };
  }

  // Check tool restrictions for this tier
  const tierRules = rules.toolRestrictions && rules.toolRestrictions[tier];
  if (tierRules) {
    if (tierRules.deny && tierRules.deny.includes(toolName)) {
      return {
        allowed: false,
        ruleId: 'TIER-001',
        reason:
          '[Red Queen] Tool "' + toolName + '" is denied for ' + tier +
          '-tier BARs (score: ' + policy.compositeScore + '/100). ' +
          'Improve governance scores or get approval first.',
      };
    }
  }

  // Track pending overrides so we can attribute the bypass on the audit
  // line even though the final verdict is allow. If a later check denies,
  // that deny is recorded as-is (no override claim) and pendingOverride
  // is discarded.
  let pendingOverride = null;

  function approvalSourceLabel() {
    if (process.env.REDQUEEN_PLAN_APPROVED === 'true') { return 'REDQUEEN_PLAN_APPROVED'; }
    if (process.env.REDQUEEN_TOOL_APPROVED === 'true') { return 'REDQUEEN_TOOL_APPROVED'; }
    if (toolInput.redqueenApproved === true) { return 'toolInput.redqueenApproved'; }
    return null;
  }

  if (tier === 'restricted' && toolName === 'Edit') {
    const planApproved = process.env.REDQUEEN_PLAN_APPROVED === 'true' ||
      toolInput.redqueenApproved === true;
    if (!planApproved) {
      return {
        allowed: false,
        ruleId: 'TIER-002',
        reason:
          '[Red Queen] Restricted-tier BARs are plan-first. Edit is blocked until ' +
          'human approval is recorded (set REDQUEEN_PLAN_APPROVED=true for approved runs).',
      };
    }
    // Approval flipped a deny into an allow. Capture the override so the
    // audit-log line records WHICH rule was bypassed and WHICH source
    // granted it. Note: REDQUEEN_TOOL_APPROVED alone does NOT bypass
    // TIER-002 (restricted plan-first); only PLAN_APPROVED or the
    // per-call toolInput flag does.
    pendingOverride = {
      bypassedRuleId: 'TIER-002',
      approvalSource: process.env.REDQUEEN_PLAN_APPROVED === 'true'
        ? 'REDQUEEN_PLAN_APPROVED'
        : 'toolInput.redqueenApproved',
    };
  }

  const hasApproval = process.env.REDQUEEN_TOOL_APPROVED === 'true' ||
    process.env.REDQUEEN_PLAN_APPROVED === 'true' ||
    toolInput.redqueenApproved === true;
  if (tierRules && tierRules.requireApproval && tierRules.requireApproval.includes(toolName)) {
    if (!hasApproval) {
      return {
        allowed: false,
        ruleId: 'TIER-003',
        reason:
          '[Red Queen] Tool "' + toolName + '" requires approval for ' + tier +
          '-tier BARs. Record approval with REDQUEEN_TOOL_APPROVED=true or toolInput.redqueenApproved=true.',
      };
    }
    // Approval flipped a would-be TIER-003 deny into an allow. Override
    // the in-flight pendingOverride only if TIER-003 is the rule that
    // actually got bypassed here (TIER-002 takes precedence when both
    // apply, since plan-first is the stricter gate).
    if (!pendingOverride) {
      pendingOverride = {
        bypassedRuleId: 'TIER-003',
        approvalSource: approvalSourceLabel(),
      };
    }
  }

  // Check file path restrictions
  const filePath = toolInput.file_path || toolInput.filePath || toolInput.path || toolInput.command || '';
  if (filePath && rules.readOnlyPaths) {
    for (const pattern of rules.readOnlyPaths) {
      if (matchGlob(filePath, pattern)) {
        return {
          allowed: false,
          ruleId: 'CTRL-001',
          reason:
            '[Red Queen] File "' + filePath + '" is governance-managed (read-only). ' +
            'Re-run scaffold_agent_config to update.',
        };
      }
    }
  }

  // Check security-critical paths for restricted tier
  if (tier === 'restricted' && filePath && rules.securityCriticalPaths) {
    for (const pattern of rules.securityCriticalPaths) {
      if (matchGlob(filePath, pattern)) {
        return {
          allowed: false,
          ruleId: 'SEC-001',
          reason:
            '[Red Queen] File "' + filePath + '" is security-critical and cannot be ' +
            'modified by restricted-tier agents.',
        };
      }
    }
  }

  const sourceNode = toolInput.sourceNode || toolInput.source_node;
  const targetNode = toolInput.targetNode || toolInput.target_node;
  if (sourceNode && targetNode && Array.isArray(rules.allowedConnections)) {
    const allowed = rules.allowedConnections.some(function (conn) {
      return conn.source === sourceNode && conn.target === targetNode;
    });
    if (!allowed) {
      return {
        allowed: false,
        ruleId: 'CALM-004',
        reason:
          '[Red Queen] CALM-004: No declared CALM relationship permits ' +
          sourceNode + ' -> ' + targetNode + '. Route through a declared interface or update the architecture first.',
      };
    }
  }

  // Custom team rules. Walk customRules and deny on first regex hit.
  //
  // Two distinct contracts because Edit/Write and Bash are different:
  //
  //   - Edit / Write: appliesTo is a list of file globs. The walker
  //     globs the target file path against each entry; on a hit, it
  //     regex-tests denyPattern against the proposed content
  //     (new_string for Edit, content for Write).
  //
  //   - Bash: there is no file path; commands are strings. The walker
  //     considers a rule applicable to Bash if appliesTo is empty or
  //     contains '**' (the catch-all idioms). Anything else is treated
  //     as Edit/Write-only and skipped for Bash. When applicable, the
  //     walker regex-tests denyPattern against the command text.
  //
  // Pathological regex compile errors are caught and the rule is
  // skipped with a stderr warning. Runtime regex cost is not bounded;
  // teams are responsible for non-pathological patterns.
  const customRules = Array.isArray(rules.customRules) ? rules.customRules : [];
  if (customRules.length > 0) {
    // CustomRule walker uses its own path/content variables, separate
    // from the read-only-paths filePath (which deliberately includes
    // command-as-pseudo-path so Bash hitting .redqueen/** denies).
    const customRulePath = toolInput.file_path || toolInput.filePath || toolInput.path || '';
    const customRuleContent =
      (toolName === 'Edit' && (toolInput.new_string || toolInput.newContent || '')) ||
      (toolName === 'Write' && (toolInput.content || toolInput.new_string || '')) ||
      (toolName === 'Bash' && (toolInput.command || '')) ||
      '';

    for (var i = 0; i < customRules.length; i++) {
      var rule = customRules[i];
      if (!rule || !rule.id || !rule.denyPattern) { continue; }

      var appliesTo = Array.isArray(rule.appliesTo) ? rule.appliesTo : [];
      var pathMatches = false;
      if (toolName === 'Bash') {
        // Bash rules opt in via empty appliesTo or '**' catch-all. Any
        // other glob is treated as Edit/Write-only.
        pathMatches = appliesTo.length === 0 || appliesTo.indexOf('**') !== -1;
      } else if (customRulePath) {
        // Edit / Write: glob-match the target file path.
        for (var j = 0; j < appliesTo.length; j++) {
          if (matchGlob(customRulePath, appliesTo[j])) { pathMatches = true; break; }
        }
      }
      if (!pathMatches) { continue; }

      var re;
      try { re = new RegExp(rule.denyPattern); } catch (err) {
        process.stderr.write('[Red Queen] customRule ' + rule.id + ' has invalid regex; skipping.\\n');
        continue;
      }

      if (re.test(customRuleContent)) {
        return {
          allowed: false,
          ruleId: rule.id,
          reason: '[Red Queen] ' + rule.id + ': ' + (rule.message || 'custom rule denial'),
        };
      }
    }
  }

  // Allow. If an earlier check was approval-bypassed, the audit-log
  // line records the override metadata (which rule was bypassed and
  // which approval source granted it).
  const finalAllow = { allowed: true, reason: '[Red Queen] Policy checks passed.' };
  if (pendingOverride) {
    finalAllow.override = true;
    finalAllow.bypassedRuleId = pendingOverride.bypassedRuleId;
    finalAllow.approvalSource = pendingOverride.approvalSource;
    finalAllow.reason = '[Red Queen] Approved override: ' + pendingOverride.bypassedRuleId +
      ' bypassed via ' + pendingOverride.approvalSource + '.';
  }
  return finalAllow;
}

function matchGlob(filePath, pattern) {
  const normalized = filePath.replace(/\\\\/g, '/');
  const regex = pattern
    .replace(/[.+^\${}()|[\\]\\\\]/g, '\\\\$&')
    .replace(/\\*\\*/g, '{{DS}}')
    .replace(/\\*/g, '[^/]*')
    .replace(/\\{\\{DS\\}\\}/g, '.*');
  return new RegExp('^' + regex + '$').test(normalized);
}
`;
}

function generatePolicyJson(reader: MeshReader, bar: BarSummary, tier?: GovernanceTier): string {
  const calmModel = reader.readFlows(bar.path);

  // Cross-BAR resolution: walk platform CALM relationships for this BAR,
  // collect repo URLs declared on each linked BAR's app.yaml. We skip
  // `bar-to-infrastructure` rows because shared infrastructure has no
  // repos to allowlist. Soft-fails per linked BAR (`getBar` returning
  // null) — a stale platform CALM should not break scaffold.
  const linkedBarRepos: Array<{ linkedBarName: string; repoUrl: string }> = [];
  for (const linked of reader.findLinkedBars(bar.name)) {
    if (linked.relationship !== 'bar-to-bar') { continue; }
    const linkedBar = reader.getBar(linked.barName);
    if (!linkedBar || !Array.isArray(linkedBar.repos)) { continue; }
    for (const repoUrl of linkedBar.repos) {
      if (typeof repoUrl === 'string' && repoUrl.length > 0) {
        linkedBarRepos.push({ linkedBarName: linked.barName, repoUrl });
      }
    }
  }

  const policy = generateStaticPolicy(bar, calmModel ? {
    nodes: calmModel.nodes as Array<{ 'unique-id': string; name: string; 'node-type'?: string }>,
    relationships: calmModel.relationships as Array<{
      'unique-id': string;
      'relationship-type'?: {
        connects?: {
          source?: { node: string };
          destination?: { node: string; interfaces?: unknown[] };
        };
      };
    }>,
    flows: calmModel.flows,
  } : undefined, tier, linkedBarRepos);
  return JSON.stringify(policy, null, 2) + '\n';
}

function generateCopilotHooksJson(tier: GovernanceTier): string {
  const matchers: Record<GovernanceTier, string> = {
    autonomous: 'bash|create|edit',
    supervised: 'bash|create|edit',
    restricted: 'bash|create|edit|view',
  };

  return JSON.stringify({
    version: 1,
    hooks: {
      preToolUse: [
        {
          type: 'command',
          matcher: matchers[tier],
          bash: 'AGENT_TYPE=copilot ./.redqueen/hooks/validate-tool.sh',
          command: 'AGENT_TYPE=copilot ./.redqueen/hooks/validate-tool.sh',
          env: { AGENT_TYPE: 'copilot' },
          timeoutSec: 30,
        },
      ],
    },
  }, null, 2) + '\n';
}

function generateValidateToolSh(): string {
  return `#!/usr/bin/env bash
# The Red Queen's Court — PreToolUse Hook Validator (shell wrapper)
#
# Shared entry point for both Claude Code and Copilot hooks.
# Delegates to the Node.js validator for platform-independent logic.
#
# Usage: Invoked automatically by Claude/Copilot preToolUse hooks.
# Input: JSON on stdin    Output: JSON on stdout

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
exec node "\${SCRIPT_DIR}/validate-tool.js"
`;
}

/**
 * D-PR7 — read the canonical implementation-agent template from
 * `code-templates/agents/implementation-agent.agent.md`. Returns null
 * if the file is missing (a packaging bug — tests catch this; the
 * scaffold treats missing template as "skip" rather than crash so
 * pre-Tier-2 builds don't break).
 *
 * Path resolution walks up from this module's directory until it
 * finds `code-templates/`. This works for both:
 *   - dev: src/mcp/config-scaffold.ts -> ../../code-templates/
 *   - production esbuild bundle: dist/extension.js -> ../code-templates/
 *   - vsix install: <ext root>/dist/extension.js -> ../code-templates/
 */
function readImplementationAgentTemplate(): string | null {
  return readCodeTemplate(path.join('agents', 'implementation-agent.agent.md'));
}

/** Multi-context read of any file under code-templates/ (same path walk as
 *  the agent template — dev tree, esbuild dist, vsix install). */
function readCodeTemplate(relPath: string): string | null {
  const candidatePaths = [
    // src/mcp/config-scaffold.ts → up three to vscode-extension/
    path.join(__dirname, '..', '..', 'code-templates', relPath),
    // dist/extension.js → up one
    path.join(__dirname, '..', 'code-templates', relPath),
    // dist/ deep nesting (defensive)
    path.join(__dirname, '..', '..', '..', 'code-templates', relPath),
  ];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch { /* try next */ }
  }
  return null;
}

/**
 * The custom skills implementation-agent.agent.md declares in its `tools:`
 * frontmatter that have SKILL.md templates to ship. Gap fix (2026-06-11):
 * the mesh deploys SKILL.md for ITS agents via MESH_SKILLS, but the code-repo
 * scaffold shipped only the agent file — never `.github/skills/` — so the
 * persona's declared skills had no SKILL.md where the agent runs. Execution
 * worked regardless (skills run via `npx … skill-<name>`), but the declared-
 * tool contract was broken repo-side. `audit-sign-redqueen-decisions` is
 * intentionally absent — runner-only, tolerated-missing by the agent prompt.
 * Keep in sync with the agent template's `tools:` list.
 */
const IMPL_AGENT_SKILLS = [
  'knowledge-code',
  'knowledge-code-read',
  'audit-emit-event',
  'self-review-impl-architect',
  'self-review-impl-security',
];

export function writeScaffoldFiles(outputDir: string, files: Record<string, string>): number {
  let written = 0;
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(outputDir, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
    fs.writeFileSync(fullPath, content, 'utf8');
    if (
      filePath === '.redqueen/hooks/validate-tool.sh' ||
      filePath === '.redqueen/hooks/validate-tool.js'
    ) {
      fs.chmodSync(fullPath, 0o755);
    }
    written++;
  }
  return written;
}


export function validateScaffoldedRepo(repoPath: string): ScaffoldDoctorResult {
  const errors: ScaffoldDoctorIssue[] = [];
  const warnings: ScaffoldDoctorIssue[] = [];

  function add(
    severity: 'error' | 'warning',
    message: string,
    relativePath?: string,
  ): void {
    (severity === 'error' ? errors : warnings).push({ severity, path: relativePath, message });
  }

  function exists(relativePath: string): boolean {
    return fs.existsSync(path.join(repoPath, relativePath));
  }

  function readJson(relativePath: string): unknown | null {
    const fullPath = path.join(repoPath, relativePath);
    if (!fs.existsSync(fullPath)) {
      add('error', 'Required Red Queen file is missing.', relativePath);
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      add('error', `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`, relativePath);
      return null;
    }
  }

  const requiredFiles = [
    '.claude/settings.json',
    'AGENTS.md',
    '.redqueen/decision.json',
    '.redqueen/policy.json',
    '.redqueen/hooks/validate-tool.js',
    '.redqueen/hooks/validate-tool.sh',
    '.github/hooks/redqueen.json',
    '.redqueen/config-manifest.yaml',
  ];

  for (const relativePath of requiredFiles) {
    if (!exists(relativePath)) {
      add('error', 'Required Red Queen scaffold file is missing.', relativePath);
    }
  }

  const wrapperPath = path.join(repoPath, '.redqueen/hooks/validate-tool.sh');
  if (fs.existsSync(wrapperPath)) {
    const mode = fs.statSync(wrapperPath).mode;
    if ((mode & 0o111) === 0) {
      add('error', 'Hook wrapper is not executable. Run chmod +x or resync governance files.', '.redqueen/hooks/validate-tool.sh');
    }
  }

  const claude = readJson('.claude/settings.json') as {
    hooks?: { PreToolUse?: Array<{ hooks?: Array<{ command?: string }> }> };
  } | null;
  const claudeCommand = claude?.hooks?.PreToolUse?.[0]?.hooks?.[0]?.command || '';
  if (claudeCommand && !claudeCommand.includes('AGENT_TYPE=claude')) {
    add('warning', 'Claude hook command does not set AGENT_TYPE=claude.', '.claude/settings.json');
  }

  const copilot = readJson('.github/hooks/redqueen.json') as {
    version?: number;
    hooks?: { PreToolUse?: Array<{ command?: string; bash?: string }>; preToolUse?: Array<{ command?: string; bash?: string }> };
  } | null;
  if (copilot) {
    if (copilot.version !== 1) {
      add('error', 'Copilot hooks file must set version: 1.', '.github/hooks/redqueen.json');
    }
    const preToolUse = copilot.hooks?.PreToolUse || copilot.hooks?.preToolUse;
    if (!Array.isArray(preToolUse) || preToolUse.length === 0) {
      add('error', 'Copilot hooks file must define a PreToolUse/preToolUse hook array.', '.github/hooks/redqueen.json');
    } else {
      const command = preToolUse[0]?.command || preToolUse[0]?.bash || '';
      if (!command.includes('AGENT_TYPE=copilot')) {
        add('warning', 'Copilot hook command does not set AGENT_TYPE=copilot.', '.github/hooks/redqueen.json');
      }
    }
  }

  const decision = readJson('.redqueen/decision.json') as {
    effectiveTier?: string;
  } | null;

  const policy = readJson('.redqueen/policy.json') as {
    tier?: string;
    rules?: { allowedConnections?: unknown; toolRestrictions?: unknown };
  } | null;
  if (policy) {
    if (!policy.rules?.toolRestrictions) {
      add('error', 'Policy is missing tier tool restrictions.', '.redqueen/policy.json');
    }
    if (!Array.isArray(policy.rules?.allowedConnections)) {
      add('warning', 'Policy has no compiled CALM connection list; hook CALM checks will be limited.', '.redqueen/policy.json');
    }
    if (decision?.effectiveTier && policy.tier !== decision.effectiveTier) {
      add('error', `Policy tier (${policy.tier || 'missing'}) does not match orchestration decision tier (${decision.effectiveTier}).`, '.redqueen/policy.json');
    }
  }

  if (exists('.redqueen/config-manifest.yaml')) {
    const manifest = fs.readFileSync(path.join(repoPath, '.redqueen/config-manifest.yaml'), 'utf8');
    for (const relativePath of ['.claude/settings.json', '.github/hooks/redqueen.json', '.redqueen/policy.json']) {
      if (!manifest.includes(`path: "${relativePath}"`)) {
        add('warning', `Config manifest does not fingerprint ${relativePath}.`, '.redqueen/config-manifest.yaml');
      }
    }
  }

  return {
    ok: errors.length === 0,
    repoPath,
    checkedAt: new Date().toISOString(),
    errors,
    warnings,
  };
}

// ============================================================================
// Phase 7: Review Board generators
// ============================================================================

/**
 * STANDALONE implementation provenance gate.
 *
 * Scaffolded UNCONDITIONALLY on every governed repo: chain provenance is
 * the single server-side governance check on impl PRs. (The old
 * multi-agent review court was retired — agent self-review, the
 * Tweedles, is now embedded in the implementation agent's own loop, and
 * this gate verifies the signed chain it produces.) Runs on impl PRs
 * (head branch `copilot/okr-*`) and verifies the signed audit chain +
 * required skill_call manifest + Hatter Tag, and surfaces the Red Queen
 * decision log. REUSES the runner's skill-audit-verify-chain (one
 * verifier, the same code path the runner signs with — no hand-rolled
 * Ed25519). Other PRs skip the job via the head-ref guard.
 */
export function generateImplProvenanceWorkflow(): string {
  const lines: string[] = [];
  lines.push(`# Implementation Provenance Gate`);
  lines.push(`# Auto-generated by The Red Queen — do not edit manually`);
  lines.push(`# Verifies every implementation PR carries a signed, governed audit chain.`);
  lines.push(``);
  lines.push(`name: Implementation Provenance`);
  lines.push(``);
  lines.push(`on:`);
  lines.push(`  pull_request:`);
  lines.push(`    types: [opened, synchronize, reopened, ready_for_review]`);
  lines.push(``);
  lines.push(`permissions:`);
  lines.push(`  contents: read`);
  lines.push(`  pull-requests: write`);
  lines.push(`  issues: write`);
  lines.push(``);
  lines.push(`jobs:`);
  lines.push(`  impl-provenance:`);
  lines.push(`    runs-on: ubuntu-latest`);
  lines.push(`    if: startsWith(github.head_ref, 'copilot/okr')`);
  lines.push(`    steps:`);
  lines.push(`      - name: Checkout PR head`);
  lines.push(`        uses: actions/checkout@v4`);
  lines.push(``);
  lines.push(`      - name: Setup Node`);
  lines.push(`        uses: actions/setup-node@v4`);
  lines.push(`        with:`);
  lines.push(`          node-version: '20'`);
  lines.push(``);
  lines.push(`      - name: Verify implementation audit chain (Knight's Seal)`);
  lines.push(`        id: chain`);
  lines.push(`        run: |`);
  lines.push(`          set -uo pipefail`);
  lines.push(`          EVENTS=$(ls .maintainability/audit/events/IMPL-*.jsonl 2>/dev/null | head -1 || true)`);
  lines.push(`          if [ -z "$EVENTS" ]; then`);
  lines.push(`            echo "chain_ok=false" >> "$GITHUB_OUTPUT"`);
  lines.push(`            echo "events_file=" >> "$GITHUB_OUTPUT"`);
  lines.push(`            echo "chain_reason=No .maintainability/audit/events/IMPL-*.jsonl committed — the impl agent never shelled the signed runner, so no governed skill ran." >> "$GITHUB_OUTPUT"`);
  lines.push(`            exit 0`);
  lines.push(`          fi`);
  lines.push(`          echo "events_file=$EVENTS" >> "$GITHUB_OUTPUT"`);
  lines.push(`          # skill-audit-verify-chain takes a JSON {okrId,runId} on stdin and`);
  lines.push(`          # RESOLVES + reads the committed events file ITSELF (IMPL-* runId →`);
  lines.push(`          # .maintainability/audit/events/<runId>.jsonl under the checkout). Do`);
  lines.push(`          # NOT pipe the raw JSONL — the CLI JSON.parses stdin and chokes after`);
  lines.push(`          # the first event ("bad-stdin-json"). Derive both keys from the file:`);
  lines.push(`          # the filename IS the runId, and each event carries top-level okr_id.`);
  lines.push(`          RUN_ID=$(basename "$EVENTS" .jsonl)`);
  lines.push(`          OKR_ID=$(node -e "const fs=require('fs');const l=fs.readFileSync(process.argv[1],'utf8').split('\\n').find(x=>x.trim());process.stdout.write(l?(JSON.parse(l).okr_id||''):'')" "$EVENTS")`);
  lines.push(`          RESULT=$(printf '{"okrId":"%s","runId":"%s"}' "$OKR_ID" "$RUN_ID" | npx -y @maintainabilityai/research-runner@~0.1.64 skill-audit-verify-chain 2>&1 || true)`);
  lines.push(`          printf '%s' "$RESULT" > /tmp/impl-chain-verify.json`);
  lines.push(`          OK=$(node -e "try{const r=JSON.parse(require('fs').readFileSync('/tmp/impl-chain-verify.json','utf8'));process.stdout.write(String(r.ok===true))}catch(e){process.stdout.write('false')}")`);
  lines.push(`          echo "chain_ok=$OK" >> "$GITHUB_OUTPUT"`);
  lines.push(`          if [ "$OK" != "true" ]; then`);
  lines.push(`            REASON=$(node -e "try{const r=JSON.parse(require('fs').readFileSync('/tmp/impl-chain-verify.json','utf8'));process.stdout.write(String(r.reason||'chain verification failed'))}catch(e){process.stdout.write('chain-verify output unparseable')}")`);
  lines.push(`            echo "chain_reason=$REASON" >> "$GITHUB_OUTPUT"`);
  lines.push(`          else`);
  lines.push(`            echo "chain_reason=verified" >> "$GITHUB_OUTPUT"`);
  lines.push(`          fi`);
  lines.push(``);
  lines.push(`      - name: Verify required skill_call manifest`);
  lines.push(`        id: manifest`);
  lines.push(`        if: steps.chain.outputs.chain_ok == 'true'`);
  lines.push(`        env:`);
  // Bug-MM-safe: pass the events path via env, not inlined into the
  // python args. Bug-XX-safe: the heredoc imports everything it uses.
  lines.push(`          JSONL: \${{ steps.chain.outputs.events_file }}`);
  lines.push(`        run: |`);
  lines.push(`          python3 <<'PYEOF'`);
  lines.push(`          import json, os`);
  lines.push(`          jsonl = os.environ['JSONL']`);
  lines.push(`          counts = {}`);
  lines.push(`          with open(jsonl, 'r', encoding='utf-8') as f:`);
  lines.push(`              for line in f:`);
  lines.push(`                  line = line.strip()`);
  lines.push(`                  if not line: continue`);
  lines.push(`                  try:`);
  lines.push(`                      e = json.loads(line)`);
  lines.push(`                  except Exception:`);
  lines.push(`                      continue`);
  lines.push(`                  if e.get('event_kind') != 'skill_call': continue`);
  lines.push(`                  payload = e.get('payload') or {}`);
  lines.push(`                  if payload.get('ok') is False: continue`);
  lines.push(`                  skill = payload.get('skill')`);
  lines.push(`                  if not skill: continue`);
  lines.push(`                  counts[skill] = counts.get(skill, 0) + 1`);
  lines.push(`          required = ['knowledge-code', 'self-review-impl-architect', 'self-review-impl-security']`);
  lines.push(`          missing = [r for r in required if counts.get(r, 0) < 1]`);
  lines.push(`          out = os.environ['GITHUB_OUTPUT']`);
  lines.push(`          with open(out, 'a', encoding='utf-8') as gh:`);
  lines.push(`              gh.write('manifest_ok=' + ('true' if not missing else 'false') + '\\n')`);
  lines.push(`              gh.write('manifest_missing=' + (','.join(missing) if missing else 'none') + '\\n')`);
  lines.push(`          print('skill_call counts:', counts)`);
  lines.push(`          print('missing required:', missing)`);
  lines.push(`          PYEOF`);
  lines.push(``);
  lines.push(`      - name: Verify Hatter Tag continuation`);
  lines.push(`        id: hatter`);
  lines.push(`        uses: actions/github-script@v7`);
  lines.push(`        with:`);
  lines.push(`          script: |`);
  // PR body read via the API object (not interpolated into shell) — no
  // backtick-injection surface (Bug-VV/WW class).
  lines.push(`            const body = context.payload.pull_request.body || '';`);
  lines.push(`            const hasBlock = body.includes('implementation_chain:');`);
  lines.push(`            const m = body.match(/chain_root_hash:\\s*([^\\s]+)/);`);
  lines.push(`            const root = m ? m[1] : '';`);
  lines.push(`            const ok = hasBlock && root && root !== 'PENDING_WRITE_APPROVAL';`);
  lines.push(`            core.setOutput('hatter_ok', ok ? 'true' : 'false');`);
  lines.push(`            core.setOutput('hatter_reason', ok ? 'present' : (hasBlock ? 'chain_root_hash missing or PENDING_WRITE_APPROVAL' : 'no implementation_chain block in PR body'));`);
  lines.push(``);
  // Bug-AAE Phase 3 — surface the Red Queen PreToolUse decision trail
  // (.redqueen/audit-log.jsonl) committed by the agent. ADVISORY only:
  // an autonomous-tier run is all-allows, and capture depends on the
  // agent staging the file, so we report it but never gate on it.
  lines.push(`      - name: Summarize Red Queen decision log`);
  lines.push(`        id: redqueen`);
  lines.push(`        if: always()`);
  lines.push(`        env:`);
  // Codex r3 finding 1 — scan ONLY the exact IMPL events file the 'chain'
  // step verified (steps.chain.outputs.events_file), NOT a glob over every
  // IMPL-*.jsonl. Otherwise file A could be chain-verified while file B
  // supplies the matching redqueen_decisions event, and the comment could
  // still say "signed & verified" from mismatched evidence. Empty when the
  // chain step found no events file.
  lines.push(`          EVENTS_FILE: \${{ steps.chain.outputs.events_file }}`);
  lines.push(`        run: |`);
  lines.push(`          python3 <<'PYEOF'`);
  lines.push(`          # Tier 2.5a — SIGNED-PREFIX SEAL verification.`);
  lines.push(`          # The Red Queen log is a live append-only sidecar; the hook fires`);
  lines.push(`          # on the agent's OWN final git add/commit, so a whole-file digest`);
  lines.push(`          # taken at sign time can never match the committed file. The runner`);
  lines.push(`          # therefore seals a PREFIX: payload.covered_bytes + covered_sha256.`);
  lines.push(`          # This step re-hashes the first covered_bytes of the committed log`);
  lines.push(`          # and compares; anything after is the uncovered TAIL (the agent's`);
  lines.push(`          # post-seal commit-time decisions), reported separately — allow-only`);
  lines.push(`          # tail is benign (a note), deny/override/unknown in the tail blocks.`);
  lines.push(`          # ADVISORY today (does not flip the gate's pass).`);
  lines.push(`          import json, os, hashlib`);
  lines.push(`          EVENTS_FILE = os.environ.get('EVENTS_FILE', '')`);
  lines.push(`          path = '.redqueen/audit-log.jsonl'`);
  lines.push(`          present = os.path.exists(path)`);
  lines.push(`          log_bytes = b''`);
  lines.push(`          if present:`);
  lines.push(`              with open(path, 'rb') as bf:`);
  lines.push(`                  log_bytes = bf.read()`);
  lines.push(`          # Find the sealed redqueen_decisions event in the CHAIN-VERIFIED`);
  lines.push(`          # events file only (Codex r3 finding 1 — no glob).`);
  lines.push(`          digest_present = False`);
  lines.push(`          covered_bytes = None`);
  lines.push(`          covered_sha = None`);
  lines.push(`          if EVENTS_FILE and os.path.exists(EVENTS_FILE):`);
  lines.push(`              try:`);
  lines.push(`                  with open(EVENTS_FILE, 'r', encoding='utf-8') as ef:`);
  lines.push(`                      for line in ef:`);
  lines.push(`                          line = line.strip()`);
  lines.push(`                          if not line: continue`);
  lines.push(`                          try:`);
  lines.push(`                              ev = json.loads(line)`);
  lines.push(`                          except Exception:`);
  lines.push(`                              continue`);
  lines.push(`                          if ev.get('event_kind') != 'redqueen_decisions': continue`);
  lines.push(`                          digest_present = True`);
  lines.push(`                          p = ev.get('payload') or {}`);
  lines.push(`                          covered_bytes = p.get('covered_bytes')`);
  lines.push(`                          covered_sha = p.get('covered_sha256')`);
  lines.push(`              except Exception:`);
  lines.push(`                  pass`);
  lines.push(`          # Verify the sealed prefix: re-hash the first covered_bytes bytes.`);
  lines.push(`          seal_match = False`);
  lines.push(`          tail_bytes = 0`);
  lines.push(`          tail_allowed = tail_other = 0`);
  lines.push(`          if digest_present:`);
  lines.push(`              # honest-zero seal: the runner read NO decision log at sign time`);
  lines.push(`              # and emits the EXACT shape covered_bytes=0 AND covered_sha256=null.`);
  lines.push(`              # A zero-byte prefix is vacuously sealed, so the WHOLE committed`);
  lines.push(`              # log is the uncovered tail. NOTE: test covered_bytes == 0, NOT`);
  lines.push(`              # 'is None' (the runner sends the int 0). And covered_sha MUST be`);
  lines.push(`              # null (exact) — covered_bytes=0 with a non-null sha (incl. an`);
  lines.push(`              # empty string) is MALFORMED and falls through to mismatch, never`);
  lines.push(`              # a benign honest-zero.`);
  lines.push(`              if isinstance(covered_bytes, int) and covered_bytes == 0 and covered_sha is None:`);
  lines.push(`                  seal_match = True`);
  lines.push(`                  tail_bytes = len(log_bytes)`);
  lines.push(`              elif isinstance(covered_bytes, int) and covered_bytes > 0 and covered_sha and covered_bytes <= len(log_bytes):`);
  lines.push(`                  prefix = log_bytes[:covered_bytes]`);
  lines.push(`                  seal_match = (hashlib.sha256(prefix).hexdigest() == covered_sha)`);
  lines.push(`                  tail_bytes = len(log_bytes) - covered_bytes`);
  lines.push(`              else:`);
  lines.push(`                  # covered_bytes missing / None / negative, claims MORE than the`);
  lines.push(`                  # committed log holds, or covered_sha absent — a real mismatch,`);
  lines.push(`                  # never a benign tail. No unconditional-true escape hatch here:`);
  lines.push(`                  # a malformed or forged seal MUST fail to match.`);
  lines.push(`                  seal_match = False`);
  lines.push(`          # Classify the uncovered tail: a plain allow is benign; any deny,`);
  lines.push(`          # OVERRIDE (verdict allow but a deny was bypassed), non-allow, or`);
  lines.push(`          # unparseable line is a flagged tail (advisory — surfaced, not gated`);
  lines.push(`          # unless the pass condition opts in below).`);
  lines.push(`          if seal_match and tail_bytes > 0 and covered_bytes is not None:`);
  lines.push(`              tail = log_bytes[covered_bytes:].decode('utf-8', 'replace')`);
  lines.push(`              for tline in tail.split('\\n'):`);
  lines.push(`                  tline = tline.strip()`);
  lines.push(`                  if not tline: continue`);
  lines.push(`                  try:`);
  lines.push(`                      te = json.loads(tline)`);
  lines.push(`                  except Exception:`);
  lines.push(`                      tail_other += 1; continue`);
  lines.push(`                  tp = te.get('payload') or {}`);
  lines.push(`                  tv = tp.get('verdict') or te.get('verdict')`);
  lines.push(`                  to = (tp.get('override') is True) or (te.get('override') is True)`);
  lines.push(`                  if tv == 'allow' and not to: tail_allowed += 1`);
  lines.push(`                  else: tail_other += 1`);
  lines.push(`          # Count allow/deny across the COMMITTED log for the human summary.`);
  lines.push(`          allowed = denied = 0`);
  lines.push(`          if present:`);
  lines.push(`              for line in log_bytes.decode('utf-8', 'replace').split('\\n'):`);
  lines.push(`                  line = line.strip()`);
  lines.push(`                  if not line: continue`);
  lines.push(`                  try:`);
  lines.push(`                      e = json.loads(line)`);
  lines.push(`                  except Exception:`);
  lines.push(`                      continue`);
  lines.push(`                  v = ((e.get('payload') or {}).get('verdict')) or e.get('verdict')`);
  lines.push(`                  if v == 'allow': allowed += 1`);
  lines.push(`                  elif v == 'deny': denied += 1`);
  lines.push(`          tail_clean = (tail_other == 0)`);
  lines.push(`          out = os.environ['GITHUB_OUTPUT']`);
  lines.push(`          with open(out, 'a', encoding='utf-8') as gh:`);
  lines.push(`              gh.write('rq_present=' + ('true' if present else 'false') + '\\n')`);
  lines.push(`              gh.write('rq_allowed=' + str(allowed) + '\\n')`);
  lines.push(`              gh.write('rq_denied=' + str(denied) + '\\n')`);
  lines.push(`              gh.write('rq_digest_present=' + ('true' if digest_present else 'false') + '\\n')`);
  lines.push(`              gh.write('rq_seal_match=' + ('true' if seal_match else 'false') + '\\n')`);
  lines.push(`              gh.write('rq_tail_count=' + str(tail_allowed + tail_other) + '\\n')`);
  lines.push(`              gh.write('rq_tail_allowed=' + str(tail_allowed) + '\\n')`);
  lines.push(`              gh.write('rq_tail_other=' + str(tail_other) + '\\n')`);
  lines.push(`              gh.write('rq_tail_clean=' + ('true' if tail_clean else 'false') + '\\n')`);
  lines.push(`          print('red queen seal: present=%s match=%s allowed=%d denied=%d tail=%d (allow=%d other=%d)' % (digest_present, seal_match, allowed, denied, tail_allowed+tail_other, tail_allowed, tail_other))`);
  lines.push(`          PYEOF`);
  lines.push(``);
  lines.push(`      - name: Post provenance verdict + gate`);
  lines.push(`        if: always()`);
  lines.push(`        uses: actions/github-script@v7`);
  lines.push(`        with:`);
  lines.push(`          script: |`);
  lines.push(`            const chainOk = '\${{ steps.chain.outputs.chain_ok }}' === 'true';`);
  lines.push(`            const manifestOk = '\${{ steps.manifest.outputs.manifest_ok }}' === 'true';`);
  lines.push(`            const hatterOk = '\${{ steps.hatter.outputs.hatter_ok }}' === 'true';`);
  lines.push(`            const chainReason = \`\${{ steps.chain.outputs.chain_reason }}\`;`);
  lines.push(`            const missing = \`\${{ steps.manifest.outputs.manifest_missing }}\`;`);
  lines.push(`            const hatterReason = \`\${{ steps.hatter.outputs.hatter_reason }}\`;`);
  lines.push(`            // Red Queen signed-prefix seal signals — hoisted above the pass`);
  lines.push(`            // gate so the gate can fail on a seal mismatch.`);
  lines.push(`            const rqDigestPresent = '\${{ steps.redqueen.outputs.rq_digest_present }}' === 'true';`);
  lines.push(`            const rqSealMatch = '\${{ steps.redqueen.outputs.rq_seal_match }}' === 'true';`);
  lines.push(`            // GATE ON SEAL MISMATCH ONLY (user decision). A signed seal whose`);
  lines.push(`            // committed prefix fails to re-hash means tamper / corruption / wrong`);
  lines.push(`            // bytes — that FAILS the PR. A non-clean TAIL (the agent's own`);
  lines.push(`            // post-seal commit-time decisions) stays advisory: surfaced, not`);
  lines.push(`            // gated. No signed seal present → the seal clause is vacuously true`);
  lines.push(`            // (back-compat with runs that predate the signer).`);
  lines.push(`            const pass = chainOk && manifestOk && hatterOk && (!rqDigestPresent || rqSealMatch);`);
  lines.push(`            const row = (label, ok, detail) => \`| \${ok ? '✅' : '❌'} | \${label} | \${detail} |\`;`);
  lines.push(`            let bodyMd = \`## \${pass ? '✅' : '❌'} Implementation provenance\\n\\n\`;`);
  lines.push(`            bodyMd += '| | Check | Detail |\\n|---|---|---|\\n';`);
  lines.push(`            bodyMd += row('Signed audit chain', chainOk, chainReason) + '\\n';`);
  lines.push(`            bodyMd += row('Skill manifest (knowledge-code + self-review-impl)', manifestOk, manifestOk ? 'all present' : ('missing: ' + missing)) + '\\n';`);
  lines.push(`            bodyMd += row('Hatter Tag continuation', hatterOk, hatterReason) + '\\n';`);
  lines.push(`            const rqPresent = '\${{ steps.redqueen.outputs.rq_present }}' === 'true';`);
  lines.push(`            const rqAllowed = '\${{ steps.redqueen.outputs.rq_allowed }}';`);
  lines.push(`            const rqDenied = '\${{ steps.redqueen.outputs.rq_denied }}';`);
  lines.push(`            const rqTailCount = parseInt('\${{ steps.redqueen.outputs.rq_tail_count }}' || '0', 10);`);
  lines.push(`            const rqTailClean = '\${{ steps.redqueen.outputs.rq_tail_clean }}' === 'true';`);
  lines.push(`            // Tier 2.5a SIGNED-PREFIX SEAL (Codex-approved contract). The seal`);
  lines.push(`            // covers the decision-log PREFIX the runner read; the gate re-hashes`);
  lines.push(`            // the first covered_bytes of the committed log. "signed & verified"`);
  lines.push(`            // requires the chain step to have verified the event's signature`);
  lines.push(`            // (chainOk) AND the sealed prefix to match (rqSealMatch). Anything`);
  lines.push(`            // after the seal is the agent's own post-seal commit-time decisions —`);
  lines.push(`            // an UNCOVERED TAIL, named honestly: allow-only is benign, deny/`);
  lines.push(`            // override/unknown in the tail is flagged. GATING: a seal MISMATCH`);
  lines.push(`            // fails the PR (folded into pass above); the tail stays advisory.`);
  lines.push(`            const rqVerified = rqDigestPresent && rqSealMatch && chainOk;`);
  lines.push(`            const tailNote = rqTailCount > 0`);
  lines.push(`              ? (' · ' + rqTailCount + ' post-seal commit decision' + (rqTailCount === 1 ? '' : 's') + (rqTailClean ? ' (allow-only, uncovered)' : ' ⚠ NON-ALLOW IN TAIL'))`);
  lines.push(`              : '';`);
  lines.push(`            const rqDetail = rqVerified`);
  lines.push(`              ? ((rqPresent`);
  lines.push(`                    ? ('signed & verified · ' + rqAllowed + ' decisions sealed' + (rqDenied !== '0' ? (' / ' + rqDenied + ' denied') : ''))`);
  lines.push(`                    : 'signed & verified · no decision log (no governed tool calls captured)') + tailNote)`);
  lines.push(`              : rqDigestPresent`);
  lines.push(`                ? ('seal present · ' + (rqSealMatch ? 'prefix ✓' : 'prefix ✗ MISMATCH (gates — fails the PR)') + (chainOk ? '' : ' · chain unverified') + ' · ' + rqAllowed + ' allowed / ' + rqDenied + ' denied' + tailNote)`);
  lines.push(`                : (rqPresent ? (rqAllowed + ' allowed / ' + rqDenied + ' denied · unsigned (runner upgrade pending)') : 'no .redqueen/audit-log.jsonl committed (advisory — not gated)');`);
  lines.push(`            const rqIcon = !rqDigestPresent ? (rqPresent ? 'ℹ️' : '➖') : (rqVerified ? (rqTailClean ? '✅' : '⚠️') : '❌');`);
  lines.push(`            bodyMd += \`| \${rqIcon} | Red Queen enforcement seal (mismatch gates · tail advisory) | \${rqDetail} |\\n\`;`);
  lines.push(`            bodyMd += '\\n---\\n🔴 Generated by [The Red Queen](https://maintainability.ai) — implementation provenance gate';`);
  lines.push(`            await github.rest.issues.createComment({ owner: context.repo.owner, repo: context.repo.repo, issue_number: context.issue.number, body: bodyMd });`);
  lines.push(`            if (!pass) { const why = (rqDigestPresent && !rqSealMatch) ? 'the Red Queen seal failed to verify — the committed decision-log prefix does not match the signed seal (tamper / corruption / wrong bytes)' : 'the impl run was not governed (signed chain / skill manifest / Hatter Tag incomplete)'; core.setFailed('Implementation provenance failed — see the PR comment. ' + why + '.'); }`);

  return lines.join('\n') + '\n';
}

// ============================================================================
// Main scaffold function
// ============================================================================

/**
 * Codex-r1 Bug G — optional OKR context for greenfield fan-out
 * scaffolds. When ScaffoldPanel.createOrShow is invoked from the
 * fan-out flow with an `okrContext`, the same context is threaded
 * here so the scaffold output includes `docs/code-design-spec.md`
 * pointing the impl-agent at its source artifact in the mesh repo.
 * Without this seed file, the agent would land in an empty target
 * repo with no in-tree reference to its per-repo extract.
 */
export interface ScaffoldOkrContextLite {
  okrId: string;
  repoSlug: string;
  /** Mesh repo slug (owner/name) — needed for the artifact link. */
  meshRepoSlug?: string;
}

/**
 * Builds the `docs/code-design-spec.md` grounding file the Looking Glass
 * fan-out commits into EACH target repo at dispatch (greenfield + brownfield).
 *
 * Grounding fix (post-audit of celeb-api PR #8): the impl design is FROZEN at
 * WHAT dispatch, so the implementation agent should ground against a local
 * snapshot — not a live mesh fetch it can't perform (the Copilot cloud sandbox
 * has no read token for the private governance-mesh repo). This file is
 * delivered by the FAN-OUT (LookingGlassPanel.onFanOutInner), not by
 * scaffolding — so it is always the current design and present in every repo.
 *
 * When the canonical `code-design.md` is readable (`codeDesignMd` non-null),
 * its FULL content is INLINED so the agent reads the binding contract locally.
 * The doc is a shared multi-repo artifact: the agent's per-repo slices are the
 * H3 sub-blocks naming its repo across §1 (structure), §2 (API contract —
 * binding; the provenance gate diffs the agent's exposed contract against it),
 * §3 (models), §4 (auth); §5–§10 are shared. Sibling sub-blocks are kept for
 * cross-repo contract coordination.
 *
 * The pointer/checklist fallback (`codeDesignMd` null) is retained for safety,
 * but the fan-out aborts BEFORE dispatch when it can't read the canonical
 * design, so in practice this builder is only called with the full design.
 */
export function buildCodeDesignSeed(
  okrContext: ScaffoldOkrContextLite,
  codeDesignMd: string | null,
): string {
  const mesh = okrContext.meshRepoSlug ?? 'OWNER/MESH-REPO';
  const artifactPath = `okrs/${okrContext.okrId}/what/code-design.md`;
  const header = [
    `# Code Design Spec — \`${okrContext.repoSlug}\``,
    '',
    `_Committed by the Looking Glass fan-out for OKR \`${okrContext.okrId}\` (delivered at dispatch — greenfield + brownfield)._`,
    '',
    '## Source artifact',
    '',
    `- **Repo:** \`${mesh}\``,
    `- **Path:** \`${artifactPath}\``,
    `- **Link:** [\`${artifactPath}\`](https://github.com/${mesh}/blob/main/${artifactPath})`,
    '',
  ];

  if (codeDesignMd && codeDesignMd.trim()) {
    return [
      ...header,
      '## How to read this',
      '',
      'The **full canonical WHAT-phase design is inlined below** — frozen at WHAT',
      'dispatch and committed into this repo by the fan-out at dispatch time, so',
      'you ground against it **locally** (no mesh-repo access required). The design is a',
      'shared, multi-repo artifact; **your** per-repo slices are the H3 sub-blocks',
      `naming \`${okrContext.repoSlug}\` (slug in §1; short name + role in §2–§4):`,
      '',
      '- **§1 Project Structure** — your layout',
      '- **§2 API Endpoint Specifications** — your **binding contract**. Endpoint',
      '  paths and request/response field names + shapes are acceptance criteria,',
      '  not suggestions: the provenance gate diffs your exposed contract against',
      '  this — drift (renamed fields, changed paths, missing endpoints) fails the PR.',
      '- **§3 Data Models** + **§4 Authentication** — your models + auth',
      '- **§5–§10** — shared across all target repos (security controls, config,',
      '  error handling, testing, deployment, rationale)',
      '',
      'Sibling-repo sub-blocks are kept for cross-repo contract coordination (also',
      'summarised in the landing-issue body).',
      '',
      '> ⚠️ The inlined doc’s YAML frontmatter (`chain_root_hash`, `run_id`, …) and',
      '> any trailing `### Self-review — Code-*` sections belong to the **WHAT-phase',
      '> design agent** — they are NOT your `implementation_chain`. Your',
      '> `parent_chain_root` comes from the landing issue; compute your own',
      '> `chain_root_hash` per `.github/agents/implementation-agent.agent.md`.',
      '',
      '## Implementation agent checklist',
      '',
      `1. Read your per-repo slices below (§1–§4, the \`${okrContext.repoSlug}\` sub-blocks); treat §2 as the binding contract.`,
      '2. Read sibling-repo coordination from the landing-issue body.',
      '3. Plan + implement + run the Tweedles persona-switch self-critique (Architect + Security) via the runner skills.',
      '4. Open the impl PR with the `implementation_chain` Hatter Tag continuation block per `.github/agents/implementation-agent.agent.md`.',
      '',
      '---',
      '',
      '# Canonical WHAT-phase design — inlined snapshot',
      '',
      codeDesignMd.trim(),
      '',
    ].join('\n');
  }

  // Fallback: mesh artifact not readable at scaffold time → pointer stub.
  return [
    ...header,
    '## Your per-repo extract',
    '',
    `The canonical design could not be read at scaffold time, so this is a pointer only. The per-repo content for \`${okrContext.repoSlug}\` lives in the H3 sub-blocks naming your repo across §1 (structure), §2 (API contract — **binding**), §3 (models) and §4 (auth); §5–§10 are shared.`,
    '',
    '## Implementation agent checklist',
    '',
    '1. Fetch the source artifact at the link above.',
    '2. Read your per-repo sub-blocks (§1–§4); treat §2 (API spec) as the binding contract.',
    '3. Read sibling-repo coordination from the landing-issue body.',
    '4. Plan + implement + run Tweedles persona-switch self-critique (Architect + Security).',
    '5. Open the impl PR with the `implementation_chain` Hatter Tag continuation block per `.github/agents/implementation-agent.agent.md`.',
    '',
  ].join('\n');
}

export function scaffoldAgentConfig(
  reader: MeshReader,
  barName: string,
  redQueen?: RedQueenService,
): ScaffoldResult | { error: string } {
  const bar = reader.getBar(barName);
  if (!bar) {
    return { error: `BAR not found: ${barName}` };
  }

  let tier: GovernanceTier;
  let decision: OrchestrationDecision | undefined;

  // Policy-driven tier when RedQueenService is available, otherwise use simple score-based
  if (redQueen) {
    const result = redQueen.getOrchestrationDecision(reader, barName);
    if ('error' in result) { return result; }
    decision = result;
    tier = decision.effectiveTier;
  } else {
    tier = computeTier(bar);
  }

  const files: Record<string, string> = {};
  // Non-fatal warnings surfaced to the caller (e.g. the greenfield
  // code-design seed could not be grounded from the mesh).
  const warnings: string[] = [];

  // NOTE: the MCP "live mesh tools" layer (.mcp.json + .redqueen/mcp-runner.js
  // + .github/copilot-governance-steps.yml) has been RETIRED. It launched the
  // @maintainabilityai/redqueen-mcp server against a runtime-resolved mesh, but
  // governed code repos never resolve the mesh locally and nothing wired the
  // COPILOT_MCP_MESH_TOKEN it needed. Governance is now fully deterministic:
  // the baked .redqueen/policy.json + PreToolUse hook enforce at the tool-call
  // boundary, and impl-provenance.yml proves the chain at merge — no runtime
  // mesh, MCP server, or token. (Deferred to a future enhancement; see
  // design/cheshire-cat-maintenance-agent.md "Retire the MCP layer".)

  // Generate files — use policy-driven generators when available
  if (decision && redQueen) {
    const policy = redQueen.loadPolicy(reader);
    files['.claude/settings.json'] = redQueen.generateSettings(decision);
    files['AGENTS.md'] = redQueen.generateAgentsMd(decision, bar, policy);
    files['.redqueen/governance-context.md'] = redQueen.generateGovernanceContext(decision, bar, policy, reader);
    // Enrich decision with BAR context for the governance bridge
    const enrichedDecision = {
      ...decision,
      compositeScore: bar.compositeScore,
      criticality: bar.criticality,
      platformId: bar.platformId,
      pillarScores: {
        architecture: bar.architecture.score,
        security: bar.security.score,
        infoRisk: bar.infoRisk.score,
        operations: bar.operations.score,
      },
    };
    files['.redqueen/decision.json'] = JSON.stringify(enrichedDecision, null, 2) + '\n';
  } else {
    files['.claude/settings.json'] = generateClaudeSettings(tier);
    files['AGENTS.md'] = generateAgentsMd(bar, tier);
  }

  files['.redqueen/hooks/validate-tool.js'] = generateValidateToolJs();
  files['.redqueen/hooks/validate-tool.sh'] = generateValidateToolSh();
  files['.redqueen/policy.json'] = generatePolicyJson(reader, bar, tier);
  files['.github/hooks/redqueen.json'] = generateCopilotHooksJson(tier);
  // The implementation provenance gate is UNCONDITIONAL: chain provenance
  // must verify on every impl PR. It is the sole server-side governance
  // check now that the multi-agent review court has been retired (agent
  // self-review is embedded in the implementation agent).
  files['.github/workflows/impl-provenance.yml'] = generateImplProvenanceWorkflow();

  // D-PR7 — implementation-agent template. The Looking Glass fan-out
  // engine probes for this file when deciding pre-flight per repo:
  //   - present  → row can flow to `ready`
  //   - missing  → row goes to `harness-missing`; user routes through
  //                Cheshire retrofit (THIS scaffold path) to install
  // The template body lives in code-templates/agents/ so the same
  // file Looking Glass installs is the file the fan-out engine's
  // probe expects. NEVER inline the body in code-scaffold.ts -- a
  // future template tweak would silently diverge across the two
  // install paths (mesh redeploy vs Cheshire scaffold).
  const implAgentTemplate = readImplementationAgentTemplate();
  if (implAgentTemplate) {
    files['.github/agents/implementation-agent.agent.md'] = implAgentTemplate;
    // Ship the SKILL.md for every custom skill the persona declares (the
    // scaffold gap found 2026-06-11 — agent file landed, skills never did).
    for (const skill of IMPL_AGENT_SKILLS) {
      const skillMd = readCodeTemplate(path.join('skills', skill, 'SKILL.md'));
      if (skillMd) {
        files[`.github/skills/${skill}/SKILL.md`] = skillMd;
      }
    }
  }

  // D-PR7 — `.maintainability/audit/` is agent-emission territory
  // (event log + per-epoch public keys). Cheshire seeds an empty
  // directory tree + a .gitignore exception so the agent's commits
  // aren't rejected by language-default rules (Python, Node, etc.
  // commonly ignore dotfiles + state dirs).
  files['.maintainability/audit/events/.gitkeep'] = '';
  files['.maintainability/audit/keys/.gitkeep'] = '';
  files['.maintainability/.gitignore'] = [
    '# D-PR7 — implementation-agent emission territory.',
    '# Keep events + keys committed; ignore transient runtime files.',
    '*.tmp',
    '*.lock',
    '',
  ].join('\n');

  // NOTE: the impl-agent grounding seed (docs/code-design-spec.md) is NO LONGER
  // written here. It is OKR/WHAT-phase content, not a property of the repo, and
  // coupling it to scaffold time made it stale on WHAT re-runs and skipped
  // brownfield entirely. The frozen design is now committed into EACH target
  // repo at FAN-OUT time (LookingGlassPanel.onFanOutInner → githubService
  // .putRepoFile), greenfield and brownfield alike, so it's always the current
  // design and the delivery path is symmetric. buildCodeDesignSeed remains
  // exported as the shared builder the fan-out calls.

  // (The mesh-repo resolution + .github/copilot-governance-steps.yml emission
  // were removed with the MCP layer — that snippet existed only to checkout the
  // mesh and launch the MCP runner in CI.)

  // Generate config manifest with SHA-256 fingerprints
  const manifest: ConfigManifest = {
    generatedAt: new Date().toISOString(),
    barId: bar.id,
    barName: bar.name,
    meshPath: DEFAULT_MESH_CHECKOUT_PATH,
    tier,
    compositeScore: bar.compositeScore,
    files: Object.entries(files).map(([filePath, content]) => ({
      path: filePath,
      sha256: crypto.createHash('sha256').update(content).digest('hex'),
    })),
  };

  files['.redqueen/config-manifest.yaml'] = generateConfigManifestYaml(manifest);

  return { barName: bar.name, barId: bar.id, tier, decision, files, manifest, warnings };
}

function generateConfigManifestYaml(manifest: ConfigManifest): string {
  const lines = [
    '# Red Queen Configuration Manifest',
    '# Auto-generated — do not edit manually',
    `# Re-generate with: redqueen scaffold --bar "${manifest.barName}"`,
    '',
    `generated_at: "${manifest.generatedAt}"`,
    `bar_id: ${manifest.barId}`,
    `bar_name: "${manifest.barName}"`,
    `mesh_path: "${manifest.meshPath}"`,
    `mesh_checkout_path: "${manifest.meshPath}"`,
    `tier: ${manifest.tier}`,
    `composite_score: ${manifest.compositeScore}`,
    '',
    'files:',
  ];

  for (const file of manifest.files) {
    lines.push(`  - path: "${file.path}"`);
    lines.push(`    sha256: ${file.sha256}`);
  }

  return lines.join('\n') + '\n';
}
