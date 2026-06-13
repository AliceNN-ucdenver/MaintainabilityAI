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
    // Round-trip the impl-PR live state the poll computes — WITHOUT these the
    // draft flag + held-run count evaporate on every read, so "Mark PR ready"
    // never clears (undefined !== false) and "Approve and run" never surfaces.
    // `implPrIsDraft` uses != null so the ready state (false) is written, not
    // dropped as falsy.
    if (row.implPrIsDraft != null) lines.push(`    implPrIsDraft: ${row.implPrIsDraft ? 'true' : 'false'}`);
    if (row.workflowsAwaitingApproval) lines.push(`    workflowsAwaitingApproval: ${row.workflowsAwaitingApproval}`);
    if (row.implementation_run_id) lines.push(`    implementation_run_id: ${quoteYaml(row.implementation_run_id)}`);
    if (row.openedAt) lines.push(`    openedAt: ${quoteYaml(row.openedAt)}`);
    if (row.updatedAt) lines.push(`    updatedAt: ${quoteYaml(row.updatedAt)}`);
    // Codex-r3 Bug 3 — surface chain-ladder append failures so the next
    // poll re-attempts the write and the rollup can show a degraded chip.
    if (row.chainLadderAppendError) lines.push(`    chainLadderAppendError: ${quoteYaml(row.chainLadderAppendError)}`);
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
      implPrIsDraft: typeof r.implPrIsDraft === 'boolean' ? r.implPrIsDraft : undefined,
      workflowsAwaitingApproval: typeof r.workflowsAwaitingApproval === 'number' ? r.workflowsAwaitingApproval : undefined,
      implementation_run_id: typeof r.implementation_run_id === 'string' ? r.implementation_run_id : undefined,
      openedAt: typeof r.openedAt === 'string' ? r.openedAt : undefined,
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
      // Codex-r3 Bug 3 — round-trip the chain-ladder retry marker.
      chainLadderAppendError: typeof r.chainLadderAppendError === 'string' ? r.chainLadderAppendError : undefined,
    });
  }
  return { schema: 1, okrId, rows };
}

/**
 * Delete the design-fan-out.yaml for an OKR (the "Reset fan-out"
 * action). Returns true when a file was present and removed, false
 * when there was nothing to delete. Removing the file returns the OKR
 * card to its pre-fan-out state: pre-flight re-derives from live repo
 * probes, the Stage-5 "in progress" view disappears, and the Fan-out
 * button becomes available again.
 *
 * Scope note: this removes ONLY the local fan-out tracking file. It
 * does NOT close landing issues, revert PRs, or touch okr.yaml — those
 * are external/ separate concerns the caller surfaces to the user.
 */
export function deleteDesignFanOut(meshPath: string, okrId: string): boolean {
  const filePath = path.join(meshPath, 'okrs', okrId, 'what', 'design-fan-out.yaml');
  if (!fs.existsSync(filePath)) return false;
  fs.rmSync(filePath);
  return true;
}

/**
 * Codex-r1 Bug F — append (or upsert) an implementation row into the
 * OKR's `chain-ladder.yaml`. Stage 5 calls this when poll detects an
 * impl PR has merged + the PR body's `implementation_chain` block has
 * been parsed.
 *
 * Row shape per the D-PR8 design doc spec:
 *
 *   - phase: implementation
 *     repo: <owner>/<slug>
 *     pr_url: <impl PR URL>
 *     implementation_run_id: IMPL-...
 *     chain_root_hash: <event-1 hash from .maintainability/audit/events/<run-id>.jsonl>
 *     parent_intent_thread: <OKR master thread>
 *     parent_chain_root: <WHAT phase chain root>
 *     event_log_path: .maintainability/audit/events/<run-id>.jsonl
 *     key_path: .maintainability/audit/keys/<run-id>.epoch-1.pub.pem
 *     merged_at: <ISO timestamp>
 *
 * Idempotent on `implementation_run_id` — re-calling with the same id
 * upserts (replaces the existing row in place). Lets the poll fire
 * multiple times without producing duplicate rows. Read existing file
 * first, mutate the chain array, write back — preserves any non-impl
 * rows the workflow finalize-step wrote (WHY/HOW/WHAT planning rows).
 *
 * Creates the file if missing (chain: [<new row>]).
 */
