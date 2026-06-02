import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderOkrIntent, extractSection, renderPhaseScope, PHASE_SCOPE_SECTIONS } from './objective-renderer';
import { extractAnchors, anchorCoverage } from './anchors';
import { cosine, scoreContrastive, type ScoreInput } from './pocket-watch';

// The movie-api cert OKR (mirrors the on-disk card).
const MOVIE_OKR = {
  objective: {
    name: 'Add a personalized movie-recommendations endpoint to movie-api',
    description: 'Enable movie-api to return personalized title recommendations by reusing the existing catalog + ratings data, without introducing new PII collection or recommendation-bias risk.',
  },
  keyResults: [
    { id: 'KR-1', metric: 'Recommendation click-through-rate uplift vs baseline' },
    { id: 'KR-3', metric: 'New PII fields persisted by the feature' },
  ],
  objectiveAlignment: {
    affectedBarIds: ['APP-IMDB-001'],
    targetCodeRepos: ['https://github.com/AliceNN-ucdenver/movie-api'],
    intentCascade: { user: 'See movie suggestions', org: 'Grow IMDB-Lite engagement' },
  },
};

// ── objective-renderer ──────────────────────────────────────────────────
test('renderOkrIntent is canonical: sorted arrays, missing fields omitted', () => {
  const text = renderOkrIntent(MOVIE_OKR);
  assert.match(text, /^Objective: Enable movie-api/);
  assert.match(text, /Target repos: movie-api/);          // repo basename, not URL
  assert.match(text, /BAR: APP-IMDB-001/);
  // intent cascade rendered in fixed role order (org before user) regardless of object order
  assert.match(text, /Intent: Grow IMDB-Lite engagement See movie suggestions/);
  // no blank lines from missing fields
  assert.ok(!/\n\n/.test(text), 'no empty lines for omitted fields');
});

test('renderOkrIntent is deterministic + order-independent on arrays', () => {
  const a = renderOkrIntent({ objectiveAlignment: { affectedBarIds: ['B', 'A'], targetCodeRepos: ['x/two', 'x/one'] } });
  const b = renderOkrIntent({ objectiveAlignment: { affectedBarIds: ['A', 'B'], targetCodeRepos: ['x/one', 'x/two'] } });
  assert.equal(a, b);
  assert.match(a, /BAR: A, B/);
  assert.match(a, /Target repos: one, two/);
});

test('extractSection pulls one H2 body, stops at the next H2', () => {
  const md = '## Executive Summary\nfirst line\nsecond line\n## Formal Conclusions\nnope\n';
  assert.equal(extractSection(md, 'Executive Summary'), 'first line\nsecond line');
  assert.equal(extractSection(md, 'Missing'), '');
});

test('renderPhaseScope concatenates phase sections + records missing ones', () => {
  const md = '## Executive Summary\nsumm\n## Recommendations\nrecs\n';
  const scope = renderPhaseScope('why', md);
  assert.match(scope.scope, /summ/);
  assert.match(scope.scope, /recs/);
  assert.equal(scope.source, 'artifact-sections');
  assert.deepEqual(scope.missingSections, ['Formal Conclusions']);  // expected by WHY, absent here
});

test('WHAT scope omits Project Structure / per-repo summary (dilution)', () => {
  assert.deepEqual(PHASE_SCOPE_SECTIONS.what, ['Problem Restatement', 'Design Rationale & Research Traceability']);
});

// ── anchors ─────────────────────────────────────────────────────────────
test('extractAnchors: target repo + feature noun are critical; PII is important', () => {
  const a = extractAnchors(MOVIE_OKR);
  assert.ok(a.critical.includes('movie-api'), 'repo is a critical anchor');
  assert.ok(a.critical.some(c => c.includes('recommendation')), 'feature noun is critical');
  assert.ok(a.important.includes('pii'), 'PII constraint is important');
  assert.ok(!a.critical.includes('the') && !a.critical.includes('2026'), 'stop words / years excluded');
});

test('anchorCoverage flags a missing critical anchor distinctly', () => {
  const a = extractAnchors(MOVIE_OKR);
  const present = anchorCoverage(a, 'a movie-api recommendations design reusing ratings, no pii');
  assert.equal(present.missing_critical.length, 0);
  const absent = anchorCoverage(a, 'a generic personalization design with no product noun');
  assert.ok(absent.missing_critical.includes('movie-api'), 'movie-api missing → flagged critical');
});

