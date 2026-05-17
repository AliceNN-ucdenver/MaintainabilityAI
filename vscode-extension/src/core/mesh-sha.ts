/**
 * mesh-sha — pure helper for resolving the mesh repo's git HEAD SHA.
 * No vscode imports, so it can be reused from MCP code paths and tested
 * directly with vitest (which can't load `vscode`).
 */
import { execFileSync } from 'child_process';

/**
 * Return the current git SHA of the mesh repo (HEAD). Null when the directory
 * isn't a git repo, git isn't installed, or the call fails.
 */
export function getMeshSha(meshPath: string): string | null {
  try {
    const out = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: meshPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const sha = out.trim();
    return /^[0-9a-f]{7,40}$/.test(sha) ? sha : null;
  } catch {
    return null;
  }
}
