/**
 * RankedSource — normalised search result shape after dedupe_and_rank.
 *
 * Each provider (Tavily / arXiv / USPTO / HackerNews) returns its own native
 * payload; the dedupe node converts them all to this common shape with a
 * salience score (0.0-1.0) used by synthesize to choose what to cite.
 */
import { z } from 'zod';
import { IsoTimestamp, SearchProvider } from './primitives';

export const RankedSource = z.object({
  /** Stable id used by the synthesis prompt as `S[N]` citation. */
  id: z.string().regex(/^S\d+$/),

  provider: SearchProvider,

  title: z.string().min(1),

  url: z.string().url(),

  retrieved_at: IsoTimestamp,

  /** 0.0 - 1.0, higher = more relevant. Computed by dedupe_and_rank. */
  salience_score: z.number().min(0).max(1),

  /** ≤2000-char excerpt the synthesis agent quotes from. Sized for the
   *  current flow where the agent (Copilot Coding Agent / @claude) reads
   *  the issue comment — they have plenty of context budget, and 500
   *  routinely truncated arXiv abstracts and patent summaries mid-thought. */
  excerpt: z.string().max(2000),

  /** Optional: pub date if the source has one (papers, news, patents). */
  published_at: IsoTimestamp.optional(),

  /** Optional: authors (arxiv / news). */
  authors: z.array(z.string()).optional(),
});

export type RankedSource = z.infer<typeof RankedSource>;

export const RankedSourceList = z.array(RankedSource);
export type RankedSourceList = z.infer<typeof RankedSourceList>;
