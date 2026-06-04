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
  /** Self-post body for Show HN / Ask HN; empty for URL submissions. */
  storyText: string;
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
      story_text?: string;
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
    // Algolia returns the self-post body for Show HN / Ask HN. URL-only
    // submissions have this empty. Strip basic HTML tags so the excerpt
    // is readable in the issue comment.
    storyText: stripBasicHtml(h.story_text ?? '').slice(0, 2000),
  })).filter(r => r.objectId && r.title);

  return { query: opts.query, results, responseBytes: Buffer.byteLength(rawText, 'utf8'), httpStatus };
}

/**
 * HN Algolia returns Show HN / Ask HN bodies with light HTML
 * (`<p>`, `<i>`, etc.). Strip tags + decode the common entities so
 * the excerpt blockquote in the issue body reads cleanly. No need for
 * a full HTML parser — these posts are plain text with a sprinkle of
 * inline tags.
 */
function stripBasicHtml(s: string): string {
  return s
    .replace(/<\/?(?:p|br|i|b|em|strong|code|pre|a|ul|ol|li)[^>]*>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    // &amp; MUST be unescaped LAST: doing it first turns `&amp;lt;` into `&lt;`,
    // which the &lt; pass would then double-unescape to `<` (CodeQL js/double-escaping).
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
