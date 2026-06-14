# MaintainabilityAI VS Code Extension

> *"Would you tell me, please, which way I ought to go from here?"*
> *"That depends a good deal on where you want to get to," said the Cat.*

Unlike Alice, **you know exactly where you want to go** — secure, well-governed, maintainable software. This extension is your companion for the whole journey: from enterprise architecture and governance scoring, through an **agentic SDLC that ships real code with a signed audit trail**, to security scorecards and automated remediation.

Two panels. One governed pipeline. **Ship secure code you can prove.**

---

## What makes it different

Most AI coding tools generate code and hope. MaintainabilityAI runs an **end-to-end, governed agentic SDLC** where every step is grounded in evidence, signed, and replayable:

- **Intent → research → design → code, as a pipeline.** An OKR walks **WHY** (market research) → **HOW** (PRD) → **WHAT** (code design) → **Implement** (cross-repo fan-out), each phase a Copilot coding agent grounded in your governance mesh.
- **A cryptographic audit trail.** Every agent decision is written to a hash-chained, per-event **Ed25519-signed** log (Knight's Seal). A one-click **audit rollup** reads the way an auditor reads — verdict first, then the evidence — and the same verifier CI uses can re-check it from a fresh shell.
- **Deterministic enforcement, not advisory prompts.** The **Red Queen** governs tool use at the boundary with a compiled policy + PreToolUse hooks; the signed enforcement chain is stitched into the same trust model and gated at merge.
- **Evidence guardrails.** Hatter-side **Oracle Rails** (prompt-injection, PII, groundedness) re-derive bytes and replay models in CI before evidence is trusted; **Pocket Watch** flags goal drift.

The result: AI moves fast *and* you keep the receipts.

---

## The Two Panels

### Looking Glass — Governance, Architecture & the Agentic SDLC

*The mirror that shows you what your organization really looks like.*

![Looking Glass governance dashboard showing four-pillar scoring across a portfolio of BARs](https://maintainability.ai/images/looking-glass-governance.png)

A full enterprise governance dashboard built on [CALM](https://github.com/finos/architecture-as-code) (Common Architecture Language Model). It manages your portfolio, scores governance health across four pillars, drives the agentic-SDLC OKR pipeline, and gives you an AI assistant that speaks architecture.

**Open it**: Activity Bar → MaintainabilityAI → Looking Glass

### The Cheshire Cat — Code & Security

*The grin that stays with your repo long after the session ends.*

![Cheshire Cat security scorecard dashboard with fitness functions](https://maintainability.ai/images/cheshire-dashboard.png)

Your code-level companion. It scaffolds security-first SDLC structure onto projects (greenfield or brownfield), runs the security scorecard, and turns findings into grounded, agent-ready issues.

**Open it**: Activity Bar → MaintainabilityAI → The Cheshire Cat

---

## The Agentic SDLC — WHY → HOW → WHAT → Implement

*Begin at the beginning, sign every step, and stop when it's shipped.*

From an **OKR** on the Looking Glass, the pipeline runs four governed phases. Each one dispatches a purpose-built agent to GitHub Copilot, grounds it in the mesh, and merges a signed artifact before the next phase unlocks.

| Phase | Agent | Produces |
|---|---|---|
| **WHY** | `market-research-agent` | `research-doc.md` — grounded market/technical research with a hash-pinned source registry |
| **HOW** | `prd-agent` | `prd.md` — a PRD with security requirements, self-critiqued by Architect + Security personas |
| **WHAT** | `code-design-agent` | `code-design.md` — code-grounded design + cross-repo coordination (fan-out waves) |
| **Implement** | per-repo implementation agents | merged PRs in each target repo, each with its own signed chain |

**On the OKR detail page** you get a phase card per step — agent, status lights (Sources · Refine · Coverage · Drift · Self-review), the PR, the 🛡 Sealed badge, and one-tap **📄 Artifact / 🏷 Tag / 🔗 Verify / 🧾 Export**. When WHAT merges, a **fan-out pre-flight** stages each target repo (harness, permissions, dependency wave) and opens landing issues in topological order; greenfield repos are scaffolded through Cheshire first.

### The receipts: a signed, replayable audit chain

- **Knight's Seal** — every agent-emitted event is signed with the run's per-epoch Ed25519 key and hash-chained; tampering breaks the chain.
- **Whole-OKR audit rollup** — one auditor-grade document: `VERDICT / RISK / ACTION`, per-phase trust posture, the cross-phase ladder, control coverage, the **implementation chain** + **Red Queen seal**, the **Oracle rails**, and **Pocket Watch** alignment. Renders inline in a reader view; the same runner verifier CI uses can re-verify any phase offline.
- **Oracle Rails (evidence boundary)** — `injection` (Llama-Prompt-Guard, pinned) and `pii` (Presidio) gate; `groundedness` (NLI) is advisory while it calibrates. The exporter re-derives every cited byte; CI replays the model — neither trusts the stored report alone.
- **Pocket Watch** — contrastive goal-drift alignment (own rank + margin vs sibling OKRs), recorded advisory.

---

## Features

### 1. Governance Mesh & Portfolio Dashboard

*See everything. Score everything. Govern everything.*

A portfolio → platform → BAR (Business Application Resource) hierarchy with live scoring across **four pillars** — Architecture, Security, Information Risk, Operations — each scored from artifact presence and content quality.

- **CALM Diagrams** — interactive ReactFlow canvas with ELK.js auto-layout, custom node types, drag-and-drop palette, inline editing, container collapse, PNG export
- **Architecture Archetypes** — start from Three-Tier, Event-Driven, or Data Pipeline templates
- **Sequence + Threat-Model Diagrams** — Mermaid from CALM flows; LLM-powered STRIDE overlays
- **Score History & Trends** — governance maturity over time with sparklines + drift indicators; scores behave like a **trust battery** (they decay as reviews/scans/deps age)
- **ADR Management** — create, edit, track Architecture Decision Records (BTABoK-inspired)
- **Git Integration** — per-pillar sync status, one-click push-to-remote, dirty-file tracking

![Interactive CALM architecture diagram with ReactFlow and ELK.js layout](https://maintainability.ai/images/looking-glass-calm.png)

### 2. Enterprise Architecture Lenses

Drill through Business, Application, Data, Technology, and Integration lenses:

- **Business Capability Models** — pre-built Insurance (10 L1 / 35 L2 / 105 L3) and Banking (5 L1 / 48 L2 / 290 L3), or upload your own
- **Hierarchical Drill-Down** — L1 → L2 → L3 with breadcrumbs + BAR mapping; reverse mapping (which BARs implement which capabilities)

### 3. NIST SP 800-53 Policy Management

*Compliance as code, not compliance as spreadsheet.*

Curated control catalog (~35 controls across 10 NIST families), policy viewer with control mapping, inline YAML editing, and one-click **LLM-generated baselines** from your architecture context.

### 4. Absolem — AI Governance Assistant

*"Who are you?" said the Caterpillar.*

![Absolem AI architecture advisor with specialized governance commands](https://maintainability.ai/images/looking-glass-absolem.png)

A multi-turn architecture advisor on every BAR detail view that generates **previewable patches**:

| Command | What It Does |
|---------|-------------|
| `drift-analysis` | Reads review reports, compares against CALM, proposes targeted patches |
| `add-components` | Guided node + relationship creation |
| `validate` | Runs CALM schema validation conversationally |
| `gap-analysis` | Cross-pillar governance gap identification |
| `suggest-adr` | Recommends missing ADRs from patterns |
| `image-to-calm` | Upload a diagram → LLM generates CALM JSON |
| `freeform` | Open-ended architecture Q&A with full BAR context |

### 5. Oraculum — Governed Architecture Review

*The Oracle sees all. The Oracle signs all.*

![Oraculum review configuration with four-pillar selection and prompt packs](https://maintainability.ai/images/looking-glass-oraculum-review.png)

Dispatch a pillar-scoped architecture-drift review to a Copilot agent from the OKR/BAR view. The agent opens a PR with a structured report; a **merge-boundary review gate** (`review-gate`) re-derives every check from the diff + dispatch issue — it trusts none of the agent's self-reported numbers — and labels the PR `review-pass` / `review-invalid`.

### 6. Security Scorecard

*Six fitness functions. One grade. Zero excuses.*

| Metric | Source | Threshold |
|--------|--------|-----------|
| Security Compliance | GitHub Code Scanning (CodeQL) | 0 high/critical |
| Dependency Freshness | npm registry age check | ≤ 90 days |
| Test Coverage | Istanbul / nyc / c8 / Jest / Vitest / pytest-cov | ≥ 80% |
| Cyclomatic Complexity | pmat analysis | ≤ 10 per function |
| Technical Debt | pmat file grading | All files ≥ B |
| CI/CD Health | GitHub Actions status | Passing |

Each tile has action buttons that open an **inline Rabbit Hole sheet** — describe the work, pick prompt packs, and the LLM generates a complete **RCTRO** (Role / Context / Task / Requirements / Output) issue grounded in the repo's detected tech stack. Maintenance issues (CodeQL findings, coverage, deps, complexity, tech debt, CI) can be assigned to the **Alice** maintenance agent with one click. Supports multi-folder workspaces.

### 7. White Rabbit — From Architecture to Implementation

*"I'm late!" — but your components won't be.*

The **Implement** path bridges governance and code: from a BAR's architecture (CALM + ADRs + threat models) or a completed OKR design, it scaffolds a target repo with full security context and routes into the fan-out pipeline — no blank-page starts, no lost governance context.

### 8. SDLC Scaffolding (greenfield & brownfield)

*"Begin at the beginning," the King said gravely.*

![Cheshire Cat scaffolding security structure into a code repository](https://maintainability.ai/images/cheshire-scaffold.png)

**Scaffold SDLC Structure** bootstraps a self-contained, governed repo:

- `.redqueen/policy.json` + `decision.json` + PreToolUse hook (`validate-tool`) — compiled from the mesh
- `.claude/settings.json` + `.github/hooks/redqueen.json` — symmetric enforcement for Claude Code & Copilot
- `.github/agents/alice-maintenance-agent.agent.md` — the maintenance agent persona
- `AGENTS.md` — governance-aware agent instructions (tier + scope)
- `.github/workflows/` — `codeql.yml`, `codeql-to-issues.yml`, `validate-prompt-hashes.yml`, `fitness-functions.yml`, `impl-provenance.yml` (merge-time chain proof)
- `.github/PULL_REQUEST_TEMPLATE.md` + `SECURITY.md`, `.repo-metadata.yml`, and the OWASP prompt packs

---

## The Cast

| Character | Role |
|-----------|------|
| **The Looking Glass** | The governance mirror — portfolio, CALM diagrams, scoring, policies, the OKR pipeline |
| **The Cheshire Cat** | The code companion — scaffolding, scorecard, grounded issue creation |
| **The Hatter** | The audit chain — per-event Ed25519 signing (Knight's Seal) of the planning side |
| **The Red Queen** | The enforcer — deterministic policy at the tool-call boundary + the signed enforcement chain |
| **Absolem** | The governance caterpillar — multi-turn architecture analysis + patching |
| **Oraculum** | The oracle — governed architecture review with a merge-boundary gate |
| **The White Rabbit** | The implementation bridge — architecture → scaffolded component → fan-out |
| **Alice** | The maintenance agent — ships PRs for findings via Copilot, governed by the Red Queen |
| **You** | The architect — you describe, review, approve, and govern |

---

## The Red Queen — governance-enforced agent intelligence

> *"Now, here, you see, it takes all the running you can do, to keep in the same place."*

![The Red Queen](https://maintainability.ai/images/redqueen.png)

Deterministic constraint enforcement that moves agents from advisory prompts to **architecture-as-law** — and now signs its own enforcement decisions into the same audit chain.

### Shipped

- **Tier 1 — live cert run + onboarding.** A real OKR walked WHY→HOW→WHAT end-to-end on the open IMDB-Lite sample; the rollup reads `✅ PASS`.
- **Tier 2 — BUILD fan-out.** App-orchestrated cross-repo hand-off from WHAT to implementation PRs, with topological dependency waves and per-row remediation UX.
- **Tier 2.5 (a) — signed enforcement chain** *(cert-verified, celeb-api PR #14).* The finalize-time signer seals the prefix of the allow/deny/override decision log onto the per-event Ed25519 implementation chain; the impl-provenance gate re-hashes it at the merge SHA and **fails the PR on a mismatch**.
- **Oracle Rails** — `injection` + `pii` gating (cert-verified); `groundedness` advisory.
- **Break-glass** — time-boxed, signed, single-issue overrides that flip Restricted-tier denies into *audited* allows; security-critical paths stay denied even under break-glass.
- **Policy engine + PreToolUse hooks** — 6 rule types (TIER, PATH, SEC, CALM, CTRL, PLAT); deterministic, agent-agnostic; JSONL audit trail.

### Planned (Queen's Next Act)

- **(b)** `redqueen-action` standalone hard merge gate — tree-sitter AST semantic diff + contract diffs (oasdiff / buf / graphql-inspector)
- **(c)** cross-chain inclusion proofs + SIEM / CloudEvents export
- **(d)** promote groundedness `contradiction` to blocking; extend rails to HOW/WHAT + code skills
- **(e)** agent memory + a portable `AGENTS.md` instruction spine (a governed learn-from-overrides loop)
- **Tier 3** — Knight's Seal v2 (cosign/sigstore), one-button redacted regulator bundle, prompt-pack signature verification

See the [quickstart](https://maintainability.ai/docs/quickstart-redqueen), [Red Queen's Court](https://maintainability.ai/docs/red-queens-court), and the [Tier 2/2.5/3 roadmap](design/next-acts-tier-2-and-3.md).

---

## Configuration

The extension's own LLM calls (Cheshire, Absolem, threat models, policy baselines) use the **VS Code Language Model API** — i.e. **GitHub Copilot's model**. No API key needed; just have Copilot installed.

| Setting | Description | Default |
|---------|-------------|---------|
| `maintainabilityai.mesh.path` | Path to the governance mesh directory | — |
| `maintainabilityai.governance.meshToken` | PAT for mesh/governance Git + GitHub ops | — |
| `maintainabilityai.llm.preferredFamily` | VS Code LM family for extension LLM calls | `gpt-4o` |
| `maintainabilityai.github.defaultLabels` | Default labels for created issues | `["maintainabilityai", "rctro-feature"]` |
| `maintainabilityai.research.*` | Mesh-side research-runner knobs — guardrails, grounding + threshold, max iterations, token cost cap | sensible defaults |
| `maintainabilityai.llm.tavilyApiKey` · `usptoApiKey` · `huggingfaceToken` | Keys for research-runner evidence sources | — |

> The agentic-SDLC research/PRD/design agents run **on GitHub** (Copilot coding agents + Actions), grounded by the mesh — not in the editor. The `research.*` settings tune those mesh-side workflows.

---

## The Prompt Pack Library

*23 packs. 3 families. Every one a compact security guide — also browsable via **Prompt Packs**.*

- **OWASP Top 10 (10)** — A01 Broken Access Control · A02 Cryptographic Failures · A03 Injection · A04 Insecure Design · A05 Security Misconfiguration · A06 Vulnerable Components · A07 Authentication Failures · A08 Integrity Failures · A09 Logging/Monitoring · A10 SSRF
- **Maintainability (7)** — Complexity Reduction · Dependency Hygiene · DRY · Fitness Functions · Single Responsibility · Strangler Fig · Technical Debt
- **Threat Modeling / STRIDE (6)** — Spoofing · Tampering · Repudiation · Information Disclosure · Denial of Service · Elevation of Privilege

---

## Prerequisites

| Tool | Required For | Install |
|------|-------------|---------|
| **Git** | Repo detection, governance mesh | [git-scm.com](https://git-scm.com/) |
| **GitHub CLI (`gh`)** | Secrets, issue/PR ops, agent dispatch | [cli.github.com](https://cli.github.com/) |
| **GitHub Copilot** | The extension's LLM (VS Code LM API) | [github.com/features/copilot](https://github.com/features/copilot) |
| **pmat** *(optional)* | Complexity + tech-debt analysis | `npm i -g pmat` |

---

## Development

```bash
npm install        # dependencies
npm run build      # build
npm run watch      # watch mode
npm run quality    # full hardening gate
npm run package    # package as VSIX
```

`npm run quality` runs ESLint, extension + webview TypeScript typechecks, architecture fitness functions, Vitest, Knip dead-code checks, high-severity npm audit, the production build, and a VSIX contents smoke test.

---

## Part of the MaintainabilityAI Framework

Part of the [MaintainabilityAI](https://maintainability.ai) security-first SDLC framework. See the [workshop curriculum](https://maintainability.ai/docs/workshop/) and [onboarding](https://maintainability.ai/docs/onboarding/) for training and a guided first run.

> *"It's no use going back to yesterday, because I was a different person then."*
>
> Ship secure code today — and keep the receipts. The Cheshire Cat will be grinning.
