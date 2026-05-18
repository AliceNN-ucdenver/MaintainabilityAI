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
4. **A PRD landing-issue** opened by the mesh in each target code repo, body containing the full PRD markdown + manifest JSON for downstream assignment via the Rabbit Hole.
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
| Notify-code-repos handler | `.github/workflows/notify-code-repos.yml` | When a PRD PR is labeled `spec-ready`, opens a landing-issue (full PRD markdown + manifest JSON in the body) in every code repo in `manifest.target_repos` via the GitHub Issues API |
| Research prompt packs | `.caterpillar/prompts/research/` — `query-plan.md`, `synthesis.md`, `synthesis-archaeology.md`, `gap-analysis.md` | Loaded by the Archeologist runner |
| PRD prompt packs | `.caterpillar/prompts/prd/` — `synthesis.md`, `architecture-review.md`, `security-review.md`, `ask-experts.md` | Loaded by the PRD runner |

The **`New Research / PRD Run`** command's pre-flight panel verifies every one of these exists before letting you dispatch. If anything is missing it tells you exactly which file with a one-line remediation hint — so you can use that panel as a live checklist instead of comparing this table by hand.

### On each target code repo

The Cheshire **`Scaffold SDLC Structure`** command writes these. Only one workflow file is needed on the code-repo side now — the mesh creates landing-issues directly via the GitHub Issues API, no dispatch-handler required.

| Artifact | Path | Purpose |
|---|---|---|
| Alice remediation | `.github/workflows/alice-remediation.yml` | Picks up the landing-issue on `@claude please implement`, opens the implementation PR |

### Secrets — one configuration step, fanned out everywhere

The Research + PRD pipeline reads five secrets total. The Looking Glass **Research** settings panel manages all of them with three distinct push patterns: **Push to mesh** (mesh-only secrets), **Push to mesh + code repos** (secrets the code-repo workflows also consume), and **Create** (GOVERNANCE_MESH_TOKEN-specific — guides you through minting a correctly-scoped GitHub PAT, then auto-saves and pushes).

| Secret | Required when | Lives on | How to push |
|---|---|---|---|
| `TAVILY_API_KEY` | Always (research path uses web search) | Mesh only | "Push to mesh" |
| `USPTO_API_KEY` | Optional patent coverage | Mesh only | "Push to mesh" |
| `ANTHROPIC_API_KEY` | `llm_provider: anthropic` on mesh AND `alice-remediation.yml` on each code repo | Mesh + every linked code repo | "Push to mesh + code repos" |
| `OPENAI_API_KEY` | `llm_provider: openai` on mesh + code repos | Mesh + every linked code repo | "Push to mesh + code repos" |
| `GOVERNANCE_MESH_TOKEN` | Per-code-repo landing-issue creation (`notify-code-repos.yml` → `POST /repos/.../issues`) | Mesh only | "Create" (guided) or "Push to mesh" |
| `GITHUB_TOKEN` | Built-in | Auto-provided per workflow | n/a — required for `llm_provider: github-models` (free Copilot routing) |

**About `GOVERNANCE_MESH_TOKEN` — mesh-only token, narrow scope:**

Create a fine-grained PAT scoped to your org with **three repository permissions**:

- **Metadata: Read** — auto-granted by GitHub on every fine-grained PAT
- **Issues: Read and write** — for `POST /repos/{owner}/{repo}/issues` (open the landing-issue) and follow-up updates as the workflow progresses
- **Contents: Read** — lets `notify-code-repos.yml` cross-reference files in the target code repo when composing the issue body (e.g. linking to a `routes.ts` referenced by an endpoint in the PRD manifest)

Resource owner is your org; repository access is "Only select repositories" → pick every code repo from your BARs' `app.yaml repos[]`.

The token **cannot modify code**, **cannot trigger workflows**, and **cannot read non-listed surfaces**. No Actions:write, no Pull-requests:write, no Secrets, no Variables — none of that is selected.

Looking Glass → Settings → Research → **Create** walks you through this end to end: opens the GitHub PAT page in your browser, shows a sticky checklist listing every code-repo slug (built by walking [`MeshReader.listBars()`](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/src/core/mesh-reader.ts) and deduping their `app.yaml` repos), pops an input box to paste the freshly-minted token, then saves + pushes to the mesh repo's Actions secrets — all in one click.

The token lives **on the mesh repo only**. The code-repo side never sees it. The mesh-side workflow uses it to call the GitHub Issues API directly and embeds the full PRD markdown + manifest JSON in the issue body — so there's no cross-repo read needed (works for private meshes natively) and no second workflow surface on the code-repo side to maintain.

### Research preferences (one-time)

**`Looking Glass` → `Settings` → `Research`** sets your defaults:

- **LLM provider** — `github-models` is the cheapest path; `anthropic` for synthesis-tier quality
- **Grounding mode** — `default` (lenient blocks BLOCKING; strict blocks any below-threshold)
- **Grounding threshold** — composite score floor (default `0.85`)
- **Max iterations** — refinement-loop cap before EXHAUSTED (default `3`)
- **Cost cap** — per-run token budget the runner warns past

These ride along with each dispatch; the New Research panel lets you override per-run.

---

## How `target_repos` actually flows

Before the end-to-end flow, here is the data path the cross-repo bridge follows so it is clear what file controls what. **This is the answer to "why does `notify-code-repos.yml` know where to dispatch?"**:

```
~/Documents/governance-mesh/                     ← your mesh repo
└── platforms/imdb-lite/bars/APP-IMDB-002/
    └── app.yaml                                  ← canonical source
        application:
          id: APP-IMDB-002
          name: "IMDB Celebs"
          repos:                                  ← (1) you maintain this
            - "https://github.com/AliceNN-ucdenver/celeb-api"

                       │
                       │  gather_mesh_context() reads app.yaml,
                       │  normalises URLs to owner/repo via
                       │  normalizeRepoSlug()
                       ▼

MeshContext.bar.linked_repos                      ← (2) runner internal
  = ["AliceNN-ucdenver/celeb-api"]

                       │
                       │  generate_prd_manifest →
                       │  resolveTargetRepos(mesh) reads linked_repos
                       ▼

<topic>.manifest.json                             ← (3) committed to mesh
  {
    "target_repos": ["AliceNN-ucdenver/celeb-api"],
    "endpoints": [...],
    "security_requirements": [...],
    ...
  }

                       │
                       │  PRD PR merges → label-on-merge labels source
                       │  issue "spec-ready" → notify-code-repos.yml
                       │  fires + reads manifest.target_repos + PRD md
                       ▼

POST /repos/AliceNN-ucdenver/celeb-api/issues     ← (4) one direct API call
  title: "Implement PRD: <topic>"                       per target_repos entry,
  body: { manifest.json + full PRD markdown +           authenticated with
          audit pointers + Rabbit Hole CTA }            GOVERNANCE_MESH_TOKEN
  labels: ["prd-landing", "spec-ready"]                 (Issues:write only)
```

**Practical consequence**: the only place you maintain the target-repo list is each BAR's `app.yaml application.repos[]`. Add or remove a URL there and the next PRD run picks it up automatically. No workflow edits, no manifest hand-editing, no separate workflow file on the code-repo side.

- **Platform-scope research** (no specific BAR): the runner unions every sibling BAR's `linked_repos` so the PRD dispatches to all code repos under the platform.
- **Misconfigured BAR** (no `repos:` block): the runner falls back to a `mesh/<bar-id-lowercase>` placeholder so the manifest still validates — visible in the run logs so you can fix `app.yaml`.

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

The PRD PR has both the rendered markdown and a sidecar `.manifest.json` with `endpoints`, `security_requirements`, `target_repos`, and the final grounding block. The manifest is what drives the per-code-repo issue creation.

On merge: `notify-code-repos.yml` fires. It reads `manifest.target_repos`, loads the PRD markdown + manifest JSON from disk, and **opens a landing-issue in each code repo on the list** via `POST /repos/{owner}/{repo}/issues` (one direct API call per repo, no cross-repo dispatch and no second workflow surface).

### Step 7 — The mesh opens a PRD landing-issue in each code repo

`notify-code-repos.yml` on the mesh repo:

1. Reads `manifest.target_repos` from the PRD PR's `.manifest.json` file.
2. Loads the full PRD markdown from disk + the manifest JSON.
3. Dedupes by `run_id` against each code repo (re-runs comment on the existing landing-issue instead of duplicating).
4. For each `owner/repo` in `target_repos`, calls `github.rest.issues.create` (`POST /repos/{owner}/{repo}/issues`) with body containing: source PR + mesh repo + audit pointers (`derived_from_prd_run_id`, `derived_from_prd`), the manifest JSON as a fenced code block, the **full PRD markdown verbatim**, and a footer pointing at the Looking Glass Rabbit Hole for assignment.
5. Labels the issue `prd-landing` + `spec-ready`.

The landing-issue carries `derived_from_prd_run_id: <run_id>` so the implementation PR (whichever path it takes) can echo the field for the cross-repo audit join.

### Step 8 — Assign + implement

Two paths from the landing-issue:

- **Manual (recommended).** Open the issue in **Looking Glass → Rabbit Hole**. The Rabbit Hole reads the embedded manifest, lets you pick prompt packs, and emits an RCTRO-formatted assignment issue you can hand to Copilot or `@claude please implement`.
- **Direct.** Comment `@claude please implement` on the landing-issue directly. `alice-remediation.yml` reads the manifest from the issue body and opens an implementation PR.

Either way, `alice-remediation.yml` opens the implementation PR carrying `derived_from_prd_run_id`, closing the loop.

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
- **Landing-issue never appears in the code repo.** Check that the mesh repo's `GOVERNANCE_MESH_TOKEN` secret is set and the PAT has **Metadata=read + Issues=read+write + Contents=read** on the target code repo. Issues=write is the critical one (`POST /repos/.../issues`); Contents=read is consumed when the workflow cross-references code-repo files in the issue body. The `notify-code-repos.yml` run log will show the create attempt and any 401/404.
- **The landing-issue is missing from a code repo but other repos got one.** The mesh PRD manifest's `target_repos` array must include the missing repo's `owner/repo`. Look at `manifest.target_repos` in the PRD PR's sidecar JSON; correct it on the mesh side (or fix the BAR's `app.yaml application.repos[]` upstream) and re-run `notify-code-repos.yml` via workflow_dispatch.
- **Private mesh.** Works natively — no token needed on the code-repo side. The mesh-side workflow embeds the full PRD markdown + manifest in the issue body, so the code-repo side never has to read from the mesh repo at all.
- **Notifications fire on every reload.** Known cosmetic on `pre-existing` runs only — the service seeds its snapshot with persisted state on activate, so subsequent transitions are deduped. If you see repeated dispatch toasts for the same run id, file a bug with the run id.

---

## Where to go next

- **Workshop Part 8** — the full IMDB-lite capstone shows the same chain landing one cross-cutting feature across four repos. Now has a *bonus: research-first* path that uses this walkthrough's flow instead of the ad-hoc starting point.
- **Design doc** — `docs/design/research-and-prd-agents.md` carries the detailed node graph, audit schemas, and Hatter's Tag spec for every artifact above.
- **Roadmap** — research-runner package roadmap (v0.3 → v1.0) is in the same design doc; v0.8 (Looking Glass UX) and v0.9 (Oraculum integration) are the slices this walkthrough exercises.
