/**
 * Audit-chain verification helpers — UI mirror of the runner's
 * `audit-verify-chain` skill (packages/research-runner/src/runner/skills.ts).
 *
 * The runner is the cryptographic source of truth: it walks the JSONL,
 * verifies per-event Ed25519 signatures against per-epoch public keys,
 * enforces the workflow-emittable-kind allowlist, and rejects forged
 * events with structured `reason` strings. The Looking Glass UI runs
 * its own lightweight chain walk (no signature verification — that
 * needs the public keys + ed25519 crypto) to produce the seal badge +
 * gate the per-phase metrics. The two MUST agree on what counts as
 * forgery; if they drift, the UI badge lies about a chain that CI
 * will later reject.
 *
 * Codex round-7 (Bug W) flagged the drift: the UI accepted any event
 * with `payload.emitted_by === 'workflow'` as legitimately unsigned,
 * regardless of event_kind. A hand-written unsigned `self_review`
 * marked workflow rendered `sealed: true` in Looking Glass while
 * the runner rejected the chain with `workflow-event-kind-not-allowed`.
 * Closed by mirroring the allowlist on both sides — runner is the
 * source of truth; any edit there must be mirrored here.
 */

/**
 * Mirror of `WORKFLOW_EMITTABLE_KINDS` in
 * packages/research-runner/src/runner/skills.ts. Post-Bug-V allowlist
 * (Codex round-6): only the three workflow-infrastructure events that
 * are re-derivable from canonical sources may carry
 * `payload.emitted_by:'workflow'` and lack a signature. Every other
 * kind MUST be agent-signed under the active per-epoch private key.
 */
export const WORKFLOW_EMITTABLE_KINDS = new Set<string>([
  'artifact_written',  // workflow re-derives from `git diff`
  'state_transition',  // workflow infrastructure events (label flips)
  'human_gate',        // workflow gate events (PR reviewer state)
  'rail_decision',     // Oracle rail verdict — re-derived by re-running the pinned rail (replay)
]);

/**
 * Bug Y (Codex round-9) — event_kind → origin map. Mirror of the
 * runner's EVENT_KIND_ORIGIN in packages/research-runner/src/runner/skills.ts.
 * The runner sets `payload.emitted_by` from this map (NEVER from user
 * input) on every emission, so the verifier (and this UI mirror) can
 * cross-check `event_kind ↔ emitted_by` to catch hand-written
 * forgeries. Edits on one side MUST be mirrored here.
 */
export const EVENT_KIND_ORIGIN: Record<string, 'runtime' | 'agent' | 'workflow'> = {
  skill_call: 'runtime',
  llm_call: 'runtime',
  self_review: 'agent',
  self_review_exhausted: 'agent',
  gap_loop: 'agent',
  review_received: 'agent',
  review_emitted: 'agent',
  artifact_written: 'workflow',
  state_transition: 'workflow',
  human_gate: 'workflow',
  rail_decision: 'workflow',
};

/** Shape the seal detector reads off each parsed JSONL line. */
interface SealEvent {
  event_kind?: string;
  signature?: string;
  signer_epoch?: unknown;
  payload?: { emitted_by?: string };
}

/**
 * Bug Y (round-9) — does the event pass the runner's origin-kind
 * consistency check? Returns false for forgeries where the line's
 * declared `event_kind` and `payload.emitted_by` don't match the
 * runner-set EVENT_KIND_ORIGIN map (or where the kind is unknown
 * entirely).
 */
function originKindMatches(event: SealEvent): boolean {
  const kind = event.event_kind ?? '';
  const expected = EVENT_KIND_ORIGIN[kind];
  if (!expected) { return false; }  // unknown kind — runner rejects too
  return event.payload?.emitted_by === expected;
}

/**
 * Knight's Seal v1 (B27) — scan an audit-events JSONL for per-event
 * Ed25519 signatures and report a UI-shaped seal verdict.
 *
 * Verdict matrix (mirrors runner's `audit-verify-chain` exactly):
 *
 * - `{ sealed: true }` — every agent event signed AND carries
 *   `signer_epoch:number`; no forged workflow attribution; every
 *   line parses. CI workflow re-verifies cryptographically.
 * - `{ sealed: false, sealTampered: true }` — any of these forgeries:
 *     - workflow attribution on a non-allowlisted kind (round-7)
 *     - workflow attribution carrying a non-empty signature
 *       (round-8: runner skips signature verification for workflow
 *       events, so a fake signature would otherwise sneak through)
 *     - workflow attribution carrying a `signer_epoch` (round-8:
 *       epochs are agent-session concept; workflow has none)
 *     - any unsigned agent event
 *     - any signed agent event missing numeric `signer_epoch`
 *     - any malformed JSONL line (runner hard-rejects with
 *       `bad-jsonl-line-N`; UI must match)
 * - `{}` — chain has no agent events at all (rare; e.g. a
 *   workflow-infrastructure-only chain). No seal badge rendered.
 *
 * Pure function — pass the JSONL lines, get a verdict object. Lifted
 * into this module so vitest can exercise it without dragging in the
 * VS Code runtime; LookingGlassPanel.ts imports from here.
 */
