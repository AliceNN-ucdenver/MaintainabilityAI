/**
 * ResearchLibraryPanel — BAR-grouped tree of research + PRD docs the
 * Archeologist / PRD agents have published into the mesh repo.
 *
 * Reads via MeshReader.listBars + BarService.listResearch/listPrds
 * (already shipped in v0.2). On click of a doc, opens it in a VS Code
 * editor tab via vscode.workspace.openTextDocument.
 */
import * as vscode from 'vscode';
import { BasePanel } from './BasePanel';
import { MeshService } from '../services/MeshService';
import { MeshReader } from '../core/mesh-reader';
import { BarService } from '../services/BarService';
import {
  buildLibraryGroups,
  summariseLibrary,
  type LibraryGroup,
  type LibraryStats,
} from '../services/researchLibrary';

type WebviewMsg =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'openDoc'; absolutePath: string };

type ExtMsg =
  | { type: 'groups'; groups: LibraryGroup[]; stats: LibraryStats; meshPath: string | null }
  | { type: 'error'; message: string };

export class ResearchLibraryPanel extends BasePanel<WebviewMsg, ExtMsg> {
  public static currentPanel: ResearchLibraryPanel | undefined;
  private static readonly viewType = 'maintainabilityai.researchLibrary';

  public static createOrShow(context: vscode.ExtensionContext): void {
    const column = vscode.window.activeTextEditor?.viewColumn;
    if (ResearchLibraryPanel.currentPanel) {
      ResearchLibraryPanel.currentPanel.panel.reveal(column);
      ResearchLibraryPanel.currentPanel.pushGroups();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      ResearchLibraryPanel.viewType,
      'Research Library',
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    ResearchLibraryPanel.currentPanel = new ResearchLibraryPanel(panel, context);
  }

  protected clearCurrentPanel(): void {
    ResearchLibraryPanel.currentPanel = undefined;
  }

  protected async handleMessage(msg: WebviewMsg): Promise<void> {
    try {
      switch (msg.type) {
        case 'ready':
        case 'refresh':
          this.pushGroups();
          break;
        case 'openDoc':
          if (msg.absolutePath) {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(msg.absolutePath));
            await vscode.window.showTextDocument(doc, { preview: false });
          }
          break;
      }
    } catch (err) {
      this.handleAndNotifyError('ResearchLibraryPanel.handleMessage', err);
    }
  }

  private pushGroups(): void {
    const meshPath = MeshService.getMeshPath();
    let groups: LibraryGroup[] = [];
    if (meshPath) {
      try {
        const reader = new MeshReader(meshPath);
        const bars = reader.listBars();
        groups = buildLibraryGroups(bars, new BarService());
      } catch {
        // empty / mid-init mesh — empty library is the safe default
      }
    }
    const stats = summariseLibrary(groups);
    this.postMessage({ type: 'groups', groups, stats, meshPath: meshPath ?? null });
  }

  protected getHtmlContent(): string { return renderHtml(); }
}

function renderHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Research Library</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .stats { color: var(--vscode-descriptionForeground); font-size: 12px; margin-bottom: 16px; }
  .actions { margin-bottom: 16px; }
  button { background: transparent; border: 1px solid var(--vscode-input-border); color: var(--vscode-foreground); padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 12px; }
  button:hover { background: var(--vscode-input-background); }
  .empty { color: var(--vscode-descriptionForeground); padding: 24px; text-align: center; border: 1px dashed var(--vscode-panel-border); border-radius: 4px; }
  .group { border: 1px solid var(--vscode-panel-border); border-radius: 4px; margin-bottom: 12px; }
  .group-header { padding: 8px 12px; background: rgba(124, 58, 237, 0.08); border-bottom: 1px solid var(--vscode-panel-border); }
  .group-header .id { font-family: var(--vscode-editor-font-family); color: #c084fc; font-size: 12px; }
  .group-header .name { font-weight: 600; }
  .group-header .platform { font-size: 11px; color: var(--vscode-descriptionForeground); }
  .doc { display: flex; align-items: center; gap: 10px; padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; }
  .doc:hover { background: var(--vscode-list-hoverBackground); }
  .doc:last-child { border-bottom: 0; }
  .kind { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; text-transform: uppercase; font-weight: 600; width: 60px; text-align: center; }
  .kind.research { background: rgba(108, 162, 235, 0.2); color: #6ca2eb; }
  .kind.prd { background: rgba(78, 201, 176, 0.2); color: #4ec9b0; }
  .topic { flex: 1; font-size: 13px; }
  .meta { font-size: 11px; color: var(--vscode-descriptionForeground); }
  .badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; background: rgba(255, 215, 0, 0.15); color: #ffd700; margin-left: 6px; }
</style>
</head>
<body>
  <h1>Research Library</h1>
  <div id="stats" class="stats">—</div>
  <div class="actions"><button id="refreshBtn">Refresh</button></div>
  <div id="content"><div class="empty">Loading…</div></div>

<script>
const vscode = acquireVsCodeApi();
function fmtDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return iso; } }
function render(payload) {
  const stats = document.getElementById('stats');
  if (!payload.meshPath) {
    stats.textContent = 'No mesh path configured — open Looking Glass settings to set one.';
    document.getElementById('content').innerHTML = '<div class="empty">No mesh configured.</div>';
    return;
  }
  stats.textContent = payload.stats.barsWithDocs + ' BAR(s) with ' + payload.stats.researchCount + ' research / '
    + payload.stats.prdCount + ' PRD doc(s)' + (payload.stats.prdsWithManifest > 0 ? ' (' + payload.stats.prdsWithManifest + ' with spec-ready manifest)' : '');
  const content = document.getElementById('content');
  if (!payload.groups || payload.groups.length === 0) {
    content.innerHTML = '<div class="empty">No research or PRDs yet. Dispatch one via "New Research / PRD Run" — published artifacts will show up here once the runner commits to the mesh repo.</div>';
    return;
  }
  content.innerHTML = payload.groups.map(g => {
    const header = '<div class="group-header"><div class="id">' + g.barId + '</div>'
      + '<div class="name">' + g.barName + '</div>'
      + '<div class="platform">' + g.platformName + ' (' + g.platformId + ')</div></div>';
    const docs = g.docs.map(d =>
      '<div class="doc" data-path="' + d.absolutePath.replace(/"/g, '&quot;') + '">'
      + '<span class="kind ' + d.kind + '">' + d.kind + '</span>'
      + '<div class="topic">' + d.topic
      + (d.hasManifest ? '<span class="badge">spec-ready</span>' : '')
      + '<div class="meta">' + fmtDate(d.publishedAt) + ' — ' + d.relativePath + '</div></div>'
      + '</div>',
    ).join('');
    return '<div class="group">' + header + docs + '</div>';
  }).join('');
  content.querySelectorAll('.doc').forEach(el => {
    el.addEventListener('click', () => {
      vscode.postMessage({ type: 'openDoc', absolutePath: el.dataset.path });
    });
  });
}
window.addEventListener('message', e => {
  if (e.data.type === 'groups') { render(e.data); }
});
document.getElementById('refreshBtn').addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));
vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}
