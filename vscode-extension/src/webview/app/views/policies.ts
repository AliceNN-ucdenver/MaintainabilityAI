// ============================================================================
// Policies — Governance Policy viewer & NIST controls (extracted from lookingGlass.ts)
// Stateless renderer: receives state slices as params, uses callbacks for mutations
// ============================================================================

import { escapeHtml, escapeAttr } from '../pillars/shared';
import type { VsCodeApi, PolicyFile, NistControl, EaLens } from '../types';

// ============================================================================
// State shape passed to render functions
// ============================================================================

export interface PolicyRenderState {
  policies: PolicyFile[];
  nistControls: NistControl[];
  selectedPolicy: string | null;
  policyEditing: boolean;
  policyEditContent: string;
  policyViewRaw: boolean;
  policySearch: string;
  nistSearch: string;
  nistControlPopup: NistControl | null;
  policyGenerating: string | null;
  policyGenerateStep: string;
  policyGenerateProgress: number;
  activeLens: EaLens;
}

// ============================================================================
// Render — Policies Lens Content
// ============================================================================

export function renderPoliciesLensContent(
  s: PolicyRenderState,
  postMessage: (msg: Record<string, unknown>) => void,
): string {
  // If policies haven't been loaded yet, request them
  if (s.policies.length === 0 && s.nistControls.length === 0) {
    postMessage({ type: 'loadPolicies' });
    return `<div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading policies...</div>`;
  }

  // Default selectedPolicy to the NIST card if available and nothing selected
  const nistPolicy = s.policies.find(p => p.pillar === 'nist');
  const effectiveSelection = s.selectedPolicy || (nistPolicy ? nistPolicy.filename : s.policies[0]?.filename || null);

  // Always show cards + inline content section below
  return `
    <div class="section-header">Governance Policies</div>
    ${renderPolicyCards(s, effectiveSelection)}
    <div style="margin-top: 24px;">
      ${renderPolicyContentSection(s, effectiveSelection)}
    </div>
  `;
}

// ============================================================================
// Render — Policy Cards
// ============================================================================

function renderPolicyCards(s: PolicyRenderState, activeFilename: string | null): string {
  const pillarColors: Record<string, string> = {
    architecture: '#58a6ff',
    security: '#f85149',
    risk: '#d29922',
    operations: '#3fb950',
    nist: '#bc8cff',
  };

  const cards = s.policies.map(p => {
    const borderColor = pillarColors[p.pillar] || 'var(--border)';
    const isGenerating = s.policyGenerating === p.filename;
    const isNist = p.pillar === 'nist';
    const isActive = p.filename === activeFilename;
    return `
      <div class="policy-card${isGenerating ? ' generating' : ''}${isActive ? ' active' : ''}" data-policy-filename="${escapeAttr(p.filename)}" style="border-left: 3px solid ${borderColor};">
        <div class="policy-card-name">${escapeHtml(p.label)}</div>
        <div class="policy-card-pillar">${escapeHtml(p.pillar.toUpperCase())}</div>
        <div class="policy-card-file">${escapeHtml(p.filename)}</div>
        ${isGenerating
          ? `<div class="policy-card-progress">
              <div class="policy-card-progress-bar" style="width: ${s.policyGenerateProgress}%;"></div>
            </div>
            <div class="policy-card-status">${escapeHtml(s.policyGenerateStep)}</div>`
          : `<div class="policy-card-actions">
              <button class="policy-action-btn policy-edit-btn" data-policy-filename="${escapeAttr(p.filename)}" title="Edit policy YAML">Edit</button>
              <button class="policy-action-btn policy-reset-btn" data-policy-filename="${escapeAttr(p.filename)}" title="${isNist ? 'Reset to default NIST catalog' : 'Reset to AI-generated baseline'}">${isNist ? 'Reset' : 'Reset to Baseline'}</button>
            </div>`}
      </div>
    `;
  }).join('');

  return `<div class="policy-card-grid">${cards}</div>`;
}

// ============================================================================
// Render — Formatted YAML
// ============================================================================

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

// ============================================================================
// Render — Policy Content Section (inline detail below cards)
// ============================================================================

/**
 * Renders the inline content section below the policy cards.
 * For NIST: shows the NIST controls table with search.
 * For other policies: shows formatted YAML with search and edit support.
 */
