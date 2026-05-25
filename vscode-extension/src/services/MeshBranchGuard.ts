// ============================================================================
// MeshBranchGuard — fail-closed branch-of-truth guard for extension writes
//
// Bug QQ (2026-05-25): Looking Glass writes (Settings → Redeploy, Start
// WHY/HOW/WHAT dispatch, Delete-phase reset) all ran `git commit` + `git
// push` against the mesh repo's CURRENT HEAD with no branch arg. When the
// user's local mesh checkout was on a Copilot PR branch (because they had
// inspected the PR locally), every extension-driven commit landed on that
// branch instead of main. Audit workflows reading from main never saw the
// new state; the next agent run inherited the old, mismatched okr.yaml.
//
// This module enforces the invariant that Looking Glass writes ONLY to
// main. Three result kinds let the caller render a recovery UI:
//
//   - `wrong-branch-clean` — working tree is clean → caller can offer a
//     one-click "switch to main + pull + retry" button.
//   - `wrong-branch-dirty` — local edits exist → refuse to auto-switch
//     (a checkout would either fail or discard work). Caller lists the
//     dirty files and points the user at commit / stash / discard.
//   - `wrong-branch-divergent` — branch has unique OKR commits that are
//     NOT on origin/main → caller warns the user NOT to merge this
//     branch and lists the orphan OKR files. (These would typically be
//     the same stale extension-write commits Bug QQ produced before the
//     guard existed; they're now invisible to main and should be
//     re-issued from main, not merged.)
//
// The guard is intentionally GIT-only (no GitHub API), so it works
// offline and never costs an API call. Cost is one `git status` + one
// `git branch --show-current` + (if not main) one `git fetch origin main`
// + one `git diff origin/main...HEAD`. Sub-second on a healthy repo.
// ============================================================================

import { execFileAsync } from '../utils/exec';

export type MeshBranchGuardResult =
  | { ok: true; branch: 'main' }
  | { ok: false; kind: 'wrong-branch-clean';     branch: string }
  | { ok: false; kind: 'wrong-branch-dirty';     branch: string; dirtyFiles: string[] }
  | { ok: false; kind: 'wrong-branch-divergent'; branch: string; staleOkrFiles: string[] }
  | { ok: false; kind: 'git-error';              branch: string; error: string };

/**
 * Check whether the mesh repo's local working tree is in a state where
 * Looking Glass may write. Returns `{ ok: true }` only when HEAD is on
 * `main`. Otherwise returns a structured result the caller surfaces to
 * the user via the recovery modal.
 *
 * @param gitRoot absolute path to the mesh repo's git root (NOT the
 *                meshPath — meshPath may be a subdir).
 */
