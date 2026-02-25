// ============================================================================
// BAR Detail — BAR detail view rendering, pillar cards, repo tree, decisions,
// app.yaml editor, git sync, linked repos, component picker, and event handlers
// Extracted from lookingGlass.ts (Phase 6 decomposition)
// Stateless renderers: state slices passed as parameters, callbacks for mutations
// ============================================================================

import { escapeHtml, escapeAttr } from '../pillars/shared';
import { renderArchitectureDetail, attachArchitectureEvents, getArchitectureStyles } from '../pillars/architecturePillar';
import type { AdrRecord, CalmDataPayload } from '../pillars/architecturePillar';
import { renderSecurityDetail, attachSecurityEvents } from '../pillars/securityPillar';
import { renderInfoRiskDetail, attachInfoRiskEvents } from '../pillars/infoRiskPillar';
import { renderOperationsDetail, attachOperationsEvents } from '../pillars/operationsPillar';
import { renderAbsolemFloating, attachAbsolemEvents, getAbsolemStyles } from '../components/absolem';
import { renderAgentStatus, attachAgentStatusListeners, getAgentStatusStyles } from '../agentStatus';
import { getSecurityStyles } from '../pillars/securityPillar';
import { getInfoRiskStyles } from '../pillars/infoRiskPillar';
import {
  renderDriftIndicator, attachDriftListeners, trendArrow,
  renderGovernanceHistoryIndicator,
  type GovernanceHistoryState,
} from './portfolio';
import type { AgentStatusInfo } from '../agentStatus';
import type { DiagramLayout } from '../reactflow/LayoutTypes';
import type {
  VsCodeApi, BarSummary, PillarArtifact, GovernancePillarScore,
  GovernanceDecision, GovernanceTrend, GovernanceScoreSnapshot,
  GitSyncStatus, Criticality, ThreatModelResult,
} from '../types';

// ============================================================================
// Types — state slice needed for BAR detail rendering
// ============================================================================

export interface BarDetailRenderState {
  currentBar: BarSummary | null;
  activePillar: 'architecture' | 'security' | 'information-risk' | 'operations' | null;
  calmData: CalmDataPayload;
  diagrams: { sequence?: string; capability?: string; threat?: string } | null;
  activeTab: string;
  adrs: AdrRecord[];
  adrEditingId: string | null;
  adrForm: Partial<AdrRecord> | null;
  diagramFullscreen: boolean;
  threatModel: ThreatModelResult | null;
  threatModelGenerating: boolean;
  threatModelProgress: string;
  threatModelProgressPct: number;
  errorMessage: string;
  appYamlEditing: boolean;
  appYamlForm: { name: string; owner: string; description: string; criticality: string; lifecycle: string; strategy: string } | null;
  gitStatus: GitSyncStatus | null;
  syncing: boolean;
  syncProgress: string;
  scoreHistory: GovernanceScoreSnapshot[];
  scoreTrend: GovernanceTrend;
  pillarTrends: { architecture: GovernanceTrend; security: GovernanceTrend; infoRisk: GovernanceTrend; operations: GovernanceTrend } | null;
  currentRepoTree: string[];
  currentDecisions: GovernanceDecision[];
  absolemOpen: boolean;
  absolemMessages: { role: 'user' | 'assistant'; content: string }[];
  absolemStreaming: string;
  absolemStatus: 'idle' | 'thinking' | 'reviewing-patches';
  absolemPatches: { patches: { op: string; target: string; field?: string; value?: unknown }[]; description: string } | null;
  agentStatus: AgentStatusInfo | null;
  openWorkspaceFolders: string[];
  // TopFindingsState fields (needed by renderDriftIndicator)
  topFindingsLoading: boolean;
  topFindingsProgress: string;
  topFindingsProgressPct: number;
  topFindingsSummary: { architecture: string[]; security: string[]; informationRisk: string[]; operations: string[] } | null;
  topFindingsExpanded: boolean;
  componentPicker: {
    barPath: string;
    components: { id: string; name: string; type: string; description: string; suggestedRepo: string }[];
    selectedId: string;
    repoName: string;
  } | null;
  portfolio: { portfolio: { org?: string; name?: string } } | null;
  detectedOrg: string;
}

// ============================================================================
// Helpers
// ============================================================================

