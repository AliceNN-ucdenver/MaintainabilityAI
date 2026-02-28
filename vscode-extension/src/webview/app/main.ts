// Webview frontend — runs in the browser context inside VS Code
// Communicates with extension via postMessage/onMessage
// Phase-based wizard: Input → Review → Submit → Assign → Monitor → Complete

import { escapeHtml, escapeAttr, formatTimestamp } from './pillars/shared';
import type { VsCodeApi, PromptPackInfo, RctroPrompt, IssueComment, LinkedPullRequest, GitHubIssueListItem } from './types';

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

// ============================================================================
// Types (local UI-only types)
// ============================================================================

type Phase = 'input' | 'review' | 'submit' | 'assign';
type ViewMode = 'hub' | 'create' | 'manage';

// ============================================================================
// State
// ============================================================================

const PHASE_ORDER: Phase[] = ['input', 'review', 'submit', 'assign'];

const state = {
  currentPhase: 'input' as Phase,
  rctro: null as RctroPrompt | null,
  rctroMarkdown: '',
  issueNumber: null as number | null,
  issueUrl: null as string | null,
  comments: [] as IssueComment[],
  labels: [] as string[],
  linkedPr: null as LinkedPullRequest | null,
  allPacks: [] as PromptPackInfo[],
  detectedStack: null as Record<string, string> | null,
  detectedMetadata: null as { language?: string; module_system?: string; testing?: string; llm?: { model_family?: string } } | null,
  repo: null as { owner: string; repo: string } | null,
  iterationCount: 0,
  isLoading: false,
  errorMessage: '',
  showFeedback: false,
  workflowWarning: false,
  assignedAgent: null as 'claude' | 'copilot' | null,
  availableModels: [] as { id: string; family: string; name: string; vendor: string; version: string; maxInputTokens: number }[],
  selectedModelFamily: 'codex',
  isComponentMode: false,
  viewMode: 'hub' as ViewMode,
  hubIssues: [] as GitHubIssueListItem[],
  hubHasMore: false,
  hubPage: 1,
  // Workspace folders (shared across panels)
  workspaceFolders: [] as { name: string; path: string }[],
  selectedFolder: '',
};

const contentEl = document.getElementById('phaseContent')!;
const repoInfoEl = document.getElementById('repo-info')!;


// ============================================================================
// Phase Navigation
// ============================================================================

function goToPhase(phase: Phase) {
  state.currentPhase = phase;
  state.errorMessage = '';

  // Update sidebar
  document.querySelectorAll('.phase-item').forEach(el => {
    const itemPhase = (el as HTMLElement).dataset.phase as Phase;
    const idx = PHASE_ORDER.indexOf(itemPhase);
    const currentIdx = PHASE_ORDER.indexOf(phase);

    if (itemPhase === phase) {
      el.className = 'phase-item active';
    } else if (idx < currentIdx) {
      el.className = 'phase-item completed';
    } else {
      el.className = 'phase-item pending';
    }
  });

  // Render content
  switch (phase) {
    case 'input': renderInputPhase(); break;
    case 'review': renderReviewPhase(); break;
    case 'submit': renderSubmitPhase(); break;
    case 'assign': renderAssignPhase(); break;
  }
}

// ============================================================================
// Phase 1: Input & Generate
// ============================================================================

