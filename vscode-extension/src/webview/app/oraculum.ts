// Oraculum — Architecture Review webview frontend
// Hub / Create / Manage pattern (mirrors Cheshire Cat IssueCreatorPanel)

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

// ============================================================================
// Types (mirrored — can't import in browser context)
// ============================================================================

type ViewMode = 'hub' | 'create' | 'manage';
type CreatePhase = 'configure' | 'submit';
type ManagePhase = 'assign' | 'monitor' | 'results';
type Phase = CreatePhase | ManagePhase;
type ReviewPillar = 'architecture' | 'security' | 'risk' | 'operations';
type AgentAssignment = 'claude' | 'copilot' | 'skip';

const CREATE_PHASES: CreatePhase[] = ['configure', 'submit'];
const MANAGE_PHASES: ManagePhase[] = ['assign'];

interface BarSummary {
  id: string;
  name: string;
  platformId: string;
  platformName: string;
  criticality: string;
  lifecycle: string;
  compositeScore: number;
  repos: string[];
  path: string;
}

interface PromptPackOption {
  id: string;
  name: string;
  description: string;
  domain?: string;
  required?: boolean;
  available: boolean;
}

interface IssueComment {
  id: number;
  author: string;
  authorAvatarUrl: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isBot: boolean;
}

interface GitHubIssueListItem {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: { name: string; color: string }[];
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  url: string;
}

interface LinkedPullRequest {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  branch: string;
  checksStatus: 'pending' | 'passing' | 'failing' | 'unknown';
  mergeable: boolean;
  draft: boolean;
}

// ============================================================================
// State
// ============================================================================

const state = {
  viewMode: 'hub' as ViewMode,
  currentPhase: 'configure' as Phase,
  // Hub
  hubIssues: [] as GitHubIssueListItem[],
  hubHasMore: false,
  hubPage: 1,
  // Mesh info
  meshOwner: '',
  meshRepo: '',
  workflowExists: null as boolean | null,
  meshBehind: 0,
  meshAhead: 0,
  // BAR (populated by startCreateFlow)
  selectedBar: null as BarSummary | null,
  selectedBarRepos: [] as string[],
  selectedBarPath: '',
  // Configure
  promptPacks: [{ id: 'default', name: 'Default', description: '4-pillar review', domain: 'general', required: true, available: true }] as PromptPackOption[],
  selectedPillars: ['architecture', 'security', 'risk', 'operations'] as ReviewPillar[],
  selectedPromptPacks: ['default'] as string[],
  additionalContext: '',
  // Manage
  issueUrl: '',
  issueNumber: 0,
  assignedAgent: null as AgentAssignment | null,
  comments: [] as IssueComment[],
  labels: [] as string[],
  linkedPr: null as LinkedPullRequest | null,
  // UI
  isLoading: false,
  loadingMessage: '',
  error: '',
};

// ============================================================================
// Render
// ============================================================================

function render() {
  const root = document.getElementById('oraculum-root');
  if (!root) { return; }

  const syncBanner = renderMeshSyncBanner();

  if (state.viewMode === 'hub') {
    root.innerHTML = syncBanner + renderHub();
  } else {
    const phases = state.viewMode === 'create' ? CREATE_PHASES : MANAGE_PHASES;
    root.innerHTML = `
      ${syncBanner}
      <div class="oraculum-layout">
        ${renderPhaseSidebar(phases)}
        <div class="phase-content" id="phase-content">
          ${renderPhaseContent()}
          ${state.isLoading ? `<div class="loading-overlay"><div class="spinner"></div><span>${escapeHtml(state.loadingMessage)}</span></div>` : ''}
          ${state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : ''}
        </div>
      </div>
    `;
  }

  attachEventListeners();
}

// ============================================================================
// Mesh Sync Banner
// ============================================================================

function renderMeshSyncBanner(): string {
  if (state.meshBehind <= 0) { return ''; }
  return `
    <div class="mesh-sync-banner">
      <span style="font-size: 16px; font-weight: 700;">&#x2193;</span>
      <span>${state.meshBehind} commit${state.meshBehind !== 1 ? 's' : ''} behind remote. Pull to sync before provisioning or deploying.</span>
      <button id="btn-oraculum-pull" class="btn-primary btn-sm">Pull</button>
    </div>
  `;
}

// ============================================================================
// Hub — Issue List
// ============================================================================

function renderHub(): string {
  const meshLabel = state.meshOwner && state.meshRepo
    ? `<span class="text-muted">${escapeHtml(state.meshOwner)}/${escapeHtml(state.meshRepo)}</span>`
    : '';

  let workflowBanner = '';
  if (state.workflowExists === false) {
    workflowBanner = `<div class="workflow-banner warning">
        <span>Workflow not deployed. Deploy from Looking Glass Settings (gear icon).</span>
      </div>`;
  }

  let issueList = '';
  if (state.hubIssues.length > 0) {
    issueList = `<div class="issue-list">${state.hubIssues.map(renderIssueRow).join('')}</div>`;
    if (state.hubHasMore) {
      issueList += `<div style="text-align: center; margin-top: 12px;"><button class="btn-secondary btn-sm" id="btn-load-more">Load More</button></div>`;
    }
  } else if (!state.isLoading) {
    issueList = `<div class="hub-empty"><p>No architecture reviews found.</p><p class="text-muted">Click "Review" on a BAR in Looking Glass to create one.</p></div>`;
  }

  return `
    <div class="hub-layout">
      <div class="hub-header">
        <div>
          <h2 style="margin-bottom: 4px;">Architecture Reviews</h2>
          ${meshLabel}
        </div>
        <button class="btn-secondary btn-sm" id="btn-refresh-issues">Refresh</button>
      </div>
      ${workflowBanner}
      ${issueList}
      ${state.isLoading ? `<div class="loading-overlay"><div class="spinner"></div><span>${escapeHtml(state.loadingMessage)}</span></div>` : ''}
      ${state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : ''}
    </div>
  `;
}

