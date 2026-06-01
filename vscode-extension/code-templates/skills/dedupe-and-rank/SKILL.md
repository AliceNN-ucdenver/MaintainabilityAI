---
name: dedupe-and-rank
description: Merge ProviderResult arrays from all search Skills, dedupe by URL, rank by relevance + recency + diversity.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.64 skill-dedupe-and-rank
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
| `sourcePremisesMarkdown` | `string` | Deterministic `## Source Premises` rows generated from `rankedSources`; paste these instead of hand-typing titles/URLs. |
| `referencesMarkdown` | `string` | Deterministic `## References` rows generated from the same ranked source list. |
| `sourceRegistry` | `{path, sha256, rowCount}` | Present when the runner has OKR/RUN session context. The registry is written to `okrs/<id>/audit/sources/<runId>.source-registry.json` and hash-pinned into the `skill_call` audit event. |

## Invocation

```sh
# Canonical — grouped by provider (preferred; rank weights cross-provider agreement).
echo '{"results":[[...tavily...],[...arxiv...],[...uspto...],[...hn...]]}' \
  | npx @maintainabilityai/research-runner@~0.1.64 skill-dedupe-and-rank

# Also accepted — flat list (handler flattens internally for the grouped case).
echo '{"results":[...all results concatenated...]}' \
  | npx @maintainabilityai/research-runner@~0.1.64 skill-dedupe-and-rank
```

## Source registry contract

When session context is present (`OKR_ID`, `RUN_ID`, `INTENT_THREAD_UUID`, `PHASE`), the runner writes a bounded source registry beside the JSONL audit chain:

```text
okrs/<okr_id>/audit/sources/<run_id>.source-registry.json
```

The registry contains the same citable surface the synthesis agent sees after dedupe: `S[N]`, provider, queries, title, canonical URL, retrieved timestamp, salience score, excerpt, publication date, and authors where available. It is not a raw provider cache. The audit event carries `source_registry_path`, `source_registry_sha256`, and `source_registry_count`; `verify-source-table.mjs` verifies the file hash before trusting it.

Use `sourcePremisesMarkdown` and `referencesMarkdown` to populate the research artifact. Do not hand-type URLs or rewrite source titles.

## Implementation

Pure JS reducer over the result array(s). URL canonicalization, fuzzy-match dedupe, weighted ranking. Lenient input shape: discriminates flat vs grouped by inspecting the first element (`Array.isArray(results[0])` → grouped → flatten before ranking).

## Error contract

Never fails on empty inputs (returns `{rankedSources: [], providerCounts: {}}`). Only fails on invalid JSON or wrong-shape `ProviderResult` entries inside the array.
