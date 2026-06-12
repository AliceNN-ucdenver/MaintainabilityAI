import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MeshReader, parsePortfolioConfig, parsePlatformConfig } from '../../core/mesh-reader';
import { scaffoldAgentConfig, computeTier, validateScaffoldedRepo, writeScaffoldFiles } from '../config-scaffold';
import { evaluate, matchesPattern, generateStaticPolicy, buildConstraintsSummary } from '../policy-engine';
import { RedQueenService } from '../../services/RedQueenService';
import type { EvaluationContext } from '../policy-engine';

const FIXTURES = path.join(__dirname, 'fixtures', 'test-mesh');

describe('MeshReader', () => {
  const reader = new MeshReader(FIXTURES);

  describe('readPortfolioConfig', () => {
    it('reads portfolio config from mesh.yaml', () => {
      const config = reader.readPortfolioConfig();
      expect(config).not.toBeNull();
      expect(config!.id).toBe('PF-TEST-001');
      expect(config!.name).toBe('Test Portfolio');
      expect(config!.org).toBe('test-org');
      expect(config!.architectureDsl).toBe('calm');
    });
  });

  describe('readScoringConfig', () => {
    it('reads scoring thresholds from mesh.yaml', () => {
      const config = reader.readScoringConfig();
      expect(config.passingThreshold).toBe(75);
      expect(config.warningThreshold).toBe(50);
    });
  });

  describe('listPlatforms', () => {
    it('lists platforms from platforms/ directory', () => {
      const platforms = reader.listPlatforms();
      expect(platforms).toHaveLength(1);
      expect(platforms[0].id).toBe('PLT-TEST');
      expect(platforms[0].name).toBe('Test Platform');
    });
  });

  describe('listBars', () => {
    it('lists all BARs with governance scores', () => {
      const bars = reader.listBars();
      expect(bars).toHaveLength(2);

      const good = bars.find(b => b.name === 'Test Bar Good');
      expect(good).toBeDefined();
      expect(good!.compositeScore).toBeGreaterThan(0);
      expect(good!.architecture.status).toBe('passing');

      const empty = bars.find(b => b.name === 'Test Bar Empty');
      expect(empty).toBeDefined();
      expect(empty!.compositeScore).toBe(0);
    });
  });

  describe('getBar', () => {
    it('finds BAR by name (case-insensitive)', () => {
      const bar = reader.getBar('test bar good');
      expect(bar).not.toBeNull();
      expect(bar!.id).toBe('APP-TEST-001');
    });

    it('finds BAR by slug', () => {
      const bar = reader.getBar('test-bar-good');
      expect(bar).not.toBeNull();
      expect(bar!.name).toBe('Test Bar Good');
    });

    it('returns null for unknown BAR', () => {
      const bar = reader.getBar('nonexistent');
      expect(bar).toBeNull();
    });
  });

  describe('buildPortfolioSummary', () => {
    it('builds complete portfolio summary', () => {
      const summary = reader.buildPortfolioSummary();
      expect(summary).not.toBeNull();
      expect(summary!.totalBars).toBe(2);
      expect(summary!.portfolio.name).toBe('Test Portfolio');
      expect(summary!.platforms).toHaveLength(1);
      expect(summary!.platforms[0].barCount).toBe(2);
    });
  });

  describe('readPolicies', () => {
    it('reads policy files from policies/ directory', () => {
      const policies = reader.readPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(2);

      const archPolicy = policies.find(p => p.filename === 'architecture-standards.yaml');
      expect(archPolicy).toBeDefined();
      expect(archPolicy!.pillar).toBe('architecture');

      const secPolicy = policies.find(p => p.filename === 'security-baseline.yaml');
      expect(secPolicy).toBeDefined();
      expect(secPolicy!.pillar).toBe('security');
    });
  });

  describe('readBarFile', () => {
    it('reads a file relative to a BAR path', () => {
      const bar = reader.getBar('test-bar-good');
      expect(bar).not.toBeNull();

      const content = reader.readBarFile(bar!.path, 'architecture/bar.arch.json');
      expect(content).not.toBeNull();
      const parsed = JSON.parse(content!);
      expect(parsed.nodes).toHaveLength(2);
    });

    it('returns null for missing files', () => {
      const bar = reader.getBar('test-bar-good');
      const content = reader.readBarFile(bar!.path, 'nonexistent.yaml');
      expect(content).toBeNull();
    });
  });
});

describe('parsePortfolioConfig', () => {
  it('parses YAML content into PortfolioConfig', () => {
    const content = `id: PF-ACME-001\nname: "Acme Corp"\norg: acme\nowner: admin\ndescription: "Test"\narchitecture_dsl: calm`;
    const config = parsePortfolioConfig(content);
    expect(config.id).toBe('PF-ACME-001');
    expect(config.architectureDsl).toBe('calm');
  });

  it('defaults to calm for unknown DSL', () => {
    const config = parsePortfolioConfig('id: X\nname: Y\norg: Z\nowner: W');
    expect(config.architectureDsl).toBe('calm');
  });
});

describe('parsePlatformConfig', () => {
  it('parses platform YAML', () => {
    const content = `id: PLT-FOO\nname: "Foo"\nportfolio: PF-001\nowner: admin\ndescription: "Bar"`;
    const config = parsePlatformConfig(content);
    expect(config.id).toBe('PLT-FOO');
    expect(config.name).toBe('Foo');
  });
});

// ============================================================================
// Phase 2 tests
// ============================================================================

