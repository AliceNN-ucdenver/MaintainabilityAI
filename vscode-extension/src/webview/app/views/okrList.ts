/**
 * OKR list view — the Phase A entry point to the OKR feature.
 *
 * Renders the table of OKRs scoped to the current mesh, with tier
 * badges read from the primary affected BAR. Each row drills into the
 * OKR detail via `drillIntoOkr`.
 *
 * Empty state shows a `+ Create OKR` primary CTA. The IMDB-Lite Celebs
 * sample is no longer prompted from this view — it's now seeded
 * automatically when the user scaffolds the IMDB-Lite platform from
 * Settings → Sample Platform.
 *
 * Read-only in Phase A — there's no Edit / Pause from this view. The
 * Pause control lives on the OKR detail footer.
 */
import { escapeHtml, escapeAttr } from '../pillars/shared';
import type { OkrListItem, OkrPhaseProgress, OkrStatus } from '../../../types';

const STATUS_LABEL: Record<OkrStatus, string> = {
  'draft': 'Draft',
  'researching': 'Researching',
  'prd-pending': 'How-Pending',
  'prd-blocked': 'How-Blocked',
  'design-pending': 'What-Pending',
  'building': 'Building',
  'shipped': 'Shipped',
  'archived': 'Archived',
};

const STATUS_TONE: Record<OkrStatus, 'neutral' | 'progress' | 'block' | 'done'> = {
  'draft': 'neutral',
  'researching': 'progress',
  'prd-pending': 'progress',
  'prd-blocked': 'block',
  'design-pending': 'progress',
  'building': 'progress',
  'shipped': 'done',
  'archived': 'neutral',
};

const TIER_LABEL = {
  'autonomous': 'Autonomous',
  'supervised': 'Supervised',
  'restricted': '⚠ Restricted',
} as const;

function renderTierBadge(tier: 'autonomous' | 'supervised' | 'restricted'): string {
  return `<span class="okr-tier-badge okr-tier-${tier}">${escapeHtml(TIER_LABEL[tier])}</span>`;
}

function renderStatusBadge(status: OkrStatus): string {
  const tone = STATUS_TONE[status];
  return `<span class="okr-status-badge okr-status-${tone}">${escapeHtml(STATUS_LABEL[status])}</span>`;
}

function renderPhaseProgress(p: OkrPhaseProgress): string {
  const dot = (stage: 'why' | 'how' | 'what') => {
    const s = p[stage];
    const icon = s === 'complete' ? '✓' : s === 'in_progress' ? '⏳' : '☐';
    return `<span class="okr-phase-dot okr-phase-${s}" title="${stage.toUpperCase()}: ${s.replace('_', ' ')}">${icon}</span>`;
  };
  return `<span class="okr-phase-progress">${dot('why')}${dot('how')}${dot('what')}</span>`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  if (diff < min) { return 'just now'; }
  if (diff < hr) { return `${Math.floor(diff / min)}m ago`; }
  if (diff < day) { return `${Math.floor(diff / hr)}h ago`; }
  return `${Math.floor(diff / day)}d ago`;
}

export interface OkrListRenderState {
  okrs: OkrListItem[];
  isLoading?: boolean;
}

