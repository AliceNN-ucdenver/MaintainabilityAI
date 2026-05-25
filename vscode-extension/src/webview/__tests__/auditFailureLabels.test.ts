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

  it('WHAT phase still uses its specific design-degraded message (untouched by Bug BB)', () => {
    const reasons = collectAuditFailureReasons('what', ['design-draft', 'design-degraded']);
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('Design-degraded');
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
});
