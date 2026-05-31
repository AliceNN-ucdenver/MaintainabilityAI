/**
 * Tier 2.5a — audit-sign-redqueen-decisions (finalize-time chain signing).
 *
 * The Red Queen PreToolUse hook writes per-tool-call allow/deny decisions to
 * `<repo>/.redqueen/audit-log.jsonl` as UNSIGNED plain JSON (separate process,
 * no session key). This skill — the impl agent's FINAL governed action — rolls
 * the log into one signed `redqueen_decisions` digest event on the IMPL chain
 * while the runner still holds the live per-epoch Ed25519 key.
 *
 * Strategy mirrors skills.test.ts: a tmpdir doubles as both MESH_PATH and
 * REPO_PATH; IMPL-* run ids route the chain to <repo>/.maintainability/audit/.
 * Each test saves + restores the session-context env vars.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { runSkill, SKILLS, isSkillName } from './skills';

interface RqEnv {
  dir: string;
  eventsFile: string;
  rqLog: string;
}

const SESSION_KEYS = ['OKR_ID', 'RUN_ID', 'INTENT_THREAD_UUID', 'PHASE', 'MESH_PATH', 'REPO_PATH'] as const;

/** Run `fn` inside a fresh tmp repo with an IMPL session context set. */
async function withImplRepo(fn: (env: RqEnv) => Promise<void>, overrides?: Partial<Record<typeof SESSION_KEYS[number], string>>): Promise<void> {
  const saved: Record<string, string | undefined> = {};
  for (const k of SESSION_KEYS) { saved[k] = process.env[k]; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-sign-'));
  try {
    process.env.OKR_ID = 'OKR-1';
    process.env.RUN_ID = 'IMPL-abc';
    process.env.INTENT_THREAD_UUID = 'uuid-1';
    process.env.PHASE = 'implementation';
    process.env.MESH_PATH = dir;
    process.env.REPO_PATH = dir;
    if (overrides) { for (const [k, v] of Object.entries(overrides)) { process.env[k] = v; } }
    await fn({
      dir,
      eventsFile: path.join(dir, '.maintainability', 'audit', 'events', `${process.env.RUN_ID}.jsonl`),
      rqLog: path.join(dir, '.redqueen', 'audit-log.jsonl'),
    });
  } finally {
    for (const k of SESSION_KEYS) {
      if (saved[k] === undefined) { delete process.env[k]; } else { process.env[k] = saved[k]; }
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeRqLog(rqLog: string, rows: Array<Record<string, unknown>>): string {
  fs.mkdirSync(path.dirname(rqLog), { recursive: true });
  const body = rows.map((l) => JSON.stringify(l)).join('\n') + '\n';
  fs.writeFileSync(rqLog, body, 'utf8');
  return body;
}

function lastEvent(eventsFile: string): Record<string, unknown> {
  const lines = fs.readFileSync(eventsFile, 'utf8').trim().split('\n');
  return JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
}

test('Tier 2.5a — registry exposes audit-sign-redqueen-decisions', () => {
  assert.ok(isSkillName('audit-sign-redqueen-decisions'));
  assert.ok(Object.prototype.hasOwnProperty.call(SKILLS, 'audit-sign-redqueen-decisions'));
});

// (a) signs a digest event under epoch-1 with agent attribution.
test('Tier 2.5a — signs a redqueen_decisions digest event under epoch-1 (agent origin)', async () => {
  await withImplRepo(async ({ eventsFile, rqLog }) => {
    writeRqLog(rqLog, [
      { ts: '2026-05-30T00:00:00Z', verdict: 'allow', tool: 'Read', filePath: 'a.ts' },
      { ts: '2026-05-30T00:00:01Z', verdict: 'deny', tool: 'Write', filePath: 'secrets.env', ruleId: 'no-secrets', reason: 'blocked' },
      { ts: '2026-05-30T00:00:02Z', verdict: 'allow', tool: 'Edit', filePath: 'b.ts', payload: { override: true } },
    ]);
    const res = await runSkill('audit-sign-redqueen-decisions', {}) as Record<string, unknown>;
    assert.equal(res.ok, true);
    assert.equal(res.sealed, true);
    assert.equal(res.coveredCount, 3);
    assert.equal(res.allowed, 2);
    assert.equal(res.denied, 1);
    assert.equal(res.overrides, 1);

    const ev = lastEvent(eventsFile);
    assert.equal(ev.event_kind, 'redqueen_decisions');
    const payload = ev.payload as Record<string, unknown>;
    assert.equal(payload.emitted_by, 'agent');
    assert.notEqual(ev.signature, '');
    assert.equal(typeof ev.signer_epoch, 'number');
    assert.equal(ev.signer_epoch, 1);
    assert.equal(payload.covered_count, 3);
    assert.equal((payload.denials as unknown[]).length, 1);
    assert.equal(payload.first_ts, '2026-05-30T00:00:00Z');
    assert.equal(payload.covered_through_ts, '2026-05-30T00:00:02Z');
  });
});

// (b) audit-verify-chain accepts a chain ending in the digest event.
test('Tier 2.5a — produces a chain that audit-verify-chain accepts', async () => {
  await withImplRepo(async ({ rqLog }) => {
    // Prepend a normal agent event so the digest is mid-chain-realistic.
    await runSkill('audit-emit-event', {
      okrId: 'OKR-1', runId: 'IMPL-abc', eventKind: 'self_review',
      payload: { verdict: 'pass' }, phase: 'implementation', intentThreadUuid: 'uuid-1',
    });
    writeRqLog(rqLog, [{ ts: '2026-05-30T00:00:00Z', verdict: 'allow', tool: 'Read' }]);
    const signed = await runSkill('audit-sign-redqueen-decisions', {});
    assert.equal(signed.ok, true);
    const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-1', runId: 'IMPL-abc' }) as Record<string, unknown>;
    assert.equal(verify.ok, true);
    assert.equal(verify.sealed, true);
    assert.equal(verify.sealVerified, true);
    assert.equal(verify.eventCount, 2);
  });
});

// (c) covered_sha256 = sha256 of the sealed prefix bytes; covered_bytes = byte length.
test('Tier 2.5a — covered_sha256 + covered_bytes seal the exact bytes read', async () => {
  await withImplRepo(async ({ eventsFile, rqLog }) => {
    const body = writeRqLog(rqLog, [
      { ts: '2026-05-30T00:00:00Z', verdict: 'allow', tool: 'Read' },
      { ts: '2026-05-30T00:00:01Z', verdict: 'deny', tool: 'Write', ruleId: 'r1', reason: 'x' },
    ]);
    const bytes = Buffer.from(body, 'utf8');
    const expected = createHash('sha256').update(bytes).digest('hex');
    const res = await runSkill('audit-sign-redqueen-decisions', {}) as Record<string, unknown>;
    assert.equal(res.ok, true);
    assert.equal(res.coveredSha256, expected);
    assert.equal(res.coveredBytes, bytes.length);
    const payload = lastEvent(eventsFile).payload as Record<string, unknown>;
    assert.equal(payload.covered_sha256, expected);
    assert.equal(payload.covered_bytes, bytes.length);
  });
});

// (c2) THE KEY CONTRACT: when the log grows AFTER sealing (the agent's own
// commit-time decisions), re-hashing the first covered_bytes still matches the
// seal — and the appended tail is outside the seal. This is the celeb-api PR
// #12 scenario (sealed 18, committed 21).
test('Tier 2.5a — sealed prefix still verifies after the log grows post-seal', async () => {
  await withImplRepo(async ({ rqLog }) => {
    const prefixBody = writeRqLog(rqLog, [
      { ts: '2026-05-30T00:00:00Z', verdict: 'allow', tool: 'Read' },
      { ts: '2026-05-30T00:00:01Z', verdict: 'allow', tool: 'Edit' },
    ]);
    const res = await runSkill('audit-sign-redqueen-decisions', {}) as Record<string, unknown>;
    const coveredBytes = res.coveredBytes as number;
    const coveredSha = res.coveredSha256 as string;
    assert.equal(coveredBytes, Buffer.from(prefixBody, 'utf8').length);
    // Simulate the agent's git add/commit generating 1 more allow decision,
    // APPENDED to the existing log.
    fs.appendFileSync(rqLog, JSON.stringify({ ts: '2026-05-30T00:00:02Z', payload: { verdict: 'allow', tool: 'Bash' } }) + '\n');
    const committed = fs.readFileSync(rqLog);
    // The gate's check: re-hash the first coveredBytes of the committed log.
    const prefixHash = createHash('sha256').update(committed.subarray(0, coveredBytes)).digest('hex');
    assert.equal(prefixHash, coveredSha, 'sealed prefix must verify against the grown log');
    assert.ok(committed.length > coveredBytes, 'committed log has an uncovered tail');
  });
});

// (e) phase/runId guard rejects a non-IMPL session.
test('Tier 2.5a — rejects a non-implementation session', async () => {
  await withImplRepo(async ({ rqLog }) => {
    writeRqLog(rqLog, [{ ts: '2026-05-30T00:00:00Z', verdict: 'allow', tool: 'Read' }]);
    const res = await runSkill('audit-sign-redqueen-decisions', {}) as { ok: boolean; reason?: string };
    assert.equal(res.ok, false);
    assert.match(String(res.reason), /not-implementation-phase/);
  }, { PHASE: 'what', RUN_ID: 'WHAT-abc' });
});

// (f) missing log → honest-zero digest event still emitted.
test('Tier 2.5a — emits an honest-zero event when the decision log is absent', async () => {
  await withImplRepo(async ({ eventsFile }) => {
    // No .redqueen/audit-log.jsonl written at all.
    const res = await runSkill('audit-sign-redqueen-decisions', {}) as Record<string, unknown>;
    assert.equal(res.ok, true);
    assert.equal(res.coveredCount, 0);
    assert.equal(res.coveredSha256, null);
    const ev = lastEvent(eventsFile);
    assert.equal(ev.event_kind, 'redqueen_decisions');
    const payload = ev.payload as Record<string, unknown>;
    assert.equal(payload.covered_count, 0);
    assert.equal(payload.covered_sha256, null);
    assert.equal(payload.covered_bytes, 0);
    assert.equal(payload.note, 'no decision log present');
    assert.equal(payload.emitted_by, 'agent');
    assert.notEqual(ev.signature, '');
  });
});

// (g) a hand-written redqueen_decisions line with emitted_by:'workflow' →
//     verifier rejects origin-kind-mismatch. We rebuild the event with a
//     SELF-CONSISTENT hash (same canonical key-sorted algorithm the runner
//     uses) so the verifier sails past the hash-integrity check and rejects
//     specifically on the Bug Y origin↔kind map: redqueen_decisions is an
//     agent-origin kind, so emitted_by must be 'agent', never 'workflow'.
test('Tier 2.5a — verifier rejects a workflow-attributed redqueen_decisions line (origin-kind-mismatch)', async () => {
  await withImplRepo(async ({ eventsFile }) => {
    const canon = (v: unknown): string => {
      if (v === null || typeof v !== 'object') { return JSON.stringify(v); }
      if (Array.isArray(v)) { return `[${v.map(canon).join(',')}]`; }
      const o = v as Record<string, unknown>;
      const keys = Object.keys(o).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
    };
    const draft: Record<string, unknown> = {
      event_id: 1,
      ts: '2026-05-30T00:00:00Z',
      okr_id: 'OKR-1',
      run_id: 'IMPL-abc',
      intent_thread_uuid: 'uuid-1',
      phase: 'implementation',
      event_kind: 'redqueen_decisions',
      payload: { count: 0, emitted_by: 'workflow' },
      prev_event_hash: null,
      public_key: null,
      event_hash: '',
      signature: '',
    };
    const hash = createHash('sha256').update(canon(draft), 'utf8').digest('hex');
    const forged = { ...draft, event_hash: hash, signature: '' };
    fs.mkdirSync(path.dirname(eventsFile), { recursive: true });
    fs.writeFileSync(eventsFile, JSON.stringify(forged) + '\n');
    const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-1', runId: 'IMPL-abc' }) as { ok: boolean; reason?: string };
    assert.equal(verify.ok, false);
    assert.match(String(verify.reason), /origin-kind-mismatch/);
  });
});
