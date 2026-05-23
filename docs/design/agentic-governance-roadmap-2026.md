# MaintainabilityAI — Agentic SDLC Governance Design Doc

**Status:** Draft v1
**Date:** May 2026
**Author:** Chief Archeologist
**Trigger:** Microsoft Agent Governance Toolkit release (2 Apr 2026) + OWASP Top 10 for Agentic Applications (2026) + EU AI Act Aug 2026 deadline

---

## 1. Executive summary

The agentic SDLC governance market changed in Q1 2026. Microsoft shipped the **Agent Governance Toolkit** (AGT), Snyk shipped **Evo AI-SPM**, GitHub made **Enterprise AI Controls + Agent Control Plane** GA, and OWASP published the **Top 10 for Agentic Applications**. The market is rapidly partitioning into two camps:

- **Runtime agent governance** — intercept the agent's actions (Microsoft AGT, Snyk Agent Guard, GitHub agent control plane)
- **Engineering process governance** — govern the SDLC that AI agents participate in (where MaintainabilityAI sits)

**MaintainabilityAI's defensible position** is the intersection of two assets no competitor combines: **architecture-as-code (CALM 1.2)** feeding **deterministic policy enforcement (Red Queen)** keyed to that architecture model. We govern the *engineering process*; Microsoft AGT governs the *agent runtime*. The two are complementary, not competitive.

However, our research surfaced **13 concrete capability gaps** that enterprise auditors and platform teams now expect. This doc itemises them, names the proposed solutions in our Wonderland vocabulary, and maps each to specific compliance clauses (NIST AI RMF, ISO 42001, EU AI Act Art. 11–14, SOC 2, OWASP Agentic Top 10).

The proposed work is grouped into **three waves**:

- **Wave 1 (next 6 weeks):** Audit chain + agent roster + provenance manifest — the evidence basics
- **Wave 2 (next 3 months):** Twin Reviewer + Architecture Conformance Tests + Phase 9 CI hard gate
- **Wave 3 (next 6 months):** Compliance crosswalks (EU AI Act, ISO 42001), goal-drift detector, replay debugging

---

## 2. Market landscape — what shipped in 2026

| Product | Category | Architecture-aware? | Deterministic enforcement? | SDLC-aware? |
|---|---|---|---|---|
| **Microsoft Agent Governance Toolkit** (Apr 2026) | Runtime | No | Yes (Agent OS policy engine) | Partial (shift-left CLI, GH Action) |
| **GitHub Enterprise AI Controls** (Feb 2026 GA) | Platform admin | No | Partial (allow/deny by agent) | Yes (audit log) |
| **Snyk Evo AI-SPM + Agent Guard** (RSAC 2026) | Runtime + SPM | No | Yes (Policy Agent in CI) | Yes |
| **Anthropic Claude Code Enterprise + Compliance API** (Aug 2025+) | Platform | No | No (hooks BYO) | Yes (audit) |
| **Cursor / Sourcegraph Cody Enterprise** | Platform | No | Partial (model allow-list) | Partial |
| **Port (Series C, Dec 2025)** | Catalog + agent registry | Service catalog only | Partial | Yes |
| **Promptfoo / LangSmith / Langfuse / Phoenix** | Observability / evals | No | No | No |
| **MaintainabilityAI** | Engineering process | **Yes (CALM 1.2)** | **Yes (Red Queen)** | **Yes (6-phase SDLC)** |

**Key insight:** Microsoft AGT's `LIMITATIONS.md` explicitly lists what it does NOT do: it governs **actions, not reasoning**; **attempts, not outcomes**; no RAG provenance; no credential lifecycle. Those are the exact gaps where engineering-process governance picks up.

**Standards driving the market:**

- **OWASP Top 10 for Agentic Applications (2026)** — ten threats (T1–T10) covering memory poisoning, tool misuse, privilege compromise, resource overload, hallucination cascades, intent breaking, deceptive behaviour, repudiation, identity spoofing, HITL overwhelm
- **NIST AI RMF + Generative AI Profile (NIST-AI-600-1)** — Govern/Map/Measure/Manage with explicit "content provenance" requirement
- **ISO/IEC 42001:2023** — AI Management System, 39 Annex A controls, requires AI System Impact Assessment and AI inventory
- **EU AI Act Reg. 2024/1689** — high-risk systems must satisfy Article 11 (Annex IV technical file), **Article 12 automatic logging** (model version, inputs, operator, timestamps, ≥6 month retention), Article 14 human oversight, by **2 August 2026**
- **SOC 2 Type II** — 2026 auditors now asking for the **prompt** as part of CC8.1 design evidence

