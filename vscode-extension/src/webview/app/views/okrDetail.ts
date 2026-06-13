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
import { renderGitSyncBanner } from './barDetail';
import type {
  OkrCard, OkrAffectedBar, OkrAction, OkrPhase, OkrStatus,
  OkrAvailableBar, OkrAvailablePlatform, OkrDetailMode,
  GitSyncStatus,
} from '../../../types';
import { phaseSpec } from '../../../types/phaseSpec';

/**
 * Per-phase signal data fetched live from GitHub API (audit JSONL +
 * artifact markdown). Optional — undefined while loading or for phases
 * with no run yet. Populates the rich card layout from the §10.2 mockup.
 */
export interface OkrPhaseSignal {
  /** Provider skill_call counts (WHY only; HOW/WHAT use meshSkillCalls). */
  providers?: { tavily: number; arxiv: number; uspto: number; hn: number; total: number };
  /** Mesh skill_call counts (HOW only). */
  meshSkillCalls?: number;
  /** Gap-loop / refinement iterations (WHY only). */
  gapLoops?: number;
  followUps?: number;
  /** Citation / structural counts from the artifact markdown. */
  findings?: number;       // WHY: count of UNIQUE Sources S1-Sn (Task #57 — was max(N), now unique-id count)
  conclusions?: number;    // WHY: count of UNIQUE Conclusions C1-Cn (Task #55 — was raw match count)
  conclusionsWithCites?: number; // WHY: how many unique conclusions have an S-N citation within 4 lines
  briefTopicsCovered?: number;
  briefTopicsTotal?: number;
  /** HOW-phase counts. */
  frCount?: number;
  nfrCount?: number;
  srCount?: number;
  frWithCites?: number;
  srAnchored?: number;
  /** WHAT-phase counts (D-PR1.v1.1). */
  knowledgeCodeCalls?: number;       // total knowledge-code skill_calls in chain
  brownfieldRepoCount?: number;       // count of mode=brownfield knowledge-code responses
  greenfieldRepoCount?: number;       // count of mode=greenfield knowledge-code responses
  targetRepoCount?: number;           // total target_code_repos[] entries
  perRepoChangeCount?: number;        // total per-repo subsections in code-design.md §5
  /** PR-derived. */
  prNumber?: number;
  prUrl?: string;
  prState?: 'open' | 'closed' | 'merged';
  /** GitHub draft flag — agent's PR opens in draft while still working
   *  and marks ready-for-review when synthesis converges. Run Audit is
   *  hidden while draft; the card surfaces a "draft — agent still
   *  working" line instead. */
  prDraft?: boolean;
  /** True when the PR has requested_reviewers or requested_teams. Seen
   *  on PR #91: agent kept the PR in draft but asked for a review,
   *  meaning "I think I'm done" even though the draft flag says otherwise.
   *  Card surfaces a "Review requested" badge + Mark Ready affordance. */
  prReviewRequested?: boolean;
  /** ISO timestamp of when the user dispatched Revise with Agent. Set
   *  by the backend until a new commit lands on the PR head after the
   *  dispatch time. When present, the card shows a "🤖 Revision
   *  dispatched at HH:MM — waiting for new commits..." status line so
   *  the user gets feedback that the agent is working. */
  reviseDispatchedAt?: string;
  /** True once the user (or workflow) has applied the audit-trigger label
   *  (research-synthesis / prd-draft / design-draft) to the PR. Drives
   *  Run Audit button visibility. */
  auditLabelApplied?: boolean;
  /** True once the audit-and-drift workflow has applied the pass label
   *  (research-pass / prd-pass). Hides the Run Audit button and shows a
   *  success line instead. */
  passLabelApplied?: boolean;
  /** True when the audit-and-drift workflow ran and applied a failure
   *  label (degraded-evidence / goal-drift-detected / caterpillar-drift-
   *  detected). Distinguishes "audit finished and failed" from "audit
   *  still in flight" so the UI doesn't show ⏳ forever after a degraded
   *  verdict. */
  auditFailed?: boolean;
  /** Human-readable failure reasons (label name → why) for surfacing
   *  in the "Audit failed" line. */
  auditFailureReasons?: string[];
  /** OKR id (echoed back so the Run Audit button's click handler knows
   *  which OKR to message about — the action card doesn't otherwise
   *  carry the okr id down to the signal level). */
  okrId?: string;
  /** Inline artifact preview — when the user clicks the file icon next
   *  to the PR link, the extension fetches the markdown body via the
   *  GitHub Contents API and we render it in a collapsible panel below
   *  the card. `artifactOpen` toggles visibility; `artifactContent` is
   *  the raw markdown (rendered safely client-side). */
  artifactOpen?: boolean;
  artifactContent?: string;
  artifactPath?: string;
  artifactLoading?: boolean;
  /** H2 sections present in the artifact (out of 10 required). Drives
   *  the "structural correctness" line in both Why and How cards. */
  h2Present?: number;
  h2Total?: number;
  /** Pocket Watch alignment result. v2 is contrastive (rank/margin); cosine/
   *  threshold are legacy (Caterpillar still uses them). */
  pocketWatch?: { passed: 'true' | 'false' | 'skipped'; status?: 'pass' | 'needs_review' | 'fail' | 'skipped'; cosine?: number; threshold?: number; rank?: number; margin?: number; nearestOkr?: string; reason?: string };
  /** Caterpillar's Challenge cross-phase drift result (HOW + later phases). */
  caterpillar?: { passed: 'true' | 'false' | 'skipped'; status?: 'pass' | 'needs_review' | 'fail' | 'skipped'; cosine?: number; threshold?: number; rank?: number; margin?: number; nearestOkr?: string; reason?: string };
  /** B24: self-critique convergence — number of rounds the prd-agent ran
   *  Architect + Security persona self-reviews (one event per persona per
   *  round in the audit JSONL). Derived from `event_kind: self_review`. */
  selfReviewRounds?: number;
  /** Final per-persona score + severity from the highest round reached. */
  selfReviewArchitect?: { score?: number; severity?: string };
  selfReviewSecurity?: { score?: number; severity?: string };
  /** True if agent hit MAX_AUTO_ROUNDS without convergence (degraded signal). */
  selfReviewExhausted?: boolean;
  /** Audit chain root prefix (12 chars). */
  chainRoot?: string;
  /** Knight's Seal (B27 + Bug O): runner produces per-event Ed25519
   *  signatures using a per-epoch keypair (each agent session = its
   *  own signer epoch). CI invokes the runner's own audit-verify-chain
   *  skill against every committed `<runId>.epoch-N.pub.pem` and
   *  stamps the PR audit comment with the canonical Sealed ✓ — this
   *  flag drives the inline UI badge for fast scanning before clicking
   *  through to the PR. */
  sealed?: boolean;
  /** Partial-signature tampering observed: some events signed, some not.
   *  Block-worthy (the CI workflow fails the chain check with
   *  partial-signatures). Surfaces a red "Tampered" badge. */
  sealTampered?: boolean;
  /** Optional error to surface in the card. */
  error?: string;
  /** Set to true while the extension is fetching for the FIRST time
   *  (no previous data to display). Drives the cold-start "Loading…"
   *  placeholder. */
  loading?: boolean;
  /** Set to true while a BACKGROUND refresh is in flight (we already
   *  have last-known data we're still displaying). Task #54 — replaces
   *  the previous behavior of wiping data + flashing "Loading…" on
   *  every panel-focus / pull / post-audit poll. The UI keeps showing
   *  the prior metrics + lights a pulsing dot in the card header so
   *  the user knows a check is in-flight without state churn. */
  refreshing?: boolean;
}

export type OkrPhaseSignals = Partial<Record<OkrPhase, OkrPhaseSignal>>;

/**
 * D-PR4 sub-PR 4 — webview-local mirror of the FanOutPreflightReport
 * wire shape posted by the extension's onFanOutPreflight handler.
 *
 * Kept narrow + manual instead of importing from
 * `services/coordination/fanOutEngine` so the webview bundle stays
 * decoupled from the extension's GitHubService (which the engine
 * depends on for probe I/O). The wire shape matches verbatim; the
 * extension casts its typed report to `unknown` when posting and the
 * webview's pane renderer narrows by checking the discriminator
 * fields.
 */
export type FanOutPreflightStatusUi =
  | 'ready'
  | 'opened'
  | 'pending-on-upstream'
  | 'pending-on-cap'
  | 'pending-scaffold'
  | 'harness-missing'
  | 'permission-blocked'
  | 'repo-not-found'
  | 'repo-exists-conflict'
  | 'pr-opened'
  | 'pr-merged'
  | 'pr-rejected';

export interface FanOutRepoEntryUi {
  slug: string;
  status: 'connected' | 'create';
  decision: { status: FanOutPreflightStatusUi; reason?: string };
  coordinationRow?: {
    fanout_wave: number;
    coordination_role: 'foundation' | 'provider' | 'consumer' | 'independent';
    depends_on: string[];
  };
  /**
   * Bug-AAC — governance-tier warning from the owning BAR, attached by
   * the panel. `block` (restricted) = impl will be plan-only; `caution`
   * (supervised) = Edit needs approval. Absent for autonomous / when the
   * BAR can't be resolved.
   */
  governance?: {
    tier: 'autonomous' | 'supervised' | 'restricted';
    severity: 'block' | 'caution';
    planOnly: boolean;
    reason: string;
  };
  /**
   * The impl PR opened on the TARGET code repo for this row, when its
   * decision is `pr-opened`. Attached by the panel from the engine entry
   * (or the persisted design-fan-out row). Drives the "Mark PR ready"
   * affordance so a draft Copilot-agent impl PR can be flipped to
   * ready-for-review (which re-fires the Implementation Provenance gate).
   */
  implPrUrl?: string;
  implPrNumber?: number;
  /** Whether the impl PR is a DRAFT (D-PR5) — gates "Mark PR ready". */
  implPrIsDraft?: boolean;
  /** Count of workflow runs GitHub is HOLDING at action_required on the impl
   *  PR (Copilot-bot PRs trigger this). Drives the "⏳ N workflows awaiting
   *  approval" affordance + Checks deep-link. */
  workflowsAwaitingApproval?: number;
}

export type FanOutPreflightReportUi =
  | {
      ok: false;
      okrId: string;
      reason: 'coordination-section-missing' | 'coordination-yaml-malformed';
      detail: string;
    }
  | {
      ok: false;
      okrId: string;
      reason: 'coordination-verify-failed';
      verifyReason: string;
    }
  | {
      ok: true;
      okrId: string;
      entries: FanOutRepoEntryUi[];
      readyRepos: string[];
      waves: string[][];
    };

/**
 * Per-OKR webview state for the fan-out pre-flight pane. The pane
 * appears in view mode only AND only after WHAT completes; it shows a
 * pre-flight verdict per target repo, BAR/Cheshire prep affordances for
 * setup rows, and a "Fan out N of M ready" button for ready rows.
 *
 * Three states:
 *
 *   - `loading: true`        request in flight; show spinner
 *   - `setupError: <str>`    extension couldn't run pre-flight (no mesh,
 *                            WHAT not complete, artifact missing, etc.);
 *                            show a friendly inline message
 *   - `report` present       engine returned a discriminated report;
 *                            render the per-row pane + ready button
 */
export interface FanOutPreflightUiState {
  loading?: boolean;
  setupError?: string;
  report?: FanOutPreflightReportUi;
  /**
   * Target repos whose status is `not-connected` or `unreachable` --
   * engine can't probe them. Surfaced as a yellow chip so the user knows
   * to set the status before fan-out can include them.
   */
  skippedRepos?: Array<{ slug: string; status: 'not-connected' | 'unreachable' }>;
}

/**
 * Lightweight markdown → safe HTML renderer for inline artifact preview.
 *
 * We can't pull in markdown-it as a webview dependency without bundling
 * tradeoffs, so this implements just the subset that research-doc.md /
 * prd.md use: H1–H4 headings, fenced + inline code, links, lists,
 * blockquotes, simple tables, bold, italic, paragraphs, hr. Everything
 * else falls through as escaped text — no raw HTML passthrough, so the
 * agent can't smuggle a `<script>` into the panel.
 */
export function renderMarkdownSafe(md: string): string {
  // 1. Strip YAML frontmatter (Hatter Tag at the top of the artifact).
  let body = md.replace(/^---\n[\s\S]*?\n---\n+/, '');

  // 2. Pull out fenced code blocks first so we don't transform their content.
  const codeBlocks: string[] = [];
  body = body.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, _lang: string, code: string) => {
    codeBlocks.push(`<pre class="okr-md-pre"><code>${escapeHtml(code)}</code></pre>`);
    return `__OKRMD_FENCE_${codeBlocks.length - 1}__`;
  });

  // 3. Escape everything else.
  body = escapeHtml(body);

  // 4. Inline transformations (apply ON escaped text — links/bold/code
  //    inline never contain raw HTML because we escaped first).
  body = body
    // inline code
    .replace(/`([^`\n]+)`/g, '<code class="okr-md-code">$1</code>')
    // bold (**) and italic (*) — bold first to avoid * inside ** being parsed
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    // links [text](url) — url already escaped above (& → &amp;)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|#)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 5. Block transformations — split by blank lines, then dispatch.
  const blocks = body.split(/\n\n+/);
  const rendered = blocks.map(b => {
    const trimmed = b.trim();
    if (trimmed.length === 0) { return ''; }
    // Fence placeholder — restore the pre-rendered code block.
    if (/^__OKRMD_FENCE_\d+__$/.test(trimmed)) {
      const idx = parseInt(trimmed.replace(/[^\d]/g, ''), 10);
      return codeBlocks[idx] ?? '';
    }
    // Headings
    if (/^#{1,4} /.test(trimmed)) {
      const level = trimmed.match(/^#+/)![0].length;
      const text = trimmed.replace(/^#+\s*/, '');
      return `<h${level} class="okr-md-h${level}">${text}</h${level}>`;
    }
    // Horizontal rule
    if (/^(---+|\*\*\*+)$/.test(trimmed)) { return '<hr class="okr-md-hr" />'; }
    // Blockquote
    if (/^&gt;\s/.test(trimmed)) {
      return `<blockquote class="okr-md-quote">${trimmed.replace(/^&gt;\s?/gm, '')}</blockquote>`;
    }
    // Tables — quick detect: a line with `|` AND a separator line with `---`.
    if (/\|/.test(trimmed) && /\|.*\|\s*\n\s*[-:|\s]+\|/.test(trimmed)) {
      const lines = trimmed.split('\n').filter(l => l.includes('|'));
      const [header, , ...rows] = lines;
      const cells = (line: string): string[] => line.split('|').map(c => c.trim()).filter((_, i, a) => i !== 0 || a[0] !== '').filter((_, i, a) => i !== a.length - 1 || a[a.length - 1] !== '');
      const headerCells = cells(header);
      const rowCells = rows.map(cells);
      const thead = `<thead><tr>${headerCells.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rowCells.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
      return `<table class="okr-md-table">${thead}${tbody}</table>`;
    }
    // Ordered list
    if (/^\d+\. /m.test(trimmed) && trimmed.split('\n').every(l => /^\d+\. /.test(l) || l.startsWith('  '))) {
      const items = trimmed.split('\n').filter(l => /^\d+\. /.test(l));
      return `<ol class="okr-md-list">${items.map(i => `<li>${i.replace(/^\d+\.\s*/, '')}</li>`).join('')}</ol>`;
    }
    // Unordered list
    if (/^[-*] /m.test(trimmed) && trimmed.split('\n').every(l => /^[-*] /.test(l) || l.startsWith('  '))) {
      const items = trimmed.split('\n').filter(l => /^[-*] /.test(l));
      return `<ul class="okr-md-list">${items.map(i => `<li>${i.replace(/^[-*]\s*/, '')}</li>`).join('')}</ul>`;
    }
    // Default — paragraph. Preserve internal line breaks as <br>.
    return `<p class="okr-md-p">${trimmed.replace(/\n/g, '<br />')}</p>`;
  });

  return rendered.filter(Boolean).join('\n');
}

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

export interface OkrDetailRenderState {
  okr: OkrCard | null;
  affectedBars: OkrAffectedBar[];
  /** Optional in legacy callers; default 'view'. */
  mode?: OkrDetailMode;
  /** Required for edit/create modes; ignored in view. */
  availablePlatforms?: OkrAvailablePlatform[];
  availableBars?: OkrAvailableBar[];
  /** Mesh repo git status — drives the push/pull banner at the top of the page. */
  gitStatus?: GitSyncStatus | null;
  /** Per-phase signal data fetched from GitHub API. Populates rich phase cards. */
  phaseSignals?: OkrPhaseSignals;
  /** D-PR4 sub-PR 4 — fan-out pre-flight pane state (view mode only, post-WHAT). */
  fanOutPreflight?: FanOutPreflightUiState;
}

