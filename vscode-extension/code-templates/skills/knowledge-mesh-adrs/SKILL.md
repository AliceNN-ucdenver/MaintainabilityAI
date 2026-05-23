---
name: knowledge-mesh-adrs
description: Query the mesh's ADRs by concern. Returns matching ADR documents from any BAR's architecture/ADRs/.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-knowledge-mesh-adrs
---

# Knowledge Mesh ADRs Skill

Returns ADRs across the mesh that touch a given concern. Lets the agent's Architect persona cite prior decisions in the PRD or design.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `concern` | `string` | yes | — | Free-text or tag (e.g. `identity-disambiguation`, `caching`, `auth`). |
| `scope` | `{ platformId?, barIds?: string[] }` | no | mesh-wide | Restrict the search to specific platform / BARs. |
| `maxResults` | `integer` | no | 20 | |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | |
| `adrs` | `AdrRecord[]` | Each with `id`, `title`, `status`, `tags`, `body` (markdown), `barId`. |

## Invocation

```sh
echo '{"concern":"identity-disambiguation","scope":{"platformId":"PLT-IMDB"}}' \
  | npx @maintainabilityai/research-runner@~0.1.42 skill-knowledge-mesh-adrs
```

## Implementation

Walks `**/architecture/ADRs/*.md` under the given scope, filters by tag/keyword match. CLI subcommand backend lands in B-PR1a.

## Error contract

Empty `adrs: []` is NOT an error.
