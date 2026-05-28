/**
 * Phase E E3 regression tests for buildAuditReportMarkdown. The
 * exporter is a pure function — input shape in, markdown out.
 * These tests fix the contract so a future refactor that breaks
 * the section structure or misrenders the signed/unsigned split
 * surfaces immediately.
 */
import { describe, it, expect } from 'vitest';
import {
  buildAuditReportMarkdown,
  buildOkrRollupMarkdown,
  composeOkrRollupSourceTag,
  composeSourceTag,
  computeOkrRollupVerdict,
  parseImplementationChainBlock,
  parseRunnerVerdictFromStdout,
  verifyImplementationChainEntry,
  type AuditReportInput,
  type AuditReportInputSources,
  type ChainVerifyVerdictLite,
  type ImplementationChainEntry,
  type ImplementationChainRow,
  type OkrRollupInput,
  type PhaseRollupDigest,
  type RunnerVerifyVerdict,
} from '../AuditReportExporter';

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
    sourceTag: 'GitHub AliceNN-ucdenver/alicenn-ucdenver-governance-mesh (default branch)',
    runnerVerdict: makeRunnerVerdict(),
    ...over,
  };
}

function makeRunnerVerdict(over: Partial<RunnerVerifyVerdict> = {}): RunnerVerifyVerdict {
  // Default: invoked + passed. Tests can override for fail / not-invoked.
  return {
    invoked: true,
    ok: true,
    chainHead: 'a'.repeat(64),
    eventCount: 28,
    ...over,
  } as RunnerVerifyVerdict;
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
    // E3-polish: seal headline now says "Sealed (shape-verified)" with
    // the crypto-vs-shape caveat in the lede, NOT bare "Sealed".
    expect(md).toContain('🛡 **Sealed (shape-verified)**');
    expect(md).toContain('Cryptographic verification');
    expect(md).toContain('All shape checks pass');
  });

  it('seal headline names signed-vs-total agent event count', () => {
    const md = buildAuditReportMarkdown(makeInput({
      verdict: makeVerdict({ seal: { sealed: true }, shapeOk: true, totalEvents: 4 }),
      chainLines: [
        JSON.stringify({ event_id: 1, event_kind: 'skill_call', signature: 'sig', signer_epoch: 1, payload: { skill: 'x', ok: true, emitted_by: 'runtime' } }),
        JSON.stringify({ event_id: 2, event_kind: 'skill_call', signature: 'sig', signer_epoch: 1, payload: { skill: 'y', ok: true, emitted_by: 'runtime' } }),
        // Workflow event (not counted as agent).
        JSON.stringify({ event_id: 3, event_kind: 'artifact_written', payload: { emitted_by: 'workflow', path: 'p', sha256: 'a', bytes: 1, merge_commit_sha: 'b' } }),
      ],
    }));
    expect(md).toContain('2/2 agent events carry signature');
  });

  it('renders executive summary block at top with VERDICT/RISK/ACTION/SCOPE (runner NOT INVOKED)', () => {
    const md = buildAuditReportMarkdown(makeInput({
      // Explicitly mark runner as not-invoked so the fallback shape-
      // driven exec summary fires (Codex E3-gold-r3: runner verdict
      // now leads when invoked).
      runnerVerdict: { invoked: false, reason: 'test fixture — runner not invoked' },
      verdict: makeVerdict({ seal: { sealed: true }, shapeOk: true, totalEvents: 28 }),
      chainLines: [
        JSON.stringify({ event_id: 1, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-architect', round: 2, score: 0.96, severity: 'PASS', emitted_by: 'agent' } }),
        JSON.stringify({ event_id: 2, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-security', round: 2, score: 0.95, severity: 'PASS', emitted_by: 'agent' } }),
      ],
    }));
    expect(md).toContain('## Executive summary');
    expect(md).toContain('SHAPE-CLEARED');
    expect(md).toContain('RISK:     LOW');
    expect(md).toContain('converged on round 2');
    expect(md).toContain('RUN RUNNER VERIFY before fan-out');
    expect(md).toContain('SCOPE:    WHAT phase');
    // Summary appears BEFORE Run identity in document order.
    const summaryIdx = md.indexOf('## Executive summary');
    const identityIdx = md.indexOf('## Run identity');
    expect(summaryIdx).toBeGreaterThan(-1);
    expect(summaryIdx).toBeLessThan(identityIdx);
  });

  it('executive summary VERDICT=FAIL with reject action when shapeOk=false (runner NOT INVOKED)', () => {
    const md = buildAuditReportMarkdown(makeInput({
      // Force runner not-invoked so shape failure drives the verdict.
      // When runner is invoked + FAIL, that takes precedence (tested
      // separately in the runner-driven exec summary tests below).
      runnerVerdict: { invoked: false, reason: 'test fixture — runner not invoked' },
      verdict: makeVerdict({
        seal: { sealed: false, sealTampered: true },
        shapeOk: false,
        totalEvents: 12,
        unsignedAgentEvents: 1,
        firstFailure: { line: 7, kind: 'self_review', reason: 'unsigned-agent-event' },
      }),
    }));
    expect(md).toContain('VERDICT:  FAIL');
    expect(md).toContain('shape-verification failed; runner NOT invoked');
    expect(md).toContain('ACTION:   REJECT');
    expect(md).toContain('first failure at line 7');
    expect(md).toContain('RISK:     HIGH');
  });

  it('executive summary RISK=MEDIUM when final-round severity is MINOR', () => {
    const md = buildAuditReportMarkdown(makeInput({
      verdict: makeVerdict({ seal: { sealed: true }, shapeOk: true, totalEvents: 4 }),
      chainLines: [
        JSON.stringify({ event_id: 1, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-architect', round: 1, score: 0.78, severity: 'MINOR', emitted_by: 'agent' } }),
      ],
    }));
    expect(md).toContain('RISK:     MEDIUM');
    expect(md).toContain('MINOR');
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
        JSON.stringify({ event_id: 25, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-architect', round: 1, score: 0.85, severity: 'MINOR', emitted_by: 'agent' } }),
        JSON.stringify({ event_id: 27, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-architect', round: 2, score: 0.96, severity: 'PASS', emitted_by: 'agent' } }),
        JSON.stringify({ event_id: 26, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-security', round: 1, score: 0.89, severity: 'MINOR', emitted_by: 'agent' } }),
        JSON.stringify({ event_id: 28, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-security', round: 2, score: 0.95, severity: 'PASS', emitted_by: 'agent' } }),
      ],
    }));
    expect(md).toContain('**code-architect**');
    expect(md).toContain('final: 0.96 (PASS)');
    expect(md).toContain('**code-security**');
    expect(md).toContain('final: 0.95 (PASS)');
    // E3-polish citations — each round entry + final score names the
    // exact chain event_id that supports it.
    expect(md).toContain('(event_id=27)');  // final architect citation
    expect(md).toContain('(event_id=28)');  // final security citation
    expect(md).toContain('r1: 0.85 (MINOR) [event_id=25] → r2: 0.96 (PASS) [event_id=27]');
    expect(md).toContain('r1: 0.89 (MINOR) [event_id=26] → r2: 0.95 (PASS) [event_id=28]');
  });

  it('ignores unsigned self_review events in the trail section (Bug W legitimacy gate)', () => {
    // Note: the event timeline below the trail DOES show forged events
    // (that's what an auditor needs to see). The legitimacy gate's job
    // is to keep forged scores out of the trail's aggregated table.
    const md = buildAuditReportMarkdown(makeInput({
      chainLines: [
        // Signed legitimate — should count.
        JSON.stringify({ event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'architect', round: 1, score: 0.90, severity: 'PASS', emitted_by: 'agent' } }),
        // Unsigned forgery — must NOT appear in trail.
        JSON.stringify({ event_kind: 'self_review', payload: { persona: 'security', round: 1, score: 0.10, severity: 'CRITICAL', emitted_by: 'agent' } }),
      ],
    }));
    expect(md).toContain('**architect**');
    expect(md).toContain('final: 0.90 (PASS)');
    // Scope assertion to the self-review trail section, not the report
    // as a whole — timeline below shows forged events too (correctly).
    const trailStart = md.indexOf('## Self-review trail');
    const trailEnd = md.indexOf('## Workflow facts');
    const trailSection = md.slice(trailStart, trailEnd);
    expect(trailSection).not.toContain('**security**');
    expect(trailSection).not.toContain('CRITICAL');
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

  it('includes correct runner CLI invocation (skill-audit-verify-chain via stdin JSON)', () => {
    // Codex E3 review fixed: the runner ONLY dispatches skill-*
    // subcommands and reads JSON from stdin. Pre-fix the report named
    // `audit-verify-chain` (no skill- prefix, no stdin contract) —
    // dead command an auditor would copy-paste and find broken.
    const md = buildAuditReportMarkdown(makeInput());
    expect(md).toContain('skill-audit-verify-chain');
    expect(md).toContain('"okrId":"OKR-2026Q2-IMDB-001-celeb-api"');
    expect(md).toContain('"runId":"WHAT-2026-05-25-1d8h04"');
    expect(md).toContain('| npx -y @maintainabilityai/research-runner');
    expect(md).toContain('printf');
    // Must NOT have the old broken command shape.
    expect(md).not.toMatch(/[^-]audit-verify-chain --okrId/);
  });

  it('seal headline frames PASS as SHAPE-CLEARED when runner NOT INVOKED (Codex E3 fix)', () => {
    const md = buildAuditReportMarkdown(makeInput({
      // Codex E3-gold-r3: SHAPE-CLEARED phrasing only fires when runner
      // didn't run. When runner is invoked + PASS, summary says
      // "PASS (runner-verified)" instead (tested separately).
      runnerVerdict: { invoked: false, reason: 'test fixture — runner not invoked' },
      verdict: makeVerdict({ seal: { sealed: true }, shapeOk: true, totalEvents: 28 }),
    }));
    expect(md).toContain('SHAPE-CLEARED');
    expect(md).toContain('RUN RUNNER VERIFY before fan-out');
    // Must NOT claim the runner-verified PASS unless runner actually ran.
    expect(md).not.toContain('VERDICT:  PASS (runner-verified');
  });

  it('verifier notes block names the runner-only checks explicitly', () => {
    const md = buildAuditReportMarkdown(makeInput());
    // Both omitted checks should be called out in the Verifier notes
    // block so a reviewer sees the limit, not just the green badge.
    expect(md).toContain('Ed25519 signature verification');
    expect(md).toContain('hash-chain replay');
    expect(md).toContain('chain_root_hash');
  });

  it('renders sourceTag in the report header', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sourceTag: 'GitHub foo/bar (default branch)',
    }));
    expect(md).toContain('Sources: GitHub foo/bar (default branch)');
  });

  it('ignores self_review events that lack agent origin in the trail (Codex E3 fix)', () => {
    // Pre-fix the aggregator gated only on signature presence — a
    // forged event with payload.emitted_by='workflow' (origin lie)
    // would have been counted toward the score. Now it must be
    // dropped from the trail (timeline below still shows it).
    const md = buildAuditReportMarkdown(makeInput({
      chainLines: [
        JSON.stringify({ event_id: 1, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'architect', round: 1, score: 0.01, severity: 'CRITICAL', emitted_by: 'workflow' } }),
      ],
    }));
    const trailStart = md.indexOf('## Self-review trail');
    const trailEnd = md.indexOf('## Workflow facts');
    const trailSection = md.slice(trailStart, trailEnd);
    expect(trailSection).not.toContain('CRITICAL');
    expect(trailSection).not.toContain('**architect**');
    expect(trailSection).toContain('No signed `self_review` events');
  });

  it('ignores self_review events missing numeric signer_epoch in the trail (Codex E3 fix)', () => {
    const md = buildAuditReportMarkdown(makeInput({
      chainLines: [
        JSON.stringify({ event_id: 1, event_kind: 'self_review', signature: 'sig', payload: { persona: 'architect', round: 1, score: 0.01, severity: 'CRITICAL', emitted_by: 'agent' } }),
      ],
    }));
    const trailStart = md.indexOf('## Self-review trail');
    const trailEnd = md.indexOf('## Workflow facts');
    const trailSection = md.slice(trailStart, trailEnd);
    expect(trailSection).not.toContain('CRITICAL');
    expect(trailSection).not.toContain('**architect**');
  });

  // ── Codex E3-gold review additions ────────────────────────────────────

  it('renders RUNNER CRYPTO VERDICT: PASS when runner invoked + ok', () => {
    const md = buildAuditReportMarkdown(makeInput({
      runnerVerdict: { invoked: true, ok: true, chainHead: 'b'.repeat(64), eventCount: 28 },
    }));
    expect(md).toContain('✅ **RUNNER CRYPTO VERDICT: PASS**');
    expect(md).toContain('verified 28 event(s) end-to-end');
    expect(md).toContain('Chain head: `bbbbbbbbbbbbbbbb');
  });

  it('renders RUNNER CRYPTO VERDICT: FAIL with reason when runner rejected the chain', () => {
    const md = buildAuditReportMarkdown(makeInput({
      runnerVerdict: { invoked: true, ok: false, reason: 'prev-hash-mismatch-line-7' },
    }));
    expect(md).toContain('❌ **RUNNER CRYPTO VERDICT: FAIL**');
    expect(md).toContain('prev-hash-mismatch-line-7');
    expect(md).toContain('DO NOT promote');
  });

  it('renders RUNNER CRYPTO VERDICT: NOT INVOKED with runner CLI when shell-out failed', () => {
    const md = buildAuditReportMarkdown(makeInput({
      runnerVerdict: { invoked: false, reason: 'npx not found on PATH.' },
    }));
    expect(md).toContain('⚠ **RUNNER CRYPTO VERDICT: NOT INVOKED**');
    expect(md).toContain('npx not found on PATH');
    expect(md).toContain('skill-audit-verify-chain');
  });

  it('renders event timeline inside collapsible <details>', () => {
    const md = buildAuditReportMarkdown(makeInput({
      chainLines: [
        JSON.stringify({ event_id: 1, event_kind: 'skill_call', signature: 'sig', signer_epoch: 1, payload: { skill: 'knowledge-okr', ok: true, emitted_by: 'runtime' } }),
        JSON.stringify({ event_id: 2, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'architect', round: 1, score: 0.90, severity: 'PASS', emitted_by: 'agent' } }),
        JSON.stringify({ event_id: 3, event_kind: 'artifact_written', payload: { emitted_by: 'workflow', path: 'okrs/X/why/research-doc.md', sha256: 'a', bytes: 1, merge_commit_sha: 'b' } }),
      ],
    }));
    expect(md).toContain('## Event timeline');
    expect(md).toContain('<details>');
    expect(md).toContain('3 events · 2 signed · 1 unsigned');
    expect(md).toContain('| 1 | `skill_call` | runtime | ✓ | `knowledge-okr` |');
    expect(md).toContain('| 2 | `self_review` | agent | ✓ | architect r1 → 0.90 (PASS) |');
    expect(md).toContain('| 3 | `artifact_written` | workflow | — | `okrs/X/why/research-doc.md`');
  });

  it('renders cross-phase ladder as a human table + raw YAML in <details>', () => {
    const ladder = `chain:
  - phase: why
    action_id: ACT-1
    run_id: WHY-2026-05-25-aaa
    status: complete
    merged_at: '2026-05-25T10:00:00Z'
    pr_number: 136
    chain_root_hash: ${'a'.repeat(64)}
  - phase: how
    action_id: ACT-2
    run_id: HOW-2026-05-25-bbb
    status: complete
    merged_at: '2026-05-25T11:00:00Z'
    pr_number: 148
    chain_root_hash: ${'b'.repeat(64)}`;
    const md = buildAuditReportMarkdown(makeInput({ chainLadderText: ladder }));
    expect(md).toContain('## Cross-phase ladder');
    expect(md).toContain('| Phase | Run ID | Merged | PR | Chain root |');
    expect(md).toContain('| `why` | `WHY-2026-05-25-aaa` | 2026-05-25T10:00:00Z | #136 |');
    expect(md).toContain('| `how` | `HOW-2026-05-25-bbb` | 2026-05-25T11:00:00Z | #148 |');
    expect(md).toContain('<summary>Raw <code>chain-ladder.yaml</code></summary>');
  });

  it('renders control mapping when PRD has SR-NN sections + design cites them', () => {
    const prd = `## Security Requirements

### SR-01: Auth with RBAC

Mitigates THR-003 (spoofing). Maps to OWASP A01 + A09.

### SR-02: Input validation

Mitigates THR-006. OWASP A03 / A05.

## Next Section
`;
    const artifact = `## 5. Security Control Implementations

Per-SR implementation:
- SR-01: bcrypt + JWT middleware.
- SR-02: zod schemas.
`;
    const md = buildAuditReportMarkdown(makeInput({ prdText: prd, artifactText: artifact }));
    expect(md).toContain('## Control mapping');
    expect(md).toContain('| `SR-01` | `THR-003` | `A01`, `A09` | prd.md §Security Requirements (SR-01) | ✓ |');
    expect(md).toContain('| `SR-02` | `THR-006` | `A03`, `A05` | prd.md §Security Requirements (SR-02) | ✓ |');
  });

  it('omits control mapping when PRD text not provided', () => {
    const md = buildAuditReportMarkdown(makeInput({ prdText: null }));
    expect(md).not.toContain('## Control mapping');
  });

  it('marks SR as not cited in design when artifact text omits the SR-NN reference', () => {
    const prd = `## Security Requirements\n\n### SR-99: Some control\nMitigates THR-099. A10.\n`;
    const artifact = `## 5. Security Control Implementations\n\nDoes not mention the SR.`;
    const md = buildAuditReportMarkdown(makeInput({ prdText: prd, artifactText: artifact }));
    expect(md).toContain('| `SR-99` | `THR-099` | `A10` | prd.md §Security Requirements (SR-99) | ✗ |');
  });

  it('parses real PRD output shape (Codex E3-gold regression fixture from celeb-api WHAT run)', () => {
    // This is the exact section shape the prd-agent produces today,
    // verbatim from okrs/OKR-2026Q2-IMDB-001-celeb-api/how/prd.md.
    // Confirms the parser tolerates the live emission format.
    const prd = `## Functional Requirements

### FR-01
Some FR body.

## Security Requirements

### SR-01
Enforce least-privilege access for enrichment provider credentials and internal admin override actions; require RBAC and auditable use of privileged identity-resolution operations (A01 Broken Access Control, A09 Security Logging and Monitoring Failures).

### SR-02
Validate and sanitize all upstream and cached profile attributes before persistence/response to prevent injection and unsafe output rendering in frontend profile views (A03 Injection, A05 Security Misconfiguration).

### SR-03
Protect licensing/publicity-right-sensitive metadata against tampering in transit and at rest, with integrity checks on ingestion and response serialization (A02 Cryptographic Failures, A08 Software and Data Integrity Failures).

### SR-04
Require explicit audit logging for identity-confidence overrides, manual merge decisions, and compliance gate approvals (A09 Security Logging and Monitoring Failures, A10 Server-Side Request Forgery prevention for external feed fetch policy).

## Coverage Analysis

| SR | Mapping |
|---|---|
| SR-01 | C4 + OWASP A01/A09 |
| SR-02 | C4 + OWASP A03/A05 |
`;
    const artifact = `# Code Design\n\n## 5. Security Control Implementations\n\nSR-01 RBAC. SR-02 validation. SR-03 integrity. SR-04 audit.`;
    const md = buildAuditReportMarkdown(makeInput({ prdText: prd, artifactText: artifact }));
    expect(md).toContain('## Control mapping');
    // All 4 SRs from the Security Requirements section show up — and
    // critically, parser does NOT match FR-01 (different section) NOR
    // double-count from Coverage Analysis (different section).
    expect(md).toContain('| `SR-01` |');
    expect(md).toContain('| `SR-02` |');
    expect(md).toContain('| `SR-03` |');
    expect(md).toContain('| `SR-04` |');
    // OWASP refs scoped to each SR's chunk — SR-01 sees A01+A09, not A03.
    expect(md).toContain('| `SR-01` | _not declared_ | `A01`, `A09`');
    expect(md).toContain('| `SR-02` | _not declared_ | `A03`, `A05`');
    expect(md).toContain('| `SR-03` | _not declared_ | `A02`, `A08`');
    expect(md).toContain('| `SR-04` | _not declared_ | `A09`, `A10`');
    // All four are cited in §5 of the artifact.
    expect(md).toMatch(/SR-01.*✓/);
    expect(md).toMatch(/SR-04.*✓/);
  });

  it('runner FAIL is rendered as FAIL — NOT NOT-INVOKED (Codex E3-gold fix)', () => {
    // The runner CLI exits nonzero when ok:false but writes the
    // verdict JSON to stdout. Pre-fix the handler ignored stdout when
    // exit code != 0 and labelled the run as NOT INVOKED. This test
    // is for the exporter only; the handler fix lives in
    // LookingGlassPanel.invokeRunnerVerifyChain. Here we assert the
    // exporter renders the FAIL verdict correctly when given it.
    const md = buildAuditReportMarkdown(makeInput({
      runnerVerdict: { invoked: true, ok: false, reason: 'prev-hash-mismatch-line-7' },
    }));
    expect(md).toContain('❌ **RUNNER CRYPTO VERDICT: FAIL**');
    expect(md).toContain('prev-hash-mismatch-line-7');
    expect(md).not.toContain('NOT INVOKED');
  });

  // ── Codex E3-gold-r3 — executive summary driven by runner verdict ──

  it('exec summary VERDICT=PASS (runner-verified) when runner invoked + ok', () => {
    const md = buildAuditReportMarkdown(makeInput({
      runnerVerdict: { invoked: true, ok: true, chainHead: 'a'.repeat(64), eventCount: 28 },
      verdict: makeVerdict({ seal: { sealed: true }, shapeOk: true, totalEvents: 28 }),
    }));
    expect(md).toContain('VERDICT:  PASS (runner-verified · 28 events · chain head aaaaaaaaaaaa…)');
    expect(md).toContain('ACTION:   APPROVE for downstream coding handoff');
    expect(md).not.toContain('SHAPE-CLEARED');
  });

  it('exec summary VERDICT=FAIL when runner rejected the chain', () => {
    const md = buildAuditReportMarkdown(makeInput({
      runnerVerdict: { invoked: true, ok: false, reason: 'prev-hash-mismatch-line-7' },
    }));
    expect(md).toContain('VERDICT:  FAIL (runner rejected chain)');
    expect(md).toContain('ACTION:   REJECT');
    expect(md).toContain('prev-hash-mismatch-line-7');
    expect(md).toContain('RISK:     CRITICAL');
  });

  it('exec summary falls back to SHAPE-CLEARED only when runner NOT INVOKED for innocent reasons (npx unavailable, network) — NOT for atomicity breaks', () => {
    // Codex E3-gold-r5: this test pre-r5 fed in a JSONL-mismatch reason
    // and asserted SHAPE-CLEARED. That was the BLOCKING regression
    // Codex caught — atomicity breaks must surface as FAIL, not
    // SHAPE-CLEARED. Innocent shell-out failures (npx not on PATH,
    // runner crashed pre-output) still legitimately produce
    // SHAPE-CLEARED. No `sources` object → sources-aware atomicity
    // gate is bypassed.
    const md = buildAuditReportMarkdown(makeInput({
      runnerVerdict: { invoked: false, reason: 'npx not found on PATH' },
      verdict: makeVerdict({ seal: { sealed: true }, shapeOk: true }),
    }));
    expect(md).toContain('VERDICT:  SHAPE-CLEARED — runner verification NOT INVOKED');
    expect(md).toContain('RUN RUNNER VERIFY before fan-out');
    expect(md).toContain('npx not found on PATH');
  });

  it('exec summary RISK=LOW only when runner+shape both pass', () => {
    const md = buildAuditReportMarkdown(makeInput({
      runnerVerdict: { invoked: true, ok: true, chainHead: 'b'.repeat(64), eventCount: 28 },
      chainLines: [
        JSON.stringify({ event_id: 1, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-architect', round: 2, score: 0.96, severity: 'PASS', emitted_by: 'agent' } }),
        JSON.stringify({ event_id: 2, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-security', round: 2, score: 0.95, severity: 'PASS', emitted_by: 'agent' } }),
      ],
    }));
    expect(md).toContain('RISK:     LOW — runner verified');
  });

  // ── Codex E3-gold-r3 — direct parseRunnerVerdictFromStdout tests ──

  it('parseRunnerVerdictFromStdout: exit 0 + ok:true JSON → invoked PASS', () => {
    const verdict = parseRunnerVerdictFromStdout(
      JSON.stringify({ ok: true, chainHead: 'abc'.repeat(20), eventCount: 5 }),
      '',
      0,
    );
    expect(verdict).toEqual({
      invoked: true,
      ok: true,
      chainHead: 'abc'.repeat(20),
      eventCount: 5,
    });
  });

  it('parseRunnerVerdictFromStdout: exit 1 + ok:false JSON → invoked FAIL (not NOT-INVOKED)', () => {
    // This is the exact regression Codex caught: pre-fix the handler
    // treated nonzero exit as NOT INVOKED and ignored stdout. Now the
    // FAIL verdict carries through regardless of exit code.
    const verdict = parseRunnerVerdictFromStdout(
      JSON.stringify({ ok: false, reason: 'prev-hash-mismatch-line-7' }),
      '',
      1,
    );
    expect(verdict).toEqual({
      invoked: true,
      ok: false,
      reason: 'prev-hash-mismatch-line-7',
    });
  });

  it('parseRunnerVerdictFromStdout: parses verdict line even when stdout has logs before it', () => {
    // Runner may emit info/warning lines before the canonical JSON;
    // helper takes the LAST non-empty line.
    const stdout = [
      '[runner] loading chain okrs/X/audit/events/Y.jsonl',
      '[runner] 28 events parsed',
      '[runner] verifying signatures...',
      JSON.stringify({ ok: true, chainHead: 'd'.repeat(64), eventCount: 28 }),
    ].join('\n');
    const verdict = parseRunnerVerdictFromStdout(stdout, '', 0);
    expect(verdict.invoked).toBe(true);
    if (verdict.invoked) {
      expect(verdict.ok).toBe(true);
      if (verdict.ok) {
        expect(verdict.eventCount).toBe(28);
      }
    }
  });

  it('parseRunnerVerdictFromStdout: no parseable JSON → NOT INVOKED with exit code + stderr context', () => {
    const verdict = parseRunnerVerdictFromStdout(
      '',
      'npm ERR! 404 Not Found',
      127,
    );
    expect(verdict.invoked).toBe(false);
    if (!verdict.invoked) {
      expect(verdict.reason).toContain('Exit code: 127');
      expect(verdict.reason).toContain('npm ERR! 404 Not Found');
    }
  });

  it('parseRunnerVerdictFromStdout: JSON parses but missing fields → NOT INVOKED with shape reason', () => {
    const verdict = parseRunnerVerdictFromStdout(
      '{"foo":"bar"}',  // valid JSON but no `ok` field
      '',
      0,
    );
    expect(verdict.invoked).toBe(false);
    if (!verdict.invoked) {
      expect(verdict.reason).toContain('unexpected shape');
    }
  });

  // ── Codex E3-gold-r4 — bottom-to-top walker regression ──
  // r3 parsed only the absolute final non-empty line. If an npx wrapper
  // or runner-side cleanup log emitted a non-JSON line AFTER the verdict
  // JSON, the parser silently fell through to NOT INVOKED. r4 walks from
  // the bottom finding the first JSON-shaped line.
  it('parseRunnerVerdictFromStdout: parses verdict JSON when followed by trailing log line', () => {
    const stdout = [
      '[runner] init',
      'verifying 28 events…',
      '{"ok":true,"chainHead":"' + 'a'.repeat(64) + '","eventCount":28}',
      '[runner] cleanup complete',
      'Done.',
    ].join('\n');
    const verdict = parseRunnerVerdictFromStdout(stdout, '', 0);
    expect(verdict.invoked).toBe(true);
    if (verdict.invoked) {
      expect(verdict.ok).toBe(true);
      if (verdict.ok) {
        expect(verdict.eventCount).toBe(28);
      }
    }
  });

  // ── Codex E3-gold-r4 — Source breakdown rendering ──
  it('renders Source breakdown table when sources object is provided', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'github',
        ladder: 'github',
        keys: 'github-verified',
        prd: 'github',
        artifact: 'github',
        runnerInput: 'github-verified',
      },
    }));
    expect(md).toContain('**Source breakdown**');
    expect(md).toContain('| `okr.yaml` |');
    expect(md).toContain('| chain JSONL |');
    expect(md).toContain('| `audit/keys/<runId>.epoch-*.pub.pem` |');
    expect(md).toContain('canonical (GitHub) · local key bytes match');
  });

  it('Source breakdown table absent when sources not provided (backward-compat)', () => {
    const md = buildAuditReportMarkdown(makeInput());
    expect(md).not.toContain('**Source breakdown**');
  });

  it('Source breakdown labels suppressed PRD honestly (Codex r4 atomicity)', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'github',
        ladder: 'missing',
        keys: 'github-verified',
        prd: 'suppressed-non-canonical',
        artifact: 'github',
        runnerInput: 'github-verified',
      },
    }));
    expect(md).toContain('suppressed (canonical fetch failed; local exists but withheld to preserve atomicity)');
  });

  it('Source breakdown labels LOCAL FALLBACK chain prominently', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'local-fallback',
        ladder: 'missing',
        keys: 'mismatch',
        prd: 'github',
        artifact: 'github',
        runnerInput: 'not-applicable',
      },
    }));
    expect(md).toContain('⚠ LOCAL FALLBACK');
    expect(md).toContain('🚫 LOCAL DOES NOT MATCH GITHUB');
  });

  // ── Codex E3-gold-r4 — atomicity-broken executive summary ──
  it('exec summary VERDICT=FAIL (source atomicity broken) when okr=github + chain=local-fallback', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'local-fallback',  // ← non-atomic
        ladder: 'missing',
        keys: 'not-checked',
        prd: 'github',
        artifact: 'github',
        runnerInput: 'not-applicable',
      },
      runnerVerdict: { invoked: false, reason: 'Source atomicity broken' },
    }));
    expect(md).toContain('FAIL (source atomicity broken — report bytes ≠ runner bytes)');
    expect(md).toContain('CRITICAL — source atomicity broken');
    // Must not say PASS or SHAPE-CLEARED under any circumstance with broken atomicity.
    expect(md).not.toContain('VERDICT**: PASS');
    expect(md).not.toContain('SHAPE-CLEARED');
  });

  it('exec summary VERDICT=FAIL (atomicity broken) when keys=mismatch even if chain=github', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'github',
        ladder: 'github',
        keys: 'mismatch',  // ← local key bytes don't match GitHub
        prd: 'github',
        artifact: 'github',
        runnerInput: 'not-applicable',
      },
      runnerVerdict: { invoked: false, reason: 'Local public key for epoch 1 does NOT match canonical GitHub bytes' },
    }));
    expect(md).toContain('FAIL (source atomicity broken');
    expect(md).toContain('CRITICAL — source atomicity broken');
    expect(md).toContain('local public-key files do not match canonical GitHub bytes');
  });

  it('exec summary VERDICT=FAIL (atomicity broken) when keys=missing', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'github',
        ladder: 'github',
        keys: 'missing',
        prd: 'github',
        artifact: 'github',
        runnerInput: 'not-applicable',
      },
      runnerVerdict: { invoked: false, reason: 'Public key for epoch 1 missing locally' },
    }));
    expect(md).toContain('FAIL (source atomicity broken');
    expect(md).toContain('public-key files needed by the runner are missing');
  });

  it('exec summary PASS allowed only when sources atomic AND runner invoked + ok', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'github',
        ladder: 'github',
        keys: 'github-verified',
        prd: 'github',
        artifact: 'github',
        runnerInput: 'github-verified',
      },
      runnerVerdict: { invoked: true, ok: true, chainHead: 'a'.repeat(64), eventCount: 28 },
    }));
    expect(md).toContain('PASS (runner-verified');
  });

  // ── Codex E3-gold-r5 — runnerInput atomicity-broken FAIL paths ──
  // r5 BLOCKING regression: pre-r5, when chain+keys looked canonical
  // but local JSONL drifted, exec summary said SHAPE-CLEARED instead of
  // FAIL. Now runnerInput=jsonl-mismatch or jsonl-missing produces FAIL.
  it('exec summary VERDICT=FAIL when chain+keys canonical but runnerInput=jsonl-mismatch (Codex r5 regression)', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'github',
        ladder: 'github',
        keys: 'github-verified',  // ← chain + keys all atomic
        prd: 'github',
        artifact: 'github',
        runnerInput: 'jsonl-mismatch',  // ← but local JSONL on disk differs
      },
      runnerVerdict: { invoked: false, reason: 'Local mesh JSONL does not match canonical GitHub source' },
    }));
    expect(md).toContain('FAIL (source atomicity broken — report bytes ≠ runner bytes)');
    expect(md).toContain('CRITICAL — source atomicity broken');
    expect(md).toContain('local JSONL on disk does NOT match the canonical GitHub bytes');
    // The exact pre-r5 regression Codex caught: SHAPE-CLEARED must NOT appear.
    expect(md).not.toContain('SHAPE-CLEARED');
  });

  it('exec summary VERDICT=FAIL when runnerInput=jsonl-missing in canonical mode', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'github',
        ladder: 'github',
        keys: 'github-verified',
        prd: 'github',
        artifact: 'github',
        runnerInput: 'jsonl-missing',
      },
      runnerVerdict: { invoked: false, reason: 'Local mesh does not have a JSONL at the canonical path' },
    }));
    expect(md).toContain('FAIL (source atomicity broken');
    expect(md).toContain('local JSONL is missing at the canonical path');
    expect(md).not.toContain('SHAPE-CLEARED');
  });

  it('Source breakdown renders runner input row distinctly from chain', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'github',
        ladder: 'github',
        keys: 'github-verified',
        prd: 'github',
        artifact: 'github',
        runnerInput: 'jsonl-mismatch',
      },
    }));
    expect(md).toContain('| runner input (local-disk bytes seen by verifier) |');
    expect(md).toContain('🚫 LOCAL JSONL DRIFTED FROM CANONICAL');
  });

  it('Source breakdown labels ladder=suppressed-non-canonical honestly', () => {
    const md = buildAuditReportMarkdown(makeInput({
      sources: {
        okr: 'github',
        chain: 'github',
        ladder: 'suppressed-non-canonical',  // ← ladder fell back path, now suppressed
        keys: 'github-verified',
        prd: 'github',
        artifact: 'github',
        runnerInput: 'github-verified',
      },
    }));
    // The ladder row picks up the suppression label.
    expect(md).toMatch(/\| chain-ladder\.yaml \| ⚠ suppressed/);
  });

  // ── Codex E3-gold-r5 — parser walks past unrelated trailing JSON ──
  it('parseRunnerVerdictFromStdout: continues past trailing JSON without ok field (Codex r5)', () => {
    // The exact regression: a wrapper logs a JSON object AFTER the runner
    // verdict, but without an `ok` field. Pre-r5 the parser stopped at
    // that wrapper line and returned NOT INVOKED (unexpected shape).
    // r5 walks upward until finding JSON with `ok=true|false`.
    const stdout = [
      '[runner] init',
      JSON.stringify({ ok: true, chainHead: 'a'.repeat(64), eventCount: 28 }),
      JSON.stringify({ step: 'cleanup', took: 12 }),  // ← unrelated wrapper JSON
      'Done.',
    ].join('\n');
    const verdict = parseRunnerVerdictFromStdout(stdout, '', 0);
    expect(verdict.invoked).toBe(true);
    if (verdict.invoked) {
      expect(verdict.ok).toBe(true);
      if (verdict.ok) {
        expect(verdict.eventCount).toBe(28);
      }
    }
  });

  it('parseRunnerVerdictFromStdout: returns "unexpected shape" only when no verdict JSON anywhere', () => {
    // Only non-verdict JSON in the stream → NOT INVOKED with shape reason.
    const verdict = parseRunnerVerdictFromStdout(
      JSON.stringify({ step: 'cleanup', took: 12 }),
      '',
      0,
    );
    expect(verdict.invoked).toBe(false);
    if (!verdict.invoked) {
      expect(verdict.reason).toContain('unexpected shape');
    }
  });

  // ── Codex E3-gold-r5-followup — composeSourceTag canonicality predicate ──
  // The handler's old inline predicate allowed runnerInput=not-applicable
  // without re-checking keysSource. In a key-mismatch / key-missing case
  // the executive summary still failed correctly, but the headline
  // sourceTag could read "GitHub canonical" — a chief-auditor-grade
  // honesty bug. The pure helper now guarantees that any of
  // keys=mismatch/missing or runnerInput=jsonl-mismatch/missing
  // produces a MIXED tag.
  const REPO = { owner: 'AliceNN-ucdenver', repo: 'mesh' };
  function mkSources(over: Partial<AuditReportInputSources> = {}): AuditReportInputSources {
    return {
      okr: 'github',
      chain: 'github',
      ladder: 'github',
      keys: 'github-verified',
      prd: 'github',
      artifact: 'github',
      runnerInput: 'github-verified',
      ...over,
    };
  }

  it('composeSourceTag: all-canonical happy path produces GitHub headline', () => {
    expect(composeSourceTag(mkSources(), REPO))
      .toBe('GitHub AliceNN-ucdenver/mesh (default branch)');
  });

  it('composeSourceTag: all-local produces local-mesh headline', () => {
    const sources = mkSources({
      okr: 'local-fallback',
      chain: 'local-fallback',
      ladder: 'local-fallback',
      keys: 'local-only',
      prd: 'local-fallback',
      artifact: 'local-fallback',
      runnerInput: 'local-only',
    });
    expect(composeSourceTag(sources, REPO)).toBe('local mesh checkout');
  });

  it('composeSourceTag: workflow-only chain (no signed agent events) stays canonical', () => {
    // Legitimate case: chain has no signed agent events, so runnerInput
    // is not-applicable BECAUSE keys is not-checked. This is the ONLY
    // path where not-applicable should be allowed in a canonical tag.
    const sources = mkSources({ keys: 'not-checked', runnerInput: 'not-applicable' });
    expect(composeSourceTag(sources, REPO))
      .toBe('GitHub AliceNN-ucdenver/mesh (default branch)');
  });

  it('composeSourceTag: keys=mismatch produces MIXED · keys: LOCAL DRIFT (Codex r5-followup BLOCKING)', () => {
    // The exact regression Codex caught: pre-r5-followup, keys=mismatch
    // + runnerInput=not-applicable (which the helper sets when it
    // short-circuits past JSONL check) would pass the inline predicate
    // and produce "GitHub canonical". Now: MIXED, with keys hint.
    const sources = mkSources({ keys: 'mismatch', runnerInput: 'not-applicable' });
    const tag = composeSourceTag(sources, REPO);
    expect(tag).toContain('MIXED');
    expect(tag).toContain('keys: LOCAL DRIFT');
    expect(tag).toContain('NON-ATOMIC');
    expect(tag).not.toContain('canonical');
  });

  it('composeSourceTag: keys=missing produces MIXED · keys: MISSING', () => {
    const sources = mkSources({ keys: 'missing', runnerInput: 'not-applicable' });
    const tag = composeSourceTag(sources, REPO);
    expect(tag).toContain('MIXED');
    expect(tag).toContain('keys: MISSING');
    expect(tag).not.toContain('canonical');
  });

  it('composeSourceTag: runnerInput=jsonl-mismatch produces MIXED · runner input: LOCAL DRIFT', () => {
    // Keys are canonical but local JSONL bytes drifted — the case
    // r5 BLOCKING closed at the exec-summary level. The headline
    // must also be honest about it.
    const sources = mkSources({ runnerInput: 'jsonl-mismatch' });
    const tag = composeSourceTag(sources, REPO);
    expect(tag).toContain('MIXED');
    expect(tag).toContain('runner input: LOCAL DRIFT');
    expect(tag).not.toContain('canonical');
  });

  it('composeSourceTag: runnerInput=jsonl-missing produces MIXED · runner input: LOCAL MISSING', () => {
    const sources = mkSources({ runnerInput: 'jsonl-missing' });
    const tag = composeSourceTag(sources, REPO);
    expect(tag).toContain('MIXED');
    expect(tag).toContain('runner input: LOCAL MISSING');
    expect(tag).not.toContain('canonical');
  });

  it('composeSourceTag: okr=github + chain=local-fallback produces MIXED (no canonical headline)', () => {
    const sources = mkSources({ chain: 'local-fallback', runnerInput: 'not-applicable' });
    const tag = composeSourceTag(sources, REPO);
    expect(tag).toContain('MIXED');
    expect(tag).toContain('local-fallback');
    expect(tag).not.toContain('canonical');
  });
});

