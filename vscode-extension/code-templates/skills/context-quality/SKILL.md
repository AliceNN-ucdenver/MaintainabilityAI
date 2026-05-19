---
name: context-quality
description: Aggregated quality context for a scope — quality attribute definitions + performance SLOs + reliability targets per BAR.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner skill-context-quality
---

# Context Quality Skill

Surfaces non-functional grounding (latency, availability, observability) so the PRD agent can write defensible Non-Functional Requirements anchored to real BAR targets rather than guesses.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `scope` | `{ platformId, barIds: string[] }` | yes | — | Which platform + BARs to aggregate over. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | |
| `qualityAttributes` | `{ barId, name, target, measurement }[]` | Per-BAR QA definitions. |
| `performanceSlos` | `{ barId, metric, target, percentile }[]` | p95/p99 latency targets, throughput. |
| `reliabilityTargets` | `{ barId, availability, errorBudget }[]` | SLO/SLI declarations. |

## Invocation

```sh
echo '{"scope":{"platformId":"PLT-IMDB","barIds":["APP-IMDB-001","APP-IMDB-002"]}}' \
  | npx @maintainabilityai/research-runner skill-context-quality
```

## Implementation

Walks `architecture/quality-attributes.yaml` + `architecture/fitness-functions.yaml` per BAR. CLI subcommand backend lands in B-PR1a.

## Error contract

Empty arrays on sparse BARs (not an error).
