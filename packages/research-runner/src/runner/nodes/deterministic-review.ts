/**
 * deterministic_architecture_review + deterministic_security_review
 *
 * Companion to the LLM expert reviewers — these are PURE (no LLM call) and
 * grep-based. They produce the deterministic counter-signal verify_grounding
 * needs to enforce the "both-must-pass" rule from the v0.6 spec:
 *
 *   - invalid_citations: PRD cites an ID that doesn't exist in the mesh
 *                        (e.g. FR-02 traces to R5 but R5 was never declared;
 *                         SR-01 cites THR-999 but mesh.bar.threats has none).
 *   - coverage_discrepancies: the Coverage Analysis table claims YES/PARTIAL
 *                             for a premise but no FR/SR actually cites it,
 *                             or vice versa (says NO but body covers it).
 *
 * Severity: PASS if no invalid + no discrepancies. MINOR if only discrepancies.
 * MAJOR if any invalid_citation. (Deterministic reviewers don't go to BLOCKING
 * — that's an LLM-only judgment about substantive issues.)
 */
import type { MeshContext } from '../../schemas';
import type {
  CoverageStatus,
  PrdCitationSignals,
} from './prd-validator';

export type DeterministicExpertKind = 'architecture' | 'security';
export type DeterministicSeverity = 'PASS' | 'MINOR' | 'MAJOR';

export interface InvalidCitation {
  /** Where the bad citation lives, e.g. "FR-02" or "SR-01" or "Coverage row R5". */
  where: string;
  cite: string;
  reason: string;
}

export interface CoverageDiscrepancy {
  premise: string;
  claimed_status: CoverageStatus | 'MISSING_ROW';
  observed: 'cited_by_body' | 'not_cited_by_body';
  detail: string;
}

export interface DeterministicReview {
  expert: DeterministicExpertKind;
  iteration: number;
  severity: DeterministicSeverity;
  invalid_citations: InvalidCitation[];
  coverage_discrepancies: CoverageDiscrepancy[];
  /** Reviewer-specific stats — e.g. `{ calm_nodes_referenced: 3 }` for arch. */
  stats: Record<string, number>;
}

// OWASP Top 10 (2021) — what an A0X citation must match. v2026-04 catalog
// stays at 2021 since the next revision is still draft as of this release;
// when 2025 ships we add A11/etc. here.
const OWASP_2021 = new Set<string>(['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10']);

// NIST 800-53 control families — we don't validate the number, just the
// family prefix. Catalog families per Rev 5.
const NIST_FAMILIES = new Set<string>([
  'AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP',
  'PE', 'PL', 'PM', 'PS', 'PT', 'RA', 'SA', 'SC', 'SI', 'SR', 'SU',
]);

// ============================================================================
// Architecture reviewer
// ============================================================================

export interface ArchitectureReviewOpts {
  iteration: number;
  signals: PrdCitationSignals;
  meshContext: MeshContext;
}

export function deterministicArchitectureReview(opts: ArchitectureReviewOpts): DeterministicReview {
  const { iteration, signals } = opts;
  const validPremises = new Set(signals.premise_ids);

  const invalid: InvalidCitation[] = [];

  // FR cites must reference declared premises (R[N] / E[N])
  for (const fr of signals.fr_entries) {
    for (const cite of fr.cited) {
      if (!validPremises.has(cite)) {
        invalid.push({
          where: fr.id,
          cite,
          reason: `Premise ${cite} not declared in Input Premises section`,
        });
      }
    }
  }

  // Coverage discrepancies cross the table against actual FR citations
  const discrepancies = computeCoverageDiscrepancies(signals, /*forSecurity*/ false);

  // Stats: how many CALM nodes from the mesh are mentioned anywhere in the
  // PRD body. We use the cached calm_node_ids set from MeshContext if present.
  const calmIds = extractCalmNodeIds(opts.meshContext);
  // Citation signals don't carry the raw body — we use the SR/FR cite arrays
  // as a proxy: FRs with `CALM node:` hints would already have surfaced via
  // generate-prd-manifest. Here we just count the in-scope CALM ids.
  const stats: Record<string, number> = {
    calm_nodes_in_scope: calmIds.size,
    fr_count: signals.fr_entries.length,
    sr_count: signals.sr_entries.length,
  };

  return {
    expert: 'architecture',
    iteration,
    severity: severityFrom(invalid, discrepancies),
    invalid_citations: invalid,
    coverage_discrepancies: discrepancies,
    stats,
  };
}

// ============================================================================
// Security reviewer
// ============================================================================

export interface SecurityReviewOpts {
  iteration: number;
  signals: PrdCitationSignals;
  meshContext: MeshContext;
}

