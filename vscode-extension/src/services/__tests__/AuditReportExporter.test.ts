/**
 * Phase E E3 regression tests for buildAuditReportMarkdown. The
 * exporter is a pure function — input shape in, markdown out.
 * These tests fix the contract so a future refactor that breaks
 * the section structure or misrenders the signed/unsigned split
 * surfaces immediately.
 */
import { describe, it, expect } from 'vitest';
import { buildAuditReportMarkdown, type AuditReportInput, type ChainVerifyVerdictLite, type RunnerVerifyVerdict } from '../AuditReportExporter';

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

  it('renders executive summary block at top with VERDICT/RISK/ACTION/SCOPE', () => {
    const md = buildAuditReportMarkdown(makeInput({
      verdict: makeVerdict({ seal: { sealed: true }, shapeOk: true, totalEvents: 28 }),
      chainLines: [
        JSON.stringify({ event_id: 1, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-architect', round: 2, score: 0.96, severity: 'PASS', emitted_by: 'agent' } }),
        JSON.stringify({ event_id: 2, event_kind: 'self_review', signature: 'sig', signer_epoch: 1, payload: { persona: 'code-security', round: 2, score: 0.95, severity: 'PASS', emitted_by: 'agent' } }),
      ],
    }));
    expect(md).toContain('## Executive summary');
    // Codex E3 review — VERDICT must NOT claim "PASS" on shape-only
    // verification. Phrasing now warns crypto + hash check still needed.
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

  it('executive summary VERDICT=FAIL with reject action when shapeOk=false', () => {
    const md = buildAuditReportMarkdown(makeInput({
      verdict: makeVerdict({
        seal: { sealed: false, sealTampered: true },
        shapeOk: false,
        totalEvents: 12,
        unsignedAgentEvents: 1,
        firstFailure: { line: 7, kind: 'self_review', reason: 'unsigned-agent-event' },
      }),
    }));
    expect(md).toContain('VERDICT:  FAIL');
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

  it('seal headline frames PASS as SHAPE-CLEARED, not approval (Codex E3 fix)', () => {
    const md = buildAuditReportMarkdown(makeInput({
      verdict: makeVerdict({ seal: { sealed: true }, shapeOk: true, totalEvents: 28 }),
    }));
    expect(md).toContain('SHAPE-CLEARED');
    expect(md).toContain('crypto + hash verification still required');
    expect(md).toContain('RUN RUNNER VERIFY before fan-out');
    // Must NOT say plain "APPROVE for downstream coding handoff" on its own —
    // the new phrasing wraps that promise in a precondition ("Only after
    // that verdict is green").
    expect(md).not.toContain('VERDICT:  PASS (shape-verified)');
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
    chain_root_hash: ${'a'.repeat(64)}
  - phase: how
    action_id: ACT-2
    run_id: HOW-2026-05-25-bbb
    status: complete
    merged_at: '2026-05-25T11:00:00Z'
    chain_root_hash: ${'b'.repeat(64)}`;
    const md = buildAuditReportMarkdown(makeInput({ chainLadderText: ladder }));
    expect(md).toContain('## Cross-phase ladder');
    expect(md).toContain('| Phase | Action | Run ID | Status | Merged | Chain head |');
    expect(md).toContain('| `why` | `ACT-1` | `WHY-2026-05-25-aaa` |');
    expect(md).toContain('| `how` | `ACT-2` | `HOW-2026-05-25-bbb` |');
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
    expect(md).toContain('| `SR-01` | — | `A01`, `A09`');
    expect(md).toContain('| `SR-02` | — | `A03`, `A05`');
    expect(md).toContain('| `SR-03` | — | `A02`, `A08`');
    expect(md).toContain('| `SR-04` | — | `A09`, `A10`');
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
});