// ============================================================================
// E4 (2026-05-25) — Whole-OKR audit rollup
//
// Pure-function tests for buildOkrRollupMarkdown, computeOkrRollupVerdict, and
// composeOkrRollupSourceTag. The caller (LookingGlassPanel.onExportOkrRollup)
// assembles the input by looping canonical okr.yaml actions; these tests pin
// the contract for what the renderer + verdict precedence produce given that
// input. The handler-side flow is covered by the existing per-action
// integration via decideRunnerInvocation/fetchPrdAndArtifact/verifyKeysAtomicity
// which the rollup handler reuses unchanged.
// ============================================================================

describe('buildOkrRollupMarkdown', () => {
  function makeCanonicalSources(over: Partial<AuditReportInputSources> = {}): AuditReportInputSources {
    return {
      okr: 'github',
      chain: 'github',
      ladder: 'github',
      keys: 'github-verified',
      prd: 'github',
      artifact: 'github',
      runnerInput: 'github-verified',
      ...over,
    };
  }

  function makeRunnerPassVerdict(): RunnerVerifyVerdict {
    return { invoked: true, ok: true, chainHead: 'a'.repeat(64), eventCount: 28 };
  }

  function makePhaseDigest(over: Partial<PhaseRollupDigest> = {}): PhaseRollupDigest {
    const phase = over.phase ?? 'why';
    return {
      phase,
      runId: `${phase.toUpperCase()}-2026-05-25-aaa`,
      actionId: phase === 'why' ? 'ACT-1' : phase === 'how' ? 'ACT-2' : 'ACT-3',
      status: 'complete',
      completedAt: '2026-05-25T10:00:00Z',
      artifactPath: `okrs/OKR-X/${phase}/artifact.md`,
      prUrl: 'https://github.com/x/y/pull/100',
      evidenceComplete: true,
      evidenceGaps: [],
      verdict: {
        seal: { sealed: true },
        totalEvents: 28,
        malformedLines: 0,
        unsignedAgentEvents: 0,
        signedWorkflowEvents: 0,
        originKindMismatches: 0,
        firstFailure: null,
        shapeOk: true,
      },
      runnerVerdict: makeRunnerPassVerdict(),
      sources: makeCanonicalSources(),
      agentStats: { signedAgent: 4, totalAgent: 4 },
      reviewSummary: [
        {
          persona: phase === 'why' ? 'market-research' : phase === 'how' ? 'prd-architect' : 'code-architect',
          rounds: [
            { round: 1, score: 0.85, severity: 'MINOR', eventId: 10 },
            { round: 2, score: 0.96, severity: 'PASS', eventId: 12 },
          ],
        },
      ],
      chainHead: 'a'.repeat(64),
      eventCount: 28,
      perActionReportPath: `${phase.toUpperCase()}-2026-05-25-aaa-report.md`,
      ...over,
    };
  }

  function makeOkrRollupInput(over: Partial<OkrRollupInput> = {}): OkrRollupInput {
    const phases = over.phases ?? [
      makePhaseDigest({ phase: 'why' }),
      makePhaseDigest({ phase: 'how' }),
      makePhaseDigest({ phase: 'what' }),
    ];
    return {
      okrId: 'OKR-2026Q2-IMDB-001-celeb-api',
      objective: 'Ship celeb-api enrichment with auditable provenance',
      owner: 'shawnmccarthy',
      tier: 'supervised',
      barId: 'APP-IMDB-002',
      createdAt: '2026-05-20T09:00:00Z',
      completedAt: '2026-05-25T16:00:00Z',
      phases,
      missingPhases: [],
      chainLadderText: null,
      ladderSource: 'github',
      controlRows: [],
      prdSource: 'github',
      artifactSource: 'github',
      sourceTag: 'GitHub x/y (default branch)',
      repoInfo: null,
      ...over,
    };
  }

  it('renders the correct H1 title (OKR Audit Rollup, NOT Audit report)', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput());
    expect(md).toMatch(/^# OKR Audit Rollup — OKR-2026Q2-IMDB-001-celeb-api/);
    // Must not be confused with the per-action exporter's header shape.
    expect(md).not.toMatch(/^# Audit report —/m);
  });

  it('executive summary VERDICT=PASS when all 3 phases present + runner-verified + canonical', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput());
    expect(md).toContain('VERDICT:  ✅ PASS');
    expect(md).toContain('All 3 phases present, runner-verified, and source-atomic');
    expect(md).toContain('ACTION:   APPROVE OKR closeout');
    expect(md).toContain('RISK:     LOW');
  });

  it('executive summary VERDICT=PARTIAL when OKR has only WHY+HOW done, WHAT missing', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      phases: [makePhaseDigest({ phase: 'why' }), makePhaseDigest({ phase: 'how' })],
      missingPhases: ['what'],
    }));
    expect(md).toContain('VERDICT:  ⚠ PARTIAL');
    expect(md).toContain('WHAT phase(s) not started');
    expect(md).toContain('ACTION:   CONTINUE');
  });

  it('executive summary VERDICT=FAIL when any phase has runner FAIL', () => {
    const failing = makePhaseDigest({
      phase: 'how',
      runnerVerdict: { invoked: true, ok: false, reason: 'prev-hash-mismatch-line-7' },
    });
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      phases: [makePhaseDigest({ phase: 'why' }), failing, makePhaseDigest({ phase: 'what' })],
    }));
    expect(md).toContain('VERDICT:  ❌ FAIL');
    expect(md).toContain('HOW phase runner verdict FAIL: prev-hash-mismatch-line-7');
    expect(md).toContain('ACTION:   REJECT');
    expect(md).toContain('RISK:     CRITICAL');
  });

  it('executive summary VERDICT=FAIL when any phase has source atomicity broken (keys=mismatch)', () => {
    const failing = makePhaseDigest({
      phase: 'what',
      sources: makeCanonicalSources({ keys: 'mismatch', runnerInput: 'not-applicable' }),
      runnerVerdict: { invoked: false, reason: 'keys atomicity broken' },
    });
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      phases: [makePhaseDigest({ phase: 'why' }), makePhaseDigest({ phase: 'how' }), failing],
    }));
    expect(md).toContain('VERDICT:  ❌ FAIL');
    expect(md).toContain('WHAT phase source atomicity broken');
    expect(md).toContain('runner bytes');
  });

  it('executive summary VERDICT=FAIL when any completed phase has evidenceComplete=false', () => {
    const failing = makePhaseDigest({
      phase: 'how',
      evidenceComplete: false,
      evidenceGaps: ['chain JSONL missing', 'no finalize state_transition'],
    });
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      phases: [makePhaseDigest({ phase: 'why' }), failing, makePhaseDigest({ phase: 'what' })],
    }));
    expect(md).toContain('VERDICT:  ❌ FAIL');
    expect(md).toContain('HOW phase has incomplete evidence');
    expect(md).toContain('chain JSONL missing');
    expect(md).toContain('no finalize state_transition');
  });

  it('renders one row per phase in the rollup table', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput());
    expect(md).toContain('## Phase rollup');
    expect(md).toContain('| Phase | Run ID | Status | Sealed | Runner | Chain head | PR |');
    expect(md).toContain('| WHY | `WHY-2026-05-25-aaa` |');
    expect(md).toContain('| HOW | `HOW-2026-05-25-aaa` |');
    expect(md).toContain('| WHAT | `WHAT-2026-05-25-aaa` |');
  });

  it('renders missing-phase rows in the rollup table (PARTIAL OKR)', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      phases: [makePhaseDigest({ phase: 'why' })],
      missingPhases: ['how', 'what'],
    }));
    expect(md).toContain('| WHY | `WHY-2026-05-25-aaa` |');
    expect(md).toContain('| HOW | _not started_ |');
    expect(md).toContain('| WHAT | _not started_ |');
  });

  it('renders per-phase trust posture blocks with links to per-action reports', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput());
    expect(md).toContain('## Per-phase trust posture');
    expect(md).toContain('### WHY · WHY-2026-05-25-aaa');
    expect(md).toContain('### HOW · HOW-2026-05-25-aaa');
    expect(md).toContain('### WHAT · WHAT-2026-05-25-aaa');
    expect(md).toContain('Per-action report');
    expect(md).toContain('WHY-2026-05-25-aaa-report.md');
    expect(md).toContain('runner-verified · 28 events');
  });

  // Codex E4-r1 MAJOR fix regression test: pre-fix the per-phase block
  // called composeSourceTag(sources, null) so canonical phases rendered
  // as MIXED in the block. With repoInfo threaded through OkrRollupInput,
  // canonical phases render the canonical headline like the top-level
  // sourceTag.
  it('per-phase trust posture renders canonical Sources line when repoInfo threaded (Codex E4-r1 MAJOR)', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      repoInfo: { owner: 'AliceNN-ucdenver', repo: 'mesh' },
    }));
    // Sources line for each canonical phase should be the canonical
    // headline, NOT MIXED.
    expect(md).toMatch(/- \*\*Sources\*\*: GitHub AliceNN-ucdenver\/mesh \(default branch\)/);
    // Pre-fix this block emitted MIXED for canonical phases — guard against
    // regression.
    const trustPostureSection = md.slice(md.indexOf('## Per-phase trust posture'));
    expect(trustPostureSection).not.toContain('- **Sources**: MIXED');
  });

  it('per-phase trust posture renders evidence-missing callout when evidenceComplete=false', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      phases: [
        makePhaseDigest({
          phase: 'why',
          evidenceComplete: false,
          evidenceGaps: ['chain JSONL not on disk', 'no artifact at canonical path'],
        }),
      ],
      missingPhases: ['how', 'what'],
    }));
    expect(md).toContain('⚠ **Evidence missing');
    expect(md).toContain('chain JSONL not on disk');
    expect(md).toContain('no artifact at canonical path');
  });

  it('renders unioned control coverage table when controlRows present', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      controlRows: [
        { sr: 'SR-01', stride: ['THR-003'], owasp: ['A01'], prdAnchor: 'prd.md §Security Requirements (SR-01)', designCited: true },
        { sr: 'SR-02', stride: ['THR-006'], owasp: ['A03'], prdAnchor: 'prd.md §Security Requirements (SR-02)', designCited: false },
      ],
    }));
    expect(md).toContain('## Unioned control coverage');
    expect(md).toContain('| `SR-01` | `THR-003` | `A01` |');
    expect(md).toContain('| `SR-02` | `THR-006` | `A03` |');
    // designCited=false renders as ✗
    expect(md).toMatch(/SR-02.*✗/);
  });

  it('renders honest "not available" note when prdSource=suppressed-non-canonical', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      controlRows: [],
      prdSource: 'suppressed-non-canonical',
    }));
    expect(md).toContain('## Unioned control coverage');
    expect(md).toContain('Control mapping not rendered');
    expect(md).toContain('PRD suppressed');
    expect(md).toContain('preserve atomicity');
  });

  it('renders honest "not available" note when prdSource=missing', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      controlRows: [],
      prdSource: 'missing',
    }));
    expect(md).toContain('Control mapping not rendered');
    expect(md).toContain('PRD missing');
  });

  it('outstanding gaps section lists per-phase issues honestly', () => {
    const failing = makePhaseDigest({
      phase: 'how',
      runnerVerdict: { invoked: true, ok: false, reason: 'prev-hash-mismatch-line-7' },
    });
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      phases: [makePhaseDigest({ phase: 'why' }), failing],
      missingPhases: ['what'],
    }));
    expect(md).toContain('## Outstanding gaps');
    expect(md).toContain('**HOW**: runner verdict FAIL');
    expect(md).toContain('prev-hash-mismatch-line-7');
    expect(md).toContain('**WHAT**: phase not started');
  });

  it('outstanding gaps shows "no outstanding gaps" sentinel when everything green', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput());
    expect(md).toContain('## Outstanding gaps');
    expect(md).toContain('✓ No outstanding gaps across the OKR.');
  });

  it('verifier notes renders one runner command per started phase', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput());
    expect(md).toContain('## Verifier notes');
    expect(md).toContain('**WHY · WHY-2026-05-25-aaa**');
    expect(md).toContain('**HOW · HOW-2026-05-25-aaa**');
    expect(md).toContain('**WHAT · WHAT-2026-05-25-aaa**');
    // Each block uses the same skill-audit-verify-chain command shape.
    expect(md).toContain('skill-audit-verify-chain');
    expect(md).toContain('"okrId":"OKR-2026Q2-IMDB-001-celeb-api"');
    expect(md).toContain('"runId":"WHY-2026-05-25-aaa"');
    expect(md).toContain('"runId":"HOW-2026-05-25-aaa"');
    expect(md).toContain('"runId":"WHAT-2026-05-25-aaa"');
  });

  it('renders sourceTag in the header', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      sourceTag: 'GitHub AliceNN-ucdenver/mesh (default branch)',
    }));
    expect(md).toContain('Sources: GitHub AliceNN-ucdenver/mesh (default branch)');
  });

  it('OKR identity table renders objective + owner + tier + BAR', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput());
    expect(md).toContain('## OKR identity');
    expect(md).toContain('| Objective | Ship celeb-api enrichment with auditable provenance |');
    expect(md).toContain('| Owner | shawnmccarthy |');
    expect(md).toContain('| Tier | supervised |');
    expect(md).toContain('| BAR | `APP-IMDB-002` |');
  });

  it('renders cross-phase ladder when chainLadderText provided', () => {
    const ladder = `chain:
  - phase: why
    action_id: ACT-1
    run_id: WHY-2026-05-25-aaa
    status: complete
    merged_at: '2026-05-25T10:00:00Z'
    pr_number: 136
    chain_root_hash: ${'a'.repeat(64)}`;
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      chainLadderText: ladder,
      repoInfo: { owner: 'x', repo: 'y' },
    }));
    expect(md).toContain('## Cross-phase ladder');
    expect(md).toContain('| `why` | `WHY-2026-05-25-aaa` | 2026-05-25T10:00:00Z | [#136](https://github.com/x/y/pull/136) |');
    expect(md).toContain('| WHY | `WHY-2026-05-25-aaa` | complete | 🛡 sealed | ✅ PASS | `aaaaaaaaaaaa…` | [#100](https://github.com/x/y/pull/100) |');
  });

  it('uses ladder PR numbers when phase actions do not carry PR URLs', () => {
    const ladder = `chain:
  - phase: why
    run_id: WHY-2026-05-25-aaa
    merged_at: '2026-05-25T10:00:00Z'
    pr_number: 136
    chain_root_hash: ${'a'.repeat(64)}`;
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      chainLadderText: ladder,
      repoInfo: { owner: 'x', repo: 'y' },
      phases: [
        makePhaseDigest({ phase: 'why', prUrl: null }),
        makePhaseDigest({ phase: 'how' }),
        makePhaseDigest({ phase: 'what' }),
      ],
    }));
    expect(md).toContain('| WHY | `WHY-2026-05-25-aaa` | complete | 🛡 sealed | ✅ PASS | `aaaaaaaaaaaa…` | [#136](https://github.com/x/y/pull/136) |');
    expect(md).toContain('- **PR**: [#136](https://github.com/x/y/pull/136)');
  });

  it('cross-phase ladder section honors suppressed-non-canonical ladder source', () => {
    const md = buildOkrRollupMarkdown(makeOkrRollupInput({
      chainLadderText: null,
      ladderSource: 'suppressed-non-canonical',
    }));
    expect(md).toContain('## Cross-phase ladder');
    expect(md).toContain('suppressed');
    expect(md).toContain('preserve atomicity');
  });
});

