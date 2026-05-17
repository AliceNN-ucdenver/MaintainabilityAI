/**
 * get-mesh-sha — pure helper for resolving the mesh repo's git HEAD SHA.
 *
 * Mirrors the canonical impl in vscode-extension/src/core/mesh-sha.ts. We
 * duplicate rather than depend on the extension because the runner ships as
 * a separate npm package and pulling in the extension would be a layering
 * violation.
 */
import { execFileSync } from 'node:child_process';

const SHA_RE = /^[0-9a-f]{7,40}$/;

export function getMeshSha(meshPath: string): string | null {
  try {
    const out = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: meshPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const sha = out.trim();
    return SHA_RE.test(sha) ? sha : null;
  } catch {
    return null;
  }
}
