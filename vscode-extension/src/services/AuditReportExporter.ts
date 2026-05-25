// ============================================================================
// AuditReportExporter — Phase E E3 (2026-05-25)
//
// Pure-function chain → markdown reviewer report. Given a JSONL chain
// + OKR metadata + chain-ladder context, produces a self-contained
// reviewer-facing markdown document that captures the run's trust
// posture, evidence, and lineage. Saved under
// okrs/<okrId>/audit/exports/<runId>-report.md so reviewers can
// commit it to the mesh alongside the artifact for durable record.
//
// Designed so the test surface is the pure function — the caller
// (LookingGlassPanel.onExportAuditReport) just glues file I/O + the
// VS Code "open document" UX.
// ============================================================================

// E3 shape — caller (LookingGlassPanel) imports verifyChainForUI from
// the webview layer and passes the verdict in. Architectural rule:
// services/ MUST NOT depend on webview/ (one-way arrow). Inverting the
// dependency means the exporter takes a verdict-shaped object as
// input rather than importing the verifier.
export interface ChainVerifyVerdictLite {
  seal: { sealed?: boolean; sealTampered?: boolean };
  totalEvents: number;
  malformedLines: number;
  unsignedAgentEvents: number;
  signedWorkflowEvents: number;
  originKindMismatches: number;
  firstFailure: { line: number; kind: string; reason: string } | null;
  shapeOk: boolean;
}

export interface AuditReportInput {
  okrId: string;
  runId: string;
  phase: 'why' | 'how' | 'what';
  actionId: string;
  agent: string;
  intentThreadUuid: string;
  parentIntentThread: string | null;
  governanceTier: string;
  status: string;
  createdAt: string | null;
  completedAt: string | null;
  hatterChainRoot: string | null;
  prUrl: string | null;
  artifactPath: string | null;
  /** Raw JSONL lines (one event per line, blanks stripped). */
  chainLines: string[];
  /** Optional chain-ladder.yaml content for cross-phase context. */
  chainLadderText: string | null;
  /** Verdict produced by the caller via verifyChainForUI(chainLines). */
  verdict: ChainVerifyVerdictLite;
  /**
   * Codex E3 review finding (2026-05-25) — names where the okr.yaml +
   * chain bytes were sourced from (e.g. "GitHub owner/repo (default
   * branch)" vs "local mesh checkout"). The report header renders
   * this so a reviewer can tell whether they're looking at canonical
   * post-finalize state OR a possibly-stale local export. Required
   * input — caller MUST set it explicitly (no default).
   */
  sourceTag: string;
}

interface ChainEvent {
  event_id?: number;
  event_kind?: string;
  signature?: string;
  signer_epoch?: unknown;
  payload?: {
    skill?: string;
    persona?: string;
    round?: number;
    score?: number;
    severity?: string;
    emitted_by?: string;
    path?: string;
    sha256?: string;
    bytes?: number;
    merge_commit_sha?: string;
    from?: string;
    to?: string;
    pr_number?: number;
    ok?: boolean;
    reason?: string;
    [k: string]: unknown;
  };
}

function shortHash(s: string | null | undefined, n = 16): string {
  if (!s) { return '—'; }
  return s.length > n + 1 ? `${s.slice(0, n)}…` : s;
}

function parseChain(lines: string[]): ChainEvent[] {
  const out: ChainEvent[] = [];
  for (const line of lines) {
    if (!line.trim()) { continue; }
    try { out.push(JSON.parse(line) as ChainEvent); } catch { /* skip — surfaced in verdict */ }
  }
  return out;
}

