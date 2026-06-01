---
name: arxiv-search
description: Academic paper search via arXiv. Returns ranked paper results per query envelope.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.64 skill-arxiv-search
---

# arXiv Search Skill

Call when the agent needs peer-reviewed / preprint academic sources for research evidence. PURE-data: no LLM inside; the parent agent crafts queries (formal CS / domain terms — see prompt-packs/looking-glass/research/query-plan.md anchors).

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `queries` | `string[]` | yes | — | Formal-domain queries: 3-6 word technical phrases, no boolean operators, no recency year (e.g. "named entity disambiguation knowledge graph"). |
| `maxResults` | `integer` | no | 10 | Per-query result cap. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `envelopes` | `{query, status, count, error?}[]` | Per-query envelope. |
| `results` | `ProviderResult[]` | Flattened ranked list with `abstract` field per paper. |

## Invocation

```sh
echo '{"queries":["named entity disambiguation knowledge graph"]}' \
  | npx @maintainabilityai/research-runner@~0.1.64 skill-arxiv-search
```

## Implementation

Thin wrapper over `packages/research-runner/src/search/arxiv-client.ts`. No API key required (arXiv is open). The CLI subcommand backend lands in B-PR1a.

## Error contract

On terminal failure (network exhausted), exits non-zero and writes `{ok: false, reason}` to stdout. Agent continues with remaining providers per §5.5.3.
