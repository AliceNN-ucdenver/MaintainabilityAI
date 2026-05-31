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
  ladder: 'github' | 'local-fallback' | 'missing' | 'suppressed-non-canonical';
  keys: 'github-verified' | 'local-only' | 'mismatch' | 'missing' | 'not-checked';
  prd: 'github' | 'local-fallback' | 'missing' | 'suppressed-non-canonical';
  artifact: 'github' | 'local-fallback' | 'missing' | 'suppressed-non-canonical';
  /**
   * Codex E3-gold-r5 (2026-05-25) — structurally encode whether the
   * bytes the runner WOULD verify match the bytes the report cites.
   *
   * The chain field says where the report's chainText came from.
   * The runnerInput field says what the runner would actually read
   * from local disk when invoked. These are different: even when
   * chain=github and keys=github-verified, the local JSONL on disk
   * may have drifted (a `git pull` away from canonical). Pre-r5 we
   * relied on the handler stuffing the mismatch into runnerVerdict's
   * reason text, then the executive summary falling through to
   * SHAPE-CLEARED because no source field flagged the problem. That
   * was the r5 BLOCKING regression Codex caught — `localJsonl !==
   * chainText` was correctly detected by the handler but produced a
   * SHAPE-CLEARED headline instead of a FAIL.
   *
   * Values:
   *   - 'github-verified': okr+chain+keys are GitHub canonical AND
   *     local JSONL bytes byte-equal chainText. Runner can be
   *     invoked atomically.
   *   - 'local-only': okr+chain are local-fallback; runner verifies
   *     local against local. Atomic by common source.
   *   - 'jsonl-missing': canonical mode but local JSONL file is
   *     missing on disk; runner cannot be invoked atomically.
   *   - 'jsonl-mismatch': canonical mode but local JSONL bytes do
   *     NOT match canonical chainText; runner would verify drifted
   *     bytes. Atomicity broken.
   *   - 'not-applicable': either keys=missing/mismatch already broke
   *     atomicity (caller need not check JSONL byte alignment) OR
   *     the chain has no signed agent events to verify.
   */
  runnerInput: 'github-verified' | 'local-only' | 'jsonl-missing' | 'jsonl-mismatch' | 'not-applicable';
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
  // Codex E3-gold-r5 (2026-05-25) — walk upward looking for the
  // FIRST JSON object that has an `ok` field (true or false). Pre-r5
  // we stopped at the first parseable JSON object, which meant a
  // wrapper that logged unrelated JSON ({"step":"cleanup","took":12})
  // AFTER the verdict could shadow the real verdict and force
  // NOT INVOKED. The runner contract is "the verdict JSON has an
  // `ok` field"; only that shape counts. We track the most-recent
  // JSON-shaped-but-unexpected line separately so the NOT INVOKED
  // reason can name what we saw if no verdict exists at all.
  let verdictParsed: { ok?: boolean; chainHead?: string; eventCount?: number; reason?: string } | null = null;
  let lastUnexpectedShape: string | null = null;
  const lines = stdout.split('\n').map(s => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.startsWith('{') || !line.endsWith('}')) { continue; }
    let parsed: { ok?: boolean; chainHead?: string; eventCount?: number; reason?: string };
    try {
      parsed = JSON.parse(line);
    } catch {
      // Malformed JSON-shaped line — keep walking upward.
      continue;
    }
    if (typeof parsed.ok === 'boolean') {
      // Found the verdict.
      verdictParsed = parsed;
      break;
    }
    // Valid JSON but no `ok` field — remember it (use the closest-to-
    // verdict line for the diagnostic) and keep walking upward in
    // case the real verdict is above this wrapper log line.
    if (lastUnexpectedShape === null) { lastUnexpectedShape = line; }
  }
  if (verdictParsed) {
    if (verdictParsed.ok === true && typeof verdictParsed.chainHead === 'string' && typeof verdictParsed.eventCount === 'number') {
      return { invoked: true, ok: true, chainHead: verdictParsed.chainHead, eventCount: verdictParsed.eventCount };
    }
    if (verdictParsed.ok === false) {
      // Real tamper verdict — was being misreported as NOT INVOKED
      // pre-Codex-E3-gold-r2. Now correctly carried through as FAIL
      // regardless of exit code (runner exits 1 on ok:false per
      // packages/research-runner/src/cli.ts).
      return { invoked: true, ok: false, reason: verdictParsed.reason ?? 'runner returned ok:false without a reason' };
    }
    // ok=true but missing chainHead/eventCount — runner contract drift.
    return { invoked: false, reason: `Runner stdout verdict ok=true but missing chainHead/eventCount: ${JSON.stringify(verdictParsed)}` };
  }
  if (lastUnexpectedShape !== null) {
    return { invoked: false, reason: `Runner stdout JSON has unexpected shape (no ok field): ${lastUnexpectedShape.slice(0, 200)}` };
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

/**
 * E4 (2026-05-25) — exported so the OKR rollup handler can parse chain
 * JSONL once per phase and reuse the result across summarizeSelfReview /
 * countAgentEventStats. Tolerates malformed lines silently (the shape
 * verdict surfaces them).
 */
export function parseChain(lines: string[]): ChainEvent[] {
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

/**
 * E4 (2026-05-25) — exported so the OKR rollup handler can populate
 * PhaseRollupDigest.reviewSummary using the same legitimacy gate as the
 * per-action exporter. Internal-name only — not a stability promise.
 */
export function summarizeSelfReview(events: ChainEvent[]): { persona: string; rounds: { round: number; score: number | null; severity: string | null; eventId: number | null }[] }[] {
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
 *
 * E4 (2026-05-25) — exported so the OKR rollup handler can populate
 * PhaseRollupDigest.agentStats reusing the same gate. Internal-name
 * only — not a stability promise.
 */
export function countAgentEventStats(events: ChainEvent[]): { signedAgent: number; totalAgent: number } {
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
 * Codex E3-gold-r5 (2026-05-25) — extracted out of
 * buildExecutiveSummary to keep its cyclomatic complexity under the
 * architecture-fitness budget. Given a sources object where
 * atomicityBroken is already known true, names the specific input that
 * broke atomicity. Precedence matches buildExecutiveSummary's
 * detection order: keys atomicity > runnerInput byte-mismatch >
 * chain-fallback under canonical headline.
 */
function atomicityBreakDetail(sources: AuditReportInputSources): string {
  if (sources.keys === 'mismatch') {
    return 'local public-key files do not match canonical GitHub bytes — runner would verify against different cryptographic material than this report references';
  }
  if (sources.keys === 'missing') {
    return 'public-key files needed by the runner are missing or unfetchable';
  }
  if (sources.runnerInput === 'jsonl-mismatch') {
    return 'local JSONL on disk does NOT match the canonical GitHub bytes this report cites — the runner reads local-disk JSONL by convention, so its verdict would describe drifted bytes';
  }
  if (sources.runnerInput === 'jsonl-missing') {
    return 'local JSONL is missing at the canonical path — the runner reads from local disk and cannot verify the canonical GitHub bytes shown in this report';
  }
  return 'chain JSONL fell back to local while okr.yaml is canonical GitHub — runner cannot atomically prove the canonical bytes';
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

  // Codex E3-gold-r4 + r5 — source-atomicity gate. If the per-input
  // breakdown shows the report's claimed canonical source doesn't
  // match what the runner would verify, name that explicitly in the
  // executive summary BEFORE evaluating shape/runner verdicts. The
  // handler already passes runnerVerdict={invoked:false, reason: ...}
  // in this case, so without this branch the auditor would only see
  // SHAPE-CLEARED — which understates the trust violation.
  //
  // r5 BLOCKING regression fix: the runnerInput field structurally
  // encodes whether local JSONL bytes match what the runner would
  // read. Pre-r5, `chain=github + keys=github-verified` already left
  // atomicityBroken=false even when local JSONL bytes differed from
  // chainText, so the summary said SHAPE-CLEARED. Now `runnerInput=
  // jsonl-mismatch` (or `jsonl-missing`) flips the verdict to FAIL.
  const atomicityBroken = sources && (
    // okr came from canonical but chain or keys did not
    (sources.okr === 'github' && sources.chain === 'local-fallback')
    || sources.keys === 'mismatch'
    || sources.keys === 'missing'
    || sources.runnerInput === 'jsonl-mismatch'
    || sources.runnerInput === 'jsonl-missing'
  );
  if (atomicityBroken) {
    verdictLabel = 'FAIL (source atomicity broken — report bytes ≠ runner bytes)';
    actionLine = `REJECT — ${atomicityBreakDetail(sources)}. The runner was NOT invoked because doing so would produce a verdict that doesn't describe the bytes shown in this report. Run \`git pull\` in your mesh checkout to sync, then retry the export. Do NOT promote to fan-out from this report.`;
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
  prNumber: string | null;
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
      prNumber: e['pr_number'] != null || e['prNumber'] != null
        ? String(e['pr_number'] ?? e['prNumber'])
        : null,
    }));
  } catch {
    return [];
  }
}

function formatPrCell(prUrl: string | null | undefined, prNumber: string | null | undefined, repoInfo?: { owner: string; repo: string } | null): string {
  if (prUrl) {
    return `[#${prUrl.split('/').pop() ?? '?'}](${prUrl})`;
  }
  if (prNumber) {
    return repoInfo
      ? `[#${prNumber}](https://github.com/${repoInfo.owner}/${repoInfo.repo}/pull/${prNumber})`
      : `#${prNumber}`;
  }
  return '—';
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
export function extractControlMapping(prdText: string | null | undefined, artifactText: string | null | undefined): ControlRow[] {
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
 * Codex E3-gold-r5-followup (2026-05-25) — compose the headline
 * `sourceTag` string from a per-input sources object.
 *
 * Extracted from LookingGlassPanel so the canonicality predicate that
 * decides "GitHub canonical" vs "MIXED" gets direct unit-test coverage
 * — Codex's r5-followup finding was that the inline version in the
 * handler allowed `runnerInputSource === 'not-applicable'` without
 * also checking `keysSource`. In a key-missing or key-mismatch case,
 * the executive summary already failed correctly, but the headline
 * could still say "GitHub canonical" because `runnerInput=not-
 * applicable` (which fires whenever the helper short-circuits past
 * the JSONL byte check) does NOT imply atomicity. Tightened predicate:
 *
 *   keysCanonical       = keys ∈ {github-verified, not-checked}
 *   runnerInputCanonical = runnerInput === github-verified
 *                          OR (runnerInput === not-applicable
 *                              AND keys === not-checked)
 *   allCanonical = okr=github ∧ chain=github ∧ both above
 *
 * The MIXED-tag suffix now also surfaces the specific failing input
 * (keys: LOCAL DRIFT / MISSING; runner input: LOCAL DRIFT / MISSING)
 * so a reviewer reading just the headline knows where to look.
 */
export function composeSourceTag(
  sources: AuditReportInputSources,
  repoInfo: { owner: string; repo: string } | null | undefined,
): string {
  const keysCanonical =
    sources.keys === 'github-verified' || sources.keys === 'not-checked';
  const runnerInputCanonical =
    sources.runnerInput === 'github-verified'
    || (sources.runnerInput === 'not-applicable' && sources.keys === 'not-checked');
  const allCanonical =
    sources.okr === 'github'
    && sources.chain === 'github'
    && keysCanonical
    && runnerInputCanonical;
  const allLocal =
    sources.okr === 'local-fallback' && sources.chain === 'local-fallback';
  if (allCanonical && repoInfo) {
    return `GitHub ${repoInfo.owner}/${repoInfo.repo} (default branch)`;
  }
  if (allLocal) { return 'local mesh checkout'; }
  const okrPart =
    sources.okr === 'github'
      ? `GitHub ${repoInfo?.owner ?? '?'}/${repoInfo?.repo ?? '?'}`
      : 'local';
  const chainPart = sources.chain === 'github' ? 'GitHub' : 'local-fallback';
  const keysHint =
    sources.keys === 'mismatch'
      ? ' · keys: LOCAL DRIFT'
      : sources.keys === 'missing'
        ? ' · keys: MISSING'
        : '';
  const runnerHint =
    sources.runnerInput === 'jsonl-mismatch'
      ? ' · runner input: LOCAL DRIFT'
      : sources.runnerInput === 'jsonl-missing'
        ? ' · runner input: LOCAL MISSING'
        : '';
  return `MIXED — okr.yaml: ${okrPart} · chain JSONL: ${chainPart}${keysHint}${runnerHint} (NON-ATOMIC; see Source breakdown)`;
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
      case 'not-applicable':    return 'ℹ not applicable';
      case 'jsonl-missing':     return '🚫 LOCAL JSONL MISSING (runner cannot verify canonical bytes)';
      case 'jsonl-mismatch':    return '🚫 LOCAL JSONL DRIFTED FROM CANONICAL (atomicity broken)';
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
| runner input (local-disk bytes seen by verifier) | ${label(sources.runnerInput)} |

_The runner verifier shells out against local-disk bytes. If \`chain\`, \`keys\`, or \`runner input\` are not canonical (or \`local-only\`), this export refuses to invoke the runner — its verdict would describe bytes the report cannot vouch for._`;
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
    : input.phase === 'why'
      ? '_Not required for WHY. Research phases are evidence-gathering runs and do not emit persona self-review events._'
      : '_No signed `self_review` events found. HOW and WHAT chains should include persona review events._';

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

| Phase | Run ID | Merged | PR | Chain root |
|---|---|---|---|---|
${ladderRows.map(r => `| \`${r.phase}\` | \`${r.runId}\` | ${r.mergedAt} | ${formatPrCell(null, r.prNumber)} | \`${r.chainHead}\` |`).join('\n')}

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
${controlRows.map(r => `| \`${r.sr}\` | ${r.stride.length > 0 ? r.stride.map(s => `\`${s}\``).join(', ') : '_not declared_'} | ${r.owasp.length > 0 ? r.owasp.map(o => `\`${o}\``).join(', ') : '_not declared_'} | ${r.prdAnchor} | ${r.designCited ? '✓' : '✗'} |`).join('\n')}

_Cited check is a textual reference of the SR-NN string in the artifact body — does NOT validate the implementation actually satisfies the requirement. The phrase "not declared" means the PRD did not explicitly name that taxonomy for the SR. That belongs in PR review._`
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

// ============================================================================
// E4 (2026-05-25) — Whole-OKR audit rollup
//
// Per-action exports (buildAuditReportMarkdown above) already ship one closeout
// per WHY/HOW/WHAT run. E4 adds a whole-OKR rollup that summarizes ALL three
// phases in one auditor-grade document at
// okrs/<id>/audit/exports/<okrId>-rollup.md.
//
// Architecture: same trust discipline as the per-action flow — the caller
// (LookingGlassPanel.onExportOkrRollup) reuses decideRunnerInvocation,
// verifyKeysAtomicity, fetchPrdAndArtifact, and composeSourceTag for every
// phase that has a runId. Verdict precedence:
//
//   PASS    — all 3 phases present AND runner-verified AND source-atomic
//   PARTIAL — OKR isn't fully complete (one or more of WHY/HOW/WHAT missing)
//   FAIL    — any completed phase missing chain/artifact/finalize evidence,
//             runner FAILED, OR source atomicity broken
//
// Rendered sections reuse the same helpers as the per-action report so a
// reviewer who's already trained on per-action output recognizes everything
// in the rollup. The two reports are deliberately not interchangeable: the
// rollup's H1 is "OKR Audit Rollup — <okrId>" so an auditor never confuses
// it with the per-action "Audit report —" closeouts.
// ============================================================================

/**
 * Per-phase digest the caller produces (one per WHY/HOW/WHAT phase that has
 * a runId). Aggregated into OkrRollupInput before rendering.
 *
 * The caller MUST set `evidenceComplete` honestly: if chain JSONL is
 * missing OR artifact text is missing OR (for HOW/WHAT) the chain has no
 * signed self_review events, set false and list what's missing in
 * `evidenceGaps`. The rollup verdict precedence treats `evidenceComplete
 * === false` as FAIL just like a runner failure.
 */
export interface PhaseRollupDigest {
  phase: 'why' | 'how' | 'what';
  runId: string;
  actionId: string;
  status: string;
  completedAt: string | null;
  artifactPath: string | null;
  prUrl: string | null;
  /**
   * Whether the phase's evidence is complete enough to evaluate. false
   * when chain JSONL missing, artifact missing, or no finalize. Caller
   * sets this; rollup verdict treats false as FAIL.
   */
  evidenceComplete: boolean;
  /** Human-readable list of what's missing when evidenceComplete=false. */
  evidenceGaps: string[];
  /** Shape verdict from verifyChainForUI (same code path as per-action). */
  verdict: ChainVerifyVerdictLite;
  /** Runner verdict from decideRunnerInvocation (same code path). */
  runnerVerdict: RunnerVerifyVerdict;
  /** Per-input source provenance from the same flow. */
  sources: AuditReportInputSources;
  agentStats: { signedAgent: number; totalAgent: number };
  reviewSummary: ReturnType<typeof summarizeSelfReview>;
  /** Runner's chainHead if invoked + ok, else null. */
  chainHead: string | null;
  /** Number of events in the chain (from parsed chainLines). */
  eventCount: number;
  /** Relative path under audit/exports/ to the per-action report. */
  perActionReportPath: string;
}

/**
 * Top-level input for buildOkrRollupMarkdown. Caller assembles phases[]
 * by looping the canonical okr.yaml's actions[] (WHY → HOW → WHAT order)
 * and producing a PhaseRollupDigest for each entry that has a runId.
 * Phases the OKR design expects but doesn't have started yet go in
 * `missingPhases` so the rollup can render PARTIAL honestly.
 */
export interface OkrRollupInput {
  okrId: string;
  objective: string | null;
  owner: string | null;
  tier: string | null;
  barId: string | null;
  createdAt: string | null;
  /** Last-completed-phase's completedAt, or null if OKR ongoing. */
  completedAt: string | null;
  /** Phases that have at least been started; sorted WHY → HOW → WHAT. */
  phases: PhaseRollupDigest[];
  /** Phases the OKR design expects but doesn't have started yet. */
  missingPhases: Array<'why' | 'how' | 'what'>;
  chainLadderText: string | null;
  ladderSource: AuditReportInputSources['ladder'];
  /**
   * Unioned SR → STRIDE/OWASP/design mapping across all phases. Caller
   * computes via extractControlMapping(prdText, artifactText) where
   * prdText is from HOW phase and artifactText is from WHAT phase. When
   * the caller couldn't fetch one canonically (suppressed or missing),
   * pass an empty array and set the corresponding {prd,artifact}Source.
   */
  controlRows: ReturnType<typeof extractControlMapping>;
  prdSource: AuditReportInputSources['prd'];
  artifactSource: AuditReportInputSources['artifact'];
  /** OKR-level source tag composed from all phase sources. */
  sourceTag: string;
  /**
   * Codex E4-r1 MAJOR fix: repoInfo threaded through so the per-phase
   * Trust posture blocks can render a correct canonical source tag.
   * Pre-fix renderPhaseTrustBlock called composeSourceTag(p.sources,
   * null), which short-circuited to MIXED for canonical phases
   * because composeSourceTag needs owner/repo to form the canonical
   * headline. That produced reports where the top-level sourceTag
   * said canonical but each per-phase block said MIXED — auditor
   * confusion. With repoInfo here, the per-phase blocks render the
   * same canonical headline as the top-level.
   */
  repoInfo: { owner: string; repo: string } | null;
  /**
   * D-PR8 — per-target-repo implementation rows sourced from
   * design-fan-out.yaml + each impl PR body's YAML frontmatter
   * `implementation_chain` block.
   *
   * Caller (panel handler) assembles: reads design-fan-out.yaml,
   * fetches each pr-merged row's PR body, parses the
   * implementation_chain block via parseImplementationChainBlock,
   * passes the per-row tuple here.
   *
   * Optional. Undefined / empty array means "no impl rows to render"
   * — pre-Tier-2 OKRs + fresh-WHAT-not-yet-fanned-out OKRs both fall
   * into this branch and the rollup omits the implementation chain
   * section entirely.
   *
   * `expectedIntentThread` + `expectedWhatChainRoot` are the
   * mesh-side ground truths the per-row chain entries verify against.
   * When null, cross-axis verification skips (still surfaces
   * evidence-missing for any field absent from the parsed block).
   */
  implementationChain?: {
    rows: ImplementationChainRow[];
    expectedIntentThread: string | null;
    expectedWhatChainRoot: string | null;
  };
}

/**
 * Tier 2.5a — the signed Red Queen decision-log digest for one impl chain.
 * Mirrors the `payload` of the `redqueen_decisions` audit event (the impl
 * agent's finalize-time `audit-sign-redqueen-decisions` skill emits it).
 */
export interface RedqueenDigest {
  count: number;
  allowed: number;
  denied: number;
  overrides: number;
  /** sha256 of the committed `.redqueen/audit-log.jsonl` (null = no log). */
  logSha256: string | null;
  /** True when the digest event was found in the (verified) impl chain. */
  signed: boolean;
  /** Bounded list of deny decisions, if any. */
  denials?: Array<{ tool?: string; filePath?: string; ruleId?: string; reason?: string }>;
}

/**
 * D-PR8 — implementation chain row sourced from `design-fan-out.yaml`
 * + the impl PR body's YAML frontmatter `implementation_chain` block
 * (per D-PR7 storage contract).
 *
 * `chain` is the parsed block from the PR body when present. `chain
 * === null` means the impl PR exists but its body doesn't carry the
 * continuation block — that's an `implementation-chain-evidence-missing`
 * FAIL signal in computeOkrRollupVerdict.
 *
 * Caller (panel handler) fetches PR bodies + parses + supplies. Pure
 * exporter pieces verify + render.
 */
export interface ImplementationChainRow {
  repoSlug: string;
  /** From design-fan-out.yaml row. */
  status: 'opened' | 'pending-on-upstream' | 'pr-opened' | 'pr-merged' | 'pr-rejected' | string;
  prUrl: string | null;
  /** Parsed YAML frontmatter from the impl PR body; null when PR has none. */
  chain: ImplementationChainEntry | null;
  /**
   * Optional (Tier 2.5a): rolled-up Red Queen enforcement-chain digest,
   * extracted from the `redqueen_decisions` event in this repo's impl chain.
   * Absent on older runs (runner predates the signer) — the rollup omits the
   * Red Queen subsection cleanly when this is undefined.
   */
  redqueenDigest?: RedqueenDigest;
}

/**
 * Per the D-PR7 storage contract (template's `implementation_chain:`
 * YAML block). All fields required; missing any → evidence-missing
 * FAIL in verifyImplementationChainEntry.
 */
export interface ImplementationChainEntry {
  okr_id: string;
  parent_phase: string;
  parent_run_id: string;
  implementation_run_id: string;
  mesh_repo: string;
  target_repo: string;
  event_log_path: string;
  key_path: string;
  parent_intent_thread: string;
  parent_chain_root: string;
  /**
   * Codex-r2 Bug 2 — the impl chain's OWN first-event hash (event_id=1
   * in `.maintainability/audit/events/<run-id>.jsonl`). Distinct from
   * `parent_chain_root` (which is the WHAT phase's chain root from
   * chain-ladder.yaml). Required: stage 5 records this as the impl
   * row's `chain_root_hash` in chain-ladder so the rollup + the T3-2
   * runner verifier can cross-check the agent's claim against the
   * actual JSONL in the target repo at the merge SHA.
   */
  chain_root_hash: string;
  /**
   * Codex-r4 Bug 1 — provenance of the Stage 5 evidence verification.
   * Stage 5 fetches `event_log_path` + `key_path` from the target repo
   * AT THIS SHA via GitHub Contents API; the ladder row is ONLY
   * written when both fetches succeed. Stored here as part of the row
   * the rollup verifier reads. NOT present in the PR-body
   * `implementation_chain:` frontmatter (the agent doesn't know its
   * own merge SHA at write time) — Stage 5 stamps it from
   * pr.data.merge_commit_sha. Missing/empty at rollup-read time
   * means the row predates Codex-r4 OR was hand-written; the rollup
   * surfaces this as `evidence-missing:merge_commit_sha`.
   */
  merge_commit_sha: string;
}

/**
 * Discriminated failure signals from verifyImplementationChainEntry.
 * Each maps 1:1 to a `computeOkrRollupVerdict` failure reason string
 * (per design doc D-PR8 acceptance section's reason taxonomy).
 */
export type ImplementationChainIssue =
  | { kind: 'evidence-missing'; field: string }
  | { kind: 'cross-repo-thread-broken'; got: string; expected: string }
  | { kind: 'cross-repo-chain-root-mismatch'; got: string; expected: string };

export type OkrRollupVerdict = 'PASS' | 'PARTIAL' | 'FAIL';

/**
 * D-PR8 — extract the `implementation_chain:` YAML frontmatter block
 * from an impl PR body. PR-body convention (per D-PR7 template):
 *
 *   ---
 *   implementation_chain:
 *     okr_id: ...
 *     parent_phase: what
 *     ...
 *   ---
 *
 *   (optional human-readable PR description below)
 *
 * Returns null when:
 *   - the PR body is empty or null
 *   - there's no `---\nimplementation_chain:` block
 *   - YAML inside the block doesn't parse
 *   - parsed value isn't an object with required fields
 *
 * Defensive — never throws. Caller treats null as `evidence-missing`
 * for verifyImplementationChainEntry.
 */
export function parseImplementationChainBlock(prBody: string | null | undefined): ImplementationChainEntry | null {
  if (!prBody) return null;
  // Look for any `---\n...\n---` block + filter to one containing
  // `implementation_chain:`. The naive `\n---` boundary needs a
  // newline preceding the closer so we don't match the opener as the
  // closer when the block is empty.
  const m = prBody.match(/(^|\n)---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const yamlText = m[2];
  // Cheap pre-check: the block must literally contain
  // `implementation_chain:` somewhere. PRs with other frontmatter
  // shouldn't accidentally parse as impl-chain PRs.
  if (!/(^|\n)\s*implementation_chain\s*:/.test(yamlText)) return null;
  let parsed: unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YAML = require('yaml') as { parse(text: string): unknown };
    parsed = YAML.parse(yamlText);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const root = parsed as Record<string, unknown>;
  const block = root.implementation_chain;
  if (!block || typeof block !== 'object') return null;
  const rec = block as Record<string, unknown>;
  // Each field MUST be a non-empty string per the storage contract.
  // Missing fields produce an entry where those fields are empty
  // strings — verifyImplementationChainEntry then flags
  // evidence-missing per missing field.
  return {
    okr_id: typeof rec.okr_id === 'string' ? rec.okr_id : '',
    parent_phase: typeof rec.parent_phase === 'string' ? rec.parent_phase : '',
    parent_run_id: typeof rec.parent_run_id === 'string' ? rec.parent_run_id : '',
    implementation_run_id: typeof rec.implementation_run_id === 'string' ? rec.implementation_run_id : '',
    mesh_repo: typeof rec.mesh_repo === 'string' ? rec.mesh_repo : '',
    key_path: typeof rec.key_path === 'string' ? rec.key_path : '',
    event_log_path: typeof rec.event_log_path === 'string' ? rec.event_log_path : '',
    target_repo: typeof rec.target_repo === 'string' ? rec.target_repo : '',
    parent_intent_thread: typeof rec.parent_intent_thread === 'string' ? rec.parent_intent_thread : '',
    parent_chain_root: typeof rec.parent_chain_root === 'string' ? rec.parent_chain_root : '',
    chain_root_hash: typeof rec.chain_root_hash === 'string' ? rec.chain_root_hash : '',
    // Codex-r4 Bug 1 — merge_commit_sha is NOT in the PR-body frontmatter
    // (the agent can't know its own merge SHA at write time). Stage 5
    // stamps it onto the chain-ladder row; the rollup reads it from
    // there. Parsing the PR body returns '' here, which
    // verifyImplementationChainEntry would flag — but the rollup pipeline
    // hydrates this value from the chain-ladder row before calling the
    // verifier (see LookingGlassPanel.onExportOkrRollup).
    merge_commit_sha: typeof rec.merge_commit_sha === 'string' ? rec.merge_commit_sha : '',
  };
}

/**
 * D-PR8 — verify a parsed implementation_chain block against the
 * mesh-side ground truth: the OKR's intent_thread_uuid + the WHAT
 * phase's chain root from chain-ladder.
 *
 * Returns the full list of issues found (NOT short-circuit on first)
 * so the rollup can display all problems at once + the verdict
 * computer can pick the highest-precedence reason. Empty array = clean.
 */
export function verifyImplementationChainEntry(
  entry: ImplementationChainEntry | null,
  expectedIntentThread: string | null,
  expectedWhatChainRoot: string | null,
): ImplementationChainIssue[] {
  const issues: ImplementationChainIssue[] = [];
  if (!entry) {
    // Single evidence-missing for the whole block -- caller renders
    // this as "PR body missing implementation_chain block".
    issues.push({ kind: 'evidence-missing', field: 'implementation_chain' });
    return issues;
  }
  // Required fields: every field on the entry must be non-empty.
  // Codex-r2 Bug 2 — chain_root_hash (the impl chain's own first-event
  // hash) is required alongside parent_chain_root (the WHAT parent
  // root). Two distinct values, both must be present.
  // Codex-r4 Bug 1 — merge_commit_sha is the proof Stage 5 actually
  // fetched the target-repo audit files and confirmed they existed at
  // that SHA. Without this the rollup would PASS on a PR-body claim
  // with no on-disk evidence whatsoever.
  const required: Array<keyof ImplementationChainEntry> = [
    'okr_id', 'parent_phase', 'parent_run_id', 'implementation_run_id',
    'mesh_repo', 'target_repo', 'event_log_path', 'key_path',
    'parent_intent_thread', 'parent_chain_root', 'chain_root_hash',
    'merge_commit_sha',
  ];
  for (const f of required) {
    if (!entry[f] || entry[f].trim() === '') {
      issues.push({ kind: 'evidence-missing', field: f });
    }
  }
  // Cross-axis: parent_intent_thread + parent_chain_root must match
  // the mesh-side truth from chain-ladder. Only verify when we have
  // both values to compare against (caller can pass null when not
  // yet sourced -- not a FAIL signal on its own).
  if (entry.parent_intent_thread && expectedIntentThread && entry.parent_intent_thread !== expectedIntentThread) {
    issues.push({
      kind: 'cross-repo-thread-broken',
      got: entry.parent_intent_thread,
      expected: expectedIntentThread,
    });
  }
  if (entry.parent_chain_root && expectedWhatChainRoot && entry.parent_chain_root !== expectedWhatChainRoot) {
    issues.push({
      kind: 'cross-repo-chain-root-mismatch',
      got: entry.parent_chain_root,
      expected: expectedWhatChainRoot,
    });
  }
  return issues;
}

/**
 * Predicate that mirrors the per-input atomicity logic in
 * buildExecutiveSummary's atomicityBroken check. Kept inline (no new
 * shared helper) because the per-action exec summary already names the
 * same precedence rules — keeping them in sync via duplication-by-
 * mirror is the lesser evil than threading the predicate through both.
 */
function isPhaseSourceAtomic(s: AuditReportInputSources): boolean {
  // Any of these conditions breaks atomicity (matches buildExecutiveSummary).
  if (s.okr === 'github' && s.chain === 'local-fallback') { return false; }
  if (s.keys === 'mismatch' || s.keys === 'missing') { return false; }
  if (s.runnerInput === 'jsonl-mismatch' || s.runnerInput === 'jsonl-missing') { return false; }
  return true;
}

/**
 * Compute the OKR-level verdict from the per-phase digests with strict
 * precedence: FAIL > PARTIAL > PASS.
 *
 *   FAIL — any phase digest has runnerVerdict.invoked && !ok, or has
 *          evidenceComplete=false, or has source atomicity broken.
 *   PARTIAL — fewer than 3 phases present (one or more of WHY/HOW/WHAT
 *             not started yet), AND no FAIL signal among present phases.
 *   PASS — all 3 phases present + each runner-verified (invoked && ok) +
 *          each source-atomic + each evidenceComplete.
 *
 * The reason string names the FIRST failing condition encountered in
 * deterministic order (phases array order) so two runs against the same
 * inputs always produce the same reason text.
 */
export function computeOkrRollupVerdict(input: OkrRollupInput): {
  verdict: OkrRollupVerdict;
  reason: string;
} {
  // FAIL precedence — check every present phase for any failure signal.
  for (const p of input.phases) {
    if (!p.evidenceComplete) {
      return {
        verdict: 'FAIL',
        reason: `${p.phase.toUpperCase()} phase has incomplete evidence: ${p.evidenceGaps.join('; ') || 'unspecified gap'}`,
      };
    }
    if (p.runnerVerdict.invoked && !p.runnerVerdict.ok) {
      return {
        verdict: 'FAIL',
        reason: `${p.phase.toUpperCase()} phase runner verdict FAIL: ${p.runnerVerdict.reason}`,
      };
    }
    if (!isPhaseSourceAtomic(p.sources)) {
      return {
        verdict: 'FAIL',
        reason: `${p.phase.toUpperCase()} phase source atomicity broken — report bytes ≠ runner bytes`,
      };
    }
  }
  // D-PR8 — implementation chain FAIL signals (highest-precedence
  // impl-side reasons, evaluated only after per-phase FAILs clear).
  // Order: cross-repo-thread-broken > cross-repo-chain-root-mismatch >
  // evidence-missing — matches the design doc D-PR8 acceptance
  // taxonomy. First failing slug wins for the reason string.
  if (input.implementationChain && input.implementationChain.rows.length > 0) {
    const { rows, expectedIntentThread, expectedWhatChainRoot } = input.implementationChain;
    for (const row of rows) {
      if (row.status !== 'pr-merged') continue;
      const issues = verifyImplementationChainEntry(row.chain, expectedIntentThread, expectedWhatChainRoot);
      const threadIssue = issues.find(i => i.kind === 'cross-repo-thread-broken');
      if (threadIssue) {
        return {
          verdict: 'FAIL',
          reason: `cross-repo-thread-broken:${row.repoSlug} — impl PR's parent_intent_thread does not match the OKR's master thread`,
        };
      }
      const rootIssue = issues.find(i => i.kind === 'cross-repo-chain-root-mismatch');
      if (rootIssue) {
        return {
          verdict: 'FAIL',
          reason: `cross-repo-chain-root-mismatch:${row.repoSlug} — impl PR's parent_chain_root does not match the WHAT phase's chain root`,
        };
      }
      const evidenceIssue = issues.find(i => i.kind === 'evidence-missing');
      if (evidenceIssue) {
        return {
          verdict: 'FAIL',
          reason: `implementation-chain-evidence-missing:${row.repoSlug} — impl PR body missing or incomplete (field: ${evidenceIssue.field})`,
        };
      }
    }
  }
  // PARTIAL — at least one expected phase not started yet (or runner not
  // invoked for innocent reasons, e.g. shape-only path). The OKR cannot
  // be PASS because the gold step is missing somewhere.
  if (input.missingPhases.length > 0) {
    return {
      verdict: 'PARTIAL',
      reason: `OKR incomplete — ${input.missingPhases.map(p => p.toUpperCase()).join(', ')} phase(s) not started yet`,
    };
  }
  // D-PR8 — implementation chain PARTIAL signals: pr-rejected rows.
  // Evaluated after the phase-completion PARTIAL so missing-phases
  // take precedence (an incomplete OKR is a bigger gap than a
  // rejected slice on a complete one).
  if (input.implementationChain && input.implementationChain.rows.length > 0) {
    for (const row of input.implementationChain.rows) {
      if (row.status === 'pr-rejected') {
        return {
          verdict: 'PARTIAL',
          reason: `implementation-pr-rejected:${row.repoSlug} — impl PR was closed without merging; revise + reopen`,
        };
      }
    }
    // Codex-r1 Bug D — any non-merged impl row (opened, pr-opened,
    // pending-on-upstream) means the OKR has not closed out the
    // implementation work yet. Without this, an OKR with 3 fanned-out
    // landing issues + 0 merged PRs would PASS the rollup, which is
    // not a closeout. PARTIAL is honest: the work isn't done.
    const inFlight = input.implementationChain.rows.find(r =>
      r.status === 'opened' || r.status === 'pr-opened' || r.status === 'pending-on-upstream'
    );
    if (inFlight) {
      return {
        verdict: 'PARTIAL',
        reason: `implementation-pr-in-flight:${inFlight.repoSlug} — impl row at status \`${inFlight.status}\`; wait for merge before closeout`,
      };
    }
  }
  // All 3 phases present and no FAIL — but each phase's runner must have
  // actually run and passed for PASS. Anything else (runner not invoked
  // on a present phase) downgrades to PARTIAL.
  for (const p of input.phases) {
    if (!p.runnerVerdict.invoked) {
      return {
        verdict: 'PARTIAL',
        reason: `${p.phase.toUpperCase()} phase runner NOT INVOKED: ${p.runnerVerdict.reason}`,
      };
    }
  }
  return { verdict: 'PASS', reason: 'All 3 phases present, runner-verified, and source-atomic' };
}

/**
 * Compose the OKR-level headline sourceTag from per-phase sources.
 *
 * - If every phase composes to canonical GitHub: same canonical headline
 *   as the per-action export.
 * - If every phase is local-fallback (all phases ran against local mesh):
 *   `local mesh checkout`.
 * - Otherwise: MIXED, naming the specific phase(s) that broke atomicity
 *   so a reviewer reading just the headline knows where to look.
 *
 * Reuses composeSourceTag per-phase to make the per-phase decision; this
 * helper only collapses the per-phase results into one OKR-level string.
 */
export function composeOkrRollupSourceTag(
  perPhase: Array<{ phase: 'why' | 'how' | 'what'; sources: AuditReportInputSources }>,
  repoInfo: { owner: string; repo: string } | null | undefined,
): string {
  if (perPhase.length === 0) {
    // No phases started — nothing to compose. Caller shouldn't really hit
    // this (PARTIAL covers it), but we don't want to throw.
    return 'no phases started';
  }
  // Reuse per-phase composeSourceTag to classify each. A phase is "canonical"
  // when its tag matches the canonical GitHub headline; "local" when local
  // mesh checkout; else MIXED.
  const canonicalTag = repoInfo ? `GitHub ${repoInfo.owner}/${repoInfo.repo} (default branch)` : null;
  const tagged = perPhase.map(p => ({ phase: p.phase, tag: composeSourceTag(p.sources, repoInfo) }));
  const allCanonical = canonicalTag !== null && tagged.every(t => t.tag === canonicalTag);
  const allLocal = tagged.every(t => t.tag === 'local mesh checkout');
  if (allCanonical && canonicalTag) { return canonicalTag; }
  if (allLocal) { return 'local mesh checkout'; }
  // MIXED — name which phase(s) are non-atomic (NOT canonical, NOT local).
  //
  // Codex E4-r1 MINOR fix: use each digest's actual `phase` label
  // rather than array position. Pre-fix used WHY/HOW/WHAT by index,
  // which mislabelled failing phases on malformed/reset OKRs where
  // the started-phases array doesn't start at WHY (e.g. an OKR where
  // HOW was started without WHY would label the failing HOW phase as
  // "WHY"). Sequential well-formed OKRs were unaffected.
  const brokenPhases = tagged
    .filter(t => t.tag !== canonicalTag && t.tag !== 'local mesh checkout')
    .map(t => t.phase.toUpperCase());
  const brokenList = brokenPhases.length > 0 ? brokenPhases.join(', ') : 'one or more phases';
  return `MIXED — non-atomic in ${brokenList} (see per-phase Trust posture for details)`;
}

/**
 * Render the per-phase trust block for one PhaseRollupDigest. When the
 * phase has evidenceComplete=false, renders an honest "evidence missing"
 * callout instead of the full trust posture (rollup verdict already
 * surfaces this as FAIL at the top).
 */
function renderPhaseTrustBlock(
  p: PhaseRollupDigest,
  repoInfo: { owner: string; repo: string } | null,
  ladderRow?: LadderRow,
): string {
  const heading = `### ${p.phase.toUpperCase()} · ${p.runId}`;
  if (!p.evidenceComplete) {
    const gaps = p.evidenceGaps.length > 0
      ? p.evidenceGaps.map(g => `  - ${g}`).join('\n')
      : '  - (no gaps named)';
    return `${heading}

⚠ **Evidence missing — cannot evaluate trust posture for this phase.** Specific gaps:

${gaps}

Action: \`${p.actionId}\` · status: \`${p.status}\``;
  }
  const rv = p.runnerVerdict;
  let runnerLine: string;
  if (rv.invoked && rv.ok) {
    runnerLine = `✅ runner-verified · ${rv.eventCount} events · chain head \`${rv.chainHead.slice(0, 16)}…\``;
  } else if (rv.invoked && !rv.ok) {
    runnerLine = `❌ runner rejected chain · \`${rv.reason}\``;
  } else {
    runnerLine = `⚠ runner NOT INVOKED · ${rv.reason}`;
  }
  const finalScores = p.reviewSummary.length > 0
    ? p.reviewSummary.map(r => {
        const last = r.rounds[r.rounds.length - 1];
        return `${r.persona}: ${last.score?.toFixed(2) ?? '—'} (${last.severity ?? '?'})`;
      }).join(' · ')
    : p.phase === 'why'
      ? '_not required for WHY_'
      : '_no signed self_review events_';
  const prCell = formatPrCell(p.prUrl, ladderRow?.prNumber, repoInfo);
  return `${heading}

- **Sources**: ${composeSourceTag(p.sources, repoInfo)}
- **Runner verdict**: ${runnerLine}
- **Final self-review scores**: ${finalScores}
- **Agent events signed**: ${p.agentStats.signedAgent}/${p.agentStats.totalAgent}
- **Artifact**: ${p.artifactPath ? `\`${p.artifactPath}\`` : '—'}
- **PR**: ${prCell}
- **Per-action report**: \`${p.perActionReportPath}\` (full closeout for this phase)`;
}

/**
 * Render the outstanding-gaps section — a bullet list of per-phase issues
 * + cross-cutting issues (suppressed PRD, non-canonical sources, missing
 * phases). Empty list shows the "no outstanding gaps" sentinel.
 */
function renderOutstandingGaps(input: OkrRollupInput): string {
  const gaps: string[] = [];
  for (const p of input.phases) {
    if (!p.evidenceComplete) {
      gaps.push(`**${p.phase.toUpperCase()}**: evidence missing — ${p.evidenceGaps.join('; ') || 'unspecified'}`);
    }
    if (p.runnerVerdict.invoked && !p.runnerVerdict.ok) {
      gaps.push(`**${p.phase.toUpperCase()}**: runner verdict FAIL — \`${p.runnerVerdict.reason}\``);
    } else if (!p.runnerVerdict.invoked) {
      gaps.push(`**${p.phase.toUpperCase()}**: runner NOT INVOKED — ${p.runnerVerdict.reason}`);
    }
    if (!isPhaseSourceAtomic(p.sources)) {
      gaps.push(`**${p.phase.toUpperCase()}**: source atomicity broken — runner bytes would differ from report bytes`);
    }
  }
  for (const m of input.missingPhases) {
    gaps.push(`**${m.toUpperCase()}**: phase not started — OKR incomplete`);
  }
  if (input.prdSource === 'suppressed-non-canonical') {
    gaps.push(`**Control mapping**: PRD suppressed (canonical fetch failed; local exists but withheld to preserve atomicity) — SR coverage cannot be verified from this rollup`);
  } else if (input.prdSource === 'missing') {
    gaps.push(`**Control mapping**: PRD missing — no SR definitions to cross-reference against design`);
  }
  if (input.artifactSource === 'suppressed-non-canonical') {
    gaps.push(`**Control mapping**: WHAT artifact suppressed — cannot verify SR citations in design`);
  }
  if (gaps.length === 0) {
    return '✓ No outstanding gaps across the OKR.';
  }
  return gaps.map(g => `- ${g}`).join('\n');
}

/**
 * Render verifier notes — one runner command per phase, so an auditor
 * can re-verify any phase independently from a fresh shell.
 */
function renderVerifierNotesPerPhase(input: OkrRollupInput): string {
  if (input.phases.length === 0) {
    return '_No phases started — nothing to re-verify._';
  }
  return input.phases.map(p => `**${p.phase.toUpperCase()} · ${p.runId}**

\`\`\`sh
printf '{"okrId":"${input.okrId}","runId":"${p.runId}"}' \\
  | npx -y @maintainabilityai/research-runner@~0.1.42 skill-audit-verify-chain
\`\`\``).join('\n\n');
}

/**
 * Build the OKR audit rollup markdown body. Pure function — input in,
 * string out. Caller (LookingGlassPanel.onExportOkrRollup) writes to
 * disk and opens the file in VS Code.
 *
 * Section order:
 *   1. Header — `# OKR Audit Rollup — <okrId>` + timestamp + sourceTag
 *   2. Executive summary — verdict / risk / action / scope
 *   3. OKR identity table
 *   4. Phase rollup table (one row per phase)
 *   5. Per-phase trust posture (one block per phase)
 *   6. Cross-phase ladder (reuses summarizeChainLadder)
 *   7. Unioned control coverage (reuses extractControlMapping rendering)
 *   8. Outstanding gaps (per-phase + cross-cutting)
 *   9. Verifier notes (one runner cmd per phase)
 */
/**
 * D-PR8 — render the per-target-repo implementation chain section.
 *
 * One row per target slug. Columns:
 *   - Repo (slug)
 *   - Status (from design-fan-out row + PR-state mapping)
 *   - PR (link)
 *   - implementation_run_id
 *   - Chain root match (parent_chain_root vs expected, ✓/✗/—)
 *   - Thread match (parent_intent_thread vs expected, ✓/✗/—)
 *   - Evidence files (event_log_path + key_path with target repo prefix)
 *   - Runner verify (placeholder `not-yet-verified` per design doc D-PR8
 *     MVP -- T3-2 runner extension is when this column flips real)
 *
 * Below the table: an inline detail list of per-row issues when any
 * row produced ImplementationChainIssues (renders the discriminated
 * issue.field / got vs expected so the reviewer doesn't need to
 * cross-reference verifyImplementationChainEntry).
 */
function renderImplementationChainSection(
  rows: ImplementationChainRow[],
  expectedIntentThread: string | null,
  expectedWhatChainRoot: string | null,
): string {
  if (rows.length === 0) return '';

  const tableRows: string[] = [];
  const issueBlocks: string[] = [];

  for (const row of rows) {
    const issues = verifyImplementationChainEntry(row.chain, expectedIntentThread, expectedWhatChainRoot);
    const prCell = row.prUrl ? `[link](${row.prUrl})` : '—';
    const runIdCell = row.chain?.implementation_run_id
      ? `\`${row.chain.implementation_run_id}\``
      : '—';
    // Chain root match: ✓ when entry has it AND matches expected;
    // ✗ when entry has it but mismatches; — when entry missing OR
    // expected missing (skip-axis).
    const rootMatch = !row.chain || !row.chain.parent_chain_root
      ? '—'
      : !expectedWhatChainRoot
        ? '—'
        : row.chain.parent_chain_root === expectedWhatChainRoot ? '✓' : '✗';
    const threadMatch = !row.chain || !row.chain.parent_intent_thread
      ? '—'
      : !expectedIntentThread
        ? '—'
        : row.chain.parent_intent_thread === expectedIntentThread ? '✓' : '✗';
    const evidenceCell = row.chain && row.chain.event_log_path && row.chain.key_path
      ? `\`${row.chain.event_log_path}\` · \`${row.chain.key_path}\``
      : '_missing_';
    const verifyCell = '_not-yet-verified_';
    tableRows.push(
      `| \`${row.repoSlug}\` | ${row.status} | ${prCell} | ${runIdCell} | ${rootMatch} | ${threadMatch} | ${evidenceCell} | ${verifyCell} |`,
    );

    if (issues.length > 0) {
      const lines: string[] = [];
      lines.push(`**\`${row.repoSlug}\`** — ${issues.length} issue${issues.length === 1 ? '' : 's'}:`);
      for (const issue of issues) {
        if (issue.kind === 'evidence-missing') {
          lines.push(`  - \`evidence-missing\`: \`implementation_chain.${issue.field}\` missing or empty in the PR body's YAML frontmatter`);
        } else if (issue.kind === 'cross-repo-thread-broken') {
          lines.push(`  - \`cross-repo-thread-broken\`: parent_intent_thread = \`${issue.got}\` ≠ OKR master thread \`${issue.expected}\``);
        } else if (issue.kind === 'cross-repo-chain-root-mismatch') {
          lines.push(`  - \`cross-repo-chain-root-mismatch\`: parent_chain_root = \`${issue.got}\` ≠ WHAT phase chain root \`${issue.expected}\``);
        }
      }
      issueBlocks.push(lines.join('\n'));
    }
  }

  const table = `| Repo | Status | PR | Implementation run id | parent_chain_root | parent_intent_thread | Evidence in target repo | Runner verify |
|---|---|---|---|:---:|:---:|---|---|
${tableRows.join('\n')}`;

  const issuesSection = issueBlocks.length > 0
    ? `\n\n**Implementation chain issues**\n\n${issueBlocks.join('\n\n')}`
    : '';

  const verifyHint = '\n\n_Runner verify column shows `not-yet-verified` pending the audit-verify-chain runner extension (Tier 3 T3-2). Chain-root + thread cross-checks above are the verification today — `✓` means the PR body\'s continuation block matched the mesh-side ground truth from chain-ladder.yaml._';

  // Tier 2.5a — Red Queen enforcement subsection. Only rendered when at least
  // one row carries a signed redqueen_decisions digest; absent on older runs
  // (runner predates the signer) so the section is omitted cleanly, no error.
  const redqueenSection = renderRedqueenSubsection(rows);

  return table + issuesSection + verifyHint + redqueenSection;
}

/**
 * Tier 2.5a — per-repo Red Queen enforcement digest sub-block for the OKR
 * rollup. Returns '' when no row carries a digest (back-compat). Shows the
 * signed allow/deny/override counts plus a bounded denials list when any deny
 * decisions were recorded. Verifiability note: the counts are signed onto the
 * IMPL chain via the `redqueen_decisions` event (its signature is validated by
 * the chain verify), and `logSha256` lets a reader re-hash the committed
 * `.redqueen/audit-log.jsonl` and confirm it matches.
 */
function renderRedqueenSubsection(rows: ImplementationChainRow[]): string {
  const rqRows = rows.filter((r) => r.redqueenDigest);
  if (rqRows.length === 0) { return ''; }
  const lines: string[] = [];
  lines.push('');
  lines.push('## Implementation chain (Red Queen)');
  lines.push('');
  lines.push('| Repo | Signed | Allowed | Denied | Overrides | Log sha256 |');
  lines.push('|---|:---:|---:|---:|---:|---|');
  for (const row of rqRows) {
    const d = row.redqueenDigest!;
    const signedIcon = d.signed ? '✓' : '—';
    const sha = d.logSha256 ? `\`${d.logSha256.slice(0, 12)}…\`` : '—';
    lines.push(`| \`${row.repoSlug}\` | ${signedIcon} | ${d.allowed} | ${d.denied} | ${d.overrides} | ${sha} |`);
  }
  // Denials detail (only when present).
  for (const row of rqRows) {
    const d = row.redqueenDigest!;
    if (!d.denials || d.denials.length === 0) { continue; }
    lines.push('');
    lines.push(`**\`${row.repoSlug}\`** — Red Queen denials (${d.denials.length}):`);
    for (const dn of d.denials) {
      const tool = dn.tool ?? '?';
      const file = dn.filePath ? ` \`${dn.filePath}\`` : '';
      const rule = dn.ruleId ? ` [${dn.ruleId}]` : '';
      const reason = dn.reason ? ` — ${dn.reason}` : '';
      lines.push(`  - ${tool}${file}${rule}${reason}`);
    }
  }
  return '\n\n' + lines.join('\n');
}

export function buildOkrRollupMarkdown(input: OkrRollupInput): string {
  const { verdict, reason } = computeOkrRollupVerdict(input);
  const verdictBadge = verdict === 'PASS'
    ? '✅ PASS'
    : verdict === 'PARTIAL' ? '⚠ PARTIAL' : '❌ FAIL';

  // Executive summary — same VERDICT/RISK/ACTION/SCOPE shape as per-action
  // exec summary so reviewers trained on per-action recognize it.
  const riskLine = verdict === 'FAIL'
    ? 'CRITICAL — see Outstanding gaps for the specific failing phase'
    : verdict === 'PARTIAL'
      ? 'MEDIUM — OKR is not fully complete; rollup is informational only'
      : 'LOW — all 3 phases runner-verified + source-atomic';
  const actionLine = verdict === 'PASS'
    ? 'APPROVE OKR closeout for downstream use. All phases verified end-to-end with the same runner CI uses.'
    : verdict === 'PARTIAL'
      ? 'CONTINUE — complete the missing phase(s) listed below before treating this rollup as a final closeout.'
      : 'REJECT — fix the failing phase(s) listed below and re-export the rollup before treating any phase as closeout-ready.';
  const scopeLine = `OKR \`${input.okrId}\` · ${input.phases.length}/3 phases started · ${input.missingPhases.length} missing`;
  const execSummary = [
    '```',
    `VERDICT:  ${verdictBadge} — ${reason}`,
    `RISK:     ${riskLine}`,
    `ACTION:   ${actionLine}`,
    `SCOPE:    ${scopeLine}`,
    '```',
  ].join('\n');

  // OKR identity table.
  const identityTable = `| Field | Value |
|---|---|
| OKR | \`${input.okrId}\` |
| Objective | ${input.objective ?? '—'} |
| Owner | ${input.owner ?? '—'} |
| Tier | ${input.tier ?? '—'} |
| BAR | ${input.barId ? `\`${input.barId}\`` : '—'} |
| Created | ${input.createdAt ?? '—'} |
| Completed | ${input.completedAt ?? '_(in progress)_'} |`;

  // Cross-phase ladder is useful in multiple sections: the ladder table
  // itself, PR links in the phase rollup, and PR lines in the per-phase
  // trust blocks. Parse once and index by run ID / phase.
  const ladderRows = summarizeChainLadder(input.chainLadderText);
  const ladderForPhase = (p: PhaseRollupDigest): LadderRow | undefined =>
    ladderRows.find(r => r.runId === p.runId)
    ?? ladderRows.find(r => r.phase.toLowerCase() === p.phase);

  // Phase rollup table — one row per phase, plus rows for missing phases
  // so the table always shows 3 rows for a fully-spec'd OKR.
  const phaseRow = (p: PhaseRollupDigest): string => {
    const sealed = p.verdict.seal.sealed ? '🛡 sealed' : p.verdict.seal.sealTampered ? '⚠ tampered' : '—';
    const rv = p.runnerVerdict;
    const runnerCell = rv.invoked
      ? (rv.ok ? `✅ PASS` : `❌ FAIL`)
      : '⚠ NOT INVOKED';
    const chainHeadCell = p.chainHead ? `\`${p.chainHead.slice(0, 12)}…\`` : '—';
    const prCell = formatPrCell(p.prUrl, ladderForPhase(p)?.prNumber, input.repoInfo);
    return `| ${p.phase.toUpperCase()} | \`${p.runId}\` | ${p.status} | ${sealed} | ${runnerCell} | ${chainHeadCell} | ${prCell} |`;
  };
  const missingRow = (m: 'why' | 'how' | 'what'): string =>
    `| ${m.toUpperCase()} | _not started_ | — | — | — | — | — |`;
  const phaseTableRows: string[] = [];
  // Render in WHY → HOW → WHAT order regardless of array ordering, so
  // the rollup table always reads phase-naturally.
  for (const ph of ['why', 'how', 'what'] as const) {
    const present = input.phases.find(p => p.phase === ph);
    if (present) {
      phaseTableRows.push(phaseRow(present));
    } else if (input.missingPhases.includes(ph)) {
      phaseTableRows.push(missingRow(ph));
    }
  }
  const phaseTable = `| Phase | Run ID | Status | Sealed | Runner | Chain head | PR |
|---|---|---|---|---|---|---|
${phaseTableRows.join('\n')}`;

  // Per-phase trust posture blocks.
  const trustBlocks = input.phases.map(p => renderPhaseTrustBlock(p, input.repoInfo, ladderForPhase(p))).join('\n\n');

  // Cross-phase ladder — reuse the same summarizeChainLadder + table
  // rendering as the per-action export so the format is recognizable.
  const ladderBlock = input.chainLadderText
    ? (ladderRows.length > 0
        ? `| Phase | Run ID | Merged | PR | Chain root |
|---|---|---|---|---|
${ladderRows.map(r => `| \`${r.phase}\` | \`${r.runId}\` | ${r.mergedAt} | ${formatPrCell(null, r.prNumber, input.repoInfo)} | \`${r.chainHead}\` |`).join('\n')}

<details>
<summary>Raw <code>chain-ladder.yaml</code></summary>

\`\`\`yaml
${input.chainLadderText.trim()}
\`\`\`

</details>`
        : `_chain-ladder.yaml present but failed to parse OR has no entries._`)
    : input.ladderSource === 'suppressed-non-canonical'
      ? '_chain-ladder.yaml suppressed (canonical fetch failed; local exists but withheld to preserve atomicity)._'
      : '_chain-ladder.yaml not present — single-phase OKR or finalize did not write one yet._';

  // Unioned control coverage. When PRD or artifact is suppressed/missing,
  // honor the suppression with an explicit "not rendered" note.
  let controlBlock: string;
  if (input.controlRows.length > 0) {
    controlBlock = `| SR | STRIDE | OWASP | PRD anchor | Design references SR? |
|---|---|---|---|:---:|
${input.controlRows.map(r => `| \`${r.sr}\` | ${r.stride.length > 0 ? r.stride.map(s => `\`${s}\``).join(', ') : '_not declared_'} | ${r.owasp.length > 0 ? r.owasp.map(o => `\`${o}\``).join(', ') : '_not declared_'} | ${r.prdAnchor} | ${r.designCited ? '✓' : '✗'} |`).join('\n')}

_Cited check is a textual reference of the SR-NN string in the artifact body — does NOT validate the implementation actually satisfies the requirement. The phrase "not declared" means the PRD did not explicitly name that taxonomy for the SR. That belongs in PR review._`;
  } else if (input.prdSource === 'suppressed-non-canonical') {
    controlBlock = '_Control mapping not rendered — PRD suppressed (canonical fetch failed; local exists but withheld to preserve atomicity)._';
  } else if (input.prdSource === 'missing') {
    controlBlock = '_Control mapping not rendered — PRD missing (no SR definitions to cross-reference)._';
  } else if (input.artifactSource === 'suppressed-non-canonical') {
    controlBlock = '_Control mapping not rendered — WHAT artifact suppressed (cannot verify SR citations in design)._';
  } else {
    controlBlock = '_Control mapping not rendered — no SR-NN sections found in the PRD._';
  }

  const outstandingGaps = renderOutstandingGaps(input);
  const verifierNotes = renderVerifierNotesPerPhase(input);

  // D-PR8 — implementation chain section. Rendered between control
  // coverage and outstanding gaps so its FAIL/PARTIAL signals
  // immediately precede the gap list (which is where reviewers go
  // to find the actionable fix).
  const implChainBlock = input.implementationChain && input.implementationChain.rows.length > 0
    ? renderImplementationChainSection(
        input.implementationChain.rows,
        input.implementationChain.expectedIntentThread,
        input.implementationChain.expectedWhatChainRoot,
      )
    : null;

  return `# OKR Audit Rollup — ${input.okrId}

> Generated by Looking Glass · ${new Date().toISOString()}
> Sources: ${input.sourceTag}
> Whole-OKR rollup — for per-action closeouts, see \`okrs/${input.okrId}/audit/exports/<runId>-report.md\`.

## Executive summary

${execSummary}

## OKR identity

${identityTable}

## Phase rollup

${phaseTable}

## Per-phase trust posture

${trustBlocks || '_No phases started — nothing to summarize._'}

## Cross-phase ladder

${ladderBlock}

## Unioned control coverage

_Did each PRD-declared security requirement land in the design? Unioned across all phases._

${controlBlock}
${implChainBlock ? `\n## Implementation chain\n\n${implChainBlock}\n` : ''}
## Outstanding gaps

${outstandingGaps}

## Verifier notes

**UI shape check is convenience. Runner verifier is source of truth.**

The rollup verdict reflects per-phase runner verdicts the same way the per-action exports do. To re-verify any phase independently from a fresh shell:

${verifierNotes}
`;
}
