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

function summarizeSelfReview(events: ChainEvent[]): { persona: string; rounds: { round: number; score: number | null; severity: string | null }[] }[] {
  const byPersona = new Map<string, Map<number, { score: number | null; severity: string | null }>>();
  for (const e of events) {
    if (e.event_kind !== 'self_review') { continue; }
    if (!e.signature) { continue; } // Bug W legitimacy gate
    const p = e.payload?.persona;
    const r = e.payload?.round;
    if (!p || r === undefined) { continue; }
    const rounds = byPersona.get(p) ?? new Map();
    rounds.set(r, {
      score: typeof e.payload?.score === 'number' ? e.payload.score : null,
      severity: typeof e.payload?.severity === 'string' ? e.payload.severity : null,
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

  const sealLine = verdict.seal.sealed
    ? '🛡 **Sealed** — every agent event signed under per-session Ed25519 keypair'
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

  const reviewBlock = reviewSummary.length > 0
    ? reviewSummary.map(r => {
        const lastRound = r.rounds[r.rounds.length - 1];
        const trail = r.rounds.map(rd => `r${rd.round}: ${rd.score?.toFixed(2) ?? '—'} (${rd.severity ?? '?'})`).join(' → ');
        return `- **${r.persona}** — final: ${lastRound.score?.toFixed(2) ?? '—'} (${lastRound.severity ?? '?'}) · trail: ${trail}`;
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

This report is a SHAPE-level audit summary, generated client-side
from the per-run audit JSONL chain + okr.yaml + chain-ladder.yaml.
For cryptographic gold (Ed25519 signature verification against the
per-epoch public keys committed under \`audit/keys/\`), re-run via
the runner:

\`\`\`sh
npx @maintainabilityai/research-runner audit-verify-chain \\
  --okrId ${input.okrId} --runId ${input.runId}
\`\`\`

Same code path CI uses; same allowlist + origin-kind contract
(Bug V/W/X/Y). The runner's verdict is the source of truth; this
report's shape verdict matches every check that doesn't require
key material.
`;
}