---

## 3. What MaintainabilityAI is unique at (don't break this)

1. **CALM 1.2 architecture-as-code in the developer workflow** — Looking Glass + Absolem
2. **Score-gated agent autonomy** — Red Queen permission tiers (Autonomous 80–100 / Supervised 50–79 / Restricted 0–49) tied to four-pillar BAR governance score
3. **RCTRO prompt-pack-as-specification** — 10 OWASP packs + 6 STRIDE + 7 maintainability packs scaffolded into every repo via Cheshire
4. **CALM flow constraints in deterministic policy** — Red Queen MCP `validate_action` checks declared flows before structural changes
5. **6-phase SDLC framework** with measurable gates per phase, tying compliance evidence to phase artifacts

No competitor has the (CALM × Red Queen × Cheshire) combination. This is the moat.

---

## 4. Gap analysis — 13 capabilities the 2026 market expects that we don't yet ship

Each gap below names: the **standard or competitor** driving the expectation, the **MaintainabilityAI subsystem** it extends, and a **proposed Wonderland name** for the new capability.

### Gap 1 — Tamper-evident audit chain with SIEM export

| | |
|---|---|
| **Standard / source** | EU AI Act Art. 12 (automatic logging, ≥6 mo retention) · OWASP T8 Repudiation · NIST 800-53 AU-2/AU-6 |
| **Competitor parity** | Microsoft AGT (Merkle-chained audit log + CloudEvents v1.0) · Anthropic Compliance API (~30 typed events) · GitHub agent audit log |
| **Our gap** | Red Queen logs validation decisions locally; nothing tamper-evident; no export pipeline |
| **Extends** | Red Queen |
| **Proposed name** | **The Court Recorder** — Merkle-chained append-only audit log with inclusion proofs, CloudEvents v1.0 envelopes, SIEM export adapters (Splunk HEC, Sentinel, Datadog) |
| **Artifact for auditor** | `redqueen-audit-<sha>.jsonl` per PR; daily Merkle root signed and published; inclusion proof CLI |

### Gap 2 — AI-BOM / agent inventory

| | |
|---|---|
| **Standard / source** | ISO 42001 A.6.2.7 (technical documentation) · NIST RMF GV-6.1 (third-party AI inventory) · EU AI Act Art. 49 (database registration for high-risk) |
| **Competitor parity** | Snyk Evo AI-SPM Discovery Agent (live AI-BOM) · Port agent registry |
| **Our gap** | We don't track which agents are deployed in which repos, which model versions, which system prompts are active |
| **Extends** | Looking Glass (add a new pillar) |
| **Proposed name** | **Agent Roster** — Looking Glass pillar tracking every agent's identity, model version, system prompt hash, scope of access, owner, last review date, governance tier |
| **Artifact for auditor** | `agent-bom.json` per portfolio; queryable from Looking Glass |

### Gap 3 — Per-PR provenance manifest (model + prompt + threat-model + tests)

| | |
|---|---|
| **Standard / source** | EU AI Act Art. 12 (model version traceability) · NIST 800-53 SA-15(11) (archive system/component) · NIST RMF content provenance · SOC 2 CC8.1 (2026 prompt-as-design-evidence) |
| **Competitor parity** | Nobody ships per-PR provenance manifest yet — green-field |
| **Our gap** | Commits have AI-assisted labels but no fingerprint of model version, prompt pack version, system prompt hash, threat-model reference, fitness-gate results |
| **Extends** | Cheshire (RCTRO issue → PR provenance) |
| **Proposed name** | **The Hatter's Tag** — a signed `provenance.json` attached to every AI-assisted PR carrying: `{agent, model_version, system_prompt_sha, prompt_pack_version, threat_model_ref, owasp_categories, fitness_results, reviewer, rationale}` |
| **Artifact for auditor** | PR comment + attached JSON; queryable historically by commit SHA |

### Gap 4 — Independent test evidence (separation of agent-as-author from agent-as-tester)

