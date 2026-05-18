/**
 * ActiveRunsPanel — webview that lists every research/PRD run the user
 * has dispatched from this VS Code instance. Subscribes to
 * ActiveRunsService.onDidChange so the table auto-refreshes whenever the
 * tailer updates a run's status or currentNode.
 *
 * UI: one row per run with agent, status badge, current audit node,
 * event count, dispatched-at, and per-row Refresh / Open in GitHub /
 * Remove buttons.
 */
import * as vscode from 'vscode';
import { BasePanel } from './BasePanel';
import { ActiveRunsService, type ActiveRun, TERMINAL_STATUSES } from '../services/ActiveRunsService';
import { RunStatusTailer } from '../services/RunStatusTailer';
import { humanizeNodeName } from '../services/auditJsonlParser';

type WebviewMsg =
  | { type: 'ready' }
  | { type: 'refresh'; localId: string }
  | { type: 'open'; url: string }
  | { type: 'remove'; localId: string };

interface RunRow extends Omit<ActiveRun, 'currentNode'> {
  currentNodeLabel: string | null;
  isTerminal: boolean;
  ageMs: number;
}

type ExtMsg = { type: 'runs'; runs: RunRow[] } | { type: 'error'; message: string };

export class ActiveRunsPanel extends BasePanel<WebviewMsg, ExtMsg> {
  public static currentPanel: ActiveRunsPanel | undefined;
  private static readonly viewType = 'maintainabilityai.activeRuns';

  public static createOrShow(context: vscode.ExtensionContext): void {
    const column = vscode.window.activeTextEditor?.viewColumn;
    if (ActiveRunsPanel.currentPanel) {
      ActiveRunsPanel.currentPanel.panel.reveal(column);
      ActiveRunsPanel.currentPanel.pushRuns();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      ActiveRunsPanel.viewType,
      'Active Research / PRD Runs',
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    ActiveRunsPanel.currentPanel = new ActiveRunsPanel(panel, context);
  }

  private changeSub: vscode.Disposable | null = null;

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    super(panel, context);
    // Push initial state once the webview is ready; until then, subscribe
    // to ActiveRunsService for incremental updates.
    this.changeSub = ActiveRunsService.get().onDidChange(() => this.pushRuns());
  }

  protected clearCurrentPanel(): void {
    ActiveRunsPanel.currentPanel = undefined;
  }

  protected onDispose(): void {
    this.changeSub?.dispose();
    this.changeSub = null;
  }

  protected async handleMessage(msg: WebviewMsg): Promise<void> {
    try {
      switch (msg.type) {
        case 'ready':
          this.pushRuns();
          break;
        case 'refresh':
          await RunStatusTailer.start(ActiveRunsService.get()).refresh(msg.localId);
          break;
        case 'open':
          if (msg.url) { void vscode.env.openExternal(vscode.Uri.parse(msg.url)); }
          break;
        case 'remove':
          ActiveRunsService.get().remove(msg.localId);
          break;
      }
    } catch (err) {
      this.handleAndNotifyError('ActiveRunsPanel.handleMessage', err);
    }
  }

  private pushRuns(): void {
    const runs = ActiveRunsService.get().list();
    const now = Date.now();
    const rows: RunRow[] = runs.map(r => ({
      ...r,
      currentNodeLabel: r.currentNode ? humanizeNodeName(r.currentNode) : null,
      isTerminal: TERMINAL_STATUSES.has(r.status),
      ageMs: now - new Date(r.dispatchedAt).getTime(),
    }));
    this.postMessage({ type: 'runs', runs: rows });
  }

  protected getHtmlContent(): string { return renderHtml(); }
}

function renderHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Active Runs</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 16px; }
  .empty { color: var(--vscode-descriptionForeground); padding: 24px; text-align: center; border: 1px dashed var(--vscode-panel-border); border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--vscode-panel-border); vertical-align: top; }
  th { color: var(--vscode-descriptionForeground); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .badge.pending, .badge.queued { background: rgba(180, 180, 180, 0.2); color: #b4b4b4; }
  .badge.in_progress { background: rgba(108, 162, 235, 0.2); color: #6ca2eb; }
  .badge.success { background: rgba(78, 201, 176, 0.2); color: #4ec9b0; }
  .badge.failure { background: rgba(244, 135, 113, 0.2); color: #f48771; }
  .badge.cancelled { background: rgba(180, 120, 80, 0.2); color: #cd9178; }
  .agent { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; background: rgba(124, 58, 237, 0.15); color: #c084fc; }
  .nodeLabel { font-family: var(--vscode-editor-font-family); color: var(--vscode-textLink-foreground); font-size: 12px; }
  .meta { color: var(--vscode-descriptionForeground); font-size: 11px; }
  .row-actions { display: flex; gap: 6px; }
  button { background: transparent; border: 1px solid var(--vscode-input-border); color: var(--vscode-foreground); padding: 3px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; }
  button:hover { background: var(--vscode-input-background); }
  .error { color: #f48771; font-size: 11px; margin-top: 2px; }
</style>
</head>
<body>
  <h1>Active Research / PRD Runs</h1>
  <div id="content"><div class="empty">Loading…</div></div>

<script>
const vscode = acquireVsCodeApi();
function fmtAge(ms) {
  if (ms < 60_000) return Math.round(ms / 1000) + 's ago';
  if (ms < 3_600_000) return Math.round(ms / 60_000) + 'm ago';
  if (ms < 86_400_000) return Math.round(ms / 3_600_000) + 'h ago';
  return Math.round(ms / 86_400_000) + 'd ago';
}
function render(runs) {
  const content = document.getElementById('content');
  if (!runs || runs.length === 0) {
    content.innerHTML = '<div class="empty">No runs yet. Open the command palette → "New Research / PRD Run" to dispatch one.</div>';
    return;
  }
  const rows = runs.map(r => {
    const status = '<span class="badge ' + r.status + '">' + r.status.replace('_', ' ') + '</span>';
    const node = r.currentNodeLabel
      ? '<div class="nodeLabel">' + r.currentNodeLabel + '</div><div class="meta">' + r.eventCount + ' event(s)</div>'
      : '<span class="meta">waiting for runner…</span>';
    const linkBtn = r.runUrl ? '<button data-act="open" data-url="' + r.runUrl + '">Open on GitHub</button>' : '';
    const refreshBtn = r.isTerminal ? '' : '<button data-act="refresh" data-id="' + r.localId + '">Refresh</button>';
    const removeBtn = r.isTerminal ? '<button data-act="remove" data-id="' + r.localId + '">Remove</button>' : '';
    const errLine = r.lastError ? '<div class="error">⚠︎ ' + r.lastError + '</div>' : '';
    return '<tr>'
      + '<td><span class="agent">' + r.agent + '</span></td>'
      + '<td>' + status + errLine + '</td>'
      + '<td>' + node + '</td>'
      + '<td><div>' + fmtAge(r.ageMs) + '</div><div class="meta">' + r.meshSlug.owner + '/' + r.meshSlug.repo + '</div></td>'
      + '<td><div class="row-actions">' + linkBtn + refreshBtn + removeBtn + '</div></td>'
      + '</tr>';
  }).join('');
  content.innerHTML = '<table><thead><tr><th>Agent</th><th>Status</th><th>Current Node</th><th>Dispatched</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table>';

  content.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'open') { vscode.postMessage({ type: 'open', url: b.dataset.url }); }
      else if (act === 'refresh') { vscode.postMessage({ type: 'refresh', localId: b.dataset.id }); }
      else if (act === 'remove') {
        if (confirm('Remove this run from the list?')) { vscode.postMessage({ type: 'remove', localId: b.dataset.id }); }
      }
    });
  });
}
window.addEventListener('message', e => {
  if (e.data.type === 'runs') { render(e.data.runs); }
});
vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}
