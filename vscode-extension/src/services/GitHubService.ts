import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import type { IssueCreationRequest, IssueCreationResult, RepoInfo, IssueComment, LinkedPullRequest, GitHubIssueListItem, WorkflowRunSummary, OrgRepo, ActiveReviewInfo } from '../types';
import { IssueBodyBuilder } from './IssueBodyBuilder';

export class GitHubService {
  private octokit: Octokit | null = null;
  private bodyBuilder = new IssueBodyBuilder();

  async getToken(): Promise<string> {
    const session = await vscode.authentication.getSession('github', ['repo'], {
      createIfNone: true,
    });
    return session.accessToken;
  }

  private async getClient(): Promise<Octokit> {
    if (!this.octokit) {
      const token = await this.getToken();
      this.octokit = new Octokit({ auth: token });
    }
    return this.octokit;
  }

  async detectRepo(): Promise<RepoInfo | null> {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      return null;
    }

    const git = gitExtension.isActive
      ? gitExtension.exports
      : await gitExtension.activate();

    const api = git.getAPI(1);
    const repo = api.repositories[0];
    if (!repo) {
      return null;
    }

    const remotes = repo.state.remotes;
    const origin = remotes.find((r: { name: string }) => r.name === 'origin') || remotes[0];
    if (!origin) {
      return null;
    }

    const url = origin.fetchUrl || origin.pushUrl || '';
    const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    if (!match) {
      return null;
    }

