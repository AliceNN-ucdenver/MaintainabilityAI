# Audit event shape — runner / workflow contract

**Status:** canonical · **Last revised:** 2026-05-24 (Bug Z) · **Owners:** runner package + workflow YAML

## Trust model (post-Bug-V/W/Y/Z)

Deterministic skills gather facts, emit `skill_call`, verify chains, check structure, enforce manifests, pin paths, and apply workflow labels. The LLM does synthesis, gap-loop intent, and persona-critique judgment. The split is pinned by a single source of truth — the `EVENT_KIND_ORIGIN` map in [`packages/research-runner/src/runner/skills.ts`](../../packages/research-runner/src/runner/skills.ts) — which assigns every event kind to exactly one of three origin tiers: **runtime**, **agent**, or **workflow** (Bug Y / Codex round-9).

### PR audit verifies, finalize records (Bug Z / Codex round-10)

The cross-phase **trust contract** added in Bug Z fixes a structural gap the prior workflow code carried since Bug Y. The audit-and-drift jobs run under `pull_request_target` with `actions/checkout` configured `persist-credentials: false` for safety (the PR branch belongs to a contributor; the workflow has read-only access to it). Pre-Z those jobs attempted to emit `artifact_written` events into the workspace JSONL via `npx audit-emit-event`, but with no push credentials the appended JSONL was always discarded at runner shutdown. Merged main therefore carried `skill_call` events only — every workflow-owned event vanished, and the verifier had no durable workflow record to validate against.

The lane assignment is now operational, not just nominal:

- **PR audit jobs verify.** They re-derive expected payloads from the PR head (sha + bytes of the artifact), surface forged existing workflow events (a hand-rolled `artifact_written` whose sha/bytes disagree with the PR head fails the gate pre-merge), and fail the verdict when source claims do not match the audited chain (WHY-phase `verify-source-table.mjs` cross-checks every `S[N]` citation against the `results_preview[]` entries in `skill_call` events). PR audit **does not mutate the chain**.
- **`finalize-okr-action` is the only durable workflow-event writer.** It runs on `main` (post-merge) with `contents: write`, calls `append-workflow-events.mjs`, which (a) idempotency-checks any existing `artifact_written` for the path — match no-ops, conflict (same path, different sha/bytes/merge_sha) hard-fails with a clear reason — then (b) appends a fresh `artifact_written` via the runner, then (c) does the same idempotency dance for `state_transition` keyed on `(phase, run_id, from, to, pr_number, merge_commit_sha)`, then (d) runs `audit-verify-chain` post-append and aborts before commit if verify fails. Only after verify passes does the action `git add` the JSONL alongside `okr.yaml` + `chain-ladder.yaml` and push.

The two records together cover the workflow lane completely:

- **`okrs/<id>/audit/chain-ladder.yaml`** = cross-phase ladder, one row per phase merge with `(phase, run_id, intent_thread_uuid, parent_intent_thread, chain_root_hash, merge_commit_sha, merged_at, pr_number)`. This is the canonical lineage record across WHY → HOW → WHAT.
- **`okrs/<id>/audit/events/<runId>.jsonl`** = within-phase chain. After Bug Z finalize-time append, every sealed phase carries the runtime `skill_call` events + (for HOW/WHAT) agent-signed `self_review` events + workflow-emitted `artifact_written` + (when meta.status changed) `state_transition`.

Both are workflow-owned; both are required evidence for a sealed phase. The verifier validates the JSONL after the finalize-time append, and the dashboard reads the same JSONL for badge state.

### The kind→origin map (single source of truth)

