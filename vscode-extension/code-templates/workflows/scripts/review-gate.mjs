#!/usr/bin/env node
/**
 * review-gate.mjs — merge-boundary verification for BAR governance reviews
 * (governance-review-alignment v2).
 *
 * Runs inside review-agent.yml on a PR. Re-derives every check from the
 * diff + the dispatch issue — it trusts NONE of the agent's self-reported
 * numbers. Four gates:
 *
 *   1. scope     — every changed file is under ONE bar_path and is either
 *                  `reports/review-<N>.md` or `reviews.yaml`. Nothing else.
 *   2. structure — the report has the seven H2 sections (minus pillar
 *                  sections out of scope); each pillar section's findings
 *                  are `**[severity]**` bullets.
 *   3. record    — the reviews.yaml diff appends exactly ONE record; its
 *                  issue_number == N; its pillar keys == scope; counts are
 *                  non-negative ints and `findings` == the severity sum.
 *   4. math      — recompute drift from the record's counts (100 −
 *                  15c−5h−2m−1l, floored at 0) == drift_score; AND recount
 *                  the report's severity bullets per pillar == the record's
 *                  counts (the honesty rule — report and record agree).
 *
 * Non-review PRs (no review-<N>.md / reviews.yaml touched) exit 0 quietly.
 * Failures post ONE PR comment with named reasons, apply `review-invalid`,
 * and exit 1. Clean runs remove `review-invalid`, apply `review-pass`.
 *
 * Env: GH_TOKEN, REPO (owner/name), PR_NUMBER, HEAD_SHA, BASE_SHA.
 *
 * The pure verification (`evaluateArtifacts` + its helpers) is exported and
 * exercised by review-gate.test.mjs (node --test). The gh/git I/O lives in
 * `main()`, which runs only when the script is invoked directly.
 *
 * SAFETY: this script is the ONLY thing review-agent.yml runs over a
 * checked-out PR head. It reads files and shells out to git/gh; it never
 * executes PR-supplied code.
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';

// ── Contract constants (parity-pinned by phase-contract-parity.test.ts) ──
// REQUIRED_H2 is the canonical review-report section order. The pillar
// sections map 1:1 to the `scope` pillar keys (note `risk` → "Information
// Risk Findings" — the persona writes `risk:` in reviews.yaml).
export const REQUIRED_H2 = [
  'Summary',
  'Architecture Findings',
  'Security Findings',
  'Information Risk Findings',
  'Operations Findings',
  'Recommendations',
  'References',
];
export const PILLAR_SECTION = {
  architecture: 'Architecture Findings',
  security: 'Security Findings',
  risk: 'Information Risk Findings',
  operations: 'Operations Findings',
};
export const SEVERITIES = ['critical', 'high', 'medium', 'low'];
export const DRIFT_WEIGHTS = { critical: 15, high: 5, medium: 2, low: 1 };

const REPORT_RE = /^(platforms\/[^/]+\/bars\/[^/]+)\/reports\/review-(\d+)\.md$/;
const REVIEWS_RE = /^(platforms\/[^/]+\/bars\/[^/]+)\/reviews\.yaml$/;

// ── Pure helpers ─────────────────────────────────────────────────────

/** Canonical drift score from per-pillar severity counts (floored at 0). */
export function computeDrift(pillars) {
  let deductions = 0;
  for (const c of Object.values(pillars)) {
    for (const sev of SEVERITIES) deductions += (c[sev] || 0) * DRIFT_WEIGHTS[sev];
  }
  return Math.max(0, 100 - deductions);
}

/** Extract the body text of a `## <heading>` section from markdown. */
export function sectionBody(md, heading) {
  const re = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const m = re.exec(md);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

/** Count findings per severity in a section body. A finding opens a line with
 *  the severity in bold brackets — tolerant of both shapes the agent emits:
 *    `**[high] Short title**`      (heading style — observed live on #222)
 *    `- **[high]** text`           (bullet style — observed on #216/#218)
 *    `**[high]** text`             (bold-only)
 *  Line-anchored so a severity mentioned inside a finding body isn't recounted. */
export function countSeverities(body) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  const re = /^\s*(?:[-*]\s+)?\*\*\[(critical|high|medium|low)\]/gim;
  let m;
  while ((m = re.exec(body)) !== null) { counts[m[1].toLowerCase()]++; }
  return counts;
}

