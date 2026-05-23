---
name: audit-emit-event
description: Append one hash-chained audit event to okrs/<id>/audit/events/<run-id>.jsonl. Returns the new chain head.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-audit-emit-event
---

# Audit Emit Event Skill

Hash-chained, append-only audit log writer; one JSONL event per line per run. Every event is Ed25519-sealed (Knight's Seal v1, B27).

## When to call this skill (post-Bug-V)

Audit-event ownership in the current contract (Bug V / Codex round-6 + Bug W / round-7):

| Event kind | Emitter | When |
|---|---|---|
| `skill_call` | **Runner** (auto-emit via `runSkill()`) | Every skill invocation. Agent does nothing. |
| `llm_call` | **Runner** (when wired) | Every model call. Agent does nothing. |
| `artifact_written` | **Workflow** (deterministic, from `git diff`) | Post-PR commit. Agent does nothing. |
| `state_transition` | **Workflow** (from PR labels) | Label flip / phase advance. Agent does nothing. |
| `human_gate` | **Workflow** (from PR reviewer state) | HumanGate transition. Agent does nothing. |
| `self_review` | **AGENT — you, via this skill** | At the end of each persona-prompt section (Architect / Security / Code-Architect / Code-Security) while your per-epoch private key is still in scope. The runner signs it. |
| `self_review_exhausted` | **AGENT — you, via this skill** | When the auto-revise loop hits MAX_AUTO_ROUNDS without convergence. |
| `review_received` / `review_emitted` | (reserved) | The separate reviewer-agent dispatch was retired in B24; nothing emits these today. Reserved for future use; would be agent-signed if revived. |

**You DO call this skill — for `self_review` events.** This is the post-Bug-V contract: the agent (you) is the only legitimate emitter of `self_review` because the persona-critique is LLM judgment, not workflow-derived. Pre-Bug-V the workflow parsed PR-body blocks and emitted unsigned synthetic `self_review` events with `payload.emitted_by:"workflow"`; Codex round-6 demonstrated that path was forgeable (hand-write an unsigned `self_review` with `emitted_by:workflow` and audit-verify-chain pre-Bug-V returned `ok:true sealed:true`). Workflow allowlist now excludes `self_review` — the only legitimate `self_review` event is one signed under your per-epoch keypair via this skill.

Other use cases:
- **Gap-loop semantic markers** (market-research-agent step 8b) — the runner can't infer coverage-gap iteration. Emit with `payload.skill: "gap-loop"` and the follow-up queries (uses `eventKind: "skill_call"`).
- **Legacy / no-session-context runtimes** — if `OKR_ID` / `RUN_ID` / `INTENT_THREAD_UUID` / `PHASE` env vars are absent the runner skips auto-emission. In that fallback mode call this skill explicitly per skill_call.

For `skill_call` (regular case) / `artifact_written` / `state_transition` / `human_gate`: do nothing — the runner + workflow already handle it.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `okrId` | `string` | yes | — | Which OKR's audit log to append to. |
| `runId` | `string` | yes | — | Stable per agent run (e.g. `RES-2026-05-19-abc123`). |
| `eventKind` | `"skill_call" \| "llm_call" \| "artifact_written" \| "self_review" \| "self_review_exhausted" \| "review_received" \| "state_transition" \| "human_gate"` | yes | — | See §7.5. |
| `payload` | `Record<string, unknown>` | yes | — | Event-kind-specific data. Must not contain secrets. For `self_review`, include `{round, persona, score, severity, prompt_pack}` at minimum. |
| `phase` | `"why" \| "how" \| "what"` | yes | — | OKR phase this event belongs to (v4 §11.1.6). |
| `intentThreadUuid` | `string` | yes | — | The OKR's `meta.intentThreadUuid`. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | False only on file-lock failure after 3 retries. |
| `chainHead` | `string` | The new chain-root SHA-256 (the appended event's `event_hash`). |
| `eventId` | `integer` | Monotonic position in the run's JSONL. |

## Invocation

```sh
echo '{"okrId":"...", "runId":"...", "eventKind":"skill_call", "payload":{"skill":"tavily-search","duration_ms":420}, "phase":"why", "intentThreadUuid":"..."}' \
  | npx @maintainabilityai/research-runner@~0.1.42 skill-audit-emit-event
```

## Implementation

Wraps `packages/research-runner/src/runner/audit-emitter.ts`. The on-disk envelope schema is defined by `packages/research-runner/src/schemas/audit-event.ts`. 3 retries with backoff on file-lock contention; on terminal failure, logs to stderr and exits non-zero — `verify-chain` (Phase E) recovers post-hoc. CLI subcommand backend lands in B-PR1a.

## Error contract

`{ok: false, reason: 'audit-write-failed-after-retries'}` is the only failure surface. Agent continues per §5.5.3 (audit failure is non-blocking; chain integrity is checked post-run).
