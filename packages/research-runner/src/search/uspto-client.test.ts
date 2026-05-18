import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { usptoSearch } from './uspto-client';

test('usptoSearch: throws when apiKey missing', async () => {
  await assert.rejects(
    () => usptoSearch({ apiKey: '', query: 'governance AND mesh', fetchImpl: async () => new Response('') }),
    /USPTO_API_KEY missing.*data\.uspto\.gov/,
  );
});

test('usptoSearch: GETs api.uspto.gov with X-API-Key and URL-encoded q', async () => {
  let captured: { url: string; init: RequestInit } | null = null;
  const fetchImpl: typeof fetch = async (url, init) => {
    captured = { url: String(url), init: init as RequestInit };
    return new Response(JSON.stringify({
      patentFileWrapperDataBag: [
        {
          applicationMetaData: {
            inventionTitle: 'Mesh governance system',
            filingDate: '2024-03-12',
            grantDate: '2026-01-15',
            patentNumber: '11999999',
            firstInventorName: 'Alice Smith',
          },
          // No XML URIs in this mock → stage 2 is skipped, abstract stays ''
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const result = await usptoSearch({
    apiKey: 'test-key',
    query: 'governance AND mesh AND architecture',
    fetchImpl,
  });

  assert.ok(captured);
  const c = captured as { url: string; init: RequestInit };
  // GET, not POST
  assert.equal(c.init.method, 'GET');
  // URL is the api.uspto.gov endpoint with the query URL-encoded
  assert.ok(c.url.startsWith('https://api.uspto.gov/api/v1/patent/applications/search?'),
            `unexpected URL: ${c.url}`);
  assert.match(c.url, /q=governance%20AND%20mesh%20AND%20architecture/);
  assert.match(c.url, /limit=5/);
  // Auth header uses X-API-Key (capital K) per USPTO ODP convention
  const headers = (c.init.headers ?? {}) as Record<string, string>;
  assert.equal(headers['X-API-Key'], 'test-key');

  // Result shape preserved (UsptoResult interface stable across endpoint migration)
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].patentNumber, '11999999');
  assert.equal(result.results[0].title, 'Mesh governance system');
  assert.equal(result.results[0].url, 'https://patents.google.com/patent/US11999999');
  assert.equal(result.results[0].grantedAt, '2026-01-15');
  assert.deepEqual(result.results[0].inventors, ['Alice Smith']);
});

test('usptoSearch: stage 2 follows pgpubDocumentMetaData.fileLocationURI and extracts <abstract>', async () => {
  const xmlUri = 'https://api.uspto.gov/path/to/patent.xml';
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.startsWith('https://api.uspto.gov/api/v1/patent/applications/search')) {
      return new Response(JSON.stringify({
        patentFileWrapperDataBag: [
          {
            applicationMetaData: { inventionTitle: 'Foo', earliestPublicationNumber: '20240001' },
            pgpubDocumentMetaData: { fileLocationURI: xmlUri },
          },
        ],
      }), { status: 200 });
    }
    if (u === xmlUri) {
      return new Response(
        '<root><abstract><p>A method for <i>governance</i>.</p></abstract></root>',
        { status: 200, headers: { 'content-type': 'application/xml' } },
      );
    }
    throw new Error(`unexpected URL: ${u}`);
  };

  const result = await usptoSearch({ apiKey: 'k', query: 'foo', fetchImpl });
  assert.equal(result.results.length, 1);
  // Tags stripped + whitespace collapsed
  assert.equal(result.results[0].abstract, 'A method for governance .');
  // Both calls were issued (search + xml fetch)
  assert.equal(calls.length, 2);
});

test('usptoSearch: stage 2 failure does not break the search result', async () => {
  const fetchImpl: typeof fetch = async (url) => {
    const u = String(url);
    if (u.startsWith('https://api.uspto.gov/api/v1/patent/applications/search')) {
      return new Response(JSON.stringify({
        patentFileWrapperDataBag: [
          {
            applicationMetaData: { inventionTitle: 'Bar', patentNumber: '12000000' },
            grantDocumentMetaData: { fileLocationURI: 'https://bad.example/x.xml' },
          },
        ],
      }), { status: 200 });
    }
    // XML fetch fails — should be swallowed by stage 2's best-effort handler
    return new Response('not found', { status: 404 });
  };
  const result = await usptoSearch({ apiKey: 'k', query: 'bar', fetchImpl });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].abstract, '');
  assert.equal(result.results[0].title, 'Bar');
});

test('usptoSearch: throws with status + body on non-2xx', async () => {
  const fetchImpl: typeof fetch = async () => new Response('quota exceeded', { status: 429 });
  await assert.rejects(
    () => usptoSearch({ apiKey: 'k', query: 'q', fetchImpl }),
    /USPTO ODP returned 429.*quota exceeded/,
  );
});
