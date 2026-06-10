// Pure agent-status derivation — extracted VERBATIM from oraculum.ts's
// updateAgentStatus so the keyword/label ladder (the complexity) is its own
// unit-testable module (same pattern as regexCounters.ts), and the DOM applier
// left behind in oraculum.ts is trivial. No DOM access here. Distinct from
// agentStatus.ts, which is the shared Agent Status rendering component for the
// Scorecard / Looking Glass webviews.

import type { IssueComment } from './types';

export interface AgentStatusView {
  status: string;
  /** HTML entity (innerHTML'd into the icon element by the caller). */
  icon: string;
  text: string;
}

/**
 * Derive the monitor-phase agent status chip from the issue comments + labels.
 * `needsApproval` comes from detectNeedsApproval(comments) at the call site.
 */
export function deriveAgentStatus(
  comments: IssueComment[],
  needsApproval: boolean,
  labels: string[],
): AgentStatusView {
  const hasPlanning = labels.includes('remediation-planning');
  const hasInProgress = labels.includes('remediation-in-progress');
  const hasComplete = labels.includes('remediation-complete');

  const lastBot = [...comments].reverse().find(c => c.isBot);
  const lastAny = comments[comments.length - 1];
  let status = 'analyzing';
  let icon = '&#x1F50D;'; // magnifying glass
  let text = 'Agent is analyzing...';

  if (lastBot) {
    const lower = lastBot.body.toLowerCase();

    const isComplete = hasComplete ||
      lower.includes('implementation complete') ||
      lower.includes('implementation is complete') ||
      lower.includes('all changes have been committed') ||
      lower.includes('review complete') ||
      lower.includes('analysis complete') ||
      lower.includes('opened a pull request') ||
      lower.includes('created a pull request');

    if (needsApproval) {
      status = 'awaiting-approval';
      icon = '&#x1F4CB;'; // clipboard
      text = 'Plan ready — waiting for your approval';
    } else if (hasPlanning && !needsApproval) {
      status = 'approval-sent';
      icon = '&#x23F3;'; // hourglass
      text = 'Approval sent — waiting for implementation to start...';
    } else if (hasInProgress) {
      if (lower.includes('running tests') || lower.includes('npm test') || lower.includes('test coverage')) {
        status = 'testing';
        icon = '&#x1F9EA;'; // test tube
        text = 'Agent is running tests...';
      } else {
        status = 'implementing';
        icon = '&#x1F528;'; // hammer
        text = 'Agent is implementing...';
      }
    } else if (isComplete) {
      status = 'complete';
      icon = '&#x2705;'; // check
      text = 'Review complete';
      if (lower.includes('pull request') || hasComplete) {
        text = 'Review complete — PR created';
      }
    } else if (lower.includes('running tests') || lower.includes('npm test') || lower.includes('test coverage')) {
      status = 'testing';
      icon = '&#x1F9EA;';
      text = 'Agent is running tests...';
    } else if (lower.includes('starting implementation') || lower.includes('beginning implementation') || lower.includes('implementing') || lower.includes('creating files') || lower.includes('writing code')) {
      status = 'implementing';
      icon = '&#x1F528;';
      text = 'Agent is implementing...';
    } else if (lower.includes('plan') || lower.includes('analysis') || lower.includes('approach') || lower.includes('reviewing')) {
      status = 'planning';
      icon = '&#x1F4CB;';
      text = 'Agent is analyzing the architecture...';
    } else {
      status = 'working';
      icon = '&#x1F916;';
      text = 'Agent is working...';
    }
  }

  if (lastAny?.isBot && lastAny.updatedAt !== lastAny.createdAt && status !== 'complete' && status !== 'awaiting-approval') {
    text += ' (comment being updated live)';
  }

  return { status, icon, text };
}
