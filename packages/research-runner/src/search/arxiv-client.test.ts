import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { arxivSearch, parseArxivAtom } from './arxiv-client';

const SAMPLE_ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2401.12345v2</id>
    <title>Agentic Planning: A Survey</title>
    <summary>This paper surveys agentic planning approaches in modern LLMs and discusses governance implications.</summary>
    <published>2026-04-15T00:00:00Z</published>
    <author><name>Alice Researcher</name></author>
    <author><name>Bob Scientist</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2402.55555</id>
    <title>Spec Inference From Code</title>
    <summary>We propose a method for inferring specifications from existing codebases.</summary>
    <published>2026-04-20T00:00:00Z</published>
    <author><name>Carol Engineer</name></author>
  </entry>
</feed>`;

test('parseArxivAtom: extracts entries with id + title + summary + published + authors', () => {
  const results = parseArxivAtom(SAMPLE_ATOM);
  assert.equal(results.length, 2);
  assert.equal(results[0].id, '2401.12345');
  assert.equal(results[0].title, 'Agentic Planning: A Survey');
  assert.equal(results[0].abstractUrl, 'https://arxiv.org/abs/2401.12345');
  assert.equal(results[0].published, '2026-04-15T00:00:00Z');
  assert.deepEqual(results[0].authors, ['Alice Researcher', 'Bob Scientist']);
  assert.equal(results[1].id, '2402.55555');
});

test('parseArxivAtom: returns [] for malformed input', () => {
  assert.deepEqual(parseArxivAtom(''), []);
  assert.deepEqual(parseArxivAtom('<feed></feed>'), []);
  assert.deepEqual(parseArxivAtom('not xml'), []);
});

test('arxivSearch: GET to export.arxiv.org with encoded all: query', async () => {
  let capturedUrl = '';
  const fetchImpl: typeof fetch = async (url) => {
    capturedUrl = String(url);
    return new Response(SAMPLE_ATOM, { status: 200 });
  };
  const result = await arxivSearch({ query: 'agentic planning', fetchImpl });
  assert.match(capturedUrl, /^http:\/\/export\.arxiv\.org\/api\/query\?/);
  assert.match(capturedUrl, /search_query=all%3Aagentic%20planning/);
  assert.equal(result.results.length, 2);
  assert.ok(result.responseBytes > 0);
});

test('arxivSearch: throws with status + body on non-2xx', async () => {
  const fetchImpl: typeof fetch = async () => new Response('rate limited', { status: 429 });
  await assert.rejects(
    () => arxivSearch({ query: 'x', fetchImpl }),
    /arXiv returned 429.*rate limited/,
  );
});
