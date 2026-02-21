// Webview frontend — runs in the browser context inside VS Code
// Communicates with extension via postMessage/onMessage
// Phase-based wizard: Input → Review → Submit → Assign → Monitor → Complete

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

// ============================================================================
// Types (mirrored from extension types — can't import in browser context)
// ============================================================================

type Phase = 'input' | 'review' | 'submit' | 'assign' | 'monitor' | 'complete';

interface PromptPackInfo {
  id: string;
  category: string;
  name: string;
  filename: string;
}

interface RctroPrompt {
  title?: string;
  role: string;
  context: string;
  task: string;
  requirements: { title: string; details: string[]; validation: string }[];
  output: string;
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

type ViewMode = 'hub' | 'create' | 'manage';

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

// ============================================================================
// State
// ============================================================================

const PHASE_ORDER: Phase[] = ['input', 'review', 'submit', 'assign', 'monitor', 'complete'];

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
  viewMode: 'hub' as ViewMode,
  hubIssues: [] as GitHubIssueListItem[],
  hubHasMore: false,
  hubPage: 1,
};

const contentEl = document.getElementById('phaseContent')!;
const repoInfoEl = document.getElementById('repo-info')!;

// Inline Cheshire Cat SVG for completion/banner screens (48px)
const CHESHIRE_SVG = `<svg width="48" height="48" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
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

// Sample requirements for the "Load Sample Requirements" button
const SAMPLE_REQUIREMENTS = `Build a Node.js/Express REST API server with the following requirements:

1. In-Memory User Database — Create a module that stores users in an array with save, find, findOne, remove, and update methods. Use crypto.randomBytes for generating user IDs. Pre-seed one default user for Basic auth testing.

2. Environment Configuration — Use a UNIQUE_KEY environment variable (loaded from .env via dotenv). Include .env in .gitignore.

3. Signup & Signin Routes
   - POST /signup: Register a new user (username + password), store via the in-memory DB, hash passwords with bcrypt.
   - POST /signin: Authenticate user, return a signed JWT token on success.

4. Movies CRUD Route (/movies) — Each method MUST return a JSON response using a getJSONObjectForMovieRequirement(req) helper that includes headers from the request, query string from the request, and env set to process.env.UNIQUE_KEY. The exact responses are:
   - GET: { status: 200, message: "GET movies", headers: <req.headers>, query: <req.query>, env: <UNIQUE_KEY> }
   - POST: { status: 200, message: "movie saved", headers: <req.headers>, query: <req.query>, env: <UNIQUE_KEY> }
   - PUT (JWT auth required): { status: 200, message: "movie updated", headers: <req.headers>, query: <req.query>, env: <UNIQUE_KEY> }
   - DELETE (Basic auth required): { status: 200, message: "movie deleted", headers: <req.headers>, query: <req.query>, env: <UNIQUE_KEY> }
   - All other methods (e.g. PATCH): 405 { message: "HTTP method not supported" }

5. Authentication Strategies
   - JWT Strategy (passport-jwt): Verify token from Authorization header for PUT /movies.
   - Basic Strategy (passport-http): Verify username/password against in-memory DB for DELETE /movies. Can use environment variables or the pre-seeded user.

6. Testing — Create tests covering:
   - Valid GET, POST, PUT, DELETE requests on /movies
   - PUT without JWT token (should fail 401)
   - DELETE without Basic auth / with wrong password (should fail 401)
   - Signin → retrieve JWT → use token for PUT (chained test)
   - Unsupported HTTP method returns 405

