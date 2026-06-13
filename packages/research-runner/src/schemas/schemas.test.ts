/**
 * Schema round-trip + validation rule tests for the surviving schema surface.
 *
 * Trimmed 2026-06-13 with the archeologist/prd retirement: the pipeline I/O
 * schemas (ResearchBrief, PrdBrief, QueryPlan) and the pipeline `node_kind`
 * AuditEvent union were removed, so their tests went with them. What remains
 * is the search-rail surface the skills still use: RunId (primitives) and
 * RankedSource. The live agentic-SDLC audit chain is exercised by
 * `runner/skills.test.ts`, not here.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { RankedSource, RunId } from './index';

// ---------- primitives ----------

test('RunId: accepts canonical RES/PRD formats; rejects others', () => {
  assert.equal(RunId.safeParse('RES-2026-05-17-abcdef12').success, true);
  assert.equal(RunId.safeParse('PRD-2026-05-17-00000000').success, true);
  assert.equal(RunId.safeParse('FOO-2026-05-17-abcdef12').success, false);
  assert.equal(RunId.safeParse('RES-2026-5-17-abcdef12').success, false);  // single-digit month
  assert.equal(RunId.safeParse('RES-2026-05-17-ABCDEF12').success, false); // uppercase hex
});

// ---------- RankedSource ----------

test('RankedSource: enforces id pattern + url + salience range', () => {
  const ok = RankedSource.parse({
    id: 'S1',
    provider: 'tavily',
    title: 'something',
    url: 'https://example.com/article',
    retrieved_at: new Date().toISOString(),
    salience_score: 0.83,
    excerpt: 'short excerpt',
  });
  assert.equal(ok.id, 'S1');

  assert.throws(() => RankedSource.parse({
    id: 'SX',  // not S<digits>
    provider: 'tavily',
    title: 'x',
    url: 'https://x.com',
    retrieved_at: new Date().toISOString(),
    salience_score: 0.5,
    excerpt: '',
  }));

  assert.throws(() => RankedSource.parse({
    id: 'S1',
    provider: 'tavily',
    title: 'x',
    url: 'https://x.com',
    retrieved_at: new Date().toISOString(),
    salience_score: 1.5,  // out of range
    excerpt: '',
  }));
});
