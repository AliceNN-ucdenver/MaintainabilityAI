// Scorecard webview frontend — renders Security Scorecard dashboard
import { renderAgentStatus, attachAgentStatusListeners, getAgentStatusStyles } from './agentStatus';
import type { AgentStatusInfo, AgentStatusPhase } from './agentStatus';
import { escapeHtml, formatTimestamp, renderMarkdown } from './pillars/shared';
import { deployStatusBadge } from './components/html';
import type { VsCodeApi, MetricResult, SdlcCompletenessItem, OwaspIssueSummary, ScorecardData, ScorecardSnapshot, TrendDirection, FitnessTestResult } from './types';

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

/** Maintenance-issues list row (mirrors the host's GitHubIssueListItem). */
interface ScorecardIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: { name: string; color: string }[];
  assignee: string | null;
  updatedAt: string;
  commentsCount: number;
  url: string;
}

/** Active break-glass grant (mirrors the host's BreakGlassGrant). */
interface BreakGlassGrant {
  issue: number;
  tier?: string;
  grantedBy?: string;
  grantedAt?: string;
  expiresAt: string;
  reason?: string;
}

// ============================================================================
// State
// ============================================================================

const state = {
  data: null as ScorecardData | null,
  repo: null as { owner: string; repo: string } | null,
  isLoading: true,
  loadingMessage: 'Collecting metrics...',
  errorMessage: '',
  history: [] as ScorecardSnapshot[],
  trends: {} as Record<string, TrendDirection>,
  packageManager: 'Unknown',
  testing: 'Unknown',
  // Settings
  view: 'scorecard' as 'scorecard' | 'settings',
  settingsAliceWorkflowExists: null as boolean | null,
  availableModels: [] as { id: string; family: string; name: string; vendor: string }[],
  settingsPreferredModel: '',
  // 'unknown' until the AUTO_ASSIGN_ALICE repo variable is read.
  settingsAutoAssignAlice: 'unknown' as boolean | 'unknown',
  // Workspace folders
  workspaceFolders: [] as { name: string; path: string }[],
  selectedFolder: '',
  // Unified agent status (replaces activeIssue)
  agentStatus: null as AgentStatusInfo | null,
  // Repo sync status
  syncStatus: null as { behind: number; ahead: number; branch: string; dirty?: boolean } | null,
  // Phase 6 — Governance bridge data
  governanceData: null as {
    barId: string; barName: string; platformId: string; compositeScore: number;
    criticality: string; tier: string; effectiveTier: string;
    pillarScores: { architecture: number; security: number; infoRisk: number; operations: number };
    platformOverrides?: string[]; reasoning?: string[];
    review?: { agents: number; human_approval: boolean };
  } | null,
  // Auto-detected BAR when no decision.json exists
  detectedBar: null as { barName: string; barPath: string } | null,
  // Inline Rabbit Hole sheet — describe → grounded RCTRO preview → dispatch Alice
  rabbitHole: null as null | {
    taskKind: string;
    heading: string;
    description: string;
    packLabels: string[];
    phase: 'input' | 'generating' | 'preview' | 'dispatching' | 'done';
    editing: boolean;
    previewTitle: string;
    previewBody: string;
    issueUrl: string;
    issueNumber: number;
  },
  // Maintenance-issues list
  issues: [] as ScorecardIssue[],
  issuesLoaded: false,
  issueFilter: 'open' as 'open' | 'all',
  issuesCollapsed: false,
  // SDLC Completeness — collapsed by default so the 12 rows don't crowd the page.
  sdlcCollapsed: true,
  assigningIssue: null as number | null,
  // Restricted-tier break-glass grants (.redqueen/approvals.json)
  breakGlassGrants: [] as BreakGlassGrant[],
};

const rootEl = document.getElementById('scorecard-root')!;

const CHESHIRE_SVG = `<svg width="40" height="40" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="16" fill="#1e1e2e"/>
  <ellipse cx="42" cy="38" rx="9" ry="11" fill="#a855f7"/>
  <ellipse cx="86" cy="38" rx="9" ry="11" fill="#a855f7"/>
  <ellipse cx="44" cy="38" rx="4" ry="6" fill="#1e1e2e"/>
  <ellipse cx="88" cy="38" rx="4" ry="6" fill="#1e1e2e"/>
  <circle cx="46" cy="35" r="2" fill="#e9d5ff"/>
  <circle cx="90" cy="35" r="2" fill="#e9d5ff"/>
  <path d="M18 62 Q30 52 64 52 Q98 52 110 62" stroke="#a855f7" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M18 62 Q30 88 64 88 Q98 88 110 62" stroke="#a855f7" stroke-width="4" fill="none" stroke-linecap="round"/>
  <line x1="40" y1="58" x2="40" y2="76" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="52" y1="55" x2="52" y2="80" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="64" y1="54" x2="64" y2="82" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="76" y1="55" x2="76" y2="80" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="88" y1="58" x2="88" y2="76" stroke="#a855f7" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M104 96 L114 100 L114 110 Q114 116 104 120 Q94 116 94 110 L94 100 Z" fill="#a855f7" opacity="0.8"/>
  <path d="M100 106 L103 109 L109 103" stroke="#1e1e2e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Inject shared agent status CSS once
(function injectAgentStatusStyles() {
  const style = document.createElement('style');
  style.textContent = getAgentStatusStyles();
  document.head.appendChild(style);
})();

// Inject the inline Rabbit Hole sheet CSS once
(function injectRabbitHoleStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .rh-sheet { margin-bottom: 12px; padding: 14px; border: 1px solid var(--vscode-focusBorder, #a855f7); border-radius: 8px; }
    .rh-heading { margin-top: 0; display: flex; align-items: center; gap: 8px; }
    .rh-kind { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 10px; background: rgba(168,85,247,0.18); color: #c4b5fd; }
    .rh-label { display: block; font-size: 11px; font-weight: 600; margin-bottom: 4px; }
    .rh-input, .rh-textarea { width: 100%; box-sizing: border-box; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #444); border-radius: 4px; padding: 6px 8px; font-family: inherit; font-size: 12px; }
    .rh-textarea { resize: vertical; }
    .rh-packs { margin-top: 10px; font-size: 12px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .rh-chip { font-size: 11px; padding: 2px 7px; border-radius: 10px; background: var(--vscode-badge-background, #333); color: var(--vscode-badge-foreground, #ddd); }
    .rh-actions { display: flex; gap: 8px; margin-top: 12px; }
    .rh-preview { max-height: 460px; overflow: auto; word-break: break-word; background: var(--vscode-textCodeBlock-background, #1e1e1e); border: 1px solid var(--vscode-input-border, #444); border-radius: 4px; padding: 12px 14px; font-size: 12px; margin-top: 4px; }

    /* Rendered markdown (RCTRO preview + pre-filled brief) */
    .rh-md { font-size: 12px; line-height: 1.55; }
    .rh-md h3, .rh-md h4, .rh-md h5 { margin: 12px 0 4px; line-height: 1.3; }
    .rh-md h3 { font-size: 14px; } .rh-md h4 { font-size: 13px; } .rh-md h5 { font-size: 12px; color: var(--text-secondary, #bbb); }
    .rh-md code { background: var(--vscode-textCodeBlock-background, #2a2a2a); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .rh-md pre { background: var(--vscode-textCodeBlock-background, #1e1e1e); border: 1px solid var(--vscode-input-border, #444); border-radius: 4px; padding: 8px 10px; overflow: auto; }
    .rh-md pre code { background: none; padding: 0; }
    .rh-md table { border-collapse: collapse; margin: 6px 0; font-size: 11px; }
    .rh-md th, .rh-md td { border: 1px solid var(--vscode-input-border, #444); padding: 3px 8px; text-align: left; }
    .rh-md th { background: rgba(255,255,255,0.04); }
    .rh-md hr { border: none; border-top: 1px solid var(--vscode-panel-border, #444); margin: 8px 0; }
    .rh-brief { max-height: 360px; overflow: auto; background: var(--vscode-textBlockQuote-background, rgba(255,255,255,0.03)); border: 1px solid var(--vscode-input-border, #444); border-radius: 4px; padding: 10px 14px; }
    .rh-done { font-size: 13px; }
    .rh-link { color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: underline; }

    /* Maintenance Issues list */
    .mi-section { margin-bottom: 14px; }
    .mi-header { display: flex; align-items: center; gap: 8px; }
    .mi-header h3 { margin: 0; font-size: 14px; flex: 0 0 auto; }
    .mi-collapse { background: none; border: none; color: var(--text-secondary, #aaa); cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; }
    .mi-count { font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 10px; background: var(--vscode-badge-background, #333); color: var(--vscode-badge-foreground, #ddd); }
    .mi-header-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
    .mi-filter { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #444); border-radius: 4px; padding: 2px 6px; font-size: 11px; }
    .mi-list { max-height: 300px; overflow-y: auto; margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
    .mi-row { display: flex; align-items: center; gap: 10px; padding: 7px 9px; border: 1px solid var(--vscode-input-border, #333); border-radius: 6px; }
    .mi-main { min-width: 0; flex: 1; }
    .mi-title { display: block; color: var(--vscode-textLink-foreground); cursor: pointer; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mi-chips { margin-top: 3px; display: flex; gap: 4px; flex-wrap: wrap; }
    .mi-chip { font-size: 10px; padding: 1px 6px; border-radius: 9px; background: rgba(120,120,140,0.18); color: var(--text-secondary, #bbb); }
    .mi-right { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
    .mi-pill { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
    .mi-pill-open { background: rgba(56,139,253,0.18); color: #79c0ff; }
    .mi-pill-active { background: rgba(168,85,247,0.20); color: #d2a8ff; }
    .mi-pill-closed { background: rgba(120,120,120,0.18); color: #9aa0a6; }
    .mi-pill-wait { background: rgba(234,179,8,0.18); color: #eab308; }
    .mi-pill-fail { background: rgba(248,81,73,0.18); color: #ff7b72; }
    .mi-pr { font-size: 11px; white-space: nowrap; color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: none; }
    .btn-sm { font-size: 11px; padding: 3px 9px; }
    .mi-empty { margin-top: 8px; font-size: 12px; color: var(--text-secondary, #999); padding: 6px 2px; }
    .mi-switch { display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; }
    .mi-switch input { cursor: pointer; }

    /* Restricted-tier break-glass */
    .bg-section { margin-bottom: 12px; padding: 0; }
    .bg-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid #f8514955; border-left: 3px solid #f85149; border-radius: 6px; background: rgba(248,81,73,0.07); }
    .bg-row + .bg-row { margin-top: 6px; }
    .bg-icon { font-size: 15px; flex: 0 0 auto; }
    .bg-main { min-width: 0; flex: 1; font-size: 12px; }
    .bg-link { color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: underline; }
    .bg-meta { display: block; margin-top: 2px; font-size: 11px; color: var(--text-secondary, #aaa); }
    .mi-pill-glass { background: rgba(248,81,73,0.20); color: #ff7b72; }
    .mi-glass { border-color: #f8514988; color: #ff7b72; }

    /* Fitness Tests */
    .ft-list { margin-bottom: 16px; display: flex; flex-direction: column; gap: 4px; }
    .ft-group { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary, #999); margin: 8px 0 2px; }
    .ft-row { display: flex; align-items: center; gap: 10px; padding: 6px 9px; border: 1px solid var(--vscode-input-border, #333); border-radius: 6px; }
    .ft-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
    .ft-dot-on { background: #2ea043; }
    .ft-dot-off { background: #6e7681; }
    .ft-name { font-size: 12px; font-weight: 500; flex: 0 0 auto; min-width: 120px; }
    .ft-path { font-size: 11px; color: var(--text-secondary, #9aa0a6); font-family: var(--vscode-editor-font-family, monospace); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ft-none { font-size: 11px; color: var(--text-secondary, #9aa0a6); font-style: italic; }
    .ft-ratchet { font-size: 11px; color: var(--text-secondary, #bbb); white-space: nowrap; }
    .ft-action { margin-left: auto; flex: 0 0 auto; }
  `;
  document.head.appendChild(style);
})();

