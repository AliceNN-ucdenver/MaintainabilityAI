/**
 * clone_and_index — pure node (archaeology path).
 *
 * Shallow-clones the target repo into a temp directory, walks the file
 * tree, and returns an inventory + the clone SHA. We skip non-source
 * directories (.git, node_modules, dist, build, .next, target,
 * __pycache__, venv) to keep the inventory honest.
 *
 * Phase 3a doesn't parse any code yet — that's analyze_architecture's
 * job. This node is small + pure + fast so the orchestrator can decide
 * whether to even bother analyzing (e.g. an empty repo or a docs-only
 * mirror short-circuits to a node_error before we burn LLM tokens).
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface CloneAndIndexOpts {
  /** owner/repo (used for both the URL and the `slug` in RepositoryProfile). */
  targetRepo: string;
  /** Override the parent dir for tests. Defaults to os.tmpdir(). */
  parentDir?: string;
  /** Branch / tag / SHA to check out after clone. Default: repo default branch. */
  ref?: string;
  /**
   * Test injection: override the clone source URL (e.g. a `file://` path
   * pointing at a local repo). When set, replaces the default
   * `https://github.com/<targetRepo>.git`.
   */
  originUrl?: string;
}

export interface FileInventory {
  totalFiles: number;
  totalBytes: number;
  byExtension: Record<string, number>;
  /** Manifest filenames present at repo root (lowercased). */
  rootManifests: string[];
  /** Top-level entries (directories + files at depth 1). */
  topLevelEntries: string[];
  /** Lightly-walked list of source files (cap-applied — we don't enumerate everything). */
  sourceFiles: string[];
}

export interface CloneAndIndexResult {
  /** Absolute path to the cloned repo on disk. Caller is responsible for cleanup. */
  cloneDir: string;
  cloneSha: string;
  inventory: FileInventory;
}

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', '.next', 'target',
  '__pycache__', '.venv', 'venv', '.pytest_cache', '.cache',
  '.terraform', '.gradle', 'out', '.vs', '.idea',
]);

const KNOWN_MANIFESTS = new Set([
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
  'pyproject.toml', 'requirements.txt', 'setup.py', 'pipfile',
  'cargo.toml', 'cargo.lock',
  'go.mod', 'go.sum',
  'pom.xml', 'build.gradle', 'build.gradle.kts',
  'gemfile', 'gemfile.lock',
  'composer.json', 'composer.lock',
  'mix.exs',
]);

/** Max source files to enumerate by name (audit log payload control). */
const MAX_SOURCE_FILES = 200;

export function cloneAndIndex(opts: CloneAndIndexOpts): CloneAndIndexResult {
  if (!/^[\w.-]+\/[\w.-]+$/.test(opts.targetRepo)) {
    throw new Error(`clone_and_index: invalid targetRepo "${opts.targetRepo}"; expected owner/repo`);
  }
  const parentDir = opts.parentDir ?? os.tmpdir();
  fs.mkdirSync(parentDir, { recursive: true });
  const cloneDir = fs.mkdtempSync(path.join(parentDir, 'archeologist-clone-'));

  const originUrl = opts.originUrl ?? `https://github.com/${opts.targetRepo}.git`;
  const cloneArgs = ['clone', '--depth', '1', '--single-branch', originUrl, cloneDir];
  if (opts.ref) {
    cloneArgs.splice(0, cloneArgs.length, 'clone', '--depth', '1', '--branch', opts.ref, originUrl, cloneDir);
  }
  const cloneResult = spawnSync('git', cloneArgs, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (cloneResult.status !== 0) {
    fs.rmSync(cloneDir, { recursive: true, force: true });
    throw new Error(`clone_and_index: git clone failed (status=${cloneResult.status}): ${(cloneResult.stderr || '').slice(0, 400)}`);
  }

  const shaResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: cloneDir, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
  const cloneSha = (shaResult.stdout || '').trim();
  if (!/^[0-9a-f]{7,40}$/.test(cloneSha)) {
    fs.rmSync(cloneDir, { recursive: true, force: true });
    throw new Error('clone_and_index: failed to resolve clone HEAD SHA after clone');
  }

  const inventory = walkInventory(cloneDir);

  return { cloneDir, cloneSha, inventory };
}

/** Recursive walker that respects SKIP_DIRS and caps the enumerated sourceFiles list. */
function walkInventory(rootDir: string): FileInventory {
  const inventory: FileInventory = {
    totalFiles: 0,
    totalBytes: 0,
    byExtension: {},
    rootManifests: [],
    topLevelEntries: [],
    sourceFiles: [],
  };

  // Top-level entries (preserve original case so it's obvious if "Api" vs "api")
  const topLevel = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const ent of topLevel) {
    if (SKIP_DIRS.has(ent.name.toLowerCase())) { continue; }
    inventory.topLevelEntries.push(ent.name);
    if (ent.isFile() && KNOWN_MANIFESTS.has(ent.name.toLowerCase())) {
      inventory.rootManifests.push(ent.name);
    }
  }

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const ent of entries) {
      if (SKIP_DIRS.has(ent.name.toLowerCase())) { continue; }
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      if (!ent.isFile()) { continue; }

      let stat: fs.Stats;
      try { stat = fs.statSync(full); } catch { continue; }

      inventory.totalFiles += 1;
      inventory.totalBytes += stat.size;

      const ext = (path.extname(ent.name) || '<noext>').toLowerCase();
      inventory.byExtension[ext] = (inventory.byExtension[ext] ?? 0) + 1;

      if (inventory.sourceFiles.length < MAX_SOURCE_FILES) {
        inventory.sourceFiles.push(path.relative(rootDir, full));
      }
    }
  }
  walk(rootDir);

  // Sort byExtension descending by count for deterministic audit output
  inventory.byExtension = Object.fromEntries(
    Object.entries(inventory.byExtension).sort((a, b) => b[1] - a[1]),
  );

  return inventory;
}