export function detectKnightSeal(lines: string[]): { sealed?: boolean; sealTampered?: boolean } {
  let signed = 0;
  let agentEvents = 0;
  let forged = false;
  for (const line of lines) {
    let event: SealEvent;
    try {
      event = JSON.parse(line) as SealEvent;
    } catch {
      // Bug X (round-8) — runner rejects malformed lines with
      // bad-jsonl-line-N; UI was silently skipping. Treat as forgery
      // so the UI badge doesn't render green on a chain CI rejects.
      forged = true;
      continue;
    }
    // Bug Y (round-9) — origin-kind consistency. The runner sets
    // payload.emitted_by from EVENT_KIND_ORIGIN; a hand-written line
    // whose kind + emitted_by disagree is forgery. UI mirrors the
    // runner check so badges agree with what CI would emit.
    if (!originKindMatches(event)) { forged = true; continue; }
    const claimsWorkflow = event.payload?.emitted_by === 'workflow';
    const kind = event.event_kind ?? '';
    const hasSignature = typeof event.signature === 'string' && event.signature.length > 0;
    const hasNumericEpoch = typeof event.signer_epoch === 'number';
    const epochAbsent = event.signer_epoch === undefined;
    if (claimsWorkflow) {
      // Round-7 attack: workflow attribution on a non-allowlisted kind.
      if (!WORKFLOW_EMITTABLE_KINDS.has(kind)) { forged = true; continue; }
      // Round-8 attacks: signed workflow event OR workflow event
      // carrying signer_epoch. Both forgery — workflow has no key
      // and no epoch concept.
      if (hasSignature || !epochAbsent) { forged = true; continue; }
      continue;  // legitimate workflow event — not counted as agent
    }
    agentEvents++;
    if (!hasSignature) { continue; }  // unsigned agent event — caught at end
    if (!hasNumericEpoch) { forged = true; continue; }  // round-8 contract
    signed++;
  }
  if (forged) { return { sealed: false, sealTampered: true }; }
  if (agentEvents === 0) { return {}; }
  if (signed === agentEvents) { return { sealed: true }; }
  return { sealed: false, sealTampered: true };
}

/**
 * Returns true if the event would be accepted by the runner's
 * `audit-verify-chain` — i.e., either a legitimately-signed agent
 * event (signature + numeric signer_epoch), or a workflow-emittable
 * allowlisted kind with empty signature AND no signer_epoch. Used
 * by the UI to gate metric extraction (skill_call counts,
 * self_review surfacing) so forged events never pollute the audit
 * comment / phase card numbers ahead of CI's chain-check failure.
 *
 * Bug X (round-8) — tightened in lockstep with detectKnightSeal:
 * signer_epoch and signed-workflow-event checks now match the runner.
 */
/**
 * E1 (2026-05-25) — chain-verification verdict shape for the UI's
 * "Verify Chain" modal. Mirrors the verdict surface the runner's
 * `audit-verify-chain` skill produces, but using the in-extension
 * helpers (no signature crypto — flags signed agent events as
 * "verified-shape" rather than "verified-crypto"; the modal surfaces
 * a "Re-run full verify via runner" link for users who need the
 * cryptographic gold).
 */
export interface ChainVerifyVerdict {
  /** Knight's Seal verdict (sealed/tampered/no-agent-events). */
  seal: { sealed?: boolean; sealTampered?: boolean };
  /** Total events in the JSONL (including unparseable lines). */
  totalEvents: number;
  /** Lines that failed JSON.parse. Each one is forgery per the runner. */
  malformedLines: number;
  /** Per-kind counts. */
  byKind: Record<string, { signed: number; unsigned: number }>;
  /** Agent events lacking a signature (forgery per Bug V). */
  unsignedAgentEvents: number;
  /** Workflow events carrying a signature (forgery per Bug X round-8). */
  signedWorkflowEvents: number;
  /** Events whose payload.emitted_by disagrees with EVENT_KIND_ORIGIN. */
  originKindMismatches: number;
  /** First failure encountered, if any — for surfacing in the UI. */
  firstFailure: { line: number; kind: string; reason: string } | null;
  /** True if every event passed the in-extension legitimacy check. */
  shapeOk: boolean;
}

