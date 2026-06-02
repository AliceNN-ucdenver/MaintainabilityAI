# Pocket Watch Alignment Rail - contrastive v2 design

> Status: proposed improvement, 2026-06-02.
>
> This document sits beside `next-acts-tier-2-and-3.md`. It does not replace
> Oracle rails, groundedness, or Caterpillar's Challenge. It corrects the
> brittle absolute-cosine Pocket Watch gate currently used by the WHY/HOW audit
> workflows and defines how the improved signal should surface in Looking Glass
> cards and exported audit reports.

## Why this exists

Pocket Watch already has a clear job in the system:

> Did this phase artifact stay on the OKR's mission?

Groundedness answers a different question:

> Are the artifact's claims supported by the evidence it cites?

The latest WHY cert runs showed the distinction sharply. The groundedness rail
was doing useful advisory work, while Pocket Watch failed a good-on-topic WHY
artifact because the absolute cosine landed at `0.5822 < 0.65`. Local analysis
showed the same artifact still beat the nearest foreign objective by roughly
`+0.25` and `1.78x`. The embedding ranked correctly; the absolute threshold was
the brittle part.

The v2 design therefore changes the question from:

```text
Is cosine(objective, artifact_scope) above a global threshold?
```

to:

```text
Does this artifact match its own OKR better than plausible alternative OKRs?
```

That is the core improvement: use embeddings for ranking, where they are stable,
not as a globally calibrated absolute score.

## Current system, as shipped

Pocket Watch is currently implemented inside the per-agent audit workflows:

| Phase | Workflow | Current Pocket Watch primitive | Current UI/export path |
|---|---|---|---|
| WHY | `market-research-agent.yml` | OKR objective vs `research-doc.md ## Executive Summary` | audit PR comment row parsed by `LookingGlassPanel.parseDriftRow`; phase card chip |
| HOW | `prd-agent.yml` | OKR objective vs `prd.md ## Problem Statement` | audit PR comment row parsed by `LookingGlassPanel.parseDriftRow`; phase card chip |
| WHAT | `code-design-agent.yml` | report-only calibration placeholder today | audit comment row only, not a calibrated gate |

Caterpillar's Challenge is separate. It checks cross-phase continuity:

| Phase | Caterpillar primitive |
|---|---|
| HOW | `prd.md ## Problem Statement` vs merged WHY `research-doc.md ## Executive Summary` |
| WHAT | code-design artifact vs merged PRD context, currently still being calibrated |

Oracle rails are also separate. They govern evidence entering the Hatter chain:
PII, injection, and groundedness reports under `okrs/<id>/audit/rails/`.
Pocket Watch is not an Oracle rail. It is an alignment/drift rail over the OKR
contract and phase artifact.

> **Verify the live threshold before building.** Run #197 degraded at
> `cosine < 0.65`, but the `Pocket Watch goal-drift` step's own comment in
> `market-research-agent.yml` still reads *"Pass: cosine ≥ 0.85"* — a stale
> comment that contradicts the runtime gate. Confirm the actually-configured
> value and fix the comment when v2 lands, so the "legacy threshold" we log for
> continuity is the real one.

## Non-goals

- Do not replace groundedness. A document can be grounded but off mission.
- Do not replace Caterpillar. Pocket Watch checks current artifact vs OKR;
  Caterpillar checks current artifact vs prior phase.
- Do not use an LLM-as-judge as the hard gate. LLM judgments can be advisory
  diagnostics later, but the gate must remain replayable and explainable.
- Do not treat one absolute embedding cosine as truth.
- Do not add title/premise or claim-grounding semantics here. That belongs to
  the groundedness rail.
- Do not invent a signed event in the app. Any durable workflow report must use
  workflow-origin semantics, replayable by the exporter, not hand-signed.

## Design decision

Pocket Watch v2 is a deterministic, contrastive alignment rail:

1. Build a canonical OKR intent text.
2. Build a phase-specific artifact scope text.
3. Compare the artifact scope against its own OKR objective and a fixed basket
   of plausible decoy objectives.
4. Pass when the own OKR ranks first with a healthy margin.
5. Degrade or mark needs-review when the artifact ranks closer to another OKR,
   has a low margin, or misses deterministic objective anchors.

The old absolute cosine remains logged for continuity but stops being the
primary gate once v2 is certified.

## Inputs

### OKR intent text

The OKR intent text should be canonical and deterministic. It is not the raw
`okr.yaml` pasted into one string. It is a stable rendering of fields that
matter to alignment:

```text
Objective: <objective.description or objective.name>
BAR: <affectedBarIds[]>
Target repos: <objectiveAlignment.targetCodeRepos[]>
Key results: <keyResults[].description/name if present>
Constraints: <governance tier, security/privacy/fairness constraints if present>
Out of scope: <optional mesh-configured exclusions>
```

The renderer must sort array fields and omit missing fields rather than using
random YAML order. This makes the input hash stable.

### Phase artifact scope

Do not embed the entire artifact. Use the sections that carry the phase's
mission signal and omit bulky evidence tables where citations and source lists
dilute alignment.

| Phase | Scope sections |
|---|---|
| WHY | `Executive Summary`, `Formal Conclusions`, `Recommendations` |
| HOW | `Problem Statement`, `Goals / Non-Goals`, `Functional Requirements`, `Security Requirements` |
| WHAT | `Problem Restatement`, `Design Rationale & Research Traceability` |

For WHAT, deliberately **exclude `Project Structure` and the per-repo change
summary**: file/structure listings are the WHAT-phase analog of WHY's bulky
evidence tables — they're dominated by paths and identifiers that dilute the
mission signal exactly as citation lists do. Keep the scope to the mission-
bearing prose (what problem this design solves and why), not the inventory of
what it touches.

If a section is missing, record it in the report and fall back to PR title/body
only as a named degraded scope source. A missing section should not silently
produce a low score.

### Decoy basket

The decoy basket is what makes the rail contrastive.

Preferred sources, in order:

1. Sibling OKRs from the same mesh, same BAR, current quarter or active status.
2. Other active OKRs in the same mesh when same-BAR siblings are unavailable.
3. Mesh-configured fixed decoys from `.caterpillar/drift/pocket-watch-decoys.yaml`.
4. Built-in hard decoys only when the mesh has fewer than two usable OKRs.

The basket is deterministic:

- Exclude the current OKR.
- Sort by `(bar overlap desc, active/current status desc, okr_id asc)`.
- Cap at a small fixed count, for example 8 decoys.
- Include every decoy's `okr_id`, input hash, objective text hash, cosine, and
  rank in the report.

If a sibling OKR is genuinely similar, a small margin is not necessarily a
failure. That case is valuable signal: the OKRs may be overlapping or the
artifact may be too generic. It should render as `needs_review` until the team
chooses a stricter policy.

## Secondary deterministic anchor check

Contrastive rank should be the primary signal, but a cheap anchor floor catches
cases where embeddings remain high because the prose is generally topical while
the artifact forgot a hard objective constraint.

Extract anchors from:

- target repo slugs and product nouns, for example `movie-api`
- key feature nouns in the objective, for example `recommendations`
- explicit constraints, for example `no new PII`, `fairness`, `bias`, `privacy`
- BAR ids and domain nouns when present

Rules:

- Critical anchors: target repo/product nouns and the main feature noun.
- Important anchors: constraints and key-result nouns.
- Do not fail on stop words, years, generic AI/SDLC words, or source names.
- Record missing critical anchors distinctly from low semantic margin.

Anchor coverage is not a standalone gate because synonyms exist. It is a floor
and an explanation aid.

## Scoring and verdict

Pocket Watch v2 computes:

Worked from the #197 calibration run (the `nearest_decoy` here is a *synthetic*
calibration control — production decoys are sibling OKRs, so the real value will
differ):

```json
{
  "own_score": 0.5822,
  "nearest_decoy_score": 0.3279,
  "nearest_decoy_okr_id": "OKR-...",
  "rank": 1,
  "margin": 0.2542,
  "ratio": 1.78,
  "absolute_score": 0.5822,
  "anchor_coverage": {
    "critical_total": 2,
    "critical_present": 2,
    "important_total": 3,
    "important_present": 2,
    "missing": ["fairness"]
  }
}
```

**Rank is the primary signal; margin is secondary and explanatory.** `own_rank == 1`
is an *ordinal* fact — it survives register, length, and even embedding-model
drift (all vectors shift together, so the ranking holds even when absolute
cosines move). The margin is a *scalar on the same compressed embedding scale*
that defeated the absolute threshold, so it is NOT threshold-free: it just moves
the brittle knob from "is 0.58 big enough?" to "is +0.10 big enough?". Treat the
margin as advisory/explanatory, not the gate.

Crucially, **the margin's meaning depends entirely on decoy strength.** Weak,
unrelated decoys produce large margins (an off-topic decoy sat at ~0.19 in
calibration, margin ~0.4) that pass trivially; strong same-BAR sibling OKRs
produce small margins near zero — exactly the regime that matters most, where a
fixed `0.10` gets brittle again. So a global margin constant is the wrong design.

