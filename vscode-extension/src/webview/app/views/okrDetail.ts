/**
 * OKR detail view — supports three modes:
 *
 *   - 'view'   read-only render with an Edit button up top
 *   - 'edit'   form rendering of every user-editable section; Save / Cancel footer
 *   - 'create' same form as 'edit' but with an empty scaffold; Create OKR / Cancel footer
 *
 * Action cards + audit footer stay read-only in all three modes — those
 * fields are agent-driven or system-generated, not user-editable.
 *
 * The form does NOT auto-save. The webview gathers field values from
 * `data-okr-field="…"` attributes on Save click and posts the
 * appropriate message (`saveOkrEdits` or `createOkrFromDraft`). The
 * extension is the validator of record — it parses the payload through
 * Zod and reports schema failures via the standard error toast.
 *
 * Layout still follows the mockup in design doc §10.2; the form is just
 * the same vertical sections with inputs instead of static text.
 */
import { escapeHtml, escapeAttr } from '../pillars/shared';
import type {
  OkrCard, OkrAffectedBar, OkrAction, OkrPhase, OkrStatus,
  OkrAvailableBar, OkrAvailablePlatform, OkrDetailMode,
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
  /** Optional in legacy callers; default 'view'. */
  mode?: OkrDetailMode;
  /** Required for edit/create modes; ignored in view. */
  availablePlatforms?: OkrAvailablePlatform[];
  availableBars?: OkrAvailableBar[];
}

export function renderOkrDetailView(state: OkrDetailRenderState): string {
  const okr = state.okr;
  const mode = state.mode ?? 'view';
  if (!okr) {
    return `<div class="okr-detail-container"><p>OKR not loaded.</p></div>`;
  }
  const primaryTier = state.affectedBars[0]?.tier ?? 'restricted';
  const isForm = mode !== 'view';

  return `
    <div class="okr-detail-container" data-okr-mode="${escapeAttr(mode)}" data-okr-id="${escapeAttr(okr.meta.id)}">
      ${renderHeader(okr, primaryTier, mode)}
      ${isForm ? renderObjectiveForm(okr) : ''}
      ${isForm ? renderIntentCascadeForm(okr) : ''}
      ${renderKeyResults(okr, mode)}
      ${renderAffectedBars(state, mode)}
      ${renderTargetRepos(state, mode)}

      <h2 class="okr-section-heading">Actions</h2>
      ${renderActionCard(okr, 'why', state)}
      ${renderActionCard(okr, 'how', state)}
      ${renderActionCard(okr, 'what', state)}

      ${renderFooter(okr, mode)}
    </div>
  `;
}

function renderHeader(okr: OkrCard, primaryTier: 'autonomous' | 'supervised' | 'restricted', mode: OkrDetailMode): string {
  const tierLabel = primaryTier === 'restricted' ? '⚠ Restricted'
    : primaryTier === 'supervised' ? 'Supervised' : 'Autonomous';
  const idLine = mode === 'create'
    ? `<span class="okr-detail-id">New OKR (unsaved)</span>`
    : `<span class="okr-detail-id">${escapeHtml(okr.meta.id)}</span>`;
  const editButton = mode === 'view'
    ? `<button class="okr-button-secondary" data-action="edit-okr">✏️ Edit</button>`
    : '';

  if (mode === 'view') {
    return `
      <div class="okr-detail-breadcrumb">
        <button class="okr-link-button" data-action="back-to-okr-list">← OKRs</button>
        ${idLine}
        <span class="okr-detail-breadcrumb-spacer"></span>
        ${editButton}
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
        ${renderIntentCascadeReadOnly(okr)}
      </div>
    `;
  }

  // edit + create modes: omit the objective hero (it lives in renderObjectiveForm) and skip the read-only cascade.
  return `
    <div class="okr-detail-breadcrumb">
      <button class="okr-link-button" data-action="back-to-okr-list">← OKRs</button>
      ${idLine}
      <span class="okr-detail-breadcrumb-spacer"></span>
      ${mode === 'edit' ? `<span class="okr-tier-badge okr-tier-${primaryTier}">${escapeHtml(tierLabel)}</span>` : ''}
    </div>
  `;
}

