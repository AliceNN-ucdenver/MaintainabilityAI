// Bug BB regression tests — the UI failure-label resolver used to
// render a fixed "Hatter Tag declared `live` but audit shows no
// successful skill_calls" message for ANY `degraded-evidence` label,
// even when the actual workflow reason was something else (Bug AA was
// a chain_root_hash placement mismatch — Hatter Tag was `mesh`, not
// `live`). These tests pin the fix: the audit-comment's `**Reason:**`
// text wins when present; the umbrella stock string only appears as a
// fallback.

import { describe, expect, it } from 'vitest';
import {
  collectAuditFailureReasons,
  parseAuditCommentReason,
} from '../auditFailureLabels';

const HOW_DEGRADED_LABELS = ['prd-draft', 'degraded-evidence'];
const WHY_DEGRADED_LABELS = ['research-synthesis', 'degraded-evidence'];

describe('parseAuditCommentReason — Bug BB', () => {
  it('extracts the Reason: line from a degraded HOW audit comment', () => {
    const body = [
      '<!-- prd-agent-audit -->',
      '⚠️ **PRD Audit — degraded**',
      '',
      '**Reason:** chain_root_hash mismatch: agent did not paste a chain_root_hash; workflow derived 1f3859e3278c… from JSONL event 1.',
      '',
      '| Skill | Successful calls |',
      '|---|---:|',
    ].join('\n');
    expect(parseAuditCommentReason(body)).toBe(
      'chain_root_hash mismatch: agent did not paste a chain_root_hash; workflow derived 1f3859e3278c… from JSONL event 1.',
    );
  });

  it('returns null on a clean audit comment (no Reason: line)', () => {
    const body = [
      '<!-- prd-agent-audit -->',
      '✅ **PRD Audit — clean**',
      '',
      '| Check | Result |',
    ].join('\n');
    expect(parseAuditCommentReason(body)).toBeNull();
  });

  it('returns null on a comment without the marker', () => {
    expect(parseAuditCommentReason('random text')).toBeNull();
  });

  it('handles a Reason line with trailing whitespace', () => {
    expect(parseAuditCommentReason('**Reason:** something \n')).toBe('something');
  });
});

describe('collectAuditFailureReasons — Bug BB umbrella-label fix', () => {
  it('uses the audit-comment Reason when present (HOW chain_root_hash mismatch case)', () => {
    const reasons = collectAuditFailureReasons(
      'how',
      HOW_DEGRADED_LABELS,
      'chain_root_hash mismatch: agent did not paste a chain_root_hash; workflow derived 1f3859e3278c… from JSONL event 1.',
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('chain_root_hash mismatch');
    // The pre-Bug-BB stock string MUST NOT appear when the comment
    // gives us the real reason — that string actively misled users on
    // PR #138 (the Hatter Tag was `mesh`, not `live`).
    expect(reasons[0]).not.toContain('declared `live`');
    expect(reasons[0]).not.toContain('no successful skill_calls');
  });

  it('falls back to the neutral umbrella string when no audit comment is available (HOW)', () => {
    const reasons = collectAuditFailureReasons('how', HOW_DEGRADED_LABELS);
    expect(reasons).toHaveLength(1);
    // Fallback must be HONEST about the umbrella — must NOT pretend
    // the cause is specifically the evidence_mode-vs-skill_calls case.
    expect(reasons[0]).not.toContain('declared `live`');
    expect(reasons[0]).toContain('Audit degraded');
    expect(reasons[0]).toMatch(/chain.*chain_root_hash.*evidence/i);
  });

  it('falls back to the neutral umbrella string when no audit comment is available (WHY)', () => {
    const reasons = collectAuditFailureReasons('why', WHY_DEGRADED_LABELS);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).not.toContain('declared `live`');
  });

  it('falls back to the neutral umbrella string when the comment reason is blank', () => {
    const reasons = collectAuditFailureReasons('how', HOW_DEGRADED_LABELS, '   ');
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).not.toContain('declared `live`');
  });

  it('does not produce any reason when no failure label is present', () => {
    expect(collectAuditFailureReasons('how', ['prd-draft'])).toHaveLength(0);
    expect(collectAuditFailureReasons('how', ['prd-draft', 'prd-pass'])).toHaveLength(0);
  });

  it('WHAT phase has a phase-specific design-degraded message (post-Bug-HH narrowed scope)', () => {
    const reasons = collectAuditFailureReasons('what', ['design-draft', 'design-degraded']);
    expect(reasons).toHaveLength(1);
    // Post-Bug-HH the message is scoped to mode-honesty + manifest (the
    // WHAT-specific causes). Pre-Bug-HH it was "Design-degraded (per-
    // repo mode honesty / FR-SR addresses[] coverage / chain failure)"
    // — the chain-failure framing was misleading since chain failures
    // now use chain-integrity-failed.
    expect(reasons[0]).toContain('Design degraded');
    expect(reasons[0]).toMatch(/mode.honesty|manifest/i);
  });
});

