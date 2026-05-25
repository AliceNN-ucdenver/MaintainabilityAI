/**
 * Phase E E3 regression tests for buildAuditReportMarkdown. The
 * exporter is a pure function — input shape in, markdown out.
 * These tests fix the contract so a future refactor that breaks
 * the section structure or misrenders the signed/unsigned split
 * surfaces immediately.
 */
import { describe, it, expect } from 'vitest';
import { buildAuditReportMarkdown, type AuditReportInput, type ChainVerifyVerdictLite } from '../AuditReportExporter';

function makeVerdict(over: Partial<ChainVerifyVerdictLite> = {}): ChainVerifyVerdictLite {
  return {
    seal: { sealed: true },
    totalEvents: 0,
    malformedLines: 0,
    unsignedAgentEvents: 0,
    signedWorkflowEvents: 0,
    originKindMismatches: 0,
    firstFailure: null,
    shapeOk: true,
    ...over,
  };
}

function makeInput(over: Partial<AuditReportInput> = {}): AuditReportInput {
  return {
    okrId: 'OKR-2026Q2-IMDB-001-celeb-api',
    runId: 'WHAT-2026-05-25-1d8h04',
    phase: 'what',
    actionId: 'ACT-3',
    agent: 'code-design-agent',
    intentThreadUuid: 'acaf252e-103d-43fe-b0fe-fd254e099715',
    parentIntentThread: 'acaf252e-103d-43fe-b0fe-fd254e099715',
    governanceTier: 'supervised',
    status: 'complete',
    createdAt: '2026-05-25T15:23:07.397Z',
    completedAt: '2026-05-25T15:29:56Z',
    hatterChainRoot: '5568ee75fe50bf266c35f9a0bec68790702ff30facefcac06ff73adeefbb3756',
    prUrl: 'https://github.com/x/y/pull/154',
    artifactPath: 'okrs/OKR-2026Q2-IMDB-001-celeb-api/what/code-design.md',
    chainLines: [],
    chainLadderText: null,
    verdict: makeVerdict(),
    ...over,
  };
}