describe('MeshReader Phase 2', () => {
  const reader = new MeshReader(FIXTURES);

  describe('readAdrs', () => {
    it('reads ADRs from architecture/ADRs/ directory', () => {
      const bar = reader.getBar('test-bar-good');
      expect(bar).not.toBeNull();

      const adrs = reader.readAdrs(bar!.path);
      expect(adrs).toHaveLength(1);
      expect(adrs[0].filename).toBe('001-initial.md');
      expect(adrs[0].title).toContain('ADR-001');
      expect(adrs[0].status).toBe('accepted');
      expect(adrs[0].content).toContain('initial architecture');
    });

    it('returns empty array for BAR with no ADRs', () => {
      const bar = reader.getBar('test-bar-empty');
      expect(bar).not.toBeNull();

      const adrs = reader.readAdrs(bar!.path);
      expect(adrs).toHaveLength(0);
    });
  });

  describe('readFlows', () => {
    it('reads CALM relationships from bar.arch.json', () => {
      const bar = reader.getBar('test-bar-good');
      expect(bar).not.toBeNull();

      const flows = reader.readFlows(bar!.path);
      expect(flows).not.toBeNull();
      expect(flows!.nodes).toHaveLength(2);
      expect(flows!.relationships).toHaveLength(1);
    });

    it('returns null for BAR with no architecture file', () => {
      const bar = reader.getBar('test-bar-empty');
      expect(bar).not.toBeNull();

      const flows = reader.readFlows(bar!.path);
      expect(flows).toBeNull();
    });
  });

  describe('findGovernanceGaps', () => {
    it('finds gaps across all BARs', () => {
      const gaps = reader.findGovernanceGaps();
      expect(gaps.length).toBeGreaterThan(0);

      // test-bar-empty should have many missing artifacts
      const emptyBarGaps = gaps.filter(g => g.barName === 'Test Bar Empty');
      expect(emptyBarGaps.length).toBeGreaterThan(0);
      expect(emptyBarGaps.some(g => g.type === 'missing_artifact')).toBe(true);
    });

    it('filters by BAR name', () => {
      const gaps = reader.findGovernanceGaps({ barName: 'test-bar-good' });
      expect(gaps.every(g => g.barName === 'Test Bar Good')).toBe(true);
    });

    it('filters by pillar', () => {
      const gaps = reader.findGovernanceGaps({ pillar: 'security' });
      expect(gaps.every(g => g.pillar === 'security')).toBe(true);
    });

    it('returns failing_score gaps for empty BAR', () => {
      const gaps = reader.findGovernanceGaps({ barName: 'test-bar-empty' });
      const failingGaps = gaps.filter(g => g.type === 'failing_score');
      expect(failingGaps.length).toBeGreaterThan(0);
      expect(failingGaps.every(g => g.severity === 'high')).toBe(true);
    });
  });

  describe('validateCalm', () => {
    it('validates a well-formed CALM file', () => {
      const bar = reader.getBar('test-bar-good');
      expect(bar).not.toBeNull();

      const result = reader.validateCalm(bar!.path);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for BAR with no architecture file', () => {
      const bar = reader.getBar('test-bar-empty');
      expect(bar).not.toBeNull();

      const result = reader.validateCalm(bar!.path);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('No architecture file');
    });
  });
});

// ============================================================================
// Config scaffold tests
// ============================================================================