describe('computeOkrRollupVerdict', () => {
  function makeCanonicalSources(over: Partial<AuditReportInputSources> = {}): AuditReportInputSources {
    return {
      okr: 'github', chain: 'github', ladder: 'github',
      keys: 'github-verified', prd: 'github', artifact: 'github',
      runnerInput: 'github-verified',
      ...over,
    };
  }
  function makeDigest(over: Partial<PhaseRollupDigest> = {}): PhaseRollupDigest {
    return {
      phase: 'why',
      runId: 'WHY-x',
      actionId: 'ACT-1',
      status: 'complete',
      completedAt: '2026-05-25T10:00:00Z',
      artifactPath: 'okrs/X/why/research-doc.md',
      prUrl: null,
      evidenceComplete: true,
      evidenceGaps: [],
      verdict: { seal: { sealed: true }, totalEvents: 0, malformedLines: 0, unsignedAgentEvents: 0, signedWorkflowEvents: 0, originKindMismatches: 0, firstFailure: null, shapeOk: true },
      runnerVerdict: { invoked: true, ok: true, chainHead: 'a'.repeat(64), eventCount: 5 },
      sources: makeCanonicalSources(),
      agentStats: { signedAgent: 4, totalAgent: 4 },
      reviewSummary: [],
      chainHead: 'a'.repeat(64),
      eventCount: 5,
      perActionReportPath: 'WHY-x-report.md',
      ...over,
    };
  }
  function makeInput(over: Partial<OkrRollupInput> = {}): OkrRollupInput {
    return {
      okrId: 'OKR-X',
      objective: null,
      owner: null,
      tier: null,
      barId: null,
      createdAt: null,
      completedAt: null,
      phases: [makeDigest({ phase: 'why' }), makeDigest({ phase: 'how' }), makeDigest({ phase: 'what' })],
      missingPhases: [],
      chainLadderText: null,
      ladderSource: 'missing',
      controlRows: [],
      prdSource: 'github',
      artifactSource: 'github',
      sourceTag: 'GitHub canonical',
      repoInfo: null,
      ...over,
    };
  }

  it('FAIL > PARTIAL > PASS precedence: FAIL wins when both present', () => {
    // All 3 phases but one has runner FAIL → FAIL (not PARTIAL or PASS)
    const out = computeOkrRollupVerdict(makeInput({
      phases: [
        makeDigest({ phase: 'why' }),
        makeDigest({ phase: 'how', runnerVerdict: { invoked: true, ok: false, reason: 'tamper' } }),
        makeDigest({ phase: 'what' }),
      ],
    }));
    expect(out.verdict).toBe('FAIL');
    expect(out.reason).toContain('HOW');
    expect(out.reason).toContain('tamper');
  });

  it('FAIL > PARTIAL: FAIL wins when one phase fails AND another phase missing', () => {
    const out = computeOkrRollupVerdict(makeInput({
      phases: [
        makeDigest({ phase: 'why' }),
        makeDigest({ phase: 'how', evidenceComplete: false, evidenceGaps: ['chain missing'] }),
      ],
      missingPhases: ['what'],
    }));
    expect(out.verdict).toBe('FAIL');
    expect(out.reason).toContain('HOW');
  });

  it('PARTIAL when OKR missing phases AND all present phases pass', () => {
    const out = computeOkrRollupVerdict(makeInput({
      phases: [makeDigest({ phase: 'why' })],
      missingPhases: ['how', 'what'],
    }));
    expect(out.verdict).toBe('PARTIAL');
    expect(out.reason).toContain('HOW, WHAT');
  });

  it('PARTIAL when all 3 phases present but one phase runner not invoked (innocent reason)', () => {
    const out = computeOkrRollupVerdict(makeInput({
      phases: [
        makeDigest({ phase: 'why' }),
        makeDigest({ phase: 'how' }),
        makeDigest({
          phase: 'what',
          runnerVerdict: { invoked: false, reason: 'npx not found on PATH' },
        }),
      ],
    }));
    expect(out.verdict).toBe('PARTIAL');
    expect(out.reason).toContain('WHAT phase runner NOT INVOKED');
  });

  it('PASS when all 3 phases present + runner-verified + source-atomic + evidence complete', () => {
    const out = computeOkrRollupVerdict(makeInput());
    expect(out.verdict).toBe('PASS');
    expect(out.reason).toContain('source-atomic');
  });

  it('FAIL when keys=mismatch breaks atomicity even if runner not invoked', () => {
    const out = computeOkrRollupVerdict(makeInput({
      phases: [
        makeDigest({ phase: 'why' }),
        makeDigest({ phase: 'how' }),
        makeDigest({
          phase: 'what',
          sources: makeCanonicalSources({ keys: 'mismatch', runnerInput: 'not-applicable' }),
          runnerVerdict: { invoked: false, reason: 'keys mismatch' },
        }),
      ],
    }));
    expect(out.verdict).toBe('FAIL');
    expect(out.reason).toContain('WHAT');
    expect(out.reason).toContain('atomicity');
  });

  it('FAIL when runnerInput=jsonl-mismatch breaks atomicity', () => {
    const out = computeOkrRollupVerdict(makeInput({
      phases: [
        makeDigest({
          phase: 'why',
          sources: makeCanonicalSources({ runnerInput: 'jsonl-mismatch' }),
          runnerVerdict: { invoked: false, reason: 'jsonl drift' },
        }),
        makeDigest({ phase: 'how' }),
        makeDigest({ phase: 'what' }),
      ],
    }));
    expect(out.verdict).toBe('FAIL');
    expect(out.reason).toContain('WHY');
  });
});

