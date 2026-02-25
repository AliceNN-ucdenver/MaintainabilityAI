// ============================================================================
// Absolem — Floating Chat Widget (extracted from lookingGlass.ts)
// Stateless renderer: receives state slices as params, uses callbacks for mutations
// ============================================================================

import { escapeHtml, escapeAttr, renderMarkdown } from '../pillars/shared';
import type { VsCodeApi } from '../types';

// ============================================================================
// State shape passed to render functions
// ============================================================================

export interface AbsolemRenderState {
  absolemOpen: boolean;
  absolemMessages: { role: 'user' | 'assistant'; content: string }[];
  absolemStreaming: string;
  absolemStatus: 'idle' | 'thinking' | 'reviewing-patches';
  absolemPatches: { patches: { op: string; target: string; field?: string; value?: unknown }[]; description: string } | null;
}

// ============================================================================
// Render
// ============================================================================

export function renderAbsolemFloating(s: AbsolemRenderState, barPath: string): string {
  // Collapsed state — show floating action button (FAB)
  if (!s.absolemOpen) {
    return `
      <div class="absolem-fab" id="btn-absolem-expand" data-bar-path="${escapeAttr(barPath)}" title="Open Absolem — AI Governance Assistant">
        &#x1F41B;
      </div>
    `;
  }

  const messagesHtml = s.absolemMessages.map(m => {
    if (m.role === 'assistant') {
      // Strip calm-patches code fences and any orphaned heading preceding them
      const displayContent = m.content
        .replace(/\n*(?:#{1,4}\s+[^\n]+\n+)?```calm-patches\s*\n[\s\S]*?```/g, '')
        .replace(/\n*(?:#{1,4}\s+[^\n]+)?\s*$/, '')
        .trim();
      return `
        <div class="absolem-bubble">
          <span class="absolem-avatar">&#x1F41B;</span>
          <div class="absolem-bubble-content absolem-md">${renderMarkdown(displayContent)}</div>
        </div>`;
    }
    return `
      <div class="user-bubble">
        <div class="user-bubble-content">${escapeHtml(m.content)}</div>
      </div>`;
  }).join('');

  const streamingHtml = s.absolemStatus === 'thinking' ? `
    <div class="absolem-bubble">
      <span class="absolem-avatar">&#x1F41B;</span>
      <div class="absolem-bubble-content absolem-streaming absolem-md" id="absolem-streaming-text">${renderMarkdown(s.absolemStreaming)}<span class="absolem-cursor">|</span></div>
    </div>` : '';

  const patchesHtml = s.absolemPatches ? renderAbsolemPatchesCard(s.absolemPatches, barPath) : '';

  const chipsHtml = s.absolemMessages.length === 0 && s.absolemStatus === 'idle' ? `
    <div class="absolem-greeting">
      <div class="absolem-bubble">
        <span class="absolem-avatar">&#x1F41B;</span>
        <div class="absolem-bubble-content">Who... are... you?<br/>I am Absolem, the governance caterpillar. I can help refine your architecture, analyze governance gaps, and more.</div>
      </div>
      <div class="absolem-chips">
        <button class="absolem-chip" data-absolem-cmd="drift-analysis" data-bar-path="${escapeAttr(barPath)}">Update CALM from drift analysis</button>
        <button class="absolem-chip" data-absolem-cmd="add-components" data-bar-path="${escapeAttr(barPath)}">Add missing nodes or relationships</button>
        <button class="absolem-chip" data-absolem-cmd="validate" data-bar-path="${escapeAttr(barPath)}">Review CALM validation issues</button>
        <button class="absolem-chip" data-absolem-cmd="gap-analysis" data-bar-path="${escapeAttr(barPath)}">Analyze governance gaps across all pillars</button>
        <button class="absolem-chip" data-absolem-cmd="suggest-adr" data-bar-path="${escapeAttr(barPath)}">Suggest new ADRs from architecture</button>
        <button class="absolem-chip" data-absolem-cmd="image-to-calm" data-bar-path="${escapeAttr(barPath)}">Generate CALM from architecture diagram</button>
        <button class="absolem-chip" data-absolem-cmd="repo-to-calm" data-bar-path="${escapeAttr(barPath)}">Scan Repo &rarr; CALM</button>
        <button class="absolem-chip" data-absolem-cmd="freeform" data-bar-path="${escapeAttr(barPath)}">Ask me anything about this architecture</button>
      </div>
    </div>` : '';

  const inputDisabled = s.absolemStatus === 'thinking' ? 'disabled' : '';

  return `
    <div class="absolem-overlay" id="absolem-floating">
      <div class="absolem-overlay-header">
        <span>&#x1F41B; Absolem</span>
        <button class="absolem-close-btn" id="btn-absolem-collapse" data-bar-path="${escapeAttr(barPath)}" title="Close">&#x2715;</button>
      </div>
      <div class="absolem-messages" id="absolem-messages">
        ${chipsHtml}
        ${messagesHtml}
        ${streamingHtml}
        ${patchesHtml}
      </div>
      <div class="absolem-input">
        <button class="absolem-attach-btn" id="btn-absolem-attach" data-bar-path="${escapeAttr(barPath)}" title="Attach architecture diagram" ${inputDisabled}>&#x1F4CE;</button>
        <input type="text" id="absolem-input-field"
          placeholder="${s.absolemMessages.length === 0 ? 'Or type a question...' : 'Type a message...'}" ${inputDisabled}
          data-bar-path="${escapeAttr(barPath)}" />
        <button class="btn-primary btn-sm" id="btn-absolem-send"
          data-bar-path="${escapeAttr(barPath)}" ${inputDisabled}>Send</button>
      </div>
      <input type="file" id="absolem-file-input" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none;" />
    </div>
  `;
}

function renderAbsolemPatchesCard(
  patchSet: { patches: { op: string; target: string; field?: string; value?: unknown }[]; description: string },
  barPath: string,
): string {
  // Check if this is a replaceFull with previewable content
  const replaceFullPatch = patchSet.patches.find(p => p.op === 'replaceFull' && p.value && typeof p.value === 'object');

  if (replaceFullPatch) {
    const v = replaceFullPatch.value as Record<string, unknown>;
    const nodeCount = Array.isArray(v.nodes) ? v.nodes.length : 0;
    const relCount = Array.isArray(v.relationships) ? v.relationships.length : 0;
    const flowCount = Array.isArray(v.flows) ? v.flows.length : 0;
    const nodes = (Array.isArray(v.nodes) ? v.nodes : []) as Record<string, unknown>[];
    const rels = (Array.isArray(v.relationships) ? v.relationships : []) as Record<string, unknown>[];
    const flows = (Array.isArray(v.flows) ? v.flows : []) as Record<string, unknown>[];

    // Build a human-readable summary
    const nodeSummary = nodes.map(n => {
      const icon = n['node-type'] === 'actor' ? '&#x1F464;'
        : n['node-type'] === 'database' ? '&#x1F4BE;'
        : n['node-type'] === 'network' ? '&#x1F310;'
        : n['node-type'] === 'service' ? '&#x2699;'
        : '&#x1F4E6;';
      return `<div class="calm-preview-item">${icon} <strong>${escapeHtml(String(n.name || n['unique-id'] || ''))}</strong> <span class="calm-preview-type">${escapeHtml(String(n['node-type'] || ''))}</span></div>`;
    }).join('');

    const relSummary = rels.slice(0, 8).map(r => {
      const rt = r['relationship-type'] as string | Record<string, unknown>;
      let label = '';
      if (typeof rt === 'string') {
        if (rt === 'connects') {
          const src = (r as Record<string, unknown>).source as Record<string, unknown> | undefined;
          const dst = (r as Record<string, unknown>).destination as Record<string, unknown> | undefined;
          label = `${src?.node || '?'} &rarr; ${dst?.node || '?'}`;
        } else {
          label = escapeHtml(String(r['unique-id'] || ''));
        }
      } else if (rt && typeof rt === 'object') {
        if ('connects' in rt) {
          const c = rt.connects as Record<string, unknown>;
          const src = c.source as Record<string, unknown> | undefined;
          const dst = c.destination as Record<string, unknown> | undefined;
          label = `${src?.node || '?'} &rarr; ${dst?.node || '?'}`;
        } else if ('interacts' in rt) {
          const ia = rt.interacts as Record<string, unknown>;
          label = `${ia.actor || '?'} interacts`;
        } else if ('composed-of' in rt) {
          const co = rt['composed-of'] as Record<string, unknown>;
          label = `${co.container || '?'} composed-of`;
        } else {
          label = escapeHtml(String(r['unique-id'] || ''));
        }
      } else {
        label = escapeHtml(String(r['unique-id'] || ''));
      }
      return `<div class="calm-preview-item">&#x1F517; ${label}</div>`;
    }).join('') + (rels.length > 8 ? `<div class="calm-preview-item" style="opacity:0.6;">...and ${rels.length - 8} more</div>` : '');

    const flowSummary = flows.map(f => {
      const tCount = Array.isArray(f.transitions) ? f.transitions.length : 0;
      return `<div class="calm-preview-item">&#x27A1; <strong>${escapeHtml(String(f.name || f['unique-id'] || ''))}</strong> <span class="calm-preview-type">${tCount} steps</span></div>`;
    }).join('');

    return `
    <div class="absolem-patches absolem-artifact" id="absolem-patches-card">
      <div class="absolem-patches-header">Generated CALM Architecture</div>
      <div class="calm-preview-summary">${nodeCount} nodes &middot; ${relCount} relationships &middot; ${flowCount} flows</div>

      <div class="calm-preview-sections">
        <details class="calm-preview-section" open>
          <summary>Nodes (${nodeCount})</summary>
          <div class="calm-preview-list">${nodeSummary}</div>
        </details>
        <details class="calm-preview-section">
          <summary>Relationships (${relCount})</summary>
          <div class="calm-preview-list">${relSummary}</div>
        </details>
        <details class="calm-preview-section">
          <summary>Flows (${flowCount})</summary>
          <div class="calm-preview-list">${flowSummary}</div>
        </details>
        <details class="calm-preview-section">
          <summary>Raw JSON</summary>
          <pre class="calm-preview-json">${escapeHtml(JSON.stringify(replaceFullPatch.value, null, 2))}</pre>
        </details>
      </div>

      <div class="absolem-patches-actions">
        <button class="btn-ghost btn-sm" id="btn-absolem-open-editor"
          data-bar-path="${escapeAttr(barPath)}" title="Preview in VS Code editor">Open in Editor</button>
        <button class="btn-secondary btn-sm" id="btn-absolem-reject"
          data-bar-path="${escapeAttr(barPath)}">Skip</button>
        <button class="btn-primary btn-sm" id="btn-absolem-accept"
          data-bar-path="${escapeAttr(barPath)}">Apply to bar.arch.json</button>
      </div>
    </div>`;
  }

  // Non-replaceFull patches — show detailed list with node/relationship info
  const patchLines = patchSet.patches.map(p => {
    const opClass = p.op.startsWith('add') ? 'patch-add'
      : p.op.startsWith('remove') ? 'patch-remove'
      : 'patch-update';
    const opLabel = p.op.startsWith('add') ? '+'
      : p.op.startsWith('remove') ? '\u2212'
      : '~';
    const v = p.value as Record<string, unknown> | undefined;

    let detail = '';
    if (v && p.op === 'addNode') {
      const icon = v['node-type'] === 'actor' ? '&#x1F464;'
        : v['node-type'] === 'database' ? '&#x1F4BE;'
        : v['node-type'] === 'network' ? '&#x1F310;'
        : v['node-type'] === 'service' ? '&#x2699;'
        : '&#x1F4E6;';
      const name = escapeHtml(String(v.name || v['unique-id'] || ''));
      const nodeType = escapeHtml(String(v['node-type'] || ''));
      const desc = v.description ? `<div class="patch-desc">${escapeHtml(String(v.description))}</div>` : '';
      detail = `${icon} <strong>${name}</strong> <span class="calm-preview-type">${nodeType}</span>${desc}`;
    } else if (v && p.op === 'addRelationship') {
      const rt = v['relationship-type'] as Record<string, unknown> | undefined;
      let relLabel = '';
      if (rt && 'connects' in rt) {
        const c = rt.connects as Record<string, unknown>;
        const src = (c.source as Record<string, unknown>)?.node || '?';
        const dst = (c.destination as Record<string, unknown>)?.node || '?';
        relLabel = `&#x1F517; ${escapeHtml(String(src))} &rarr; ${escapeHtml(String(dst))}`;
      } else if (rt && 'interacts' in rt) {
        const ia = rt.interacts as Record<string, unknown>;
        relLabel = `&#x1F464; ${escapeHtml(String(ia.actor || '?'))} interacts`;
      } else if (rt && 'composed-of' in rt) {
        const co = rt['composed-of'] as Record<string, unknown>;
        relLabel = `&#x1F4E6; ${escapeHtml(String(co.container || '?'))} composed-of`;
      } else {
        relLabel = `&#x1F517; ${escapeHtml(String(v['unique-id'] || ''))}`;
      }
      const proto = v.protocol ? ` <span class="calm-preview-type">${escapeHtml(String(v.protocol))}</span>` : '';
      const desc = v.description ? `<div class="patch-desc">${escapeHtml(String(v.description))}</div>` : '';
      detail = `${relLabel}${proto}${desc}`;
    } else if (v && p.op === 'updateField') {
      detail = `${escapeHtml(p.target)}${p.field ? '.' + escapeHtml(p.field) : ''}`;
    } else {
      detail = escapeHtml(p.target);
    }

    return `<div class="patch-item ${opClass}"><span class="patch-op">${opLabel}</span> ${detail}</div>`;
  }).join('');

  // Count by type for summary line
  const addNodes = patchSet.patches.filter(p => p.op === 'addNode').length;
  const addRels = patchSet.patches.filter(p => p.op === 'addRelationship').length;
  const updates = patchSet.patches.filter(p => p.op === 'updateField').length;
  const summaryParts: string[] = [];
  if (addNodes) { summaryParts.push(`${addNodes} node${addNodes !== 1 ? 's' : ''}`); }
  if (addRels) { summaryParts.push(`${addRels} relationship${addRels !== 1 ? 's' : ''}`); }
  if (updates) { summaryParts.push(`${updates} update${updates !== 1 ? 's' : ''}`); }

  return `
    <div class="absolem-patches absolem-artifact" id="absolem-patches-card">
      <div class="absolem-patches-header">Proposed Changes</div>
      ${summaryParts.length ? `<div class="calm-preview-summary">${summaryParts.join(' &middot; ')}</div>` : ''}
      ${patchLines}
      <div class="absolem-patches-actions">
        <button class="btn-ghost btn-sm" id="btn-absolem-open-editor"
          data-bar-path="${escapeAttr(barPath)}" title="Preview raw patches JSON">Open in Editor</button>
        <button class="btn-secondary btn-sm" id="btn-absolem-reject"
          data-bar-path="${escapeAttr(barPath)}">Skip</button>
        <button class="btn-primary btn-sm" id="btn-absolem-accept"
          data-bar-path="${escapeAttr(barPath)}">Apply to bar.arch.json</button>
      </div>
    </div>`;
}

// ============================================================================
// Events
// ============================================================================

export function attachAbsolemEvents(
  vscode: VsCodeApi,
  getState: () => {
    absolemOpen: boolean;
    absolemMessages: { role: 'user' | 'assistant'; content: string }[];
    absolemStatus: 'idle' | 'thinking' | 'reviewing-patches';
    absolemStreaming: string;
    absolemPatches: { patches: { op: string; target: string; field?: string; value?: unknown }[]; description: string } | null;
    currentBarPath: string | undefined;
  },
  setState: (updates: Partial<AbsolemRenderState>) => void,
  render: () => void,
): void {
  // Expand from collapsed
  document.getElementById('btn-absolem-expand')?.addEventListener('click', () => {
    setState({ absolemOpen: true });
    render();
  });

  // Collapse from expanded
  document.getElementById('btn-absolem-collapse')?.addEventListener('click', () => {
    const barPath = (document.getElementById('btn-absolem-collapse') as HTMLElement)?.dataset.barPath;
    if (barPath) {
      vscode.postMessage({ type: 'absolemClose', barPath });
    }
    setState({
      absolemOpen: false,
      absolemMessages: [],
      absolemStreaming: '',
      absolemStatus: 'idle',
      absolemPatches: null,
    });
    render();
  });

  // Command chips
  document.querySelectorAll('.absolem-chip[data-absolem-cmd]').forEach(chip => {
    chip.addEventListener('click', () => {
      const el = chip as HTMLElement;
      const cmd = el.dataset.absolemCmd;
      const barPath = el.dataset.barPath;
      if (!cmd || !barPath) { return; }

      // Image-to-CALM triggers file picker
      if (cmd === 'image-to-calm') {
        const fileInput = document.getElementById('absolem-file-input') as HTMLInputElement;
        if (fileInput) { fileInput.click(); }
        return;
      }

      if (cmd !== 'freeform' && cmd !== 'repo-to-calm') {
        const cmdLabels: Record<string, string> = {
          'drift-analysis': 'Update CALM from drift analysis',
          'add-components': 'Add missing nodes or relationships',
          'validate': 'Review CALM validation issues',
          'gap-analysis': 'Analyze governance gaps across all pillars',
          'suggest-adr': 'Suggest new ADRs from architecture',
        };
        const s = getState();
        setState({
          absolemMessages: [...s.absolemMessages, { role: 'user', content: cmdLabels[cmd] || cmd }],
          absolemStatus: 'thinking',
          absolemStreaming: '',
        });
        render();
      }
      vscode.postMessage({ type: 'absolemStart', barPath, command: cmd });
    });
  });

  // Send helper
  const sendMessage = () => {
    const input = document.getElementById('absolem-input-field') as HTMLInputElement;
    if (!input || !input.value.trim()) { return; }
    const barPath = input.dataset.barPath;
    if (!barPath) { return; }
    const text = input.value.trim();
    input.value = '';
    const s = getState();
    setState({
      absolemMessages: [...s.absolemMessages, { role: 'user', content: text }],
      absolemStatus: 'thinking',
      absolemStreaming: '',
    });
    render();
    vscode.postMessage({ type: 'absolemSend', barPath, message: text });
  };

  // Send button
  document.getElementById('btn-absolem-send')?.addEventListener('click', sendMessage);

  // Enter key on input
  document.getElementById('absolem-input-field')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') {
      sendMessage();
    }
  });

  // Accept patches
  document.getElementById('btn-absolem-accept')?.addEventListener('click', () => {
    const barPath = (document.getElementById('btn-absolem-accept') as HTMLElement)?.dataset.barPath;
    const s = getState();
    if (barPath && s.absolemPatches) {
      vscode.postMessage({
        type: 'absolemAcceptPatches',
        barPath,
        patches: s.absolemPatches.patches,
      });
    }
  });

  // Reject patches
  document.getElementById('btn-absolem-reject')?.addEventListener('click', () => {
    const barPath = (document.getElementById('btn-absolem-reject') as HTMLElement)?.dataset.barPath;
    if (barPath) {
      const s = getState();
      setState({
        absolemPatches: null,
        absolemStatus: 'idle',
        absolemMessages: [...s.absolemMessages, { role: 'assistant', content: 'Patches skipped. Feel free to ask for different changes or start fresh.' }],
      });
      vscode.postMessage({ type: 'absolemRejectPatches', barPath });
      render();
    }
  });

  // Open in Editor — preview generated CALM in a VS Code editor tab
  document.getElementById('btn-absolem-open-editor')?.addEventListener('click', () => {
    const barPath = (document.getElementById('btn-absolem-open-editor') as HTMLElement)?.dataset.barPath;
    const s = getState();
    if (barPath && s.absolemPatches) {
      const replaceFullPatch = s.absolemPatches.patches.find(p => p.op === 'replaceFull');
      if (replaceFullPatch && replaceFullPatch.value) {
        vscode.postMessage({
          type: 'absolemPreviewJson',
          barPath,
          json: JSON.stringify(replaceFullPatch.value, null, 2),
        });
      }
    }
  });

  // Attach image button
  document.getElementById('btn-absolem-attach')?.addEventListener('click', () => {
    const fileInput = document.getElementById('absolem-file-input') as HTMLInputElement;
    if (fileInput) { fileInput.click(); }
  });

  // File input change — read image as base64
  document.getElementById('absolem-file-input')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) { return; }
    const file = input.files[0];
    const barPath = getState().currentBarPath;
    if (!barPath) { return; }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Extract base64 data and mime type from data URL
      const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!match) { return; }
      const mimeType = match[1];
      const imageBase64 = match[2];

      const s = getState();
      setState({
        absolemMessages: [...s.absolemMessages, { role: 'user', content: `[Attached: ${file.name}]` }],
        absolemStatus: 'thinking',
        absolemStreaming: '',
      });
      render();

      vscode.postMessage({ type: 'absolemImageStart', barPath, imageBase64, mimeType });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be attached again
    input.value = '';
  });

  // Auto-scroll messages container
  const messagesEl = document.getElementById('absolem-messages');
  if (messagesEl) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

