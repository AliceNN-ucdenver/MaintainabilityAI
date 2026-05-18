/**
 * verify_grounding — pure node.
 *
 * The publish gate. Combines:
 *   (a) Deterministic citation-coverage signals from prd-validator
 *       (premise count, FR/SR citation completeness, self-reported coverage
 *       table vs actual citations).
 *   (b) Two LLM expert review scores (architecture + security).
 *
 * Produces a GroundingBlock and a verdict:
 *   - PASS      → publish
 *   - ITERATE   → re-synthesise with feedback
 *   - EXHAUSTED → publish with passed=false (orchestrator records this in
 *                 the Hatter's Tag so reviewers see the loop gave up)
 *
 * Why both signals? LLM scores alone are persuadable; citation parsing is
 * reliable but blind to whether the prose actually addresses each premise.
 * Combining them catches both "LLM rubber-stamps a sparse PRD" AND
 * "PRD has the right shape but the LLM caught a substantive miss".
 */
import type {
  GroundingBlock,
  GroundingMode,
  MeshContext,
} from '../../schemas';
import type { ExpertReview } from './expert-review';
import type { PrdCitationSignals } from './prd-validator';

export interface VerifyGroundingOpts {
  iteration: number;
  threshold: number;          // 0.5..1, from brief.grounding_threshold
  mode: GroundingMode;        // strict | default | lenient — controls BLOCKING handling
  signals: PrdCitationSignals;
  architecture: ExpertReview;
  security: ExpertReview;
  meshContext: MeshContext;
  /** History of reviews across prior iterations — for the GroundingBlock progression table. */
  history: ExpertReview[];
}

export type GroundingVerdict = 'PASS' | 'ITERATE' | 'EXHAUSTED';

export interface VerifyGroundingResult {
  verdict: GroundingVerdict;
  grounding: GroundingBlock;
  /** Human-readable summary of why the verdict was reached (for the audit log). */
  reason: string;
}

export function verifyGrounding(opts: VerifyGroundingOpts): VerifyGroundingResult {
  const citation = computeCitationCoverage(opts.signals, opts.meshContext);
  const compositeScore = combineScore(opts.architecture.score, opts.security.score, citation);

  // History always includes the current iteration's reviews so the
  // GroundingBlock's `iterations` field has the full trail.
  const iterations = [
    ...opts.history,
    opts.architecture,
    opts.security,
  ];

  const grounding: GroundingBlock = {
    final_iteration: opts.iteration,
    iterations,
    citation_coverage: citation,
    final_score: round4(compositeScore),
    passed: compositeScore >= opts.threshold,
  };

  // Strict mode treats BLOCKING reviews as automatic ITERATE even when score
  // would pass. Lenient mode treats them as warnings (still pass if score OK).
  const hasBlocking = opts.architecture.severity === 'BLOCKING' || opts.security.severity === 'BLOCKING';
  if (opts.mode === 'strict' && hasBlocking) {
    return {
      verdict: 'ITERATE',
      grounding: { ...grounding, passed: false },
      reason: `BLOCKING review present (arch=${opts.architecture.severity}, sec=${opts.security.severity}) and mode=strict — re-iterate even though composite=${grounding.final_score} ≥ threshold=${opts.threshold}`,
    };
  }

  if (grounding.passed) {
    return {
      verdict: 'PASS',
      grounding,
      reason: `composite=${grounding.final_score} ≥ threshold=${opts.threshold}; arch=${opts.architecture.score}/${opts.architecture.severity}; sec=${opts.security.score}/${opts.security.severity}`,
    };
  }

  return {
    verdict: 'ITERATE',
    grounding,
    reason: `composite=${grounding.final_score} < threshold=${opts.threshold} (arch=${opts.architecture.score} × sec=${opts.security.score}; under-cited FR=${citation.calm_nodes_in_scope - citation.calm_nodes_cited_by_fr}, under-cited threats=${citation.threats_in_scope - citation.threats_covered_by_sr}, self-reported NO=${citation.self_reported_no_count})`,
  };
}

