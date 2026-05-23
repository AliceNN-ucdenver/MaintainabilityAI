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

/** Shape the seal detector reads off each parsed JSONL line. */
interface SealEvent {
  event_kind?: string;
  signature?: string;
  payload?: { emitted_by?: string };
}

/**
 * Knight's Seal v1 (B27) — scan an audit-events JSONL for per-event
 * Ed25519 signatures and report a UI-shaped seal verdict.
 *
 * Verdict matrix (mirrors runner's `audit-verify-chain`):
 *
 * - `{ sealed: true }` — every agent event signed; no forged workflow
 *   attribution. CI workflow re-verifies cryptographically.
 * - `{ sealed: false, sealTampered: true }` — any unsigned agent event,
 *   OR any workflow-attributed event whose `event_kind` is NOT in
 *   `WORKFLOW_EMITTABLE_KINDS`. Renders the red Tampered badge.
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
    try {
      const event = JSON.parse(line) as SealEvent;
      const claimsWorkflow = event.payload?.emitted_by === 'workflow';
      const kind = event.event_kind ?? '';
      const hasSignature = typeof event.signature === 'string' && event.signature.length > 0;
      // Workflow attribution on a non-allowlisted kind is the round-7
      // attack: hand-write `event_kind: self_review` +
      // `payload.emitted_by: workflow` and the runner pre-Bug-V said
      // sealed:true. Post-Bug-V the runner rejects with
      // `workflow-event-kind-not-allowed-line-N`; the UI matches here.
      if (claimsWorkflow && !WORKFLOW_EMITTABLE_KINDS.has(kind)) {
        forged = true;
        continue;
      }
      const isLegitimateWorkflowEmission = claimsWorkflow && WORKFLOW_EMITTABLE_KINDS.has(kind);
      if (!isLegitimateWorkflowEmission) {
        agentEvents++;
        if (hasSignature) { signed++; }
      }
    } catch { /* malformed line — skip */ }
  }
  if (forged) { return { sealed: false, sealTampered: true }; }
  if (agentEvents === 0) { return {}; }
  if (signed === agentEvents) { return { sealed: true }; }
  return { sealed: false, sealTampered: true };
}

/**
 * Returns true if the event would be accepted by the runner's
 * `audit-verify-chain` — i.e., either a legitimately-signed agent
 * event, or a workflow-emittable allowlisted kind carrying
 * `payload.emitted_by:'workflow'`. Used by the UI to gate metric
 * extraction (skill_call counts, self_review surfacing) so forged
 * events never pollute the audit comment / phase card numbers ahead
 * of CI's chain-check failure.
 */
export function isEventLegitimate(event: { event_kind?: string; signature?: string; payload?: { emitted_by?: string } }): boolean {
  const claimsWorkflow = event.payload?.emitted_by === 'workflow';
  const kind = event.event_kind ?? '';
  const hasSignature = typeof event.signature === 'string' && event.signature.length > 0;
  if (claimsWorkflow) {
    return WORKFLOW_EMITTABLE_KINDS.has(kind);
  }
  return hasSignature;
}
