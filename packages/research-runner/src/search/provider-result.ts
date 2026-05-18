/**
 * provider-result — uniform shape every search provider's node emits.
 *
 * dedupe_and_rank consumes a flat array of these (across all providers)
 * and produces RankedSource entries with S1..SN ids. Keeping the per-
 * provider clients honest about a single shape avoids per-provider
 * branches in the dedupe + ranking logic.
 */
import type { SearchProvider } from '../schemas';

export interface ProviderResult {
  provider: SearchProvider;
  /** The query string that surfaced this result — used by the recall boost. */
  fromQuery: string;
  title: string;
  /** Canonical-ish URL. dedupe_and_rank further canonicalizes. */
  url: string;
  /** Excerpt / abstract / snippet — capped at ≈500 chars by dedupe. */
  content: string;
  /** Provider-supplied relevance score, normalised to 0..1. */
  score: number;
  /** ISO publication date when the provider returns one (papers, news, patents). */
  publishedDate?: string;
  /** Optional author list (arxiv papers, patent inventors). */
  authors?: string[];
}
