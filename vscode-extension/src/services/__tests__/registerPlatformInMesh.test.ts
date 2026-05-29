import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// MeshService's import graph reaches `vscode` (via ConfigService). The
// method under test is pure fs, so a minimal stub keeps the import happy.
vi.mock('vscode', () => ({
  workspace: { getConfiguration: () => ({ get: () => '' }) },
  window: {},
}));

import { MeshService } from '../MeshService';

/**
 * Bug-AAD-class hardening — registerPlatformInMesh used to silently
 * `return` when mesh.yaml was absent (platform written to disk but never
 * indexed; addPlatform reports success). It also wrote mesh.yaml back
 * UNCHANGED when it found no insertion point (platform silently dropped).
 * Both now fail loud.
 */

type Reg = (meshPath: string, id: string, name: string, platformPath: string, owner: string) => void;

let tmpMesh: string;
beforeEach(() => { tmpMesh = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-reg-')); });
afterEach(() => { if (tmpMesh) fs.rmSync(tmpMesh, { recursive: true, force: true }); });

function register(svc: MeshService): Reg {
  return (svc as unknown as { registerPlatformInMesh: Reg }).registerPlatformInMesh.bind(svc);
}

describe('registerPlatformInMesh (Bug-AAD-class fail-loud)', () => {
  it('throws when mesh.yaml is absent (no silent skip)', () => {
    const svc = new MeshService();
    expect(() => register(svc)(tmpMesh, 'PLT-X', 'X', 'platforms/x', 'me'))
      .toThrow(/mesh\.yaml not found/i);
  });

  it('inserts into an empty platforms: [] and writes the entry', () => {
    fs.writeFileSync(path.join(tmpMesh, 'mesh.yaml'), 'version: 1\nplatforms: []\n', 'utf8');
    const svc = new MeshService();
    register(svc)(tmpMesh, 'PLT-X', 'X Platform', 'platforms/x', 'me');
    const out = fs.readFileSync(path.join(tmpMesh, 'mesh.yaml'), 'utf8');
    expect(out).toContain('id: PLT-X');
    expect(out).toContain('name: "X Platform"');
  });

  it('throws when there is no insertion point (would otherwise write unchanged)', () => {
    // `platforms:` key present but empty (not `[]`) and no PLT- entry →
    // neither branch matches. Pre-fix this wrote mesh.yaml back unchanged
    // and the platform vanished silently.
    fs.writeFileSync(path.join(tmpMesh, 'mesh.yaml'), 'version: 1\nplatforms:\n', 'utf8');
    const svc = new MeshService();
    expect(() => register(svc)(tmpMesh, 'PLT-X', 'X', 'platforms/x', 'me'))
      .toThrow(/no 'platforms:' insertion point/i);
  });
});
