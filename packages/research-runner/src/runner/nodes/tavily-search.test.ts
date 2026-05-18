import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { runTavilySearch } from './tavily-search';

function mockResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), { status: init.status ?? 200 });
}

test('runTavilySearch: runs every query and tags results with fromQuery', async () => {
  const queries = ['q1', 'q2', 'q3'];
  const fetchImpl: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String((init as RequestInit).body));
    return mockResponse({
      results: [
        { title: `result for ${body.query}`, url: `https://x.com/${body.query}`, content: 'snippet', score: 0.8 },
      ],
    });
  };

  const result = await runTavilySearch({ apiKey: 'tvly-test', queries, fetchImpl });
  assert.equal(result.envelopes.length, 3);
  assert.equal(result.results.length, 3);
  assert.deepEqual(result.results.map(r => r.fromQuery), queries);
});

test('runTavilySearch: isolates per-query failures into node_error envelopes', async () => {
  const queries = ['ok', 'fail', 'ok2'];
  const fetchImpl: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String((init as RequestInit).body));
    if (body.query === 'fail') {
      return mockResponse('upstream blew up', { status: 500 });
    }
    return mockResponse({ results: [{ title: 't', url: `https://x.com/${body.query}`, content: '', score: 0.5 }] });
  };

  const result = await runTavilySearch({ apiKey: 'k', queries, fetchImpl });
  assert.equal(result.envelopes.length, 3);
  assert.match(result.envelopes[1].error ?? '', /Tavily returned 500/);
  assert.equal(result.envelopes[0].resultCount, 1);
  assert.equal(result.envelopes[2].resultCount, 1);
  // Flat results skip the failed query
  assert.equal(result.results.length, 2);
});

test('runTavilySearch: throws when apiKey missing (fail-fast)', async () => {
  await assert.rejects(
    () => runTavilySearch({ apiKey: '', queries: ['q'] }),
    /TAVILY_API_KEY missing/,
  );
});
