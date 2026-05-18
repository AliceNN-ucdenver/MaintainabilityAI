import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { validateSynthesis, CANONICAL_SECTIONS } from './synthesis-validator';
import { CANONICAL_SYNTHESIS_BODY } from './__test-helpers__/canonical-synthesis';

test('validateSynthesis: canonical body passes every rule', () => {
  const report = validateSynthesis(CANONICAL_SYNTHESIS_BODY);
  assert.equal(report.valid, true, `errors: ${JSON.stringify(report.errors)}`);
  assert.deepEqual(report.sectionsFound, [...CANONICAL_SECTIONS]);
  assert.equal(report.citation_stats.source_count, 3);
  assert.equal(report.citation_stats.conclusion_count, 2);
  assert.equal(report.citation_stats.recommendation_count, 2);
  assert.equal(report.citation_stats.untracedRecommendations, 0);
  assert.equal(report.citation_stats.underCitedConclusions, 0);
});

test('validateSynthesis: catches a missing H2 section', () => {
  const body = CANONICAL_SYNTHESIS_BODY.replace('## Whitespace Analysis\n\n- Multi-provider cost attribution is unaddressed (S1, S2 — both gloss it).\n\n', '');
  const report = validateSynthesis(body);
  assert.equal(report.valid, false);
  assert.ok(
    report.errors.some(e => e.includes('Whitespace Analysis')),
    `expected an error mentioning Whitespace Analysis; got ${JSON.stringify(report.errors)}`,
  );
});

test('validateSynthesis: catches out-of-order H2 sections', () => {
  // Swap "Patent Landscape" and "Evidence Gaps"
  const body = CANONICAL_SYNTHESIS_BODY.replace(
    /## Evidence Gaps[\s\S]*?(?=## Jobs-to-be-Done Analysis)/,
    '## Patent Landscape\n\nNo relevant patent prior art was returned in this run.\n\n',
  ).replace(
    /## Patent Landscape[\s\S]*?(?=## Whitespace Analysis)/,
    '## Evidence Gaps\n\n- placeholder.\n\n',
  );
  const report = validateSynthesis(body);
  assert.equal(report.valid, false);
});

test('validateSynthesis: catches an under-cited HIGH-confidence conclusion', () => {
  const body = CANONICAL_SYNTHESIS_BODY.replace(
    /\*\*C1\*\*[\s\S]*?Citations: S1, S2\./,
    '**C1** Some claim. Confidence: **HIGH**. Citations: S1.',
  );
  const report = validateSynthesis(body);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /C1.*HIGH.*cites 1.*requires ≥2/.test(e)));
});

test('validateSynthesis: LOW confidence allows a single S citation', () => {
  const body = CANONICAL_SYNTHESIS_BODY.replace(
    /\*\*C2\*\*[\s\S]*?Citations: S2, S3\./,
    '**C2** Tentative claim. Confidence: **LOW**. Citations: S3.',
  );
  const report = validateSynthesis(body);
  assert.equal(report.valid, true, `errors: ${JSON.stringify(report.errors)}`);
});

test('validateSynthesis: catches a conclusion without a confidence label', () => {
  const body = CANONICAL_SYNTHESIS_BODY.replace(
    /Confidence: \*\*HIGH\*\*\. Citations: S1, S2\./,
    'Citations: S1, S2.',
  );
  const report = validateSynthesis(body);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /missing a confidence label/.test(e)));
});

test('validateSynthesis: catches recommendations that lack C[N] traceability', () => {
  const body = CANONICAL_SYNTHESIS_BODY.replace(
    /- Build the runner.*Traces to: C1\.\n- Pre-seed STRIDE.*Traces to: C2\.\n/,
    '- Build the runner around explicit pure/LLM node separation.\n- Pre-seed STRIDE templates into the agent context.\n',
  );
  const report = validateSynthesis(body);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /Recommendation.*lack.*C\[N\]/.test(e)));
});

test('validateSynthesis: source_count counts unique S[N] ids only', () => {
  const body = CANONICAL_SYNTHESIS_BODY + '\n\n**S2** repeat reference (should not double-count)\n';
  const report = validateSynthesis(body);
  // S1, S2, S3 — duplicate S2 still 3
  assert.equal(report.citation_stats.source_count, 3);
});
