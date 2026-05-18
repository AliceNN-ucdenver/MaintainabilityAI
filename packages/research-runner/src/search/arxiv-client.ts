/**
 * arxiv-client — query the arXiv Atom API.
 *
 *   GET http://export.arxiv.org/api/query?search_query=<q>&max_results=N
 *
 * No auth required (arXiv rate-limits by IP — be polite, run queries
 * sequentially or with small parallelism). Response is Atom XML.
 *
 * We parse with a tiny purpose-built reader instead of pulling in an XML
 * dependency. The arXiv schema is stable and the fields we need (title,
 * summary, id/url, published, authors) are well-known.
 */

export interface ArxivResult {
  id: string;              // arXiv id like "2401.12345"
  title: string;
  summary: string;
  abstractUrl: string;     // https://arxiv.org/abs/<id>
  published: string;       // ISO date
  authors: string[];
}

export interface ArxivSearchOpts {
  query: string;
  /** 1..30. arXiv accepts more but 5 is a sensible default for research. */
  maxResults?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Override base URL for tests. */
  endpoint?: string;
}

export interface ArxivSearchResult {
  query: string;
  results: ArxivResult[];
  responseBytes: number;
  httpStatus: number;
}

const DEFAULT_ENDPOINT = 'http://export.arxiv.org/api/query';

export async function arxivSearch(opts: ArxivSearchOpts): Promise<ArxivSearchResult> {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
  const max = Math.min(Math.max(1, opts.maxResults ?? 5), 30);

  // arXiv wants `search_query` like `all:"agentic planning"` for phrase searches;
  // we URL-encode the query and prefix with `all:` so the search hits any field.
  const searchQuery = `all:${opts.query}`;
  const url = `${endpoint}?search_query=${encodeURIComponent(searchQuery)}&max_results=${max}&sortBy=relevance`;

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
    throw new Error(`arXiv returned ${httpStatus}: ${rawText.slice(0, 400)}`);
  }

  return {
    query: opts.query,
    results: parseArxivAtom(rawText),
    responseBytes: Buffer.byteLength(rawText, 'utf8'),
    httpStatus,
  };
}

/**
 * Tiny Atom-XML reader for arXiv responses. Tolerant of CDATA + whitespace.
 * Returns a normalised ArxivResult per `<entry>` element.
 */
export function parseArxivAtom(xml: string): ArxivResult[] {
  const entries = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/g)].map(m => m[0]);
  const results: ArxivResult[] = [];
  for (const entry of entries) {
    const id = extractFirst(entry, /<id>([\s\S]*?)<\/id>/);
    const title = textOf(extractFirst(entry, /<title>([\s\S]*?)<\/title>/));
    const summary = textOf(extractFirst(entry, /<summary>([\s\S]*?)<\/summary>/));
    const published = extractFirst(entry, /<published>([\s\S]*?)<\/published>/);
    const authors = [...entry.matchAll(/<author[^>]*>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g)]
      .map(m => textOf(m[1]));

    // arXiv ids look like "http://arxiv.org/abs/2401.12345v1" — strip version + scheme
    const cleanId = id.replace(/^https?:\/\/arxiv\.org\/abs\//, '').replace(/v\d+$/, '');
    const abstractUrl = `https://arxiv.org/abs/${cleanId}`;

    if (cleanId && title) {
      results.push({
        id: cleanId,
        title,
        summary,
        abstractUrl,
        published: published || '',
        authors,
      });
    }
  }
  return results;
}

function extractFirst(haystack: string, re: RegExp): string {
  const m = haystack.match(re);
  return m ? m[1].trim() : '';
}

/** Collapse whitespace + strip CDATA wrappers. */
function textOf(raw: string): string {
  return raw
    .replace(/^\s*<!\[CDATA\[/, '')
    .replace(/\]\]>\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