function renderIssueRow(issue: GitHubIssueListItem): string {
  const hasReview = issue.labels.some(l => l.name === 'oraculum-review');
  const statusBadge = hasReview
    ? '<span class="issue-label" style="background: #3b82f6; color: #fff;">reviewing</span>'
    : '<span class="issue-label" style="background: #d97706; color: #fff;">pending</span>';

  const labels = issue.labels
    .filter(l => l.name !== 'maintainabilityai' && l.name !== 'oraculum-review')
    .map(l => `<span class="issue-label" style="background: #${escapeAttr(l.color)}20; color: #${escapeAttr(l.color)}; border: 1px solid #${escapeAttr(l.color)}40;">${escapeHtml(l.name)}</span>`)
    .join('');

  return `
    <div class="issue-row" data-issue-number="${issue.number}" data-issue-url="${escapeAttr(issue.url)}">
      <div class="issue-number">#${issue.number}</div>
      <div class="issue-content">
        <div class="issue-title">${escapeHtml(issue.title)}</div>
        <div class="issue-meta">
          ${statusBadge}
          ${labels}
          <span class="text-muted" style="font-size: 11px;">${issue.commentsCount} comments \u00b7 ${formatTimestamp(issue.updatedAt)}</span>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Sidebar
// ============================================================================

function renderPhaseSidebar(phases: readonly Phase[]): string {
  const phaseLabels: Record<Phase, string> = {
    configure: 'Configure',
    submit: 'Submit',
    assign: 'Assign Agent',
    monitor: 'Monitor',
    results: 'Results',
  };

  const currentIndex = phases.indexOf(state.currentPhase as Phase);
  const steps = phases.map((p, i) => {
    let cls = 'phase-step';
    if (p === state.currentPhase) { cls += ' active'; }
    else if (i < currentIndex) { cls += ' completed'; }
    const num = i < currentIndex ? '\u2713' : String(i + 1);
    return `<div class="${cls}"><div class="step-num">${num}</div><span class="step-label">${phaseLabels[p]}</span></div>`;
  }).join('');

  return `
    <div class="phase-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-icon">\u{1F52D}</span>
        <span class="sidebar-title">Oraculum</span>
      </div>
      <a class="back-to-hub-link" id="back-to-hub">\u2190 Back to Reviews</a>
      ${steps}
    </div>
  `;
}

function renderPhaseContent(): string {
  switch (state.currentPhase) {
    case 'configure': return renderConfigurePhase();
    case 'submit': return renderSubmitPhase();
    case 'assign': return renderAssignPhase();
    case 'monitor': return renderMonitorPhase();
    case 'results': return renderResultsPhase();
    default: return '';
  }
}

// ============================================================================
// Create — Phase 1: Configure
// ============================================================================

function renderConfigurePhase(): string {
  if (!state.selectedBar) {
    return '<p class="text-muted">No BAR selected. Open Oraculum from a BAR in Looking Glass.</p>';
  }

  const bar = state.selectedBar;
  const critClass = `crit-${bar.criticality.toLowerCase()}`;

  const pillars: ReviewPillar[] = ['architecture', 'security', 'risk', 'operations'];
  const pillarCheckboxes = pillars.map(p => `
    <label class="pillar-check">
      <input type="checkbox" class="pillar-cb" value="${p}" ${state.selectedPillars.includes(p) ? 'checked' : ''} />
      ${p.charAt(0).toUpperCase() + p.slice(1)}
    </label>
  `).join('');

  const repoCheckboxes = state.selectedBarRepos.map(r => `
    <label class="repo-check">
      <input type="checkbox" class="repo-cb" value="${escapeAttr(r)}" checked />
      ${escapeHtml(r)}
    </label>
  `).join('');

  const packCheckboxes = state.promptPacks.map(p => {
    const isRequired = p.required || false;
    const isAvailable = p.available !== false;
    const isChecked = isRequired || state.selectedPromptPacks.includes(p.id);
    const disabledAttr = isRequired ? 'disabled' : '';
    const unavailableClass = !isAvailable ? ' unavailable' : '';
    return `
      <label class="prompt-pack-check${unavailableClass}">
        <input type="checkbox" class="pack-cb" value="${escapeAttr(p.id)}" ${isChecked ? 'checked' : ''} ${disabledAttr} ${!isAvailable ? 'disabled' : ''} />
        <div class="pack-info">
          <strong>${escapeHtml(p.name)}</strong>${isRequired ? ' <span class="text-muted">(always included)</span>' : ''}${!isAvailable ? ' <span class="text-muted">(not deployed)</span>' : ''}
          <span class="pack-description">${escapeHtml(p.description)}</span>
        </div>
      </label>`;
  }).join('');

  return `
    <h2>Configure Review</h2>

    <div class="bar-summary-card">
      <div>
        <strong>${escapeHtml(bar.name)}</strong>
        <span class="text-muted"> \u00b7 ${escapeHtml(bar.platformName)}</span>
      </div>
      <span class="bar-criticality ${critClass}">${escapeHtml(bar.criticality)}</span>
    </div>

    <div class="config-section">
      <h3>Review Pillars</h3>
      <div class="pillar-grid">${pillarCheckboxes}</div>
    </div>

    <div class="config-section">
      <div class="config-section-header">
        <h3>Prompt Packs</h3>
        <button class="btn-secondary btn-sm" id="btn-refresh-packs">Refresh</button>
      </div>
      <div class="prompt-pack-grid">${packCheckboxes}</div>
    </div>

    <div class="config-section">
      <h3>Repositories</h3>
      <div style="display: flex; flex-direction: column; gap: 6px;">${repoCheckboxes}</div>
    </div>

    <div class="config-section">
      <h3>Additional Context <span class="text-muted">(optional)</span></h3>
      <textarea class="input-textarea" id="additional-context" rows="3" placeholder="Additional guidance for the review agent...">${escapeHtml(state.additionalContext)}</textarea>
    </div>

    <div class="phase-actions">
      <button class="btn-primary" id="btn-submit-review">Submit Review</button>
    </div>
  `;
}

// ============================================================================
// Create — Phase 2: Submit
// ============================================================================

function renderSubmitPhase(): string {
  if (state.issueUrl) {
    return `
      <div class="success-card">
        <strong>\u2705 Review issue created</strong>
        <p class="text-muted" style="margin-top: 4px;">Issue <a href="#" class="issue-link" data-url="${escapeAttr(state.issueUrl)}">#${state.issueNumber}</a> has been created. Proceed to assign an agent.</p>
      </div>
    `;
  }
  return `
    <div class="monitor-waiting"><div class="spinner"></div><p>Creating review issue...</p></div>
  `;
}

// ============================================================================
// Manage — Phase 1: Assign Agent (3-card grid like Cheshire Cat)
// ============================================================================

function renderAssignPhase(): string {
  const issueLink = state.issueUrl
    ? `Issue <a href="#" class="issue-link" data-url="${escapeAttr(state.issueUrl)}">#${state.issueNumber}</a>`
    : `Issue <strong>#${state.issueNumber}</strong>`;

  return `
    <h2>Assign an AI Agent</h2>
    <p style="color: var(--vscode-descriptionForeground); margin-bottom: 4px;">
      ${issueLink} is ready for review.
    </p>
    <p style="color: var(--vscode-descriptionForeground); font-size: 12px; margin-bottom: 16px;">Choose who should perform this architecture review:</p>

    <div class="agent-cards">
      <div class="agent-card" id="assign-claude">
        <h4>Claude / Alice</h4>
        <p>Posts <code>@claude</code> comment to trigger architecture analysis.
           Claude will review each repo against the BAR and post findings.</p>
      </div>
      <div class="agent-card" id="assign-copilot">
        <h4>Copilot</h4>
        <p>Assigns the GitHub Copilot coding agent to this issue.
           Copilot reads the issue body, prompt packs, and BAR to perform the review.</p>
      </div>
      <div class="agent-card" id="assign-skip">
        <h4>Skip</h4>
        <p>Don't assign now. The <code>oraculum-review</code> label will be added
           but no agent comment posted.</p>
      </div>
    </div>

    <div id="workflow-warning" class="workflow-warning" style="display: none;">
      Note: The <code>oraculum-review.yml</code> workflow was not found.
      The @claude comment will be posted, but automated analysis won't trigger until the workflow is added.
      Use "Provision Workflow" on the hub to add it.
    </div>

    <div id="assign-loading" class="loading" style="display: none;">
      <div class="spinner"></div>
      <span>Assigning agent...</span>
    </div>
    <div id="assign-error" class="error-msg"></div>
  `;
}