// ============================================================================
// Rendering
// ============================================================================

function render() {
  // Settings view takes over completely
  if (state.view === 'settings') {
    rootEl.innerHTML = renderSettingsView();
    attachSettingsEvents();
    return;
  }

  if (state.isLoading && !state.data) {
    rootEl.innerHTML = `
      <div class="scorecard-header">
        <div class="header-left">
          ${CHESHIRE_SVG}
          <div>
            <h1>Security Scorecard</h1>
            <p>${state.repo ? `${escapeHtml(state.repo.owner)}/${escapeHtml(state.repo.repo)}` : 'Detecting repository...'}</p>
          </div>
          <button id="btn-settings-gear" class="settings-gear" title="Settings">&#x2699;</button>
        </div>
      </div>
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>${escapeHtml(state.loadingMessage)}</p>
      </div>
    `;
    attachSettingsGear();
    return;
  }

  if (state.errorMessage && !state.data) {
    rootEl.innerHTML = `
      <div class="scorecard-header">
        <div class="header-left">
          ${CHESHIRE_SVG}
          <div>
            <h1>Security Scorecard</h1>
            <p>${state.repo ? `${escapeHtml(state.repo.owner)}/${escapeHtml(state.repo.repo)}` : 'No repository detected'}</p>
          </div>
          <button id="btn-settings-gear" class="settings-gear" title="Settings">&#x2699;</button>
        </div>
        <div class="header-right">
          <button id="btn-refresh" class="btn-secondary btn-icon" title="Refresh">&#x21BB;</button>
        </div>
      </div>
      <div class="error-msg">${escapeHtml(state.errorMessage)}</div>
    `;
    attachRefresh();
    attachSettingsGear();
    return;
  }

  const d = state.data!;
  const repoLabel = d.repo ? `${escapeHtml(d.repo.owner)}/${escapeHtml(d.repo.repo)}` : 'No repository detected';
  const repoUrl = d.repo ? `https://github.com/${encodeURIComponent(d.repo.owner)}/${encodeURIComponent(d.repo.repo)}` : '';

  rootEl.innerHTML = `
    ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}

    <div class="scorecard-header">
      <div class="header-left">
        ${CHESHIRE_SVG}
        <div>
          <h1>Security Scorecard</h1>
          <p>${escapeHtml(repoLabel)}</p>
        </div>
        <button id="btn-settings-gear" class="settings-gear" title="Settings">&#x2699;</button>
      </div>
      <div class="header-right">
        ${renderFolderDropdown()}
        <span class="last-refreshed">${formatTimestamp(d.lastRefreshed)}</span>
        <button id="btn-refresh" class="btn-secondary btn-icon" title="Refresh" ${state.isLoading ? 'disabled' : ''}>&#x21BB;</button>
      </div>
    </div>

    ${renderRabbitHoleSheet()}
    ${renderSyncBanner()}
    ${renderCreateFeatureBanner()}
    ${renderPmatBanner(d)}
    ${renderGradeCard(d)}
    ${renderGovernanceSection()}
    ${renderMetricsGrid(d)}
    ${renderFitnessTests(d)}
    ${renderBreakGlassBanner()}
    ${renderAgentFallback()}
    ${renderMaintenanceIssues()}
    ${renderOwaspBreakdown(d.owaspIssues)}
    ${renderSdlcCompleteness(d.sdlcCompleteness)}
    ${renderScoreHistory()}
    ${renderQuickActions(repoUrl)}
  `;

  attachRefresh();
  attachActions();
  attachPmatInstall();
  attachMetricActions();
  attachCreateFeature();
  attachSyncBanner();
  attachFolderSelect();
  attachRabbitHoleSheet();
  attachMaintenanceIssues();
  attachFitnessTests();
  attachAgentStatusListeners(
    (msg) => vscode.postMessage(msg),
    // Lifecycle one-clicks (approve-run / mark-pr-ready / merge-pr) — post to
    // the panel, which acts via the GitHub API on the current repo and
    // re-detects the agent status so the banner updates without a refresh.
    (action, data) => {
      if (action === 'approve-run' && data.runId) {
        vscode.postMessage({ type: 'approveAgentRun', runId: Number(data.runId) });
      } else if (action === 'mark-pr-ready' && data.prNumber) {
        vscode.postMessage({ type: 'markAgentPrReady', prNumber: Number(data.prNumber) });
      } else if (action === 'merge-pr' && data.prNumber) {
        vscode.postMessage({ type: 'mergeAgentPr', prNumber: Number(data.prNumber), issueNumber: Number(data.issueNumber ?? 0) });
      }
    },
  );
  attachSettingsGear();
}

// ============================================================================
// Inline Rabbit Hole sheet — describe → grounded RCTRO preview → dispatch Alice
// ============================================================================

