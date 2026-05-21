# Agentic SDLC Touchpoints

<div class="docs-workshop-hero docs-workshop-indigo">
  <div class="docs-workshop-number">+</div>
  <div>
    <div class="docs-card-kicker">Workshop reference · Curriculum to mesh-artifact map</div>
    <h2 class="docs-workshop-title">Where each workshop part touches the agentic SDLC</h2>
    <p class="docs-workshop-subtitle">Eight workshop parts. One mesh repo. Every part lays down a specific artifact the agentic SDLC pipeline needs.</p>
  </div>
  <div class="docs-workshop-meta">
    <strong class="docs-strong">Duration:</strong> Reference doc · 8 min read<br/>
    <strong class="docs-strong">Prerequisites:</strong> None. Open this alongside any workshop part.<br/>
    <strong class="docs-strong">Related:</strong> <a href="/docs/agentic-sdlc-governance" class="markdown-link">Vision</a> · <a href="/docs/hatters-tea-party" class="markdown-link">Hatter's Tea Party</a> · <a href="/docs/red-queens-court" class="markdown-link">Red Queen's Court</a><br/>
    <strong class="docs-strong">Status:</strong> Phase A · scaffold + read-only OKR surface live; Phase B+ wires the agents.
  </div>
</div>

> The 8-part workshop and the agentic SDLC governance feature share one mesh. Each workshop part scaffolds, edits, or scores a specific artifact under that mesh. This page is the index that says **"after Part N, your mesh has X — and X is what the agentic pipeline reads at runtime."**

---

## The mesh, after each workshop part

| Workshop part | Mesh artifact landed | What the agentic pipeline does with it |
|---|---|---|
| **Part 1 · The Rabbit Hole** | None on disk. Mental model only: vibe → AI-assisted → agentic tier system. | The `governance_tier` field stamped on every Hatter's Tag (autonomous / supervised / restricted) is this concept made deterministic. |
| **Part 2 · Cheshire's Prompt Pack** | `.cheshire/prompts/` populated with the OWASP packs in the code repo; `.caterpillar/prompts/` populated in the mesh repo. | Every OKR phase reads from `.caterpillar/prompts/`. The `prd-agent` cites `prd/synthesis.md` + `prd/ask-experts.md` directly from there. |
| **Part 3 · Alice Remediates (A03 fix)** | An ADR documenting the parameterized-query fix; a passing test suite; a labeled PR. | The PRD agent's `context-security` Skill walks the BAR's ADR list — this ADR becomes evidence the agent can cite when the next OKR touches the same module. |
| **Part 4 · The Looking Glass Measures (fitness functions)** | `architecture/fitness-functions.yaml` per BAR; the score history JSON. | `OKRService.tierFor()` reads each affected BAR's pillar score (which the fitness functions feed) and derives `governance_tier`. Phase A: this drives the tier badge on the OKR list view. |
| **Part 5 · Caterpillar's Challenge (security pipeline)** | CodeQL + Snyk workflows in the code repo; SARIF triage artifacts in `governance/`. | The security pipeline's SARIF feeds the Security pillar score. That pillar score drives the tier (§6.2). A celeb-api with no CodeQL stays Restricted in Phase A onwards. |
| **Part 6 · The Hatter's Library (versioned prompts)** | `prompt-pack.lock.yaml` pinning every `.caterpillar/prompts/*` version + SHA. | Every Hatter's Tag stamps `author_prompt_pack_version` + `author_system_prompt_sha` (§11.1). The lock file is the source of truth those stamps point at. |
| **Part 7 · The Red Queen's Court (deterministic enforcement)** | `.claude/settings.json` hooks + MCP `validate_action` wiring in the code repo. | The Red Queen governs the **coding agents** that run downstream of the Hatter's `What` phase (the per-repo fan-out targets). Same CALM model; same tier; different governance modality. |
| **Part 8 · Through the Looking Glass (capstone)** | One full project: research doc + PRD + designs + audit log + Hatter's Tag, anchored at one `project_id`. | This IS an Audit Report Export (§11.8) preview, hand-built. Phase E ships the one-click bundle that automates exactly this evidence chain. The audit log is built by the runtime (B28 Court Recorder Auto-Logging, §11.6), not by the agent — learners get a tamper-evident, deterministically-emitted record on every workshop run, not a self-report that depends on the agent doing the right thing. |

