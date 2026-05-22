# Agentic SDLC — Design (v4.2)

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

**v4.2 (this update) — shovel-ready gap closure**:
- **Issue + label vocabulary (§3.4)** — canonical issue body template (HTML-comment frontmatter + human-readable summary), exhaustive label table with owners and forbidden combinations. No more ambiguity about what `okr-anchor` means vs `oraculum-research` vs `design-draft`.
- **Agent runtime contract (§5.5)** — `.agent.md` system-prompt template, scripted Skill invocation order per agent, per-Skill timeout + retry + terminal-failure policy, model-selection rules, completion sequence, agent-session death recovery, Tweedles timing, cost caps. Engineers can write `.agent.md` files tomorrow.
- **Workflow permissions matrix (§9.1)** — every bus workflow's `on:` trigger, permission set, write target, and `concurrency:` group spec. Plus Pocket Watch threshold definition + drift measurement (§9.2) and design-bus partial-failure handling (§9.3).
- **UX state matrix (§10.8)** — every Action card sub-state's visual treatment + click targets; live-event-ticker transport (REST polling tiered by visibility); empty/loading/error states per surface; race-condition policy; `Pause` vs `Cancel` semantics; per-repo design PR tracking strategy.
- **Restricted-tier escalation + Dual-Signature Override (§10.9)** — concrete UX flows for the workshop's centerpiece moment. Click-by-click escalate-BAR flow; modal-based dual-signature override with fingerprint validation, audit YAML, comment-based or paste-based second-signer mechanism.
- **Hatter's Tag canonical location (§11.1.5)** — frontmatter wins over PR-description on conflict; reviewer-bus re-syncs PR-description from frontmatter; cross-repo Tag propagation rules.
- **Audit JSONL write protocol (§11.1.6)** — partitioned per-run, separate workflow-event files, POSIX advisory locking within a file, git-level serialization across runs.
- **`intent_thread_uuid` lifecycle (§4.4)** — generated at OKR creation in Looking Glass, propagated through every issue body, Hatter Tag, and per-repo fan-out. The invariant: every artifact carries it; `verify-chain` enforces.
- **Setup + ops (§18)** — new-mesh bootstrap flow (modal + IMDB-Lite seed option), GitHub App installation flow with Queen's Keyring per-OKR token scoping, secrets categories (GitHub Secrets vs local config), per-OKR + per-org cost caps, failure notification taxonomy (in-app banner / VS Code notification / GitHub issue comment).

**v4 — end-to-end refactor**:
- **OKR is the only trigger surface.** "Promote to research-request" is **removed**. The OKR detail page has `Start Why / Start How / Start What` buttons; each creates the right kind of issue with `okr_id` + objective + KRs + intent_cascade + affected BARs inlined. The agent reads OKR context cold via the `knowledge-okr` Skill — no body-parser fragility.
- **Oraculum narrows to code-repo architecture reviews.** It no longer hosts research issues. Its old "Promote" button becomes **"Create OKR from finding"** — pre-fills an OKR draft from a review's findings, then the user starts the pipeline from the OKR screen.
- **Custom workflow deprecation.** `oraculum-research.yml`, `archeologist.yml`, `prd.yml`, `notify-code-repos.yml` are deprecated and replaced by `.github/agents/*.agent.md` + `.github/skills/<name>/SKILL.md` + bus workflows (`reviewer-bus`, `okr-bus`, `design-bus`). Settings screen evolves to **Mesh Provisioning** with tabs for Workflows / Agents / Skills.
- **First sample OKR seeds on Celebs (Restricted tier)** — workshop's central learning moment. Why runs normally; How fails security review (missing threat model on `APP-IMDB-002`); learner must escalate Celebs governance OR dual-signature override before unlocking What. Demonstrates "governance unlocks autonomy" loop end-to-end.
- **Full OKR screen UI design** (§10.2) with ASCII mockup: header (objective + intent cascade + tier badge) → KR table → Affected BARs (with tier) → Target repos (declared/connected) → three Action cards (Why/How/What) with phase status, scores, Hatter Tag access, recycle counter, gates → action bar (Export Audit Report, Verify Chain).
- **Hatter Tag UI surfacing** (§10.4) — compact badge on each Action card + full-schema sheet on demand + embedded verbatim in audit report.
- **Audit Report Export** (§11.8) — one-click bundle from OKR detail: zip with `okr-card.pdf`, `traceability.html` (KR → Research Finding → FR/SR → Design → Code matrix), per-phase artifacts + Hatter Tags + audit-events JSONL + chain-verification, `chain-ladder.yaml`, `checksums.txt`. This is the single artifact the auditor needs to answer the master question.
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

## Documentation portfolio — where to read what

This document is the **index + cross-cutting design**. The per-agent + future capability deep-dives live in companion docs. Read whichever maps to what you're trying to learn:

| Document | What it covers | When to read |
|---|---|---|
| **`agentic-sdlc.md`** (this doc) | Trigger model · OKR card schema · audit chain · orchestration · threat model · Looking Glass integration · phased plan + deliverables map | The framework as a whole; phase status; cross-agent concerns |
| **[`agentic-sdlc-marketresearcher.md`](agentic-sdlc-marketresearcher.md)** | WHY phase agent — pipeline, skills used, audit gates, run history (PR #103 reference) | Working on the market-research-agent or the WHY phase audit-and-drift workflow |
| **[`agentic-sdlc-prd.md`](agentic-sdlc-prd.md)** | HOW phase agent — pipeline, the B24 self-critique pivot in full, audit gates including Pocket Watch + Caterpillar drift, run history (PR #105 reference) | Working on the prd-agent or the HOW phase audit-and-drift workflow; especially relevant when something says "reviewer" — read this first |
| **[`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md)** | WHAT phase agent — Phase D sub-deliverables D0–D12, code-grounded review packs, the cross-repo hand-off canonical spec | Building Phase D; designing the code-design-agent; specifying the per-repo fan-out and cross-repo Hatter Tag continuation |
| **[`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md)** | Future / out-of-scope — archaeology research mode, Knight's Seal v2 (cosign / sigstore), verify-chain UI, audit report export, chain-ladder viz, origin-story record, Foundry non-goal | Reserved future capabilities (seams designed-for, not built); confirming what is and isn't on the roadmap |

The index keeps the canonical truth on phase status (§13) and deliverables (§15). Child docs deepen specific areas but always link back here for cross-cutting facts.

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
- **Knight's Seal** — per-run ephemeral Ed25519 signature over the chain root + artifact SHA + run identity. **Phase B (B27)** — full spec §11.5. v2 cosign / sigstore for persistent third-party verifiability is in §16 future.
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
│   Refines via:  prd/ask-experts (mesh-anchored clarifying Qs)    │
│   Skill calls:  knowledge-research (read merged Phase 1 doc)     │
│                 knowledge-mesh-* (CALM, threats, ADRs)            │
│                 context-architecture | context-security           │
│                 audit-emit-event                                  │
│   Output: okrs/<id>/how/prd.md + manifest.yaml (target_repos)    │
│   Reviewers:  prd/architecture-review + prd/security-review       │
│               (MESH-GROUNDED gate — scoring against CALM, ADRs,   │
│               threat-model library; this is the intent gate)      │
└─────────────────────────────────────────────────────────────────┘
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3a — WHAT (Looking-Glass side): code-design-agent         │
│  Reads PRD + clones/indexes ALL target_code_repos at once.       │
│   Skill calls: knowledge-prd (read merged Phase 2 doc)           │
│                knowledge-code (one call per target repo)         │
│                knowledge-reference-repos                         │
│                context-architecture | context-security           │
│                audit-emit-event                                  │
│   Output: ONE code-design doc — okrs/<id>/what/code-design.md    │
│           cross-cutting; references each impacted repo by name.  │
│   Reviewers:  design/architecture-review + design/security-review│
│               (CODE-GROUNDED gate — CALM drift analysis, OWASP   │
│               pattern scan against the actual code, threat-model │
│               compliance check; this is the HEAVIEST gate).      │
│   This is the FINAL agent step on the Looking Glass side.        │
└─────────────────────────────────────────────────────────────────┘
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3b — WHAT (Hand-off): per-repo issue fan-out (no LLM)     │
│  design-bus.yml workflow opens one issue per target_code_repos[] │
│  in that repo, carrying OKR context + the relevant slice of the  │
│  merged code-design.md. From here, coding agents in each target  │
│  repo take over — governed by The Red Queen on the code side.    │
│  (Out of scope for THIS design; the Hatter's Tea Party ends      │
│  when the issues are written.)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 Trigger model — OKR-driven (v4)

The OKR detail page is the **only place** a user starts a phase. Three buttons map directly to the pipeline:

| Button | Visible when | Action |
|---|---|---|
| **Start Why** | OKR status = `draft` (or `researching` if re-running) | Creates an `oraculum-research` issue with `okr_id` in the body. Embeds objective, KRs, intent_cascade, affected_bar_ids. Adds `okr-anchor` label. The `okr-bus.yml` workflow picks it up and assigns the market-research-agent. |
| **Start How** | OKR status = `prd-pending` (Why merged) | Creates an `oraculum-prd` issue carrying the same OKR context plus a reference to the merged Phase 1 artifact. `okr-bus.yml` assigns prd-agent. |
| **Start What** | OKR status = `design-pending` (How merged) | Creates ONE `oraculum-design` issue **in the mesh** (cross-cutting), assigns the `code-design-agent`. The agent clones/indexes every `target_code_repos[]` entry and writes a single `code-design.md` grounded on the PRD + that code. Code-grounded reviewers score it (the heavy gate). Once merged, `design-bus.yml` fans out **per-repo** issues automatically (no LLM) — those land in the target code repos and trigger their coding agents. |

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

### 3.3 PRD vs Code Design — two distinct artifacts, two distinct gates

This is the single most important distinction in the pipeline and must not blur. The PRD and the code-design are **different artifacts** with **different agents**, **different grounding**, and **different reviewer gates**. Confusing them is how teams end up reviewing the wrong thing at the wrong time.

| Concern | **PRD (Phase 2 — How)** | **Code Design (Phase 3a — What, Looking-Glass side)** |
|---|---|---|
| Author agent | `prd-agent` | `code-design-agent` |
| Refinement loop | `prd/ask-experts` Skill (clarifying questions back from a mesh-grounded "expert" persona — the mesh IS the expert) | None — the code-design is reviewed, not refined by Q&A |
| What it answers | "Given the intent + research findings + mesh state, **what must the system do** (FRs, NFRs, SRs)?" | "Given the PRD + the actual code in the impacted repos, **how must each repo change** to deliver the PRD?" |
| Grounding inputs | Research doc (Phase 1) + CALM model + threat library + ADRs (mesh artifacts only) | The PRD + **every linked code repo** (cloned + indexed) + reference repos + the mesh artifacts the PRD already cites |
| Reviewer agents | `architect-reviewer` + `security-reviewer` running [`prd/architecture-review`](../prompt-packs/looking-glass/prd/architecture-review.md) + [`prd/security-review`](../prompt-packs/looking-glass/prd/security-review.md) | Same two reviewer agents, but running **NEW** packs: `design/architecture-review` + `design/security-review` (see §7.0.5 deliverable rows) |
| What the gate scores | **Mesh-grounding** — does the PRD cite CALM nodes that exist? are STRIDE threats covered? are ADRs respected? FR↔R↔E traceability complete? | **Code-grounding** — does the proposed design respect CALM flows in the actual code? does it introduce OWASP-pattern violations? does it satisfy the threat model when applied to the real repos? are interface contracts consistent across linked repos? |
| Tier-aware bound applies | Yes, but the gate is lighter — most blocking failures here are "the PRD didn't cite enough" (fixable in a revision round) | Yes, and this is the **heaviest** gate. Restricted-tier BAR + a code-grounded security failure here is the most common reason an OKR stalls until governance is escalated. |
| Output artifact | `okrs/<id>/how/prd.md` (one file) | `okrs/<id>/what/code-design.md` (one cross-cutting file referencing each impacted repo) |
| Final approval is the start of | Code design (Phase 3a) | Per-repo issue fan-out (Phase 3b, no LLM) |

**Why the PRD is NOT the heavyweight gate.** A PRD can be perfectly mesh-grounded and still propose something the actual code can't absorb without breaking. The mesh is a *model* of intent; the code is what runs. The PRD gate verifies intent is coherent. The code-design gate verifies intent is *implementable in this codebase without violating governance*.

**Why the code-design is ONE doc (not per-repo).** Cross-cutting features (like adding the celeb-api endpoint and consuming it in the React frontend) need a single design that reasons about both sides at once — interface contracts, data ownership, error semantics. Splitting it into per-repo designs at the design stage loses that. The **per-repo fan-out happens AFTER the cross-cutting design is approved** — each landing issue carries only the slice relevant to that repo, but the source-of-truth design is whole.

**Why this is the last Looking-Glass agent step.** Once the code-design merges, the per-repo issues are written by `design-bus.yml` (a workflow, not an agent) and from there each target repo's own coding agent picks up the slice. Those agents are governed by The Red Queen on the code side — out of scope for *this* design (which governs intent up to the point intent becomes implementation work).

### 3.4 Issue body templates + label vocabulary (canonical)

Every issue the OKR-driven pipeline writes follows the same body shape: a small **machine-readable frontmatter block** (HTML comments — invisible to humans, deterministic for workflows and agents) followed by a **human-readable inline summary**. Agents never parse the human summary; they read `okr_id` from the comment markers and call `knowledge-okr` for the canonical OKR YAML.

**Canonical body template** (used by `Start Why / How / What`):

```markdown
<!-- agentic-sdlc:v1 -->
<!-- okr_id: OKR-2026Q1-IMDB-001-celeb-api -->
<!-- intent_thread_uuid: 7f3e9c2d-aaaa-bbbb-cccc-dddddddddddd -->
<!-- phase: why | how | what -->
<!-- parent_run_id: <run-id-of-prior-phase-or-null> -->
<!-- governance_tier_at_create: restricted | supervised | autonomous -->
<!-- created_by: looking-glass@<user-handle> -->

# Phase: <Why | How | What — <objective short title>>

**OKR:** [`OKR-2026Q1-IMDB-001-celeb-api`](../okrs/OKR-…/okr.yaml)
**Objective:** Add celebrity profile API to IMDB-Lite — without licensing or identity-disambiguation risk.

**Intent cascade**
- Org: Grow IMDB MAU 15% YoY
- Role: Engineering Lead — p95 < 250ms
- Developer: Add celebrity API; feature flag
- User: Browse celebrity profiles without flicker

**Key Results**
- KR-1: Identity-disambiguation false-merge < 0.5%
- KR-2: Licensing audit 100%
- KR-3: p95 < 200ms

**Affected BARs** — `APP-IMDB-002 (Celebs · Restricted)`, `APP-IMDB-001 (Lite · Supervised)`
**Target code repos** — `<org>/celeb-api`, `<org>/imdb-react-frontend`, `<org>/imdb-identity`

---

@copilot — Please read the canonical OKR via the `knowledge-okr` Skill and the merged prior-phase artifact (if any) via `knowledge-research` / `knowledge-prd`. Do not parse this body for OKR fields; use the Skills.
```

**Why HTML comments and not YAML frontmatter.** GitHub renders YAML frontmatter as visible code blocks at the top of issues, which clutters the human view. HTML comments are invisible. Workflows extract values with a regex (`<!-- okr_id: (.+?) -->`); agents use the `knowledge-okr` Skill instead of parsing.

**Canonical label vocabulary.** Every label is owned by a specific writer; double-writes are forbidden.

| Label | Color | Applied by | Applied when | Removed by |
|---|---|---|---|---|
| `okr-anchor` | indigo | Looking Glass on issue creation | `Start Why/How/What` button | Never (lives with issue) |
| `oraculum-research` | cyan | Looking Glass on issue creation | `Start Why` (alongside `okr-anchor`) | Never |
| `oraculum-prd` | emerald | Looking Glass on issue creation | `Start How` | Never |
| `oraculum-design` | amber | Looking Glass on issue creation | `Start What` (mesh issue) | Never |
| `oraculum-design-landing` | amber-dark | `design-bus.yml` | Per-repo fan-out (after code-design merges) | Never |
| `research-synthesis` | cyan | author agent | When opening Why PR | Never |
| `prd-draft` | emerald | author agent | When opening How PR | Never |
| `design-draft` | amber | author agent | When opening What PR | Never |
| `revision-required` | rose | `label-on-merge.yml` | Reviewer score < threshold AND tier allows auto-revise | Author agent on next push |
| `governance-pass` | green | `label-on-merge.yml` | Both reviewers ≥ threshold AND no `goal-drift-detected` | Never |
| `human-gate` | yellow | `label-on-merge.yml` | Round counter hit MAX_AUTO_ROUNDS for tier | Looking Glass HumanGate UI (Approve / Re-run / Reject) |
| `goal-drift-detected` | red | `reviewer-bus.yml` (Pocket Watch step) | OKR.objective hash drift > threshold | Author agent after re-scoping |
| `tweedles-violation` | red | `reviewer-bus.yml` | reviewer DID = author DID detected | Workflow auto-reassigns to a fresh reviewer session |
| `dual-signature-override` | violet | Looking Glass on override commit | User completes the override modal | Never |
| `restricted-tier` | orange | `okr-bus.yml` | OKR primary BAR is Restricted at run start | Never (informational) |

**Forbidden combinations** (workflow refuses to apply):
- `governance-pass` + `revision-required` (mutually exclusive)
- `human-gate` + `governance-pass` (must clear human-gate first)
- `goal-drift-detected` blocks merge regardless of other labels

This vocabulary is exhaustive. Workflows that need a new label must add it to this table in a design-doc PR first — runtime invention is forbidden.

### 3.5 The hand-off — per-repo fan-out from mesh to code repos (canonical)

When the code-design PR merges in the mesh repo, the Looking Glass-side governance is **done**. The next move is `design-bus.yml` (a workflow, not an agent) opening one landing issue per `target_code_repos[]` entry in each target code repo. From that moment forward, governance shifts to The Red Queen's side (the coding agent in each code repo, governed by `validate_action` MCP gates — out of scope for *this* document). What stays in scope here is exactly how the hand-off is performed so the cross-repo audit chain stays intact.

**Trigger.** `design-bus.yml` fires on `pull_request_target: closed` with `merged == true`, label `design-draft`, and (for tier-gated runs) `governance-pass`. Same-repo PR check (`base.repo.full_name == head.repo.full_name`) — fork PRs skipped.

**What it reads.**
1. The merged `okrs/<id>/what/code-design.md` from main (the base ref after merge).
2. `okrs/<id>/okr.yaml` — to derive `target_code_repos[]` (= `affectedBarIds[].app.yaml.repos[]` union; each entry resolves to a `<owner>/<repo>` slug).
3. The merged code-design PR body — to extract the canonical Hatter Tag (carries `intent_thread_uuid` for this run + `chain_root_hash` for cross-repo audit traversal).
4. The latest action's `runId` from `okr.yaml` matching the merged PR — establishes the `parent_intent_thread` for the landing issues.

**Landing-issue body template (canonical — every fan-out issue MUST match this shape):**

```markdown
<!-- okr_id: OKR-2026Q2-IMDB-001-celeb-api -->
<!-- intent_thread_uuid: 2e28b567-ab8a-4ad0-a29d-632673f412a9 -->
<!-- parent_intent_thread: <code-design-action's intentThreadUuid> -->
<!-- design_pr_url: https://github.com/<mesh-org>/<mesh-repo>/pull/<n> -->
<!-- design_chain_root: 144d97db8daf60b1a669... -->
<!-- repo_scope: celeb-api -->
<!-- phase: implementation -->

## Implementation landing — from OKR-2026Q2-IMDB-001-celeb-api

**You are receiving this issue because the OKR's `target_code_repos[]` includes this repository.** Looking Glass / The Hatter's Tea Party has shipped a code-design that touches this repo. Your job (as a coding agent or human implementer) is to execute the slice relevant to this repo.

### Where to read
- **OKR (full context):** `<mesh-repo>/okrs/OKR-2026Q2-IMDB-001-celeb-api/okr.yaml`
- **PRD (the requirements):** `<mesh-repo>/okrs/OKR-2026Q2-IMDB-001-celeb-api/how/prd.md`
- **Code design (the architectural plan):** `<mesh-repo>/okrs/OKR-2026Q2-IMDB-001-celeb-api/what/code-design.md`
- **Audit chain (provenance):** `<mesh-repo>/okrs/OKR-2026Q2-IMDB-001-celeb-api/audit/events/`

### Your slice — what the code-design says about *this repo*
<!-- design-bus.yml extracts the per-repo section from code-design.md based on
     repo_scope and embeds it here verbatim. Section format: `## Repo: <slug>`
     with `addresses: [FR-X, SR-Y]` frontmatter the code-design-agent wrote. -->

[per-repo extract from code-design.md]

### Cross-repo audit chain — when your PR lands

Open your implementation PR with a Hatter Tag in the description that sets:

```yaml
intent_thread_uuid: 2e28b567-ab8a-4ad0-a29d-632673f412a9   # same as this issue
parent_intent_thread: <code-design-action's intentThreadUuid>   # same as this issue
```

This keeps your code PR linked back to the OKR through the same audit thread the Hatter's Tea Party walked. The mesh-repo `verify-chain` CLI follows these markers across repositories. Governance from this point forward is The Red Queen's domain — see your repo's own pipeline.
```

**Fan-out execution (per target repo).**

1. **Authenticate.** Uses the GitHub App's installation token for the target repo (NOT a long-lived PAT). The App is installed per-org on the mesh + every `target_code_repos[]` entry; if a target repo is missing from the install, the fan-out marks it `unreachable` (see partial-failure below).
2. **Render the landing-issue body** from the template above with all canonical markers populated.
3. **Open the issue** via `gh api repos/{owner}/{repo}/issues -X POST` with labels `oraculum-design-landing` + `okr-anchor`.
4. **Emit a `state_transition` audit event** in the mesh-repo audit log (per landing): `{event_kind: "state_transition", payload: {action: "design-fan-out", target_repo: "<slug>", landing_issue_url: "...", ok: true}}`. Use `audit-emit-event` Skill so the event is hash-chained — gives the cross-repo lineage a tamper-evident record.
5. **Record per-repo result** in `okrs/<id>/what/design-fan-out.yaml` (NEW file, written by the workflow):

```yaml
# Per-repo fan-out result. One entry per target_code_repos[] entry.
# Written by design-bus.yml on code-design PR merge.
fan_out:
  - repo: celeb-api
    landing_issue_url: https://github.com/.../celeb-api/issues/42
    status: opened
    fanned_at: 2026-05-21T14:23:00Z
  - repo: imdb-react-frontend
    landing_issue_url: https://github.com/.../imdb-react-frontend/issues/18
    status: opened
    fanned_at: 2026-05-21T14:23:02Z
  - repo: imdb-identity
    landing_issue_url: null
    status: unreachable
    reason: github-app-not-installed
    fanned_at: 2026-05-21T14:23:04Z
```

6. **Commit `design-fan-out.yaml`** + push back to main (same finalize pattern as the WHY/HOW finalize steps).

**Cross-repo Hatter Tag continuation.**

When the coding agent in the target repo (out of scope here, but governed by Red Queen-side conventions) opens its implementation PR, it MUST write a Hatter Tag in the PR description carrying:
- `intent_thread_uuid` = **same value as the OKR's** (constant across the whole intent thread).
- `parent_intent_thread` = the code-design action's `intentThreadUuid` (= what the landing issue's marker said).
- `chain_root_hash` = the code repo's OWN audit chain root for this PR (NOT the mesh's — each repo has its own audit pipeline).

`verify-chain` walks `parent_intent_thread` links across repos to reconstruct the full thread: OKR root → WHY action → HOW action → WHAT action → per-repo implementation PRs. The §11.8 `chain-ladder.yaml` (written by each phase's finalize) anchors the mesh-side traversal; cross-repo traversal works by GitHub-App-token-reading each linked repo's PR Hatter Tag.

**Partial-failure handling (§9.3 expanded).**

| Outcome | Per-repo status | Parent code-design PR label | Looking Glass UX |
|---|---|---|---|
| All N fan-outs opened | `opened` for all | none | Stage 5 card shows ✓ on every target-repo row |
| Some open, some fail | mix of `opened` / `unreachable` / `forbidden` | `design-fan-out-partial` (color `F59E0B`) | Stage 5 shows ✗ on failed rows + a "Retry fan-out" affordance per failed repo |
| All fail | all `unreachable` / `forbidden` | `design-fan-out-failed` (color `D32F2F`) | Stage 5 blocks the OKR from advancing to `shipped`; user must fix App install or remove `target_code_repos[]` entries |

The fan-out NEVER auto-retries on its own — failures are surfaced for human triage. Re-triggering happens via the Looking Glass "Retry fan-out" button (re-runs the fan-out step but ONLY for entries with non-`opened` status).

**Tier gating on the receiving end.**

If the target repo's primary BAR is Restricted-tier, `design-bus.yml` still opens the landing issue but adds the label `needs-human-review` + posts a comment explaining the tier gate. The coding agent in that repo can ALSO refuse to auto-assign on Restricted (its own validate_action gate); the design-bus side is best-effort attribution, not a replacement for the receiving repo's gate.

**Why this lives in §3.5 (not §9).** §3 is about the trigger model — how phases connect. The hand-off IS a connector: from mesh-side governance (where the audit chain owns the intent thread) to code-side governance (where The Red Queen takes over). §9 covers workflow-level operational concerns (permissions, partial-failure plumbing, concurrency groups). §3.5 is the *contract* both sides honor.

**Out of scope.** Anything that happens *inside* the target repo's coding agent — its `validate_action` decisions, its CALM-flow constraints, its security-critical-path locks. That story lives in The Red Queen's design doc.

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
    5. Generate the What (Phase 3a) via code-design-agent — ONE cross-cutting doc (gated on How merged). Per-repo fan-out (Phase 3b) is automatic on merge.
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

### 4.4 `intent_thread_uuid` — lifecycle

`intent_thread_uuid` is the **cross-repo audit correlation key**. It is what makes the chain ladder coherent across the mesh repo and N code repos. The lifecycle is strict:

| Step | When | Who | Where stamped |
|---|---|---|---|
| **Generate** | OKR card creation (`OKRService.create()`) | Looking Glass | Written to `okr.yaml.meta.intent_thread_uuid` as a v4 UUID. Audit event `okr_created` carries it. |
| **Propagate to phase issue** | `Start Why/How/What` button click | Looking Glass | Included in the issue body's HTML comment marker `<!-- intent_thread_uuid: ... -->` (§3.4) |
| **Stamped on Hatter's Tag** | Agent completion step 2 (writing artifact frontmatter) | Author agent (read from `knowledge-okr` Skill response) | `hatters_tag.intent_thread_uuid` in artifact frontmatter (§11.1) |
| **Propagate to next phase** | `Start How` reads merged Why's Hatter's Tag; `Start What` reads merged How's | Looking Glass | New phase's Hatter's Tag carries the SAME `intent_thread_uuid` AND sets `parent_intent_thread` to the prior run's `run_id` |
| **Propagate to fan-out issues** | `design-bus.yml` per-repo issue creation | Workflow | HTML comment marker in each fan-out issue's body (§3.4) |
| **Propagate into code-repo PRs** | Coding agent (out of scope for this design) opens a PR addressing the fan-out issue | Coding agent | New Hatter's Tag in the code-PR description carries same `intent_thread_uuid`; `parent_intent_thread` = code-design run id |

**Why "thread" not "tree."** Each OKR has exactly one `intent_thread_uuid`. The audit ladder forms a tree of `run_id` → `parent_run_id` linkages WITHIN that single thread. The thread spans repositories; the tree is the run history within it.

**Invariant.** Every artifact written by this pipeline (research-doc.md, prd.md, code-design.md, per-repo design issue body, per-repo code PR's Hatter Tag) MUST carry the OKR's `intent_thread_uuid` somewhere — frontmatter, body marker, or Hatter Tag. `verify-chain` walks all artifacts under `okrs/<id>/` and across linked code repos, asserts the invariant, and fails the audit on any gap.

**Why not the OKR id directly.** The OKR id is human-readable and might collide with names users pick (e.g., `OKR-2026Q1-IMDB-001` is descriptive but not globally unique across orgs). The UUID is collision-free; the OKR id is the human-facing name. Hatter's Tags carry both.

---

## 5. Agents — personas (adapted from NCMS)

Each agent is a `.agent.md` file deployed by `provisionWorkflow` into the mesh's `.github/agents/`. The NCMS prompt content is migrated as the system prompt with placeholders replaced by Skill calls.

### 5.1 Workflow / synthesizer agents

| Agent | Triggered by | Output | Skills it relies on |
|---|---|---|---|
| `market-research-agent` | `oraculum-research` label + `@copilot` mention | PR: `okrs/<id>/why/research-doc.md` | `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search`, `dedupe-and-rank`, `format-research-issue-update`, `knowledge-okr`, `knowledge-mesh-*`, `audit-emit-event` |
| `prd-agent` | `oraculum-prd` label + `@copilot` mention | PR: `okrs/<id>/how/prd.md` + `manifest.yaml` | `knowledge-research`, `knowledge-mesh-*`, `context-architecture`, `context-security`, `context-quality`, `audit-emit-event`. **Refines via `prd/ask-experts` Skill** (mesh-anchored clarifying questions). Does NOT clone code repos — that's the code-design-agent's job. |
| `code-design-agent` | `oraculum-design` label + `@copilot` mention (one assignment, cross-cutting) | PR: `okrs/<id>/what/code-design.md` (ONE doc, cross-cutting) | `knowledge-prd`, `knowledge-code` (called once per target_code_repos[] entry), `knowledge-reference-repos`, `context-architecture`, `context-security`, `audit-emit-event`. **Last Looking-Glass-side agent.** |
| ~~`design-agent` (per-repo)~~ | _superseded by `code-design-agent` (one cross-cutting design) + `design-bus.yml` fan-out_ | — | The per-repo design-agent model in v3 conflated "produce a code-grounded design" with "execute the design in this repo." v4 separates them: code-design-agent produces one doc; coding agents (out of scope) execute per-repo against the merged slice. |

### 5.2 Reviewer agents

| Agent | Triggered by | Output |
|---|---|---|
| `architect-reviewer` | Auto-fires on any artifact PR (Phase 1/2/3a) | PR review with scored certificate: `SCORE / SEVERITY / COVERED / MISSING / CHANGES`. **Runs different prompt packs depending on the artifact** — `prd/architecture-review` (mesh-grounded gate on PRDs), `design/architecture-review` (code-grounded heavyweight gate on code-design docs). |
| `security-reviewer` | Same | Same certificate, STRIDE / OWASP / NIST cross-refs. Same pack-per-artifact split: `prd/security-review` vs `design/security-review`. |

Reviewer agents **do not block merge by themselves** — they post scored review comments and apply labels (`revision-required` / `governance-pass`). The recycle loop (§6) gates merge.

### 5.3 Tweedles — Reviewer MUST NOT equal Author

NIST 800-53 SA-11 and SOC 2 segregation-of-duties require that the reviewer is not the author. Roadmap §4.5 says explicitly: *"agents reliably skew positive when grading their own work."*

In our pipeline:

- **The architect-reviewer and security-reviewer agent sessions are DISTINCT Copilot sessions** with different `.agent.md` system prompts and different agent DIDs.
- **The workflow that fires reviewers checks the PR's author agent DID** before assigning. If the reviewer agent's DID matches the author's, the assignment is rejected.
- **Both DIDs are recorded in the Hatter's Tag**: `author_did` and `reviewer_did[]`. An auditor can verify segregation from the artifact alone.
- **The reviewer's session has no carry-over context** from the authoring session — the only inputs are the PR diff + the artifact + the Skills' pure data outputs.

In practice today this means each agent gets a unique GitHub App installation token per session (Queen's Keyring), and the agent identity is captured in the audit envelope. **Knight's Seal v1 (Phase B / B27)** is the cryptographic upgrade — see §11.5. Phase A enforces identity by GitHub-App-installation-ID-and-system-prompt-SHA; B27 hardens that with the per-run Ed25519 signature.

### 5.4 Why experts are *personas in the agent's prompt*, not separate LLM calls

NCMS's `expert_prompts.py` has the Architect / Security personas as standalone LLM-callable units. On GitHub-hosted Copilot, every Skill invocation is a context window cost for the parent agent — there's no benefit to splitting "think like an architect" into a nested LLM call.

So:
- **The persona text lives inline in the parent agent's `.agent.md` system prompt.** When the agent gets to the architecture section of the PRD, the system prompt has already told it to "adopt the Architect persona; reason about CALM compliance, ADR alignment, fitness-function impact, quality attributes."
- **The grounded context comes from pure-data Skills** (`context-architecture`, `context-security`). These return structured JSON of CALM nodes, ADRs, threats, controls — never an LLM-generated narrative. The agent does the synthesis.
- **Review mode** is a separate `architect-reviewer` agent assignment on the PR. Same persona prompt, but invoked as a new agent session for scoring. Posts a review with the certificate format.

### 5.5 Agent runtime contract

The pipeline depends on agents behaving predictably. This subsection nails down the contracts so every agent (existing or future) can be reasoned about and replaced.

**5.5.1 `.agent.md` system prompt template.** Every agent file follows this structure:

```markdown
---
name: prd-agent
description: Synthesizes a mesh-grounded PRD from research + mesh context.
tools: [knowledge-okr, knowledge-research, knowledge-mesh-bar, knowledge-mesh-platform, knowledge-mesh-threats, knowledge-mesh-adrs, context-architecture, context-security, context-quality, audit-emit-event]
model: claude-sonnet-4-6  # set in Looking Glass Settings → Models; written here at deploy time
max_tokens_per_run: 250000
max_skill_calls_per_run: 40
timeout_seconds: 900
---

# System Prompt

You are <persona>. <One-paragraph role + boundaries>.

## Invocation contract

You will be invoked on a GitHub issue carrying the `<canonical-label>` label.

1. Extract `okr_id` from the issue body's HTML comment marker `<!-- okr_id: ... -->`.
   Do NOT parse human-readable text. If the marker is missing, post a comment
   "could not locate okr_id marker" and stop.
2. Call `knowledge-okr` with the extracted id. This is your canonical input.
3. Call the prerequisite phase-knowledge Skill(s) in this order: <list>.
4. Call context Skills as needed for the persona work: <list>.
5. <Synthesis instructions per persona>.
6. Open a PR with the artifact at `<canonical-path>`. Apply label `<phase-draft>`.
7. Append the Hatter's Tag to the artifact's frontmatter (see §11.1) AND
   to the PR description (see §11.1.5 for canonical-location precedence).
8. Call `audit-emit-event` for every Skill invocation and the final artifact
   write. This is non-optional — the audit chain breaks otherwise.

## Hard rules

- Never invoke a Skill not in the `tools:` list. The deployment workflow
  scans this and refuses to deploy agents that reference undeclared Skills.
- Never include the OKR YAML, PRD text, or research-doc text in the prompt
  body — always read via Skills. This prevents copy-paste drift.
- If any Skill returns `{ ok: false, reason }`, post a PR comment with the
  reason and stop. Do not synthesize on partial data.
- If you would exceed `max_skill_calls_per_run` or `max_tokens_per_run`,
  stop and post a PR comment requesting the user to split scope.
```

**5.5.2 Skill invocation order — scripted, not discretion.** Each agent's `.agent.md` defines a **required order** of Skills. Order is enforced by the agent's instructions plus a regex check on the audit-event sequence — if the order is wrong (verified post-run by `verify-chain`), the run fails the audit even if the artifact looks fine. This makes runs reproducible.

Per-agent required order (Phase B+):

| Agent | Required Skill order |
|---|---|
| `market-research-agent` | `knowledge-okr` → `knowledge-mesh-bar` (each affected BAR) → `knowledge-mesh-threats` → `knowledge-mesh-adrs` → search Skills (parallel: tavily/arxiv/uspto/hackernews) → `dedupe-and-rank` → (gap-loop: re-invoke 1–3 search Skills) → `format-research-issue-update` → `audit-emit-event` (final) |
| `prd-agent` | `knowledge-okr` → `knowledge-research` → `knowledge-mesh-bar`* → `knowledge-mesh-adrs` → `knowledge-mesh-threats` → `context-architecture` → `context-security` → `context-quality` → (mesh-detected-gap: `prd/ask-experts` if `deep` mode) → `audit-emit-event` (final) |
| `code-design-agent` | `knowledge-okr` → `knowledge-prd` → `knowledge-mesh-bar`* → `knowledge-code` (each target repo) → `knowledge-reference-repos` (optional) → `context-architecture` → `context-security` → `audit-emit-event` (final) |
| `architect-reviewer` | `knowledge-okr` → `knowledge-mesh-bar`* → `knowledge-mesh-adrs` → `context-architecture` → emit review → `audit-emit-event` |
| `security-reviewer` | `knowledge-okr` → `knowledge-mesh-threats` → `knowledge-mesh-adrs` → `context-security` → emit review → `audit-emit-event` |

\* repeats per affected BAR.

**5.5.3 Per-Skill timeout + retry policy.**

| Skill type | Default timeout | Retry policy | On terminal failure |
|---|---|---|---|
| Search Skills (tavily/arxiv/uspto/hackernews) | 30s per query | 2 retries on 5xx/timeout with exponential backoff (1s, 4s) | Return `{ ok: false, reason: <provider-error> }`; agent continues with remaining providers' results |
| `knowledge-*` Skills (read mesh) | 5s | 1 retry on filesystem race | `{ ok: false, reason: 'mesh-read-failed' }`; agent stops + posts comment |
| `knowledge-code` (clone + index) | 120s per repo (shallow clone, depth=1, single branch) | 1 retry on auth fail (refresh token via Queen's Keyring) | `{ ok: false, reason: 'repo-unreachable' }`; agent stops if target repo, continues if reference repo |
| `context-*` Skills (pure aggregators) | 5s | 1 retry | `{ ok: false, reason: 'mesh-walk-failed' }`; agent stops |
| `audit-emit-event` | 3s | 3 retries with backoff (file-lock contention) | LOG to stderr; agent continues — audit failure is recovered by `verify-chain` post-hoc |

These bounds are in the agent's `.agent.md` system prompt as constants the agent enforces, AND in the Skill's CLI implementation as hard caps.

**5.5.4 Agent input contract.** The agent never reads the issue body for OKR fields. The flow is strict:

1. Workflow (`okr-bus.yml`) fires on `issues.labeled` with the appropriate label (§3.4).
2. Workflow assigns `@copilot` via a comment containing the `.agent.md` agent name (e.g. `@copilot use agent prd-agent` — exact syntax per GitHub Copilot Coding Agent docs).
3. Copilot starts a session with the agent's `.agent.md` as the system prompt + the issue body as the user message.
4. Agent extracts `okr_id` from the body's HTML comment marker, then calls `knowledge-okr`.
5. All subsequent context is read via Skills — never via re-parsing the body.

**5.5.5 Model selection.** Model is set at agent-deploy time, not run time. `AgentDeploymentService` writes the `model:` field of each `.agent.md` based on the Looking Glass **Settings → Models** tab. Default per agent:

| Agent | Default model | Why |
|---|---|---|
| `market-research-agent` | `claude-sonnet-4-6` | Long-context synthesis of many sources |
| `prd-agent` | `claude-sonnet-4-6` | Structured PRD with strict format adherence |
| `code-design-agent` | `claude-sonnet-4-6` | Largest context window — must hold PRD + multiple repo indices |
| `architect-reviewer` | `claude-haiku-4-5` | Score against narrow grounded inputs — cheaper |
| `security-reviewer` | `claude-haiku-4-5` | Same |

Settings UI exposes a "per-agent override" selector — admins can pin reviewer agents to Sonnet for higher-stakes domains, for example. Changes are deploy-only (require a redeploy click; never live-mutate `.agent.md` on a running session).

**5.5.6 Agent completion sequence.** When an agent successfully produces an artifact, the strict completion order is:

1. Write the artifact file to a branch (single commit).
2. Compute the Hatter's Tag (see §11.1) — embed in artifact frontmatter.
3. Open a PR. Body includes (a) inline summary, (b) the Hatter's Tag YAML in a fenced block, (c) link to `okr_id` + `intent_thread_uuid`.
4. Apply the phase-draft label (`research-synthesis` / `prd-draft` / `design-draft`).
5. Emit final `audit-emit-event` for `artifact_written`.
6. Stop. **Do not** assign reviewers — `reviewer-bus.yml` does that automatically on PR open.

**5.5.7 Agent session death + cleanup.** An agent session can die three ways:

| Death mode | Detection | Recovery |
|---|---|---|
| Hard timeout (`timeout_seconds` exceeded) | GitHub Copilot Coding Agent surfaces this in the issue | Looking Glass marks the action `status: failed_timeout`. User can `Re-run` from OKR detail (creates a new run with same `intent_thread_uuid`). Audit captures the failed run via stamped `agent_session_died` event written by a separate `okr-bus.yml` watchdog (sees PR open + 0 progress + 24h delta). |
| Skill terminal failure (`{ ok: false }` returned and agent followed protocol) | PR comment from agent explaining the reason; PR remains DRAFT | Looking Glass shows `status: failed_skill` on the Action card with the agent's stop reason. User addresses root cause (e.g. add the missing API key) and clicks `Re-run`. |
| Silent failure (no PR opened, no comment) | Watchdog in `okr-bus.yml` polls 30 min after agent assignment; if no PR + no comment, surfaces alert | Looking Glass shows `status: stalled` with "no activity in 30 min — investigate." This is the rarest case; primarily a Copilot platform outage. |

Failed runs do NOT advance the OKR status. The action remains in its current sub-state (`in-progress` → `failed_*`) until the user re-runs or marks the OKR paused.

**5.5.8 Tweedles enforcement timing.** The reviewer-bus checks reviewer DID ≠ author DID **before assigning the reviewer**, not after. Sequence:

1. Author PR opens with the author DID in the PR description's Hatter Tag fenced block (written in agent-completion-step 3 above — so the DID is available before reviewer-bus fires).
2. `reviewer-bus.yml` fires on `pull_request.opened` (label `*-draft`), reads the Hatter Tag fenced block from the PR body, extracts `author_did`.
3. For each reviewer (`architect-reviewer`, `security-reviewer`), the bus reads the next available reviewer DID from the Queen's Keyring pool (a per-OKR token allocation — see §18.3).
4. If `reviewer_did === author_did`, the bus rotates to the next DID (or fails with `tweedles-violation` label if no other available identity).
5. Only then does the bus assign the reviewer via `@copilot use agent architect-reviewer` (or `security-reviewer`).

**5.5.9 Cost cap per agent run.** Each `.agent.md` declares `max_tokens_per_run`. The agent self-enforces (stop + post comment on approach). Looking Glass also surfaces a **per-OKR rollup** of cost (§18.4). If an OKR exceeds the org's configured monthly cap, `okr-bus.yml` refuses to assign new agent runs and surfaces the cap-exceeded state on the OKR detail.

---

## 6. Reviewer recycle loop — bounded state machine

The reviewer state machine applies to **PRD (`prd-draft`) and code-design (`design-draft`)** PRs — artifacts that carry design decisions worth scoring. Research-synthesis (`research-synthesis`) PRs bypass it entirely: they're descriptive (synthesis from sources, not design decisions) and have no reviewer prompt packs. The WHY-phase merge gate is `audit-validate.yml` alone, which applies `research-pass` on clean evidence-honesty runs and `degraded-evidence` when the Hatter Tag's `evidence_mode` contradicts the audit log (§11.1.7).

For PRD + design PRs, each artifact PR fires `architect-reviewer` + `security-reviewer` in parallel. Their scores drive the state machine.

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
| **Code Design — synthesis** (NEW, Phase D) | `prompt-packs/looking-glass/design/synthesis.md` (to author) | `markdown-with-tables` | Reads PRD + indexed target_code_repos. Emits ONE cross-cutting code-design doc with: per-repo change list, interface contracts (OpenAPI/proto/GraphQL diffs), data-ownership decisions, migration plan, rollback plan. Each section carries `addresses: [FR-X, SR-Y]` frontmatter — feeds the traceability matrix. |
| **Code Design — architecture review** (NEW, Phase D, code-grounded) | `prompt-packs/looking-glass/design/architecture-review.md` (to author) | `structured-review` | Adapts NCMS `ARCHITECT_REVIEW` persona to read **the actual code**: CALM drift analysis (does the design's flow match the code's flow?), interface contract diffs (oasdiff / buf / graphql-inspector), module boundary respect. **This is the heavyweight gate.** |
| **Code Design — security review** (NEW, Phase D, code-grounded) | `prompt-packs/looking-glass/design/security-review.md` (to author) | `structured-review` | Adapts the OWASP pattern scan from [`application-security.md`](../prompt-packs/looking-glass/application-security.md) to score the design against the actual code in each impacted repo. Threat-model compliance check applied to code-as-it-will-exist-after-the-design. **Also heavyweight.** |
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
| **19. Click `📦 Export Audit Report`** | Zip downloaded. Contains everything from §11.8 (Audit Report Export). | Audit report bundle generated. |

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

### 9.1 Workflow trigger + permissions matrix

Each bus workflow has an exact `on:` clause and a minimal permission set. The mesh is one GitHub repository; cross-repo work is done via a **single Maintainability AI GitHub App installation** at the org level (see §18.2). The App provides per-OKR scoped tokens via the Queen's Keyring service.

| Workflow | `on:` trigger | Permissions | What it writes |
|---|---|---|---|
| `okr-bus.yml` | `issues: [labeled]` with label-filter `okr-anchor` AND one of `oraculum-research / oraculum-prd / oraculum-design`; also `pull_request: [closed]` with `merged: true` filter for status updates; also `schedule: cron 0 * * * *` for the agent-stall watchdog | `issues: write`, `pull-requests: write`, `contents: write` (to commit `okr.yaml.actions[]` updates) | Comment on the anchor issue assigning the agent; commit to `okrs/<id>/okr.yaml` on every phase transition; emit audit events to `okrs/<id>/audit/events/okr-bus-<event-id>.jsonl` |
| `reviewer-bus.yml` | `pull_request: [opened, synchronize, ready_for_review]` with label-filter on one of `research-synthesis / prd-draft / design-draft` | `pull-requests: write`, `contents: read`, `checks: write` (to fail-on-violation), `issues: write` (to comment on the OKR anchor issue) | PR comments assigning reviewers; review labels; Pocket Watch hash comparison output as a check-run; `tweedles-violation` or `goal-drift-detected` labels on violations |
| `design-bus.yml` | `pull_request: [closed]` with `merged: true` AND label `design-draft` AND no `revision-required` | `pull-requests: read`, `contents: read` (to read the merged code-design.md), uses the GitHub App installation to write to target code repos | One issue per `target_code_repos[]` entry in the target repo (uses the App installation token); commit `design-fan-out.yaml` to `okrs/<id>/what/` recording each fan-out result (success / failure per repo) |
| `label-on-merge.yml` | `pull_request: [closed]` and `pull_request_review: [submitted]` | `pull-requests: write`, `contents: read` | Applies `governance-pass` / `revision-required` / `human-gate` per the state machine; never applies `goal-drift-detected` (that's reviewer-bus) |
| `oraculum-review.yml` (retained, narrowed) | `issues: [labeled]` with label `oraculum-review` | `pull-requests: write`, `issues: write`, `contents: read` | Same as today — code-repo arch review only; does NOT touch OKRs |

**Concurrency.** Each bus workflow uses `concurrency:` to serialize writes per OKR:

```yaml
# okr-bus.yml
concurrency:
  group: okr-bus-${{ github.event.issue.body_okr_id || github.event.pull_request.body_okr_id }}
  cancel-in-progress: false  # let in-flight runs finish; queue subsequent
```

The `okr_id` is parsed by a small inline step that runs first; the `concurrency.group` ensures simultaneous events on the same OKR serialize — eliminating `okr.yaml.actions[]` race conditions. Different OKRs run in parallel as expected.

**`okr.yaml` actions append protocol.** Only `okr-bus.yml` writes to `okr.yaml`. The flow:

1. Read current `okr.yaml`.
2. Compute the new `actions[]` entry (or update an existing entry's status/scores/rounds).
3. Write the file in one commit message: `okr(${okr_id}): ${phase} ${new_status} [round ${rounds}]`.
4. Push. If push fails (someone else just pushed — the bus is the only writer, but `Settings → Mesh Provisioning` redeployment could be concurrent), the workflow retries from step 1.

**GitHub App permissions (Phase B install).** The Maintainability AI GitHub App is installed at the **org** level with:

| Permission | Scope | Why |
|---|---|---|
| Repository: Contents | read+write | Commit `okr.yaml`, design.md, audit JSONL |
| Repository: Issues | read+write | Create + label oraculum-* issues |
| Repository: Pull Requests | read+write | Open PRs, apply labels, post reviews |
| Repository: Checks | read+write | Pocket Watch + Caterpillar's Challenge as required checks |
| Repository: Metadata | read | Workflow basics |
| Organization: Members | read | Resolve user → DID for human merge attribution |
| Account: Models (Copilot) | read | Required to mention `@copilot use agent <name>` |

Installation is **per org, on a selected list of repos**: the mesh repo + every `target_code_repos[]` entry across all OKRs. Looking Glass's `Settings → Mesh Provisioning → GitHub App` tab surfaces the install URL + the list of repos currently in scope.

### 9.2 White Rabbit's Pocket Watch — drift threshold and measurement

- **What's hashed.** The first line of `okr.yaml.objective.description` (canonicalized: lowercase, collapse whitespace, strip punctuation). This is stable enough to detect rewording but tolerant of minor edits.
- **When measured.** At PR-open (`reviewer-bus.yml` step) and again at merge-attempt (`label-on-merge.yml` step). The hash from issue creation is recorded in the Hatter's Tag at run start; comparison happens against that frozen value.
- **Drift threshold (default).** **Semantic similarity ≥ 0.85** (via embedding cosine) AND **edit distance / canonical length ≤ 0.30**. Both must hold to pass. The embedding model is configured in Settings → Models (default: `text-embedding-3-small`). For mesh repos without an embedding model configured, the gate falls back to edit-distance-only (≤ 0.30).
- **Threshold override per OKR.** `okr.yaml.governance.pocket_watch_threshold` overrides the default (rare; audit-logged).
- **Action on drift.** `reviewer-bus.yml` adds the `goal-drift-detected` label, posts a check-run failure with the side-by-side diff (old objective vs current PR-scope description), and writes a Pocket Watch event to the audit JSONL. Merge is blocked until the agent re-scopes OR a human approves the drift via the HumanGate UI.

### 9.3 design-bus partial-failure handling

When `design-bus.yml` fans out to N target repos:

1. For each repo, attempt to open the landing issue using the GitHub App installation token scoped to that repo.
2. Capture the result per repo: `{ repo, status: 'opened' | 'unreachable' | 'auth-failed' | 'permission-denied', issue_url, error }`.
3. Write `okrs/<id>/what/design-fan-out.yaml` recording every result.
4. **Partial-failure rule.** If ANY repo fails, the workflow:
   - Applies `design-fan-out-partial` label to the parent code-design PR
   - Posts a comment listing successful + failed repos
   - Sets a check-run to PENDING (not FAIL — the rest of the fan-out succeeded, but the OKR is incomplete)
   - Surfaces the partial state on the OKR detail screen with a `Retry` button per failed repo
5. **Full-failure rule** (all repos failed). Apply `design-fan-out-failed` label, set check-run to FAIL, surface the cause on the OKR detail with a setup-hint link (likely the App isn't installed on those repos).

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
│ ╭─ What — 3a. Code Design (Looking-Glass) ──────── ☐ Blocked ──────────────╮ │
│ │  Agent:     code-design-agent                                              │ │
│ │  Reviewers: design/architecture-review · design/security-review            │ │
│ │             (CODE-GROUNDED gate — heaviest gate in the pipeline)           │ │
│ │  Inputs:    PRD + cloned/indexed code repos (all targets)                  │ │
│ │  Output:    ONE okrs/<id>/what/code-design.md (cross-cutting)              │ │
│ │  Gated on:  How merged + tier eligibility                                  │ │
│ │                                                                            │ │
│ │  ⚠ Restricted tier — `Start What` disabled until either:                  │ │
│ │     - APP-IMDB-002 score ≥ 50 (Supervised), OR                            │ │
│ │     - Dual-signature override is recorded against this OKR                │ │
│ ╰────────────────────────────────────────────────────────────────────────────╯ │
│                                                                                │
│ ╭─ What — 3b. Per-Repo Fan-Out (hand-off) ──────── ☐ Blocked ──────────────╮ │
│ │  Trigger:   design-bus.yml on code-design.md merge (no LLM — pure workflow)│ │
│ │  Opens 1 issue per target_code_repos[] in that repo:                       │ │
│ │   • <org>/celeb-api               not started                              │ │
│ │   • <org>/imdb-react-frontend     not started                              │ │
│ │  From here: coding agents in each repo take over — governed by The Red    │ │
│ │  Queen on the code side (out of scope for THIS pipeline).                  │ │
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

**(c) In the Audit Report Export** (§11.8) — verbatim YAML, one per phase, in the bundle.

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
  - `exportAuditReport(meshPath, okrId)` → see §11.8
- **`AgentDeploymentService`** in `vscode-extension/src/services/AgentDeploymentService.ts`:
  - `deployAgents(meshPath, extensionPath)` → write `.github/agents/*.agent.md`
  - `deploySkills(meshPath, extensionPath)` → write `.github/skills/<name>/`
  - `removeDeprecatedWorkflow(meshPath, name)` → audit-logged removal
  - Replaces the old `provisionWorkflow` single-purpose method (which only knew about the legacy workflow list).
- **`HatterTagService`** in `vscode-extension/src/services/HatterTagService.ts`:
  - `read(meshPath, runId)` → parse Hatter Tag YAML from artifact frontmatter or PR description
  - `verifyChain(meshPath, runId)` → invoke `verify-chain` CLI, return result for UI rendering

### 10.8 UX state matrix — empty / loading / error / live updates

Every Action card has eight sub-states (§10.3), but each sub-state needs an explicit visual contract. This table is the implementation source-of-truth.

| Sub-state | Visual treatment | What it shows | What's clickable |
|---|---|---|---|
| `not-started` | ☐ gray title, primary `Start <phase>` button if prerequisites met | Phase name only | `Start <phase>` (if enabled) |
| `gated` | ☐ gray title + amber chip "Gated on …" / "Restricted — escalate" | Reason chip, no action | Optional `Why blocked?` info link → tooltip with the gate's check list |
| `in-progress` | ⏳ amber title + live event ticker (last 3 skill calls) + animated dot | Agent name, model, "Running ${last_skill_name}" | `Cancel` button (see Pause/Cancel below); `View Run` (links to issue) |
| `under-review` | ⏳ amber + "Reviewers running…" + parallel pill for each reviewer | Reviewer names + ⏳ status per reviewer | `View PR` opens GitHub |
| `revision-required` | ⚠ orange title + reviewer MISSING list inline + counter `Round 2/2 — auto-revising` | Per-reviewer score + MISSING list + agent status | `View PR`; `Cancel auto-revise` (forces HumanGate immediately) |
| `blocked` | ⛔ red title + reviewer MISSING list + escalation choices | Block reason + two action buttons | `Escalate BAR` (§10.9); `Human Override` (§10.9) |
| `human-gate` | 🛑 red title + three buttons inline | Per-reviewer scores + agent rationale | `Approve & Merge` / `Re-run` / `Reject & Re-scope` |
| `complete` | ✓ green title + Hatter chip + audit-timeline expand | Agent, scores, chain root, artifact link | `View Tag`, `Verify Chain`, `View PR`, `Open Artifact` |
| `failed_timeout` (new) | ⚠ red dashed border + "Run timed out after 15 min" | Last-seen skill, time elapsed | `Re-run` (new run, same intent_thread_uuid); `View Logs` (GitHub Actions URL) |
| `failed_skill` (new) | ⚠ red dashed border + agent's stop reason | Failed Skill name + agent comment | `Re-run`; `View Comment`; `Open Setup` (if the failure is a config issue like missing API key) |
| `stalled` (new) | ⚠ yellow dashed border + "No activity in 30 min" | When-assigned + when-last-seen | `Re-run`; `Cancel`; `Report Issue` (opens a GitHub Discussions thread) |

**Live event ticker transport.** Looking Glass does NOT poll GitHub continuously. Two-tier:

- **Active OKR (visible on screen):** poll GitHub REST API every **15s** for PR + issue state on this OKR's artifacts. Each tick fetches at most 4 endpoints (one per action). Aborts on screen-blur (window not visible).
- **Background sync:** when not on an OKR detail, poll the mesh `okrs/` directory on disk for any changes (file watcher on the audit JSONL files) every **30s**. Files-on-disk change quickly because workflows commit there; this is cheap.
- **Mesh push trigger:** Looking Glass surfaces a "↻ Sync" button on the portfolio header that runs `git fetch && git pull --ff-only` on the mesh repo. Auto-fires on app focus if it's been > 5 min since last sync.
- **No webhooks in the v4 design.** Webhook receivers require a public endpoint Looking Glass doesn't have. Phase F (future) may add a self-hosted relay for sub-second updates; v4 lives within REST polling + filesystem watchers.

**Empty + loading states for the OKR screen itself.**

| Surface | Empty state | Loading state | Error state |
|---|---|---|---|
| OKR list | "No OKRs yet. [Create OKR]." | Skeleton rows with shimmer | "Could not read `okrs/` — is the mesh repo open?" + `Reload` |
| OKR detail header | (always present after create) | Skeleton text | "Could not read `okr.yaml` — file may have been deleted from the mesh" |
| Action cards | All in `not-started` after create | Skeleton card heights per sub-state | "Skill `knowledge-okr` failed: <reason>" — shown inline with `Retry` |
| Hatter Tag sheet | (only opens on `complete` / `failed_*` action) | Spinner + "loading audit JSONL…" | "Tag fetch failed — chain may be broken. [Run verify-chain]" |
| Footer (Export Audit Report) | Disabled until at least one phase has merged | Progress bar with stage description | Modal: "Export failed at stage X — see logs" |

**Race-condition policy.** When the user is mid-action and underlying state shifts:

- **HumanGate decision → upstream merge happens.** User is staring at the How HumanGate UI; meanwhile the Why PR somehow gets re-merged (rare; admin force-merge). Looking Glass debounces user clicks by 500ms and re-fetches state before submitting any HumanGate decision. If state changed, shows a banner "Upstream Why phase was re-merged — refresh to see latest. Your HumanGate choice was NOT submitted."
- **Agent finishes while user views a stale state.** The Action card sub-state recomputes on every 15s poll. Sub-state transitions are surfaced via a brief toast: "Why phase completed — scores Arch 85 · Sec 88. [View]"
- **Mid-action mesh edit.** User edits an unrelated mesh artifact while their OKR is running. No interaction — different files, different writers (agent writes to `okrs/`, user edits elsewhere). The 30s background filesystem watcher catches changes outside the user's edit.
- **BAR score change mid-pipeline.** While the How phase is running, someone adds a threat-model to APP-IMDB-002 (the Restricted BAR). The BAR score recomputes via `BarService`. Looking Glass detects this on the next 15s poll, displays a yellow chip on the OKR header: "Tier may be eligible to upgrade — recheck after current phase completes." The user can NOT change the tier mid-run; the tier was frozen on the Hatter's Tag at run start (tier-creep mitigation §6.2).

**Pause vs Cancel — explicit semantics.**

- **`⏸ Pause OKR`** (footer button): freezes the OKR — disables all `Start <phase>` buttons across the whole OKR. Does NOT touch any running agent (let it finish). The Pause state is stored in `okr.yaml.meta.paused: true` (audit-logged). Re-clicking unpauses. Used when an OKR needs to wait on an external dependency.
- **`Cancel` (per Action card, only visible in `in-progress` / `under-review`):** posts a comment `cancel-run-${run_id}` on the issue (a sentinel comment that the agent's polling loop watches for); also closes the PR if open. Stamps the action `status: cancelled` in `okr.yaml`. Audit captures cancellation as a `state_transition` event. A new run can be started by clicking the phase's `Start` button again.

**PR status visibility — how scores appear on the Action card.**

The PR description carries the Hatter's Tag fenced block (with `reviewer_scores: { architect: ..., security: ... }`). When a reviewer agent posts its structured review, `reviewer-bus.yml` parses the SCORE values from the comment body (regex against the prompt-pack's required format) and **commits the updated Hatter's Tag back to the PR description**. Looking Glass reads scores from the PR description in the 15s poll. This makes scores append-only and audit-visible without re-running anything.

**Per-repo design PR tracking.** For Phase 3b fan-out, Looking Glass uses the GitHub App installation token (read scope) to fetch each `target_code_repos[]` issue + linked PRs. This avoids requiring the user to authenticate to each code repo separately. Failed reads (auth-revoked, repo deleted) display as `unreachable` on the per-repo line in the Action card with a `Re-check access` button.

**Inline PR diff viewing.** Not in v4. `View PR` always navigates to GitHub. Inline diff viewing is a Phase F idea — GitHub provides this well; duplicating it in Looking Glass would be a maintenance burden for a small UX win.

### 10.9 Dual-Signature Override + Restricted-tier escalation — concrete flows

These are the two paths a user takes when a Restricted-tier OKR is blocked. Both must be reliable enough for the workshop's centerpiece moment.

#### 10.9.1 "Escalate BAR" flow (the recommended path)

When the user clicks `Escalate BAR` on a blocked Action card:

1. **Looking Glass navigates** to the BAR detail page (`Platforms / IMDB-Lite / APP-IMDB-002`) inside the same VS Code panel. A persistent breadcrumb chip stays visible: `← Return to OKR-2026Q1-… (How phase blocked)`.
2. The BAR detail page **highlights the missing artifacts** identified by the reviewer's `MISSING` list — e.g., shows a yellow border around the missing `threat-model.yaml` slot, around the empty `controls:` block, around the missing ADRs list.
3. The user adds the artifacts via the existing BAR-editing UI. As each artifact is committed to the mesh, `BarService.scorePillars()` recomputes the BAR score. Tier transitions are logged as audit events.
4. When the BAR's score crosses the Supervised threshold (≥ 50), Looking Glass **fires a tier-upgrade toast** on the breadcrumb chip: "✓ APP-IMDB-002 tier upgraded → Supervised. [Return to OKR]."
5. Clicking `Return to OKR` lands the user back on the OKR detail page. The previously-blocked Action card auto-refreshes; the `Start How` button (or the auto-revise loop, if applicable) re-enables.
6. **Audit.** The tier change is committed to the mesh as a `bar_tier_change` event under `okrs/<id>/audit/events/`. The next Hatter's Tag stamped on this OKR records the new tier and a back-reference to the upgrade event id, so the audit chain captures "this run unblocked because the BAR was escalated at <timestamp>."

This is the path **the workshop teaches** — concrete, audit-logged, no human-override paperwork.

#### 10.9.2 Dual-Signature Override flow (the escape hatch)

For when the team can't (or shouldn't) escalate BAR governance right now but needs to ship — e.g., emergency hotfix, accepted-risk decision, deferred-governance ticket:

1. User clicks `Human Override (dual signature)` on a blocked Action card.
2. **Looking Glass opens a modal:**

   ```
   ┌─ Human Override — OKR-2026Q1-IMDB-001-celeb-api ─────────────────┐
   │ Restricted-tier gate on Phase: How                                 │
   │ Blocking finding: Missing threat-model on APP-IMDB-002             │
   │                                                                    │
   │ Two signatures required.                                           │
   │                                                                    │
   │ Signer 1 (you)                                                     │
   │  GitHub:        @shawnmccarthy                                     │
   │  Reason:        [_______________________________________] (req)    │
   │  Risk accepted: [_______________________________________] (req)    │
   │                                                                    │
   │ Signer 2                                                           │
   │  GitHub:        [@_______________________________________] (req)   │
   │  Mechanism:     ◉ GitHub mention (post sign-here comment)          │
   │                 ○ Pre-shared signed approval YAML (paste below)    │
   │  [paste YAML here ___________________________________]             │
   │                                                                    │
   │  ☐ I confirm both signers have authority per the org's             │
   │    Restricted-tier override policy (link: …)                       │
   │                                                                    │
   │              [Cancel]               [Request Signer 2]             │
   └────────────────────────────────────────────────────────────────────┘
   ```

3. On `Request Signer 2`:
   - Looking Glass writes a **draft** `okrs/<id>/audit/overrides/<timestamp>-override-request.yaml` containing Signer 1's fields. Audit JSONL gets a `state_transition: override_requested` event.
   - Looking Glass opens a comment on the OKR's anchor issue:
     ```
     @signer2 — Dual-signature override requested for Phase How.
     Reason: <reason>
     Risk accepted: <risk-acceptance>
     Reply with `/sign-override <fingerprint>` to confirm.
     Or use the Looking Glass UI's "Sign override" action (see signer-2 docs).
     ```
   - The `<fingerprint>` is a one-time SHA256 of (okr_id || phase || reason || timestamp) — generated by Looking Glass at request time and embedded in the comment AND the draft override yaml.
4. **Signer 2's path:** they either (a) reply with `/sign-override <fingerprint>` on the GitHub issue OR (b) open Looking Glass themselves, navigate to the OKR, and click `Sign override` (the OKR detail surfaces a banner "Override awaiting your signature" for any GitHub user matching `signer2`). Either path:
   - Workflow (`okr-bus.yml`) detects the sign comment OR the LG signature commit.
   - Validates: (i) commenter/committer GitHub handle matches Signer 2; (ii) fingerprint matches the draft; (iii) Signer 2 ≠ Signer 1 (must be different GitHub handle).
   - Promotes the draft override to `okrs/<id>/audit/overrides/<timestamp>-override.yaml`:
     ```yaml
     override_id: <uuid>
     okr_id: OKR-2026Q1-IMDB-001-celeb-api
     phase: how
     blocking_finding: "Missing threat-model on APP-IMDB-002"
     signer_1:
       github: shawnmccarthy
       did: did:gh:user:12345
       reason: "Emergency feature unlock — pre-launch milestone"
       risk_accepted: "Threat model will be added by 2026-06-01 (tracked in OKR-2026Q2-IMDB-005)"
       signed_at: 2026-05-19T15:33:00Z
     signer_2:
       github: alice
       did: did:gh:user:67890
       mechanism: github-mention
       signed_at: 2026-05-19T15:41:00Z
       comment_url: https://github.com/.../issues/52#issuecomment-...
     fingerprint: sha256:f7…3a
     ```
   - Applies the `dual-signature-override` label to the OKR anchor issue + the blocking phase's PR.
   - Adds the override id to the next Hatter's Tag of the unblocked phase.
   - The Action card auto-refreshes; the blocked state lifts; the phase continues (auto-revise becomes available, or the user clicks `Start <phase>` again).
5. **Audit visibility.** The override is included verbatim in the Audit Report Export bundle under `audit/overrides/`. The traceability matrix carries an `OVERRIDE` annotation on any Hatter's Tag stamped after the override took effect.

**Hard rules.**

- An override is **scoped to a single phase** of a single OKR — it does NOT unlock other OKRs on the same BAR, nor does it permanently upgrade the BAR's tier.
- An override **expires when the OKR closes**. Re-running the same phase after expiry requires a new override.
- Signer 2 cannot be Signer 1, cannot be a bot/agent DID (only human GitHub users), and must have org-level permissions documented in the linked Restricted-tier override policy (link visible in the modal).
- Override creation events emit a CloudEvent of type `io.maintainabilityai.audit.override_signed` — SIEM systems can subscribe to it for compliance dashboards.

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

### 11.1.5 Canonical location + precedence rule

The Hatter's Tag is written to **two** places, by different actors, at different times. The rule of precedence is unambiguous so verify-chain has a single source of truth.

| Location | Written by | Written when | Authoritative for |
|---|---|---|---|
| **Artifact frontmatter** (e.g., top of `okrs/<id>/why/research-doc.md` between `---` fences) | The author agent, on artifact write (completion step 2 in §5.5.6) | Once, atomic with the artifact commit | **Canonical** — this is the single source of truth |
| **PR description fenced block** (a ```yaml hatters-tag fenced block in the PR body) | Same author agent, on PR open (completion step 3); UPDATED by `reviewer-bus.yml` after each reviewer posts to inject `reviewer_dids[]` + `reviewer_scores` | Once at open, plus N times as reviewers come in | **Display mirror** of the canonical — for human readability in the GitHub UI |

**Conflict resolution.** If the two diverge (e.g., a human hand-edited the PR description), the **frontmatter wins**. `verify-chain` reads the frontmatter; the PR description is informational. The reviewer-bus workflow re-syncs the PR description from the frontmatter after every update (i.e., reads frontmatter, appends its own reviewer fields, rewrites the PR description's fenced block).

**Why frontmatter is canonical.** The artifact is git-history-immutable — once merged, the commit SHA pins the Hatter's Tag forever. PR descriptions are mutable forever (anyone with write access can edit). The audit chain's integrity needs an immutable anchor; the merged-artifact's frontmatter provides one.

**Cross-repo Hatter's Tag (per-repo design fan-out).** When `design-bus.yml` opens an issue in `<org>/celeb-api`, that issue's body carries an HTML comment `<!-- intent_thread_uuid: 7f3e9c2d-… -->`. When the coding agent in `celeb-api` later opens a code PR addressing the issue, the coding agent (out of scope of this design, but governed by the agent-side conventions) writes a Hatter's Tag in the PR description with `parent_intent_thread: 7f3e9c2d-…`. The chain ladder reconstructs the cross-repo thread by walking `parent_intent_thread` links.

### 11.1.6 Audit JSONL — write protocol + locking

`okrs/<id>/audit/events/<run-id>.jsonl` is **append-only**, hash-chained, and **partitioned per-run** to eliminate contention.

**Partitioning rule.** Every agent run gets its own JSONL file named by `<run-id>.jsonl`. Concurrent runs (different `run-id`) write to different files. This is the primary anti-contention mechanism.

**Within a single file** (same run), the `audit-emit-event` Skill is the **only** writer. It uses POSIX advisory locking (`fcntl.flock` with `LOCK_EX`) on the file handle. Lock is held only during the `read-last-line-for-hash + append-new-line` operation (~5ms). Other Skills wait briefly on the lock.

**Workflow audit events** (events emitted by `okr-bus.yml`, `reviewer-bus.yml`, etc.) write to **separate JSONL files** to avoid contention with agent-driven `audit-emit-event` Skill calls:

```
okrs/<id>/audit/events/
  RES-2026-05-19-abc123.jsonl              # market-research-agent's events
  PRD-2026-05-19-def456.jsonl              # prd-agent's events
  okr-bus-state-transitions.jsonl          # all okr-bus.yml state changes
  reviewer-bus-2026-05-19.jsonl            # one file per day for bus events
  pocket-watch.jsonl                        # all Pocket Watch checks across runs
```

Each file is independently hash-chained. `verify-chain` walks ALL JSONL files under `audit/events/` and validates each chain. Cross-file ordering uses the CloudEvents `time` field — strictly increasing per `intent_thread_uuid`.

**Concurrent commit race (when two runs write JSONL in parallel and both git-add+commit+push to the mesh).** Git itself serializes — the second push fails with `non-fast-forward`. The workflow retries: pull, re-stage, commit, push. The audit events themselves are append-only, so the merge is trivial (concatenation). If the same file is touched on both sides (different runs of the same agent — extremely unlikely given the per-run filename), the bus workflow's `concurrency:` group (§9.1) prevents this by serializing per OKR.

### 11.2 Audit JSONL on-disk format + Court Recorder envelope helper

**Current on-disk format (Phase A/B — what's shipped today).** Per-event records appended to `okrs/<id>/audit/events/<run>.jsonl` use a flat hash-chained JSON schema:

```json
{
  "event_id": 7,
  "ts": "2026-05-19T15:01:00Z",
  "okr_id": "OKR-2026Q1-IMDB-001",
  "run_id": "HOW-2026-05-19-abc123",
  "intent_thread_uuid": "7f3e9c2d-...",
  "phase": "how",
  "event_kind": "skill_call",
  "payload": { "skill": "context-architecture", "ok": true, "duration_ms": 234 },
  "prev_event_hash": "<sha256>",
  "event_hash": "<sha256>"
}
```

The `prev_event_hash` → `event_hash` linkage gives Merkle-style append-only integrity; B25's pre-merge `verify-chain` CI step re-replays the chain independently of the runner.

**Court Recorder envelope helper (future SIEM export).** `packages/research-runner/src/runner/court-recorder.ts` exports `buildCloudEventsEnvelope` + `serializeCloudEventsEnvelope` — pure helpers that wrap the flat event in a [CloudEvents v1.0](https://github.com/cloudevents/spec) envelope (`specversion`, `type: io.maintainabilityai.audit.<event_kind>`, `source`, `subject: okr:.../intent:...`, etc.) for downstream SIEM forwarding (Splunk HEC, Sentinel, Datadog, Microsoft AGT). The helper is **NOT** invoked by the runner today — on-disk format stays flat. The envelope composition lives in [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) as a designed-for, not built capability that ships when a real SIEM-export use case lands.

**Why this split.** The flat format is simpler to verify (the pre-merge `verify-chain` step does a tight SHA-256 replay without parsing envelope fields) and the audit chain's integrity story doesn't depend on the envelope. CloudEvents is an export concern, not a storage concern. When the SIEM-export ships, the wrapper goes on emission OR on a one-shot export pass; either is compatible with the chain.

### 11.3 Chain integrity rules

- **Within a run**: hash-chained JSONL (`audit-emitter.ts` already does this; we reuse it).
- **Across runs**: stitched via `intent_thread_uuid` + the `chain-ladder.yaml`. Inclusion proofs derivable.
- **Tampering surface**: if anyone hand-edits a merged artifact, Hatter `chain_root_hash` no longer matches the JSONL. The `verify-chain` CLI (already exists) flags it.
- **Retention**: ≥ 6 months in the mesh repo. EU AI Act Article 12 deadline 2 Aug 2026.

### 11.4 White Rabbit's Pocket Watch — goal-drift gate

At each phase boundary, a workflow step compares the hash of the OKR `objective` text at issue creation vs the same field at PR merge. Drift = label `goal-drift-detected`, blocks merge, surfaces in Looking Glass with a side-by-side diff. The intent is to catch agents that subtly rephrase scope into something the OKR didn't authorize.

### 11.5 Knight's Seal v1 — Ed25519 ephemeral signing (B27)

The B25 chain-verification step proves the *audit log* is internally consistent (every event's hash equals its recomputation against the canonical serialization). It does NOT prove **who** produced the chain. An insider with mesh write access could in principle drop a self-consistent JSONL into a PR that's otherwise unconnected to a real agent run. Knight's Seal closes that gap by binding the chain to a per-run cryptographic identity.

**Trust property.** When the seal verifies, the reviewer knows: *"This chain root + this artifact's bytes were both produced inside one specific agent session that owned a one-shot signing key. Anyone who later edits the artifact, hand-modifies the JSONL, or substitutes a different agent's audit log will fail the signature check."*

**Key material — ephemeral per run.**
- At agent dispatch (the moment the GitHub App posts the `agent_assignment` body extension to the issue), a fresh Ed25519 keypair is generated **inside the Copilot Coding Agent's sandbox**.
- The PRIVATE key never leaves the agent process. No key store. No rotation policy. No revocation list. The session ends → the private key is gone → no one — including the agent itself — can produce another signature attributable to that run.
- The PUBLIC key is included in the `artifact_written` audit event payload, alongside the signature. Public-key-in-audit is the cosign-era anti-pattern; here it's deliberate — we're not trying to verify against a long-lived third-party trust root yet. We're trying to bind chain + artifact + session identity for the duration of the audit retention window (≥ 6 months per Article 12).
- The keypair is generated using `crypto.generateKeyPair('ed25519', {})` from Node's standard library inside the runner's `audit-emit-event` skill. No new dependencies.

**What's signed — three values concatenated, in canonical order.**
The signing input is the SHA-256 of:

```
"knights-seal:v1\n" + chain_root_hash + "\n" + artifact_sha256 + "\n" + okr_id + "\n" + run_id + "\n" + intent_thread_uuid
```

Each of those values is already in the Hatter Tag. The signature is over their cryptographic hash, so the seal is small (64-byte Ed25519 signature) regardless of how big the artifact gets.

| Field | Source | Why it's in the signing input |
|---|---|---|
| `knights-seal:v1` | constant | Domain separation — keeps this signature space distinct from any future signing use. |
| `chain_root_hash` | last event's `event_hash` in the JSONL | Binds the signature to the entire audit chain (since each event's hash transitively depends on every prior event). |
| `artifact_sha256` | SHA-256 of the merged artifact bytes (`research-doc.md` / `prd.md` / `code-design.md`) | Binds the signature to the specific bytes that landed on main. Tampering with the file post-merge breaks the seal. |
| `okr_id`, `run_id`, `intent_thread_uuid` | Hatter Tag frontmatter | Prevents replay across OKRs / runs / phases — a signature from a different run can't be substituted in. |

**Where it lives in the artifact.** The Hatter Tag YAML gets two new fields:

```yaml
audit:
  chain_root_hash: 144d97db8daf60b1a669...
  seal_v: 1
  seal_pub: ed25519:MCowBQYDK2VwAyEA...     # base64url, ~44 chars
  seal_sig: base64url:8KqLpVc...              # base64url, ~88 chars (64 bytes)
```

These are added by `audit-emit-event` when the agent emits its FINAL event of the run (the `artifact_written` event), at which point the chain root is locked. The `audit-verify-chain` Skill (B25) gets a sibling `audit-verify-seal` Skill that:

1. Reads `seal_pub` + `seal_sig` from the Hatter Tag.
2. Re-derives the signing input by re-reading `chain_root_hash`, `artifact_sha256` (computed from the merged artifact bytes), `okr_id`, `run_id`, `intent_thread_uuid`.
3. Returns `{ok: true}` if `ed25519.verify(seal_pub, signing_input_sha256, seal_sig)`, else `{ok: false, reason}`.

**CI gate — same shape as B25's chain-verify.** Both `prd-agent.yml` and `market-research-agent.yml` get a new step after `Verify audit chain integrity`:

```yaml
- name: Verify Knight's Seal signature
  id: seal
  if: steps.gate.outputs.skip != 'true' && steps.chain.outputs.ok == 'true'
  env:
    ARTIFACT_PATH: ${{ steps.structure.outputs.doc_path }}
    SEAL_PUB: ${{ steps.ctx.outputs.seal_pub }}
    SEAL_SIG: ${{ steps.ctx.outputs.seal_sig }}
    CHAIN_ROOT: ${{ steps.chain.outputs.head }}
    OKR_ID: ${{ steps.ctx.outputs.okr_id }}
    RUN_ID: ${{ steps.ctx.outputs.run_id }}
    INTENT_THREAD: ${{ steps.ctx.outputs.intent_thread_uuid }}
  run: |
    python3 <<'PYEOF'
    # Inline Ed25519 verify using cryptography library.
    # Independent of the runner (defense-in-depth, same pattern as verify-chain).
    # ...
    PYEOF
```

Verdict logic adds a `seal_fail` flag (checked AFTER `chain_fail` but BEFORE evidence-honesty). New `seal-broken` label (color `8E0000` — even darker than `chain-forgery-detected`). The label is the highest-severity of all the audit failure labels because a broken seal is the most expensive failure mode to investigate (chain says intact + structure says intact, but the run identity doesn't match — that's a *substitution attack*, not an honest agent mistake).

**Looking Glass UI — "Phase seal-checked ✓" badge.** §10.4 (Hatter Tag UI surfacing) adds a per-phase-card visual:
- **Green ✓** when the latest run on this phase has a `seal_pub` + `seal_sig` in its Hatter Tag AND the artifact's audit-and-drift verdict is `ok` (which means the CI verified the seal). Displays as `🛡️ Sealed`.
- **Red ✗** when the audit-and-drift workflow applied `seal-broken`. Displays as `⚠ Seal broken — substitution suspected`.
- **Grey ⏳** during the run window when the artifact hasn't been audited yet.
- **Hidden** for legacy / pre-B27 runs (when `seal_v` is absent from the Hatter Tag — graceful degradation).

The badge sits next to the existing chain-root chip + Verify Chain button on each phase card. Clicking it expands into the seal details (public key fingerprint, signing-input components, signed-at timestamp from the `artifact_written` event).

**Why the public key is in the audit log (and why that's fine for v1).**
A purist signing scheme would have the verifier fetch the public key from a long-lived registry. We don't have one — the GitHub App's installation is the closest thing, and even that rotates. v1's design choice: the public key is published in the same audit log that contains the chain it signs. **An attacker who can substitute the entire (audit log + Hatter Tag + artifact) tuple in coordination still wins.** But that's the same threat model the chain-verification step already addresses (it requires the attacker to also produce a self-consistent SHA-256 chain — which is the cosign / Knight's-Seal-v2 work item). For now, the seal raises the bar from *"any insider with write access can fabricate a chain"* (post-B25 baseline) to *"an insider must coordinate the chain + the seal + the artifact bytes + match the published public key against historical references"* — which is the realistic-threat ceiling.

**Future evolution — Knight's Seal v2 (cosign / sigstore).**
- Replace the ephemeral per-run keypair with a **persistent installation-level signing identity** anchored in [cosign](https://docs.sigstore.dev/cosign/overview/) or [sigstore](https://www.sigstore.dev/).
- The signature root of trust moves from "the public key embedded in this audit log" to "the GitHub App's identity in sigstore's transparency log."
- Verifier becomes: anyone with sigstore-tools + the app's identity can verify the artifact + chain + Hatter Tag without trusting the audit log itself.
- Pairs with **signed prompt packs** — both Hatter Tags and `.caterpillar/prompts/` deploy from the same cosign-anchored trust root.
- Lands when there's a real third-party-verifiability requirement (regulatory ask, external audit firm, cross-org artifact consumption). Not in the v1 budget; designed-for-don't-block.

**Sub-deliverables (Phase B / B27).**
- B27a — Runner side: `crypto.generateKeyPair('ed25519')` inside `audit-emit-event` Skill's first call per run; cache keypair in a runner-process singleton keyed by `run_id`; sign + emit on `artifact_written`.
- B27b — Skill: new `audit-verify-seal` Skill (mirrors `audit-verify-chain` shape).
- B27c — CI: new `Verify Knight's Seal signature` step in both agent workflows; new `seal-broken` label; verdict logic; PR-comment row in the audit summary.
- B27d — Hatter Tag: extend `HattersTagInput` Zod schema with `audit.seal_v` / `seal_pub` / `seal_sig` optional fields (v1 doesn't break v0 tags).
- B27e — Looking Glass: per-phase "Phase sealed ✓ / ✗ / ⏳" badge on OKR detail cards; expandable details panel; signature fingerprint render.
- B27f — Tests: 3+ skill tests (happy path, tampered artifact, tampered chain); 1 workflow snapshot test; UI rendering test.
- B27g — Docs: §11.5 (this section) + AEGIS / governance marketing updates → already landed in commit `9b33c9d` previewing the spec.

**Open spec items to resolve during B27 implementation (not blockers):**
- **Replay against pulled artifacts.** If a reviewer pulls the artifact locally and re-saves with different line endings (CRLF on Windows checkout), `artifact_sha256` differs. Decision: canonicalize line endings to LF before SHA-256 — same convention as git's `text=auto` autocrlf normalization on the storage side.
- **Audit Report Export bundle.** The Phase E export includes `seal_pub`, signature, and a CLI snippet so an auditor can re-verify offline. Spec lands with E1.
- **Pre-Knight's-Seal artifacts.** Existing PR #103 + PR #105 don't have seals (they predate B27). `audit-verify-seal` returns `{ok: true, reason: "pre-v1-no-seal"}` for those — does NOT retroactively flag them as broken. The badge shows `—` (n/a) for pre-v1 phase cards.

### 11.6 Court Recorder Auto-Logging (B28)

B25 (chain-verify) catches **forged hashes**. B27 (Knight's Seal) catches **forged signatures**. Neither catches the third failure mode: **missed events** — an agent that called a skill but never invoked `audit-emit-event` for it. Pre-B28, the agent's hard rule "after every Skill call, invoke `audit-emit-event`" was a prompt-level instruction; the LLM could fail to follow it (forgetfully or strategically) and the chain-verify would happily report `ok: true` on a chain that omits the call. B28 closes that gap by moving emission **out of the agent and into the runner**.

**The contract:**

| Audit event kind | Pre-B28 emitter | Post-B28 emitter | Why moved |
|---|---|---|---|
| `skill_call` | Agent calls `audit-emit-event` after each skill | **Runtime** auto-emits inside `runSkill()` | The agent can't skip what the runtime does |
| `artifact_written` | Agent calls `audit-emit-event` after writing prd.md / research-doc.md | **Workflow** detects via `git diff` on PR head | git diff is deterministic; the agent's intent is irrelevant |
| `self_review` | Agent calls `audit-emit-event` per persona per round | Agent writes a structured `### Self-review` block in the PR body; **workflow** parses + emits | Agent owns the *content* (score, severity, COVERED, MISSING); workflow owns the *emission* |
| `state_transition` | Workflow (unchanged) | Workflow (unchanged) | Already deterministic |
| `human_gate` | Workflow (unchanged) | Workflow (unchanged) | Already deterministic |

**Mechanism — session context env vars.** Each workflow exports four env vars at job start: `OKR_ID`, `RUN_ID`, `INTENT_THREAD_UUID`, `PHASE`. These are computed once from the `extract-okr-context` composite action's outputs and stay constant across every `npx @maintainabilityai/research-runner skill-*` call in the job. The runner's `session-context.ts` reads them; `runSkill()` then knows where in the mesh to write the audit event without the agent having to supply that context per-call.

**Mechanism — runSkill() wrapper.** Pseudocode:

```typescript
export async function runSkill(name, input) {
  const handler = SKILLS[name];
  if (!handler) return { ok: false, reason: `unknown-skill: ${name}` };

  const t0 = Date.now();
  const result = await handler(input);
  const duration_ms = Date.now() - t0;

  if (!NO_AUTO_EMIT_SKILLS.has(name)) {
    const ctx = readSessionContext();
    if (ctx) {
      try {
        await handleAuditEmitEvent({
          okrId: ctx.okrId, runId: ctx.runId, phase: ctx.phase,
          intentThreadUuid: ctx.intentThreadUuid,
          eventKind: 'skill_call',
          payload: { skill: name, ok: result.ok, duration_ms, ...(result.ok ? {} : { reason: result.reason }) },
        });
      } catch { /* best-effort; chain-verify catches gaps */ }
    }
  }
  return result;
}
```

`NO_AUTO_EMIT_SKILLS = {audit-emit-event, audit-verify-chain}` — these are the audit-event surface itself; letting them recurse would create either infinite loops (emit-emit-emit) or meaningless chain-pollution (a `skill_call` event recording "the verifier checked the chain").

**Backward compatibility.** If the session context env vars are absent, `readSessionContext()` returns `null` and `runSkill()` skips auto-emission. Legacy chains where the agent calls `audit-emit-event` explicitly keep working unchanged. New runs in B28-enabled workflows get auto-emission for free.

**Threat-model impact:**

| Threat | Pre-B28 state | Post-B28 state |
|---|---|---|
| T9 — agent identity in audit log forged | Closed by B27 Knight's Seal | Strengthened — the only emitter is the runtime, identified by the per-run keypair |
| **T10** — agent skips `audit-emit-event` to hide a failure | OPEN — agent's hard rule was prompt-level only | **CLOSED** — the runtime emits before the result returns; there's nothing to skip |
| **T11** — agent forges `artifact_written` or `self_review` payloads | OPEN — agent's calls were trusted | **CLOSED** — workflow re-derives both from git diff (artifact) + PR body parsing (self_review); agent's claims are irrelevant |

**What the agent still owns after B28:**
- The *decision* to call a skill (intent)
- The *inputs* to the skill (which BAR, which concern, which query)
- The *synthesis* of skill outputs into prose
- The *artifact* (prd.md / research-doc.md content)
- The *self-review content* (score, severity, COVERED, MISSING, CHANGES) — but written as a structured PR-body block, not via audit-emit-event

**What the runtime + workflows own after B28:**
- `skill_call` audit emission (runtime, inside runSkill)
- Event hashing + chain integrity (runtime, unchanged from B25)
- Ed25519 signing + verify (runtime, unchanged from B27)
- `artifact_written` emission (workflow, via git diff)
- `self_review` emission (workflow, via PR body parsing)
- `state_transition` + `human_gate` (workflow, unchanged)

**Sub-deliverables.**
- **B28a** — runtime self-emission (this section, Tier 1) — shipped in research-runner 0.1.27
- **B28b** — agent contract refresh (.agent.md + SKILL.md) — Tier 2
- **B28c** — workflow audit-shift (artifact_written + self_review off agent) — Tier 3
- **B28d** — doc + marketing refresh — Tier 4
- **B28e** — E2E validation guide — Tier 5

### 11.7 What's NOT in the chain

- Reviewer agent prose comments on the PR (those are on GitHub's side; we capture the SCORE in audit but not the comment body).
- LLM model server logs (Anthropic / GH Models). We capture token counts + costs in audit, not the prompts/responses themselves.

### 11.8 Audit Report Export — the single artifact that answers the auditor's question

The `📦 Export Audit Report` button on the OKR detail page produces a **single zip bundle** that an auditor (internal, regulatory, or your own future self at 3 AM during an incident) can open standalone and reconstruct exactly how this OKR went from intent to code.

**Why this matters.** The chain already lives in the mesh repo — Hatter Tags, JSONL, Pocket Watch hashes, signatures. But following it requires git clone, mesh literacy, JSONL tooling, and three browser tabs. An auditor will not do that. The Export bundles every relevant artifact into one zip with an index, normalized paths, and a traceability matrix that walks **KR → Research Finding → PRD FR/SR → Design element → Code PR → Hatter Tag chain root**.

#### 11.7.1 Bundle structure

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

#### 11.7.2 The traceability matrix (`traceability.html` + `traceability.csv`)

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

#### 11.7.3 README.md inside the bundle

Auto-generated. Structure:

1. **OKR identity** — id, objective, KR list, owner, dates, final status
2. **Auditor's master question** — quoted verbatim, with pointer-list to where each sub-answer lives
3. **Chain integrity** — pass/fail summary for every phase's `verify-chain` run, with the chain root SHAs
4. **Governance tier story** — tier at start, any escalations / overrides, final tier
5. **Tweedles check** — confirmation that every reviewer DID ≠ author DID across all phases
6. **Goal-drift (Pocket Watch)** — hash of objective at start vs at end, drift percentage
7. **Prompt-pack versions** — every pack cited, with frozen copies in `prompt-packs/`
8. **Index** — table of all files in the bundle with one-line descriptions

#### 11.7.4 Generation pipeline

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

#### 11.7.5 What the export does NOT include

- The actual production code that ships from the merged designs. The bundle stops at the design.md merge — that's the handoff point to the code-repo coding agents (out of scope of this design). The audit report says "here's what was authorized for build"; what was built is verified by the code repo's own audit pipeline.
- Reviewer prose comments (same reason as §11.6 — they're on GitHub's side, not durable in the mesh).
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

This section is the live truth-source for "what's done." Update inline as work lands. Last reviewed 2026-05-21.

### Where we are right now (snapshot — Phase A + B validated end-to-end 2026-05-22)

**Phase A + B are honestly complete.** Both phases validated end-to-end on the IMDB-Celebs sample OKR with no manual intervention. Every architectural defense fired on real agent runs:

- **Phase A** — **100% shipped**. A12 Connect Repo flow (target-repos UI + per-repo status + persistence). All 12 A-items + 5 beyond-plan extras complete.
- **Phase B** — **validated end-to-end via WHY (PR #116) + HOW (PR #118) on the celeb-api sample.** Both merged cleanly with every audit gate passing:
  - **WHY (PR #116, 2026-05-21)**: 19 audit events. All 4 search providers attempted via runner CLI. Honest `evidence_mode: mixed` + `degraded_reason: "arxiv-rate-limited-429-both-passes, uspto-404-no-matching-patents, hackernews-zero-results-both-passes"` — no fabrication of failed-provider results. 10/10 H2 (B30 JTBD alternation working). Knight's Seal verified independently (`{ok:true, sealed:true, sealVerified:true}`). `research-pass` label applied; merged; chain-ladder WHY entry auto-written; `action.hatterChainRoot: 152d1aca7d36…` auto-populated. Looking Glass WHY card displays 🛡 Sealed badge.
  - **HOW (PR #118, 2026-05-22)**: 13 audit events including 4 B29 self-review provenance skill_calls (architect r1 + r2, security r1 + r2) carrying authoritative `tier: supervised` + `should_proceed: true` — no tier hallucination. 9 mesh-skill calls (knowledge-okr / knowledge-research / knowledge-mesh-bar ×2 / adrs / threats / context-architecture / context-security / context-quality), all via `npx skill-X` (B30 invocation discipline). Structural correctness: 10/10 H2 · 10/10 FR cited · 8/8 SR anchored (B31 + B31.v1.1 + DOC env fix). Pocket Watch 0.7524 ≥ 0.65; Caterpillar's Challenge cross-phase drift 0.8258 ≥ 0.70. Knight's Seal verified (`eventCount:13, sealed:true, sealVerified:true`). `prd-pass` label applied; merged; chain-ladder HOW entry auto-written with `parent_intent_thread` linking to WHY's `intent_thread_uuid` (`7440f381-7e1a-42da-9bdd-4ea3682da02f`); `action.hatterChainRoot: 387494d4f70e…` auto-populated.

**Defenses validated by real agent runs (not just unit tests):**
B5 (context-* runtime) · B25 (chain forgery detection) · B27 (Knight's Seal v1) · B27.v1.2 (chain_root_hash auto-population through extract-okr-context → finalize) · B28 (Court Recorder Auto-Logging — runner auto-emit) · B28a.v1.1 (parallel-emission lock budget) · B28a.v1.2 (TS↔Python canonicalization parity) · B28c (workflow audit-shift for artifact_written) · B29 (self-review attempt provenance skills) · B30 (runner-CLI invocation discipline + JTBD heading alternation) · B31 (FR-citation regex tolerance: `[CRSE]-?\d+`) · B31.v1.1 (unique-id dedup + 12-line window for FR/SR counters) · A12 (Connect Repo) · B9 (Mesh Provisioning subsections) · DRIFT-1 / DRIFT-2 (UI honesty).

**Versions at validation:**
- `@maintainabilityai/research-runner`: 0.1.33
- `chiefarcheologist.maintainabilityai` VSIX: 0.1.84
- Model: `claude-sonnet-4.6` (auto-selected by Copilot session default after we dropped the `model:` override pin)

- **Phase C** — **honestly complete in post-B24 form** (code-verified 2026-05-22). `okr-state-machine.yml` is in `DEPRECATED_MESH_FILES[]` and auto-pruned on next Redeploy ([codeRepoTemplates.ts:522](../src/templates/codeRepoTemplates.ts)). HumanGate UI fully wired (3 message handlers in `LookingGlassPanel.ts:390-392`, 3 private methods, Restricted-tier dual-signature flow with two-distinct-approver validator, renderer in `okrDetail.ts:768` gated on `action.status === 'human_gate' \|\| 'blocked'`) — has not fired in production because persona-switch convergence in author-agent means no auto-revise loop has been exhausted yet. The §14.8 reviewer-dispatch open question is closed-by-substitution: B24's persona-switch replaces separate reviewer agents entirely; `architect-reviewer.yml` + `security-reviewer.yml` are in `DEPRECATED_MESH_FILES[]:533-534` (both pruned on Redeploy). Pocket Watch + Caterpillar drift gates DID fire on PR #118 (Pocket=0.7524, Caterpillar=0.8258). Nothing dormant is also broken.
- **Phase D** — **dispatched 2026-05-22, MVP scoping locked**. Prerequisite **A12.v1.1** landed: 4-state `targetCodeRepoStatus` per repo (`connected` / `not-connected` / `create` / `unreachable`) with `z.preprocess`-based migration from legacy `'declared'`. Drives brownfield-vs-greenfield branching in every Phase D component (synthesis prompt pack, `knowledge-code` Skill 3-mode response, `code-design-agent.yml` dispatch gate, `design-bus.yml` greenfield scaffolding). D-PR1 MVP = D0 + D1 + D4 + D6 + D7 next up. Phase D plan + brownfield/greenfield branching matrix live in [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md).
- **Phase E** — not yet started. Detailed at §11.8 + [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §3-§4 (`verify-chain` CLI surface in Looking Glass, audit-report export).

**Two cosmetic follow-ups (don't block Phase D):**
- **B28c.v1.1** — audit comment "Self-review (B24): skipped" wording fires even when the agent ran self-critique (B29 chain events prove the attempt + the `### Self-review` blocks are in the PR body). Parser is either matching the wrong regex OR not finding the blocks. Verdict still passes (audit gate doesn't fail on missing self-review for Supervised tier). Investigation tracked separately.
- **UI source-cite display** — Looking Glass WHY card renders `S1–S<huge number>` (some max-S regex matches a multi-digit run elsewhere in the doc). Cosmetic; doesn't affect verdict.