> **RETIRED 2026-05-23 (Bug V):** Separate reviewer agents ("The Tweedles") were retired. PRD-time review was collapsed into the author agent in B24; the user confirmed on 2026-05-23 (Bug V) that persona-switch self-critique will remain the model for **all phases** (WHY, HOW, WHAT). See [`vscode-extension/design/agentic-sdlc-prd.md`](../../vscode-extension/design/agentic-sdlc-prd.md) §3 for the B24 pivot rationale. The row below is preserved for historical context.

| | |
|---|---|
| **Standard / source** | NIST 800-53 SA-11 (independent developer testing) · SOC 2 segregation of duties · OWASP T7 (misaligned/deceptive behaviour — agent reporting false success) |
| **Competitor parity** | None — most competitors let the same agent test its own code |
| **Our gap** | Workshop teaches RCTRO + tests, but no enforcement that tests come from an independent source |
| **Extends** | Red Queen (review consensus) + Cheshire (test scaffolding) |
| **Proposed name (retired)** | ~~**The Tweedles** — Tweedledum & Tweedledee: two independent reviewer-agents must sign off, one cannot be the agent that authored the change.~~ Replaced by persona-switch self-critique inside the author agent — Architect + Security personas in bounded rounds, each emitting a signed `self_review` event per persona per round on the audit chain. The chain itself is the segregation evidence. |
| **Artifact for auditor** | Per-persona, per-round signed `self_review` events on the hash-chained JSONL audit log; convergence to PASS gates merge |

### Gap 5 — Goal-drift / intent-pinning detector

| | |
|---|---|
| **Standard / source** | OWASP T6 (Intent Breaking & Goal Manipulation) |
| **Competitor parity** | Microsoft AGT Agent OS "semantic intent classifier" |
| **Our gap** | We don't compare declared task intent (from RCTRO Task field) to actual diff produced |
| **Extends** | Red Queen |
| **Proposed name** | **The White Rabbit's Pocket Watch** — keeps the agent on schedule and on scope. Hash the RCTRO Task at issue creation; compare against final PR scope; flag drift > threshold for human review. |
| **Artifact for auditor** | Goal-drift score per PR; threshold breach record |

### Gap 6 — Architecture conformance tests (CALM behavioural fitness functions)

| | |
|---|---|
| **Standard / source** | ISO 27001 A.8.27 (secure architecture principles) · NIST 800-53 SA-8 |
| **Competitor parity** | ArchUnit-style libs exist but none CALM-aware |
| **Our gap** | We have fitness functions for *code* (complexity, coverage, deps, perf) but not for *architecture behaviour* (e.g., "web-frontend MUST NOT directly call user-database"; "all auth flows pass through the auth-service node") |
| **Extends** | Cheshire (fitness functions) + Looking Glass (CALM model) |
| **Proposed name** | **The Caterpillar's Challenge** — deterministic conformance tests generated from the CALM model. Examples: declared-flow conformance, trust-zone crossing rules, interface-contract diff (oasdiff/buf/graphql-inspector), dependency-direction rules |
| **Artifact for auditor** | CI gate with per-conformance-rule pass/fail; deviations require ADR |

### Gap 7 — Oraculum PR enrichment (auto-comment with provenance + coverage + map)

| | |
|---|---|
| **Standard / source** | SOC 2 CC8.1 (change documentation) · ISO 42001 A.6.2.8 (logging) |
| **Competitor parity** | GitHub Copilot code review (suggestion quality, not architecture-aware) · Anthropic multi-agent review |
| **Our gap** | Oraculum runs governance reviews but doesn't auto-enrich PRs with the structured "what changed / why / what was tested / what was approved" context |
| **Extends** | Oraculum |
| **Proposed name** | **Oraculum's verdict scroll** — automated PR comment showing CALM nodes touched, OWASP packs applied, fitness functions run, threats mitigated, Golden Rules checklist auto-validated, residual risks |
| **Artifact for auditor** | Permanent PR comment; structured-data side-channel for SIEM |

### Gap 8 — Agent identity seal (signed commits with agent DID)

| | |
|---|---|
| **Standard / source** | OWASP T8 (repudiation) · OWASP T9 (identity spoofing) · NIST 800-53 SA-10 (integrity verification of authored commits) |
| **Competitor parity** | Microsoft AGT (Ed25519 DIDs + SPIFFE) |
| **Our gap** | Agent commits use a `Co-Authored-By` line but nothing cryptographic |
| **Extends** | Red Queen (identity layer) |
| **Proposed name** | **The Knight's Seal** — every agent-authored commit signed with an agent-specific Ed25519 key; agent DID in trailer; key issuance + rotation via mesh |
| **Artifact for auditor** | Signed commit history; agent keyring; rotation log |

