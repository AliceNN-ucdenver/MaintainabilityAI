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
import { MeshReader } from '../core/mesh-reader';
import { generateStaticPolicy } from './policy-engine';
import type { BarSummary } from '../types';
import type { RedQueenService } from '../services/RedQueenService';
import type { OrchestrationDecision } from '../types/redqueen';

// ============================================================================
// Types
// ============================================================================

export type GovernanceTier = 'autonomous' | 'supervised' | 'restricted';

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

// ============================================================================
// Tier calculation
// ============================================================================

export function computeTier(bar: BarSummary): GovernanceTier {
  // Per-pillar override: any pillar < 50 forces restricted
  const pillars = [bar.architecture, bar.security, bar.infoRisk, bar.operations];
  if (pillars.some(p => p.score < 50)) { return 'restricted'; }

  if (bar.compositeScore >= 80) { return 'autonomous'; }
  if (bar.compositeScore >= 50) { return 'supervised'; }
  return 'restricted';
}

// ============================================================================
// File generators
// ============================================================================

function generateMcpJson(meshPath: string, customTemplate?: string): string {
  // If the mesh has a custom template, use it
  if (customTemplate) {
    return customTemplate.replace(/\{\{MESH_PATH\}\}/g, meshPath);
  }

  // Default template — uses npx for portability, env var for mesh path
  return JSON.stringify({
    mcpServers: {
      redqueen: {
        command: 'npx',
        args: ['-y', '@maintainabilityai/redqueen-mcp'],
        env: {
          MESH_PATH: '${GOVERNANCE_MESH_PATH:-./governance-mesh}',
        },
      },
    },
  }, null, 2) + '\n';
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
              command: './.redqueen/hooks/validate-tool.sh',
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
 * Exit code 0 + JSON stdout = allow/deny decision
 * Exit code 2 = block (stderr shown to agent)
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
    process.stdout.write(JSON.stringify(decision));
    process.exit(0);
  } catch (err) {
    // On error, allow (fail-open for hooks)
    process.stderr.write('[Red Queen] Hook error: ' + err.message + '\\n');
    process.exit(0);
  }
});

function validate(input) {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Skip validation for read-only tools
  const readOnlyTools = ['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Agent'];
  if (readOnlyTools.includes(toolName)) {
    return { hookSpecificOutput: { hookEventName: 'PreToolUse' } };
  }

  // Load policy.json
  const policyPath = path.join(process.cwd(), '.redqueen', 'policy.json');
  if (!fs.existsSync(policyPath)) {
    // No policy file — allow (advisory mode)
    return { hookSpecificOutput: { hookEventName: 'PreToolUse' } };
  }

  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const tier = policy.tier;
  const rules = policy.rules || {};

  // Check tool restrictions for this tier
  const tierRules = rules.toolRestrictions && rules.toolRestrictions[tier];
  if (tierRules) {
    if (tierRules.deny && tierRules.deny.includes(toolName)) {
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            '[Red Queen] Tool "' + toolName + '" is denied for ' + tier +
            '-tier BARs (score: ' + policy.compositeScore + '/100). ' +
            'Improve governance scores or get approval first.',
        },
      };
    }
  }

  // Check file path restrictions
  const filePath = toolInput.file_path || toolInput.command || '';
  if (filePath && rules.readOnlyPaths) {
    for (const pattern of rules.readOnlyPaths) {
      if (matchGlob(filePath, pattern)) {
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason:
              '[Red Queen] File "' + filePath + '" is governance-managed (read-only). ' +
              'Re-run scaffold_agent_config to update.',
          },
        };
      }
    }
  }

  // Check security-critical paths for restricted tier
  if (tier === 'restricted' && filePath && rules.securityCriticalPaths) {
    for (const pattern of rules.securityCriticalPaths) {
      if (matchGlob(filePath, pattern)) {
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason:
              '[Red Queen] File "' + filePath + '" is security-critical and cannot be ' +
              'modified by restricted-tier agents.',
          },
        };
      }
    }
  }

  // Allow
  return { hookSpecificOutput: { hookEventName: 'PreToolUse' } };
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

function generatePolicyJson(bar: BarSummary): string {
  const policy = generateStaticPolicy(bar);
  return JSON.stringify(policy, null, 2) + '\n';
}