export function needsPush(gitStatus: GitSyncStatus | null): boolean {
  if (!gitStatus?.isGitRepo || !gitStatus.hasRemote) { return false; }
  return !gitStatus.hasUpstream || gitStatus.ahead > 0;
}

// ============================================================================
// Render — Git Sync Banner
// ============================================================================

export function renderGitSyncBanner(gitStatus: GitSyncStatus | null): string {
  if (!gitStatus?.isGitRepo) { return ''; }

  const banners: string[] = [];

  // Uncommitted changes (dirty working tree)
  const dirtyCount = Object.keys(gitStatus.dirtyFiles).length;
  if (dirtyCount > 0) {
    banners.push(`
      <div class="git-sync-banner has-dirty">
        <span class="git-sync-icon">&#x25CF;</span>
        <span>${dirtyCount} uncommitted change${dirtyCount !== 1 ? 's' : ''} in mesh.</span>
        <button id="btn-commit-mesh" class="btn-primary btn-sm">Commit All</button>
      </div>
    `);
  }

  // Has remote but never pushed (no upstream tracking branch)
  if (gitStatus.hasRemote && !gitStatus.hasUpstream) {
    banners.push(`
      <div class="git-sync-banner needs-push">
        <span class="git-sync-icon">&#x2191;</span>
        <span>Local commits have not been pushed to remote yet.</span>
        <button id="btn-push-mesh" class="btn-primary btn-sm">Push to Remote</button>
      </div>
    `);
  }

  // Ahead of remote
  if (gitStatus.hasRemote && gitStatus.ahead > 0) {
    banners.push(`
      <div class="git-sync-banner needs-push">
        <span class="git-sync-icon">&#x2191;</span>
        <span>${gitStatus.ahead} commit${gitStatus.ahead !== 1 ? 's' : ''} ahead of remote.</span>
        <button id="btn-push-mesh" class="btn-primary btn-sm">Push</button>
      </div>
    `);
  }

  // Behind remote
  if (gitStatus.hasRemote && gitStatus.behind > 0) {
    banners.push(`
      <div class="git-sync-banner needs-pull">
        <span class="git-sync-icon">&#x2193;</span>
        <span>${gitStatus.behind} commit${gitStatus.behind !== 1 ? 's' : ''} behind remote.</span>
        <button id="btn-pull-mesh" class="btn-primary btn-sm">Pull</button>
      </div>
    `);
  }

  return banners.join('\n');
}

// ============================================================================
// Render — Score Ring (SVG donut)
// ============================================================================

export function renderScoreRing(score: number, size: number, strokeWidth: number): string {
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

// ============================================================================
// Artifact group definitions (for pillar cards)
// ============================================================================

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

// ============================================================================
// Render — Pillar Card
// ============================================================================

export function renderPillarCard(
  title: string,
  pillar: GovernancePillarScore,
  activePillar: string | null,
  gitStatus: GitSyncStatus | null,
  currentBar: BarSummary | null,
  pillarTrends: { architecture: GovernanceTrend; security: GovernanceTrend; infoRisk: GovernanceTrend; operations: GovernanceTrend } | null,
): string {
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

    // Quality indicator for populated artifacts
    const avgQuality = members.length > 0
      ? Math.round(members.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / members.length)
      : 0;
    const qualityText = present > 0 && avgQuality > 0
      ? `<span class="artifact-quality" title="Content quality">${avgQuality}%</span>`
      : '';

    return `
      <div class="artifact-group">
        <span class="artifact-group-icon ${iconClass}">${icon}</span>
        <span class="artifact-group-label">${escapeHtml(g.group)}</span>
        ${countText ? `<span class="artifact-group-count">${countText}</span>` : ''}
        ${qualityText}
      </div>
    `;
  }).join('');

  const pillarKey = pillar.pillar;
  const isActive = activePillar === pillarKey;

  // Per-pillar git sync badge
  let syncBadge = '';
  if (gitStatus?.isGitRepo && currentBar) {
    const barGs = gitStatus.barStatus[currentBar.path];
    if (barGs) {
      const pKey = pillarKey === 'information-risk' ? 'infoRisk' : pillarKey;
      const ps = barGs.pillarStatus[pKey as keyof typeof barGs.pillarStatus];
      if (ps?.isDirty) {
        const tip = ps.dirtyFiles.map(f => f.split('/').pop()).join(', ');
        syncBadge = `<span class="pillar-sync-badge" title="${escapeAttr(tip)}">${ps.dirtyFileCount} unsaved</span>`;
      }
    }
  }

  // Trend arrow for this pillar
  const trendKey = pillarKey === 'information-risk' ? 'infoRisk' : pillarKey;
  const pillarTrendVal = pillarTrends ? (pillarTrends as Record<string, GovernanceTrend>)[trendKey] : undefined;
  const pillarTrendHtml = pillarTrendVal ? trendArrow(pillarTrendVal) : '';

  return `
    <div class="pillar-card ${isActive ? 'active' : ''}" data-pillar="${escapeAttr(pillarKey)}">
      <div class="pillar-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h3 style="color: ${statusColor};">${escapeHtml(title)}</h3>
          ${syncBadge}
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          ${renderScoreRing(pillar.score, 48, 5)}
          ${pillarTrendHtml}
        </div>
      </div>
      <div class="pillar-artifacts">
        ${groupRows}
      </div>
      <div class="pillar-card-expand-hint">${isActive ? '&#9650; Click to collapse' : '&#9660; Click to expand'}</div>
    </div>
  `;
}

