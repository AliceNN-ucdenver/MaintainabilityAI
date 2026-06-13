import type { GitHubService } from './GitHubService';

/**
 * SampleRepoStager — clean-slate "fresh start" for the IMDB-Lite workshop
 * sample repos on GitHub.
 *
 * When the user runs `Looking Glass → Create Sample Platform → IMDB-Lite`,
 * the mesh side is re-seeded AND (after an explicit confirm) the four sample
 * code repos are staged to a clean starting state so a fresh agentic-SDLC OKR
 * run starts from zero accumulated test state:
 *
 *   - close any open PRs + issues left by prior runs,
 *   - delete non-default branches (the leftover `copilot/*` fan-out branches),
 *   - **greenfield** repos (celeb-api): reset `main` to a fresh root commit
 *     (README + .gitignore) so the design-bus fan-out builds the service from
 *     the PRD — the repo reads as "exists but not yet scaffolded" (the
 *     fan-out's scaffold-complete check keys on the harness file, not isEmpty),
 *   - **brownfield** repos (movie-api, imdb-react-frontend, imdb-identity):
 *     leave `main` untouched — it IS the baseline; only the branches/PRs/issues
 *     are cleaned.
 *
 * Every operation is best-effort and soft-fails per item so one repo's missing
 * access doesn't abort the batch; failures are collected into the result.
 *
 * The repo names mirror MeshService's WORKSHOP_REPOS_LITE / WORKSHOP_REPOS_CELEBS
 * (the app.yaml repo declarations); celeb-api is the greenfield BAR target.
 */

export type RepoMode = 'greenfield' | 'brownfield';

export interface SampleRepoSpec {
  slug: string;
  mode: RepoMode;
}

/** The IMDB-Lite sample repos and their staging mode. Single source of truth. */
export const IMDB_LITE_SAMPLE_REPOS: readonly SampleRepoSpec[] = [
  { slug: 'celeb-api', mode: 'greenfield' },
  { slug: 'movie-api', mode: 'brownfield' },
  { slug: 'imdb-react-frontend', mode: 'brownfield' },
  { slug: 'imdb-identity', mode: 'brownfield' },
] as const;

export interface RepoScan {
  slug: string;
  mode: RepoMode;
  exists: boolean;
  openPrs: number;
  openIssues: number;
  nonDefaultBranches: number;
  defaultBranch: string;
}

export interface StageScan {
  org: string;
  repos: RepoScan[];
  totalOpenPrs: number;
  totalOpenIssues: number;
  totalBranches: number;
  /** True when there is anything destructive to do (drives the confirm modal). */
  hasExistingState: boolean;
}

export interface RepoStageResult {
  slug: string;
  mode: RepoMode;
  created: boolean;
  closedPrs: number;
  closedIssues: number;
  deletedBranches: number;
  resetMain: boolean;
  skipped?: string;
  errors: string[];
}

export interface StageResult {
  org: string;
  repos: RepoStageResult[];
}

/** Greenfield starting content — a non-scaffolded repo the fan-out builds. */
function greenfieldFiles(slug: string): Array<{ path: string; content: string }> {
  return [
    {
      path: 'README.md',
      content: `# ${slug}

Greenfield sample for the **MaintainabilityAI IMDB-Lite** workshop platform.

This repository starts empty **by design** — the agentic SDLC
(WHY → HOW → WHAT → implement) builds it from the OKR's PRD and the governance
mesh. Don't hand-author code here; dispatch the fan-out from Looking Glass and
let the Copilot agent personas implement it under the Red Queen's deterministic
policy.
`,
    },
    {
      path: '.gitignore',
      content: `node_modules/
dist/
build/
coverage/
*.log
.env
.env.*
.DS_Store
`,
    },
  ];
}

export class SampleRepoStager {
  constructor(
    private readonly github: GitHubService,
    private readonly repos: readonly SampleRepoSpec[] = IMDB_LITE_SAMPLE_REPOS,
  ) {}