Initial advisory thresholds:

| Signal | Advisory interpretation |
|---|---|
| `rank == 1` and margin above the per-mesh band | aligned |
| `rank == 1` and margin inside the per-mesh band | needs-review: similar sibling or generic artifact |
| `rank > 1` | drift: another OKR is a better match |
| critical anchor missing | needs-review, or fail once promoted |
| absolute score low but rank/margin healthy | pass with note; absolute score is not the gate |

"Per-mesh band" is deliberate: there is **no global margin constant** (the
`+0.10` used illustratively earlier is only an example, never a shipped default).
The real band must be **calibrated per-mesh from the observed distribution of
own-vs-sibling margins** across cert runs, because what counts as a "healthy"
gap is a function of how distinct that mesh's OKRs actually are.

Once certified, the hard gate should be:

```text
PASS when own_rank == 1 AND margin >= per_mesh_calibrated_band AND no critical anchor miss.
NEEDS_REVIEW when own_rank == 1 but margin is inside the per-mesh band OR non-critical anchors are missing.
FAIL when own_rank > 1 OR a required critical anchor is missing in required mode.
```

This keys the gate on the robust ordinal (`rank == 1`) first and uses margin
only to separate "clearly aligned" from "ambiguous between overlapping OKRs."
It is intentionally more explainable than the old `cosine < 0.65` rule, and it
does not re-introduce a single global magic number.

## Workflow integration

### Phase 1 - advisory sidecar in existing audit jobs

Update the existing `Pocket Watch goal-drift` steps in:

- `vscode-extension/code-templates/workflows/market-research-agent.yml`
- `vscode-extension/code-templates/workflows/prd-agent.yml`
- later, the calibrated drift step in `code-design-agent.yml`

Outputs should include the old fields plus v2 fields:

```text
passed=true|false|skipped
mode=contrastive-v2
status=pass|needs_review|fail|skipped
own_score=<float>
absolute_score=<float>
nearest_decoy_score=<float>
nearest_decoy_okr_id=<id>
rank=<int>
margin=<float>
ratio=<float>
critical_anchor_misses=<csv>
reason=<human-readable>
```

**The moment v2 advisory ships, the legacy absolute cosine stops being a merge
blocker.** This is non-negotiable, not a config toggle: the entire feature
exists because `0.5822 < 0.65` falsely degraded a good, on-mission artifact, so
leaving that exact failure mode armed "until the existing absolute gate is
deconfigured" would keep shipping the bug we are fixing. On the advisory build
the absolute score becomes **logged-only** — recorded for old-vs-new comparison,
never gating. (If a hard floor is wanted before the contrastive gate is
certified, it may run only as an **emergency floor set far below the on-goal
band** — e.g. catch a near-zero ~0.2 "totally off-topic" artifact — never at the
0.6-ish level that the on-goal band actually occupies.) The contrastive `status`
is the only alignment signal that can degrade a verdict once it is promoted.

During calibration the PR comment renders both, with the absolute clearly marked
non-gating:

```markdown
| Pocket Watch alignment | ✓ rank #1, margin +0.25 (own 0.58 vs nearest OKR-X 0.33) |
| Pocket Watch absolute cosine | logged-only: 0.58 (retired threshold 0.65, no longer gates) |
```

### Phase 2 - promotion to gate

After several cert runs show stable separation, flip the gate from absolute
threshold to contrastive status:

- `fail` applies `goal-drift-detected`.
- `needs_review` is configurable by governance tier:
  - autonomous: degrade until accepted or rerun
  - supervised: warning row plus no pass label until human accepts
  - restricted: advisory only, because human review is already required

Do not promote until the audit comments and Looking Glass cards show enough
real portfolio data to justify the margin threshold.

### Phase 3 - durable report and export integration

Today the UI reads Pocket Watch from the audit PR comment. That is enough for
phase cards, but not enough for auditor-grade export. The durable design should
mirror the Oracle rail lesson:

- PR audit job computes the v2 signal for gating.
- Finalize reruns the same v2 computation on merged bytes.
- Finalize writes a report under:

```text
okrs/<id>/audit/drift/<runId>.pocket-watch.json
```

- The report includes:
  - schema version
  - phase, okr_id, run_id, pr_number, merge_commit_sha
  - input hashes for OKR text, artifact scope, decoy objectives, config
  - model id
  - absolute score
  - contrastive decoy table
  - rank/margin/ratio
  - anchor coverage
  - verdict/status/reason