// ============================================================================
// Manage — Phase 2: Monitor (full timeline like Cheshire Cat)
// ============================================================================

function renderMonitorPhase(): string {
  return `
    <div class="monitor-header">
      <h2 style="margin-bottom: 0;">Monitoring Issue #${state.issueNumber}</h2>
      <a id="monitor-issue-link" style="cursor: pointer; color: var(--vscode-textLink-foreground);">Open in browser</a>
      <div class="polling-badge"><div class="polling-dot"></div> Polling for updates</div>
    </div>

    <div id="pr-banner-area"></div>

    <div id="agent-status" class="agent-status" style="display: none;">
      <span id="agent-status-icon"></span>
      <span id="agent-status-text"></span>
    </div>

    <div class="timeline" id="timeline">
      <div class="timeline-empty" id="timeline-empty">
        Waiting for agent to respond...<br>
        Comments will appear here as the agent analyzes the architecture.
      </div>
    </div>

    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button id="btn-stop-monitoring" class="btn-secondary">Stop Monitoring</button>
      <button id="btn-go-results" class="btn-primary" style="display: none;">Continue to Results</button>
    </div>

    <div id="error" class="error-msg"></div>
  `;
}

// ============================================================================
// Review Metrics — Parse + Save
// ============================================================================

function findReportComment(): IssueComment | null {
  const reviewMarkers = ['## Oraculum Review', '### Architecture Findings', '### Security Findings', '## Summary', '| Pillar', 'Findings'];
  const botComments = state.comments.filter(c => c.isBot);
  const markedComments = state.comments.filter(c =>
    reviewMarkers.some(m => c.body.includes(m))
  );

  if (markedComments.length > 0) {
    return markedComments.reduce((longest, c) => c.body.length > longest.body.length ? c : longest);
  } else if (botComments.length > 0) {
    return botComments.reduce((longest, c) => c.body.length > longest.body.length ? c : longest);
  } else if (state.comments.length > 0) {
    const substantive = state.comments.filter(c => c.body.length > 200);
    if (substantive.length > 0) {
      return substantive.reduce((longest, c) => c.body.length > longest.body.length ? c : longest);
    }
  }
  return null;
}


// ============================================================================
// Manage — Phase 3: Results (matches Cheshire Cat complete phase)
// ============================================================================

function renderResultsPhase(): string {
  const prSection = state.linkedPr ? `
    <p>Pull Request: <a href="#" id="results-pr-link" class="issue-link" style="cursor: pointer;">#${state.linkedPr.number} \u2014 ${escapeHtml(state.linkedPr.title)}</a></p>
    <p style="font-size: 12px;">Branch: <code>${escapeHtml(state.linkedPr.branch)}</code></p>
  ` : '';

  const reportComment = findReportComment();

  const reportSection = reportComment
    ? `<div class="results-report">
        <div class="results-report-header">
          ${reportComment.authorAvatarUrl ? `<img class="timeline-avatar" src="${escapeAttr(reportComment.authorAvatarUrl)}" alt="${escapeAttr(reportComment.author)}" />` : ''}
          <strong>${escapeHtml(reportComment.author)}</strong>
          ${reportComment.isBot ? '<span class="bot-badge">bot</span>' : ''}
          <span class="timeline-time">${formatTimestamp(reportComment.updatedAt || reportComment.createdAt)}</span>
        </div>
        <div class="results-report-body">${renderMarkdown(reportComment.body)}</div>
      </div>`
    : '<p class="text-muted">No review report found in issue comments.</p>';

  let prStatusBanner = '';
  if (state.linkedPr?.state === 'merged') {
    prStatusBanner = `<div class="success-card" style="margin-top: 12px;">
        <strong>Review artifacts applied via merged PR.</strong>
      </div>`;
  } else if (state.linkedPr?.state === 'open') {
    prStatusBanner = `<div class="success-card" style="margin-top: 12px; border-left-color: #3b82f6;">
        <strong>Review artifacts will be applied when the PR is merged.</strong>
      </div>`;
  }

  return `
    <div class="complete-card">
      <h2>Review Complete</h2>
      <p>Issue <a href="#" id="results-issue-link" class="issue-link">#${state.issueNumber}</a> \u2014 ${state.assignedAgent === 'claude' ? 'Reviewed by Claude' : state.assignedAgent === 'copilot' ? 'Reviewed by Copilot' : 'Review complete'}.</p>
      ${prSection}
    </div>

    ${reportSection}
    ${prStatusBanner}

    <div class="complete-actions" style="margin-top: 16px;">
      <button id="btn-open-issue-results" class="btn-secondary">Open Issue</button>
      ${state.linkedPr ? `<button id="btn-open-pr-results" class="btn-secondary">Open PR</button>` : ''}
      <button id="btn-view-bar" class="btn-primary">View BAR</button>
      <button id="btn-back-to-hub-results" class="btn-secondary">Back to Reviews</button>
    </div>
  `;
}

// ============================================================================
// Timeline Functions (ported from Cheshire Cat main.ts)
// ============================================================================