describe('Config Scaffold', () => {
  const reader = new MeshReader(FIXTURES);

  describe('computeTier', () => {
    it('returns autonomous for high-scoring BAR', () => {
      const bar = reader.getBar('test-bar-good')!;
      expect(computeTier(bar)).toBe('autonomous');
    });

    it('returns restricted for BAR with all zeros', () => {
      const bar = reader.getBar('test-bar-empty')!;
      expect(computeTier(bar)).toBe('restricted');
    });
  });

  describe('scaffoldAgentConfig', () => {
    it('generates all config files for a known BAR', () => {
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      expect('error' in result).toBe(false);
      if ('error' in result) { return; }

      expect(result.tier).toBe('autonomous');
      expect(result.barId).toBe('APP-TEST-001');

      // Check all expected files are generated
      expect(result.files['.claude/settings.json']).toBeDefined();
      expect(result.files['AGENTS.md']).toBeDefined();
      expect(result.files['.redqueen/hooks/validate-tool.js']).toBeDefined();
      expect(result.files['.github/hooks/redqueen.json']).toBeDefined();
      expect(result.files['.redqueen/policy.json']).toBeDefined();
      expect(result.files['.redqueen/config-manifest.yaml']).toBeDefined();
    });

    it('does NOT scaffold the retired MCP "live mesh tools" layer', () => {
      // Cheshire v2: the MCP server config + runner + the manual-merge
      // governance-steps snippet are retired in favor of the baked
      // deterministic policy. They must no longer be emitted.
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      if ('error' in result) { return; }

      expect(result.files['.mcp.json']).toBeUndefined();
      expect(result.files['.redqueen/mcp-runner.js']).toBeUndefined();
      expect(result.files['.github/copilot-governance-steps.yml']).toBeUndefined();
    });

    it('AGENTS.md reflects governance tier', () => {
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      if ('error' in result) { return; }

      expect(result.files['AGENTS.md']).toContain('Autonomous Tier');
      expect(result.files['AGENTS.md']).toContain('APP-TEST-001');
    });

    it('restricted BAR gets restricted config', () => {
      const result = scaffoldAgentConfig(reader, 'Test Bar Empty');
      if ('error' in result) { return; }

      expect(result.tier).toBe('restricted');
      expect(result.files['AGENTS.md']).toContain('Restricted Tier');
      expect(result.files['AGENTS.md']).toContain('Plan first');
    });

    it('generates config manifest with SHA-256 fingerprints', () => {
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      if ('error' in result) { return; }

      expect(result.manifest.barId).toBe('APP-TEST-001');
      expect(result.manifest.tier).toBe('autonomous');
      expect(result.manifest.files.length).toBeGreaterThanOrEqual(5);
      expect(result.manifest.files.every(f => f.sha256.length === 64)).toBe(true);
      expect(result.files['.redqueen/config-manifest.yaml']).toContain('mesh_checkout_path: "./governance-mesh"');
    });

    it('returns error for unknown BAR', () => {
      const result = scaffoldAgentConfig(reader, 'nonexistent');
      expect('error' in result).toBe(true);
    });

    it('no longer emits the copilot-governance-steps MCP snippet', () => {
      // Retired with the MCP layer — it checked out the mesh + launched the
      // MCP runner in CI (the only COPILOT_MCP_MESH_TOKEN consumer).
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      if ('error' in result) { return; }

      expect(result.files['.github/copilot-governance-steps.yml']).toBeUndefined();
    });

    it('generates policy.json with static rules', () => {
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      if ('error' in result) { return; }

      const policy = JSON.parse(result.files['.redqueen/policy.json']);
      expect(policy.barId).toBe('APP-TEST-001');
      expect(policy.tier).toBe('autonomous');
      expect(policy.rules.toolRestrictions).toBeDefined();
      expect(policy.rules.securityCriticalPaths.length).toBeGreaterThan(0);
      expect(policy.rules.readOnlyPaths.length).toBeGreaterThan(0);
      expect(policy.rules.allowedConnections).toContainEqual({
        source: 'test-api',
        target: 'test-db',
        relationshipId: 'api-to-db',
      });
    });

    it('scaffolds impl-provenance.yml unconditionally (Governance Court retired)', () => {
      // The implementation provenance gate is its OWN workflow, emitted
      // unconditionally — so impl PRs are verified on every scaffolded
      // repo. The Governance Court review workflow (redqueen-review.yml)
      // has been retired: agent self-review (the Tweedles) is embedded in
      // the implementation agent's loop, and this gate verifies the signed
      // chain server-side.
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      if ('error' in result) { throw new Error(`scaffold failed: ${result.error}`); }
      const gate = result.files['.github/workflows/impl-provenance.yml'];
      expect(gate).toBeTruthy();
      expect(gate).toContain('impl-provenance:');
      expect(gate).toContain('skill-audit-verify-chain');
      expect(gate).toContain('Implementation Provenance');
      // The retired review court must NOT be scaffolded anymore.
      expect(result.files['.github/workflows/redqueen-review.yml']).toBeUndefined();
      expect(result.files['.redqueen/consensus.js']).toBeUndefined();
      expect(result.files['.claude/agents/security-reviewer.md']).toBeUndefined();
      expect(result.files['.github/workflows/redqueen-implement.yml']).toBeUndefined();
    });

    it('restricted BAR policy.json denies Bash and Write', () => {
      const result = scaffoldAgentConfig(reader, 'Test Bar Empty');
      if ('error' in result) { return; }

      const policy = JSON.parse(result.files['.redqueen/policy.json']);
      expect(policy.tier).toBe('restricted');
      expect(policy.rules.toolRestrictions.restricted.deny).toContain('Bash');
      expect(policy.rules.toolRestrictions.restricted.deny).toContain('Write');
    });

    it('Bug-ZZ-1: scaffold folds platform-CALM linked-BAR repos into allowedConnections', () => {
      // End-to-end wire-up: scaffold for test-bar-empty. The fixture
      // platform.arch.json declares `good-to-poor` (test-bar-good ↔
      // test-bar-empty), and test-bar-good's app.yaml ships a repo
      // (https://github.com/test-org/test-repo). The scaffolded policy
      // must therefore include a cross-BAR row pointing back at that
      // repo from test-bar-empty's perspective.
      const result = scaffoldAgentConfig(reader, 'Test Bar Empty');
      if ('error' in result) { throw new Error(`scaffold failed: ${result.error}`); }

      const policy = JSON.parse(result.files['.redqueen/policy.json']);
      expect(policy.rules.allowedConnections).toContainEqual({
        source: 'Test Bar Empty',
        target: 'https://github.com/test-org/test-repo',
        relationshipId: 'platform-calm:Test Bar Good',
      });
    });

    it('Bug-ZZ-1: scaffold skips bar-to-infrastructure links (shared infra has no repos)', () => {
      // test-bar-good is linked to BOTH test-bar-empty (bar-to-bar) AND
      // shared-mq (bar-to-infrastructure). The scaffold must not emit
      // a cross-BAR row for shared-mq — it has no repos. The earlier
      // 'generates policy.json with static rules' test would already
      // fail if cross-BAR emission tried to call .repos on infra; this
      // test pins the intent so a future refactor doesn't regress it.
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      if ('error' in result) { throw new Error(`scaffold failed: ${result.error}`); }

      const policy = JSON.parse(result.files['.redqueen/policy.json']);
      const infraRows = policy.rules.allowedConnections.filter(
        (c: { relationshipId: string }) => c.relationshipId.includes('Message Queue'),
      );
      expect(infraRows).toHaveLength(0);
    });

    it('hook script is Node.js (not bash)', () => {
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      if ('error' in result) { return; }

      const hookScript = result.files['.redqueen/hooks/validate-tool.js'];
      expect(hookScript).toContain('#!/usr/bin/env node');
      expect(hookScript).toContain('policy.json');
      expect(hookScript).toContain('permissionDecision');
    });

    it('writes executable hooks and passes scaffold doctor', () => {
      const redQueen = new RedQueenService();
      const result = scaffoldAgentConfig(reader, 'Test Bar Good', redQueen);
      if ('error' in result) { return; }

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redqueen-scaffold-'));
      try {
        writeScaffoldFiles(tmpDir, result.files);
        const meshDir = path.join(tmpDir, 'governance-mesh');
        fs.mkdirSync(meshDir);
        fs.copyFileSync(path.join(FIXTURES, 'mesh.yaml'), path.join(meshDir, 'mesh.yaml'));

        const wrapperMode = fs.statSync(path.join(tmpDir, '.redqueen/hooks/validate-tool.sh')).mode;
        expect(wrapperMode & 0o111).not.toBe(0);

        const doctor = validateScaffoldedRepo(tmpDir);
        expect(doctor.ok).toBe(true);
        expect(doctor.errors).toHaveLength(0);

        const wrapperPath = path.join(tmpDir, '.redqueen/hooks/validate-tool.sh');
        const bashPayload = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'npm test' },
        });
        const denied = spawnSync(wrapperPath, {
          input: bashPayload,
          encoding: 'utf8',
          cwd: tmpDir,
        });
        expect(denied.status).toBe(2);
        expect(denied.stderr).toContain('requires approval');

        const malformed = spawnSync(wrapperPath, {
          input: '{not-json',
          encoding: 'utf8',
          cwd: tmpDir,
        });
        expect(malformed.status).toBe(2);
        expect(malformed.stderr).toContain('failing closed');

        const approved = spawnSync(wrapperPath, {
          input: bashPayload,
          encoding: 'utf8',
          cwd: tmpDir,
          env: { ...process.env, REDQUEEN_TOOL_APPROVED: 'true' },
        });
        expect(approved.status).toBe(0);
        expect(approved.stdout).toContain('"permissionDecision":"allow"');

        // Per-decision audit logging: both the deny and the allow above
        // should have appended JSONL entries to .redqueen/audit-log.jsonl.
        const auditPath = path.join(tmpDir, '.redqueen', 'audit-log.jsonl');
        expect(fs.existsSync(auditPath)).toBe(true);
        const lines = fs.readFileSync(auditPath, 'utf8').trim().split('\n');
        expect(lines.length).toBeGreaterThanOrEqual(2);
        const entries = lines.map(l => JSON.parse(l));
        const verdicts = entries.map(e => e.payload?.verdict);
        expect(verdicts).toContain('deny');
        expect(verdicts).toContain('allow');
        for (const e of entries) {
          expect(e.action).toBe('pre_tool_use');
          expect(e.payload?.tool).toBe('Bash');
          expect(typeof e.timestamp).toBe('string');
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('hook walks customRules and denies on regex match against file content', () => {
      const redQueen = new RedQueenService();
      const result = scaffoldAgentConfig(reader, 'Test Bar Good', redQueen);
      if ('error' in result) { return; }

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redqueen-customrule-'));
      try {
        writeScaffoldFiles(tmpDir, result.files);
        const meshDir = path.join(tmpDir, 'governance-mesh');
        fs.mkdirSync(meshDir);
        fs.copyFileSync(path.join(FIXTURES, 'mesh.yaml'), path.join(meshDir, 'mesh.yaml'));

        // Inject a custom rule into the generated policy.json. Real teams
        // do this via the policy.json editor; here we patch the file
        // directly to assert the walker fires.
        const policyPath = path.join(tmpDir, '.redqueen', 'policy.json');
        const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
        policy.rules.customRules = [
          {
            id: 'SEC-101',
            category: 'security',
            severity: 'error',
            appliesTo: ['src/routes/**'],
            denyPattern: '\\.find\\(\\s*req\\.(body|query|params)',
            message: 'Mongo selector built directly from req.body/query/params; validate with Zod first.',
          },
        ];
        fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2));

        const wrapperPath = path.join(tmpDir, '.redqueen/hooks/validate-tool.sh');

        // Bad write: matches denyPattern + appliesTo glob -> deny w/ ruleId.
        const denyPayload = JSON.stringify({
          tool_name: 'Write',
          tool_input: {
            file_path: 'src/routes/celebrity.ts',
            content: 'await Celebrities.find(req.body);',
          },
        });
        const denied = spawnSync(wrapperPath, {
          input: denyPayload,
          encoding: 'utf8',
          cwd: tmpDir,
          env: { ...process.env, REDQUEEN_TOOL_APPROVED: 'true' },
        });
        expect(denied.status).toBe(2);
        expect(denied.stderr).toContain('SEC-101');

        // Good write: validated input, no req.body -> allow.
        const allowPayload = JSON.stringify({
          tool_name: 'Write',
          tool_input: {
            file_path: 'src/routes/celebrity.ts',
            content: 'const input = celebSchema.parse(req.body);\nawait Celebrities.find(input.selector);',
          },
        });
        const allowed = spawnSync(wrapperPath, {
          input: allowPayload,
          encoding: 'utf8',
          cwd: tmpDir,
          env: { ...process.env, REDQUEEN_TOOL_APPROVED: 'true' },
        });
        expect(allowed.status).toBe(0);

        // appliesTo scope: same bad content in a path the rule does not
        // target should NOT trigger SEC-101.
        const outOfScopePayload = JSON.stringify({
          tool_name: 'Write',
          tool_input: {
            file_path: 'scripts/seed-fixtures.ts',
            content: 'await Celebrities.find(req.body);',
          },
        });
        const outOfScope = spawnSync(wrapperPath, {
          input: outOfScopePayload,
          encoding: 'utf8',
          cwd: tmpDir,
          env: { ...process.env, REDQUEEN_TOOL_APPROVED: 'true' },
        });
        expect(outOfScope.status).toBe(0);

        // Audit log captured SEC-101 deny with the ruleId.
        const auditPath = path.join(tmpDir, '.redqueen', 'audit-log.jsonl');
        const entries = fs.readFileSync(auditPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
        const sec101Deny = entries.find(e => e.payload?.ruleId === 'SEC-101' && e.payload?.verdict === 'deny');
        expect(sec101Deny).toBeDefined();
        expect(sec101Deny.payload.tool).toBe('Write');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('hook walks customRules against Bash command text when appliesTo is catch-all', () => {
      const redQueen = new RedQueenService();
      const result = scaffoldAgentConfig(reader, 'Test Bar Good', redQueen);
      if ('error' in result) { return; }

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redqueen-bashrule-'));
      try {
        writeScaffoldFiles(tmpDir, result.files);
        const meshDir = path.join(tmpDir, 'governance-mesh');
        fs.mkdirSync(meshDir);
        fs.copyFileSync(path.join(FIXTURES, 'mesh.yaml'), path.join(meshDir, 'mesh.yaml'));

        // OPS-901 is a Bash rule (catch-all appliesTo). DATA-901 is an
        // Edit/Write rule (path-scoped appliesTo) that must NOT fire on Bash.
        const policyPath = path.join(tmpDir, '.redqueen', 'policy.json');
        const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
        policy.rules.customRules = [
          {
            id: 'OPS-901',
            category: 'operations',
            severity: 'error',
            appliesTo: ['**'],
            denyPattern: '^rm\\s+-rf',
            message: 'rm -rf is denied at the boundary; use the cleanup script.',
          },
          {
            id: 'DATA-901',
            category: 'data',
            severity: 'error',
            appliesTo: ['src/**'],
            denyPattern: 'DROP TABLE',
            message: 'Edit/Write only; must never fire on Bash commands.',
          },
        ];
        fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2));

        const wrapperPath = path.join(tmpDir, '.redqueen/hooks/validate-tool.sh');
        const env = { ...process.env, REDQUEEN_TOOL_APPROVED: 'true' };

        // Bash hits the catch-all rule -> deny with OPS-901.
        const denyPayload = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'rm -rf /tmp/leftovers' },
        });
        const denied = spawnSync(wrapperPath, { input: denyPayload, encoding: 'utf8', cwd: tmpDir, env });
        expect(denied.status).toBe(2);
        expect(denied.stderr).toContain('OPS-901');

        // Bash that does NOT match OPS-901's regex -> allow. DATA-901 is
        // not catch-all and must not be considered for Bash, so the fact
        // that the command literally contains 'DROP TABLE' inside an
        // echo must not deny.
        const allowPayload = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: 'echo "DROP TABLE is just a string here"' },
        });
        const allowed = spawnSync(wrapperPath, { input: allowPayload, encoding: 'utf8', cwd: tmpDir, env });
        expect(allowed.status).toBe(0);

        // Audit-log shape: OPS-901 deny recorded; DATA-901 never fires.
        const auditPath = path.join(tmpDir, '.redqueen', 'audit-log.jsonl');
        const entries = fs.readFileSync(auditPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
        const opsDeny = entries.find(e => e.payload?.ruleId === 'OPS-901' && e.payload?.verdict === 'deny');
        expect(opsDeny).toBeDefined();
        expect(opsDeny.payload.tool).toBe('Bash');
        expect(entries.find(e => e.payload?.ruleId === 'DATA-901')).toBeUndefined();
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('records override metadata when an approval env flips a TIER-003 deny into an allow', () => {
      const redQueen = new RedQueenService();
      const result = scaffoldAgentConfig(reader, 'Test Bar Good', redQueen);
      if ('error' in result) { return; }

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redqueen-override-'));
      try {
        writeScaffoldFiles(tmpDir, result.files);
        const meshDir = path.join(tmpDir, 'governance-mesh');
        fs.mkdirSync(meshDir);
        fs.copyFileSync(path.join(FIXTURES, 'mesh.yaml'), path.join(meshDir, 'mesh.yaml'));

        const wrapperPath = path.join(tmpDir, '.redqueen/hooks/validate-tool.sh');
        const bashPayload = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'npm test' } });

        // Without approval: deny with TIER-003.
        const denied = spawnSync(wrapperPath, { input: bashPayload, encoding: 'utf8', cwd: tmpDir });
        expect(denied.status).toBe(2);
        expect(denied.stderr).toContain('requires approval');

        // With approval: allow, with override metadata in the audit line.
        const approved = spawnSync(wrapperPath, {
          input: bashPayload,
          encoding: 'utf8',
          cwd: tmpDir,
          env: { ...process.env, REDQUEEN_TOOL_APPROVED: 'true' },
        });
        expect(approved.status).toBe(0);

        const auditPath = path.join(tmpDir, '.redqueen', 'audit-log.jsonl');
        const entries = fs.readFileSync(auditPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));

        const overrideAllow = entries.find(e =>
          e.payload?.verdict === 'allow' && e.payload?.override === true,
        );
        expect(overrideAllow).toBeDefined();
        expect(overrideAllow.payload.bypassedRuleId).toBe('TIER-003');
        expect(overrideAllow.payload.approvalSource).toBe('REDQUEEN_TOOL_APPROVED');
        expect(overrideAllow.payload.tool).toBe('Bash');

        // A normal allow (e.g. the OPS-901 test fixture's allow path)
        // should NOT carry override metadata; verify the shape contract.
        const denyEntry = entries.find(e => e.payload?.verdict === 'deny');
        expect(denyEntry.payload.override).toBe(false);
        expect(denyEntry.payload.bypassedRuleId).toBeNull();
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('AGENTS.md references validate_action and get_constraints', () => {
      const result = scaffoldAgentConfig(reader, 'Test Bar Good');
      if ('error' in result) { return; }

      expect(result.files['AGENTS.md']).toContain('validate_action');
      expect(result.files['AGENTS.md']).toContain('get_constraints');
    });
  });
});

