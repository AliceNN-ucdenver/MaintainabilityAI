// Looking Glass webview frontend — renders Governance Mesh dashboard
// Vanilla TypeScript, IIFE pattern for browser context inside VS Code

import mermaid from 'mermaid';
import { renderAgentStatus, attachAgentStatusListeners } from './agentStatus';
import type { AgentStatusInfo } from './agentStatus';
import type { AdrRecord, CalmDataPayload } from './pillars/architecturePillar';
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
import {
  renderOkrListView, getOkrListStyles, attachOkrListEvents,
} from './views/okrList';
import {
  renderOkrDetailView, getOkrDetailStyles, attachOkrDetailEvents,
} from './views/okrDetail';
import type { FanOutPreflightReportUi, FanOutPreflightUiState, OkrPhaseSignals } from './views/okrDetail';
import type {
  OkrListItem, OkrAffectedBar, OkrCard,
  OkrAvailableBar, OkrAvailablePlatform, OkrDetailMode,
} from '../../types';
import type {
  VsCodeApi, Criticality, GovernanceScoreSnapshot, GovernanceTrend,
  GovernanceDecision,
  ActiveReviewInfo, BarSummary, PortfolioSummary,
  ThreatModelResult, CapabilityModelType, EaLens,
  CapabilityModelSummary, PolicyFile, NistControl,
  GitSyncStatus, OrgRepo,
  OrgScanRecommendation,
  ResearchSecretId,
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

type ViewName = 'no-mesh' | 'portfolio' | 'bar-detail' | 'init-mesh' | 'add-platform' | 'create-bar' | 'org-scanner' | 'settings' | 'okr-list' | 'okr-detail';

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
  // OKR state (Phase A)
  okrs: [] as OkrListItem[],
  okrsLoading: false,
  currentOkr: null as OkrCard | null,
  currentOkrAffectedBars: [] as OkrAffectedBar[],
  currentOkrMode: 'view' as OkrDetailMode,
  currentOkrAvailablePlatforms: [] as OkrAvailablePlatform[],
  currentOkrAvailableBars: [] as OkrAvailableBar[],
  // Per-phase signal data fetched live from GitHub API on OKR detail mount.
  // Populates the rich Why/How/What cards (audit skill_call counts, FR/SR
  // citation coverage, PR state, chain root). Undefined while loading.
  okrPhaseSignals: undefined as OkrPhaseSignals | undefined,
  // D-PR4 sub-PR 4 — fan-out pre-flight pane state. Populated when the
  // OKR detail mounts AND the WHAT phase has at least one completed
  // action; cleared on view-change. The pane itself only renders in
  // view mode (renderFanOutPreflightPane guards on the same WHAT-complete
  // check before showing anything).
  fanOutPreflight: undefined as FanOutPreflightUiState | undefined,
  // Phase B-PR4 — Hatter Tag slide-out sheet
  hatterTagSheetOpen: false,
  hatterTagSheetData: null as { okrId: string; actionId: string; tag: Record<string, unknown> | null; reason?: string } | null,
  // Phase E E1 — Verify Chain slide-out sheet
  chainVerifySheetOpen: false,
  chainVerifySheetData: null as {
    okrId: string;
    actionId: string;
    runId: string;
    verdict: {
      seal: { sealed?: boolean; sealTampered?: boolean };
      totalEvents: number;
      malformedLines: number;
      byKind: Record<string, { signed: number; unsigned: number }>;
      unsignedAgentEvents: number;
      signedWorkflowEvents: number;
      originKindMismatches: number;
      firstFailure: { line: number; kind: string; reason: string } | null;
      shapeOk: boolean;
    } | null;
    reason?: string;
  } | null,
  // Phase B-PR3+ Start-phase preview modal — formatted body preview + multi-line additional context.
  startPhaseModalOpen: false,
  startPhaseModalData: null as { okrId: string; phase: 'why' | 'how' | 'what'; agent: string; issueLabel: string; body: string } | null,
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
  // Phase B Mesh Provisioning — skill + agent deployment status
  settingsAgenticSkills: null as { name: string; family: string; deployed: boolean }[] | null,
  settingsAgenticAgents: null as { name: string; deployed: boolean }[] | null,
  // Phase B-PR1e Coding Agent Environment — `copilot` env secrets + firewall checklist
  settingsCopilotEnv: null as {
    environmentExists: boolean;
    reachable: boolean;
    secrets: { name: string; purpose: string; usedBy: string[]; required: boolean; signupUrl: string; present: boolean }[];
    hosts: { host: string; url: string; usedBy: string[]; purpose: string }[];
    repoSlug: string;
  } | null,
  settingsCopilotEnvError: null as string | null,
  settingsPreferredModel: '',
  settingsDriftWeights: { critical: 15, high: 5, medium: 2, low: 1 } as { critical: number; high: number; medium: number; low: number },
  settingsReinitConfirmStep: 0,  // 0=default, 1=warning shown
  // Orchestration policy editor (mesh-level)
  orchPolicy: null as { autoMinScore: number; supMinScore: number; securityThreshold: number; archThreshold: number; escScoreDrop: number; escConsecutive: number; escTarget: string } | null,
  // Agent framework for governance review workflows
  agentType: 'claude' as 'claude' | 'copilot' | 'both',
  // Research Settings (Tavily + Anthropic/OpenAI/USPTO/GOVERNANCE_MESH_TOKEN + non-secret prefs)
  researchSettings: null as {
    secrets: {
      id: ResearchSecretId;
      label: string;
      envName: string;
      description?: string;
      hasVsCodeValue: boolean;
      hasGitHubSecret: boolean | null;
      scope: 'mesh' | 'mesh+code';
    }[];
    prefs: {
      llmProvider: 'github-models' | 'anthropic' | 'openai';
      guardrails: 'strict' | 'default' | 'lenient';
      grounding: 'strict' | 'default' | 'lenient';
      groundingThreshold: number;
      maxIterations: number;
      costCapTokens: number;
    };
    meshRepo: { owner: string; repo: string } | null;
  } | null,
  /** Per-secret transient action status: shows the result of the last Test/Push for ~5s. */
  researchSecretStatus: {} as Record<string, { kind: 'success' | 'error' | 'busy'; message: string }>,
  // Platform governance editor
  platGovEditing: null as string | null,  // platformId being edited
  platGov: null as { minimumScores: Record<string, number>; minTier: string; enforcementMode: string } | null,
  // Cross-BAR governance context (Phase 6)
  barLinkedBars: [] as { barName: string; barPath: string; relationship: string; compositeScore: number; tier: string }[],
  barSiblingBars: [] as { name: string; id: string; path: string; compositeScore: number; tier: string }[],
  barPlatformOverrides: [] as string[],
  // Phase 7 — Score decay info
  decayInfo: null as { rawComposite: number; decayedComposite: number; decayFactor: number; daysSinceAssessment: number; inGraceWindow: boolean } | null,
  // Absolem — multi-turn CALM refinement agent
  absolemOpen: false,
  absolemMessages: [] as { role: 'user' | 'assistant'; content: string }[],
  absolemStreaming: '',
  absolemStatus: 'idle' as 'idle' | 'thinking' | 'reviewing-patches',
  absolemPatches: null as { patches: { op: string; target: string; field?: string; value?: unknown }[]; description: string } | null,
  // Platform architecture (cross-BAR diagram)
  platformCalmData: null as CalmDataPayload,
  showPlatformArch: false,
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
      .settings-subsection-heading {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin: 16px 0 6px;
        padding-top: 12px;
        border-top: 1px dashed var(--border-light, rgba(148, 163, 184, 0.2));
        color: var(--vscode-descriptionForeground, #94a3b8);
      }
      .settings-subsection-heading:first-of-type {
        border-top: 0;
        padding-top: 0;
        margin-top: 4px;
      }
      .settings-subsection-list {
        margin: 4px 0 8px 24px;
        padding: 0;
        list-style: disc;
        font-size: 12px;
      }
      .settings-subsection-note {
        font-size: 11px;
        opacity: 0.85;
        margin: 4px 0 8px;
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

      /* Research Settings — per-secret rows + status pills */
      .settings-pill {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10.5px;
        font-weight: 500;
        line-height: 1.4;
        margin-right: 6px;
        border: 1px solid transparent;
      }
      .settings-pill-success {
        background: rgba(34, 197, 94, 0.12);
        color: #4ade80;
        border-color: rgba(34, 197, 94, 0.35);
      }
      .settings-pill-warn {
        background: rgba(234, 179, 8, 0.10);
        color: #facc15;
        border-color: rgba(234, 179, 8, 0.30);
      }
      .settings-pill-error {
        background: rgba(239, 68, 68, 0.10);
        color: #f87171;
        border-color: rgba(239, 68, 68, 0.30);
      }
      .settings-pill-muted {
        background: var(--surface-raised);
        color: var(--text-muted);
        border-color: var(--border);
      }
      .settings-research-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 8px;
        margin-bottom: 16px;
      }
      .settings-research-secret {
        padding: 12px;
        background: var(--surface-raised);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-sm);
      }
      .settings-research-secret-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .settings-research-secret-name {
        font-weight: 600;
        font-size: 13px;
      }
      .settings-research-secret-env {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .settings-research-secret-status {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .settings-research-secret-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .settings-research-secret-actions button[disabled] {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .settings-research-prefs-heading {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-top: 16px;
        margin-bottom: 4px;
      }

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

      ${getOkrListStyles()}

      ${getOkrDetailStyles()}

      /* ---- Repo Picker Modal ---- */
      .repo-picker-backdrop {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        z-index: 150; background: rgba(0,0,0,0.5);
      }
      .modal-overlay {
        position: fixed; z-index: 190; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center;
      }
      .modal-box {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 20px 24px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5); max-height: 80vh; overflow-y: auto;
      }
      .modal-header {
        display: flex; align-items: center; justify-content: space-between;
      }
      .modal-header h3 { font-size: 14px; font-weight: 600; color: var(--text); margin: 0; }
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

// OKR detail auto-poll — re-fetches phase signals every 60s while the
// user is sitting on an OKR detail view. Cleared when the view changes.
// User feedback: "had to manually refresh the OKR screen to get it to
// show Mark PR ready" — periodic poll catches PR draft → ready and
// audit verdict label changes without requiring a manual click.
let okrDetailPollHandle: ReturnType<typeof setInterval> | null = null;
function syncOkrDetailPoll(): void {
  const onDetail = state.view === 'okr-detail' && state.currentOkr;
  if (onDetail && !okrDetailPollHandle) {
    okrDetailPollHandle = setInterval(() => {
      const okrId = state.currentOkr?.meta.id;
      if (okrId) {
        vscode.postMessage({ type: 'loadOkrPhaseSignals', okrId });
      }
    }, 60_000);
  } else if (!onDetail && okrDetailPollHandle) {
    clearInterval(okrDetailPollHandle);
    okrDetailPollHandle = null;
  }
}

function render() {
  // Unmount React before innerHTML replacement (destroys DOM)
  unmountDiagramCanvas();
  rootEl.innerHTML = getStyles() + renderView() + renderNistPopup(state.nistControlPopup) + renderRepoPickerModal();
  attachEventHandlers();
  syncOkrDetailPoll();
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
  // Platform architecture diagram (cross-BAR view)
  if (state.view === 'portfolio' && state.showPlatformArch && state.platformCalmData && state.currentPlatformId) {
    mountDiagramCanvas('reactflow-platform-mount', {
      calmData: state.platformCalmData as CalmArchitecture,
      diagramType: 'platform' as 'context' | 'logical' | 'platform',
      savedLayout: null,
      onLayoutChange: () => { /* platform layout persistence not yet implemented */ },
      onExportPng: () => { /* platform export not yet implemented */ },
      onCalmMutation: (patch: CalmPatch[], updatedCalm: CalmArchitecture) => {
        state.platformCalmData = updatedCalm;
        vscode.postMessage({
          type: 'platformCalmMutation',
          platformId: state.currentPlatformId!,
          patch,
        });
      },
    });
    return;
  }

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

  let content = '';
  switch (state.view) {
    case 'no-mesh': content = renderNoMesh(); break;
    case 'portfolio': content = renderPortfolio(); break;
    case 'bar-detail': content = renderBarDetail(state); break;
    case 'init-mesh': content = renderInitMeshForm(); break;
    case 'add-platform': content = renderAddPlatformForm(); break;
    case 'create-bar': content = renderCreateBarForm(); break;
    case 'org-scanner': content = renderOrgScanner(); break;
    case 'settings': content = renderSettings(); break;
    case 'okr-list':
      // D-PR1.v1.5 — render the error banner inline at the top of the
      // OKR list view, matching the pattern every other view (portfolio,
      // bar-detail, settings, etc.) uses. Without this, panel-side
      // errorMessage state on the OKR list went unsurfaced and looked
      // like the page just wasn't responding.
      content = (state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : '')
        + renderOkrListView({ okrs: state.okrs, isLoading: state.okrsLoading });
      break;
    case 'okr-detail':
      // Same error banner pattern as okr-list above. The OKR detail page
      // was the only top-level view that swallowed panel-side errors;
      // user surfaced this in the v1.5 code review.
      content = (state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : '')
        + renderOkrDetailView({
          okr: state.currentOkr,
          affectedBars: state.currentOkrAffectedBars,
          mode: state.currentOkrMode,
          availablePlatforms: state.currentOkrAvailablePlatforms,
          availableBars: state.currentOkrAvailableBars,
          gitStatus: state.gitStatus,
          phaseSignals: state.okrPhaseSignals,
          fanOutPreflight: state.fanOutPreflight,
        })
        + (state.hatterTagSheetOpen ? renderHatterTagSheet() : '')
        + (state.chainVerifySheetOpen ? renderChainVerifySheet() : '')
        + (state.startPhaseModalOpen ? renderStartPhaseModal() : '');
      break;
    default: content = renderNoMesh(); break;
  }
  // Overlay: platform governance editor modal
  if (state.platGovEditing) {
    content += renderPlatformGovernanceEditor();
  }
  return content;
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
      : state.activeLens === 'okrs'
      ? renderOkrListView({ okrs: state.okrs, isLoading: state.okrsLoading })
      : renderApplicationLensContent(p, state.currentPlatformId, state.barFilter, state.searchQuery, state.gitStatus, needsPush(state.gitStatus), renderScoreRing, state.showPlatformArch)}
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

// ============================================================================
// Platform Governance Editor (modal overlay)
// ============================================================================

function renderPlatformGovernanceEditor(): string {
  const g = state.platGov;
  const platformId = state.platGovEditing;
  const platform = state.portfolio?.platforms.find(p => p.id === platformId);
  const platformName = platform?.name || platformId || '';

  if (!g) {
    return `
      <div class="modal-overlay" id="plat-gov-overlay">
        <div class="modal-box" style="max-width: 420px;">
          <div class="modal-header">
            <h3>Platform Governance: ${escapeHtml(platformName)}</h3>
            <button class="btn-ghost" id="plat-gov-close">&times;</button>
          </div>
          <p class="text-muted">Loading governance policy...</p>
        </div>
      </div>`;
  }

  return `
    <div class="modal-overlay" id="plat-gov-overlay">
      <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
          <h3>Platform Governance: ${escapeHtml(platformName)}</h3>
          <button class="btn-ghost" id="plat-gov-close">&times;</button>
        </div>
        <div style="margin-top: 12px;">
          <div style="font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 8px;">Minimum Pillar Scores</div>
          <div class="settings-row">
            <div class="settings-label">Architecture</div>
            <input type="number" id="plat-gov-arch" class="settings-number" value="${g.minimumScores.architecture ?? ''}" min="0" max="100" placeholder="—" />
          </div>
          <div class="settings-row">
            <div class="settings-label">Security</div>
            <input type="number" id="plat-gov-sec" class="settings-number" value="${g.minimumScores.security ?? ''}" min="0" max="100" placeholder="—" />
          </div>
          <div class="settings-row">
            <div class="settings-label">Operations</div>
            <input type="number" id="plat-gov-ops" class="settings-number" value="${g.minimumScores.operations ?? ''}" min="0" max="100" placeholder="—" />
          </div>

          <div style="font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-top: 16px; margin-bottom: 8px;">Orchestration Overrides</div>
          <div class="settings-row">
            <div class="settings-label">Min Tier</div>
            <select id="plat-gov-min-tier" class="settings-select">
              <option value=""${!g.minTier ? ' selected' : ''}>— (no override)</option>
              <option value="autonomous"${g.minTier === 'autonomous' ? ' selected' : ''}>autonomous</option>
              <option value="supervised"${g.minTier === 'supervised' ? ' selected' : ''}>supervised</option>
              <option value="restricted"${g.minTier === 'restricted' ? ' selected' : ''}>restricted</option>
            </select>
          </div>
          <div class="settings-row">
            <div class="settings-label">Enforcement Mode</div>
            <select id="plat-gov-enforcement" class="settings-select">
              <option value="advisory"${g.enforcementMode === 'advisory' ? ' selected' : ''}>advisory</option>
              <option value="strict"${g.enforcementMode === 'strict' ? ' selected' : ''}>strict</option>
            </select>
          </div>

          <div class="settings-row" style="justify-content: flex-end; margin-top: 16px; gap: 8px;">
            <button class="btn-secondary" id="plat-gov-reset">Reset to Defaults</button>
            <button class="btn-secondary" id="plat-gov-cancel">Cancel</button>
            <button class="btn-primary" id="plat-gov-save">Save</button>
          </div>
        </div>
      </div>
    </div>`;
}

// renderPortfolioHeader — delegated to views/portfolio.ts

// ============================================================================
// View: Settings
// ============================================================================

function renderStartPhaseModal(): string {
  const d = state.startPhaseModalData;
  if (!d) { return ''; }
  const phaseLabel = d.phase.toUpperCase();
  const phaseTitle = d.phase === 'why' ? 'Why · Market Research' : d.phase === 'how' ? 'How · PRD' : 'What · Code Design';
  return `
    <div class="start-phase-overlay" data-action="close-start-phase-overlay">
      <div class="start-phase-sheet" role="dialog" aria-modal="true" aria-label="Start ${escapeHtml(phaseLabel)} for ${escapeHtml(d.okrId)}">
        <div class="start-phase-header">
          <div>
            <h3>Start ${escapeHtml(phaseLabel)} — ${escapeHtml(phaseTitle)}</h3>
            <p class="start-phase-meta">OKR <code>${escapeHtml(d.okrId)}</code> · Agent <code>${escapeHtml(d.agent)}</code> · Labels <code>okr-anchor</code>, <code>${escapeHtml(d.issueLabel)}</code></p>
          </div>
          <button class="btn-ghost" data-action="close-start-phase">✕ Cancel</button>
        </div>
        <div class="start-phase-section">
          <label class="start-phase-section-label">Issue body the agent will see (preview)</label>
          <pre class="start-phase-body">${escapeHtml(d.body)}</pre>
        </div>
        <div class="start-phase-section">
          <label class="start-phase-section-label" for="start-phase-extra">Additional context (optional, appended to the body)</label>
          <textarea id="start-phase-extra" class="start-phase-textarea" placeholder="One-liner or multi-paragraph guidance for this run. Examples:&#10;  • focus on EU GDPR compliance for the licensing section&#10;  • prefer arXiv sources over Hacker News&#10;  • skip the patent search this run; we already have prior-art" rows="6"></textarea>
        </div>
        <div class="start-phase-actions">
          <button class="btn-primary" data-action="confirm-start-phase">Create issue</button>
          <button class="btn-secondary" data-action="close-start-phase">Cancel</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * E2 (2026-05-25) — renderHatterTagField + helpers. Replaces the
 * earlier raw-JSON dump with a structured panel grouped by concern
 * (identity, threading, authorship, chain). Reviewers reading the
 * tag get semantic structure + cross-links to Verify Chain instead
 * of having to parse YAML by eye.
 */
function htField(label: string, value: string | number | undefined | null, opts: { mono?: boolean; full?: string } = {}): string {
  if (value === undefined || value === null || value === '') { return ''; }
  const displayed = opts.mono ? `<code>${escapeHtml(String(value))}</code>` : escapeHtml(String(value));
  const copyBtn = opts.full
    ? `<button class="btn-ghost" data-action="copy-text" data-copy="${escapeAttr(opts.full)}" title="Copy full value" style="font-size: 0.7em; padding: 0 4px;">📋</button>`
    : '';
  return `<div class="ht-row"><span class="ht-label">${escapeHtml(label)}</span><span class="ht-value">${displayed} ${copyBtn}</span></div>`;
}

function htSection(title: string, rows: string): string {
  const inner = rows.trim();
  if (!inner) { return ''; }
  return `<div class="ht-section"><h4 class="ht-section-title">${escapeHtml(title)}</h4>${inner}</div>`;
}

function renderHatterTagSheet(): string {
  const data = state.hatterTagSheetData;
  if (!data) { return ''; }

  // E2 — structured panel. Defensive: tag fields are all optional;
  // older artifacts may lack some. parseHatterTag returns a plain
  // object; we read by string key without type assertions.
  let body: string;
  if (!data.tag) {
    body = `<p class="hatter-tag-empty">${escapeHtml(data.reason ?? 'No tag available.')}</p>`;
  } else {
    const t = data.tag as Record<string, unknown>;
    const audit = (t['audit'] as Record<string, unknown> | undefined) ?? {};
    const chainRoot = (audit['chain_root_hash'] as string | undefined) ?? (t['chain_root_hash'] as string | undefined);
    const chainRootShort = chainRoot ? `${chainRoot.slice(0, 16)}…` : '';
    const reviewerDids = t['reviewer_dids'] as unknown[] | undefined;
    const identity = [
      htField('OKR', t['okr_id'] as string, { mono: true }),
      htField('Phase', t['phase'] as string, { mono: true }),
      htField('Run ID', t['run_id'] as string, { mono: true }),
      htField('Governance tier', t['governance_tier'] as string),
      htField('Evidence mode', t['evidence_mode'] as string),
    ].join('');
    const threading = [
      htField('Intent thread', t['intent_thread_uuid'] as string, { mono: true }),
      htField('Parent thread', t['parent_intent_thread'] as string, { mono: true }),
    ].join('');
    const authorship = [
      htField('Author DID', t['author_did'] as string, { mono: true }),
      reviewerDids && reviewerDids.length > 0
        ? htField('Reviewer DIDs', reviewerDids.map(d => String(d)).join(', '), { mono: true })
        : '',
      htField('GitHub App install', t['github_app_installation_id'] as string),
      htField('Prompt SHA', t['system_prompt_sha'] as string, { mono: true, full: t['system_prompt_sha'] as string ?? '' }),
    ].join('');
    const chain = [
      chainRoot
        ? `<div class="ht-row"><span class="ht-label">Chain root</span>
            <span class="ht-value">
              <code>${escapeHtml(chainRootShort)}</code>
              <button class="btn-ghost" data-action="copy-text" data-copy="${escapeAttr(chainRoot)}" title="Copy full hash" style="font-size: 0.7em; padding: 0 4px;">📋</button>
              <button class="btn-link" data-action="verify-chain-from-tag" data-okr-id="${escapeAttr(data.okrId)}" data-action-id="${escapeAttr(data.actionId)}" style="margin-left: 8px; font-size: 0.85em;">🔍 Verify Chain →</button>
            </span>
          </div>`
        : `<div class="ht-row"><span class="ht-label">Chain root</span><span class="ht-value" style="color: var(--text-dim, #94a3b8);">(missing — finalize may not have populated yet)</span></div>`,
      htField('Event count', audit['event_count'] as number),
      htField('Signer epoch', audit['signer_epoch'] as number),
    ].join('');
    body = `
      ${htSection('Identity', identity)}
      ${htSection('Threading', threading)}
      ${htSection('Authorship', authorship)}
      ${htSection('Audit chain', chain)}
      <details style="margin-top: 12px;">
        <summary style="cursor: pointer; font-size: 0.85em; color: var(--text-dim, #94a3b8);">Raw YAML (advanced)</summary>
        <pre class="hatter-tag-body" style="margin-top: 6px; font-size: 0.8em;">${escapeHtml(JSON.stringify(data.tag, null, 2))}</pre>
      </details>
    `;
  }
  return `
    <div class="hatter-tag-overlay" data-action="close-hatter-tag-overlay">
      <div class="hatter-tag-sheet" role="dialog" aria-modal="true" aria-label="Hatter's Tag for ${escapeHtml(data.actionId)}">
        <div class="hatter-tag-header">
          <h3>🏷 Hatter’s Tag · ${escapeHtml(data.actionId)}</h3>
          <button class="btn-ghost" data-action="close-hatter-tag">✕ Close</button>
        </div>
        ${body}
      </div>
    </div>
  `;
}

/**
 * Phase E E1 — Verify Chain slide-out sheet. Mirrors the runner's
 * `audit-verify-chain` skill verdict in a user-friendly modal so a
 * reviewer can spot-check chain integrity from the OKR detail page
 * without dropping to the CLI. Same overlay shape as renderHatter
 * TagSheet to keep the visual rhythm consistent.
 *
 * Verdict shape produced by verifyChainForUI(lines) in chainVerify.ts.
 */
function renderChainVerifySheet(): string {
  const data = state.chainVerifySheetData;
  if (!data) { return ''; }
  let body: string;
  if (!data.verdict) {
    body = `<p class="hatter-tag-empty">${escapeHtml(data.reason ?? 'No verdict available.')}</p>`;
  } else {
    const v = data.verdict;
    const sealEmoji = v.seal.sealed ? '🛡 Sealed' : v.seal.sealTampered ? '⚠ Tampered' : 'ℹ No agent events';
    const sealColor = v.seal.sealed ? 'var(--success, #4ade80)' : v.seal.sealTampered ? 'var(--danger, #f87171)' : 'var(--text-dim, #94a3b8)';
    const shapeEmoji = v.shapeOk ? '✓ shape-ok' : '✗ shape-failed';
    const shapeColor = v.shapeOk ? 'var(--success, #4ade80)' : 'var(--danger, #f87171)';
    const kindRows = Object.entries(v.byKind).sort(([a],[b]) => a.localeCompare(b)).map(([kind, counts]) => `
      <tr>
        <td><code>${escapeHtml(kind)}</code></td>
        <td style="text-align:right;">${counts.signed}</td>
        <td style="text-align:right;">${counts.unsigned}</td>
        <td style="text-align:right;"><strong>${counts.signed + counts.unsigned}</strong></td>
      </tr>
    `).join('');
    const failureBlock = v.firstFailure
      ? `<div class="hatter-tag-note" style="border-left: 3px solid var(--danger, #f87171); padding-left: 8px;">
           <strong>First failure</strong> at line ${v.firstFailure.line}
           (<code>${escapeHtml(v.firstFailure.kind)}</code>): ${escapeHtml(v.firstFailure.reason)}
         </div>`
      : '';
    const forgeryCounts = (v.malformedLines + v.unsignedAgentEvents + v.signedWorkflowEvents + v.originKindMismatches) > 0
      ? `<ul style="margin: 4px 0 0 16px; padding: 0;">
           ${v.malformedLines > 0 ? `<li>${v.malformedLines} malformed JSONL line(s)</li>` : ''}
           ${v.unsignedAgentEvents > 0 ? `<li>${v.unsignedAgentEvents} unsigned agent event(s)</li>` : ''}
           ${v.signedWorkflowEvents > 0 ? `<li>${v.signedWorkflowEvents} signed-workflow forgery / non-allowlisted workflow kind</li>` : ''}
           ${v.originKindMismatches > 0 ? `<li>${v.originKindMismatches} event_kind ↔ emitted_by mismatch(es)</li>` : ''}
         </ul>`
      : '<div style="color: var(--text-dim, #94a3b8);">No forgery indicators.</div>';
    body = `
      <div style="display:flex; gap:16px; align-items:baseline; margin-bottom:12px;">
        <div style="font-size: 1.4em; font-weight: 600; color: ${sealColor};">${escapeHtml(sealEmoji)}</div>
        <div style="font-size: 0.95em; color: ${shapeColor};">${escapeHtml(shapeEmoji)}</div>
        <div style="margin-left:auto; color: var(--text-dim, #94a3b8); font-size: 0.85em;">
          ${v.totalEvents} events in chain
        </div>
      </div>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 12px; font-size: 0.9em;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border, #475569);">
            <th style="text-align:left; padding:4px 8px;">Event kind</th>
            <th style="text-align:right; padding:4px 8px;">Signed</th>
            <th style="text-align:right; padding:4px 8px;">Unsigned</th>
            <th style="text-align:right; padding:4px 8px;">Total</th>
          </tr>
        </thead>
        <tbody>${kindRows}</tbody>
      </table>
      ${failureBlock}
      <details style="margin-top: 12px;">
        <summary style="cursor: pointer; font-size: 0.9em;">Forgery breakdown</summary>
        <div style="margin-top: 6px; font-size: 0.9em;">${forgeryCounts}</div>
      </details>
      <p class="hatter-tag-note">
        Shape verification only — Ed25519 signature crypto AND per-event
        hash-chain replay both run in the runner (<code>skill-audit-verify-chain</code>),
        not here. For sign-off before fan-out, run:<br>
        <code style="font-size: 0.85em; word-break: break-all;">printf '{"okrId":"${escapeHtml(data.okrId)}","runId":"${escapeHtml(data.runId)}"}' | npx -y @maintainabilityai/research-runner@~0.1.42 skill-audit-verify-chain</code>
      </p>
    `;
  }
  return `
    <div class="hatter-tag-overlay" data-action="close-chain-verify-overlay">
      <div class="hatter-tag-sheet" role="dialog" aria-modal="true" aria-label="Verify chain for ${escapeHtml(data.actionId)}">
        <div class="hatter-tag-header">
          <h3>🔗 Verify Chain · ${escapeHtml(data.actionId)}</h3>
          <button class="btn-ghost" data-action="close-chain-verify">✕ Close</button>
        </div>
        <div class="hatter-tag-meta">
          OKR: <code>${escapeHtml(data.okrId)}</code>
          ${data.runId ? ` · Run: <code>${escapeHtml(data.runId)}</code>` : ''}
        </div>
        ${body}
      </div>
    </div>
  `;
}

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

      ${renderSettingsMeshProvisioning()}
      ${renderSettingsCodingAgentEnv()}
      ${renderSettingsLlmModel()}
      ${renderSettingsMeshSecrets()}
      ${renderSettingsResearch()}
      ${renderSettingsDriftWeights()}
      ${renderSettingsOrchestration()}
      ${renderSettingsGovernanceCourt()}
      ${renderSettingsDangerZone()}
    </div>
  `;
}

function settingsRepoHint(): string {
  if (!state.meshOwner || !state.meshRepo) { return ''; }
  return `<span class="text-muted" style="font-size: 11px; margin-left: 8px;">${escapeHtml(state.meshOwner)}/${escapeHtml(state.meshRepo)}</span>`;
}

/**
 * Single combined Mesh Provisioning section — agents + workflows + skills
 * + prompt packs together. The "Deploy All" button writes all four
 * artifact families through the `provisionAll` message; the "Refresh
 * Prompts" button re-seeds the bundled prompt packs without touching
 * user-added packs.
 *
 * Internal debt (the `DEPRECATED_MESH_FILES` prune list) is NOT surfaced
 * here — pruning still runs on every Deploy, but the user doesn't need
 * to see retired-workflow naming to use the product. If a future debt
 * surface is needed it lives in a dev-only "Diagnostics" view, not here.
 */
function renderSettingsMeshProvisioning(): string {
  const skills = state.settingsAgenticSkills;
  const agents = state.settingsAgenticAgents;
  const skillCount = skills ? skills.length : 20;
  const skillDeployed = skills ? skills.filter(s => s.deployed).length : null;
  const agentCount = agents ? agents.length : 4;
  const agentDeployed = agents ? agents.filter(a => a.deployed).length : null;

  const workflowStatus = deployStatusBadge(state.settingsWorkflowExists);
  const skillBadge = skillDeployed === null
    ? '<span class="badge-muted">Not checked</span>'
    : skillDeployed === skillCount
      ? `<span class="badge-success">✓ ${skillDeployed}/${skillCount} deployed</span>`
      : `<span class="badge-warn">${skillDeployed}/${skillCount} deployed</span>`;
  const agentBadge = agentDeployed === null
    ? '<span class="badge-muted">Not checked</span>'
    : agentDeployed === agentCount
      ? `<span class="badge-success">✓ ${agentDeployed}/${agentCount} deployed</span>`
      : `<span class="badge-warn">${agentDeployed}/${agentCount} deployed</span>`;

  const allDeployed = state.settingsWorkflowExists && skillDeployed === skillCount && agentDeployed === agentCount;
  const buttonLabel = allDeployed ? 'Redeploy All (workflows + actions + agents + skills)' : 'Deploy All (workflows + actions + agents + skills)';

  return `
    <div class="settings-section">
      <h3>Mesh Provisioning ${settingsRepoHint()}</h3>
      <p class="text-muted">
        Deploys the agents, skills, workflows, and prompt packs the governed
        SDLC pipeline runs on. Everything is idempotent — only files whose
        content has changed are committed, and files no longer in use are
        pruned automatically.
      </p>

      <h4 class="settings-subsection-heading">Agents</h4>
      <div class="settings-row">
        <div class="settings-label">Status</div>
        <div>${agentBadge}</div>
      </div>
      <ul class="text-muted settings-subsection-list">
        <li><strong>Market Research Agent</strong> — runs the <strong>WHY phase</strong>. Surveys the web (Tavily · arXiv · USPTO · Hacker News), iterates on coverage gaps, and synthesizes a research doc grounded in cited sources.</li>
        <li><strong>PRD Agent</strong> — runs the <strong>HOW phase</strong>. Synthesizes a mesh-grounded PRD from the research doc + the BAR's architecture / threat model / quality attributes, then self-critiques as an Architect and a Security persona in bounded rounds.</li>
        <li><strong>Code Design Agent</strong> — runs the <strong>WHAT phase</strong>. Grounds a cross-repo code design on the actual code (for existing repos) or on a scaffolding spec (for new repos to create), and applies the same persona-switch self-critique loop as the PRD agent.</li>
      </ul>

      <h4 class="settings-subsection-heading">Workflows</h4>
      <div class="settings-row">
        <div class="settings-label">Status</div>
        <div>${workflowStatus}</div>
      </div>
      <ul class="text-muted settings-subsection-list">
        <li><strong>One workflow per agent</strong> — each owns its phase's dispatch, audit + drift checks, and finalize step. Workflows verify the audit chain, the Knight's Seal signatures, and the drift gates (Pocket Watch + Caterpillar's Challenge) before a phase's PR can merge.</li>
        <li><strong>BAR Review</strong> — runs the standalone Oraculum review on individual Business Architecture Roots, separate from the SDLC pipeline.</li>
        <li><strong>Composite actions</strong> — small reusable pieces (OKR-context extraction, skill-call counting, tier resolution) shared across all per-agent workflows.</li>
      </ul>

      <h4 class="settings-subsection-heading">Skills</h4>
      <div class="settings-row">
        <div class="settings-label">Status</div>
        <div>${skillBadge}</div>
      </div>
      <p class="text-muted settings-subsection-note">
        Skills are pure-data primitives the agents call. They never run an LLM
        themselves — they fetch, read, or compute and return JSON the agent
        reasons over. Every skill call lands as a signed event in the audit
        chain.
      </p>
      <ul class="text-muted settings-subsection-list">
        <li><strong>Search</strong> — Tavily, arXiv, USPTO, Hacker News, plus a dedupe + rank pass.</li>
        <li><strong>Knowledge</strong> — read-only views over the mesh (OKR card, BAR app, platform, threat model, ADRs, research doc, PRD) and over the actual code in target repos.</li>
        <li><strong>Context</strong> — per-BAR architecture / security / quality slices for the PRD's grounding sections.</li>
        <li><strong>Self-Review</strong> — authoritative tier echo + prompt-pack handoff for the agent's Architect and Security persona-switch rounds (both PRD-phase and code-design-phase variants).</li>
        <li><strong>Audit</strong> — hash-chained, Ed25519-sealed event emission. Every agent action goes through this surface; tampering breaks the chain.</li>
      </ul>

      <h4 class="settings-subsection-heading">Prompt Packs</h4>
      <p class="text-muted settings-subsection-note">
        Bundled in <code>.caterpillar/prompts/</code>. Each agent's synthesis
        + review packs are kept here as plain markdown so they can be diffed
        and reviewed alongside any other code. Refresh updates the bundled
        packs with the latest shipped versions — packs you added yourself
        are left untouched.
      </p>
      <ul class="text-muted settings-subsection-list">
        <li><strong>Research</strong> — query plan, synthesis, refinement guidance for the WHY phase.</li>
        <li><strong>PRD</strong> — synthesis, architecture review, security review, expert-question prompts for the HOW phase.</li>
        <li><strong>Code Design</strong> — synthesis, architecture review, security review for the WHAT phase (brownfield + greenfield branching).</li>
        <li><strong>BAR Review</strong> — Oraculum review packs (default, architecture, application-security, information-risk, operations) for the standalone BAR-review workflow.</li>
      </ul>

      <div class="settings-row" style="gap: 0.5rem;">
        <button id="btn-settings-deploy-all" class="btn-primary">${buttonLabel}</button>
        <button id="btn-refresh-prompt-packs" class="btn-secondary">Refresh Prompts</button>
      </div>
    </div>
  `;
}


/**
 * Coding Agent Environment readiness section (B-PR1e).
 *
 * The Copilot Coding Agent runtime reads secrets from the `copilot` GitHub
 * Environment (NOT Actions secrets — separate store). And its outbound
 * firewall blocks everything except a recommended allow-list, which excludes
 * the four free search providers we need.
 *
 * This section surfaces both prerequisites in one place: per-secret status
 * with Add/Update buttons (API-managed via gh CLI sealed-box encryption)
 * and a host checklist with a deep link to the Coding Agent settings page
 * (UI-managed — no public REST API as of 2026-05).
 */
function renderSettingsCodingAgentEnv(): string {
  const env = state.settingsCopilotEnv;
  const err = state.settingsCopilotEnvError;

  if (err) {
    return `
      <div class="settings-section">
        <h3>Coding Agent Environment ${settingsRepoHint()}</h3>
        <p class="text-muted">${escapeHtml(err)}</p>
        <div class="settings-row">
          <button id="btn-copilot-env-refresh" class="btn-secondary">Retry</button>
        </div>
      </div>
    `;
  }

  if (!env) {
    return `
      <div class="settings-section">
        <h3>Coding Agent Environment ${settingsRepoHint()}</h3>
        <p class="text-muted">
          The Copilot Coding Agent runtime reads secrets from the
          <code>copilot</code> GitHub Environment (separate from Actions
          secrets) and runs behind a recommended firewall allow-list that
          blocks third-party APIs by default. Both must be configured for
          the WHY-phase agent to gather live evidence.
        </p>
        <div class="settings-row">
          <button id="btn-copilot-env-refresh" class="btn-primary">Check status</button>
        </div>
      </div>
    `;
  }

  const required = env.secrets.filter(s => s.required);
  const optional = env.secrets.filter(s => !s.required);
  const presentRequired = required.filter(s => s.present).length;

  const headerBadge = !env.environmentExists
    ? '<span class="badge-warn">✗ `copilot` environment not found</span>'
    : !env.reachable
      ? '<span class="badge-warn">⚠ cannot query env secrets</span>'
      : presentRequired === required.length
        ? `<span class="badge-success">✓ ${presentRequired}/${required.length} required secrets present</span>`
        : `<span class="badge-warn">${presentRequired}/${required.length} required secrets present</span>`;

  const renderSecretRow = (s: { name: string; purpose: string; usedBy: string[]; required: boolean; signupUrl: string; present: boolean }) => {
    const icon = s.present ? '<span class="badge-success">✓ present</span>' : '<span class="badge-warn">✗ missing</span>';
    const btnLabel = s.present ? 'Update' : 'Add';
    return `
      <div class="settings-row" style="align-items: flex-start;">
        <div class="settings-label" style="flex: 1;">
          <code>${escapeHtml(s.name)}</code>
          ${s.required ? '' : ' <span class="text-muted" style="font-size: 11px;">(optional)</span>'}
          <div class="text-muted" style="font-size: 11px; margin-top: 2px;">${escapeHtml(s.purpose)}</div>
          <div class="text-muted" style="font-size: 11px;">Get one: <a href="${escapeHtml(s.signupUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.signupUrl)}</a></div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${icon}
          <button class="btn-secondary btn-copilot-env-set-secret" data-secret-name="${escapeHtml(s.name)}">${btnLabel}</button>
        </div>
      </div>
    `;
  };

  const hostsRows = env.hosts.map(h => `
    <li>
      <code>${escapeHtml(h.url)}</code>
      <span class="text-muted" style="font-size: 11px;"> — ${escapeHtml(h.purpose)} (${h.usedBy.map(s => `<code>${escapeHtml(s)}</code>`).join(', ')})</span>
    </li>
  `).join('');

  const hostsAsText = env.hosts.map(h => h.url).join('\n');

  return `
    <div class="settings-section">
      <h3>Coding Agent Environment ${settingsRepoHint()}</h3>
      <p class="text-muted">
        The Copilot Coding Agent runs in a separate runtime from GitHub Actions:
        it reads secrets from the <code>copilot</code> environment and obeys
        its own outbound firewall. Both must be configured for the WHY-phase
        agent to call Tavily / arXiv / USPTO / HN successfully.
      </p>
      <div class="settings-row">
        <div class="settings-label">Status</div>
        <div>${headerBadge}</div>
      </div>

      <h4 style="margin: 16px 0 8px;">Environment secrets <span class="text-muted" style="font-weight: normal; font-size: 12px;">(API-managed)</span></h4>
      ${required.map(renderSecretRow).join('')}
      ${optional.length > 0 ? `
        <details style="margin: 8px 0;">
          <summary class="text-muted" style="cursor: pointer;">Optional secrets (${optional.length})</summary>
          ${optional.map(renderSecretRow).join('')}
        </details>
      ` : ''}

      <h4 style="margin: 16px 0 8px;">Firewall allow-list <span class="text-muted" style="font-weight: normal; font-size: 12px;">(manual — no API yet)</span></h4>
      <p class="text-muted" style="font-size: 12px;">
        These hosts must be added to the Coding Agent's outbound allow-list.
        Even arXiv + HN (no API key) fail with <code>fetch failed</code> until
        their hosts are listed. Auto-verification isn't possible — GitHub
        doesn't expose an API for this setting yet. Check the agent's audit
        JSONL for <code>fetch failed</code> entries to confirm allow-list misses.
      </p>
      <p class="text-muted" style="font-size: 12px; background: rgba(110,231,183,0.06); border-left: 2px solid rgba(110,231,183,0.4); padding: 6px 10px; margin: 6px 0;">
        <strong>GitHub API access is NOT in this list by design.</strong>
        Agents use the out-of-the-box <code>github/*</code> MCP server (declared
        in each <code>.agent.md</code>'s <code>tools:</code> list) which routes
        through <code>api.githubcopilot.com</code> — always allow-listed by
        Copilot. So posting issue comments, applying labels, and reading PR
        state don't require manual firewall changes. See
        <a href="https://docs.github.com/en/copilot/customizing-copilot/customizing-the-development-environment-for-copilot-coding-agent#tool-names-for-out-of-the-box-mcp-servers" target="_blank" rel="noopener noreferrer">Copilot Coding Agent MCP docs</a>
        for tool names.
      </p>
      <p class="text-muted" style="font-size: 12px; margin-top: 4px;">
        <strong>Where to paste them:</strong> open
        <a href="https://github.com/${escapeHtml(env.repoSlug)}/settings/copilot/coding_agent" target="_blank" rel="noopener noreferrer"><code>https://github.com/${escapeHtml(env.repoSlug)}/settings/copilot/coding_agent</code></a>
        → scroll to <em>Recommended firewall settings</em> → toggle <em>Custom allow list</em> → paste one host per line. (The <strong>Open Coding Agent settings ↗</strong> button below jumps you straight there.)
      </p>
      <ul style="margin: 4px 0 8px 16px; padding: 0; font-size: 13px;">
        ${hostsRows}
      </ul>
      <div class="settings-row">
        <button id="btn-copilot-firewall-open" class="btn-primary">Open Coding Agent settings ↗</button>
        <button id="btn-copilot-firewall-copy" class="btn-secondary" data-hosts="${escapeHtml(hostsAsText)}">Copy hosts</button>
      </div>

      <h4 style="margin: 16px 0 8px;">Where things live (cheat sheet)</h4>
      <p class="text-muted" style="font-size: 12px;">
        The Copilot Coding Agent has its own admin pages, separate from
        GitHub Actions secrets. Bookmark these for the next person:
      </p>
      <ul class="text-muted" style="margin: 4px 0 8px 16px; padding: 0; font-size: 12px; list-style: disc;">
        <li>
          <strong>Coding Agent settings + firewall:</strong>
          <a href="https://github.com/${escapeHtml(env.repoSlug)}/settings/copilot/coding_agent" target="_blank" rel="noopener noreferrer"><code>github.com/${escapeHtml(env.repoSlug)}/settings/copilot/coding_agent</code></a>
        </li>
        <li>
          <strong><code>copilot</code> environment secrets:</strong>
          <a href="https://github.com/${escapeHtml(env.repoSlug)}/settings/environments/copilot/secrets" target="_blank" rel="noopener noreferrer"><code>github.com/${escapeHtml(env.repoSlug)}/settings/environments/copilot/secrets</code></a>
          (the buttons above seed these via API; this page is the manual fallback)
        </li>
        <li>
          <strong>Actions secrets</strong> (NOT used by the Coding Agent — only by legacy CI workflows):
          <a href="https://github.com/${escapeHtml(env.repoSlug)}/settings/secrets/actions" target="_blank" rel="noopener noreferrer"><code>github.com/${escapeHtml(env.repoSlug)}/settings/secrets/actions</code></a>
        </li>
      </ul>

      <div class="settings-row" style="margin-top: 16px;">
        <button id="btn-copilot-env-refresh" class="btn-secondary">Refresh status</button>
        <button id="btn-copilot-env-open-page" class="btn-secondary">Open env secrets page ↗</button>
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

function statusPill(set: boolean | null, label: string): string {
  if (set === null) {
    return `<span class="settings-pill settings-pill-muted" title="Not checked (no GitHub access or no mesh repo configured)">${escapeHtml(label)}: ?</span>`;
  }
  return set
    ? `<span class="settings-pill settings-pill-success">${escapeHtml(label)}: set</span>`
    : `<span class="settings-pill settings-pill-warn">${escapeHtml(label)}: not set</span>`;
}

function actionPill(status?: { kind: 'success' | 'error' | 'busy'; message: string }): string {
  if (!status) { return ''; }
  const cls = status.kind === 'success' ? 'settings-pill-success'
            : status.kind === 'error'   ? 'settings-pill-error'
            : 'settings-pill-muted';
  const prefix = status.kind === 'busy' ? '… ' : status.kind === 'success' ? '✓ ' : '✗ ';
  return `<span class="settings-pill ${cls}" style="margin-left: 8px;">${prefix}${escapeHtml(status.message)}</span>`;
}

function renderSettingsResearch(): string {
  const rs = state.researchSettings;
  if (!rs) {
    return `
      <div class="settings-section">
        <h3>Research + PRD Agents</h3>
        <p class="text-muted">Loading research settings…</p>
      </div>`;
  }

  const meshRepoHint = rs.meshRepo
    ? `<span class="text-muted" style="font-size: 11px; margin-left: 8px;">${escapeHtml(rs.meshRepo.owner)}/${escapeHtml(rs.meshRepo.repo)}</span>`
    : `<span class="text-muted" style="font-size: 11px; margin-left: 8px;">(no mesh repo detected)</span>`;

  const secretRows = rs.secrets.map(s => {
    const status = state.researchSecretStatus[s.id];
    const ghDisabled = !rs.meshRepo || !s.hasVsCodeValue;
    const testDisabled = !s.hasVsCodeValue;
    // One push button per scope:
    //   mesh-only secrets (Tavily, USPTO)      → "Push to mesh"
    //   mesh+code secrets (Anthropic, OpenAI,
    //   GOVERNANCE_MESH_TOKEN)                  → "Push to mesh + code repos"
    // Never both — pushing a mesh+code secret only to the mesh leaves the
    // distribution half-done, which is worse than not pushing at all.
    const pushLabel = s.scope === 'mesh+code' ? 'Push to mesh + code repos' : 'Push to mesh';
    const pushClass = s.scope === 'mesh+code' ? 'btn-research-push-all' : 'btn-research-push';
    const pushTitle = s.scope === 'mesh+code'
      ? 'Push to mesh + every linked code repo from app.yaml repos'
      : 'Push to the mesh repo Actions secrets';
    const description = s.description
      ? `<div class="settings-research-secret-desc" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${escapeHtml(s.description)}</div>`
      : '';
    return `
      <div class="settings-research-secret">
        <div class="settings-research-secret-head">
          <div>
            <div class="settings-research-secret-name">${escapeHtml(s.label)}</div>
            <div class="settings-research-secret-env"><code>${escapeHtml(s.envName)}</code></div>
            ${description}
          </div>
          <div class="settings-research-secret-status">
            ${statusPill(s.hasVsCodeValue, 'VS Code')}
            ${statusPill(s.hasGitHubSecret, 'Mesh')}
          </div>
        </div>
        <div class="settings-research-secret-actions">
          ${s.id === 'governance-mesh-token' ? `<button class="btn-secondary btn-research-create" data-secret-id="${escapeAttr(s.id)}" title="Open the GitHub PAT page, show the scope checklist, paste the new token, save it, and push to the mesh repo — in one flow">Create</button>` : ''}
          <button class="btn-secondary btn-research-set" data-secret-id="${escapeAttr(s.id)}">Set value</button>
          <button class="btn-secondary btn-research-test" data-secret-id="${escapeAttr(s.id)}" ${testDisabled ? 'disabled' : ''}>Test</button>
          <button class="btn-secondary ${pushClass}" data-secret-id="${escapeAttr(s.id)}" ${ghDisabled ? 'disabled' : ''} title="${escapeAttr(pushTitle)}">${escapeHtml(pushLabel)}</button>
          ${actionPill(status)}
        </div>
      </div>`;
  }).join('');

  const p = rs.prefs;
  const providerOpt = (val: string, label: string) =>
    `<option value="${val}"${p.llmProvider === val ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  const modeOpt = (cur: string, val: string) =>
    `<option value="${val}"${cur === val ? ' selected' : ''}>${escapeHtml(val)}</option>`;

  return `
    <div class="settings-section">
      <h3>Research + PRD Agents ${meshRepoHint}</h3>
      <p class="text-muted">
        Keys for the Archeologist (research) and PRD agents. Each key lives in two places: VS Code workspace settings (for local dev runs) and the mesh GitHub repo secrets (for workflow runs). Use <strong>Push to GitHub</strong> to sync.
      </p>

      <div class="settings-research-grid">
        ${secretRows}
      </div>

      <h4 class="settings-research-prefs-heading">Run-time preferences</h4>
      <p class="text-muted" style="margin-bottom: 12px;">Defaults applied to every research / PRD dispatch. Per-run overrides will be available in the New Research form.</p>

      <div class="settings-row">
        <div class="settings-label">LLM provider</div>
        <select id="research-pref-provider" class="settings-select">
          ${providerOpt('github-models', 'GitHub Models / Copilot (no API key needed)')}
          ${providerOpt('anthropic', 'Anthropic (Claude) — needs ANTHROPIC_API_KEY')}
          ${providerOpt('openai', 'OpenAI (GPT) — needs OPENAI_API_KEY')}
        </select>
      </div>
      <div class="settings-row">
        <div class="settings-label">Guardrails mode</div>
        <select id="research-pref-guardrails" class="settings-select">
          ${modeOpt(p.guardrails, 'strict')}
          ${modeOpt(p.guardrails, 'default')}
          ${modeOpt(p.guardrails, 'lenient')}
        </select>
      </div>
      <div class="settings-row">
        <div class="settings-label">PRD grounding mode</div>
        <select id="research-pref-grounding" class="settings-select">
          ${modeOpt(p.grounding, 'strict')}
          ${modeOpt(p.grounding, 'default')}
          ${modeOpt(p.grounding, 'lenient')}
        </select>
      </div>
      <div class="settings-row">
        <div class="settings-label">Grounding threshold</div>
        <input type="number" id="research-pref-threshold" class="settings-number" step="0.01" min="0.5" max="1" value="${p.groundingThreshold}" />
      </div>
      <div class="settings-row">
        <div class="settings-label">PRD max iterations</div>
        <input type="number" id="research-pref-iterations" class="settings-number" step="1" min="1" max="5" value="${p.maxIterations}" />
      </div>
      <div class="settings-row">
        <div class="settings-label">Cost cap (tokens)</div>
        <input type="number" id="research-pref-cost" class="settings-number" step="10000" min="10000" value="${p.costCapTokens}" />
      </div>
      <div class="settings-row" style="justify-content: flex-start; margin-top: 12px;">
        <button id="btn-save-research-prefs" class="btn-primary">Save Preferences</button>
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

function renderSettingsOrchestration(): string {
  const o = state.orchPolicy;
  if (!o) {
    return `
      <div class="settings-section">
        <h3>Orchestration Policy</h3>
        <p class="text-muted">Agent governance tiers, prompt injection thresholds, and escalation rules. Saved to <code>mesh.yaml</code>.</p>
        <div class="settings-row" style="justify-content: flex-start;">
          <button id="btn-load-orch-policy" class="btn-secondary">Load Policy</button>
        </div>
      </div>
    `;
  }
  return `
    <div class="settings-section">
      <h3>Orchestration Policy</h3>
      <p class="text-muted">Agent governance tiers, prompt injection thresholds, and escalation rules. Saved to <code>mesh.yaml</code>.</p>
      <div style="margin-top: 8px; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Permission Tiers</div>
      <div class="settings-row">
        <div class="settings-label"><span class="tier-badge autonomous">autonomous</span> min score</div>
        <input type="number" id="orch-auto-min" class="settings-number" value="${o.autoMinScore}" min="0" max="100" />
      </div>
      <div class="settings-row">
        <div class="settings-label"><span class="tier-badge supervised">supervised</span> min score</div>
        <input type="number" id="orch-sup-min" class="settings-number" value="${o.supMinScore}" min="0" max="100" />
      </div>
      <div style="margin-top: 12px; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Prompt Injection Thresholds</div>
      <div class="settings-row">
        <div class="settings-label">Security pillar threshold</div>
        <input type="number" id="orch-sec-threshold" class="settings-number" value="${o.securityThreshold}" min="0" max="100" />
      </div>
      <div class="settings-row">
        <div class="settings-label">Architecture pillar threshold</div>
        <input type="number" id="orch-arch-threshold" class="settings-number" value="${o.archThreshold}" min="0" max="100" />
      </div>
      <div style="margin-top: 12px; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Escalation</div>
      <div class="settings-row">
        <div class="settings-label">Score drop threshold</div>
        <input type="number" id="orch-esc-drop" class="settings-number" value="${o.escScoreDrop}" min="1" max="50" />
      </div>
      <div class="settings-row">
        <div class="settings-label">Consecutive failures</div>
        <input type="number" id="orch-esc-failures" class="settings-number" value="${o.escConsecutive}" min="1" max="10" />
      </div>
      <div class="settings-row">
        <div class="settings-label">Escalation target</div>
        <input type="text" id="orch-esc-target" class="settings-input" value="${escapeAttr(o.escTarget)}" />
      </div>
      <div class="settings-row" style="justify-content: flex-start; margin-top: 12px; gap: 8px;">
        <button id="btn-save-orch-policy" class="btn-primary">Save Policy</button>
        <button id="btn-reset-orch-policy" class="btn-secondary">Reset to Defaults</button>
      </div>
    </div>
  `;
}

function renderSettingsGovernanceCourt(): string {
  const claude = state.agentType === 'claude' ? ' selected' : '';
  const copilot = state.agentType === 'copilot' ? ' selected' : '';
  const both = state.agentType === 'both' ? ' selected' : '';
  return `
    <div class="settings-section">
      <h3>Governance Court</h3>
      <p class="text-muted">Agent framework used for PR review workflows. This determines which action runs security and architecture review steps. <strong>Both</strong> runs one step per agent — consensus is computed across all reviews. Saved to <code>mesh.yaml</code>.</p>
      <div class="settings-row">
        <div class="settings-label">Agent Framework</div>
        <select id="select-agent-type" class="settings-select" style="padding: 4px 8px; font-size: 12px; border-radius: 4px; border: 1px solid var(--border); background: var(--surface); color: var(--text);">
          <option value="claude"${claude}>Claude Code Action</option>
          <option value="copilot"${copilot}>Copilot Coding Agent</option>
          <option value="both"${both}>Both (Claude + Copilot)</option>
        </select>
      </div>
      <div class="settings-row" style="justify-content: flex-start; margin-top: 8px;">
        <button id="btn-save-agent-type" class="btn-primary">Save</button>
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
    vscode.postMessage({ type: 'checkAgenticStatus' });
    vscode.postMessage({ type: 'listModels' });
    vscode.postMessage({ type: 'loadDriftWeights' });
    vscode.postMessage({ type: 'loadAgentType' });
    vscode.postMessage({ type: 'loadResearchSettings' });
    render();
  });

  // Settings: back to portfolio
  document.getElementById('btn-back-from-settings')?.addEventListener('click', () => {
    state.view = 'portfolio';
    state.settingsReinitConfirmStep = 0;
    render();
  });

  // Settings: deploy all (workflows + actions + agents + skills) — single
  // button. Post-Bug-DD (2026-05), onProvisionWorkflow itself deploys
  // everything atomically, so this is the only redeploy entry point.
  // The legacy btn-settings-provision + btn-settings-provision-agentic
  // click handlers were removed in the same cleanup — neither button
  // was mounted anywhere in the current UI, and the underlying
  // provisionWorkflow / provisionAgentic message handlers led to
  // partial-deployment foot-guns (see Bug DD forensic).
  document.getElementById('btn-settings-deploy-all')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'provisionAll' });
  });

  // Settings: Coding Agent Environment (B-PR1e)
  document.getElementById('btn-copilot-env-refresh')?.addEventListener('click', () => {
    state.settingsCopilotEnv = null;
    state.settingsCopilotEnvError = null;
    render();
    vscode.postMessage({ type: 'getCopilotEnvStatus' });
  });
  document.getElementById('btn-copilot-firewall-open')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'openCopilotFirewallSettings' });
  });
  document.getElementById('btn-copilot-env-open-page')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'openCopilotEnvSecretsPage' });
  });
  document.getElementById('btn-copilot-firewall-copy')?.addEventListener('click', (e) => {
    const target = e.currentTarget as HTMLButtonElement;
    const hosts = target?.dataset.hosts ?? '';
    if (hosts) {
      navigator.clipboard.writeText(hosts).then(() => {
        target.textContent = 'Copied ✓';
        setTimeout(() => { target.textContent = 'Copy hosts'; }, 1500);
      });
    }
  });
  // Per-secret Add/Update buttons (multiple, bound by class).
  document.querySelectorAll<HTMLButtonElement>('.btn-copilot-env-set-secret').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const name = target?.dataset.secretName;
      if (name) {
        vscode.postMessage({ type: 'setCopilotEnvSecret', secretName: name });
      }
    });
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

  // Research Settings — Create / Set / Test / Push per-secret + Save Preferences.
  // Set value now round-trips through the extension's showInputBox
  // (window.prompt is unreliable inside VS Code webviews).
  document.querySelectorAll('.btn-research-create').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = ((btn as HTMLElement).dataset.secretId || '') as ResearchSecretId;
      if (!id) { return; }
      vscode.postMessage({ type: 'createResearchSecret', id });
    });
  });

  document.querySelectorAll('.btn-research-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = ((btn as HTMLElement).dataset.secretId || '') as ResearchSecretId;
      if (!id) { return; }
      vscode.postMessage({ type: 'promptResearchSecret', id });
    });
  });

  document.querySelectorAll('.btn-research-test').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = ((btn as HTMLElement).dataset.secretId || '') as ResearchSecretId;
      if (!id) { return; }
      state.researchSecretStatus[id] = { kind: 'busy', message: 'Testing…' };
      render();
      vscode.postMessage({ type: 'testResearchSecret', id });
    });
  });

  document.querySelectorAll('.btn-research-push').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = ((btn as HTMLElement).dataset.secretId || '') as ResearchSecretId;
      if (!id) { return; }
      state.researchSecretStatus[id] = { kind: 'busy', message: 'Pushing to mesh…' };
      render();
      vscode.postMessage({ type: 'pushResearchSecret', id });
    });
  });

  document.querySelectorAll('.btn-research-push-all').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = ((btn as HTMLElement).dataset.secretId || '') as ResearchSecretId;
      if (!id) { return; }
      if (!confirm('Push this secret to the mesh repo AND every linked code repo found in app.yaml across all BARs?\n\nUse this for ANTHROPIC_API_KEY and OPENAI_API_KEY — secrets that alice-remediation.yml on each code repo consumes. (GOVERNANCE_MESH_TOKEN is mesh-only; use Push to mesh for it.)')) { return; }
      state.researchSecretStatus[id] = { kind: 'busy', message: 'Pushing to mesh + code repos…' };
      render();
      vscode.postMessage({ type: 'pushResearchSecretToAll', id });
    });
  });

  document.getElementById('btn-save-research-prefs')?.addEventListener('click', () => {
    const provider = (document.getElementById('research-pref-provider') as HTMLSelectElement)?.value as 'github-models' | 'anthropic' | 'openai';
    const guardrails = (document.getElementById('research-pref-guardrails') as HTMLSelectElement)?.value as 'strict' | 'default' | 'lenient';
    const grounding = (document.getElementById('research-pref-grounding') as HTMLSelectElement)?.value as 'strict' | 'default' | 'lenient';
    const groundingThreshold = parseFloat((document.getElementById('research-pref-threshold') as HTMLInputElement)?.value || '0.85');
    const maxIterations = parseInt((document.getElementById('research-pref-iterations') as HTMLInputElement)?.value || '3', 10);
    const costCapTokens = parseInt((document.getElementById('research-pref-cost') as HTMLInputElement)?.value || '200000', 10);
    vscode.postMessage({
      type: 'saveResearchPrefs',
      prefs: { llmProvider: provider, guardrails, grounding, groundingThreshold, maxIterations, costCapTokens },
    });
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

  // Settings: load orchestration policy
  document.getElementById('btn-load-orch-policy')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'loadOrchestrationPolicy' });
  });

  // Settings: save orchestration policy
  document.getElementById('btn-save-orch-policy')?.addEventListener('click', () => {
    const policy = {
      autoMinScore: parseInt((document.getElementById('orch-auto-min') as HTMLInputElement)?.value || '80', 10),
      supMinScore: parseInt((document.getElementById('orch-sup-min') as HTMLInputElement)?.value || '50', 10),
      securityThreshold: parseInt((document.getElementById('orch-sec-threshold') as HTMLInputElement)?.value || '60', 10),
      archThreshold: parseInt((document.getElementById('orch-arch-threshold') as HTMLInputElement)?.value || '70', 10),
      escScoreDrop: parseInt((document.getElementById('orch-esc-drop') as HTMLInputElement)?.value || '10', 10),
      escConsecutive: parseInt((document.getElementById('orch-esc-failures') as HTMLInputElement)?.value || '3', 10),
      escTarget: (document.getElementById('orch-esc-target') as HTMLInputElement)?.value || 'architecture-review-board',
    };
    state.orchPolicy = policy;
    vscode.postMessage({ type: 'saveOrchestrationPolicy', policy });
  });

  // Settings: save agent type (Governance Court)
  document.getElementById('btn-save-agent-type')?.addEventListener('click', () => {
    const select = document.getElementById('select-agent-type') as HTMLSelectElement;
    const agentType = (select?.value || 'claude') as 'claude' | 'copilot' | 'both';
    state.agentType = agentType;
    vscode.postMessage({ type: 'saveAgentType', agentType });
  });

  // Settings: reset orchestration policy to defaults
  document.getElementById('btn-reset-orch-policy')?.addEventListener('click', () => {
    state.orchPolicy = {
      autoMinScore: 80,
      supMinScore: 50,
      securityThreshold: 60,
      archThreshold: 70,
      escScoreDrop: 10,
      escConsecutive: 3,
      escTarget: 'architecture-review-board',
    };
    render();
  });

  // Platform governance editor — pencil button on platform cards
  document.querySelectorAll('.platform-gov-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Don't drill into platform
      const platformId = (btn as HTMLElement).dataset.platformId;
      if (platformId) {
        state.platGovEditing = platformId;
        state.platGov = null;
        render();
        vscode.postMessage({ type: 'loadPlatformGovernance', platformId });
      }
    });
  });

  // Platform governance editor — close/cancel/save
  document.getElementById('plat-gov-close')?.addEventListener('click', () => {
    state.platGovEditing = null;
    state.platGov = null;
    render();
  });
  document.getElementById('plat-gov-cancel')?.addEventListener('click', () => {
    state.platGovEditing = null;
    state.platGov = null;
    render();
  });
  document.getElementById('plat-gov-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'plat-gov-overlay') {
      state.platGovEditing = null;
      state.platGov = null;
      render();
    }
  });
  document.getElementById('plat-gov-reset')?.addEventListener('click', () => {
    state.platGov = {
      minimumScores: {},
      minTier: '',
      enforcementMode: 'advisory',
    };
    render();
  });
  document.getElementById('plat-gov-save')?.addEventListener('click', () => {
    const platformId = state.platGovEditing;
    if (!platformId) { return; }
    const governance = {
      minimumScores: {
        architecture: parseInt((document.getElementById('plat-gov-arch') as HTMLInputElement)?.value || '0', 10),
        security: parseInt((document.getElementById('plat-gov-sec') as HTMLInputElement)?.value || '0', 10),
        operations: parseInt((document.getElementById('plat-gov-ops') as HTMLInputElement)?.value || '0', 10),
      },
      minTier: (document.getElementById('plat-gov-min-tier') as HTMLSelectElement)?.value || '',
      enforcementMode: (document.getElementById('plat-gov-enforcement') as HTMLSelectElement)?.value || 'advisory',
    };
    state.platGov = governance;
    vscode.postMessage({ type: 'savePlatformGovernance', platformId, governance });
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

  // ---------- OKR Events (delegated to views/okrList.ts + views/okrDetail.ts) ----------
  attachOkrListEvents(vscode);
  attachOkrDetailEvents(vscode, () => {
    state.view = 'portfolio';
    state.activeLens = 'okrs';
    state.currentOkr = null;
    state.currentOkrAffectedBars = [];
    state.currentOkrMode = 'view';
    state.currentOkrAvailablePlatforms = [];
    state.currentOkrAvailableBars = [];
    state.hatterTagSheetOpen = false;
    state.hatterTagSheetData = null;
    state.chainVerifySheetOpen = false;
    state.chainVerifySheetData = null;
    state.startPhaseModalOpen = false;
    state.startPhaseModalData = null;
    state.fanOutPreflight = undefined;
    render();
  });

  // D-PR4 sub-PR 4 + 5 — Fan-out pre-flight delegated click handlers:
  //   * fanout-refresh         → re-dispatch fanOutPreflight
  //   * fanout-start-scaffold  → kick off greenfield Cheshire scaffold
  //                              (creates the repo via createOrgRepo +
  //                              opens Cheshire with the OKR context)
  // The "Fan out N of M ready" execute button stays disabled until
  // sub-PR 6 wires the actual landing-issue + agent-dispatch flow.
  document.body.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) { return; }

    const refresh = target.closest('[data-action="fanout-refresh"]') as HTMLElement | null;
    if (refresh) {
      const okrId = refresh.dataset.okrId;
      if (!okrId || !state.currentOkr || state.currentOkr.meta.id !== okrId) { return; }
      state.fanOutPreflight = { loading: true };
      render();
      vscode.postMessage({ type: 'fanOutPreflight', okrId });
      return;
    }

    const startScaffold = target.closest('[data-action="fanout-start-scaffold"]') as HTMLElement | null;
    if (startScaffold) {
      const okrId = startScaffold.dataset.okrId;
      const repoSlug = startScaffold.dataset.repoSlug;
      if (!okrId || !repoSlug || !state.currentOkr || state.currentOkr.meta.id !== okrId) { return; }
      // Optimistic: don't flip the row immediately — the extension
      // surfaces progress via info/error toasts + the loading banner.
      // Cheshire panel opens in a new tab; user returns to the OKR
      // detail and clicks Re-check when scaffold completes (harness
      // probe will then infer scaffold-complete).
      vscode.postMessage({ type: 'startGreenfieldScaffold', okrId, repoSlug });
      return;
    }
  });

  // Phase B-PR3+ Start-phase modal — Cancel (✕ + footer) + click-outside
  // close, plus Create that gathers the textarea and posts the confirm.
  document.querySelectorAll('[data-action="close-start-phase"]').forEach(el => {
    el.addEventListener('click', () => {
      state.startPhaseModalOpen = false;
      state.startPhaseModalData = null;
      render();
    });
  });
  document.querySelectorAll('[data-action="close-start-phase-overlay"]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        state.startPhaseModalOpen = false;
        state.startPhaseModalData = null;
        render();
      }
    });
  });
  document.querySelectorAll('[data-action="confirm-start-phase"]').forEach(el => {
    el.addEventListener('click', () => {
      const d = state.startPhaseModalData;
      if (!d) { return; }
      const ta = document.getElementById('start-phase-extra') as HTMLTextAreaElement | null;
      const additionalContext = (ta?.value ?? '').trim();
      vscode.postMessage({
        type: 'confirmStartOkrPhase',
        okrId: d.okrId,
        phase: d.phase,
        additionalContext,
      });
      state.startPhaseModalOpen = false;
      state.startPhaseModalData = null;
      render();
    });
  });

  // Phase B-PR4: Hatter Tag sheet close handlers (✕ button + overlay click)
  document.querySelectorAll('[data-action="close-hatter-tag"]').forEach(el => {
    el.addEventListener('click', () => {
      state.hatterTagSheetOpen = false;
      state.hatterTagSheetData = null;
      render();
    });
  });
  document.querySelectorAll('[data-action="close-hatter-tag-overlay"]').forEach(el => {
    el.addEventListener('click', (e) => {
      // Only close on click of the overlay itself, not its children.
      if (e.target === e.currentTarget) {
        state.hatterTagSheetOpen = false;
        state.hatterTagSheetData = null;
        render();
      }
    });
  });

  // Phase E E1: Verify Chain sheet close handlers (mirror of hatter-tag pattern)
  document.querySelectorAll('[data-action="close-chain-verify"]').forEach(el => {
    el.addEventListener('click', () => {
      state.chainVerifySheetOpen = false;
      state.chainVerifySheetData = null;
      render();
    });
  });
  document.querySelectorAll('[data-action="close-chain-verify-overlay"]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        state.chainVerifySheetOpen = false;
        state.chainVerifySheetData = null;
        render();
      }
    });
  });

  // Phase E E2: Hatter Tag panel — Copy field button (clipboard)
  document.querySelectorAll('[data-action="copy-text"]').forEach(el => {
    el.addEventListener('click', () => {
      const txt = (el as HTMLElement).dataset.copy;
      if (!txt) { return; }
      // VS Code webviews have clipboard write access via navigator.clipboard.
      navigator.clipboard?.writeText(txt).catch(() => { /* swallow */ });
    });
  });

  // Phase E E2: Hatter Tag panel — Verify Chain cross-link.
  // Closes the Hatter Tag modal + opens the Verify Chain modal for the
  // same action. Backend handler is the same as the OKR card button.
  document.querySelectorAll('[data-action="verify-chain-from-tag"]').forEach(el => {
    el.addEventListener('click', () => {
      const okrId = (el as HTMLElement).dataset.okrId;
      const actionId = (el as HTMLElement).dataset.actionId;
      if (!okrId || !actionId) { return; }
      state.hatterTagSheetOpen = false;
      state.hatterTagSheetData = null;
      vscode.postMessage({ type: 'verifyChain', okrId, actionId });
    });
  });

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

