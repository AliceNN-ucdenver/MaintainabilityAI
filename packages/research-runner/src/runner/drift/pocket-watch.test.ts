import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { renderOkrIntent, extractSection, renderPhaseScope, normalizeH2, PHASE_SCOPE_SECTIONS } from './objective-renderer';
import { extractAnchors, anchorCoverage } from './anchors';
import { cosine, scoreContrastive, type ScoreInput } from './pocket-watch';
import { runPocketWatch } from './pocket-watch-skill';

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

test('WHAT scope = endpoint + design rationale (omits Project Structure / impl detail)', () => {
  // each section is an alias-list; WHAT needs no aliases (numbered headers
  // resolve via normalizeH2), so each is a single-element list.
  assert.deepEqual(PHASE_SCOPE_SECTIONS.what, [['API Endpoint Specifications'], ['Design Rationale & Research Traceability']]);
});

test('HOW scope aliases BOTH the short real-artifact headings AND the long pack/validator names', () => {
  // committed PRDs use the short forms; synthesis.md + prd-validator mandate the
  // long forms. The rail must resolve either shape.
  assert.deepEqual(PHASE_SCOPE_SECTIONS.how, [
    ['Problem Statement', 'Problem Statement and Scope'],
    ['Goals/Non-Goals', 'Goals and Non-Goals'],
    ['Functional Requirements', 'Functional Requirements with Traceability'],
    ['Security Requirements', 'Security Requirements with Threat Tracing'],
  ]);
});

test('renderPhaseScope HOW: short real-artifact headings resolve 4/4 (missing=[])', () => {
  const md = [
    '## Problem Statement', 'movie-api needs personalized recommendations',
    '## Goals/Non-Goals', 'goal: ship recommendations; non-goal: new PII',
    '## Functional Requirements', 'FR-01 GET /api/movies/recommendations',
    '## Security Requirements', 'SR-01 rate limit the endpoint',
    '## References', 'x',
  ].join('\n');
  const scope = renderPhaseScope('how', md);
  assert.equal(scope.source, 'artifact-sections');
  assert.deepEqual(scope.missingSections, []);
  assert.match(scope.scope, /personalized recommendations/);
  assert.match(scope.scope, /rate limit the endpoint/);
});

test('renderPhaseScope HOW: long canonical pack/validator headings ALSO resolve (missing=[])', () => {
  const md = [
    '## Problem Statement and Scope', 'movie-api needs personalized recommendations',
    '## Goals and Non-Goals', 'goal: ship recommendations; non-goal: new PII',
    '## Functional Requirements with Traceability', 'FR-01 GET /api/movies/recommendations (Traces to: R1)',
    '## Security Requirements with Threat Tracing', 'SR-01 rate limit (THR-1)',
    '## References', 'x',
  ].join('\n');
  const scope = renderPhaseScope('how', md);
  assert.equal(scope.source, 'artifact-sections');
  assert.deepEqual(scope.missingSections, []);
  assert.match(scope.scope, /personalized recommendations/);
  assert.match(scope.scope, /rate limit/);
});

test('renderPhaseScope HOW: a missing section is recorded under its CANONICAL (short) name', () => {
  // long Problem Statement present, Security Requirements absent → missing names
  // the first alias (short canonical), not the long variant.
  const md = '## Problem Statement and Scope\np\n## Goals/Non-Goals\ng\n## Functional Requirements\nf\n';
  const scope = renderPhaseScope('how', md);
  assert.deepEqual(scope.missingSections, ['Security Requirements']);
});

