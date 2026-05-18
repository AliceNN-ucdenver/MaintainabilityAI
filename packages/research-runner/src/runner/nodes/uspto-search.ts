/**
 * uspto_search — pure_api node.
 *
 * Runs each patent query against USPTO's Open Data Portal
 * (api.uspto.gov). Requires USPTO_API_KEY.
 *
 * Salience score derived from result position (descending; first hit
 * gets 0.85, decays by 0.1 per position, floor at 0.4) since the ODP
 * endpoint doesn't return its own relevance score.
 *
 * When no apiKey is supplied, this node throws — the orchestrator catches
 * and converts to a node_error envelope so the run continues without
 * patent coverage rather than failing entirely.
 */
import { usptoSearch, type UsptoSearchResult } from '../../search/uspto-client';
import type { ProviderResult } from '../../search/provider-result';
import type { QueryEnvelope } from './tavily-search';

export interface UsptoSearchNodeOpts {
  apiKey: string;
  queries: string[];
  maxResultsPerQuery?: number;
  fetchImpl?: typeof fetch;
}

export interface UsptoSearchNodeResult {
  envelopes: QueryEnvelope[];
  results: ProviderResult[];
}

export async function runUsptoSearch(opts: UsptoSearchNodeOpts): Promise<UsptoSearchNodeResult> {
  if (!opts.apiKey) {
    throw new Error('USPTO_API_KEY missing — request a key at https://data.uspto.gov/apis/getting-started');
  }

  const settled = await Promise.allSettled(
    opts.queries.map(query => usptoSearch({
      apiKey: opts.apiKey,
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
      const ok = outcome.value as UsptoSearchResult;
      envelopes.push({
        query,
        httpStatus: ok.httpStatus,
        responseBytes: ok.responseBytes,
        resultCount: ok.results.length,
      });
      for (let j = 0; j < ok.results.length; j++) {
        const r = ok.results[j];
        results.push({
          provider: 'uspto',
          fromQuery: query,
          title: r.title,
          url: r.url,
          content: r.abstract.slice(0, 500),
          score: Math.max(0.4, 0.85 - j * 0.1),
          publishedDate: r.grantedAt || undefined,
          authors: r.inventors,
        });
      }
    } else {
      const err = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      envelopes.push({ query, httpStatus: 0, responseBytes: 0, resultCount: 0, error: err });
    }
  }

  return { envelopes, results };
}
