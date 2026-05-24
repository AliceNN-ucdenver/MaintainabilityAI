/**
 * Regression harness for append-workflow-events.mjs (Bug Z/4).
 *
 * Tests the idempotency-key semantics + JSONL parsing that gate the
 * durable workflow-event append. The runner-CLI calls (audit-emit-event,
 * audit-verify-chain) are exercised indirectly by the production action;
 * here we cover the pure logic that the script applies BEFORE shelling
 * out, because those checks are the actual safety property — once the
 * runner is invoked we trust its signing + chaining, but we must not
 * invoke it on a conflicting state.
 *
 * Run with: node --test vscode-extension/code-templates/actions/finalize-okr-action/scripts/append-workflow-events.test.mjs
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  checkArtifactWrittenIdempotency,
  checkStateTransitionIdempotency,
} from './append-workflow-events.mjs';

// ─────────────────────────────────────────────────────────────────────
// artifact_written idempotency
// ─────────────────────────────────────────────────────────────────────

test('artifact_written: absent → status absent', () => {
  const events = [
    { event_id: 1, event_kind: 'skill_call', payload: { skill: 'knowledge-okr' } },
    { event_id: 2, event_kind: 'skill_call', payload: { skill: 'tavily-search' } },
  ];
  const expected = {
    path: 'okrs/OKR-X/why/research-doc.md',
    sha256: 'abc123',
    bytes: 4096,
    merge_commit_sha: '58cd5cf6',
  };
  const result = checkArtifactWrittenIdempotency(events, expected);
  assert.equal(result.status, 'absent');
});

test('artifact_written: existing event with same path/sha/bytes/merge → status match', () => {
  const events = [
    { event_id: 1, event_kind: 'skill_call', payload: { skill: 'knowledge-okr' } },
    {
      event_id: 17,
      event_kind: 'artifact_written',
      payload: {
        path: 'okrs/OKR-X/why/research-doc.md',
        sha256: 'abc123',
        bytes: 4096,
        merge_commit_sha: '58cd5cf6',
        emitted_by: 'workflow',
      },
    },
  ];
  const expected = {
    path: 'okrs/OKR-X/why/research-doc.md',
    sha256: 'abc123',
    bytes: 4096,
    merge_commit_sha: '58cd5cf6',
  };
  const result = checkArtifactWrittenIdempotency(events, expected);
  assert.equal(result.status, 'match');
  assert.equal(result.event_id, 17);
});

test('artifact_written: same path different sha → status conflict (hard fail signal)', () => {
  const events = [
    {
      event_id: 17,
      event_kind: 'artifact_written',
      payload: {
        path: 'okrs/OKR-X/why/research-doc.md',
        sha256: 'OLD_SHA_FROM_PRE_REVISION',
        bytes: 4096,
        merge_commit_sha: '58cd5cf6',
      },
    },
  ];
  const expected = {
    path: 'okrs/OKR-X/why/research-doc.md',
    sha256: 'NEW_SHA_POST_REVISION',
    bytes: 4096,
    merge_commit_sha: '58cd5cf6',
  };
  const result = checkArtifactWrittenIdempotency(events, expected);
  assert.equal(result.status, 'conflict');
  assert.equal(result.event_id, 17);
  assert.equal(result.existing.sha256, 'OLD_SHA_FROM_PRE_REVISION');
  assert.equal(result.expected.sha256, 'NEW_SHA_POST_REVISION');
});

test('artifact_written: same path different bytes → status conflict', () => {
  const events = [
    {
      event_id: 17,
      event_kind: 'artifact_written',
      payload: {
        path: 'okrs/OKR-X/why/research-doc.md',
        sha256: 'abc123',
        bytes: 4096,
        merge_commit_sha: '58cd5cf6',
      },
    },
  ];
  const expected = {
    path: 'okrs/OKR-X/why/research-doc.md',
    sha256: 'abc123',
    bytes: 5000,
    merge_commit_sha: '58cd5cf6',
  };
  assert.equal(checkArtifactWrittenIdempotency(events, expected).status, 'conflict');
});

test('artifact_written: same path different merge_commit_sha → status conflict', () => {
  const events = [
    {
      event_id: 17,
      event_kind: 'artifact_written',
      payload: {
        path: 'okrs/OKR-X/why/research-doc.md',
        sha256: 'abc123',
        bytes: 4096,
        merge_commit_sha: 'OLD_MERGE',
      },
    },
  ];
  const expected = {
    path: 'okrs/OKR-X/why/research-doc.md',
    sha256: 'abc123',
    bytes: 4096,
    merge_commit_sha: 'NEW_MERGE',
  };
  assert.equal(checkArtifactWrittenIdempotency(events, expected).status, 'conflict');
});

test('artifact_written: different path → status absent (path-scoped match only)', () => {
  const events = [
    {
      event_id: 17,
      event_kind: 'artifact_written',
      payload: { path: 'okrs/OKR-X/why/research-doc.md', sha256: 'abc', bytes: 100, merge_commit_sha: 'm1' },
    },
  ];
  // Looking for a different artifact (e.g. HOW phase prd.md) — the WHY
  // event must not match it. Each artifact is independently scoped.
  const expected = {
    path: 'okrs/OKR-X/how/prd.md',
    sha256: 'def',
    bytes: 200,
    merge_commit_sha: 'm2',
  };
  assert.equal(checkArtifactWrittenIdempotency(events, expected).status, 'absent');
});

// ─────────────────────────────────────────────────────────────────────
// state_transition idempotency
// (key: phase + run_id + from + to + pr_number + merge_commit_sha)
// ─────────────────────────────────────────────────────────────────────

test('state_transition: absent → status absent', () => {
  const events = [{ event_id: 1, event_kind: 'skill_call', payload: {} }];
  const expected = {
    phase: 'why', run_id: 'WHY-1', from: 'researching', to: 'prd-pending',
    pr_number: 134, merge_commit_sha: '58cd5cf6',
  };
  assert.equal(checkStateTransitionIdempotency(events, expected).status, 'absent');
});

test('state_transition: exact key match → status match (idempotent rerun)', () => {
  const events = [
    {
      event_id: 18,
      event_kind: 'state_transition',
      phase: 'why',
      run_id: 'WHY-1',
      payload: { from: 'researching', to: 'prd-pending', pr_number: 134, merge_commit_sha: '58cd5cf6' },
    },
  ];
  const expected = {
    phase: 'why', run_id: 'WHY-1', from: 'researching', to: 'prd-pending',
    pr_number: 134, merge_commit_sha: '58cd5cf6',
  };
  const result = checkStateTransitionIdempotency(events, expected);
  assert.equal(result.status, 'match');
  assert.equal(result.event_id, 18);
});

test('state_transition: pr_number compared as numbers (string-vs-int safe)', () => {
  const events = [
    {
      event_id: 18,
      event_kind: 'state_transition',
      phase: 'why',
      run_id: 'WHY-1',
      payload: { from: 'researching', to: 'prd-pending', pr_number: '134', merge_commit_sha: 'm' },
    },
  ];
  const expected = {
    phase: 'why', run_id: 'WHY-1', from: 'researching', to: 'prd-pending',
    pr_number: 134, merge_commit_sha: 'm',
  };
  assert.equal(checkStateTransitionIdempotency(events, expected).status, 'match');
});

test('state_transition: same (phase, run) different from → status conflict', () => {
  const events = [
    {
      event_id: 18,
      event_kind: 'state_transition',
      phase: 'why',
      run_id: 'WHY-1',
      payload: { from: 'TAMPERED_FROM', to: 'prd-pending', pr_number: 134, merge_commit_sha: 'm' },
    },
  ];
  const expected = {
    phase: 'why', run_id: 'WHY-1', from: 'researching', to: 'prd-pending',
    pr_number: 134, merge_commit_sha: 'm',
  };
  const result = checkStateTransitionIdempotency(events, expected);
  assert.equal(result.status, 'conflict');
  assert.equal(result.existing.from, 'TAMPERED_FROM');
  assert.equal(result.expected.from, 'researching');
});

test('state_transition: same (phase, run) different to → status conflict', () => {
  const events = [
    {
      event_id: 18,
      event_kind: 'state_transition',
      phase: 'why',
      run_id: 'WHY-1',
      payload: { from: 'researching', to: 'WRONG_TO', pr_number: 134, merge_commit_sha: 'm' },
    },
  ];
  const expected = {
    phase: 'why', run_id: 'WHY-1', from: 'researching', to: 'prd-pending',
    pr_number: 134, merge_commit_sha: 'm',
  };
  assert.equal(checkStateTransitionIdempotency(events, expected).status, 'conflict');
});

test('state_transition: same (phase, run) different merge_commit_sha → status conflict', () => {
  const events = [
    {
      event_id: 18,
      event_kind: 'state_transition',
      phase: 'why',
      run_id: 'WHY-1',
      payload: { from: 'researching', to: 'prd-pending', pr_number: 134, merge_commit_sha: 'OLD_MERGE' },
    },
  ];
  const expected = {
    phase: 'why', run_id: 'WHY-1', from: 'researching', to: 'prd-pending',
    pr_number: 134, merge_commit_sha: 'NEW_MERGE',
  };
  assert.equal(checkStateTransitionIdempotency(events, expected).status, 'conflict');
});

test('state_transition: different (phase, run) → status absent (run-scoped match only)', () => {
  // A HOW-phase state_transition must not block a WHY-phase rerun, and
  // vice versa. The run_id is the partition key.
  const events = [
    {
      event_id: 18,
      event_kind: 'state_transition',
      phase: 'how',
      run_id: 'HOW-2',
      payload: { from: 'prd-pending', to: 'design-pending', pr_number: 200, merge_commit_sha: 'm2' },
    },
  ];
  const expected = {
    phase: 'why', run_id: 'WHY-1', from: 'researching', to: 'prd-pending',
    pr_number: 134, merge_commit_sha: 'm1',
  };
  assert.equal(checkStateTransitionIdempotency(events, expected).status, 'absent');
});
