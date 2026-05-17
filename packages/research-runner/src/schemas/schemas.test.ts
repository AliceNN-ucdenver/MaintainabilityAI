/**
 * Schema round-trip + validation rule tests. One representative test per
 * schema — full coverage lands when phase 2+ nodes actually populate them.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  AuditEvent,
  PrdBrief,
  QueryPlan,
  RankedSource,
  ResearchBrief,
  RunId,
} from './index';

// ---------- primitives ----------

test('RunId: accepts canonical RES/PRD formats; rejects others', () => {
  assert.equal(RunId.safeParse('RES-2026-05-17-abcdef12').success, true);
  assert.equal(RunId.safeParse('PRD-2026-05-17-00000000').success, true);
  assert.equal(RunId.safeParse('FOO-2026-05-17-abcdef12').success, false);
  assert.equal(RunId.safeParse('RES-2026-5-17-abcdef12').success, false);  // single-digit month
  assert.equal(RunId.safeParse('RES-2026-05-17-ABCDEF12').success, false); // uppercase hex
});

// ---------- ResearchBrief ----------

test('ResearchBrief: minimal valid brief parses', () => {
  const parsed = ResearchBrief.parse({
    topic: 'agentic governance landscape',
    scope: { level: 'bar', id: 'APP-IMDB-002' },
    trigger: { kind: 'workflow_dispatch' },
  });
  assert.equal(parsed.path, 'research');           // default applied
  assert.equal(parsed.guardrails, 'default');
  assert.equal(parsed.llm_provider, 'anthropic');
  assert.equal(parsed.cost_cap_tokens, 200_000);
});

test('ResearchBrief: archaeology path without target_repo is rejected', () => {
  const result = ResearchBrief.safeParse({
    topic: 'analyze celeb-api',
    scope: { level: 'bar', id: 'APP-IMDB-002' },
    path: 'archaeology',
    trigger: { kind: 'workflow_dispatch' },
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some(i => i.path.join('.') === 'target_repo'));
  }
});

test('ResearchBrief: BAR scope without id is rejected', () => {
  const result = ResearchBrief.safeParse({
    topic: 'x',
    scope: { level: 'bar' },
    trigger: { kind: 'workflow_dispatch' },
  });
  assert.equal(result.success, false);
});

test('ResearchBrief: portfolio scope with id is rejected', () => {
  const result = ResearchBrief.safeParse({
    topic: 'x',
    scope: { level: 'portfolio', id: 'SHOULD-NOT-BE-HERE' },
    trigger: { kind: 'workflow_dispatch' },
  });
  assert.equal(result.success, false);
});

// ---------- QueryPlan ----------

test('QueryPlan: web queries must include a year', () => {
  const valid = QueryPlan.safeParse({
    web: [
      'agentic governance market 2026',
      'PRD generation standards 2026',
      'governance threat models 2026',
      'CALM architecture adoption 2026',
      'AI coding agent case studies 2026',
    ],
    arxiv: ['agentic planning', 'governed code generation', 'spec inference'],
    patent: [
      'governance AND mesh AND architecture',
      'agent AND policy AND enforcement',
      'mesh AND audit AND chain',
    ],
    community: ['agentic prd', 'mesh governance', 'red queen rules'],
  });
  assert.equal(valid.success, true);

  const noYear = QueryPlan.safeParse({
    web: ['agentic governance market', 'a', 'b', 'c', 'd'],
    arxiv: ['a', 'b', 'c'],
    patent: ['a AND b', 'c AND d', 'e AND f'],
    community: ['a', 'b', 'c'],
  });
  assert.equal(noYear.success, false);
});

test('QueryPlan: patent queries must use AND', () => {
  const result = QueryPlan.safeParse({
    web: ['2026 a', '2026 b', '2026 c', '2026 d', '2026 e'],
    arxiv: ['a', 'b', 'c'],
    patent: ['just keywords', 'no boolean', 'still no'],
    community: ['a', 'b', 'c'],
  });
  assert.equal(result.success, false);
});

test('QueryPlan: wrong counts are rejected', () => {
  const result = QueryPlan.safeParse({
    web: ['2026 a', '2026 b'],       // only 2, need 5
    arxiv: ['a', 'b', 'c'],
    patent: ['a AND b', 'c AND d', 'e AND f'],
    community: ['a', 'b', 'c'],
  });
  assert.equal(result.success, false);
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

// ---------- PrdBrief ----------

test('PrdBrief: research_source discriminator round-trip', () => {
  const fromPr = PrdBrief.parse({
    research_source: { kind: 'pr', url: 'https://github.com/x/y/pull/42' },
    scope: { level: 'bar', id: 'APP-IMDB-002' },
    trigger: { kind: 'workflow_dispatch' },
  });
  assert.equal(fromPr.research_source.kind, 'pr');

  const fromPath = PrdBrief.parse({
    research_source: { kind: 'path', relative_path: 'platforms/imdb-lite/bars/APP-IMDB-002/research/x.md' },
    scope: { level: 'bar', id: 'APP-IMDB-002' },
    trigger: { kind: 'workflow_dispatch' },
  });
  assert.equal(fromPath.research_source.kind, 'path');
});

// ---------- AuditEvent ----------

test('AuditEvent: discriminated union routes by node_kind', () => {
  const llm = AuditEvent.parse({
    run_id: 'RES-2026-05-17-abcdef12',
    event_id: 3,
    ts: new Date().toISOString(),
    node_name: 'synthesize_report',
    node_kind: 'llm',
    duration_ms: 5000,
    prev_event_hash: 'a'.repeat(64),
    event_hash: 'b'.repeat(64),
    llm: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      prompt_pack: {
        path: '.caterpillar/prompts/research/synthesis.md@v1.0.0',
        sha256: 'c'.repeat(64),
      },
      input_tokens: 12000,
      output_tokens: 3000,
      cost_usd: 0.42,
      guardrails: { mode: 'default', pre: 'PASS', post: 'PASS' },
    },
  });
  assert.equal(llm.node_kind, 'llm');
  if (llm.node_kind === 'llm') {
    assert.equal(llm.llm.provider, 'anthropic');
  }

  // Wrong shape for the discriminator should reject
  const bad = AuditEvent.safeParse({
    run_id: 'RES-2026-05-17-abcdef12',
    event_id: 1,
    ts: new Date().toISOString(),
    node_name: 'x',
    node_kind: 'pure',
    duration_ms: 0,
    prev_event_hash: null,
    event_hash: 'a'.repeat(64),
    // missing required `pure` block
  });
  assert.equal(bad.success, false);
});
