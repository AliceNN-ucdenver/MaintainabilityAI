# Agentic SDLC — Design (v3)

End-to-end agent-orchestrated pipeline from **market research → PRD → design**, grounded in the governance mesh (CALM, threat models, ADRs, prior research, reference repos), with full auditable provenance and a Looking Glass-surfaced OKR anchor.

**v2 changes from v1**:
- Research-runner becomes a **Skill** the market-research-agent invokes (not a parallel pipeline).
- **Bounded reviewer recycle loop** with explicit state machine (max 2 auto-rounds → human gate).
- **OKR Card** modeled as a BTABoK card (matches Business/Applications/Policies) with 9 sections.
- **OKR ↔ Platform linkage** is explicit; the What lens picks the right code repos.
- **Worked IMDB Lite sample** showing a populated OKR end-to-end against the existing seed.

**v2.1 refinement**:
- **Skills are PURE data Skills** — zero nested LLM calls. The Copilot Coding Agent does ALL reasoning (query generation, gap analysis, expert synthesis, document writing) with its own model.
- Search Skills are individual primitives (`tavily-search`, `arxiv-search`, etc.) — the agent picks which to invoke and with what queries.
- "Expert Skills" become **context Skills** that return structured mesh data (CALM model, threat library, ADRs); the agent does the reasoning itself.
- Drops the GH-Models dependency for plan_queries + gap_analysis entirely. 429s on the runner's LLM hops become moot for the agent-driven flow.
- `research-runner` keeps existing for the legacy CI-only path; agent-driven path replaces it.

**v3 alignment (this update)** — reviewed against [agentic-governance-roadmap-2026.md](../../docs/design/agentic-governance-roadmap-2026.md) and [agentic-governance-landscape.md](../../site-tw/public/docs/research/agentic-governance-landscape.md):
- **OKR Cards reframed as IntentSpecs** — "declarative intent that travels with the work". Why/How/What is the intent cascade.
- **Maps onto the existing 6-phase SDLC** (Design → Implement → Verify → Govern → Deploy → Evolve) — does NOT replace it.
- **Reviewer ≠ Author enforcement (Tweedles)** — architect/security reviewers are distinct Copilot agent sessions with distinct DIDs. NIST 800-53 SA-11 + SOC 2 segregation of duties. Roadmap §4.5 explicit.
- **Tier-aware recycle bounds** — Autonomous (80–100) / Supervised (50–79) / Restricted (0–49) read from BAR score. Restricted gets 0 auto-rounds + mandatory dual signature.
- **Hatter's Tag full provenance** — `{agent_did, model_version, system_prompt_sha, prompt_pack_version, threat_model_ref, owasp_categories, fitness_results, reviewer, rationale, intent_thread_uuid}`. Required by SOC 2 CC8.1 and EU AI Act Art. 12.
- **Intent Thread UUID** — what `parent_run_id` becomes; stamped on every action/commit/PR/review across repos. Fills Microsoft AGT's named "reasoning-trace correlation" gap.
- **White Rabbit's Pocket Watch (Goal-drift gate)** — explicit hash check of OKR.objective vs final PR scope at each phase boundary.
- **CloudEvents v1.0 audit envelope** — matches Court Recorder format so the chain merges with AGT.
- **EU AI Act Article 12** — automatic logging, ≥6 month retention. Deadline 2 Aug 2026.
- **Workshop alignment (§13)** — IMDB-Lite gets `app.yaml.repos[]` populated with the four workshop repo names (`imdb-react-frontend`, `imdb-identity`, `movie-api`, `celeb-api`). Asymmetric CALM density preserved: Lite has 8 nodes + NIST controls (Supervised tier); Celebs has 6 nodes + no controls (Restricted tier — demonstrably blocked from agent autonomy until governance is built up).

### The auditor's master question (the single design test)

From the landscape doc: *"Show me how this feature was built. By which agent. With which prompt. Against which threat model. With what test coverage. Who approved. What was the rationale."*

Every artifact this pipeline produces must be reconstructible from `intent_thread_uuid` to answer that question end-to-end. If the design fails the test, it's wrong.

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

## 2.5 Governance of Intent — position vs the roadmap

The roadmap puts us in **Camp B**: *"Govern the SDLC the agent participates in."* Microsoft AGT governs the agent runtime; we govern how an agent earned the right to act and what it produced.

The OKR Card is our **IntentSpec** — declarative intent that travels with the work. It cascades through four layers (Org → Role → Developer → User from the Court Hierarchy); lower layers can only **narrow** the intent, never broaden it.

