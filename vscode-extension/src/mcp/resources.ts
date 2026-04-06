/**
 * MCP Resource registrations for the Red Queen server.
 *
 * Resources expose governance mesh data as calm:// URIs that agents
 * can read to understand the architectural and governance context.
 */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MeshReader } from '../core/mesh-reader';

export function registerResources(server: McpServer, reader: MeshReader): void {
  // --------------------------------------------------------------------------
  // calm://mesh/summary — Portfolio-level overview
  // --------------------------------------------------------------------------
  server.resource(
    'mesh-summary',
    'calm://mesh/summary',
    { description: 'Portfolio summary with platform counts, BAR counts, and overall governance health' },
    async () => {
      const summary = reader.buildPortfolioSummary();
      if (!summary) {
        return {
          contents: [{
            uri: 'calm://mesh/summary',
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'No portfolio config found in mesh' }),
          }],
        };
      }

      // Return a concise summary (don't include full BAR details — use specific resources for that)
      const result = {
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
      };

      return {
        contents: [{
          uri: 'calm://mesh/summary',
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://mesh/platforms — List all platforms
  // --------------------------------------------------------------------------
  server.resource(
    'mesh-platforms',
    'calm://mesh/platforms',
    { description: 'List of all platforms in the governance mesh with their configurations' },
    async () => {
      const platforms = reader.listPlatforms();
      return {
        contents: [{
          uri: 'calm://mesh/platforms',
          mimeType: 'application/json',
          text: JSON.stringify(platforms, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://mesh/bars — List all BARs with scores
  // --------------------------------------------------------------------------
  server.resource(
    'mesh-bars',
    'calm://mesh/bars',
    { description: 'List of all BARs across all platforms with governance pillar scores' },
    async () => {
      const bars = reader.listBars();
      // Return concise BAR list (full details via bar-specific resources)
      const result = bars.map(b => ({
        id: b.id,
        name: b.name,
        platformId: b.platformId,
        platformName: b.platformName,
        criticality: b.criticality,
        lifecycle: b.lifecycle,
        compositeScore: b.compositeScore,
        architecture: { score: b.architecture.score, status: b.architecture.status },
        security: { score: b.security.score, status: b.security.status },
        infoRisk: { score: b.infoRisk.score, status: b.infoRisk.status },
        operations: { score: b.operations.score, status: b.operations.status },
      }));

      return {
        contents: [{
          uri: 'calm://mesh/bars',
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://bar/{name}/scores — Detailed scores for a specific BAR
  // --------------------------------------------------------------------------
  server.resource(
    'bar-scores',
    new ResourceTemplate('calm://bar/{name}/scores', { list: undefined }),
    { description: 'Detailed governance pillar scores and artifact status for a specific BAR' },
    async (uri, { name }) => {
      const bar = reader.getBar(name as string);
      if (!bar) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `BAR not found: ${name}` }),
          }],
        };
      }

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            id: bar.id,
            name: bar.name,
            compositeScore: bar.compositeScore,
            architecture: bar.architecture,
            security: bar.security,
            infoRisk: bar.infoRisk,
            operations: bar.operations,
            scoreTrend: bar.scoreTrend,
            pillarTrends: bar.pillarTrends,
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://bar/{name}/manifest — App manifest (app.yaml) for a BAR
  // --------------------------------------------------------------------------
  server.resource(
    'bar-manifest',
    new ResourceTemplate('calm://bar/{name}/manifest', { list: undefined }),
    { description: 'Application manifest (identity, criticality, lifecycle, repos) for a specific BAR' },
    async (uri, { name }) => {
      const bar = reader.getBar(name as string);
      if (!bar) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `BAR not found: ${name}` }),
          }],
        };
      }

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            id: bar.id,
            name: bar.name,
            platformId: bar.platformId,
            criticality: bar.criticality,
            lifecycle: bar.lifecycle,
            strategy: bar.strategy,
            repos: bar.repos,
            repoCount: bar.repoCount,
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://bar/{name}/architecture — CALM architecture model
  // --------------------------------------------------------------------------
  server.resource(
    'bar-architecture',
    new ResourceTemplate('calm://bar/{name}/architecture', { list: undefined }),
    { description: 'CALM architecture model (bar.arch.json) for a specific BAR' },
    async (uri, { name }) => {
      const bar = reader.getBar(name as string);
      if (!bar) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `BAR not found: ${name}` }),
          }],
        };
      }

      const archContent = reader.readBarFile(bar.path, 'architecture/bar.arch.json');
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: archContent || JSON.stringify({ error: 'No architecture file found' }),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://bar/{name}/threats — Threat model
  // --------------------------------------------------------------------------
  server.resource(
    'bar-threats',
    new ResourceTemplate('calm://bar/{name}/threats', { list: undefined }),
    { description: 'Threat model (threat-model.yaml) for a specific BAR' },
    async (uri, { name }) => {
      const bar = reader.getBar(name as string);
      if (!bar) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/yaml',
            text: `error: "BAR not found: ${name}"`,
          }],
        };
      }

      const content = reader.readBarFile(bar.path, 'security/threat-model.yaml');
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/yaml',
          text: content || 'error: "No threat model found"',
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://bar/{name}/controls — Security controls
  // --------------------------------------------------------------------------
  server.resource(
    'bar-controls',
    new ResourceTemplate('calm://bar/{name}/controls', { list: undefined }),
    { description: 'Security controls (security-controls.yaml) for a specific BAR' },
    async (uri, { name }) => {
      const bar = reader.getBar(name as string);
      if (!bar) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/yaml',
            text: `error: "BAR not found: ${name}"`,
          }],
        };
      }

      const content = reader.readBarFile(bar.path, 'security/security-controls.yaml');
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/yaml',
          text: content || 'error: "No security controls found"',
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://bar/{name}/fitness — Fitness functions
  // --------------------------------------------------------------------------
  server.resource(
    'bar-fitness',
    new ResourceTemplate('calm://bar/{name}/fitness', { list: undefined }),
    { description: 'Fitness function definitions (fitness-functions.yaml) for a specific BAR' },
    async (uri, { name }) => {
      const bar = reader.getBar(name as string);
      if (!bar) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/yaml',
            text: `error: "BAR not found: ${name}"`,
          }],
        };
      }

      const content = reader.readBarFile(bar.path, 'architecture/fitness-functions.yaml');
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/yaml',
          text: content || 'error: "No fitness functions found"',
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://bar/{name}/history — Review history
  // --------------------------------------------------------------------------
  server.resource(
    'bar-history',
    new ResourceTemplate('calm://bar/{name}/history', { list: undefined }),
    { description: 'Oraculum review history (reviews.yaml) for a specific BAR' },
    async (uri, { name }) => {
      const bar = reader.getBar(name as string);
      if (!bar) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `BAR not found: ${name}` }),
          }],
        };
      }

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            reviews: bar.reviews || [],
            latestDriftScore: bar.latestDriftScore,
            scoreHistory: bar.scoreHistory || [],
          }, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://policies — Portfolio-level policies
  // --------------------------------------------------------------------------
  server.resource(
    'policies',
    'calm://policies',
    { description: 'Portfolio-level governance policies (architecture, security, risk, operations)' },
    async () => {
      const policies = reader.readPolicies();
      const result = policies.map(p => ({
        filename: p.filename,
        label: p.label,
        pillar: p.pillar,
      }));

      return {
        contents: [{
          uri: 'calm://policies',
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // Phase 2 Resources
  // ==========================================================================

  // --------------------------------------------------------------------------
  // calm://bar/{name}/adrs — Architectural Decision Records
  // --------------------------------------------------------------------------
  server.resource(
    'bar-adrs',
    new ResourceTemplate('calm://bar/{name}/adrs', { list: undefined }),
    { description: 'Architectural Decision Records (ADRs) for a specific BAR' },
    async (uri, { name }) => {
      const bar = reader.getBar(name as string);
      if (!bar) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `BAR not found: ${name}` }),
          }],
        };
      }

      const adrs = reader.readAdrs(bar.path);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(adrs, null, 2),
        }],
      };
    }
  );

  // --------------------------------------------------------------------------
  // calm://bar/{name}/flows — CALM relationships and flows
  // --------------------------------------------------------------------------
  server.resource(
    'bar-flows',
    new ResourceTemplate('calm://bar/{name}/flows', { list: undefined }),
    { description: 'CALM flows and relationships from bar.arch.json for a specific BAR' },
    async (uri, { name }) => {
      const bar = reader.getBar(name as string);
      if (!bar) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `BAR not found: ${name}` }),
          }],
        };
      }

      const flows = reader.readFlows(bar.path);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: flows ? JSON.stringify(flows, null, 2) : JSON.stringify({ error: 'No architecture file found' }),
        }],
      };
    }
  );
}