### Gap 9 — Continuous regression evals (drift gate)

| | |
|---|---|
| **Standard / source** | NIST RMF MS-2.x (continuous measurement) · NIST RMF MS-2.4 (drift monitoring) |
| **Competitor parity** | Promptfoo, LangSmith, Langfuse, Phoenix (observability tools) — but not gated to CI |
| **Our gap** | One-shot evals at design time, nothing tracking eval drift over time |
| **Extends** | Cheshire (fitness functions) |
| **Proposed name** | **The Looking Glass mirror test** — eval drift gate. Per-RCTRO-pack golden tests; baseline at v1; CI fails if pass rate drops > threshold from baseline. |
| **Artifact for auditor** | Eval-pass trend over time per prompt pack; gated thresholds documented |

### Gap 10 — Replay & incident reconstruction

| | |
|---|---|
| **Standard / source** | EU AI Act Art. 73 (serious-incident reports within 15 days) · ISO 42001 incident response |
| **Competitor parity** | Microsoft AGT "replay debugging" (Python-only) · Anthropic session replay |
| **Our gap** | We can audit decisions but not replay the agent's decision chain |
| **Extends** | The Court Recorder (Gap 1) |
| **Proposed name** | **The Caterpillar's hookah** — replay the smoke. Reconstruct an agent decision sequence from the audit chain plus the captured RCTRO+context, optionally rerun against current policy to test what would happen now. |
| **Artifact for auditor** | Per-incident replay bundle; counterfactual analysis report |

### Gap 11 — Compliance crosswalks (EU AI Act + ISO 42001 + NIST AI RMF)

| | |
|---|---|
| **Standard / source** | Same three standards |
| **Competitor parity** | Microsoft AGT (claims EU AI Act + HIPAA + SOC 2 mapping but no published crosswalk doc) |
| **Our gap** | We have crosswalks for SOC 2, ISO 27001, NIST 800-53, PCI DSS. Missing EU AI Act, ISO 42001, NIST AI RMF — the three standards specific to AI |
| **Extends** | `docs/governance/compliance-mapping.md` |
| **Proposed name** | (extend existing page, no new component name) |
| **Artifact for auditor** | Three new sections on the existing mapping page |

### Gap 12 — Credential lifecycle for agents

| | |
|---|---|
| **Standard / source** | OWASP T3 (Privilege Compromise) · Microsoft AGT LIMITATIONS doc explicitly calls this gap out |
| **Competitor parity** | None ships this well — explicit market gap |
| **Our gap** | We govern what agents can DO (Red Queen) but not WHAT KEYS THEY HOLD |
| **Extends** | Red Queen |
| **Proposed name** | **The Queen's Keyring** — per-task short-lived agent credentials, scoped to the RCTRO Task, auto-revoked at PR close. Tracks which keys the agent currently holds; alerts on accumulation. |
| **Artifact for auditor** | Per-PR credential issuance + revocation log; keyring inventory |

### Gap 13 — Cross-repo blast radius (already on Phase 9 roadmap)

| | |
|---|---|
| **Standard / source** | OWASP T8 traceability across repos |
| **Competitor parity** | None ships well |
| **Our gap** | Phase 9 plans `redqueen-action` with tree-sitter AST + oasdiff/buf/graphql-inspector. Already documented. **Confirm we keep it in the roadmap.** |
| **Extends** | Red Queen (Phase 9) |
| **Proposed name** | (already named — Phase 9 hard gate) |
| **Artifact for auditor** | Blast-radius report per PR; coordination work auto-created in downstream repos |

---

## 4.5. Two more disciplines surfaced (May 2026): Harness Engineering + Intent Governance

Two related disciplines crystallised in Q2 2026 that change how we should position ourselves. They are **complementary to** our work, not alternatives.

### Harness engineering — `Agent = Model + Harness`

The canonical definition came from Ryan Lopopolo (OpenAI, Feb 11 2026), echoed by Martin Fowler / Birgitta Böckeler (Apr 2026), Addy Osmani (Apr 2026), and Augment Code. The **harness** is everything around the agent that is *not* the model: system prompts, `AGENTS.md` / `CLAUDE.md` / `.cursor/rules`, skills/subagent prompts, tool descriptions, MCP servers, sandboxes, hooks (pre-tool / post-edit / pre-commit), permission gates, memory, context compaction, evaluators, drift detection, observability.

