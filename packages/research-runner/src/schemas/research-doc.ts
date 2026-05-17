/**
 * ResearchDoc — the published research artifact (research path).
 *
 * The synthesis LLM produces structured markdown matching the 10 canonical
 * sections defined in `.caterpillar/prompts/research/synthesis.md`. The
 * runner validates section presence + citation rules with a separate
 * structural validator; this schema only enforces the surrounding metadata.
 */
import { z } from 'zod';
import { Confidence, IsoTimestamp, RunId } from './primitives';

/** A formal conclusion line as parsed from the body. Used by the structural validator. */
export const FormalConclusion = z.object({
  id: z.string().regex(/^C\d+$/),
  statement: z.string(),
  confidence: Confidence,
  /** Source premise IDs (S1, S2, …) cited by this conclusion. */
  cited_sources: z.array(z.string().regex(/^S\d+$/)).min(1),
});

export const ResearchDoc = z.object({
  run_id: RunId,
  topic: z.string(),
  generated_at: IsoTimestamp,

  /** Final published markdown — the body the auditor + reviewers read. */
  body_md: z.string().min(1),

  /** Pre-extracted formal conclusions, used for downstream PRD grounding. */
  conclusions: z.array(FormalConclusion).optional(),

  /** Citation counts the structural validator reports back. */
  citation_stats: z.object({
    source_count: z.number().int().nonnegative(),
    conclusion_count: z.number().int().nonnegative(),
    recommendation_count: z.number().int().nonnegative(),
    untraced_claims: z.number().int().nonnegative(),
  }),
});

export type ResearchDoc = z.infer<typeof ResearchDoc>;
