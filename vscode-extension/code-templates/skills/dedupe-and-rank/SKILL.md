---
name: dedupe-and-rank
description: Merge ProviderResult arrays from all search Skills, dedupe by URL, rank by relevance + recency + diversity.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-dedupe-and-rank
---

# Dedupe + Rank Skill

Call after invoking all four search Skills (tavily / arxiv / uspto / hackernews) in parallel. PURE: deterministic merge + rank, no LLM.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `results` | `ProviderResult[][]` | yes | — | Outer array: one entry per provider. |
| `topN` | `integer` | no | 50 | Cap on final ranked list. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `rankedSources` | `RankedSource[]` | Deduped + ranked. Each carries provider tag for diversity scoring. |
| `providerCounts` | `Record<string, number>` | Coverage signal (used by the agent for gap detection). |

## Invocation

```sh
echo '{"results":[[...tavily...],[...arxiv...],[...uspto...],[...hn...]]}' \
  | npx @maintainabilityai/research-runner skill-dedupe-and-rank
```

## Implementation

Pure JS reducer over the four arrays. URL canonicalization, fuzzy-match dedupe, weighted ranking. The CLI subcommand backend lands in B-PR1a.

## Error contract

Never fails on empty inputs (returns `{rankedSources: [], providerCounts: {}}`). Only fails on invalid JSON.
