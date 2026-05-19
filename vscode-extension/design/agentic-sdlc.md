# Agentic SDLC — Design

End-to-end agent-orchestrated pipeline from **market research → PRD → design → review**, grounded in the governance mesh (CALM, threat models, ADRs, prior research), with full auditable provenance, surfaced and steered through Looking Glass.

This is the integration design across pieces we already ship (research-runner data collection, Oraculum panel, mesh artifacts) and pieces we still need to build (custom Copilot agents, Skills, OKR section, expert sub-agents, designer agent).

---

## 1. Why this design

Today (post-Phase-7) we have:

- **Research-runner** (data collection only) — runs in CI, produces an issue comment with ranked sources, JTBD/gap analysis, and mesh context.
- **Oraculum panel** — drives assignment (`@claude` / `@copilot`) on `oraculum-research` or `oraculum-review` issues.
- **Synthesis** is done by the assigned coding agent reading `.caterpillar/prompts/research/synthesis.md`.
- **PRD agent** still lives in the research-runner but only as a single-LLM-call pipeline.
- **No design agent.** No expert/reviewer agents. No skills.
- **Audit chain** is per-runner (hash-chained JSONL) but breaks across agent hops.

The user's ask is to evolve this into a **multi-agent pipeline** where:

1. **Market-research agent** uses Skills (Tavily, USPTO, arXiv, HN) and loops on gaps it finds itself.
2. **PRD agent** uses **expert sub-agents** (Architect, Security) grounded in mesh artifacts (CALM, threat models, ADRs) to ground requirements.
3. **Designer agent** uses experts + reference repos + PRD + mesh + code to produce a code-grounded design.
4. **Reviewers** (Architect, Security) score each agent's output for governance compliance.
5. **OKR section** in Looking Glass anchors the pipeline: each OKR has a **Why** (market research), a **How** (PRD), and a **What** (design), each named, source-controlled, and audited.
6. **Audit events** capture what was searched, what was synthesized, what was decided, by whom, with hash-chained provenance across hops.

