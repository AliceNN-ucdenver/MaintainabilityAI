---
name: knowledge-okr
description: Read the OKR card by id from the mesh. Returns the BTABoK 9-section structure as JSON.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-knowledge-okr
---

# Knowledge OKR Skill

The agent's canonical input on every run. Per §5.5.1, every `.agent.md` MUST extract the `okr_id` from the issue body's HTML comment marker and call this skill first.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `okrId` | `string` | yes | — | e.g. `OKR-2026Q1-IMDB-001-celeb-api`. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | False if the OKR is missing or fails Zod validation. |
| `card` | `OkrCard \| null` | The full BTABoK card (see `vscode-extension/src/types/okr.ts`). |
| `reason?` | `string` | On `ok: false`, why. |

## Invocation

```sh
echo '{"okrId":"OKR-2026Q1-IMDB-001-celeb-api"}' \
  | npx @maintainabilityai/research-runner skill-knowledge-okr
```

## Implementation

Wraps `OKRService.readRaw(meshPath, okrId)` via a mesh-path env var (`MESH_PATH`). Read-only, idempotent, cache-friendly. CLI subcommand backend lands in B-PR1a.

## Error contract

`{ok: false, reason: 'okr-not-found'}` on missing dir; `{ok: false, reason: 'schema-validation-failed: ...'}` on invalid YAML. Agent stops + posts a PR comment per §5.5.3.
