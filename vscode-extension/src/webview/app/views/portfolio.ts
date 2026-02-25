// ============================================================================
// Portfolio — Portfolio-level render functions, filters, and event handlers
// Extracted from lookingGlass.ts (Phase 6 decomposition)
// Stateless renderers: state slices passed as parameters, callbacks for mutations
// ============================================================================

import { escapeHtml, escapeAttr } from '../pillars/shared';
import type {
  VsCodeApi, BarSummary, PlatformSummary, PortfolioSummary,
  GovernancePillarScore, GovernanceTrend, GovernanceScoreSnapshot,
  ReviewRecord, GitSyncStatus,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export interface TopFindingsState {
  topFindingsLoading: boolean;
  topFindingsProgress: string;
  topFindingsProgressPct: number;
  topFindingsSummary: { architecture: string[]; security: string[]; informationRisk: string[]; operations: string[] } | null;
  topFindingsExpanded: boolean;
}

export interface GovernanceHistoryState {
  scoreHistory: GovernanceScoreSnapshot[];
  scoreTrend: GovernanceTrend;
}

// ============================================================================
// Helpers
// ============================================================================

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) { return 'today'; }
  if (days === 1) { return 'yesterday'; }
  if (days < 30) { return `${days}d ago`; }
  if (days < 365) { return `${Math.floor(days / 30)}mo ago`; }
  return `${Math.floor(days / 365)}y ago`;
}

export function getFilteredBars(
  bars: BarSummary[],
  barFilter: 'all' | 'needs-attention' | 'warnings',
  searchQuery: string,
): BarSummary[] {
  let filtered = bars;

  // Apply filter
  if (barFilter === 'needs-attention') {
    filtered = filtered.filter(b =>
      b.architecture.status === 'failing' ||
      b.security.status === 'failing' ||
      b.infoRisk.status === 'failing' ||
      b.operations.status === 'failing' ||
      b.pendingDecisions > 0
    );
  } else if (barFilter === 'warnings') {
    filtered = filtered.filter(b =>
      b.architecture.status === 'warning' ||
      b.security.status === 'warning' ||
      b.infoRisk.status === 'warning' ||
      b.operations.status === 'warning'
    );
  }

  // Apply search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(b =>
      b.name.toLowerCase().includes(query) ||
      b.id.toLowerCase().includes(query) ||
      b.platformName.toLowerCase().includes(query)
    );
  }

  return filtered;
}

export function getPillarByKey(bar: BarSummary, key: string): GovernancePillarScore | null {
  switch (key) {
    case 'architecture': return bar.architecture;
    case 'security': return bar.security;
    case 'information-risk': return bar.infoRisk;
    case 'operations': return bar.operations;
    default: return null;
  }
}

// ============================================================================
// Render — Portfolio Header
// ============================================================================

export function renderPortfolioHeader(
  p: PortfolioSummary,
  lookingGlassSvg: string,
  searchQuery: string,
  isLoading: boolean,
  meshRepo?: string,
): string {
  const repoLabel = meshRepo ? `<p class="lg-repo-label">${escapeHtml(meshRepo)}</p>` : '';
  return `
    <div class="breadcrumb">
      <span>${escapeHtml(p.portfolio.org || p.portfolio.name)}</span>
    </div>
    <div class="lg-header">
      <div class="lg-header-left">
        ${lookingGlassSvg}
        <div>
          <h1>Looking Glass</h1>
          ${repoLabel}
        </div>
        <span class="portfolio-badge">${escapeHtml(p.portfolio.id)}</span>
        <button id="btn-settings-gear" class="settings-gear" title="Settings">&#x2699;</button>
      </div>
      <div class="lg-header-right">
        <input type="text" class="search-input" id="search-input" placeholder="Search..." value="${escapeAttr(searchQuery)}" />
        <button id="btn-sample-platform" class="btn-secondary" title="Create sample Insurance Operations platform with Claims Processing BAR using CALM artifacts">Sample Platform</button>
        <button id="btn-scan-org" class="btn-secondary">Scan Org</button>
        <button id="btn-refresh" class="btn-secondary btn-icon" title="Refresh" ${isLoading ? 'disabled' : ''}>&#x21BB;</button>
      </div>
    </div>
  `;
}

// ============================================================================
// Render — Summary Cards
// ============================================================================

export function renderSummaryCards(p: PortfolioSummary): string {
  const healthClass = p.portfolioHealth >= 75 ? 'health-good' : p.portfolioHealth >= 50 ? 'health-warn' : 'health-bad';
  const covClass = p.governanceCoverage >= 75 ? 'health-good' : p.governanceCoverage >= 50 ? 'health-warn' : 'health-bad';

  return `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Total BARs</div>
        <div class="value">${p.totalBars}</div>
      </div>
      <div class="summary-card">
        <div class="label">Portfolio Health</div>
        <div class="value ${healthClass}">${p.portfolioHealth}%</div>
      </div>
      <div class="summary-card">
        <div class="label">Pending Decisions</div>
        <div class="value${p.pendingDecisions > 0 ? ' health-warn' : ''}">${p.pendingDecisions}</div>
      </div>
      <div class="summary-card">
        <div class="label">Governance Coverage</div>
        <div class="value ${covClass}">${p.governanceCoverage}%</div>
      </div>
    </div>
  `;
}

// ============================================================================
// Render — Domain Health Bars
// ============================================================================

