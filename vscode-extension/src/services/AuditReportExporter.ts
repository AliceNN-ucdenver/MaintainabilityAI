import * as YAML from 'yaml';

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

/**
 * Codex E3-gold-r4 review (2026-05-25) — per-input source descriptor.
 *
 * The previous round tracked only a single `sourceTag` string. That
 * collapsed the canonical/local distinction across all inputs, which
 * hid a real bug class: `Promise.all([JSONL, ladder])` falling back
 * to local JSONL while `sourceTag` still said GitHub, then the
 * source-atomicity guard comparing `localJsonl !== chainText` —
 * which had become local-vs-local and passed trivially.
 *
 * Now every input carries its own provenance. The handler can
 * detect mixed states and either fail closed (runner not invoked,
 * with reason) or render the report with honest source labels per
 * input so the auditor sees exactly what came from where.
 *
 * Field semantics:
 *   - `okr` / `chain`: required inputs. `github` means canonical
 *     fetch succeeded; `local-fallback` means GitHub failed and
 *     local was substituted.
 *   - `ladder`: optional cross-phase context. `missing` is a normal
 *     state (single-phase exports don't have one).
 *   - `keys`: needed for the runner verifier. `github-verified`
 *     means every local key file's bytes match GitHub canonical;
 *     `local-only` means the run is in local-fallback mode and keys
 *     are atomic by virtue of common source; `mismatch` / `missing`
 *     mean the runner CANNOT be invoked atomically with this
 *     report's claims (handler MUST NOT invoke runner in these
 *     states); `not-checked` means no signed agent events were
 *     present in the chain (workflow-only chain — runner has no
 *     Ed25519 work to do).
 *   - `prd` / `artifact`: optional. `suppressed-non-canonical` is
 *     the Codex r4 fix — when okr came from GitHub but the
 *     PRD/artifact fetch failed, the handler suppresses local
 *     fallback so the control-mapping section never silently mixes
 *     canonical metadata with possibly-stale local design text.
 */
export interface AuditReportInputSources {
  okr: 'github' | 'local-fallback';
  chain: 'github' | 'local-fallback';
  ladder: 'github' | 'local-fallback' | 'missing';
  keys: 'github-verified' | 'local-only' | 'mismatch' | 'missing' | 'not-checked';
  prd: 'github' | 'local-fallback' | 'missing' | 'suppressed-non-canonical';
  artifact: 'github' | 'local-fallback' | 'missing' | 'suppressed-non-canonical';
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
   *
   * Codex E3-gold-r4 (2026-05-25): when `sources` is present, the
   * handler should compose `sourceTag` to reflect the per-input
   * truth (e.g. `MIXED · ... (NON-ATOMIC)` when okr came from GitHub
   * but chain fell back to local). The report header always renders
   * `sourceTag` as the headline; `sources` powers the detailed
   * breakdown subsection inside Trust posture.
   */
  sourceTag: string;
  /**
   * Codex E3-gold review (2026-05-25) — verdict from the runner's
   * `skill-audit-verify-chain` skill, which does the crypto checks
   * the UI verifier cannot (Ed25519 sig verify + per-event hash
   * replay + chain_root_hash recompute). Caller shells out via
   * `npx ... skill-audit-verify-chain` with stdin JSON before
   * building the report; if shell-out fails or runner isn't
   * available, caller passes `{ invoked: false, reason }` and the
   * report renders RUNNER NOT INVOKED in the trust posture.
   */
  runnerVerdict: RunnerVerifyVerdict;
  /**
   * Optional raw PRD markdown for control-mapping (SR-NN →
   * STRIDE/OWASP → PRD anchor → design section). When absent the
   * report skips the "Control mapping" section instead of
   * fabricating it.
   */
  prdText?: string | null;
  /**
   * Optional raw artifact markdown (research-doc.md / prd.md /
   * code-design.md). Used to check which SR-NNs appear in §5 of the
   * design — completes the control-mapping trace.
   */
  artifactText?: string | null;
  /**
   * Codex E3-gold-r4 (2026-05-25) — per-input source provenance.
   * Optional for backward compatibility with tests, but the handler
   * always passes it now. When present, the report renders a "Source
   * breakdown" table inside Trust posture so the auditor can see at
   * a glance which inputs came from canonical GitHub vs local
   * fallback, and whether keys were atomically verified.
   */
  sources?: AuditReportInputSources;
}

