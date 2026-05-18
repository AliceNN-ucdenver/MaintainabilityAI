/**
 * hackernews_search — pure_api node.
 *
 * Runs each community query through Algolia's HN Search. Salience score
 * derived from HN's `points` field with a soft cap: log(1+points)/8 →
 * a 100-point story scores ~0.58, a 1000-point story scores ~0.86,
 * everything ≥ 5000 saturates at 1.0.
 */
import { hackerNewsSearch, type HackerNewsSearchResult } from '../../search/hackernews-client';
import type { ProviderResult } from '../../search/provider-result';
import type { QueryEnvelope } from './tavily-search';

export interface HackerNewsSearchNodeOpts {
  queries: string[];
  hitsPerQuery?: number;
  fetchImpl?: typeof fetch;
}

export interface HackerNewsSearchNodeResult {
  envelopes: QueryEnvelope[];
  results: ProviderResult[];
}

export async function runHackerNewsSearch(opts: HackerNewsSearchNodeOpts): Promise<HackerNewsSearchNodeResult> {
  const settled = await Promise.allSettled(
    opts.queries.map(query => hackerNewsSearch({
      query,
      hitsPerPage: opts.hitsPerQuery ?? 5,
      fetchImpl: opts.fetchImpl,
    })),
  );

  const envelopes: QueryEnvelope[] = [];
  const results: ProviderResult[] = [];

  for (let i = 0; i < opts.queries.length; i++) {
    const query = opts.queries[i];
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      const ok = outcome.value as HackerNewsSearchResult;
      envelopes.push({
        query,
        httpStatus: ok.httpStatus,
        responseBytes: ok.responseBytes,
        resultCount: ok.results.length,
      });
      for (const r of ok.results) {
        // Prefer the external article URL; fall back to the HN discussion thread.
        const url = r.url || r.hnUrl;
        if (!url) { continue; }
        results.push({
          provider: 'hackernews',
          fromQuery: query,
          title: r.title,
          url,
          // Show HN / Ask HN posts carry a self-post body. URL-only
          // submissions have no body — leave empty; the synth agent
          // can read the linked URL if it needs more context.
          content: r.storyText,
          score: pointsToScore(r.points),
          publishedDate: r.createdAt || undefined,
          authors: r.author ? [r.author] : undefined,
        });
      }
    } else {
      const err = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      envelopes.push({ query, httpStatus: 0, responseBytes: 0, resultCount: 0, error: err });
    }
  }

  return { envelopes, results };
}

function pointsToScore(points: number): number {
  if (points <= 0) { return 0.3; }
  // log scale with saturation: points=100 → 0.58, 1000 → 0.86, 5000+ → 1.0
  return Math.min(1, Math.log(1 + points) / 8);
}