function renderInputPhase() {
  const repoHint = state.repo ? `<span class="repo-hint" style="font-size: 12px; color: var(--text-secondary); font-weight: 400; margin-left: 12px;">${escapeHtml(state.repo.owner)}/${escapeHtml(state.repo.repo)}</span>` : '';

  contentEl.innerHTML = `
    <h2>Describe Your Feature${repoHint}</h2>

    <div class="two-col">
      <div>
        <label for="template">Start from Template</label>
        <select id="template">
          <option value="">Custom (blank)</option>
        </select>
      </div>
      <div>
        <label for="lang-select">Language / Module System</label>
        <select id="lang-select">
          <option value="javascript-cjs">JavaScript (CommonJS)</option>
          <option value="javascript-esm">JavaScript (ESM)</option>
          <option value="typescript-cjs">TypeScript (CommonJS)</option>
          <option value="typescript-esm">TypeScript (ESM)</option>
          <option value="python">Python</option>
          <option value="react-vite">React + Vite (TypeScript)</option>
        </select>
      </div>
    </div>

    <div class="two-col" style="margin-top: 12px;">
      <div>
        <label for="test-select">Testing Framework</label>
        <select id="test-select">
          <option value="jest">Jest</option>
          <option value="vitest">Vitest</option>
          <option value="mocha">Mocha</option>
          <option value="pytest">Pytest</option>
          <option value="cypress">Cypress</option>
          <option value="playwright">Playwright</option>
        </select>
      </div>
      <div>
        <label for="model-select">LLM Model</label>
        <select id="model-select">
          <option value="codex" selected>Codex 5.3 (loading...)</option>
        </select>
        <div id="model-info" style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;"></div>
      </div>
    </div>
    <div style="margin-top: 6px;">
      <div id="stack-display" class="stack-display" style="font-size: 11px; color: var(--text-secondary);">Detecting workspace...</div>
    </div>

    <div style="margin-top: 16px;">
      <label for="description">Feature Description</label>
      <textarea id="description" style="min-height: 120px;" placeholder="Describe the feature you want to build. Be specific about functionality, user interactions, and any security considerations..."></textarea>
    </div>

    <div style="margin-top: 16px;">
      <div class="default-pack-header">
        <span class="default-pack-badge">ALWAYS INCLUDED</span>
        <span style="font-weight: 500;">Default Pack &mdash; Security-First Baseline</span>
      </div>
      <div class="default-pack-desc">
        OWASP Top 10 awareness, DRY principle, fitness functions, secure defaults, structured error handling, security-focused tests.
      </div>
    </div>

    <div style="margin-top: 12px;">
      <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none;">
        <input type="checkbox" id="advanced-packs-checkbox" />
        <span style="font-weight: 500;">Custom Packs</span>
        <span id="pack-counter" style="font-size: 11px; color: var(--text-secondary);">(0 / 5 selected)</span>
      </label>
    </div>
    <div id="pack-section-collapsible" style="display: none;">
      <div class="two-col">
        <div>
          <div class="category-group">
            <h4>OWASP Top 10</h4>
            <div id="owasp-packs"></div>
          </div>
          <div class="category-group">
            <h4>Maintainability</h4>
            <div id="maint-packs"></div>
          </div>
        </div>
        <div>
          <div class="category-group">
            <h4>Threat Model (STRIDE)</h4>
            <div id="stride-packs"></div>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top: 20px; display: flex; gap: 8px;">
      <button id="btn-generate" class="btn-primary">Generate RCTRO Prompt</button>
    </div>

    <div id="loading" class="loading">
      <div class="spinner"></div>
      <span>Generating RCTRO prompt...</span>
    </div>
    <div id="error" class="error-msg"></div>
  `;

  // Populate packs
  if (state.allPacks.length > 0) {
    renderPromptPacks(state.allPacks);
  }

  // Advanced Prompt Packs toggle
  const advToggle = document.getElementById('advanced-packs-checkbox') as HTMLInputElement | null;
  if (advToggle) {
    advToggle.addEventListener('change', () => {
      const section = document.getElementById('pack-section-collapsible');
      if (section) { section.style.display = advToggle.checked ? '' : 'none'; }
    });
  }

  // Populate dropdowns + display from detected stack
  if (state.detectedStack) {
    renderStack(state.detectedStack);
  }

  // Override with repo-metadata.yml values (more specific than detection)
  if (state.detectedMetadata) {
    applyMetadataDefaults(state.detectedMetadata);
  }

  // Populate model dropdown from cached state
  if (state.availableModels.length > 0) {
    populateModelDropdown(state.availableModels, state.selectedModelFamily);
  }

  // Populate templates
  const templateEl = document.getElementById('template') as HTMLSelectElement;
  const templates = [
    { id: 'api-endpoint', name: 'New API Endpoint' },
    { id: 'auth-feature', name: 'Authentication Feature' },
    { id: 'data-pipeline', name: 'Data Processing Pipeline' },
    { id: 'frontend-component', name: 'Frontend Component' },
  ];
  for (const tmpl of templates) {
    const opt = document.createElement('option');
    opt.value = tmpl.id;
    opt.textContent = tmpl.name;
    templateEl.appendChild(opt);
  }
  templateEl.addEventListener('change', () => {
    if (templateEl.value) {
      vscode.postMessage({ type: 'selectTemplate', templateId: templateEl.value });
    }
  });

  // Generate button
  document.getElementById('btn-generate')!.addEventListener('click', () => {
    const desc = (document.getElementById('description') as HTMLTextAreaElement).value.trim();
    if (!desc) {
      showError('Please describe the feature you want to build.');
      return;
    }
    hideError();
    const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
    vscode.postMessage({
      type: 'generate',
      description: desc,
      packs: getSelectedPacks(),
      template: templateEl.value || undefined,
      stackOverrides: getStackOverrides(),
      modelOverride: modelSelect.value || undefined,
    });
  });

  if (state.isLoading) {
    document.getElementById('loading')!.classList.add('active');
  }
}

// ============================================================================
// Phase 2: Review RCTRO
// ============================================================================

