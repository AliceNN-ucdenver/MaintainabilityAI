// Looking Glass webview frontend — renders Governance Mesh dashboard
// Vanilla TypeScript, IIFE pattern for browser context inside VS Code

import mermaid from 'mermaid';
import { renderArchitectureDetail, attachArchitectureEvents, getArchitectureStyles } from './pillars/architecturePillar';
import type { AdrRecord, CalmDataPayload } from './pillars/architecturePillar';
import { mountDiagramCanvas, unmountDiagramCanvas, updateDiagramCanvasProps, isDiagramCanvasMounted } from './reactflow/ReactBridge';
import type { CalmArchitecture } from './reactflow/CalmAdapter';
import type { DiagramLayout } from './reactflow/LayoutTypes';
import { renderSecurityDetail, attachSecurityEvents } from './pillars/securityPillar';
import { renderInfoRiskDetail, attachInfoRiskEvents } from './pillars/infoRiskPillar';
import { renderOperationsDetail, attachOperationsEvents } from './pillars/operationsPillar';
import { getSecurityStyles } from './pillars/securityPillar';
import { getInfoRiskStyles } from './pillars/infoRiskPillar';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true },
  c4: { useMaxWidth: true },
  architecture: { useMaxWidth: true },
});

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

// ============================================================================
// Types (mirrored from extension types — cannot import in browser context)
// ============================================================================

type Criticality = 'critical' | 'high' | 'medium' | 'low';
type LifecycleStage = 'build' | 'run' | 'sunset' | 'decommission';
type PillarStatus = 'passing' | 'warning' | 'failing' | 'unknown';
type RationalizationStrategy = 'reassess' | 'extract' | 'advance' | 'prune';
type ViewName = 'no-mesh' | 'portfolio' | 'bar-detail' | 'init-mesh' | 'add-platform' | 'create-bar' | 'org-scanner' | 'settings';

interface PortfolioConfig {
  id: string;
  name: string;
  org: string;
  owner: string;
  description: string;
}

interface PillarArtifact {
  label: string;
  path: string;
  present: boolean;
  nonEmpty: boolean;
}

interface GovernancePillarScore {
  pillar: string;
  score: number;
  status: PillarStatus;
  artifacts: PillarArtifact[];
}

interface GovernanceDecision {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  owner: string;
}

interface PillarFindingCounts {
  findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface ReviewRecord {
  issueUrl: string;
  issueNumber: number;
  date: string;
  agent: 'claude' | 'copilot' | 'manual';
  pillars: Record<string, PillarFindingCounts>;
  driftScore: number;
}

interface ActiveReviewInfo {
  issueNumber: number;
  issueUrl: string;
  title: string;
  agent: 'claude' | 'copilot' | 'unknown';
  pr?: { number: number; url: string; title: string; draft: boolean };
}

interface BarSummary {
  id: string;
  name: string;
  platformId: string;
  platformName: string;
  criticality: Criticality;
  lifecycle: LifecycleStage;
  strategy: RationalizationStrategy;
  architecture: GovernancePillarScore;
  security: GovernancePillarScore;
  infoRisk: GovernancePillarScore;
  operations: GovernancePillarScore;
  compositeScore: number;
  pendingDecisions: number;
  repos: string[];
  repoCount: number;
  path: string;
  reviews?: ReviewRecord[];
  latestDriftScore?: number;
}

interface PlatformSummary {
  id: string;
  name: string;
  barCount: number;
  compositeHealth: number;
  bars: BarSummary[];
}

interface PortfolioSummary {
  portfolio: PortfolioConfig;
  totalBars: number;
  portfolioHealth: number;
  pendingDecisions: number;
  governanceCoverage: number;
  platforms: PlatformSummary[];
  allBars: BarSummary[];
}

interface ThreatEntry {
  id: string;
  category: string;
  target: string;
  targetName: string;
  dataClassification: string;
  description: string;
  attackVector: string;
  impact: string;
  likelihood: string;
  existingControls: string[];
  controlEffectiveness: string;
  residualRisk: string;
  recommendedMitigations: string[];
  nistReferences: string[];
}

interface ThreatModelResult {
  threats: ThreatEntry[];
  summary: {
    totalThreats: number;
    byCategory: Record<string, number>;
    byRisk: Record<string, number>;
    unmitigatedCount: number;
  };
  mermaidDiagram: string;
}

// Capability model types (mirrors types/index.ts)
type CapabilityModelType = 'insurance' | 'banking' | 'custom';
type EaLens = 'business' | 'application' | 'policies' | 'data' | 'technology' | 'integration';
interface CapabilityNode {
  key: string; level: 'L1' | 'L2' | 'L3'; name: string; description: string;
  childCount: number; barCount: number; childKeys: string[]; parentKey: string | null;
}
interface CapabilityModelSummary {
  modelName: string; modelType: CapabilityModelType;
  l1Capabilities: CapabilityNode[];
  allNodes: Record<string, CapabilityNode>;
  capabilityToBarMap: Record<string, string[]>;
}

// Policy types (mirrors types/index.ts)
interface PolicyFile {
  filename: string;
  label: string;
  pillar: 'architecture' | 'security' | 'risk' | 'operations' | 'nist';
  content: string;
}

interface NistControl {
  id: string;
  name: string;
  family: string;
  familyId: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// Git sync types (mirrors types/index.ts)
type GitFileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
interface PillarGitStatus { isDirty: boolean; dirtyFileCount: number; dirtyFiles: string[]; }
interface BarGitStatus {
  isDirty: boolean; dirtyFileCount: number;
  pillarStatus: { architecture: PillarGitStatus; security: PillarGitStatus; infoRisk: PillarGitStatus; operations: PillarGitStatus };
}
interface GitSyncStatus {
  isGitRepo: boolean; hasRemote: boolean; hasUpstream: boolean; ahead: number; behind: number;
  dirtyFiles: Record<string, GitFileStatus>;
  barStatus: Record<string, BarGitStatus>;
}

interface OrgRepo {
  name: string;
  fullName: string;
  description: string;
  language: string | null;
  url: string;
  defaultBranch: string;
  updatedAt: string;
  topics: string[];
  readme: string;
  isArchived: boolean;
  isFork: boolean;
}

interface RecommendedBar {
  id: string;
  name: string;
  repos: OrgRepo[];
  criticality: Criticality;
  rationale: string;
}

interface RecommendedPlatform {
  id: string;
  name: string;
  abbreviation: string;
  bars: RecommendedBar[];
  rationale: string;
}

interface OrgScanRecommendation {
  platforms: RecommendedPlatform[];
  unassigned: OrgRepo[];
  updates?: ExistingBarUpdate[];
}

interface ExistingBarUpdate {
  barPath: string;
  barName: string;
  platformName: string;
  addRepos: string[];
  rationale: string;
}

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
  diagramFullscreenSrc: '',
  diagramFullscreenTitle: '',
  diagramFullscreenType: 'mermaid' as 'mermaid' | 'reactflow',
  policyGenerating: null as string | null,  // filename being generated
  policyGenerateStep: '',
  policyGenerateProgress: 0,
  // Repo picker modal state
  repoPickerModal: null as {
    mode: 'scan' | 'add-to-bar';
    barPath?: string;
    barName?: string;
    org: string;
    repos: OrgRepo[];
    selectedRepoNames: Set<string>;
    searchQuery: string;
    activeTab: 'browse' | 'urls';
    pastedUrls: string;
    loading: boolean;
    error: string;
  } | null,
  // Settings state
  settingsWorkflowExists: null as boolean | null,
  settingsIssueTemplate: '',
  settingsIssueTemplateExists: false,
  settingsIssueTemplateEditing: false,
  settingsPreferredModel: '',
  settingsDriftWeights: { critical: 15, high: 5, medium: 2, low: 1 } as { critical: number; high: number; medium: number; low: number },
  settingsReinitConfirmStep: 0,  // 0=default, 1=warning shown
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
        --bg: #0d1117;
        --surface: #161b22;
        --surface-raised: #1c2129;
        --border: #21262d;
        --border-light: #30363d;
        --text: #c9d1d9;
        --text-muted: #8b949e;
        --text-dim: #6e7681;
        --accent: #8862ff;
        --accent-hover: #c084fc;
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

      /* ---- Score Ring (SVG donut) ---- */
      .score-ring-container {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .score-ring-label {
        position: absolute;
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--text);
      }

      /* ---- BAR Detail ---- */
      .breadcrumb {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 12px;
      }
      .breadcrumb a { color: var(--accent); cursor: pointer; }
      .breadcrumb .sep { margin: 0 6px; color: var(--text-dim); }

      .bar-detail-header {
        display: flex;
        align-items: flex-start;
        gap: 20px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }
      .bar-detail-info { flex: 1; min-width: 200px; }
      .bar-detail-info h2 {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .bar-detail-info .bar-detail-id {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--accent);
        background: var(--accent-bg);
        padding: 2px 8px;
        border-radius: 10px;
        display: inline-block;
        margin-bottom: 8px;
      }
      .bar-detail-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .bar-detail-score {
        flex-shrink: 0;
      }

      .pending-warning {
        background: rgba(210, 153, 34, 0.1);
        border: 1px solid rgba(210, 153, 34, 0.3);
        border-radius: var(--radius-sm);
        padding: 10px 14px;
        margin-bottom: 16px;
        font-size: 12px;
        color: var(--warning);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* ---- Pillar Cards ---- */
      .pillar-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      .pillar-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px;
        cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .pillar-card:hover {
        border-color: var(--accent);
      }
      .pillar-card.active {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent);
      }
      .pillar-card-expand-hint {
        font-size: 10px;
        color: var(--text-dim);
        text-align: center;
        margin-top: 8px;
        transition: color 0.15s;
      }
      .pillar-card:hover .pillar-card-expand-hint { color: var(--accent); }
      .pillar-card.active .pillar-card-expand-hint { color: var(--accent); }

      .pillar-detail-panel {
        background: var(--surface);
        border: 1px solid var(--accent);
        border-radius: var(--radius);
        padding: 16px;
        margin-bottom: 20px;
        animation: slideDown 0.15s ease-out;
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .pillar-detail-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
      }
      .pillar-detail-header h3 {
        font-size: 14px;
        font-weight: 600;
        color: var(--accent);
      }
      .pillar-detail-close {
        background: none;
        border: none;
        color: var(--text-dim);
        font-size: 16px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .pillar-detail-close:hover { color: var(--text); background: var(--surface-raised); }
      .pillar-detail-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-bottom: 12px;
      }
      .pillar-detail-empty {
        padding: 24px 16px;
        text-align: center;
        color: var(--text-dim);
        font-size: 13px;
      }
      .pillar-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .pillar-card-header h3 {
        font-size: 14px;
        font-weight: 600;
      }
      .pillar-artifacts {
        margin-top: 10px;
      }
      .artifact-group {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
        font-size: 12px;
        border-bottom: 1px solid var(--border);
      }
      .artifact-group:last-child { border-bottom: none; }
      .artifact-group-icon {
        font-size: 14px;
        width: 18px;
        text-align: center;
        flex-shrink: 0;
      }
      .artifact-group-icon.all-present { color: var(--passing); }
      .artifact-group-icon.some-present { color: var(--warning); }
      .artifact-group-icon.none-present { color: var(--failing); }
      .artifact-group-label { color: var(--text); flex: 1; font-weight: 500; }
      .artifact-group-count {
        font-size: 11px;
        font-family: var(--font-mono);
        color: var(--text-muted);
      }

      /* ---- Repo Tree ---- */
      .repo-tree {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 14px 16px;
        font-family: var(--font-mono);
        font-size: 11px;
        line-height: 1.8;
        color: var(--text-muted);
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 20px;
      }
      .tree-entry {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 1px 4px;
        border-radius: 3px;
        cursor: pointer;
      }
      .tree-entry:hover {
        background: var(--surface-raised);
      }
      .tree-entry:hover .tree-entry-name { color: var(--accent); }
      .tree-entry-icon {
        font-size: 10px;
        width: 14px;
        text-align: center;
        flex-shrink: 0;
      }
      .tree-entry-name { transition: color 0.1s; }
      .tree-entry-name.folder { font-weight: 600; }
      .tree-entry-detail {
        color: var(--text-dim);
        font-size: 10px;
        margin-left: 4px;
      }