describe('composeOkrRollupSourceTag', () => {
  const REPO = { owner: 'AliceNN-ucdenver', repo: 'mesh' };
  function mkSources(over: Partial<AuditReportInputSources> = {}): AuditReportInputSources {
    return {
      okr: 'github', chain: 'github', ladder: 'github',
      keys: 'github-verified', prd: 'github', artifact: 'github',
      runnerInput: 'github-verified',
      ...over,
    };
  }
  // Codex E4-r1 MINOR fix: signature changed from sources[] to
  // {phase, sources}[] so labels use each digest's actual phase,
  // not array position. Tests construct the pair shape explicitly.
  function mkPair(phase: 'why' | 'how' | 'what', over: Partial<AuditReportInputSources> = {}) {
    return { phase, sources: mkSources(over) };
  }
  const LOCAL_OVER: Partial<AuditReportInputSources> = {
    okr: 'local-fallback', chain: 'local-fallback', ladder: 'local-fallback',
    keys: 'local-only', prd: 'local-fallback', artifact: 'local-fallback',
    runnerInput: 'local-only',
  };
  const BROKEN_OVER: Partial<AuditReportInputSources> = { keys: 'mismatch', runnerInput: 'not-applicable' };

  it('returns canonical headline only when ALL phases canonical', () => {
    const tag = composeOkrRollupSourceTag(
      [mkPair('why'), mkPair('how'), mkPair('what')],
      REPO,
    );
    expect(tag).toBe('GitHub AliceNN-ucdenver/mesh (default branch)');
  });

  it('returns local mesh headline when ALL phases local-fallback', () => {
    const tag = composeOkrRollupSourceTag(
      [mkPair('why', LOCAL_OVER), mkPair('how', LOCAL_OVER), mkPair('what', LOCAL_OVER)],
      REPO,
    );
    expect(tag).toBe('local mesh checkout');
  });

  it('returns MIXED + names broken phase when one phase non-atomic', () => {
    const tag = composeOkrRollupSourceTag(
      [mkPair('why'), mkPair('how', BROKEN_OVER), mkPair('what')],
      REPO,
    );
    expect(tag).toContain('MIXED');
    // Broken phase is HOW.
    expect(tag).toContain('HOW');
    expect(tag).not.toBe('GitHub AliceNN-ucdenver/mesh (default branch)');
  });

  it('returns MIXED + names multiple broken phases when more than one non-atomic', () => {
    const tag = composeOkrRollupSourceTag(
      [mkPair('why'), mkPair('how', BROKEN_OVER), mkPair('what', BROKEN_OVER)],
      REPO,
    );
    expect(tag).toContain('MIXED');
    expect(tag).toContain('HOW');
    expect(tag).toContain('WHAT');
  });

  it('returns MIXED when some phases canonical and others local (not all-canonical, not all-local)', () => {
    const tag = composeOkrRollupSourceTag(
      [mkPair('why'), mkPair('how', LOCAL_OVER), mkPair('what')],
      REPO,
    );
    expect(tag).toContain('MIXED');
  });

  // Codex E4-r1 MINOR fix regression test: malformed/reset OKR where
  // the started-phases array doesn't start at WHY. Pre-fix used array
  // index to label, so a broken HOW phase at position 0 would be
  // mislabelled as "WHY". Post-fix uses each digest's actual phase.
  it('labels broken phase by its actual phase field, not array position (Codex E4-r1 MINOR)', () => {
    // Only HOW started (no WHY). HOW is at array position 0 but its
    // phase field says 'how'. Pre-fix would have labelled it "WHY".
    const tag = composeOkrRollupSourceTag(
      [mkPair('how', BROKEN_OVER)],
      REPO,
    );
    expect(tag).toContain('MIXED');
    expect(tag).toContain('HOW');
    expect(tag).not.toContain('WHY');
  });
});

