import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { hackerNewsSearch } from './hackernews-client';

test('hackerNewsSearch: GETs Algolia with tags=story + URL-encoded query', async () => {
  let capturedUrl = '';
  const fetchImpl: typeof fetch = async (url) => {
    capturedUrl = String(url);
    return new Response(JSON.stringify({ hits: [] }), { status: 200 });
  };
  await hackerNewsSearch({ query: 'agentic prd', fetchImpl });
  assert.match(capturedUrl, /^https:\/\/hn\.algolia\.com\/api\/v1\/search\?/);
  assert.match(capturedUrl, /query=agentic%20prd/);
  assert.match(capturedUrl, /tags=story/);
});

test('hackerNewsSearch: normalises hits with hnUrl derived from objectID', async () => {
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
    hits: [
      { objectID: '12345', title: 'Show HN: Mesh Governance', url: 'https://example.com/post', author: 'alice', points: 250, num_comments: 42, created_at: '2026-04-01T00:00:00Z' },
      { objectID: '12346', title: 'Ask HN: AI agents', url: '', author: 'bob', points: 50, num_comments: 5, created_at: '2026-04-02T00:00:00Z' },
      { /* missing objectID — dropped */ title: 'no id', points: 1, num_comments: 0 },
    ],
  }), { status: 200 });

  const result = await hackerNewsSearch({ query: 'q', fetchImpl });
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].url, 'https://example.com/post');
  assert.equal(result.results[0].hnUrl, 'https://news.ycombinator.com/item?id=12345');
  assert.equal(result.results[0].points, 250);
  // Empty external URL preserved; hnUrl always present
  assert.equal(result.results[1].url, '');
  assert.equal(result.results[1].hnUrl, 'https://news.ycombinator.com/item?id=12346');
});

test('hackerNewsSearch: throws with status + body on non-2xx', async () => {
  const fetchImpl: typeof fetch = async () => new Response('upstream error', { status: 503 });
  await assert.rejects(
    () => hackerNewsSearch({ query: 'q', fetchImpl }),
    /Hacker News \(Algolia\) returned 503.*upstream error/,
  );
});
