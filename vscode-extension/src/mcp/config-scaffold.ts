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
  lines.push(`          RESULT=$(cat "$EVENTS" | npx -y @maintainabilityai/research-runner@~0.1.42 skill-audit-verify-chain 2>&1 || true)`);
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
  lines.push(`        run: |`);
  lines.push(`          python3 <<'PYEOF'`);
  lines.push(`          import json, os, glob, hashlib`);
  lines.push(`          path = '.redqueen/audit-log.jsonl'`);
  lines.push(`          present = os.path.exists(path)`);
  lines.push(`          allowed = denied = 0`);
  lines.push(`          log_sha = None`);
  lines.push(`          if present:`);
  lines.push(`              # Tier 2.5a — recompute the digest of the committed decision log`);
  lines.push(`              # over the RAW bytes (same as the runner signs) so we can compare`);
  lines.push(`              # it to the signed log_sha256 carried in the redqueen_decisions event.`);
  lines.push(`              with open(path, 'rb') as bf:`);
  lines.push(`                  log_sha = hashlib.sha256(bf.read()).hexdigest()`);
  lines.push(`              with open(path, 'r', encoding='utf-8') as f:`);
  lines.push(`                  for line in f:`);
  lines.push(`                      line = line.strip()`);
  lines.push(`                      if not line: continue`);
  lines.push(`                      try:`);
  lines.push(`                          e = json.loads(line)`);
  lines.push(`                      except Exception:`);
  lines.push(`                          continue`);
  lines.push(`                      verdict = ((e.get('payload') or {}).get('verdict')) or e.get('verdict')`);
  lines.push(`                      if verdict == 'allow': allowed += 1`);
  lines.push(`                      elif verdict == 'deny': denied += 1`);
  lines.push(`          # Tier 2.5a — scan the signed IMPL chain for the rolled-up`);
  lines.push(`          # redqueen_decisions digest event the runner emits as the agent's`);
  lines.push(`          # FINAL governed action. signed = the event exists at all; digest`);
  lines.push(`          # match = the signed payload.log_sha256 equals the recomputed digest`);
  lines.push(`          # of the committed log. Both ADVISORY (back-compat: absent on older`);
  lines.push(`          # runners that predate the audit-sign-redqueen-decisions skill).`);
  lines.push(`          signed = False`);
  lines.push(`          digest_match = False`);
  lines.push(`          signed_sha = None`);
  lines.push(`          for ev_path in glob.glob('.maintainability/audit/events/*.jsonl'):`);
  lines.push(`              try:`);
  lines.push(`                  with open(ev_path, 'r', encoding='utf-8') as ef:`);
  lines.push(`                      for line in ef:`);
  lines.push(`                          line = line.strip()`);
  lines.push(`                          if not line: continue`);
  lines.push(`                          try:`);
  lines.push(`                              ev = json.loads(line)`);
  lines.push(`                          except Exception:`);
  lines.push(`                              continue`);
  lines.push(`                          if ev.get('event_kind') != 'redqueen_decisions': continue`);
  lines.push(`                          signed = True`);
  lines.push(`                          signed_sha = (ev.get('payload') or {}).get('log_sha256')`);
  lines.push(`              except Exception:`);
  lines.push(`                  continue`);
  lines.push(`          if signed and signed_sha is not None and log_sha is not None:`);
  lines.push(`              digest_match = (signed_sha == log_sha)`);
  lines.push(`          out = os.environ['GITHUB_OUTPUT']`);
  lines.push(`          with open(out, 'a', encoding='utf-8') as gh:`);
  lines.push(`              gh.write('rq_present=' + ('true' if present else 'false') + '\\n')`);
  lines.push(`              gh.write('rq_allowed=' + str(allowed) + '\\n')`);
  lines.push(`              gh.write('rq_denied=' + str(denied) + '\\n')`);
  lines.push(`              gh.write('rq_signed=' + ('true' if signed else 'false') + '\\n')`);
  lines.push(`              gh.write('rq_digest_match=' + ('true' if digest_match else 'false') + '\\n')`);
  lines.push(`          print('red queen decisions: allowed=%d denied=%d present=%s signed=%s digest_match=%s' % (allowed, denied, present, signed, digest_match))`);
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
  lines.push(`            const pass = chainOk && manifestOk && hatterOk;`);
  lines.push(`            const row = (label, ok, detail) => \`| \${ok ? '✅' : '❌'} | \${label} | \${detail} |\`;`);
  lines.push(`            let bodyMd = \`## \${pass ? '✅' : '❌'} Implementation provenance\\n\\n\`;`);
  lines.push(`            bodyMd += '| | Check | Detail |\\n|---|---|---|\\n';`);
  lines.push(`            bodyMd += row('Signed audit chain', chainOk, chainReason) + '\\n';`);
  lines.push(`            bodyMd += row('Skill manifest (knowledge-code + self-review-impl)', manifestOk, manifestOk ? 'all present' : ('missing: ' + missing)) + '\\n';`);
  lines.push(`            bodyMd += row('Hatter Tag continuation', hatterOk, hatterReason) + '\\n';`);
  lines.push(`            const rqPresent = '\${{ steps.redqueen.outputs.rq_present }}' === 'true';`);
  lines.push(`            const rqAllowed = '\${{ steps.redqueen.outputs.rq_allowed }}';`);
  lines.push(`            const rqDenied = '\${{ steps.redqueen.outputs.rq_denied }}';`);
  lines.push(`            const rqSigned = '\${{ steps.redqueen.outputs.rq_signed }}' === 'true';`);
  lines.push(`            const rqDigestMatch = '\${{ steps.redqueen.outputs.rq_digest_match }}' === 'true';`);
  lines.push(`            // Tier 2.5a — advisory status: signed digest (with match icon) when`);
  lines.push(`            // the runner signed the Red Queen chain, else unsigned (upgrade pending).`);
  lines.push(`            const rqDetail = rqSigned`);
  lines.push(`              ? ('signed · digest ' + (rqDigestMatch ? '✓' : '✗ (mismatch)') + ' · ' + rqAllowed + ' allowed / ' + rqDenied + ' denied')`);
  lines.push(`              : (rqPresent ? (rqAllowed + ' allowed / ' + rqDenied + ' denied · unsigned (runner upgrade pending)') : 'no .redqueen/audit-log.jsonl committed (advisory — not gated)');`);
  lines.push(`            bodyMd += \`| \${rqPresent ? 'ℹ️' : '➖'} | Red Queen decisions (advisory) | \${rqDetail} |\\n\`;`);
  lines.push(`            bodyMd += '\\n---\\n🔴 Generated by [The Red Queen](https://maintainability.ai) — implementation provenance gate';`);
  lines.push(`            await github.rest.issues.createComment({ owner: context.repo.owner, repo: context.repo.repo, issue_number: context.issue.number, body: bodyMd });`);
  lines.push(`            if (!pass) { core.setFailed('Implementation provenance failed — see the PR comment. The impl run was not governed (signed chain / skill manifest / Hatter Tag incomplete).'); }`);

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
 * Builds the `docs/code-design-spec.md` seed for a greenfield fan-out scaffold.
 *
 * Grounding fix (post-audit of celeb-api PR #8): the impl design is FROZEN at
 * WHAT dispatch, so the implementation agent should ground against a local
 * snapshot — not a live mesh fetch it can't perform (the Copilot cloud sandbox
 * has no read token for the private governance-mesh repo).
 *
 * When the mesh-local canonical `code-design.md` is readable at scaffold time
 * (`codeDesignMd` non-null), its FULL content is INLINED so the agent reads
 * the binding contract locally. The doc is a shared multi-repo artifact: the
 * agent's per-repo slices are the H3 sub-blocks naming its repo across §1
 * (structure), §2 (API contract — binding; the provenance gate diffs the
 * agent's exposed contract against it), §3 (models), §4 (auth); §5–§10 are
 * shared. Sibling sub-blocks are kept for cross-repo contract coordination.
 *
 * When the mesh file is NOT readable (`codeDesignMd` null — scaffold not
 * launched from a real mesh fan-out, or the artifact is missing), falls back
 * to the pointer + checklist stub so the run is still unblocked.
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
    `_Seeded by Cheshire greenfield scaffold for OKR \`${okrContext.okrId}\`._`,
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
      'dispatch and snapshotted into this repo at scaffold time, so you ground',
      'against it **locally** (no mesh-repo access required). The design is a',
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
  okrContext?: ScaffoldOkrContextLite,
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
  // Non-fatal warnings surfaced to the caller (e.g. the greenfield
  // code-design seed could not be grounded from the mesh).
  const warnings: string[] = [];

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

  // Grounding fix — seed docs/code-design-spec.md when the scaffold was
  // launched from a greenfield fan-out (okrContext present). The fan-out
  // engine has the mesh checked out locally, so we read the canonical
  // code-design.md from the mesh clone and INLINE it (frozen-design
  // snapshot) — the impl agent grounds locally without a mesh-repo read
  // token (the Copilot cloud sandbox has none). Falls back to a pointer
  // stub if the mesh artifact isn't readable at scaffold time.
  if (okrContext) {
    const codeDesignMd = reader.readMeshFile(`okrs/${okrContext.okrId}/what/code-design.md`);
    // Fail loud: a null/empty read means the canonical design wasn't
    // grounded, so buildCodeDesignSeed falls back to a POINTER STUB and
    // the impl agent ships ungrounded. The usual cause is the mesh path
    // resolving to the wrong workspace (greenfield fan-out runs in the
    // target-repo workspace — see ScaffoldOkrContext.meshPath). Push a
    // warning so the caller can surface it; the scaffold still completes.
    if (!codeDesignMd || codeDesignMd.trim().length === 0) {
      warnings.push(
        `Grounding: could not read okrs/${okrContext.okrId}/what/code-design.md from mesh at "${reader.path}" — code-design-spec.md fell back to a pointer stub (impl agent will NOT be grounded). Check the mesh path.`,
      );
    }
    files['docs/code-design-spec.md'] = buildCodeDesignSeed(okrContext, codeDesignMd);
  }

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
