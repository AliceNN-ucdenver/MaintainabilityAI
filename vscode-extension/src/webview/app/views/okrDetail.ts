/**
 * OKR detail view — Phase A read-only surface.
 *
 * Renders the full BTABoK 9-section card with Action cards in the
 * sub-states the data currently supports. In Phase A every `Start
 * <phase>` button is DISABLED with a tooltip pointing to Phase B agent
 * deployment — the data model + UI ship now so the agent wiring in
 * Phase B has somewhere to land.
 *
 * Layout follows the mockup in design doc §10.2 (vertical scroll: header,
 * KRs, affected BARs, target repos, three Action cards, footer). Polish
 * is intentionally light — visual fidelity to the SVG mockup on the
 * marketing page isn't the goal here; the goal is "the data is visible
 * and the buttons are correctly disabled."
 */
import { escapeHtml, escapeAttr } from '../pillars/shared';
import type {
  OkrCard, OkrAffectedBar, OkrAction, OkrPhase, OkrStatus,
} from '../../../types';

const STATUS_LABEL: Record<OkrStatus, string> = {
  'draft': 'Draft',
  'researching': 'Researching',
  'prd-pending': 'How-Pending',
  'prd-blocked': 'How-Blocked',
  'design-pending': 'What-Pending',
  'building': 'Building',
  'shipped': 'Shipped',
  'archived': 'Archived',
};

const PHASE_GATING_TOOLTIP = 'Phase B: requires agent deployment. See /docs/hatters-tea-party';

export interface OkrDetailRenderState {
  okr: OkrCard | null;
  affectedBars: OkrAffectedBar[];
}

export function renderOkrDetailView(state: OkrDetailRenderState): string {
  const okr = state.okr;
  if (!okr) {
    return `<div class="okr-detail-container"><p>OKR not loaded.</p></div>`;
  }
  const primaryTier = state.affectedBars[0]?.tier ?? 'restricted';

  return `
    <div class="okr-detail-container">
      ${renderHeader(okr, primaryTier)}
      ${renderKeyResults(okr)}
      ${renderAffectedBars(state.affectedBars)}
      ${renderTargetRepos(okr)}

      <h2 class="okr-section-heading">Actions</h2>
      ${renderActionCard(okr, 'why', state)}
      ${renderActionCard(okr, 'how', state)}
      ${renderActionCard(okr, 'what', state)}

      ${renderFooter(okr)}
    </div>
  `;
}

function renderHeader(okr: OkrCard, primaryTier: 'autonomous' | 'supervised' | 'restricted'): string {
  const tierLabel = primaryTier === 'restricted' ? '⚠ Restricted'
    : primaryTier === 'supervised' ? 'Supervised' : 'Autonomous';
  return `
    <div class="okr-detail-breadcrumb">
      <button class="okr-link-button" data-action="back-to-okr-list">← OKRs</button>
      <span class="okr-detail-id">${escapeHtml(okr.meta.id)}</span>
    </div>
    <div class="okr-detail-header">
      <div class="okr-detail-header-top">
        <h1 class="okr-detail-objective">🎯 ${escapeHtml(okr.objective.name)}</h1>
        <div class="okr-detail-badges">
          <span class="okr-status-badge okr-status-${okr.meta.status === 'shipped' ? 'done' : okr.meta.status === 'prd-blocked' ? 'block' : okr.meta.status === 'draft' ? 'neutral' : 'progress'}">${escapeHtml(STATUS_LABEL[okr.meta.status])}</span>
          <span class="okr-tier-badge okr-tier-${primaryTier}">${escapeHtml(tierLabel)}</span>
          ${okr.meta.paused ? '<span class="okr-paused-chip">⏸ Paused</span>' : ''}
        </div>
      </div>
      ${okr.objective.description ? `<p class="okr-detail-description">${escapeHtml(okr.objective.description)}</p>` : ''}
      ${renderIntentCascade(okr)}
    </div>
  `;
}

function renderIntentCascade(okr: OkrCard): string {
  const c = okr.objectiveAlignment.intentCascade;
  const hasAny = c.org || c.role || c.developer || c.user;
  if (!hasAny) { return ''; }
  return `
    <div class="okr-intent-cascade">
      <div class="okr-intent-cascade-title">Intent cascade</div>
      <table class="okr-intent-cascade-table">
        <tr><td class="okr-intent-label">Org</td><td>${escapeHtml(c.org || '—')}</td></tr>
        <tr><td class="okr-intent-label">Role</td><td>${escapeHtml(c.role || '—')}</td></tr>
        <tr><td class="okr-intent-label">Developer</td><td>${escapeHtml(c.developer || '—')}</td></tr>
        <tr><td class="okr-intent-label">User</td><td>${escapeHtml(c.user || '—')}</td></tr>
      </table>
    </div>
  `;
}