**Discipline principles** (Osmani, Fowler):
- **The Ratchet** — every line in a good `AGENTS.md` should be traceable to a specific past failure
- **Success is silent, failures are verbose** — feedback signals should only fire when something is wrong
- **Cybernetic regulation** = feedforward (guides) + feedback (sensors)
- **Separate generator from evaluator** — agents reliably skew positive when grading their own work
- **PEV loops** — Plan, Execute, Verify, with deterministic gates between phases

**Overlap with governance** (the authors say it explicitly): hooks, sandboxing, pre-execution gates, fitness-function-as-policy — all of these *are* what a governance framework provides. **Distinction**: harness engineering is **per-agent runtime scaffolding owned by the team running the agent**. Governance (as MaintainabilityAI scopes it) is **org-wide policy, audit, compliance evidence**. The harness *executes* the policies; governance *defines and audits* them.

**Where the harness canon is silent**: audit evidence, reproducibility across runs, traceability through multi-agent chains. Fowler explicitly does not discuss audit. That gap is real, and it's where MaintainabilityAI plugs in.

**MaintainabilityAI positioning**: *the governance layer that compiles policy into the harness, then audits the trajectories the harness produces*.

### Intent governance — declarative intent that travels with the work

Three converging strands:

1. **Microsoft's four-layer intent model** (Security Blog, Mar 2026): Organisational → Role → Developer → User. Deny-by-default cascade — lower layers can only narrow, never expand, what higher layers permit. *"User requests should only be fulfilled when they remain inside organizational policy, assigned business role, and technical design constraints."*

2. **IntentSpec** open standard (intentspec.org, also Pathmode): structured Markdown + YAML frontmatter declaring objective / outcomes / constraints / edge cases / health metrics. Has a JSON Schema and a `validate-intentspec-action` GitHub Action that gates PRs.

3. **Declarative governance** (CSA, Mar 2026): *"defining intent rather than hard-coding permissions"* — the system continuously observes activity against expectations and intervenes when usage deviates.

**Runtime enforcement mechanisms shipping in 2026**: Microsoft AGT's OPA Rego / Cedar policy engine + semantic intent classifier; Snyk Policy Agent's English-to-CI-guardrails compiler; Token Security's intent-based permissioning (declared-vs-observed runtime diff).

**RCTRO is already a partial IntentSpec.** Our prompt packs already encode Role + Context + Task + Requirements + Output — that's most of the IntentSpec contract. We're missing the **frontmatter schema, versioned spec ID, machine-readable acceptance checks, and the four-layer cascade through `mesh.yaml`.**

**Failure modes the canon documents:**
- **Semantic drift** — progressive deviation from original intent while staying syntactically valid
- **Coordination drift** — multi-agent consensus breaks down
- **Behavioural drift** — emergent unintended strategies
- **Tier creep** — authorisation drift through gradual promotion
- **LLM-rephrasing bypass** — pattern matchers miss reworded malicious goals
- **Implicit-intent guesswork** — LLMs don't follow implied intent, only explicit instructions

---

### Gap 14 — Machine-readable IntentSpec (frontmatter on every prompt pack)

| | |
|---|---|
| **Standard / source** | IntentSpec open standard · CSA declarative governance · ISO 42001 A.6.2.7 |
| **Competitor parity** | IntentSpec.org with `validate-intentspec-action` |
| **Our gap** | RCTRO prompt packs are intent specs in prose. No frontmatter, no JSON Schema, no PR-gate validator. |
| **Extends** | Cheshire Cat |
| **Proposed name** | **Cheshire's IntentSpec** — adopt the open standard, add MaintainabilityAI-specific fields: `owasp_categories`, `stride_threats`, `calm_nodes`, `fitness_gates`, `governance_tier_required`. Ship a `validate-intentspec` GitHub Action. |
| **Artifact for auditor** | `intent/INT-*.md` files in repo; per-PR linkage to spec ID |

### Gap 15 — Four-layer intent cascade in the governance mesh

