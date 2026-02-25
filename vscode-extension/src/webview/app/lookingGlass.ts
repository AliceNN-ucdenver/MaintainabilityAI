// Looking Glass webview frontend — renders Governance Mesh dashboard
// Vanilla TypeScript, IIFE pattern for browser context inside VS Code

import mermaid from 'mermaid';
import { renderAgentStatus, attachAgentStatusListeners } from './agentStatus';
import type { AgentStatusInfo } from './agentStatus';
import type { AdrRecord, AbsolemState, CalmDataPayload } from './pillars/architecturePillar';
import { renderMarkdown, escapeHtml, escapeAttr } from './pillars/shared';
import { deployStatusBadge } from './components/html';
import { mountDiagramCanvas, unmountDiagramCanvas, updateDiagramCanvasProps, isDiagramCanvasMounted } from './reactflow/ReactBridge';
import type { CalmArchitecture } from './reactflow/CalmAdapter';
import type { CalmPatch } from './reactflow/CalmMutator';
import type { DiagramLayout } from './reactflow/LayoutTypes';
import { renderPoliciesLensContent, renderNistPopup, attachPolicyEvents, getPolicyStyles } from './views/policies';
import { renderEaLensTabs, renderBusinessCapabilityView, attachEaLensEvents, getEaLensStyles } from './views/eaLenses';
import {
  renderPortfolioHeader, renderAppTileGrid,
  renderApplicationLensContent, formatTimeAgo,
  attachPortfolioEvents, getPortfolioStyles,
} from './views/portfolio';
import {
  renderBarDetail, renderScoreRing, needsPush, renderGitSyncBanner,
  getBarDetailStyles, attachBarDetailEvents,
} from './views/barDetail';
import type {
  VsCodeApi, Criticality, LifecycleStage, PillarStatus, RationalizationStrategy,
  PortfolioConfig, PillarArtifact, GovernanceScoreSnapshot, GovernanceTrend,
  GovernancePillarScore, GovernanceDecision, PillarFindingCounts, ReviewRecord,
  ActiveReviewInfo, BarSummary, PlatformSummary, PortfolioSummary,
  ThreatEntry, ThreatModelResult, CapabilityModelType, EaLens, CapabilityNode,
  CapabilityModelSummary, PolicyFile, NistControl, GitFileStatus, PillarGitStatus,
  BarGitStatus, GitSyncStatus, OrgRepo, RecommendedBar, RecommendedPlatform,
  OrgScanRecommendation, ExistingBarUpdate,
} from './types';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true },
  c4: { useMaxWidth: true },
  architecture: { useMaxWidth: true },
});

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

// ============================================================================
// Types (local UI-only types)
// ============================================================================

type ViewName = 'no-mesh' | 'portfolio' | 'bar-detail' | 'init-mesh' | 'add-platform' | 'create-bar' | 'org-scanner' | 'settings';

// ============================================================================
// State
// ============================================================================

const state = {
  view: 'no-mesh' as ViewName,
  portfolio: null as PortfolioSummary | null,
  currentPlatformId: null as string | null,
  currentBar: null as BarSummary | null,
  currentDecisions: [] as GovernanceDecision[],
  currentRepoTree: [] as string[],
  isLoading: false,
  loadingMessage: 'Loading...',
  errorMessage: '',
  pickedFolderPath: '',
  barFilter: 'all' as 'all' | 'needs-attention' | 'warnings',
  searchQuery: '',
  orgScanRecommendation: null as OrgScanRecommendation | null,
  orgScanProgress: 0,
  orgScanStep: '',
  orgScanTemplate: 'standard' as 'minimal' | 'standard' | 'full',
  githubDefaultsLoading: false,
  detectedOrgs: [] as string[],
  detectedOrg: '',
  detectedOwner: '',
  detectedRepoName: '',
  initSteps: [] as { label: string; status: 'pending' | 'active' | 'done' | 'error' }[],
  availableModels: [] as { id: string; family: string; name: string; vendor: string }[],
  selectedModelFamily: '',
  calmData: null as CalmDataPayload,
  layouts: null as { context: DiagramLayout | null; logical: DiagramLayout | null } | null,
  diagrams: null as { sequence?: string; capability?: string; threat?: string } | null,
  activeTab: 'context' as string,
  threatModel: null as ThreatModelResult | null,
  threatModelGenerating: false,
  threatModelProgress: '',
  threatModelProgressPct: 0,
  activePillar: null as 'architecture' | 'security' | 'information-risk' | 'operations' | null,
  // Active review state
  activeReview: null as ActiveReviewInfo | null,
  // Unified agent status
  agentStatus: null as AgentStatusInfo | null,
  // Top findings summary state
  topFindingsLoading: false,
  topFindingsProgress: '',
  topFindingsProgressPct: 0,
  topFindingsSummary: null as { architecture: string[]; security: string[]; informationRisk: string[]; operations: string[] } | null,
  topFindingsExpanded: true,
  // ADR state
  adrs: [] as AdrRecord[],
  adrEditingId: null as string | null,
  adrForm: null as Partial<AdrRecord> | null,
  // App.yaml inline editor
  appYamlEditing: false,
  appYamlForm: null as { name: string; owner: string; description: string; criticality: string; lifecycle: string; strategy: string } | null,
  // Git sync state
  gitStatus: null as GitSyncStatus | null,
  syncing: false,
  syncProgress: '',
  // Enterprise Architecture lens state
  activeLens: 'application' as EaLens,
  capabilityModel: null as CapabilityModelSummary | null,
  capabilityDrillPath: [] as string[],
  // Policy viewer state
  policies: [] as PolicyFile[],
  nistControls: [] as NistControl[],
  selectedPolicy: null as string | null,
  policyEditing: false,
  policyEditContent: '',
  policyViewRaw: false,
  policySearch: '',
  nistSearch: '',
  nistControlPopup: null as NistControl | null,
  diagramFullscreen: false,
  policyGenerating: null as string | null,  // filename being generated
  policyGenerateStep: '',
  policyGenerateProgress: 0,
  // Governance score history
  scoreHistory: [] as GovernanceScoreSnapshot[],
  scoreTrend: 'new' as GovernanceTrend,
  pillarTrends: null as { architecture: GovernanceTrend; security: GovernanceTrend; infoRisk: GovernanceTrend; operations: GovernanceTrend } | null,
  // Open workspace folder names (for highlighting active repos)
  openWorkspaceFolders: [] as string[],
  // Repo picker modal state
  repoPickerModal: null as {
    mode: 'scan' | 'add-to-bar';
    barPath?: string;
    barName?: string;
    org: string;
    repos: OrgRepo[];
    selectedRepoNames: Set<string>;
    searchQuery: string;
    activeTab: 'browse' | 'urls' | 'create-new';
    pastedUrls: string;
    createNewRepoUrl: string;
    loading: boolean;
    error: string;
  } | null,
  // Mesh repo info
  meshOwner: '',
  meshRepo: '',
  // Settings state
  settingsWorkflowExists: null as boolean | null,
  settingsPreferredModel: '',
  settingsDriftWeights: { critical: 15, high: 5, medium: 2, low: 1 } as { critical: number; high: number; medium: number; low: number },
  settingsReinitConfirmStep: 0,  // 0=default, 1=warning shown
  // Absolem — multi-turn CALM refinement agent
  absolemOpen: false,
  absolemMessages: [] as { role: 'user' | 'assistant'; content: string }[],
  absolemStreaming: '',
  absolemStatus: 'idle' as 'idle' | 'thinking' | 'reviewing-patches',
  absolemPatches: null as { patches: { op: string; target: string; field?: string; value?: unknown }[]; description: string } | null,
  // CALM component picker (Implement based on architecture)
  componentPicker: null as {
    barPath: string;
    components: { id: string; name: string; type: string; description: string; suggestedRepo: string }[];
    selectedId: string;
    repoName: string;
  } | null,
};

const rootEl = document.getElementById('looking-glass-root')!;

// ============================================================================
// Looking Glass + Mesh SVG (primary brand icon)
// ============================================================================

const LOOKING_GLASS_SVG = `<svg width="36" height="36" viewBox="0 0 48 48" fill="none">
  <defs>
    <linearGradient id="lgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8862ff"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <clipPath id="mirrorClip">
      <circle cx="20" cy="20" r="14"/>
    </clipPath>
  </defs>
  <!-- Mirror frame -->
  <circle cx="20" cy="20" r="15.5" stroke="url(#lgGrad)" stroke-width="2" fill="none"/>
  <circle cx="20" cy="20" r="14" fill="rgba(136, 98, 255, 0.06)"/>
  <!-- Handle -->
  <line x1="31" y1="31" x2="42" y2="42" stroke="url(#lgGrad)" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Mesh network inside the mirror -->
  <g clip-path="url(#mirrorClip)" opacity="0.8">
    <!-- Mesh edges -->
    <line x1="14" y1="12" x2="20" y2="17" stroke="#c084fc" stroke-width="1" opacity="0.5"/>
    <line x1="26" y1="12" x2="20" y2="17" stroke="#c084fc" stroke-width="1" opacity="0.5"/>
    <line x1="20" y1="17" x2="12" y2="22" stroke="#c084fc" stroke-width="1" opacity="0.5"/>
    <line x1="20" y1="17" x2="28" y2="22" stroke="#c084fc" stroke-width="1" opacity="0.5"/>
    <line x1="12" y1="22" x2="16" y2="28" stroke="#c084fc" stroke-width="1" opacity="0.5"/>
    <line x1="28" y1="22" x2="24" y2="28" stroke="#c084fc" stroke-width="1" opacity="0.5"/>
    <line x1="16" y1="28" x2="24" y2="28" stroke="#c084fc" stroke-width="1" opacity="0.5"/>
    <line x1="12" y1="22" x2="28" y2="22" stroke="#c084fc" stroke-width="1" opacity="0.3"/>
    <line x1="20" y1="17" x2="20" y2="28" stroke="#c084fc" stroke-width="1" opacity="0.3"/>
    <!-- Mesh nodes -->
    <circle cx="14" cy="12" r="2.5" fill="#8862ff"/>
    <circle cx="26" cy="12" r="2.5" fill="#8862ff"/>
    <circle cx="20" cy="17" r="3" fill="#c084fc"/>
    <circle cx="12" cy="22" r="2.5" fill="#8862ff"/>
    <circle cx="28" cy="22" r="2.5" fill="#8862ff"/>
    <circle cx="16" cy="28" r="2.5" fill="#8862ff"/>
    <circle cx="24" cy="28" r="2.5" fill="#8862ff"/>
  </g>
  <!-- Reflection highlight -->
  <path d="M11 13 Q13 9 17 8" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`;

// ============================================================================
// Cheshire Grin SVG (used in no-mesh empty state)
// ============================================================================

const CHESHIRE_GRIN_SVG = `<svg width="80" height="28" viewBox="0 0 120 42" fill="none">
  <path d="M10 20 Q20 8 35 14 Q50 4 60 14 Q70 4 85 14 Q100 8 110 20" stroke="url(#grinGrad)" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.7"/>
  <path d="M18 20 Q30 28 60 30 Q90 28 102 20" stroke="url(#grinGrad)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
  <line x1="22" y1="20" x2="22" y2="26" stroke="url(#grinGrad)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <line x1="34" y1="20" x2="34" y2="26" stroke="url(#grinGrad)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <line x1="46" y1="20" x2="46" y2="26" stroke="url(#grinGrad)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <line x1="58" y1="20" x2="58" y2="26" stroke="url(#grinGrad)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <line x1="70" y1="20" x2="70" y2="26" stroke="url(#grinGrad)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <line x1="82" y1="20" x2="82" y2="26" stroke="url(#grinGrad)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <line x1="94" y1="20" x2="94" y2="26" stroke="url(#grinGrad)" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>
  <defs>
    <linearGradient id="grinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8862ff"/>
      <stop offset="50%" stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#8862ff"/>
    </linearGradient>
  </defs>
</svg>`;

// ============================================================================
// CSS
// ============================================================================

