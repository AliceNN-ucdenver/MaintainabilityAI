#!/usr/bin/env node
/**
 * verify-source-table.mjs — WHY-phase source-claim integrity check.
 *
 * Bug Z/2: the WHY audit job previously verified that conclusions cite
 * S[N] anchors, but never verified that the S[N] title + URL the doc
 * presents actually came from a real provider result in the signed audit
 * chain. The live WHY-2026-05-24-wzi0yl chain showed:
 *   - S40: doc says "The Conversation" title with a Higgs Law URL
 *   - S44: doc says Pearl Cohen title with a Sirion URL
 *   - S47/S48: doc cites HN item 30640295 as ORCID/Gowalla, but the
 *     chain preview for that URL says "Launch HN: Stock Unlock"
 * Each of those is evidence laundering: the title was swapped, the URL
 * was reassigned, or both. The agent synthesized over the source layer.
 *
 * This verifier reads:
 *   - research-doc.md → parse S[N] citations in bullet form
 *     `- **S40**: [title](url) explainer text`
 *     and References-section form
 *     `- **S40** — [title](url)` / `S40. [title](url)`
 *   - per-run audit JSONL → collect results_preview[] from skill_call
 *     events whose payload.skill ∈ search providers, plus the
 *     dedupe-and-rank output
 *
 * For each (S_num, title, url) in the doc, the verifier looks for a
 * matching preview entry. Match rule (URL is the primary identity;
 * title can be slightly summarized so we accept a normalized substring
 * relationship):
 *   - URL must match exactly after light normalization (trim trailing
 *     slash, lowercase host).
 *   - Title must either match exactly (after light normalization), or
 *     one must contain the other as a substring (token-set inclusion)
 *     so the verifier doesn't false-positive on minor title cleanup.
 *
 * Outcomes:
 *   - status=ok, mismatches=[], unmatched=[] → verdict pass
 *   - mismatches > 0 → URL was matched in chain but title disagrees
 *     (the S40/S44 pattern — evidence laundering by title swap)
 *   - unmatched > 0 → S[N] cited a URL that is not present in any
 *     audited provider result (the S47/S48 pattern — fabrication)
 *
 * Run with env: OKR_ID, RUN_ID. Writes a JSON summary to stdout for
 * the workflow to parse + label. Exit 0 always; the workflow decides
 * pass/fail from the JSON.
 *
 * Tests at: verify-source-table.test.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const SEARCH_SKILLS = new Set([
  'tavily-search',
  'arxiv-search',
  'uspto-search',
  'hackernews-search',
  'dedupe-and-rank',
]);

/**
 * Light URL normalization for compare:
 *   - lowercase host
 *   - strip trailing slash
 *   - strip fragment (#...)
 *   - strip common tracking params (utm_*)
 * Preserves path + query intentionally — the path is the identity.
 */
export function normalizeUrl(raw) {
  if (!raw || typeof raw !== 'string') { return ''; }
  let url = raw.trim();
  // strip fragment
  const hashIdx = url.indexOf('#');
  if (hashIdx >= 0) { url = url.slice(0, hashIdx); }
  // attempt parse
  try {
    const u = new URL(url);
    u.host = u.host.toLowerCase();
    // strip utm_* tracking params
    const drop = [];
    for (const k of u.searchParams.keys()) {
      if (k.toLowerCase().startsWith('utm_')) { drop.push(k); }
    }
    for (const k of drop) { u.searchParams.delete(k); }
    let out = u.toString();
    if (out.endsWith('/')) { out = out.slice(0, -1); }
    return out;
  } catch {
    // not a parseable URL — return trimmed raw for relaxed compare
    return url.replace(/\/$/, '');
  }
}

/**
 * Title normalization for compare:
 *   - lowercase
 *   - collapse whitespace
 *   - strip leading/trailing quotes
 */
export function normalizeTitle(raw) {
  if (!raw || typeof raw !== 'string') { return ''; }
  return raw
    .trim()
    .replace(/^[“"']+|[”"']+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Title fuzzy-match: exact after normalization, or one-contains-the-other
 * to tolerate light summarization (e.g. agent dropped a trailing year).
 * NOT a generic similarity — strict substring inclusion only.
 */
export function titleMatches(docTitle, chainTitle) {
  const a = normalizeTitle(docTitle);
  const b = normalizeTitle(chainTitle);
  if (!a || !b) { return false; }
  if (a === b) { return true; }
  // accept one-side inclusion ONLY when the included form is at least
  // 12 chars — prevents matching short generic titles like "Home" or
  // "Search Results" against longer real ones.
  const min = Math.min(a.length, b.length);
  if (min < 12) { return false; }
  return a.includes(b) || b.includes(a);
}

/**
 * Parse S[N] citations from research-doc.md.
 *
 * Only the SOURCE DECLARATION forms are parsed — the forms that bind an
 * S[N] anchor to a real (title, url) pair the agent claims to have read:
 *
 *   - **S40**: [title](url) explainer text   ← bullet body
 *   - **S40** — [title](url)                  ← references section
 *   - S40. [title](url)                       ← numbered refs
 *
 * Inline back-references like `[S40](#) showed ...` are deliberately NOT
 * parsed. They are pointers to the declaration, not new claims, so they
 * cannot mismatch the chain. Parsing them would create false title
 * conflicts when the back-reference text differs from the declaration's
 * title (which it almost always does).
 *
 * Returns array of { num, title, url, line }. Caller may dedupe by
 * (num, url) so a source declared once + back-referenced multiple times
 * doesn't double-count.
 */
export function parseSourceCitations(markdown) {
  const out = [];
  const lines = markdown.split('\n');
  // 1. - **S40**: [title](url)  or - **S40** — [title](url)  or - **S40** [title](url)
  const bulletRe = /^\s*[-*]\s+\*\*S(\d+)\*\*\s*[:—–\-]?\s*\[([^\]]+)\]\(([^)]+)\)/;
  // 2. S40. [title](url)
  const numberedRe = /^\s*S(\d+)\.\s*\[([^\]]+)\]\(([^)]+)\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(bulletRe);
    if (m) {
      out.push({ num: Number(m[1]), title: m[2].trim(), url: m[3].trim(), line: i + 1 });
      continue;
    }
    m = line.match(numberedRe);
    if (m) {
      out.push({ num: Number(m[1]), title: m[2].trim(), url: m[3].trim(), line: i + 1 });
    }
  }
  return out;
}

