/**
 * Tests for the v0.2 extension surfaces consumed by the Research + PRD agents:
 *   - BarService.listResearch / listPrds / computeTier
 *   - GovernanceScorer.detectMeshGaps
 *   - core/mesh-sha.getMeshSha
 *   - MeshReader.readThreatModel (via core/threat-model-reader)
 *
 * Uses ephemeral tmpdir fixtures so each test owns its own filesystem state.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BarService } from '../BarService';
import { GovernanceScorer } from '../GovernanceScorer';
import { computeTier } from '../../core/tier';
import { getMeshSha } from '../../core/mesh-sha';
import {
  parseThreatModelYaml,
  summarizeThreatModel,
  readThreatModelFromBar,
} from '../../core/threat-model-reader';
import { MeshReader } from '../../core/mesh-reader';
import type { BarSummary } from '../../types';

function makeBar(overrides: Partial<BarSummary> = {}): BarSummary {
  const pillar = (score: number) => ({
    pillar: 'architecture' as const,
    score,
    status: score >= 75 ? 'passing' as const : score >= 50 ? 'warning' as const : 'failing' as const,
    artifacts: [],
  });
  return {
    id: 'APP-TEST-001',
    name: 'Test BAR',
    platformId: 'PLT-TEST',
    platformName: 'Test',
    criticality: 'medium',
    lifecycle: 'run',
    strategy: 'advance',
    architecture: pillar(80),
    security: pillar(80),
    infoRisk: pillar(80),
    operations: pillar(80),
    compositeScore: 80,
    pendingDecisions: 0,
    adrCount: 0,
    repos: [],
    repoCount: 0,
    path: '/tmp/fake-bar',
    ...overrides,
  };
}

describe('core/tier.computeTier', () => {
  it('returns autonomous when composite ≥ 80 and all pillars ≥ 50', () => {
    expect(computeTier(makeBar({ compositeScore: 85 }))).toBe('autonomous');
  });

  it('returns supervised when composite is 50-79 and all pillars ≥ 50', () => {
    expect(computeTier(makeBar({ compositeScore: 60 }))).toBe('supervised');
  });

  it('returns restricted when composite < 50', () => {
    expect(computeTier(makeBar({ compositeScore: 30 }))).toBe('restricted');
  });

  it('drops to restricted if any single pillar falls below 50, regardless of composite', () => {
    const bar = makeBar({
      compositeScore: 85,
      security: { pillar: 'security', score: 40, status: 'failing', artifacts: [] },
    });
    expect(computeTier(bar)).toBe('restricted');
  });
});

describe('BarService.computeTier', () => {
  it('matches the core helper output', () => {
    const svc = new BarService();
    const bar = makeBar({ compositeScore: 60 });
    expect(svc.computeTier(bar)).toBe(computeTier(bar));
  });
});

describe('BarService.listResearch + listPrds', () => {
  let tmpDir: string;
  let barPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-listing-'));
    barPath = path.join(tmpDir, 'bar');
    fs.mkdirSync(path.join(barPath, 'research'), { recursive: true });
    fs.mkdirSync(path.join(barPath, 'prds'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty when neither directory has .md files', () => {
    const svc = new BarService();
    expect(svc.listResearch(barPath)).toEqual([]);
    expect(svc.listPrds(barPath)).toEqual([]);
  });

  it('returns empty when the parent dirs do not exist at all', () => {
    fs.rmSync(path.join(barPath, 'research'), { recursive: true });
    fs.rmSync(path.join(barPath, 'prds'), { recursive: true });
    const svc = new BarService();
    expect(svc.listResearch(barPath)).toEqual([]);
    expect(svc.listPrds(barPath)).toEqual([]);
  });

  it('lists research docs with topic from H1 + relativePath', () => {
    fs.writeFileSync(
      path.join(barPath, 'research', 'celeb-following-2026-05.md'),
      '# Celebrity Following — Market Research\n\nBody...\n',
    );
    const svc = new BarService();
    const research = svc.listResearch(barPath);
    expect(research).toHaveLength(1);
    expect(research[0].id).toBe('celeb-following-2026-05');
    expect(research[0].topic).toBe('Celebrity Following — Market Research');
    expect(research[0].relativePath).toBe('research/celeb-following-2026-05.md');
    expect(research[0].publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('falls back to humanised filename when no H1 is present', () => {
    fs.writeFileSync(path.join(barPath, 'research', 'no-heading.md'), 'just body, no heading\n');
    const svc = new BarService();
    expect(svc.listResearch(barPath)[0].topic).toBe('no heading');
  });

  it('skips non-markdown files', () => {
    fs.writeFileSync(path.join(barPath, 'research', 'notes.txt'), 'not a doc');
    fs.writeFileSync(path.join(barPath, 'research', 'real.md'), '# Real\n');
    const svc = new BarService();
    const research = svc.listResearch(barPath);
    expect(research).toHaveLength(1);
    expect(research[0].filename).toBe('real.md');
  });

  it('orders results newest first by publishedAt', () => {
    const oldFile = path.join(barPath, 'research', 'old.md');
    const newFile = path.join(barPath, 'research', 'new.md');
    fs.writeFileSync(oldFile, '# Old\n');
    fs.writeFileSync(newFile, '# New\n');
    const past = new Date('2024-01-01T00:00:00Z');
    fs.utimesSync(oldFile, past, past);
    const svc = new BarService();
    const ordered = svc.listResearch(barPath);
    expect(ordered[0].filename).toBe('new.md');
    expect(ordered[1].filename).toBe('old.md');
  });

  it('lists PRDs with hasManifest reflecting sibling .manifest.json presence', () => {
    fs.writeFileSync(path.join(barPath, 'prds', 'feature-a.md'), '# Feature A\n');
    fs.writeFileSync(path.join(barPath, 'prds', 'feature-a.manifest.json'), '{}');
    fs.writeFileSync(path.join(barPath, 'prds', 'feature-b.md'), '# Feature B\n');
    const svc = new BarService();
    const prds = svc.listPrds(barPath);
    expect(prds).toHaveLength(2);
    const byId = Object.fromEntries(prds.map(p => [p.id, p]));
    expect(byId['feature-a'].hasManifest).toBe(true);
    expect(byId['feature-b'].hasManifest).toBe(false);
  });
});

describe('core/threat-model-reader', () => {
  it('parseThreatModelYaml extracts threats with id + category + risk + mitigations', () => {
    const yaml = `threats:
  - id: THR-001
    category: spoofing
    target: api
    target_name: API Gateway
    data_classification: internal
    description: Token spoofing
    attack_vector: replay attack
    impact: high
    likelihood: medium
    existing_controls: ["JWT validation"]
    control_effectiveness: partial
    residual_risk: medium
    recommended_mitigations:
      - "rotate signing keys"
      - "add nonce validation"
    nist_references: ["IA-5"]
`;
    const threats = parseThreatModelYaml(yaml);
    expect(threats).toHaveLength(1);
    expect(threats[0].id).toBe('THR-001');
    expect(threats[0].category).toBe('spoofing');
    expect(threats[0].residualRisk).toBe('medium');
    expect(threats[0].nistReferences).toContain('IA-5');
    expect(threats[0].existingControls).toContain('JWT validation');
    // Regression: the keyless `recommended_mitigations:` block-list used to
    // be silently dropped because the kv regex required a value after the
    // colon. The blockKey sentinel match in the parser fixes that.
    expect(threats[0].recommendedMitigations).toEqual([
      'rotate signing keys',
      'add nonce validation',
    ]);
  });

  it('parses two threats in a row without bleeding mitigations between them', () => {
    const yaml = `threats:
  - id: THR-001
    category: spoofing
    residual_risk: high
    control_effectiveness: none
    recommended_mitigations:
      - "rotate keys"
  - id: THR-002
    category: tampering
    residual_risk: medium
    control_effectiveness: full
    recommended_mitigations:
      - "sign payloads"
      - "verify on read"
`;
    const threats = parseThreatModelYaml(yaml);
    expect(threats).toHaveLength(2);
    expect(threats[0].recommendedMitigations).toEqual(['rotate keys']);
    expect(threats[1].recommendedMitigations).toEqual(['sign payloads', 'verify on read']);
  });

  it('handles threats with no mitigations section at all', () => {
    const yaml = `threats:
  - id: THR-001
    category: spoofing
    residual_risk: low
    control_effectiveness: full
`;
    const threats = parseThreatModelYaml(yaml);
    expect(threats[0].recommendedMitigations).toEqual([]);
  });

  it('returns [] for malformed / empty input', () => {
    expect(parseThreatModelYaml('')).toEqual([]);
    expect(parseThreatModelYaml('not yaml at all')).toEqual([]);
  });

  it('summarizeThreatModel groups by category / risk and counts unmitigated', () => {
    const yaml = `threats:
  - id: THR-001
    category: spoofing
    residual_risk: high
    control_effectiveness: none
  - id: THR-002
    category: tampering
    residual_risk: medium
    control_effectiveness: full
  - id: THR-003
    category: spoofing
    residual_risk: high
    control_effectiveness: none
`;
    const threats = parseThreatModelYaml(yaml);
    const summary = summarizeThreatModel(threats);
    expect(summary.byCategory.spoofing).toBe(2);
    expect(summary.byCategory.tampering).toBe(1);
    expect(summary.byRisk.high).toBe(2);
    expect(summary.unmitigatedCount).toBe(2);
  });

  it('readThreatModelFromBar returns null when the YAML is absent', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-'));
    expect(readThreatModelFromBar(tmpDir)).toBeNull();
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('MeshReader.readThreatModel', () => {
  it('delegates to readThreatModelFromBar', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-tm-'));
    const meshPath = path.join(tmpDir, 'mesh');
    const barPath = path.join(meshPath, 'platforms/x/bars/y');
    fs.mkdirSync(path.join(barPath, 'security'), { recursive: true });
    fs.writeFileSync(
      path.join(barPath, 'security', 'threat-model.yaml'),
      'threats:\n  - id: THR-001\n    category: spoofing\n    residual_risk: high\n    control_effectiveness: none\n',
    );
    const reader = new MeshReader(meshPath);
    const tm = reader.readThreatModel(barPath);
    expect(tm).not.toBeNull();
    expect(tm!.threats[0].id).toBe('THR-001');
    expect(tm!.summary.unmitigatedCount).toBe(1);
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('GovernanceScorer.detectMeshGaps', () => {
  let tmpDir: string;
  let barPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-'));
    barPath = path.join(tmpDir, 'bar');
    fs.mkdirSync(path.join(barPath, 'security'), { recursive: true });
    fs.mkdirSync(path.join(barPath, 'architecture', 'ADRs'), { recursive: true });
    fs.mkdirSync(path.join(barPath, 'research'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('flags every applicable gap on an empty BAR with healthy scores', () => {
    const scorer = new GovernanceScorer();
    const svc = new BarService(scorer);
    const bar = makeBar({ path: barPath });
    const gaps = scorer.detectMeshGaps(bar, barPath, svc);
    expect(gaps).toContain('no_threat_model');
    expect(gaps).toContain('no_controls_mapping');
    expect(gaps).toContain('no_adrs');
    expect(gaps).not.toContain('stale_research');     // no research → not stale
    expect(gaps).not.toContain('low_architecture_pillar'); // 80 ≥ warning
    expect(gaps).not.toContain('low_security_pillar');
  });

  it('clears no_threat_model when a parseable threats.yaml is present', () => {
    fs.writeFileSync(
      path.join(barPath, 'security', 'threat-model.yaml'),
      'threats:\n  - id: THR-001\n    category: spoofing\n    residual_risk: medium\n    control_effectiveness: full\n',
    );
    const scorer = new GovernanceScorer();
    const svc = new BarService(scorer);
    const gaps = scorer.detectMeshGaps(makeBar({ path: barPath }), barPath, svc);
    expect(gaps).not.toContain('no_threat_model');
  });

  it('clears no_adrs when at least one ADR file exists', () => {
    fs.writeFileSync(
      path.join(barPath, 'architecture', 'ADRs', '0001-record.md'),
      '# ADR-0001: Use Postgres\n\n## Status\n\naccepted\n\n## Decision\nWe use Postgres.\n',
    );
    const scorer = new GovernanceScorer();
    const svc = new BarService(scorer);
    const gaps = scorer.detectMeshGaps(makeBar({ path: barPath }), barPath, svc);
    expect(gaps).not.toContain('no_adrs');
  });

  it('flags stale_research when every research doc is older than 90 days', () => {
    const old = path.join(barPath, 'research', 'old.md');
    fs.writeFileSync(old, '# Old\n');
    const past = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
    fs.utimesSync(old, past, past);
    const scorer = new GovernanceScorer();
    const svc = new BarService(scorer);
    const gaps = scorer.detectMeshGaps(makeBar({ path: barPath }), barPath, svc);
    expect(gaps).toContain('stale_research');
  });

  it('does NOT flag stale_research when at least one doc is recent', () => {
    fs.writeFileSync(path.join(barPath, 'research', 'fresh.md'), '# Fresh\n');
    const scorer = new GovernanceScorer();
    const svc = new BarService(scorer);
    const gaps = scorer.detectMeshGaps(makeBar({ path: barPath }), barPath, svc);
    expect(gaps).not.toContain('stale_research');
  });

  it('flags low_architecture_pillar and low_security_pillar when scores < warning threshold', () => {
    const scorer = new GovernanceScorer({ warningThreshold: 50, passingThreshold: 75 });
    const svc = new BarService(scorer);
    const bar = makeBar({
      path: barPath,
      architecture: { pillar: 'architecture', score: 30, status: 'failing', artifacts: [] },
      security: { pillar: 'security', score: 40, status: 'failing', artifacts: [] },
    });
    const gaps = scorer.detectMeshGaps(bar, barPath, svc);
    expect(gaps).toContain('low_architecture_pillar');
    expect(gaps).toContain('low_security_pillar');
  });
});

describe('core/mesh-sha.getMeshSha', () => {
  it('returns a SHA when the mesh dir is a git repo with a commit', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-sha-'));
    try {
      // Create a tiny git repo with one commit so HEAD resolves
      const opts = { cwd: tmpDir, stdio: 'ignore' as const };
      spawnSync('git', ['init', '-b', 'main'], opts);
      spawnSync('git', ['config', 'user.email', 'test@example.com'], opts);
      spawnSync('git', ['config', 'user.name', 'Test'], opts);
      fs.writeFileSync(path.join(tmpDir, 'mesh.yaml'), 'name: test\n');
      spawnSync('git', ['add', 'mesh.yaml'], opts);
      spawnSync('git', ['commit', '-m', 'init', '--no-gpg-sign'], opts);

      const sha = getMeshSha(tmpDir);
      expect(sha).toMatch(/^[0-9a-f]{40}$/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns null when the directory is not a git repo', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-sha-'));
    try {
      expect(getMeshSha(tmpDir)).toBeNull();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns null when the path does not exist', () => {
    expect(getMeshSha('/definitely/not/a/real/path/asdfqwer')).toBeNull();
  });
});