function getStyles(): string {
  return `
    <style>
      /* ---- Reset & Base ---- */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --bg: var(--vscode-editor-background, #0d1117);
        --surface: var(--vscode-sideBar-background, #161b22);
        --surface-raised: var(--vscode-input-background, #1c2129);
        --border: var(--vscode-panel-border, #21262d);
        --border-light: var(--vscode-widget-border, #30363d);
        --text: var(--vscode-editor-foreground, #c9d1d9);
        --text-muted: var(--vscode-descriptionForeground, #8b949e);
        --text-dim: var(--vscode-disabledForeground, #6e7681);
        --accent: var(--vscode-textLink-foreground, #8862ff);
        --accent-hover: var(--vscode-textLink-activeForeground, #c084fc);
        --accent-bg: rgba(136, 98, 255, 0.1);
        --passing: #3fb950;
        --warning: #d29922;
        --failing: #f85149;
        --critical-color: #f85149;
        --high-color: #d29922;
        --medium-color: #8b949e;
        --low-color: #6e7681;
        --font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif);
        --font-mono: var(--vscode-editor-font-family, 'SF Mono', 'Fira Code', 'Cascadia Code', monospace);
        --radius: 8px;
        --radius-sm: 6px;
      }

      body {
        background: var(--bg);
        color: var(--text);
        font-family: var(--font);
        font-size: 13px;
        line-height: 1.5;
        padding: 0;
        overflow-x: hidden;
      }

      #looking-glass-root {
        max-width: 1200px;
        margin: 0 auto;
        padding: 16px 20px 40px;
      }

      a { color: var(--accent); text-decoration: none; cursor: pointer; }
      a:hover { color: var(--accent-hover); text-decoration: underline; }

      /* ---- Header ---- */
      .lg-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0 16px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 20px;
        gap: 12px;
        flex-wrap: wrap;
      }
      .lg-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .lg-header-left h1 {
        font-size: 18px;
        font-weight: 600;
        color: var(--text);
        white-space: nowrap;
      }
      .lg-header-left .portfolio-badge {
        font-size: 10px;
        font-family: var(--font-mono);
        background: var(--accent-bg);
        color: var(--accent);
        padding: 2px 8px;
        border-radius: 10px;
        border: 1px solid rgba(136, 98, 255, 0.25);
        white-space: nowrap;
      }
      .lg-header-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .lg-repo-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 2px;
      }
      .lg-header-right .search-input {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-size: 12px;
        padding: 6px 10px;
        width: 180px;
        outline: none;
        transition: border-color 0.15s;
      }
      .lg-header-right .search-input:focus {
        border-color: var(--accent);
      }
      .lg-header-right .search-input::placeholder {
        color: var(--text-dim);
      }

      /* ---- Buttons ---- */
      .btn-primary {
        background: var(--accent);
        color: #fff;
        border: none;
        padding: 6px 14px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s;
        white-space: nowrap;
      }
      .btn-primary:hover { background: var(--accent-hover); }
      .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

      .btn-secondary {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        padding: 6px 14px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
        white-space: nowrap;
      }
      .btn-secondary:hover {
        border-color: var(--accent);
        background: var(--surface-raised);
      }
      .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

      .btn-icon {
        padding: 6px 8px;
        font-size: 16px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .btn-ghost {
        background: transparent;
        color: var(--text-muted);
        border: none;
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        cursor: pointer;
      }
      .btn-ghost:hover { color: var(--text); background: var(--surface); }

      /* ---- Settings Gear ---- */
      .settings-gear {
        font-size: 16px;
        color: var(--text-muted);
        cursor: pointer;
        transition: color 0.15s, transform 0.15s;
        background: none;
        border: none;
        padding: 2px 6px;
        line-height: 1;
      }
      .settings-gear:hover {
        color: var(--accent);
        transform: rotate(30deg);
      }

      /* ---- Settings Panel ---- */
      .settings-panel {
        max-width: 700px;
      }
      .settings-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      .settings-header h2 {
        font-size: 16px;
        font-weight: 600;
      }
      .settings-section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px;
        margin-bottom: 16px;
      }
      .settings-section h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .settings-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 10px;
        gap: 12px;
      }
      .settings-label {
        font-weight: 500;
        min-width: 120px;
      }
      .settings-editor {
        width: 100%;
        background: var(--surface-raised);
        color: var(--text);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-sm);
        padding: 10px;
        font-family: var(--font-mono);
        font-size: 12px;
        resize: vertical;
      }
      .settings-editor:focus {
        outline: none;
        border-color: var(--accent);
      }
      .settings-select {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 6px 10px;
        font-size: 12px;
        min-width: 200px;
        cursor: pointer;
      }
      .settings-select:focus { outline: none; border-color: var(--accent); }
      .settings-number {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 6px 10px;
        font-size: 12px;
        font-family: var(--font-mono);
        width: 80px;
        text-align: center;
      }
      .settings-number:focus { outline: none; border-color: var(--accent); }

      .status-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
      }
      .status-badge.deployed { background: rgba(63, 185, 80, 0.15); color: var(--passing); }
      .status-badge.not-deployed { background: rgba(248, 81, 73, 0.15); color: var(--failing); }
      .status-badge.unknown { background: rgba(139, 148, 158, 0.15); color: var(--text-muted); }

      .btn-danger {
        background: rgba(248, 81, 73, 0.15);
        color: var(--failing);
        border: 1px solid var(--failing);
        padding: 6px 16px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-danger:hover { background: rgba(248, 81, 73, 0.3); }

      .danger-zone { border-color: rgba(248, 81, 73, 0.4); }
      .danger-zone h3 { color: var(--failing); }

      .drift-link {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--accent);
        text-decoration: none;
        margin-left: 4px;
      }
      .drift-link:hover { color: var(--accent-hover); text-decoration: underline; }

      .danger-warning {
        background: rgba(248, 81, 73, 0.1);
        border: 1px solid rgba(248, 81, 73, 0.3);
        border-radius: var(--radius-sm);
        padding: 10px 14px;
        font-size: 13px;
        color: var(--failing);
        margin-top: 10px;
      }

      /* ---- Portfolio styles (delegated to views/portfolio.ts) ---- */
      ${getPortfolioStyles()}

      /* ---- Editable Badges ---- */
      .editable-badge {
        cursor: pointer;
        transition: opacity 0.15s, box-shadow 0.15s;
      }
      .editable-badge:hover {
        opacity: 0.85;
        box-shadow: 0 0 0 2px var(--accent-bg);
      }

      /* ---- Pillar Status Dots ---- */
      .pillar-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        vertical-align: middle;
      }
      .pillar-dot.passing { background: var(--passing); }
      .pillar-dot.warning { background: var(--warning); }
      .pillar-dot.failing { background: var(--failing); }
      .pillar-dot.unknown { background: var(--text-dim); }

      .pillar-score-inline {
        font-family: var(--font-mono);
        font-size: 11px;
        margin-left: 4px;
      }

      /* ---- BAR Detail styles (delegated to views/barDetail.ts) ---- */
      ${getBarDetailStyles()}

      /* ---- Forms ---- */
      .lg-form {
        max-width: 520px;
      }
      .lg-form .form-group {
        margin-bottom: 14px;
      }
      .lg-form label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--text-muted);
        margin-bottom: 4px;
      }
      .lg-form .checkbox-group {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
        cursor: pointer;
      }
      .lg-form .checkbox-group input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: var(--accent);
        cursor: pointer;
      }
      .lg-form .checkbox-group label {
        margin-bottom: 0;
        cursor: pointer;
      }
      .lg-form .conditional-fields {
        margin-left: 24px;
        padding-left: 12px;
        border-left: 2px solid var(--border);
      }
      .lg-form input[type="text"],
      .lg-form input[type="email"],
      .lg-form select {
        width: 100%;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-size: 13px;
        padding: 8px 10px;
        outline: none;
        transition: border-color 0.15s;
        font-family: var(--font);
      }
      .lg-form input:focus,
      .lg-form select:focus {
        border-color: var(--accent);
      }
      .lg-form input::placeholder { color: var(--text-dim); }
      .lg-form select { cursor: pointer; }
      .lg-form select option {
        background: var(--surface);
        color: var(--text);
      }
      .defaults-loading {
        display: block;
        font-size: 12px;
        color: var(--accent);
        margin-bottom: 12px;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .folder-picker {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .folder-picker .picked-path {
        font-size: 12px;
        font-family: var(--font-mono);
        color: var(--text-muted);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }
      .form-actions {
        margin-top: 20px;
        display: flex;
        gap: 8px;
      }

      /* ---- Loading & Error ---- */
      .loading-overlay {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        gap: 16px;
      }
      .loading-overlay p {
        color: var(--text-muted);
        font-size: 13px;
      }
      .spinner {
        width: 28px;
        height: 28px;
        border: 3px solid var(--border);
        border-top: 3px solid var(--accent);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* ---- Init Step Progress (matches ScaffoldPanel) ---- */
      .init-step-list { padding: 8px 0; }
      .init-step-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        font-size: 12px;
      }
      .init-step-icon {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        flex-shrink: 0;
        border: 2px solid var(--border);
        color: var(--text-muted);
      }
      .init-step-item.pending .init-step-icon { border-color: var(--border); color: var(--text-muted); }
      .init-step-item.active .init-step-icon { border-color: #f59e0b; color: #f59e0b; animation: pulse 1s infinite; }
      .init-step-item.done .init-step-icon { border-color: var(--passing); color: var(--passing); background: rgba(34, 197, 94, 0.1); }
      .init-step-item.error .init-step-icon { border-color: var(--failing); color: var(--failing); background: rgba(239, 68, 68, 0.1); }
      .init-step-label { font-weight: 500; }
      .init-step-message { color: var(--text-muted); margin-left: auto; font-size: 11px; max-width: 60%; text-align: right; }
      .init-step-item.error .init-step-message { color: var(--failing); }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

      .error-msg {
        background: rgba(248, 81, 73, 0.1);
        border: 1px solid rgba(248, 81, 73, 0.3);
        border-radius: var(--radius-sm);
        padding: 10px 14px;
        margin-bottom: 16px;
        font-size: 12px;
        color: var(--failing);
      }

      /* ---- No Mesh State ---- */
      .no-mesh-container {
        text-align: center;
        padding: 60px 20px;
      }
      .no-mesh-container h2 {
        font-size: 20px;
        margin: 16px 0 8px;
      }
      .no-mesh-container p {
        color: var(--text-muted);
        font-size: 13px;
        margin-bottom: 20px;
        max-width: 480px;
        margin-left: auto;
        margin-right: auto;
      }

      /* ---- Responsive ---- */
      @media (max-width: 800px) {
        .summary-grid { grid-template-columns: repeat(2, 1fr); }
        .domain-health { grid-template-columns: 1fr; }
        .pillar-grid { grid-template-columns: 1fr; }
        .bar-table { font-size: 11px; }
        .bar-table thead th, .bar-table tbody td { padding: 6px 6px; }
      }
      @media (max-width: 500px) {
        .summary-grid { grid-template-columns: 1fr; }
        .lg-header { flex-direction: column; align-items: flex-start; }
      }

      /* ---- Empty state ---- */
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-muted);
      }
      .empty-state p { margin-bottom: 12px; }

      /* ---- Org Scanner ---- */
      .form-card {
        max-width: 480px;
        padding: 16px;
      }
      .org-scanner-input { display: flex; gap: 8px; align-items: center; }
      .org-scanner-input input { flex: 1; }

      .progress-container { margin: 24px 0; }
      .progress-bar-track { height: 8px; background: var(--surface-raised); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
      .progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-hover)); border-radius: 4px; transition: width 0.3s ease; }
      .progress-label { font-size: 12px; color: var(--text-muted); }

      .drag-canvas { display: flex; flex-direction: column; gap: 16px; }

      .scan-platform-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 12px;
      }
      .scan-platform-card.drag-over { border-color: var(--accent); border-style: dashed; }
      .scan-platform-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        gap: 8px;
      }
      .scan-platform-header .editable-name {
        background: transparent;
        border: 1px solid transparent;
        color: var(--text);
        font-size: 14px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        flex: 1;
      }
      .scan-platform-header .editable-name:hover { border-color: var(--border-light); }
      .scan-platform-header .editable-name:focus { border-color: var(--accent); outline: none; }
      .scan-platform-abbr {
        font-size: 11px;
        color: var(--text-muted);
        font-family: var(--font-mono);
        background: var(--surface-raised);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .scan-platform-rationale { font-size: 11px; color: var(--text-dim); margin-bottom: 8px; font-style: italic; }

      .scan-bars-container { display: flex; flex-wrap: wrap; gap: 8px; min-height: 40px; }

      .scan-bar-card {
        background: var(--surface-raised);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 8px;
        min-width: 180px;
        flex: 1;
        max-width: 300px;
      }
      .scan-bar-card.drag-over { border-color: var(--accent); border-style: dashed; }
      .scan-bar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
        gap: 4px;
      }
      .scan-bar-header .editable-name {
        background: transparent;
        border: 1px solid transparent;
        color: var(--text);
        font-size: 12px;
        font-weight: 600;
        padding: 1px 4px;
        border-radius: 3px;
        flex: 1;
        min-width: 80px;
      }
      .scan-bar-header .editable-name:hover { border-color: var(--border-light); }
      .scan-bar-header .editable-name:focus { border-color: var(--accent); outline: none; }

      .criticality-toggle {
        cursor: pointer;
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 3px;
        border: none;
        font-weight: 600;
        text-transform: uppercase;
      }
      .criticality-toggle.critical { background: rgba(248,81,73,0.15); color: var(--critical-color); }
      .criticality-toggle.high { background: rgba(210,153,34,0.15); color: var(--high-color); }
      .criticality-toggle.medium { background: rgba(139,148,158,0.15); color: var(--medium-color); }
      .criticality-toggle.low { background: rgba(110,118,129,0.15); color: var(--low-color); }

      .scan-bar-rationale { font-size: 10px; color: var(--text-dim); margin-bottom: 4px; font-style: italic; }

      .repo-chips { display: flex; flex-wrap: wrap; gap: 4px; min-height: 24px; }

      .repo-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-family: var(--font-mono);
        background: var(--accent-bg);
        border: 1px solid var(--border);
        color: var(--text);
        cursor: grab;
        white-space: nowrap;
      }
      .repo-chip:active { cursor: grabbing; }
      .repo-chip.dragging { opacity: 0.4; }
      .repo-chip .repo-lang {
        font-size: 9px;
        color: var(--text-dim);
        margin-left: 2px;
      }

      .unassigned-zone {
        background: var(--surface);
        border: 2px dashed var(--border);
        border-radius: 8px;
        padding: 12px;
        min-height: 60px;
      }
      .unassigned-zone.drag-over { border-color: var(--warning); }
      .unassigned-zone h3 { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }

      .scan-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; }
      .scan-actions-left { display: flex; gap: 8px; }
      .scan-actions-right { display: flex; align-items: center; gap: 8px; }

      .remove-btn {
        background: transparent;
        border: none;
        color: var(--text-dim);
        cursor: pointer;
        font-size: 14px;
        padding: 0 4px;
        line-height: 1;
      }
      .remove-btn:hover { color: var(--failing); }

      .add-bar-btn, .add-platform-btn {
        background: transparent;
        border: 1px dashed var(--border);
        color: var(--text-muted);
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }
      .add-bar-btn:hover, .add-platform-btn:hover { border-color: var(--accent); color: var(--accent); }

      /* Architecture Views (Mermaid diagrams) */
      .arch-views { margin-top: 16px; }
      .arch-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
      .arch-tab {
        padding: 8px 16px;
        cursor: pointer;
        border: none;
        background: none;
        color: var(--text-dim);
        font-size: 13px;
        border-bottom: 2px solid transparent;
        font-family: inherit;
      }
      .arch-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
      .arch-tab:hover { color: var(--text); }
      .diagram-container {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
        min-height: 200px;
        overflow: hidden;
        position: relative;
      }
      .diagram-container svg { max-width: 100%; height: auto; }

      /* ---- Fullscreen Diagram Mode ---- */
      .arch-views.fullscreen {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 200;
        background: var(--bg);
        display: flex;
        flex-direction: column;
        border-radius: 0;
      }
      .arch-views.fullscreen .arch-tabs {
        flex-shrink: 0;
        padding: 8px 16px;
        border-bottom: 1px solid var(--border);
      }
      .arch-views.fullscreen .reactflow-diagram-container {
        flex: 1;
        height: auto !important;
      }
      .arch-views.fullscreen .diagram-container {
        flex: 1;
        min-height: 0;
      }
      .arch-views.fullscreen .diagram-source {
        flex-shrink: 0;
        padding: 0 16px 8px;
      }
      .stride-legend {
        display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
        padding: 8px 12px; margin-top: 8px;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
        font-size: 11px; color: var(--text-muted);
      }
      .stride-legend-title { font-weight: 700; color: var(--text); }
      .stride-legend-item strong { color: var(--accent); }
      .diagram-source { margin-top: 8px; }
      .diagram-source summary { cursor: pointer; color: var(--text-dim); font-size: 12px; }
      .diagram-source pre {
        background: var(--bg-card);
        border: 1px solid var(--border);
        padding: 12px;
        border-radius: 4px;
        font-size: 11px;
        overflow-x: auto;
        margin-top: 4px;
        color: var(--text-dim);
        white-space: pre-wrap;
        word-break: break-word;
      }

      /* ---- Diagram Spinner ---- */
      .diagram-spinner {
        display: flex; align-items: center; justify-content: center;
        gap: 8px; padding: 40px; color: var(--text-dim);
      }

      /* ---- Threat Model ---- */
      .threat-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0; }
      .threat-summary-card {
        background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
        padding: 12px; text-align: center;
      }
      .threat-summary-value { display: block; font-size: 24px; font-weight: 700; color: var(--text); font-family: var(--font-mono); }
      .threat-summary-label { display: block; font-size: 11px; color: var(--text-dim); margin-top: 4px; }
      .threat-table-container { overflow-x: auto; margin: 12px 0; }
      .threat-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .threat-table th { text-align: left; padding: 8px; border-bottom: 1px solid var(--border); color: var(--text-dim); font-weight: 600; }
      .threat-table td { padding: 8px; border-bottom: 1px solid var(--border); }
      .threat-category-badge { background: var(--surface-raised); padding: 2px 8px; border-radius: 4px; font-size: 11px; }
      .section-subheader { font-size: 13px; font-weight: 600; color: var(--text-dim); margin: 16px 0 8px; }
      .threat-model-progress { padding: 16px 0; }
      .threat-model-empty { padding: 8px 0; }
      .btn-sm { font-size: 12px; padding: 4px 12px; }
      .progress-container { display: flex; flex-direction: column; gap: 8px; }
      .progress-bar-track { height: 8px; background: var(--surface-raised); border-radius: 4px; overflow: hidden; }
      .progress-bar-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s ease; }
      .progress-label { font-size: 12px; color: var(--text-muted); }

      /* ---- Pillar Detail: Coming Soon ---- */
      .coming-soon-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.5; }
      .coming-soon-items { font-size: 11px; color: var(--text-dim); margin-top: 4px; }

      ${getEaLensStyles()}

      ${getPolicyStyles()}

      /* ---- Repo Picker Modal ---- */
      .repo-picker-backdrop {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 150; background: rgba(0,0,0,0.5);
      }
      .repo-picker-modal {
        position: fixed; z-index: 200; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--radius); width: 640px; max-width: 95vw;
        max-height: 80vh; display: flex; flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      }
      .repo-picker-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
      }
      .repo-picker-header h3 { font-size: 14px; font-weight: 600; color: var(--text); margin: 0; }
      .repo-picker-close {
        background: none; border: none; color: var(--text-dim);
        font-size: 18px; cursor: pointer; padding: 0 4px;
      }
      .repo-picker-close:hover { color: var(--text); }
      .repo-picker-tabs {
        display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0;
      }
      .repo-picker-tab {
        flex: 1; text-align: center; padding: 8px 12px; font-size: 12px;
        color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent;
        background: none; border-top: none; border-left: none; border-right: none;
        font-family: inherit;
      }
      .repo-picker-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
      .repo-picker-search { padding: 10px 16px; flex-shrink: 0; }
      .repo-picker-search input {
        width: 100%; padding: 6px 10px; font-size: 12px;
        background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
        color: var(--text); outline: none; font-family: inherit;
      }
      .repo-picker-search input:focus { border-color: var(--accent); }
      .repo-picker-list { flex: 1; overflow-y: auto; padding: 0; }
      .repo-picker-item {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 8px 16px; border-bottom: 1px solid var(--border);
        cursor: pointer; transition: background 0.15s;
      }
      .repo-picker-item:hover { background: rgba(136,98,255,0.06); }
      .repo-picker-item input[type="checkbox"] { margin-top: 3px; flex-shrink: 0; accent-color: var(--accent); }
      .repo-picker-item-info { flex: 1; min-width: 0; }
      .repo-picker-item-name { font-size: 12px; font-weight: 500; color: var(--text); }
      .repo-picker-item-desc {
        font-size: 11px; color: var(--text-muted); margin-top: 2px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .repo-picker-item-meta {
        display: flex; align-items: center; gap: 8px; margin-top: 3px; font-size: 10px; color: var(--text-dim);
      }
      .repo-picker-lang-badge {
        display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 10px;
        background: var(--accent-bg); color: var(--accent); font-weight: 500;
      }
      .repo-picker-footer {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px; border-top: 1px solid var(--border); flex-shrink: 0;
      }
      .repo-picker-count { font-size: 11px; color: var(--text-muted); }
      .repo-picker-urls-container { flex: 1; padding: 12px 16px; overflow-y: auto; }
      .repo-picker-urls-container textarea {
        width: 100%; min-height: 200px; padding: 8px; font-size: 12px; font-family: var(--font-mono);
        background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
        color: var(--text); resize: vertical; outline: none;
      }
      .repo-picker-urls-container textarea:focus { border-color: var(--accent); }
      .repo-picker-urls-hint { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
      .repo-picker-loading {
        display: flex; align-items: center; justify-content: center;
        padding: 40px 16px; color: var(--text-muted); gap: 8px;
      }
      .repo-picker-empty {
        text-align: center; padding: 40px 16px; color: var(--text-dim); font-size: 12px;
      }
      .scan-updates-zone {
        margin-top: 16px; padding: 12px;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      }
      .scan-update-card {
        padding: 8px 12px; margin-top: 8px;
        background: rgba(136,98,255,0.06); border: 1px solid var(--border);
        border-left: 3px solid var(--accent); border-radius: var(--radius);
      }

      /* App Tile Grid + App Tile styles — delegated to views/portfolio.ts */

      /* App lens breadcrumb — delegated to views/portfolio.ts */
    </style>
  `;
}