| Event kind | Origin tier | Emitter | Trust property |
|---|---|---|---|
| `skill_call` | **runtime** | Runner auto-emit from `runSkill()` ONLY | Deterministic evidence — code observed the call before the result returned to the agent. Signed under the active per-epoch private key. **The public CLI Zod enum rejects this kind** (`bad-input`) — agents and workflows cannot emit it via the CLI; only the module-private auto-emit path inside `runSkill()` can. |
| `llm_call` | **runtime** | Runner auto-emit (when wired) ONLY | Same trust property as `skill_call`: CLI-rejected, module-private emitter only. |
| `self_review` | **agent** | Agent, via `audit-emit-event` from inside the persona-prompt section | **Signed LLM judgment** — the agent inhabits the Architect / Security persona, applies the prompt-pack criteria, emits the scored verdict. The runner signs under the per-epoch private key. Cross-checked against PR-body structured blocks by the workflow for block-vs-chain parity, but the chain is authoritative. |
| `self_review_exhausted` | **agent** | Agent, via `audit-emit-event` | Signed LLM judgment — emitted when the auto-revise loop hits MAX_AUTO_ROUNDS without convergence. |
| `gap_loop` | **agent** | Agent, via `audit-emit-event` | Signed LLM judgment — WHY-phase coverage-gap iteration semantic marker (market-research-agent). Pre-Bug-Y this rode on `skill_call` with `payload.skill: 'gap-loop'`; that path is closed because `skill_call` is now runtime-only. The `count-skill-calls` action counts both new + legacy shapes for backward compatibility. |
| `review_received` / `review_emitted` | **agent** (reserved) | (currently unused) | Reserved for a future reviewer-agent dispatch revival; would be agent-signed. |
| `artifact_written` | **workflow** | Workflow YAML (deterministic, from `git diff`) | Re-derivable evidence — any third party with read access can recompute the sha + bytes from the PR HEAD and check the payload matches. Unsigned (no signing key available to the workflow). **The workflow's emit step re-derives sha + bytes from the current PR HEAD and compares; mismatch is treated as a forged artifact_written and degrades the verdict** (Bug Y closes the pre-emit hole where an attacker could pre-write a forged event and have the workflow's "skip if exists" check pass it through). |
| `state_transition` | **workflow** | Workflow YAML (from PR labels) | Re-derivable from canonical PR state. |
| `human_gate` | **workflow** | Workflow YAML (from PR reviewer state) | Re-derivable from canonical PR state. |

### Enforcement points

The map is enforced in three places:

1. **`payload.emitted_by` is set by the runner from the map, NOT from user input.** Pre-Bug-Y an agent could pass `payload.emitted_by: 'workflow'` to fake workflow attribution; post-Y the runner overrides whatever the caller supplies — even legitimate emitters can't accidentally misattribute the kind they're emitting.
2. **`audit-verify-chain` rejects events where `event_kind` and `emitted_by` don't match the map** with `origin-kind-mismatch-line-N`. Hand-rolled or pre-Y JSONL with mismatched attribution fails verification and the run is marked degraded.
3. **The public CLI Zod enum (`AuditEmitInput.eventKind`) excludes `skill_call` and `llm_call`.** Agents calling `runSkill('audit-emit-event', { eventKind: 'skill_call' })` get `{ok: false, reason: 'bad-input'}` at the parser level — they cannot reach the runtime path through the CLI.

`self_review` is not deterministic evidence — it's signed LLM judgment, with deterministic cross-checking and gating around it. The runner additionally rejects any workflow-attributed event whose kind is outside `WORKFLOW_EMITTABLE_KINDS` (`artifact_written, state_transition, human_gate`) with `workflow-event-kind-not-allowed`; the Looking Glass UI mirrors the same allowlist in `vscode-extension/src/webview/chainVerify.ts` so the badge agrees with what CI will accept (Bug W / Codex round-7). Together: Bug V narrowed the workflow allowlist, Bug X added signed-workflow-event rejection, Bug Y pinned the kind→origin map on the input side + closed the artifact_written pre-emit hole.

This document is the **single source of truth** for the shape of audit
events emitted by `@maintainabilityai/research-runner`. Every workflow
job that reads `okrs/<id>/audit/events/<runId>.jsonl` MUST match the
contract below; deviations show up as silent false-negatives (the D-PR1
mode-honesty bug at PR #120 was exactly this — workflow read
`payload.audit_metadata.mode` while runner emitted `payload.mode` flat).

## The flat-merge contract (TL;DR)

The runner's `runSkill(name, input)` function ([source](../../packages/research-runner/src/runner/skills.ts))
auto-emits a `skill_call` event for every handler invocation when the
session-context env vars (`OKR_ID` / `RUN_ID` / `INTENT_THREAD_UUID` /
`PHASE`) are set. The emitted event's `payload` field is constructed
as:

```typescript
const extras = result.auditMetadata ?? {};                       // handler-declared fields
const payload = { ...extras, skill: name, ok: result.ok, duration_ms };
if (!result.ok) { payload.reason = result.reason; }
```

**Every field from `auditMetadata` is merged FLAT into `payload`.**
There is no nested `payload.audit_metadata` object. The runner spreads
`extras` first so the canonical fields (`skill`, `ok`, `duration_ms`,
`reason`) always win on collision — handlers physically cannot lie
about which skill they were called as or what their result.ok value was.

## Reading the payload — workflow rules

```python
# CORRECT (post D-PR1.v1.1 fix)
mode = payload.get('mode')
repo = payload.get('repo')

# WRONG (D-PR1 MVP shape — caused PR #120's false-negative findings)
meta = payload.get('audit_metadata') or {}
mode = meta.get('mode')
repo = meta.get('repo')
```

If you find yourself reaching for `payload.audit_metadata` or
`payload['audit_metadata']` in a workflow YAML script, **you have the
contract backwards**. Read the fields directly off `payload`.

## Canonical event shape

