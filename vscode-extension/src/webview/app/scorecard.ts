// Scorecard webview frontend — renders Security Scorecard dashboard
import { renderAgentStatus, attachAgentStatusListeners, getAgentStatusStyles } from './agentStatus';
import type { AgentStatusInfo } from './agentStatus';
import { escapeHtml, escapeAttr, formatTimestamp } from './pillars/shared';
import { deployStatusBadge } from './components/html';
import type { VsCodeApi, MetricStatus, HealthGrade, MetricResult, SdlcCompletenessItem, OwaspIssueSummary, ScorecardData, ScorecardSnapshot, TrendDirection } from './types';

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

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
  // Workspace folders
  workspaceFolders: [] as { name: string; path: string }[],
  selectedFolder: '',
  // Unified agent status (replaces activeIssue)
  agentStatus: null as AgentStatusInfo | null,
  // Repo sync status
  syncStatus: null as { behind: number; ahead: number; branch: string; dirty?: boolean } | null,
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
            <p>${state.repo ? `${state.repo.owner}/${state.repo.repo}` : 'Detecting repository...'}</p>
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
            <p>${state.repo ? `${state.repo.owner}/${state.repo.repo}` : 'No repository detected'}</p>
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
  const repoLabel = d.repo ? `${d.repo.owner}/${d.repo.repo}` : 'No repository detected';
  const repoUrl = d.repo ? `https://github.com/${d.repo.owner}/${d.repo.repo}` : '';

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

    ${renderAgentStatus(state.agentStatus)}
    ${renderSyncBanner()}
    ${renderCreateFeatureBanner()}
    ${renderPmatBanner(d)}
    ${renderGradeCard(d)}
    ${renderMetricsGrid(d)}
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
  attachAgentStatusListeners((msg) => vscode.postMessage(msg));
  attachSettingsGear();
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
        <span style="font-size: 18px;">&#x1F407;</span>
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

  return `
    <div class="section-header">SDLC Completeness</div>
    <div class="sdlc-list">
      <div class="sdlc-progress">
        <div class="sdlc-bar">
          <div class="sdlc-fill" style="width: ${pct}%;"></div>
        </div>
        <span class="sdlc-pct">${present}/${items.length} (${pct}%)</span>
      </div>
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
      ${renderSettingsLlmModel()}
      ${renderSettingsSecrets()}
    </div>
  `;
}

function renderSettingsAliceWorkflow(): string {
  const statusLabel = deployStatusBadge(state.settingsAliceWorkflowExists);

  const buttonLabel = state.settingsAliceWorkflowExists ? 'Redeploy Workflow' : 'Deploy Workflow';
  const buttonClass = state.settingsAliceWorkflowExists ? 'btn-secondary' : 'btn-primary';

  return `
    <div class="settings-section">
      <h3>Alice Remediation Workflow</h3>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
        The <code style="font-size: 11px; padding: 1px 4px; background: var(--bg-input); border-radius: 3px;">alice-remediation.yml</code> GitHub Action enables AI-powered issue remediation.
        Comment <code style="font-size: 11px; padding: 1px 4px; background: var(--bg-input); border-radius: 3px;">@claude</code> on an issue to trigger analysis and implementation.
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

function renderSettingsSecrets(): string {
  const repoLabel = state.repo ? `${state.repo.owner}/${state.repo.repo}` : 'selected repository';
  return `
    <div class="settings-section">
      <h3>Repository Secrets</h3>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
        Configure API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY) as GitHub repository secrets on <strong>${escapeHtml(repoLabel)}</strong>.
        Required for AI-powered workflows like Alice Remediation.
      </p>
      <div class="settings-row" style="justify-content: flex-start;">
        <button id="btn-configure-secrets" class="btn-primary">Configure Secrets</button>
      </div>
    </div>
  `;
}

function attachSettingsGear() {
  document.getElementById('btn-settings-gear')?.addEventListener('click', () => {
    state.view = 'settings';
    state.settingsAliceWorkflowExists = null;
    vscode.postMessage({ type: 'checkAliceWorkflowStatus' });
    vscode.postMessage({ type: 'listModels' });
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

  // Deploy alice-remediation workflow
  document.getElementById('btn-deploy-alice')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'deployAliceWorkflow' });
  });

  // Save model preference
  document.getElementById('btn-save-model-pref')?.addEventListener('click', () => {
    const select = document.getElementById('settings-model-select') as HTMLSelectElement;
    if (select) {
      vscode.postMessage({ type: 'savePreferredModel', family: select.value });
    }
  });

  // Configure repository secrets
  document.getElementById('btn-configure-secrets')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'configureSecrets' });
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

  document.getElementById('btn-open-repo')?.addEventListener('click', () => {
    const d = state.data;
    if (d?.repo) {
      vscode.postMessage({ type: 'openUrl', url: `https://github.com/${d.repo.owner}/${d.repo.repo}` });
    }
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

window.addEventListener('message', (event) => {
  const message = event.data;

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
  }
});

// ============================================================================
// Initialize
// ============================================================================

vscode.postMessage({ type: 'ready' });
render();
