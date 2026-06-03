/**
 * prd-validator — structural validator for the markdown body produced by
 * synthesize_prd.
 *
 * Enforces the canonical 10-section PRD shape defined in
 * `.caterpillar/prompts/prd/synthesis.md`:
 *
 *   1. Input Premises          (R[N] / E[N] numbered list)
 *   2. Problem Statement
 *   3. Goals/Non-Goals
 *   4. Functional Requirements   (FR-NN; cites ≥1 R/E — traceability enforced by
 *                                 the per-entry "Traces to:" citation rule below)
 *   5. Non-Functional Requirements                  (NFR-NN; cites ≥1 R/E)
 *   6. Security Requirements     (SR-NN; cites ≥1 THR/A0X/NIST — threat-tracing
 *                                 enforced by the per-entry citation rule below)
 *   7. Coverage Analysis                            (table; every premise tagged YES/PARTIAL/NO)
 *   8. Risk Matrix
 *   9. Success Metrics
 *  10. References
 *
 * Headings are the SHORT, model-stable forms the agent reliably emits (verified
 * across the committed mesh artifacts). The "traceability" / "threat-tracing"
 * intent the old long headings advertised is enforced by the CONTENT checks
 * (FR `Traces to:` R/E, SR `THR/A0X/NIST`), not by heading text — so shortening
 * the headings loses no enforcement while ending the pack↔artifact drift.
 *
 * Returns ValidationReport + extra per-FR / per-SR / per-coverage signals
 * verify_grounding consumes.
 */
import type { ValidationReport } from './validation-types';

export const CANONICAL_PRD_SECTIONS = [
  'Input Premises',
  'Problem Statement',
  'Goals/Non-Goals',
  'Functional Requirements',
  'Non-Functional Requirements',
  'Security Requirements',
  'Coverage Analysis',
  'Risk Matrix',
  'Success Metrics',
  'References',
] as const;

export type CanonicalPrdSection = typeof CANONICAL_PRD_SECTIONS[number];

export type CoverageStatus = 'YES' | 'PARTIAL' | 'NO';

export interface PrdCitationSignals {
  /** Numbered premise IDs (R1, R2, E1, E2, …) in the Input Premises section. */
  premise_ids: string[];
  /** FR entries with the upstream IDs they cite (R/E). */
  fr_entries: Array<{ id: string; cited: string[] }>;
  /** SR entries with the upstream IDs they cite (THR/A0X/NIST). */
  sr_entries: Array<{ id: string; cited: string[] }>;
  /** Coverage Analysis table rows — premise → self-reported status. */
  coverage_rows: Array<{ premise: string; status: CoverageStatus; whereAddressed: string }>;
}

export interface PrdValidationReport extends ValidationReport {
  /** Detailed citation signals verify_grounding needs. */
  signals: PrdCitationSignals;
}

const FR_REQUIREMENT_RE = /\bFR-\d+\b/g;
const SR_REQUIREMENT_RE = /\bSR-\d+\b/g;
const R_OR_E_CITATION_RE = /\b[RE]\d+\b/g;
const THR_OR_OWASP_OR_NIST_RE = /\b(?:THR-\d+|A\d{2}|NIST-[A-Z]{2}-\d+)\b/g;
const COVERAGE_STATUS_VALID = new Set<CoverageStatus>(['YES', 'PARTIAL', 'NO']);

export function validatePrd(body: string): PrdValidationReport {
  const errors: string[] = [];
  const sectionsFound = extractH2Sections(body);

  // Rule 1 + 2: sections present in canonical order
  for (let i = 0; i < CANONICAL_PRD_SECTIONS.length; i++) {
    const expected = CANONICAL_PRD_SECTIONS[i];
    if (sectionsFound[i] !== expected) {
      errors.push(
        `Section #${i + 1} expected "## ${expected}" but found ${sectionsFound[i] ? `"## ${sectionsFound[i]}"` : '(missing)'}.`,
      );
    }
  }

  // Parse signals (used for verify_grounding even when rules fail)
  const signals = extractCitationSignals(body);

  // Rule 3: every FR cites ≥1 R or E
  for (const fr of signals.fr_entries) {
    if (fr.cited.length === 0) {
      errors.push(`Functional Requirement ${fr.id} has no R[N] / E[N] citation.`);
    }
  }

  // Rule 4: every SR cites ≥1 THR / A0X / NIST
  for (const sr of signals.sr_entries) {
    if (sr.cited.length === 0) {
      errors.push(`Security Requirement ${sr.id} has no THR-NNN / A0X / NIST-XX-NN citation.`);
    }
  }

  // Rule 5: Coverage Analysis table covers every input premise
  const tableCovered = new Set(signals.coverage_rows.map(r => r.premise));
  for (const pid of signals.premise_ids) {
    if (!tableCovered.has(pid)) {
      errors.push(`Coverage Analysis table is missing a row for premise ${pid}.`);
    }
  }

  // Rule 6: every coverage status is YES / PARTIAL / NO (no free-text drift)
  for (const row of signals.coverage_rows) {
    if (!COVERAGE_STATUS_VALID.has(row.status)) {
      errors.push(`Coverage row for ${row.premise} has invalid status "${row.status}"; must be YES / PARTIAL / NO.`);
    }
  }

  // Heuristic untraced-claims signal across narrative sections (informational)
  const untraced_claims = countUntracedClaims(body);

  return {
    valid: errors.length === 0,
    errors,
    sectionsFound,
    signals,
    citation_stats: {
      source_count: signals.premise_ids.length,
      conclusion_count: 0,  // PRDs don't have C[N]
      recommendation_count: signals.fr_entries.length + signals.sr_entries.length,
      underCitedConclusions: 0,
      untracedRecommendations: signals.fr_entries.filter(f => f.cited.length === 0).length
        + signals.sr_entries.filter(s => s.cited.length === 0).length,
      untraced_claims,
    },
  };
}

