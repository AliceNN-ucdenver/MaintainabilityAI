import { describe, expect, it, vi } from 'vitest';

import {
  IMPLEMENTATION_AGENT_PATH,
  getHarnessPresence,
  getIssueWritePermission,
  getRepoExistence,
  getRepoExistenceFull,
} from '../probes';
import type { GitHubService } from '../../GitHubService';

/**
 * Each adapter has 3 branches (success / discriminated-missing /
 * fetch-error). Tests exercise the field-name + value translation
 * from GitHubService's `{ status: ... }` shapes to coordination's
 * `{ kind: ... }` shapes. NO Octokit, NO real HTTP — pure mock.
 */

function fakeGithub(overrides: Partial<GitHubService>): GitHubService {
  return overrides as unknown as GitHubService;
}

describe('getHarnessPresence', () => {
  it('returns present when the harness file is found on the default branch', async () => {
    const github = fakeGithub({
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'ok', text: '---\nname: implementation-agent\n---' }),
    });
    const result = await getHarnessPresence(github, 'acme', 'celeb-api');
    expect(result).toEqual({ kind: 'present' });
    expect(github.getRepoFileStatus).toHaveBeenCalledWith('acme', 'celeb-api', IMPLEMENTATION_AGENT_PATH);
  });

  it('returns missing when the harness file is genuinely absent (404)', async () => {
    const github = fakeGithub({
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'not-found' }),
    });
    const result = await getHarnessPresence(github, 'acme', 'celeb-api');
    expect(result).toEqual({ kind: 'missing' });
  });

  it('returns fetch-error with detail when the probe transient-fails', async () => {
    const github = fakeGithub({
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'fetch-error', reason: 'rate limit' }),
    });
    const result = await getHarnessPresence(github, 'acme', 'celeb-api');
    expect(result).toEqual({ kind: 'fetch-error', detail: 'rate limit' });
  });
});

describe('getIssueWritePermission', () => {
  it('returns present when the PAT has push permission', async () => {
    const github = fakeGithub({
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'present' }),
    });
    const result = await getIssueWritePermission(github, 'acme', 'celeb-api');
    expect(result).toEqual({ kind: 'present' });
  });

  it('returns missing when the PAT can read but not write', async () => {
    const github = fakeGithub({
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'missing' }),
    });
    const result = await getIssueWritePermission(github, 'acme', 'celeb-api');
    expect(result).toEqual({ kind: 'missing' });
  });

  it('returns fetch-error with detail on transient failure', async () => {
    const github = fakeGithub({
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'fetch-error', reason: '500 server error' }),
    });
    const result = await getIssueWritePermission(github, 'acme', 'celeb-api');
    expect(result).toEqual({ kind: 'fetch-error', detail: '500 server error' });
  });
});

describe('getRepoExistence (simple adapter)', () => {
  it('returns exists when the repo is found', async () => {
    const github = fakeGithub({
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'exists', isEmpty: false, defaultBranch: 'main' }),
    });
    const result = await getRepoExistence(github, 'acme', 'celeb-api');
    expect(result).toEqual({ kind: 'exists' });
  });

  it('returns missing when the repo 404s', async () => {
    const github = fakeGithub({
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'not-found' }),
    });
    const result = await getRepoExistence(github, 'acme', 'ghost-repo');
    expect(result).toEqual({ kind: 'missing' });
  });

  it('returns fetch-error with detail on transient failure', async () => {
    const github = fakeGithub({
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'fetch-error', reason: 'network timeout' }),
    });
    const result = await getRepoExistence(github, 'acme', 'celeb-api');
    expect(result).toEqual({ kind: 'fetch-error', detail: 'network timeout' });
  });
});

describe('getRepoExistenceFull (preserves isEmpty + defaultBranch)', () => {
  it('returns exists+isEmpty+defaultBranch when greenfield slug already exists empty', async () => {
    const github = fakeGithub({
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'exists', isEmpty: true, defaultBranch: 'main' }),
    });
    const result = await getRepoExistenceFull(github, 'acme', 'fresh-repo');
    expect(result).toEqual({ kind: 'exists', isEmpty: true, defaultBranch: 'main' });
  });

  it('returns exists+!isEmpty when the slug is taken (repo-exists-conflict path)', async () => {
    const github = fakeGithub({
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'exists', isEmpty: false, defaultBranch: 'main' }),
    });
    const result = await getRepoExistenceFull(github, 'acme', 'existing-repo');
    expect(result).toEqual({ kind: 'exists', isEmpty: false, defaultBranch: 'main' });
  });

  it('returns missing on not-found (typical greenfield ready-to-create state)', async () => {
    const github = fakeGithub({
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'not-found' }),
    });
    const result = await getRepoExistenceFull(github, 'acme', 'brand-new-repo');
    expect(result).toEqual({ kind: 'missing' });
  });

  it('returns fetch-error with detail on transient failure', async () => {
    const github = fakeGithub({
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'fetch-error', reason: 'auth' }),
    });
    const result = await getRepoExistenceFull(github, 'acme', 'celeb-api');
    expect(result).toEqual({ kind: 'fetch-error', detail: 'auth' });
  });
});
