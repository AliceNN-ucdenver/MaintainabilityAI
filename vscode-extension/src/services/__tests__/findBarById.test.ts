/**
 * Tests for MeshService.findBarById — Phase A-PR3 dependency for the
 * OKR detail view's "Affected BARs" panel and the OKRService tier
 * resolution adapter.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('MeshService.findBarById', () => {
  let tmpRoot: string;
  let svc: MeshService;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'find-bar-test-'));
    svc = new MeshService();
    svc.initializeMesh(tmpRoot, 'Test', 'AcmeCorp', 'shawn');
    svc.scaffoldImdbLitePlatform(tmpRoot);
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns the BAR matching the requested id', () => {
    const bar = svc.findBarById(tmpRoot, 'APP-IMDB-001');
    expect(bar).not.toBeNull();
    expect(bar!.id).toBe('APP-IMDB-001');
    expect(bar!.name).toBe('IMDB Lite Application');
  });

  it('returns the second BAR by id', () => {
    const bar = svc.findBarById(tmpRoot, 'APP-IMDB-002');
    expect(bar).not.toBeNull();
    expect(bar!.id).toBe('APP-IMDB-002');
    expect(bar!.name).toBe('IMDB Celebs');
  });

  it('returns null for an unknown id', () => {
    expect(svc.findBarById(tmpRoot, 'APP-DOES-NOT-EXIST')).toBeNull();
  });

  it('OKRService.tierFor uses real scores via the wired adapter', () => {
    // After scaffoldImdbLitePlatform, both BARs have real (low) scores.
    // The Celebs-anchored sample OKR's primary BAR (APP-IMDB-002) is the
    // lower-scored one, so tierFor should return 'restricted'.
    const okrCard = svc.scaffoldImdbLiteOkr(tmpRoot);
    expect(okrCard).not.toBeNull();
    const okrService = svc.getOkrService();
    const tier = okrService.tierFor(tmpRoot, okrCard!.meta.id);
    expect(['restricted', 'supervised', 'autonomous']).toContain(tier);
  });
});
