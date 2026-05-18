/**
 * tavily_search — pure_api node.
 *
 * Runs the 5 web queries from the QueryPlan against Tavily in parallel.
 * Per-query failures are isolated (one query failing doesn't kill the run);
 * the orchestrator records per-query telemetry for the audit log.
 *
 * Returns the raw, un-deduplicated results plus the per-query envelopes the
 * audit emitter needs.
 */
import { tavilySearch, type TavilyResult, type TavilySearchResult } from '../../search/tavily-client';

export interface TavilySearchNodeOpts {
  apiKey: string;
  queries: string[];        // typically QueryPlan.web (length 5)
  /** Tavily results per query. Default 5. */
  maxResultsPerQuery?: number;
  searchDepth?: 'basic' | 'advanced';
  fetchImpl?: typeof fetch;
}

export interface QueryEnvelope {
  query: string;
  httpStatus: number;
  responseBytes: number;
  /** Empty array on failure. */
  results: TavilyResult[];
  /** Populated when this query failed. */
  error?: string;
}

export interface TavilySearchNodeResult {
  /** Per-query envelopes, in input order. */
  envelopes: QueryEnvelope[];
  /** All results flattened (still needs dedupe). */
  allResults: Array<TavilyResult & { fromQuery: string }>;
}

export async function runTavilySearch(opts: TavilySearchNodeOpts): Promise<TavilySearchNodeResult> {
  if (!opts.apiKey) {
    throw new Error('TAVILY_API_KEY missing — set the env var or pass apiKey directly');
  }

  // Parallelise — Tavily's free tier handles 5 concurrent requests fine.
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
  const allResults: Array<TavilyResult & { fromQuery: string }> = [];

  for (let i = 0; i < opts.queries.length; i++) {
    const query = opts.queries[i];
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      const ok = outcome.value as TavilySearchResult;
      envelopes.push({
        query,
        httpStatus: ok.httpStatus,
        responseBytes: ok.responseBytes,
        results: ok.results,
      });
      for (const r of ok.results) {
        allResults.push({ ...r, fromQuery: query });
      }
    } else {
      const err = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      envelopes.push({ query, httpStatus: 0, responseBytes: 0, results: [], error: err });
    }
  }

  return { envelopes, allResults };
}
