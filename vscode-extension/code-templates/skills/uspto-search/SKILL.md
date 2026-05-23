---
name: uspto-search
description: Patent search via USPTO's PatentsView API. Two-stage XML fetch returns claim abstracts per query envelope.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-uspto-search
secrets:
  - USPTO_API_KEY
---

# USPTO Patent Search Skill

Call when the agent needs prior-art / patent-landscape evidence (whitespace analysis, freedom-to-operate). PURE-data: parent agent crafts Q1/Q2/Q3 narrow/medium/broad queries per prompt-packs/looking-glass/research/query-plan.md.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `queries` | `string[]` | yes | — | Q1/Q2/Q3 narrow/medium/broad queries with `AND` boolean (e.g. `celebrity AND identity AND disambiguation`). 1–3 terms total, no stop words. |
| `maxResults` | `integer` | no | 10 | Per-query result cap. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `envelopes` | `{query, status, count, error?}[]` | Per-query envelope. |
| `results` | `ProviderResult[]` | Flattened ranked list with `abstract` (two-stage fetch) per patent. |

## Invocation

```sh
echo '{"queries":["celebrity AND identity AND disambiguation"]}' \
  | npx @maintainabilityai/research-runner@~0.1.42 skill-uspto-search
```

## Implementation

Thin wrapper over `packages/research-runner/src/search/uspto-client.ts`. Reads `USPTO_API_KEY` from env. Two-stage fetch: first searches for patent ids, then fetches abstracts in batch. The CLI subcommand backend lands in B-PR1a.

## Error contract

On 429 / auth fail: exits non-zero with `{ok: false, reason}`. Agent continues with remaining providers.
