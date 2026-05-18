/**
 * tavily-client — minimal `fetch`-based wrapper around Tavily's `/search`
 * endpoint. Returns normalized results the dedupe_and_rank node can score.
 */

export interface TavilySearchOpts {
  apiKey: string;
  query: string;
  /** 1..20. Tavily default is 5. */
  maxResults?: number;
  /** "basic" (cheap, fast) or "advanced" (better quality, slower). */
  searchDepth?: 'basic' | 'advanced';
  /** Whether to include domains-only filter etc. — pass through to Tavily. */
  includeDomains?: string[];
  excludeDomains?: string[];
  /** Test injection point; defaults to globalThis.fetch. */
  fetchImpl?: typeof fetch;
  /** Abort timeout (ms). Default 30s. */
  timeoutMs?: number;
}

export interface TavilyResult {
  title: string;
  url: string;
  /** Snippet/excerpt that matched the query. */
  content: string;
  /** Tavily relevance score 0..1. */
  score: number;
  /** Publication date if Tavily resolved one (ISO). */
  publishedDate?: string;
}

export interface TavilySearchResult {
  query: string;
  results: TavilyResult[];
  /** Total response bytes (for audit). */
  responseBytes: number;
  /** HTTP status. */
  httpStatus: number;
}

export async function tavilySearch(opts: TavilySearchOpts): Promise<TavilySearchResult> {
  if (!opts.apiKey) {
    throw new Error('TAVILY_API_KEY missing — set the env var or pass apiKey directly');
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);

  let response: Response;
  try {
    response = await fetchImpl('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: opts.apiKey,
        query: opts.query,
        max_results: opts.maxResults ?? 5,
        search_depth: opts.searchDepth ?? 'basic',
        ...(opts.includeDomains?.length ? { include_domains: opts.includeDomains } : {}),
        ...(opts.excludeDomains?.length ? { exclude_domains: opts.excludeDomains } : {}),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const httpStatus = response.status;
  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`Tavily returned ${httpStatus}: ${rawText.slice(0, 400)}`);
  }

  const data = JSON.parse(rawText) as {
    results?: Array<{ title?: string; url?: string; content?: string; score?: number; published_date?: string }>;
  };

  const results: TavilyResult[] = (data.results ?? []).map(r => ({
    title: r.title ?? '',
    url: r.url ?? '',
    content: r.content ?? '',
    score: typeof r.score === 'number' ? r.score : 0,
    publishedDate: r.published_date,
  })).filter(r => r.url.length > 0);

  return {
    query: opts.query,
    results,
    responseBytes: Buffer.byteLength(rawText, 'utf8'),
    httpStatus,
  };
}
