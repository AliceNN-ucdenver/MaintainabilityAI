/**
 * UI-side chain verification tests (Bug W / Codex round-7).
 *
 * Round-7 audit flagged a real UI/runner divergence: the runner's
 * `audit-verify-chain` skill correctly rejected forged unsigned
 * `self_review` / `review_received` events carrying
 * `payload.emitted_by:'workflow'` with `workflow-event-kind-not-allowed`,
 * but the Looking Glass UI's `detectKnightSeal` only checked
 * `payload.emitted_by === 'workflow'` and treated those as
 * legitimately-unsigned without inspecting `event_kind`. A chain with
 * one valid signed agent event plus a forged unsigned self_review
 * marked workflow rendered `sealed:true` in the UI badge while the
 * runner failed CI.
 *
 * These tests pin the post-Bug-W contract: UI seal verdict ↔ runner
 * verdict must agree on every shape. The WORKFLOW_EMITTABLE_KINDS
 * constant is the single source of truth on both sides; any edit
 * there must be mirrored in `packages/research-runner/src/runner/skills.ts`.
 */
import { describe, expect, it } from 'vitest';
import { WORKFLOW_EMITTABLE_KINDS, detectKnightSeal, isEventLegitimate } from '../chainVerify';

// Test-helper: build a minimal JSONL event line with the fields
// detectKnightSeal cares about. Pads the rest with placeholders.
// `epoch` defaults to 1 when a signature is provided so the line
// satisfies the round-8 signer_epoch contract; pass `epoch: undefined`
// to test the missing-epoch attack explicitly.
function event(kind: string, opts: { signature?: string; emittedBy?: string; epoch?: number | undefined; omitEpoch?: boolean } = {}): string {
  const out: Record<string, unknown> = {
    event_id: 1,
    event_kind: kind,
    signature: opts.signature ?? '',
    payload: opts.emittedBy ? { emitted_by: opts.emittedBy } : {},
  };
  // Include signer_epoch when signed unless explicitly omitted.
  // Workflow events default to no epoch (omitEpoch true unless overridden).
  if (!opts.omitEpoch) {
    if (opts.epoch !== undefined) {
      out.signer_epoch = opts.epoch;
    } else if (opts.signature && !opts.emittedBy) {
      out.signer_epoch = 1;  // default for signed agent events
    }
  }
  return JSON.stringify(out);
}

describe('chainVerify — WORKFLOW_EMITTABLE_KINDS allowlist', () => {
  it('contains exactly the post-Bug-V allowlist (mirrors runner skills.ts)', () => {
    expect([...WORKFLOW_EMITTABLE_KINDS].sort()).toEqual([
      'artifact_written',
      'human_gate',
      'state_transition',
    ]);
  });

  it('does NOT contain self_review (post-Bug-V — agent-signed only)', () => {
    expect(WORKFLOW_EMITTABLE_KINDS.has('self_review')).toBe(false);
  });

  it('does NOT contain review_received (post-Bug-V — separate reviewer dispatch retired)', () => {
    expect(WORKFLOW_EMITTABLE_KINDS.has('review_received')).toBe(false);
  });

  it('does NOT contain skill_call or llm_call (runner auto-emits, agent-only)', () => {
    expect(WORKFLOW_EMITTABLE_KINDS.has('skill_call')).toBe(false);
    expect(WORKFLOW_EMITTABLE_KINDS.has('llm_call')).toBe(false);
  });
});

describe('chainVerify — detectKnightSeal happy path', () => {
  it('clean chain (all agent events signed) → sealed:true', () => {
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128) }),
      event('skill_call', { signature: 'b'.repeat(128) }),
      event('self_review', { signature: 'c'.repeat(128) }),
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: true });
  });

  it('signed agent events + legitimately-unsigned workflow event → sealed:true', () => {
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128) }),
      event('artifact_written', { emittedBy: 'workflow' }),  // allowlisted, unsigned-by-design
      event('self_review', { signature: 'b'.repeat(128) }),
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: true });
  });

  it('empty chain → {} (no seal badge)', () => {
    expect(detectKnightSeal([])).toEqual({});
  });

  it('chain with only legitimately-unsigned workflow events → {} (no agent evidence)', () => {
    const lines = [
      event('artifact_written', { emittedBy: 'workflow' }),
      event('state_transition', { emittedBy: 'workflow' }),
    ];
    expect(detectKnightSeal(lines)).toEqual({});
  });
});