The reference for personas / prompt structure is the [NCMS plugin](https://github.com/AliceNN-ucdenver/ncms/tree/main/packages/nvidia-nat-ncms/src/nat/plugins/ncms) — which already encodes Architect / Security expert prompts, PRD certificate format, design certificate format, and the archeologist-style synthesis pipeline.

---

## 2. Research findings — GitHub's agent primitives

The user pointed at three awesome-copilot learning hub pages. Honest summary of what each primitive gives us and what it doesn't:

### 2.1 Custom Copilot Agents

- **File format**: Markdown with YAML frontmatter. Filename `.agent.md`. Location: `.github/agents/`.
- **Frontmatter**: `name`, `description` (required, 10–1024 chars), `model`, `tools: [array]`.
- **Invocation**: `@copilot use the <agent-name> agent to <task>` in a comment. Also fires on issue assignment (default agent).
- **Hosting**: cloud-hosted by GitHub when assignment fires (isolated VM, single PR output).
- **Restrictions**: agent works on its own branch, can't merge or deploy, can't access local machine, can't push to main. Always produces a PR for human review.
- ⚠ **The docs are silent on whether one agent can directly invoke another agent.** Custom agents can be NAMED in mentions, but there is no documented "sub-agent" primitive. We treat agent-to-agent invocation as **NOT first-class** and design around it.

### 2.2 Skills

- **File format**: A folder containing `SKILL.md` (YAML frontmatter: `name`, `description`) plus optional `references/`, `templates/`, `scripts/`.
- **Discovery**: explicit (`/skill-name args`) or **automatic** ("agents can also discover and invoke skills automatically based on the skill's description and the user's intent").
- **Composition**: skills can be chained in one message (`/skill-a do X; /skill-b do Y`). Skills can shell-out to bundled scripts (Python, bash, Node).
- **What this means for us**: Skills are the right primitive for "I need this agent to call my Tavily/USPTO/arXiv/CALM-lookup script." Skills are also the right primitive for the **knowledge agent** pattern — a Skill that reads mesh-stored documents and returns ground truth.

### 2.3 Copilot Coding Agent

- **Invocation**: issue assignment, `@copilot` mention, or remote-control CLI session.
- **Output**: always a PR; iterates via comments on the PR.
- **Auditability built-in**: PR has change description + file-by-file summaries + issue back-reference. The `sessionStart` / `sessionEnd` hooks allow custom logging for governance ("Log the start of autonomous sessions for governance").

### 2.4 What this implies for our composition pattern

Direct agent-to-agent calls aren't first-class. So we compose at three layers:

1. **Skills layer** — the workhorse for tool calls (search APIs) and knowledge lookups (CALM, threats, prior research). Skills auto-discover by description; agents will invoke them naturally.
2. **Workflow orchestration layer** — GitHub Actions workflows route between agents: workflow A produces output → labels issue / opens PR → next workflow fires next agent.
3. **Explicit hand-off via comment** — Agent A's final action is to leave a comment mentioning `@copilot use the @prd-agent agent` (or trigger a workflow that does it). This is "in-channel" agent-to-agent without API-level support.

**The expert "Architect" / "Security" personas are NOT separate agent calls inside the PRD or design agent's session.** They run as **review steps** — separate agent assignments on the same PR, OR as Skills the parent agent invokes for grounded answers from mesh artifacts. NCMS does the latter via inline `{architect_input}` / `{security_input}` placeholders that the *orchestrator* fills in, not the LLM.

---

## 3. Architecture — the pipeline

### 3.1 High-level flow

```
        ┌─────────────────────────────────────────────────────────────┐
        │                Looking Glass — Portfolio                     │
        │  ┌────────────┐ ┌────────────┐ ┌─────────┐ ┌────────────┐ │
        │  │  Business  │ │ Applications│ │ Policies│ │   OKRs     │ │
        │  │            │ │             │ │         │ │ (new ⭐)    │ │
        │  └────────────┘ └────────────┘ └─────────┘ └─────┬──────┘ │
        └──────────────────────────────────────────────────│─────────┘
                                                           │
            ┌──────────────────────────────────────────────┘
            ▼
   ┌──────────────────┐
   │      OKR         │ — anchors one end-to-end pipeline
   │ • Objective      │
   │ • Why  (research)│──┐
   │ • How  (PRD)     │  │  Each section is a named, source-
   │ • What (design)  │  │  controlled artifact + audit chain.
   └──────────────────┘  │
                         │
                         ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Phase 1 — Market Research (the WHY)                              │
   │                                                                    │
   │   Looking Glass: "New OKR" → "Add Why"                             │
   │      ↓ (creates research-request issue)                            │
   │   archeologist.yml fires (research-runner data-collection mode)    │
   │      ↓ uses Skills: tavily, arxiv, uspto, hackernews              │
   │   Posts structured comment + applies oraculum-research label       │
   │      ↓                                                             │
   │   User assigns @copilot in Oraculum panel                          │
   │      ↓ (Copilot reads synthesis.md spec, uses CALM Skill,         │
   │         Threat Skill, ADR Skill to ground claims)                  │
   │   Opens synthesis PR — "research-synthesis" label                  │
   │      ↓ Reviewer agents (Architect, Security) score it             │
   │   Merge → research-doc lands in mesh; OKR.why is satisfied         │
   └──────────────────────────────────────────────────────────────────┘
                         │
                         ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Phase 2 — PRD (the HOW)                                          │
   │                                                                    │
   │   Looking Glass: OKR shows "Why ✓ → Generate How (PRD)"            │
   │      ↓ (creates prd-request issue, manifest carries research-PR)   │
   │   prd-agent (custom Copilot agent) fires on assignment             │
   │      ↓ uses Skills: knowledge-mesh (read CALM/threats/ADRs),       │
   │         knowledge-research (read merged research-doc),             │
   │         knowledge-code (clone + analyze impacted repos)            │
   │   Opens PRD PR with traced FR/SR + manifest                        │
   │      ↓ Architect + Security expert agents review                  │
   │   Merge → PRD lands; OKR.how is satisfied; per-repo issues open    │
   └──────────────────────────────────────────────────────────────────┘
                         │
                         ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Phase 3 — Design (the WHAT)                                      │
   │                                                                    │
   │   Looking Glass: OKR shows "How ✓ → Generate What (Design)"        │
   │      ↓                                                             │
   │   design-agent on each per-repo landing issue                      │
   │      ↓ uses Skills: knowledge-mesh, knowledge-prd, knowledge-code, │
   │         reference-repos                                            │
   │   Opens Design PR per repo                                         │
   │      ↓ Reviser loop with Architect + Security agents              │
   │   Merge → design.md lands in code repo + Hatter tag               │
   └──────────────────────────────────────────────────────────────────┘
```

### 3.2 Audit continuity

Each phase produces an artifact with a **Hatter Tag** footer (yaml block) carrying:

- `run_id`, `mesh_sha`, `prompt_library_version`, `agent_version`, `published_at`
- `llm` block (provider, model, tokens, cost)
- `guardrails` block (mode, blocks, warns)
- `audit` block (event_count, chain_root_hash, audit_log_path)
- **NEW: `parent_run_id`** linking to the upstream artifact (research-doc → PRD → design)

The Hatter Tag becomes the cross-agent provenance lineage. A reviewer auditing a design can walk **design.md → PRD.md → research-doc.md → archeologist run** by following `parent_run_id` references.

Every agent leaves an `audit-jsonl` event in `.research-audit/<run-id>.jsonl` with:

```
{
  "phase": "research|prd|design|review",
  "agent": "archeologist|market-research|prd-agent|design-agent|architect-reviewer|security-reviewer",
  "skill_calls": ["tavily.search", "uspto.search", "knowledge-mesh.read-bar"],
  "input_artifacts": [{ "kind": "research-doc", "run_id": "...", "sha": "..." }],
  "output_artifact": { "path": "...", "sha256": "..." },
  "duration_ms": 12345,
  "llm": { "provider": "...", "model": "...", "input_tokens": 0, "output_tokens": 0 },
  "guardrail_blocks": 0,
  "guardrail_warns": 0
}
```

Hash-chained the same way `audit-emitter.ts` already does for the research-runner. The chain breaks at workflow boundaries (different runs), but Hatter Tag `parent_run_id` stitches them.

---

## 4. The OKR section in Looking Glass

New top-level Portfolio surface alongside Business / Applications / Policies. Mesh layout:

```
.governance-mesh/
  okrs/
    Q1-2026-celeb-data-licensing/
      okr.yaml               # the Objective + Key Results metadata
      why/
        research-doc.md      # produced by Phase 1
        manifest.yaml        # which mesh BARs are in scope, run_id, links
      how/
        prd.md               # produced by Phase 2
        per-repo-issues.yaml # which code repos got landing-issues
      what/
        designs/
          <repo-1>/design.md # produced by Phase 3 per impacted repo
          <repo-2>/design.md
      audit/
        chain-roots.yaml     # parent_run_id ladder across phases
```

### `okr.yaml` schema (draft)

```yaml
id: OKR-2026Q1-001
title: Add celebrity profile API to IMDB-Lite
owner: shawnmccarthy
status: draft | researching | prd-pending | design-pending | building | shipped | archived

objective: >
  Enable IMDB-Lite to surface enriched celebrity profile data without
  introducing identity-disambiguation or licensing risk.

key_results:
  - id: KR-1
    metric: identity-disambiguation false-merge rate
    target: < 0.5%
    measurement: "production telemetry: post-launch wk2"
  - id: KR-2
    metric: licensing-compliance audit pass rate
    target: 100%
    measurement: "legal review checklist at GA"

scope:
  platform_id: PLT-IMDB-LITE
  bar_ids: [APP-IMDB-001, APP-IMDB-002]

why:
  research_doc: why/research-doc.md
  run_id: RES-2026-05-19-...
  hatter_chain_root: <sha256>

how:
  prd_doc: how/prd.md
  run_id: PRD-2026-05-19-...
  hatter_chain_root: <sha256>
  parent_run_id: RES-2026-05-19-...

what:
  designs:
    - repo: alicenn-ucdenver/celeb-api
      path: what/designs/celeb-api/design.md
      run_id: DSG-2026-05-19-...
      hatter_chain_root: <sha256>
      parent_run_id: PRD-2026-05-19-...
```

### Looking Glass UI surfaces

- **Portfolio view** — add OKR tile alongside the three existing.
- **OKR list view** — table with columns: Objective / Owner / Status / Phase Progress (Why ✓ / How ⏳ / What ☐) / Last Activity.
- **OKR detail view** — three vertically-stacked phase cards:
  - Why card: link to research-doc, "Start research" button if empty (creates research-request issue), audit chain summary.
  - How card: link to PRD, "Generate PRD" button (gated on Why ✓), audit chain summary.
  - What card: list of per-repo designs, "Generate design" buttons, audit chain summary.
- **Audit ribbon** — Hatter chain visualisation: hover shows full provenance ladder, click jumps to source artifacts in the mesh.

---

## 5. Agents — personas (adapted from NCMS)

Each agent below is implemented as a `.agent.md` file in the mesh's `.github/agents/` directory (deployed by `provisionWorkflow`).

| Agent | NCMS reference | Triggered by | Output |
|---|---|---|---|
| **market-research-agent** | `archeologist_prompts.py` (synthesis flow) | `oraculum-research` label + `@copilot` comment | PR: `research-doc.md` |
| **prd-agent** | `prd_prompts.py` | `oraculum-prd` label + `@copilot` mention | PR: `prd.md` + manifest |
| **design-agent** | `design_prompts.py` | `oraculum-design` label on per-repo landing issue | PR per impacted code repo: `design.md` |
| **architect-expert** | `expert_prompts.py` (Architect persona) | Skill invocation by parent agent | Inline answer with `SCORE/SEVERITY/COVERED/MISSING/CHANGES` certificate |
| **security-expert** | `expert_prompts.py` (Security persona) | Skill invocation by parent agent | Same certificate format, OWASP/NIST IDs |
| **architect-reviewer** | `expert_prompts.py` (Architect review) | Auto-runs on each artifact PR | PR review comment with scored certificate |
| **security-reviewer** | `expert_prompts.py` (Security review) | Auto-runs on each artifact PR | PR review comment with scored certificate |

### Important note about Architect / Security as "experts" vs "reviewers"

NCMS has both:

- **Expert agent** (Q&A mode): grounded knowledge source — "given my draft PRD, what architecture concerns should I address?" Returns guidance.
- **Reviewer agent** (scoring mode): grades a finished artifact against ADRs/threats/standards. Returns a certificate.

Because direct agent-to-agent calls aren't first-class on GitHub-hosted Copilot, **the "expert" mode runs as a Skill, not a separate agent**. The Skill bundles the expert prompt + reads relevant mesh files + posts the grounded answer back into the parent agent's context.

**The "reviewer" mode runs as a separate agent assignment on the PR.** Two reviewer agents fire in parallel on each phase's PR; both must pass thresholds before the PR can merge.

---

## 6. Skills — the workhorse layer

Skills live in `.github/skills/` in the mesh repo, deployed via `provisionWorkflow`. Each is a folder with `SKILL.md` + `scripts/` + `references/`.

### 6.1 Search Skills (the "market-research" skill bundle)

| Skill | Script | Returns |
|---|---|---|
| `tavily-search` | `scripts/tavily.sh` (wraps Tavily API) | JSON: top-N results, ranked by topical relevance |
| `arxiv-search` | `scripts/arxiv.sh` | JSON: technical-concept papers, with abstracts |
| `uspto-search` | `scripts/uspto.sh` (two-stage: search + abstract fetch) | JSON: patent metadata + abstracts |
| `hackernews-search` | `scripts/hn.sh` | JSON: HN Algolia results with Show-HN/Ask-HN bodies |

These are 1-to-1 with the search backends `research-runner` already calls. We migrate the logic from TypeScript clients into shell scripts (or Node CLIs the Skill can shell into). The market-research agent invokes these by **automatic discovery**: the SKILL.md description says "use this to find current information about X via Y" and the LLM picks it.

### 6.2 Knowledge Skills (read-from-mesh)

| Skill | Purpose | Backed by |
|---|---|---|
| `knowledge-mesh-bar` | "What CALM model + threats + ADRs does BAR `<id>` have?" | Reads `platforms/<p>/bars/<id>/` |
| `knowledge-mesh-platform` | "What is the CALM platform architecture for `<id>`?" | Reads `platforms/<p>/` |
| `knowledge-mesh-threats` | "What threats from the threat-model library map to this concern?" | Reads `threats/` library |
| `knowledge-mesh-adrs` | "Are there ADRs about `<concern>`?" | Greps `.../architecture/ADRs/*.md` |
| `knowledge-research` | "What did the research phase find about `<topic>`?" | Reads merged `research/*.md` |
| `knowledge-prd` | "What did the PRD specify for `<FR-ID>`?" | Reads merged `prds/*.md` |
| `knowledge-code` | "What is the current structure of repo `<owner/name>`?" | Clones + indexes the code repo |
| `knowledge-reference-repos` | "What patterns exist in our reference repos?" | Greps `reference-repos/` |

Knowledge Skills are read-only and idempotent. They're the substitute for direct agent-to-agent calls — the parent agent gets the grounded answer it would have gotten from a sub-agent.

### 6.3 Audit Skill

| Skill | Purpose |
|---|---|
| `audit-emit-event` | Writes one event to `.research-audit/<run-id>.jsonl`, computes hash chain, returns the new chain head |

Every agent calls this at each meaningful step. Implementation reuses `research-runner`'s `audit-emitter.ts` logic. The Hatter Tag at the end of each artifact is the published summary of the chain.

### 6.4 Expert Skills

| Skill | Purpose |
|---|---|
| `architect-expert` | Grounded answer to "what architecture concerns apply here?" — bundles `expert_prompts.py` Architect persona + reads mesh CALM/ADRs |
| `security-expert` | Grounded answer to "what security concerns apply here?" — bundles Security persona + reads mesh threats/controls + STRIDE/OWASP/NIST references |

These Skills wrap a small LLM call (cheap tier, structured-output) with the right context bundled in. The parent agent (PRD-agent, design-agent) calls these mid-session to ground its requirements/design decisions.

---

## 7. Orchestration — wiring it together

Workflows route between agents using existing label-driven patterns:

```
research-request label  → archeologist.yml (data collection only)
oraculum-research label → user assigns @copilot in Oraculum panel
                          oraculum-research.yml (Claude path)
                          OR Copilot Coding Agent (assignment path)
                          → market-research-agent produces research-doc PR

research-doc PR merged  → label-on-merge.yml fires "okr-why-complete"
                          → updates okr.yaml.why.run_id + hatter_chain_root

oraculum-prd label      → user clicks "Generate PRD" in Looking Glass
                          → opens prd-request issue, assigns Copilot
                          → prd-agent uses knowledge-* Skills
                          → opens PRD PR

PRD PR merged           → label-on-merge.yml fires "okr-how-complete"
                          → opens per-repo design-request issues
                          → updates okr.yaml.how

oraculum-design label   → assignment fires design-agent in each code repo
                          → opens design PR
                          → architect-reviewer + security-reviewer
                          → updates okr.yaml.what
```

### 7.1 Workflows we add

- **`okr-bus.yml`** — fires on PR merges, updates `okrs/<id>/okr.yaml` with new chain head + phase progress, posts summary comment on the OKR's anchor issue.
- **`design-bus.yml`** — fires when PRD is merged, fan-outs per-repo design-request issues with the PRD manifest's `target_repos`.
- **`reviewer-bus.yml`** — fires on each artifact PR (research/prd/design), assigns the two reviewer agents in parallel, gates merge on both passing thresholds.

### 7.2 Workflows we extend

- **`archeologist.yml`** — already exists; gains an OKR-context input so the data-collection comment links back to the OKR.
- **`label-on-merge.yml`** — already exists; gains the OKR-status-update logic.
- **`notify-code-repos.yml`** — already exists; becomes the design-bus fan-out target.

---

## 8. Auditable events — what we capture

Per phase, the agent **must** emit:

### Phase 1 — Market Research

- `event: skill_call`, `skill: tavily-search`, `query: <q>`, `result_count: <n>`, `top_score: <s>`
- One event per Skill invocation (tavily/arxiv/uspto/hn)
- `event: dedupe_and_rank`, `raw: 51, ranked: 20, per_provider: {...}`
- `event: gap_analysis`, `signals: [topic_uncovered]`, `follow_up_queries: 3`
- `event: synthesis`, `provider: openai|anthropic`, `model: ...`, `tokens: in/out`, `cost: $`, `output_path: research/<run-id>/research-doc.md`, `chain_root_hash: <sha>`

### Phase 2 — PRD

- `event: skill_call`, `skill: knowledge-mesh-bar`, `bar_id: APP-IMDB-001`
- `event: skill_call`, `skill: knowledge-code`, `repo: owner/name`
- `event: skill_call`, `skill: architect-expert`, `query: ...`, `score: HIGH`
- `event: skill_call`, `skill: security-expert`, `query: ...`, `threats: [...]`
- `event: prd_synthesis`, ..., `parent_run_id: <research run id>`
- `event: review_received`, `reviewer: architect`, `score: 82`, `severity: medium`

### Phase 3 — Design

- Same shape, with `parent_run_id` pointing at PRD

### Cross-cutting

- All events are appended to `.research-audit/<run-id>.jsonl`, hash-chained.
- Hatter Tag in each artifact's footer publishes the chain root + parent_run_id.
- The Audit Skill enforces the schema and writes the chain.

---

## 9. Looking Glass integration

### 9.1 New panels and screens

- **OKR tile** in Portfolio view (alongside Business / Applications / Policies).
- **OKR list view** — table of all OKRs across the org with phase progress.
- **OKR detail view** — three phase cards (Why / How / What), each with:
  - Status badge
  - Link to the merged artifact (research-doc / PRD / design)
  - "Start <phase>" or "Re-run <phase>" button (gated on previous phase completion)
  - Hatter chain summary (run_id, parent_run_id, agent_version)
  - Audit timeline (skill calls, expert reviews, scores)

### 9.2 Cleanups required

- **"Promote to research-request" in Oraculum**: today this is a one-off button on each finding. With the OKR model, research is anchored to an OKR. Replace with **"Create OKR from finding"** which:
  1. Creates an OKR draft in `okrs/<id>/okr.yaml` with `why` populated by the user's Oraculum finding.
  2. Opens the research-request issue tied to that OKR.
- **Assign Agent screen**: cleanup the hardcoded prompt; show kind-routed copy (already partially done; needs to add the OKR ID to the comment context so the agent knows which OKR's `why/` to write to).
- **Active Runs panel**: should list runs per OKR, not just per BAR.

### 9.3 New Looking Glass services

- **OKRService** — read/write `okrs/*.yaml`, update chain-root references, compute phase progress, generate the audit ribbon HTML.
- **AgentDeploymentService** — extends `provisionWorkflow` to also seed `.github/agents/*.agent.md` and `.github/skills/<skill>/SKILL.md` files into the mesh.

---

## 10. Implementation plan — phased

### Phase A — Foundation (2 weeks)

- OKRService + `okrs/*.yaml` schema + mesh seeding
- OKR tile + list view + detail view (Why/How/What cards, no buttons)
- Hatter Tag schema extension (`parent_run_id`)
- Audit event schema extension (`phase`, `skill_calls`, `parent_run_id`)
- Cleanup: replace "Promote to research-request" with "Create OKR from finding"

### Phase B — Custom Agents + Skills (3 weeks)

- Seed `.github/agents/*.agent.md` for: market-research-agent, prd-agent, design-agent
- Seed `.github/agents/*.agent.md` for: architect-reviewer, security-reviewer
- Build Skills: tavily, arxiv, uspto, hackernews, knowledge-mesh-*, audit-emit-event
- Build expert Skills: architect-expert, security-expert
- Workflow: reviewer-bus.yml (auto-runs reviewers on PRs)
- Looking Glass: wire the "Start research" / "Generate PRD" / "Generate design" buttons

### Phase C — Pipeline integration (2 weeks)

- okr-bus.yml + design-bus.yml workflows
- label-on-merge.yml extensions
- Migrate research-runner archeologist logic into Skills (deprecate the standalone CLI for the runner-only pipeline; keep the Skills as the new source of truth)
- Migrate research-runner PRD logic into prd-agent + Skills
- Add gap-loop to market-research-agent (when it detects a coverage gap, fires more search Skills automatically)

### Phase D — Designer + reviewer loop (3 weeks)

- design-agent operating on per-repo issues
- reference-repos Skill (clone + index reference repos for pattern reuse)
- Reviser loop: design-agent ↔ architect-reviewer ↔ security-reviewer until score ≥ threshold
- Hatter chain ladder visualization in Looking Glass

### Phase E — Hardening (1 week)

- End-to-end smoke test on a real BAR
- Audit chain verification CLI
- Documentation for the team

---

## 11. Open questions & risks

### 11.1 GitHub primitives

- **Agent-to-agent**: confirmed NOT first-class. Our workaround (Skills + workflow orchestration) works but means the parent agent can't call a sub-agent synchronously and wait for a structured response. The "expert" pattern becomes a Skill, which is a Skill-LLM-call, not a sub-agent invocation. Same compositional power, different API shape.
- **Skill invocation budget**: unclear if there's a per-agent-turn Skill-call limit. May need to test in practice. If hard limited, we may need to batch knowledge calls.
- **Cross-repo design-agent execution**: the design-agent needs to write into a code repo, but it's invoked from the mesh repo's issue. We use the `notify-code-repos.yml` pattern (already shipped) — design-agent gets fired on a landing-issue in the *code* repo, not the mesh.

### 11.2 NCMS adaptation

- NCMS's PRD/design prompts use **inline placeholders** (`{architect_input}`, `{security_input}`) that the Python orchestrator fills in. On GitHub-hosted Copilot we don't have that orchestrator — the LLM must call Skills itself. **Risk**: the LLM may forget to call the expert Skills if the prompt is loose. **Mitigation**: the agent's system prompt explicitly enumerates which Skills MUST be called and in what order. We may also gate the PR via a structural check: if PRD doesn't have `E1` / `E2` references it's rejected on review.
- NCMS's reviser loop uses an external loop. On Copilot Coding Agent, the loop is in the PR comment cycle (reviewer comments → agent revises). **Risk**: agent may not revise on negative feedback. **Mitigation**: explicit comment template + a `revision-required` label the reviewer applies; the agent's prompt says "if `revision-required` label is present, you MUST address the linked comments before re-pushing."

### 11.3 Audit chain integrity

- **Hash-chain across workflows**: each workflow run starts a new audit chain. Cross-run continuity is via Hatter Tag `parent_run_id`, not the hash chain itself. The chain root is verifiable per-run; the ladder is verifiable via the audit yaml at `okrs/<id>/audit/chain-roots.yaml`.
- **Tampering surface**: if someone hand-edits a merged research-doc.md, the Hatter Tag's chain_root_hash will no longer match the audit JSONL. The "verify chain" CLI (already exists in `audit-emitter.ts`) should be invocable from Looking Glass to flag tampering.

### 11.4 Cost

- Each phase fires multiple LLM calls (parent agent + Skill calls for expert + multiple knowledge Skills). Estimate per OKR: 30–50 LLM calls.
- Skill calls are typically small (200–1000 tokens). Parent-agent synthesis is larger (5–15K tokens).
- Total per OKR: ~$1–3 on Claude Sonnet, ~$0.10–0.30 on github-models (custom tier).
- **Mitigation**: cache knowledge Skill responses per-run (a mesh CALM hasn't changed across one agent's session); cap parallel agent execution (one OKR moving through phases at a time per platform).

### 11.5 Failure modes

- **Agent forgets to call expert Skills** → PRD/design ungrounded. Detected by reviewers (look for `E1` references); merge blocked.
- **Reviewer agent scores too leniently** → ungrounded artifacts merge. Mitigation: human-in-the-loop on PRDs at first; soften only after reviewer calibration is verified.
- **Skill timeout** → agent must handle gracefully. Skills must declare timeout in `SKILL.md` and return a structured `{ ok: false, reason }` on failure that the parent can fallback on.

---

## 12. Single deliverables map (so this isn't just talk)

| Deliverable | Location | Phase |
|---|---|---|
| `okrs/<id>/okr.yaml` schema + Zod type | `vscode-extension/src/types/okr.ts` | A |
| OKRService | `vscode-extension/src/services/OKRService.ts` | A |
| OKR tile / list / detail views | `vscode-extension/src/webview/app/views/okr*.ts` | A |
| Hatter Tag extension | `packages/research-runner/src/runner/hatters-tag-builder.ts` | A |
| `.github/agents/market-research-agent.agent.md` | mesh template | B |
| `.github/agents/prd-agent.agent.md` | mesh template | B |
| `.github/agents/design-agent.agent.md` | mesh template | B (D) |
| `.github/agents/architect-reviewer.agent.md` | mesh template | B |
| `.github/agents/security-reviewer.agent.md` | mesh template | B |
| `.github/skills/tavily-search/SKILL.md` + scripts | mesh template | B |
| `.github/skills/arxiv-search/`, `uspto-search/`, `hackernews-search/` | mesh template | B |
| `.github/skills/knowledge-mesh-bar/`, `-platform/`, `-threats/`, `-adrs/` | mesh template | B |
| `.github/skills/knowledge-research/`, `knowledge-prd/`, `knowledge-code/` | mesh template | B (D) |
| `.github/skills/architect-expert/`, `security-expert/` | mesh template | B |
| `.github/skills/audit-emit-event/` | mesh template | B |
| `.github/workflows/reviewer-bus.yml`, `okr-bus.yml`, `design-bus.yml` | mesh template | C |
| Cleanup: "Promote to research-request" → "Create OKR from finding" | `OracularPanel.ts` | A |
| Cleanup: Assign Agent panel adds OKR context | `OracularPanel.ts` | A |
| Active Runs panel groups by OKR | `ActiveRunsPanel.ts` | A |

---

## 13. What this is NOT

- Not a full re-architecture of the research-runner — we keep the existing data-collection pipeline. We move SYNTHESIS into the agent (already done) and ADD the PRD and design agents on top.
- Not a custom MCP server — we use built-in GitHub primitives (custom agents, Skills, Copilot Coding Agent) where possible; the existing redqueen-mcp server stays for editor-side queries.
- Not a replacement for human review — every phase still produces a PR that a human merges. Reviewers are agents that **assist** the human, not replace them.
- Not vendor-locked — Anthropic remains the fallback model for both plan and synth (already wired via llm-router); the agent prompts run on whatever model the Copilot Coding Agent serves.

---

*Last updated 2026-05-19. This is a design document, not a commitment to ship every phase. Phases A and B are the highest-value first deliverables; C and D follow once the foundation is exercised in real OKRs.*
