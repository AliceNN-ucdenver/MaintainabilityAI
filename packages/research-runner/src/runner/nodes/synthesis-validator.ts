/**
 * synthesis-validator — pure structural validator for the markdown body
 * produced by synthesize_report.
 *
 * Enforces the canonical 10-section structure defined in
 * `.caterpillar/prompts/research/synthesis.md`. Returns a ValidationReport
 * (pass/fail + reasons + per-section citation stats) the caller uses to:
 *   - decide whether to retry the LLM with feedback
 *   - populate ResearchDoc.citation_stats in the audit log
 *
 * Deliberately conservative: only checks structural rules the prompt was
 * explicit about. Semantic checks (does this conclusion actually follow
 * from its sources?) are left to the expert review nodes in the PRD phase.
 */

/** Sections required in this exact order. Drift fails validation. */
export const CANONICAL_SECTIONS = [
  'Source Premises',
  'Executive Summary',
  'Cross-Source Analysis',
  'Evidence Gaps',
  'Jobs-to-be-Done Analysis',
  'Patent Landscape',
  'Whitespace Analysis',
  'Formal Conclusions',
  'Recommendations',
  'References',
] as const;

export type CanonicalSection = typeof CANONICAL_SECTIONS[number];

export interface CitationStats {
  source_count: number;
  conclusion_count: number;
  recommendation_count: number;
  /** Conclusions with a confidence rating but fewer than 2 source citations (1 ok for LOW). */
  underCitedConclusions: number;
  /** Recommendations missing a `C[N]` reference. */
  untracedRecommendations: number;
  /** Top-level claims (sentences) in narrative sections with no `S[N]` citation. Heuristic. */
  untraced_claims: number;
}

export interface ValidationReport {
  valid: boolean;
  /** Human-readable errors — fed back to the LLM on retry. */
  errors: string[];
  /** Sections found (in body order). */
  sectionsFound: string[];
  citation_stats: CitationStats;
}

/**
 * Parse + validate a synthesised research-doc markdown body.
 *
 * Validation rules (each contributes one error string when violated):
 *   1. Every CANONICAL_SECTION must appear as an H2.
 *   2. The H2 sections must appear in CANONICAL order (no shuffling).
 *   3. `Source Premises` must contain at least 1 `**S[N]**` entry.
 *   4. Every `Formal Conclusion` (a `**C[N]**` line) must:
 *      - carry a confidence label `**HIGH**` / `**MEDIUM**` / `**LOW**`,
 *      - cite ≥2 `S[N]` (≥1 permitted only when confidence is `LOW`).
 *   5. Every `Recommendation` line must reference at least one `C[N]`.
 *
 * Returns a ValidationReport with `valid: true` when no rule fails.
 */
