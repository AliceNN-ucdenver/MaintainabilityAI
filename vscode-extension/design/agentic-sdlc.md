# Agentic SDLC — Design (v2)

End-to-end agent-orchestrated pipeline from **market research → PRD → design**, grounded in the governance mesh (CALM, threat models, ADRs, prior research, reference repos), with full auditable provenance and a Looking Glass-surfaced OKR anchor.

**v2 changes from v1**:
- Research-runner becomes a **Skill** the market-research-agent invokes (not a parallel pipeline).
- **Bounded reviewer recycle loop** with explicit state machine (max 2 auto-rounds → human gate).
- **OKR Card** modeled as a BTABoK card (matches Business/Applications/Policies) with 9 sections.
- **OKR ↔ Platform linkage** is explicit; the What lens picks the right code repos.
- **Worked IMDB Lite sample** showing a populated OKR end-to-end against the existing seed.

**v2.1 refinement (this update)**:
- **Skills are PURE data Skills** — zero nested LLM calls. The Copilot Coding Agent does ALL reasoning (query generation, gap analysis, expert synthesis, document writing) with its own model.
- Search Skills are individual primitives (`tavily-search`, `arxiv-search`, etc.) — the agent picks which to invoke and with what queries.
- "Expert Skills" become **context Skills** that return structured mesh data (CALM model, threat library, ADRs); the agent does the reasoning itself.
- Drops the GH-Models dependency for plan_queries + gap_analysis entirely. 429s on the runner's LLM hops become moot for the agent-driven flow.
- `research-runner` keeps existing for the legacy CI-only path; agent-driven path replaces it.

---

## 1. Why this design

Today (post-Phase-7) we have:

- **research-runner** (data-collection mode) runs in CI, produces an issue comment + audit JSONL.
- **Oraculum panel** drives assignment (`@claude` / `@copilot`) on `oraculum-research` / `oraculum-review` issues.
- **Synthesis** runs as the assigned coding agent reading `.caterpillar/prompts/research/synthesis.md`.
- **PRD agent** exists in research-runner but only as a single-LLM-call pipeline (not yet agent-driven).
- **No design agent. No expert sub-agents. No skills.**
- **Audit chain** is per-runner; breaks across agent hops.

The user's ask is a true multi-agent pipeline where:

1. **Market-research agent** invokes search Skills (Tavily, USPTO, arXiv, HN) and loops on gaps it detects itself.
2. **PRD agent** invokes expert Skills (Architect, Security) grounded in mesh artifacts to anchor requirements.
3. **Design agent** invokes experts + reference-repo Skills + mesh Skills + PRD knowledge to produce a code-grounded design.
4. **Architect-reviewer + security-reviewer** agents auto-fire on each artifact PR for governance scoring, with a **bounded recycle loop**.
5. **OKR section** in Looking Glass anchors the pipeline — every OKR has Why (research) / How (PRD) / What (design), named, source-controlled, audited.
6. **All events captured** — what was searched, synthesized, decided, by whom — chain-linked via Hatter Tag `parent_run_id` across phases.

