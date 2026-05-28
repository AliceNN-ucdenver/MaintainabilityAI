/**
 * Agent configuration scaffolding for the Red Queen MCP server.
 *
 * Generates .mcp.json, .claude/settings.json, AGENTS.md, and related
 * config files for code repos. The governance mesh is the single source
 * of truth — templates live in .redqueen/ within the mesh, and this
 * module interpolates BAR-specific context (scores, tier, constraints).
 *
 * Update the mesh templates once → re-scaffold to all repos.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execFileSync } from 'child_process';
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

function generateMcpJson(meshPath: string, customTemplate?: string): string {
  // If the mesh has a custom template, use it
  if (customTemplate) {
    return customTemplate.replace(/\{\{MESH_PATH\}\}/g, meshPath);
  }

  // Default template — committed repos launch a local runner. The runner
  // resolves the live mesh from env, CI checkout, or manifest defaults before
  // starting the npm MCP package. This keeps config portable without copying
  // the governance mesh into every code repo.
  return JSON.stringify({
    mcpServers: {
      redqueen: {
        command: 'node',
        args: ['.redqueen/mcp-runner.js'],
      },
    },
  }, null, 2) + '\n';
}

function generateMcpRunnerJs(): string {
  return `#!/usr/bin/env node
/**
 * The Red Queen MCP Runner
 *
 * Repo-local launcher for the live governance mesh. The code repo keeps a
 * self-contained governance harness; the governance mesh remains the source of
 * truth and is resolved locally at runtime.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, '.redqueen', 'config-manifest.yaml');
const envKeys = ['RED_QUEEN_MESH_PATH', 'GOVERNANCE_MESH_PATH', 'MESH_PATH'];

function readManifestValue(key) {
  if (!fs.existsSync(manifestPath)) { return null; }
  const prefix = key + ':';
  const lines = fs.readFileSync(manifestPath, 'utf8').split(/\\r?\\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

function resolvePath(value) {
  if (!value) { return null; }
  const cleaned = String(value).trim().replace(/^["']|["']$/g, '');
  if (!cleaned) { return null; }
  return path.isAbsolute(cleaned) ? cleaned : path.resolve(repoRoot, cleaned);
}

function isGovernanceMesh(candidate) {
  return Boolean(candidate && fs.existsSync(path.join(candidate, 'mesh.yaml')));
}

function addCandidate(candidates, source, value) {
  const resolved = resolvePath(value);
  if (resolved) {
    candidates.push({ source, path: resolved });
  }
}

function resolveMeshPath() {
  const candidates = [];
  for (const key of envKeys) {
    addCandidate(candidates, key, process.env[key]);
  }

  addCandidate(candidates, 'repo checkout', '${DEFAULT_MESH_CHECKOUT_PATH}');
  addCandidate(
    candidates,
    'manifest',
    readManifestValue('mesh_checkout_path') || readManifestValue('mesh_path')
  );

  const seen = new Set();
  const checked = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.path)) { continue; }
    seen.add(candidate.path);
    checked.push(candidate);
    if (isGovernanceMesh(candidate.path)) {
      return { resolved: candidate, checked };
    }
  }

  return { resolved: null, checked };
}

const result = resolveMeshPath();
if (!result.resolved) {
  process.stderr.write('[Red Queen] Unable to resolve governance mesh.\\n');
  process.stderr.write('[Red Queen] Tried:\\n');
  for (const candidate of result.checked) {
    process.stderr.write('  - ' + candidate.source + ': ' + candidate.path + '\\n');
  }
  process.stderr.write('[Red Queen] Set RED_QUEEN_MESH_PATH or checkout the mesh to ./governance-mesh.\\n');
  process.exit(1);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = [
  '-y',
  '@maintainabilityai/redqueen-mcp',
  '--mesh-path',
  result.resolved.path,
  ...process.argv.slice(2),
];

const child = spawn(command, args, {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, RED_QUEEN_MESH_PATH: result.resolved.path },
});

child.on('error', (err) => {
  process.stderr.write('[Red Queen] Failed to start MCP server: ' + err.message + '\\n');
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code === null ? 1 : code);
});
`;
}

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
  } : undefined, tier);
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
  const candidatePaths = [
    // src/mcp/config-scaffold.ts → up three to vscode-extension/
    path.join(__dirname, '..', '..', 'code-templates', 'agents', 'implementation-agent.agent.md'),
    // dist/extension.js → up one
    path.join(__dirname, '..', 'code-templates', 'agents', 'implementation-agent.agent.md'),
    // dist/ deep nesting (defensive)
    path.join(__dirname, '..', '..', '..', 'code-templates', 'agents', 'implementation-agent.agent.md'),
  ];
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch { /* try next */ }
  }
  return null;
}

