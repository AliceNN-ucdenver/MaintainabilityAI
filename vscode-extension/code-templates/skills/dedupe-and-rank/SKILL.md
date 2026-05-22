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
| `results` | `ProviderResult[][]` **or** `ProviderResult[]` | yes | — | EITHER an outer array with one entry per provider (canonical, lets the ranker reward cross-provider agreement) OR a single flat array of `ProviderResult`. Cert-run-2 (Task #56) made the schema lenient — both shapes work, the handler flattens internally. |
| `topN` | `integer` | no | 50 | Cap on final ranked list. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `rankedSources` | `RankedSource[]` | Deduped + ranked. Each carries provider tag for diversity scoring. |
| `providerCounts` | `Record<string, number>` | Coverage signal (used by the agent for gap detection). |

## Invocation

```sh
# Canonical — grouped by provider (preferred; rank weights cross-provider agreement).
echo '{"results":[[...tavily...],[...arxiv...],[...uspto...],[...hn...]]}' \
  | npx @maintainabilityai/research-runner skill-dedupe-and-rank

# Also accepted — flat list (handler flattens internally for the grouped case).
echo '{"results":[...all results concatenated...]}' \
  | npx @maintainabilityai/research-runner skill-dedupe-and-rank
```

## Implementation

Pure JS reducer over the result array(s). URL canonicalization, fuzzy-match dedupe, weighted ranking. Lenient input shape: discriminates flat vs grouped by inspecting the first element (`Array.isArray(results[0])` → grouped → flatten before ranking).

## Error contract

Never fails on empty inputs (returns `{rankedSources: [], providerCounts: {}}`). Only fails on invalid JSON or wrong-shape `ProviderResult` entries inside the array.