function updateTimeline(comments: IssueComment[]) {
  const timeline = document.getElementById('timeline');
  if (!timeline) { return; }

  const empty = document.getElementById('timeline-empty');
  if (empty && comments.length > 0) { empty.remove(); }

  // Clear and re-render all comments
  timeline.querySelectorAll('.timeline-card').forEach(el => el.remove());
  // Remove any previous approve banner
  document.getElementById('approve-banner')?.remove();

  for (const comment of comments) {
    const card = document.createElement('div');
    card.className = `timeline-card${comment.isBot ? ' bot' : ''}`;
    const wasEdited = comment.updatedAt && comment.updatedAt !== comment.createdAt;
    card.innerHTML = `
      <div class="timeline-header">
        ${comment.authorAvatarUrl ? `<img class="timeline-avatar" src="${escapeAttr(comment.authorAvatarUrl)}" alt="${escapeAttr(comment.author)}" />` : ''}
        <strong>${escapeHtml(comment.author)}</strong>
        ${comment.isBot ? '<span class="bot-badge">bot</span>' : ''}
        ${wasEdited ? '<span class="edited-badge">updated</span>' : ''}
        <span class="timeline-time">${formatTimestamp(wasEdited ? comment.updatedAt : comment.createdAt)}</span>
      </div>
      <div class="timeline-body">${renderMarkdown(comment.body)}</div>
    `;
    timeline.appendChild(card);
  }

  // Detect approval state
  const needsApproval = detectNeedsApproval(comments);

  // Update agent status indicator
  updateAgentStatus(comments, needsApproval);

  // Show approve/replan banner if needed
  if (needsApproval) {
    const agentName = state.assignedAgent === 'copilot' ? 'Copilot' : 'Claude';
    const banner = document.createElement('div');
    banner.id = 'approve-banner';
    banner.className = 'approve-banner';
    banner.innerHTML = `
      <span>${agentName} has a plan ready for your review.</span>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button id="btn-approve" class="btn-success" style="padding: 6px 20px;">Approve Plan</button>
        <button id="btn-replan" class="btn-secondary" style="padding: 6px 20px;">Request Changes</button>
      </div>
      <div id="replan-area" style="display: none; margin-top: 10px;">
        <textarea id="replan-feedback" style="min-height: 60px; width: 100%; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 8px; font-family: inherit;" placeholder="Describe what should be changed in the plan..."></textarea>
        <div style="margin-top: 6px; display: flex; gap: 8px;">
          <button id="btn-send-replan" class="btn-primary" style="padding: 6px 16px;">Send Feedback</button>
          <button id="btn-cancel-replan" class="btn-secondary" style="padding: 6px 16px;">Cancel</button>
        </div>
      </div>
    `;
    timeline.parentElement!.insertBefore(banner, timeline.nextSibling);

    document.getElementById('btn-approve')!.addEventListener('click', () => {
      vscode.postMessage({ type: 'approveAgent', agent: state.assignedAgent || 'claude' });
      banner.innerHTML = '<span>Approval sent \u2014 waiting for implementation to start...</span>';
      banner.classList.add('approved');
    });

    document.getElementById('btn-replan')!.addEventListener('click', () => {
      document.getElementById('replan-area')!.style.display = 'block';
      (document.getElementById('replan-feedback') as HTMLTextAreaElement).focus();
    });

    document.getElementById('btn-cancel-replan')!.addEventListener('click', () => {
      document.getElementById('replan-area')!.style.display = 'none';
    });

    document.getElementById('btn-send-replan')!.addEventListener('click', () => {
      const feedback = (document.getElementById('replan-feedback') as HTMLTextAreaElement).value.trim();
      if (!feedback) { return; }
      vscode.postMessage({
        type: 'replanAgent',
        feedback,
        agent: state.assignedAgent || 'claude',
      });
      banner.innerHTML = '<span>Feedback sent \u2014 agent will revise the plan...</span>';
      banner.classList.add('approved');
    });
  }

  timeline.scrollTop = timeline.scrollHeight;
}

function detectNeedsApproval(comments: IssueComment[]): boolean {
  const labels = state.labels;
  const hasPlanning = labels.includes('remediation-planning');
  const hasInProgress = labels.includes('remediation-in-progress');
  const hasComplete = labels.includes('remediation-complete');

  if (hasComplete || hasInProgress) { return false; }
  if (hasPlanning) {
    const hasHumanApproval = comments.some(c =>
      !c.isBot && isApprovalGiven(c.body.toLowerCase())
    );
    return !hasHumanApproval;
  }

  let needsApproval = false;
  for (const comment of comments) {
    const lower = comment.body.toLowerCase();
    if (comment.isBot && isAwaitingApproval(comment.body)) {
      needsApproval = true;
    } else if (needsApproval && isApprovalGiven(lower)) {
      needsApproval = false;
    } else {
      const commentComplete = comment.isBot && (
        lower.includes('implementation complete') ||
        lower.includes('implementation is complete') ||
        lower.includes('all changes have been committed') ||
        lower.includes('opened a pull request') ||
        lower.includes('created a pull request') ||
        lower.includes('review complete') ||
        lower.includes('analysis complete')
      );
      if (commentComplete) {
        needsApproval = false;
      }
    }
  }
  return needsApproval;
}

function isAwaitingApproval(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes('ready for approval') ||
    lower.includes('approve to proceed') ||
    lower.includes('approval to proceed') ||
    lower.includes('awaiting approval') ||
    lower.includes('waiting for approval') ||
    lower.includes('once approved') ||
    (lower.includes('reply with') && lower.includes('approved')) ||
    (lower.includes('@claude approved') && lower.includes('next steps'))
  );
}

function isApprovalGiven(lowerBody: string): boolean {
  return (
    lowerBody.includes('@claude approved') ||
    lowerBody.includes('@copilot approved') ||
    (lowerBody.includes('approved') && lowerBody.includes('plan')) ||
    lowerBody.includes('starting implementation') ||
    lowerBody.includes('beginning implementation') ||
    lowerBody.includes('implementing the plan')
  );
}

function updateAgentStatus(comments: IssueComment[], needsApproval: boolean) {
  const statusEl = document.getElementById('agent-status');
  const iconEl = document.getElementById('agent-status-icon');
  const textEl = document.getElementById('agent-status-text');
  if (!statusEl || !iconEl || !textEl) { return; }

  if (comments.length === 0) {
    statusEl.style.display = 'none';
    return;
  }

  const labels = state.labels;
  const hasPlanning = labels.includes('remediation-planning');
  const hasInProgress = labels.includes('remediation-in-progress');
  const hasComplete = labels.includes('remediation-complete');

  const lastBot = [...comments].reverse().find(c => c.isBot);
  const lastAny = comments[comments.length - 1];
  let status = 'analyzing';
  let icon = '&#x1F50D;'; // magnifying glass
  let text = 'Agent is analyzing...';

  if (lastBot) {
    const lower = lastBot.body.toLowerCase();

    const isComplete = hasComplete ||
      lower.includes('implementation complete') ||
      lower.includes('implementation is complete') ||
      lower.includes('all changes have been committed') ||
      lower.includes('review complete') ||
      lower.includes('analysis complete') ||
      lower.includes('opened a pull request') ||
      lower.includes('created a pull request');

    if (needsApproval) {
      status = 'awaiting-approval';
      icon = '&#x1F4CB;'; // clipboard
      text = 'Plan ready \u2014 waiting for your approval';
    } else if (hasPlanning && !needsApproval) {
      status = 'approval-sent';
      icon = '&#x23F3;'; // hourglass
      text = 'Approval sent \u2014 waiting for implementation to start...';
    } else if (hasInProgress) {
      if (lower.includes('running tests') || lower.includes('npm test') || lower.includes('test coverage')) {
        status = 'testing';
        icon = '&#x1F9EA;'; // test tube
        text = 'Agent is running tests...';
      } else {
        status = 'implementing';
        icon = '&#x1F528;'; // hammer
        text = 'Agent is implementing...';
      }
    } else if (isComplete) {
      status = 'complete';
      icon = '&#x2705;'; // check
      text = 'Review complete';
      if (lower.includes('pull request') || hasComplete) {
        text = 'Review complete \u2014 PR created';
      }
    } else if (lower.includes('running tests') || lower.includes('npm test') || lower.includes('test coverage')) {
      status = 'testing';
      icon = '&#x1F9EA;';
      text = 'Agent is running tests...';
    } else if (lower.includes('starting implementation') || lower.includes('beginning implementation') || lower.includes('implementing') || lower.includes('creating files') || lower.includes('writing code')) {
      status = 'implementing';
      icon = '&#x1F528;';
      text = 'Agent is implementing...';
    } else if (lower.includes('plan') || lower.includes('analysis') || lower.includes('approach') || lower.includes('reviewing')) {
      status = 'planning';
      icon = '&#x1F4CB;';
      text = 'Agent is analyzing the architecture...';
    } else {
      status = 'working';
      icon = '&#x1F916;';
      text = 'Agent is working...';
    }
  }

  if (lastAny?.isBot && lastAny.updatedAt !== lastAny.createdAt && status !== 'complete' && status !== 'awaiting-approval') {
    text += ' (comment being updated live)';
  }

  statusEl.style.display = 'flex';
  statusEl.className = `agent-status status-${status}`;
  iconEl.innerHTML = icon;
  textEl.textContent = text;

  // Show "Continue to Results" button when complete
  const resultsBtn = document.getElementById('btn-go-results');
  if (resultsBtn && (status === 'complete' || state.linkedPr)) {
    resultsBtn.style.display = 'inline-block';
  }
}

