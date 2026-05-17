/**
 * PrdBrief — validated input to the PRD pipeline.
 *
 * Produced when the PRD agent is triggered: either by a merged research PR
 * (via label-on-merge.yml creating a prd-pending issue), by a prd-request
 * label, or by workflow_dispatch.
 */
import { z } from 'zod';
import {
  GroundingMode,
  GuardrailMode,
  LlmProvider,
  PrdMode,
  ScopeLevel,
} from './primitives';

export const PrdBrief = z.object({
  /** Where the upstream research lives: a merged PR url OR a relative doc path. */
  research_source: z.union([
    z.object({ kind: z.literal('pr'), url: z.string().url() }),
    z.object({ kind: z.literal('path'), relative_path: z.string().min(1) }),
  ]),

  scope: z.object({
    level: ScopeLevel,
    id: z.string().optional(),
  }),

  mode: PrdMode.default('deep'),

  grounding: GroundingMode.default('default'),

  /** Minimum expert score (0.5-1.0) required to publish without iterating. */
  grounding_threshold: z.number().min(0.5).max(1).default(0.85),

  max_iterations: z.number().int().min(1).max(5).default(3),

  guardrails: GuardrailMode.default('default'),

  llm_provider: LlmProvider.default('anthropic'),

  cost_cap_tokens: z.number().int().positive().default(200_000),

  trigger: z.object({
    kind: z.enum(['workflow_dispatch', 'issue_label', 'merged_research_pr', 'local_dev']),
    issue_number: z.number().int().optional(),
    actor: z.string().optional(),
  }),
});

export type PrdBrief = z.infer<typeof PrdBrief>;
