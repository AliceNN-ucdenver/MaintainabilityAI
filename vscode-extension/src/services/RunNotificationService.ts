/**
 * RunNotificationService — VS Code-level toast notifications for the
 * research / PRD run lifecycle.
 *
 * Subscribes to ActiveRunsService.onDidChange and detects state
 * transitions worth surfacing to the user. Each transition becomes a
 * single notification with one or two action buttons routing back to
 * the Active Runs panel or the GitHub run URL.
 *
 * Transition detection lives in `detectTransition()` as a pure function
 * so it's testable without VS Code mocking.
 */
import * as vscode from 'vscode';
import { ActiveRunsService, type ActiveRun, type RunStatus, TERMINAL_STATUSES } from './ActiveRunsService';
import { detectTransition, type Transition, type TransitionKind } from './runTransition';
export { detectTransition } from './runTransition';
export type { Transition, TransitionKind } from './runTransition';

const KIND_TO_LABEL: Record<TransitionKind, (run: ActiveRun) => string> = {
  dispatched:         (r) => `${agentLabel(r.agent)} dispatched.`,
  queued_to_running:  (r) => `${agentLabel(r.agent)} is running.`,
  completed_success:  (r) => `${agentLabel(r.agent)} completed — PASS.`,
  completed_failure:  (r) => `${agentLabel(r.agent)} failed.`,
  cancelled:          (r) => `${agentLabel(r.agent)} was cancelled.`,
  blocked:            (r) => `${agentLabel(r.agent)} hit a transient error.`,
};

export class RunNotificationService {
  private static instance: RunNotificationService | null = null;
  private svc: ActiveRunsService;
  private sub: vscode.Disposable | null = null;
  private snapshots: Map<string, ActiveRun> = new Map();
  /** Local-id pairs we've already notified about, to avoid re-firing. */
  private notified: Set<string> = new Set();

  static start(svc: ActiveRunsService): RunNotificationService {
    if (!RunNotificationService.instance) {
      RunNotificationService.instance = new RunNotificationService(svc);
      RunNotificationService.instance.attach();
    }
    return RunNotificationService.instance;
  }

  static stop(): void {
    RunNotificationService.instance?.dispose();
    RunNotificationService.instance = null;
  }

  private constructor(svc: ActiveRunsService) {
    this.svc = svc;
    // Seed snapshots with the current persisted state so first-tick
    // doesn't classify already-known runs as freshly "dispatched".
    for (const r of this.svc.list()) {
      this.snapshots.set(r.localId, r);
      // Pre-record terminal notifications so we don't re-fire on activate.
      if (TERMINAL_STATUSES.has(r.status)) {
        const t = terminalKindFor(r.status);
        if (t) { this.notified.add(`${r.localId}|${t}`); }
      }
      this.notified.add(`${r.localId}|dispatched`);
    }
  }

  private attach(): void {
    this.sub = this.svc.onDidChange(() => this.onChange());
  }

  dispose(): void {
    this.sub?.dispose();
    this.sub = null;
  }

  private onChange(): void {
    const now = this.svc.list();
    for (const post of now) {
      const pre = this.snapshots.get(post.localId) ?? null;
      const t = detectTransition(pre, post);
      if (t) {
        const dedupeKey = `${post.localId}|${t.kind}`;
        if (!this.notified.has(dedupeKey)) {
          this.notified.add(dedupeKey);
          void this.surface(t);
        }
      }
      this.snapshots.set(post.localId, post);
    }
    // Also drop snapshots for runs the user removed.
    const known = new Set(now.map(r => r.localId));
    for (const id of [...this.snapshots.keys()]) {
      if (!known.has(id)) { this.snapshots.delete(id); }
    }
  }

  private async surface(t: Transition): Promise<void> {
    const message = KIND_TO_LABEL[t.kind](t.run);
    const actions: string[] = [];
    actions.push('Active Runs');
    if (t.run.runUrl) { actions.push('Open on GitHub'); }

    const fn = (t.kind === 'completed_failure' || t.kind === 'blocked')
      ? vscode.window.showWarningMessage
      : vscode.window.showInformationMessage;

    const choice = await fn(message, ...actions);
    if (choice === 'Active Runs') {
      void vscode.commands.executeCommand('maintainabilityai.activeRuns');
    } else if (choice === 'Open on GitHub' && t.run.runUrl) {
      void vscode.env.openExternal(vscode.Uri.parse(t.run.runUrl));
    }
  }
}

// ============================================================================
// helpers
// ============================================================================

function agentLabel(agent: ActiveRun['agent']): string {
  return agent === 'archeologist' ? 'Archeologist' : 'PRD';
}

function terminalKindFor(status: RunStatus): TransitionKind | null {
  if (status === 'success') { return 'completed_success'; }
  if (status === 'failure') { return 'completed_failure'; }
  if (status === 'cancelled') { return 'cancelled'; }
  return null;
}
