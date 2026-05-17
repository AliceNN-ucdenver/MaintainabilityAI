# PRD Synthesis

The PRD pipeline's central LLM node. Takes research findings + mesh expert
context + optional clarifying-question answers and produces a structured PRD
with bidirectional traceability: every Functional Requirement (`FR-NN`) cites
a Research finding (`R[N]`) or Mesh Expert input (`E[N]`); every Security
Requirement cites a STRIDE entry (`THR-NNN`) and/or OWASP category (`A0X`).

Pack ID: `prd/synthesis`
Output format: `markdown-with-tables`
Adopts NCMS `SYNTHESIZE_PRD_PROMPT`.

This pack is re-invoked with a feedback prefix on each refinement loop iteration
(see `prd/architecture-review.md` and `prd/security-review.md`). The feedback
prompt is assembled by the runner outside this pack.

## Input variables

- `{brief.topic}` — the original PRD topic
- `{scope.bar_id}` — BAR id
- `{research_findings}` — list of `R[N]` findings from the input research doc
- `{mesh_expert_input}` — numbered list of `E[N]` mesh-extracted expert points
  (CALM nodes, ADRs, STRIDE entries, NIST controls)
- `{clarifying_answers}` — populated only in `deep` mode; numbered `QA-NN` blocks
- `{calm_endpoints}` — list of CALM node ids that endpoints must map to
- `{stride_entries}` — list of `THR-NNN` entries to address
- `{nist_controls}` — list of `NIST-XX-NN` controls in scope
- `{owasp_in_scope}` — list of `A0X` categories triggered by `{stride_entries}`

## Role

You are a senior product manager and architect writing a PRD for an engineering
team that uses AI coding assistants. Your PRD must be precise enough that a
downstream Cheshire RCTRO issue generator can decompose it into implementable
tickets WITHOUT human re-interpretation. Bidirectional traceability is
non-negotiable: every requirement traces upstream to research or expert input,
and the downstream RCTRO generator can verify coverage by regex.

## Inputs

- Topic: `{brief.topic}`
- BAR: `{scope.bar_id}`
- Research findings: {research_findings}
- Mesh expert input: {mesh_expert_input}
- Clarifying answers (deep mode only): {clarifying_answers}
- CALM endpoints in scope: {calm_endpoints}
- STRIDE entries in scope: {stride_entries}
- NIST controls in scope: {nist_controls}
- OWASP categories triggered: {owasp_in_scope}

## Task

Produce the canonical PRD synthesis document. Required sections (10, in this
exact order):

### `## Input Premises`

Numbered combined list:
- `R1`, `R2`, … one entry per item in `{research_findings}`
- `E1`, `E2`, … one entry per item in `{mesh_expert_input}` and `{clarifying_answers}`

Each entry: 1-line summary. This is the authoritative numbering downstream
sections cite.

### `## Problem Statement and Scope`

3-5 sentences. Cite `R[N]` and `E[N]` inline.

### `## Goals and Non-Goals`

Two bulleted lists. Each goal cites the input premise that motivated it.

### `## Functional Requirements with Traceability`

Numbered `FR-01`, `FR-02`, … Each entry:
- Statement of the requirement
- `Traces to: R[N], E[N], ...` (at least one upstream citation REQUIRED)
- `CALM node: <node-id>` if the requirement touches an endpoint in `{calm_endpoints}`
- Acceptance criteria sub-bullets (Given/When/Then phrasing preferred)

### `## Non-Functional Requirements`

Numbered `NFR-01`, `NFR-02`, … Each entry:
- Statement, target metric, measurement method
- `Traces to: R[N], E[N], ...`

### `## Security Requirements with Threat Tracing`

Numbered `SR-01`, `SR-02`, … Each entry MUST cite at least one of:
- `THR-NNN` (STRIDE entry from `{stride_entries}`)
- `A0X` (OWASP category from `{owasp_in_scope}`)
- `NIST-XX-NN` (control from `{nist_controls}`)

This is the regex-checked section the security-review node grounds against.

### `## Coverage Analysis`

A required table. Every entry in `{research_findings}` AND `{mesh_expert_input}`
must appear with a coverage status:

| Premise | Status | Where addressed |
|---|---|---|
| R1 | YES | FR-01, FR-04 |
| R2 | PARTIAL | FR-02 (acceptance criteria incomplete) |
| R3 | NO | — |

Status must be one of `YES` / `PARTIAL` / `NO`. The architecture-review and
security-review nodes cross-check this table against actual citations to
detect self-misreporting.

### `## Risk Matrix`

Markdown table with columns: `Risk | Likelihood | Impact | Mitigation | Owner`.
Mitigations cite an `FR-NN` / `SR-NN` / `NFR-NN`.

### `## Success Metrics`

Bulleted list of measurable indicators. Each cites the goal it serves.

### `## References`

Deduplicated source list inherited from the research doc — keep `S[N]` IDs
identical so audit traces remain unbroken across the research → PRD handoff.

## Coverage discipline

The `Coverage Analysis` table is the load-bearing surface for the grounding
loop. Be honest:
- Use `PARTIAL` when an FR addresses a premise only partially, and note why.
- Use `NO` when you intentionally deferred a premise — and add it to
  `## Risk Matrix` as a deferred-coverage risk.

The verify_grounding node compares your self-reported `YES`/`PARTIAL`/`NO`
against the actual regex-extracted citations. If you say `R3: YES, addressed
in FR-04` but `FR-04` has no `R3` citation, the loop catches it.

## Anti-hallucination guardrails

- DO NOT cite an `R[N]` / `E[N]` that is not in `{research_findings}` or
  `{mesh_expert_input}`.
- DO NOT cite a CALM node id that is not in `{calm_endpoints}`.
- DO NOT cite a `THR-NNN` / `A0X` / `NIST-XX-NN` that is not in scope.
- DO NOT invent acceptance criteria for requirements you cannot ground.
- If a Goal cannot be traced to any input premise, it's out of scope — drop
  it or add it under `Non-Goals` instead of inventing premises.
