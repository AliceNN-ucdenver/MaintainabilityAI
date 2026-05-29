import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ThreatModelService imports `vscode` (for vscode.lm + workspace config),
// which isn't available under vitest. The disk-write methods under test
// don't touch vscode, so a minimal stub keeps the import graph happy.
vi.mock('vscode', () => ({
  workspace: { getConfiguration: () => ({ get: () => '' }) },
  window: {},
  lm: {},
}));

import { ThreatModelService } from '../ThreatModelService';
import type { ThreatEntry } from '../../types';

/**
 * Bug-AAD — the threat-model writers used to `return` silently when a
 * BAR had no `security/` directory. The LLM generation succeeded + the
 * UI reported success, but nothing landed on disk and no error
 * surfaced ("generated but didn't save; directory missing"). They must
 * create the directory instead.
 */

let tmpBar: string;

beforeEach(() => {
  tmpBar = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-bar-'));
});
afterEach(() => {
  if (tmpBar) fs.rmSync(tmpBar, { recursive: true, force: true });
});

const sampleThreat: ThreatEntry = {
  id: 'T-1',
  category: 'Spoofing',
  target: 'node-1',
  targetName: 'API',
  dataClassification: 'confidential',
  description: 'desc',
  attackVector: 'vector',
  impact: 'high',
  likelihood: 'medium',
  existingControls: ['auth'],
  controlEffectiveness: 'partial',
  residualRisk: 'medium',
  recommendedMitigations: ['mfa'],
  nistReferences: ['AC-2'],
} as unknown as ThreatEntry;

describe('ThreatModelService persistence (Bug-AAD)', () => {
  it('writeThreatModelYaml creates security/ when missing and writes the file', () => {
    const svc = new ThreatModelService(() => {});
    expect(fs.existsSync(path.join(tmpBar, 'security'))).toBe(false);

    // White-box: the writer is private, but the bug lives there.
    (svc as unknown as { writeThreatModelYaml: (b: string, t: ThreatEntry[]) => void })
      .writeThreatModelYaml(tmpBar, [sampleThreat]);

    const yamlPath = path.join(tmpBar, 'security', 'threat-model.yaml');
    expect(fs.existsSync(yamlPath)).toBe(true);
    expect(fs.readFileSync(yamlPath, 'utf-8')).toContain('id: T-1');
  });

  it('writeThreatDiagramMd creates security/ when missing and writes the file', () => {
    const svc = new ThreatModelService(() => {});
    (svc as unknown as { writeThreatDiagramMd: (b: string, d: string) => void })
      .writeThreatDiagramMd(tmpBar, 'flowchart TD\n  A-->B');

    const mdPath = path.join(tmpBar, 'security', 'threat-model.md');
    expect(fs.existsSync(mdPath)).toBe(true);
    expect(fs.readFileSync(mdPath, 'utf-8')).toContain('```mermaid');
  });
});
