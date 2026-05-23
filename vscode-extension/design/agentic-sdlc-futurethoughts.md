# Agentic SDLC — Future Thoughts

**Companion to [`agentic-sdlc.md`](agentic-sdlc.md)** · last reviewed 2026-05-21

This document holds the *designed-for, not built* capabilities of the agentic SDLC framework. The seams and extension points exist in the live codebase + threat model, but these items are explicitly outside the current implementation budget. Each is designed enough that adding it later doesn't require reshaping what's already shipped.

For the live truth-source on what IS built — phase plan, deliverables map, current run state — read [`agentic-sdlc.md`](agentic-sdlc.md) §13 (phased implementation plan) and §15 (deliverables map). For agent-specific deep-dives:

- **WHY agent** → [`agentic-sdlc-marketresearcher.md`](agentic-sdlc-marketresearcher.md)
- **HOW agent** → [`agentic-sdlc-prd.md`](agentic-sdlc-prd.md)
- **WHAT agent** → [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md)

---

## 1. Archaeology research mode — code-grounded WHY phase

**What it is.** A second mode for the `market-research-agent` (or a sibling agent `archaeology-agent` — naming decision deferred until D-PR1 ships). Today's WHY phase grounds on **the web** (Tavily / arXiv / USPTO / HN). Archaeology mode grounds on **the actual code** in one or more impacted repos. Use cases:

- BAR with existing code where the team needs to *model what's already running* before deciding what to change.
- Discovery work: a Restricted-tier BAR with sparse CALM artifacts where the team needs a code-derived starting model.
- Repo intake: when a new repo is added to a BAR and we need an architecture model derived from it (not just a hand-written CALM).

**Why we kept the data model.** Phase D's `knowledge-code` Skill (D6) extracts the same `ObservedArchitecture` shape archaeology mode needs. The Skill is built for code-design-agent's WHAT-phase use; archaeology mode reuses it for WHY-phase use.