// ============================================================================
// D-PR8 — implementation chain pure pieces:
//   - parseImplementationChainBlock (extract YAML frontmatter from PR body)
//   - verifyImplementationChainEntry (cross-axis verification)
//   - computeOkrRollupVerdict extension (impl chain FAIL/PARTIAL signals)
//   - buildOkrRollupMarkdown extension (Implementation chain section)
// ============================================================================

const FULL_CHAIN: ImplementationChainEntry = {
  okr_id: 'OKR-2026Q3-IMDB-002-celeb-api',
  parent_phase: 'what',
  parent_run_id: 'WHAT-2026-06-10-abc123',
  implementation_run_id: 'IMPL-2026-06-15-celeb-api-x7n2qk',
  mesh_repo: 'acme/governance-mesh',
  target_repo: 'acme/celeb-api',
  event_log_path: '.maintainability/audit/events/IMPL-2026-06-15-celeb-api-x7n2qk.jsonl',
  key_path: '.maintainability/audit/keys/IMPL-2026-06-15-celeb-api-x7n2qk.epoch-1.pub.pem',
  parent_intent_thread: '2e28b567-ab8a-4ad0-a29d-632673f412a9',
  parent_chain_root: '87edfc98924d2956abcdef0123456789012345678901234567890abcdef012345',
  // Codex-r2 Bug 2 — distinct from parent_chain_root: this is the
  // impl chain's OWN first-event hash. Hex string different from
  // parent_chain_root above so tests catch any future confusion.
  chain_root_hash: 'aa11bb22cc33dd44ee55ff66112233445566778899aabbccddeeff0011223344',
};

