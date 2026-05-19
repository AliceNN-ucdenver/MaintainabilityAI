# Agentic SDLC — Design (v4)

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

**v4 (this update) — end-to-end refactor**:
- **OKR is the only trigger surface.** "Promote to research-request" is **removed**. The OKR detail page has `Start Why / Start How / Start What` buttons; each creates the right kind of issue with `okr_id` + objective + KRs + intent_cascade + affected BARs inlined. The agent reads OKR context cold via the `knowledge-okr` Skill — no body-parser fragility.
- **Oraculum narrows to code-repo architecture reviews.** It no longer hosts research issues. Its old "Promote" button becomes **"Create OKR from finding"** — pre-fills an OKR draft from a review's findings, then the user starts the pipeline from the OKR screen.
- **Custom workflow deprecation.** `oraculum-research.yml`, `archeologist.yml`, `prd.yml`, `notify-code-repos.yml` are deprecated and replaced by `.github/agents/*.agent.md` + `.github/skills/<name>/SKILL.md` + bus workflows (`reviewer-bus`, `okr-bus`, `design-bus`). Settings screen evolves to **Mesh Provisioning** with tabs for Workflows / Agents / Skills.
- **First sample OKR seeds on Celebs (Restricted tier)** — workshop's central learning moment. Why runs normally; How fails security review (missing threat model on `APP-IMDB-002`); learner must escalate Celebs governance OR dual-signature override before unlocking What. Demonstrates "governance unlocks autonomy" loop end-to-end.
- **Full OKR screen UI design** (§10.2) with ASCII mockup: header (objective + intent cascade + tier badge) → KR table → Affected BARs (with tier) → Target repos (declared/connected) → three Action cards (Why/How/What) with phase status, scores, Hatter Tag access, recycle counter, gates → action bar (Export Audit Report, Verify Chain).
- **Hatter Tag UI surfacing** (§10.4) — compact badge on each Action card + full-schema sheet on demand + embedded verbatim in audit report.
- **Audit Report Export** (§11.6) — one-click bundle from OKR detail: zip with `okr-card.pdf`, `traceability.html` (KR → Research Finding → FR/SR → Design → Code matrix), per-phase artifacts + Hatter Tags + audit-events JSONL + chain-verification, `chain-ladder.yaml`, `checksums.txt`. This is the single artifact the auditor needs to answer the master question.
- **Skills inventory grounded in real prompt files** (§7). Every Skill cites its exact prompt-pack path and its in-file good/bad-example anchors. No invented prompt content.
- **Phase tracking inline** (§13). Each phase has checkboxes for the items shipped vs planned vs blocked. This document becomes the single source of truth for "what's done."

**v3 alignment** — reviewed against [agentic-governance-roadmap-2026.md](../../docs/design/agentic-governance-roadmap-2026.md) and [agentic-governance-landscape.md](../../site-tw/public/docs/research/agentic-governance-landscape.md):
- **OKR Cards reframed as IntentSpecs** — "declarative intent that travels with the work". Why/How/What is the intent cascade.
- **Maps onto the existing 6-phase SDLC** (Design → Implement → Verify → Govern → Deploy → Evolve) — does NOT replace it.
- **Reviewer ≠ Author enforcement (Tweedles)** — architect/security reviewers are distinct Copilot agent sessions with distinct DIDs. NIST 800-53 SA-11 + SOC 2 segregation of duties. Roadmap §4.5 explicit.
- **Tier-aware recycle bounds** — Autonomous (80–100) / Supervised (50–79) / Restricted (0–49) read from BAR score. Restricted gets 0 auto-rounds + mandatory dual signature.
- **Hatter's Tag full provenance** — `{agent_did, model_version, system_prompt_sha, prompt_pack_version, threat_model_ref, owasp_categories, fitness_results, reviewer, rationale, intent_thread_uuid}`. Required by SOC 2 CC8.1 and EU AI Act Art. 12.
- **Intent Thread UUID** — what `parent_run_id` becomes; stamped on every action/commit/PR/review across repos. Fills Microsoft AGT's named "reasoning-trace correlation" gap.
- **White Rabbit's Pocket Watch (Goal-drift gate)** — explicit hash check of OKR.objective vs final PR scope at each phase boundary.
- **CloudEvents v1.0 audit envelope** — matches Court Recorder format so the chain merges with AGT.
- **EU AI Act Article 12** — automatic logging, ≥6 month retention. Deadline 2 Aug 2026.
- **Workshop alignment (§12)** — IMDB-Lite gets `app.yaml.repos[]` populated with the four workshop repo names (`imdb-react-frontend`, `imdb-identity`, `movie-api`, `celeb-api`). Asymmetric CALM density preserved: Lite has 8 nodes + NIST controls (Supervised tier); Celebs has 6 nodes + no controls (Restricted tier — demonstrably blocked from agent autonomy until governance is built up).

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
│   Skill calls: tavily-search | arxiv-search | uspto-search       │
│                | hackernews-search        (PURE — no LLM inside) │
│                dedupe-and-rank                                   │
│                format-research-issue-update                      │
│                knowledge-okr (read OKR card context)             │
│                knowledge-mesh-bar / -platform / -threats / -adrs │
│                context-architecture / context-security           │
│                audit-emit-event (per skill call + final)         │
│   Agent does all reasoning (query plan, gap analysis, synthesis) │
│   Output: okrs/<id>/why/research-doc.md + Hatter Tag             │
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

### 3.1 Trigger model — OKR-driven (v4)

The OKR detail page is the **only place** a user starts a phase. Three buttons map directly to the pipeline:

| Button | Visible when | Action |
|---|---|---|
| **Start Why** | OKR status = `draft` (or `researching` if re-running) | Creates an `oraculum-research` issue with `okr_id` in the body. Embeds objective, KRs, intent_cascade, affected_bar_ids. Adds `okr-anchor` label. The `okr-bus.yml` workflow picks it up and assigns the market-research-agent. |
| **Start How** | OKR status = `prd-pending` (Why merged) | Creates an `oraculum-prd` issue carrying the same OKR context plus a reference to the merged Phase 1 artifact. `okr-bus.yml` assigns prd-agent. |
| **Start What** | OKR status = `design-pending` (How merged) | Fans out one `oraculum-design` issue per entry in `objectiveAlignment.target_code_repos[]`. Each issue is **created in that target code repo**, not the mesh — the design lives next to the code it shapes. Carries OKR context + PRD reference + landing-repo scope. `design-bus.yml` assigns design-agent in each repo. |

**No more "Promote to research-request."** The flow is OKR → Start Why directly. Oraculum's old promote button is replaced by **"Create OKR from finding"** (§10.5) when a user discovers something while doing an architecture review and wants to spin a full OKR from it.

**How the agent receives OKR context.** The issue body inlines OKR context for human readability, but the agent does NOT parse the issue body. It calls the **`knowledge-okr`** Skill with `okr_id` (read from a labeled body line `<!-- okr_id: OKR-XXX -->`), which returns the canonical OKR YAML from the mesh. This is the same "cold read from mesh" pattern other knowledge Skills use — durable across rephrasing, edits, and translation.

**Phase gating.** A phase button is disabled until its prerequisite phase is **merged** (not just complete). The OKR `status` field is computed from `actions[]` + PR merge state by `OKRService`; the button enables on status transitions.

**Tier gating.** If the **highest-risk affected BAR** is Restricted tier (§6.2), the **Start What** button shows a yellow chip "Restricted — requires governance escalation" and is **disabled** until either (a) the BAR's pillar score rises above the Restricted threshold OR (b) a Dual-Signature Override is recorded against this OKR. Start Why and Start How still run (research and PRD don't ship code), but their reviewers will surface the same gaps so the human sees the wall coming.

### 3.2 What this replaces

| v3 surface | v4 surface |
|---|---|
| OracularPanel "Promote to research-request" button | OKR detail "Start Why" button |
| `archeologist.yml` workflow (label-fires on `research-request`) | search Skills (`tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search`) invoked by `market-research-agent` (agent does query-plan + gap-analysis reasoning itself) |
| `oraculum-research.yml` workflow (data collection in CI) | Same Skill, no separate workflow needed |
| `prd.yml` workflow | `prd-agent.agent.md` + `okr-bus.yml` |
| `notify-code-repos.yml` workflow | `design-bus.yml` fans out per `target_code_repos[]` |
| Issue-body-parsed brief (fragile) | OKR YAML read via `knowledge-okr` Skill (canonical) |

The retained workflows are `oraculum-review.yml` (architecture review on code repos) and `label-on-merge.yml` (housekeeping). See §10.5 for the Settings page migration.

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

### 7.0.5 Prompt pack inventory (source-of-truth files)

Every agent persona and every Skill that needs a structured output references a prompt pack file. These are real files on disk, versioned in `vscode-extension/prompt-packs/looking-glass/`, and seeded into the mesh by `PromptPackService.seedMeshPrompts` (which recurses subdirectories, so `research/*` and `prd/*` land in `.caterpillar/prompts/research/*` and `.caterpillar/prompts/prd/*` respectively).

**The prompt is the contract.** When a reviewer asks "by which prompt was this built?", the Hatter's Tag carries a prompt-pack version + SHA pointer back to one of these files. Never inline a prompt body in a Skill or agent file — always cite the pack path so versioning works.