// ============================================================================
// Rendering — Main Dispatcher
// ============================================================================

function render() {
  // Unmount React before innerHTML replacement (destroys DOM)
  unmountDiagramCanvas();
  rootEl.innerHTML = getStyles() + renderView() + renderNistPopup(state.nistControlPopup) + renderRepoPickerModal();
  attachEventHandlers();
  // Render diagrams after DOM update
  setTimeout(() => {
    renderMermaidDiagrams();
    mountReactDiagramIfNeeded();
  }, 0);
}

async function renderMermaidDiagrams() {
  const elements = document.querySelectorAll('.mermaid-diagram[data-diagram]');
  for (const el of Array.from(elements)) {
    const diagramSrc = el.getAttribute('data-diagram') || '';
    if (!diagramSrc) { continue; }
    // Show spinner while rendering
    el.innerHTML = '<div class="diagram-spinner"><div class="spinner"></div><span>Rendering diagram...</span></div>';
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const { svg } = await mermaid.render(id, diagramSrc);
      el.innerHTML = svg;
      // In fullscreen overlay, remove max-width constraint so diagram renders at natural size
      const isFullscreen = el.closest('.diagram-fullscreen-body');
      if (isFullscreen) {
        const svgEl = el.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = 'none';
        }
      }
    } catch {
      el.innerHTML = '<p style="color: var(--failing);">Failed to render diagram</p>';
    }
  }
}

function mountReactDiagramIfNeeded() {
  // Both context and logical views use the same unified calmData (bar.arch.json)
  const calmJson = state.calmData;

  if (state.view !== 'bar-detail' || state.activePillar !== 'architecture') return;
  if (state.activeTab !== 'context' && state.activeTab !== 'logical') return;
  if (!calmJson) return;

  const layout = state.activeTab === 'context'
    ? (state.layouts?.context || null)
    : (state.layouts?.logical || null);

  mountDiagramCanvas('reactflow-canvas-mount', {
    calmData: calmJson as CalmArchitecture,
    diagramType: state.activeTab as 'context' | 'logical',
    savedLayout: layout,
    onLayoutChange: (updatedLayout: DiagramLayout) => {
      if (state.activeTab === 'context') {
        state.layouts = { context: updatedLayout, logical: state.layouts?.logical || null };
      } else {
        state.layouts = { context: state.layouts?.context || null, logical: updatedLayout };
      }
      vscode.postMessage({
        type: 'saveLayout',
        barPath: state.currentBar!.path,
        diagramType: state.activeTab,
        layout: updatedLayout,
      });
    },
    onExportPng: (dataUrl: string) => {
      vscode.postMessage({
        type: 'exportPng',
        barPath: state.currentBar!.path,
        diagramType: state.activeTab,
        pngDataUrl: dataUrl,
      });
    },
    onCalmMutation: (patch: CalmPatch[], updatedCalm: CalmArchitecture) => {
      // Keep local state in sync so render() re-mounts use current data
      state.calmData = updatedCalm;
      vscode.postMessage({
        type: 'calmMutation',
        barPath: state.currentBar!.path,
        patch,
      });
    },
    capabilityModel: state.capabilityModel,
  });
}

function renderView(): string {
  // Loading with no data yet (only for views that expect data)
  if (state.isLoading && !state.portfolio && state.view !== 'init-mesh' && state.view !== 'no-mesh' && state.view !== 'org-scanner') {
    return `
      <div class="lg-header">
        <div class="lg-header-left">
          ${LOOKING_GLASS_SVG}
          <h1>Looking Glass</h1>
        </div>
      </div>
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>${escapeHtml(state.loadingMessage)}</p>
      </div>
    `;
  }

  // Error with no data
  if (state.errorMessage && !state.portfolio && state.view !== 'init-mesh' && state.view !== 'no-mesh') {
    return `
      <div class="lg-header">
        <div class="lg-header-left">
          ${LOOKING_GLASS_SVG}
          <h1>Looking Glass</h1>
        </div>
        <div class="lg-header-right">
          <button id="btn-refresh" class="btn-secondary btn-icon" title="Refresh">&#x21BB;</button>
        </div>
      </div>
      <div class="error-msg">${escapeHtml(state.errorMessage)}</div>
    `;
  }

  switch (state.view) {
    case 'no-mesh': return renderNoMesh();
    case 'portfolio': return renderPortfolio();
    case 'bar-detail': return renderBarDetail(state);
    case 'init-mesh': return renderInitMeshForm();
    case 'add-platform': return renderAddPlatformForm();
    case 'create-bar': return renderCreateBarForm();
    case 'org-scanner': return renderOrgScanner();
    case 'settings': return renderSettings();
    default: return renderNoMesh();
  }
}

// ============================================================================
// View: No Mesh Configured
// ============================================================================

function renderNoMesh(): string {
  return `
    <div class="no-mesh-container">
      ${CHESHIRE_GRIN_SVG}
      <h2>No Governance Mesh Configured</h2>
      <p>Initialize a governance mesh to start tracking your portfolio of applications across platforms with the four governance pillars: Architecture, Security, Information Risk, and Operations.</p>
      ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}
      <button id="btn-init-mesh" class="btn-primary" style="padding: 10px 24px; font-size: 14px;">Initialize Governance Mesh</button>
      <button id="btn-scan-org" class="btn-secondary" style="padding: 10px 24px; font-size: 14px; margin-top: 8px;">Scan GitHub Organization</button>
    </div>
  `;
}

// ============================================================================
// View: Portfolio
// ============================================================================

function renderPortfolio(): string {
  const p = state.portfolio!;

  // Sync capability model from portfolio data
  if (p.capabilityModel) {
    state.capabilityModel = p.capabilityModel as CapabilityModelSummary;
  }

  const meshRepoStr = state.meshOwner && state.meshRepo
    ? `${state.meshOwner}/${state.meshRepo}`
    : undefined;

  return `
    ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}
    ${renderPortfolioHeader(p, LOOKING_GLASS_SVG, state.searchQuery, state.isLoading, meshRepoStr)}
    ${renderGitSyncBanner(state.gitStatus)}
    ${renderEaLensTabs(state.activeLens)}
    ${state.activeLens === 'business'
      ? renderBusinessCapabilityView(state, (bars: BarSummary[]) => renderAppTileGrid(bars, state.gitStatus, needsPush(state.gitStatus), renderScoreRing))
      : state.activeLens === 'policies'
      ? renderPoliciesLensContent(state, (msg) => vscode.postMessage(msg))
      : renderApplicationLensContent(p, state.currentPlatformId, state.barFilter, state.searchQuery, state.gitStatus, needsPush(state.gitStatus), renderScoreRing)}
  `;
}

// needsPush, renderGitSyncBanner — delegated to views/barDetail.ts

// renderApplicationLensContent, renderApplicationPlatformDrillDown — delegated to views/portfolio.ts

// ============================================================================
// EA Lenses — delegated to views/eaLenses.ts
// ============================================================================

// ============================================================================
// Policies Lens — delegated to views/policies.ts
// ============================================================================

// formatTimeAgo — delegated to views/portfolio.ts

function renderRepoPickerModal(): string {
  const m = state.repoPickerModal;
  if (!m) { return ''; }

  const title = m.mode === 'scan'
    ? 'Select Repositories to Analyze'
    : `Add Repositories to ${escapeHtml(m.barName || 'BAR')}`;

  // Count pasted URLs
  const pastedUrlCount = m.pastedUrls.trim()
    ? m.pastedUrls.trim().split('\n').filter(u => u.trim().startsWith('http')).length
    : 0;
  const totalSelected = m.selectedRepoNames.size + pastedUrlCount;

  const createNewTab = m.mode === 'add-to-bar'
    ? `<button class="repo-picker-tab${m.activeTab === 'create-new' ? ' active' : ''}" data-picker-tab="create-new">Create New</button>`
    : '';
  const tabs = `
    <div class="repo-picker-tabs">
      <button class="repo-picker-tab${m.activeTab === 'browse' ? ' active' : ''}" data-picker-tab="browse">Browse Org</button>
      <button class="repo-picker-tab${m.activeTab === 'urls' ? ' active' : ''}" data-picker-tab="urls">Add URLs</button>
      ${createNewTab}
    </div>`;

  let body = '';
  if (m.activeTab === 'browse') {
    if (m.loading) {
      body = `<div class="repo-picker-loading"><span>Loading repos from ${escapeHtml(m.org)}...</span></div>`;
    } else if (m.error) {
      body = `<div class="repo-picker-empty">${escapeHtml(m.error)}</div>`;
    } else {
      const query = m.searchQuery.toLowerCase();
      const filtered = m.repos.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.description || '').toLowerCase().includes(query)
      );

      const search = `
        <div class="repo-picker-search">
          <input type="text" id="repo-picker-search-input" placeholder="Search repos by name or description..." value="${escapeAttr(m.searchQuery)}" />
        </div>`;

      if (filtered.length === 0 && m.repos.length > 0) {
        body = search + `<div class="repo-picker-empty">No matching repositories found.</div>`;
      } else if (m.repos.length === 0) {
        body = search + `<div class="repo-picker-empty">No repositories found for this org. Try the "Add URLs" tab.</div>`;
      } else {
        const items = filtered.map(r => {
          const checked = m.selectedRepoNames.has(r.name) ? 'checked' : '';
          const timeAgo = formatTimeAgo(r.updatedAt);
          const desc = r.description
            ? `<div class="repo-picker-item-desc" title="${escapeAttr(r.description)}">${escapeHtml(r.description.length > 80 ? r.description.slice(0, 80) + '...' : r.description)}</div>`
            : '';
          return `
            <label class="repo-picker-item">
              <input type="checkbox" ${checked} data-repo-checkbox="${escapeAttr(r.name)}" />
              <div class="repo-picker-item-info">
                <div class="repo-picker-item-name">${escapeHtml(r.name)}</div>
                ${desc}
                <div class="repo-picker-item-meta">
                  ${r.language ? `<span class="repo-picker-lang-badge">${escapeHtml(r.language)}</span>` : ''}
                  <span>Updated ${timeAgo}</span>
                </div>
              </div>
            </label>`;
        }).join('');

        body = search + `<div class="repo-picker-list">${items}</div>`;
      }
    }
  } else if (m.activeTab === 'create-new') {
    const repoNameVal = m.createNewRepoUrl.trim();
    const validName = /^[a-zA-Z0-9._-]+$/.test(repoNameVal) && repoNameVal.length > 0;
    const previewUrl = validName ? `https://github.com/${escapeHtml(m.org)}/${escapeHtml(repoNameVal)}` : `https://github.com/${escapeHtml(m.org)}/&lt;name&gt;`;
    body = `
      <div class="repo-picker-urls-container" style="padding: 16px;">
        <label style="font-size: 12px; font-weight: 500; margin-bottom: 8px; display: block;">Organization</label>
        <div style="padding: 8px 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface-alt, var(--surface)); color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">${escapeHtml(m.org || 'unknown')}</div>
        <label style="font-size: 12px; font-weight: 500; margin-bottom: 8px; display: block;">Repository Name</label>
        <input type="text" id="create-new-repo-name" placeholder="new-component" value="${escapeAttr(repoNameVal)}" style="width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); color: var(--text); font-size: 13px;" />
        <div class="repo-picker-urls-hint" style="margin-top: 8px;">Will create <code style="font-size: 11px; padding: 1px 4px; background: var(--surface-alt, var(--surface)); border-radius: 3px;">${previewUrl}</code></div>
      </div>`;

    // Override CTA for create-new tab
    const ctaDisabled = !validName ? 'disabled' : '';
    const ctaText = 'Add &amp; Scaffold';
    return `
      <div class="repo-picker-backdrop" id="repo-picker-backdrop"></div>
      <div class="repo-picker-modal">
        <div class="repo-picker-header">
          <h3>${title}</h3>
          <button class="repo-picker-close" id="repo-picker-close">&times;</button>
        </div>
        ${tabs}
        ${body}
        <div class="repo-picker-footer">
          <span class="repo-picker-count"></span>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" id="repo-picker-cancel">Cancel</button>
            <button class="btn-primary" id="repo-picker-add-scaffold" ${ctaDisabled}>${ctaText}</button>
          </div>
        </div>
      </div>`;
  } else {
    body = `
      <div class="repo-picker-urls-container">
        <textarea id="repo-picker-urls-textarea" placeholder="Paste repository URLs, one per line:&#10;https://github.com/org/repo1&#10;https://github.com/org/repo2">${escapeHtml(m.pastedUrls)}</textarea>
        <div class="repo-picker-urls-hint">Enter full GitHub repository URLs, one per line. These will be added alongside any repos selected in the Browse tab.</div>
      </div>`;
  }

  const ctaDisabled = totalSelected === 0 ? 'disabled' : '';
  const ctaText = m.mode === 'scan'
    ? `Analyze Selected (${totalSelected})`
    : `Add to BAR (${totalSelected})`;

  return `
    <div class="repo-picker-backdrop" id="repo-picker-backdrop"></div>
    <div class="repo-picker-modal">
      <div class="repo-picker-header">
        <h3>${title}</h3>
        <button class="repo-picker-close" id="repo-picker-close">&times;</button>
      </div>
      ${tabs}
      ${body}
      <div class="repo-picker-footer">
        <span class="repo-picker-count">${totalSelected} selected</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" id="repo-picker-cancel">Cancel</button>
          <button class="btn-primary" id="repo-picker-confirm" ${ctaDisabled}>${ctaText}</button>
        </div>
      </div>
    </div>`;
}