export function renderDomainHealthBars(bars: BarSummary[]): string {
  if (bars.length === 0) {
    return '<div class="empty-state"><p>No BARs to analyze.</p></div>';
  }

  const domains: { key: keyof Pick<BarSummary, 'architecture' | 'security' | 'infoRisk' | 'operations'>; label: string }[] = [
    { key: 'architecture', label: 'Architecture' },
    { key: 'security', label: 'Security' },
    { key: 'infoRisk', label: 'Info Risk' },
    { key: 'operations', label: 'Operations' },
  ];

  const rows = domains.map(d => {
    let passing = 0, warning = 0, failing = 0, unknown = 0;
    for (const bar of bars) {
      const pillar = bar[d.key];
      if (pillar.status === 'passing') { passing++; }
      else if (pillar.status === 'warning') { warning++; }
      else if (pillar.status === 'failing') { failing++; }
      else { unknown++; }
    }
    const total = bars.length;
    const passPct = total > 0 ? (passing / total) * 100 : 0;
    const warnPct = total > 0 ? (warning / total) * 100 : 0;
    const failPct = total > 0 ? (failing / total) * 100 : 0;
    const unkPct = total > 0 ? (unknown / total) * 100 : 0;

    return `
      <div class="domain-row">
        <div class="domain-row-header">
          <span class="domain-label">${d.label}</span>
          <span class="domain-passing"><span class="pass-count">${passing}</span>/${total} passing</span>
        </div>
        <div class="domain-bar-container">
          ${passPct > 0 ? `<div class="domain-bar-segment passing" style="width: ${passPct}%;" title="${passing} passing"></div>` : ''}
          ${warnPct > 0 ? `<div class="domain-bar-segment warning" style="width: ${warnPct}%;" title="${warning} warning"></div>` : ''}
          ${failPct > 0 ? `<div class="domain-bar-segment failing" style="width: ${failPct}%;" title="${failing} failing"></div>` : ''}
          ${unkPct > 0 ? `<div class="domain-bar-segment unknown" style="width: ${unkPct}%;" title="${unknown} unknown"></div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `<div class="domain-health">${rows}</div>`;
}

// ============================================================================
// Render — Platform Cards
// ============================================================================

export function renderPlatformCards(platforms: PlatformSummary[]): string {
  if (platforms.length === 0) {
    return `<div class="empty-state"><p>No platforms configured.</p><button id="btn-add-platform-empty" class="btn-primary">Add Platform</button></div>`;
  }

  const cards = platforms.map(p => {
    const healthClass = p.compositeHealth >= 75 ? 'good' : p.compositeHealth >= 50 ? 'warn' : 'bad';

    // Compute per-pillar averages across BARs
    const pillarAvgs = computePillarAverages(p.bars);

    return `
      <div class="platform-card" data-platform-id="${escapeAttr(p.id)}">
        <div class="platform-name">${escapeHtml(p.name)}</div>
        <div class="platform-meta">
          <span>${p.barCount} BAR${p.barCount !== 1 ? 's' : ''}</span>
          <span class="platform-health-badge ${healthClass}">${p.compositeHealth}%</span>
        </div>
        ${renderPillarMiniBars(pillarAvgs)}
      </div>
    `;
  }).join('');

  return `<div class="platforms-grid">${cards}</div>`;
}

// ============================================================================
// Render — Pillar Averages & Mini Bars
// ============================================================================

export function computePillarAverages(bars: BarSummary[]): { label: string; abbr: string; score: number }[] {
  if (bars.length === 0) {
    return [
      { label: 'Architecture', abbr: 'ARCH', score: 0 },
      { label: 'Security', abbr: 'SEC', score: 0 },
      { label: 'Info Risk', abbr: 'RISK', score: 0 },
      { label: 'Operations', abbr: 'OPS', score: 0 },
    ];
  }

  const sum = { arch: 0, sec: 0, risk: 0, ops: 0 };
  for (const bar of bars) {
    sum.arch += bar.architecture.score;
    sum.sec += bar.security.score;
    sum.risk += bar.infoRisk.score;
    sum.ops += bar.operations.score;
  }
  const n = bars.length;
  return [
    { label: 'Architecture', abbr: 'ARCH', score: Math.round(sum.arch / n) },
    { label: 'Security', abbr: 'SEC', score: Math.round(sum.sec / n) },
    { label: 'Info Risk', abbr: 'RISK', score: Math.round(sum.risk / n) },
    { label: 'Operations', abbr: 'OPS', score: Math.round(sum.ops / n) },
  ];
}

export function renderPillarMiniBars(pillars: { label: string; abbr: string; score: number }[]): string {
  const bars = pillars.map(p => {
    const color = p.score >= 75 ? 'var(--passing)' : p.score >= 50 ? 'var(--warning)' : 'var(--failing)';
    return `
      <div class="pillar-mini" title="${p.label}: ${p.score}%">
        <span class="pillar-mini-label">${p.abbr}</span>
        <div class="pillar-mini-track">
          <div class="pillar-mini-fill" style="width: ${p.score}%; background: ${color};"></div>
        </div>
        <span class="pillar-mini-score">${p.score}</span>
      </div>
    `;
  }).join('');

  return `<div class="platform-pillars">${bars}</div>`;
}

// ============================================================================
// Render — Filter Chips
// ============================================================================

export function renderFilterChips(barFilter: string): string {
  const chips: { value: 'all' | 'needs-attention' | 'warnings'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'needs-attention', label: 'Needs Attention' },
    { value: 'warnings', label: 'Warnings' },
  ];

  return `
    <div class="filter-chips">
      ${chips.map(c => `
        <span class="filter-chip${barFilter === c.value ? ' active' : ''}" data-filter="${c.value}">${c.label}</span>
      `).join('')}
    </div>
  `;
}

// ============================================================================
// Render — BAR Table
// ============================================================================

export function renderBarTable(
  bars: BarSummary[],
  gitStatus: GitSyncStatus | null,
  needsPush: boolean,
): string {
  if (bars.length === 0) {
    return '<div class="empty-state"><p>No matching applications found.</p></div>';
  }

  const rows = bars.map(bar => {
    // Git sync cell
    let syncCell = '<span style="color: var(--text-dim);">--</span>';
    if (gitStatus?.isGitRepo) {
      const barGs = gitStatus.barStatus[bar.path];
      if (barGs?.isDirty) {
        syncCell = `<span class="sync-dot out-of-sync" title="${barGs.dirtyFileCount} unsaved file${barGs.dirtyFileCount !== 1 ? 's' : ''}">${barGs.dirtyFileCount}</span>`;
      } else if (needsPush) {
        syncCell = '<span class="sync-dot out-of-sync" title="Not pushed to remote">&#x2191;</span>';
      } else {
        syncCell = '<span class="sync-dot synced">&#10003;</span>';
      }
    }

    return `
      <tr class="bar-row" data-bar-path="${escapeAttr(bar.path)}">
        <td class="bar-name">${escapeHtml(bar.name)}</td>
        <td><span class="strategy-badge ${bar.strategy}">${bar.strategy}</span></td>
        <td><span class="crit-badge ${bar.criticality}">${bar.criticality}</span></td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${bar.repoCount}</td>
        <td>${renderPillarInline(bar.architecture)}</td>
        <td>${renderPillarInline(bar.security)}</td>
        <td>${renderPillarInline(bar.infoRisk)}</td>
        <td>${renderPillarInline(bar.operations)}</td>
        <td>${renderDriftBadge(bar)}</td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${bar.adrCount > 0 ? `<span style="color: var(--accent);">${bar.adrCount}</span>` : '<span style="color: var(--text-dim);">0</span>'}</td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${bar.pendingDecisions > 0 ? `<span style="color: var(--warning);">${bar.pendingDecisions}</span>` : '<span style="color: var(--text-dim);">0</span>'}</td>
        <td style="text-align: center;">${syncCell}</td>
      </tr>
    `;
  }).join('');

  return `
    <table class="bar-table">
      <thead>
        <tr>
          <th>Application</th>
          <th>Strategy</th>
          <th>Criticality</th>
          <th>Repos</th>
          <th>Arch</th>
          <th>Security</th>
          <th>Info Risk</th>
          <th>Operations</th>
          <th>Drift</th>
          <th>ADRs</th>
          <th>Decisions</th>
          <th>Sync</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ============================================================================
// Render — Pillar Inline & Drift Badge
// ============================================================================

export function renderPillarInline(pillar: GovernancePillarScore): string {
  return `<span class="pillar-dot ${pillar.status}" title="${pillar.status}"></span><span class="pillar-score-inline">${pillar.score}</span>`;
}

export function renderDriftBadge(bar: BarSummary): string {
  const reviews = bar.reviews;
  if (!reviews || reviews.length === 0) {
    return '<span style="font-size: 11px; color: var(--text-dim);">—</span>';
  }
  const latest = reviews[reviews.length - 1];
  const score = bar.latestDriftScore ?? latest.driftScore;
  const color = score >= 75 ? 'var(--passing)' : score >= 50 ? 'var(--warning)' : 'var(--failing)';
  const issueLink = latest.issueUrl
    ? ` <a class="drift-link" href="#" data-url="${escapeAttr(latest.issueUrl)}" title="Open review #${latest.issueNumber}">#${latest.issueNumber}</a>`
    : '';
  return `<span style="font-family: var(--font-mono); font-size: 11px; color: ${color}; font-weight: 600;">${score}</span>${issueLink}`;
}

// ============================================================================
// Render — App Tile Sync Dot
// ============================================================================

export function renderAppTileSyncDot(
  barPath: string,
  gitStatus: GitSyncStatus | null,
  needsPush: boolean,
): string {
  if (!gitStatus?.isGitRepo) { return ''; }
  const barGs = gitStatus.barStatus[barPath];
  if (barGs?.isDirty) {
    return `<span class="sync-dot out-of-sync" title="${barGs.dirtyFileCount} unsaved">${barGs.dirtyFileCount}</span>`;
  }
  if (needsPush) {
    return '<span class="sync-dot out-of-sync" title="Not pushed to remote">&#x2191;</span>';
  }
  return '<span class="sync-dot synced" title="Synced">&#10003;</span>';
}

// ============================================================================
// Render — App Tile & Grid
// ============================================================================

export function renderAppTile(
  bar: BarSummary,
  gitStatus: GitSyncStatus | null,
  needsPushVal: boolean,
  renderScoreRing: (score: number, size: number, strokeWidth: number) => string,
): string {
  const pillarData = computePillarAverages([bar]);
  return `
    <div class="app-tile" data-bar-path="${escapeAttr(bar.path)}">
      <div class="app-tile-header">
        <div class="app-tile-name">${escapeHtml(bar.name)}</div>
        ${renderAppTileSyncDot(bar.path, gitStatus, needsPushVal)}
        ${renderScoreRing(bar.compositeScore, 36, 4)}
      </div>
      <div class="app-tile-badges">
        <span class="strategy-badge ${bar.strategy}">${bar.strategy}</span>
        <span class="crit-badge ${bar.criticality}">${bar.criticality}</span>
        <span class="lifecycle-badge">${bar.lifecycle}</span>
      </div>
      <div class="app-tile-stats">
        <span><span class="stat-value">${bar.repoCount}</span> repo${bar.repoCount !== 1 ? 's' : ''}</span>
        <span><span class="stat-value">${bar.adrCount}</span> ADR${bar.adrCount !== 1 ? 's' : ''}</span>
        <span><span class="stat-value">${bar.pendingDecisions}</span> decision${bar.pendingDecisions !== 1 ? 's' : ''}</span>
      </div>
      ${renderPillarMiniBars(pillarData)}
    </div>
  `;
}

export function renderAppTileGrid(
  bars: BarSummary[],
  gitStatus: GitSyncStatus | null,
  needsPushVal: boolean,
  renderScoreRing: (score: number, size: number, strokeWidth: number) => string,
): string {
  if (bars.length === 0) {
    return '<div class="empty-state"><p>No applications found.</p></div>';
  }
  return `<div class="app-tile-grid">${bars.map(b => renderAppTile(b, gitStatus, needsPushVal, renderScoreRing)).join('')}</div>`;
}

// ============================================================================
// Render — Application Lens Content
// ============================================================================

export function renderApplicationLensContent(
  p: PortfolioSummary,
  currentPlatformId: string | null,
  barFilter: 'all' | 'needs-attention' | 'warnings',
  searchQuery: string,
  gitStatus: GitSyncStatus | null,
  needsPushVal: boolean,
  renderScoreRing: (score: number, size: number, strokeWidth: number) => string,
): string {
  // If drilled into a platform, show app tiles for that platform
  if (currentPlatformId) {
    return renderApplicationPlatformDrillDown(p, currentPlatformId, barFilter, searchQuery, gitStatus, needsPushVal, renderScoreRing);
  }
  // Top-level: summary + platform cards (no flat BAR table)
  return `
    ${renderSummaryCards(p)}
    <div class="section-header">Governance Domain Health</div>
    ${renderDomainHealthBars(p.allBars)}
    <div class="section-header" style="display: flex; align-items: center; justify-content: space-between;">
      <span>Platforms</span>
      <button id="btn-add-platform" class="btn-primary btn-sm">Add Platform</button>
    </div>
    ${renderPlatformCards(p.platforms)}
  `;
}

// ============================================================================
// Render — Application Platform Drill-Down
// ============================================================================

export function renderApplicationPlatformDrillDown(
  p: PortfolioSummary,
  currentPlatformId: string,
  barFilter: 'all' | 'needs-attention' | 'warnings',
  searchQuery: string,
  gitStatus: GitSyncStatus | null,
  needsPushVal: boolean,
  renderScoreRing: (score: number, size: number, strokeWidth: number) => string,
): string {
  const platform = p.platforms.find(pl => pl.id === currentPlatformId);
  if (!platform) {
    return '<div class="error-msg">Platform not found.</div>';
  }

  const filteredBars = getFilteredBars(platform.bars, barFilter, searchQuery);
  const healthClass = platform.compositeHealth >= 75 ? 'health-good' : platform.compositeHealth >= 50 ? 'health-warn' : 'health-bad';
  const orgName = p.portfolio.org || p.portfolio.name;

  return `
    <div class="app-lens-breadcrumb">
      <a id="app-lens-breadcrumb-back">${escapeHtml(orgName)}</a>
      <span class="sep">&rsaquo;</span>
      <span>${escapeHtml(platform.name)}</span>
    </div>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Applications</div>
        <div class="value">${platform.barCount}</div>
      </div>
      <div class="summary-card">
        <div class="label">Platform Health</div>
        <div class="value ${healthClass}">${platform.compositeHealth}%</div>
      </div>
    </div>
    <div class="section-header">Governance Domain Health</div>
    ${renderDomainHealthBars(platform.bars)}
    <div class="section-header" style="display: flex; align-items: center; justify-content: space-between;">
      <span>Applications</span>
      <button id="btn-create-bar" class="btn-primary btn-sm">Add Application</button>
    </div>
    ${renderFilterChips(barFilter)}
    ${renderAppTileGrid(filteredBars, gitStatus, needsPushVal, renderScoreRing)}
  `;
}

// ============================================================================
// Render — Design Drift Indicator
// ============================================================================

export function renderDriftIndicator(
  bar: BarSummary,
  topFindingsState: TopFindingsState,
): string {
  const reviews = bar.reviews;
  const reviewBtn = `<button class="btn-ghost btn-sm drift-review-btn" id="btn-oraculum-review" data-bar-path="${escapeAttr(bar.path)}" title="Run architecture review with Oraculum">&#128302; Review</button>`;

  if (!reviews || reviews.length === 0) {
    return `
      <div class="drift-indicator drift-no-reviews">
        <span class="drift-score-ring drift-gray">--</span>
        <div class="drift-info">
          <span class="drift-label">No Reviews</span>
        </div>
        ${reviewBtn}
      </div>
    `;
  }

  const score = bar.latestDriftScore ?? reviews[reviews.length - 1].driftScore;
  const colorClass = score >= 75 ? 'drift-green' : score >= 50 ? 'drift-yellow' : 'drift-red';
  const label = score >= 75 ? 'Low Drift' : score >= 50 ? 'Moderate Drift' : 'High Drift';

  const topFindingsBtn = `<button class="btn-ghost btn-sm drift-review-btn" id="btn-top-findings" data-bar-path="${escapeAttr(bar.path)}" title="Summarize top findings from latest review" ${topFindingsState.topFindingsLoading ? 'disabled' : ''}>${topFindingsState.topFindingsLoading ? '&#8987;' : '&#127913;'}</button>`;

  return `
    <div class="drift-indicator-compact">
      <div class="drift-header">
        <div class="drift-score-section">
          <span class="drift-score-ring ${colorClass}">${score}</span>
          <div class="drift-info">
            <span class="drift-label">${label}</span>
            <span class="drift-meta">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="drift-btn-group">
          ${topFindingsBtn}
          ${reviewBtn}
        </div>
      </div>
      ${renderSparklineSvg(reviews)}
      ${renderTopFindingsPanel(topFindingsState)}
    </div>
  `;
}

// ============================================================================
// Render — Drift Listeners
// ============================================================================

export function attachDriftListeners(
  vscode: VsCodeApi,
  getState: () => TopFindingsState,
  setState: (updates: Record<string, unknown>) => void,
  render: () => void,
): void {
  // Oraculum review button
  document.getElementById('btn-oraculum-review')?.addEventListener('click', () => {
    const barPath = document.getElementById('btn-oraculum-review')?.getAttribute('data-bar-path');
    if (barPath) {
      vscode.postMessage({ type: 'openOraculum', barPath });
    }
  });

  // Top findings summary button
  document.getElementById('btn-top-findings')?.addEventListener('click', () => {
    const barPath = document.getElementById('btn-top-findings')?.getAttribute('data-bar-path');
    const s = getState();
    if (barPath && !s.topFindingsLoading) {
      setState({
        topFindingsLoading: true,
        topFindingsProgress: 'Starting...',
        topFindingsProgressPct: 0,
        topFindingsSummary: null,
        topFindingsExpanded: true,
      });
      render();
      vscode.postMessage({ type: 'summarizeTopFindings', barPath });
    }
  });

  // Top findings collapse/expand/dismiss
  document.getElementById('top-findings-collapse')?.addEventListener('click', () => {
    setState({ topFindingsExpanded: false });
    render();
  });
  document.getElementById('top-findings-toggle')?.addEventListener('click', () => {
    setState({ topFindingsExpanded: true });
    render();
  });
  document.getElementById('top-findings-dismiss')?.addEventListener('click', () => {
    setState({ topFindingsSummary: null });
    render();
  });
}

// ============================================================================
// Render — Sparkline SVG (drift reviews)
// ============================================================================

export function renderSparklineSvg(reviews: ReviewRecord[]): string {
  if (reviews.length < 2) { return ''; }

  const w = 200;
  const h = 36;
  const pad = 4;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;

  const points = reviews.map((r, i) => {
    const x = pad + (i / (reviews.length - 1)) * plotW;
    const y = pad + plotH - (r.driftScore / 100) * plotH;
    return { x, y, score: r.driftScore };
  });

  const linePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const latestScore = reviews[reviews.length - 1].driftScore;
  const strokeColor = latestScore >= 75 ? '#22c55e' : latestScore >= 50 ? '#eab308' : '#ef4444';
  const fillColor = latestScore >= 75 ? 'rgba(34,197,94,0.1)' : latestScore >= 50 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)';

  // Area fill polygon: line points + bottom-right + bottom-left
  const areaPoints = linePoints + ` ${(pad + plotW).toFixed(1)},${(pad + plotH).toFixed(1)} ${pad.toFixed(1)},${(pad + plotH).toFixed(1)}`;

  const dots = points.map((p, i) => {
    const r = i === points.length - 1 ? 3 : 1.5;
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${strokeColor}" />`;
  }).join('');

  return `
    <div class="drift-sparkline">
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <polygon points="${areaPoints}" fill="${fillColor}" />
        <polyline points="${linePoints}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
        ${dots}
      </svg>
    </div>
  `;
}