export function deterministicSecurityReview(opts: SecurityReviewOpts): DeterministicReview {
  const { iteration, signals, meshContext } = opts;

  const meshThreatIds = new Set<string>();
  const threats = meshContext.bar?.threats;
  if (Array.isArray(threats)) {
    for (const t of threats as Array<{ id?: string }>) {
      if (t.id) { meshThreatIds.add(t.id); }
    }
  }

  const invalid: InvalidCitation[] = [];
  let threatCitations = 0;
  let owaspCitations = 0;
  let nistCitations = 0;

  for (const sr of signals.sr_entries) {
    for (const cite of sr.cited) {
      if (cite.startsWith('THR-')) {
        threatCitations += 1;
        // Only validate when the mesh declares threats — if the BAR has
        // no threats catalogue we can't say a THR-* cite is invalid.
        if (meshThreatIds.size > 0 && !meshThreatIds.has(cite)) {
          invalid.push({
            where: sr.id,
            cite,
            reason: `Threat ${cite} not present in mesh.bar.threats`,
          });
        }
      } else if (/^A\d{2}$/.test(cite)) {
        owaspCitations += 1;
        if (!OWASP_2021.has(cite)) {
          invalid.push({
            where: sr.id,
            cite,
            reason: `OWASP id ${cite} out of range (A01–A10 for 2021 catalog)`,
          });
        }
      } else if (/^NIST-[A-Z]{2}-\d+$/.test(cite)) {
        nistCitations += 1;
        const family = cite.slice(5, 7);
        if (!NIST_FAMILIES.has(family)) {
          invalid.push({
            where: sr.id,
            cite,
            reason: `NIST family ${family} not in 800-53 Rev 5 catalogue`,
          });
        }
      }
    }
  }

  const discrepancies = computeCoverageDiscrepancies(signals, /*forSecurity*/ true);

  const stats: Record<string, number> = {
    sr_count: signals.sr_entries.length,
    threat_citations: threatCitations,
    owasp_citations: owaspCitations,
    nist_citations: nistCitations,
    threats_in_scope: meshThreatIds.size,
  };

  return {
    expert: 'security',
    iteration,
    severity: severityFrom(invalid, discrepancies),
    invalid_citations: invalid,
    coverage_discrepancies: discrepancies,
    stats,
  };
}

// ============================================================================
// Shared helpers
// ============================================================================

/**
 * Compare the Coverage Analysis table against actual FR/SR citations.
 *
 * For each premise in the table:
 *   - status YES/PARTIAL but no FR/SR cites it → 'cited_by_body=false' discrepancy
 *   - status NO but at least one FR/SR cites it → 'cited_by_body=true' discrepancy
 * For each premise NOT in the table but declared in Input Premises → MISSING_ROW
 */
function computeCoverageDiscrepancies(
  signals: PrdCitationSignals,
  _forSecurity: boolean,
): CoverageDiscrepancy[] {
  const out: CoverageDiscrepancy[] = [];

  // Build the set of premises actually cited by any FR or SR.
  const citedByBody = new Set<string>();
  for (const fr of signals.fr_entries) { for (const c of fr.cited) { citedByBody.add(c); } }
  for (const sr of signals.sr_entries) { for (const c of sr.cited) { citedByBody.add(c); } }

  const tablePremises = new Set(signals.coverage_rows.map(r => r.premise));

  for (const row of signals.coverage_rows) {
    const isCited = citedByBody.has(row.premise);
    if ((row.status === 'YES' || row.status === 'PARTIAL') && !isCited) {
      out.push({
        premise: row.premise,
        claimed_status: row.status,
        observed: 'not_cited_by_body',
        detail: `Coverage table claims ${row.status} but no FR/SR cites ${row.premise}`,
      });
    } else if (row.status === 'NO' && isCited) {
      out.push({
        premise: row.premise,
        claimed_status: row.status,
        observed: 'cited_by_body',
        detail: `Coverage table claims NO but body cites ${row.premise} in an FR/SR — table is stale`,
      });
    }
  }

  // Premises declared but missing from the table
  for (const p of signals.premise_ids) {
    if (!tablePremises.has(p)) {
      out.push({
        premise: p,
        claimed_status: 'MISSING_ROW',
        observed: citedByBody.has(p) ? 'cited_by_body' : 'not_cited_by_body',
        detail: `Premise ${p} has no row in Coverage Analysis table`,
      });
    }
  }

  return out;
}

function severityFrom(invalid: InvalidCitation[], discrepancies: CoverageDiscrepancy[]): DeterministicSeverity {
  if (invalid.length > 0) { return 'MAJOR'; }
  if (discrepancies.length > 0) { return 'MINOR'; }
  return 'PASS';
}

function extractCalmNodeIds(mesh: MeshContext): Set<string> {
  const out = new Set<string>();
  const calm = mesh.bar?.calm_model;
  if (!calm || typeof calm !== 'object') { return out; }
  const nodes = (calm as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) { return out; }
  for (const n of nodes) {
    const id = (n as Record<string, unknown>)['unique-id'];
    if (typeof id === 'string') { out.add(id); }
  }
  return out;
}