/** Bring the inline RCTRO sheet into view — it renders near the top, but the
 *  click that opens it usually comes from a tile/row further down the page. */
function scrollRabbitHoleIntoView(): void {
  requestAnimationFrame(() => {
    document.querySelector('.rh-sheet')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function renderRabbitHoleSheet(): string {
  const rh = state.rabbitHole;
  if (!rh) { return ''; }

  const packChips = rh.packLabels.length
    ? rh.packLabels.map(p => `<span class="rh-chip">${escapeHtml(p)}</span>`).join('')
    : '<span class="text-muted">Security-First Baseline (default)</span>';

  let phaseBody: string;
  if (rh.phase === 'done') {
    phaseBody = `
      <div class="rh-done">
        &#10003; Filed <a class="rh-link" data-url="${escapeHtml(rh.issueUrl)}">#${rh.issueNumber}</a> and dispatched
        <strong>Alice</strong>. Track approve → ready → merge in the banner above.
      </div>
      <div style="margin-top: 10px;"><button id="btn-rh-close" class="btn-secondary">Close</button></div>`;
  } else if (rh.phase === 'preview') {
    // Restricted-tier repos hard-deny Alice's Write/Bash (TIER-001), so offer a
    // break-glass dispatch as the primary action; plain dispatch stays available
    // to capture the deny path on purpose.
    const restricted = state.governanceData?.effectiveTier === 'restricted';
    const dispatchButtons = restricted
      ? `<button id="btn-rh-breakglass" class="btn-primary mi-glass" title="Grant a 2h TIER-001 override, then file + dispatch">&#128275; Break glass &amp; dispatch</button>
         <button id="btn-rh-dispatch" class="btn-secondary" title="Dispatch without an override — restricted tier will deny Write/Bash">&#128126; Dispatch anyway</button>`
      : `<button id="btn-rh-dispatch" class="btn-primary">&#128126; Dispatch to Alice</button>`;
    phaseBody = `
      <label class="rh-label">Issue title</label>
      <input id="rh-title" type="text" class="rh-input" value="${escapeHtml(rh.previewTitle)}" />
      <label class="rh-label" style="margin-top: 10px;">Grounded RCTRO preview <span class="text-muted">(this exact body is filed)</span></label>
      <div class="rh-preview rh-md">${renderMarkdown(rh.previewBody)}</div>
      ${restricted ? `<div class="text-muted" style="margin-top: 8px; font-size: 11px;">&#128275; This repo is <strong>restricted</strong> tier — Alice's Write/Bash are denied (TIER-001) unless you break glass.</div>` : ''}
      <div class="rh-actions">
        ${dispatchButtons}
        <button id="btn-rh-regenerate" class="btn-secondary">Regenerate</button>
        <button id="btn-rh-cancel" class="btn-secondary">Cancel</button>
      </div>`;
  } else {
    const busy = rh.phase === 'generating' || rh.phase === 'dispatching';
    // A pre-filled recipe (e.g. "Assign Alice") reads best rendered; show the raw
    // textarea only for a blank brief (Create Feature) or when the user edits.
    const showRendered = !!rh.description.trim() && !rh.editing && !busy;
    const briefBody = showRendered
      ? `<div class="rh-md rh-brief">${renderMarkdown(rh.description)}</div>
         <button id="btn-rh-edit" class="rh-link" style="margin-top: 6px;">&#9998; Edit</button>`
      : `<textarea id="rh-description" class="rh-textarea" rows="14" placeholder="What should Alice do? Name behaviors, not files — the RCTRO is grounded automatically." ${busy ? 'disabled' : ''}>${escapeHtml(rh.description)}</textarea>`;
    phaseBody = `
      <label class="rh-label">Describe the task <span class="text-muted">(grounded in this repo's real files)</span></label>
      ${briefBody}
      <div class="rh-packs"><strong>Prompt packs</strong> ${packChips}</div>
      <div class="rh-actions">
        <button id="btn-rh-generate" class="btn-primary" ${busy ? 'disabled' : ''}>${rh.phase === 'generating' ? 'Generating…' : '&#10024; Generate RCTRO'}</button>
        <button id="btn-rh-cancel" class="btn-secondary" ${busy ? 'disabled' : ''}>Cancel</button>
      </div>`;
  }

  return `
    <div class="section rh-sheet">
      <h3 class="rh-heading">&#128046; ${escapeHtml(rh.heading)} <span class="rh-kind">${escapeHtml(rh.taskKind)}</span></h3>
      ${phaseBody}
    </div>`;
}

function attachRabbitHoleSheet(): void {
  const rh = state.rabbitHole;
  if (!rh) { return; }

  // Preserve edits without re-rendering (would drop caret/focus).
  const desc = document.getElementById('rh-description') as HTMLTextAreaElement | null;
  desc?.addEventListener('input', () => { if (state.rabbitHole) { state.rabbitHole.description = desc.value; } });
  const titleEl = document.getElementById('rh-title') as HTMLInputElement | null;
  titleEl?.addEventListener('input', () => { if (state.rabbitHole) { state.rabbitHole.previewTitle = titleEl.value; } });

  document.getElementById('btn-rh-edit')?.addEventListener('click', () => {
    if (!state.rabbitHole) { return; }
    state.rabbitHole.editing = true;
    render();
  });

  document.getElementById('btn-rh-generate')?.addEventListener('click', () => {
    if (!state.rabbitHole) { return; }
    state.rabbitHole.phase = 'generating';
    render();
    vscode.postMessage({ type: 'generateRctroInline', description: state.rabbitHole.description });
  });
  document.getElementById('btn-rh-regenerate')?.addEventListener('click', () => {
    if (!state.rabbitHole) { return; }
    state.rabbitHole.phase = 'input';
    render();
  });
  document.getElementById('btn-rh-dispatch')?.addEventListener('click', () => {
    if (!state.rabbitHole) { return; }
    state.rabbitHole.phase = 'dispatching';
    const title = state.rabbitHole.previewTitle;
    render();
    vscode.postMessage({ type: 'dispatchRctroInline', title });
  });
  document.getElementById('btn-rh-breakglass')?.addEventListener('click', () => {
    if (!state.rabbitHole) { return; }
    state.rabbitHole.phase = 'dispatching';
    const title = state.rabbitHole.previewTitle;
    render();
    vscode.postMessage({ type: 'dispatchRctroInline', title, breakGlass: true });
  });
  document.getElementById('btn-rh-cancel')?.addEventListener('click', () => {
    state.rabbitHole = null;
    render();
  });
  document.getElementById('btn-rh-close')?.addEventListener('click', () => {
    state.rabbitHole = null;
    render();
  });
  document.querySelector('.rh-done .rh-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const url = (e.currentTarget as HTMLElement).dataset.url;
    if (url) { vscode.postMessage({ type: 'openUrl', url }); }
  });
}

// ============================================================================
// Maintenance Issues — the repo's issues with state + one-click "Assign Alice"
// ============================================================================

const MI_NOISE_LABELS = new Set(['awaiting-remediation-plan', 'remediation-planning']);

/** Phase pill + whether the issue can still be handed to Alice. */
function maintenanceIssuePhase(i: ScorecardIssue): { label: string; cls: string; assignable: boolean } {
  if (i.state === 'closed') { return { label: 'Closed', cls: 'mi-pill-closed', assignable: false }; }
  const a = (i.assignee || '').toLowerCase();
  if (a.includes('copilot') || a.includes('claude')) { return { label: 'Alice working', cls: 'mi-pill-active', assignable: false }; }
  return { label: 'Open', cls: 'mi-pill-open', assignable: true };
}

/** Compact phase pill for the issue the agent is actively working. */
function agentPhasePill(phase: AgentStatusPhase): { label: string; cls: string } {
  switch (phase) {
    case 'awaiting-approval': return { label: 'Awaiting approval', cls: 'mi-pill-wait' };
    case 'planning': return { label: 'Planning', cls: 'mi-pill-active' };
    case 'plan-review': return { label: 'Plan ready', cls: 'mi-pill-wait' };
    case 'implementing': return { label: 'Implementing', cls: 'mi-pill-active' };
    case 'pr-review': return { label: 'PR review', cls: 'mi-pill-wait' };
    case 'pr-checks-failing': return { label: 'Checks failing', cls: 'mi-pill-fail' };
    case 'complete': return { label: 'Complete', cls: 'mi-pill-open' };
  }
}

/** Right side of the row for the agent's active issue: PR link + live phase +
 *  one-click lifecycle buttons. The buttons carry the same data-agent-action
 *  attributes the standalone banner used, so attachAgentStatusListeners() wires
 *  them unchanged — no separate banner needed. */
function renderRowAgentStatus(s: AgentStatusInfo): string {
  const pill = agentPhasePill(s.phase);
  const btns: string[] = [];
  if (s.phase === 'awaiting-approval' && s.workflowRun?.runId != null) {
    btns.push(`<button class="btn-secondary btn-sm" data-agent-action="approve-run" data-run-id="${s.workflowRun.runId}">✓ Approve &amp; run</button>`);
  }
  if (s.pr && s.pr.state === 'open' && s.pr.draft) {
    btns.push(`<button class="btn-secondary btn-sm" data-agent-action="mark-pr-ready" data-pr-number="${s.pr.number}">Mark PR ready</button>`);
  }
  if (s.pr && s.pr.state === 'open' && !s.pr.draft) {
    btns.push(`<button class="btn-primary btn-sm" data-agent-action="merge-pr" data-pr-number="${s.pr.number}" data-issue-number="${s.issue.number}">Merge</button>`);
  }
  const prLink = s.pr ? `<a class="mi-pr agent-status-link" data-url="${escapeHtml(s.pr.url)}">PR #${s.pr.number}</a>` : '';
  return `${prLink}<span class="mi-pill ${pill.cls}">${escapeHtml(pill.label)}</span>${btns.join('')}`;
}

function renderIssueRow(i: ScorecardIssue): string {
  const chips = i.labels
    .filter(l => !MI_NOISE_LABELS.has(l.name))
    .slice(0, 4)
    .map(l => `<span class="mi-chip">${escapeHtml(l.name)}</span>`)
    .join('');

  // When the agent is actively working THIS issue, the row shows its live phase
  // + lifecycle buttons inline (replacing the dropped top banner).
  const agent = state.agentStatus && state.agentStatus.issue?.number === i.number ? state.agentStatus : null;
  let right: string;
  if (agent) {
    right = renderRowAgentStatus(agent);
  } else {
    const phase = maintenanceIssuePhase(i);
    const assigning = state.assigningIssue === i.number;
    // Restricted-tier BARs hard-deny Alice's Write/Bash (TIER-001). The assign
    // button becomes a break-glass that commits a scoped, audited override first.
    const restricted = state.governanceData?.effectiveTier === 'restricted';
    let action = '';
    if (phase.assignable) {
      if (assigning) {
        action = `<button class="btn-secondary btn-sm" disabled>Dispatching…</button>`;
      } else if (restricted) {
        action = `<button class="btn-secondary btn-sm mi-glass mi-breakglass" data-issue="${i.number}" title="Grant a scoped, audited restricted-tier override, then dispatch Alice">${assignAliceLabel()}</button>`;
      } else {
        action = `<button class="btn-secondary btn-sm mi-assign" data-issue="${i.number}">${assignAliceLabel()}</button>`;
      }
    }
    right = `<span class="mi-pill ${phase.cls}">${phase.label}</span>${action}`;
  }
  return `
    <div class="mi-row">
      <div class="mi-main">
        <a class="mi-title" data-url="${escapeHtml(i.url)}">#${i.number} ${escapeHtml(i.title)}</a>
        ${chips ? `<div class="mi-chips">${chips}</div>` : ''}
      </div>
      <div class="mi-right">${right}</div>
    </div>`;
}

/** The agent card now lives inside its issue's row; show the standalone card
 *  only when that row isn't on screen (list collapsed, filtered out, or not yet
 *  loaded) so the lifecycle buttons are never unreachable. */
function renderAgentFallback(): string {
  const s = state.agentStatus;
  if (!s) { return ''; }
  const visibleInList = !state.issuesCollapsed && state.issues.some(i => i.number === s.issue?.number);
  return visibleInList ? '' : renderAgentStatus(s, { lifecycleActions: true });
}

function renderMaintenanceIssues(): string {
  // Don't flash an empty card before the first repo-scoped load.
  if (!state.repo && !state.issuesLoaded) { return ''; }

  const chevron = state.issuesCollapsed ? '›' : '˅';
  const header = `
    <div class="mi-header">
      <button class="mi-collapse" id="mi-collapse" title="${state.issuesCollapsed ? 'Expand' : 'Collapse'}">${chevron}</button>
      <h3>Maintenance Issues <span class="mi-count">${state.issues.length}</span></h3>
      <div class="mi-header-actions">
        <select id="mi-filter" class="mi-filter" title="Filter by state">
          <option value="open" ${state.issueFilter === 'open' ? 'selected' : ''}>Open</option>
          <option value="all" ${state.issueFilter === 'all' ? 'selected' : ''}>All</option>
        </select>
        <button class="btn-secondary btn-icon btn-sm" id="mi-reload" title="Reload issues">&#x21BB;</button>
      </div>
    </div>`;

  if (state.issuesCollapsed) {
    return `<div class="section mi-section">${header}</div>`;
  }

  let body: string;
  if (!state.issuesLoaded) {
    body = `<div class="mi-empty">Loading…</div>`;
  } else if (state.issues.length === 0) {
    body = `<div class="mi-empty">${state.issueFilter === 'open' ? 'No open issues \u{1F389}' : 'No issues'}</div>`;
  } else {
    body = `<div class="mi-list">${state.issues.map(renderIssueRow).join('')}</div>`;
  }
  return `<div class="section mi-section">${header}${body}</div>`;
}

/** Human-readable "expires in …" for a break-glass grant. */
function formatBreakGlassExpiry(iso: string): string {
  const exp = Date.parse(iso);
  if (isNaN(exp)) { return 'unknown'; }
  const mins = Math.round((exp - Date.now()) / 60000);
  if (mins <= 0) { return 'expired'; }
  if (mins < 60) { return `expires in ${mins}m`; }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `expires in ${rem ? `${hrs}h ${rem}m` : `${hrs}h`}`;
}

/** Active restricted-tier override banner — one row per live grant + Revoke. */
function renderBreakGlassBanner(): string {
  const grants = state.breakGlassGrants;
  if (!grants.length) { return ''; }
  const repo = state.data?.repo || state.repo;
  const rows = grants.map(g => {
    const url = repo ? `https://github.com/${repo.owner}/${repo.repo}/issues/${g.issue}` : '';
    const who = g.grantedBy ? `@${escapeHtml(g.grantedBy)}` : 'a maintainer';
    return `
      <div class="bg-row">
        <span class="bg-icon">\u{1F513}</span>
        <div class="bg-main">
          <strong>Break-glass active</strong> for <a class="bg-link" data-url="${escapeHtml(url)}">#${g.issue}</a>
          — restricted-tier override (TIER-001)
          <span class="bg-meta">Granted by ${who} · ${escapeHtml(formatBreakGlassExpiry(g.expiresAt))} · every override is in the audit chain</span>
        </div>
        <button class="btn-secondary btn-sm bg-revoke" data-issue="${g.issue}">Revoke</button>
      </div>`;
  }).join('');
  return `<div class="section bg-section">${rows}</div>`;
}

function reloadIssues(): void {
  state.issuesLoaded = false;
  render();
  vscode.postMessage({ type: 'loadIssues', filter: state.issueFilter });
}

function attachMaintenanceIssues(): void {
  document.getElementById('mi-collapse')?.addEventListener('click', () => {
    state.issuesCollapsed = !state.issuesCollapsed;
    render();
  });
  const filter = document.getElementById('mi-filter') as HTMLSelectElement | null;
  filter?.addEventListener('change', () => {
    state.issueFilter = filter.value === 'all' ? 'all' : 'open';
    reloadIssues();
  });
  document.getElementById('mi-reload')?.addEventListener('click', reloadIssues);
  document.querySelectorAll('.mi-title').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const url = (e.currentTarget as HTMLElement).dataset.url;
      if (url) { vscode.postMessage({ type: 'openUrl', url }); }
    });
  });
  document.querySelectorAll('.mi-assign').forEach(el => {
    el.addEventListener('click', (e) => {
      const n = Number((e.currentTarget as HTMLElement).dataset.issue);
      if (!n) { return; }
      state.assigningIssue = n;
      render();
      vscode.postMessage({ type: 'assignAlice', issueNumber: n });
    });
  });
  // Restricted-tier: break-glass first, then dispatch. The host runs the modal
  // confirm, commits the grant, comments on the issue, and assigns Alice.
  document.querySelectorAll('.mi-breakglass').forEach(el => {
    el.addEventListener('click', (e) => {
      const n = Number((e.currentTarget as HTMLElement).dataset.issue);
      if (!n) { return; }
      vscode.postMessage({ type: 'breakGlassAssign', issueNumber: n });
    });
  });
  document.querySelectorAll('.bg-revoke').forEach(el => {
    el.addEventListener('click', (e) => {
      const n = Number((e.currentTarget as HTMLElement).dataset.issue);
      if (!n) { return; }
      (e.currentTarget as HTMLButtonElement).disabled = true;
      vscode.postMessage({ type: 'revokeBreakGlass', issueNumber: n });
    });
  });
  document.querySelectorAll('.bg-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const url = (e.currentTarget as HTMLElement).dataset.url;
      if (url) { vscode.postMessage({ type: 'openUrl', url }); }
    });
  });
}

