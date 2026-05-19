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
import { MESH_SKILLS } from '../../templates/meshSkills';

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

  it('writes all 18 SKILL.md files on a clean deploy', () => {
    const result = svc.deploySkills(tmpMesh);
    expect(result.total).toBe(18);
    expect(result.written).toBe(18);
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
    expect(second.unchanged).toBe(18);
  });

  it('re-writes a single skill when its on-disk content has drifted', () => {
    svc.deploySkills(tmpMesh);
    const target = path.join(tmpMesh, MESH_SKILLS[0].relativePath);
    fs.writeFileSync(target, '# hand-edited drift\n', 'utf8');
    const result = svc.deploySkills(tmpMesh);
    expect(result.written).toBe(1);
    expect(result.unchanged).toBe(17);
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
    expect(counts).toEqual({
      search: 4, rank: 1, knowledge: 8, context: 3, audit: 1, format: 1,
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
    expect(list).toHaveLength(18);
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
    expect(list.filter(s => s.deployed).length).toBe(17);
  });
});
