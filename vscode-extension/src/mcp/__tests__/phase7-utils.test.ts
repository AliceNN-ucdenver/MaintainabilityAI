/**
 * Phase 7 utility tests — consensus, score decay, audit logger.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveConsensus } from '../utils/consensus';
import { computeDecayedScore, computeDecayedPillarScores, DEFAULT_DECAY_CONFIG } from '../utils/score-decay';
import { createAuditEntry, appendAuditLog, readAuditLog, computeScoreDelta, generateCorrelationId } from '../utils/audit-logger';
import type { ReviewVerdict, GovernanceTimestamps } from '../../types/redqueen';

// ============================================================================
// Helpers
// ============================================================================

function makeVerdict(overrides: Partial<ReviewVerdict> = {}): ReviewVerdict {
  return {
    reviewer: 'claude-security',
    agent: 'claude',
    scope: 'security',
    verdict: 'approve',
    confidence: 90,
    findings: [],
    caveats: [],
    summary: 'All clear.',
    ...overrides,
  };
}

// Reference date shared by all decay tests — must match the `now` in the describe block
const DECAY_REF = new Date('2026-03-08T00:00:00Z');

function makeTimestamps(daysAgo: number): GovernanceTimestamps {
  const d = new Date(DECAY_REF);
  d.setDate(d.getDate() - daysAgo);
  return {
    lastAssessment: d.toISOString(),
    lastReview: null,
    lastScaffold: null,
  };
}

// ============================================================================
// Consensus Resolution
// ============================================================================

describe('resolveConsensus', () => {
  it('returns approve for empty verdicts', () => {
    const result = resolveConsensus([]);
    expect(result.finalVerdict).toBe('approve');
    expect(result.requiresHumanReview).toBe(false);
  });

  it('returns approve when all verdicts approve', () => {
    const verdicts = [
      makeVerdict({ reviewer: 'claude-security' }),
      makeVerdict({ reviewer: 'claude-architecture', scope: 'architecture' }),
    ];
    const result = resolveConsensus(verdicts);
    expect(result.finalVerdict).toBe('approve');
    expect(result.reasoning).toContain('All reviewers approved');
  });

  it('returns deny when any verdict denies (any-flag-escalates)', () => {
    const verdicts = [
      makeVerdict({ verdict: 'approve' }),
      makeVerdict({ reviewer: 'copilot-security', agent: 'copilot', verdict: 'deny' }),
    ];
    const result = resolveConsensus(verdicts, 'any-flag-escalates');
    expect(result.finalVerdict).toBe('deny');
    expect(result.requiresHumanReview).toBe(true);
  });

  it('returns request-changes when any verdict requests changes', () => {
    const verdicts = [
      makeVerdict({ verdict: 'approve' }),
      makeVerdict({ reviewer: 'claude-architecture', verdict: 'request-changes' }),
    ];
    const result = resolveConsensus(verdicts);
    expect(result.finalVerdict).toBe('request-changes');
  });

  it('deny overrides request-changes in any-flag-escalates', () => {
    const verdicts = [
      makeVerdict({ verdict: 'request-changes' }),
      makeVerdict({ reviewer: 'copilot-security', verdict: 'deny' }),
    ];
    const result = resolveConsensus(verdicts);
    expect(result.finalVerdict).toBe('deny');
  });

  it('unanimous rule requires all approve', () => {
    const verdicts = [
      makeVerdict({ verdict: 'approve' }),
      makeVerdict({ reviewer: 'copilot-security', verdict: 'request-changes' }),
    ];
    const result = resolveConsensus(verdicts, 'unanimous');
    expect(result.finalVerdict).toBe('request-changes');
    expect(result.reasoning[0]).toMatch(/Not unanimous/);
  });

  it('unanimous rule approves when all approve', () => {
    const verdicts = [
      makeVerdict({ verdict: 'approve' }),
      makeVerdict({ reviewer: 'copilot-security', verdict: 'approve' }),
    ];
    const result = resolveConsensus(verdicts, 'unanimous');
    expect(result.finalVerdict).toBe('approve');
  });

  it('majority rule approves with >50%', () => {
    const verdicts = [
      makeVerdict({ verdict: 'approve' }),
      makeVerdict({ reviewer: 'b', verdict: 'approve' }),
      makeVerdict({ reviewer: 'c', verdict: 'deny' }),
    ];
    const result = resolveConsensus(verdicts, 'majority');
    expect(result.finalVerdict).toBe('approve');
    expect(result.reasoning[0]).toMatch(/Majority approved.*2\/3/);
  });

  it('majority rule denies without majority', () => {
    const verdicts = [
      makeVerdict({ verdict: 'approve' }),
      makeVerdict({ reviewer: 'b', verdict: 'deny' }),
      makeVerdict({ reviewer: 'c', verdict: 'deny' }),
    ];
    const result = resolveConsensus(verdicts, 'majority');
    expect(result.finalVerdict).toBe('deny');
  });

  it('merges findings by id with highest severity', () => {
    const verdicts = [
      makeVerdict({
        findings: [
          { id: 'F1', category: 'security', severity: 'medium', title: 'T', description: 'D', recommendation: 'R' },
        ],
      }),
      makeVerdict({
        reviewer: 'copilot-security',
        findings: [
          { id: 'F1', category: 'security', severity: 'high', title: 'T2', description: 'D2', recommendation: 'R2' },
          { id: 'F2', category: 'architecture', severity: 'low', title: 'T3', description: 'D3', recommendation: 'R3' },
        ],
      }),
    ];
    const result = resolveConsensus(verdicts);
    expect(result.mergedFindings).toHaveLength(2);
    expect(result.mergedFindings[0].id).toBe('F1');
    expect(result.mergedFindings[0].severity).toBe('high'); // promoted from medium
    expect(result.highestSeverity).toBe('high');
  });

  it('deduplicates caveats', () => {
    const verdicts = [
      makeVerdict({ caveats: ['caveat-a', 'caveat-b'] }),
      makeVerdict({ reviewer: 'b', caveats: ['caveat-b', 'caveat-c'] }),
    ];
    const result = resolveConsensus(verdicts);
    expect(result.mergedCaveats).toEqual(['caveat-a', 'caveat-b', 'caveat-c']);
  });

  it('requires human review for critical findings', () => {
    const verdicts = [
      makeVerdict({
        findings: [
          { id: 'F1', category: 'security', severity: 'critical', title: 'CVE', description: 'D', recommendation: 'R' },
        ],
      }),
    ];
    const result = resolveConsensus(verdicts);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.highestSeverity).toBe('critical');
  });
});

// ============================================================================
// Score Decay
// ============================================================================

describe('computeDecayedScore', () => {
  const now = new Date('2026-03-08T00:00:00Z');

  it('returns raw score within grace window', () => {
    const result = computeDecayedScore(80, makeTimestamps(5), now);
    expect(result.decayedScore).toBe(80);
    expect(result.inGraceWindow).toBe(true);
    expect(result.decayApplied).toBe(false);
    expect(result.decayFactor).toBe(1.0);
  });

  it('returns raw score at exactly grace window boundary', () => {
    const result = computeDecayedScore(80, makeTimestamps(14), now);
    expect(result.decayedScore).toBe(80);
    expect(result.inGraceWindow).toBe(true);
  });

  it('applies exponential decay after grace window', () => {
    // 30 days ago, grace=14d → 16 days past grace
    const result = computeDecayedScore(80, makeTimestamps(30), now);
    expect(result.decayApplied).toBe(true);
    expect(result.decayedScore).toBeLessThan(80);
    expect(result.decayedScore).toBeGreaterThan(0);
    expect(result.decayFactor).toBeLessThan(1.0);
  });

  it('decays to ~50% at exact half-life', () => {
    // halfLife=90d + grace=14d = 104 days ago
    const result = computeDecayedScore(100, makeTimestamps(104), now);
    // At exactly half-life: factor = 0.5, decayed = 50
    expect(result.decayedScore).toBe(50);
    expect(result.decayFactor).toBeCloseTo(0.5, 1);
  });

  it('never goes below minScore', () => {
    // Very far in the past
    const result = computeDecayedScore(80, makeTimestamps(1000), now);
    expect(result.decayedScore).toBe(0); // minScore = 0
  });

  it('respects custom config', () => {
    const config = { halfLifeDays: 30, minScore: 20, graceWindowDays: 7 };
    // 37 days ago → 30 days past grace → ~half-life → ~50%
    const result = computeDecayedScore(100, makeTimestamps(37), now, config);
    // Allow ±1 rounding due to time-of-day offset in makeTimestamps
    expect(result.decayedScore).toBeGreaterThanOrEqual(49);
    expect(result.decayedScore).toBeLessThanOrEqual(51);
  });

  it('respects custom minScore', () => {
    const config = { halfLifeDays: 30, minScore: 25, graceWindowDays: 7 };
    const result = computeDecayedScore(30, makeTimestamps(500), now, config);
    expect(result.decayedScore).toBe(25);
  });

  it('handles 0 days since assessment', () => {
    const result = computeDecayedScore(80, makeTimestamps(0), now);
    expect(result.decayedScore).toBe(80);
    expect(result.daysSinceAssessment).toBeCloseTo(0, 0);
  });
});

describe('computeDecayedPillarScores', () => {
  const now = new Date('2026-03-08T00:00:00Z');

  it('applies decay to all pillars', () => {
    const pillars = { architecture: 80, security: 60, informationRisk: 70, operations: 90 };
    const result = computeDecayedPillarScores(pillars, makeTimestamps(50), now);
    expect(result.architecture.decayApplied).toBe(true);
    expect(result.security.decayApplied).toBe(true);
    expect(result.informationRisk.decayApplied).toBe(true);
    expect(result.operations.decayApplied).toBe(true);
    // Security has lowest raw score, should have lowest decayed score
    expect(result.security.decayedScore).toBeLessThan(result.operations.decayedScore);
  });

  it('returns raw scores within grace window', () => {
    const pillars = { architecture: 80, security: 60, informationRisk: 70, operations: 90 };
    const result = computeDecayedPillarScores(pillars, makeTimestamps(5), now);
    expect(result.architecture.decayedScore).toBe(80);
    expect(result.security.decayedScore).toBe(60);
    expect(result.informationRisk.decayedScore).toBe(70);
    expect(result.operations.decayedScore).toBe(90);
  });
});

// ============================================================================
// Audit Logger
// ============================================================================

describe('audit-logger', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-audit-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generateCorrelationId returns a UUID', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('createAuditEntry produces valid entry with timestamp', () => {
    const entry = createAuditEntry('score_snapshot', 'BAR-001', 'Test Bar', { composite: 80 });
    expect(entry.timestamp).toBeTruthy();
    expect(entry.action).toBe('score_snapshot');
    expect(entry.barId).toBe('BAR-001');
    expect(entry.barName).toBe('Test Bar');
    expect(entry.payload.composite).toBe(80);
  });

  it('createAuditEntry includes correlation fields', () => {
    const entry = createAuditEntry('review_complete', 'BAR-001', 'Test Bar', {}, {
      correlationId: 'abc-123',
      prNumber: 42,
      commitSha: 'deadbeef',
    });
    expect(entry.correlationId).toBe('abc-123');
    expect(entry.prNumber).toBe(42);
    expect(entry.commitSha).toBe('deadbeef');
  });

  it('appendAuditLog and readAuditLog round-trip', () => {
    const entry = createAuditEntry('score_snapshot', 'BAR-001', 'Test Bar', { score: 85 });
    appendAuditLog(tmpDir, entry);

    const entries = readAuditLog(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].barId).toBe('BAR-001');
    expect(entries[0].payload.score).toBe(85);
  });

  it('readAuditLog filters by barId', () => {
    appendAuditLog(tmpDir, createAuditEntry('score_snapshot', 'BAR-001', 'Bar 1', {}));
    appendAuditLog(tmpDir, createAuditEntry('score_snapshot', 'BAR-002', 'Bar 2', {}));
    appendAuditLog(tmpDir, createAuditEntry('review_complete', 'BAR-001', 'Bar 1', {}));

    const entries = readAuditLog(tmpDir, 'BAR-001');
    expect(entries).toHaveLength(2);
    expect(entries.every(e => e.barId === 'BAR-001')).toBe(true);
  });

  it('readAuditLog respects limit', () => {
    for (let i = 0; i < 5; i++) {
      appendAuditLog(tmpDir, createAuditEntry('score_snapshot', 'BAR-001', 'Bar', { i }));
    }
    const entries = readAuditLog(tmpDir, undefined, 3);
    expect(entries).toHaveLength(3);
  });

  it('readAuditLog returns empty for missing log', () => {
    const entries = readAuditLog('/nonexistent/path');
    expect(entries).toEqual([]);
  });

  it('readAuditLog returns most recent first', () => {
    appendAuditLog(tmpDir, createAuditEntry('score_snapshot', 'BAR-001', 'Bar', { order: 'first' }));
    appendAuditLog(tmpDir, createAuditEntry('score_snapshot', 'BAR-001', 'Bar', { order: 'second' }));
    const entries = readAuditLog(tmpDir);
    expect(entries[0].payload.order).toBe('second');
    expect(entries[1].payload.order).toBe('first');
  });
});

describe('computeScoreDelta', () => {
  it('computes correct deltas', () => {
    const delta = computeScoreDelta(
      'BAR-001', 'Test Bar',
      { composite: 70, architecture: 65, security: 60, informationRisk: 75, operations: 80 },
      { composite: 80, architecture: 75, security: 70, informationRisk: 80, operations: 85 },
    );
    expect(delta.delta).toBe(10);
    expect(delta.pillarDeltas.architecture).toBe(10);
    expect(delta.pillarDeltas.security).toBe(10);
    expect(delta.pillarDeltas.informationRisk).toBe(5);
    expect(delta.pillarDeltas.operations).toBe(5);
    expect(delta.trigger).toBe('snapshot');
  });

  it('handles negative deltas', () => {
    const delta = computeScoreDelta(
      'BAR-001', 'Test Bar',
      { composite: 80, architecture: 80, security: 80, informationRisk: 80, operations: 80 },
      { composite: 60, architecture: 60, security: 60, informationRisk: 60, operations: 60 },
      'decay',
    );
    expect(delta.delta).toBe(-20);
    expect(delta.trigger).toBe('decay');
  });
});
