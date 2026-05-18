/**
 * synthesis-archaeology-validator — structural validator for the
 * archaeology-path synthesis body.
 *
 * Mirrors synthesis-validator's shape (ValidationReport with citation_stats)
 * but enforces the 9 canonical sections from
 * `.caterpillar/prompts/research/synthesis-archaeology.md`:
 *
 *   1. Executive Summary
 *   2. Repository Profile
 *   3. Current Architecture
 *   4. Gap Analysis            (G[N] entries with severity)
 *   5. External Research Findings
 *   6. Recommendations         (each cites ≥1 G[N] AND ≥1 grounding token)
 *   7. Implementation Roadmap
 *   8. Risk Factors
 *   9. Untraced items          (REQUIRED — may say "None.")
 */
import type { CitationStats, ValidationReport } from './synthesis-validator';

export const CANONICAL_ARCHAEOLOGY_SECTIONS = [
  'Executive Summary',
  'Repository Profile',
  'Current Architecture',
  'Gap Analysis',
  'External Research Findings',
  'Recommendations',
  'Implementation Roadmap',
  'Risk Factors',
  'Untraced items',
] as const;

export type CanonicalArchaeologySection = typeof CANONICAL_ARCHAEOLOGY_SECTIONS[number];

export function validateArchaeologySynthesis(body: string): ValidationReport {
  const errors: string[] = [];
  const sectionsFound = extractH2Sections(body);

  // Sections present in canonical order
  for (let i = 0; i < CANONICAL_ARCHAEOLOGY_SECTIONS.length; i++) {
    const expected = CANONICAL_ARCHAEOLOGY_SECTIONS[i];
    if (sectionsFound[i] !== expected) {
      errors.push(
        `Section #${i + 1} expected "## ${expected}" but found ${sectionsFound[i] ? `"## ${sectionsFound[i]}"` : '(missing)'}.`,
      );
    }
  }

  // Gap Analysis: at least one G[N] entry with severity
  const gapBlock = extractSection(body, 'Gap Analysis');
  const gapEntries = splitOnGapMarkers(gapBlock);
  const gapIds = gapEntries.map(g => g.id);
  for (const g of gapEntries) {
    // `\b\*\*` fails between space and `*` (both non-word) — drop the boundary
    // before `**` and require the inner word boundary instead.
    if (!/\bSEVERITY\s*[:=]\s*(HIGH|MEDIUM|LOW)\b|\*\*(HIGH|MEDIUM|LOW)\*\*/i.test(g.body)) {
      errors.push(`Gap G${g.id} is missing a severity tag (HIGH / MEDIUM / LOW).`);
    }
  }
  if (gapEntries.length === 0 && sectionsFound.includes('Gap Analysis')) {
    errors.push('Gap Analysis section has no `G[N]` entries.');
  }

  // Recommendations: each cites ≥1 G[N]
  const recsBlock = extractSection(body, 'Recommendations');
  const recLines = recsBlock.split('\n').filter(l => /^\s*(?:[-*]|\d+\.)\s+/.test(l));
  let untracedRecommendations = 0;
  for (const rec of recLines) {
    if (!/\bG\d+\b/.test(rec)) { untracedRecommendations += 1; }
  }
  if (recLines.length > 0 && untracedRecommendations === recLines.length) {
    errors.push(`All ${recLines.length} Recommendation(s) lack G[N] traceability.`);
  } else if (untracedRecommendations > 0) {
    errors.push(`${untracedRecommendations} of ${recLines.length} Recommendation(s) lack G[N] traceability.`);
  }

  // Untraced items REQUIRED — even if empty (must say "None." or similar)
  const untracedBlock = extractSection(body, 'Untraced items').trim();
  if (untracedBlock.length === 0) {
    errors.push('Untraced items section is empty — must explicitly say "None." when there are none.');
  }

  // Citation stats
  // For archaeology, source_count = unique S[N] across External Research Findings + Risk Factors.
  // The synthesis prompt also asks the LLM to cite OA[<file>] / OA[<module>] in narrative
  // sections; we don't try to enforce those at the validator level (heuristic untraced count
  // would be too noisy across short body paragraphs).
  const sourceCitations = new Set([...body.matchAll(/\bS(\d+)\b/g)].map(m => m[1]));
  const citation_stats: CitationStats = {
    source_count: sourceCitations.size,
    conclusion_count: 0,                 // archaeology synthesis doesn't have C[N]
    recommendation_count: recLines.length,
    underCitedConclusions: 0,
    untracedRecommendations,
    untraced_claims: 0,
  };

  return {
    valid: errors.length === 0,
    errors,
    sectionsFound,
    citation_stats,
    // Expose archaeology-specific data for the orchestrator's audit + Hatter's Tag
    ...(gapIds.length > 0 ? { archaeology: { gap_count: gapIds.length } as unknown as never } : {}),
  };
}

// ============================================================================
// Helpers (copy of the research-side helpers — kept local to avoid coupling)
// ============================================================================

function extractH2Sections(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) { out.push(m[1].trim()); }
  }
  return out;
}

function extractSection(body: string, sectionName: string): string {
  const lines = body.split('\n');
  let inSection = false;
  const collected: string[] = [];
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (h2[1].trim() === sectionName) { inSection = true; continue; }
      if (inSection) { break; }
    }
    if (inSection) { collected.push(line); }
  }
  return collected.join('\n');
}

interface GapEntry { id: string; body: string }

function splitOnGapMarkers(block: string): GapEntry[] {
  const markerRe = /^\s*(?:\*\*G(\d+)\*\*|###\s+G(\d+))(?=\s|$)/;
  const lines = block.split('\n');
  const entries: Array<{ id: string; body: string[] }> = [];
  for (const line of lines) {
    const m = line.match(markerRe);
    if (m) {
      entries.push({ id: m[1] ?? m[2], body: [line] });
    } else if (entries.length > 0) {
      entries[entries.length - 1].body.push(line);
    }
  }
  return entries.map(e => ({ id: e.id, body: e.body.join('\n') }));
}