// ============================================================================
// Render — Trend Arrow
// ============================================================================

export function trendArrow(trend: GovernanceTrend): string {
  switch (trend) {
    case 'improving': return '<span class="trend-arrow trend-up" title="Improving">&#8593;</span>';
    case 'declining': return '<span class="trend-arrow trend-down" title="Declining">&#8595;</span>';
    case 'stable':    return '<span class="trend-arrow trend-stable" title="Stable">&#8594;</span>';
    case 'new':       return '';
  }
}

// ============================================================================
// Render — Governance Score Sparkline
// ============================================================================

export function renderGovernanceScoreSparkline(history: GovernanceScoreSnapshot[]): string {
  if (history.length < 2) { return ''; }

  const w = 200;
  const h = 36;
  const pad = 4;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;

  const points = history.map((s, i) => {
    const x = pad + (i / (history.length - 1)) * plotW;
    const y = pad + plotH - (s.composite / 100) * plotH;
    return { x, y, score: s.composite };
  });

  const linePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const latestScore = history[history.length - 1].composite;
  const strokeColor = latestScore >= 75 ? '#22c55e' : latestScore >= 50 ? '#eab308' : '#ef4444';
  const fillColor = latestScore >= 75 ? 'rgba(34,197,94,0.1)' : latestScore >= 50 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)';
  const areaPoints = linePoints + ` ${(pad + plotW).toFixed(1)},${(pad + plotH).toFixed(1)} ${pad.toFixed(1)},${(pad + plotH).toFixed(1)}`;

  const dots = points.map((p, i) => {
    const r = i === points.length - 1 ? 3 : 1.5;
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${strokeColor}" />`;
  }).join('');

  return `
    <div class="governance-sparkline">
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <polygon points="${areaPoints}" fill="${fillColor}" />
        <polyline points="${linePoints}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
        ${dots}
      </svg>
    </div>
  `;
}

