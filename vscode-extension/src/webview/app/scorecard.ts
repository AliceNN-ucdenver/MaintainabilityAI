// Scorecard webview frontend — renders Security Scorecard dashboard

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

// ============================================================================
// Types (mirrored from extension types)
// ============================================================================

type MetricStatus = 'green' | 'yellow' | 'red' | 'unknown' | 'loading';
type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F' | '?';

interface MetricResult {
  status: MetricStatus;
  label: string;
  value: string;
  score: number;
  details?: string;
  lastUpdated: string;
}

interface SdlcCompletenessItem {
  label: string;
  present: boolean;
  path: string;
}

interface OwaspIssueSummary {
  category: string;
  displayName: string;
  openCount: number;
}

interface ScorecardData {
  grade: HealthGrade;
  compositeScore: number;
  metrics: {
    securityCompliance: MetricResult;
    dependencyFreshness: MetricResult;
    testCoverage: MetricResult;
    complexity: MetricResult;
    technicalDebt: MetricResult;
    cicdHealth: MetricResult;
  };
  sdlcCompleteness: SdlcCompletenessItem[];
  owaspIssues: OwaspIssueSummary[];
  pmatInstalled: boolean;
  repo: { owner: string; repo: string } | null;
  lastRefreshed: string;
}

interface ScorecardSnapshot {
  timestamp: string;
  compositeScore: number;
  grade: HealthGrade;
  metrics: Record<string, number>;
}

type TrendDirection = 'improving' | 'stable' | 'declining' | 'new';

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

// ============================================================================
// Rendering
// ============================================================================

function render() {
  if (state.isLoading && !state.data) {
    rootEl.innerHTML = `
      <div class="scorecard-header">
        <div class="header-left">
          ${CHESHIRE_SVG}
          <div>
            <h1>Security Scorecard</h1>
            <p>${state.repo ? `${state.repo.owner}/${state.repo.repo}` : 'Detecting repository...'}</p>
          </div>
        </div>
      </div>
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>${escapeHtml(state.loadingMessage)}</p>
      </div>
    `;
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
        </div>
        <div class="header-right">
          <button id="btn-refresh" class="btn-secondary btn-icon" title="Refresh">&#x21BB;</button>
        </div>
      </div>
      <div class="error-msg">${escapeHtml(state.errorMessage)}</div>
    `;
    attachRefresh();
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
      </div>
      <div class="header-right">
        <span class="last-refreshed">${formatTimestamp(d.lastRefreshed)}</span>
        <button id="btn-refresh" class="btn-secondary btn-icon" title="Refresh" ${state.isLoading ? 'disabled' : ''}>&#x21BB;</button>
      </div>
    </div>

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
    vscode.postMessage({ type: 'runCommand', command: 'maintainabilityai.scaffoldRepo' });
  });

  document.getElementById('btn-open-repo')?.addEventListener('click', () => {
    const d = state.data;
    if (d?.repo) {
      vscode.postMessage({ type: 'openUrl', url: `https://github.com/${d.repo.owner}/${d.repo.repo}` });
    }
  });
}

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

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) { return 'just now'; }
  if (diffMin < 60) { return `${diffMin}m ago`; }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) { return `${diffHr}h ago`; }
  return d.toLocaleDateString();
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
  }
});

// ============================================================================
// Initialize
// ============================================================================

vscode.postMessage({ type: 'ready' });
render();
