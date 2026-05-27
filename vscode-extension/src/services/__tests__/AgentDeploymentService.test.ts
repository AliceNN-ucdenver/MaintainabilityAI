/**
 * Tests for the Phase B-PR1 Skills-deployment surface.
 *
 * Strategy: run against the REAL extension `code-templates/skills/` directory
 * (resolved from __dirname) so the registry and the on-disk templates stay
 * in sync. A tmp mesh path is the deploy target.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentDeploymentService } from '../AgentDeploymentService';
import { MESH_AGENTS, MESH_SKILLS } from '../../templates/meshSkills';

vi.mock('vscode', () => ({}));

const EXTENSION_PATH = path.resolve(__dirname, '..', '..', '..');

describe('AgentDeploymentService.deploySkills', () => {
  let tmpMesh: string;
  let svc: AgentDeploymentService;

  beforeEach(() => {
    tmpMesh = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-deploy-test-'));
    svc = new AgentDeploymentService(EXTENSION_PATH);
  });

  afterEach(() => {
    fs.rmSync(tmpMesh, { recursive: true, force: true });
  });

  it('writes all 24 SKILL.md files on a clean deploy', () => {
    // Bug-Q phase 2 — knowledge-code-read brings the total to 23.
    const result = svc.deploySkills(tmpMesh);
    expect(result.total).toBe(24);
    expect(result.written).toBe(24);
    expect(result.unchanged).toBe(0);
    for (const skill of MESH_SKILLS) {
      const filePath = path.join(tmpMesh, skill.relativePath);
      expect(fs.existsSync(filePath), `${skill.name} should be written`).toBe(true);
      const body = fs.readFileSync(filePath, 'utf8');
      expect(body).toContain(`name: ${skill.name}`);
      expect(body).toContain('purity: pure-data');
    }
  });

  it('is idempotent — second deploy is all unchanged, never re-writes', () => {
    svc.deploySkills(tmpMesh);
    const second = svc.deploySkills(tmpMesh);
    expect(second.written).toBe(0);
    expect(second.unchanged).toBe(24);
  });

  it('re-writes a single skill when its on-disk content has drifted', () => {
    svc.deploySkills(tmpMesh);
    const target = path.join(tmpMesh, MESH_SKILLS[0].relativePath);
    fs.writeFileSync(target, '# hand-edited drift\n', 'utf8');
    const result = svc.deploySkills(tmpMesh);
    expect(result.written).toBe(1);
    expect(result.unchanged).toBe(23);
    expect(result.perSkill.find(p => p.name === MESH_SKILLS[0].name)?.status).toBe('written');
  });

  it('groups skills by family in the per-skill report', () => {
    const result = svc.deploySkills(tmpMesh);
    const families = new Set(result.perSkill.map(p => p.family));
    expect(families).toEqual(new Set(['search', 'rank', 'knowledge', 'context', 'audit', 'format']));
    const counts = result.perSkill.reduce<Record<string, number>>((acc, p) => {
      acc[p.family] = (acc[p.family] ?? 0) + 1;
      return acc;
    }, {});
    // B29 added self-review-architect + self-review-security under the
    // 'context' family. D-PR1 added self-review-code-architect +
    // self-review-code-security (also 'context'; total 7).
    // Bug-Q phase 2 added knowledge-code-read under 'knowledge'.
    // D-PR3 added knowledge-reference-repos under 'knowledge' (now 10).
    expect(counts).toEqual({
      search: 4, rank: 1, knowledge: 10, context: 7, audit: 1, format: 1,
    });
  });

  it('marks a Skill as empty-template when its bundled file is missing', () => {
    // Swap in a service pointing at a path that has NO templates.
    const emptyExtension = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-ext-'));
    try {
      const emptySvc = new AgentDeploymentService(emptyExtension);
      const result = emptySvc.deploySkills(tmpMesh);
      expect(result.written).toBe(0);
      expect(result.unchanged).toBe(0);
      expect(result.perSkill.every(p => p.status === 'empty-template')).toBe(true);
    } finally {
      fs.rmSync(emptyExtension, { recursive: true, force: true });
    }
  });
});

describe('AgentDeploymentService.listDeployedSkills', () => {
  let tmpMesh: string;
  let svc: AgentDeploymentService;

  beforeEach(() => {
    tmpMesh = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-deploy-list-'));
    svc = new AgentDeploymentService(EXTENSION_PATH);
  });

  afterEach(() => {
    fs.rmSync(tmpMesh, { recursive: true, force: true });
  });

  it('reports all skills as not-deployed on a fresh mesh', () => {
    const list = svc.listDeployedSkills(tmpMesh);
    expect(list).toHaveLength(24);
    expect(list.every(s => s.deployed === false)).toBe(true);
  });

  it('reports all skills deployed after a full deploy', () => {
    svc.deploySkills(tmpMesh);
    const list = svc.listDeployedSkills(tmpMesh);
    expect(list.every(s => s.deployed === true)).toBe(true);
  });

  it('reports partial deployment when only some skills are on disk', () => {
    svc.deploySkills(tmpMesh);
    // Remove a single skill from disk
    const removed = MESH_SKILLS[5];
    fs.rmSync(path.join(tmpMesh, removed.relativePath));
    const list = svc.listDeployedSkills(tmpMesh);
    const removedRow = list.find(s => s.name === removed.name)!;
    expect(removedRow.deployed).toBe(false);
    expect(list.filter(s => s.deployed).length).toBe(23);
  });
});

describe('AgentDeploymentService.deployAgents', () => {
  let tmpMesh: string;
  let svc: AgentDeploymentService;

  beforeEach(() => {
    tmpMesh = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-deploy-agents-'));
    svc = new AgentDeploymentService(EXTENSION_PATH);
  });

  afterEach(() => {
    fs.rmSync(tmpMesh, { recursive: true, force: true });
  });

  it(`writes all ${MESH_AGENTS.length} .agent.md files on a clean deploy`, () => {
    const result = svc.deployAgents(tmpMesh);
    expect(result.total).toBe(MESH_AGENTS.length);
    expect(result.written).toBe(MESH_AGENTS.length);
    expect(result.unchanged).toBe(0);
    for (const agent of MESH_AGENTS) {
      const filePath = path.join(tmpMesh, agent.relativePath);
      expect(fs.existsSync(filePath), `${agent.name} should be written`).toBe(true);
      const body = fs.readFileSync(filePath, 'utf8');
      expect(body).toContain(`name: ${agent.name}`);
      expect(body).toContain('# System Prompt');
    }
  });

  it('is idempotent — second deploy is all unchanged', () => {
    svc.deployAgents(tmpMesh);
    const second = svc.deployAgents(tmpMesh);
    expect(second.written).toBe(0);
    expect(second.unchanged).toBe(MESH_AGENTS.length);
  });

  it('refuses to deploy an agent whose tools reference a Skill not in MESH_SKILLS', () => {
    // Swap in an extension dir where ONE agent body declares a fake tool.
    const fakeExtension = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-ext-'));
    try {
      // Mirror all real agent + skill templates into the fake dir...
      const realSkillsDir = path.join(EXTENSION_PATH, 'code-templates', 'skills');
      const fakeSkillsDir = path.join(fakeExtension, 'code-templates', 'skills');
      fs.cpSync(realSkillsDir, fakeSkillsDir, { recursive: true });

      const realAgentsDir = path.join(EXTENSION_PATH, 'code-templates', 'agents-v4');
      const fakeAgentsDir = path.join(fakeExtension, 'code-templates', 'agents-v4');
      fs.cpSync(realAgentsDir, fakeAgentsDir, { recursive: true });

      // ...then poison one agent's tools list with a non-existent Skill.
      // Inject after the `- audit-emit-event` line which is the last
      // tool every agent declares — stable anchor across agent files.
      const target = path.join(fakeAgentsDir, 'prd-agent.agent.md');
      const poisoned = fs.readFileSync(target, 'utf8').replace(
        '  - audit-emit-event',
        '  - audit-emit-event\n  - fictional-skill-does-not-exist',
      );
      fs.writeFileSync(target, poisoned, 'utf8');

      const poisonedSvc = new AgentDeploymentService(fakeExtension);
      const result = poisonedSvc.deployAgents(tmpMesh);
      const prdRow = result.perAgent.find(p => p.name === 'prd-agent')!;
      expect(prdRow.status).toBe('skill-missing');
      expect(prdRow.missingSkills).toContain('fictional-skill-does-not-exist');
      // Every other agent in MESH_AGENTS still deploys.
      expect(result.written).toBe(MESH_AGENTS.length - 1);
      expect(fs.existsSync(path.join(tmpMesh, 'prd-agent.agent.md'))).toBe(false);
    } finally {
      fs.rmSync(fakeExtension, { recursive: true, force: true });
    }
  });

  it('parses tools: arrays correctly from real agent templates', () => {
    // Sanity — every shipped agent's declared tools must already resolve.
    const result = svc.deployAgents(tmpMesh);
    for (const agent of result.perAgent) {
      expect(agent.status, `${agent.name} declared a missing skill: ${agent.missingSkills?.join(', ')}`).not.toBe('skill-missing');
    }
  });

  it('accepts github/* MCP-namespaced tools as valid (not missing-skill)', () => {
    // B21: agents may declare github/* (all read-only) or github/<tool>
    // (specific writes). These route through Copilot's MCP server, not
    // through the custom skill registry, so they must NOT be flagged as
    // missing skills. Same for playwright/*.
    const fakeExtension = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
    try {
      const realSkillsDir = path.join(EXTENSION_PATH, 'code-templates', 'skills');
      const fakeSkillsDir = path.join(fakeExtension, 'code-templates', 'skills');
      fs.cpSync(realSkillsDir, fakeSkillsDir, { recursive: true });
      const realAgentsDir = path.join(EXTENSION_PATH, 'code-templates', 'agents-v4');
      const fakeAgentsDir = path.join(fakeExtension, 'code-templates', 'agents-v4');
      fs.cpSync(realAgentsDir, fakeAgentsDir, { recursive: true });

      // The real market-research-agent.agent.md already declares github/*
      // and github/add_issue_comment. If MCP-namespace recognition were
      // broken these would resolve as missing-skill.
      const fakeSvc = new AgentDeploymentService(fakeExtension);
      const result = fakeSvc.deployAgents(tmpMesh);
      const mr = result.perAgent.find(p => p.name === 'market-research-agent')!;
      expect(mr.status, `missingSkills: ${mr.missingSkills?.join(', ')}`).not.toBe('skill-missing');
    } finally {
      fs.rmSync(fakeExtension, { recursive: true, force: true });
    }
  });

  it('strips inline YAML comments from tool entries', () => {
    // The agent templates use `  - github/add_issue_comment   # purpose`
    // YAML format. The parser must extract just the tool name; the
    // comment must not become part of it. This regression was caught by
    // the deployAgents tests when MCP tools first landed.
    const fakeExtension = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-comment-test-'));
    try {
      const realSkillsDir = path.join(EXTENSION_PATH, 'code-templates', 'skills');
      fs.cpSync(realSkillsDir, path.join(fakeExtension, 'code-templates', 'skills'), { recursive: true });
      const realAgentsDir = path.join(EXTENSION_PATH, 'code-templates', 'agents-v4');
      const fakeAgentsDir = path.join(fakeExtension, 'code-templates', 'agents-v4');
      fs.cpSync(realAgentsDir, fakeAgentsDir, { recursive: true });

      // Verify the parser handles a tool entry with a trailing comment +
      // multiple spaces (the formatting we use in the real templates).
      // Use audit-emit-event so we know it's a real skill name.
      const target = path.join(fakeAgentsDir, 'prd-agent.agent.md');
      const original = fs.readFileSync(target, 'utf8');
      const withComment = original.replace(
        '  - audit-emit-event',
        '  - audit-emit-event              # inline comment that must be stripped',
      );
      fs.writeFileSync(target, withComment, 'utf8');

      const fakeSvc = new AgentDeploymentService(fakeExtension);
      const result = fakeSvc.deployAgents(tmpMesh);
      const prd = result.perAgent.find(p => p.name === 'prd-agent')!;
      expect(prd.status).not.toBe('skill-missing');
    } finally {
      fs.rmSync(fakeExtension, { recursive: true, force: true });
    }
  });

  it('listDeployedAgents reports presence per agent', () => {
    expect(svc.listDeployedAgents(tmpMesh).every(a => !a.deployed)).toBe(true);
    svc.deployAgents(tmpMesh);
    expect(svc.listDeployedAgents(tmpMesh).every(a => a.deployed)).toBe(true);
  });

  // Copilot's custom-agent runtime rejects agent .md files whose body
  // exceeds 30,000 characters with "Invalid config: prompt exceeds max
  // length of 30000". Bug AA + GG + GG-followup grew prd-agent.agent.md
  // past the limit; redeploys succeeded silently locally, then the
  // first Coding Agent dispatch cancelled with the config-invalid error
  // (no rollback, no PR — just a wasted dispatch and a confused user).
  // Catch it at test time so it can't ship.
  it('every agent .md body fits Copilot custom-agent 30,000-char limit', () => {
    const MAX = 30_000;
    const overflow: Array<{ name: string; bodyLength: number }> = [];
    for (const agent of MESH_AGENTS) {
      const body = agent.generate(EXTENSION_PATH);
      if (body.length > MAX) {
        overflow.push({ name: agent.name, bodyLength: body.length });
      }
    }
    expect(
      overflow,
      `Copilot custom-agent runtime rejects agent .md bodies > ${MAX} chars. Trim verbose prose / move forensic context into design docs. Offenders:\n  ${overflow.map(o => `${o.name}: ${o.bodyLength} chars (over by ${o.bodyLength - MAX})`).join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('AgentDeploymentService.getCopilotEnvStatus', () => {
  const svc = new AgentDeploymentService(EXTENSION_PATH);

  it('marks all secrets as missing when env does not exist', async () => {
    const status = await svc.getCopilotEnvStatus(
      'acme/example',
      async () => null,
      async () => false,
    );
    expect(status.environmentExists).toBe(false);
    expect(status.reachable).toBe(false);
    expect(status.secrets.every(s => !s.present)).toBe(true);
    expect(status.repoSlug).toBe('acme/example');
  });

  it('marks all secrets as missing when env exists but listing fails', async () => {
    const status = await svc.getCopilotEnvStatus(
      'acme/example',
      async () => null,           // listing API returns null = unreachable
      async () => true,           // env exists
    );
    expect(status.environmentExists).toBe(true);
    expect(status.reachable).toBe(false);
    expect(status.secrets.every(s => !s.present)).toBe(true);
  });

  it('flags only the secrets the listing returns', async () => {
    const status = await svc.getCopilotEnvStatus(
      'acme/example',
      async () => new Set(['TAVILY_API_KEY']),
      async () => true,
    );
    expect(status.environmentExists).toBe(true);
    expect(status.reachable).toBe(true);
    const tavily = status.secrets.find(s => s.name === 'TAVILY_API_KEY')!;
    const uspto  = status.secrets.find(s => s.name === 'USPTO_API_KEY')!;
    expect(tavily.present).toBe(true);
    expect(uspto.present).toBe(false);
    expect(tavily.required).toBe(true);
    expect(uspto.required).toBe(true);
  });

  it('returns the static firewall host list regardless of env state', async () => {
    const status = await svc.getCopilotEnvStatus(
      'acme/example',
      async () => new Set(),
      async () => false,
    );
    // 4 search providers; auto-verification not possible so hosts are returned
    // as a static reference for the UI.
    expect(status.hosts.map(h => h.host).sort()).toEqual([
      'api.tavily.com',
      'api.uspto.gov',
      'data.uspto.gov',
      'export.arxiv.org',
      'hn.algolia.com',
    ].sort());
  });

  it('passes the correct envName to the lookup callbacks', async () => {
    let listEnvName = '';
    let existsEnvName = '';
    await svc.getCopilotEnvStatus(
      'acme/example',
      async (_o, _r, env) => { listEnvName = env; return new Set(); },
      async (_o, _r, env) => { existsEnvName = env; return true; },
    );
    expect(listEnvName).toBe('copilot');
    expect(existsEnvName).toBe('copilot');
  });
});