function renderReviewPhase() {
  state.showFeedback = false;

  const reviewRepoHint = state.repo ? `<span class="repo-hint" style="font-size: 12px; color: var(--text-secondary); font-weight: 400; margin-left: 12px;">${escapeHtml(state.repo.owner)}/${escapeHtml(state.repo.repo)}</span>` : '';

  contentEl.innerHTML = `
    <h2>Review Generated RCTRO${reviewRepoHint}</h2>
    <div class="rctro-preview" id="rctro-preview">${escapeHtml(state.rctroMarkdown)}</div>

    <div class="review-actions">
      <button id="btn-accept" class="btn-success">Accept &amp; Create Issue on GitHub</button>
      <button id="btn-request-changes" class="btn-secondary">Request Changes</button>
      <button id="btn-cancel-review" class="btn-secondary" style="margin-left: auto;">Cancel</button>
      <span class="iteration-badge" id="iteration-badge">${state.iterationCount > 1 ? `Round ${state.iterationCount}` : ''}</span>
    </div>

    <div class="feedback-area" id="feedback-area" style="display: none;">
      <label for="feedback">What should be changed?</label>
      <textarea id="feedback" placeholder="Describe what to improve, add, or remove from the RCTRO prompt..."></textarea>
      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <button id="btn-send-feedback" class="btn-primary">Regenerate</button>
        <button id="btn-cancel-feedback" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <div id="loading" class="loading">
      <div class="spinner"></div>
      <span>Regenerating RCTRO prompt...</span>
    </div>
    <div id="error" class="error-msg"></div>
  `;

  document.getElementById('btn-accept')!.addEventListener('click', () => {
    vscode.postMessage({ type: 'acceptRctro' });
    goToPhase('submit');
  });

  document.getElementById('btn-request-changes')!.addEventListener('click', () => {
    document.getElementById('feedback-area')!.style.display = 'block';
    (document.getElementById('feedback') as HTMLTextAreaElement).focus();
  });

  document.getElementById('btn-cancel-review')!.addEventListener('click', () => {
    state.rctro = null;
    state.rctroMarkdown = '';
    state.iterationCount = 0;
    goToPhase('input');
  });

  document.getElementById('btn-send-feedback')!.addEventListener('click', () => {
    const feedback = (document.getElementById('feedback') as HTMLTextAreaElement).value.trim();
    if (!feedback) { return; }
    vscode.postMessage({ type: 'rejectRctro', feedback });
  });

  document.getElementById('btn-cancel-feedback')!.addEventListener('click', () => {
    document.getElementById('feedback-area')!.style.display = 'none';
  });

  if (state.isLoading) {
    document.getElementById('loading')!.classList.add('active');
  }
}

// ============================================================================
// Phase 3: Submit to GitHub
// ============================================================================

