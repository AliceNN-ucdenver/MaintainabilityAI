/**
 * ResearchBrief — validated input to the Archeologist pipeline.
 *
 * Produced by `validate_brief` (the pure first node) from CLI args / issue
 * body / workflow_dispatch inputs / Looking Glass form. Every downstream
 * node receives this object.
 */
import { z } from 'zod';
import {
  GuardrailMode,
  LlmProvider,
  ResearchPath,
  ScopeLevel,
} from './primitives';

export const ResearchBrief = z.object({
  /** Plain-English research request (the topic). */
  topic: z.string().min(3).max(2000),

  scope: z.object({
    level: ScopeLevel,
    /** Required: platform slug (e.g. `imdb-lite`) or BAR id (e.g. `APP-IMDB-002`). */
    id: z.string().min(1),
  }),

  /** `research` = market research; `archaeology` = codebase analysis path. */
  path: ResearchPath.default('research'),

  /** Archaeology path only: `owner/repo` of the codebase to analyze. */
  target_repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/).optional(),

  /** Guardrail mode applied to LLM nodes. */
  guardrails: GuardrailMode.default('default'),

  /** LLM provider for the synthesis + planning nodes. */
  llm_provider: LlmProvider.default('anthropic'),

  /** Token budget cap (warn before exceeding). */
  cost_cap_tokens: z.number().int().positive().default(200_000),

  /** Caller-supplied trigger context — flows into the audit log envelope. */
  trigger: z.object({
    kind: z.enum(['workflow_dispatch', 'issue_label', 'issue_comment', 'project_card', 'local_dev']),
    /** Issue number when triggered by issue / comment events. */
    issue_number: z.number().int().optional(),
    /** Actor login when known (GitHub Actions sets this). */
    actor: z.string().optional(),
  }),
}).superRefine((brief, ctx) => {
  // Archaeology runs require a target repo
  if (brief.path === 'archaeology' && !brief.target_repo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'archaeology path requires target_repo (owner/repo)',
      path: ['target_repo'],
    });
  }
  // scope.id required-ness is enforced at the field level (min(1)).
});

export type ResearchBrief = z.infer<typeof ResearchBrief>;
