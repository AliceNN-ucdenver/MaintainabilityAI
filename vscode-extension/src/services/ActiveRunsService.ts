/**
 * ActiveRunsService — in-memory + persisted store of in-flight research /
 * PRD runs the user has dispatched from this VS Code instance.
 *
 * Lifecycle:
 *   NewResearchPanel dispatches  → register()
 *   RunStatusTailer polls        → update() (status, currentNode, eventCount)
 *   Run reaches terminal status  → still in list with status frozen
 *   User clicks "Remove"         → remove()
 *
 * Runs persist across reloads via globalState so the Active Runs panel
 * shows yesterday's runs too. We keep up to MAX_RUNS most recent runs to
 * avoid unbounded growth.
 */
import * as vscode from 'vscode';

export type RunStatus = 'pending' | 'queued' | 'in_progress' | 'success' | 'failure' | 'cancelled';

export interface ActiveRun {
  /** Local UUID assigned at register time. */
  localId: string;
  agent: 'archeologist' | 'prd';
  meshSlug: { owner: string; repo: string };
  /** ISO timestamp of dispatch (set by WorkflowDispatchService). */
  dispatchedAt: string;
  /** GitHub Actions run id, when resolved. */
  runId: number | null;
  runUrl: string | null;
  status: RunStatus;
  /** Most recent audit-log event's node_name (after JSONL is reachable). */
  currentNode: string | null;
  /** Number of audit events seen so far. */
  eventCount: number;
  /** Last poll timestamp. */
  lastPolledAt: string | null;
  /** When the run reached a terminal state. */
  completedAt: string | null;
  /** Last error from a poll attempt; cleared on next successful poll. */
  lastError: string | null;
}

export interface RegisterOpts {
  agent: ActiveRun['agent'];
  meshSlug: ActiveRun['meshSlug'];
  runId: number | null;
  runUrl: string | null;
  dispatchedAt: string;
}

const STORAGE_KEY = 'maintainabilityai.activeRuns';
const MAX_RUNS = 50;

export const TERMINAL_STATUSES: ReadonlySet<RunStatus> = new Set(['success', 'failure', 'cancelled']);

export class ActiveRunsService {
  private static instance: ActiveRunsService | null = null;

  static get(): ActiveRunsService {
    if (!ActiveRunsService.instance) {
      throw new Error('ActiveRunsService not initialised — call initialize(context) first.');
    }
    return ActiveRunsService.instance;
  }

  static initialize(context: vscode.ExtensionContext): ActiveRunsService {
    if (!ActiveRunsService.instance) {
      ActiveRunsService.instance = new ActiveRunsService(context);
    }
    return ActiveRunsService.instance;
  }

  private context: vscode.ExtensionContext;
  private runs: ActiveRun[] = [];
  private emitter = new vscode.EventEmitter<void>();

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.runs = context.globalState.get<ActiveRun[]>(STORAGE_KEY, []) ?? [];
  }

  list(): ActiveRun[] {
    // Most-recent-first
    return [...this.runs].sort((a, b) => b.dispatchedAt.localeCompare(a.dispatchedAt));
  }

  get(localId: string): ActiveRun | undefined {
    return this.runs.find(r => r.localId === localId);
  }

  register(opts: RegisterOpts): ActiveRun {
    const run: ActiveRun = {
      localId: makeLocalId(),
      agent: opts.agent,
      meshSlug: opts.meshSlug,
      dispatchedAt: opts.dispatchedAt,
      runId: opts.runId,
      runUrl: opts.runUrl,
      status: opts.runId ? 'queued' : 'pending',
      currentNode: null,
      eventCount: 0,
      lastPolledAt: null,
      completedAt: null,
      lastError: null,
    };
    this.runs.unshift(run);
    // Trim
    if (this.runs.length > MAX_RUNS) { this.runs = this.runs.slice(0, MAX_RUNS); }
    this.persist();
    this.emitter.fire();
    return run;
  }

  update(localId: string, patch: Partial<ActiveRun>): void {
    const i = this.runs.findIndex(r => r.localId === localId);
    if (i === -1) { return; }
    const next = { ...this.runs[i], ...patch };
    if (TERMINAL_STATUSES.has(next.status) && !next.completedAt) {
      next.completedAt = new Date().toISOString();
    }
    this.runs[i] = next;
    this.persist();
    this.emitter.fire();
  }

  remove(localId: string): void {
    const before = this.runs.length;
    this.runs = this.runs.filter(r => r.localId !== localId);
    if (this.runs.length !== before) {
      this.persist();
      this.emitter.fire();
    }
  }

  /** Subscribe to any change in the run list. Returns a Disposable to unsubscribe. */
  onDidChange(cb: () => void): vscode.Disposable {
    return this.emitter.event(cb);
  }

  /** Runs that haven't reached a terminal status — what the tailer polls. */
  activePollableRuns(): ActiveRun[] {
    return this.runs.filter(r => !TERMINAL_STATUSES.has(r.status));
  }

  private persist(): void {
    void this.context.globalState.update(STORAGE_KEY, this.runs);
  }
}

function makeLocalId(): string {
  // 8-char hex from crypto.randomUUID(); good enough for an in-extension key.
  // Falling back to Math.random for environments without crypto.randomUUID.
  try {
    return (globalThis.crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 12);
  } catch {
    return Math.random().toString(36).slice(2, 14);
  }
}
