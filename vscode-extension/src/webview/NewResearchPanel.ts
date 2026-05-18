/**
 * NewResearchPanel — webview that dispatches an Archeologist or PRD run.
 *
 * Pipeline:
 *   on open  →  load BARs + research preferences + run preflight
 *   user fills form  →  preflight rerun (cached 60s) + cost estimate
 *   click Dispatch   →  confirmation prompt → WorkflowDispatchService
 *   on success       →  show run URL + close-able toast
 *
 * The 9-check preflight banner is the gate — Dispatch is disabled while
 * any error-severity check is failing. Warnings are shown as orange chips
 * but don't block.
 *
 * Status tailing + Active Runs live in v0.8c — this panel just opens the
 * loop and hands off the run URL.
 */
import * as vscode from 'vscode';
import { BasePanel } from './BasePanel';
import {
  runPreflight,
  invalidatePreflightCache,
  type PreflightReport,
  type AgentKind,
} from '../services/ResearchPreflightService';
import { dispatchAgent, type DispatchInputs } from '../services/WorkflowDispatchService';
import { detectGovernanceRepo } from '../services/SecretsService';
import { MeshService } from '../services/MeshService';
import { MeshReader } from '../core/mesh-reader';
import { ActiveRunsService } from '../services/ActiveRunsService';
import type { BarSummary } from '../types/governance';

type WebviewMsg =
  | { type: 'ready' }
  | { type: 'refreshPreflight'; agent: AgentKind }
  | { type: 'dispatch'; agent: AgentKind; inputs: DispatchInputs };

type ExtMsg =
  | { type: 'init'; meshSlug: string | null; bars: BarSummary[]; defaults: ResearchPrefs }
  | { type: 'preflight'; agent: AgentKind; report: PreflightReport }
  | { type: 'dispatched'; runUrl: string | null; agent: AgentKind; dispatchedAt: string }
  | { type: 'dispatchError'; message: string }
  | { type: 'error'; message: string };

interface ResearchPrefs {
  llmProvider: 'github-models' | 'anthropic' | 'openai';
  guardrails: 'strict' | 'default' | 'lenient';
  grounding: 'strict' | 'default' | 'lenient';
  groundingThreshold: number;
  maxIterations: number;
  costCapTokens: number;
  mode: 'quick' | 'deep';
}

const DEFAULT_PREFS: ResearchPrefs = {
  llmProvider: 'github-models',
  guardrails: 'default',
  grounding: 'default',
  groundingThreshold: 0.85,
  maxIterations: 3,
  costCapTokens: 200_000,
  mode: 'deep',
};

export class NewResearchPanel extends BasePanel<WebviewMsg, ExtMsg> {
  public static currentPanel: NewResearchPanel | undefined;
  private static readonly viewType = 'maintainabilityai.newResearch';

  public static createOrShow(context: vscode.ExtensionContext, initialAgent: AgentKind = 'archeologist') {
    const column = vscode.window.activeTextEditor?.viewColumn;
    if (NewResearchPanel.currentPanel) {
      NewResearchPanel.currentPanel.panel.reveal(column);
      // Force a refresh in case the user opened with a different agent
      void NewResearchPanel.currentPanel.refreshPreflight(initialAgent);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      NewResearchPanel.viewType,
      'New Research / PRD Run',
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    NewResearchPanel.currentPanel = new NewResearchPanel(panel, context, initialAgent);
  }

  private initialAgent: AgentKind;

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, initialAgent: AgentKind) {
    super(panel, context);
    this.initialAgent = initialAgent;
  }

  protected clearCurrentPanel(): void {
    NewResearchPanel.currentPanel = undefined;
  }

  protected async handleMessage(msg: WebviewMsg): Promise<void> {
    try {
      switch (msg.type) {
        case 'ready': await this.onReady(); break;
        case 'refreshPreflight': await this.refreshPreflight(msg.agent); break;
        case 'dispatch': await this.onDispatch(msg.agent, msg.inputs); break;
      }
    } catch (err) {
      this.handleAndNotifyError('NewResearchPanel.handleMessage', err);
    }
  }

  private async onReady(): Promise<void> {
    const meshPath = MeshService.getMeshPath();
    const slug = await detectGovernanceRepo();
    const meshSlug = slug ? `${slug.owner}/${slug.repo}` : null;

    let bars: BarSummary[] = [];
    if (meshPath) {
      try {
        const reader = new MeshReader(meshPath);
        bars = reader.listBars();
      } catch { /* mesh may be empty / mid-init */ }
    }

    const defaults = loadPrefs();
    this.postMessage({ type: 'init', meshSlug, bars, defaults });
    await this.refreshPreflight(this.initialAgent);
  }

