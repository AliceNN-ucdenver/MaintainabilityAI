/**
 * RunStatusTailer — adaptive-cadence poller for in-flight research / PRD
 * runs. Each tick:
 *
 *   1. For each active (non-terminal) run:
 *        a. Fetch the GitHub Actions run status (when runId known).
 *        b. Fetch the audit JSONL from raw.githubusercontent.com on the
 *           mesh repo's main branch and parse the latest event.
 *        c. Patch the run via ActiveRunsService.update with whichever of
 *           {status, currentNode, eventCount, lastError} changed.
 *   2. Sleep for the cadence appropriate to the run's age.
 *
 * Cadence (per the v0.8 design):
 *   - Fresh (< 5 min):       30s
 *   - In-flight (5-30 min):  60s
 *   - Long-running (>30 min): 5 min
 * The shortest cadence across all active runs wins the next tick.
 *
 * The tailer survives transient errors — each per-run fetch is independent
 * and a failure is captured in `lastError`, not surfaced as a global
 * exception.
 */
import { ActiveRunsService, type ActiveRun, type RunStatus, TERMINAL_STATUSES } from './ActiveRunsService';
import { parseAuditJsonl } from './auditJsonlParser';
import { githubService } from './GitHubService';

const FRESH_CADENCE_MS = 30_000;
const ACTIVE_CADENCE_MS = 60_000;
const LONG_CADENCE_MS = 5 * 60_000;

const FRESH_THRESHOLD_MS = 5 * 60_000;
const ACTIVE_THRESHOLD_MS = 30 * 60_000;

export interface RunStatusTailerOpts {
  /** Override for fetch in tests. */
  fetchImpl?: typeof fetch;
}

export class RunStatusTailer {
  private static instance: RunStatusTailer | null = null;

  static start(svc: ActiveRunsService, opts: RunStatusTailerOpts = {}): RunStatusTailer {
    if (!RunStatusTailer.instance) {
      RunStatusTailer.instance = new RunStatusTailer(svc, opts);
      RunStatusTailer.instance.scheduleNext();
    }
    return RunStatusTailer.instance;
  }

  static stop(): void {
    RunStatusTailer.instance?.dispose();
    RunStatusTailer.instance = null;
  }

