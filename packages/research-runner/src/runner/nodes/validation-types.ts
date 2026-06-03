/**
 * Shared structural-validation types.
 *
 * These are plain data shapes used by the live PRD structural validator
 * (`prd-validator.ts`). They previously lived in `synthesis-validator.ts`, a
 * node validator that had NO live caller (WHY artifacts are validated by the
 * workflow inline `structure` step, not by that TS helper). That misleading
 * dead file was removed; the still-used types moved here under a neutral name
 * so nothing poses as "the canonical WHY/synthesis validator".
 *
 * NOTE: there is intentionally NO `synthesis-validator` / `validateSynthesis`.
 * The canonical WHY gate is the workflow (`market-research-agent.yml`); the
 * phase-contract parity test asserts no such TS surface is reintroduced.
 */

export interface CitationStats {
  source_count: number;
  conclusion_count: number;
  recommendation_count: number;
  /** Conclusions with a confidence rating but fewer than 2 source citations (1 ok for LOW). */
  underCitedConclusions: number;
  /** Recommendations missing a `C[N]` reference. */
  untracedRecommendations: number;
  /** Top-level claims (sentences) in narrative sections with no `S[N]` citation. Heuristic. */
  untraced_claims: number;
}

export interface ValidationReport {
  valid: boolean;
  /** Human-readable errors — fed back to the LLM on retry. */
  errors: string[];
  /** Sections found (in body order). */
  sectionsFound: string[];
  citation_stats: CitationStats;
}
