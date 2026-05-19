---
name: format-research-issue-update
description: Format a research run's signals as a Markdown comment for the OKR anchor issue.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-format-research-issue-update
---

# Format Research Issue Update Skill

Called by `market-research-agent` (and re-runs) to post a clean progress comment back to the OKR anchor issue. PURE markdown formatter — no LLM, no narrative writing.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `topic` | `string` | yes | — | One-line OKR-derived topic. |
| `runId` | `string` | yes | — | Stable run id. |
| `rankedSources` | `RankedSource[]` | yes | — | The dedupe-and-rank output. |
| `providerCounts` | `Record<string, number>` | yes | — | Coverage signal. |
| `gapSignals` | `string[]` | no | `[]` | Agent's gap analysis (e.g. `low_source_diversity`). |
| `meshContext` | `{ platformId, barIds }` | yes | — | For the issue header. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `markdown` | `string` | The formatted comment body, ready to POST as an issue comment. |
| `byteCount` | `integer` | Size sanity check (issue comments cap around 65k chars). |

## Invocation

```sh
echo '{"topic":"...", "runId":"...", "rankedSources":[...], "providerCounts":{...}, "meshContext":{...}}' \
  | npx @maintainabilityai/research-runner skill-format-research-issue-update
```

## Implementation

Pure JS string formatter. Backed by the existing `research-runner` issue-formatting helper. CLI subcommand backend lands in B-PR1a.

## Error contract

Never fails on valid JSON. Returns truncated markdown + a warning footer if `byteCount > 60000`.