export function renderOkrDetailView(state: OkrDetailRenderState): string {
  const okr = state.okr;
  const mode = state.mode ?? 'view';
  if (!okr) {
    return `<div class="okr-detail-container"><p>OKR not loaded.</p></div>`;
  }
  const primaryTier = state.affectedBars[0]?.tier ?? 'restricted';
  const isForm = mode !== 'view';

  // View-mode only: surface the mesh push/pull banner at the top so
  // users can pull merged action results (e.g. after a HOW PR merges
  // and `okr.yaml.actions[].status` flips to `complete`) without having
  // to navigate back to the portfolio. Same renderer as barDetail uses.
  const banner = mode === 'view' && state.gitStatus ? renderGitSyncBanner(state.gitStatus) : '';

  return `
    <div class="okr-detail-container" data-okr-mode="${escapeAttr(mode)}" data-okr-id="${escapeAttr(okr.meta.id)}">
      ${banner}
      ${renderHeader(okr, primaryTier, mode)}
      ${isForm ? renderObjectiveForm(okr) : ''}
      ${isForm ? renderIntentCascadeForm(okr) : ''}
      ${renderKeyResults(okr, mode)}
      ${renderAffectedBars(state, mode)}
      ${renderTargetRepos(state, mode)}

      <h2 class="okr-section-heading">Actions</h2>
      <div class="okr-actions-row">
        ${renderActionCard(okr, 'why', state)}
        <div class="okr-actions-connector" aria-hidden="true">→</div>
        ${renderActionCard(okr, 'how', state)}
        <div class="okr-actions-connector" aria-hidden="true">→</div>
        ${renderActionCard(okr, 'what', state)}
      </div>
      ${renderPhaseGates(okr, primaryTier)}

      ${mode === 'view' ? renderFanOutPreflightPane(okr, state.fanOutPreflight, state.availableBars ?? []) : ''}

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
  // 🔄 Refresh — re-fetches the OKR + phase signals from GitHub
  // without needing to switch tabs (the panel-focus auto-refresh
  // requires losing + regaining focus). Useful right after Run Audit /
  // Re-run Audit / Revise with Agent when the workflow takes 10-30s
  // to land its labels.
  const refreshButton = mode === 'view'
    ? `<button class="okr-button-secondary" data-action="refresh-okr" data-okr-id="${escapeAttr(okr.meta.id)}" title="Re-fetch this OKR's phase signals from GitHub. Useful right after Run Audit / Re-run Audit while waiting for the workflow to land its verdict labels.">🔄 Refresh</button>`
    : '';

  if (mode === 'view') {
    return `
      <div class="okr-detail-breadcrumb">
        <button class="okr-link-button" data-action="back-to-okr-list">← OKRs</button>
        ${idLine}
        <span class="okr-detail-breadcrumb-spacer"></span>
        ${refreshButton}
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
    // A12 + A12.v1.1: per-repo intent + connection state. Four states drive
    // Phase D's brownfield-vs-greenfield branching:
    //   - 'connected'     → ✓ exists + wired; agent clones + grounds on code
    //   - 'not-connected' → exists, not wired; agent refuses, user must
    //                       Connect (open Actions settings) or reclassify
    //                       as Create
    //   - 'create'        → ✨ greenfield; repo doesn't exist; agent designs
    //                       from PRD + mesh only; fan-out scaffolds it
    //   - 'unreachable'   → ⚠ system-set after a probe; not user-pickable
    // The dropdown surfaces the three user-pickable states explicitly so
    // the user's intent is recorded (no more guessing what 'declared' meant).
    const statusMap = okr.objectiveAlignment.targetCodeRepoStatus ?? {};
    const items = repos.map(r => {
      const status = statusMap[r] ?? 'not-connected';
      const settingsUrl = `${r.replace(/\/$/, '')}/settings/actions`;
      const badge = status === 'connected'
        ? '<span class="okr-repo-status okr-repo-connected">✓ Connected</span>'
        : status === 'create'
        ? '<span class="okr-repo-status okr-repo-create">✨ Create (greenfield)</span>'
        : status === 'unreachable'
        ? '<span class="okr-repo-status okr-repo-unreachable">⚠ Unreachable</span>'
        : '<span class="okr-repo-status okr-repo-not-connected">○ Not Connected</span>';
      // Connect Repo ↗ only makes sense for 'not-connected' (exists but
      // not wired). For 'create' there's no repo to connect to; for
      // 'connected' the work is already done; for 'unreachable' the user
      // needs to fix the probe error before re-toggling.
      const showConnectBtn = status === 'not-connected';
      const connectBtn = showConnectBtn
        ? `<button class="okr-link-button" data-action="open-repo-actions-settings" data-url="${escapeAttr(settingsUrl)}" title="Open the repo's GitHub Settings → Actions page so you can enable workflows + approve the app installation.">Connect Repo ↗</button>`
        : '';
      // Dropdown — three user-pickable states. 'unreachable' is excluded
      // (system-set only after a probe-fail; surfaced via the badge).
      const opt = (val: 'connected' | 'not-connected' | 'create', label: string, hint: string) => {
        const selected = status === val ? ' selected' : '';
        return `<option value="${val}" title="${escapeAttr(hint)}"${selected}>${escapeHtml(label)}</option>`;
      };
      const statusSelect = `
        <select class="okr-repo-status-picker" data-action="set-repo-status" data-okr-id="${escapeAttr(okr.meta.id)}" data-repo-url="${escapeAttr(r)}" aria-label="Repo status for ${escapeAttr(r)}">
          ${opt('connected',     '✓ Connected',          'Repo exists on GitHub and Actions + app install are approved. The code-design agent will clone + ground on the actual code.')}
          ${opt('not-connected', '○ Not Connected',      'Repo exists on GitHub but not wired to Looking Glass yet. Code design will refuse to dispatch until you Connect or mark as Create.')}
          ${opt('create',        '✨ Create (greenfield)', "Repo does NOT exist yet — code design will design from PRD + mesh only, and the fan-out manifest will flag it for scaffolding. Use this when you're building a new repo from this OKR.")}
        </select>
      `;
      return `
        <li class="okr-repo-row">
          <code>${escapeHtml(r)}</code>
          ${badge}
          <span class="okr-repo-actions">${statusSelect}${connectBtn}</span>
        </li>
      `;
    }).join('');
    return `
      <h2 class="okr-section-heading">Target Code Repos</h2>
      <ul class="okr-repo-list">${items}</ul>
      <p class="okr-muted okr-section-note">Pick a status per repo. <strong>Connected</strong> = exists + wired (code design clones + grounds on real code). <strong>Not Connected</strong> = exists, not wired (click <strong>Connect Repo ↗</strong> to enable Actions + approve the app install). <strong>Create</strong> = greenfield (repo doesn't exist; code design works from PRD + mesh, fan-out scaffolds it). The code-design phase won't dispatch until every repo is either Connected or Create.</p>
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
  return { label: '☐ Not started', tone: 'idle', rationale: 'Ready to start' };
}

function renderActionCard(okr: OkrCard, phase: OkrPhase, state: OkrDetailRenderState): string {
  const primaryTier = state.affectedBars[0]?.tier ?? 'restricted';
  const substate = computeSubstate(okr, phase, primaryTier);
  const latest = latestActionFor(okr, phase);

  const signal = state.phaseSignals?.[phase];
  const phaseSignals = renderPhaseSignals(phase, latest, signal);
  const startButton = renderStartButton(phase, substate, okr, primaryTier);
  // The HumanGate panel (Approve / Re-run / Reject when the latest action is
  // `human_gate` / `blocked`) is rendered full-width BELOW the actions row by
  // renderPhaseGates — not inside this ⅓-width card — so the decision UI has
  // room when the three phase cards sit side-by-side.
  // "Cancel run" affordance for actions stuck in an in-flight state
  // when the user has already closed the GitHub issue/PR manually
  // (or the run died and we want to re-fire cleanly). Only renders for
  // running states — done/cancelled/failed actions don't need it.
  const cancelRun = latest && (
    latest.status === 'in_progress'
    || latest.status === 'under_review'
    || latest.status === 'revision_required'
    || latest.status === 'stalled'
  )
    ? renderCancelRun(okr, latest)
    : '';

  // D-PR1.v1.1 — Reset phase affordance. Visible when this phase has at
  // least one action AND none of those actions carry hatterChainRoot
  // (i.e. the phase is unsealed). Sealed phases are immutable; reset is
  // explicitly NOT offered for them — the audit chain is the product.
  const resetPhaseBtn = renderResetPhaseButton(okr, phase);

  // Task #54 — polling indicator. Shows a small ● in the card header
  // that's:
  //   • muted gray  — no live signal fetch attempted (pre-flight)
  //   • pulsing blue — refresh in flight (`signal.refreshing` set;
  //     last-known data still displayed underneath)
  //   • green        — last fetch succeeded, data is fresh on screen
  //   • red          — last fetch errored (signal.error populated)
  // Replaces the previous "wipe + flash Loading… on every refresh"
  // behavior. User asked for a visible polling indicator instead of
  // state churn.
  const pollIndicator = renderPollIndicator(signal);

  const refreshBtn = `<button class="okr-signal-card-refresh" data-action="refresh-okr" data-okr-id="${escapeAttr(okr.meta.id)}" title="Re-fetch this OKR's phase signals from GitHub (PR state, labels, audit verdict).">🔄</button>`;

  // Collapsed view: a phase whose latest action is complete AND sealed (the
  // audit chain is immutable + the product) recedes to a compact summary —
  // agent + status lights + always-on Verify / Export / Tag / seal controls,
  // with the metric numbers tucked behind `Details`. The live / gated phase
  // stays expanded so the eye lands on the card that needs action. Native
  // <details>; a manual expand resets on the next signal refresh, but done
  // phases are static so that's a non-issue in practice.
  const sealed = okr.actions.some(a => a.phase === phase && !!a.hatterChainRoot);
  if (latest?.status === 'complete' && sealed) {
    const parts = buildPhaseSignalParts(phase, latest, signal);
    const dots = renderPhaseDots(derivePhaseDots(phase, signal, true));
    const details = parts.metrics.length
      ? `<details class="okr-phase-details"><summary>Details</summary><div class="okr-action-signals okr-details-inner">${parts.metrics.join('')}</div></details>`
      : '';
    return `
    <div class="okr-action-card okr-action-card-done okr-action-collapsed">
      <div class="okr-collapsed-header">
        <div class="okr-collapsed-metarow">
          ${renderVerdictPill(phase)}
          <span class="okr-action-card-header-right">${pollIndicator}${refreshBtn}</span>
        </div>
        <div class="okr-collapsed-titlerow">
          <span class="okr-phase-check" title="Phase complete" aria-label="complete">✓</span>
          <span class="okr-action-phase">${escapeHtml(PHASE_LABEL[phase])}</span>
        </div>
      </div>
      <div class="okr-collapsed-body">
        ${parts.errorLine}
        ${parts.agent}
        ${dots}
        ${details}
      </div>
      ${renderCollapsedControls(phase, latest, signal, okr.meta.id)}
    </div>
  `;
  }

  return `
    <div class="okr-action-card okr-action-card-${substate.tone}">
      <div class="okr-action-card-header">
        <span class="okr-action-phase">${escapeHtml(PHASE_LABEL[phase])}</span>
        <span class="okr-action-substate">${escapeHtml(substate.label)}</span>
        ${pollIndicator}
        ${refreshBtn}
      </div>
      <p class="okr-action-rationale">${escapeHtml(substate.rationale)}</p>
      ${phaseSignals}
      <div class="okr-action-footer">
        ${startButton}
        ${cancelRun}
        ${resetPhaseBtn}
      </div>
    </div>
  `;
}

/**
 * HumanGate panels for any phase whose latest action awaits a human decision
 * (`human_gate` / `blocked`). Rendered full-width BELOW the actions row — not
 * inside the ⅓-width phase card — so the Approve / Re-run / Reject UI has room
 * when the three phase cards sit side-by-side. Phases are sequential, so
 * usually at most one is gated at a time.
 */
function renderPhaseGates(
  okr: OkrCard,
  primaryTier: 'autonomous' | 'supervised' | 'restricted',
): string {
  const phases: OkrPhase[] = ['why', 'how', 'what'];
  return phases.map(phase => {
    const latest = latestActionFor(okr, phase);
    if (!latest || (latest.status !== 'human_gate' && latest.status !== 'blocked')) { return ''; }
    return `
      <div class="okr-phase-gate">
        <div class="okr-phase-gate-label">${escapeHtml(PHASE_LABEL[phase])} — needs you</div>
        ${renderHumanGate(okr, latest, primaryTier)}
      </div>
    `;
  }).join('');
}

/**
 * Reset-phase button — visible only when the phase has at least one
 * action AND none of those actions carry a sealed chain_root_hash. The
 * panel-side handler shows a native VS Code modal confirming what
 * gets deleted before any file removal. The OKRService method that
 * runs the actual delete enforces the seal-immutability + cascading
 * guards a second time (defense-in-depth).
 */
function renderResetPhaseButton(okr: OkrCard, phase: OkrPhase): string {
  const actionsForPhase = okr.actions.filter(a => a.phase === phase);
  if (actionsForPhase.length === 0) { return ''; }
  // Sealed = at least one action has hatterChainRoot set. We bail
  // silently in that case so the user isn't shown a button they can't
  // use — the rationale is on the action card itself ("✓ Complete —
  // sealed at <chain root prefix>").
  const sealed = actionsForPhase.some(a => a.hatterChainRoot);
  if (sealed) { return ''; }
  const phaseLabel = phase.toUpperCase();
  return `
    <button
      class="okr-button-secondary okr-button-small okr-button-destructive"
      data-action="reset-okr-phase"
      data-okr-id="${escapeAttr(okr.meta.id)}"
      data-phase="${escapeAttr(phase)}"
      title="Delete the ${phaseLabel} phase artifact directory + audit events + actions[] entries. Only available because nothing for this phase is sealed. Cannot be undone."
    >
      ⟲ Reset ${escapeHtml(phaseLabel)}
    </button>
  `;
}

function renderCancelRun(okr: OkrCard, action: OkrAction): string {
  return `
    <button
      class="okr-button-secondary okr-button-small"
      data-action="cancel-okr-action"
      data-okr-id="${escapeAttr(okr.meta.id)}"
      data-action-id="${escapeAttr(action.id)}"
      title="Mark this run as cancelled (does not touch the GitHub issue)"
    >✕ Cancel run</button>
  `;
}

function renderHumanGate(okr: OkrCard, action: OkrAction, primaryTier: 'autonomous' | 'supervised' | 'restricted'): string {
  const restrictedNote = primaryTier === 'restricted'
    ? `<p class="okr-human-gate-warn">⚠ <strong>Restricted tier</strong> — Approve requires dual signature (two named approvers).</p>`
    : '';
  return `
    <div class="okr-human-gate" data-okr-id="${escapeAttr(okr.meta.id)}" data-action-id="${escapeAttr(action.id)}">
      <div class="okr-human-gate-header">⛔ HumanGate — auto-revision cycle exhausted</div>
      ${restrictedNote}
      <div class="okr-human-gate-actions">
        <button class="okr-button-primary" data-action="okr-approve" data-okr-id="${escapeAttr(okr.meta.id)}" data-action-id="${escapeAttr(action.id)}" data-tier="${escapeAttr(primaryTier)}">✓ Approve</button>
        <button class="okr-button-secondary" data-action="okr-rerun" data-okr-id="${escapeAttr(okr.meta.id)}" data-action-id="${escapeAttr(action.id)}">⟲ Re-run (counts as next round)</button>
        <button class="okr-button-secondary" data-action="okr-reject" data-okr-id="${escapeAttr(okr.meta.id)}" data-action-id="${escapeAttr(action.id)}">✕ Reject + re-scope</button>
      </div>
    </div>
  `;
}

/**
 * "Coverage" — what the structural correctness check found in the
 * artifact markdown. WHY surfaces brief topics + H2 sections;
 * HOW surfaces FR citation + SR anchor coverage + H2 sections.
 * Same label, same visual weight, phase-appropriate metrics.
 */
function renderCoverageLine(s: OkrPhaseSignal | undefined, phase: OkrPhase): string {
  if (!s) { return ''; }
  const parts: string[] = [];
  if (phase === 'why') {
    if (s.briefTopicsCovered != null && s.briefTopicsTotal != null) {
      const ok = s.briefTopicsCovered === s.briefTopicsTotal;
      parts.push(`${s.briefTopicsCovered}/${s.briefTopicsTotal} brief topics ${ok ? '✓' : '✗'}`);
    }
  } else if (phase === 'how') {
    if (s.frWithCites != null && s.frCount != null && s.frCount > 0) {
      const ok = s.frWithCites === s.frCount;
      parts.push(`FR cited ${s.frWithCites}/${s.frCount} ${ok ? '✓' : '✗'}`);
    }
    if (s.srAnchored != null && s.srCount != null && s.srCount > 0) {
      const ok = s.srAnchored === s.srCount;
      parts.push(`SR anchored ${s.srAnchored}/${s.srCount} ${ok ? '✓' : '✗'}`);
    }
  } else if (phase === 'what') {
    // WHAT-phase coverage (Task #58 honest-metric rewrite):
    //   frCount = unique FR-N ids referenced anywhere in code-design.md
    //   frWithCites = FRs picked up by at least one per-repo §5
    //                 subsection's `addresses: [FR-N]` frontmatter.
    //
    // The OLD comment claimed "workflow audit-and-drift does the deeper
    // per-repo coverage check" — that was false (code-design-agent.yml
    // only checks mode-honesty + chain integrity). The check moved
    // INTO the UI signal extractor (extractWhatArtifactSignals) so the
    // card line tells the truth without depending on a workflow step
    // that doesn't exist.
    if (s.frCount != null && s.frCount > 0) {
      const cited = s.frWithCites ?? 0;
      const ok = cited === s.frCount;
      parts.push(`FR addressed ${cited}/${s.frCount} ${ok ? '✓' : '✗'}`);
    }
    if (s.srCount != null && s.srCount > 0) {
      const anchored = s.srAnchored ?? 0;
      const ok = anchored === s.srCount;
      parts.push(`SR addressed ${anchored}/${s.srCount} ${ok ? '✓' : '✗'}`);
    }
  }
  if (s.h2Present != null && s.h2Total != null) {
    const ok = s.h2Present === s.h2Total;
    parts.push(`H2 sections ${s.h2Present}/${s.h2Total} ${ok ? '✓' : '✗'}`);
  }
  if (parts.length === 0) { return ''; }
  return `<div><strong>Coverage:</strong> ${parts.join(' · ')}</div>`;
}

/**
 * "Drift" — output of the embedding-based drift gates. WHY runs only
 * Pocket Watch (objective vs Executive Summary). HOW runs both
 * Pocket Watch (objective vs Problem Statement) AND Caterpillar's
 * Challenge (PRD Problem Statement vs research-doc Executive Summary).
 * Surfacing the actual cosines is what gives the reviewer visual
 * confidence — "fail" is loud, "pass" is reassuring.
 */
function renderDriftLine(s: OkrPhaseSignal | undefined, phase: OkrPhase): string {
  if (!s) { return ''; }
  const parts: string[] = [];
  const fmt = (
    label: string,
    check: { passed: 'true' | 'false' | 'skipped'; status?: 'pass' | 'needs_review' | 'fail' | 'skipped'; cosine?: number; threshold?: number; rank?: number; margin?: number; reason?: string } | undefined,
  ): string | null => {
    if (!check) { return null; }
    if (check.passed === 'skipped' || check.status === 'skipped') { return `${label} — skipped`; }
    // v2 contrastive (Pocket Watch): rank #N + margin, advisory while calibrating.
    if (check.rank != null) {
      const icon = check.status === 'needs_review' ? '⚠' : check.status === 'fail' ? '✗' : '✓';
      const margin = check.margin != null ? ` ${check.margin >= 0 ? '+' : ''}${check.margin.toFixed(2)}` : '';
      return `${label} ${icon} rank #${check.rank}${margin}`;
    }
    // legacy absolute cosine ≥ threshold (Caterpillar).
    const cosine = check.cosine != null ? check.cosine.toFixed(2) : '?';
    const threshold = check.threshold != null ? check.threshold.toFixed(2) : '?';
    if (check.passed === 'true') { return `${label} ✓ ${cosine} ≥ ${threshold}`; }
    return `${label} ✗ ${cosine} &lt; ${threshold}`;
  };
  const pw = fmt('Pocket Watch', s.pocketWatch);
  if (pw) { parts.push(pw); }
  if (phase === 'how' || phase === 'what') {
    const cat = fmt("Caterpillar", s.caterpillar);
    if (cat) { parts.push(cat); }
  }
  if (parts.length === 0) { return ''; }
  return `<div><strong>Drift:</strong> ${parts.join(' · ')}</div>`;
}