| | |
|---|---|
| **Standard / source** | Microsoft Security Blog Mar 2026 · CSA declarative governance |
| **Competitor parity** | Microsoft AGT (implicit via policy precedence) |
| **Our gap** | Permission tiers in `mesh.yaml` are score-based. We don't yet encode the Org/Role/Dev/User precedence as explicit layers. |
| **Extends** | Looking Glass (governance mesh schema) |
| **Proposed name** | **The Court Hierarchy** — extend `mesh.yaml` with `intent.layers.{organisational, role, developer, user}` blocks. Red Queen evaluates from the top down; an action must pass every layer above where it originates. |
| **Artifact for auditor** | `mesh.yaml` intent layers; per-action evaluation showing which layer denied or approved |

### Gap 16 — Harness compiler (turn BAR + IntentSpec into agent harness)

| | |
|---|---|
| **Standard / source** | Harness engineering canon (Osmani, Fowler, Lopopolo); explicit gap they all leave |
| **Competitor parity** | Cheshire Cat already scaffolds; this extends it |
| **Our gap** | Cheshire scaffolds prompt packs + workflows but doesn't yet emit a complete harness (`AGENTS.md`, `.claude/settings.json`, `.github/hooks/*`, MCP server config, skills, `CLAUDE.md`) from the BAR + IntentSpec |
| **Extends** | Cheshire Cat |
| **Proposed name** | **Harness Compiler** — generates the harness from policy. Takes BAR (pillar scores → permission tier) + IntentSpec (objectives, constraints, OWASP categories) + CALM model (architectural rules) → outputs a complete agent harness pinned to commit SHA. Re-runs on BAR/IntentSpec change. |
| **Artifact for auditor** | The harness config files themselves are signed and version-pinned; diff history shows how policy changes propagated |

### Gap 17 — Intent Thread (correlation-ID chain through agent handoffs)

| | |
|---|---|
| **Standard / source** | OWASP T8 (repudiation) · NIST RMF GV-6.1 · thinking.inc correlation-ID provenance |
| **Competitor parity** | thinking.inc (commercial) · Microsoft AGT audit log (per-action, not per-intent) |
| **Our gap** | We log Red Queen decisions per-action. We don't yet thread a single intent through multiple agents, multiple tool calls, multiple commits. |
| **Extends** | The Court Recorder (audit chain, Gap 1) — adds the thread |
| **Proposed name** | **Intent Thread** — every IntentSpec gets a UUID at creation; every agent action, commit, PR, review, and merge stamps the UUID. Court Recorder query: *"show me everything that happened under INT-EXPORT-JSON-001"* returns the chain in chronological order. |
| **Artifact for auditor** | Per-intent timeline view; cross-repo intent-thread query |

### Gap 18 — Intent Fidelity gate (drift detection vs IntentSpec)

| | |
|---|---|
| **Standard / source** | NIST RMF MS-2.4 (drift) · arXiv "Agent Drift" taxonomy (semantic/coordination/behavioural) · OWASP T6 |
| **Competitor parity** | None — Microsoft AGT semantic intent classifier is closest but operates pre-action, not post-implementation |
| **Our gap** | We have fitness functions for code (complexity, coverage, deps, perf). We don't yet have one for **intent fidelity** — does the PR diff satisfy the IntentSpec's stated outcomes and constraints? |
| **Extends** | Cheshire Cat (fitness functions) |
| **Proposed name** | **Intent Fidelity gate** — a new fitness function. Inputs: IntentSpec referenced by the PR, the diff itself, the test results. Mechanism: (a) deterministic schema check (every `outcomes` item must have ≥1 referencing test); (b) LLM-judge semantic check (does the diff plausibly satisfy the objective?). Fails CI on threshold breach. |
| **Artifact for auditor** | Per-PR Intent Fidelity score; threshold trend over time per IntentSpec |

---

## 5. Proposed solution architecture (Wonderland vocabulary added)

Three new named components extend existing systems:

### Looking Glass adds
- **Agent Roster** (Gap 2) — pillar tracking agent identity, model, prompt, scope, score
- **The Court Hierarchy** (Gap 15) — four-layer intent cascade in `mesh.yaml` (Org/Role/Dev/User)

### Cheshire Cat adds
- **The Hatter's Tag** (Gap 3) — per-PR provenance manifest
- **The Caterpillar's Challenge** (Gap 6) — CALM-derived architecture conformance tests
- **The Looking Glass mirror test** (Gap 9) — eval drift gate
- **Cheshire's IntentSpec** (Gap 14) — adopt IntentSpec open standard + governance frontmatter
- **Harness Compiler** (Gap 16) — compile BAR + IntentSpec + CALM into a complete agent harness
- **Intent Fidelity gate** (Gap 18) — fitness function checking PR diff vs IntentSpec outcomes

