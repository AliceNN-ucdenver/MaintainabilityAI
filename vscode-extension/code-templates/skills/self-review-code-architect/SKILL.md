---
name: self-review-code-architect
description: Authoritative tier + prompt-pack handoff for the Code-Architect persona-switch self-critique round (WHAT phase). PURE data; the Code-Architect persona reasoning is in the parent code-design-agent's prompt. Returns the OKR action's frozen governanceTier + computed max_auto_rounds + should_proceed gate + the code-design/architecture-review.md prompt pack contents.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-self-review-code-architect
---

# Self-Review Code-Architect Skill (Phase D)

Hands the code-design-agent the **authoritative inputs** for the Code-
Architect persona's self-critique step. The agent MUST call this skill
once per round before writing the `### Self-review — Code-Architect (round <N>)` block in the PR body. No LLM inside — the agent does the actual reasoning.

This is the **B29 pattern carried forward to WHAT phase**. The PRD-phase
pair (`self-review-architect` + `self-review-security`) reads
`.caterpillar/prompts/prd/*` packs; this WHAT-phase pair reads
`.caterpillar/prompts/code-design/*` packs (synthesized in D-PR1). Same
chain-level provenance contract: the runner auto-emits a `skill_call`
event with the authoritative tier in `payload.tier`, the audit-and-drift
workflow compares skill-call count vs structured-block count in the PR
body, mismatches surface as contract violations.

## Inputs (stdin JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `okrId` | `string` | yes | The OKR id, e.g. `OKR-2026Q2-IMDB-001-celeb-api`. |
| `runId` | `string` | yes | The WHAT action's `runId`. Used to find the matching `actions[]` entry whose `governanceTier` is the authoritative tier. |
| `round` | `integer` | yes | The round number the agent is entering (1, 2, 3 — bounded by `max_auto_rounds`). |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | `true` on success. |
| `persona` | `"code-architect"` | Constant — confirms which skill ran. |
| `phase` | `"what"` | Constant — confirms phase. |
| `tier` | `"autonomous" \| "supervised" \| "restricted"` | Read from `actions[].governanceTier` matching the input `runId`. |
| `maxAutoRounds` | `integer` | autonomous=3, supervised=2, restricted=0. |
| `round` | `integer` | Echoes the input. |
| `shouldProceed` | `boolean` | `true` iff `tier != restricted` AND `round <= maxAutoRounds`. |
| `promptPack` | `string` | Full text of `.caterpillar/prompts/code-design/architecture-review.md`. |
| `promptPackPath` | `string` | Repo-relative path the skill read from. |
| `promptPackFound` | `boolean` | `true` if the prompt-pack file exists on disk. |

`payload` emitted into the audit chain (via `auditMetadata`): `{persona, phase, tier, max_auto_rounds, round, should_proceed, prompt_pack_path, prompt_pack_found}`.

## Invocation

```sh
echo '{"okrId":"OKR-2026Q2-IMDB-001-celeb-api","runId":"WHAT-2026-05-23-abc123","round":1}' \
  | npx -y @maintainabilityai/research-runner@~0.1.42 skill-self-review-code-architect
```

## Implementation

`packages/research-runner/src/runner/skills.ts → handleSelfReviewCodeArchitect` (factory `makeCodeReviewHandler('code-architect')`). Reads `okrs/<okrId>/okr.yaml` for tier; reads `.caterpillar/prompts/code-design/architecture-review.md` for the prompt pack.

## Error contract

| Reason | When |
|---|---|
| `bad-input: <zod error>` | Missing fields or wrong types. |
| `okr-not-found` | `okrs/<okrId>/okr.yaml` doesn't exist. |
| `action-not-found: no actions[] entry with runId=<value>` | runId doesn't match. |

The code-design-agent's hard rule: if this skill returns `{ok: false}`, STOP and post a PR comment. Do NOT proceed without authoritative tier data.