### Mapping to the 6-phase SDLC

The Why/How/What is not a replacement for the 6-phase SDLC — it's how the three highest-leverage phases get **agent-orchestrated**:

| 6-phase SDLC | Why/How/What | Agent role |
|---|---|---|
| 1. Design | **Why** (market research) + start of **How** (PRD draft) | market-research-agent → prd-agent |
| 2. Implement | Mid-**How** + **What** (per-repo design) | prd-agent → design-agent |
| 3. Verify | review gates on every phase PR | architect-reviewer + security-reviewer |
| 4. Govern | OKR Card itself; Court Recorder; Knight's Seal | reviewer agents enforce; Hatter Tag captures |
| 5. Deploy | downstream of design merge | (out of scope for this design) |
| 6. Evolve | `keyResultRetrospective` + `valueLearning` populated post-delivery | human + agent retrospective |

### The Wonderland glossary we adopt (no inventing terms)

- **Intent Thread** — UUID stamped on every action/commit/PR/review for one OKR's pipeline. (`parent_run_id` becomes the Intent Thread.)
- **Hatter's Tag** — provenance JSON appended to every artifact PR.
- **Court Recorder** — Merkle-chained, append-only audit; CloudEvents v1.0 envelopes; SIEM-exportable.
- **Knight's Seal** — Ed25519-signed commits with agent DID (Phase B+ deliverable).
- **Tweedles** — segregation-of-duties gate: reviewer agent ≠ author agent.
- **White Rabbit's Pocket Watch** — goal-drift hash check between OKR.objective and final PR scope.
- **Queen's Keyring** — short-lived per-task agent credentials, auto-revoked at PR close.
- **Agent Roster / AI-BOM** — every agent in the pipeline (Why/How/What/reviewer) declared with identity, model version, prompt hash, scope, owner.
- **Caterpillar's Challenge** — the explicit comparison step that flags goal drift between phases.
- **Oraculum's Verdict Scroll** — the architect-reviewer/security-reviewer scored certificate.

Term we deliberately do **not** use: **TASA** — does not appear in either source doc. v2 mentioned it; v3 strikes it (replaced with the Court Hierarchy / intent cascade terminology).

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
  # Court Hierarchy / intent cascade (Org → Role → Developer → User);
  # lower layers may only narrow the intent, never broaden it.
  intent_cascade:
    org: "Grow IMDB monthly active users 15% YoY"
    role: "Engineering Lead — maintain p95 < 250ms across platform endpoints"
    developer: "Add celebrity API; ship behind feature flag"
    user: "Browse celebrity profiles without flicker on mobile"

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

### 5.3 Tweedles — Reviewer MUST NOT equal Author

NIST 800-53 SA-11 and SOC 2 segregation-of-duties require that the reviewer is not the author. Roadmap §4.5 says explicitly: *"agents reliably skew positive when grading their own work."*

In our pipeline:

- **The architect-reviewer and security-reviewer agent sessions are DISTINCT Copilot sessions** with different `.agent.md` system prompts and different agent DIDs.
- **The workflow that fires reviewers checks the PR's author agent DID** before assigning. If the reviewer agent's DID matches the author's, the assignment is rejected.
- **Both DIDs are recorded in the Hatter's Tag**: `author_did` and `reviewer_did[]`. An auditor can verify segregation from the artifact alone.
- **The reviewer's session has no carry-over context** from the authoring session — the only inputs are the PR diff + the artifact + the Skills' pure data outputs.

In practice today this means each agent gets a unique GitHub App installation token per session (Queen's Keyring), and the agent identity is captured in the audit envelope. Knight's Seal (Ed25519 signing) is the cryptographic upgrade for Phase B+; Phase A enforces it by GitHub-App-installation-ID-and-system-prompt-SHA.

### 5.4 Why experts are *personas in the agent's prompt*, not separate LLM calls

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

### 6.2 Tier-aware bounds (Autonomous / Supervised / Restricted)

Bounds depend on the **target BAR's governance tier**, derived from its four-pillar score (per roadmap §4.5 / Caterpillar's Challenge):

| BAR tier | Score range | MAX_AUTO_ROUNDS | Merge gate |
|---|---|---|---|
| **Autonomous** | 80–100 | **1** (one auto-round; if pass → auto-merge eligible) | Both reviewers pass → auto-merge (with human approval still required by branch protection) |
| **Supervised** | 50–79 | **2** (default) | Both reviewers pass → human merges; reviewer scores surfaced in Looking Glass |
| **Restricted** | 0–49 | **0** (no auto-rounds — every artifact requires human approval BEFORE assignment) | **Mandatory dual signature** (two named human approvers). Caterpillar's Challenge must be re-run to upgrade the tier before agent autonomy unlocks. |

