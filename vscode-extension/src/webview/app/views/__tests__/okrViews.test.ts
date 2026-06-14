/**
 * Smoke tests for the OKR list + detail view renderers.
 *
 * These don't run in a real DOM — they verify the HTML strings these
 * pure renderers produce against expected substrings + that the data
 * gets rendered without throwing on edge cases (empty lists, missing
 * fields, paused state).
 */
import { describe, it, expect } from 'vitest';
import { renderOkrListView, getOkrListStyles } from '../okrList';
import { renderOkrDetailView, getOkrDetailStyles } from '../okrDetail';
import type { OkrCard, OkrListItem } from '../../../../types';

function sampleListItem(over: Partial<OkrListItem> = {}): OkrListItem {
  return {
    id: 'OKR-2026Q1-IMDB-001-celeb-api',
    objective: 'Add celebrity profile API to IMDB-Lite',
    ownerHandle: 'shawnmccarthy',
    platformId: 'PLT-IMDB',
    primaryBarId: 'APP-IMDB-002',
    primaryBarTier: 'restricted',
    status: 'draft',
    paused: false,
    phaseProgress: { why: 'not_started', how: 'not_started', what: 'not_started' },
    lastActivityAt: new Date().toISOString(),
    chainRootShort: '',
    targetCodeRepos: ['<org>/celeb-api'],
    ...over,
  };
}

function sampleCard(over: Partial<OkrCard> = {}): OkrCard {
  return {
    meta: {
      card: 'BTABoKItem',
      id: 'OKR-2026Q1-IMDB-001-celeb-api',
      owner: 'shawnmccarthy',
      status: 'draft',
      paused: false,
      createdAt: '2026-05-19T14:00:00Z',
      updatedAt: '2026-05-19T14:00:00Z',
      intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
    },
    overview: { name: 'OKR Card', description: '' },
    howToUse: { name: 'How to use this card', description: '' },
    objective: { name: 'Add celebrity profile API', description: 'Enable celeb data without risk.' },
    keyResults: [
      { id: 'KR-1', metric: 'False-merge rate', target: '< 0.5%', measurement: 'Telemetry' },
    ],
    actions: [],
    keyResultRetrospective: { name: 'Key Result Retrospective', description: '', results: [] },
    objectiveAlignment: {
      name: 'Objective Alignment',
      description: '',
      platformId: 'PLT-IMDB',
      affectedBarIds: ['APP-IMDB-002', 'APP-IMDB-001'],
      targetCodeRepos: ['<org>/celeb-api'],
      targetCodeRepoStatus: {},
      intentCascade: {
        org: 'Grow IMDB MAU 15% YoY',
        role: 'Engineering Lead — p95 < 250ms',
        developer: 'Add celebrity API; ship behind feature flag',
        user: 'Browse celebrity profiles without flicker on mobile',
      },
    },
    valueLearning: { name: 'Value & Learning', description: '', learnings: [] },
    downloads: { name: 'Downloads', description: '', links: [] },
    ...over,
  };
}

describe('renderOkrListView', () => {
  it('renders empty state with a Create OKR CTA when there are no OKRs', () => {
    const html = renderOkrListView({ okrs: [] });
    expect(html).toContain('No OKRs yet');
    expect(html).toContain('data-action="create-okr-manual"');
    expect(html).toContain('+ Create OKR');
  });

  it('renders a Create OKR button in the header when OKRs exist', () => {
    const html = renderOkrListView({ okrs: [sampleListItem()] });
    expect(html).toContain('data-action="create-okr-manual"');
  });

  it('renders loading state', () => {
    const html = renderOkrListView({ okrs: [], isLoading: true });
    expect(html).toContain('Loading OKRs');
  });

  it('renders a row for each OKR with the objective + id', () => {
    const html = renderOkrListView({ okrs: [sampleListItem()] });
    expect(html).toContain('OKR-2026Q1-IMDB-001-celeb-api');
    expect(html).toContain('Add celebrity profile API to IMDB-Lite');
    expect(html).toContain('data-okr-id="OKR-2026Q1-IMDB-001-celeb-api"');
  });

  it('renders the Restricted tier badge for the Celebs sample', () => {
    const html = renderOkrListView({ okrs: [sampleListItem()] });
    expect(html).toContain('okr-tier-restricted');
    expect(html).toContain('⚠ Restricted');
  });

  it('renders paused chip when an OKR is paused', () => {
    const html = renderOkrListView({ okrs: [sampleListItem({ paused: true })] });
    expect(html).toContain('Paused');
  });

  it('renders phase progress glyphs', () => {
    const html = renderOkrListView({ okrs: [sampleListItem({
      phaseProgress: { why: 'complete', how: 'in_progress', what: 'not_started' },
    })] });
    expect(html).toContain('okr-phase-complete');
    expect(html).toContain('okr-phase-in_progress');
    expect(html).toContain('okr-phase-not_started');
  });

  it('emits CSS containing all tier classes', () => {
    const css = getOkrListStyles();
    expect(css).toContain('.okr-tier-autonomous');
    expect(css).toContain('.okr-tier-supervised');
    expect(css).toContain('.okr-tier-restricted');
  });
});