| Concern | Pack path | Output format | Key anchors |
|---|---|---|---|
| Research — query plan generation | [`prompt-packs/looking-glass/research/query-plan.md`](../prompt-packs/looking-glass/research/query-plan.md) | `json-only` (4-key object: `web`, `arxiv`, `patent`, `community`) | **Per-provider good/bad examples** at lines 60–132. Tavily ✓ `celebrity data licensing standards GDPR CCPA 2026` ✗ `data privacy compliance trends 2026` (no subject anchor). arXiv ✓ `named entity disambiguation knowledge graph` ✗ `API integration challenges` (matches anything). USPTO ✓ Q1/Q2/Q3 narrow/medium/broad with `AND` boolean ✗ `celebrity profile API AND identity management` (5 stop-wordy terms → zero results). HN ✓ `name dedup` 2-3-word casual ✗ `identity disambiguation hacks` (too formal, zero HN results). |
| Research — gap analysis (follow-up) | [`prompt-packs/looking-glass/research/gap-analysis.md`](../prompt-packs/looking-glass/research/gap-analysis.md) | `json-only` (array of exactly 3 `web` queries) | **Bounded one-shot** — never iterative. Triggers only on `low_source_diversity` / `contradiction` / `topic_uncovered` gap signals. |
| Research — synthesis | [`prompt-packs/looking-glass/research/synthesis.md`](../prompt-packs/looking-glass/research/synthesis.md) | `markdown-with-tables` | 10 strict H2 sections in fixed order: Source Premises, Executive Summary, Cross-Source Analysis, Evidence Gaps, JTBD Analysis, Patent Landscape, Whitespace Analysis, Formal Conclusions, Recommendations, References. Each finding requires Supporting + Contradicting + Confidence (HIGH/MEDIUM/LOW). |
| Research — archaeology variant | [`prompt-packs/looking-glass/research/synthesis-archaeology.md`](../prompt-packs/looking-glass/research/synthesis-archaeology.md) | `markdown-with-tables` | Codebase archaeology synthesis (tree-sitter `ObservedArchitecture` × MeshContext CALM). Used by `redqueen-mcp` and the design-agent. |
| PRD — synthesis | [`prompt-packs/looking-glass/prd/synthesis.md`](../prompt-packs/looking-glass/prd/synthesis.md) | `markdown-with-tables` | **Bidirectional traceability** mandated. Every FR-NN cites R-N (research) or E-N (mesh expert input). Every Security Requirement cites a STRIDE THR-NNN and/or OWASP A0X. Output sections: Input Premises, Problem Statement, Goals/Non-Goals, Functional Requirements, Non-Functional, Security Requirements, Coverage Analysis table, Risk Matrix, Success Metrics, References. |
| PRD — ask experts (clarifying questions) | [`prompt-packs/looking-glass/prd/ask-experts.md`](../prompt-packs/looking-glass/prd/ask-experts.md) | `structured-review` | Runs in `deep` mode only. Each question has exactly: `scope`, `triggered_by_mesh_gap`, `question`, `why_it_matters`, `answerable_by`. **The mesh IS the expert** — questions anchor to mesh gaps. |
| PRD — architecture review (grounding gate) | [`prompt-packs/looking-glass/prd/architecture-review.md`](../prompt-packs/looking-glass/prd/architecture-review.md) | `structured-review` (regex-parsed by `verify_grounding`) | Emits `SCORE` (0.0-1.0), `COVERED`, `MISSING`, `CHANGES`. Reads `mesh.bar.calm_summary` + `calm_node_ids` + `adrs_in_scope` + `iteration`. NCMS `ARCHITECT_REVIEW` persona. |
| PRD — security review (grounding gate) | [`prompt-packs/looking-glass/prd/security-review.md`](../prompt-packs/looking-glass/prd/security-review.md) | `structured-review` (regex-parsed) | Same output shape as architecture-review. Reads `stride_entries` + `owasp_in_scope` + `nist_controls`. NCMS `SECURITY_REVIEW` persona. |
| Architecture domain pack (Oraculum review on code repo) | [`prompt-packs/looking-glass/architecture.md`](../prompt-packs/looking-glass/architecture.md) | Markdown guidance | CALM drift analysis: node-to-code mapping, phantom nodes, undocumented components. Used by `architect-reviewer` agent and the legacy `oraculum-review.yml` workflow. |
| Application security domain pack | [`prompt-packs/looking-glass/application-security.md`](../prompt-packs/looking-glass/application-security.md) | Markdown guidance | OWASP Top 10 pattern scan, threat-model compliance, dependency vuln analysis, security-control verification. Used by `security-reviewer` agent and the legacy `oraculum-review.yml` workflow. |

**Why this matters for the agent flow.** Each `.agent.md` references the pack(s) it uses by exact path: `prd-agent.agent.md` cites `.caterpillar/prompts/prd/synthesis.md`, `.caterpillar/prompts/prd/architecture-review.md`, `.caterpillar/prompts/prd/security-review.md`. The agent reads the pack at runtime — same way the legacy `oraculum-research.yml` / `prd.yml` workflows do today. The migration is **not a prompt rewrite** — it's a relocation: prompts move from workflow-invoked LLM nodes to agent-invoked-Skill outputs and agent-persona inputs.

**Anti-drift rule.** Reviewer agents MUST regex-parse the structured-review packs (architecture-review / security-review) for `SCORE`, `COVERED`, `MISSING`, `CHANGES` — same as `verify_grounding` does in the runner today. If the prompt pack changes its anchor names, the reviewer-bus.yml workflow won't be able to compute pass/fail and the OKR will stall. Pack edits go through their own PR (mesh repo) so the change is reviewed.

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

### 8.1 The seeded `okr.yaml` — primary-target Celebs (Restricted)

The first sample OKR **anchors on Celebs (APP-IMDB-002)** — the Restricted-tier BAR. This is deliberate: the OKR will run the Why phase normally, hit a wall on How (PRD security review fails for missing threat model), and require the learner to escalate Celebs governance OR dual-signature override before unlocking What. **This is the workshop's central learning moment** — "governance unlocks autonomy" — modeled end-to-end in a sample the learner can run from minute one.