function renderFolderDropdown(): string {
  if (state.workspaceFolders.length < 2) { return ''; }
  const options = state.workspaceFolders.map(f =>
    `<option value="${escapeHtml(f.path)}" ${f.path === state.selectedFolder ? 'selected' : ''}>${escapeHtml(f.name)}</option>`
  ).join('');
  return `<select id="folder-select" class="folder-select" title="Workspace folder">${options}</select>`;
}

// renderActiveIssueCard removed — replaced by shared renderAgentStatus() from agentStatus.ts

function renderSyncBanner(): string {
  const sync = state.syncStatus;
  if (!sync) { return ''; }

  const parts: string[] = [];

  if (sync.behind > 0) {
    parts.push(`
      <div class="sync-banner">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 16px;">&#x2B07;</span>
          <div>
            <strong>Behind remote</strong>
            <span style="font-size: 12px; color: var(--text-secondary); margin-left: 6px;">
              <code>${escapeHtml(sync.branch)}</code> is ${sync.behind} commit${sync.behind !== 1 ? 's' : ''} behind
            </span>
          </div>
        </div>
        <button id="btn-sync-repo" class="btn-primary" style="padding: 4px 14px; font-size: 12px;">Pull Changes</button>
      </div>
    `);
  }

  if (sync.ahead > 0) {
    parts.push(`
      <div class="sync-banner" style="border-left-color: var(--accent);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 16px;">&#x2B06;</span>
          <div>
            <strong>Ahead of remote</strong>
            <span style="font-size: 12px; color: var(--text-secondary); margin-left: 6px;">
              <code>${escapeHtml(sync.branch)}</code> has ${sync.ahead} commit${sync.ahead !== 1 ? 's' : ''} to push
            </span>
          </div>
        </div>
        <button id="btn-push-repo" class="btn-primary" style="padding: 4px 14px; font-size: 12px;">Push Changes</button>
      </div>
    `);
  }

  if (sync.dirty) {
    parts.push(`
      <div class="sync-banner" style="border-left-color: var(--warning);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 16px;">&#x270F;</span>
          <div>
            <strong>Uncommitted changes</strong>
            <span style="font-size: 12px; color: var(--text-secondary); margin-left: 6px;">
              Working tree has modified files that haven't been committed
            </span>
          </div>
        </div>
        <button id="btn-commit-push" class="btn-primary" style="padding: 4px 14px; font-size: 12px;">Commit &amp; Push</button>
      </div>
    `);
  }

  return parts.join('');
}

