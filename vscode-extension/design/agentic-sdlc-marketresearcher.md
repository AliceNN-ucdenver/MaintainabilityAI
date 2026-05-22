# Agentic SDLC — Market Research Agent (WHY phase)

**Companion to [`agentic-sdlc.md`](agentic-sdlc.md)** · last reviewed 2026-05-21

This document is the deep-dive on the **first agent in the pipeline** — `market-research-agent`. It owns the WHY phase: turning an OKR objective into a 10-section research certificate grounded on four independent kinds of evidence (web · academic · patent · community), with full S[N]/C[N] traceability and tamper-evident provenance.

For cross-cutting concerns (audit chain, OKR card, orchestration), read [`agentic-sdlc.md`](agentic-sdlc.md). For the downstream agents, see [`agentic-sdlc-prd.md`](agentic-sdlc-prd.md) (HOW) and [`agentic-sdlc-codedesigner.md`](agentic-sdlc-codedesigner.md) (WHAT). Future capabilities (including the codebase-archaeology research mode) live in [`agentic-sdlc-futurethoughts.md`](agentic-sdlc-futurethoughts.md).

---

## What the market-research-agent owns vs. what the runtime/workflow owns (B28)

Under Court Recorder Auto-Logging (design [agentic-sdlc.md](agentic-sdlc.md) §11.6), the boundary between the LLM and the deterministic infrastructure is explicit:

| Concern | market-research-agent owns | Runtime / workflow owns |
|---|---|---|
| Query plan generation (Tavily / arXiv / USPTO / HN) | ✅ | — |
| Calling the right skills in the right order | ✅ | — |
| Gap-loop **decision** + the 3 follow-up queries | ✅ | — |
| Gap-loop semantic marker (one explicit `audit-emit-event` call before re-running searches — the runner can't infer the gap-loop) | ✅ | — |
| Synthesis of skill outputs into the 10-H2-section research doc | ✅ | — |
| Findings (R-N), evidence gaps, formal conclusions, recommendations | ✅ | — |
| `skill_call` audit event emission (Tavily / arXiv / USPTO / HN + dedupe + format) | — | ✅ Runtime auto-emits inside `runSkill()`. Search-skill handlers self-declare `queries` + `result_count` via `auditMetadata`; the runner merges them into the event payload so `count-skill-calls` keeps working unchanged. |
| `artifact_written` audit event emission | — | ✅ Workflow detects via `git diff` |
| Hash chaining + canonical serialization | — | ✅ Runtime (B25) |
| Ed25519 sealing | — | ✅ Runtime (B27) |
| `state_transition` / `human_gate` events | — | ✅ Workflow |

The agent literally **cannot** write to the audit log (except the declarative gap-loop marker, which is semantic and the runner can't infer). It produces content (the research doc, the query plan); deterministic code produces events. This closes T10 (agent skips emission to hide failures) and T11 (agent forges artifact_written payloads).

## Current state — validated end-to-end 2026-05-21 (PR #116)

The market-research-agent is **validated end-to-end on real Claude Sonnet 4.6 runs**. Last clean E2E: PR #116 (WHY for OKR-2026Q2-IMDB-001-celeb-api). 19 hash-chained audit events; ✓ Audit pass; `research-pass` label applied; merged cleanly; chain-ladder WHY entry auto-written with `chain_root_hash: 152d1aca7d36339c000a3bad0bcb106b3e03acdc0cf80190846d197bbd40e5a2`.

**Trust state today (every claim below has chain evidence on PR #116):**
- ✅ **Audit chain hash-verified pre-merge** (B25) — `chain-forgery-detected` label blocks merge on mismatch. Independent runner verify-chain: `{ok:true, sealed:true, sealVerified:true, eventCount:19}`.
- ✅ **Chain-ladder auto-written on merge** (B25 + B27.v1.2) — `okrs/<id>/audit/chain-ladder.yaml` entry includes `chain_root_hash` auto-populated by the finalize step (no more manual backfill — PR #110 needed one; PR #116 didn't).
- ✅ **Pocket Watch goal-drift** — cosine 0.7289 ≥ 0.65 threshold (PR #116) · 0.8034 (earlier PR #110).
- ✅ **Evidence-honesty gate with `mixed` mode** — PR #116 carried `evidence_mode: mixed` + `degraded_reason: "arxiv-rate-limited-429-both-passes, uspto-404-no-matching-patents, hackernews-zero-results-both-passes"`. The gate accepted `mixed` as a canonical value (was strict `live` only previously) — the agent honestly logged each provider failure as an `ok:false` skill_call event rather than fabricating results. tavily-search succeeded (50 raw results); arxiv + uspto + hackernews-first-pass returned failures; gap-loop triggered; second-pass hackernews succeeded; final dedupe-and-rank + format ran cleanly. **3 successful provider events across 2 of 4 providers — and the chain says exactly that.**
- ✅ **Knight's Seal v1** (B27 — landed) — every event signed Ed25519 with per-run ephemeral keypair. Looking Glass WHY card displays 🛡 Sealed badge inline with `chain_root: 152d1aca7d36…`. View Tag + Verify Chain buttons live.
- ✅ **B28 Court Recorder Auto-Logging** — every skill_call event carries `payload.duration_ms` (runtime auto-emit signature). Agent invokes runner CLI for every skill via the explicit `echo '{...}' | npx -y @maintainabilityai/research-runner skill-<name>` contract (B30). The single explicit `audit-emit-event` the agent still calls is the gap-loop semantic marker (the runner can't infer agent intent there).
- ✅ **B28a.v1.1 parallel-emission lock budget** — all 4 search skills fired in parallel on PR #110 dropped 3 of 4 events to silent lock contention. Bumped retry budget to 20 × exponential capped at 500ms (≈9.6s tolerance). PR #116 (4 parallel providers + arxiv took 30s) shows all 4 events in chain.
- ✅ **B28a.v1.2 unicode canonicalization parity** — TS canonicalStringify and Python defense-in-depth chain check now agree on `ensure_ascii=False` for non-ASCII characters in payload (e.g. em-dash in USPTO 404 reason). PR #116 had non-ASCII in failure reasons; chain check passed clean.
- ✅ **JTBD heading alternation** (B30) — validator accepts both `## JTBD Analysis` (short) and `## Jobs-to-be-Done Analysis` (long). PR #116 wrote the long form; H2 sections 10/10 ✓.

---

## Where this agent fits

```
OKR Card → Start Why → market-research-agent (this doc)
                              ↓
                       research-doc.md (PR)
                              ↓
                          [merge]
                              ↓
                          prd-agent  ← see agentic-sdlc-prd.md
                              ↓
                       code-design-agent  ← see agentic-sdlc-codedesigner.md
                              ↓
                       per-repo fan-out  ← see agentic-sdlc-codedesigner.md hand-off
```

The WHY phase is **descriptive**, not prescriptive. It synthesizes from sources; it doesn't make design decisions. That's why WHY-phase PRs bypass reviewer scoring — they're a synthesis artifact, not a decision artifact. The merge gate is `audit-validate.yml` + the `research-pass` label.

---

## Agent surface

**File:** `vscode-extension/code-templates/agents-v4/market-research-agent.agent.md`

**Trigger:** `assignCustomCopilotAgent` body-extension on an issue with the `oraculum-research` label. Created by Looking Glass when the user clicks **Start Why** on an OKR detail card.

**Model:** `claude-sonnet-4-6`

**Budget:** `max_skill_calls_per_run: 40` (4 providers × ≤7 queries + dedupe + format + audit + gap-loop).

**Declared tools (skills):**

| Skill | Purpose | Pure-data? |
|---|---|---|
| `knowledge-okr` | Reads the OKR card from the mesh | ✓ |
| `knowledge-mesh-bar` | Reads each affected BAR's CALM + ADRs + threats | ✓ |
| `tavily-search` | Web search provider — LLM-friendly excerpts | ✓ |
| `arxiv-search` | Academic literature | ✓ |
| `uspto-search` | Patent landscape | ✓ |
| `hackernews-search` | Practitioner discussion | ✓ |
| `dedupe-and-rank` | Cross-provider source deduplication + relevance ranking | ✓ |
| `format-research-issue-update` | Markdown formatter for the synthesis output | ✓ |
| `audit-emit-event` | The ONLY legal path to the audit log (per B25 hard rule) | ✓ |

---

## Output artifact — research-doc.md

10-section semi-formal research certificate. Required structure (parsed verbatim by the audit-and-drift workflow):

1. **Input Premises** — restates the OKR objective + affected BAR ids
2. **Executive Summary** — the substantive synthesis (this is what Pocket Watch compares against the objective)
3. **Cross-Source Analysis** — 4 required H3 sub-sections: *Standards and Best Practices · Security and Compliance · Implementation Patterns · Market Landscape*
4. **Findings (S1–SN)** — every source cited with an S[N] tag
5. **Formal Conclusions (C1–CN)** — each conclusion cites ≥1 S[N] with reasoning chain + confidence (HIGH / MEDIUM / LOW)
6. **Recommendations** — each traces to ≥1 C[N] + ≥1 S[N]
7. **Risk Matrix**
8. **Open Questions / Gaps**
9. **References**
10. **Hatter Tag** (YAML frontmatter at top) — `evidence_mode: live`, `chain_root_hash`, `seal_pub` + `seal_sig` (post-B27)

---

## Pipeline — what happens during a run

1. **Extract OKR + run id from issue body** (HTML markers + Dispatch context table fallback)
2. **Read mesh context** — `knowledge-okr` + one `knowledge-mesh-bar` per affected BAR (each emits one `skill_call` audit event)
3. **Plan queries (LLM-internal, no skill)** — per-provider tuning: 5 web NL queries + 3 arxiv short tech + 3 patent AND-joined + 4 HN-style
4. **Parallel search** — `tavily-search` · `arxiv-search` · `uspto-search` · `hackernews-search` (each emits one `skill_call` event with `payload.skill` singular + `ok: bool` + `payload.queries: [...]`)
5. **Dedupe + rank** — `dedupe-and-rank` cross-provider
6. **Gap analysis (LLM-internal)** — assess coverage; if a brief topic has 0 results or 1 source, derive ≤3 follow-up queries
7. **Bounded gap-loop** — re-invoke at most 3 search-skill calls (1 round, hard cap); emit a `gap-loop` audit event before re-running search
8. **Synthesize** (LLM) — full 10-section research-doc.md with S[N]/C[N] IDs + confidence ratings
9. **Open PR** with research-doc.md committed + Hatter Tag in PR description (mirror of frontmatter)
10. **Emit final `artifact_written` audit event** — includes Knight's Seal signature (B27)

---

## WHY-phase audit gates (post-B25)

The audit-and-drift workflow (`market-research-agent.yml`) verifies the run in this order. First failure stops; merge blocked.

| Gate | What it checks | Failure label |
|---|---|---|
| **Audit chain integrity** | Replay the SHA-256 chain end-to-end; recomputed hash matches recorded hash for every event | `chain-forgery-detected` (B71C1C) |
| **Knight's Seal signature** (B27) | Re-derive signing input from chain root + artifact SHA + run identity; verify Ed25519 | `seal-broken` (8E0000) |
| **Evidence honesty** | `evidence_mode: live` requires ≥1 successful provider `skill_call` per declared provider | `degraded-evidence` (D32F2F) |
| **Structural correctness** | 10 required H2 sections + 4 required H3 sub-sections + every C[N] cites ≥1 S[N] | `structure-invalid` (D32F2F) |
| **Pocket Watch goal-drift** | cosine(OKR objective, research-doc.md ## Executive Summary) ≥ 0.65 | `goal-drift-detected` (D32F2F) |

If all pass → `research-pass` label → merge unlocked (subject to branch protection).

---

## Phase B history — WHY-specific

> Full B-PR series tracked in [`agentic-sdlc.md`](agentic-sdlc.md) §13. Entries below highlight what mattered specifically for the WHY agent.

- **B17 — Evidence-honesty Hatter Tag block.** `evidence_mode: live | cached | mixed` + `fresh_provider_search_performed` + `degraded_reason`. The agent must declare honestly based on what actually happened.
- **B18 — audit-validate.yml post-run validator.** Cross-checks declared `evidence_mode` against the audit JSONL. Applies `research-pass` on clean runs.
- **B19 → B19c — research-doc structural correctness + gap-loop verifiability + bot-PR approval bypass + live-evidence forensics.** Iterative hardening landed across a string of PRs after the first end-to-end runs surfaced specific failure modes.
- **B22 — Pocket Watch calibration.** Threshold lowered 0.85 → 0.65 after empirical data showed OBJECTIVE-vs-EXECUTIVE-SUMMARY cosine lands at ~0.70 even when the agent stays on topic (synthesis adds findings/citations that dilute cosine). Full reasoning in [`agentic-sdlc.md`](agentic-sdlc.md) §13 B22.
- **B25 — A.false-audit-fabrication defense.** Both agents (this one and prd-agent) got the new audit-chain verify CI step + chain-forgery-detected label + chain-ladder writer + `audit-verify-chain` Skill. WHY-phase chain root + per-event hashes are now re-verified pre-merge.

**Latest clean run:** PR #103 (`OKR-2026Q2-IMDB-001-celeb-api`, runId `WHY-2026-05-21-slkfsk`). 9 hash-chained audit events. Pocket Watch cosine 0.7420. 30 sources cited (S1–S59 nonconsecutive). 7 formal conclusions. 4/4 brief topics covered. Audit verdict `ok` on first try.

---

## Open questions (WHY-specific)

- **Refresh policy for sources.** Should a research-doc's score decay when cited URLs go dead? Could fold into the Architecture pillar of the BAR scorecard. Not v1; track for later.
- **Caching same-query Tavily/arXiv/USPTO/HN responses.** Same query within 24h returns cached results — saves cost; mark cached results in audit (`cache_hit: true`). Recommendation: TTL 24h, configurable per-run. Not v1.
- **`research-runner` runtime resolution gap (DEFERRED).** PR #105 surfaced a sandbox where `npx @maintainabilityai/research-runner` resolved for WHY but not HOW. Skipped per user direction; the B25 defenses catch any future fabrication regardless of cause. Full context: [`agentic-sdlc.md`](agentic-sdlc.md) §14.9.

---

## Looking ahead

When the **codebase-archaeology research mode** ([futurethoughts §1](agentic-sdlc-futurethoughts.md#1-archaeology-research-mode--code-grounded-why-phase)) lands, the same agent gains a second mode that swaps the four-provider web search for tree-sitter code analysis. Same audit chain, same Knight's Seal, same 10-section output structure with `evidence_mode: code` instead of `live`. The mesh-grounding stays — only the source evidence flips from web to code.

---

**Companion docs:** [agentic-sdlc.md](agentic-sdlc.md) (index) · [prd](agentic-sdlc-prd.md) · [codedesigner](agentic-sdlc-codedesigner.md) · [futurethoughts](agentic-sdlc-futurethoughts.md)
