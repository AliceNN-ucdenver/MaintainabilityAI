/**
 * verify_grounding — pure node, v0.6.
 *
 * Combines FOUR signals to decide PASS / ITERATE / EXHAUSTED:
 *   (1) deterministic_architecture_review — citation-grep against premises
 *   (2) deterministic_security_review     — citation-grep against threats + OWASP + NIST
 *   (3) architect_expert_review (LLM)     — SCORE/SEVERITY/COVERED/MISSING/CHANGES
 *   (4) security_expert_review (LLM)      — same shape
 *
 * Plus the deterministic citation-coverage stats derived from PrdCitationSignals
 * (threats covered, CALM nodes referenced, self-reported NOs).
 *
 * Verdict rules (v0.6 "both-must-pass" semantics):
 *   - If EITHER deterministic reviewer is MAJOR (invalid citations exist),
 *     ITERATE — no amount of LLM rubber-stamping can excuse a wrong cite.
 *   - If the |arch_score − sec_score| disagreement is ≥ 0.2, ITERATE — the
 *     experts disagree strongly, treat as "needs another pass".
 *   - In strict mode, any BLOCKING LLM severity also forces ITERATE.
 *   - Otherwise: PASS iff composite ≥ threshold.
 *   - On the final allowed iteration, ITERATE becomes EXHAUSTED.
 */
import type {
  GroundingBlock,
  GroundingMode,
  MeshContext,
} from '../../schemas';
import type { DeterministicReview } from './deterministic-review';
import type { ExpertReview } from './expert-review';
import type { PrdCitationSignals } from './prd-validator';

export interface VerifyGroundingOpts {
  iteration: number;
  threshold: number;
  mode: GroundingMode;
  signals: PrdCitationSignals;
  /** LLM reviewers — high-judgment scoring. */
  architecture: ExpertReview;
  security: ExpertReview;
  /** Deterministic reviewers — citation grep. */
  det_architecture: DeterministicReview;
  det_security: DeterministicReview;
  meshContext: MeshContext;
  /** History of LLM reviews across prior iterations — for the GroundingBlock progression. */
  history: ExpertReview[];
}

export type GroundingVerdict = 'PASS' | 'ITERATE' | 'EXHAUSTED';

export interface VerifyGroundingResult {
  verdict: GroundingVerdict;
  grounding: GroundingBlock;
  reason: string;
  /** Per-iteration signals — what iteration_summary audit events record. */
  signals_snapshot: {
    composite_score: number;
    disagreement_delta: number;
  };
}

/** Disagreement threshold from the v0.6 spec — re-iterate when experts disagree this much. */
export const DISAGREEMENT_DELTA_THRESHOLD = 0.2;

export function verifyGrounding(opts: VerifyGroundingOpts): VerifyGroundingResult {
  const citation = computeCitationCoverage(opts.signals, opts.meshContext);
  const compositeScore = combineScore(opts.architecture.score, opts.security.score, citation);
  const disagreement = Math.abs(opts.architecture.score - opts.security.score);

  const iterations = [
    ...opts.history,
    opts.architecture,
    opts.security,
  ];

  const baseGrounding: GroundingBlock = {
    final_iteration: opts.iteration,
    iterations,
    citation_coverage: citation,
    final_score: round4(compositeScore),
    passed: false, // overwritten below per verdict
  };

  // Rule 1: invalid citations from EITHER deterministic reviewer → ITERATE.
  const detArchMajor = opts.det_architecture.severity === 'MAJOR';
  const detSecMajor = opts.det_security.severity === 'MAJOR';
  if (detArchMajor || detSecMajor) {
    return {
      verdict: 'ITERATE',
      grounding: baseGrounding,
      reason: `Deterministic reviewer flagged invalid citations (det_arch=${opts.det_architecture.severity}/${opts.det_architecture.invalid_citations.length}, det_sec=${opts.det_security.severity}/${opts.det_security.invalid_citations.length}) — the PRD references IDs that don't exist in the mesh. Composite=${round4(compositeScore)} ignored until cites are fixed.`,
      signals_snapshot: { composite_score: round4(compositeScore), disagreement_delta: round4(disagreement) },
    };
  }

  // Rule 2: BLOCKING LLM severity in strict mode → ITERATE.
  const hasBlocking = opts.architecture.severity === 'BLOCKING' || opts.security.severity === 'BLOCKING';
  if (opts.mode === 'strict' && hasBlocking) {
    return {
      verdict: 'ITERATE',
      grounding: baseGrounding,
      reason: `BLOCKING review in strict mode (arch=${opts.architecture.severity}, sec=${opts.security.severity}) — re-iterate even though composite=${round4(compositeScore)} would otherwise pass.`,
      signals_snapshot: { composite_score: round4(compositeScore), disagreement_delta: round4(disagreement) },
    };
  }

  // Rule 3: expert disagreement ≥ DISAGREEMENT_DELTA_THRESHOLD → ITERATE.
  if (disagreement >= DISAGREEMENT_DELTA_THRESHOLD) {
    return {
      verdict: 'ITERATE',
      grounding: baseGrounding,
      reason: `Expert disagreement ${round4(disagreement)} ≥ ${DISAGREEMENT_DELTA_THRESHOLD} (arch=${opts.architecture.score}, sec=${opts.security.score}) — re-iterate so the experts can converge.`,
      signals_snapshot: { composite_score: round4(compositeScore), disagreement_delta: round4(disagreement) },
    };
  }

  // Rule 4: composite ≥ threshold → PASS.
  if (compositeScore >= opts.threshold) {
    return {
      verdict: 'PASS',
      grounding: { ...baseGrounding, passed: true },
      reason: `composite=${round4(compositeScore)} ≥ threshold=${opts.threshold}; arch=${opts.architecture.score}/${opts.architecture.severity}; sec=${opts.security.score}/${opts.security.severity}; det_arch=${opts.det_architecture.severity}; det_sec=${opts.det_security.severity}; disagreement=${round4(disagreement)}.`,
      signals_snapshot: { composite_score: round4(compositeScore), disagreement_delta: round4(disagreement) },
    };
  }

  return {
    verdict: 'ITERATE',
    grounding: baseGrounding,
    reason: `composite=${round4(compositeScore)} < threshold=${opts.threshold} (arch=${opts.architecture.score} × sec=${opts.security.score}; under-cited FR=${citation.calm_nodes_in_scope - citation.calm_nodes_cited_by_fr}, under-cited threats=${citation.threats_in_scope - citation.threats_covered_by_sr}, self-reported NO=${citation.self_reported_no_count}).`,
    signals_snapshot: { composite_score: round4(compositeScore), disagreement_delta: round4(disagreement) },
  };
}

// ============================================================================
// Citation coverage (deterministic — unchanged from earlier phase)
// ============================================================================

function computeCitationCoverage(signals: PrdCitationSignals, mesh: MeshContext): GroundingBlock['citation_coverage'] {
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
  const calmCitedByFr = Math.min(calmNodesInScope.size, signals.fr_entries.filter(f => f.cited.length > 0).length);
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

function combineScore(archScore: number, secScore: number, citation: GroundingBlock['citation_coverage']): number {
  const threatCoverage = citation.threats_in_scope === 0
    ? 1
    : citation.threats_covered_by_sr / citation.threats_in_scope;
  const calmCoverage = citation.calm_nodes_in_scope === 0
    ? 1
    : citation.calm_nodes_cited_by_fr / citation.calm_nodes_in_scope;
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