/**
 * Read the audit JSONL and collect every results_preview[] entry from
 * skill_call events whose skill is in SEARCH_SKILLS. Each preview entry
 * carries { title, url, ... }. We index by normalized URL.
 *
 * Returns Map<normalized_url, Array<{ title, url, provider, raw }>>.
 */
export function collectPreviewIndex(events) {
  const index = new Map();
  for (const e of events) {
    if (e.event_kind !== 'skill_call') { continue; }
    const p = e.payload || {};
    const skill = p.skill;
    if (!SEARCH_SKILLS.has(skill)) { continue; }
    const previews = p.results_preview || p.results || p.items || [];
    if (!Array.isArray(previews)) { continue; }
    for (const r of previews) {
      const url = r.url || r.link || r.href || '';
      const title = r.title || r.name || '';
      if (!url) { continue; }
      const key = normalizeUrl(url);
      if (!index.has(key)) { index.set(key, []); }
      index.get(key).push({ title, url, provider: skill, raw: r });
    }
  }
  return index;
}

/**
 * Verify each S[N] citation against the preview index.
 * Returns { ok, totalCited, totalUnique, mismatches: [...], unmatched: [...] }.
 */
export function verifySourceTable(markdown, events) {
  const citations = parseSourceCitations(markdown);
  // Dedupe by (num, url) so a source listed once and re-cited inline
  // doesn't fire twice.
  const seen = new Set();
  const unique = [];
  for (const c of citations) {
    const k = `${c.num}|${normalizeUrl(c.url)}`;
    if (seen.has(k)) { continue; }
    seen.add(k);
    unique.push(c);
  }

  const index = collectPreviewIndex(events);
  const mismatches = [];
  const unmatched = [];

  for (const c of unique) {
    const key = normalizeUrl(c.url);
    const matches = index.get(key);
    if (!matches || matches.length === 0) {
      unmatched.push({
        s: c.num,
        line: c.line,
        title: c.title,
        url: c.url,
        reason: 'cited URL not present in any audited provider result',
      });
      continue;
    }
    // URL is in the chain. Now check title agreement.
    const titleOk = matches.some(m => titleMatches(c.title, m.title));
    if (!titleOk) {
      mismatches.push({
        s: c.num,
        line: c.line,
        cited_title: c.title,
        cited_url: c.url,
        chain_titles: matches.map(m => m.title).slice(0, 3),
        provider: matches[0].provider,
        reason: 'URL matches a chain result but cited title disagrees with the audited title',
      });
    }
  }

  return {
    ok: mismatches.length === 0 && unmatched.length === 0,
    totalCited: citations.length,
    totalUnique: unique.length,
    mismatches,
    unmatched,
  };
}

async function main() {
  const okrId = process.env.OKR_ID;
  const runId = process.env.RUN_ID;
  const docPath = process.env.DOC_PATH || (okrId ? `okrs/${okrId}/why/research-doc.md` : '');
  const jsonlPath = process.env.JSONL_PATH || (okrId && runId ? `okrs/${okrId}/audit/events/${runId}.jsonl` : '');

  if (!docPath || !jsonlPath) {
    process.stderr.write('::error::verify-source-table requires OKR_ID + RUN_ID (or DOC_PATH + JSONL_PATH)\n');
    console.log(JSON.stringify({ ok: false, reason: 'missing-inputs' }));
    process.exit(0);
  }
  if (!fs.existsSync(docPath)) {
    console.log(JSON.stringify({ ok: false, reason: `doc-not-found: ${docPath}`, mismatches: [], unmatched: [] }));
    process.exit(0);
  }
  if (!fs.existsSync(jsonlPath)) {
    console.log(JSON.stringify({ ok: false, reason: `jsonl-not-found: ${jsonlPath}`, mismatches: [], unmatched: [] }));
    process.exit(0);
  }

  const markdown = fs.readFileSync(docPath, 'utf8');
  const events = fs.readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .filter(l => l.trim().length > 0)
    .map(l => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean);

  const result = verifySourceTable(markdown, events);
  console.log(JSON.stringify(result));
  process.exit(0);
}

const isMain = (() => {
  try { return (process.argv[1] || '').endsWith('verify-source-table.mjs'); }
  catch { return false; }
})();
if (isMain) {
  main().catch(err => {
    process.stderr.write(`::error::verify-source-table unhandled: ${err.message || err}\n`);
    console.log(JSON.stringify({ ok: false, reason: `unhandled: ${err.message || err}` }));
    process.exit(0);
  });
}
