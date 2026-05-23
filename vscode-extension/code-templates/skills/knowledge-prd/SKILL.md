---
name: knowledge-prd
description: Read the merged PRD for an OKR. Returns FRs / SRs / coverage table for the code-design agent and reviewers.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-knowledge-prd
---

# Knowledge PRD Skill

The code-design agent's bridge from How → What. Parses the merged PRD at `okrs/<id>/how/prd.md` into structured FR / SR / coverage records so the design agent can guarantee each requirement maps to a design section.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `okrId` | `string` | yes | — | The OKR id whose `how/` phase has merged. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | False if `how/prd.md` is absent. |
| `functionalRequirements` | `{ id: "FR-NN", text, sources: string[] }[]` | Each cites R-N (research) or E-N (mesh expert input). |
| `securityRequirements` | `{ id: "SR-NN", text, stride: string[], owasp: string[] }[]` | Each cites a STRIDE / OWASP anchor. |
| `coverage` | `Record<"FR-NN" \| "SR-NN", boolean>` | The coverage analysis table. |

## Invocation

```sh
echo '{"okrId":"OKR-2026Q1-IMDB-001-celeb-api"}' \
  | npx @maintainabilityai/research-runner@~0.1.42 skill-knowledge-prd
```

## Implementation

Parses `okrs/<id>/how/prd.md` using anchors from `prompt-packs/looking-glass/prd/synthesis.md`. CLI subcommand backend lands in B-PR1a.

## Error contract

`{ok: false, reason: 'prd-not-merged-yet'}` when the file is missing.