7. Postman Collection — Generate a Postman v2.1 JSON collection file named after the repository. Include:
   - A request for each endpoint: POST /signup, POST /signin, GET /movies, POST /movies, PUT /movies, DELETE /movies, PATCH /movies (unsupported)
   - Test scripts on each request that assert status codes and response body structure
   - A signin test script that saves the JWT token to a collection variable: pm.collectionVariables.set("jwt_token", pm.response.json().token)
   - PUT /movies request uses Bearer {{jwt_token}} in the Authorization header
   - DELETE /movies request uses Basic auth with the pre-seeded user credentials
   - Include both passing and failing test scenarios (e.g. PUT without token, DELETE with wrong password)`;

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
    case 'monitor': renderMonitorPhase(); break;
    case 'complete': renderCompletePhase(); break;
  }
}

// ============================================================================
// Phase 1: Input & Generate
// ============================================================================

function renderInputPhase() {
  contentEl.innerHTML = `
    <h2>Describe Your Feature</h2>

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
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <label for="description">Feature Description</label>
        <button id="btn-sample-req" class="btn-link" style="font-size: 11px;">Load Sample Requirements</button>
      </div>
      <textarea id="description" style="min-height: 120px;" placeholder="Describe the feature you want to build. Be specific about functionality, user interactions, and any security considerations..."></textarea>
    </div>

    <h3>Prompt Pack Categories</h3>
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

  // Sample requirements button
  document.getElementById('btn-sample-req')!.addEventListener('click', () => {
    const textarea = document.getElementById('description') as HTMLTextAreaElement;
    textarea.value = SAMPLE_REQUIREMENTS;
    textarea.focus();
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

  contentEl.innerHTML = `
    <h2>Review Generated RCTRO</h2>
    <div class="rctro-preview" id="rctro-preview">${escapeHtml(state.rctroMarkdown)}</div>

    <div class="review-actions">
      <button id="btn-accept" class="btn-success">Accept</button>
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

    ${state.repo ? `<p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">Repository: ${state.repo.owner}/${state.repo.repo}</p>` : ''}

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
      Issue <a id="issue-link" style="color: var(--accent); cursor: pointer;">#${state.issueNumber}</a> created successfully.
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

// ============================================================================
// Phase 5: Monitor Progress
// ============================================================================

function renderMonitorPhase() {
  contentEl.innerHTML = `
    <div class="monitor-header">
      <h2 style="margin-bottom: 0;">Monitoring Issue #${state.issueNumber}</h2>
      <a id="monitor-issue-link" style="cursor: pointer;">Open in browser</a>
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
        Comments will appear here as the agent analyzes and implements your feature.
      </div>
    </div>

    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button id="btn-stop-monitoring" class="btn-secondary">Stop Monitoring</button>
      <button id="btn-go-complete" class="btn-primary" style="display: none;">Continue to Summary</button>
    </div>

    <div id="error" class="error-msg"></div>
  `;

  document.getElementById('monitor-issue-link')!.addEventListener('click', () => {
    if (state.issueUrl) { vscode.postMessage({ type: 'openUrl', url: state.issueUrl }); }
  });

  document.getElementById('btn-stop-monitoring')!.addEventListener('click', () => {
    vscode.postMessage({ type: 'stopMonitoring' });
    goToPhase('complete');
  });

  document.getElementById('btn-go-complete')!.addEventListener('click', () => {
    vscode.postMessage({ type: 'stopMonitoring' });
    goToPhase('complete');
  });

  // Render existing comments if any
  if (state.comments.length > 0) {
    updateTimeline(state.comments);
  }

  // Render existing PR if any
  if (state.linkedPr) {
    showPrBanner(state.linkedPr);
  }

  // Start monitoring
  vscode.postMessage({ type: 'startMonitoring' });
}

// ============================================================================
// Phase 6: Complete
// ============================================================================

function renderCompletePhase() {
  vscode.postMessage({ type: 'stopMonitoring' });

  const prSection = state.linkedPr ? `
    <p>Pull Request: <a id="complete-pr-link" style="color: var(--accent); cursor: pointer;">#${state.linkedPr.number} — ${escapeHtml(state.linkedPr.title)}</a></p>
    <p style="font-size: 12px;">Branch: <code>${escapeHtml(state.linkedPr.branch)}</code></p>
  ` : '';

  contentEl.innerHTML = `
    <div class="complete-card">
      <div class="cheshire-header">
        ${CHESHIRE_SVG}
        <h2>The Cheshire Cat grins.</h2>
      </div>
      <p>Issue <a id="complete-issue-link" style="color: var(--accent); cursor: pointer;">#${state.issueNumber}</a> has been created and assigned.</p>
      ${prSection}
      <div class="complete-actions">
        ${state.linkedPr ? `<button id="btn-checkout" class="btn-primary">Checkout Branch Locally</button>` : ''}
        <button id="btn-sync-repo" class="btn-secondary">Sync Repo</button>
        ${state.linkedPr ? `<button id="btn-open-pr" class="btn-secondary">Open PR in Browser</button>` : ''}
        <button id="btn-open-issue" class="btn-secondary">Open Issue in Browser</button>
        <button id="btn-new-issue" class="btn-secondary">Back to Issues</button>
      </div>
    </div>
  `;

  document.getElementById('complete-issue-link')?.addEventListener('click', () => {
    if (state.issueUrl) { vscode.postMessage({ type: 'openUrl', url: state.issueUrl }); }
  });

  document.getElementById('complete-pr-link')?.addEventListener('click', () => {
    if (state.linkedPr) { vscode.postMessage({ type: 'openUrl', url: state.linkedPr.url }); }
  });

  document.getElementById('btn-checkout')?.addEventListener('click', () => {
    if (state.linkedPr) { vscode.postMessage({ type: 'checkoutBranch', branch: state.linkedPr.branch }); }
  });

  document.getElementById('btn-sync-repo')?.addEventListener('click', () => {
    const btn = document.getElementById('btn-sync-repo') as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
    vscode.postMessage({ type: 'syncRepo' });
  });

  document.getElementById('btn-open-pr')?.addEventListener('click', () => {
    if (state.linkedPr) { vscode.postMessage({ type: 'openUrl', url: state.linkedPr.url }); }
  });

  document.getElementById('btn-open-issue')?.addEventListener('click', () => {
    if (state.issueUrl) { vscode.postMessage({ type: 'openUrl', url: state.issueUrl }); }
  });

  document.getElementById('btn-new-issue')?.addEventListener('click', () => {
    goToHub();
  });
}

// ============================================================================
// Timeline Rendering (Monitor phase)
// ============================================================================

/**
 * Determine whether the issue is awaiting human approval.
 * Labels are the authoritative signal from the alice-remediation workflow:
 *   - `remediation-planning`     → plan posted, awaiting approval
 *   - `remediation-in-progress`  → approved, implementation running
 *   - `remediation-complete`     → implementation done, PR created
 *
 * Gap handling: between the user posting approval and Phase 2 starting
 * (~30-60s), `remediation-planning` is still present but a human approval
 * comment exists. In this case we return false so the UI shows
 * "Approval sent" instead of the approve/replan banner.
 *
 * Falls back to comment text parsing when no remediation labels are present.
 */
function detectNeedsApproval(comments: IssueComment[]): boolean {
  const labels = state.labels;
  const hasPlanning = labels.includes('remediation-planning');
  const hasInProgress = labels.includes('remediation-in-progress');
  const hasComplete = labels.includes('remediation-complete');

  // Labels are definitive if they exist
  if (hasComplete || hasInProgress) { return false; }
  if (hasPlanning) {
    // Gap handling: label says planning, but check if a human already approved
    const hasHumanApproval = comments.some(c =>
      !c.isBot && isApprovalGiven(c.body.toLowerCase())
    );
    return !hasHumanApproval;
  }

  // Fallback: walk comments to detect approval state via text parsing
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
        lower.includes('create pr')
      );
      if (commentComplete) {
        needsApproval = false;
      }
    }
  }
  return needsApproval;
}

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

  // Determine phase from labels first, then fall back to comment parsing
  const needsApproval = detectNeedsApproval(comments);

  // Update agent status indicator
  updateAgentStatus(comments, needsApproval);

  // Show approve/replan banner only if the latest approval request hasn't been answered
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
        <textarea id="replan-feedback" style="min-height: 60px; width: 100%;" placeholder="Describe what should be changed in the plan..."></textarea>
        <div style="margin-top: 6px; display: flex; gap: 8px;">
          <button id="btn-send-replan" class="btn-primary" style="padding: 6px 16px;">Send Feedback</button>
          <button id="btn-cancel-replan" class="btn-secondary" style="padding: 6px 16px;">Cancel</button>
        </div>
      </div>
    `;
    timeline.parentElement!.insertBefore(banner, timeline.nextSibling);

    document.getElementById('btn-approve')!.addEventListener('click', () => {
      vscode.postMessage({ type: 'approveAgent', agent: state.assignedAgent || 'claude' });
      banner.innerHTML = '<span>Approval sent — waiting for implementation to start...</span>';
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
      banner.innerHTML = `<span>Feedback sent — agent will revise the plan...</span>`;
      banner.classList.add('approved');
    });
  }

  timeline.scrollTop = timeline.scrollHeight;
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

  // Determine status from the latest bot comment
  const lastBot = [...comments].reverse().find(c => c.isBot);
  const lastAny = comments[comments.length - 1];
  let status = 'analyzing';
  let icon = '&#x1F50D;'; // magnifying glass
  let text = 'Agent is analyzing the issue...';

  if (lastBot) {
    const lower = lastBot.body.toLowerCase();

    const isComplete = hasComplete ||
      lower.includes('implementation complete') ||
      lower.includes('implementation is complete') ||
      lower.includes('all changes have been committed') ||
      lower.includes('opened a pull request') ||
      lower.includes('created a pull request') ||
      lower.includes('create pr');

    if (needsApproval) {
      status = 'awaiting-approval';
      icon = '&#x1F4CB;'; // clipboard
      text = 'Plan ready — waiting for your approval';
    } else if (hasPlanning && !needsApproval) {
      // Gap: planning label present but user already approved — waiting for Phase 2
      status = 'approval-sent';
      icon = '&#x23F3;'; // hourglass
      text = 'Approval sent — waiting for implementation to start...';
    } else if (hasInProgress) {
      // Label is authoritative — implementation is running, ignore comment text
      // that mentions "create PR" as a future plan step
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
      text = 'Implementation complete';
      if (lower.includes('pull request') || hasComplete) {
        text = 'Implementation complete — PR created';
      }
    } else if (lower.includes('running tests') || lower.includes('npm test') || lower.includes('test coverage')) {
      status = 'testing';
      icon = '&#x1F9EA;'; // test tube
      text = 'Agent is running tests...';
    } else if (lower.includes('starting implementation') || lower.includes('beginning implementation') || lower.includes('implementing') || lower.includes('creating files') || lower.includes('writing code')) {
      status = 'implementing';
      icon = '&#x1F528;'; // hammer
      text = 'Agent is implementing...';
    } else if (lower.includes('plan') || lower.includes('analysis') || lower.includes('approach')) {
      status = 'planning';
      icon = '&#x1F4CB;'; // clipboard
      text = 'Agent is creating a plan...';
    } else {
      status = 'working';
      icon = '&#x1F916;'; // robot
      text = 'Agent is working...';
    }
  }

  // Check if the last comment is an edited bot comment (still in progress)
  if (lastAny?.isBot && lastAny.updatedAt !== lastAny.createdAt && status !== 'complete' && status !== 'awaiting-approval') {
    text += ' (comment being updated live)';
  }

  statusEl.style.display = 'flex';
  statusEl.className = `agent-status status-${status}`;
  iconEl.innerHTML = icon;
  textEl.textContent = text;

  // Show "Continue to Summary" button when complete
  const completeBtn = document.getElementById('btn-go-complete');
  if (completeBtn && status === 'complete') {
    completeBtn.style.display = 'inline-block';
  }
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
  // After escapeHtml, <img src="..." /> becomes &lt;img src=&quot;...&quot; /&gt;
  // Use .*? (not [^&]) so it matches through &quot; entities in attributes
  html = html.replace(/&lt;img\s+(.*?)\/?\s*&gt;/gi, (_m, attrs) => {
    const clean = attrs.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    // Only allow src from trusted domains
    const srcMatch = clean.match(/src\s*=\s*"(https:\/\/(?:github\.com|[^"]*\.githubusercontent\.com)[^"]*)"/i);
    if (!srcMatch) { return ''; }
    return `<img ${clean} style="max-width: 100%;" />`;
  });

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: var(--accent);">$1</a>');

  // Headers (### → h4, ## → h3, # → h2)
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
  html = html.replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid var(--border); margin: 8px 0;" />');

  // Checkboxes
  html = html.replace(/^- \[x\] (.+)$/gm, '<div style="margin: 2px 0;">&#9745; $1</div>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<div style="margin: 2px 0;">&#9744; $1</div>');

  // Unordered list items
  html = html.replace(/^- (.+)$/gm, '<div style="margin: 2px 0; padding-left: 12px;">&bull; $1</div>');

  // Ordered list items
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="margin: 2px 0; padding-left: 12px;">$1. $2</div>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left: 3px solid var(--border); padding-left: 10px; color: var(--text-secondary); margin: 4px 0;">$1</blockquote>');

  // Line breaks (preserve double newlines as paragraph breaks)
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function showPrBanner(pr: LinkedPullRequest) {
  const area = document.getElementById('pr-banner-area');
  if (!area) { return; }

  area.innerHTML = `
    <div class="pr-banner">
      <h4>Pull Request #${pr.number}: ${escapeHtml(pr.title)}</h4>
      <div class="pr-meta">
        <span class="checks-dot checks-${pr.checksStatus}"></span>
        Checks: ${pr.checksStatus} | State: ${pr.state} | Branch: <code>${escapeHtml(pr.branch)}</code>
      </div>
      <div class="pr-actions">
        <button id="pr-checkout-btn" class="btn-primary" style="padding: 4px 12px; font-size: 12px;">Checkout Branch</button>
        <button id="pr-open-btn" class="btn-secondary" style="padding: 4px 12px; font-size: 12px;">Open in Browser</button>
      </div>
    </div>
  `;

  document.getElementById('pr-checkout-btn')!.addEventListener('click', () => {
    vscode.postMessage({ type: 'checkoutBranch', branch: pr.branch });
  });

  document.getElementById('pr-open-btn')!.addEventListener('click', () => {
    vscode.postMessage({ type: 'openUrl', url: pr.url });
  });

  // Show "Continue to Summary" button
  const goBtn = document.getElementById('btn-go-complete');
  if (goBtn) { goBtn.style.display = ''; }
}

// ============================================================================
// Issue List Hub
// ============================================================================

const CREATE_PHASES: Phase[] = ['input', 'review', 'submit'];
const MANAGE_PHASES: Phase[] = ['assign', 'monitor', 'complete'];

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
}

function setViewMode(mode: ViewMode) {
  state.viewMode = mode;
  const sidebar = document.querySelector('.phase-sidebar') as HTMLElement;
  const phaseList = document.getElementById('phaseList');
  const existingBack = document.getElementById('back-to-hub-link');

  if (mode === 'hub') {
    // Hide sidebar phase list, keep title visible
    if (phaseList) { phaseList.style.display = 'none'; }
    if (existingBack) { existingBack.remove(); }
  } else {
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

    // Add "Back to Issues" link if not present
    if (!document.getElementById('back-to-hub-link') && sidebar) {
      const link = document.createElement('a');
      link.id = 'back-to-hub-link';
      link.textContent = '\u2190 Back to Issues';
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

function renderIssueListHub() {
  contentEl.innerHTML = `
    <div class="hub-header">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${CHESHIRE_SVG}
        <div>
          <h2 style="margin: 0;">Issues</h2>
          <p style="color: var(--text-secondary); font-size: 12px; margin: 2px 0 0;">
            ${state.repo ? `${state.repo.owner}/${state.repo.repo}` : 'No repository detected'}
          </p>
        </div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button id="btn-refresh" class="btn-secondary" title="Refresh issues" style="padding: 6px 10px; font-size: 14px; line-height: 1;">&#x21BB;</button>
        <button id="btn-create-new" class="btn-primary">+ Create New Issue</button>
      </div>
    </div>

    <div id="issue-list">
      ${state.hubIssues.length === 0
        ? `<div class="hub-empty">
            ${state.isLoading
              ? '<div class="spinner"></div><p>Loading issues...</p>'
              : '<p>No open issues found.</p><p style="font-size: 12px;">Create a new issue to get started.</p>'}
          </div>`
        : state.hubIssues.map(renderIssueRow).join('')
      }
    </div>

    ${state.hubHasMore ? `<div style="text-align: center; padding: 12px;">
      <button id="btn-load-more" class="btn-secondary">Load More Issues</button>
    </div>` : ''}

    <div id="loading" class="loading">
      <div class="spinner"></div>
      <span>Loading issues...</span>
    </div>
  `;

  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    state.hubPage = 1;
    vscode.postMessage({ type: 'loadIssues', page: 1 });
  });

  document.getElementById('btn-create-new')?.addEventListener('click', () => {
    resetIssueState();
    setViewMode('create');
    goToPhase('input');
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
}

// DRY principle and fitness functions are always pre-checked
const DEFAULT_CHECKED_PACKS = new Set(['dry-principle', 'fitness-functions']);

function checkbox(pack: PromptPackInfo): string {
  const checked = DEFAULT_CHECKED_PACKS.has(pack.id) ? ' checked' : '';
  return `<div class="checkbox-item">
    <input type="checkbox" id="pack-${pack.id}" data-category="${pack.category}" value="${pack.id}"${checked} />
    <label for="pack-${pack.id}">${pack.name}</label>
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
  for (const id of allIds) {
    const cb = document.getElementById(`pack-${id}`) as HTMLInputElement | null;
    if (cb) { cb.checked = true; }
  }
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
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
// Message Handling (from extension)
// ============================================================================

