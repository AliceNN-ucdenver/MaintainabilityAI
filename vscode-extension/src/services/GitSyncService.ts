// ============================================================================
// GitSyncService — Git version control awareness and sync for governance mesh
// Provides per-pillar and per-BAR dirty-file tracking plus one-click commit+push
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type {
  BarSummary,
  GitFileStatus,
  GitSyncStatus,
  BarGitStatus,
  PillarGitStatus,
} from '../types';

const execFileAsync = promisify(execFile);

// Pillar directory prefixes within a BAR (mirrors GovernanceScorer)
const PILLAR_DIR_MAP: Record<string, keyof BarGitStatus['pillarStatus']> = {
  'architecture': 'architecture',
  'security': 'security',
  'information-risk': 'infoRisk',
  'operations': 'operations',
};

function emptyPillarStatus(): PillarGitStatus {
  return { isDirty: false, dirtyFileCount: 0, dirtyFiles: [] };
}

function emptyBarGitStatus(): BarGitStatus {
  return {
    isDirty: false,
    dirtyFileCount: 0,
    pillarStatus: {
      architecture: emptyPillarStatus(),
      security: emptyPillarStatus(),
      infoRisk: emptyPillarStatus(),
      operations: emptyPillarStatus(),
    },
  };
}

// ============================================================================
// Service
// ============================================================================

export class GitSyncService {

  /**
   * Check if the given path is inside a git repo.
   * Walks up directory tree to find .git, or uses git rev-parse as fallback.
   */
  isGitRepo(meshPath: string): boolean {
    // Quick check at the mesh root itself
    if (fs.existsSync(path.join(meshPath, '.git'))) { return true; }
    // Walk up to find a parent .git
    let dir = meshPath;
    while (true) {
      const parent = path.dirname(dir);
      if (parent === dir) { break; } // reached filesystem root
      if (fs.existsSync(path.join(parent, '.git'))) { return true; }
      dir = parent;
    }
    return false;
  }

  /**
   * Find the git repository root for a given path.
   */
  findGitRoot(meshPath: string): string | null {
    let dir = meshPath;
    while (true) {
      if (fs.existsSync(path.join(dir, '.git'))) { return dir; }
      const parent = path.dirname(dir);
      if (parent === dir) { return null; }
      dir = parent;
    }
  }

  /**
   * Get comprehensive git status for the mesh, mapped to BARs and pillars.
   * Uses the actual git root (which may be a parent of meshPath) for all commands.
   * Performs a lightweight `git fetch` first so ahead/behind counts reflect remote state.
   */
  async getStatus(meshPath: string, allBars: BarSummary[]): Promise<GitSyncStatus> {
    const gitRoot = this.findGitRoot(meshPath);
    if (!gitRoot) {
      return {
        isGitRepo: false,
        hasRemote: false,
        hasUpstream: false,
        ahead: 0,
        behind: 0,
        dirtyFiles: {},
        barStatus: {},
      };
    }

    // Fetch remote refs first so ahead/behind is accurate (best-effort, non-blocking)
    await this.fetchRemote(gitRoot);

    const [dirtyFiles, hasRemote, hasUpstream, { ahead, behind }] = await Promise.all([
      this.getDirtyFiles(gitRoot),
      this.hasRemote(gitRoot),
      this.hasUpstreamBranch(gitRoot),
      this.getAheadBehind(gitRoot),
    ]);

    const barStatus = this.mapFilesToBars(dirtyFiles, allBars, gitRoot);

    return {
      isGitRepo: true,
      hasRemote,
      hasUpstream,
      ahead,
      behind,
      dirtyFiles,
      barStatus,
    };
  }