function makeChainPrBody(chain: Partial<ImplementationChainEntry> = {}): string {
  const merged = { ...FULL_CHAIN, ...chain };
  const yamlLines = [
    '---',
    'implementation_chain:',
    `  okr_id: ${merged.okr_id}`,
    `  parent_phase: ${merged.parent_phase}`,
    `  parent_run_id: ${merged.parent_run_id}`,
    `  implementation_run_id: ${merged.implementation_run_id}`,
    `  mesh_repo: ${merged.mesh_repo}`,
    `  target_repo: ${merged.target_repo}`,
    `  event_log_path: ${merged.event_log_path}`,
    `  key_path: ${merged.key_path}`,
    `  parent_intent_thread: ${merged.parent_intent_thread}`,
    `  parent_chain_root: ${merged.parent_chain_root}`,
    `  chain_root_hash: ${merged.chain_root_hash}`,
    '---',
    '',
    'Implements the celeb-api slice for OKR-2026Q3-IMDB-002.',
  ];
  return yamlLines.join('\n');
}

describe('parseImplementationChainBlock', () => {
  it('extracts a fully-populated implementation_chain block', () => {
    const parsed = parseImplementationChainBlock(makeChainPrBody());
    expect(parsed).not.toBeNull();
    expect(parsed!.okr_id).toBe(FULL_CHAIN.okr_id);
    expect(parsed!.parent_phase).toBe('what');
    expect(parsed!.implementation_run_id).toBe('IMPL-2026-06-15-celeb-api-x7n2qk');
    expect(parsed!.parent_chain_root).toBe(FULL_CHAIN.parent_chain_root);
  });

  it('returns null on null/empty PR body', () => {
    expect(parseImplementationChainBlock(null)).toBeNull();
    expect(parseImplementationChainBlock(undefined)).toBeNull();
    expect(parseImplementationChainBlock('')).toBeNull();
  });

  it('returns null when PR body has no implementation_chain block', () => {
    const body = '---\nfoo: bar\n---\n\nNot a fan-out PR.';
    expect(parseImplementationChainBlock(body)).toBeNull();
  });

  it('returns null when YAML inside the block does not parse', () => {
    const body = '---\nimplementation_chain:\n  okr_id: [unterminated\n---';
    expect(parseImplementationChainBlock(body)).toBeNull();
  });

  it('treats absent fields as empty strings (preserves partial blocks)', () => {
    const body = [
      '---',
      'implementation_chain:',
      '  okr_id: OKR-X',
      '  parent_phase: what',
      // intentionally missing the rest
      '---',
    ].join('\n');
    const parsed = parseImplementationChainBlock(body);
    expect(parsed).not.toBeNull();
    expect(parsed!.okr_id).toBe('OKR-X');
    expect(parsed!.parent_run_id).toBe('');
    expect(parsed!.parent_chain_root).toBe('');
  });
});