function renderSubmitPhase() {
  const autoTitle = state.rctro ? generateIssueTitle(state.rctro) : '';

  contentEl.innerHTML = `
    <h2>Submit to GitHub</h2>

    <div style="margin-bottom: 16px;">
      <label for="issue-title">Issue Title</label>
      <input type="text" id="issue-title" value="${escapeAttr(autoTitle)}" placeholder="Feature title for the GitHub issue..." />
    </div>

    ${state.repo ? `<p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">Repository: ${escapeHtml(state.repo.owner)}/${escapeHtml(state.repo.repo)}</p>` : ''}

    <button id="btn-submit" class="btn-success" style="padding: 10px 32px;">Create Issue on GitHub</button>

    <div id="loading" class="loading">
      <div class="spinner"></div>
      <span>Creating issue...</span>
    </div>
    <div id="error" class="error-msg"></div>
    <div id="issue-result" class="issue-url" style="display: none;"></div>
  `;

  document.getElementById('btn-submit')!.addEventListener('click', () => {
    const title = (document.getElementById('issue-title') as HTMLInputElement).value.trim();
    if (!title) {
      showError('Please enter an issue title.');
      return;
    }
    if (!state.rctro) {
      showError('No RCTRO prompt generated.');
      return;
    }
    hideError();
    (document.getElementById('btn-submit') as HTMLButtonElement).disabled = true;
    vscode.postMessage({ type: 'submit', rctro: state.rctro, title });
  });

  if (state.isLoading) {
    document.getElementById('loading')!.classList.add('active');
  }
}

// ============================================================================
// Phase 4: Assign Agent
// ============================================================================

function renderAssignPhase() {
  contentEl.innerHTML = `
    <h2>Assign an AI Agent</h2>
    <p style="color: var(--text-secondary); margin-bottom: 4px;">
      Issue <a id="issue-link" style="color: var(--accent); cursor: pointer;">#${escapeHtml(String(state.issueNumber))}</a> created successfully.
    </p>
    <p style="color: var(--text-secondary); font-size: 12px; margin-bottom: 16px;">Choose who should implement this feature:</p>

    <div class="agent-cards">
      <div class="agent-card" id="assign-claude">
        <h4>Claude / Alice</h4>
        <p>Posts <code>@claude</code> comment to trigger the 2-phase remediation workflow: plan first, then implement after approval.</p>
      </div>
      <div class="agent-card" id="assign-copilot">
        <h4>Copilot</h4>
        <p>Posts a comment assigning the implementation to GitHub Copilot. The RCTRO prompt serves as the spec.</p>
      </div>
      <div class="agent-card" id="assign-skip">
        <h4>Skip</h4>
        <p>Don't assign now. You can manually assign later from the issue page.</p>
      </div>
    </div>

    <div id="workflow-warning" class="workflow-warning" style="display: none;">
      Note: The <code>alice-remediation.yml</code> workflow was not found in this repository.
      The @claude comment will be posted, but automated analysis won't trigger until the workflow is added.
      Use "Scaffold SDLC Structure" to add it.
    </div>

    <div id="loading" class="loading">
      <div class="spinner"></div>
      <span>Assigning agent...</span>
    </div>
    <div id="error" class="error-msg"></div>
  `;

  document.getElementById('issue-link')!.addEventListener('click', () => {
    if (state.issueUrl) { vscode.postMessage({ type: 'openUrl', url: state.issueUrl }); }
  });

  document.getElementById('assign-claude')!.addEventListener('click', () => {
    vscode.postMessage({ type: 'assignAgent', agent: 'claude' });
  });

  document.getElementById('assign-copilot')!.addEventListener('click', () => {
    vscode.postMessage({ type: 'assignAgent', agent: 'copilot' });
  });

  document.getElementById('assign-skip')!.addEventListener('click', () => {
    vscode.postMessage({ type: 'assignAgent', agent: 'skip' });
  });
}

// Monitor/Complete phases removed — monitoring happens on the Security Scorecard.

// Monitor, Complete, and Timeline phases removed — monitoring lives on the Security Scorecard.

// ============================================================================
// Issue List Hub
// ============================================================================

const CREATE_PHASES: Phase[] = ['input', 'review', 'submit'];
const MANAGE_PHASES: Phase[] = ['assign'];

function resetIssueState() {
  state.rctro = null;
  state.rctroMarkdown = '';
  state.issueNumber = null;
  state.issueUrl = null;
  state.comments = [];
  state.linkedPr = null;
  state.iterationCount = 0;
  state.errorMessage = '';
  state.workflowWarning = false;
  state.assignedAgent = null;
  state.isComponentMode = false;
}

function setViewMode(mode: ViewMode) {
  state.viewMode = mode;
  const sidebar = document.querySelector('.phase-sidebar') as HTMLElement;
  const phaseList = document.getElementById('phaseList');
  const existingBack = document.getElementById('back-to-hub-link');

  if (mode === 'hub') {
    // Hide entire sidebar in hub mode (full-page layout like Oraculum)
    if (sidebar) { sidebar.style.display = 'none'; }
    if (existingBack) { existingBack.remove(); }
    const appEl = document.querySelector('.app') as HTMLElement;
    if (appEl) { appEl.style.gridTemplateColumns = '1fr'; }
  } else {
    // Show sidebar in create/manage modes
    if (sidebar) { sidebar.style.display = ''; }
    const appEl = document.querySelector('.app') as HTMLElement;
    if (appEl) { appEl.style.gridTemplateColumns = '200px 1fr'; }
    if (phaseList) { phaseList.style.display = ''; }

    // Show/hide phase items based on mode
    const visiblePhases = mode === 'create' ? CREATE_PHASES : MANAGE_PHASES;
    document.querySelectorAll('.phase-item').forEach(el => {
      const phase = (el as HTMLElement).dataset.phase as Phase;
      (el as HTMLElement).style.display = visiblePhases.includes(phase) ? '' : 'none';
    });

    // Renumber visible items
    let num = 1;
    document.querySelectorAll('.phase-item').forEach(el => {
      const phase = (el as HTMLElement).dataset.phase as Phase;
      if (visiblePhases.includes(phase)) {
        const numEl = el.querySelector('.phase-num');
        if (numEl) { numEl.textContent = String(num++); }
      }
    });

    // Add "Back to Rabbit Hole" link if not present
    if (!document.getElementById('back-to-hub-link') && sidebar) {
      const link = document.createElement('a');
      link.id = 'back-to-hub-link';
      link.textContent = '\u2190 Back to Rabbit Hole';
      link.addEventListener('click', () => goToHub());
      sidebar.insertBefore(link, phaseList);
    }
  }
}

function goToHub() {
  resetIssueState();
  vscode.postMessage({ type: 'backToHub' });
  vscode.postMessage({ type: 'loadIssues', page: 1 });
  setViewMode('hub');
  renderIssueListHub();
}

function renderFolderDropdown(): string {
  if (state.isComponentMode) { return ''; }
  if (state.workspaceFolders.length < 2) { return ''; }
  const options = state.workspaceFolders.map(f =>
    `<option value="${escapeAttr(f.path)}" ${f.path === state.selectedFolder ? 'selected' : ''}>${escapeHtml(f.name)}</option>`
  ).join('');
  return `<select id="folder-select" class="folder-select" title="Workspace folder">${options}</select>`;
}

function attachFolderSelect() {
  const select = document.getElementById('folder-select') as HTMLSelectElement | null;
  select?.addEventListener('change', () => {
    state.selectedFolder = select.value;
    vscode.postMessage({ type: 'switchFolder', folderPath: select.value });
  });
}

function renderIssueListHub() {
  contentEl.innerHTML = `
    <div class="hub-layout">
      <div class="hub-header">
        <div>
          <h2 style="margin-bottom: 4px;">&#x1F407; Rabbit Hole</h2>
          <span style="color: var(--text-secondary); font-size: 12px;">
            ${state.repo ? `${escapeHtml(state.repo.owner)}/${escapeHtml(state.repo.repo)}` : 'No repository detected'}
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${renderFolderDropdown()}
          <button id="btn-refresh" class="btn-secondary btn-sm">Refresh</button>
        </div>
      </div>

      <div id="issue-list">
        ${state.hubIssues.length === 0
          ? `<div class="hub-empty">
              ${state.isLoading
                ? '<div class="spinner"></div><p>Loading issues...</p>'
                : '<p>No open issues found.</p><p style="font-size: 12px; color: var(--text-secondary);">Create features from the Security Scorecard.</p>'}
            </div>`
          : state.hubIssues.map(renderIssueRow).join('')
        }
      </div>

      ${state.hubHasMore ? `<div style="text-align: center; padding: 12px;">
        <button id="btn-load-more" class="btn-secondary">Load More</button>
      </div>` : ''}

      <div id="loading" class="loading">
        <div class="spinner"></div>
        <span>Loading issues...</span>
      </div>
    </div>
  `;

  attachFolderSelect();

  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    state.hubPage = 1;
    vscode.postMessage({ type: 'loadIssues', page: 1 });
  });

  document.getElementById('btn-load-more')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'loadIssues', page: state.hubPage + 1 });
  });

  // Attach click handlers to issue rows
  document.querySelectorAll('.issue-row').forEach(row => {
    row.addEventListener('click', () => {
      const num = parseInt((row as HTMLElement).dataset.issueNumber || '0', 10);
      const url = (row as HTMLElement).dataset.issueUrl || '';
      if (num) { selectIssueFromHub(num, url); }
    });
  });

  if (state.isLoading) {
    document.getElementById('loading')?.classList.add('active');
  }
}

function renderIssueRow(issue: GitHubIssueListItem): string {
  const labels = issue.labels.map(l =>
    `<span class="issue-label" style="background: #${l.color}20; color: #${l.color}; border: 1px solid #${l.color}40;">${escapeHtml(l.name)}</span>`
  ).join('');

  const assignee = issue.assignee
    ? `<span style="color: var(--text-secondary);">@${escapeHtml(issue.assignee)}</span>`
    : '';
  const comments = issue.commentsCount > 0
    ? `<span style="color: var(--text-secondary);">&#x1F4AC; ${issue.commentsCount}</span>`
    : '';

  return `
    <div class="issue-row" data-issue-number="${issue.number}" data-issue-url="${escapeAttr(issue.url)}">
      <span class="issue-number">#${issue.number}</span>
      <div class="issue-content">
        <div class="issue-title">${escapeHtml(issue.title)}</div>
        <div class="issue-meta">
          ${labels}
          ${assignee}
          ${comments}
          <span class="issue-time">${formatTimestamp(issue.createdAt)}</span>
        </div>
      </div>
    </div>
  `;
}

