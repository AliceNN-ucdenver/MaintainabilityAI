/**
 * Regression harness for review-gate.mjs (governance-review-alignment v2).
 *
 * Exercises the pure verification (`evaluateArtifacts` + helpers) with
 * fixtures derived from the live govern-mesh review #218 (drift 60), plus
 * deliberately broken variants for each named failure reason. A regression
 * that lets a malformed review PR merge fails this test, not a real review.
 *
 * Run with: node --test vscode-extension/code-templates/workflows/scripts/review-gate.test.mjs
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  evaluateArtifacts, computeDrift, parseRecords, countSeverities,
  sectionBody, parseOraculumBlock, REQUIRED_H2, PILLAR_SECTION,
} from './review-gate.mjs';

const BAR = 'platforms/imdb-lite/bars/imdb-lite-application';
const REPORT = `${BAR}/reports/review-218.md`;
const REVIEWS = `${BAR}/reviews.yaml`;

// A clean #218-shaped report: counts match the record exactly.
const GOOD_REPORT = `## Summary

Drift score: **60**

## Architecture Findings

- **[high]** drift A. Evidence: \`movie-api/src/app.js:1\`.
- **[medium]** drift B. Evidence: \`movie-api/src/app.js:2\`.
- **[medium]** drift C. Evidence: \`movie-api/src/app.js:3\`.

## Security Findings

- **[critical]** sec A. Evidence: \`imdb-identity/src/app.ts:1\`.
- **[high]** sec B. Evidence: \`imdb-identity/src/app.ts:2\`.

## Information Risk Findings

- **[high]** risk A. Evidence: \`movie-api/src/routes/auth.js:1\`.
- **[medium]** risk B. Evidence: \`movie-api/src/routes/auth.js:2\`.

## Operations Findings

- **[medium]** ops A. Evidence: \`ops/service-mapping.yaml:1\`.
- **[medium]** ops B. Evidence: \`ops/runbook.md:1\`.

## Recommendations

1. Fix everything.

## References

- \`${BAR}/app.yaml\`
`;

const BASE_REVIEWS = `# Oraculum Review History
reviews:
  - issue_url: "https://github.com/x/y/issues/216"
    issue_number: 216
    date: "2026-06-10"
    agent: copilot
    drift_score: 66
    pillars:
      architecture:
        findings: 0
        critical: 0
        high: 0
        medium: 0
        low: 0
`;

// Head = base + ONE new record for #218 (counts match GOOD_REPORT).
const GOOD_HEAD = BASE_REVIEWS + `  - issue_url: "https://github.com/x/y/issues/218"
    issue_number: 218
    date: "2026-06-10"
    agent: copilot
    drift_score: 60
    pillars:
      architecture:
        findings: 3
        critical: 0
        high: 1
        medium: 2
        low: 0
      security:
        findings: 2
        critical: 1
        high: 1
        medium: 0
        low: 0
      risk:
        findings: 2
        critical: 0
        high: 1
        medium: 1
        low: 0
      operations:
        findings: 2
        critical: 0
        high: 0
        medium: 2
        low: 0
`;

const ISSUE = {
  issueScope: ['architecture', 'security', 'risk', 'operations'],
  issueBarPath: BAR,
  issueHasLabel: true,
  issueReadable: true,
  closesIssues: [218],
};

function clean(extra = {}) {
  return {
    changed: [REPORT, REVIEWS],
    reportText: GOOD_REPORT,
    headYaml: GOOD_HEAD,
    baseYaml: BASE_REVIEWS,
    ...ISSUE,
    ...extra,
  };
}

// ── Pure helpers ─────────────────────────────────────────────────────
test('computeDrift: #218 counts → 60', () => {
  const r = parseRecords(GOOD_HEAD).at(-1);
  assert.equal(computeDrift(r.pillars), 60);
});

test('countSeverities: Security section → 1 critical, 1 high', () => {
  const c = countSeverities(sectionBody(GOOD_REPORT, 'Security Findings'));
  assert.deepEqual(c, { critical: 1, high: 1, medium: 0, low: 0 });
});

test('parseOraculumBlock: extracts bar_path + scope', () => {
  const body = '```oraculum\nbar_path: ' + BAR + '\nscope:\n  - architecture\n  - risk\n```';
  assert.deepEqual(parseOraculumBlock(body), { barPath: BAR, scope: ['architecture', 'risk'] });
});

test('contract: PILLAR_SECTION values are all in REQUIRED_H2', () => {
  for (const section of Object.values(PILLAR_SECTION)) {
    assert.ok(REQUIRED_H2.includes(section), `${section} missing from REQUIRED_H2`);
  }
});

// ── Happy path ───────────────────────────────────────────────────────
test('clean review PR → no reasons, isReviewPr', () => {
  const r = evaluateArtifacts(clean());
  assert.deepEqual(r.reasons, []);
  assert.equal(r.isReviewPr, true);
  assert.equal(r.issueNum, 218);
  assert.equal(r.barPath, BAR);
});

test('non-review PR → skipped (isReviewPr false)', () => {
  const r = evaluateArtifacts(clean({ changed: ['src/index.ts'] }));
  assert.equal(r.isReviewPr, false);
  assert.deepEqual(r.reasons, []);
});

// ── Each gate's failure mode ─────────────────────────────────────────
test('scope: stray file → scope-violation', () => {
  const r = evaluateArtifacts(clean({ changed: [REPORT, REVIEWS, `${BAR}/app.yaml`] }));
  assert.ok(r.reasons.some((x) => x.startsWith('scope-violation:' + BAR + '/app.yaml')));
});

test('structure: missing in-scope section → structure-invalid', () => {
  const noSec = GOOD_REPORT.replace(/## Security Findings[\s\S]*?(?=## Information Risk)/, '');
  const r = evaluateArtifacts(clean({ reportText: noSec }));
  assert.ok(r.reasons.some((x) => x.includes('structure-invalid:missing section "Security Findings"')));
});

test('record: two new records → record-mismatch', () => {
  const twoNew = GOOD_HEAD + `  - issue_url: "https://github.com/x/y/issues/219"
    issue_number: 219
    date: "2026-06-11"
    agent: copilot
    drift_score: 100
    pillars:
      architecture:
        findings: 0
        critical: 0
        high: 0
        medium: 0
        low: 0
`;
  const r = evaluateArtifacts(clean({ headYaml: twoNew }));
  assert.ok(r.reasons.some((x) => x.startsWith('record-mismatch:expected exactly 1 new record')));
});

test('record: findings != severity sum → record-mismatch', () => {
  const bad = GOOD_HEAD.replace('findings: 3', 'findings: 9');
  const r = evaluateArtifacts(clean({ headYaml: bad }));
  assert.ok(r.reasons.some((x) => x.includes('findings 9 != severity sum')));
});

test('math: drift_score wrong → math-mismatch', () => {
  const bad = GOOD_HEAD.replace('drift_score: 60', 'drift_score: 95');
  const r = evaluateArtifacts(clean({ headYaml: bad }));
  assert.ok(r.reasons.some((x) => x.startsWith('math-mismatch:drift_score 95')));
});

test('math: report bullets disagree with record → math-mismatch', () => {
  // Remove one medium architecture bullet from the report (record still says 2).
  const fewer = GOOD_REPORT.replace('- **[medium]** drift C. Evidence: `movie-api/src/app.js:3`.\n', '');
  const r = evaluateArtifacts(clean({ reportText: fewer }));
  assert.ok(r.reasons.some((x) => x.startsWith('math-mismatch:architecture.medium')));
});

test('issue: PR does not close the dispatch issue → issue-unresolved', () => {
  const r = evaluateArtifacts(clean({ closesIssues: [999] }));
  assert.ok(r.reasons.some((x) => x.startsWith('issue-unresolved:PR does not close #218')));
});

test('scope: pillar section out of scope → structure-invalid', () => {
  // Issue scope omits operations, but the report still has the Operations section.
  const r = evaluateArtifacts(clean({
    issueScope: ['architecture', 'security', 'risk'],
  }));
  assert.ok(r.reasons.some((x) => x.includes('"Operations Findings" present but operations not in scope')));
});

// Regression: live run #222 wrote findings as `**[sev] Title**` heading lines,
// not `- **[sev]** text` bullets. The old recount returned 0 for every pillar
// → a false math-mismatch on a correct report. countSeverities must count both.
test('countSeverities: `**[sev] Title**` heading lines count as findings', () => {
  const headingBody = `
**[critical] Hardcoded DB credentials in imdb-identity**
- Location: \`imdb-identity/src/app.ts:17\`
**[high] SHA-1 password hashing**
- Location: \`imdb-identity/src/auth.ts:12\`
**[high] Unauthenticated admin endpoint**
`;
  assert.deepEqual(countSeverities(headingBody), { critical: 1, high: 2, medium: 0, low: 0 });
});

test('heading-format report (live #222 shape) passes the math gate', () => {
  // Architecture: 3 findings (1 high, 1 medium, 1 low) — drift record matches.
  const report = `## Summary

| Pillar | Findings | Critical | High | Medium | Low |
|--------|----------|----------|------|--------|-----|

## Architecture Findings

**[high] imdb-identity undocumented in CALM**
- Location: \`imdb-identity/src/app.ts:1\`

**[medium] Role-name mismatch ADR-003 vs movie-api**
- Location: \`movie-api/src/models/User.js\`

**[low] Frontend-to-API protocol inconsistency**
- Location: \`imdb-react-frontend/.env.development:1\`

## Security Findings

**[critical] Hardcoded DB credentials**
- Location: \`imdb-identity/src/app.ts:17\`

**[high] SHA-1 password hashing + SQL injection**
- Location: \`imdb-identity/src/auth.ts:12\`

## Information Risk Findings

**[high] Data classification empty while PII processed**
- Location: \`information-risk/data-classification.yaml:3\`

## Operations Findings

**[high] Runbook is an empty placeholder**
- Location: \`operations/runbook.md:1\`

## Recommendations
## References
`;
  // drift: 100 − (15·1crit + 5·4high + 2·1med + 1·1low) = 100 − 38 = 62.
  const head = BASE_REVIEWS + `  - issue_url: "https://github.com/x/y/issues/222"
    issue_number: 222
    date: "2026-06-11"
    agent: copilot
    drift_score: 62
    pillars:
      architecture:
        findings: 3
        critical: 0
        high: 1
        medium: 1
        low: 1
      security:
        findings: 2
        critical: 1
        high: 1
        medium: 0
        low: 0
      risk:
        findings: 1
        critical: 0
        high: 1
        medium: 0
        low: 0
      operations:
        findings: 1
        critical: 0
        high: 1
        medium: 0
        low: 0
`;
  const r = evaluateArtifacts({
    changed: [REPORT.replace('218', '222'), REVIEWS],
    reportText: report,
    headYaml: head,
    baseYaml: BASE_REVIEWS,
    issueScope: ['architecture', 'security', 'risk', 'operations'],
    issueBarPath: BAR,
    issueHasLabel: true,
    issueReadable: true,
    closesIssues: [222],
  });
  // The #222 bug fired a math-mismatch on EVERY pillar (report recount = 0).
  // With the heading-aware recount + matching record, the gate is fully clean.
  assert.deepEqual(r.reasons, [], `unexpected gate reasons: ${r.reasons.join(', ')}`);
});
