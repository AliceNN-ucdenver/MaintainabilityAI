// ============================================================================
// Security Pillar — Detail renderer
// Renders STRIDE Threat Model: generation, summary, table, diagram, CSV export
// ============================================================================

import { escapeHtml, escapeAttr } from './shared';
import type { ThreatModelResult, VsCodeApi } from './shared';

// ============================================================================
// Render
// ============================================================================

export function renderSecurityDetail(
  model: ThreatModelResult | null,
  generating: boolean,
  progressStep: string,
  progressPct: number,
  barPath: string,
  savedDiagram?: string,
): string {
  // Action buttons
  const hasModel = model || savedDiagram;
  const actions = `
    <div class="pillar-detail-actions">
      ${model ? `<button class="btn-secondary btn-sm" id="btn-export-csv" data-bar-path="${escapeAttr(barPath)}">Export CSV</button>` : ''}
      <button class="btn-primary btn-sm" id="btn-generate-threat-model"
        data-bar-path="${escapeAttr(barPath)}" ${generating ? 'disabled' : ''}>
        ${hasModel ? 'Regenerate' : 'Generate Threat Model'}
      </button>
    </div>
  `;

  if (generating) {
    return `${actions}
      <div class="threat-model-progress">
        <div class="progress-container">
          <div class="progress-bar-track"><div class="progress-bar-fill" style="width: ${progressPct}%"></div></div>
          <span class="progress-label">${escapeHtml(progressStep)}</span>
        </div>
      </div>
    `;
  }

  if (!model) {
    // Show saved diagram from disk even without full threat model data
    if (savedDiagram) {
      return `${actions}
        <div class="pillar-detail-empty">
          <p>Saved threat diagram loaded from disk. Click <strong>Regenerate</strong> to run a full STRIDE analysis.</p>
        </div>
        <div class="section-subheader">Threat Diagram</div>
        <div class="diagram-container">
          <div class="mermaid-diagram" data-diagram="${escapeAttr(savedDiagram)}"></div>
        </div>
        ${renderStrideLegend()}
        <details class="diagram-source">
          <summary>View Source</summary>
          <pre>${escapeHtml(savedDiagram)}</pre>
        </details>
      `;
    }
    return `${actions}
      <div class="pillar-detail-empty">
        <p>Generate a STRIDE threat model from the CALM architecture, controls, and data classification using AI.</p>
      </div>
    `;
  }

  // Summary cards
  const summaryCards = `
    <div class="threat-summary-grid">
      <div class="threat-summary-card">
        <span class="threat-summary-value">${model.summary.totalThreats}</span>
        <span class="threat-summary-label">Total Threats</span>
      </div>
      <div class="threat-summary-card" style="border-color: var(--failing);">
        <span class="threat-summary-value" style="color: var(--failing);">${(model.summary.byRisk.critical || 0) + (model.summary.byRisk.high || 0)}</span>
        <span class="threat-summary-label">Critical/High</span>
      </div>
      <div class="threat-summary-card" style="border-color: var(--warning);">
        <span class="threat-summary-value" style="color: var(--warning);">${model.summary.byRisk.medium || 0}</span>
        <span class="threat-summary-label">Medium</span>
      </div>
      <div class="threat-summary-card">
        <span class="threat-summary-value">${model.summary.unmitigatedCount}</span>
        <span class="threat-summary-label">Unmitigated</span>
      </div>
    </div>
  `;

  // Threat table
  const threatRows = model.threats.map(t => {
    const riskColor = t.residualRisk === 'critical' || t.residualRisk === 'high' ? 'var(--failing)'
      : t.residualRisk === 'medium' ? 'var(--warning)'
      : 'var(--passing)';
    const effectIcon = t.controlEffectiveness === 'full' ? '&#10003;'
      : t.controlEffectiveness === 'partial' ? '&#9679;'
      : '&#10007;';
    return `
      <tr>
        <td><code>${escapeHtml(t.id)}</code></td>
        <td><span class="threat-category-badge">${escapeHtml(t.category)}</span></td>
        <td>${escapeHtml(t.targetName)}</td>
        <td>${escapeHtml(t.dataClassification)}</td>
        <td>${escapeHtml(t.impact)}</td>
        <td><span style="color: ${riskColor}; font-weight: 600;">${escapeHtml(t.residualRisk)}</span></td>
        <td><span>${effectIcon}</span></td>
        <td style="font-size: 11px;">${t.nistReferences.map(r => `<a class="nist-ref-link" data-nist-id="${escapeAttr(r)}" title="View control details">${escapeHtml(r)}</a>`).join(', ')}</td>
      </tr>
    `;
  }).join('');

  const threatTable = `
    <div class="threat-table-container">
      <table class="threat-table">
        <thead>
          <tr>
            <th>ID</th><th>Category</th><th>Target</th><th>Data Class.</th>
            <th>Impact</th><th>Residual Risk</th><th>Controls</th><th>NIST</th>
          </tr>
        </thead>
        <tbody>${threatRows}</tbody>
      </table>
    </div>
  `;

  // Threat diagram
  const diagram = model.mermaidDiagram ? `
    <div class="section-subheader">Threat Diagram</div>
    <div class="diagram-container">
      <div class="mermaid-diagram" data-diagram="${escapeAttr(model.mermaidDiagram)}"></div>
    </div>
    ${renderStrideLegend()}
    <details class="diagram-source">
      <summary>View Source</summary>
      <pre>${escapeHtml(model.mermaidDiagram)}</pre>
    </details>
  ` : '';

  return `${actions}${summaryCards}${threatTable}${diagram}`;
}

