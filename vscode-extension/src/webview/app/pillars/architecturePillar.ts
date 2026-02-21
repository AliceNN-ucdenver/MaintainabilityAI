// ============================================================================
// Architecture Pillar — Detail renderer
// Renders CALM Architecture Views with tabbed mermaid diagrams + ADR management
// ============================================================================

import { escapeHtml, escapeAttr } from './shared';
import type { VsCodeApi } from './shared';

export interface ArchitectureDiagrams {
  sequence?: string;
  capability?: string;
}

// Single unified CALM architecture data (bar.arch.json)
// Context and Logical are view projections of the same data.
export type CalmDataPayload = object | null;

export type AdrLinkType = 'supersedes' | 'depends-on' | 'related';

export interface AdrLink {
  type: AdrLinkType;
  targetId: string;
}

export interface AdrCharacteristics {
  reversibility: number;
  cost: number;
  risk: number;
  complexity: number;
  effort: number;
}

export interface AdrRecord {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  date: string;
  deciders: string;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  references?: string;
  links?: AdrLink[];
  characteristics?: AdrCharacteristics;
}

// ============================================================================
// Render
// ============================================================================

export function renderArchitectureDetail(
  calmData: CalmDataPayload,
  mermaidDiagrams: ArchitectureDiagrams | null,
  activeTab: string,
  adrs: AdrRecord[],
  adrEditingId: string | null,
  adrForm: Partial<AdrRecord> | null,
  barPath: string,
): string {
  const diagramSection = renderDiagramSection(calmData, mermaidDiagrams, activeTab, barPath);
  const adrSection = renderAdrSection(adrs, adrEditingId, adrForm, barPath);

  return `${diagramSection}${adrSection}`;
}

