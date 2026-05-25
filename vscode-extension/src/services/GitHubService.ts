import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import type { IssueCreationRequest, IssueCreationResult, RepoInfo, IssueComment, LinkedPullRequest, GitHubIssueListItem, WorkflowRunSummary, OrgRepo, ActiveReviewInfo } from '../types';
import { promptPackService } from './PromptPackService';
import { toErrorMessage } from '../utils/errors';
import { parseGitHubUrl, getRemoteOriginUrl, getCurrentBranch } from '../utils/git';

/**
 * Octokit's default request layer prints a `[@octokit/request] "GET ..." is
 * deprecated` warning to console.warn on EVERY contents-API call where the
 * path contains URL-encoded slashes (`%2F`). GitHub sunsets that encoded form
 * in March 2028; until then every call spams 1 warning. We log the first
 * occurrence per unique endpoint so the signal isn't lost, then suppress the
 * duplicates. Drop the wrapper once @octokit/request fixes the path encoding
 * upstream OR we migrate off the path-style contents endpoint.
 */
const seenDeprecations = new Set<string>();
function makeQuieterLogger() {
  return {
    debug: () => { /* noop — too verbose */ },
    info:  () => { /* noop */ },
    warn:  (...args: unknown[]) => {
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      const isDeprecation = /\[@octokit\/request\].+is deprecated/.test(msg);
      if (isDeprecation) {
        const sig = msg.match(/"GET ([^"]+)"/)?.[1] ?? msg;
        if (seenDeprecations.has(sig)) { return; }
        seenDeprecations.add(sig);
      }
      console.warn(...args);
    },
    error: console.error,
  };
}

export class GitHubService {
  /**
   * Parse a GitHub URL into { owner, repo } or return null.
   * Handles https://github.com/org/repo, git@github.com:org/repo.git, etc.
   */
  static parseRepoUrl(url: string): { owner: string; repo: string } | null {
    return parseGitHubUrl(url);
  }

  private octokit: Octokit | null = null;

  async getToken(): Promise<string> {
    const session = await vscode.authentication.getSession('github', ['repo'], {
      createIfNone: true,
    });
    return session.accessToken;
  }

  async getClient(): Promise<Octokit> {
    if (!this.octokit) {
      const token = await this.getToken();
      this.octokit = new Octokit({ auth: token, log: makeQuieterLogger() });
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

    return this.parseGitRepo(repo);
  }

  async detectRepoForFolder(folderPath: string): Promise<RepoInfo | null> {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      return this.detectRepoViaGitCli(folderPath);
    }

    const git = gitExtension.isActive
      ? gitExtension.exports
      : await gitExtension.activate();

    const api = git.getAPI(1);
    // Only match the specific folder — don't fall back to repositories[0]
    const repo = api.repositories.find((r: { rootUri: vscode.Uri }) => r.rootUri.fsPath === folderPath);
    if (repo) {
      const parsed = this.parseGitRepo(repo);
      if (parsed) { return parsed; }
    }

    // Fallback: git extension may not have indexed this folder yet (e.g. freshly cloned).
    // Shell out to git directly.
    return this.detectRepoViaGitCli(folderPath);
  }

  private async detectRepoViaGitCli(folderPath: string): Promise<RepoInfo | null> {
    const url = await getRemoteOriginUrl(folderPath);
    if (!url) { return null; }
    const parsed = parseGitHubUrl(url);
    if (!parsed) { return null; }
    const branch = await getCurrentBranch(folderPath);
    return { owner: parsed.owner, repo: parsed.repo, defaultBranch: branch, remoteUrl: url };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseGitRepo(repo: any): RepoInfo | null {
    const remotes = repo.state.remotes;
    const origin = remotes.find((r: { name: string }) => r.name === 'origin') || remotes[0];
    if (!origin) {
      return null;
    }

    const url = origin.fetchUrl || origin.pushUrl || '';
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return null;
    }

    return {
      owner: parsed.owner,
      repo: parsed.repo,
      defaultBranch: repo.state.HEAD?.name || 'main',
      remoteUrl: url,
    };
  }