// renderPortfolioHeader — delegated to views/portfolio.ts

// ============================================================================
// View: Settings
// ============================================================================

function renderSettings(): string {
  const p = state.portfolio!;
  const meshRepoStr = state.meshOwner && state.meshRepo
    ? `${state.meshOwner}/${state.meshRepo}`
    : undefined;
  return `
    ${renderPortfolioHeader(p, LOOKING_GLASS_SVG, state.searchQuery, state.isLoading, meshRepoStr)}
    <div class="settings-panel">
      <div class="settings-header">
        <button id="btn-back-from-settings" class="btn-ghost">&larr; Back to Portfolio</button>
        <h2>Settings</h2>
      </div>

      ${renderSettingsWorkflow()}
      ${renderSettingsPromptPacks()}
      ${renderSettingsLlmModel()}
      ${renderSettingsMeshSecrets()}
      ${renderSettingsDriftWeights()}
      ${renderSettingsDangerZone()}
    </div>
  `;
}

function settingsRepoHint(): string {
  if (!state.meshOwner || !state.meshRepo) { return ''; }
  return `<span class="text-muted" style="font-size: 11px; margin-left: 8px;">${escapeHtml(state.meshOwner)}/${escapeHtml(state.meshRepo)}</span>`;
}

function renderSettingsWorkflow(): string {
  const statusLabel = deployStatusBadge(state.settingsWorkflowExists);

  const buttonLabel = state.settingsWorkflowExists ? 'Redeploy Workflow' : 'Deploy Workflow';
  const buttonClass = state.settingsWorkflowExists ? 'btn-secondary' : 'btn-primary';

  return `
    <div class="settings-section">
      <h3>Oraculum Workflow ${settingsRepoHint()}</h3>
      <p class="text-muted">The <code>oraculum-review.yml</code> GitHub Action workflow enables automated architecture reviews.</p>
      <div class="settings-row">
        <div class="settings-label">Status</div>
        <div>${statusLabel}</div>
      </div>
      <div class="settings-row">
        <button id="btn-settings-provision" class="${buttonClass}">${buttonLabel}</button>
      </div>
    </div>
  `;
}


function renderSettingsPromptPacks(): string {
  return `
    <div class="settings-section">
      <h3>Prompt Packs</h3>
      <p class="text-muted">
        Refresh bundled prompt packs in <code>.caterpillar/prompts/</code>.
        This overwrites existing packs with the latest versions shipped with the extension.
        Custom packs you added manually are not affected.
      </p>
      <div class="settings-row" style="justify-content: flex-start;">
        <button id="btn-refresh-prompt-packs" class="btn-secondary">Refresh Prompts</button>
      </div>
    </div>
  `;
}