This report should be workflow-origin and replayable. If a new audit event is
added, prefer to **generalize the existing report-pointer pattern** (the Oracle
rails already point at a committed report via `report_path` + `report_sha256`)
rather than minting a new `drift_decision` event kind — fewer chain-shape
variants for the verifier to reason about. Do not put Pocket Watch into the
"Oracle rails (evidence boundary)" section; it is an alignment rail, not an
evidence-boundary rail.

### Replay & determinism (the two non-obvious hazards)

A contrastive rail has two determinism hazards an absolute-cosine rail does not.
Both must be handled or the rail's "replayable" claim is weaker than the
groundedness rail's.

**1. The decoy basket is non-stationary — pin it into the report.** The basket is
derived from "sibling OKRs in the mesh," but OKRs are added and retired over
time. So the basket at PR-time, at finalize-time, and at replay-time months
later can differ — and a *new sibling OKR landing* could flip `rank`/`margin`
with no tampering at all. Therefore the verdict is reproducible only if the
**exact basket used at decision time is frozen into the report** (every decoy's
`okr_id` + its objective-text hash) and **finalize/replay re-use the recorded
basket, not the live mesh.** This is the contrastive analog of `config_sha256`
pinning: replay re-runs the pinned inputs, it does not re-derive them from
current state. (Re-deriving from the live mesh would make every basket change
look like a tamper.)

**2. The embedding model is hosted and not revision-pinnable.** The groundedness
rail pins `model_revision` + `require_pinned_revision`; GitHub Models
`text-embedding-3-small` exposes no such revision, so the hosted model can shift
under us and move absolute cosines (and therefore margins). Record the `model_id`
and treat a model shift as a *legitimate replay mismatch* (the same posture
groundedness takes for a config change), not a tamper. The mitigation is the
same reason rank is the primary signal: **an ordinal `rank == 1` is far more
robust to model drift than any absolute cosine or margin**, because a uniform
model shift moves own and decoy vectors together and the ranking is preserved.
A future option is to snapshot the decoy *embeddings* (not just their text
hashes) into the report so replay is byte-exact even across model versions — at
the cost of a larger report.

## UI integration

Looking Glass already parses the audit PR comment for drift rows:

- `fetchPhaseSignal(...)`
- `parseDriftRow(...)`
- WHY/HOW phase cards show `Pocket Watch` and `Caterpillar` chips.

The v2 UI should keep that flow but improve the chip text:

```text
Pocket Watch ✓ rank #1 +0.25
Pocket Watch ⚠ rank #1 +0.04 (similar OKR)
Pocket Watch ✗ rank #2 (nearest: OKR-...)
```

The phase card should keep the old cosine available in tooltip/detail text:

```text
own 0.5822 vs nearest 0.3271; legacy absolute threshold 0.65 would have failed
```

When the drift label is present, the "Revise" prompt should name the reason:

- `another OKR matched better`
- `margin too narrow`
- `critical anchor missing: movie-api`
- `models endpoint skipped`

Do not collapse Pocket Watch into Oracle rail badges. The user should see three
distinct dimensions:

- evidence boundary: Oracle rails
- OKR alignment: Pocket Watch
- cross-phase continuity: Caterpillar

## Export Audit Report integration

### Per-action report

The per-action export should grow a small `## Drift and alignment` section when
Pocket Watch evidence is available:

```markdown
## Drift and alignment

| Check | Result |
|---|---|
| Pocket Watch | PASS - own OKR ranked #1 by +0.25 |
| Own score | 0.5822 |
| Nearest decoy | OKR-... at 0.3271 |
| Critical anchors | 2/2 present |
| Legacy absolute cosine | 0.5822 (logged only) |
| Caterpillar | PASS - prior phase continuity preserved |
```

The section should cite the committed drift report if Phase 3 has landed:

```text
okrs/<id>/audit/drift/<runId>.pocket-watch.json
```

Until durable reports exist, the exporter can show "not captured in export;
see audit PR comment" rather than trying to reconstruct from comments.

### Whole-OKR rollup

The whole-OKR rollup should add a compact section after `Phase rollup` or near
`Oracle rails`, but under its own heading:

```markdown
## Pocket Watch alignment

| Phase | Status | Own rank | Margin | Nearest decoy | Critical anchors |
|---|---|---:|---:|---|---|
| WHY | PASS | 1 | +0.25 | OKR-X | 2/2 |
| HOW | NEEDS REVIEW | 1 | +0.04 | OKR-Y | 3/3 |
| WHAT | not calibrated | - | - | - | - |
```

