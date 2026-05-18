/**
 * Combined tests for the three new search nodes (arxiv / hn / uspto).
 * Their shapes are isomorphic to tavily-search; we verify each correctly
 * routes per-query results into the shared ProviderResult shape and
 * surfaces per-query failures as envelope.error rather than crashing.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { runArxivSearch } from './arxiv-search';
import { runHackerNewsSearch } from './hackernews-search';
import { runUsptoSearch } from './uspto-search';

const ARXIV_ATOM = `<feed><entry><id>http://arxiv.org/abs/2401.99999v1</id><title>Test Paper</title><summary>Summary text.</summary><published>2026-04-15T00:00:00Z</published><author><name>Author One</name></author></entry></feed>`;

test('runArxivSearch: produces ProviderResult with provider=arxiv + position-derived score', async () => {
  const fetchImpl: typeof fetch = async () => new Response(ARXIV_ATOM, { status: 200 });
  const result = await runArxivSearch({ queries: ['q1', 'q2'], fetchImpl });
  assert.equal(result.envelopes.length, 2);
  assert.equal(result.results.length, 2);  // one per query (one entry each)
  for (const r of result.results) {
    assert.equal(r.provider, 'arxiv');
    assert.equal(r.url, 'https://arxiv.org/abs/2401.99999');
    assert.deepEqual(r.authors, ['Author One']);
    // First-result score is 0.9 (top position)
    assert.equal(r.score, 0.9);
  }
});

test('runArxivSearch: isolates per-query failures into envelope.error', async () => {
  let call = 0;
  const fetchImpl: typeof fetch = async () => {
    call += 1;
    if (call === 2) { return new Response('rate limited', { status: 429 }); }
    return new Response(ARXIV_ATOM, { status: 200 });
  };
  const result = await runArxivSearch({ queries: ['ok', 'fail', 'ok2'], fetchImpl });
  assert.equal(result.envelopes.length, 3);
  assert.match(result.envelopes[1].error ?? '', /arXiv returned 429/);
  assert.equal(result.envelopes[0].error, undefined);
  assert.equal(result.envelopes[2].error, undefined);
  assert.equal(result.results.length, 2);
});

test('runHackerNewsSearch: produces ProviderResult with provider=hackernews + log-scaled score', async () => {
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
    hits: [{ objectID: '1', title: 'Hot Post', url: 'https://example.com/x', author: 'a', points: 1000, num_comments: 100, created_at: '2026-04-01T00:00:00Z' }],
  }), { status: 200 });
  const result = await runHackerNewsSearch({ queries: ['agentic prd'], fetchImpl });
  assert.equal(result.results.length, 1);
  const r = result.results[0];
  assert.equal(r.provider, 'hackernews');
  assert.equal(r.url, 'https://example.com/x');
  // log(1001)/8 ≈ 0.864
  assert.ok(r.score > 0.8 && r.score < 0.9, `score=${r.score}`);
});

test('runHackerNewsSearch: drops hits with no external URL AND no hnUrl', async () => {
  // hnUrl is derived from objectID; a hit with no objectID is dropped at client level.
  // Here we test the node-level filter: missing both url and hnUrl → not included.
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
    hits: [
      { objectID: '', title: 'no id', url: '', points: 1, num_comments: 0 },
      { objectID: '2', title: 'fallback to hn', url: '', points: 10, num_comments: 1, created_at: '2026-01-01' },
    ],
  }), { status: 200 });
  const result = await runHackerNewsSearch({ queries: ['q'], fetchImpl });
  assert.equal(result.results.length, 1);
  // Falls back to HN discussion thread when external URL absent
  assert.equal(result.results[0].url, 'https://news.ycombinator.com/item?id=2');
});

test('runUsptoSearch: throws when apiKey missing (orchestrator catches as node_error)', async () => {
  await assert.rejects(
    () => runUsptoSearch({ apiKey: '', queries: ['governance AND mesh'] }),
    /USPTO_API_KEY missing/,
  );
});

test('runUsptoSearch: produces ProviderResult with provider=uspto + inventors as authors', async () => {
  // New api.uspto.gov ODP shape (patentFileWrapperDataBag / applicationMetaData).
  // No XML URI in this mock → stage 2 is skipped → abstract stays empty.
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
    patentFileWrapperDataBag: [
      {
        applicationMetaData: {
          inventionTitle: 'Governance Mesh',
          filingDate: '2024-06-01',
          grantDate: '2026-02-01',
          patentNumber: '22222222',
          firstInventorName: 'Alice Smith',
        },
      },
    ],
  }), { status: 200 });
  const result = await runUsptoSearch({ apiKey: 'k', queries: ['governance AND mesh'], fetchImpl });
  assert.equal(result.results.length, 1);
  const r = result.results[0];
  assert.equal(r.provider, 'uspto');
  assert.equal(r.url, 'https://patents.google.com/patent/US22222222');
  assert.deepEqual(r.authors, ['Alice Smith']);
});
