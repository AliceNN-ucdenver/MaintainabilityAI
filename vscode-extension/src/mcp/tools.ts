/**
 * MCP Tool registrations for the Red Queen server.
 *
 * Phase 1: Basic read-only query tools.
 * Phase 2: Advanced query + scaffold tools.
 * Phase 3: The Red Queen's Court — enforcement tools.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MeshReader } from '../core/mesh-reader';
import { scaffoldAgentConfig, computeTier } from './config-scaffold';
import { evaluate, buildConstraintsSummary } from './policy-engine';
import { createAuditEntry, appendAuditLog, computeScoreDelta } from './utils/audit-logger';
import type { EvaluationContext } from './policy-engine';
import type { RedQueenService } from '../services/RedQueenService';

export function registerTools(server: McpServer, reader: MeshReader, redQueen?: RedQueenService): void {
  // --------------------------------------------------------------------------
  // get_bar_score — Score a specific BAR
  // --------------------------------------------------------------------------
  server.tool(
    'get_bar_score',
    'Get governance pillar scores (architecture, security, risk, operations) for a specific BAR',
    {
      barName: z.string().describe('Name of the BAR (case-insensitive, e.g. "claims-processing" or "Claims Processing")'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: `BAR not found: ${barName}` }),
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: bar.id,
            name: bar.name,
            platformId: bar.platformId,
            criticality: bar.criticality,
            compositeScore: bar.compositeScore,
            architecture: { score: bar.architecture.score, status: bar.architecture.status },
            security: { score: bar.security.score, status: bar.security.status },
            infoRisk: { score: bar.infoRisk.score, status: bar.infoRisk.status },
            operations: { score: bar.operations.score, status: bar.operations.status },
            scoreTrend: bar.scoreTrend,
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // list_bars — List all BARs with scores
  // --------------------------------------------------------------------------
  server.tool(
    'list_bars',
    'List all BARs across all platforms with their governance scores',
    {},
    async () => {
      const bars = reader.listBars();
      const result = bars.map(b => ({
        id: b.id,
        name: b.name,
        platformId: b.platformId,
        platformName: b.platformName,
        criticality: b.criticality,
        compositeScore: b.compositeScore,
        architecture: b.architecture.status,
        security: b.security.status,
        infoRisk: b.infoRisk.status,
        operations: b.operations.status,
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // list_platforms — List all platforms
  // --------------------------------------------------------------------------
  server.tool(
    'list_platforms',
    'List all platforms in the governance mesh',
    {},
    async () => {
      const platforms = reader.listPlatforms();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(platforms, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_architecture — Read CALM architecture model for a BAR
  // --------------------------------------------------------------------------
  server.tool(
    'get_architecture',
    'Read the CALM architecture model (bar.arch.json) for a specific BAR',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const content = reader.readBarFile(bar.path, 'architecture/bar.arch.json');
      if (!content) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No CALM architecture file found' }) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: content }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_threats — Read threat model for a BAR
  // --------------------------------------------------------------------------
  server.tool(
    'get_threats',
    'Read the threat model (threat-model.yaml) for a specific BAR',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const content = reader.readBarFile(bar.path, 'security/threat-model.yaml');
      return {
        content: [{ type: 'text' as const, text: content || 'No threat model found' }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_controls — Read security controls for a BAR
  // --------------------------------------------------------------------------
  server.tool(
    'get_controls',
    'Read the security controls (security-controls.yaml) for a specific BAR',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const content = reader.readBarFile(bar.path, 'security/security-controls.yaml');
      return {
        content: [{ type: 'text' as const, text: content || 'No security controls found' }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_fitness_functions — Read fitness function definitions
  // --------------------------------------------------------------------------
  server.tool(
    'get_fitness_functions',
    'Read fitness function definitions (fitness-functions.yaml) for a specific BAR',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const content = reader.readBarFile(bar.path, 'architecture/fitness-functions.yaml');
      return {
        content: [{ type: 'text' as const, text: content || 'No fitness functions found' }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_review_history — Read review history for a BAR
  // --------------------------------------------------------------------------
  server.tool(
    'get_review_history',
    'Read Oraculum review history and governance score trends for a specific BAR',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            reviews: bar.reviews || [],
            latestDriftScore: bar.latestDriftScore,
            scoreHistory: bar.scoreHistory || [],
            scoreTrend: bar.scoreTrend,
            pillarTrends: bar.pillarTrends,
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_policy — Read a specific policy document
  // --------------------------------------------------------------------------
  server.tool(
    'get_policy',
    'Read a specific governance policy document by filename',
    {
      filename: z.string().describe('Policy filename (e.g. "security-baseline.yaml")'),
    },
    async ({ filename }) => {
      const policies = reader.readPolicies();
      const policy = policies.find(p => p.filename === filename);
      if (!policy) {
        const available = policies.map(p => p.filename).join(', ');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Policy not found: ${filename}. Available: ${available}` }) }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: policy.content }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_mesh_summary — Get portfolio overview
  // --------------------------------------------------------------------------
  server.tool(
    'get_mesh_summary',
    'Get a portfolio-level summary including total BARs, health, governance coverage, and platform breakdown',
    {},
    async () => {
      const summary = reader.buildPortfolioSummary();
      if (!summary) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No portfolio config found in mesh' }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            portfolio: summary.portfolio,
            totalBars: summary.totalBars,
            portfolioHealth: summary.portfolioHealth,
            pendingDecisions: summary.pendingDecisions,
            governanceCoverage: summary.governanceCoverage,
            platforms: summary.platforms.map(p => ({
              id: p.id,
              name: p.name,
              barCount: p.barCount,
              compositeHealth: p.compositeHealth,
            })),
          }, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // Phase 2: Advanced Query Tools
  // ==========================================================================

  // --------------------------------------------------------------------------
  // find_bars (T1) — Search BARs with filters
  // --------------------------------------------------------------------------
  server.tool(
    'find_bars',
    'Search BARs by name, platform, criticality, score range, or governance status. Returns matching BARs with scores.',
    {
      name: z.string().optional().describe('Partial name match (case-insensitive)'),
      platform: z.string().optional().describe('Platform ID or name filter'),
      criticality: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Criticality level filter'),
      minScore: z.number().min(0).max(100).optional().describe('Minimum composite score'),
      maxScore: z.number().min(0).max(100).optional().describe('Maximum composite score'),
      status: z.enum(['passing', 'warning', 'failing']).optional().describe('Filter by overall governance status (based on lowest pillar)'),
    },
    async ({ name, platform, criticality, minScore, maxScore, status }) => {
      let bars = reader.listBars();

      if (name) {
        const lower = name.toLowerCase();
        bars = bars.filter(b => b.name.toLowerCase().includes(lower) || b.id.toLowerCase().includes(lower));
      }
      if (platform) {
        const lower = platform.toLowerCase();
        bars = bars.filter(b => b.platformId.toLowerCase() === lower || b.platformName.toLowerCase().includes(lower));
      }
      if (criticality) {
        bars = bars.filter(b => b.criticality === criticality);
      }
      if (minScore !== undefined) {
        bars = bars.filter(b => b.compositeScore >= minScore);
      }
      if (maxScore !== undefined) {
        bars = bars.filter(b => b.compositeScore <= maxScore);
      }
      if (status) {
        bars = bars.filter(b => {
          const worstStatus = [b.architecture.status, b.security.status, b.infoRisk.status, b.operations.status]
            .reduce((worst, s) => {
              const order = { failing: 0, warning: 1, passing: 2 };
              return order[s] < order[worst] ? s : worst;
            });
          return worstStatus === status;
        });
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            matchCount: bars.length,
            bars: bars.map(b => ({
              id: b.id,
              name: b.name,
              platformId: b.platformId,
              platformName: b.platformName,
              criticality: b.criticality,
              compositeScore: b.compositeScore,
              architecture: b.architecture.status,
              security: b.security.status,
              infoRisk: b.infoRisk.status,
              operations: b.operations.status,
            })),
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_bar_context (T2) — Comprehensive BAR context bundle
  // --------------------------------------------------------------------------
  server.tool(
    'get_bar_context',
    'Get comprehensive BAR context in one call: manifest, scores, architecture, threats, controls, ADRs. Ideal for agents starting work on a BAR.',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const archContent = reader.readBarFile(bar.path, 'architecture/bar.arch.json');
      const threats = reader.readBarFile(bar.path, 'security/threat-model.yaml');
      const controls = reader.readBarFile(bar.path, 'security/security-controls.yaml');
      const adrs = reader.readAdrs(bar.path);
      const flows = reader.readFlows(bar.path);
      const fitness = reader.readBarFile(bar.path, 'architecture/fitness-functions.yaml');

      let architecture = null;
      if (archContent) {
        try { architecture = JSON.parse(archContent); } catch { architecture = archContent; }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            manifest: {
              id: bar.id,
              name: bar.name,
              platformId: bar.platformId,
              criticality: bar.criticality,
              lifecycle: bar.lifecycle,
              strategy: bar.strategy,
              repos: bar.repos,
            },
            scores: {
              compositeScore: bar.compositeScore,
              architecture: { score: bar.architecture.score, status: bar.architecture.status },
              security: { score: bar.security.score, status: bar.security.status },
              infoRisk: { score: bar.infoRisk.score, status: bar.infoRisk.status },
              operations: { score: bar.operations.score, status: bar.operations.status },
              scoreTrend: bar.scoreTrend,
            },
            architecture,
            flows: flows ? { relationships: flows.relationships, flows: flows.flows } : null,
            threats: threats || null,
            controls: controls || null,
            adrs: adrs.map(a => ({ filename: a.filename, title: a.title, status: a.status })),
            fitness: fitness || null,
            linkedBars: reader.findLinkedBars(barName),
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // governance_gaps (T4) — Identify governance gaps
  // --------------------------------------------------------------------------
  server.tool(
    'governance_gaps',
    'Identify governance gaps across BARs: missing artifacts, weak scores, low quality. Optionally filter by BAR name or pillar.',
    {
      barName: z.string().optional().describe('Filter to a specific BAR'),
      pillar: z.enum(['architecture', 'security', 'infoRisk', 'operations']).optional().describe('Filter to a specific pillar'),
    },
    async ({ barName, pillar }) => {
      const gaps = reader.findGovernanceGaps({ barName, pillar });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalGaps: gaps.length,
            byseverity: {
              high: gaps.filter(g => g.severity === 'high').length,
              medium: gaps.filter(g => g.severity === 'medium').length,
              low: gaps.filter(g => g.severity === 'low').length,
            },
            gaps,
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // compare_bars (T6) — Side-by-side BAR comparison
  // --------------------------------------------------------------------------
  server.tool(
    'compare_bars',
    'Side-by-side comparison of two BARs across all four governance pillars.',
    {
      barNameA: z.string().describe('First BAR name'),
      barNameB: z.string().describe('Second BAR name'),
    },
    async ({ barNameA, barNameB }) => {
      const barA = reader.getBar(barNameA);
      const barB = reader.getBar(barNameB);

      if (!barA) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barNameA}` }) }], isError: true };
      }
      if (!barB) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barNameB}` }) }], isError: true };
      }

      const pillars = ['architecture', 'security', 'infoRisk', 'operations'] as const;
      const comparison = pillars.map(p => ({
        pillar: p,
        [barA.name]: { score: barA[p].score, status: barA[p].status },
        [barB.name]: { score: barB[p].score, status: barB[p].status },
        delta: barA[p].score - barB[p].score,
      }));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            barA: { id: barA.id, name: barA.name, compositeScore: barA.compositeScore, criticality: barA.criticality },
            barB: { id: barB.id, name: barB.name, compositeScore: barB.compositeScore, criticality: barB.criticality },
            compositeDelta: barA.compositeScore - barB.compositeScore,
            pillars: comparison,
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // validate_calm (T8) — Validate CALM architecture structure
  // --------------------------------------------------------------------------
  server.tool(
    'validate_calm',
    'Validate CALM architecture file (bar.arch.json) for structural correctness: required fields, unique IDs, valid node references.',
    {
      barName: z.string().describe('Name of the BAR to validate'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }], isError: true };
      }

      const result = reader.validateCalm(bar.path);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_adrs — Read ADRs for a BAR
  // --------------------------------------------------------------------------
  server.tool(
    'get_adrs',
    'Read all Architectural Decision Records (ADRs) for a specific BAR',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }], isError: true };
      }

      const adrs = reader.readAdrs(bar.path);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(adrs, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // Scaffold Tools
  // ==========================================================================

  // --------------------------------------------------------------------------
  // scaffold_agent_config — Generate agent config files for a BAR
  // --------------------------------------------------------------------------
  server.tool(
    'scaffold_agent_config',
    'Generate agent configuration files (.mcp.json, .claude/settings.json, AGENTS.md, hooks) for a BAR based on its governance scores and tier. Files are returned as content — write them to the code repo.',
    {
      barName: z.string().describe('Name of the BAR to generate config for'),
    },
    async ({ barName }) => {
      const result = scaffoldAgentConfig(reader, barName, redQueen);
      if ('error' in result) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: result.error }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            barName: result.barName,
            barId: result.barId,
            tier: result.tier,
            decision: result.decision || undefined,
            fileCount: Object.keys(result.files).length,
            files: Object.entries(result.files).map(([filePath, content]) => ({
              path: filePath,
              content,
            })),
            manifest: result.manifest,
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_permission_tier — Query what tier a BAR is in and why
  // --------------------------------------------------------------------------
  server.tool(
    'get_permission_tier',
    'Get the governance permission tier for a BAR and the reasoning behind it.',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const tier = computeTier(bar);
      const pillars = {
        architecture: { score: bar.architecture.score, status: bar.architecture.status },
        security: { score: bar.security.score, status: bar.security.status },
        infoRisk: { score: bar.infoRisk.score, status: bar.infoRisk.status },
        operations: { score: bar.operations.score, status: bar.operations.status },
      };

      // Explain why this tier was assigned
      const reasons: string[] = [];
      if (tier === 'restricted') {
        const failingPillars = Object.entries(pillars).filter(([, p]) => p.score < 50);
        if (failingPillars.length > 0) {
          reasons.push(`Pillar(s) below 50: ${failingPillars.map(([name, p]) => `${name} (${p.score})`).join(', ')}`);
        }
        if (bar.compositeScore < 50) {
          reasons.push(`Composite score ${bar.compositeScore} is below 50`);
        }
      } else if (tier === 'supervised') {
        reasons.push(`Composite score ${bar.compositeScore} is between 50-79`);
      } else {
        reasons.push(`Composite score ${bar.compositeScore} is 80 or above with no pillar below 50`);
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            barName: bar.name,
            barId: bar.id,
            tier,
            compositeScore: bar.compositeScore,
            criticality: bar.criticality,
            pillars,
            reasons,
          }, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // Phase 3: The Red Queen's Court — Enforcement Tools
  // ==========================================================================

  // --------------------------------------------------------------------------
  // validate_action (T9) — Validate a proposed action against governance rules
  // --------------------------------------------------------------------------
  server.tool(
    'validate_action',
    'Validate a proposed action against CALM governance constraints. Returns approval, denial, or conditional approval with required modifications. Uses deterministic policy rules — not LLM judgment.',
    {
      barName: z.string().describe('Name of the BAR this action targets'),
      actionType: z.enum([
        'create_service', 'modify_service', 'add_dependency',
        'add_database_connection', 'modify_interface', 'add_endpoint',
        'modify_authentication', 'modify_encryption', 'change_data_flow',
        'modify_infrastructure', 'update_config', 'general',
      ]).describe('Type of structural change being proposed'),
      description: z.string().describe('What the agent intends to do'),
      filePath: z.string().optional().describe('File being modified'),
      toolName: z.string().optional().describe('Tool being used (Edit, Write, Bash)'),
      sourceNode: z.string().optional().describe('CALM node ID of the source (for connection changes)'),
      targetNode: z.string().optional().describe('CALM node ID of the target (for connection changes)'),
    },
    async ({ barName, actionType, description, filePath, toolName, sourceNode, targetNode }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const tier = computeTier(bar);

      // Build full evaluation context with CALM model data (Layer 2)
      const calmModel = reader.readFlows(bar.path);
      const controls = reader.readBarFile(bar.path, 'security/security-controls.yaml');
      const threats = reader.readBarFile(bar.path, 'security/threat-model.yaml');
      const platformArch = reader.readPlatformArchitecture(bar.platformId);

      const ctx: EvaluationContext = {
        barId: bar.id,
        barName: bar.name,
        tier,
        compositeScore: bar.compositeScore,
        actionType,
        description,
        filePath,
        toolName,
        sourceNode,
        targetNode,
        calmModel: calmModel ? {
          nodes: (calmModel.nodes as Array<{ 'unique-id': string; name: string; 'node-type'?: string }>),
          relationships: (calmModel.relationships as Array<{
            'unique-id': string;
            'relationship-type'?: {
              connects?: {
                source?: { node: string };
                destination?: { node: string; interfaces?: unknown[] };
              };
            };
          }>),
          flows: calmModel.flows,
        } : undefined,
        controls: controls || undefined,
        threats: threats || undefined,
        platformCalmModel: platformArch ? {
          nodes: (platformArch.nodes as Array<{ 'unique-id': string; name: string; 'node-type'?: string; 'bar-id'?: string }>),
          relationships: (platformArch.relationships as Array<{
            'unique-id': string;
            'relationship-type'?: {
              connects?: {
                source?: { node: string };
                destination?: { node: string; interfaces?: unknown[] };
              };
            };
          }>),
        } : undefined,
      };

      const decision = evaluate(ctx);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(decision, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // get_constraints (T10) — Get active governance constraints for a BAR
  // --------------------------------------------------------------------------
  server.tool(
    'get_constraints',
    'Get active governance constraints for a BAR: permission tier, allowed tools, security-critical paths, and constraints. Call this at session start to understand your boundaries.',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const summary = buildConstraintsSummary(bar);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            barName: bar.name,
            barId: bar.id,
            ...summary,
          }, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // Phase 4: Cross-BAR & Platform Governance
  // ==========================================================================

  // --------------------------------------------------------------------------
  // get_platform_architecture (T11) — Read platform-level CALM model
  // --------------------------------------------------------------------------
  server.tool(
    'get_platform_architecture',
    'Read the platform-level CALM architecture model (platform.arch.json) showing cross-BAR relationships and shared infrastructure.',
    {
      platformName: z.string().describe('Platform name or ID'),
    },
    async ({ platformName }) => {
      // Try direct ID match first, then name match
      const platforms = reader.listPlatforms();
      const platform = platforms.find(p =>
        p.id === platformName ||
        p.name.toLowerCase() === platformName.toLowerCase() ||
        p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === platformName.toLowerCase()
      );

      if (!platform) {
        const available = platforms.map(p => `${p.name} (${p.id})`).join(', ');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Platform not found: ${platformName}. Available: ${available}` }) }],
          isError: true,
        };
      }

      const arch = reader.readPlatformArchitecture(platform.id);
      if (!arch) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `No platform architecture file found for ${platform.name}. Create platform.arch.json in the platform directory.` }) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            platformId: platform.id,
            platformName: platform.name,
            nodes: arch.nodes,
            relationships: arch.relationships,
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // blast_radius (T12) — Find cross-BAR impact for a given BAR
  // --------------------------------------------------------------------------
  server.tool(
    'blast_radius',
    'Find all BARs and shared infrastructure connected to a given BAR via the platform architecture. Shows cross-BAR impact for proposed changes.',
    {
      barName: z.string().describe('Name of the BAR to analyze'),
    },
    async ({ barName }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const linked = reader.findLinkedBars(barName);
      const linkedBars = linked.filter(l => l.relationship === 'bar-to-bar');
      const sharedInfra = linked.filter(l => l.relationship === 'bar-to-infrastructure');
      const totalConnections = linked.length;

      let impactLevel: 'high' | 'medium' | 'none';
      if (totalConnections > 3) {
        impactLevel = 'high';
      } else if (totalConnections > 0) {
        impactLevel = 'medium';
      } else {
        impactLevel = 'none';
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            barName: bar.name,
            barId: bar.id,
            platformId: bar.platformId,
            impactLevel,
            totalConnections,
            linkedBars: linkedBars.map(l => ({
              name: l.barName,
              barId: l.barId,
              nodeId: l.nodeId,
            })),
            sharedInfrastructure: sharedInfra.map(l => ({
              name: l.barName,
              nodeId: l.nodeId,
            })),
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // validate_platform_calm (T13) — Validate platform CALM structure
  // --------------------------------------------------------------------------
  server.tool(
    'validate_platform_calm',
    'Validate platform-level CALM architecture file (platform.arch.json) for structural correctness: valid node types, bar-id references, valid relationships.',
    {
      platformName: z.string().describe('Platform name or ID to validate'),
    },
    async ({ platformName }) => {
      const platforms = reader.listPlatforms();
      const platform = platforms.find(p =>
        p.id === platformName ||
        p.name.toLowerCase() === platformName.toLowerCase() ||
        p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === platformName.toLowerCase()
      );

      if (!platform) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Platform not found: ${platformName}` }) }],
          isError: true,
        };
      }

      const result = reader.validatePlatformCalm(platform.id);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // Phase 5: Orchestration Tools
  // ==========================================================================

  // --------------------------------------------------------------------------
  // get_orchestration_decision — Full policy-driven orchestration decision
  // --------------------------------------------------------------------------
  server.tool(
    'get_orchestration_decision',
    'Get the full orchestration decision for a BAR: effective tier, permissions, prompt injections, threat model access, platform overrides, cross-BAR links, and reasoning audit trail.',
    {
      barName: z.string().describe('Name of the BAR'),
    },
    async ({ barName }) => {
      if (redQueen) {
        const decision = redQueen.getOrchestrationDecision(reader, barName);
        if ('error' in decision) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: decision.error }) }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(decision, null, 2) }],
        };
      }

      // Fallback: basic tier when no RedQueenService
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }
      const tier = computeTier(bar);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            barId: bar.id,
            barName: bar.name,
            tier,
            effectiveTier: tier,
            compositeScore: bar.compositeScore,
            criticality: bar.criticality,
          }, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // Phase 7: Feedback Loop Tools
  // ==========================================================================

  // score_snapshot — trigger governance score snapshot
  server.tool(
    'score_snapshot',
    'Trigger a governance score snapshot for a BAR. Records current scores to score-history.yaml, computes delta from last snapshot, and writes an audit log entry.',
    {
      barName: z.string().describe('Name of the BAR to snapshot'),
      correlationId: z.string().optional().describe('Correlation ID linking this to a PR or workflow'),
      prNumber: z.number().optional().describe('PR number that triggered this snapshot'),
      commitSha: z.string().optional().describe('Git commit SHA'),
    },
    async ({ barName, correlationId, prNumber, commitSha }) => {
      const bar = reader.getBar(barName);
      if (!bar) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `BAR not found: ${barName}` }) }],
          isError: true,
        };
      }

      const barPath = bar.path;

      // Current scores
      const current = {
        composite: bar.compositeScore,
        architecture: bar.architecture.score,
        security: bar.security.score,
        informationRisk: bar.infoRisk.score,
        operations: bar.operations.score,
      };

      // Read existing score history for delta computation
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const historyPath = require('path').join(barPath, 'score-history.yaml');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      let previous = current; // Default: no delta if no history
      let trend = 'new' as string;

      if (fs.existsSync(historyPath)) {
        const historyContent = fs.readFileSync(historyPath, 'utf8');
        const snapshots = [...historyContent.matchAll(/composite:\s*(\d+)/g)].map(m => Number(m[1]));
        const archScores = [...historyContent.matchAll(/architecture:\s*(\d+)/g)].map(m => Number(m[1]));
        const secScores = [...historyContent.matchAll(/security:\s*(\d+)/g)].map(m => Number(m[1]));
        const irScores = [...historyContent.matchAll(/information_risk:\s*(\d+)/g)].map(m => Number(m[1]));
        const opsScores = [...historyContent.matchAll(/operations:\s*(\d+)/g)].map(m => Number(m[1]));

        if (snapshots.length > 0) {
          const lastIdx = snapshots.length - 1;
          previous = {
            composite: snapshots[lastIdx],
            architecture: archScores[lastIdx] ?? current.architecture,
            security: secScores[lastIdx] ?? current.security,
            informationRisk: irScores[lastIdx] ?? current.informationRisk,
            operations: opsScores[lastIdx] ?? current.operations,
          };
          // Simple trend
          if (snapshots.length >= 2) {
            trend = current.composite > previous.composite ? 'improving' : current.composite < previous.composite ? 'declining' : 'stable';
          } else {
            trend = 'stable';
          }
        }
      }

      // Compute delta
      const delta = computeScoreDelta(bar.id, bar.name, previous, current, 'snapshot');

      // Append to score-history.yaml
      const timestamp = new Date().toISOString();
      const snapshotYaml = `\n- timestamp: "${timestamp}"\n  composite: ${current.composite}\n  architecture: ${current.architecture}\n  security: ${current.security}\n  information_risk: ${current.informationRisk}\n  operations: ${current.operations}\n`;

      if (fs.existsSync(historyPath)) {
        fs.appendFileSync(historyPath, snapshotYaml, 'utf8');
      } else {
        fs.writeFileSync(historyPath, `# Score History for ${bar.name}\n${snapshotYaml}`, 'utf8');
      }

      // Write audit log
      const auditEntry = createAuditEntry(
        'score_snapshot',
        bar.id,
        bar.name,
        { scores: current, delta: delta.delta, trend },
        { correlationId, prNumber, commitSha },
      );
      appendAuditLog(reader.path, auditEntry);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            barId: bar.id,
            barName: bar.name,
            scores: current,
            delta: delta.delta,
            pillarDeltas: delta.pillarDeltas,
            trend,
            timestamp,
          }, null, 2),
        }],
      };
    }
  );
}