Every event written to JSONL has this top-level shape:

| Field | Type | Source | Notes |
|---|---|---|---|
| `event_id` | integer | runner | Monotonically increases from 1 per JSONL file. |
| `event_kind` | string | runner | `skill_call` \| `llm_call` \| `artifact_written` \| `self_review` \| `self_review_exhausted` \| `gap_loop` \| `review_received` \| `review_emitted` \| `state_transition` \| `human_gate` — each kind is pinned to exactly one origin tier (runtime / agent / workflow) by the `EVENT_KIND_ORIGIN` map. See Trust model above. |
| `phase` | string | runner | `why` \| `how` \| `what` — from `PHASE` env var. |
| `okr_id` | string | runner | From `OKR_ID` env var. |
| `run_id` | string | runner | From `RUN_ID` env var — the per-run identity that names this JSONL file. |
| `intent_thread_uuid` | string | runner | From `INTENT_THREAD_UUID` env var — the OKR's master thread. |
| `ts` | string | runner | ISO 8601 with `T` separator + `Z` UTC offset. (Field is named `ts`, NOT `timestamp` — pre-B28 docs called it `timestamp`; the runner has always written `ts`.) |
| `prev_event_hash` | string \| null | runner | SHA-256 of the previous event in this JSONL (`null` for event_id=1). |
| `event_hash` | string | runner | SHA-256 of the canonical-stringified event (with `event_hash` + `signature` zeroed). |
| `signature` | string | runner | Knight's Seal Ed25519 sig over the event's canonical bytes. Empty string (`""`) is legitimate ONLY for events that BOTH carry `payload.emitted_by = "workflow"` AND have an `event_kind` in the workflow-emittable allowlist (Bug V / Codex round-6): `artifact_written`, `state_transition`, `human_gate`. Every other event MUST be signed under the active per-epoch private key. Bug T removed the legacy unsigned-revise-agent back-compat path; Bug V narrowed the workflow allowlist after Codex round-6 demonstrated that hand-written unsigned `self_review` / `review_received` events with `emitted_by:workflow` were forgeable (returned `ok:true, sealed:true`). Today the runner rejects them with `workflow-event-kind-not-allowed-line-N`. |
| `public_key` | string \| null | runner | PEM-encoded Ed25519 public key for this event's `signer_epoch`. Present on the FIRST event of each new epoch (1, 2, 3, …) so a chain replay can recover the verification key inline. `null` on every other event — verifiers should also fall back to `okrs/<okrId>/audit/keys/<runId>.epoch-N.pub.pem`. |
| `signer_epoch` | integer | runner | Which epoch's key signed this event. Original agent invocation = 1; first revise-agent = 2; second revise = 3; … **Required on every agent event** (including `self_review` events emitted by the agent from inside its persona-prompt section — Bug V contract). **Absent on workflow events** with `payload.emitted_by = "workflow"` AND `event_kind` in the post-Bug-V allowlist (artifact_written, state_transition, human_gate). Bug T removed the legacy-chain back-compat path; verifiers reject any agent event missing `signer_epoch`. |
| `payload` | object | runner + handler | See below — the flat-merged map. |

## `payload` shape (skill_call events)

Always present (canonical fields — runner sets):

| Field | Type | Meaning |
|---|---|---|
| `skill` | string | The skill name as registered in `SKILLS[]`. |
| `ok` | boolean | The handler's result.ok value. |
| `duration_ms` | number | Wall-clock time the handler took. |
| `reason` | string | Present only when `ok === false`; the handler's failure reason. |

Always merged flat (handler-declared via `result.auditMetadata` — per-skill type-specific):

### Search skills (`tavily-search` / `arxiv-search` / `uspto-search` / `hackernews-search`)

| Field | Type | Meaning |
|---|---|---|
| `queries` | string[] | Queries submitted to the provider. |
| `result_count` | number | Distinct results returned (after dedup at the skill level). |
| `results_preview` | object[] | Bug-Q phase 3 — bounded preview of the actual hits (≤25 per skill_call). Lets a reviewer verify a citation like `S-3` resolves to a real paper / page, not a hallucinated source. Per-hit fields: `provider` (string), `query` (string — which submitted query surfaced this hit), `title` (string), `url` (string, canonical-ish), `snippet?` (string, truncated to ~200 chars), `score?` (number, 0..1 rounded to 2 decimals), `publishedDate?` (string ISO). Bounded so the audit JSONL stays compact even on broad searches. |

### `knowledge-code`