`scaffoldImdbLiteOkr()` writes the file pre-populated with the BTABoK 9-section structure, status=`draft`. `objectiveAlignment.platform_id = PLT-IMDB` and `affected_bar_ids = [APP-IMDB-002, APP-IMDB-001]` (Celebs first — it's the BAR that drives tier).

```yaml
meta:
  card: BTABoKItem
  id: OKR-2026Q1-IMDB-001-celeb-api
  owner: <user from extension config>
  status: draft
  created_at: <scaffold time>
  updated_at: <scaffold time>
overview:
  name: "OKR Card"
  description: "Defines a structured approach for setting objectives, measuring progress, and aligning with strategic outcomes."
  notes: "Bridges strategy and execution within BTABoK."
howToUse:
  name: "How to use this card"
  description: |
    1. Review the objective + KRs; adjust if your scope differs.
    2. Click `Start Why` on the OKR detail page to run market research.
    3. After Why merges, click `Start How` to run the PRD agent.
    4. If the PRD security review fails (expected on Restricted-tier Celebs!),
       either escalate APP-IMDB-002 governance (add threat model + controls +
       ADRs) or invoke Human Override (dual signature).
    5. After How merges, click `Start What` to fan-out per-repo design.
    6. After delivery, complete keyResultRetrospective and valueLearning.
  notes: "Iterative — re-run any phase from the OKR page."
objective:
  name: "Add celebrity profile API to IMDB-Lite"
  description: |
    Enable IMDB-Lite to surface enriched celebrity profile data
    without introducing identity-disambiguation or licensing risk.
    Primary BAR is APP-IMDB-002 (IMDB Celebs) — currently Restricted.
keyResults:
  - { id: KR-1, metric: "Identity-disambiguation false-merge rate", target: "< 0.5%", measurement: "Production telemetry, week 2" }
  - { id: KR-2, metric: "Licensing-compliance audit pass rate", target: "100%", measurement: "Legal review at GA" }
  - { id: KR-3, metric: "p95 celebrity-profile fetch latency", target: "< 200ms", measurement: "Synthetic, 28-day rolling" }
actions: []
keyResultRetrospective: { name: "Key Result Retrospective", description: "", results: [] }
objectiveAlignment:
  platform_id: PLT-IMDB
  affected_bar_ids:
    - APP-IMDB-002    # Celebs — primary, Restricted tier — drives the gate
    - APP-IMDB-001    # IMDB Lite App — Supervised, consumes the new API
  target_code_repos:
    - <org>/celeb-api               # primary work — declared in APP-IMDB-002 app.yaml
    - <org>/imdb-react-frontend     # consumer surface — declared in APP-IMDB-001
  # Court Hierarchy — pre-seeded with workshop-relevant intent so the OKR
  # is runnable immediately. Learners can edit these to match their org.
  intent_cascade:
    org: "Grow IMDB monthly active users 15% YoY by enriching profile depth"
    role: "Engineering Lead — maintain p95 < 250ms across platform endpoints; keep new APIs behind feature flags during ramp"
    developer: "Ship the celeb-api endpoint with identity disambiguation; mount under /api/celebs/* in the React frontend"
    user: "Browse celebrity filmographies and bios without flicker on mobile"
valueLearning: { name: "Value & Learning", description: "Insights captured during execution.", learnings: [] }
downloads: { name: "Downloads", description: "Supporting materials and references.", links: [] }
governance:
  # Effective gates are derived from the BAR tier (Restricted on APP-IMDB-002
  # wins). These overrides are NOT used at seed time but the user can set
  # them later to relax/tighten for this specific OKR (audit-logged).
  score_threshold: 75
  max_auto_rounds: 0       # Restricted tier wins; auto-rounds disabled
  max_severity: MEDIUM
```

**Why Celebs and not Lite.** A Supervised-tier OKR (Lite) would run cleanly through Phase A→B→C and never demonstrate the gate. The whole point of having the tier system is that some work gets stopped. Putting the seed on Celebs gives every learner a hands-on encounter with the Red Queen's Court in their first hour.

### 8.2 End-to-end walkthrough — what the user sees (v4 trigger model)

This is the **canonical happy-and-blocked path** demonstrated in the workshop. Every step is from the OKR detail page in Looking Glass — no Oraculum, no settings, no shell.

| Step | Looking Glass surface | Mesh / repo state |
|---|---|---|
| **1. Open Platforms → IMDB-Lite → OKRs tab** | Sample OKR `OKR-2026Q1-IMDB-001-celeb-api` is listed (status=`draft`). Tier badge: **⚠ Restricted** (read from APP-IMDB-002 score). | `okrs/OKR-…/okr.yaml` already exists (scaffolded). |
| **2. Click the OKR → OKR detail page opens** | Three Action cards: Why ☐, How ☐ (gated on Why merged), What ☐ (gated on How merged + tier eligibility). `Start What` shows yellow chip: "Restricted — requires governance escalation". | none |
| **3. Click `Start Why`** | Creates issue with `<!-- okr_id: OKR-…-celeb-api -->`; objective + KRs + intent_cascade + affected_bar_ids inlined for human readers. Adds labels `oraculum-research`, `okr-anchor`. Issue URL shown in a toast with "View on GitHub" + "Active Runs". | Issue opened in mesh repo. `okr-bus.yml` fires → assigns `@market-research-agent`. |
| **4. Agent runs (no human action needed)** | Why card flips to ⏳ "Researching"; live event ticker shows skill calls (`tavily-search`, `arxiv-search`, etc.) | market-research-agent reads OKR via `knowledge-okr`, plans queries itself, invokes search Skills, writes `okrs/.../why/research-doc.md`, opens PR. |
| **5. Reviewer agents fire on the PR** | PR list (in Active Runs) shows reviewer scores filling in. Both architect-reviewer and security-reviewer score ≥ threshold (research output is mesh-grounded; nothing in Celebs sparseness affects research quality). | `actions[0]` appended: `phase=why, rounds=1, scores={architect:85,security:88}, status=complete`. |
| **6. PR merges (auto on Supervised-tier review path, since Why doesn't ship code)** | Why card flips to ✓ Complete. OKR status → `prd-pending`. How card enables `Start How`. | `okrs/.../why/research-doc.md` merged. Hatter Tag chain root recorded. |
| **7. Click `Start How`** | Creates `oraculum-prd` issue; OKR context inlined; agent assigned via `okr-bus.yml`. | Issue opened. |
| **8. PRD agent runs, opens PR** | How card flips to ⏳ "PRD synthesizing". Live events. | prd-agent reads research via `knowledge-research`, context via `context-architecture` + `context-security`, writes `okrs/.../how/prd.md`. |
| **9. Reviewer agents fire — security-reviewer SCORES LOW** | How card flips to ⚠ "Revision Required". Scores: Architect 78 ✓ \| Security **42 ✗** (threshold 70). `MISSING` items shown inline: "No `threat-model.yaml` on APP-IMDB-002", "No NIST controls block", "No ADRs covering identity disambiguation". | `actions[1]` appended: `phase=how, rounds=0/0, status=blocked, scores={architect:78,security:42}`. |
| **10. **Restricted gate engages** — agent does NOT auto-revise** | How card shows banner: **"Restricted tier — MAX_AUTO_ROUNDS=0. Choose: (A) Escalate APP-IMDB-002 governance, then re-run, or (B) Human Override (dual signature)."** | `revision-required` label NOT applied (it's only applied on Supervised/Autonomous tiers). PR stays open with reviewer comments. |
| **11a. Learner chooses (A) Escalate.** Goes to Looking Glass → Platforms → IMDB-Lite → APP-IMDB-002. Adds threat model + 2 NIST controls + 1 ADR. Re-scores. | APP-IMDB-002 score jumps from 32 → 68 → tier promoted Restricted → Supervised. **Tier change recorded in audit.** Back on the OKR, the How card banner updates: "Tier upgraded — re-run available." | `bars/imdb-celebs/security/threat-model.yaml` created; ADR-NNN created; `app.yaml` controls block added; BAR score recomputed; tier change emitted as `state_transition` event. |
| **11b. Alternatively, learner chooses (B) Override.** Modal: "Two signatures required. You: <user>. Approver: <input>." On confirmation, a `dual-signature-override.yaml` is committed under the OKR's `audit/` folder; the override + both signer DIDs are stamped on the next Hatter Tag. | `okrs/.../audit/dual-signature-override.yaml` created. | (audit-logged; tier remains Restricted but action is unblocked) |
| **12. Re-click `Start How`** | New PRD run kicks off; carries new OKR context (and the new threat model). Reviewers re-score: Architect 84 ✓ \| Security 81 ✓. | `actions[2]` (or amends `actions[1].rounds`) — second pass passes. |
| **13. How merges → OKR status → `design-pending`** | What card enables; `Start What` no longer yellow-chipped (BAR is now Supervised or override is on file). | `okrs/.../how/prd.md` merged. |
| **14. Click `Start What`** | Fans out 2 issues — one in `<org>/celeb-api`, one in `<org>/imdb-react-frontend`. Each carries OKR context + PRD ref. | Two issues opened in the respective code repos. `design-bus.yml` assigns design-agent on each. |
| **15. design-agent runs in each repo, opens PRs** | What card shows per-repo progress: `celeb-api` ⏳, `imdb-react-frontend` ⏳. | Per-repo design.md PRs opened. |
| **16. Reviewer agents fire (reviewer-bus.yml — runs in mesh, reads PR contents via GitHub API)** | Each per-repo design gets scored. | Per-repo Hatter Tags. Parent intent thread links back to OKR. |
| **17. Designs merge → OKR status → `building`** | What card flips to ✓. Code coding agents (out of scope of this design) implement against the merged designs. | Per-repo design merged. |
| **18. After production delivery, learner returns to OKR** | "Mark complete" → fills `keyResultRetrospective` (actual KR values) + `valueLearning` (insights). Status → `shipped`. | OKR card closed; ready for audit. |
| **19. Click `📦 Export Audit Report`** | Zip downloaded. Contains everything from §11.6 (Audit Report Export). | Audit report bundle generated. |

**What the learner has just done.** They've experienced the full Why→How→What pipeline AND the Restricted-tier gate AND the governance-escalation loop AND audit export — in a single sitting. Every step is real (real PRs, real reviewers, real Hatter Tags, real chain). The IMDB-Lite + Celebs asymmetric seed is what makes that possible.

---

## 9. Orchestration — label-driven workflows (v4)

The orchestration shifts from per-phase workflows (one per phase, each containing the LLM calls) to **bus workflows** (one per orchestration concern, each delegating LLM work to agents and Skills). This is the substrate that makes the v4 trigger model (§3.1) cleanly drive end-to-end runs without the user touching workflow YAML.

**Active workflows in v4:**

| Workflow | Trigger | Action |
|---|---|---|
| **`okr-bus.yml`** (NEW, Phase C) | Issue opened with `okr-anchor` label | Reads `okr_id` from issue body; resolves to OKR via `knowledge-okr` Skill; assigns the right agent (`market-research-agent` for `oraculum-research`, `prd-agent` for `oraculum-prd`); updates `okrs/<id>/okr.yaml` `actions[]` + `chain-ladder.yaml` on every state transition; flips OKR `status` field; posts status comments back to the anchor issue. |
| **`reviewer-bus.yml`** (NEW, Phase C) | PR opened with `research-synthesis` / `prd-draft` / `design-draft` label | Fires architect-reviewer + security-reviewer agents **in parallel**; enforces **Tweedles** (reviewer DID ≠ author DID — checked before agent dispatch and again after review); applies labels per state machine §6; runs **White Rabbit's Pocket Watch** drift check against OKR.objective hash; runs **Caterpillar's Challenge** semantic-drift comparison vs prior phase. |
| **`design-bus.yml`** (NEW, Phase C) | PR merged with `prd-draft` + `governance-pass` | Reads merged PRD's `target_code_repos[]` from manifest; opens one `oraculum-design` issue **in each target code repo** (not in the mesh) carrying OKR context + PRD ref + landing scope; assigns `design-agent` on each. |
| `label-on-merge.yml` (retained, **extended**) | PR merge | Adds `governance-pass` only when both reviewers ≥ threshold AND tier allows; applies `revision-required` on Supervised/Autonomous up to MAX_AUTO_ROUNDS; emits `human-gate` label on round exhaustion. |
| `oraculum-review.yml` (retained, **scope narrowed**) | `@claude` / `@copilot` on `oraculum-review` issue (code-repo architecture review) | Unchanged from v3 — but no longer the entry point for any OKR-anchored work. |

**Deprecated (Phase B removal, audit-logged via Settings → Mesh Provisioning):**

| Workflow | Replaced by |
|---|---|
| ~~`archeologist.yml`~~ | search Skills (`tavily-search`/`arxiv-search`/`uspto-search`/`hackernews-search`) invoked by `market-research-agent` |
| ~~`oraculum-research.yml`~~ | `market-research-agent` + `okr-bus.yml` |
| ~~`prd.yml`~~ | `prd-agent` + `okr-bus.yml` |
| ~~`notify-code-repos.yml`~~ | `design-bus.yml` |

**Why bus workflows.** Each bus has one concern (Tweedles + label state, or OKR-state update, or per-repo fan-out). Concerns compose; bus workflows can be reasoned about independently. The old per-phase workflows mixed LLM-call orchestration with state management, which made changing either side risky. The v4 design isolates them.

**State machine reference**: see §6.1 (auto-rounds + HumanGate) and §6.2 (tier-aware bounds). The reviewer-bus enforces the tier cap; the label-on-merge writes the resulting label.

---

## 10. Looking Glass integration

The OKR screen is the **primary surface** for v4. Everything that used to be scattered across Oraculum + Active Runs + Settings now has a clear home, and there's exactly one place to "do work": the OKR detail page.

### 10.1 OKR list view

New top-level tile **"OKRs"** in the portfolio header, alongside Business / Applications / Policies / Settings.

Table columns: **Objective** · **Platform** · **Primary BAR (tier badge)** · **Status** · **Phase progress (Why ✓ / How ⏳ / What ☐)** · **Last activity** · **Chain root (short sha)** · **Actions** (`Open` / `Export Audit`).

Status badges: `draft` · `researching` · `prd-pending` · `prd-blocked` · `design-pending` · `building` · `shipped` · `archived`. The `prd-blocked` state is new for v4 — it's how the Restricted-tier-gate surfaces in the list view.

Filters: by platform · by status · by tier · by owner. Searchbox over objective text.

### 10.2 OKR detail view — full mockup

This is the screen the user spends 80% of their time on. Single scrolling page; three logical regions (header, actions, footer).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Platforms / IMDB-Lite / OKRs                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ 🎯 OKR-2026Q1-IMDB-001-celeb-api          [Status: How-Pending] [⚠ Restricted]│
│                                                                                │
│ Add celebrity profile API to IMDB-Lite                            [Edit] [⋮] │
│ _Enable IMDB-Lite to surface enriched celebrity profile data without …_       │
│                                                                                │
│ ▾ Intent Cascade                                                              │
│   Org       → Grow IMDB monthly active users 15% YoY                          │
│   Role      → Engineering Lead — maintain p95 < 250ms                         │
│   Developer → Add celebrity API; ship behind feature flag                     │
│   User      → Browse celebrity profiles without flicker on mobile             │
│                                                                                │
│ ▾ Key Results                                                                  │
│  ┌──┬──────────────────────────────────────────┬────────────┬──────────────┐  │
│  │  │ KR-1  Identity-disambiguation false-merge│ Target<0.5%│  unmeasured  │  │
│  │  │ KR-2  Licensing-compliance audit pass    │ Target 100%│  unmeasured  │  │
│  │  │ KR-3  p95 celeb-profile fetch latency    │ Target<200ms│ unmeasured  │  │
│  └──┴──────────────────────────────────────────┴────────────┴──────────────┘  │
│                                                                                │
│ ▾ Affected BARs                                                                │
│   • APP-IMDB-002 (IMDB Celebs)    Score: 32   ⚠ Restricted    [Open BAR ↗]    │
│   • APP-IMDB-001 (IMDB Lite App)  Score: 64    Supervised      [Open BAR ↗]   │
│                                                                                │
│ ▾ Target Code Repos                                                            │
│   • <org>/celeb-api               [● Connected]      [Open ↗]                 │
│   • <org>/imdb-react-frontend     [○ Declared]       [Connect…]               │
│                                                                                │
├── ACTIONS ─────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ ╭─ Why (Research) ────────────── ✓ Complete · Rounds 1 · 2026-05-19 ────────╮ │
│ │  Agent:     market-research-agent (did:gh:…/agent:market-research)         │ │
│ │  Model:     claude-sonnet-4-6                                              │ │
│ │  Prompt:    research/query-plan@v3 · research/synthesis@v2                 │ │
│ │  PR:        #49 (merged 2026-05-19)                          [View PR ↗]   │ │
│ │  Scores:    Architect 85 · Security 88                                     │ │
│ │  Tier:      supervised (frozen at run start)                               │ │
│ │  Hatter:    chain_root sha256:a8c2…f019    [View Tag ↗] [Verify Chain ↗]  │ │
│ │  Artifact:  okrs/.../why/research-doc.md                     [Open ↗]      │ │
│ │  ▸ Audit timeline (47 events)                                              │ │
│ ╰────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                │
│ ╭─ How (PRD) ───────────────── ⚠ Blocked · Rounds 1/0 · 2026-05-19 ────────╮ │
│ │  Agent:     prd-agent                                                      │ │
│ │  Model:     claude-sonnet-4-6                                              │ │
│ │  Prompt:    prd/synthesis@v2 · prd/architecture-review@v2 · prd/security-…│ │
│ │  PR:        #52 (open)                                       [View PR ↗]   │ │
│ │  Scores:    Architect 78 ✓  ·  Security 42 ✗ (threshold 70)                │ │
│ │  Tier:      restricted (MAX_AUTO_ROUNDS=0)                                 │ │
│ │  Hatter:    chain_root sha256:b4ee…d301    [View Tag ↗] [Verify Chain ↗]  │ │
│ │                                                                            │ │
│ │  ▼ Reviewer findings (security)                                            │ │
│ │   • MISSING: threat-model.yaml on APP-IMDB-002                             │ │
│ │   • MISSING: NIST controls block (AC-6, AU-2, SC-13 expected)              │ │
│ │   • MISSING: ADR for identity-disambiguation strategy                      │ │
│ │                                                                            │ │
│ │  ⛔ Restricted tier blocks auto-revision.                                  │ │
│ │  Next:                                                                     │ │
│ │   ● [Escalate APP-IMDB-002 governance] — open BAR detail to add artifacts │ │
│ │   ● [Human Override — dual signature]                                     │ │
│ │                                                                            │ │
│ │  ▸ Audit timeline (62 events)                                              │ │
│ ╰────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                │
│ ╭─ What (Design) ────────────────────────────────── ☐ Blocked ──────────────╮ │
│ │  Gated on:  How merged + tier eligibility                                  │ │
│ │  Fan-out (one issue per target repo, opened in that repo):                 │ │
│ │   • <org>/celeb-api               not started                              │ │
│ │   • <org>/imdb-react-frontend     not started                              │ │
│ │                                                                            │ │
│ │  ⚠ Restricted tier — `Start What` disabled until either:                  │ │
│ │     - APP-IMDB-002 score ≥ 50 (Supervised), OR                            │ │
│ │     - Dual-signature override is recorded against this OKR                │ │
│ ╰────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                │
├── REVIEW ──────────────────────────────────────────────────────────────────────┤
│ ▸ Value & Learning (post-delivery)                                            │
│ ▸ Key Result Retrospective (post-delivery)                                    │
│ ▸ Downloads (auto-populated)                                                  │
│                                                                                │
├── FOOTER ──────────────────────────────────────────────────────────────────────┤
│ [📦 Export Audit Report]   [🔍 Verify Chain]   [⏸ Pause]   [📂 Open Mesh Folder]│
└────────────────────────────────────────────────────────────────────────────────┘
```

**Why it's one screen, not tabs.** The OKR is a narrative — Why led to How led to What. Tabs would let the user open How without having looked at Why; the linear page enforces the reading order that matches the audit trail. The reviewer findings are inline (not behind a click) when a phase is blocked — Restricted-gate context shouldn't require a sub-navigation.

### 10.3 Action card sub-states

A single component renders all three Action cards. Its sub-state model:

| Sub-state | Visual | When |
|---|---|---|
| `not-started` | ☐ gray title; primary button "Start <phase>" | No `actions[]` entry for this phase yet |
| `gated` | ☐ gray title + reason chip ("Gated on Why merged" / "Restricted — escalate") | Prerequisite not met |
| `in-progress` | ⏳ amber title + live event ticker (last 3 skill calls) | `actions[].status = in_progress` |
| `under-review` | ⏳ amber title + "Reviewers running…" | PR open, reviewer-bus active |
| `revision-required` | ⚠ orange title + reviewer findings + "Auto-revising (round 2/2)" | Supervised/Autonomous tier, score below threshold |
| `blocked` | ⛔ red title + reviewer findings + escalation choices | Restricted tier OR auto-rounds exhausted |
| `human-gate` | 🛑 red title + Approve / Re-run / Reject buttons | MAX_AUTO_ROUNDS reached on Supervised tier |
| `complete` | ✓ green title + Hatter Tag chip + Audit timeline expandable | PR merged, action recorded |

Sub-state is computed in `OKRService` from `actions[]` + PR merge state + BAR tier — never stored.

### 10.4 Hatter's Tag UI surfacing

Three places. **One source of truth** — the Hatter Tag YAML in the PR description / artifact frontmatter (mesh repo). Looking Glass renders it; never duplicates it.

**(a) Compact in-card chip** on each completed Action card:

```
Hatter:    chain_root sha256:a8c2…f019    [View Tag ↗] [Verify Chain ↗]
```

**(b) Full sheet on "View Tag" click** — slides in from the right, modal width. Renders the Hatter's Tag schema (§11.1) with field grouping, DIDs masked except last 8 chars, click-to-copy.

```
┌─ Hatter's Tag — RES-2026-05-19-abc123 ──────────────────────────┐
│ Intent Thread    7f3e9c2d-aaaa-bbbb-cccc-dddddddddddd  [copy]    │
│ Parent           (none — root)                                   │
│                                                                  │
│ Author                                                           │
│  DID            did:gh:installation:…/agent:market-research      │
│  Model          claude-sonnet-4-6                                │
│  Prompt SHA     sha256:a8c2…f019                                 │
│  Prompt Pack    research/query-plan@v3 + research/synthesis@v2   │
│                                                                  │
│ Reviewers (Tweedles: reviewer DIDs ≠ author DID ✓)               │
│  Architect      did:gh:installation:…/agent:architect-reviewer   │
│                 score 85                                         │
│  Security       did:gh:installation:…/agent:security-reviewer    │
│                 score 88                                         │
│                                                                  │
│ Grounding                                                        │
│  Threat model   platforms/imdb-lite/…/threat-model.yaml@7a3b9d   │
│  CALM nodes     bar-imdb-api · shared-identity · celeb-db        │
│  ADRs           ADR-007 · ADR-014                                │
│  OWASP          A01 · A03                                        │
│  STRIDE         THR-114 · THR-122                                │
│                                                                  │
│ Fitness                                                          │
│  Cyclomatic max  9   (gate ≤ 10) ✓                               │
│  Test coverage   84% (gate ≥ 80) ✓                               │
│                                                                  │
│ Governance Tier   supervised (frozen at run start)               │
│                                                                  │
│ Chain                                                            │
│  Audit log     okrs/OKR-…/audit/events/RES-…jsonl  [Open]        │
│  Root          sha256:a8c2…f019                                  │
│  Events        47                                                │
│  Signature     ed25519:…  ✓ verified  (Phase B+)                 │
│                                                                  │
│ Rationale                                                        │
│ > Selected canonical-id approach (per ADR-007) over name-string  │
│   matching because identity-disambiguation threats (THR-114)     │
│   require deterministic linkage. CCPA opt-out (A01) covered via  │
│   response-time gating.                                          │
│                                                                  │
│  [Open Audit JSONL]   [Verify Chain]   [Copy as YAML]            │
└──────────────────────────────────────────────────────────────────┘
```

**(c) In the Audit Report Export** (§11.6) — verbatim YAML, one per phase, in the bundle.

The `[Verify Chain]` button runs the `verify-chain` CLI (already exists in `research-runner`) against the JSONL — returns a green ✓ chip with event count + root match, or red ✗ with the first mismatch.

### 10.5 Oraculum repositioned — code-repo architecture reviews only

The Oraculum panel narrows scope. It now hosts **only `oraculum-review` issues** — architecture/security reviews of a code repo or a BAR. Everything OKR-anchored leaves Oraculum.

**Removed in v4:**
- "Promote to research-request" button → gone
- Research-issue list/filter → gone (research lives on the OKR screen)
- Kind-routing (`isResearch` vs `isReview` branch in `OracularPanel.onAssignAgent`) → simplified to review-only
- The `oraculum-research.yml` workflow target → deprecated (see §10.6)

**Replaced by:**
- **"Create OKR from finding"** button. When a reviewer agent surfaces a finding worth a full OKR (e.g. "this BAR has no threat model"), the user clicks the finding and chooses "Create OKR." Looking Glass opens an OKR draft modal pre-filled with:
  - Objective inferred from the finding
  - Affected BARs = the BAR being reviewed
  - Intent cascade fields blank (user fills)
  - Pre-set platform_id from the BAR's parent
- On confirm, an OKR is created in the mesh, and Looking Glass navigates to the OKR detail page. The user clicks `Start Why` from there.

**Retained in Oraculum:**
- Architecture review issues + AI-agent assignment (`@copilot` / `@claude`) for the actual review work
- Active Runs panel (but now grouped by OKR or by review kind — not by raw run id)
- Hub list view

### 10.6 Settings page migration — "Mesh Provisioning"

The current Settings panel deploys 6 workflows (`oraculum-review`, `oraculum-research`, `archeologist`, `prd`, `label-on-merge`, `notify-code-repos`). v4 reshapes this into **Mesh Provisioning** with three tabs.

**Tab 1: Workflows** (reduced set; sunset notices on deprecated)

| Workflow | Status | Action |
|---|---|---|
| `oraculum-review.yml` | ✓ Active — code-repo architecture reviews | Deploy / Redeploy |
| `label-on-merge.yml` | ✓ Active — housekeeping | Deploy / Redeploy |
| `okr-bus.yml` | ✦ New (Phase C) — OKR phase orchestration | Deploy |
| `reviewer-bus.yml` | ✦ New (Phase C) — fires Tweedle reviewers in parallel | Deploy |
| `design-bus.yml` | ✦ New (Phase C) — per-repo design fan-out | Deploy |
| ~~`oraculum-research.yml`~~ | ⊘ Deprecated — replaced by market-research-agent + Skills | Remove (after Phase B verified) |
| ~~`archeologist.yml`~~ | ⊘ Deprecated — same | Remove |
| ~~`prd.yml`~~ | ⊘ Deprecated — replaced by prd-agent + okr-bus | Remove |
| ~~`notify-code-repos.yml`~~ | ⊘ Deprecated — replaced by design-bus | Remove |

The "Remove" action is **explicit and audit-logged** — the user must confirm, and a `state_transition: workflow_removed` event is appended to the mesh audit. Removed workflows can be re-deployed (rollback).

**Tab 2: Agents** (Phase B+)

Lists every `.github/agents/<name>.agent.md` file the mesh template ships. For each:
- Name, description, status (deployed / not deployed / stale [version mismatch])
- Deploy / Redeploy button (writes the agent file + PR description, doesn't auto-merge — user reviews)
- "Open in editor" to inspect the system prompt

Agents shipped in Phase B: `market-research-agent`, `prd-agent`, `design-agent`, `architect-reviewer`, `security-reviewer`.

**Tab 3: Skills** (Phase B+)

Lists every `.github/skills/<name>/` folder. For each:
- Name, kind (search / knowledge / context / audit), status
- Deploy / Redeploy button
- "Open SKILL.md" to inspect

Skills shipped in Phase B: as in §7.1–7.5.

**Retained settings**: LLM model preference, research secrets (TAVILY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY), prompt-pack refresh button. These move to a fourth tab **"Secrets & Models"** to keep the Provisioning tabs focused on deployable artifacts.

### 10.7 New services

- **`OKRService`** in `vscode-extension/src/services/OKRService.ts`:
  - `readAll(meshPath)` → all OKR cards with computed status
  - `read(meshPath, okrId)` → one card + chain ladder + computed sub-state per phase
  - `create(meshPath, draft)` → seed new `okrs/<id>/` folder; emit `state_transition: okr_created` audit event
  - `appendAction(meshPath, okrId, action)` → audit-safe action append
  - `updateStatus(meshPath, okrId, newStatus)` → with audit event
  - `targetCodeReposFor(meshPath, okrId)` → reads `affected_bar_ids[].app.yaml.repos[]`
  - `tierFor(meshPath, okrId)` → minimum tier across affected BARs (Restricted wins)
  - `exportAuditReport(meshPath, okrId)` → see §11.6
- **`AgentDeploymentService`** in `vscode-extension/src/services/AgentDeploymentService.ts`:
  - `deployAgents(meshPath, extensionPath)` → write `.github/agents/*.agent.md`
  - `deploySkills(meshPath, extensionPath)` → write `.github/skills/<name>/`
  - `removeDeprecatedWorkflow(meshPath, name)` → audit-logged removal
  - Replaces the old `provisionWorkflow` single-purpose method (which only knew about the legacy workflow list).
- **`HatterTagService`** in `vscode-extension/src/services/HatterTagService.ts`:
  - `read(meshPath, runId)` → parse Hatter Tag YAML from artifact frontmatter or PR description
  - `verifyChain(meshPath, runId)` → invoke `verify-chain` CLI, return result for UI rendering

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

### 11.6 Audit Report Export — the single artifact that answers the auditor's question

The `📦 Export Audit Report` button on the OKR detail page produces a **single zip bundle** that an auditor (internal, regulatory, or your own future self at 3 AM during an incident) can open standalone and reconstruct exactly how this OKR went from intent to code.

**Why this matters.** The chain already lives in the mesh repo — Hatter Tags, JSONL, Pocket Watch hashes, signatures. But following it requires git clone, mesh literacy, JSONL tooling, and three browser tabs. An auditor will not do that. The Export bundles every relevant artifact into one zip with an index, normalized paths, and a traceability matrix that walks **KR → Research Finding → PRD FR/SR → Design element → Code PR → Hatter Tag chain root**.

#### 11.6.1 Bundle structure

```
audit-report-OKR-2026Q1-IMDB-001-celeb-api-2026-05-19.zip
├── README.md                              # human-readable index — start here
├── okr-card.pdf                           # rendered BTABoK 9-section card
├── okr-card.yaml                          # raw YAML at export time
├── traceability.html                      # interactive matrix (KR → Finding → … → Code)
├── traceability.csv                       # same data, machine-readable
├── why/
│   ├── research-doc.md                    # merged Phase 1 artifact
│   ├── hatters-tag.yaml                   # full Hatter Tag (§11.1 schema)
│   ├── audit-events.jsonl                 # CloudEvents — every skill call
│   ├── chain-verification.txt             # verify-chain CLI output (PASS/FAIL + root)
│   └── pr-49.html                         # snapshot of the merged PR (description + final diff)
├── how/
│   ├── prd.md
│   ├── hatters-tag.yaml
│   ├── reviewer-architect.md              # reviewer's structured-review output
│   ├── reviewer-security.md
│   ├── audit-events.jsonl
│   ├── chain-verification.txt
│   ├── pr-52.html
│   └── tier-override.yaml                 # ONLY if dual-signature override was used
├── what/
│   ├── celeb-api/
│   │   ├── design.md
│   │   ├── hatters-tag.yaml
│   │   ├── audit-events.jsonl
│   │   ├── chain-verification.txt
│   │   └── pr-link.txt                    # link to PR in the target code repo
│   └── imdb-react-frontend/
│       └── …
├── chain-ladder.yaml                      # parent_intent_thread tree across all phases
├── intent-thread.txt                      # uuid + summary list of all events under it
├── pocket-watch.txt                       # White Rabbit goal-drift hashes per phase
├── governance-tier-history.yaml           # tier at run start for each phase + any tier changes
├── prompt-packs/                          # frozen copies of every prompt pack version cited
│   ├── research-query-plan-v3.md
│   ├── research-synthesis-v2.md
│   ├── prd-synthesis-v2.md
│   ├── prd-architecture-review-v2.md
│   └── prd-security-review-v2.md
├── threat-model-snapshots/                # threat-model.yaml at each phase's run start
│   ├── why-threat-model.yaml
│   ├── how-threat-model.yaml
│   └── what-threat-model.yaml
├── calm-snapshots/                        # CALM model state at each phase
│   ├── why-bar-APP-IMDB-002.arch.json
│   ├── how-bar-APP-IMDB-002.arch.json
│   └── …
└── checksums.txt                          # SHA256 of every file in the bundle
```

#### 11.6.2 The traceability matrix (`traceability.html` + `traceability.csv`)

The matrix is the single most important artifact in the bundle. It answers the question "show me the thread from outcome to code" in one table.

| KR | Research Finding (S-id) | PRD Requirement | Design Element | Code Repo | PR | Hatter Tag chain root |
|---|---|---|---|---|---|---|
| KR-1 (false-merge < 0.5%) | S3 (Identity disambiguation prior art — arXiv) | FR-2 (canonical-id entity resolver) + SR-1 (THR-114 mitigation) | celeb-api §3.2 entity-resolver | <org>/celeb-api | PR#14 | sha256:c2a7… |
| KR-2 (licensing 100%) | S7 (CCPA compliance guidance — web) | SR-2 (response-time gated opt-out, A01) | celeb-api §4.1 opt-out middleware | <org>/celeb-api | PR#14 | sha256:c2a7… |
| KR-3 (p95 < 200ms) | S11 (caching benchmarks — HN) | NFR-3 (caching strategy) | celeb-api §5.2 cache layer + imdb-react-frontend §2.3 SWR | <org>/celeb-api · <org>/imdb-react-frontend | PR#14 · PR#7 | sha256:c2a7… · sha256:f8e1… |

**How the matrix is generated.** `OKRService.exportAuditReport()`:
1. Reads merged Phase 1 artifact, extracts `S[N]` citations and the section each belongs to.
2. Reads merged Phase 2 artifact, extracts `FR-NN` / `SR-NN` / `NFR-NN` entries and their `R[N]` / `E[N]` back-references.
3. Reads each merged Phase 3 design.md, extracts design-element headings and their PRD-requirement references.
4. Cross-joins by KR (read from the OKR card's `keyResults[]` + the `linked_krs` frontmatter on each FR/SR).
5. Emits CSV + interactive HTML (sortable, filterable, deep-linked back to GitHub PR + raw artifact paths).

**Where the back-links come from.** Each PRD requirement carries `linked_krs: [KR-1, KR-2]` frontmatter; each design element carries `addresses: [FR-2, SR-1]`. These are mandated by the prompt packs (§7.0.5 — `prd/synthesis.md` requires bidirectional traceability). If a requirement has no `linked_krs`, the export still emits a row but flags it `⚠ UNLINKED` so an auditor sees the gap rather than the row being silently dropped.

#### 11.6.3 README.md inside the bundle

Auto-generated. Structure:

1. **OKR identity** — id, objective, KR list, owner, dates, final status
2. **Auditor's master question** — quoted verbatim, with pointer-list to where each sub-answer lives
3. **Chain integrity** — pass/fail summary for every phase's `verify-chain` run, with the chain root SHAs
4. **Governance tier story** — tier at start, any escalations / overrides, final tier
5. **Tweedles check** — confirmation that every reviewer DID ≠ author DID across all phases
6. **Goal-drift (Pocket Watch)** — hash of objective at start vs at end, drift percentage
7. **Prompt-pack versions** — every pack cited, with frozen copies in `prompt-packs/`
8. **Index** — table of all files in the bundle with one-line descriptions

#### 11.6.4 Generation pipeline

`OKRService.exportAuditReport(meshPath, okrId)`:

1. **Lock the source state** — record the mesh `HEAD` SHA at export time; bundle's filename includes the short SHA.
2. **Walk `actions[]`** — for each phase, locate the merged artifact + Hatter Tag + audit JSONL + PR snapshot (via `gh pr view`).
3. **Snapshot grounding artifacts** — for each phase, copy the threat model + CALM model **as of that phase's run start** (read from Hatter Tag's `threat_model_ref` SHA pointer).
4. **Snapshot prompt packs** — for each unique pack version cited in any Hatter Tag, copy the frozen pack file.
5. **Run verify-chain** for each phase; capture output.
6. **Compute traceability matrix** — described above.
7. **Render README.md + okr-card.pdf** (markdown → PDF via `puppeteer`).
8. **Compute SHA256 of every file** → `checksums.txt`.
9. **Zip**, write to user-chosen path (default: `~/Downloads/audit-report-<okr-id>-<date>.zip`).

The export is **deterministic** — same OKR + same mesh state produces a byte-identical bundle. This is important for audit comparisons over time ("did the export change since we last reviewed?").

#### 11.6.5 What the export does NOT include

- The actual production code that ships from the merged designs. The bundle stops at the design.md merge — that's the handoff point to the code-repo coding agents (out of scope of this design). The audit report says "here's what was authorized for build"; what was built is verified by the code repo's own audit pipeline.
- Reviewer prose comments (same reason as §11.5 — they're on GitHub's side, not durable in the mesh).
- LLM provider request/response bodies. Token counts + costs only.

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

## 13. Phased implementation plan (with tracking)

**Legend**: `[ ]` planned · `[~]` in progress · `[x]` shipped · `[!]` blocked · `[s]` skipped/superseded.

This section is the live truth-source for "what's done." Update inline as work lands. Last reviewed 2026-05-19.

### Phase A — Foundation (target: 2 weeks)

OKR scaffolding lands. Looking Glass shows OKRs but the buttons don't yet trigger pipelines (those come in B+C). The sample OKR is seeded; learners can read it but not run it through agents yet.

- [ ] **A1.** `okr.yaml` schema + Zod type (`vscode-extension/src/types/okr.ts`) — incl. `intent_cascade`, IntentSpec frontmatter, `governance` overrides block
- [ ] **A2.** `OKRService` (`src/services/OKRService.ts`) — `readAll`, `read`, `create`, `appendAction`, `updateStatus`, `targetCodeReposFor`, `tierFor`
- [ ] **A3.** OKR list view (`src/webview/app/views/okrList.ts`) + tile on portfolio header
- [ ] **A4.** OKR detail view (`src/webview/app/views/okrDetail.ts`) — full mockup per §10.2; buttons render as disabled in Phase A
- [ ] **A5.** `scaffoldImdbLiteOkr()` seeds the Celebs-anchored sample OKR (§8.1) — runs from `scaffoldImdbLitePlatform()` when invoked
- [ ] **A6.** Extend `scaffoldImdbLitePlatform()` to populate `bar.app.yaml.repos[]` with workshop repo names (declared, not connected)
- [ ] **A7.** Hatter Tag schema extension — `intent_thread_uuid` replaces `parent_run_id` (rename in `packages/research-runner/src/runner/hatters-tag-builder.ts`); add `governance_tier`, `author_did`, `reviewer_dids[]`, `prompt_pack_version` fields
- [ ] **A8.** Audit event schema extension — add `phase`, `okr_id`, `intent_thread_uuid` to `packages/research-runner/src/runner/audit-emitter.ts`
- [ ] **A9.** Cleanup: remove "Promote to research-request" from OracularPanel; add stubbed "Create OKR from finding" button (full flow lands in B)
- [ ] **A10.** Cleanup: Active Runs panel groups by OKR id (degrades gracefully for legacy runs without okr_id)
- [ ] **A11.** Workshop curriculum touchpoints doc (`docs/workshop/agentic-sdlc-touchpoints.md`) — which workshop Part produces which mesh artifact

### Phase B — Custom Agents + Skills (target: 3 weeks)

Agent deployment lands. Sample OKR becomes runnable end-to-end on Supervised tier. Restricted-tier gating works (manual escalation; auto-revise loop is Phase C).

- [ ] **B1.** Deploy `.github/agents/*.agent.md` for: `market-research-agent`, `prd-agent`, `architect-reviewer`, `security-reviewer` (design-agent in D)
- [ ] **B2.** Deploy search Skills (PURE data, no LLM): `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search`
- [ ] **B3.** Deploy `dedupe-and-rank` Skill (PURE)
- [ ] **B4.** Deploy knowledge Skills: `knowledge-okr`, `knowledge-mesh-bar`, `knowledge-mesh-platform`, `knowledge-mesh-threats`, `knowledge-mesh-adrs`, `knowledge-research`, `knowledge-prd`, `knowledge-code`
- [ ] **B5.** Deploy context Skills: `context-architecture`, `context-security`, `context-quality` (pure mesh aggregators; agent applies persona)
- [ ] **B6.** Deploy `audit-emit-event` Skill (wraps audit-emitter.ts for agent use)
- [ ] **B7.** Deploy `format-research-issue-update` Skill (PURE markdown formatter)
- [ ] **B8.** `AgentDeploymentService` (`src/services/AgentDeploymentService.ts`) — replaces single-purpose `provisionWorkflow`; deploys agents + skills + retained workflows
- [ ] **B9.** Settings page → "Mesh Provisioning" with three tabs (§10.6); deprecation notices on sunset workflows
- [ ] **B10.** Looking Glass: wire `Start Why` / `Start How` buttons on OKR detail (issue creation with okr_id label/comment); `Start What` lands in C alongside design-bus
- [ ] **B11.** Tier-detection wiring — `OKRService.tierFor()` reads BAR scores, drives button state on OKR detail
- [ ] **B12.** `HatterTagService` (`src/services/HatterTagService.ts`) — parse + verify-chain CLI invocation
- [ ] **B13.** Hatter Tag UI sheet (§10.4(b)) — slides in from OKR detail Action card
- [ ] **B14.** Court Recorder CloudEvents v1.0 emitter (`packages/research-runner/src/runner/court-recorder.ts`)
- [ ] **B15.** Queen's Keyring — short-lived GitHub App installation tokens scoped to OKR + repo set
- [ ] **B16.** Knight's Seal — Ed25519 signing of Hatter Tags (Phase B+ stretch; can slip to C)

### Phase C — Orchestration + bounded recycle (target: 2 weeks)

Bus workflows land. Reviewer recycle loop works on Supervised/Autonomous tiers. Restricted tier still blocks (which is the point).

- [ ] **C1.** `okr-bus.yml` workflow — listens for `okr-anchor` labeled issues; assigns the right agent based on `oraculum-research` / `oraculum-prd` label; updates `okr.yaml.actions[]` on each phase transition
- [ ] **C2.** `reviewer-bus.yml` workflow — fires architect-reviewer + security-reviewer in parallel on PR open; enforces Tweedles (reviewer DID ≠ author DID); writes scores to PR description in parseable format
- [ ] **C3.** `design-bus.yml` workflow — fans out per `target_code_repos[]`; opens issue in each target repo with OKR context inlined
- [ ] **C4.** State machine in `label-on-merge.yml` — `governance-pass` only when both reviewer scores ≥ threshold AND tier allows; `revision-required` applied on Supervised/Autonomous tiers up to MAX_AUTO_ROUNDS
- [ ] **C5.** Round counter + HumanGate transitions wired into `okr-bus.yml`
- [ ] **C6.** HumanGate UI on OKR detail (Approve / Re-run / Reject buttons; dual-signature override modal)
- [ ] **C7.** White Rabbit's Pocket Watch goal-drift gate — workflow step that hashes OKR.objective at phase start vs PR scope at merge; blocks merge on drift > threshold
- [ ] **C8.** Caterpillar's Challenge — semantic-drift comparison hook in `reviewer-bus.yml` (research → PRD → design → code)
- [ ] **C9.** `Start What` button (depends on design-bus.yml; Restricted-tier disabled state per §10.2)

### Phase D — Design agent + per-repo reviser loop (target: 3 weeks)

Design fan-out works end-to-end. Per-repo Hatter Tags chain back to parent OKR via `intent_thread_uuid`.

- [ ] **D1.** `design-agent.agent.md` operating on per-repo issues
- [ ] **D2.** `knowledge-reference-repos` Skill — clones + indexes curated reference repos from mesh `reference-repos/` dir
- [ ] **D3.** Reviser loop wired into per-repo design PR flow (reviewer-bus.yml runs on the code repo as well, not just the mesh)
- [ ] **D4.** Hatter chain ladder visualization on OKR detail — collapsible tree showing parent intent thread → child threads per phase

### Phase E — Audit Report Export + hardening (target: 1 week)

The auditor's master question is answerable in one click.

- [ ] **E1.** `OKRService.exportAuditReport()` — generates the bundle described in §11.6
- [ ] **E2.** `verify-chain` CLI surface in Looking Glass — runs against any phase or full OKR; result chip on Hatter Tag UI
- [ ] **E3.** `traceability.html` interactive matrix renderer (KR → Finding → FR/SR → Design → Code)
- [ ] **E4.** End-to-end smoke test against the IMDB-Lite sample OKR — Autonomous path on Lite, Restricted-blocked path on Celebs (proves both directions work)
- [ ] **E5.** Documentation pack for the team — reading order, audit-report walkthrough, troubleshooting

### Phase tracking checklist for v4 doc itself

- [x] **v4.0** Trigger model rewrite (§3.1, §3.2) — OKR-driven; Promote removed
- [x] **v4.1** Skills inventory grounded in real prompt files (§7.0.5)
- [x] **v4.2** First sample OKR reseats on Celebs (§8.1, §8.2)
- [x] **v4.3** OKR screen mockup + sub-states (§10.2, §10.3)
- [x] **v4.4** Hatter Tag UI surfacing (§10.4)
- [x] **v4.5** Oraculum repositioning (§10.5)
- [x] **v4.6** Settings page → Mesh Provisioning (§10.6)
- [x] **v4.7** Audit Report Export (§11.6)
- [x] **v4.8** Phase tracking inline (this section)
- [x] **v4.9** Deliverables map with status column (§15)

---

## 14. Open questions & risks

### 14.1 GitHub primitives

- **Skill auto-discovery vs explicit invocation**: docs say agents "can also discover and invoke skills automatically." If the LLM forgets to call context Skills, PRDs land ungrounded. Mitigation: the parent agent's system prompt enumerates required Skills with **exact invocation order**.
- **Skill timeout & budget**: not yet known; we model Skills as best-effort with `{ ok: false, reason }` fallback contracts.
- **Cross-repo agent execution**: design-agent must operate IN the code repo. `design-bus.yml` (Phase C) opens the landing issue in each target repo with OKR context inlined; the design-agent then runs in that repo's context. Authentication scope is the per-task `Queen's Keyring` token.
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

Status legend: `[ ]` planned · `[~]` in progress · `[x]` shipped · `[!]` blocked · `[s]` superseded.

| Status | Deliverable | Location | Phase |
|---|---|---|---|
| `[ ]` | `okr.yaml` schema + Zod type (incl. `intent_cascade`, `intent_thread_uuid`, IntentSpec frontmatter, `governance` overrides) | `vscode-extension/src/types/okr.ts` | A |
| `[ ]` | OKRService (`readAll`, `read`, `create`, `appendAction`, `updateStatus`, `targetCodeReposFor`, `tierFor`, `exportAuditReport`) | `vscode-extension/src/services/OKRService.ts` | A → E |
| `[ ]` | `scaffoldImdbLiteOkr` — seeds **Celebs-anchored** sample OKR (§8.1) with pre-filled intent_cascade | `vscode-extension/src/services/MeshService.ts` (extend) | A |
| `[ ]` | OKR list view (table + tier badges + status filter) | `vscode-extension/src/webview/app/views/okrList.ts` | A |
| `[ ]` | OKR detail view — full mockup per §10.2 (header, KRs, BARs, Action cards, footer) | `vscode-extension/src/webview/app/views/okrDetail.ts` | A → C |
| `[ ]` | OKR portfolio tile | `vscode-extension/src/webview/app/portfolio.ts` (extend) | A |
| `[ ]` | `bar.app.yaml.repos[]` seeding with 4 workshop repo names (`imdb-react-frontend`, `imdb-identity`, `movie-api`, `celeb-api`) — declared, not connected | `vscode-extension/src/services/MeshService.ts` (extend `scaffoldImdbLitePlatform`) | A |
| `[~]` | Asymmetric CALM seed: rich `app-imdb-lite.arch.json` (8 nodes, 5 NIST controls, threats) vs sparse `app-imdb-celebs.arch.json` (6 nodes, no controls/threats) | `vscode-extension/src/templates/mesh/calmTemplates.ts` | A (extend imdb-lite with threat-model + controls blocks) |
| `[ ]` | **Connect Repo** button + flow for declared-but-not-connected `repos[]` entries | BAR detail view | A |
| `[ ]` | **Intent Thread UUID** generator + stamping on every Hatter's Tag (rename `parent_run_id` → `intent_thread_uuid`/`parent_intent_thread`) | `packages/research-runner/src/runner/hatters-tag-builder.ts` | A |
| `[ ]` | Hatter's Tag full schema: `intent_thread_uuid`, `author_did`, `author_prompt_pack_version`, `reviewer_dids[]`, `threat_model_ref`, `calm_nodes_referenced[]`, `owasp_categories[]`, `stride_threats[]`, `fitness_results`, `reviewer_scores`, `governance_tier`, `chain_root_hash` | `packages/research-runner/src/runner/hatters-tag-builder.ts` | A → B (signature: B+) |
| `[ ]` | Audit event schema (phase, okr_id, intent_thread_uuid) | `packages/research-runner/src/runner/audit-emitter.ts` | A |
| `[ ]` | **Court Recorder** CloudEvents v1.0 envelope emitter (SIEM-compatible JSONL, hash-chained, append-only) | `packages/research-runner/src/runner/court-recorder.ts` (new) | B |
| `[ ]` | **Tier-detection logic** — `OKRService.tierFor()` reads BAR pillar scores → derive `governance_tier` (Autonomous/Supervised/Restricted) → drive UI gates + Hatter's Tag stamp | `vscode-extension/src/services/OKRService.ts` + BarService | B |
| `[ ]` | **White Rabbit's Pocket Watch** goal-drift gate — hash OKR.objective at phase boundaries; block merge if drift > threshold | mesh template (workflow) + `verify-chain` CLI | C |
| `[ ]` | **Caterpillar's Challenge** — explicit semantic-drift comparison step between phase artifacts | mesh template (reviewer-bus.yml hook) | C |
| `[ ]` | **Knight's Seal** — Ed25519 commit signing with agent DID; verification step in `verify-chain` | `packages/research-runner/src/runner/knights-seal.ts` (new) + GitHub App key mgmt | B+ |
| `[ ]` | **Queen's Keyring** — short-lived per-task GitHub App installation tokens (scope: this OKR + repo set) | AgentDeploymentService + GitHub App config | B |
| `[ ]` | **HatterTagService** — parse, render-for-UI, invoke verify-chain CLI | `vscode-extension/src/services/HatterTagService.ts` | B |
| `[ ]` | **Hatter Tag UI sheet** (full-schema view from Action card `View Tag` button) | `vscode-extension/src/webview/app/views/hatterTagSheet.ts` | B |
| `[ ]` | **Audit Report Export** generator (zip bundle: PDF + traceability HTML + per-phase artifacts + Hatter Tags + JSONL + verify-chain + prompt-pack snapshots + checksums) | `OKRService.exportAuditReport()` | E |
| `[ ]` | **Traceability matrix renderer** (KR → Finding → FR/SR → Design → Code; HTML + CSV) | `vscode-extension/src/webview/app/exports/traceability.ts` | E |
| `[ ]` | Remove "Promote to research-request" from OracularPanel | `vscode-extension/src/webview/OracularPanel.ts` | A |
| `[ ]` | "Create OKR from finding" button + draft modal | OracularPanel | A (stub) → B (full flow) |
| `[ ]` | Active Runs panel grouped by OKR id | `vscode-extension/src/webview/ActiveRunsPanel.ts` | A |
| `[ ]` | **Settings → Mesh Provisioning** with 3 tabs (Workflows / Agents / Skills) + retained "Secrets & Models" tab | `vscode-extension/src/webview/SettingsPanel.ts` (rename / extend) | B |
| `[ ]` | Deprecation removal flow (audit-logged) for `oraculum-research.yml`, `archeologist.yml`, `prd.yml`, `notify-code-repos.yml` | AgentDeploymentService.removeDeprecatedWorkflow | B (after Phase B verified end-to-end) |
| `[ ]` | `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search` Skills (PURE data — no LLM inside) | mesh template | B |
| `[ ]` | `dedupe-and-rank` Skill | mesh template | B |
| `[ ]` | `format-research-issue-update` Skill | mesh template | B |
| `[ ]` | `knowledge-okr`, `knowledge-mesh-*`, `knowledge-research`, `knowledge-prd`, `knowledge-code`, `knowledge-reference-repos` Skills | mesh template | B (reference-repos in D) |
| `[ ]` | `context-architecture`, `context-security`, `context-quality` Skills (pure mesh aggregators — NO LLM inside) | mesh template | B |
| `[ ]` | `audit-emit-event` Skill (wraps Court Recorder for agent use) | mesh template | B |
| `[ ]` | `market-research-agent`, `prd-agent`, `architect-reviewer`, `security-reviewer` `.agent.md` files (with **Tweedles** enforcement) | mesh template | B |
| `[ ]` | `design-agent` `.agent.md` | mesh template | D |
| `[ ]` | AgentDeploymentService — deploys agents + skills + retained workflows | `vscode-extension/src/services/AgentDeploymentService.ts` | B |
| `[ ]` | `reviewer-bus.yml`, `okr-bus.yml`, `design-bus.yml` (incl. Tweedles segregation check + Pocket Watch gate) | mesh template | C |
| `[ ]` | State-machine logic in `label-on-merge.yml` (round counter + tier-aware) | mesh template | C |
| `[ ]` | HumanGate UI (Approve / Re-run / Reject + dual-signature override modal) | OKR detail view | C |
| `[ ]` | `Start Why` button (OKR detail) | OKR detail view | B |
| `[ ]` | `Start How` button | OKR detail view | B |
| `[ ]` | `Start What` button + per-repo fan-out | OKR detail view + design-bus.yml | C |
| `[ ]` | `knowledge-reference-repos` Skill (clones + indexes curated reference repos) | mesh template | D |
| `[ ]` | Per-repo design reviser loop (reviewer-bus.yml runs on code repo PRs) | mesh template | D |
| `[ ]` | Hatter chain ladder tree visualization on OKR detail | OKR detail view | D |
| `[ ]` | `verify-chain` CLI surface in Looking Glass (validates hash chain, signature chain, intent thread continuity, tier compliance) | Looking Glass action + research-runner CLI | E |
| `[ ]` | End-to-end smoke (IMDB Lite OKR — Supervised path on Lite, Restricted-blocked path on Celebs) | docs/test | E |
| `[ ]` | **Workshop curriculum touchpoints** map (which mesh artifact each workshop Part produces) | `docs/workshop/agentic-sdlc-touchpoints.md` (new) | A |
| `[s]` | ~~`oraculum-research.yml` workflow~~ | mesh template | superseded by Phase B agent path |
| `[s]` | ~~`archeologist.yml` workflow~~ | mesh template | superseded by search Skills + `market-research-agent` |
| `[s]` | ~~`prd.yml` workflow~~ | mesh template | superseded by prd-agent + okr-bus.yml |
| `[s]` | ~~`notify-code-repos.yml` workflow~~ | mesh template | superseded by design-bus.yml |

---

## 16. What this is NOT

- **Not a full re-architecture of `research-runner`** — `audit-emitter.ts`, `hatters-tag-builder.ts`, and the search clients stay as the implementation. Skills are the agent-facing interface (PURE wrappers); the runner keeps its legacy CI-only path until Phase B is verified.
- **Not a custom MCP server** — uses built-in Copilot primitives (`.agent.md` + Skills). `redqueen-mcp` keeps its existing editor-side query scope.
- **Not human-out-of-the-loop.** Every phase produces a PR for human merge. Reviewers assist; they don't replace. Even on Autonomous tier, branch protection still requires a human merge action — the automation only enables the merge button.
- **Not vendor-locked.** Anthropic remains the fallback for research-runner LLM calls (synth is done by Copilot Coding Agent regardless). The `.agent.md` files don't specify a provider.
- **Not "every OKR uses every agent."** Smaller scopes can stop at Phase 1 or 2; the schema tolerates partial completion. An OKR that's purely research (Why only) is valid.
- **Not a code-generation pipeline.** The pipeline stops at the merged design.md per target repo. From there, code-coding agents (out of scope) implement against the merged designs in the code repos. The audit report bundle's traceability matrix names the PRs — what was *built* is verified by the code repo's own audit pipeline, not this one.
- **Not a custom-workflow framework.** v4 deprecates custom mesh workflows in favor of `.agent.md` + Skills + bus workflows. The Settings page "Mesh Provisioning" surface is for deploying agents/skills/buses, not authoring new workflows. If you need a one-off workflow, write a regular GitHub Action — don't extend the agent platform.
- **Not a replacement for the 6-phase SDLC.** The agentic pipeline IS the SDLC's Design → Implement boundary; Govern / Verify / Deploy / Evolve continue downstream of the merged designs.

---

*Last updated 2026-05-19 (v4 — OKR-driven trigger model + full UI design + Audit Report Export + phase tracking). This is a design document AND a live tracking surface — §13 and §15 update inline as work lands. Phase A unlocks the foundation; B unlocks the agents; C closes the loop; D adds design fan-out; E ships the audit export.*