---

## What Phase A added to this picture

Phase A ships **the OKR substrate** that anchors the chain. The artifacts above existed before Phase A landed; the OKR card stitches them into a single intent thread:

- **OKR card** (`okrs/<id>/okr.yaml`) — declares the objective, key results, intent cascade (Org → Role → Developer → User), affected BARs, and target code repos.
- **`intent_thread_uuid`** — generated once at OKR creation, propagated through every Hatter's Tag and every audit-event envelope. This is the cross-repo correlation key the Audit Report Export walks.
- **Tier derived from BAR pillar scores** — the Workshop Part 4 + 5 work IS what determines whether agents can act autonomously on this OKR. Sparse Celebs BAR → Restricted tier → Phase B agents will refuse to ship code-design without governance escalation.
- **OKR list + detail view in Looking Glass** — surfaces the data above as a navigable UI. Phase A ships the views read-only; Phase B wires the `Start Why / How / What` buttons.

If you ran every workshop part and never opened an OKR, the mesh has all the right artifacts but no single thread that says *"the celebrity favorites feature traces back to this objective, with this evidence, by these reviewers."* The OKR card is that thread.

---

## What Phase B+ will add

Per [agentic-sdlc.md §13](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/agentic-sdlc.md), the phases beyond A wire the artifact you just landed in the workshop into a runnable pipeline:

| Phase | Adds |
|---|---|
| **B** | Two author agents (`market-research-agent`, `prd-agent`) deployed via `.github/agents/`. PURE-data Skills shipped to `.github/skills/` with CLI backends. `Start Why / How` buttons wired. Per-agent workflows (`market-research-agent.yml`, `prd-agent.yml`) handle dispatch + audit-and-drift + finalize end-to-end. The IMDB-Lite Celebs sample runs end-to-end with audit-chain verification (`audit-verify-chain`) and Knight's Seal v1 (per-run ephemeral Ed25519 signing). **PRD review is in-agent persona-switch self-critique**, not a separate reviewer-agent dispatch — Architect + Security personas run bounded rounds inside `prd-agent`, tier-bounded (Autonomous 3, Supervised 2, Restricted 0). |
| **C** | OKR-bus + design-bus orchestration. Pocket Watch goal-drift gate + Caterpillar's Challenge cross-phase drift gate. HumanGate UI. Dual-signature override modal. Per-repo fan-out from `Start What`. |
| **D** | `code-design-agent` operating on indexed code repos. `knowledge-code` Skill (tree-sitter polyglot extraction). `design/synthesis.md` + `design/architecture-review.md` + `design/security-review.md` prompt packs (driven by the same persona-switch pattern as PRD; the open decision on whether to bring back separate reviewer agents for the WHAT phase is data-driven — see agentic-sdlc.md §13 D8). Cross-repo chain ladder visualization. |
| **E** | Audit Report Export — one-click zip from the OKR detail screen with traceability matrix, frozen prompt packs, chain verification, Knight's Seal signature verification. |

> **PRD time has no separate reviewer agents.** Earlier designs dispatched `architect-reviewer` + `security-reviewer` on `prd-draft`-labeled PRs. In practice both extra agents read the same mesh state the prd-agent already grounded on — the "independent review" was theatre. The B24 pivot collapsed PRD review into the prd-agent itself: it inhabits Architect + Security personas after first-pass synthesis, emits a `self_review` audit event per persona per round, and iterates until both converge or hits the tier-bound max. WHY-phase research-doc PRs are descriptive (synthesis from sources, not design decisions) so they have no reviewer at all — their merge gate is `audit-validate.yml` + the `research-pass` label.

Every workshop part you've completed feeds the same mesh those phases will read from. The work isn't wasted; it's a load-bearing prerequisite.

---