function showPrBanner(pr: LinkedPullRequest) {
  const area = document.getElementById('pr-banner-area');
  if (!area) { return; }

  const draftLabel = pr.draft ? ' (Draft)' : '';
  const stateLabel = pr.state === 'merged' ? 'Merged' : pr.state === 'closed' ? 'Closed' : pr.draft ? 'Draft' : 'Open';
  const checksLabel = pr.checksStatus === 'unknown' ? 'No checks' : pr.checksStatus;
  const completeBtn = pr.draft
    ? `<button id="btn-complete-review" class="btn-primary btn-sm">View Results</button>`
    : '';

  area.innerHTML = `
    <div class="pr-banner${pr.draft ? ' pr-banner-draft' : ''}">
      <h4>Pull Request #${pr.number}${draftLabel}: ${escapeHtml(pr.title)}</h4>
      <div class="pr-meta">
        <span class="checks-dot checks-${pr.checksStatus}"></span>
        ${checksLabel} | ${stateLabel} | Branch: <code>${escapeHtml(pr.branch)}</code>
      </div>
      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <button id="btn-open-pr-monitor" class="btn-secondary btn-sm">Open in Browser</button>
        ${completeBtn}
      </div>
    </div>
  `;

  document.getElementById('btn-open-pr-monitor')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'openUrl', url: pr.url });
  });

  document.getElementById('btn-complete-review')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'stopMonitoring' });
    state.currentPhase = 'results';
    render();
  });
}

// ============================================================================
// Event Listeners
// ============================================================================

function attachEventListeners() {
  // Mesh sync: pull from remote
  document.getElementById('btn-oraculum-pull')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'pullMesh' });
  });

  // Hub: Provision workflow


  // Hub: Refresh issues
  document.getElementById('btn-refresh-issues')?.addEventListener('click', () => {
    state.hubPage = 1;
    vscode.postMessage({ type: 'loadIssues', page: 1 });
  });

  // Hub: Load more
  document.getElementById('btn-load-more')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'loadIssues', page: state.hubPage + 1 });
  });

  // Hub: Issue row click -> manage mode
  document.querySelectorAll('.issue-row').forEach(row => {
    row.addEventListener('click', () => {
      const num = parseInt((row as HTMLElement).dataset.issueNumber || '0', 10);
      const url = (row as HTMLElement).dataset.issueUrl || '';
      if (num) { selectIssueFromHub(num, url); }
    });
  });

  // Sidebar: Back to Reviews
  document.getElementById('back-to-hub')?.addEventListener('click', () => {
    goToHub();
  });

  // Configure: Refresh prompt packs
  document.getElementById('btn-refresh-packs')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'refreshPromptPacks' });
  });

  // Configure: Submit Review
  document.getElementById('btn-submit-review')?.addEventListener('click', () => {
    if (!state.selectedBar) { return; }

    const pillars: ReviewPillar[] = [];
    document.querySelectorAll('.pillar-cb:checked').forEach(cb => {
      pillars.push((cb as HTMLInputElement).value as ReviewPillar);
    });

    const repos: string[] = [];
    document.querySelectorAll('.repo-cb:checked').forEach(cb => {
      repos.push((cb as HTMLInputElement).value);
    });

    const promptPacks: string[] = ['default'];
    document.querySelectorAll('.pack-cb:checked').forEach(cb => {
      const val = (cb as HTMLInputElement).value;
      if (val !== 'default') { promptPacks.push(val); }
    });
    const context = (document.getElementById('additional-context') as HTMLTextAreaElement)?.value || '';

    state.selectedPillars = pillars;
    state.selectedPromptPacks = promptPacks;
    state.additionalContext = context;
    state.currentPhase = 'submit';
    render();

    const title = `Oraculum Review: ${state.selectedBar.name}`;
    vscode.postMessage({
      type: 'submitReview',
      barPath: state.selectedBarPath,
      scope: {
        pillars,
        promptPacks,
        includeRepos: repos,
        additionalContext: context || undefined,
      },
      title,
    });
  });

  // Assign: Agent card clicks
  document.getElementById('assign-claude')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'assignAgent', agent: 'claude' });
  });
  document.getElementById('assign-copilot')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'assignAgent', agent: 'copilot' });
  });
  document.getElementById('assign-skip')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'assignAgent', agent: 'skip' });
  });

  // Monitor: Open issue, stop monitoring, continue to results
  document.getElementById('monitor-issue-link')?.addEventListener('click', () => {
    if (state.issueUrl) { vscode.postMessage({ type: 'openUrl', url: state.issueUrl }); }
  });

  document.getElementById('btn-stop-monitoring')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'stopMonitoring' });
    state.currentPhase = 'results';
    render();
  });

  document.getElementById('btn-go-results')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'stopMonitoring' });
    state.currentPhase = 'results';
    render();
  });

  // Results: buttons
  document.getElementById('btn-open-issue-results')?.addEventListener('click', () => {
    if (state.issueUrl) { vscode.postMessage({ type: 'openUrl', url: state.issueUrl }); }
  });

  document.getElementById('btn-open-pr-results')?.addEventListener('click', () => {
    if (state.linkedPr) { vscode.postMessage({ type: 'openUrl', url: state.linkedPr.url }); }
  });

  document.getElementById('btn-view-bar')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'openBar', barPath: state.selectedBarPath });
  });

  document.getElementById('btn-back-to-hub-results')?.addEventListener('click', () => {
    goToHub();
  });

  document.getElementById('results-issue-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.issueUrl) { vscode.postMessage({ type: 'openUrl', url: state.issueUrl }); }
  });

  document.getElementById('results-pr-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.linkedPr) { vscode.postMessage({ type: 'openUrl', url: state.linkedPr.url }); }
  });

  // Open URL links (issue links)
  document.querySelectorAll('.issue-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const url = (el as HTMLElement).getAttribute('data-url');
      if (url) { vscode.postMessage({ type: 'openUrl', url }); }
    });
  });

  // Start monitoring when monitor phase renders
  if (state.currentPhase === 'monitor') {
    if (state.comments.length > 0) {
      updateTimeline(state.comments);
    }
    if (state.linkedPr) {
      showPrBanner(state.linkedPr);
    }
    vscode.postMessage({ type: 'startMonitoring' });
  }
}

