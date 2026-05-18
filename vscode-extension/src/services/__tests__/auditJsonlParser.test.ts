/**
 * Tests for the audit-log JSONL parser used by RunStatusTailer.
 * Purely structural — no vscode / fs / network dependencies.
 */
import { describe, it, expect } from 'vitest';
import { parseAuditJsonl, humanizeNodeName } from '../auditJsonlParser';

const SAMPLE_EVENTS = [
  { run_id: 'PRD-2026-05-17-deadbeef', event_id: 1, ts: '2026-05-17T10:00:00Z', node_kind: 'pure', node_name: 'validate_brief', duration_ms: 0, prev_event_hash: null, event_hash: 'a'.repeat(64), pure: { inputs_summary: '...', outputs_summary: 'PrdBrief validated' } },
  { run_id: 'PRD-2026-05-17-deadbeef', event_id: 2, ts: '2026-05-17T10:00:01Z', node_kind: 'pure', node_name: 'gather_mesh_context', duration_ms: 12, prev_event_hash: 'a'.repeat(64), event_hash: 'b'.repeat(64), pure: { inputs_summary: '...', outputs_summary: '...' } },
  { run_id: 'PRD-2026-05-17-deadbeef', event_id: 3, ts: '2026-05-17T10:00:05Z', node_kind: 'llm', node_name: 'synthesize_prd[iter1]', duration_ms: 4200, prev_event_hash: 'b'.repeat(64), event_hash: 'c'.repeat(64), llm: { provider: 'anthropic', model: 'claude-sonnet-4-6', prompt_pack: { path: '...', sha256: 'd'.repeat(64) }, input_tokens: 3000, output_tokens: 1500, cost_usd: 0.0125, guardrails: { mode: 'default', pre: 'PASS', post: 'PASS' } } },
];

function toJsonl(events: object[]): string { return events.map(e => JSON.stringify(e)).join('\n') + '\n'; }

describe('parseAuditJsonl', () => {
  it('returns empty snapshot for empty input', () => {
    const snap = parseAuditJsonl('');
    expect(snap.events).toEqual([]);
    expect(snap.lastEvent).toBeNull();
    expect(snap.isComplete).toBe(false);
    expect(snap.runCompleteOutcome).toBeNull();
    expect(snap.skippedLineCount).toBe(0);
  });

  it('parses well-formed JSONL into ParsedAuditEvent[]', () => {
    const snap = parseAuditJsonl(toJsonl(SAMPLE_EVENTS));
    expect(snap.events).toHaveLength(3);
    expect(snap.events[0].node_name).toBe('validate_brief');
    expect(snap.events[2].node_kind).toBe('llm');
    expect(snap.lastEvent?.node_name).toBe('synthesize_prd[iter1]');
    expect(snap.isComplete).toBe(false);
    expect(snap.skippedLineCount).toBe(0);
  });

  it('detects run_complete and records its outcome', () => {
    const complete = { ...SAMPLE_EVENTS[2], event_id: 4, ts: '2026-05-17T10:00:10Z', node_kind: 'run_complete', node_name: 'verify_and_trigger',
      outcome: { status: 'ok', mesh_sha: 'f'.repeat(40), total_input_tokens: 4000, total_output_tokens: 2000, total_cost_usd: 0.025, artifact_paths: ['p1', 'p2'], chain_root_hash: 'e'.repeat(64) } };
    const snap = parseAuditJsonl(toJsonl([...SAMPLE_EVENTS, complete]));
    expect(snap.isComplete).toBe(true);
    expect(snap.runCompleteOutcome).toBe('ok');
    expect(snap.lastEvent?.node_kind).toBe('run_complete');
  });

  it('tolerates a half-flushed final line (skipped, count tracked)', () => {
    const text = toJsonl(SAMPLE_EVENTS) + '{"run_id":"PRD-XX","event_id":4,'; // truncated
    const snap = parseAuditJsonl(text);
    expect(snap.events).toHaveLength(3);
    expect(snap.lastEvent?.event_id).toBe(3);
    expect(snap.skippedLineCount).toBe(1);
  });

  it('skips blank lines without counting them as malformed', () => {
    const text = `\n\n${JSON.stringify(SAMPLE_EVENTS[0])}\n\n${JSON.stringify(SAMPLE_EVENTS[1])}\n`;
    const snap = parseAuditJsonl(text);
    expect(snap.events).toHaveLength(2);
    expect(snap.skippedLineCount).toBe(0);
  });

  it('skips events missing required fields', () => {
    const missingKind = { event_id: 99, ts: '2026-05-17T10:00:00Z', node_name: 'x', duration_ms: 0 };
    const text = `${JSON.stringify(SAMPLE_EVENTS[0])}\n${JSON.stringify(missingKind)}\n${JSON.stringify(SAMPLE_EVENTS[1])}\n`;
    const snap = parseAuditJsonl(text);
    expect(snap.events).toHaveLength(2);
    expect(snap.skippedLineCount).toBe(1);
  });

  it('captures the iteration_summary kind verbatim', () => {
    const iterSummary = {
      run_id: 'PRD-X', event_id: 10, ts: '2026-05-17T10:01:00Z',
      node_kind: 'iteration_summary', node_name: 'iteration_summary[iter1]',
      duration_ms: 0, prev_event_hash: 'a'.repeat(64), event_hash: 'b'.repeat(64),
      iteration: 1,
      summary: { det_arch: { severity: 'PASS', invalid_citations: 0, coverage_discrepancies: 0 },
                 det_sec:  { severity: 'PASS', invalid_citations: 0, coverage_discrepancies: 0 },
                 llm_arch: { score: 0.92, severity: 'PASS' },
                 llm_sec:  { score: 0.91, severity: 'PASS' },
                 composite_score: 0.91, disagreement_delta: 0.01, verdict: 'PASS', reason: '...' },
    };
    const snap = parseAuditJsonl(toJsonl([iterSummary]));
    expect(snap.events).toHaveLength(1);
    expect(snap.events[0].node_kind).toBe('iteration_summary');
    // Raw record preserved so the UI can drill into per-iteration details
    expect(snap.events[0].raw.iteration).toBe(1);
  });
});

describe('humanizeNodeName', () => {
  it('strips the [iterN] suffix into a readable label', () => {
    expect(humanizeNodeName('synthesize_prd[iter2]')).toBe('synthesize prd (iter 2)');
    expect(humanizeNodeName('architect_expert_review[iter1]')).toBe('architect expert review (iter 1)');
  });
  it('passes plain node names through with underscores replaced', () => {
    expect(humanizeNodeName('generate_prd_manifest')).toBe('generate prd manifest');
    expect(humanizeNodeName('validate_brief')).toBe('validate brief');
  });
});
