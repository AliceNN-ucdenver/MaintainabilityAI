import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const FIXTURES = path.join(__dirname, 'fixtures', 'test-mesh');
const SERVER_PATH = path.join(__dirname, '..', '..', '..', 'dist', 'mcp-server.js');

describe('Red Queen MCP Server Integration', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: 'node',
      args: [SERVER_PATH, '--mesh-path', FIXTURES],
    });
    client = new Client({ name: 'test-client', version: '1.0' });
    await client.connect(transport);
  }, 15000);

  afterAll(async () => {
    await client.close();
  });

  // --------------------------------------------------------------------------
  // Resources
  // --------------------------------------------------------------------------

  describe('resources', () => {
    it('lists static resources', async () => {
      const { resources } = await client.listResources();
      const uris = resources.map(r => r.uri);
      expect(uris).toContain('calm://mesh/summary');
      expect(uris).toContain('calm://mesh/platforms');
      expect(uris).toContain('calm://mesh/bars');
      expect(uris).toContain('calm://policies');
    });

    it('lists resource templates for BAR-specific data', async () => {
      const { resourceTemplates } = await client.listResourceTemplates();
      const templates = resourceTemplates.map(t => t.uriTemplate);
      expect(templates).toContain('calm://bar/{name}/scores');
      expect(templates).toContain('calm://bar/{name}/manifest');
      expect(templates).toContain('calm://bar/{name}/architecture');
      // Phase 2 templates
      expect(templates).toContain('calm://bar/{name}/adrs');
      expect(templates).toContain('calm://bar/{name}/flows');
    });

    it('reads calm://mesh/summary', async () => {
      const { contents } = await client.readResource({ uri: 'calm://mesh/summary' });
      expect(contents).toHaveLength(1);
      const data = JSON.parse(contents[0].text as string);
      expect(data.portfolio.id).toBe('PF-TEST-001');
      expect(data.totalBars).toBe(2);
    });

    it('reads calm://mesh/bars', async () => {
      const { contents } = await client.readResource({ uri: 'calm://mesh/bars' });
      const bars = JSON.parse(contents[0].text as string);
      expect(bars).toHaveLength(2);
      expect(bars.some((b: { name: string }) => b.name === 'Test Bar Good')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Tools
  // --------------------------------------------------------------------------

  describe('tools', () => {
    it('lists all registered tools', async () => {
      const { tools } = await client.listTools();
      const names = tools.map(t => t.name);
      // Phase 1
      expect(names).toContain('get_bar_score');
      expect(names).toContain('list_bars');
      expect(names).toContain('list_platforms');
      expect(names).toContain('get_architecture');
      expect(names).toContain('get_threats');
      expect(names).toContain('get_controls');
      expect(names).toContain('get_mesh_summary');
      // Phase 2
      expect(names).toContain('find_bars');
      expect(names).toContain('get_bar_context');
      expect(names).toContain('governance_gaps');
      expect(names).toContain('compare_bars');
      expect(names).toContain('validate_calm');
      expect(names).toContain('get_adrs');
      // Scaffold tools
      expect(names).toContain('scaffold_agent_config');
      expect(names).toContain('get_permission_tier');
      // Phase 3: The Red Queen's Court
      expect(names).toContain('validate_action');
      expect(names).toContain('get_constraints');
      // Phase 4: Cross-BAR & Platform Governance
      expect(names).toContain('get_platform_architecture');
      expect(names).toContain('blast_radius');
      expect(names).toContain('validate_platform_calm');
      // Phase 5: Policy Engine
      expect(names).toContain('get_orchestration_decision');
      // Phase 7: score_snapshot
      expect(names).toContain('score_snapshot');
      expect(names.length).toBe(25);
    });

    it('get_bar_score returns scores for a known BAR', async () => {
      const result = await client.callTool({
        name: 'get_bar_score',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.id).toBe('APP-TEST-001');
      expect(data.compositeScore).toBeGreaterThan(0);
      expect(data.architecture.status).toBe('passing');
    });

    it('get_bar_score returns error for unknown BAR', async () => {
      const result = await client.callTool({
        name: 'get_bar_score',
        arguments: { barName: 'nonexistent' },
      });
      expect(result.isError).toBe(true);
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.error).toContain('BAR not found');
    });

    it('list_bars returns all BARs', async () => {
      const result = await client.callTool({
        name: 'list_bars',
        arguments: {},
      });
      const bars = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(bars).toHaveLength(2);
    });

    it('get_architecture returns CALM model', async () => {
      const result = await client.callTool({
        name: 'get_architecture',
        arguments: { barName: 'Test Bar Good' },
      });
      const arch = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(arch.nodes).toHaveLength(2);
      expect(arch.nodes[0]['unique-id']).toBe('test-api');
    });

    it('get_threats returns threat model', async () => {
      const result = await client.callTool({
        name: 'get_threats',
        arguments: { barName: 'Test Bar Good' },
      });
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('SQL Injection');
    });

    it('get_mesh_summary returns portfolio overview', async () => {
      const result = await client.callTool({
        name: 'get_mesh_summary',
        arguments: {},
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.portfolio.name).toBe('Test Portfolio');
      expect(data.totalBars).toBe(2);
      expect(data.platforms).toHaveLength(1);
    });

    it('get_policy returns policy content', async () => {
      const result = await client.callTool({
        name: 'get_policy',
        arguments: { filename: 'security-baseline.yaml' },
      });
      const text = (result.content as Array<{ text: string }>)[0].text;
      expect(text).toContain('Encrypt at rest');
    });

    it('get_policy returns error for unknown policy', async () => {
      const result = await client.callTool({
        name: 'get_policy',
        arguments: { filename: 'nonexistent.yaml' },
      });
      expect(result.isError).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Phase 2: Advanced tools
  // --------------------------------------------------------------------------

  describe('phase 2 tools', () => {
    it('find_bars with no filters returns all BARs', async () => {
      const result = await client.callTool({
        name: 'find_bars',
        arguments: {},
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.matchCount).toBe(2);
      expect(data.bars).toHaveLength(2);
    });

    it('find_bars filters by criticality', async () => {
      const result = await client.callTool({
        name: 'find_bars',
        arguments: { criticality: 'high' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.bars.every((b: { criticality: string }) => b.criticality === 'high')).toBe(true);
    });

    it('find_bars filters by name', async () => {
      const result = await client.callTool({
        name: 'find_bars',
        arguments: { name: 'Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.matchCount).toBe(1);
      expect(data.bars[0].name).toBe('Test Bar Good');
    });

    it('find_bars filters by minScore', async () => {
      const result = await client.callTool({
        name: 'find_bars',
        arguments: { minScore: 50 },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.bars.every((b: { compositeScore: number }) => b.compositeScore >= 50)).toBe(true);
    });

    it('get_bar_context returns bundled context', async () => {
      const result = await client.callTool({
        name: 'get_bar_context',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.manifest.id).toBe('APP-TEST-001');
      expect(data.scores.compositeScore).toBeGreaterThan(0);
      expect(data.architecture).not.toBeNull();
      expect(data.architecture.nodes).toHaveLength(2);
      expect(data.threats).not.toBeNull();
      expect(data.adrs).toHaveLength(1);
    });

    it('governance_gaps finds gaps', async () => {
      const result = await client.callTool({
        name: 'governance_gaps',
        arguments: {},
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.totalGaps).toBeGreaterThan(0);
      expect(data.gaps.some((g: { barName: string }) => g.barName === 'Test Bar Empty')).toBe(true);
    });

    it('governance_gaps filters by BAR', async () => {
      const result = await client.callTool({
        name: 'governance_gaps',
        arguments: { barName: 'test-bar-good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.gaps.every((g: { barName: string }) => g.barName === 'Test Bar Good')).toBe(true);
    });

    it('compare_bars returns pillar comparison', async () => {
      const result = await client.callTool({
        name: 'compare_bars',
        arguments: { barNameA: 'Test Bar Good', barNameB: 'Test Bar Empty' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.barA.name).toBe('Test Bar Good');
      expect(data.barB.name).toBe('Test Bar Empty');
      expect(data.compositeDelta).toBeGreaterThan(0);
      expect(data.pillars).toHaveLength(4);
    });

    it('validate_calm validates CALM structure', async () => {
      const result = await client.callTool({
        name: 'validate_calm',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.valid).toBe(true);
      expect(data.errors).toHaveLength(0);
    });

    it('validate_calm returns errors for BAR without architecture', async () => {
      const result = await client.callTool({
        name: 'validate_calm',
        arguments: { barName: 'Test Bar Empty' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.valid).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('get_adrs returns ADRs for a BAR', async () => {
      const result = await client.callTool({
        name: 'get_adrs',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data).toHaveLength(1);
      expect(data[0].title).toContain('ADR-001');
      expect(data[0].status).toBe('accepted');
    });
  });

  // --------------------------------------------------------------------------
  // Prompts
  // --------------------------------------------------------------------------

  describe('prompts', () => {
    it('lists all registered prompts', async () => {
      const { prompts } = await client.listPrompts();
      const names = prompts.map(p => p.name);
      expect(names).toContain('architecture-review');
      expect(names).toContain('remediation-plan');
      expect(names).toContain('threat-assessment');
      expect(names).toContain('adr-proposal');
      expect(names.length).toBe(4);
    });

    it('architecture-review returns review prompt with BAR context', async () => {
      const result = await client.getPrompt({
        name: 'architecture-review',
        arguments: { barName: 'Test Bar Good' },
      });
      const text = (result.messages[0].content as { type: string; text: string }).text;
      expect(text).toContain('Architecture Review: Test Bar Good');
      expect(text).toContain('CALM Architecture Model');
      expect(text).toContain('Review Instructions');
    });

    it('remediation-plan returns plan with gaps', async () => {
      const result = await client.getPrompt({
        name: 'remediation-plan',
        arguments: { barName: 'Test Bar Empty' },
      });
      const text = (result.messages[0].content as { type: string; text: string }).text;
      expect(text).toContain('Remediation Plan: Test Bar Empty');
      expect(text).toContain('Identified Gaps');
    });

    it('threat-assessment returns security assessment', async () => {
      const result = await client.getPrompt({
        name: 'threat-assessment',
        arguments: { barName: 'Test Bar Good' },
      });
      const text = (result.messages[0].content as { type: string; text: string }).text;
      expect(text).toContain('Threat Assessment: Test Bar Good');
      expect(text).toContain('STRIDE');
    });

    it('adr-proposal returns ADR template', async () => {
      const result = await client.getPrompt({
        name: 'adr-proposal',
        arguments: { barName: 'Test Bar Good', title: 'Add Redis caching' },
      });
      const text = (result.messages[0].content as { type: string; text: string }).text;
      expect(text).toContain('ADR Proposal: Add Redis caching');
      expect(text).toContain('ADR-002');
      expect(text).toContain('Existing ADRs');
    });
  });

  // --------------------------------------------------------------------------
  // Scaffold tools
  // --------------------------------------------------------------------------

  describe('scaffold tools', () => {
    it('scaffold_agent_config returns config files for a BAR', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      // Tier is policy-driven — verify it's a valid tier, not hardcoded
      expect(['autonomous', 'supervised', 'restricted']).toContain(data.tier);
      expect(data.barId).toBe('APP-TEST-001');
      expect(data.fileCount).toBeGreaterThanOrEqual(5);
      expect(data.files.some((f: { path: string }) => f.path === '.mcp.json')).toBe(true);
      expect(data.files.some((f: { path: string }) => f.path === 'AGENTS.md')).toBe(true);
      expect(data.files.some((f: { path: string }) => f.path === '.redqueen/policy.json')).toBe(true);
      expect(data.manifest.tier).toBe(data.tier); // manifest tier matches decision tier
    });

    it('scaffold_agent_config returns restricted for empty BAR', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Empty' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      // Empty BAR has 0% on all pillars → always restricted regardless of policy
      expect(data.tier).toBe('restricted');
    });

    it('get_permission_tier returns tier with reasoning', async () => {
      const result = await client.callTool({
        name: 'get_permission_tier',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      // Tier depends on BAR scores + policy — verify it's valid and has reasoning
      expect(['autonomous', 'supervised', 'restricted']).toContain(data.tier);
      expect(data.compositeScore).toBeGreaterThan(0);
      expect(data.reasons.length).toBeGreaterThan(0);
      expect(data.pillars.architecture).toBeDefined();
    });

    it('get_permission_tier shows restricted reasoning', async () => {
      const result = await client.callTool({
        name: 'get_permission_tier',
        arguments: { barName: 'Test Bar Empty' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.tier).toBe('restricted');
      expect(data.reasons.some((r: string) => r.includes('below 50'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Phase 3: The Red Queen's Court — Enforcement tools
  // --------------------------------------------------------------------------

  describe("Red Queen's Court tools", () => {
    it('validate_action approves safe action for autonomous BAR', async () => {
      const result = await client.callTool({
        name: 'validate_action',
        arguments: {
          barName: 'Test Bar Good',
          actionType: 'general',
          description: 'Edit a source file',
          toolName: 'Edit',
          filePath: 'src/index.ts',
        },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.allowed).toBe(true);
      expect(data.verdict).toBe('approved');
    });

    it('validate_action denies Bash for restricted BAR', async () => {
      const result = await client.callTool({
        name: 'validate_action',
        arguments: {
          barName: 'Test Bar Empty',
          actionType: 'general',
          description: 'Run shell command',
          toolName: 'Bash',
        },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.allowed).toBe(false);
      expect(data.verdict).toBe('denied');
      expect(data.violations.length).toBeGreaterThan(0);
    });

    it('validate_action denies modification of governance files', async () => {
      const result = await client.callTool({
        name: 'validate_action',
        arguments: {
          barName: 'Test Bar Good',
          actionType: 'update_config',
          description: 'Modify MCP config',
          toolName: 'Edit',
          filePath: '.mcp.json',
        },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.allowed).toBe(false);
      expect(data.violations.some((v: { ruleId: string }) => v.ruleId === 'PATH-001')).toBe(true);
    });

    it('validate_action checks CALM flow constraints', async () => {
      const result = await client.callTool({
        name: 'validate_action',
        arguments: {
          barName: 'Test Bar Good',
          actionType: 'add_dependency',
          description: 'Connect API to DB',
          sourceNode: 'test-api',
          targetNode: 'test-db',
        },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.allowed).toBe(true);
    });

    it('validate_action denies undeclared CALM connections', async () => {
      const result = await client.callTool({
        name: 'validate_action',
        arguments: {
          barName: 'Test Bar Good',
          actionType: 'add_dependency',
          description: 'Bypass API layer',
          sourceNode: 'test-database',
          targetNode: 'nonexistent-node',
        },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.allowed).toBe(false);
      expect(data.violations.some((v: { category: string }) => v.category === 'calm_flow')).toBe(true);
    });

    it('validate_action returns error for unknown BAR', async () => {
      const result = await client.callTool({
        name: 'validate_action',
        arguments: {
          barName: 'nonexistent',
          actionType: 'general',
          description: 'Test',
        },
      });
      expect(result.isError).toBe(true);
    });

    it('get_constraints returns tier and permissions for autonomous BAR', async () => {
      const result = await client.callTool({
        name: 'get_constraints',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.tier).toBe('autonomous');
      expect(data.permissions.canBash).toBe(true);
      expect(data.permissions.canWrite).toBe(true);
      expect(data.permissions.canCreateService).toBe(true);
      expect(data.constraints.length).toBeGreaterThan(0);
      expect(data.securityCriticalPaths.length).toBeGreaterThan(0);
    });

    it('get_constraints returns restricted permissions for empty BAR', async () => {
      const result = await client.callTool({
        name: 'get_constraints',
        arguments: { barName: 'Test Bar Empty' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.tier).toBe('restricted');
      expect(data.permissions.canBash).toBe(false);
      expect(data.permissions.canWrite).toBe(false);
      expect(data.constraints.some((c: string) => c.includes('Plan first'))).toBe(true);
    });

    it('get_constraints returns error for unknown BAR', async () => {
      const result = await client.callTool({
        name: 'get_constraints',
        arguments: { barName: 'nonexistent' },
      });
      expect(result.isError).toBe(true);
    });
  });

  // ==========================================================================
  // Phase 4: Platform Architecture Tools
  // ==========================================================================

  describe('Phase 4 — Platform Architecture Tools', () => {
    it('get_platform_architecture returns CALM model for valid platform', async () => {
      const result = await client.callTool({
        name: 'get_platform_architecture',
        arguments: { platformName: 'Test Platform' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.platformId).toBe('PLT-TEST');
      expect(data.nodes).toHaveLength(3);
      expect(data.relationships).toHaveLength(3);
    });

    it('get_platform_architecture returns error for unknown platform', async () => {
      const result = await client.callTool({
        name: 'get_platform_architecture',
        arguments: { platformName: 'Nonexistent Platform' },
      });
      expect(result.isError).toBe(true);
    });

    it('get_platform_architecture matches by platform ID', async () => {
      const result = await client.callTool({
        name: 'get_platform_architecture',
        arguments: { platformName: 'PLT-TEST' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.platformName).toBe('Test Platform');
    });

    it('blast_radius returns linked BARs for test-bar-good', async () => {
      const result = await client.callTool({
        name: 'blast_radius',
        arguments: { barName: 'Test Bar Good' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.impactLevel).toBe('medium');
      expect(data.totalConnections).toBeGreaterThanOrEqual(2);
      expect(data.linkedBars.length).toBeGreaterThanOrEqual(1);
      expect(data.sharedInfrastructure.length).toBeGreaterThanOrEqual(1);
    });

    it('blast_radius returns error for unknown BAR', async () => {
      const result = await client.callTool({
        name: 'blast_radius',
        arguments: { barName: 'nonexistent' },
      });
      expect(result.isError).toBe(true);
    });

    it('validate_platform_calm passes for valid fixture', async () => {
      const result = await client.callTool({
        name: 'validate_platform_calm',
        arguments: { platformName: 'Test Platform' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.valid).toBe(true);
      expect(data.errors).toHaveLength(0);
    });

    it('validate_platform_calm returns error for unknown platform', async () => {
      const result = await client.callTool({
        name: 'validate_platform_calm',
        arguments: { platformName: 'nonexistent' },
      });
      expect(result.isError).toBe(true);
    });

    it('get_bar_context includes linkedBars', async () => {
      const result = await client.callTool({
        name: 'get_bar_context',
        arguments: { barName: 'Test Bar Good' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.linkedBars).toBeDefined();
      expect(Array.isArray(data.linkedBars)).toBe(true);
      expect(data.linkedBars.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Phase 5: Policy Engine — Orchestration Decision
  // ==========================================================================

  describe('Phase 5 — Orchestration Decision', () => {
    it('get_orchestration_decision returns full decision for known BAR', async () => {
      const result = await client.callTool({
        name: 'get_orchestration_decision',
        arguments: { barName: 'Test Bar Good' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.barId).toBe('APP-TEST-001');
      expect(data.barName).toBe('Test Bar Good');
      expect(data.effectiveTier).toBeDefined();
      expect(data.permissions).toBeDefined();
      expect(data.review).toBeDefined();
      expect(data.reasoning).toBeInstanceOf(Array);
      expect(data.reasoning.length).toBeGreaterThan(0);
    });

    it('get_orchestration_decision returns restricted for empty BAR', async () => {
      const result = await client.callTool({
        name: 'get_orchestration_decision',
        arguments: { barName: 'Test Bar Empty' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.effectiveTier).toBe('restricted');
      expect(data.promptInjections.length).toBeGreaterThan(0);
    });

    it('get_orchestration_decision returns error for unknown BAR', async () => {
      const result = await client.callTool({
        name: 'get_orchestration_decision',
        arguments: { barName: 'nonexistent' },
      });
      expect(result.isError).toBe(true);
    });

    it('scaffold_agent_config includes governance-context.md in files', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.files.some((f: { path: string }) => f.path === '.redqueen/governance-context.md')).toBe(true);
    });

    it('scaffold_agent_config includes decision when policy-driven', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.decision).toBeDefined();
      expect(data.decision.effectiveTier).toBeDefined();
      expect(data.decision.reasoning).toBeInstanceOf(Array);
    });

    it('scaffold_agent_config includes decision.json with BAR context', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const decisionFile = data.files.find((f: { path: string }) => f.path === '.redqueen/decision.json');
      expect(decisionFile).toBeDefined();
      // Verify enriched fields in decision.json file content
      const enriched = JSON.parse(decisionFile.content);
      expect(enriched.compositeScore).toBeGreaterThanOrEqual(0);
      expect(enriched.pillarScores).toBeDefined();
      expect(enriched.pillarScores.architecture).toBeGreaterThanOrEqual(0);
      expect(enriched.pillarScores.security).toBeGreaterThanOrEqual(0);
      expect(enriched.criticality).toBeDefined();
      expect(enriched.effectiveTier).toBeDefined();
      expect(enriched.barId).toBeDefined();
    });

    // Phase 7: score_snapshot tool
    it('score_snapshot records a snapshot and returns delta', async () => {
      const result = await client.callTool({
        name: 'score_snapshot',
        arguments: { barName: 'Test Bar Good', correlationId: 'test-123' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      expect(data.barName).toBe('Test Bar Good');
      expect(data.scores).toBeDefined();
      expect(data.scores.composite).toBeGreaterThanOrEqual(0);
      expect(data.delta).toBeDefined();
      expect(data.trend).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('score_snapshot returns error for unknown BAR', async () => {
      const result = await client.callTool({
        name: 'score_snapshot',
        arguments: { barName: 'Nonexistent BAR' },
      });
      expect(result.isError).toBeTruthy();
    });

    // Phase 7: Review workflow + subagent definitions
    it('scaffold_agent_config includes review workflow when agentType is set', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      expect(result.isError).toBeFalsy();
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const paths = data.files.map((f: { path: string }) => f.path);

      // Review workflow generated because mesh.yaml has agent_type: claude
      expect(paths).toContain('.github/workflows/redqueen-review.yml');
      expect(paths).toContain('.redqueen/consensus.js');
      expect(paths).toContain('.claude/agents/security-reviewer.md');
      expect(paths).toContain('.claude/agents/architecture-reviewer.md');
    });

    it('review workflow contains agent-specific steps', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const workflow = data.files.find((f: { path: string }) => f.path === '.github/workflows/redqueen-review.yml');
      expect(workflow).toBeDefined();
      // Should contain Claude-specific action
      expect(workflow.content).toContain('anthropics/claude-code-action@v1');
      expect(workflow.content).toContain('Red Queen Review');
      expect(workflow.content).toContain('review-depth');
    });

    it('consensus.js is a self-contained Node.js script', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const consensus = data.files.find((f: { path: string }) => f.path === '.redqueen/consensus.js');
      expect(consensus).toBeDefined();
      expect(consensus.content).toContain('resolveConsensus');
      expect(consensus.content).toContain('consensus-result.json');
    });

    it('subagent definitions contain correct agent type', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const secReviewer = data.files.find((f: { path: string }) => f.path === '.claude/agents/security-reviewer.md');
      expect(secReviewer).toBeDefined();
      expect(secReviewer.content).toContain('claude');
      expect(secReviewer.content).toContain('Security Reviewer');
    });

    // Phase 8: Copilot hooks, shell wrapper, implementation workflow
    it('scaffold includes Copilot hooks JSON', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const paths = data.files.map((f: { path: string }) => f.path);
      expect(paths).toContain('.github/hooks/redqueen.json');

      const hooks = data.files.find((f: { path: string }) => f.path === '.github/hooks/redqueen.json');
      expect(hooks).toBeDefined();
      const parsed = JSON.parse(hooks.content);
      expect(parsed.hooks).toBeInstanceOf(Array);
      expect(parsed.hooks[0].type).toBe('preToolUse');
      expect(parsed.hooks[0].script).toContain('validate-tool.sh');
    });

    it('scaffold includes validate-tool.sh shell wrapper', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const paths = data.files.map((f: { path: string }) => f.path);
      expect(paths).toContain('.redqueen/hooks/validate-tool.sh');

      const wrapper = data.files.find((f: { path: string }) => f.path === '.redqueen/hooks/validate-tool.sh');
      expect(wrapper).toBeDefined();
      expect(wrapper.content).toContain('#!/usr/bin/env bash');
      expect(wrapper.content).toContain('validate-tool.js');
    });

    it('scaffold includes implementation workflow', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const paths = data.files.map((f: { path: string }) => f.path);
      expect(paths).toContain('.github/workflows/redqueen-implement.yml');

      const workflow = data.files.find((f: { path: string }) => f.path === '.github/workflows/redqueen-implement.yml');
      expect(workflow).toBeDefined();
      expect(workflow.content).toContain('Red Queen Implement');
      expect(workflow.content).toContain('anthropics/claude-code-action@v1');
      expect(workflow.content).toContain('implement');
    });

    it('claude settings hook references validate-tool.sh', async () => {
      const result = await client.callTool({
        name: 'scaffold_agent_config',
        arguments: { barName: 'Test Bar Good' },
      });
      const data = JSON.parse((result.content as Array<{ text: string }>)[0].text);
      const settings = data.files.find((f: { path: string }) => f.path === '.claude/settings.json');
      expect(settings).toBeDefined();
      expect(settings.content).toContain('validate-tool.sh');
      expect(settings.content).not.toMatch(/validate-tool\.js["']/);
    });
  });
});
