// EA Lenses — Business capability model, lens tabs, drill-down, model switcher
// Stateless renderers: state slices passed as parameters

import { escapeHtml, escapeAttr } from '../pillars/shared';
import type {
  VsCodeApi, EaLens, CapabilityNode, CapabilityModelSummary,
  CapabilityModelType, BarSummary,
} from '../types';

/* ------------------------------------------------------------------ */
/*  State slice received from lookingGlass.ts                         */
/* ------------------------------------------------------------------ */

export interface EaLensRenderState {
  activeLens: EaLens;
  capabilityModel: CapabilityModelSummary | null;
  capabilityDrillPath: string[];
  portfolio: { allBars: BarSummary[] } | null;
}

/* ------------------------------------------------------------------ */
/*  Render functions                                                  */
/* ------------------------------------------------------------------ */

export function renderEaLensTabs(activeLens: EaLens): string {
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
        <button class="ea-lens-tab${activeLens === l.id ? ' active' : ''}${!l.enabled ? ' disabled' : ''}"
                data-lens="${l.id}" ${!l.enabled ? 'title="Coming Soon"' : ''}>
          <span class="lens-dot ${l.id}"></span>
          ${escapeHtml(l.label)}
          ${!l.enabled ? '<span class="coming-soon">Coming Soon</span>' : ''}
        </button>
      `).join('')}
    </div>
  `;
}

export function renderBusinessCapabilityView(
  s: EaLensRenderState,
  renderAppTileGrid: (bars: BarSummary[]) => string,
): string {
  const model = s.capabilityModel;
  if (!model) {
    return `
      ${renderModelSwitcher(null)}
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <p>No capability model configured.</p>
        <p style="font-size: 11px;">Select a model above, or initialize a new mesh with a capability model.</p>
      </div>`;
  }

  const drillPath = s.capabilityDrillPath;
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
  return breadcrumb + renderL3WithBars(children, model, s.portfolio?.allBars || [], renderAppTileGrid);
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

function renderL3WithBars(
  l3Nodes: CapabilityNode[],
  model: CapabilityModelSummary,
  allBars: BarSummary[],
  renderAppTileGrid: (bars: BarSummary[]) => string,
): string {
  if (l3Nodes.length === 0) {
    return '<div style="padding: 20px; color: var(--text-muted); text-align: center;">No L3 capabilities defined.</div>';
  }

  return l3Nodes.map(l3 => {
    const barPaths = model.capabilityToBarMap[l3.key] || [];
    const bars = barPaths
      .map(bp => allBars.find(b => b.path === bp))
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

export function renderModelSwitcher(model: CapabilityModelSummary | null): string {
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

/* ------------------------------------------------------------------ */
/*  Event wiring                                                      */
/* ------------------------------------------------------------------ */

export function attachEaLensEvents(
  vscode: VsCodeApi,
  getState: () => { activeLens: EaLens; capabilityDrillPath: string[]; policies: unknown[]; currentPlatformId: string | null; searchQuery: string; barFilter: string },
  setState: (updates: Record<string, unknown>) => void,
  render: () => void,
): void {
  // ---------- EA Lens Tabs ----------
  document.querySelectorAll('.ea-lens-tab:not(.disabled)').forEach(tab => {
    tab.addEventListener('click', () => {
      const lens = (tab as HTMLElement).dataset.lens as EaLens;
      if (lens) {
        setState({ activeLens: lens, capabilityDrillPath: [], currentPlatformId: null, showPlatformArch: false, platformCalmData: null });
        // Load policies on first switch to policies tab
        if (lens === 'policies' && (getState().policies as unknown[]).length === 0) {
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
        const s = getState();
        const newPath = [...s.capabilityDrillPath, key];
        setState({ capabilityDrillPath: newPath });
        render();
      }
    });
  });

  // ---------- Capability Breadcrumb Navigation ----------
  document.getElementById('cap-breadcrumb-root')?.addEventListener('click', (e) => {
    e.preventDefault();
    setState({ capabilityDrillPath: [] });
    render();
  });

  document.querySelectorAll('.cap-breadcrumb-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt((link as HTMLElement).dataset.drillIndex || '0', 10);
      const s = getState();
      setState({ capabilityDrillPath: s.capabilityDrillPath.slice(0, idx + 1) });
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
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

export function getEaLensStyles(): string {
  return `
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
  `;
}
