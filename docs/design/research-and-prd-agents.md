# Research + PRD Agents — Design Doc v0.1

**Status:** Design draft. Not yet implemented.
**Purpose:** Internal design for bringing the NCMS Archeologist and PRD agent patterns into the MaintainabilityAI VS Code extension, with stronger determinism and a first-class audit chain.
**Audience:** Workshop authors, extension maintainers, future implementers.
**References:**
- [NCMS Archeologist Agent](https://github.com/AliceNN-ucdenver/ncms/blob/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms/archeologist_agent.py) (dual-path LangGraph: research / archaeology)
- [NCMS PRD Agent](https://github.com/AliceNN-ucdenver/ncms/blob/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms/prd_agent.py) (deterministic pipeline with semistructured markdown output + JSON manifest)
- [NCMS Archeologist Prompts](https://github.com/AliceNN-ucdenver/ncms/blob/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms/archeologist_prompts.py) — `ANALYZE_ARCHITECTURE`, `IDENTIFY_GAPS`, `SYNTHESIZE_REPORT`. Reference for archaeology-path section structure.
- [NCMS Research Prompts](https://github.com/AliceNN-ucdenver/ncms/blob/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms/research_prompts.py) — `PLAN_QUERIES`, `GAP_ANALYSIS`, `SYNTHESIZE`. Reference for per-provider query specialisation (web / arxiv / patent / community get differently-shaped queries), the bounded gap-analysis follow-up search loop, and the 10-section research certificate structure with S[N]/C[N] traceability + HIGH/MEDIUM/LOW confidence ratings.
- [NCMS PRD Prompts](https://github.com/AliceNN-ucdenver/ncms/blob/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms/prd_prompts.py) — `SYNTHESIZE_PRD`, `MANIFEST`. Reference for the canonical PRD section structure, the R[N]/E[N]/FR-NN/THR-NNN ID schemes, the bidirectional traceability discipline, and the explicit Coverage Analysis section.
- [NCMS Expert Prompts](https://github.com/AliceNN-ucdenver/ncms/blob/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms/expert_prompts.py) — **four** expert personas: `ARCHITECT_KNOWLEDGE`, `ARCHITECT_REVIEW`, `SECURITY_KNOWLEDGE`, `SECURITY_REVIEW`. Reference for the knowledge-vs-review distinction (knowledge prompts give advice; review prompts produce SCORE/SEVERITY/COVERED/MISSING/CHANGES) and the multi-expert mesh-grounded consultation pattern.
- [NCMS Design Prompts](https://github.com/AliceNN-ucdenver/ncms/blob/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms/design_prompts.py) — design synthesis + review prompts. Reference for the `SCORE` / `SEVERITY` / `COVERED` / `MISSING` / `CHANGES` structured-review format and the "EXACTLY this format" enforcement pattern.
- This repo's existing Hatter's Tag pattern (Workshop Part 6)

This document is **not published** to the public site.

---

## TL;DR — the five architectural decisions

1. **Placement: Looking Glass side, not Cheshire Cat side.** Research and PRD are *intent* artifacts that precede and inform implementation. They live in the governance mesh (next to the BAR they belong to), not in code repos. Looking Glass owns the *what should we build and why*; Cheshire owns *build it securely and measurably*; Red Queen owns *enforce the boundary*. See the next section for the full separation.
2. **Build path: GitHub-native (Option A).** Generated workflows + PRs + the existing Hatter's Tag pattern. Workflows live in the **mesh repo**, PRs land in the mesh repo. Zero new infrastructure for v1; every team can run it on free GitHub Actions today.
3. **Audit schema: MCP-style structured per-node JSONL (Option B).** Even though we are not building an MCP server in v1, we adopt the per-node event format the MCP option would have used. Keeps the audit chain machine-readable and ready to feed Option D later.
4. **Determinism: direct API calls for all data sources.** Tavily / arXiv / USPTO / Hacker News are called as deterministic TypeScript functions, not as LLM-driven MCP tool calls. The LLM is bracketed to exactly two nodes per agent: *plan_queries* and *synthesize_report*. Every other node is a pure function with reproducible behaviour given the same input.
5. **Future: AI Foundry as an enterprise deployment target.** Same agent logic, same audit schema, swappable runtime. v1 ships on Actions; v2 adds Foundry as a documented deployment option without changing the brief, output, or audit format.

---

## Architectural placement — why these agents belong to Looking Glass

The extension already has three subsystems, each governing a different time horizon and concern. Mapping the new agents into that structure:

| Subsystem | Governs | Time horizon | Lives in | Examples |
|---|---|---|---|---|
| **Looking Glass** | Intent, architecture, portfolio posture | *Before* code is written | Governance mesh repo | CALM model, BAR scorecards, threat models, ADRs, capability maps, **research**, **PRDs** |
| **Cheshire Cat** | Implementation discipline | *While* code is written | Code repo | Prompt packs, fitness functions, scaffolded workflows, RCTRO issues, security pipeline |
| **Red Queen** | Boundary enforcement | *At agent action time* | Both | PreToolUse hooks, `validate_action` MCP, policy engine, autonomy tiers |

Research and PRD are **intent artifacts**. They answer *what should we build and why* before a single line of code exists. That puts them squarely in Looking Glass territory for three reasons:

1. **Scope is the BAR (or Platform, or Portfolio), not a single repo.** A research doc may inform multiple code repos. A PRD may produce features that span the frontend, backend, and identity service. Tethering these documents to one code repo's `research/` directory shrinks them to one slice of their actual scope.

2. **The audience is product owners and architects, not code engineers.** PRD review needs PO sign-off. Research review needs architect sign-off. Putting these in code repos means PMs and architects either need code-repo access (broader than necessary) or get cut out of the review loop. Mesh-repo CODEOWNERS for `platforms/<platform>/bars/<bar>/research/` and `.../prds/` cleanly include the right reviewers without granting code access.

3. **The freshness signal is governance, not execution.** A BAR whose last research is >12 months old should show yellow on the Architecture pillar. A BAR with no PRD for a planned feature should fail the "design before generation" Golden Rule (Workshop Rule 2). These are governance scorecard inputs — exactly what Looking Glass tracks.

Cheshire stays the *consumer* of the merged PRD manifest. When a PRD lands in the mesh repo, the Cheshire RCTRO issue generator in the target code repo picks up the manifest (via a workflow that watches the mesh repo) and creates the implementation issue. Cheshire doesn't generate the PRD — it executes against it.

## Prompt format — the NCMS semistructured pattern

All `.caterpillar/prompts/` packs follow the same conventions validated in the NCMS Archeologist / PRD / Design prompts (linked in References). This is the contract every LLM node consumes and every grounding review depends on. Standardising the format is what lets `architecture_review` and `security_review` do deterministic citation-grep checks instead of prose parsing.

### Pack file structure

Each pack is a `.md` file with frontmatter + markdown body:

```markdown
---
name: PRD Synthesis
id: prd/synthesis
version: 1.0.0
applies-to: PRD agent, synthesize_prd node
maintainer: '@your-team'
output-format: markdown-with-tables   # or "json-only" or "structured-review"
---

# {pack_title}

## Input variables
- {topic}: the brief topic
- {source_content}: the resolved research doc
- {mesh_context}: rendered MeshContext block
- {architect_input}: optional clarifying answers (deep mode)
- {previous_prd}: iteration > 1 only
- {gap_feedback}: iteration > 1 only

## Role
(plain-English role statement, e.g. "You are a senior product manager grounding
a PRD in research findings and the team's governance mesh.")

## Topic
{topic}

## Source Document (Researcher's Report)
{source_content}

## Expert Input from Mesh
{mesh_context}

## Required output structure
[Markdown sections + tables + ID conventions, specified below]

## Anti-hallucination guardrails
- Every functional requirement (FR-NN) MUST cite at least one premise (R[N]) or expert input (E[N]).
- Every security requirement MUST cite a STRIDE threat ID (THR-NNN) OR an OWASP category (Axx).
- Include a Coverage Analysis section accounting for every input premise with YES/PARTIAL/NO status.
- If a finding has no research or mesh backing, list it explicitly in an "Untraced items" subsection.
- Return ONLY content matching the required output structure. Do not include explanations of the format itself.
```

Two non-negotiable rules across all packs:

1. **Markdown `##` section headers** — never XML tags. Matches NCMS; predictable to grep; renders cleanly in PRs.
2. **Curly-brace `{placeholder}` input variables** — Python-f-string style. The runner does a deterministic string-template substitution before sending to the LLM; the substitution is recorded in the audit's `prompt_fingerprint`.

### Bidirectional traceability — the ID schemes

Every artifact uses an ID scheme so downstream nodes can grep for citations instead of parsing prose. The deterministic grounding reviews depend entirely on these IDs being well-formed.

| ID scheme | Owned by | Format | Example | Where it's verified |
|---|---|---|---|---|
| **S[N]** | Research source | `S<n>` | `S12` | Numbered sources in research doc Sources section; conclusions (C[N]) must cite ≥2 source premises (`SYNTHESIZE_PROMPT` rule). Adopted from NCMS. |
| **C[N]** | Research conclusion | `C<n>` | `C3` | Formal Conclusions section in research doc; each conclusion cites ≥2 S[N]; each recommendation in research traces to ≥1 C[N]. Adopted from NCMS. |
| **R[N]** | Research premise (used by PRD) | `R<n>` | `R7` | When research is consumed by PRD, the research's conclusions/findings are mapped to R[N] premises in the PRD's "Input Premises" section. PRD's FR-NN must cite at least one. |
| **E[N]** | Expert input (from mesh consultation) | `E<n>` | `E3` | Embedded in PRD's "Expert Input from Mesh" section by the architect/security knowledge LLM nodes (see ask_experts below); cited by FR-NN |
| **FR-NN** | Functional requirement | `FR-<nn>` | `FR-04` | Produced by `synthesize_prd`; must cite at least one R or E |
| **NFR-NN** | Non-functional requirement | `NFR-<nn>` | `NFR-02` | Same as FR-NN |
| **THR-NNN** | STRIDE threat ID | `THR-<nnn>` | `THR-014` | Lives in `bar.threats.yaml`; cited by PRD security requirements; `security_review` greps for these |
| **A0X** | OWASP Top 10 category | `A0<1-9>` or `A10` | `A03` | OWASP catalog shipped with runner; cited by PRD; `security_review` greps for these |
| **ADR-NNNN** | Architecture Decision Record | `ADR-<nnnn>` | `ADR-0012` | Lives in `bars/<bar>/adrs/`; cited by both research and PRD; `architecture_review` greps for these |
| **NIST-XX-NN** | NIST control reference | `<family>-<nn>` | `SA-11` | Portfolio NIST mappings; cited in PRD security requirements; `security_review` greps for these |

**Confidence ratings** (adopted from NCMS `SYNTHESIZE_PROMPT`). Every finding in research and every requirement in PRD carries one of:
- **HIGH** — 3+ independent sources / mesh artifacts support this
- **MEDIUM** — 2 sources / artifacts
- **LOW** — 1 source / artifact

The synthesis prompts require the LLM to mark each claim with its rating. `security_review` and `architecture_review` regex-extract these and surface in audit. A PRD with ≥3 LOW-rated functional requirements at default mode triggers an additional iteration with feedback "strengthen sourcing for these claims."

The grounding reviews work because of these IDs. `security_review` doesn't need to understand prose — it parses requirements, extracts `THR-NNN` / `A0X` / NIST citations, and intersects them with `MeshContext.bar.threats` / OWASP catalog / portfolio NIST. Any uncited applicable threat appears in `stride_entries_missing`. Any cited-but-nonexistent ID appears in a new `invalid_citations` field. Same logic for architecture (`ADR-NNNN` and CALM node names).

### Output format conventions per node type

Different nodes produce different shapes. The pack's `output-format` frontmatter declares which.

**`markdown-with-tables`** (used by synthesize_report, synthesize_prd):

The LLM returns markdown. Tables for requirements traceability, security controls, risk matrix, coverage analysis. The runner validates structure with Zod (heading count, section presence, table column conformance) but accepts the content verbatim. NCMS PRD synthesis is the reference: Input Premises / Problem Statement / Goals & Non-Goals / Functional Requirements with Traceability / Non-Functional Requirements / Security Requirements with Threat Tracing / Coverage Analysis / Risk Matrix / Success Metrics / References.

**`json-only`** (used by generate_manifest, plan_queries):

The pack ends with the literal instruction "Return ONLY valid JSON matching the following schema:" followed by an inline JSON Schema reference. The runner parses with `JSON.parse`, validates with Zod, and on failure retries once with the validation error appended to the prompt. After one retry the run fails with `node_error`. NCMS `MANIFEST_PROMPT` is the reference: explicit "Return ONLY valid JSON" + a sample structure with `endpoints`, `security_requirements`, `technology_constraints`, `quality_targets`.

**`structured-review`** (used by ask_experts in deep mode):

The LLM returns a list of clarifying questions in the exact format:
```
QUESTION-01:
  scope: architecture | security | domain | compliance
  triggered_by_mesh_gap: <gap_id> | (none)
  question: <one sentence>
  why_it_matters: <one sentence grounded in MeshContext>
  answerable_by: '@PO' | '@architect' | '@security-lead' | …

QUESTION-02:
  …
```
Numbered IDs (`QUESTION-01`), explicit `triggered_by_mesh_gap` field (cites which `MeshContext.bar.mesh_gaps` motivated the question), `answerable_by` for routing. The runner parses with a small regex and Zod-validates. NCMS design-review prompts (`SCORE` / `SEVERITY` / `COVERED` / `MISSING` / `CHANGES`) are the reference for this kind of grep-friendly structured output.

### Canonical section names per pack (initial library)

These are the sections the runner expects in each generated artifact. Drift is detected by Zod structural validation; missing required sections trigger a retry or `node_error`.

**`research/query-plan.md` (Archeologist `plan_queries`)** — `output-format: json-only`. Adopts NCMS `PLAN_QUERIES_PROMPT` per-provider specialisation. Output is a single JSON object with four keys, each containing the queries tuned for that provider's quirks:

```json
{
  "web":       [ "5 natural-language queries, include year (2026), cover market/standards/threats/architecture/case studies" ],
  "arxiv":     [ "3 short technical phrases (3-6 words), formal methods focus" ],
  "patent":    [ "3 queries using AND operators, 2-3 keywords max, no stop words" ],
  "community": [ "3 casual 2-3 word HackerNews-style phrases" ]
}
```

The per-provider tuning matters because each search backend reads queries differently — Tavily prefers natural language with context; arXiv's relevance ranker is brittle to stop words; USPTO requires AND-joined keyword sets; HN's Algolia search rewards short topical phrases. One generic query plan gets sub-optimal recall everywhere. The runner's Zod validator enforces query counts (5/3/3/3) and per-field rules (e.g., web queries must include a 4-digit year).

**`research/gap-analysis.md` (Archeologist `gap_analysis`, optional)** — `output-format: json-only`. Adopts NCMS `GAP_ANALYSIS_PROMPT`. Runs ONLY after the first dedupe pass when source diversity is below a threshold (`<2 independent sources` for a finding, contradictions across sources, or a topic in the brief has no coverage). Output is exactly 3 follow-up web queries:

```json
[
  "follow-up query 1",
  "follow-up query 2",
  "follow-up query 3"
]
```

The runner re-runs `tavily_search` with these three follow-up queries, merges results into the existing pool, re-dedupes, then proceeds to synthesis. This is a **bounded, one-shot** follow-up loop (not iterative) — 3 extra queries max per run. Captures the NCMS pattern of "first pass found weak coverage, ask for targeted reinforcement" without opening the door to runaway research iteration. The audit records whether `gap_analysis` ran, what gap signal triggered it, and what the 3 follow-up queries returned.

**`research/synthesis.md` (Archeologist `synthesize_report`)** — `output-format: markdown-with-tables`. Adopts NCMS `SYNTHESIZE_PROMPT` — the "semi-formal research certificate" with full traceability. Required sections (10):

- `## Source Premises` (numbered S1, S2, … with title / URL / retrieved-at / score / provider)
- `## Executive Summary`
- `## Cross-Source Analysis` with subsections `### Standards`, `### Security`, `### Implementation`, `### Market`
- `## Evidence Gaps` (what we couldn't find; counts of sources per topic)
- `## Jobs-to-be-Done Analysis`
- `## Patent Landscape` (only populated if uspto returned results)
- `## Whitespace Analysis` (opportunity areas surfaced by gaps + jobs-to-be-done)
- `## Formal Conclusions` (numbered C1, C2, … with confidence rating; each citing ≥2 S[N])
- `## Recommendations` (each tracing to ≥1 C[N])
- `## References` (deduplicated source list)

Traceability rules (enforced by the runner's structural validator + the `parse-citations` regex extractor):

- Every claim must be traceable to a specific source (S[N])
- Each Formal Conclusion (C[N]) cites at least 2 source premises
- Each Recommendation traces to at least 1 Formal Conclusion
- Every section heading is present and exactly matches the canonical list above (drift fails the structural check; one retry permitted)
- Confidence rating on every claim: HIGH (3+ sources) / MEDIUM (2) / LOW (1)

**`research/synthesis-archaeology.md` (Archeologist `synthesize_report` — archaeology path variant)** — same `output-format`, different sections per NCMS `SYNTHESIZE_REPORT_PROMPT` (the archaeology-specific one in `archeologist_prompts.py`):

- `## Executive Summary`
- `## Repository Profile`
- `## Current Architecture`
- `## Gap Analysis` (each gap cites `ObservedArchitecture` evidence + relevant CALM nodes from MeshContext)
- `## External Research Findings`
- `## Recommendations`
- `## Implementation Roadmap`
- `## Risk Factors`
- `## Untraced items`

Archaeology path uses a different canonical structure because its inputs are different (a real codebase + mesh comparison rather than a market topic). Both paths share the runner's structural validator + ID parser; only the section list differs per pack.

**`prd/synthesis.md` (PRD agent `synthesize_prd`)** — directly adopts NCMS `SYNTHESIZE_PRD_PROMPT`:
- `## Input Premises` (numbered R1, R2, … from research; E1, E2, … from MeshContext / ask_experts answers)
- `## Problem Statement and Scope`
- `## Goals and Non-Goals`
- `## Functional Requirements with Traceability` (FR-NN, each citing R[N] / E[N])
- `## Non-Functional Requirements` (NFR-NN)
- `## Security Requirements with Threat Tracing` (each cites THR-NNN and/or A0X and/or NIST-XX-NN)
- `## Coverage Analysis` (every input premise accounted for: YES / PARTIAL / NO)
- `## Risk Matrix`
- `## Success Metrics`
- `## References`

**`prd/manifest.md` (PRD agent `generate_manifest`)** — output format `json-only`:
- Single JSON object matching `PrdManifest` Zod schema.
- Endpoints carry CALM-node references.
- Security requirements carry the THR/A0X/NIST citation IDs that appeared in the synthesis markdown.
- The `grounding:` block (added later by `architecture_review` + `security_review` + `verify_grounding`) joins this manifest.

**`prd/ask-experts.md` (PRD agent `ask_experts`, deep mode)** — output format `structured-review`:
- Numbered `QUESTION-NN` blocks with `scope`, `triggered_by_mesh_gap`, `question`, `why_it_matters`, `answerable_by` fields.
- The runner parses these into a `ClarifyingQuestions[]` array; the audit records which `mesh_gaps` each question cited.

### Why this format choice

Three properties of the NCMS pattern that we deliberately preserve:

1. **Markdown is the lingua franca.** PRs render it cleanly. Reviewers read it without tools. Diffs are sensible. No XML escaping headaches.
2. **IDs let pure functions verify prose.** `security_review` regex-extracting `A07` and `THR-014` from the PRD body is reliable. Asking an LLM to "check if this PRD addresses A07" is not. The whole grounding loop depends on this discrepancy.
3. **Coverage analysis is a separate required section, not an inferred check.** When the LLM has to *write down* "we addressed premise R3 (covered)" / "R7 (partial)" / "R9 (no)", it surfaces its own gaps. Then `verify_grounding` cross-checks the LLM's self-reported coverage against what the grep'd citations actually show — caught discrepancies become loop feedback.

---

### Prompt pack ownership — Caterpillar (mesh) vs Cheshire (code)

The two subsystems own different prompt libraries because they govern different audiences and time horizons:

| Library | Lives in | Owned by | Audience | Pack examples |
|---|---|---|---|---|
| **`.caterpillar/prompts/`** | Mesh repo | Looking Glass / Caterpillar | PMs, architects, governance reviewers | `research/query-plan.md`, `research/synthesis.md`, `prd/synthesis.md`, `prd/ask-experts.md` (in the future: ADR templates, threat-model elicitation packs) |
| **`.cheshire/prompts/`** | Code repo | Cheshire Cat | Engineers, AI coding agents | `owasp/A01-A10.md`, `stride/*.md`, `maintainability/*.md`, `maintainability/calm-layer-enforcement.md` |

Mesh-side packs drive intent (what to research, how to synthesize, what to put in a PRD). Code-side packs drive execution (how to implement securely, what to test for, what to refactor). Both libraries are versioned with their own Hatter's Tag-compatible `prompt-library.yaml` manifest. Neither subsystem reaches into the other's library.

### Output destination hierarchy (in the mesh repo)

```
governance-mesh/
  mesh.yaml
  portfolio/
  .caterpillar/                               # NEW: mesh-side Caterpillar config
    prompts/
      research/
        query-plan.md@v1.0.0                  # LLM pack for Archeologist plan_queries node
        synthesis.md@v1.0.0                   # LLM pack for synthesize_report node
      prd/
        ask-experts.md@v1.0.0                 # LLM pack for PRD ask_experts node (optional run mode)
        synthesis.md@v1.0.0                   # LLM pack for synthesize_prd node
    prompt-library.yaml                       # mesh-side library manifest (mirrors Cheshire's pattern)
  research/                                   # portfolio-level research
    archaeology/                              # acquisition / candidate-repo investigations
      <target-org-target-repo>-<date>.md
    cross-platform/                           # research that spans platforms
      <topic>-<date>.md
  platforms/
    imdb-lite/
      platform.arch.json
      research/                               # platform-level research (spans BARs)
        <topic>-<date>.md
      bars/
        APP-IMDB-002/
          bar.yaml
          research/                           # BAR-level research
            celebrity-following-2026-05.md
          prds/                               # BAR-level PRDs
            celebrity-following-2026-05.md
            celebrity-following-2026-05.manifest.json
        APP-IMDB-001/
          ...
  .research-audit/                            # JSONL audit logs (mesh-rooted, kept at root for grep-ability)
    RES-2026-05-17-abc123.jsonl
    PRD-2026-05-17-def456.jsonl
  .github/workflows/
    archeologist.yml                          # NEW: generated by Looking Glass scaffold
    prd.yml                                   # NEW: generated by Looking Glass scaffold
    label-on-merge.yml                        # NEW: post-merge bus handler
    notify-code-repos.yml                     # NEW: signals code repos on spec-ready
```

The level (portfolio / platform / BAR) is determined by where the trigger came from — right-clicking a BAR in Looking Glass scopes the research to that BAR; right-clicking a Platform scopes it to the platform; using the "Portfolio Research" command scopes it to the root `research/` directory.

---

## Why determinism matters here

The NCMS implementation already separates LLM nodes from pure-function nodes (LangGraph makes this natural). The risk of porting to an MCP-driven design is that *the LLM decides which tool to call, with which arguments, in which order* — and that fan-out is non-deterministic by construction. The same brief run twice produces different audit trails.

For research deliverables that an auditor or product owner needs to trust, *the same brief should produce the same shape of work*. Different *content* (the web changed) is fine. Different *methodology* (the agent decided this run to skip patent search) is not.

So we draw the line clearly:

| Layer | Behaviour | Determinism |
|---|---|---|
| **Brief validation** | Schema check on the incoming request | Pure function |
| **Query planning** | LLM converts plain-English brief into a structured `QueryPlan` JSON | Non-deterministic *content*, deterministic *shape* (LLM output is schema-validated) |
| **Data acquisition** | Tavily / arXiv / USPTO / HN API calls with the planned queries | Pure function (same query → same API response shape; content varies with the world) |
| **Dedupe + rank** | Collapse duplicate sources, score by salience | Pure function |
| **Synthesis** | LLM produces structured markdown from the gathered evidence | Non-deterministic *prose*, deterministic *structure* (output is schema-validated) |
| **Publish** | Write PR with output + Hatter's Tag + audit log | Pure function |

The LLM has exactly two seats in the pipeline: writing the query plan and writing the synthesis. Everything else is reproducible.

---

## The two agents

### Archeologist

**Purpose:** Produce a market-research or codebase-archaeology document given a topic brief.

**Triggers:**
- GitHub Projects field change (move card to "Research")
- GitHub Issue labelled `research-request`
- Comment `@claude please research <topic>` on any issue
- VS Code Cheshire panel `New Research`
- MCP tool call (future, when Research MCP server exists)

**Pipeline (research path):**

| # | Node | Kind | Input | Output | API |
|---|---|---|---|---|---|
| 1 | `validate_brief` | pure | raw brief | `ResearchBrief` (validated) | n/a |
| 2 | `gather_mesh_context` | pure | scope (`bar`/`platform`/`portfolio`) | `MeshContext` (see schema below) | mesh-reader |
| 3 | `plan_queries` | **LLM** | brief + MeshContext | `QueryPlan` (web, arxiv, uspto, hn queries) | configurable provider |
| 4 | `tavily_search` | pure API | plan.web | `WebResults[]` | Tavily REST |
| 5 | `arxiv_search` | pure API | plan.arxiv | `Papers[]` | arXiv REST |
| 6 | `uspto_search` | pure API | plan.uspto | `Patents[]` | USPTO Open Data REST |
| 7 | `hackernews_search` | pure API | plan.hn | `Discussions[]` | HN REST |
| 8 | `dedupe_and_rank` | pure | all above | `RankedSources[]` | n/a |
| 9 | `synthesize_report` | **LLM** | brief + MeshContext + ranked sources | `ResearchDoc` (markdown + frontmatter) | configurable provider |
| 10 | `publish` | pure | doc + audit log | PR url + committed paths | GitHub REST |
| 11 | `verify_and_trigger` | pure | publish result | `RunOutcome` + downstream trigger contract | GitHub REST |

**Pipeline (archaeology path):** the path skips `plan_queries` — its queries come from the gap analysis. Replace nodes 3-7 with:

| # | Node | Kind | Input | Output | API / library |
|---|---|---|---|---|---|
| 3a | `clone_and_index` | pure | repo url | local clone + file inventory | git, ripgrep |
| 4a | `analyze_architecture` | pure | clone | `ObservedArchitecture` (see schema below) | **tree-sitter** + lightweight extractor |
| 5a | `identify_gaps` | pure | observed arch + MeshContext.bar.calm_model + layer rules | `Gap[]` + derived `QueryPlan` (web-only) | mesh-reader |
| 6a | `web_research` | pure API | gap-derived queries | `WebResults[]` | Tavily REST |

Both paths converge at node 8 (dedupe) → 9 (synthesize_report) → 10 (publish) → 11 (verify_and_trigger) → END. Archaeology runs use only Tavily (no arxiv/uspto/hn) because the queries come from observed-architecture gaps, which need current-web answers rather than academic or patent prior art.

### `gather_mesh_context` — the mesh IS the expert

Every LLM node in both agents is grounded in the mesh's existing knowledge of the BAR, Platform, or Portfolio being researched. `gather_mesh_context` reads the relevant mesh files deterministically based on `ResearchBrief.scope.level` and produces a `MeshContext` that flows into every downstream LLM call.

```typescript
// mesh-context.zod.ts
export const MeshContext = z.object({
  scope: z.object({
    level: z.enum(['portfolio', 'platform', 'bar']),
    bar_id: z.string().optional(),         // present when level === 'bar'
    platform_id: z.string().optional(),    // present when level === 'platform' OR when level === 'bar' (parent)
  }),
  mesh_sha: z.string(),                    // mesh repo commit at read time — for audit
  portfolio: z.object({                    // always populated
    name: z.string(),
    governance_policy: z.unknown(),        // orchestration policy YAML, parsed
    capability_models: z.array(z.unknown()),
    related_research_summaries: z.array(z.object({
      research_id: z.string(),
      topic: z.string(),
      published_at: z.string(),
    })),
  }),
  platform: z.object({                     // populated when level === 'platform' OR 'bar'
    platform_id: z.string(),
    architecture: z.unknown(),             // platform.arch.json parsed
    sibling_bars: z.array(z.object({
      bar_id: z.string(),
      name: z.string(),
      composite_score: z.number(),
    })),
    related_research_summaries: z.array(z.unknown()),
  }).nullable(),
  bar: z.object({                          // populated only when level === 'bar'
    bar_id: z.string(),
    name: z.string(),
    composite_score: z.number(),
    tier: z.enum(['restricted', 'supervised', 'autonomous']),
    calm_model: z.unknown(),               // bar.arch.json — nodes, relationships, flows
    threats: z.unknown().nullable(),       // STRIDE entries (bar.threats.yaml) if present
    controls: z.unknown().nullable(),      // NIST mappings if present
    adrs: z.array(z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      decision: z.string(),
    })),
    pillar_scores: z.object({
      architecture: z.number(),
      security: z.number(),
      info_risk: z.number(),
      operations: z.number(),
    }),
    related_research: z.array(z.unknown()),  // prior research docs in this BAR's research/ dir
    related_prds: z.array(z.unknown()),      // prior PRDs in this BAR's prds/ dir
    mesh_gaps: z.array(z.enum([              // structural gaps the scorer already knows about
      'no_threat_model', 'no_controls_mapping', 'no_adrs',
      'stale_research', 'missing_prd_for_planned_feature',
      'low_architecture_pillar', 'low_security_pillar',
    ])),
  }).nullable(),
});
```

The `mesh_gaps` field on `bar` is the key one for `ask_experts` (PRD) and `plan_queries` (Archeologist). It pre-identifies known gaps so the LLM nodes can surface them as clarifying questions or research queries that **address what the team already knows is missing**, not what the LLM guesses might be missing.

Audit event for `gather_mesh_context`:

```json
{
  "schema_version": "1.0",
  "run_id": "RES-2026-05-17-abc123",
  "agent": "archeologist",
  "node": "gather_mesh_context",
  "node_kind": "pure",
  "event": "node_complete",
  "timestamp": "2026-05-17T15:23:35.421Z",
  "duration_ms": 87,
  "scope": { "level": "bar", "bar_id": "APP-IMDB-002", "platform_id": "PLT-IMDB" },
  "mesh_sha": "a4b5c6d7…",
  "files_read": [
    "platforms/imdb-lite/bars/APP-IMDB-002/bar.yaml",
    "platforms/imdb-lite/bars/APP-IMDB-002/bar.arch.json",
    "platforms/imdb-lite/bars/APP-IMDB-002/bar.threats.yaml",
    "platforms/imdb-lite/bars/APP-IMDB-002/adrs/",
    "platforms/imdb-lite/bars/APP-IMDB-002/research/",
    "platforms/imdb-lite/bars/APP-IMDB-002/prds/",
    "platforms/imdb-lite/platform.arch.json",
    "portfolio/portfolio.yaml"
  ],
  "summary": {
    "bar_pillar_scores": { "architecture": 35, "security": 52, "info_risk": 41, "operations": 48 },
    "bar_tier": "restricted",
    "calm_nodes": 4,
    "calm_relationships": 3,
    "threat_count": 0,
    "adr_count": 2,
    "prior_research_count": 1,
    "prior_prd_count": 0,
    "mesh_gaps_detected": ["no_threat_model", "missing_prd_for_planned_feature", "low_architecture_pillar"]
  },
  "next_node": "plan_queries"
}
```

Auditor's value: *"this research was planned against an APP-IMDB-002 mesh state at SHA a4b5c6 that had no threat model, no PRDs, and a low Architecture pillar. The LLM's query plan and synthesis should reflect those gaps."* That sentence is one jq query away.

### Why `publish` and `verify_and_trigger` are separate nodes

Mirrors the NCMS pattern explicitly. The split matters because publishing is multi-step IO that can half-succeed:

| Node | What can go wrong | Why it's its own node |
|---|---|---|
| `publish` | PR created but audit log commit racing; branch pushed but PR API call rate-limited; doc written but Hatter's Tag YAML truncated | Atomic IO concern — emits one event on success or failure |
| `verify_and_trigger` | All publish steps reported success, but: PR is missing the audit log file; output hash in Hatter's Tag doesn't match committed doc; downstream trigger contract is undefined | Verification + commitment — emits the *final* event the audit consumer relies on to know the run is done and downstream is safe to fire |

`verify_and_trigger` does three things, in order:

1. **Re-fetch the PR via the GitHub API** and confirm: research doc present, audit JSONL present, Hatter's Tag YAML parses, `output_hash` in the Tag matches `sha256` of the committed doc.
2. **Emit the `run_complete` audit event** with `outcome: 'success' | 'partial' | 'failed'` and the verified PR URL. This is the single event downstream consumers watch for.
3. **Document the trigger contract.** Writes a comment on the source issue: *"Research run `RES-…` complete. PR #N. When this PR merges, the issue will be labeled `prd-ready` and the PRD agent will run. To skip PRD generation, remove the `auto-prd` label from this issue before merging."*

Note the semantic difference from NCMS: NCMS uses a message bus for automatic chaining (Archeologist publishes → bus event → PRD agent picks up). We use **GitHub labels as the bus** so a human PR review sits between agents. The `verify_and_trigger` node *documents the trigger contract* but does not itself fire the downstream agent. The post-merge workflow does that when the PR lands, which is the human-in-the-loop checkpoint the framework is built around.

### The archaeology code-analysis layer — what tree-sitter does and doesn't do

**Goal:** produce *structured details* the LLM can reason against, **not** a code-intelligence visualization. Tools like [gitnexus](https://github.com/gitnexus) build interactive knowledge graphs of repos. We borrow the *data model* (nodes + edges with attributes) but not the *UI* or the *graph database*. The output is JSON + a markdown summary; the synthesis LLM and the `identify_gaps` node are the only consumers.

**Why tree-sitter over the alternatives:**

| Option | Why we picked / passed |
|---|---|
| **tree-sitter** | ✓ Polyglot grammars (TS/JS, Python, Go, Java, Ruby, Rust, C#, …) under one API. Fast. Battle-tested. Same parser GitHub's code-nav uses. |
| TypeScript Compiler API | Only TS/JS. More accurate type resolution but locks us out of polyglot repos (frontend + backend often differ). Worth using *inside* tree-sitter for TS-only files if we want richer type info later. |
| SCIP/LSIF indexers (Sourcegraph) | Higher fidelity (real cross-file resolution) but heavyweight: requires per-language indexer + index storage. Overkill for v1 archaeology. Reserve for v2 when we want refactor-grade analysis. |
| gitnexus / similar viz tools | Built for humans to look at. The synthesis LLM doesn't need a graph viz; it needs the data. |
| "Let the coding agent grep and read freely" | Non-deterministic; not auditable in the same per-node way; expensive in context tokens; produces inconsistent extraction across runs. The whole point of this design is to keep the LLM bracketed. |

### What `analyze_architecture` extracts (the `ObservedArchitecture` schema)

```typescript
// observed-architecture.zod.ts
export const ObservedArchitecture = z.object({
  repository: z.object({
    url: z.string().url(),
    sha: z.string(),
    primary_language: z.string(),
    languages_secondary: z.array(z.string()),
    file_count: z.number(),
    line_count: z.number(),
  }),
  modules: z.array(z.object({
    path: z.string(),                        // src/routes/search.ts
    language: z.string(),
    layer: z.enum([                          // inferred from path conventions + AST content
      'route', 'service', 'data', 'shared',
      'config', 'test', 'frontend-component', 'unknown',
    ]),
    layer_confidence: z.enum(['high', 'medium', 'low']),
    imports: z.array(z.object({
      target: z.string(),                    // resolved module path, or unresolved package name
      kind: z.enum(['local', 'package', 'builtin']),
    })),
    exports: z.array(z.string()),
    symbols: z.object({
      functions: z.array(z.string()),
      classes: z.array(z.string()),
      types: z.array(z.string()),
    }),
    framework_surfaces: z.object({           // populated only when detected
      api_routes: z.array(z.object({
        method: z.string(),                  // GET, POST, …
        path: z.string(),                    // /search
        handler: z.string(),                 // function name
      })).optional(),
      db_queries: z.array(z.object({
        driver: z.string(),                  // pg, mongoose, …
        unsafe_concat: z.boolean(),          // useful signal for A03 gap detection
        location_line: z.number(),
      })).optional(),
    }),
  })),
  cross_module_calls: z.array(z.object({     // approximate, by import + identifier reference
    from_module: z.string(),
    to_module: z.string(),
    call_sites: z.number(),
  })),
  external_dependencies: z.array(z.object({
    name: z.string(),
    version: z.string(),
    source: z.enum(['npm', 'pip', 'gomod', 'maven', 'cargo', 'nuget']),
    age_days: z.number().optional(),          // if registry lookup succeeds
  })),
  conventions: z.object({
    frameworks_detected: z.array(z.string()), // express, fastapi, next, react, …
    test_framework: z.string().optional(),
    package_manager: z.string().optional(),
    ci_workflows: z.array(z.string()),       // .github/workflows/*.yml found
  }),
  extraction_notes: z.array(z.string()),     // languages skipped, parse errors, etc.
});
```

### What is intentionally NOT in the schema

- **No type-resolved call graph.** We emit *approximate* `cross_module_calls` based on imports + identifier references. Real call resolution needs LSP/SCIP. The LLM synthesis can read "module A imports from module B and references symbol X" and that is enough signal for archaeology; refactor-grade resolution is a v2 question.
- **No control-flow / data-flow graph.** Tree-sitter is a syntax tool, not a flow analyzer. If we need flow analysis for a specific concern (taint tracking for A03, for example), we delegate to CodeQL (which already exists in the pipeline from Workshop Part 3) rather than reinventing.
- **No visualization output.** No SVG, no DOT graph, no interactive viewer. The JSON is the deliverable; the synthesis LLM reads it; the `identify_gaps` node reads it. Humans read the markdown.
- **No vendored grammars in the runner package.** Tree-sitter grammars are installed as separate packages (`tree-sitter-typescript`, `tree-sitter-python`, …) lazy-loaded based on the primary language detected in `clone_and_index`. Polyglot repos load multiple grammars.

### Layer inference — how we tag each module

The `layer` field on each module is what makes `identify_gaps` possible: the gap detector compares the *observed* layer assignments against the BAR's CALM-declared layer rules. Layer inference uses two signals:

1. **Path conventions** (high confidence when matched):
   - `src/routes/**` or `app/api/**` → `route`
   - `src/services/**` or `src/lib/services/**` → `service`
   - `src/db/**`, `src/models/**`, `prisma/**` → `data`
   - `src/components/**` → `frontend-component`
   - `test/**`, `**/*.test.ts`, `**/__tests__/**` → `test`
   - `config/**`, `*.config.ts` → `config`
2. **AST content** (resolves ambiguity):
   - imports `express` or `fastify` and exports a router → `route` regardless of path
   - imports `pg` / `mongoose` / `prisma` and exports a query helper → `data`
   - imports React and exports a function returning JSX → `frontend-component`

The `layer_confidence` field is set to `high` if both signals agree, `medium` if only one matches, `low` if neither matches (the module ends up as `unknown` and `identify_gaps` flags it as "uncategorized — manual review recommended").

This is the same layer mapping the Workshop Part 4 CALM-layer fitness function uses. Same source of truth for both: `.cheshire/calm-layers.json`.

### Audit event for `analyze_architecture`

```json
{
  "schema_version": "1.0",
  "run_id": "RES-2026-05-17-abc123",
  "agent": "archeologist",
  "node": "analyze_architecture",
  "node_kind": "pure",
  "event": "node_complete",
  "timestamp": "2026-05-17T15:30:11.842Z",
  "duration_ms": 8421,
  "input_summary": {
    "repo": "github.com/AliceNN-ucdenver/celeb-api",
    "sha": "a4b5c6d7…",
    "file_count": 87
  },
  "output_summary": {
    "modules_analyzed": 84,
    "modules_skipped": 3,
    "skipped_reasons": ["binary file (1)", "parse error (2)"],
    "layers_distribution": { "route": 6, "service": 11, "data": 4, "test": 21, "config": 3, "shared": 39 },
    "frameworks_detected": ["express", "pg", "zod"],
    "cross_module_call_edges": 142,
    "low_confidence_modules": 7
  },
  "grammars_loaded": ["tree-sitter-typescript@v0.21.0"],
  "next_node": "identify_gaps"
}
```

The output is structured enough that an auditor can ask *"on this run, which modules were tagged `route`?"* and the answer is one `jq` query on the observed-architecture JSON the run produced.

### What `identify_gaps` then compares

Given:
- `ObservedArchitecture.modules[].layer` (from tree-sitter analysis above)
- The BAR's CALM model declared in `bars/<bar-id>.bar.yaml`
- The layer rules in `.cheshire/calm-layers.json` (route → service → data, no skipping)

The gap detector produces a `Gap[]` for the LLM synthesis to weave into the research findings:

```typescript
Gap = {
  kind: 'undeclared-layer-crossing' | 'undeclared-flow' | 'orphan-node' |
        'stale-dependency' | 'unclassified-module' | 'security-critical-untagged'
  evidence: { source_module: string; target_module?: string; line?: number }
  severity: 'high' | 'medium' | 'low'
  suggested_question: string  // becomes a follow-up web research query
}
```

A gap like `{ kind: 'undeclared-layer-crossing', evidence: { source: 'src/routes/search.ts', target: 'src/db/celeb.ts' } }` flows into the `web_research` node as a derived query *"how do teams typically refactor route→data direct imports through a service layer in TypeScript/Express?"* — and into the synthesis as a named finding the PRD agent will inherit as a non-functional requirement.

### Implementation note for the runner

`packages/research-runner/src/nodes/analyze-architecture.ts` becomes the primary new piece of TypeScript here. Roughly:

```typescript
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import Python from 'tree-sitter-python';
// … other grammars

export async function analyzeArchitecture(clone: ClonedRepo): Promise<ObservedArchitecture> {
  const primary = detectPrimaryLanguage(clone);     // by file extension + count
  const parser = new Parser();
  parser.setLanguage(grammarFor(primary));

  const modules = await Promise.all(
    clone.files.map(async (file) => {
      const ast = parser.parse(await fs.readFile(file.path, 'utf8'));
      return {
        path: file.relpath,
        language: file.language,
        layer: inferLayer(file.relpath, ast),
        layer_confidence: inferLayerConfidence(file.relpath, ast),
        imports: extractImports(ast, file.language),
        exports: extractExports(ast, file.language),
        symbols: extractSymbols(ast, file.language),
        framework_surfaces: extractFrameworkSurfaces(ast, file.language),
      };
    })
  );

  return {
    repository: clone.metadata,
    modules,
    cross_module_calls: buildApproxCallGraph(modules),
    external_dependencies: await loadDependencyManifest(clone),
    conventions: detectConventions(clone),
    extraction_notes: gatherSkipReasons(modules),
  };
}
```

Tree-sitter parses are linear in file size and parallelizable; an 80-module TypeScript repo analyzes in ~5-10 seconds on the Actions runner. That fits comfortably inside the workflow budget.

### What this earns us

- **Reproducibility.** Same SHA + same tree-sitter grammar versions = same `ObservedArchitecture` JSON, byte-for-byte. The audit `output_summary.cross_module_call_edges: 142` should be stable run-to-run for a given commit. Drift in that number signals either grammar version drift or repo change — both worth knowing.
- **Bounded LLM context.** The synthesis LLM reads a ~50-200 KB JSON summary instead of 80 raw files (potentially MBs of code). Cheaper per run; faster; less likely to hallucinate.
- **Direct alignment with the CALM layer fitness function from Workshop Part 4.** Same layer mapping; same `.cheshire/calm-layers.json`; same conventions. The archaeology agent and the maintainability fitness function are reading the codebase through the same lens.
- **Honest about limits.** We don't claim refactor-grade analysis. The output's `extraction_notes` lists what we skipped and why; `low_confidence_modules` surfaces ambiguity. The synthesis LLM and the human reviewer know exactly how much to trust the gap findings.

### PRD Agent

**Purpose:** Produce a Product Requirements Document derived from a research output (or a plain brief).

**Triggers:**
- Research PR merged → workflow auto-labels the source issue `prd-ready` → triggers PRD workflow
- GitHub Issue labelled `prd-request` (with optional `research-id` reference)
- Comment `@claude please draft PRD from research/<id>`

**Pipeline:**

| # | Node | Kind | Input | Output | API |
|---|---|---|---|---|---|
| 1 | `validate_brief` | pure | raw brief | `PrdBrief` (validated) | n/a |
| 2 | `gather_mesh_context` | pure | scope (BAR/Platform) | `MeshContext` (CALM + threats + controls + ADRs + scorecard + prior research/PRDs + known mesh_gaps) | mesh-reader |
| 3 | `resolve_research` | pure | brief.research_id | research doc content + frontmatter | GitHub REST (or local FS) |
| 4 | `ask_experts` | **LLM, optional** | brief + research + MeshContext | `ClarifyingQuestions[]` grounded in mesh artifacts | configurable provider |
| 5 | `synthesize_prd` | **LLM** | brief + research + MeshContext + answers | `PrdDoc` (markdown) | configurable provider |
| 6 | `generate_manifest` | pure | PRD markdown | `PrdManifest` (JSON: endpoints, security reqs, success metrics) | n/a |
| 7 | `publish_prd` | pure | doc + manifest + audit log | PR url + committed paths | GitHub REST |
| 8 | `verify_and_trigger` | pure | publish result | `RunOutcome` + downstream trigger contract (labels source issue `spec-ready` on PR merge) | GitHub REST |

### `ask_experts` — two expert personas, mesh-grounded (NCMS knowledge-prompt pattern)

NCMS [`expert_prompts.py`](https://github.com/AliceNN-ucdenver/ncms/blob/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms/expert_prompts.py) defines **four** expert personas split across two axes:

| | Knowledge (gives advice) | Review (scores designs) |
|---|---|---|
| **Architecture** | `ARCHITECT_KNOWLEDGE_PROMPT` — cites ADR-NNNN, CALM constraints, quality attribute implications | `ARCHITECT_REVIEW_PROMPT` — scores against CALM Model Compliance / ADR Compliance / Fitness Function Validation / Quality Attribute Verification / Component Boundary Analysis |
| **Security** | `SECURITY_KNOWLEDGE_PROMPT` — cites THR-NNN, OWASP A0X, NIST controls, risk levels | `SECURITY_REVIEW_PROMPT` — scores against OWASP Top 10 Pattern Detection / STRIDE Threat Model Compliance / Security Controls Verification / Secrets Management / Transport Security / Dependency Security |

The **knowledge prompts** belong to `ask_experts` (advice before synthesis). The **review prompts** belong to a new `expert_review` node added after the pure-function citation reviews (LLM judgment to complement deterministic citation checks).

So `ask_experts` actually fires **two LLM calls in parallel**, one per expert persona, each grounded in the same MeshContext:

```typescript
// In the PRD pipeline runner
const [architectAdvice, securityAdvice] = await Promise.all([
  llm.complete({
    pack: '.caterpillar/prompts/prd/ask-experts-architect@v1.0.0',
    context: { memory_context: renderMeshForArchitect(meshContext), input: brief.topic },
  }),
  llm.complete({
    pack: '.caterpillar/prompts/prd/ask-experts-security@v1.0.0',
    context: { memory_context: renderMeshForSecurity(meshContext), input: brief.topic },
  }),
]);

const expertInput = {
  architect: parseStructuredAdvice(architectAdvice),   // E1, E2, … with ADR/CALM citations
  security:  parseStructuredAdvice(securityAdvice),    // E3, E4, … with THR/A0X/NIST citations
};
```

The two personas read different slices of MeshContext:
- **Architect persona** receives `MeshContext.bar.calm_model`, `MeshContext.bar.adrs`, `MeshContext.platform.architecture`, `MeshContext.bar.pillar_scores.architecture`
- **Security persona** receives `MeshContext.bar.threats`, `MeshContext.bar.controls`, the OWASP catalog, `MeshContext.bar.pillar_scores.security`, `MeshContext.bar.mesh_gaps` filtered to security gaps

Each persona produces numbered `E[N]` expert inputs (sequentially numbered across both, e.g., architect produces E1-E5, security produces E6-E10). These are the citations the PRD's FR-NN can reference. The advice is grounded in real mesh artifacts (cites ADR-0012 from `bars/<bar>/adrs/`, not a made-up ADR; cites THR-014 from `bar.threats.yaml`, not hallucinated).

Concrete examples of what each persona produces:

- **Architect**: *"E1 (HIGH confidence): The proposed flow `imdb-react-frontend → celeb-db` is not declared in CALM (`bar.arch.json` lacks this relationship). Per ADR-0012, frontend reaches the database through `celeb-api`. Either route through `celeb-api` or file a new ADR justifying the direct flow before specifying this PRD."*
- **Security**: *"E6 (HIGH confidence): The proposed `POST /favorites` endpoint requires authentication. THR-001 (Spoofing — fake session token) applies. OWASP A07 applies. PRD must specify rate-limit + account lockout per NIST AC-7. The BAR has no current STRIDE entry for this endpoint — `mesh_gaps` includes `no_threat_model` for the favorites surface."*

`ask_experts` is **optional** and runs only when `brief.depth == "deep"` — but when it does run, both experts always fire in parallel (no per-persona toggle in v1). In `quick` mode, the pipeline skips ask_experts entirely; `synthesize_prd` still receives the full `MeshContext` so synthesis is mesh-grounded, just without the structured expert advice up front. Both modes are auditable; the Hatter's Tag records `depth: quick | deep` and (if deep) lists the two expert calls with their model fingerprints.

### LLM expert reviews — pairing deterministic citation checks with LLM scoring

The pure-function `architecture_review` and `security_review` nodes produce deterministic citation reports. They can tell us *"the PRD addresses 14 of 18 applicable STRIDE entries"* with certainty. They cannot tell us *"the audit log requirement is too vague to actually catch repudiation."* That's quality judgment, and that's what LLM expert reviewers add.

So the design now pairs deterministic + LLM reviewers, both running in parallel:

```
generate_manifest
       │
       ├──→ architecture_review (pure)    ──→ ArchitectureGrounding {citations, coverage_percent, invalid_citations}
       │
       ├──→ security_review (pure)        ──→ SecurityGrounding     {citations, coverage_percent, invalid_citations, coverage_discrepancies}
       │
       ├──→ architect_expert_review (LLM) ──→ ArchitectExpertReview {SCORE, SEVERITY, COVERED, MISSING, CHANGES} per NCMS ARCHITECT_REVIEW_PROMPT
       │
       └──→ security_expert_review (LLM)  ──→ SecurityExpertReview  {SCORE, SEVERITY, COVERED, MISSING, CHANGES} per NCMS SECURITY_REVIEW_PROMPT
                                                       │
                                                       ▼
                                              verify_grounding (pure)
                                                       │
                                                       ▼
                                              4-way decision: PASS / ITERATE / EXHAUSTED / FAILED
```

The LLM expert review packs adopt the NCMS `SCORE` / `SEVERITY` / `COVERED` / `MISSING` / `CHANGES` format verbatim (`output-format: structured-review`):

- **SCORE** — 0-100 (numeric, no other text)
- **SEVERITY** — Critical / High / Medium / Low (categorical)
- **COVERED** — bulleted list of governance items addressed by the PRD with citations
- **MISSING** — bulleted list of governance items NOT addressed (each with the specific ADR / THR / control that called it out)
- **CHANGES** — numbered list of concrete edits the next iteration should make

The runner parses these via a small regex (the same way NCMS does) and feeds them into the `verify_grounding` decision and the next iteration's `GapFeedback`.

### `verify_grounding` now reads both deterministic AND LLM signals

The publish gate is more nuanced with both signals available:

```typescript
verify_grounding(arch_pure, arch_llm, sec_pure, sec_llm, iteration, brief): LoopDecision = {
  const threshold = brief.grounding_threshold ?? 0.85;

  // Deterministic floor: coverage_percent from citation parsing
  const archPureScore = arch_pure.coverage_percent / 100;
  const secPureScore  = sec_pure.coverage_percent  / 100;

  // LLM ceiling: SCORE from expert review (normalised)
  const archLlmScore = arch_llm.score / 100;
  const secLlmScore  = sec_llm.score  / 100;

  // PASS requires BOTH signals to clear the threshold per dimension.
  // Rationale: deterministic says "all required citations are present" (citation completeness);
  // LLM says "the cited content actually addresses the concern" (citation quality).
  // Both must pass — citation-present-but-shallow shouldn't ship.
  const archPass = archPureScore >= threshold && archLlmScore >= threshold;
  const secPass  = secPureScore  >= threshold && secLlmScore  >= threshold;

  // Disagreement detection — if pure says 95% but LLM says 60%, something is off
  const archDisagreement = Math.abs(archPureScore - archLlmScore) > 0.2;
  const secDisagreement  = Math.abs(secPureScore  - secLlmScore)  > 0.2;

  // If both pass: PASS
  // If disagreement >0.2: always ITERATE (regardless of which side is higher)
  // If budget remaining and gaps differ from previous: ITERATE
  // Otherwise: EXHAUSTED / FAILED per mode
  …
}
```

Both signals get captured in the audit per iteration:

```json
{
  "node": "verify_grounding",
  "event": "iteration_summary",
  "iteration": 2,
  "scores": {
    "architecture_pure":  0.92,
    "architecture_llm":   0.75,
    "security_pure":      0.85,
    "security_llm":       0.78,
    "architecture_disagreement": 0.17,
    "security_disagreement":     0.07
  },
  "decision": { "kind": "ITERATE", "next_iteration": 3, "reason": "architecture_llm < threshold (0.75 < 0.85)" }
}
```

The auditor sees both — the citation-completeness numbers and the LLM-judgment numbers — and the disagreement signal. *"Iteration 2 had all required CALM citations (92%) but the LLM judged the architectural reasoning as only 75% — the PRD cited ADR-0012 but didn't actually engage with the constraint it imposes."* That's the kind of finding the LLM catches and citation parsing cannot.

The audit.md score progression table now has 4 columns instead of 2:

```
| Iter | Arch (pure) | Arch (LLM) | Sec (pure) | Sec (LLM) | Decision |
|---:|---:|---:|---:|---:|---|
| 1  | 75% | 60% | 60% | 55% | ITERATE |
| 2  | 92% | 75% | 85% | 78% | ITERATE (arch_llm gap) |
| 3  | 95% | 91% | 91% | 90% | PASS |
```

`verify_and_trigger` has the same semantics as the Archeologist's final node: re-fetch the PR, confirm PRD doc + manifest + audit JSONL all present, verify the Hatter's Tag `output_hash` matches the committed doc, emit `run_complete`, write the trigger-contract comment. The downstream is the Cheshire RCTRO issue generator in the target code repo, not another agent run.

---

## Output document formats

### Research doc — `research/<topic>-<date>.md`

```markdown
---
type: research
research_id: RES-2026-05-17-abc123
agent: archeologist
path: research              # or "archaeology"
topic: "Agentic SDLC adoption in healthcare"
project_id: PRJ-IMDB-RESEARCH-014
brief: |
  Original plain-English brief here.
audit_log: .research-audit/RES-2026-05-17-abc123.jsonl
hatters_tag: (embedded below)
---

# Agentic SDLC adoption in healthcare

## Executive summary
(LLM-synthesized, 200 words max)

## Findings
### Finding 1: <claim>
(Evidence + citations to ranked sources by index)

### Finding 2: <claim>
…

## Sources
1. <Title> — <URL> — retrieved 2026-05-17T15:23:47Z — relevance 0.92
2. …

## Methodology
- Query plan executed: 12 web, 8 arxiv, 4 uspto, 6 hn (see audit log for queries)
- Sources retained after dedupe: 47 of 184 raw results
- Synthesis pack: research/synthesis@v1.0.0

## Hatter's Tag
(YAML block, see schema below)
```

### PRD doc — `research/prd-<topic>-<date>.md`

```markdown
---
type: prd
prd_id: PRD-2026-05-17-def456
agent: prd
derived_from: RES-2026-05-17-abc123    # links back to research doc
project_id: PRJ-IMDB-RESEARCH-014
audit_log: .research-audit/PRD-2026-05-17-def456.jsonl
manifest: research/prd-<topic>-<date>.manifest.json
hatters_tag: (embedded below)
---

# PRD: <feature name>

## Problem statement
## Goals (success metrics)
## Non-goals
## Personas affected
## Functional requirements
## Non-functional requirements
  ### Security (OWASP categories + STRIDE threats)
  ### Performance (p95 budgets)
  ### Accessibility
## Acceptance criteria
## Risk matrix
## Rollout plan
## Open questions
## Sources (inherited from research)

## Hatter's Tag
```

Sidecar JSON manifest (`research/prd-<topic>-<date>.manifest.json`) extracts the structured fields so downstream tooling (the Cheshire RCTRO issue generator) can consume them without reparsing markdown.

---

## Audit schema — per-node JSONL events

One file per run at `.research-audit/<run_id>.jsonl`. One JSON object per line. Every node emits exactly two events: `node_start` and `node_complete` (or `node_error`).

### Common envelope

```json
{
  "schema_version": "1.0",
  "run_id": "RES-2026-05-17-abc123",
  "agent": "archeologist",
  "agent_version": "1.0.0",
  "node": "tavily_search",
  "node_kind": "pure_api",
  "event": "node_complete",
  "timestamp": "2026-05-17T15:23:47.123Z",
  "duration_ms": 1234,
  "next_node": "arxiv_search"
}
```

### `node_kind: pure_api` event

```json
{
  "schema_version": "1.0",
  "run_id": "RES-2026-05-17-abc123",
  "agent": "archeologist",
  "node": "tavily_search",
  "node_kind": "pure_api",
  "event": "node_complete",
  "timestamp": "2026-05-17T15:23:47.123Z",
  "duration_ms": 1234,
  "api": {
    "provider": "tavily",
    "endpoint": "https://api.tavily.com/search",
    "request_fingerprint": "sha256:<hash of normalized request>",
    "queries_executed": 12,
    "results_returned": 187,
    "results_retained": 47,
    "rate_limit_remaining": 4988
  },
  "top_results": [
    { "title": "...", "url": "https://...", "retrieved_at": "2026-05-17T15:23:46.890Z", "score": 0.92 }
  ],
  "next_node": "arxiv_search"
}
```

### `node_kind: llm` event

```json
{
  "schema_version": "1.0",
  "run_id": "RES-2026-05-17-abc123",
  "agent": "archeologist",
  "node": "synthesize",
  "node_kind": "llm",
  "event": "node_complete",
  "timestamp": "2026-05-17T15:42:11.456Z",
  "duration_ms": 45678,
  "llm": {
    "provider": "anthropic",
    "model": "claude-opus-4-7-20260501",
    "prompt_pack": ".caterpillar/prompts/research/synthesis.md@v1.0.0",
    "prompt_fingerprint": "sha256:<hash of fully-rendered prompt>",
    "input_tokens": 12345,
    "output_tokens": 3210,
    "stop_reason": "end_turn"
  },
  "output_summary": {
    "schema_valid": true,
    "section_count": 7,
    "citation_count": 23
  },
  "next_node": "publish"
}
```

### `node_kind: pure` event (no external call)

```json
{
  "schema_version": "1.0",
  "run_id": "RES-2026-05-17-abc123",
  "agent": "archeologist",
  "node": "dedupe_and_rank",
  "node_kind": "pure",
  "event": "node_complete",
  "timestamp": "2026-05-17T15:40:02.123Z",
  "duration_ms": 87,
  "input_summary": { "total_results": 187 },
  "output_summary": { "retained": 47, "deduplicated": 124, "low_score_dropped": 16 },
  "next_node": "synthesize"
}
```

### `node_error` event

Same envelope, with an `error` block:

```json
{
  "event": "node_error",
  "error": {
    "type": "RateLimitExceeded",
    "message": "Tavily API returned 429. Backing off 60s, will retry.",
    "retryable": true,
    "attempt": 1,
    "next_attempt_at": "2026-05-17T15:24:47.000Z"
  }
}
```

### `run_complete` event (emitted only by `verify_and_trigger`)

The final event in every run's JSONL. Downstream consumers (post-merge workflows, audit dashboards, future Foundry pipelines) watch for this specific event to know the run finished — its presence is the signal, its absence after a reasonable timeout means the run failed mid-flight.

```json
{
  "schema_version": "1.0",
  "run_id": "RES-2026-05-17-abc123",
  "agent": "archeologist",
  "agent_version": "1.0.0",
  "node": "verify_and_trigger",
  "node_kind": "pure",
  "event": "run_complete",
  "timestamp": "2026-05-17T16:01:48.211Z",
  "outcome": "success",
  "duration_total_ms": 1834567,
  "node_count": 10,
  "node_errors": 0,
  "publish_verification": {
    "pr_url": "https://github.com/AliceNN-ucdenver/celeb-api/pull/4187",
    "pr_number": 4187,
    "branch": "research/RES-2026-05-17-abc123",
    "committed_paths": [
      "research/agentic-sdlc-healthcare-2026-05.md",
      ".research-audit/RES-2026-05-17-abc123.jsonl"
    ],
    "hatters_tag_output_hash_match": true,
    "audit_log_event_count": 22
  },
  "downstream_contract": {
    "trigger_kind": "label-on-merge",
    "label": "prd-ready",
    "target_issue": 4180,
    "downstream_agent": "prd",
    "opt_out_label": "no-auto-prd"
  }
}
```

For an `outcome: 'partial'` (publish succeeded but verification found a mismatch), the `publish_verification` block names exactly what failed (e.g. `hatters_tag_output_hash_match: false`) and the `downstream_contract` is replaced with `downstream_contract: null` plus a `downstream_blocked_reason` string. Downstream agents *must not* fire on partial outcomes.

---

## Guardrails — pre-call and post-call checks on every LLM hop

Every LLM call in both agents passes through a guardrail layer. The layer runs before the call (validates the prompt that's about to be sent) and after the call (validates the response that came back). Each check is a **pure TypeScript function** with no external service dependency, so the whole layer runs comfortably inside a GitHub Actions job in <100ms per LLM hop.

NCMS already does a lighter version of this (the archeologist's guardrail step that triggers a human-approval workflow on violation). We adopt the same shape, expand the catalogue of checks, and wire every check's result into the audit chain so the auditor sees what was checked, what passed, what blocked, and what was waved through with a warning.

### What the layer wraps

Guardrails wrap any node that **crosses a trust boundary** — that is, any node where data is sent to or received from outside the runner's own process:

| Node type | Wrapped with | Notes |
|---|---|---|
| LLM nodes (`plan_queries`, `gap_analysis`, `synthesize_*`, `ask_experts_*`, `*_expert_review`) | input + output guardrails | Most coverage; LLMs are the most likely place for prompt injection, PII leakage, hallucinated citations |
| Pure API nodes (`tavily_search`, `arxiv_search`, `uspto_search`, `hackernews_search`) | input + output guardrails (lighter) | Queries get a PII / secret pre-check (don't search your DB credentials by accident); results get a secret / PII post-check (don't ingest leaked secrets from search results) |
| Pure compute nodes (`validate_brief`, `gather_mesh_context`, `dedupe_and_rank`, `analyze_architecture`, etc.) | none | No external data flow; Zod schemas already enforce shape |

### The check catalogue (v1)

All checks are self-contained TypeScript. No external moderation APIs in v1 (Phase 9 / v2 can add OpenAI Moderation, AWS Comprehend, Microsoft Purview, Presidio for ML-based PII — but v1 must run on a stock GitHub runner with no secrets beyond the LLM provider key).

**Input guardrails (run before LLM/API call):**

| ID | Category | Severity | What it checks |
|---|---|---|---|
| `prompt-injection-detection` | safety | block | Regex catalogue of known injection patterns in user-supplied content: *"ignore previous instructions"*, *"you are now"*, role-switching attempts, jailbreak markers, hidden Unicode (zero-width chars, tag chars). Patterns versioned with the runner. |
| `pii-detection` | safety | block (strict) / warn (default) | Regex for emails, phone numbers, SSNs, credit-card numbers (Luhn-validated), IPs, custom org patterns. Findings are evidence-redacted before logging (we log "email at position 142" not the email itself). |
| `secrets-detection` | safety | block | Regex for common secret patterns shared with Snyk: `AKIA*`, `ghp_*`, `sk-*`, `xoxb-*`, JWT `eyJ*`, RSA private key headers, etc. Same catalogue used by the code-repo secrets scanner so org rules stay consistent. |
| `token-budget` | budget | block | Reject the call if `current_run_cumulative_tokens + estimated_prompt_tokens > brief.max_total_tokens` |
| `provider-allowlist` | policy | block | Verify `--llm-provider` is in the org's configured allowlist (e.g., `[anthropic, azure-openai]` for an org that doesn't allow public OpenAI) |
| `prompt-pack-version-pin` | policy | warn | If the loaded pack version differs from the version pinned in `.caterpillar/prompt-library.yaml`, warn (catches drift mid-run) |
| `mesh-sha-pin` | policy | warn | If mesh SHA changed mid-run, warn (rare, but possible if mesh was being updated in parallel) |

**Output guardrails (run after LLM/API call):**

| ID | Category | Severity | What it checks |
|---|---|---|---|
| `schema-validity` | quality | block | Zod-parses the response against the pack's declared output schema. Existing retry-once-then-fail logic; only listed here so it's catalogued. |
| `pii-leakage` | safety | block (strict) / warn (default) | Same PII detector pointed at the LLM's response. Catches PII the LLM echoed from its training data or from input context. |
| `secrets-leakage` | safety | block | Same secrets detector pointed at the response. Catches the model accidentally regurgitating a secret it saw in input. |
| `id-hallucination` | quality | warn | Parse all cited IDs (THR-NNN, ADR-NNNN, A0X, NIST-XX-NN, S[N], R[N]) and verify each exists in MeshContext / OWASP catalog / research source list. Cited-but-missing IDs become a warning that feeds the next iteration's GapFeedback. Detailed reporting already lives in `SecurityGrounding.invalid_citations` and `ArchitectureGrounding.invalid_citations`; the guardrail makes this a first-class block point if desired. |
| `citation-completeness` | quality | warn | Required structural elements present: synthesis has ≥3 entries in Sources, PRD has Coverage Analysis section, ask_experts output has ≥1 numbered question. |
| `length-sanity` | quality | warn | Response not truncated mid-token (stop_reason !== `max_tokens`); not unreasonably short (< 200 chars on a synthesis call indicates the LLM bailed). |
| `format-compliance` | quality | block | Markdown is well-formed (balanced code fences, no broken tables). JSON is parseable. Fast structural check before deeper schema validation. |
| `harmful-content` | safety | block (strict) / warn (default) | Simple keyword/category check for v1 (a curated list of high-risk topics shipped with the runner). Not full content moderation; that's v2 with an external API. |

### Decision logic

Per LLM hop:

```typescript
function evaluateGuardrails(report: GuardrailReport): 'PASS' | 'WARN' | 'BLOCK' {
  if (report.checks.some(c => c.result === 'fail' && c.severity === 'block')) {
    return 'BLOCK';
  }
  if (report.checks.some(c => c.result === 'fail' && c.severity === 'warn')) {
    return 'WARN';
  }
  return 'PASS';
}
```

**BLOCK** → the LLM call is not made (input guardrail) or the response is rejected (output guardrail). The node emits a `node_error` with `error.type: 'GuardrailBlock'` and the run terminates. The audit captures everything up to the blocking event.

**WARN** → the call proceeds, the warning is recorded in the audit, and (for PRDs) the warning is folded into the next iteration's `GapFeedback` so the LLM has a chance to address it on the next pass.

**PASS** → call proceeds silently with a `guardrail_check` audit event recording all checks that ran.

### Workflow flag — `--guardrails strict | default | lenient`

The runner accepts a guardrails mode flag, also settable per brief or per workflow:

| Mode | Behavior |
|---|---|
| `strict` | PII and harmful-content checks set to block severity. Suitable for regulated industries (healthcare, finance, government). |
| `default` | PII and harmful-content checks set to warn. Suitable for most internal corporate use. |
| `lenient` | All severity-warn checks become severity-info (recorded but never affect the run). Suitable for early exploration. Never recommended for sanctioned runs. |

The mode is captured in the Hatter's Tag so the auditor sees the policy that produced the artifact.

### Guardrail audit events

Per LLM hop, the audit JSONL emits one `guardrail_check` event before the LLM call (input phase) and one after (output phase):

```json
{
  "schema_version": "1.0",
  "run_id": "PRD-2026-05-17-def456",
  "agent": "prd",
  "node": "synthesize_prd",
  "node_kind": "llm",
  "event": "guardrail_check",
  "phase": "input",
  "iteration": 2,
  "timestamp": "2026-05-17T15:45:11.421Z",
  "duration_ms": 47,
  "mode": "default",
  "checks": [
    { "id": "prompt-injection-detection", "category": "safety", "severity": "block", "result": "pass", "duration_ms": 12 },
    { "id": "pii-detection", "category": "safety", "severity": "warn", "result": "fail", "evidence": { "kind": "email", "count": 1, "location": "input_context.mesh.adrs[3]:line_42" }, "duration_ms": 18 },
    { "id": "secrets-detection", "category": "safety", "severity": "block", "result": "pass", "duration_ms": 8 },
    { "id": "token-budget", "category": "budget", "severity": "block", "result": "pass", "evidence": { "cumulative_tokens": 18420, "budget": 200000 }, "duration_ms": 1 },
    { "id": "provider-allowlist", "category": "policy", "severity": "block", "result": "pass", "duration_ms": 1 },
    { "id": "prompt-pack-version-pin", "category": "policy", "severity": "warn", "result": "pass", "duration_ms": 4 }
  ],
  "decision": "WARN",
  "warn_reasons": ["pii-detection: email found in mesh ADR-0014 — proceeding (default mode) but flagging in iteration feedback"],
  "next_node": "synthesize_prd:llm_call"
}
```

The PII detection result shows what we DO log: position + kind + count, never the value. The evidence is enough for an auditor to investigate but doesn't propagate the secret/PII through the audit chain.

### Audit.md — "Guardrail summary" section

The audit.md gets a new section summarising guardrail activity across the entire run:

```markdown
## Guardrail Summary

Guardrail mode for this run: **default**

Summary across all LLM hops:

| Hop | Node | Iteration | Phase  | Decision | Checks run | Warnings | Blocks |
|---:|---|---:|---|---|---:|---:|---:|
| 1 | plan_queries          | —  | input  | PASS  | 6 | 0 | 0 |
| 2 | plan_queries          | —  | output | PASS  | 7 | 0 | 0 |
| 3 | synthesize_report     | —  | input  | WARN  | 6 | 1 | 0 |
| 4 | synthesize_report     | —  | output | PASS  | 7 | 0 | 0 |
| 5 | ask_experts_architect | —  | input  | PASS  | 6 | 0 | 0 |
| 6 | ask_experts_architect | —  | output | PASS  | 7 | 0 | 0 |
| 7 | ask_experts_security  | —  | input  | PASS  | 6 | 0 | 0 |
| 8 | ask_experts_security  | —  | output | PASS  | 7 | 0 | 0 |
| 9 | synthesize_prd        | 1  | input  | WARN  | 6 | 1 | 0 |
| 10| synthesize_prd        | 1  | output | WARN  | 7 | 2 | 0 |
| 11| synthesize_prd        | 2  | input  | WARN  | 6 | 2 | 0 |
| …                                                                |

### Warning details

- Hop 3 input — `pii-detection`: 1 email found in mesh ADR-0014 (line 42). Proceeded (default mode). Flagged in iteration feedback for iteration 1.
- Hop 9 input — `pii-detection`: same email recurred (mesh content). No new flag.
- Hop 10 output — `id-hallucination`: PRD iteration 1 cited THR-099 (no such entry in `bar.threats.yaml`); cited ADR-9999 (no such ADR). Folded into GapFeedback for iteration 2.
- Hop 11 input — `pii-detection`: same PII; `prompt-pack-version-pin`: pack `prd/synthesis@v1.0.0` differs from library-pinned v1.0.0 (no actual drift — false positive flagged for follow-up).

### Blocks

No blocking guardrails fired on this run.
```

A reviewer reading audit.md sees, at a glance: total checks, total warnings, total blocks, the full warning detail with redacted evidence. A failed run shows the same table truncated at the blocking event and a prominent `Blocks` section explaining what stopped it.

### Workflow flag interaction with the iteration loop

The cyclic PRD loop and the guardrail layer interact cleanly:
- Input guardrails run **before each iteration's LLM call**, including iteration 2+. A guardrail block at iteration 2 stops the loop entirely (outcome `blocked`, not `failed` or `exhausted`).
- Output guardrails run **after each iteration's LLM response**. Warnings get folded into the next iteration's `GapFeedback`. Blocks stop the loop.
- The `iteration_summary` event now also surfaces the iteration's guardrail decision so the auditor sees the score progression *and* the guardrail trajectory side-by-side.

### CLI subcommand for re-verification

The runner ships `research-runner check-guardrails <run_id>` that re-runs every guardrail against the existing audit log. Use cases:
- **CI fitness function** — every audit-bearing PR runs `check-guardrails` to confirm the recorded results are reproducible
- **Post-incident replay** — re-run with an updated catalogue (e.g., a new PII pattern added) to see if any historical run would have been blocked
- **Reviewer verification** — manually confirm a run wasn't tampered with at the guardrail layer

Idempotent and side-effect-free; safe to call from any GitHub workflow.

---

## Audit artifacts per run — what an auditor sees

Every research or PRD run publishes **four files**, three of them next to the deliverable:

```
platforms/imdb-lite/bars/APP-IMDB-002/research/
  celebrity-following-2026-05.md            ← the deliverable (markdown report)
  celebrity-following-2026-05.audit.md      ← human-readable auditor view (NEW)
  celebrity-following-2026-05.audit.json    ← structured machine-readable summary (NEW)

.research-audit/
  RES-2026-05-17-abc123.jsonl               ← raw per-node events (existing; mesh-rooted)
```

The three new audit artifacts are **deterministically generated** from the raw JSONL at the end of every run, in the `verify_and_trigger` node. They are committed as part of the same PR as the deliverable. Each one targets a different consumer.

### `<topic>.audit.md` — the auditor's view

A sectioned, human-readable Markdown report. An SOC 2, ISO 27001, ISO/IEC 42001, or EU AI Act Article 12 reviewer reads this and has every question answered without needing to `jq` the JSONL or click through a UI. Sections:

```markdown
# Audit Report — RES-2026-05-17-abc123

## Run Summary
- run_id, agent, scope (BAR/Platform/Portfolio), triggered_by, started, completed, outcome
- mesh_sha (at start), output_hash, audit_log_hash, hash_chain_root

## Mesh Context (what the agent read)
- mesh_sha
- Every file path read from the mesh, listed
- BAR pillar scores at run-time
- BAR tier
- mesh_gaps detected — and which of them informed downstream queries / questions

## Topics Queried — Web (Tavily)
1. "<query>" → N raw results, M retained, top URLs with retrieval timestamps and scores
2. … (full list)

## Topics Queried — Academic (arXiv)
## Topics Queried — Patents (USPTO)
## Topics Queried — Discussions (Hacker News)

## LLM Invocations
Per LLM node (plan_queries, ask_experts, synthesize_*):
- Provider, model, model_version_date
- Prompt pack file + version + fingerprint (sha256)
- Input tokens, output tokens, stop reason
- Schema validation: passed | retried | failed
- Cost estimate

## Mesh Artifacts Cited in Synthesis
- CALM nodes referenced
- STRIDE entries addressed
- OWASP categories covered
- NIST controls referenced
- ADRs referenced
- Prior research / PRDs referenced (with their run_ids)

## Hash Chain (tamper-evident)
| # | Node | Event hash | Prev hash | Timestamp |
|---|---|---|---|---|
| 1 | validate_brief | sha256:f3a1… | (root) | 15:23:35.421Z |
| 2 | gather_mesh_context | sha256:b8e9… | sha256:f3a1… | 15:23:36.123Z |
| …

The chain is Merkle-like: each event_hash includes the previous event_hash in its
preimage. Mutating any event invalidates every subsequent hash. Re-run
`research-runner verify-audit <run_id>` to confirm integrity.

## Reviewer
- @<handle> approved at <timestamp>
- (Phase 9) Court Recorder signature: <sig>

## How to verify this report yourself
1. `gh pr view <pr_url> --json files` → confirm `.audit.md`, `.audit.json`, deliverable
2. `sha256sum <deliverable>` → matches output_hash
3. `npx research-runner verify-audit <run_id>` → recomputes hash chain end-to-end
4. `jq < .research-audit/<run_id>.jsonl` → raw events for deep inspection
```

The audit.md is **derived**, not authored. It is a pure projection of the JSONL events through a Handlebars-like template. The template ships with the runner package and is itself versioned (`audit-report-template@v1.0.0` carried in the Hatter's Tag).

### `<topic>.audit.json` — the machine-readable summary

The same data as audit.md but in JSON, so:
- Compliance dashboards can ingest it without re-parsing markdown
- The Looking Glass scorer can read research/PRD freshness, gap counts, and reviewer info directly
- Cross-document queries are trivial (`jq` across many audit.json files in a directory)
- Future AI Foundry deployment can mirror it into the Foundry audit store unchanged

Schema is `AuditReport` (a Zod schema in the runner). Includes the hash chain as a flat array of `{ index, node, event_hash, prev_hash, timestamp }` records — same data, different presentation.

### `.research-audit/<run_id>.jsonl` — raw events (existing)

The full per-node event stream. The other three artifacts are derivable from this; this is the source of truth. Lives at mesh root for grep-ability across all runs.

### Hash chain semantics

Every event written to the JSONL includes:

```json
{
  "schema_version": "1.0",
  "run_id": "RES-2026-05-17-abc123",
  "event_index": 7,
  "prev_event_hash": "sha256:9e107d9d…",      // hash of event_index 6, or "root" for index 0
  "event_hash": "sha256:b8e9c4d2…",            // sha256 of the canonical JSON of this event (excluding event_hash itself)
  …rest of event
}
```

The `event_hash` is computed as `sha256(canonical_json(event_without_event_hash) + prev_event_hash)`. This forms a chain: any tampering with event N invalidates the `prev_event_hash` of event N+1 (and so on down the chain). The final event's `event_hash` becomes the run's `audit_log_hash` and is published in the Hatter's Tag.

For v1 this is a tamper-evident chain (anyone with the JSONL can verify). For Phase 9 (per the [Red Queen roadmap](/docs/impossible-things)), the Court Recorder signs the chain root with the org's audit key, producing cryptographic non-repudiation.

The runner ships a `research-runner verify-audit <run_id>` subcommand that:
1. Loads the JSONL
2. Recomputes the chain
3. Confirms `audit_log_hash` matches what's in the published Hatter's Tag
4. Confirms `output_hash` matches sha256 of the committed deliverable
5. Returns `OK` or `TAMPERED at event #N` with details

Reviewers can run this against any PR; CI can run it as a fitness function on every audit-bearing PR.

---

## Mesh-grounded review nodes (PRD's "Oraculum at PRD time")

Oraculum reviews **code** against the CALM model and surfaces drift findings. The PRD agent needs an analogous deterministic check at PRD time: does the proposed feature ground every requirement in mesh artifacts (CALM, STRIDE, OWASP, NIST controls), or does it propose ungrounded work?

This adds two new **pure** nodes between `generate_manifest` and `publish_prd`:

### Updated PRD pipeline (cyclic graph with parallel review fan-out)

| # | Node | Kind | Input | Output | Loop role |
|---|---|---|---|---|---|
| 1 | `validate_brief` | pure | raw brief | `PrdBrief` (with `grounding_threshold`, `max_iterations`, `grounding_mode`, `depth`) | — |
| 2 | `gather_mesh_context` | pure | scope | `MeshContext` | — |
| 3 | `resolve_research` | pure | research_id | research doc + frontmatter | — |
| 4a | `ask_experts_architect` | LLM (optional, `deep` mode) | brief + MeshContext (architecture slice) | architect advice (E[N] entries with ADR/CALM citations) | — |
| 4b | `ask_experts_security` | LLM (optional, `deep` mode, parallel with 4a) | brief + MeshContext (security slice) | security advice (E[N] entries with THR/A0X/NIST citations) | — |
| 5 | `synthesize_prd` | **LLM** | brief + research + MeshContext + architect advice + security advice + (on iter > 1: previous PRD + GapFeedback) | `PrdDoc` | **loop target** |
| 6 | `generate_manifest` | pure | PRD markdown | `PrdManifest` (preliminary) | — |
| 7a | `architecture_review` | pure | PrdManifest + MeshContext | `ArchitectureGrounding` (citations, coverage, invalid_citations) | — |
| 7b | `security_review` | pure | PrdManifest + MeshContext + OWASP catalog | `SecurityGrounding` (citations, coverage, invalid_citations, coverage_discrepancies) | — |
| 7c | `architect_expert_review` | LLM (parallel with 7a/7b/7d) | PrdManifest + MeshContext (architecture slice) | `ArchitectExpertReview` (SCORE, SEVERITY, COVERED, MISSING, CHANGES) | — |
| 7d | `security_expert_review` | LLM (parallel with 7a/7b/7c) | PrdManifest + MeshContext (security slice) + OWASP catalog | `SecurityExpertReview` (SCORE, SEVERITY, COVERED, MISSING, CHANGES) | — |
| 8 | `verify_grounding` | pure | all 4 review outputs + iteration + brief | `LoopDecision: PASS \| ITERATE \| EXHAUSTED \| FAILED` | **loop branch** |
| 9 | `publish_prd` | pure | final doc + final manifest (with `grounding:` block) + 4 audit reports | PR url | — |
| 10 | `verify_and_trigger` | pure | publish result | `RunOutcome` | — |

Three parallel fan-outs reduce wall-clock time without sacrificing fidelity:
- Nodes **4a + 4b** run in parallel (both expert advice calls fire concurrently in `deep` mode)
- Nodes **7a + 7b + 7c + 7d** run in parallel (two deterministic reviewers + two LLM expert reviewers)

The cyclic edge: when `verify_grounding` returns `ITERATE`, control returns to `synthesize_prd` with the previous PRD + structured `GapFeedback` (which combines findings from all four reviewers). Each iteration emits its own per-node events tagged with `iteration: N`. Per the convergence guards, the loop terminates on PASS (publish), EXHAUSTED (publish with partial), or FAILED (end without publish in strict mode).

### New packs added to the canonical library (PRD side)

**`prd/ask-experts-architect.md`** — `output-format: structured-review`. Adopts NCMS `ARCHITECT_KNOWLEDGE_PROMPT` verbatim. Required fields per advice item: numbered `E[N]`, confidence rating (HIGH/MEDIUM/LOW), ADR-NNNN citations, CALM constraint references, quality attribute implications. Input variables: `{memory_context}` (the architecture slice of MeshContext), `{input}` (the brief topic).

**`prd/ask-experts-security.md`** — same format. Adopts NCMS `SECURITY_KNOWLEDGE_PROMPT`. Required fields: `E[N]`, confidence, THR-NNN citations, OWASP A0X references, NIST control references, risk level, specific mitigations.

**`prd/architect-expert-review.md`** — `output-format: structured-review`. Adopts NCMS `ARCHITECT_REVIEW_PROMPT`. Required sections in output (verbatim NCMS naming): `CALM Model Compliance`, `ADR Compliance`, `Fitness Function Validation`, `Quality Attribute Verification`, `Component Boundary Analysis`. Required fields: `SCORE` (0-100), `SEVERITY` (Critical/High/Medium/Low), `COVERED` (bullets), `MISSING` (bullets), `CHANGES` (numbered list).

**`prd/security-expert-review.md`** — same format. Adopts NCMS `SECURITY_REVIEW_PROMPT`. Required sections: `OWASP Top 10 Pattern Detection`, `STRIDE Threat Model Compliance`, `Security Controls Verification`, `Secrets Management`, `Transport Security`, `Dependency Security`. Same `SCORE` / `SEVERITY` / `COVERED` / `MISSING` / `CHANGES` field set.

### `architecture_review` — does the PRD respect the CALM model?

Deterministic check. Reads the PRD manifest's structured fields (`endpoints[]`, `internal_calls[]`, `data_dependencies[]`) and compares against `MeshContext.bar.calm_model` and `MeshContext.platform.architecture`.

Produces `ArchitectureGrounding`:

```typescript
ArchitectureGrounding = {
  calm_nodes_referenced: string[]
  new_flows_proposed: Array<{ from: string; to: string; reason: string }>
  flows_in_calm: Array<{ from: string; to: string; relationship_id: string }>
  undeclared_flows: Array<{ from: string; to: string; suggested_action: string }>   // flows the PRD needs but CALM doesn't declare
  layer_crossings: Array<{ from_layer: string; to_layer: string; violation: boolean }>
  coverage_percent: number   // (declared + new-but-justified) / total proposed
  status: 'aligned' | 'drift' | 'gap'
}
```

Example findings the node will surface:
- *"PRD proposes `imdb-react-frontend → celeb-db` direct call. NOT in CALM (no relationship from frontend layer to data layer). Suggested action: route through celeb-api OR file ADR justifying new flow."*
- *"PRD proposes 3 new endpoints on celeb-api. All 3 fit the existing `celeb-api → celeb-db` flow; no CALM change needed."*

### `security_review` — does the PRD address every relevant threat / OWASP / control?

Deterministic check. Reads the PRD manifest's `security_requirements[]` and compares against:
- `MeshContext.bar.threats` — every STRIDE entry that applies to the endpoints/flows this PRD touches
- The OWASP Top 10 catalog (shipped with runner, versioned) — every category any of the PRD's endpoints obviously touches (auth → A07, user input → A03, etc.)
- Portfolio NIST controls — every control that applies to the BAR's classification

Produces `SecurityGrounding`:

```typescript
SecurityGrounding = {
  stride_entries_applicable: string[]         // from bar.threats.yaml, scoped to this PRD's surface
  stride_entries_addressed: string[]          // PRD has a requirement citing each (grep'd from PRD body)
  stride_entries_missing: string[]            // applicable but not cited
  owasp_categories_applicable: string[]       // derived from endpoint shapes (e.g., auth touches → A07)
  owasp_categories_covered: string[]
  owasp_categories_missing: string[]
  nist_controls_referenced: string[]
  nist_controls_required_but_missing: string[]
  owasp_catalog_version: string               // e.g., "2026-04" (audit-friendly)

  // Caught by ID-based citation parsing — possible because of the prompt format's
  // mandatory THR-NNN / A0X / NIST-XX-NN ID schemes. The LLM cited an ID that
  // doesn't exist in any real source. These are the "hallucinated citation"
  // failures the prompt format design surfaces deterministically.
  invalid_citations: Array<{
    cited_id: string                          // e.g., "THR-099"
    cited_in_requirement: string              // e.g., "FR-04"
    reason: 'unknown_stride_id' | 'unknown_owasp_category' | 'unknown_nist_control'
  }>

  // Coverage self-report vs actual: the LLM is required by the prompt to write
  // a "Coverage Analysis" section listing every premise with YES/PARTIAL/NO.
  // We cross-check that self-report against the grep'd citations.
  coverage_discrepancies: Array<{
    premise: string                           // e.g., "R7"
    self_reported: 'YES' | 'PARTIAL' | 'NO'
    grep_evidence: 'cited' | 'not_cited'
    discrepancy: 'self_reported_yes_but_not_cited' | 'cited_but_self_reported_no'
  }>

  coverage_percent: number
  status: 'complete' | 'partial' | 'gap'
}
```

`invalid_citations` and `coverage_discrepancies` are the two checks that **only work because of the prompt format**. Without the mandatory ID schemes (THR-NNN, A0X, FR-NN) and the required Coverage Analysis section, neither field is computable. This is the architectural payoff for standardising the format up front: the deterministic reviewers find hallucinated citations and self-report discrepancies that prose parsing could never catch.

Example findings:
- *"PRD touches authentication (favorites need user identification). OWASP A07 (Authentication Failures) applies. No requirement in PRD addresses rate-limit / lockout / credential-stuffing. Status: missing."*
- *"PRD's STRIDE coverage: addressed S (spoofing via session check), T (tampering via signed cookies). Missing: R (repudiation — no audit log requirement specified for favorite/unfavorite actions). Suggested: add 'audit log of favorite/unfavorite actions including user_id and celebrity_id'."*

### `verify_grounding` — the publish gate with iterative refinement loop

The original NCMS LangGraph pattern had this as a true cyclic graph: synthesize → review → if score below threshold, feed gaps back to synthesize → re-review → repeat until the score crosses the bar or the iteration budget runs out. We adopt the same pattern. Without the loop, the LLM gets one shot at grounding; with the loop, the LLM gets to *earn* a passing score and the auditor sees the improvement trajectory.

`verify_grounding` makes one of four decisions based on the architecture + security grounding reports, the current iteration count, and the `PrdBrief.grounding_mode`:

```typescript
type LoopDecision =
  | { kind: 'PASS';      reason: 'both scores ≥ threshold' }
  | { kind: 'ITERATE';   feedback: GapFeedback; iteration: number }
  | { kind: 'EXHAUSTED'; final_scores: Scores; iteration_count: number }    // budget consumed
  | { kind: 'FAILED';    final_scores: Scores; reason: string }            // strict mode + gaps remain

verify_grounding(arch, sec, iteration, brief): LoopDecision = {
  const threshold = brief.grounding_threshold ?? 0.85;     // 85% default
  const maxIterations = brief.max_iterations ?? 3;          // 3 default, cap 5

  const archPass = arch.coverage_percent >= threshold * 100;
  const secPass  = sec.coverage_percent  >= threshold * 100;

  if (archPass && secPass) return { kind: 'PASS', ... };

  if (iteration < maxIterations) {
    // Convergence guard: if this iteration's gaps are identical to previous, bail (LLM is stuck)
    if (gapsMatchPrevious(arch, sec)) return { kind: 'EXHAUSTED', ..., reason: 'no improvement between iterations' };
    return { kind: 'ITERATE', feedback: composeFeedback(arch, sec), iteration: iteration + 1 };
  }

  // Budget exhausted
  if (brief.grounding_mode === 'strict') return { kind: 'FAILED', ... };
  return { kind: 'EXHAUSTED', ..., reason: `max iterations (${maxIterations}) reached` };
}
```

### The actual cyclic graph (PRD pipeline as a graph, not a list)

The PRD agent is now a true LangGraph-style graph with one cyclic edge:

```
validate_brief
     │
     ▼
gather_mesh_context
     │
     ▼
resolve_research
     │
     ▼
ask_experts (optional, deep mode)
     │
     ▼
┌──────────────────────────────┐
│ synthesize_prd (LLM)          │  ◄────────────────┐
│   iteration: 1 → 2 → 3        │                   │
└─────────────┬────────────────┘                   │
              ▼                                    │
generate_manifest                                  │
              ▼                                    │
architecture_review (pure) ──→ ArchitectureGrounding │
              ▼                                    │
security_review (pure)     ──→ SecurityGrounding   │
              ▼                                    │
       verify_grounding (pure)                     │
              │                                    │
      ┌───────┼────────┬───────────┐               │
      ▼       ▼        ▼           ▼               │
    PASS   ITERATE  EXHAUSTED   FAILED             │
      │       │        │           │               │
      │       └────────┼───────────┼───────────────┘  (feedback prompt)
      │                │           │
      ▼                ▼           ▼
   publish_prd     publish_prd    END (no PR; emit failed audit)
   (success)       (partial)
      │                │
      ▼                ▼
       verify_and_trigger
              │
              ▼
             END
```

The ITERATE edge is the cycle. EXHAUSTED still publishes (with `outcome: 'partial'` so downstream knows). FAILED ends the run without publishing.

### Feedback prompt — what the LLM gets on iteration 2+

`composeFeedback(arch, sec)` produces a structured supplement to the synthesis prompt. The runner builds it deterministically from the two grounding reports. The LLM receives:

```
You previously generated a PRD for: <brief.topic>.

Iteration 1 grounding results:
- Architecture coverage: 75% (threshold 85%) — status: drift
- Security coverage:     60% (threshold 85%) — status: gap

Gaps to address in this iteration:

ARCHITECTURE:
- Undeclared flow proposed: imdb-react-frontend → celeb-db
  Suggested action: route through celeb-api OR add an ADR justifying the new flow
- Layer crossing: imdb-react-frontend (presentation) → celeb-db (data)
  Skips: celeb-api (api layer)

SECURITY:
- STRIDE Repudiation applicable but not addressed: no audit log requirement for favorite/unfavorite actions
- OWASP A07 (Authentication Failures) applicable but not addressed:
  - No rate-limit requirement on favorites endpoints (DDoS / brute-force risk)
  - No account-lockout requirement
- OWASP A09 partially addressed: log scrubbing requirement missing celebrity name (PII concern)

Preserve from iteration 1:
- All endpoints and their signatures
- All functional requirements that were not flagged
- All non-functional requirements that were not flagged
- The success metrics

Regenerate the full PRD with each gap above addressed. If you choose between options
(e.g. route through celeb-api OR file an ADR), state your choice in the rationale section.
```

This is the difference between "fix it" and "fix THESE THINGS, preserve those things, document your choices." Mid-iteration LLM drift is the failure mode this prompt structure mitigates.

### Convergence guards

The loop has three safety nets so it doesn't run forever or burn budget:

1. **Max iterations.** Default `3`, configurable up to `5` via `brief.max_iterations`. Hard ceiling; can't be overridden by the LLM.
2. **No-improvement detection.** If iteration N's gap set equals iteration N-1's gap set (the LLM is stuck producing the same outputs), bail immediately with `EXHAUSTED` and reason `no improvement between iterations`. This catches the LLM-stuck failure mode that costs tokens without delivering.
3. **Token budget.** Optional `brief.max_total_tokens` (default 200K). If the cumulative tokens across iterations cross this, bail with `EXHAUSTED` and reason `token budget exhausted`. Costs are bounded.

### Audit — score progression per iteration

Every iteration emits its own per-node events with `iteration: N` in the envelope. The `verify_grounding` node emits an `iteration_summary` event:

```json
{
  "schema_version": "1.0",
  "run_id": "PRD-2026-05-17-def456",
  "agent": "prd",
  "node": "verify_grounding",
  "node_kind": "pure",
  "event": "iteration_summary",
  "timestamp": "2026-05-17T15:48:11.842Z",
  "iteration": 2,
  "max_iterations": 3,
  "grounding_threshold": 0.85,
  "scores": {
    "architecture_coverage": 0.92,
    "security_coverage":     0.71
  },
  "decision": {
    "kind": "ITERATE",
    "reason": "security coverage 0.71 < threshold 0.85",
    "next_iteration": 3
  },
  "improvement_from_previous": {
    "architecture_delta": +0.17,    // 0.75 → 0.92
    "security_delta":      +0.11,    // 0.60 → 0.71
    "gaps_resolved": ["arch:undeclared_flow:frontend→db", "sec:stride:R:no_audit_log"],
    "gaps_remaining": ["sec:owasp:A07:no_rate_limit", "sec:owasp:A09:pii_in_logs"]
  },
  "next_node": "synthesize_prd"     // loop back
}
```

`improvement_from_previous` is the killer audit signal: it shows the LLM **earned** each percentage point. The auditor's question *"why did we trust the published PRD?"* is answered by *"it converged from 75/60 to 95/91 over 3 iterations, resolving N gaps along the way; the trajectory is in the audit log."*

### Audit.md — score progression table

The `audit.md` human-readable artifact gets a new section:

```markdown
## Grounding score progression

The PRD agent iterated 3 times to reach the publish threshold (85%).
Each row records the deterministic review scores after that iteration's LLM synthesis.

| Iteration | Architecture | Security | Decision  | Gaps resolved this iteration                              |
|---:|---:|---:|---|---|
| 1  | 75% | 60% | ITERATE   | (initial pass)                                            |
| 2  | 92% | 71% | ITERATE   | undeclared frontend→db flow; STRIDE Repudiation audit log |
| 3  | 95% | 91% | PASS      | OWASP A07 rate-limit; OWASP A09 PII in logs               |

Final scores: Architecture 95%, Security 91%. Threshold: 85%. Budget used: 3 of 3 iterations.
Total LLM tokens across all iterations: 31,247.
```

A reviewer can see, at a glance, the *quality earning curve*. A failed/exhausted run shows the same table with the final row marked EXHAUSTED or FAILED and the unresolved gaps enumerated.

### Hatter's Tag — iteration block

The Hatter's Tag for PRDs now carries an iteration block alongside the grounding block:

```yaml
grounding:
  architecture: { coverage_percent: 95, status: aligned }
  security:     { coverage_percent: 91, status: complete }
  verify_grounding:
    status: complete
    mode:   default

iterations:
  count:               3
  budget:              3
  threshold:           0.85
  trajectory:
    - { n: 1, architecture: 0.75, security: 0.60, decision: ITERATE }
    - { n: 2, architecture: 0.92, security: 0.71, decision: ITERATE }
    - { n: 3, architecture: 0.95, security: 0.91, decision: PASS }
  total_tokens:        31247
  no_improvement_bail: false
```

### `PrdBrief` extensions

```typescript
// prd-brief.zod.ts
export const PrdBrief = z.object({
  // … existing fields …
  grounding_mode: z.enum(['strict', 'default', 'lenient']).default('default'),
  grounding_threshold: z.number().min(0.5).max(1.0).default(0.85),
  max_iterations: z.number().int().min(1).max(5).default(3),
  max_total_tokens: z.number().int().optional(),     // optional cost cap across all iterations
});
```

All four fields are captured in the Hatter's Tag, so the auditor confirms the policy that produced the PRD: *"this PRD was published under default mode at threshold 0.85 with a budget of 3 iterations; it converged on iteration 3 to scores 95/91."*

### Why not also loop the Archeologist?

We intentionally don't put research through this loop in v1. Three reasons:

1. **Research is exploratory.** A research deliverable's "gap" is itself a finding (*"we couldn't find recent industry data on X — recommend follow-up research"*). The LLM cannot improve the world's responses by trying again.
2. **The PRD consumes the research.** The PRD agent's grounding loop validates the *use* of research; pushing rigor to the consumer is more honest than pretending the input was perfect.
3. **Cost.** Research runs already make 4-5 LLM calls and dozens of API calls. Adding a 3x loop multiplier doubles the median cost for marginal quality gains on an exploratory artifact.

Reserved for v2 if a real team asks: an Archeologist *quality loop* that re-plans queries when source diversity is below threshold (e.g., "found 14 sources but 12 from the same domain — re-plan with broader queries"). This is a deterministic check on source distribution, not LLM-driven improvement.

### The PRD manifest's new `grounding:` field

`generate_manifest` (node 6) produces a preliminary manifest. `verify_grounding` (node 9) adds the `grounding:` block. Final manifest committed to the mesh:

```yaml
# platforms/imdb-lite/bars/APP-IMDB-002/prds/celebrity-following-2026-05.manifest.json
{
  "prd_id": "PRD-2026-05-17-def456",
  "derived_from": "RES-2026-05-17-abc123",
  "project_id": "PRJ-IMDB-RESEARCH-014",
  "endpoints": [ … ],
  "security_requirements": [ … ],
  "success_metrics": [ … ],
  "grounding": {
    "architecture": {
      "calm_nodes_referenced": ["celeb-api", "celeb-db", "identity-db"],
      "new_flows_proposed": [],
      "undeclared_flows": [],
      "coverage_percent": 100,
      "status": "aligned"
    },
    "security": {
      "stride_entries_addressed": ["S", "T"],
      "stride_entries_missing": ["R"],
      "owasp_categories_covered": ["A01", "A03", "A09"],
      "owasp_categories_missing": ["A07"],
      "nist_controls_referenced": ["SA-11", "SA-15"],
      "owasp_catalog_version": "2026-04",
      "coverage_percent": 71,
      "status": "partial"
    },
    "verify_grounding": {
      "status": "partial",
      "mode": "default",
      "reasons": [
        "Security: A07 applicable but no auth-failure requirements specified",
        "Security: STRIDE Repudiation applicable but no audit-log requirement specified"
      ]
    }
  }
}
```

The PR description carries the same grounding block prominently (above the PRD body) so reviewers see the unresolved gaps before reading the spec.

### Research-side grounding (lighter)

Research outputs don't have a manifest in the same way, but they DO cite sources. We add a `research_grounding` block to the research audit that records:
- Which `MeshContext.bar.mesh_gaps` were the research scoped to address (declared in brief OR auto-derived from gather_mesh_context)
- Which mesh artifacts the synthesis explicitly cited (CALM nodes, STRIDE entries, ADRs)
- Which web/arxiv/patent/hn sources were retained vs filtered

No deterministic "gap" check on the research itself — research is exploratory — but the audit makes the grounding visible so the PRD agent (which consumes the research) has full traceability when it runs its own grounding checks.

---

## Hatter's Tag for research outputs

Extends the Workshop Part 6 Hatter's Tag pattern. Every research/PRD PR carries:

```yaml
---
🤖 Hatter's Tag (research)
---
schema_version:  1.0
agent:           archeologist
agent_version:   1.0.0
run_id:          RES-2026-05-17-abc123
project_id:      PRJ-IMDB-RESEARCH-014
scope:
  level:         bar
  bar_id:        APP-IMDB-002
  platform_id:  PLT-IMDB
mesh:
  mesh_sha:      a4b5c6d7…
  files_read:    23
  mesh_gaps:     [no_threat_model, missing_prd_for_planned_feature, low_architecture_pillar]
deterministic_apis:
  - tavily        @sdk-v0.4    queries=12 results_retained=47
  - arxiv         @api-v0.1    papers_retained=14
  - uspto         @open-data   patents_retained=3
  - hackernews    @hn-api-v0   discussions_retained=9
llm_nodes:
  - node: plan_queries
    provider: anthropic
    model: claude-opus-4-7-20260501
    prompt_pack: .caterpillar/prompts/research/query-plan.md@v1.0.0
    prompt_fingerprint: sha256:5f4dcc3b…
  - node: synthesize_report
    provider: anthropic
    model: claude-opus-4-7-20260501
    prompt_pack: .caterpillar/prompts/research/synthesis.md@v1.0.0
    prompt_fingerprint: sha256:7b3df982…
audit:
  raw_log:           .research-audit/RES-2026-05-17-abc123.jsonl
  human_report:      research/celebrity-following-2026-05.audit.md
  machine_report:    research/celebrity-following-2026-05.audit.json
  template_version:  audit-report-template@v1.0.0
  audit_log_hash:    sha256:9e107d9d…          # final chain hash
  audit_chain_root:  sha256:f3a14b5c…          # first event hash
output_hash:     sha256:e4d909c2…
research_grounding:
  mesh_artifacts_cited:
    calm_nodes:    [celeb-api, celeb-db, celeb-frontend, news-feed]
    stride_entries: []                          # bar has no threat model; flagged as mesh_gap
    adrs:          [ADR-0012, ADR-0014]
    prior_research: []
reviewer:        @your-handle (approved 2026-05-17T16:02:11Z)
```

For PRDs the tag also carries a `grounding:` block mirroring the manifest's grounding (architecture / security / verify_grounding status):

```yaml
🤖 Hatter's Tag (prd)
---
… (same envelope as research) …
grounding:
  architecture:
    coverage_percent: 100
    status: aligned
  security:
    coverage_percent: 71
    status: partial
    stride_entries_missing: [R]
    owasp_categories_missing: [A07]
  verify_grounding:
    status: partial
    mode:   default
```

Auditor's mental model: *ten fields. Each one ties the deliverable to a specific, versioned, reproducible artifact, including the grounding gap state at publish time.* The hash chain plus the grounding block plus the per-artifact citations are what make this auditor-ready out of the box.

---

## Looking Glass-generated workflows (in the mesh repo)

Four new workflows that **Looking Glass** scaffolds (not Cheshire — these live in the mesh repo, which Looking Glass governs). New command on the Looking Glass panel: **"Scaffold Research + PRD Workflows"** — only enabled when the mesh repo has at least one BAR with `agent_type` configured.

The four files written to the mesh repo's `.github/workflows/`:

- `archeologist.yml` — runs the Archeologist pipeline on labelled-issue / dispatch / Project events
- `prd.yml` — runs the PRD pipeline on `prd-ready` label
- `label-on-merge.yml` — post-merge bus handler (research PR merge → `prd-ready`; PRD PR merge → `spec-ready`)
- `notify-code-repos.yml` — fires `repository_dispatch` at the target code repo on `spec-ready`

Cheshire's existing scaffold (in the code repo) adds **one** complementary workflow:

- `spec-ready-handler.yml` — receives the `repository_dispatch` from the mesh repo, reads the PRD manifest, creates an RCTRO implementation issue (reuses the existing RCTRO issue generator code)

So the scaffolding split mirrors the architectural split:

| Subsystem | Scaffolds | Into |
|---|---|---|
| **Looking Glass** | archeologist.yml, prd.yml, label-on-merge.yml, notify-code-repos.yml | mesh repo |
| **Cheshire Cat** | spec-ready-handler.yml (one new file) | code repo |

Both flows are part of the same conceptual pipeline; they just live in the right repo for their job.

### Sample workflows (excerpt)

### `.github/workflows/archeologist.yml`

```yaml
name: Archeologist (Research Agent)

on:
  issues:
    types: [labeled]
  issue_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      brief:
        required: true
        description: "Plain-English research brief"
      path:
        type: choice
        options: [research, archaeology]
        default: research

jobs:
  research:
    if: |
      (github.event_name == 'issues' && github.event.label.name == 'research-request') ||
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude please research')) ||
      github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install agent dependencies
        run: npm install --no-save @maintainabilityai/research-runner

      - name: Run Archeologist pipeline
        id: research
        env:
          ANTHROPIC_API_KEY:  ${{ secrets.ANTHROPIC_API_KEY }}
          TAVILY_API_KEY:     ${{ secrets.TAVILY_API_KEY }}
          # arxiv, uspto, hn require no auth
        run: npx research-runner archeologist --output research/ --audit .research-audit/

      - name: Open PR with research output
        uses: peter-evans/create-pull-request@v6
        with:
          branch: research/${{ steps.research.outputs.run_id }}
          title: "Research: ${{ steps.research.outputs.topic }}"
          body-path: ${{ steps.research.outputs.pr_body_path }}
          labels: research, ai-assisted
```

### `.github/workflows/prd.yml`

Mirror structure. Triggered by `prd-request` label or by a merged research PR.

Both workflows are Cheshire-scaffolded alongside `redqueen-review.yml` and `redqueen-implement.yml`. They appear automatically on any BAR that has `agent_type: claude` (or `both`) once we ship v1.

---

## The runner — `@maintainabilityai/research-runner` (new npm package)

A small TypeScript CLI that orchestrates the pipeline. Same packaging pattern as `redqueen-mcp`. Lives at `packages/research-runner/`.

```
packages/research-runner/
  bin/research-runner.js        (CLI entry: archeologist | prd subcommands)
  dist/                         (built TS)
  src/
    nodes/
      validate-brief.ts         (pure)
      plan-queries.ts           (LLM via Anthropic SDK)
      tavily-search.ts          (pure API; uses fetch + Tavily REST)
      arxiv-search.ts           (pure API)
      uspto-search.ts           (pure API)
      hackernews-search.ts      (pure API)
      dedupe-and-rank.ts        (pure)
      synthesize.ts             (LLM via Anthropic SDK)
      publish.ts                (pure; uses Octokit)
    runner/
      archeologist.ts           (composes nodes)
      prd.ts                    (composes nodes)
      audit-emitter.ts          (writes JSONL events)
      hatters-tag-builder.ts    (assembles the YAML block)
    schemas/
      research-brief.zod.ts
      query-plan.zod.ts
      research-doc.zod.ts
      prd-brief.zod.ts
      prd-doc.zod.ts
      prd-manifest.zod.ts
      audit-event.zod.ts
    types/
```

Why a CLI package (not a library):
- One way to run it (CLI), one observable surface, easier to instrument.
- The workflow can call it via `npx`. The VS Code extension can spawn it as a child process for local runs.
- Same shape as `redqueen-mcp` — your team already maintains a package like this.

Why TypeScript (not Python):
- Avoid the dual-stack integration boundary in this repo. The extension is TS; the agent runner should be TS. If you want the LangGraph ecosystem benefits later, the agent logic can be re-implemented in Python *behind the same CLI contract* without changing the workflows or audit schema. The CLI is the stable interface; the implementation is swappable.

---

## End-to-end user interaction flows

The design's machinery is now complete. This section walks every user-facing trigger surface from click to merged PR, identifies the UI/UX surfaces that need to exist, and lists the validation each interaction needs. Five canonical flows.

### Settings UI — what the extension needs to manage

Looking Glass already has a Settings UI (gear icon on the panel) where users configure `agent_type` (`claude` / `copilot` / `both`). We extend the same UI with a new **Research** section that manages the three secrets and a handful of run-time preferences. Keys live in **two places** with different lifecycles:

| Setting | VS Code secret store | GitHub repo secret | Why both |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | for local dev runs | for workflow runs | local subprocess (`--local`) reads from VS Code; Actions workflow reads from repo secret |
| `OPENAI_API_KEY` | same | same | same — provider-dependent on which is set |
| `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` | same | same | for Azure-deployed teams |
| `TAVILY_API_KEY` | same | same | new for v1 |
| `GOVERNANCE_MESH_TOKEN` | local mesh access | workflow mesh checkout | already used by existing scaffold |

The Settings UI shows each secret with three indicators:
- **VS Code secret**: ✓ set / not set
- **GitHub repo secret**: ✓ set / not set / not checked (no GH access)
- **Last sync**: timestamp of last "push to GitHub" action

Per secret, three actions:
- **Set value** — opens a masked input; saves to VS Code secret store
- **Test** — validates the key against the provider (Anthropic `/v1/messages` with a one-token ping; Tavily `/v1/account`; OpenAI `/v1/models`; for Azure, a probe against the configured endpoint)
- **Push to GitHub** — calls `PUT /repos/{owner}/{repo}/actions/secrets/{name}` to sync the VS Code-stored value to the mesh repo as a secret (uses the user's gh CLI auth)

New non-secret research preferences in the same Settings panel:

| Preference | Type | Default | Captured in |
|---|---|---|---|
| Research LLM provider | dropdown (anthropic / openai / azure-openai) | follows `agent_type` (claude → anthropic, copilot → openai, both → anthropic) | brief + Hatter's Tag |
| Default guardrails mode | dropdown (strict / default / lenient) | `default` | brief + Hatter's Tag |
| Default grounding mode (PRDs) | dropdown (strict / default / lenient) | `default` | brief + Hatter's Tag |
| Default grounding threshold | number 0.5-1.0 | `0.85` | brief + Hatter's Tag |
| Default max iterations (PRDs) | number 1-5 | `3` | brief + Hatter's Tag |
| Default cost cap (tokens) | number | `200000` | brief + Hatter's Tag |
| Search provider preference | dropdown (tavily-primary-ddg-fallback / ddg-only / tavily-only) | `tavily-primary-ddg-fallback` | per-run config + audit |

These preferences populate the New Research input form's defaults; the user can override per-run.

### Pre-flight check before any workflow dispatch

When the user clicks a "New Research" trigger (any of the four UX paths below), the extension runs a **pre-flight check** before calling the GitHub API. The check is deterministic and fast (<2 seconds):

| Check | Failure handling |
|---|---|
| `mesh.yaml` portfolio has `org` + `repo` + `agent_type` | Block; open Settings UI with the missing field highlighted |
| Mesh repo has `.github/workflows/archeologist.yml` (and `prd.yml`, `label-on-merge.yml`, `notify-code-repos.yml`) | Block; offer "Scaffold Research + PRD Workflows" wizard action |
| Mesh repo has `.caterpillar/prompts/` with the seed packs at the expected versions | Block; same wizard action also seeds packs |
| GitHub repo secret `TAVILY_API_KEY` is set (or user opted into DuckDuckGo-only) | Warn; show "Tavily key not configured — falling back to DuckDuckGo (lower quality web results). [Configure Tavily] [Proceed anyway]" |
| GitHub repo secret for the chosen LLM provider is set (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `AZURE_OPENAI_API_KEY`) | Block; offer "Set up secrets" with one-click sync from VS Code secret store |
| GitHub repo secret `GOVERNANCE_MESH_TOKEN` is set (only required if mesh is a separate repo) | Block; show how to create PAT |
| User has write access to the mesh repo (issues + pull-requests scopes) | Block; show "You need write access to AliceN-ucdenver/imdb-lite-mesh to dispatch workflows" |
| For BAR-scope runs: BAR exists in mesh and has `bar.arch.json` | Block; "Cannot run BAR-scoped research on APP-IMDB-002 — bar.arch.json missing" |
| Estimated cost for the run does not exceed the user's configured cap | Warn; show estimated cost + budget remaining; offer to override or cancel |

The pre-flight check is **cached for 5 minutes** per mesh repo so users don't re-pay the latency on every "New Research" click.

### Flow 1 — Architect opens Looking Glass → right-click BAR → "New Research"

The canonical happy path. The Looking Glass tree view shows Portfolio → Platform → BAR hierarchy.

```
1. User opens VS Code with the mesh repo
2. Clicks Looking Glass icon in Activity Bar
3. Sees Portfolio → IMDB Lite → APP-IMDB-002
4. Right-clicks APP-IMDB-002
5. Context menu shows:
   - View BAR Details
   - View Scorecard
   - ─────────────
   - New Research              ← new
   - New Research (Archaeology) ← new (sub-option when relevant)
   - Draft PRD from Research…  ← new (enabled only if research exists for this BAR)
   - ─────────────
   - View Oraculum Findings (3) ← shows count
   - Scaffold Research + PRD Workflows ← new (one-time setup)
6. User clicks "New Research"
7. Pre-flight check runs (cached if recently done)
   - If any check fails → show actionable error + remediation
8. Modal opens: "New Research for APP-IMDB-002 (Platform: IMDB Lite)"
   Form fields (defaults from Settings preferences):
     - Topic (textarea, required, 10-500 chars)
     - Path: ○ Research  ○ Archaeology
     - If Archaeology: Target repo URL (text input)
     - Depth: ○ Quick  ○ Deep
     - Grounding mode: [Default ▾]
     - Guardrails mode: [Default ▾]
     - Max iterations (PRD chain): [3]
     - Cost cap: [$2.00] (estimated next to it)
     - Auto-trigger PRD on merge: ☑ (default; uncheck to skip the chain)
   Buttons: [Cancel] [Run Research]
9. User clicks Run Research
10. Confirmation dialog: "Dispatch archeologist.yml on AliceN-ucdenver/imdb-lite-mesh?
     Scope: APP-IMDB-002 (BAR)
     Estimated cost: $0.42
     Estimated wall-clock: 4-6 minutes
     [Cancel] [Confirm and dispatch]"
11. User confirms
12. Extension calls POST /repos/{owner}/{repo}/actions/workflows/archeologist.yml/dispatches
    with payload { ref: 'main', inputs: { brief, scope, depth, grounding_mode, ... } }
13. Notification: "Research RES-2026-05-17-abc123 dispatched.
                   [View run in Actions]"
14. Looking Glass "Active Runs" sub-panel appears with the new run, status: Queued
15. Panel polls GitHub Actions API every 30s for status
16. Status transitions: Queued → In Progress (with current node name from audit log streaming)
17. When run completes: notification "Research RES-... complete — PR #4187 opened in mesh repo.
                        [View PR] [View audit] [Dismiss]"
18. User clicks View PR → opens in browser
19. User reviews the research doc, audit.md, Hatter's Tag in the PR
20. User merges PR
21. label-on-merge.yml fires → prd-ready label set on source issue
22. prd.yml fires automatically
23. New entry in Looking Glass "Active Runs": PRD-2026-05-17-def456
24. ... PRD flow continues, same notification pattern
```

Validation checklist for Flow 1:

- [x] Right-click context menu wired (`maintainabilityai.newResearch` command)
- [x] Modal form with all fields and defaults
- [x] Pre-flight check runs before dispatch
- [x] Cost estimation shown before confirmation
- [x] Workflow dispatch call uses the correct API + payload
- [x] Active Runs sub-panel created in Looking Glass
- [x] Polling for status (with backoff to 60s after 10 min, 5min after 30 min)
- [x] Streaming the current node name from audit log (the runner emits events; we tail them via GitHub API)
- [x] Notifications on dispatch, on status change, on completion
- [x] All notifications have action links (View Run / View PR / View Audit)

### Flow 2 — PM moves a card on the mesh repo's GitHub Project

PMs typically don't have VS Code installed. Their primary surface is GitHub Projects on the mesh repo.

```
1. PM has a GitHub Project on the mesh repo with columns: Backlog | Research | Specifying | Implementing | Done
2. Each card has custom fields: BAR ID (text), Platform (dropdown), Depth (dropdown), Brief (long-text)
3. PM creates a card in Backlog: "Investigate celebrity-following user demand"
   Sets fields: BAR ID=APP-IMDB-002, Platform=IMDB Lite, Depth=quick, Brief="Investigate user demand for ..."
4. PM moves the card to "Research" column
5. projects_v2_item webhook fires on the mesh repo
6. archeologist-trigger-on-project-move.yml workflow handles the webhook:
   - Reads the card's custom fields
   - Constructs a ResearchBrief from { BAR ID, Platform, Depth, Brief }
   - Calls workflow_dispatch on archeologist.yml with the brief
7. The card gets a comment: "Research dispatched. Run: RES-2026-05-17-abc123.
                              Status: Queued. [View in Actions]"
8. PM sees the comment update as the run progresses
9. On completion, card moves automatically to "Research Done" (custom field updated by the workflow)
   Comment added: "Research complete. PR #4187 opened. [Review and merge]"
10. PM reviews + merges the PR
11. ... continues like Flow 1
```

Validation checklist for Flow 2:

- [x] Project custom-field schema documented (BAR ID required, Platform required, Depth required, Brief required)
- [x] `archeologist-trigger-on-project-move.yml` reusable workflow generator (Looking Glass scaffolds it on request)
- [x] Project card gets comment updates from the workflow (uses the same `verify_and_trigger` contract comment mechanism, scoped to the card)
- [x] PMs without VS Code can run the full flow from GitHub UI alone

### Flow 3 — Oraculum finds architecture drift → architect labels for research

Oraculum runs on a schedule (or after merges) and files findings as mesh-repo issues. The "investigate" handoff is a one-click action.

```
1. Oraculum runs on schedule (e.g., weekly)
2. Detects: "APP-IMDB-002 BAR has no STRIDE entry for the planned /favorites endpoint"
3. Files mesh issue #4180:
   Title: "[Oraculum] APP-IMDB-002: STRIDE coverage gap on /favorites"
   Labels: oraculum-finding, bar:APP-IMDB-002, platform:IMDB-Lite, architecture
   Body: Detailed finding with evidence, frontmatter with bar_id/platform_id
4. Architect sees the issue in their notifications OR in Looking Glass "Oraculum Findings" sub-panel
5. Architect clicks the issue → reads finding
6. Architect decides to investigate → adds label `research-request` to the issue
   (OR clicks "Investigate" button in Looking Glass which adds the label via API)
7. archeologist.yml fires on `issues, types: [labeled]` with label=research-request
8. Workflow constructs ResearchBrief from:
   - Brief: issue body (or first paragraph of body, if structured)
   - Scope: read bar:/platform: labels → BAR-level scope on APP-IMDB-002
   - Trigger: { kind: "oraculum", source_issue: 4180, oraculum_finding_id: "ORA-2026-05-…" }
9. Research runs, PR opens
10. Research PR body includes "Closes #4180" (the Oraculum issue)
11. On merge: prd-ready label set on issue #4180; Oraculum issue auto-closed with reference to merged PR
12. PRD runs, PR opens
13. On PRD merge: spec-ready label set on #4180
14. notify-code-repos.yml dispatches repository_dispatch to celeb-api repo
15. celeb-api spec-ready-handler.yml creates RCTRO issue
16. alice-remediation implements
17. After implementation merge in code repo, the next Oraculum scan confirms the original gap is closed
```

Validation checklist for Flow 3:

- [x] Oraculum issues already use frontmatter with `bar:` / `platform:` (confirmed in earlier audit)
- [x] Looking Glass "Oraculum Findings" sub-panel shows current findings with "Investigate" action
- [x] "Investigate" button = one-click label-add via API
- [x] Workflow reads bar:/platform: labels for scope inference
- [x] Research PR body links back to Oraculum issue (`Closes #4180`)
- [x] Audit trail includes `oraculum_finding_id` so the loop is traceable end-to-end
- [x] Closed-loop verification: next Oraculum scan after implementation merge confirms gap closure

### Flow 4 — Comment-triggered research

Lightweight; useful when an architect/PO is already in an issue thread and wants to invoke the agent inline.

```
1. User in mesh-repo issue #4200 (any kind of issue)
2. User comments: "@claude please research how teams handle event-sourcing for celebrity favorites in 2026"
3. archeologist.yml fires on `issue_comment, types: [created]` with comment matching pattern
4. Workflow extracts brief from comment body (text after the trigger phrase)
5. Scope inherited from parent issue's labels (bar:/platform:)
   - If parent issue has no bar:/platform: → scope defaults to portfolio
   - If user wants different scope → use "bar:APP-IMDB-002" inline marker in the comment
6. Pre-flight: brief length validation (10-500 chars), no prompt-injection in brief (guardrail check)
7. Workflow dispatches research; comment auto-replies "Dispatched. RES-2026-05-17-…"
8. ... continues like other flows
```

Validation checklist for Flow 4:

- [x] Comment-pattern regex documented (`@claude please research <X>` OR `@github please research <X>`)
- [x] Brief extraction rule (text after trigger phrase, stripped of markdown)
- [x] Scope inheritance from parent issue labels
- [x] Inline scope override syntax (`bar:APP-IMDB-002` in comment body)
- [x] Auto-reply to comment with run ID + status link
- [x] Brief subject to all input guardrails (PII / injection / etc.) before dispatch
- [x] No-bar-no-platform → portfolio scope fallback

### Flow 5 — Local dev iteration

For runner package contributors, agent prompt-pack authors, and individual exploration. Never produces a PR; always tagged `trigger: local`.

```
1. Dev clones the mesh repo locally
2. Sets env: ANTHROPIC_API_KEY, TAVILY_API_KEY, RED_QUEEN_MESH_PATH
3. Writes a brief.yaml locally:
     topic: "Investigate ..."
     scope: { level: bar, bar_id: APP-IMDB-002 }
     depth: quick
4. Runs: npx research-runner archeologist --brief brief.yaml --local --out ./local-out/
5. Runner executes all nodes, writes outputs + audit to ./local-out/
6. NO PR is opened. NO mesh files are committed. Audit log marked trigger:local.
7. Dev iterates on prompt packs by re-running with the same brief
```

Validation checklist for Flow 5:

- [x] `--local` flag suppresses publish + verify_and_trigger node behavior (writes locally, no GitHub API calls)
- [x] `--out <dir>` overrides default mesh-relative paths
- [x] All audit events tagged `trigger: { kind: 'local' }` so they are distinguishable from sanctioned runs
- [x] Guardrails still run in local mode (cost, PII, secrets) — local doesn't mean unsafe
- [x] Local runs can be promoted to sanctioned runs via `research-runner promote-to-pr <local-run-dir>` (v1.1)

### Looking Glass — new sub-panels and indicators

The Looking Glass panel gets three new sub-panels alongside the existing Portfolio / BAR / Scorecard views:

| Sub-panel | Purpose | Surfaces |
|---|---|---|
| **Active Runs** | Live status of research/PRD runs the user dispatched | Run ID, scope, started_at, current node (from audit stream), status (queued/running/blocked/complete), workflow URL, PR URL when available |
| **Oraculum Findings** | Open Oraculum issues on the mesh repo with `Investigate` action | Issue number, title, scope (bar/platform), severity, age, "Investigate" button |
| **Research Library** | Browse historical research and PRDs per BAR | Tree: BAR → research/<topic>-<date>, prds/<topic>-<date>. Click → opens PR or doc + audit |

### Status streaming via audit log tail

The runner's audit JSONL grows during the run. Looking Glass polls the workflow run's artifacts/logs and parses the JSONL for `node_complete` events to show the current node. This avoids hammering the GitHub Actions API for status changes; we read the workflow's own structured output.

```typescript
// Pseudocode in LookingGlassPanel.ts
async function pollActiveRun(runId: string) {
  const workflow = await github.actions.getWorkflowRun({ owner, repo, run_id: workflowRunId });
  const status = workflow.status;  // queued | in_progress | completed
  const conclusion = workflow.conclusion;  // success | failure | cancelled | null

  // For in-progress runs, tail the audit JSONL via the artifact API (or the in-PR file if PR opened)
  if (status === 'in_progress') {
    const events = await tailAuditLog(runId);
    const currentNode = events.findLast(e => e.event === 'node_complete')?.node ?? 'queued';
    updateUI({ runId, status, currentNode });
  }

  // On completion, notify and link to PR
  if (status === 'completed') {
    const prUrl = workflow.outputs?.pr_url;  // set by verify_and_trigger
    notifyUser({ runId, conclusion, prUrl });
    stopPolling(runId);
  }
}
```

Polling cadence: 30s for the first 10 minutes, 60s up to 30 min, 5 min beyond that. The runner shouldn't take more than 15 min in practice; the long-tail polling is for stuck or queued-waiting runs.

### Error UX — what users see when things go wrong

| Failure | User sees |
|---|---|
| Pre-flight check fails (missing secret) | Modal with specific action: "Tavily key not set as GitHub repo secret. [Push from VS Code secret store now] [Cancel]" |
| Workflow dispatch returns 403 (no write access) | Modal: "You need write access to the mesh repo to dispatch workflows. Ask the org admin." |
| Workflow dispatch returns 422 (workflow doesn't exist) | Modal: "Research workflows not scaffolded in mesh repo. [Scaffold now] [Cancel]" |
| Workflow runs but fails at gather_mesh_context | PR not opened; notification "Research RES-... failed during gather_mesh_context. The BAR may be missing required files. [View audit log]" |
| Workflow runs but blocked by guardrail | PR not opened; notification "Research RES-... blocked by guardrail (secrets-detection). [View audit log]" with redacted details |
| Workflow completes but PR isn't opened (verify_and_trigger sees mismatch) | Notification "Research RES-... completed but the PR could not be verified (output hash mismatch). [View audit log] [Re-run]" |
| LLM provider returns rate-limit | The runner backs off and retries automatically; status indicator shows "Rate-limited, retrying in 60s"; only escalates to failure after 3 retries |
| Cost cap exceeded mid-run | Run terminates with `outcome: 'exhausted'`; PR opens with partial results; notification "Research RES-... hit cost cap at iteration 2. [View partial result]" |

All errors carry a `view_audit_log` action so the user can inspect the structured trail.

### User interaction validation summary

The full interaction surface, validated:

| Trigger | UI/UX surface | Pre-flight check | Status visibility | Error handling | Audit |
|---|---|---|---|---|---|
| Right-click in Looking Glass | Modal form with full options | ✓ cached check | Active Runs sub-panel + notifications | Per-failure modal with remediation | All events |
| GitHub Project card move | Custom fields in card | ✓ runs in workflow | Comments on card | Comment with link to Actions logs | All events |
| Oraculum issue → research-request label | Label add (one-click via Looking Glass) | ✓ runs in workflow | Issue comment thread | Issue comment | All events + `oraculum_finding_id` |
| Comment `@claude please research X` | Comment in any issue | ✓ runs in workflow + brief guardrail | Comment reply | Comment with error detail | All events |
| Local `npx research-runner --local` | CLI | ✓ same checks (skip network where applicable) | Stdout | Exit code + JSONL | All events tagged `trigger: local` |

---

## Triggering surfaces

All triggers fire workflows in the **mesh repo**, scope to a BAR/Platform/Portfolio level, and PR back into the mesh repo at the appropriate level in the destination hierarchy above.

| Trigger | Where | Route | Scope determination |
|---|---|---|---|
| **VS Code Looking Glass → right-click BAR → New Research** | extension | calls GitHub API to dispatch `archeologist.yml` on the mesh repo | scope = the BAR you right-clicked |
| **VS Code Looking Glass → right-click Platform → New Research** | extension | same workflow, different scope param | scope = platform |
| **VS Code Looking Glass → Portfolio menu → New Research** | extension | same workflow | scope = portfolio root |
| **VS Code Looking Glass → right-click BAR → New Research (archaeology)** | extension | extra param `path: archaeology` + `target_repo` URL | scope = BAR; archaeology specialised pipeline |
| **Oraculum-generated issue labelled `research-request`** | mesh repo | Oraculum's existing automated review finds an architecture gap, files an issue, optionally labels it `research-request` to invite the Archeologist to investigate | scope inferred from Oraculum issue's `bar:` / `platform:` frontmatter; Oraculum already tags this |
| GitHub Projects field move ("Research" column on the mesh repo's Project) | mesh repo | `projects_v2_item` webhook → workflow | scope inferred from Project column metadata |
| Issue on the mesh repo labelled `research-request` (any source) | mesh repo | `on: issues, types: [labeled]` | scope set by `bar:` / `platform:` field in issue body |
| Comment `@claude please research <topic>` or `@github please research <topic>` on any mesh-repo issue | mesh repo | `on: issue_comment` | scope inherited from parent issue |
| MCP tool call from another agent | future (v2) when the Research MCP server lands | n/a in v1 | |

**Local dev iteration is NOT a top-level trigger.** Individual contributors can `npx research-runner archeologist --local` from their machine for testing the pipeline, but local runs are tagged `trigger: local` in the audit and produce no PR. Sanctioned runs (the kind that feed decisions) always go through one of the above.

**The audit log marks the trigger type and scope.** Every event includes `trigger: { kind: "looking-glass-extension"|"oraculum"|"github-projects"|"github-label"|"github-comment"|"local", scope: { level: "portfolio"|"platform"|"bar", bar_id?, platform_id? }, source_issue?: number, oraculum_finding_id?: string }`. A future auditor querying *"which BARs got research in Q2 2026, by whom, triggered how?"* gets it from one jq query on the JSONL stream.

### Oraculum closes the full loop

Oraculum is the extension's existing automated architecture review. It runs against the CALM model and files findings as GitHub Issues on the mesh repo organised by pillar (architecture / security / info-risk / operations). Adding the `research-request` label to an Oraculum finding turns it into a trigger for the Archeologist — closing the loop from *"the architecture review found a gap"* to *"we shipped the fix"*:

```
Oraculum (automated review on the mesh repo)
   detects gap: "APP-IMDB-002 has no STRIDE entry for the planned /favorites endpoint"
   files mesh issue #4180 in `architecture` pillar, labels `oraculum-finding`
       │
       ▼ (architect labels issue: research-request)
       │
archeologist.yml fires
   gather_mesh_context reads APP-IMDB-002 BAR + sees no_threat_model gap
   plan_queries asks for threat-model patterns for authenticated favorite endpoints
   synthesize_report writes research grounded in the mesh + web findings
       │
       ▼ (PR merged in mesh by architect → label-on-merge → prd-ready)
       │
prd.yml fires → PRD with threat-model section grounded in research
       │
       ▼ (PR merged in mesh by PO → label-on-merge → spec-ready)
       │
notify-code-repos.yml dispatches repository_dispatch to celeb-api
       │
       ▼
celeb-api spec-ready-handler.yml creates Cheshire RCTRO issue with the PRD manifest
       │
       ▼
alice-remediation.yml implements → PR merged in celeb-api
       │
       ▼
Oraculum re-scans → the original architecture gap is closed
       │
       ▼
Mesh Issue #4180 is auto-closed with reference to the implementing PR
```

End-to-end, one Oraculum finding produces: a research doc, a PRD, an implementation issue, an implementation PR, and an audit chain across two repos joined by `project_id`. Every step is human-reviewed at the PR-merge checkpoints. Every artifact carries its Hatter's Tag. The full chain from *"the system noticed something is missing"* to *"the system noticed the gap is now closed"* is git-queryable.

This is the architectural payoff of putting research and PRD on the Looking Glass side — it's how the governance loop becomes self-healing rather than just self-reporting.

---

## Cross-agent handoff — labels as the bus, across repos

The NCMS message-bus pattern (Archeologist → PRD → Designer via in-process bus) is reshaped around GitHub primitives. Two repos are involved: the **mesh repo** (where research + PRD live and are reviewed) and the **target code repo** (where implementation happens). The bus is *labelled-issue transitions in the mesh repo*; the bridge from mesh to code is a *`repository_dispatch` event*; PR merges are the *human-in-the-loop checkpoints* between agents.

```
MESH REPO
═════════════════════════════════════════════════════════════════════════════
[PO or architect, via Looking Glass right-click on a BAR]
   creates mesh-repo issue with label: research-request, bar: APP-IMDB-002
       │
       ▼
archeologist.yml fires on `issues, types: [labeled]`
   Pipeline: validate_brief → plan_queries → tavily → arxiv → uspto → hn →
             dedupe → synthesize_report → publish → verify_and_trigger
       │            (emits run_complete with downstream_contract.label = "prd-ready")
       ▼
PR opens in MESH REPO at: platforms/imdb-lite/bars/APP-IMDB-002/research/<topic>-<date>.md
   verify_and_trigger writes contract comment on source issue:
   "When this PR merges, the issue will be labeled prd-ready and PRD will run.
    Add `no-auto-prd` label before merging to skip."
       │
       ▼ (ARCHITECT REVIEWS + MERGES PR in mesh repo — checkpoint #1)
       │
mesh-repo label-on-merge.yml reads merged PR's frontmatter,
   confirms run_complete.outcome == 'success', confirms `no-auto-prd` absent,
   adds `prd-ready` label to the source issue
       │
       ▼
prd.yml fires on `issues, types: [labeled]` with label: prd-ready
   Pipeline: validate_brief → resolve_research → ask_experts? →
             synthesize_prd → generate_manifest → publish_prd → verify_and_trigger
       │            (emits run_complete with downstream_contract.label = "spec-ready")
       ▼
PR opens in MESH REPO at: platforms/imdb-lite/bars/APP-IMDB-002/prds/<topic>-<date>.md
                        + ...prds/<topic>-<date>.manifest.json
       │
       ▼ (PO REVIEWS + MERGES PR in mesh repo — checkpoint #2)
       │
mesh-repo label-on-merge.yml labels source issue: spec-ready
       │
       ▼
mesh-repo notify-code-repos.yml fires on label: spec-ready
   reads the BAR's bar.yaml for `repo: AliceNN-ucdenver/celeb-api`
   fires a repository_dispatch event at the code repo with event_type=spec-ready
   payload: { mesh_pr_url, prd_path, manifest_path, bar_id, project_id }

═════════════════════════════════════════════════════════════════════════════
CODE REPO (celeb-api)
═════════════════════════════════════════════════════════════════════════════
       │
       ▼
celeb-api .github/workflows/spec-ready-handler.yml fires on
   `repository_dispatch, types: [spec-ready]`
   reads the PRD manifest from the mesh repo (raw.githubusercontent.com or git submodule),
   creates an implementation issue in celeb-api with the RCTRO body derived from
   the manifest, labels it `rctro-feature`, links back to the mesh PRD URL
       │
       ▼
Cheshire's existing alice-remediation.yml fires on `@claude please remediate`
   (the existing workshop Part 3 flow takes over)
   implements, opens PR, human reviews + merges in the code repo
       │
       ▼
code repo PR carries a Hatter's Tag that references the mesh PRD:
   `derived_from_prd: <mesh_pr_url>` and `derived_from_research: <mesh_research_pr_url>`

Full audit chain: from "we wondered about X" → research → PRD → spec issue →
   implementation PR → merged code — is queryable across both repos via project_id.
```

### What this cross-repo flow gives you that a single-repo flow doesn't

1. **Audience separation enforced by repo permissions.** Product owners and architects get write access to the mesh repo. Engineers get write access to the code repo. Both see the cross-references; neither needs the other's permissions. Compliance reviewers can read the mesh repo without code-repo access.

2. **One research, many code repos.** A research that informs three code repos can produce three PRDs, each landing in its own BAR directory, each firing `notify-code-repos.yml` to a different code repo. The mesh repo is the source of truth; the code repos are the consumers.

3. **Governance scorecards stay in sync.** When research lands in a BAR's directory, the Looking Glass scorer picks it up immediately and updates the BAR's Architecture pillar (research freshness signal). The code repo doesn't need to know — the score travels with the BAR in the mesh.

4. **Trigger contracts are explicit at every hop.** `verify_and_trigger` writes the downstream contract on the source issue *before* the merge. The post-merge bus handler honors that contract (or the `no-auto-prd` opt-out). The cross-repo dispatch carries an explicit payload. At no point does a downstream agent fire based on implicit state.

5. **Per-repo audit chains, joined by `project_id`.** Each repo has its own `.research-audit/` (mesh) or `.cheshire/issue-audit/` (code). Both reference the same `project_id`. `git log` in either repo is auditable; the join is one `jq` filter.

### Scoring impact — research and PRDs feed the BAR scorecard

Adding these documents to a BAR's directory updates its scorecard via Looking Glass's existing scorer:

| BAR pillar | New signal | Effect |
|---|---|---|
| **Architecture** | Latest research doc <12 months old | +5 pts; stale (>12 months) drops the bonus |
| **Architecture** | PRD exists for every feature with `planned` status in `bar.yaml` | +5 pts; missing PRDs flag the BAR as "design before generation" violator (Workshop Rule 2) |
| **Information Risk** | Archaeology research within the last 6 months for acquired/legacy BARs | +3 pts; surfaces undocumented risk to the architect |
| **Operations** | Research / PRD review velocity (avg days to merge over last quarter) | informational; surfaces process bottlenecks |

The Hatter's Tag on the merged research/PRD PR is the proof — the scorer reads the merged file's frontmatter to confirm provenance.

---

## Output location options

| Pattern | When to use | Where outputs go |
|---|---|---|
| **In-repo `research/`** (default) | Small teams; research + code co-evolve | `research/<topic>-<date>.md` in the same repo as the code |
| **Sibling research repo** | Orgs needing PO/research access without code-repo access | `<bar>-research` repo; cross-referenced in BAR's CALM model |
| **Wiki** | NOT recommended | Wiki bypasses PR review → no audit gate |
| **GitHub Discussions** | NOT recommended | Too informal for structured audit |

Configurable via a new field in the BAR's mesh.yaml entry:

```yaml
research:
  output: in-repo                # | sibling-repo | (other names reserved)
  sibling_repo_name: celeb-api-research    # only if output == sibling-repo
```

---

## LLM provider — pluggable, independent of `agent_type`

The mesh.yaml `agent_type` field (`claude` / `copilot` / `both`) governs **who implements issues in code repos** (Claude Code Action vs Copilot Coding Agent assignment). The **research synthesis LLM** is a separate concern: it picks the model that drives `plan_queries`, `ask_experts`, and `synthesize_*` nodes inside the runner.

These two concerns are deliberately independent. A Copilot-aligned team should not be forced to add `ANTHROPIC_API_KEY` just to run governance work, and a Claude-aligned team should not be forced into OpenAI for research synthesis. The runner picks the LLM provider from a flag, with sensible defaults per `agent_type`:

| `agent_type` | Default `--llm-provider` | Required secret | Why this default |
|---|---|---|---|
| `claude` | `anthropic` | `ANTHROPIC_API_KEY` | Same provider the team's existing alice-remediation workflow uses; reuses an existing secret |
| `copilot` | `openai` | `OPENAI_API_KEY` | Copilot Coding Agent is GPT-backed; matches the team's existing LLM accounting |
| `both` | configurable per workflow | both, or pick one | Team chooses; if unset, defaults to `anthropic` |

Supported providers in v1: `anthropic`, `openai`, `azure-openai`. Each adapter implements one interface (`LlmAdapter.complete(prompt, schema) → output`). Adding a new provider is one file in `packages/research-runner/src/llm/`.

The provider is captured in every LLM-node audit event so an auditor can answer *"what model produced PR #4187?"* without ambiguity:

```json
{
  "node_kind": "llm",
  "llm": {
    "provider": "openai",
    "model": "gpt-5-2026-04-15",
    "prompt_pack": ".caterpillar/prompts/research/synthesis.md@v1.0.0",
    "prompt_fingerprint": "sha256:…",
    "input_tokens": 12345,
    "output_tokens": 3210
  }
}
```

The Hatter's Tag YAML carries the same fields. The same research brief run on a Claude-aligned mesh repo vs a Copilot-aligned mesh repo produces different model citations but **the same audit schema, the same output document structure, and the same Zod-validated content shape.** That portability is the point.

---

## API providers — auth + rate limits

| Provider | Used for | Auth | Rate limit (free tier) | Backoff strategy |
|---|---|---|---|---|
| **Anthropic Claude** | LLM nodes when `--llm-provider anthropic` | `ANTHROPIC_API_KEY` (existing secret) | Standard Anthropic quotas | Exponential backoff on 429; surface in audit `node_error` |
| **OpenAI** | LLM nodes when `--llm-provider openai` | `OPENAI_API_KEY` (new secret for Copilot-aligned teams) | Standard OpenAI quotas | Same backoff pattern |
| **Azure OpenAI** | LLM nodes when `--llm-provider azure-openai` | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` | Per-deployment | Same backoff pattern |
| **Tavily** | `tavily_search` (primary web) | `TAVILY_API_KEY` (new secret) | 1000/month free | Cache hits within 24h to avoid burning budget |
| **DuckDuckGo Instant Answer** | Fallback for `tavily_search` when no `TAVILY_API_KEY` | none | unlimited | Audit marks `provider: duckduckgo-fallback` so quality is traceable |
| **arXiv** | `arxiv_search` | none | ~1 req/sec (unofficial) | Built-in 1.1s sleep between calls; respect `Retry-After` |
| **USPTO Open Data** | `uspto_search` | none | undocumented; conservative | 500ms between calls |
| **Hacker News (Algolia)** | `hackernews_search` | none | generous | Single call per run; no per-query loop |

Total cost per research run (default settings, Anthropic): ~$0.40 in tokens (plan + synthesize) + 12 Tavily queries (~$0.012 if your plan charges per query). OpenAI-equivalent cost is comparable. Cheaper than a coffee.

---

## Schemas (Zod)

All inter-node data passes through Zod-validated types. This is what makes the LLM nodes' *content* non-deterministic but their *shape* deterministic.

```typescript
// research-brief.zod.ts
export const ResearchBrief = z.object({
  topic: z.string().min(10).max(500),
  project_id: z.string().regex(/^PRJ-[A-Z0-9-]+$/),
  path: z.enum(['research', 'archaeology']),
  depth: z.enum(['quick', 'deep']).default('quick'),
  target_audience: z.string().optional(),
  archaeology_repo: z.string().url().optional(), // required if path === 'archaeology'
});

// query-plan.zod.ts (LLM output of plan_queries)
export const QueryPlan = z.object({
  web: z.array(z.string()).max(15),
  arxiv: z.array(z.string()).max(10),
  uspto: z.array(z.string()).max(5),
  hackernews: z.array(z.string()).max(8),
  reasoning: z.string().describe('Why these queries; what coverage they provide'),
});

// research-doc.zod.ts (LLM output of synthesize)
export const ResearchDoc = z.object({
  executive_summary: z.string().max(2000),
  findings: z.array(z.object({
    claim: z.string(),
    evidence: z.array(z.object({ source_index: z.number(), quote: z.string() })),
    confidence: z.enum(['high', 'medium', 'low']),
  })).min(3),
  open_questions: z.array(z.string()),
  recommended_next_research: z.array(z.string()).optional(),
});
```

If an LLM node returns content that fails Zod validation, the runner retries once with the validation error in the prompt, then fails the run with an audit `node_error`. We never publish a doc that violates the contract.

---

## Future deployment: AI Foundry (v2 enterprise option)

When an org needs centralized governance, cost control, and a Foundry-native audit log:

- The same `research-runner` CLI is callable from a Foundry endpoint (or the agent nodes are re-implemented in Foundry's flow runtime — both work because the *interface* is the CLI + audit schema, not the code).
- The Cheshire-scaffolded workflows swap their `npx research-runner` step for a `curl <foundry-endpoint>` step. Nothing else changes.
- The Foundry-native audit log is the primary source of truth; the in-repo audit JSONL is a mirror.
- Cost guardrails (max tokens/run, max queries/day) move from environment variables to Foundry policies.

This is a deployment-time decision, not a redesign. The v1 audit schema is intentionally compatible.

---

## Open questions (still unresolved)

1. **Replay.** Should `research-runner replay <run_id>` be supported? Given the audit log captures every API call's request fingerprint and the LLM prompt fingerprint, *partial* replay is feasible. *Full* replay is impossible (the web changed). Useful for debugging; not v1.
2. **Caching.** Same query within 24h returns cached results? Recommendation: cache Tavily/arXiv/USPTO responses keyed by `request_fingerprint`, default TTL 24h, configurable per-run. Saves cost; mark cached results in audit (`cache_hit: true`).
3. **Trust battery for research.** Should a research doc's score decay when cited URLs go dead? Could fold into the scorecard's Architecture pillar. Not v1; track for later.
4. **PRD with no research.** Should PRD agent accept a brief without a `research_id`? Yes, but emit a warning in the audit and the Hatter's Tag (`research_id: none`). Auditor can flag.
5. **Naming for public docs.** Internal: "Archeologist Agent" and "PRD Agent" (match NCMS). Public Wonderland alias suggestions: **The Dormouse** for Archeologist (sleeps in the well of treacle, knows the old stories), **The King of Hearts** for PRD (issues the decree). Optional; can stay direct-named in the workshop.
6. **GitHub Projects v2 trigger plumbing.** GitHub's `projects_v2_item` event is finicky. May need a small reusable workflow (`research-trigger-on-project-move.yml`) we publish for orgs to extend.

---

## Code surfaces needed in the extension (gaps found by design review against Looking Glass code)

The runner package and the workflows in the mesh repo are net-new code. But the design also requires several net-new capabilities **inside the existing VS Code extension** (mostly in `MeshService` / `BarService` / `GovernanceScorer` / `LookingGlassPanel`). These were verified absent by a design review against the Looking Glass code on 2026-05-17.

| Surface | What needs to be added | File | Why |
|---|---|---|---|
| **GovernanceScorer** | New `MeshGapKind` enum + `detectMeshGaps(bar)` method returning `MeshGapKind[]`. Enums: `no_threat_model`, `no_controls_mapping`, `no_adrs`, `stale_research`, `missing_prd_for_planned_feature`, `low_architecture_pillar`, `low_security_pillar` | `services/GovernanceScorer.ts` | `gather_mesh_context` node depends on this; without it, `ask_experts` has nothing to ground questions in |
| **BarService** | `listResearch(barId): ResearchSummary[]` reading `platforms/<plat>/bars/<bar>/research/*.md`. `listPrds(barId): PrdSummary[]` reading `.../prds/*.md`. Both parse frontmatter (research_id, topic, published_at, hatters_tag fields) | `services/BarService.ts` | `MeshContext.bar.related_research` and `.related_prds` depend on this |
| **GovernanceScorer** | Research/PRD freshness inputs to the Architecture pillar: `+5` for research <12 months old; `+5` for PRD existing for every `planned` feature in `bar.yaml`; missing PRDs flag as Rule-2 violation | `services/GovernanceScorer.ts` | Closes the "self-healing loop" (research presence affects scorecard which affects tier) |
| **MeshService** | `getMeshSha(): string` wrapping `git rev-parse HEAD` on the mesh path (use `execFileSync` from `child_process`, mirrors `GitSyncService` pattern) | `services/MeshService.ts` | Every audit event carries `mesh_sha`; reproducibility claim depends on this |
| **MeshService** | `writeResearchWorkflows(meshPath, agentType, llmProvider): WrittenFile[]` that scaffolds 4 workflow files into `mesh/.github/workflows/` (archeologist.yml, prd.yml, label-on-merge.yml, notify-code-repos.yml) + writes seed prompt packs into `mesh/.caterpillar/prompts/research/` and `/prd/` | `services/MeshService.ts` (parallels existing `writeOraculumWorkflow`) | The Looking Glass scaffold command depends on this |
| **MeshReader** | `readThreatModel(barId): StrideEntries \| null` — parsed STRIDE YAML (current code detects presence but does not parse contents) | `core/mesh-reader.ts` | `MeshContext.bar.threats` field |
| **MeshReader** (optional, v1.1) | `readBarControls(barId): NistMappings \| null` — per-BAR control mappings (currently only portfolio-level NIST is read) | `core/mesh-reader.ts` | `MeshContext.bar.controls` field; can fall back to portfolio NIST for v1 |
| **BarService** | Move `computeTier()` from `LookingGlassPanel.ts:50` (webview-side) to `BarService.computeTier(barSummary): GovernanceTier` so the runner can import it via the same code path as the UI | `services/BarService.ts` | One source of truth for tier computation — both UI and runner agree |
| **GitHubService** | `dispatchRepository(owner, repo, eventType, clientPayload): void` wrapping `POST /repos/{owner}/{repo}/dispatches` | `services/GitHubService.ts` | The `notify-code-repos.yml` generator needs this; cross-repo bridge depends on it |
| **LookingGlassPanel** | Two new context-menu commands: `maintainabilityai.newResearch` (right-click BAR / Platform / Portfolio root) and `maintainabilityai.scaffoldResearchWorkflows` (mesh-level menu). Wire via the existing `case 'openOraculum'` pattern in the webview message handler. | `webview/LookingGlassPanel.ts` + `package.json` `contributes.commands` and `contributes.menus.view/item/context` | The user-facing entry point for triggering research from the Looking Glass UI |
| **ScaffoldPanel** (Cheshire, code repo) | One new workflow generator: `spec-ready-handler.yml` that listens for `repository_dispatch` events of type `spec-ready` from the mesh repo, reads the PRD manifest, and creates an RCTRO implementation issue via the existing IssueCreator pipeline | `webview/ScaffoldPanel.ts` (or wherever code-repo scaffold lives) | The code-repo side of the cross-repo bridge; Cheshire's single contribution to the research/PRD pipeline |

### Additional surfaces for the auditor-grade audit artifacts (added in design review v2)

These are new code surfaces that arose from making the audit a first-class published artifact and adding the PRD grounding reviews.

| Surface | What needs to be added | File | Why |
|---|---|---|---|
| **Hash-chain helper** | `packages/research-runner/src/audit/hash-chain.ts` — pure function `appendEvent(prev_hash, event) → { event_hash, prev_event_hash }`. Canonical-JSON normaliser. `verifyChain(jsonl) → OK \| TamperedAt(index)`. | runner package | Every event in the JSONL needs to carry a chain link; without this the audit log is not tamper-evident |
| **Audit report template** | `packages/research-runner/templates/audit-report.hbs` (or equivalent) — versioned Handlebars template that projects JSONL events into the human-readable `<topic>.audit.md`. Template ships with the runner and is itself versioned (Hatter's Tag carries `template_version`). | runner package | The `.audit.md` artifact is deterministic projection of events; needs a versioned template |
| **AuditReport schema** | `packages/research-runner/src/schemas/audit-report.zod.ts` — defines `<topic>.audit.json` shape (run summary, mesh context summary, queries by provider, LLM invocations, mesh artifacts cited, hash chain array). | runner package | The machine-readable audit summary needs a Zod schema; Looking Glass scorer reads it |
| **`research-runner verify-audit` subcommand** | New CLI verb that recomputes the hash chain, compares `audit_log_hash` to Hatter's Tag, compares `output_hash` to sha256 of deliverable. Returns OK or specific failure. | runner package | Reviewers + CI need a one-command verification path |
| **OWASP catalog** | `packages/research-runner/data/owasp-top10.json` (versioned, ships with runner). Maps endpoint shapes → applicable OWASP categories (auth touches → A07, user input → A03, etc.). | runner package | `security_review` node needs a deterministic catalog to compare against |
| **`MeshReader.readThreatModel(barId, scope?)` deeply parsed** | Returns `StrideEntry[]` with `{ id, category, asset, threat, mitigation, status }`. Currently only detects presence. | `core/mesh-reader.ts` | `security_review` needs structured STRIDE entries to compute coverage |
| **`MeshReader.scopeStrideToManifest(stride[], manifest) → relevant[]`** | Filters STRIDE entries to those that apply to the endpoints / flows the PRD touches. | `core/mesh-reader.ts` | Coverage % needs the *applicable* denominator, not the BAR's total STRIDE entries |
| **Grounding schemas** | `packages/research-runner/src/schemas/architecture-grounding.zod.ts`, `security-grounding.zod.ts`, `grounding-decision.zod.ts`. Plus extend `prd-manifest.zod.ts` to include `grounding:` block. | runner package | The two new pure review nodes + the publish gate need typed contracts |
| **Architecture review node** | `packages/research-runner/src/nodes/architecture-review.ts` — pure function. Reads PrdManifest + MeshContext; produces ArchitectureGrounding. | runner package | The deterministic "Oraculum at PRD time" architecture check |
| **Security review node** | `packages/research-runner/src/nodes/security-review.ts` — pure function. Reads PrdManifest + STRIDE + OWASP catalog + NIST. Produces SecurityGrounding. | runner package | The deterministic security-grounding check |
| **Verify-grounding node** | `packages/research-runner/src/nodes/verify-grounding.ts` — pure. Reads brief.grounding_mode + both grounding reports; returns publish-gate decision. | runner package | The deterministic publish gate; refuses to publish ungrounded PRDs in `strict` mode |
| **`PrdBrief.grounding_mode` field** | Extend `prd-brief.zod.ts` with `grounding_mode: z.enum(['strict', 'default', 'lenient']).default('default')` | runner package | Lets the brief explicitly choose the rigor level; captured in the Hatter's Tag for auditability |
| **`PrdBrief` loop fields** | Add `grounding_threshold: z.number().min(0.5).max(1.0).default(0.85)`, `max_iterations: z.number().int().min(1).max(5).default(3)`, optional `max_total_tokens: z.number().int()` | runner package | The iterative refinement loop needs explicit threshold + budget per brief; all four captured in Hatter's Tag |
| **`LoopDecision` schema + `verify_grounding` cyclic logic** | `packages/research-runner/src/schemas/loop-decision.zod.ts`. `verify_grounding` node returns `PASS \| ITERATE \| EXHAUSTED \| FAILED` with `feedback`, `iteration`, `improvement_from_previous`. Includes convergence guards: max iterations, no-improvement detection (gap-set equality), token budget. | runner package | The publish gate's four-way decision is the loop's control plane |
| **`composeFeedback(arch, sec) → GapFeedback`** | `packages/research-runner/src/nodes/compose-feedback.ts` — pure function that turns the two grounding reports into a structured feedback supplement for the next synthesis prompt. Preserves "what to keep" vs "what to change" semantics. | runner package | Mid-iteration LLM drift is the failure mode this prompt structure mitigates |
| **PRD runner — cyclic graph executor** | `packages/research-runner/src/runner/prd.ts` — implements the cyclic graph (not a linear pipeline). Tracks iteration count, accumulates token totals across iterations, emits `iteration_summary` events between iterations. | runner package | The graph is no longer linear; needs a small node-runner that knows how to follow the ITERATE edge back to `synthesize_prd` |
| **`iteration_summary` audit event** | New event kind in `audit-event.zod.ts`. Emitted by `verify_grounding` on each ITERATE / PASS / EXHAUSTED / FAILED decision. Includes `scores`, `decision`, `improvement_from_previous` (with `gaps_resolved[]` and `gaps_remaining[]`). | runner package | The score progression table in `audit.md` is derived from these events |
| **Audit.md template — score progression section** | Extend `audit-report.hbs` to render the iteration trajectory table from the `iteration_summary` events. Renders only on PRD audits (Archeologist has no loop in v1). | runner package | The auditor's view of "how the PRD earned its score" |

### Surfaces for the NCMS semistructured prompt format (added in design review v3)

These surfaces support the canonical prompt format with markdown `##` sections, curly-brace `{placeholder}` substitution, and ID-based bidirectional traceability (R[N], E[N], FR-NN, NFR-NN, THR-NNN, A0X, ADR-NNNN, NIST-XX-NN).

| Surface | What needs to be added | File | Why |
|---|---|---|---|
| **Pack frontmatter schema** | `packages/research-runner/src/schemas/prompt-pack.zod.ts` — defines required frontmatter (`name`, `id`, `version`, `applies-to`, `maintainer`, `output-format: markdown-with-tables \| json-only \| structured-review`) | runner package | Validates every pack at load time; runner refuses to run a pack with malformed frontmatter |
| **Template substitution + fingerprint** | `packages/research-runner/src/llm/render-prompt.ts` — pure function that resolves `{placeholder}` against an input context, normalises whitespace, computes the SHA-256 `prompt_fingerprint` recorded in audit events. Identical to the NCMS f-string convention. | runner package | Reproducibility: same context + same pack version → same fingerprint |
| **Section structure validator** | `packages/research-runner/src/llm/validate-structure.ts` — given a pack's `output-format` and the LLM's response, confirms required `##` sections are present (per canonical lists above). Fails fast on structural drift; triggers the single retry path. | runner package | Catches LLM omissions before the reviewers do |
| **ID citation parser** | `packages/research-runner/src/llm/parse-citations.ts` — regex-extracts `R\d+`, `E\d+`, `FR-\d{2}`, `NFR-\d{2}`, `THR-\d{3}`, `A0[1-9]\|A10`, `ADR-\d{4}`, NIST `[A-Z]{2}-\d{1,2}` patterns from PRD body. Returns `Map<requirement_id, cited_ids[]>`. | runner package | Foundation for both `architecture_review` and `security_review` deterministic checks |
| **`SecurityGrounding.invalid_citations` + `coverage_discrepancies` fields** | Extend `security-grounding.zod.ts` with the two new fields documented above. `security_review` node populates them by intersecting parsed citations with `MeshContext.bar.threats` / OWASP catalog / portfolio NIST. | runner package | Hallucinated-citation and coverage-self-report-mismatch detection. ONLY possible because of the prompt format. |
| **`ArchitectureGrounding.invalid_citations`** | Same idea for architecture: intersect cited `ADR-NNNN` and CALM node names against `MeshContext.bar.adrs` and `MeshContext.bar.calm_model.nodes`. | runner package | Same as above for architecture side |
| **Coverage Analysis parser** | `packages/research-runner/src/llm/parse-coverage.ts` — parses the required `## Coverage Analysis` section's table into `Map<premise_id, 'YES' \| 'PARTIAL' \| 'NO'>`. | runner package | Feeds `coverage_discrepancies` computation — the self-report vs grep-evidence cross-check |
| **Seed pack library** | Initial `.caterpillar/prompts/` packs committed to mesh templates. Research side: `research/query-plan@v1.0.0` (per-provider tuning), `research/gap-analysis@v1.0.0` (bounded follow-up loop), `research/synthesis@v1.0.0` (10-section certificate + S/C IDs), `research/synthesis-archaeology@v1.0.0`. PRD side: `prd/ask-experts-architect@v1.0.0`, `prd/ask-experts-security@v1.0.0` (NCMS `*_KNOWLEDGE` pattern), `prd/synthesis@v1.0.0` (R/E/FR-NN/THR-NNN + Coverage Analysis + HIGH/MEDIUM/LOW confidence), `prd/manifest@v1.0.0` (json-only), `prd/architect-expert-review@v1.0.0`, `prd/security-expert-review@v1.0.0` (NCMS `*_REVIEW` SCORE/SEVERITY/COVERED/MISSING/CHANGES pattern). All hand-authored from the NCMS reference. | mesh repo (scaffolded by Looking Glass) | The system has nothing to run on day one without these |

### Surfaces for the multi-expert review pattern (added in design review v4)

| Surface | What needs to be added | File | Why |
|---|---|---|---|
| **Parallel LLM dispatcher** | `packages/research-runner/src/runner/parallel.ts` — small `Promise.all`-based helper that runs N LLM calls concurrently, captures per-call audit events with consistent timestamps, surfaces any single-call failure to the loop control | runner package | `ask_experts_architect` + `ask_experts_security` (nodes 4a+4b) and the four review nodes (7a-d) all fan out in parallel |
| **MeshContext slicers** | `packages/research-runner/src/llm/mesh-slicers.ts` — `renderMeshForArchitect(mc)` (CALM + ADRs + arch pillar) and `renderMeshForSecurity(mc)` (threats + controls + OWASP + security pillar + security mesh_gaps). Pure functions, deterministic output. | runner package | Each expert persona reads a different slice of the mesh; slicers keep the prompt sizes bounded and the audit log records which slice each persona saw |
| **`structured-review` parser** | `packages/research-runner/src/llm/parse-structured-review.ts` — regex parser for the NCMS `SCORE: N\nSEVERITY: X\nCOVERED:\n- ...\nMISSING:\n- ...\nCHANGES:\n1. ...` format. Returns a typed `StructuredReview` object. Used by both expert review nodes. | runner package | Without this parser the LLM expert reviews can't feed the verify_grounding gate |
| **`ArchitectExpertReview` + `SecurityExpertReview` schemas** | `packages/research-runner/src/schemas/expert-review.zod.ts` — Zod types matching the `structured-review` parser output | runner package | Type safety + audit-event schema validation |
| **`verify_grounding` updated to read 4 signals** | Update `verify_grounding` to consume `arch_pure`, `sec_pure`, `arch_llm`, `sec_llm` and apply the both-must-pass rule + disagreement detection (≥0.2 delta triggers ITERATE regardless of which side is higher) | runner package | The publish gate now combines deterministic + LLM signals; without this update the LLM reviews are observation-only |
| **Audit.md score progression table — 4 columns** | Update `audit-report.hbs` to render Arch (pure), Arch (LLM), Sec (pure), Sec (LLM) per iteration | runner package | Auditor sees both signals per iteration and the disagreement column |
| **GapFeedback composer reads all 4 reviewers** | Update `composeFeedback()` to merge findings from `arch_pure.invalid_citations + missing_calm_references` + `sec_pure.invalid_citations + coverage_discrepancies + missing_threats` + `arch_llm.MISSING + arch_llm.CHANGES` + `sec_llm.MISSING + sec_llm.CHANGES` into a single structured feedback document for the next iteration | runner package | The next-iteration prompt needs to address all four reviewer perspectives, not just the pure-function ones |
| **`research/gap-analysis` runner branch** | Update Archeologist runner to conditionally execute `gap_analysis` (LLM) + `tavily_search_followup` (pure API, 3 queries max) when the first dedupe pass shows weak coverage. Bounded: only one extra round per run. | runner package | The NCMS-style follow-up search loop; ships with v0.5 alongside the additional search providers |

### Surfaces for the guardrail layer (added in design review v5)

A self-contained guardrail layer running on every LLM call and every API-boundary node. No external moderation services in v1; everything is pure TypeScript with versioned pattern catalogues.

| Surface | What needs to be added | File | Why |
|---|---|---|---|
| **`GuardrailReport` + `GuardrailCheck` schemas** | `packages/research-runner/src/schemas/guardrail.zod.ts` — typed shape of the per-hop guardrail report that becomes a `guardrail_check` audit event | runner package | Audit-event schema validation; reviewers/dashboards consume it |
| **Guardrail orchestrator** | `packages/research-runner/src/guardrails/orchestrator.ts` — wraps every node that crosses a trust boundary. Loads the active check set per `--guardrails strict\|default\|lenient` mode. Runs checks in parallel, aggregates verdicts, emits the audit event, decides PASS / WARN / BLOCK. | runner package | The control flow that makes guardrails non-bypassable on sanctioned runs |
| **Check: `prompt-injection-detection`** | `packages/research-runner/src/guardrails/checks/prompt-injection.ts` — regex catalogue + Unicode hidden-char detection. Catalogue versioned (`v1.0.0`) and recorded in audit event metadata. | runner package | The most likely failure mode for any agent ingesting external content (mesh + research + web results) |
| **Check: `pii-detection`** | `packages/research-runner/src/guardrails/checks/pii.ts` — regex for emails, phone numbers, SSNs (US), credit cards (Luhn-validated), IPs. Pluggable for org-custom patterns via config file. Always returns **redacted** evidence (position + kind + count, never the value). | runner package | Most regulated industries require this; redacted evidence keeps the audit log itself PII-clean |
| **Check: `secrets-detection`** | `packages/research-runner/src/guardrails/checks/secrets.ts` — same regex catalogue Snyk's secret-scanner uses (AWS / GitHub / OpenAI / Slack / JWT / RSA-PEM). Pluggable per org. | runner package | Consistency with the code-side secret scanning the team already runs |
| **Check: `token-budget`** | `packages/research-runner/src/guardrails/checks/token-budget.ts` — tracks cumulative tokens against `brief.max_total_tokens`. Estimates the next call's tokens from the prompt content. | runner package | Cost cap; works alongside the iteration loop's `max_total_tokens` convergence guard |
| **Check: `provider-allowlist` + `prompt-pack-version-pin` + `mesh-sha-pin`** | `packages/research-runner/src/guardrails/checks/policy.ts` — three small policy checks; read org policy from `mesh/.caterpillar/guardrail-policy.yaml` (configurable per mesh). | runner package | Drift detection: catches a run that's silently moved off the agreed-upon provider, pack version, or mesh state |
| **Check: `pii-leakage` + `secrets-leakage`** | Re-use the input PII/secrets detectors against output. One file per check that calls the shared regex catalogue. | runner package | Catches the LLM echoing or regurgitating sensitive content |
| **Check: `id-hallucination`** | `packages/research-runner/src/guardrails/checks/id-hallucination.ts` — parses cited IDs via `parse-citations.ts`, intersects with MeshContext / OWASP catalog / research source list. Returns warnings for IDs that don't exist. | runner package | Same data as `SecurityGrounding.invalid_citations`; surfaces it as a guardrail event so it can be blocked in strict mode |
| **Check: `citation-completeness` + `length-sanity` + `format-compliance`** | One file per check; all simple structural validators. | runner package | Catches truncated responses and malformed structure before the schema validator runs (faster failure path) |
| **Check: `harmful-content`** | `packages/research-runner/src/guardrails/checks/harmful-content.ts` — curated keyword/category catalogue v1.0.0. Pluggable for org-specific terms. Documented as a v1 placeholder for what becomes a real moderation API call in v2. | runner package | Minimal safety net for v1; honest about the limit |
| **`mesh/.caterpillar/guardrail-policy.yaml`** | Per-mesh config file: declares allowed providers, custom PII patterns, custom secret patterns, override severities per check. Scaffolded by Looking Glass alongside the workflow files. | mesh repo | Lets each org tune guardrails without forking the runner |
| **`research-runner check-guardrails <run_id>` CLI verb** | `packages/research-runner/bin/research-runner.js` — re-runs every guardrail against an existing audit log. Reports any reproducibility delta. | runner package | CI fitness function for audit-bearing PRs; post-incident replay tool |
| **Audit.md template — Guardrail Summary section** | Extend `audit-report.hbs` with the per-hop check table + warning details list + blocks section. | runner package | The auditor's single-page view of guardrail activity across the run |
| **`PrdBrief` / `ResearchBrief` `guardrails_mode` field** | Extend both brief schemas with `guardrails_mode: z.enum(['strict', 'default', 'lenient']).default('default')` | runner package | Brief-level override of the workflow's mode |
| **Iteration loop guardrail integration** | Update `verify_grounding` to surface the iteration's guardrail decision alongside grounding scores in `iteration_summary` events. Update `composeFeedback` to include guardrail warnings in the next iteration's `GapFeedback`. | runner package | Guardrail warnings get a chance to be addressed by the LLM in the next iteration, just like grounding gaps |

### Surfaces for the Looking Glass UX integration (added in design review v6)

The end-to-end user flows above require non-trivial extension UI work. This complements the earlier mesh-side code surfaces table.

| Surface | What needs to be added | File | Why |
|---|---|---|---|
| **Settings UI — Research section** | Extend the existing Looking Glass Settings panel (gear icon) with: TAVILY_API_KEY input (masked, with Test + Push-to-GitHub actions), OPENAI_API_KEY equivalent if not already present, research LLM provider dropdown, default guardrails mode, default grounding mode, default grounding threshold, default max iterations, default cost cap, search provider preference | `webview/LookingGlassPanel.ts` settings sub-panel + `services/SecretsService.ts` | The Settings UI is where users supply the secrets and tune the defaults; without this the user has no way to configure Tavily |
| **`SecretsService`** | New service: read/write VS Code secret store, validate keys against provider endpoints (Anthropic `/v1/messages` one-token ping; OpenAI `/v1/models`; Tavily `/v1/account`; Azure probe), push to GitHub repo secrets via `gh api`, report sync status | `services/SecretsService.ts` | Centralises the dual-storage logic; both Settings UI and pre-flight check use it |
| **Pre-flight check** | New service: runs the 9-check pre-flight (mesh.yaml fields, workflows present, prompt packs present, GitHub secrets set, write access, BAR validity, cost estimate). Cached for 5 minutes per mesh-repo. | `services/ResearchPreflightService.ts` | Catches the most common failure modes before the user pays the dispatch latency |
| **New Research modal** | A webview-rendered modal form opened by the `maintainabilityai.newResearch` command. Fields per Flow 1. Validates inputs, calls dispatch on confirm. | `webview/NewResearchPanel.ts` + `webview/app/newResearch.ts` (small IIFE for the modal) | The primary entry point for Flow 1 |
| **Active Runs sub-panel** | New tab/sub-panel inside Looking Glass. Shows list of dispatched runs with status (queued/running/blocked/complete), current node, scope, started_at, links to workflow + PR. Polling cadence 30s/60s/5min. | `webview/LookingGlassPanel.ts` + new `services/ActiveRunsService.ts` | Without this, the user dispatches a run and has no idea what's happening |
| **Status-streaming from audit log** | `services/RunStatusTailer.ts` — given a workflow run ID, tails the audit JSONL artifact for `node_complete` events; parses out the current node name; updates the Active Runs panel UI | `services/RunStatusTailer.ts` | Polling GitHub Actions API for status gives `in_progress` only; tailing the audit gives the actual node name. Cheaper too. |
| **Oraculum Findings sub-panel** | New tab/sub-panel showing open Oraculum issues with one-click "Investigate" action that adds the `research-request` label via API and opens the New Research modal pre-filled from the issue | `webview/LookingGlassPanel.ts` + `services/OraculumIntegrationService.ts` | Makes the Oraculum→research flow a one-click bridge instead of a manual label-add |
| **Research Library sub-panel** | New tab/sub-panel: BAR-grouped tree of historical research and PRDs. Click → opens the file or the PR. | `webview/LookingGlassPanel.ts` | Lets users browse what's been produced; complements the BarService.listResearch/listPrds methods added in the earlier code surfaces table |
| **Notifications layer** | `services/RunNotificationService.ts` — VS Code notification API integration. Wraps Run dispatched / Status changed / Run complete / Run failed / Run blocked. Each has action buttons (View Run / View PR / View Audit / Dismiss). | `services/RunNotificationService.ts` | Without notifications the user has to keep the Looking Glass panel open to know anything is happening |
| **Workflow dispatch wrapper** | `services/WorkflowDispatchService.ts` — wraps `POST /repos/{owner}/{repo}/actions/workflows/{wf}/dispatches`. Handles auth, payload construction, error mapping (403, 422), retry on transient errors. | `services/WorkflowDispatchService.ts` | The Settings UI + New Research modal + Investigate action all dispatch workflows; centralised wrapper avoids three duplicate impls |
| **Project trigger workflow generator** | A 5th workflow Looking Glass scaffolds into the mesh repo: `archeologist-trigger-on-project-move.yml` that handles `projects_v2_item` webhooks, reads card custom fields, calls `workflow_dispatch` on `archeologist.yml`. Optional (only generated if the user opts into Projects integration during scaffold). | `services/MeshService.writeResearchWorkflows()` (extend) | Flow 2 (PM-driven via Projects) depends on this; without it Project moves don't trigger anything |
| **Project card custom-fields schema** | Documented schema for the Projects integration: BAR ID (text, required), Platform (single-select), Depth (single-select), Brief (long-text, required). Looking Glass setup wizard creates these fields on the Project the first time scaffolding is run. | docs + `services/MeshService.ts` setup helper | Flow 2 only works if the Project has the right fields |
| **Comment-trigger workflow** | Update `archeologist.yml` generator to include the `issue_comment` trigger with the regex pattern (`@claude please research X` OR `@github please research X`). Brief extraction logic in the workflow's first step. | `services/MeshService.writeResearchWorkflows()` (extend `archeologist.yml`) | Flow 4 |
| **`research-runner promote-to-pr` CLI verb (v1.1)** | Promote a local-run output directory to a sanctioned PR. Re-runs `verify_and_trigger`-equivalent on the local outputs, opens a PR, audit log marked `trigger: { kind: 'promoted-from-local', original_local_run_at: <ts> }` | runner package | Lets contributors iterate locally then promote a good result without re-running the whole pipeline |

**None of these require structural refactors.** All are additive: new methods on existing services, new generators following existing patterns, new commands in `package.json`. Estimated effort: ~2-3 sprints of focused work *before* the runner package can produce a useful run.

### Implementation order revised — extension first, runner second

The audit revealed that the runner (`packages/research-runner/`) cannot be useful in isolation: even the simplest research run needs `gather_mesh_context` to read mesh artifacts, which needs the new `MeshService` / `BarService` / `GovernanceScorer` methods above. So v0.2 starts in the extension, not in the runner.

---

## Roadmap

| Version | Scope | Status |
|---|---|---|
| **v0.1** | This design doc | Done |
| **v0.2** | Extension code surfaces #1-5 above (mesh_gaps enum + research/PRD listing + freshness scoring + mesh SHA + tier in service layer). Tests cover each. No runner yet. | next |
| **v0.3** | Runner package skeleton (`packages/research-runner/`) + Zod schemas (`audit-event`, `MeshContext`, `ResearchBrief`, `QueryPlan`, `ResearchDoc`, `PromptPack`, `GuardrailReport`) + audit emitter + **prompt-pack loader with frontmatter validation** + **template substitution and prompt_fingerprint helpers** + **citation/coverage parsers** + **guardrail orchestrator + the v1 check catalogue** (prompt-injection, pii, secrets, token-budget, policy, schema-validity, pii-leakage, secrets-leakage, id-hallucination, citation-completeness, length-sanity, format-compliance, harmful-content) + `research-runner check-guardrails` CLI verb. Seed prompt packs (`research/query-plan@v1.0.0`, `research/synthesis@v1.0.0`) hand-authored against the NCMS reference. Runs `gather_mesh_context` + a stubbed LLM call end-to-end locally with full guardrail logging. | sprint 2 |
| **v0.4** | Archeologist research path MVP: validate_brief → gather_mesh_context → plan_queries (LLM, using `research/query-plan@v1.0.0` with NCMS per-provider tuning: 5 web NL queries with year + 3 arxiv short tech + 3 patent AND-joined + 3 HN-style) → tavily_search → dedupe → synthesize_report (LLM, using `research/synthesis@v1.0.0` — full 10-section certificate with S[N]/C[N] IDs + HIGH/MEDIUM/LOW confidence) → publish → verify_and_trigger. Tavily + DuckDuckGo fallback only. **All three audit artifacts published** + raw JSONL + hash-chained events + `verify-audit` CLI subcommand. Hatter's Tag YAML in PR body. | sprint 3 |
| **v0.5** | Add arXiv + USPTO + HN nodes. Add archaeology path with tree-sitter `analyze_architecture` + `identify_gaps` (using `research/synthesis-archaeology@v1.0.0`). **Add bounded `gap_analysis` follow-up loop** (NCMS pattern: one extra round of 3 web queries when first-pass coverage is weak; using `research/gap-analysis@v1.0.0`). Test against the celeb-api repo. | sprint 4 |
| **v0.6** | PRD agent end-to-end with **multi-expert grounding + cyclic refinement loop**. Two parallel knowledge experts (`prd/ask-experts-architect@v1.0.0` + `prd/ask-experts-security@v1.0.0`, NCMS `*_KNOWLEDGE` pattern, deep mode only) feed `synthesize_prd` (using `prd/synthesis@v1.0.0` with R/E/FR-NN/NFR-NN/THR-NNN/A0X/ADR-NNNN/NIST schemes + Coverage Analysis section + HIGH/MEDIUM/LOW confidence ratings). Then **four parallel review nodes**: deterministic `architecture_review` + `security_review` (citation-grep, populating `invalid_citations` + `coverage_discrepancies`) AND LLM `architect_expert_review` + `security_expert_review` (NCMS `*_REVIEW` `structured-review` format producing SCORE/SEVERITY/COVERED/MISSING/CHANGES). `verify_grounding` reads all 4 signals + applies the both-must-pass rule + disagreement detection (≥0.2 delta triggers ITERATE). Cyclic loop with convergence guards. `iteration_summary` audit events produce a 4-column score progression table in `audit.md`. `GapFeedback` composer merges findings from all 4 reviewers. Mesh-repo cross-agent handoff via labels. LLM provider pluggability tested with both Anthropic and OpenAI adapters. OWASP catalog v2026-04 shipped with runner. | sprint 5 |
| **v0.7** | Cross-repo bridge: `GitHubService.dispatchRepository`, `notify-code-repos.yml` generator, Cheshire's new `spec-ready-handler.yml` generator. PRD manifest consumed by Cheshire RCTRO issue generator on the code repo. | sprint 6 |
| **v0.8** | Looking Glass UX integration: **Settings UI Research section** (Tavily key + LLM provider + research preferences, with Test + Push-to-GitHub actions and `SecretsService`), **pre-flight check** (`ResearchPreflightService` with 9-check cached validation), **New Research modal** (`NewResearchPanel` webview with full form + cost estimation + confirmation dialog), **Active Runs sub-panel** (live status with `ActiveRunsService` + `RunStatusTailer` polling cadence 30s/60s/5min, parsing audit-log JSONL for current-node display), **Oraculum Findings sub-panel** with one-click Investigate action, **Research Library sub-panel** (BAR-grouped tree of historical research/PRDs), **Notifications layer** (`RunNotificationService` for dispatch/status/complete/blocked with action buttons), **`WorkflowDispatchService`**, optional Project-trigger workflow generator + Project custom-fields setup helper, comment-trigger pattern in `archeologist.yml`. End-to-end click-to-trigger for all 4 user flows (Looking Glass / Projects / Oraculum / Comment). | sprint 7 |
| **v0.9** | Oraculum integration: existing Oraculum findings can be labelled `research-request` to trigger the Archeologist. Closes the full Looking-Glass→research→PRD→implementation→Looking-Glass self-healing loop. | sprint 8 |
| **v1.0** | Public docs walkthrough; workshop Part 8 (Through the Looking Glass) extended to include the full chain as the capstone exercise. | release |
| **v1.1** | Optional local subprocess for individual contributors (`npx research-runner archeologist --local`); never produces a PR, always tagged `trigger: local` in audit. Per-BAR sibling-repo override for output destination. | post-release polish |
| **v2.0** | AI Foundry deployment target (same CLI, swapped runtime, Foundry-native audit mirror). | enterprise upgrade |
| **v2.1** | Research MCP server (`@maintainabilityai/research-mcp`) — exposes the runner's audit + status to other MCP clients. | when there is a second consumer |

---

## What this design intentionally does NOT do

- **Does not place these agents in Cheshire.** Cheshire is execution-time. Research and PRD are intent — they belong to Looking Glass at the BAR/Platform level in the governance mesh.
- **Does not put research workflows in code repos.** Default destination is the mesh repo. A code repo can be a *consumer* of a merged PRD (via `spec-ready-handler.yml`) but is never the origin or owner of the artifact.
- **Does not introduce MCP for the data-acquisition nodes.** Determinism is the point; MCP would re-introduce LLM-driven fan-out where we explicitly want pure functions.
- **Does not publish to wiki.** Wiki bypasses the PR audit gate.
- **Does not ship a Python runtime by default.** The TypeScript CLI is the stable interface; a future Python implementation can sit behind the same CLI without disrupting consumers.
- **Does not auto-publish without human review.** Every research output and every PRD ships as a PR in the mesh repo. The PO/architect is in the loop for every deliverable that feeds a decision. Cross-repo dispatch to the code repo only fires after the mesh PR merges.
- **Does not collapse mesh and code into one audit chain.** Each repo has its own `.research-audit/` (mesh) or `.cheshire/issue-audit/` (code). They are joined by `project_id`, not merged. This is what makes mesh-repo permissions independent of code-repo permissions.
- **Does not embed Cheshire knowledge in Looking Glass or vice versa.** Looking Glass scaffolds the mesh-side workflows; Cheshire scaffolds the one code-side handler workflow. Neither subsystem reaches into the other's repo.
- **Does not publish PRDs that fail strict grounding.** When `brief.grounding_mode === 'strict'`, the `verify_grounding` node refuses to publish if architecture or security has unresolved gaps. The run emits `outcome: 'failed'` with the gaps documented in the audit. No PR is opened. (Default mode publishes with gaps documented prominently; lenient mode surfaces only in audit.)
- **Does not let the LLM choose which mesh artifacts to cite.** Citations are produced by the deterministic `architecture_review` and `security_review` nodes from the structured PRD manifest. The LLM writes the prose; the pure functions write the citations. This is what makes the audit verifiable rather than narrative.
- **Does not derive the OWASP catalog from the web.** Catalog is versioned and shipped with the runner (currently OWASP Top 10 v2026-04). When OWASP refreshes, the runner gets a version bump; every audit log records the catalog version used so historical PRDs are traceable to the catalog they were checked against.
- **Does not depend on external moderation APIs for guardrails in v1.** The guardrail layer is pure TypeScript with versioned pattern catalogues — runs fully self-contained on a stock GitHub Actions runner. v2 may add OpenAI Moderation, AWS Comprehend, Microsoft Purview, or Presidio for ML-based PII as opt-in upgrades, but the layer's v1 contract (PASS / WARN / BLOCK with redacted-evidence audit events) stays the same regardless of provider.
- **Does not log PII or secrets in evidence fields.** Guardrail audit events record *position + kind + count* of detected PII / secrets — never the value. The audit chain itself stays clean even when the content it's auditing wasn't.
- **Does not let `lenient` mode be the default.** Workflow templates default to `default` mode (PII / harmful-content as warnings, all other safety checks as blocks). `lenient` exists for early exploration and is documented as never appropriate for sanctioned runs.

---

## Implementation order recommendation

1. **Land the audit schema first** (`packages/research-runner/src/schemas/audit-event.zod.ts` + emitter). Tests produce sample audit logs that match the published JSONL shape. Runs locally; no repo dependency yet.
2. **Stub the Archeologist research path** with only web + synthesize (the MVP). Run locally first (`--local`). Confirm the rendered doc + Hatter's Tag + audit log all validate.
3. **Land in the mesh repo end-to-end.** Add `archeologist.yml` to a test mesh repo manually; trigger via labelled issue; confirm PR opens in `platforms/<plat>/bars/<bar>/research/`. This is the first time the agent touches GitHub.
4. **Add arXiv / USPTO / HN** one at a time. Each adds a node; each ships with its own fitness function (asserts audit emission per node).
5. **Add the archaeology path** (clone_and_index + tree-sitter analyze_architecture + identify_gaps + web_research). This is the more complex of the two; ship the simpler research path first.
6. **PRD agent.** Simpler pipeline (7 nodes vs 10) and reuses the audit + Hatter's Tag + verify_and_trigger patterns.
7. **Cross-agent bus in mesh repo.** `label-on-merge.yml` handles research-merge → `prd-ready` and PRD-merge → `spec-ready`.
8. **Cross-repo bridge.** `notify-code-repos.yml` in mesh + `spec-ready-handler.yml` in code repo. Cheshire's existing RCTRO issue generator consumes the manifest from the merged mesh PR.
9. **Looking Glass UI.** Right-click BAR/Platform → "New Research"; menu command "Scaffold Research + PRD Workflows" that writes the four mesh-side workflows.
10. **Scorer integration.** Looking Glass reads BAR-directory research/PRD presence and freshness into the Architecture pillar.
11. **Public docs.** Extend Workshop Part 8 (Through the Looking Glass) to ship one research → PRD → implementation chain as the capstone exercise. This is where the workshop's mental model and the framework's architecture finally lock together.

---

**Owner:** TBD.
**Reviewers:** workshop authors + extension maintainers.

## Decisions locked for v1

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Runner language | **TypeScript** (`packages/research-runner/`, mirrors `redqueen-mcp` packaging) | Single-stack repo; reuses team's existing package pattern; Actions runner has Node 20+ pre-installed; CLI contract is the stable boundary if a future Python implementation is desired |
| 2 | Prompt pack location | **`.caterpillar/prompts/`** in the **mesh repo** (NOT `.cheshire/`, which is code-repo-only) | Caterpillar owns governance/intent prompts; Cheshire owns implementation/execution prompts; distinct directories make audience and review responsibility obvious |
| 3 | Default output destination | **Mesh repo only** for v1; per-BAR sibling-repo override in v1.1 if needed | Single canonical path first; configuration surface grows only when a real team asks |
| 4a | Search provider | **Tavily** primary, **DuckDuckGo** fallback when no Tavily key configured | LLM-friendly excerpts; DuckDuckGo fallback keeps free-tier path functional; audit marks `provider: tavily \| duckduckgo-fallback` |
| 4b | Synthesis LLM provider | **Pluggable via `--llm-provider {anthropic,openai,azure-openai}`**. Default = `anthropic` for `agent_type: claude` teams, `openai` for `agent_type: copilot` teams. Independent of `agent_type` (which governs code-repo implementation agent, not governance synthesis) | A Copilot-aligned team shouldn't be forced to add `ANTHROPIC_API_KEY` for governance work; a Claude-aligned team shouldn't be forced into OpenAI. Same Zod-validated output shape regardless of provider. |
| 4c | Mesh as expert | `gather_mesh_context` pure node feeds every LLM call. `ask_experts` (PRD) is grounded in `MeshContext.bar.mesh_gaps` and pillar scores — not free-fire questions. | The mesh IS the expert. Hallucinated clarifying questions are worse than no questions; mesh-grounded ones are auditable. |
| 4d | Required secrets | New: `TAVILY_API_KEY`. Per-provider: `ANTHROPIC_API_KEY` OR `OPENAI_API_KEY` OR `AZURE_OPENAI_API_KEY` (+ `AZURE_OPENAI_ENDPOINT`). Auto: `GITHUB_TOKEN`. | Teams pick the LLM provider they already use; only Tavily is a brand-new secret |
