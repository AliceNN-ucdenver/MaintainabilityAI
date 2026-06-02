/**
 * Pocket Watch v2 — deterministic anchor floor.
 *
 * The contrastive rank/margin is the primary signal; this is a cheap secondary
 * check that catches the case where embeddings stay high (prose is generally
 * topical) but the artifact dropped a HARD objective constraint — a target
 * repo/product noun, the main feature noun, or an explicit constraint like
 * "no new PII".
 *
 * Anchor coverage is NOT a standalone gate (synonyms exist); it is a floor and
 * an explanation aid. Pure + deterministic. See the design doc §"Secondary
 * deterministic anchor check".
 */

import type { OkrIntentInput } from './objective-renderer';

/** Tokens that are never anchors: stop words, generic AI/SDLC vocabulary, and
 *  units that carry no mission signal. Lower-cased. */
const STOP = new Set<string>([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'with', 'without', 'by', 'on',
  'in', 'into', 'its', 'their', 'new', 'existing', 'using', 'use', 'reuse', 'reusing',
  'enable', 'add', 'adding', 'build', 'ship', 'support', 'provide', 'return',
  'system', 'service', 'api', 'app', 'application', 'feature', 'endpoint', 'data',
  'ai', 'ml', 'model', 'agent', 'okr', 'phase', 'risk', 'collection',
  'introducing', 'introduce', 'each', 'every', 'this', 'that', 'these', 'those',
]);

const YEAR_RE = /^(19|20)\d{2}$/;

/** Constraint nouns we treat as IMPORTANT anchors when present in the objective. */
const CONSTRAINT_TERMS = ['pii', 'fairness', 'bias', 'privacy', 'security', 'latency', 'accessibility'];

export interface AnchorSet {
  /** Must appear: target repo/product nouns + the main feature noun. */
  critical: string[];
  /** Should appear: explicit constraints + key-result nouns. */
  important: string[];
}

function repoBasename(url: string): string {
  return url.split('/').filter(Boolean).pop() ?? url;
}

/** Salient multi-letter word tokens from a string (lower-cased, de-stopped). */
function contentTokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [])
    .filter(t => !STOP.has(t) && !YEAR_RE.test(t));
}

/**
 * Extract critical + important anchors from an OKR card. Deterministic:
 * de-duplicated, lower-cased, sorted.
 */
export function extractAnchors(card: OkrIntentInput): AnchorSet {
  const critical = new Set<string>();
  const important = new Set<string>();

  // Critical: target repo / product nouns.
  for (const url of card.objectiveAlignment?.targetCodeRepos ?? []) {
    const base = repoBasename(url).toLowerCase().trim();
    if (base && base !== '<org>') { critical.add(base); }
  }

  // Critical: the main feature noun — the most salient content token of the
  // objective (first non-stop token of the description/name).
  const objText = (card.objective?.description ?? card.objective?.name ?? '');
  const objTokens = contentTokens(objText);
  // Feature noun = the longest SINGLE-WORD content token. Hyphenated compounds
  // (e.g. "recommendation-bias") are usually risk/constraint phrases, not the
  // feature — and matching them as substrings is brittle — so prefer a bare
  // word ("recommendations"), falling back to the longest token only if none.
  const singleWord = objTokens.filter(t => !t.includes('-'));
  const pool = singleWord.length ? singleWord : objTokens;
  const feature = pool.slice().sort((a, b) => b.length - a.length)[0];
  if (feature) { critical.add(feature); }

  // Important: explicit constraints named in the objective.
  const objLower = objText.toLowerCase();
  for (const c of CONSTRAINT_TERMS) {
    if (objLower.includes(c)) { important.add(c); }
  }

  // Important: key-result nouns (salient tokens from each KR).
  for (const kr of card.keyResults ?? []) {
    for (const t of contentTokens(kr.metric ?? kr.description ?? kr.name ?? '').slice(0, 2)) {
      important.add(t);
    }
  }

  // Don't let a term be both critical and important.
  for (const c of critical) { important.delete(c); }

  return {
    critical: [...critical].sort(),
    important: [...important].sort(),
  };
}

export interface AnchorCoverage {
  critical_total: number;
  critical_present: number;
  important_total: number;
  important_present: number;
  /** Anchors (critical + important) absent from the scope text. */
  missing: string[];
  /** Critical anchors absent — the floor-breach signal. */
  missing_critical: string[];
}

/** Case-insensitive presence: the anchor appears as a substring of the scope
 *  (so `movie-api` matches and `recommendation` matches `recommendations`). */
function present(anchor: string, scopeLower: string): boolean {
  return scopeLower.includes(anchor.toLowerCase());
}

/** Score anchor coverage of a phase scope text. Deterministic. */
export function anchorCoverage(anchors: AnchorSet, scopeText: string): AnchorCoverage {
  const scopeLower = scopeText.toLowerCase();
  const missing: string[] = [];
  const missingCritical: string[] = [];
  let criticalPresent = 0;
  let importantPresent = 0;
  for (const a of anchors.critical) {
    if (present(a, scopeLower)) { criticalPresent++; } else { missing.push(a); missingCritical.push(a); }
  }
  for (const a of anchors.important) {
    if (present(a, scopeLower)) { importantPresent++; } else { missing.push(a); }
  }
  return {
    critical_total: anchors.critical.length,
    critical_present: criticalPresent,
    important_total: anchors.important.length,
    important_present: importantPresent,
    missing,
    missing_critical: missingCritical,
  };
}