/** Minimal reviews.yaml record parser (mirrors BarService.parseReviewsYaml). */
export function parseRecords(yaml) {
  const idx = yaml.indexOf('reviews:');
  if (idx === -1) return [];
  const blocks = yaml.slice(idx).split(/\n\s+-\s+(?:issue_url|issueUrl):\s*/);
  const recs = [];
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const get = (k) => {
      const m = b.match(new RegExp(`(?:^|\\n)\\s*${k}:\\s*(.+)`, 'm'));
      return m ? m[1].replace(/^["']|["']$/g, '').trim() : '';
    };
    const num = parseInt(get('issue_number') || get('issueNumber'), 10);
    const drift = parseInt(get('drift_score') || get('driftScore'), 10);
    const pillars = {};
    for (const key of ['architecture', 'security', 'risk', 'operations', 'information-risk']) {
      const pIdx = b.indexOf(`${key}:`);
      if (pIdx === -1) continue;
      const pb = b.slice(pIdx, pIdx + 300);
      const n = (k) => {
        const m = pb.match(new RegExp(`${k}:\\s*(\\d+)`));
        return m ? parseInt(m[1], 10) : 0;
      };
      const canonical = key === 'information-risk' ? 'risk' : key;
      pillars[canonical] = {
        findings: n('findings'), critical: n('critical'), high: n('high'),
        medium: n('medium'), low: n('low'),
      };
    }
    recs.push({ issueNumber: num, driftScore: drift, pillars });
  }
  return recs;
}

/** Parse `bar_path` + `scope` from a dispatch issue's ```oraculum block. */
export function parseOraculumBlock(body) {
  const block = (body || '').match(/```oraculum\n([\s\S]*?)```/);
  if (!block) return { barPath: null, scope: null };
  const text = block[1];
  const bp = text.match(/bar_path:\s*(\S+)/);
  const sm = text.match(/scope:\s*\n((?:\s*-\s*\w[\w-]*\s*\n?)+)/);
  const scope = sm
    ? sm[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean)
    : null;
  return { barPath: bp ? bp[1] : null, scope };
}

/**
 * Pure gate over already-fetched inputs. Returns { reasons[], barPath,
 * issueNum, isReviewPr }. Side-effect-free → unit-testable.
 *
 * @param {object} a
 * @param {string[]} a.changed       changed file paths
 * @param {string|null} a.reportText report markdown at head (or null)
 * @param {string} a.headYaml        reviews.yaml at head
 * @param {string} a.baseYaml        reviews.yaml at base
 * @param {string[]|null} a.issueScope  scope pillars from the dispatch issue
 * @param {string|null} a.issueBarPath  bar_path from the dispatch issue
 * @param {boolean} a.issueHasLabel  issue carries oraculum-review
 * @param {boolean} a.issueReadable  issue body was fetched
 * @param {number[]} a.closesIssues  structural closing references
 */
export function evaluateArtifacts(a) {
  const reasons = [];
  const fail = (r) => reasons.push(r);

  const reportFile = a.changed.find((f) => REPORT_RE.test(f));
  const reviewsFile = a.changed.find((f) => REVIEWS_RE.test(f));
  if (!reportFile && !reviewsFile) {
    return { reasons, barPath: null, issueNum: null, isReviewPr: false };
  }

  // 1. Scope + identity
  let barPath = null;
  let issueNum = null;
  if (reportFile) {
    const m = reportFile.match(REPORT_RE);
    barPath = m[1];
    issueNum = parseInt(m[2], 10);
  }
  if (reviewsFile) {
    const m = reviewsFile.match(REVIEWS_RE);
    if (barPath && m[1] !== barPath) {
      fail(`scope-violation:reviews.yaml under ${m[1]} but report under ${barPath}`);
    }
    barPath = barPath || m[1];
  }
  for (const f of a.changed) {
    const okReport = REPORT_RE.test(f) && f.startsWith(`${barPath}/`);
    const okReviews = REVIEWS_RE.test(f) && f.startsWith(`${barPath}/`);
    if (!okReport && !okReviews) fail(`scope-violation:${f}`);
  }
  if (!reportFile) fail('structure-invalid:missing report-<N>.md');
  if (!reviewsFile) fail('record-mismatch:reviews.yaml not changed');

  // 2. Dispatch issue cross-checks
  if (issueNum != null) {
    if (!a.issueReadable) fail(`issue-unresolved:#${issueNum} not readable`);
    else {
      if (!a.issueHasLabel) fail(`issue-unresolved:#${issueNum} missing oraculum-review label`);
      if (a.issueBarPath && barPath && a.issueBarPath !== barPath) {
        fail(`scope-violation:issue bar_path ${a.issueBarPath} != PR bar_path ${barPath}`);
      }
    }
    if (a.closesIssues && a.closesIssues.length && !a.closesIssues.includes(issueNum)) {
      fail(`issue-unresolved:PR does not close #${issueNum} (closes: ${a.closesIssues.join(',')})`);
    }
  }

  const inScope = a.issueScope && a.issueScope.length ? a.issueScope : Object.keys(PILLAR_SECTION);

  // 3. Structure gate
  if (a.reportText) {
    const h2s = [...a.reportText.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
    const expected = REQUIRED_H2.filter((s) => {
      const pillar = Object.keys(PILLAR_SECTION).find((p) => PILLAR_SECTION[p] === s);
      return !pillar || inScope.includes(pillar);
    });
    for (const s of expected) {
      if (!h2s.includes(s)) fail(`structure-invalid:missing section "${s}"`);
    }
    for (const [pillar, section] of Object.entries(PILLAR_SECTION)) {
      if (!inScope.includes(pillar) && h2s.includes(section)) {
        fail(`structure-invalid:section "${section}" present but ${pillar} not in scope`);
      }
    }
  } else if (reportFile) {
    fail(`structure-invalid:report file ${reportFile} unreadable`);
  }

  // 4. Record gate
  let newRecord = null;
  if (reviewsFile) {
    const headRecs = parseRecords(a.headYaml || '');
    const baseRecs = parseRecords(a.baseYaml || '');
    if (headRecs.length !== baseRecs.length + 1) {
      fail(`record-mismatch:expected exactly 1 new record, base=${baseRecs.length} head=${headRecs.length}`);
    }
    for (let i = 0; i < baseRecs.length; i++) {
      if (!headRecs[i] || headRecs[i].issueNumber !== baseRecs[i].issueNumber) {
        fail(`record-mismatch:prior record at index ${i} rewritten or reordered`);
        break;
      }
    }
    newRecord = headRecs[headRecs.length - 1] || null;
    if (!newRecord) fail('record-mismatch:no parseable record in reviews.yaml');
    else {
      if (issueNum != null && newRecord.issueNumber !== issueNum) {
        fail(`record-mismatch:new record issue_number ${newRecord.issueNumber} != ${issueNum}`);
      }
      const recPillars = Object.keys(newRecord.pillars).sort();
      const wantPillars = [...inScope].sort();
      if (recPillars.join(',') !== wantPillars.join(',')) {
        fail(`record-mismatch:pillar keys [${recPillars}] != scope [${wantPillars}]`);
      }
      for (const [pillar, c] of Object.entries(newRecord.pillars)) {
        for (const sev of SEVERITIES) {
          if (!Number.isInteger(c[sev]) || c[sev] < 0) {
            fail(`record-mismatch:${pillar}.${sev} not a non-negative integer`);
          }
        }
        const sum = SEVERITIES.reduce((s, k) => s + c[k], 0);
        if (c.findings !== sum) {
          fail(`record-mismatch:${pillar}.findings ${c.findings} != severity sum ${sum}`);
        }
      }
    }
  }

  // 5. Math gate
  if (newRecord) {
    const recomputed = computeDrift(newRecord.pillars);
    if (recomputed !== newRecord.driftScore) {
      fail(`math-mismatch:drift_score ${newRecord.driftScore} != recomputed ${recomputed}`);
    }
    if (a.reportText) {
      for (const pillar of Object.keys(newRecord.pillars)) {
        const section = PILLAR_SECTION[pillar];
        if (!section) continue;
        const rc = countSeverities(sectionBody(a.reportText, section));
        for (const sev of SEVERITIES) {
          if (rc[sev] !== newRecord.pillars[pillar][sev]) {
            fail(`math-mismatch:${pillar}.${sev} report=${rc[sev]} record=${newRecord.pillars[pillar][sev]}`);
          }
        }
      }
    }
  }

  return { reasons, barPath, issueNum, isReviewPr: true };
}

// ── I/O orchestration (runs only when invoked directly) ──────────────

function main() {
  const env = process.env;
  const REPO = env.REPO;
  const PR = env.PR_NUMBER;
  const BASE_SHA = env.BASE_SHA;

  const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const shQuiet = (cmd) => { try { return sh(cmd); } catch { return ''; } };

  let changed = [];
  const diff = shQuiet(`git diff --name-only ${BASE_SHA}...HEAD`).trim()
    || shQuiet(`git diff --name-only ${BASE_SHA} HEAD`).trim();
  changed = diff ? diff.split('\n').map((s) => s.trim()).filter(Boolean) : [];

  const reportFile = changed.find((f) => REPORT_RE.test(f));
  const reviewsFile = changed.find((f) => REVIEWS_RE.test(f));
  if (!reportFile && !reviewsFile) {
    console.log('Not a review PR (no review-<N>.md or reviews.yaml changed). Skipping gate.');
    process.exit(0);
  }

  const issueNum = reportFile ? parseInt(reportFile.match(REPORT_RE)[2], 10) : null;

  // Fetch dispatch issue
  let issueReadable = false, issueHasLabel = false, issueBarPath = null, issueScope = null;
  if (issueNum != null) {
    const issueJson = shQuiet(`gh issue view ${issueNum} --repo ${REPO} --json labels,body`);
    if (issueJson) {
      issueReadable = true;
      let issue = null;
      try { issue = JSON.parse(issueJson); } catch { /* unparseable */ }
      issueHasLabel = (issue?.labels || []).some((l) => l.name === 'oraculum-review');
      const parsed = parseOraculumBlock(issue?.body || '');
      issueBarPath = parsed.barPath;
      issueScope = parsed.scope;
    }
  }
  const closesIssues = shQuiet(
    `gh pr view ${PR} --repo ${REPO} --json closingIssuesReferences --jq '.closingIssuesReferences[].number'`,
  ).trim().split('\n').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));

  const reportText = reportFile && fs.existsSync(reportFile)
    ? fs.readFileSync(reportFile, 'utf8') : null;
  const headYaml = reviewsFile && fs.existsSync(reviewsFile)
    ? fs.readFileSync(reviewsFile, 'utf8') : '';
  const baseYaml = reviewsFile ? shQuiet(`git show ${BASE_SHA}:${reviewsFile}`) : '';

  const { reasons, barPath } = evaluateArtifacts({
    changed, reportText, headYaml, baseYaml,
    issueScope, issueBarPath, issueHasLabel, issueReadable, closesIssues,
  });

  const marker = '<!-- review-gate -->';
  const upsertComment = (body) => {
    const ids = shQuiet(
      `gh api repos/${REPO}/issues/${PR}/comments --paginate ` +
      `--jq '.[] | select(.body | startswith("${marker}")) | .id'`,
    ).trim().split('\n').map((s) => s.trim()).filter(Boolean);
    for (const id of ids) shQuiet(`gh api -X DELETE repos/${REPO}/issues/comments/${id}`);
    const tmp = `/tmp/review-gate-comment-${PR}.md`;
    fs.writeFileSync(tmp, body);
    shQuiet(`gh pr comment ${PR} --repo ${REPO} --body-file ${tmp}`);
  };

  if (reasons.length) {
    upsertComment([
      marker, '### ❌ Review gate failed', '',
      'The architecture-review PR did not pass the merge-boundary checks. Re-derived reasons:', '',
      ...reasons.map((r) => `- \`${r}\``), '',
      '> Fix the artifact and push; this gate re-runs on every update.',
    ].join('\n'));
    shQuiet(`gh pr edit ${PR} --repo ${REPO} --remove-label review-pass`);
    shQuiet(`gh pr edit ${PR} --repo ${REPO} --add-label review-invalid`);
    console.error(`Review gate FAILED:\n${reasons.map((r) => '  - ' + r).join('\n')}`);
    process.exit(1);
  }
  upsertComment([
    marker, '### ✅ Review gate passed', '',
    `Scope, structure, record, and drift-math checks all passed for \`${barPath}\` (issue #${issueNum}).`,
  ].join('\n'));
  shQuiet(`gh pr edit ${PR} --repo ${REPO} --remove-label review-invalid`);
  shQuiet(`gh pr edit ${PR} --repo ${REPO} --add-label review-pass`);
  console.log('Review gate passed.');
  process.exit(0);
}

// Only run the I/O path when executed directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('review-gate.mjs')) {
  main();
}