function renderIntentCascadeReadOnly(okr: OkrCard): string {
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

function renderObjectiveForm(okr: OkrCard): string {
  return `
    <h2 class="okr-section-heading">Objective</h2>
    <div class="okr-form-grid">
      <label class="okr-form-label" for="okr-field-objective-name">Objective name</label>
      <input
        id="okr-field-objective-name"
        class="okr-form-input"
        type="text"
        data-okr-field="objective.name"
        value="${escapeAttr(okr.objective.name)}"
        placeholder="One-sentence objective"
        required
      />
      <label class="okr-form-label" for="okr-field-objective-description">Description</label>
      <textarea
        id="okr-field-objective-description"
        class="okr-form-input okr-form-textarea"
        data-okr-field="objective.description"
        rows="3"
        placeholder="What this OKR is trying to achieve and why."
      >${escapeHtml(okr.objective.description ?? '')}</textarea>

      <label class="okr-form-label" for="okr-field-owner">Owner</label>
      <input
        id="okr-field-owner"
        class="okr-form-input"
        type="text"
        data-okr-field="meta.owner"
        value="${escapeAttr(okr.meta.owner)}"
        placeholder="GitHub handle or team name"
        required
      />

      <label class="okr-form-label" for="okr-field-paused">Paused</label>
      <label class="okr-form-checkbox">
        <input
          id="okr-field-paused"
          type="checkbox"
          data-okr-field="meta.paused"
          ${okr.meta.paused ? 'checked' : ''}
        />
        <span>Pause this OKR (freezes Start buttons; does not cancel in-flight runs)</span>
      </label>
    </div>
  `;
}

function renderIntentCascadeForm(okr: OkrCard): string {
  const c = okr.objectiveAlignment.intentCascade;
  return `
    <h2 class="okr-section-heading">Intent cascade</h2>
    <p class="okr-section-help">How the objective ladders from org strategy down to user value. Optional but recommended — this is what the PRD agent grounds on.</p>
    <div class="okr-form-grid">
      <label class="okr-form-label" for="okr-field-cascade-org">Org</label>
      <input id="okr-field-cascade-org" class="okr-form-input" type="text"
        data-okr-field="objectiveAlignment.intentCascade.org"
        value="${escapeAttr(c.org)}" placeholder="Org-level outcome this OKR contributes to" />

      <label class="okr-form-label" for="okr-field-cascade-role">Role</label>
      <input id="okr-field-cascade-role" class="okr-form-input" type="text"
        data-okr-field="objectiveAlignment.intentCascade.role"
        value="${escapeAttr(c.role)}" placeholder="Engineering lead / role-level commitment" />

      <label class="okr-form-label" for="okr-field-cascade-developer">Developer</label>
      <input id="okr-field-cascade-developer" class="okr-form-input" type="text"
        data-okr-field="objectiveAlignment.intentCascade.developer"
        value="${escapeAttr(c.developer)}" placeholder="What the developer ships" />

      <label class="okr-form-label" for="okr-field-cascade-user">User</label>
      <input id="okr-field-cascade-user" class="okr-form-input" type="text"
        data-okr-field="objectiveAlignment.intentCascade.user"
        value="${escapeAttr(c.user)}" placeholder="What the user experiences" />
    </div>
  `;
}

function renderKeyResults(okr: OkrCard, mode: OkrDetailMode): string {
  if (mode === 'view') {
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

  const rows = okr.keyResults.map((kr, idx) => renderKrEditRow(kr, idx)).join('');
  return `
    <h2 class="okr-section-heading">Key Results</h2>
    <p class="okr-section-help">1–7 measurable outcomes. Targets like <code>&lt; 0.5%</code>, <code>p95 &lt; 200ms</code>, <code>100% pass</code>.</p>
    <div class="okr-kr-editor" data-okr-kr-list>
      ${rows}
    </div>
    <button type="button" class="okr-button-secondary okr-button-small" data-action="kr-add">+ Add KR</button>
  `;
}

function renderKrEditRow(kr: { id: string; metric: string; target: string; measurement: string }, idx: number): string {
  return `
    <div class="okr-kr-edit-row" data-okr-kr-row="${idx}">
      <input class="okr-form-input okr-kr-id-input" type="text" data-okr-kr-field="id"
        value="${escapeAttr(kr.id)}" placeholder="KR-1" aria-label="Key Result id" />
      <input class="okr-form-input" type="text" data-okr-kr-field="metric"
        value="${escapeAttr(kr.metric)}" placeholder="Metric (e.g. p95 latency)" aria-label="Metric" />
      <input class="okr-form-input" type="text" data-okr-kr-field="target"
        value="${escapeAttr(kr.target)}" placeholder="Target (e.g. < 200ms)" aria-label="Target" />
      <input class="okr-form-input" type="text" data-okr-kr-field="measurement"
        value="${escapeAttr(kr.measurement)}" placeholder="Measurement (how / where)" aria-label="Measurement" />
      <button type="button" class="okr-button-icon" data-action="kr-remove" data-kr-row="${idx}" title="Remove KR">✕</button>
    </div>
  `;
}

function renderAffectedBars(state: OkrDetailRenderState, mode: OkrDetailMode): string {
  if (mode === 'view') {
    return renderAffectedBarsReadOnly(state.affectedBars);
  }
  const okr = state.okr!;
  const allBars = state.availableBars ?? [];
  const allPlatforms = state.availablePlatforms ?? [];
  const selectedBarIds = new Set(okr.objectiveAlignment.affectedBarIds);
  const currentPlatform = okr.objectiveAlignment.platformId;

  const platformOptions = allPlatforms
    .map(p => `<option value="${escapeAttr(p.id)}"${p.id === currentPlatform ? ' selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.id)})</option>`)
    .join('');

  const barsByPlatform = new Map<string, OkrAvailableBar[]>();
  for (const b of allBars) {
    const arr = barsByPlatform.get(b.platformId) ?? [];
    arr.push(b);
    barsByPlatform.set(b.platformId, arr);
  }
  const barGroups = Array.from(barsByPlatform.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([platformId, bars]) => {
      const platformName = allPlatforms.find(p => p.id === platformId)?.name ?? platformId;
      const items = bars.map(b => {
        const checked = selectedBarIds.has(b.id) ? 'checked' : '';
        const tierLabel = b.tier === 'restricted' ? '⚠ Restricted' : b.tier === 'supervised' ? 'Supervised' : 'Autonomous';
        return `
          <label class="okr-bar-chip">
            <input type="checkbox" data-okr-bar-id="${escapeAttr(b.id)}" ${checked} />
            <span class="okr-bar-chip-id">${escapeHtml(b.id)}</span>
            <span class="okr-bar-chip-name">${escapeHtml(b.name)}</span>
            <span class="okr-tier-badge okr-tier-${b.tier}">${escapeHtml(tierLabel)}</span>
            <span class="okr-muted okr-bar-chip-score">${Math.round(b.compositeScore)}</span>
          </label>
        `;
      }).join('');
      return `
        <fieldset class="okr-bar-group">
          <legend>${escapeHtml(platformName)} <span class="okr-muted">(${escapeHtml(platformId)})</span></legend>
          ${items || '<p class="okr-muted">No BARs in this platform yet.</p>'}
        </fieldset>
      `;
    }).join('');

  return `
    <h2 class="okr-section-heading">Platform &amp; Affected BARs</h2>
    <p class="okr-section-help">At least one BAR is required. The lowest-composite-score BAR drives the governance tier (Restricted wins).</p>
    <div class="okr-form-grid">
      <label class="okr-form-label" for="okr-field-platform">Platform</label>
      <select id="okr-field-platform" class="okr-form-input" data-okr-field="objectiveAlignment.platformId">
        ${platformOptions || '<option value="">— no platforms in this mesh —</option>'}
      </select>
    </div>
    <div class="okr-bar-picker" data-okr-bars-list>
      ${barGroups || '<p class="okr-muted">No BARs in the mesh yet.</p>'}
    </div>
  `;
}

function renderAffectedBarsReadOnly(bars: OkrAffectedBar[]): string {
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

function renderTargetRepos(state: OkrDetailRenderState, mode: OkrDetailMode): string {
  const okr = state.okr!;
  if (mode === 'view') {
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

  // Edit / create mode — checkbox picker grouped by BAR (sourced from each
  // BAR's app.yaml repos[]) plus a custom-URL adder for one-offs.
  const allBars = state.availableBars ?? [];
  const selectedRepos = new Set(okr.objectiveAlignment.targetCodeRepos);
  // Dedupe across BARs so the same repo doesn't appear under two BARs.
  const seen = new Set<string>();
  const barGroups = allBars
    .map(bar => {
      const repos = bar.repos.filter(r => {
        if (seen.has(r)) { return false; }
        seen.add(r);
        return true;
      });
      if (repos.length === 0) { return ''; }
      const rows = repos.map(r => {
        const checked = selectedRepos.has(r) ? 'checked' : '';
        return `
          <label class="okr-repo-suggestion">
            <input type="checkbox" data-okr-repo-suggestion value="${escapeAttr(r)}" ${checked} />
            <code>${escapeHtml(r)}</code>
          </label>
        `;
      }).join('');
      return `
        <fieldset class="okr-repo-group">
          <legend>${escapeHtml(bar.id)} <span class="okr-muted">${escapeHtml(bar.name)}</span></legend>
          ${rows}
        </fieldset>
      `;
    })
    .filter(s => s.length > 0)
    .join('');

  // Custom repos = anything already on the OKR that wasn't matched by an
  // available BAR. Keeps user-added URLs editable + removable across saves.
  const customRepos = okr.objectiveAlignment.targetCodeRepos.filter(r => !seen.has(r));
  const customRows = customRepos.map((r, idx) => renderCustomRepoRow(r, idx)).join('');

  return `
    <h2 class="okr-section-heading">Target Code Repos</h2>
    <p class="okr-section-help">Code repos the What phase will fan out to. Pick from each affected BAR's <code>app.yaml</code> repos, or add a custom URL.</p>
    <div class="okr-repo-suggestions">
      ${barGroups || '<p class="okr-muted">No BARs declare repos yet.</p>'}
    </div>
    <div class="okr-repo-custom">
      <label class="okr-form-label">Custom repo URLs</label>
      <div class="okr-repo-editor" data-okr-repos-list>${customRows}</div>
      <button type="button" class="okr-button-secondary okr-button-small" data-action="repo-add">+ Add custom URL</button>
    </div>
  `;
}

function renderCustomRepoRow(url: string, idx: number): string {
  return `
    <div class="okr-repo-edit-row" data-okr-repo-row="${idx}">
      <input class="okr-form-input" type="text" data-okr-repo-field="url"
        value="${escapeAttr(url)}" placeholder="https://github.com/org/repo" aria-label="Custom target repo URL" />
      <button type="button" class="okr-button-icon" data-action="repo-remove" data-repo-row="${idx}" title="Remove repo">✕</button>
    </div>
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
  const startButton = renderStartButton(phase, substate, okr, primaryTier);

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
    if (phase === 'why') {
      return `<div class="okr-action-signals"><strong>Will run:</strong> market-research-agent · 4 oracles + JTBD · gap-refinement loop</div>`;
    }
    if (phase === 'how') {
      return `<div class="okr-action-signals"><strong>Will run:</strong> prd-agent · ask-experts refinement · mesh-grounded reviewer gate</div>`;
    }
    return `<div class="okr-action-signals"><strong>Will run:</strong> code-design-agent · code-grounded reviewer heavy gate · per-repo fan-out</div>`;
  }
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
      ${action.hatterChainRoot
        ? `<div>Chain root: <code>${escapeHtml(action.hatterChainRoot.slice(0, 12))}…</code>
             <button class="okr-link-button" data-action="view-hatter-tag"
               data-action-id="${escapeAttr(action.id)}"
               data-run-id="${escapeAttr(action.runId)}"
               style="margin-left: 0.5rem; font-size: 0.75rem;">View Tag ↗</button></div>`
        : ''}
    </div>
  `;
}

function renderStartButton(
  phase: OkrPhase,
  substate: { tone: string; label: string },
  okr: OkrCard,
  primaryTier: 'autonomous' | 'supervised' | 'restricted',
): string {
  const label = phase === 'why' ? 'Start Why' : phase === 'how' ? 'Start How' : 'Start What';

  // Phase B-PR3+4 wire Why + How. Start What stays disabled until Phase C
  // ships design-bus.yml (the fan-out workflow).
  if (phase === 'what') {
    return `
      <button class="okr-button-primary okr-button-disabled" disabled
        title="${escapeAttr(PHASE_GATING_TOOLTIP)}"
        data-phase="what"
      >${escapeHtml(label)} <span class="okr-button-locked-icon">🔒</span></button>
      <span class="okr-button-tooltip-hint">Phase C</span>
    `;
  }

  // Both Why + How share the same gate logic — paused / in-progress / done /
  // gated-on-prior-phase. The Why-phase has no prior; the How-phase requires
  // a completed Why.
  if (okr.meta.paused) {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="OKR is paused — unpause from the detail view" data-phase="${escapeAttr(phase)}">${escapeHtml(label)} <span class="okr-button-locked-icon">⏸</span></button>`;
  }
  if (substate.tone === 'progress') {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="Run already in flight" data-phase="${escapeAttr(phase)}">${escapeHtml(label)} <span class="okr-button-locked-icon">⏳</span></button>`;
  }
  if (substate.tone === 'done') {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="${escapeHtml(phase === 'why' ? 'Why phase complete — re-run flow lands in Phase C' : 'How phase complete — re-run flow lands in Phase C')}" data-phase="${escapeAttr(phase)}">${escapeHtml(label)} <span class="okr-button-locked-icon">✓</span></button>`;
  }
  if (phase === 'how' && !okr.actions.some(a => a.phase === 'why' && a.status === 'complete')) {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="Gated on Why merged — start Why first" data-phase="how">${escapeHtml(label)} <span class="okr-button-locked-icon">🔒</span></button>`;
  }
  // Restricted-tier OKRs CAN still run Why + How — the audit chain is the
  // point. The Restricted gate kicks in on What (per §6.2).
  void primaryTier;

  const action = phase === 'why' ? 'start-okr-why' : 'start-okr-how';
  return `
    <button class="okr-button-primary" data-action="${action}" data-okr-id="${escapeAttr(okr.meta.id)}" data-phase="${escapeAttr(phase)}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderFooter(okr: OkrCard, mode: OkrDetailMode): string {
  if (mode === 'view') {
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
  const primaryLabel = mode === 'create' ? '✓ Create OKR' : '✓ Save changes';
  return `
    <div class="okr-detail-footer">
      <button class="okr-button-primary" data-action="okr-save">${escapeHtml(primaryLabel)}</button>
      <button class="okr-button-secondary" data-action="okr-cancel">Cancel</button>
      ${mode === 'edit' ? `<button class="okr-button-secondary" data-action="open-okr-yaml" data-okr-id="${escapeAttr(okr.meta.id)}">📂 Open okr.yaml</button>` : ''}
    </div>
  `;
}

export function getOkrDetailStyles(): string {
  return `
    .okr-detail-container { padding: 1.5rem 2rem; max-width: 1100px; }
    .okr-detail-breadcrumb { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; font-size: 0.875rem; }
    .okr-detail-breadcrumb-spacer { flex: 1; }
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
    .okr-section-help { margin: 0 0 0.75rem; color: var(--vscode-descriptionForeground); font-size: 0.8125rem; }
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
    .okr-form-grid { display: grid; grid-template-columns: 8rem 1fr; gap: 0.5rem 0.75rem; margin-bottom: 1rem; align-items: center; }
    .okr-form-label { font-size: 0.875rem; color: var(--vscode-descriptionForeground); font-weight: 500; }
    .okr-form-input { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); padding: 0.375rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem; font-family: inherit; width: 100%; box-sizing: border-box; }
    .okr-form-input:focus { outline: 1px solid var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); }
    .okr-form-textarea { resize: vertical; min-height: 3rem; }
    .okr-form-checkbox { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--vscode-foreground); }
    .okr-button-small { padding: 0.25rem 0.625rem; font-size: 0.8125rem; }
    .okr-button-icon { background: transparent; border: 1px solid var(--vscode-panel-border); color: var(--vscode-foreground); width: 1.75rem; height: 1.75rem; border-radius: 0.25rem; cursor: pointer; }
    .okr-button-icon:hover { background: var(--vscode-list-hoverBackground); }
    .okr-kr-editor { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
    .okr-kr-edit-row { display: grid; grid-template-columns: 4rem 2fr 2fr 2fr auto; gap: 0.5rem; align-items: center; }
    .okr-kr-id-input { font-family: var(--vscode-editor-font-family, monospace); }
    .okr-repo-editor { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
    .okr-repo-edit-row { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; align-items: center; }
    .okr-repo-suggestions { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
    .okr-repo-group { border: 1px solid var(--vscode-panel-border); border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
    .okr-repo-group legend { font-weight: 600; font-size: 0.8125rem; padding: 0 0.5rem; font-family: var(--vscode-editor-font-family, monospace); }
    .okr-repo-suggestion { display: flex; gap: 0.5rem; align-items: center; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem; }
    .okr-repo-suggestion:hover { background: var(--vscode-list-hoverBackground); }
    .okr-repo-suggestion input { margin: 0; }
    .okr-repo-suggestion code { font-size: 0.8125rem; }
    .okr-repo-custom { margin-top: 0.5rem; }
    .okr-bar-picker { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
    .okr-bar-group { border: 1px solid var(--vscode-panel-border); border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
    .okr-bar-group legend { font-weight: 600; font-size: 0.8125rem; padding: 0 0.5rem; }
    .okr-bar-chip { display: flex; gap: 0.5rem; align-items: center; padding: 0.375rem 0.5rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem; }
    .okr-bar-chip:hover { background: var(--vscode-list-hoverBackground); }
    .okr-bar-chip input { margin: 0; }
    .okr-bar-chip-id { font-family: var(--vscode-editor-font-family, monospace); font-weight: 600; min-width: 7rem; }
    .okr-bar-chip-name { flex: 1; }
    .okr-bar-chip-score { font-size: 0.75rem; }
    .hatter-tag-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 4rem 2rem; }
    .hatter-tag-sheet { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 0.5rem; max-width: 720px; width: 100%; max-height: 80vh; overflow: auto; padding: 1.25rem 1.5rem; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4); }
    .hatter-tag-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .hatter-tag-header h3 { margin: 0; font-size: 1rem; }
    .hatter-tag-meta { font-size: 0.8125rem; color: var(--vscode-descriptionForeground); margin-bottom: 1rem; }
    .hatter-tag-body { background: var(--vscode-textCodeBlock-background, rgba(148, 163, 184, 0.1)); padding: 0.75rem; border-radius: 0.375rem; font-family: var(--vscode-editor-font-family, monospace); font-size: 0.8125rem; max-height: 50vh; overflow: auto; margin: 0 0 1rem; white-space: pre; }
    .hatter-tag-empty { color: var(--vscode-descriptionForeground); padding: 1rem; text-align: center; }
    .hatter-tag-note { font-size: 0.75rem; color: var(--vscode-descriptionForeground); opacity: 0.8; margin: 0; }
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
        vscode.postMessage({ type: 'openFile', path: `okrs/${okrId}/okr.yaml` });
      }
    });
  });
  // Phase B-PR4: View Tag — opens the Hatter Tag slide-out sheet for an
  // action's run. Extension parses the tag YAML from the artifact and posts
  // it back as a `hatterTagSheet` message; the webview renders the modal.
  document.querySelectorAll('[data-action="view-hatter-tag"]').forEach(el => {
    el.addEventListener('click', () => {
      const container = el.closest('[data-okr-id]') as HTMLElement | null;
      const okrId = container?.dataset.okrId;
      const actionId = (el as HTMLElement).dataset.actionId;
      if (okrId && actionId) {
        vscode.postMessage({ type: 'loadHatterTag', okrId, actionId });
      }
    });
  });
  document.querySelectorAll('[data-action="edit-okr"]').forEach(el => {
    el.addEventListener('click', () => {
      const container = el.closest('[data-okr-id]') as HTMLElement | null;
      const okrId = container?.dataset.okrId;
      if (okrId) {
        vscode.postMessage({ type: 'editOkr', okrId });
      }
    });
  });
  // Phase B-PR3 / B-PR4: Start Why / Start How click handlers. Confirmation
  // is done on the extension side via `vscode.window.showWarningMessage`
  // ({modal:true}) — `window.confirm` doesn't work reliably inside VS Code
  // webviews (silent no-op in some hosts).
  document.querySelectorAll('[data-action="start-okr-why"]').forEach(el => {
    el.addEventListener('click', () => {
      const okrId = (el as HTMLElement).dataset.okrId;
      if (okrId) {
        vscode.postMessage({ type: 'startOkrWhy', okrId });
      }
    });
  });
  document.querySelectorAll('[data-action="start-okr-how"]').forEach(el => {
    el.addEventListener('click', () => {
      const okrId = (el as HTMLElement).dataset.okrId;
      if (okrId) {
        vscode.postMessage({ type: 'startOkrHow', okrId });
      }
    });
  });
  // KR add / remove
  document.querySelectorAll('[data-action="kr-add"]').forEach(el => {
    el.addEventListener('click', () => addKrRow());
  });
  document.querySelectorAll('[data-action="kr-remove"]').forEach(el => {
    el.addEventListener('click', () => removeRow(el as HTMLElement, '[data-okr-kr-row]'));
  });
  // Repo add / remove
  document.querySelectorAll('[data-action="repo-add"]').forEach(el => {
    el.addEventListener('click', () => addRepoRow());
  });
  document.querySelectorAll('[data-action="repo-remove"]').forEach(el => {
    el.addEventListener('click', () => removeRow(el as HTMLElement, '[data-okr-repo-row]'));
  });
  // Save / Cancel
  document.querySelectorAll('[data-action="okr-save"]').forEach(el => {
    el.addEventListener('click', () => submitOkrForm(vscode));
  });
  document.querySelectorAll('[data-action="okr-cancel"]').forEach(el => {
    el.addEventListener('click', () => {
      const container = document.querySelector('[data-okr-mode]') as HTMLElement | null;
      const mode = container?.dataset.okrMode;
      if (mode === 'create') {
        // Discard the draft entirely and navigate back to the OKR list —
        // there's nothing on disk to return to.
        onBackToOkrList();
      } else if (mode === 'edit') {
        // Re-fetch read-only view to drop unsaved edits on the same OKR.
        const okrId = container?.dataset.okrId;
        if (okrId) {
          vscode.postMessage({ type: 'drillIntoOkr', okrId });
        }
      }
    });
  });
}