/**
 * Pre-flight pre-action descriptor: tells the reader what WILL run and what
 * the audit gate looks like before they click Start. Extracted from
 * renderPhaseSignals so the main function stays a thin orchestrator.
 */
function renderPreflightSignal(phase: OkrPhase): string {
  if (phase === 'why') {
    return `<div class="okr-action-signals">
      <div><strong>Agent:</strong> market-research-agent</div>
      <div><strong>Will run:</strong> 4 search providers (Tavily · arXiv · USPTO · HackerNews) + JTBD analysis + gap-refinement loop</div>
      <div><strong>Audit gate:</strong> evidence honesty (≥1 successful skill_call) · 10/4 H2/H3 structural check · Pocket Watch goal-drift</div>
    </div>`;
  }
  if (phase === 'how') {
    return `<div class="okr-action-signals">
      <div><strong>Agent:</strong> prd-agent</div>
      <div><strong>Will run:</strong> mesh-grounded synthesis (knowledge-okr · knowledge-research · mesh-bar · ADRs · threats · context-architecture/security/quality) + optional Ask-Experts refinement</div>
      <div><strong>Audit gate:</strong> 10 H2 sections · FR-NN/SR-NN citation coverage · Pocket Watch · Caterpillar's Challenge (vs research-doc)</div>
      <div><strong>Self-critique:</strong> persona-switch pass (architect · security · quality lenses, single agent)</div>
    </div>`;
  }
  return `<div class="okr-action-signals">
    <div><strong>Agent:</strong> code-design-agent</div>
    <div><strong>Will run:</strong> code-grounded design synthesis (knowledge-prd · knowledge-code per repo · context-architecture/security/quality) + persona-switch self-critique (code-architect · code-security)</div>
    <div><strong>Audit gate:</strong> 10 H2 sections · FR-NN/SR-NN coverage from merged PRD · per-repo mode honesty · required skill_call manifest · per-epoch Ed25519 chain</div>
    <div><strong>Gated on:</strong> How merged</div>
  </div>`;
}

/**
 * Per-phase metric lines (Sources · Refine · Findings · Coverage · Drift).
 * Names line up across phases for consistent visual scan; the metrics
 * underneath differ (skill_call mix, refinement style, citation shapes).
 */
/**
 * Polling indicator dot — shown in the card header. Task #54 visual
 * proxy for fetch state. Title attribute carries the same info for
 * screen readers + hover tooltip.
 *
 *   • undefined signal           → muted gray (idle, never fetched)
 *   • signal.loading             → pulsing blue (cold-start fetch)
 *   • signal.refreshing          → pulsing blue (background refresh)
 *   • signal.error               → solid red ("✗" mark — needs attention)
 *   • otherwise                  → solid green ("●" — fresh data on screen)
 */
function renderPollIndicator(signal: OkrPhaseSignal | undefined): string {
  if (!signal) {
    return `<span class="okr-poll-dot okr-poll-dot-idle" title="No phase signal — not yet fetched"></span>`;
  }
  if (signal.error) {
    return `<span class="okr-poll-dot okr-poll-dot-error" title="Last fetch failed: ${escapeAttr(signal.error)}">✗</span>`;
  }
  if (signal.loading) {
    return `<span class="okr-poll-dot okr-poll-dot-pulse" title="Fetching live signals from GitHub…"></span>`;
  }
  if (signal.refreshing) {
    return `<span class="okr-poll-dot okr-poll-dot-pulse" title="Refreshing live signals from GitHub… (showing last-known data)"></span>`;
  }
  return `<span class="okr-poll-dot okr-poll-dot-fresh" title="Live signals fresh from GitHub"></span>`;
}

function renderWhyMetrics(s: OkrPhaseSignal | undefined, loading: boolean | undefined): string[] {
  // Task #54: only show the cold-start placeholder if we truly have NO
  // data yet. Background refreshes (s.refreshing=true) keep displaying
  // the last-known metrics + rely on the header poll dot to signal
  // in-flight. This kills the strange-flicker the user reported.
  if (loading && !s?.providers && !s?.findings && s?.gapLoops == null && s?.conclusions == null) {
    return [`<div class="okr-muted">Loading sources · refine · findings · coverage · drift from GitHub…</div>`];
  }
  const lines: string[] = [];
  if (s?.providers) {
    const providerCount = (['tavily', 'arxiv', 'uspto', 'hn'] as const)
      .filter(k => (s.providers as Record<string, number>)[k] > 0).length;
    lines.push(`<div><strong>Sources:</strong> ${s.providers.total} successful skill_calls · ${providerCount}/4 providers (Tavily · arXiv · USPTO · HN)</div>`);
  }
  if (s?.gapLoops != null || s?.followUps != null) {
    const gap = s.gapLoops ?? 0;
    const fu = s.followUps ?? 0;
    lines.push(`<div><strong>Refine:</strong> ${gap} gap-loop${gap === 1 ? '' : 's'} · ${fu} follow-up quer${fu === 1 ? 'y' : 'ies'}</div>`);
  }
  if (s?.findings != null) {
    const concl = s.conclusions ?? 0;
    // Task #55/#57 honest-display: both numbers are now UNIQUE counts.
    // "9 conclusions" was a regex-occurrence count over an artifact that
    // truly had 4; "S1–S14 cited" was max(N) regardless of whether
    // every S-id in the range existed. Now reads as plain unique counts.
    const conclLabel = concl === 1 ? 'conclusion' : 'conclusions';
    const srcLabel = s.findings === 1 ? 'source' : 'sources';
    let line = `<div><strong>Findings:</strong> ${concl} ${conclLabel}`;
    if (s.conclusionsWithCites != null && concl > 0) {
      line += ` (${s.conclusionsWithCites}/${concl} cite ≥1 source)`;
    }
    line += ` · ${s.findings} ${srcLabel} cited</div>`;
    lines.push(line);
  }
  lines.push(renderCoverageLine(s, 'why'));
  lines.push(renderDriftLine(s, 'why'));
  return lines;
}

/**
 * WHAT-phase signals (D-PR1.v1.1).
 *
 * Same five-line shape as HOW (Sources · Refine · Findings · Coverage ·
 * Drift) for visual consistency across phases. Metrics differ:
 *   - Sources: mesh-skill calls + per-mode knowledge-code count
 *     (brownfield + greenfield breakdown — proves the agent actually
 *     ran knowledge-code against the real repos and got the right modes).
 *   - Refine: persona-switch round count from chain skill_calls
 *     (B29-style; per-persona scores aren't yet extracted into signals
 *     because the agent emits them inside the artifact md rather than
 *     as audit events — D-PR2 will add proper score extraction).
 *   - Findings: per-repo subsection count from §5 Per-Repo Change List.
 *   - Coverage: FR / SR unique-id count from the artifact (every FR/SR
 *     mentioned anywhere = covered; workflow audit-and-drift does the
 *     deeper per-repo addresses check).
 *   - Drift: Pocket Watch + Caterpillar cosines (report-only in D-PR1
 *     MVP; calibrated in D-PR1.v2).
 */
function renderWhatMetrics(s: OkrPhaseSignal | undefined, loading: boolean | undefined): string[] {
  // Task #54: only cold-start placeholder. Refresh keeps prior data.
  if (loading && s?.meshSkillCalls == null && s?.knowledgeCodeCalls == null && s?.selfReviewRounds == null && s?.perRepoChangeCount == null) {
    return [`<div class="okr-muted">Loading sources · findings · coverage · drift · self-review from GitHub…</div>`];
  }
  const lines: string[] = [];
  // Sources line: mesh-skill calls + per-mode knowledge-code breakdown.
  if (s?.meshSkillCalls != null || s?.knowledgeCodeCalls != null) {
    const parts: string[] = [];
    if (s?.meshSkillCalls != null) {
      parts.push(`${s.meshSkillCalls} mesh-skill calls`);
    }
    if (s?.knowledgeCodeCalls != null && s.knowledgeCodeCalls > 0) {
      const bf = s.brownfieldRepoCount ?? 0;
      const gf = s.greenfieldRepoCount ?? 0;
      parts.push(`${s.knowledgeCodeCalls} <code>knowledge-code</code> calls (${bf} brownfield · ${gf} greenfield)`);
    }
    lines.push(`<div><strong>Sources:</strong> ${parts.join(' · ')}</div>`);
  }
  // Refine: persona-switch round count (code-architect + code-security).
  if (s?.selfReviewRounds != null && s.selfReviewRounds > 0) {
    lines.push(`<div><strong>Refine:</strong> ${s.selfReviewRounds} self-review round${s.selfReviewRounds === 1 ? '' : 's'} (Code-Architect + Code-Security personas)</div>`);
  }
  // Findings: per-repo change list count.
  if (s?.perRepoChangeCount != null && s.perRepoChangeCount > 0) {
    lines.push(`<div><strong>Findings:</strong> ${s.perRepoChangeCount} per-repo change-list section${s.perRepoChangeCount === 1 ? '' : 's'}</div>`);
  }
  lines.push(renderCoverageLine(s, 'what'));
  lines.push(renderDriftLine(s, 'what'));
  // Bug SS — per-persona scores. Mirrors renderHowMetrics; pre-fix the
  // WHAT card extracted selfReviewArchitect/selfReviewSecurity in the
  // backend (LookingGlassPanel.ts:822-826) but never rendered them, so
  // the "Refine: 2 rounds" line had no companion scores even when the
  // chain had `0.96 / 0.95` from the Code-Architect + Code-Security
  // personas. PRD card showed scores; WHAT card didn't — pure UI drift.
  const arch = s?.selfReviewArchitect;
  const sec = s?.selfReviewSecurity;
  if (arch?.score != null || sec?.score != null) {
    const archCell = arch?.score != null
      ? `${arch.score.toFixed(2)} (${arch.severity ?? '?'})${arch.severity && ['PASS','MINOR'].includes(arch.severity) ? ' ✓' : ' ✗'}`
      : '—';
    const secCell = sec?.score != null
      ? `${sec.score.toFixed(2)} (${sec.severity ?? '?'})${sec.severity && ['PASS','MINOR'].includes(sec.severity) ? ' ✓' : ' ✗'}`
      : '—';
    lines.push(`<div><strong>Self-review:</strong> Code-Arch ${archCell} · Code-Sec ${secCell}</div>`);
  }
  return lines;
}

function renderHowMetrics(s: OkrPhaseSignal | undefined, loading: boolean | undefined): string[] {
  // Task #54: only cold-start placeholder. Refresh keeps prior data.
  if (loading && s?.meshSkillCalls == null && s?.selfReviewRounds == null && s?.frCount == null) {
    return [`<div class="okr-muted">Loading sources · findings · coverage · drift · self-review from GitHub…</div>`];
  }
  const lines: string[] = [];
  if (s?.meshSkillCalls != null) {
    lines.push(`<div><strong>Sources:</strong> ${s.meshSkillCalls} mesh-skill calls (knowledge · context · ADRs · threats)</div>`);
  }
  // B24: self-review rounds (bounded persona-switch critique inside prd-agent).
  if (s?.selfReviewRounds != null && s.selfReviewRounds > 0) {
    const exh = s.selfReviewExhausted ? ' ⚠ exhausted' : '';
    lines.push(`<div><strong>Refine:</strong> ${s.selfReviewRounds} self-review round${s.selfReviewRounds === 1 ? '' : 's'} (Architect + Security personas)${exh}</div>`);
  }
  if (s?.frCount != null || s?.nfrCount != null || s?.srCount != null) {
    const fr = s.frCount ?? 0;
    const nfr = s.nfrCount ?? 0;
    const sr = s.srCount ?? 0;
    lines.push(`<div><strong>Findings:</strong> ${fr} FR · ${nfr} NFR · ${sr} SR</div>`);
  }
  lines.push(renderCoverageLine(s, 'how'));
  lines.push(renderDriftLine(s, 'how'));
  // B24: per-persona scores from the audit JSONL (was external reviewer scores).
  const arch = s?.selfReviewArchitect;
  const sec = s?.selfReviewSecurity;
  if (arch?.score != null || sec?.score != null) {
    const archCell = arch?.score != null
      ? `${arch.score.toFixed(2)} (${arch.severity ?? '?'})${arch.severity && ['PASS','MINOR'].includes(arch.severity) ? ' ✓' : ' ✗'}`
      : '—';
    const secCell = sec?.score != null
      ? `${sec.score.toFixed(2)} (${sec.severity ?? '?'})${sec.severity && ['PASS','MINOR'].includes(sec.severity) ? ' ✓' : ' ✗'}`
      : '—';
    lines.push(`<div><strong>Self-review:</strong> Arch ${archCell} · Sec ${secCell}</div>`);
  }
  return lines;
}