  async createIssue(request: IssueCreationRequest): Promise<IssueCreationResult> {
    const client = await this.getClient();

    // Ensure labels exist
    const labels = promptPackService.generateLabels(request);
    await this.ensureLabels(client, request.repo.owner, request.repo.repo, labels);

    // Build issue body
    const body = promptPackService.buildRabbitHoleIssue(request);

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

  /**
   * Create-or-update a label with explicit name + color + description.
   * Idempotent: if the label exists, updates color + description to
   * match the canonical spec; if not, creates it. Returns 'created' |
   * 'updated' | 'unchanged' so callers can surface a precise summary.
   *
   * Color must be 6-char hex with no leading `#` (GitHub convention).
   *
   * Used by Phase B/C label provisioning per the MESH_LABELS catalog
   * — see vscode-extension/src/templates/meshLabels.ts. Falls back to
   * `ensureLabels`'s implicit creation path when the canonical catalog
   * is not the source (e.g. ad-hoc OWASP/STRIDE labels on Cheshire-side
   * issue creation).
   */
  async createOrUpdateLabel(
    owner: string,
    repo: string,
    spec: { name: string; description: string; color: string },
  ): Promise<'created' | 'updated' | 'unchanged'> {
    const client = await this.getClient();
    let existing: { name: string; color: string; description: string | null } | null = null;
    try {
      const { data } = await client.rest.issues.getLabel({ owner, repo, name: spec.name });
      existing = data;
    } catch {
      existing = null;  // 404 = label doesn't exist
    }
    if (!existing) {
      await client.rest.issues.createLabel({
        owner,
        repo,
        name: spec.name,
        color: spec.color,
        description: spec.description,
      });
      return 'created';
    }
    // Only re-PATCH when content differs — avoids needless API churn.
    if (existing.color === spec.color && (existing.description ?? '') === spec.description) {
      return 'unchanged';
    }
    await client.rest.issues.updateLabel({
      owner,
      repo,
      name: spec.name,
      color: spec.color,
      description: spec.description,
    });
    return 'updated';
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

  /**
   * Returns the set of Actions secret names configured on the repo, or null if
   * the call fails (no auth, no access, network error). Names only — values are
   * not exposed by the GitHub API.
   */
  async listRepoSecretNames(owner: string, repo: string): Promise<Set<string> | null> {
    try {
      const client = await this.getClient();
      const { data } = await client.rest.actions.listRepoSecrets({ owner, repo, per_page: 100 });
      return new Set(data.secrets.map(s => s.name));
    } catch {
      return null;
    }
  }

  async setRepoSecret(
    owner: string,
    repo: string,
    secretName: string,
    secretValue: string
  ): Promise<void> {
    // Use gh CLI to set the secret — it handles libsodium encryption internally
    const { execFileAsync } = await import('../utils/exec');

    try {
      await execFileAsync('gh', [
        'secret', 'set', secretName,
        '--repo', `${owner}/${repo}`,
        '--body', secretValue,
      ]);
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      if (message.includes('not found') || message.includes('ENOENT')) {
        throw new Error(
          'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/ and run "gh auth login" first.'
        );
      }
      throw new Error(`Failed to set secret: ${message}`);
    }
  }

  /**
   * Returns the names of secrets configured on the given Environment (e.g.
   * `copilot`), or null if the environment doesn't exist / access denied.
   * The `copilot` environment is the secret store the Copilot Coding Agent
   * actually reads from at runtime — distinct from repo-wide Actions secrets.
   */
  async listEnvironmentSecretNames(
    owner: string,
    repo: string,
    environmentName: string,
  ): Promise<Set<string> | null> {
    try {
      const client = await this.getClient();
      const { data } = await client.rest.actions.listEnvironmentSecrets({
        owner,
        repo,
        environment_name: environmentName,
        per_page: 100,
      });
      return new Set(data.secrets.map(s => s.name));
    } catch {
      return null;
    }
  }

  /**
   * Set or update a secret on a repository Environment. The Copilot Coding
   * Agent runtime reads from this store; the agentic-SDLC search Skills
   * (`skill-tavily-search`, `skill-uspto-search`, etc.) pull their API keys
   * from environment-scoped secrets via `process.env`.
   *
   * Implementation: shells out to `gh secret set --env <name>`, which handles
   * the libsodium sealed-box encryption against the env's public key. Same
   * pattern as `setRepoSecret` for Actions secrets — keeps the dependency
   * surface minimal (no libsodium-wrappers required).
   */
  async setEnvironmentSecret(
    owner: string,
    repo: string,
    environmentName: string,
    secretName: string,
    secretValue: string,
  ): Promise<void> {
    const { execFileAsync } = await import('../utils/exec');

    try {
      await execFileAsync('gh', [
        'secret', 'set', secretName,
        '--repo', `${owner}/${repo}`,
        '--env', environmentName,
        '--body', secretValue,
      ]);
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      if (message.includes('not found') || message.includes('ENOENT')) {
        throw new Error(
          'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/ and run "gh auth login" first.'
        );
      }
      throw new Error(`Failed to set env secret: ${message}`);
    }
  }

  /**
   * Returns true if the named Environment (e.g. `copilot`) exists on the repo.
   * The `copilot` environment is created automatically by GitHub the first
   * time the Coding Agent runs in the repo; if a user hasn't dispatched the
   * agent yet, the env may not exist and secret operations will fail.
   */
  async environmentExists(
    owner: string,
    repo: string,
    environmentName: string,
  ): Promise<boolean> {
    try {
      const client = await this.getClient();
      // The Octokit-generated REST namespace doesn't include getEnvironment
      // (Environments API is partially typed); use the raw request to be safe.
      await client.request('GET /repos/{owner}/{repo}/environments/{environment_name}', {
        owner, repo, environment_name: environmentName,
      });
      return true;
    } catch {
      return false;
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

      const issueRef = `#${issueNumber}`;
      const linked = pulls.filter(pr =>
        pr.head.ref === expectedBranch ||
        pr.head.ref.includes(`issue-${issueNumber}`) ||
        pr.body?.includes(issueRef) ||
        pr.body?.includes(`fixes ${issueRef}`) ||
        pr.body?.includes(`closes ${issueRef}`) ||
        pr.body?.includes(`resolves ${issueRef}`) ||
        pr.title?.includes(issueRef)
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
          reviewRequested: (pr.requested_reviewers?.length ?? 0) > 0,
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

  /**
   * Assign GitHub Copilot Coding Agent to an issue and pick a CUSTOM
   * agent persona declared under `.github/agents/<name>.agent.md` in
   * the target repo.
   *
   * Uses the `agent_assignment` body extension on the standard
   * `POST /repos/{owner}/{repo}/issues/{n}/assignees` endpoint — this
   * is the actual API for Copilot custom-agent dispatch. Octokit's
   * generated `addAssignees` doesn't expose this field, so we use the
   * raw `client.request` API directly.
   *
   * The standard `assignees: ['copilot-swe-agent[bot]']` array stays
   * required — that's what flips the issue to Copilot Coding Agent
   * in the UI. The `agent_assignment` object then refines which
   * `.agent.md` persona Copilot loads for this session.
   *
   * @param customInstructions  Optional per-dispatch guidance shown to
   *                            the agent (e.g. "focus on EU GDPR
   *                            compliance"). Appended to the agent's
   *                            system prompt at runtime.
   * @param baseBranch          Defaults to `main`. Override when the
   *                            agent should branch off a non-default
   *                            branch.
   * @param model               Optional model id override; empty
   *                            string uses the model declared in the
   *                            agent's `.agent.md` frontmatter.
   */
  async assignCustomCopilotAgent(
    owner: string,
    repo: string,
    issueNumber: number,
    customAgent: string,
    options: { customInstructions?: string; baseBranch?: string; model?: string } = {},
  ): Promise<void> {
    const client = await this.getClient();
    await client.request('POST /repos/{owner}/{repo}/issues/{issue_number}/assignees', {
      owner,
      repo,
      issue_number: issueNumber,
      assignees: ['copilot-swe-agent[bot]'],
      agent_assignment: {
        target_repo: `${owner}/${repo}`,
        base_branch: options.baseBranch ?? 'main',
        custom_agent: customAgent,
        custom_instructions: options.customInstructions ?? '',
        model: options.model ?? '',
      },
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }

  /**
   * List every user/bot login that can be assigned to issues + PRs in
   * this repo. When Copilot Coding Agent custom agents are configured
   * (via `.github/agents/<name>.agent.md` files), they appear here
   * alongside humans + the `copilot-swe-agent[bot]` standard bot. Use
   * this to auto-discover the canonical login string for a specific
   * agent rather than guessing at the format.
   *
   * Paginates up to 100 — single API call covers everything for any
   * reasonable mesh repo. Returns empty array on error so callers can
   * fall back to the default `copilot-swe-agent[bot]`.
   */
  async listAssignees(owner: string, repo: string): Promise<{ login: string; type: string }[]> {
    try {
      const client = await this.getClient();
      const { data } = await client.rest.issues.listAssignees({
        owner,
        repo,
        per_page: 100,
      });
      return data.map(u => ({ login: u.login, type: u.type }));
    } catch {
      return [];
    }
  }

  /**
   * Remove a single label from an issue or PR. Tolerates the
   * "label-not-on-issue" 404 — calling code shouldn't have to pre-check
   * which labels are present before trying to clear them.
   */
  async removeIssueLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    label: string
  ): Promise<void> {
    const client = await this.getClient();
    try {
      await client.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label,
      });
    } catch (err: unknown) {
      // 404 = label wasn't on the issue. That's a no-op for us.
      const status = (err as { status?: number }).status;
      if (status === 404) { return; }
      throw err;
    }
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

  /**
   * Close a pull request without merging (D-PR1.v1.1).
   * Used by the phase-reset flow to clean up stale draft PRs associated
   * with a phase being rolled back. Best-effort — soft-fails if the PR
   * doesn't exist or is already closed.
   */
  async closePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<void> {
    const client = await this.getClient();
    await client.rest.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
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

  /**
   * Flip a draft PR to ready-for-review. GitHub's REST API doesn't
   * expose this directly — you have to use the GraphQL `markPullRequestReadyForReview`
   * mutation. Returns true on success, false on any failure (logged for
   * triage). Used by the Looking Glass "Mark PR ready" affordance when
   * the agent requested a review but didn't transition out of draft.
   */
  async markPullRequestReadyForReview(owner: string, repo: string, prNumber: number): Promise<boolean> {
    const client = await this.getClient();
    try {
      // Need the PR's node_id for the GraphQL mutation.
      const { data: pr } = await client.rest.pulls.get({ owner, repo, pull_number: prNumber });
      const nodeId = (pr as { node_id?: string }).node_id;
      if (!nodeId) { return false; }
      await client.graphql(
        `mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { pullRequest { isDraft } } }`,
        { id: nodeId },
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Merge a pull request via the REST API. Returns merge SHA on success
   * or null on failure (e.g. branch protection blocked it, mergeability
   * conflict, missing required check). Caller logs the error.
   *
   * Method defaults to 'squash' — single commit per artifact PR matches
   * the agentic pipeline's audit shape (one PR = one phase = one
   * traceable commit on main). Use 'merge' if you want full history.
   */
  async mergePullRequest(
    owner: string,
    repo: string,
    prNumber: number,
    method: 'merge' | 'squash' | 'rebase' = 'squash',
    commitTitle?: string,
  ): Promise<{ ok: true; sha: string } | { ok: false; reason: string }> {
    const client = await this.getClient();
    try {
      const { data } = await client.rest.pulls.merge({
        owner,
        repo,
        pull_number: prNumber,
        merge_method: method,
        commit_title: commitTitle,
      });
      if (data.merged && data.sha) {
        return { ok: true, sha: data.sha };
      }
      return { ok: false, reason: data.message ?? 'merge returned merged=false without a reason' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, reason: message };
    }
  }

  /**
   * Fetch a file's contents from the repo as a UTF-8 string. Returns null
   * if the file doesn't exist or any other GET error. Used by the OKR
   * detail page's phase-signal loader to read audit JSONL + artifact MD
   * live from GitHub without requiring a local mesh pull.
   */
  async getRepoFileText(owner: string, repo: string, path: string, ref?: string): Promise<string | null> {
    const client = await this.getClient();
    try {
      const { data } = await client.rest.repos.getContent({ owner, repo, path, ref });
      if (Array.isArray(data) || data.type !== 'file' || typeof data.content !== 'string') {
        return null;
      }
      return Buffer.from(data.content, data.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8');
    } catch {
      return null;
    }
  }

  /**
   * Codex E4-r1-followup (2026-05-25) — same as getRepoFileText but
   * returns a discriminated union that distinguishes the three failure
   * classes the rollup evidence check needs to tell apart:
   *
   *   - `ok`         — file exists on the canonical branch; here are
   *                    its bytes.
   *   - `not-found`  — GitHub returned 404. The file legitimately does
   *                    NOT exist canonically. Callers that gate
   *                    evidence on canonical existence MUST treat this
   *                    as definitive missing — a local file with the
   *                    same name is by definition uncommitted /
   *                    never-pushed and does not count as evidence.
   *   - `fetch-error` — non-404 failure (auth, rate-limit, network,
   *                    timeout, dir-not-file). True existence is
   *                    unknown. Callers MAY fall back to local
   *                    existence as a conservative move so an
   *                    innocent transient failure doesn't punish.
   *
   * getRepoFileText keeps its current `string | null` contract — the
   * 11 other call sites either don't care about the distinction
   * (they only read bytes) or already have their own atomicity logic
   * around the result. Only the rollup's artifact-existence check
   * needs to discriminate.
   */
  async getRepoFileStatus(owner: string, repo: string, path: string, ref?: string): Promise<
    | { status: 'ok'; text: string }
    | { status: 'not-found' }
    | { status: 'fetch-error'; reason: string }
  > {
    const client = await this.getClient();
    try {
      const { data } = await client.rest.repos.getContent({ owner, repo, path, ref });
      if (Array.isArray(data)) {
        // The path resolved to a directory. For our use case
        // (file-existence check) this is a "not-found" for the
        // expected file path. Treat as not-found rather than
        // fetch-error to avoid letting a wrong-shape local path
        // silently count as evidence.
        return { status: 'not-found' };
      }
      if (data.type !== 'file' || typeof data.content !== 'string') {
        return { status: 'not-found' };
      }
      const text = Buffer.from(data.content, data.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8');
      return { status: 'ok', text };
    } catch (err) {
      // Octokit decorates errors with HTTP `.status`. 404 = legitimate
      // missing-on-canonical. Anything else (401, 403, 422, 5xx,
      // network timeout, etc.) is a true fetch-error where existence
      // is unknown.
      const status = (err as { status?: number })?.status;
      if (status === 404) { return { status: 'not-found' }; }
      const reason = err instanceof Error ? err.message : String(err);
      return { status: 'fetch-error', reason };
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
    const orgClient = new Octokit({ auth: session.accessToken, log: makeQuieterLogger() });

    const { data: user } = await orgClient.rest.users.getAuthenticated();
    const login = user.login;

    let orgs: string[] = [];
    try {
      const allOrgs: string[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { data: orgList } = await orgClient.rest.orgs.listForAuthenticatedUser({
          per_page: 100,
          page,
        });
        if (orgList.length === 0) { break; }
        allOrgs.push(...orgList.map(o => o.login));
        hasMore = orgList.length >= 100;
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
    let hasMore = true;

    while (hasMore) {
      try {
        // Try org endpoint first, fall back to user repos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any[];

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

        hasMore = data.length >= 100;
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
                  : run.status === 'waiting' || run.conclusion === 'action_required' ? 'waiting'
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

  async getWaitingWorkflowRuns(
    owner: string,
    repo: string
  ): Promise<{ name: string; url: string; runId: number }[]> {
    const client = await this.getClient();
    try {
      // Check for both 'waiting' (environment protection) and 'action_required' (first-time approval)
      const [waiting, actionRequired] = await Promise.all([
        client.rest.actions.listWorkflowRunsForRepo({
          owner, repo,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: 'waiting' as any,
          per_page: 10,
        }),
        client.rest.actions.listWorkflowRunsForRepo({
          owner, repo,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: 'action_required' as any,
          per_page: 10,
        }),
      ]);
      const allRuns = [...waiting.data.workflow_runs, ...actionRequired.data.workflow_runs];
      // Deduplicate by run ID
      const seen = new Set<number>();
      return allRuns.filter(run => {
        if (seen.has(run.id)) { return false; }
        seen.add(run.id);
        return true;
      }).map(run => ({
        name: run.name || 'Unknown',
        url: run.html_url,
        runId: run.id,
      }));
    } catch {
      return [];
    }
  }
}

/** Singleton GitHub service — shares a single Octokit auth session. */
export const githubService = new GitHubService();
