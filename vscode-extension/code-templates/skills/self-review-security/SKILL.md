---
name: self-review-security
description: Authoritative tier + prompt-pack handoff for the Security persona-switch self-critique round. PURE data; the Security persona reasoning is in the parent agent's prompt. Returns the OKR action's frozen governanceTier + computed max_auto_rounds + should_proceed gate + the security-review.md prompt pack contents.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-self-review-security
---

# Self-Review Security Skill

Hands the prd-agent the **authoritative inputs** for the Security persona's self-critique step. The agent MUST call this skill once per round (step 14 of `prd-agent.agent.md`) before writing the `### Self-review — Security (round <N>)` block. No LLM inside.

## Why this skill exists (B29 / PR #112 forensic)

See `self-review-architect/SKILL.md` for the full forensic. Identical pattern, different persona: this skill reads the security-review prompt pack and emits chain-level provenance proving the agent entered the Security persona-switch.

## Inputs (stdin JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `okrId` | `string` | yes | The OKR id. |
| `runId` | `string` | yes | The HOW action's `runId`. |
| `round` | `integer` | yes | The round number the agent is entering. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | `true` on success. `false` with `reason` when the OKR or action can't be found. |
| `persona` | `"security"` | Constant — confirms which skill ran. |
| `tier` | `"autonomous" \| "supervised" \| "restricted" \| "unknown"` | Read from `actions[].governanceTier` matching the input `runId`. |
| `maxAutoRounds` | `integer` | Derived from `tier`: autonomous=3, supervised=2, restricted=0. |
| `round` | `integer` | Echoes the input. |
| `shouldProceed` | `boolean` | `true` iff `tier != restricted` AND `round <= maxAutoRounds`. |
| `promptPack` | `string` | Full text of `.caterpillar/prompts/prd/security-review.md`. |
| `promptPackPath` | `string` | Repo-relative path the skill read from. |
| `promptPackFound` | `boolean` | `true` if the prompt-pack file exists. |

`payload` emitted into the audit chain (via `auditMetadata`): `{persona, tier, max_auto_rounds, round, should_proceed, prompt_pack_path, prompt_pack_found}`.

## Invocation

```sh
echo '{"okrId":"OKR-2026Q2-IMDB-001-celeb-api","runId":"HOW-2026-05-21-ux9tzd","round":1}' \
  | npx @maintainabilityai/research-runner@~0.1.42 skill-self-review-security
```

## Implementation

`packages/research-runner/src/runner/skills.ts → handleSelfReviewSecurity` — same factory as `self-review-architect`, parameterized on `persona = 'security'` and `promptFilename = 'security-review.md'`.

## Error contract

Same shape as `self-review-architect`: `bad-input`, `okr-not-found`, `action-not-found`. Agent's hard rule: STOP on `{ok: false}` rather than fabricate.