/**
 * PR + audit cascade — PR link, draft/ready states, Run Audit / Mark Ready
 * / Merge / Revise / Re-run / View Artifact affordances. The most complex
 * branch in the phase-signal renderer because each PR state surfaces a
 * different action.
 */
function renderPrCascade(s: OkrPhaseSignal, phase: OkrPhase): string[] {
  const lines: string[] = [];
  const state = s.prState ?? 'open';
  const draft = s.prDraft === true;
  const stateLabel = state === 'merged'
    ? '🟣 merged'
    : state === 'closed'
      ? '🔴 closed'
      : draft
        ? '📝 draft'
        : '🟢 open';
  const viewArtifactBtn = `<button class="okr-link-button okr-md-toggle-btn" data-action="toggle-artifact" data-okr-id="${escapeAttr(s.okrId ?? '')}" data-phase="${escapeAttr(phase)}" title="View the produced markdown inline">📄 ${s?.artifactOpen ? 'Hide' : 'View'} artifact</button>`;
  const canMerge = state === 'open' && !draft && s?.passLabelApplied === true;
  const mergeBtn = canMerge
    ? `<button class="okr-button-primary okr-button-small okr-md-merge-btn" data-action="merge-pr" data-okr-id="${escapeAttr(s.okrId ?? '')}" data-phase="${escapeAttr(phase)}" data-pr-number="${s.prNumber}" title="Squash-merges the PR via GitHub API. Branch protection still applies.">✓ Merge PR</button>`
    : '';
  lines.push(`
    <div class="okr-signal-pr-row">
      <strong>PR:</strong>
      <a class="okr-link-button" href="${escapeAttr(s.prUrl ?? '')}" target="_blank" rel="noopener">#${s.prNumber} ${stateLabel} ↗</a>
      ${viewArtifactBtn}
      ${mergeBtn}
    </div>
  `);

  // Review-requested badge — agent flagged "done" without flipping draft.
  if (s?.prReviewRequested === true && state === 'open') {
    lines.push(`<div class="okr-signal-review-requested">📋 Review requested by the agent.</div>`);
  }

  const { draftLabel: labelName, agentName } = phaseSpec(phase);

  // Cascade — exactly one of these branches fires.
  if (state === 'open' && !draft && s?.auditLabelApplied === false && s?.passLabelApplied !== true) {
    lines.push(`
      <div class="okr-signal-audit-action">
        <button class="okr-button-primary okr-button-small" data-action="run-audit"
          data-okr-id="${escapeAttr(s.okrId ?? '')}" data-phase="${escapeAttr(phase)}"
          data-pr-number="${s.prNumber}"
          title="Applies the \`${labelName}\` label to the PR, which triggers the audit + drift workflow.">
          🔍 Run Audit
        </button>
        <span class="okr-muted okr-signal-audit-hint">Applies <code>${labelName}</code> to trigger the audit + drift workflow.</span>
      </div>
    `);
  } else if (state === 'open' && draft) {
    const markReadyBtn = s?.prReviewRequested === true
      ? `<button class="okr-button-primary okr-button-small okr-md-ready-btn" data-action="mark-pr-ready" data-okr-id="${escapeAttr(s.okrId ?? '')}" data-phase="${escapeAttr(phase)}" data-pr-number="${s.prNumber}" title="Flip the PR out of draft so Run Audit can fire.">✅ Mark PR ready</button>`
      : '';
    const msg = s?.prReviewRequested === true
      ? `📝 Draft — but the agent has requested a review, suggesting it thinks the work is done. Mark the PR ready to unlock Run Audit.`
      : `📝 Draft — agent is still committing. Run Audit appears once the PR is marked ready-for-review.`;
    lines.push(`<div class="okr-signal-pr-pending">${msg} ${markReadyBtn}</div>`);
  } else if (s?.reviseDispatchedAt) {
    const at = new Date(s.reviseDispatchedAt);
    const hhmm = at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    lines.push(`<div class="okr-signal-revise-pending">🤖 Revision dispatched at ${hhmm} — waiting for the agent's new commits. The card will refresh automatically when they arrive (auto-polling every 5–60s).</div>`);
  } else if (s?.auditLabelApplied && s?.auditFailed === true) {
    const reasons = (s.auditFailureReasons ?? []).map(r => `<li>${escapeHtml(r)}</li>`).join('');
    lines.push(`
      <div class="okr-signal-audit-failed">
        <div class="okr-signal-audit-failed-header">✗ Audit failed — revise the artifact (with the agent or manually), then re-run.</div>
        <ul class="okr-signal-audit-reasons">${reasons}</ul>
        <div class="okr-signal-audit-actions">
          <button class="okr-button-primary okr-button-small" data-action="revise-with-agent"
            data-okr-id="${escapeAttr(s.okrId ?? '')}" data-phase="${escapeAttr(phase)}"
            data-pr-number="${s.prNumber}"
            title="Posts a structured PR comment dispatching ${agentName} with the audit failure reasons attached.">
            🤖 Revise with agent
          </button>
          <button class="okr-button-secondary okr-button-small" data-action="rerun-audit"
            data-okr-id="${escapeAttr(s.okrId ?? '')}" data-phase="${escapeAttr(phase)}"
            data-pr-number="${s.prNumber}"
            title="Removes + re-applies \`${labelName}\` to re-trigger the audit on the current PR state. Use this if you manually edited the artifact.">
            🔁 Re-run Audit
          </button>
        </div>
      </div>
    `);
  } else if (s?.auditLabelApplied && s?.passLabelApplied !== true) {
    lines.push(`<div class="okr-signal-audit-status">⏳ Audit in flight — refresh after the workflow posts its summary comment.</div>`);
  } else if (s?.passLabelApplied) {
    const passLabel = phaseSpec(phase).passLabel;
    lines.push(`<div class="okr-signal-audit-status">✓ Audit passed — <code>${passLabel}</code> applied. Merge unlocked (subject to branch protection).</div>`);
  }

  // Collapsible artifact preview — toggled by 📄 View artifact.
  if (s?.artifactOpen) {
    const path = s.artifactPath ?? (phase === 'why' ? 'research-doc.md' : phase === 'how' ? 'prd.md' : 'code-design.md');
    if (s.artifactLoading) {
      lines.push(`<div class="okr-md-panel"><div class="okr-md-panel-header">📄 <code>${escapeHtml(path)}</code></div><div class="okr-md-panel-body okr-muted">Loading from GitHub…</div></div>`);
    } else if (s.artifactContent) {
      const rendered = renderMarkdownSafe(s.artifactContent);
      lines.push(`<div class="okr-md-panel"><div class="okr-md-panel-header">📄 <code>${escapeHtml(path)}</code> <span class="okr-muted">(rendered from GitHub)</span></div><div class="okr-md-panel-body">${rendered}</div></div>`);
    } else {
      lines.push(`<div class="okr-md-panel"><div class="okr-md-panel-header">📄 <code>${escapeHtml(path)}</code></div><div class="okr-md-panel-body okr-muted">Could not load artifact from GitHub (not committed yet?). Try again after the agent's PR opens.</div></div>`);
    }
  }

  return lines;
}

interface PhaseSignalParts {
  /** `⚠ …` error line, or ''. */
  errorLine: string;
  /** `Agent: <name>` line — always shown (collapsed cards keep it visible). */
  agent: string;
  /** Sources · Refine · Findings · Coverage · Drift · Self-review + Run-meta.
   *  COLLAPSIBLE — a done card tucks these behind a `<details>`. */
  metrics: string[];
  /** PR link/cascade + Knight's-Seal + Verify / Export / Tag. ALWAYS-ON —
   *  a collapsed card keeps these visible (the audit chain is the product). */
  controls: string[];
}

/**
 * Split a phase's post-flight signals into agent / collapsible metrics /
 * always-on controls. The collapsed (done + sealed) action card tucks the
 * metric numbers behind a `<details>` while keeping the PR + seal + Verify /
 * Export / Tag controls visible; the expanded card joins them back in the
 * original order, so its rendered output is byte-identical to the pre-split
 * renderer (the existing okrViews tests pin that).
 */
function buildPhaseSignalParts(phase: OkrPhase, action: OkrAction, signal: OkrPhaseSignal | undefined): PhaseSignalParts {
  const s = signal;
  const loading = s?.loading;
  const errorLine = s?.error ? `<div class="okr-signal-error">⚠ ${escapeHtml(s.error)}</div>` : '';
  const agent = `<div><strong>Agent:</strong> ${escapeHtml(action.agent)}</div>`;

  // Phase-specific signal lines — same labels (Sources · Refine · Findings ·
  // Coverage · Drift) across WHY/HOW/WHAT for consistent visual scan.
  const metrics: string[] = [];
  if (phase === 'why') {
    metrics.push(...renderWhyMetrics(s, loading));
  } else if (phase === 'how') {
    metrics.push(...renderHowMetrics(s, loading));
  } else {
    metrics.push(...renderWhatMetrics(s, loading));
  }
  // WHY has no reviewers so "Rounds: 0" is meaningless; HOW/WHAT show rounds.
  if (phase === 'why') {
    metrics.push(`<div class="okr-signal-meta">Run <code>${escapeHtml(action.runId)}</code> · Tier: ${escapeHtml(action.governanceTier)}</div>`);
  } else {
    metrics.push(`<div class="okr-signal-meta">Run <code>${escapeHtml(action.runId)}</code> · Rounds: ${action.rounds} · Tier: ${escapeHtml(action.governanceTier)}</div>`);
  }

  const controls: string[] = [];
  // In-flight without PR yet → "PR pending" placeholder; merged-but-stuck →
  // inline Pull. Both are control-row affordances, not metrics.
  const actionInFlight = action.status === 'in_progress' || action.status === 'under_review' || action.status === 'revision_required' || action.status === 'stalled';
  if (!s?.prUrl && actionInFlight) {
    controls.push(`<div class="okr-signal-pr-pending">⏳ PR pending — agent is building. Refresh once the workflow run completes (or switch away and back to auto-refresh).</div>`);
  }
  if (s?.prState === 'merged' && actionInFlight) {
    controls.push(`
      <div class="okr-signal-pr-pending">
        <span>📥 PR merged on GitHub but local <code>action.status</code> still says in-flight. Pull to sync, or if the mesh is already up-to-date, <code>finalize</code> may have crashed (check workflow logs).</span>
        <button id="btn-pull-mesh-inline" class="okr-button-primary okr-button-small" data-action="pull-mesh-inline" title="Same Pull action as the top banner — auto-stash safe.">📥 Pull mesh</button>
      </div>
    `);
  }
  if (s?.prUrl && s?.prNumber != null) {
    controls.push(...renderPrCascade(s, phase));
  }

  // Hatter chain root + Knight's Seal badge + View Tag / Verify Chain / Export.
  const chainRoot = s?.chainRoot ?? action.hatterChainRoot;
  if (chainRoot) {
    let sealBadge = '';
    if (s?.sealTampered) {
      sealBadge = ` <span class="okr-seal-badge okr-seal-tampered" title="Partial signatures — chain tampered. PR audit comment has details.">⛔ Tampered</span>`;
    } else if (s?.sealed === true) {
      sealBadge = ` <span class="okr-seal-badge okr-seal-ok" title="Every audit event signed with the run's ephemeral Ed25519 key. CI workflow verifies on PR audit.">🛡 Sealed</span>`;
    }
    controls.push(`
      <div class="okr-signal-chain">
        <strong>Hatter:</strong> chain_root <code>${escapeHtml(chainRoot.slice(0, 12))}…</code>${sealBadge}
        <button class="okr-link-button okr-signal-chain-btn" data-action="view-hatter-tag"
          data-action-id="${escapeAttr(action.id)}" data-run-id="${escapeAttr(action.runId)}">View Tag ↗</button>
        <button class="okr-link-button okr-signal-chain-btn" data-action="verify-chain"
          data-action-id="${escapeAttr(action.id)}" data-run-id="${escapeAttr(action.runId)}">Verify Chain ↗</button>
        <button class="okr-link-button okr-signal-chain-btn" data-action="export-audit"
          data-action-id="${escapeAttr(action.id)}" data-run-id="${escapeAttr(action.runId)}">Export Report ↗</button>
      </div>
    `);
  }

  return { errorLine, agent, metrics, controls };
}

function renderPhaseSignals(phase: OkrPhase, action: OkrAction | undefined, signal: OkrPhaseSignal | undefined): string {
  // Pre-flight: describe the contract before the user clicks Start.
  if (!action) { return renderPreflightSignal(phase); }
  // Post-flight: agent + metrics + controls in the original order — the
  // expanded action card renders the full block exactly as before.
  const p = buildPhaseSignalParts(phase, action, signal);
  return `<div class="okr-action-signals">${p.errorLine}${p.agent}${p.metrics.join('')}${p.controls.join('')}</div>`;
}

type DotStatus = 'ok' | 'warn' | 'fail' | 'pend';
interface PhaseDot { label: string; status: DotStatus; title: string; }

const PASS_LABEL: Record<OkrPhase, string> = { why: 'research-pass', how: 'prd-pass', what: 'design-pass' };

/** Worst-of the two alignment rails (Pocket Watch + Caterpillar): fail beats
 *  advisory beats pass; an absent/skipped rail contributes nothing. */
function worstDriftStatus(vals: Array<string | undefined>): DotStatus {
  if (vals.includes('fail')) { return 'fail'; }
  if (vals.includes('needs_review')) { return 'warn'; }
  if (vals.includes('pass')) { return 'ok'; }
  return 'pend';
}

/**
 * Per-phase status lights for the collapsed card. A done + sealed phase
 * MERGED, so its blocking gates (Sources · Refine · Coverage) passed → green.
 * Drift + Self-review are advisory / quality lenses that can legitimately sit
 * at amber on a passed phase, so they're derived from the real signal. A
 * not-done phase shows pending (gray) dots — the live card is expanded anyway.
 */
function derivePhaseDots(phase: OkrPhase, s: OkrPhaseSignal | undefined, done: boolean): PhaseDot[] {
  const gate: DotStatus = done ? 'ok' : 'pend';
  const dots: PhaseDot[] = [
    { label: 'Sources', status: gate, title: 'Evidence gathered via runner skills' },
    { label: 'Refine', status: done ? (s?.selfReviewExhausted ? 'warn' : 'ok') : 'pend', title: 'Gap-loop / self-review refinement' },
    { label: 'Coverage', status: gate, title: 'Structural + citation coverage (audit gate)' },
    { label: 'Drift', status: done ? worstDriftStatus([s?.pocketWatch?.status, s?.caterpillar?.status]) : 'pend', title: 'Pocket Watch + Caterpillar alignment (advisory)' },
  ];
  if (phase !== 'why') {
    const sevs = [s?.selfReviewArchitect?.severity, s?.selfReviewSecurity?.severity].filter((x): x is string => !!x);
    let sr: DotStatus = 'pend';
    if (done) {
      sr = (sevs.length > 0 && sevs.some(x => !['PASS', 'MINOR'].includes(x))) ? 'warn' : 'ok';
    }
    dots.push({ label: 'Self-review', status: sr, title: 'Architect + Security persona review' });
  }
  return dots;
}

function renderPhaseDots(dots: PhaseDot[]): string {
  if (dots.length === 0) { return ''; }
  const word: Record<DotStatus, string> = { ok: 'pass', warn: 'advisory', fail: 'fail', pend: 'pending' };
  return `<div class="okr-phase-dots">${dots.map(d =>
    `<span class="okr-phase-dot" title="${escapeAttr(`${d.label}: ${word[d.status]} — ${d.title}`)}"><span class="okr-dot okr-dot-${d.status}"></span>${escapeHtml(d.label)}</span>`,
  ).join('')}</div>`;
}

/** Verdict pill for a collapsed (done + sealed → passed) phase card. */
function renderVerdictPill(phase: OkrPhase): string {
  return `<span class="okr-verdict-pill" title="Audit verdict applied on merge">${escapeHtml(PASS_LABEL[phase])}</span>`;
}

/**
 * Compact, always-on control row for a collapsed phase card: PR link + Knight's
 * Seal pill on the first line, then icon+word buttons (Artifact · Tag · Verify ·
 * Export). Same `data-action` contract as the expanded chain block, just tighter
 * — the verbose "Audit passed — <label> applied" box + the chain_root line are
 * dropped (the verdict pill + seal pill + View Tag already carry that). Wired
 * the same way as renderPhaseSignals' control block so existing handlers fire.
 */