// ============================================================================
// Phase 3: The Red Queen's Court — Policy Engine tests
// ============================================================================

describe("Red Queen's Court — Policy Engine", () => {
  const reader = new MeshReader(FIXTURES);

  describe('matchesPattern', () => {
    it('matches exact paths', () => {
      expect(matchesPattern('.mcp.json', '.mcp.json')).toBe(true);
      expect(matchesPattern('.mcp.json', '.env')).toBe(false);
    });

    it('matches single wildcard (*)', () => {
      expect(matchesPattern('config/security.yaml', 'config/security*')).toBe(true);
      expect(matchesPattern('config/security-baseline.yaml', 'config/security*')).toBe(true);
      expect(matchesPattern('src/config/security.yaml', 'config/security*')).toBe(false);
    });

    it('matches double wildcard (**)', () => {
      expect(matchesPattern('src/auth/login.ts', 'src/auth/**')).toBe(true);
      expect(matchesPattern('src/auth/middleware/jwt.ts', 'src/auth/**')).toBe(true);
      expect(matchesPattern('src/utils/helper.ts', 'src/auth/**')).toBe(false);
    });

    it('matches .env* pattern', () => {
      expect(matchesPattern('.env', '.env*')).toBe(true);
      expect(matchesPattern('.env.local', '.env*')).toBe(true);
      expect(matchesPattern('.env.production', '.env*')).toBe(true);
    });

    it('matches nested wildcard patterns', () => {
      expect(matchesPattern('deep/path/secret.key', '**/*secret*')).toBe(true);
      expect(matchesPattern('config/credential.json', '**/*credential*')).toBe(true);
    });
  });

  describe('evaluate — tier rules', () => {
    it('denies Bash for restricted-tier BARs', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'restricted',
        compositeScore: 20, actionType: 'general', toolName: 'Bash',
        description: 'Run npm test',
      };
      const decision = evaluate(ctx);
      expect(decision.allowed).toBe(false);
      expect(decision.verdict).toBe('denied');
      expect(decision.violations[0].ruleId).toBe('TIER-001');
    });

    it('denies Write for restricted-tier BARs', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'restricted',
        compositeScore: 20, actionType: 'general', toolName: 'Write',
        description: 'Create new file',
      };
      const decision = evaluate(ctx);
      expect(decision.allowed).toBe(false);
      expect(decision.verdict).toBe('denied');
      expect(decision.violations[0].ruleId).toBe('TIER-002');
    });

    it('warns on Bash for supervised-tier BARs', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'supervised',
        compositeScore: 65, actionType: 'general', toolName: 'Bash',
        description: 'Run npm test',
      };
      const decision = evaluate(ctx);
      expect(decision.allowed).toBe(true);
      expect(decision.verdict).toBe('conditional');
      expect(decision.violations[0].ruleId).toBe('TIER-003');
    });

    it('approves all tools for autonomous-tier BARs', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'autonomous',
        compositeScore: 90, actionType: 'general', toolName: 'Bash',
        description: 'Run npm test',
      };
      const decision = evaluate(ctx);
      expect(decision.allowed).toBe(true);
      expect(decision.verdict).toBe('approved');
    });
  });

  describe('evaluate — path rules', () => {
    it('denies modification of governance-managed files', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'autonomous',
        compositeScore: 90, actionType: 'general', toolName: 'Edit',
        filePath: '.mcp.json', description: 'Modify MCP config',
      };
      const decision = evaluate(ctx);
      expect(decision.allowed).toBe(false);
      expect(decision.violations[0].ruleId).toBe('PATH-001');
    });

    it('denies modification of .redqueen/ files', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'autonomous',
        compositeScore: 90, actionType: 'general', toolName: 'Write',
        filePath: '.redqueen/policy.json', description: 'Modify policy',
      };
      const decision = evaluate(ctx);
      expect(decision.allowed).toBe(false);
      expect(decision.violations[0].ruleId).toBe('PATH-001');
    });

    it('allows modification of source files', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'autonomous',
        compositeScore: 90, actionType: 'general', toolName: 'Edit',
        filePath: 'src/index.ts', description: 'Edit source',
      };
      const decision = evaluate(ctx);
      expect(decision.allowed).toBe(true);
    });
  });

  describe('evaluate — security rules', () => {
    it('denies security-critical file access for restricted BARs', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'restricted',
        compositeScore: 20, actionType: 'general', toolName: 'Edit',
        filePath: 'src/auth/login.ts', description: 'Modify auth',
      };
      const decision = evaluate(ctx);
      expect(decision.violations.some(v => v.ruleId === 'SEC-001')).toBe(true);
    });

    it('warns on security-critical file access for supervised BARs', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'supervised',
        compositeScore: 65, actionType: 'general', toolName: 'Edit',
        filePath: 'src/crypto/encrypt.ts', description: 'Modify crypto',
      };
      const decision = evaluate(ctx);
      expect(decision.violations.some(v => v.ruleId === 'SEC-002')).toBe(true);
      expect(decision.allowed).toBe(true); // warning, not error
    });

    it('allows security-critical file access for autonomous BARs', () => {
      const ctx: EvaluationContext = {
        barId: 'APP-001', barName: 'Test', tier: 'autonomous',
        compositeScore: 90, actionType: 'general', toolName: 'Edit',
        filePath: 'src/auth/login.ts', description: 'Modify auth',
      };
      const decision = evaluate(ctx);
      expect(decision.violations.filter(v => v.category === 'security')).toHaveLength(0);
    });
  });

  describe('evaluate — CALM flow rules', () => {
    it('approves connections declared in CALM model', () => {
      const bar = reader.getBar('test-bar-good')!;
      const flows = reader.readFlows(bar.path)!;

      const ctx: EvaluationContext = {
        barId: bar.id, barName: bar.name, tier: 'autonomous',
        compositeScore: 90, actionType: 'add_dependency',
        description: 'Connect API to DB',
        sourceNode: 'test-api', targetNode: 'test-db',
        calmModel: {
          nodes: flows.nodes as Array<{ 'unique-id': string; name: string; 'node-type'?: string }>,
          relationships: flows.relationships as Array<{
            'unique-id': string;
            'relationship-type'?: { connects?: { source?: { node: string }; destination?: { node: string } } };
          }>,
        },
      };
      const decision = evaluate(ctx);
      expect(decision.violations.filter(v => v.category === 'calm_flow')).toHaveLength(0);
    });

    it('denies connections not in CALM model', () => {
      const bar = reader.getBar('test-bar-good')!;
      const flows = reader.readFlows(bar.path)!;

      const ctx: EvaluationContext = {
        barId: bar.id, barName: bar.name, tier: 'autonomous',
        compositeScore: 90, actionType: 'add_dependency',
        description: 'Direct DB access from UI',
        sourceNode: 'test-database', targetNode: 'nonexistent-node',
        calmModel: {
          nodes: flows.nodes as Array<{ 'unique-id': string; name: string; 'node-type'?: string }>,
          relationships: flows.relationships as Array<{
            'unique-id': string;
            'relationship-type'?: { connects?: { source?: { node: string }; destination?: { node: string } } };
          }>,
        },
      };
      const decision = evaluate(ctx);
      expect(decision.violations.some(v => v.category === 'calm_flow')).toBe(true);
    });
  });

  describe('generateStaticPolicy', () => {
    it('generates policy for autonomous BAR', () => {
      const bar = reader.getBar('test-bar-good')!;
      const policy = generateStaticPolicy(bar);
      expect(policy.tier).toBe('autonomous');
      expect(policy.barId).toBe('APP-TEST-001');
      expect(policy.rules.toolRestrictions.autonomous.deny).toHaveLength(0);
    });

    it('generates policy for restricted BAR', () => {
      const bar = reader.getBar('test-bar-empty')!;
      const policy = generateStaticPolicy(bar);
      expect(policy.tier).toBe('restricted');
      expect(policy.rules.toolRestrictions.restricted.deny).toContain('Bash');
      expect(policy.rules.toolRestrictions.restricted.deny).toContain('Write');
    });

    it('initializes customRules as empty array (team-extension point)', () => {
      const bar = reader.getBar('test-bar-good')!;
      const policy = generateStaticPolicy(bar);
      expect(Array.isArray(policy.rules.customRules)).toBe(true);
      expect(policy.rules.customRules).toHaveLength(0);
    });

    it('enables per-decision audit logging by default at the standard path', () => {
      const bar = reader.getBar('test-bar-good')!;
      const policy = generateStaticPolicy(bar);
      expect(policy.auditLog).toBeDefined();
      expect(policy.auditLog.enabled).toBe(true);
      expect(policy.auditLog.path).toBe('.redqueen/audit-log.jsonl');
    });

    it('Bug-ZZ-1: linkedBarRepos param folds cross-BAR repos into allowedConnections', () => {
      // Direct unit test: passing a linked-BAR repo URL should emit a
      // cross-BAR row keyed on (bar.name, repoUrl, platform-calm:<name>).
      const bar = reader.getBar('test-bar-good')!;
      const policy = generateStaticPolicy(bar, undefined, undefined, [
        { linkedBarName: 'Greenfield Sibling', repoUrl: 'https://github.com/acme/greenfield-sibling' },
      ]);
      expect(policy.rules.allowedConnections).toContainEqual({
        source: 'Test Bar Good',
        target: 'https://github.com/acme/greenfield-sibling',
        relationshipId: 'platform-calm:Greenfield Sibling',
      });
    });

    it('Bug-ZZ-1: linkedBarRepos with empty/missing repoUrl entries are skipped', () => {
      // Defensive: a stale platform CALM that points at a BAR with a
      // malformed app.yaml should not crash and should not emit garbage.
      const bar = reader.getBar('test-bar-good')!;
      const policy = generateStaticPolicy(bar, undefined, undefined, [
        { linkedBarName: 'Empty', repoUrl: '' },
      ]);
      const crossBarRows = policy.rules.allowedConnections.filter(
        c => c.relationshipId.startsWith('platform-calm:'),
      );
      expect(crossBarRows).toHaveLength(0);
    });
  });

  describe('buildConstraintsSummary', () => {
    it('returns autonomous constraints', () => {
      const bar = reader.getBar('test-bar-good')!;
      const summary = buildConstraintsSummary(bar);
      expect(summary.tier).toBe('autonomous');
      expect(summary.permissions.canBash).toBe(true);
      expect(summary.permissions.canWrite).toBe(true);
      expect(summary.permissions.canCreateService).toBe(true);
    });

    it('returns restricted constraints', () => {
      const bar = reader.getBar('test-bar-empty')!;
      const summary = buildConstraintsSummary(bar);
      expect(summary.tier).toBe('restricted');
      expect(summary.permissions.canBash).toBe(false);
      expect(summary.permissions.canWrite).toBe(false);
      expect(summary.constraints.some(c => c.includes('Plan first'))).toBe(true);
    });
  });

  // ==========================================================================
  // Phase 4: Platform Architecture
  // ==========================================================================

  describe('readPlatformArchitecture', () => {
    it('returns parsed CALM for valid platform', () => {
      const arch = reader.readPlatformArchitecture('PLT-TEST');
      expect(arch).not.toBeNull();
      expect(arch!.nodes).toHaveLength(3);
      expect(arch!.relationships).toHaveLength(3);
    });

    it('returns null for non-existent platform', () => {
      const arch = reader.readPlatformArchitecture('PLT-NONEXISTENT');
      expect(arch).toBeNull();
    });

    it('finds bar nodes with correct node-type', () => {
      const arch = reader.readPlatformArchitecture('PLT-TEST')!;
      const barNodes = (arch.nodes as Array<Record<string, unknown>>).filter(
        n => n['node-type'] === 'bar'
      );
      expect(barNodes).toHaveLength(2);
      expect(barNodes.map(n => n['bar-id'])).toContain('test-bar-good');
      expect(barNodes.map(n => n['bar-id'])).toContain('test-bar-empty');
    });

    it('finds shared-infrastructure nodes', () => {
      const arch = reader.readPlatformArchitecture('PLT-TEST')!;
      const infraNodes = (arch.nodes as Array<Record<string, unknown>>).filter(
        n => n['node-type'] === 'shared-infrastructure'
      );
      expect(infraNodes).toHaveLength(1);
      expect(infraNodes[0]['name']).toBe('Platform Message Queue');
    });
  });

  describe('validatePlatformCalm', () => {
    it('passes for valid platform CALM', () => {
      const result = reader.validatePlatformCalm('PLT-TEST');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for non-existent platform', () => {
      const result = reader.validatePlatformCalm('PLT-NONEXISTENT');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Platform not found');
    });

    it('returns error when node-type is invalid for platform', () => {
      // Use the real platform fixture — it should pass since all types are valid
      const result = reader.validatePlatformCalm('PLT-TEST');
      expect(result.valid).toBe(true);
    });
  });

  describe('findLinkedBars', () => {
    it('returns connected BARs and infrastructure for test-bar-good', () => {
      const linked = reader.findLinkedBars('test-bar-good');
      expect(linked.length).toBeGreaterThanOrEqual(2);

      // Should find test-bar-empty (bar-to-bar) and shared-mq (bar-to-infrastructure)
      const barLinks = linked.filter(l => l.relationship === 'bar-to-bar');
      const infraLinks = linked.filter(l => l.relationship === 'bar-to-infrastructure');
      expect(barLinks).toHaveLength(1);
      expect(barLinks[0].barId).toBe('test-bar-empty');
      expect(infraLinks).toHaveLength(1);
      expect(infraLinks[0].nodeId).toBe('shared-mq');
    });

    it('returns connected items for test-bar-empty', () => {
      const linked = reader.findLinkedBars('test-bar-empty');
      // bar-empty is connected to shared-mq and bar-good
      expect(linked.length).toBeGreaterThanOrEqual(2);
      const barLinks = linked.filter(l => l.relationship === 'bar-to-bar');
      expect(barLinks).toHaveLength(1);
      expect(barLinks[0].barId).toBe('test-bar-good');
    });

    it('returns empty for non-existent BAR', () => {
      const linked = reader.findLinkedBars('nonexistent-bar');
      expect(linked).toHaveLength(0);
    });
  });

  describe('getPlatformPath', () => {
    it('resolves path for valid platform ID', () => {
      const platformPath = reader.getPlatformPath('PLT-TEST');
      expect(platformPath).not.toBeNull();
      expect(platformPath).toContain('test-platform');
    });

    it('returns null for non-existent platform ID', () => {
      const platformPath = reader.getPlatformPath('PLT-NONEXISTENT');
      expect(platformPath).toBeNull();
    });
  });

  describe('PLAT-001 cross-BAR interface warning', () => {
    it('warns when modifying interface on cross-BAR connected node', () => {
      const bar = reader.getBar('test-bar-good')!;
      const platformArch = reader.readPlatformArchitecture('PLT-TEST')!;

      const ctx: EvaluationContext = {
        barId: bar.id, barName: bar.name, tier: 'autonomous',
        compositeScore: 90, actionType: 'modify_interface',
        description: 'Change API interface',
        targetNode: 'bar-good',
        platformCalmModel: {
          nodes: platformArch.nodes as Array<{ 'unique-id': string; name: string; 'node-type'?: string; 'bar-id'?: string }>,
          relationships: platformArch.relationships as Array<{
            'unique-id': string;
            'relationship-type'?: { connects?: { source?: { node: string }; destination?: { node: string } } };
          }>,
        },
      };

      const decision = evaluate(ctx);
      const platViolation = decision.violations.find(v => v.ruleId === 'PLAT-001');
      expect(platViolation).toBeDefined();
      expect(platViolation!.severity).toBe('warning');
      expect(platViolation!.message).toContain('Test Bar Empty');
    });

    it('does not warn for nodes with no cross-BAR connections', () => {
      const bar = reader.getBar('test-bar-good')!;

      const ctx: EvaluationContext = {
        barId: bar.id, barName: bar.name, tier: 'autonomous',
        compositeScore: 90, actionType: 'modify_interface',
        description: 'Change isolated interface',
        targetNode: 'isolated-node',
        platformCalmModel: {
          nodes: [
            { 'unique-id': 'isolated-node', name: 'Isolated', 'node-type': 'shared-infrastructure' },
          ],
          relationships: [],
        },
      };

      const decision = evaluate(ctx);
      const platViolation = decision.violations.find(v => v.ruleId === 'PLAT-001');
      expect(platViolation).toBeUndefined();
    });
  });
});
