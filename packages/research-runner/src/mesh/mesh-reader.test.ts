/**
 * Tests for gatherMeshContext at all three scope levels, plus the
 * fixture-mesh helper that other tests reuse.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { MeshContext } from '../schemas';
import { gatherMeshContext } from './mesh-reader';
import { getMeshSha } from './get-mesh-sha';
import { buildFixtureMesh, destroyFixtureMesh } from './__test-helpers__/fixture-mesh';

test('getMeshSha: returns the head SHA of a real git repo', () => {
  const handle = buildFixtureMesh();
  try {
    const sha = getMeshSha(handle.meshDir);
    assert.equal(sha, handle.commitSha);
    assert.match(sha!, /^[0-9a-f]{40}$/);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('gatherMeshContext: portfolio scope returns mesh-wide context', () => {
  const handle = buildFixtureMesh();
  try {
    const ctx = gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'portfolio' } });
    // Schema must validate
    MeshContext.parse(ctx);
    assert.equal(ctx.scope.level, 'portfolio');
    assert.equal(ctx.platform, null);
    assert.equal(ctx.bar, null);
    assert.equal(ctx.portfolio.name, 'Fixture Portfolio');
    // Portfolio-level research was indexed
    assert.equal(ctx.portfolio.related_research_summaries.length, 1);
    assert.match(ctx.portfolio.related_research_summaries[0].topic, /insurance technology landscape/i);
    assert.equal(ctx.mesh_sha, handle.commitSha);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('gatherMeshContext: platform scope includes sibling BARs', () => {
  const handle = buildFixtureMesh();
  try {
    const ctx = gatherMeshContext({
      meshDir: handle.meshDir,
      scope: { level: 'platform', id: 'insurance-operations' },
    });
    MeshContext.parse(ctx);
    assert.equal(ctx.scope.level, 'platform');
    assert.ok(ctx.platform, 'platform block should be populated');
    assert.equal(ctx.platform!.platform_id, 'PLT-INS');
    // Sibling bars list excludes the (absent) "self" — but at this scope level
    // we don't exclude anything, so both BARs show up.
    assert.equal(ctx.platform!.sibling_bars.length, 2);
    assert.deepEqual(
      ctx.platform!.sibling_bars.map(b => b.bar_id).sort(),
      ['APP-INS-001', 'APP-INS-002'],
    );
    assert.equal(ctx.bar, null);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('gatherMeshContext: bar scope walks all the way down', () => {
  const handle = buildFixtureMesh();
  try {
    const ctx = gatherMeshContext({
      meshDir: handle.meshDir,
      scope: { level: 'bar', id: 'APP-INS-001' },
    });
    MeshContext.parse(ctx);
    assert.equal(ctx.scope.level, 'bar');
    assert.equal(ctx.scope.bar_id, 'APP-INS-001');
    assert.equal(ctx.scope.platform_id, 'PLT-INS');

    assert.ok(ctx.platform, 'platform block should be populated');
    // Sibling list excludes APP-INS-001 itself
    assert.deepEqual(ctx.platform!.sibling_bars.map(b => b.bar_id), ['APP-INS-002']);

    const bar = ctx.bar!;
    assert.ok(bar, 'bar block should be populated');
    assert.equal(bar.bar_id, 'APP-INS-001');
    assert.equal(bar.name, 'Claims Processing');

    // CALM model loaded as JSON
    assert.ok(bar.calm_model, 'calm_model should be loaded');
    const calm = bar.calm_model as { nodes: unknown[] };
    assert.equal(calm.nodes.length, 2);

    // Threats loaded and includes the mitigations (proves we use js-yaml, not the broken parser)
    assert.ok(Array.isArray(bar.threats));
    const threats = bar.threats as Array<{ id: string; recommendedMitigations: string[] }>;
    assert.equal(threats.length, 2);
    assert.deepEqual(
      threats[0].recommendedMitigations,
      ['rotate signing keys', 'add nonce validation'],
    );

    // ADRs parsed
    assert.equal(bar.adrs.length, 2);
    assert.deepEqual(bar.adrs.map(a => a.id), ['ADR-0001', 'ADR-0002']);
    assert.equal(bar.adrs[0].status, 'accepted');

    // Research + PRDs listed
    assert.equal(bar.related_research.length, 1);
    assert.equal(bar.related_prds.length, 1);
    assert.equal(bar.related_prds[0].research_id, 'fraud-mvp');

    // Mesh gaps: ADRs + threat-model present + recent research → only no_controls_mapping should fire
    assert.deepEqual(bar.mesh_gaps, ['no_controls_mapping']);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('gatherMeshContext: unknown BAR id throws a clear error', () => {
  const handle = buildFixtureMesh();
  try {
    assert.throws(
      () => gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'bar', id: 'APP-DOES-NOT-EXIST' } }),
      /Could not find BAR/,
    );
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('gatherMeshContext: non-git mesh throws a clear error', () => {
  const handle = buildFixtureMesh();
  try {
    // Tamper: remove the .git dir so getMeshSha returns null
    const { rmSync } = require('node:fs') as typeof import('node:fs');
    rmSync(`${handle.meshDir}/.git`, { recursive: true, force: true });
    assert.throws(
      () => gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'portfolio' } }),
      /Could not resolve mesh git SHA/,
    );
  } finally {
    destroyFixtureMesh(handle);
  }
});
