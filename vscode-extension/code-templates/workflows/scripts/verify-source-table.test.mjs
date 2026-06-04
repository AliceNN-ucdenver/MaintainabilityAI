/**
 * Regression harness for verify-source-table.mjs (Bug Z/2).
 *
 * Fixtures match the actual evidence-laundering patterns from
 * WHY-2026-05-24-wzi0yl, so a future regression that lets these
 * mismatches through fails the test, not a customer's WHY phase.
 *
 * Run with: node --test vscode-extension/code-templates/workflows/scripts/verify-source-table.test.mjs
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import {
  normalizeUrl,
  normalizeTitle,
  titleMatches,
  parseSourceCitations,
  collectPreviewIndex,
  verifySourceTable,
} from './verify-source-table.mjs';

// ─────────────────────────────────────────────────────────────────────
// URL normalization
// ─────────────────────────────────────────────────────────────────────

test('normalizeUrl: trailing slash stripped', () => {
  assert.equal(normalizeUrl('https://example.com/foo/'), 'https://example.com/foo');
});

test('normalizeUrl: fragment stripped', () => {
  assert.equal(normalizeUrl('https://example.com/foo#bar'), 'https://example.com/foo');
});

test('normalizeUrl: host lowercased', () => {
  assert.equal(normalizeUrl('https://Example.COM/foo'), 'https://example.com/foo');
});

test('normalizeUrl: utm tracking stripped', () => {
  assert.equal(
    normalizeUrl('https://example.com/foo?id=1&utm_source=twitter&utm_medium=social'),
    'https://example.com/foo?id=1',
  );
});

test('normalizeUrl: unparseable URL returns trimmed raw', () => {
  assert.equal(normalizeUrl('not a url'), 'not a url');
});

// ─────────────────────────────────────────────────────────────────────
// Title matching
// ─────────────────────────────────────────────────────────────────────

test('titleMatches: exact after normalization', () => {
  assert.equal(titleMatches('The Conversation', '  THE   conversation  '), true);
});

test('titleMatches: substring acceptable when at least 12 chars', () => {
  assert.equal(
    titleMatches(
      'Bayesian record linkage in production systems',
      'Bayesian record linkage in production systems (2025 update)',
    ),
    true,
  );
});

test('titleMatches: unicode dash and double-hyphen variants match', () => {
  assert.equal(titleMatches('DeepER — Deep Entity Resolution', 'DeepER -- Deep Entity Resolution'), true);
});

test('titleMatches: smart apostrophes and HTML entities normalize', () => {
  assert.equal(
    titleMatches(
      "District Court's Ruling Could Signal New Wave of CCPA Litigation | CyberAdviser",
      'District Court’s Ruling Could Signal New Wave of CCPA Litigation | CyberAdviser',
    ),
    true,
  );
  assert.equal(titleMatches('AT&T & privacy', 'AT&amp;T & privacy'), true);
});

test('titleMatches: provider-truncated ellipsis prefix matches full title', () => {
  assert.equal(
    titleMatches(
      'Top 5 API Trends for 2026: Learnings from the Anatomy of API Calls',
      'Top 5 API Trends for 2026: Learnings from the Anatomy ... - YouTube',
    ),
    true,
  );
});

test('titleMatches: provider-truncated lawsuit title matches full title', () => {
  assert.equal(
    titleMatches(
      'ADT Data Breach Lawsuit Could Become One of the Largest Consumer Privacy Cases of 2026',
      'ADT Data Breach Lawsuit Could Become One of the Largest ...',
    ),
    true,
  );
});

test('titleMatches: short generic titles do NOT fuzzy-match', () => {
  // "Home" and "Home Page" should NOT match — both short, ambiguous.
  assert.equal(titleMatches('Home', 'Home Page'), false);
});

test('titleMatches: completely different titles → false', () => {
  assert.equal(
    titleMatches('The Conversation', 'Higgs Law Firm — Right of Publicity'),
    false,
  );
});

// ─────────────────────────────────────────────────────────────────────
// Citation parsing
// ─────────────────────────────────────────────────────────────────────

test('parseSourceCitations: bullet form', () => {
  const md = `## Findings\n\n- **S40**: [The Conversation](https://theconversation.com/article-id-12345) establishes baseline.\n- **S44**: [Pearl Cohen](https://pearlcohen.com/foo) notes pattern.\n`;
  const out = parseSourceCitations(md);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { num: 40, title: 'The Conversation', url: 'https://theconversation.com/article-id-12345', line: 3 });
  assert.deepEqual(out[1], { num: 44, title: 'Pearl Cohen', url: 'https://pearlcohen.com/foo', line: 4 });
});

test('parseSourceCitations: references-section form with em-dash separator', () => {
  const md = `## References\n- **S40** — [Original Title](https://original.com/x)\n- **S41** — [Second](https://second.com/y)\n`;
  const out = parseSourceCitations(md);
  assert.equal(out.length, 2);
  assert.equal(out[0].num, 40);
  assert.equal(out[0].url, 'https://original.com/x');
});

test('parseSourceCitations: numbered references form', () => {
  const md = `S1. [First](https://first.com/a)\nS2. [Second](https://second.com/b)\n`;
  const out = parseSourceCitations(md);
  assert.equal(out.length, 2);
  assert.equal(out[1].num, 2);
});

test('parseSourceCitations: plain references form', () => {
  const md = `## References\n- S24: Data Privacy Laws by Country and U.S. State (2026) — https://cdp.com/basics/international-u-s-data-privacy-laws-and-regulations-you-need-to-know — retrieved 2026-05-28\n`;
  const out = parseSourceCitations(md);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    num: 24,
    title: 'Data Privacy Laws by Country and U.S. State (2026)',
    url: 'https://cdp.com/basics/international-u-s-data-privacy-laws-and-regulations-you-need-to-know',
    line: 2,
  });
});

test('parseSourceCitations: inline back-references ignored (not source declarations)', () => {
  // Inline [S47](#) style references in narrative prose are pointers
  // back to the declaration, not new claims with their own (title, url).
  // Parsing them would false-positive on title mismatches because the
  // surrounding text is not a title. Only declaration forms count.
  const md = `As [S47](#) and [S48](#) both confirm, the trend continues.\nIn the References below, **S47** is declared.`;
  const out = parseSourceCitations(md);
  assert.equal(out.length, 0);
});

// ─────────────────────────────────────────────────────────────────────
// Preview index
// ─────────────────────────────────────────────────────────────────────

test('collectPreviewIndex: indexes by normalized URL across providers', () => {
  const events = [
    {
      event_kind: 'skill_call',
      payload: {
        skill: 'tavily-search',
        results_preview: [
          { title: 'The Original Title', url: 'https://example.com/a/' },
        ],
      },
    },
    {
      event_kind: 'skill_call',
      payload: {
        skill: 'arxiv-search',
        results_preview: [
          { title: 'Another Result', url: 'https://arxiv.org/abs/2401.12345' },
        ],
      },
    },
    {
      event_kind: 'skill_call',
      payload: { skill: 'knowledge-okr' }, // not a search skill — ignored
    },
  ];
  const idx = collectPreviewIndex(events);
  assert.equal(idx.size, 2);
  // Trailing slash normalized away.
  assert.ok(idx.has('https://example.com/a'));
  assert.equal(idx.get('https://example.com/a')[0].provider, 'tavily-search');
});

// ─────────────────────────────────────────────────────────────────────
// End-to-end verification — live-bug patterns
// ─────────────────────────────────────────────────────────────────────

test('verifySourceTable: clean run → ok', () => {
  const md = `- **S1**: [Real Title](https://real.com/x) explains why.`;
  const events = [
    {
      event_kind: 'skill_call',
      payload: {
        skill: 'tavily-search',
        results_preview: [{ title: 'Real Title', url: 'https://real.com/x' }],
      },
    },
  ];
  const result = verifySourceTable(md, events);
  assert.equal(result.ok, true);
  assert.equal(result.mismatches.length, 0);
  assert.equal(result.unmatched.length, 0);
});

test('verifySourceTable: S40 title-swap pattern (URL in chain, title wrong) → mismatch', () => {
  // Live bug: doc says "The Conversation" but the URL is a Higgs Law
  // Firm article. The chain has the Higgs Law URL with the correct
  // Higgs Law title.
  const md = `- **S40**: [The Conversation](https://higgslaw.com/right-of-publicity-2026) sets the legal stage.`;
  const events = [
    {
      event_kind: 'skill_call',
      payload: {
        skill: 'tavily-search',
        results_preview: [
          { title: 'Higgs Law Firm: Right of Publicity in 2026', url: 'https://higgslaw.com/right-of-publicity-2026' },
        ],
      },
    },
  ];
  const result = verifySourceTable(md, events);
  assert.equal(result.ok, false);
  assert.equal(result.mismatches.length, 1);
  assert.equal(result.mismatches[0].s, 40);
  assert.equal(result.mismatches[0].cited_title, 'The Conversation');
  assert.ok(result.mismatches[0].chain_titles[0].toLowerCase().includes('higgs'));
});

test('verifySourceTable: S47/S48 fabrication pattern (cited URL not in chain) → unmatched', () => {
  // Live bug: doc claims S47 and S48 cite HN item 30640295, but the
  // chain's preview for that URL says "Launch HN: Stock Unlock" — and
  // the actual URL the doc cited turned out to be on a different host
  // that was never in the audited chain at all.
  const md = `- **S47**: [ORCID public records](https://orcid.org/public-records) underpins the proposal.\n- **S48**: [Gowalla legacy](https://gowalla.com/about) shows the precedent.`;
  const events = [
    {
      event_kind: 'skill_call',
      payload: {
        skill: 'hackernews-search',
        results_preview: [
          { title: 'Launch HN: Stock Unlock', url: 'https://news.ycombinator.com/item?id=30640295' },
        ],
      },
    },
  ];
  const result = verifySourceTable(md, events);
  assert.equal(result.ok, false);
  assert.equal(result.unmatched.length, 2);
  assert.equal(result.unmatched[0].s, 47);
  assert.equal(result.unmatched[1].s, 48);
});

test('verifySourceTable: mixed clean + dirty → ok=false with per-S diagnostics', () => {
  const md = [
    '- **S1**: [Clean Source](https://clean.com/a) is real.',
    '- **S2**: [Wrong Title](https://example.com/b) is in the chain but mislabelled.',
    '- **S3**: [Made Up Source](https://nowhere.com/c) does not exist in the chain.',
  ].join('\n');
  const events = [
    {
      event_kind: 'skill_call',
      payload: {
        skill: 'tavily-search',
        results_preview: [
          { title: 'Clean Source', url: 'https://clean.com/a' },
          { title: 'Right Title for example.com B', url: 'https://example.com/b' },
        ],
      },
    },
  ];
  const result = verifySourceTable(md, events);
  assert.equal(result.ok, false);
  assert.equal(result.mismatches.length, 1);
  assert.equal(result.mismatches[0].s, 2);
  assert.equal(result.unmatched.length, 1);
  assert.equal(result.unmatched[0].s, 3);
});

test('verifySourceTable: dedupes (num,url) repeats so one source listed twice does not double-count', () => {
  const md = [
    '- **S1**: [Source](https://src.com/x) explains.',
    'Later cited inline as [S1](https://src.com/x) further evidence.',
  ].join('\n');
  const events = [
    {
      event_kind: 'skill_call',
      payload: {
        skill: 'tavily-search',
        results_preview: [{ title: 'Source', url: 'https://src.com/x' }],
      },
    },
  ];
  const result = verifySourceTable(md, events);
  assert.equal(result.ok, true);
  assert.equal(result.totalUnique, 1);
});

test('verifySourceTable: conflicting same-S URLs fail with source declaration conflict', () => {
  const md = [
    '- **S24**: [Data Privacy Laws by Country and U.S. State (2026)](https://cdp.com/basics/international-u-s-data-privacy-laws-and-regulations-you-need-to-reach-know) establishes privacy baseline.',
    '- S24: Data Privacy Laws by Country and U.S. State (2026) — https://cdp.com/basics/international-u-s-data-privacy-laws-and-regulations-you-need-to-know — retrieved 2026-05-28',
  ].join('\n');
  const events = [
    {
      event_kind: 'skill_call',
      payload: {
        skill: 'tavily-search',
        results_preview: [
          {
            title: 'Data Privacy Laws by Country and U.S. State (2026)',
            url: 'https://cdp.com/basics/international-u-s-data-privacy-laws-and-regulations-you-need-to-know',
          },
        ],
      },
    },
  ];
  const result = verifySourceTable(md, events);
  assert.equal(result.ok, false);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].s, 24);
});

test('verifySourceTable: source registry is preferred over previews and hash-checked', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'source-registry-test-'));
  try {
    const registryPath = path.join('okrs', 'OKR-X', 'audit', 'sources', 'WHY-X.source-registry.json');
    const abs = path.join(dir, registryPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const registry = {
      schema_version: 'source-registry.v1',
      okr_id: 'OKR-X',
      run_id: 'WHY-X',
      phase: 'why',
      source_count: 1,
      sources: [
        {
          source_id: 'S1',
          provider: 'tavily',
          queries: ['privacy law 2026'],
          title: 'Registry Title',
          url: 'https://example.com/registry',
          canonical_url: 'https://example.com/registry',
          retrieved_at: '2026-05-28T00:00:00Z',
          salience_score: 0.9,
          excerpt: 'excerpt',
        },
      ],
    };
    const json = `${JSON.stringify(registry, null, 2)}\n`;
    fs.writeFileSync(abs, json, 'utf8');
    const sha = createHash('sha256').update(json).digest('hex');
    const md = '- **S1**: [Registry Title](https://example.com/registry) establishes privacy baseline.';
    const events = [
      {
        event_kind: 'skill_call',
        payload: {
          skill: 'dedupe-and-rank',
          source_registry_path: registryPath,
          source_registry_sha256: sha,
          source_registry_count: 1,
        },
      },
      {
        event_kind: 'skill_call',
        payload: {
          skill: 'tavily-search',
          results_preview: [{ title: 'Wrong Preview Title', url: 'https://example.com/registry' }],
        },
      },
    ];
    const result = verifySourceTable(md, events, { baseDir: dir });
    assert.equal(result.ok, true);
    assert.equal(result.sourceRegistry.path, registryPath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('normalizeTitle: &amp; is unescaped LAST — no double-unescape (CodeQL js/double-escaping)', () => {
  // a plain &amp; still becomes &
  assert.equal(normalizeTitle('Tom &amp; Jerry'), 'tom & jerry');
  // `&amp;quot;` is an ESCAPED literal `&quot;`; unescaping &amp; first would
  // collapse it to a real `"` (double-unescape). It must stay `&quot;`.
  assert.equal(normalizeTitle('say &amp;quot;hi&amp;quot;'), 'say &quot;hi&quot;');
});
