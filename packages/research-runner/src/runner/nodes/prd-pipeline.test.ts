/**
 * Phase 4 PRD pipeline tests:
 *   - prd-validator (structural + citation extraction)
 *   - expert-review response parser
 *   - verify-grounding combiner
 *   - generate-prd-manifest mapping
 *
 * Orchestrator end-to-end smoke lives in prd-orchestrator.test.ts.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CANONICAL_PRD_BODY } from './__test-helpers__/canonical-prd';
import { validatePrd, extractCitationSignals } from './prd-validator';
import { parseReviewResponse } from './expert-review';
import { verifyGrounding } from './verify-grounding';
import { generatePrdManifest } from './generate-prd-manifest';
import type { MeshContext, PrdBrief } from '../../schemas';

// ============================================================================
// prd-validator
// ============================================================================

test('validatePrd: canonical body passes every rule', () => {
  const report = validatePrd(CANONICAL_PRD_BODY);
  assert.equal(report.valid, true, `errors: ${JSON.stringify(report.errors)}`);
  assert.deepEqual(report.signals.premise_ids.sort(), ['E1', 'E2', 'R1', 'R2']);
  assert.equal(report.signals.fr_entries.length, 3);
  assert.equal(report.signals.sr_entries.length, 2);
  // Every FR carries ≥1 R/E citation
  assert.ok(report.signals.fr_entries.every(f => f.cited.length > 0));
  // Every SR carries ≥1 THR/A0X/NIST citation
  assert.ok(report.signals.sr_entries.every(s => s.cited.length > 0));
  // Coverage table has a row per premise
  assert.equal(report.signals.coverage_rows.length, 4);
});

test('validatePrd: catches FR with no R/E citation', () => {
  const broken = CANONICAL_PRD_BODY.replace(
    '- **FR-01** Add POST /follow endpoint. CALM node: celeb-api. Traces to: R2, E1.',
    '- **FR-01** Add POST /follow endpoint. CALM node: celeb-api.',
  );
  const report = validatePrd(broken);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /FR-01.*no R\[N\].*citation/.test(e)));
});

test('validatePrd: catches SR with no THR/A0X/NIST citation', () => {
  const broken = CANONICAL_PRD_BODY.replace(
    '- **SR-01** Require JWT auth on POST /follow. Traces to: THR-001, A07.',
    '- **SR-01** Require JWT auth on POST /follow.',
  );
  const report = validatePrd(broken);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /SR-01.*no THR/.test(e)));
});

test('validatePrd: catches premise missing from Coverage Analysis table', () => {
  const broken = CANONICAL_PRD_BODY.replace(
    '| E2 | YES | SR-01, SR-02 |',
    '',
  );
  const report = validatePrd(broken);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /Coverage.*E2/.test(e)));
});

test('validatePrd: catches missing canonical section', () => {
  const broken = CANONICAL_PRD_BODY.replace(/## Risk Matrix[\s\S]*?(?=## Success Metrics)/, '');
  const report = validatePrd(broken);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /Risk Matrix/.test(e)));
});

test('extractCitationSignals: handles section without entries gracefully', () => {
  const sparseBody = `## Input Premises\n\n(none)\n\n## Functional Requirements with Traceability\n\n(none)\n`;
  const signals = extractCitationSignals(sparseBody);
  assert.deepEqual(signals.premise_ids, []);
  assert.deepEqual(signals.fr_entries, []);
});

// ============================================================================
// expert-review parser
// ============================================================================

test('parseReviewResponse: parses canonical SCORE/SEVERITY/COVERED/MISSING/CHANGES block', () => {
  const text = `SCORE: 0.92
SEVERITY: MINOR
COVERED: celeb-api, celeb-db, ADR-0001
MISSING: ADR-0007
CHANGES:
- Add explicit reference to ADR-0007 in Risk Matrix.
- Tighten FR-03 acceptance criteria.`;
  const r = parseReviewResponse(text, 'architecture', 1);
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.score, 0.92);
    assert.equal(r.data.severity, 'MINOR');
    assert.deepEqual(r.data.covered_ids, ['celeb-api', 'celeb-db', 'ADR-0001']);
    assert.deepEqual(r.data.missing_ids, ['ADR-0007']);
    assert.equal(r.data.changes.length, 2);
  }
});

test('parseReviewResponse: clamps SCORE to [0,1]', () => {
  const r = parseReviewResponse('SCORE: 1.5\nSEVERITY: PASS\nCOVERED:\nMISSING:\nCHANGES:\n', 'security', 2);
  assert.equal(r.success, true);
  if (r.success) { assert.equal(r.data.score, 1); }
});

test('parseReviewResponse: tolerates ```text fenced output', () => {
  const wrapped = '```\nSCORE: 0.8\nSEVERITY: MINOR\nCOVERED:\nMISSING:\nCHANGES:\n- one\n```';
  const r = parseReviewResponse(wrapped, 'architecture', 1);
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.score, 0.8);
    assert.equal(r.data.severity, 'MINOR');
    assert.deepEqual(r.data.changes, ['one']);
  }
});

test('parseReviewResponse: rejects unknown severity', () => {
  const r = parseReviewResponse('SCORE: 0.9\nSEVERITY: SLIGHTLY_OFF\nCOVERED:\nMISSING:\nCHANGES:', 'security', 1);
  assert.equal(r.success, false);
});

test('parseReviewResponse: rejects when SCORE missing', () => {
  const r = parseReviewResponse('SEVERITY: PASS\nCOVERED:\nMISSING:\nCHANGES:', 'architecture', 1);
  assert.equal(r.success, false);
});

test('parseReviewResponse: empty COVERED / MISSING lists parse as []', () => {
  const r = parseReviewResponse('SCORE: 0.9\nSEVERITY: PASS\nCOVERED: -\nMISSING: none\nCHANGES:', 'security', 1);
  assert.equal(r.success, true);
  if (r.success) {
    assert.deepEqual(r.data.covered_ids, []);
    assert.deepEqual(r.data.missing_ids, []);
  }
});

// ============================================================================
// verify-grounding
// ============================================================================

function mockMesh(): MeshContext {
  return {
    scope: { level: 'bar', bar_id: 'APP-INS-001', platform_id: 'PLT-INS' },
    mesh_sha: 'a'.repeat(40),
    portfolio: { name: 'P', governance_policy: null, capability_models: [], related_research_summaries: [] },
    platform: null,
    bar: {
      bar_id: 'APP-INS-001', name: 'Celeb API', composite_score: 0, tier: 'restricted',
      calm_model: { nodes: [{ 'unique-id': 'celeb-api', name: 'API', 'node-type': 'service' }, { 'unique-id': 'celeb-db', name: 'DB', 'node-type': 'datastore' }] },
      threats: [{ id: 'THR-001', category: 'spoofing' }],
      controls: null,
      adrs: [],
      pillar_scores: { architecture: 0, security: 0, info_risk: 0, operations: 0 },
      related_research: [], related_prds: [], mesh_gaps: [],
    },
  };
}

test('verifyGrounding: PASS when composite ≥ threshold + no BLOCKING', () => {
  const signals = validatePrd(CANONICAL_PRD_BODY).signals;
  const result = verifyGrounding({
    iteration: 1,
    threshold: 0.85,
    mode: 'default',
    signals,
    architecture: { expert: 'architecture', iteration: 1, score: 0.92, severity: 'MINOR', covered_ids: ['celeb-api'], missing_ids: [], changes: [] },
    security:     { expert: 'security',     iteration: 1, score: 0.88, severity: 'MINOR', covered_ids: ['THR-001'], missing_ids: [], changes: [] },
    meshContext: mockMesh(),
    history: [],
  });
  assert.equal(result.verdict, 'PASS');
  assert.equal(result.grounding.passed, true);
  assert.equal(result.grounding.iterations.length, 2);
});

test('verifyGrounding: ITERATE when composite < threshold', () => {
  const signals = validatePrd(CANONICAL_PRD_BODY).signals;
  const result = verifyGrounding({
    iteration: 1,
    threshold: 0.85,
    mode: 'default',
    signals,
    architecture: { expert: 'architecture', iteration: 1, score: 0.55, severity: 'MAJOR', covered_ids: [], missing_ids: ['celeb-db'], changes: ['Add celeb-db citation'] },
    security:     { expert: 'security',     iteration: 1, score: 0.60, severity: 'MAJOR', covered_ids: [], missing_ids: [], changes: ['Tighten SR-01'] },
    meshContext: mockMesh(),
    history: [],
  });
  assert.equal(result.verdict, 'ITERATE');
  assert.equal(result.grounding.passed, false);
});

test('verifyGrounding: strict mode forces ITERATE on BLOCKING even when composite passes', () => {
  const signals = validatePrd(CANONICAL_PRD_BODY).signals;
  const result = verifyGrounding({
    iteration: 1,
    threshold: 0.85,
    mode: 'strict',
    signals,
    architecture: { expert: 'architecture', iteration: 1, score: 0.95, severity: 'BLOCKING', covered_ids: [], missing_ids: ['celeb-db'], changes: ['Must address celeb-db'] },
    security:     { expert: 'security',     iteration: 1, score: 0.95, severity: 'PASS',     covered_ids: ['THR-001'], missing_ids: [], changes: [] },
    meshContext: mockMesh(),
    history: [],
  });
  assert.equal(result.verdict, 'ITERATE');
  assert.match(result.reason, /BLOCKING/);
});

test('verifyGrounding: history is preserved across iterations', () => {
  const signals = validatePrd(CANONICAL_PRD_BODY).signals;
  const prior = [
    { expert: 'architecture' as const, iteration: 1, score: 0.5, severity: 'MAJOR' as const, covered_ids: [], missing_ids: [], changes: [] },
    { expert: 'security'     as const, iteration: 1, score: 0.5, severity: 'MAJOR' as const, covered_ids: [], missing_ids: [], changes: [] },
  ];
  const result = verifyGrounding({
    iteration: 2, threshold: 0.85, mode: 'default', signals,
    architecture: { expert: 'architecture', iteration: 2, score: 0.92, severity: 'PASS', covered_ids: [], missing_ids: [], changes: [] },
    security:     { expert: 'security',     iteration: 2, score: 0.90, severity: 'PASS', covered_ids: [], missing_ids: [], changes: [] },
    meshContext: mockMesh(),
    history: prior,
  });
  assert.equal(result.grounding.final_iteration, 2);
  assert.equal(result.grounding.iterations.length, 4);   // 2 prior + 2 current
});

// ============================================================================
// generate-prd-manifest
// ============================================================================

test('generatePrdManifest: extracts endpoints from FR entries + SR citations', () => {
  const signals = validatePrd(CANONICAL_PRD_BODY).signals;
  const brief: PrdBrief = {
    research_source: { kind: 'path', relative_path: 'platforms/imdb-lite/bars/APP-INS-001/research/celeb-fraud-2025.md' },
    scope: { level: 'bar', id: 'APP-INS-001' },
    mode: 'deep', grounding: 'default', grounding_threshold: 0.85, max_iterations: 3,
    guardrails: 'default', llm_provider: 'anthropic', cost_cap_tokens: 200_000,
    trigger: { kind: 'local_dev' },
  };
  const manifest = generatePrdManifest({
    runId: 'PRD-2026-05-17-deadbeef',
    brief,
    meshContext: mockMesh(),
    prdBody: CANONICAL_PRD_BODY,
    signals,
    grounding: {
      final_iteration: 1,
      iterations: [],
      citation_coverage: { threats_in_scope: 1, threats_covered_by_sr: 1, calm_nodes_in_scope: 2, calm_nodes_cited_by_fr: 2, self_reported_no_count: 0 },
      final_score: 0.91,
      passed: true,
    },
    threshold: 0.85,
  });

  // Endpoints: FR-01 POST /follow, FR-02 DELETE /follow/:id (FR-03 has no HTTP verb)
  assert.equal(manifest.endpoints.length, 2);
  assert.equal(manifest.endpoints[0].signature, 'POST /follow');
  assert.equal(manifest.endpoints[0].calm_node, 'celeb-api');
  assert.equal(manifest.endpoints[0].fr_id, 'FR-01');
  assert.equal(manifest.endpoints[1].signature, 'DELETE /follow/:id');

  // Security requirements with parsed citations
  assert.equal(manifest.security_requirements.length, 2);
  assert.ok(manifest.security_requirements[0].citations.includes('THR-001'));
  assert.ok(manifest.security_requirements[0].citations.includes('A07'));

  // Grounding block reflects input
  assert.equal(manifest.grounding.passed, true);
  assert.equal(manifest.grounding.final_score, 0.91);
  assert.equal(manifest.target_repos.length, 1);
});
