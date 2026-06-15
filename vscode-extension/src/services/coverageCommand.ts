import * as fs from 'fs';
import * as path from 'path';

/**
 * Determine the coverage command(s) for a workspace, returned as an ordered
 * list of terminal lines.
 *
 * Each line is meant to be sent to the terminal SEPARATELY and run
 * INDEPENDENTLY (not `&&`-chained). That matters for the json-summary report
 * step: failing tests or an unmet coverage threshold make the test runner exit
 * non-zero *after* the coverage data is already written to `.nyc_output` / the
 * V8 tmp dir. With `&&` the report would be skipped exactly then — i.e. the
 * dashboard would go blank precisely when coverage is most worth seeing. As
 * separate lines the report always runs, and it's also fully shell-portable
 * (no `&&` vs `;` vs `&` differences across bash/zsh/PowerShell/cmd).
 *
 * Priority:
 *   1. Existing script named "test:coverage" or "coverage" in package.json
 *      (the json-summary report is appended as its own step)
 *   2. Coverage tool in devDependencies (nyc, c8, jest, vitest, pytest-cov)
 *   3. Fallback based on detected test framework / package manager
 */
export function detectCoverageCommand(workspaceRoot: string | undefined, packageManager: string): string[] {
  if (!workspaceRoot) { return ['npm test -- --coverage']; }

  // ── Python projects ──
  const pyprojectPath = path.join(workspaceRoot, 'pyproject.toml');
  const setupCfgPath = path.join(workspaceRoot, 'setup.cfg');
  const requirementsPath = path.join(workspaceRoot, 'requirements.txt');
  const hasPyproject = fs.existsSync(pyprojectPath);
  const hasSetupCfg = fs.existsSync(setupCfgPath);
  const hasRequirements = fs.existsSync(requirementsPath);

  if (hasPyproject || hasSetupCfg) {
    // Detect runner from pyproject.toml
    if (hasPyproject) {
      try {
        const pyContent = fs.readFileSync(pyprojectPath, 'utf-8');
        if (pyContent.includes('[tool.poetry]')) {
          return ['poetry run pytest --cov --cov-report=json --cov-report=term'];
        }
        if (pyContent.includes('pytest-cov') || pyContent.includes('[tool.pytest')) {
          return ['python -m pytest --cov --cov-report=json --cov-report=term'];
        }
      } catch { /* fall through */ }
    }
    // Generic Python
    return ['python -m pytest --cov --cov-report=json --cov-report=term'];
  }

  if (hasRequirements) {
    try {
      const reqContent = fs.readFileSync(requirementsPath, 'utf-8');
      if (reqContent.includes('pytest-cov') || reqContent.includes('coverage')) {
        return ['python -m pytest --cov --cov-report=json --cov-report=term'];
      }
    } catch { /* fall through */ }
  }

  // ── Node.js / TypeScript projects ──
  const pkgPath = path.join(workspaceRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) { return ['npm test -- --coverage']; }

  let pkg: { scripts?: Record<string, string>; devDependencies?: Record<string, string>; dependencies?: Record<string, string> };
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch {
    return ['npm test -- --coverage'];
  }

  const scripts = pkg.scripts || {};
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // 1. Prefer an existing coverage script. Emit the json-summary report as a
  //    SEPARATE step so it runs even when the script exits non-zero (failing
  //    tests / unmet threshold) — the .nyc_output (or V8) data is written by then.
  const coverageScript = scripts['test:coverage'] ? 'test:coverage' : scripts['coverage'] ? 'coverage' : null;
  if (coverageScript) {
    const runner = allDeps['yarn'] ? 'yarn' : allDeps['pnpm'] ? 'pnpm' : 'npm';
    const base = `${runner} run ${coverageScript}`;
    if (allDeps['nyc']) { return [base, 'npx nyc report --report-dir=coverage --reporter=json-summary']; }
    if (allDeps['c8']) { return [base, 'npx c8 report -o coverage --reporter=json-summary']; }
    return [base];
  }

  // 2. Detect from devDependencies — pick the coverage tool that's actually installed
  const hasNyc = !!allDeps['nyc'];
  const hasC8 = !!allDeps['c8'];
  const hasJest = !!allDeps['jest'];
  const hasVitest = !!allDeps['vitest'];
  const hasMocha = !!allDeps['mocha'];

  // jest and vitest have built-in coverage (single self-contained command)
  if (hasJest) {
    return ['npx jest --coverage --coverageReporters=json-summary --coverageReporters=text'];
  }
  if (hasVitest) {
    return ['npx vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=text --coverage.reportsDirectory=coverage'];
  }
  // mocha needs an external coverage tool. Prefer the project's own `test`
  // script (it knows the real spec glob and any build step — e.g. `tsc` then
  // `dist/tests/**/*.test.js`) over a hardcoded `mocha --recursive`, which
  // defaults to ./test and silently finds nothing when the project keeps
  // tests under tests/ or compiles them to dist/.
  if (hasMocha) {
    const runner = allDeps['yarn'] ? 'yarn' : allDeps['pnpm'] ? 'pnpm' : 'npm';
    const target = scripts['test'] ? `${runner} test` : 'mocha --recursive --exit';
    const tool = hasNyc
      ? 'npx nyc --report-dir=coverage --reporter=json-summary --reporter=text'
      : 'npx c8 -o coverage --reporter=json-summary --reporter=text';
    return [`${tool} ${target}`];
  }
  // Standalone nyc or c8 wrapping npm test — the wrapper writes the report
  // itself regardless of the wrapped command's exit code, so one line is enough.
  if (hasNyc) {
    const testCmd = scripts['test'] || 'echo "no test script"';
    return [`npx nyc --report-dir=coverage --reporter=json-summary --reporter=text ${testCmd}`];
  }
  if (hasC8) {
    const testCmd = scripts['test'] || 'echo "no test script"';
    return [`npx c8 -o coverage --reporter=json-summary --reporter=text ${testCmd}`];
  }

  // 3. Fallback based on detected package manager
  const pmFallbacks: Record<string, string> = {
    pip: 'python -m pytest --cov --cov-report=json --cov-report=term',
    uv: 'uv run pytest --cov --cov-report=json --cov-report=term',
    poetry: 'poetry run pytest --cov --cov-report=json --cov-report=term',
    pipenv: 'pipenv run pytest --cov --cov-report=json --cov-report=term',
  };
  if (pmFallbacks[packageManager]) {
    return [pmFallbacks[packageManager]];
  }

  // Last resort — pass --coverage and hope the runner supports it
  if (allDeps['nyc']) { return ['npx nyc --report-dir=coverage --reporter=json-summary --reporter=text npm test']; }
  if (allDeps['c8']) { return ['npx c8 -o coverage --reporter=json-summary --reporter=text npm test']; }
  return ['npm test -- --coverage'];
}