export function renderOkrListView(state: OkrListRenderState): string {
  if (state.isLoading) {
    return `<div class="okr-list-container"><div class="okr-empty"><p>Loading OKRs…</p></div></div>`;
  }
  if (state.okrs.length === 0) {
    return `
      <div class="okr-list-container">
        <div class="okr-empty">
          <h2>No OKRs yet</h2>
          <p>OKRs are the entry point for the agentic governed SDLC pipeline.
             Create one to anchor a research → PRD → code-design intent thread.</p>
          <button class="okr-button-primary" data-action="create-okr-manual">
            + Create OKR
          </button>
          <p class="okr-empty-note">Tip: scaffolding IMDB-Lite from Settings → Sample Platform also seeds a sample OKR.</p>
        </div>
      </div>
    `;
  }
  const rows = state.okrs.map(o => renderOkrRow(o)).join('');
  return `
    <div class="okr-list-container">
      <div class="okr-list-header">
        <div>
          <h1 class="okr-list-title">OKRs</h1>
          <p class="okr-list-subtitle">${state.okrs.length} OKR${state.okrs.length === 1 ? '' : 's'}</p>
        </div>
        <button class="okr-button-primary" data-action="create-okr-manual">+ Create OKR</button>
      </div>
      <table class="okr-list-table">
        <thead>
          <tr>
            <th>Objective</th>
            <th>Platform</th>
            <th>Primary BAR</th>
            <th>Tier</th>
            <th>Status</th>
            <th>Phase</th>
            <th>Last activity</th>
            <th>Chain root</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderOkrRow(o: OkrListItem): string {
  const chainRoot = o.chainRootShort ? `<code>${escapeHtml(o.chainRootShort)}…</code>` : '<span class="okr-muted">—</span>';
  return `
    <tr class="okr-list-row" data-okr-id="${escapeAttr(o.id)}">
      <td class="okr-objective-cell">
        <div class="okr-objective-text">${escapeHtml(o.objective)}</div>
        <div class="okr-id">${escapeHtml(o.id)}</div>
      </td>
      <td>${escapeHtml(o.platformId)}</td>
      <td>${escapeHtml(o.primaryBarId)}</td>
      <td>${renderTierBadge(o.primaryBarTier)}</td>
      <td>${renderStatusBadge(o.status)}${o.paused ? ' <span class="okr-paused-chip">⏸ Paused</span>' : ''}</td>
      <td>${renderPhaseProgress(o.phaseProgress)}</td>
      <td class="okr-muted">${escapeHtml(formatRelative(o.lastActivityAt))}</td>
      <td>${chainRoot}</td>
    </tr>
  `;
}

export function getOkrListStyles(): string {
  return `
    .okr-list-container { padding: 1.5rem 2rem; }
    .okr-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
    .okr-list-title { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--vscode-foreground); }
    .okr-list-subtitle { margin: 0.25rem 0 0; color: var(--vscode-descriptionForeground); font-size: 0.875rem; }
    .okr-list-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .okr-list-table thead th { text-align: left; padding: 0.5rem 0.75rem; font-weight: 600; color: var(--vscode-descriptionForeground); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--vscode-panel-border); }
    .okr-list-table tbody tr.okr-list-row { cursor: pointer; transition: background 0.1s; }
    .okr-list-table tbody tr.okr-list-row:hover { background: var(--vscode-list-hoverBackground); }
    .okr-list-table tbody td { padding: 0.75rem; border-bottom: 1px solid var(--vscode-panel-border); }
    .okr-objective-cell { max-width: 360px; }
    .okr-objective-text { font-weight: 500; color: var(--vscode-foreground); }
    .okr-id { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.75rem; color: var(--vscode-descriptionForeground); margin-top: 0.25rem; }
    .okr-muted { color: var(--vscode-descriptionForeground); }
    .okr-tier-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; }
    .okr-tier-autonomous { background: rgba(74, 222, 128, 0.15); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); }
    .okr-tier-supervised { background: rgba(125, 211, 252, 0.15); color: #7dd3fc; border: 1px solid rgba(125, 211, 252, 0.3); }
    .okr-tier-restricted { background: rgba(248, 113, 113, 0.15); color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.3); }
    .okr-status-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 500; }
    .okr-status-neutral { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .okr-status-progress { background: rgba(252, 211, 77, 0.15); color: #fcd34d; border: 1px solid rgba(252, 211, 77, 0.3); }
    .okr-status-block { background: rgba(248, 113, 113, 0.18); color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.4); }
    .okr-status-done { background: rgba(74, 222, 128, 0.15); color: #86efac; border: 1px solid rgba(74, 222, 128, 0.3); }
    .okr-paused-chip { display: inline-block; padding: 0.125rem 0.4rem; border-radius: 0.375rem; font-size: 0.7rem; background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
    .okr-phase-progress { display: inline-flex; gap: 0.25rem; align-items: center; }
    .okr-phase-dot { display: inline-block; min-width: 1rem; text-align: center; font-size: 0.9rem; }
    .okr-phase-complete { color: #86efac; }
    .okr-phase-in_progress { color: #fcd34d; }
    .okr-phase-not_started { color: var(--vscode-descriptionForeground); opacity: 0.6; }
    .okr-empty { text-align: center; padding: 4rem 2rem; max-width: 520px; margin: 0 auto; }
    .okr-empty h2 { margin: 0 0 0.75rem; font-size: 1.5rem; font-weight: 600; }
    .okr-empty p { margin: 0 0 1rem; color: var(--vscode-descriptionForeground); line-height: 1.5; }
    .okr-empty-note { font-size: 0.75rem; opacity: 0.7; margin-top: 0.75rem; }
    .okr-button-primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 0.5rem 1.25rem; border-radius: 0.375rem; cursor: pointer; font-weight: 500; }
    .okr-button-primary:hover { background: var(--vscode-button-hoverBackground); }
    .okr-button-secondary { background: transparent; color: var(--vscode-foreground); border: 1px solid var(--vscode-panel-border); padding: 0.4rem 0.875rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; }
    .okr-button-secondary:hover { background: var(--vscode-list-hoverBackground); }
  `;
}

/**
 * Attach click handlers. Pass in the webview's vscode handle.
 */
export function attachOkrListEvents(vscode: { postMessage: (msg: unknown) => void }): void {
  document.querySelectorAll('.okr-list-row').forEach(row => {
    row.addEventListener('click', () => {
      const okrId = (row as HTMLElement).dataset.okrId;
      if (okrId) {
        vscode.postMessage({ type: 'drillIntoOkr', okrId });
      }
    });
  });
  document.querySelectorAll('[data-action="create-okr-manual"]').forEach(btn => {
    btn.addEventListener('click', () => {
      vscode.postMessage({ type: 'createOkrDraft' });
    });
  });
}
