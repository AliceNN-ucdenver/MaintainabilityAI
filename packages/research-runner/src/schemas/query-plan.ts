/**
 * QueryPlan — per-provider query specialisation produced by `plan_queries`.
 *
 * Counts and per-provider rules are STRICT (the design doc's "Why this format
 * choice" section: each search backend reads queries differently and one
 * generic query plan gets sub-optimal recall everywhere).
 *
 * Web queries MUST include the current year for recency anchoring; arxiv
 * queries are short technical phrases (3-6 words); patent queries use AND
 * operators; community queries are casual 2-3 word HN-style phrases.
 */
import { z } from 'zod';

export const QueryPlan = z.object({
  /** Exactly 5 natural-language web queries; each must contain a 4-digit year. */
  web: z.array(
    z.string().min(3).refine(
      v => /\b(19|20|21)\d{2}\b/.test(v),
      { message: 'Web query must contain a 4-digit year for recency anchoring' },
    ),
  ).length(5),

  /** Exactly 3 short technical phrases for arXiv. */
  arxiv: z.array(z.string().min(3).max(80)).length(3),

  /** Exactly 3 USPTO queries — keyword sets joined with AND. */
  patent: z.array(
    z.string().min(3).refine(
      v => /\bAND\b/.test(v),
      { message: 'Patent query must join keywords with explicit AND operators' },
    ),
  ).length(3),

  /** Exactly 3 casual HackerNews-style phrases. */
  community: z.array(z.string().min(2).max(40)).length(3),
});

export type QueryPlan = z.infer<typeof QueryPlan>;