Tier is read at runtime from the BAR's score on issue creation. **Tier creep mitigation**: the tier is recorded in the Hatter's Tag at run start; if the BAR's score changes mid-pipeline, the recorded tier stays — auditable.

### 6.3 Static configuration

| Config | Default | Configurable per OKR? |
|---|---|---|
| Score threshold (per reviewer, 0-100) | 75 | ✅ via `okr.yaml.governance.score_threshold` |
| Max severity allowed | MEDIUM | ✅ |
| Hand-off when MAX hit | `needs-human-review` label + reassign to OKR owner | (fixed behavior) |

### 6.4 Why bounded vs unbounded

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

## 8. IMDB Lite — worked example (aligned with workshop starter)

This is what `scaffoldImdbLitePlatform()` produces today and what Phase A extends it with. The intent: the workshop starter ([docs/design/workshop-starter-imdb-lite.md](../../docs/design/workshop-starter-imdb-lite.md)) defines a five-service learning environment with four code repos; this design makes the **mesh side** of that environment auto-populate the same shape so learners can wire up real governance from minute one.

### Today (current seed)

| Element | Status | Notes |
|---|---|---|
| Platform `PLT-IMDB`, slug `imdb-lite` | ✓ | `scaffoldImdbLitePlatform()` |
| BAR `APP-IMDB-001` (IMDB Lite Application) | ✓ | 8 CALM nodes, NIST IA-2/AC-6/SC-7/AU-2/SC-13 controls, 3 ADRs |
| BAR `APP-IMDB-002` (IMDB Celebs) | ✓ | 6 CALM nodes, **no `controls:` block, no `threats:` block, no extra ADRs** (intentional gap) |
| `platforms/imdb-lite/platform.arch.json` | ✓ | Cross-BAR topology via `generateSampleImdbPlatformArch()` |
| `bar.app.yaml.repos[]` | **empty** on both | Code repos never declared in the seed |
| Sample OKR | none | New in Phase A |

### Phase A extensions to the seed

**1. Populate `repos[]` on each BAR with the workshop-starter repo names** — disconnected (no real GitHub repo exists yet), but **declared by name** so the OKR's What phase can target them.

```yaml
# platforms/imdb-lite/bars/imdb-lite-application/app.yaml
repos:
  - url: https://github.com/<org>/imdb-react-frontend    # status: declared
  - url: https://github.com/<org>/imdb-identity          # status: declared
  - url: https://github.com/<org>/movie-api              # status: declared

# platforms/imdb-lite/bars/imdb-celebs/app.yaml
repos:
  - url: https://github.com/<org>/celeb-api              # status: declared
```

`<org>` is filled at scaffold time from the user's GitHub org config. **The repos are declared in the mesh but may not yet exist on GitHub.** Looking Glass shows them as "declared, not connected" with a "Connect" button (which clones-if-exists or runs `gh repo create` if not — workshop choice).

**2. Preserve the asymmetric CALM density** — it's the workshop's teaching moment:

| BAR | Score (estimated) | Tier | Workshop role |
|---|---|---|---|
| `APP-IMDB-001` (IMDB Lite App) | ~55–70 (sec + risk pillars sparse but arch + ops are good) | **Supervised** | Agents can act, but human merges. Realistic mid-maturity baseline. |
| `APP-IMDB-002` (IMDB Celebs) | ~25–45 (no controls, no threats, no ADRs) | **Restricted** | **Mandatory dual signature; 0 auto-rounds.** Demonstrates the system blocking agent autonomy until governance is built up — the entire point of part 7 (Red Queen's Court). |

The Celebs BAR's sparseness is **not a bug — it's the workshop curriculum**. Part 4 (fitness functions) adds the `threats:` block; Part 5 (security pipeline) adds the NIST controls; Part 7 (Red Queen) shows the tier upgrade from Restricted → Supervised once governance is filled in. The agentic SDLC design must preserve this — do not auto-enrich Celebs at seed time.

**3. Seed a sample OKR that targets the Celebs gap**: `OKR-2026Q1-IMDB-001-celeb-api` exists as a draft. Its Why phase would research the celebrity-data licensing risk; its How phase would produce a PRD addressing the missing controls; its What phase would drive design changes in `celeb-api`. **First-time runs the OKR against the Restricted tier and gets blocked** — exactly the lesson Part 7 teaches.

### Phase A addition — sample OKR scaffolded alongside the platform:

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
  intent_cascade:
    org: ""
    role: ""
    developer: ""
    user: ""
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
| `okrs/<id>/audit/chain-ladder.yaml` | mesh repo | Cross-run lineage (intent_thread_uuid graph) |
| `okrs/<id>/{why,how}/<artifact>.md` | mesh repo | Phase outputs (after merge) |
| `<code-repo>/.governance/design.md` | code repo | Phase 3 outputs |
| Each artifact's **Hatter's Tag** footer | inline in markdown | Published summary of the audit chain for that run — the auditor's single reading surface |

### 11.1 Hatter's Tag — full provenance schema

Required by SOC 2 CC8.1 ("prompt-as-design-evidence") and EU AI Act Article 12. Appended to every artifact PR:

```yaml
hatters_tag:
  # Intent identity
  intent_thread_uuid: 7f3e9c2d-...      # stamped on every action/commit/PR across repos
  okr_id: OKR-2026Q1-IMDB-001
  parent_intent_thread: <uuid or null>  # links to upstream phase

  # Agent identity (Agent Roster / AI-BOM)
  author_did: did:gh:installation:1234567/agent:prd-agent
  author_model: claude-sonnet-4-6
  author_system_prompt_sha: sha256:<32 hex>
  author_prompt_pack_version: prd@v2.1

  # Reviewer identities (Tweedles — MUST NOT equal author)
  reviewer_dids:
    - did:gh:installation:7654321/agent:architect-reviewer
    - did:gh:installation:7654321/agent:security-reviewer

  # Grounding refs
  threat_model_ref: platforms/imdb-lite/bars/imdb-celebs/security/threat-model.yaml@sha
  calm_nodes_referenced: [bar-imdb-api, shared-identity, celeb-db]
  adrs_referenced: [ADR-007, ADR-014]
  owasp_categories: [A01, A03]
  stride_threats: [THR-114, THR-122]

  # Fitness + reviewer scores
  fitness_results:
    cyclomatic_max: 9            # gate: ≤ 10
    test_coverage: 84             # gate: ≥ 80
  reviewer_scores:
    architect: 82
    security: 78
  governance_tier: supervised     # taken at run start; tier creep mitigation

  # Audit chain
  audit_log_path: okrs/OKR-.../audit/events/PRD-....jsonl
  chain_root_hash: <sha256>
  event_count: 47

  # Optional cryptographic seal (Phase B+ — Knight's Seal)
  signature:
    algorithm: ed25519
    public_key_did: did:gh:installation:1234567
    signed_at: 2026-05-19T15:01:00Z
    signature: <base64>

  # Rationale (free text — what the agent decided and why)
  rationale: >
    Selected canonical-id approach (per ADR-007) over name-string matching
    because identity-disambiguation threats (THR-114) require deterministic
    linkage. Coverage for CCPA opt-out (A01) via response-time gating.
```

This is **the auditor's master question, answered inline.** Every field is there to satisfy: *agent / prompt / threat model / test coverage / reviewer / rationale*.

### 11.2 Court Recorder envelope (CloudEvents v1.0)

Per-event records appended to `okrs/<id>/audit/events/<run>.jsonl` use CloudEvents v1.0 so the chain merges with Microsoft AGT and SIEMs (Splunk HEC, Sentinel, Datadog):

```json
{
  "specversion": "1.0",
  "type": "io.maintainabilityai.audit.skill_call",
  "source": "agent:prd-agent@did:gh:installation:1234567",
  "subject": "okr:OKR-2026Q1-IMDB-001/intent:7f3e9c2d-...",
  "id": "<event-uuid>",
  "time": "2026-05-19T15:01:00Z",
  "datacontenttype": "application/json",
  "data": {
    "skill": "context-architecture",
    "input": { "bar_ids": ["APP-IMDB-001"] },
    "duration_ms": 234,
    "ok": true
  },
  "prev_event_hash": "<sha256>",       // hash chain
  "this_event_hash": "<sha256>"
}
```

The hash chain (`prev_event_hash` → `this_event_hash`) gives Merkle-style append-only integrity. `verify-chain` CLI walks it.

### 11.3 Chain integrity rules

- **Within a run**: hash-chained JSONL (`audit-emitter.ts` already does this; we reuse it).
- **Across runs**: stitched via `intent_thread_uuid` + the `chain-ladder.yaml`. Inclusion proofs derivable.
- **Tampering surface**: if anyone hand-edits a merged artifact, Hatter `chain_root_hash` no longer matches the JSONL. The `verify-chain` CLI (already exists) flags it.
- **Retention**: ≥ 6 months in the mesh repo. EU AI Act Article 12 deadline 2 Aug 2026.

### 11.4 White Rabbit's Pocket Watch — goal-drift gate

At each phase boundary, a workflow step compares the hash of the OKR `objective` text at issue creation vs the same field at PR merge. Drift = label `goal-drift-detected`, blocks merge, surfaces in Looking Glass with a side-by-side diff. The intent is to catch agents that subtly rephrase scope into something the OKR didn't authorize.

### 11.5 What's NOT in the chain

- Reviewer agent prose comments on the PR (those are on GitHub's side; we capture the SCORE in audit but not the comment body).
- LLM model server logs (Anthropic / GH Models). We capture token counts + costs in audit, not the prompts/responses themselves.

---

## 12. Workshop alignment

The agentic-SDLC design must coexist with [workshop-starter-imdb-lite.md](../../docs/design/workshop-starter-imdb-lite.md), which defines a five-service learning environment learners clone and progressively govern through Parts 1–8.

### 12.1 Division of responsibility

| Concern | Workshop starter | This design |
|---|---|---|
| Five-service docker-compose stack | ✓ provides | does not touch |
| Four code repos (`imdb-react-frontend`, `imdb-identity`, `movie-api`, `celeb-api`) | learners clone from `imdb-lite-workshop-pack` | declared by name in `bar.app.yaml.repos[]` at mesh-seed time (Phase A); connection state ("declared/connected") tracked in Looking Glass |
| Planted OWASP issues per file | ✓ provides (A03/A01/CSRF/SSRF/etc.) | used downstream as research-finding evidence in the sample OKR's Why phase |
| BAR / platform CALM scaffolding | minimal | this design's Phase A seeds the asymmetric CALM (rich Lite / sparse Celebs) |
| Governance scoring + tier gating | not directly | this design's tier-aware recycle bounds use Workshop's score-progression to demonstrate Restricted → Supervised → Autonomous |
| OKR / IntentSpec layer | not in workshop spec | this design adds it; workshop curriculum could thread OKR creation into Part 8 (capstone) |

### 12.2 Curriculum touchpoints (where this design enables workshop parts)

| Workshop part | What it teaches | How the agentic-SDLC supports |
|---|---|---|
| Part 4 — Fitness Functions | Adds `threats:` + fitness blocks to Celebs | Once added, Celebs' score increases → tier upgrades from Restricted to Supervised; demonstrable in Looking Glass |
| Part 5 — Security Pipeline | Adds NIST controls to Celebs | Same — tier upgrade and reviewer auto-passes more findings |
| Part 6 — Team Prompt Library | Curates `.caterpillar/prompts/` | The prompt-pack version becomes a Hatter's Tag field; learners see provenance updates when they bump it |
| Part 7 — Red Queen's Court | Policy enforcement + role separation | **The Tweedles enforcement (§5.3) is exactly this lesson.** Architecture-reviewer rejecting agent-authored PRDs is the live demo. |
| Part 8 — Governance Capstone | End-to-end feature shipped | Learners create an OKR, run the Why/How/What pipeline, watch reviewers fire, end with a fully-audited Hatter's Tag in each artifact |

### 12.3 Mesh-side artifacts the seed must produce

Confirmed deliverable list for `scaffoldImdbLitePlatform()` after Phase A:

- ✓ Platform `PLT-IMDB`, slug `imdb-lite` (today)
- ✓ BAR `APP-IMDB-001` with rich CALM + ADRs (today)
- ✓ BAR `APP-IMDB-002` with sparse CALM (today — preserved intentionally)
- ✓ `platforms/imdb-lite/platform.arch.json` (today)
- **NEW**: `bar.app.yaml.repos[]` populated with the four workshop repo URLs (declared, not connected)
- **NEW**: `okrs/OKR-2026Q1-IMDB-001-celeb-api/okr.yaml` seeded as a draft (the Celebs gap is the worked example)
- **NEW**: `okrs/<id>/audit/` directory skeleton (empty `events/` + `chain-ladder.yaml` placeholder)

### 12.4 What learners experience end-to-end

1. **Open Looking Glass** → see IMDB-Lite platform with two BARs.
2. **Open the Celebs BAR** → see score ~30, badge says **Restricted**, plain "0 ADRs, 0 controls, 0 threats."
3. **Open OKRs tab** → see the sample OKR `Add celebrity profile API to IMDB-Lite`. Why/How/What cards all show "Pending."
4. **Click "Start Research"** on the Why card → research-request issue opens, archeologist data-collection fires.
5. **Assign Copilot** in Oraculum → market-research-agent does its work. PR opens.
6. **Reviewers fire** (architect-reviewer + security-reviewer, distinct DIDs). Both score the research-doc.
7. **Merge** → OKR's Why turns ✓, intent_thread_uuid stamped.
8. **Click "Generate PRD"** → prd-agent fires; uses `context-architecture` + `context-security` Skills to read the (sparse) Celebs governance + (rich) Lite governance + the merged research doc.
9. **The prd-agent's draft addresses the gaps** — explicit FRs for threat-model adoption, security controls, ADRs.
10. **Reviewers fire on PRD** — architect-reviewer scores 78, security-reviewer scores 71. Round 1 fails (security < 75).
11. **Agent revises in round 2** (Supervised tier allows max 2 rounds). Scores: 84/82. **GovPass.**
12. **Human merges PRD** → How turns ✓.
13. **design-bus.yml fires** → opens landing issue in `celeb-api` code repo.
14. **Wait** — Celebs is **still** Restricted tier. The design-bus check refuses to assign a design-agent. Looking Glass shows the issue tagged `needs-human-review` with a clear explanation: "BAR APP-IMDB-002 is Restricted; raise tier by completing Workshop Parts 4 + 5 before agent design can run."
15. **Learner completes Parts 4 + 5** (adds threats + controls to Celebs) → score crosses to 55 → tier upgrades to Supervised.
16. **Design-agent unblocks** → runs on `celeb-api`. Reviewers fire. Round 1 passes. Design PR merges.
17. **OKR closes** → learner fills `keyResultRetrospective` + `valueLearning`. Full Hatter's Tag chain auditable end-to-end.

That sequence is the workshop's narrative arc, end to end, with full agentic SDLC underneath.

---

## 13. Phased implementation plan

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

## 14. Open questions & risks

### 14.1 GitHub primitives

- **Skill auto-discovery vs explicit invocation**: docs say agents "can also discover and invoke skills automatically." If the LLM forgets to call context Skills, PRDs land ungrounded. Mitigation: the parent agent's system prompt enumerates required Skills with **exact invocation order**.
- **Skill timeout & budget**: not yet known; we model Skills as best-effort with `{ ok: false, reason }` fallback contracts.
- **Cross-repo agent execution**: design-agent must operate IN the code repo. `notify-code-repos.yml` already handles posting the landing issue with the right context.
- **No nested LLM calls**: by design. All reasoning is in the parent agent's context. Skills are pure data. This kills two birds: no GH-Models 429s on inner calls, and no cost surface multiplication.

### 14.2 NCMS adaptation

- **Inline `{expert_input}` placeholders in NCMS prompts** → on GitHub-hosted Copilot, the LLM calls expert Skills explicitly. Risk: the LLM forgets. Mitigation: structural check on the artifact (PRD must have `E1`/`E2` references; if missing, reviewer rejects).
- **Reviser loop**: NCMS does it externally in Python. We do it via the PR-comment cycle + bounded state machine.

### 14.3 Bounded recycle loop

- **Cost ceiling**: 2 auto-rounds + 1 HumanGate decision caps per-OKR pipeline cost. Estimated ~$2-5 per OKR on Anthropic, ~$0.20-1 on github-models (custom tier).
- **Cycle thrashing**: if agent A keeps not addressing the same finding, MAX_AUTO_ROUNDS=2 catches it. Audit captures the repeated finding for human review.
- **Reviewer leniency**: at first, calibrate by also requiring human OK before merge. Once reviewer scores correlate with PR quality in practice, auto-merge can be enabled.

### 14.4 OKR ↔ Platform integrity

- **`affected_bar_ids` MUST reference real BARs**. We validate on save: each id resolves to a BAR in the platform.
- **`target_code_repos` is derived, not stored**: read each BAR's `app.yaml.repos[]` at runtime so it stays in sync.
- **What if a BAR is added/removed mid-OKR?**: the OKR view shows a warning; the user must re-derive (one click) to update.

### 14.5 IMDB Lite sample correctness (validated)

- ✅ Sample platform exists (`PLT-IMDB`, slug `imdb-lite`)
- ✅ Two BARs (`APP-IMDB-001`, `APP-IMDB-002`)
- ✅ `platform.arch.json` populated via `generateSampleImdbPlatformArch()`
- ✅ Asymmetric CALM density preserved by design (8 nodes + controls on Lite; 6 nodes + no controls on Celebs — verified against `calmTemplates.ts:714` and `:948`)
- ⏳ Sample OKR (Phase A deliverable — `scaffoldImdbLiteOkr()`)
- ⏳ Each BAR's `app.yaml.repos[]` populated with the four workshop repo names (today: empty by default — Phase A also seeds these as **declared** URLs)

### 14.6 Roadmap-aligned governance risks

- **Goal drift (OWASP T6)** — mitigated by White Rabbit's Pocket Watch (§11.4). Each phase boundary hashes the OKR.objective and compares.
- **Tier creep (§4.5 of roadmap)** — mitigated by recording the tier at run start in the Hatter's Tag. If a BAR's score gets bumped mid-pipeline, the recorded tier still applies; auditor can spot tier creep.
- **Role separation (NIST SA-11, SOC 2)** — mitigated by Tweedles (§5.3). Reviewer DID ≠ author DID; workflow enforces.
- **Repudiation (OWASP T8) / identity spoofing (T9)** — partially mitigated by GitHub App installation tokens (Queen's Keyring) recorded in audit; **fully** mitigated only when Knight's Seal (Ed25519) ships (Phase B+).
- **LLM-rephrasing bypass** — mitigated by pure-data Skills (no agent rewrites another agent's grounding via a Skill call). Plus the Caterpillar's Challenge: explicit comparison step that flags semantic drift between phase artifacts.
- **Implicit-intent guesswork** — mitigated by IntentSpec frontmatter (Phase B+). The OKR Card carries `owasp_categories`, `stride_threats`, `calm_nodes`, `fitness_gates`, `governance_tier_required` — explicit, not inferred.
- **Reviewer leniency** — at first, human still merges (Supervised default). Once reviewer calibration is verified in real OKR runs, Autonomous tier auto-merge enabled with branch protection still gating.

### 14.7 EU AI Act Article 12 compliance

- Automatic logging: ✓ (Court Recorder via CloudEvents envelope, hash-chained, append-only)
- ≥ 6 month retention: ✓ (mesh repo retention)
- Model version + inputs + operator + timestamps: ✓ (Hatter's Tag fields)
- Deadline 2 Aug 2026: this design Phase A unblocks; Phase B closes (with Knight's Seal making it cryptographic)

---

## 15. Deliverables map

| Deliverable | Location | Phase |
|---|---|---|
| `okr.yaml` schema + Zod type (incl. `intent_cascade`, `intent_thread_uuid`, IntentSpec frontmatter) | `vscode-extension/src/types/okr.ts` | A |
| OKRService | `vscode-extension/src/services/OKRService.ts` | A |
| `scaffoldImdbLiteOkr` (seeds objective + Org/Role/Developer/User cascade) | `vscode-extension/src/services/MeshService.ts` (extend) | A |
| OKR tile / list / detail views | `vscode-extension/src/webview/app/views/okr*.ts` | A |
| `bar.app.yaml.repos[]` seeding with 4 workshop repo names (`imdb-react-frontend`, `imdb-identity`, `movie-api`, `celeb-api`) — declared, not connected | `vscode-extension/src/services/MeshService.ts` (extend `scaffoldImdbLitePlatform`) | A |
| Asymmetric CALM seed: rich `app-imdb-lite.arch.json` (8 nodes, 5 NIST controls, threats) vs sparse `app-imdb-celebs.arch.json` (6 nodes, no controls/threats) → drives Autonomous-vs-Restricted tier example | `vscode-extension/src/templates/mesh/calmTemplates.ts` | A (already shipped — extend with threat-model + controls blocks on imdb-lite) |
| **Connect Repo** button for declared-but-not-connected `repos[]` entries (workshop manual connection step) | BAR detail view | A |
| **Intent Thread UUID** generator + stamping on every Hatter's Tag | `packages/research-runner/src/runner/hatters-tag-builder.ts` (rename `parent_run_id` → `intent_thread_uuid`/`parent_intent_thread`) | A |
| Hatter's Tag full schema: `intent_thread_uuid`, `author_did`, `author_prompt_pack_version`, `reviewer_dids[]`, `threat_model_ref`, `calm_nodes_referenced[]`, `owasp_categories[]`, `stride_threats[]`, `fitness_results`, `reviewer_scores`, `governance_tier`, `chain_root_hash` | `packages/research-runner/src/runner/hatters-tag-builder.ts` | A → B (signature: B+) |
| Audit event schema (phase, okr_id, intent_thread_uuid) | `packages/research-runner/src/runner/audit-emitter.ts` | A |
| **Court Recorder** CloudEvents v1.0 envelope emitter (SIEM-compatible JSONL, hash-chained, append-only) | `packages/research-runner/src/runner/court-recorder.ts` (new) | B |
| **Tier-detection logic** — read BAR pillar scores → derive `governance_tier` (Autonomous/Supervised/Restricted) → stamp on Hatter's Tag and gate `MAX_AUTO_ROUNDS` | `vscode-extension/src/services/BarService.ts` + agent workflow gates | B |
| **White Rabbit's Pocket Watch** goal-drift gate — hash OKR.objective at phase boundaries; compare PR scope against initial objective; block merge if drift > threshold | mesh template (workflow) + `verify-chain` CLI | C |
| **Caterpillar's Challenge** — explicit semantic-drift comparison step between phase artifacts (research → PRD → design → code) | mesh template (reviewer-bus.yml hook) | C |
| **Knight's Seal** — Ed25519 commit signing with agent DID; verification step in `verify-chain` | `packages/research-runner/src/runner/knights-seal.ts` (new) + GitHub App key mgmt | B+ |
| **Queen's Keyring** — short-lived per-task GitHub App installation tokens (scope: this OKR + repo set) | AgentDeploymentService + GitHub App config | B |
| Cleanup: Promote → Create OKR | `vscode-extension/src/webview/OracularPanel.ts` | A |
| Cleanup: Active Runs by OKR | `vscode-extension/src/webview/ActiveRunsPanel.ts` | A |
| `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search` Skills (PURE data — no LLM inside) | mesh template | B |
| `dedupe-and-rank` Skill | mesh template | B |
| `format-research-issue-update` Skill | mesh template | B |
| `knowledge-okr`, `knowledge-mesh-*`, `knowledge-research`, `knowledge-prd`, `knowledge-code`, `knowledge-reference-repos` Skills | mesh template | B (D) |
| `context-architecture`, `context-security`, `context-quality` Skills (pure mesh aggregators — NO LLM inside) | mesh template | B |
| `audit-emit-event` Skill (wraps Court Recorder for agent use) | mesh template | B |
| `market-research-agent`, `prd-agent`, `design-agent`, `architect-reviewer`, `security-reviewer` `.agent.md` files (with **Tweedles** enforcement: reviewer DID ≠ author DID check in workflow) | mesh template | B (D) |
| AgentDeploymentService | `vscode-extension/src/services/AgentDeploymentService.ts` | B |
| `reviewer-bus.yml`, `okr-bus.yml`, `design-bus.yml` (incl. Tweedles segregation check + Pocket Watch gate) | mesh template | C |
| State-machine logic in `label-on-merge.yml` | mesh template | C |
| HumanGate UI (Approve / Re-run / Reject) — surfaces drift score from Pocket Watch + reviewer scores | OKR detail view | C |
| `design-agent` + reference-repos | mesh template + service | D |
| `verify-chain` CLI surface (validates hash chain, signature chain, intent thread continuity, tier compliance) | Looking Glass action + research-runner CLI | E |
| **Workshop curriculum touchpoints** map (which mesh artifact each workshop Part produces) | `docs/workshop/agentic-sdlc-touchpoints.md` (new) | A |
| End-to-end smoke (IMDB Lite OKR — Autonomous path on lite, Restricted path on celebs) | docs/test | E |

---

## 16. What this is NOT

- Not a full re-architecture of `research-runner` — it stays as the implementation. The Skill is its agent-facing interface.
- Not a custom MCP server — uses built-in Copilot primitives. (redqueen-mcp keeps its existing scope: editor-side queries.)
- Not human-out-of-the-loop. Every phase still produces a PR for human merge. Reviewers assist; they don't replace.
- Not vendor-locked. Anthropic remains the fallback for research-runner LLM calls (synth is done by Copilot Coding Agent regardless).
- Not "every OKR uses every agent." Smaller scopes can stop at Phase 1 or 2; the schema tolerates partial completion.

---

*Last updated 2026-05-19 (v3 — aligned with agentic-governance-roadmap-2026 + workshop-starter-imdb-lite). This is a design document, not a commitment to ship every phase. Phase A unlocks the foundation; B unlocks the agents; C closes the loop. D and E are quality of life.*
