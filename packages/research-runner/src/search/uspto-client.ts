/**
 * uspto-client — query USPTO's Open Data Portal for patents related to the
 * research topic, then enrich each hit with its abstract by following the
 * grant / pre-grant publication XML URI.
 *
 * Two-stage pipeline (mirrors the NCMS archeologist_agent.py reference at
 * github.com/AliceNN-ucdenver/ncms/.../archeologist_agent.py#L810):
 *
 *   1. GET https://api.uspto.gov/api/v1/patent/applications/search
 *      ?q=<urlencoded-AND-joined-terms>&limit=<n>&offset=0
 *      Headers: X-API-Key: <USPTO_API_KEY>, Accept: application/json
 *      Returns { patentFileWrapperDataBag: [{ applicationMetaData, grantDocumentMetaData, pgpubDocumentMetaData, ... }] }
 *
 *   2. For each hit, follow `grantDocumentMetaData.fileLocationURI` (or
 *      `pgpubDocumentMetaData.fileLocationURI` as fallback) and parse the
 *      <abstract> element out of the XML. Stage 2 is best-effort —
 *      a missing/failed abstract just leaves abstract: '' on the result
 *      and the synthesis prompt falls back on the title alone.
 *
 * Migrated from the deprecated PatentsView v1 endpoint
 * (https://search.patentsview.org/api/v1/patent/) — USPTO has consolidated
 * onto the Open Data Portal at api.uspto.gov. The PatentsView endpoint may
 * still respond intermittently but is no longer the recommended path.
 *
 * Get a key at https://data.uspto.gov/apis/getting-started (USPTO ODP).
 */

export interface UsptoResult {
  patentNumber: string;
  title: string;
  /** Best abstract / first claim summary, fetched in stage 2. Empty when stage 2 fails. */
  abstract: string;
  url: string;              // https://patents.google.com/patent/US<number>
  grantedAt: string;        // ISO date (grantDate or filingDate)
  inventors: string[];      // First-named etc.; capped to keep payload sane.
}

export interface UsptoSearchOpts {
  apiKey: string;
  query: string;            // free text — AND-joined in the caller if needed
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

const DEFAULT_ENDPOINT = 'https://api.uspto.gov/api/v1/patent/applications/search';

interface ApplicationMetaData {
  inventionTitle?: string;
  filingDate?: string;
  effectiveFilingDate?: string;
  grantDate?: string;
  patentNumber?: string;
  earliestPublicationNumber?: string;
  firstInventorName?: string;
  firstApplicantName?: string;
}
interface XmlDocumentMetaData { fileLocationURI?: string; }
interface PatentFileWrapper {
  applicationMetaData?: ApplicationMetaData;
  grantDocumentMetaData?: XmlDocumentMetaData;
  pgpubDocumentMetaData?: XmlDocumentMetaData;
}

export async function usptoSearch(opts: UsptoSearchOpts): Promise<UsptoSearchResult> {
  if (!opts.apiKey) {
    throw new Error('USPTO_API_KEY missing — request one at https://data.uspto.gov/apis/getting-started');
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
  const size = Math.min(Math.max(1, opts.maxResults ?? 5), 20);

  // The api.uspto.gov endpoint takes free-text queries with AND operators
  // directly in the q= param (URL-encoded). No JSON DSL.
  const url = `${endpoint}?q=${encodeURIComponent(opts.query)}&limit=${size}&offset=0`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': opts.apiKey,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const httpStatus = response.status;
  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`USPTO ODP returned ${httpStatus}: ${rawText.slice(0, 400)}`);
  }

  const data = JSON.parse(rawText) as { patentFileWrapperDataBag?: PatentFileWrapper[] };
  const records = data.patentFileWrapperDataBag ?? [];

  // Stage 1: shape each record into a UsptoResult (abstract still empty).
  interface InternalResult extends UsptoResult { _xmlUri: string; }
  const stage1: InternalResult[] = records.map(r => {
    const meta = r.applicationMetaData ?? {};
    const xmlUri = r.grantDocumentMetaData?.fileLocationURI
                || r.pgpubDocumentMetaData?.fileLocationURI
                || '';
    const num = meta.patentNumber || meta.earliestPublicationNumber || '';
    return {
      patentNumber: num,
      title: meta.inventionTitle ?? '',
      abstract: '',
      url: num ? `https://patents.google.com/patent/US${num}` : '',
      grantedAt: meta.grantDate || meta.filingDate || meta.effectiveFilingDate || '',
      inventors: meta.firstInventorName ? [meta.firstInventorName] : [],
      _xmlUri: xmlUri,
    };
  });

  // Stage 2: parallel best-effort abstract fetch. The full-text XML carries
  // the <abstract> element; we regex it out rather than parsing the whole
  // document (the XML is large and we only want the abstract).
  await Promise.all(stage1.map(async (r) => {
    if (!r._xmlUri) { return; }
    try {
      const xmlRes = await fetchImpl(r._xmlUri, {
        method: 'GET',
        headers: { 'X-API-Key': opts.apiKey, accept: 'application/xml' },
      });
      if (!xmlRes.ok) { return; }
      const xml = await xmlRes.text();
      const m = xml.match(/<abstract[^>]*>([\s\S]*?)<\/abstract>/i);
      if (m) {
        const stripped = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        r.abstract = stripped.slice(0, 1000);
      }
    } catch { /* ignore — best-effort */ }
  }));

  // Drop the internal _xmlUri marker before returning.
  const results: UsptoResult[] = stage1.map(({ _xmlUri: _ignored, ...rest }) => rest);

  return {
    query: opts.query,
    results,
    responseBytes: rawText.length,
    httpStatus,
  };
}
