/**
 * dedupe_and_rank — pure node.
 *
 * Inputs: the flat list of ProviderResult from every search node
 * (tavily, arxiv, uspto, hackernews — any combination).
 *
 * Behaviour:
 *   1. Canonicalize URLs (lowercase host, strip default port, drop fragment,
 *      drop trailing slash, drop common tracking query params).
 *   2. Collapse duplicates by canonical URL — keep the highest-scoring
 *      occurrence's title/excerpt, sum scores, multiply by a small recall
 *      boost (1 + 0.15 × extra queries that surfaced the same source).
 *   3. Sort desc by composite score, take top N (default 20).
 *   4. Assign sequential S1, S2, … ids — the canonical citation tokens the
 *      synthesis prompt references. Preserves provider, authors, and
 *      publication date through to the published doc.
 */
import type { ProviderResult } from '../../search/provider-result';
import type { RankedSource, SearchProvider } from '../../schemas';

export interface DedupeAndRankOpts {
  /** Flat ProviderResult list across all providers. */
  results: ProviderResult[];
  topN?: number;
  retrievedAt?: string;
}

interface Aggregated {
  canonicalUrl: string;
  provider: SearchProvider;
  title: string;
  excerpt: string;
  publishedAt?: string;
  authors?: string[];
  /** Sum of relevance scores across all occurrences. */
  scoreSum: number;
  occurrences: number;
  /** Queries that surfaced this source. */
  queries: Set<string>;
}

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'mc_cid', 'mc_eid', 'ref', 'ref_src', 'ref_url',
]);

export function canonicalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    u.hostname = u.hostname.toLowerCase();
    if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
      u.port = '';
    }
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) { u.searchParams.delete(key); }
    }
    u.hash = '';
    let pathname = u.pathname.replace(/\/+$/, '');
    if (pathname === '') { pathname = '/'; }
    u.pathname = pathname;
    return u.toString();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

export function dedupeAndRank(opts: DedupeAndRankOpts): RankedSource[] {
  const topN = opts.topN ?? 20;
  const retrievedAt = opts.retrievedAt ?? new Date().toISOString();

  const bucket = new Map<string, Aggregated>();
  for (const r of opts.results) {
    if (!r.url) { continue; }
    const canonical = canonicalizeUrl(r.url);
    const existing = bucket.get(canonical);
    if (existing) {
      existing.scoreSum += r.score;
      existing.occurrences += 1;
      existing.queries.add(r.fromQuery);
      // Keep the highest-scoring occurrence's title/excerpt + first non-empty published/authors
      if (r.score > existing.scoreSum / existing.occurrences) {
        existing.title = r.title || existing.title;
        if (r.content) { existing.excerpt = r.content.slice(0, 500); }
      }
      if (!existing.publishedAt && r.publishedDate) { existing.publishedAt = r.publishedDate; }
      if (!existing.authors && r.authors && r.authors.length > 0) { existing.authors = r.authors; }
    } else {
      bucket.set(canonical, {
        canonicalUrl: canonical,
        provider: r.provider,
        title: r.title || canonical,
        excerpt: (r.content || '').slice(0, 500),
        publishedAt: r.publishedDate,
        authors: r.authors,
        scoreSum: r.score,
        occurrences: 1,
        queries: new Set([r.fromQuery]),
      });
    }
  }

  const ranked = [...bucket.values()]
    .map(a => {
      const recall = 1 + 0.15 * (a.queries.size - 1);
      const composite = Math.min(1, a.scoreSum * recall / Math.max(1, a.occurrences));
      return { aggregated: a, composite };
    })
    .sort((a, b) => b.composite - a.composite)
    .slice(0, topN);

  return ranked.map((entry, i): RankedSource => ({
    id: `S${i + 1}`,
    provider: entry.aggregated.provider,
    title: entry.aggregated.title.slice(0, 300),
    url: entry.aggregated.canonicalUrl,
    retrieved_at: retrievedAt,
    salience_score: roundTo(entry.composite, 4),
    excerpt: entry.aggregated.excerpt.slice(0, 500),
    ...(entry.aggregated.publishedAt ? { published_at: entry.aggregated.publishedAt } : {}),
    ...(entry.aggregated.authors && entry.aggregated.authors.length > 0 ? { authors: entry.aggregated.authors } : {}),
  }));
}

function roundTo(n: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}
