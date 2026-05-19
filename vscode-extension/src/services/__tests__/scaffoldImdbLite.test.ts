/**
 * Tests for the Phase A-PR2 scaffold extensions:
 *   - MeshService.scaffoldImdbLitePlatform now populates each BAR's
 *     app.yaml.repos[] with the workshop repo names (declared, not
 *     connected) per design doc §8.1.
 *   - MeshService.scaffoldImdbLiteOkr seeds the Celebs-anchored sample
 *     OKR via OKRService.create.
 *
 * Uses tmpdir + real disk I/O so the YAML round-trip is exercised
 * end-to-end.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// MeshService transitively imports `vscode` via ConfigService. In a Vitest
// (Node-only) run that module isn't resolvable. We supply a minimal mock
// so the import graph resolves without pulling in real editor APIs. None
// of MeshService's scaffold methods actually call into vscode — they just
// transit ConfigService's getter for the configured GitHub user, which
// returns undefined when the stub workspace is empty.
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({ get: () => undefined, update: () => Promise.resolve() }),
    onDidChangeConfiguration: () => ({ dispose: () => undefined }),
  },
  Disposable: class { dispose() { /* noop */ } },
  EventEmitter: class { event = () => ({ dispose: () => undefined }); fire = () => undefined; dispose = () => undefined; },
  Uri: { file: (p: string) => ({ fsPath: p }) },
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
}));

import { MeshService } from '../MeshService';
import { OKRService } from '../OKRService';
import { BarService } from '../BarService';
import { GovernanceScorer } from '../GovernanceScorer';

describe('MeshService.scaffoldImdbLitePlatform — repos[] population', () => {
  let tmpRoot: string;
  let svc: MeshService;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-scaffold-test-'));
    svc = new MeshService();
    svc.initializeMesh(tmpRoot, 'Test Mesh', 'AcmeCorp', 'shawn');
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('writes app.yaml.repos[] with 3 workshop repos on IMDB Lite Application', () => {
    svc.scaffoldImdbLitePlatform(tmpRoot);
    const litePath = path.join(tmpRoot, 'platforms', 'imdb-lite', 'bars', 'imdb-lite-application');
    const yamlContent = fs.readFileSync(path.join(litePath, 'app.yaml'), 'utf8');
    expect(yamlContent).toContain('https://github.com/<org>/imdb-react-frontend');
    expect(yamlContent).toContain('https://github.com/<org>/imdb-identity');
    expect(yamlContent).toContain('https://github.com/<org>/movie-api');
    expect(yamlContent).not.toContain('repos: []');
  });

  it('writes app.yaml.repos[] with celeb-api on IMDB Celebs', () => {
    svc.scaffoldImdbLitePlatform(tmpRoot);
    const celebsPath = path.join(tmpRoot, 'platforms', 'imdb-lite', 'bars', 'imdb-celebs');
    const yamlContent = fs.readFileSync(path.join(celebsPath, 'app.yaml'), 'utf8');
    expect(yamlContent).toContain('https://github.com/<org>/celeb-api');
  });

  it('repos are parseable back to the AppManifest.repos array', () => {
    svc.scaffoldImdbLitePlatform(tmpRoot);
    // Use BarService directly to parse — that's the production reader.
    const barService = new BarService(new GovernanceScorer());
    const litePath = path.join(tmpRoot, 'platforms', 'imdb-lite', 'bars', 'imdb-lite-application');
    const liteManifest = barService.readManifest(litePath);
    expect(liteManifest).not.toBeNull();
    expect(liteManifest!.repos).toEqual([
      'https://github.com/<org>/imdb-react-frontend',
      'https://github.com/<org>/imdb-identity',
      'https://github.com/<org>/movie-api',
    ]);
    const celebsPath = path.join(tmpRoot, 'platforms', 'imdb-lite', 'bars', 'imdb-celebs');
    const celebsManifest = barService.readManifest(celebsPath);
    expect(celebsManifest!.repos).toEqual(['https://github.com/<org>/celeb-api']);
  });

  it('substitutes githubOrg when supplied via opts', () => {
    svc.scaffoldImdbLitePlatform(tmpRoot, { githubOrg: 'AliceNN-ucdenver' });
    const litePath = path.join(tmpRoot, 'platforms', 'imdb-lite', 'bars', 'imdb-lite-application');
    const yamlContent = fs.readFileSync(path.join(litePath, 'app.yaml'), 'utf8');
    expect(yamlContent).toContain('https://github.com/AliceNN-ucdenver/imdb-react-frontend');
    expect(yamlContent).not.toContain('<org>');
  });

  it('preserves asymmetric CALM density (Celebs has no security/threat-model enrichment over Lite)', () => {
    // Per design doc §8.1: the asymmetry IS the workshop's teaching
    // moment (Celebs is Restricted because its governance is sparse).
    // Don't auto-enrich Celebs at scaffold time.
    svc.scaffoldImdbLitePlatform(tmpRoot);
    const liteArch = JSON.parse(fs.readFileSync(
      path.join(tmpRoot, 'platforms', 'imdb-lite', 'bars', 'imdb-lite-application', 'architecture', 'bar.arch.json'),
      'utf8',
    ));
    const celebsArch = JSON.parse(fs.readFileSync(
      path.join(tmpRoot, 'platforms', 'imdb-lite', 'bars', 'imdb-celebs', 'architecture', 'bar.arch.json'),
      'utf8',
    ));
    // Lite has more nodes than Celebs — concrete signal that the asymmetry survives.
    expect(liteArch.nodes.length).toBeGreaterThan(celebsArch.nodes.length);
  });
});

