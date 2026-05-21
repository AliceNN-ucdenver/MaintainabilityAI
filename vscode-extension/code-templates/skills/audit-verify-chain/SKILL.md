---
name: audit-verify-chain
description: Replay the hash chain over an existing audit JSONL; returns the chain head on success, the first integrity failure reason on failure.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-audit-verify-chain
---

# Audit Verify Chain Skill

CI defense against forged audit logs. Called by `prd-agent.yml` and `market-research-agent.yml` after the agent's JSONL is committed; verdict fails + `chain-forgery-detected` label applied on `ok: false`.

This skill is NOT called by agents. Agents use `audit-emit-event` (which produces valid chains); `audit-verify-chain` is the post-hoc check that catches any agent that ignored the rule and wrote events by hand.

## Inputs (stdin JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `okrId` | `string` | yes | OKR whose audit log to verify. |
| `runId` | `string` | yes | The run's JSONL filename (without `.jsonl`). |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | True iff the chain verifies end-to-end. |
| `chainHead` | `string` | Final event_hash (= chain root for the run). Present only when `ok: true`. |
| `eventCount` | `integer` | Number of events verified. Present only when `ok: true`. |
| `reason` | `string` | First failure cause. Present only when `ok: false`. Examples: `forged-hash-line-3: recorded=abc123…  recomputed=def456…`, `prev-hash-mismatch-line-7`, `event-id-mismatch-line-2`. |

## Verification rules

Same rules as `verifyChain()` in `packages/research-runner/src/runner/audit-emitter.ts`:

1. First event's `prev_event_hash` MUST be `null`.
2. Each subsequent event's `prev_event_hash` MUST equal the preceding event's `event_hash`.
3. Each event's `event_hash` MUST equal `sha256(canonicalStringify({...event, event_hash: ''}))` — i.e. the canonical key-sorted JSON of the event with its own hash field blanked.
4. `event_id` MUST be monotonic from 1 (matches the on-disk line number).

## Invocation

```sh
echo '{"okrId":"OKR-2026Q2-IMDB-001-celeb-api","runId":"HOW-2026-05-21-728gdt"}' \
  | npx @maintainabilityai/research-runner skill-audit-verify-chain
```

## Error contract

The skill returns `{ok: false, reason}` for any verification failure; the calling workflow treats `ok: false` as blocking and labels the PR `chain-forgery-detected`. There is no "partial success" — even one tampered event invalidates the chain.