**Pipeline (replaces nodes 3-7 of the standard WHY agent's research path):**

| Node | Kind | Input | Output | Notes |
|---|---|---|---|---|
| 4a | `analyze_architecture` | pure | repo clone | `ObservedArchitecture` JSON (modules / cross_module_calls / exposed_interfaces / tests) | Reuses `knowledge-code` Skill output |
| 5a | `identify_gaps` | pure | observed arch + `MeshContext.bar.calm_model` + layer rules | `Gap[]` + a derived `QueryPlan` (web-only follow-up) | Compares observed code to declared CALM. Layer violations + module conflicts + missing-control flags surface as gaps |
| 6a | targeted web research | LLM | the derived QueryPlan | filtered findings | Same Tavily / arXiv invocation as standard WHY but with mesh-grounded gap-derived queries |
| 7a | `synthesize_report` (archaeology variant) | LLM | observed arch + MeshContext + research findings | `research-doc.md` with sections specific to code-grounded findings | Same Hatter Tag schema; same Knight's Seal v1 signing path |

**Output sections (archaeology research-doc.md):**

1. Input Premises (same as web-mode)
2. Repo Inventory (which repos were indexed, primary language, framework, file counts)
3. Observed Architecture Summary (per-module layer assignments, call-graph shape, exposed interfaces)
4. CALM Drift Findings (where observed code diverges from declared CALM)
5. Layer Violations (where module imports cross CALM-declared layer boundaries)
6. Security-Control Coverage Gaps (which threat-model entries the observed code does not appear to address)
7. Targeted Web Findings (filtered web research scoped to the gaps from §4-§6)
8. Recommendations (per-gap: address-in-code / update-CALM / accept-as-tech-debt)
9. References (same S[N]/C[N] schema as web-mode for the targeted-web subset; plus a separate F[N] = file-reference schema for code-derived claims)
10. Hatter Tag (frontmatter — `evidence_mode: code` per the same canonical-values rule that WHAT uses)

**Threshold + drift adjustments.** Pocket Watch primitive becomes `objective.description` vs `research-doc.md ## Observed Architecture Summary` (the structural summary is the substantive section, not Executive Summary which doesn't exist in this mode). Threshold to calibrate in archaeology-PR1 first end-to-end run.

**Why this is out-of-scope today.** Web-mode is shipping reliably (PR #103 clean) and covers the immediate WHY phase need. Archaeology mode requires `knowledge-code` to ship first (D6), which itself requires the code-design-agent infrastructure (D1-D12). Building archaeology before WHAT phase is built would orphan it. Order: ship D, then layer archaeology onto the same `knowledge-code` Skill.

---

## 2. Knight's Seal v2 — cosign / sigstore persistent signing

Full v1 motivation + design seam documented in [`agentic-sdlc.md`](agentic-sdlc.md) §11.5. Summary of the v2 evolution path:

- v1 (B27 + Bug O) uses **per-event, per-epoch ephemeral Ed25519 signing.** Each agent session is its own signer epoch (original = epoch 1, first revise-agent = epoch 2, second revise = epoch 3, …); each epoch generates its own ephemeral keypair inside the agent's sandbox; the public key is committed to the mesh at `audit/keys/<runId>.epoch-N.pub.pem`; the private key is destroyed at session end. Every event carries `signer_epoch`. CI invokes the runner's own `audit-verify-chain` skill — single source of truth for the verifier. Verifies for the audit-retention window (≥6 months) but a verifier has to trust the public keys committed in the mesh repo itself.
- v2 replaces the ephemeral keypair with a **persistent GitHub-App-anchored identity** in the [sigstore](https://www.sigstore.dev/) transparency log via [cosign](https://docs.sigstore.dev/cosign/overview/). A third-party verifier can confirm "this artifact was signed by *the App* during the OKR's WHAT phase merge window" without trusting the audit log's own contents.
- v2 also enables **signed prompt-pack deployment** — `.caterpillar/prompts/*` packs ship signed; mesh repos refuse to load unsigned packs. Closes the threat-model gap (`compromised prompt pack version applied silently`).
- **Triggers landing v2:** (a) regulatory ask for third-party verifiability (EU AI Act Article 12 interpretation by an audit firm), (b) cross-org artifact consumption (one org's OKR feeds another org's mesh and the receiving org needs to verify), (c) a real-world supply-chain incident that exposes the embedded-key weakness.

---

## 3. `verify-chain` CLI surface in Looking Glass

Phase E ships `verify-chain` as a standalone CLI (E2 in [`agentic-sdlc.md`](agentic-sdlc.md) §13). Reserved here is the **UI surface** for it:

- **One-click chip on the Hatter Tag UI** (overlay panel that already exists for "View Tag ↗"). Adds a `🔗 Verify Chain` button next to the existing fields. Click → runs the CLI against the current phase's chain (or with shift-click, walks the chain-ladder cross-phase too). Result chip turns ✓ / ✗.
- **Full-page chain replay log** for when verify fails. Shows event-by-event diff: which event recomputed-hash matched vs which didn't; which signature was wrong; which intent_thread_uuid broke continuity.
- **Audit Report Export integration.** The §11.7 bundle's README.md includes a `verify-chain` invocation example so an offline auditor can re-run the same check against the bundled JSONL.

---

## 4. Audit Report Export bundle

Full spec lives in [`agentic-sdlc.md`](agentic-sdlc.md) §11.7 (subsections 11.7.1 – 11.7.5). The *bundle layout* and *traceability matrix data model* are settled; the *export generator code* is queued as Phase E E1.

---

## 5. Hatter chain ladder visualization

Full spec in [`agentic-sdlc.md`](agentic-sdlc.md) §13's D11. Reserved here for completeness — the data (`chain-ladder.yaml`) is being written today by B25; the visualization is the UI completion of that data, scheduled with the rest of Phase D ([`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md)).

---

## 6. Origin-story design folded forward (historical record)

The historical `docs/design/research-and-prd-agents.md` v0.1 design doc (retired in 2026-05-21's `191b597` commit) covered (a) the archaeology research mode, (b) the original Knight's Seal / Ed25519 plan, (c) the cross-repo bridge contract, (d) the multi-expert + 4-reviewer architecture (PRD time). All four have been re-homed:

- (a) → §1 of this document (archaeology mode).
- (b) → [`agentic-sdlc.md`](agentic-sdlc.md) §11.5 (v1 spec) + §2 of this document (v2 cosign).
- (c) → [`agentic-sdlc.md`](agentic-sdlc.md) §3.5 (hand-off canonical spec) and [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md).
- (d) → [`agentic-sdlc.md`](agentic-sdlc.md) §13 B24 entry for why the multi-expert + 4-reviewer design was *replaced* by self-critique at PRD time (see also [`agentic-sdlc-prd.md`](agentic-sdlc-prd.md)), and §13 D8 / [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) for the open decision on whether to bring separate reviewers back for WHAT phase.

The v0.1 origin-story doc no longer has unique content. `agentic-sdlc.md` is the single canonical source.

---

## 7. Foundry / self-hosted inference (explicit non-goal)

The v0.1 design listed AI Foundry as a v2.0 enterprise deployment target. **This is no longer the roadmap.** We're all-in on the GitHub Copilot Coding Agent runtime: no Foundry, no self-hosted inference, no proprietary orchestration stack. The differentiators are the audit chain + threat model + governance gates — not the runtime. One-click adoption beats running our own stack.

If a real customer with a third-party-only-cloud-policy emerges, the agent design is portable enough that the .agent.md / Skills surface could ride a different runtime — but we don't build for that hypothetical.

---

## 8. CloudEvents v1.0 envelope adoption — future SIEM-export work

The original v0.1 design specified CloudEvents v1.0 as the on-disk audit format (intended to land in B14). The helper landed; the adoption did not. The on-disk format stays flat hash-chained JSON ([`agentic-sdlc.md`](agentic-sdlc.md) §11.2 for the current shape); the CloudEvents wrapper is reserved for a future SIEM-export use case.

**What's already in the repo (dormant).** `packages/research-runner/src/runner/court-recorder.ts` exports two pure helpers with passing tests:
- `buildCloudEventsEnvelope(event)` — wraps a flat audit event in a CloudEvents v1.0 envelope (`specversion: "1.0"`, `type: io.maintainabilityai.audit.<event_kind>`, `source: agent:<name>@did:gh:installation:<id>`, `subject: okr:<id>/intent:<uuid>`, `id: <event-uuid>`, `time: <iso>`, `datacontenttype: application/json`, `data: <original payload>`).
- `serializeCloudEventsEnvelope(envelope)` — canonical-JSON serializer that produces a SIEM-ready line.

The helpers are NOT invoked by the runner's `handleAuditEmitEvent`. They're staged for the future-use case.

**Why we deferred.** The flat format is simpler to verify (B25's pre-merge `verify-chain` does a tight SHA-256 replay without parsing envelope fields), and the audit chain's integrity story doesn't depend on the envelope. CloudEvents is an export concern, not a storage concern. We didn't have a real SIEM-export customer use case to justify the runner-level change, and a future ship is straightforward in either direction.

**What triggers v1 of CloudEvents adoption.** Any one of:
- A customer integration with Splunk HEC, Microsoft Sentinel, Datadog, or Microsoft AGT that wants live forwarding.
- A regulatory requirement that mandates a CloudEvents-shaped audit feed for a third-party SIEM.
- A maintainability case where unifying the on-disk + export format reduces complexity (currently the two formats are simple enough that this isn't a forcing function).

**Two ship paths when the trigger lands.**

| Path | How | When to prefer |
|---|---|---|
| **(a) Adopt at emission** | `handleAuditEmitEvent` composes `buildCloudEventsEnvelope` around the existing draft before hashing. On-disk format becomes CloudEvents 1.0. `audit-verify-chain` Skill updated to parse the envelope shape. Migration: existing flat JSONL stays valid (verify-chain reads either format) | When the SIEM forwarder reads directly from the mesh repo — no separate export pipeline |
| **(b) Adopt as a one-shot export** | New runner subcommand `audit-export --okr-id X --run-id Y --format cloudevents` that reads the flat JSONL and writes a CloudEvents JSONL into a sibling file or stdout. Keeps on-disk flat | When the SIEM forwarder runs out-of-band (cron, S3 sync, manual pull) and doesn't need the live emission shape |

Recommendation: pick (b) unless the SIEM customer specifically needs the envelope at emission time. (b) keeps the chain-verification logic untouched and avoids the migration cost.

**What carries forward.** When CloudEvents adoption lands:
- The flat-format hash-chain semantics stay identical (`prev_event_hash` → `event_hash` linkage preserved inside the envelope's wrapping fields).
- Knight's Seal v1 signing input stays the same (signs the canonical event hash, not the envelope).
- B25 verify-chain CI step gets an envelope-tolerant parser; both formats round-trip cleanly.

This is a designed-for, not built capability. No B-PR number assigned. When a use case emerges, the work becomes a single B-something entry (or its own E-something Phase E export deliverable, depending on the trigger).

---

**Companion docs:** [agentic-sdlc.md](agentic-sdlc.md) (index) · [marketresearcher](agentic-sdlc-marketresearcher.md) · [prd](agentic-sdlc-prd.md) · [codedesigner](agentic-sdlc-codedesigner.md)