describe('MeshService.scaffoldImdbLiteOkr — Celebs-anchored sample', () => {
  let tmpRoot: string;
  let svc: MeshService;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'okr-scaffold-test-'));
    svc = new MeshService();
    svc.initializeMesh(tmpRoot, 'Test Mesh', 'AcmeCorp', 'shawn');
    svc.scaffoldImdbLitePlatform(tmpRoot);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('creates the OKR card under okrs/<id>/okr.yaml', () => {
    const card = svc.scaffoldImdbLiteOkr(tmpRoot);
    expect(card).not.toBeNull();
    expect(card!.meta.id).toMatch(/^OKR-\d{4}Q[1-4]-IMDB-001-celeb-api$/);
    const yamlPath = path.join(tmpRoot, 'okrs', card!.meta.id, 'okr.yaml');
    expect(fs.existsSync(yamlPath)).toBe(true);
  });

  it('round-trips via OKRService.read', () => {
    const created = svc.scaffoldImdbLiteOkr(tmpRoot)!;
    const okrService = new OKRService();
    const reread = okrService.read(tmpRoot, created.meta.id);
    expect(reread).not.toBeNull();
    expect(reread!.meta.intentThreadUuid).toBe(created.meta.intentThreadUuid);
    expect(reread!.keyResults).toHaveLength(3);
  });

  it('anchors on APP-IMDB-002 (Celebs) as the primary BAR — the Restricted tier driver', () => {
    const card = svc.scaffoldImdbLiteOkr(tmpRoot)!;
    expect(card.objectiveAlignment.affectedBarIds[0]).toBe('APP-IMDB-002');
    expect(card.objectiveAlignment.affectedBarIds).toContain('APP-IMDB-001');
  });

  it('pre-fills the intent_cascade (Org → Role → Developer → User)', () => {
    const card = svc.scaffoldImdbLiteOkr(tmpRoot)!;
    expect(card.objectiveAlignment.intentCascade.org).toMatch(/monthly active users/);
    expect(card.objectiveAlignment.intentCascade.role).toMatch(/Engineering Lead/);
    expect(card.objectiveAlignment.intentCascade.developer).toMatch(/celeb-api/);
    expect(card.objectiveAlignment.intentCascade.user).toMatch(/celebrity/);
  });

  it('seeds 3 SMART key results matching the design doc', () => {
    const card = svc.scaffoldImdbLiteOkr(tmpRoot)!;
    const krIds = card.keyResults.map(k => k.id).sort();
    expect(krIds).toEqual(['KR-1', 'KR-2', 'KR-3']);
    expect(card.keyResults[0].metric).toMatch(/false-merge/i);
    expect(card.keyResults[1].metric).toMatch(/licensing/i);
    expect(card.keyResults[2].metric).toMatch(/latency/i);
  });

  it('sets governance overrides reflecting Restricted-tier defaults', () => {
    const card = svc.scaffoldImdbLiteOkr(tmpRoot)!;
    expect(card.governance?.maxAutoRounds).toBe(0);
    expect(card.governance?.scoreThreshold).toBe(75);
    expect(card.governance?.maxSeverity).toBe('MEDIUM');
  });

  it('uses the supplied githubOrg in target_code_repos (full GitHub URL, matches BAR app.yaml format)', () => {
    const card = svc.scaffoldImdbLiteOkr(tmpRoot, { githubOrg: 'AliceNN-ucdenver' })!;
    expect(card.objectiveAlignment.targetCodeRepos).toEqual([
      'https://github.com/AliceNN-ucdenver/celeb-api',
      'https://github.com/AliceNN-ucdenver/imdb-react-frontend',
    ]);
  });

  it('uses placeholder org when githubOrg is omitted', () => {
    const card = svc.scaffoldImdbLiteOkr(tmpRoot)!;
    expect(card.objectiveAlignment.targetCodeRepos[0]).toBe('https://github.com/<org>/celeb-api');
  });

  it('uses supplied owner', () => {
    const card = svc.scaffoldImdbLiteOkr(tmpRoot, { owner: 'shawnmccarthy' })!;
    expect(card.meta.owner).toBe('shawnmccarthy');
  });

  it('is idempotent — second call returns the same OKR, not a duplicate', () => {
    const first = svc.scaffoldImdbLiteOkr(tmpRoot);
    expect(first).not.toBeNull();
    const second = svc.scaffoldImdbLiteOkr(tmpRoot);
    expect(second).not.toBeNull();
    expect(second!.meta.id).toBe(first!.meta.id);
    expect(second!.meta.intentThreadUuid).toBe(first!.meta.intentThreadUuid);
    // Only one OKR on disk
    const okrsDir = path.join(tmpRoot, 'okrs');
    const okrDirs = fs.readdirSync(okrsDir).filter(d => d.startsWith('OKR-'));
    expect(okrDirs).toHaveLength(1);
  });

  it('initializes audit dirs + chain-ladder.yaml', () => {
    const card = svc.scaffoldImdbLiteOkr(tmpRoot)!;
    const okrDir = path.join(tmpRoot, 'okrs', card.meta.id);
    expect(fs.existsSync(path.join(okrDir, 'audit', 'events'))).toBe(true);
    expect(fs.existsSync(path.join(okrDir, 'audit', 'chain-ladder.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(okrDir, 'why'))).toBe(true);
    expect(fs.existsSync(path.join(okrDir, 'how'))).toBe(true);
    expect(fs.existsSync(path.join(okrDir, 'what'))).toBe(true);
  });
});