function renderCreateFeatureBanner(): string {
  return `
    <div class="create-feature-banner">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">&#x1F43E;</span>
        <div>
          <strong>Create Feature</strong>
          <span class="text-muted" style="margin-left: 8px; font-size: 12px; color: var(--text-secondary);">Define a new feature with AI-generated implementation prompts</span>
        </div>
      </div>
      <button id="btn-create-feature" class="btn-primary">Create Feature</button>
    </div>
  `;
}

function renderGradeCard(d: ScorecardData): string {
  const gradeClass = d.grade === '?' ? 'grade-unknown' : `grade-${d.grade}`;
  const scorePercent = d.compositeScore >= 0 ? d.compositeScore : 0;
  const fillColor = d.grade === 'A' || d.grade === 'B' ? 'var(--success)'
    : d.grade === 'C' ? 'var(--running)'
    : d.grade === 'D' || d.grade === 'F' ? 'var(--error)'
    : 'var(--text-secondary)';

  const phrase = d.compositeScore < 0 ? 'Not enough data to grade'
    : d.compositeScore >= 90 ? 'Your project is in excellent health'
    : d.compositeScore >= 75 ? 'Your project is in good shape'
    : d.compositeScore >= 60 ? 'Some areas need attention'
    : 'Critical issues need to be addressed';

  const compositeTrend = state.trends['composite'];
  const compositeTrendHtml = compositeTrend ? trendIndicator(compositeTrend) : '';

  return `
    <div class="grade-card">
      <div class="grade-circle ${gradeClass}">${d.grade}</div>
      <div class="grade-info">
        <h2>${phrase}</h2>
        <p>Composite score: ${d.compositeScore >= 0 ? d.compositeScore + '/100' : 'N/A'}${compositeTrendHtml}</p>
        <div class="score-bar">
          <div class="score-fill" style="width: ${scorePercent}%; background: ${fillColor};"></div>
        </div>
      </div>
    </div>
  `;
}

function renderPmatBanner(d: ScorecardData): string {
  if (d.pmatInstalled) { return ''; }
  return `
    <div class="pmat-banner">
      <div class="pmat-banner-text">
        <strong>pmat not detected</strong> — install for complexity, tech debt, and dependency analysis
      </div>
      <button id="btn-install-pmat" class="btn-primary" style="white-space: nowrap;">Install pmat</button>
    </div>
  `;
}

function renderGovernanceSection(): string {
  const gov = state.governanceData;
  if (!gov) {
    const detected = state.detectedBar;
    if (detected) {
      // BAR found in mesh — offer one-click linking
      return `
        <div class="section-header">Governance</div>
        <div style="background: var(--surface-raised); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: var(--text); margin-bottom: 8px;">
            This repository belongs to BAR <strong>${escapeHtml(detected.barName)}</strong> but governance files have not been deployed yet.
          </div>
          <button id="btn-link-to-bar" class="btn-primary" style="font-size: 11px; padding: 4px 12px;">Deploy Governance Files</button>
        </div>
      `;
    }
    return `
      <div class="section-header">Governance</div>
      <div style="background: var(--surface-raised); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px; color: var(--text-secondary);">
        Not linked to governance mesh. Use <strong>Looking Glass</strong> to create a BAR and add this repository.
      </div>
    `;
  }

  const tierColors: Record<string, string> = {
    autonomous: '#2ea043',
    supervised: '#d29922',
    restricted: '#f85149',
  };
  const tierColor = tierColors[gov.effectiveTier] || '#888';
  const p = gov.pillarScores;
  const pillars = [
    { name: 'Architecture', score: p.architecture },
    { name: 'Security', score: p.security },
    { name: 'Info Risk', score: p.infoRisk },
    { name: 'Operations', score: p.operations },
  ];
  const constraintCount = (gov.platformOverrides?.length || 0) + (gov.reasoning?.length || 0);

  return `
    <div class="section-header">Governance</div>
    <div style="background: var(--surface-raised); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <span style="background: ${tierColor}22; color: ${tierColor}; padding: 2px 10px; border-radius: 4px; font-weight: 600; font-size: 11px; text-transform: uppercase;">${escapeHtml(gov.effectiveTier)}</span>
        <span style="font-weight: 500; font-size: 13px;">${escapeHtml(gov.barName)}</span>
        <span style="color: var(--text-secondary); font-size: 12px;">${gov.compositeScore}%</span>
        ${constraintCount > 0 ? `<span style="color: var(--text-secondary); font-size: 11px; margin-left: auto;">${constraintCount} active constraint${constraintCount > 1 ? 's' : ''}</span>` : ''}
      </div>
      <div style="display: flex; gap: 16px; font-size: 12px;">
        ${pillars.map(p => `<div style="flex: 1; text-align: center;">
          <div style="color: var(--text-secondary); font-size: 10px; margin-bottom: 2px;">${p.name}</div>
          <div style="font-weight: 600; ${p.score < 50 ? 'color: #f85149;' : ''}">${p.score}%</div>
        </div>`).join('')}
      </div>
      ${gov.platformOverrides && gov.platformOverrides.length > 0 ? `
        <div style="margin-top: 8px; font-size: 11px; color: var(--text-secondary);">
          Platform: ${gov.platformOverrides.map(o => escapeHtml(o)).join(', ')}
        </div>
      ` : ''}
      <div style="margin-top: 10px; display: flex; gap: 8px;">
        <button id="btn-resync-governance" class="btn-secondary" style="font-size: 11px; padding: 4px 10px;">Resync from Mesh</button>
      </div>
    </div>
  `;
}