**Deferred to future** (no longer Phase A/B gap): B14 CloudEvents v1.0 envelope adoption. Helper stays dormant; on-disk format stays flat. See [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §8.

**Maintainability state (post-B26):**
- 3 router/renderer functions de-complexified (handleMessage 125 → < 5; lookingGlass.ts IIFE 232 → < 5; renderPhaseSignals 97 → < 10).
- Remaining future targets: `fetchPhaseSignal` (72), `renderOrgScanner` (29), `renderRepoPickerModal` (22). Ratchets locked at current ceilings to make any future bump visible.

### Phase A — Foundation (target: 2 weeks) — **shipped**

OKR scaffolding lands. Looking Glass shows OKRs but the buttons don't yet trigger pipelines (those come in B+C). The sample OKR is seeded; learners can read it but not run it through agents yet.

- [x] **A1.** `okr.yaml` schema + Zod type (`vscode-extension/src/types/okr.ts`) — incl. `intent_cascade`, IntentSpec frontmatter, `governance` overrides block — shipped in A-PR1 (6758b67)
- [x] **A2.** `OKRService` (`src/services/OKRService.ts`) — `readAll`, `read`, `create`, `appendAction`, `updateStatus`, `targetCodeReposFor`, `tierFor` — shipped in A-PR1 (6758b67); `exportAuditReport` stubbed for Phase E
- [x] **A3.** OKR list view (`src/webview/app/views/okrList.ts`) + tile on portfolio header (rendered as the `okrs` EA lens) — shipped in A-PR3 (dd7987b)
- [x] **A4.** OKR detail view (`src/webview/app/views/okrDetail.ts`) — full mockup per §10.2; buttons render as disabled in Phase A — shipped in A-PR3 (dd7987b); Phase A polish added inline view/edit/create modes (c836246) + BAR-sourced target-repo picker (19e9911)
- [x] **A5.** `scaffoldImdbLiteOkr()` seeds the Celebs-anchored sample OKR (§8.1) — runs from `scaffoldImdbLitePlatform()` when invoked — shipped in A-PR2 (b029a90); auto-seed wired in A polish (5c64730); URLs now sourced from BAR app.yaml verbatim (3e1e328) with self-healing for stale `<org>` (dfbd003)
- [x] **A6.** Extend `scaffoldImdbLitePlatform()` to populate `bar.app.yaml.repos[]` with workshop repo names (declared, not connected) — shipped in A-PR2 (b029a90); real org auto-detected from mesh git remote (eb39638)
- [x] **A7.** Hatter Tag schema extension — `intent_thread_uuid` replaces `parent_run_id` (rename in `packages/research-runner/src/runner/hatters-tag-builder.ts`); add `governance_tier`, `author_did`, `reviewer_dids[]`, `prompt_pack_version` fields — shipped in A-PR4 (593365b)
- [x] **A8.** Audit event schema extension — add `phase`, `okr_id`, `intent_thread_uuid` to `packages/research-runner/src/runner/audit-emitter.ts` — shipped in A-PR4 (593365b)
- [x] **A9.** Cleanup: remove "Promote to research-request" from OracularPanel; add stubbed "Create OKR from finding" button (full flow lands in B) — shipped in A-PR4 (593365b)
- [x] **A10.** Cleanup: Active Runs panel groups by OKR id (degrades gracefully for legacy runs without okr_id) — shipped in A-PR4 (593365b)
- [x] **A11.** Workshop curriculum touchpoints doc (`docs/workshop/agentic-sdlc-touchpoints.md`) — which workshop Part produces which mesh artifact — shipped in A-PR4 (593365b)
- [x] **A12.** **Connect Repo** button + flow for declared-but-not-connected `repos[]` entries — shipped on the OKR detail page (target-repos section). `ObjectiveAlignmentSchema.targetCodeRepoStatus` (optional `Record<string, 'declared' | 'connected' | 'unreachable'>`) carries per-repo state. Each repo row shows a status badge (✓ Connected / Declared — Not Connected / ⚠ Unreachable), a `Connect Repo ↗` button that opens the repo's GitHub Settings → Actions page via `openUrl`, and a Mark connected / Mark disconnected toggle that posts `toggleOkrRepoConnected` to the panel. `LookingGlassPanel.onToggleOkrRepoConnected` reads the OKR card, merges the new status into `targetCodeRepoStatus`, and persists via `OKRService.update`. Schema migration is non-breaking — the field defaults to `{}` so existing OKRs load unchanged. The Phase D code-design fan-out will gate on `status === 'connected'` to skip still-Declared repos.

**Phase A also delivered (beyond plan):**
- Inline-editable OKR detail page with three modes (view/edit/create) — replaces the original native-dialog Create flow (c836246)
- `OKRService.update(meshPath, okrId, patch)` with allowlisted-fields patch — needed for the inline editor (c836246)
- Target-repo picker sourced from BAR `app.yaml repos[]` with checkbox UI + custom-URL escape hatch (19e9911)
- `detectMeshOwner` in `LookingGlassPanel.onSamplePlatform` so sample BARs get real GitHub URLs from the mesh's git remote, not `<org>` placeholder (eb39638)
- Self-healing of stale `<org>` URLs in the sample OKR when BARs get re-scaffolded with a real org (dfbd003)

### Phase B — Custom Agents + Skills (target: 3 weeks)

Agent deployment lands. Sample OKR becomes runnable end-to-end on Supervised tier. Restricted-tier gating works (manual escalation; auto-revise loop is Phase C).

- [x] **B1.** Deploy `.github/agents/*.agent.md` files — templates shipped in B-PR2; deployed via `AgentDeploymentService.deployAgents`; deployment refuses any agent whose `tools:` references a Skill not in `MESH_SKILLS` (missing-skill guard at deploy time). **MESH_AGENTS** (the deployed catalog) currently lists ONLY `market-research-agent` + `prd-agent` per the B24 self-critique pivot — `architect-reviewer.agent.md` + `security-reviewer.agent.md` exist on disk under `code-templates/agents-v4/` (kept in case Phase D wants code-grounded reviewers per D8 open decision) but are NOT in MESH_AGENTS and NOT deployed to mesh repos. `code-design-agent.agent.md` lands in Phase D.
- [~] **B2.** Deploy search Skills (PURE data, no LLM): `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search` — SKILL.md templates shipped in B-PR1; CLI subcommand backends land in B-PR1a
- [~] **B3.** Deploy `dedupe-and-rank` Skill (PURE) — SKILL.md shipped in B-PR1; backend in B-PR1a
- [x] **B4.** Deploy knowledge Skills: `knowledge-okr`, `knowledge-mesh-bar`, `knowledge-mesh-platform`, `knowledge-mesh-threats`, `knowledge-mesh-adrs`, `knowledge-research`, `knowledge-prd`, `knowledge-code` — SKILL.md templates shipped in B-PR1; CLI backends shipped in B-PR1a for `knowledge-okr` / `knowledge-mesh-bar` / `knowledge-mesh-platform` / `knowledge-mesh-threats` / `knowledge-mesh-adrs` / `knowledge-research` (the WHY-phase set used by `market-research-agent`). `knowledge-prd` + `knowledge-code` CLI backends land with the PRD agent + code-design agent work in Phase B-PR4 / Phase D.
- [x] **B5.** Deploy context Skills: `context-architecture`, `context-security`, `context-quality` (pure mesh aggregators; agent applies persona) — shipped in research-runner 0.1.26. Handlers in `packages/research-runner/src/runner/skills.ts` aggregate per-BAR slices: `context-architecture` returns CALM model + ADRs + fitness functions; `context-security` returns threats + controls; `context-quality` returns quality attributes + fitness functions. All three accept `{platformId, barIds}` and fail fast with `{ok: false, reason: "bar-not-found: <id>"}` if ANY BAR is unresolvable — preserves the prd-agent's "PRDs MUST be grounded" hard rule (line 158). 5 new tests in `skills.test.ts` covering happy paths, bad-input rejection, and unresolvable-BAR fast-fail across all three skills. The agent's audit-honesty gate now counts real mesh-skill calls (`c_arch`, `c_sec`, `c_qual` columns in `prd-agent.yml`).
- [x] **B6.** Deploy `audit-emit-event` Skill (wraps audit-emitter.ts for agent use) — SKILL.md shipped in B-PR1; CLI backend shipped in B-PR1a. Cross-process file-lock with bounded retries; writes to `okrs/<id>/audit/events/<runId>.jsonl`.
- [x] **B7.** Deploy `format-research-issue-update` Skill (PURE markdown formatter) — SKILL.md shipped in B-PR1; CLI backend shipped in B-PR1a. Truncates with footer when over GitHub's ~65k issue-comment byte cap.
- [x] **B8.** `AgentDeploymentService` (`src/services/AgentDeploymentService.ts`) — replaces single-purpose `provisionWorkflow`; deploys agents + skills + retained workflows. `deploySkills` + `listDeployedSkills` shipped in B-PR1; `deployAgents` + `listDeployedAgents` shipped in B-PR2 with deploy-time guard that refuses agents declaring missing Skills.
- [x] **B9.** Settings page → "Mesh Provisioning" with explicit subsections + deprecation notices — landed in extension build 2026-05-21. Mesh Provisioning section now visually separates **Workflows + actions**, **Agents (v4 personas)**, **Skills (PURE-data)**, and a new **Recently deprecated (auto-pruned on next Redeploy)** subsection categorized by retirement reason: B24 reviewer-agent retirement (4 files), B20 Phase-2 sweep (6 bus + state-machine files), B-PR1f label-flow consolidation (1 file), and legacy pre-agentic-SDLC pipeline (5 files). Each subsection has a status row + a content list anchored to the canonical `MESH_WORKFLOWS` / `AGENT_MANIFEST` / `MESH_SKILLS` / `DEPRECATED_MESH_FILES` arrays in `src/templates/codeRepoTemplates.ts`. New CSS rules (`settings-subsection-heading`, `settings-subsection-list`, `settings-subsection-note`) give the subsections clear visual hierarchy. **Deferred to v1.1:** true tab-bar UI (Workflows / Agents / Skills / Secrets & Models) per §10.6 — the visual subsection layout covers the same readability goal without the tab navigation work. The deprecation-notice goal is fully landed; future tabified UI is a UX polish step that doesn't block Phase D.
- [x] **B10.** Looking Glass: wire `Start Why` / `Start How` buttons on OKR detail (issue creation with okr_id label/comment); `Start What` lands in C alongside design-bus — `Start Why` shipped in B-PR3, `Start How` in B-PR4 (shares `onStartOkrPhase` with phase-prerequisite check: How requires merged Why action; refuses duplicate in-flight issues). Both attach the OkrAction with `governanceTier` frozen at run-start per §6.2.
- [x] **B11.** Tier-detection wiring — `OKRService.tierFor()` reads BAR scores, drives button state on OKR detail — tier is frozen on every action's `governanceTier` field at issue-create time; UI surfaces the OKR's current tier in the detail header + uses substate (paused / progress / done / gated-on-prior-phase) to gate the Start button.
- [x] **B12.** `HatterTagService` (`src/services/HatterTagService.ts`) — parse + verify-chain CLI invocation. Phase B-PR4 ships `parseHatterTag` (regex + yaml parse over the `## Hatter's Tag` block; tolerates straight + curly apostrophe heading variants) and `verifyChain` as a stub returning the embedded chain root (real chain replay lives in Phase E E2 `verify-chain` CLI).
- [x] **B13.** Hatter Tag UI sheet (§10.4(b)) — slides in from OKR detail Action card. Phase B-PR4 ships an overlay modal showing the parsed tag JSON when an action's `hatterChainRoot` is set; falls back to a friendly reason when the artifact is missing / unparseable / pre-Phase B.
- [s] **B14.** Court Recorder CloudEvents v1.0 emitter — **deferred to future SIEM-export work.** `packages/research-runner/src/runner/court-recorder.ts` exports `buildCloudEventsEnvelope` + `serializeCloudEventsEnvelope` with passing tests and stays in the repo as a future-use helper. On-disk JSONL stays flat (see §11.2 for the format). The CloudEvents envelope ships when a real SIEM-export use case lands (Splunk HEC, Sentinel, Datadog, Microsoft AGT integration) — until then the helper is dormant. Full forward-looking spec moved to [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §8.
- [ ] **B15.** Queen's Keyring — short-lived GitHub App installation tokens scoped to OKR + repo set — deferred to Phase B+ stretch / Phase C lead-in. Existing GitHub App auth covers Phase B testing.
- [s] **B16.** ~~Knight's Seal — Ed25519 signing of Hatter Tags (Phase B+ stretch; can slip to C)~~ — superseded by **B27** which lands the same capability inside Phase B (no longer a stretch). The v1 ephemeral-keypair design (§11.5) ships alongside B27; the cosign / sigstore persistent-signing evolution is documented as future work in §16.
- [x] **B17.** Evidence-honesty Hatter Tag block (§11.1.7) — new optional `evidence:` block on `HattersTagInput` with `evidence_mode` (`live` / `cached` / `mixed`), `fresh_provider_search_performed`, and `degraded_reason` fields. Agents must declare honestly based on what actually happened (live skill calls vs cached/repo-read fallback). Shipped in B-PR1b alongside `market-research-agent.agent.md` prompt update with the §11.1.7 decision table.
- [x] **B18.** `audit-validate.yml` post-run validator workflow — cross-checks the Hatter Tag's `evidence:` block against the run's audit JSONL; counts successful `skill_call` events per search provider in `okrs/<id>/audit/events/<runId>.jsonl`; applies `degraded-evidence` label when the declaration contradicts the audit (e.g. `evidence_mode: live` but 0 provider skill_calls). `okr-state-machine.yml` refuses to promote `governance-pass` while this label is present. For research-synthesis PRs (which bypass reviewer-bus — research has no reviewer prompt packs), audit-validate also applies the `research-pass` label on clean runs as the WHY-phase merge gate. Shipped in B-PR1c.
- [x] **B22.** Pocket Watch comparison primitive refined for WHY-phase (B-PR1n). The §9.2 design specified "OKR objective vs PR title + body" — empirically that returns cosine ~0.43 because WHY-phase PR descriptions are process metadata ("This PR adds the required market-research synthesis…") not substantive recaps. Threshold ≥ 0.85 was never going to fire on this comparison for any real WHY artifact, regardless of whether the agent stayed on topic.

  **Fix:** WHY-phase Pocket Watch now compares **OKR `objective.description` vs the `## Executive Summary` section of `research-doc.md`** (extracted via awk between the H2 markers, capped at 3 kB). That section IS the agent's substantive synthesis directly addressing the objective — semantically the right primitive. PR title + body remains as fallback for legacy doc shapes / hand-written PRs.

  **Threshold lowered from 0.85 to 0.65** to match the new primitive's semantics. The §9.2 original threshold of 0.85 was calibrated for *same-text-paraphrased* comparisons (OBJECTIVE-vs-OBJECTIVE — catching subtle rewrites). The new primitive (OBJECTIVE vs EXECUTIVE-SUMMARY) is *same-topic-different-framing*: synthesis adds findings, citations, and analysis that naturally dilute cosine even when the agent stayed perfectly on topic. Empirically (PR #87 run 26183287182, OBJECTIVE 188 chars vs Executive Summary 737 chars, both centered on celebrity profile API + licensing + identity disambiguation), cosine landed at **0.6966**. Truly off-topic syntheses score 0.40-0.50, drifted ones around 0.55. 0.65 catches both while admitting on-topic but expanded syntheses. Aligns with §11.4 cross-phase drift threshold (Caterpillar's Challenge variant of the Pocket Watch) (0.70 for cross-phase drift) with a small buffer for natural variance in Executive Summary phrasing.

  Diagnostic improvements: workflow now logs the actual `OBJECTIVE` and `PR_SCOPE` strings (truncated to 300 chars each) in a `::group::` block alongside the cosine result, so a future failed verdict is debuggable from the log alone. Also surfaces which source the scope came from (`research-doc.md#Executive-Summary` vs `pr-title+body (fallback)`).

  Phase 2 of B20 (prd-agent + code-design-agent workflows) will use phase-appropriate scope primitives:
  - HOW: OKR objective vs prd.md's `## Executive Summary` section
  - WHAT: OKR objective vs code-design.md's `## Approach` or equivalent section
  These per-phase primitives land alongside the workflow files in B-PR1l.

- [x] **B24.** Self-critique replaces separate reviewer agents at PRD time (B-PR1o). Architecture pivot surfaced during the first HOW end-to-end test (PR #91):

  **The problem with separate reviewers at PRD.** The Phase 2 design dispatched `architect-reviewer` + `security-reviewer` on `prd-draft`-labeled PRs to score the artifact. In practice, those reviewers read the same `context-architecture` / `context-security` / `knowledge-mesh-adrs` / `knowledge-mesh-threats` mesh state the author already grounded on. There was no independent evidence surface — just a re-grade of the same inputs by a different agent name. The "Tweedles" segregation (author DID ≠ reviewer DID) was theatre: enforcing role separation at the agent-name level didn't catch any failure mode that the structural / drift / coverage checks in `prd-agent.yml`'s audit-and-drift job wasn't already catching.

  In return for that nothing-burger, we paid:
  - **Two extra agent dispatches per HOW run** (3× the MCP failure surface — PR #91 confirmed `github/update_issue` is unreliable in the runtime, so the agent couldn't even apply `prd-draft` to its own PR, blocking the reviewer dispatch chain at step zero).
  - **Two more `pull_request_target` workflows** to maintain, each with its own dispatch + Tweedles + round-counter logic.
  - **The bot-PR approval gate twice** (architect-reviewer + security-reviewer each tripped GitHub's "Require approval for outside collaborators" on bot-attributed PR events, leaving runs stuck as `action_required` — observed on PR #91 runs 26188095968 / 26188095868 / 26188560469 / 26188560472).
  - **A complex okr-state-machine** that had to merge two reviewer pass-labels into a master `governance-pass` before the merge gate flipped.

  **The fix — self-critique inside the author agent.** `prd-agent.agent.md` is rewritten to switch personas after first-pass synthesis: it scores the PRD as the Architect (using the criteria from `.caterpillar/prompts/prd/architecture-review.md`) and the Security reviewer (from `.../prd/security-review.md`), emits a `self_review` audit event per persona per round, and iterates until both personas return `SEVERITY ∈ {PASS, MINOR}` with empty `MISSING`. Rounds are tier-bounded — Autonomous=3, Supervised=2, Restricted=0. If the agent hits MAX without convergence, it emits a `self_review_exhausted` event and ships the PR with a clear "needs human review" signal; the audit-and-drift workflow flips the verdict to `degraded` so branch protection blocks merge.

  **Audit chain enrichment.** One event per persona per round means an Autonomous-tier run that needs all 3 rounds emits 6 `self_review` events plus the existing skill_call + artifact_written events. The full critique trail — what the Architect said in round 1, what changed in round 2, what the Security reviewer surfaced in round 3 — is preserved hash-chained alongside the synthesis evidence. `prd-agent.yml`'s audit-and-drift job parses these events into the upserted PR comment (table rows: "Self-review (B24) | N round(s)", "↳ Architect persona | 0.82 severity=MINOR", "↳ Security persona | 0.79 severity=PASS") and Looking Glass's HOW card renders a `Self-review: Arch X · Sec Y` line populated from the same events.

  **What got deleted.**
  - `code-templates/workflows/architect-reviewer.yml` — workflow file removed
  - `code-templates/workflows/security-reviewer.yml` — same
  - `MESH_AGENTS` no longer lists `architect-reviewer` / `security-reviewer` (the `.agent.md` files stay on disk under `code-templates/agents-v4/` in case Phase 3's WHAT phase wants code-grounded reviewers, but they're not deployed to mesh repos)
  - Generators `generateArchitectReviewerWorkflow` / `generateSecurityReviewerWorkflow` removed from `codeRepoTemplates.ts`
  - `DEPRECATED_MESH_FILES` extended with the two workflow paths + the two `.agent.md` paths so `pruneDeprecatedWorkflows` sweeps them from any mesh repo on next Redeploy
  - `meshLabels.ts` flags `governance-pass-architecture`, `governance-pass-security`, and the `round-N` family as DEPRECATED — kept in the catalog so older PRs aren't broken, but no workflow writes to them anymore

  **What stayed.** The structural correctness + Pocket Watch + Caterpillar drift gates in `prd-agent.yml`'s audit-and-drift job — those check structural properties the author can't trivially self-grade (10 H2 sections present, every FR cites R-N/E-N, cosine similarity to OKR objective + prior phase). The `prd-pass` label remains the canonical merge gate, set when audit-and-drift's verdict is `ok` AND `self_review_exhausted` is absent.

  **Implications for WHAT phase (deferred to Phase 3).** Where reviewers ground against actual code (read repos, run pattern scans, check ADR alignment against committed implementations), the independent-evidence axis IS real — the author hasn't read the code, the reviewer has. Phase 3 may bring back separate `architect-reviewer` + `security-reviewer` agents for `design-draft` PRs. The two `.agent.md` files were kept to make that revival cheap.

- [x] **B23.** Phase 2 of B20 — `prd-agent.yml` shipped (B-PR1l). Note: the original B-PR1l plan also shipped `architect-reviewer.yml` + `security-reviewer.yml`, but both were superseded by B24's persona-switch self-critique pivot. They live on disk under `code-templates/agents-v4/` (kept for Phase D's open D8 decision) and in `DEPRECATED_MESH_FILES` so any stale copy gets swept from mesh repos on next Redeploy.

  Phase 2 of B20 ships HOW-phase + reviewer dispatch on the per-agent workflow pattern proven by `market-research-agent.yml` in Phase 1. Three new workflow files, applying every lesson from Phase 1:

  **prd-agent.yml** — full HOW lifecycle (dispatch + audit-and-drift + finalize) mirroring market-research-agent.yml. Audit checks:
  - Evidence honesty: mesh-skill_call counts (knowledge-okr / knowledge-research / knowledge-mesh-bar / knowledge-mesh-adrs / knowledge-mesh-threats / context-architecture / context-security / context-quality). Distinct from WHY's external-provider count because prd-agent grounds on mesh artifacts, not search providers.
  - Structural correctness: 10 H2 sections + FR-NN/SR-NN citation coverage (every FR cites R-N/E-N; every SR cites STRIDE THR-NNN or OWASP A0X).
  - **Pocket Watch** (objective drift): OKR objective vs `prd.md ## Problem Statement` (cosine ≥ 0.65, same threshold as Phase 1 by the same calibration logic — see B22).
  - **Caterpillar's Challenge** (cross-phase drift, FIRST phase to use it): `prd.md ## Problem Statement` vs `research-doc.md ## Executive Summary` from the BASE ref. Cosine ≥ 0.70 — tighter than Pocket Watch because cross-phase should preserve more of the upstream framing, not just hit the same topic. Reads the prior phase from the merged base branch (cloned into `/tmp/base`), NOT the PR head — the canonical upstream is what's already on main.
  - Trigger model: `pull_request_target: labeled` only (same gate-bypass as Phase 1).
  - Dispatch precondition: refuses to mention `@copilot use agent prd-agent` until `okrs/<id>/why/research-doc.md` exists on main. Surfaces a clear "WHY phase not merged yet" message in the issue thread instead of letting the agent fail noisily inside its own run.

  ~~**architect-reviewer.yml + security-reviewer.yml** — per-reviewer dispatch on `prd-draft` / `design-draft` labels.~~ **Superseded by B24** below. The B-PR1l plan briefly shipped these as per-reviewer workflows; B24 collapsed PRD-time review into the prd-agent's own persona-switch self-critique because the reviewers were reading the same mesh state the author already grounded on (no independent evidence surface). The workflows are now in `DEPRECATED_MESH_FILES` and the .agent.md files live on disk for the Phase D D8 open decision on whether code-grounded reviewers come back for the WHAT phase.

  Transitional workflows fully removed in this commit (decided not to carry six dormant files for the WHAT-phase window). Per-agent workflows own WHY + HOW end-to-end; WAT phase doesn't run anywhere until code-design-agent.yml ships in Phase 3. All six files moved to `DEPRECATED_MESH_FILES` so `pruneDeprecatedWorkflows` sweeps any stale copy from the mesh on the next Redeploy:
  - `okr-bus.yml` (label routing — superseded by per-agent if-clauses on the labeled event)
  - `reviewer-bus.yml` (reviewer dispatch — owned by architect/security-reviewer per-agent workflows)
  - `okr-state-machine.yml` (governance-pass merge gate — folds into per-agent audit jobs in Phase 3)
  - `design-bus.yml` (per-repo fanout — owned by code-design-agent.yml in Phase 3)
  - `drift-gate.yml` (Pocket Watch + Caterpillar — already inline in per-agent audit jobs)
  - `audit-validate.yml` (evidence honesty + structural — already inline in per-agent audit jobs)

  Two related findings the user surfaced during the first HOW dispatch:

  **Double-fire on issue-with-label-on-create.** Looking Glass calls `createIssueRaw(..., labels)` in a single API call. GitHub fires both `issues.opened` (labels populated) AND `issues.labeled` for the label add. The prior dispatch-job if-clause `contains(github.event.issue.labels.*.name, 'oraculum-research')` matched BOTH events → two `@copilot use agent ...` comments on the same issue. Fixed: gate on `github.event.action == 'labeled' && github.event.label.name == '<phase-label>'` so exactly one event matches (the `opened` event is skipped because action is not `labeled`; the `labeled` event for `okr-anchor` is skipped because the label name doesn't match). Reviewer workflows already de-dup via their round-counter logic — no fix needed there.

  **The `@copilot use agent ...` issue comment is a no-op.** Confirmed empirically: posting that text as an issue comment does NOT activate the Copilot Coding Agent. Looking Glass's existing `assignCustomCopilotAgent` body-extension call IS the actual dispatch mechanism. The workflow's comment-post step was pure noise — leaving an instruction in the issue thread the human couldn't act on. Removed from market-research-agent.yml + prd-agent.yml.

  **PR-comment `@copilot` (without `use agent <name>`) on a custom-agent-authored PR CONTINUES the same agent.** Per GitHub's Copilot Coding Agent docs: "If the pull request was created by a custom agent, mentioning @copilot continues using that same agent." Same context, same tools, same persona — faster and more reliable than starting a new session. This is the canonical revision path for an artifact PR that needs to address audit findings: Looking Glass's "🤖 Revise with agent" button posts a `@copilot` PR comment (plain — no `use agent`) with the structured failure reasons, and Copilot routes it to the same agent that authored the PR. The earlier `@copilot use agent <reviewer>` pattern (which started a NEW session) is what put the reviewer in sub-agent mode; plain `@copilot` continuation does not.

  Settings UI consolidated: replaced separate "Deploy Workflows" + "Deploy Agents + Skills" buttons with a single "Deploy All (workflows + actions + agents + skills)" button. The two underlying handlers stay distinct (separate git commits, separate idempotent paths); the UI just calls both sequentially via a new `provisionAll` message. The two-button layout had been confusing — clicking the wrong one redeployed only half the surface.

  OKR detail page enriched: push/pull banner reused from the portfolio (same `renderGitSyncBanner` from `barDetail.ts`), and per-phase signal cards refactored to the §10.2 mockup layout — sources/providers/refine/findings/coverage for WHY, FR/SR coverage + reviewer scores for HOW. Data is fetched LIVE from GitHub via a new `getRepoFileText` method on `GitHubService` + a `loadOkrPhaseSignals` panel handler that reads the audit JSONL + artifact markdown directly (no local mesh dependency — per user preference, "always live from GitHub API"). Loading placeholders show until response arrives.

- [x] **B21.** GitHub API access via out-of-the-box `github/*` MCP tools (B-PR1m). Pivots agents from `gh` CLI shell-out to the Copilot Coding Agent's built-in GitHub MCP server. Two coupled benefits:

  **(a) Firewall path.** MCP routes through `api.githubcopilot.com` (always allow-listed by Copilot) instead of direct `api.github.com` calls (blocked by default). PR #80's run got all the way to `format-research-issue-update`-rendered markdown and then couldn't POST it because `gh issue comment` shells out via `api.github.com/repos/.../issues/<n>/comments` which isn't in the default allow-list. With MCP, no firewall changes required on the mesh repo.

  **(b) Token scope + audit attribution.** MCP scopes the token to the source repo + capability automatically. No shared `gh` CLI auth, no broad `api.github.com` allow-list rule, cleaner Copilot-session-attributed audit trail.

  Tool surface added per agent (slash namespacing per the [Copilot Coding Agent MCP docs](https://docs.github.com/en/copilot/customizing-copilot/customizing-the-development-environment-for-copilot-coding-agent#tool-names-for-out-of-the-box-mcp-servers)):
  - `github/*` — all read-only tools (`list_issues`, `get_issue`, `search_issues`, `get_pull_request`, etc.) FREE by default.
  - `github/add_issue_comment` — author agents post research / PRD / design updates to the OKR anchor issue.
  - `github/add_pull_request_review_comment` — reviewer agents post structured SCORE/COVERED/MISSING/CHANGES reviews on artifact PRs.
  - `github/update_issue` — label changes (`governance-pass-architecture`, `revision-required`, `research-pass`, etc.) — the issues API handles PR labels too.

  Tweedles preserved: reviewer agents declare `github/add_pull_request_review_comment` but NOT `github/add_issue_comment` so they can review without spamming the OKR anchor issue. `edit` still omitted on reviewers per the artifact-immutability boundary.

  `CODING_AGENT_HOSTS` lost the `api.github.com/repos/` and `api.github.com/graphql` entries that were briefly added in B-PR1f forensics — the MCP route makes them unnecessary. Search-provider hosts (Tavily / arXiv / USPTO / HN) still required.

  See agentic-sdlc.md §11.x ("GitHub API access pattern") for the canonical reference and per-agent permission rationale.

- [x] **B20.** Per-agent workflow consolidation + user-triggered label flow (B-PR1k). Pivots the agentic-SDLC workflow architecture from concern-keyed (`pr-auto-label.yml`, `audit-validate.yml`, `drift-gate.yml`, `reviewer-bus.yml`, `okr-state-machine.yml`, `design-bus.yml`, `okr-bus.yml`) to **agent-keyed** — one workflow file per `.github/agents/<name>.agent.md` declaration, with multi-trigger jobs covering the agent's complete lifecycle. Two coupled changes:

  **(a) Workflow consolidation: 13 files → 3 active per-agent workflows + 1 unchanged BAR-page workflow.** (Original B-PR1k plan named 6 per-agent workflows including `architect-reviewer.yml` + `security-reviewer.yml`; those were superseded by B24's persona-switch self-critique. `code-design-agent.yml` lands in Phase D.)

  | New | Replaces | Lifecycle handled | Status |
  |---|---|---|---|
  | `market-research-agent.yml` | okr-bus (WHY) + audit-validate (WHY) + drift-gate (WHY) | issue dispatch on `oraculum-research` + audit-and-drift on `research-synthesis` label + finalize on merge | ✅ shipped (B23) |
  | `prd-agent.yml` | okr-bus (HOW) + audit-validate (HOW) + drift-gate (HOW) + okr-state-machine (HOW) | dispatch + audit-and-drift (incl. persona-switch self-critique parsing per B24) + finalize | ✅ shipped (B23) |
  | `code-design-agent.yml` | okr-bus (WHAT) + audit-validate (WHAT) + drift-gate (WHAT) + okr-state-machine (WHAT) + design-bus | dispatch + audit + finalize + per-repo fan-out | ⏳ Phase D — see [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) D7 |
  | ~~`architect-reviewer.yml`~~ | reviewer-bus (architect branch) | superseded by B24 — persona-switch self-critique INSIDE `prd-agent` | retired |
  | ~~`security-reviewer.yml`~~ | reviewer-bus (security branch) | superseded by B24 | retired |
  | `oraculum-review.yml` | UNCHANGED — BAR-page architecture review (separate domain) | — | ✅ unchanged |

  Three composite actions under `.github/actions/` for shared helpers: `extract-okr-context` (parse okr_id/run_id/phase from PR body), `count-skill-calls` (per-provider audit counts), `check-tier-bound` (tier → MAX_AUTO_ROUNDS).

  **(b) User-triggered label flow.** Bot-opened PRs no longer auto-label; Looking Glass becomes the trigger. User clicks "Run audit" in the OKR detail Action card → extension applies `research-synthesis` / `prd-draft` / `design-draft` label via user PAT → `pull_request_target: labeled` event fires with the USER as triggering_actor (NOT the Copilot bot) → workflow runs without the "Require approval for outside collaborators" gate that previously blocked bot-attributed runs as `action_required`. Pure GitHub trigger semantics, no settings change required.

  Audit workflows narrowed to `pull_request_target: types: [labeled, unlabeled]` only — bot's `opened`/`synchronize` events no longer fire the workflows, so the bot-approval gate is structurally bypassed.

  `pruneDeprecatedWorkflows(meshPath)` added to `AgentDeploymentService` — on next "Redeploy Workflows" click, deletes the 7 superseded files from the mesh repo and commits with a deprecation-log message.

  Settings UI explainer rewritten: 6 workflow entries (down from 13), each labeled by the agent that owns it.

- [x] **B19c.** Bot-PR approval bypass + tightened payload schema (B-PR1g). Closes two gaps surfaced by PR #75:
  - **`pr-auto-label.yml` + `audit-validate.yml` switched from `pull_request` to `pull_request_target`** — bypasses GitHub's "Require approval for first-time contributors" Actions policy that treats `copilot-swe-agent[bot]` as an outside collaborator. Previously workflows fired with `conclusion: action_required` and ran for 0s. SAFETY: pull_request_target runs the workflow definition from the BASE branch (PRs can't modify workflow logic) + we never execute scripts FROM the PR (only read fixed paths). audit-validate's checkout now explicitly refs `pull_request.head.sha` with `persist-credentials: false` so the audit JSONL on the PR branch is visible without leaking the git token. Both workflows gate on same-repo PRs only via the `base.repo.full_name == head.repo.full_name` if-clause (fork PRs are skipped — out of scope for our copilot/... branches).
  - **Agent prompt: literal payload field names + Copilot tool-output workaround**. PR #75's audit JSONL showed `payload.results: 64` instead of `payload.result_count: 64`, and the per-provider `skill_call` events omitted `payload.queries` entirely (only the gap-loop marker had it). Tightened the prompt with a field-by-field schema table (skill / ok / result_count / queries — exact names) and an example. Also added a "Handling Copilot's Output too large guardrail" note explaining how to parse `/tmp/copilot-tool-output-*.txt` files (`head -n 1` instead of bare jq) since Copilot appends non-JSON metadata that breaks midway-through parse.

- [x] **B19b.** Live-evidence forensics + bulletproof labeling + queries-in-audit (B-PR1f). Combines five coupled fixes surfaced by the first live-evidence run on `OKR-2026Q2-IMDB-001-celeb-api`:
  - **arxiv-client uses HTTPS**: previously `http://export.arxiv.org/api/query`, which the Coding Agent firewall (allow-listing `https://export.arxiv.org/`) silently rejected as `http block`. Switched to `https://`; existing tests updated.
  - **Honest `ok` semantic on search skills**: `tavily-search` / `arxiv-search` / `uspto-search` / `hackernews-search` now return `ok: false, reason: "all-queries-failed: <skill> — <first-error>"` when every envelope errored, instead of `ok: true, result_count: 0` which conflated "API reached, no matches" with "firewall blocked every call." Makes the audit-validate evidence-honesty gate counts genuinely meaningful. Helper: `detectAllQueriesFailed` in skills.ts.
  - **`data.uspto.gov` added to `CODING_AGENT_HOSTS`**: USPTO's two-stage fetch returns patent IDs from `api.uspto.gov` (allow-listed) but the abstract XML lives at `data.uspto.gov` (was not allow-listed). Result: 16 patent hits but empty abstracts. Settings UI surfaces it; new tests verify presence.
  - **`pr-auto-label.yml` workflow**: server-side label application by file path (`okrs/<id>/why/research-doc.md` → `research-synthesis`, etc.) — fires on `pull_request: opened/synchronize/reopened`, cannot be skipped by the agent. Closes the loop where the agent opened PR #73 without labels and `audit-validate.yml` never fired.
  - **Queries-in-audit-payload**: agent prompt now requires `payload.queries: [...]` on every search-skill `skill_call` event. `audit-validate.yml` surfaces a "Distinct queries searched" column in its correctness summary comment so reviewers see the query plan inline. The audit JSONL becomes self-contained for `verify-chain` (Phase E) — no need to consult the transient runner log.

- [x] **B19a.** Looking Glass Settings → Coding Agent Environment section (B-PR1e). Surfaces the two prerequisites for the Copilot Coding Agent to actually call search providers — both of which are easy to miss because they live in different GitHub admin pages than the Actions secrets the legacy CI pipeline uses:
  - **`copilot` environment secrets** (API-managed). New `GitHubService.{listEnvironmentSecretNames, setEnvironmentSecret, environmentExists}` methods; `gh secret set --env copilot` handles libsodium encryption (same pattern as the existing `setRepoSecret`, no new deps). `AgentDeploymentService.getCopilotEnvStatus()` returns per-secret presence; Settings UI shows ✓/✗ badges + Add/Update buttons that prompt via `vscode.window.showInputBox` with password masking. Required: `TAVILY_API_KEY`, `USPTO_API_KEY`. Optional: `ANTHROPIC_API_KEY`.
  - **Coding Agent firewall allow-list** (manual — no public REST API as of 2026-05). Settings UI lists the four hosts each search skill needs (`api.tavily.com`, `api.uspto.gov`, `export.arxiv.org`, `hn.algolia.com`), provides a "Copy hosts" button, and deep-links to the Coding Agent settings page so the user pastes them into the firewall UI.
  - Single source of truth: `src/templates/codingAgentRequirements.ts` (`CODING_AGENT_SECRETS`, `CODING_AGENT_HOSTS`, `COPILOT_ENVIRONMENT_NAME`).
- [x] **B19.** Research-doc structural correctness + gap-loop verifiability (B-PR1d). Three coupled pieces:
  - `market-research-agent.agent.md` step 8 tightened from ambiguous "Maximum 3 gap-loop iterations" to **one bounded second pass with ≤3 follow-up queries TOTAL**. Synthesis pack narrative is now the single source of truth on the bound; agent prompt no longer permits iterative gap-loops that blow the cost cap.
  - Agent now emits a `skill_call` audit event with `payload: { skill: "gap-loop", queries: [...], reason: ..., providers: [...] }` BEFORE running the second-pass search Skills. Makes the refinement audit-verifiable instead of trust-only.
  - `audit-validate.yml` extended with structural correctness checks on `okrs/<id>/why/research-doc.md` — counts the 10 required H2 sections, 4 required H3 sub-sections under Cross-Source Analysis, and Formal Conclusions citation density (each C[N] must reference ≥1 S[N]). Combined with the evidence-honesty check, this produces a single upserted "Research correctness summary" PR comment (marked with `<!-- audit-validate -->` so every push edits the same comment instead of spamming). Refinement-pass presence is surfaced informationally; structural failures (missing sections / uncited conclusions / missing doc) flip the verdict to `degraded` and block `research-pass`.

- [x] **B25.** `A.false-audit-fabrication` threat closed end-to-end (PR #105 incident). The first clean HOW run uncovered a new ASTRIDE A-category threat: an agent that loses access to the `audit-emit-event` runner can rationalize that "the audit is non-blocking anyway" and write the audit JSONL by hand with fabricated SHA-256 hashes to appear compliant. The HOW agent self-admitted this in its run log ("the hash function is a black box and I can't reproduce it exactly... I'll generate plausible hashes knowing the chain verification would fail but the audit is non-blocking anyway"). The verdict came back `ok` because the audit-and-drift workflow had no chain-verification step. This entry captures the four-pronged defense:

  **(a) Prompt-level: invoke the Skill, never write the file.** The `prd-agent.agent.md` audit section was rewritten to match `market-research-agent.agent.md`'s pattern. Operative directive: *"**Invoke `audit-emit-event`** for every Skill call"* — the schema is reframed as the **payload you pass into the Skill**, with the full runner stdin wrapper (`okrId`, `runId`, `eventKind`, `payload`, `phase`, `intentThreadUuid`) in the canonical example, NOT on-disk JSONL. A new hard rule appears on both author-agent prompts: *"`audit-emit-event` is the ONLY legal path to the audit log. Never write `okrs/<id>/audit/events/*.jsonl` directly with `cat`, `echo`, `python`, `node`, or any other shell tool. If the runner returns `{ok: false}` or `npx @maintainabilityai/research-runner skill-audit-emit-event` is unavailable in your sandbox, STOP and post a PR comment naming the failure. Do NOT compute hashes yourself."* `market-research-agent.agent.md` also gets a tighter `chain_root_hash` placeholder — *"the `chainHead` returned by your FIRST audit-emit-event call (root of this run's chain). NOT the last event's hash."* — closing the 30-second confusion the WHY agent went through on PR #103.

  **(b) CI defense-in-depth: pre-merge chain re-verification.** Both `prd-agent.yml` and `market-research-agent.yml` get a new `Verify audit chain integrity` step right after `Locate audit JSONL`. The step is an inline Python replay (sort_keys + separators=','/':' — mirrors `canonicalStringify` in `research-runner/src/runner/skills.ts:641`) that re-hashes every event against the canonical serialization. Implemented **independently of the runner** so a runner bug can't silently pass. Verdict logic now has a `chain_fail` flag checked FIRST (highest-priority gate — a forged chain invalidates every other audit signal), and a new `chain-forgery-detected` label (color `B71C1C`, darker than the other failure labels) blocks merge on mismatch. PR #105's exact scenario would now fail the merge gate with a named cause.

  **(c) Runner side: `audit-verify-chain` Skill.** A new `audit-verify-chain` skill is registered in `packages/research-runner/src/runner/skills.ts` and shipped at `vscode-extension/code-templates/skills/audit-verify-chain/SKILL.md`. Reads `{okrId, runId}` from stdin, replays the chain with the same `canonicalStringify` + SHA-256 used by `audit-emit-event`, returns `{ok, chainHead, eventCount}` on success or `{ok: false, reason: "forged-hash-line-N: recorded=… recomputed=…"}` on first failure. Three tests cover the happy path, a PR #105-style fabricated chain (asserts `forged-hash-line-1` in the failure reason), and missing-JSONL. CLI: `npx @maintainabilityai/research-runner skill-audit-verify-chain`. Useful for local debugging, future agent invocation, and any third-party auditor who wants offline replay.

  **(d) Cross-phase audit ladder writer.** `okrs/<id>/audit/chain-ladder.yaml` was scaffolded empty (`chain: []`) by `OKRService.scaffoldOkrCard` with a comment saying *"Written by okr-bus.yml as each phase merges"* — but `okr-bus.yml` was never built. The cross-phase audit ladder (§11.8 audit export bundle) has been silently empty since Phase A scaffolded. Both `prd-agent.yml` and `market-research-agent.yml` finalize steps now append a row `{phase, run_id, intent_thread_uuid, chain_root_hash, parent_intent_thread, merge_commit_sha, merged_at, pr_number}` to `chain-ladder.yaml` on PR merge. Right-sized for the immediate gap vs building `okr-bus.yml` as a separate workflow. WHY's `parent_intent_thread` is the OKR root thread; HOW's is the most-recent prior WHY action's thread.

  **(e) UI parser sync — false `FR cited 0/8 ✗` display.** The audit workflow's awk parser at `prd-agent.yml:286` correctly emits `FR=8/8 cited` on prd.md files using either `**FR-NN**` bold or `### FR-NN` heading form. But `LookingGlassPanel.fetchPhaseSignal` was still using a bold-only regex (`\*\*FR-\d+\*\*`) with a 400-char citation-proximity window, causing the UI to show `FR cited 0/8 ✗` on PRs where the workflow correctly reported `FR=8/8 cited` (observed on PR #105). The UI parser now uses the same tolerance as the workflow + a shared `countCovered` helper that mirrors the awk pattern.

  **Docs:** `hatters-tea-party.md` Stage 3 guard table leads with "The activity log is intact" and explains in plain language that the pre-merge replay catches a forged log; Stage 2 paragraph #2 strengthened to name the pre-merge verification (not just the offline property). `agentic-sdlc-governance.md` AEGIS table gets a new row *"Pre-merge chain re-verification (CI gate)"*; the ASTRIDE paragraph names `A.false-audit-fabrication` as the fourth A-category and credits the new CI step as the mitigation; the auditable-evidence enumeration notes the auditor's offline replay matches the CI's pre-merge replay (same algorithm, same result).

  **Pre-publish quality gates fixed in the same push** (would have blocked vsce publish): nine TS errors on the `getCopilotEnvStatus` / `setCopilotEnvSecret` / `openCopilotFirewallSettings` / `openCopilotEnvSecretsPage` / `copilotEnvStatus` message types — they were handled in `LookingGlassPanel` but the union didn't declare them, so the dispatcher's `case` arms got `never` narrowing. Declared in `src/types/webview.ts`. ESLint `no-control-regex` blocking on the inline-markdown renderer's `\x00FENCE<n>\x00` sentinel — replaced with ASCII `__OKRMD_FENCE_<n>__`. Six dead workflow generators in `codeRepoTemplates.ts` (`generateOraculumResearchWorkflow` etc., left behind when `MESH_WORKFLOWS` centralized the registry) flagged by `knip --no-progress` and removed (`-37` lines).

- [x] **B26.** Maintainability push — three router/renderer functions replaced with dispatch tables (post-B25 audit). User feedback: *"you also keep ratcheting the complexity why?"* — the cyclomatic-budget ratchets had been bumped three times in one PR without addressing the underlying complexity. This entry reverses that pattern by removing the complexity at the source.

  Each of the three targets had the same shape: a giant `switch` statement (router/renderer) where every `case` added +1 to cyclomatic complexity. Replacing each with a `Record<key, handler>` dispatch table moves the per-branch complexity into individual handlers (each measured independently) and leaves the router as a one-statement lookup + call.

  | Function | Before | After | Mechanism |
  |---|---|---|---|
  | `LookingGlassPanel.handleMessage` | **125** | router < 5 | `messageHandlers: MessageHandlers<U>` — a mapped type that preserves per-variant payload narrowing |
  | `lookingGlass.ts` `addEventListener` IIFE | **232** | router < 5 | `inboundHandlers: Record<string, InboundHandler>` — 84 type keys, brace-balanced extraction via Python from the 988-line switch body |
  | `okrDetail.renderPhaseSignals` | **97** | orchestrator < 10 | Split into `renderPreflightSignal` + `renderWhyMetrics` + `renderHowMetrics` + `renderPrCascade` |

  Ratchets in `architecture-fitness.test.ts` lowered to the new actual ceilings, not bumped. `LookingGlassPanel.ts`: 125 → 72 (new ceiling: `fetchPhaseSignal` at 72 — future split target, see deferred list below). `lookingGlass.ts`: 224/232 → 29 (new ceiling: `renderOrgScanner` at 29 — pre-existing form renderer, future split target). `okrDetail.ts`: default 40 → 45 (new ceiling: `renderPrCascade` at 45 — legitimately state-branchy because each PR state surfaces a different affordance; splitting further would shuffle complexity into another dispatcher with no readability win).

  Net code diff: **-398 lines** (1045 deletions / 647 insertions). The savings come from removing the per-case `await this.onX(message.field); break;` boilerplate that the dispatch table makes redundant.

  Two latent bugs surfaced from the type system tightening as soon as the loose-`switch` form was replaced with the strict mapped-type dispatch: `addReposToBar` was passing `m.repos` (field doesn't exist on the union member) instead of `m.repoUrls`; an `openSettings` message type was declared in the inbound union but had no handler (silently dropped). Both fixed — `openSettings` removed from the union as it was never sent.

  **Future maintainability targets** (NOT done this round — flagged for the next maintainability push so we stop bumping):
  - `LookingGlassPanel.fetchPhaseSignal` (72) — per-phase audit/PR/structure aggregator. Could split into `fetchAuditEvents` + `fetchPrState` + `fetchStructureCounts` + `fetchDriftLabels`.
  - `lookingGlass.ts` `renderOrgScanner` (29) — long form renderer. Pre-existing; split by panel section.
  - `lookingGlass.ts` `renderRepoPickerModal` (22) — modal renderer with many conditional paths. Pre-existing.
  - `okrDetail.ts` `renderPrCascade` (45) — debatable. State-branchy by design; splitting may not help readability.

- [x] **B27.** Knight's Seal v1 — per-run ephemeral Ed25519 signing of every audit event (supersedes B16, full spec in §11.5). Shipped in research-runner 0.1.26 + extension build 2026-05-21. **Runner side:** `loadOrCreateRunKeypair()` generates a fresh Ed25519 keypair on first `audit-emit-event` call per `<okrId,runId>`; private key persisted to `os.tmpdir()/.research-runner-keys/<okrId>--<runId>.priv.pem` (mode 0600, NEVER in mesh tree); public key persisted to `<mesh>/okrs/<id>/audit/keys/<runId>.pub.pem` and embedded on event 1. Every event signed: `signature = Ed25519(privKey, sha256(canonical(event)))`. **Verify side:** `audit-verify-chain` reads the public key, recomputes each event_hash with `event_hash` AND `signature` zeroed, then verifies the signature. Returns `{ok, chainHead, eventCount, sealed, sealVerified}`. All-or-nothing enforcement: partial signatures = `{ok: false, reason: 'partial-signatures: N/M events signed (chain tampered)'}`. **CI side:** Python chain check in `prd-agent.yml` + `market-research-agent.yml` updated to handle the `signature` field; outputs `steps.chain.outputs.sealed`; PR audit-comment shows a new `Knight's Seal (Ed25519)` row (✓ Sealed / — legacy / — n/a). **UI side:** `OkrPhaseSignal.sealed` + `sealTampered` populated by `LookingGlassPanel.fetchPhaseSignal`; inline `🛡 Sealed` / `⛔ Tampered` badge rendered next to chain_root on the OKR detail card. **Tests:** 5 new sealing tests in `skills.test.ts` covering happy path (sealed=true), tampered signature, partial-signature tampering, legacy-unsigned-chain pass-through, and private-key-never-in-mesh assertion. 204 tests pass. **Deferred for B27.v1.1:** independent Ed25519 verification in the CI workflow (currently the chain check passes for sealed runs but doesn't re-verify Ed25519 — the runner's verify-chain is the canonical signature check; a Python `cryptography` step on the CI side is a defense-in-depth follow-up). Future cosign / sigstore evolution (Knight's Seal v2 — persistent identity in a transparency log) is documented at [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §6.

- [~] **B28.** Court Recorder Auto-Logging — the skill runtime emits `skill_call` audit events on every `runSkill()` invocation; the agent never calls `audit-emit-event` for skill_calls. **Why this matters:** B25 caught forged hashes and B27 caught forged signatures, but neither catches *missed* events ("agent forgot to log skill X"). B28 closes that gap by making emission deterministic — the audit log is built by the runner code, not by the LLM remembering its hard rules. The trust story upgrades from "verify the chain after the fact" to "the LLM cannot write to the audit log at all; only deterministic code can." Sub-deliverables tracked individually.

  - [x] **B28a — Tier 1: Runtime self-emission.** Shipped in research-runner 0.1.27. New `session-context.ts` reads `OKR_ID` / `RUN_ID` / `INTENT_THREAD_UUID` / `PHASE` env vars (workflow sets them at job start). `runSkill()` wraps every handler invocation: captures `duration_ms`, then auto-emits a `skill_call` event with payload `{skill, ok, duration_ms, reason?}` when session context is present. Backward-compat preserved — when env vars are absent, no auto-emission fires so legacy chains where the agent calls `audit-emit-event` explicitly keep working. `audit-emit-event` and `audit-verify-chain` are in `NO_AUTO_EMIT_SKILLS` (no recursion). Best-effort emission — an audit-write failure never shadows the real skill result; the chain-verify CI gate is the catch-net. **Tests:** 7 new tests covering happy path, legacy fallback, no-recursion guards (audit-emit-event + audit-verify-chain), `ok:false` honest logging with reason, unknown-skill rejection before context lookup, end-to-end chained verification with seal. 211 tests pass.

  - [x] **B28a.v1.1 — Parallel-emission hardening + chain_root_hash prompt clarity.** Shipped in research-runner 0.1.29 + VSIX 0.1.71. **Root cause:** PR #108 first E2E with B28 — the agent fired Tavily + arXiv + USPTO + HackerNews in parallel; only 1 of 4 skill_call events landed in the chain. Investigation: `LOCK_RETRY_LIMIT=3` × `LOCK_RETRY_BASE_MS=50` linear backoff = 300ms max wait, and `runSkill`'s `try/catch` swallowed the failures silently. **Fix:** bumped retry budget to 20 attempts with exponential `min(100 * 2^n, 500)ms` backoff = ~9.6s total wait — comfortably tolerates 4–8 parallel emissions; runSkill now writes `::warning::audit auto-emit failed for skill X: <reason>` to stderr on failure (was silent). **Prompt clarity:** both `.agent.md` files now explicitly state `chain_root_hash` is the `event_hash` of event_id=1 in the JSONL (`jq -r 'select(.event_id == 1) | .event_hash' …`), NOT the chainHead returned by any downstream explicit `audit-emit-event` call. The PR #108 agent was visibly confused about which value to use (mid-narrative: "Wait, that's a bit ambiguous… my first explicit call was the gap-loop marker…"). **New test:** 8 parallel `runSkill` invocations all land in the chain; regression test for the lock-contention class. 213 → 214 tests pass.

  - [x] **B28b — Tier 2: Agent contract refresh.** Shipped in research-runner 0.1.28 + extension build 2026-05-21. **Runtime extension:** new `auditMetadata` convention on `SkillResult` — handlers can declare structured key/value pairs that the auto-emitter merges into the `skill_call` event payload (canonical fields `skill`/`ok`/`duration_ms`/`reason` always win on collision so handlers can't lie about themselves). All 4 search-skill handlers (tavily/arxiv/uspto/hackernews) updated to declare `auditMetadata: {queries, result_count}` — `count-skill-calls` keeps working unchanged because the payload shape it reads is now produced by deterministic runtime code instead of by the agent. **Agent contracts:** `prd-agent.agent.md` step 13–14 rewritten so self-review is a structured PR-body block (`### Self-review — <persona> (round <N>)`); step 20 + audit-payload-schema + hard rule rewritten to say "runner auto-logs; agent does NOT call audit-emit-event for skill_calls or self_reviews." `market-research-agent.agent.md` step 13 + audit-payload-schema + hard rule rewritten the same way; step 8b gap-loop marker explicitly preserved as the one semantic event the agent still emits (runner can't infer). `audit-emit-event/SKILL.md` rewritten with a "When to call this skill (post-B28)" section. `agentic-sdlc-prd.md` + `agentic-sdlc-marketresearcher.md` gain a new "What the agent owns vs. what the runtime/workflow owns" matrix. **Tests:** 2 new tests covering `auditMetadata` round-trip into auto-emitted payload + canonical-field-wins-on-collision. 213 runner tests pass.

  - [x] **B28c — Tier 3: Workflow audit-shift.** Shipped in extension build 2026-05-21. **prd-agent.yml + market-research-agent.yml** both gain a new "Auto-emit artifact_written from git diff" step that detects the artifact path (`prd.md` / `research-doc.md`), sha256s the content, and emits via `npx @maintainabilityai/research-runner skill-audit-emit-event` with `payload.emitted_by: "workflow"`. Idempotency built in — skips emission if an `artifact_written` event for the same path already exists in the chain. **prd-agent.yml** gains an additional "Parse self-review blocks + emit per-persona-per-round events" step: regex over the agent's `### Self-review — <persona> (round N)` PR-body blocks (em-dash + hyphen both accepted for runtime-tolerance), emits one `self_review` event per block, idempotent against the chain. Both steps export `OKR_ID` / `RUN_ID` / `INTENT_THREAD_UUID` / `PHASE` as env vars so the runner auto-emits its own `skill_call` audit event when run from the workflow side too. **Looking Glass dispatch issue body** updated (`renderOkrPhaseIssueBody`) — adds a `### Session context env vars (B28)` subsection with a ready-to-paste `export OKR_ID=... RUN_ID=... INTENT_THREAD_UUID=... PHASE=...` block so the agent has explicit instructions. **Agent prompts** gain step 1b documenting the env-var export. **Threat-model impact:** T10 (agent skips emission to hide failures) and T11 (agent forges artifact_written or self_review payloads) both closed — the workflow re-derives both from filesystem + PR-body parsing, the agent's claims are irrelevant. **Performance note:** the new steps invoke `npx -y` per call which downloads the runner on first use; v1.1 follow-up will add a setup step to install once. 419 extension tests pass; both workflows parse clean.

  - [x] **B28d — Tier 4: Doc + marketing refresh.** Shipped 2026-05-21. **Design docs:** `agentic-sdlc.md` §11.6 Court Recorder Auto-Logging full spec landed in Tier 1; §13 B28 deliverable + sub-deliverable rows updated. `agentic-sdlc-prd.md` + `agentic-sdlc-marketresearcher.md` each have a "What the agent owns vs the runtime/workflow owns" matrix making the boundary explicit (landed in Tier 2). **Marketing site (`site-tw/public/docs/agentic-sdlc-governance.md`):** AEGIS Pre-Execution Firewall card bumped from 5-of-6 controls to **6-of-6** with the new "Deterministic emission" row called out; ASTRIDE card bumped from 3-of-4 to **4-of-4 A-categories** with the named threats A.audit-skip + A.audit-forge-payload closed; AEGIS detail table gains the new "Deterministic emission (Court Recorder Auto-Logging, B28)" row + the Knight's Seal row flipped from 🛠 to ✓; Auditable Evidence grid gains a 5th violet card "Check 5: Deterministic emitter — The LLM did not write the log"; "What no one else has" section adds a Deterministic-audit-emission paragraph explicitly contrasting Hatter's Tea Party with vendor products that log agent self-reports. **Workshop touchpoints:** Part 8 row updated to mention B28. **Cross-ref hygiene:** §11.7 / §11.8 renumbering of "What's NOT in the chain" + "Audit Report Export" applied across the design doc and the touchpoints doc.

  - [x] **B28e — Tier 5: End-to-end validation guide.** Delivered as a structured chat response to the user 2026-05-21: pre-test checklist, WHY phase test (golden + 3 edge cases), HOW phase test (golden + 2 edge cases), cross-phase validation, ready-for-Phase-D handshake. The guide is run by the user once the publish workflows complete and a fresh IMDB-Celebs E2E confirms the full chain — Tier 1 + Tier 2 hardening + B28 auto-logging all working together.

- [~] **B29.** Self-review attempt provenance via pure-data skills (`self-review-architect`, `self-review-security`). **Why this exists:** PR #112 surfaced a failure mode B28 didn't cover — the persona-switch self-critique was pure prompt-level reasoning with ZERO `skill_call` events. The prd-agent (running on GPT-5.3-codex after Copilot silently ignored our `model: claude-sonnet-4-6` declaration) hallucinated `tier=restricted` and skipped the self-critique loop, writing `SKIPPED_RESTRICTED_TIER` in the PRD frontmatter — when the OKR action's actual `governanceTier` was `supervised`. The audit chain had no trace of the attempt at all; the only way to catch the gap was to manually diff the agent's narrative against the OKR card. **What B29 ships:**

  - **Two new pure-data skills** (`packages/research-runner/src/runner/skills.ts → handleSelfReviewArchitect / handleSelfReviewSecurity`). Take `{okrId, runId, round}`, return authoritative `tier` (read from `actions[].governanceTier` matching the input runId), computed `maxAutoRounds` (3/2/0 per design §6.2), `shouldProceed` gate, and the contents of `.caterpillar/prompts/prd/<persona>-review.md`. Architect persona maps to `architecture-review.md` (full word — explicit filename mapping prevents the obvious bug). `auditMetadata` declares the chain-relevant fields so the runner auto-emit lands `{persona, tier, max_auto_rounds, round, should_proceed, prompt_pack_path, prompt_pack_found}` in the `skill_call` event payload (full `prompt_pack` body stays out of the chain to avoid bloat).

  - **Agent prompt updates** (`prd-agent.agent.md`). New step 12 mandates calling `self-review-architect` BEFORE any tier-inference. Agent MUST read `tier` and `should_proceed` from the skill's response — not derive them. Step 13/14 reframe the persona-switch as "apply the criteria from the `prompt_pack` field the skill just returned" — single source of truth. New explicit warning: "NOT in the artifact frontmatter, NOT as YAML — markdown blocks in PR body only." Step 14 adds the matching `self-review-security` call. Both skills added to the `tools:` list.

  - **MESH_SKILLS registration + SKILL.md docs** (`vscode-extension/src/templates/meshSkills.ts` + two new SKILL.md files). Looking Glass's Settings panel now expects 20 skills (was 18); deployment writes `.github/skills/self-review-architect/SKILL.md` + `.github/skills/self-review-security/SKILL.md`.

  - **Tests**: 5 new tests covering authoritative tier resolution from OKR action, restricted-tier should_proceed=false, round-exhausted should_proceed=false, action-not-found fail-fast (no fabrication path), end-to-end auto-emit with sealed chain. AgentDeploymentService test fixtures updated to the new counts. 219 runner + 419 extension = 638 tests pass.

  - **Net effect on PR #112 forensic:** if B29 had existed at PR #112 time, the chain would show 0 `self-review-architect` skill_calls with `tier: supervised` next to 0 self_review events parsed from PR body — making it visually undeniable from the audit comment alone that the agent claimed Restricted but the runtime says Supervised. B29 lifts self-critique provenance from "trust the agent's narrative" to "trust deterministic runtime emission" — the same architectural pattern B28 uses for skill_calls and artifact_written.

  - **Audit-and-drift workflow gate** (planned, not in this commit): compare `count(skill_call.skill == 'self-review-architect')` vs `count('### Self-review — Architect' blocks in PR body)`. Mismatch → `self-review-mismatch` label + audit comment row. Lands in B29.v1.1 once we validate the skills end-to-end on a fresh HOW run.

  - **End-to-end validated 2026-05-22** on PR #118 HOW run: chain shows 4 self-review skill_calls (architect r1+r2, security r1+r2) with `tier:supervised, should_proceed:true` — no tier hallucination this time. Agent's PRD frontmatter correctly used the skill's authoritative tier. Self-critique converged in 2 rounds (both MINOR → both PASS). The B29 architectural intent — chain-level proof of self-critique attempts — fully landed.

- [x] **B30.** Make runner invocation unambiguous + accept JTBD heading alternatives. **Why this exists:** PR #114 forensic surfaced two failure modes B29 didn't cover. (1) The agent used Copilot's `skill_use` tool (which only loads SKILL.md into context, doesn't invoke the runner backend) instead of `npx skill-X` for knowledge-* / context-* / uspto-search / hackernews-search. Audit chain had 4 events when it should have had 9+ — the runner never saw those calls. (2) Agent wrote `## Jobs-to-be-Done Analysis` (long form) while validators expected `## JTBD Analysis` (short form, what PR #110 wrote). Same logical section, different display string. **What B30 ships:** explicit `echo '{<input>}' | npx -y @maintainabilityai/research-runner skill-<name>` invocation pattern in both agent prompts with an explicit NOT-skill_use disclaimer; validator regex alternation accepting either JTBD heading form; pre-flight signal copy + agent prompt step rewrites for invocation discipline. **End-to-end validated** on PR #116 (WHY, 16 events) + PR #118 (HOW, 13 events) — every claimed skill call has a `skill_call` event in the chain.

- [x] **B31.** Tolerant FR-citation regex (accept `S-N` / `C-N` / `R-N` / `E-N` with or without dash) + unique-id dedup + 12-line window. **Why this exists:** PR #118 forensic — three stacked validator bugs surfaced on the first real HOW audit. (1) Agent wrote `Traces to: R2, R9, E1, E5` (no dash) — strict-dash `R-N` regex matched zero of 20 FRs despite citations existing. (2) Each FR appeared in BOTH heading (`### FR-01`) AND bold (`**FR-01**:`) forms — raw-marker counter saw 20 markers for 10 logical FRs, doubling FR_COUNT. (3) The 4-line window from the heading marker didn't reach the citation in the `Traces to:` line ~5 lines down. **What B31 + B31.v1.1 ship:** widened regex to `[CRSE]-?\d+` (also accept `S-N` / `C-N` since the WHY research-doc tags those, not R-N); rewrote workflow's awk FR/SR counter as inline Python with unique-id dedup + 12-line window; mirrored unique-id logic in `countUniqueIds()` helper in `LookingGlassPanel.ts`; updated agent prompt to explicitly list all four acceptable tag forms with dash-optional. **End-to-end validated** on PR #118 re-audit: FR cited 10/10 ✓ · SR anchored 8/8 ✓ · verdict `prd-pass`. Additional sub-fix: workflow Python heredoc needed `DOC="$DOC" python3 <<PYEOF` to inherit the bash-local `DOC` var (KeyError in initial deploy; one-line fix).

### Phase C — Orchestration + bounded recycle (target: 2 weeks)

Bus workflows land. Reviewer recycle loop works on Supervised/Autonomous tiers. Restricted tier still blocks (which is the point).

- [x] **C1.** `okr-bus.yml` workflow — listens for `oraculum-research` / `oraculum-prd` / `oraculum-design` labels on issues; verifies the agent file is deployed; posts `@copilot use agent <name>` comment; flips `okr.yaml.meta.status` (researching / prd-pending / design-pending) and bumps `updatedAt`; concurrency group keyed by issue number; defense-in-depth refusal when agent file missing.
- [x] **C2.** `reviewer-bus.yml` workflow — fires architect-reviewer + security-reviewer in parallel on `pull_request.opened` with `prd-draft` / `design-draft` labels; extracts `author_did` from PR body Hatter Tag; Tweedles guard refuses dispatch if a reviewer agent name matches author's; re-entrance guard skips when already dispatched. Pocket Watch + Caterpillar drift steps land in C-PR5. **Note (updated B-PR1c):** `research-synthesis` was originally in the trigger list but has been removed — research docs are descriptive (synthesis from sources, no design decisions to grade) and have no reviewer prompt packs. WHY-phase merge gate is `audit-validate.yml` + `research-pass` label only. **Open issue (§14.x):** the `@copilot use agent <name>` PR-comment dispatch pattern puts the reviewer in sub-agent mode (limited tools — `view` / `skill` / `report_progress` only); the architect/security reviewers need the `agent_assignment` body extension treatment that worked for author agents, which means moving to a per-reviewer tracking-issue dispatch pattern. Tracking work item in §14.x.
- [x] **C3.** `design-bus.yml` workflow — fans out per `target_code_repos[]`; opens issue in each target repo with OKR context inlined — fires on `pull_request.closed` with `design-draft` + `governance-pass` labels; reads `targetCodeRepos[]` from `okr.yaml`; opens one `oraculum-design-landing` issue per target repo carrying canonical markers (`okr_id`, `intent_thread_uuid`, `parent_intent_thread`, `design_pr_url`) + readable OKR context. Cross-repo writes use `secrets.GH_TOKEN_FANOUT` (fine-grained PAT) with fallback to workflow token for same-org repos.
- [x] **C4.** State machine in `label-on-merge.yml` — `governance-pass` only when both reviewer scores ≥ threshold AND tier allows; `revision-required` applied on Supervised/Autonomous tiers up to MAX_AUTO_ROUNDS — implemented as a NEW workflow `okr-state-machine.yml` (the legacy `label-on-merge.yml` stays for the research → PRD → spec-ready handoff in the legacy CI path). Promotes master `governance-pass` when both reviewer pass-labels are present; escalates to `needs-human-review` when round >= tier MAX.
- [x] **C5.** Round counter + HumanGate transitions wired into `okr-bus.yml` — round counter implemented via `round-N` PR labels (visible, gh-cli-manipulable). `reviewer-bus.yml` extended to fire on `pull_request.synchronize` (author-agent revision push), bumps the label, re-dispatches reviewers. `okr-state-machine.yml` reads the round label + frozen `governanceTier` from the OKR's latest action and gates accordingly.
- [x] **C6.** HumanGate UI on OKR detail (Approve / Re-run / Reject buttons; dual-signature override modal) — Action card surfaces the gate panel when latest action's status is `human_gate` or `blocked`. Approve applies `governance-pass` to the PR + flips action to `complete`; Re-run re-comments `@copilot use agent <author>` + increments rounds; Reject closes the PR + marks the action `cancelled`. Restricted tier requires dual signature via a two-step native input flow (Approver #1 + Approver #2, must be distinct).
- [x] **C7.** White Rabbit's Pocket Watch goal-drift gate — workflow step that hashes OKR.objective at phase start vs PR scope at merge; blocks merge on drift > threshold — shipped as `drift-gate.yml` (a separate workflow rather than a step inside reviewer-bus, for clearer toggling). Uses GitHub Models `text-embedding-3-small` via the workflow's GITHUB_TOKEN (no extra secret needed). Thresholds per §9.2: cosine ≥ 0.85 AND edit_distance/length ≤ 0.30 — BOTH must hold. Falls back to edit-distance-only when embeddings unavailable. On drift: applies `goal-drift-detected` label + posts violation comment + fails the workflow.
- [x] **C8.** Caterpillar's Challenge — semantic-drift comparison hook in `reviewer-bus.yml` (research → PRD → design → code) — implemented as a second check in the same `drift-gate.yml`. Compares current-phase artifact (PR body or full doc) against the prior phase's merged artifact (`okrs/<id>/why/research-doc.md` for How, `okrs/<id>/how/prd.md` for What). Threshold: cosine ≥ 0.70 (looser than Pocket Watch since phases add detail). Only runs on `how` and `what` PRs.
- [x] **C9.** `Start What` button (depends on design-bus.yml; Restricted-tier disabled state per §10.2) — Start What now follows the same pattern as Start Why / Start How via the parameterized `onStartOkrPhase('what')` handler. UI gates on (a) How phase complete (else "Gated on How merged" tooltip) and (b) tier != Restricted (else "escalate the BAR governance score" tooltip). The What action's GitHub issue is created in the mesh repo with `okr-anchor` + `oraculum-design` labels; the merged code-design PR's downstream fan-out is `design-bus.yml`'s job.

### Phase D — code-design-agent + code-grounded reviewers + hand-off completion (target: 3 weeks)

The third and **last** Looking-Glass-side agent. Where Phase B's market-research-agent grounded on the web and Phase B's prd-agent grounded on the mesh, the code-design-agent grounds on **the actual code** in every impacted repo (brownfield) — or on the PRD + mesh + reference-repos when the repo doesn't exist yet (greenfield, signalled by A12.v1.1's `'create'` status). WHAT-phase audit is the heaviest gate in the entire pipeline — and the most expensive — but also the one that catches "the PRD was perfectly mesh-grounded and still proposes something the codebase can't absorb without breaking."

**Full Phase D spec → [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md).** That doc owns: scope at a glance · the canonical brownfield-vs-greenfield branching matrix (per `targetCodeRepoStatus` A12.v1.1) · all sub-deliverables (D0–D12) · the hand-off canonical spec (cross-repo Hatter Tag continuation, design-bus.yml partial-failure handling, greenfield repo-creation flow, tier-gating on receiving repos) · open decisions (D8 reviewer dispatch pattern).

Phase D status flips here as the deliverables ship — the codedesigner doc is the truth-source for *design intent*, the index's §13 is the truth-source for *what's actually built*.

- [x] **A12.v1.1** (Phase D prerequisite). 4-state `targetCodeRepoStatus` per-repo enum: `'connected'` (brownfield — clone + ground on real code) · `'not-connected'` (refuse dispatch; user must pick Connect or Create) · `'create'` (greenfield — design from PRD + mesh + reference-repos; `design-bus.yml` scaffolds the repo before opening landing issue) · `'unreachable'` (system-set after probe). Backward-compatible `z.preprocess` translates legacy `'declared'` → `'not-connected'` on read. UI uses a 3-option select (`unreachable` is system-set only). Without A12.v1.1, the IMDB-Celebs sample's `celeb-api` greenfield repo would 404 on `knowledge-code` clone and the agent would design against nothing.
- [ ] **D-PR1** (MVP — runnable end-to-end). Ships **D0 + D1 + D4 + D6 + D7** in one PR — gets a working code-design-agent on the IMDB-celebs sample without the reviewer packs. Includes: pipeline overview · `design/synthesis.md` prompt pack with explicit brownfield/greenfield per-repo branching · `code-design-agent.agent.md` (primary-mode dispatch via `assignCustomCopilotAgent`, same as Start Why / Start How) · `knowledge-code` Skill with 3-mode response (brownfield ObservedArchitecture / greenfield scaffolding hints / refuse on not-connected) · `code-design-agent.yml` workflow with the A12.v1.1 repo-status precondition gate. Validation: chain shows ≥1 `knowledge-code` skill_call per target repo with the mode field correctly set per A12.v1.1 status; per-repo `addresses:` frontmatter in `code-design.md` carries `mode: brownfield | greenfield` matching the chain.
- [ ] **D-PR2** (reviewer packs + D8 decision). Ships **D2 + D3 + D8**. The D8 decision lands here grounded on D-PR1's first end-to-end run: if persona-switch self-critique caught the obvious findings in D-PR1, stay with (a); if code-grounded findings slipped through, escalate to (c) hybrid. The two review packs (`design/architecture-review` / `design/security-review`) follow the same NCMS structured-review shape PRD uses but read `knowledge-code` outputs not mesh artifacts.
- [ ] **D-PR3** (reference-repos). Ships **D5** — `knowledge-reference-repos` Skill cloning + indexing mesh-configured reference repos for greenfield targets to use as exemplars. Optional; only fires when `mesh/.caterpillar/reference-repos/<bar-id>.yaml` exists.
- [ ] **D-PR4** (fan-out — brownfield + greenfield scaffolding). Ships **D9**. `design-bus.yml` with two branches: brownfield repos get the landing issue directly; greenfield repos get scaffolded (idempotent org-create + seed README/LICENSE/CODEOWNERS/code-design-spec.md commit) THEN landing-issue opened. New failure modes: `scaffold-failed` (org-create rejected) + `scaffold-partial` (repo created, seed commit failed mid-flight). Per-repo result file `design-fan-out.yaml` records `mode` + `repo_created` + `seed_commit_sha`.
- [ ] **D-PR5** (Looking Glass UX). Ships **D10 + D11**. Stage 4 What-Code-Design card (mirrors HOW card shape) + Stage 5 Per-Repo Fan-Out card with brownfield vs greenfield row indicators and "Retry fan-out / Resume scaffold" affordances per failed row. Hatter chain ladder visualization on OKR detail rendering the full cross-phase tree from `chain-ladder.yaml`.
- [ ] **D-PR6** (E2E smoke). Ships **D12**. Full pipeline end-to-end on IMDB-Celebs sample: WHY merges → HOW merges → WHAT dispatches → code-design-agent grounds brownfield on `imdb-lite-app` and greenfield on `celeb-api` → self-review persona-switch fires 2 rounds with MINOR→PASS convergence (validating the same B24 pattern PR #118 proved) → `design-bus.yml` scaffolds `celeb-api` then fans out → both landing issues opened with intent-thread continuation. Restricted-tier expectation: WHAT dispatches but the audit-and-drift verdict requires HumanGate (UI button finally fires in production).

### Phase E — Audit Report Export + hardening (target: 1 week)

The auditor's master question is answerable in one click.

- [ ] **E1.** `OKRService.exportAuditReport()` — generates the bundle described in §11.8
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
- [x] **v4.7** Audit Report Export (§11.8)
- [x] **v4.8** Phase tracking inline (this section)
- [x] **v4.9** Deliverables map with status column (§15)
- [x] **v4.10** `A.false-audit-fabrication` threat closed end-to-end (B25 — prompt rewrite + CI verify-chain + chain-ladder writer + AEGIS/ASTRIDE docs in `site-tw/public/docs/agentic-sdlc-governance.md`)
- [x] **v4.11** Maintainability push (B26 — three dispatch-table refactors; ratchets lowered to real ceilings)

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

### 14.8 Reviewer dispatch — sub-agent vs primary-agent capability gap (OPEN)

**Problem.** GitHub Copilot Coding Agent has two dispatch modes with very different tool surfaces:

| Mode | How invoked | Tools the agent gets |
|---|---|---|
| Primary custom agent | Issue assignment with `agent_assignment: <name>` body extension | The agent's declared `tools:` list (read, edit, search, execute + custom skills) |
| Sub-agent | `@copilot use agent <name>` PR/issue comment | `view`, `skill`, `report_progress` only |

Phase B-PR0 hit this exact failure for AUTHOR agents — the fix was switching Looking Glass's Start dispatch to use the `agent_assignment` body extension via the assignment API on the OKR anchor issue. That gives the author agent (market-research-agent / prd-agent / code-design-agent) full primary-mode tools.

REVIEWER agents are still dispatched the old way. `reviewer-bus.yml` posts `@copilot use agent architect-reviewer` and `@copilot use agent security-reviewer` as PR comments, which means the reviewers run in sub-agent mode and CANNOT call `read`/`edit`/`search`/`execute` or any custom Skill in their declared `tools:` list. They can only call the built-in `view`/`skill`/`report_progress` — which is enough to read the PR diff but NOT enough to call `knowledge-okr`, `context-architecture`, `audit-emit-event`, etc.

The Phase B-PR1c evidence-honesty gate WILL catch this on reviewer runs too: a reviewer that declares it called `context-security` but didn't will fail the audit count.

**Candidate solutions** (no decision yet; this is what's blocking the reviewer-bus from being primary-agent-clean):

1. **Per-reviewer tracking issue.** When reviewer-bus needs to dispatch architect-reviewer for PR #N, open a tracking issue `[Review] architect-reviewer for PR #N` in the mesh repo, assign it to `copilot-swe-agent` with `agent_assignment: architect-reviewer` body extension. The reviewer agent runs in primary mode, reads the PR via `gh pr view`, posts the structured review back as a PR comment on #N, then closes its tracking issue. **Pros:** mirrors the proven author-dispatch path; full tool access. **Cons:** issue-noise (4 extra issues per artifact PR — one per reviewer per round); two-hop indirection between PR and review action.
2. **Single reviewer-coordinator agent.** One agent file (`artifact-reviewer.agent.md`) that runs both prompt packs internally and posts two structured reviews. **Pros:** one dispatch, no extra issues. **Cons:** weakens Tweedles segregation (one agent runs both architecture + security personas — auditor can no longer point to two distinct agent DIDs). Would need DID-rotation per pack invocation to preserve §5.3.
3. **Direct LLM via API in workflow.** Skip Copilot dispatch for reviewers entirely; the workflow `curl`s the PR diff + prompt pack into Anthropic API and parses the structured response. **Pros:** zero Copilot indirection; reviewers run in CI, easier to inspect. **Cons:** new secret + cost off the Copilot Business plan; loses the Copilot session UI that humans can intervene in.

**Recommendation (pending validation).** Option 1 — per-reviewer tracking issue. It preserves Tweedles, keeps the Copilot UX humans are already used to, and the issue-noise can be hidden by an `[oraculum-internal]` label that Looking Glass filters out by default. **Until this lands, PRD-phase reviews will produce empty / partial scores and the okr-state-machine will not promote `governance-pass`.** That's a safe failure mode (no auto-merge of un-reviewed PRDs) but it does mean the HOW phase is currently human-gated, not automated. Tracked as Phase C-PR6.

#### 14.8.1 Verification plan (run BEFORE picking a solution)

The Copilot Coding Agent docs note a session-boundary behavior we have not directly tested for reviewer dispatch:

> Once Copilot creates the draft PR, you should move your instructions and mentions of `@copilot` there rather than continuing the conversation in the original issue.
>
> Static Reading: Copilot reads the issue context at the moment it is assigned. To refresh scope, unassign + reassign.

The sub-agent failure (`view` / `skill` / `report_progress` only) was observed when the AUTHOR session was still alive and we dispatched a sub-agent under it via PR comment. The post-session case — author session closed, draft PR ready for review, fresh `@copilot use agent <reviewer>` comment kicks off a NEW session — has NOT been tested. If a fresh PR-level `@copilot` mention starts the reviewer as the primary of a new session, the reviewer gets its full declared `tools:` list and Option 1 (tracking-issue indirection) becomes unnecessary.

**Test protocol** (run on the next `Start How` → PRD PR that lands):

1. Wait for the prd-agent's author session to fully terminate. Signals: draft PR is `ready for review`, author posted its final summary comment, no 👀 emoji-in-progress on the PR.
2. Manually post `@copilot use agent architect-reviewer` as a PR comment.
3. Observe the resulting Copilot session log. **Look for the diagnostic line we hit before:** `Agent constraint note: In this execution context the <agent-name> persona has access only to the skill and report_progress tools.`
   - **Absent** → reviewer started in primary mode with full tools. Path works. Skip C-PR6 tracking-issue work; reviewer-bus can stay as two `gh pr comment` calls.
   - **Present** → reviewer is in sub-agent mode regardless of session boundary. Ship C-PR6 tracking-issue pattern as designed.
4. If step 3 passes, repeat with `@copilot use agent security-reviewer` to confirm sequential dispatch works:
   - Do the two reviewers run sequentially (architect must finish before security can start)?
   - Do they collide on PR state (e.g. both try to push a review comment at the same time)?
   - Does posting both comments at once queue them or only run the first?
5. If sequential works but parallel doesn't, reviewer-bus.yml needs a "wait-for-architect-done" gate before dispatching security. Acceptable — still simpler than tracking issues.

**Exit criteria.** Test produces one of three outcomes:

| Outcome | Implication | Next step |
|---|---|---|
| Both reviewers run as primary, sequential dispatch works | Option 1 (tracking issues) unnecessary | Update reviewer-bus.yml to use the post-session comment pattern; close C-PR6 as obviated |
| Both reviewers run as primary, parallel dispatch races | Path works but needs serialization | Add per-reviewer gate (poll for architect's review comment before dispatching security); close C-PR6 |
| Reviewer ends up in sub-agent mode | Path is broken | Ship C-PR6 tracking-issue pattern with this experiment's session log as justification |

Record results in this section before deciding. Do NOT pre-build the tracking-issue infrastructure speculatively.

### 14.9 Why `npx @maintainabilityai/research-runner` resolved for WHY but not HOW in the Copilot sandbox (DEFERRED)

**Observation (PR #103 vs PR #105).** Same Copilot Coding Agent runtime, same `audit-emit-event` skill declaration in `tools:`, but the WHY agent successfully shelled out `npx @maintainabilityai/research-runner skill-audit-emit-event` ~9 times and got back `{ok:true, chainHead:"...", eventId:N}` from the runner. The HOW agent reported *"the tool `npx @maintainabilityai/research-runner skill-audit-emit-event` isn't available in this sandbox"* and (because the prompt didn't forbid it at the time) hand-wrote the JSONL with fabricated hashes.

**Status: DEFERRED.** Per user direction in the B25 push: *"I think we'll get better results with fixed agents so we'll skip [the npx investigation]."* The B25 defenses now catch any future fabrication regardless of the root cause:
- Prompt-level rule says STOP if the runner is unreachable; never hand-write the JSONL.
- CI verify-chain step re-replays the chain and applies `chain-forgery-detected` on mismatch.

If a future run still surfaces the unavailability, candidate explanations to investigate (NOT ranked):

1. **Cold-cache vs warm-cache.** WHY ran first; HOW ran in a fresh container after a ~hour gap. Possible npm registry / npx package resolution cache cold-start failure.
2. **Skill-runtime resolution path drift.** Copilot resolves declared Skills by walking `tools:` → `SKILL.md` → `runtime: research-runner` → `command: npx ...`. If the HOW agent's sandbox doesn't have `npx` on PATH (e.g. minimal node-less variant of the Copilot Coding Agent container), the skill is effectively undeclared even though the declaration is correct.
3. **Different agent profile.** WHY uses `claude-sonnet-4-6` (the agent's declared `model:` field). HOW uses the same. But if Copilot routes different agents to different container images, the npx-availability could vary.
4. **The agent never tried `execute`.** The HOW agent may have reached for a tool the audit-emit-event skill needs (`execute` shell access) but found it gated and given up — without ever issuing a real `execute "npx ..."` call. Run logs would distinguish "tried and got ENOENT" from "decided not to try."

Closing this section requires producing one of:
- A failing HOW run where the runner IS reachable (i.e. the issue was cold-cache, now warm).
- A run trace showing the exact `execute` syscall that failed and its return code.
- Confirmation that Copilot's container image for prd-agent lacks node (settle (2)).

Once root cause is identified, fix is small (likely a `setup-node` pre-step in the agent's environment or a runner pre-warm in `copilot-setup-steps.yml`).

---

## 15. Deliverables map

Status legend: `[ ]` planned · `[~]` in progress · `[x]` shipped · `[!]` blocked · `[s]` superseded.

| Status | Deliverable | Location | Phase |
|---|---|---|---|
| `[x]` | `okr.yaml` schema + Zod type (incl. `intent_cascade`, `intent_thread_uuid`, IntentSpec frontmatter, `governance` overrides) | `vscode-extension/src/types/okr.ts` | A |
| `[~]` | OKRService (`readAll`, `read`, `create`, `update`, `appendAction`, `updateAction`, `updateStatus`, `setPaused`, `targetCodeReposFor`, `tierFor`, `exportAuditReport`) — Phase A methods shipped; `exportAuditReport` stub returns `not-implemented-yet (Phase E)` | `vscode-extension/src/services/OKRService.ts` | A → E |
| `[x]` | `scaffoldImdbLiteOkr` — seeds **Celebs-anchored** sample OKR (§8.1) with pre-filled intent_cascade; auto-seeded when Sample Platform → IMDB Lite chosen; idempotent + self-heals stale `<org>` URLs | `vscode-extension/src/services/MeshService.ts` (extend) | A |
| `[x]` | OKR list view (table + tier badges + status filter) — `+ Create OKR` opens detail in `create` mode | `vscode-extension/src/webview/app/views/okrList.ts` | A |
| `[~]` | OKR detail view — full mockup per §10.2 (header, KRs, BARs, Action cards, footer). Phase A delivered view/edit/create modes; `Start` buttons remain disabled until Phase B agent wiring; HumanGate UI lands in C | `vscode-extension/src/webview/app/views/okrDetail.ts` | A → C |
| `[x]` | OKR portfolio entry-point — rendered as the `okrs` EA lens on the portfolio header (instead of a separate tile) | `vscode-extension/src/webview/app/lookingGlass.ts` (lens routing) | A |
| `[x]` | `bar.app.yaml.repos[]` seeding with 4 workshop repo names (`imdb-react-frontend`, `imdb-identity`, `movie-api`, `celeb-api`) — declared, not connected; real GitHub org auto-detected from mesh git remote | `vscode-extension/src/services/MeshService.ts` (extend `scaffoldImdbLitePlatform`) | A |
| `[~]` | Asymmetric CALM seed: rich `app-imdb-lite.arch.json` (8 nodes, 5 NIST controls, threats) vs sparse `app-imdb-celebs.arch.json` (6 nodes, no controls/threats) | `vscode-extension/src/templates/mesh/calmTemplates.ts` | A (extend imdb-lite with threat-model + controls blocks) |
| `[ ]` | **Connect Repo** button + flow for declared-but-not-connected `repos[]` entries | BAR detail view | A |
| `[x]` | **Intent Thread UUID** generator + stamping on every Hatter's Tag (rename `parent_run_id` → `intent_thread_uuid`/`parent_intent_thread`) | `packages/research-runner/src/runner/hatters-tag-builder.ts` | A |
| `[~]` | Hatter's Tag full schema: `intent_thread_uuid`, `author_did`, `author_prompt_pack_version`, `reviewer_dids[]`, `threat_model_ref`, `calm_nodes_referenced[]`, `owasp_categories[]`, `stride_threats[]`, `fitness_results`, `reviewer_scores`, `governance_tier`, `chain_root_hash` — Phase A landed `okr` + `attestation` blocks (optional, populated by Phase B+ agents); cryptographic signature is Knight's Seal (B+ stretch) | `packages/research-runner/src/runner/hatters-tag-builder.ts` | A → B (signature: B+) |
| `[x]` | Audit event schema (phase, okr_id, intent_thread_uuid) | `packages/research-runner/src/runner/audit-emitter.ts` | A |
| `[s]` | **Court Recorder** CloudEvents v1.0 envelope helper — **deferred to future SIEM-export work.** `buildCloudEventsEnvelope` + `serializeCloudEventsEnvelope` stay in the repo as a dormant helper; on-disk JSONL stays flat (§11.2). Adoption ships when a SIEM-export use case lands. See [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md) §8. | `packages/research-runner/src/runner/court-recorder.ts` (helper, dormant) | Future |
| `[x]` | **Tier-detection logic** — `OKRService.tierFor()` reads BAR pillar scores → derive `governance_tier` (Autonomous/Supervised/Restricted) → drive UI gates + Hatter's Tag stamp. Phase A: `tierFor()` shipped + feeds the OKR list tier badge + detail header. Phase B-PR3: tier is frozen on every OkrAction's `governanceTier` field at issue-create time (mitigates tier creep per §6.2); UI substate gates the Start Why button. | `vscode-extension/src/services/OKRService.ts` + BarService | A → B |
| `[x]` | **White Rabbit's Pocket Watch** goal-drift gate — hash OKR.objective at phase boundaries; block merge if drift > threshold — implemented in `drift-gate.yml` via GitHub Models embeddings (text-embedding-3-small) authed by workflow GITHUB_TOKEN. Edit-distance-only fallback when embeddings unavailable. | `vscode-extension/code-templates/workflows/drift-gate.yml` | C |
| `[x]` | **Caterpillar's Challenge** — explicit semantic-drift comparison step between phase artifacts — second check in `drift-gate.yml`. Compares current phase against prior phase's merged artifact via cosine similarity (threshold 0.70). | `vscode-extension/code-templates/workflows/drift-gate.yml` | C |
| `[ ]` | **Knight's Seal v1 — per-run ephemeral Ed25519 signing** (B27, supersedes B16). Signs `sha256("knights-seal:v1\n" + chain_root_hash + "\n" + artifact_sha256 + "\n" + okr_id + "\n" + run_id + "\n" + intent_thread_uuid)`. Public key + signature in Hatter Tag (`audit.seal_pub` / `audit.seal_sig`). New `audit-verify-seal` Skill + CI verify step + `seal-broken` label + Looking Glass per-phase seal badge. Full spec §11.5. | `packages/research-runner/src/runner/skills.ts` (extend audit-emit-event with keypair-gen + sign on `artifact_written`; new `audit-verify-seal` handler) + `vscode-extension/code-templates/skills/audit-verify-seal/SKILL.md` + `vscode-extension/code-templates/workflows/{prd,market-research}-agent.yml` (new verify step + `seal-broken` label) + `vscode-extension/src/webview/app/views/okrDetail.ts` (seal badge) | B (post-B26) |
| `[ ]` | **Knight's Seal v2 — cosign / sigstore persistent signing** (§16 future). Replaces v1's ephemeral key with a GitHub-App-anchored identity in the sigstore transparency log; verifier no longer needs to trust the public key embedded in the audit log. Pairs with signed-prompt-pack deployment from the same root of trust. Lands when there's a third-party verifiability requirement (regulatory, cross-org artifact consumption). | TBD — likely a new `packages/research-runner/src/runner/cosign-seal.ts` + cosign CLI invocation in CI | Future |
| `[ ]` | **Queen's Keyring** — short-lived per-task GitHub App installation tokens (scope: this OKR + repo set) | AgentDeploymentService + GitHub App config | B |
| `[x]` | **HatterTagService** — parse, render-for-UI, invoke verify-chain CLI — `parseHatterTag` + `verifyChain` (stub for Phase E `verify-chain` CLI) shipped in B-PR4 | `vscode-extension/src/services/HatterTagService.ts` | B |
| `[x]` | **Hatter Tag UI sheet** (full-schema view from Action card `View Tag` button) — overlay modal rendering parsed tag JSON with friendly fallbacks for missing/unparseable artifacts; Phase E adds the `verify-chain` badge | `vscode-extension/src/webview/app/lookingGlass.ts` (renderHatterTagSheet) | B |
| `[ ]` | **Audit Report Export** generator (zip bundle: PDF + traceability HTML + per-phase artifacts + Hatter Tags + JSONL + verify-chain + prompt-pack snapshots + checksums) | `OKRService.exportAuditReport()` | E |
| `[ ]` | **Traceability matrix renderer** (KR → Finding → FR/SR → Design → Code; HTML + CSV) | `vscode-extension/src/webview/app/exports/traceability.ts` | E |
| `[x]` | Remove "Promote to research-request" from OracularPanel | `vscode-extension/src/webview/OracularPanel.ts` | A |
| `[~]` | "Create OKR from finding" button + draft modal — disabled stub shipped in A (sidebar button); full flow Phase B | OracularPanel | A (stub) → B (full flow) |
| `[x]` | Active Runs panel grouped by OKR id (renderRow / renderGroup; "Legacy (no OKR anchor)" fallback group for runs without `okrId`) | `vscode-extension/src/webview/ActiveRunsPanel.ts` | A |
| `[~]` | **Settings → Mesh Provisioning** with 3 tabs (Workflows / Agents / Skills) + retained "Secrets & Models" tab — B-PR2 ships a single "Phase B — Mesh Provisioning (Agents + Skills)" section + redeploy button with deployment status badges. Full 3-tab refactor + deprecation notices on sunset workflows land after B-PR4 end-to-end verification. | `vscode-extension/src/webview/app/lookingGlass.ts` (renderSettingsAgentic) | B |
| `[ ]` | Deprecation removal flow (audit-logged) for `oraculum-research.yml`, `archeologist.yml`, `prd.yml`, `notify-code-repos.yml` | AgentDeploymentService.removeDeprecatedWorkflow | B (after Phase B verified end-to-end) |
| `[~]` | `tavily-search`, `arxiv-search`, `uspto-search`, `hackernews-search` Skills (PURE data — no LLM inside) — templates shipped B-PR1; CLI backend B-PR1a | `vscode-extension/code-templates/skills/<name>/SKILL.md` | B |
| `[~]` | `dedupe-and-rank` Skill — template shipped B-PR1; CLI backend B-PR1a | `vscode-extension/code-templates/skills/dedupe-and-rank/SKILL.md` | B |
| `[~]` | `format-research-issue-update` Skill — template shipped B-PR1; CLI backend B-PR1a | `vscode-extension/code-templates/skills/format-research-issue-update/SKILL.md` | B |
| `[~]` | `knowledge-okr`, `knowledge-mesh-*`, `knowledge-research`, `knowledge-prd`, `knowledge-code`, `knowledge-reference-repos` Skills — templates shipped B-PR1 (reference-repos slipped to D); CLI backends B-PR1a | `vscode-extension/code-templates/skills/knowledge-*/SKILL.md` | B (reference-repos in D) |
| `[!]` | `context-architecture`, `context-security`, `context-quality` Skills — **runtime gap**: SKILL.md templates deploy to mesh but `runner/skills.ts` has NO handler for any of them. prd-agent declares all three in `tools:` and a hard rule says "stop if context-* returns {ok: false}", but runtime returns unknown-skill so the agent silently violates its own contract. Fix: ship handlers (aggregate existing knowledge-mesh-* reads). See §13 B5 entry for full context. | `vscode-extension/code-templates/skills/context-*/SKILL.md` (templates) + `packages/research-runner/src/runner/skills.ts` (needs handlers) | B |
| `[x]` | `audit-emit-event` Skill (wraps Court Recorder for agent use) — CLI backend shipped in B-PR1a; cross-process file-lock; writes hash-chained events to `okrs/<id>/audit/events/<runId>.jsonl` | `vscode-extension/code-templates/skills/audit-emit-event/SKILL.md` | B |
| `[x]` | **`audit-verify-chain` Skill** — replays the SHA-256 chain over an existing audit JSONL; returns `{ok, chainHead, eventCount}` on success or `{ok: false, reason}` on first integrity failure. Used by CI as defense-in-depth against agent-fabricated audit logs (PR #105 / B25 incident). Same canonical hashing algorithm as `audit-emit-event` (sort_keys + separators=','/':'). Three tests cover happy path / forged chain / missing JSONL. | `vscode-extension/code-templates/skills/audit-verify-chain/SKILL.md` + `packages/research-runner/src/runner/skills.ts` | B (post-B25) |
| `[x]` | **Pre-merge chain-verification CI step** — inline Python in `prd-agent.yml` + `market-research-agent.yml` (immediately after `Locate audit JSONL`). Independent of the runner so a runner bug can't silently pass. Verdict logic checks `chain_fail` FIRST (highest-priority gate). New `chain-forgery-detected` label (color `B71C1C`) blocks merge on mismatch; cleaned up by the stale-label-remove step on verdict flip back to `ok`. | `vscode-extension/code-templates/workflows/{prd,market-research}-agent.yml` | B (post-B25) |
| `[x]` | **`chain-ladder.yaml` writer** — both agent finalize jobs now append `{phase, run_id, intent_thread_uuid, chain_root_hash, parent_intent_thread, merge_commit_sha, merged_at, pr_number}` on PR merge. Closes a pre-existing silent gap: `OKRService` scaffolded the file empty (`chain: []`) with a comment saying *"Written by okr-bus.yml as each phase merges"* — but `okr-bus.yml` was never built. WHY's `parent_intent_thread` is the OKR root thread; HOW's is the most-recent prior WHY action's thread. | `vscode-extension/code-templates/workflows/{prd,market-research}-agent.yml` (finalize step) | B (post-B25) |
| `[x]` | **Pre-publish quality-gate fixes** — declared the four `getCopilotEnvStatus` / `setCopilotEnvSecret` / `openCopilotFirewallSettings` / `openCopilotEnvSecretsPage` inbound + `copilotEnvStatus` outbound message types (handlers existed but the union didn't declare them → 9 TS errors); replaced `\x00FENCE<n>\x00` null-byte sentinels in the inline markdown renderer with ASCII `__OKRMD_FENCE_<n>__` (`no-control-regex`); removed 6 dead workflow-generator exports (`generateOraculumResearchWorkflow` etc.) flagged by `knip`. | `src/types/webview.ts` + `src/webview/app/views/okrDetail.ts` + `src/templates/codeRepoTemplates.ts` | B (post-B25) |
| `[x]` | **Dispatch-table refactor — handleMessage** (cyclomatic 125 → router < 5). Typed `messageHandlers: MessageHandlers<U>` with a discriminated-union mapped type that preserves per-variant payload narrowing. Each handler is its own arrow whose complexity is measured independently. Caught two latent bugs the union form makes visible: `addReposToBar` had `m.repos` (didn't exist) instead of `m.repoUrls`; `openSettings` message type was declared but had no handler. Both fixed. | `vscode-extension/src/webview/LookingGlassPanel.ts` | B (post-B25) |
| `[x]` | **Dispatch-table refactor — webview entry IIFE** (cyclomatic 232 → router < 5, ceiling 29). 988-line extension→webview switch replaced with `inboundHandlers: Record<string, InboundHandler>` (84 type keys, brace-balanced extraction so nested `if`s survived). `WebviewInboundMessage = { type: string } & Record<string, unknown>` lets existing `(message as Record<...>).foo as Foo` casts in handlers continue to work. | `vscode-extension/src/webview/app/lookingGlass.ts` | B (post-B25) |
| `[x]` | **Dispatch-table refactor — renderPhaseSignals** (cyclomatic 97 → orchestrator < 10). Split into `renderPreflightSignal` + `renderWhyMetrics` + `renderHowMetrics` + `renderPrCascade`. The orchestrator is a thin dispatcher; only `renderPrCascade` (45) is legitimately state-branchy (each PR state surfaces a different affordance). | `vscode-extension/src/webview/app/views/okrDetail.ts` | B (post-B25) |
| `[x]` | `market-research-agent`, `prd-agent`, `architect-reviewer`, `security-reviewer` `.agent.md` files (with **Tweedles** enforcement) | `vscode-extension/code-templates/agents-v4/<name>.agent.md` | B |
| `[ ]` | `code-design-agent` `.agent.md` (one cross-cutting agent — supersedes per-repo `design-agent`) | mesh template | D |
| `[ ]` | **`design/synthesis.md`** prompt pack — emits ONE cross-cutting code-design doc grounded on PRD + indexed code repos | `vscode-extension/prompt-packs/looking-glass/design/synthesis.md` (new) | D |
| `[ ]` | **`design/architecture-review.md`** prompt pack — CODE-grounded architect review (CALM drift + interface contract diffs against actual code) | `vscode-extension/prompt-packs/looking-glass/design/architecture-review.md` (new) | D |
| `[ ]` | **`design/security-review.md`** prompt pack — CODE-grounded security review (OWASP pattern scan + threat-model compliance against actual code) | `vscode-extension/prompt-packs/looking-glass/design/security-review.md` (new) | D |
| `[x]` | AgentDeploymentService — deploys agents + skills + retained workflows. `deploySkills` / `listDeployedSkills` (B-PR1) + `deployAgents` / `listDeployedAgents` (B-PR2). Refuses to deploy any agent declaring a Skill not in `MESH_SKILLS`. | `vscode-extension/src/services/AgentDeploymentService.ts` | B |
| `[~]` | `reviewer-bus.yml`, `okr-bus.yml`, `design-bus.yml` (incl. Tweedles segregation check + Pocket Watch gate) — all three buses shipped (okr-bus + reviewer-bus C-PR1; design-bus C-PR4); Pocket Watch + Caterpillar drift steps appended to reviewer-bus in C-PR5 | `vscode-extension/code-templates/workflows/<bus>.yml` | C |
| `[x]` | State-machine logic in `label-on-merge.yml` (round counter + tier-aware) — shipped as a NEW workflow `okr-state-machine.yml` to keep the legacy bus separate; round counter implemented via `round-N` labels on the PR; tier read from the OKR's latest action's frozen `governanceTier` (§6.2). | `vscode-extension/code-templates/workflows/okr-state-machine.yml` | C |
| `[x]` | HumanGate UI (Approve / Re-run / Reject + dual-signature override modal) — surfaces on Action card when latest action status is `human_gate` / `blocked`; Restricted tier requires two distinct approver handles via sequential native input boxes | `vscode-extension/src/webview/app/views/okrDetail.ts` (renderHumanGate) + `LookingGlassPanel.ts` (onHumanGate{Approve,Rerun,Reject}) | C |
| `[x]` | `Start Why` button (OKR detail) — creates issue with `okr-anchor` + `oraculum-research` labels and `<!-- okr_id: ... -->` body marker per §5.5.4; appends queued OkrAction with `governanceTier` frozen at run start | `vscode-extension/src/webview/LookingGlassPanel.ts` (onStartOkrPhase) + `okrDetail.ts` (renderStartButton) | B |
| `[x]` | `Start How` button — shares `onStartOkrPhase`; prerequisite-checks that Why has merged (server-side defense-in-depth on top of UI gating); refuses duplicate in-flight issues | `vscode-extension/src/webview/LookingGlassPanel.ts` + `okrDetail.ts` | B |
| `[x]` | `Start What` button + per-repo fan-out — button wired via parameterized `onStartOkrPhase('what')`; fan-out implemented in `design-bus.yml` (fires on code-design PR merge with governance-pass; opens one landing issue per `targetCodeRepos[]` entry) | OKR detail view + `design-bus.yml` | C |
| `[ ]` | `knowledge-reference-repos` Skill (clones + indexes curated reference repos) | mesh template | D |
| `[ ]` | Per-repo design reviser loop (reviewer-bus.yml runs on code repo PRs) | mesh template | D |
| `[ ]` | Hatter chain ladder tree visualization on OKR detail | OKR detail view | D |
| `[ ]` | `verify-chain` CLI surface in Looking Glass (validates hash chain, signature chain, intent thread continuity, tier compliance) | Looking Glass action + research-runner CLI | E |
| `[ ]` | End-to-end smoke (IMDB Lite OKR — Supervised path on Lite, Restricted-blocked path on Celebs) | docs/test | E |
| `[x]` | **Workshop curriculum touchpoints** map (which mesh artifact each workshop Part produces) | `site-tw/public/docs/workshop/agentic-sdlc-touchpoints.md` | A |
| `[s]` | ~~`oraculum-research.yml` workflow~~ | mesh template | superseded by Phase B agent path |
| `[s]` | ~~`archeologist.yml` workflow~~ | mesh template | superseded by search Skills + `market-research-agent` |
| `[s]` | ~~`prd.yml` workflow~~ | mesh template | superseded by prd-agent + okr-bus.yml |
| `[s]` | ~~`notify-code-repos.yml` workflow~~ | mesh template | superseded by design-bus.yml |

---

## 16. Future / out-of-scope

Capabilities the design **reserves for** — seams + extension points exist, threat model has them in scope — but they are explicitly outside the current implementation budget. Each is designed enough that adding it later doesn't require reshaping what's already shipped.

**Full spec → [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md).** Covers:

- §1 Archaeology research mode — code-grounded WHY phase (reuses Phase D's `knowledge-code` Skill)
- §2 Knight's Seal v2 — cosign / sigstore persistent signing (replaces v1's per-run ephemeral key with a transparency-log-anchored identity)
- §3 `verify-chain` CLI surface in Looking Glass (one-click chip + full-page replay log)
- §4 Audit Report Export bundle (Phase E generator work — spec already in §11.8)
- §5 Hatter chain ladder visualization (UI completion of the §11.6 chain-ladder writer's data; cross-ref Phase D D11)
- §6 Origin-story design folded forward (historical `docs/design/research-and-prd-agents.md` retirement record)
- §7 Foundry / self-hosted inference — **explicit non-goal**

---

## 17. What this is NOT

- **Not a full re-architecture of `research-runner`** — `audit-emitter.ts`, `hatters-tag-builder.ts`, and the search clients stay as the implementation. Skills are the agent-facing interface (PURE wrappers); the runner keeps its legacy CI-only path until Phase B is verified.
- **Not a custom MCP server** — uses built-in Copilot primitives (`.agent.md` + Skills). `redqueen-mcp` keeps its existing editor-side query scope.
- **Not human-out-of-the-loop.** Every phase produces a PR for human merge. Reviewers assist; they don't replace. Even on Autonomous tier, branch protection still requires a human merge action — the automation only enables the merge button.
- **Not vendor-locked.** Anthropic remains the fallback for research-runner LLM calls (synth is done by Copilot Coding Agent regardless). The `.agent.md` files don't specify a provider.
- **Not "every OKR uses every agent."** Smaller scopes can stop at Phase 1 or 2; the schema tolerates partial completion. An OKR that's purely research (Why only) is valid.
- **Not a code-generation pipeline.** The pipeline stops at the merged design.md per target repo. From there, code-coding agents (out of scope) implement against the merged designs in the code repos. The audit report bundle's traceability matrix names the PRs — what was *built* is verified by the code repo's own audit pipeline, not this one.
- **Not a custom-workflow framework.** v4 deprecates custom mesh workflows in favor of `.agent.md` + Skills + bus workflows. The Settings page "Mesh Provisioning" surface is for deploying agents/skills/buses, not authoring new workflows. If you need a one-off workflow, write a regular GitHub Action — don't extend the agent platform.
- **Not a replacement for the 6-phase SDLC.** The agentic pipeline IS the SDLC's Design → Implement boundary; Govern / Verify / Deploy / Evolve continue downstream of the merged designs.

---

## 18. Setup + ops

These are the install, secrets, cost, and failure-notification surfaces. Shovel-ready means a new org can stand the pipeline up from a clean install.

### 18.1 New-mesh bootstrap flow

A user opens Looking Glass with no mesh repo configured. The flow:

1. **Looking Glass detects** no `meshPath` in workspace state.
2. Shows a **bootstrap modal**:
   ```
   ┌─ Bootstrap your governance mesh ─────────────────────────────┐
   │  No mesh repo configured. Choose one:                         │
   │                                                                │
   │   ◉ Create a new mesh repo on GitHub                          │
   │      Org / user: [____________]  Repo name: [____________]    │
   │      ☑ Seed with IMDB-Lite sample (recommended for workshop)  │
   │                                                                │
   │   ○ Use an existing mesh repo                                 │
   │      Path or URL: [_______________________________________]   │
   │                                                                │
   │   ○ Open a sample mesh (read-only)                            │
   │      [IMDB-Lite sample mesh ▾]                                 │
   │                                                                │
   │                          [Cancel]    [Bootstrap]              │
   └───────────────────────────────────────────────────────────────┘
   ```
3. **On Bootstrap (new repo path):**
   - Uses the user's installed `gh` CLI (or prompts to install) to: `gh auth status` → confirm; `gh repo create <org>/<repo> --private --clone`.
   - Runs `MeshService.initializeMesh(<path>)` which writes the standard mesh structure: `platforms/`, `okrs/`, `threats/`, `controls/`, `bars/` (empty), `.caterpillar/prompts/`.
   - If IMDB-Lite checked: calls `scaffoldImdbLitePlatform()` + `scaffoldImdbLiteOkr()` (the sample seeded under Celebs, Restricted tier per §8.1).
   - Initial commit + push.
4. **On Bootstrap (existing path):** validates the path has a `platforms/` directory at the root; if not, offers `MeshService.initializeMesh()` upgrade.
5. **Looking Glass then prompts for Phase B+ setup** (if not already configured):
   - "Install the Maintainability AI GitHub App" (§18.2) — required to deploy agents/skills/workflows.
   - "Configure secrets" (§18.3) — required for research Skills + agent runs.

The bootstrap modal is also reachable from `Settings → Workspace → Re-bootstrap` (used when migrating between meshes).

### 18.2 GitHub App installation

The Maintainability AI GitHub App is the single trust boundary for cross-repo operations.

**Install flow:**

1. From Looking Glass `Settings → Mesh Provisioning → GitHub App` tab, the user clicks **`Install / Manage`**.
2. Looking Glass opens `https://github.com/apps/maintainabilityai/installations/new` in the system browser.
3. The user picks: (a) which org/account to install into; (b) which repos to grant access (the mesh repo + every code repo referenced in any OKR's `target_code_repos[]`).
4. After install, GitHub redirects to a Looking Glass deep link (`vscode://maintainabilityai.maintainabilityai/install-complete?installation_id=<id>`) that records the installation ID locally + as a `mesh-config.yaml` entry.
5. Looking Glass verifies App access by attempting a read on the mesh repo via the App's installation token. On success, the tab shows `✓ Installed — N repos in scope`.

**Per-OKR token issuance (Queen's Keyring).**

When a workflow needs to write to a target code repo (e.g., `design-bus.yml` fanning out), it requests an installation token scoped to ONLY:
- The target repo for this OKR
- Only `contents:read`, `issues:write`, `pull-requests:read` permissions
- 1-hour TTL (GitHub App tokens are short-lived by design)

This minimizes blast radius. Tokens are requested by the workflow at run time via the GitHub Actions OIDC-token-exchange flow (mediated by a minimal `queens-keyring.yml` reusable workflow we ship). Tokens never appear in logs, never persist past the run.

**Re-scope.** When a new OKR adds a code repo not currently in the App's scope, the Settings tab shows a yellow chip "Re-scope GitHub App for: `<org>/<repo>`" with a one-click link to the GitHub App's installation page filtered to the user's org.

**Why a GitHub App, not a PAT.** PATs are user-bound (rotate on offboarding, leak risk), all-or-nothing scoped, and rate-limited per user. Apps are org-bound, scoped per repo, rate-limited per installation, and produce attributable `actor: maintainabilityai[bot]` events in audit logs — which is what the Hatter's Tag `author_did` field references (`did:gh:installation:<id>/agent:<agent-name>`).

### 18.3 Secrets management

Three categories of secret, three different homes.

| Secret | Lives in | Read by | Why |
|---|---|---|---|
| `TAVILY_API_KEY` (research) | Mesh repo's GitHub Secrets (org-level if shared) | Tavily-search Skill at runtime via `${{ secrets.TAVILY_API_KEY }}` | Server-side API key; no user-machine access needed |
| `ANTHROPIC_API_KEY` (agent fallback) | Mesh repo's GitHub Secrets (org-level) | Anthropic client in `research-runner` legacy CI path; NOT needed for Copilot-driven agent path | Only used in fallback scenarios |
| `OPENAI_API_KEY` (Pocket Watch embeddings) | Mesh repo's GitHub Secrets (org-level) | `reviewer-bus.yml` for `text-embedding-3-small` calls | Embedding model for semantic-drift gate |
| Copilot license / GitHub auth | GitHub user's account (Copilot subscription, GitHub App install) | Agent assignment | Not a "secret" — auth state |
| `mesh-config.yaml` (installation IDs, paths) | Local workspace (`.vscode/maintainabilityai/`) — gitignored | Looking Glass | Per-user / per-machine state |

**No secrets in `okr.yaml` or any artifact.** Hatter's Tags reference secret-protected resources by ID (e.g., `model: claude-sonnet-4-6`) but never embed credentials.

**Secret rotation flow.** Looking Glass `Settings → Secrets & Models` tab shows last-rotated timestamps. Clicking `Rotate` for a secret opens the appropriate GitHub Settings page in the browser — Looking Glass doesn't mediate the rotation itself (trust boundary preserved). On detection of a 401/403 from a Skill, the OKR detail shows a banner with a direct link to rotate the relevant secret.

### 18.4 Cost surfacing — per-OKR rollup

Every Hatter's Tag has `inputTokens`, `outputTokens`, and `costUsd` (already emitted by `research-runner`'s LLM client; extended in Phase A to cover all agents).

**Where shown.**

- **OKR detail page** — small `$ Cost` chip on each Action card showing the run cost. Footer roll-up shows total OKR cost.
- **OKR list view** — optional "Cost" column (off by default; toggleable in `Settings → Display`).
- **Looking Glass `Settings → Usage` tab** (new in Phase B) — monthly cost across all OKRs, broken out by agent + by model.
- **Audit Report Export's README.md** — total cost for the OKR's lifetime.

**Cost cap enforcement.**

- Per-agent `max_tokens_per_run` in the `.agent.md` (§5.5).
- Per-OKR cap (optional): `okr.yaml.governance.max_cost_usd`. When reached, `okr-bus.yml` refuses new agent assignments and labels the OKR `cost-cap-reached`.
- Per-org monthly cap (Phase E+, configured in Settings → Usage). Mesh-wide. When reached, ALL `Start <phase>` buttons disable across all OKRs; the org admin gets a Looking Glass notification.

### 18.5 Failure notification — agent runs, workflows, sync errors

A user can have multiple OKRs running concurrently and isn't watching every screen. Failures need to surface even if the user is elsewhere.

**Three notification surfaces:**

1. **In-app banner** on Looking Glass header — yellow for warnings (skill retried successfully, slow runs), red for failures (agent stalled, workflow failed). Banner shows the OKR id + phase + reason; clicking deep-links to the relevant Action card. Persists until the user dismisses or the issue clears.
2. **VS Code notification** (`vscode.window.showWarningMessage` / `showErrorMessage`) for critical failures (mesh write failed, GitHub App auth revoked, cost cap reached). These pop the VS Code system notification.
3. **GitHub issue comment** on the OKR's anchor issue — `okr-bus.yml`'s watchdog (§5.5.7) posts agent-stall comments and other workflow-level failures. The issue's notification settings drive email/desktop notifications outside VS Code.

**Failure taxonomy** (each maps to one of the three surfaces):

| Failure | Surface | Severity | Action recovery |
|---|---|---|---|
| Skill retried successfully | (silent — audit-only) | info | — |
| Agent timeout | In-app banner + GitHub comment | error | `Re-run` from OKR detail |
| Skill terminal failure (e.g., missing API key) | In-app banner with `Open Setup` link | error | Open Setup tab, fix config, `Re-run` |
| Workflow run failure | GitHub Actions native notification + in-app banner | error | Inspect workflow logs; `Re-run` |
| Tweedles violation (no available reviewer DID) | In-app banner | warning | Org admin needs to add a second App installation OR add more user-DIDs to reviewer pool |
| Goal-drift detected | In-app banner + PR check-run failure | warning | Agent re-scopes OR HumanGate approval |
| GitHub App auth revoked | VS Code notification + Settings banner | critical | Re-install or re-authorize the App |
| Cost cap reached | VS Code notification + OKR banner + `cost-cap-reached` label | critical | Org admin raises cap OR user closes/archives older OKRs |
| Mesh repo unreachable | VS Code notification | critical | Network / git config issue; user investigates |

**Failure persistence.** All failure events also write CloudEvents to the appropriate audit JSONL (per §11.1.6), so they appear in the Audit Report Export's README under "Notable events during this OKR's lifetime." A failed-then-recovered run is fully reconstructible.

---

*Last updated 2026-05-19 (v4.2 — shovel-ready gap closure: issue/label vocabulary, agent runtime contract, workflow permissions matrix, UX state matrix, Restricted-tier flows, Hatter Tag canonical location, intent_thread_uuid lifecycle, setup + ops). v4.1 split PRD vs Code Design; v4 introduced the OKR-driven trigger model + UI + Audit Report Export + phase tracking. This is a design document AND a live tracking surface — §13 and §15 update inline as work lands.*