// ============================================================================
// Section parsing
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

// ============================================================================
// Citation signal extraction
// ============================================================================

export function extractCitationSignals(body: string): PrdCitationSignals {
  const premiseIds = extractPremiseIds(extractSection(body, 'Input Premises'));
  const frEntries = extractRequirementEntries(extractSection(body, 'Functional Requirements'), FR_REQUIREMENT_RE, R_OR_E_CITATION_RE);
  const srEntries = extractRequirementEntries(extractSection(body, 'Security Requirements'), SR_REQUIREMENT_RE, THR_OR_OWASP_OR_NIST_RE);
  const coverageRows = extractCoverageRows(extractSection(body, 'Coverage Analysis'));
  return {
    premise_ids: premiseIds,
    fr_entries: frEntries,
    sr_entries: srEntries,
    coverage_rows: coverageRows,
  };
}

function extractPremiseIds(block: string): string[] {
  const ids = new Set<string>();
  for (const m of block.matchAll(/\b([RE]\d+)\b/g)) {
    ids.add(m[1]);
  }
  return [...ids].sort(naturalCompare);
}

interface RequirementEntry { id: string; cited: string[] }

/**
 * Split a requirements block on each `FR-NN` / `SR-NN` marker, then extract
 * citations from the chunk body up to (but not including) the next marker.
 * Robust against multi-line requirement bodies + Markdown bullet formatting.
 */
function extractRequirementEntries(
  block: string,
  idRe: RegExp,
  citationRe: RegExp,
): RequirementEntry[] {
  const lines = block.split('\n');
  const idAtStartRe = new RegExp(`^\\s*(?:[-*]|\\d+\\.)?\\s*(?:\\*\\*)?(${idRe.source.replace(/\\b|g/g, '')})(?:\\*\\*)?`, 'i');

  const entries: Array<{ id: string; bodyLines: string[] }> = [];
  for (const line of lines) {
    const m = line.match(idAtStartRe);
    if (m) {
      entries.push({ id: m[1].toUpperCase(), bodyLines: [line] });
    } else if (entries.length > 0) {
      entries[entries.length - 1].bodyLines.push(line);
    }
  }

  // Dedupe by id (keep first occurrence's body for citation extraction)
  const seen = new Set<string>();
  const unique: RequirementEntry[] = [];
  for (const e of entries) {
    if (seen.has(e.id)) { continue; }
    seen.add(e.id);
    const body = e.bodyLines.join('\n');
    // Strip the leading `FR-NN` / `SR-NN` token itself so it doesn't count as its own citation.
    const stripped = body.replace(new RegExp(`\\b${e.id}\\b`, 'gi'), '');
    const cited = new Set<string>();
    for (const cm of stripped.matchAll(citationRe)) {
      cited.add(cm[0]);
    }
    unique.push({ id: e.id, cited: [...cited].sort(naturalCompare) });
  }
  return unique.sort((a, b) => naturalCompare(a.id, b.id));
}

function extractCoverageRows(block: string): Array<{ premise: string; status: CoverageStatus; whereAddressed: string }> {
  const rows: Array<{ premise: string; status: CoverageStatus; whereAddressed: string }> = [];
  for (const line of block.split('\n')) {
    // Match `| R1 | YES | FR-01, FR-04 |` (markdown table rows)
    const m = line.match(/^\s*\|\s*([RE]\d+)\s*\|\s*([A-Z]+)\s*\|\s*([^|]*?)\s*\|\s*$/);
    if (!m) { continue; }
    const premise = m[1];
    const status = m[2].toUpperCase() as CoverageStatus;
    const whereAddressed = m[3].trim();
    rows.push({ premise, status, whereAddressed });
  }
  return rows;
}

function countUntracedClaims(body: string): number {
  const narrative = ['Problem Statement', 'Goals/Non-Goals'];
  let count = 0;
  for (const sec of narrative) {
    const block = extractSection(body, sec);
    const sentences = block.match(/[^.!?\n]+[.!?]/g) ?? [];
    for (const s of sentences) {
      if (!/\b[RE]\d+\b/.test(s) && s.trim().length > 40) { count += 1; }
    }
  }
  return count;
}

/** Natural compare for `R10` < `R2` correctness. */
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}
