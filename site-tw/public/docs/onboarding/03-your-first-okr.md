<div class="docs-hero docs-hero-split docs-hero-emerald">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/onboarding/">Onboarding</a><span class="sep">/</span><span>Chapter 3</span></div>
    <div class="docs-eyebrow">Chapter 3 of 4 · ~6 min walk <span class="docs-hero-meta">Run your first real OKR</span></div>
    <h1 class="docs-hero-title">Run your first real OKR</h1>
    <p class="docs-hero-copy">Pick a small, well-scoped feature. Fill out the OKR card. Click Start Why, Start How, Start What. Approve three PRs. Export the rollup. The first one always feels strange — by the third one it's just how your team works.</p>
  </div>
</div>

## Picking a good first OKR

Your first real OKR sets the calibration for everyone else who'll watch you walk it. **Make it boringly small.** Resist the urge to pick the most important thing on your roadmap — pick the most *self-contained* thing.

Good criteria for a first pick:

- **1-2 weeks of work** if a human did it solo. Smaller than you think.
- **1-2 target code repos**. Single-repo is even better. Cross-repo fan-out is BUILD-next-act territory.
- **A clear acceptance test**: a regulator or a new engineer should be able to read the objective and tell whether you delivered or not.
- **Mostly net-new code** (greenfield) or a **bounded surface area** of an existing repo (brownfield with a small blast radius). Not "refactor the auth subsystem."
- **No external dependencies** that block you for days. The agents work fast; if you spend a week waiting for an API key, you'll lose momentum.

Examples that work well:

- "Add an `/api/v1/healthcheck` endpoint that reports DB connectivity + downstream service status, exposed via the existing Express app."
- "Add a CSV-to-JSON converter Skill to our internal data-loader, with parameterized delimiter and quote-character support."
- "Add a new `RoleSelector` React component that shows the user's available roles and lets them switch session role in-place, gated on existing JWT claims."

Examples to avoid for your first:

- "Migrate everything from REST to gRPC." (Too big, too cross-cutting.)
- "Add a new microservice for X." (New service = new repo = fan-out, which is next-act.)
- "Improve performance of Y by Z%." (Hard to specify acceptance; agents need a definition of done.)

---

## Step 1 · Create the OKR card

In Looking Glass → portfolio, click **Create OKR**. The OKR detail page opens in edit mode.

Fill in:

- **Objective** — one sentence. The full Monday-morning quote we use in demos: *"Let customers see their order status in one click, without exposing other accounts."* That's the right shape: an action verb, a user outcome, an explicit constraint.
- **Key results** — 1-3 measurable outcomes. *"GET /orders/{id}/status returns 200 in p95 < 200ms"* is concrete; *"customers are happy"* is not.
- **Affected BAR** — pick from your portfolio. If this is your first OKR you may only have the sample `APP-IMDB-002`; either reuse it or scaffold a real BAR first via `Scaffold sample` (you can edit the BAR after).
- **Target code repos** — the actual repo(s) the WHAT phase will land its design issue in. Each repo gets a status badge (✓ Connected / — Not Connected / ⚠ Unreachable). For a first run, mark them all `connected`.
- **Governance tier** — leave this as **Supervised** for your first OKR. *Autonomous* gives the agent 3 self-critique rounds; *Restricted* gives it 0 and routes straight to human review. Supervised's 2 rounds is the right calibration for trust-building.

Click **Save**. The OKR card lands with status `pending` and three action slots: WHY, HOW, WHAT.

---

## Step 2 · The three human gates

This is the core of the workflow. You'll approve three PRs over the next 24-72 hours.

### Gate 1 · WHY — approve the research

Click **Start Why**. The extension creates an `okr-anchor` issue in your mesh repo and mentions the `market-research-agent` Copilot agent on it. The agent dispatches in a fresh GitHub Copilot Coding Agent session.

About 5-12 minutes later (depending on search-provider rate limits), the agent will open a PR against `main` with `okrs/<id>/why/research-doc.md`. The PR carries a Hatter Tag in the body and a per-comment audit summary.

**What to look for at this gate:**

- **The research-doc reads like real research**, not a 1990s outline of one. Does it actually cite sources? Are the conclusions defensible?
- **The audit-and-drift PR comment shows clean evidence honesty.** Look for a row like `Evidence: live · 16 sources · 0 fabrications`. If it says `degraded-evidence`, the agent said "live" but the audit chain shows 0 successful skill_calls — that's a forgery indicator, don't merge.
- **The Pocket Watch (drift gate) cosine is ≥ 0.65** between the OKR objective and the research-doc's `## Executive Summary`. Below that means the agent drifted off topic.
- **The Self-review (HOW only — WHY has no personas)** rows show Architect + Security personas converging. WHY doesn't have these — that's expected.

Click **Merge** when satisfied. The finalize-okr-action workflow runs, appends a row to `chain-ladder.yaml`, flips the WHY action to `complete`, and unlocks `Start How`.

Open Looking Glass and click the per-action **Export Report ↗** on the WHY card to get your first per-action closeout. Read it. Compare to Chapter 2's walkthrough.

### Gate 2 · HOW — approve the PRD

Click **Start How**. Same dispatch pattern: anchor issue, agent run, PR with `okrs/<id>/how/prd.md`. About 8-15 minutes typically (HOW grounds on the mesh + WHY artifact, takes longer than WHY).

**What to look for at this gate:**

