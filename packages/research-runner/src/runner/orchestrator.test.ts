/**
 * Smoke tests for the Phase 1 stub orchestrators. Confirms that the wiring
 * — brief validation, audit emission, file output, optional PR body —
 * works end-to-end against a temp mesh dir. Real LLM/API calls land in
 * later phases; these tests should still pass unchanged then.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runArcheologist } from './archeologist';
import { runPrd } from './prd';
import { readAuditLog, verifyChain } from './audit-emitter';
import { buildFixtureMesh, destroyFixtureMesh } from '../mesh/__test-helpers__/fixture-mesh';

test('runArcheologist: writes a research doc + verifiable audit chain (with gather_mesh_context)', async () => {
  const handle = buildFixtureMesh();
  try {
    const result = await runArcheologist({
      brief: {
        topic: 'agentic governance landscape',
        scope: { level: 'bar', id: 'APP-INS-001' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
    });

    assert.match(result.run_id, /^RES-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/);
    assert.ok(fs.existsSync(result.artifact_path), 'artifact should exist');
    assert.ok(fs.existsSync(result.audit_log_path), 'audit log should exist');

    const events = readAuditLog(result.audit_log_path);
    assert.ok(events, 'audit log should parse');
    // validate_brief + gather_mesh_context + phase1_stub_synthesize + publish_stub + run_complete = 5
    assert.equal(events!.length, 5);
    assert.equal(events![1].node_name, 'gather_mesh_context');
    assert.equal(events![events!.length - 1].node_kind, 'run_complete');

    const root = verifyChain(events!);
    assert.equal(root, result.chain_root_hash, 'chain should verify to same root');

    // Run complete should pin the real mesh sha (not "0000000")
    const final = events![events!.length - 1];
    if (final.node_kind === 'run_complete') {
      assert.equal(final.outcome.mesh_sha, handle.commitSha);
    }
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runArcheologist: PR body includes mesh context summary + real mesh sha in Hatter Tag', async () => {
  const handle = buildFixtureMesh();
  const prBodyPath = path.join(handle.meshDir, 'pr-body.md');
  try {
    await runArcheologist({
      brief: {
        topic: 'celebrity following market 2026',
        scope: { level: 'bar', id: 'APP-INS-001' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      emitPrBodyPath: prBodyPath,
      agentVersion: '0.1.0',
    });

    const body = fs.readFileSync(prBodyPath, 'utf8');
    assert.match(body, /^# celebrity following market 2026/m);
    assert.match(body, /^## Mesh Context/m);
    assert.match(body, /Claims Processing/);                           // real BAR name from fixture
    assert.match(body, /APP-INS-001/);
    assert.match(body, /^## Hatter.s Tag/m);
    assert.match(body, new RegExp(`mesh_sha: ${handle.commitSha}`));   // real mesh sha pinned
    assert.match(body, /chain_root_hash:/);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runArcheologist: rejects invalid brief with a clear error', async () => {
  const handle = buildFixtureMesh();
  try {
    await assert.rejects(
      () => runArcheologist({
        brief: { topic: 'x', scope: { level: 'bar' }, trigger: { kind: 'local_dev' } }, // missing scope.id
        meshDir: handle.meshDir,
        outputDir: 'research',
        auditDir: '.research-audit',
        agentVersion: '0.1.0',
      }),
      /Invalid research brief/,
    );
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runArcheologist: portfolio scope reads portfolio-level research without a BAR', async () => {
  const handle = buildFixtureMesh();
  try {
    const result = await runArcheologist({
      brief: {
        topic: 'industry-wide insurance technology scan',
        scope: { level: 'portfolio' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
    });
    const body = fs.readFileSync(result.artifact_path, 'utf8');
    assert.match(body, /portfolio \*\*Fixture Portfolio\*\*/);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runPrd: writes a PRD doc + manifest + verifiable audit chain (with mesh context)', async () => {
  const handle = buildFixtureMesh();
  try {
    const result = await runPrd({
      brief: {
        research_source: { kind: 'pr', url: 'https://github.com/x/y/pull/42' },
        scope: { level: 'bar', id: 'APP-INS-001' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'prds',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
    });

    assert.match(result.run_id, /^PRD-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/);
    assert.ok(fs.existsSync(result.artifact_path));
    assert.ok(fs.existsSync(result.manifest_path));

    const manifest = JSON.parse(fs.readFileSync(result.manifest_path, 'utf8'));
    assert.equal(manifest.run_id, result.run_id);
    assert.equal(manifest.mesh_sha, handle.commitSha);                 // real mesh sha
    assert.equal(manifest.grounding.passed, false);                    // still phase 2a stub

    const events = readAuditLog(result.audit_log_path);
    assert.ok(events);
    assert.equal(events!.length, 5);                                   // validate + gather + stub + publish + complete
    assert.equal(events![1].node_name, 'gather_mesh_context');
    assert.equal(verifyChain(events!), result.chain_root_hash);
  } finally {
    destroyFixtureMesh(handle);
  }
});
