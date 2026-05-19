---
name: hackernews-search
description: Practitioner-community search via Hacker News Algolia API. Returns story + Show/Ask HN text per query envelope.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-hackernews-search
---

# Hacker News Search Skill

Call when the agent needs practitioner-grade qualitative signal (war stories, gotchas, current-state-of-tooling). PURE-data: agent crafts 2–3 word casual queries (e.g. `name dedup`, NOT `identity disambiguation hacks`).

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `queries` | `string[]` | yes | — | Short casual queries (HN search is keyword-naive). |
| `maxResults` | `integer` | no | 10 | Per-query result cap. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `envelopes` | `{query, status, count, error?}[]` | Per-query envelope. |
| `results` | `ProviderResult[]` | Flattened ranked list with `storyText` for Show HN / Ask HN posts. |

## Invocation

```sh
echo '{"queries":["name dedup"]}' \
  | npx @maintainabilityai/research-runner skill-hackernews-search
```

## Implementation

Thin wrapper over `packages/research-runner/src/search/hackernews-client.ts`. No API key (Algolia free tier). The CLI subcommand backend lands in B-PR1a.

## Error contract

On terminal failure: exits non-zero with `{ok: false, reason}`. Agent continues with remaining providers.
