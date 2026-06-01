---
name: knowledge-mesh-bar
description: Read a BAR's CALM model + threats + ADRs + app.yaml from the mesh by BAR id.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.64 skill-knowledge-mesh-bar
---

# Knowledge Mesh BAR Skill

Returns everything the parent agent needs to reason about ONE BAR. Per §5.5.2 the agent calls this once per `affectedBarIds[]` entry.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `barId` | `string` | yes | — | e.g. `APP-IMDB-002`. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | |
| `bar` | `{ id, name, platformId, calmModel, appYaml, repos, adrs, threats, controls, fitnessFunctions, qualityAttributes }` | Structured snapshot. |
| `reason?` | `string` | On `ok: false`. |

## Invocation

```sh
echo '{"barId":"APP-IMDB-002"}' \
  | npx @maintainabilityai/research-runner@~0.1.64 skill-knowledge-mesh-bar
```

## Implementation

Walks `platforms/<p>/bars/<id>/**` via `MeshReader.findBarById`. CLI subcommand backend lands in B-PR1a.

## Error contract

`{ok: false, reason: 'bar-not-found'}` when the id doesn't resolve. Agent stops per §5.5.3.
