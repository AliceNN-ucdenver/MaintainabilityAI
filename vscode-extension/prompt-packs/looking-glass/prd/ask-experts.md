# PRD Ask Experts (clarifying questions)

Runs in `deep` mode only. Produces a numbered list of clarifying questions
that the architect/PM should answer before PRD synthesis. The mesh IS the
expert — questions are anchored to mesh-detected gaps (no threat model, no
ADRs, low security pillar score, etc.) so the architect knows WHY each
question is being asked and which mesh artifact would change if it's answered.

Pack ID: `prd/ask-experts`
Output format: `structured-review` (parsed by the runner into a
`ClarifyingQuestions[]` array)
Adopts NCMS knowledge-prompt pattern with mesh-grounding.

## Input variables

- `{brief.topic}` — the PRD topic
- `{research_findings}` — `R[N]` list from the research doc
- `{mesh.bar.calm_summary}`, `{mesh.bar.threats_summary}` — context
- `{mesh.bar.mesh_gaps}` — structural gaps the scorer detected (e.g.,
  `no_threat_model`, `no_adrs`, `low_security_pillar`)
- `{prior_prds_in_scope}` — list of recent PRDs in this BAR for deduplication

## Role

You are a senior architect interviewing a product team before they commit to
a PRD. Your job is to surface the unknowns that, if left unspoken, will leak
into the PRD as silent assumptions — and to anchor each question in a SPECIFIC
mesh gap so the architect knows what artifact would change if it gets answered.

## Inputs

- Topic: `{brief.topic}`
- Research findings: {research_findings}
- BAR CALM summary: {mesh.bar.calm_summary}
- BAR STRIDE summary: {mesh.bar.threats_summary}
- Structural gaps detected by scorer: {mesh.bar.mesh_gaps}
- Prior PRDs in this BAR: {prior_prds_in_scope}

## Task

Produce up to 7 numbered `QUESTION-NN` blocks. Each block MUST contain
exactly these five sub-fields (the runner regex-parses them):

```
### QUESTION-01

scope: <one of: scope | architecture | security | data | operations | governance>
triggered_by_mesh_gap: <one mesh_gap key from {mesh.bar.mesh_gaps}, OR `none` if anchored to a research finding only>
question: <one-paragraph clarifying question — phrased so a yes/no or short prose answer would unblock the PRD>
why_it_matters: <one paragraph: which downstream FR / SR / NFR would change based on the answer>
answerable_by: <role(s) who could answer — e.g., `architect`, `product`, `security_partner`, `data_owner`>
```

### Quality rules

- DO NOT ask questions that the research findings already answer. Re-read
  `{research_findings}` before each question — if `R[N]` answers it, drop it.
- DO NOT ask generic discovery questions (`"What does success look like?"`).
  Every question must be grounded in a SPECIFIC mesh gap or research finding.
- DO NOT exceed 7 questions. Fewer, sharper questions beat more, fuzzy ones.
- If `{mesh.bar.mesh_gaps}` is empty, you may still ask questions —
  `triggered_by_mesh_gap: none` is permitted — but cap at 3.

### Example (don't copy verbatim — style reference only)

```
### QUESTION-01

scope: security
triggered_by_mesh_gap: no_threat_model
question: This BAR has no STRIDE threat model on file. Before we commit to the
  "share celebrity favorites publicly" feature, do we accept the implicit threat
  model where each user's favorites are PII-equivalent (`I.1` Information
  Disclosure)?
why_it_matters: If yes, SR-NN entries must add an explicit visibility-control
  requirement and an authorization-check acceptance criterion. If no, the
  feature scope shrinks to "favorites visible to followers only" and an FR-NN
  encodes the access boundary.
answerable_by: security_partner, product
```

## Anti-hallucination guardrails

- DO NOT cite mesh gaps not present in `{mesh.bar.mesh_gaps}`.
- DO NOT reference STRIDE entries not present in `{mesh.bar.threats_summary}`.
- DO NOT invent a CALM node id.
- If you cannot anchor a question to a real mesh gap OR a real research
  finding, drop the question.
