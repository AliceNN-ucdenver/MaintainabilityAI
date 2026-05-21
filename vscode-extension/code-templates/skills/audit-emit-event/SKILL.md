---
name: audit-emit-event
description: Append one hash-chained audit event to okrs/<id>/audit/events/<run-id>.jsonl. Returns the new chain head.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-audit-emit-event
---

# Audit Emit Event Skill

Hash-chained, append-only audit log writer; one JSONL event per line per run. Every event is Ed25519-sealed (Knight's Seal v1, B27).

## When to call this skill (post-B28)

Under **Court Recorder Auto-Logging (B28, design §11.6)**, the runner auto-emits `skill_call` events for every `runSkill()` invocation; the workflow emits `artifact_written` + `self_review` deterministically. **You should rarely call this skill directly.** The legitimate remaining use cases are:

- **Gap-loop semantic markers** (market-research-agent step 8b) — the runner can't infer that you noticed a coverage gap and are doing a second pass. Emit with `payload.skill: "gap-loop"` and the follow-up queries.
- **Custom semantic events** — any future declarative marker the runner has no way to know about (e.g. a Quality persona "I flagged a missing SLO" annotation that doesn't fit `self_review`).
- **Legacy / no-session-context runtimes** — if `OKR_ID` / `RUN_ID` / `INTENT_THREAD_UUID` / `PHASE` env vars are absent, the runner skips auto-emission. In that mode you SHOULD call this skill explicitly for every skill_call. Modern workflows set the vars; this is a fallback only.

For everything else (every regular skill_call, every artifact_written, every self_review), do nothing — the runner and workflow already handle it.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `okrId` | `string` | yes | — | Which OKR's audit log to append to. |
| `runId` | `string` | yes | — | Stable per agent run (e.g. `RES-2026-05-19-abc123`). |
| `eventKind` | `"skill_call" \| "llm_call" \| "artifact_written" \| "review_received" \| "state_transition" \| "human_gate"` | yes | — | See §7.5. |
| `payload` | `Record<string, unknown>` | yes | — | Event-kind-specific data. Must not contain secrets. |
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
  | npx @maintainabilityai/research-runner skill-audit-emit-event
```

## Implementation

Wraps `packages/research-runner/src/runner/audit-emitter.ts`. The on-disk envelope schema is defined by `packages/research-runner/src/schemas/audit-event.ts`. 3 retries with backoff on file-lock contention; on terminal failure, logs to stderr and exits non-zero — `verify-chain` (Phase E) recovers post-hoc. CLI subcommand backend lands in B-PR1a.

## Error contract

`{ok: false, reason: 'audit-write-failed-after-retries'}` is the only failure surface. Agent continues per §5.5.3 (audit failure is non-blocking; chain integrity is checked post-run).
