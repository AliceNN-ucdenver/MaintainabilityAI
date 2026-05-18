# Walkthrough: From a Mesh Gap to a Merged PR

<div class="docs-hero">
  <div class="docs-hero-inner">
    <div class="docs-eyebrow">End-to-end <span class="docs-hero-meta">~15 min read</span></div>
    <h2 class="docs-hero-title">Research → PRD → Implementation, with one audit chain.</h2>
    <p class="docs-hero-copy">This walkthrough takes one Oraculum finding and ships it through the Archeologist research agent, the PRD agent, the cross-repo bridge, and finally into a merged PR on the target code repo. Every artifact carries a Hatter's Tag pointing back to the next one upstream. By the end you have a queryable evidence chain across two repos that any auditor can replay.</p>
  </div>
</div>

> **Who this is for.** You have the VS Code extension installed, a governance mesh repo (even an old one), and at least one BAR with a target code repo. You want the full Looking Glass → Cheshire loop working — not just the Oraculum review side.

---

## What you will have built

1. **A `research-request` issue** in the mesh repo, derived from an Oraculum finding (or hand-authored).
2. **The Archeologist run output** — a published research PR with the Hatter's Tag and JSONL audit chain.
3. **A PRD** with multi-expert grounding, refinement-loop trace, and a sidecar `.manifest.json`.
4. **A spec-ready implementation issue** in the target code repo with the RCTRO body the PRD manifest produces.
5. **One implementation PR** opened by `alice-remediation.yml`, carrying `derived_from_prd_run_id` and `derived_from_research` so the chain joins across both repos by one `jq` filter.
6. **The full evidence chain**: `gh search` from either repo lands on every artifact in the run.

The whole loop closes itself on the GitHub side — your job is to scaffold once, then approve the two PR merges (research, then PRD). Everything between those checkpoints is the agents working.

---

## Prerequisites

- VS Code with the **MaintainabilityAI extension** installed
- `gh` CLI authenticated (`gh auth status` returns OK)
- A governance mesh repo with at least one BAR
- A target code repo that the BAR's `app.yaml` lists in `repos:`
- One LLM provider key configured (`github-models` works free via `GITHUB_TOKEN`; `anthropic` or `openai` if you prefer those models)
- Optional: a Tavily key for the Archeologist's web search (free tier at [tavily.com](https://tavily.com))

If you are starting fresh — `Looking Glass` → `Initialize Mesh` scaffolds everything below for you. **The next section is the checklist for users with an existing pre-v0.3 mesh.**

---

## Scaffolding requirements — starting with an existing mesh

If your mesh predates the research/PRD agents, you almost certainly are missing the workflows, prompt packs, and secrets the pipeline needs. This is the **exact** list the runner and cross-repo bridge expect.

You can deploy everything below in one click from the extension — **`Looking Glass` → `Settings` → `Deploy mesh workflows`** runs both `writeMeshWorkflows()` and `seedMeshPrompts()`, then opens a commit on the mesh repo with the result. Or follow the manual checklist below if you prefer to land things one at a time.

### On the mesh repo

| Artifact | Path | Purpose |
|---|---|---|
| Oraculum review workflow | `.github/workflows/oraculum-review.yml` | Architecture review issues, the entry point for most findings |
| Archeologist workflow | `.github/workflows/archeologist.yml` | Runs the research pipeline on `research-request` label / `@archeologist` mention |
| PRD workflow | `.github/workflows/prd.yml` | Runs the PRD pipeline on `prd-ready` label |
| Label-on-merge handler | `.github/workflows/label-on-merge.yml` | When a research PR merges, labels the source issue `prd-ready` to chain into the PRD agent |
| Notify-code-repos handler | `.github/workflows/notify-code-repos.yml` | When a PRD PR is labeled `spec-ready`, fires a `repository_dispatch` at every code repo in `manifest.target_repos` |
| Research prompt packs | `.caterpillar/prompts/research/` — `query-plan.md`, `synthesis.md`, `synthesis-archaeology.md`, `gap-analysis.md` | Loaded by the Archeologist runner |
| PRD prompt packs | `.caterpillar/prompts/prd/` — `synthesis.md`, `architecture-review.md`, `security-review.md`, `ask-experts.md` | Loaded by the PRD runner |

The **`New Research / PRD Run`** command's pre-flight panel verifies every one of these exists before letting you dispatch. If anything is missing it tells you exactly which file with a one-line remediation hint — so you can use that panel as a live checklist instead of comparing this table by hand.

### On each target code repo

The Cheshire **`Scaffold SDLC Structure`** command writes these. If a repo was scaffolded before v0.7, re-run the scaffold and accept the new files; existing files are preserved.

| Artifact | Path | Purpose |
|---|---|---|
| Spec-ready handler | `.github/workflows/spec-ready-handler.yml` | Receives the `spec-ready` dispatch from the mesh repo, reads the PRD manifest, creates the RCTRO issue |
| Alice remediation | `.github/workflows/alice-remediation.yml` | Picks up the RCTRO issue on `@claude please implement`, opens the implementation PR |

### Secrets

