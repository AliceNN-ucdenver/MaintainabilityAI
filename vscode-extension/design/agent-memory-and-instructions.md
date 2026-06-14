# Agent memory & instructions — cross-agent instruction layer + governed learning loop

> **Status (2026-06-14): DESIGN, not built.** This is the design capture for the
> "agents that learn" / "Agent roster and policy learning" cards in
> [`red-queens-court.md`](../../site-tw/public/docs/red-queens-court.md) and is
> proposed as **Queen's Next Act slice (e)** alongside (b)(c)(d) in
> [`next-acts-tier-2-and-3.md`](next-acts-tier-2-and-3.md). No code yet; this
> doc fixes the shape so the build is reviewable. Backed by a web/literature
> research pass (citations in the References section).

## Why this doc

The marketing promises a learning loop: *"the Red Queen will build agent memory —
which policy rules fire most, which prompt packs resolve issues on the first pass,
which repos keep violating the same contracts. That memory will feed back into
policy refinements."* And separately: *"Auditors need to know which agents exist,
what they are allowed to touch, and which rules they keep hitting."*

We use **GitHub Copilot coding agents** for implementation (fan-out + Alice) and
custom planning agents (WHY/HOW/WHAT) on the mesh side. The open question was
whether a `copilot-instructions.md` + `instructions/<named>.instructions.md`
approach is viable and broader across all our agents, how to capture learnings,
and what to capture per agent. This doc answers all three.

## The core reframe — two layers, kept separate

The single most important decision: **instructions and learning memory are two
different layers**, and the loop only works if a learning is *promoted into* an
instruction through a reviewed pipeline — never auto-injected.

| Layer | What it is | Authored by | Lives in | Gates behavior? |
|---|---|---|---|---|
| **1 · Instructions** | static, human-readable directives | humans (+ promoted learnings) | git-tracked markdown / `policy.json` | yes |
| **2 · Learning memory** | accumulated experience across runs | the system, distilled from runs | audit chain → candidates → (after review) layer 1 | only after promotion |