  private async refreshPreflight(agent: AgentKind): Promise<void> {
    invalidatePreflightCache();
    const report = await runPreflight({ agent });
    this.postMessage({ type: 'preflight', agent, report });
  }

  private async onDispatch(agent: AgentKind, inputs: DispatchInputs): Promise<void> {
    try {
      const result = await dispatchAgent({ agent, inputs });
      // Register the run so the tailer starts polling status + audit log.
      ActiveRunsService.get().register({
        agent,
        meshSlug: result.meshSlug,
        runId: result.runId,
        runUrl: result.runUrl,
        dispatchedAt: result.dispatchedAt,
      });
      this.postMessage({
        type: 'dispatched',
        agent,
        runUrl: result.runUrl,
        dispatchedAt: result.dispatchedAt,
      });
      const openActiveRuns = 'Open Active Runs';
      const choice = await vscode.window.showInformationMessage(
        `${agent === 'archeologist' ? 'Archeologist' : 'PRD'} run dispatched${result.runUrl ? `: ${result.runUrl}` : ''}.`,
        openActiveRuns,
      );
      if (choice === openActiveRuns) {
        void vscode.commands.executeCommand('maintainabilityai.activeRuns');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.postMessage({ type: 'dispatchError', message });
    }
  }

  protected getHtmlContent(): string {
    return renderHtml();
  }
}

// ============================================================================
// helpers
// ============================================================================

function loadPrefs(): ResearchPrefs {
  const cfg = vscode.workspace.getConfiguration();
  return {
    llmProvider: (cfg.get<string>('maintainabilityai.research.llmProvider') as ResearchPrefs['llmProvider']) ?? DEFAULT_PREFS.llmProvider,
    guardrails: (cfg.get<string>('maintainabilityai.research.guardrails') as ResearchPrefs['guardrails']) ?? DEFAULT_PREFS.guardrails,
    grounding: (cfg.get<string>('maintainabilityai.research.grounding') as ResearchPrefs['grounding']) ?? DEFAULT_PREFS.grounding,
    groundingThreshold: cfg.get<number>('maintainabilityai.research.groundingThreshold') ?? DEFAULT_PREFS.groundingThreshold,
    maxIterations: cfg.get<number>('maintainabilityai.research.maxIterations') ?? DEFAULT_PREFS.maxIterations,
    costCapTokens: cfg.get<number>('maintainabilityai.research.costCapTokens') ?? DEFAULT_PREFS.costCapTokens,
    mode: DEFAULT_PREFS.mode,
  };
}

// ============================================================================
// HTML — inline. Webview JS handles form state + preflight rendering.
// ============================================================================

function renderHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>New Research / PRD Run</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 24px; max-width: 920px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  h2 { font-size: 14px; margin: 24px 0 8px; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.5px; }
  .row { display: flex; gap: 12px; margin: 8px 0; align-items: center; }
  .row label { flex: 0 0 180px; font-size: 13px; color: var(--vscode-descriptionForeground); }
  .row input[type="text"], .row input[type="url"], .row select, .row input[type="number"] {
    flex: 1; padding: 6px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border); border-radius: 3px;
  }
  .row input[type="range"] { flex: 1; }
  .checks { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px; background: rgba(0,0,0,0.05); }
  .check { display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; font-size: 12px; }
  .check .icon { width: 16px; flex-shrink: 0; }
  .check.ok .icon { color: #4ec9b0; }
  .check.error .icon { color: #f48771; }
  .check.warning .icon { color: #ce9178; }
  .check .label { flex: 1; }
  .check .message { color: var(--vscode-descriptionForeground); font-size: 11px; }
  .check .remediation { color: var(--vscode-textLink-foreground); font-size: 11px; margin-top: 2px; }
  .summary-banner { padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 13px; }
  .summary-banner.proceed { background: rgba(78, 201, 176, 0.15); border: 1px solid #4ec9b0; }
  .summary-banner.block { background: rgba(244, 135, 113, 0.15); border: 1px solid #f48771; }
  .actions { margin-top: 24px; display: flex; gap: 8px; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: 0; padding: 6px 14px; border-radius: 3px; cursor: pointer; font-size: 13px; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  button.secondary { background: transparent; border: 1px solid var(--vscode-input-border); color: var(--vscode-foreground); }
  .cost-box { background: rgba(255, 215, 0, 0.07); border: 1px solid rgba(255, 215, 0, 0.4); padding: 8px 12px; border-radius: 4px; margin-top: 12px; font-size: 12px; }
  .toast { margin-top: 16px; padding: 8px 12px; border-radius: 4px; font-size: 13px; }
  .toast.success { background: rgba(78, 201, 176, 0.15); border: 1px solid #4ec9b0; }
  .toast.error { background: rgba(244, 135, 113, 0.15); border: 1px solid #f48771; }
  .toast a { color: var(--vscode-textLink-foreground); }
  .hidden { display: none; }
  .agent-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--vscode-panel-border); margin-bottom: 16px; }
  .agent-tabs button { background: transparent; border: 0; border-bottom: 2px solid transparent; border-radius: 0; padding: 8px 16px; color: var(--vscode-descriptionForeground); }
  .agent-tabs button.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-textLink-foreground); }
</style>
</head>
<body>
  <h1>New Research / PRD Run</h1>
  <div id="meshSlug" style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 16px;">Loading mesh…</div>

  <div class="agent-tabs">
    <button id="tab-archeologist" class="active" data-agent="archeologist">Archeologist (Research)</button>
    <button id="tab-prd" data-agent="prd">PRD</button>
  </div>

  <h2>Pre-flight</h2>
  <div id="summaryBanner" class="summary-banner">Running pre-flight…</div>
  <div id="checks" class="checks"></div>
  <button id="refreshPreflightBtn" class="secondary" style="margin-top: 8px;">Refresh pre-flight</button>

  <h2>Scope</h2>
  <div class="row">
    <label>Level</label>
    <select id="scopeLevel">
      <option value="bar">BAR (Business Application Record)</option>
      <option value="platform">Platform</option>
      <option value="portfolio">Portfolio</option>
    </select>
  </div>
  <div class="row" id="barRow">
    <label>BAR</label>
    <select id="barId"></select>
  </div>

  <h2>Research source</h2>
  <div class="row">
    <label>Kind</label>
    <select id="srcKind">
      <option value="pr">GitHub PR URL</option>
      <option value="path">Path inside mesh</option>
    </select>
  </div>
  <div class="row">
    <label id="srcLabel">PR URL</label>
    <input type="text" id="srcValue" placeholder="https://github.com/OWNER/REPO/pull/42" />
  </div>

  <h2>Run preferences</h2>
  <div class="row">
    <label>Mode</label>
    <select id="mode"><option value="quick">quick</option><option value="deep" selected>deep</option></select>
  </div>
  <div class="row">
    <label>Grounding threshold</label>
    <input type="range" id="threshold" min="0.5" max="1" step="0.05" value="0.85" />
    <span id="thresholdLabel" style="flex: 0 0 50px; text-align: right;">0.85</span>
  </div>
  <div class="row">
    <label>Max iterations</label>
    <input type="number" id="maxIter" min="1" max="5" value="3" />
  </div>
  <div class="row">
    <label>Cost cap (tokens)</label>
    <input type="number" id="costCap" min="10000" step="10000" value="200000" />
  </div>

  <div class="cost-box" id="costBox">Estimated cost: —</div>

  <div class="actions">
    <button id="dispatchBtn" disabled>Dispatch</button>
    <button id="cancelBtn" class="secondary">Cancel</button>
  </div>

  <div id="toast" class="toast hidden"></div>

<script>
const vscode = acquireVsCodeApi();
let bars = [];
let agent = 'archeologist';
let preflightReport = null;

// Rough per-1k-token blended price by agent + mode (USD).
// Used purely for the cost-box estimate; the runner enforces the real cap.
const PER_1K_BLENDED_USD = { archeologist: { quick: 0.002, deep: 0.005 }, prd: { quick: 0.004, deep: 0.008 } };

function postReady() { vscode.postMessage({ type: 'ready' }); }
function refresh() { vscode.postMessage({ type: 'refreshPreflight', agent }); }

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg.type === 'init') {
    document.getElementById('meshSlug').textContent = msg.meshSlug ? ('Mesh: ' + msg.meshSlug) : 'Mesh: (no GitHub remote configured)';
    bars = msg.bars || [];
    const barSel = document.getElementById('barId');
    barSel.innerHTML = bars.map(b => '<option value="' + b.id + '">' + b.id + ' — ' + b.name + '</option>').join('') || '<option>(none)</option>';
    document.getElementById('threshold').value = msg.defaults.groundingThreshold;
    document.getElementById('thresholdLabel').textContent = msg.defaults.groundingThreshold;
    document.getElementById('maxIter').value = msg.defaults.maxIterations;
    document.getElementById('costCap').value = msg.defaults.costCapTokens;
    updateCost();
  } else if (msg.type === 'preflight') {
    if (msg.agent !== agent) return;
    preflightReport = msg.report;
    renderChecks(msg.report);
  } else if (msg.type === 'dispatched') {
    const toast = document.getElementById('toast');
    toast.className = 'toast success';
    toast.innerHTML = msg.runUrl
      ? 'Dispatched! <a href="' + msg.runUrl + '" target="_blank">View run on GitHub →</a>'
      : 'Dispatched at ' + msg.dispatchedAt + ' (run URL not resolved yet — check the Actions tab).';
  } else if (msg.type === 'dispatchError') {
    const toast = document.getElementById('toast');
    toast.className = 'toast error';
    toast.textContent = 'Dispatch failed: ' + msg.message;
  } else if (msg.type === 'error') {
    const toast = document.getElementById('toast');
    toast.className = 'toast error';
    toast.textContent = msg.message;
  }
});

function renderChecks(report) {
  const banner = document.getElementById('summaryBanner');
  const checksEl = document.getElementById('checks');
  banner.className = 'summary-banner ' + (report.canProceed ? 'proceed' : 'block');
  const failingErrors = report.checks.filter(c => c.severity === 'error' && !c.ok).length;
  const warnings = report.checks.filter(c => c.severity === 'warning' && !c.ok).length;
  banner.textContent = report.canProceed
    ? 'Ready to dispatch. ' + warnings + ' warning(s).'
    : failingErrors + ' blocking issue(s) — fix before dispatch.';
  checksEl.innerHTML = report.checks.map(c => {
    const cls = c.ok ? 'ok' : c.severity;
    const icon = c.ok ? '✓' : (c.severity === 'error' ? '✗' : '!');
    return '<div class="check ' + cls + '"><div class="icon">' + icon + '</div><div class="label">'
      + '<div><strong>' + c.label + '</strong></div>'
      + '<div class="message">' + (c.message || '') + '</div>'
      + (c.remediation && !c.ok ? '<div class="remediation">→ ' + c.remediation + '</div>' : '')
      + '</div></div>';
  }).join('');
  document.getElementById('dispatchBtn').disabled = !report.canProceed;
}

function updateCost() {
  const mode = document.getElementById('mode').value;
  const cap = parseInt(document.getElementById('costCap').value, 10) || 0;
  const blended = PER_1K_BLENDED_USD[agent][mode] || 0.005;
  const est = (cap / 1000) * blended;
  document.getElementById('costBox').textContent = 'Estimated worst-case cost (at cap, blended ' + agent + '/' + mode + ' rate): $' + est.toFixed(2);
}

// ---- tab switching ----
document.querySelectorAll('.agent-tabs button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.agent-tabs button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    agent = b.dataset.agent;
    refresh();
    updateCost();
  });
});

