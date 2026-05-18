/**
 * tavily_search — pure_api node.
 *
 * Runs every web query from the QueryPlan against Tavily in parallel.
 * Per-query failures are isolated (one query failing doesn't kill the run);
 * the orchestrator records per-query telemetry for the audit log.
 *
 * Emits ProviderResult[] tagged with provider='tavily' for the shared
 * dedupe-and-rank step that handles results from every provider.
 */
import { tavilySearch, type TavilySearchResult } from '../../search/tavily-client';
import type { ProviderResult } from '../../search/provider-result';

export interface TavilySearchNodeOpts {
  apiKey: string;
  queries: string[];        // typically QueryPlan.web (length 5)
  maxResultsPerQuery?: number;
  searchDepth?: 'basic' | 'advanced';
  fetchImpl?: typeof fetch;
}

export interface QueryEnvelope {
  query: string;
  httpStatus: number;
  responseBytes: number;
  resultCount: number;
  /** Populated when this query failed. */
  error?: string;
}

export interface TavilySearchNodeResult {
  envelopes: QueryEnvelope[];
  results: ProviderResult[];
}

export async function runTavilySearch(opts: TavilySearchNodeOpts): Promise<TavilySearchNodeResult> {
  if (!opts.apiKey) {
    throw new Error('TAVILY_API_KEY missing — set the env var or pass apiKey directly');
  }

  const settled = await Promise.allSettled(
    opts.queries.map(query => tavilySearch({
      apiKey: opts.apiKey,
      query,
      maxResults: opts.maxResultsPerQuery ?? 5,
      searchDepth: opts.searchDepth ?? 'basic',
      fetchImpl: opts.fetchImpl,
    })),
  );

  const envelopes: QueryEnvelope[] = [];
  const results: ProviderResult[] = [];

  for (let i = 0; i < opts.queries.length; i++) {
    const query = opts.queries[i];
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      const ok = outcome.value as TavilySearchResult;
      envelopes.push({
        query,
        httpStatus: ok.httpStatus,
        responseBytes: ok.responseBytes,
        resultCount: ok.results.length,
      });
      for (const r of ok.results) {
        results.push({
          provider: 'tavily',
          fromQuery: query,
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
          publishedDate: r.publishedDate,
        });
      }
    } else {
      const err = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      envelopes.push({ query, httpStatus: 0, responseBytes: 0, resultCount: 0, error: err });
    }
  }

  return { envelopes, results };
}