Verdict precedence once required:

1. A required Pocket Watch `fail` participates in rollup `FAIL`.
2. An advisory or uninvoked Pocket Watch result never creates a green lie:
   render it as `PARTIAL` or `not invoked`, depending on mode.
3. The exporter and `computeOkrRollupVerdict` must read the same status helper,
   following the Red Queen and Oracle rails honesty lesson.

## Relation to Caterpillar

Pocket Watch and Caterpillar should eventually share the same contrastive helper
library, but they should keep different semantics:

| Rail | Question | Decoys |
|---|---|---|
| Pocket Watch | Does this artifact stay on its own OKR? | sibling OKR objectives |
| Caterpillar | Does this phase preserve the prior phase? | prior phase plus optional sibling phase artifacts |

Do not replace Caterpillar with Pocket Watch. A HOW PRD can match the OKR while
dropping a specific research finding from WHY. That is a Caterpillar failure,
not necessarily a Pocket Watch failure.

## Acceptance criteria

### Advisory build

- WHY audit comment renders contrastive Pocket Watch row.
- HOW audit comment renders contrastive Pocket Watch row.
- The old absolute cosine is logged but no longer the only explanation.
- Looking Glass phase cards parse and show rank/margin chips.
- Cert run that previously had `own=0.58`, `nearest=0.33` renders aligned,
  not failed, when contrastive mode is advisory.
- Query/model failures still skip visibly; no silent pass.
- Tests cover:
  - own ranks #1 with healthy margin
  - own ranks #1 with narrow margin
  - foreign OKR ranks #1
  - critical anchor missing
  - no sibling OKRs fallback to fixed decoys
  - model endpoint unavailable

### Required-gate build

- Required mode fails PR only on contrastive fail or critical anchor miss.
- `goal-drift-detected` label reason names the contrastive failure.
- Audit comment includes enough detail to revise without reading logs.
- Whole-OKR rollup cannot PASS when a required Pocket Watch report fails.

### Durable export build

- Finalize writes `audit/drift/<runId>.pocket-watch.json`.
- Per-action export renders the drift report.
- Whole-OKR rollup renders a per-phase Pocket Watch table.
- Exporter re-derives input hashes from committed bytes and refuses to trust a
  report whose hashes or phase identity do not match.

## Implementation notes

Recommended source layout:

```text
packages/research-runner/src/runner/drift/
  pocket-watch.ts             # pure contrastive scorer
  objective-renderer.ts       # canonical OKR/phase text extraction helpers
  anchors.ts                  # deterministic anchor extraction

vscode-extension/code-templates/workflows/
  market-research-agent.yml   # WHY v2 advisory row
  prd-agent.yml               # HOW v2 advisory row
  code-design-agent.yml       # WHAT calibration path

vscode-extension/src/webview/LookingGlassPanel.ts
  parseDriftRow / phase-card chip improvements

vscode-extension/src/services/AuditReportExporter.ts
  future durable report rendering + rollup verdict integration
```

Keep the scorer pure. The workflow should be the only place that calls the
embedding endpoint. The scorer receives vectors, decoys, and anchor sets and
returns a discriminated status object. That keeps unit tests independent of
GitHub Models and keeps the failure shapes named.

## Open questions

1. What default decoy basket should a brand-new mesh with one OKR use?
2. Should autonomous-tier `needs_review` block immediately, or remain advisory
   until the contrastive rail has a cert run?
3. Should WHAT get a calibrated contrastive Pocket Watch before Caterpillar is
   fully calibrated, or should both drift checks ship together?
4. *(Leaning resolved — see "Replay & determinism" above.)* The design now
   recommends **generalizing the existing report-pointer pattern** (`report_path`
   + `report_sha256`) over minting a new `drift_decision` event kind. Residual
   question: does the generalized pointer need any alignment-rail-specific field,
   or does the existing shape suffice as-is?
5. Should fixed decoys live in mesh config or extension defaults?

## Summary

Pocket Watch v1 asked a brittle absolute-threshold question. Pocket Watch v2
asks a more audit-useful contrastive question:

> Does this artifact match its own OKR better than the nearby alternatives?

The design preserves the system's hard-won honesty rules:

- advisory first
- deterministic inputs
- named failure shapes
- no opaque LLM judge as a hard gate
- UI explains the failure path
- exported reports re-derive bytes before trusting stored verdicts

That corrects the false-positive class without weakening the alignment guard.
