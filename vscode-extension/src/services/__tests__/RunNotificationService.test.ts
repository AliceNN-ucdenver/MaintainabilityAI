/**
 * Tests for the pure transition-detection logic in RunNotificationService.
 * The full service uses vscode.window.showInformationMessage which can't
 * be exercised in unit tests; the surfacing path is integration-tested
 * via manual smoke. The detection rules are where the bugs live, so this
 * file isolates them.
 */
import { describe, it, expect } from 'vitest';
import { detectTransition } from '../runTransition';
import type { ActiveRun } from '../ActiveRunsService';

function makeRun(overrides: Partial<ActiveRun> = {}): ActiveRun {
  return {
    localId: 'abc12345',
    agent: 'archeologist',
    meshSlug: { owner: 'AliceN-ucdenver', repo: 'governance-mesh' },
    dispatchedAt: '2026-05-17T10:00:00Z',
    runId: 42,
    runUrl: 'https://github.com/x/y/actions/runs/42',
    status: 'queued',
    currentNode: null,
    eventCount: 0,
    lastPolledAt: null,
    completedAt: null,
    lastError: null,
    ...overrides,
  };
}

describe('detectTransition', () => {
  it('returns dispatched on first sighting (pre == null)', () => {
    const t = detectTransition(null, makeRun());
    expect(t).toEqual({ kind: 'dispatched', run: expect.any(Object) });
  });

  it('returns queued_to_running when queued -> in_progress', () => {
    const pre = makeRun({ status: 'queued' });
    const post = makeRun({ status: 'in_progress' });
    expect(detectTransition(pre, post)?.kind).toBe('queued_to_running');
  });

  it('returns completed_success on any -> success', () => {
    const pre = makeRun({ status: 'in_progress' });
    const post = makeRun({ status: 'success' });
    expect(detectTransition(pre, post)?.kind).toBe('completed_success');
  });

  it('returns completed_failure on any -> failure', () => {
    const pre = makeRun({ status: 'in_progress' });
    const post = makeRun({ status: 'failure' });
    expect(detectTransition(pre, post)?.kind).toBe('completed_failure');
  });

  it('returns cancelled on any -> cancelled', () => {
    const pre = makeRun({ status: 'in_progress' });
    const post = makeRun({ status: 'cancelled' });
    expect(detectTransition(pre, post)?.kind).toBe('cancelled');
  });

  it('returns blocked when lastError is newly set on an active run', () => {
    const pre = makeRun({ status: 'in_progress', lastError: null });
    const post = makeRun({ status: 'in_progress', lastError: 'network timeout' });
    expect(detectTransition(pre, post)?.kind).toBe('blocked');
  });

  it('does NOT fire blocked when run already had lastError', () => {
    const pre = makeRun({ status: 'in_progress', lastError: 'flake A' });
    const post = makeRun({ status: 'in_progress', lastError: 'flake B' });
    expect(detectTransition(pre, post)).toBeNull();
  });

  it('does NOT fire blocked when run reached terminal status (subsumed by completed_* / cancelled)', () => {
    const pre = makeRun({ status: 'in_progress', lastError: null });
    const post = makeRun({ status: 'failure', lastError: 'network timeout' });
    // Status transition fires first; blocked is suppressed.
    expect(detectTransition(pre, post)?.kind).toBe('completed_failure');
  });

  it('returns null for no-op tick (same status, no new error)', () => {
    const pre = makeRun({ status: 'in_progress', currentNode: 'gather_mesh_context' });
    const post = makeRun({ status: 'in_progress', currentNode: 'plan_queries' });
    expect(detectTransition(pre, post)).toBeNull();
  });

  it('returns null for queued -> pending (downgrade, not interesting)', () => {
    const pre = makeRun({ status: 'queued' });
    const post = makeRun({ status: 'pending' });
    expect(detectTransition(pre, post)).toBeNull();
  });
});