function selectIssueFromHub(issueNumber: number, issueUrl: string) {
  state.issueNumber = issueNumber;
  state.issueUrl = issueUrl;
  vscode.postMessage({ type: 'selectIssue', issueNumber, issueUrl });
  setViewMode('manage');
  goToPhase('assign');
}

// ============================================================================
// Pack Rendering (used by Input phase)
// ============================================================================

function renderPromptPacks(packs: PromptPackInfo[]) {
  const owasp = packs.filter(p => p.category === 'owasp');
  const maint = packs.filter(p => p.category === 'maintainability');
  const stride = packs.filter(p => p.category === 'threat-modeling');

  const owaspEl = document.getElementById('owasp-packs');
  const maintEl = document.getElementById('maint-packs');
  const strideEl = document.getElementById('stride-packs');

  if (owaspEl) { owaspEl.innerHTML = owasp.map(p => checkbox(p)).join(''); }
  if (maintEl) { maintEl.innerHTML = maint.map(p => checkbox(p)).join(''); }
  if (strideEl) { strideEl.innerHTML = stride.map(p => checkbox(p)).join(''); }

  attachPackLimitListeners();
  enforcePackLimit();
}

function checkbox(pack: PromptPackInfo): string {
  const safeId = escapeAttr(pack.id);
  const safeCat = escapeAttr(pack.category);
  const safeName = escapeHtml(pack.name);
  return `<div class="checkbox-item">
    <input type="checkbox" id="pack-${safeId}" data-category="${safeCat}" value="${safeId}" />
    <label for="pack-${safeId}">${safeName}</label>
  </div>`;
}

function getSelectedPacks() {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked');
  const selection = { owasp: [] as string[], maintainability: [] as string[], threatModeling: [] as string[] };

  checkboxes.forEach(cb => {
    const cat = cb.dataset.category;
    if (cat === 'owasp') { selection.owasp.push(cb.value); }
    else if (cat === 'maintainability') { selection.maintainability.push(cb.value); }
    else if (cat === 'threat-modeling') { selection.threatModeling.push(cb.value); }
  });

  return selection;
}

function setSelectedPacks(packs: { owasp: string[]; maintainability: string[]; threatModeling: string[] }) {
  document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  const allIds = [...packs.owasp, ...packs.maintainability, ...packs.threatModeling];
  // Respect the pack limit — only check up to MAX_PROMPT_PACKS
  const limited = allIds.slice(0, MAX_PROMPT_PACKS);
  for (const id of limited) {
    const cb = document.getElementById(`pack-${id}`) as HTMLInputElement | null;
    if (cb) { cb.checked = true; }
  }
  enforcePackLimit();
}

const MAX_PROMPT_PACKS = 5;

