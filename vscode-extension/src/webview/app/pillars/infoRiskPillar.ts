// ============================================================================
// Information Risk Pillar — Detail renderer
// Future: Risk assessments, data classification, VISM, privacy impact
// ============================================================================

export function renderInfoRiskDetail(): string {
  return `
    <div class="pillar-detail-empty">
      <div class="coming-soon-icon">&#128202;</div>
      <p><strong>Information Risk</strong> details coming soon.</p>
      <p class="coming-soon-items">Planned capabilities: Risk Assessment, Data Classification, VISM, Privacy Impact Analysis</p>
    </div>
  `;
}

export function attachInfoRiskEvents(): void {
  // No events yet
}

export function getInfoRiskStyles(): string {
  return `
    .coming-soon-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.5; }
    .coming-soon-items { font-size: 11px; color: var(--text-dim); margin-top: 4px; }
  `;
}
