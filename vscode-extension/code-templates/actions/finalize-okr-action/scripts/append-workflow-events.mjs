#!/usr/bin/env node
/**
 * Append workflow-owned events (artifact_written + state_transition) to the
 * per-run audit JSONL during phase finalize, with idempotency + verify-before-
 * commit semantics.
 *
 * Design contract (Bug Z):
 *   - PR audit verifies (it does not mutate the chain).
 *   - Finalize records (it is the ONLY durable workflow-event writer).
 *   - chain-ladder.yaml = cross-phase ladder.
 *   - Per-run JSONL = within-phase chain (skill_call, self_review,
 *     artifact_written, state_transition, human_gate).
 *
 * Idempotency keys (per user's guardrails):
 *   - artifact_written: (path, sha256, bytes, merge_commit_sha)
 *     Match → no-op. Conflict (same path, different sha/bytes/merge_sha)
 *     → hard fail with clear reason.
 *   - state_transition: (phase, run_id, from, to, pr_number,
 *     merge_commit_sha) Match → no-op. Any state_transition for the same
 *     (phase, run_id) with a different key → hard fail.
 *
 * Verify-before-commit:
 *   Append events to JSONL → run audit-verify-chain → exit non-zero on
 *   failure so the action.yml commit step never fires on a degraded chain.
 *
 * Invoked from finalize-okr-action/action.yml. All inputs come from env.
 * Exits 0 on success (idempotent no-op or fresh append + verify pass).
 * Exits non-zero with ::error::-prefixed message on any failure.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const RUNNER_PKG = process.env.RUNNER_PKG_SPEC || '@maintainabilityai/research-runner@~0.1.42';

function ghError(title, message) {
  process.stderr.write(`::error title=${title}::${message}\n`);
}

function ghNotice(message) {
  process.stderr.write(`::notice::${message}\n`);
}

function readJsonlEvents(jsonlPath) {
  if (!fs.existsSync(jsonlPath)) { return []; }
  const lines = fs.readFileSync(jsonlPath, 'utf8').split('\n').filter(l => l.trim().length > 0);
  return lines.map((line, i) => {
    try { return JSON.parse(line); } catch (err) {
      throw new Error(`JSONL line ${i + 1} parse failed: ${err.message}`);
    }
  });
}

function computeArtifactPayload(artifactPath, mergeSha, prNumber) {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`phase artifact missing at ${artifactPath} — finalize cannot persist artifact_written. Run is not finalize-able.`);
  }
  const bytes = fs.statSync(artifactPath).size;
  const sha256 = createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex');
  return { path: artifactPath, sha256, bytes, merge_commit_sha: mergeSha, pr_number: prNumber, emitted_by: 'workflow' };
}

/**
 * Compare an existing artifact_written event against the expected payload.
 * Returns: 'match' | 'conflict' | 'absent'.
 */
export function checkArtifactWrittenIdempotency(events, expected) {
  const existing = events.find(e => e.event_kind === 'artifact_written' && e.payload?.path === expected.path);
  if (!existing) { return { status: 'absent' }; }
  const p = existing.payload || {};
  if (p.sha256 === expected.sha256 && p.bytes === expected.bytes && p.merge_commit_sha === expected.merge_commit_sha) {
    return { status: 'match', event_id: existing.event_id };
  }
  return {
    status: 'conflict',
    event_id: existing.event_id,
    existing: { sha256: p.sha256, bytes: p.bytes, merge_commit_sha: p.merge_commit_sha },
    expected: { sha256: expected.sha256, bytes: expected.bytes, merge_commit_sha: expected.merge_commit_sha },
  };
}

/**
 * Compare an existing state_transition event against the expected payload.
 * Key per guardrail: (phase, run_id, from, to, pr_number, merge_commit_sha).
 * Returns: 'match' | 'conflict' | 'absent'.
 */
export function checkStateTransitionIdempotency(events, expected) {
  const sameRun = events.filter(e =>
    e.event_kind === 'state_transition' &&
    e.phase === expected.phase &&
    e.run_id === expected.run_id,
  );
  if (sameRun.length === 0) { return { status: 'absent' }; }
  const exactMatch = sameRun.find(e => {
    const p = e.payload || {};
    return p.from === expected.from
      && p.to === expected.to
      && Number(p.pr_number) === Number(expected.pr_number)
      && p.merge_commit_sha === expected.merge_commit_sha;
  });
  if (exactMatch) { return { status: 'match', event_id: exactMatch.event_id }; }
  const conflict = sameRun[0];
  const p = conflict.payload || {};
  return {
    status: 'conflict',
    event_id: conflict.event_id,
    existing: { from: p.from, to: p.to, pr_number: p.pr_number, merge_commit_sha: p.merge_commit_sha },
    expected,
  };
}