function generateCopilotHooksJson(tier: GovernanceTier): string {
  const matchers: Record<GovernanceTier, string[]> = {
    autonomous: ['file_edit', 'terminal_command'],
    supervised: ['file_edit', 'terminal_command'],
    restricted: ['file_edit', 'terminal_command', 'file_read'],
  };

  return JSON.stringify({
    hooks: [
      {
        type: 'preToolUse',
        tools: matchers[tier],
        script: './.redqueen/hooks/validate-tool.sh',
      },
    ],
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

function generateImplementationWorkflow(
  agentType: 'claude' | 'copilot' | 'both',
  meshRepo: string,
  tier: GovernanceTier,
): string {
  const lines: string[] = [];

  lines.push('# Red Queen Implementation Workflow');
  lines.push('# Auto-generated by The Red Queen — do not edit manually');
  lines.push(`# Agent framework: ${agentType}`);
  lines.push('# Triggered when an issue is labeled "implement" or "claude-code"');
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
  lines.push(`    if: github.event.label.name == 'implement' || github.event.label.name == 'claude-code'`);
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
    const stepName = agentType === 'both' ? 'Copilot Implementation (parallel)' : 'Copilot Implementation';
    lines.push(`      - name: ${stepName}`);
    lines.push('        uses: github/copilot-coding-agent@v1');
    lines.push('        with:');
    lines.push('          instructions: |');
    lines.push('            You are implementing a feature/fix governed by The Red Queen governance system.');
    lines.push('');
    lines.push('            Read `.redqueen/governance-context.md` for governance constraints.');
    lines.push('            Read `.redqueen/decision.json` for the orchestration decision.');
    lines.push('');
    lines.push('            Issue #${{ github.event.issue.number }}: ${{ github.event.issue.title }}');
    lines.push('            ${{ github.event.issue.body }}');
    lines.push('');
    lines.push('            Implement the changes, run tests, commit with AI label, push, and create a PR.');
    lines.push('          mcp_config: .mcp.json');
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
      npx @maintainabilityai/redqueen-mcp --mesh-path \${{ github.workspace }}/governance-mesh &
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

            Read .claude/agents/${scope}-reviewer.md for your full instructions.
            Read .redqueen/governance-context.md for the governance posture.
            Read .redqueen/decision.json for the orchestration decision.

            Review the PR diff and write your ReviewVerdict JSON to ${verdictFile}.
          allowed_tools: "Read,Write,Glob,Grep,Bash"
          mcp_config: .mcp.json
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}`;
  } else {
    return `
      - name: "${agentLabel} ${scopeLabel} Review"
        id: ${stepId}
        if: steps.review-depth.outputs.run_${scope} == 'true'
        uses: github/copilot-coding-agent@v1
        with:
          instructions: |
            You are the ${scopeLabel} Reviewer for The Red Queen governance system.

            Read .claude/agents/${scope}-reviewer.md for your full instructions.
            Read .redqueen/governance-context.md for the governance posture.
            Read .redqueen/decision.json for the orchestration decision.

            Review the PR diff and write your ReviewVerdict JSON to ${verdictFile}.
          mcp_config: .mcp.json`;
  }
}

function generateRedQueenReviewWorkflow(
  agentType: 'claude' | 'copilot' | 'both',
  meshRepo: string,
  tier: GovernanceTier,
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
  lines.push(`          npx @maintainabilityai/redqueen-mcp --mesh-path \${{ github.workspace }}/governance-mesh &`);
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
  lines.push(`        if: steps.review-depth.outputs.tier != 'autonomous'`);
  lines.push(`        run: node .redqueen/consensus.js`);
  lines.push(`        env:`);
  lines.push(`          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`);
  lines.push(`          PR_NUMBER: \${{ github.event.pull_request.number }}`);
  lines.push(``);

  // Post summary
  lines.push(`      - name: Post review summary`);
  lines.push(`        if: steps.review-depth.outputs.tier != 'autonomous'`);
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
      finalVerdict: 'approve',
      verdicts: [],
      mergedFindings: [],
      mergedCaveats: [],
      reasoning: ['No verdicts provided'],
      requiresHumanReview: false,
      highestSeverity: null,
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

  const requiresHumanReview = finalVerdict === 'deny' ||
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

  if (result.finalVerdict === 'deny') {
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
  files['.redqueen/policy.json'] = generatePolicyJson(bar);
  files['.github/hooks/redqueen.json'] = generateCopilotHooksJson(tier);

  // Read mesh portfolio config for the org/repo reference
  const portfolio = reader.readPortfolioConfig();
  if (portfolio) {
    // Resolve mesh repo: explicit repo field → detect from git remote → fallback to org/governance-mesh
    let meshRepo: string;
    if (portfolio.repo) {
      // If repo field contains a slash, use as-is; otherwise prepend org
      meshRepo = portfolio.repo.includes('/') ? portfolio.repo : `${portfolio.org}/${portfolio.repo}`;
    } else {
      // Try to detect from git remote — only if meshPath is a standalone git repo
      let detected = false;
      if (fs.existsSync(path.join(meshPath, '.git'))) {
        try {
          const { execFileSync } = require('child_process');
          const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: meshPath, encoding: 'utf8' }).trim();
          const parsed = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+)/);
          if (parsed) { meshRepo = parsed[1]; detected = true; }
        } catch { /* git not available or no remote */ }
      }
      if (!detected) {
        meshRepo = `${portfolio.org}/governance-mesh`;
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
      // Copilot-specific subagent definitions (when "both", Copilot gets separate copies)
      if (agentType === 'copilot') {
        files['.claude/agents/security-reviewer.md'] = generateSubagentDefinition('security-reviewer', 'copilot');
        files['.claude/agents/architecture-reviewer.md'] = generateSubagentDefinition('architecture-reviewer', 'copilot');
      }

      // Phase 8: Implementation workflow (issue → branch → PR)
      if (agentType === 'claude' || agentType === 'both') {
        files['.github/workflows/redqueen-implement.yml'] = generateImplementationWorkflow(agentType, meshRepo, tier);
      }
    }
  }

  // Generate config manifest with SHA-256 fingerprints
  const manifest: ConfigManifest = {
    generatedAt: new Date().toISOString(),
    barId: bar.id,
    barName: bar.name,
    meshPath,
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
