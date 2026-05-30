import { describe, expect, it } from 'vitest';

import {
  applyConcurrencyCap,
  FANOUT_CONCURRENCY_CAP,
  type ConcurrencyCapEntry,
} from '../concurrencyCap';
import type { PreflightStatus } from '../types';

/**
 * applyConcurrencyCap is a PURE function. These tests assert the admission
 * math AND the in-place mutation of `entry.decision` for demoted rows.
 *
 * Coverage:
 *   (a) under cap         → all admitted, 0 queued
 *   (b) over cap          → 5 admitted, 3 queued, wave-order wins the slots
 *   (c) inFlight ≥ cap    → 0 admitted, all queued
 *   (d) chain-head = 1    → one in-flight head + 4 ready independents → all 4 admitted
 */

function entry(slug: string, status: PreflightStatus, reason?: string): ConcurrencyCapEntry {
  return { slug, decision: reason ? { status, reason } : { status } };
}

describe('applyConcurrencyCap — under cap', () => {
  it('admits all ready rows when inFlight=0 and readyCount < cap', () => {
    const entries: ConcurrencyCapEntry[] = [
      entry('a', 'ready'),
      entry('b', 'ready'),
      entry('c', 'ready'),
    ];
    const waves = [['a', 'b', 'c']];

    const result = applyConcurrencyCap(entries, waves, 5);

    expect(result).toEqual({ inFlight: 0, admitted: 3, queued: 0 });
    // All stay ready — nothing demoted.
    expect(entries.map(e => e.decision.status)).toEqual(['ready', 'ready', 'ready']);
  });
});

describe('applyConcurrencyCap — over cap', () => {
  it('admits 5, queues 3, and the queued rows are the LATER-wave / later-ordered slugs', () => {
    // 8 ready rows: 5 in wave 0 (a..e), 3 in wave 1 (f, g, h).
    const entries: ConcurrencyCapEntry[] = [
      // Deliberately NOT in wave order in the entries array, to prove the
      // function selects by wave order, not entries-array order.
      entry('h', 'ready'),
      entry('a', 'ready'),
      entry('g', 'ready'),
      entry('b', 'ready'),
      entry('f', 'ready'),
      entry('c', 'ready'),
      entry('e', 'ready'),
      entry('d', 'ready'),
    ];
    const waves = [
      ['a', 'b', 'c', 'd', 'e'],
      ['f', 'g', 'h'],
    ];

    const result = applyConcurrencyCap(entries, waves, 5);

    expect(result).toEqual({ inFlight: 0, admitted: 5, queued: 3 });

    const statusBySlug = new Map(entries.map(e => [e.slug, e.decision.status]));
    // wave-0 slugs admitted (kept ready)
    for (const slug of ['a', 'b', 'c', 'd', 'e']) {
      expect(statusBySlug.get(slug)).toBe('ready');
    }
    // wave-1 slugs queued (demoted)
    for (const slug of ['f', 'g', 'h']) {
      expect(statusBySlug.get(slug)).toBe('pending-on-cap');
    }

    // Explicit assertion: a wave-0 ready slug is admitted OVER a wave-1 ready slug.
    expect(statusBySlug.get('e')).toBe('ready'); // wave 0
    expect(statusBySlug.get('f')).toBe('pending-on-cap'); // wave 1

    // Demoted rows carry the cap reason (N = inFlight = 0 here).
    const f = entries.find(e => e.slug === 'f')!;
    expect(f.decision.reason).toBe(
      'Concurrency cap (5) reached — 0 run(s) in flight. Queued; re-check as they complete.',
    );
  });
});