export function writeScaffoldFiles(outputDir: string, files: Record<string, string>): number {
  let written = 0;
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(outputDir, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
    fs.writeFileSync(fullPath, content, 'utf8');
    if (
      filePath === '.redqueen/mcp-runner.js' ||
      filePath === '.redqueen/hooks/validate-tool.sh' ||
      filePath === '.redqueen/hooks/validate-tool.js'
    ) {
      fs.chmodSync(fullPath, 0o755);
    }
    written++;
  }
  return written;
}

function readManifestValue(manifest: string, key: string): string | undefined {
  const prefix = `${key}:`;
  for (const line of manifest.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim().replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

function resolveRepoRelativePath(repoPath: string, value: string | undefined): string | undefined {
  if (!value) { return undefined; }
  const cleaned = value.trim().replace(/^["']|["']$/g, '');
  if (!cleaned) { return undefined; }
  return path.isAbsolute(cleaned) ? cleaned : path.resolve(repoPath, cleaned);
}

function resolveScaffoldMeshPath(repoPath: string): { path?: string; source?: string; checked: Array<{ source: string; path: string }> } {
  const candidates: Array<{ source: string; value?: string }> = [
    { source: 'RED_QUEEN_MESH_PATH', value: process.env.RED_QUEEN_MESH_PATH },
    { source: 'GOVERNANCE_MESH_PATH', value: process.env.GOVERNANCE_MESH_PATH },
    { source: 'MESH_PATH', value: process.env.MESH_PATH },
    { source: 'repo checkout', value: DEFAULT_MESH_CHECKOUT_PATH },
  ];

  const manifestPath = path.join(repoPath, '.redqueen/config-manifest.yaml');
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    candidates.push({
      source: 'manifest',
      value: readManifestValue(manifest, 'mesh_checkout_path') || readManifestValue(manifest, 'mesh_path'),
    });
  }

  const checked: Array<{ source: string; path: string }> = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const resolved = resolveRepoRelativePath(repoPath, candidate.value);
    if (!resolved || seen.has(resolved)) { continue; }
    seen.add(resolved);
    checked.push({ source: candidate.source, path: resolved });
    if (fs.existsSync(path.join(resolved, 'mesh.yaml'))) {
      return { path: resolved, source: candidate.source, checked };
    }
  }

  return { checked };
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
    '.mcp.json',
    '.claude/settings.json',
    'AGENTS.md',
    '.redqueen/decision.json',
    '.redqueen/policy.json',
    '.redqueen/mcp-runner.js',
    '.redqueen/hooks/validate-tool.js',
    '.redqueen/hooks/validate-tool.sh',
    '.github/hooks/redqueen.json',
    '.github/workflows/redqueen-review.yml',
    '.redqueen/consensus.js',
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

  const runnerPath = path.join(repoPath, '.redqueen/mcp-runner.js');
  if (fs.existsSync(runnerPath)) {
    const runner = fs.readFileSync(runnerPath, 'utf8');
    if (!runner.includes('@maintainabilityai/redqueen-mcp') || !runner.includes('RED_QUEEN_MESH_PATH')) {
      add('error', 'MCP runner must launch @maintainabilityai/redqueen-mcp and resolve RED_QUEEN_MESH_PATH.', '.redqueen/mcp-runner.js');
    }
  }

  const mcp = readJson('.mcp.json') as {
    mcpServers?: { redqueen?: { command?: string; args?: string[]; env?: Record<string, string> } };
  } | null;
  const redqueen = mcp?.mcpServers?.redqueen;
  if (redqueen) {
    const args = redqueen.args || [];
    const usesRunner = redqueen.command === 'node' && args.includes('.redqueen/mcp-runner.js');
    if (!usesRunner) {
      add('error', 'MCP config must launch the repo-local .redqueen/mcp-runner.js.', '.mcp.json');
    }
  }

  const meshResolution = resolveScaffoldMeshPath(repoPath);
  if (!meshResolution.path) {
    const tried = meshResolution.checked.map(c => `${c.source}: ${c.path}`).join('; ');
    add(
      'error',
      `Unable to resolve governance mesh for MCP runner. Set RED_QUEEN_MESH_PATH or checkout the mesh to ${DEFAULT_MESH_CHECKOUT_PATH}. Tried: ${tried || 'no paths'}.`,
      '.redqueen/mcp-runner.js',
    );
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
    if (!readManifestValue(manifest, 'mesh_checkout_path')) {
      add('warning', 'Config manifest does not declare mesh_checkout_path for portable MCP resolution.', '.redqueen/config-manifest.yaml');
    }
    for (const relativePath of ['.mcp.json', '.redqueen/mcp-runner.js', '.claude/settings.json', '.github/hooks/redqueen.json']) {
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

function generateImplementationWorkflow(
  agentType: 'claude' | 'copilot' | 'both',
  meshRepo: string,
  tier: GovernanceTier,
): string {
  const lines: string[] = [];

  lines.push('# Red Queen Implementation Workflow');
  lines.push('# Auto-generated by The Red Queen — do not edit manually');
  lines.push(`# Agent framework: ${agentType}`);
  lines.push('# Triggered when an issue is labeled "implement", "claude-code", or "copilot"');
  lines.push('');
  lines.push('name: Red Queen Implement');
  lines.push('');
  lines.push('on:');
  lines.push('  issues:');
  lines.push('    types: [labeled]');
  lines.push('');
  lines.push('permissions:');
  lines.push('  contents: write');
  lines.push('  issues: write');
  lines.push('  pull-requests: write');
  lines.push('  id-token: write');
  lines.push('');
  lines.push('jobs:');
  lines.push('  implement:');
  lines.push('    runs-on: ubuntu-latest');
  lines.push(`    if: github.event.label.name == 'implement' || github.event.label.name == 'claude-code' || github.event.label.name == 'copilot'`);
  lines.push('    steps:');

  // Step 1: Checkout code + governance mesh
  lines.push('      - name: Checkout code');
  lines.push('        uses: actions/checkout@v4');
  lines.push('        with:');
  lines.push('          fetch-depth: 0');
  lines.push('          token: ${{ secrets.GITHUB_TOKEN }}');
  lines.push('');
  lines.push('      - name: Checkout governance mesh');
  lines.push('        uses: actions/checkout@v4');
  lines.push('        with:');
  lines.push(`          repository: ${meshRepo}`);
  lines.push('          path: governance-mesh');
  lines.push('          token: ${{ secrets.GOVERNANCE_MESH_TOKEN }}');
  lines.push('');

  // Step 2: Configure git
  lines.push('      - name: Configure Git');
  lines.push('        run: |');
  lines.push('          git config user.name "claude-code[bot]"');
  lines.push('          git config user.email "claude-code[bot]@users.noreply.github.com"');
  lines.push('');

  // Step 3: Read governance context
  lines.push('      - name: Read governance context');
  lines.push('        id: governance');
  lines.push('        run: |');
  lines.push(`          TIER="${tier}"`);
  lines.push('          if [ -f .redqueen/decision.json ]; then');
  lines.push('            TIER=$(node -e "console.log(JSON.parse(require(\'fs\').readFileSync(\'.redqueen/decision.json\',\'utf8\')).effectiveTier)")');
  lines.push('          fi');
  lines.push('          echo "tier=$TIER" >> $GITHUB_OUTPUT');
  lines.push('');

  // Step 4: Implementation step (agent-specific)
  if (agentType === 'claude' || agentType === 'both') {
    lines.push('      - name: Claude Code Implementation');
    lines.push('        uses: anthropics/claude-code-action@v1');
    lines.push('        with:');
    lines.push('          model: claude-sonnet-4-6');
    lines.push('          direct_prompt: |');
    lines.push('            You are implementing a feature/fix governed by The Red Queen governance system.');
    lines.push('');
    lines.push('            ## Governance Context');
    lines.push('            Read `.redqueen/governance-context.md` for governance constraints.');
    lines.push('            Read `.redqueen/decision.json` for the orchestration decision.');
    lines.push(`            Your effective tier is: \${{ steps.governance.outputs.tier }}`);
    lines.push('');
    lines.push('            ## Issue Details');
    lines.push('            Issue #${{ github.event.issue.number }}: ${{ github.event.issue.title }}');
    lines.push('            ${{ github.event.issue.body }}');
    lines.push('');
    lines.push('            ## Instructions');
    lines.push('            1. Read the issue requirements carefully');
    lines.push('            2. Create a branch: `implement/issue-${{ github.event.issue.number }}`');
    lines.push('            3. Implement the changes following governance constraints');
    lines.push('            4. Run tests if available');
    lines.push('            5. Commit with AI disclosure label');
    lines.push('            6. Push and create a PR referencing the issue');
    lines.push('          allowed_tools: "Bash(git:*),Bash(npm:*),Bash(npx:*),Bash(gh:*),Read,Edit,Write,Glob,Grep"');
    lines.push('          mcp_config: .mcp.json');
    lines.push('        env:');
    lines.push('          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}');
    lines.push('');
  }

  if (agentType === 'copilot' || agentType === 'both') {
    // GitHub Copilot Coding Agent is NOT invoked via a `uses:` action. It is
    // triggered by assigning an issue to the Copilot bot user; the agent then
    // runs in its own ephemeral GitHub Actions container using
    // .github/copilot-setup-steps.yml for environment setup.
    // Reference: https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
    const stepName = agentType === 'both' ? 'Assign issue to Copilot Coding Agent (parallel)' : 'Assign issue to Copilot Coding Agent';
    lines.push(`      - name: ${stepName}`);
    lines.push('        uses: actions/github-script@v7');
    lines.push('        with:');
    lines.push('          script: |');
    lines.push('            const issueNumber = context.payload.issue.number;');
    lines.push('            try {');
    lines.push('              await github.rest.issues.addAssignees({');
    lines.push('                owner: context.repo.owner,');
    lines.push('                repo: context.repo.repo,');
    lines.push('                issue_number: issueNumber,');
    lines.push('                assignees: ["Copilot"]');
    lines.push('              });');
    lines.push('              await github.rest.issues.createComment({');
    lines.push('                owner: context.repo.owner,');
    lines.push('                repo: context.repo.repo,');
    lines.push('                issue_number: issueNumber,');
    lines.push(`                body: 'Assigned to Copilot Coding Agent. The agent will pick this up in its own ephemeral GitHub Actions container and open a PR when ready.\\n\\nGovernance context: \`.redqueen/governance-context.md\`\\nOrchestration decision: \`.redqueen/decision.json\`'`);
    lines.push('              });');
    lines.push('            } catch (e) {');
    lines.push(`              core.setFailed('Failed to assign Copilot Coding Agent: ' + e.message + '. Verify Copilot Coding Agent is enabled at the org level and the Copilot user has repo access.');`);
    lines.push('            }');
    lines.push('');
  }

  // Step 5: Post summary comment
  lines.push('      - name: Post implementation summary');
  lines.push('        if: success()');
  lines.push('        uses: actions/github-script@v7');
  lines.push('        with:');
  lines.push('          script: |');
  lines.push('            const issueNumber = ${{ github.event.issue.number }};');
  lines.push('            await github.rest.issues.createComment({');
  lines.push('              owner: context.repo.owner,');
  lines.push('              repo: context.repo.repo,');
  lines.push('              issue_number: issueNumber,');
  lines.push(`              body: '## Red Queen Implementation Complete\\n\\nThe implementation workflow has finished. Check the PR for details.',`);
  lines.push('            });');
  lines.push('');

  return lines.join('\n') + '\n';
}

function generateCopilotSetupStepsGovernance(meshRepo: string): string {
  return `# Red Queen governance setup steps for Copilot coding agent
# Add these steps to your .github/copilot-setup-steps.yml

steps:
  - name: Checkout governance mesh
    uses: actions/checkout@v4
    with:
      repository: ${meshRepo}
      path: governance-mesh
      token: \${{ secrets.COPILOT_MCP_MESH_TOKEN }}

  - name: Start Red Queen MCP Server
    run: |
      node .redqueen/mcp-runner.js &
      sleep 2
`;
}

// ============================================================================
// Phase 7: Review Board generators
// ============================================================================

function generateSubagentDefinition(
  role: 'security-reviewer' | 'architecture-reviewer',
  agentType: 'claude' | 'copilot',
): string {
  if (role === 'security-reviewer') {
    return generateSecurityReviewerMd(agentType);
  }
  return generateArchitectureReviewerMd(agentType);
}

function generateSecurityReviewerMd(agent: string): string {
  return `# Security Reviewer Agent

You are a security review agent for **The Red Queen** governance system.

## Role

Perform a thorough security review of the pull request changes against the governance mesh constraints.

## Review Scope

1. **OWASP Top 10** — Check for injection, broken access control, cryptographic failures, insecure design, security misconfiguration, vulnerable components, authentication failures, integrity failures, logging failures, SSRF
2. **STRIDE Threats** — Analyze for Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege
3. **CALM Security Controls** — Verify changes align with declared security controls in the architecture model
4. **Secrets Exposure** — Check for hardcoded credentials, API keys, tokens, or sensitive data
5. **Dependency Vulnerabilities** — Flag new dependencies without lockfile pinning or known vulnerabilities

## Instructions

1. Read \`.redqueen/governance-context.md\` for the governance posture and constraints
2. Read \`.redqueen/decision.json\` for the orchestration decision (tier, permissions, prompt injections)
3. Review the PR diff thoroughly for security issues
4. Use the \`validate_action\` MCP tool for any structural changes you identify
5. Output your verdict as a structured JSON block

## Output Format

Write a JSON file to \`.redqueen/verdicts/${agent}-security.json\` with this structure:

\`\`\`json
{
  "reviewer": "${agent}-security",
  "agent": "${agent}",
  "scope": "security",
  "verdict": "approve | request-changes | deny",
  "confidence": 85,
  "findings": [
    {
      "id": "SEC-001",
      "category": "security",
      "severity": "high",
      "title": "Finding title",
      "description": "Detailed description",
      "location": "path/to/file.ts:42",
      "recommendation": "How to fix",
      "references": ["OWASP A03"]
    }
  ],
  "caveats": ["Any limitations of this review"],
  "summary": "One paragraph summary"
}
\`\`\`

## Decision Rules

- **deny**: Any critical finding OR 3+ high findings
- **request-changes**: Any high finding OR 3+ medium findings
- **approve**: Only low/info findings or no findings
`;
}

function generateArchitectureReviewerMd(agent: string): string {
  return `# Architecture Reviewer Agent

You are an architecture review agent for **The Red Queen** governance system.

## Role

Evaluate the pull request for architectural conformance against the CALM model and governance constraints.

## Review Scope

1. **CALM Model Conformance** — Verify changes align with declared nodes, relationships, and interfaces
2. **ADR Compliance** — Check that existing Architecture Decision Records are not violated
3. **Cross-BAR Interface Integrity** — Ensure changes to shared interfaces don't break contracts with linked BARs
4. **Fitness Function Alignment** — Verify new code doesn't violate declared fitness functions
5. **Evolutionary Architecture** — No big-bang changes; prefer incremental patterns

## Instructions

1. Read \`.redqueen/governance-context.md\` for the governance posture and constraints
2. Read \`.redqueen/decision.json\` for the orchestration decision (tier, permissions, linked BARs)
3. Review the PR diff for architectural conformance
4. Use the \`validate_calm\` MCP tool to check CALM model compliance
5. Use the \`get_adrs\` MCP tool to review relevant Architecture Decision Records
6. Output your verdict as a structured JSON block

## Output Format

Write a JSON file to \`.redqueen/verdicts/${agent}-architecture.json\` with this structure:

\`\`\`json
{
  "reviewer": "${agent}-architecture",
  "agent": "${agent}",
  "scope": "architecture",
  "verdict": "approve | request-changes | deny",
  "confidence": 85,
  "findings": [
    {
      "id": "ARCH-001",
      "category": "architecture",
      "severity": "high",
      "title": "Finding title",
      "description": "Detailed description",
      "location": "CALM node reference or file path",
      "recommendation": "How to fix",
      "references": ["ADR-001"]
    }
  ],
  "caveats": ["Any limitations of this review"],
  "summary": "One paragraph summary"
}
\`\`\`

## Decision Rules

- **deny**: Undeclared CALM connections, ADR violations, interface contract breaks
- **request-changes**: Missing fitness functions, incomplete interface declarations
- **approve**: Changes align with architecture model and decisions
`;
}

function generateReviewStep(
  agentType: 'claude' | 'copilot',
  scope: 'security' | 'architecture',
  meshRepo: string,
  stepId: string,
): string {
  const scopeLabel = scope === 'security' ? 'Security' : 'Architecture';
  const agentLabel = agentType === 'claude' ? 'Claude' : 'Copilot';
  const verdictFile = `.redqueen/verdicts/${agentType}-${scope}.json`;
  const instructionsFile = agentType === 'claude'
    ? `.claude/agents/${scope}-reviewer.md`
    : `.github/copilot-agents/${scope}-reviewer.md`;

  if (agentType === 'claude') {
    return `
      - name: "${agentLabel} ${scopeLabel} Review"
        id: ${stepId}
        if: steps.review-depth.outputs.run_${scope} == 'true'
        uses: anthropics/claude-code-action@v1
        with:
          model: claude-sonnet-4-6
          direct_prompt: |
            You are the ${scopeLabel} Reviewer for The Red Queen governance system.

            Read ${instructionsFile} for your full instructions.
            Read .redqueen/governance-context.md for the governance posture.
            Read .redqueen/decision.json for the orchestration decision.

            Review the PR diff and write your ReviewVerdict JSON to ${verdictFile}.
          allowed_tools: "Read,Write,Glob,Grep,Bash"
          mcp_config: .mcp.json
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}`;
  } else {
    // GitHub Copilot Coding Agent reviews are triggered by commenting on the PR
    // and assigning the Copilot bot, not by a workflow uses: step. The agent runs
    // in its own ephemeral container and writes verdict files via its own follow-up
    // actions. If the verdict file is missing when the consensus step runs, the
    // review fails closed.
    // Reference: https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
    return `
      - name: "${agentLabel} ${scopeLabel} Review (assignment)"
        id: ${stepId}
        if: steps.review-depth.outputs.run_${scope} == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const prNumber = context.payload.pull_request.number;
            const body = [
              'Copilot Coding Agent: please perform a ${scopeLabel} review of this PR as part of The Red Queen governance system.',
              '',
              'Reviewer instructions: ${instructionsFile}',
              'Governance posture: .redqueen/governance-context.md',
              'Orchestration decision: .redqueen/decision.json',
              '',
              'Write your ReviewVerdict JSON to ${verdictFile}.',
              'If the verdict file is missing when the consensus step runs, the review will fail closed.'
            ].join('\\n');
            try {
              await github.rest.issues.addAssignees({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                assignees: ["Copilot"]
              });
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body
              });
            } catch (e) {
              core.setFailed('Failed to assign Copilot Coding Agent for ${scope} review: ' + e.message + '. Verify Copilot Coding Agent is enabled and the Copilot user has repo access.');
            }`;
  }
}

function generateRedQueenReviewWorkflow(
  agentType: 'claude' | 'copilot' | 'both',
  meshRepo: string,
  _tier: GovernanceTier,
): string {
  const lines: string[] = [];

  lines.push(`# Red Queen Governance Review Workflow`);
  lines.push(`# Auto-generated by The Red Queen — do not edit manually`);
  lines.push(`# Agent framework: ${agentType}`);
  lines.push(`# Re-generate with: Deploy Gov from Looking Glass or scaffold_agent_config MCP tool`);
  lines.push(``);
  lines.push(`name: Red Queen Review`);
  lines.push(``);
  lines.push(`on:`);
  lines.push(`  pull_request:`);
  lines.push(`    types: [opened, synchronize, reopened]`);
  lines.push(``);
  lines.push(`permissions:`);
  lines.push(`  contents: read`);
  lines.push(`  pull-requests: write`);
  lines.push(`  issues: write`);
  lines.push(``);
  lines.push(`jobs:`);
  lines.push(`  redqueen-review:`);
  lines.push(`    runs-on: ubuntu-latest`);
  lines.push(`    steps:`);

  // Step 0: Checkout code + mesh
  lines.push(`      - name: Checkout code`);
  lines.push(`        uses: actions/checkout@v4`);
  lines.push(``);
  lines.push(`      - name: Checkout governance mesh`);
  lines.push(`        uses: actions/checkout@v4`);
  lines.push(`        with:`);
  lines.push(`          repository: ${meshRepo}`);
  lines.push(`          path: governance-mesh`);
  lines.push(`          token: \${{ secrets.GOVERNANCE_MESH_TOKEN }}`);
  lines.push(``);

  // Step 1: Start MCP server
  lines.push(`      - name: Start Red Queen MCP Server`);
  lines.push(`        run: |`);
  lines.push(`          node .redqueen/mcp-runner.js &`);
  lines.push(`          sleep 2`);
  lines.push(``);

  // Step 2: Determine review depth from decision.json
  lines.push(`      - name: Determine review depth`);
  lines.push(`        id: review-depth`);
  lines.push(`        run: |`);
  lines.push(`          if [ -f .redqueen/decision.json ]; then`);
  lines.push(`            TIER=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.redqueen/decision.json','utf8')).effectiveTier)")`);
  lines.push(`          else`);
  lines.push(`            TIER="supervised"`);
  lines.push(`          fi`);
  lines.push(`          echo "tier=$TIER" >> $GITHUB_OUTPUT`);
  lines.push(`          if [ "$TIER" = "autonomous" ]; then`);
  lines.push(`            echo "run_security=false" >> $GITHUB_OUTPUT`);
  lines.push(`            echo "run_architecture=false" >> $GITHUB_OUTPUT`);
  lines.push(`          elif [ "$TIER" = "supervised" ]; then`);
  lines.push(`            echo "run_security=true" >> $GITHUB_OUTPUT`);
  lines.push(`            echo "run_architecture=false" >> $GITHUB_OUTPUT`);
  lines.push(`          else`);
  lines.push(`            echo "run_security=true" >> $GITHUB_OUTPUT`);
  lines.push(`            echo "run_architecture=true" >> $GITHUB_OUTPUT`);
  lines.push(`          fi`);
  lines.push(`          mkdir -p .redqueen/verdicts`);
  lines.push(``);

  // Step 3+: Agent review steps based on agentType
  if (agentType === 'claude' || agentType === 'both') {
    lines.push(generateReviewStep('claude', 'security', meshRepo, 'claude-security'));
    lines.push(``);
    lines.push(generateReviewStep('claude', 'architecture', meshRepo, 'claude-architecture'));
    lines.push(``);
  }

  if (agentType === 'copilot' || agentType === 'both') {
    lines.push(generateReviewStep('copilot', 'security', meshRepo, 'copilot-security'));
    lines.push(``);
    lines.push(generateReviewStep('copilot', 'architecture', meshRepo, 'copilot-architecture'));
    lines.push(``);
  }

  // Consensus step
  lines.push(`      - name: Red Queen Consensus`);
  lines.push(`        id: consensus`);
  lines.push(`        if: always() && steps.review-depth.outputs.tier != 'autonomous'`);
  lines.push(`        run: node .redqueen/consensus.js`);
  lines.push(`        env:`);
  lines.push(`          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`);
  lines.push(`          PR_NUMBER: \${{ github.event.pull_request.number }}`);
  lines.push(``);

  // Post summary
  lines.push(`      - name: Post review summary`);
  lines.push(`        if: always() && steps.review-depth.outputs.tier != 'autonomous'`);
  lines.push(`        uses: actions/github-script@v7`);
  lines.push(`        with:`);
  lines.push(`          script: |`);
  lines.push(`            const fs = require('fs');`);
  lines.push(`            const consensusPath = '.redqueen/consensus-result.json';`);
  lines.push(`            if (!fs.existsSync(consensusPath)) {`);
  lines.push(`              console.log('No consensus result found — skipping comment');`);
  lines.push(`              return;`);
  lines.push(`            }`);
  lines.push(`            const result = JSON.parse(fs.readFileSync(consensusPath, 'utf8'));`);
  lines.push(`            const icon = result.finalVerdict === 'approve' ? '✅' : result.finalVerdict === 'deny' ? '❌' : '⚠️';`);
  lines.push(`            let body = \`## \${icon} Red Queen Review: \${result.finalVerdict}\\n\\n\`;`);
  lines.push(`            body += \`**Findings:** \${result.mergedFindings.length} | **Highest severity:** \${result.highestSeverity || 'none'}\\n\\n\`;`);
  lines.push(`            if (result.mergedFindings.length > 0) {`);
  lines.push(`              body += '| Severity | ID | Title | Location |\\n|---|---|---|---|\\n';`);
  lines.push(`              for (const f of result.mergedFindings) {`);
  lines.push(`                body += \`| \${f.severity} | \${f.id} | \${f.title} | \${f.location || '-'} |\\n\`;`);
  lines.push(`              }`);
  lines.push(`            }`);
  lines.push(`            if (result.reasoning.length > 0) {`);
  lines.push(`              body += '\\n**Reasoning:**\\n' + result.reasoning.map(r => \`- \${r}\`).join('\\n') + '\\n';`);
  lines.push(`            }`);
  lines.push(`            body += '\\n---\\n🔴 Generated by [The Red Queen](https://maintainability.ai) governance system';`);
  lines.push(`            await github.rest.issues.createComment({`);
  lines.push(`              owner: context.repo.owner,`);
  lines.push(`              repo: context.repo.repo,`);
  lines.push(`              issue_number: context.issue.number,`);
  lines.push(`              body,`);
  lines.push(`            });`);

  return lines.join('\n') + '\n';
}

function generateConsensusScript(): string {
  return `#!/usr/bin/env node
/**
 * Red Queen Consensus — deterministic merge of ReviewVerdict JSON files.
 *
 * Reads all verdict files from .redqueen/verdicts/, resolves consensus,
 * writes result to .redqueen/consensus-result.json.
 *
 * Exit code 0 = success (result written)
 * Exit code 1 = error
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SEVERITY_RANK = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };

function resolveConsensus(verdicts) {
  if (verdicts.length === 0) {
    return {
      finalVerdict: 'deny',
      verdicts: [],
      mergedFindings: [{
        id: 'RQ-REVIEW-001',
        category: 'governance',
        severity: 'high',
        title: 'Required review verdict missing',
        description: 'No reviewer produced a ReviewVerdict JSON file. Red Queen fails closed so missing agent output cannot approve a PR.',
        location: '.redqueen/verdicts/',
        recommendation: 'Re-run the Red Queen Review workflow and inspect the failed reviewer step.',
        references: ['Red Queen review board'],
      }],
      mergedCaveats: [],
      reasoning: ['No verdicts provided; failing closed'],
      requiresHumanReview: true,
      highestSeverity: 'high',
    };
  }

  const reasoning = [];
  let finalVerdict;

  const hasDeny = verdicts.some(v => v.verdict === 'deny');
  const hasRC = verdicts.some(v => v.verdict === 'request-changes');

  if (hasDeny) {
    finalVerdict = 'deny';
    reasoning.push('Deny: ' + verdicts.filter(v => v.verdict === 'deny').map(v => v.reviewer).join(', '));
  } else if (hasRC) {
    finalVerdict = 'request-changes';
    reasoning.push('Changes requested by: ' + verdicts.filter(v => v.verdict === 'request-changes').map(v => v.reviewer).join(', '));
  } else {
    finalVerdict = 'approve';
    reasoning.push('All reviewers approved');
  }

  // Merge findings by id (highest severity wins)
  const findingMap = new Map();
  for (const v of verdicts) {
    for (const f of (v.findings || [])) {
      const existing = findingMap.get(f.id);
      if (!existing || (SEVERITY_RANK[f.severity] || 0) > (SEVERITY_RANK[existing.severity] || 0)) {
        findingMap.set(f.id, f);
      }
    }
  }
  const mergedFindings = Array.from(findingMap.values())
    .sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0));

  const mergedCaveats = [...new Set(verdicts.flatMap(v => v.caveats || []))];

  let highestSeverity = null;
  for (const f of mergedFindings) {
    if (!highestSeverity || (SEVERITY_RANK[f.severity] || 0) > (SEVERITY_RANK[highestSeverity] || 0)) {
      highestSeverity = f.severity;
    }
  }

  const requiresHumanReview = finalVerdict !== 'approve' ||
    highestSeverity === 'critical' ||
    mergedFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length > 3;

  if (requiresHumanReview) {
    reasoning.push('Human review required');
  }

  return { finalVerdict, verdicts, mergedFindings, mergedCaveats, reasoning, requiresHumanReview, highestSeverity };
}

// Main
try {
  const verdictsDir = path.join(process.cwd(), '.redqueen', 'verdicts');
  const verdicts = [];

  if (fs.existsSync(verdictsDir)) {
    for (const file of fs.readdirSync(verdictsDir)) {
      if (file.endsWith('.json')) {
        try {
          verdicts.push(JSON.parse(fs.readFileSync(path.join(verdictsDir, file), 'utf8')));
        } catch (e) {
          console.error('[Red Queen] Failed to parse verdict: ' + file + ' — ' + e.message);
          verdicts.push({
            reviewer: 'redqueen-consensus',
            agent: 'deterministic',
            scope: 'governance',
            verdict: 'deny',
            confidence: 100,
            findings: [{
              id: 'RQ-REVIEW-002',
              category: 'governance',
              severity: 'high',
              title: 'Malformed review verdict',
              description: 'A reviewer verdict file could not be parsed as JSON: ' + file,
              location: path.join('.redqueen', 'verdicts', file),
              recommendation: 'Fix the reviewer output format and rerun the workflow.',
              references: ['Red Queen ReviewVerdict schema'],
            }],
            caveats: [],
            summary: 'Malformed reviewer verdict failed closed.',
          });
        }
      }
    }
  }

  const result = resolveConsensus(verdicts);
  fs.writeFileSync(
    path.join(process.cwd(), '.redqueen', 'consensus-result.json'),
    JSON.stringify(result, null, 2),
  );

  console.log('[Red Queen] Consensus: ' + result.finalVerdict +
    ' (' + result.mergedFindings.length + ' findings, ' +
    verdicts.length + ' verdicts)');

  if (result.finalVerdict === 'deny' || result.finalVerdict === 'request-changes') {
    process.exit(1);
  }
} catch (err) {
  console.error('[Red Queen] Consensus error: ' + err.message);
  process.exit(1);
}
`;
}

// ============================================================================
// Main scaffold function
// ============================================================================

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

  const meshPath = reader.path;
  const files: Record<string, string> = {};

  // Check for custom templates in .redqueen/ within the mesh
  const customMcpTemplate = reader.readMeshFile('.redqueen/mcp-config.template.json');

  // Generate files — use policy-driven generators when available
  files['.mcp.json'] = generateMcpJson(meshPath, customMcpTemplate || undefined);
  files['.redqueen/mcp-runner.js'] = generateMcpRunnerJs();

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

  // Read mesh portfolio config for the org/repo reference
  const portfolio = reader.readPortfolioConfig();
  if (portfolio) {
    // Resolve mesh repo: explicit repo field → detect from git remote → fallback to org/governance-mesh
    let meshRepo = `${portfolio.org}/governance-mesh`;
    if (portfolio.repo) {
      // If repo field contains a slash, use as-is; otherwise prepend org
      meshRepo = portfolio.repo.includes('/') ? portfolio.repo : `${portfolio.org}/${portfolio.repo}`;
    } else {
      // Try to detect from git remote — only if meshPath is a standalone git repo
      if (fs.existsSync(path.join(meshPath, '.git'))) {
        try {
          const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: meshPath, encoding: 'utf8' }).toString().trim();
          const parsed = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+)/);
          if (parsed) { meshRepo = parsed[1]; }
        } catch { /* git not available or no remote */ }
      }
    }
    files['.github/copilot-governance-steps.yml'] = generateCopilotSetupStepsGovernance(meshRepo);

    // Phase 7: Review workflow + subagent definitions (when agentType is configured)
    const agentType = portfolio.agentType;
    if (agentType) {
      files['.github/workflows/redqueen-review.yml'] = generateRedQueenReviewWorkflow(agentType, meshRepo, tier);
      files['.redqueen/consensus.js'] = generateConsensusScript();

      // Subagent definitions for Claude agents
      if (agentType === 'claude' || agentType === 'both') {
        files['.claude/agents/security-reviewer.md'] = generateSubagentDefinition('security-reviewer', 'claude');
        files['.claude/agents/architecture-reviewer.md'] = generateSubagentDefinition('architecture-reviewer', 'claude');
      }
      // Copilot-specific reviewer definitions use separate paths so "both"
      // never makes Copilot inherit Claude verdict filenames or metadata.
      if (agentType === 'copilot' || agentType === 'both') {
        files['.github/copilot-agents/security-reviewer.md'] = generateSubagentDefinition('security-reviewer', 'copilot');
        files['.github/copilot-agents/architecture-reviewer.md'] = generateSubagentDefinition('architecture-reviewer', 'copilot');
      }

      // Phase 8: Implementation workflow (issue → branch → PR)
      files['.github/workflows/redqueen-implement.yml'] = generateImplementationWorkflow(agentType, meshRepo, tier);
    }
  }

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

  return { barName: bar.name, barId: bar.id, tier, decision, files, manifest };
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