describe('buildAuditReportMarkdown', () => {
  it('produces all required H1/H2 sections', () => {
    const md = buildAuditReportMarkdown(makeInput());
    expect(md).toMatch(/^# Audit report — OKR-2026Q2-IMDB-001-celeb-api/);
    expect(md).toContain('## Run identity');
    expect(md).toContain('## Trust posture');
    expect(md).toContain('## Evidence — skill calls');
    expect(md).toContain('## Self-review trail');
    expect(md).toContain('## Workflow facts');
    expect(md).toContain('## Verifier notes');
  });

  it('renders the run-identity table with all expected fields', () => {
    const md = buildAuditReportMarkdown(makeInput());
    expect(md).toContain('| OKR | `OKR-2026Q2-IMDB-001-celeb-api` |');
    expect(md).toContain('| Phase | `what` |');
    expect(md).toContain('| Run ID | `WHAT-2026-05-25-1d8h04` |');
    expect(md).toContain('| Tier | supervised |');
    expect(md).toContain('| Status | complete |');
    expect(md).toContain('| Intent thread | `acaf252e-103d-43fe-b0fe-fd254e099715` |');
    expect(md).toContain('| Hatter chain root | `5568ee75fe50bf266c35f9a0bec68790…` |');
  });

  it('renders sealed verdict + green check when shapeOk + sealed', () => {
    const md = buildAuditReportMarkdown(makeInput({
      verdict: makeVerdict({ seal: { sealed: true }, shapeOk: true, totalEvents: 28 }),
    }));
    expect(md).toContain('🛡 **Sealed**');
    expect(md).toContain('✅ All shape checks pass');
  });

  it('renders tampered verdict + first-failure block when shape failed', () => {
    const md = buildAuditReportMarkdown(makeInput({
      verdict: makeVerdict({
        seal: { sealed: false, sealTampered: true },
        shapeOk: false,
        totalEvents: 12,
        unsignedAgentEvents: 1,
        firstFailure: { line: 7, kind: 'self_review', reason: 'unsigned-agent-event' },
      }),
    }));
    expect(md).toContain('⚠ **Tampered**');
    expect(md).toContain('Shape check failed at event line 7');
    expect(md).toContain('`self_review`');
    expect(md).toContain('**unsigned-agent-event**');
  });

  it('aggregates skill_call events into the evidence table', () => {
    const md = buildAuditReportMarkdown(makeInput({
      chainLines: [
        JSON.stringify({ event_kind: 'skill_call', signature: 'sig', signer_epoch: 1, payload: { skill: 'knowledge-code', ok: true, emitted_by: 'runtime' } }),
        JSON.stringify({ event_kind: 'skill_call', signature: 'sig', signer_epoch: 1, payload: { skill: 'knowledge-code', ok: true, emitted_by: 'runtime' } }),
        JSON.stringify({ event_kind: 'skill_call', signature: 'sig', signer_epoch: 1, payload: { skill: 'knowledge-okr', ok: true, emitted_by: 'runtime' } }),
        JSON.stringify({ event_kind: 'skill_call', signature: 'sig', signer_epoch: 1, payload: { skill: 'knowledge-okr', ok: false, emitted_by: 'runtime' } }),
      ],
    }));
    expect(md).toContain('| `knowledge-code` | 2 | 0 |');
    expect(md).toContain('| `knowledge-okr` | 2 | 1 |');
  });

  it('shows self-review trail per persona with round-by-round scores', () => {
    const md = buildAuditReportMarkdown(makeInput({
      chainLines: [
        JSON.stringify({ event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-architect', round: 1, score: 0.85, severity: 'MINOR', emitted_by: 'agent' } }),
        JSON.stringify({ event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-architect', round: 2, score: 0.96, severity: 'PASS', emitted_by: 'agent' } }),
        JSON.stringify({ event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-security', round: 1, score: 0.89, severity: 'MINOR', emitted_by: 'agent' } }),
        JSON.stringify({ event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-security', round: 2, score: 0.95, severity: 'PASS', emitted_by: 'agent' } }),
      ],
    }));
    expect(md).toContain('**code-architect**');
    expect(md).toContain('final: 0.96 (PASS)');
    expect(md).toContain('r1: 0.85 (MINOR) → r2: 0.96 (PASS)');
    expect(md).toContain('**code-security**');
    expect(md).toContain('final: 0.95 (PASS)');
  });

  it('ignores unsigned self_review events (Bug W legitimacy gate)', () => {
    const md = buildAuditReportMarkdown(makeInput({
      chainLines: [
        // Signed legitimate — should count.
        JSON.stringify({ event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'architect', round: 1, score: 0.90, severity: 'PASS', emitted_by: 'agent' } }),
        // Unsigned forgery — must NOT appear.
        JSON.stringify({ event_kind: 'self_review', payload: { persona: 'security', round: 1, score: 0.10, severity: 'CRITICAL', emitted_by: 'agent' } }),
      ],
    }));
    expect(md).toContain('**architect**');
    expect(md).toContain('final: 0.90 (PASS)');
    expect(md).not.toContain('**security**');
    expect(md).not.toContain('CRITICAL');
  });

  it('renders artifact_written + state_transition workflow facts', () => {
    const md = buildAuditReportMarkdown(makeInput({
      chainLines: [
        JSON.stringify({ event_kind: 'artifact_written', payload: { emitted_by: 'workflow', path: 'okrs/X/what/code-design.md', sha256: 'a'.repeat(64), bytes: 12345, merge_commit_sha: 'b'.repeat(40) } }),
        JSON.stringify({ event_kind: 'state_transition', payload: { emitted_by: 'workflow', from: 'design-pending', to: 'building', pr_number: 154, merge_commit_sha: 'c'.repeat(40) } }),
      ],
    }));
    expect(md).toContain('**artifact_written**');
    expect(md).toContain('`okrs/X/what/code-design.md`');
    expect(md).toContain('12345 bytes');
    expect(md).toContain('**state_transition**');
    expect(md).toContain('`design-pending` → `building`');
    expect(md).toContain('PR #154');
  });

  it('includes chain-ladder block when provided', () => {
    const md = buildAuditReportMarkdown(makeInput({
      chainLadderText: 'chain:\n  - phase: why\n    runId: WHY-2026-05-25-x',
    }));
    expect(md).toContain('## Cross-phase ladder');
    expect(md).toContain('chain:');
    expect(md).toContain('runId: WHY-2026-05-25-x');
  });

  it('omits chain-ladder block when not provided', () => {
    const md = buildAuditReportMarkdown(makeInput({ chainLadderText: null }));
    expect(md).not.toContain('Cross-phase ladder');
  });

  it('includes runner CLI fallback for cryptographic gold', () => {
    const md = buildAuditReportMarkdown(makeInput());
    expect(md).toContain('npx @maintainabilityai/research-runner audit-verify-chain');
    expect(md).toContain('--okrId OKR-2026Q2-IMDB-001-celeb-api');
    expect(md).toContain('--runId WHAT-2026-05-25-1d8h04');
  });
});