function renderStrideLegend(): string {
  return `
    <div class="stride-legend">
      <span class="stride-legend-title">STRIDE:</span>
      <span class="stride-legend-item"><strong>S</strong>poofing</span>
      <span class="stride-legend-item"><strong>T</strong>ampering</span>
      <span class="stride-legend-item"><strong>R</strong>epudiation</span>
      <span class="stride-legend-item"><strong>I</strong>nfo Disclosure</span>
      <span class="stride-legend-item"><strong>D</strong>oS</span>
      <span class="stride-legend-item"><strong>E</strong>levation</span>
    </div>
  `;
}

// ============================================================================
// Events
// ============================================================================

export function attachSecurityEvents(
  vscode: VsCodeApi,
  getState: () => { threatModel: ThreatModelResult | null },
  onGenerateStart: () => void,
): void {
  document.getElementById('btn-generate-threat-model')?.addEventListener('click', (e) => {
    const barPath = (e.target as HTMLElement).getAttribute('data-bar-path');
    if (barPath) {
      onGenerateStart();
      vscode.postMessage({ type: 'generateThreatModel', barPath });
    }
  });

  document.getElementById('btn-export-csv')?.addEventListener('click', (e) => {
    const barPath = (e.target as HTMLElement).getAttribute('data-bar-path');
    const state = getState();
    if (barPath && state.threatModel) {
      vscode.postMessage({ type: 'exportThreatModelCsv', barPath, threats: state.threatModel.threats });
    }
  });
}

// ============================================================================
// Styles
// ============================================================================

export function getSecurityStyles(): string {
  return `
    .threat-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0; }
    .threat-summary-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
      padding: 12px; text-align: center;
    }
    .threat-summary-value { display: block; font-size: 24px; font-weight: 700; color: var(--text); }
    .threat-summary-label { display: block; font-size: 11px; color: var(--text-dim); margin-top: 4px; }
    .threat-table-container { overflow-x: auto; margin: 12px 0; }
    .threat-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .threat-table th { text-align: left; padding: 8px; border-bottom: 1px solid var(--border); color: var(--text-dim); font-weight: 600; }
    .threat-table td { padding: 8px; border-bottom: 1px solid var(--border); }
    .threat-category-badge { background: var(--surface-raised); padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .section-subheader { font-size: 13px; font-weight: 600; color: var(--text-dim); margin: 16px 0 8px; }
    .threat-model-progress { padding: 16px 0; min-height: 60px; }
    .pillar-detail-actions { min-height: 36px; }
  `;
}
