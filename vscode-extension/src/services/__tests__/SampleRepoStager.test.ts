import { describe, it, expect } from 'vitest';
import { SampleRepoStager, type SampleRepoSpec } from '../SampleRepoStager';
import type { GitHubService } from '../GitHubService';

type Existence =
  | { status: 'exists'; isEmpty: boolean; defaultBranch: string }
  | { status: 'not-found' }
  | { status: 'fetch-error'; reason: string };

interface RepoState {
  existence: Existence;
  openPrs: number[];
  openIssues: number[];
  branches: string[]; // non-default
}

/** Records every mutating call so tests can assert what staging did. */
class FakeGitHub {
  closedPrs: Array<[string, number]> = [];
  closedIssues: Array<[string, number]> = [];
  deletedBranches: Array<[string, string]> = [];
  resets: Array<{ repo: string; branch: string; files: string[] }> = [];
  created: string[] = [];

  constructor(private state: Record<string, RepoState>) {}

  private s(slug: string): RepoState {
    return this.state[slug] ?? { existence: { status: 'not-found' }, openPrs: [], openIssues: [], branches: [] };
  }

  async getRepoExistence(_org: string, slug: string): Promise<Existence> {
    return this.s(slug).existence;
  }
  async listOpenPullNumbers(_org: string, slug: string): Promise<number[]> {
    return [...this.s(slug).openPrs];
  }
  async listOpenIssueNumbers(_org: string, slug: string): Promise<number[]> {
    return [...this.s(slug).openIssues];
  }
  async listNonDefaultBranches(_org: string, slug: string): Promise<string[]> {
    return [...this.s(slug).branches];
  }
  async closePullRequest(_org: string, slug: string, n: number): Promise<void> {
    this.closedPrs.push([slug, n]);
  }
  async closeIssue(_org: string, slug: string, n: number): Promise<void> {
    this.closedIssues.push([slug, n]);
  }
  async deleteBranch(_org: string, slug: string, b: string): Promise<void> {
    this.deletedBranches.push([slug, b]);
  }
  async resetBranchToRootCommit(_org: string, slug: string, branch: string, files: Array<{ path: string; content: string }>): Promise<{ commitSha: string }> {
    this.resets.push({ repo: slug, branch, files: files.map(f => f.path) });
    return { commitSha: 'deadbeef' };
  }
  async createOrgRepo(_org: string, slug: string): Promise<{ status: 'created'; defaultBranch: string; htmlUrl: string }> {
    this.created.push(slug);
    return { status: 'created', defaultBranch: 'main', htmlUrl: `https://github.com/x/${slug}` };
  }
}

const SPEC: SampleRepoSpec[] = [
  { slug: 'celeb-api', mode: 'greenfield' },
  { slug: 'movie-api', mode: 'brownfield' },
];

function stager(state: Record<string, RepoState>, spec = SPEC) {
  const fake = new FakeGitHub(state);
  return { fake, stager: new SampleRepoStager(fake as unknown as GitHubService, spec) };
}

