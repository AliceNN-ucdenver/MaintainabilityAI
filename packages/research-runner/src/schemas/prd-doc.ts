/**
 * PrdDoc — the published PRD artifact + the grounding block the refinement
 * loop accumulates over iterations.
 */
import { z } from 'zod';
import { IsoTimestamp, RunId } from './primitives';

/** One iteration's expert review record — both arch + sec contribute one each. */
const ExpertReviewRecord = z.object({
  expert: z.enum(['architecture', 'security']),
  iteration: z.number().int().min(1).max(5),
  score: z.number().min(0).max(1),
  severity: z.enum(['PASS', 'MINOR', 'MAJOR', 'BLOCKING']),
  covered_ids: z.array(z.string()),
  missing_ids: z.array(z.string()),
  changes: z.array(z.string()),
});

export const GroundingBlock = z.object({
  final_iteration: z.number().int().min(1).max(5),
  /** Per-iteration scores from both experts (length = iterations * 2). */
  iterations: z.array(ExpertReviewRecord),
  /** Deterministic citation-coverage check independent of LLM scores. */
  citation_coverage: z.object({
    threats_in_scope: z.number().int().nonnegative(),
    threats_covered_by_sr: z.number().int().nonnegative(),
    calm_nodes_in_scope: z.number().int().nonnegative(),
    calm_nodes_cited_by_fr: z.number().int().nonnegative(),
    self_reported_no_count: z.number().int().nonnegative(),
  }),
  /** Final composite score combining LLM expert + citation signals. */
  final_score: z.number().min(0).max(1),
  passed: z.boolean(),
});

export type GroundingBlock = z.infer<typeof GroundingBlock>;

export const PrdDoc = z.object({
  run_id: RunId,
  topic: z.string(),
  generated_at: IsoTimestamp,
  body_md: z.string().min(1),
  grounding: GroundingBlock,
});

export type PrdDoc = z.infer<typeof PrdDoc>;