// ============================================================================
// Render — Governance History Indicator
// ============================================================================

export function renderGovernanceHistoryIndicator(historyState: GovernanceHistoryState): string {
  const history = historyState.scoreHistory;
  if (!history || history.length === 0) { return ''; }

  const latest = history[history.length - 1];
  const colorClass = latest.composite >= 75 ? 'drift-green' : latest.composite >= 50 ? 'drift-yellow' : 'drift-red';

  return `
    <div class="governance-history-section">
      <div class="governance-history-header">
        <div class="governance-history-score-section">
          <span class="drift-score-ring ${colorClass}">${latest.composite}</span>
          <div class="drift-info">
            <span class="drift-label">Score History ${trendArrow(historyState.scoreTrend)}</span>
            <span class="drift-meta">${history.length} snapshot${history.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      ${renderGovernanceScoreSparkline(history)}
    </div>
  `;
}

// ============================================================================
// Render — Top Findings Panel
// ============================================================================

export function renderTopFindingsPanel(s: TopFindingsState): string {
  // Loading state
  if (s.topFindingsLoading) {
    return `
      <div class="top-findings-panel">
        <div class="top-findings-progress">
          <span>${escapeHtml(s.topFindingsProgress)}</span>
        </div>
        <div class="top-findings-progress-bar">
          <div class="top-findings-progress-fill" style="width: ${s.topFindingsProgressPct}%"></div>
        </div>
      </div>
    `;
  }

  if (!s.topFindingsSummary) { return ''; }

  // Collapsed state
  if (!s.topFindingsExpanded) {
    return `
      <div class="top-findings-panel top-findings-collapsed" id="top-findings-toggle">
        &#127913; Top Findings &#9662;
      </div>
    `;
  }

  // Expanded state
  const pillarConfig = [
    { key: 'architecture', icon: '&#128736;', label: 'Architecture' },
    { key: 'security', icon: '&#128274;', label: 'Security' },
    { key: 'informationRisk', icon: '&#128202;', label: 'Information Risk' },
    { key: 'operations', icon: '&#9881;', label: 'Operations' },
  ];

  const summary = s.topFindingsSummary;
  const pillarsHtml = pillarConfig
    .filter(p => {
      const findings = summary[p.key as keyof typeof summary];
      return findings && findings.length > 0;
    })
    .map(p => {
      const findings = summary[p.key as keyof typeof summary] as string[];
      const items = findings.map(f => `<li>${escapeHtml(f)}</li>`).join('');
      return `
        <div class="top-findings-pillar">
          <div class="top-findings-pillar-name">${p.icon} ${p.label}</div>
          <ul class="top-findings-list">${items}</ul>
        </div>
      `;
    })
    .join('');

  return `
    <div class="top-findings-panel">
      <div class="top-findings-header">
        <span class="top-findings-header-title">&#127913; Top Findings</span>
        <div class="top-findings-header-actions">
          <button class="btn-ghost btn-sm" id="top-findings-collapse" title="Collapse">&#9650;</button>
          <button class="btn-ghost btn-sm" id="top-findings-dismiss" title="Dismiss">&times;</button>
        </div>
      </div>
      ${pillarsHtml || '<span style="font-size: 11px; color: var(--vscode-descriptionForeground);">No actionable findings reported.</span>'}
    </div>
  `;
}