/**
 * Oracle & Privacy Rails (Hatter-side) — build the rail_decision payload from a
 * durable rail report a phase finalize job already produced + committed. This
 * action is a generic RECORDER, never a rail runner: it only points the chain
 * at the report so the rollup can REPLAY it. The payload is fully re-derivable
 * (report sha + verdict + config sha) and carries NO raw PII/secret value.
 *
 * The report must describe THIS run (okr_id / run_id / phase match the finalize
 * env) — else a wrong report file could be attached to the right chain. The
 * payload is self-describing (schema_version + okr_id + run_id + phase) so the
 * rollup replay doesn't have to infer them.
 */
export function computeRailReportPayload(reportPath, ctx) {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`rail report missing at ${reportPath}`);
  }
  const raw = fs.readFileSync(reportPath);
  const report = JSON.parse(raw.toString('utf8'));
  for (const [field, want] of [['okr_id', ctx.okrId], ['run_id', ctx.runId], ['phase', ctx.phase]]) {
    if (report[field] !== want) {
      throw new Error(`rail report ${field}='${report[field]}' does not match finalize ${field}='${want}' — wrong report for this run; refusing to attach.`);
    }
  }
  return {
    schema_version: report.schema_version,
    rail: report.rail || 'pii',
    verdict: report.verdict,
    okr_id: report.okr_id,
    run_id: report.run_id,
    phase: report.phase,
    report_path: reportPath,
    report_sha256: createHash('sha256').update(raw).digest('hex'),
    config_sha256: report.config_sha256,
    merge_commit_sha: ctx.mergeSha,
    pr_number: ctx.prNumber,
    emitted_by: 'workflow',
  };
}

/**
 * Idempotency for rail_decision, keyed on report_path (mirrors
 * artifact_written). Match requires the same report sha + verdict + merge SHA —
 * the event points to evidence as of a specific merge commit, so a re-run
 * against a different merge/head state must NOT no-op under an old event. Same
 * path but different sha/verdict/merge → conflict (investigate); none → absent.
 */
export function checkRailDecisionIdempotency(events, expected) {
  const existing = events.find(e => e.event_kind === 'rail_decision' && e.payload?.report_path === expected.report_path);
  if (!existing) { return { status: 'absent' }; }
  const p = existing.payload || {};
  if (p.report_sha256 === expected.report_sha256 && p.verdict === expected.verdict && p.merge_commit_sha === expected.merge_commit_sha) {
    return { status: 'match', event_id: existing.event_id };
  }
  return {
    status: 'conflict',
    event_id: existing.event_id,
    existing: { report_sha256: p.report_sha256, verdict: p.verdict, merge_commit_sha: p.merge_commit_sha },
    expected: { report_sha256: expected.report_sha256, verdict: expected.verdict, merge_commit_sha: expected.merge_commit_sha },
  };
}

function emitEventViaRunner(envelope) {
  const result = spawnSync('npx', ['-y', RUNNER_PKG, 'skill-audit-emit-event'], {
    input: JSON.stringify(envelope),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const tail = (result.stderr || result.stdout || '').slice(-500);
    throw new Error(`audit-emit-event failed (exit ${result.status}): ${tail}`);
  }
}

function verifyChain(okrId, runId) {
  const input = JSON.stringify({ okrId, runId });
  const result = spawnSync('npx', ['-y', RUNNER_PKG, 'skill-audit-verify-chain'], {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const raw = result.stdout || '';
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        return { ok: !!obj.ok, reason: obj.reason || '', body: obj };
      } catch { /* try next */ }
    }
  }
  return { ok: false, reason: `verify-chain non-JSON output: ${raw.slice(-200)}`, body: null };
}