window.addEventListener('message', (event) => {
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

    case 'loading':
      state.isLoading = message.active;
      const loadingEl = document.getElementById('loading');
      if (loadingEl) {
        loadingEl.classList.toggle('active', message.active);
      }
      break;

    case 'promptPacks':
      state.allPacks = message.packs;
      renderPromptPacks(message.packs);
      break;

    case 'repoDetected':
      state.repo = message.repo;
      repoInfoEl.textContent = `${message.repo.owner}/${message.repo.repo}`;
      break;

    case 'templateLoaded':
      // Set description and packs in the input phase
      const descEl = document.getElementById('description') as HTMLTextAreaElement | null;
      if (descEl) { descEl.value = message.description; }
      setSelectedPacks(message.packs);
      break;

    case 'prefillDescription': {
      // Switch to create mode and render the input phase so the textarea exists
      resetIssueState();
      setViewMode('create');
      goToPhase('input');
      // Now the textarea is rendered — set its value
      const prefillEl = document.getElementById('description') as HTMLTextAreaElement | null;
      if (prefillEl) { prefillEl.value = message.description; }
      // Pre-select prompt packs if provided
      if (message.packs) { setSelectedPacks(message.packs); }
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
      if (message.agent === 'skip') {
        goToPhase('complete');
      } else {
        state.assignedAgent = message.agent as 'claude' | 'copilot';
        goToPhase('monitor');
      }
      break;

    case 'workflowNotFound':
      state.workflowWarning = true;
      const warningEl = document.getElementById('workflow-warning');
      if (warningEl) { warningEl.style.display = 'block'; }
      break;

    case 'commentsUpdated':
      state.comments = message.comments;
      if (state.currentPhase === 'monitor') {
        updateTimeline(message.comments);
      }
      break;

    case 'prDetected':
      state.linkedPr = message.pr;
      if (state.currentPhase === 'monitor') {
        showPrBanner(message.pr);
      }
      break;

    case 'prStatusUpdated':
      state.linkedPr = message.pr;
      if (state.currentPhase === 'monitor') {
        showPrBanner(message.pr);
      }
      if (message.pr.state === 'merged') {
        goToPhase('complete');
      }
      break;

    case 'labelsUpdated':
      state.labels = message.labels;
      if (state.currentPhase === 'monitor') {
        updateTimeline(state.comments);
      }
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