export async function checkMeshBranchGuard(gitRoot: string): Promise<MeshBranchGuardResult> {
  // 1. Detect current branch. Use `--show-current` (git ≥2.22) — empty
  //    string on detached HEAD, which we treat as a failure case below.
  let branch: string;
  try {
    const { stdout } = await execFileAsync(
      'git', ['branch', '--show-current'],
      { cwd: gitRoot, timeout: 5000 },
    );
    branch = stdout.trim();
  } catch (err) {
    return {
      ok: false,
      kind: 'git-error',
      branch: '(unknown)',
      error: err instanceof Error ? err.message : String(err),
    };
  }
  if (!branch) {
    return {
      ok: false,
      kind: 'git-error',
      branch: '(detached HEAD)',
      error: 'HEAD is detached — no current branch. Run `git checkout main` to recover.',
    };
  }
  if (branch === 'main') {
    return { ok: true, branch: 'main' };
  }

  // 2. Dirty working tree? `git status --porcelain` outputs one line per
  //    modified/untracked path. Empty stdout = clean.
  let dirtyFiles: string[] = [];
  try {
    const { stdout } = await execFileAsync(
      'git', ['status', '--porcelain'],
      { cwd: gitRoot, timeout: 10_000 },
    );
    // Porcelain format: 2-char status + 1 space + path. Both status
    // chars may be space (e.g. `?? new-file`). We MUST NOT trim() first
    // or we lose leading-space status chars and the offset parsing
    // breaks. Drop blank lines, then slice off the 3-char prefix.
    dirtyFiles = stdout
      .split('\n')
      .filter(l => l.length > 3)
      .map(l => l.slice(3))
      .map(l => l.replace(/^"(.*)"$/, '$1'));  // un-quote spaces-in-paths
  } catch (err) {
    return {
      ok: false,
      kind: 'git-error',
      branch,
      error: `git status failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (dirtyFiles.length > 0) {
    return { ok: false, kind: 'wrong-branch-dirty', branch, dirtyFiles };
  }

  // 3. Branch is clean but not main. Does it have OKR commits not on
  //    origin/main? Those are the most worrying — they're the
  //    Looking-Glass-state-on-the-wrong-branch case Bug QQ produced.
  //    Best-effort fetch first so the diff is honest; if fetch fails
  //    (offline, network blip), we'd rather report no-divergent than
  //    silently miss a divergence the user could resolve. So we treat
  //    fetch failure as a soft no-op and fall through to the clean
  //    result — UI message is still actionable ("switch to main"); the
  //    user just doesn't see the orphan-commit warning.
  try {
    await execFileAsync('git', ['fetch', 'origin', 'main'], { cwd: gitRoot, timeout: 15_000 });
  } catch { /* offline / network — soft fail */ }

  let staleOkrFiles: string[] = [];
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['diff', '--name-only', 'origin/main...HEAD', '--', 'okrs/'],
      { cwd: gitRoot, timeout: 10_000 },
    );
    staleOkrFiles = stdout.split('\n').map(l => l.trim()).filter(Boolean);
  } catch {
    // diff failed (origin/main doesn't exist, etc.) — fall through to clean.
  }
  if (staleOkrFiles.length > 0) {
    return { ok: false, kind: 'wrong-branch-divergent', branch, staleOkrFiles };
  }

  return { ok: false, kind: 'wrong-branch-clean', branch };
}

/**
 * Recover by switching to main + fast-forward pull. Caller invokes this
 * ONLY after the user explicitly clicks "Switch to main and retry" on
 * the recovery modal, and ONLY when `checkMeshBranchGuard` returned
 * `wrong-branch-clean` (we never auto-switch with a dirty tree).
 *
 * Returns `{ success, message }` so the caller can render a toast
 * before re-invoking the original operation.
 */
export async function recoverMeshBranch(gitRoot: string): Promise<{ success: boolean; message: string }> {
  try {
    await execFileAsync('git', ['checkout', 'main'], { cwd: gitRoot, timeout: 10_000 });
  } catch (err) {
    return {
      success: false,
      message: `Could not switch to main: ${err instanceof Error ? err.message : String(err)}. Run \`git checkout main\` manually.`,
    };
  }
  try {
    await execFileAsync(
      'git', ['pull', '--ff-only', 'origin', 'main'],
      { cwd: gitRoot, timeout: 30_000 },
    );
  } catch (err) {
    return {
      success: false,
      message: `Switched to main but pull failed: ${err instanceof Error ? err.message : String(err)}. Run \`git pull --ff-only origin main\` manually before retrying.`,
    };
  }
  return { success: true, message: 'Switched to main and pulled latest.' };
}

/**
 * Human-friendly multi-line summary for the recovery modal. Caller
 * passes the guard result + the friendly operation name (e.g.
 * "Redeploy", "Start WHAT", "Reset HOW"). Used by webview UI.
 */
export function formatMeshBranchGuardMessage(result: Exclude<MeshBranchGuardResult, { ok: true }>, operation: string): string {
  const intro = `Looking Glass writes mesh state only to main. Your mesh checkout is on \`${result.branch}\`.`;
  switch (result.kind) {
    case 'wrong-branch-clean':
      return `${intro} Working tree is clean — I can switch to main and pull now, then retry ${operation}.`;
    case 'wrong-branch-dirty':
      return `${intro} Cannot safely switch branches because these files have local changes:\n\n  • ${result.dirtyFiles.slice(0, 10).join('\n  • ')}${result.dirtyFiles.length > 10 ? `\n  • …and ${result.dirtyFiles.length - 10} more` : ''}\n\nCommit, stash, or discard them, then retry ${operation}.`;
    case 'wrong-branch-divergent':
      return `${intro} This branch has OKR commits that are NOT on main:\n\n  • ${result.staleOkrFiles.slice(0, 10).join('\n  • ')}${result.staleOkrFiles.length > 10 ? `\n  • …and ${result.staleOkrFiles.length - 10} more` : ''}\n\nMain is the source of truth for OKR state. Do NOT merge this branch — instead, re-issue these operations from main. Switch to main, then retry ${operation}.`;
    case 'git-error':
      return `${intro} Git error while inspecting the working tree:\n\n  ${result.error}\n\nResolve manually, then retry ${operation}.`;
  }
}
