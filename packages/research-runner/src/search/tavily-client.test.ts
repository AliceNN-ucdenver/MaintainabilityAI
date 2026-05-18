import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { tavilySearch } from './tavily-client';

function mockResponse(body: unknown, init: { status?: number } = {}): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(text, { status: init.status ?? 200, headers: { 'content-type': 'application/json' } });
}

test('tavilySearch: posts the expected request shape', async () => {
  let captured: { url: string; init: RequestInit } | null = null;
  const fetchImpl: typeof fetch = async (url, init) => {
    captured = { url: String(url), init: init as RequestInit };
    return mockResponse({ results: [] });
  };

  await tavilySearch({
    apiKey: 'tvly-test',
    query: 'agentic governance 2026',
    maxResults: 7,
    searchDepth: 'advanced',
    fetchImpl,
  });

  assert.ok(captured);
  assert.equal((captured as { url: string }).url, 'https://api.tavily.com/search');
  const body = JSON.parse(String((captured as { init: RequestInit }).init.body));
  assert.equal(body.api_key, 'tvly-test');
  assert.equal(body.query, 'agentic governance 2026');
  assert.equal(body.max_results, 7);
  assert.equal(body.search_depth, 'advanced');
});

test('tavilySearch: normalises results and counts bytes', async () => {
  const responseBody = {
    results: [
      { title: 'A', url: 'https://a.example/x', content: 'a snippet', score: 0.9, published_date: '2026-01-01' },
      { title: 'B', url: 'https://b.example/y', content: 'b snippet', score: 0.7 },
      { /* missing url should be dropped */ title: 'no-url', content: '', score: 0.1 },
    ],
  };
  const fetchImpl: typeof fetch = async () => mockResponse(responseBody);

  const result = await tavilySearch({ apiKey: 'k', query: 'q', fetchImpl });
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].url, 'https://a.example/x');
  assert.equal(result.results[0].publishedDate, '2026-01-01');
  assert.equal(result.results[1].score, 0.7);
  assert.equal(result.httpStatus, 200);
  assert.ok(result.responseBytes > 0);
});

test('tavilySearch: throws on non-2xx with status + body', async () => {
  const fetchImpl: typeof fetch = async () => mockResponse('quota exceeded', { status: 432 });
  await assert.rejects(
    () => tavilySearch({ apiKey: 'k', query: 'q', fetchImpl }),
    /Tavily returned 432.*quota exceeded/,
  );
});

test('tavilySearch: throws when apiKey is missing', async () => {
  await assert.rejects(
    () => tavilySearch({ apiKey: '', query: 'q' }),
    /TAVILY_API_KEY missing/,
  );
});
