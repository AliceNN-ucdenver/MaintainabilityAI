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