/** Count checked pack checkboxes, update counter, and disable/enable accordingly. */
function enforcePackLimit() {
  const allPackCbs = document.querySelectorAll<HTMLInputElement>('#pack-section-collapsible input[type="checkbox"]');
  let count = 0;
  allPackCbs.forEach(cb => { if (cb.checked) { count++; } });

  // Update counter text
  const counter = document.getElementById('pack-counter');
  if (counter) {
    counter.textContent = `(${count} / ${MAX_PROMPT_PACKS} selected)`;
    counter.style.color = count >= MAX_PROMPT_PACKS ? 'var(--text-warning, #e5a00d)' : 'var(--text-secondary)';
  }

  // Disable unchecked boxes when at limit
  allPackCbs.forEach(cb => {
    if (!cb.checked) {
      cb.disabled = count >= MAX_PROMPT_PACKS;
    } else {
      cb.disabled = false;
    }
  });
}

/** Attach change listeners to all pack checkboxes for limit enforcement. */
function attachPackLimitListeners() {
  const container = document.getElementById('pack-section-collapsible');
  if (!container) { return; }
  container.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.type === 'checkbox' && target.dataset.category) {
      enforcePackLimit();
    }
  });
}

function populateModelDropdown(
  models: { id: string; family: string; name: string; vendor: string; version: string; maxInputTokens: number }[],
  defaultFamily: string
) {
  const select = document.getElementById('model-select') as HTMLSelectElement | null;
  if (!select) { return; }

  // Clear existing options
  select.innerHTML = '';

  if (models.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No models available';
    select.appendChild(opt);
    return;
  }

  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m.family;
    const label = m.version ? `${m.name} (${m.version})` : m.name;
    const tokens = m.maxInputTokens ? ` — ${(m.maxInputTokens / 1000).toFixed(0)}k tokens` : '';
    opt.textContent = `${label}${tokens}`;
    if (m.family === defaultFamily) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }

  // Show model info below dropdown
  updateModelInfo(select.value, models);
  select.addEventListener('change', () => {
    updateModelInfo(select.value, models);
    state.selectedModelFamily = select.value;
  });
}

function updateModelInfo(family: string, models: { id: string; family: string; vendor: string; version: string; maxInputTokens: number }[]) {
  const infoEl = document.getElementById('model-info');
  if (!infoEl) { return; }
  const model = models.find(m => m.family === family);
  if (model) {
    infoEl.textContent = `${model.vendor} · ${model.id}`;
  } else {
    infoEl.textContent = '';
  }
}

function renderStack(stack: Record<string, string>) {
  state.detectedStack = stack;

  // Set dropdown defaults from detected values
  applyDetectedDefaults(stack);

  // Show remaining auto-detected fields (not covered by dropdowns) as compact info
  const el = document.getElementById('stack-display');
  if (!el) { return; }

  const skipKeys = new Set(['language', 'runtime', 'testing']);
  const entries = Object.entries(stack).filter(([k, v]) => v !== 'Unknown' && !skipKeys.has(k));
  if (entries.length === 0) {
    el.textContent = 'No additional stack info detected.';
    return;
  }

  el.innerHTML = 'Detected: ' + entries.map(([, v]) => escapeHtml(v)).join(', ');
}

function applyDetectedDefaults(stack: Record<string, string>) {
  const langEl = document.getElementById('lang-select') as HTMLSelectElement | null;
  const testEl = document.getElementById('test-select') as HTMLSelectElement | null;

  if (langEl) {
    const lang = (stack.language || '').toLowerCase();
    const runtime = (stack.runtime || '').toLowerCase();
    const framework = (stack.framework || '').toLowerCase();

    if (lang.includes('python')) {
      langEl.value = 'python';
    } else if (framework.includes('react') || framework.includes('vite')) {
      langEl.value = 'react-vite';
    } else if (lang.includes('typescript')) {
      langEl.value = runtime.includes('esm') || runtime.includes('esnext') ? 'typescript-esm' : 'typescript-cjs';
    } else if (lang.includes('javascript')) {
      langEl.value = runtime.includes('esm') || runtime.includes('module') ? 'javascript-esm' : 'javascript-cjs';
    }
  }

  if (testEl) {
    const testing = (stack.testing || '').toLowerCase();
    if (testing.includes('vitest')) { testEl.value = 'vitest'; }
    else if (testing.includes('mocha')) { testEl.value = 'mocha'; }
    else if (testing.includes('pytest')) { testEl.value = 'pytest'; }
    else if (testing.includes('cypress')) { testEl.value = 'cypress'; }
    else if (testing.includes('playwright')) { testEl.value = 'playwright'; }
    else if (testing.includes('jest')) { testEl.value = 'jest'; }
  }
}

