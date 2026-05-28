/**
 * D-PR4 sub-PR 6 — design-fan-out.yaml read/write helpers.
 *
 * Standalone module so vitest can exercise the round-trip without
 * dragging in the VS Code runtime (MeshService imports ConfigService
 * which imports `vscode`). MeshService delegates to these functions
 * via thin wrappers; tests live in
 * `services/coordination/__tests__/designFanOutFile.test.ts`.
 *
 * The writer hand-rolls YAML to keep diffs predictable — the standard
 * `yaml` package re-orders maps + collapses arrays in ways that
 * produce noisy commit history. Keys emit in insertion order, one row
 * per array entry, optional fields elided when absent.
 *
 * The reader uses the standard `yaml` package + defensive shape checks
 * — returns null on missing file, parse error, okrId mismatch, or
 * malformed top-level structure. Best-effort recovery on individual
 * row issues: rows missing `repo` or `status` are silently skipped so
 * one corrupt row doesn't lose the rest of the doc.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { DesignFanOutDoc, DesignFanOutRow, PreflightStatus } from './types';

/**
 * Quote a string for inclusion in our hand-rolled YAML. Wraps in
 * double-quotes when the value contains any "could-be-misinterpreted"
 * characters (leading dashes, colons, hashes, brackets, quotes, etc.)
 * so the file round-trips cleanly through the standard yaml parser.
 * Otherwise emits bare for readability.
 */
export function quoteYaml(value: string): string {
  if (value === '') return '""';
  if (
    /^[A-Za-z0-9_./+-][A-Za-z0-9_./+\s:-]*$/.test(value) &&
    !/^-/.test(value) &&
    !/^\s/.test(value)
  ) {
    return value;
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Write the design-fan-out.yaml for an OKR. Overwrites any prior file
 * (idempotent — caller is responsible for merging existing rows with
 * new ones before passing them in).
 */
export function writeDesignFanOut(meshPath: string, doc: DesignFanOutDoc): void {
  const dir = path.join(meshPath, 'okrs', doc.okrId, 'what');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'design-fan-out.yaml');
  const lines: string[] = [];
  lines.push(`schema: ${doc.schema}`);
  lines.push(`okrId: ${quoteYaml(doc.okrId)}`);
  lines.push('rows:');
  for (const row of doc.rows) {
    lines.push(`  - repo: ${quoteYaml(row.repo)}`);
    lines.push(`    status: ${quoteYaml(row.status)}`);
    if (row.reason) lines.push(`    reason: ${quoteYaml(row.reason)}`);
    if (row.landingIssueUrl) lines.push(`    landingIssueUrl: ${quoteYaml(row.landingIssueUrl)}`);
    if (row.repo_created) lines.push(`    repo_created: true`);
    if (row.implPrUrl) lines.push(`    implPrUrl: ${quoteYaml(row.implPrUrl)}`);
    if (row.implementation_run_id) lines.push(`    implementation_run_id: ${quoteYaml(row.implementation_run_id)}`);
    if (row.openedAt) lines.push(`    openedAt: ${quoteYaml(row.openedAt)}`);
    if (row.updatedAt) lines.push(`    updatedAt: ${quoteYaml(row.updatedAt)}`);
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

/**
 * Read the design-fan-out.yaml for an OKR. Returns null when the file
 * doesn't exist (fan-out hasn't run yet) or when the YAML doesn't
 * parse cleanly (caller treats as "no prior state" + can surface a
 * warning). okrId mismatch also yields null — defensive against
 * stale-cache / wrong-OKR reads.
 */
export function readDesignFanOut(meshPath: string, okrId: string): DesignFanOutDoc | null {
  const filePath = path.join(meshPath, 'okrs', okrId, 'what', 'design-fan-out.yaml');
  if (!fs.existsSync(filePath)) return null;
  let parsed: unknown;
  try {
    // Lazy require to keep this module's import-graph footprint minimal.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YAML = require('yaml') as { parse(text: string): unknown };
    const text = fs.readFileSync(filePath, 'utf8');
    parsed = YAML.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const rec = parsed as Record<string, unknown>;
  if (typeof rec.okrId !== 'string' || rec.okrId !== okrId) return null;
  if (!Array.isArray(rec.rows)) return null;
  const rows: DesignFanOutRow[] = [];
  for (const raw of rec.rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const repo = typeof r.repo === 'string' ? r.repo : '';
    const status = typeof r.status === 'string' ? r.status : '';
    if (!repo || !status) continue;
    rows.push({
      repo,
      status: status as PreflightStatus,
      reason: typeof r.reason === 'string' ? r.reason : undefined,
      landingIssueUrl: typeof r.landingIssueUrl === 'string' ? r.landingIssueUrl : undefined,
      repo_created: r.repo_created === true,
      implPrUrl: typeof r.implPrUrl === 'string' ? r.implPrUrl : undefined,
      implementation_run_id: typeof r.implementation_run_id === 'string' ? r.implementation_run_id : undefined,
      openedAt: typeof r.openedAt === 'string' ? r.openedAt : undefined,
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
    });
  }
  return { schema: 1, okrId, rows };
}