| Field | Type | Meaning |
|---|---|---|
| `phase` | string | Constant `"what"` (only this phase uses knowledge-code). |
| `repo` | string | Repo slug `<owner>/<name>`. |
| `mode` | string | `"brownfield"` (cloned + classified) \| `"greenfield"` (scaffolding hints only) \| `"refuse"` (status not-connected/unreachable). |
| `repo_status` | string | The A12.v1.1 `targetCodeRepoStatus` value the caller passed. |
| `okr_id` | string | OKR id (echoed). |
| `sha` | string | First 12 chars of the cloned ref's commit SHA — brownfield only. |
| `file_count` | number | Count of files walked — brownfield only. |
| `primary_language` | string | Most-common language detected — brownfield only. |
| `manifests` | number | Count of package manifest files found — brownfield only. |

### `self-review-architect` / `self-review-security` / `self-review-code-architect` / `self-review-code-security`

| Field | Type | Meaning |
|---|---|---|
| `persona` | string | `"architect"` \| `"security"` \| `"code-architect"` \| `"code-security"`. |
| `phase` | string | `"how"` for the prd-side pair, `"what"` for the code-design pair. Absent on prd-side pair (pre-B29 didn't set it). |
| `tier` | string | Authoritative `governanceTier` from `okr.yaml.actions[].governanceTier`. |
| `max_auto_rounds` | number | 3 (autonomous) \| 2 (supervised) \| 0 (restricted). |
| `round` | number | The round number the agent is entering. |
| `should_proceed` | boolean | `tier !== 'restricted' && round <= max_auto_rounds`. |
| `prompt_pack_path` | string | Mesh-relative path of the prompt-pack file the skill read. |
| `prompt_pack_found` | boolean | `true` if the file exists on disk. |

### `knowledge-prd`

| Field | Type | Meaning |
|---|---|---|
| `okr_id` | string | OKR id (echoed). |
| `fr_count` | number | Number of FR-NN entries extracted from `okrs/<id>/how/prd.md`. |
| `sr_count` | number | Number of SR-NN entries extracted. |
| `coverage_rows` | number | Number of rows in the PRD's Coverage Analysis table. |

## Failure-mode auditMetadata

Even when `result.ok === false`, handlers SHOULD return `auditMetadata`
with whatever they can — particularly for search skills where the
input queries are useful provenance even if the provider failed. The
runner merges them flat the same way.

Example: `tavily-search` with missing API key returns:

```json
{
  "ok": false,
  "reason": "tavily-api-key-missing",
  "auditMetadata": { "queries": ["renewable energy 2026"], "result_count": 0 }
}
```

The emitted `skill_call` event's payload is:

```json
{
  "queries": ["renewable energy 2026"],
  "result_count": 0,
  "skill": "tavily-search",
  "ok": false,
  "duration_ms": 12,
  "reason": "tavily-api-key-missing"
}
```

## Regression test pins this contract

[`packages/research-runner/src/runner/skills.test.ts`](../../packages/research-runner/src/runner/skills.test.ts)
includes a test `runSkill auto-emit flat-merges auditMetadata into
payload (no nesting)` that asserts:

- The emitted `payload` has the handler's `auditMetadata` fields at
  the top level (e.g. `payload.queries`, NOT `payload.audit_metadata.queries`).
- The canonical fields (`skill`, `ok`, `duration_ms`, `reason`) are at
  the top level too.
- `payload.audit_metadata` IS UNDEFINED (never nested).
- Canonical fields win on key collision (handlers can't override
  `payload.skill` to lie about their identity).

If future skill handlers accidentally wrap their metadata in
`{ audit_metadata: {...} }` instead of returning `auditMetadata` flat,
this test breaks. **Do not change the test without also updating every
workflow YAML that reads the chain.**

## Why a contract document?

PR #120 surfaced the cost of this drift. The D-PR1 MVP workflow read
`payload.audit_metadata.mode` (matching a comment in a different doc
that was always wrong). The runner emitted `payload.mode` flat. Every
WHAT run got 2 false-positive "no knowledge-code skill_call" findings
because `chain_modes = {}` for every event. The bug shipped through
PR #120's first audit + the v1.1 polish before being found.

The fix landed in D-PR1.v1.1 #27. **The contract this document pins
exists so a future workflow re-write — code-design-agent.yml in 6
months, design-bus.yml in D-PR4, audit-export-bundle.yml in Phase E —
can't repeat the same bug.** When you write a new workflow that reads
the chain, you read this doc first, you grep for `payload.skill` in
existing YAML to see the pattern, and you point your code at
`payload.X` not `payload.audit_metadata.X`.

## Related

- [B25 chain forgery detection](agentic-sdlc.md#1125-chain-forgery-detection-b25--pr-105-forensic)
- [B27 Knight's Seal v1](agentic-sdlc.md#1126-knights-seal-v1-b27--cryptographic-event-sealing)
- [B28 Court Recorder Auto-Logging](agentic-sdlc.md#1127-court-recorder-auto-logging-b28)