function applyMetadataDefaults(meta: { language?: string; module_system?: string; testing?: string; llm?: { model_family?: string } }) {
  const langEl = document.getElementById('lang-select') as HTMLSelectElement | null;
  const testEl = document.getElementById('test-select') as HTMLSelectElement | null;

  if (langEl && meta.language) {
    const mod = meta.module_system || '';
    let val = '';
    if (meta.language === 'Python') { val = 'python'; }
    else if (meta.language === 'TypeScript' && mod === 'ESM') { val = 'typescript-esm'; }
    else if (meta.language === 'TypeScript') { val = 'typescript-cjs'; }
    else if (meta.language === 'JavaScript' && mod === 'ESM') { val = 'javascript-esm'; }
    else if (meta.language === 'JavaScript') { val = 'javascript-cjs'; }
    if (val) { langEl.value = val; }
  }

  if (testEl && meta.testing) {
    testEl.value = meta.testing.toLowerCase();
  }

  if (meta.llm?.model_family) {
    state.selectedModelFamily = meta.llm.model_family;
    const modelEl = document.getElementById('model-select') as HTMLSelectElement | null;
    if (modelEl) {
      for (const opt of Array.from(modelEl.options)) {
        if (opt.value === meta.llm.model_family) {
          modelEl.value = meta.llm.model_family;
          break;
        }
      }
    }
  }
}

function getStackOverrides(): Record<string, string> {
  const langEl = document.getElementById('lang-select') as HTMLSelectElement | null;
  const testEl = document.getElementById('test-select') as HTMLSelectElement | null;

  const langVal = langEl?.value || 'typescript-esm';
  const testVal = testEl?.value || 'jest';

  const overrides: Record<string, string> = {};

  switch (langVal) {
    case 'javascript-cjs':
      overrides.language = 'JavaScript';
      overrides.runtime = 'Node.js (CommonJS)';
      break;
    case 'javascript-esm':
      overrides.language = 'JavaScript';
      overrides.runtime = 'Node.js (ESM)';
      break;
    case 'typescript-cjs':
      overrides.language = 'TypeScript';
      overrides.runtime = 'Node.js (CommonJS)';
      break;
    case 'typescript-esm':
      overrides.language = 'TypeScript';
      overrides.runtime = 'Node.js (ESM)';
      break;
    case 'python':
      overrides.language = 'Python';
      overrides.runtime = 'Python 3';
      break;
    case 'react-vite':
      overrides.language = 'TypeScript';
      overrides.runtime = 'Vite';
      overrides.framework = 'React';
      break;
  }

  switch (testVal) {
    case 'jest': overrides.testing = 'Jest'; break;
    case 'vitest': overrides.testing = 'Vitest'; break;
    case 'mocha': overrides.testing = 'Mocha'; break;
    case 'pytest': overrides.testing = 'Pytest'; break;
    case 'cypress': overrides.testing = 'Cypress'; break;
    case 'playwright': overrides.testing = 'Playwright'; break;
  }

  return overrides;
}

// ============================================================================
// Helpers
// ============================================================================

function generateIssueTitle(rctro: RctroPrompt): string {
  // Prefer LLM-generated title if available
  if (rctro.title && rctro.title.trim().length > 0) {
    return rctro.title.trim();
  }

  // Fallback: extract from task field
  let raw = rctro.task;
  const dotIdx = raw.indexOf('.');
  if (dotIdx > 0 && dotIdx < 120) {
    raw = raw.substring(0, dotIdx);
  }

  raw = raw.replace(
    /^(implement|create|build|design|develop|add|set up|configure|establish)\s+(a\s+new\s+|a\s+|an\s+|the\s+)?/i,
    ''
  );

  raw = raw.charAt(0).toUpperCase() + raw.slice(1);

  if (raw.length > 55) {
    const truncated = raw.substring(0, 55);
    const lastSpace = truncated.lastIndexOf(' ');
    raw = lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated;
  }

  return `feat: ${raw}`;
}

function showError(msg: string) {
  const el = document.getElementById('error');
  if (el) { el.textContent = msg; }
}

function hideError() {
  const el = document.getElementById('error');
  if (el) { el.textContent = ''; }
}

// ============================================================================
// Message Handling (from extension)
// ============================================================================