// ============================================================================
// View Mode Management
// ============================================================================

function goToHub() {
  resetIssueState();
  vscode.postMessage({ type: 'backToHub' });
  vscode.postMessage({ type: 'loadIssues', page: 1 });
  state.viewMode = 'hub';
  render();
}

function resetIssueState() {
  state.selectedBar = null;
  state.selectedBarRepos = [];
  state.selectedBarPath = '';
  state.issueUrl = '';
  state.issueNumber = 0;
  state.comments = [];
  state.labels = [];
  state.linkedPr = null;
  state.assignedAgent = null;
  state.error = '';
  state.selectedPillars = ['architecture', 'security', 'risk', 'operations'];
  state.selectedPromptPacks = ['default'];
  state.additionalContext = '';
}

function selectIssueFromHub(issueNumber: number, issueUrl: string) {
  state.issueNumber = issueNumber;
  state.issueUrl = issueUrl;
  vscode.postMessage({ type: 'selectIssue', issueNumber, issueUrl });
  state.viewMode = 'manage';
  state.currentPhase = 'assign';
  render();
}

// ============================================================================
// Message Handler
// ============================================================================

window.addEventListener('message', (event) => {
  const msg = event.data;

  switch (msg.type) {
    case 'meshRepoDetected':
      state.meshOwner = msg.owner;
      state.meshRepo = msg.repo;
      if (state.viewMode === 'hub') { render(); }
      break;

    case 'promptPacksLoaded':
      state.promptPacks = msg.packs;
      if (state.viewMode === 'create' && state.currentPhase === 'configure') { render(); }
      break;

    case 'workflowStatus':
      state.workflowExists = msg.exists;
      if (state.viewMode === 'hub') { render(); }
      break;

    case 'workflowProvisioned':
      state.workflowExists = true;
      render();
      break;

    case 'meshSyncStatus':
      state.meshBehind = msg.behind ?? 0;
      state.meshAhead = msg.ahead ?? 0;
      render();
      break;

    case 'pullComplete':
      state.meshBehind = 0;
      state.meshAhead = 0;
      render();
      break;

    case 'pullError':
      state.error = msg.message || 'Pull failed';
      render();
      break;

    case 'startCreateFlow':
      state.selectedBar = msg.bar;
      state.selectedBarRepos = msg.repos || [];
      state.selectedBarPath = msg.barPath;
      state.viewMode = 'create';
      state.currentPhase = 'configure';
      render();
      break;

    case 'issuesLoaded':
      if (msg.page === 1) {
        state.hubIssues = msg.issues;
      } else {
        state.hubIssues = [...state.hubIssues, ...msg.issues];
      }
      state.hubHasMore = msg.hasMore;
      state.hubPage = msg.page;
      if (state.viewMode === 'hub') { render(); }
      break;

    case 'reviewCreated':
      state.issueUrl = msg.url;
      state.issueNumber = msg.number;
      // Auto-transition to manage mode for the new issue
      state.viewMode = 'manage';
      state.currentPhase = 'assign';
      render();
      break;

    case 'agentAssigned':
      if (msg.agent === 'skip') {
        state.assignedAgent = 'skip';
        state.currentPhase = 'results';
        render();
      } else {
        state.assignedAgent = msg.agent;
        // Navigate to Looking Glass BAR detail — pass agent so banner appears immediately
        vscode.postMessage({ type: 'navigateToBar', agent: msg.agent });
      }
      break;

    case 'workflowNotFound': {
      const warningEl = document.getElementById('workflow-warning');
      if (warningEl) { warningEl.style.display = 'block'; }
      break;
    }

    case 'commentsUpdated':
      state.comments = msg.comments;
      if (state.currentPhase === 'monitor') {
        updateTimeline(msg.comments);
      }
      break;

    case 'prDetected':
      state.linkedPr = msg.pr;
      if (state.currentPhase === 'monitor') {
        showPrBanner(msg.pr);
        // Only auto-transition when PR is NOT a draft (Copilot opens draft first, then marks ready)
        if (!msg.pr.draft) {
          vscode.postMessage({ type: 'stopMonitoring' });
          state.currentPhase = 'results';
          render();
        }
      }
      break;

    case 'prStatusUpdated':
      state.linkedPr = msg.pr;
      if (state.currentPhase === 'monitor') {
        showPrBanner(msg.pr);
        // If PR changed from draft to ready, now auto-transition
        if (!msg.pr.draft) {
          vscode.postMessage({ type: 'stopMonitoring' });
          state.currentPhase = 'results';
          render();
        }
      }
      break;

    case 'labelsUpdated':
      state.labels = msg.labels;
      if (state.currentPhase === 'monitor') {
        // review-complete label means the workflow finished — transition to results
        if (msg.labels.includes('review-complete')) {
          vscode.postMessage({ type: 'stopMonitoring' });
          state.currentPhase = 'results';
          render();
        } else if (state.comments.length > 0) {
          updateAgentStatus(state.comments, detectNeedsApproval(state.comments));
        }
      }
      break;

    case 'issueState':
      // Auto-detect which phase to show based on existing issue state
      state.labels = msg.labels;
      if (msg.labels.includes('review-complete')) {
        // Review already finished — go straight to results
        state.currentPhase = 'results';
        render();
      } else if (msg.hasComments) {
        // Agent was assigned (@claude or @copilot comment exists) — go to monitor
        state.currentPhase = 'monitor';
        render();
      }
      // Otherwise stay on assign phase
      break;

    case 'phaseUpdate':
      if (msg.phase === 'monitor' && msg.status === 'active') {
        state.currentPhase = 'monitor';
        render();
      }
      break;

    case 'loading':
      state.isLoading = msg.active;
      state.loadingMessage = msg.message || '';
      render();
      break;

    case 'error':
      state.error = msg.message;
      state.isLoading = false;
      render();
      setTimeout(() => { state.error = ''; render(); }, 8000);
      break;
  }
});

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Code blocks (``` ... ```) — must come before inline code
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Images (before links to avoid conflict)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;" />');

  // HTML img tags (already escaped, unescape them)
  html = html.replace(/&lt;img\s+(.*?)\/?\s*&gt;/gi, (_m, attrs) => {
    const clean = attrs.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const srcMatch = clean.match(/src\s*=\s*"(https:\/\/(?:github\.com|[^"]*\.githubusercontent\.com)[^"]*)"/i);
    if (!srcMatch) { return ''; }
    return `<img ${clean} style="max-width: 100%;" />`;
  });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: var(--vscode-textLink-foreground);">$1</a>');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h5 style="margin: 8px 0 4px;">$1</h5>');
  html = html.replace(/^### (.+)$/gm, '<h4 style="margin: 8px 0 4px;">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="margin: 8px 0 4px;">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3 style="margin: 10px 0 4px;">$1</h3>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid var(--vscode-panel-border); margin: 8px 0;" />');

  // Checkboxes
  html = html.replace(/^- \[x\] (.+)$/gm, '<div style="margin: 2px 0;">&#9745; $1</div>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<div style="margin: 2px 0;">&#9744; $1</div>');

  // Unordered list items
  html = html.replace(/^- (.+)$/gm, '<div style="margin: 2px 0; padding-left: 12px;">&bull; $1</div>');

  // Ordered list items
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="margin: 2px 0; padding-left: 12px;">$1. $2</div>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left: 3px solid var(--vscode-panel-border); padding-left: 10px; color: var(--vscode-descriptionForeground); margin: 4px 0;">$1</blockquote>');

  // Tables — detect consecutive lines starting with |
  html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) { return tableBlock; }

    // Check if row 2 is a separator (|---|---|...)
    const isSeparator = (row: string) => /^\|[\s:-]+\|/.test(row.replace(/<[^>]+>/g, ''));
    const hasSeparator = isSeparator(rows[1]);

    let tableHtml = '<table>';
    for (let i = 0; i < rows.length; i++) {
      // Skip separator row
      if (i === 1 && hasSeparator) { continue; }

      const cells = rows[i].split('|').filter((_c, idx, arr) => idx > 0 && idx < arr.length - 1);
      const tag = (i === 0 && hasSeparator) ? 'th' : 'td';
      const rowHtml = cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('');

      if (i === 0 && hasSeparator) {
        tableHtml += `<thead><tr>${rowHtml}</tr></thead><tbody>`;
      } else {
        tableHtml += `<tr>${rowHtml}</tr>`;
      }
    }
    if (hasSeparator) { tableHtml += '</tbody>'; }
    tableHtml += '</table>';
    return tableHtml;
  });

  // Line breaks
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) { return 'just now'; }
  if (diffMins < 60) { return `${diffMins}m ago`; }
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) { return `${diffHrs}h ago`; }
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) { return `${diffDays}d ago`; }
  return d.toLocaleDateString();
}