// ============================================================================
// Render — Repo Tree
// ============================================================================

// Folder color map matching the JSX prototype
const FOLDER_COLORS: Record<string, string> = {
  'architecture': '#8862ff',
  'security': '#f85149',
  'information-risk': '#d29922',
  'operations': '#3fb950',
  'governance': '#c084fc',
  'repos': '#c9d1d9',
};

export function renderRepoTree(entries: string[], barPath: string): string {
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

// ============================================================================
// Render — Decisions Table
// ============================================================================

export function renderDecisionsTable(decisions: GovernanceDecision[]): string {
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
// Render — App.yaml Inline Editor
// ============================================================================

export function renderAppYamlEditor(
  bar: BarSummary,
  appYamlForm: { name: string; owner: string; description: string; criticality: string; lifecycle: string; strategy: string } | null,
): string {
  const f = appYamlForm || {
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

// ============================================================================
// Render — Active Pillar Detail
// ============================================================================

export function renderActivePillarDetail(
  barPath: string,
  activePillar: 'architecture' | 'security' | 'information-risk' | 'operations' | null,
  calmData: CalmDataPayload,
  diagrams: { sequence?: string; capability?: string; threat?: string } | null,
  activeTab: string,
  adrs: AdrRecord[],
  adrEditingId: string | null,
  adrForm: Partial<AdrRecord> | null,
  diagramFullscreen: boolean,
  threatModel: ThreatModelResult | null,
  threatModelGenerating: boolean,
  threatModelProgress: string,
  threatModelProgressPct: number,
): string {
  if (!activePillar) { return ''; }

  const pillarTitles: Record<string, string> = {
    'architecture': 'Architecture',
    'security': 'Security',
    'information-risk': 'Information Risk',
    'operations': 'Operations',
  };

  const title = pillarTitles[activePillar] || activePillar;

  let content = '';
  switch (activePillar) {
    case 'architecture':
      content = renderArchitectureDetail(
        calmData,
        diagrams,
        activeTab,
        adrs,
        adrEditingId,
        adrForm,
        barPath,
        diagramFullscreen,
      );
      break;
    case 'security':
      content = renderSecurityDetail(
        threatModel,
        threatModelGenerating,
        threatModelProgress,
        threatModelProgressPct,
        barPath,
        diagrams?.threat,
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

// ============================================================================
// Render — Linked Repos
// ============================================================================

export function renderLinkedRepos(
  repos: string[],
  barPath: string,
  openWorkspaceFolders: string[],
): string {
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

    // Check if this repo matches an open workspace folder (store full path for scorecard navigation)
    const matchedFolder = openWorkspaceFolders.find(f => f === displayName || f.endsWith('/' + displayName) || f.endsWith('\\' + displayName));
    const isOpen = !!matchedFolder;
    const activeClass = isOpen ? ' linked-repo-active' : '';
    const activeLabel = isOpen
      ? '<span class="linked-repo-badge" title="Open Security Scorecard">open &#8599;</span>'
      : '<span class="linked-repo-chevron">&rsaquo;</span>';

    return `
      <div class="linked-repo-row${activeClass}" data-repo-url="${escapeAttr(url)}" data-bar-path="${escapeAttr(barPath)}"${isOpen ? ` data-local-path="${escapeAttr(matchedFolder!)}"` : ''}>
        <span class="linked-repo-icon">&#128193;</span>
        <div style="flex: 1; min-width: 0;">
          <div class="linked-repo-name">${escapeHtml(displayName)}</div>
          <div class="linked-repo-url">${escapeHtml(url)}</div>
        </div>
        ${activeLabel}
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
// Render — Component Picker
// ============================================================================

export function renderComponentPicker(
  barPath: string,
  componentPicker: BarDetailRenderState['componentPicker'],
  portfolioOrg: string,
): string {
  const cp = componentPicker;
  if (!cp || cp.barPath !== barPath) { return ''; }
  if (cp.components.length === 0) {
    return `
      <div class="component-picker">
        <div class="component-picker-header">
          <span style="font-weight: 600;">Select Component to Implement</span>
          <button class="btn-ghost btn-sm" id="component-picker-cancel">&times;</button>
        </div>
        <div style="padding: 16px; color: var(--text-muted); font-size: 12px;">No implementable components found in architecture.</div>
      </div>`;
  }
  const org = portfolioOrg;
  const previewUrl = cp.repoName ? `https://github.com/${escapeHtml(org)}/${escapeHtml(cp.repoName)}` : '';
  return `
    <div class="component-picker">
      <div class="component-picker-header">
        <span style="font-weight: 600;">Select Component to Implement</span>
        <button class="btn-ghost btn-sm" id="component-picker-cancel">&times;</button>
      </div>
      <div class="component-list">
        ${cp.components.map(c => `
          <div class="component-row${c.id === cp.selectedId ? ' selected' : ''}" data-component-id="${escapeAttr(c.id)}" data-suggested-repo="${escapeAttr(c.suggestedRepo)}">
            <span class="component-type-badge">${escapeHtml(c.type)}</span>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 500; font-size: 13px;">${escapeHtml(c.name)}</div>
              ${c.description ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(c.description)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top: 12px;">
        <label style="font-size: 12px; font-weight: 500; display: block; margin-bottom: 4px;">Repository name</label>
        <input type="text" id="component-repo-name" value="${escapeAttr(cp.repoName)}" style="width: 100%; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); color: var(--text); font-size: 13px;" />
        ${previewUrl ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;"><code style="font-size: 10px; padding: 1px 4px; background: var(--surface-alt, var(--surface)); border-radius: 3px;">${previewUrl}</code></div>` : ''}
      </div>
      <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn-secondary btn-sm" id="component-picker-cancel-btn">Cancel</button>
        <button class="btn-primary btn-sm" id="component-picker-scaffold"${!cp.repoName ? ' disabled' : ''}>\u{1F407} Down the Rabbit Hole</button>
      </div>
    </div>`;
}

// ============================================================================
// Render — Main BAR Detail View
// ============================================================================

export function renderBarDetail(s: BarDetailRenderState): string {
  const bar = s.currentBar;
  if (!bar) {
    return `<div class="error-msg">No BAR data loaded.</div>`;
  }

  const orgName = s.portfolio?.portfolio.org || s.portfolio?.portfolio.name || 'Portfolio';
  const portfolioOrg = s.portfolio?.portfolio?.org || s.detectedOrg || '';

  return `
    ${s.errorMessage ? `<div class="error-msg">${escapeHtml(s.errorMessage)}</div>` : ''}
    ${renderGitSyncBanner(s.gitStatus)}
    <div id="active-review-area">${renderAgentStatus(s.agentStatus)}</div>
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
          ${s.gitStatus?.isGitRepo ? (() => {
            const barGs = s.gitStatus?.barStatus[bar.path];
            const hasDirty = barGs?.isDirty;
            const unpushed = needsPush(s.gitStatus);
            if (hasDirty) {
              return `<button class="btn-primary btn-sm" id="btn-sync-bar" data-bar-path="${escapeAttr(bar.path)}"
                ${s.syncing ? 'disabled' : ''} title="${barGs!.dirtyFileCount} unsaved file${barGs!.dirtyFileCount !== 1 ? 's' : ''}">
                ${s.syncing ? '&#8635; Syncing...' : `&#8635; Sync (${barGs!.dirtyFileCount})`}
              </button>`;
            }
            if (unpushed) {
              return `<span class="sync-dot out-of-sync" style="margin-left:4px;" title="Not pushed to remote">&#x2191; Not pushed</span>`;
            }
            return `<span class="sync-dot synced" style="margin-left:4px;">&#10003; Synced</span>`;
          })() : ''}
          ${s.syncing ? `<span class="sync-progress-label">${escapeHtml(s.syncProgress)}</span>` : ''}
        </div>
      </div>
      <div id="drift-indicator-area">${renderDriftIndicator(bar, s)}</div>
      <div class="bar-detail-score">
        ${renderScoreRing(bar.compositeScore, 80, 10)}
        ${trendArrow(s.scoreTrend as GovernanceTrend)}
      </div>
    </div>

    ${s.appYamlEditing ? renderAppYamlEditor(bar, s.appYamlForm) : ''}

    ${bar.pendingDecisions > 0 ? `
      <div class="pending-warning">
        <span style="font-size: 18px;">&#9888;</span>
        <span>${bar.pendingDecisions} pending decision${bar.pendingDecisions !== 1 ? 's' : ''} require attention</span>
      </div>
    ` : ''}

    <div class="section-header">Governance Pillars</div>
    <div class="pillar-grid">
      ${renderPillarCard('Architecture', bar.architecture, s.activePillar, s.gitStatus, s.currentBar, s.pillarTrends)}
      ${renderPillarCard('Security', bar.security, s.activePillar, s.gitStatus, s.currentBar, s.pillarTrends)}
      ${renderPillarCard('Information Risk', bar.infoRisk, s.activePillar, s.gitStatus, s.currentBar, s.pillarTrends)}
      ${renderPillarCard('Operations', bar.operations, s.activePillar, s.gitStatus, s.currentBar, s.pillarTrends)}
    </div>

    ${s.scoreHistory.length > 1 ? `
      <div class="section-header">Score History</div>
      ${renderGovernanceHistoryIndicator(s)}
    ` : ''}

    ${renderActivePillarDetail(
      bar.path, s.activePillar, s.calmData, s.diagrams, s.activeTab,
      s.adrs, s.adrEditingId, s.adrForm, s.diagramFullscreen,
      s.threatModel, s.threatModelGenerating, s.threatModelProgress, s.threatModelProgressPct,
    )}

    ${renderLinkedRepos(bar.repos || [], bar.path, s.openWorkspaceFolders)}

    ${s.calmData ? `
    <div class="white-rabbit-row" style="margin-bottom: 16px;">
      <button class="btn-ghost" id="btn-white-rabbit" data-bar-path="${escapeAttr(bar.path)}" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; width: 100%; border: 1px dashed var(--border); border-radius: 6px; cursor: pointer; font-size: 12px; color: var(--text-muted);">
        <span style="font-size: 16px;">&#x1F407;</span>
        <span>Implement based on architecture</span>
      </button>
      <div style="margin-top: 6px; padding: 0 4px; font-size: 10px; color: var(--text-dim); line-height: 1.6;">
        Passes 6 artifacts to scaffold:
        <span style="opacity: 0.7;">Architecture Context</span> &middot;
        <span style="opacity: 0.7;">ADRs (accepted)</span> &middot;
        <span style="opacity: 0.7;">Threat Model</span> &middot;
        <span style="opacity: 0.7;">Linked Repos</span> &middot;
        <span style="opacity: 0.7;">Scaffold Guidelines</span> &middot;
        <span style="opacity: 0.7;">Prompt Packs</span>
      </div>
    </div>
    ${renderComponentPicker(bar.path, s.componentPicker, portfolioOrg)}
    ` : ''}

    ${s.currentRepoTree.length > 0 ? `
      <div class="section-header">Repository Structure</div>
      <div class="repo-tree">
        ${renderRepoTree(s.currentRepoTree, bar.path)}
      </div>
    ` : ''}

    ${s.currentDecisions.length > 0 ? `
      <div class="section-header">Decisions</div>
      ${renderDecisionsTable(s.currentDecisions)}
    ` : ''}

    ${renderAbsolemFloating(s, bar.path)}
  `;
}

// ============================================================================
// CSS — BAR Detail Styles
// ============================================================================

export function getBarDetailStyles(): string {
  return `
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

      /* Artifact quality indicator */
      .artifact-quality {
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 10px; color: var(--vscode-descriptionForeground); margin-left: auto;
      }

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
      .git-sync-banner.has-dirty {
        background: rgba(210, 153, 34, 0.08); border: 1px solid rgba(210, 153, 34, 0.25); color: var(--warning);
      }
      .git-sync-icon { font-size: 16px; font-weight: 700; }
      .git-sync-banner .btn-sm { padding: 3px 10px; font-size: 11px; margin-left: auto; }

      /* Linked Repos (BAR Detail) */
      .linked-repos { margin-bottom: 16px; }
      .linked-repo-row {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 12px; cursor: pointer; border-radius: var(--radius-sm);
        border: 1px solid var(--border); margin-bottom: 6px;
        transition: background 0.15s;
      }
      .linked-repo-row:hover { background: var(--surface-raised); }
      .linked-repo-active { border-color: var(--accent); background: rgba(124, 58, 237, 0.06); }
      .linked-repo-active:hover { background: rgba(124, 58, 237, 0.1); }
      .linked-repo-icon { font-size: 16px; color: var(--text-dim); flex-shrink: 0; }
      .linked-repo-name { font-size: 12px; color: var(--text); font-weight: 500; }
      .linked-repo-url { font-size: 10px; color: var(--text-muted); }
      .linked-repo-chevron { color: var(--text-dim); font-size: 12px; }
      .linked-repo-badge {
        font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        padding: 2px 8px; border-radius: 10px;
        background: rgba(124, 58, 237, 0.15); color: var(--accent);
      }
      .linked-repos-empty { font-size: 11px; color: var(--text-dim); font-style: italic; padding: 8px 0; }

      /* Component Picker (Implement based on architecture) */
      .component-picker { padding: 16px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 16px; background: var(--surface); }
      .component-picker-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
      .component-list { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
      .component-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
      .component-row:hover { border-color: var(--accent); }
      .component-row.selected { border-color: var(--accent); background: rgba(124, 58, 237, 0.06); }
      .component-type-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; background: var(--surface-alt, var(--surface-raised)); color: var(--text-muted); flex-shrink: 0; }

      /* ---- Pillar Detail: Architecture (ADR + Diagrams) ---- */
      ${getArchitectureStyles()}

      ${getAbsolemStyles()}

      /* ---- Pillar Detail: Security (Threat Model) ---- */
      ${getSecurityStyles()}

      /* ---- Pillar Detail: Info Risk ---- */
      ${getInfoRiskStyles()}

      /* ---- Agent Status (shared component) ---- */
      ${getAgentStatusStyles()}
  `;
}

// ============================================================================
// Event Handlers — BAR Detail
// ============================================================================

export function attachBarDetailEvents(
  vscode: VsCodeApi,
  getState: () => BarDetailRenderState & {
    selectedModelFamily: string;
    repoPickerModal: unknown;
  },
  setState: (updates: Record<string, unknown>) => void,
  render: () => void,
): void {
  const state = getState();

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
    setState({
      view: 'portfolio',
      currentBar: null,
      currentPlatformId: null,
      searchQuery: '',
      barFilter: 'all',
      errorMessage: '',
    });
    vscode.postMessage({ type: 'backToPortfolio' });
    render();
  });

  document.getElementById('breadcrumb-platform')?.addEventListener('click', () => {
    const s = getState();
    if (s.currentBar) {
      setState({
        view: 'portfolio',
        activeLens: 'application',
        currentPlatformId: s.currentBar.platformId,
        currentBar: null,
        searchQuery: '',
        barFilter: 'all',
        errorMessage: '',
      });
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

  // Pillar card clicks — toggle pillar detail panel
  document.querySelectorAll('.pillar-card[data-pillar]').forEach(card => {
    card.addEventListener('click', () => {
      const s = getState();
      const pillar = (card as HTMLElement).dataset.pillar as typeof s.activePillar;
      if (s.activePillar === pillar) {
        setState({ activePillar: null });
      } else {
        setState({ activePillar: pillar });
      }
      render();
    });
  });

  // Close pillar detail panel
  document.getElementById('btn-close-pillar')?.addEventListener('click', () => {
    setState({ activePillar: null });
    render();
  });

  // Drift listeners
  attachDriftListeners(
    vscode,
    getState,
    setState,
    render,
  );
  attachAgentStatusListeners((msg) => vscode.postMessage(msg));

  // App.yaml editor events
  document.getElementById('btn-edit-app-yaml')?.addEventListener('click', () => {
    const s = getState();
    const bar = s.currentBar;
    if (bar) {
      setState({
        appYamlEditing: true,
        appYamlForm: {
          name: bar.name,
          owner: '',
          description: '',
          criticality: bar.criticality,
          lifecycle: bar.lifecycle,
          strategy: bar.strategy,
        },
      });
      render();
    }
  });

  document.getElementById('btn-cancel-app-yaml')?.addEventListener('click', () => {
    setState({ appYamlEditing: false, appYamlForm: null });
    render();
  });
  document.getElementById('btn-cancel-app-yaml-2')?.addEventListener('click', () => {
    setState({ appYamlEditing: false, appYamlForm: null });
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
      setState({ syncing: true, syncProgress: 'Staging changes...' });
      render();
      vscode.postMessage({ type: 'syncBar', barPath });
    }
  });

  // Commit all dirty files in mesh
  document.getElementById('btn-commit-mesh')?.addEventListener('click', () => {
    setState({ syncing: true, syncProgress: 'Committing changes...' });
    render();
    vscode.postMessage({ type: 'commitMesh' });
  });

  // Push mesh to remote (initial push or push ahead commits)
  document.getElementById('btn-push-mesh')?.addEventListener('click', () => {
    setState({ syncing: true, syncProgress: 'Pushing to remote...' });
    render();
    vscode.postMessage({ type: 'pushMesh' });
  });

  // Pull from remote (when behind)
  document.getElementById('btn-pull-mesh')?.addEventListener('click', () => {
    setState({ syncing: true, syncProgress: 'Pulling from remote...' });
    render();
    vscode.postMessage({ type: 'pullMesh' });
  });

  // Delegate to active pillar's event handlers
  if (state.activePillar === 'architecture') {
    attachArchitectureEvents(
      vscode,
      (tab) => {
        setState({ activeTab: tab });
        render();
      },
      (adrId, form) => {
        setState({ adrEditingId: adrId, adrForm: form });
        render();
      },
      () => getState().adrs,
      () => getState().adrEditingId,
      () => getState().adrForm,
    );
  }

  if (state.activePillar === 'security') {
    attachSecurityEvents(
      vscode,
      () => ({ threatModel: getState().threatModel }),
      () => {
        setState({
          threatModel: null,
          threatModelGenerating: true,
          threatModelProgress: 'Starting...',
          threatModelProgressPct: 0,
        });
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

  // ---------- Absolem Floating Chat ----------
  attachAbsolemEvents(
    vscode,
    () => ({
      absolemOpen: getState().absolemOpen,
      absolemMessages: getState().absolemMessages,
      absolemStatus: getState().absolemStatus,
      absolemStreaming: getState().absolemStreaming,
      absolemPatches: getState().absolemPatches,
      currentBarPath: getState().currentBar?.path,
    }),
    (updates) => { setState(updates); },
    render,
  );

  // ---------- Diagram Fullscreen Toggle ----------
  document.getElementById('diagram-fullscreen-toggle')?.addEventListener('click', () => {
    const s = getState();
    setState({ diagramFullscreen: !s.diagramFullscreen });
    render();
  });

  // Close fullscreen on Escape key
  if (state.diagramFullscreen) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState({ diagramFullscreen: false });
        render();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ---------- Linked Repo Clicks ----------
  document.querySelectorAll('.linked-repo-row').forEach(row => {
    row.addEventListener('click', () => {
      const el = row as HTMLElement;
      const repoUrl = el.dataset.repoUrl;
      const barPath = el.dataset.barPath;
      if (!repoUrl || !barPath) { return; }

      if (el.classList.contains('linked-repo-active')) {
        // Repo is open in workspace — navigate to Security Scorecard
        const localPath = el.dataset.localPath;
        if (localPath) {
          vscode.postMessage({ type: 'openScorecard', folderPath: localPath });
        }
      } else {
        // Repo not in workspace — trigger clone/open flow
        vscode.postMessage({ type: 'openRepoInContext', repoUrl, barPath });
      }
    });
  });

  // ---------- Add repo to BAR button ----------
  document.getElementById('btn-add-repo-to-bar')?.addEventListener('click', () => {
    const s = getState();
    const barPath = (document.getElementById('btn-add-repo-to-bar') as HTMLElement)?.dataset.barPath;
    const bar = s.currentBar;
    if (!barPath || !bar) { return; }

    const org = s.portfolio?.portfolio?.org || s.detectedOrg || '';
    setState({
      repoPickerModal: {
        mode: 'add-to-bar',
        barPath,
        barName: bar.name,
        org,
        repos: [],
        selectedRepoNames: new Set(),
        searchQuery: '',
        activeTab: 'browse',
        pastedUrls: '',
        createNewRepoUrl: '',
        loading: !!org,
        error: org ? '' : 'No organization detected. Use the "Add URLs" tab to paste repository URLs manually.',
      },
    });
    render();
    if (org) {
      vscode.postMessage({ type: 'loadOrgRepos', org });
    }
  });

  // White Rabbit button — opens component picker from CALM architecture
  document.getElementById('btn-white-rabbit')?.addEventListener('click', () => {
    const barPath = (document.getElementById('btn-white-rabbit') as HTMLElement)?.dataset.barPath;
    if (!barPath) { return; }
    // Request CALM components from extension host
    vscode.postMessage({ type: 'getCalmComponents', barPath });
  });

  // Component picker — select a component row
  document.querySelectorAll('.component-row').forEach(row => {
    row.addEventListener('click', () => {
      const s = getState();
      if (!s.componentPicker) { return; }
      const el = row as HTMLElement;
      setState({
        componentPicker: {
          ...s.componentPicker,
          selectedId: el.dataset.componentId || '',
          repoName: el.dataset.suggestedRepo || '',
        },
      });
      render();
    });
  });

  // Component picker — repo name input
  const compRepoInput = document.getElementById('component-repo-name') as HTMLInputElement | null;
  if (compRepoInput) {
    compRepoInput.addEventListener('input', () => {
      const s = getState();
      if (s.componentPicker) {
        setState({
          componentPicker: {
            ...s.componentPicker,
            repoName: compRepoInput.value.trim(),
          },
        });
        const btn = document.getElementById('component-picker-scaffold') as HTMLButtonElement | null;
        if (btn) { btn.disabled = !compRepoInput.value.trim(); }
      }
    });
  }

  // Component picker — scaffold button
  document.getElementById('component-picker-scaffold')?.addEventListener('click', () => {
    const s = getState();
    const cp = s.componentPicker;
    if (!cp || !cp.repoName) { return; }
    const selected = cp.components.find(c => c.id === cp.selectedId);
    const org = s.portfolio?.portfolio?.org || s.detectedOrg || '';
    const repoUrl = org ? `https://github.com/${org}/${cp.repoName}` : cp.repoName;

    console.log(`[component-scaffold] org="${org}" barPath="${cp.barPath}" repoUrl="${repoUrl}"`);

    // 1. Add repo to app.yaml first (same proven path as +Add)
    if (cp.barPath) {
      console.log(`[component-scaffold] sending addReposToBar`);
      vscode.postMessage({ type: 'addReposToBar', barPath: cp.barPath, repoUrls: [repoUrl] });
    } else {
      console.warn(`[component-scaffold] SKIPPED addReposToBar — barPath is empty`);
    }

    // 2. Then transition to scaffold, scoped to this component
    vscode.postMessage({
      type: 'implementComponent',
      barPath: cp.barPath,
      componentId: cp.selectedId,
      repoName: cp.repoName,
      componentName: selected?.name || cp.repoName,
      componentType: selected?.type || 'service',
      componentDescription: selected?.description || '',
    });
    setState({ componentPicker: null });
    render();
  });

  // Component picker — cancel
  document.getElementById('component-picker-cancel')?.addEventListener('click', () => {
    setState({ componentPicker: null });
    render();
  });
  document.getElementById('component-picker-cancel-btn')?.addEventListener('click', () => {
    setState({ componentPicker: null });
    render();
  });
}
