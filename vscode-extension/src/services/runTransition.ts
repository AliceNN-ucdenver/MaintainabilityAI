/**
 * Pure transition-detection logic for the RunNotificationService.
 *
 * Split out from RunNotificationService.ts so it can be unit-tested
 * without the vscode runtime — the service itself imports vscode for
 * window.showInformationMessage, but this file deliberately does not.
 */
import type { ActiveRun, RunStatus } from './ActiveRunsService';

// Inlined to keep this module free of any value-import from ActiveRunsService
// (which imports vscode). Kept in sync with ActiveRunsService.TERMINAL_STATUSES;
// the runtime constant lives there for the service-side checks.
const LOCAL_TERMINAL_STATUSES: ReadonlySet<RunStatus> = new Set(['success', 'failure', 'cancelled']);

export type TransitionKind =
  | 'dispatched'
  | 'queued_to_running'
  | 'completed_success'
  | 'completed_failure'
  | 'cancelled'
  | 'blocked';

export interface Transition {
  kind: TransitionKind;
  run: ActiveRun;
}

/**
 * Compare two snapshots of a run and return the transition (if any)
 * worth notifying. Status transitions take precedence over `blocked` —
 * a failure carries its own actionable notification; we don't also fire
 * a "blocked" toast.
 */
export function detectTransition(pre: ActiveRun | null, post: ActiveRun): Transition | null {
  if (!pre) {
    return { kind: 'dispatched', run: post };
  }
  if (pre.status !== post.status) {
    if (post.status === 'success') { return { kind: 'completed_success', run: post }; }
    if (post.status === 'failure') { return { kind: 'completed_failure', run: post }; }
    if (post.status === 'cancelled') { return { kind: 'cancelled', run: post }; }
    if ((pre.status === 'queued' || pre.status === 'pending') && post.status === 'in_progress') {
      return { kind: 'queued_to_running', run: post };
    }
  }
  if (post.lastError && !pre.lastError && !LOCAL_TERMINAL_STATUSES.has(post.status)) {
    return { kind: 'blocked', run: post };
  }
  return null;
}