Configure via **`Repository Secrets`** command — it pushes per-secret to the mesh repo, or to the target code repo, depending on which one you select.

**On the mesh repo:**

| Secret | Required when | Notes |
|---|---|---|
| `TAVILY_API_KEY` | Always (research path uses web search) | Free tier at [tavily.com](https://tavily.com) — no card needed |
| `ANTHROPIC_API_KEY` | `llm_provider: anthropic` | Recommended for sonnet-tier synthesis quality |
| `OPENAI_API_KEY` | `llm_provider: openai` | Alternative to anthropic |
| `USPTO_API_KEY` | Optional | Adds patent coverage to the research run; pipeline degrades gracefully when absent |
| `GOVERNANCE_MESH_TOKEN` | Cross-repo dispatch | Fine-grained PAT with `repo` scope on every target code repo `notify-code-repos.yml` dispatches to |
| `GITHUB_TOKEN` | Built-in | No action needed; required for `llm_provider: github-models` (free Copilot routing) |

**On each target code repo:**

| Secret | Required when | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `alice-remediation.yml` runs Claude on RCTRO issues | Same key as mesh side; configure with the same secret name |
| `MESH_READ_TOKEN` | The mesh repo is **private** | Fine-grained PAT with `contents:read` on the mesh repo; let `spec-ready-handler.yml` fetch the PRD manifest. Skip for public meshes — `raw.githubusercontent.com` works unauthenticated. |

### Research preferences (one-time)

**`Looking Glass` → `Settings` → `Research`** sets your defaults:

- **LLM provider** — `github-models` is the cheapest path; `anthropic` for synthesis-tier quality
- **Grounding mode** — `default` (lenient blocks BLOCKING; strict blocks any below-threshold)
- **Grounding threshold** — composite score floor (default `0.85`)
- **Max iterations** — refinement-loop cap before EXHAUSTED (default `3`)
- **Cost cap** — per-run token budget the runner warns past

These ride along with each dispatch; the New Research panel lets you override per-run.

---

## The end-to-end flow

The walkthrough assumes the scaffolding above is in place. If anything is missing, the pre-flight panel will block dispatch and tell you what to fix.

### Step 1 — Identify a gap

Two starting points work the same way downstream:

- **Oraculum-derived.** `Looking Glass` → open a BAR → `Run Oraculum Review`. The architect agent posts findings as issue comments. Pick a finding you want to investigate further.
- **Hand-authored.** Command palette → `Create Research Request`. Skips Oraculum entirely.

### Step 2 — Promote or create the request

**From an Oraculum issue:** open the issue in the Oraculum panel, click the sidebar's **🔍 Promote to research-request** button. The extension adds the `research-request` label plus an `oraculum-derived` provenance label and posts a confirmation comment. The label-add event auto-fires `archeologist.yml` on the mesh repo. Done.

**From scratch:** `Create Research Request` walks you through brief → scope (BAR / platform / portfolio) → path (research vs archaeology) → target repo (archaeology only). On submit, a new `research-request` issue lands on the mesh repo with a body that matches `archeologist.yml`'s parse-trigger regex contracts exactly — same label-add auto-fires the workflow.

### Step 3 — Watch the Archeologist run

Command palette → `Active Research / PRD Runs`. The panel auto-refreshes via an adaptive-cadence tailer (30s → 60s → 5min as runs age). Each row shows:

- Status badge (`queued` → `in_progress` → `success`/`failure`)
- The current audit node — e.g. `synthesize report (iter 1)`
- Event count (how many JSONL events have flushed)
- Per-row `Refresh` / `Open on GitHub` / `Remove` actions

Notifications also surface major transitions automatically — a `Dispatched` info toast on register, a `Completed — PASS` info toast on success, a `Failed` warning toast on failure (with an `Active Runs` button to deep-link).

The Archeologist publishes a PR titled `Research: <topic>` on the mesh repo when it's done. The PR description carries the Hatter's Tag (provider, model, tokens, cost, prompt-pack sha256, audit chain root hash) plus the rendered research body — `gh pr view` gives you the whole record in one shot.

### Step 4 — Review and merge the research PR

Read the research doc. Look at the citation density, the confidence ratings, and the gap-analysis section. If you accept it, merge. If not, comment on the PR with a follow-up question — the audit log captures the dialogue.

**On merge:** `label-on-merge.yml` confirms `run_complete.outcome == 'success'`, checks for a `no-auto-prd` opt-out label, and adds `prd-ready` to the source `research-request` issue. The label-add event auto-fires `prd.yml`.

### Step 5 — Watch the PRD run

Back in `Active Runs`. A second row appears for the PRD agent. The PRD pipeline is the multi-expert refinement loop — each iteration emits:

- `synthesize_prd[iterN]`
- `architect_expert_review[iterN]` + `security_expert_review[iterN]` (LLM judgments)
- `deterministic_architecture_review[iterN]` + `deterministic_security_review[iterN]` (citation-grep)
- `verify_grounding[iterN]` (combines all four)
- `iteration_summary[iterN]` — a structured event carrying the 4-column score row

The published PRD includes a `## Refinement Loop Trace` table showing the score progression across all iterations so a reviewer can see how the loop converged. PASS verdict means composite score met the threshold *and* no deterministic-MAJOR citations *and* the two experts agreed (within `0.2` delta).

### Step 6 — Review and merge the PRD PR

The PRD PR has both the rendered markdown and a sidecar `.manifest.json` with `endpoints`, `security_requirements`, `target_repos`, and the final grounding block. The manifest is what the cross-repo bridge consumes.

On merge: `notify-code-repos.yml` fires. It reads `manifest.target_repos`, deduplicates against the PR's filename, and sends a `repository_dispatch` event (`event_type: spec-ready`) at every code repo on that list. The dispatch payload carries `mesh_repo`, `prd_path`, and `prd_pr_url`.

### Step 7 — `spec-ready-handler.yml` creates the RCTRO issue

In the target code repo, `spec-ready-handler.yml` fires on the dispatch:

1. Fetches `<prd_path>.manifest.json` from the mesh repo (`raw.githubusercontent.com` for public meshes; `MESH_READ_TOKEN` + Contents API for private ones)
2. Validates the manifest shape and confirms this repo is in `target_repos`
3. Dedupes by `run_id` (re-dispatches comment on the existing issue instead of creating a duplicate)
4. Builds an RCTRO body — Role/Context/Task/Requirements/Output, one Requirement per endpoint and one per security requirement, each with citation references back to the PRD
5. Creates the issue with labels `rctro-feature` + `spec-ready`

The issue body includes `derived_from_prd: <url>` and `derived_from_prd_run_id: <run_id>` so the implementation PR can carry the same fields back through the chain.

### Step 8 — Implementation

Comment `@claude please implement` on the new RCTRO issue (or assign it to Copilot). `alice-remediation.yml` opens an implementation PR with passing tests and the AI-disclosure label, closing the loop.

### Step 9 — Check the evidence chain

From either repo:

```bash
gh search issues "derived_from_prd_run_id:PRD-2026-05-17-deadbeef" --repo OWNER/MESH --repo OWNER/CODE
```

You get the original `research-request` issue, the PRD PR, the spec-ready RCTRO issue, and the implementation PR — all four artifacts joined by one id. The `.research-audit/<run_id>.jsonl` files in the mesh repo carry the hash-chained events for each agent run; running `npx research-runner verify-audit <path>` confirms the chain is intact.

---

## Where to find each artifact in the extension

| Artifact | Where to look |
|---|---|
| In-flight runs | `Active Research / PRD Runs` command |
| Past research + PRDs | `Research Library` command — BAR-grouped tree, PRDs with manifests get a `spec-ready` badge |
| Oraculum findings | `Oraculum — Architecture Review` command |
| Mesh workflows present? | `Looking Glass` → `Settings` → `Deploy mesh workflows` (shows `Redeploy` when all five are already present) |
| Per-secret status | `Looking Glass` → `Settings` → `Research` (pills show VS Code ✓ / GitHub ✓ status per provider) |
| Pre-flight checklist | The banner at the top of the `New Research / PRD Run` panel — 9 checks with per-check remediation |

---

## Quick troubleshooting

- **Pre-flight check fails: "archeologist.yml workflow scaffolded".** Run `Looking Glass` → `Settings` → `Deploy mesh workflows`. If you have customized any mesh workflow file, the deploy preserves it; force-redeploy via the `Redeploy` action.
- **Pre-flight check fails: "Tavily key available".** Either set it locally via `Repository Secrets` → `Local config`, or push it to the mesh repo's Actions secrets via `Repository Secrets` → `governance`.
- **`spec-ready` dispatch never reaches the code repo.** Check that the mesh repo's `GOVERNANCE_MESH_TOKEN` secret is set and has `repo` scope on the target. The `notify-code-repos.yml` run log will show the dispatch attempt and any 401/404.
- **The RCTRO issue claims this repo isn't in `target_repos`.** The mesh PRD manifest's `target_repos` array must include this repo's `owner/repo`. Look at `manifest.target_repos` in the PRD PR's sidecar JSON; correct it on the mesh side and let `notify-code-repos.yml` re-dispatch.
- **Mesh is private and `spec-ready-handler.yml` can't fetch the manifest.** Add `MESH_READ_TOKEN` to the target code repo's secrets (fine-grained PAT, `contents:read` on the mesh repo only).
- **Notifications fire on every reload.** Known cosmetic on `pre-existing` runs only — the service seeds its snapshot with persisted state on activate, so subsequent transitions are deduped. If you see repeated dispatch toasts for the same run id, file a bug with the run id.

---

## Where to go next

- **Workshop Part 8** — the full IMDB-lite capstone shows the same chain landing one cross-cutting feature across four repos. Now has a *bonus: research-first* path that uses this walkthrough's flow instead of the ad-hoc starting point.
- **Design doc** — `docs/design/research-and-prd-agents.md` carries the detailed node graph, audit schemas, and Hatter's Tag spec for every artifact above.
- **Roadmap** — research-runner package roadmap (v0.3 → v1.0) is in the same design doc; v0.8 (Looking Glass UX) and v0.9 (Oraculum integration) are the slices this walkthrough exercises.
