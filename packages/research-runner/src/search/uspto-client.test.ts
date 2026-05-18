import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { usptoSearch } from './uspto-client';

test('usptoSearch: throws when apiKey missing', async () => {
  await assert.rejects(
    () => usptoSearch({ apiKey: '', query: 'governance AND mesh', fetchImpl: async () => new Response('') }),
    /USPTO_API_KEY missing.*patentsview.org/,
  );
});

test('usptoSearch: POSTs PatentsView with X-Api-Key + AND-decomposed query', async () => {
  let captured: { url: string; init: RequestInit } | null = null;
  const fetchImpl: typeof fetch = async (url, init) => {
    captured = { url: String(url), init: init as RequestInit };
    return new Response(JSON.stringify({
      patents: [
        { patent_id: '11111111', patent_title: 'Mesh governance system', patent_abstract: 'A system for...', patent_date: '2026-01-15', inventors: [{ inventor_name_first: 'Alice', inventor_name_last: 'Smith' }] },
      ],
    }), { status: 200 });
  };

  const result = await usptoSearch({
    apiKey: 'test-key',
    query: 'governance AND mesh AND architecture',
    fetchImpl,
  });

  assert.ok(captured);
  assert.equal((captured as { url: string }).url, 'https://search.patentsview.org/api/v1/patent/');
  const headers = ((captured as { init: RequestInit }).init.headers ?? {}) as Record<string, string>;
  assert.equal(headers['X-Api-Key'], 'test-key');
  const body = JSON.parse(String((captured as { init: RequestInit }).init.body));
  // Three AND-joined terms become a 3-element _and array of _text_any queries
  assert.ok(Array.isArray(body.q._and));
  assert.equal(body.q._and.length, 3);

  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].patentNumber, '11111111');
  assert.equal(result.results[0].url, 'https://patents.google.com/patent/US11111111');
  assert.deepEqual(result.results[0].inventors, ['Alice Smith']);
});

test('usptoSearch: throws with status + body on non-2xx', async () => {
  const fetchImpl: typeof fetch = async () => new Response('quota exceeded', { status: 429 });
  await assert.rejects(
    () => usptoSearch({ apiKey: 'k', query: 'q', fetchImpl }),
    /PatentsView returned 429.*quota exceeded/,
  );
});