export interface ChainLadderImplRow {
  repo: string;
  pr_url: string;
  implementation_run_id: string;
  chain_root_hash: string;
  parent_intent_thread: string;
  parent_chain_root: string;
  event_log_path: string;
  key_path: string;
  merged_at: string;
  /**
   * Codex-r4 Bug 1 — the exact commit SHA at which Stage 5 verified
   * the target-repo evidence files (`event_log_path` + `key_path`)
   * existed. Stored as provenance so the rollup verifier can re-check
   * the files at the SAME SHA (rather than the moving HEAD) — a force-
   * push to the impl branch's merge commit would invalidate the
   * rollup if we trusted "latest HEAD".
   *
   * Stage 5 ONLY writes this row when both files fetched OK at this
   * SHA. A null/missing merge_commit_sha at rollup-read time means
   * the chain row was hand-written or the writer's evidence-fetch step
   * was bypassed — verifyImplementationChainEntry flags it as
   * `evidence-missing:merge_commit_sha`.
   */
  merge_commit_sha: string;
}

export function appendChainLadderImplRow(meshPath: string, okrId: string, row: ChainLadderImplRow): void {
  const filePath = path.join(meshPath, 'okrs', okrId, 'audit', 'chain-ladder.yaml');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Read existing chain array (defensive on parse failure: start fresh
  // rather than throw -- the workflow finalize step is the canonical
  // writer for non-impl rows, and a parse failure here just means our
  // append loses pre-existing context, NOT that we corrupt the file).
  let chain: Array<Record<string, unknown>> = [];
  try {
    // try-read + catch (incl. ENOENT) instead of existsSync→read (CodeQL js/file-system-race).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YAML = require('yaml') as { parse(text: string): unknown };
    const parsed = YAML.parse(fs.readFileSync(filePath, 'utf8')) as { chain?: unknown };
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.chain)) {
      chain = parsed.chain as Array<Record<string, unknown>>;
    }
  } catch {
    // Best-effort (incl. file-absent) -- keep chain empty.
  }

  // Upsert by implementation_run_id (idempotent).
  const existingIdx = chain.findIndex(r =>
    String(r['phase'] ?? '').toLowerCase() === 'implementation' &&
    String(r['implementation_run_id'] ?? '') === row.implementation_run_id
  );
  const newEntry: Record<string, unknown> = {
    phase: 'implementation',
    repo: row.repo,
    pr_url: row.pr_url,
    implementation_run_id: row.implementation_run_id,
    chain_root_hash: row.chain_root_hash,
    parent_intent_thread: row.parent_intent_thread,
    parent_chain_root: row.parent_chain_root,
    event_log_path: row.event_log_path,
    key_path: row.key_path,
    // Codex-r4 Bug 1 — provenance the rollup uses to re-verify the
    // target-repo evidence at the EXACT sha Stage 5 verified. Without
    // this the rollup would have to trust HEAD, which a force-push
    // could mutate after-the-fact.
    merge_commit_sha: row.merge_commit_sha,
    merged_at: row.merged_at,
  };
  if (existingIdx >= 0) {
    chain[existingIdx] = newEntry;
  } else {
    chain.push(newEntry);
  }

  // Hand-roll the YAML write so the diff stays predictable + impl
  // rows have a recognizable shape. Existing non-impl rows
  // round-trip via their parsed form (key order may shuffle on
  // re-write, which is fine -- the finalize step rewrites planning
  // rows wholesale on phase merge anyway).
  const lines: string[] = ['chain:'];
  for (const r of chain) {
    lines.push('  -');
    for (const [k, v] of Object.entries(r)) {
      if (v === undefined || v === null) continue;
      const key = String(k);
      const value = String(v);
      // Quote when value contains characters that'd confuse the YAML
      // parser bare. Matches quoteYaml semantics above.
      const needsQuote = /[":#[\]{}|&*!%@`,]/.test(value) || /^\s|\s$/.test(value);
      lines.push(`    ${key}: ${needsQuote ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : value}`);
    }
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}
