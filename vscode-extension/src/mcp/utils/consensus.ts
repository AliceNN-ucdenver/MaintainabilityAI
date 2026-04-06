/**
 * Consensus Resolution — merges multiple ReviewVerdicts into a single ConsensusResult.
 *
 * Rules:
 *   - any-flag-escalates: if ANY reviewer denies, final verdict is deny
 *   - unanimous: all must approve
 *   - majority: >50% approve
 *   - severity propagation: highest severity from any finding becomes the headline
 *   - caveat merging: union of all caveats, deduplicated
 */
import type { ReviewVerdict, ConsensusResult, Finding, Severity, ConsensusRule } from '../../types/redqueen';

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export function resolveConsensus(
  verdicts: ReviewVerdict[],
  rule: ConsensusRule = 'any-flag-escalates',
): ConsensusResult {
  if (verdicts.length === 0) {
    return {
      finalVerdict: 'approve',
      verdicts: [],
      mergedFindings: [],
      mergedCaveats: [],
      reasoning: ['No verdicts provided — defaulting to approve'],
      requiresHumanReview: false,
      highestSeverity: null,
    };
  }

  const reasoning: string[] = [];

  // Determine final verdict based on rule
  let finalVerdict: ConsensusResult['finalVerdict'];

  if (rule === 'any-flag-escalates') {
    const hasDeny = verdicts.some(v => v.verdict === 'deny');
    const hasRequestChanges = verdicts.some(v => v.verdict === 'request-changes');
    if (hasDeny) {
      finalVerdict = 'deny';
      const deniers = verdicts.filter(v => v.verdict === 'deny').map(v => v.reviewer);
      reasoning.push(`Deny: ${deniers.join(', ')} denied`);
    } else if (hasRequestChanges) {
      finalVerdict = 'request-changes';
      const requesters = verdicts.filter(v => v.verdict === 'request-changes').map(v => v.reviewer);
      reasoning.push(`Changes requested by: ${requesters.join(', ')}`);
    } else {
      finalVerdict = 'approve';
      reasoning.push('All reviewers approved');
    }
  } else if (rule === 'unanimous') {
    const allApprove = verdicts.every(v => v.verdict === 'approve');
    if (allApprove) {
      finalVerdict = 'approve';
      reasoning.push('Unanimous approval');
    } else {
      const dissenters = verdicts.filter(v => v.verdict !== 'approve');
      finalVerdict = dissenters.some(v => v.verdict === 'deny') ? 'deny' : 'request-changes';
      reasoning.push(`Not unanimous: ${dissenters.map(v => `${v.reviewer}=${v.verdict}`).join(', ')}`);
    }
  } else {
    // majority
    const approveCount = verdicts.filter(v => v.verdict === 'approve').length;
    if (approveCount > verdicts.length / 2) {
      finalVerdict = 'approve';
      reasoning.push(`Majority approved (${approveCount}/${verdicts.length})`);
    } else {
      finalVerdict = verdicts.some(v => v.verdict === 'deny') ? 'deny' : 'request-changes';
      reasoning.push(`No majority approval (${approveCount}/${verdicts.length})`);
    }
  }

  // Merge findings (deduplicate by id, highest severity wins)
  const findingMap = new Map<string, Finding>();
  for (const v of verdicts) {
    for (const f of v.findings) {
      const existing = findingMap.get(f.id);
      if (!existing || SEVERITY_RANK[f.severity] > SEVERITY_RANK[existing.severity]) {
        findingMap.set(f.id, f);
      }
    }
  }
  const mergedFindings = Array.from(findingMap.values())
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  // Merge caveats (deduplicate)
  const mergedCaveats = [...new Set(verdicts.flatMap(v => v.caveats))];

  // Highest severity
  let highestSeverity: Severity | null = null;
  for (const f of mergedFindings) {
    if (!highestSeverity || SEVERITY_RANK[f.severity] > SEVERITY_RANK[highestSeverity]) {
      highestSeverity = f.severity;
    }
  }

  // Determine if human review is required
  const requiresHumanReview = finalVerdict === 'deny' ||
    highestSeverity === 'critical' ||
    mergedFindings.filter(f => f.severity === 'critical' || f.severity === 'high').length > 3;

  if (requiresHumanReview) {
    reasoning.push('Human review required due to severity or deny verdict');
  }

  return {
    finalVerdict,
    verdicts,
    mergedFindings,
    mergedCaveats,
    reasoning,
    requiresHumanReview,
    highestSeverity,
  };
}
