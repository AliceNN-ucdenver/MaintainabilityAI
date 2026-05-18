import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { canonicalizeUrl, dedupeAndRank } from './dedupe-and-rank';

test('canonicalizeUrl: lowercases host, strips fragment + trailing slash + tracking params', () => {
  const cases: Array<[string, string]> = [
    ['HTTPS://Example.com/Article/?utm_source=x&id=42#section', 'https://example.com/Article?id=42'],
    ['https://a.com:443/', 'https://a.com/'],
    ['http://a.com:80/x', 'http://a.com/x'],
    ['https://A.example.COM/path/', 'https://a.example.com/path'],
    ['https://x.com/?utm_medium=email&utm_campaign=q4&keep=1', 'https://x.com/?keep=1'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(canonicalizeUrl(input), expected, `for ${input}`);
  }
});

test('canonicalizeUrl: falls back gracefully on malformed input', () => {
  assert.equal(canonicalizeUrl('not a url'), 'not a url');
});

test('dedupeAndRank: collapses duplicates by canonical URL', () => {
  const ranked = dedupeAndRank({
    allResults: [
      { title: 'A', url: 'https://a.com/x', content: 'snippet', score: 0.8, fromQuery: 'q1' },
      { title: 'A', url: 'https://A.com/x?utm_source=x', content: 'snippet', score: 0.6, fromQuery: 'q2' },
      { title: 'B', url: 'https://b.com/y', content: 'other', score: 0.5, fromQuery: 'q1' },
    ],
    retrievedAt: '2026-05-17T00:00:00Z',
  });
  assert.equal(ranked.length, 2);
  // A surfaced from 2 queries → gets the recall boost, sits at top
  assert.equal(ranked[0].url.includes('a.com/x'), true);
  assert.equal(ranked[0].id, 'S1');
  assert.equal(ranked[1].id, 'S2');
});

test('dedupeAndRank: assigns sequential S1..SN ids in descending salience order', () => {
  const ranked = dedupeAndRank({
    allResults: [
      { title: 'low', url: 'https://low.com', content: '', score: 0.1, fromQuery: 'q' },
      { title: 'high', url: 'https://high.com', content: '', score: 0.9, fromQuery: 'q' },
      { title: 'mid', url: 'https://mid.com', content: '', score: 0.5, fromQuery: 'q' },
    ],
  });
  assert.deepEqual(ranked.map(r => r.id), ['S1', 'S2', 'S3']);
  assert.equal(ranked[0].url, 'https://high.com/');
  assert.equal(ranked[2].url, 'https://low.com/');
});

test('dedupeAndRank: caps to topN', () => {
  const allResults = Array.from({ length: 30 }, (_, i) => ({
    title: `t${i}`, url: `https://x.com/${i}`, content: '', score: 0.5, fromQuery: 'q',
  }));
  const ranked = dedupeAndRank({ allResults, topN: 5 });
  assert.equal(ranked.length, 5);
});

test('dedupeAndRank: skips entries with empty URLs', () => {
  const ranked = dedupeAndRank({
    allResults: [
      { title: 'has url', url: 'https://x.com', content: '', score: 0.5, fromQuery: 'q' },
      { title: 'empty', url: '', content: '', score: 0.5, fromQuery: 'q' },
    ],
  });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].title, 'has url');
});

test('dedupeAndRank: salience score never exceeds 1', () => {
  const ranked = dedupeAndRank({
    allResults: Array.from({ length: 10 }, (_, i) => ({
      title: 't', url: 'https://x.com/same', content: '', score: 0.95, fromQuery: `q${i}`,
    })),
  });
  // All 10 results dedupe to one entry; even with the recall boost, score is clamped to 1.
  assert.equal(ranked.length, 1);
  assert.ok(ranked[0].salience_score <= 1, `score ${ranked[0].salience_score} should be ≤ 1`);
});