describe('chainVerify — detectKnightSeal Bug W round-7 regression', () => {
  it('THE Codex round-7 attack: signed event 1 + unsigned self_review with emitted_by:workflow → sealTampered', () => {
    // This is the exact attack vector from the round-7 audit: an
    // attacker who can write to the mesh repo appends an unsigned
    // self_review with workflow attribution; the UI pre-Bug-W
    // returned sealed:true because it trusted emitted_by:workflow
    // unconditionally. Runner correctly rejected. UI now agrees.
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128) }),
      event('self_review', { emittedBy: 'workflow' }),  // forged
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: false, sealTampered: true });
  });

  it('unsigned review_received with emitted_by:workflow → sealTampered', () => {
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128) }),
      event('review_received', { emittedBy: 'workflow' }),  // forged
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: false, sealTampered: true });
  });

  it('unsigned skill_call with emitted_by:workflow → sealTampered (Bug U/round-5 attack at UI layer)', () => {
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128) }),
      event('skill_call', { emittedBy: 'workflow' }),  // forged
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: false, sealTampered: true });
  });

  it('unsigned llm_call / self_review_exhausted / review_emitted with emitted_by:workflow → all sealTampered', () => {
    for (const kind of ['llm_call', 'self_review_exhausted', 'review_emitted']) {
      const lines = [
        event('skill_call', { signature: 'a'.repeat(128) }),
        event(kind, { emittedBy: 'workflow' }),  // forged
      ];
      expect(detectKnightSeal(lines), `forged ${kind} must trigger sealTampered`).toEqual({ sealed: false, sealTampered: true });
    }
  });

  it('unsigned agent event (no workflow claim) → sealTampered', () => {
    // Post-Bug-T contract: every agent event MUST sign. An unsigned
    // event without `emitted_by:workflow` attribution is an unsigned
    // agent event, which the runner rejects with `unsigned-agent-event`.
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128) }),
      event('self_review'),  // unsigned, no workflow claim
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: false, sealTampered: true });
  });
});

describe('chainVerify — isEventLegitimate gate for UI metrics', () => {
  it('signed agent event with numeric signer_epoch → legitimate', () => {
    expect(isEventLegitimate({ event_kind: 'skill_call', signature: 'a'.repeat(128), signer_epoch: 1 })).toBe(true);
  });

  it('workflow-emittable allowlisted kinds (unsigned, no signer_epoch, workflow-attributed) → legitimate', () => {
    for (const kind of ['artifact_written', 'state_transition', 'human_gate']) {
      expect(isEventLegitimate({ event_kind: kind, payload: { emitted_by: 'workflow' } }), kind).toBe(true);
    }
  });

  it('forged workflow attribution on agent-owned kinds → illegitimate', () => {
    for (const kind of ['skill_call', 'llm_call', 'self_review', 'self_review_exhausted', 'review_received', 'review_emitted']) {
      expect(isEventLegitimate({ event_kind: kind, payload: { emitted_by: 'workflow' } }), kind).toBe(false);
    }
  });

  it('unsigned agent event (no workflow claim) → illegitimate', () => {
    expect(isEventLegitimate({ event_kind: 'self_review' })).toBe(false);
  });

  // Bug X / round-8 — signer_epoch contract on UI side
  it('signed agent event WITHOUT signer_epoch → illegitimate (round-8 contract)', () => {
    expect(isEventLegitimate({ event_kind: 'self_review', signature: 'a'.repeat(128) })).toBe(false);
  });

  it('signed agent event with non-numeric signer_epoch → illegitimate', () => {
    expect(isEventLegitimate({ event_kind: 'self_review', signature: 'a'.repeat(128), signer_epoch: '1' })).toBe(false);
  });

  // Bug X / round-8 — signed workflow event is forgery (matches runner)
  it('SIGNED workflow event (allowlisted kind) → illegitimate', () => {
    expect(isEventLegitimate({ event_kind: 'artifact_written', signature: 'a'.repeat(128), payload: { emitted_by: 'workflow' } })).toBe(false);
  });

  it('workflow event carrying signer_epoch → illegitimate', () => {
    expect(isEventLegitimate({ event_kind: 'artifact_written', signer_epoch: 1, payload: { emitted_by: 'workflow' } })).toBe(false);
  });
});

describe('chainVerify — Bug X / round-8 forgery regressions', () => {
  // The round-8 manual repro: hand-write a JSONL with event_kind in
  // the allowlist + emitted_by:workflow + a fake signature + fake
  // signer_epoch. Pre-X the runner skipped signature verification for
  // workflow events (second-loop continue) so the line came back
  // sealVerified:true. UI did the same. Both now reject.
  it('THE round-8 attack: signed allowlisted workflow event → sealTampered', () => {
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128), epoch: 1 }),
      event('artifact_written', { emittedBy: 'workflow', signature: 'b'.repeat(128), epoch: 1 }),
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: false, sealTampered: true });
  });

  it('workflow event carrying signer_epoch (but no signature) → sealTampered', () => {
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128), epoch: 1 }),
      event('artifact_written', { emittedBy: 'workflow', epoch: 1 }),
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: false, sealTampered: true });
  });

  it('signed agent event WITHOUT signer_epoch → sealTampered (runner rejects with missing-signer-epoch)', () => {
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128), epoch: 1 }),
      event('self_review', { signature: 'b'.repeat(128), omitEpoch: true }),
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: false, sealTampered: true });
  });

  it('malformed JSONL line → sealTampered (runner rejects with bad-jsonl-line)', () => {
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128), epoch: 1 }),
      '{not valid json',
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: false, sealTampered: true });
  });

  it('clean post-round-8 chain (signed agent + signer_epoch + legitimate workflow event) → sealed:true', () => {
    const lines = [
      event('skill_call', { signature: 'a'.repeat(128), epoch: 1 }),
      event('self_review', { signature: 'b'.repeat(128), epoch: 1 }),
      event('artifact_written', { emittedBy: 'workflow' }),  // unsigned, no epoch — legitimate
    ];
    expect(detectKnightSeal(lines)).toEqual({ sealed: true });
  });
});
