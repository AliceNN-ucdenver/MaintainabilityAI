/**
 * uspto-client — query PatentsView's REST API for granted patents.
 *
 *   POST https://search.patentsview.org/api/v1/patent/
 *   Headers: X-Api-Key: <USPTO_API_KEY>
 *   Body:    { q: { ... }, f: [...], o: { size, page } }
 *
 * PatentsView requires an API key as of mid-2024 (https://patentsview.org/apis/keyrequest).
 * Set USPTO_API_KEY as a repo secret. When the key is absent, callers
 * should skip the uspto search rather than fail the run — this client
 * fails fast on missing key so the caller can detect + branch.
 *
 * The runner's archeologist orchestrator emits a node_error envelope
 * (informational) when uspto is skipped, so reviewers can see the
 * coverage gap in the audit log.
 */

export interface UsptoResult {
  patentNumber: string;
  title: string;
  /** Best abstract / first claim summary the API returns. */
  abstract: string;
  url: string;              // https://patents.google.com/patent/US<number>
  grantedAt: string;        // ISO date
  inventors: string[];      // First-named etc.; capped to keep payload sane.
}

export interface UsptoSearchOpts {
  apiKey: string;
  query: string;            // free text — split on AND in the caller if needed
  maxResults?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  endpoint?: string;
}

export interface UsptoSearchResult {
  query: string;
  results: UsptoResult[];
  responseBytes: number;
  httpStatus: number;
}

const DEFAULT_ENDPOINT = 'https://search.patentsview.org/api/v1/patent/';

export async function usptoSearch(opts: UsptoSearchOpts): Promise<UsptoSearchResult> {
  if (!opts.apiKey) {
    throw new Error('USPTO_API_KEY missing — request one at https://patentsview.org/apis/keyrequest');
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
  const size = Math.min(Math.max(1, opts.maxResults ?? 5), 20);

  // PatentsView's query language: `q` accepts a JSON DSL. For simple AND-joined
  // free-text searches, we use the text-match operator across patent_title +
  // patent_abstract. Brief.patent queries are already AND-joined per the prompt.
  const terms = opts.query.split(/\s+AND\s+/i).map(s => s.trim()).filter(Boolean);
  const q = terms.length === 0
    ? { _text_any: { patent_title: opts.query, patent_abstract: opts.query } }
    : { _and: terms.map(t => ({ _text_any: { patent_title: t, patent_abstract: t } })) };

  const body = JSON.stringify({
    q,
    f: ['patent_id', 'patent_title', 'patent_abstract', 'patent_date', 'inventors'],
    o: { size },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Api-Key': opts.apiKey,
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const httpStatus = response.status;
  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`PatentsView returned ${httpStatus}: ${rawText.slice(0, 400)}`);
  }

  const data = JSON.parse(rawText) as {
    patents?: Array<{
      patent_id?: string;
      patent_title?: string;
      patent_abstract?: string;
      patent_date?: string;
      inventors?: Array<{ inventor_name_first?: string; inventor_name_last?: string }>;
    }>;
  };

  const results: UsptoResult[] = (data.patents ?? []).map(p => ({
    patentNumber: p.patent_id ?? '',
    title: p.patent_title ?? '',
    abstract: p.patent_abstract ?? '',
    url: p.patent_id ? `https://patents.google.com/patent/US${p.patent_id}` : '',
    grantedAt: p.patent_date ?? '',
    inventors: (p.inventors ?? [])
      .map(i => `${i.inventor_name_first ?? ''} ${i.inventor_name_last ?? ''}`.trim())
      .filter(s => s.length > 0)
      .slice(0, 8),
  })).filter(r => r.patentNumber.length > 0);

  return { query: opts.query, results, responseBytes: Buffer.byteLength(rawText, 'utf8'), httpStatus };
}