// ---- form bindings ----
document.getElementById('scopeLevel').addEventListener('change', (e) => {
  document.getElementById('barRow').style.display = (e.target.value === 'bar') ? '' : 'none';
});
document.getElementById('srcKind').addEventListener('change', (e) => {
  document.getElementById('srcLabel').textContent = e.target.value === 'pr' ? 'PR URL' : 'Path';
  document.getElementById('srcValue').placeholder = e.target.value === 'pr'
    ? 'https://github.com/OWNER/REPO/pull/42'
    : 'platforms/.../research/topic.md';
});
document.getElementById('threshold').addEventListener('input', (e) => {
  document.getElementById('thresholdLabel').textContent = e.target.value;
});
document.getElementById('mode').addEventListener('change', updateCost);
document.getElementById('costCap').addEventListener('input', updateCost);
document.getElementById('refreshPreflightBtn').addEventListener('click', refresh);

// ---- dispatch ----
document.getElementById('dispatchBtn').addEventListener('click', () => {
  const scopeLevel = document.getElementById('scopeLevel').value;
  const barId = document.getElementById('barId').value;
  const srcKind = document.getElementById('srcKind').value;
  const srcValue = document.getElementById('srcValue').value.trim();
  const mode = document.getElementById('mode').value;
  const threshold = document.getElementById('threshold').value;
  const maxIter = document.getElementById('maxIter').value;
  const costCap = document.getElementById('costCap').value;

  if (!srcValue) {
    alert('Research source is required.');
    return;
  }
  if (scopeLevel === 'bar' && !barId) {
    alert('Select a BAR.');
    return;
  }

  const inputs = {
    scope_level: scopeLevel,
    scope_id: scopeLevel === 'bar' ? barId : '',
    research_source_kind: srcKind,
    research_source_value: srcValue,
    mode: mode,
    grounding_threshold: threshold,
    max_iterations: maxIter,
    cost_cap_tokens: costCap,
  };

  if (!confirm('Dispatch ' + agent + ' run?\\nScope: ' + scopeLevel + (barId ? ' / ' + barId : '') + '\\nMode: ' + mode + '\\nCap: ' + costCap + ' tokens')) {
    return;
  }
  vscode.postMessage({ type: 'dispatch', agent, inputs });
});

document.getElementById('cancelBtn').addEventListener('click', () => { window.close(); });

postReady();
</script>
</body>
</html>`;
}
