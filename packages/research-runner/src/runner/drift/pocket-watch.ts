/**
 * Pocket Watch v2 — pure contrastive alignment scorer.
 *
 * Asks the audit-useful question — "does this artifact match its OWN OKR better
 * than the nearby alternatives?" — instead of the brittle "is one absolute
 * cosine above a global cutoff?". It receives VECTORS (the workflow owns the
 * embedding call) plus the anchor coverage, and returns a discriminated status
 * object. Pure + deterministic → unit-testable without GitHub Models and
 * replay-safe. See `vscode-extension/design/pocket-watch-alignment-rail.md`.
 *
 * Primary signal: `rank` (ordinal — robust to register, length, model drift).
 * Secondary: `margin` against a PER-MESH-CALIBRATED band (never a global
 * constant). The absolute own-score is recorded for continuity, never gating.
 */

import type { AnchorCoverage } from './anchors';

export type Vector = readonly number[];

export interface DecoyInput {
  okr_id: string;
  /** Hash of the decoy's rendered intent text — pinned into the report so
   *  replay re-uses the same basket rather than re-deriving from the live mesh. */
  intent_sha256: string;
  vector: Vector;
}

export interface ScoreInput {
  /** Embedding of the phase artifact scope text. */
  artifactVector: Vector;
  /** The artifact's own OKR. */
  own: { okr_id: string; intent_sha256: string; vector: Vector };
  /** The pinned decoy basket (sibling OKR objectives). May be empty. */
  decoys: DecoyInput[];
  anchorCoverage: AnchorCoverage;
  config?: PocketWatchConfig;
}

export interface PocketWatchConfig {
  /** Per-mesh-calibrated margin band floor. NOT a global default — callers
   *  pass the value calibrated for their mesh. Defaults to a conservative
   *  placeholder only so the function is total. */
  marginBand?: number;
  /** When true, a missing critical anchor is a hard `fail`; otherwise it is
   *  `needs_review` (advisory rollout). */
  criticalAnchorRequired?: boolean;
}

export type PocketWatchStatus = 'pass' | 'needs_review' | 'fail' | 'skipped';

export interface PocketWatchResult {
  status: PocketWatchStatus;
  own_score: number;
  nearest_decoy_score: number;
  nearest_decoy_okr_id: string | null;
  rank: number;
  margin: number;
  ratio: number | null;
  /** Continuity only — the legacy absolute cosine; never gates. */
  absolute_score: number;
  anchor_coverage: AnchorCoverage;
  /** Full ranked table (own + decoys), highest score first. */
  ranked: Array<{ okr_id: string; score: number; is_own: boolean }>;
  reason: string;
}

const DEFAULT_MARGIN_BAND = 0.05;

export function cosine(a: Vector, b: Vector): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** Round to 4dp so reports + replays are byte-identical. */
function r4(x: number): number { return Math.round(x * 1e4) / 1e4; }

/**
 * Score the artifact against its own OKR objective and the decoy basket.
 * Pure; deterministic given the vectors.
 */
export function scoreContrastive(input: ScoreInput): PocketWatchResult {
  const marginBand = input.config?.marginBand ?? DEFAULT_MARGIN_BAND;
  const criticalRequired = input.config?.criticalAnchorRequired ?? false;
  const cov = input.anchorCoverage;

  const ownScore = r4(cosine(input.artifactVector, input.own.vector));
  const scored = [
    { okr_id: input.own.okr_id, score: ownScore, is_own: true },
    ...input.decoys.map(d => ({ okr_id: d.okr_id, score: r4(cosine(input.artifactVector, d.vector)), is_own: false })),
  ];
  // Stable sort: score desc, then own first on ties, then okr_id asc — so the
  // ranking is deterministic regardless of basket order.
  scored.sort((x, y) =>
    y.score - x.score || (Number(y.is_own) - Number(x.is_own)) || (x.okr_id < y.okr_id ? -1 : 1));

  const rank = scored.findIndex(s => s.is_own) + 1;
  const decoyScores = scored.filter(s => !s.is_own);
  const nearest = decoyScores.length
    ? decoyScores.reduce((best, s) => (s.score > best.score ? s : best))
    : null;
  const nearestScore = nearest ? nearest.score : 0;
  const margin = r4(ownScore - nearestScore);
  const ratio = nearest && nearestScore !== 0 ? r4(ownScore / nearestScore) : null;
  const missingCritical = cov.missing_critical.length > 0;

  // Verdict — rank first (the robust ordinal), then margin band, then anchors.
  let status: PocketWatchStatus;
  let reason: string;
  if (rank > 1) {
    status = 'fail';
    reason = `another OKR matched better (${nearest?.okr_id ?? 'n/a'} at ${nearestScore} vs own ${ownScore})`;
  } else if (missingCritical && criticalRequired) {
    status = 'fail';
    reason = `critical anchor missing: ${cov.missing_critical.join(', ')}`;
  } else if (missingCritical) {
    status = 'needs_review';
    reason = `critical anchor missing: ${cov.missing_critical.join(', ')}`;
  } else if (decoyScores.length === 0) {
    // No basket to contrast against — cannot certify alignment by rank.
    status = 'needs_review';
    reason = 'no decoy basket available (single-OKR mesh); ranked #1 trivially';
  } else if (margin < marginBand) {
    status = 'needs_review';
    reason = `narrow margin +${margin} (band ${marginBand}); similar sibling OKR (${nearest?.okr_id}) or generic artifact`;
  } else {
    status = 'pass';
    reason = `rank #1, margin +${margin} (own ${ownScore} vs nearest ${nearest?.okr_id} ${nearestScore})`;
  }

  return {
    status,
    own_score: ownScore,
    nearest_decoy_score: nearestScore,
    nearest_decoy_okr_id: nearest?.okr_id ?? null,
    rank,
    margin,
    ratio,
    absolute_score: ownScore,
    anchor_coverage: cov,
    ranked: scored,
    reason,
  };
}
