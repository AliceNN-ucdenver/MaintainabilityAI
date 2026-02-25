// ============================================================================
// Shared git utilities — URL parsing, remote detection, branch detection
// Eliminates duplication of the GitHub URL regex and git CLI calls
// ============================================================================

import { execFileAsync } from './exec';

export interface GitRepoInfo {
  owner: string;
  repo: string;
}

/** Parse a GitHub remote URL (HTTPS or SSH) into owner/repo. */
export function parseGitHubUrl(url: string): GitRepoInfo | null {
  const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  return match ? { owner: match[1], repo: match[2] } : null;
}

/** Get the remote origin URL for a git repo directory. Returns null if no remote. */
export async function getRemoteOriginUrl(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd, timeout: 5000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/** Get the current branch name. Falls back to 'main' on error. */
export async function getCurrentBranch(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd, timeout: 5000 });
    return stdout.trim() || 'main';
  } catch {
    return 'main';
  }
}

/** Detect GitHub repo info + branch from a directory's git remote. */
export async function detectGitHubRepo(cwd: string): Promise<(GitRepoInfo & { branch: string; remoteUrl: string }) | null> {
  const url = await getRemoteOriginUrl(cwd);
  if (!url) { return null; }
  const parsed = parseGitHubUrl(url);
  if (!parsed) { return null; }
  const branch = await getCurrentBranch(cwd);
  return { ...parsed, branch, remoteUrl: url };
}