// ============================================================================
// CSS
// ============================================================================

export function getAbsolemStyles(): string {
  return `
      /* ---- Absolem FAB + Chat Overlay ---- */
      .absolem-fab {
        position: fixed; bottom: 24px; right: 24px;
        width: 56px; height: 56px; border-radius: 50%;
        background: var(--accent); color: white; font-size: 26px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; border: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .absolem-fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
      }
      .absolem-overlay {
        position: fixed; bottom: 24px; right: 24px;
        width: 560px; max-height: 80vh;
        border-radius: 12px;
        background: var(--surface); border: 1px solid var(--border);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 1000;
        display: flex; flex-direction: column; overflow: hidden;
        animation: absolem-overlay-appear 0.2s ease-out;
      }
      @keyframes absolem-overlay-appear {
        from { opacity: 0; transform: translateY(16px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      .absolem-overlay-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 16px; background: var(--surface-raised, var(--surface));
        border-bottom: 1px solid var(--border);
        font-size: 13px; font-weight: 600; color: var(--text);
      }
      .absolem-close-btn {
        background: none; border: none; color: var(--text-muted); cursor: pointer;
        font-size: 16px; padding: 2px 6px; line-height: 1; border-radius: 4px;
        transition: background 0.15s, color 0.15s;
      }
      .absolem-close-btn:hover { color: var(--text); background: var(--bg); }

      .absolem-messages {
        flex: 1; min-height: 0;
        max-height: calc(80vh - 120px); overflow-y: auto; padding: 12px;
        display: flex; flex-direction: column; gap: 8px;
      }

      .absolem-bubble { display: flex; gap: 8px; align-items: flex-start; }
      .absolem-avatar { font-size: 18px; flex-shrink: 0; margin-top: 2px; }
      .absolem-bubble-content {
        background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
        padding: 8px 12px; font-size: 12px; color: var(--text); line-height: 1.5;
        max-width: 85%; white-space: pre-wrap;
      }

      .user-bubble { display: flex; justify-content: flex-end; }
      .user-bubble-content {
        background: var(--accent-bg); border: 1px solid var(--accent); border-radius: 8px;
        padding: 8px 12px; font-size: 12px; color: var(--text); line-height: 1.5;
        max-width: 85%; white-space: pre-wrap;
      }

      .absolem-streaming .absolem-cursor { animation: absolem-blink 0.7s step-end infinite; }
      @keyframes absolem-blink { 50% { opacity: 0; } }

      .absolem-chips {
        display: flex; flex-direction: column; gap: 6px; margin-top: 8px; margin-left: 26px;
      }
      .absolem-chip {
        background: var(--bg); border: 1px solid var(--border); border-radius: 20px;
        padding: 6px 14px; font-size: 11px; color: var(--text); cursor: pointer;
        text-align: left; transition: border-color 0.15s, background 0.15s;
      }
      .absolem-chip:hover { border-color: var(--accent); background: var(--accent-bg); }

      .absolem-input {
        display: flex; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--border);
        align-items: center;
      }
      .absolem-input input {
        flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
        color: var(--text); font-size: 12px; padding: 6px 10px; font-family: inherit; outline: none;
      }
      .absolem-input input:focus { border-color: var(--accent); }

      .absolem-attach-btn {
        background: none; border: 1px solid var(--border); border-radius: 6px;
        padding: 4px 8px; cursor: pointer; font-size: 14px; line-height: 1;
        color: var(--text-muted); transition: border-color 0.15s, color 0.15s;
      }
      .absolem-attach-btn:hover { border-color: var(--accent); color: var(--accent); }
      .absolem-attach-btn:disabled { opacity: 0.4; cursor: not-allowed; }

      .absolem-patches {
        background: var(--surface); border: 2px solid var(--accent); border-radius: 8px;
        padding: 12px 14px; margin-top: 10px;
        box-shadow: 0 0 0 1px rgba(var(--accent-rgb, 99,102,241), 0.15);
        animation: absolem-patches-appear 0.3s ease-out;
      }
      @keyframes absolem-patches-appear {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .absolem-patches-header {
        font-size: 13px; font-weight: 700; color: var(--accent); margin-bottom: 8px;
      }
      .patch-item {
        font-size: 12px; padding: 6px 8px; color: var(--text);
        border-left: 3px solid transparent; margin-bottom: 2px;
        border-radius: 0 4px 4px 0; background: rgba(255,255,255,0.03);
      }
      .patch-item strong { color: var(--text); }
      .patch-add { border-left-color: var(--passing); }
      .patch-remove { border-left-color: var(--failing); }
      .patch-update { border-left-color: var(--accent); }
      .patch-op { font-family: var(--font-mono, monospace); font-weight: 700; margin-right: 4px; }
      .patch-desc {
        font-size: 11px; color: var(--text-muted); margin-top: 2px;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .absolem-patches-actions {
        display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;
      }
      .absolem-patches-actions .btn-primary {
        padding: 6px 16px; font-size: 12px; font-weight: 600;
      }

      /* CALM artifact preview */
      .absolem-artifact {
        border-color: var(--accent);
      }
      .calm-preview-summary {
        font-size: 12px; color: var(--text-muted); margin-bottom: 10px;
        padding-bottom: 8px; border-bottom: 1px solid var(--border);
      }
      .calm-preview-sections {
        max-height: 320px; overflow-y: auto; margin-bottom: 4px;
      }
      .calm-preview-section {
        margin-bottom: 4px;
      }
      .calm-preview-section summary {
        font-size: 11px; font-weight: 600; color: var(--text); cursor: pointer;
        padding: 4px 0; user-select: none;
      }
      .calm-preview-section summary:hover { color: var(--accent); }
      .calm-preview-list {
        padding: 4px 0 4px 8px;
      }
      .calm-preview-item {
        font-size: 11px; padding: 2px 0; color: var(--text);
        display: flex; align-items: center; gap: 6px;
      }
      .calm-preview-item strong { font-weight: 600; }
      .calm-preview-type {
        font-size: 10px; color: var(--text-muted);
        background: var(--bg); padding: 1px 6px; border-radius: 3px;
      }
      .calm-preview-json {
        font-size: 10px; font-family: var(--font-mono, monospace);
        background: var(--bg); border: 1px solid var(--border); border-radius: 4px;
        padding: 8px; max-height: 200px; overflow: auto; white-space: pre;
        color: var(--text-muted); line-height: 1.5;
      }

      /* Absolem markdown rendered content */
      .absolem-md { white-space: normal; }
      .absolem-md h3, .absolem-md h4, .absolem-md h5 {
        font-size: 12px; font-weight: 700; color: var(--text); margin: 6px 0 2px;
      }
      .absolem-md h3 { font-size: 13px; }
      .absolem-md strong { font-weight: 700; }
      .absolem-md em { font-style: italic; }
      .absolem-md del { text-decoration: line-through; opacity: 0.7; }
      .absolem-md code {
        background: var(--surface); padding: 1px 5px; border-radius: 3px;
        font-family: var(--font-mono, monospace); font-size: 11px;
      }
      .absolem-md pre {
        background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
        padding: 8px 10px; margin: 6px 0; overflow-x: auto;
      }
      .absolem-md pre code {
        background: none; padding: 0; font-size: 11px; line-height: 1.4;
      }
      .absolem-md a { color: var(--accent); text-decoration: none; }
      .absolem-md a:hover { text-decoration: underline; }
      .absolem-md table {
        border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 11px;
      }
      .absolem-md th, .absolem-md td {
        border: 1px solid var(--border); padding: 4px 8px; text-align: left;
      }
      .absolem-md th {
        background: var(--surface); font-weight: 700; font-size: 10px;
        text-transform: uppercase; letter-spacing: 0.3px;
      }
      .absolem-md blockquote {
        margin: 4px 0; padding: 0;
      }
      .absolem-md hr {
        border: none; border-top: 1px solid var(--border); margin: 6px 0;
      }
  `;
}
