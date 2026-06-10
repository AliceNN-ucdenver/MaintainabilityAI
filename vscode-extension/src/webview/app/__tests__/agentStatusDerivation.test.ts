/**
 * Characterization tests for deriveAgentStatus — the keyword/label ladder
 * extracted verbatim from oraculum.ts updateAgentStatus (which had no
 * coverage). Pins each branch + precedence so the ladder can evolve safely.
 */
import { describe, it, expect } from 'vitest';
import { deriveAgentStatus } from '../agentStatusDerivation';
import type { IssueComment } from '../types';

let nextId = 1;
function comment(body: string, over: Partial<IssueComment> = {}): IssueComment {
  return {
    id: nextId++,
    author: over.isBot === false ? 'human' : 'copilot[bot]',
    authorAvatarUrl: '',
    body,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    isBot: true,
    ...over,
  };
}

describe('deriveAgentStatus — ladder branches', () => {
  it('defaults to analyzing when no bot comment exists', () => {
    const r = deriveAgentStatus([comment('human note', { isBot: false })], false, []);
    expect(r.status).toBe('analyzing');
    expect(r.text).toBe('Agent is analyzing...');
  });

  it('needsApproval wins over every other signal (awaiting-approval)', () => {
    const r = deriveAgentStatus(
      [comment('implementation complete, running tests')],
      true,
      ['remediation-in-progress', 'remediation-complete'],
    );
    expect(r.status).toBe('awaiting-approval');
    expect(r.text).toContain('waiting for your approval');
  });

  it('remediation-planning without needsApproval → approval-sent', () => {
    const r = deriveAgentStatus([comment('plan posted')], false, ['remediation-planning']);
    expect(r.status).toBe('approval-sent');
  });

  it('remediation-in-progress → implementing; with test keywords → testing', () => {
    expect(deriveAgentStatus([comment('working on it')], false, ['remediation-in-progress']).status).toBe('implementing');
    expect(deriveAgentStatus([comment('now running tests')], false, ['remediation-in-progress']).status).toBe('testing');
  });

  it('completion keywords → complete; pull-request mention upgrades the text', () => {
    const plain = deriveAgentStatus([comment('Analysis complete.')], false, []);
    expect(plain.status).toBe('complete');
    expect(plain.text).toBe('Review complete');
    const withPr = deriveAgentStatus([comment('Review complete — opened a pull request')], false, []);
    expect(withPr.status).toBe('complete');
    expect(withPr.text).toBe('Review complete — PR created');
  });

  it('remediation-complete label forces complete + PR text even without keywords', () => {
    const r = deriveAgentStatus([comment('done-ish')], false, ['remediation-complete']);
    expect(r.status).toBe('complete');
    expect(r.text).toBe('Review complete — PR created');
  });

  it('keyword-only ladder: testing > implementing > planning > working', () => {
    expect(deriveAgentStatus([comment('npm test output incoming')], false, []).status).toBe('testing');
    expect(deriveAgentStatus([comment('starting implementation now')], false, []).status).toBe('implementing');
    expect(deriveAgentStatus([comment('here is my approach')], false, []).status).toBe('planning');
    expect(deriveAgentStatus([comment('hello world')], false, []).status).toBe('working');
  });

  it('uses the LAST bot comment for keywords', () => {
    const r = deriveAgentStatus(
      [comment('here is my plan'), comment('now running tests')],
      false,
      [],
    );
    expect(r.status).toBe('testing');
  });
});

describe('deriveAgentStatus — live-update suffix', () => {
  const edited = { updatedAt: '2026-06-01T00:05:00Z' };

  it('appends the suffix when the last comment is an edited bot comment', () => {
    const r = deriveAgentStatus([comment('writing code', edited)], false, []);
    expect(r.text).toContain('(comment being updated live)');
  });

  it('never appends on complete or awaiting-approval', () => {
    expect(deriveAgentStatus([comment('analysis complete', edited)], false, []).text)
      .not.toContain('updated live');
    expect(deriveAgentStatus([comment('plan ready', edited)], true, []).text)
      .not.toContain('updated live');
  });

  it('no suffix when the last comment is human', () => {
    const r = deriveAgentStatus(
      [comment('writing code'), comment('looks good?', { isBot: false, ...edited })],
      false,
      [],
    );
    expect(r.text).not.toContain('updated live');
  });
});
