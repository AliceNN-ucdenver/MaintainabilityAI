---
name: knowledge-mesh-platform
description: Read a Platform's CALM model + cross-BAR design from the mesh by platform id.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-knowledge-mesh-platform
---

# Knowledge Mesh Platform Skill

Returns the platform's cross-BAR architecture + decisions. Used when an OKR spans multiple BARs and the agent needs to reason about shared infrastructure.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `platformId` | `string` | yes | — | e.g. `PLT-IMDB`. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | |
| `platform` | `{ id, slug, name, calmModel, decisions, bars }` | Structured snapshot. |
| `reason?` | `string` | On `ok: false`. |

## Invocation

```sh
echo '{"platformId":"PLT-IMDB"}' \
  | npx @maintainabilityai/research-runner skill-knowledge-mesh-platform
```

## Implementation

Reads `platforms/<slug>/platform.arch.json` + `platform.decisions.yaml`. CLI subcommand backend lands in B-PR1a.

## Error contract

`{ok: false, reason: 'platform-not-found'}` when the id doesn't resolve.
