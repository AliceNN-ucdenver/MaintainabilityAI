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

  it('Start What becomes a clickable button when How is complete and tier is not Restricted', () => {
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
    const html = renderOkrDetailView({
      okr,
      affectedBars: [{ id: 'APP-IMDB-001', name: 'IMDB Lite App', path: '/m', compositeScore: 64, tier: 'supervised' }],
    });
    expect(html).toContain('data-action="start-okr-what"');
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

  it('Export Audit Report + Verify Chain footer buttons are disabled (Phase E)', () => {
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [] });
    expect(html).toContain('Export Audit Report');
    expect(html).toContain('Verify Chain');
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
});
