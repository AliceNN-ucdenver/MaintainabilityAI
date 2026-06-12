/**
 * Grounded-RCTRO repo-context scanner (Cheshire v2). Verifies the scan that
 * feeds the `## Repository Context` block: repo-metadata + manifest + file tree
 * + description-ranked / explicit-target excerpts, all from a temp folder.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildRepoContext } from '../RepoContextScanner';

describe('RepoContextScanner.buildRepoContext', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-ctx-'));
    fs.mkdirSync(path.join(root, '.github'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src', 'services'), { recursive: true });
    fs.mkdirSync(path.join(root, 'node_modules', 'junk'), { recursive: true });
    fs.writeFileSync(path.join(root, '.github', 'repo-metadata.yml'), 'language: TypeScript\ntesting: Jest\npackage_manager: npm\n');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'demo', dependencies: { express: '^4' } }, null, 2));
    fs.writeFileSync(path.join(root, 'src', 'services', 'movieApi.ts'), 'export function fetchMovies() { return []; }\n');
    fs.writeFileSync(path.join(root, 'src', 'index.ts'), 'console.log("hi");\n');
    fs.writeFileSync(path.join(root, 'node_modules', 'junk', 'big.js'), 'module.exports = {};\n');
  });

  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it('returns null for a missing folder', () => {
    expect(buildRepoContext(path.join(root, 'nope'))).toBeNull();
  });

  it('includes repo-metadata, the manifest, and a file tree', () => {
    const ctx = buildRepoContext(root)!;
    expect(ctx).toContain('repo-metadata.yml');
    expect(ctx).toContain('language: TypeScript');
    expect(ctx).toContain('package.json');
    expect(ctx).toContain('File tree');
    expect(ctx).toContain('src/services/movieApi.ts');
  });

  it('excludes node_modules from the tree', () => {
    const ctx = buildRepoContext(root)!;
    expect(ctx).not.toContain('node_modules');
  });

  it('excerpts files whose paths match the description terms', () => {
    const ctx = buildRepoContext(root, { description: 'add caching to the movie api' })!;
    expect(ctx).toContain('Relevant file excerpts');
    expect(ctx).toContain('src/services/movieApi.ts');
    expect(ctx).toContain('export function fetchMovies');
  });

  it('excerpts explicit target files (scorecard / codeql path) over description ranking', () => {
    const ctx = buildRepoContext(root, { targetFiles: ['src/index.ts'] })!;
    expect(ctx).toContain('Relevant file excerpts');
    expect(ctx).toContain('src/index.ts');
    expect(ctx).toContain('console.log("hi")');
  });

  it('does not excerpt when there is no description and no targets', () => {
    const ctx = buildRepoContext(root)!;
    expect(ctx).not.toContain('Relevant file excerpts');
  });
});