describe('renderOkrDetailView', () => {
  it('renders the objective + intent cascade', () => {
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [] });
    expect(html).toContain('Add celebrity profile API');
    expect(html).toContain('Grow IMDB MAU 15% YoY');
    expect(html).toContain('Engineering Lead');
  });

  it('renders all three Action cards; Start Why is wired (B-PR3); How + What gated on prior phases', () => {
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [] });
    expect(html).toContain('Why · Research');
    expect(html).toContain('How · PRD');
    expect(html).toContain('What · Code Design');
    expect(html).toContain('Start Why');
    expect(html).toContain('Start How');
    expect(html).toContain('Start What');
    // Start Why is an active button (no prior phase).
    expect(html).toContain('data-action="start-okr-why"');
    // Start How + What are gated on their prior phases having merged.
    expect(html).toMatch(/disabled[^>]*title="Gated on Why merged/);
    expect(html).toMatch(/disabled[^>]*title="Gated on How merged/);
  });

  it('Start Why is disabled when the OKR is paused', () => {
    const card = sampleCard();
    card.meta.paused = true;
    const html = renderOkrDetailView({ okr: card, affectedBars: [] });
    // No clickable Start Why action — only a disabled button with the paused tooltip
    expect(html).not.toContain('data-action="start-okr-why"');
    expect(html).toMatch(/disabled[^>]*title="OKR is paused/);
  });

  it('Start Why is disabled when the Why phase is already in flight', () => {
    const card = sampleCard({
      actions: [{
        id: 'ACT-1',
        phase: 'why',
        description: 'Market research',
        agent: 'market-research-agent',
        runId: 'WHY-test',
        intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
        parentIntentThread: null,
        reviewerScores: {},
        rounds: 0,
        governanceTier: 'supervised',
        status: 'in_progress',
        createdAt: '2026-05-19T14:00:00Z',
      }],
    });
    const html = renderOkrDetailView({ okr: card, affectedBars: [] });
    expect(html).not.toContain('data-action="start-okr-why"');
    expect(html).toMatch(/disabled[^>]*title="Run already in flight/);
  });

  it('gates Start How on Why and Start What on How (not-started phases show gated label)', () => {
    const html = renderOkrDetailView({
      okr: sampleCard(),
      affectedBars: [{ id: 'APP-IMDB-002', name: 'IMDB Celebs', path: '/m/bars/imdb-celebs', compositeScore: 32, tier: 'restricted' }],
    });
    expect(html).toContain('Gated on Why merged');
    expect(html).toContain('Gated on How merged');
  });

  it('shows Restricted-tier substate on What card after How merges (tier becomes the blocker)', () => {
    // Pre-populate an OKR with a completed How action so the gate-on-How
    // check passes — only the tier check remains.
    const okr = sampleCard({
      actions: [{
        id: 'ACT-1',
        phase: 'how',
        description: 'PRD',
        agent: 'prd-agent',
        runId: 'PRD-test',
        intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
        parentIntentThread: null,
        reviewerScores: { architect: 85, security: 80 },
        rounds: 1,
        governanceTier: 'restricted',
        status: 'complete',
        createdAt: '2026-05-19T14:00:00Z',
        completedAt: '2026-05-19T15:00:00Z',
      }],
    });
    const html = renderOkrDetailView({
      okr,
      affectedBars: [{ id: 'APP-IMDB-002', name: 'IMDB Celebs', path: '/m/bars/imdb-celebs', compositeScore: 32, tier: 'restricted' }],
    });
    expect(html).toContain('☐ Restricted');
    // Start What button has the Restricted-tier blocked tooltip
    expect(html).toMatch(/disabled[^>]*title="Restricted tier/);
  });

  it('Start What becomes a clickable button when How is complete, tier is not Restricted, and target repo statuses are set', () => {
    const okr = sampleCard({
      actions: [{
        id: 'ACT-1',
        phase: 'how',
        description: 'PRD',
        agent: 'prd-agent',
        runId: 'PRD-test',
        intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
        parentIntentThread: null,
        reviewerScores: { architect: 85, security: 80 },
        rounds: 1,
        governanceTier: 'supervised',
        status: 'complete',
        createdAt: '2026-05-19T14:00:00Z',
        completedAt: '2026-05-19T15:00:00Z',
      }],
    });
    // A12.v1.1 — set every target repo's intent to 'create' so the
    // precondition gate passes. Without this, sample OKR target repos
    // default to 'not-connected' which now blocks Start What at the UI.
    for (const url of okr.objectiveAlignment.targetCodeRepos) {
      okr.objectiveAlignment.targetCodeRepoStatus[url] = 'create';
    }
    const html = renderOkrDetailView({
      okr,
      affectedBars: [{ id: 'APP-IMDB-001', name: 'IMDB Lite App', path: '/m', compositeScore: 64, tier: 'supervised' }],
    });
    expect(html).toContain('data-action="start-okr-what"');
  });

  // A12.v1.1 — Start What disabled when any target repo lacks an explicit
  // intent. Matches the panel-side precondition: every targetCodeRepos[]
  // entry must be 'connected' or 'create' before dispatch.
  it('Start What is disabled when target repos still default to not-connected', () => {
    const okr = sampleCard({
      actions: [{
        id: 'ACT-1',
        phase: 'how',
        description: 'PRD',
        agent: 'prd-agent',
        runId: 'PRD-test',
        intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
        parentIntentThread: null,
        reviewerScores: { architect: 85, security: 80 },
        rounds: 1,
        governanceTier: 'supervised',
        status: 'complete',
        createdAt: '2026-05-19T14:00:00Z',
        completedAt: '2026-05-19T15:00:00Z',
      }],
    });
    // Leave targetCodeRepoStatus empty — sample OKR has a target repo,
    // so the default ('not-connected') blocks the button.
    const html = renderOkrDetailView({
      okr,
      affectedBars: [{ id: 'APP-IMDB-001', name: 'IMDB Lite App', path: '/m', compositeScore: 64, tier: 'supervised' }],
    });
    expect(html).not.toContain('data-action="start-okr-what"');
    // Disabled-button form still renders (with the 🔒 icon) — verify
    // that's present so we know we're testing the disabled path, not
    // a render-failure path.
    expect(html).toContain('data-phase="what"');
    expect(html).toContain('Every target repo must be set to Connected or Create');
  });

  it('renders affected BARs with tier badges and Open BAR ↗ links', () => {
    const html = renderOkrDetailView({
      okr: sampleCard(),
      affectedBars: [
        { id: 'APP-IMDB-002', name: 'IMDB Celebs', path: '/m/bars/imdb-celebs', compositeScore: 32, tier: 'restricted' },
        { id: 'APP-IMDB-001', name: 'IMDB Lite App', path: '/m/bars/imdb-lite-application', compositeScore: 64, tier: 'supervised' },
      ],
    });
    expect(html).toContain('APP-IMDB-002');
    expect(html).toContain('APP-IMDB-001');
    expect(html).toContain('data-action="open-bar"');
    expect(html).toContain('data-bar-path="/m/bars/imdb-celebs"');
  });

  // A12.v1.1: 4-state repo status — connected / not-connected / create /
  // unreachable. Default for absent entries is 'not-connected'.
  it('renders target repos defaulting to Not Connected when no status set', () => {
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [] });
    expect(html).toContain('&lt;org&gt;/celeb-api');
    expect(html).toContain('○ Not Connected');
    // Status picker is rendered with all three user-pickable options.
    expect(html).toContain('data-action="set-repo-status"');
    expect(html).toContain('value="connected"');
    expect(html).toContain('value="not-connected"');
    expect(html).toContain('value="create"');
  });

  it('renders Connect Repo ↗ button only for not-connected status', () => {
    const card = sampleCard();
    card.objectiveAlignment.targetCodeRepoStatus = {
      [card.objectiveAlignment.targetCodeRepos[0]]: 'create',
    };
    const html = renderOkrDetailView({ okr: card, affectedBars: [] });
    // 'create' state should NOT surface the Connect Repo ↗ button (no
    // repo to connect to — it's greenfield).
    expect(html).toContain('✨ Create (greenfield)');
    expect(html).not.toContain('open-repo-actions-settings');
  });

  it('renders ✓ Connected badge when status is connected', () => {
    const card = sampleCard();
    card.objectiveAlignment.targetCodeRepoStatus = {
      [card.objectiveAlignment.targetCodeRepos[0]]: 'connected',
    };
    const html = renderOkrDetailView({ okr: card, affectedBars: [] });
    expect(html).toContain('✓ Connected');
    // Connected repos also don't need the Connect Repo ↗ button.
    expect(html).not.toContain('open-repo-actions-settings');
  });

  it('renders ⚠ Unreachable badge when status is unreachable', () => {
    const card = sampleCard();
    card.objectiveAlignment.targetCodeRepoStatus = {
      [card.objectiveAlignment.targetCodeRepos[0]]: 'unreachable',
    };
    const html = renderOkrDetailView({ okr: card, affectedBars: [] });
    expect(html).toContain('⚠ Unreachable');
  });

  it('renders the back-to-list breadcrumb', () => {
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [] });
    expect(html).toContain('data-action="back-to-okr-list"');
  });

  it('Export Full OKR Audit Rollup footer button is wired (E4)', () => {
    // Phase E E4 (2026-05-25) — the disabled `Export Audit Report` +
    // `Verify Chain` footer placeholders were replaced by a single wired
    // `Export Full OKR Audit Rollup` button dispatching `exportOkrRollup`.
    // Per-action Verify Chain ↗ buttons inside each phase card still
    // cover the shipped per-action verify flow; the OKR-level verify-all
    // is a separate future feature.
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [] });
    expect(html).toContain('Export Full OKR Audit Rollup');
    expect(html).toContain('data-action="export-okr-rollup"');
    expect(html).not.toContain('title="Phase E feature"');
  });

  it('renders gracefully with null okr', () => {
    const html = renderOkrDetailView({ okr: null, affectedBars: [] });
    expect(html).toContain('OKR not loaded');
  });

  it('emits CSS for all action-card tones', () => {
    const css = getOkrDetailStyles();
    expect(css).toContain('.okr-action-card-idle');
    expect(css).toContain('.okr-action-card-progress');
    expect(css).toContain('.okr-action-card-block');
    expect(css).toContain('.okr-action-card-done');
  });

  it('lays WHY/HOW/WHAT out as a responsive pipeline row (3-up when wide, stacked when narrow)', () => {
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [] });
    expect(html).toContain('class="okr-actions-row"');
    expect(html).toContain('okr-actions-connector');
    const css = getOkrDetailStyles();
    expect(css).toContain('.okr-actions-row');
    expect(css).toContain('@media (min-width: 760px)');
    expect(css).toContain('margin-top: auto');
  });

  it('view mode shows an Edit button', () => {
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [], mode: 'view' });
    expect(html).toContain('data-action="edit-okr"');
  });

  it('edit mode renders form inputs for objective, owner, KRs, intent cascade', () => {
    const html = renderOkrDetailView({
      okr: sampleCard(),
      affectedBars: [],
      mode: 'edit',
      availablePlatforms: [{ id: 'PLT-IMDB', name: 'IMDB Lite', slug: 'imdb-lite', barCount: 2 }],
      availableBars: [
        { id: 'APP-IMDB-002', name: 'IMDB Celebs', platformId: 'PLT-IMDB', platformName: 'IMDB Lite', compositeScore: 32, tier: 'restricted', repos: [] },
      ],
    });
    expect(html).toContain('data-okr-field="objective.name"');
    expect(html).toContain('data-okr-field="meta.owner"');
    expect(html).toContain('data-okr-field="meta.paused"');
    expect(html).toContain('data-okr-field="objectiveAlignment.intentCascade.org"');
    expect(html).toContain('data-okr-kr-field="metric"');
    expect(html).toContain('data-okr-bar-id="APP-IMDB-002"');
    expect(html).toContain('data-action="okr-save"');
    expect(html).toContain('data-action="okr-cancel"');
  });

  it('edit mode pre-checks affected BARs that are on the card', () => {
    const html = renderOkrDetailView({
      okr: sampleCard(),
      affectedBars: [],
      mode: 'edit',
      availablePlatforms: [{ id: 'PLT-IMDB', name: 'IMDB Lite', slug: 'imdb-lite', barCount: 2 }],
      availableBars: [
        { id: 'APP-IMDB-002', name: 'IMDB Celebs', platformId: 'PLT-IMDB', platformName: 'IMDB Lite', compositeScore: 32, tier: 'restricted', repos: [] },
        { id: 'APP-IMDB-099', name: 'Unrelated BAR', platformId: 'PLT-IMDB', platformName: 'IMDB Lite', compositeScore: 70, tier: 'supervised', repos: [] },
      ],
    });
    // sampleCard()'s affectedBarIds = ['APP-IMDB-002', 'APP-IMDB-001']
    expect(html).toMatch(/data-okr-bar-id="APP-IMDB-002"[^>]*checked/);
    expect(html).not.toMatch(/data-okr-bar-id="APP-IMDB-099"[^>]*checked/);
  });

  it('create mode renders a Create OKR button instead of Save changes', () => {
    const html = renderOkrDetailView({
      okr: sampleCard({ meta: { ...sampleCard().meta, id: 'OKR-DRAFT' } }),
      affectedBars: [],
      mode: 'create',
      availablePlatforms: [],
      availableBars: [],
    });
    expect(html).toContain('Create OKR');
    expect(html).not.toContain('Save changes');
    expect(html).toContain('New OKR (unsaved)');
  });

  it('edit mode renders target-repo checkboxes from each BAR app.yaml', () => {
    const html = renderOkrDetailView({
      okr: sampleCard({
        objectiveAlignment: {
          ...sampleCard().objectiveAlignment,
          targetCodeRepos: ['https://github.com/acme/celeb-api'],
        },
      }),
      affectedBars: [],
      mode: 'edit',
      availablePlatforms: [{ id: 'PLT-IMDB', name: 'IMDB Lite', slug: 'imdb-lite', barCount: 2 }],
      availableBars: [
        { id: 'APP-IMDB-002', name: 'IMDB Celebs', platformId: 'PLT-IMDB', platformName: 'IMDB Lite', compositeScore: 32, tier: 'restricted', repos: ['https://github.com/acme/celeb-api'] },
        { id: 'APP-IMDB-001', name: 'IMDB Lite App', platformId: 'PLT-IMDB', platformName: 'IMDB Lite', compositeScore: 64, tier: 'supervised', repos: ['https://github.com/acme/imdb-react-frontend', 'https://github.com/acme/movie-api'] },
      ],
    });
    // Each BAR repo shows up as a suggestion checkbox
    expect(html).toContain('value="https://github.com/acme/celeb-api"');
    expect(html).toContain('value="https://github.com/acme/imdb-react-frontend"');
    expect(html).toContain('value="https://github.com/acme/movie-api"');
    // The repo already on the OKR is pre-checked
    expect(html).toMatch(/value="https:\/\/github\.com\/acme\/celeb-api"[^>]*checked/);
    // BAR repos that aren't on the OKR are NOT pre-checked
    expect(html).not.toMatch(/value="https:\/\/github\.com\/acme\/movie-api"[^>]*checked/);
    // Section advertises both picker + custom URL adder
    expect(html).toContain('Custom repo URLs');
    expect(html).toContain('data-action="repo-add"');
  });

  it('renders the HumanGate Approve/Re-run/Reject panel when latest action.status is human_gate', () => {
    const card = sampleCard({
      actions: [{
        id: 'ACT-1',
        phase: 'how',
        description: 'PRD',
        agent: 'prd-agent',
        runId: 'HOW-test',
        intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
        parentIntentThread: null,
        reviewerScores: { architect: 60, security: 40 },
        rounds: 2,
        governanceTier: 'supervised',
        status: 'human_gate',
        createdAt: '2026-05-19T14:00:00Z',
      }],
    });
    const html = renderOkrDetailView({
      okr: card,
      affectedBars: [{ id: 'APP-IMDB-002', name: 'IMDB Celebs', path: '/m', compositeScore: 64, tier: 'supervised' }],
    });
    expect(html).toContain('HumanGate — auto-revision cycle exhausted');
    expect(html).toContain('data-action="okr-approve"');
    expect(html).toContain('data-action="okr-rerun"');
    expect(html).toContain('data-action="okr-reject"');
    // No dual-signature warning at supervised tier
    expect(html).not.toContain('dual signature');
    // The gate breaks out full-width below the actions row with a phase label
    // (not inside the ⅓-width phase card).
    expect(html).toContain('okr-phase-gate-label');
    expect(html).toContain('How · PRD — needs you');
  });

  it('renders the dual-signature warning when the HumanGate fires on Restricted tier', () => {
    const card = sampleCard({
      actions: [{
        id: 'ACT-1',
        phase: 'how',
        description: 'PRD',
        agent: 'prd-agent',
        runId: 'HOW-test',
        intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
        parentIntentThread: null,
        reviewerScores: { architect: 30, security: 25 },
        rounds: 0,
        governanceTier: 'restricted',
        status: 'human_gate',
        createdAt: '2026-05-19T14:00:00Z',
      }],
    });
    const html = renderOkrDetailView({
      okr: card,
      affectedBars: [{ id: 'APP-IMDB-002', name: 'IMDB Celebs', path: '/m', compositeScore: 32, tier: 'restricted' }],
    });
    expect(html).toContain('Restricted tier');
    expect(html).toContain('dual signature');
  });

  it('edit mode surfaces non-BAR repos as custom rows so user-added URLs survive a re-render', () => {
    const html = renderOkrDetailView({
      okr: sampleCard({
        objectiveAlignment: {
          ...sampleCard().objectiveAlignment,
          targetCodeRepos: ['https://github.com/somewhere-else/special'],
        },
      }),
      affectedBars: [],
      mode: 'edit',
      availablePlatforms: [],
      availableBars: [
        { id: 'APP-IMDB-002', name: 'IMDB Celebs', platformId: 'PLT-IMDB', platformName: 'IMDB Lite', compositeScore: 32, tier: 'restricted', repos: ['https://github.com/acme/celeb-api'] },
      ],
    });
    // The OKR's URL doesn't match any BAR repo — it lands in the custom editor
    expect(html).toContain('value="https://github.com/somewhere-else/special"');
    expect(html).toContain('data-okr-repo-row="0"');
  });

  it('routes greenfield fan-out prep through the owning BAR instead of direct repo create', () => {
    const okr = sampleCard({
      actions: [{
        id: 'ACT-3',
        phase: 'what',
        description: 'Code design',
        agent: 'code-design-agent',
        runId: 'WHAT-test',
        intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
        parentIntentThread: null,
        reviewerScores: { architect: 95, security: 92 },
        rounds: 1,
        governanceTier: 'supervised',
        status: 'complete',
        createdAt: '2026-05-19T14:00:00Z',
      }],
      objectiveAlignment: {
        ...sampleCard().objectiveAlignment,
        affectedBarIds: ['APP-IMDB-002'],
        targetCodeRepos: ['https://github.com/acme/celeb-api'],
        targetCodeRepoStatus: { 'https://github.com/acme/celeb-api': 'create' },
      },
    });
    const html = renderOkrDetailView({
      okr,
      affectedBars: [],
      availableBars: [{
        id: 'APP-IMDB-002',
        name: 'IMDB Celebs',
        path: '/mesh/platforms/imdb/bars/celebs',
        platformId: 'PLT-IMDB',
        platformName: 'IMDB Lite',
        compositeScore: 64,
        tier: 'supervised',
        repos: ['https://github.com/acme/celeb-api'],
      }],
      fanOutPreflight: {
        report: {
          ok: true,
          okrId: okr.meta.id,
          readyRepos: [],
          waves: [['acme/celeb-api']],
          entries: [{
            slug: 'acme/celeb-api',
            status: 'create',
            decision: { status: 'pending-scaffold', reason: 'Greenfield ready to scaffold.' },
            coordinationRow: { fanout_wave: 1, coordination_role: 'provider', depends_on: [] },
          }],
        },
      },
    });

    expect(html).toContain('data-action="fanout-prepare-repo"');
    expect(html).toContain('data-repo-slug="acme/celeb-api"');
    expect(html).toContain('data-repo-url="https://github.com/acme/celeb-api"');
    expect(html).toContain('data-bar-path="/mesh/platforms/imdb/bars/celebs"');
    expect(html).toContain('Prepare in BAR');
    expect(html).not.toContain('fanout-start-scaffold');
  });

  it('routes brownfield harness-missing fan-out prep through BAR workspace opening', () => {
    const okr = sampleCard({
      actions: [{
        id: 'ACT-3',
        phase: 'what',
        description: 'Code design',
        agent: 'code-design-agent',
        runId: 'WHAT-test',
        intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
        parentIntentThread: null,
        reviewerScores: { architect: 95, security: 92 },
        rounds: 1,
        governanceTier: 'supervised',
        status: 'complete',
        createdAt: '2026-05-19T14:00:00Z',
      }],
      objectiveAlignment: {
        ...sampleCard().objectiveAlignment,
        affectedBarIds: ['APP-IMDB-001'],
        targetCodeRepos: ['https://github.com/acme/imdb-react-frontend'],
        targetCodeRepoStatus: { 'https://github.com/acme/imdb-react-frontend': 'connected' },
      },
    });
    const html = renderOkrDetailView({
      okr,
      affectedBars: [],
      availableBars: [{
        id: 'APP-IMDB-001',
        name: 'IMDB Frontend',
        path: '/mesh/platforms/imdb/bars/frontend',
        platformId: 'PLT-IMDB',
        platformName: 'IMDB Lite',
        compositeScore: 64,
        tier: 'supervised',
        repos: ['https://github.com/acme/imdb-react-frontend'],
      }],
      fanOutPreflight: {
        report: {
          ok: true,
          okrId: okr.meta.id,
          readyRepos: [],
          waves: [['acme/imdb-react-frontend']],
          entries: [{
            slug: 'acme/imdb-react-frontend',
            status: 'connected',
            decision: { status: 'harness-missing', reason: 'Implementation agent missing.' },
            coordinationRow: { fanout_wave: 1, coordination_role: 'consumer', depends_on: [] },
          }],
        },
      },
    });

    expect(html).toContain('data-action="fanout-prepare-repo"');
    expect(html).toContain('Open BAR repo');
    expect(html).toContain('data-repo-url="https://github.com/acme/imdb-react-frontend"');
    expect(html).toContain('data-bar-path="/mesh/platforms/imdb/bars/frontend"');
  });

  it('asks the user to link a fan-out repo to an affected BAR before prep', () => {
    const okr = sampleCard({
      actions: [{
        id: 'ACT-3',
        phase: 'what',
        description: 'Code design',
        agent: 'code-design-agent',
        runId: 'WHAT-test',
        intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
        parentIntentThread: null,
        reviewerScores: { architect: 95, security: 92 },
        rounds: 1,
        governanceTier: 'supervised',
        status: 'complete',
        createdAt: '2026-05-19T14:00:00Z',
      }],
      objectiveAlignment: {
        ...sampleCard().objectiveAlignment,
        affectedBarIds: ['APP-IMDB-002'],
        targetCodeRepos: ['https://github.com/acme/celeb-api'],
        targetCodeRepoStatus: { 'https://github.com/acme/celeb-api': 'create' },
      },
    });
    const html = renderOkrDetailView({
      okr,
      affectedBars: [],
      availableBars: [{
        id: 'APP-IMDB-002',
        name: 'IMDB Celebs',
        path: '/mesh/platforms/imdb/bars/celebs',
        platformId: 'PLT-IMDB',
        platformName: 'IMDB Lite',
        compositeScore: 64,
        tier: 'supervised',
        repos: ['https://github.com/acme/other-repo'],
      }],
      fanOutPreflight: {
        report: {
          ok: true,
          okrId: okr.meta.id,
          readyRepos: [],
          waves: [['acme/celeb-api']],
          entries: [{
            slug: 'acme/celeb-api',
            status: 'create',
            decision: { status: 'pending-scaffold', reason: 'Greenfield ready to scaffold.' },
            coordinationRow: { fanout_wave: 1, coordination_role: 'provider', depends_on: [] },
          }],
        },
      },
    });

    expect(html).toContain('Link this repo to an affected BAR first.');
    expect(html).toContain('data-action="open-bar"');
    expect(html).not.toContain('data-action="fanout-prepare-repo"');
  });

  /**
   * Task #54 — flicker fix: polling indicator + refresh-preserves-data
   * contract. The previous behavior wiped state.okrPhaseSignals to
   * `{ loading: true }` on every panel-focus / pull / post-audit poll,
   * so the metric lines flashed to "Loading…" then snapped back. The
   * fix: distinguish first-fetch (cold-start `loading`) from
   * background refresh (`refreshing`); refresh preserves last-known
   * data + lights a pulsing dot in the card header.
   */
  describe('phase-signal polling indicator (Task #54)', () => {
    function whyCardHtml(signalOverride: Record<string, unknown> | undefined): string {
      return renderOkrDetailView({
        okr: sampleCard({
          actions: [{
            id: 'ACT-1',
            phase: 'why',
            description: 'Market research',
            agent: 'market-research-agent',
            runId: 'WHY-2026-05-22-abc',
            intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
            parentIntentThread: null,
            reviewerScores: {},
            rounds: 0,
            governanceTier: 'supervised',
            status: 'complete',
            createdAt: '2026-05-22T14:00:00Z',
            completedAt: '2026-05-22T15:00:00Z',
          }],
        }),
        affectedBars: [],
        phaseSignals: { why: signalOverride as never },
      });
    }

    it('renders muted idle dot when no signal has ever been fetched', () => {
      const html = whyCardHtml(undefined);
      expect(html).toContain('okr-poll-dot-idle');
      expect(html).not.toContain('okr-poll-dot-pulse');
      expect(html).not.toContain('okr-poll-dot-fresh');
    });

    it('renders pulsing dot AND "Loading…" placeholder for cold-start fetch', () => {
      const html = whyCardHtml({ loading: true });
      expect(html).toContain('okr-poll-dot-pulse');
      expect(html).toContain('Loading sources · refine · findings · coverage · drift');
    });

    it('renders pulsing dot AND keeps last-known metrics during background refresh', () => {
      // Has prior data (providers, findings) AND refreshing=true. The
      // metric lines should still render — NOT flash to "Loading…".
      const html = whyCardHtml({
        refreshing: true,
        providers: { tavily: 5, arxiv: 0, uspto: 0, hn: 0, total: 5 },
        gapLoops: 1,
        followUps: 3,
        findings: 14,
        conclusions: 4,
        conclusionsWithCites: 4,
      });
      expect(html).toContain('okr-poll-dot-pulse');
      expect(html).toContain('5 successful skill_calls');
      expect(html).toContain('1 gap-loop');
      // Task #55/#57: display uses honest unique counts ("14 sources cited",
      // "4 conclusions (4/4 cite ≥1 source)") instead of the old
      // misleading "S1–S14 cited" range string.
      expect(html).toContain('14 sources cited');
      expect(html).toContain('4 conclusions');
      expect(html).toContain('4/4 cite ≥1 source');
      // Critical: the cold-start placeholder must NOT appear when we
      // have last-known data to display. This is the flicker fix.
      expect(html).not.toContain('Loading sources · refine · findings · coverage · drift');
    });

    it('renders fresh green dot when last fetch succeeded (no in-flight refresh)', () => {
      const html = whyCardHtml({
        providers: { tavily: 5, arxiv: 0, uspto: 0, hn: 0, total: 5 },
        findings: 14,
      });
      expect(html).toContain('okr-poll-dot-fresh');
      // No background refresh in flight — but HOW + WHAT phases legitimately
      // render `okr-poll-dot-idle` because they have no signal yet, so we
      // don't assert idle's absence globally.
      expect(html).not.toContain('okr-poll-dot-pulse');
    });

    it('renders error mark when last fetch failed', () => {
      const html = whyCardHtml({ error: 'GitHub 404' });
      expect(html).toContain('okr-poll-dot-error');
      expect(html).toContain('GitHub 404');
    });

    // Bug-P / Codex audit minor closeout — extend polling-indicator
    // coverage to HOW + WHAT. The renderer was always generic; the
    // tests were only ever WHY-shaped, so a future regression on the
    // HOW/WHAT branch would have shipped silently.
    it('renders pulsing dot for cold-start HOW phase fetch', () => {
      const html = renderOkrDetailView({
        okr: sampleCard({
          actions: [{
            id: 'ACT-H1',
            phase: 'how',
            description: 'PRD',
            agent: 'prd-agent',
            runId: 'HOW-2026-05-22-xyz',
            intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
            parentIntentThread: '7f3e9c2d-1111-4222-8333-444444444444',
            reviewerScores: {},
            rounds: 0,
            governanceTier: 'supervised',
            status: 'in_progress',
            createdAt: '2026-05-23T14:00:00Z',
          }],
        }),
        affectedBars: [],
        phaseSignals: { how: { loading: true } as never },
      });
      expect(html).toContain('okr-poll-dot-pulse');
    });

    it('renders fresh green dot for completed WHAT phase fetch', () => {
      const html = renderOkrDetailView({
        okr: sampleCard({
          actions: [{
            id: 'ACT-W1',
            phase: 'what',
            description: 'Code design',
            agent: 'code-design-agent',
            runId: 'WHAT-2026-05-22-abc',
            intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
            parentIntentThread: '7f3e9c2d-1111-4222-8333-444444444444',
            reviewerScores: {},
            rounds: 0,
            governanceTier: 'supervised',
            status: 'complete',
            createdAt: '2026-05-23T14:00:00Z',
            completedAt: '2026-05-23T15:00:00Z',
          }],
        }),
        affectedBars: [],
        phaseSignals: {
          what: {
            // Reasonable WHAT-shaped signal stub — counts whatever
            // extractWhatChainSignals would produce for a clean run.
            skillCalls: 14,
            artifacts: 1,
            selfReviews: 4,
          } as never,
        },
      });
      expect(html).toContain('okr-poll-dot-fresh');
      expect(html).not.toContain('okr-poll-dot-pulse');
    });

    it('ships CSS keyframe + dot classes for the polling indicator', () => {
      expect(getOkrDetailStyles()).toContain('@keyframes okr-poll-pulse');
      expect(getOkrDetailStyles()).toContain('.okr-poll-dot');
    });
  });

  // ── 2026-06-13 — collapsed (done + sealed) phase cards: compact summary
  //    with status lights + always-on controls; live/gated phases stay open ──
  describe('collapsed phase cards', () => {
    const doneWhy = (over: Record<string, unknown> = {}) => ({
      id: 'ACT-1', phase: 'why' as const, description: 'Research', agent: 'market-research-agent',
      runId: 'WHY-2026-06-13-rfh9pw', intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
      parentIntentThread: null, reviewerScores: { architect: 0, security: 0 }, rounds: 0,
      governanceTier: 'autonomous' as const, status: 'complete' as const,
      createdAt: '2026-06-13T17:16:00Z', completedAt: '2026-06-13T18:20:00Z',
      hatterChainRoot: 'c80528dfb3df7d3244880dcfb1afa55eb811690bb9856c05d469205dec80b284',
      ...over,
    });

    it('collapses a done + sealed phase to a compact card (dots + verdict + always-on controls)', () => {
      const html = renderOkrDetailView({
        okr: sampleCard({ actions: [doneWhy()] }),
        affectedBars: [],
        phaseSignals: { why: {
          providers: { tavily: 1, arxiv: 1, uspto: 1, hn: 1, total: 4 },
          conclusions: 6, findings: 50, briefTopicsCovered: 4, briefTopicsTotal: 4,
          h2Present: 10, h2Total: 10,
          pocketWatch: { passed: 'true', status: 'needs_review', rank: 1, margin: 0.13 },
          prNumber: 235, prUrl: 'https://example.test/pull/235', prState: 'merged',
          chainRoot: 'c80528dfb3df7d32', sealed: true,
        } },
      });
      expect(html).toContain('okr-action-collapsed');
      expect(html).toContain('okr-phase-check');              // clean green ✓ in header
      expect(html).toContain('okr-collapsed-header');         // two-row de-squished header
      expect(html).toContain('okr-collapsed-titlerow');       // title gets its own full-width row
      expect(html).toContain('research-pass');                // verdict pill
      expect(html).toContain('okr-phase-dots');               // status lights
      expect(html).toContain('okr-dot-warn');                 // drift advisory (needs_review → amber)
      expect(html).toContain('okr-phase-details');            // Details expander
      // Always-on controls survive the collapse — compact icon+word buttons.
      expect(html).toContain('data-action="verify-chain"');
      expect(html).toContain('data-action="export-audit"');
      expect(html).toContain('🔗 Verify');
      expect(html).toContain('🧾 Export');
      expect(html).toContain('🏷 Tag');
      expect(html).toContain('📄 Artifact');
      expect(html).toContain('🛡 Sealed');
      // Metric numbers are still in the DOM (tucked behind <details>).
      expect(html).toContain('<strong>Sources:</strong>');
      // The collapsed card drops the verbose "Audit passed" box + the odd
      // disabled "Start Why ✓" button — verdict pill + seal carry that now.
      expect(html).not.toContain('Audit passed');
      expect(html).not.toContain('Start Why');
    });

    it('renders the artifact panel on a COLLAPSED card when 📄 Artifact is toggled open (regression)', () => {
      // Pre-fix the collapsed card dropped renderPrCascade (which held the
      // artifact panel) for its compact control row, so 📄 Artifact set
      // artifactOpen but the doc never pulled down. The shared renderArtifactPanel
      // helper now renders on the collapsed card too.
      const html = renderOkrDetailView({
        okr: sampleCard({ actions: [doneWhy()] }),
        affectedBars: [],
        phaseSignals: { why: {
          prNumber: 235, prUrl: 'https://example.test/pull/235', prState: 'merged',
          chainRoot: 'c80528dfb3df7d32', sealed: true,
          artifactOpen: true, artifactPath: 'research-doc.md',
          artifactContent: '# Research Doc\n\nKey findings here.',
        } },
      });
      expect(html).toContain('okr-action-collapsed');     // still the compact card
      expect(html).toContain('okr-md-panel');             // the artifact panel rendered
      expect(html).toContain('research-doc.md');          // with its path
      expect(html).toContain('Research Doc');             // and the rendered markdown body
    });

    it('keeps a complete-but-UNSEALED phase expanded (seal gates the collapse)', () => {
      const html = renderOkrDetailView({
        okr: sampleCard({ actions: [doneWhy({ runId: 'WHY-unsealed', hatterChainRoot: undefined })] }),
        affectedBars: [],
      });
      expect(html).not.toContain('okr-action-collapsed');
      expect(html).toContain('Start Why');                    // expanded footer present
    });

    it('keeps an in-flight phase expanded (only done + sealed collapses)', () => {
      const html = renderOkrDetailView({
        okr: sampleCard({ actions: [doneWhy({ runId: 'WHY-running', status: 'in_progress', completedAt: null, hatterChainRoot: undefined })] }),
        affectedBars: [],
      });
      expect(html).not.toContain('okr-action-collapsed');
    });

    it('ships CSS for the collapsed card, status dots, top-aligned row, header rows + fan-out visuals', () => {
      const css = getOkrDetailStyles();
      expect(css).toContain('.okr-action-collapsed');
      expect(css).toContain('.okr-phase-dots');
      expect(css).toContain('.okr-dot-ok');
      expect(css).toContain('.okr-dot-warn');
      expect(css).toContain('align-items: flex-start');
      expect(css).toContain('.okr-collapsed-header');
      expect(css).toContain('.okr-fanout-summary');
      expect(css).toContain('.okr-fanout-entry-ready');
    });
  });

  // ── 2026-06-13 — fan-out pre-flight visuals: readiness summary + per-repo
  //    check lights (derived from decision.status + governance) + ready ring ──
  describe('fan-out pre-flight visuals', () => {
    const whatDone = {
      id: 'ACT-3', phase: 'what' as const, description: 'Code design', agent: 'code-design-agent',
      runId: 'WHAT-test', intentThreadUuid: '7f3e9c2d-1111-4222-8333-444444444444',
      parentIntentThread: null, reviewerScores: { architect: 95, security: 92 }, rounds: 1,
      governanceTier: 'supervised' as const, status: 'complete' as const, createdAt: '2026-05-19T14:00:00Z',
    };
    const withRepo = () => sampleCard({
      actions: [whatDone],
      objectiveAlignment: {
        ...sampleCard().objectiveAlignment,
        affectedBarIds: ['APP-IMDB-001'],
        targetCodeRepos: ['https://github.com/acme/movie-api'],
        targetCodeRepoStatus: { 'https://github.com/acme/movie-api': 'connected' },
      },
    });

    it('a ready row gets the summary, all-green check dots, and a spotlight ring', () => {
      const html = renderOkrDetailView({
        okr: withRepo(), affectedBars: [],
        fanOutPreflight: { report: {
          ok: true, okrId: withRepo().meta.id, readyRepos: ['acme/movie-api'], waves: [['acme/movie-api']],
          entries: [{ slug: 'acme/movie-api', status: 'connected',
            decision: { status: 'ready' },
            coordinationRow: { fanout_wave: 1, coordination_role: 'independent', depends_on: [] } }],
        } },
      });
      expect(html).toContain('okr-fanout-summary');
      expect(html).toContain('1 of 1 ready');
      expect(html).toContain('okr-fanout-entry-ready');   // spotlight ring
      expect(html).toContain('okr-phase-dots');            // reused status lights
      expect(html).toContain('Harness');
      expect(html).toContain('Permissions');
      expect(html).toContain('Upstream');
      expect(html).not.toContain('okr-dot-fail');          // ready ⇒ no red checks
    });

    it('a blocked row reds exactly the failing check and drops the ready ring', () => {
      const html = renderOkrDetailView({
        okr: withRepo(), affectedBars: [],
        fanOutPreflight: { report: {
          ok: true, okrId: withRepo().meta.id, readyRepos: [], waves: [['acme/movie-api']],
          entries: [{ slug: 'acme/movie-api', status: 'connected',
            decision: { status: 'harness-missing', reason: 'Implementation harness missing.' },
            coordinationRow: { fanout_wave: 1, coordination_role: 'independent', depends_on: [] } }],
        } },
      });
      expect(html).toContain('0 of 1 ready');
      expect(html).toContain('okr-dot-fail');              // Harness check red
      expect(html).not.toContain('okr-fanout-entry-ready');
    });

    it('an open impl PR row offers Approve-and-run + Merge (Scorecard parity)', () => {
      const html = renderOkrDetailView({
        okr: withRepo(), affectedBars: [],
        fanOutPreflight: { report: {
          ok: true, okrId: withRepo().meta.id, readyRepos: [], waves: [['acme/movie-api']],
          entries: [{ slug: 'acme/movie-api', status: 'connected',
            decision: { status: 'pr-opened' },
            coordinationRow: { fanout_wave: 1, coordination_role: 'independent', depends_on: [] },
            implPrUrl: 'https://github.com/acme/movie-api/pull/24', implPrNumber: 24,
            implPrIsDraft: false, workflowsAwaitingApproval: 1 }],
        } },
      });
      expect(html).toContain('data-action="fanout-approve-runs"');
      expect(html).toContain('Approve and run');
      expect(html).toContain('data-action="fanout-merge-pr"');
      expect(html).toContain('Merge impl PR');
      // PR is ready (draft=false) → no stale "Mark PR ready"
      expect(html).not.toContain('Mark PR ready');
    });

    it('a fully-merged fan-out reads as complete + shows impl-chain governance, drops the dead Fan out button', () => {
      const html = renderOkrDetailView({
        okr: withRepo(), affectedBars: [],
        fanOutPreflight: { report: {
          ok: true, okrId: withRepo().meta.id, readyRepos: [], waves: [['acme/movie-api']],
          entries: [{ slug: 'acme/movie-api', status: 'connected',
            decision: { status: 'pr-merged' },
            coordinationRow: { fanout_wave: 1, coordination_role: 'independent', depends_on: [] },
            implPrUrl: 'https://github.com/acme/movie-api/pull/24', implPrNumber: 24,
            implPrIsDraft: false, implementationRunId: 'IMPL-2026-06-13-acme-movie-api-x1' }],
        } },
      });
      // #1 done-state
      expect(html).toContain('Fan-out complete');
      expect(html).toContain('1 of 1 merged');
      expect(html).not.toContain('Fan out — no rows ready');   // dead execute button gone
      expect(html).toContain('Undo fan-out');                  // reset de-emphasized
      // #2 merged-row governance
      expect(html).toContain('🛡 impl chain');
      expect(html).toContain('IMPL-2026-06-13-acme-movie-api-x1');
      expect(html).toContain('merged ↗');
    });

    it('hides Undo fan-out once the OKR has shipped (no inconsistent-undo footgun)', () => {
      const shipped = sampleCard({
        meta: { ...sampleCard().meta, status: 'shipped' },
        actions: [whatDone],
        objectiveAlignment: {
          ...sampleCard().objectiveAlignment,
          affectedBarIds: ['APP-IMDB-001'],
          targetCodeRepos: ['https://github.com/acme/movie-api'],
          targetCodeRepoStatus: { 'https://github.com/acme/movie-api': 'connected' },
        },
      });
      const html = renderOkrDetailView({
        okr: shipped, affectedBars: [],
        fanOutPreflight: { report: {
          ok: true, okrId: shipped.meta.id, readyRepos: [], waves: [['acme/movie-api']],
          entries: [{ slug: 'acme/movie-api', status: 'connected',
            decision: { status: 'pr-merged' },
            coordinationRow: { fanout_wave: 1, coordination_role: 'independent', depends_on: [] },
            implPrUrl: 'https://github.com/acme/movie-api/pull/24', implPrNumber: 24,
            implPrIsDraft: false, implementationRunId: 'IMPL-2026-06-13-acme-movie-api-x1' }],
        } },
      });
      expect(html).toContain('Fan-out complete');   // done-state intact
      expect(html).toContain('Re-check');           // Re-check stays (harmless re-poll)
      expect(html).not.toContain('Undo fan-out');   // undo suppressed on shipped
      expect(html).not.toContain('Reset fan-out');  // and no danger reset either
    });
  });
});
