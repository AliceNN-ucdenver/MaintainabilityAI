/**
 * dedupe_and_rank — pure node.
 *
 * Inputs: the raw flat list of Tavily results (each tagged with the query
 * it came from).
 *
 * Behaviour:
 *   1. Canonicalize URLs (lowercase host, strip default port, drop fragment,
 *      drop trailing slash, drop common tracking query params).
 *   2. Collapse duplicates by canonical URL — keep the highest-scoring
 *      occurrence's title/excerpt, sum the Tavily relevance scores,
 *      multiply by a small recall boost (1 + 0.15 × extra occurrences).
 *   3. Sort desc by composite score, take the top N (default 20).
 *   4. Assign sequential S1, S2, … ids — the canonical citation tokens the
 *      synthesis prompt references.
 */
import type { TavilyResult } from '../../search/tavily-client';
import type { RankedSource } from '../../schemas';

export interface DedupeAndRankOpts {
  /** Flattened Tavily results across all queries; each carries `fromQuery`. */
  allResults: Array<TavilyResult & { fromQuery: string }>;
  /** Cap on returned sources. Default 20. */
  topN?: number;
  /** ISO timestamp to stamp on every RankedSource. Defaults to now(). */
  retrievedAt?: string;
}

interface Aggregated {
  canonicalUrl: string;
  /** Best display URL we saw (often the same as canonical, but preserves scheme + casing where it matters). */
  displayUrl: string;
  title: string;
  excerpt: string;
  publishedAt?: string;
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

/** RFC 3986-flavored canonicalization tuned for dedupe across query results. */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    // Lowercase the host
    u.hostname = u.hostname.toLowerCase();
    // Strip default ports
    if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) {
      u.port = '';
    }
    // Drop tracking params, preserve content-bearing ones
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) { u.searchParams.delete(key); }
    }
    // Drop the fragment (#anchor)
    u.hash = '';
    // Drop the trailing slash on the path (but never an empty path)
    let pathname = u.pathname.replace(/\/+$/, '');
    if (pathname === '') { pathname = '/'; }
    u.pathname = pathname;
    return u.toString();
  } catch {
    // If URL parsing fails, fall back to the raw string lowercased.
    return rawUrl.trim().toLowerCase();
  }
}

export function dedupeAndRank(opts: DedupeAndRankOpts): RankedSource[] {
  const topN = opts.topN ?? 20;
  const retrievedAt = opts.retrievedAt ?? new Date().toISOString();

  const bucket = new Map<string, Aggregated>();

  for (const r of opts.allResults) {
    if (!r.url) { continue; }
    const canonical = canonicalizeUrl(r.url);
    const existing = bucket.get(canonical);
    if (existing) {
      existing.scoreSum += r.score;
      existing.occurrences += 1;
      existing.queries.add(r.fromQuery);
      // Keep the highest-scoring occurrence's title/excerpt for display.
      if (r.score > existing.scoreSum / existing.occurrences) {
        existing.title = r.title || existing.title;
        existing.excerpt = r.content || existing.excerpt;
      }
      if (!existing.publishedAt && r.publishedDate) {
        existing.publishedAt = r.publishedDate;
      }
    } else {
      bucket.set(canonical, {
        canonicalUrl: canonical,
        displayUrl: r.url,
        title: r.title || canonical,
        excerpt: (r.content || '').slice(0, 500),
        publishedAt: r.publishedDate,
        scoreSum: r.score,
        occurrences: 1,
        queries: new Set([r.fromQuery]),
      });
    }
  }

  // Composite score: sum-of-relevance × recall-boost. Recall-boost = 1 + 0.15
  // per extra query that surfaced this source (so a result that hit 3 of 5
  // queries gets boosted ~1.3×). Clamp to [0, 1] for the RankedSource schema.
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
    provider: 'tavily',
    title: entry.aggregated.title.slice(0, 300),
    // Use the canonical (deduped) URL on output — strips tracking params and
    // normalises case so the published research doc cites a stable URL.
    url: entry.aggregated.canonicalUrl,
    retrieved_at: retrievedAt,
    salience_score: roundTo(entry.composite, 4),
    excerpt: entry.aggregated.excerpt.slice(0, 500),
    ...(entry.aggregated.publishedAt ? { published_at: entry.aggregated.publishedAt } : {}),
  }));
}

function roundTo(n: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}
