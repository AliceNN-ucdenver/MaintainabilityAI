import * as vscode from 'vscode';
import { GitHubService } from './GitHubService';
import type { IssueComment, LinkedPullRequest, RepoInfo } from '../types';

export interface MonitorState {
  issueNumber: number;
  issueUrl: string;
  repo: RepoInfo;
  comments: IssueComment[];
  linkedPr: LinkedPullRequest | null;
  lastCommentDate: string | null;
  labels: string[];
  isPolling: boolean;
}

export class IssueMonitorService implements vscode.Disposable {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private state: MonitorState | null = null;
  private readonly pollIntervalMs: number;

  private readonly _onCommentsUpdated = new vscode.EventEmitter<IssueComment[]>();
  readonly onDidUpdateComments = this._onCommentsUpdated.event;

  private readonly _onPrDetected = new vscode.EventEmitter<LinkedPullRequest>();
  readonly onDidDetectPr = this._onPrDetected.event;

  private readonly _onPrStatusChanged = new vscode.EventEmitter<LinkedPullRequest>();
  readonly onDidChangePrStatus = this._onPrStatusChanged.event;

  private readonly _onLabelsUpdated = new vscode.EventEmitter<string[]>();
  readonly onDidUpdateLabels = this._onLabelsUpdated.event;

  constructor(private readonly githubService: GitHubService) {
    const configInterval = vscode.workspace
      .getConfiguration('maintainabilityai.monitor')
      .get<number>('pollIntervalSeconds', 12);
    this.pollIntervalMs = Math.max(5, Math.min(60, configInterval)) * 1000;
  }

  startMonitoring(issueNumber: number, issueUrl: string, repo: RepoInfo): void {
    this.stopMonitoring();

    this.state = {
      issueNumber,
      issueUrl,
      repo,
      comments: [],
      linkedPr: null,
      lastCommentDate: null,
      labels: [],
      isPolling: true,
    };

    // Immediate first poll
    this.poll();

    // Then poll on interval
    this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stopMonitoring(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.state) {
      this.state.isPolling = false;
    }
  }

  getState(): MonitorState | null {
    return this.state;
  }

  private async poll(): Promise<void> {
    if (!this.state) { return; }
    const { repo, issueNumber, lastCommentDate } = this.state;

    try {
      // Poll comments — fetch all comments updated since last poll
      // GitHub's `since` param filters by updated_at, so edited comments come back too
      const comments = await this.githubService.getIssueComments(
        repo.owner, repo.repo, issueNumber,
        lastCommentDate || undefined
      );

      if (comments.length > 0) {
        const existingById = new Map(this.state.comments.map(c => [c.id, c]));
        let changed = false;

        for (const comment of comments) {
          const existing = existingById.get(comment.id);
          if (!existing) {
            // New comment
            this.state.comments.push(comment);
            changed = true;
          } else if (existing.updatedAt !== comment.updatedAt) {
            // Existing comment was edited (e.g. Claude updating its plan)
            existing.body = comment.body;
            existing.updatedAt = comment.updatedAt;
            changed = true;
          }
        }

        if (changed) {
          // Track the latest timestamp for incremental polling
          const allDates = this.state.comments.map(c => c.updatedAt || c.createdAt);
          this.state.lastCommentDate = allDates.sort().pop() || null;
          this._onCommentsUpdated.fire([...this.state.comments]);
        }
      }

      // Poll for linked PRs
      const prs = await this.githubService.getLinkedPullRequests(
        repo.owner, repo.repo, issueNumber
      );

      if (prs.length > 0) {
        const pr = prs[0];
        const previousPr = this.state.linkedPr;
        this.state.linkedPr = pr;

        if (!previousPr) {
          this._onPrDetected.fire(pr);
        } else if (
          previousPr.checksStatus !== pr.checksStatus ||
          previousPr.state !== pr.state ||
          previousPr.draft !== pr.draft
        ) {
          this._onPrStatusChanged.fire(pr);
        }
      }

      // Poll labels for phase detection
      const labels = await this.githubService.getIssueLabels(
        repo.owner, repo.repo, issueNumber
      );
      const prev = this.state.labels;
      if (labels.length !== prev.length || labels.some((l, i) => l !== prev[i])) {
        this.state.labels = labels;
        this._onLabelsUpdated.fire([...labels]);
      }
    } catch {
      // Swallow polling errors to avoid crashing the monitor loop
    }
  }

  dispose(): void {
    this.stopMonitoring();
    this._onCommentsUpdated.dispose();
    this._onPrDetected.dispose();
    this._onPrStatusChanged.dispose();
    this._onLabelsUpdated.dispose();
  }
}