function summarizeSkillCalls(events: ChainEvent[]): { name: string; count: number; failed: number }[] {
  const map = new Map<string, { count: number; failed: number }>();
  for (const e of events) {
    if (e.event_kind !== 'skill_call') { continue; }
    const skill = e.payload?.skill;
    if (!skill) { continue; }
    const cur = map.get(skill) ?? { count: 0, failed: 0 };
    cur.count++;
    if (e.payload?.ok === false) { cur.failed++; }
    map.set(skill, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Codex E3 review finding (2026-05-25) — replicate the runner's full
 * self_review legitimacy contract here, NOT just the signature-presence
 * check. Pre-fix the aggregator gated on `!e.signature`, which would
 * have admitted a forged event whose payload.emitted_by lied about
 * origin OR whose signer_epoch was missing or non-numeric. Trust
 * posture would correctly flag the chain as tampered, but the report
 * could still print "scored 0.96 PASS" off a forged event. Now mirror
 * the runner's checks: agent-origin attribution + signature presence
 * + numeric signer_epoch. Matches isEventLegitimate's agent-event
 * branch in src/webview/chainVerify.ts (kept inline here because the
 * architecture rule forbids services/ → webview/).
 */
function isSelfReviewLegitimate(e: ChainEvent): boolean {
  if (e.event_kind !== 'self_review') { return false; }
  // Bug Y origin-kind: self_review MUST come from the agent. A forged
  // event mis-attributing origin is rejected by the runner; the
  // report MUST drop it before aggregation.
  if (e.payload?.emitted_by !== 'agent') { return false; }
  // Bug V: agent events MUST carry a signature.
  if (typeof e.signature !== 'string' || e.signature.length === 0) { return false; }
  // Bug X round-8: agent events MUST carry numeric signer_epoch.
  if (typeof e.signer_epoch !== 'number') { return false; }
  return true;
}

function summarizeSelfReview(events: ChainEvent[]): { persona: string; rounds: { round: number; score: number | null; severity: string | null; eventId: number | null }[] }[] {
  const byPersona = new Map<string, Map<number, { score: number | null; severity: string | null; eventId: number | null }>>();
  for (const e of events) {
    if (!isSelfReviewLegitimate(e)) { continue; }
    const p = e.payload?.persona;
    const r = e.payload?.round;
    if (!p || r === undefined) { continue; }
    const rounds = byPersona.get(p) ?? new Map();
    rounds.set(r, {
      score: typeof e.payload?.score === 'number' ? e.payload.score : null,
      severity: typeof e.payload?.severity === 'string' ? e.payload.severity : null,
      // event_id citation per E3-polish — lets auditor jump straight
      // to the chain event that supports the score claim.
      eventId: typeof e.event_id === 'number' ? e.event_id : null,
    });
    byPersona.set(p, rounds);
  }
  return [...byPersona.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([persona, rounds]) => ({
      persona,
      rounds: [...rounds.entries()].sort(([a], [b]) => a - b).map(([round, v]) => ({ round, ...v })),
    }));
}

/**
 * E3-polish — count signed vs total agent events so the seal headline
 * can name what's actually verified (shape-only) vs what would require
 * the runner (Ed25519 signature math). The pair (signed/total) tells
 * an auditor immediately whether the chain CLAIMS to be sealed
 * (signatures + epochs present) and whether anything's missing.
 */
function countAgentEventStats(events: ChainEvent[]): { signedAgent: number; totalAgent: number } {
  let signedAgent = 0;
  let totalAgent = 0;
  for (const e of events) {
    const claimsWorkflow = e.payload?.emitted_by === 'workflow';
    if (claimsWorkflow) { continue; }
    // Anything not workflow-attributed is agent-emitted (per Bug Y
    // origin-kind contract). skill_call origin='runtime' is signed
    // by the runtime, which uses the agent's per-session key, so it
    // counts as a signed agent event for trust purposes.
    totalAgent++;
    if (typeof e.signature === 'string' && e.signature.length > 0) {
      signedAgent++;
    }
  }
  return { signedAgent, totalAgent };
}

/**
 * E3-polish — derive an executive verdict block from the verdict +
 * self-review trail. Goal: an auditor reads the first five lines and
 * knows VERDICT / RISK / ACTION / SCOPE without parsing the body.
 */
function buildExecutiveSummary(
  input: AuditReportInput,
  events: ChainEvent[],
  reviewSummary: ReturnType<typeof summarizeSelfReview>,
  agentStats: { signedAgent: number; totalAgent: number },
): string {
  const v = input.verdict;
  // VERDICT — three states the runner verifier also uses.
  // CAVEAT: this verdict is SHAPE-ONLY. Even PASS here does NOT prove
  // Ed25519 signatures verify against the per-epoch pub keys, NOR
  // does it prove the chain's hash continuity is intact. The runner's
  // `skill-audit-verify-chain` is the only path to a sign-off verdict
  // for fan-out / coding-agent handoff. The ACTION line below names
  // that explicitly — it never says "approve for fan-out" from
  // shape alone (Codex E3 review, 2026-05-25).
  let verdictLabel: string;
  let actionLine: string;
  if (!v.shapeOk) {
    verdictLabel = 'FAIL (shape-verification failed)';
    actionLine = `REJECT — investigate first failure at line ${v.firstFailure?.line ?? '?'} (${v.firstFailure?.reason ?? 'unknown'}). Do NOT promote to fan-out.`;
  } else if (v.seal.sealed) {
    verdictLabel = 'SHAPE-CLEARED — crypto + hash verification still required';
    actionLine = 'RUN RUNNER VERIFY before fan-out. Shape checks pass + every agent event claims a signature, but Ed25519 math + per-event hash replay (prev_event_hash → this_event_hash) live in the runner — see Verifier notes for the command. Only after that verdict is green: approve for downstream coding handoff.';
  } else if (agentStats.totalAgent === 0) {
    verdictLabel = 'REVIEW (workflow-only chain, no agent events)';
    actionLine = 'MANUAL REVIEW — chain has no agent events to seal. Expected for WHY phase, unusual elsewhere.';
  } else {
    verdictLabel = 'REVIEW (mixed signal — shape ok but not sealed)';
    actionLine = 'MANUAL REVIEW — shape checks pass but Knight\'s Seal did not light. Re-run runner verify for crypto verdict.';
  }
  // RISK — driven by final-round severities + forgery counters.
  const allConverged = reviewSummary.length > 0 && reviewSummary.every(r => {
    const last = r.rounds[r.rounds.length - 1];
    return last.severity === 'PASS';
  });
  const anyMinor = reviewSummary.some(r => {
    const last = r.rounds[r.rounds.length - 1];
    return last.severity === 'MINOR';
  });
  let riskLine: string;
  if (!v.shapeOk || v.malformedLines > 0 || v.unsignedAgentEvents > 0 || v.signedWorkflowEvents > 0 || v.originKindMismatches > 0) {
    riskLine = `HIGH — chain has integrity issues (${[
      v.malformedLines > 0 ? `${v.malformedLines} malformed` : '',
      v.unsignedAgentEvents > 0 ? `${v.unsignedAgentEvents} unsigned agent` : '',
      v.signedWorkflowEvents > 0 ? `${v.signedWorkflowEvents} signed-workflow forgery` : '',
      v.originKindMismatches > 0 ? `${v.originKindMismatches} origin-kind mismatch` : '',
    ].filter(Boolean).join(', ')})`;
  } else if (allConverged && reviewSummary.length >= 2) {
    const rounds = Math.max(...reviewSummary.map(r => r.rounds[r.rounds.length - 1].round));
    riskLine = `LOW — clean chain · ${reviewSummary.length} personas converged on round ${rounds}`;
  } else if (anyMinor) {
    riskLine = 'MEDIUM — final-round severity includes MINOR; review CHANGES blocks in self-review trail';
  } else if (reviewSummary.length === 0 && input.phase !== 'why') {
    riskLine = `MEDIUM — no signed self-review events for ${input.phase.toUpperCase()} (expected at least 2)`;
  } else {
    riskLine = 'LOW';
  }
  const scopeLine = `${input.phase.toUpperCase()} phase · ${input.actionId} · ${input.runId} · ${events.length} events`;
  return [
    '```',
    `VERDICT:  ${verdictLabel}`,
    `RISK:     ${riskLine}`,
    `ACTION:   ${actionLine}`,
    `SCOPE:    ${scopeLine}`,
    '```',
  ].join('\n');
}

function summarizeWorkflowEvents(events: ChainEvent[]): { artifactWritten: ChainEvent | null; stateTransition: ChainEvent | null } {
  return {
    artifactWritten: events.find(e => e.event_kind === 'artifact_written') ?? null,
    stateTransition: events.find(e => e.event_kind === 'state_transition') ?? null,
  };
}

/**
 * Build the reviewer report markdown body from the chain + metadata.
 * Pure function — input in, string out. Caller writes to disk + opens.
 */
export function buildAuditReportMarkdown(input: AuditReportInput): string {
  const events = parseChain(input.chainLines);
  const verdict = input.verdict;
  const skillSummary = summarizeSkillCalls(events);
  const reviewSummary = summarizeSelfReview(events);
  const workflowEvents = summarizeWorkflowEvents(events);
  const agentStats = countAgentEventStats(events);
  const executiveSummary = buildExecutiveSummary(input, events, reviewSummary, agentStats);

  // E3-polish — seal headline now carries the shape-vs-crypto caveat
  // in the lede. Pre-polish read "every agent event signed under
  // per-session Ed25519 keypair" which is a CRYPTO claim disguised
  // as a SHAPE claim. Honest framing names what the verifier
  // actually checked (signature + epoch presence) and what would
  // require the runner (Ed25519 math against pub keys).
  const sealLine = verdict.seal.sealed
    ? `🛡 **Sealed (shape-verified)** — ${agentStats.signedAgent}/${agentStats.totalAgent} agent events carry signature + numeric signer_epoch. Cryptographic verification (Ed25519 math against \`audit/keys/\` pub keys) requires the runner — see Verifier notes.`
    : verdict.seal.sealTampered
      ? '⚠ **Tampered** — chain has forgery indicators (see Trust posture below)'
      : 'ℹ **No agent events** — chain has workflow events only';

  const skillTable = skillSummary.length > 0
    ? [
        '| Skill | Total calls | Failed |',
        '|---|---:|---:|',
        ...skillSummary.map(s => `| \`${s.name}\` | ${s.count} | ${s.failed} |`),
      ].join('\n')
    : '_No `skill_call` events in chain._';

  // E3-polish — self-review trail entries now cite the chain event_id
  // that supports each round's score so an auditor can jump straight
  // to the source-of-record event in the JSONL without grep.
  const reviewBlock = reviewSummary.length > 0
    ? reviewSummary.map(r => {
        const lastRound = r.rounds[r.rounds.length - 1];
        const trail = r.rounds.map(rd => {
          const cite = rd.eventId != null ? ` [event_id=${rd.eventId}]` : '';
          return `r${rd.round}: ${rd.score?.toFixed(2) ?? '—'} (${rd.severity ?? '?'})${cite}`;
        }).join(' → ');
        const finalCite = lastRound.eventId != null ? ` (event_id=${lastRound.eventId})` : '';
        return `- **${r.persona}** — final: ${lastRound.score?.toFixed(2) ?? '—'} (${lastRound.severity ?? '?'})${finalCite} · trail: ${trail}`;
      }).join('\n')
    : '_No signed `self_review` events. WHY phase has none by design; HOW + WHAT chains should._';

  const aw = workflowEvents.artifactWritten?.payload;
  const st = workflowEvents.stateTransition?.payload;
  const workflowBlock = [
    aw
      ? `- **artifact_written**: \`${aw.path ?? '?'}\` · sha256 \`${shortHash(aw.sha256)}\` · ${aw.bytes ?? '?'} bytes · merge \`${shortHash(aw.merge_commit_sha, 12)}\``
      : '- **artifact_written**: _not present_ (workflow did not record on this run)',
    st
      ? `- **state_transition**: \`${st.from ?? '?'}\` → \`${st.to ?? '?'}\` · PR #${st.pr_number ?? '?'} · merge \`${shortHash(st.merge_commit_sha, 12)}\``
      : '- **state_transition**: _not present_ (meta.status did not roll forward this run)',
  ].join('\n');

  const trustBlock = verdict.shapeOk && verdict.seal.sealed
    ? '✅ All shape checks pass. Re-run `audit-verify-chain` via runner for cryptographic gold (signature math runs there, not in this exporter).'
    : verdict.firstFailure
      ? `⚠ Shape check failed at event line ${verdict.firstFailure.line} (\`${verdict.firstFailure.kind}\`): **${verdict.firstFailure.reason}**.

Total events: ${verdict.totalEvents} · Malformed lines: ${verdict.malformedLines} · Unsigned agent events: ${verdict.unsignedAgentEvents} · Signed workflow forgeries: ${verdict.signedWorkflowEvents} · Origin-kind mismatches: ${verdict.originKindMismatches}`
      : 'ℹ No failures, but chain has no agent events to sign.';

  const ladderBlock = input.chainLadderText
    ? `\n\n## Cross-phase ladder\n\n_From \`okrs/${input.okrId}/audit/chain-ladder.yaml\`:_\n\n\`\`\`yaml\n${input.chainLadderText.trim()}\n\`\`\``
    : '';

  return `# Audit report — ${input.okrId} · ${input.phase.toUpperCase()} · ${input.actionId}

> Generated by Looking Glass · ${new Date().toISOString()}
> Sources: ${input.sourceTag}

## Executive summary

${executiveSummary}

## Run identity

| Field | Value |
|---|---|
| OKR | \`${input.okrId}\` |
| Phase | \`${input.phase}\` |
| Action | \`${input.actionId}\` |
| Run ID | \`${input.runId}\` |
| Agent | ${input.agent} |
| Tier | ${input.governanceTier} |
| Status | ${input.status} |
| Created | ${input.createdAt ?? '—'} |
| Completed | ${input.completedAt ?? '—'} |
| Intent thread | \`${input.intentThreadUuid}\` |
| Parent thread | ${input.parentIntentThread ? `\`${input.parentIntentThread}\`` : '_none_'} |
| Artifact | ${input.artifactPath ? `\`${input.artifactPath}\`` : '—'} |
| PR | ${input.prUrl ? `[${input.prUrl}](${input.prUrl})` : '—'} |
| Hatter chain root | \`${shortHash(input.hatterChainRoot, 32)}\` |

## Trust posture

${sealLine}

${trustBlock}

## Evidence — skill calls

${skillTable}

## Self-review trail

${reviewBlock}

## Workflow facts

${workflowBlock}
${ladderBlock}

## Verifier notes

This report is a **SHAPE-level audit summary**, generated client-side
from the per-run audit JSONL chain + okr.yaml + chain-ladder.yaml.
**It does NOT perform** (these all require the runner):
  - Ed25519 signature verification against \`audit/keys/\` pub keys
  - Per-event hash-chain replay (\`prev_event_hash\` → \`this_event_hash\`)
  - Cross-check of \`chain_root_hash\` against recomputed leaf hash

**Before fan-out / handoff to a coding agent, run the canonical
verifier:**

\`\`\`sh
printf '{"okrId":"${input.okrId}","runId":"${input.runId}"}' \\
  | npx -y @maintainabilityai/research-runner@~0.1.42 skill-audit-verify-chain
\`\`\`

Same code path CI uses; same allowlist + origin-kind contract
(Bug V/W/X/Y). The runner's verdict is the source of truth. This
report's verdict only certifies what's checkable without key
material AND without hash recomputation — a clean shape verdict
here does NOT prove the chain hasn't been tampered with at the
signature or hash-continuity layer.
`;
}