      /* ---- Decisions Table ---- */
      .decisions-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .decisions-table thead th {
        text-align: left;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 8px 10px;
        border-bottom: 1px solid var(--border);
      }
      .decisions-table tbody td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--border);
        font-size: 12px;
      }
      .decision-status {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 10px;
      }
      .decision-status.pending { background: rgba(210, 153, 34, 0.15); color: var(--warning); }
      .decision-status.approved { background: rgba(63, 185, 80, 0.15); color: var(--passing); }
      .decision-status.rejected { background: rgba(248, 81, 73, 0.15); color: var(--failing); }

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
        cursor: pointer;
        position: relative;
      }
      .diagram-container svg { max-width: 100%; height: auto; }
      .diagram-container:hover::after {
        content: 'Click to expand';
        position: absolute;
        bottom: 8px;
        right: 12px;
        font-size: 10px;
        color: var(--text-dim);
        background: var(--surface);
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid var(--border);
        pointer-events: none;
      }

      /* ---- Fullscreen Diagram Overlay ---- */
      .diagram-fullscreen-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 200;
        background: var(--bg);
        display: flex;
        flex-direction: column;
      }
      .diagram-fullscreen-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
      }
      .diagram-fullscreen-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
      .diagram-fullscreen-close {
        background: none;
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--text);
        font-size: 13px;
        padding: 4px 12px;
        cursor: pointer;
        font-family: inherit;
      }
      .diagram-fullscreen-close:hover {
        border-color: var(--accent);
        color: var(--accent);
      }
      .diagram-fullscreen-body {
        flex: 1;
        overflow: auto;
        padding: 24px;
      }
      .diagram-fullscreen-body svg {
        height: auto;
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

      /* ---- App.yaml Inline Editor ---- */
      .app-yaml-editor {
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
        padding: 16px; margin-bottom: 16px;
      }
      .app-yaml-editor-title {
        font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 12px;
        display: flex; align-items: center; justify-content: space-between;
      }
      .app-yaml-editor .form-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      }
      .app-yaml-editor .form-field { }
      .app-yaml-editor .form-field label {
        display: block; font-size: 11px; font-weight: 600; color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;
      }
      .app-yaml-editor .form-field input,
      .app-yaml-editor .form-field select {
        width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
        color: var(--text); font-size: 12px; padding: 6px 10px; font-family: inherit;
        outline: none; transition: border-color 0.15s;
      }
      .app-yaml-editor .form-field input:focus,
      .app-yaml-editor .form-field select:focus { border-color: var(--accent); }
      .app-yaml-editor .form-field-full { grid-column: 1 / -1; }
      .app-yaml-editor-actions {
        display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;
      }

      /* ---- Pillar Detail: Architecture (ADR + Diagrams) ---- */
      ${getArchitectureStyles()}

      /* ---- Pillar Detail: Security (Threat Model) ---- */
      ${getSecurityStyles()}

      /* ---- Pillar Detail: Info Risk ---- */
      ${getInfoRiskStyles()}

      /* ---- Active Review Banner ---- */
      .active-review-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid rgba(124, 58, 237, 0.3);
        border-left: 3px solid #7c3aed;
        background: rgba(124, 58, 237, 0.06);
        margin-bottom: 10px;
        font-size: 13px;
      }
      .review-pulse {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #7c3aed;
        flex-shrink: 0;
        animation: pulse-glow 2s ease-in-out infinite;
      }
      @keyframes pulse-glow {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
        50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0); }
      }
      .review-banner-text { font-size: 13px; }
      .review-banner-links { font-size: 12px; color: var(--vscode-descriptionForeground); margin-left: auto; }
      .active-review-link {
        color: var(--vscode-textLink-foreground);
        cursor: pointer;
        text-decoration: none;
        font-weight: 600;
      }
      .active-review-link:hover { text-decoration: underline; }
      .review-draft-badge {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        background: rgba(234, 179, 8, 0.15);
        color: #eab308;
        border: 1px solid rgba(234, 179, 8, 0.3);
        vertical-align: middle;
      }

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

      /* ---- Git Sync ---- */
      .pillar-sync-badge {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        background: rgba(210, 153, 34, 0.15);
        color: var(--warning);
        border: 1px solid rgba(210, 153, 34, 0.3);
        margin-left: 6px;
        vertical-align: middle;
      }
      .sync-dot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        font-size: 10px;
        font-weight: 700;
      }
      .sync-dot.synced { color: var(--passing); font-size: 12px; background: none; }
      .sync-dot.out-of-sync { background: rgba(210, 153, 34, 0.15); color: var(--warning); }
      .sync-dot.no-git { color: var(--text-dim); font-size: 14px; background: none; }
      .sync-progress-label { font-size: 11px; color: var(--text-muted); font-style: italic; }

      /* ---- Git Sync Banner ---- */
      .git-sync-banner {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 14px; border-radius: var(--radius); margin-bottom: 12px;
        font-size: 12px;
      }
      .git-sync-banner.needs-push {
        background: rgba(210, 153, 34, 0.1); border: 1px solid rgba(210, 153, 34, 0.3); color: var(--warning);
      }
      .git-sync-banner.needs-pull {
        background: rgba(75, 156, 211, 0.1); border: 1px solid rgba(75, 156, 211, 0.3); color: var(--accent);
      }
      .git-sync-icon { font-size: 16px; font-weight: 700; }
      .git-sync-banner .btn-sm { padding: 3px 10px; font-size: 11px; margin-left: auto; }

      /* ---- EA Lens Tabs ---- */
      .ea-lens-tabs { display: flex; gap: 0; margin-bottom: 20px; border-bottom: 2px solid var(--border); }
      .ea-lens-tab {
        padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer;
        border: none; background: none; color: var(--text-muted);
        border-bottom: 3px solid transparent; margin-bottom: -2px;
        display: flex; align-items: center; gap: 6px; transition: all 0.15s;
      }
      .ea-lens-tab:hover:not(.disabled) { color: var(--text); }
      .ea-lens-tab.active { border-bottom-color: var(--accent); color: var(--text); }
      .ea-lens-tab.disabled { opacity: 0.4; cursor: not-allowed; }
      .ea-lens-tab .lens-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
      .ea-lens-tab .coming-soon { font-size: 9px; color: var(--text-dim); font-style: italic; }
      .lens-dot.business { background: #58a6ff; }
      .lens-dot.application { background: #d29922; }
      .lens-dot.policies { background: #bc8cff; }
      .lens-dot.data { background: #3fb950; }
      .lens-dot.technology { background: #f85149; }
      .lens-dot.integration { background: #bc8cff; }

      /* ---- Policy Cards ---- */
      .policy-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px; }
      .policy-card {
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
        padding: 12px 14px; cursor: pointer; transition: border-color 0.15s;
      }
      .policy-card:hover { border-color: var(--accent); }
      .policy-card.active { border-color: var(--accent); background: var(--accent-bg); }
      .policy-card-name { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
      .policy-card-pillar { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
      .policy-card-file { font-size: 10px; color: var(--text-dim); font-family: var(--font-mono); margin-top: 4px; }
      .policy-card { position: relative; }
      .policy-card-actions {
        display: none; position: absolute; bottom: 8px; right: 8px;
        gap: 4px; align-items: center;
      }
      .policy-card:hover .policy-card-actions { display: flex; }
      .policy-action-btn {
        font-size: 10px; padding: 3px 8px; border-radius: 4px;
        border: none; cursor: pointer; font-weight: 600; letter-spacing: 0.2px;
      }
      .policy-action-btn:hover { opacity: 0.85; }
      .policy-edit-btn { background: var(--accent); color: #fff; }
      .policy-reset-btn { background: var(--surface); color: var(--text); border: 1px solid var(--border) !important; }
      .policy-reset-btn:hover { border-color: var(--accent) !important; color: var(--accent); }
      .policy-card.generating { opacity: 0.85; }
      .policy-card.generating .policy-card-actions { display: none !important; }
      .policy-card-progress {
        margin-top: 8px; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden;
      }
      .policy-card-progress-bar {
        height: 100%; background: var(--accent); border-radius: 2px;
        transition: width 0.3s ease;
      }
      .policy-card-status {
        font-size: 10px; color: var(--text-muted); margin-top: 4px;
      }

      /* ---- Policy Detail ---- */
      .policy-detail-header {
        display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;
      }
      .policy-detail-title { font-size: 15px; font-weight: 600; color: var(--text); }
      .policy-detail-pillar {
        font-size: 10px; font-weight: 600; color: var(--accent);
        background: var(--accent-bg); padding: 2px 8px; border-radius: 10px;
        border: 1px solid rgba(136, 98, 255, 0.25);
      }
      .policy-content-pre {
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
        padding: 16px; font-family: var(--font-mono); font-size: 12px; line-height: 1.6;
        overflow-x: auto; white-space: pre-wrap; word-break: break-word; color: var(--text-muted);
      }

      /* ---- Policy Editor ---- */
      .policy-editor textarea {
        width: 100%; min-height: 350px; font-family: var(--font-mono); font-size: 12px;
        background: var(--surface); color: var(--text); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 12px; line-height: 1.6; resize: vertical;
        outline: none; transition: border-color 0.15s;
      }
      .policy-editor textarea:focus { border-color: var(--accent); }
      .policy-editor-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }

      /* ---- NIST Controls Table ---- */
      .nist-search-bar { position: relative; margin-bottom: 12px; }
      .nist-search-bar .search-input {
        width: 100%; max-width: 400px;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
        color: var(--text); font-size: 12px; padding: 6px 10px; outline: none; transition: border-color 0.15s;
      }
      .nist-search-bar .search-input:focus { border-color: var(--accent); }
      .nist-search-bar .search-input::placeholder { color: var(--text-dim); }
      .nist-search-clear {
        position: absolute; top: 50%; transform: translateY(-50%); right: calc(100% - 400px + 8px);
        background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 16px;
      }
      .nist-family-header {
        font-weight: 600; font-size: 12px; padding: 8px 0 4px; color: var(--accent);
        border-bottom: 1px solid var(--border); margin-top: 12px;
      }
      .nist-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .nist-table th { text-align: left; padding: 6px 8px; font-size: 11px; border-bottom: 1px solid var(--border); color: var(--text-dim); font-weight: 600; }
      .nist-table td { padding: 6px 8px; font-size: 12px; border-bottom: 1px solid var(--border); overflow: hidden; text-overflow: ellipsis; }
      .nist-table th:nth-child(1), .nist-table td:nth-child(1) { width: 70px; }
      .nist-table th:nth-child(2), .nist-table td:nth-child(2) { width: 180px; }
      .nist-table th:nth-child(3), .nist-table td:nth-child(3) { width: 70px; }
      .nist-priority-high { color: var(--failing); font-weight: 600; }
      .nist-priority-medium { color: var(--warning); }
      .nist-priority-low { color: var(--passing); }

      /* ---- Formatted Policy Detail ---- */
      .policy-section { margin-bottom: 16px; }
      .policy-section-header {
        font-weight: 600; font-size: 13px; color: var(--accent); padding: 6px 0;
        border-bottom: 1px solid var(--border); margin-bottom: 6px;
      }
      .policy-sub-section { margin-left: 8px; margin-bottom: 12px; }
      .policy-sub-header { font-weight: 600; font-size: 12px; color: var(--text); padding: 4px 0; margin-top: 4px; }
      .policy-kv-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 4px; }
      .policy-kv-table td { padding: 4px 8px; font-size: 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
      .policy-kv-table td:first-child { width: 200px; font-weight: 500; color: var(--text); font-family: var(--font-mono); font-size: 11px; }
      .policy-kv-table td:last-child { color: var(--text-muted); word-break: break-word; }
      .policy-comment { font-size: 11px; color: var(--text-dim); font-style: italic; padding: 2px 0; }
      .policy-list-item { font-size: 12px; color: var(--text-muted); padding: 2px 0 2px 16px; position: relative; }
      .policy-list-item::before { content: "\u2022"; color: var(--accent); position: absolute; left: 4px; }
      .policy-view-raw { font-size: 11px; color: var(--text-dim); cursor: pointer; text-decoration: underline; }
      .policy-view-raw:hover { color: var(--accent); }
      .policy-content-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
      .policy-content-title { font-size: 14px; font-weight: 600; color: var(--text); }
      .policy-content-pillar {
        font-size: 10px; font-weight: 600; color: var(--accent);
        background: var(--accent-bg); padding: 2px 8px; border-radius: 10px;
        border: 1px solid rgba(136, 98, 255, 0.25);
      }
      .policy-search-bar { position: relative; margin-bottom: 12px; }
      .policy-search-bar .search-input {
        width: 100%; max-width: 400px;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm);
        color: var(--text); font-size: 12px; padding: 6px 10px; outline: none; transition: border-color 0.15s;
      }
      .policy-search-bar .search-input:focus { border-color: var(--accent); }
      .policy-search-bar .search-input::placeholder { color: var(--text-dim); }
      .policy-search-clear {
        position: absolute; top: 50%; transform: translateY(-50%); right: calc(100% - 400px + 8px);
        background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 16px;
      }

      /* ---- NIST Reference Links (threat table) ---- */
      .nist-ref-link { color: var(--accent); cursor: pointer; text-decoration: underline; font-size: 11px; }
      .nist-ref-link:hover { color: var(--text); }

      /* ---- NIST Control Popup ---- */
      .nist-popup {
        position: fixed; z-index: 100; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--radius); padding: 18px; max-width: 420px; width: 90%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      }
      .nist-popup-header { font-weight: 700; font-size: 14px; margin-bottom: 6px; color: var(--text); }
      .nist-popup-family { font-size: 11px; color: var(--text-muted); margin-bottom: 10px; }
      .nist-popup-desc { font-size: 12px; line-height: 1.5; color: var(--text-muted); }
      .nist-popup-close { position: absolute; top: 8px; right: 12px; cursor: pointer; color: var(--text-dim); font-size: 18px; background: none; border: none; }

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

      /* ---- Capability Cards ---- */
      .capability-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 12px; margin-bottom: 20px;
      }
      .capability-card {
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
        padding: 14px 16px; cursor: pointer; border-left: 3px solid #58a6ff;
        transition: border-color 0.15s, transform 0.1s;
      }
      .capability-card:hover { border-color: #58a6ff; transform: translateY(-1px); }
      .capability-card .cap-name { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
      .capability-card .cap-description {
        font-size: 11px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .capability-card .cap-meta { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-dim); }
      .cap-bar-badge {
        background: rgba(88, 166, 255, 0.15); color: #58a6ff;
        padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: 600;
      }
      .cap-bar-badge.has-bars { background: rgba(63, 185, 80, 0.15); color: var(--passing); }

      /* ---- Capability Breadcrumb ---- */
      .capability-breadcrumb { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 12px; }
      .capability-breadcrumb a { color: var(--accent); cursor: pointer; }
      .capability-breadcrumb .sep { color: var(--text-dim); }

      /* ---- Model Switcher ---- */
      .model-switcher {
        display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
        padding: 8px 12px; background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--radius-sm); font-size: 12px;
      }
      .model-switcher label { color: var(--text-muted); }
      .model-switcher select {
        background: var(--surface-raised); border: 1px solid var(--border);
        border-radius: 4px; color: var(--text); font-size: 12px; padding: 4px 8px; outline: none;
      }
      .model-switcher select:focus { border-color: var(--accent); }

      /* ---- L3 Capability Sections ---- */
      .l3-capability-section {
        margin-bottom: 16px; padding: 12px; background: var(--surface);
        border: 1px solid var(--border); border-radius: var(--radius-sm);
      }
      .l3-header { margin-bottom: 8px; }
      .l3-name { font-size: 13px; font-weight: 600; color: var(--text); }
      .l3-desc { font-size: 11px; color: var(--text-muted); margin-left: 8px; }
      .l3-bar-row { display: flex; gap: 12px; padding: 6px 8px; cursor: pointer; border-radius: 4px; align-items: center; }
      .l3-bar-row:hover { background: var(--surface-raised); }
      .l3-no-bars { font-size: 11px; color: var(--text-dim); font-style: italic; }

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

      /* Linked Repos (BAR Detail) */
      .linked-repos { margin-bottom: 16px; }
      .linked-repo-row {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 12px; cursor: pointer; border-radius: var(--radius-sm);
        border: 1px solid var(--border); margin-bottom: 6px;
        transition: background 0.15s;
      }
      .linked-repo-row:hover { background: var(--surface-raised); }
      .linked-repo-icon { font-size: 16px; color: var(--text-dim); flex-shrink: 0; }
      .linked-repo-name { font-size: 12px; color: var(--text); font-weight: 500; }
      .linked-repo-url { font-size: 10px; color: var(--text-muted); }
      .linked-repo-chevron { color: var(--text-dim); font-size: 12px; }
      .linked-repos-empty { font-size: 11px; color: var(--text-dim); font-style: italic; padding: 8px 0; }

      /* Application lens platform drill-down breadcrumb */
      .app-lens-breadcrumb { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 12px; }
      .app-lens-breadcrumb a { color: var(--accent); cursor: pointer; }
      .app-lens-breadcrumb .sep { color: var(--text-dim); }
    </style>
  `;
}

// ============================================================================
// Rendering — Main Dispatcher
// ============================================================================

function render() {
  // Unmount React before innerHTML replacement (destroys DOM)
  unmountDiagramCanvas();
  rootEl.innerHTML = getStyles() + renderView() + renderNistPopup() + renderDiagramFullscreen() + renderRepoPickerModal();
  attachEventHandlers();
  // Render diagrams after DOM update
  setTimeout(() => {
    renderMermaidDiagrams();
    mountReactDiagramIfNeeded();
  }, 0);
}

async function renderMermaidDiagrams() {
  const elements = document.querySelectorAll('.mermaid-diagram[data-diagram]');
  for (const el of elements) {
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

  // Check for fullscreen ReactFlow mount first
  if (state.diagramFullscreen && state.diagramFullscreenType === 'reactflow') {
    const diagramType = state.activeTab as 'context' | 'logical';
    if (!calmJson) return;

    const layout = diagramType === 'context'
      ? (state.layouts?.context || null)
      : (state.layouts?.logical || null);

    mountDiagramCanvas('reactflow-fullscreen-mount', {
      calmData: calmJson as CalmArchitecture,
      diagramType,
      savedLayout: layout,
      onLayoutChange: () => { /* no save from fullscreen */ },
      onExportPng: (dataUrl) => {
        vscode.postMessage({
          type: 'exportPng',
          barPath: state.currentBar!.path,
          diagramType: state.activeTab,
          pngDataUrl: dataUrl,
        });
      },
      capabilityModel: state.capabilityModel,
    });
    return;
  }

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
    onLayoutChange: (updatedLayout) => {
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
    onExportPng: (dataUrl) => {
      vscode.postMessage({
        type: 'exportPng',
        barPath: state.currentBar!.path,
        diagramType: state.activeTab,
        pngDataUrl: dataUrl,
      });
    },
    onCalmMutation: (patch, updatedCalm) => {
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
    case 'bar-detail': return renderBarDetail();
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

  return `
    ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}
    ${renderPortfolioHeader(p)}
    ${renderGitSyncBanner()}
    ${renderEaLensTabs()}
    ${state.activeLens === 'business'
      ? renderBusinessCapabilityView()
      : state.activeLens === 'policies'
      ? renderPoliciesLensContent()
      : renderApplicationLensContent(p)}
  `;
}

/** True when the mesh has a remote but hasn't pushed yet (or is ahead). */
function needsPush(): boolean {
  const gs = state.gitStatus;
  if (!gs?.isGitRepo || !gs.hasRemote) { return false; }
  return !gs.hasUpstream || gs.ahead > 0;
}

function renderGitSyncBanner(): string {
  const gs = state.gitStatus;
  if (!gs?.isGitRepo) { return ''; }

  // Case 1: Has remote but never pushed (no upstream tracking branch)
  if (gs.hasRemote && !gs.hasUpstream) {
    return `
      <div class="git-sync-banner needs-push">
        <span class="git-sync-icon">&#x2191;</span>
        <span>Local commits have not been pushed to remote yet.</span>
        <button id="btn-push-mesh" class="btn-primary btn-sm">Push to Remote</button>
      </div>
    `;
  }

  // Case 2: Ahead of remote
  if (gs.hasRemote && gs.ahead > 0) {
    return `
      <div class="git-sync-banner needs-push">
        <span class="git-sync-icon">&#x2191;</span>
        <span>${gs.ahead} commit${gs.ahead !== 1 ? 's' : ''} ahead of remote.</span>
        <button id="btn-push-mesh" class="btn-primary btn-sm">Push</button>
      </div>
    `;
  }

  // Case 3: Behind remote
  if (gs.hasRemote && gs.behind > 0) {
    return `
      <div class="git-sync-banner needs-pull">
        <span class="git-sync-icon">&#x2193;</span>
        <span>${gs.behind} commit${gs.behind !== 1 ? 's' : ''} behind remote.</span>
        <button id="btn-pull-mesh" class="btn-primary btn-sm">Pull</button>
      </div>
    `;
  }

  return '';
}

function renderApplicationLensContent(p: PortfolioSummary): string {
  // If drilled into a platform, show app tiles for that platform
  if (state.currentPlatformId) {
    return renderApplicationPlatformDrillDown(p);
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

function renderApplicationPlatformDrillDown(p: PortfolioSummary): string {
  const platform = p.platforms.find(pl => pl.id === state.currentPlatformId);
  if (!platform) {
    return '<div class="error-msg">Platform not found.</div>';
  }

  const filteredBars = getFilteredBars(platform.bars);
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
    ${renderFilterChips()}
    ${renderAppTileGrid(filteredBars)}
  `;
}

function renderEaLensTabs(): string {
  const lenses: { id: EaLens; label: string; enabled: boolean }[] = [
    { id: 'business', label: 'Business', enabled: true },
    { id: 'application', label: 'Application', enabled: true },
    { id: 'policies', label: 'Policies', enabled: true },
    { id: 'data', label: 'Data', enabled: false },
    { id: 'technology', label: 'Technology', enabled: false },
    { id: 'integration', label: 'Integration', enabled: false },
  ];

  return `
    <div class="ea-lens-tabs">
      ${lenses.map(l => `
        <button class="ea-lens-tab${state.activeLens === l.id ? ' active' : ''}${!l.enabled ? ' disabled' : ''}"
                data-lens="${l.id}" ${!l.enabled ? 'title="Coming Soon"' : ''}>
          <span class="lens-dot ${l.id}"></span>
          ${escapeHtml(l.label)}
          ${!l.enabled ? '<span class="coming-soon">Coming Soon</span>' : ''}
        </button>
      `).join('')}
    </div>
  `;
}

// ============================================================================
// Policies Lens
// ============================================================================

function renderPoliciesLensContent(): string {
  // If policies haven't been loaded yet, request them
  if (state.policies.length === 0 && state.nistControls.length === 0) {
    vscode.postMessage({ type: 'loadPolicies' });
    return `<div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading policies...</div>`;
  }

  // Default selectedPolicy to the NIST card if available and nothing selected
  const nistPolicy = state.policies.find(p => p.pillar === 'nist');
  const effectiveSelection = state.selectedPolicy || (nistPolicy ? nistPolicy.filename : state.policies[0]?.filename || null);

  // Always show cards + inline content section below
  return `
    <div class="section-header">Governance Policies</div>
    ${renderPolicyCards(effectiveSelection)}
    <div style="margin-top: 24px;">
      ${renderPolicyContentSection(effectiveSelection)}
    </div>
  `;
}

function renderPolicyCards(activeFilename: string | null): string {
  const pillarColors: Record<string, string> = {
    architecture: '#58a6ff',
    security: '#f85149',
    risk: '#d29922',
    operations: '#3fb950',
    nist: '#bc8cff',
  };

  const cards = state.policies.map(p => {
    const borderColor = pillarColors[p.pillar] || 'var(--border)';
    const isGenerating = state.policyGenerating === p.filename;
    const isNist = p.pillar === 'nist';
    const isActive = p.filename === activeFilename;
    return `
      <div class="policy-card${isGenerating ? ' generating' : ''}${isActive ? ' active' : ''}" data-policy-filename="${escapeAttr(p.filename)}" style="border-left: 3px solid ${borderColor};">
        <div class="policy-card-name">${escapeHtml(p.label)}</div>
        <div class="policy-card-pillar">${escapeHtml(p.pillar.toUpperCase())}</div>
        <div class="policy-card-file">${escapeHtml(p.filename)}</div>
        ${isGenerating
          ? `<div class="policy-card-progress">
              <div class="policy-card-progress-bar" style="width: ${state.policyGenerateProgress}%;"></div>
            </div>
            <div class="policy-card-status">${escapeHtml(state.policyGenerateStep)}</div>`
          : `<div class="policy-card-actions">
              <button class="policy-action-btn policy-edit-btn" data-policy-filename="${escapeAttr(p.filename)}" title="Edit policy YAML">Edit</button>
              <button class="policy-action-btn policy-reset-btn" data-policy-filename="${escapeAttr(p.filename)}" title="${isNist ? 'Reset to default NIST catalog' : 'Reset to AI-generated baseline'}">${isNist ? 'Reset' : 'Reset to Baseline'}</button>
            </div>`}
      </div>
    `;
  }).join('');

  return `<div class="policy-card-grid">${cards}</div>`;
}

/**
 * Parse simple YAML content into formatted HTML sections with key-value tables.
 * Handles top-level sections, sub-sections, key: value pairs, list items, and comments.
 * Optional search filter highlights and filters to matching sections.
 */
function renderFormattedYaml(content: string, search?: string): string {
  const lines = content.split('\n');
  const searchLower = (search || '').toLowerCase();

  // Build sections as structured data so we can filter them
  interface YamlSection {
    headerHtml: string;
    bodyHtml: string[];
    rawText: string; // for search matching
  }

  const allSections: YamlSection[] = [];
  let current: YamlSection | null = null;
  let kvRows: string[] = [];
  let listItems: string[] = [];
  let rawLines: string[] = [];

  function flushList(): void {
    if (listItems.length > 0) {
      kvRows.push(`<tr><td colspan="2">${listItems.join('')}</td></tr>`);
      listItems = [];
    }
  }

  function flushKv(): void {
    flushList();
    if (kvRows.length > 0) {
      if (current) {
        current.bodyHtml.push(`<table class="policy-kv-table"><tbody>${kvRows.join('')}</tbody></table>`);
      }
      kvRows = [];
    }
  }

  function startSection(headerHtml: string): void {
    flushKv();
    if (current) { allSections.push(current); }
    current = { headerHtml, bodyHtml: [], rawText: '' };
    rawLines = [];
  }

  function trackRaw(text: string): void {
    rawLines.push(text);
    if (current) { current.rawText = rawLines.join(' '); }
  }

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed === '' || trimmed === '---') { continue; }

    // Comment line
    if (/^\s*#/.test(trimmed)) {
      const commentText = trimmed.replace(/^\s*#\s?/, '');
      if (commentText) {
        trackRaw(commentText);
        flushList();
        kvRows.push(`<tr><td colspan="2"><span class="policy-comment">${escapeHtml(commentText)}</span></td></tr>`);
      }
      continue;
    }

    // Measure indent
    const indent = line.length - line.trimStart().length;

    // Top-level key (no indent, ends with :)
    if (indent === 0 && /^[a-zA-Z_][\w_-]*:\s*$/.test(trimmed)) {
      const key = trimmed.replace(/:$/, '').replace(/_/g, ' ');
      startSection(`<div class="policy-section-header">${escapeHtml(key)}</div>`);
      trackRaw(key);
      continue;
    }

    // Top-level key: value (no indent)
    if (indent === 0) {
      const kvMatch = trimmed.match(/^([a-zA-Z_][\w_-]*):\s+(.+)$/);
      if (kvMatch) {
        const label = kvMatch[1].replace(/_/g, ' ');
        const value = kvMatch[2].replace(/^["']|["']$/g, '');
        startSection('');
        trackRaw(`${label} ${value}`);
        if (current) {
          current.bodyHtml.push(`<table class="policy-kv-table"><tbody><tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr></tbody></table>`);
        }
        continue;
      }
    }

    // Initialize a default section if none started yet
    if (!current) {
      current = { headerHtml: '', bodyHtml: [], rawText: '' };
      rawLines = [];
    }

    // Second-level key (2-space indent, ends with :)
    if (indent === 2 && /^\s{2}[a-zA-Z_][\w_-]*:\s*$/.test(line)) {
      flushKv();
      const key = trimmed.replace(/:$/, '').replace(/_/g, ' ');
      trackRaw(key);
      current.bodyHtml.push(`<div class="policy-sub-header">${escapeHtml(key)}</div>`);
      continue;
    }

    // Key: value at any indent level
    const kvAny = trimmed.match(/^([a-zA-Z_][\w_-]*):\s+(.+)$/);
    if (kvAny) {
      flushList();
      const label = kvAny[1].replace(/_/g, ' ');
      const value = kvAny[2].replace(/^["']|["']$/g, '');
      trackRaw(`${label} ${value}`);
      kvRows.push(`<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`);
      continue;
    }

    // List item (- value)
    const listMatch = trimmed.match(/^-\s+(.+)$/);
    if (listMatch) {
      const value = listMatch[1].replace(/^["']|["']$/g, '');
      trackRaw(value);
      listItems.push(`<div class="policy-list-item">${escapeHtml(value)}</div>`);
      continue;
    }

    // Anything else — treat as continuation or nested value
    trackRaw(trimmed);
    if (trimmed.endsWith(':')) {
      flushList();
      const label = trimmed.replace(/:$/, '').replace(/_/g, ' ');
      kvRows.push(`<tr><td colspan="2"><span class="policy-sub-header" style="display:inline-block;">${escapeHtml(label)}</span></td></tr>`);
    } else {
      flushList();
      kvRows.push(`<tr><td colspan="2" style="color: var(--text-muted);">${escapeHtml(trimmed)}</td></tr>`);
    }
  }

  // Flush remaining
  flushKv();
  if (current) { allSections.push(current); }

  // Filter by search if provided
  const filtered = searchLower
    ? allSections.filter(s => s.rawText.toLowerCase().includes(searchLower) || s.headerHtml.toLowerCase().includes(searchLower))
    : allSections;

  if (searchLower && filtered.length === 0) {
    return `<div style="padding: 12px; color: var(--text-muted);">No sections match "${escapeHtml(search || '')}".</div>`;
  }

  return filtered.map(s => s.headerHtml + s.bodyHtml.join('')).join('');
}

/**
 * Renders the inline content section below the policy cards.
 * For NIST: shows the NIST controls table with search.
 * For other policies: shows formatted YAML with search and edit support.
 */
function renderPolicyContentSection(activeFilename: string | null): string {
  if (!activeFilename) { return ''; }

  const policy = state.policies.find(p => p.filename === activeFilename);
  if (!policy) { return ''; }

  const isNist = policy.pillar === 'nist';

  // NIST card: delegate to existing NIST controls table
  if (isNist) {
    return `
      <div class="section-header">${escapeHtml(policy.label)}</div>
      ${renderNistControlsTable()}
    `;
  }

  // Editing mode for non-NIST policies
  if (state.policyEditing) {
    return `
      <div class="policy-content-header">
        <span class="policy-content-title">${escapeHtml(policy.label)}</span>
        <span class="policy-content-pillar">${escapeHtml(policy.pillar.toUpperCase())}</span>
      </div>
      <div class="policy-editor">
        <textarea id="policy-edit-textarea">${escapeHtml(state.policyEditContent || policy.content)}</textarea>
        <div class="policy-editor-actions">
          <button class="btn-secondary btn-sm" id="btn-policy-cancel">Cancel</button>
          <button class="btn-primary btn-sm" id="btn-policy-save">Save</button>
        </div>
      </div>
    `;
  }

  // Read-only formatted view with search
  const toggleLabel = state.policyViewRaw ? 'View Formatted' : 'View Raw';
  const contentHtml = state.policyViewRaw
    ? `<pre class="policy-content-pre">${escapeHtml(policy.content)}</pre>`
    : renderFormattedYaml(policy.content, state.policySearch);

  const searchBar = `
    <div class="policy-search-bar">
      <input type="text" id="policy-search-input" class="search-input"
             placeholder="Search ${escapeAttr(policy.label)}..."
             value="${escapeAttr(state.policySearch)}">
      ${state.policySearch ? '<button class="policy-search-clear" id="policy-search-clear">&times;</button>' : ''}
    </div>
  `;

  return `
    <div class="policy-content-header">
      <span class="policy-content-title">${escapeHtml(policy.label)}</span>
      <span class="policy-content-pillar">${escapeHtml(policy.pillar.toUpperCase())}</span>
      <span style="flex: 1;"></span>
      <a class="policy-view-raw" id="btn-policy-toggle-raw">${toggleLabel}</a>
      <button class="btn-primary btn-sm" id="btn-policy-edit">Edit</button>
    </div>
    ${searchBar}
    ${contentHtml}
  `;
}

function renderNistControlsTable(): string {
  const search = state.nistSearch.toLowerCase();
  const filtered = search
    ? state.nistControls.filter(c =>
        c.id.toLowerCase().includes(search) ||
        c.name.toLowerCase().includes(search) ||
        c.familyId.toLowerCase().includes(search) ||
        c.family.toLowerCase().includes(search)
      )
    : state.nistControls;

  if (state.nistControls.length === 0) {
    return `<div style="padding: 16px; text-align: center;">
      <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 12px;">
        No NIST controls catalog found.
      </p>
      <button id="btn-create-nist-catalog" class="btn-primary btn-sm">Create NIST SP 800-53 Catalog</button>
    </div>`;
  }

  // Group by family
  const families: Record<string, NistControl[]> = {};
  for (const c of filtered) {
    if (!families[c.family]) { families[c.family] = []; }
    families[c.family].push(c);
  }

  const searchInput = `
    <div class="nist-search-bar">
      <input type="text" id="nist-search-input" class="search-input"
             placeholder="Search controls (e.g. SC-7, encryption...)"
             value="${escapeAttr(state.nistSearch)}">
      ${state.nistSearch ? '<button class="nist-search-clear" id="nist-search-clear">&times;</button>' : ''}
    </div>
  `;

  if (Object.keys(families).length === 0) {
    return `${searchInput}<div style="padding: 12px; color: var(--text-muted);">No controls match "${escapeHtml(state.nistSearch)}".</div>`;
  }

  let tableHtml = '';
  for (const [familyName, controls] of Object.entries(families)) {
    const familyId = controls[0]?.familyId || '';
    tableHtml += `
      <div class="nist-family-header">${escapeHtml(familyId)} — ${escapeHtml(familyName)}</div>
      <table class="nist-table">
        <thead>
          <tr><th>ID</th><th>Name</th><th>Priority</th><th>Description</th></tr>
        </thead>
        <tbody>
          ${controls.map(c => `
            <tr>
              <td><code>${escapeHtml(c.id)}</code></td>
              <td>${escapeHtml(c.name)}</td>
              <td><span class="nist-priority-${c.priority}">${escapeHtml(c.priority)}</span></td>
              <td style="font-size: 11px; color: var(--text-muted);">${escapeHtml(c.description)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return `${searchInput}${tableHtml}`;
}

function renderNistPopup(): string {
  const c = state.nistControlPopup;
  if (!c) { return ''; }

  return `
    <div class="nist-popup" id="nist-popup">
      <span class="nist-popup-close" id="nist-popup-close">&times;</span>
      <div class="nist-popup-header">${escapeHtml(c.id)} — ${escapeHtml(c.name)}</div>
      <div class="nist-popup-family">${escapeHtml(c.familyId)} ${escapeHtml(c.family)} &middot; Priority: <span class="nist-priority-${c.priority}">${escapeHtml(c.priority)}</span></div>
      <div class="nist-popup-desc">${escapeHtml(c.description)}</div>
      <div style="margin-top: 10px;">
        <a id="nist-popup-view-policies" style="font-size: 11px; cursor: pointer;">View in Policies &rarr;</a>
      </div>
    </div>
  `;
}

function renderDiagramFullscreen(): string {
  if (!state.diagramFullscreen) { return ''; }

  const bodyContent = state.diagramFullscreenType === 'reactflow'
    ? `<div id="reactflow-fullscreen-mount" style="width: 100%; height: 100%;"></div>`
    : `<div class="mermaid-diagram" data-diagram="${escapeAttr(state.diagramFullscreenSrc)}"></div>`;

  return `
    <div class="diagram-fullscreen-overlay" id="diagram-fullscreen-overlay">
      <div class="diagram-fullscreen-header">
        <span class="diagram-fullscreen-title">${escapeHtml(state.diagramFullscreenTitle)}</span>
        <button class="diagram-fullscreen-close" id="diagram-fullscreen-close">&times; Close</button>
      </div>
      <div class="diagram-fullscreen-body">
        ${bodyContent}
      </div>
    </div>
  `;
}

function formatTimeAgo(dateString: string): string {
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

  const tabs = `
    <div class="repo-picker-tabs">
      <button class="repo-picker-tab${m.activeTab === 'browse' ? ' active' : ''}" data-picker-tab="browse">Browse Org</button>
      <button class="repo-picker-tab${m.activeTab === 'urls' ? ' active' : ''}" data-picker-tab="urls">Add URLs</button>
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

function renderBusinessCapabilityView(): string {
  const model = state.capabilityModel;
  if (!model) {
    return `
      ${renderModelSwitcher(null)}
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <p>No capability model configured.</p>
        <p style="font-size: 11px;">Select a model above, or initialize a new mesh with a capability model.</p>
      </div>`;
  }

  const drillPath = state.capabilityDrillPath;
  const breadcrumb = renderCapabilityBreadcrumb(model, drillPath);

  if (drillPath.length === 0) {
    return breadcrumb + renderModelSwitcher(model) + renderCapabilityCards(model.l1Capabilities, model);
  }

  const currentKey = drillPath[drillPath.length - 1];
  const currentNode = model.allNodes[currentKey];
  if (!currentNode) {
    return breadcrumb + '<div class="error-msg">Capability not found.</div>';
  }

  const children = currentNode.childKeys
    .map(k => model.allNodes[k])
    .filter(Boolean);

  // If children are L2, show as cards (drill further)
  if (children.length > 0 && children[0].level === 'L2') {
    return breadcrumb + renderCapabilityCards(children, model);
  }

  // At L2 level: show L3 capabilities with mapped BARs
  return breadcrumb + renderL3WithBars(children, model);
}

function renderCapabilityCards(nodes: CapabilityNode[], _model: CapabilityModelSummary): string {
  if (nodes.length === 0) {
    return '<div style="padding: 20px; color: var(--text-muted); text-align: center;">No capabilities defined at this level.</div>';
  }

  const cards = nodes.map(n => {
    const hasBars = n.barCount > 0;
    const childLabel = n.level === 'L1' ? 'L2' : 'L3';
    return `
      <div class="capability-card" data-capability-key="${escapeAttr(n.key)}">
        <div class="cap-name">${escapeHtml(n.name)}</div>
        <div class="cap-description">${escapeHtml(n.description)}</div>
        <div class="cap-meta">
          <span>${n.childCount} ${childLabel} capabilities</span>
          <span class="cap-bar-badge${hasBars ? ' has-bars' : ''}">${n.barCount} BAR${n.barCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="capability-grid">${cards}</div>`;
}

function renderCapabilityBreadcrumb(model: CapabilityModelSummary, drillPath: string[]): string {
  const parts: string[] = [`<a id="cap-breadcrumb-root">${escapeHtml(model.modelName)}</a>`];
  for (let i = 0; i < drillPath.length; i++) {
    const node = model.allNodes[drillPath[i]];
    if (node) {
      parts.push('<span class="sep">&#8250;</span>');
      if (i < drillPath.length - 1) {
        parts.push(`<a class="cap-breadcrumb-link" data-drill-index="${i}">${escapeHtml(node.name)}</a>`);
      } else {
        parts.push(`<span>${escapeHtml(node.name)}</span>`);
      }
    }
  }
  return `<div class="capability-breadcrumb">${parts.join('')}</div>`;
}

function renderL3WithBars(l3Nodes: CapabilityNode[], model: CapabilityModelSummary): string {
  if (l3Nodes.length === 0) {
    return '<div style="padding: 20px; color: var(--text-muted); text-align: center;">No L3 capabilities defined.</div>';
  }

  return l3Nodes.map(l3 => {
    const barPaths = model.capabilityToBarMap[l3.key] || [];
    const bars = barPaths
      .map(bp => state.portfolio?.allBars.find(b => b.path === bp))
      .filter(Boolean) as BarSummary[];

    return `
      <div class="l3-capability-section">
        <div class="l3-header">
          <span class="l3-name">${escapeHtml(l3.name)}</span>
          <span class="l3-desc">${escapeHtml(l3.description)}</span>
        </div>
        ${bars.length > 0
          ? renderAppTileGrid(bars)
          : '<div class="l3-no-bars">No applications mapped</div>'}
      </div>
    `;
  }).join('');
}

function renderModelSwitcher(model: CapabilityModelSummary | null): string {
  const activeType = model?.modelType || '';
  return `
    <div class="model-switcher">
      <label>Capability Model:</label>
      <select id="model-type-select">
        ${!model ? '<option value="" disabled selected>Select a model…</option>' : ''}
        <option value="insurance"${activeType === 'insurance' ? ' selected' : ''}>Insurance (ACORD)</option>
        <option value="banking"${activeType === 'banking' ? ' selected' : ''}>Banking (BIAN)</option>
        <option value="custom"${activeType === 'custom' ? ' selected' : ''}>Custom</option>
      </select>
      <button id="btn-upload-model" class="btn-ghost" title="Upload custom model JSON">Upload JSON</button>
    </div>
  `;
}

function renderPortfolioHeader(p: PortfolioSummary): string {
  return `
    <div class="breadcrumb">
      <span>${escapeHtml(p.portfolio.org || p.portfolio.name)}</span>
    </div>
    <div class="lg-header">
      <div class="lg-header-left">
        ${LOOKING_GLASS_SVG}
        <h1>Looking Glass</h1>
        <span class="portfolio-badge">${escapeHtml(p.portfolio.id)}</span>
        <button id="btn-settings-gear" class="settings-gear" title="Settings">&#x2699;</button>
      </div>
      <div class="lg-header-right">
        <input type="text" class="search-input" id="search-input" placeholder="Search..." value="${escapeAttr(state.searchQuery)}" />
        <button id="btn-sample-platform" class="btn-secondary" title="Create sample Insurance Operations platform with Claims Processing BAR using CALM artifacts">Sample Platform</button>
        <button id="btn-scan-org" class="btn-secondary">Scan Org</button>
        <button id="btn-refresh" class="btn-secondary btn-icon" title="Refresh" ${state.isLoading ? 'disabled' : ''}>&#x21BB;</button>
      </div>
    </div>
  `;
}

// ============================================================================
// View: Settings
// ============================================================================

function renderSettings(): string {
  const p = state.portfolio!;
  return `
    ${renderPortfolioHeader(p)}
    <div class="settings-panel">
      <div class="settings-header">
        <button id="btn-back-from-settings" class="btn-ghost">&larr; Back to Portfolio</button>
        <h2>Settings</h2>
      </div>

      ${renderSettingsWorkflow()}
      ${renderSettingsIssueTemplate()}
      ${renderSettingsLlmModel()}
      ${renderSettingsDriftWeights()}
      ${renderSettingsDangerZone()}
    </div>
  `;
}

function renderSettingsWorkflow(): string {
  const statusLabel = state.settingsWorkflowExists === null
    ? '<span class="status-badge unknown">Checking...</span>'
    : state.settingsWorkflowExists
    ? '<span class="status-badge deployed">Deployed</span>'
    : '<span class="status-badge not-deployed">Not Deployed</span>';

  const buttonLabel = state.settingsWorkflowExists ? 'Redeploy Workflow' : 'Deploy Workflow';
  const buttonClass = state.settingsWorkflowExists ? 'btn-secondary' : 'btn-primary';

  return `
    <div class="settings-section">
      <h3>Oraculum Workflow</h3>
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

function renderSettingsIssueTemplate(): string {
  if (!state.settingsIssueTemplateEditing) {
    return `
      <div class="settings-section">
        <h3>Issue Template</h3>
        <p class="text-muted">Edit the <code>.github/ISSUE_TEMPLATE/oraculum-review.yml</code> GitHub issue template in your mesh repo.</p>
        <div class="settings-row">
          <span class="text-muted">${state.settingsIssueTemplateExists ? 'Template exists on disk' : 'No template found — a default will be provided'}</span>
          <button id="btn-edit-issue-template" class="btn-secondary">Edit Template</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="settings-section">
      <h3>Issue Template</h3>
      <p class="text-muted">Edit the YAML issue template. Save writes to disk — sync your mesh to push changes.</p>
      <textarea id="issue-template-editor" class="settings-editor" rows="20" spellcheck="false">${escapeHtml(state.settingsIssueTemplate)}</textarea>
      <div class="settings-row" style="margin-top: 8px; gap: 8px; justify-content: flex-start;">
        <button id="btn-save-issue-template" class="btn-primary">Save</button>
        <button id="btn-cancel-issue-template" class="btn-secondary">Cancel</button>
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

function renderSummaryCards(p: PortfolioSummary): string {
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

function renderDomainHealthBars(bars: BarSummary[]): string {
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

function renderPlatformCards(platforms: PlatformSummary[]): string {
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

function computePillarAverages(bars: BarSummary[]): { label: string; abbr: string; score: number }[] {
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

function renderPillarMiniBars(pillars: { label: string; abbr: string; score: number }[]): string {
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

function renderFilterChips(): string {
  const chips: { value: 'all' | 'needs-attention' | 'warnings'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'needs-attention', label: 'Needs Attention' },
    { value: 'warnings', label: 'Warnings' },
  ];

  return `
    <div class="filter-chips">
      ${chips.map(c => `
        <span class="filter-chip${state.barFilter === c.value ? ' active' : ''}" data-filter="${c.value}">${c.label}</span>
      `).join('')}
    </div>
  `;
}

function renderBarTable(bars: BarSummary[]): string {
  if (bars.length === 0) {
    return '<div class="empty-state"><p>No matching applications found.</p></div>';
  }

  const rows = bars.map(bar => {
    // Git sync cell
    let syncCell = '<span style="color: var(--text-dim);">--</span>';
    if (state.gitStatus?.isGitRepo) {
      const barGs = state.gitStatus.barStatus[bar.path];
      if (barGs?.isDirty) {
        syncCell = `<span class="sync-dot out-of-sync" title="${barGs.dirtyFileCount} unsaved file${barGs.dirtyFileCount !== 1 ? 's' : ''}">${barGs.dirtyFileCount}</span>`;
      } else if (needsPush()) {
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

function renderPillarInline(pillar: GovernancePillarScore): string {
  return `<span class="pillar-dot ${pillar.status}" title="${pillar.status}"></span><span class="pillar-score-inline">${pillar.score}</span>`;
}

function renderDriftBadge(bar: BarSummary): string {
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
// App Tile — Reusable application card component
// ============================================================================

function renderAppTileSyncDot(barPath: string): string {
  if (!state.gitStatus?.isGitRepo) { return ''; }
  const barGs = state.gitStatus.barStatus[barPath];
  if (barGs?.isDirty) {
    return `<span class="sync-dot out-of-sync" title="${barGs.dirtyFileCount} unsaved">${barGs.dirtyFileCount}</span>`;
  }
  if (needsPush()) {
    return '<span class="sync-dot out-of-sync" title="Not pushed to remote">&#x2191;</span>';
  }
  return '<span class="sync-dot synced" title="Synced">&#10003;</span>';
}

function renderAppTile(bar: BarSummary): string {
  const pillarData = computePillarAverages([bar]);
  return `
    <div class="app-tile" data-bar-path="${escapeAttr(bar.path)}">
      <div class="app-tile-header">
        <div class="app-tile-name">${escapeHtml(bar.name)}</div>
        ${renderAppTileSyncDot(bar.path)}
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

function renderAppTileGrid(bars: BarSummary[]): string {
  if (bars.length === 0) {
    return '<div class="empty-state"><p>No applications found.</p></div>';
  }
  return `<div class="app-tile-grid">${bars.map(renderAppTile).join('')}</div>`;
}

function renderLinkedRepos(repos: string[], barPath: string): string {
  const addBtn = `<button class="btn-ghost btn-sm" id="btn-add-repo-to-bar" data-bar-path="${escapeAttr(barPath)}" title="Add repositories">+ Add</button>`;

  if (repos.length === 0) {
    return `
      <div class="section-header" style="display: flex; align-items: center; justify-content: space-between;">
        Linked Repositories
        ${addBtn}
      </div>
      <div class="linked-repos">
        <div class="linked-repos-empty">No repositories linked.</div>
      </div>
    `;
  }

  const rows = repos.map(url => {
    // Extract readable name from URL
    let displayName = url;
    try {
      const parts = url.replace(/\.git$/, '').split('/');
      displayName = parts[parts.length - 1] || url;
    } catch { /* use full url */ }

    return `
      <div class="linked-repo-row" data-repo-url="${escapeAttr(url)}" data-bar-path="${escapeAttr(barPath)}">
        <span class="linked-repo-icon">&#128193;</span>
        <div style="flex: 1; min-width: 0;">
          <div class="linked-repo-name">${escapeHtml(displayName)}</div>
          <div class="linked-repo-url">${escapeHtml(url)}</div>
        </div>
        <span class="linked-repo-chevron">&rsaquo;</span>
      </div>
    `;
  }).join('');

  return `
    <div class="section-header" style="display: flex; align-items: center; justify-content: space-between;">
      Linked Repositories
      ${addBtn}
    </div>
    <div class="linked-repos">${rows}</div>
  `;
}

// ============================================================================
// View: BAR Detail (Rabbit Hole)
// ============================================================================

function attachDriftListeners() {
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
    if (barPath && !state.topFindingsLoading) {
      state.topFindingsLoading = true;
      state.topFindingsProgress = 'Starting...';
      state.topFindingsProgressPct = 0;
      state.topFindingsSummary = null;
      state.topFindingsExpanded = true;
      render();
      vscode.postMessage({ type: 'summarizeTopFindings', barPath });
    }
  });

  // Top findings collapse/expand/dismiss
  document.getElementById('top-findings-collapse')?.addEventListener('click', () => {
    state.topFindingsExpanded = false;
    render();
  });
  document.getElementById('top-findings-toggle')?.addEventListener('click', () => {
    state.topFindingsExpanded = true;
    render();
  });
  document.getElementById('top-findings-dismiss')?.addEventListener('click', () => {
    state.topFindingsSummary = null;
    render();
  });
}

function attachActiveReviewListeners() {
  document.querySelectorAll('.active-review-link').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const url = (el as HTMLElement).getAttribute('data-url');
      if (url) { vscode.postMessage({ type: 'openUrl', url }); }
    });
  });
}

function renderActiveReviewBanner(): string {
  const review = state.activeReview;
  if (!review) { return ''; }

  const agentLabel = review.agent === 'claude' ? 'Claude' : review.agent === 'copilot' ? 'Copilot' : 'Agent';
  let prHtml = '';
  if (review.pr) {
    const draftBadge = review.pr.draft ? '<span class="review-draft-badge">Draft</span>' : '';
    prHtml = `<span style="margin-left: 12px;">PR <a class="active-review-link" data-url="${escapeAttr(review.pr.url)}">#${review.pr.number}</a> ${draftBadge}</span>`;
  }

  return `
    <div class="active-review-banner">
      <span class="review-pulse"></span>
      <span class="review-banner-text"><strong>${escapeHtml(agentLabel)}</strong> is reviewing this application</span>
      <span class="review-banner-links">
        Issue <a class="active-review-link" data-url="${escapeAttr(review.issueUrl)}">#${review.issueNumber}</a>
        ${prHtml}
      </span>
    </div>
  `;
}

function renderSparklineSvg(reviews: ReviewRecord[]): string {
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

function renderDriftIndicator(bar: BarSummary): string {
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

  const topFindingsBtn = `<button class="btn-ghost btn-sm drift-review-btn" id="btn-top-findings" data-bar-path="${escapeAttr(bar.path)}" title="Summarize top findings from latest review" ${state.topFindingsLoading ? 'disabled' : ''}>${state.topFindingsLoading ? '&#8987;' : '&#127913;'}</button>`;

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
      ${renderTopFindingsPanel()}
    </div>
  `;
}

function renderTopFindingsPanel(): string {
  // Loading state
  if (state.topFindingsLoading) {
    return `
      <div class="top-findings-panel">
        <div class="top-findings-progress">
          <span>${escapeHtml(state.topFindingsProgress)}</span>
        </div>
        <div class="top-findings-progress-bar">
          <div class="top-findings-progress-fill" style="width: ${state.topFindingsProgressPct}%"></div>
        </div>
      </div>
    `;
  }

  if (!state.topFindingsSummary) { return ''; }

  // Collapsed state
  if (!state.topFindingsExpanded) {
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

  const summary = state.topFindingsSummary;
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

function renderBarDetail(): string {
  const bar = state.currentBar;
  if (!bar) {
    return `<div class="error-msg">No BAR data loaded.</div>`;
  }

  const orgName = state.portfolio?.portfolio.org || state.portfolio?.portfolio.name || 'Portfolio';

  return `
    ${state.errorMessage ? `<div class="error-msg">${escapeHtml(state.errorMessage)}</div>` : ''}
    ${renderGitSyncBanner()}
    <div id="active-review-area">${renderActiveReviewBanner()}</div>
    <div class="breadcrumb">
      <a id="breadcrumb-portfolio">${escapeHtml(orgName)}</a>
      <span class="sep">&rsaquo;</span>
      <a id="breadcrumb-platform">${escapeHtml(bar.platformName)}</a>
      <span class="sep">&rsaquo;</span>
      <span>${escapeHtml(bar.name)}</span>
    </div>

    <div class="bar-detail-header">
      <div class="bar-detail-info">
        <span class="bar-detail-id">${escapeHtml(bar.id)}</span>
        <h2>${escapeHtml(bar.name)}</h2>
        <div class="bar-detail-meta">
          <span class="strategy-badge ${bar.strategy} editable-badge" data-field="strategy" data-value="${bar.strategy}" data-bar-path="${escapeAttr(bar.path)}" title="Click to change strategy">${bar.strategy}</span>
          <span class="crit-badge ${bar.criticality} editable-badge" data-field="criticality" data-value="${bar.criticality}" data-bar-path="${escapeAttr(bar.path)}" title="Click to change criticality">${bar.criticality}</span>
          <span class="lifecycle-badge editable-badge" data-field="lifecycle" data-value="${bar.lifecycle}" data-bar-path="${escapeAttr(bar.path)}" title="Click to change lifecycle">${bar.lifecycle}</span>
          <span style="font-size: 12px; color: var(--text-muted);">${bar.repoCount} repo${bar.repoCount !== 1 ? 's' : ''}</span>
          <button class="btn-ghost btn-sm" id="btn-edit-app-yaml" data-bar-path="${escapeAttr(bar.path)}" title="Edit app.yaml">&#9998; Edit</button>
          ${state.gitStatus?.isGitRepo ? (() => {
            const barGs = state.gitStatus?.barStatus[bar.path];
            const hasDirty = barGs?.isDirty;
            const unpushed = needsPush();
            if (hasDirty) {
              return `<button class="btn-primary btn-sm" id="btn-sync-bar" data-bar-path="${escapeAttr(bar.path)}"
                ${state.syncing ? 'disabled' : ''} title="${barGs!.dirtyFileCount} unsaved file${barGs!.dirtyFileCount !== 1 ? 's' : ''}">
                ${state.syncing ? '&#8635; Syncing...' : `&#8635; Sync (${barGs!.dirtyFileCount})`}
              </button>`;
            }
            if (unpushed) {
              return `<span class="sync-dot out-of-sync" style="margin-left:4px;" title="Not pushed to remote">&#x2191; Not pushed</span>`;
            }
            return `<span class="sync-dot synced" style="margin-left:4px;">&#10003; Synced</span>`;
          })() : ''}
          ${state.syncing ? `<span class="sync-progress-label">${escapeHtml(state.syncProgress)}</span>` : ''}
        </div>
      </div>
      <div id="drift-indicator-area">${renderDriftIndicator(bar)}</div>
      <div class="bar-detail-score">
        ${renderScoreRing(bar.compositeScore, 80, 10)}
      </div>
    </div>

    ${state.appYamlEditing ? renderAppYamlEditor(bar) : ''}

    ${bar.pendingDecisions > 0 ? `
      <div class="pending-warning">
        <span style="font-size: 18px;">&#9888;</span>
        <span>${bar.pendingDecisions} pending decision${bar.pendingDecisions !== 1 ? 's' : ''} require attention</span>
      </div>
    ` : ''}

    <div class="section-header">Governance Pillars</div>
    <div class="pillar-grid">
      ${renderPillarCard('Architecture', bar.architecture)}
      ${renderPillarCard('Security', bar.security)}
      ${renderPillarCard('Information Risk', bar.infoRisk)}
      ${renderPillarCard('Operations', bar.operations)}
    </div>

    ${renderActivePillarDetail(bar.path)}

    ${renderLinkedRepos(bar.repos || [], bar.path)}

    ${state.currentRepoTree.length > 0 ? `
      <div class="section-header">Repository Structure</div>
      <div class="repo-tree">
        ${renderRepoTree(state.currentRepoTree, bar.path)}
      </div>
    ` : ''}

    ${state.currentDecisions.length > 0 ? `
      <div class="section-header">Decisions</div>
      ${renderDecisionsTable(state.currentDecisions)}
    ` : ''}
  `;
}

function renderAppYamlEditor(bar: BarSummary): string {
  const f = state.appYamlForm || {
    name: bar.name,
    owner: '',
    description: '',
    criticality: bar.criticality,
    lifecycle: bar.lifecycle,
    strategy: bar.strategy,
  };

  return `
    <div class="app-yaml-editor">
      <div class="app-yaml-editor-title">
        <span>Edit Application Manifest</span>
        <button class="btn-ghost btn-sm" id="btn-cancel-app-yaml">&times;</button>
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label>Name</label>
          <input type="text" id="app-yaml-name" value="${escapeAttr(f.name)}" />
        </div>
        <div class="form-field">
          <label>Owner</label>
          <input type="text" id="app-yaml-owner" value="${escapeAttr(f.owner)}" placeholder="Team or individual owner" />
        </div>
        <div class="form-field">
          <label>Criticality</label>
          <select id="app-yaml-criticality">
            <option value="critical" ${f.criticality === 'critical' ? 'selected' : ''}>Critical</option>
            <option value="high" ${f.criticality === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${f.criticality === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${f.criticality === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>
        <div class="form-field">
          <label>Lifecycle</label>
          <select id="app-yaml-lifecycle">
            <option value="build" ${f.lifecycle === 'build' ? 'selected' : ''}>Build</option>
            <option value="run" ${f.lifecycle === 'run' ? 'selected' : ''}>Run</option>
            <option value="sunset" ${f.lifecycle === 'sunset' ? 'selected' : ''}>Sunset</option>
            <option value="decommission" ${f.lifecycle === 'decommission' ? 'selected' : ''}>Decommission</option>
          </select>
        </div>
        <div class="form-field">
          <label>Strategy (REAP)</label>
          <select id="app-yaml-strategy">
            <option value="reassess" ${f.strategy === 'reassess' ? 'selected' : ''}>Reassess</option>
            <option value="extract" ${f.strategy === 'extract' ? 'selected' : ''}>Extract</option>
            <option value="advance" ${f.strategy === 'advance' ? 'selected' : ''}>Advance</option>
            <option value="prune" ${f.strategy === 'prune' ? 'selected' : ''}>Prune</option>
          </select>
        </div>
        <div class="form-field form-field-full">
          <label>Description</label>
          <input type="text" id="app-yaml-description" value="${escapeAttr(f.description)}" placeholder="Brief application description" />
        </div>
      </div>
      <div class="app-yaml-editor-actions">
        <button class="btn-secondary btn-sm" id="btn-cancel-app-yaml-2">Cancel</button>
        <button class="btn-primary btn-sm" id="btn-save-app-yaml" data-bar-path="${escapeAttr(bar.path)}">Save Changes</button>
      </div>
    </div>
  `;
}

function renderActivePillarDetail(barPath: string): string {
  if (!state.activePillar) { return ''; }

  const pillarTitles: Record<string, string> = {
    'architecture': 'Architecture',
    'security': 'Security',
    'information-risk': 'Information Risk',
    'operations': 'Operations',
  };

  const title = pillarTitles[state.activePillar] || state.activePillar;

  let content = '';
  switch (state.activePillar) {
    case 'architecture':
      content = renderArchitectureDetail(
        state.calmData,
        state.diagrams,
        state.activeTab,
        state.adrs,
        state.adrEditingId,
        state.adrForm,
        barPath,
      );
      break;
    case 'security':
      content = renderSecurityDetail(
        state.threatModel,
        state.threatModelGenerating,
        state.threatModelProgress,
        state.threatModelProgressPct,
        barPath,
        state.diagrams?.threat,
      );
      break;
    case 'information-risk':
      content = renderInfoRiskDetail();
      break;
    case 'operations':
      content = renderOperationsDetail();
      break;
  }

  return `
    <div class="pillar-detail-panel">
      <div class="pillar-detail-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="pillar-detail-close" id="btn-close-pillar" title="Close">&times;</button>
      </div>
      ${content}
    </div>
  `;
}

function renderScoreRing(score: number, size: number, strokeWidth: number): string {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.max(0, Math.min(100, score));
  const dashoffset = circumference - (normalizedScore / 100) * circumference;
  const center = size / 2;

  const color = score >= 75 ? 'var(--passing)' : score >= 50 ? 'var(--warning)' : 'var(--failing)';
  const fontSize = size >= 80 ? 20 : size >= 50 ? 14 : 11;

  return `
    <div class="score-ring-container" style="width: ${size}px; height: ${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${center}" cy="${center}" r="${radius}"
          fill="none" stroke="var(--border)" stroke-width="${strokeWidth}" />
        <circle cx="${center}" cy="${center}" r="${radius}"
          fill="none" stroke="${color}" stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${dashoffset}"
          transform="rotate(-90 ${center} ${center})"
          style="transition: stroke-dashoffset 0.5s ease;" />
      </svg>
      <span class="score-ring-label" style="font-size: ${fontSize}px;">${normalizedScore}</span>
    </div>
  `;
}

// Group artifact definitions by category for cleaner display
const ARTIFACT_GROUPS: Record<string, { group: string; labels: string[] }[]> = {
  architecture: [
    {
      group: 'Views',
      labels: [
        'Conceptual View', 'Logical View', 'Context View', 'Sequence View',
        'Context Architecture (CALM)', 'Logical Architecture (CALM)', 'Capability Decorator (CALM)',
      ],
    },
    { group: 'ADRs', labels: ['ADRs'] },
    { group: 'Fitness', labels: ['Fitness Functions'] },
    { group: 'Quality', labels: ['Quality Attributes'] },
  ],
  security: [
    { group: 'Threat Model', labels: ['Threat Model'] },
    { group: 'Controls', labels: ['Security Controls'] },
    { group: 'Vulnerabilities', labels: ['Vulnerability Tracking'] },
    { group: 'Compliance', labels: ['Compliance Checklist'] },
  ],
  'information-risk': [
    { group: 'Risk Assessment', labels: ['Risk Assessment'] },
    { group: 'Data Classification', labels: ['Data Classification'] },
    { group: 'VISM', labels: ['VISM'] },
    { group: 'Privacy', labels: ['Privacy Impact'] },
  ],
  operations: [
    { group: 'Runbook', labels: ['Runbook'] },
    { group: 'Service Map', labels: ['Service Mapping'] },
    { group: 'SLAs', labels: ['SLA Definitions'] },
    { group: 'Incident', labels: ['Incident Response'] },
  ],
};

function renderPillarCard(title: string, pillar: GovernancePillarScore): string {
  const statusColor = pillar.status === 'passing' ? 'var(--passing)'
    : pillar.status === 'warning' ? 'var(--warning)'
    : pillar.status === 'failing' ? 'var(--failing)'
    : 'var(--text-dim)';

  const groups = ARTIFACT_GROUPS[pillar.pillar] || [];
  const artifactsByLabel = new Map<string, PillarArtifact>();
  for (const a of pillar.artifacts) {
    artifactsByLabel.set(a.label, a);
  }

  const groupRows = groups.map(g => {
    const members = g.labels.map(l => artifactsByLabel.get(l)).filter(Boolean) as PillarArtifact[];
    const present = members.filter(a => a.present && a.nonEmpty).length;
    const total = members.length;
    const iconClass = present === total ? 'all-present' : present > 0 ? 'some-present' : 'none-present';
    const icon = present === total ? '&#10003;' : present > 0 ? '&#9679;' : '&#10007;';
    const countText = total > 1 ? `${present}/${total}` : (present > 0 ? '' : '');

    return `
      <div class="artifact-group">
        <span class="artifact-group-icon ${iconClass}">${icon}</span>
        <span class="artifact-group-label">${escapeHtml(g.group)}</span>
        ${countText ? `<span class="artifact-group-count">${countText}</span>` : ''}
      </div>
    `;
  }).join('');

  const pillarKey = pillar.pillar;
  const isActive = state.activePillar === pillarKey;

  // Per-pillar git sync badge
  let syncBadge = '';
  if (state.gitStatus?.isGitRepo && state.currentBar) {
    const barGs = state.gitStatus.barStatus[state.currentBar.path];
    if (barGs) {
      const pKey = pillarKey === 'information-risk' ? 'infoRisk' : pillarKey;
      const ps = barGs.pillarStatus[pKey as keyof typeof barGs.pillarStatus];
      if (ps?.isDirty) {
        const tip = ps.dirtyFiles.map(f => f.split('/').pop()).join(', ');
        syncBadge = `<span class="pillar-sync-badge" title="${escapeAttr(tip)}">${ps.dirtyFileCount} unsaved</span>`;
      }
    }
  }

  return `
    <div class="pillar-card ${isActive ? 'active' : ''}" data-pillar="${escapeAttr(pillarKey)}">
      <div class="pillar-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h3 style="color: ${statusColor};">${escapeHtml(title)}</h3>
          ${syncBadge}
        </div>
        ${renderScoreRing(pillar.score, 48, 5)}
      </div>
      <div class="pillar-artifacts">
        ${groupRows}
      </div>
      <div class="pillar-card-expand-hint">${isActive ? '&#9650; Click to collapse' : '&#9660; Click to expand'}</div>
    </div>
  `;
}

// Folder color map matching the JSX prototype
const FOLDER_COLORS: Record<string, string> = {
  'architecture': '#8862ff',
  'security': '#f85149',
  'information-risk': '#d29922',
  'operations': '#3fb950',
  'governance': '#c084fc',
  'repos': '#c9d1d9',
};

function renderRepoTree(entries: string[], barPath: string): string {
  // Build a structured tree from flat paths
  interface TreeNode {
    name: string;
    isDir: boolean;
    children: TreeNode[];
    fullRelPath: string;
  }

  const root: TreeNode = { name: '', isDir: true, children: [], fullRelPath: '' };

  for (const entry of entries) {
    const isDir = entry.endsWith('/');
    const cleanPath = isDir ? entry.slice(0, -1) : entry;
    const parts = cleanPath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partialPath = parts.slice(0, i + 1).join('/');
      const isLast = i === parts.length - 1;
      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = {
          name: part,
          isDir: isLast ? isDir : true,
          children: [],
          fullRelPath: isLast ? (isDir ? partialPath + '/' : partialPath) : partialPath + '/',
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  // Render tree recursively
  function renderNode(node: TreeNode, depth: number): string {
    const indent = depth * 20;
    const absPath = barPath + '/' + node.fullRelPath.replace(/\/$/, '');

    if (node.isDir) {
      // Count children for detail text
      const fileCount = node.children.filter(c => !c.isDir).length;
      const dirCount = node.children.filter(c => c.isDir).length;
      const topFolder = node.fullRelPath.split('/')[0];
      const folderColor = FOLDER_COLORS[topFolder] || '#c9d1d9';

      // For directories, group leaf files into a single summary line
      const childFiles = node.children.filter(c => !c.isDir);
      const childDirs = node.children.filter(c => c.isDir);

      let html = `
        <div class="tree-entry" style="padding-left: ${indent}px;" data-file-path="${escapeAttr(absPath)}">
          <span class="tree-entry-icon" style="color: ${folderColor};">&#128193;</span>
          <span class="tree-entry-name folder" style="color: ${folderColor};">${escapeHtml(node.name)}/</span>
          ${fileCount > 0 && dirCount === 0 ? `<span class="tree-entry-detail">(${fileCount} file${fileCount !== 1 ? 's' : ''})</span>` : ''}
        </div>
      `;

      // Render child dirs recursively, then individual files
      if (childDirs.length === 0 && childFiles.length > 0) {
        for (const f of childFiles) {
          const fileAbsPath = barPath + '/' + f.fullRelPath;
          html += `
            <div class="tree-entry" style="padding-left: ${indent + 20}px;" data-file-path="${escapeAttr(fileAbsPath)}">
              <span class="tree-entry-icon" style="color: var(--text-dim);">&#9500;&#9472;</span>
              <span class="tree-entry-name" style="color: var(--text-dim);">${escapeHtml(f.name)}</span>
            </div>
          `;
        }
      } else {
        for (const child of childDirs) {
          html += renderNode(child, depth + 1);
        }
        for (const f of childFiles) {
          const fileAbsPath = barPath + '/' + f.fullRelPath;
          html += `
            <div class="tree-entry" style="padding-left: ${indent + 20}px;" data-file-path="${escapeAttr(fileAbsPath)}">
              <span class="tree-entry-icon" style="color: var(--text-dim);">&#9500;&#9472;</span>
              <span class="tree-entry-name" style="color: var(--text-dim);">${escapeHtml(f.name)}</span>
            </div>
          `;
        }
      }

      return html;
    }

    // Standalone file at root level (like app.yaml)
    return `
      <div class="tree-entry" style="padding-left: ${indent}px;" data-file-path="${escapeAttr(absPath)}">
        <span class="tree-entry-icon" style="color: var(--text-dim);">&#9500;&#9472;</span>
        <span class="tree-entry-name" style="color: var(--text);">${escapeHtml(node.name)}</span>
      </div>
    `;
  }

  // Render root's children (skip the root node itself)
  return root.children.map(c => renderNode(c, 0)).join('');
}

function renderDecisionsTable(decisions: GovernanceDecision[]): string {
  const rows = decisions.map(d => `
    <tr>
      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">${escapeHtml(d.id)}</td>
      <td>${escapeHtml(d.title)}</td>
      <td><span class="decision-status ${d.status}">${d.status}</span></td>
      <td style="color: var(--text-muted);">${escapeHtml(d.date)}</td>
      <td style="color: var(--text-muted);">${escapeHtml(d.owner)}</td>
    </tr>
  `).join('');

  return `
    <table class="decisions-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Title</th>
          <th>Status</th>
          <th>Date</th>
          <th>Owner</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

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
    state.settingsIssueTemplateEditing = false;
    vscode.postMessage({ type: 'checkWorkflowStatus' });
    vscode.postMessage({ type: 'loadIssueTemplate' });
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

  // Settings: edit issue template
  document.getElementById('btn-edit-issue-template')?.addEventListener('click', () => {
    state.settingsIssueTemplateEditing = true;
    render();
  });

  // Settings: save issue template
  document.getElementById('btn-save-issue-template')?.addEventListener('click', () => {
    const editor = document.getElementById('issue-template-editor') as HTMLTextAreaElement;
    if (editor) {
      vscode.postMessage({ type: 'saveIssueTemplate', content: editor.value });
      state.settingsIssueTemplate = editor.value;
      state.settingsIssueTemplateEditing = false;
      state.settingsIssueTemplateExists = true;
      render();
    }
  });

  // Settings: cancel issue template edit
  document.getElementById('btn-cancel-issue-template')?.addEventListener('click', () => {
    state.settingsIssueTemplateEditing = false;
    render();
  });

  // Settings: save model preference
  document.getElementById('btn-save-model-pref')?.addEventListener('click', () => {
    const select = document.getElementById('settings-model-select') as HTMLSelectElement;
    if (select) {
      vscode.postMessage({ type: 'savePreferredModel', family: select.value });
    }
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

  // Platform card clicks
  document.querySelectorAll('.platform-card').forEach(card => {
    card.addEventListener('click', () => {
      const platformId = (card as HTMLElement).dataset.platformId;
      if (platformId) {
        // Always drill down within the Application Lens
        state.view = 'portfolio';
        state.activeLens = 'application';
        state.currentPlatformId = platformId;
        state.searchQuery = '';
        state.barFilter = 'all';
        state.errorMessage = '';
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
      state.barFilter = filter;
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
        state.searchQuery = searchInput.value.trim();
        vscode.postMessage({ type: 'searchBars', query: state.searchQuery });
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

  // Editable badges — click to cycle through values
  const fieldValues: Record<string, string[]> = {
    strategy: ['reassess', 'extract', 'advance', 'prune'],
    criticality: ['critical', 'high', 'medium', 'low'],
    lifecycle: ['build', 'run', 'sunset', 'decommission'],
  };

  document.querySelectorAll('.editable-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      const el = badge as HTMLElement;
      const field = el.dataset.field;
      const currentValue = el.dataset.value;
      const barPath = el.dataset.barPath;
      if (!field || !currentValue || !barPath) { return; }

      const values = fieldValues[field];
      if (!values) { return; }

      const currentIdx = values.indexOf(currentValue);
      const nextValue = values[(currentIdx + 1) % values.length];

      vscode.postMessage({ type: 'updateBarField', barPath, field, value: nextValue });
    });
  });

  // Breadcrumb navigation
  document.getElementById('breadcrumb-portfolio')?.addEventListener('click', () => {
    state.view = 'portfolio';
    state.currentBar = null;
    state.currentPlatformId = null;
    state.searchQuery = '';
    state.barFilter = 'all';
    state.errorMessage = '';
    vscode.postMessage({ type: 'backToPortfolio' });
    render();
  });

  document.getElementById('breadcrumb-platform')?.addEventListener('click', () => {
    if (state.currentBar) {
      // Return to portfolio view with platform drilled-in (Application Lens)
      // instead of the old standalone platform view
      state.view = 'portfolio';
      state.activeLens = 'application';
      state.currentPlatformId = state.currentBar.platformId;
      state.currentBar = null;
      state.searchQuery = '';
      state.barFilter = 'all';
      state.errorMessage = '';
      vscode.postMessage({ type: 'backToPlatform' });
      render();
    }
  });

  // Repo tree entry clicks
  document.querySelectorAll('.tree-entry[data-file-path]').forEach(el => {
    el.addEventListener('click', () => {
      const filePath = (el as HTMLElement).dataset.filePath;
      if (filePath) {
        vscode.postMessage({ type: 'openFile', path: filePath });
      }
    });
  });


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

  // Pillar card clicks — toggle pillar detail panel
  document.querySelectorAll('.pillar-card[data-pillar]').forEach(card => {
    card.addEventListener('click', () => {
      const pillar = (card as HTMLElement).dataset.pillar as typeof state.activePillar;
      if (state.activePillar === pillar) {
        state.activePillar = null;
      } else {
        state.activePillar = pillar;
      }
      render();
    });
  });

  // Close pillar detail panel
  document.getElementById('btn-close-pillar')?.addEventListener('click', () => {
    state.activePillar = null;
    render();
  });

  attachDriftListeners();
  attachActiveReviewListeners();

  // App.yaml editor events
  document.getElementById('btn-edit-app-yaml')?.addEventListener('click', () => {
    const bar = state.currentBar;
    if (bar) {
      state.appYamlEditing = true;
      state.appYamlForm = {
        name: bar.name,
        owner: '',
        description: '',
        criticality: bar.criticality,
        lifecycle: bar.lifecycle,
        strategy: bar.strategy,
      };
      render();
    }
  });

  document.getElementById('btn-cancel-app-yaml')?.addEventListener('click', () => {
    state.appYamlEditing = false;
    state.appYamlForm = null;
    render();
  });
  document.getElementById('btn-cancel-app-yaml-2')?.addEventListener('click', () => {
    state.appYamlEditing = false;
    state.appYamlForm = null;
    render();
  });

  document.getElementById('btn-save-app-yaml')?.addEventListener('click', () => {
    const barPath = (document.getElementById('btn-save-app-yaml') as HTMLElement)?.dataset.barPath;
    if (!barPath) { return; }
    const fields: Record<string, string> = {
      name: (document.getElementById('app-yaml-name') as HTMLInputElement)?.value || '',
      owner: (document.getElementById('app-yaml-owner') as HTMLInputElement)?.value || '',
      description: (document.getElementById('app-yaml-description') as HTMLInputElement)?.value || '',
      criticality: (document.getElementById('app-yaml-criticality') as HTMLSelectElement)?.value || '',
      lifecycle: (document.getElementById('app-yaml-lifecycle') as HTMLSelectElement)?.value || '',
      strategy: (document.getElementById('app-yaml-strategy') as HTMLSelectElement)?.value || '',
    };
    // Remove empty fields so we don't overwrite with blanks
    for (const key of Object.keys(fields)) {
      if (!fields[key]) { delete fields[key]; }
    }
    vscode.postMessage({ type: 'updateAppYaml', barPath, fields });
  });

  // Sync BAR (git stage + commit + push)
  document.getElementById('btn-sync-bar')?.addEventListener('click', () => {
    const barPath = (document.getElementById('btn-sync-bar') as HTMLElement)?.dataset.barPath;
    if (barPath) {
      state.syncing = true;
      state.syncProgress = 'Staging changes...';
      render();
      vscode.postMessage({ type: 'syncBar', barPath });
    }
  });

  // Push mesh to remote (initial push or push ahead commits)
  document.getElementById('btn-push-mesh')?.addEventListener('click', () => {
    state.syncing = true;
    state.syncProgress = 'Pushing to remote...';
    render();
    vscode.postMessage({ type: 'pushMesh' });
  });

  // Pull from remote (when behind)
  document.getElementById('btn-pull-mesh')?.addEventListener('click', () => {
    state.syncing = true;
    state.syncProgress = 'Pulling from remote...';
    render();
    vscode.postMessage({ type: 'pullMesh' });
  });

  // Delegate to active pillar's event handlers
  if (state.activePillar === 'architecture') {
    attachArchitectureEvents(
      vscode,
      (tab) => {
        state.activeTab = tab;
        render();
      },
      (adrId, form) => {
        state.adrEditingId = adrId;
        state.adrForm = form;
        render();
      },
      () => state.adrs,
      () => state.adrEditingId,
      () => state.adrForm,
    );
  }

  if (state.activePillar === 'security') {
    attachSecurityEvents(
      vscode,
      () => ({ threatModel: state.threatModel }),
      () => {
        state.threatModel = null;
        state.threatModelGenerating = true;
        state.threatModelProgress = 'Starting...';
        state.threatModelProgressPct = 0;
        render();
      },
    );
  }

  if (state.activePillar === 'information-risk') {
    attachInfoRiskEvents();
  }

  if (state.activePillar === 'operations') {
    attachOperationsEvents();
  }

  // ---------- Diagram Fullscreen ----------
  // Mermaid diagrams fullscreen
  document.querySelectorAll('.diagram-container').forEach(container => {
    container.addEventListener('click', () => {
      const diagramEl = container.querySelector('.mermaid-diagram[data-diagram]');
      if (!diagramEl) { return; }
      const src = diagramEl.getAttribute('data-diagram') || '';
      if (!src) { return; }
      const activeTabEl = document.querySelector('.arch-tab.active');
      const title = activeTabEl ? activeTabEl.textContent || 'Diagram' : 'Diagram';
      state.diagramFullscreen = true;
      state.diagramFullscreenSrc = src;
      state.diagramFullscreenTitle = title;
      state.diagramFullscreenType = 'mermaid';
      render();
    });
  });

  // ReactFlow diagrams fullscreen (double-click the container)
  document.querySelectorAll('.reactflow-diagram-container').forEach(container => {
    container.addEventListener('dblclick', () => {
      const activeTabEl = document.querySelector('.arch-tab.active');
      const title = activeTabEl ? activeTabEl.textContent || 'Diagram' : 'Diagram';
      state.diagramFullscreen = true;
      state.diagramFullscreenSrc = '';
      state.diagramFullscreenTitle = title;
      state.diagramFullscreenType = 'reactflow';
      render();
    });
  });

  document.getElementById('diagram-fullscreen-close')?.addEventListener('click', () => {
    state.diagramFullscreen = false;
    state.diagramFullscreenSrc = '';
    state.diagramFullscreenTitle = '';
    state.diagramFullscreenType = 'mermaid';
    render();
  });

  // Close fullscreen on Escape key
  if (state.diagramFullscreen) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        state.diagramFullscreen = false;
        state.diagramFullscreenSrc = '';
        state.diagramFullscreenTitle = '';
        state.diagramFullscreenType = 'mermaid';
        render();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ---------- EA Lens Tabs ----------
  document.querySelectorAll('.ea-lens-tab:not(.disabled)').forEach(tab => {
    tab.addEventListener('click', () => {
      const lens = (tab as HTMLElement).dataset.lens as EaLens;
      if (lens) {
        state.activeLens = lens;
        state.capabilityDrillPath = [];
        state.currentPlatformId = null;
        // Load policies on first switch to policies tab
        if (lens === 'policies' && state.policies.length === 0) {
          vscode.postMessage({ type: 'loadPolicies' });
        }
        render();
      }
    });
  });

  // ---------- Capability Card Clicks (drill-down) ----------
  document.querySelectorAll('.capability-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = (card as HTMLElement).dataset.capabilityKey;
      if (key) {
        state.capabilityDrillPath.push(key);
        render();
      }
    });
  });

  // ---------- Capability Breadcrumb Navigation ----------
  document.getElementById('cap-breadcrumb-root')?.addEventListener('click', (e) => {
    e.preventDefault();
    state.capabilityDrillPath = [];
    render();
  });

  document.querySelectorAll('.cap-breadcrumb-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt((link as HTMLElement).dataset.drillIndex || '0', 10);
      state.capabilityDrillPath = state.capabilityDrillPath.slice(0, idx + 1);
      render();
    });
  });

  // ---------- L3 BAR Row Clicks ----------
  document.querySelectorAll('.l3-bar-row').forEach(row => {
    row.addEventListener('click', () => {
      const barPath = (row as HTMLElement).dataset.barPath;
      if (barPath) {
        vscode.postMessage({ type: 'drillIntoBar', barPath });
      }
    });
  });

  // ---------- Capability Model Switcher ----------
  const modelSelect = document.getElementById('model-type-select') as HTMLSelectElement | null;
  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      const modelType = modelSelect.value as CapabilityModelType;
      vscode.postMessage({ type: 'switchCapabilityModel', modelType });
    });
  }

  // ---------- Upload Custom Capability Model ----------
  document.getElementById('btn-upload-model')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) { return; }
      const reader = new FileReader();
      reader.onload = () => {
        const jsonContent = reader.result as string;
        vscode.postMessage({ type: 'uploadCustomModel', jsonContent });
      };
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });

  // ---------- App Tile Clicks → BAR Detail ----------
  document.querySelectorAll('.app-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const barPath = (tile as HTMLElement).dataset.barPath;
      if (barPath) {
        vscode.postMessage({ type: 'drillIntoBar', barPath });
      }
    });
  });

  // ---------- Application Lens Platform Breadcrumb Back ----------
  document.getElementById('app-lens-breadcrumb-back')?.addEventListener('click', () => {
    state.currentPlatformId = null;
    state.searchQuery = '';
    state.barFilter = 'all';
    render();
  });

  // ---------- Policy Card Clicks ----------
  document.querySelectorAll('.policy-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't select card if an action button was clicked
      if ((e.target as HTMLElement).classList.contains('policy-action-btn')) { return; }
      const filename = (card as HTMLElement).dataset.policyFilename;
      if (filename) {
        state.selectedPolicy = filename;
        state.policyEditing = false;
        state.policyEditContent = '';
        state.policyViewRaw = false;
        state.policySearch = '';
        render();
      }
    });
  });

  // Edit buttons on policy cards — go straight to edit view in inline section
  document.querySelectorAll('.policy-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filename = (btn as HTMLElement).dataset.policyFilename;
      if (filename) {
        const policy = state.policies.find(p => p.filename === filename);
        state.selectedPolicy = filename;
        state.policyEditing = true;
        state.policyEditContent = policy?.content || '';
        render();
      }
    });
  });

  // Reset to Baseline buttons on policy cards
  document.querySelectorAll('.policy-reset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filename = (btn as HTMLElement).dataset.policyFilename;
      if (filename && !state.policyGenerating) {
        state.policyGenerating = filename;
        state.policyGenerateStep = 'Starting...';
        state.policyGenerateProgress = 5;
        render();
        vscode.postMessage({ type: 'generatePolicyBaseline', filename });
      }
    });
  });

  // Policy toggle raw/formatted view
  document.getElementById('btn-policy-toggle-raw')?.addEventListener('click', () => {
    state.policyViewRaw = !state.policyViewRaw;
    render();
  });

  // Policy edit button (in the inline content section)
  document.getElementById('btn-policy-edit')?.addEventListener('click', () => {
    const activeFilename = state.selectedPolicy || state.policies.find(p => p.pillar === 'nist')?.filename || state.policies[0]?.filename;
    const policy = state.policies.find(p => p.filename === activeFilename);
    if (policy) {
      state.selectedPolicy = activeFilename || null;
      state.policyEditing = true;
      state.policyEditContent = policy.content;
      render();
    }
  });

  // Policy cancel edit
  document.getElementById('btn-policy-cancel')?.addEventListener('click', () => {
    state.policyEditing = false;
    state.policyEditContent = '';
    render();
  });

  // Policy save
  document.getElementById('btn-policy-save')?.addEventListener('click', () => {
    const textarea = document.getElementById('policy-edit-textarea') as HTMLTextAreaElement | null;
    const activeFilename = state.selectedPolicy || state.policies.find(p => p.pillar === 'nist')?.filename || state.policies[0]?.filename;
    if (textarea && activeFilename) {
      vscode.postMessage({ type: 'savePolicy', filename: activeFilename, content: textarea.value });
      state.policyEditing = false;
      state.policyEditContent = '';
    }
  });

  // Policy search input (for non-NIST policies)
  const policySearchInput = document.getElementById('policy-search-input') as HTMLInputElement | null;
  if (policySearchInput) {
    let policySearchTimeout: number | undefined;
    policySearchInput.addEventListener('input', () => {
      if (policySearchTimeout) { clearTimeout(policySearchTimeout); }
      policySearchTimeout = window.setTimeout(() => {
        state.policySearch = policySearchInput.value.trim();
        render();
        const newInput = document.getElementById('policy-search-input') as HTMLInputElement | null;
        if (newInput) {
          newInput.focus();
          newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
        }
      }, 200);
    });
  }

  // Policy search clear
  document.getElementById('policy-search-clear')?.addEventListener('click', () => {
    state.policySearch = '';
    render();
  });

  // NIST search input
  const nistSearchInput = document.getElementById('nist-search-input') as HTMLInputElement | null;
  if (nistSearchInput) {
    let nistSearchTimeout: number | undefined;
    nistSearchInput.addEventListener('input', () => {
      if (nistSearchTimeout) { clearTimeout(nistSearchTimeout); }
      nistSearchTimeout = window.setTimeout(() => {
        state.nistSearch = nistSearchInput.value.trim();
        render();
        const newInput = document.getElementById('nist-search-input') as HTMLInputElement | null;
        if (newInput) {
          newInput.focus();
          newInput.selectionStart = newInput.selectionEnd = newInput.value.length;
        }
      }, 200);
    });
  }

  // NIST search clear
  document.getElementById('nist-search-clear')?.addEventListener('click', () => {
    state.nistSearch = '';
    render();
  });

  // Create NIST catalog for existing meshes
  document.getElementById('btn-create-nist-catalog')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'createNistCatalog' });
  });

  // NIST popup close
  document.getElementById('nist-popup-close')?.addEventListener('click', () => {
    state.nistControlPopup = null;
    render();
  });

  // NIST popup "View in Policies" link
  document.getElementById('nist-popup-view-policies')?.addEventListener('click', () => {
    const controlId = state.nistControlPopup?.id || '';
    state.nistControlPopup = null;
    state.activeLens = 'policies';
    state.nistSearch = controlId;
    // Select the NIST card so the controls table shows below
    const nistPolicy = state.policies.find(p => p.pillar === 'nist');
    state.selectedPolicy = nistPolicy ? nistPolicy.filename : null;
    // Load policies if not already loaded
    if (state.policies.length === 0) {
      vscode.postMessage({ type: 'loadPolicies' });
    }
    render();
  });

  // NIST ref links in threat table
  document.querySelectorAll('.nist-ref-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      const controlId = (link as HTMLElement).dataset.nistId;
      if (controlId) {
        vscode.postMessage({ type: 'lookupNistControl', controlId });
      }
    });
  });

  // ---------- Linked Repo Clicks ----------
  document.querySelectorAll('.linked-repo-row').forEach(row => {
    row.addEventListener('click', () => {
      const repoUrl = (row as HTMLElement).dataset.repoUrl;
      const barPath = (row as HTMLElement).dataset.barPath;
      if (repoUrl && barPath) {
        vscode.postMessage({ type: 'openRepoInContext', repoUrl, barPath });
      }
    });
  });

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
      const tabName = (tab as HTMLElement).dataset.pickerTab as 'browse' | 'urls';
      if (state.repoPickerModal && tabName) {
        // Save textarea content before switching tabs
        const textarea = document.getElementById('repo-picker-urls-textarea') as HTMLTextAreaElement | null;
        if (textarea) { state.repoPickerModal.pastedUrls = textarea.value; }
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

  // Add repo to BAR button (on BAR detail page)
  document.getElementById('btn-add-repo-to-bar')?.addEventListener('click', () => {
    const barPath = (document.getElementById('btn-add-repo-to-bar') as HTMLElement)?.dataset.barPath;
    const bar = state.currentBar;
    if (!barPath || !bar) { return; }

    const org = state.portfolio?.portfolio?.org || state.detectedOrg || '';
    state.repoPickerModal = {
      mode: 'add-to-bar',
      barPath,
      barName: bar.name,
      org,
      repos: [],
      selectedRepoNames: new Set(),
      searchQuery: '',
      activeTab: 'browse',
      pastedUrls: '',
      loading: !!org,
      error: org ? '' : 'No organization detected. Use the "Add URLs" tab to paste repository URLs manually.',
    };
    render();
    if (org) {
      vscode.postMessage({ type: 'loadOrgRepos', org });
    }
  });
}

