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
