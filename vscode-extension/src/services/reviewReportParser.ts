/**
 * Deterministic review-report parser (governance-review-alignment v2).
 *
 * Replaces the LLM "top findings" summary with a pure, offline derivation
 * straight from the structured report the architecture-review-agent writes.
 * The report's pillar sections (`## Architecture Findings`, …) contain
 * `**[severity]**` bullets — exactly the shape review-agent.yml's gate
 * enforces — so "top findings" is just severity-sorted bullets per pillar.
 * Zero LLM, instant, reproducible, and it can never contradict the artifact
 * it summarizes (same source the drift score is computed from).
 */
import type { TopFindingsSummary } from '../types/governance';

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** pillar summary-key → report section heading. */
const PILLAR_SECTION: Record<keyof TopFindingsSummary, string> = {
  architecture: 'Architecture Findings',
  security: 'Security Findings',
  informationRisk: 'Information Risk Findings',
  operations: 'Operations Findings',
};

/** Extract the body of a `## <heading>` section from markdown. */
export function sectionBody(md: string, heading: string): string {
  const re = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const m = re.exec(md);
  if (!m) { return ''; }
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

interface Finding { severity: string; text: string; }

/** Parse `**[severity]** text…` finding bullets from a section body. */
function parseFindings(body: string): Finding[] {
  const findings: Finding[] = [];
  const re = /^\s*[-*]\s*\*\*\[(critical|high|medium|low)\]\*\*\s*(.+?)\s*$/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const severity = m[1].toLowerCase();
    // Trim to the finding statement: drop the trailing "Evidence: …" citation
    // and cap length so the inline summary stays scannable.
    let text = m[2].replace(/\s*Evidence:.*$/i, '').trim();
    if (text.length > 160) { text = text.slice(0, 157).trimEnd() + '…'; }
    findings.push({ severity, text });
  }
  return findings;
}

/**
 * Derive the per-pillar top findings from a review report's markdown.
 * Bullets are sorted critical → high → medium → low (stable within a
 * severity), and capped at `perPillar` (default 3) per pillar.
 */
export function deriveTopFindings(reportMarkdown: string, perPillar = 3): TopFindingsSummary {
  const out: TopFindingsSummary = { architecture: [], security: [], informationRisk: [], operations: [] };
  for (const key of Object.keys(PILLAR_SECTION) as (keyof TopFindingsSummary)[]) {
    const body = sectionBody(reportMarkdown, PILLAR_SECTION[key]);
    const findings = parseFindings(body)
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
      .slice(0, perPillar);
    out[key] = findings.map(f => `[${f.severity}] ${f.text}`);
  }
  return out;
}
