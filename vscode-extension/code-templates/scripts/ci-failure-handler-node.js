const fs = require('fs');
let failedTests = [];
let stats = null;
let lintErrors = [];

// ── Lint output ──────────────────────────────────────────────────────────────
let lintOutput = '';
try { lintOutput = fs.readFileSync('lint-output.txt', 'utf8').substring(0, 6000); } catch {}

if (lintOutput) {
  // Parse ESLint-style output: /path/file.js\n  line:col  error  message  rule-name
  const lines = lintOutput.split('\n');
  let currentFile = '';
  for (const line of lines) {
    const fileLine = line.match(/^(\/\S+\.\w+)/);
    if (fileLine) {
      currentFile = fileLine[1].replace(/.*\//, '');
      continue;
    }
    const errMatch = line.match(/^\s*(\d+):(\d+)\s+(error)\s+(.+?)\s{2,}(\S+)\s*$/);
    if (errMatch) {
      lintErrors.push({
        file: currentFile,
        line: errMatch[1],
        col: errMatch[2],
        message: errMatch[4].trim(),
        rule: errMatch[5]
      });
    }
  }
}

// ── Test results ─────────────────────────────────────────────────────────────

// Parse Jest/Vitest JSON output (writes test-results.json)
try {
  const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
  if (results.testResults) {
    let totalPassed = 0;
    let totalFailed = 0;
    for (const suite of results.testResults) {
      for (const test of (suite.testResults || suite.assertionResults || [])) {
        if (test.status === 'failed') {
          totalFailed++;
          failedTests.push({
            name: test.fullName || test.title || 'Unknown',
            file: suite.testFilePath || suite.name || '',
            error: (test.failureMessages || []).join('\n').substring(0, 500)
          });
        } else if (test.status === 'passed') {
          totalPassed++;
        }
      }
    }
    stats = { total: totalPassed + totalFailed, passed: totalPassed, failed: totalFailed };
  }
} catch (e) { /* no test-results.json — try Mocha format below */ }

// Read test output — use a larger limit so Mocha JSON at the end isn't truncated
let rawOutput = '';
try { rawOutput = fs.readFileSync('test-output.txt', 'utf8'); } catch {}

// Parse Mocha JSON output (writes JSON to stdout → test-output.txt)
// Mocha JSON reporter outputs a pretty-printed JSON block at the end with "stats" key.
// Application logs (e.g. request logs) may produce single-line JSON objects before it.
// Strategy: find "stats" in the output, then walk back to the opening { to find the Mocha block.
if (failedTests.length === 0 && rawOutput) {
  try {
    const statsIdx = rawOutput.indexOf('"stats"');
    if (statsIdx >= 0) {
      // Walk backwards from "stats" to find the opening {
      let braceIdx = rawOutput.lastIndexOf('{', statsIdx);
      if (braceIdx >= 0) {
        const mocha = JSON.parse(rawOutput.substring(braceIdx));
        if (mocha.stats) {
          stats = {
            total: mocha.stats.tests || 0,
            passed: mocha.stats.passes || 0,
            failed: mocha.stats.failures || 0,
            duration: mocha.stats.duration
          };
        }
        if (mocha.failures && Array.isArray(mocha.failures)) {
          for (const t of mocha.failures) {
            failedTests.push({
              name: t.fullTitle || t.title || 'Unknown',
              file: t.file || '',
              error: (t.err && (t.err.message || '') || '').substring(0, 500)
            });
          }
        } else if (mocha.tests && Array.isArray(mocha.tests)) {
          for (const t of mocha.tests) {
            if (t.err && t.err.message) {
              failedTests.push({
                name: t.fullTitle || t.title || 'Unknown',
                file: t.file || '',
                error: t.err.message.substring(0, 500)
              });
            }
          }
        }
      }
    }
  } catch (e) { /* not valid JSON — use raw output fallback */ }
}

// ── Build issue body ─────────────────────────────────────────────────────────

const branch = context.ref.replace('refs/heads/', '');
const shortSha = context.sha.substring(0, 7);
const runUrl = context.serverUrl + '/' + context.repo.owner + '/' + context.repo.repo + '/actions/runs/' + context.runId;
const commitUrl = context.serverUrl + '/' + context.repo.owner + '/' + context.repo.repo + '/commit/' + context.sha;
const bt = String.fromCharCode(96);
const bt3 = bt.repeat(3);

const hasLintErrors = lintErrors.length > 0;
const hasTestFailures = failedTests.length > 0 || (stats && stats.failed > 0);
const titleParts = [];
if (hasLintErrors) titleParts.push('lint errors');
if (hasTestFailures) titleParts.push('test failures');
if (titleParts.length === 0) titleParts.push('failures');
const issueTitle = '[CI] ' + titleParts.join(' + ').replace(/^./, c => c.toUpperCase());

let body = '## CI Failures\n\n';
body += '| Property | Value |\n|----------|-------|\n';
body += '| **Branch** | ' + bt + branch + bt + ' |\n';
body += '| **Commit** | [' + bt + shortSha + bt + '](' + commitUrl + ') |\n';
body += '| **Run** | [View workflow run](' + runUrl + ') |\n';
body += '| **Updated** | ' + new Date().toISOString() + ' |\n';
if (stats) {
  const dur = stats.duration ? ' in ' + (stats.duration / 1000).toFixed(1) + 's' : '';
  body += '| **Tests** | ' + stats.passed + ' passed, **' + stats.failed + ' failed** of ' + stats.total + dur + ' |\n';
}
if (hasLintErrors) {
  body += '| **Lint** | **' + lintErrors.length + ' error(s)** |\n';
}
body += '\n';

// ── Lint errors section ──────────────────────────────────────────────────────

if (hasLintErrors) {
  body += '### Lint Errors (' + lintErrors.length + ')\n\n';
  body += '| File | Line | Error | Rule |\n|------|------|-------|------|\n';
  for (const e of lintErrors.slice(0, 20)) {
    body += '| ' + bt + e.file + bt + ' | ' + e.line + ':' + e.col + ' | ' + e.message.replace(/\|/g, '\\|') + ' | ' + bt + e.rule + bt + ' |\n';
  }
  if (lintErrors.length > 20) {
    body += '\n> Showing 20 of ' + lintErrors.length + ' lint errors. See [full run](' + runUrl + ') for details.\n';
  }
  body += '\n';
}

// ── Test failures section ────────────────────────────────────────────────────

if (failedTests.length > 0) {
  body += '### Failed Tests (' + failedTests.length + ')\n\n';
  for (const t of failedTests.slice(0, 15)) {
    const name = t.name.replace(/[`|]/g, '');
    const file = t.file ? ' — ' + bt + t.file.replace(/.*\//, '') + bt : '';
    body += '#### ' + name + file + '\n\n';
    if (t.error) {
      body += bt3 + '\n' + t.error + '\n' + bt3 + '\n\n';
    }
  }
  if (failedTests.length > 15) {
    body += '> Showing 15 of ' + failedTests.length + ' failures. See [full run](' + runUrl + ') for details.\n\n';
  }
} else if (!hasLintErrors) {
  // No parsed failures and no lint errors — show link to run
  body += '### Test Failures\n\nCould not parse test output. [View full run](' + runUrl + ') for details.\n\n';
}

body += '---\n\nTo trigger AI remediation, comment: ' + bt + '@alice fix these failures' + bt + '\n';

// ── Create or update issue ───────────────────────────────────────────────────

const { data: issues } = await github.rest.issues.listForRepo({
  owner: context.repo.owner,
  repo: context.repo.repo,
  labels: 'ci-failure',
  state: 'open',
  per_page: 1
});

// Only update if the issue is actually open (double-check against API edge cases)
const openIssue = issues.length > 0 && issues[0].state === 'open' ? issues[0] : null;

if (openIssue) {
  await github.rest.issues.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: openIssue.number,
    title: issueTitle,
    body: body
  });
  core.info('Updated issue #' + openIssue.number);
} else {
  const { data: created } = await github.rest.issues.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: issueTitle,
    body: body,
    labels: ['ci-failure']
  });
  core.info('Created issue #' + created.number);
}