describe('SampleRepoStager', () => {
  it('greenfield repo: closes PRs+issues, deletes non-default branches, resets main', async () => {
    const { fake, stager: s } = stager({
      'celeb-api': {
        existence: { status: 'exists', isEmpty: false, defaultBranch: 'main' },
        openPrs: [1, 2], openIssues: [3], branches: ['copilot/a', 'copilot/b'],
      },
      'movie-api': {
        existence: { status: 'exists', isEmpty: false, defaultBranch: 'main' },
        openPrs: [], openIssues: [], branches: [],
      },
    });
    const res = await s.execute('org');
    const celeb = res.repos.find(r => r.slug === 'celeb-api')!;
    expect(celeb.closedPrs).toBe(2);
    expect(celeb.closedIssues).toBe(1);
    expect(celeb.deletedBranches).toBe(2);
    expect(celeb.resetMain).toBe(true);
    expect(celeb.errors).toEqual([]);
    // celeb-api main reset to README + .gitignore root commit.
    const reset = fake.resets.find(r => r.repo === 'celeb-api')!;
    expect(reset.branch).toBe('main');
    expect(reset.files.sort()).toEqual(['.gitignore', 'README.md']);
  });

  it('brownfield repo: cleans branches/PRs/issues but NEVER resets main', async () => {
    const { fake, stager: s } = stager({
      'celeb-api': { existence: { status: 'exists', isEmpty: false, defaultBranch: 'main' }, openPrs: [], openIssues: [], branches: [] },
      'movie-api': {
        existence: { status: 'exists', isEmpty: false, defaultBranch: 'main' },
        openPrs: [10], openIssues: [11, 12], branches: ['copilot/x', 'copilot/y', 'copilot/z'],
      },
    });
    const res = await s.execute('org');
    const movie = res.repos.find(r => r.slug === 'movie-api')!;
    expect(movie.closedPrs).toBe(1);
    expect(movie.closedIssues).toBe(2);
    expect(movie.deletedBranches).toBe(3);
    expect(movie.resetMain).toBe(false);
    // No reset commit on any brownfield repo.
    expect(fake.resets.some(r => r.repo === 'movie-api')).toBe(false);
  });

  it('greenfield repo missing: creates it then seeds the root commit', async () => {
    const { fake, stager: s } = stager({
      'celeb-api': { existence: { status: 'not-found' }, openPrs: [], openIssues: [], branches: [] },
      'movie-api': { existence: { status: 'exists', isEmpty: false, defaultBranch: 'main' }, openPrs: [], openIssues: [], branches: [] },
    });
    const res = await s.execute('org');
    const celeb = res.repos.find(r => r.slug === 'celeb-api')!;
    expect(celeb.created).toBe(true);
    expect(celeb.resetMain).toBe(true);
    expect(fake.created).toContain('celeb-api');
  });

  it('brownfield repo missing: skipped, never created', async () => {
    const { fake, stager: s } = stager({
      'celeb-api': { existence: { status: 'exists', isEmpty: false, defaultBranch: 'main' }, openPrs: [], openIssues: [], branches: [] },
      'movie-api': { existence: { status: 'not-found' }, openPrs: [], openIssues: [], branches: [] },
    });
    const res = await s.execute('org');
    const movie = res.repos.find(r => r.slug === 'movie-api')!;
    expect(movie.skipped).toMatch(/not found/);
    expect(fake.created).not.toContain('movie-api');
  });

  it('scan: aggregates counts and flags existing state', async () => {
    const { stager: s } = stager({
      'celeb-api': { existence: { status: 'exists', isEmpty: false, defaultBranch: 'main' }, openPrs: [1], openIssues: [2], branches: ['copilot/a'] },
      'movie-api': { existence: { status: 'exists', isEmpty: false, defaultBranch: 'main' }, openPrs: [], openIssues: [], branches: [] },
    });
    const scan = await s.scan('org');
    expect(scan.totalOpenPrs).toBe(1);
    expect(scan.totalOpenIssues).toBe(1);
    expect(scan.totalBranches).toBe(1);
    expect(scan.hasExistingState).toBe(true);
  });

  it('scan: a clean greenfield repo that exists still flags existing state (main will be reset)', async () => {
    const { stager: s } = stager({
      'celeb-api': { existence: { status: 'exists', isEmpty: false, defaultBranch: 'main' }, openPrs: [], openIssues: [], branches: [] },
      'movie-api': { existence: { status: 'not-found' }, openPrs: [], openIssues: [], branches: [] },
    });
    const scan = await s.scan('org');
    expect(scan.totalOpenPrs + scan.totalOpenIssues + scan.totalBranches).toBe(0);
    expect(scan.hasExistingState).toBe(true); // celeb-api exists → greenfield reset pending
  });
});