// ============================================================================
// Fitness Tests — do executable fitness functions exist in the suite, per the
// convention; absent ones offer "Assign Alice" to author them.
// ============================================================================

const FITNESS_LABELS: Record<string, string> = {
  duplicate: 'Duplicate code', 'dead-code': 'Dead code', complexity: 'Complexity',
  architecture: 'Import boundaries', performance: 'Performance', accessibility: 'Accessibility',
};

/** Shared tier-aware label for EVERY "dispatch to Alice" entry point. Restricted
 *  repos hard-deny the agent's Write/Bash, so they need a break-glass override —
 *  centralized here so new assign surfaces don't forget the tier check. */
function assignAliceLabel(): string {
  return state.governanceData?.effectiveTier === 'restricted'
    ? '\u{1F513} Break glass & assign'
    : '\u{1F43E} Assign Alice';
}

function renderFitnessTestRow(t: FitnessTestResult): string {
  const name = FITNESS_LABELS[t.category] || t.category;
  const present = t.status === 'present';
  const u = t.unit ?? '';
  // Ratchet bar (from the committed baselines.json the test maintains).
  const bar = present && (t.measured != null || t.floor != null)
    ? `<span class="ft-ratchet">${t.measured != null ? `${t.measured}${u} now` : ''}${t.floor != null ? ` · floor ${t.floor}${u}` : ''}${t.target != null ? ` · target ${t.target}${u}` : ''}</span>`
    : '';
  const path = present
    ? `<span class="ft-path" title="convention path">${escapeHtml(t.testPath || '')}</span>`
    : '<span class="ft-none">no fitness test</span>';
  const restricted = state.governanceData?.effectiveTier === 'restricted';
  const action = present
    ? '<span class="mi-pill mi-pill-active">present</span>'
    : `<button class="btn-secondary btn-sm ft-assign${restricted ? ' mi-glass' : ''}" data-category="${escapeHtml(t.category)}">${assignAliceLabel()}</button>`;
  return `
    <div class="ft-row">
      <span class="ft-dot ${present ? 'ft-dot-on' : 'ft-dot-off'}"></span>
      <span class="ft-name">${escapeHtml(name)}</span>
      ${path}
      ${bar}
      <span class="ft-action">${action}</span>
    </div>`;
}

function renderFitnessTests(d: ScorecardData): string {
  const tests = d.fitnessTests || [];
  if (tests.length === 0) { return ''; }
  const structural = tests.filter(t => t.group === 'structural');
  const runtime = tests.filter(t => t.group === 'runtime');
  const group = (title: string, rows: FitnessTestResult[]): string =>
    rows.length ? `<div class="ft-group">${title}</div>${rows.map(renderFitnessTestRow).join('')}` : '';

  return `
    <div class="section-header">Fitness Tests</div>
    <div class="ft-list">
      ${group('Structural', structural)}
      ${group('Runtime / Evolutionary', runtime)}
    </div>
  `;
}

function attachFitnessTests(): void {
  document.querySelectorAll('.ft-assign').forEach(el => {
    el.addEventListener('click', (e) => {
      const category = (e.currentTarget as HTMLElement).dataset.category;
      if (category) { vscode.postMessage({ type: 'createFitnessTest', category }); }
    });
  });
}

function renderMetricsGrid(d: ScorecardData): string {
  const metrics = [
    { m: d.metrics.securityCompliance, icon: '&#x1F6E1;', key: 'securityCompliance' },
    { m: d.metrics.dependencyFreshness, icon: '&#x1F4E6;', key: 'dependencyFreshness' },
    { m: d.metrics.testCoverage, icon: '&#x1F9EA;', key: 'testCoverage' },
    { m: d.metrics.complexity, icon: '&#x1F9E9;', key: 'complexity' },
    { m: d.metrics.technicalDebt, icon: '&#x1F4CA;', key: 'technicalDebt' },
    { m: d.metrics.cicdHealth, icon: '&#x2699;', key: 'cicdHealth' },
  ];

  return `
    <div class="section-header">Fitness Functions</div>
    <div class="metrics-grid">
      ${metrics.map(({ m, icon, key }) => renderMetricCard(m, icon, key)).join('')}
    </div>
  `;
}

interface MetricAction {
  label: string;
  messageType: string;
  url?: string;
}

function getMetricActions(metricKey: string): MetricAction[] {
  const repo = state.data?.repo;

  switch (metricKey) {
    case 'dependencyFreshness':
      return [
        { label: 'Refresh Dependencies', messageType: 'refreshDeps' },
        { label: 'Improve Dependencies', messageType: 'improveDeps' },
      ];
    case 'testCoverage':
      return [
        { label: 'Run Coverage', messageType: 'runCoverage' },
        { label: 'Improve Coverage', messageType: 'improveCoverage' },
      ];
    case 'securityCompliance':
      return repo
        ? [{ label: 'View Security', messageType: 'openUrl', url: `https://github.com/${repo.owner}/${repo.repo}/security/code-scanning` }]
        : [];
    case 'cicdHealth':
      return repo
        ? [{ label: 'View Actions', messageType: 'openUrl', url: `https://github.com/${repo.owner}/${repo.repo}/actions` }]
        : [];
    case 'complexity':
      return [{ label: 'Reduce Complexity', messageType: 'reduceComplexity' }];
    case 'technicalDebt':
      return [{ label: 'Address Tech Debt', messageType: 'addressTechDebt' }];
    default:
      return [];
  }
}

function renderMetricCard(m: MetricResult, icon: string, metricKey?: string): string {
  const trend = metricKey ? state.trends[metricKey] : undefined;
  const trendHtml = trend ? trendIndicator(trend) : '';
  const actions = metricKey ? getMetricActions(metricKey) : [];

  const actionHtml = actions.length > 0
    ? `<div class="metric-action-overlay">
        ${actions.map(a =>
          `<button class="btn-metric-action" data-action="${a.messageType}"${a.url ? ` data-url="${escapeHtml(a.url)}"` : ''}>${escapeHtml(a.label)}</button>`
        ).join('')}
      </div>`
    : '';

  return `
    <div class="metric-card ${m.status}${actions.length > 0 ? ' has-action' : ''}">
      <div class="metric-header">
        <span class="metric-icon">${icon}</span>
        <span class="metric-label">${escapeHtml(m.label)}</span>
        ${trendHtml}
        <span class="status-dot dot-${m.status}" style="margin-left: auto;" title="${m.status}"></span>
      </div>
      <div class="metric-value">${escapeHtml(m.value)}</div>
      ${m.details ? `<div class="metric-details">${escapeHtml(m.details)}</div>` : ''}
      ${actionHtml}
    </div>
  `;
}