// ── pocket-watch scorer (the 6 acceptance cases) ────────────────────────
const cov = (missingCritical: string[] = []) => ({
  critical_total: 1, critical_present: missingCritical.length ? 0 : 1,
  important_total: 0, important_present: 0, missing: missingCritical, missing_critical: missingCritical,
});
const base = (over: Partial<ScoreInput>): ScoreInput => ({
  artifactVector: [1, 0, 0],
  own: { okr_id: 'OKR-OWN', intent_sha256: 'h', vector: [0.95, 0.30, 0] },
  decoys: [{ okr_id: 'OKR-FAR', intent_sha256: 'd', vector: [0, 0, 1] }],
  anchorCoverage: cov(),
  config: { marginBand: 0.05 },
  ...over,
});

test('case 1: own ranks #1 with healthy margin → pass', () => {
  const r = scoreContrastive(base({}));
  assert.equal(r.status, 'pass');
  assert.equal(r.rank, 1);
  assert.ok(r.margin >= 0.05);
  assert.equal(r.nearest_decoy_okr_id, 'OKR-FAR');
});

test('case 2: own ranks #1 with narrow margin → needs_review', () => {
  // decoy nearly as aligned as own → small positive margin
  const r = scoreContrastive(base({
    own: { okr_id: 'OKR-OWN', intent_sha256: 'h', vector: [1, 0.10, 0] },
    decoys: [{ okr_id: 'OKR-SIB', intent_sha256: 'd', vector: [1, 0.13, 0] }],
  }));
  assert.equal(r.rank, 1);
  assert.equal(r.status, 'needs_review');
  assert.ok(r.margin >= 0 && r.margin < 0.05, `margin ${r.margin} should be in the band`);
});

test('case 3: a foreign OKR ranks #1 → fail (drift)', () => {
  const r = scoreContrastive(base({
    own: { okr_id: 'OKR-OWN', intent_sha256: 'h', vector: [1, 0.40, 0] },     // weaker match
    decoys: [{ okr_id: 'OKR-OTHER', intent_sha256: 'd', vector: [1, 0.02, 0] }], // stronger match
  }));
  assert.equal(r.rank, 2);
  assert.equal(r.status, 'fail');
  assert.match(r.reason, /another OKR matched better/);
  assert.match(r.reason, /OKR-OTHER/);
});

test('case 4a: critical anchor missing, advisory → needs_review', () => {
  const r = scoreContrastive(base({ anchorCoverage: cov(['movie-api']) }));
  assert.equal(r.status, 'needs_review');
  assert.match(r.reason, /critical anchor missing: movie-api/);
});

test('case 4b: critical anchor missing, required mode → fail', () => {
  const r = scoreContrastive(base({
    anchorCoverage: cov(['movie-api']),
    config: { marginBand: 0.05, criticalAnchorRequired: true },
  }));
  assert.equal(r.status, 'fail');
});

test('case 5: no sibling OKRs (single-OKR mesh) → needs_review, never trivial pass', () => {
  const r = scoreContrastive(base({ decoys: [] }));
  assert.equal(r.rank, 1);
  assert.equal(r.status, 'needs_review');
  assert.equal(r.nearest_decoy_okr_id, null);
  assert.match(r.reason, /no decoy basket/);
});

test('ranking is deterministic regardless of decoy order', () => {
  const decoys = [
    { okr_id: 'B', intent_sha256: 'b', vector: [0.5, 0.5, 0] },
    { okr_id: 'A', intent_sha256: 'a', vector: [0.2, 0, 0.9] },
  ];
  const r1 = scoreContrastive(base({ decoys }));
  const r2 = scoreContrastive(base({ decoys: [...decoys].reverse() }));
  assert.deepEqual(r1.ranked, r2.ranked);
});

test('cosine: identical vectors = 1, orthogonal = 0, zero-vector safe', () => {
  assert.equal(cosine([1, 2, 3], [1, 2, 3]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([0, 0], [1, 1]), 0);  // no NaN
});