function renderPolicyContentSection(s: PolicyRenderState, activeFilename: string | null): string {
  if (!activeFilename) { return ''; }

  const policy = s.policies.find(p => p.filename === activeFilename);
  if (!policy) { return ''; }

  const isNist = policy.pillar === 'nist';

  // NIST card: delegate to existing NIST controls table
  if (isNist) {
    return `
      <div class="section-header">${escapeHtml(policy.label)}</div>
      ${renderNistControlsTable(s)}
    `;
  }

  // Editing mode for non-NIST policies
  if (s.policyEditing) {
    return `
      <div class="policy-content-header">
        <span class="policy-content-title">${escapeHtml(policy.label)}</span>
        <span class="policy-content-pillar">${escapeHtml(policy.pillar.toUpperCase())}</span>
      </div>
      <div class="policy-editor">
        <textarea id="policy-edit-textarea">${escapeHtml(s.policyEditContent || policy.content)}</textarea>
        <div class="policy-editor-actions">
          <button class="btn-secondary btn-sm" id="btn-policy-cancel">Cancel</button>
          <button class="btn-primary btn-sm" id="btn-policy-save">Save</button>
        </div>
      </div>
    `;
  }

  // Read-only formatted view with search
  const toggleLabel = s.policyViewRaw ? 'View Formatted' : 'View Raw';
  const contentHtml = s.policyViewRaw
    ? `<pre class="policy-content-pre">${escapeHtml(policy.content)}</pre>`
    : renderFormattedYaml(policy.content, s.policySearch);

  const searchBar = `
    <div class="policy-search-bar">
      <input type="text" id="policy-search-input" class="search-input"
             placeholder="Search ${escapeAttr(policy.label)}..."
             value="${escapeAttr(s.policySearch)}">
      ${s.policySearch ? '<button class="policy-search-clear" id="policy-search-clear">&times;</button>' : ''}
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

// ============================================================================
// Render — NIST Controls Table
// ============================================================================

function renderNistControlsTable(s: PolicyRenderState): string {
  const search = s.nistSearch.toLowerCase();
  const filtered = search
    ? s.nistControls.filter(c =>
        c.id.toLowerCase().includes(search) ||
        c.name.toLowerCase().includes(search) ||
        c.familyId.toLowerCase().includes(search) ||
        c.family.toLowerCase().includes(search)
      )
    : s.nistControls;

  if (s.nistControls.length === 0) {
    return `<div style="padding: 16px; text-align: center;">
      <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 12px;">
        No NIST controls catalog found.
      </p>
      <button id="btn-create-nist-catalog" class="btn-primary btn-sm">Create NIST SP 800-53 Catalog</button>
    </div>`;
  }

  // Group by family
  const families: Record<string, NistControl[]> = Object.create(null);
  for (const c of filtered) {
    const key = c.family;
    if (typeof key !== 'string' || key === '__proto__' || key === 'constructor' || key === 'prototype') { continue; }
    if (!families[key]) { families[key] = []; }
    families[key].push(c);
  }

  const searchInput = `
    <div class="nist-search-bar">
      <input type="text" id="nist-search-input" class="search-input"
             placeholder="Search controls (e.g. SC-7, encryption...)"
             value="${escapeAttr(s.nistSearch)}">
      ${s.nistSearch ? '<button class="nist-search-clear" id="nist-search-clear">&times;</button>' : ''}
    </div>
  `;

  if (Object.keys(families).length === 0) {
    return `${searchInput}<div style="padding: 12px; color: var(--text-muted);">No controls match "${escapeHtml(s.nistSearch)}".</div>`;
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

// ============================================================================
// Render — NIST Control Popup (called from main render pipeline)
// ============================================================================

export function renderNistPopup(nistControlPopup: NistControl | null): string {
  const c = nistControlPopup;
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

// ============================================================================
// Events
// ============================================================================

export function attachPolicyEvents(
  vscode: VsCodeApi,
  getState: () => PolicyRenderState,
  setState: (updates: Partial<PolicyRenderState>) => void,
  render: () => void,
): void {
  // ---------- Policy Card Clicks ----------
  document.querySelectorAll('.policy-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't select card if an action button was clicked
      if ((e.target as HTMLElement).classList.contains('policy-action-btn')) { return; }
      const filename = (card as HTMLElement).dataset.policyFilename;
      if (filename) {
        setState({
          selectedPolicy: filename,
          policyEditing: false,
          policyEditContent: '',
          policyViewRaw: false,
          policySearch: '',
        });
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
        const s = getState();
        const policy = s.policies.find(p => p.filename === filename);
        setState({
          selectedPolicy: filename,
          policyEditing: true,
          policyEditContent: policy?.content || '',
        });
        render();
      }
    });
  });

  // Reset to Baseline buttons on policy cards
  document.querySelectorAll('.policy-reset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const filename = (btn as HTMLElement).dataset.policyFilename;
      const s = getState();
      if (filename && !s.policyGenerating) {
        setState({
          policyGenerating: filename,
          policyGenerateStep: 'Starting...',
          policyGenerateProgress: 5,
        });
        render();
        vscode.postMessage({ type: 'generatePolicyBaseline', filename });
      }
    });
  });

  // Policy toggle raw/formatted view
  document.getElementById('btn-policy-toggle-raw')?.addEventListener('click', () => {
    const s = getState();
    setState({ policyViewRaw: !s.policyViewRaw });
    render();
  });

  // Policy edit button (in the inline content section)
  document.getElementById('btn-policy-edit')?.addEventListener('click', () => {
    const s = getState();
    const activeFilename = s.selectedPolicy || s.policies.find(p => p.pillar === 'nist')?.filename || s.policies[0]?.filename;
    const policy = s.policies.find(p => p.filename === activeFilename);
    if (policy) {
      setState({
        selectedPolicy: activeFilename || null,
        policyEditing: true,
        policyEditContent: policy.content,
      });
      render();
    }
  });

  // Policy cancel edit
  document.getElementById('btn-policy-cancel')?.addEventListener('click', () => {
    setState({
      policyEditing: false,
      policyEditContent: '',
    });
    render();
  });

  // Policy save
  document.getElementById('btn-policy-save')?.addEventListener('click', () => {
    const textarea = document.getElementById('policy-edit-textarea') as HTMLTextAreaElement | null;
    const s = getState();
    const activeFilename = s.selectedPolicy || s.policies.find(p => p.pillar === 'nist')?.filename || s.policies[0]?.filename;
    if (textarea && activeFilename) {
      vscode.postMessage({ type: 'savePolicy', filename: activeFilename, content: textarea.value });
      setState({
        policyEditing: false,
        policyEditContent: '',
      });
    }
  });

  // Policy search input (for non-NIST policies)
  const policySearchInput = document.getElementById('policy-search-input') as HTMLInputElement | null;
  if (policySearchInput) {
    let policySearchTimeout: number | undefined;
    policySearchInput.addEventListener('input', () => {
      if (policySearchTimeout) { clearTimeout(policySearchTimeout); }
      policySearchTimeout = window.setTimeout(() => {
        setState({ policySearch: policySearchInput.value.trim() });
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
    setState({ policySearch: '' });
    render();
  });

  // NIST search input
  const nistSearchInput = document.getElementById('nist-search-input') as HTMLInputElement | null;
  if (nistSearchInput) {
    let nistSearchTimeout: number | undefined;
    nistSearchInput.addEventListener('input', () => {
      if (nistSearchTimeout) { clearTimeout(nistSearchTimeout); }
      nistSearchTimeout = window.setTimeout(() => {
        setState({ nistSearch: nistSearchInput.value.trim() });
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
    setState({ nistSearch: '' });
    render();
  });

  // Create NIST catalog for existing meshes
  document.getElementById('btn-create-nist-catalog')?.addEventListener('click', () => {
    vscode.postMessage({ type: 'createNistCatalog' });
  });

  // NIST popup close
  document.getElementById('nist-popup-close')?.addEventListener('click', () => {
    setState({ nistControlPopup: null });
    render();
  });

  // NIST popup "View in Policies" link
  document.getElementById('nist-popup-view-policies')?.addEventListener('click', () => {
    const s = getState();
    const controlId = s.nistControlPopup?.id || '';
    // Select the NIST card so the controls table shows below
    const nistPolicy = s.policies.find(p => p.pillar === 'nist');
    setState({
      nistControlPopup: null,
      activeLens: 'policies',
      nistSearch: controlId,
      selectedPolicy: nistPolicy ? nistPolicy.filename : null,
    });
    // Load policies if not already loaded
    if (s.policies.length === 0) {
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
}

// ============================================================================
// CSS
// ============================================================================

export function getPolicyStyles(): string {
  return `
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
      .policy-list-item::before { content: "\\2022"; color: var(--accent); position: absolute; left: 4px; }
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
  `;
}