/**
 * Codex E3-gold (2026-05-25) — runner crypto verdict shape. Mirrors
 * the JSON output of the `skill-audit-verify-chain` skill (see
 * vscode-extension/code-templates/skills/audit-verify-chain/SKILL.md).
 *
 * Two cases:
 *   `{ invoked: true, ok: true, chainHead, eventCount }` — runner ran,
 *     verified end-to-end, returned the chain head + count.
 *   `{ invoked: true, ok: false, reason }` — runner ran, found
 *     tampering; reason is the canonical failure tag (e.g.
 *     `prev-hash-mismatch-line-7`).
 *   `{ invoked: false, reason }` — caller couldn't invoke (offline,
 *     runner not installed, timeout, etc.). Report renders an
 *     explicit "RUNNER VERIFICATION: NOT INVOKED" block so the
 *     reviewer knows the gold step is missing.
 */
export type RunnerVerifyVerdict =
  | { invoked: true; ok: true; chainHead: string; eventCount: number }
  | { invoked: true; ok: false; reason: string }
  | { invoked: false; reason: string };

/**
 * Codex E3-gold-r3 review (2026-05-25) — extracted from
 * LookingGlassPanel.invokeRunnerVerifyChain so the runner-output
 * parsing rules can be tested in isolation. The previous bug class
 * (FAIL verdict mislabelled as NOT INVOKED when exit code != 0) needs
 * a direct regression test on this pure function — testing the
 * handler end-to-end would require mocking child_process.spawn.
 *
 * Codex E3-gold-r4 (2026-05-25) — walks stdout from BOTTOM to TOP
 * and parses the first JSON-shaped line. Pre-fix only inspected the
 * absolute final non-empty line: an npx wrapper or runner-side
 * trailing log line ("Done.", "[runner] cleanup", etc.) emitted
 * AFTER the verdict JSON would silently make the parser fall
 * through to NOT INVOKED even though the verdict was right there.
 * The runner contract is "verdict JSON is the last JSON-shaped
 * line"; walking from the bottom finds it even when wrappers append
 * non-JSON afterwards.
 *
 * Contract — parse runner stdout regardless of exit code:
 *   - Walk stdout lines bottom-to-top; first line that parses as
 *     JSON ({...}) is the canonical verdict per SKILL.md.
 *   - {ok:true, chainHead, eventCount} → invoked PASS.
 *   - {ok:false, reason} → invoked FAIL (real tamper verdict;
 *     do NOT downgrade to NOT INVOKED just because the runner
 *     exited nonzero on ok:false).
 *   - JSON parses but lacks required fields → NOT INVOKED with
 *     "unexpected shape" reason.
 *   - No parseable JSON in stdout → NOT INVOKED with exit code +
 *     stderr context so reviewer can diagnose.
 */
export function parseRunnerVerdictFromStdout(
  stdout: string,
  stderr: string,
  exitCode: number,
): RunnerVerifyVerdict {
  let parsed: { ok?: boolean; chainHead?: string; eventCount?: number; reason?: string } | null = null;
  const lines = stdout.split('\n').map(s => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        parsed = JSON.parse(line);
        break;
      } catch {
        // Malformed JSON-shaped line — keep walking upward in case the
        // real verdict line is above.
        continue;
      }
    }
  }
  if (parsed) {
    if (parsed.ok === true && typeof parsed.chainHead === 'string' && typeof parsed.eventCount === 'number') {
      return { invoked: true, ok: true, chainHead: parsed.chainHead, eventCount: parsed.eventCount };
    }
    if (parsed.ok === false) {
      // Real tamper verdict — was being misreported as NOT INVOKED
      // pre-Codex-E3-gold-r2. Now correctly carried through as FAIL
      // regardless of exit code (runner exits 1 on ok:false per
      // packages/research-runner/src/cli.ts).
      return { invoked: true, ok: false, reason: parsed.reason ?? 'runner returned ok:false without a reason' };
    }
    return { invoked: false, reason: `Runner stdout JSON has unexpected shape (no ok field): ${stdout.slice(0, 200)}` };
  }
  return {
    invoked: false,
    reason: `Runner produced no parseable verdict JSON. Exit code: ${exitCode}. stderr (first 200): ${stderr.slice(0, 200).trim() || '(empty)'}. stdout (first 200): ${stdout.slice(0, 200).trim() || '(empty)'}.`,
  };
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
 *
 * Codex E3-gold-r3 (2026-05-25): when runnerVerdict is invoked, the
 * VERDICT/ACTION lines lead with the runner result — the runner is
 * the source of truth, so the summary must reflect it. Shape verdict
 * is the fallback only when the runner wasn't invoked.
 */
