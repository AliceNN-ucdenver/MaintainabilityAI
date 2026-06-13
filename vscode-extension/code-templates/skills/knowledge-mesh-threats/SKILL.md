---
name: knowledge-mesh-threats
description: Query the mesh's threat library for entries matching a concern (e.g. "identity", "data-licensing").
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.64 skill-knowledge-mesh-threats
---

# Knowledge Mesh Threats Skill

Returns STRIDE entries from `threats/` that match the concern. Used by `prd-agent` (during its Security persona-switch) + `code-design-agent` (during its Code-Security persona-switch) to ground security sections. _(Pre-B24 was also consumed by a separate `security-reviewer` agent; that dispatch was retired — persona-switch self-critique inside the author agent replaced it.)_

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `concern` | `string` | yes | — | A tag or free-text concern (e.g. `identity-disambiguation`, `data-licensing`). |
| `maxResults` | `integer` | no | 20 | |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | |
| `threats` | `ThreatEntry[]` | Entries with `id`, `category`, `description`, `nistControls[]`, `owaspCategories[]`. |

## Invocation

```sh
echo '{"concern":"identity-disambiguation"}' \
  | npx @maintainabilityai/research-runner@~0.1.64 skill-knowledge-mesh-threats
```

## Implementation

Walks `threats/` library, filters by tag/keyword match. Implemented by the `knowledge-mesh-threats` handler in `packages/research-runner/src/runner/skills.ts` (walks the top-level `threats/` library + each `<bar>/architecture/threat-model.yaml`).

## Error contract

Empty `threats: []` is NOT an error — returns `ok: true` with no matches.
