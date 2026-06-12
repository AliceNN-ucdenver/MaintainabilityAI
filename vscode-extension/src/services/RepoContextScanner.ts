/**
 * Repo-context scanner for grounded RCTRO generation (Cheshire v2).
 *
 * Generate-RCTRO used to know only the tech stack + the feature description, so
 * a "blind feature" produced requirements that named no real files. This scans
 * the selected folder — filesystem-side, no network — into a compact
 * `## Repository Context` block the embedded LLM grounds on: the BAR's
 * repo-metadata, the manifest, a depth-bounded file tree, and (for a feature
 * ask) small excerpts of the files whose paths best match the description.
 *
 * All output is byte-capped so the prompt stays within model limits.
 */
import * as fs from 'fs';
import * as path from 'path';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next',
  '.nuxt', '__pycache__', '.venv', 'venv', '.cache', 'vendor', '.redqueen',
]);
const SOURCE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rb', '.java',
  '.cs', '.php', '.rs', '.vue', '.svelte',
]);
const MANIFESTS = ['package.json', 'pyproject.toml', 'requirements.txt', 'go.mod', 'pom.xml', 'Gemfile', 'composer.json', 'Cargo.toml'];

const MAX_TREE_FILES = 200;
const MAX_EXCERPT_FILES = 4;
const MAX_EXCERPT_BYTES = 2500;
const MAX_TOTAL_BYTES = 14000;

export interface RepoContextOptions {
  /** Feature description — when present, the scanner excerpts the files whose
   *  paths best match its terms (the "blind feature" grounding path). */
  description?: string;
  /** Explicit target files to excerpt (scorecard / CodeQL tasks already know
   *  which files matter — sub-80% coverage files, hotspots, the flagged file). */
  targetFiles?: string[];
}

/** Walk the folder (gitignore-naive but IGNORE_DIRS-aware), capped at
 *  MAX_TREE_FILES, returning repo-relative source/config paths. */
function walk(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length && out.length < MAX_TREE_FILES) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (out.length >= MAX_TREE_FILES) { break; }
      if (e.name.startsWith('.') && e.name !== '.github') { continue; }
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) { stack.push(full); }
      } else if (SOURCE_EXT.has(path.extname(e.name)) || MANIFESTS.includes(e.name)) {
        out.push(path.relative(root, full));
      }
    }
  }
  return out.sort();
}

function readCapped(file: string, cap: number): string | null {
  try {
    const buf = fs.readFileSync(file, 'utf8');
    return buf.length > cap ? buf.slice(0, cap) + '\n… (truncated)' : buf;
  } catch { return null; }
}

/** Rank files by overlap of their path tokens with the description's terms. */
function rankByDescription(files: string[], description: string): string[] {
  const terms = description.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  if (terms.length === 0) { return []; }
  const termSet = new Set(terms);
  const scored = files
    .filter(f => SOURCE_EXT.has(path.extname(f)))
    .map(f => {
      // Split camelCase (movieApi → movie api) so path tokens match prose terms.
      const tokens = f.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().match(/[a-z0-9]+/g) || [];
      const score = tokens.reduce((s, t) => s + (termSet.has(t) ? 1 : 0), 0);
      return { f, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map(x => x.f);
}

/**
 * Build the `## Repository Context` block for a folder. Returns null when the
 * folder can't be read (the caller falls back to tech-stack-only grounding).
 */
export function buildRepoContext(folderPath: string, opts: RepoContextOptions = {}): string | null {
  if (!folderPath || !fs.existsSync(folderPath)) { return null; }

  const parts: string[] = [];

  // 1. repo-metadata.yml (the canonical grounding handoff)
  const metaPath = path.join(folderPath, '.github', 'repo-metadata.yml');
  const meta = readCapped(metaPath, 1500);
  if (meta) { parts.push('### repo-metadata.yml\n```yaml\n' + meta.trim() + '\n```'); }

  // 2. Manifest
  for (const m of MANIFESTS) {
    const mp = path.join(folderPath, m);
    if (fs.existsSync(mp)) {
      const content = readCapped(mp, 2000);
      if (content) { parts.push(`### ${m}\n\`\`\`\n${content.trim()}\n\`\`\``); }
      break;
    }
  }

  // 3. File tree
  const files = walk(folderPath);
  if (files.length) {
    const treeNote = files.length >= MAX_TREE_FILES ? ` (first ${MAX_TREE_FILES})` : '';
    parts.push(`### File tree${treeNote}\n\`\`\`\n${files.join('\n')}\n\`\`\``);
  }

  // 4. Excerpts — explicit targets win; otherwise rank by the description.
  const targets = (opts.targetFiles && opts.targetFiles.length)
    ? opts.targetFiles
    : (opts.description ? rankByDescription(files, opts.description) : []);
  const excerpts: string[] = [];
  for (const rel of targets.slice(0, MAX_EXCERPT_FILES)) {
    const content = readCapped(path.join(folderPath, rel), MAX_EXCERPT_BYTES);
    if (content) {
      const lang = path.extname(rel).replace('.', '') || 'text';
      excerpts.push(`### ${rel}\n\`\`\`${lang}\n${content.trim()}\n\`\`\``);
    }
  }
  if (excerpts.length) { parts.push('## Relevant file excerpts\n\n' + excerpts.join('\n\n')); }

  if (parts.length === 0) { return null; }
  let block = parts.join('\n\n');
  if (block.length > MAX_TOTAL_BYTES) { block = block.slice(0, MAX_TOTAL_BYTES) + '\n… (context truncated)'; }
  return block;
}