function renderSettingsLlmModel(): string {
  const models = state.availableModels;
  const current = state.settingsPreferredModel || 'gpt-4o';

  let options = '';
  if (models.length > 0) {
    // Deduplicate by family
    const seen = new Set<string>();
    for (const m of models) {
      if (!seen.has(m.family)) {
        seen.add(m.family);
        options += `<option value="${escapeAttr(m.family)}"${m.family === current ? ' selected' : ''}>${escapeHtml(m.name)} (${escapeHtml(m.vendor)})</option>`;
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
      <p class="text-muted">Preferred VS Code Language Model for threat models, org scanning, policy generation, and top findings summaries.</p>
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

function renderSettingsMeshSecrets(): string {
  return `
    <div class="settings-section">
      <h3>Governance Mesh Secrets ${settingsRepoHint()}</h3>
      <p class="text-muted">
        Configure API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY) as GitHub repository secrets on the governance mesh repository.
        Required for Oraculum review workflows and AI-powered governance analysis.
      </p>
      <div class="settings-row" style="justify-content: flex-start;">
        <button id="btn-configure-mesh-secrets" class="btn-primary">Configure Secrets</button>
      </div>
    </div>
  `;
}

function renderSettingsDriftWeights(): string {
  const w = state.settingsDriftWeights;
  return `
    <div class="settings-section">
      <h3>Drift Severity Weights</h3>
      <p class="text-muted">Points deducted from drift score (100 = no drift) per finding severity. Saved to <code>mesh.yaml</code>.</p>
      <div class="settings-row">
        <div class="settings-label" style="color: var(--failing);">Critical</div>
        <input type="number" id="drift-weight-critical" class="settings-number" value="${w.critical}" min="0" max="50" />
      </div>
      <div class="settings-row">
        <div class="settings-label" style="color: var(--warning);">High</div>
        <input type="number" id="drift-weight-high" class="settings-number" value="${w.high}" min="0" max="50" />
      </div>
      <div class="settings-row">
        <div class="settings-label" style="color: var(--text-muted);">Medium</div>
        <input type="number" id="drift-weight-medium" class="settings-number" value="${w.medium}" min="0" max="50" />
      </div>
      <div class="settings-row">
        <div class="settings-label" style="color: var(--text-dim);">Low</div>
        <input type="number" id="drift-weight-low" class="settings-number" value="${w.low}" min="0" max="50" />
      </div>
      <div class="settings-row" style="justify-content: flex-start; margin-top: 12px;">
        <button id="btn-save-drift-weights" class="btn-primary">Save Weights</button>
      </div>
    </div>
  `;
}

function renderSettingsDangerZone(): string {
  let reinitContent = '';
  if (state.settingsReinitConfirmStep === 0) {
    reinitContent = `
      <div class="settings-row" style="justify-content: flex-start;">
        <button id="btn-reinit-mesh" class="btn-danger">Reinitialize Mesh</button>
      </div>
    `;
  } else {
    reinitContent = `
      <div class="danger-warning">
        <strong>Are you sure?</strong> This will delete all platforms, policies, governance, reports, and decorator content, re-scaffold from scratch, and push to remote immediately.
      </div>
      <div class="settings-row" style="margin-top: 8px; gap: 8px; justify-content: flex-start;">
        <button id="btn-reinit-confirm" class="btn-danger">Yes, Reinitialize</button>
        <button id="btn-reinit-cancel" class="btn-secondary">Cancel</button>
      </div>
    `;
  }

  return `
    <div class="settings-section danger-zone">
      <h3>Danger Zone</h3>
      <p class="text-muted">Destructive actions that cannot be easily undone.</p>
      <div style="margin-top: 10px;">
        <strong>Reinitialize Mesh</strong>
        <p class="text-muted" style="margin-top: 4px;">Deletes all mesh content (platforms, policies, governance, reports, decorators), re-runs initialization, and pushes to remote.</p>
      </div>
      ${reinitContent}
    </div>
  `;
}

// renderSummaryCards through renderAppTileGrid — delegated to views/portfolio.ts

// renderLinkedRepos, renderComponentPicker — delegated to views/barDetail.ts

// ============================================================================
// View: BAR Detail (Rabbit Hole) — delegated to views/barDetail.ts
// ============================================================================

// renderAppYamlEditor, renderActivePillarDetail, renderScoreRing, renderPillarCard,
// renderRepoTree, renderDecisionsTable — delegated to views/barDetail.ts

// ============================================================================
// View: Init Mesh Form
// ============================================================================

function renderInitMeshForm(): string {
  const defaultsLoading = state.githubDefaultsLoading;
  const defaultsHint = defaultsLoading
    ? '<span class="defaults-loading">Detecting GitHub defaults...</span>'
    : '';

  return `
    <div class="lg-header">
      <div class="lg-header-left">
        ${LOOKING_GLASS_SVG}
        <h1>Initialize Governance Mesh</h1>
      </div>
      <div class="lg-header-right">
        <button id="btn-cancel-form" class="btn-ghost">&larr; Cancel</button>
      </div>
    </div>

    ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}
    ${defaultsHint}

    <div class="lg-form">
      <div class="form-group">
        <label for="mesh-name">Portfolio Name</label>
        <input type="text" id="mesh-name" placeholder="e.g. Enterprise Cloud Platform" />
      </div>
      <div class="form-group">
        <label for="mesh-org">Organization</label>
        ${state.detectedOrgs.length > 0
          ? `<select id="mesh-org">
              ${state.detectedOrgs.map(o =>
                `<option value="${escapeAttr(o)}"${o === state.detectedOrg ? ' selected' : ''}>${escapeHtml(o)}</option>`
              ).join('')}
              <option value="__custom__">Other...</option>
            </select>
            <input type="text" id="mesh-org-custom" placeholder="Enter organization name" style="display: none; margin-top: 6px;" />`
          : `<input type="text" id="mesh-org" value="${escapeAttr(state.detectedOrg)}" placeholder="${defaultsLoading ? 'Detecting...' : 'e.g. ACME Corp'}" />`
        }
      </div>
      <div class="form-group">
        <label for="mesh-owner">Owner</label>
        <input type="text" id="mesh-owner" value="${escapeAttr(state.detectedOwner)}" placeholder="${defaultsLoading ? 'Detecting...' : 'e.g. chief-architect'}" />
      </div>
      <div class="form-group">
        <label>Mesh Folder</label>
        <div class="folder-picker">
          <button id="btn-pick-folder" class="btn-secondary">Browse...</button>
          <span class="picked-path" id="picked-path">${state.pickedFolderPath ? escapeHtml(state.pickedFolderPath) : (defaultsLoading ? 'Detecting default path...' : 'No folder selected')}</span>
        </div>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="mesh-create-repo" />
        <label for="mesh-create-repo">Create GitHub repository</label>
      </div>
      <div class="conditional-fields" id="repo-fields" style="display: none;">
        <div class="form-group">
          <label for="mesh-repo-name">Repository Name</label>
          <input type="text" id="mesh-repo-name" value="${escapeAttr(state.detectedRepoName)}" placeholder="e.g. governance-mesh" />
        </div>
        <div class="form-group">
          <label for="mesh-repo-visibility">Visibility</label>
          <select id="mesh-repo-visibility">
            <option value="private" selected>Private</option>
            <option value="public">Public</option>
          </select>
        </div>
        <p style="font-size: 11px; color: var(--text-dim); margin-top: -6px;">Requires <a href="https://cli.github.com" style="color: var(--accent);">GitHub CLI (gh)</a> to be installed and authenticated.</p>
      </div>
      <div class="form-group">
        <label for="mesh-dsl">Architecture DSL</label>
        <select id="mesh-dsl">
          <option value="calm" selected>CALM (Common Architecture Language Model)</option>
          <option value="markdown">Markdown Views</option>
        </select>
        <p style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">CALM generates structured JSON architecture artifacts. Markdown creates traditional view documents.</p>
      </div>
      <div class="form-group">
        <label for="mesh-cap-model">Capability Model</label>
        <select id="mesh-cap-model">
          <option value="insurance" selected>Insurance (ACORD-inspired)</option>
          <option value="banking">Banking (BIAN-based)</option>
          <option value="custom">Custom (upload later)</option>
        </select>
        <p style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Business capability hierarchy for the enterprise model. Can be changed later from portfolio settings.</p>
      </div>
      <div class="form-actions">
        <button id="btn-submit-mesh" class="btn-primary" style="padding: 10px 24px;">Initialize Mesh</button>
        <button id="btn-cancel-init" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <div id="init-step-list" class="init-step-list" style="display: none; margin-top: 16px; background: var(--bg-secondary); border-radius: 8px; padding: 8px 0;"></div>
  `;
}

// ============================================================================
// View: Add Platform Form
// ============================================================================

function renderAddPlatformForm(): string {
  return `
    <div class="lg-header">
      <div class="lg-header-left">
        ${LOOKING_GLASS_SVG}
        <h1>Add Platform</h1>
      </div>
      <div class="lg-header-right">
        <button id="btn-back-portfolio" class="btn-ghost">&larr; Back</button>
      </div>
    </div>

    ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}

    <div class="lg-form">
      <div class="form-group">
        <label for="platform-name">Platform Name</label>
        <input type="text" id="platform-name" placeholder="e.g. Customer Engagement Platform" />
      </div>
      <div class="form-group">
        <label for="platform-abbr">Abbreviation</label>
        <input type="text" id="platform-abbr" placeholder="e.g. CEP" style="text-transform: uppercase;" />
      </div>
      <div class="form-group">
        <label for="platform-owner">Owner</label>
        <input type="text" id="platform-owner" placeholder="e.g. team-lead@acme.com" />
      </div>
      <div class="form-actions">
        <button id="btn-submit-platform" class="btn-primary" style="padding: 10px 24px;">Add Platform</button>
        <button id="btn-cancel-platform" class="btn-secondary">Cancel</button>
      </div>
    </div>

    ${state.isLoading ? `
      <div class="loading-overlay" style="padding: 20px;">
        <div class="spinner"></div>
        <p>${escapeHtml(state.loadingMessage)}</p>
      </div>
    ` : ''}
  `;
}

// ============================================================================
// View: Create BAR Form
// ============================================================================

function renderCreateBarForm(): string {
  const p = state.portfolio;
  const platforms = p ? p.platforms : [];

  const platformOptions = platforms.map(pl =>
    `<option value="${escapeAttr(pl.id)}">${escapeHtml(pl.name)} (${escapeHtml(pl.id)})</option>`
  ).join('');

  return `
    <div class="lg-header">
      <div class="lg-header-left">
        ${LOOKING_GLASS_SVG}
        <h1>Add Application</h1>
      </div>
      <div class="lg-header-right">
        <button id="btn-back-portfolio" class="btn-ghost">&larr; Back</button>
      </div>
    </div>

    ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}

    <div class="lg-form">
      <div class="form-group">
        <label for="bar-name">Application Name</label>
        <input type="text" id="bar-name" placeholder="e.g. Payment Gateway Service" />
      </div>
      <div class="form-group">
        <label for="bar-platform">Platform</label>
        <select id="bar-platform">
          <option value="">Select a platform...</option>
          ${platformOptions}
        </select>
      </div>
      <div class="form-group">
        <label for="bar-criticality">Criticality</label>
        <select id="bar-criticality">
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium" selected>Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div class="form-group">
        <label for="bar-template">Template</label>
        <select id="bar-template">
          <option value="minimal">Minimal</option>
          <option value="standard" selected>Standard</option>
          <option value="full">Full</option>
        </select>
      </div>
      <div class="form-actions">
        <button id="btn-submit-bar" class="btn-primary" style="padding: 10px 24px;">Add Application</button>
        <button id="btn-cancel-bar" class="btn-secondary">Cancel</button>
      </div>
    </div>

    ${state.isLoading ? `
      <div class="loading-overlay" style="padding: 20px;">
        <div class="spinner"></div>
        <p>${escapeHtml(state.loadingMessage)}</p>
      </div>
    ` : ''}
  `;
}

// ============================================================================
// View: Org Scanner
// ============================================================================

function renderOrgScanner(): string {
  const rec = state.orgScanRecommendation;

  // Sub-state 1: Input form (no recommendation yet, not scanning)
  if (!rec && state.orgScanProgress === 0) {
    return `
      <div class="lg-header">
        <div class="lg-header-left">
          ${LOOKING_GLASS_SVG}
          <h1>Scan Organization</h1>
        </div>
        <div class="lg-header-right">
          <button id="btn-back-portfolio" class="btn-secondary">&#x2190; Back</button>
        </div>
      </div>
      ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}
      <div class="form-card">
        <p style="margin-bottom: 12px; color: var(--text-muted);">Scan a GitHub organization's repositories. The AI will analyze repo names, descriptions, and READMEs to recommend a platform and BAR structure.</p>
        <div class="org-scanner-input">
          <input type="text" id="scan-org-name" class="input" placeholder="GitHub organization name" value="${escapeAttr(state.portfolio?.portfolio?.org || state.detectedOrg || '')}" />
          <select id="scan-model-select" style="min-width: 140px;">
            <option value="">Auto-detect model</option>
            ${state.availableModels.map(m =>
              `<option value="${escapeAttr(m.family)}"${m.family === state.selectedModelFamily ? ' selected' : ''}>${escapeHtml(m.name)}</option>`
            ).join('')}
          </select>
          <button id="btn-start-scan" class="btn-primary">Scan</button>
        </div>
        ${state.availableModels.length === 0 ? '<p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Loading available models...</p>' : ''}
      </div>
    `;
  }

  // Sub-state 2: Scanning in progress
  if (!rec && state.orgScanProgress > 0) {
    const p = state.orgScanProgress;
    const step = state.orgScanStep;

    // Determine step statuses from progress percentage
    const fetchStatus = p >= 30 ? 'done' : p >= 1 ? 'active' : 'pending';
    const readmeStatus = p >= 60 ? 'done' : p >= 30 ? 'active' : 'pending';
    const analyzeStatus = p >= 90 ? 'done' : p >= 60 ? 'active' : 'pending';
    const parseStatus = p >= 100 ? 'done' : p >= 90 ? 'active' : 'pending';

    const stepIcon = (s: string) =>
      s === 'done' ? '&#10003;' : s === 'error' ? '&#10007;' : '&#9679;';

    const stepMessage = (s: string, range: [number, number]) =>
      s === 'active' ? escapeHtml(step) : '';

    return `
      <div class="lg-header">
        <div class="lg-header-left">
          ${LOOKING_GLASS_SVG}
          <h1>Scanning Organization</h1>
        </div>
      </div>
      <div style="max-width: 520px;">
        <div class="progress-container" style="margin-bottom: 16px;">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${p}%"></div>
          </div>
        </div>
        <div class="init-step-list">
          <div class="init-step-item ${fetchStatus}">
            <div class="init-step-icon">${stepIcon(fetchStatus)}</div>
            <span class="init-step-label">(1) Fetch repositories</span>
            <span class="init-step-message">${fetchStatus === 'active' ? escapeHtml(step) : ''}</span>
          </div>
          <div class="init-step-item ${readmeStatus}">
            <div class="init-step-icon">${stepIcon(readmeStatus)}</div>
            <span class="init-step-label">(2) Read READMEs</span>
            <span class="init-step-message">${readmeStatus === 'active' ? escapeHtml(step) : ''}</span>
          </div>
          <div class="init-step-item ${analyzeStatus}">
            <div class="init-step-icon">${stepIcon(analyzeStatus)}</div>
            <span class="init-step-label">(3) Analyze with AI</span>
            <span class="init-step-message">${analyzeStatus === 'active' ? escapeHtml(step) : ''}</span>
          </div>
          <div class="init-step-item ${parseStatus}">
            <div class="init-step-icon">${stepIcon(parseStatus)}</div>
            <span class="init-step-label">(4) Parse recommendations</span>
            <span class="init-step-message">${parseStatus === 'active' ? escapeHtml(step) : ''}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Sub-state 3: Results with drag/drop canvas
  if (!rec) { return ''; }

  const platformCards = rec.platforms.map(platform => {
    const barCards = platform.bars.map(bar => {
      const repoChips = bar.repos.map(repo =>
        `<div class="repo-chip" draggable="true" data-repo-name="${escapeAttr(repo.name)}" data-source-bar="${escapeAttr(bar.id)}" data-source-platform="${escapeAttr(platform.id)}" title="${escapeAttr(repo.description || repo.fullName)}">
          <span>${escapeHtml(repo.name)}</span>
          ${repo.language ? `<span class="repo-lang">${escapeHtml(repo.language)}</span>` : ''}
        </div>`
      ).join('');

      return `
        <div class="scan-bar-card" data-bar-id="${escapeAttr(bar.id)}" data-platform-id="${escapeAttr(platform.id)}">
          <div class="scan-bar-header">
            <input type="text" class="editable-name bar-name-input" data-bar-id="${escapeAttr(bar.id)}" data-platform-id="${escapeAttr(platform.id)}" value="${escapeAttr(bar.name)}" />
            <button class="criticality-toggle ${bar.criticality}" data-bar-id="${escapeAttr(bar.id)}" data-platform-id="${escapeAttr(platform.id)}">${bar.criticality}</button>
            <button class="remove-btn remove-bar-btn" data-bar-id="${escapeAttr(bar.id)}" data-platform-id="${escapeAttr(platform.id)}" title="Remove BAR">&times;</button>
          </div>
          ${bar.rationale ? `<div class="scan-bar-rationale">${escapeHtml(bar.rationale)}</div>` : ''}
          <div class="repo-chips" data-drop-bar="${escapeAttr(bar.id)}" data-drop-platform="${escapeAttr(platform.id)}">
            ${repoChips || '<span style="font-size:11px;color:var(--text-dim)">Drop repos here</span>'}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="scan-platform-card" data-platform-id="${escapeAttr(platform.id)}">
        <div class="scan-platform-header">
          <input type="text" class="editable-name platform-name-input" data-platform-id="${escapeAttr(platform.id)}" value="${escapeAttr(platform.name)}" />
          <span class="scan-platform-abbr">PLT-${escapeHtml(platform.abbreviation)}</span>
          <button class="remove-btn remove-platform-btn" data-platform-id="${escapeAttr(platform.id)}" title="Remove platform">&times;</button>
        </div>
        ${platform.rationale ? `<div class="scan-platform-rationale">${escapeHtml(platform.rationale)}</div>` : ''}
        <div class="scan-bars-container">
          ${barCards}
          <button class="add-bar-btn" data-platform-id="${escapeAttr(platform.id)}">+ Add BAR</button>
        </div>
      </div>
    `;
  }).join('');

  const unassignedChips = rec.unassigned.map(repo =>
    `<div class="repo-chip" draggable="true" data-repo-name="${escapeAttr(repo.name)}" data-source-bar="unassigned" data-source-platform="unassigned" title="${escapeAttr(repo.description || repo.fullName)}">
      <span>${escapeHtml(repo.name)}</span>
      ${repo.language ? `<span class="repo-lang">${escapeHtml(repo.language)}</span>` : ''}
    </div>`
  ).join('');

  return `
    <div class="lg-header">
      <div class="lg-header-left">
        ${LOOKING_GLASS_SVG}
        <h1>Org Scanner</h1>
        <span class="portfolio-badge">${rec.platforms.length} platforms &middot; ${rec.platforms.reduce((s, p) => s + p.bars.length, 0)} BARs</span>
      </div>
      <div class="lg-header-right">
        <select id="scan-template" class="input" style="width: auto; padding: 6px 8px;">
          <option value="minimal" ${state.orgScanTemplate === 'minimal' ? 'selected' : ''}>Minimal</option>
          <option value="standard" ${state.orgScanTemplate === 'standard' ? 'selected' : ''}>Standard</option>
          <option value="full" ${state.orgScanTemplate === 'full' ? 'selected' : ''}>Full</option>
        </select>
        <button id="btn-apply-scan" class="btn-primary">Apply</button>
        <button id="btn-back-portfolio" class="btn-secondary">&#x2190; Back</button>
      </div>
    </div>
    ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}
    <div class="drag-canvas">
      ${platformCards}
    </div>
    <div class="unassigned-zone" data-drop-bar="unassigned" data-drop-platform="unassigned">
      <h3>Unassigned Repositories (${rec.unassigned.length})</h3>
      <div class="repo-chips">
        ${unassignedChips || '<span style="font-size:11px;color:var(--text-dim)">No unassigned repositories</span>'}
      </div>
    </div>
    ${(rec.updates && rec.updates.length > 0) ? `
    <div class="scan-updates-zone">
      <h3 style="margin-bottom: 8px; font-size: 12px; color: var(--text-muted);">Updates to Existing BARs (${rec.updates.length})</h3>
      ${rec.updates.map(u => `
        <div class="scan-update-card">
          <div style="font-size: 12px; font-weight: 500; color: var(--text);">
            ${escapeHtml(u.barName)} <span style="font-size: 10px; color: var(--text-muted);">(${escapeHtml(u.platformName)})</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin: 4px 0;">${escapeHtml(u.rationale)}</div>
          <div class="repo-chips">
            ${u.addRepos.map(url => {
              const name = url.split('/').pop() || url;
              return `<div class="repo-chip"><span>${escapeHtml(name)}</span></div>`;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>` : ''}
    <div class="scan-actions">
      <div class="scan-actions-left">
        <button class="add-platform-btn" id="btn-add-scan-platform">+ Add Platform</button>
      </div>
    </div>
  `;
}

// ============================================================================
// Event Handlers
// ============================================================================

function attachEventHandlers() {
  // Refresh
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'refresh' });
  });

  // Settings gear
  document.getElementById('btn-settings-gear')?.addEventListener('click', () => {
    state.view = 'settings';
    state.settingsReinitConfirmStep = 0;
    vscode.postMessage({ type: 'checkWorkflowStatus' });
    vscode.postMessage({ type: 'listModels' });
    vscode.postMessage({ type: 'loadDriftWeights' });
    render();
  });

  // Settings: back to portfolio
  document.getElementById('btn-back-from-settings')?.addEventListener('click', () => {
    state.view = 'portfolio';
    state.settingsReinitConfirmStep = 0;
    render();
  });

  // Settings: provision workflow
  document.getElementById('btn-settings-provision')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'provisionWorkflow' });
  });

  // Settings: refresh prompt packs
  document.getElementById('btn-refresh-prompt-packs')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'refreshPromptPacks' });
  });

  // Settings: save model preference
  document.getElementById('btn-save-model-pref')?.addEventListener('click', () => {
    const select = document.getElementById('settings-model-select') as HTMLSelectElement;
    if (select) {
      vscode.postMessage({ type: 'savePreferredModel', family: select.value });
    }
  });

  // Settings: configure mesh secrets
  document.getElementById('btn-configure-mesh-secrets')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'configureMeshSecrets' });
  });

  // Settings: save drift weights
  document.getElementById('btn-save-drift-weights')?.addEventListener('click', () => {
    const critical = parseInt((document.getElementById('drift-weight-critical') as HTMLInputElement)?.value || '15', 10);
    const high = parseInt((document.getElementById('drift-weight-high') as HTMLInputElement)?.value || '5', 10);
    const medium = parseInt((document.getElementById('drift-weight-medium') as HTMLInputElement)?.value || '2', 10);
    const low = parseInt((document.getElementById('drift-weight-low') as HTMLInputElement)?.value || '1', 10);
    const weights = { critical, high, medium, low };
    state.settingsDriftWeights = weights;
    vscode.postMessage({ type: 'saveDriftWeights', weights });
  });

  // Settings: reinitialize mesh (first click — show warning)
  document.getElementById('btn-reinit-mesh')?.addEventListener('click', () => {
    state.settingsReinitConfirmStep = 1;
    render();
  });

  // Settings: confirm reinitialize
  document.getElementById('btn-reinit-confirm')?.addEventListener('click', () => {
    state.settingsReinitConfirmStep = 0;
    vscode.postMessage({ type: 'reinitializeMesh' });
  });

  // Settings: cancel reinitialize
  document.getElementById('btn-reinit-cancel')?.addEventListener('click', () => {
    state.settingsReinitConfirmStep = 0;
    render();
  });

  // Navigation: back to portfolio
  document.getElementById('btn-back-portfolio')?.addEventListener('click', () => {
    state.view = 'portfolio';
    state.currentPlatformId = null;
    state.searchQuery = '';
    state.barFilter = 'all';
    state.errorMessage = '';
    vscode.postMessage({ type: 'backToPortfolio' });
    render();
  });

  // No-mesh init button
  document.getElementById('btn-init-mesh')?.addEventListener('click', () => {
    state.view = 'init-mesh';
    state.errorMessage = '';
    state.githubDefaultsLoading = true;
    render();
    vscode.postMessage({ type: 'detectGitHubDefaults' });
  });

  // Cancel form (from init mesh with no portfolio)
  document.getElementById('btn-cancel-form')?.addEventListener('click', () => {
    if (state.portfolio) {
      state.view = 'portfolio';
    } else {
      state.view = 'no-mesh';
    }
    state.isLoading = false;
    state.githubDefaultsLoading = false;
    state.initSteps = [];
    state.errorMessage = '';
    render();
  });

  // Add platform buttons
  document.getElementById('btn-add-platform')?.addEventListener('click', () => {
    state.view = 'add-platform';
    state.errorMessage = '';
    render();
  });
  document.getElementById('btn-add-platform-empty')?.addEventListener('click', () => {
    state.view = 'add-platform';
    state.errorMessage = '';
    render();
  });

  // Sample Platform button
  document.getElementById('btn-sample-platform')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'samplePlatform' });
  });

  // Create BAR button
  document.getElementById('btn-create-bar')?.addEventListener('click', () => {
    state.view = 'create-bar';
    state.errorMessage = '';
    render();
  });

  // ---------- Portfolio Events (delegated to views/portfolio.ts) ----------
  attachPortfolioEvents(
    vscode,
    () => state,
    (updates) => { Object.assign(state, updates); },
    render,
  );

  // ---------- BAR Detail Events (delegated to views/barDetail.ts) ----------
  attachBarDetailEvents(
    vscode,
    () => state,
    (updates) => { Object.assign(state, updates); },
    render,
  );

  // Folder picker
  document.getElementById('btn-pick-folder')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'pickFolder' });
  });

  // Org field — handle <select> with "Other..." or plain <input>
  const meshOrgEl = document.getElementById('mesh-org') as HTMLSelectElement | HTMLInputElement | null;
  const meshOrgCustom = document.getElementById('mesh-org-custom') as HTMLInputElement | null;

  const updateRepoNameFromOrg = (orgVal: string) => {
    if (orgVal && orgVal !== '__custom__') {
      const repoNameEl = document.getElementById('mesh-repo-name') as HTMLInputElement | null;
      if (repoNameEl) {
        repoNameEl.value = `${orgVal.toLowerCase()}-governance-mesh`;
      }
    }
  };

  if (meshOrgEl && meshOrgEl.tagName === 'SELECT') {
    // Select mode with "Other..." option
    meshOrgEl.addEventListener('change', () => {
      const val = meshOrgEl.value;
      if (val === '__custom__' && meshOrgCustom) {
        meshOrgCustom.style.display = 'block';
        meshOrgCustom.focus();
      } else {
        if (meshOrgCustom) { meshOrgCustom.style.display = 'none'; }
        updateRepoNameFromOrg(val);
      }
    });
    if (meshOrgCustom) {
      meshOrgCustom.addEventListener('input', () => {
        updateRepoNameFromOrg(meshOrgCustom.value.trim());
      });
    }
  } else if (meshOrgEl) {
    // Plain text input mode (no orgs detected)
    meshOrgEl.addEventListener('input', () => {
      updateRepoNameFromOrg((meshOrgEl as HTMLInputElement).value.trim());
    });
  }

  // Create repo checkbox toggle
  const createRepoCheckbox = document.getElementById('mesh-create-repo') as HTMLInputElement | null;
  const repoFields = document.getElementById('repo-fields');
  if (createRepoCheckbox && repoFields) {
    createRepoCheckbox.addEventListener('change', () => {
      repoFields.style.display = createRepoCheckbox.checked ? 'block' : 'none';
    });
  }

  // Init mesh submit
  document.getElementById('btn-submit-mesh')?.addEventListener('click', () => {
    const name = (document.getElementById('mesh-name') as HTMLInputElement).value.trim();
    const orgEl = document.getElementById('mesh-org') as HTMLSelectElement | HTMLInputElement;
    const orgCustomEl = document.getElementById('mesh-org-custom') as HTMLInputElement | null;
    const org = (orgEl?.value === '__custom__' && orgCustomEl)
      ? orgCustomEl.value.trim()
      : orgEl?.value?.trim() || '';
    const owner = (document.getElementById('mesh-owner') as HTMLInputElement).value.trim();
    const folderPath = state.pickedFolderPath;
    const createRepo = (document.getElementById('mesh-create-repo') as HTMLInputElement)?.checked || false;
    const repoName = (document.getElementById('mesh-repo-name') as HTMLInputElement)?.value.trim() || '';
    const repoVisibility = ((document.getElementById('mesh-repo-visibility') as HTMLSelectElement)?.value || 'private') as 'private' | 'public';
    const architectureDsl = ((document.getElementById('mesh-dsl') as HTMLSelectElement)?.value || 'calm') as 'calm' | 'markdown';
    const capabilityModel = ((document.getElementById('mesh-cap-model') as HTMLSelectElement)?.value || 'insurance') as CapabilityModelType;

    if (!name) { state.errorMessage = 'Please enter a portfolio name.'; render(); return; }
    if (!org) { state.errorMessage = 'Please enter an organization name.'; render(); return; }
    if (!owner) { state.errorMessage = 'Please enter an owner email.'; render(); return; }
    if (!folderPath) { state.errorMessage = 'Please select a folder for the mesh.'; render(); return; }
    if (createRepo && !repoName) { state.errorMessage = 'Please enter a repository name.'; render(); return; }

    state.errorMessage = '';
    vscode.postMessage({ type: 'initMesh', name, org, owner, folderPath, createRepo, repoName, repoVisibility, architectureDsl, capabilityModel });
  });

  // Cancel init mesh
  document.getElementById('btn-cancel-init')?.addEventListener('click', () => {
    if (state.portfolio) {
      state.view = 'portfolio';
    } else {
      state.view = 'no-mesh';
    }
    state.isLoading = false;
    state.githubDefaultsLoading = false;
    state.initSteps = [];
    state.errorMessage = '';
    render();
  });

  // Add platform submit
  document.getElementById('btn-submit-platform')?.addEventListener('click', () => {
    const name = (document.getElementById('platform-name') as HTMLInputElement).value.trim();
    const abbreviation = (document.getElementById('platform-abbr') as HTMLInputElement).value.trim().toUpperCase();
    const owner = (document.getElementById('platform-owner') as HTMLInputElement).value.trim();

    if (!name) { state.errorMessage = 'Please enter a platform name.'; render(); return; }
    if (!abbreviation) { state.errorMessage = 'Please enter an abbreviation.'; render(); return; }
    if (!owner) { state.errorMessage = 'Please enter an owner.'; render(); return; }

    state.errorMessage = '';
    vscode.postMessage({ type: 'addPlatform', name, abbreviation, owner });
  });

  // Cancel add platform
  document.getElementById('btn-cancel-platform')?.addEventListener('click', () => {
    state.view = 'portfolio';
    state.errorMessage = '';
    render();
  });

  // Create BAR submit
  document.getElementById('btn-submit-bar')?.addEventListener('click', () => {
    const name = (document.getElementById('bar-name') as HTMLInputElement).value.trim();
    const platformId = (document.getElementById('bar-platform') as HTMLSelectElement).value;
    const criticality = (document.getElementById('bar-criticality') as HTMLSelectElement).value as Criticality;
    const template = (document.getElementById('bar-template') as HTMLSelectElement).value as 'minimal' | 'standard' | 'full';

    if (!name) { state.errorMessage = 'Please enter an application name.'; render(); return; }
    if (!platformId) { state.errorMessage = 'Please select a platform.'; render(); return; }

    state.errorMessage = '';
    vscode.postMessage({ type: 'scaffoldBar', name, platformId, criticality, template });
  });

  // Cancel create BAR
  document.getElementById('btn-cancel-bar')?.addEventListener('click', () => {
    state.view = 'portfolio';
    state.errorMessage = '';
    render();
  });

  // ---- Org Scanner handlers ----

  // Navigate to org scanner
  document.getElementById('btn-scan-org')?.addEventListener('click', () => {
    const org = state.portfolio?.portfolio?.org || state.detectedOrg || '';
    if (org) {
      // Open repo picker modal for org scan
      state.repoPickerModal = {
        mode: 'scan',
        org,
        repos: [],
        selectedRepoNames: new Set(),
        searchQuery: '',
        activeTab: 'browse',
        pastedUrls: '',
        createNewRepoUrl: '',
        loading: true,
        error: '',
      };
      state.errorMessage = '';
      render();
      vscode.postMessage({ type: 'listModels' });
      vscode.postMessage({ type: 'loadOrgRepos', org });
    } else {
      // No org detected — fall back to the old org-scanner input form
      state.view = 'org-scanner';
      state.orgScanRecommendation = null;
      state.orgScanProgress = 0;
      state.orgScanStep = '';
      state.errorMessage = '';
      render();
      vscode.postMessage({ type: 'listModels' });
    }
  });

  // Start scan
  document.getElementById('btn-start-scan')?.addEventListener('click', () => {
    const orgInput = document.getElementById('scan-org-name') as HTMLInputElement;
    const org = orgInput?.value.trim();
    if (!org) {
      state.errorMessage = 'Please enter an organization name.';
      render();
      return;
    }
    const modelSelect = document.getElementById('scan-model-select') as HTMLSelectElement | null;
    const modelFamily = modelSelect?.value || undefined;
    state.errorMessage = '';
    state.orgScanProgress = 1;
    state.orgScanStep = 'Starting scan...';
    render();
    vscode.postMessage({ type: 'scanOrg', org, modelFamily });
  });

  // Template selection
  document.getElementById('scan-template')?.addEventListener('change', (e) => {
    state.orgScanTemplate = (e.target as HTMLSelectElement).value as 'minimal' | 'standard' | 'full';
  });

  // Apply org scan
  document.getElementById('btn-apply-scan')?.addEventListener('click', () => {
    const rec = state.orgScanRecommendation;
    if (!rec) { return; }

    // Validate: each BAR must have at least 1 repo
    for (const platform of rec.platforms) {
      for (const bar of platform.bars) {
        if (bar.repos.length === 0) {
          state.errorMessage = `BAR "${bar.name}" in platform "${platform.name}" has no repositories. Remove it or add repos.`;
          render();
          return;
        }
      }
      if (platform.bars.length === 0) {
        state.errorMessage = `Platform "${platform.name}" has no BARs. Remove it or add BARs.`;
        render();
        return;
      }
    }

    if (rec.platforms.length === 0) {
      state.errorMessage = 'No platforms to apply. Add at least one platform with BARs.';
      render();
      return;
    }

    state.errorMessage = '';
    vscode.postMessage({ type: 'applyOrgScan', platforms: rec.platforms, template: state.orgScanTemplate, updates: rec.updates || [] });
  });

  // Add platform to scan results
  document.getElementById('btn-add-scan-platform')?.addEventListener('click', () => {
    const rec = state.orgScanRecommendation;
    if (!rec) { return; }
    const newId = `plat-${Date.now()}`;
    rec.platforms.push({
      id: newId,
      name: 'New Platform',
      abbreviation: 'NEW',
      bars: [],
      rationale: '',
    });
    render();
  });

  // Add BAR to platform
  document.querySelectorAll('.add-bar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rec = state.orgScanRecommendation;
      if (!rec) { return; }
      const platformId = (btn as HTMLElement).dataset.platformId;
      const platform = rec.platforms.find(p => p.id === platformId);
      if (!platform) { return; }
      const newBarId = `bar-${Date.now()}`;
      platform.bars.push({
        id: newBarId,
        name: 'New Application',
        repos: [],
        criticality: 'medium',
        rationale: '',
      });
      render();
    });
  });

  // Remove platform
  document.querySelectorAll('.remove-platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rec = state.orgScanRecommendation;
      if (!rec) { return; }
      const platformId = (btn as HTMLElement).dataset.platformId;
      const platform = rec.platforms.find(p => p.id === platformId);
      if (!platform) { return; }
      // Move all repos to unassigned
      for (const bar of platform.bars) {
        rec.unassigned.push(...bar.repos);
      }
      rec.platforms = rec.platforms.filter(p => p.id !== platformId);
      render();
    });
  });

  // Remove BAR
  document.querySelectorAll('.remove-bar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rec = state.orgScanRecommendation;
      if (!rec) { return; }
      const barId = (btn as HTMLElement).dataset.barId;
      const platformId = (btn as HTMLElement).dataset.platformId;
      const platform = rec.platforms.find(p => p.id === platformId);
      if (!platform) { return; }
      const bar = platform.bars.find(b => b.id === barId);
      if (bar) {
        rec.unassigned.push(...bar.repos);
        platform.bars = platform.bars.filter(b => b.id !== barId);
      }
      render();
    });
  });

  // Criticality toggle
  document.querySelectorAll('.criticality-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const rec = state.orgScanRecommendation;
      if (!rec) { return; }
      const barId = (btn as HTMLElement).dataset.barId;
      const platformId = (btn as HTMLElement).dataset.platformId;
      const platform = rec.platforms.find(p => p.id === platformId);
      if (!platform) { return; }
      const bar = platform.bars.find(b => b.id === barId);
      if (!bar) { return; }
      const levels: Criticality[] = ['critical', 'high', 'medium', 'low'];
      const idx = levels.indexOf(bar.criticality);
      bar.criticality = levels[(idx + 1) % levels.length];
      render();
    });
  });

  // Platform name editing
  document.querySelectorAll('.platform-name-input').forEach(input => {
    input.addEventListener('change', () => {
      const rec = state.orgScanRecommendation;
      if (!rec) { return; }
      const platformId = (input as HTMLInputElement).dataset.platformId;
      const platform = rec.platforms.find(p => p.id === platformId);
      if (platform) {
        platform.name = (input as HTMLInputElement).value.trim() || platform.name;
      }
    });
  });

  // BAR name editing
  document.querySelectorAll('.bar-name-input').forEach(input => {
    input.addEventListener('change', () => {
      const rec = state.orgScanRecommendation;
      if (!rec) { return; }
      const barId = (input as HTMLInputElement).dataset.barId;
      const platformId = (input as HTMLInputElement).dataset.platformId;
      const platform = rec.platforms.find(p => p.id === platformId);
      if (!platform) { return; }
      const bar = platform.bars.find(b => b.id === barId);
      if (bar) {
        bar.name = (input as HTMLInputElement).value.trim() || bar.name;
      }
    });
  });

  // ---- Drag and Drop ----

  // Drag start for repo chips
  document.querySelectorAll('.repo-chip[draggable="true"]').forEach(chip => {
    chip.addEventListener('dragstart', (e) => {
      const el = chip as HTMLElement;
      el.classList.add('dragging');
      const dragEvent = e as DragEvent;
      dragEvent.dataTransfer!.setData('text/plain', JSON.stringify({
        repoName: el.dataset.repoName,
        sourceBar: el.dataset.sourceBar,
        sourcePlatform: el.dataset.sourcePlatform,
      }));
      dragEvent.dataTransfer!.effectAllowed = 'move';
    });

    chip.addEventListener('dragend', () => {
      (chip as HTMLElement).classList.remove('dragging');
    });
  });

  // Drop zones (BAR repo containers + unassigned zone)
  document.querySelectorAll('[data-drop-bar]').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragEvent = e as DragEvent;
      dragEvent.dataTransfer!.dropEffect = 'move';
      // Find the closest card to highlight
      const card = (zone as HTMLElement).closest('.scan-bar-card, .unassigned-zone');
      if (card) { card.classList.add('drag-over'); }
    });

    zone.addEventListener('dragleave', (e) => {
      const card = ((e as DragEvent).currentTarget as HTMLElement).closest('.scan-bar-card, .unassigned-zone');
      if (card) { card.classList.remove('drag-over'); }
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      const rec = state.orgScanRecommendation;
      if (!rec) { return; }

      const card = ((e as DragEvent).currentTarget as HTMLElement).closest('.scan-bar-card, .unassigned-zone');
      if (card) { card.classList.remove('drag-over'); }

      const dragEvent = e as DragEvent;
      let data: { repoName: string; sourceBar: string; sourcePlatform: string };
      try {
        data = JSON.parse(dragEvent.dataTransfer!.getData('text/plain'));
      } catch { return; }

      const targetBar = (zone as HTMLElement).dataset.dropBar;
      const targetPlatform = (zone as HTMLElement).dataset.dropPlatform;

      // Don't drop on same location
      if (data.sourceBar === targetBar && data.sourcePlatform === targetPlatform) { return; }

      // Find and remove repo from source
      let repo: OrgRepo | undefined;

      if (data.sourceBar === 'unassigned') {
        const idx = rec.unassigned.findIndex(r => r.name === data.repoName);
        if (idx >= 0) {
          repo = rec.unassigned.splice(idx, 1)[0];
        }
      } else {
        const srcPlatform = rec.platforms.find(p => p.id === data.sourcePlatform);
        if (srcPlatform) {
          const srcBar = srcPlatform.bars.find(b => b.id === data.sourceBar);
          if (srcBar) {
            const idx = srcBar.repos.findIndex(r => r.name === data.repoName);
            if (idx >= 0) {
              repo = srcBar.repos.splice(idx, 1)[0];
            }
          }
        }
      }

      if (!repo) { return; }

      // Add repo to target
      if (targetBar === 'unassigned') {
        rec.unassigned.push(repo);
      } else {
        const tgtPlatform = rec.platforms.find(p => p.id === targetPlatform);
        if (tgtPlatform) {
          const tgtBar = tgtPlatform.bars.find(b => b.id === targetBar);
          if (tgtBar) {
            tgtBar.repos.push(repo);
          }
        }
      }

      render();
    });
  });

  // Pillar card clicks, close pillar, drift listeners, agent status, app.yaml editor,
  // sync/push/pull, pillar event handlers, Absolem, diagram fullscreen
  // — delegated to views/barDetail.ts via attachBarDetailEvents above

  // ---------- EA Lens Events (delegated to views/eaLenses.ts) ----------
  attachEaLensEvents(
    vscode,
    () => state,
    (updates) => { Object.assign(state, updates); },
    render,
  );

  // App Tile Clicks + Platform Breadcrumb — handled by attachPortfolioEvents above

  // ---------- Policy Events (delegated to views/policies.ts) ----------
  attachPolicyEvents(
    vscode,
    () => state,
    (updates) => { Object.assign(state, updates); },
    render,
  );

  // Linked Repo Clicks — delegated to views/barDetail.ts via attachBarDetailEvents above

  // ---------- Repo Picker Modal ----------
  document.getElementById('repo-picker-close')?.addEventListener('click', () => {
    state.repoPickerModal = null;
    render();
  });
  document.getElementById('repo-picker-backdrop')?.addEventListener('click', () => {
    state.repoPickerModal = null;
    render();
  });
  document.getElementById('repo-picker-cancel')?.addEventListener('click', () => {
    state.repoPickerModal = null;
    render();
  });

  // Tab switching
  document.querySelectorAll('.repo-picker-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = (tab as HTMLElement).dataset.pickerTab as 'browse' | 'urls' | 'create-new';
      if (state.repoPickerModal && tabName) {
        // Save textarea content before switching tabs
        const textarea = document.getElementById('repo-picker-urls-textarea') as HTMLTextAreaElement | null;
        if (textarea) { state.repoPickerModal.pastedUrls = textarea.value; }
        const createNewInput = document.getElementById('create-new-repo-url') as HTMLInputElement | null;
        if (createNewInput) { state.repoPickerModal.createNewRepoUrl = createNewInput.value; }
        state.repoPickerModal.activeTab = tabName;
        render();
      }
    });
  });

  // Search input
  const pickerSearchInput = document.getElementById('repo-picker-search-input') as HTMLInputElement | null;
  if (pickerSearchInput) {
    pickerSearchInput.addEventListener('input', () => {
      if (state.repoPickerModal) {
        state.repoPickerModal.searchQuery = pickerSearchInput.value;
        render();
        // Re-focus after render
        const newInput = document.getElementById('repo-picker-search-input') as HTMLInputElement | null;
        if (newInput) {
          newInput.focus();
          newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
        }
      }
    });
  }

  // Checkbox toggling
  document.querySelectorAll('[data-repo-checkbox]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const repoName = (cb as HTMLInputElement).dataset.repoCheckbox!;
      if (state.repoPickerModal) {
        if ((e.target as HTMLInputElement).checked) {
          state.repoPickerModal.selectedRepoNames.add(repoName);
        } else {
          state.repoPickerModal.selectedRepoNames.delete(repoName);
        }
        render();
      }
    });
  });

  // Confirm button
  document.getElementById('repo-picker-confirm')?.addEventListener('click', () => {
    const m = state.repoPickerModal;
    if (!m) { return; }

    // Save textarea content before closing
    const textarea = document.getElementById('repo-picker-urls-textarea') as HTMLTextAreaElement | null;
    if (textarea) { m.pastedUrls = textarea.value; }

    // Collect all selected repo URLs
    const selectedUrls: string[] = [];
    for (const name of m.selectedRepoNames) {
      const repo = m.repos.find(r => r.name === name);
      if (repo) { selectedUrls.push(repo.url); }
    }
    if (m.pastedUrls.trim()) {
      for (const line of m.pastedUrls.trim().split('\n')) {
        const url = line.trim();
        if (url.startsWith('http')) { selectedUrls.push(url); }
      }
    }
    if (selectedUrls.length === 0) { return; }

    if (m.mode === 'scan') {
      const repoNames = Array.from(m.selectedRepoNames);
      // Also include pasted URLs as names (extract repo name from URL)
      if (m.pastedUrls.trim()) {
        for (const line of m.pastedUrls.trim().split('\n')) {
          const url = line.trim();
          if (url.startsWith('http')) {
            const parts = url.replace(/\.git$/, '').split('/');
            const repoName = parts[parts.length - 1];
            if (repoName && !repoNames.includes(repoName)) { repoNames.push(repoName); }
          }
        }
      }
      const modelFamily = state.selectedModelFamily || undefined;
      state.repoPickerModal = null;
      state.view = 'org-scanner';
      state.orgScanRecommendation = null;
      state.orgScanProgress = 1;
      state.orgScanStep = 'Starting scan with selected repos...';
      render();
      vscode.postMessage({ type: 'scanOrgWithRepos', org: m.org, repoNames, modelFamily });
    } else if (m.mode === 'add-to-bar' && m.barPath) {
      const barPath = m.barPath;
      state.repoPickerModal = null;
      render();
      vscode.postMessage({ type: 'addReposToBar', barPath, repoUrls: selectedUrls });
    }
  });

  // "Add & Scaffold" button in Create New tab
  document.getElementById('repo-picker-add-scaffold')?.addEventListener('click', () => {
    const m = state.repoPickerModal;
    if (!m || !m.barPath) { return; }

    // Read the repo name and build the full URL from org + name
    const input = document.getElementById('create-new-repo-name') as HTMLInputElement | null;
    const repoName = (input?.value || m.createNewRepoUrl).trim();
    if (!/^[a-zA-Z0-9._-]+$/.test(repoName)) { return; }

    const repoUrl = `https://github.com/${m.org}/${repoName}`;
    const barPath = m.barPath;
    state.repoPickerModal = null;
    render();

    // Add repo URL to BAR, then trigger scaffold with BAR context
    vscode.postMessage({ type: 'addReposToBar', barPath, repoUrls: [repoUrl] });
    vscode.postMessage({ type: 'scaffoldComponent', repoUrl, barPath });
  });

  // Create New repo name input — live update state
  const createNewInput = document.getElementById('create-new-repo-name') as HTMLInputElement | null;
  if (createNewInput) {
    createNewInput.addEventListener('input', () => {
      if (state.repoPickerModal) {
        state.repoPickerModal.createNewRepoUrl = createNewInput.value;
        // Update button disabled state based on valid repo name
        const btn = document.getElementById('repo-picker-add-scaffold') as HTMLButtonElement | null;
        if (btn) {
          const val = createNewInput.value.trim();
          btn.disabled = !/^[a-zA-Z0-9._-]+$/.test(val) || val.length === 0;
        }
      }
    });
  }

  // Add repo to BAR, White Rabbit, Component picker
  // — delegated to views/barDetail.ts via attachBarDetailEvents above
}