describe('verifyImplementationChainEntry', () => {
  it('returns empty array for a fully-valid entry that matches expectations', () => {
    const issues = verifyImplementationChainEntry(
      FULL_CHAIN,
      FULL_CHAIN.parent_intent_thread,
      FULL_CHAIN.parent_chain_root,
    );
    expect(issues).toEqual([]);
  });

  it('reports evidence-missing for the whole block when entry is null', () => {
    const issues = verifyImplementationChainEntry(null, 'x', 'y');
    expect(issues).toHaveLength(1);
    expect(issues[0]).toEqual({ kind: 'evidence-missing', field: 'implementation_chain' });
  });

  it('reports per-field evidence-missing for empty fields', () => {
    const partial: ImplementationChainEntry = { ...FULL_CHAIN, event_log_path: '', key_path: '' };
    const issues = verifyImplementationChainEntry(partial, FULL_CHAIN.parent_intent_thread, FULL_CHAIN.parent_chain_root);
    expect(issues).toHaveLength(2);
    expect(issues.some(i => i.kind === 'evidence-missing' && i.field === 'event_log_path')).toBe(true);
    expect(issues.some(i => i.kind === 'evidence-missing' && i.field === 'key_path')).toBe(true);
  });

  it('reports cross-repo-thread-broken when parent_intent_thread mismatches', () => {
    const issues = verifyImplementationChainEntry(
      FULL_CHAIN,
      'different-thread-uuid',
      FULL_CHAIN.parent_chain_root,
    );
    expect(issues.some(i => i.kind === 'cross-repo-thread-broken')).toBe(true);
    const threadIssue = issues.find(i => i.kind === 'cross-repo-thread-broken')!;
    if (threadIssue.kind !== 'cross-repo-thread-broken') throw new Error('narrow');
    expect(threadIssue.got).toBe(FULL_CHAIN.parent_intent_thread);
    expect(threadIssue.expected).toBe('different-thread-uuid');
  });

  it('reports cross-repo-chain-root-mismatch when parent_chain_root mismatches', () => {
    const issues = verifyImplementationChainEntry(
      FULL_CHAIN,
      FULL_CHAIN.parent_intent_thread,
      'different-chain-root',
    );
    expect(issues.some(i => i.kind === 'cross-repo-chain-root-mismatch')).toBe(true);
  });

  it('skips cross-axis verification when expected values are null', () => {
    const issues = verifyImplementationChainEntry(FULL_CHAIN, null, null);
    expect(issues).toEqual([]); // no cross-axis, no field-missing → clean
  });

  it('collects multiple issues simultaneously (not short-circuit)', () => {
    const partial: ImplementationChainEntry = { ...FULL_CHAIN, mesh_repo: '', parent_chain_root: 'wrong-root' };
    const issues = verifyImplementationChainEntry(partial, FULL_CHAIN.parent_intent_thread, FULL_CHAIN.parent_chain_root);
    expect(issues.length).toBeGreaterThanOrEqual(2);
    expect(issues.some(i => i.kind === 'evidence-missing' && i.field === 'mesh_repo')).toBe(true);
    expect(issues.some(i => i.kind === 'cross-repo-chain-root-mismatch')).toBe(true);
  });

  it('Codex-r2 Bug 2: chain_root_hash is a required field distinct from parent_chain_root', () => {
    // FULL_CHAIN explicitly sets chain_root_hash to a DIFFERENT hex
    // string than parent_chain_root -- this test pins that they aren't
    // accidentally aliased in the type or parser.
    expect(FULL_CHAIN.chain_root_hash).not.toBe(FULL_CHAIN.parent_chain_root);

    // Missing chain_root_hash → evidence-missing.
    const missingRoot: ImplementationChainEntry = { ...FULL_CHAIN, chain_root_hash: '' };
    const issues = verifyImplementationChainEntry(missingRoot, FULL_CHAIN.parent_intent_thread, FULL_CHAIN.parent_chain_root);
    expect(issues.some(i => i.kind === 'evidence-missing' && i.field === 'chain_root_hash')).toBe(true);

    // Parser also round-trips both distinct values.
    const body = makeChainPrBody();
    const parsed = parseImplementationChainBlock(body);
    expect(parsed?.chain_root_hash).toBe(FULL_CHAIN.chain_root_hash);
    expect(parsed?.parent_chain_root).toBe(FULL_CHAIN.parent_chain_root);
    expect(parsed?.chain_root_hash).not.toBe(parsed?.parent_chain_root);
  });
});

