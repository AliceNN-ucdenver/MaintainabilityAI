/**
 * Bug-AAB structural-pin regression tests.
 *
 * A single "Fan out" click opened 20 IDENTICAL landing issues on the
 * target repo, all at the same second. Two independent defects had to
 * line up:
 *
 *   1. ROOT CAUSE — webview listener leak. The fan-out click handler is
 *      a DELEGATED listener on `document.body`. It was registered inside
 *      attachEventHandlers(), which render() calls on EVERY render.
 *      render() only swaps rootEl.innerHTML, so document.body (and its
 *      listeners) survive — each render stacked one more permanent
 *      listener. After ~20 renders, one click fired 20 listeners → 20
 *      postMessage({type:'fanOut'}).
 *
 *   2. NO BACKSTOP — onFanOut had no re-entrancy guard, so 20 messages
 *      meant 20 concurrent issue-creation runs racing on the same ISO
 *      second.
 *
 * Neither the webview IIFE nor LookingGlassPanel has a DOM/VS-Code unit
 * harness, so these are source-text structural pins (same idiom as
 * phaseSpec.test.ts). They fail loudly if a future refactor drops
 * either guard.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WEBVIEW_SRC = join(__dirname, '..', '..', 'lookingGlass.ts');
const PANEL_SRC = join(__dirname, '..', '..', '..', 'LookingGlassPanel.ts');

describe('Bug-AAB: fan-out duplicate-issue guards', () => {
  it('the document.body fan-out click listener is registered behind a one-time guard', () => {
    const src = readFileSync(WEBVIEW_SRC, 'utf8');

    // The only document.body delegated listener in the file must be
    // wrapped in the fanoutDelegationBound guard so it binds once for
    // the webview lifetime rather than once per render.
    expect(
      src,
      'lookingGlass.ts must guard the document.body fan-out click listener with a fanoutDelegationBound flag so it is not re-registered on every render. See Bug-AAB.',
    ).toContain('document.body.dataset.fanoutDelegationBound');

    // Pin the ordering: the guard set must appear before the listener
    // registration (the listener lives inside the guarded block).
    const guardIdx = src.indexOf("document.body.dataset.fanoutDelegationBound = '1'");
    const listenerIdx = src.indexOf("document.body.addEventListener('click'");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(listenerIdx).toBeGreaterThan(-1);
    expect(
      guardIdx,
      'the fanoutDelegationBound guard must be set BEFORE document.body.addEventListener so the listener registers inside the guarded block.',
    ).toBeLessThan(listenerIdx);
  });

  it('there is exactly one document.body click listener (no second unguarded path)', () => {
    const src = readFileSync(WEBVIEW_SRC, 'utf8');
    const matches = src.match(/document\.body\.addEventListener\(\s*['"]click['"]/g) || [];
    expect(
      matches.length,
      'exactly one document.body click listener is expected; a second one would re-introduce the per-render leak class.',
    ).toBe(1);
  });

  it('onFanOut has an in-flight re-entrancy guard keyed on okrId', () => {
    const src = readFileSync(PANEL_SRC, 'utf8');

    // The defense-in-depth guard: a Set of in-flight okrIds, checked at
    // the top of onFanOut, released in a finally.
    expect(
      src,
      'LookingGlassPanel must declare a fanOutInFlight Set for the onFanOut re-entrancy guard. See Bug-AAB.',
    ).toContain('fanOutInFlight');
    expect(
      src,
      'onFanOut must short-circuit when the okrId is already in flight.',
    ).toContain('this.fanOutInFlight.has(okrId)');
    expect(
      src,
      'onFanOut must release the in-flight guard in a finally (delete the okrId).',
    ).toContain('this.fanOutInFlight.delete(okrId)');
  });
});
