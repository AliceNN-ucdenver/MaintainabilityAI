/**
 * Bug QQ/A-plus regression: MeshBranchGuard must refuse Looking Glass
 * writes when the local mesh checkout is on any branch other than main.
 *
 * Strategy: mock execFileAsync at the module boundary so we can drive
 * git's stdout for each canonical state (clean+main, clean+other,
 * dirty+other, divergent+other, error). Asserts the discriminated-
 * union result shape that the LookingGlassPanel wiring depends on.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/exec', () => ({
  execFileAsync: vi.fn(),
}));

import { execFileAsync } from '../../utils/exec';
import {
  checkMeshBranchGuard,
  recoverMeshBranch,
  formatMeshBranchGuardMessage,
  type MeshBranchGuardResult,
} from '../MeshBranchGuard';

const exec = execFileAsync as unknown as ReturnType<typeof vi.fn>;

// Helper to build a sequence of git stdouts for the guard's call order:
//   1. git branch --show-current
//   2. (if not main) git status --porcelain
//   3. (if not main + clean) git fetch origin main
//   4. (if not main + clean) git diff --name-only origin/main...HEAD -- okrs/
function programGit(branch: string, status = '', diff = '', fetchOk = true) {
  exec.mockReset();
  exec.mockImplementation(async (_cmd: string, args: string[]) => {
    if (args.includes('--show-current')) { return { stdout: branch, stderr: '' }; }
    if (args.includes('--porcelain'))    { return { stdout: status, stderr: '' }; }
    if (args[0] === 'fetch') {
      if (!fetchOk) { throw new Error('network unreachable'); }
      return { stdout: '', stderr: '' };
    }
    if (args[0] === 'diff')              { return { stdout: diff, stderr: '' }; }
    if (args[0] === 'checkout')          { return { stdout: '', stderr: '' }; }
    if (args[0] === 'pull')              { return { stdout: '', stderr: '' }; }
    throw new Error(`unexpected git invocation: ${args.join(' ')}`);
  });
}

describe('checkMeshBranchGuard', () => {
  beforeEach(() => { exec.mockReset(); });

  it('passes when HEAD is on main', async () => {
    programGit('main');
    const result = await checkMeshBranchGuard('/mesh');
    expect(result).toEqual({ ok: true, branch: 'main' });
    // Should NOT have called status/fetch/diff — short-circuit on main.
    const calls = exec.mock.calls.map(c => c[1][0]);
    expect(calls).toEqual(['branch']);
  });

  it('refuses when on a feature branch with clean tree (no orphan OKRs)', async () => {
    programGit('copilot/foo', '', '');
    const result = await checkMeshBranchGuard('/mesh');
    expect(result).toEqual({ ok: false, kind: 'wrong-branch-clean', branch: 'copilot/foo' });
  });

  it('refuses with dirty kind when working tree has uncommitted changes', async () => {
    programGit('copilot/foo', ' M okrs/X/okr.yaml\n?? new-file.md');
    const result = await checkMeshBranchGuard('/mesh');
    expect(result.ok).toBe(false);
    if (result.ok) { return; }
    expect(result.kind).toBe('wrong-branch-dirty');
    if (result.kind !== 'wrong-branch-dirty') { return; }
    expect(result.branch).toBe('copilot/foo');
    expect(result.dirtyFiles).toEqual(['okrs/X/okr.yaml', 'new-file.md']);
  });

  it('strips quote-wrapped paths from porcelain output (paths with spaces)', async () => {
    programGit('copilot/foo', ' M "okrs/X has spaces/okr.yaml"');
    const result = await checkMeshBranchGuard('/mesh') as Extract<MeshBranchGuardResult, { kind: 'wrong-branch-dirty' }>;
    expect(result.dirtyFiles).toEqual(['okrs/X has spaces/okr.yaml']);
  });

  it('refuses with divergent kind when branch has OKR commits not on main', async () => {
    programGit('copilot/foo', '', 'okrs/X/okr.yaml\nokrs/X/audit/events/run-1.jsonl');
    const result = await checkMeshBranchGuard('/mesh');
    expect(result.ok).toBe(false);
    if (result.ok) { return; }
    expect(result.kind).toBe('wrong-branch-divergent');
    if (result.kind !== 'wrong-branch-divergent') { return; }
    expect(result.staleOkrFiles).toEqual(['okrs/X/okr.yaml', 'okrs/X/audit/events/run-1.jsonl']);
  });

  it('downgrades to clean when fetch fails (offline) and treats no-diff as clean', async () => {
    programGit('copilot/foo', '', '', /* fetchOk */ false);
    const result = await checkMeshBranchGuard('/mesh');
    expect(result.ok).toBe(false);
    if (result.ok) { return; }
    expect(result.kind).toBe('wrong-branch-clean');
  });

  it('reports git-error if branch lookup fails', async () => {
    exec.mockImplementation(async () => { throw new Error('not a git repository'); });
    const result = await checkMeshBranchGuard('/mesh');
    expect(result.ok).toBe(false);
    if (result.ok) { return; }
    expect(result.kind).toBe('git-error');
  });

  it('reports git-error with helpful message on detached HEAD', async () => {
    programGit('');  // --show-current returns empty on detached HEAD
    const result = await checkMeshBranchGuard('/mesh');
    expect(result.ok).toBe(false);
    if (result.ok) { return; }
    expect(result.kind).toBe('git-error');
    if (result.kind !== 'git-error') { return; }
    expect(result.error).toContain('detached');
  });
});

