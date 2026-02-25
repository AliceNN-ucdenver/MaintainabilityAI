const fs = require('fs');
let failedTests = [];

// Python: parse JUnit XML
try {
  const xml = fs.readFileSync('test-results.xml', 'utf8');
  const failures = xml.match(/<testcase[^>]*>[\s\S]*?<failure[\s\S]*?<\/testcase>/g) || [];
  for (const tc of failures) {
    const name = tc.match(/name="([^"]*)"/)?.[1] || 'Unknown';
    const cls = tc.match(/classname="([^"]*)"/)?.[1] || '';
    const msg = tc.match(/<failure[^>]*message="([^"]*)"/)?.[1] || '';
    failedTests.push({ name: cls ? cls + '::' + name : name, error: msg });
  }
} catch (e) { /* fallback to raw output */ }

let rawOutput = '';
try { rawOutput = fs.readFileSync('test-output.txt', 'utf8').substring(0, 8000); } catch {}

const branch = context.ref.replace('refs/heads/', '');
const shortSha = context.sha.substring(0, 7);
const runUrl = context.serverUrl + '/' + context.repo.owner + '/' + context.repo.repo + '/actions/runs/' + context.runId;
const commitUrl = context.serverUrl + '/' + context.repo.owner + '/' + context.repo.repo + '/commit/' + context.sha;
const bt = String.fromCharCode(96);
const bt3 = bt.repeat(3);

let body = '## CI Test Failures\n\n';
body += '| Property | Value |\n|----------|-------|\n';
body += '| **Branch** | ' + bt + branch + bt + ' |\n';
body += '| **Commit** | [' + bt + shortSha + bt + '](' + commitUrl + ') |\n';
body += '| **Run** | [View workflow run](' + runUrl + ') |\n';
body += '| **Updated** | ' + new Date().toISOString() + ' |\n\n';

if (failedTests.length > 0) {
  body += '### Failed Tests (' + failedTests.length + ')\n\n';
  body += '| Test | Error |\n|------|-------|\n';
  for (const t of failedTests.slice(0, 25)) {
    const name = t.name.replace(/\|/g, '\\|').substring(0, 80);
    const err = t.error.split('\n')[0].replace(/\|/g, '\\|').substring(0, 120);
    body += '| ' + bt + name + bt + ' | ' + err + ' |\n';
  }
  if (failedTests.length > 25) {
    body += '\n> Showing 25 of ' + failedTests.length + ' failures. See [full run](' + runUrl + ') for details.\n';
  }
  body += '\n';
}

body += '<details>\n<summary>Full test output</summary>\n\n' + bt3 + '\n' + rawOutput + '\n' + bt3 + '\n\n</details>\n\n';
body += '---\n\nTo trigger AI remediation, comment: ' + bt + '@alice fix test failures' + bt + '\n';

const { data: issues } = await github.rest.issues.listForRepo({
  owner: context.repo.owner,
  repo: context.repo.repo,
  labels: 'ci-failure',
  state: 'open',
  per_page: 1
});

if (issues.length > 0) {
  await github.rest.issues.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issues[0].number,
    body: body
  });
  core.info('Updated issue #' + issues[0].number);
} else {
  const { data: created } = await github.rest.issues.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: '[CI] Test failures',
    body: body,
    labels: ['ci-failure']
  });
  core.info('Created issue #' + created.number);
}