- **The PRD has all 10 H2 sections** (the workflow's structural check will fail the audit if not — but eyeball anyway). Includes a `## Security Requirements` section with SR-01 / SR-02 / ... entries citing STRIDE THR-NNN refs + OWASP A0X categories.
- **The Self-review rows show two personas in two rounds each.** Architect r1 (often MINOR) → Architect r2 (PASS or MINOR). Security r1 → Security r2. Supervised tier allows 2 rounds, so if a persona is still MINOR at round 2, the PR ships with that marked.
- **Caterpillar's Challenge (cross-phase drift) cosine ≥ 0.70** between the PRD's `## Problem Statement` and the merged research-doc's `## Executive Summary`. Below threshold means the PRD wandered from what the WHY phase actually concluded.
- **`prd-pass` label is applied** — the canonical merge gate.

If a persona is at MINOR on round 2, you have three options: accept and merge (it's a "minor suggested improvement" not blocking), click **🤖 Revise with agent** to give it another bounded round, or **Reject** if the gap is substantive.

Merge when satisfied. Same finalize pattern. Unlocks `Start What`.

### Gate 3 · WHAT — approve the code design

Click **Start What**. The code-design agent grounds on **the actual code** in your target repos (brownfield mode — cloning the repo at a specific commit and reading real file contents) OR generates a scaffolding spec for repos that don't exist yet (greenfield mode — uses the `'create'` status on `targetCodeRepoStatus`).

WHAT is the heaviest gate in the pipeline. The agent reads files, plans code-level changes, runs the Architect + Security personas again with code-grounded criteria, and produces `okrs/<id>/what/code-design.md`.

**What to look for at this gate:**

- **Path citations resolve.** The workflow has a hard gate: if the design cites any file path that does NOT exist in the repo's inventory at the cloned commit, the merge fails. Eyeball a few cited paths anyway — confidence builds.
- **Self-review rounds converged to PASS.** If both personas are PASS by round 2, you're on the happy path.
- **The mode-honesty check passed.** The design's per-repo mode declaration (brownfield vs greenfield) matches what `knowledge-code` actually saw. A mismatch flips the verdict to `design-degraded`.
- **`design-pass` label is applied.**

Merge. The WHAT action flips to `complete`. The OKR is now done.

---

## Step 3 · Export the whole-OKR rollup

In the OKR detail page footer, click **📦 Export Full OKR Audit Rollup**.

The rollup writes to `okrs/<id>/audit/exports/<okrId>-rollup.md` and opens in VS Code. If everything went clean, the first line says `VERDICT: ✅ PASS — All 3 phases present, runner-verified, and source-atomic`.

This is the artifact you hand to a reviewer. It's the one document that proves your team's OKR shipped through a governed pipeline end-to-end. It is *self-contained* — every file path it cites lives in the same mesh repo, and the verifier-notes section at the bottom carries copy-pastable runner commands for re-verifying any phase from a fresh shell.

> 💡 **Pull the mesh first.** If the runner crypto verdict says `NOT INVOKED` with reason `Local mesh JSONL does not match canonical GitHub source`, run `git pull` in your mesh checkout and click Export again. The runner reads from local disk by convention; the source-atomicity guard refuses to invoke when local bytes have drifted from canonical GitHub.

---

## Day-2 patterns

Once you've shipped your first OKR, three patterns will recur:

### Pattern A · The agent's draft surprises you

The agent reads sources you wouldn't have thought to read, lands a synthesis you didn't expect, or proposes a design that's better than what you would have written. **Don't reject it just because it's not what you would have written.** Read the audit chain — if the sources are real, the reasoning traces, and the synthesis is defensible, approve.

The opposite is also true. If the agent's draft is technically clean but *strategically wrong* (off-objective, off-architecture, off-threat-model), the right move is **Reject and re-draft with adjusted prompts** rather than try to revise into shape.

### Pattern B · Persona MINOR at round 2

Common in HOW. Architect says "the PRD doesn't specify rate-limiting thresholds" or Security says "the SR for input validation doesn't name the input sanitization library." If these are genuinely *minor suggestions*, merge and add them in PR review. If they're load-bearing, **Revise with agent** to give the persona another round.

Architects worry about Supervised's 2-round cap. In practice, the discipline of "ship MINOR or revise" forces the team to decide whether a finding is blocking or aspirational — which is the conversation you should be having anyway.

### Pattern C · Tier escalation

If your team's BAR has matured (more ADRs, more threat coverage, more fitness functions), the BAR pillar score climbs. When it crosses 75 overall, your OKRs can default to **Autonomous** tier (3 rounds, lower-friction). When it drops below 50, OKRs default to **Restricted** (0 auto-rounds — every revision needs a human signature).

You change tier per-OKR in the OKR card edit mode. Don't change tier *mid-run* — the action's `governanceTier` is frozen at start time (mitigates tier creep).

---

## What's next

**[Chapter 4 → When things fail](/docs/onboarding/04-when-things-fail)**

By now you've likely seen at least one FAIL or PARTIAL verdict. Chapter 4 is the triage table — every failure class with the specific fix, the most common operational gotchas, and the escape hatches (Reset phase, Revise with agent, Verify Chain from a fresh shell) for when you need to recover without losing audit integrity.

---

> 💬 **A note on cadence.** The pipeline is fast on the agent's side and human-paced on yours. Don't try to compress the three gates into one sitting — the value of the human gates is that you actually *read* each artifact before approving. A team that approves WHY, HOW, and WHAT in one 30-minute meeting is missing the point. A team that takes a day each (or one OKR per day across the three gates in parallel) hits the right cadence.
