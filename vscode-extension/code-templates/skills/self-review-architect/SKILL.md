---
name: self-review-architect
description: Authoritative tier + prompt-pack handoff for the Architect persona-switch self-critique round. PURE data; the Architect persona reasoning is in the parent agent's prompt. Returns the OKR action's frozen governanceTier + computed max_auto_rounds + should_proceed gate + the architecture-review.md prompt pack contents.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-self-review-architect
---

# Self-Review Architect Skill

Hands the prd-agent the **authoritative inputs** for the Architect persona's self-critique step. The agent MUST call this skill once per round (steps 12–13 of `prd-agent.agent.md`) before writing the `### Self-review — Architect (round <N>)` block. No LLM inside — the agent does the actual reasoning.

## Why this skill exists (B29 / PR #112 forensic)

Pre-B29, the persona-switch self-critique was a pure prompt-level reasoning step with NO `skill_call` audit event. PR #112 surfaced the failure mode: the prd-agent hallucinated `tier=restricted` and skipped the self-critique loop entirely, claiming `SKIPPED_RESTRICTED_TIER` in the PRD frontmatter — when the OKR action's actual `governanceTier` was `supervised`. The audit chain had no trace of self-critique at all, so the only way to catch the gap was to manually diff the agent's narrative against the OKR card.

This skill creates **chain-level provenance** for the attempt. The runner auto-emits a `skill_call` event with the authoritative tier in `payload.tier`, so the audit-and-drift workflow can compare:
- `count(skill_call.skill == 'self-review-architect')` vs.
- `count("### Self-review — Architect" blocks in PR body)`

A mismatch surfaces in the PR audit comment as a contract violation. The agent literally cannot bypass the skill (runtime auto-emit) and cannot fabricate the tier (skill reads the action's frozen `governanceTier` from `okrs/<id>/okr.yaml`).

## Inputs (stdin JSON)

| Field | Type | Required | Description |
|---|---|---|---|
| `okrId` | `string` | yes | The OKR id, e.g. `OKR-2026Q2-IMDB-001-celeb-api`. Used to locate `okrs/<id>/okr.yaml`. |
| `runId` | `string` | yes | The HOW action's `runId`. Used to find the matching `actions[]` entry whose `governanceTier` is the authoritative tier. |
| `round` | `integer` | yes | The round number the agent is entering (1, 2, 3 — bounded by `max_auto_rounds`). |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | `true` on success. `false` with `reason` when the OKR or action can't be found. |
| `persona` | `"architect"` | Constant — confirms which skill ran. |
| `tier` | `"autonomous" \| "supervised" \| "restricted" \| "unknown"` | Read from `actions[].governanceTier` matching the input `runId`. |
| `maxAutoRounds` | `integer` | Derived from `tier`: autonomous=3, supervised=2, restricted=0 (unknown→0). |
| `round` | `integer` | Echoes the input. |
| `shouldProceed` | `boolean` | `true` iff `tier != restricted` AND `round <= maxAutoRounds`. The agent uses this to decide whether to write a `### Self-review — Architect (round N)` block or a `### Self-review — Skipped` block. |
| `promptPack` | `string` | Full text of `.caterpillar/prompts/prd/architecture-review.md`. Empty when the file isn't present (`promptPackFound: false`). |
| `promptPackPath` | `string` | Repo-relative path the skill read from. |
| `promptPackFound` | `boolean` | `true` if the prompt-pack file exists on disk. |

`payload` emitted into the audit chain (via `auditMetadata`): `{persona, tier, max_auto_rounds, round, should_proceed, prompt_pack_path, prompt_pack_found}`. The full `promptPack` body is NOT in the chain (would bloat events) — only the path + presence flag.

## Invocation

```sh
echo '{"okrId":"OKR-2026Q2-IMDB-001-celeb-api","runId":"HOW-2026-05-21-ux9tzd","round":1}' \
  | npx @maintainabilityai/research-runner skill-self-review-architect
```

## Implementation

`packages/research-runner/src/runner/skills.ts → handleSelfReviewArchitect`. Reads `okrs/<okrId>/okr.yaml` for the action's tier; reads `.caterpillar/prompts/prd/architecture-review.md` for the prompt pack. No network, no LLM.

## Error contract

| Reason | When |
|---|---|
| `bad-input: <zod error>` | Missing `okrId` / `runId` / `round` or wrong types. |
| `okr-not-found` | `okrs/<okrId>/okr.yaml` doesn't exist in the mesh. |
| `action-not-found: no actions[] entry with runId=<value>` | The runId doesn't match any action in the OKR card. Indicates dispatch-time commit wasn't pushed before the agent ran — fail loudly. |

The prd-agent's hard rule: if this skill returns `{ok: false}`, STOP and post a PR comment. Do NOT proceed without authoritative tier data.