function renderOwaspBreakdown(issues: OwaspIssueSummary[]): string {
  if (issues.length === 0) { return ''; }

  return `
    <div class="section-header">OWASP Issue Breakdown</div>
    <div class="owasp-list">
      ${issues.map(i => `
        <div class="owasp-row">
          <span class="owasp-label">${escapeHtml(i.category.split('_')[0].toUpperCase())}</span>
          <span class="owasp-name">${escapeHtml(i.displayName)}</span>
          <span class="owasp-count">${i.openCount} open</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSdlcCompleteness(items: SdlcCompletenessItem[]): string {
  if (items.length === 0) { return ''; }

  const present = items.filter(i => i.present).length;
  const pct = Math.round((present / items.length) * 100);
  const allPresent = present === items.length;

  const collapsed = state.sdlcCollapsed;
  const chevron = collapsed ? '›' : '˅';

  const header = `
    <div class="section-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <button class="mi-collapse" id="sdlc-collapse" title="${collapsed ? 'Expand' : 'Collapse'}">${chevron}</button>
      <span>SDLC Completeness</span>
      <div class="sdlc-progress" style="flex: 1; margin: 0;">
        <div class="sdlc-bar"><div class="sdlc-fill" style="width: ${pct}%;"></div></div>
        <span class="sdlc-pct">${present}/${items.length} (${pct}%)</span>
      </div>
    </div>`;

  if (collapsed) {
    return header;
  }

  return `
    ${header}
    <div class="sdlc-list">
      ${items.map(i => `
        <div class="sdlc-row">
          <span class="sdlc-check">${i.present ? '&#x2705;' : '&#x274C;'}</span>
          <span>${escapeHtml(i.label)}</span>
          <span class="sdlc-path">${escapeHtml(i.path)}</span>
        </div>
      `).join('')}
      ${!allPresent ? `<div style="margin-top: 10px;">
        <button id="btn-scaffold" class="btn-secondary" style="font-size: 12px; padding: 6px 14px;">Run Scaffold to add missing files</button>
      </div>` : ''}
    </div>
  `;
}

function renderScoreHistory(): string {
  if (state.history.length === 0) { return ''; }

  const recent = state.history.slice(-5).reverse();

  const rows = recent.map(snap => {
    const date = new Date(snap.timestamp);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const gradeClass = snap.grade === '?' ? 'grade-unknown' : `grade-${snap.grade}`;
    return `
      <div class="history-row">
        <span class="history-score">${snap.compositeScore}/100</span>
        <span class="history-grade ${gradeClass}">${snap.grade}</span>
        <span class="history-date">${escapeHtml(dateStr)}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="section-header">Score History</div>
    <div class="history-list">${rows}</div>
  `;
}

function renderQuickActions(repoUrl: string): string {
  return `
    <div class="quick-actions">
      ${repoUrl ? `<button id="btn-open-repo" class="btn-secondary">Open Repository</button>` : ''}
    </div>
  `;
}

// ============================================================================
// Settings View
// ============================================================================

function renderSettingsView(): string {
  const repoLabel = state.repo
    ? `${state.repo.owner}/${state.repo.repo}`
    : state.data?.repo
    ? `${state.data.repo.owner}/${state.data.repo.repo}`
    : 'No repository detected';

  return `
    <div class="scorecard-header">
      <div class="header-left">
        ${CHESHIRE_SVG}
        <div>
          <h1>Security Scorecard</h1>
          <p>${escapeHtml(repoLabel)}</p>
        </div>
        <button id="btn-settings-gear" class="settings-gear" title="Back to Scorecard" style="color: var(--accent);">&#x2699;</button>
      </div>
    </div>
    <div class="settings-panel">
      <div class="settings-header">
        <button id="btn-back-from-settings" class="btn-ghost">&larr; Back to Scorecard</button>
        <h2>Settings</h2>
      </div>
      ${renderSettingsAliceWorkflow()}
      ${renderSettingsCodeqlAutoAssign()}
      ${renderSettingsLlmModel()}
    </div>
  `;
}

function renderSettingsCodeqlAutoAssign(): string {
  const v = state.settingsAutoAssignAlice;
  const checked = v === true ? 'checked' : '';
  const disabled = v === 'unknown' ? 'disabled' : '';
  const statusText = v === 'unknown'
    ? 'Reading repo setting…'
    : (v === true
        ? 'On — new CodeQL findings are dispatched to Alice automatically.'
        : 'Off — findings are filed unassigned; assign Alice from the issue list.');
  return `
    <div class="settings-section">
      <h3>CodeQL Auto-Assign</h3>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
        Sets the <code style="font-size: 11px; padding: 1px 4px; background: var(--bg-input); border-radius: 3px;">AUTO_ASSIGN_ALICE</code> repository Actions variable that <code style="font-size: 11px; padding: 1px 4px; background: var(--bg-input); border-radius: 3px;">codeql-to-issues.yml</code> reads. Off by default. Requires Actions write / admin on the repo.
      </p>
      <div class="settings-row" style="justify-content: flex-start; gap: 10px;">
        <label class="mi-switch">
          <input type="checkbox" id="toggle-auto-assign-alice" ${checked} ${disabled}>
          <span>Auto-assign Alice to new CodeQL findings</span>
        </label>
      </div>
      <p style="font-size: 11px; color: var(--text-secondary); margin: 4px 0 0;">${statusText}</p>
    </div>
  `;
}

function renderSettingsAliceWorkflow(): string {
  const statusLabel = deployStatusBadge(state.settingsAliceWorkflowExists);

  const buttonLabel = state.settingsAliceWorkflowExists ? 'Redeploy Agent' : 'Deploy Agent';
  const buttonClass = state.settingsAliceWorkflowExists ? 'btn-secondary' : 'btn-primary';

  return `
    <div class="settings-section">
      <h3>Alice (Maintenance Agent)</h3>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
        Deploys the <code style="font-size: 11px; padding: 1px 4px; background: var(--bg-input); border-radius: 3px;">.github/agents/alice-maintenance-agent.agent.md</code> persona — a custom Copilot agent that takes on maintenance issues (CodeQL findings, coverage, complexity, tech-debt) dispatched by name. Governed by the baked Red Queen policy; no API key required.
      </p>
      <div class="settings-row">
        <div class="settings-label">Status</div>
        <div>${statusLabel}</div>
      </div>
      <div class="settings-row" style="justify-content: flex-start;">
        <button id="btn-deploy-alice" class="${buttonClass}">${buttonLabel}</button>
      </div>
    </div>
  `;
}

function renderSettingsLlmModel(): string {
  const models = state.availableModels;
  const current = state.settingsPreferredModel || 'gpt-4o';

  let options = '';
  if (models.length > 0) {
    const seen = new Set<string>();
    for (const m of models) {
      if (!seen.has(m.family)) {
        seen.add(m.family);
        const selected = m.family === current ? ' selected' : '';
        options += `<option value="${escapeHtml(m.family)}"${selected}>${escapeHtml(m.name)} (${escapeHtml(m.vendor)})</option>`;
      }
    }
  } else {
    const fallbacks = ['gpt-4o', 'gpt-4', 'codex', 'claude-sonnet'];
    options = fallbacks.map(f =>
      `<option value="${f}"${f === current ? ' selected' : ''}>${f}</option>`
    ).join('');
  }

  return `
    <div class="settings-section">
      <h3>LLM Model</h3>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
        Preferred VS Code Language Model for AI-assisted features like issue generation, threat modeling, and coverage analysis.
      </p>
      <div class="settings-row">
        <div class="settings-label">Preferred Model</div>
        <select id="settings-model-select" class="settings-select">${options}</select>
      </div>
      <div class="settings-row" style="justify-content: flex-start;">
        <button id="btn-save-model-pref" class="btn-primary">Save Preference</button>
      </div>
    </div>
  `;
}

function attachSettingsGear() {
  document.getElementById('btn-settings-gear')?.addEventListener('click', () => {
    state.view = 'settings';
    state.settingsAliceWorkflowExists = null;
    state.settingsAutoAssignAlice = 'unknown';
    vscode.postMessage({ type: 'checkAliceWorkflowStatus' });
    vscode.postMessage({ type: 'listModels' });
    vscode.postMessage({ type: 'getAutoAssignAlice' });
    render();
  });
}

function attachSettingsEvents() {
  // Back to scorecard
  document.getElementById('btn-back-from-settings')?.addEventListener('click', () => {
    state.view = 'scorecard';
    render();
  });

  // Gear button on settings page toggles back
  document.getElementById('btn-settings-gear')?.addEventListener('click', () => {
    state.view = 'scorecard';
    render();
  });

  // Deploy the Alice maintenance-agent persona
  document.getElementById('btn-deploy-alice')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'deployAliceWorkflow' });
  });

  // CodeQL auto-assign toggle → set the AUTO_ASSIGN_ALICE repo variable.
  document.getElementById('toggle-auto-assign-alice')?.addEventListener('change', (e) => {
    const enabled = (e.currentTarget as HTMLInputElement).checked;
    state.settingsAutoAssignAlice = 'unknown'; // pending — host re-reads + confirms
    render();
    vscode.postMessage({ type: 'setAutoAssignAlice', enabled });
  });

  // Save model preference
  document.getElementById('btn-save-model-pref')?.addEventListener('click', () => {
    const select = document.getElementById('settings-model-select') as HTMLSelectElement;
    if (select) {
      vscode.postMessage({ type: 'savePreferredModel', family: select.value });
    }
  });
}

// ============================================================================
// Event Handlers
// ============================================================================

function attachRefresh() {
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'refresh' });
  });
}

function attachPmatInstall() {
  document.getElementById('btn-install-pmat')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'installPmat' });
  });
}

