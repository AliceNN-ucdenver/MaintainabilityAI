---
name: tavily-search
description: Web search via Tavily's research-grade API. Returns ranked results per query envelope.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-tavily-search
secrets:
  - TAVILY_API_KEY
---

# Tavily Search Skill

Call when the agent needs structured web search results for OKR / PRD research. PURE-data: no LLM reasoning inside; the parent agent generates queries itself and inspects results itself.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `queries` | `string[]` | yes | — | Web queries the agent crafts. WHY audit expects each query to include the current 4-digit year plus a subject/concept anchor. |
| `maxResults` | `integer` | no | 10 | Per-query result cap. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `envelopes` | `{query, status, count, error?}[]` | One per query — surfaces per-query failures without blocking the others. |
| `results` | `ProviderResult[]` | Flattened ranked list across envelopes. |

## Invocation

```sh
echo '{"queries":["celebrity data licensing GDPR 2026"],"maxResults":10}' \
  | npx @maintainabilityai/research-runner@~0.1.42 skill-tavily-search
```

## Implementation

Thin wrapper over `packages/research-runner/src/search/tavily-client.ts`. The CLI subcommand backend lands in B-PR1a; this SKILL.md is in place so B-PR2 agents can declare it in `tools:`.

## Error contract

On terminal failure (auth, network exhausted), exits non-zero and writes `{ok: false, reason}` to stdout. The agent treats this as "continue with remaining providers' results" per §5.5.3.
