import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectCoverageCommand } from '../coverageCommand';

function makeRepo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-cmd-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

describe('detectCoverageCommand', () => {
  const dirs: string[] = [];
  const repo = (files: Record<string, string>) => {
    const d = makeRepo(files);
    dirs.push(d);
    return d;
  };

  beforeEach(() => { dirs.length = 0; });
  afterEach(() => {
    for (const d of dirs) { fs.rmSync(d, { recursive: true, force: true }); }
  });

  it('returns a SEPARATE report step (never &&-chained) for a nyc-based coverage script', () => {
    const dir = repo({
      'package.json': JSON.stringify({
        scripts: { coverage: 'nyc mocha' },
        devDependencies: { nyc: '^15.0.0', mocha: '^10.0.0' },
      }),
    });

    const cmds = detectCoverageCommand(dir, 'npm');

    // Two independent steps — the report is its own line so it runs even when
    // the test step exits non-zero (failing tests / unmet threshold).
    expect(cmds).toEqual([
      'npm run coverage',
      'npx nyc report --report-dir=coverage --reporter=json-summary',
    ]);
    // Guard against regressing to a chained one-liner.
    expect(cmds.some((c) => c.includes('&&'))).toBe(false);
  });

  it('honors test:coverage over coverage and appends the c8 report step', () => {
    const dir = repo({
      'package.json': JSON.stringify({
        scripts: { coverage: 'should-not-win', 'test:coverage': 'c8 node --test' },
        devDependencies: { c8: '^9.0.0' },
      }),
    });

    expect(detectCoverageCommand(dir, 'npm')).toEqual([
      'npm run test:coverage',
      'npx c8 report -o coverage --reporter=json-summary',
    ]);
  });

  it('uses the project package manager for the script runner', () => {
    const dir = repo({
      'package.json': JSON.stringify({
        scripts: { coverage: 'nyc jest' },
        devDependencies: { nyc: '^15.0.0', pnpm: '^9.0.0' },
      }),
    });

    expect(detectCoverageCommand(dir, 'npm')[0]).toBe('pnpm run coverage');
  });

  it('returns a single self-contained command for jest with no coverage script', () => {
    const dir = repo({
      'package.json': JSON.stringify({ devDependencies: { jest: '^29.0.0' } }),
    });

    const cmds = detectCoverageCommand(dir, 'npm');
    expect(cmds).toHaveLength(1);
    expect(cmds[0]).toContain('jest --coverage');
    expect(cmds[0]).toContain('json-summary');
  });

  it('returns a single nyc-wrapper command (writes its own report) for standalone nyc', () => {
    const dir = repo({
      'package.json': JSON.stringify({
        scripts: { test: 'mocha' },
        devDependencies: { nyc: '^15.0.0' },
      }),
    });

    const cmds = detectCoverageCommand(dir, 'npm');
    expect(cmds).toHaveLength(1);
    // The wrapper instruments the project's own `test` script and writes the
    // report itself regardless of the wrapped command's exit code, so one step.
    expect(cmds[0]).toBe('npx nyc --report-dir=coverage --reporter=json-summary --reporter=text mocha');
  });

  it('detects pytest for a poetry pyproject', () => {
    const dir = repo({ 'pyproject.toml': '[tool.poetry]\nname = "x"\n' });
    expect(detectCoverageCommand(dir, 'poetry')).toEqual([
      'poetry run pytest --cov --cov-report=json --cov-report=term',
    ]);
  });

  it('falls back to npm test --coverage when nothing is detected', () => {
    const dir = repo({ 'package.json': JSON.stringify({ scripts: {}, devDependencies: {} }) });
    expect(detectCoverageCommand(dir, 'unknown')).toEqual(['npm test -- --coverage']);
  });

  it('falls back when no workspace root is given', () => {
    expect(detectCoverageCommand(undefined, 'npm')).toEqual(['npm test -- --coverage']);
  });
});