### Red Queen adds
- **The Court Recorder** (Gap 1) — Merkle-chained audit chain + SIEM export
- ~~**The Tweedles** (Gap 4) — twin-reviewer consensus enforcement~~ **RETIRED 2026-05-23 (Bug V)** — replaced by persona-switch self-critique inside the author agent (Architect + Security personas in bounded rounds, per-persona/per-round signed `self_review` events). See Gap 4 above.
- **The White Rabbit's Pocket Watch** (Gap 5) — goal-drift detection
- **The Knight's Seal** (Gap 8) — Ed25519-signed agent commits
- **The Queen's Keyring** (Gap 12) — agent credential lifecycle
- **The Caterpillar's hookah** (Gap 10) — replay & reconstruction
- **Intent Thread** (Gap 17) — correlation-ID chain through agent handoffs (extends Court Recorder)

### Oraculum extends
- **Oraculum's verdict scroll** (Gap 7) — automated PR enrichment

### Compliance Mapping page extends
- New crosswalks for EU AI Act + ISO 42001 + NIST AI RMF (Gap 11)

### Already on roadmap (no change)
- Phase 9 CI hard gate (Gap 13)

---

## 6. Standards coverage matrix (post-implementation)

Each cell shows which proposed component primarily satisfies the standard's evidence expectation for the auditor master-question (*"how was it built / which agent / which prompt / threat model / test coverage / who approved / rationale"*).

| Question | Standard | Component |
|---|---|---|
| How was it built | ISO 27001 8.25 · SOC 2 CC8.1 | 6-phase SDLC (existing) |
| Which agent | EU AI Act Art. 12 · OWASP T8 | The Knight's Seal · Agent Roster |
| Which prompt | EU AI Act Art. 12 · SOC 2 CC8.1 (2026) | The Hatter's Tag |
| Which model version | EU AI Act Art. 12 · SA-15(11) | The Hatter's Tag · Agent Roster |
| Threat model | OWASP Agentic T1–T10 · STRIDE | RCTRO + threat-model.md (existing) |
| Test coverage | NIST 800-53 SA-11 | Persona-switch self-critique (per-persona signed self_review on chain) · Caterpillar's Challenge |
| Architecture conformance | ISO 27001 A.8.27 | The Caterpillar's Challenge |
| Goal alignment | OWASP T6 · T7 | White Rabbit's Pocket Watch |
| Who approved | EU AI Act Art. 14 · ISO 42001 A.3.2 | Persona-switch convergence (Architect + Security personas) · CODEOWNER (existing) · HumanGate dual-signature override (restricted tier) |
| Rationale | EU AI Act Annex IV | Hatter's Tag + Oraculum's verdict scroll |
| Audit trail | EU AI Act Art. 12 · OWASP T8 | The Court Recorder |
| Incident replay | EU AI Act Art. 73 | The Caterpillar's hookah |
| AI inventory | ISO 42001 A.6.2.7 · NIST RMF GV-6.1 | Agent Roster |
| Credential lifecycle | OWASP T3 | The Queen's Keyring |
| Continuous measurement | NIST RMF MS-2.x | Looking Glass mirror test |

---

## 7. Implementation waves

### Wave 1 — Evidence basics (6 weeks)
Highest leverage / lowest implementation cost. Establish the audit chain and per-PR provenance — every downstream gap depends on these.

- **The Court Recorder** — Merkle-chained log + CloudEvents v1.0 export
- **The Hatter's Tag** — per-PR provenance manifest
- **Agent Roster** — Looking Glass pillar + `agent-bom.json` artifact

### Wave 2 — Process strengthening (3 months)
Make the existing review process safer, deterministic, architecture-aware.

- ~~**The Tweedles** — twin-reviewer enforcement~~ **RETIRED 2026-05-23 (Bug V).** PRD-time review uses persona-switch self-critique inside the author agent (B24 pivot — see [`vscode-extension/design/agentic-sdlc-prd.md`](../../vscode-extension/design/agentic-sdlc-prd.md) §3). Separate code-grounded reviewers were considered for WHAT phase but the user confirmed (2026-05-23, Bug V) that persona-switch will remain the model for all phases.
- **The Caterpillar's Challenge** — CALM conformance tests
- **The Knight's Seal** — signed commits + agent DID
- **Phase 9 CI hard gate** (already on roadmap) — `redqueen-action`