// =====================================================================
// Extension -> webview message dispatch table. Replaces the prior 80+
// case switch inside the addEventListener callback (cyclomatic complexity
// 232). Each entry is its own function so its complexity is measured
// independently; the router itself is trivially simple (one lookup +
// one call).
// =====================================================================
type WebviewInboundMessage = { type: string } & Record<string, unknown>;
type InboundHandler = (message: WebviewInboundMessage) => void;
const inboundHandlers: Record<string, InboundHandler> = {
    'portfolioData': (message: WebviewInboundMessage) => {
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
    },
    'barDetail': (message: WebviewInboundMessage) => {
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
      // Phase 7 — Score decay info
      state.decayInfo = ((message as Record<string, unknown>).decayInfo as typeof state.decayInfo) || null;

      state.isLoading = false;
      state.errorMessage = '';
      state.view = 'bar-detail';
      render();
    },
    'activeReview': (message: WebviewInboundMessage) => {
      const reviewBarPath = (message as Record<string, unknown>).barPath as string;
      const review = (message as Record<string, unknown>).review as ActiveReviewInfo | null;
      if (state.currentBar?.path === reviewBarPath) {
        state.activeReview = review;
      }
    },
    'agentStatusUpdate': (message: WebviewInboundMessage) => {
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
    },
    'topFindingsProgress': (message: WebviewInboundMessage) => {
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
    },
    'topFindingsSummary': (message: WebviewInboundMessage) => {
      const tsBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path === tsBarPath) {
        state.topFindingsLoading = false;
        state.topFindingsSummary = (message as Record<string, unknown>).summary as typeof state.topFindingsSummary;
        state.topFindingsExpanded = true;
        render();
      }
    },
    'threatModelProgress': (message: WebviewInboundMessage) => {
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
    },
    'threatModelGenerated': (message: WebviewInboundMessage) => {
      state.threatModel = message.result as ThreatModelResult;
      state.threatModelGenerating = false;
      state.threatModelProgress = '';
      state.threatModelProgressPct = 0;
      // Keep security pillar open to show results
      state.activePillar = 'security';
      render();
    },
    'threatModelFailed': (_message: WebviewInboundMessage) => {
      state.threatModelGenerating = false;
      state.threatModelProgress = '';
      state.threatModelProgressPct = 0;
      state.activePillar = 'security';
      render();
    },
    'threatModelExported': (_message: WebviewInboundMessage) => {
      // File saved — no special UI update needed
    },
    'adrList': (message: WebviewInboundMessage) => {
      state.adrs = (message.adrs || []) as AdrRecord[];
      state.adrEditingId = null;
      state.adrForm = null;
      render();
    },
    'adrSaved': (_message: WebviewInboundMessage) => {
      // After save, refresh the ADR list — the extension sends a follow-up adrList
      state.adrEditingId = null;
      state.adrForm = null;
      // adrList message will follow from the extension
    },
    'adrDeleted': (message: WebviewInboundMessage) => {
      state.adrs = state.adrs.filter(a => a.id !== (message.adrId as string));
      render();
    },
    'appYamlUpdated': (_message: WebviewInboundMessage) => {
      state.appYamlEditing = false;
      state.appYamlForm = null;
      // barDetail reload will follow from the extension
    },
    'gitStatusUpdated': (message: WebviewInboundMessage) => {
      state.gitStatus = message.status as GitSyncStatus;
      render();
    },
    'syncProgress': (message: WebviewInboundMessage) => {
      state.syncing = true;
      state.syncProgress = message.step as string;
      // Incremental DOM update — avoid full re-render
      const syncLabel = document.querySelector('.sync-progress-label') as HTMLElement | null;
      if (syncLabel) {
        syncLabel.textContent = state.syncProgress;
      } else {
        render();
      }
    },
    'syncComplete': (_message: WebviewInboundMessage) => {
      state.syncing = false;
      state.syncProgress = '';
      // gitStatusUpdated will follow to clear badges
      render();
    },
    'syncError': (message: WebviewInboundMessage) => {
      state.syncing = false;
      state.syncProgress = '';
      state.errorMessage = message.message as string;
      render();
    },
    'pushComplete': (_message: WebviewInboundMessage) => {
      state.syncing = false;
      state.syncProgress = '';
      // gitStatusUpdated will follow to refresh banner
      render();
    },
    'pushError': (message: WebviewInboundMessage) => {
      state.syncing = false;
      state.syncProgress = '';
      state.errorMessage = message.message as string;
      render();
    },
    'pullComplete': (_message: WebviewInboundMessage) => {
      state.syncing = false;
      state.syncProgress = '';
      // portfolioData + barDetail + gitStatusUpdated will follow to refresh everything
      render();
    },
    'pullError': (message: WebviewInboundMessage) => {
      state.syncing = false;
      state.syncProgress = '';
      state.errorMessage = message.message as string;
      render();
    },
    'policiesLoaded': (message: WebviewInboundMessage) => {
      state.policies = (message.policies || []) as PolicyFile[];
      state.nistControls = (message.nistControls || []) as NistControl[];
      render();
    },
    'policySaved': (_message: WebviewInboundMessage) => {
      // Policies will be reloaded via policiesLoaded message
    },
    'policyBaselineProgress': (message: WebviewInboundMessage) => {
      const pFilename = message.filename as string;
      if (state.policyGenerating === pFilename) {
        state.policyGenerateStep = message.step as string;
        state.policyGenerateProgress = message.progress as number;
        render();
      }
    },
    'policyBaselineGenerated': (_message: WebviewInboundMessage) => {
      state.policyGenerating = null;
      state.policyGenerateStep = '';
      state.policyGenerateProgress = 0;
      render();
    },
    'nistControlDetail': (message: WebviewInboundMessage) => {
      const control = message.control as NistControl | null;
      if (control) {
        state.nistControlPopup = control;
        render();
      }
    },
    'meshInitialized': (_message: WebviewInboundMessage) => {
      state.pickedFolderPath = '';
      state.isLoading = false;
      state.errorMessage = '';
      // Portfolio data will follow from loadPortfolio()
    },
    'initProgress': (message: WebviewInboundMessage) => {
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
    },
    'platformAdded': (_message: WebviewInboundMessage) => {
      state.isLoading = false;
      state.errorMessage = '';
      state.view = 'portfolio';
      // Portfolio data will be refreshed by the extension
    },
    'barScaffolded': (_message: WebviewInboundMessage) => {
      state.isLoading = false;
      state.errorMessage = '';
      state.view = 'portfolio';
      // Portfolio data will be refreshed by the extension
    },
    'folderPicked': (message: WebviewInboundMessage) => {
      state.pickedFolderPath = message.path as string;
      const pickedPathEl = document.getElementById('picked-path');
      if (pickedPathEl) {
        pickedPathEl.textContent = state.pickedFolderPath;
      }
    },
    'loading': (message: WebviewInboundMessage) => {
      state.isLoading = message.active as boolean;
      if (message.message) {
        state.loadingMessage = message.message as string;
      }
      // If we already have portfolio data, just toggle the refresh button
      if (state.portfolio && state.view === 'portfolio') {
        const btn = document.getElementById('btn-refresh') as HTMLButtonElement | null;
        if (btn) { btn.disabled = message.active as boolean; }
      } else if (!state.portfolio && state.view !== 'init-mesh' && state.view !== 'no-mesh') {
        render();
      }
    },
    'capabilityModelSwitched': (_message: WebviewInboundMessage) => {
      // Model was switched — portfolio data refresh will follow
      state.capabilityDrillPath = [];
    },
    'error': (message: WebviewInboundMessage) => {
      state.errorMessage = message.message as string;
      state.isLoading = false;
      // If repo picker modal is open and loading, show error there
      if (state.repoPickerModal && state.repoPickerModal.loading) {
        state.repoPickerModal.loading = false;
        state.repoPickerModal.error = message.message as string;
      }
      render();
    },
    'orgScanProgress': (message: WebviewInboundMessage) => {
      state.orgScanProgress = message.progress as number;
      state.orgScanStep = message.step as string;
      if (state.view === 'org-scanner') {
        render();
      }
    },
    'orgScanResults': (message: WebviewInboundMessage) => {
      state.orgScanRecommendation = message.recommendation as OrgScanRecommendation;
      state.orgScanProgress = 0;
      state.orgScanStep = '';
      state.errorMessage = '';
      render();
    },
    'orgScanApplied': (_message: WebviewInboundMessage) => {
      state.orgScanRecommendation = null;
      state.orgScanProgress = 0;
      state.view = 'portfolio';
      state.errorMessage = '';
      // Portfolio data will be refreshed by the extension
    },
    'orgReposLoaded': (message: WebviewInboundMessage) => {
      if (state.repoPickerModal) {
        state.repoPickerModal.repos = message.repos as OrgRepo[];
        state.repoPickerModal.loading = false;
        state.repoPickerModal.error = '';
        render();
      }
    },
    'reposAddedToBar': (_message: WebviewInboundMessage) => {
      // BAR detail refresh follows from onDrillIntoBar
    },
    'samplePlatformCreated': (_message: WebviewInboundMessage) => {
      // Portfolio data will be refreshed by the extension's loadPortfolio()
    },
    'githubDefaults': (message: WebviewInboundMessage) => {
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
    },
    'noMeshConfigured': (_message: WebviewInboundMessage) => {
      state.view = 'no-mesh';
      state.portfolio = null;
      state.isLoading = false;
      render();
    },
    'availableModels': (message: WebviewInboundMessage) => {
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
    },
    'calmComponents': (message: WebviewInboundMessage) => {
      const components = (message as Record<string, unknown>).components as { id: string; name: string; type: string; description: string; suggestedRepo: string }[];
      state.componentPicker = {
        barPath: state.currentBar?.path || '',
        components: components || [],
        selectedId: components?.[0]?.id || '',
        repoName: components?.[0]?.suggestedRepo || '',
      };
      render();
    },
    'calmDataUpdated': (message: WebviewInboundMessage) => {
      // External file change — replace in-memory CALM data and update the diagram
      const updatedCalm = (message as Record<string, unknown>).calmData;
      if (updatedCalm) {
        state.calmData = updatedCalm as CalmDataPayload;
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
    },
    'calmValidationErrors': (message: WebviewInboundMessage) => {
      // Validation errors from the extension host — log for now
      const errors = (message as Record<string, unknown>).errors;
      if (Array.isArray(errors) && errors.length > 0) {
        console.warn('CALM validation:', errors);
      }
    },
    'absolemChunk': (message: WebviewInboundMessage) => {
      const acBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path !== acBarPath) { return; }

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
    },
    'absolemPatches': (message: WebviewInboundMessage) => {
      const apBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path !== apBarPath) { return; }

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
    },
    'absolemPatchesApplied': (message: WebviewInboundMessage) => {
      const ppBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path !== ppBarPath) { return; }

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
    },
    'absolemError': (message: WebviewInboundMessage) => {
      const aeBarPath = (message as Record<string, unknown>).barPath as string;
      if (state.currentBar?.path !== aeBarPath) { return; }

      state.absolemStatus = 'idle';
      state.absolemStreaming = '';
      state.absolemMessages.push({
        role: 'assistant',
        content: `Error: ${(message as Record<string, unknown>).message as string}`,
      });
      render();
    },
    'meshRepoDetected': (message: WebviewInboundMessage) => {
        state.meshOwner = message.owner as string;
        state.meshRepo = message.repo as string;
        if (state.view === 'portfolio' || state.view === 'settings') { render(); }
        return;

      // Settings messages
    },
    'workflowStatus': (message: WebviewInboundMessage) => {
      state.settingsWorkflowExists = message.exists as boolean;
      if (state.view === 'settings') { render(); }
    },
    'workflowProvisioned': (_message: WebviewInboundMessage) => {
      state.settingsWorkflowExists = true;
      if (state.view === 'settings') { render(); }
    },
    'agenticStatus': (message: WebviewInboundMessage) => {
      state.settingsAgenticSkills = (message.skills ?? []) as { name: string; family: string; deployed: boolean }[];
      state.settingsAgenticAgents = (message.agents ?? []) as { name: string; deployed: boolean }[];
      if (state.view === 'settings') { render(); }
    },
    'copilotEnvStatus': (message: WebviewInboundMessage) => {
      if (message.error) {
        state.settingsCopilotEnv = null;
        state.settingsCopilotEnvError = message.error as string;
      } else {
        state.settingsCopilotEnv = message.status as typeof state.settingsCopilotEnv;
        state.settingsCopilotEnvError = null;
      }
      if (state.view === 'settings') { render(); }
    },
    // Bug DD cleanup — agenticProvisioned handler removed. The extension
    // no longer sends this message (provisionAgentic was deleted). The
    // workflowProvisioned handler above is the only redeploy success
    // signal now.
    'preferredModelSaved': (message: WebviewInboundMessage) => {
      state.settingsPreferredModel = message.family as string;
      if (state.view === 'settings') { render(); }
    },
    'driftWeightsLoaded': (message: WebviewInboundMessage) => {
      state.settingsDriftWeights = message.weights as typeof state.settingsDriftWeights;
      if (state.view === 'settings') { render(); }
    },
    'driftWeightsSaved': (_message: WebviewInboundMessage) => {
        if (state.view === 'settings') { render(); }
        return;

      // Phase 5 — Orchestration + Platform Governance
    },
    'orchestrationPolicyLoaded': (message: WebviewInboundMessage) => {
      state.orchPolicy = (message as unknown as { policy: typeof state.orchPolicy }).policy;
      if (state.view === 'settings') { render(); }
    },
    'orchestrationPolicySaved': (_message: WebviewInboundMessage) => {
      if (state.view === 'settings') { render(); }
    },
    'agentTypeLoaded': (message: WebviewInboundMessage) => {
      state.agentType = (message as unknown as { agentType: 'claude' | 'copilot' | 'both' }).agentType;
      if (state.view === 'settings') { render(); }
    },
    'agentTypeSaved': (_message: WebviewInboundMessage) => {
      if (state.view === 'settings') { render(); }
    },
    'researchSettings': (message: WebviewInboundMessage) => {
      state.researchSettings = (message as unknown as { payload: typeof state.researchSettings }).payload;
      state.researchSecretStatus = {};
      if (state.view === 'settings') { render(); }
    },
    'researchSecretSaved': (message: WebviewInboundMessage) => {
      const msg = message as unknown as { id: 'anthropic' | 'openai' | 'tavily'; hasValue: boolean };
      if (state.researchSettings) {
        const s = state.researchSettings.secrets.find(x => x.id === msg.id);
        if (s) { s.hasVsCodeValue = msg.hasValue; }
      }
      state.researchSecretStatus[msg.id] = { kind: 'success', message: 'Saved.' };
      if (state.view === 'settings') { render(); }
      window.setTimeout(() => {
        delete state.researchSecretStatus[msg.id];
        if (state.view === 'settings') { render(); }
      }, 4000);
    },
    'researchTestResult': (message: WebviewInboundMessage) => {
      const msg = message as unknown as { id: 'anthropic' | 'openai' | 'tavily'; ok: boolean; message: string };
      state.researchSecretStatus[msg.id] = { kind: msg.ok ? 'success' : 'error', message: msg.message };
      if (state.view === 'settings') { render(); }
      window.setTimeout(() => {
        delete state.researchSecretStatus[msg.id];
        if (state.view === 'settings') { render(); }
      }, 6000);
    },
    'researchSecretPushed': (message: WebviewInboundMessage) => {
      const msg = message as unknown as { id: ResearchSecretId; ok: boolean; message: string };
      if (msg.ok && state.researchSettings) {
        const s = state.researchSettings.secrets.find(x => x.id === msg.id);
        if (s && s.hasGitHubSecret !== null) { s.hasGitHubSecret = true; }
      }
      state.researchSecretStatus[msg.id] = { kind: msg.ok ? 'success' : 'error', message: msg.message };
      if (state.view === 'settings') { render(); }
      window.setTimeout(() => {
        delete state.researchSecretStatus[msg.id];
        if (state.view === 'settings') { render(); }
      }, 6000);
    },
    'researchSecretPushedAll': (message: WebviewInboundMessage) => {
      const msg = message as unknown as { id: ResearchSecretId; results: Array<{ repo: string; ok: boolean; message: string }>; message: string };
      const allOk = msg.results.length > 0 && msg.results.every(r => r.ok);
      if (allOk && state.researchSettings) {
        const s = state.researchSettings.secrets.find(x => x.id === msg.id);
        if (s && s.hasGitHubSecret !== null) { s.hasGitHubSecret = true; }
      }
      const detail = msg.results
        .map(r => `${r.ok ? '✓' : '✗'} ${r.repo}${r.ok ? '' : ` — ${r.message}`}`)
        .join('\n');
      state.researchSecretStatus[msg.id] = {
        kind: allOk ? 'success' : 'error',
        message: `${msg.message}\n${detail}`,
      };
      if (state.view === 'settings') { render(); }
      window.setTimeout(() => {
        delete state.researchSecretStatus[msg.id];
        if (state.view === 'settings') { render(); }
      }, 12_000);
    },
    'researchPrefsSaved': (_message: WebviewInboundMessage) => {
      // Tiny UX nudge — re-fetch settings to confirm persisted shape
      vscode.postMessage({ type: 'loadResearchSettings' });
    },
    'platformGovernanceLoaded': (message: WebviewInboundMessage) => {
      const pgMsg = message as unknown as { platformId: string; governance: typeof state.platGov };
      if (state.platGovEditing === pgMsg.platformId) {
        state.platGov = pgMsg.governance;
        render();
      }
    },
    'platformGovernanceSaved': (message: WebviewInboundMessage) => {
      const psMsg = message as unknown as { platformId: string };
      if (state.platGovEditing === psMsg.platformId) {
        state.platGovEditing = null;
        state.platGov = null;
      }
      render();
    },
    'barGovernanceContext': (message: WebviewInboundMessage) => {
      const bgMsg = message as unknown as { barPath: string; linkedBars: typeof state.barLinkedBars; siblingBars: typeof state.barSiblingBars; platformOverrides: string[] };
      state.barLinkedBars = bgMsg.linkedBars;
      state.barSiblingBars = bgMsg.siblingBars;
      state.barPlatformOverrides = bgMsg.platformOverrides;
      if (state.view === 'bar-detail') { render(); }
    },
    'meshReinitialized': (_message: WebviewInboundMessage) => {
        state.view = 'portfolio';
        render();
        return;

      // Phase 4 — Platform architecture
    },
    'platformArchData': (message: WebviewInboundMessage) => {
      const platformId = message.platformId as string;
      if (state.currentPlatformId === platformId) {
        state.platformCalmData = message.calmData as CalmDataPayload;
        render();
      }
    },
    'okrList': (message: WebviewInboundMessage) => {
      state.okrs = (message.okrs ?? []) as OkrListItem[];
      state.okrsLoading = false;
      // Reaching the list view means we're done with any edit/create session.
      state.currentOkrMode = 'view';
      render();
    },
    'okrDetail': (message: WebviewInboundMessage) => {
      // Task #54 flicker fix: distinguish FIRST view of an OKR (cold
      // start — show "Loading…" placeholder) from a REFRESH of the OKR
      // we're already showing (preserve previously-known signal data,
      // mark phases as `refreshing` so the card header pulses but the
      // metrics stay readable). Without this, every panelActivated /
      // pull / post-audit poll wiped state.okrPhaseSignals → renderer
      // showed "Loading…" → live fetch arrived a half-second later →
      // metrics snapped back. That's the strange-flicker the user saw.
      const incomingOkr = message.okr as OkrCard;
      const isRefreshOfSameOkr =
        state.currentOkr && state.currentOkr.meta.id === incomingOkr.meta.id;

      state.currentOkr = incomingOkr;
      state.currentOkrAffectedBars = (message.affectedBars ?? []) as OkrAffectedBar[];
      state.currentOkrMode = ((message as { mode?: OkrDetailMode }).mode ?? 'view') as OkrDetailMode;
      state.currentOkrAvailablePlatforms = ((message as { availablePlatforms?: OkrAvailablePlatform[] }).availablePlatforms ?? []) as OkrAvailablePlatform[];
      state.currentOkrAvailableBars = ((message as { availableBars?: OkrAvailableBar[] }).availableBars ?? []) as OkrAvailableBar[];
      state.view = 'okr-detail';
      // View-mode only — edit/create don't display the rich cards.
      if (state.currentOkrMode === 'view' && state.currentOkr) {
        if (isRefreshOfSameOkr && state.okrPhaseSignals) {
          // REFRESH path: keep last-known data, just flag in-flight so
          // the polling-indicator dot pulses. When new data lands, the
          // okrPhaseSignals handler below replaces these entries.
          const prev = state.okrPhaseSignals;
          state.okrPhaseSignals = {
            why: prev.why ? { ...prev.why, refreshing: true } : { loading: true },
            how: prev.how ? { ...prev.how, refreshing: true } : { loading: true },
            what: prev.what ? { ...prev.what, refreshing: true } : { loading: true },
          };
        } else {
          // COLD START path: no previous data — show "Loading…" placeholder.
          state.okrPhaseSignals = {
            why: { loading: true },
            how: { loading: true },
            what: { loading: true },
          };
        }
        vscode.postMessage({ type: 'loadOkrPhaseSignals', okrId: state.currentOkr.meta.id });
        // D-PR4 sub-PR 4 — kick off fan-out pre-flight if WHAT has completed.
        // The handler on the extension side returns setupError 'what-not-complete'
        // for WHAT-incomplete OKRs, but we save the round-trip by checking
        // the action list locally first. Re-dispatched on every refresh
        // so the pane reflects the latest probe state (PR merges land
        // upstream rows; users connect repos between checks).
        const whatComplete = incomingOkr.actions.some(a => a.phase === 'what' && a.status === 'complete');
        if (whatComplete) {
          state.fanOutPreflight = { loading: true };
          vscode.postMessage({ type: 'fanOutPreflight', okrId: state.currentOkr.meta.id });
        } else {
          state.fanOutPreflight = undefined;
        }
      } else {
        state.okrPhaseSignals = undefined;
        state.fanOutPreflight = undefined;
      }
      render();
    },
    'fanOutPreflightResult': (message: WebviewInboundMessage) => {
      // D-PR4 sub-PR 4 — payload from onFanOutPreflight: { okrId, ok,
      // report?, setupError?, skippedRepos? }. The extension casts the
      // typed report to unknown when posting; we cast back to the
      // webview's local FanOutPreflightReportUi type (kept narrow per
      // services/coordination/* wire-shape contract).
      const msg = message as unknown as {
        okrId: string;
        ok: boolean;
        report?: FanOutPreflightReportUi;
        setupError?: string;
        skippedRepos?: Array<{ slug: string; status: 'not-connected' | 'unreachable' }>;
      };
      if (!state.currentOkr || state.currentOkr.meta.id !== msg.okrId) {
        return; // user navigated away; drop stale result
      }
      state.fanOutPreflight = msg.ok
        ? { report: msg.report, skippedRepos: msg.skippedRepos }
        : { setupError: msg.setupError ?? 'unknown-error', skippedRepos: msg.skippedRepos };
      render();
    },
    'okrPhaseSignals': (message: WebviewInboundMessage) => {
      // Payload shape: { okrId, signals: { why?, how?, what? } }. Each
      // phase signal is the populated OkrPhaseSignal shape from the
      // backend GitHub-API fetch. Task #54: signals arriving via this
      // message implicitly clear `refreshing` because the backend
      // doesn't set the field — replacing the entry drops the flag.
      const msg = message as unknown as { okrId: string; signals: OkrPhaseSignals };
      if (state.currentOkr && state.currentOkr.meta.id === msg.okrId) {
        state.okrPhaseSignals = msg.signals;
        render();
      }
    },
    'panelActivated': (_message: WebviewInboundMessage) => {
      // Panel regained focus (e.g. user came back from working in
      // another tab while a workflow pushed a finalize commit). The
      // extension has already refreshed git status. If we're on the
      // OKR detail page, also re-fetch the OKR + phase signals so the
      // status badge, Cancel-Run visibility, and phase cards reflect
      // whatever landed on remote since we last looked.
      if (state.view === 'okr-detail' && state.currentOkr) {
        vscode.postMessage({ type: 'drillIntoOkr', okrId: state.currentOkr.meta.id });
      }
    },
    'okrSaved': (_message: WebviewInboundMessage) => {
      // No-op visually — the server follows up with okrDetail (view mode) which
      // triggers a re-render. We swallow these here so the discriminated-union
      // dispatch doesn't fall through to the default error case.
    },
    'okrCreated': (_message: WebviewInboundMessage) => {
      // No-op visually — the server follows up with okrDetail (view mode) which
      // triggers a re-render. We swallow these here so the discriminated-union
      // dispatch doesn't fall through to the default error case.
    },
    'startPhasePreview': (message: WebviewInboundMessage) => {
      state.startPhaseModalOpen = true;
      state.startPhaseModalData = {
        okrId: message.okrId as string,
        phase: message.phase as 'why' | 'how' | 'what',
        agent: message.agent as string,
        issueLabel: message.issueLabel as string,
        body: message.body as string,
      };
      render();
    },
    'hatterTagSheet': (message: WebviewInboundMessage) => {
      state.hatterTagSheetOpen = true;
      state.hatterTagSheetData = {
        okrId: message.okrId as string,
        actionId: message.actionId as string,
        tag: (message.tag as Record<string, unknown> | null) ?? null,
        reason: message.reason as string | undefined,
      };
      render();
    },
    'chainVerifySheet': (message: WebviewInboundMessage) => {
      state.chainVerifySheetOpen = true;
      // Verdict shape is the ChainVerifyVerdict from chainVerify.ts —
      // typed identically on state.chainVerifySheetData. Backend sends
      // either a structured verdict or null + a reason string.
      const verdict = message.verdict as NonNullable<typeof state.chainVerifySheetData>['verdict'];
      state.chainVerifySheetData = {
        okrId: message.okrId as string,
        actionId: message.actionId as string,
        runId: (message.runId as string) ?? '',
        verdict: verdict ?? null,
        reason: message.reason as string | undefined,
      };
      render();
    },
    'okrSampleScaffolded': (_message: WebviewInboundMessage) => {
      // Server posts okrList right after; just route to OKR list view so user sees it
      state.view = 'portfolio';
      state.activeLens = 'okrs';
      render();
    },
};

window.addEventListener('message', (event) => {
  if (event.origin !== window.origin) { return; }
  const message = event.data;
  const handler = inboundHandlers[message?.type];
  if (handler) { handler(message); }
});

// ============================================================================
// Initialize
// ============================================================================

vscode.postMessage({ type: 'ready' });
render();