// ============================================================================
// Event Handlers
// ============================================================================

export function attachPortfolioEvents(
  vscode: VsCodeApi,
  getState: () => {
    barFilter: string;
    searchQuery: string;
    currentPlatformId: string | null;
  },
  setState: (updates: Record<string, unknown>) => void,
  render: () => void,
): void {
  // Platform card clicks
  document.querySelectorAll('.platform-card').forEach(card => {
    card.addEventListener('click', () => {
      const platformId = (card as HTMLElement).dataset.platformId;
      if (platformId) {
        // Always drill down within the Application Lens
        setState({
          view: 'portfolio',
          activeLens: 'application',
          currentPlatformId: platformId,
          searchQuery: '',
          barFilter: 'all',
          errorMessage: '',
        });
        render();
      }
    });
  });

  // BAR row clicks
  document.querySelectorAll('.bar-row').forEach(row => {
    row.addEventListener('click', () => {
      const barPath = (row as HTMLElement).dataset.barPath;
      if (barPath) {
        vscode.postMessage({ type: 'drillIntoBar', barPath });
      }
    });
  });

  // Drift review links (prevent bubbling to bar-row click)
  document.querySelectorAll('.drift-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const url = (link as HTMLElement).dataset.url;
      if (url) {
        vscode.postMessage({ type: 'openUrl', url });
      }
    });
  });

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = (chip as HTMLElement).dataset.filter as 'all' | 'needs-attention' | 'warnings';
      setState({ barFilter: filter });
      vscode.postMessage({ type: 'filterBars', filter });
      render();
    });
  });

  // Search input
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) {
    let searchTimeout: number | undefined;
    searchInput.addEventListener('input', () => {
      if (searchTimeout) { clearTimeout(searchTimeout); }
      searchTimeout = window.setTimeout(() => {
        setState({ searchQuery: searchInput.value.trim() });
        vscode.postMessage({ type: 'searchBars', query: searchInput.value.trim() });
        render();
        // Restore focus and cursor position after re-render
        const newInput = document.getElementById('search-input') as HTMLInputElement | null;
        if (newInput) {
          newInput.focus();
          newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
        }
      }, 200);
    });
  }

  // App tile clicks -> BAR detail
  document.querySelectorAll('.app-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const barPath = (tile as HTMLElement).dataset.barPath;
      if (barPath) {
        vscode.postMessage({ type: 'drillIntoBar', barPath });
      }
    });
  });

  // Application Lens Platform Breadcrumb Back
  document.getElementById('app-lens-breadcrumb-back')?.addEventListener('click', () => {
    setState({
      currentPlatformId: null,
      searchQuery: '',
      barFilter: 'all',
    });
    render();
  });
}