NCMS reference for personas: [archeologist_prompts.py / prd_prompts.py / design_prompts.py / expert_prompts.py](https://github.com/AliceNN-ucdenver/ncms/tree/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms).

---

## 2. Research findings — GitHub's agent primitives

What's first-class and what we have to compose around:

| Primitive | First-class? | What it gives us |
|---|---|---|
| Custom `.agent.md` in `.github/agents/` | ✅ | Named personas with system prompt, model, tool list. Invoked by `@copilot use the <name> agent`. |
| Skills (`SKILL.md` + scripts + references) | ✅ | Auto-discovered by description, shell-out to bundled scripts, chain via slash-commands. |
| Copilot Coding Agent | ✅ | Assignment-fired, isolated VM, always produces a PR for human merge. Cannot push to main / deploy / access local filesystem. |
| **Agent calls another agent (synchronous)** | ❌ | Not documented. We compose via Skills (mid-session) and workflows (between sessions). |
| **Skill calls another Skill (within one agent turn)** | ⚠ partial | Skills can chain via slash-commands the user types; no API-level Skill-A-invokes-Skill-B. |
| `sessionStart` / `sessionEnd` hooks | ✅ | Used for governance logging. We tie the audit-emit-event Skill to these. |

**Implication for our architecture**: experts (Architect, Security) become **Skills** the parent agent invokes mid-session for grounded answers; reviewers (architect-reviewer, security-reviewer) become **separate agent assignments** on the artifact PR. Same compositional power as NCMS's Python orchestrator, different shape.

---

## 3. Pipeline overview

```
Looking Glass — Portfolio
  ┌──────────┐ ┌─────────────┐ ┌─────────┐ ┌──────┐
  │ Business │ │ Applications │ │ Policies │ │ OKRs │ ⭐ new
  └──────────┘ └─────────────┘ └─────────┘ └──┬───┘
                                              │
   ┌──────────────────────────────────────────┘
   ▼
 OKR Card (BTABoK)
   • objective, keyResults, actions, alignment
   • why → research/<run>/synthesis.md
   • how  → prds/<run>/prd.md
   • what → per-repo designs (one per impacted BAR's code repo)
   • valueLearning ← retrospective from delivery
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1 — WHY: market-research-agent                            │
│   Skill calls: market-data-collection  → produces issue-update   │
│                  (wraps research-runner; loops on gap signals)   │
│                tavily | arxiv | uspto | hackernews               │
│                knowledge-mesh-bar / -platform / -threats / -adrs │
│                knowledge-okr  (read OKR card context)            │
│                audit-emit-event  (per skill call + final)        │
│   Output: research/<run>/synthesis.md + Hatter Tag               │
│   Reviewers: architect-reviewer + security-reviewer (PR)         │
└─────────────────────────────────────────────────────────────────┘
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2 — HOW: prd-agent                                        │
│   Skill calls: knowledge-research (read merged Phase 1 doc)      │
│                knowledge-mesh-* (CALM, threats, ADRs)            │
│                knowledge-code  (clone + index impacted repos)    │
│                architect-expert | security-expert                │
│                audit-emit-event                                  │
│   Output: prds/<run>/prd.md + manifest.yaml (target_repos)       │
│   Reviewers: architect-reviewer + security-reviewer (PR)         │
└─────────────────────────────────────────────────────────────────┘
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3 — WHAT: design-agent (fan-out per impacted repo)        │
│   Skill calls: knowledge-prd (read merged Phase 2 doc)           │
│                knowledge-code (the specific target repo)         │
│                knowledge-reference-repos                         │
│                architect-expert | security-expert                │
│                audit-emit-event                                  │
│   Output: <code-repo>/.governance/design.md + Hatter Tag         │
│   Reviewers: architect-reviewer + security-reviewer (PR)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. OKR Card — BTABoK structure

Modeled on the BTABoK card pattern already used by Business / Applications / Policies. Lives in the mesh as a YAML file + auto-generated index card view in Looking Glass.

### 4.1 File location

```
<mesh-root>/
  okrs/
    OKR-2026Q1-001-celeb-data-licensing/
      okr.yaml                # the BTABoK card
      why/
        research-doc.md       # Phase 1 output (after merge)
        manifest.yaml         # run_id, mesh_sha, search summary
      how/
        prd.md                # Phase 2 output
        manifest.yaml         # FR/SR traceability, target_repos
      what/
        designs/
          <owner-repo>/design.md     # Phase 3 outputs (per repo)
          <owner-repo>/manifest.yaml
      audit/
        chain-ladder.yaml     # parent_run_id ladder across phases
        events/               # per-run audit-event JSONLs
          RES-...jsonl
          PRD-...jsonl
          DSG-...jsonl
```

### 4.2 `okr.yaml` schema (BTABoK 9-section card)

```yaml
# OKR Card — BTABoK
meta:
  card: BTABoKItem                     # marker
  id: OKR-2026Q1-001                   # globally unique
  owner: shawnmccarthy
  status: draft | researching | prd-pending | design-pending | building | shipped | archived
  created_at: 2026-05-19T00:00:00Z
  updated_at: 2026-05-19T00:00:00Z

# Section 1 — Overview (what this card is)
overview:
  name: "OKR Card"
  description: "Defines a structured approach for setting objectives, measuring progress, and aligning with strategic outcomes."
  notes: "Bridges strategy and execution within BTABoK."

# Section 2 — How to use this card
howToUse:
  name: "How to use this card"
  description: |
    1. Draft the objective (concise, ambitious, aligned with org strategy).
    2. Define 3–5 SMART key results.
    3. Generate the Why (Phase 1) via the market-research agent.
    4. Generate the How (Phase 2) via the PRD agent (gated on Why merged).
    5. Fan out the What (Phase 3) via design-agent on per-repo issues (gated on How merged).
    6. After delivery, complete keyResultRetrospective and valueLearning.
  notes: "Iterative — re-run any phase by creating a follow-up issue with the OKR id."

# Section 3 — Objective
objective:
  name: "Add celebrity profile API to IMDB-Lite"
  description: |
    Enable IMDB-Lite to surface enriched celebrity profile data
    without introducing identity-disambiguation or licensing risk.
  notes: "Aligned with 2026Q1 platform growth strategy."

# Section 4 — Key Results (SMART)
keyResults:
  - id: KR-1
    metric: "Identity-disambiguation false-merge rate"
    target: "< 0.5%"
    measurement: "Production telemetry, post-launch week 2"
  - id: KR-2
    metric: "Licensing-compliance audit pass rate"
    target: "100%"
    measurement: "Legal review checklist at GA"
  - id: KR-3
    metric: "p95 celebrity-profile fetch latency"
    target: "< 200ms"
    measurement: "Synthetic monitoring, 28-day rolling"

# Section 5 — Actions (the pipeline; populated by agents over time)
actions:
  # Each action carries a phase + run_id + chain root + status.
  # The agent pipeline writes these as it completes phases.
  - id: ACT-1
    phase: why
    description: "Market research: licensing risks + identity disambiguation prior art"
    agent: market-research-agent
    run_id: RES-2026-05-19-abc123
    artifact: why/research-doc.md
    pr: https://github.com/.../pull/49
    hatter_chain_root: <sha256>
    parent_run_id: null
    reviewer_scores:
      architect: 85
      security: 88
    rounds: 1                            # first attempt passed; no recycle
    status: complete
    completed_at: 2026-05-19T14:23:00Z

  - id: ACT-2
    phase: how
    description: "PRD: celeb-api endpoints, security controls, threat mapping"
    agent: prd-agent
    run_id: PRD-2026-05-19-def456
    artifact: how/prd.md
    pr: https://github.com/.../pull/52
    hatter_chain_root: <sha256>
    parent_run_id: RES-2026-05-19-abc123    # links to the research run
    reviewer_scores:
      architect: 78
      security: 82
    rounds: 2                            # one recycle pass to address findings
    status: complete
    completed_at: 2026-05-19T15:01:00Z

  - id: ACT-3
    phase: what
    description: "Design: celeb-api implementation in alicenn-ucdenver/celeb-api"
    agent: design-agent
    run_id: DSG-2026-05-19-ghi789
    target_repo: alicenn-ucdenver/celeb-api
    artifact: what/designs/alicenn-ucdenver-celeb-api/design.md
    pr: https://github.com/alicenn-ucdenver/celeb-api/pull/14
    hatter_chain_root: <sha256>
    parent_run_id: PRD-2026-05-19-def456
    reviewer_scores: { architect: null, security: null }
    rounds: 0
    status: in_progress

# Section 6 — Key Result Retrospective (filled in after delivery)
keyResultRetrospective:
  name: "Key Result Retrospective"
  description: ""             # populated post-delivery; one block per KR
  results: []                 # [{ kr_id, actual, met_target, evidence_url }]

# Section 7 — Objective Alignment
objectiveAlignment:
  name: "Objective Alignment"
  description: "Links this OKR to strategic outcome areas (TASA, OKR hierarchy)."
  platform_id: PLT-IMDB             # ← which platform this OKR primarily affects
  affected_bar_ids:                 # ← which BARs need work
    - APP-IMDB-001                   # IMDB Lite Application (consumes the API)
    - APP-IMDB-002                   # IMDB Celebs (produces / curates the data)
  target_code_repos:                # ← derived from BARs' app.yaml.repos[]
    - alicenn-ucdenver/celeb-api
    - alicenn-ucdenver/imdb-lite-web
  tasa_alignment:
    - tier: business
      goal: "Grow IMDB monthly active users 15% YoY"
    - tier: architecture
      goal: "Maintain p95 < 250ms across platform endpoints"

# Section 8 — Value & Learning
valueLearning:
  name: "Value & Learning"
  description: "Insights captured during execution."
  learnings: []                     # [{ phase, insight, date }]

# Section 9 — Downloads
downloads:
  name: "Downloads"
  description: "Supporting materials and references."
  links:
    - kind: research-pr
      url: https://github.com/.../pull/49
    - kind: prd-pr
      url: https://github.com/.../pull/52
    - kind: design-prs
      urls:
        - https://github.com/alicenn-ucdenver/celeb-api/pull/14
```

### 4.3 Key design choices in the schema

- **`actions[]` is the audit ladder** — each entry carries `run_id` + `parent_run_id`. Walking the chain is just sorting by phase and following the linkage.
- **`objectiveAlignment.platform_id`** is the primary anchor. The What lens uses **`affected_bar_ids` → bar.app.yaml.repos[]`** to derive `target_code_repos`. (One source of truth: the platform's BARs already declare their code repos; OKR doesn't duplicate, it references.)
- **`rounds`** on each action tracks how many recycle passes happened. State machine in §6.
- **TASA alignment** captures business/architecture goal linkage (BTABoK tiered goal alignment).

---

## 5. Agents — personas (adapted from NCMS)

Each agent is a `.agent.md` file deployed by `provisionWorkflow` into the mesh's `.github/agents/`. The NCMS prompt content is migrated as the system prompt with placeholders replaced by Skill calls.

### 5.1 Workflow / synthesizer agents

| Agent | Triggered by | Output | Skills it relies on |
|---|---|---|---|
| `market-research-agent` | `oraculum-research` label + `@copilot` mention | PR: `okrs/<id>/why/research-doc.md` | `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search`, `dedupe-and-rank`, `format-research-issue-update`, `knowledge-okr`, `knowledge-mesh-*`, `audit-emit-event` |
| `prd-agent` | `oraculum-prd` label + `@copilot` mention | PR: `okrs/<id>/how/prd.md` + `manifest.yaml` | `knowledge-research`, `knowledge-mesh-*`, `knowledge-code`, `context-architecture`, `context-security`, `context-quality`, `audit-emit-event` |
| `design-agent` | `oraculum-design` label on per-repo landing issue | PR in code repo: `.governance/design.md` | `knowledge-prd`, `knowledge-code`, `knowledge-reference-repos`, `context-architecture`, `context-security`, `audit-emit-event` |

### 5.2 Reviewer agents

| Agent | Triggered by | Output |
|---|---|---|
| `architect-reviewer` | Auto-fires on any artifact PR (Phase 1/2/3) | PR review with scored certificate: `SCORE / SEVERITY / COVERED / MISSING / CHANGES` |
| `security-reviewer` | Same | Same certificate, STRIDE / OWASP / NIST cross-refs |

Reviewer agents **do not block merge by themselves** — they post scored review comments and apply labels (`revision-required` / `governance-pass`). The recycle loop (§6) gates merge.

### 5.3 Why experts are *personas in the agent's prompt*, not separate LLM calls

NCMS's `expert_prompts.py` has the Architect / Security personas as standalone LLM-callable units. On GitHub-hosted Copilot, every Skill invocation is a context window cost for the parent agent — there's no benefit to splitting "think like an architect" into a nested LLM call.

So:
- **The persona text lives inline in the parent agent's `.agent.md` system prompt.** When the agent gets to the architecture section of the PRD, the system prompt has already told it to "adopt the Architect persona; reason about CALM compliance, ADR alignment, fitness-function impact, quality attributes."
- **The grounded context comes from pure-data Skills** (`context-architecture`, `context-security`). These return structured JSON of CALM nodes, ADRs, threats, controls — never an LLM-generated narrative. The agent does the synthesis.
- **Review mode** is a separate `architect-reviewer` agent assignment on the PR. Same persona prompt, but invoked as a new agent session for scoring. Posts a review with the certificate format.

---

## 6. Reviewer recycle loop — bounded state machine

Each artifact PR fires `architect-reviewer` + `security-reviewer` in parallel. Their scores drive the state machine.

### 6.1 State diagram

```
                                                           ┌──────────────┐
                                                           │  GovPass     │
                                                           │ (label-on-   │
                                          ┌────────────────│  merge fires)│
              both scores ≥ THRESHOLD     │                └──────────────┘
              and severity ≤ MEDIUM       │
                       ▲                  │
                       │                  │
              ┌────────┴────────┐         │
   PR opens  │   ReviewPending  │         │
   ─────────▶│   (round = 1)    │         │
              └────────┬────────┘         │
                       │                  │
                       │ either score below threshold
                       │ OR severity ≥ HIGH
                       ▼
              ┌─────────────────┐
              │  RevisionNeeded │
              │  • label: revision-required
              │  • comments posted on PR
              └────────┬────────┘
                       │
                       │  agent revises + pushes new commit
                       ▼
              ┌─────────────────┐
              │  ReviewPending  │
              │  (round = 2)    │  ← reviewers re-fire
              └────────┬────────┘
                       │
                       │ scores good?
                       ▼
              ┌─────────────────┐
              │  GovPass        │ (auto-merge eligible)
              └─────────────────┘

If still failing at round = MAX_AUTO_ROUNDS (default 2):
              ┌─────────────────┐
              │  HumanGate      │
              │  • label: needs-human-review
              │  • assigns to OKR owner
              │  • lists outstanding findings
              └────────┬────────┘
                       │
                       │ human approves -or- forces another round
                       ▼
                  …continues with manual control
```

### 6.2 Thresholds & limits

| Config | Default | Configurable per OKR? |
|---|---|---|
| Score threshold (per reviewer, 0-100) | 75 | ✅ via `okr.yaml.governance.score_threshold` |
| Max severity allowed | MEDIUM | ✅ |
| MAX_AUTO_ROUNDS | 2 | ✅ |
| Hand-off when MAX hit | `needs-human-review` label + reassign | (fixed behavior) |

### 6.3 Why bounded vs unbounded

Three reasons we cap at 2 auto-rounds:

1. **Cost** — each round = 2 reviewer agents + 1 revising agent. Three rounds at scale gets expensive.
2. **Cycle detection** — if a reviewer keeps flagging the same issue and the agent keeps not fixing it, more rounds won't help. A human will catch what the loop missed.
3. **Velocity** — for OKRs on a roadmap, "stuck on round 5" is the same as "blocked" from a PM perspective. Surface it.

The human at the gate has three options (Looking Glass shows the buttons):

- **Approve** — override reviewer findings, merge anyway (logged in audit with reason)
- **Re-run** — give the agent one more shot (counts as round 3, auditable)
- **Reject + re-scope** — close the PR, edit the OKR action's description, regenerate

---

## 7. Skills inventory

Skills live in `.github/skills/<name>/` in the mesh repo, deployed via `provisionWorkflow`.

### 7.0 Design principle — Skills are PURE

**No LLM calls inside any Skill.** Every Skill is a deterministic data operation:
- Search Skills (`tavily-search` etc.) hit external APIs, return structured JSON results.
- Knowledge Skills read mesh artifacts, return structured JSON.
- Context Skills (formerly "expert Skills") bundle CALM + threats + ADRs for a query, return structured JSON.
- Audit Skills write to JSONL, return chain head.

**Reasoning happens in the parent agent.** The Copilot Coding Agent has its own LLM (Claude or whatever's behind Copilot) and is already doing synthesis. It generates query plans itself. It runs gap analysis itself. It applies the architect/security personas itself (the personas are bundled into the agent's system prompt via the `.agent.md` file).

Why this matters:
- **No GH-Models 429s on the agent path.** The runner's `plan_queries` / `gap_analysis` LLM calls hit rate limits constantly. The agent uses its own model — different budget bucket, no nested rate-limit.
- **Skills are testable as pure functions** — given inputs, deterministic outputs.
- **Fewer cost surfaces** — one model bill (the agent's) instead of three (agent + plan_queries + gap_analysis + experts).
- **Better query quality** — the agent has full context (the OKR, the brief, prior research, mesh state) when generating queries. The runner's plan_queries only had the brief.

The existing `research-runner` CLI is **kept for the legacy CI-only path** (workflows that fire without an agent assignment). The agent-driven path supersedes it once Phase B lands.



### 7.1 Search Skills (the agent's primary tools for Phase 1)

The market-research-agent calls these directly — one per provider, with queries the agent itself generated from the OKR + brief + mesh context.

| Skill | Input | Output |
|---|---|---|
| `tavily-search` | `{ queries: string[], maxResults?: number }` | `{ envelopes: [{query, status, count}], results: ProviderResult[] }` |
| `arxiv-search` | same shape | same shape |
| `uspto-search` | same + `apiKey` from env | same shape, results include abstracts (two-stage XML fetch) |
| `hackernews-search` | same shape | same shape, results include `storyText` for Show/Ask HN posts |
| `dedupe-and-rank` | `{ results: ProviderResult[][], topN?: number }` | `{ rankedSources: RankedSource[], providerCounts: {...} }` |
| `format-research-issue-update` | `{ topic, runId, rankedSources, providerCounts, gapSignals, meshContext }` | `{ markdown: string, byteCount: number }` |

Each is a thin wrapper around the corresponding `research-runner` TypeScript client — same code, exposed as a CLI script the Skill shell-execs.

**Agent flow for Phase 1** (no nested LLM calls — agent does the reasoning):

```
1. agent: read OKR + brief
2. agent: generate query plan (its own LLM context — no `plan_queries` Skill)
       → tavily: 5 queries
       → arxiv: 3 queries
       → uspto: 3 queries (Q1 narrow + Q2 medium + Q3 broad per V3 spec)
       → hackernews: 3 queries (2-3 word casual)
3. agent: invoke 4 search Skills in parallel
4. agent: invoke dedupe-and-rank with all 4 result arrays
5. agent: inspect rankedSources for coverage gaps (its own analysis)
       → if `topic_uncovered` for a key brief term, go back to step 2
       → max 3 search-loop iterations
6. agent: write the synthesis directly to okrs/<id>/why/research-doc.md
       (using V2 prompt-pack structure from .caterpillar/prompts/research/synthesis.md)
7. agent: invoke format-research-issue-update + post as comment on the issue
8. agent: invoke audit-emit-event for the run
9. agent: open PR
```

### 7.2 Why this is cleaner than the legacy runner path

| Concern | Runner path (today, legacy) | Agent path (new) |
|---|---|---|
| Query generation | LLM call inside runner (GH Models, often 429s) | Agent's own model — different bucket |
| Gap analysis | LLM call inside runner | Agent inspects rankedSources itself |
| Synthesis | Skipped (agent does it after merge) | Agent does it inline |
| GH-Models dependency | YES for plan + gap | NONE — agent uses Copilot's own model |
| Failure modes | Cascading: 429 on plan → fallback to Anthropic → 429 again → outer fallback | None at this layer; agent retries via its own retry logic if needed |
| Cost surface | 3+ LLM bills (runner plan, runner gap, agent synth) | 1 LLM bill (agent synth, which already happens) |

The `research-runner` CLI stays for the legacy CI flow (workflow fires without an agent — auto-archeologist). The agent flow is the new default.

### 7.3 Knowledge Skills (read-from-mesh)

| Skill | Purpose | Reads from |
|---|---|---|
| `knowledge-okr` | "What's the OKR I'm working under?" | `okrs/<id>/okr.yaml` |
| `knowledge-mesh-bar` | "What CALM + threats + ADRs does BAR `<id>` have?" | `platforms/<p>/bars/<id>/**` |
| `knowledge-mesh-platform` | "What's the platform CALM + cross-BAR design?" | `platforms/<p>/platform.arch.json` |
| `knowledge-mesh-threats` | "Threats from the library matching `<concern>`?" | `threats/` library |
| `knowledge-mesh-adrs` | "ADRs about `<concern>`?" | `**/architecture/ADRs/*.md` |
| `knowledge-research` | "What did the research phase find about `<topic>`?" | Merged `okrs/<id>/why/research-doc.md` |
| `knowledge-prd` | "What did the PRD specify for `<FR-ID>` / `<SR-ID>`?" | Merged `okrs/<id>/how/prd.md` |
| `knowledge-code` | "What's the current structure of repo `<owner/name>`?" | Clones + indexes the code repo |
| `knowledge-reference-repos` | "What patterns exist in our curated reference repos?" | `<mesh>/reference-repos/` (curated, optional) |

All knowledge Skills are read-only, idempotent, cache-friendly.

### 7.4 Context Skills (formerly "expert Skills" — no LLM inside)

The "expert" personas (Architect, Security) live in the **parent agent's system prompt** via the `.agent.md` file. They aren't separate LLM calls; they're personas the agent adopts at the relevant point in synthesis. What the Skills do is **assemble the grounded mesh data** the persona needs to reason against.

| Skill | Returns |
|---|---|
| `context-architecture` | Aggregated structured data: CALM nodes + relationships for affected BARs, all ADRs touching architecture concerns, applicable fitness functions, quality attributes from each BAR |
| `context-security` | Aggregated: threat library entries applicable to the scope, security controls already in place per BAR, OWASP/NIST control references the BAR maps to, prior threat-model documents |
| `context-quality` | Aggregated: quality attribute definitions, performance SLOs, reliability targets per BAR |

Each is a pure-data Skill that walks the mesh tree, applies a "what's relevant for this scope" filter, and returns structured JSON the agent can reason against. The agent's `.agent.md` system prompt has the Architect / Security persona text inline (adapted from NCMS `expert_prompts.py`) — the persona tells the agent how to think; the Skill gives it what to think about.

Sample output of `context-architecture`:

```yaml
scope: { platform: PLT-IMDB, bars: [APP-IMDB-001, APP-IMDB-002] }
calm_nodes:
  - { id: bar-imdb-api, type: bar, related_threats: [THR-114, THR-122] }
  - { id: shared-identity, type: shared-infra, related_adrs: [ADR-007] }
relationships:
  - { source: bar-imdb-api, dest: shared-identity, kind: depends-on }
adrs:
  - { id: ADR-007, title: "Use canonical celebrity ids", status: accepted, tags: [identity, disambiguation] }
fitness_functions: [...]
quality_attributes: [...]
```

The agent reads this and applies the Architect persona to write a grounded architecture section in the PRD. Same shape for `context-security` feeding the security section.

**Reviewer agents** (architect-reviewer, security-reviewer) work the same way: they invoke `context-architecture` / `context-security` to gather what to score against, then score the artifact's claims/decisions against that grounded context — using their own LLM (the Copilot session running the reviewer agent).

### 7.5 Audit Skill

`audit-emit-event/SKILL.md` — every agent calls this at meaningful steps. Writes one event to `okrs/<id>/audit/events/<run-id>.jsonl`, computes hash chain, returns the new chain head.

```yaml
event_kinds:
  - skill_call              # any time a Skill is invoked
  - llm_call                # parent agent's own LLM synthesis
  - artifact_written        # final output emitted
  - review_received         # reviewer agent posted a score
  - state_transition        # ReviewPending → RevisionNeeded etc.
  - human_gate              # MAX_AUTO_ROUNDS reached
```

Implementation reuses `research-runner`'s `audit-emitter.ts` logic exactly.

---

## 8. IMDB Lite — worked example

This is what `scaffoldImdbLitePlatform()` should produce after we land Phase A. Validated against the current seed:

**Existing seed (today)**:
- Platform `PLT-IMDB`, slug `imdb-lite`, in `platforms/imdb-lite/`
- BAR 1: `APP-IMDB-001` (IMDB Lite Application) — produced by `scaffoldImdbLiteSampleBar`
- BAR 2: `APP-IMDB-002` (IMDB Celebs) — produced by `scaffoldImdbCelebsSampleBar`
- `platforms/imdb-lite/platform.arch.json` — populated via `generateSampleImdbPlatformArch()` (cross-BAR topology + shared infra)

**Phase A addition** — sample OKR scaffolded alongside the platform:

```
<mesh-root>/
  platforms/imdb-lite/                # existing
    platform.yaml
    platform.arch.json
    bars/
      imdb-lite-application/          # APP-IMDB-001
      imdb-celebs/                    # APP-IMDB-002

  okrs/                                # NEW — created by scaffoldImdbLiteOkr()
    OKR-2026Q1-IMDB-001-celeb-api/
      okr.yaml                         # populated card (see §4.2)
      why/.gitkeep                    # populated when Phase 1 merges
      how/.gitkeep
      what/.gitkeep
      audit/
        chain-ladder.yaml             # empty initial
        events/.gitkeep
```

### 8.1 The seeded `okr.yaml`

Pre-populated with the BTABoK 9-section structure, status=`draft`, all phases empty. **`objectiveAlignment.platform_id = PLT-IMDB`** and **`affected_bar_ids = [APP-IMDB-001, APP-IMDB-002]`** — wired to the existing BARs.

```yaml
meta:
  card: BTABoKItem
  id: OKR-2026Q1-IMDB-001
  owner: <user from extension config>
  status: draft
overview: { name: "OKR Card", description: "...", notes: "..." }
howToUse: { name: "...", description: "...", notes: "..." }
objective:
  name: "Add celebrity profile API to IMDB-Lite"
  description: "Enable IMDB-Lite to surface enriched celebrity profile data..."
keyResults:
  - { id: KR-1, metric: "Identity-disambiguation false-merge rate", target: "< 0.5%", measurement: "Production telemetry, week 2" }
  - { id: KR-2, metric: "Licensing-compliance audit pass rate", target: "100%", measurement: "Legal review at GA" }
  - { id: KR-3, metric: "p95 celebrity-profile fetch latency", target: "< 200ms", measurement: "Synthetic, 28-day rolling" }
actions: []                            # populated by agents
keyResultRetrospective: { results: [] }
objectiveAlignment:
  platform_id: PLT-IMDB
  affected_bar_ids: [APP-IMDB-001, APP-IMDB-002]
  target_code_repos:                  # read from each bar's app.yaml.repos[]
    - alicenn-ucdenver/imdb-lite
    - alicenn-ucdenver/celeb-api      # (when added)
  tasa_alignment: []
valueLearning: { learnings: [] }
downloads: { links: [] }
governance:                            # OPTIONAL — overrides global defaults
  score_threshold: 75
  max_auto_rounds: 2
  max_severity: MEDIUM
```

### 8.2 End-to-end walkthrough — what the user sees

| Step | Looking Glass surface | Mesh state |
|---|---|---|
| 1. Open IMDB-Lite platform, click "Create OKR" | New OKR draft, status=`draft`. User fills/edits objective + KRs. | `okrs/OKR-2026Q1-IMDB-001/okr.yaml` (seeded as above) |
| 2. Click "Start Research" on the Why card | Creates `oraculum-research` issue, includes `okr_id` in body | Issue opened. archeologist.yml fires → posts data-collection comment. |
| 3. Assign Copilot in Oraculum panel | Copilot reads issue + `knowledge-okr` Skill | market-research-agent works in a branch. |
| 4. PR opens; reviewers fire | PR list shows scored reviews | `actions[0]` written to okr.yaml with `phase=why`, `rounds=1`, scores. |
| 5. Reviewer scores pass → merge | OKR status → `prd-pending`; Why card flips to ✓ | Audit chain updated; `okrs/<id>/why/research-doc.md` lands. |
| 6. Click "Generate PRD" on the How card | Creates `oraculum-prd` issue with okr_id | prd-agent fires; uses `knowledge-research` to read merged Phase 1 + `knowledge-mesh-*` + experts. |
| 7. First review round flags 2 security gaps | `revision-required` label applied; agent revises | `actions[1].rounds = 2` |
| 8. Round 2 passes | Merge gated by `governance-pass` label | `okrs/<id>/how/prd.md` lands; `manifest.yaml` has `target_repos`. |
| 9. design-bus.yml fires per target repo | Opens landing issues in `alicenn-ucdenver/imdb-lite` + `alicenn-ucdenver/celeb-api` | Each issue carries `okr_id` + PRD reference. |
| 10. User assigns Copilot on each landing issue | design-agent reads PRD + repo via knowledge Skills | Per-repo design.md PRs open. |
| 11. After delivery, user opens OKR detail | "Mark complete" button → fills `keyResultRetrospective` + `valueLearning` | OKR status → `shipped` |

---

## 9. Orchestration — label-driven workflows

Workflows we add/extend:

| Workflow | Trigger | Action |
|---|---|---|
| `archeologist.yml` (existing, **extended**) | `oraculum-research` label-add OR `@claude` on labeled issue | Run research-runner data collection; comment includes `okr_id` |
| `oraculum-research.yml` (existing) | `@claude` on `oraculum-research` issue | Claude path for synthesis (Anthropic) |
| **`reviewer-bus.yml`** (NEW) | Any PR with `research-synthesis` / `prd-draft` / `design-draft` label | Assigns architect-reviewer + security-reviewer agents in parallel; labels per state machine §6 |
| **`okr-bus.yml`** (NEW) | PR merged with `governance-pass` | Updates `okrs/<id>/okr.yaml` actions[] + chain-ladder; flips status field; comments on OKR anchor issue |
| **`design-bus.yml`** (NEW) | PRD PR merged | Fan-out: opens per-repo landing issues in `target_code_repos`, each with `oraculum-design` label + `okr_id` |
| `notify-code-repos.yml` (existing) | Triggered by `design-bus.yml` | Posts landing issue per repo (already shipped) |
| `label-on-merge.yml` (existing, **extended**) | PR merge | Adds `governance-pass` only when both reviewers have scored above threshold |

---

## 10. Looking Glass integration

### 10.1 New surfaces

- **Portfolio tile**: "OKRs" alongside Business / Applications / Policies.
- **OKR list view**: table with Objective / Owner / Platform / Status / Phase Progress (Why ✓ / How ⏳ / What ☐) / Last Activity / Audit Chain root.
- **OKR detail view**: BTABoK card rendered as a vertical stack:
  - Overview / HowToUse (collapsible)
  - Objective (editable header)
  - Key Results table (editable, with progress sparklines once delivered)
  - **Actions card** — three sub-cards (Why / How / What). Each shows:
    - Phase status badge (Pending / In progress / GovPass / RevisionNeeded / HumanGate / Complete)
    - "Start <phase>" button (gated on prior phase complete)
    - For HumanGate: the three options (Approve / Re-run / Reject) inline
    - Audit timeline (collapsible): every skill call, every review, hatter chain root
  - Objective Alignment (platform + BARs + TASA goals)
  - Key Result Retrospective (post-delivery editor)
  - Value & Learning (notes editor)
  - Downloads (auto-populated from action PRs/links)

### 10.2 Cleanups

- **"Promote to research-request" in Oraculum** → replaced by **"Create OKR from finding"** which:
  1. Pre-fills an OKR draft from the Oraculum finding
  2. Lets the user pick platform/BARs
  3. Opens the Phase 1 issue once user confirms
- **Assign Agent screen** → the `@copilot` / `@claude` comment now embeds the OKR id (already substitutes run_id; add okr_id substitution from the same source).
- **Active Runs panel** → group by OKR id, with phase context.

### 10.3 New services

- **`OKRService`** in `vscode-extension/src/services/OKRService.ts`:
  - `readAll(meshPath)` → all OKR cards
  - `read(meshPath, okrId)` → one card with chain ladder + computed status
  - `create(meshPath, draft)` → seed new `okrs/<id>/` folder
  - `appendAction(meshPath, okrId, action)` → audit-safe action append
  - `updateStatus(meshPath, okrId, newStatus)` → with audit event
  - `targetCodeReposFor(meshPath, okrId)` → reads BARs' app.yaml.repos[] to derive
- **`AgentDeploymentService`** extends `provisionWorkflow` to also seed `.github/agents/*.agent.md` and `.github/skills/<name>/`.

---

## 11. Audit chain — what's source-of-truth where

| Artifact | Where | Authoritative for |
|---|---|---|
| `okr.yaml` | mesh repo | OKR card BTABoK content + actions ladder |
| `okrs/<id>/audit/events/<run>.jsonl` | mesh repo | Per-run event timeline (hash-chained) |
| `okrs/<id>/audit/chain-ladder.yaml` | mesh repo | Cross-run lineage (parent_run_id graph) |
| `okrs/<id>/{why,how}/<artifact>.md` | mesh repo | Phase outputs (after merge) |
| `<code-repo>/.governance/design.md` | code repo | Phase 3 outputs |
| Each artifact's Hatter Tag footer | inline in markdown | Published summary of the audit chain for that run |

### 11.1 Chain integrity

- **Within a run**: hash-chained JSONL (`audit-emitter.ts` already does this; we reuse it).
- **Across runs**: stitched via `parent_run_id` in each artifact's Hatter Tag + the `chain-ladder.yaml`.
- **Tampering surface**: if anyone hand-edits a merged artifact, Hatter `chain_root_hash` no longer matches the JSONL. A `verify-chain` CLI (already exists) flags it.

### 11.2 What's NOT in the chain

- Reviewer agent prose comments on the PR (those are on GitHub's side; we capture the SCORE in audit but not the comment body).
- LLM model server logs (Anthropic / GH Models). We capture token counts + costs in audit, not the prompts/responses themselves.

---

## 12. Phased implementation plan

### Phase A — Foundation (2 weeks)

1. `OKRService` + `okr.yaml` schema + Zod type
2. OKR tile, list view, detail view (BTABoK card render, no buttons yet)
3. Hatter Tag schema extension (`parent_run_id` field)
4. Audit event schema extension (`phase`, `okr_id`, `parent_run_id`)
5. `scaffoldImdbLiteOkr()` seeds the sample OKR alongside the platform
6. Cleanup: "Promote to research-request" → "Create OKR from finding"
7. Cleanup: Active Runs panel groups by OKR

### Phase B — Custom Agents + Skills (3 weeks)

1. Deploy `.github/agents/*.agent.md` for: `market-research-agent`, `prd-agent`, `design-agent`, `architect-reviewer`, `security-reviewer`
2. Deploy `market-data-collection` Skill (wraps research-runner CLI)
3. Deploy search Skills: `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search`
4. Deploy knowledge Skills: `knowledge-okr`, `knowledge-mesh-*`, `knowledge-research`, `knowledge-prd`, `knowledge-code`
5. Deploy expert Skills: `architect-expert`, `security-expert`
6. Deploy `audit-emit-event` Skill
7. `AgentDeploymentService` (extends provisionWorkflow)
8. Looking Glass: wire "Start Research" / "Generate PRD" / "Generate Design" buttons

### Phase C — Reviewer recycle loop + orchestration (2 weeks)

1. `reviewer-bus.yml` workflow (fires reviewers in parallel)
2. State-machine label logic in `label-on-merge.yml` (apply `governance-pass` only when both pass)
3. `okr-bus.yml` workflow (updates okr.yaml on each phase merge)
4. `design-bus.yml` workflow (fan-out per repo)
5. Bounded recycle loop wiring (round counter + HumanGate transitions)
6. Looking Glass: HumanGate UI (Approve / Re-run / Reject buttons)

### Phase D — Design agent + reviser loop (3 weeks)

1. `design-agent` operating on per-repo issues
2. `knowledge-reference-repos` Skill (clone + index)
3. Reviser loop: agent ↔ reviewers on per-repo design PRs
4. Hatter chain ladder visualization in Looking Glass

### Phase E — Hardening (1 week)

1. End-to-end smoke test against IMDB-Lite sample OKR (the worked example in §8)
2. `verify-chain` CLI in Looking Glass
3. Documentation pack for the team

---

## 13. Open questions & risks

### 13.1 GitHub primitives

- **Skill auto-discovery vs explicit invocation**: docs say agents "can also discover and invoke skills automatically." If the LLM forgets to call context Skills, PRDs land ungrounded. Mitigation: the parent agent's system prompt enumerates required Skills with **exact invocation order**.
- **Skill timeout & budget**: not yet known; we model Skills as best-effort with `{ ok: false, reason }` fallback contracts.
- **Cross-repo agent execution**: design-agent must operate IN the code repo. `notify-code-repos.yml` already handles posting the landing issue with the right context.
- **No nested LLM calls**: by design. All reasoning is in the parent agent's context. Skills are pure data. This kills two birds: no GH-Models 429s on inner calls, and no cost surface multiplication.

### 13.2 NCMS adaptation

- **Inline `{expert_input}` placeholders in NCMS prompts** → on GitHub-hosted Copilot, the LLM calls expert Skills explicitly. Risk: the LLM forgets. Mitigation: structural check on the artifact (PRD must have `E1`/`E2` references; if missing, reviewer rejects).
- **Reviser loop**: NCMS does it externally in Python. We do it via the PR-comment cycle + bounded state machine.

### 13.3 Bounded recycle loop

- **Cost ceiling**: 2 auto-rounds + 1 HumanGate decision caps per-OKR pipeline cost. Estimated ~$2-5 per OKR on Anthropic, ~$0.20-1 on github-models (custom tier).
- **Cycle thrashing**: if agent A keeps not addressing the same finding, MAX_AUTO_ROUNDS=2 catches it. Audit captures the repeated finding for human review.
- **Reviewer leniency**: at first, calibrate by also requiring human OK before merge. Once reviewer scores correlate with PR quality in practice, auto-merge can be enabled.

### 13.4 OKR ↔ Platform integrity

- **`affected_bar_ids` MUST reference real BARs**. We validate on save: each id resolves to a BAR in the platform.
- **`target_code_repos` is derived, not stored**: read each BAR's `app.yaml.repos[]` at runtime so it stays in sync.
- **What if a BAR is added/removed mid-OKR?**: the OKR view shows a warning; the user must re-derive (one click) to update.

### 13.5 IMDB Lite sample correctness (validated)

- ✅ Sample platform exists (`PLT-IMDB`, slug `imdb-lite`)
- ✅ Two BARs (`APP-IMDB-001`, `APP-IMDB-002`)
- ✅ `platform.arch.json` populated via `generateSampleImdbPlatformArch()`
- ⏳ Sample OKR (Phase A deliverable — `scaffoldImdbLiteOkr()`)
- ⏳ Each BAR's `app.yaml.repos[]` populated with realistic code repos (today: empty by default — Phase A also seeds these)

---

## 14. Deliverables map

| Deliverable | Location | Phase |
|---|---|---|
| `okr.yaml` schema + Zod type | `vscode-extension/src/types/okr.ts` | A |
| OKRService | `vscode-extension/src/services/OKRService.ts` | A |
| `scaffoldImdbLiteOkr` | `vscode-extension/src/services/MeshService.ts` (extend) | A |
| OKR tile / list / detail views | `vscode-extension/src/webview/app/views/okr*.ts` | A |
| Hatter Tag `parent_run_id` | `packages/research-runner/src/runner/hatters-tag-builder.ts` | A |
| Audit event schema (phase, okr_id, parent_run_id) | `packages/research-runner/src/runner/audit-emitter.ts` | A |
| Cleanup: Promote → Create OKR | `vscode-extension/src/webview/OracularPanel.ts` | A |
| Cleanup: Active Runs by OKR | `vscode-extension/src/webview/ActiveRunsPanel.ts` | A |
| `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search` Skills (PURE data) | mesh template | B |
| `dedupe-and-rank` Skill | mesh template | B |
| `format-research-issue-update` Skill | mesh template | B |
| `knowledge-okr`, `knowledge-mesh-*`, `knowledge-research`, `knowledge-prd`, `knowledge-code`, `knowledge-reference-repos` Skills | mesh template | B (D) |
| `context-architecture`, `context-security`, `context-quality` Skills (pure mesh aggregators — NO LLM inside) | mesh template | B |
| `audit-emit-event` Skill | mesh template | B |
| `market-research-agent`, `prd-agent`, `design-agent`, `architect-reviewer`, `security-reviewer` `.agent.md` files | mesh template | B (D) |
| AgentDeploymentService | `vscode-extension/src/services/AgentDeploymentService.ts` | B |
| `reviewer-bus.yml`, `okr-bus.yml`, `design-bus.yml` | mesh template | C |
| State-machine logic in `label-on-merge.yml` | mesh template | C |
| HumanGate UI (Approve / Re-run / Reject) | OKR detail view | C |
| `design-agent` + reference-repos | mesh template + service | D |
| `verify-chain` CLI surface | Looking Glass action + research-runner CLI | E |
| End-to-end smoke (IMDB Lite OKR) | docs/test | E |

---

## 15. What this is NOT

- Not a full re-architecture of `research-runner` — it stays as the implementation. The Skill is its agent-facing interface.
- Not a custom MCP server — uses built-in Copilot primitives. (redqueen-mcp keeps its existing scope: editor-side queries.)
- Not human-out-of-the-loop. Every phase still produces a PR for human merge. Reviewers assist; they don't replace.
- Not vendor-locked. Anthropic remains the fallback for research-runner LLM calls (synth is done by Copilot Coding Agent regardless).
- Not "every OKR uses every agent." Smaller scopes can stop at Phase 1 or 2; the schema tolerates partial completion.

---

*Last updated 2026-05-19. This is a design document, not a commitment to ship every phase. Phase A unlocks the foundation; B unlocks the agents; C closes the loop. D and E are quality of life.*