  private svc: ActiveRunsService;
  private fetchImpl: typeof fetch;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  private constructor(svc: ActiveRunsService, opts: RunStatusTailerOpts) {
    this.svc = svc;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  /** Force-refresh a single run immediately. Used by the Active Runs panel. */
  async refresh(localId: string): Promise<void> {
    const run = this.svc.get(localId);
    if (!run) { return; }
    await this.tickRun(run);
  }

  private scheduleNext(): void {
    if (this.disposed) { return; }
    const runs = this.svc.activePollableRuns();
    if (runs.length === 0) {
      // Nothing to do — wake up periodically in case new runs are registered.
      this.timer = setTimeout(() => this.scheduleNext(), LONG_CADENCE_MS);
      return;
    }
    const next = Math.min(...runs.map(r => cadenceFor(r)));
    this.timer = setTimeout(() => this.tick(), next);
  }

  private async tick(): Promise<void> {
    if (this.disposed) { return; }
    const runs = this.svc.activePollableRuns();
    await Promise.allSettled(runs.map(r => this.tickRun(r)));
    this.scheduleNext();
  }

  /** Poll one run — independent of the rest, failures are isolated. */
  private async tickRun(run: ActiveRun): Promise<void> {
    const now = new Date().toISOString();
    try {
      const ghStatus = await this.fetchGitHubStatus(run);
      const tail = await this.fetchAuditTail(run);

      const patch: Partial<ActiveRun> = {
        lastPolledAt: now,
        lastError: null,
      };
      if (ghStatus) {
        patch.status = ghStatus.status;
        if (ghStatus.runUrl && !run.runUrl) { patch.runUrl = ghStatus.runUrl; }
        if (ghStatus.runId !== null && run.runId === null) { patch.runId = ghStatus.runId; }
      }
      if (tail) {
        patch.eventCount = tail.events.length;
        if (tail.lastEvent) { patch.currentNode = tail.lastEvent.node_name; }
        // run_complete in the JSONL takes precedence over the GitHub status —
        // it's the authoritative signal from the runner. Map outcome → status.
        if (tail.isComplete) {
          if (tail.runCompleteOutcome === 'ok') { patch.status = 'success'; }
          else if (tail.runCompleteOutcome === 'failed') { patch.status = 'failure'; }
          else if (tail.runCompleteOutcome === 'partial') { patch.status = 'success'; }
        }
      }
      this.svc.update(run.localId, patch);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.svc.update(run.localId, { lastPolledAt: now, lastError: msg });
    }
  }

  private async fetchGitHubStatus(run: ActiveRun): Promise<{ status: RunStatus; runUrl: string | null; runId: number | null } | null> {
    try {
      const client = await githubService.getClient();
      if (run.runId !== null) {
        const res = await client.rest.actions.getWorkflowRun({
          owner: run.meshSlug.owner,
          repo: run.meshSlug.repo,
          run_id: run.runId,
        });
        return {
          status: mapGitHubStatus(res.data.status, res.data.conclusion),
          runUrl: res.data.html_url,
          runId: res.data.id,
        };
      }
      // No runId yet — try to find the most recent workflow run for the agent
      // that was created after the dispatch timestamp.
      const workflowFile = run.agent === 'archeologist' ? 'archeologist.yml' : 'prd.yml';
      const list = await client.rest.actions.listWorkflowRuns({
        owner: run.meshSlug.owner,
        repo: run.meshSlug.repo,
        workflow_id: workflowFile,
        per_page: 10,
      });
      const dispatchMs = new Date(run.dispatchedAt).getTime();
      const match = list.data.workflow_runs.find(r => new Date(r.created_at).getTime() >= dispatchMs - 5_000);
      if (!match) { return null; }
      return {
        status: mapGitHubStatus(match.status, match.conclusion),
        runUrl: match.html_url,
        runId: match.id,
      };
    } catch {
      return null;
    }
  }

  /**
   * Pull the audit JSONL from the mesh repo's main branch. The runner
   * commits the audit log on each PR, but mid-run the file may be visible
   * via the runner's branch (e.g. `research/<topic>-<date>`) rather than
   * main. For v0.8c we read from main only; the v0.8d enhancement will
   * follow the open PR's branch.
   *
   * If a private mesh repo needs auth, falls back to the GitHub Contents
   * API via the existing githubService client.
   */
  private async fetchAuditTail(run: ActiveRun): Promise<ReturnType<typeof parseAuditJsonl> | null> {
    // We don't yet know the run_id the runner used (it's a separate id from
    // the GitHub Actions run_id). For now we list `.research-audit/` and
    // pick the most recently modified file. v0.8d will pass the runner's
    // run_id back from the workflow output for an exact match.
    try {
      const client = await githubService.getClient();
      const dir = await client.rest.repos.getContent({
        owner: run.meshSlug.owner,
        repo: run.meshSlug.repo,
        path: '.research-audit',
      }).catch(() => null);
      if (!dir || !Array.isArray(dir.data)) { return null; }
      // Find the most recently-named JSONL file (run_ids start with PRD- or
      // RES- and embed an ISO date, so lexical max ≈ most recent).
      const candidates = dir.data
        .filter(f => f.type === 'file' && f.name.endsWith('.jsonl'))
        .sort((a, b) => b.name.localeCompare(a.name));
      if (candidates.length === 0) { return null; }
      const file = candidates[0];
      const raw = await this.fetchRaw(run.meshSlug, file.path);
      if (!raw) { return null; }
      return parseAuditJsonl(raw);
    } catch {
      return null;
    }
  }

  private async fetchRaw(slug: { owner: string; repo: string }, repoPath: string): Promise<string | null> {
    const url = `https://raw.githubusercontent.com/${slug.owner}/${slug.repo}/main/${repoPath}`;
    try {
      const res = await this.fetchImpl(url);
      if (!res.ok) { return null; }
      return await res.text();
    } catch {
      return null;
    }
  }
}

// ============================================================================
// helpers
// ============================================================================

function cadenceFor(run: ActiveRun): number {
  const ageMs = Date.now() - new Date(run.dispatchedAt).getTime();
  if (ageMs < FRESH_THRESHOLD_MS) { return FRESH_CADENCE_MS; }
  if (ageMs < ACTIVE_THRESHOLD_MS) { return ACTIVE_CADENCE_MS; }
  return LONG_CADENCE_MS;
}

/** Map a GitHub Actions run status+conclusion pair to our RunStatus enum. */
function mapGitHubStatus(status: string | null, conclusion: string | null): RunStatus {
  // Terminal first
  if (conclusion === 'success') { return 'success'; }
  if (conclusion === 'failure' || conclusion === 'timed_out') { return 'failure'; }
  if (conclusion === 'cancelled' || conclusion === 'skipped') { return 'cancelled'; }
  // In-flight
  if (status === 'in_progress') { return 'in_progress'; }
  if (status === 'queued' || status === 'requested' || status === 'waiting' || status === 'pending') { return 'queued'; }
  return 'pending';
}

export const __test = { cadenceFor, mapGitHubStatus, TERMINAL_STATUSES };