function renderCollapsedControls(phase: OkrPhase, action: OkrAction, s: OkrPhaseSignal | undefined, okrId: string): string {
  const meta: string[] = [];
  if (s?.prUrl && s?.prNumber != null) {
    const state = s.prState ?? 'open';
    const stateLabel = state === 'merged' ? '🟣 merged' : state === 'closed' ? '🔴 closed' : '🟢 open';
    meta.push(`<a class="okr-link-button" href="${escapeAttr(s.prUrl)}" target="_blank" rel="noopener">#${s.prNumber} ${stateLabel} ↗</a>`);
  }
  if (s?.sealTampered) {
    meta.push(`<span class="okr-seal-badge okr-seal-tampered" title="Partial signatures — chain tampered. PR audit comment has details.">⛔ Tampered</span>`);
  } else if (s?.sealed === true) {
    meta.push(`<span class="okr-seal-badge okr-seal-ok" title="Every audit event signed with the run's ephemeral Ed25519 key. CI workflow verifies on PR audit.">🛡 Sealed</span>`);
  }
  const aid = escapeAttr(action.id);
  const rid = escapeAttr(action.runId);
  const buttons = [
    `<button class="okr-link-button okr-collapsed-ctl" data-action="toggle-artifact" data-okr-id="${escapeAttr(okrId)}" data-phase="${escapeAttr(phase)}" title="View the produced artifact markdown inline">📄 Artifact</button>`,
    `<button class="okr-link-button okr-collapsed-ctl" data-action="view-hatter-tag" data-action-id="${aid}" data-run-id="${rid}" title="View the Hatter Tag for this run">🏷 Tag</button>`,
    `<button class="okr-link-button okr-collapsed-ctl" data-action="verify-chain" data-action-id="${aid}" data-run-id="${rid}" title="Re-verify the per-epoch Ed25519 audit chain via the runner">🔗 Verify</button>`,
    `<button class="okr-link-button okr-collapsed-ctl" data-action="export-audit" data-action-id="${aid}" data-run-id="${rid}" title="Export the audit report markdown">⬇ Export</button>`,
  ];
  return `
    <div class="okr-action-signals okr-action-controls okr-collapsed-controls">
      ${meta.length ? `<div class="okr-collapsed-ctl-meta">${meta.join(' ')}</div>` : ''}
      <div class="okr-collapsed-ctl-btns">${buttons.join('')}</div>
    </div>`;
}