describe('Bug CC — chain-integrity-failed label is distinct from degraded-evidence', () => {
  it('uses the audit-comment Reason when chain-integrity-failed is applied alone', () => {
    const reasons = collectAuditFailureReasons(
      'how',
      ['prd-draft', 'chain-integrity-failed'],
      'chain_root_hash mismatch: agent did not paste a chain_root_hash; workflow derived 1f3859e3278c… from JSONL event 1.',
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('Audit chain integrity failed');
    expect(reasons[0]).toContain('chain_root_hash mismatch');
    // Must NOT mention evidence honesty — this isn't that case.
    expect(reasons[0]).not.toContain('evidence honesty');
    expect(reasons[0]).not.toContain('declared `live`');
  });

  it('falls back to the neutral chain stock message when no audit comment', () => {
    const reasons = collectAuditFailureReasons('how', ['prd-draft', 'chain-integrity-failed']);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('Audit chain integrity failed');
    // Stock message must list the umbrella causes so user knows where to look.
    expect(reasons[0]).toMatch(/hash chain|Knight.*Seal|chain_root_hash|unsealed|forged/i);
    expect(reasons[0]).not.toContain('declared `live`');
  });

  it('produces TWO reasons when both chain AND evidence labels are present (Bug CC pre-fix scenario)', () => {
    // After Bug CC verdict-step fix, chain branches no longer set
    // EVIDENCE_FAIL=true, so this combination shouldn't happen in
    // practice — but if a workflow regresses, both labels render
    // separately rather than collapsing into one misleading message.
    const reasons = collectAuditFailureReasons(
      'how',
      ['prd-draft', 'chain-integrity-failed', 'degraded-evidence'],
      'chain_root_hash mismatch: ...',
    );
    expect(reasons).toHaveLength(2);
    // Both should reference the chain reason since both are surfaced
    // through the same auditCommentReason fallback.
    expect(reasons.filter(r => r.includes('chain'))).toHaveLength(2);
  });

  it('legacy chain-forgery-detected label still resolves (transition period)', () => {
    const reasons = collectAuditFailureReasons(
      'how',
      ['prd-draft', 'chain-forgery-detected'],
      'chain_root_hash mismatch',
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('Audit chain integrity failed');
    expect(reasons[0]).toContain('chain_root_hash mismatch');
  });

  it('works for WHY phase too (market-research-agent applies the same label)', () => {
    const reasons = collectAuditFailureReasons(
      'why',
      ['research-synthesis', 'chain-integrity-failed'],
      'Knight\'s Seal verification failed: chain has signatures but at least one did not verify',
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('Knight');
  });

  it('works for WHAT phase — chain failures now apply chain-integrity-failed, not design-degraded (Bug HH)', () => {
    const reasons = collectAuditFailureReasons(
      'what',
      ['design-draft', 'chain-integrity-failed'],
      'chain_root_hash mismatch: ...',
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('Audit chain integrity failed');
    // Must NOT mention "Design-degraded" — Bug HH split says chain
    // failures are NOT design issues.
    expect(reasons[0]).not.toContain('Design-degraded');
    expect(reasons[0]).not.toContain('Design degraded');
  });
});

describe('Bug HH — WHAT design-degraded narrowed to mode-honesty + manifest', () => {
  it('design-degraded stock message reflects the new narrow scope (mode-honesty / manifest)', () => {
    const reasons = collectAuditFailureReasons('what', ['design-draft', 'design-degraded']);
    expect(reasons).toHaveLength(1);
    // The new stock message must call out mode-honesty + manifest
    // specifically — those are the WHAT-only causes that remain under
    // design-degraded after Bug HH.
    expect(reasons[0]).toMatch(/mode.honesty|manifest/i);
    // Must NOT use the old umbrella phrasing that included chain failures.
    expect(reasons[0]).not.toMatch(/chain failure/i);
  });

  it('WHAT structure-invalid renders the shared structural message', () => {
    const reasons = collectAuditFailureReasons('what', ['design-draft', 'structure-invalid']);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('Structural correctness');
  });

  it('WHAT can stack chain-integrity-failed + design-degraded if both fire (post-Bug-HH should be rare)', () => {
    const reasons = collectAuditFailureReasons(
      'what',
      ['design-draft', 'chain-integrity-failed', 'design-degraded'],
      'chain_root_hash mismatch: ...',
    );
    expect(reasons).toHaveLength(2);
    // Both reasons reference distinct concerns now, not a duplicated umbrella.
    expect(reasons.some(r => r.includes('chain integrity'))).toBe(true);
    expect(reasons.some(r => r.includes('mode-honesty') || r.includes('manifest'))).toBe(true);
  });
});

describe('Bug GG-followup — state-integrity-failed (agent touched okr.yaml)', () => {
  const stateReason = 'Agent PR modified okrs/OKR-2026Q2-IMDB-001-celeb-api/okr.yaml; OKR state is owned by Looking Glass dispatch/reset and finalize-okr-action (Bug GG-followup). Revert the okr.yaml change.';

  it('renders the workflow Reason text when the state label is applied (HOW)', () => {
    const reasons = collectAuditFailureReasons('how', ['prd-draft', 'state-integrity-failed'], stateReason);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('OKR state tampering');
    expect(reasons[0]).toContain('okr.yaml');
    // Must NOT bleed into chain or evidence messages.
    expect(reasons[0]).not.toContain('chain integrity');
    expect(reasons[0]).not.toContain('Hatter Tag');
  });

  it('falls back to a fixed stock state-tampering message when no comment available', () => {
    const reasons = collectAuditFailureReasons('how', ['prd-draft', 'state-integrity-failed']);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('OKR state tampering');
    expect(reasons[0]).toMatch(/okr\.yaml/);
    expect(reasons[0]).toContain('Looking Glass');
    expect(reasons[0]).toContain('finalize-okr-action');
  });

  it('works for WHY phase too (market-research-agent enforces the same boundary)', () => {
    const reasons = collectAuditFailureReasons('why', ['research-synthesis', 'state-integrity-failed'], stateReason);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('OKR state tampering');
  });

  it('works for WHAT phase too (code-design-agent enforces the same boundary)', () => {
    const reasons = collectAuditFailureReasons('what', ['design-draft', 'state-integrity-failed'], stateReason);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('OKR state tampering');
  });

  it('state + chain labels co-existing render BOTH messages distinctly', () => {
    // If a regression in the workflow's verdict step sets both, the UI
    // should still render two distinct messages — not collapse to one.
    const reasons = collectAuditFailureReasons(
      'how',
      ['prd-draft', 'state-integrity-failed', 'chain-integrity-failed'],
      'chain_root_hash mismatch: agent did not paste a chain_root_hash...',
    );
    expect(reasons).toHaveLength(2);
    // The state message uses its dedicated stock string when the
    // comment reason doesn't mention okr.yaml (the chain reason here
    // mentions chain_root_hash, not okr.yaml), so we get the stock
    // state message + the chain message with the workflow reason.
    expect(reasons.some(r => r.includes('OKR state tampering'))).toBe(true);
    expect(reasons.some(r => r.includes('chain integrity') && r.includes('chain_root_hash'))).toBe(true);
  });
});
