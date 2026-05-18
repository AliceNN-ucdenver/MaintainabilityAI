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
    results: [
      { title: 'A', url: 'https://a.com/x', content: 'snippet', score: 0.8, provider: 'tavily', fromQuery: 'q1' },
      { title: 'A', url: 'https://A.com/x?utm_source=x', content: 'snippet', score: 0.6, provider: 'tavily', fromQuery: 'q2' },
      { title: 'B', url: 'https://b.com/y', content: 'other', score: 0.5, provider: 'tavily', fromQuery: 'q1' },
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
    results: [
      { title: 'low', url: 'https://low.com', content: '', score: 0.1, provider: 'tavily', fromQuery: 'q' },
      { title: 'high', url: 'https://high.com', content: '', score: 0.9, provider: 'tavily', fromQuery: 'q' },
      { title: 'mid', url: 'https://mid.com', content: '', score: 0.5, provider: 'tavily', fromQuery: 'q' },
    ],
  });
  assert.deepEqual(ranked.map(r => r.id), ['S1', 'S2', 'S3']);
  assert.equal(ranked[0].url, 'https://high.com/');
  assert.equal(ranked[2].url, 'https://low.com/');
});

test('dedupeAndRank: caps to topN', () => {
  const results = Array.from({ length: 30 }, (_, i) => ({
    title: `t${i}`, url: `https://x.com/${i}`, content: '', score: 0.5, provider: 'tavily' as const, fromQuery: 'q',
  }));
  const ranked = dedupeAndRank({ results, topN: 5 });
  assert.equal(ranked.length, 5);
});

test('dedupeAndRank: skips entries with empty URLs', () => {
  const ranked = dedupeAndRank({
    results: [
      { title: 'has url', url: 'https://x.com', content: '', score: 0.5, provider: 'tavily', fromQuery: 'q' },
      { title: 'empty', url: '', content: '', score: 0.5, provider: 'tavily', fromQuery: 'q' },
    ],
  });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].title, 'has url');
});

test('dedupeAndRank: per-provider quota keeps HN + USPTO from being crushed by Tavily scores', () => {
  // Regression: in production we observed 40 Tavily (score 0.92–1.00) + 11 HN
  // + 5 USPTO + 15 arXiv → top-20 ranked was 19/0/0/1, completely wiping
  // patent + community coverage. Provider quotas should guarantee at
  // least PROVIDER_QUOTA slots per provider when raw results exist.
  const tavily = Array.from({ length: 40 }, (_, i) => ({
    title: `tav-${i}`, url: `https://t.example/${i}`, content: 'tavily excerpt', score: 0.95, provider: 'tavily' as const, fromQuery: 'q',
  }));
  const hn = Array.from({ length: 11 }, (_, i) => ({
    title: `hn-${i}`, url: `https://h.example/${i}`, content: 'hn excerpt', score: 0.1, provider: 'hackernews' as const, fromQuery: 'q',
  }));
  const uspto = Array.from({ length: 5 }, (_, i) => ({
    title: `uspto-${i}`, url: `https://u.example/${i}`, content: 'patent excerpt', score: 0.2, provider: 'uspto' as const, fromQuery: 'q',
  }));
  const arxiv = Array.from({ length: 15 }, (_, i) => ({
    title: `arxiv-${i}`, url: `https://a.example/${i}`, content: 'paper excerpt', score: 0.5, provider: 'arxiv' as const, fromQuery: 'q',
  }));
  const ranked = dedupeAndRank({ results: [...tavily, ...hn, ...uspto, ...arxiv], topN: 20 });
  const counts: Record<string, number> = { tavily: 0, arxiv: 0, hackernews: 0, uspto: 0 };
  for (const r of ranked) { counts[r.provider] = (counts[r.provider] ?? 0) + 1; }
  // Quotas: 8/5/4/3 → 20 total. With enough raw of each, exactly hit each quota.
  assert.equal(counts.tavily, 8, 'tavily should hit its 8-slot quota');
  assert.equal(counts.arxiv, 5, 'arxiv should hit its 5-slot quota');
  assert.equal(counts.uspto, 4, 'uspto should hit its 4-slot quota');
  assert.equal(counts.hackernews, 3, 'hackernews should hit its 3-slot quota');
});

test('dedupeAndRank: unused quota spills over to other providers', () => {
  // hackernews has 1 result, uspto has 0 → 3+4 = 7 slots are unused.
  // Tavily + arxiv should pick up the slack until topN is met.
  const tavily = Array.from({ length: 30 }, (_, i) => ({
    title: `tav-${i}`, url: `https://t.example/${i}`, content: 'x', score: 0.95, provider: 'tavily' as const, fromQuery: 'q',
  }));
  const arxiv = Array.from({ length: 10 }, (_, i) => ({
    title: `arxiv-${i}`, url: `https://a.example/${i}`, content: 'x', score: 0.5, provider: 'arxiv' as const, fromQuery: 'q',
  }));
  const hn = [{ title: 'hn-1', url: 'https://h.example/1', content: 'x', score: 0.1, provider: 'hackernews' as const, fromQuery: 'q' }];
  const ranked = dedupeAndRank({ results: [...tavily, ...arxiv, ...hn], topN: 20 });
  assert.equal(ranked.length, 20, 'total should still be topN');
  const counts: Record<string, number> = {};
  for (const r of ranked) { counts[r.provider] = (counts[r.provider] ?? 0) + 1; }
  assert.equal(counts.hackernews, 1, 'should take all 1 HN result');
  assert.equal(counts.uspto ?? 0, 0, 'no USPTO to take');
  // Phase 1 (quota): tavily 8 + arxiv 5 + hn 1 + uspto 0 = 14. Phase 2
  // (spillover): topN=20 − 14 = 6 more slots, taken from the highest-
  // scoring remaining entries (tavily @ 0.95 > arxiv @ 0.5). So
  // tavily 8 + 6 = 14, arxiv stays at 5, hn 1, total 20.
  assert.equal(counts.tavily, 14, 'tavily picks up unused HN/USPTO quota via spillover');
  assert.equal(counts.arxiv, 5);
});

test('dedupeAndRank: salience score never exceeds 1', () => {
  const ranked = dedupeAndRank({
    results: Array.from({ length: 10 }, (_, i) => ({
      title: 't', url: 'https://x.com/same', content: '', score: 0.95, provider: 'tavily' as const, fromQuery: `q${i}`,
    })),
  });
  // All 10 results dedupe to one entry; even with the recall boost, score is clamped to 1.
  assert.equal(ranked.length, 1);
  assert.ok(ranked[0].salience_score <= 1, `score ${ranked[0].salience_score} should be ≤ 1`);
});
