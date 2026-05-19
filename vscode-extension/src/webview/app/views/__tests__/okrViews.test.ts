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

  it('renders all three Action cards with disabled Start buttons + Phase B tooltip', () => {
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [] });
    expect(html).toContain('Why · Research');
    expect(html).toContain('How · PRD');
    expect(html).toContain('What · Code Design');
    expect(html).toContain('Start Why');
    expect(html).toContain('Start How');
    expect(html).toContain('Start What');
    // All buttons are disabled with the Phase B tooltip
    const disabledCount = (html.match(/<button[^>]*disabled/g) || []).length;
    expect(disabledCount).toBeGreaterThanOrEqual(3);
    expect(html).toContain('Phase B: requires agent deployment');
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
    expect(html).toContain('escalate BAR');
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

  it('renders target repos as Declared — Not Connected', () => {
    const html = renderOkrDetailView({ okr: sampleCard(), affectedBars: [] });
    expect(html).toContain('&lt;org&gt;/celeb-api');
    expect(html).toContain('Declared — Not Connected');
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
});