// ============================================================================
// Helpers
// ============================================================================

function getFilteredBars(bars: BarSummary[]): BarSummary[] {
  let filtered = bars;

  // Apply filter
  if (state.barFilter === 'needs-attention') {
    filtered = filtered.filter(b =>
      b.architecture.status === 'failing' ||
      b.security.status === 'failing' ||
      b.infoRisk.status === 'failing' ||
      b.operations.status === 'failing' ||
      b.pendingDecisions > 0
    );
  } else if (state.barFilter === 'warnings') {
    filtered = filtered.filter(b =>
      b.architecture.status === 'warning' ||
      b.security.status === 'warning' ||
      b.infoRisk.status === 'warning' ||
      b.operations.status === 'warning'
    );
  }

  // Apply search
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(b =>
      b.name.toLowerCase().includes(query) ||
      b.id.toLowerCase().includes(query) ||
      b.platformName.toLowerCase().includes(query)
    );
  }

  return filtered;
}

function getPillarByKey(bar: BarSummary, key: string): GovernancePillarScore | null {
  switch (key) {
    case 'architecture': return bar.architecture;
    case 'security': return bar.security;
    case 'information-risk': return bar.infoRisk;
    case 'operations': return bar.operations;
    default: return null;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============================================================================
// Message Handling (from extension)
// ============================================================================

window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'portfolioData': {
      state.portfolio = message.data as PortfolioSummary;
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
        state.threatModel = null;
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
        if (!state.topFindingsLoading) {
          state.topFindingsSummary = null;
        }
      }
      state.isLoading = false;
      state.errorMessage = '';
      state.view = 'bar-detail';
      render();
      break;
    }

    case 'activeReview': {
      const reviewBarPath = (message as Record<string, unknown>).barPath as string;
      const review = (message as Record<string, unknown>).review as ActiveReviewInfo | null;
      // Only update if we're still looking at this BAR
      if (state.currentBar?.path === reviewBarPath) {
        state.activeReview = review;
        // Targeted DOM update for active review area
        const reviewArea = document.getElementById('active-review-area');
        if (reviewArea) {
          reviewArea.innerHTML = renderActiveReviewBanner();
          attachActiveReviewListeners();
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
            onLayoutChange: (updatedLayout) => {
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
            onExportPng: (dataUrl) => {
              vscode.postMessage({
                type: 'exportPng',
                barPath: state.currentBar!.path,
                diagramType: state.activeTab,
                pngDataUrl: dataUrl,
              });
            },
            onCalmMutation: (patch, updatedCalmFromCanvas) => {
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

    // Settings messages
    case 'workflowStatus':
      state.settingsWorkflowExists = message.exists as boolean;
      if (state.view === 'settings') { render(); }
      break;

    case 'workflowProvisioned':
      state.settingsWorkflowExists = true;
      if (state.view === 'settings') { render(); }
      break;

    case 'issueTemplateLoaded':
      state.settingsIssueTemplate = (message.content as string) || '';
      state.settingsIssueTemplateExists = message.exists as boolean;
      if (state.view === 'settings') { render(); }
      break;

    case 'issueTemplateSaved':
      state.settingsIssueTemplateExists = true;
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