describe('computeOkrRollupVerdict — implementation chain signals', () => {
  function mkCanonicalSources(): AuditReportInputSources {
    return {
      okr: 'github', chain: 'github', ladder: 'github', keys: 'github-verified',
      prd: 'github', artifact: 'github', runnerInput: 'github-verified',
    };
  }
  function mkPhase(over: Partial<PhaseRollupDigest> = {}): PhaseRollupDigest {
    const phase = over.phase ?? 'why';
    return {
      phase, runId: `${phase.toUpperCase()}-X`, actionId: 'ACT-1', status: 'complete',
      completedAt: 'T0', artifactPath: 'x', prUrl: null,
      evidenceComplete: true, evidenceGaps: [],
      verdict: { seal: { sealed: true }, totalEvents: 0, malformedLines: 0, unsignedAgentEvents: 0, signedWorkflowEvents: 0, originKindMismatches: 0, firstFailure: null, shapeOk: true },
      runnerVerdict: { invoked: true, ok: true, chainHead: 'h', eventCount: 1 },
      sources: mkCanonicalSources(), agentStats: { signedAgent: 1, totalAgent: 1 }, reviewSummary: [],
      chainHead: 'h', eventCount: 1, perActionReportPath: 'p',
      ...over,
    };
  }
  function mkInput(implChain?: OkrRollupInput['implementationChain']): OkrRollupInput {
    return {
      okrId: 'OKR-X', objective: null, owner: null, tier: null, barId: null,
      createdAt: null, completedAt: null,
      phases: [mkPhase({ phase: 'why' }), mkPhase({ phase: 'how' }), mkPhase({ phase: 'what' })],
      missingPhases: [], chainLadderText: null, ladderSource: 'github',
      controlRows: [], prdSource: 'github', artifactSource: 'github',
      sourceTag: 'x', repoInfo: null,
      implementationChain: implChain,
    };
  }
  function mkRow(over: Partial<ImplementationChainRow> = {}): ImplementationChainRow {
    return {
      repoSlug: 'acme/celeb-api',
      status: 'pr-merged',
      prUrl: 'https://github.com/acme/celeb-api/pull/42',
      chain: { ...FULL_CHAIN },
      ...over,
    };
  }

  it('PASS when all phases pass + all impl chain rows verify cleanly', () => {
    const v = computeOkrRollupVerdict(mkInput({
      rows: [mkRow()],
      expectedIntentThread: FULL_CHAIN.parent_intent_thread,
      expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
    }));
    expect(v.verdict).toBe('PASS');
  });

  it('FAIL with cross-repo-thread-broken when impl PR thread mismatches', () => {
    const v = computeOkrRollupVerdict(mkInput({
      rows: [mkRow()],
      expectedIntentThread: 'different-uuid',
      expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
    }));
    expect(v.verdict).toBe('FAIL');
    expect(v.reason).toMatch(/^cross-repo-thread-broken:acme\/celeb-api/);
  });

  it('FAIL with cross-repo-chain-root-mismatch when impl PR root mismatches', () => {
    const v = computeOkrRollupVerdict(mkInput({
      rows: [mkRow()],
      expectedIntentThread: FULL_CHAIN.parent_intent_thread,
      expectedWhatChainRoot: 'different-root',
    }));
    expect(v.verdict).toBe('FAIL');
    expect(v.reason).toMatch(/^cross-repo-chain-root-mismatch:acme\/celeb-api/);
  });

  it('FAIL with implementation-chain-evidence-missing when PR body missing the block', () => {
    const v = computeOkrRollupVerdict(mkInput({
      rows: [mkRow({ chain: null })],
      expectedIntentThread: FULL_CHAIN.parent_intent_thread,
      expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
    }));
    expect(v.verdict).toBe('FAIL');
    expect(v.reason).toMatch(/^implementation-chain-evidence-missing:acme\/celeb-api/);
  });

  it('PARTIAL with implementation-pr-rejected when impl PR was closed without merging', () => {
    const v = computeOkrRollupVerdict(mkInput({
      rows: [mkRow({ status: 'pr-rejected' })],
      expectedIntentThread: FULL_CHAIN.parent_intent_thread,
      expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
    }));
    expect(v.verdict).toBe('PARTIAL');
    expect(v.reason).toMatch(/^implementation-pr-rejected:acme\/celeb-api/);
  });

  it('skips non-merged rows for FAIL-precedence cross-axis checks (only pr-merged is verified)', () => {
    // Codex-r1 Bug D update: a row at pr-opened no longer PASSes the
    // rollup outright -- it now downgrades to PARTIAL implementation-
    // pr-in-flight because the work hasn't closed out. This still
    // proves "cross-axis FAIL only runs on merged rows" (the broken
    // chain block on the open row isn't surfaced as FAIL); it just
    // also surfaces the more honest PARTIAL signal.
    const v = computeOkrRollupVerdict(mkInput({
      rows: [mkRow({ status: 'pr-opened', chain: null })],
      expectedIntentThread: FULL_CHAIN.parent_intent_thread,
      expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
    }));
    expect(v.verdict).toBe('PARTIAL');
    expect(v.reason).toMatch(/^implementation-pr-in-flight:/);
  });

  it('PARTIAL with implementation-pr-in-flight when any row is opened/pr-opened/pending-on-upstream (Codex-r1 Bug D)', () => {
    for (const status of ['opened', 'pr-opened', 'pending-on-upstream'] as const) {
      const v = computeOkrRollupVerdict(mkInput({
        rows: [mkRow({ status, chain: null })],
        expectedIntentThread: FULL_CHAIN.parent_intent_thread,
        expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
      }));
      expect(v.verdict, `status=${status}`).toBe('PARTIAL');
      expect(v.reason).toMatch(/^implementation-pr-in-flight:acme\/celeb-api/);
    }
  });

  it('implementation-pr-rejected PARTIAL takes precedence over in-flight PARTIAL', () => {
    // When one row is rejected AND another is in-flight, the rejected
    // signal wins because rejection is a stronger negative (the slice
    // failed review) than in-flight (the slice hasn't shipped yet).
    const v = computeOkrRollupVerdict(mkInput({
      rows: [
        mkRow({ repoSlug: 'acme/rejected', status: 'pr-rejected' }),
        mkRow({ repoSlug: 'acme/inflight', status: 'pr-opened', chain: null }),
      ],
      expectedIntentThread: FULL_CHAIN.parent_intent_thread,
      expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
    }));
    expect(v.verdict).toBe('PARTIAL');
    expect(v.reason).toMatch(/^implementation-pr-rejected:acme\/rejected/);
  });

  it('ignores implementationChain when not supplied (back-compat for pre-Tier-2 OKRs)', () => {
    const v = computeOkrRollupVerdict(mkInput(undefined));
    expect(v.verdict).toBe('PASS');
  });

  it('per-phase FAIL takes precedence over impl chain FAIL (atomicity > impl)', () => {
    const broken = mkInput({
      rows: [mkRow({ status: 'pr-merged', chain: null })], // impl FAIL
      expectedIntentThread: FULL_CHAIN.parent_intent_thread,
      expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
    });
    broken.phases[0].evidenceComplete = false;
    broken.phases[0].evidenceGaps = ['JSONL not present in chain'];
    const v = computeOkrRollupVerdict(broken);
    expect(v.verdict).toBe('FAIL');
    expect(v.reason).toMatch(/WHY phase has incomplete evidence/);
  });

  it('missing-phase PARTIAL takes precedence over impl-pr-rejected PARTIAL', () => {
    const v = computeOkrRollupVerdict({
      ...mkInput({
        rows: [mkRow({ status: 'pr-rejected' })],
        expectedIntentThread: FULL_CHAIN.parent_intent_thread,
        expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
      }),
      missingPhases: ['what'],
      phases: [mkPhase({ phase: 'why' }), mkPhase({ phase: 'how' })],
    });
    expect(v.verdict).toBe('PARTIAL');
    expect(v.reason).toMatch(/WHAT phase\(s\) not started yet/);
  });
});

describe('buildOkrRollupMarkdown — implementation chain section', () => {
  function mkCanonicalSources(): AuditReportInputSources {
    return {
      okr: 'github', chain: 'github', ladder: 'github', keys: 'github-verified',
      prd: 'github', artifact: 'github', runnerInput: 'github-verified',
    };
  }
  function mkPhase(phase: 'why' | 'how' | 'what'): PhaseRollupDigest {
    return {
      phase, runId: `${phase.toUpperCase()}-X`, actionId: 'ACT-1', status: 'complete',
      completedAt: 'T0', artifactPath: 'x', prUrl: null,
      evidenceComplete: true, evidenceGaps: [],
      verdict: { seal: { sealed: true }, totalEvents: 0, malformedLines: 0, unsignedAgentEvents: 0, signedWorkflowEvents: 0, originKindMismatches: 0, firstFailure: null, shapeOk: true },
      runnerVerdict: { invoked: true, ok: true, chainHead: 'h', eventCount: 1 },
      sources: mkCanonicalSources(), agentStats: { signedAgent: 1, totalAgent: 1 }, reviewSummary: [],
      chainHead: 'h', eventCount: 1, perActionReportPath: 'p',
    };
  }
  const baseInput: OkrRollupInput = {
    okrId: 'OKR-Y', objective: null, owner: null, tier: null, barId: null,
    createdAt: null, completedAt: null,
    phases: [mkPhase('why'), mkPhase('how'), mkPhase('what')],
    missingPhases: [], chainLadderText: null, ladderSource: 'github',
    controlRows: [], prdSource: 'github', artifactSource: 'github',
    sourceTag: 'x', repoInfo: null,
  };

  it('omits the Implementation chain section when implementationChain is undefined', () => {
    const md = buildOkrRollupMarkdown(baseInput);
    expect(md).not.toContain('## Implementation chain');
  });

  it('omits the Implementation chain section when rows is empty', () => {
    const md = buildOkrRollupMarkdown({
      ...baseInput,
      implementationChain: { rows: [], expectedIntentThread: null, expectedWhatChainRoot: null },
    });
    expect(md).not.toContain('## Implementation chain');
  });

  it('renders the Implementation chain table when rows present', () => {
    const md = buildOkrRollupMarkdown({
      ...baseInput,
      implementationChain: {
        rows: [{
          repoSlug: 'acme/celeb-api',
          status: 'pr-merged',
          prUrl: 'https://github.com/acme/celeb-api/pull/42',
          chain: { ...FULL_CHAIN },
        }],
        expectedIntentThread: FULL_CHAIN.parent_intent_thread,
        expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
      },
    });
    expect(md).toContain('## Implementation chain');
    expect(md).toContain('acme/celeb-api');
    expect(md).toContain('IMPL-2026-06-15-celeb-api-x7n2qk');
    // Both ✓ marks present for matching root + thread
    expect(md).toMatch(/\| ✓ \| ✓ \|/);
    expect(md).toContain('_not-yet-verified_'); // runner-verify placeholder
  });

  it('surfaces issue details below the table when verification fails', () => {
    const md = buildOkrRollupMarkdown({
      ...baseInput,
      implementationChain: {
        rows: [{
          repoSlug: 'acme/celeb-api',
          status: 'pr-merged',
          prUrl: 'https://github.com/acme/celeb-api/pull/42',
          chain: { ...FULL_CHAIN, parent_chain_root: 'wrong-root' },
        }],
        expectedIntentThread: FULL_CHAIN.parent_intent_thread,
        expectedWhatChainRoot: FULL_CHAIN.parent_chain_root,
      },
    });
    expect(md).toContain('**Implementation chain issues**');
    expect(md).toContain('cross-repo-chain-root-mismatch');
    expect(md).toContain('wrong-root');
  });
});