describe('applyConcurrencyCap — inFlight already at cap', () => {
  it('queues every ready row when inFlight >= cap (available = 0)', () => {
    const entries: ConcurrencyCapEntry[] = [
      entry('o1', 'opened'),
      entry('o2', 'opened'),
      entry('o3', 'opened'),
      entry('p1', 'pr-opened'),
      entry('p2', 'pr-opened'),
      entry('r1', 'ready'),
      entry('r2', 'ready'),
    ];
    const waves = [['o1', 'o2', 'o3', 'p1', 'p2', 'r1', 'r2']];

    const result = applyConcurrencyCap(entries, waves, 5);

    expect(result).toEqual({ inFlight: 5, admitted: 0, queued: 2 });

    const statusBySlug = new Map(entries.map(e => [e.slug, e.decision.status]));
    // In-flight rows untouched.
    expect(statusBySlug.get('o1')).toBe('opened');
    expect(statusBySlug.get('p1')).toBe('pr-opened');
    // Both ready rows queued.
    expect(statusBySlug.get('r1')).toBe('pending-on-cap');
    expect(statusBySlug.get('r2')).toBe('pending-on-cap');

    // Reason reflects N = inFlight = 5.
    const r1 = entries.find(e => e.slug === 'r1')!;
    expect(r1.decision.reason).toBe(
      'Concurrency cap (5) reached — 5 run(s) in flight. Queued; re-check as they complete.',
    );
  });
});

describe('applyConcurrencyCap — chain head counts as 1', () => {
  it('counts one opened chain head as 1 in-flight; 4 ready independents all admit (total concurrent = 5)', () => {
    // The chain head is `opened` (1 in-flight). Its tail is
    // `pending-on-upstream`, which is NOT in-flight and is left untouched.
    const entries: ConcurrencyCapEntry[] = [
      entry('chain-head', 'opened'),
      entry('chain-tail', 'pending-on-upstream', 'Waiting on upstream PRs to merge: chain-head.'),
      entry('indep-a', 'ready'),
      entry('indep-b', 'ready'),
      entry('indep-c', 'ready'),
      entry('indep-d', 'ready'),
    ];
    const waves = [
      ['chain-head', 'indep-a', 'indep-b', 'indep-c', 'indep-d'],
      ['chain-tail'],
    ];

    const result = applyConcurrencyCap(entries, waves, 5);

    // inFlight = 1 (the opened chain head). available = 4. All 4 admit.
    expect(result).toEqual({ inFlight: 1, admitted: 4, queued: 0 });

    const statusBySlug = new Map(entries.map(e => [e.slug, e.decision.status]));
    expect(statusBySlug.get('chain-head')).toBe('opened');
    // Tail NOT in-flight, NOT a ready row → untouched.
    expect(statusBySlug.get('chain-tail')).toBe('pending-on-upstream');
    for (const slug of ['indep-a', 'indep-b', 'indep-c', 'indep-d']) {
      expect(statusBySlug.get(slug)).toBe('ready');
    }
  });
});

describe('applyConcurrencyCap — defensiveness + default cap', () => {
  it('defaults to FANOUT_CONCURRENCY_CAP when cap arg omitted', () => {
    const entries: ConcurrencyCapEntry[] = [
      entry('a', 'ready'),
      entry('b', 'ready'),
    ];
    const result = applyConcurrencyCap(entries, [['a', 'b']]);
    expect(FANOUT_CONCURRENCY_CAP).toBe(5);
    expect(result).toEqual({ inFlight: 0, admitted: 2, queued: 0 });
  });

  it('appends ready slugs missing from `waves` (sorted) after wave-ordered ones', () => {
    // `z` and `y` are ready but absent from `waves` → defensively appended,
    // sorted, AFTER the wave-ordered ready slugs. With cap=2 and 4 ready,
    // the two wave-0 slugs admit; the two leftover (sorted y, z) queue.
    const entries: ConcurrencyCapEntry[] = [
      entry('a', 'ready'),
      entry('b', 'ready'),
      entry('z', 'ready'),
      entry('y', 'ready'),
    ];
    const waves = [['a', 'b']];

    const result = applyConcurrencyCap(entries, waves, 2);

    expect(result).toEqual({ inFlight: 0, admitted: 2, queued: 2 });
    const statusBySlug = new Map(entries.map(e => [e.slug, e.decision.status]));
    expect(statusBySlug.get('a')).toBe('ready');
    expect(statusBySlug.get('b')).toBe('ready');
    expect(statusBySlug.get('y')).toBe('pending-on-cap');
    expect(statusBySlug.get('z')).toBe('pending-on-cap');
  });
});