export function validateSynthesis(body: string): ValidationReport {
  const errors: string[] = [];
  const sectionsFound = extractH2Sections(body);

  // Rule 1 + 2 combined: sections must be present in canonical order
  for (let i = 0; i < CANONICAL_SECTIONS.length; i++) {
    const expected = CANONICAL_SECTIONS[i];
    if (sectionsFound[i] !== expected) {
      errors.push(
        `Section #${i + 1} expected "## ${expected}" but found ${sectionsFound[i] ? `"## ${sectionsFound[i]}"` : '(missing)'}.`,
      );
      // One error per slot is enough — keep going so we report all drift in one shot.
    }
  }

  // Rule 3: Source Premises has ≥1 entry
  const sourceBlock = extractSection(body, 'Source Premises');
  const sourceIds = [...sourceBlock.matchAll(/\*\*S(\d+)\*\*/g)].map(m => parseInt(m[1], 10));
  const source_count = new Set(sourceIds).size;
  if (source_count === 0) {
    errors.push('Source Premises has no `**S[N]**` entries.');
  }

  // Rule 4: Formal Conclusions.
  // Split the block on each `**C[N]**` (or `### C[N]`) marker — gives us one
  // chunk per conclusion containing the statement + confidence + citations.
  const conclusionsBlock = extractSection(body, 'Formal Conclusions');
  const conclusionChunks = splitOnConclusionMarkers(conclusionsBlock);
  const conclusion_count = conclusionChunks.length;
  let underCitedConclusions = 0;
  for (const { id, body: tail } of conclusionChunks) {
    const confidenceMatch = tail.match(/\*\*(HIGH|MEDIUM|LOW)\*\*/);
    if (!confidenceMatch) {
      errors.push(`Conclusion C${id} is missing a confidence label (**HIGH** / **MEDIUM** / **LOW**).`);
      underCitedConclusions += 1;
      continue;
    }
    const confidence = confidenceMatch[1] as 'HIGH' | 'MEDIUM' | 'LOW';
    const cited = new Set([...tail.matchAll(/\bS(\d+)\b/g)].map(c => parseInt(c[1], 10)));
    const minRequired = confidence === 'LOW' ? 1 : 2;
    if (cited.size < minRequired) {
      errors.push(`Conclusion C${id} (${confidence}) cites ${cited.size} source(s); requires ≥${minRequired}.`);
      underCitedConclusions += 1;
    }
  }

  // Rule 5: Recommendations
  const recsBlock = extractSection(body, 'Recommendations');
  // Treat each bullet (- or *) at the start of a line, or a numbered "1." as one recommendation.
  const recLines = recsBlock.split('\n').filter(l => /^\s*(?:[-*]|\d+\.)\s+/.test(l));
  const recommendation_count = recLines.length;
  let untracedRecommendations = 0;
  for (const rec of recLines) {
    if (!/\bC\d+\b/.test(rec)) {
      untracedRecommendations += 1;
    }
  }
  if (recommendation_count > 0 && untracedRecommendations === recommendation_count) {
    errors.push(`All ${recommendation_count} Recommendation(s) lack C[N] traceability.`);
  } else if (untracedRecommendations > 0) {
    errors.push(`${untracedRecommendations} of ${recommendation_count} Recommendation(s) lack C[N] traceability.`);
  }

  // Heuristic untraced-claims count across narrative sections (not used as a hard fail signal).
  const narrativeSections = ['Executive Summary', 'Cross-Source Analysis', 'Jobs-to-be-Done Analysis', 'Whitespace Analysis'];
  let untraced_claims = 0;
  for (const sec of narrativeSections) {
    const block = extractSection(body, sec);
    // Count sentences ending in . ? ! that contain neither S[N] nor C[N]
    const sentences = block.match(/[^.!?\n]+[.!?]/g) ?? [];
    for (const s of sentences) {
      if (!/\b[SC]\d+\b/.test(s) && s.trim().length > 40) {
        untraced_claims += 1;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sectionsFound,
    citation_stats: {
      source_count,
      conclusion_count,
      recommendation_count,
      underCitedConclusions,
      untracedRecommendations,
      untraced_claims,
    },
  };
}

/** Pull H2 headings (one per `## Heading` line). Subsection H3+ headings are ignored. */
function extractH2Sections(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) { out.push(m[1].trim()); }
  }
  return out;
}

/**
 * Walk the lines of a Formal Conclusions block and return one entry per
 * `**C[N]**` (or `### C[N]`) marker. The chunk body is every line up to
 * the next marker. Robust against multi-line conclusions and missing
 * trailing newlines.
 */
function splitOnConclusionMarkers(block: string): Array<{ id: string; body: string }> {
  // No \b after `**C1**` — `*` and the following space are both non-word, so
  // \b is false there. Use an explicit space/EOL lookahead instead.
  const markerRe = /^\s*(?:\*\*C(\d+)\*\*|###\s+C(\d+))(?=\s|$)/;
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

/** Slice the body for a single named H2 section (text up to the next H2 or EOF). */
function extractSection(body: string, sectionName: string): string {
  const lines = body.split('\n');
  let inSection = false;
  const collected: string[] = [];
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (h2[1].trim() === sectionName) { inSection = true; continue; }
      if (inSection) { break; }            // next H2 closes the section
    }
    if (inSection) { collected.push(line); }
  }
  return collected.join('\n');
}