// ============================================================================
// Citation coverage (deterministic)
// ============================================================================

function computeCitationCoverage(signals: PrdCitationSignals, mesh: MeshContext): GroundingBlock['citation_coverage'] {
  // STRIDE: count threats in scope vs threats actually cited by any SR
  const strideIdsInScope = new Set<string>();
  if (Array.isArray(mesh.bar?.threats)) {
    for (const t of mesh.bar!.threats as Array<{ id?: string }>) {
      if (t.id) { strideIdsInScope.add(t.id); }
    }
  }
  const threatsCitedBySr = new Set<string>();
  for (const sr of signals.sr_entries) {
    for (const cite of sr.cited) {
      if (cite.startsWith('THR-')) { threatsCitedBySr.add(cite); }
    }
  }

  // CALM: count CALM node IDs in scope vs node IDs cited by any FR
  // (FR citations are R[N] / E[N], not CALM ids — but the PRD body may
  // reference CALM nodes inline. We accept either form; cite-count is a
  // floor, not a ceiling.)
  const calmNodesInScope = new Set<string>();
  const calm = mesh.bar?.calm_model;
  if (calm && typeof calm === 'object') {
    const nodes = (calm as { nodes?: unknown }).nodes;
    if (Array.isArray(nodes)) {
      for (const n of nodes) {
        const id = (n as Record<string, unknown>)['unique-id'];
        if (typeof id === 'string') { calmNodesInScope.add(id); }
      }
    }
  }
  // FR-level CALM-node citations aren't enforced by the validator directly
  // (the prompt is the contract); we estimate by counting R/E premises with
  // a 1:1 assumption that each maps to a single CALM-relevant intent.
  const calmCitedByFr = Math.min(calmNodesInScope.size, signals.fr_entries.filter(f => f.cited.length > 0).length);

  // Self-reported NO count from the Coverage Analysis table
  const selfReportedNo = signals.coverage_rows.filter(r => r.status === 'NO').length;

  return {
    threats_in_scope: strideIdsInScope.size,
    threats_covered_by_sr: [...threatsCitedBySr].filter(id => strideIdsInScope.has(id)).length,
    calm_nodes_in_scope: calmNodesInScope.size,
    calm_nodes_cited_by_fr: calmCitedByFr,
    self_reported_no_count: selfReportedNo,
  };
}

// ============================================================================
// Combined score
// ============================================================================

/**
 * Weighted composite of:
 *   - architecture LLM score (35%)
 *   - security LLM score      (35%)
 *   - deterministic citation coverage (30%)
 *
 * Citation coverage is computed as 1 - (under-cited fraction), where the
 * under-cited fraction is the harmonic mean of threat-coverage gaps and
 * FR-coverage gaps, plus a penalty for self-reported NOs.
 */
function combineScore(archScore: number, secScore: number, citation: GroundingBlock['citation_coverage']): number {
  const threatCoverage = citation.threats_in_scope === 0
    ? 1
    : citation.threats_covered_by_sr / citation.threats_in_scope;
  const calmCoverage = citation.calm_nodes_in_scope === 0
    ? 1
    : citation.calm_nodes_cited_by_fr / citation.calm_nodes_in_scope;
  // Self-reported NO penalty: each NO subtracts 0.05, capped at 0.30.
  const noPenalty = Math.min(0.30, citation.self_reported_no_count * 0.05);
  const citationScore = Math.max(0, harmonicMean(threatCoverage, calmCoverage) - noPenalty);

  return 0.35 * archScore + 0.35 * secScore + 0.30 * citationScore;
}

function harmonicMean(a: number, b: number): number {
  if (a <= 0 || b <= 0) { return 0; }
  return (2 * a * b) / (a + b);
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
