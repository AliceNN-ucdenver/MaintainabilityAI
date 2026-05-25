---
name: context-architecture
description: Aggregated architecture context for a scope — CALM nodes + ADRs + fitness functions + quality attributes. PURE data; the Architect persona is in the parent agent's prompt.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-context-architecture
---

# Context Architecture Skill

Walks the mesh and assembles the structured-data input the Architect persona reasons against. No LLM inside (the persona lives in the parent agent's system prompt per §5.4); this skill is the grounding-data half.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `platformId` | `string` | yes | — | Platform to aggregate over. |
| `barIds` | `string[]` | yes | — | BARs to aggregate over. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | |
| `calmNodes` | `{ id, type, relatedThreats[], relatedAdrs[] }[]` | Union across the in-scope BARs + platform. |
| `relationships` | `{ source, dest, kind }[]` | Edges from each BAR's CALM. |
| `adrs` | `AdrRecord[]` | All ADRs in scope. |
| `fitnessFunctions` | `FitnessFunction[]` | Per-BAR fitness funcs. |
| `qualityAttributes` | `QualityAttribute[]` | Per-BAR QAs. |

## Invocation

```sh
echo '{"platformId":"PLT-IMDB","barIds":["APP-IMDB-001","APP-IMDB-002"]}' \
  | npx @maintainabilityai/research-runner@~0.1.42 skill-context-architecture
```

## Implementation

Walks each in-scope BAR + the platform, applies a "what's relevant" filter, returns structured JSON. See §7.4 for the canonical output shape. CLI subcommand backend lands in B-PR1a.

## Error contract

`{ok: false, reason: 'mesh-walk-failed'}` only on filesystem errors. Empty BARs return `ok: true` with empty arrays.
