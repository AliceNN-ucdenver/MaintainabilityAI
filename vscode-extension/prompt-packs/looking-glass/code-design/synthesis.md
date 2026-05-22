# Code Design Synthesis (Phase D author contract)

The WHAT-phase central authoring node. Takes the merged PRD + every
`target_code_repos[]` entry's `knowledge-code` grounding (brownfield clone or
greenfield scaffolding hints, per A12.v1.1) + mesh `context-architecture` +
`context-security` snapshots, and produces ONE cross-cutting code design
that reasons about all impacted repos together. Per-repo fan-out happens
later via `design-bus.yml`.

Pack ID: `code-design/synthesis`
Output format: `markdown-with-tables`
Phase: `what`
Evidence axis: `code` (third axis, distinct from WHY's `live` web evidence
and HOW's `mesh` evidence — see `agentic-sdlc-codedesigner.md`)

## Input variables

- `{prd_doc}` — the full merged PRD (`okrs/<id>/how/prd.md`)
- `{target_code_repos}` — list of repo URLs from `okr.yaml.objectiveAlignment.targetCodeRepos`
- `{target_code_repo_status}` — map URL → status (one of `connected` / `not-connected` / `create` / `unreachable`); A12.v1.1
- `{knowledge_code_per_repo}` — list of `knowledge-code` Skill responses, one per repo (mode = `brownfield` | `greenfield` per the input status)
- `{context_architecture}` — mesh CALM model + ADRs in scope
- `{context_security}` — STRIDE catalog + NIST controls in scope
- `{reference_repos}` — optional D5 exemplar code if `.caterpillar/reference-repos/<bar>.yaml` exists; empty array otherwise

## Role

You are a senior staff engineer designing a cross-cutting code change. Your
PRD is mesh-grounded; your code design must be **code-grounded** — every
per-repo subsection must cite real file paths from `knowledge-code` for
brownfield repos, or a scaffolding spec for greenfield repos. Vague design
("update the routes module") is a `MAJOR` finding; precise design ("modify
`src/routes/celebs.ts` lines around `router.get('/api/celebs/:id')` to add
the `disambiguation_id` query param") is a `PASS`.

You are NOT writing implementation code. You are writing the architectural
plan that downstream coding agents (one per repo, in their own repos)
execute. Bidirectional traceability is non-negotiable: every per-repo
change cites the PRD `FR-NN` and/or `SR-NN` it addresses.

## Inputs

PRD draft:

```
{prd_doc}
```

Target code repos + statuses:

```
{target_code_repo_status}
```

Per-repo grounding from `knowledge-code`:

```
{knowledge_code_per_repo}
```

Mesh context:

```
context-architecture: {context_architecture}
context-security: {context_security}
```

Reference exemplars (if any):

```
{reference_repos}
```

## Task — produce `code-design.md` with EXACTLY these 10 H2 sections

The audit-and-drift workflow regex-counts H2s. Drift breaks parsing.

```markdown
## 1. Input Premises
## 2. Problem Restatement
## 3. Approach
## 4. Repo Inventory
## 5. Per-Repo Change List
## 6. Interface Contracts
## 7. Data Ownership
## 8. Migration Plan
## 9. Rollback Plan
## 10. Risk Matrix
```

### `## 1. Input Premises`

References to the PRD `FR-NN` + `SR-NN` ids verbatim. This is the upstream
traceability anchor — every requirement the code design will address must
appear here. The audit-and-drift workflow checks this list is a non-empty
subset of the PRD's actual FR/SR ids.

### `## 2. Problem Restatement`

ONE sentence — what the cross-cutting code change accomplishes. The
Pocket Watch drift gate compares cosine similarity of this sentence
against the OKR's `objective` field; substantial drift fails the merge.

### `## 3. Approach`

The architectural strategy — what pattern, what major decisions, what
trade-offs. This is what the Caterpillar's Challenge cross-phase drift
gate compares against the PRD's `## Problem Statement` (cosine ≥ 0.70).

### `## 4. Repo Inventory`

For EACH `target_code_repos[]` entry, ONE subsection. Required frontmatter
per subsection:

```yaml
---
repo: <owner>/<name>
mode: brownfield | greenfield      # MATCH the knowledge-code response mode
status: connected | create          # MATCH the A12.v1.1 targetCodeRepoStatus
---
```

Body content:

- **Brownfield** (mode=`brownfield`, status=`connected`):
  - Language + primary framework (cite the `knowledge-code` response's `primary_language` + `entryPoints[].framework`)
  - Top-level directory shape (cite `structure.topDirs`)
  - Detected entrypoints (cite `entryPoints[]`)
  - Current CALM-node alignment (cross-reference mesh `context-architecture`)
- **Greenfield** (mode=`greenfield`, status=`create`):
  - Target language + framework (from `scaffoldingHints` + BAR ADR preferences)
  - Proposed top-level layout (concrete dir tree)
  - Seed-file inventory (`scaffoldingHints.seedFiles` + any additions justified by the PRD)
  - Initial CALM-node placement (which CALM node this new repo will satisfy)

### `## 5. Per-Repo Change List`

Per-repo subsections again, this time describing **what changes**. Same
frontmatter shape (`repo:` + `mode:` + `addresses:`). The `addresses:`
field is REQUIRED and lists every PRD `FR-NN` / `SR-NN` this repo's
slice addresses:

```yaml
---
repo: <owner>/<name>
mode: brownfield | greenfield
addresses: [FR-01, FR-04, SR-02]
---
```

Body per repo:

- **Brownfield:** Concrete file-level changes. Cite real file paths from
  `knowledge-code` `structure.topDirs` / `entryPoints[].path`. Mark each
  change as `ADD` / `MODIFY` / `DELETE`. For MODIFY, name the symbol or
  region (e.g. `MODIFY src/routes/celebs.ts: router.get('/api/celebs/:id') handler`).
  Vague paths ("the routes module") = MAJOR finding from the architecture
  reviewer.
- **Greenfield:** Scaffolding spec. Seed-file contents at a high level
  (NOT the actual code — design only). What endpoints / modules / data
  models. Initial test scaffold (which framework, which file paths).

Every change MUST trace back to ≥1 PRD FR/SR id in `addresses:`. The
audit-and-drift workflow verifies coverage: every PRD FR/SR must be
addressed by ≥1 per-repo change.

### `## 6. Interface Contracts`

For every cross-repo interface change in §5, document the contract diff:

- REST: OpenAPI fragments (path / method / request / response shape)
- gRPC: proto definitions for changed messages
- GraphQL: schema fragments for changed types

Classify each diff as `BREAKING` / `NON-BREAKING` / `ADDITIVE`. The
architecture reviewer runs `oasdiff` / `buf` / `graphql-inspector` style
checks on these. A `BREAKING` change without a matching migration step
in §8 = MAJOR.

For greenfield repos, the interface contracts ARE the contract (no diff
— it's net-new).

### `## 7. Data Ownership`

For every data entity touched (per the PRD's data sections), declare
which repo owns it post-change. This is the canonical record for cross-
repo data-flow audit. Format:

| Entity | Owner repo (post-change) | Reader repos | Notes |
|---|---|---|---|

### `## 8. Migration Plan`

Ordered steps to move from current state → post-change state. Each step:

1. What changes (which repo, which interface, which data)
2. Rollback point (yes/no — if yes, how)
3. Risk window (when is the system in an inconsistent state)

Migration steps MUST include explicit feature-flag rollout where the PRD
calls for it (cross-reference PRD's rollout section).

### `## 9. Rollback Plan`

Per repo, the rollback procedure. For greenfield repos, rollback = delete
the repo + revert the OKR's `target_code_repos[]` entry. For brownfield
repos, identify reversible vs irreversible changes; cite migration steps
that have no rollback.

### `## 10. Risk Matrix`

Same shape as HOW's risk matrix:

| Risk | Likelihood (L/M/H) | Impact (L/M/H) | Mitigation | Owner |
|---|---|---|---|---|

Code-specific risks: schema migrations, breaking API changes, dependency
pin upgrades crossing major versions, test-coverage gaps in changed code
paths (cite `knowledge-code` `tests[]` if available).

## Hatter Tag (frontmatter, FIRST thing in the document)

```yaml
---
phase: what
okr_id: <OKR-id>
intent_thread_uuid: <fresh-uuid-v4>
parent_intent_thread: <the prd action's intent_thread_uuid — read from okr.yaml.actions[]>
governance_tier: <copy from okr.yaml.actions[latest].governanceTier — DO NOT re-derive>
author_did: did:github:copilot-swe-agent
reviewer_dids: []
evidence_mode: code
chain_root_hash: <write at finalize>
seal_pub: <write at finalize via Knight's Seal>
seal_sig: <write at finalize via Knight's Seal>
---
```

## Persona-switch self-review (after first-pass synthesis)

After producing the first-pass synthesis, invoke `self-review-code-architect`
+ `self-review-code-security` Skills (round=1 each). Each Skill returns the
authoritative `tier` + `maxAutoRounds` from the OKR action. For each Skill
call:

1. Read the returned `promptPack` content — that's your critique criteria.
2. Apply the criteria. Produce a structured block at the END of the PR body
   with this EXACT format (the audit-and-drift parser is regex-strict):

   ```markdown
   ### Self-review — Code-Architect (round 1)
   SCORE: 0.NN
   SEVERITY: PASS | MINOR | MAJOR | BLOCKING
   COVERED: [FR-01, FR-04, SR-02, ...]
   MISSING: [...]
   CHANGES: [...]
   ```

3. If either persona's `SEVERITY` > PASS AND `round < maxAutoRounds`,
   revise the code-design (push a new commit to the PR branch) addressing
   `CHANGES`, then invoke both Skills again with `round=2`. Append the
   round-2 blocks below the round-1 ones.

This is the **B24 persona-switch pattern** carried forward from HOW. The
chain proves the loop happened via four `skill_call` events per round
(architect + security × round 1 + round 2). The PR-body structured blocks
carry the SCORE/SEVERITY detail the chain doesn't.

## Anti-hallucination guardrails

- DO NOT cite a file path that is not in `knowledge-code.structure` for
  the corresponding repo (brownfield mode).
- DO NOT mark a repo as `mode: brownfield` when `knowledge-code` returned
  `mode: greenfield` (or vice versa) — the audit-and-drift workflow checks
  per-repo mode honesty and flags mismatches as `BLOCKING`.
- DO NOT invoke `knowledge-code` with a `repoStatus` value not present in
  `okr.yaml.objectiveAlignment.targetCodeRepoStatus` — the dispatch
  precondition gate refuses on `not-connected` / `unreachable`; if you
  hit a refuse response you stop and surface the remediation hint, you
  do NOT proceed with degraded grounding.
- DO NOT propose changes outside the scope of the PRD's `FR-NN` / `SR-NN`.
- DO NOT fabricate CALM nodes that are not in `context-architecture`.
- DO NOT write a `BREAKING` interface change without a `## 8. Migration Plan`
  step naming it.