### Wave 3 — Continuous + advanced (6 months)
Continuous evidence, advanced threat coverage, market differentiation.

- **The Queen's Keyring** — credential lifecycle
- **The White Rabbit's Pocket Watch** — goal-drift detection
- **The Looking Glass mirror test** — eval drift gate
- **The Caterpillar's hookah** — replay & reconstruction
- **Oraculum's verdict scroll** — automated PR enrichment
- **Compliance crosswalks** — EU AI Act + ISO 42001 + NIST AI RMF

---

## 8. Positioning vs Microsoft AGT (don't fight, complement)

Microsoft AGT is great at what they ship: **runtime governance of agent actions**. Their LIMITATIONS doc names the gaps we naturally fill: RAG/knowledge provenance, credential lifecycle, prompt-injection detection, **reasoning-trace correlation**, **human-developer SDLC artifacts beyond CI pass/fail**.

We should:

1. **Acknowledge AGT explicitly** in our docs (already added to landscape page)
2. **Position MaintainabilityAI + AGT as complementary** — "we govern the SDLC, AGT governs the runtime; both feed the same audit chain"
3. **Build an AGT integration** — Red Queen MCP can call AGT's policy engine for runtime decisions; AGT's audit chain can be merged into ours via CloudEvents
4. **Maintain our architectural uniqueness** — CALM-aware deterministic enforcement is what they cannot match without architectural model adoption

---

## 9. Decision: what to add to impossible-things

The `impossible-things` page currently has three Road Ahead chapters: Available now, Shipping (Red Queen Phases 1–8), Coming next (Phase 9 + Predictive Health + Runtime Validation + Regulatory Evidence).

**Recommendation:** rewrite Chapter III to absorb the highest-impact items from this design doc. Specifically:

- Keep **Phase 9 CI hard gate**
- Expand **Regulatory Evidence** to call out EU AI Act, ISO 42001, NIST AI RMF crosswalks
- Add **The Court Recorder** (Merkle audit chain + SIEM)
- Add **Agent Roster** (AI-BOM)
- Add **The Hatter's Tag** (per-PR provenance manifest)
- Add **The Caterpillar's Challenge** (architecture conformance tests)
- Drop or merge **Predictive Health** + **Runtime Validation** into a single forward-looking card (these are less urgent than the audit basics)

The Wave 2 + Wave 3 names can be hinted at but not all promoted to the vision page until they're closer to shipping.

---

## 10. Open questions

1. **Foundation home for the project** — Microsoft AGT explicitly aspires to a foundation home. Should MaintainabilityAI consider FINOS (CALM is already there) or LF AI & Data? Foundation governance would help with the enterprise-credibility play.
2. **Standard-body engagement** — should we propose architecture-conformance tests as a NIST AI RMF Generative AI Profile addition? The CALM ecosystem at FINOS already gives us a path.
3. **Joint demo with Microsoft AGT** — could showcase the "two complementary halves" narrative at a conference.
4. **Pricing** — when this expands beyond OSS, the audit chain + replay product is the natural enterprise SKU.

---

## 11. References

- [Microsoft Agent Governance Toolkit announcement (2 Apr 2026)](https://opensource.microsoft.com/blog/2026/04/02/introducing-the-agent-governance-toolkit-open-source-runtime-security-for-ai-agents/)
- [microsoft/agent-governance-toolkit (GitHub)](https://github.com/microsoft/agent-governance-toolkit)
- [docs/LIMITATIONS.md (AGT explicit out-of-scope)](https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/LIMITATIONS.md)
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [NIST AI RMF + Generative AI Profile (NIST-AI-600-1)](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- [ISO/IEC 42001:2023](https://www.iso.org/standard/42001)
- [EU AI Act Annex IV (technical documentation)](https://artificialintelligenceact.eu/annex/4/)
- [GitHub Enterprise AI Controls + Agent Control Plane GA (26 Feb 2026)](https://github.blog/changelog/2026-02-26-enterprise-ai-controls-agent-control-plane-now-generally-available/)
- [Snyk Evo AI-SPM + Agent Security (RSAC 2026)](https://snyk.io/news/snyk-launches-agent-security-solution/)
- [Port — agentic engineering platform (Dec 2025)](https://www.port.io/blog/backstage-is-dead)
- [Anthropic Compliance API (20 Aug 2025)](https://www.anthropic.com/news/compliance-api)
