/**
 * search audit preview — the bounded `results_preview` builder shared by the
 * search-skill handlers (`runner/skills.ts`) and the Oracle guardrail envelope
 * (`runner/guardrails/envelope.ts`). The envelope rebuilds the preview from the
 * post-screen SAFE subset on quarantine, so an unsafe URL or injection snippet
 * never survives as trusted audit preview in the signed chain.
 *
 * Bug-Q phase 3 (Codex audit follow-up / oracle evidence) — search audit
 * metadata carries a bounded preview of WHICH results came back, not just HOW
 * MANY. Without this, a reviewer who wants to verify "S-3 cites a real arXiv
 * paper, not a hallucinated one" has nothing in the chain to verify against —
 * they'd have to trust the agent's research-doc citations and re-run the search.
 *
 * Preview shape per hit: { provider, query, title, url, snippet?, score?,
 *   publishedDate? } where:
 *   - snippet is truncated to ~200 chars (the ProviderResult.content field
 *     already caps at ~500; we shorten further for chain size)
 *   - score is rounded to 2 decimals
 *
 * Total preview cap: 25 hits per skill_call. Search runs typically return 10-30
 * results per provider before dedupe; the cap keeps the audit JSONL compact
 * while still proving "real evidence behind every citation."
 */
const SEARCH_RESULTS_PREVIEW_CAP = 25;
const SEARCH_SNIPPET_CAP = 200;

export interface SearchResultPreview {
  provider: string;
  query: string;
  title: string;
  url: string;
  snippet?: string;
  score?: number;
  publishedDate?: string;
}

export function buildSearchAuditMetadata(
  queries: string[],
  results: Array<{ provider: string; fromQuery: string; title: string; url: string; content: string; score: number; publishedDate?: string }>,
): { queries: string[]; result_count: number; results_preview: SearchResultPreview[] } {
  const preview = results.slice(0, SEARCH_RESULTS_PREVIEW_CAP).map((r): SearchResultPreview => {
    const snippet = (r.content || '').replace(/\s+/g, ' ').trim();
    const truncated = snippet.length > SEARCH_SNIPPET_CAP
      ? snippet.slice(0, SEARCH_SNIPPET_CAP) + '…'
      : snippet;
    const entry: SearchResultPreview = {
      provider: r.provider,
      query: r.fromQuery,
      title: r.title,
      url: r.url,
    };
    if (truncated) { entry.snippet = truncated; }
    if (typeof r.score === 'number' && isFinite(r.score)) {
      entry.score = Math.round(r.score * 100) / 100;
    }
    if (r.publishedDate) { entry.publishedDate = r.publishedDate; }
    return entry;
  });
  return { queries, result_count: results.length, results_preview: preview };
}
