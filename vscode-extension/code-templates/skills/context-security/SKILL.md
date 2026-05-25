---
name: context-security
description: Aggregated security context for a scope — STRIDE threats + OWASP refs + NIST controls + prior threat-model docs. PURE data; the Security persona is in the parent agent's prompt.
version: 0.1.0
purity: pure-data
runtime: research-runner
command: npx @maintainabilityai/research-runner@~0.1.42 skill-context-security
---

# Context Security Skill

The security-side companion to `context-architecture`. Walks the mesh and assembles the structured-data input the Security persona reasons against.

## Inputs (stdin JSON)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `platformId` | `string` | yes | — | Platform to aggregate over. |
| `barIds` | `string[]` | yes | — | BARs to aggregate over. |

## Outputs (stdout JSON)

| Field | Type | Description |
|---|---|---|
| `ok` | `boolean` | |
| `threats` | `ThreatEntry[]` | STRIDE entries applicable to the scope. |
| `securityControls` | `SecurityControl[]` | Already-in-place controls per BAR. |
| `owaspRefs` | `{ category: "A0X", description }[]` | OWASP A01-A10 references the in-scope BARs map to. |
| `nistControls` | `{ id, family, description }[]` | NIST 800-53 control refs. |
| `priorThreatModels` | `{ barId, path, lastReviewed }[]` | Existing threat-model docs to ground against. |

## Invocation

```sh
echo '{"platformId":"PLT-IMDB","barIds":["APP-IMDB-002"]}' \
  | npx @maintainabilityai/research-runner@~0.1.42 skill-context-security
```

## Implementation

Aggregates from `threats/`, `controls/`, each BAR's `security/`, and `compliance-checklist.yaml`. CLI subcommand backend lands in B-PR1a.

## Error contract

`{ok: false, reason: 'mesh-walk-failed'}` only on filesystem errors. Sparse BARs return `ok: true` with empty arrays — this is by design and drives the Restricted tier.