function attachActions() {
  document.getElementById('btn-scaffold')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'openScaffold' });
  });

  document.getElementById('sdlc-collapse')?.addEventListener('click', () => {
    state.sdlcCollapsed = !state.sdlcCollapsed;
    render();
  });

  document.getElementById('btn-open-repo')?.addEventListener('click', () => {
    const d = state.data;
    if (d?.repo) {
      vscode.postMessage({ type: 'openUrl', url: `https://github.com/${d.repo.owner}/${d.repo.repo}` });
    }
  });

  document.getElementById('btn-resync-governance')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-resync-governance') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'Resyncing...'; }
    vscode.postMessage({ type: 'resyncGovernance' });
  });

  document.getElementById('btn-link-to-bar')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-link-to-bar') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'Deploying...'; }
    vscode.postMessage({ type: 'resyncGovernance' });
  });
}

function attachCreateFeature() {
  document.getElementById('btn-create-feature')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'createFeature' });
  });
}

function attachSyncBanner() {
  document.getElementById('btn-sync-repo')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-sync-repo') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'Pulling...'; }
    vscode.postMessage({ type: 'syncRepo' });
  });
  document.getElementById('btn-push-repo')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-push-repo') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'Pushing...'; }
    vscode.postMessage({ type: 'pushRepo' });
  });
  document.getElementById('btn-commit-push')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-commit-push') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'Committing...'; }
    vscode.postMessage({ type: 'commitAndPush' });
  });
}

function attachFolderSelect() {
  const select = document.getElementById('folder-select') as HTMLSelectElement | null;
  select?.addEventListener('change', () => {
    state.selectedFolder = select.value;
    vscode.postMessage({ type: 'switchFolder', folderPath: select.value });
  });
}

// attachActiveIssue removed — replaced by attachAgentStatusListeners() from agentStatus.ts

function attachMetricActions() {
  document.querySelectorAll('.btn-metric-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      const action = el.dataset.action;
      const url = el.dataset.url;

      if (action === 'openUrl' && url) {
        vscode.postMessage({ type: 'openUrl', url });
      } else if (action) {
        vscode.postMessage({ type: action });
      }
    });
  });
}

// ============================================================================
// Helpers
// ============================================================================

function trendIndicator(direction: TrendDirection): string {
  switch (direction) {
    case 'improving': return '<span class="trend-up" title="Improving">&#9650;</span>';
    case 'declining': return '<span class="trend-down" title="Declining">&#9660;</span>';
    case 'stable': return '<span class="trend-stable" title="Stable">&#8212;</span>';
    case 'new': return '';
  }
}

// ============================================================================
// Message Handling
// ============================================================================

// Inline-section messages (Rabbit Hole sheet + maintenance-issues list), kept
// out of the main switch so its cyclomatic complexity stays within budget.
// Returns true when handled.
function handleRabbitHoleMessage(message: { type: string; [k: string]: unknown }): boolean {
  if (message.type === 'openRabbitHole') {
    state.rabbitHole = {
      taskKind: message.taskKind as string,
      heading: message.heading as string,
      description: message.description as string,
      packLabels: (message.packLabels as string[]) || [],
      phase: 'input',
      editing: false,
      previewTitle: '',
      previewBody: '',
      issueUrl: '',
      issueNumber: 0,
    };
    state.errorMessage = '';
    render();
    scrollRabbitHoleIntoView();
    return true;
  }
  if (message.type === 'rctroPreview' && state.rabbitHole) {
    state.rabbitHole.phase = 'preview';
    state.rabbitHole.previewTitle = message.title as string;
    state.rabbitHole.previewBody = message.body as string;
    render();
    scrollRabbitHoleIntoView();
    return true;
  }
  if (message.type === 'rabbitHoleDispatched' && state.rabbitHole) {
    state.rabbitHole.phase = 'done';
    state.rabbitHole.issueUrl = message.url as string;
    state.rabbitHole.issueNumber = message.number as number;
    // Optimistically surface the new issue immediately — GitHub's list API can
    // lag a freshly-created issue, so prepend it now; the host's onLoadIssues
    // reconciles when the API catches up.
    const num = message.number as number;
    if (num && !state.issues.some(i => i.number === num)) {
      state.issues.unshift({
        number: num,
        title: state.rabbitHole.previewTitle || state.rabbitHole.heading,
        state: 'open',
        labels: [],
        assignee: 'Copilot',
        updatedAt: '',
        commentsCount: 0,
        url: message.url as string,
      });
      state.issuesLoaded = true;
    }
    render();
    return true;
  }
  if (message.type === 'issuesLoaded') {
    state.issues = (message.issues as ScorecardIssue[]) || [];
    state.issueFilter = (message.filter as 'open' | 'all') || 'open';
    state.issuesLoaded = true;
    state.assigningIssue = null;
    render();
    return true;
  }
  if (message.type === 'autoAssignAliceStatus') {
    const e = message.enabled as boolean | null;
    state.settingsAutoAssignAlice = e === null ? 'unknown' : e;
    if (state.view === 'settings') { render(); }
    return true;
  }
  if (message.type === 'breakGlassStatus') {
    state.breakGlassGrants = (message.grants as BreakGlassGrant[]) || [];
    render();
    return true;
  }
  return false;
}

// On any error, un-stick a busy Rabbit Hole sheet so the user can retry.
function unstickRabbitHoleOnError(): void {
  if (!state.rabbitHole) { return; }
  if (state.rabbitHole.phase === 'generating') { state.rabbitHole.phase = 'input'; }
  else if (state.rabbitHole.phase === 'dispatching') { state.rabbitHole.phase = 'preview'; }
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.origin) { return; }
  const message = event.data;
  if (handleRabbitHoleMessage(message)) { return; }

  switch (message.type) {
    case 'scorecardData':
      state.data = message.data;
      state.isLoading = false;
      state.errorMessage = '';
      render();
      break;

    case 'loading':
      state.isLoading = message.active;
      if (message.message) { state.loadingMessage = message.message; }
      if (state.data) {
        // Already have data — just toggle refresh button state
        const btn = document.getElementById('btn-refresh') as HTMLButtonElement | null;
        if (btn) { btn.disabled = message.active; }
      } else {
        render();
      }
      break;

    case 'error':
      state.errorMessage = message.message;
      state.isLoading = false;
      unstickRabbitHoleOnError();
      render();
      break;

    case 'repoDetected':
      state.repo = message.repo;
      break;

    case 'pmatStatusUpdate':
      if (state.data) {
        state.data.pmatInstalled = message.installed;
        render();
      }
      break;

    case 'historyData':
      state.history = message.history;
      state.trends = message.trends;
      render();
      break;

    case 'techStackInfo':
      state.packageManager = message.packageManager;
      state.testing = message.testing;
      break;

    // Settings messages
    case 'aliceWorkflowStatus':
      state.settingsAliceWorkflowExists = message.exists;
      if (state.view === 'settings') { render(); }
      break;

    case 'aliceWorkflowDeployed':
      state.settingsAliceWorkflowExists = true;
      if (state.view === 'settings') { render(); }
      break;

    case 'availableModels':
      state.availableModels = message.models;
      if (!state.settingsPreferredModel) {
        state.settingsPreferredModel = message.defaultFamily || 'gpt-4o';
      }
      if (state.view === 'settings') { render(); }
      break;

    case 'preferredModelSaved':
      state.settingsPreferredModel = message.family;
      if (state.view === 'settings') { render(); }
      break;

    case 'workspaceFolders':
      state.workspaceFolders = message.folders;
      if (message.selectedPath) {
        state.selectedFolder = message.selectedPath;
      } else if (!state.selectedFolder && message.folders.length > 0) {
        state.selectedFolder = message.folders[0].path;
      }
      render();
      break;

    case 'agentStatusUpdate':
      state.agentStatus = (message as { type: 'agentStatusUpdate'; status: AgentStatusInfo | null }).status;
      render();
      break;

    case 'syncStatus':
      state.syncStatus = { behind: message.behind, ahead: message.ahead, branch: message.branch, dirty: message.dirty };
      render();
      break;

    case 'repoSynced':
      // syncStatus will be updated by the subsequent syncStatus message
      break;

    case 'governanceData':
      state.governanceData = message.data;
      state.detectedBar = (message as { detectedBar?: { barName: string; barPath: string } | null }).detectedBar || null;
      render();
      break;
  }
});

// ============================================================================
// Initialize
// ============================================================================

vscode.postMessage({ type: 'ready' });
vscode.postMessage({ type: 'loadBreakGlass' });
render();