## Quick map: artifact-to-feature

Where to find each pillar of evidence in the mesh after the full workshop:

```
<mesh-root>/
├── platforms/
│   └── imdb-lite/
│       └── bars/
│           ├── imdb-lite-application/         ← Part 1 (selection), Part 4 (fitness)
│           │   ├── app.yaml                   ← Part 1
│           │   ├── architecture/              ← Part 3 (ADR), Part 4 (fitness funcs)
│           │   │   ├── ADRs/
│           │   │   ├── fitness-functions.yaml
│           │   │   ├── quality-attributes.yaml
│           │   │   └── bar.arch.json          ← Looking Glass: CALM model
│           │   └── security/                  ← Part 2 (OWASP), Part 5 (pipeline)
│           │       ├── threat-model.yaml
│           │       ├── security-controls.yaml
│           │       └── compliance-checklist.yaml
│           └── imdb-celebs/                   ← intentionally sparse — drives Restricted tier
├── okrs/                                       ← Phase A (this PR series)
│   └── OKR-2026Q1-IMDB-001-celeb-api/
│       ├── okr.yaml                            ← Card with intent_thread_uuid + intent_cascade
│       ├── audit/
│       │   ├── chain-ladder.yaml               ← Cross-phase audit ladder
│       │   └── events/                         ← Per-run JSONL (Phase B emits)
│       ├── why/                                ← Phase B: research doc lands here
│       ├── how/                                ← Phase B: PRD lands here
│       └── what/                               ← Phase D: code-design lands here
├── .caterpillar/prompts/                       ← Part 2 + Part 6 (versioned packs)
│   ├── research/
│   ├── prd/
│   └── design/                                 ← Phase D adds this folder
└── governance/                                 ← Part 4 (scoring), Part 5 (SARIF)
```

In the **code repo** side, Part 7 lays down `.claude/settings.json` + `.cheshire/` to govern the coding agents that pick up Phase D's per-repo fan-out issues.

---

## Common questions

**"Do I have to run the workshop to use the agentic SDLC?"**
No. The workshop teaches the artifacts; the agentic pipeline reads them. You can hand-author a CALM model, a threat model, and an OKR card and the pipeline works. The workshop is the fastest path to a complete mesh.

**"What if my mesh has only some of these artifacts?"**
The OKR detail view in Looking Glass surfaces what's missing (per the design doc's §10.2 mockup, the Affected BARs section shows each BAR's composite score; low scores carry their cause as a "missing X" hint). Phase B+ reviewers will flag absent artifacts as `MISSING` in their structured-review output.

**"Where does the workshop's 'project_id' from Part 8 fit?"**
`project_id` is the workshop's hand-rolled version of `intent_thread_uuid`. Once Phase A is live in your mesh, Part 8 instructors should swap "create a `project_id` label" for "create an OKR card." Same purpose; auditable provenance instead of a free-text label.

---

## Where to go next

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">The vision page</div>
    <div class="docs-copy">The framework end-to-end: substrate + two governance modalities + the auditor's master question.</div>
    <div class="docs-copy"><a href="/docs/agentic-sdlc-governance" class="docs-button-secondary">Read →</a></div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">Hatter's Tea Party deep dive</div>
    <div class="docs-copy">The OKR-driven planning pipeline: research → PRD → code design → fan-out.</div>
    <div class="docs-copy"><a href="/docs/hatters-tea-party" class="docs-button-secondary">Read →</a></div>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-heading">Red Queen's Court deep dive</div>
    <div class="docs-copy">Deterministic enforcement at the coding agent's tool-call boundary. Workshop Part 7's mesh substrate.</div>
    <div class="docs-copy"><a href="/docs/red-queens-court" class="docs-button-secondary">Read →</a></div>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-heading">The 8-part workshop</div>
    <div class="docs-copy">Run the full curriculum end-to-end. Each part lays down artifacts the agentic pipeline will eventually use.</div>
    <div class="docs-copy"><a href="/docs/workshop" class="docs-button-secondary">Open the workshop →</a></div>
  </div>
</div>