async function main() {
  const required = ['OKR_ID', 'RUN_ID', 'PHASE', 'ARTIFACT_PATH', 'MERGE_SHA', 'PR_NUMBER', 'ACTION_THREAD'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    ghError('append-workflow-events bad input', `missing required env: ${missing.join(', ')}`);
    process.exit(2);
  }

  const OKR_ID = process.env.OKR_ID;
  const RUN_ID = process.env.RUN_ID;
  const PHASE = process.env.PHASE;
  const ARTIFACT_PATH = process.env.ARTIFACT_PATH;
  const MERGE_SHA = process.env.MERGE_SHA;
  const PR_NUMBER = Number(process.env.PR_NUMBER);
  const ACTION_THREAD = process.env.ACTION_THREAD;
  const FROM_STATUS = process.env.FROM_STATUS || '';
  const TO_STATUS = process.env.TO_STATUS || '';
  const META_ROLLED = (process.env.META_ROLLED || '').toLowerCase() === 'true';

  const jsonlPath = path.join('okrs', OKR_ID, 'audit', 'events', `${RUN_ID}.jsonl`);
  if (!fs.existsSync(jsonlPath)) {
    ghError('audit JSONL missing', `${jsonlPath} not found — finalize cannot append workflow events.`);
    process.exit(1);
  }

  let events;
  try { events = readJsonlEvents(jsonlPath); }
  catch (err) {
    ghError('audit JSONL parse failed', err.message);
    process.exit(1);
  }

  // ── artifact_written: idempotency check + append ─────────────────────
  let artifactPayload;
  try { artifactPayload = computeArtifactPayload(ARTIFACT_PATH, MERGE_SHA, PR_NUMBER); }
  catch (err) {
    ghError('artifact missing', err.message);
    process.exit(1);
  }

  const awCheck = checkArtifactWrittenIdempotency(events, artifactPayload);
  let appendedArtifact = false;
  if (awCheck.status === 'match') {
    ghNotice(`artifact_written already present + matches at event ${awCheck.event_id} (sha=${artifactPayload.sha256.slice(0, 16)}…, bytes=${artifactPayload.bytes}) — idempotent no-op`);
  } else if (awCheck.status === 'conflict') {
    ghError(
      'artifact_written CONFLICT',
      `existing event ${awCheck.event_id} for ${artifactPayload.path} has sha=${(awCheck.existing.sha256 || '').slice(0, 16)}… bytes=${awCheck.existing.bytes} merge=${(awCheck.existing.merge_commit_sha || '').slice(0, 12)} but finalize sees sha=${awCheck.expected.sha256.slice(0, 16)}… bytes=${awCheck.expected.bytes} merge=${awCheck.expected.merge_commit_sha.slice(0, 12)}. Refusing to overwrite; investigate chain integrity.`,
    );
    process.exit(1);
  } else {
    // absent → append
    try {
      emitEventViaRunner({
        okrId: OKR_ID,
        runId: RUN_ID,
        phase: PHASE,
        intentThreadUuid: ACTION_THREAD,
        eventKind: 'artifact_written',
        payload: artifactPayload,
      });
      appendedArtifact = true;
      ghNotice(`artifact_written appended (sha=${artifactPayload.sha256.slice(0, 16)}…, bytes=${artifactPayload.bytes})`);
    } catch (err) {
      ghError('artifact_written emit failed', err.message);
      process.exit(1);
    }
  }

  // ── state_transition: idempotency check + append (only if meta rolled) ──
  let appendedTransition = false;
  if (META_ROLLED && FROM_STATUS && TO_STATUS) {
    // Re-read events in case artifact_written was just appended
    events = readJsonlEvents(jsonlPath);
    const stExpected = {
      phase: PHASE,
      run_id: RUN_ID,
      from: FROM_STATUS,
      to: TO_STATUS,
      pr_number: PR_NUMBER,
      merge_commit_sha: MERGE_SHA,
    };
    const stCheck = checkStateTransitionIdempotency(events, stExpected);
    if (stCheck.status === 'match') {
      ghNotice(`state_transition ${FROM_STATUS} → ${TO_STATUS} already recorded at event ${stCheck.event_id} (pr=${PR_NUMBER} merge=${MERGE_SHA.slice(0, 12)}) — idempotent no-op`);
    } else if (stCheck.status === 'conflict') {
      ghError(
        'state_transition CONFLICT',
        `existing event ${stCheck.event_id} for phase=${PHASE} run=${RUN_ID} has from=${stCheck.existing.from} to=${stCheck.existing.to} pr=${stCheck.existing.pr_number} merge=${(stCheck.existing.merge_commit_sha || '').slice(0, 12)}, but finalize sees from=${FROM_STATUS} to=${TO_STATUS} pr=${PR_NUMBER} merge=${MERGE_SHA.slice(0, 12)}. Refusing to overwrite; investigate chain integrity.`,
      );
      process.exit(1);
    } else {
      try {
        emitEventViaRunner({
          okrId: OKR_ID,
          runId: RUN_ID,
          phase: PHASE,
          intentThreadUuid: ACTION_THREAD,
          eventKind: 'state_transition',
          payload: {
            from: FROM_STATUS,
            to: TO_STATUS,
            pr_number: PR_NUMBER,
            merge_commit_sha: MERGE_SHA,
            emitted_by: 'workflow',
          },
        });
        appendedTransition = true;
        ghNotice(`state_transition appended (${FROM_STATUS} → ${TO_STATUS})`);
      } catch (err) {
        ghError('state_transition emit failed', err.message);
        process.exit(1);
      }
    }
  }

  // ── rail_decision: chain-visible pointer to a replayable rail report ────
  // Oracle & Privacy Rails (Hatter-side, NOT Red Queen). Emitted ONLY when a
  // phase finalize job (today: WHY) produced a durable rail report and handed
  // us its path via RAIL_REPORT_PATH. Generic + no-op for phases that run no
  // rail. Unsigned, workflow-origin, re-derivable — the rollup re-runs the
  // pinned rail over committed bytes and never trusts this event.
  let appendedRail = false;
  const RAIL_REPORT_PATH = process.env.RAIL_REPORT_PATH || '';
  if (RAIL_REPORT_PATH && fs.existsSync(RAIL_REPORT_PATH)) {
    let railPayload;
    try { railPayload = computeRailReportPayload(RAIL_REPORT_PATH, { mergeSha: MERGE_SHA, prNumber: PR_NUMBER, okrId: OKR_ID, runId: RUN_ID, phase: PHASE }); }
    catch (err) { ghError('rail report unusable', `${RAIL_REPORT_PATH}: ${err.message}`); process.exit(1); }
    events = readJsonlEvents(jsonlPath); // re-read after artifact/transition appends
    const rdCheck = checkRailDecisionIdempotency(events, railPayload);
    if (rdCheck.status === 'match') {
      ghNotice(`rail_decision already present + matches at event ${rdCheck.event_id} (rail=${railPayload.rail} verdict=${railPayload.verdict} report_sha=${(railPayload.report_sha256 || '').slice(0, 16)}…) — idempotent no-op`);
    } else if (rdCheck.status === 'conflict') {
      ghError(
        'rail_decision CONFLICT',
        `existing event ${rdCheck.event_id} for ${railPayload.report_path} has report_sha=${(rdCheck.existing.report_sha256 || '').slice(0, 16)}… verdict=${rdCheck.existing.verdict} merge=${(rdCheck.existing.merge_commit_sha || '').slice(0, 12)}, but finalize sees report_sha=${(railPayload.report_sha256 || '').slice(0, 16)}… verdict=${railPayload.verdict} merge=${(railPayload.merge_commit_sha || '').slice(0, 12)}. Refusing to overwrite; investigate chain integrity.`,
      );
      process.exit(1);
    } else {
      try {
        emitEventViaRunner({
          okrId: OKR_ID,
          runId: RUN_ID,
          phase: PHASE,
          intentThreadUuid: ACTION_THREAD,
          eventKind: 'rail_decision',
          payload: railPayload,
        });
        appendedRail = true;
        ghNotice(`rail_decision appended (rail=${railPayload.rail} verdict=${railPayload.verdict} report_sha=${(railPayload.report_sha256 || '').slice(0, 16)}…)`);
      } catch (err) {
        ghError('rail_decision emit failed', err.message);
        process.exit(1);
      }
    }
  }

  // ── Verify chain integrity post-append ─────────────────────────────────
  if (appendedArtifact || appendedTransition || appendedRail) {
    const verify = verifyChain(OKR_ID, RUN_ID);
    if (!verify.ok) {
      ghError(
        'audit-verify-chain failed after workflow append',
        `Finalize aborting before commit. Reason: ${verify.reason || '(no reason)'}`,
      );
      process.exit(1);
    }
    ghNotice('audit-verify-chain ok after appending workflow events ✓');
  }

  process.exit(0);
}

// Run main only when invoked as a script, not when imported by tests.
const isMain = (() => {
  try {
    const argv1 = process.argv[1] || '';
    return argv1.endsWith('append-workflow-events.mjs');
  } catch { return false; }
})();
if (isMain) {
  main().catch(err => {
    ghError('append-workflow-events unhandled', err.message || String(err));
    process.exit(1);
  });
}