    return {
      owner: match[1],
      repo: match[2],
      defaultBranch: repo.state.HEAD?.name || 'main',
      remoteUrl: url,
    };
  }

  async createIssue(request: IssueCreationRequest): Promise<IssueCreationResult> {
    const client = await this.getClient();

    // Ensure labels exist
    const labels = this.bodyBuilder.generateLabels(request);
    await this.ensureLabels(client, request.repo.owner, request.repo.repo, labels);

    // Build issue body
    const body = this.bodyBuilder.build(request);

    // Create issue
    const { data: issue } = await client.rest.issues.create({
      owner: request.repo.owner,
      repo: request.repo.repo,
      title: request.title,
      body,
      labels,
    });

    return {
      url: issue.html_url,
      number: issue.number,
      title: issue.title,
    };
  }

  /**
   * Create a simple issue with raw title/body/labels on any repo.
   * Unlike createIssue(), this is not RCTRO-specific.
   */
  async createIssueRaw(
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels: string[]
  ): Promise<IssueCreationResult> {
    const client = await this.getClient();
    await this.ensureLabels(client, owner, repo, labels);

    const { data: issue } = await client.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });

    return {
      url: issue.html_url,
      number: issue.number,
      title: issue.title,
    };
  }

  private async ensureLabels(
    client: Octokit,
    owner: string,
    repo: string,
    labels: string[]
  ): Promise<void> {
    // Fetch existing labels
    const { data: existingLabels } = await client.rest.issues.listLabelsForRepo({
      owner,
      repo,
      per_page: 100,
    });
    const existingNames = new Set(existingLabels.map(l => l.name));

    const LABEL_COLORS: Record<string, string> = {
      'maintainabilityai': '7c3aed',
      'rctro-feature': 'a855f7',
      'owasp': 'dc2626',
      'maintainability': '2563eb',
      'stride': 'ea580c',
    };

    for (const label of labels) {
      if (existingNames.has(label)) {
        continue;
      }

      const prefix = label.split('/')[0];
      const color = LABEL_COLORS[prefix] || LABEL_COLORS[label] || '6b7280';

      try {
        await client.rest.issues.createLabel({
          owner,
          repo,
          name: label,
          color,
          description: `Created by MaintainabilityAI extension`,
        });
      } catch {
        // Label may already exist (race condition) — ignore
      }
    }
  }

  async setRepoSecret(
    owner: string,
    repo: string,
    secretName: string,
    secretValue: string
  ): Promise<void> {
    // Use gh CLI to set the secret — it handles libsodium encryption internally
    // This mirrors the approach in deploy-test.sh
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    try {
      await execFileAsync('gh', [
        'secret', 'set', secretName,
        '--repo', `${owner}/${repo}`,
        '--body', secretValue,
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found') || message.includes('ENOENT')) {
        throw new Error(
          'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/ and run "gh auth login" first.'
        );
      }
      throw new Error(`Failed to set secret: ${message}`);
    }
  }

  // ============================================================================
  // Issue Comments & Monitoring (Phases 4-6)
  // ============================================================================

  async createIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<{ id: number; url: string }> {
    const client = await this.getClient();
    const { data } = await client.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
    return { id: data.id, url: data.html_url };
  }

  async getIssueComments(
    owner: string,
    repo: string,
    issueNumber: number,
    since?: string
  ): Promise<IssueComment[]> {
    const client = await this.getClient();
    const params: { owner: string; repo: string; issue_number: number; per_page: number; since?: string } = {
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    };
    if (since) {
      params.since = since;
    }

    const { data } = await client.rest.issues.listComments(params);
    return data.map(comment => ({
      id: comment.id,
      author: comment.user?.login || 'unknown',
      authorAvatarUrl: comment.user?.avatar_url || '',
      body: comment.body || '',
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      isBot: comment.user?.type === 'Bot' ||
             (comment.user?.login?.includes('[bot]') ?? false),
    }));
  }

  async getLinkedPullRequests(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<LinkedPullRequest[]> {
    const client = await this.getClient();
    const expectedBranch = `fix/issue-${issueNumber}`;

    try {
      const { data: pulls } = await client.rest.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: 30,
      });

      const linked = pulls.filter(pr =>
        pr.head.ref === expectedBranch ||
        pr.body?.includes(`#${issueNumber}`) ||
        pr.body?.includes(`fixes #${issueNumber}`) ||
        pr.body?.includes(`closes #${issueNumber}`)
      );

      const results: LinkedPullRequest[] = [];
      for (const pr of linked) {
        const { checksStatus, mergeable } = await this.getPrChecksStatus(owner, repo, pr.number);
        results.push({
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          state: pr.merged_at ? 'merged' : pr.state as 'open' | 'closed',
          branch: pr.head.ref,
          checksStatus,
          mergeable,
          draft: pr.draft ?? false,
        });
      }
      return results;
    } catch {
      return [];
    }
  }

  async getPrChecksStatus(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<{ checksStatus: 'pending' | 'passing' | 'failing' | 'unknown'; mergeable: boolean }> {
    const client = await this.getClient();
    try {
      const { data: pr } = await client.rest.pulls.get({ owner, repo, pull_number: prNumber });
      const { data: checks } = await client.rest.checks.listForRef({
        owner,
        repo,
        ref: pr.head.sha,
      });

      let checksStatus: 'pending' | 'passing' | 'failing' | 'unknown' = 'unknown';
      if (checks.total_count > 0) {
        const hasFailure = checks.check_runs.some(c =>
          c.conclusion === 'failure' || c.conclusion === 'cancelled'
        );
        const allComplete = checks.check_runs.every(c => c.status === 'completed');

        if (hasFailure) { checksStatus = 'failing'; }
        else if (allComplete) { checksStatus = 'passing'; }
        else { checksStatus = 'pending'; }
      }

      return { checksStatus, mergeable: pr.mergeable ?? false };
    } catch {
      return { checksStatus: 'unknown', mergeable: false };
    }
  }

  async addIssueLabels(
    owner: string,
    repo: string,
    issueNumber: number,
    labels: string[]
  ): Promise<void> {
    const client = await this.getClient();
    await this.ensureLabels(client, owner, repo, labels);
    await client.rest.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels,
    });
  }

  async assignIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    assignees: string[]
  ): Promise<void> {
    const client = await this.getClient();
    await client.rest.issues.addAssignees({
      owner,
      repo,
      issue_number: issueNumber,
      assignees,
    });
  }

  async getIssueLabels(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<string[]> {
    const client = await this.getClient();
    try {
      const { data } = await client.rest.issues.listLabelsOnIssue({
        owner,
        repo,
        issue_number: issueNumber,
      });
      return data.map(l => l.name);
    } catch {
      return [];
    }
  }

  async updateIssueBody(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<void> {
    const client = await this.getClient();
    await client.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
  }

  async closeIssue(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<void> {
    const client = await this.getClient();
    await client.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      state: 'closed',
    });
  }

  async getIssueBody(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<{ body: string | null; title: string | null }> {
    const client = await this.getClient();
    try {
      const { data } = await client.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });
      return { body: data.body || null, title: data.title || null };
    } catch {
      return { body: null, title: null };
    }
  }

  async checkWorkflowExists(
    owner: string,
    repo: string,
    workflowPath: string
  ): Promise<boolean> {
    const client = await this.getClient();
    try {
      await client.rest.repos.getContent({ owner, repo, path: workflowPath });
      return true;
    } catch {
      return false;
    }
  }

  async createRepo(name: string, description: string, isPrivate: boolean): Promise<RepoInfo> {
    const client = await this.getClient();

    const { data: repo } = await client.rest.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    });

    return {
      owner: repo.owner.login,
      repo: repo.name,
      defaultBranch: repo.default_branch,
      remoteUrl: repo.clone_url,
    };
  }

  async listIssues(owner: string, repo: string, page = 1, perPage = 30, labels?: string): Promise<{ issues: GitHubIssueListItem[]; hasMore: boolean }> {
    const client = await this.getClient();
    const params: Parameters<typeof client.rest.issues.listForRepo>[0] = {
      owner,
      repo,
      state: 'open',
      sort: 'created',
      direction: 'desc',
      per_page: perPage,
      page,
    };
    if (labels) { params.labels = labels; }
    const { data } = await client.rest.issues.listForRepo(params);

    const issues: GitHubIssueListItem[] = data
      .filter(item => !item.pull_request)
      .map(item => ({
        number: item.number,
        title: item.title,
        state: item.state as 'open' | 'closed',
        labels: (item.labels || []).map(l =>
          typeof l === 'string'
            ? { name: l, color: '6b7280' }
            : { name: l.name || '', color: l.color || '6b7280' }
        ),
        assignee: item.assignee?.login || null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        commentsCount: item.comments,
        url: item.html_url,
      }));

    return { issues, hasMore: data.length === perPage };
  }

  // ============================================================================
  // Open Review PRs (Oraculum)
  // ============================================================================

  async getOpenReviewPrs(
    owner: string,
    repo: string
  ): Promise<{ number: number; title: string; url: string }[]> {
    const client = await this.getClient();
    try {
      const { data: pulls } = await client.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 50,
      });

      return pulls
        .filter(pr =>
          /^fix\/issue-\d+$/.test(pr.head.ref) ||
          pr.title.toLowerCase().includes('oraculum review')
        )
        .map(pr => ({
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
        }));
    } catch {
      return [];
    }
  }

  // ============================================================================
  // Active Review Detection (Oraculum)
  // ============================================================================

  async getActiveReviewForBar(
    owner: string,
    repo: string,
    barName: string
  ): Promise<ActiveReviewInfo | null> {
    try {
      const { issues } = await this.listIssues(owner, repo, 1, 10, 'oraculum-review');
      const barLower = barName.toLowerCase();
      const issue = issues.find(i => i.title.toLowerCase().includes(barLower));
      if (!issue) { return null; }

      // Detect agent from comments
      let agent: 'claude' | 'copilot' | 'unknown' = 'unknown';
      try {
        const comments = await this.getIssueComments(owner, repo, issue.number);
        for (const c of comments) {
          const body = c.body.toLowerCase();
          if (body.includes('@claude')) { agent = 'claude'; break; }
          if (body.includes('@copilot')) { agent = 'copilot'; break; }
        }
        if (agent === 'unknown' && issue.assignee) {
          if (issue.assignee.toLowerCase().includes('copilot')) { agent = 'copilot'; }
        }
      } catch { /* best effort */ }

      // Check for linked PR
      let pr: ActiveReviewInfo['pr'];
      try {
        const prs = await this.getLinkedPullRequests(owner, repo, issue.number);
        if (prs.length > 0) {
          const linked = prs[0];
          pr = { number: linked.number, url: linked.url, title: linked.title, draft: linked.draft };
        }
      } catch { /* best effort */ }

      return {
        issueNumber: issue.number,
        issueUrl: issue.url,
        title: issue.title,
        agent,
        pr,
      };
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Scorecard API Methods
  // ============================================================================

  async getCodeQLAlerts(
    owner: string,
    repo: string
  ): Promise<{ critical: number; high: number; medium: number; low: number } | null> {
    const client = await this.getClient();
    try {
      const { data } = await client.rest.codeScanning.listAlertsForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 100,
      });
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      for (const alert of data) {
        const severity = (alert.rule as { security_severity_level?: string })?.security_severity_level || 'low';
        if (severity in counts) {
          counts[severity as keyof typeof counts]++;
        }
      }
      return counts;
    } catch {
      return null;
    }
  }

  async getDependabotAlerts(
    owner: string,
    repo: string
  ): Promise<{ critical: number; high: number; medium: number; low: number } | null> {
    const client = await this.getClient();
    try {
      const { data } = await client.request(
        'GET /repos/{owner}/{repo}/dependabot/alerts',
        { owner, repo, state: 'open', per_page: 100 }
      );
      const counts = { critical: 0, high: 0, medium: 0, low: 0 };
      for (const alert of data as Array<{ security_advisory?: { severity?: string } }>) {
        const severity = alert.security_advisory?.severity || 'low';
        if (severity in counts) {
          counts[severity as keyof typeof counts]++;
        }
      }
      return counts;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // GitHub User/Org Detection
  // ============================================================================

  async getAuthenticatedUser(): Promise<{ login: string; orgs: string[] }> {
    // Request read:org scope to see all org memberships (not just public)
    const session = await vscode.authentication.getSession('github', ['repo', 'read:org'], {
      createIfNone: false,
      silent: true,
    }) ?? await vscode.authentication.getSession('github', ['repo', 'read:org'], {
      createIfNone: true,
    });
    const orgClient = new Octokit({ auth: session.accessToken });

    const { data: user } = await orgClient.rest.users.getAuthenticated();
    const login = user.login;

    let orgs: string[] = [];
    try {
      const allOrgs: string[] = [];
      let page = 1;
      while (true) {
        const { data: orgList } = await orgClient.rest.orgs.listForAuthenticatedUser({
          per_page: 100,
          page,
        });
        if (orgList.length === 0) { break; }
        allOrgs.push(...orgList.map(o => o.login));
        if (orgList.length < 100) { break; }
        page++;
      }
      orgs = allOrgs;
    } catch { /* ignore if org listing fails */ }

    return { login, orgs };
  }

  // ============================================================================
  // Org Scanner Methods (Phase 2)
  // ============================================================================

  async listOrgRepos(org: string): Promise<OrgRepo[]> {
    const client = await this.getClient();
    const repos: OrgRepo[] = [];
    let page = 1;

    while (true) {
      try {
        // Try org endpoint first, fall back to user repos
        let data: Array<{
          name: string; full_name: string; description: string | null;
          language: string | null; html_url: string; default_branch: string;
          updated_at: string; topics?: string[]; archived: boolean; fork: boolean;
        }>;

        try {
          const response = await client.rest.repos.listForOrg({
            org,
            type: 'sources',
            sort: 'updated',
            per_page: 100,
            page,
          });
          data = response.data;
        } catch {
          // If org listing fails (e.g., personal account), try user repos
          const response = await client.rest.repos.listForUser({
            username: org,
            type: 'owner',
            sort: 'updated',
            per_page: 100,
            page,
          });
          data = response.data;
        }

        if (data.length === 0) { break; }

        for (const repo of data) {
          if (repo.archived || repo.fork) { continue; }
          repos.push({
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description || '',
            language: repo.language,
            url: repo.html_url,
            defaultBranch: repo.default_branch,
            updatedAt: repo.updated_at,
            topics: repo.topics || [],
            readme: '',
            isArchived: repo.archived,
            isFork: repo.fork,
          });
        }

        if (data.length < 100) { break; }
        page++;
      } catch {
        break;
      }
    }

    return repos;
  }

  async getRepoReadme(owner: string, repo: string): Promise<string> {
    const client = await this.getClient();
    try {
      const { data } = await client.rest.repos.getReadme({ owner, repo });
      const content = Buffer.from(data.content, 'base64').toString('utf8');
      // Truncate to ~2000 chars to fit within LLM context
      return content.length > 2000 ? content.slice(0, 2000) + '\n...(truncated)' : content;
    } catch {
      return '';
    }
  }

  async getWorkflowRuns(
    owner: string,
    repo: string
  ): Promise<WorkflowRunSummary[]> {
    const client = await this.getClient();
    try {
      const { data } = await client.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: 30,
      });

      const latestByName = new Map<string, WorkflowRunSummary>();
      for (const run of data.workflow_runs) {
        const name = run.name || 'Unknown';
        const existing = latestByName.get(name);
        if (!existing || new Date(run.updated_at) > new Date(existing.updatedAt)) {
          latestByName.set(name, {
            name,
            status: run.conclusion === 'success' ? 'success'
                  : run.conclusion === 'failure' ? 'failure'
                  : run.status === 'in_progress' || run.status === 'queued' ? 'pending'
                  : 'unknown',
            conclusion: run.conclusion,
            url: run.html_url,
            updatedAt: run.updated_at,
          });
        }
      }
      return Array.from(latestByName.values());
    } catch {
      return [];
    }
  }
}
