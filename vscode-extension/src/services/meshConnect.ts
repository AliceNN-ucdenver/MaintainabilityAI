/**
 * Pure decision logic for "Connect to existing mesh" (Looking Glass).
 *
 * The orchestration (git clone, fs reads, picker UI, setMeshPath) lives in
 * LookingGlassPanel; these are the pure, unit-testable pieces: repo-reference
 * normalization and the clone-or-open decision over already-gathered facts.
 *
 * A governance mesh is any directory with a `mesh.yaml` at its root (see
 * `MeshReader.readPortfolioConfig`). "If the clone already exists it just
 * opens; otherwise it clones" — and a pre-existing non-mesh / wrong-remote
 * directory is a NAMED error, never a silent overwrite.
 */

/**
 * Normalize a user-entered repo reference to an `https://github.com/owner/repo`
 * clone URL, or `null` if it isn't a recognizable GitHub repo. Accepts:
 *   - `https://github.com/owner/repo` (with optional `.git`, trailing path, `/`)
 *   - `git@github.com:owner/repo.git`
 *   - `owner/repo` (bare slug)
 */
export function normalizeRepoUrl(input: string): string | null {
  const s = (input ?? '').trim();
  if (!s) { return null; }
  const ssh = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(s);
  if (ssh) { return `https://github.com/${ssh[1]}/${ssh[2]}`; }
  const https = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:\/.*)?$/.exec(s);
  if (https) { return `https://github.com/${https[1]}/${https[2]}`; }
  const slug = /^([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9._-]+?)(?:\.git)?$/.exec(s);
  if (slug) { return `https://github.com/${slug[1]}/${slug[2]}`; }
  return null;
}

/** The repo name (last path segment, `.git` stripped) from a clone URL. */
export function repoNameFromUrl(url: string): string {
  return url.replace(/\.git$/, '').replace(/\/+$/, '').split('/').pop() || url;
}

export type MeshConnectError =
  | 'invalid-repo-url'
  | 'target-exists-not-a-mesh'
  | 'target-exists-wrong-remote'
  | 'cloned-not-a-mesh'
  | 'clone-failed';

export interface MeshTargetFacts {
  /** target dir (`parentDir/<repoName>`) exists on disk */
  targetExists: boolean;
  /** target has a `mesh.yaml` at its root */
  targetIsMesh: boolean;
  /** `target/.git` exists */
  targetIsGitRepo: boolean;
  /** normalized origin remote === chosen url; `null` when undeterminable (not a git repo) */
  remoteMatches: boolean | null;
}

export type MeshConnectResolution =
  | { action: 'open' }
  | { action: 'clone' }
  | { action: 'error'; reason: MeshConnectError };

/**
 * Decide clone-vs-open for a chosen target dir (runs AFTER the user picked the
 * parent folder; `target = parent/<repoName>`).
 *
 * - absent target → clone.
 * - existing target that IS a mesh with a matching (or undeterminable) remote → open.
 * - existing target that is NOT a mesh → `target-exists-not-a-mesh`.
 * - existing mesh whose remote points elsewhere → `target-exists-wrong-remote`.
 */
export function resolveMeshConnect(facts: MeshTargetFacts): MeshConnectResolution {
  if (!facts.targetExists) { return { action: 'clone' }; }
  if (!facts.targetIsMesh) { return { action: 'error', reason: 'target-exists-not-a-mesh' }; }
  if (facts.remoteMatches === false) { return { action: 'error', reason: 'target-exists-wrong-remote' }; }
  return { action: 'open' };
}

/** Human-readable, actionable message per discriminated failure. */
export function meshConnectErrorMessage(reason: MeshConnectError, target: string, url: string): string {
  switch (reason) {
    case 'invalid-repo-url':
      return `"${url}" is not a recognizable GitHub repo. Use owner/repo or an https://github.com/... URL.`;
    case 'target-exists-not-a-mesh':
      return `A folder already exists at ${target} but it has no mesh.yaml — it is not a governance mesh. Pick a different location or open it as a local mesh.`;
    case 'target-exists-wrong-remote':
      return `A different repository is already cloned at ${target} (its origin does not match ${url}). Pick a different location.`;
    case 'cloned-not-a-mesh':
      return `${url} was cloned but has no mesh.yaml — it is not a governance mesh.`;
    case 'clone-failed':
      return `Failed to clone ${url}. Check the URL and your git credentials.`;
  }
}