window.addEventListener('message', (event) => {
  if (event.origin !== window.origin) { return; }
  const message = event.data;

  switch (message.type) {
    case 'rctroGenerated':
      state.rctro = message.rctro;
      state.rctroMarkdown = message.markdown;
      state.iterationCount++;
      if (state.currentPhase === 'input') {
        // Save current selections to repo-metadata.yml
        const overrides = getStackOverrides();
        const modelSel = document.getElementById('model-select') as HTMLSelectElement | null;
        vscode.postMessage({
          type: 'saveMetadata',
          metadata: {
            language: overrides.language || '',
            module_system: (overrides.runtime || '').includes('ESM') ? 'ESM' : (overrides.runtime || '').includes('CommonJS') ? 'CommonJS' : '',
            testing: overrides.testing || '',
            package_manager: '',
            modelFamily: modelSel?.value || undefined,
          },
        });
        // First generation — advance to review
        goToPhase('review');
      } else if (state.currentPhase === 'review') {
        // Regeneration — re-render review phase
        renderReviewPhase();
      }
      break;

    case 'stackDetected':
      renderStack(message.stack);
      if (message.metadata) {
        state.detectedMetadata = message.metadata;
        applyMetadataDefaults(message.metadata);
      }
      break;

    case 'issueCreated':
      state.issueNumber = message.number;
      state.issueUrl = message.url;
      goToHub();
      break;

    case 'error':
      state.errorMessage = message.message;
      showError(message.message);
      // Re-enable sync button if it was in progress
      { const syncBtn = document.getElementById('btn-sync-repo') as HTMLButtonElement | null;
        if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = 'Sync Repo'; } }
      break;

    case 'loading': {
      state.isLoading = message.active;
      const loadingEl = document.getElementById('loading');
      if (loadingEl) {
        loadingEl.classList.toggle('active', message.active);
      }
      break;
    }

    case 'promptPacks':
      state.allPacks = message.packs;
      renderPromptPacks(message.packs);
      break;

    case 'repoDetected':
      state.repo = message.repo;
      repoInfoEl.textContent = `${message.repo.owner}/${message.repo.repo}`;
      // Update the h2 repo hint if currently on input or review phase
      { const h2 = contentEl.querySelector('h2');
        if (h2) {
          let existing = h2.querySelector('.repo-hint');
          if (!existing) {
            existing = document.createElement('span');
            existing.className = 'repo-hint';
            (existing as HTMLElement).style.cssText = 'font-size: 12px; color: var(--text-secondary); font-weight: 400; margin-left: 12px;';
            h2.appendChild(existing);
          }
          existing.textContent = `${message.repo.owner}/${message.repo.repo}`;
        }
      }
      break;

    case 'workspaceFolders':
      state.workspaceFolders = message.folders;
      if (message.selectedPath) {
        state.selectedFolder = message.selectedPath;
      } else if (!state.selectedFolder && message.folders.length > 0) {
        state.selectedFolder = message.folders[0].path;
      }
      // Re-render hub to show/update the folder dropdown
      if (state.viewMode === 'hub') { renderIssueListHub(); }
      break;

    case 'templateLoaded': {
      // Set description and packs in the input phase
      const descEl = document.getElementById('description') as HTMLTextAreaElement | null;
      if (descEl) { descEl.value = message.description; }
      setSelectedPacks(message.packs);
      break;
    }

    case 'prefillDescription': {
      // Switch to create mode and render the input phase so the textarea exists
      resetIssueState();
      // Detect component mode when pre-populated with packs (White Rabbit flow)
      if (message.packs) { state.isComponentMode = true; }
      setViewMode('create');
      goToPhase('input');
      // Now the textarea is rendered — set its value
      const prefillEl = document.getElementById('description') as HTMLTextAreaElement | null;
      if (prefillEl) { prefillEl.value = message.description; }
      // Pre-select prompt packs if provided and auto-expand Custom section
      if (message.packs) {
        setSelectedPacks(message.packs);
        const hasCustomPacks = [...message.packs.owasp, ...message.packs.maintainability, ...message.packs.threatModeling].length > 0;
        if (hasCustomPacks) {
          const advToggle = document.getElementById('advanced-packs-checkbox') as HTMLInputElement | null;
          if (advToggle) {
            advToggle.checked = true;
            const section = document.getElementById('pack-section-collapsible');
            if (section) { section.style.display = ''; }
          }
        }
      }
      break;
    }

    case 'availableModels':
      state.availableModels = message.models;
      state.selectedModelFamily = message.defaultFamily;
      populateModelDropdown(message.models, message.defaultFamily);
      break;

    case 'phaseUpdate': {
      const el = document.querySelector(`[data-phase="${message.phase}"]`);
      if (el) { el.className = `phase-item ${message.status}`; }
      break;
    }

    case 'agentAssigned':
      // Agent assigned — extension host switches to the Security Scorecard.
      // Mark assign phase complete in the sidebar; no further phases here.
      state.assignedAgent = message.agent as 'claude' | 'copilot' | null;
      document.querySelectorAll('.phase-item').forEach(el => {
        el.className = 'phase-item completed';
      });
      break;

    case 'workflowNotFound': {
      state.workflowWarning = true;
      const warningEl = document.getElementById('workflow-warning');
      if (warningEl) { warningEl.style.display = 'block'; }
      break;
    }

    case 'commentsUpdated':
      state.comments = message.comments;
      break;

    case 'prDetected':
      state.linkedPr = message.pr;
      break;

    case 'prStatusUpdated':
      state.linkedPr = message.pr;
      break;

    case 'labelsUpdated':
      state.labels = message.labels;
      break;

    case 'branchCheckedOut':
      // Show a transient notification in the webview
      showError(''); // Clear any errors
      break;

    case 'repoSynced': {
      showError(''); // Clear any errors
      const syncBtn = document.getElementById('btn-sync-repo') as HTMLButtonElement | null;
      if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = 'Sync Repo'; }
      break;
    }

    case 'issuesLoaded':
      if (message.page === 1) {
        state.hubIssues = message.issues;
      } else {
        state.hubIssues = [...state.hubIssues, ...message.issues];
      }
      state.hubHasMore = message.hasMore;
      state.hubPage = message.page;
      if (state.viewMode === 'hub') {
        renderIssueListHub();
      }
      break;

    case 'metadataSaved':
      // Acknowledged — no UI update needed
      break;
  }
});

// ============================================================================
// Initialize
// ============================================================================

vscode.postMessage({ type: 'ready' });
setViewMode('hub');
renderIssueListHub();
