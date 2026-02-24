import type { AgentStatusInfo, AgentStatusPhase, GitHubIssueListItem } from '../types';
import { GitHubService } from './GitHubService';

/**
 * Unified agent status detection for both Scorecard (code repo) and
 * Looking Glass (governance mesh repo) contexts.
 *
 * Callers pass `owner, repo` — Scorecard passes the code repo,
 * Looking Glass passes the mesh repo.
 */
export class AgentStatusService {
  constructor(private readonly github: GitHubService) {}

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Detect agent status for a code repository (Scorecard context).
   * Scans open issues for agent assignees or remediation labels.
   */
  async detectForRepo(owner: string, repo: string): Promise<AgentStatusInfo | null> {
    try {
      const { issues } = await this.github.listIssues(owner, repo, 1, 10);
      const agentIssue = this.findAgentIssue(issues);
      if (!agentIssue) { return null; }
      return this.buildStatus(owner, repo, agentIssue);
    } catch {
      return null;
    }
  }

  /**
   * Detect agent status for a BAR in the governance mesh (Looking Glass context).
   * Scans issues labeled `oraculum-review` matching the BAR name.
   */
  async detectForBar(owner: string, repo: string, barName: string): Promise<AgentStatusInfo | null> {
    try {
      const { issues } = await this.github.listIssues(owner, repo, 1, 10, 'oraculum-review');
      const barLower = barName.toLowerCase();
      const agentIssue = issues.find(i => i.title.toLowerCase().includes(barLower));
      if (!agentIssue) { return null; }
      return this.buildStatus(owner, repo, agentIssue);
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Internal — Issue Detection
  // ==========================================================================

  /** Find the first issue that looks like it's being handled by an AI agent. */
  private findAgentIssue(issues: GitHubIssueListItem[]): GitHubIssueListItem | undefined {
    return issues.find(i => {
      const assignee = i.assignee?.toLowerCase() || '';
      const labelNames = (i.labels || []).map(l => l.name.toLowerCase());
      return (
        assignee.includes('copilot') ||
        assignee.includes('claude') ||
        labelNames.some(l => l.includes('copilot') || l.includes('claude')) ||
        labelNames.some(l =>
          l === 'remediation-planning' ||
          l === 'remediation-in-progress' ||
          l === 'remediation-complete' ||
          l === 'oraculum-review'
        )
      );
    });
  }

  // ==========================================================================
  // Internal — Status Building
  // ==========================================================================

  /** Build the full AgentStatusInfo from a detected agent issue. */
  private async buildStatus(
    owner: string,
    repo: string,
    issue: GitHubIssueListItem
  ): Promise<AgentStatusInfo> {
    const agent = this.detectAgent(issue);

    // Check for linked PRs
    const prs = await this.safeGetLinkedPRs(owner, repo, issue.number);
    const linkedPr = prs.length > 0 ? prs[0] : undefined;

    // Only check workflow approval status when we have an active agent issue
    const waitingRuns = await this.safeGetWaitingRuns(owner, repo);

    // Check if Claude has posted a plan and is waiting for approval
    const hasPlanComment = await this.safeCheckForPlanComment(owner, repo, issue);

    const phase = this.resolvePhase(issue, linkedPr, waitingRuns.length > 0, hasPlanComment);

    const result: AgentStatusInfo = {
      phase,
      agent,
      issue: {
        number: issue.number,
        url: issue.url,
        title: issue.title,
      },
    };

    if (linkedPr) {
      result.pr = {
        number: linkedPr.number,
        url: linkedPr.url,
        title: linkedPr.title,
        draft: linkedPr.draft,
        checksStatus: linkedPr.checksStatus,
        mergeable: linkedPr.mergeable,
        state: linkedPr.state,
        reviewRequested: linkedPr.reviewRequested,
      };
    }

    if (waitingRuns.length > 0) {
      result.workflowRun = {
        name: waitingRuns[0].name,
        url: waitingRuns[0].url,
      };
    }

    return result;
  }

  /** Detect which agent is working on this issue. */
  private detectAgent(issue: GitHubIssueListItem): 'claude' | 'copilot' | 'unknown' {
    const assignee = issue.assignee?.toLowerCase() || '';
    const labelNames = (issue.labels || []).map(l => l.name.toLowerCase());

    if (assignee.includes('copilot') || labelNames.some(l => l.includes('copilot'))) {
      return 'copilot';
    }
    if (
      assignee.includes('claude') ||
      labelNames.some(l => l.includes('claude') || l.startsWith('remediation-'))
    ) {
      return 'claude';
    }
    return 'unknown';
  }

  /**
   * Resolve the phase using priority ordering:
   * 1. Workflow waiting → 'awaiting-approval'
   * 2. PR merged → 'complete'
   * 3. PR checks failing → 'pr-checks-failing'
   * 4. PR open + not draft → 'pr-review'
   * 5. Label remediation-planning + bot comment → 'plan-review'
   * 6. Label remediation-planning → 'planning'
   * 7. Label remediation-in-progress → 'implementing'
   * 8. Label remediation-complete → 'complete'
   * 9. Default → 'implementing'
   */
  private resolvePhase(
    issue: GitHubIssueListItem,
    pr: { state: string; draft: boolean; checksStatus: string; reviewRequested?: boolean } | undefined,
    hasWaitingWorkflow: boolean,
    hasPlanComment: boolean,
  ): AgentStatusPhase {
    // 1. Workflow needs approval
    if (hasWaitingWorkflow) {
      return 'awaiting-approval';
    }

    // 2-4. PR-based states
    if (pr) {
      if (pr.state === 'merged') { return 'complete'; }
      if (pr.state === 'open' && pr.checksStatus === 'failing') { return 'pr-checks-failing'; }
      // PR is ready for review if: not draft, OR reviewers were requested (Copilot requests review on draft PRs)
      if (pr.state === 'open' && (!pr.draft || pr.reviewRequested)) { return 'pr-review'; }
    }

    // 5-8. Label-based states
    const labelNames = (issue.labels || []).map(l => l.name.toLowerCase());
    if (labelNames.includes('remediation-planning')) {
      // Claude posts its plan as a comment, then waits for "@claude approved"
      return hasPlanComment ? 'plan-review' : 'planning';
    }
    if (labelNames.includes('remediation-in-progress')) { return 'implementing'; }
    if (labelNames.includes('remediation-complete')) { return 'complete'; }

    // 9. Default
    return 'implementing';
  }

  // ==========================================================================
  // Safe wrappers (best-effort, never throw)
  // ==========================================================================

  private async safeGetLinkedPRs(owner: string, repo: string, issueNumber: number) {
    try {
      return await this.github.getLinkedPullRequests(owner, repo, issueNumber);
    } catch {
      return [];
    }
  }

  private async safeGetWaitingRuns(owner: string, repo: string) {
    try {
      return await this.github.getWaitingWorkflowRuns(owner, repo);
    } catch {
      return [];
    }
  }

  /**
   * Check if Claude has posted a plan comment on the issue.
   * Only called when the issue has `remediation-planning` label.
   * Looks for a bot comment (from the workflow) that's long enough to be a plan.
   */
  private async safeCheckForPlanComment(
    owner: string,
    repo: string,
    issue: GitHubIssueListItem
  ): Promise<boolean> {
    const labelNames = (issue.labels || []).map(l => l.name.toLowerCase());
    if (!labelNames.includes('remediation-planning')) { return false; }
    try {
      const comments = await this.github.getIssueComments(owner, repo, issue.number);
      // Look for a bot comment that looks like a plan (substantial length, from a bot/app)
      return comments.some(c =>
        c.isBot && c.body.length > 200
      );
    } catch {
      return false;
    }
  }
}