Vendor auto-memory (Cursor "Memories", Claude auto-memory, Windsurf "Cascade
Memories") is **single-tool and machine-local — not git-shared**. Every vendor
tells you to *promote* a learning into a Rule/AGENTS.md to make it durable and
shared. So the cross-agent learning loop is **ours to own**, which is good: it
makes learnings diffable, signed, and reviewable — exactly our governance ethos.

---

## Layer 1 — the instruction-file architecture (viable; portable)

**Answer to "is the copilot-instructions approach viable?": yes — and lead with
`AGENTS.md` as the cross-tool spine, with the Copilot `*.instructions.md` files
as a path-scoped overlay.**

The Copilot **coding agent** (the autonomous PR agent we use, not just IDE chat)
reads, in priority order: `/.github/copilot-instructions.md` (repo-wide),
`/.github/instructions/**/*.instructions.md` (each with a YAML `applyTo:` glob),
`**/AGENTS.md` (nearest-wins nesting), and `/CLAUDE.md`. Repo-wide and
path-specific are **additive, not override**.

The portable shape across our whole agent fleet:

| Layer | File | Scope mechanism | Read by |
|---|---|---|---|
| **Shared spine** | `AGENTS.md` (root + nested per subproject) | directory nesting, nearest-wins | Copilot coding agent, Codex, Cursor, Windsurf |
| **Copilot path overlay** | `.github/instructions/<name>.instructions.md` | `applyTo:` glob (+ `excludeAgent` to split coding-agent vs review) | Copilot coding agent + code review |
| **Claude spine import** | `CLAUDE.md` → `@AGENTS.md` | dir-tree walk + `@path` import | Claude Code |

### What changes in our scaffold

We already write `.github/agents/AGENTS.md` per repo (`generateAgentsMd()` /
`RedQueenService.generateAgentsMd()`, ~`config-scaffold.ts:1392`). Today it's
governance-tier text. The change:

1. **Promote `AGENTS.md` to the spine** at the repo root (not only
   `.github/agents/`), carrying: governance tier + scope (from the Red Queen
   decision), repo conventions, and a clearly delimited **promoted-learnings
   block** (see Layer 2).
2. **Add `.github/instructions/<name>.instructions.md`** for path-scoped rules the
   spine's nesting can't express (e.g. `applyTo: "src/auth/**"` security rules,
   `applyTo: "**/*.test.*"` test conventions). Scaffolded from the same mesh data.
3. **Keep `policy.json` `customRules[]`** as the *deterministic, machine-enforced*
   instruction surface (the PreToolUse hook reads it). Natural-language learnings
   land in `AGENTS.md`/`.instructions.md`; enforceable rules land in `customRules`.

**Caveat to bank:** the `excludeAgent` literal is mid-rename
(`coding-agent`/`cloud-agent`) — verify against the live repo before relying on
it. There is no documented hard size limit for Copilot instruction files (only a
"keep it ~2 pages" guideline for auto-generated ones) — assume practical
context-window limits.

---

## Layer 2 — the governed learning loop

### Memory taxonomy, mapped to us

The field (CoALA; the memory survey) converges on three functional types. Mapped:

| Type | Definition | Our analogue |
|---|---|---|
| **Episodic** | a specific past event/experience | a single Red Queen allow/deny/override; one remediation trajectory; a PR diff + CI outcome |
| **Semantic** | distilled facts abstracted from episodes | repo conventions, recurring-violation facts, threat patterns, "this service always validates ownership" |
| **Procedural** | reusable skills / rules / workflows | prompt packs, remediation playbooks, `customRules`, scaffold templates |

The repeated research finding: **capturing episodes is cheap and near-useless
alone; the value comes from a reflection/distillation step** that turns episodes
into semantic facts or procedural rules. Most homegrown "agent memory" fails by
logging episodes and never distilling.

### What we already have vs. what's missing

- **Have (episodic):** `.redqueen/audit-log.jsonl` — per-decision allow/warn/deny/
  override with `ruleId`, path, tier, `approvalSource`, `bypassedRuleId`
  (`audit-logger.ts`, `auditJsonlParser.ts`). High-grade signal, already
  audit-adjacent.
- **Have (procedural, manual):** `.caterpillar/prompts` (mesh) + `.cheshire/prompts`
  (repo) packs; `policy.json` `customRules[]` (commented literally as
  "institutional memory… teams add entries as it grows", `policy-engine.ts:143`).
- **Have (declared, unused):** OKR `valueLearning[]` (`okr.ts:207,301`) — schema
  exists, but **nothing populates it** (no reflection step).
- **Missing:** the distillation step; the promotion-to-instruction pipeline;
  provenance / review-state / freshness on any learning; the agent roster.

### What to capture, per agent (ranked by signal)

| Agent | Highest-signal learnings | Type | Promote into |
|---|---|---|---|
| **Red Queen** (PreToolUse hook) | **override events** (= human-labeled "rule wrong/too strict here"); **repeated denials of the same rule/path** | episodic → procedural | `customRules` (enforceable) or `.cheshire/prompts` (repo); cross-repo patterns → `.caterpillar` |
| **Alice** (maintenance) | failed-then-fixed trajectories; recurring CodeQL class → playbook | episodic → procedural | `.cheshire/prompts/<category>` + repo `AGENTS.md` / `.instructions.md` |
| **market-research (WHY)** | which providers/queries yielded *kept* sources; groundedness/contradiction-rail flags | semantic | `.caterpillar/prompts/research` + `valueLearning` |
| **prd (HOW)** | which persona rounds kept reopening; recurring SR / STRIDE gaps | semantic | `.caterpillar/prompts/prd` |
| **code-design (WHAT)** | recurring contract-coordination mistakes; per-repo brownfield discovery debt | semantic/procedural | repo `AGENTS.md` + `.caterpillar` |
| **all / roster** | identity, owner, model, **prompt hash**, access scope, repeated failures | semantic (about agents) | the Looking Glass "Agent roster" view |

**Override and violation events are the training data.** Reflexion, case-based
reasoning, and Constitutional-AI all say the same: a denial/override is the
labeled signal — "the agent did the wrong thing" or "the rule was wrong here."
This is exactly the marketing promise ("which policy rules fire most… which repos
keep violating the same contracts… feed back into policy refinements").

### The learning-record schema

Every learning — whether auto-distilled or human-entered — carries:

```yaml
id: <stable id>
type: episodic | semantic | procedural
scope: mesh | repo:<slug>
content: <NL lesson, or a customRule body, or a prompt-pack delta>
trigger: <when this applies — e.g. applyTo glob, ruleId, repo, phase>
provenance:
  source: redqueen-decision | pr | reflection | human
  run_id / decision_id / pr_url: <...>
  parent_memory_ids: [...]
evidence:
  success_trajectory: <...>
  failure_trajectory: <...>
review_state: proposed | approved | rejected
approver: <did / handle>
freshness:
  created: <iso>
  last_validated: <iso>
  expiry_or_decay: <policy>
links: [rule:<id>, cwe:<id>, module:<path>, decision:<id>]
```

(Union of A-MEM's note fields + CBR's case structure + the security literature's
provenance/review requirements.)

### The promotion pipeline (the part teams skip)

```
episode  (auto: audit-log.jsonl / PR diffs / phase audit events)
  → reflect / distill  (compare success vs failure; extract insight — ExpeL-style)
  → candidate learning  { review_state: proposed, provenance, evidence }
  → HUMAN / agent REVIEW in Looking Glass        ← the gate
  → approved → promote into  AGENTS.md / *.instructions.md / customRules / prompt pack
            → emit a signed audit event for the promotion (Knight's Seal)
```

Use **ACE-style structured incremental edits** when promoting into a file (append/
patch the delimited learnings block) — never wholesale-rewrite, to avoid "context
collapse" (auto-summarization eroding the domain detail that made the memory
useful). Run a **conflict/staleness check** so a new learning that contradicts an
existing rule is *flagged*, not silently overwritten.

### Storage substrate — decided

| Substrate | Use it for | Why |
|---|---|---|
| **Static markdown in git** (default for anything that gates) | approved rules, repo conventions, remediation playbooks, prompt packs | diff + PR review + provenance (git blame) + determinism — what governance needs above all |
| **Vector / embedding cache** (optional, later) | the raw episode/case bank, retrieved as *few-shot examples* | fuzzy recall over large history — **never as authority** |
| **Graph** (optional, much later) | multi-hop provenance: rule ↔ CWE ↔ module ↔ decision ↔ override | relationship queries an audit-backed mesh will eventually want |

Authoritative, behavior-gating memory stays in **git-tracked files**. A learning
*starts* as an episode (audit log / optional vector case), gets distilled +
reviewed, and *graduates* into a markdown rule or a `customRule`.

---

## Where memories live — two tiers (matches `.caterpillar` / `.cheshire`)

- **Mesh memories — `.caterpillar/` — human-curated via Looking Glass.**
  Cross-repo/org learnings: policy refinements, threat patterns, prompt-pack
  improvements, the agent roster. The Looking Glass is already the mesh editor;
  add a **memory pane** that surfaces `valueLearning[]` + proposed candidate rules
  as the human-in-the-loop review/approval surface. This is the home for
  human-entered **mesh** memories.
- **Repo memories — `.cheshire/` + repo `AGENTS.md` / `.instructions.md`.**
  Repo-specific conventions, recurring violations, remediation playbooks. Home for
  human-entered **repo** memories.

This is the existing split: `.caterpillar` (mesh, cross-cutting/semantic) vs
`.cheshire` (code repo, local/procedural) — do not cross them.

## The agent roster (the other half of the card)

A read model, not a learning loop: enumerate every agent from its `.agent.md`
(identity, owner, model/target, `max_tokens`, tools), join the **prompt hash**
(ties to planned T3-5 prompt-pack signature verification), the **access scope**
(from `policy.json` tier + path restrictions), and **repeated policy failures**
(aggregated from `audit-log.jsonl` by `ruleId`/agent). Render in Looking Glass so
an auditor sees "which agents exist, what they're allowed to touch, and which
rules they keep hitting."

## Safety & trust posture (non-negotiable)

1. **Memory poisoning is a distinct security class** (MINJA): a poisoned memory is
   recalled every future run, and once distilled into a rule its lineage to the
   bad source is often lost. A poisoned guardrail rule is worse than no rule.
2. Therefore every learning carries **provenance + review_state + freshness**, and
   **no auto-extracted memory gates behavior un-reviewed**.
3. A **promotion is a signed audit event** — it slots into the Knight's Seal model
   like any other governed action, so "why does this rule exist?" is answerable
   from the chain.
4. Source-allowlist what can become a candidate (audit log + our own PRs), not
   arbitrary text the agent ingested.

---

## Phased build plan (sketch)

- **E1 — Roster (read-only, low-risk).** Looking Glass "Agent roster" view from
  `.agent.md` + `policy.json` scopes + `audit-log.jsonl` aggregation. Ships the
  visible half of the marketing card with zero learning-loop risk.
- **E2 — Populate `valueLearning[]`.** A post-OKR reflection step writes per-phase
  insights (semantic) with provenance — no promotion yet, just capture + display.
- **E3 — Override/denial reflector.** Aggregate `audit-log.jsonl`; surface
  "repeated denial of rule X on path Y" and override events as **proposed**
  candidate `customRule` / prompt-pack deltas in the Looking Glass memory pane.
- **E4 — Promotion pipeline + signed event.** Human approve → ACE-style
  incremental write into `AGENTS.md` / `.instructions.md` / `customRules` /
  prompt pack → emit a signed `memory_promoted` audit event; conflict/staleness
  check on write.
- **E5 — Spine migration.** Move scaffold to root `AGENTS.md` spine +
  `.github/instructions/*.instructions.md` overlay + `CLAUDE.md` `@AGENTS.md`
  import; carry the promoted-learnings block.
- **E6+ (optional).** Vector episode cache for few-shot recall; graph memory for
  multi-hop provenance.

E1→E2→E3 deliver the marketing promise incrementally with the gate in place from
the first day a learning can touch behavior.

## Non-goals / open questions

- **Non-goal:** auto-applying learnings without human review; a cross-tool
  auto-memory standard (doesn't exist).
- **Open:** decay/expiry policy per learning type; whether `memory_promoted` is a
  new `event_kind` (origin: app/human) or rides an existing kind; how the roster's
  prompt-hash reconciles with T3-5; vector store choice if/when E6 is reached.

## References

Frameworks/taxonomy: CoALA (arXiv 2309.02427); Memory survey, TOIS 2025 (arXiv
2404.13501). Foundational: Generative Agents (2304.03442, memory stream +
reflection); Reflexion (2303.11366); ExpeL (2308.10144, cross-task insight
extraction); Voyager (2305.16291, skill library = procedural); MemGPT/Letta
(2310.08560); A-MEM (2502.12110); Mem0 (2504.19413); ACE — Agentic Context
Engineering (2510.04618, evolving playbook via structured incremental edits).
Policy/guardrail learning: Policy-as-Prompt (2509.23994, governance docs →
source-linked policy tree, provenance + HITL — closest analogue to our mesh);
Constitutional AI / RLAIF (2212.08073); CBR-for-LLM-agents review (2504.06943).
Coding-agent learning: SWE-Exp (2507.23361); AWM (2409.07429). Safety: MINJA
memory injection (2503.03704).

Instruction-file facts: GitHub Copilot coding agent reads
`copilot-instructions.md` + `.github/instructions/*.instructions.md` (`applyTo`
glob) + `AGENTS.md` + `CLAUDE.md` (GitHub docs / changelogs 2025-07-23,
2025-08-28); AGENTS.md open standard (agents.md, nearest-wins). Verify the
`excludeAgent` literal (`coding-agent`/`cloud-agent` rename) against the live repo.

## Cross-references

- [`red-queens-court.md`](../../site-tw/public/docs/red-queens-court.md) — "agents
  that learn" + "Agent roster and policy learning" cards (tightened to match this).
- [`next-acts-tier-2-and-3.md`](next-acts-tier-2-and-3.md) — Queen's Next Act; this
  is proposed slice (e).
- Memory tiers follow the `.caterpillar` (mesh) / `.cheshire` (repo) convention.
