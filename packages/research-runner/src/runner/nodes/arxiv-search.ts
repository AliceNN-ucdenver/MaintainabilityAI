/**
 * arxiv_search — pure_api node.
 *
 * Runs each arxiv query against export.arxiv.org in parallel. arXiv's
 * Atom API doesn't return a relevance score; we synthesise one from
 * result position (top result → 0.9 → linear decay to 0.5).
 */
import { arxivSearch, type ArxivSearchResult } from '../../search/arxiv-client';
import type { ProviderResult } from '../../search/provider-result';
import type { QueryEnvelope } from './tavily-search';

export interface ArxivSearchNodeOpts {
  queries: string[];
  maxResultsPerQuery?: number;
  fetchImpl?: typeof fetch;
}

export interface ArxivSearchNodeResult {
  envelopes: QueryEnvelope[];
  results: ProviderResult[];
}

export async function runArxivSearch(opts: ArxivSearchNodeOpts): Promise<ArxivSearchNodeResult> {
  const settled = await Promise.allSettled(
    opts.queries.map(query => arxivSearch({
      query,
      maxResults: opts.maxResultsPerQuery ?? 5,
      fetchImpl: opts.fetchImpl,
    })),
  );

  const envelopes: QueryEnvelope[] = [];
  const results: ProviderResult[] = [];

  for (let i = 0; i < opts.queries.length; i++) {
    const query = opts.queries[i];
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      const ok = outcome.value as ArxivSearchResult;
      envelopes.push({
        query,
        httpStatus: ok.httpStatus,
        responseBytes: ok.responseBytes,
        resultCount: ok.results.length,
      });
      for (let j = 0; j < ok.results.length; j++) {
        const r = ok.results[j];
        results.push({
          provider: 'arxiv',
          fromQuery: query,
          title: r.title,
          url: r.abstractUrl,
          content: r.summary.slice(0, 2000),
          // Position-derived score: arXiv returns by relevance, decay 0.9 → 0.5.
          score: Math.max(0.5, 0.9 - j * 0.1),
          publishedDate: r.published || undefined,
          authors: r.authors,
        });
      }
    } else {
      const err = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      envelopes.push({ query, httpStatus: 0, responseBytes: 0, resultCount: 0, error: err });
    }
  }

  return { envelopes, results };
}