function renderDiagramSection(
  calmData: CalmDataPayload,
  mermaidDiagrams: ArchitectureDiagrams | null,
  activeTab: string,
  barPath: string,
): string {
  const hasCalmData = !!calmData;
  const hasMermaid = mermaidDiagrams && (mermaidDiagrams.sequence || mermaidDiagrams.capability);

  if (!hasCalmData && !hasMermaid) {
    return `
      <div class="section-subheader">Architecture Views</div>
      <div class="pillar-detail-empty">
        <p>No CALM architecture files found.</p>
        <p style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
          Start from an Architecture Archetype to bootstrap your design, or add bar.arch.json to the architecture/ directory.
        </p>
        <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
          <button class="apply-archetype-btn" data-archetype="three-tier" data-bar-path="${escapeAttr(barPath)}"
            style="background: var(--accent-bg); border: 1px solid var(--accent); border-radius: 6px; padding: 10px 14px; cursor: pointer; text-align: left; flex: 1; min-width: 180px;">
            <div style="font-weight: 700; font-size: 12px; color: var(--accent); margin-bottom: 4px;">Three-Tier Web App</div>
            <div style="font-size: 10px; color: var(--text-muted); line-height: 1.3;">Web client, API server, auth service, database</div>
          </button>
          <button class="apply-archetype-btn" data-archetype="event-driven" data-bar-path="${escapeAttr(barPath)}"
            style="background: var(--accent-bg); border: 1px solid var(--accent); border-radius: 6px; padding: 10px 14px; cursor: pointer; text-align: left; flex: 1; min-width: 180px;">
            <div style="font-weight: 700; font-size: 12px; color: var(--accent); margin-bottom: 4px;">Event-Driven Microservices</div>
            <div style="font-size: 10px; color: var(--text-muted); line-height: 1.3;">API gateway, message broker, async services</div>
          </button>
          <button class="apply-archetype-btn" data-archetype="data-pipeline" data-bar-path="${escapeAttr(barPath)}"
            style="background: var(--accent-bg); border: 1px solid var(--accent); border-radius: 6px; padding: 10px 14px; cursor: pointer; text-align: left; flex: 1; min-width: 180px;">
            <div style="font-weight: 700; font-size: 12px; color: var(--accent); margin-bottom: 4px;">Data Pipeline</div>
            <div style="font-size: 10px; color: var(--text-muted); line-height: 1.3;">Ingestion, transformation, serving layers</div>
          </button>
        </div>
      </div>
    `;
  }

  // Build tabs: ReactFlow tabs first (context, logical), then Mermaid tabs (sequence, capability)
  // Both context and logical views are always available when CALM data exists (they are projections of the same data)
  const tabs: { key: string; label: string; renderer: 'reactflow' | 'mermaid' }[] = [];
  if (hasCalmData) {
    tabs.push({ key: 'context', label: 'Context', renderer: 'reactflow' });
    tabs.push({ key: 'logical', label: 'Logical', renderer: 'reactflow' });
  }
  if (mermaidDiagrams?.sequence) { tabs.push({ key: 'sequence', label: 'Sequence', renderer: 'mermaid' }); }
  if (mermaidDiagrams?.capability) { tabs.push({ key: 'capability', label: 'Capability', renderer: 'mermaid' }); }

  if (tabs.length === 0) {
    return `
      <div class="section-subheader">Architecture Views</div>
      <div class="pillar-detail-empty">
        <p>No architecture diagrams available. Generate CALM artifacts to view architecture diagrams.</p>
      </div>
    `;
  }

  const resolvedTab = tabs.find(t => t.key === activeTab) ? activeTab : tabs[0].key;
  const activeTabInfo = tabs.find(t => t.key === resolvedTab)!;

  const tabBar = tabs.map(t => `
    <button class="arch-tab ${t.key === resolvedTab ? 'active' : ''}"
      data-diagram-tab="${t.key}">${escapeHtml(t.label)}</button>
  `).join('');

  // Render content based on tab renderer type
  let diagramContent: string;
  if (activeTabInfo.renderer === 'reactflow') {
    // ReactFlow mount point — React will mount here after render
    diagramContent = `
      <div class="reactflow-diagram-container" style="height: 500px; position: relative; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
        <div id="reactflow-canvas-mount"
             data-diagram-type="${escapeAttr(resolvedTab)}"
             data-bar-path="${escapeAttr(barPath)}"
             style="width: 100%; height: 100%;"></div>
      </div>
    `;
  } else {
    // Mermaid diagram
    const activeDiagram = (mermaidDiagrams as Record<string, string | undefined>)?.[resolvedTab] || '';
    diagramContent = `
      <div class="diagram-container">
        <div class="mermaid-diagram" data-diagram="${escapeAttr(activeDiagram)}"></div>
      </div>
      <details class="diagram-source">
        <summary>View Source</summary>
        <pre>${escapeHtml(activeDiagram)}</pre>
      </details>
    `;
  }

  return `
    <div class="section-subheader">Architecture Views</div>
    <div class="arch-views">
      <div class="arch-tabs">${tabBar}</div>
      ${diagramContent}
    </div>
  `;
}

// ============================================================================
// ADR Section
// ============================================================================