function renderKeyResults(okr: OkrCard): string {
  const rows = okr.keyResults.map(kr => `
    <tr>
      <td class="okr-kr-id">${escapeHtml(kr.id)}</td>
      <td>${escapeHtml(kr.metric)}</td>
      <td><code>${escapeHtml(kr.target)}</code></td>
      <td class="okr-muted">${escapeHtml(kr.actual ?? 'unmeasured')}</td>
    </tr>
  `).join('');
  return `
    <h2 class="okr-section-heading">Key Results</h2>
    <table class="okr-kr-table">
      <thead><tr><th>ID</th><th>Metric</th><th>Target</th><th>Actual</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAffectedBars(bars: OkrAffectedBar[]): string {
  if (bars.length === 0) {
    return `
      <h2 class="okr-section-heading">Affected BARs</h2>
      <p class="okr-muted">No BARs declared.</p>
    `;
  }
  const rows = bars.map(b => `
    <tr>
      <td><code>${escapeHtml(b.id)}</code></td>
      <td>${escapeHtml(b.name)}</td>
      <td>${b.compositeScore || '—'}</td>
      <td><span class="okr-tier-badge okr-tier-${b.tier}">${escapeHtml(b.tier === 'restricted' ? '⚠ Restricted' : b.tier === 'supervised' ? 'Supervised' : 'Autonomous')}</span></td>
      <td>${b.path ? `<button class="okr-link-button" data-action="open-bar" data-bar-path="${escapeAttr(b.path)}">Open BAR ↗</button>` : '<span class="okr-muted">unresolved</span>'}</td>
    </tr>
  `).join('');
  return `
    <h2 class="okr-section-heading">Affected BARs</h2>
    <table class="okr-bars-table">
      <thead><tr><th>ID</th><th>Name</th><th>Score</th><th>Tier</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderTargetRepos(okr: OkrCard): string {
  const repos = okr.objectiveAlignment.targetCodeRepos;
  if (repos.length === 0) {
    return `
      <h2 class="okr-section-heading">Target Code Repos</h2>
      <p class="okr-muted">None declared.</p>
    `;
  }
  const items = repos.map(r => `
    <li>
      <code>${escapeHtml(r)}</code>
      <span class="okr-repo-status okr-repo-declared">Declared — Not Connected</span>
    </li>
  `).join('');
  return `
    <h2 class="okr-section-heading">Target Code Repos</h2>
    <ul class="okr-repo-list">${items}</ul>
    <p class="okr-muted okr-section-note">Connection happens in Phase A-PR4 (Connect Repo flow on BAR detail).</p>
  `;
}

const PHASE_LABEL: Record<OkrPhase, string> = { why: 'Why · Research', how: 'How · PRD', what: 'What · Code Design' };

function latestActionFor(okr: OkrCard, phase: OkrPhase): OkrAction | undefined {
  const filtered = okr.actions.filter(a => a.phase === phase);
  return filtered[filtered.length - 1];
}

function computeSubstate(okr: OkrCard, phase: OkrPhase, primaryTier: 'autonomous' | 'supervised' | 'restricted'): {
  label: string;
  tone: 'idle' | 'progress' | 'block' | 'done';
  rationale: string;
} {
  // Gating prerequisites: How requires Why merged; What requires How merged.
  const whyComplete = okr.actions.some(a => a.phase === 'why' && a.status === 'complete');
  const howComplete = okr.actions.some(a => a.phase === 'how' && a.status === 'complete');

  const action = latestActionFor(okr, phase);
  if (action?.status === 'complete') {
    return { label: '✓ Complete', tone: 'done', rationale: `Rounds: ${action.rounds}` };
  }
  if (action?.status === 'in_progress' || action?.status === 'under_review') {
    return { label: '⏳ Running', tone: 'progress', rationale: 'Agent run in flight' };
  }
  if (action?.status === 'revision_required') {
    return { label: '⚠ Revision Required', tone: 'block', rationale: 'Reviewer flagged issues' };
  }
  if (action?.status === 'blocked' || action?.status === 'human_gate') {
    return { label: '⛔ Blocked', tone: 'block', rationale: 'Restricted tier or human gate' };
  }

  // not_started — gate on prerequisites + tier
  if (phase === 'how' && !whyComplete) {
    return { label: '☐ Gated', tone: 'idle', rationale: 'Gated on Why merged' };
  }
  if (phase === 'what' && !howComplete) {
    return { label: '☐ Gated', tone: 'idle', rationale: 'Gated on How merged' };
  }
  if (phase === 'what' && primaryTier === 'restricted') {
    return {
      label: '☐ Restricted',
      tone: 'block',
      rationale: 'Restricted tier — escalate BAR governance or use Human Override',
    };
  }
  return { label: '☐ Not started', tone: 'idle', rationale: 'Ready when Phase B ships' };
}

function renderActionCard(okr: OkrCard, phase: OkrPhase, state: OkrDetailRenderState): string {
  const primaryTier = state.affectedBars[0]?.tier ?? 'restricted';
  const substate = computeSubstate(okr, phase, primaryTier);
  const latest = latestActionFor(okr, phase);

  const phaseSignals = renderPhaseSignals(phase, latest);
  const startButton = renderStartButton(phase, substate);

  return `
    <div class="okr-action-card okr-action-card-${substate.tone}">
      <div class="okr-action-card-header">
        <span class="okr-action-phase">${escapeHtml(PHASE_LABEL[phase])}</span>
        <span class="okr-action-substate">${escapeHtml(substate.label)}</span>
      </div>
      <p class="okr-action-rationale">${escapeHtml(substate.rationale)}</p>
      ${phaseSignals}
      <div class="okr-action-footer">${startButton}</div>
    </div>
  `;
}

function renderPhaseSignals(phase: OkrPhase, action: OkrAction | undefined): string {
  if (!action) {
    // Phase A: agent + reviewers spec'd so users can see what WILL run
    if (phase === 'why') {
      return `<div class="okr-action-signals"><strong>Will run:</strong> market-research-agent · 4 oracles + JTBD · gap-refinement loop</div>`;
    }
    if (phase === 'how') {
      return `<div class="okr-action-signals"><strong>Will run:</strong> prd-agent · ask-experts refinement · mesh-grounded reviewer gate</div>`;
    }
    return `<div class="okr-action-signals"><strong>Will run:</strong> code-design-agent · code-grounded reviewer heavy gate · per-repo fan-out</div>`;
  }
  // Action exists — show its captured signals
  const scoreLine = (action.reviewerScores.architect != null || action.reviewerScores.security != null)
    ? `<div>Scores: Arch ${action.reviewerScores.architect ?? '—'} · Sec ${action.reviewerScores.security ?? '—'}</div>`
    : '';
  return `
    <div class="okr-action-signals">
      <div>Agent: ${escapeHtml(action.agent)}</div>
      <div>Run id: <code>${escapeHtml(action.runId)}</code></div>
      <div>Rounds: ${action.rounds}</div>
      <div>Tier (frozen): ${escapeHtml(action.governanceTier)}</div>
      ${scoreLine}
      ${action.hatterChainRoot ? `<div>Chain root: <code>${escapeHtml(action.hatterChainRoot.slice(0, 12))}…</code></div>` : ''}
    </div>
  `;
}

function renderStartButton(phase: OkrPhase, _substate: { tone: string }): string {
  // Phase A — every button is disabled. Tooltip explains why.
  const label = phase === 'why' ? 'Start Why' : phase === 'how' ? 'Start How' : 'Start What';
  return `
    <button
      class="okr-button-primary okr-button-disabled"
      disabled
      title="${escapeAttr(PHASE_GATING_TOOLTIP)}"
      data-phase="${escapeAttr(phase)}"
    >${escapeHtml(label)} <span class="okr-button-locked-icon">🔒</span></button>
    <span class="okr-button-tooltip-hint">Phase B</span>
  `;
}

function renderFooter(okr: OkrCard): string {
  return `
    <div class="okr-detail-footer">
      <button class="okr-button-primary okr-button-disabled" disabled title="Phase E feature">
        📦 Export Audit Report <span class="okr-button-locked-icon">🔒</span>
      </button>
      <button class="okr-button-secondary okr-button-disabled" disabled title="Phase E feature">
        🔍 Verify Chain
      </button>
      <button class="okr-button-secondary" data-action="open-okr-yaml" data-okr-id="${escapeAttr(okr.meta.id)}">
        📂 Open okr.yaml
      </button>
    </div>
  `;
}

export function getOkrDetailStyles(): string {
  return `
    .okr-detail-container { padding: 1.5rem 2rem; max-width: 1100px; }
    .okr-detail-breadcrumb { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; font-size: 0.875rem; }
    .okr-detail-id { font-family: var(--vscode-editor-font-family, monospace); color: var(--vscode-descriptionForeground); }
    .okr-detail-header { padding: 1.25rem; border: 1px solid var(--vscode-panel-border); border-radius: 0.5rem; margin-bottom: 1.5rem; background: var(--vscode-editor-background); }
    .okr-detail-header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
    .okr-detail-objective { margin: 0; font-size: 1.4rem; font-weight: 700; color: var(--vscode-foreground); }
    .okr-detail-badges { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .okr-detail-description { margin: 0.75rem 0 0; color: var(--vscode-descriptionForeground); line-height: 1.5; }
    .okr-intent-cascade { margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--vscode-panel-border); }
    .okr-intent-cascade-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); margin-bottom: 0.5rem; }
    .okr-intent-cascade-table { font-size: 0.875rem; border-collapse: collapse; }
    .okr-intent-cascade-table td { padding: 0.25rem 0.75rem 0.25rem 0; vertical-align: top; }
    .okr-intent-label { font-weight: 600; color: var(--vscode-descriptionForeground); width: 5.5rem; }
    .okr-section-heading { margin: 1.5rem 0 0.75rem; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); }
    .okr-kr-table, .okr-bars-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-bottom: 1rem; }
    .okr-kr-table th, .okr-bars-table th { text-align: left; padding: 0.5rem; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground); border-bottom: 1px solid var(--vscode-panel-border); }
    .okr-kr-table td, .okr-bars-table td { padding: 0.5rem; border-bottom: 1px solid var(--vscode-panel-border); }
    .okr-kr-id { font-family: var(--vscode-editor-font-family, monospace); font-weight: 600; color: var(--vscode-foreground); }
    .okr-repo-list { list-style: none; padding: 0; margin: 0; }
    .okr-repo-list li { padding: 0.5rem 0.75rem; border: 1px solid var(--vscode-panel-border); border-radius: 0.375rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .okr-repo-status { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 0.375rem; }
    .okr-repo-declared { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
    .okr-section-note { font-size: 0.75rem; opacity: 0.7; }
    .okr-action-card { padding: 1rem 1.25rem; border: 1px solid var(--vscode-panel-border); border-radius: 0.5rem; margin-bottom: 0.75rem; background: var(--vscode-editor-background); }
    .okr-action-card-idle { border-color: rgba(148, 163, 184, 0.3); }
    .okr-action-card-progress { border-color: rgba(252, 211, 77, 0.4); }
    .okr-action-card-block { border-color: rgba(248, 113, 113, 0.4); }
    .okr-action-card-done { border-color: rgba(74, 222, 128, 0.4); }
    .okr-action-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .okr-action-phase { font-weight: 700; font-size: 0.95rem; }
    .okr-action-substate { font-size: 0.875rem; font-weight: 500; }
    .okr-action-rationale { margin: 0 0 0.5rem; color: var(--vscode-descriptionForeground); font-size: 0.875rem; }
    .okr-action-signals { font-size: 0.8125rem; color: var(--vscode-descriptionForeground); line-height: 1.6; padding: 0.5rem 0.75rem; background: rgba(148, 163, 184, 0.05); border-radius: 0.375rem; margin: 0.5rem 0; }
    .okr-action-signals strong { color: var(--vscode-foreground); }
    .okr-action-signals code { font-size: 0.75rem; }
    .okr-action-footer { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
    .okr-button-disabled { opacity: 0.5; cursor: not-allowed; }
    .okr-button-locked-icon { font-size: 0.75rem; opacity: 0.7; margin-left: 0.25rem; }
    .okr-button-tooltip-hint { font-size: 0.7rem; color: var(--vscode-descriptionForeground); font-style: italic; }
    .okr-detail-footer { display: flex; gap: 0.5rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--vscode-panel-border); flex-wrap: wrap; }
    .okr-link-button { background: transparent; color: var(--vscode-textLink-foreground); border: none; cursor: pointer; padding: 0.25rem 0.5rem; font-size: 0.875rem; }
    .okr-link-button:hover { text-decoration: underline; }
  `;
}

export function attachOkrDetailEvents(
  vscode: { postMessage: (msg: unknown) => void },
  onBackToOkrList: () => void,
): void {
  document.querySelectorAll('[data-action="back-to-okr-list"]').forEach(el => {
    el.addEventListener('click', () => onBackToOkrList());
  });
  document.querySelectorAll('[data-action="open-bar"]').forEach(el => {
    el.addEventListener('click', () => {
      const barPath = (el as HTMLElement).dataset.barPath;
      if (barPath) {
        vscode.postMessage({ type: 'drillIntoBar', barPath });
      }
    });
  });
  document.querySelectorAll('[data-action="open-okr-yaml"]').forEach(el => {
    el.addEventListener('click', () => {
      const okrId = (el as HTMLElement).dataset.okrId;
      if (okrId) {
        // The okr.yaml lives at <mesh>/okrs/<id>/okr.yaml — extension resolves the path.
        vscode.postMessage({ type: 'openFile', path: `okrs/${okrId}/okr.yaml` });
      }
    });
  });
}
