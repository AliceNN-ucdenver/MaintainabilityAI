/**
 * fixture-target-repo — builds a tiny but realistic git repo for the
 * archaeology-path tests. Returns a file:// URL that clone-and-index can
 * clone offline.
 *
 * Shape: a Node/TypeScript repo with an Express API + React frontend +
 * Postgres data layer — enough surface to exercise language/framework
 * detection, module classification, and endpoint regex.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface FixtureTargetRepo {
  repoDir: string;
  /** file:// URL git can clone from. */
  originUrl: string;
  commitSha: string;
}

const PACKAGE_JSON = JSON.stringify({
  name: 'fixture-celeb-api',
  version: '1.0.0',
  dependencies: {
    express: '^4.18.0',
    pg: '^8.11.0',
    react: '^18.0.0',
    'react-dom': '^18.0.0',
    zod: '^3.0.0',
  },
  devDependencies: {
    typescript: '^5.0.0',
    vitest: '^1.0.0',
  },
}, null, 2);

const README = '# fixture-celeb-api\n\nFixture target for archaeology-path tests.\n';

const API_ROUTES_TS = `import express from 'express';
const app = express();
const router = express.Router();

app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/celebrities', (req, res) => res.status(201).json({ id: 1 }));
router.get('/celebrities/:id', (req, res) => res.json({ id: req.params.id }));
router.delete('/celebrities/:id', (req, res) => res.status(204).end());

export default app;
`;

const API_INDEX_TS = `import app from './routes';
app.listen(3000);
`;

const WEB_APP_TSX = `import React from 'react';
export function App() { return <div>Celeb UI</div>; }
`;

const WEB_INDEX_TSX = `import { App } from './app';
export { App };
`;

const DB_MIGRATIONS_SQL = `CREATE TABLE celebrities (id SERIAL PRIMARY KEY, name TEXT);
`;

const DB_MODELS_TS = `export interface Celebrity { id: number; name: string; }
`;

const SHARED_UTIL_TS = `export const slug = (s: string) => s.toLowerCase();
`;

function git(cwd: string, ...args: string[]): void {
  const r = spawnSync('git', args, { cwd, stdio: 'ignore' });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed (cwd=${cwd}, status=${r.status})`);
  }
}

export function buildFixtureTargetRepo(): FixtureTargetRepo {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archaeology-target-'));

  fs.writeFileSync(path.join(repoDir, 'package.json'), PACKAGE_JSON);
  fs.writeFileSync(path.join(repoDir, 'README.md'), README);

  fs.mkdirSync(path.join(repoDir, 'api'), { recursive: true });
  fs.writeFileSync(path.join(repoDir, 'api', 'routes.ts'), API_ROUTES_TS);
  fs.writeFileSync(path.join(repoDir, 'api', 'index.ts'), API_INDEX_TS);

  fs.mkdirSync(path.join(repoDir, 'web', 'src'), { recursive: true });
  fs.writeFileSync(path.join(repoDir, 'web', 'src', 'app.tsx'), WEB_APP_TSX);
  fs.writeFileSync(path.join(repoDir, 'web', 'src', 'index.tsx'), WEB_INDEX_TSX);

  fs.mkdirSync(path.join(repoDir, 'db', 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(repoDir, 'db', 'migrations', '0001_init.sql'), DB_MIGRATIONS_SQL);
  fs.writeFileSync(path.join(repoDir, 'db', 'models.ts'), DB_MODELS_TS);

  fs.mkdirSync(path.join(repoDir, 'shared'), { recursive: true });
  fs.writeFileSync(path.join(repoDir, 'shared', 'util.ts'), SHARED_UTIL_TS);

  // Init git so clone-and-index can clone from a file:// URL
  git(repoDir, 'init', '-q', '-b', 'main');
  git(repoDir, 'config', 'user.email', 'fixture@example.com');
  git(repoDir, 'config', 'user.name', 'Fixture');
  git(repoDir, 'config', 'commit.gpgsign', 'false');
  git(repoDir, 'add', '-A');
  git(repoDir, 'commit', '-q', '-m', 'fixture target repo');

  const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf8' }).stdout.trim();

  return {
    repoDir,
    originUrl: `file://${repoDir}`,
    commitSha: sha,
  };
}

export function destroyFixtureTargetRepo(handle: FixtureTargetRepo): void {
  fs.rmSync(handle.repoDir, { recursive: true, force: true });
}