test('normalizeH2: strips numeric prefix + normalizes slash spacing', () => {
  assert.equal(normalizeH2('## 10. Design Rationale & Research Traceability'.replace(/^##\s+/, '')), 'design rationale & research traceability');
  assert.equal(normalizeH2('Design Rationale & Research Traceability'), 'design rationale & research traceability');
  assert.equal(normalizeH2('Goals / Non-Goals'), normalizeH2('Goals/Non-Goals'));
});

test('extractSection matches NUMBERED WHAT headers (## 10. …) — not exact-only', () => {
  const md = '## 1. Project Structure\nfiles\n## 10. Design Rationale & Research Traceability\nthis design serves the OKR by reusing ratings\n## References\nx\n';
  // exact-match would miss the "10." prefix; normalized match resolves it
  assert.match(extractSection(md, 'Design Rationale & Research Traceability'), /serves the OKR by reusing ratings/);
  assert.equal(extractSection(md, 'Project Structure'), 'files');
});

test('extractSection matches HOW Goals/Non-Goals despite slash-spacing drift', () => {
  const md = '## Goals/Non-Goals\ndeliver recommendations\n## Functional Requirements\nfr\n';
  assert.match(extractSection(md, 'Goals / Non-Goals'), /deliver recommendations/);  // scope name has spaces, header doesn't
});

test('renderPhaseScope WHAT: non-empty against a real numbered code-design fixture', () => {
  const md = [
    '## 1. Project Structure', '- src/services/recommendations.js',
    '## 2. API Endpoint Specifications', 'GET /api/movies/recommendations?userId= returns personalized titles',
    '## 5. Security Control Implementations', 'rate limiting',
    '## 10. Design Rationale & Research Traceability', 'Reusing catalog + ratings (C2) avoids new PII; collaborative filtering per the research.',
    '## References', 'x',
  ].join('\n');
  const scope = renderPhaseScope('what', md);
  assert.equal(scope.source, 'artifact-sections');
  assert.notEqual(scope.scope.trim(), '');
  assert.match(scope.scope, /GET \/api\/movies\/recommendations/);   // §2 endpoint anchored
  assert.match(scope.scope, /avoids new PII/);                        // §10 rationale included
  assert.doesNotMatch(scope.scope, /src\/services\/recommendations\.js/);  // §1 inventory excluded
});

test('renderPhaseScope WHAT: empty scope when no sections match (renamed/missing)', () => {
  const scope = renderPhaseScope('what', '## Something Else\nbody\n## Other\nx\n');
  assert.equal(scope.source, 'none');
  assert.equal(scope.scope, '');
});

test('runPocketWatch SKIPS (throws) on an empty scope — never scores "" as drift', async () => {
  await assert.rejects(
    runPocketWatch({
      phase: 'what', okrId: 'O', runId: 'R',
      ownCard: MOVIE_OKR, artifactMarkdown: '## Wrong Headers\nbody\n',  // no WHAT sections
      decoys: [],
    }, async () => { throw new Error('embed should NOT be called on empty scope'); }),
    /empty-scope: no what sections matched/,
  );
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

test('cosine: rejects mismatched non-zero dimensions (no silent truncation)', () => {
  assert.throws(() => cosine([1, 2, 3], [1, 2]), /dimension mismatch/);
});

// ── runPocketWatch orchestration (report assembly, injected embed) ──────
test('runPocketWatch assembles a pinned, replay-able report', async () => {
  // FULL WHY scope (all 3 sections) so this stays a clean pass-path assembly
  // test — partial scope is covered separately below.
  const artifactMd = '## Executive Summary\nmovie-api personalized recommendations reusing ratings, no new pii\n## Formal Conclusions\ncollaborative filtering is feasible on existing data\n## Recommendations\nimplement GET /api/movies/recommendations\n';
  // embed() receives [scope, ownIntent, decoyIntent]; return vectors that put
  // the artifact near its own OKR and far from the celeb decoy.
  const embed = async (texts: string[]) => {
    assert.equal(texts.length, 3);  // scope + own + 1 decoy
    return [[1, 0, 0], [0.96, 0.2, 0], [0, 0, 1]];
  };
  const report = await runPocketWatch({
    phase: 'why', okrId: 'OKR-2026Q2-IMDB-002-movie-api', runId: 'WHY-X',
    ownCard: MOVIE_OKR, artifactMarkdown: artifactMd,
    decoys: [{ okr_id: 'OKR-2026Q2-IMDB-001-celeb-api', card: { objective: { description: 'Add celebrity profile API' }, objectiveAlignment: { targetCodeRepos: ['x/celeb-api'] } } }],
    prNumber: 7, mergeCommitSha: 'm'.repeat(40), config: { marginBand: 0.05 },
  }, embed);

  assert.equal(report.schema_version, 'pocket-watch-report.v2');
  assert.equal(report.rail, 'pocket-watch');
  assert.equal(report.policy, 'contrastive-advisory');
  assert.equal(report.status, 'pass');
  assert.equal(report.rank, 1);
  assert.equal(report.nearest_decoy_okr_id, 'OKR-2026Q2-IMDB-001-celeb-api');
  // pinned basket + input hashes (the replay contract)
  assert.equal(report.decoy_basket.length, 1);
  assert.match(report.decoy_basket[0].intent_sha256, /^[0-9a-f]{64}$/);
  assert.match(report.inputs.own_intent_sha256, /^[0-9a-f]{64}$/);
  assert.match(report.inputs.artifact_scope_sha256, /^[0-9a-f]{64}$/);
  // full scope → nothing missing, clean pass
  assert.deepEqual(report.missing_sections, []);
  assert.equal(report.scope_source, 'artifact-sections');
});

test('runPocketWatch HONESTY CAP: a partial scope can never report pass (→ needs_review)', async () => {
  // WHY artifact missing Formal Conclusions. The vectors would otherwise yield a
  // clean #1 pass, but the incomplete scope must downgrade it and name the gap.
  const artifactMd = '## Executive Summary\nmovie-api personalized recommendations, no new pii\n## Recommendations\nimplement GET /api/movies/recommendations\n';
  const embed = async (texts: string[]) => {
    assert.equal(texts.length, 3);
    return [[1, 0, 0], [0.96, 0.2, 0], [0, 0, 1]];  // own #1, healthy margin
  };
  const report = await runPocketWatch({
    phase: 'why', okrId: 'OKR-2026Q2-IMDB-002-movie-api', runId: 'WHY-PARTIAL',
    ownCard: MOVIE_OKR, artifactMarkdown: artifactMd,
    decoys: [{ okr_id: 'OKR-2026Q2-IMDB-001-celeb-api', card: { objective: { description: 'Add celebrity profile API' } } }],
    config: { marginBand: 0.05 },
  }, embed);

  assert.equal(report.rank, 1, 'still ranks #1 — the score is informative');
  assert.ok(report.margin >= 0.05, 'margin would have been a clean pass');
  assert.equal(report.status, 'needs_review', 'but partial scope caps the verdict');
  assert.match(report.reason, /incomplete-scope \(missing Formal Conclusions\)/);
  assert.deepEqual(report.missing_sections, ['Formal Conclusions']);
});

test('runPocketWatch throws on embedding count mismatch (infra-skip path)', async () => {
  await assert.rejects(
    runPocketWatch({
      phase: 'why', okrId: 'O', runId: 'R', ownCard: MOVIE_OKR, artifactMarkdown: '## Executive Summary\nx\n',
      decoys: [],
    }, async () => [[1, 0]]),  // returns 1 vector for 2 expected (scope + own)
    /embedding count mismatch/,
  );
});
