/**
 * Cross-layer consistency tests for the phaseSpec single source of truth.
 *
 * The phaseSpec map (`src/types/phaseSpec.ts`) is the authoritative
 * declaration of per-phase strings (labels, agent names, artifact
 * paths, workflow filenames). Other modules in the extension MUST
 * either read from it or stay in sync with it. These tests catch
 * drift between layers at test time so it doesn't surface as a
 * silent production-run failure (the missing `design-pass` label in
 * D-PR1.v1.2 was exactly this — extension said "design-pass"
 * everywhere but MESH_LABELS didn't have it).
 */

import { describe, expect, it } from 'vitest';
import { PHASE_SPEC, allPhaseLabels, phaseSpec } from '../phaseSpec';
import { MESH_LABELS } from '../../templates/meshLabels';
import { MESH_AGENTS } from '../../templates/meshSkills';
import { MESH_WORKFLOWS } from '../../templates/codeRepoTemplates';

describe('phaseSpec single source of truth', () => {
  it('phaseSpec(phase) returns the entry for each canonical phase', () => {
    expect(phaseSpec('why').agentName).toBe('market-research-agent');
    expect(phaseSpec('how').agentName).toBe('prd-agent');
    expect(phaseSpec('what').agentName).toBe('code-design-agent');
  });

  it('phaseSpec(unknown) throws — type system + runtime both refuse', () => {
    expect(() => phaseSpec('unknown' as never)).toThrow(/Unknown phase/);
  });

  it('artifactPath builders produce the canonical mesh-relative path', () => {
    expect(phaseSpec('why').artifactPath('OKR-Q-001-x')).toBe('okrs/OKR-Q-001-x/why/research-doc.md');
    expect(phaseSpec('how').artifactPath('OKR-Q-001-x')).toBe('okrs/OKR-Q-001-x/how/prd.md');
    expect(phaseSpec('what').artifactPath('OKR-Q-001-x')).toBe('okrs/OKR-Q-001-x/what/code-design.md');
  });

  it('chain of prior-phase links forms the canonical WHY → HOW → WHAT ladder', () => {
    expect(phaseSpec('why').priorPhase).toBe(null);
    expect(phaseSpec('how').priorPhase).toBe('why');
    expect(phaseSpec('what').priorPhase).toBe('how');
  });

  it('meta.status transitions roll forward without gap or overlap', () => {
    expect(phaseSpec('why').currentMetaStatus).toBe('researching');
    expect(phaseSpec('why').nextMetaStatus).toBe('prd-pending');
    expect(phaseSpec('how').currentMetaStatus).toBe('prd-pending');
    expect(phaseSpec('how').nextMetaStatus).toBe('design-pending');
    expect(phaseSpec('what').currentMetaStatus).toBe('design-pending');
    expect(phaseSpec('what').nextMetaStatus).toBe('building');
  });
});

describe('phaseSpec ↔ MESH_LABELS consistency', () => {
  it('every label referenced by any phase spec is declared in MESH_LABELS', () => {
    const labelsInRegistry = new Set(MESH_LABELS.map(l => l.name));
    const labelsInSpec = allPhaseLabels();
    const missing = labelsInSpec.filter(name => !labelsInRegistry.has(name));
    expect(missing, `Phase spec references labels not in MESH_LABELS: ${missing.join(', ')}. Add to vscode-extension/src/templates/meshLabels.ts.`).toEqual([]);
  });

  it('every PR pass-label has a corresponding pass-label entry in MESH_LABELS', () => {
    const labelsInRegistry = new Set(MESH_LABELS.map(l => l.name));
    for (const phase of ['why', 'how', 'what'] as const) {
      const spec = phaseSpec(phase);
      expect(
        labelsInRegistry.has(spec.passLabel),
        `phaseSpec.${phase}.passLabel = '${spec.passLabel}' not in MESH_LABELS — silent gh pr edit failures will result (see D-PR1.v1.2 forensic)`,
      ).toBe(true);
    }
  });
});

describe('phaseSpec ↔ MESH_AGENTS consistency', () => {
  it('every agentName referenced by a phase spec is declared in MESH_AGENTS', () => {
    const agentsInRegistry = new Set(MESH_AGENTS.map(a => a.name));
    for (const phase of ['why', 'how', 'what'] as const) {
      const spec = phaseSpec(phase);
      expect(
        agentsInRegistry.has(spec.agentName),
        `phaseSpec.${phase}.agentName = '${spec.agentName}' not in MESH_AGENTS — Looking Glass dispatch will fail with "agent file not deployed"`,
      ).toBe(true);
    }
  });
});

describe('phaseSpec ↔ MESH_WORKFLOWS consistency', () => {
  it('every workflowFile referenced by a phase spec is declared in MESH_WORKFLOWS', () => {
    const workflowsInRegistry = new Set(
      MESH_WORKFLOWS.map(w => w.relativePath.replace(/^\.github\/workflows\//, '')),
    );
    for (const phase of ['why', 'how', 'what'] as const) {
      const spec = phaseSpec(phase);
      expect(
        workflowsInRegistry.has(spec.workflowFile),
        `phaseSpec.${phase}.workflowFile = '${spec.workflowFile}' not in MESH_WORKFLOWS — Deploy All will leave the mesh repo missing the workflow YAML`,
      ).toBe(true);
    }
  });
});