  /**
   * Read-only pre-flight: how much existing state each repo carries. Drives
   * the confirmation modal so the user sees exactly what "fresh start" wipes.
   */
  async scan(org: string): Promise<StageScan> {
    const repos: RepoScan[] = [];
    for (const spec of this.repos) {
      const existence = await this.github.getRepoExistence(org, spec.slug);
      if (existence.status !== 'exists') {
        repos.push({
          slug: spec.slug, mode: spec.mode, exists: false,
          openPrs: 0, openIssues: 0, nonDefaultBranches: 0, defaultBranch: 'main',
        });
        continue;
      }
      const [openPrs, openIssues, branches] = await Promise.all([
        this.github.listOpenPullNumbers(org, spec.slug).catch(() => [] as number[]),
        this.github.listOpenIssueNumbers(org, spec.slug).catch(() => [] as number[]),
        this.github.listNonDefaultBranches(org, spec.slug).catch(() => [] as string[]),
      ]);
      repos.push({
        slug: spec.slug, mode: spec.mode, exists: true,
        openPrs: openPrs.length,
        openIssues: openIssues.length,
        nonDefaultBranches: branches.length,
        defaultBranch: existence.defaultBranch,
      });
    }
    const totalOpenPrs = repos.reduce((n, r) => n + r.openPrs, 0);
    const totalOpenIssues = repos.reduce((n, r) => n + r.openIssues, 0);
    const totalBranches = repos.reduce((n, r) => n + r.nonDefaultBranches, 0);
    // "Existing state" = anything we'd close/delete, OR a greenfield repo that
    // already exists with content (its main will be reset).
    const hasExistingState =
      totalOpenPrs + totalOpenIssues + totalBranches > 0 ||
      repos.some(r => r.exists && r.mode === 'greenfield');
    return { org, repos, totalOpenPrs, totalOpenIssues, totalBranches, hasExistingState };
  }

  /** Destructive: clean-slate reset across all sample repos. */
  async execute(org: string): Promise<StageResult> {
    const out: RepoStageResult[] = [];
    for (const spec of this.repos) {
      out.push(await this.stageOne(org, spec));
    }
    return { org, repos: out };
  }

  private async stageOne(org: string, spec: SampleRepoSpec): Promise<RepoStageResult> {
    const r: RepoStageResult = {
      slug: spec.slug, mode: spec.mode, created: false,
      closedPrs: 0, closedIssues: 0, deletedBranches: 0, resetMain: false, errors: [],
    };
    const existence = await this.github.getRepoExistence(org, spec.slug);

    if (existence.status === 'not-found') {
      if (spec.mode === 'brownfield') {
        r.skipped = 'repo not found — brownfield repos are never created by staging';
        return r;
      }
      // Greenfield + missing → create empty, then seed the root commit.
      const created = await this.github.createOrgRepo(org, spec.slug, {
        description: `IMDB-Lite greenfield sample (${spec.slug})`,
        visibility: 'public',
        autoInit: false,
      });
      if (created.status === 'forbidden' || created.status === 'fetch-error') {
        r.errors.push(`create failed: ${created.reason}`);
        return r;
      }
      r.created = created.status === 'created';
      try {
        await this.github.resetBranchToRootCommit(org, spec.slug, 'main', greenfieldFiles(spec.slug), 'Initial commit (greenfield reset)');
        r.resetMain = true;
      } catch (err) {
        r.errors.push(`seed root commit failed: ${msg(err)}`);
      }
      return r;
    }

    if (existence.status === 'fetch-error') {
      r.errors.push(`existence probe failed: ${existence.reason}`);
      return r;
    }

    // Exists — clean branches/PRs/issues regardless of mode.
    const [openPrs, openIssues, branches] = await Promise.all([
      this.github.listOpenPullNumbers(org, spec.slug).catch(() => [] as number[]),
      this.github.listOpenIssueNumbers(org, spec.slug).catch(() => [] as number[]),
      this.github.listNonDefaultBranches(org, spec.slug).catch(() => [] as string[]),
    ]);

    for (const pr of openPrs) {
      try { await this.github.closePullRequest(org, spec.slug, pr); r.closedPrs++; }
      catch (err) { r.errors.push(`close PR #${pr}: ${msg(err)}`); }
    }
    for (const issue of openIssues) {
      try { await this.github.closeIssue(org, spec.slug, issue); r.closedIssues++; }
      catch (err) { r.errors.push(`close issue #${issue}: ${msg(err)}`); }
    }
    for (const branch of branches) {
      try { await this.github.deleteBranch(org, spec.slug, branch); r.deletedBranches++; }
      catch (err) { r.errors.push(`delete branch ${branch}: ${msg(err)}`); }
    }

    // Greenfield only: wipe main back to a fresh root commit.
    if (spec.mode === 'greenfield') {
      try {
        await this.github.resetBranchToRootCommit(org, spec.slug, existence.defaultBranch, greenfieldFiles(spec.slug), 'Initial commit (greenfield reset)');
        r.resetMain = true;
      } catch (err) {
        r.errors.push(`reset ${existence.defaultBranch} to greenfield: ${msg(err)}`);
      }
    }
    return r;
  }
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