// ============================================================================
// Helpers — getFilteredBars, getPillarByKey delegated to views/portfolio.ts
// ============================================================================

// ============================================================================
// Message Handling (from extension)
// ============================================================================

window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'portfolioData': {
      state.portfolio = message.data as PortfolioSummary;
      // Capture open workspace folder names for repo highlighting
      if (Array.isArray(message.workspaceFolders)) {
        state.openWorkspaceFolders = message.workspaceFolders as string[];
      }
      // Extract capability model if present
      if (state.portfolio?.capabilityModel) {
        state.capabilityModel = state.portfolio.capabilityModel as CapabilityModelSummary;
      }
      state.isLoading = false;
      state.errorMessage = '';
      state.initSteps = [];
      // If we were on no-mesh or init-mesh, switch to portfolio
      if (state.view === 'no-mesh' || state.view === 'init-mesh') {
        state.view = 'portfolio';
      }
      render();
      break;
    }

    case 'barDetail': {
      const isSameBar = state.currentBar?.path === (message.bar as BarSummary).path;
      state.currentBar = message.bar as BarSummary;
      state.currentDecisions = message.decisions as GovernanceDecision[];
      state.currentRepoTree = message.repoTree as string[];
      state.calmData = ((message as Record<string, unknown>).calmData as CalmDataPayload) || null;
      state.layouts = (message as Record<string, unknown>).layouts as typeof state.layouts || null;
      state.diagrams = (message as Record<string, unknown>).diagrams as typeof state.diagrams || null;
      state.adrs = ((message as Record<string, unknown>).adrs || []) as AdrRecord[];
      state.activeTab = 'context';
      // Only reset threat model if we're loading a fresh BAR (not after threat model generation)
      // When generating, barDetail arrives first (to refresh pillar scores), then threatModelGenerated follows
      if (!state.threatModelGenerating) {
        // Load saved threat model from disk if available
        const saved = (message as Record<string, unknown>).savedThreatModel as ThreatModelResult | null | undefined;
        state.threatModel = saved || null;
        state.threatModelProgress = '';
        state.threatModelProgressPct = 0;
      }
      // Don't reset threatModelGenerating here — let threatModelGenerated handle that
      // Reset active pillar when navigating to a different BAR
      if (!isSameBar) {
        state.activePillar = null;
        state.adrEditingId = null;
        state.adrForm = null;
        state.appYamlEditing = false;
        state.appYamlForm = null;
        state.activeReview = null;
        state.agentStatus = null;
        if (!state.topFindingsLoading) {
          state.topFindingsSummary = null;
        }
        // Reset Absolem
        state.absolemOpen = false;
        state.absolemMessages = [];
        state.absolemStreaming = '';
        state.absolemStatus = 'idle';
        state.absolemPatches = null;
      }
      // Populate governance score history and trends
      const barData = message.bar as BarSummary;
      state.scoreHistory = barData.scoreHistory || [];
      state.scoreTrend = barData.scoreTrend || 'new';
      state.pillarTrends = barData.pillarTrends || null;

      state.isLoading = false;
      state.errorMessage = '';
      state.view = 'bar-detail';
      render();
      break;
    }

    case 'activeReview': {
      const reviewBarPath = (message as Record<string, unknown>).barPath as string;
      const review = (message as Record<string, unknown>).review as ActiveReviewInfo | null;
      if (state.currentBar?.path === reviewBarPath) {
        state.activeReview = review;
      }
      break;
    }

    case 'agentStatusUpdate': {
      const statusBarPath = (message as Record<string, unknown>).barPath as string;
      const status = (message as Record<string, unknown>).status as AgentStatusInfo | null;
      if (state.currentBar?.path === statusBarPath) {
        state.agentStatus = status;
        // Targeted DOM update for agent status area
        const reviewArea = document.getElementById('active-review-area');
        if (reviewArea) {
          reviewArea.innerHTML = renderAgentStatus(state.agentStatus);
          attachAgentStatusListeners((msg) => vscode.postMessage(msg));
        }
      }
      break;
    }

    case 'topFindingsProgress': {
      const tfBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path === tfBarPath) {
        state.topFindingsLoading = true;
        state.topFindingsProgress = message.step as string;
        state.topFindingsProgressPct = message.progress as number;
        // Incremental DOM update for progress bar
        const progressFill = document.querySelector('.top-findings-progress-fill') as HTMLElement | null;
        const progressLabel = document.querySelector('.top-findings-progress span') as HTMLElement | null;
        if (progressFill && progressLabel) {
          progressFill.style.width = `${state.topFindingsProgressPct}%`;
          progressLabel.textContent = state.topFindingsProgress;
        } else {
          render();
        }
      }
      break;
    }

    case 'topFindingsSummary': {
      const tsBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path === tsBarPath) {
        state.topFindingsLoading = false;
        state.topFindingsSummary = (message as Record<string, unknown>).summary as typeof state.topFindingsSummary;
        state.topFindingsExpanded = true;
        render();
      }
      break;
    }

    case 'threatModelProgress': {
      const wasGenerating = state.threatModelGenerating;
      state.threatModelGenerating = true;
      state.threatModelProgress = message.step as string;
      state.threatModelProgressPct = message.progress as number;
      // Keep security pillar open during generation
      state.activePillar = 'security';

      // Incremental DOM update for progress — avoid full re-render jiggle
      const progressFill = document.querySelector('.progress-bar-fill') as HTMLElement | null;
      const progressLabel = document.querySelector('.progress-label') as HTMLElement | null;
      if (wasGenerating && progressFill && progressLabel) {
        progressFill.style.width = `${state.threatModelProgressPct}%`;
        progressLabel.textContent = state.threatModelProgress;
      } else {
        // First tick or not yet rendered — need full render to show progress UI
        render();
      }
      break;
    }

    case 'threatModelGenerated': {
      state.threatModel = message.result as ThreatModelResult;
      state.threatModelGenerating = false;
      state.threatModelProgress = '';
      state.threatModelProgressPct = 0;
      // Keep security pillar open to show results
      state.activePillar = 'security';
      render();
      break;
    }

    case 'threatModelFailed': {
      state.threatModelGenerating = false;
      state.threatModelProgress = '';
      state.threatModelProgressPct = 0;
      state.activePillar = 'security';
      render();
      break;
    }

    case 'threatModelExported': {
      // File saved — no special UI update needed
      break;
    }

    case 'adrList': {
      state.adrs = (message.adrs || []) as AdrRecord[];
      state.adrEditingId = null;
      state.adrForm = null;
      render();
      break;
    }

    case 'adrSaved': {
      // After save, refresh the ADR list — the extension sends a follow-up adrList
      state.adrEditingId = null;
      state.adrForm = null;
      // adrList message will follow from the extension
      break;
    }

    case 'adrDeleted': {
      state.adrs = state.adrs.filter(a => a.id !== (message.adrId as string));
      render();
      break;
    }

    case 'appYamlUpdated': {
      state.appYamlEditing = false;
      state.appYamlForm = null;
      // barDetail reload will follow from the extension
      break;
    }

    case 'gitStatusUpdated': {
      state.gitStatus = message.status as GitSyncStatus;
      render();
      break;
    }

    case 'syncProgress': {
      state.syncing = true;
      state.syncProgress = message.step as string;
      // Incremental DOM update — avoid full re-render
      const syncLabel = document.querySelector('.sync-progress-label') as HTMLElement | null;
      if (syncLabel) {
        syncLabel.textContent = state.syncProgress;
      } else {
        render();
      }
      break;
    }

    case 'syncComplete': {
      state.syncing = false;
      state.syncProgress = '';
      // gitStatusUpdated will follow to clear badges
      render();
      break;
    }

    case 'syncError': {
      state.syncing = false;
      state.syncProgress = '';
      state.errorMessage = message.message as string;
      render();
      break;
    }

    case 'pushComplete': {
      state.syncing = false;
      state.syncProgress = '';
      // gitStatusUpdated will follow to refresh banner
      render();
      break;
    }

    case 'pushError': {
      state.syncing = false;
      state.syncProgress = '';
      state.errorMessage = message.message as string;
      render();
      break;
    }

    case 'pullComplete': {
      state.syncing = false;
      state.syncProgress = '';
      // portfolioData + barDetail + gitStatusUpdated will follow to refresh everything
      render();
      break;
    }

    case 'pullError': {
      state.syncing = false;
      state.syncProgress = '';
      state.errorMessage = message.message as string;
      render();
      break;
    }

    case 'policiesLoaded': {
      state.policies = (message.policies || []) as PolicyFile[];
      state.nistControls = (message.nistControls || []) as NistControl[];
      render();
      break;
    }

    case 'policySaved': {
      // Policies will be reloaded via policiesLoaded message
      break;
    }

    case 'policyBaselineProgress': {
      const pFilename = message.filename as string;
      if (state.policyGenerating === pFilename) {
        state.policyGenerateStep = message.step as string;
        state.policyGenerateProgress = message.progress as number;
        render();
      }
      break;
    }

    case 'policyBaselineGenerated': {
      state.policyGenerating = null;
      state.policyGenerateStep = '';
      state.policyGenerateProgress = 0;
      render();
      break;
    }

    case 'nistControlDetail': {
      const control = message.control as NistControl | null;
      if (control) {
        state.nistControlPopup = control;
        render();
      }
      break;
    }

    case 'meshInitialized': {
      state.pickedFolderPath = '';
      state.isLoading = false;
      state.errorMessage = '';
      // Portfolio data will follow from loadPortfolio()
      break;
    }

    case 'initProgress': {
      const steps = (message.steps as { label: string; status: 'pending' | 'active' | 'done' | 'error' }[]) || [];
      state.initSteps = steps;
      const listEl = document.getElementById('init-step-list');
      if (listEl) {
        listEl.style.display = steps.length > 0 ? 'block' : 'none';
        // Disable form while running
        const submitBtn = document.getElementById('btn-submit-mesh') as HTMLButtonElement | null;
        if (submitBtn) { submitBtn.disabled = steps.length > 0; }

        // Build or update step items via DOM (no full re-render)
        if (listEl.children.length !== steps.length) {
          // First time — build the step list
          listEl.innerHTML = steps.map((s, i) => {
            const icon = s.status === 'done' ? '&#10003;' : s.status === 'error' ? '&#10007;' : '&#9679;';
            return `<div id="init-step-${i}" class="init-step-item ${s.status}">
              <div class="init-step-icon">${icon}</div>
              <span class="init-step-label">(${i + 1}) ${escapeHtml(s.label)}</span>
              <span class="init-step-message"></span>
            </div>`;
          }).join('');
        } else {
          // Update existing step items in place
          steps.forEach((s, i) => {
            const stepEl = document.getElementById(`init-step-${i}`);
            if (!stepEl) { return; }
            stepEl.className = `init-step-item ${s.status}`;
            const iconEl = stepEl.querySelector('.init-step-icon');
            if (iconEl) {
              if (s.status === 'done') { iconEl.innerHTML = '&#10003;'; }
              else if (s.status === 'error') { iconEl.innerHTML = '&#10007;'; }
              else { iconEl.innerHTML = '&#9679;'; }
            }
            const labelEl = stepEl.querySelector('.init-step-label');
            if (labelEl) { labelEl.textContent = `(${i + 1}) ${s.label}`; }
          });
        }
      }
      break;
    }

    case 'platformAdded': {
      state.isLoading = false;
      state.errorMessage = '';
      state.view = 'portfolio';
      // Portfolio data will be refreshed by the extension
      break;
    }

    case 'barScaffolded': {
      state.isLoading = false;
      state.errorMessage = '';
      state.view = 'portfolio';
      // Portfolio data will be refreshed by the extension
      break;
    }

    case 'folderPicked': {
      state.pickedFolderPath = message.path as string;
      const pickedPathEl = document.getElementById('picked-path');
      if (pickedPathEl) {
        pickedPathEl.textContent = state.pickedFolderPath;
      }
      break;
    }

    case 'loading': {
      state.isLoading = message.active as boolean;
      if (message.message) {
        state.loadingMessage = message.message as string;
      }
      // If we already have portfolio data, just toggle the refresh button
      if (state.portfolio && state.view === 'portfolio') {
        const btn = document.getElementById('btn-refresh') as HTMLButtonElement | null;
        if (btn) { btn.disabled = message.active; }
      } else if (!state.portfolio && state.view !== 'init-mesh' && state.view !== 'no-mesh') {
        render();
      }
      break;
    }

    case 'capabilityModelSwitched': {
      // Model was switched — portfolio data refresh will follow
      state.capabilityDrillPath = [];
      break;
    }

    case 'error': {
      state.errorMessage = message.message as string;
      state.isLoading = false;
      // If repo picker modal is open and loading, show error there
      if (state.repoPickerModal && state.repoPickerModal.loading) {
        state.repoPickerModal.loading = false;
        state.repoPickerModal.error = message.message as string;
      }
      render();
      break;
    }

    case 'orgScanProgress': {
      state.orgScanProgress = message.progress as number;
      state.orgScanStep = message.step as string;
      if (state.view === 'org-scanner') {
        render();
      }
      break;
    }

    case 'orgScanResults': {
      state.orgScanRecommendation = message.recommendation as OrgScanRecommendation;
      state.orgScanProgress = 0;
      state.orgScanStep = '';
      state.errorMessage = '';
      render();
      break;
    }

    case 'orgScanApplied': {
      state.orgScanRecommendation = null;
      state.orgScanProgress = 0;
      state.view = 'portfolio';
      state.errorMessage = '';
      // Portfolio data will be refreshed by the extension
      break;
    }

    case 'orgReposLoaded': {
      if (state.repoPickerModal) {
        state.repoPickerModal.repos = message.repos as OrgRepo[];
        state.repoPickerModal.loading = false;
        state.repoPickerModal.error = '';
        render();
      }
      break;
    }

    case 'reposAddedToBar': {
      // BAR detail refresh follows from onDrillIntoBar
      break;
    }

    case 'samplePlatformCreated': {
      // Portfolio data will be refreshed by the extension's loadPortfolio()
      break;
    }

    case 'githubDefaults': {
      const login = message.login as string;
      const orgs = message.orgs as string[];
      const defaultPath = message.defaultPath as string;

      state.githubDefaultsLoading = false;

      // Build org dropdown options: personal login + all orgs
      const allOrgs: string[] = [];
      if (login) { allOrgs.push(login); }
      for (const o of orgs) {
        if (o !== login) { allOrgs.push(o); }
      }
      state.detectedOrgs = allOrgs;

      // Store detected values to pre-fill after re-render
      state.detectedOrg = orgs.length > 0 ? orgs[0] : login;
      state.detectedOwner = login;
      state.detectedRepoName = `${(orgs.length > 0 ? orgs[0] : login).toLowerCase()}-governance-mesh`;

      // Set default folder path
      if (!state.pickedFolderPath && defaultPath) {
        state.pickedFolderPath = defaultPath;
      }

      // Re-render to show pre-filled values
      if (state.view === 'init-mesh') {
        render();
      }
      break;
    }

    case 'noMeshConfigured': {
      state.view = 'no-mesh';
      state.portfolio = null;
      state.isLoading = false;
      render();
      break;
    }

    case 'availableModels': {
      state.availableModels = (message.models as { id: string; family: string; name: string; vendor: string }[]) || [];
      state.selectedModelFamily = (message.defaultFamily as string) || '';
      if (!state.settingsPreferredModel) {
        state.settingsPreferredModel = (message.defaultFamily as string) || 'gpt-4o';
      }
      // Update the model dropdown in-place if it exists
      const modelSelect = document.getElementById('scan-model-select') as HTMLSelectElement | null;
      if (modelSelect) {
        const currentVal = modelSelect.value;
        modelSelect.innerHTML = '<option value="">Auto-detect model</option>' +
          state.availableModels.map(m =>
            `<option value="${escapeAttr(m.family)}">${escapeHtml(m.name)}</option>`
          ).join('');
        // Restore selection or apply default
        if (currentVal && Array.from(modelSelect.options).some(o => o.value === currentVal)) {
          modelSelect.value = currentVal;
        } else if (state.selectedModelFamily) {
          modelSelect.value = state.selectedModelFamily;
        }
      }
      if (state.view === 'settings') { render(); }
      break;
    }
    case 'calmComponents': {
      const components = (message as Record<string, unknown>).components as { id: string; name: string; type: string; description: string; suggestedRepo: string }[];
      state.componentPicker = {
        barPath: state.currentBar?.path || '',
        components: components || [],
        selectedId: components?.[0]?.id || '',
        repoName: components?.[0]?.suggestedRepo || '',
      };
      render();
      break;
    }
    case 'calmDataUpdated': {
      // External file change — replace in-memory CALM data and update the diagram
      const updatedCalm = (message as Record<string, unknown>).calmData;
      if (updatedCalm) {
        state.calmData = updatedCalm;
        // If a React canvas is already mounted, update its props without destroying the root
        if ((state.activeTab === 'context' || state.activeTab === 'logical') && isDiagramCanvasMounted()) {
          const diagramType = state.activeTab as 'context' | 'logical';
          const layout = diagramType === 'context'
            ? (state.layouts?.context || null)
            : (state.layouts?.logical || null);
          updateDiagramCanvasProps({
            calmData: updatedCalm as CalmArchitecture,
            diagramType,
            savedLayout: layout,
            onLayoutChange: (updatedLayout: DiagramLayout) => {
              if (state.activeTab === 'context') {
                state.layouts = { context: updatedLayout, logical: state.layouts?.logical || null };
              } else {
                state.layouts = { context: state.layouts?.context || null, logical: updatedLayout };
              }
              vscode.postMessage({
                type: 'saveLayout',
                barPath: state.currentBar!.path,
                diagramType: state.activeTab,
                layout: updatedLayout,
              });
            },
            onExportPng: (dataUrl: string) => {
              vscode.postMessage({
                type: 'exportPng',
                barPath: state.currentBar!.path,
                diagramType: state.activeTab,
                pngDataUrl: dataUrl,
              });
            },
            onCalmMutation: (patch: CalmPatch[], updatedCalmFromCanvas: CalmArchitecture) => {
              state.calmData = updatedCalmFromCanvas;
              vscode.postMessage({
                type: 'calmMutation',
                barPath: state.currentBar!.path,
                patch,
              });
            },
            capabilityModel: state.capabilityModel,
          });
        } else if (state.activeTab === 'context' || state.activeTab === 'logical') {
          mountReactDiagramIfNeeded();
        }
      }
      break;
    }

    case 'calmValidationErrors': {
      // Validation errors from the extension host — log for now
      const errors = (message as Record<string, unknown>).errors;
      if (Array.isArray(errors) && errors.length > 0) {
        console.warn('CALM validation:', errors);
      }
      break;
    }

    // Absolem — multi-turn CALM refinement agent
    case 'absolemChunk': {
      const acBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path !== acBarPath) { break; }

      const chunk = (message as Record<string, unknown>).chunk as string;
      const done = (message as Record<string, unknown>).done as boolean;

      if (done) {
        if (state.absolemStreaming) {
          state.absolemMessages.push({ role: 'assistant', content: state.absolemStreaming });
          state.absolemStreaming = '';
        }
        state.absolemStatus = 'idle';
        render();
      } else {
        state.absolemStatus = 'thinking';
        state.absolemStreaming += chunk;

        // Incremental DOM update for streaming text — hide calm-patches fence from display
        const streamEl = document.getElementById('absolem-streaming-text');
        if (streamEl) {
          // Check if we're inside a calm-patches fence (still streaming JSON)
          const insideFence = /```calm-patches\s*\n/.test(state.absolemStreaming) && !/```calm-patches\s*\n[\s\S]*?```/.test(state.absolemStreaming);
          // Strip completed fences, in-progress fences, and orphaned headings before them
          const streamDisplay = state.absolemStreaming
            .replace(/\n*(?:#{1,4}\s+[^\n]+\n+)?```calm-patches\s*\n[\s\S]*?```/g, '')
            .replace(/\n*(?:#{1,4}\s+[^\n]+\n+)?```calm-patches\s*\n[\s\S]*$/g, '')
            .replace(/\n*(?:#{1,4}\s+[^\n]+)?\s*$/, '')
            .trim();
          if (insideFence) {
            // While JSON is streaming in, show a progress indicator instead of raw JSON
            streamEl.innerHTML = renderMarkdown(streamDisplay) + '<div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">Generating CALM architecture...</div>';
          } else {
            streamEl.innerHTML = renderMarkdown(streamDisplay) + '<span class="absolem-cursor">|</span>';
          }
          // Only auto-scroll if we're not inside the fence (don't fight user scrolling during JSON generation)
          if (!insideFence) {
            const messagesEl = document.getElementById('absolem-messages');
            if (messagesEl) { messagesEl.scrollTop = messagesEl.scrollHeight; }
          }
        } else {
          render();
        }
      }
      break;
    }

    case 'absolemPatches': {
      const apBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path !== apBarPath) { break; }

      state.absolemPatches = {
        patches: (message as Record<string, unknown>).patches as { op: string; target: string; field?: string; value?: unknown }[],
        description: (message as Record<string, unknown>).description as string,
      };
      state.absolemStatus = 'reviewing-patches';
      render();
      // Auto-scroll to the patches card so the user sees the action buttons
      requestAnimationFrame(() => {
        const patchesCard = document.getElementById('absolem-patches-card');
        if (patchesCard) { patchesCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      });
      break;
    }

    case 'absolemPatchesApplied': {
      const ppBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path !== ppBarPath) { break; }

      state.absolemPatches = null;
      state.absolemStatus = 'idle';
      const valErrors = (message as Record<string, unknown>).validationErrors as { severity: string; message: string }[];
      const errorCount = valErrors.filter(e => e.severity === 'error').length;
      const warnCount = valErrors.filter(e => e.severity === 'warning').length;
      const resultMsg = errorCount > 0
        ? `Patches applied. Validation found ${errorCount} error(s) and ${warnCount} warning(s). Would you like me to help fix them?`
        : `Patches applied successfully.${warnCount > 0 ? ` ${warnCount} warning(s) to review.` : ' No validation issues.'} Would you like to continue refining?`;
      state.absolemMessages.push({ role: 'assistant', content: resultMsg });
      render();
      break;
    }

    case 'absolemError': {
      const aeBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path !== aeBarPath) { break; }

      state.absolemStatus = 'idle';
      state.absolemStreaming = '';
      state.absolemMessages.push({
        role: 'assistant',
        content: `Error: ${(message as Record<string, unknown>).message as string}`,
      });
      render();
      break;
    }

    case 'meshRepoDetected':
      state.meshOwner = message.owner as string;
      state.meshRepo = message.repo as string;
      if (state.view === 'portfolio' || state.view === 'settings') { render(); }
      break;

    // Settings messages
    case 'workflowStatus':
      state.settingsWorkflowExists = message.exists as boolean;
      if (state.view === 'settings') { render(); }
      break;

    case 'workflowProvisioned':
      state.settingsWorkflowExists = true;
      if (state.view === 'settings') { render(); }
      break;

    case 'preferredModelSaved':
      state.settingsPreferredModel = message.family as string;
      if (state.view === 'settings') { render(); }
      break;

    case 'driftWeightsLoaded':
      state.settingsDriftWeights = message.weights as typeof state.settingsDriftWeights;
      if (state.view === 'settings') { render(); }
      break;

    case 'driftWeightsSaved':
      if (state.view === 'settings') { render(); }
      break;

    case 'meshReinitialized':
      state.view = 'portfolio';
      render();
      break;
  }
});

// ============================================================================
// Initialize
// ============================================================================

vscode.postMessage({ type: 'ready' });
render();
