/**
 * MCP Prompt registrations for the Red Queen server.
 *
 * Prompts provide structured templates that agents can request to perform
 * governance-aware tasks with full BAR context.
 *
 * P1: architecture-review — Review architecture against CALM model and governance standards
 * P2: remediation-plan — Generate a remediation plan for governance gaps
 * P3: threat-assessment — Assess security posture using CALM + controls + threat model
 * P4: adr-proposal — Draft an ADR based on architecture context
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MeshReader } from '../core/mesh-reader';

export function registerPrompts(server: McpServer, reader: MeshReader): void {
  // --------------------------------------------------------------------------
  // P1: architecture-review
  // --------------------------------------------------------------------------
  server.prompt(
    'architecture-review',
    'Complete architecture review prompt for a BAR — includes CALM model, scores, ADRs, and fitness functions.',
    {
      barName: z.string().describe('Name of the BAR to review'),
      scope: z.enum(['full', 'architecture', 'security', 'risk', 'operations']).optional().describe('Review scope (default: full)'),
    },
    async ({ barName, scope }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text: `Error: BAR not found: ${barName}` } }] };
      }

      const reviewScope = scope || 'full';
      const archContent = reader.readBarFile(bar.path, 'architecture/bar.arch.json');
      const adrs = reader.readAdrs(bar.path);
      const fitness = reader.readBarFile(bar.path, 'architecture/fitness-functions.yaml');
      const threats = reader.readBarFile(bar.path, 'security/threat-model.yaml');
      const controls = reader.readBarFile(bar.path, 'security/security-controls.yaml');

      const sections: string[] = [
        `# Architecture Review: ${bar.name}`,
        '',
        `## BAR Identity`,
        `- **ID:** ${bar.id}`,
        `- **Platform:** ${bar.platformName} (${bar.platformId})`,
        `- **Criticality:** ${bar.criticality}`,
        `- **Lifecycle:** ${bar.lifecycle}`,
        `- **Composite Score:** ${bar.compositeScore}/100`,
        '',
        `## Current Governance Scores`,
        `- Architecture: ${bar.architecture.score}/100 (${bar.architecture.status})`,
        `- Security: ${bar.security.score}/100 (${bar.security.status})`,
        `- Information Risk: ${bar.infoRisk.score}/100 (${bar.infoRisk.status})`,
        `- Operations: ${bar.operations.score}/100 (${bar.operations.status})`,
        '',
      ];

      if ((reviewScope === 'full' || reviewScope === 'architecture') && archContent) {
        sections.push('## CALM Architecture Model', '```json', archContent, '```', '');
      }

      if (adrs.length > 0) {
        sections.push('## Architectural Decision Records', '');
        for (const adr of adrs) {
          sections.push(`### ${adr.title} (${adr.status})`, adr.content, '');
        }
      }

      if (fitness) {
        sections.push('## Fitness Functions', '```yaml', fitness, '```', '');
      }

      if ((reviewScope === 'full' || reviewScope === 'security') && threats) {
        sections.push('## Threat Model', '```yaml', threats, '```', '');
      }

      if ((reviewScope === 'full' || reviewScope === 'security') && controls) {
        sections.push('## Security Controls', '```yaml', controls, '```', '');
      }

      sections.push(
        '## Review Instructions',
        '',
        `Perform a ${reviewScope} architecture review of **${bar.name}**:`,
        '',
        '1. Evaluate the CALM architecture model for completeness and correctness',
        '2. Check that all nodes have clear types, descriptions, and relationships',
        '3. Verify ADR decisions align with the current architecture',
        '4. Assess governance scores and identify improvement areas',
        '5. Evaluate fitness functions for coverage of quality attributes',
        reviewScope === 'full' || reviewScope === 'security'
          ? '6. Review threat model coverage against the architecture'
          : '',
        '',
        'Provide specific, actionable recommendations with severity ratings.',
      );

      return {
        messages: [{
          role: 'user' as const,
          content: { type: 'text' as const, text: sections.filter(Boolean).join('\n') },
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // P2: remediation-plan
  // --------------------------------------------------------------------------
  server.prompt(
    'remediation-plan',
    'Generate a remediation plan for governance gaps in a BAR.',
    {
      barName: z.string().describe('Name of the BAR'),
      pillar: z.enum(['architecture', 'security', 'infoRisk', 'operations']).optional().describe('Focus on a specific pillar'),
    },
    async ({ barName, pillar }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text: `Error: BAR not found: ${barName}` } }] };
      }

      const gaps = reader.findGovernanceGaps({ barName, pillar });

      const sections: string[] = [
        `# Remediation Plan: ${bar.name}`,
        '',
        `## Current State`,
        `- **Composite Score:** ${bar.compositeScore}/100`,
        `- **Architecture:** ${bar.architecture.score}/100 (${bar.architecture.status})`,
        `- **Security:** ${bar.security.score}/100 (${bar.security.status})`,
        `- **Information Risk:** ${bar.infoRisk.score}/100 (${bar.infoRisk.status})`,
        `- **Operations:** ${bar.operations.score}/100 (${bar.operations.status})`,
        '',
        `## Identified Gaps (${gaps.length} total)`,
        '',
      ];

      if (gaps.length === 0) {
        sections.push('No governance gaps identified. All pillars are healthy.');
      } else {
        const highGaps = gaps.filter(g => g.severity === 'high');
        const medGaps = gaps.filter(g => g.severity === 'medium');
        const lowGaps = gaps.filter(g => g.severity === 'low');

        if (highGaps.length > 0) {
          sections.push('### High Severity', '');
          for (const g of highGaps) {
            sections.push(`- **[${g.pillar}]** ${g.description}`);
          }
          sections.push('');
        }
        if (medGaps.length > 0) {
          sections.push('### Medium Severity', '');
          for (const g of medGaps) {
            sections.push(`- **[${g.pillar}]** ${g.description}`);
          }
          sections.push('');
        }
        if (lowGaps.length > 0) {
          sections.push('### Low Severity', '');
          for (const g of lowGaps) {
            sections.push(`- **[${g.pillar}]** ${g.description}`);
          }
          sections.push('');
        }
      }

      sections.push(
        '## Instructions',
        '',
        `Create a prioritized remediation plan for **${bar.name}**:`,
        '',
        '1. Address high-severity gaps first (missing critical artifacts, failing scores)',
        '2. For each gap, provide:',
        '   - What artifact needs to be created or improved',
        '   - Specific content recommendations',
        '   - Expected score impact',
        '3. Estimate the effort for each remediation item',
        '4. Identify any dependencies between items',
      );

      return {
        messages: [{
          role: 'user' as const,
          content: { type: 'text' as const, text: sections.join('\n') },
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // P3: threat-assessment
  // --------------------------------------------------------------------------
  server.prompt(
    'threat-assessment',
    'Assess security posture using CALM architecture, controls, and threat model.',
    {
      barName: z.string().describe('Name of the BAR to assess'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text: `Error: BAR not found: ${barName}` } }] };
      }

      const archContent = reader.readBarFile(bar.path, 'architecture/bar.arch.json');
      const threats = reader.readBarFile(bar.path, 'security/threat-model.yaml');
      const controls = reader.readBarFile(bar.path, 'security/security-controls.yaml');

      const sections: string[] = [
        `# Threat Assessment: ${bar.name}`,
        '',
        `## BAR Identity`,
        `- **ID:** ${bar.id}`,
        `- **Criticality:** ${bar.criticality}`,
        `- **Security Score:** ${bar.security.score}/100 (${bar.security.status})`,
        '',
      ];

      if (archContent) {
        sections.push('## Architecture (CALM Model)', '```json', archContent, '```', '');
      }

      if (threats) {
        sections.push('## Existing Threat Model', '```yaml', threats, '```', '');
      } else {
        sections.push('## Existing Threat Model', '*No threat model found — this is a gap.*', '');
      }

      if (controls) {
        sections.push('## Security Controls', '```yaml', controls, '```', '');
      } else {
        sections.push('## Security Controls', '*No security controls found — this is a gap.*', '');
      }

      sections.push(
        '## Assessment Instructions',
        '',
        `Perform a threat assessment for **${bar.name}**:`,
        '',
        '1. Analyze the CALM architecture to identify attack surfaces (exposed nodes, external connections)',
        '2. Map existing threats against STRIDE categories (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)',
        '3. Evaluate whether security controls adequately mitigate identified threats',
        '4. Identify unmitigated threats and missing controls',
        '5. Recommend additional controls with NIST 800-53 references where applicable',
        '6. Assign risk ratings (Critical, High, Medium, Low) to each finding',
      );

      return {
        messages: [{
          role: 'user' as const,
          content: { type: 'text' as const, text: sections.join('\n') },
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // P4: adr-proposal
  // --------------------------------------------------------------------------
  server.prompt(
    'adr-proposal',
    'Draft an Architectural Decision Record (ADR) based on BAR architecture context.',
    {
      barName: z.string().describe('Name of the BAR'),
      title: z.string().describe('Title of the proposed architectural decision'),
    },
    async ({ barName, title }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text: `Error: BAR not found: ${barName}` } }] };
      }

      const archContent = reader.readBarFile(bar.path, 'architecture/bar.arch.json');
      const adrs = reader.readAdrs(bar.path);
      const nextNumber = String(adrs.length + 1).padStart(3, '0');

      const sections: string[] = [
        `# ADR Proposal: ${title}`,
        '',
        `## Context`,
        `- **BAR:** ${bar.name} (${bar.id})`,
        `- **Criticality:** ${bar.criticality}`,
        `- **Existing ADRs:** ${adrs.length}`,
        '',
      ];

      if (archContent) {
        sections.push('## Current Architecture', '```json', archContent, '```', '');
      }

      if (adrs.length > 0) {
        sections.push('## Existing ADRs', '');
        for (const adr of adrs) {
          sections.push(`- **${adr.filename}**: ${adr.title} (${adr.status})`);
        }
        sections.push('');
      }

      sections.push(
        '## Instructions',
        '',
        `Draft ADR-${nextNumber}: **${title}** using this template:`,
        '',
        '```markdown',
        `# ADR-${nextNumber}: ${title}`,
        '',
        '## Status',
        '',
        'proposed',
        '',
        '## Date',
        '',
        new Date().toISOString().split('T')[0],
        '',
        '## Deciders',
        '',
        '[List the people involved in the decision]',
        '',
        '## Context',
        '',
        '[What is the issue that we are seeing that is motivating this decision?]',
        '',
        '## Decision',
        '',
        '[What is the change that we are proposing and/or doing?]',
        '',
        '## Consequences',
        '',
        '[What becomes easier or more difficult to do because of this change?]',
        '```',
        '',
        'When drafting:',
        '1. Reference the current CALM architecture and how the decision affects it',
        '2. Consider impacts on governance scores',
        '3. Reference any related existing ADRs',
        '4. Include specific architectural trade-offs',
      );

      return {
        messages: [{
          role: 'user' as const,
          content: { type: 'text' as const, text: sections.join('\n') },
        }],
      };
    }
  );
}
