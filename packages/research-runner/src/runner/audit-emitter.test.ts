/**
 * Tests for AuditEmitter — the JSONL writer + SHA-256 hash chain.
 * Uses node:test so the package stays zero-runtime-dep-on-test-framework.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AuditEmitter, readAuditLog, verifyChain } from './audit-emitter';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'research-runner-audit-'));
}

const RUN_ID = 'RES-2026-05-17-abcdef12';

test('AuditEmitter: writes a JSONL line per event', () => {
  const dir = tmpDir();
  try {
    const emitter = new AuditEmitter(dir, RUN_ID);
    emitter.emit({
      node_kind: 'pure',
      node_name: 'validate_brief',
      duration_ms: 1,
      pure: { inputs_summary: 'a', outputs_summary: 'b' },
    });
    emitter.emit({
      node_kind: 'pure',
      node_name: 'plan_queries_stub',
      duration_ms: 2,
      pure: { inputs_summary: 'c', outputs_summary: 'd' },
    });

    const lines = fs.readFileSync(path.join(dir, `${RUN_ID}.jsonl`), 'utf8')
      .split('\n').filter(Boolean);
    assert.equal(lines.length, 2);

    const first = JSON.parse(lines[0]);
    const second = JSON.parse(lines[1]);
    assert.equal(first.event_id, 1);
    assert.equal(second.event_id, 2);
    assert.equal(first.prev_event_hash, null);
    assert.equal(second.prev_event_hash, first.event_hash);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test('AuditEmitter: refuses to clobber an existing audit file', () => {
  const dir = tmpDir();
  try {
    new AuditEmitter(dir, RUN_ID);
    assert.throws(() => new AuditEmitter(dir, RUN_ID), /already exists/);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test('AuditEmitter: chain verifies cleanly for a normal run', () => {
  const dir = tmpDir();
  try {
    const emitter = new AuditEmitter(dir, RUN_ID);
    emitter.emit({
      node_kind: 'pure',
      node_name: 'validate_brief',
      duration_ms: 0,
      pure: { inputs_summary: 'in', outputs_summary: 'out' },
    });
    emitter.emit({
      node_kind: 'pure_api',
      node_name: 'tavily_search_stub',
      duration_ms: 12,
      api: {
        provider: 'tavily',
        endpoint: 'POST /search',
        request_summary: 'q=ai+governance+2026',
        http_status: 200,
        response_byte_count: 4096,
      },
    });
    const complete = emitter.emitRunComplete({
      node_kind: 'run_complete',
      node_name: 'verify_and_trigger',
      duration_ms: 50,
      outcome: {
        status: 'ok',
        mesh_sha: 'a'.repeat(40),
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        artifact_paths: ['research/x-2026-05-17.md'],
      },
    });

    const events = readAuditLog(path.join(dir, `${RUN_ID}.jsonl`));
    assert.ok(events, 'audit log should parse');
    assert.equal(events!.length, 3);

    const rootHash = verifyChain(events!);
    assert.ok(rootHash, 'chain should verify');
    // The on-disk run_complete uses a placeholder chain_root_hash, so the
    // in-memory record returned by emitRunComplete overlays the real value.
    assert.equal(complete.outcome.chain_root_hash, rootHash);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test('AuditEmitter: verifyChain catches tampered events', () => {
  const dir = tmpDir();
  try {
    const emitter = new AuditEmitter(dir, RUN_ID);
    emitter.emit({
      node_kind: 'pure',
      node_name: 'a',
      duration_ms: 0,
      pure: { inputs_summary: 'i', outputs_summary: 'o' },
    });
    emitter.emit({
      node_kind: 'pure',
      node_name: 'b',
      duration_ms: 0,
      pure: { inputs_summary: 'i', outputs_summary: 'o' },
    });

    const filePath = path.join(dir, `${RUN_ID}.jsonl`);
    // Tamper: rewrite event 1's node_name without updating the hash
    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
    const first = JSON.parse(lines[0]);
    first.node_name = 'TAMPERED';
    lines[0] = JSON.stringify(first);
    fs.writeFileSync(filePath, lines.join('\n') + '\n');

    const events = readAuditLog(filePath);
    assert.ok(events);
    assert.equal(verifyChain(events!), null, 'tampered chain should not verify');
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test('AuditEmitter: refuses to emit after run_complete', () => {
  const dir = tmpDir();
  try {
    const emitter = new AuditEmitter(dir, RUN_ID);
    emitter.emitRunComplete({
      node_kind: 'run_complete',
      node_name: 'verify_and_trigger',
      duration_ms: 0,
      outcome: {
        status: 'ok',
        mesh_sha: 'a'.repeat(40),
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        artifact_paths: [],
      },
    });
    assert.throws(
      () => emitter.emit({
        node_kind: 'pure',
        node_name: 'after_close',
        duration_ms: 0,
        pure: { inputs_summary: 'i', outputs_summary: 'o' },
      }),
      /closed/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