// ============================================================================
// Styles
// ============================================================================

const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
  }

  /* Layout: Hub (full page) */
  .hub-layout {
    padding: 24px 32px;
    max-width: 800px;
    position: relative;
  }

  .hub-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .hub-empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--vscode-descriptionForeground);
  }

  /* Layout: Create / Manage (sidebar + content) */
  .oraculum-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .phase-sidebar {
    width: 200px;
    min-width: 200px;
    background: var(--vscode-sideBar-background);
    border-right: 1px solid var(--vscode-panel-border);
    padding: 16px 0;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 4px;
  }

  .sidebar-icon { font-size: 20px; }
  .sidebar-title { font-weight: 600; font-size: 14px; }

  .back-to-hub-link {
    padding: 8px 16px;
    font-size: 12px;
    cursor: pointer;
    color: var(--vscode-textLink-foreground);
    display: block;
    margin-bottom: 8px;
    text-decoration: none;
  }
  .back-to-hub-link:hover { text-decoration: underline; }

  .phase-step {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    cursor: default;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .phase-step.active { opacity: 1; background: var(--vscode-list-activeSelectionBackground); }
  .phase-step.completed { opacity: 0.8; }

  .step-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    border: 2px solid var(--vscode-panel-border);
    flex-shrink: 0;
  }

  .phase-step.active .step-num {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }

  .phase-step.completed .step-num {
    background: #22c55e;
    color: #fff;
    border-color: #22c55e;
  }

  .step-label { font-size: 13px; }

  .phase-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
    position: relative;
  }

  h2 { font-size: 18px; margin-bottom: 16px; font-weight: 600; }
  h3 { font-size: 14px; margin-bottom: 8px; font-weight: 600; }

  /* Issue list (hub) */
  .issue-list { display: flex; flex-direction: column; gap: 6px; }

  .issue-row {
    padding: 12px 16px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    transition: background 0.15s, border-color 0.15s;
  }
  .issue-row:hover { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-button-background); }

  .issue-number { font-size: 12px; color: var(--vscode-descriptionForeground); font-weight: 600; min-width: 40px; padding-top: 2px; }
  .issue-content { flex: 1; min-width: 0; }
  .issue-title { font-size: 13px; font-weight: 500; }
  .issue-meta { margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .issue-label { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }

  /* Workflow banner */
  .workflow-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-radius: 4px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .workflow-banner.warning {
    background: var(--vscode-inputValidation-warningBackground);
    border: 1px solid var(--vscode-inputValidation-warningBorder);
  }
  .workflow-banner.ok {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border, #444);
  }

  .workflow-warning {
    padding: 10px 14px;
    background: var(--vscode-inputValidation-warningBackground);
    border: 1px solid var(--vscode-inputValidation-warningBorder);
    border-radius: 4px;
    margin-top: 12px;
    font-size: 13px;
  }

  /* BAR summary card (configure phase) */
  .bar-summary-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--vscode-textBlockQuote-background);
    border-radius: 4px;
    margin-bottom: 20px;
    font-size: 12px;
  }

  .bar-criticality {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .crit-critical { background: #dc2626; color: #fff; }
  .crit-high { background: #ea580c; color: #fff; }
  .crit-medium { background: #d97706; color: #fff; }
  .crit-low { background: #6b7280; color: #fff; }

  /* Configure form */
  .config-section { margin-bottom: 20px; }
  .config-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .config-section-header h3 { margin-bottom: 0; }
  .pillar-grid { display: flex; gap: 16px; flex-wrap: wrap; }
  .pillar-check, .repo-check {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
  }

  /* Prompt pack multi-select grid */
  .prompt-pack-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .prompt-pack-check {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  .prompt-pack-check:hover {
    background: var(--vscode-list-hoverBackground);
  }
  .prompt-pack-check input[type="checkbox"] {
    margin-top: 2px;
    flex-shrink: 0;
  }
  .prompt-pack-check input[disabled] {
    opacity: 0.6;
  }
  .prompt-pack-check.unavailable {
    opacity: 0.5;
  }
  .pack-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pack-description {
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
  }

  .input-select, .input-textarea {
    width: 100%;
    padding: 8px 10px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-family: inherit;
    font-size: 13px;
  }
  .input-textarea { resize: vertical; }

  /* Actions bar */
  .phase-actions {
    display: flex;
    gap: 8px;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--vscode-panel-border);
  }

  /* Buttons */
  .btn-primary, .btn-secondary, .btn-success {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }
  .btn-primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .btn-success {
    background: #22c55e;
    color: #fff;
  }
  .btn-success:hover { background: #16a34a; }
  .btn-sm { padding: 4px 10px; font-size: 12px; }

  /* Cards */
  .success-card {
    padding: 16px;
    background: var(--vscode-textBlockQuote-background);
    border-radius: 6px;
    border-left: 3px solid #22c55e;
    margin-bottom: 16px;
  }

  /* Agent selection cards (3-card grid) */
  .agent-cards {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    margin-top: 12px;
  }
  .agent-card {
    padding: 20px 16px;
    border: 2px solid var(--vscode-panel-border);
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    transition: border-color 0.15s, background 0.15s;
  }
  .agent-card:hover {
    border-color: var(--vscode-button-background);
    background: rgba(124, 58, 237, 0.05);
  }
  .agent-card h4 { font-size: 14px; margin-bottom: 8px; }
  .agent-card p { font-size: 11px; color: var(--vscode-descriptionForeground); line-height: 1.4; }
  .agent-card code {
    background: var(--vscode-textCodeBlock-background);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family);
    font-size: 11px;
  }

  /* Complete / Results card */
  .complete-card {
    padding: 20px;
    background: var(--vscode-textBlockQuote-background);
    border-radius: 8px;
    border-left: 3px solid #22c55e;
  }
  .complete-card h2 { margin-bottom: 8px; }
  .complete-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    flex-wrap: wrap;
  }

  /* Results report */
  .results-report {
    margin-top: 16px;
    border: 1px solid var(--vscode-panel-border, #444);
    border-radius: 8px;
    overflow: hidden;
  }
  .results-report-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--vscode-textBlockQuote-background);
    border-bottom: 1px solid var(--vscode-panel-border, #444);
    font-size: 13px;
  }
  .results-report-body {
    padding: 16px;
    font-size: 13px;
    line-height: 1.6;
    max-height: 600px;
    overflow-y: auto;
  }
  .results-report-body h1 { font-size: 18px; margin: 16px 0 8px; border-bottom: 1px solid var(--vscode-panel-border, #444); padding-bottom: 4px; }
  .results-report-body h2 { font-size: 16px; margin: 14px 0 6px; }
  .results-report-body h3 { font-size: 14px; margin: 12px 0 4px; }
  .results-report-body h4 { font-size: 13px; margin: 10px 0 4px; }
  .results-report-body ul, .results-report-body ol { padding-left: 20px; margin: 6px 0; }
  .results-report-body li { margin: 2px 0; }
  .results-report-body pre { background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; overflow-x: auto; margin: 8px 0; }
  .results-report-body code { background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 3px; font-family: var(--vscode-editor-font-family); font-size: 12px; }
  .results-report-body pre code { background: none; padding: 0; }
  .results-report-body blockquote { border-left: 3px solid var(--vscode-textBlockQuote-border); padding: 4px 12px; margin: 8px 0; color: var(--vscode-descriptionForeground); }
  .results-report-body table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  .results-report-body th, .results-report-body td { border: 1px solid var(--vscode-panel-border, #444); padding: 6px 10px; text-align: left; font-size: 12px; }
  .results-report-body th { background: var(--vscode-textBlockQuote-background); font-weight: 600; }

  /* Links */
  .issue-link {
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    font-weight: 600;
  }
  .issue-link:hover { text-decoration: underline; }

  /* Monitor header */
  .monitor-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .polling-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-left: auto;
  }
  .polling-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #d97706;
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

  /* Agent status indicator */
  .agent-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid var(--vscode-panel-border);
  }
  .status-analyzing { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
  .status-planning { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.3); }
  .status-awaiting-approval { background: rgba(234, 179, 8, 0.1); border-color: rgba(234, 179, 8, 0.3); }
  .status-approval-sent { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
  .status-implementing { background: rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.3); }
  .status-testing { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.3); }
  .status-complete { background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); }
  .status-working { background: rgba(107, 114, 128, 0.1); border-color: rgba(107, 114, 128, 0.3); }

  /* Timeline */
  .timeline {
    max-height: 60vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px 0;
  }
  .timeline-empty {
    text-align: center;
    padding: 32px;
    color: var(--vscode-descriptionForeground);
  }
  .timeline-card {
    padding: 12px 16px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
  }
  .timeline-card.bot {
    border-left: 3px solid var(--vscode-button-background);
    background: rgba(124, 58, 237, 0.03);
  }
  .timeline-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
  }
  .timeline-avatar {
    width: 20px; height: 20px;
    border-radius: 50%;
  }
  .bot-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  .edited-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }
  .timeline-time {
    color: var(--vscode-descriptionForeground);
    margin-left: auto;
    font-size: 11px;
  }
  .timeline-body {
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;
  }
  .timeline-body code {
    background: var(--vscode-textCodeBlock-background);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
  }
  .timeline-body pre {
    background: var(--vscode-textCodeBlock-background);
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 8px 0;
  }
  .timeline-body h3 { margin-top: 12px; font-size: 15px; }
  .timeline-body h4 { margin-top: 8px; font-size: 13px; }

  /* Approve / Replan banner */
  .approve-banner {
    padding: 12px 16px;
    border-radius: 6px;
    background: rgba(124, 58, 237, 0.08);
    border: 1px solid rgba(124, 58, 237, 0.3);
    margin-top: 12px;
    font-size: 13px;
  }
  .approve-banner.approved {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.3);
  }

  /* PR banner */
  .pr-banner {
    padding: 12px 16px;
    border-radius: 6px;
    border: 1px solid rgba(34, 197, 94, 0.4);
    background: rgba(34, 197, 94, 0.05);
    margin-bottom: 12px;
  }
  .pr-banner-draft {
    border-color: rgba(210, 153, 34, 0.4);
    background: rgba(210, 153, 34, 0.05);
  }
  .pr-banner h4 { font-size: 13px; margin-bottom: 4px; }
  .pr-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }
  .checks-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
  }
  .checks-passing { background: #22c55e; }
  .checks-failing { background: #ef4444; }
  .checks-pending { background: #d97706; }
  .checks-unknown { background: #6b7280; }

  .monitor-waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px;
    color: var(--vscode-descriptionForeground);
  }

  /* Mesh sync banner */
  .mesh-sync-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: rgba(210, 153, 34, 0.12);
    border: 1px solid rgba(210, 153, 34, 0.4);
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--vscode-foreground);
  }
  .mesh-sync-banner .btn-sm {
    padding: 3px 10px;
    font-size: 11px;
    margin-left: auto;
  }

  /* Feedback */
  .error-banner {
    padding: 10px 14px;
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    margin-bottom: 12px;
    font-size: 13px;
  }

  .loading-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--vscode-editor-background);
    opacity: 0.9;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    z-index: 10;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--vscode-panel-border);
    border-top-color: var(--vscode-button-background);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .text-muted { color: var(--vscode-descriptionForeground); font-size: 13px; }
`;
document.head.appendChild(style);

// ============================================================================
// Init
// ============================================================================

render();
vscode.postMessage({ type: 'ready' });