function buildExecutiveSummary(
  input: AuditReportInput,
  events: ChainEvent[],
  reviewSummary: ReturnType<typeof summarizeSelfReview>,
  agentStats: { signedAgent: number; totalAgent: number },
): string {
  const v = input.verdict;
  const rv = input.runnerVerdict;
  const sources = input.sources;
  let verdictLabel: string;
  let actionLine: string;

  // Codex E3-gold-r4 — source-atomicity gate. If the per-input
  // breakdown shows the report's claimed canonical source doesn't
  // match what the runner would verify, name that explicitly in the
  // executive summary BEFORE evaluating shape/runner verdicts. The
  // handler already passes runnerVerdict={invoked:false, reason: ...}
  // in this case, so without this branch the auditor would only see
  // SHAPE-CLEARED — which understates the trust violation.
  const atomicityBroken = sources && (
    // okr came from canonical but chain or keys did not
    (sources.okr === 'github' && sources.chain === 'local-fallback')
    || sources.keys === 'mismatch'
    || sources.keys === 'missing'
  );
  if (atomicityBroken) {
    verdictLabel = 'FAIL (source atomicity broken — report bytes ≠ runner bytes)';
    const detail = sources.keys === 'mismatch'
      ? 'local public-key files do not match canonical GitHub bytes — runner would verify against different cryptographic material than this report references'
      : sources.keys === 'missing'
        ? 'public-key files needed by the runner are missing or unfetchable'
        : 'chain JSONL fell back to local while okr.yaml is canonical GitHub — runner cannot atomically prove the canonical bytes';
    actionLine = `REJECT — ${detail}. The runner was NOT invoked because doing so would produce a verdict that doesn't describe the bytes shown in this report. Run \`git pull\` in your mesh checkout to sync, then retry the export. Do NOT promote to fan-out from this report.`;
  } else
  // Runner verdict (when invoked) is ground truth and leads the
  // summary. Shape verdict only drives the summary when the runner
  // couldn't be invoked (offline, npx unavailable, source-atomicity
  // mismatch).
  if (rv.invoked && rv.ok) {
    verdictLabel = `PASS (runner-verified · ${rv.eventCount} events · chain head ${rv.chainHead.slice(0, 12)}…)`;
    actionLine = 'APPROVE for downstream coding handoff. Runner verified Ed25519 signatures + per-event hash replay + chain_root_hash recomputation. Same code path CI uses.';
  } else if (rv.invoked && !rv.ok) {
    verdictLabel = 'FAIL (runner rejected chain)';
    actionLine = `REJECT — runner found cryptographic or hash-chain integrity failure: \`${rv.reason}\`. Do NOT promote to fan-out. Investigate the named event and re-verify before retrying.`;
  } else if (!v.shapeOk) {
    // Runner wasn't invoked, AND even the shape check failed. Worst
    // case for the report — both layers say something's wrong.
    verdictLabel = 'FAIL (shape-verification failed; runner NOT invoked)';
    actionLine = `REJECT — investigate first failure at line ${v.firstFailure?.line ?? '?'} (${v.firstFailure?.reason ?? 'unknown'}). Runner was not invoked (see Trust posture); both layers fail. Do NOT promote to fan-out.`;
  } else if (v.seal.sealed) {
    // Runner wasn't invoked but shape checks passed. Cannot grant PASS
    // because the gold step is missing.
    verdictLabel = 'SHAPE-CLEARED — runner verification NOT INVOKED';
    actionLine = `RUN RUNNER VERIFY before fan-out. Shape checks pass + every agent event claims a signature, but the runner did not run (reason: ${rv.reason}). Re-run the verifier (see Verifier notes) and only approve when its verdict is green.`;
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
  if (atomicityBroken) {
    // Codex E3-gold-r4 — source atomicity violation outranks all other
    // signals. Runner verdict (whether PASS or FAIL) would not describe
    // the bytes shown in the report, so the entire report is suspect.
    riskLine = 'CRITICAL — source atomicity broken; report contents cannot be cryptographically vouched for';
  } else if (rv.invoked && !rv.ok) {
    // Codex E3-gold-r3 — runner FAIL escalates risk above all shape
    // signals. Runner is ground truth.
    riskLine = `CRITICAL — runner rejected the chain (\`${rv.reason}\`). Cryptographic / hash-chain integrity failure.`;
  } else if (!v.shapeOk || v.malformedLines > 0 || v.unsignedAgentEvents > 0 || v.signedWorkflowEvents > 0 || v.originKindMismatches > 0) {
    riskLine = `HIGH — chain has integrity issues (${[
      v.malformedLines > 0 ? `${v.malformedLines} malformed` : '',
      v.unsignedAgentEvents > 0 ? `${v.unsignedAgentEvents} unsigned agent` : '',
      v.signedWorkflowEvents > 0 ? `${v.signedWorkflowEvents} signed-workflow forgery` : '',
      v.originKindMismatches > 0 ? `${v.originKindMismatches} origin-kind mismatch` : '',
    ].filter(Boolean).join(', ')})`;
  } else if (rv.invoked && rv.ok && allConverged && reviewSummary.length >= 2) {
    const rounds = Math.max(...reviewSummary.map(r => r.rounds[r.rounds.length - 1].round));
    riskLine = `LOW — runner verified · ${reviewSummary.length} personas converged on round ${rounds}`;
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
 * E3-gold (Codex review, 2026-05-25) — compact chronological event
 * timeline. One row per event with kind, emitter (origin), signed
 * flag, and a 1-line summary derived from payload. Renders inside a
 * collapsible <details> so the report stays scannable but auditors
 * can expand to trace decision flow event-by-event.
 */
interface TimelineRow {
  n: number;
  kind: string;
  emitter: string;
  signed: boolean;
  summary: string;
}
function summarizeEventTimeline(events: ChainEvent[]): TimelineRow[] {
  return events.map((e, i) => {
    const n = typeof e.event_id === 'number' ? e.event_id : i + 1;
    const kind = e.event_kind ?? '?';
    const emitter = (e.payload?.emitted_by as string | undefined) ?? '?';
    const signed = typeof e.signature === 'string' && e.signature.length > 0;
    let summary = '';
    if (kind === 'skill_call') {
      const skill = e.payload?.skill ?? '?';
      const ok = e.payload?.ok === false ? ' (failed)' : '';
      summary = `\`${skill}\`${ok}`;
    } else if (kind === 'self_review') {
      const persona = e.payload?.persona ?? '?';
      const round = e.payload?.round ?? '?';
      const score = typeof e.payload?.score === 'number' ? e.payload.score.toFixed(2) : '—';
      const sev = e.payload?.severity ?? '?';
      summary = `${persona} r${round} → ${score} (${sev})`;
    } else if (kind === 'artifact_written') {
      summary = `\`${e.payload?.path ?? '?'}\` · ${e.payload?.bytes ?? '?'} bytes`;
    } else if (kind === 'state_transition') {
      summary = `${e.payload?.from ?? '?'} → ${e.payload?.to ?? '?'} · PR #${e.payload?.pr_number ?? '?'}`;
    } else {
      summary = '—';
    }
    return { n, kind, emitter, signed, summary };
  });
}

/**
 * E3-gold — parse chain-ladder.yaml into structured rows for the
 * cross-phase summary table. Defensive: ladder shape evolved over
 * Phase D so we tolerate missing fields. Returns empty array if
 * parse fails or the ladder has no entries.
 */
interface LadderRow {
  phase: string;
  actionId: string;
  runId: string;
  status: string;
  mergedAt: string;
  chainHead: string;
}
function summarizeChainLadder(ladderText: string | null): LadderRow[] {
  if (!ladderText) { return []; }
  try {
    const parsed = YAML.parse(ladderText) as { chain?: Array<Record<string, unknown>> };
    const entries = parsed.chain ?? [];
    return entries.map(e => ({
      phase: String(e['phase'] ?? '?'),
      actionId: String(e['action_id'] ?? e['actionId'] ?? '?'),
      runId: String(e['run_id'] ?? e['runId'] ?? '?'),
      status: String(e['status'] ?? '?'),
      mergedAt: String(e['merged_at'] ?? e['mergedAt'] ?? e['completed_at'] ?? e['completedAt'] ?? '—'),
      chainHead: shortHash(String(e['chain_root_hash'] ?? e['chainRootHash'] ?? e['chain_head'] ?? '')),
    }));
  } catch {
    return [];
  }
}

/**
 * E3-gold — extract SR-NN definitions + STRIDE/OWASP citations from
 * the PRD markdown, then check which SR-NNs appear in the design
 * artifact's §5 section. Produces a compact compliance trace table:
 *   SR | STRIDE | OWASP | PRD anchor | Design §
 *
 * Defensive: returns empty array if PRD is missing OR has no SR-NN
 * sections (e.g. WHY/HOW phases that don't yet declare SRs). Report
 * skips the section rather than fabricating it.
 */
interface ControlRow {
  sr: string;
  stride: string[];
  owasp: string[];
  prdAnchor: string;
  designCited: boolean;
}
function extractControlMapping(prdText: string | null | undefined, artifactText: string | null | undefined): ControlRow[] {
  if (!prdText) { return []; }
  // Codex E3-gold review fix: the synthesis prompt allows SR-NN as
  // heading shape (`### SR-01`), numbered-list shape (`- SR-01: ...`),
  // bare-line shape (`SR-01: ...`), or table-row shape. Real PRD output
  // observed today uses headings, but the parser must tolerate all the
  // shapes the prompt accepts — otherwise a future PRD that follows
  // the prompt's letter ships with an empty Control Mapping section.
  //
  // Strategy: scope the search to the `## Security Requirements`
  // section body (next H2 marks the boundary), then within that section
  // find every distinct SR-NN occurrence — regardless of containing
  // shape — and scan a per-SR chunk (from this SR's index to the next
  // SR's index OR section end) for THR-NNN + OWASP refs. This handles
  // all four shapes uniformly.
  const sectionMatch = prdText.match(/(?:^|\n)##[ \t]+Security[ \t]+Requirements\b([\s\S]*?)(?=\n##[ \t]+|\n---\n|$)/i);
  if (!sectionMatch) { return []; }
  const section = sectionMatch[1];
  // Find unique SR-NN markers + their positions in document order.
  const srPositions: { sr: string; index: number }[] = [];
  const seenSrs = new Set<string>();
  for (const m of section.matchAll(/\bSR-(\d+)\b/g)) {
    const sr = `SR-${m[1]}`;
    if (seenSrs.has(sr)) { continue; }
    seenSrs.add(sr);
    srPositions.push({ sr, index: m.index ?? 0 });
  }
  if (srPositions.length === 0) { return []; }
  const rows: ControlRow[] = [];
  for (let i = 0; i < srPositions.length; i++) {
    const { sr, index } = srPositions[i];
    const nextIndex = i + 1 < srPositions.length ? srPositions[i + 1].index : section.length;
    const chunk = section.slice(index, nextIndex);
    const stride = Array.from(new Set(Array.from(chunk.matchAll(/\bTHR-(\d+)\b/g)).map(m => `THR-${m[1]}`)));
    const owasp = Array.from(new Set(Array.from(chunk.matchAll(/\b(A0?[1-9]|A10)\b/g)).map(m => m[1])));
    const designCited = artifactText ? new RegExp(`\\b${sr}\\b`).test(artifactText) : false;
    rows.push({
      sr,
      stride,
      owasp,
      prdAnchor: `prd.md §Security Requirements (${sr})`,
      designCited,
    });
  }
  return rows.sort((a, b) => a.sr.localeCompare(b.sr, undefined, { numeric: true }));
}

/**
 * Codex E3-gold-r4 (2026-05-25) — render the per-input source breakdown
 * so an auditor can see at a glance which inputs are canonical, which
 * fell back to local, and whether keys atomicity holds. Returns null
 * when no sources object is provided (backward-compat with tests).
 *
 * The label conventions are deliberately blunt: `canonical (GitHub)`
 * and `LOCAL FALLBACK` are visually distinct so a reviewer skimming
 * the report immediately spots non-canonical inputs. `suppressed`
 * names the Codex r4 atomicity discipline — when canonical fetch
 * fails, we DO NOT silently use local; we drop the input so the
 * downstream section doesn't mix canonical metadata with local
 * design text.
 */
function renderSourceBreakdownBlock(sources: AuditReportInputSources | undefined): string {
  if (!sources) { return ''; }
  const label = (origin: string): string => {
    switch (origin) {
      case 'github':            return '✅ canonical (GitHub)';
      case 'github-verified':   return '✅ canonical (GitHub) · local key bytes match';
      case 'local-only':        return 'ℹ local mesh (atomic with chain — both fell back together)';
      case 'local-fallback':    return '⚠ LOCAL FALLBACK (GitHub fetch failed)';
      case 'missing':           return '— missing';
      case 'mismatch':          return '🚫 LOCAL DOES NOT MATCH GITHUB (atomicity broken)';
      case 'not-checked':       return 'ℹ not checked (no signed agent events to verify)';
      case 'suppressed-non-canonical':
        return '⚠ suppressed (canonical fetch failed; local exists but withheld to preserve atomicity)';
      default:                  return origin;
    }
  };
  return `**Source breakdown** — which inputs are canonical:

| Input | Source |
|---|---|
| \`okr.yaml\` | ${label(sources.okr)} |
| chain JSONL | ${label(sources.chain)} |
| chain-ladder.yaml | ${label(sources.ladder)} |
| \`audit/keys/<runId>.epoch-*.pub.pem\` | ${label(sources.keys)} |
| \`prd.md\` | ${label(sources.prd)} |
| artifact | ${label(sources.artifact)} |

_The runner verifier shells out against local-disk bytes. If \`chain\` or \`keys\` are not \`canonical\` or \`local-only\` (atomic), this export refuses to invoke the runner — its verdict would describe bytes the report cannot vouch for._`;
}

/**
 * E3-gold — render the runner crypto verdict block. Three states
 * (see RunnerVerifyVerdict): invoked+ok, invoked+failed, not-invoked.
 * The not-invoked case explicitly tells the reviewer the gold step
 * is missing — better than silently omitting.
 */
function renderRunnerVerdictBlock(rv: RunnerVerifyVerdict, okrId: string, runId: string): string {
  if (rv.invoked && rv.ok) {
    return `✅ **RUNNER CRYPTO VERDICT: PASS** — the runner verifier (\`skill-audit-verify-chain\`) verified ${rv.eventCount} event(s) end-to-end.

Chain head: \`${shortHash(rv.chainHead, 32)}\`

The runner replayed every event's signature against the per-epoch public keys committed to \`audit/keys/\`, recomputed each event hash, and walked the \`prev_event_hash\` → \`event_hash\` chain. No tampering detected. This is the source-of-truth verdict CI also uses.`;
  }
  if (rv.invoked && !rv.ok) {
    return `❌ **RUNNER CRYPTO VERDICT: FAIL** — the runner verifier (\`skill-audit-verify-chain\`) rejected the chain.

Reason: **\`${rv.reason}\`**

The runner found a cryptographic or hash-chain integrity failure. DO NOT promote this run to fan-out / coding-agent handoff. Investigate the named event and rerun the verifier before proceeding.`;
  }
  return `⚠ **RUNNER CRYPTO VERDICT: NOT INVOKED** — gold verification missing.

Reason: ${rv.reason}

The Looking Glass exporter could not shell out to \`skill-audit-verify-chain\`. The report below contains only the in-extension SHAPE verdict, which does NOT verify Ed25519 signatures, does NOT replay per-event hashes, and does NOT recompute the chain root. Run the runner manually before promoting this run to fan-out:

\`\`\`sh
printf '{"okrId":"${okrId}","runId":"${runId}"}' \\
  | npx -y @maintainabilityai/research-runner@~0.1.42 skill-audit-verify-chain
\`\`\``;
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
    ? '✅ All shape checks pass. See the Runner crypto verdict above (or Verifier notes below) for the ground-truth verdict from `skill-audit-verify-chain`.'
    : verdict.firstFailure
      ? `⚠ Shape check failed at event line ${verdict.firstFailure.line} (\`${verdict.firstFailure.kind}\`): **${verdict.firstFailure.reason}**.

Total events: ${verdict.totalEvents} · Malformed lines: ${verdict.malformedLines} · Unsigned agent events: ${verdict.unsignedAgentEvents} · Signed workflow forgeries: ${verdict.signedWorkflowEvents} · Origin-kind mismatches: ${verdict.originKindMismatches}`
      : 'ℹ No failures, but chain has no agent events to sign.';

  // E3-gold — runner crypto verdict (caller shells out to skill-audit-
  // verify-chain). Three states: invoked+ok, invoked+failed,
  // not-invoked. Rendered as a top-of-Trust-posture block since it's
  // the most authoritative signal.
  const runnerBlock = renderRunnerVerdictBlock(input.runnerVerdict, input.okrId, input.runId);

  // Codex E3-gold-r4 — per-input source breakdown. Rendered immediately
  // above the runner verdict so the auditor knows what bytes are being
  // attested to BEFORE reading the crypto verdict. Empty when sources
  // is undefined (backward-compat for existing tests).
  const sourceBreakdownBlock = renderSourceBreakdownBlock(input.sources);

  // E3-gold — compact chronological event timeline inside <details>.
  const timeline = summarizeEventTimeline(events);
  const timelineRows = timeline.map(r =>
    `| ${r.n} | \`${r.kind}\` | ${r.emitter} | ${r.signed ? '✓' : '—'} | ${r.summary} |`
  ).join('\n');
  const signedCount = timeline.filter(r => r.signed).length;
  const unsignedCount = timeline.length - signedCount;
  const timelineBlock = timeline.length > 0
    ? `<details>
<summary>Click to expand · ${timeline.length} events · ${signedCount} signed · ${unsignedCount} unsigned</summary>

| # | kind | emitter | signed | summary |
|---:|---|---|:---:|---|
${timelineRows}

</details>`
    : '_No events in chain._';

  // E3-gold — cross-phase ladder as a human table + raw YAML in <details>.
  const ladderRows = summarizeChainLadder(input.chainLadderText);
  const ladderBlock = input.chainLadderText
    ? (ladderRows.length > 0
        ? `## Cross-phase ladder

| Phase | Action | Run ID | Status | Merged | Chain head |
|---|---|---|---|---|---|
${ladderRows.map(r => `| \`${r.phase}\` | \`${r.actionId}\` | \`${r.runId}\` | ${r.status} | ${r.mergedAt} | \`${r.chainHead}\` |`).join('\n')}

<details>
<summary>Raw <code>chain-ladder.yaml</code></summary>

\`\`\`yaml
${input.chainLadderText.trim()}
\`\`\`

</details>`
        : `## Cross-phase ladder

_chain-ladder.yaml present but failed to parse OR has no entries. Raw:_

\`\`\`yaml
${input.chainLadderText.trim()}
\`\`\``)
    : '';

  // E3-gold — control mapping (SR-NN → STRIDE/OWASP → design § cited).
  // Skipped when PRD text not provided OR PRD has no SR-NN sections.
  const controlRows = extractControlMapping(input.prdText, input.artifactText);
  const controlBlock = controlRows.length > 0
    ? `## Control mapping

_Did each PRD-declared security requirement land in the design?_

| SR | STRIDE | OWASP | PRD anchor | Design references SR? |
|---|---|---|---|:---:|
${controlRows.map(r => `| \`${r.sr}\` | ${r.stride.length > 0 ? r.stride.map(s => `\`${s}\``).join(', ') : '—'} | ${r.owasp.length > 0 ? r.owasp.map(o => `\`${o}\``).join(', ') : '—'} | ${r.prdAnchor} | ${r.designCited ? '✓' : '✗'} |`).join('\n')}

_Cited check is a textual reference of the SR-NN string in the artifact body — does NOT validate the implementation actually satisfies the requirement. That belongs in PR review._`
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
${sourceBreakdownBlock ? '\n' + sourceBreakdownBlock + '\n' : ''}
${runnerBlock}

${sealLine}

${trustBlock}
${controlBlock ? '\n' + controlBlock + '\n' : ''}
## Evidence — skill calls

${skillTable}

## Self-review trail

${reviewBlock}

## Workflow facts

${workflowBlock}

## Event timeline

${timelineBlock}
${ladderBlock ? '\n\n' + ladderBlock : ''}

## Verifier notes

**UI shape check is convenience. Runner verifier is source of truth.**

What the runner does that the UI does NOT:
  - **Ed25519 signature verification** against per-epoch public keys
    committed to \`audit/keys/<runId>.epoch-N.pub.pem\`
  - **Per-event hash-chain replay** (each event's \`prev_event_hash\`
    must equal the prior event's \`event_hash\`)
  - **\`chain_root_hash\` recomputation** against the leaf hash

If the runner verdict is missing OR fails, ignore the shape verdict and
fix the chain before fan-out. Same allowlist + origin-kind contract
applies on both sides (Bug V/W/X/Y).

To re-verify from a fresh shell:

\`\`\`sh
printf '{"okrId":"${input.okrId}","runId":"${input.runId}"}' \\
  | npx -y @maintainabilityai/research-runner@~0.1.42 skill-audit-verify-chain
\`\`\`
`;
}