  /**
   * Stage, commit, and push changes for a specific BAR directory.
   * Uses the actual git root (which may be a parent of meshPath) for all commands.
   */
  async syncBar(
    meshPath: string,
    barPath: string,
    barId: string,
    onProgress: (step: string) => void,
  ): Promise<{ committed: boolean; pushed: boolean; message: string }> {
    const gitRoot = this.findGitRoot(meshPath);
    if (!gitRoot) {
      throw new Error('Mesh is not a git repository. Initialize git first.');
    }

    // Compute relative path from git root for git add
    const relBarPath = path.relative(gitRoot, barPath);

    // 1. Stage
    onProgress('Staging changes...');
    await execFileAsync('git', ['add', relBarPath], { cwd: gitRoot });

    // 2. Check if there's actually anything staged
    const { stdout: diffStaged } = await execFileAsync(
      'git', ['diff', '--cached', '--name-status', '--', relBarPath],
      { cwd: gitRoot },
    );

    if (!diffStaged.trim()) {
      return { committed: false, pushed: false, message: 'Nothing to sync — all files are up to date.' };
    }

    // 3. Build commit message from staged changes
    const commitMsg = this.buildCommitMessage(barId, diffStaged);

    // 4. Commit
    onProgress('Committing...');
    await execFileAsync('git', ['commit', '-m', commitMsg], { cwd: gitRoot });

    // 5. Push (if remote exists)
    const hasRemote = await this.hasRemote(gitRoot);
    if (hasRemote) {
      onProgress('Pushing to remote...');
      try {
        const hasUpstream = await this.hasUpstreamBranch(gitRoot);
        const pushArgs = hasUpstream ? ['push'] : ['push', '-u', 'origin', 'main'];
        await execFileAsync('git', pushArgs, { cwd: gitRoot, timeout: 30_000 });
        return { committed: true, pushed: true, message: 'Synced and pushed to remote.' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { committed: true, pushed: false, message: `Committed locally but push failed: ${msg}` };
      }
    }

    return { committed: true, pushed: false, message: 'Committed locally. No remote configured — push skipped.' };
  }

  /**
   * Pull from remote. Tries fast-forward first; if branches have diverged,
   * falls back to rebase to replay local commits on top of remote.
   */
  async pullFromRemote(gitRoot: string): Promise<{ success: boolean; message: string }> {
    try {
      await execFileAsync('git', ['pull', '--ff-only'], { cwd: gitRoot, timeout: 30_000 });
      return { success: true, message: 'Pulled latest changes from remote.' };
    } catch {
      // Fast-forward failed — branches likely diverged. Try rebase.
      try {
        await execFileAsync('git', ['pull', '--rebase'], { cwd: gitRoot, timeout: 30_000 });
        return { success: true, message: 'Pulled and rebased local commits on top of remote.' };
      } catch (err) {
        // Rebase also failed — abort it to leave the repo clean
        try { await execFileAsync('git', ['rebase', '--abort'], { cwd: gitRoot }); } catch { /* already clean */ }
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Pull failed (branches diverged and rebase had conflicts): ${msg}` };
      }
    }
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  /**
   * Lightweight fetch so that remote-tracking refs are current.
   * Fails silently — network issues should not block status checks.
   */
  private async fetchRemote(gitRoot: string): Promise<void> {
    try {
      await execFileAsync('git', ['fetch', '--quiet'], { cwd: gitRoot, timeout: 15_000 });
    } catch {
      // Network unavailable or no remote — ignore
    }
  }

  private async getDirtyFiles(gitRoot: string): Promise<Record<string, GitFileStatus>> {
    try {
      const { stdout } = await execFileAsync(
        'git', ['status', '--porcelain', '--untracked-files=normal'],
        { cwd: gitRoot },
      );
      return this.parseGitStatus(stdout);
    } catch {
      return {};
    }
  }

  private parseGitStatus(stdout: string): Record<string, GitFileStatus> {
    const files: Record<string, GitFileStatus> = {};
    for (const line of stdout.split('\n')) {
      if (!line.trim()) { continue; }
      // Porcelain format: XY filename
      const code = line.substring(0, 2);
      const filePath = line.substring(3).trim();
      if (!filePath) { continue; }

      if (code === '??') {
        files[filePath] = 'untracked';
      } else if (code.includes('A')) {
        files[filePath] = 'added';
      } else if (code.includes('D')) {
        files[filePath] = 'deleted';
      } else if (code.includes('R')) {
        // Renamed: format is "R  old -> new"
        const parts = filePath.split(' -> ');
        files[parts[parts.length - 1]] = 'renamed';
      } else {
        files[filePath] = 'modified';
      }
    }
    return files;
  }

  private async hasRemote(gitRoot: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('git', ['remote'], { cwd: gitRoot });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  private async hasUpstreamBranch(gitRoot: string): Promise<boolean> {
    try {
      await execFileAsync('git', ['rev-parse', '--abbrev-ref', '@{upstream}'], { cwd: gitRoot });
      return true;
    } catch {
      return false;
    }
  }

  private async getAheadBehind(gitRoot: string): Promise<{ ahead: number; behind: number }> {
    try {
      const { stdout } = await execFileAsync(
        'git', ['rev-list', '--count', '--left-right', '@{upstream}...HEAD'],
        { cwd: gitRoot },
      );
      const parts = stdout.trim().split(/\s+/);
      return {
        behind: parseInt(parts[0], 10) || 0,
        ahead: parseInt(parts[1], 10) || 0,
      };
    } catch {
      // No upstream configured — that's fine
      return { ahead: 0, behind: 0 };
    }
  }

  private mapFilesToBars(
    dirtyFiles: Record<string, GitFileStatus>,
    allBars: BarSummary[],
    gitRoot: string,
  ): Record<string, BarGitStatus> {
    const result: Record<string, BarGitStatus> = {};

    // Pre-compute relative paths for each BAR from the git root
    const barRelPaths: { bar: BarSummary; relPath: string }[] = allBars.map(bar => ({
      bar,
      relPath: path.relative(gitRoot, bar.path),
    }));

    for (const [filePath, status] of Object.entries(dirtyFiles)) {
      // Find which BAR this file belongs to
      for (const { bar, relPath } of barRelPaths) {
        // Check if the dirty file is inside the BAR directory
        const fileInsideBar = filePath.startsWith(relPath + '/') || filePath === relPath;
        // Also check if the BAR is inside an untracked parent directory
        // (git reports untracked dirs as a single entry, e.g. "platforms/imdb-lite/")
        const barInsideFile = filePath.endsWith('/') && relPath.startsWith(filePath);

        if (!fileInsideBar && !barInsideFile) {
          continue;
        }

        // Initialize BAR status if needed
        if (!result[bar.path]) {
          result[bar.path] = emptyBarGitStatus();
        }

        const barStatus = result[bar.path];
        barStatus.isDirty = true;
        barStatus.dirtyFileCount++;

        // Determine which pillar this file belongs to
        if (fileInsideBar) {
          const fileRelToBar = filePath.substring(relPath.length + 1); // e.g., "security/threat-model.yaml"
          const firstDir = fileRelToBar.split('/')[0];
          const pillarKey = PILLAR_DIR_MAP[firstDir];

          if (pillarKey) {
            const pillar = barStatus.pillarStatus[pillarKey];
            pillar.isDirty = true;
            pillar.dirtyFileCount++;
            pillar.dirtyFiles.push(fileRelToBar);
          }
        }
        // When the BAR is inside an untracked parent, we can't determine
        // per-pillar status (git only reports the parent directory)

        break; // File belongs to at most one BAR
      }
    }

    return result;
  }

  private buildCommitMessage(barId: string, diffOutput: string): string {
    const lines = diffOutput.trim().split('\n').filter(Boolean);
    const changes: string[] = [];

    for (const line of lines) {
      const [statusCode, ...pathParts] = line.split('\t');
      const filePath = pathParts.join('\t');
      const fileName = path.basename(filePath);
      const dirName = path.dirname(filePath).split('/').pop() || '';

      const action = statusCode === 'A' ? 'added'
        : statusCode === 'D' ? 'deleted'
        : statusCode?.startsWith('R') ? 'renamed'
        : 'modified';

      changes.push(`- ${dirName}: ${fileName} (${action})`);
    }

    const body = changes.length > 0
      ? `\nUpdated:\n${changes.join('\n')}\n\nSynced by MaintainabilityAI Looking Glass`
      : '\nSynced by MaintainabilityAI Looking Glass';

    return `feat(${barId}): sync governance artifacts${body}`;
  }
}