function removeRow(button: HTMLElement, rowSelector: string): void {
  const row = button.closest(rowSelector) as HTMLElement | null;
  if (row) { row.remove(); }
}

function addKrRow(): void {
  const list = document.querySelector('[data-okr-kr-list]') as HTMLElement | null;
  if (!list) { return; }
  const existing = list.querySelectorAll('[data-okr-kr-row]').length;
  const next = existing + 1;
  const div = document.createElement('div');
  div.innerHTML = renderKrEditRow({ id: `KR-${next}`, metric: '', target: '', measurement: '' }, existing).trim();
  const row = div.firstElementChild as HTMLElement;
  list.appendChild(row);
  row.querySelector('[data-action="kr-remove"]')?.addEventListener('click', (e) => {
    removeRow(e.currentTarget as HTMLElement, '[data-okr-kr-row]');
  });
}

function addRepoRow(): void {
  const list = document.querySelector('[data-okr-repos-list]') as HTMLElement | null;
  if (!list) { return; }
  const existing = list.querySelectorAll('[data-okr-repo-row]').length;
  const div = document.createElement('div');
  div.innerHTML = renderCustomRepoRowFragment(existing);
  const row = div.firstElementChild as HTMLElement;
  list.appendChild(row);
  row.querySelector('[data-action="repo-remove"]')?.addEventListener('click', (e) => {
    removeRow(e.currentTarget as HTMLElement, '[data-okr-repo-row]');
  });
}

