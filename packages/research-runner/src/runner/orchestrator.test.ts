/**
 * Smoke tests for the Phase 1 stub orchestrators. Confirms that the wiring
 * — brief validation, audit emission, file output, optional PR body —
 * works end-to-end against a temp mesh dir. Real LLM/API calls land in
 * later phases; these tests should still pass unchanged then.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runArcheologist } from './archeologist';
import { runPrd } from './prd';
import { readAuditLog, verifyChain } from './audit-emitter';

function tmpMesh(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'research-runner-mesh-'));
}

test('runArcheologist: writes a research doc + verifiable audit chain', async () => {
  const mesh = tmpMesh();
  try {
    const result = await runArcheologist({
      brief: {
        topic: 'agentic governance landscape',
        scope: { level: 'bar', id: 'APP-IMDB-002' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: mesh,
      outputDir: 'research',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
    });

    assert.match(result.run_id, /^RES-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/);
    assert.ok(fs.existsSync(result.artifact_path), 'artifact should exist');
    assert.ok(fs.existsSync(result.audit_log_path), 'audit log should exist');

    const events = readAuditLog(result.audit_log_path);
    assert.ok(events, 'audit log should parse');
    assert.equal(events!.length, 4); // validate + stub_synth + publish + run_complete
    assert.equal(events![events!.length - 1].node_kind, 'run_complete');

    const root = verifyChain(events!);
    assert.equal(root, result.chain_root_hash, 'chain should verify to same root');
  } finally {
    fs.rmSync(mesh, { recursive: true });
  }
});

test('runArcheologist: optional PR body includes the body + Hatter Tag', async () => {
  const mesh = tmpMesh();
  const prBodyPath = path.join(mesh, 'pr-body.md');
  try {
    await runArcheologist({
      brief: {
        topic: 'celebrity following market 2026',
        scope: { level: 'bar', id: 'APP-IMDB-002' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: mesh,
      outputDir: 'research',
      auditDir: '.research-audit',
      emitPrBodyPath: prBodyPath,
      agentVersion: '0.1.0',
    });

    const body = fs.readFileSync(prBodyPath, 'utf8');
    assert.match(body, /^# celebrity following market 2026/m);
    assert.match(body, /^## Hatter.s Tag/m);
    assert.match(body, /chain_root_hash:/);
  } finally {
    fs.rmSync(mesh, { recursive: true });
  }
});

test('runArcheologist: rejects invalid brief with a clear error', async () => {
  const mesh = tmpMesh();
  try {
    await assert.rejects(
      () => runArcheologist({
        brief: { topic: 'x', scope: { level: 'bar' }, trigger: { kind: 'local_dev' } }, // missing scope.id
        meshDir: mesh,
        outputDir: 'research',
        auditDir: '.research-audit',
        agentVersion: '0.1.0',
      }),
      /Invalid research brief/,
    );
  } finally {
    fs.rmSync(mesh, { recursive: true });
  }
});

test('runPrd: writes a PRD doc + manifest + verifiable audit chain', async () => {
  const mesh = tmpMesh();
  try {
    const result = await runPrd({
      brief: {
        research_source: { kind: 'pr', url: 'https://github.com/x/y/pull/42' },
        scope: { level: 'bar', id: 'APP-IMDB-002' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: mesh,
      outputDir: 'prds',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
    });

    assert.match(result.run_id, /^PRD-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/);
    assert.ok(fs.existsSync(result.artifact_path));
    assert.ok(fs.existsSync(result.manifest_path));

    const manifest = JSON.parse(fs.readFileSync(result.manifest_path, 'utf8'));
    assert.equal(manifest.run_id, result.run_id);
    assert.equal(manifest.grounding.passed, false); // phase 1 stub

    const events = readAuditLog(result.audit_log_path);
    assert.ok(events);
    assert.equal(verifyChain(events!), result.chain_root_hash);
  } finally {
    fs.rmSync(mesh, { recursive: true });
  }
});
