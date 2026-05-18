/**
 * hackernews-client — query Algolia's HN Search API.
 *
 *   GET https://hn.algolia.com/api/v1/search?query=<q>&tags=story&hitsPerPage=N
 *
 * No auth, no rate-limits worth worrying about for research-scale traffic.
 * Returns JSON with a `hits` array; we keep stories only (drop comments).
 */

export interface HackerNewsResult {
  objectId: string;
  title: string;
  url: string;              // empty for Ask/Show HN stories
  hnUrl: string;            // always the news.ycombinator.com discussion link
  author: string;
  points: number;
  numComments: number;
  createdAt: string;        // ISO
}

export interface HackerNewsSearchOpts {
  query: string;
  /** 1..20. */
  hitsPerPage?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  endpoint?: string;
}

export interface HackerNewsSearchResult {
  query: string;
  results: HackerNewsResult[];
  responseBytes: number;
  httpStatus: number;
}

const DEFAULT_ENDPOINT = 'https://hn.algolia.com/api/v1/search';

export async function hackerNewsSearch(opts: HackerNewsSearchOpts): Promise<HackerNewsSearchResult> {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
  const hits = Math.min(Math.max(1, opts.hitsPerPage ?? 5), 20);
  const url = `${endpoint}?query=${encodeURIComponent(opts.query)}&tags=story&hitsPerPage=${hits}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  let response: Response;
  try {
    response = await fetchImpl(url, { method: 'GET', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  const httpStatus = response.status;
  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`Hacker News (Algolia) returned ${httpStatus}: ${rawText.slice(0, 400)}`);
  }

  const data = JSON.parse(rawText) as {
    hits?: Array<{
      objectID?: string;
      title?: string;
      url?: string;
      author?: string;
      points?: number;
      num_comments?: number;
      created_at?: string;
    }>;
  };

  const results: HackerNewsResult[] = (data.hits ?? []).map(h => ({
    objectId: h.objectID ?? '',
    title: h.title ?? '',
    url: h.url ?? '',
    hnUrl: h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : '',
    author: h.author ?? '',
    points: h.points ?? 0,
    numComments: h.num_comments ?? 0,
    createdAt: h.created_at ?? '',
  })).filter(r => r.objectId && r.title);

  return { query: opts.query, results, responseBytes: Buffer.byteLength(rawText, 'utf8'), httpStatus };
}