// ============================================================================
// CSS — Portfolio Styles
// ============================================================================

export function getPortfolioStyles(): string {
  return `
      /* ---- Summary Cards ---- */
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      .summary-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 14px 16px;
      }
      .summary-card .label {
        font-size: 11px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      .summary-card .value {
        font-size: 24px;
        font-weight: 600;
        font-family: var(--font-mono);
        color: var(--text);
      }
      .summary-card .value.health-good { color: var(--passing); }
      .summary-card .value.health-warn { color: var(--warning); }
      .summary-card .value.health-bad { color: var(--failing); }

      /* ---- Section Headers ---- */
      .section-header {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin: 20px 0 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--border);
      }

      /* ---- Domain Health Bars ---- */
      .domain-health {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 20px;
      }
      .domain-row {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 10px 12px;
      }
      .domain-row-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 6px;
      }
      .domain-label {
        font-size: 12px;
        font-weight: 500;
        color: var(--text);
      }
      .domain-passing {
        font-size: 11px;
        font-family: var(--font-mono);
        color: var(--text-muted);
      }
      .domain-passing .pass-count {
        color: var(--passing);
        font-weight: 600;
      }
      .domain-bar-container {
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        background: var(--surface-raised);
      }
      .domain-bar-segment {
        height: 100%;
        transition: width 0.3s ease;
      }
      .domain-bar-segment.passing { background: var(--passing); }
      .domain-bar-segment.warning { background: var(--warning); }
      .domain-bar-segment.failing { background: var(--failing); }
      .domain-bar-segment.unknown { background: var(--text-dim); }

      /* ---- Platform Cards ---- */
      .platforms-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }
      .platform-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 14px 16px;
        cursor: pointer;
        transition: border-color 0.15s, transform 0.1s;
      }
      .platform-card:hover {
        border-color: var(--accent);
        transform: translateY(-1px);
      }
      .platform-card .platform-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 8px;
      }
      .platform-card .platform-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .platform-card .platform-meta span {
        font-size: 12px;
        color: var(--text-muted);
      }
      .platform-health-badge {
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 10px;
      }
      .platform-health-badge.good { background: rgba(63, 185, 80, 0.15); color: var(--passing); }
      .platform-health-badge.warn { background: rgba(210, 153, 34, 0.15); color: var(--warning); }
      .platform-health-badge.bad { background: rgba(248, 81, 73, 0.15); color: var(--failing); }

      .platform-pillars {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 12px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--border);
      }
      .pillar-mini {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        color: var(--text-muted);
      }
      .pillar-mini-label {
        width: 28px;
        flex-shrink: 0;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .pillar-mini-track {
        flex: 1;
        height: 4px;
        background: var(--surface-raised, rgba(255,255,255,0.06));
        border-radius: 2px;
        overflow: hidden;
      }
      .pillar-mini-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
      }
      .pillar-mini-score {
        width: 24px;
        text-align: right;
        font-family: var(--font-mono);
        font-size: 10px;
      }

      /* ---- Filter Chips ---- */
      .filter-chips {
        display: flex;
        gap: 6px;
        margin-bottom: 12px;
      }
      .filter-chip {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 4px 12px;
        font-size: 11px;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.15s;
      }
      .filter-chip:hover { border-color: var(--accent); color: var(--text); }
      .filter-chip.active {
        background: var(--accent-bg);
        border-color: var(--accent);
        color: var(--accent);
      }

      /* ---- BAR Table ---- */
      .bar-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .bar-table thead th {
        text-align: left;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 8px 10px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
      }
      .bar-table tbody tr {
        cursor: pointer;
        transition: background 0.1s;
      }
      .bar-table tbody tr:hover {
        background: var(--surface);
      }
      .bar-table tbody td {
        padding: 10px 10px;
        border-bottom: 1px solid var(--border);
        font-size: 12px;
        vertical-align: middle;
      }
      .bar-table .bar-id {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-dim);
      }
      .bar-table .bar-name {
        font-weight: 500;
        color: var(--text);
      }
      .bar-table .bar-platform {
        color: var(--text-muted);
      }

      /* ---- Criticality Badges ---- */
      .crit-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding: 2px 8px;
        border-radius: 10px;
      }
      .crit-badge.critical { background: rgba(248, 81, 73, 0.15); color: var(--critical-color); }
      .crit-badge.high { background: rgba(210, 153, 34, 0.15); color: var(--high-color); }
      .crit-badge.medium { background: rgba(139, 148, 158, 0.15); color: var(--medium-color); }
      .crit-badge.low { background: rgba(110, 118, 129, 0.15); color: var(--low-color); }

      /* ---- Lifecycle Badges ---- */
      .lifecycle-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 10px;
        background: var(--surface-raised);
        color: var(--text-muted);
        border: 1px solid var(--border);
      }

      /* ---- Strategy Badges (REAP) ---- */
      .strategy-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding: 2px 8px;
        border-radius: 10px;
      }
      .strategy-badge.reassess { background: rgba(88, 166, 255, 0.15); color: #58a6ff; }
      .strategy-badge.extract  { background: rgba(210, 153, 34, 0.15); color: #d29922; }
      .strategy-badge.advance  { background: rgba(63, 185, 80, 0.15); color: #3fb950; }
      .strategy-badge.prune    { background: rgba(248, 81, 73, 0.15); color: #f85149; }

      /* ---- Design Drift Indicator ---- */
      .drift-indicator, .drift-indicator-compact {
        display: flex;
        flex-direction: column;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid var(--vscode-panel-border);
        min-width: 180px;
      }
      .drift-indicator.drift-no-reviews {
        flex-direction: row;
        align-items: center;
        gap: 10px;
      }
      .drift-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .drift-score-section {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .drift-score-ring {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .drift-green { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 2px solid #22c55e; }
      .drift-yellow { background: rgba(234, 179, 8, 0.15); color: #eab308; border: 2px solid #eab308; }
      .drift-red { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 2px solid #ef4444; }
      .drift-gray { background: rgba(107, 114, 128, 0.15); color: #6b7280; border: 2px solid #6b7280; }
      .drift-info { display: flex; flex-direction: column; }
      .drift-label { font-size: 12px; font-weight: 600; }
      .drift-meta { font-size: 11px; color: var(--vscode-descriptionForeground); }
      .drift-review-btn {
        font-size: 12px;
        flex-shrink: 0;
      }
      .drift-sparkline {
        width: 100%;
        height: 36px;
        margin-top: 6px;
      }
      .drift-sparkline svg {
        width: 100%;
        height: 100%;
      }
      .drift-btn-group { display: flex; gap: 4px; flex-shrink: 0; }

      /* Trend arrows */
      .trend-arrow { font-size: 14px; font-weight: 700; margin-left: 4px; vertical-align: middle; }
      .trend-up { color: var(--passing); }
      .trend-down { color: var(--failing); }
      .trend-stable { color: var(--vscode-descriptionForeground); }

      /* Governance score history */
      .governance-history-section {
        display: flex; flex-direction: column;
        padding: 8px 14px; border-radius: 8px;
        border: 1px solid var(--vscode-panel-border);
        margin-top: 12px;
      }
      .governance-history-header {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
      }
      .governance-history-score-section {
        display: flex; align-items: center; gap: 10px;
      }
      .governance-sparkline { width: 100%; height: 36px; margin-top: 6px; }
      .governance-sparkline svg { width: 100%; height: 100%; }

      /* Top findings panel */
      .top-findings-panel {
        margin-top: 8px;
        padding: 8px 10px;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        font-size: 12px;
        background: var(--vscode-editor-background);
      }
      .top-findings-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .top-findings-header-title { font-weight: 600; font-size: 12px; }
      .top-findings-header-actions { display: flex; gap: 4px; }
      .top-findings-pillar { margin-bottom: 8px; }
      .top-findings-pillar:last-child { margin-bottom: 0; }
      .top-findings-pillar-name {
        font-weight: 600;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 2px;
      }
      .top-findings-list {
        margin: 0;
        padding-left: 16px;
      }
      .top-findings-list li {
        font-size: 11px;
        line-height: 1.5;
        margin-bottom: 2px;
      }
      .top-findings-collapsed {
        cursor: pointer;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        padding: 4px 0;
      }
      .top-findings-collapsed:hover { color: var(--vscode-foreground); }
      .top-findings-progress {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }
      .top-findings-progress-bar {
        flex: 1;
        height: 4px;
        background: var(--vscode-panel-border);
        border-radius: 2px;
        overflow: hidden;
      }
      .top-findings-progress-fill {
        height: 100%;
        background: var(--vscode-progressBar-background);
        transition: width 0.3s;
      }

      /* App Tile Grid */
      .app-tile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-bottom: 16px; }

      /* App Tile */
      .app-tile {
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
        padding: 14px 16px; cursor: pointer; border-left: 3px solid var(--accent);
        transition: border-color 0.15s, transform 0.1s;
      }
      .app-tile:hover { border-color: var(--accent); transform: translateY(-1px); }
      .app-tile-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
      .app-tile-name { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; margin-right: 8px; }
      .app-tile-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
      .app-tile-stats { display: flex; gap: 12px; font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }
      .app-tile-stats .stat-value { font-weight: 600; color: var(--text); }

      /* Application lens platform drill-down breadcrumb */
      .app-lens-breadcrumb { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 12px; }
      .app-lens-breadcrumb a { color: var(--accent); cursor: pointer; }
      .app-lens-breadcrumb .sep { color: var(--text-dim); }
  `;
}
