---
name: self-review-code-security
description: Authoritative tier + prompt-pack handoff for the Code-Security persona-switch self-critique round (WHAT phase). PURE data; the Code-Security persona reasoning is in the parent code-design-agent's prompt. Returns the OKR action's frozen governanceTier + computed max_auto_rounds + should_proceed gate + the code-design/security-review.md prompt pack contents.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-self-review-code-security
---

# Self-Review Code-Security Skill (Phase D)

Paired with `self-review-code-architect`. Hands the code-design-agent the
**authoritative inputs** for the Code-Security persona's self-critique
step. Called once per round before writing the
`### Self-review — Code-Security (round <N>)` block in the PR body.

## Inputs (stdin JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `okrId` | `string` | yes | The OKR id. |
| `runId` | `string` | yes | The WHAT action's `runId`. |
| `round` | `integer` | yes | The round number (1, 2, 3). |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | `true` on success. |
| `persona` | `"code-security"` | Constant. |
| `phase` | `"what"` | Constant. |
| `tier` | `"autonomous" \| "supervised" \| "restricted"` | From `actions[].governanceTier`. |
| `maxAutoRounds` | `integer` | autonomous=3, supervised=2, restricted=0. |
| `round` | `integer` | Echoes the input. |
| `shouldProceed` | `boolean` | `true` iff `tier != restricted` AND `round <= maxAutoRounds`. |
| `promptPack` | `string` | Full text of `.caterpillar/prompts/code-design/security-review.md`. |
| `promptPackPath` | `string` | Repo-relative path. |
| `promptPackFound` | `boolean` | File existence flag. |

`payload` emitted into the audit chain: `{persona, phase, tier, max_auto_rounds, round, should_proceed, prompt_pack_path, prompt_pack_found}`.

## Invocation

```sh
echo '{"okrId":"OKR-2026Q2-IMDB-001-celeb-api","runId":"WHAT-2026-05-23-abc123","round":1}' \
  | npx -y @maintainabilityai/research-runner@0.1.42 skill-self-review-code-security
```

## Implementation

`packages/research-runner/src/runner/skills.ts → handleSelfReviewCodeSecurity` (factory `makeCodeReviewHandler('code-security')`). Reads `okrs/<okrId>/okr.yaml` for tier; reads `.caterpillar/prompts/code-design/security-review.md` for the prompt pack.

## Error contract

Same as `self-review-code-architect`. The agent stops on `{ok: false}`.