function renderAdrSection(
  adrs: AdrRecord[],
  editingId: string | null,
  form: Partial<AdrRecord> | null,
  barPath: string,
): string {
  const isCreating = editingId === '__new__';
  const isEditing = editingId !== null && editingId !== '__new__';

  const header = `
    <div class="section-subheader" style="display: flex; align-items: center; justify-content: space-between; margin-top: 24px;">
      <span>Architecture Decision Records</span>
      ${!editingId ? `<button class="btn-primary btn-sm" id="btn-adr-create" data-bar-path="${escapeAttr(barPath)}">New ADR</button>` : ''}
    </div>
  `;

  // ADR form (create or edit)
  if ((isCreating || isEditing) && form) {
    return `${header}${renderAdrForm(form, editingId!, barPath, adrs)}`;
  }

  // ADR list
  if (adrs.length === 0) {
    return `${header}
      <div class="pillar-detail-empty">
        <p>No architecture decisions recorded yet. Create an ADR to document key decisions.</p>
      </div>
    `;
  }

  const adrCards = adrs.map(adr => {
    const statusClass = adr.status === 'accepted' ? 'adr-status-accepted'
      : adr.status === 'deprecated' ? 'adr-status-deprecated'
      : adr.status === 'superseded' ? 'adr-status-superseded'
      : 'adr-status-proposed';

    return `
      <div class="adr-card" data-adr-id="${escapeAttr(adr.id)}">
        <div class="adr-card-header">
          <div class="adr-card-title">
            <code class="adr-id">${escapeHtml(adr.id)}</code>
            <span class="adr-title">${escapeHtml(adr.title)}</span>
          </div>
          <div class="adr-card-meta">
            <span class="adr-status ${statusClass}">${escapeHtml(adr.status)}</span>
            ${adr.date ? `<span class="adr-date">${escapeHtml(adr.date)}</span>` : ''}
          </div>
        </div>
        <div class="adr-card-body">
          <div class="adr-field"><strong>Context:</strong> ${escapeHtml(truncate(adr.context, 120))}</div>
          <div class="adr-field"><strong>Decision:</strong> ${escapeHtml(truncate(adr.decision, 120))}</div>
        </div>
        ${renderCharacteristicsBars(adr.characteristics)}
        ${renderLinkBadges(adr.links)}
        <div class="adr-card-actions">
          <button class="btn-ghost btn-sm" data-adr-edit="${escapeAttr(adr.id)}" data-bar-path="${escapeAttr(barPath)}">Edit</button>
          <button class="btn-ghost btn-sm" data-adr-delete="${escapeAttr(adr.id)}" data-bar-path="${escapeAttr(barPath)}" style="color: var(--failing);">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  return `${header}<div class="adr-list">${adrCards}</div>`;
}

function renderAdrForm(form: Partial<AdrRecord>, editingId: string, barPath: string, allAdrs: AdrRecord[]): string {
  const isNew = editingId === '__new__';
  const title = isNew ? 'New Architecture Decision' : `Edit ${editingId}`;

  return `
    <div class="adr-form">
      <div class="adr-form-title">${escapeHtml(title)}</div>

      <div class="form-row">
        <label>Title</label>
        <input type="text" id="adr-title" value="${escapeAttr(form.title || '')}" placeholder="e.g., Adopt PostgreSQL for primary datastore" />
      </div>

      <div class="form-row-inline">
        <div class="form-row" style="flex: 1;">
          <label>Status</label>
          <select id="adr-status">
            <option value="proposed" ${form.status === 'proposed' ? 'selected' : ''}>Proposed</option>
            <option value="accepted" ${form.status === 'accepted' ? 'selected' : ''}>Accepted</option>
            <option value="deprecated" ${form.status === 'deprecated' ? 'selected' : ''}>Deprecated</option>
            <option value="superseded" ${form.status === 'superseded' ? 'selected' : ''}>Superseded</option>
          </select>
        </div>
        <div class="form-row" style="flex: 1;">
          <label>Deciders</label>
          <input type="text" id="adr-deciders" value="${escapeAttr(form.deciders || '')}" placeholder="Who made this decision" />
        </div>
      </div>

      <div class="form-row">
        <label>Context</label>
        <textarea id="adr-context" rows="3" placeholder="Background and forces at play...">${escapeHtml(form.context || '')}</textarea>
      </div>

      <div class="form-row">
        <label>Decision</label>
        <textarea id="adr-decision" rows="3" placeholder="The chosen approach...">${escapeHtml(form.decision || '')}</textarea>
      </div>

      <div class="form-row">
        <label>Consequences</label>
        <textarea id="adr-consequences" rows="3" placeholder="Positive and negative outcomes...">${escapeHtml(form.consequences || '')}</textarea>
      </div>

      <div class="form-row">
        <label>Alternatives Considered</label>
        <textarea id="adr-alternatives" rows="2" placeholder="Other options that were evaluated...">${escapeHtml(form.alternatives || '')}</textarea>
      </div>

      <div class="form-row">
        <label>References</label>
        <textarea id="adr-references" rows="2" placeholder="Links to diagrams, code, related ADRs...">${escapeHtml(form.references || '')}</textarea>
      </div>

      ${renderCharacteristicsSliders(form.characteristics)}
      ${renderLinksEditor(form.links, allAdrs, editingId)}

      <div class="adr-form-actions">
        <button class="btn-secondary btn-sm" id="btn-adr-cancel">Cancel</button>
        <button class="btn-primary btn-sm" id="btn-adr-save"
          data-bar-path="${escapeAttr(barPath)}"
          data-adr-editing="${escapeAttr(editingId)}">
          ${isNew ? 'Create ADR' : 'Save Changes'}
        </button>
      </div>
    </div>
  `;
}

function renderCharacteristicsBars(chars: AdrCharacteristics | undefined): string {
  if (!chars) { return ''; }
  const dims: { key: keyof AdrCharacteristics; label: string }[] = [
    { key: 'reversibility', label: 'REV' },
    { key: 'cost', label: 'CST' },
    { key: 'risk', label: 'RSK' },
    { key: 'complexity', label: 'CPX' },
    { key: 'effort', label: 'EFF' },
  ];
  const bars = dims.map(d => {
    const val = chars[d.key] || 0;
    if (val === 0) { return ''; }
    const colorClass = val <= 2 ? 'char-bar-red' : val === 3 ? 'char-bar-yellow' : 'char-bar-green';
    const pct = (val / 5) * 100;
    return `
      <div class="char-bar">
        <span class="char-bar-label">${d.label}</span>
        <div class="char-bar-track"><div class="char-bar-fill ${colorClass}" style="width: ${pct}%"></div></div>
        <span class="char-bar-value">${val}</span>
      </div>
    `;
  }).filter(Boolean).join('');
  if (!bars) { return ''; }
  return `<div class="adr-characteristics">${bars}</div>`;
}

function renderLinkBadges(links: AdrLink[] | undefined): string {
  if (!links || links.length === 0) { return ''; }
  const badges = links.map(l => {
    const cls = l.type === 'supersedes' ? 'adr-link-supersedes'
      : l.type === 'depends-on' ? 'adr-link-depends'
      : 'adr-link-related';
    return `<span class="adr-link-badge ${cls}">${escapeHtml(l.type)}: ${escapeHtml(l.targetId)}</span>`;
  }).join('');
  return `<div class="adr-links">${badges}</div>`;
}

function renderCharacteristicsSliders(chars: AdrCharacteristics | undefined): string {
  const dims: { key: keyof AdrCharacteristics; label: string; low: string; high: string }[] = [
    { key: 'reversibility', label: 'Reversibility', low: 'Irreversible', high: 'Easily reversed' },
    { key: 'cost', label: 'Cost', low: 'Very high', high: 'Minimal' },
    { key: 'risk', label: 'Risk', low: 'Very high', high: 'Minimal' },
    { key: 'complexity', label: 'Complexity', low: 'Very complex', high: 'Simple' },
    { key: 'effort', label: 'Effort', low: 'Very high', high: 'Minimal' },
  ];
  const rows = dims.map(d => {
    const val = chars?.[d.key] || 0;
    const buttons = [1, 2, 3, 4, 5].map(n => {
      const active = n === val ? 'char-btn-active' : '';
      const colorClass = n <= 2 ? 'char-btn-red' : n === 3 ? 'char-btn-yellow' : 'char-btn-green';
      return `<button type="button" class="char-btn ${active} ${colorClass}" data-char-key="${d.key}" data-char-value="${n}">${n}</button>`;
    }).join('');
    return `
      <div class="char-slider-row">
        <span class="char-slider-name">${d.label}</span>
        <span class="char-slider-low">${d.low}</span>
        <div class="char-slider-buttons">${buttons}</div>
        <span class="char-slider-high">${d.high}</span>
      </div>
    `;
  }).join('');
  return `
    <div class="form-row">
      <label>Decision Characteristics (BTABoK)</label>
      <div class="char-sliders">${rows}</div>
    </div>
  `;
}

function renderLinksEditor(links: AdrLink[] | undefined, allAdrs: AdrRecord[], editingId: string): string {
  const existing = (links || []).map((l, i) => `
    <div class="adr-link-row">
      <span class="adr-link-badge ${l.type === 'supersedes' ? 'adr-link-supersedes' : l.type === 'depends-on' ? 'adr-link-depends' : 'adr-link-related'}">${escapeHtml(l.type)}: ${escapeHtml(l.targetId)}</span>
      <button type="button" class="btn-ghost btn-sm adr-link-remove" data-link-index="${i}">&times;</button>
    </div>
  `).join('');

  const otherAdrs = allAdrs.filter(a => a.id !== editingId);
  const targetOptions = otherAdrs.length > 0
    ? otherAdrs.map(a => `<option value="${escapeAttr(a.id)}">${escapeHtml(a.id)}: ${escapeHtml(truncate(a.title, 30))}</option>`).join('')
    : '<option value="" disabled>No other ADRs available</option>';

  return `
    <div class="form-row">
      <label>Linked Decisions</label>
      <div class="adr-links-editor">
        ${existing}
        <div class="adr-link-add">
          <select id="adr-link-type">
            <option value="related">related</option>
            <option value="depends-on">depends-on</option>
            <option value="supersedes">supersedes</option>
          </select>
          <select id="adr-link-target">
            ${targetOptions}
          </select>
          <button type="button" class="btn-ghost btn-sm" id="btn-adr-add-link" ${otherAdrs.length === 0 ? 'disabled' : ''}>+</button>
        </div>
      </div>
    </div>
  `;
}

function truncate(text: string, max: number): string {
  if (!text) { return ''; }
  return text.length > max ? text.slice(0, max) + '...' : text;
}

// ============================================================================
// Events
// ============================================================================

export function attachArchitectureEvents(
  vscode: VsCodeApi,
  onTabSwitch: (tab: string) => void,
  onAdrEdit: (adrId: string | null, form: Partial<AdrRecord> | null) => void,
  getAdrs: () => AdrRecord[],
  getEditingId: () => string | null,
  getForm: () => Partial<AdrRecord> | null,
): void {
  // Diagram tab switching
  document.querySelectorAll('[data-diagram-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      onTabSwitch((tab as HTMLElement).getAttribute('data-diagram-tab') || 'context');
    });
  });

  // ADR create
  document.getElementById('btn-adr-create')?.addEventListener('click', () => {
    const barPath = (document.getElementById('btn-adr-create') as HTMLElement)?.dataset.barPath;
    if (barPath) {
      onAdrEdit('__new__', {
        title: '',
        status: 'proposed',
        date: new Date().toISOString().split('T')[0],
        deciders: '',
        context: '',
        decision: '',
        consequences: '',
        alternatives: '',
        references: '',
        links: [],
        characteristics: undefined,
      });
    }
  });

  // ADR edit buttons
  document.querySelectorAll('[data-adr-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const adrId = (btn as HTMLElement).dataset.adrEdit;
      if (!adrId) { return; }
      const adrs = getAdrs();
      const adr = adrs.find(a => a.id === adrId);
      if (adr) {
        onAdrEdit(adrId, { ...adr, links: adr.links ? [...adr.links] : [], characteristics: adr.characteristics ? { ...adr.characteristics } : undefined });
      }
    });
  });

  // ADR delete buttons
  document.querySelectorAll('[data-adr-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const adrId = (btn as HTMLElement).dataset.adrDelete;
      const barPath = (btn as HTMLElement).dataset.barPath;
      if (adrId && barPath) {
        vscode.postMessage({ type: 'deleteAdr', barPath, adrId });
      }
    });
  });

  // ADR cancel
  document.getElementById('btn-adr-cancel')?.addEventListener('click', () => {
    onAdrEdit(null, null);
  });

  // Characteristic button clicks
  document.querySelectorAll('.char-btn[data-char-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const key = el.dataset.charKey as keyof AdrCharacteristics;
      const value = parseInt(el.dataset.charValue || '0', 10);
      if (!key || !value) { return; }
      const form = getForm();
      if (!form) { return; }
      const chars = form.characteristics || { reversibility: 0, cost: 0, risk: 0, complexity: 0, effort: 0 };
      // Toggle: click same value to deselect
      chars[key] = chars[key] === value ? 0 : value;
      form.characteristics = chars;
      onAdrEdit(getEditingId(), form);
    });
  });

  // Add link button
  document.getElementById('btn-adr-add-link')?.addEventListener('click', () => {
    const typeEl = document.getElementById('adr-link-type') as HTMLSelectElement;
    const targetEl = document.getElementById('adr-link-target') as HTMLSelectElement;
    if (!typeEl || !targetEl || !targetEl.value) { return; }
    const form = getForm();
    if (!form) { return; }
    const links = form.links || [];
    // Prevent duplicate
    const linkType = typeEl.value as AdrLinkType;
    const targetId = targetEl.value;
    if (links.some(l => l.type === linkType && l.targetId === targetId)) { return; }
    links.push({ type: linkType, targetId });
    form.links = links;
    onAdrEdit(getEditingId(), form);
  });

  // Remove link buttons
  document.querySelectorAll('.adr-link-remove[data-link-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt((btn as HTMLElement).dataset.linkIndex || '-1', 10);
      if (idx < 0) { return; }
      const form = getForm();
      if (!form || !form.links) { return; }
      form.links.splice(idx, 1);
      onAdrEdit(getEditingId(), form);
    });
  });

  // ADR save — read text fields from DOM, but links + characteristics from form state
  document.getElementById('btn-adr-save')?.addEventListener('click', () => {
    const el = document.getElementById('btn-adr-save') as HTMLElement;
    const barPath = el?.dataset.barPath;
    const editingId = el?.dataset.adrEditing;
    if (!barPath || !editingId) { return; }

    const form = getForm();

    const adr: Record<string, unknown> = {
      id: editingId === '__new__' ? '' : editingId,
      title: (document.getElementById('adr-title') as HTMLInputElement)?.value || '',
      status: (document.getElementById('adr-status') as HTMLSelectElement)?.value || 'proposed',
      date: new Date().toISOString().split('T')[0],
      deciders: (document.getElementById('adr-deciders') as HTMLInputElement)?.value || '',
      context: (document.getElementById('adr-context') as HTMLTextAreaElement)?.value || '',
      decision: (document.getElementById('adr-decision') as HTMLTextAreaElement)?.value || '',
      consequences: (document.getElementById('adr-consequences') as HTMLTextAreaElement)?.value || '',
      alternatives: (document.getElementById('adr-alternatives') as HTMLTextAreaElement)?.value || '',
      references: (document.getElementById('adr-references') as HTMLTextAreaElement)?.value || '',
      links: form?.links && form.links.length > 0 ? form.links : undefined,
      characteristics: form?.characteristics && Object.values(form.characteristics).some(v => v > 0) ? form.characteristics : undefined,
    };

    if (!(adr.title as string).trim()) { return; } // Title required

    if (editingId === '__new__') {
      vscode.postMessage({ type: 'createAdr', barPath, adr });
    } else {
      vscode.postMessage({ type: 'updateAdr', barPath, adr });
    }
  });

  // Architecture Archetype buttons
  document.querySelectorAll('.apply-archetype-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const archetypeId = el.dataset.archetype;
      const barPath = el.dataset.barPath;
      if (!archetypeId || !barPath) return;

      // Extract app name from barPath (last directory name)
      const appName = barPath.split('/').filter(Boolean).pop() || 'Application';

      vscode.postMessage({
        type: 'applyArchetype',
        barPath,
        archetypeId,
        appName,
      });
    });
  });
}

// ============================================================================
// Styles
// ============================================================================

export function getArchitectureStyles(): string {
  return `
    .adr-list { display: flex; flex-direction: column; gap: 8px; margin: 8px 0; }
    .adr-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
      padding: 12px; transition: border-color 0.15s;
    }
    .adr-card:hover { border-color: var(--accent); }
    .adr-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .adr-card-title { display: flex; align-items: center; gap: 8px; }
    .adr-id { font-size: 11px; color: var(--accent); background: var(--accent-bg); padding: 1px 6px; border-radius: 4px; }
    .adr-title { font-size: 13px; font-weight: 600; color: var(--text); }
    .adr-card-meta { display: flex; align-items: center; gap: 8px; }
    .adr-status {
      font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 2px 8px;
      border-radius: 10px; letter-spacing: 0.3px;
    }
    .adr-status-proposed { background: rgba(136, 98, 255, 0.15); color: var(--accent); }
    .adr-status-accepted { background: rgba(63, 185, 80, 0.15); color: var(--passing); }
    .adr-status-deprecated { background: rgba(210, 153, 34, 0.15); color: var(--warning); }
    .adr-status-superseded { background: rgba(139, 148, 158, 0.15); color: var(--text-muted); }
    .adr-date { font-size: 11px; color: var(--text-dim); }
    .adr-card-body { margin-bottom: 8px; }
    .adr-field { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
    .adr-field strong { color: var(--text); }
    .adr-card-actions { display: flex; gap: 4px; justify-content: flex-end; }

    .adr-form {
      background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
      padding: 16px; margin: 8px 0;
    }
    .adr-form-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 12px; }
    .adr-form .form-row { margin-bottom: 10px; }
    .adr-form .form-row label {
      display: block; font-size: 11px; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;
    }
    .adr-form .form-row input,
    .adr-form .form-row textarea,
    .adr-form .form-row select {
      width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
      color: var(--text); font-size: 12px; padding: 8px 10px; font-family: inherit;
      outline: none; transition: border-color 0.15s; resize: vertical;
    }
    .adr-form .form-row input:focus,
    .adr-form .form-row textarea:focus,
    .adr-form .form-row select:focus { border-color: var(--accent); }
    .form-row-inline { display: flex; gap: 12px; }
    .adr-form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }

    /* Characteristics mini-bars (card view) */
    .adr-characteristics { display: flex; gap: 8px; flex-wrap: wrap; margin: 6px 0; }
    .char-bar { display: flex; align-items: center; gap: 4px; min-width: 80px; }
    .char-bar-label { font-size: 9px; font-weight: 700; color: var(--text-dim); width: 24px; text-align: right; letter-spacing: 0.3px; }
    .char-bar-track { flex: 1; height: 5px; background: var(--bg); border-radius: 3px; min-width: 32px; }
    .char-bar-fill { height: 100%; border-radius: 3px; transition: width 0.2s; }
    .char-bar-red { background: var(--failing, #e5534b); }
    .char-bar-yellow { background: var(--warning, #d29922); }
    .char-bar-green { background: var(--passing, #3fb950); }
    .char-bar-value { font-size: 9px; color: var(--text-dim); width: 10px; }

    /* Link badges (card view) */
    .adr-links { display: flex; gap: 4px; flex-wrap: wrap; margin: 6px 0; }
    .adr-link-badge {
      font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px;
      letter-spacing: 0.2px;
    }
    .adr-link-supersedes { background: rgba(210, 120, 34, 0.15); color: #d27822; }
    .adr-link-depends { background: rgba(136, 98, 255, 0.15); color: var(--accent); }
    .adr-link-related { background: rgba(139, 148, 158, 0.15); color: var(--text-muted); }

    /* Characteristics sliders (form) */
    .char-sliders { display: flex; flex-direction: column; gap: 6px; }
    .char-slider-row { display: flex; align-items: center; gap: 8px; }
    .char-slider-name { font-size: 11px; font-weight: 600; color: var(--text); width: 90px; }
    .char-slider-low, .char-slider-high { font-size: 9px; color: var(--text-dim); width: 72px; }
    .char-slider-low { text-align: right; }
    .char-slider-high { text-align: left; }
    .char-slider-buttons { display: flex; gap: 3px; }
    .char-btn {
      width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--border);
      background: var(--bg); color: var(--text-muted); font-size: 10px; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .char-btn:hover { border-color: var(--accent); }
    .char-btn-active.char-btn-red { background: var(--failing, #e5534b); color: #fff; border-color: var(--failing, #e5534b); }
    .char-btn-active.char-btn-yellow { background: var(--warning, #d29922); color: #fff; border-color: var(--warning, #d29922); }
    .char-btn-active.char-btn-green { background: var(--passing, #3fb950); color: #fff; border-color: var(--passing, #3fb950); }

    /* Links editor (form) */
    .adr-links-editor { display: flex; flex-direction: column; gap: 6px; }
    .adr-link-row { display: flex; align-items: center; gap: 6px; }
    .adr-link-remove { font-size: 14px; color: var(--failing); cursor: pointer; padding: 0 4px; }
    .adr-link-add { display: flex; gap: 6px; align-items: center; }
    .adr-link-add select {
      background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
      color: var(--text); font-size: 11px; padding: 4px 8px;
    }
  `;
}