function renderCustomRepoRowFragment(idx: number): string {
  return `<div class="okr-repo-edit-row" data-okr-repo-row="${idx}">
    <input class="okr-form-input" type="text" data-okr-repo-field="url" value="" placeholder="https://github.com/org/repo" aria-label="Custom target repo URL" />
    <button type="button" class="okr-button-icon" data-action="repo-remove" data-repo-row="${idx}" title="Remove repo">✕</button>
  </div>`;
}

/**
 * Gather form values and post the appropriate save message. Trusts the
 * extension to validate via Zod; we just package up what's on screen.
 */
function submitOkrForm(vscode: { postMessage: (msg: unknown) => void }): void {
  const container = document.querySelector('[data-okr-mode]') as HTMLElement | null;
  if (!container) { return; }
  const mode = container.dataset.okrMode;
  const okrId = container.dataset.okrId;

  const get = (field: string): string => {
    const el = container.querySelector(`[data-okr-field="${field}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    return el?.value ?? '';
  };
  const getChecked = (field: string): boolean => {
    const el = container.querySelector(`[data-okr-field="${field}"]`) as HTMLInputElement | null;
    return el?.checked ?? false;
  };

  const krRows = Array.from(container.querySelectorAll('[data-okr-kr-row]')) as HTMLElement[];
  const keyResults = krRows.map(row => ({
    id: (row.querySelector('[data-okr-kr-field="id"]') as HTMLInputElement | null)?.value.trim() ?? '',
    metric: (row.querySelector('[data-okr-kr-field="metric"]') as HTMLInputElement | null)?.value.trim() ?? '',
    target: (row.querySelector('[data-okr-kr-field="target"]') as HTMLInputElement | null)?.value.trim() ?? '',
    measurement: (row.querySelector('[data-okr-kr-field="measurement"]') as HTMLInputElement | null)?.value.trim() ?? '',
  })).filter(kr => kr.metric.length > 0);

  // Target repos: checked BAR suggestions + non-empty custom rows. Dedupe
  // because a user could paste a URL that also appears in a BAR.
  const suggestedRepoEls = Array.from(container.querySelectorAll('[data-okr-repo-suggestion]')) as HTMLInputElement[];
  const suggestedRepos = suggestedRepoEls.filter(cb => cb.checked).map(cb => cb.value);
  const repoRows = Array.from(container.querySelectorAll('[data-okr-repo-row]')) as HTMLElement[];
  const customRepos = repoRows
    .map(row => (row.querySelector('[data-okr-repo-field="url"]') as HTMLInputElement | null)?.value.trim() ?? '')
    .filter(s => s.length > 0);
  const targetCodeRepos = Array.from(new Set([...suggestedRepos, ...customRepos]));

  const barCheckboxes = Array.from(container.querySelectorAll('[data-okr-bar-id]')) as HTMLInputElement[];
  const affectedBarIds = barCheckboxes
    .filter(cb => cb.checked)
    .map(cb => cb.dataset.okrBarId ?? '')
    .filter(s => s.length > 0);

  const payload = {
    owner: get('meta.owner').trim(),
    paused: getChecked('meta.paused'),
    objective: {
      name: get('objective.name').trim(),
      description: get('objective.description'),
    },
    keyResults,
    objectiveAlignment: {
      platformId: get('objectiveAlignment.platformId').trim(),
      affectedBarIds,
      targetCodeRepos,
      intentCascade: {
        org: get('objectiveAlignment.intentCascade.org'),
        role: get('objectiveAlignment.intentCascade.role'),
        developer: get('objectiveAlignment.intentCascade.developer'),
        user: get('objectiveAlignment.intentCascade.user'),
      },
    },
  };

  if (mode === 'create') {
    vscode.postMessage({ type: 'createOkrFromDraft', draft: payload });
  } else if (mode === 'edit' && okrId) {
    vscode.postMessage({ type: 'saveOkrEdits', okrId, patch: payload });
  }
}