/**
 * Walk a JSONL chain and produce a UI-shaped verdict. Caller passes the
 * decoded text split into lines (one event per line, empties stripped).
 * The verdict tells the modal what to render: a green "Sealed" panel
 * with the per-kind breakdown, or a red "Tampered" panel naming the
 * first failure point.
 *
 * Limitations vs runner:
 *   - Does NOT verify Ed25519 signatures cryptographically (helper
 *     doesn't load pub keys or do signature math). Shape-checks only.
 *   - Does NOT recompute per-event hash continuity (prev_event_hash →
 *     this_event_hash chain) — that's runner-territory and requires
 *     the canonical event-hash algorithm. Modal surfaces a "Re-run
 *     full verify via runner" link for the gold path.
 *
 * What the helper DOES catch (every check the runner enforces minus
 * the two above):
 *   - Malformed JSONL lines (bad-jsonl-line-N)
 *   - Origin-kind mismatches (event_kind ↔ emitted_by drift, Bug Y)
 *   - Workflow attribution on a non-allowlisted kind (Bug V/W)
 *   - Signed workflow events (Bug X round-8 — workflow has no key)
 *   - Workflow events carrying signer_epoch (Bug X round-8)
 *   - Unsigned agent events (Bug V — signature mandatory)
 *   - Signed agent events lacking numeric signer_epoch (Bug X round-8)
 */
export function verifyChainForUI(lines: string[]): ChainVerifyVerdict {
  const byKind: Record<string, { signed: number; unsigned: number }> = {};
  let malformedLines = 0;
  let unsignedAgentEvents = 0;
  let signedWorkflowEvents = 0;
  let originKindMismatches = 0;
  let firstFailure: { line: number; kind: string; reason: string } | null = null;
  function record(lineNo: number, kind: string, reason: string) {
    if (firstFailure === null) { firstFailure = { line: lineNo, kind, reason }; }
  }
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || raw.trim().length === 0) { continue; }
    total++;
    let event: SealEvent & { payload?: { emitted_by?: string } };
    try {
      event = JSON.parse(raw) as SealEvent & { payload?: { emitted_by?: string } };
    } catch {
      malformedLines++;
      record(i + 1, '?', 'malformed-jsonl');
      continue;
    }
    const kind = event.event_kind ?? '?';
    const hasSignature = typeof event.signature === 'string' && event.signature.length > 0;
    byKind[kind] = byKind[kind] ?? { signed: 0, unsigned: 0 };
    if (hasSignature) { byKind[kind].signed++; } else { byKind[kind].unsigned++; }
    if (!originKindMatches(event)) {
      originKindMismatches++;
      record(i + 1, kind, 'origin-kind-mismatch (event_kind ↔ emitted_by drift)');
      continue;
    }
    const claimsWorkflow = event.payload?.emitted_by === 'workflow';
    if (claimsWorkflow) {
      if (!WORKFLOW_EMITTABLE_KINDS.has(kind)) {
        signedWorkflowEvents++;  // misuse — non-allowlisted workflow kind
        record(i + 1, kind, 'workflow-attribution-on-non-allowlisted-kind');
        continue;
      }
      if (hasSignature) {
        signedWorkflowEvents++;
        record(i + 1, kind, 'signed-workflow-event (workflow has no key)');
        continue;
      }
    } else {
      if (!hasSignature) {
        unsignedAgentEvents++;
        record(i + 1, kind, 'unsigned-agent-event');
        continue;
      }
      if (typeof event.signer_epoch !== 'number') {
        unsignedAgentEvents++;
        record(i + 1, kind, 'agent-event-missing-numeric-signer_epoch');
        continue;
      }
    }
  }
  const shapeOk = firstFailure === null;
  const seal = detectKnightSeal(lines);
  return {
    seal,
    totalEvents: total,
    malformedLines,
    byKind,
    unsignedAgentEvents,
    signedWorkflowEvents,
    originKindMismatches,
    firstFailure,
    shapeOk,
  };
}

export function isEventLegitimate(event: { event_kind?: string; signature?: string; signer_epoch?: unknown; payload?: { emitted_by?: string } }): boolean {
  // Bug Y (round-9) — origin-kind consistency check first. If the
  // line's kind + emitted_by don't agree with EVENT_KIND_ORIGIN, it
  // can't have come from a legitimate emission path.
  if (!originKindMatches(event)) { return false; }
  const claimsWorkflow = event.payload?.emitted_by === 'workflow';
  const kind = event.event_kind ?? '';
  const hasSignature = typeof event.signature === 'string' && event.signature.length > 0;
  const hasNumericEpoch = typeof event.signer_epoch === 'number';
  const epochAbsent = event.signer_epoch === undefined;
  if (claimsWorkflow) {
    if (!WORKFLOW_EMITTABLE_KINDS.has(kind)) { return false; }
    // Workflow events MUST be unsigned + carry no signer_epoch.
    return !hasSignature && epochAbsent;
  }
  // Agent event: signature AND signer_epoch:number both required.
  return hasSignature && hasNumericEpoch;
}
