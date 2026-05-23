---
name: knowledge-research
description: Read the merged research-doc.md for an OKR. Returns structured findings (R-N anchors) for the PRD agent to cite.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-knowledge-research
---

# Knowledge Research Skill

The PRD agent's bridge from Why → How. Reads the merged research artifact at `okrs/<id>/why/research-doc.md` and surfaces it in a parseable shape so FR-NN can cite R-N anchors.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `okrId` | `string` | yes | — | The OKR id whose `why/` phase has merged. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | False if `why/research-doc.md` is absent. |
| `findings` | `{ id: "R-N", title, supporting: string[], contradicting: string[], confidence: "HIGH" \| "MEDIUM" \| "LOW" }[]` | Parsed from the synthesis prompt-pack's strict format. |
| `whitespace` | `string[]` | The "Whitespace Analysis" section's bullets. |
| `references` | `string[]` | The final References list. |

## Invocation

```sh
echo '{"okrId":"OKR-2026Q1-IMDB-001-celeb-api"}' \
  | npx @maintainabilityai/research-runner@~0.1.42 skill-knowledge-research
```

## Implementation

Parses `okrs/<id>/why/research-doc.md` using the 10-section anchor scheme from `prompt-packs/looking-glass/research/synthesis.md`. CLI subcommand backend lands in B-PR1a.

## Error contract

`{ok: false, reason: 'research-not-merged-yet'}` when the file is missing — agent stops and notes the gating dependency.