describe('recoverMeshBranch', () => {
  beforeEach(() => { exec.mockReset(); });

  it('runs checkout main + pull --ff-only and reports success', async () => {
    exec.mockResolvedValue({ stdout: '', stderr: '' });
    const result = await recoverMeshBranch('/mesh');
    expect(result.success).toBe(true);
    const checkoutCall = exec.mock.calls.find(c => c[1][0] === 'checkout');
    expect(checkoutCall?.[1]).toEqual(['checkout', 'main']);
    const pullCall = exec.mock.calls.find(c => c[1][0] === 'pull');
    expect(pullCall?.[1]).toEqual(['pull', '--ff-only', 'origin', 'main']);
  });

  it('reports failure with manual command if checkout fails', async () => {
    exec.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args[0] === 'checkout') { throw new Error('uncommitted changes'); }
      return { stdout: '', stderr: '' };
    });
    const result = await recoverMeshBranch('/mesh');
    expect(result.success).toBe(false);
    expect(result.message).toContain('git checkout main');
  });

  it('reports failure with manual command if pull fails (e.g. divergent main)', async () => {
    exec.mockImplementation(async (_cmd: string, args: string[]) => {
      if (args[0] === 'checkout') { return { stdout: '', stderr: '' }; }
      if (args[0] === 'pull') { throw new Error('non-fast-forward'); }
      return { stdout: '', stderr: '' };
    });
    const result = await recoverMeshBranch('/mesh');
    expect(result.success).toBe(false);
    expect(result.message).toContain('git pull --ff-only');
  });
});

describe('formatMeshBranchGuardMessage', () => {
  it('clean variant promises auto-recovery', () => {
    const msg = formatMeshBranchGuardMessage(
      { ok: false, kind: 'wrong-branch-clean', branch: 'copilot/foo' },
      'Redeploy',
    );
    expect(msg).toContain('copilot/foo');
    expect(msg).toContain('switch to main');
    expect(msg).toContain('Redeploy');
  });

  it('dirty variant lists files + refuses auto-switch', () => {
    const msg = formatMeshBranchGuardMessage(
      { ok: false, kind: 'wrong-branch-dirty', branch: 'copilot/foo', dirtyFiles: ['a.md', 'b.md'] },
      'Start WHAT',
    );
    expect(msg).toContain('Cannot safely switch');
    expect(msg).toContain('a.md');
    expect(msg).toContain('b.md');
    expect(msg).toContain('Start WHAT');
  });

  it('divergent variant warns NOT to merge', () => {
    const msg = formatMeshBranchGuardMessage(
      { ok: false, kind: 'wrong-branch-divergent', branch: 'copilot/foo', staleOkrFiles: ['okrs/X/okr.yaml'] },
      'Reset HOW',
    );
    expect(msg).toContain('Do NOT merge');
    expect(msg).toContain('okrs/X/okr.yaml');
    expect(msg).toContain('Reset HOW');
  });

  it('truncates long dirty file lists', () => {
    const dirtyFiles = Array.from({ length: 15 }, (_, i) => `file${i}.md`);
    const msg = formatMeshBranchGuardMessage(
      { ok: false, kind: 'wrong-branch-dirty', branch: 'x', dirtyFiles },
      'Op',
    );
    expect(msg).toContain('…and 5 more');
  });
});