function renderStartButton(
  phase: OkrPhase,
  substate: { tone: string; label: string },
  okr: OkrCard,
  primaryTier: 'autonomous' | 'supervised' | 'restricted',
): string {
  const label = phase === 'why' ? 'Start Why' : phase === 'how' ? 'Start How' : 'Start What';

  // Phase B-PR3+4 wire Why + How. Phase C-PR4 wires What (depends on
  // design-bus.yml for the per-repo fan-out after the code-design merges).
  if (okr.meta.paused) {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="OKR is paused — unpause from the detail view" data-phase="${escapeAttr(phase)}">${escapeHtml(label)} <span class="okr-button-locked-icon">⏸</span></button>`;
  }
  if (substate.tone === 'progress') {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="Run already in flight" data-phase="${escapeAttr(phase)}">${escapeHtml(label)} <span class="okr-button-locked-icon">⏳</span></button>`;
  }
  if (substate.tone === 'done') {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="${escapeHtml(phase[0].toUpperCase() + phase.slice(1))} phase complete — re-run via the HumanGate panel" data-phase="${escapeAttr(phase)}">${escapeHtml(label)} <span class="okr-button-locked-icon">✓</span></button>`;
  }
  if (phase === 'how' && !okr.actions.some(a => a.phase === 'why' && a.status === 'complete')) {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="Gated on Why merged — start Why first" data-phase="how">${escapeHtml(label)} <span class="okr-button-locked-icon">🔒</span></button>`;
  }
  if (phase === 'what' && !okr.actions.some(a => a.phase === 'how' && a.status === 'complete')) {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="Gated on How merged — start How first" data-phase="what">${escapeHtml(label)} <span class="okr-button-locked-icon">🔒</span></button>`;
  }
  // Restricted tier: Why + How allowed (audit chain is the point);
  // What is BLOCKED until the BAR's governance score upgrades the tier
  // (§6.2 — Restricted = 0 auto-rounds, mandatory escalation).
  if (phase === 'what' && primaryTier === 'restricted') {
    return `<button class="okr-button-primary okr-button-disabled" disabled title="Restricted tier — escalate the BAR governance score before starting What (§6.2)" data-phase="what">${escapeHtml(label)} <span class="okr-button-locked-icon">⛔</span></button>`;
  }
  // A12.v1.1 — WHAT phase requires every target_code_repos[] entry to have
  // an explicit intent (Connected / Create). Disable + tooltip if any
  // entry is still in the default 'not-connected' state or has been
  // probed as 'unreachable'. Matches the panel-side precondition in
  // LookingGlassPanel.onStartOkrPhase so the foot-gun is closed both
  // at click time and at dispatch time.
  if (phase === 'what') {
    const repos = okr.objectiveAlignment.targetCodeRepos ?? [];
    const statusMap = okr.objectiveAlignment.targetCodeRepoStatus ?? {};
    if (repos.length === 0) {
      return `<button class="okr-button-primary okr-button-disabled" disabled title="No target code repos declared — add one to the OKR before starting What" data-phase="what">${escapeHtml(label)} <span class="okr-button-locked-icon">🔒</span></button>`;
    }
    const offending = repos.filter(r => {
      const s = statusMap[r] ?? 'not-connected';
      return s !== 'connected' && s !== 'create';
    });
    if (offending.length > 0) {
      const titleMsg = `Every target repo must be set to Connected or Create. ${offending.length} repo${offending.length === 1 ? '' : 's'} still need${offending.length === 1 ? 's' : ''} a status — see the Target Code Repos section below.`;
      return `<button class="okr-button-primary okr-button-disabled" disabled title="${escapeAttr(titleMsg)}" data-phase="what">${escapeHtml(label)} <span class="okr-button-locked-icon">🔒</span></button>`;
    }
  }

  const action = phase === 'why' ? 'start-okr-why' : phase === 'how' ? 'start-okr-how' : 'start-okr-what';
  return `
    <button class="okr-button-primary" data-action="${action}" data-okr-id="${escapeAttr(okr.meta.id)}" data-phase="${escapeAttr(phase)}">
      ${escapeHtml(label)}
    </button>
  `;
}

/* ───────────────── D-PR4 sub-PR 4: Fan-out pre-flight pane ───────────────── */

/**
 * Per-decision status label + tone class for the pre-flight pane.
 * Tone drives the CSS color (green = ready, yellow = needs action,
 * red = blocked, blue = in-flight, gray = done).
 */
const FANOUT_STATUS_PRESENT: Record<FanOutPreflightStatusUi, { label: string; tone: string; icon: string }> = {
  'ready':                { label: 'Ready',                 tone: 'ready',   icon: '✓' },
  'opened':               { label: 'Landing issue opened',  tone: 'flight',  icon: '📬' },
  'pending-on-upstream':  { label: 'Waiting on upstream',   tone: 'wait',    icon: '⏳' },
  'pending-on-cap':       { label: 'Queued (cap)',          tone: 'wait',    icon: '🚦' },
  'pending-scaffold':     { label: 'Awaiting scaffold',     tone: 'wait',    icon: '🏗' },
  'harness-missing':      { label: 'Harness missing',       tone: 'block',   icon: '⚠' },
  'permission-blocked':   { label: 'Permission blocked',    tone: 'block',   icon: '🔒' },
  'repo-not-found':       { label: 'Repo not found',        tone: 'block',   icon: '❓' },
  'repo-exists-conflict': { label: 'Repo conflict',         tone: 'block',   icon: '⚠' },
  'pr-opened':            { label: 'Impl PR open',          tone: 'flight',  icon: '🔀' },
  'pr-merged':            { label: 'Merged',                tone: 'done',    icon: '✓' },
  'pr-rejected':          { label: 'PR rejected',           tone: 'block',   icon: '✗' },
};

/**
 * Setup-error code → friendly inline message. Matches the discriminated
 * `setupError` strings the extension's onFanOutPreflight handler emits.
 * Unknown codes fall through to a generic "couldn't load" message with
 * the raw code attached for debug.
 */
function fanOutSetupErrorMessage(code: string): { title: string; body: string } {
  if (code === 'no-mesh') {
    return { title: 'Mesh not initialized', body: 'Initialize the governance mesh from Settings before running fan-out pre-flight.' };
  }
  if (code === 'no-mesh-repo') {
    return { title: 'Mesh repo not detected', body: 'Couldn\'t resolve the mesh\'s GitHub repository. Check Settings → Mesh.' };
  }
  if (code === 'okr-not-found') {
    return { title: 'OKR not found', body: 'This OKR isn\'t present in the local mesh. Try pulling.' };
  }
  if (code === 'what-not-complete') {
    return { title: 'WHAT phase not complete', body: 'Pre-flight runs after the code-design artifact merges. Finish the WHAT phase first.' };
  }
  if (code === 'no-target-repos') {
    return { title: 'No target code repos', body: 'Add target repos to this OKR (and set each to Connected or Create) so fan-out has somewhere to land.' };
  }
  if (code.startsWith('artifact-missing')) {
    return { title: 'Code-design artifact missing', body: code };
  }
  if (code.startsWith('artifact-fetch-error')) {
    return { title: 'Couldn\'t fetch artifact', body: code };
  }
  if (code.startsWith('engine-crashed')) {
    return { title: 'Pre-flight engine error', body: code };
  }
  return { title: 'Pre-flight failed', body: code };
}

/**
 * The 9 named verify reasons from the workflow-side coordination
 * verifier. Each has a friendly explanation; the raw verdict string is
 * shown verbatim too so the user can match it to the workflow's audit
 * comment.
 */
function verifyReasonExplanation(verifyReason: string): string {
  const head = verifyReason.split(':')[0];
  switch (head) {
    case 'coordination-section-missing': return 'WHAT artifact is missing the §10 H3 coordination block.';
    case 'coordination-yaml-malformed':  return 'The coordination YAML didn\'t parse — check the §10 H3 block.';
    case 'coordination-missing-repo':    return 'A target repo declared on the OKR isn\'t in the coordination block.';
    case 'coordination-unknown-dep':     return 'A depends_on entry references a repo that isn\'t in the coordination block.';
    case 'coordination-cycle':           return 'depends_on graph has a cycle — every dependency chain must terminate.';
    case 'coordination-wave-mismatch':   return 'A row\'s fanout_wave is inconsistent with its depends_on (every dep must be in an earlier wave).';
    case 'coordination-consumes-not-in-depends': return 'A consumed contract\'s `from:` repo isn\'t listed in depends_on for the consumer.';
    case 'coordination-wave-nonminimal': return 'A row\'s fanout_wave is higher than the minimum required (must be exactly 1 + max(dep.wave)).';
    case 'coordination-contract-mismatch': return 'A provider\'s consumed_by[] doesn\'t reciprocate the consumer\'s consumes[] for the same contract.';
    default: return 'Coordination block failed verification.';
  }
}

/**
 * The pre-flight pane — visible in view mode AFTER the WHAT phase
 * completes. Three render states:
 *
 *   - WHAT not complete yet → pane is hidden entirely (no setup-error
 *     placeholder — the WHAT action card itself already signals the
 *     phase isn't done, so a second "waiting on WHAT" panel would be
 *     redundant).
 *   - Loading → shows a spinner + "Running pre-flight..." message.
 *   - SetupError → renders the friendly setup-error message and skips
 *     the per-row table.
 *   - Report success → renders the per-row table + skippedRepos chips
 *     + "Fan out N of M ready" button.
 *   - Report failure (verify-failed etc.) → renders the verify-reason
 *     explanation with the raw verdict for cross-reference.
 */
function renderFanOutPreflightPane(
  okr: OkrCard,
  fanOutState: FanOutPreflightUiState | undefined,
  availableBars: OkrAvailableBar[] = [],
): string {
  const whatComplete = okr.actions.some(a => a.phase === 'what' && a.status === 'complete');
  if (!whatComplete) {
    return '';
  }

  const heading = `
    <h2 class="okr-section-heading">Fan-out Pre-flight</h2>
    <p class="okr-section-help">After the WHAT phase merges, pre-flight checks each target repo for harness, permissions, repo state, and dependency wave. Rows that need setup route through the owning BAR and Cheshire; ready rows can fan out into landing issues.</p>
  `;

  if (!fanOutState || fanOutState.loading) {
    return `
      ${heading}
      <div class="okr-fanout-pane okr-fanout-loading">
        <span class="okr-fanout-spinner">⏳</span>
        <span>Running pre-flight…</span>
      </div>
    `;
  }

  if (fanOutState.setupError) {
    const msg = fanOutSetupErrorMessage(fanOutState.setupError);
    return `
      ${heading}
      <div class="okr-fanout-pane okr-fanout-setup-error">
        <div class="okr-fanout-setup-title">${escapeHtml(msg.title)}</div>
        <div class="okr-fanout-setup-body">${escapeHtml(msg.body)}</div>
      </div>
    `;
  }

  const report = fanOutState.report;
  if (!report) {
    return `
      ${heading}
      <div class="okr-fanout-pane okr-fanout-setup-error">
        <div class="okr-fanout-setup-title">Pre-flight returned no data</div>
        <div class="okr-fanout-setup-body">The extension did not produce a report. Click Refresh to retry.</div>
      </div>
    `;
  }

  if (report.ok === false) {
    const verifyDetail = report.reason === 'coordination-verify-failed'
      ? report.verifyReason
      : report.detail;
    const explanation = report.reason === 'coordination-verify-failed'
      ? verifyReasonExplanation(report.verifyReason)
      : (report.reason === 'coordination-section-missing'
          ? 'WHAT artifact is missing the §10 H3 coordination block.'
          : 'The coordination YAML didn\'t parse.');
    return `
      ${heading}
      <div class="okr-fanout-pane okr-fanout-verify-failed">
        <div class="okr-fanout-setup-title">Coordination block ${escapeHtml(report.reason)}</div>
        <div class="okr-fanout-setup-body">${escapeHtml(explanation)}</div>
        <div class="okr-fanout-verify-raw"><code>${escapeHtml(verifyDetail)}</code></div>
        <div class="okr-fanout-verify-hint">Fix the §10 H3 block in <code>okrs/${escapeHtml(okr.meta.id)}/what/code-design.md</code> and re-run the WHAT phase audit, or revise the WHAT artifact and merge a fix.</div>
      </div>
    `;
  }

  // Happy path: report.ok === true
  const entriesHtml = report.entries.length === 0
    ? `<div class="okr-fanout-empty">No target repos to evaluate.</div>`
    : report.entries.map(entry => renderFanOutEntryRow(entry, okr, availableBars)).join('\n');

  const skipped = fanOutState.skippedRepos ?? [];
  const skippedHtml = skipped.length === 0 ? '' : `
    <div class="okr-fanout-skipped">
      <div class="okr-fanout-skipped-title">⚠ ${skipped.length} target repo${skipped.length === 1 ? '' : 's'} skipped</div>
      <ul class="okr-fanout-skipped-list">
        ${skipped.map(s => `<li><code>${escapeHtml(s.slug)}</code> <span class="okr-fanout-skipped-status">(${escapeHtml(s.status)})</span></li>`).join('')}
      </ul>
      <div class="okr-fanout-skipped-hint">Set status to <strong>Connected</strong> (brownfield) or <strong>Create</strong> (greenfield) in the Target Code Repos section above so pre-flight can include these.</div>
    </div>
  `;

  const totalCount = report.entries.length;
  const readyCount = report.readyRepos.length;
  // D-PR4 sub-PR 6 — fan-out execution wired. Button enabled when
  // ≥1 row is `ready`. Click dispatches `fanOut` → opens landing
  // issues + dispatches impl-agent via assignCustomCopilotAgent +
  // writes design-fan-out.yaml.
  const buttonEnabled = readyCount > 0;
  const buttonLabel = readyCount === 0
    ? 'Fan out — no rows ready'
    : `🚀 Fan out ${readyCount} of ${totalCount} ready`;
  const buttonTitle = buttonEnabled
    ? `Open landing issues for the ${readyCount} ready row${readyCount === 1 ? '' : 's'}. Writes design-fan-out.yaml + commits to main.`
    : 'No rows are ready. Resolve harness/permission/upstream blockers above, then click Re-check.';
  const buttonClass = buttonEnabled ? 'okr-button-primary' : 'okr-button-primary okr-button-disabled';

  const wavesHtml = report.waves.length > 1 ? `
    <div class="okr-fanout-waves">
      <strong>Topological order:</strong>
      ${report.waves.map((wave, idx) => `<span class="okr-fanout-wave">Wave ${idx + 1}: ${wave.map(s => `<code>${escapeHtml(s)}</code>`).join(', ')}</span>`).join(' → ')}
    </div>
  ` : '';

  // Reset fan-out is offered only once a fan-out has actually run —
  // i.e. at least one row is in a post-fan-out status (landing issue
  // opened, blocked on upstream, or PR in flight/terminal). For a
  // fresh pre-flight (all rows ready / pending-scaffold / harness-
  // missing) there's nothing to reset, so the button stays hidden.
  const POST_FANOUT_STATUSES: ReadonlySet<FanOutPreflightStatusUi> = new Set([
    'opened', 'pending-on-upstream', 'pr-opened', 'pr-merged', 'pr-rejected',
  ]);
  const hasFannedOut = report.entries.some(e => POST_FANOUT_STATUSES.has(e.decision.status));
  const resetBtnHtml = hasFannedOut ? `
        <button class="okr-button-secondary okr-button-danger" data-action="fanout-reset" data-okr-id="${escapeAttr(okr.meta.id)}" title="Delete this OKR's design-fan-out.yaml so the card returns to its pre-fan-out state. Then optionally close the landing issues + impl PRs this fan-out opened (you'll be asked, and shown the list first). Does not revert merged code.">
          ↺ Reset fan-out
        </button>` : '';

  const summaryDot = (readyCount === totalCount && totalCount > 0) ? 'okr-dot-ok' : readyCount > 0 ? 'okr-dot-warn' : 'okr-dot-pend';
  const summaryWaves = report.waves.length > 1 ? ` · ${report.waves.length} waves` : (totalCount > 0 ? ' · wave 1' : '');
  return `
    ${heading}
    <div class="okr-fanout-pane okr-fanout-ok">
      <div class="okr-fanout-summary"><span class="okr-dot ${summaryDot}"></span> ${readyCount} of ${totalCount} ready${summaryWaves}</div>
      <div class="okr-fanout-entries">
        ${entriesHtml}
      </div>
      ${wavesHtml}
      ${skippedHtml}
      <div class="okr-fanout-actions">
        <button class="${buttonClass}" ${buttonEnabled ? '' : 'disabled'} title="${escapeAttr(buttonTitle)}" data-action="fanout-execute" data-okr-id="${escapeAttr(okr.meta.id)}">
          ${escapeHtml(buttonLabel)}
        </button>
        <button class="okr-button-secondary" data-action="fanout-refresh" data-okr-id="${escapeAttr(okr.meta.id)}" title="Re-run pre-flight (re-fetches code-design.md + re-probes every target repo).">
          🔄 Re-check
        </button>
        ${resetBtnHtml}
      </div>
    </div>
  `;
}

/**
 * Pre-flight readiness as status lights, derived from the single resolved
 * `decision.status` + `governance` (no new data). A ready / post-fan-out row
 * lights all green; a blocked row reds exactly the failing check, so the
 * blocker is legible at a glance instead of buried in the status label.
 */
function renderFanOutChecks(entry: FanOutRepoEntryUi): string {
  const st = entry.decision.status;
  const gov = entry.governance;
  const isOneOf = (...s: FanOutPreflightStatusUi[]) => s.includes(st);
  const dots: PhaseDot[] = [
    { label: 'Repo', status: isOneOf('repo-not-found', 'repo-exists-conflict', 'pending-scaffold') ? 'fail' : 'ok', title: 'Target repo exists / scaffolded' },
    { label: 'Harness', status: isOneOf('harness-missing') ? 'fail' : 'ok', title: 'Agentic harness present (workflows + .redqueen policy)' },
    { label: 'Permissions', status: isOneOf('permission-blocked') ? 'fail' : 'ok', title: 'Token can open issues / PRs on the repo' },
    { label: 'Upstream', status: isOneOf('pending-on-upstream', 'pending-on-cap') ? 'warn' : 'ok', title: 'Dependency wave: upstream repos cleared' },
    { label: 'Tier', status: gov ? (gov.severity === 'block' || gov.planOnly ? 'warn' : 'ok') : 'ok', title: gov ? gov.reason : 'BAR governance tier allows full implementation' },
  ];
  return renderPhaseDots(dots);
}

function renderFanOutEntryRow(entry: FanOutRepoEntryUi, okr: OkrCard, availableBars: OkrAvailableBar[]): string {
  const presentation = FANOUT_STATUS_PRESENT[entry.decision.status];
  const reason = entry.decision.reason
    ? `<div class="okr-fanout-entry-reason">${escapeHtml(entry.decision.reason)}</div>`
    : '';
  const coordHint = entry.coordinationRow
    ? `<span class="okr-fanout-entry-meta">wave ${entry.coordinationRow.fanout_wave} · ${escapeHtml(entry.coordinationRow.coordination_role)}${entry.coordinationRow.depends_on.length > 0 ? ` · depends on ${entry.coordinationRow.depends_on.map(d => `<code>${escapeHtml(d)}</code>`).join(', ')}` : ''}</span>`
    : '';
  const greenfieldChip = entry.status === 'create'
    ? `<span class="okr-fanout-chip okr-fanout-chip-greenfield">greenfield</span>`
    : `<span class="okr-fanout-chip okr-fanout-chip-brownfield">brownfield</span>`;

  // Bug-AAC — governance-tier warning. A row can be `ready` (repo +
  // harness + perms + upstream all clear) yet the owning BAR's tier
  // will still constrain the impl agent at runtime. Surface it now so a
  // plan-only outcome isn't a surprise after dispatch.
  const gov = entry.governance;
  const govChip = gov
    ? `<span class="okr-fanout-chip okr-fanout-chip-gov-${gov.severity}" title="${escapeAttr(gov.reason)}">${gov.severity === 'block' ? '⚠' : 'ℹ'} ${escapeHtml(gov.tier)}${gov.planOnly ? ' · plan-only' : ''}</span>`
    : '';
  const govNote = gov
    ? `<div class="okr-fanout-entry-gov okr-fanout-entry-gov-${gov.severity}">${gov.severity === 'block' ? '⚠' : 'ℹ'} ${escapeHtml(gov.reason)}</div>`
    : '';

  const prepContext = findFanOutRepoBar(entry, okr, availableBars);
  const needsRepoPrep =
    (entry.decision.status === 'pending-scaffold' && entry.status === 'create') ||
    (entry.decision.status === 'harness-missing' && entry.status === 'connected');
  const linkHint = !prepContext && needsRepoPrep
    ? findFirstAffectedBar(okr, availableBars)
    : null;
  const affordance = needsRepoPrep
    ? renderFanOutPrepAffordance(entry, okr, prepContext, linkHint)
    : '';

  // Mark-PR-ready affordance — surfaced only while the impl PR is in
  // flight (`pr-opened`) and we know its URL. Mirrors the WHY/HOW/WHAT
  // "Mark PR ready" button: flips the Copilot agent's draft impl PR (on
  // the target code repo) to ready-for-review, which re-fires the
  // Implementation Provenance gate.
  // ⏳ Held-workflow affordance — when GitHub is holding this Copilot-bot PR's
  // workflow runs at action_required, the gate can't run and the PR looks
  // "stuck" with no checks. Surface the count + a deep-link to the PR's Checks
  // tab (where the "Approve and run" button lives) so the hold is actionable.
  const awaitingCount = entry.workflowsAwaitingApproval ?? 0;
  const awaitingApproval = (awaitingCount > 0 && entry.implPrUrl)
    ? `<a class="okr-link-button" href="${escapeAttr(entry.implPrUrl)}/checks" target="_blank" rel="noopener" title="GitHub is holding ${awaitingCount} workflow run(s) on this Copilot-bot PR at 'action_required'. The Implementation Provenance gate can't run until you click 'Approve and run' in the PR's Checks tab.">⏳ ${awaitingCount} workflow${awaitingCount === 1 ? '' : 's'} awaiting approval — Approve in Checks ↗</a>`
    : '';

  // Mark-PR-ready affordance — surfaced only while the impl PR is in
  // flight (`pr-opened`) and we know its URL. Mirrors the WHY/HOW/WHAT
  // "Mark PR ready" button: flips the Copilot agent's draft impl PR (on
  // the target code repo) to ready-for-review, which re-fires the
  // Implementation Provenance gate.
  const prReadyActions = (entry.decision.status === 'pr-opened' && entry.implPrUrl)
    ? `
      <div class="okr-fanout-entry-actions">
        <a class="okr-link-button" href="${escapeAttr(entry.implPrUrl)}" target="_blank" rel="noopener">#${entry.implPrNumber ?? ''} Impl PR ↗</a>
        ${entry.implPrNumber != null && entry.implPrIsDraft !== false ? `<button class="okr-button-small okr-button-primary" data-action="fanout-mark-pr-ready" data-okr-id="${escapeAttr(okr.meta.id)}" data-repo-slug="${escapeAttr(entry.slug)}" data-pr-number="${entry.implPrNumber}" title="Flip the Copilot agent's draft impl PR to ready-for-review so the Implementation Provenance gate fires. (If GitHub is also holding the run for approval, you'll still click Approve on the PR.)">✅ Mark PR ready</button>` : ''}
        ${awaitingApproval}
      </div>`
    : '';

  const readyRing = entry.decision.status === 'ready' ? ' okr-fanout-entry-ready' : '';
  return `
    <div class="okr-fanout-entry okr-fanout-tone-${presentation.tone}${readyRing}">
      <div class="okr-fanout-entry-head">
        <span class="okr-fanout-entry-slug"><code>${escapeHtml(entry.slug)}</code></span>
        ${greenfieldChip}
        ${govChip}
        <span class="okr-fanout-entry-status">${presentation.icon} ${escapeHtml(presentation.label)}</span>
      </div>
      ${renderFanOutChecks(entry)}
      ${coordHint}
      ${reason}
      ${govNote}
      ${affordance}
      ${prReadyActions}
    </div>
  `;
}

function renderFanOutPrepAffordance(
  entry: FanOutRepoEntryUi,
  okr: OkrCard,
  prepContext: { barPath: string; repoUrl: string } | null,
  linkHint: OkrAvailableBar | null,
): string {
  if (prepContext) {
    const label = entry.status === 'create' ? '🏗 Prepare in BAR' : '🐇 Open BAR repo';
    const title = entry.status === 'create'
      ? 'Open Cheshire with this repo selected from its owning BAR. Create/scaffold happens there; return here and Re-check when it finishes.'
      : 'Open or clone this repo in BAR context, then run Cheshire scaffold to add the missing harness.';
    return `
      <div class="okr-fanout-entry-actions">
        <button class="okr-button-small okr-button-primary"
          data-action="fanout-prepare-repo"
          data-okr-id="${escapeAttr(okr.meta.id)}"
          data-repo-slug="${escapeAttr(entry.slug)}"
          data-repo-url="${escapeAttr(prepContext.repoUrl)}"
          data-bar-path="${escapeAttr(prepContext.barPath)}"
          title="${escapeAttr(title)}">
          ${escapeHtml(label)}
        </button>
      </div>
    `;
  }

  if (linkHint?.path) {
    return `
      <div class="okr-fanout-entry-actions">
        <button class="okr-button-small okr-button-secondary" data-action="open-bar" data-bar-path="${escapeAttr(linkHint.path)}" title="Open the affected BAR and link this repo in app.yaml before preparing it.">
          Open affected BAR
        </button>
        <span class="okr-fanout-entry-reason">Link this repo to an affected BAR first.</span>
      </div>
    `;
  }

  return `
    <div class="okr-fanout-entry-actions">
      <span class="okr-fanout-entry-reason">Link this repo to an affected BAR first.</span>
    </div>
  `;
}

/** True only when `u` is a real github.com URL — a substring check like
 *  `u.includes('github.com')` is bypassable by `github.com.evil.com` or
 *  `evil.com/github.com` (CodeQL js/incomplete-url-substring-sanitization). */
function isGithubRepoUrl(u: string): boolean {
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host === 'github.com' || host.endsWith('.github.com');
  } catch { return false; }
}

function findFanOutRepoBar(
  entry: FanOutRepoEntryUi,
  okr: OkrCard,
  availableBars: OkrAvailableBar[],
): { barPath: string; repoUrl: string } | null {
  const affectedBarIds = new Set(okr.objectiveAlignment.affectedBarIds);
  const targetRepoUrl = okr.objectiveAlignment.targetCodeRepos
    .find(url => normalizeRepoSlugForFanOut(url) === entry.slug) ?? '';

  for (const bar of availableBars) {
    if (!affectedBarIds.has(bar.id) || !bar.path) {
      continue;
    }
    const linkedRepo = bar.repos.find(url => normalizeRepoSlugForFanOut(url) === entry.slug);
    if (linkedRepo) {
      return {
        barPath: bar.path,
        repoUrl: isGithubRepoUrl(targetRepoUrl) ? targetRepoUrl : linkedRepo || targetRepoUrl,
      };
    }
  }
  return null;
}

function findFirstAffectedBar(okr: OkrCard, availableBars: OkrAvailableBar[]): OkrAvailableBar | null {
  const affectedBarIds = new Set(okr.objectiveAlignment.affectedBarIds);
  return availableBars.find(bar => affectedBarIds.has(bar.id) && !!bar.path) ?? null;
}

function normalizeRepoSlugForFanOut(urlOrSlug: string): string {
  const match = urlOrSlug.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  return urlOrSlug
    .replace(/\.git$/, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .trim();
}

function renderFooter(okr: OkrCard, mode: OkrDetailMode): string {
  if (mode === 'view') {
    // Phase E E4 (2026-05-25) — closes the long-standing UX bug where
    // this footer's `Export Audit Report` button was disabled with
    // title="Phase E feature" ever since Phase E shipped the per-action
    // export. The wired button now dispatches `exportOkrRollup` which
    // generates a whole-OKR rollup combining all 3 phases (WHY + HOW +
    // WHAT) into one auditor-grade markdown at
    // okrs/<id>/audit/exports/<okrId>-rollup.md.
    //
    // The footer-level `Verify Chain` placeholder is removed entirely —
    // per-action Verify Chain ↗ buttons inside each phase card already
    // cover the shipped flow; an OKR-level verify-all is a separate
    // future feature.
    return `
      <div class="okr-detail-footer">
        <button class="okr-button-primary" data-action="export-okr-rollup" data-okr-id="${escapeAttr(okr.meta.id)}" title="Generate a whole-OKR audit rollup combining WHY + HOW + WHAT into one auditor-grade markdown document">
          📦 Export Full OKR Audit Rollup
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
    .okr-repo-not-connected { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }
    .okr-repo-connected { background: rgba(74, 222, 128, 0.14); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); }
    .okr-repo-create { background: rgba(168, 85, 247, 0.14); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .okr-repo-unreachable { background: rgba(248, 113, 113, 0.14); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
    .okr-repo-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .okr-repo-actions { display: flex; gap: 0.375rem; margin-left: auto; align-items: center; }
    .okr-repo-status-picker { font-size: 0.75rem; padding: 0.125rem 0.375rem; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 0.25rem; }
    .okr-section-note { font-size: 0.75rem; opacity: 0.7; }
    .okr-action-card { padding: 1rem 1.25rem; border: 1px solid var(--vscode-panel-border); border-radius: 0.5rem; margin-bottom: 0.75rem; background: var(--vscode-editor-background); }
    .okr-action-card-idle { border-color: rgba(148, 163, 184, 0.3); }
    .okr-action-card-progress { border-color: rgba(252, 211, 77, 0.4); }
    .okr-action-card-block { border-color: rgba(248, 113, 113, 0.4); }
    .okr-action-card-done { border-color: rgba(74, 222, 128, 0.4); }
    /* WHY → HOW → WHAT pipeline: a vertical stack by default, a 3-up row when
       the editor panel is wide. Equal-height columns with footers bottom-aligned;
       the in-flight / blocked phase gets a 2px ring so the eye lands on it. */
    .okr-actions-row { display: flex; flex-direction: column; gap: 0.75rem; }
    .okr-actions-row .okr-action-card { margin-bottom: 0; display: flex; flex-direction: column; box-sizing: border-box; }
    .okr-action-card-progress, .okr-action-card-block { border-width: 2px; }
    .okr-actions-connector { display: none; }
    @media (min-width: 760px) {
      /* Top-align so a collapsed (done) card stays compact while the live phase
         is free to be taller — the spotlight. Collapsed cards get an equal
         min-height + controls pinned to a shared baseline so the done phases
         line up tidily next to each other. */
      .okr-actions-row { flex-direction: row; align-items: flex-start; }
      .okr-actions-row .okr-action-card { flex: 1 1 0; min-width: 0; }
      .okr-actions-row .okr-action-footer { margin-top: auto; }
      .okr-actions-row .okr-action-collapsed { min-height: 9.5rem; }
      .okr-actions-connector { display: flex; align-items: center; flex: 0 0 auto; color: var(--vscode-descriptionForeground); font-size: 1.1rem; }
    }
    /* Collapsed (done + sealed) phase card — compact summary with status lights
       up top and the always-on controls (Verify / Export / Tag / seal) pinned
       to the bottom baseline. */
    .okr-action-collapsed { display: flex; flex-direction: column; }
    .okr-action-collapsed .okr-action-controls { margin-top: auto; }
    .okr-action-phase-group { display: inline-flex; align-items: center; gap: 0.4rem; min-width: 0; }
    .okr-collapsed-body { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.8125rem; color: var(--vscode-descriptionForeground); }
    .okr-collapsed-body strong { color: var(--vscode-foreground); font-weight: 600; }
    .okr-verdict-pill { font-size: 0.7rem; padding: 0.0625rem 0.4375rem; border-radius: 0.625rem; font-weight: 600; background: rgba(74, 222, 128, 0.14); border: 1px solid rgba(74, 222, 128, 0.35); color: #4ade80; white-space: nowrap; }
    .okr-phase-dots { display: flex; flex-wrap: wrap; gap: 0.25rem 0.75rem; margin: 0.4rem 0 0.15rem; }
    /* Reserve two dot-lines on collapsed cards so WHY (4 signals, one line) lines
       up with HOW/WHAT (5 signals incl. Self-review, two lines) — equal card
       heights without inventing a self-review signal WHY doesn't have. */
    .okr-action-collapsed .okr-phase-dots { min-height: 2.35rem; align-content: flex-start; }
    .okr-phase-dot { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: var(--vscode-descriptionForeground); }
    .okr-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; flex: 0 0 auto; display: inline-block; }
    .okr-dot-ok { background: var(--vscode-testing-iconPassed, #4ade80); }
    .okr-dot-warn { background: var(--vscode-editorWarning-foreground, #fcd34d); }
    .okr-dot-fail { background: var(--vscode-editorError-foreground, #f87171); }
    .okr-dot-pend { background: var(--vscode-descriptionForeground); opacity: 0.4; }
    .okr-phase-details { margin: 0.1rem 0; }
    .okr-phase-details > summary { cursor: pointer; font-size: 0.75rem; color: var(--vscode-textLink-foreground); list-style: none; padding: 0.15rem 0; }
    .okr-phase-details > summary::-webkit-details-marker { display: none; }
    .okr-phase-details > summary::before { content: '▸ '; }
    .okr-phase-details[open] > summary::before { content: '▾ '; }
    .okr-details-inner { margin-top: 0.25rem; }
    .okr-action-controls { margin-bottom: 0; }
    .okr-phase-check { color: var(--vscode-testing-iconPassed, #4ade80); font-weight: 700; font-size: 0.95rem; }
    .okr-action-card-header-right { display: inline-flex; align-items: center; gap: 0.5rem; flex: 0 0 auto; }
    .okr-collapsed-controls { gap: 0.4rem; padding: 0.5rem 0.625rem; }
    .okr-collapsed-ctl-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.78rem; }
    .okr-collapsed-ctl-btns { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .okr-collapsed-ctl { font-size: 0.72rem; padding: 0.125rem 0.4375rem; }
    /* Collapsed header: a thin meta row (verdict pill left · poll + refresh
       right) above a full-width title row, so the phase name never squishes. */
    .okr-collapsed-header { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.5rem; }
    .okr-collapsed-metarow { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .okr-collapsed-titlerow { display: flex; align-items: center; gap: 0.4rem; }
    /* Fan-out pre-flight: at-a-glance readiness summary + a spotlight ring on
       rows that are ready to fan out (mirrors the active-phase card). */
    .okr-fanout-summary { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8125rem; color: var(--vscode-descriptionForeground); background: rgba(148, 163, 184, 0.08); padding: 0.2rem 0.625rem; border-radius: 0.375rem; margin-bottom: 0.5rem; }
    .okr-fanout-entry-ready { border: 2px solid var(--vscode-focusBorder, #388add); }
    .okr-phase-gate { margin-top: 0.75rem; }
    .okr-phase-gate-label { font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--vscode-foreground); }
    .okr-action-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .okr-action-phase { font-weight: 700; font-size: 0.95rem; }
    .okr-action-substate { font-size: 0.875rem; font-weight: 500; }
    .okr-action-rationale { margin: 0 0 0.5rem; color: var(--vscode-descriptionForeground); font-size: 0.875rem; }
    .okr-action-signals { font-size: 0.8125rem; color: var(--vscode-descriptionForeground); line-height: 1.6; padding: 0.5rem 0.75rem; background: rgba(148, 163, 184, 0.05); border-radius: 0.375rem; margin: 0.5rem 0; display: flex; flex-direction: column; gap: 0.25rem; }
    .okr-action-signals strong { color: var(--vscode-foreground); font-weight: 600; }
    .okr-action-signals code { font-size: 0.75rem; }
    .okr-signal-error { color: #f87171; font-weight: 500; }
    .okr-signal-meta { font-size: 0.75rem; opacity: 0.75; padding-top: 0.25rem; border-top: 1px dashed rgba(148, 163, 184, 0.2); margin-top: 0.25rem; }
    .okr-signal-chain { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding-top: 0.25rem; }
    .okr-signal-chain-btn { font-size: 0.75rem; padding: 0.125rem 0.5rem; }
    .okr-seal-badge { font-size: 0.7rem; padding: 0.0625rem 0.4375rem; border-radius: 0.625rem; font-weight: 600; letter-spacing: 0.01em; white-space: nowrap; }
    .okr-seal-ok { background: rgba(74, 222, 128, 0.14); border: 1px solid rgba(74, 222, 128, 0.35); color: #4ade80; }
    .okr-seal-tampered { background: rgba(248, 113, 113, 0.14); border: 1px solid rgba(248, 113, 113, 0.4); color: #f87171; }
    .okr-signal-audit-action { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding-top: 0.5rem; margin-top: 0.25rem; border-top: 1px dashed rgba(148, 163, 184, 0.2); }
    .okr-signal-audit-hint { font-size: 0.75rem; }
    .okr-signal-audit-status { font-size: 0.8125rem; padding: 0.375rem 0.5rem; background: rgba(74, 222, 128, 0.08); border: 1px solid rgba(74, 222, 128, 0.25); border-radius: 0.25rem; margin-top: 0.25rem; color: var(--vscode-foreground); }
    .okr-signal-audit-failed { font-size: 0.8125rem; padding: 0.5rem 0.625rem; background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 0.25rem; margin-top: 0.25rem; color: var(--vscode-foreground); display: flex; flex-direction: column; gap: 0.375rem; }
    .okr-signal-audit-failed-header { font-weight: 600; }
    .okr-signal-audit-reasons { margin: 0; padding-left: 1.25rem; font-size: 0.75rem; color: var(--vscode-descriptionForeground); }
    .okr-signal-audit-reasons li { margin: 0.125rem 0; }
    .okr-signal-audit-actions { display: flex; gap: 0.375rem; align-items: center; flex-wrap: wrap; margin-top: 0.25rem; }
    .okr-signal-pr-pending { font-size: 0.8125rem; padding: 0.375rem 0.5rem; background: rgba(252, 211, 77, 0.08); border: 1px solid rgba(252, 211, 77, 0.25); border-radius: 0.25rem; margin-top: 0.25rem; color: var(--vscode-foreground); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .okr-signal-revise-pending { font-size: 0.8125rem; padding: 0.375rem 0.5rem; background: rgba(167, 139, 250, 0.08); border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 0.25rem; margin-top: 0.25rem; color: var(--vscode-foreground); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .okr-signal-review-requested { font-size: 0.8125rem; padding: 0.375rem 0.5rem; background: rgba(125, 211, 252, 0.08); border: 1px solid rgba(125, 211, 252, 0.25); border-radius: 0.25rem; margin-top: 0.25rem; color: var(--vscode-foreground); }
    .okr-signal-card-refresh { background: transparent; border: 1px solid transparent; color: var(--vscode-descriptionForeground); cursor: pointer; padding: 0 0.375rem; font-size: 0.875rem; border-radius: 0.25rem; margin-left: 0.375rem; opacity: 0.7; }
    .okr-signal-card-refresh:hover { opacity: 1; background: var(--vscode-list-hoverBackground); border-color: var(--vscode-panel-border); }
    /* Task #54 — polling indicator. Sits between substate badge + refresh
       button in the action-card header. Color codes fetch state without
       triggering the metric-line state-flash that the old loading-only
       branch caused. */
    .okr-poll-dot { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; margin-left: 0.375rem; vertical-align: middle; flex-shrink: 0; font-size: 0.625rem; line-height: 0.5rem; text-align: center; }
    .okr-poll-dot-idle { background: var(--vscode-descriptionForeground); opacity: 0.35; }
    .okr-poll-dot-fresh { background: #22c55e; box-shadow: 0 0 4px rgba(34, 197, 94, 0.55); }
    .okr-poll-dot-error { background: transparent; color: #ef4444; opacity: 1; width: auto; height: auto; box-shadow: none; }
    .okr-poll-dot-pulse { background: #38bdf8; animation: okr-poll-pulse 1.2s ease-in-out infinite; }
    @keyframes okr-poll-pulse {
      0%, 100% { opacity: 0.35; box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
      50%      { opacity: 1;    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.25); }
    }
    .okr-md-ready-btn { font-size: 0.75rem; padding: 0.25rem 0.625rem; margin-left: auto; }
    .okr-signal-pr-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .okr-md-toggle-btn { font-size: 0.75rem; padding: 0.125rem 0.5rem; }
    .okr-md-merge-btn { font-size: 0.75rem; padding: 0.25rem 0.625rem; margin-left: 0.25rem; }
    .okr-md-panel { margin-top: 0.5rem; border: 1px solid var(--vscode-panel-border); border-radius: 0.375rem; background: var(--vscode-editor-background); overflow: hidden; }
    .okr-md-panel-header { padding: 0.375rem 0.625rem; background: rgba(148, 163, 184, 0.08); border-bottom: 1px solid var(--vscode-panel-border); font-size: 0.75rem; }
    .okr-md-panel-header code { font-family: var(--vscode-editor-font-family, monospace); }
    .okr-md-panel-body { padding: 0.75rem 1rem; max-height: 50vh; overflow: auto; font-size: 0.8125rem; line-height: 1.5; color: var(--vscode-foreground); }
    .okr-md-panel-body .okr-md-h1, .okr-md-panel-body .okr-md-h2, .okr-md-panel-body .okr-md-h3, .okr-md-panel-body .okr-md-h4 { margin: 0.75rem 0 0.375rem; font-weight: 700; color: var(--vscode-foreground); }
    .okr-md-panel-body .okr-md-h1 { font-size: 1.125rem; }
    .okr-md-panel-body .okr-md-h2 { font-size: 1rem; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.25rem; }
    .okr-md-panel-body .okr-md-h3 { font-size: 0.9rem; }
    .okr-md-panel-body .okr-md-h4 { font-size: 0.85rem; }
    .okr-md-panel-body .okr-md-p { margin: 0.5rem 0; }
    .okr-md-panel-body .okr-md-code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.8125rem; padding: 0.0625rem 0.25rem; background: rgba(148, 163, 184, 0.1); border-radius: 0.1875rem; }
    .okr-md-panel-body .okr-md-pre { background: rgba(148, 163, 184, 0.08); padding: 0.5rem; border-radius: 0.25rem; overflow-x: auto; font-size: 0.75rem; }
    .okr-md-panel-body .okr-md-pre code { background: transparent; padding: 0; }
    .okr-md-panel-body .okr-md-list { padding-left: 1.5rem; margin: 0.375rem 0; }
    .okr-md-panel-body .okr-md-list li { margin: 0.125rem 0; }
    .okr-md-panel-body .okr-md-quote { border-left: 3px solid rgba(148, 163, 184, 0.4); padding-left: 0.625rem; margin: 0.5rem 0; color: var(--vscode-descriptionForeground); }
    .okr-md-panel-body .okr-md-table { border-collapse: collapse; width: 100%; font-size: 0.75rem; margin: 0.5rem 0; }
    .okr-md-panel-body .okr-md-table th, .okr-md-panel-body .okr-md-table td { border: 1px solid var(--vscode-panel-border); padding: 0.25rem 0.5rem; text-align: left; }
    .okr-md-panel-body .okr-md-table th { background: rgba(148, 163, 184, 0.08); font-weight: 600; }
    .okr-md-panel-body .okr-md-hr { border: 0; border-top: 1px solid var(--vscode-panel-border); margin: 0.75rem 0; }
    .okr-md-panel-body a { color: var(--vscode-textLink-foreground); }
    .okr-action-footer { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .okr-button-destructive { color: #f87171; border-color: rgba(248, 113, 113, 0.4); }
    .okr-button-destructive:hover { background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.7); }
    .okr-button-disabled { opacity: 0.5; cursor: not-allowed; }
    .okr-button-locked-icon { font-size: 0.75rem; opacity: 0.7; margin-left: 0.25rem; }
    .okr-button-tooltip-hint { font-size: 0.7rem; color: var(--vscode-descriptionForeground); font-style: italic; }
    .okr-detail-footer { display: flex; gap: 0.5rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--vscode-panel-border); flex-wrap: wrap; }
    /* ──────── D-PR4 sub-PR 4: Fan-out pre-flight pane ──────── */
    .okr-fanout-pane { padding: 1rem 1.25rem; border: 1px solid var(--vscode-panel-border); border-radius: 0.5rem; margin-bottom: 0.75rem; background: var(--vscode-editor-background); }
    .okr-fanout-loading { display: flex; align-items: center; gap: 0.5rem; color: var(--vscode-descriptionForeground); font-size: 0.875rem; }
    .okr-fanout-spinner { display: inline-block; animation: okr-fanout-spin 1.5s linear infinite; }
    @keyframes okr-fanout-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .okr-fanout-setup-error { border-color: rgba(252, 211, 77, 0.4); background: rgba(252, 211, 77, 0.04); }
    .okr-fanout-setup-title { font-weight: 700; color: var(--vscode-foreground); font-size: 0.9rem; margin-bottom: 0.25rem; }
    .okr-fanout-setup-body { color: var(--vscode-descriptionForeground); font-size: 0.8125rem; line-height: 1.5; }
    .okr-fanout-verify-failed { border-color: rgba(248, 113, 113, 0.4); background: rgba(248, 113, 113, 0.05); }
    .okr-fanout-verify-raw { margin-top: 0.5rem; font-family: var(--vscode-editor-font-family, monospace); font-size: 0.75rem; padding: 0.375rem 0.5rem; background: rgba(148, 163, 184, 0.08); border-radius: 0.25rem; }
    .okr-fanout-verify-hint { margin-top: 0.5rem; font-size: 0.75rem; color: var(--vscode-descriptionForeground); }
    .okr-fanout-verify-hint code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.75rem; }
    .okr-fanout-entries { display: flex; flex-direction: column; gap: 0.5rem; }
    .okr-fanout-entry { padding: 0.5rem 0.75rem; border: 1px solid var(--vscode-panel-border); border-radius: 0.375rem; background: rgba(148, 163, 184, 0.04); border-left-width: 3px; }
    .okr-fanout-tone-ready  { border-left-color: #4ade80; }
    .okr-fanout-tone-flight { border-left-color: #38bdf8; }
    .okr-fanout-tone-wait   { border-left-color: #fcd34d; }
    .okr-fanout-tone-block  { border-left-color: #f87171; }
    .okr-fanout-tone-done   { border-left-color: #94a3b8; opacity: 0.85; }
    .okr-fanout-entry-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .okr-fanout-entry-slug code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.875rem; font-weight: 600; color: var(--vscode-foreground); }
    .okr-fanout-entry-status { font-size: 0.8125rem; margin-left: auto; font-weight: 500; }
    .okr-fanout-entry-meta { font-size: 0.75rem; color: var(--vscode-descriptionForeground); margin-top: 0.25rem; display: block; }
    .okr-fanout-entry-meta code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.7rem; padding: 0.0625rem 0.25rem; background: rgba(148, 163, 184, 0.1); border-radius: 0.1875rem; }
    .okr-fanout-entry-reason { font-size: 0.75rem; color: var(--vscode-descriptionForeground); margin-top: 0.25rem; line-height: 1.4; }
    .okr-fanout-chip { font-size: 0.65rem; padding: 0.0625rem 0.375rem; border-radius: 0.25rem; letter-spacing: 0.02em; text-transform: uppercase; font-weight: 600; }
    .okr-fanout-chip-brownfield { background: rgba(74, 222, 128, 0.12); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); }
    .okr-fanout-chip-greenfield { background: rgba(168, 85, 247, 0.14); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .okr-fanout-chip-gov-block { background: rgba(248, 113, 113, 0.14); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.35); text-transform: none; }
    .okr-fanout-chip-gov-caution { background: rgba(250, 204, 21, 0.12); color: #facc15; border: 1px solid rgba(250, 204, 21, 0.3); text-transform: none; }
    .okr-fanout-entry-gov { font-size: 0.72rem; margin-top: 0.25rem; line-height: 1.4; }
    .okr-fanout-entry-gov-block { color: #f87171; }
    .okr-fanout-entry-gov-caution { color: #facc15; }
    .okr-fanout-waves { margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed rgba(148, 163, 184, 0.25); font-size: 0.75rem; color: var(--vscode-descriptionForeground); display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .okr-fanout-waves code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.7rem; padding: 0.0625rem 0.25rem; background: rgba(148, 163, 184, 0.1); border-radius: 0.1875rem; }
    .okr-fanout-wave { padding: 0.125rem 0.375rem; background: rgba(148, 163, 184, 0.08); border-radius: 0.25rem; }
    .okr-fanout-skipped { margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(252, 211, 77, 0.06); border: 1px solid rgba(252, 211, 77, 0.25); border-radius: 0.375rem; }
    .okr-fanout-skipped-title { font-weight: 600; font-size: 0.8125rem; margin-bottom: 0.25rem; color: var(--vscode-foreground); }
    .okr-fanout-skipped-list { margin: 0.25rem 0 0.5rem; padding-left: 1.25rem; font-size: 0.75rem; }
    .okr-fanout-skipped-list code { font-family: var(--vscode-editor-font-family, monospace); }
    .okr-fanout-skipped-status { color: var(--vscode-descriptionForeground); font-size: 0.7rem; }
    .okr-fanout-skipped-hint { font-size: 0.75rem; color: var(--vscode-descriptionForeground); }
    .okr-fanout-empty { font-size: 0.875rem; color: var(--vscode-descriptionForeground); padding: 0.5rem 0; }
    .okr-fanout-actions { margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .okr-fanout-entry-actions { margin-top: 0.5rem; display: flex; gap: 0.375rem; flex-wrap: wrap; }
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
    /* Phase E E2 — structured Hatter Tag panel */
    .ht-section { margin: 0 0 1rem; padding: 0.5rem 0.75rem; background: var(--vscode-textCodeBlock-background, rgba(148, 163, 184, 0.06)); border-radius: 0.375rem; border-left: 3px solid var(--vscode-textLink-foreground, #60a5fa); }
    .ht-section-title { margin: 0 0 0.5rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--vscode-descriptionForeground); }
    .ht-row { display: flex; align-items: baseline; gap: 0.75rem; padding: 0.125rem 0; font-size: 0.8125rem; }
    .ht-label { flex: 0 0 9rem; color: var(--vscode-descriptionForeground); font-size: 0.75rem; }
    .ht-value { flex: 1; word-break: break-all; }
    .ht-value code { font-size: 0.75rem; }
    .btn-link { background: none; border: none; color: var(--vscode-textLink-foreground, #60a5fa); cursor: pointer; padding: 0; text-decoration: underline; }
    .btn-link:hover { color: var(--vscode-textLink-activeForeground, #93c5fd); }
    .okr-human-gate { margin-top: 0.75rem; padding: 0.75rem 1rem; border: 1px solid rgba(248, 113, 113, 0.4); border-radius: 0.375rem; background: rgba(248, 113, 113, 0.06); }
    .okr-human-gate-header { font-weight: 700; color: #fca5a5; margin-bottom: 0.5rem; font-size: 0.875rem; }
    .okr-human-gate-warn { margin: 0 0 0.5rem; font-size: 0.8125rem; color: #fcd34d; }
    .okr-human-gate-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .start-phase-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 3rem 2rem; }
    .start-phase-sheet { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 0.5rem; max-width: 820px; width: 100%; max-height: 85vh; overflow: auto; padding: 1.25rem 1.5rem; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4); display: flex; flex-direction: column; gap: 1rem; }
    .start-phase-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .start-phase-header h3 { margin: 0 0 0.25rem; font-size: 1.05rem; }
    .start-phase-meta { margin: 0; font-size: 0.8125rem; color: var(--vscode-descriptionForeground); }
    .start-phase-meta code { font-family: var(--vscode-editor-font-family, monospace); font-size: 0.75rem; }
    .start-phase-section { display: flex; flex-direction: column; gap: 0.375rem; }
    .start-phase-section-label { font-size: 0.8125rem; font-weight: 600; color: var(--vscode-foreground); }
    .start-phase-body { background: var(--vscode-textCodeBlock-background, rgba(148, 163, 184, 0.08)); border: 1px solid var(--vscode-panel-border); border-radius: 0.375rem; padding: 0.75rem 0.875rem; font-family: var(--vscode-editor-font-family, monospace); font-size: 0.8125rem; line-height: 1.5; max-height: 32vh; overflow: auto; margin: 0; white-space: pre-wrap; word-wrap: break-word; color: var(--vscode-foreground); }
    .start-phase-textarea { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); padding: 0.5rem 0.625rem; border-radius: 0.375rem; font-family: var(--vscode-editor-font-family, monospace); font-size: 0.8125rem; resize: vertical; min-height: 5rem; }
    .start-phase-textarea:focus { outline: 1px solid var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); }
    .start-phase-actions { display: flex; gap: 0.5rem; justify-content: flex-end; padding-top: 0.5rem; border-top: 1px solid var(--vscode-panel-border); }
  `;
}

export function attachOkrDetailEvents(
  vscode: { postMessage: (msg: unknown) => void },
  onBackToOkrList: () => void,
): void {
  document.querySelectorAll('[data-action="back-to-okr-list"]').forEach(el => {
    el.addEventListener('click', () => onBackToOkrList());
  });
  // 🔄 Refresh — re-fetch phase signals from GitHub without losing
  // panel focus. Useful right after Run / Re-run / Revise actions
  // where the workflow needs 10-30s to land its verdict labels.
  document.querySelectorAll('[data-action="refresh-okr"]').forEach(el => {
    el.addEventListener('click', () => {
      const okrId = (el as HTMLElement).dataset.okrId;
      if (okrId) {
        vscode.postMessage({ type: 'loadOkrPhaseSignals', okrId });
      }
    });
  });
  // 📥 Pull mesh (inline) — same pullMesh action as the top banner's Pull
  // button, but rendered inside the "PR merged but local in-flight"
  // hint so the user doesn't have to scroll to the top after a merge.
  document.querySelectorAll('[data-action="pull-mesh-inline"]').forEach(el => {
    el.addEventListener('click', () => {
      vscode.postMessage({ type: 'pullMesh' });
    });
  });
  document.querySelectorAll('[data-action="open-bar"]').forEach(el => {
    el.addEventListener('click', () => {
      const barPath = (el as HTMLElement).dataset.barPath;
      if (barPath) {
        vscode.postMessage({ type: 'drillIntoBar', barPath });
      }
    });
  });
  // A12: Connect Repo flow. Opens the repo's GitHub Settings → Actions
  // page in the browser (user enables workflows + approves app install
  // there). After that, the user flips the status to 'connected' via the
  // 4-state picker — persisted via the setOkrRepoStatus message (A12.v1.1).
  document.querySelectorAll('[data-action="open-repo-actions-settings"]').forEach(el => {
    el.addEventListener('click', () => {
      const url = (el as HTMLElement).dataset.url;
      if (url) {
        vscode.postMessage({ type: 'openUrl', url });
      }
    });
  });
  // A12.v1.1 — repo-status picker (4-state select). Fires on change, not
  // click — the user picks one of the three user-pickable states (the 4th,
  // 'unreachable', is system-set only after a probe).
  document.querySelectorAll('[data-action="set-repo-status"]').forEach(el => {
    el.addEventListener('change', () => {
      const e = el as HTMLSelectElement;
      const okrId = e.dataset.okrId;
      const repoUrl = e.dataset.repoUrl;
      const nextStatus = e.value;
      if (okrId && repoUrl && (nextStatus === 'connected' || nextStatus === 'not-connected' || nextStatus === 'create')) {
        vscode.postMessage({ type: 'setOkrRepoStatus', okrId, repoUrl, status: nextStatus });
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
  // Phase E E1 — Verify Chain — opens the chain verification modal
  // for an action's run. Extension walks the per-run audit JSONL via
  // GitHub Contents API + local fallback, runs `verifyChainForUI`
  // (UI mirror of the runner's audit-verify-chain skill), and posts
  // the verdict back as a `chainVerifySheet` message for modal render.
  document.querySelectorAll('[data-action="verify-chain"]').forEach(el => {
    el.addEventListener('click', () => {
      const container = el.closest('[data-okr-id]') as HTMLElement | null;
      const okrId = container?.dataset.okrId;
      const actionId = (el as HTMLElement).dataset.actionId;
      if (okrId && actionId) {
        vscode.postMessage({ type: 'verifyChain', okrId, actionId });
      }
    });
  });
  // Phase E E3 — Export Audit Report — generates a reviewer-facing
  // markdown report from the run's signed chain + chain-ladder +
  // okr.yaml fields. Saves under okrs/<id>/audit/exports/<runId>-
  // report.md and opens the file in VS Code.
  document.querySelectorAll('[data-action="export-audit"]').forEach(el => {
    el.addEventListener('click', () => {
      const container = el.closest('[data-okr-id]') as HTMLElement | null;
      const okrId = container?.dataset.okrId;
      const actionId = (el as HTMLElement).dataset.actionId;
      if (okrId && actionId) {
        vscode.postMessage({ type: 'exportAuditReport', okrId, actionId });
      }
    });
  });
  // Phase E E4 — Export Full OKR Audit Rollup (footer button). Generates
  // a whole-OKR rollup combining all 3 phases into one auditor-grade
  // markdown at okrs/<id>/audit/exports/<okrId>-rollup.md. Distinct from
  // per-action `export-audit` above which generates one closeout per
  // phase run.
  document.querySelectorAll('[data-action="export-okr-rollup"]').forEach(el => {
    el.addEventListener('click', () => {
      const okrId = (el as HTMLElement).dataset.okrId;
      if (okrId) {
        vscode.postMessage({ type: 'exportOkrRollup', okrId });
      }
    });
  });
  // Run Audit — applies the phase's audit-trigger label to the OKR's
  // open artifact PR so the audit-and-drift workflow fires. The button
  // is rendered conditionally in renderPhaseSignals when (a) the PR is
  // open and (b) the trigger label isn't already applied.
  document.querySelectorAll('[data-action="run-audit"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      const okrId = e.dataset.okrId;
      const phase = e.dataset.phase;
      const prNumber = e.dataset.prNumber ? parseInt(e.dataset.prNumber, 10) : undefined;
      if (okrId && phase && prNumber) {
        vscode.postMessage({ type: 'runOkrAudit', okrId, phase, prNumber });
      }
    });
  });
  // 📄 View artifact — toggles an inline collapsible panel that shows
  // the produced markdown file (research-doc.md / prd.md / code-design.md)
  // rendered safely. Extension responds by fetching the markdown body
  // via GitHub Contents API and patching the OKR phase signal.
  document.querySelectorAll('[data-action="toggle-artifact"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      const okrId = e.dataset.okrId;
      const phase = e.dataset.phase;
      if (okrId && phase) {
        vscode.postMessage({ type: 'toggleOkrArtifact', okrId, phase });
      }
    });
  });
  // ✓ Merge PR — surfaced only when the phase's audit passed. Extension
  // confirms via native VS Code modal (window.confirm in the webview is
  // unreliable), then calls GitHub's pulls.merge API with squash method.
  // After merge, finalize workflow flips action.status to complete on
  // the next push and the OKR detail re-fetches on panel-focus.
  document.querySelectorAll('[data-action="merge-pr"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      const okrId = e.dataset.okrId;
      const phase = e.dataset.phase;
      const prNumber = e.dataset.prNumber ? parseInt(e.dataset.prNumber, 10) : undefined;
      if (okrId && phase && prNumber) {
        vscode.postMessage({ type: 'mergeOkrPr', okrId, phase, prNumber });
      }
    });
  });
  // 🤖 Revise with agent — posts a structured PR comment dispatching
  // the phase's author agent with the audit failure reasons attached.
  // Use when the artifact content itself caused the failure (drift,
  // missing sections) and you want the agent to revise.
  document.querySelectorAll('[data-action="revise-with-agent"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      const okrId = e.dataset.okrId;
      const phase = e.dataset.phase;
      const prNumber = e.dataset.prNumber ? parseInt(e.dataset.prNumber, 10) : undefined;
      if (okrId && phase && prNumber) {
        vscode.postMessage({ type: 'reviseWithAgent', okrId, phase, prNumber });
      }
    });
  });
  // 🔁 Re-run audit — removes + re-applies the trigger label so the
  // workflow's `labeled` event fires again on the current PR state.
  // Surfaced only when the audit ran and applied a failure label.
  document.querySelectorAll('[data-action="rerun-audit"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      const okrId = e.dataset.okrId;
      const phase = e.dataset.phase;
      const prNumber = e.dataset.prNumber ? parseInt(e.dataset.prNumber, 10) : undefined;
      if (okrId && phase && prNumber) {
        vscode.postMessage({ type: 'rerunOkrAudit', okrId, phase, prNumber });
      }
    });
  });
  // ✅ Mark PR ready — flips a stuck-in-draft PR to ready-for-review.
  // Shown when the agent requested a review but never marked ready
  // itself (observed on PR #91). Extension calls pulls.update with
  // draft: false, then re-fetches signals so Run Audit surfaces.
  document.querySelectorAll('[data-action="mark-pr-ready"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      const okrId = e.dataset.okrId;
      const phase = e.dataset.phase;
      const prNumber = e.dataset.prNumber ? parseInt(e.dataset.prNumber, 10) : undefined;
      if (okrId && phase && prNumber) {
        vscode.postMessage({ type: 'markOkrPrReady', okrId, phase, prNumber });
      }
    });
  });
  // Phase C-PR3 — HumanGate Approve / Re-run / Reject. Confirmation +
  // dual-signature prompt happens extension-side via native VS Code
  // dialogs (window.confirm is unreliable in webviews — see B-PR3 fix).
  document.querySelectorAll('[data-action="okr-approve"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      vscode.postMessage({
        type: 'okrHumanGateApprove',
        okrId: e.dataset.okrId,
        actionId: e.dataset.actionId,
        tier: e.dataset.tier,
      });
    });
  });
  document.querySelectorAll('[data-action="okr-rerun"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      vscode.postMessage({
        type: 'okrHumanGateRerun',
        okrId: e.dataset.okrId,
        actionId: e.dataset.actionId,
      });
    });
  });
  document.querySelectorAll('[data-action="okr-reject"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      vscode.postMessage({
        type: 'okrHumanGateReject',
        okrId: e.dataset.okrId,
        actionId: e.dataset.actionId,
      });
    });
  });
  // Phase B-PR3+ Cancel-run — user-initiated cleanup when the GitHub
  // issue/PR has already been closed manually and we just want the
  // OKR card to stop showing "Running".
  document.querySelectorAll('[data-action="cancel-okr-action"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      vscode.postMessage({
        type: 'cancelOkrAction',
        okrId: e.dataset.okrId,
        actionId: e.dataset.actionId,
      });
    });
  });
  // D-PR1.v1.1 — Reset phase. The panel-side handler runs the
  // confirmation modal, so the webview just posts the intent.
  document.querySelectorAll('[data-action="reset-okr-phase"]').forEach(el => {
    el.addEventListener('click', () => {
      const e = el as HTMLElement;
      const okrId = e.dataset.okrId;
      const phase = e.dataset.phase;
      if (okrId && (phase === 'why' || phase === 'how' || phase === 'what')) {
        vscode.postMessage({ type: 'resetOkrPhase', okrId, phase });
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
  // Phase C-PR4: Start What
  document.querySelectorAll('[data-action="start-okr-what"]').forEach(el => {
    el.addEventListener('click', () => {
      const okrId = (el as HTMLElement).dataset.okrId;
      if (okrId) {
        vscode.postMessage({ type: 'startOkrWhat', okrId });
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
