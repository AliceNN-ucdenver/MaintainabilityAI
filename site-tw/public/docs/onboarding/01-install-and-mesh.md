<div class="docs-hero docs-hero-split docs-hero-violet">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/onboarding/">Onboarding</a><span class="sep">/</span><span>Chapter 1</span></div>
    <div class="docs-eyebrow">Chapter 1 of 4 · ~7 min walk <span class="docs-hero-meta">Install + seed the mesh</span></div>
    <h1 class="docs-hero-title">Install + seed the mesh</h1>
    <p class="docs-hero-copy">Install the extension. Connect (or create) a governance mesh repo. Deploy the workflows + agents + skills. Scaffold the IMDB-Celebs sample OKR. End state: a runnable sample ready for the agents to drive.</p>
  </div>
</div>

## What you're about to do

You'll spend the next few minutes turning an empty Looking Glass panel into one that knows about your mesh, has the agentic-SDLC workflows + agents + pure-data skills deployed to it, and has a sample OKR seeded that you can actually run agents against. No code changes yet. No real OKR yet. **Just the foundation.**

If you've installed VS Code extensions before, the first three minutes will feel familiar. If you haven't connected a GitHub PAT before, that's the only step that needs a 30-second detour to the GitHub UI.

---

## Step 1 · Install the extension

Open VS Code. Open the Extensions panel (`⌘⇧X` on macOS, `Ctrl+Shift+X` on Windows/Linux). Search for **MaintainabilityAI**. Click Install.

Or, install from the command line:

```sh
code --install-extension chiefarcheologist.maintainabilityai
```

After install, you should see a new activity-bar icon — the Cheshire Cat. Click it. Two tree views appear: **Looking Glass** (governance / OKRs) and **The Cheshire Cat** (scaffold actions). You want Looking Glass for this walk.

> 💡 **Two panels, two repo types.** Looking Glass is the *governance mesh* panel (lives in a non-code repo). The Cheshire Cat is the *code repo* scaffolding panel (lives in your actual project). They are intentionally separate. For this onboarding pack we work only in Looking Glass.

Open the Looking Glass panel from the activity bar. You'll see a portfolio shell with no BARs and no OKRs yet — that's expected.

---

## Step 2 · Connect (or create) a mesh repo

The **mesh** is a regular Git repo that holds your governance data — BARs (Business Application Repositories), OKRs, architecture models, threat models, ADRs, audit chains, signing keys. It is *not* your code; it's the layer above your code.

In Looking Glass, open **Settings** (gear icon, top of the panel). The Settings page has three areas you care about right now:

1. **Mesh location** — the local folder where the mesh repo lives.
2. **Mesh Provisioning** — buttons to deploy workflows / agents / skills to the connected mesh repo.
3. **Secrets & Models** — GitHub PAT and (optional) LLM API keys.

**If you already have a mesh repo on GitHub** (e.g., your org's `governance-mesh`):

```sh
git clone https://github.com/<your-org>/governance-mesh ~/Documents/governance-mesh
```

Point Settings → Mesh location at the clone, then click **Pull mesh** to verify the connection works.

**If you don't have a mesh repo yet:**

Settings → Mesh location offers a **Create new mesh** flow. Pick a folder. The extension will scaffold an empty mesh structure (`/bars`, `/okrs`, `/.caterpillar`, `/audit`) and commit it. Push it to a new GitHub repo when you're ready.

> ⚠ **Direct-to-main convention.** The mesh repo writes go to `main` directly, not via PRs. The OKR action PRs (research-doc, prd, code-design) go through normal PR review — but settings, mesh state, and scaffolding land on `main`. This is intentional: the mesh is *configuration*, not *content*. The `MeshBranchGuard` enforces fail-closed write protection so the extension can never accidentally push to a non-main branch.

---

## Step 3 · Configure your GitHub PAT

The extension needs a fine-grained PAT to (a) read/write to the mesh repo and (b) talk to GitHub's Contents API for canonical-source audit reports.

In Settings → Secrets & Models → **Mesh token (GitHub PAT)**, click **Create**. The extension opens GitHub's fine-grained PAT page with the right scopes pre-populated:

- **Repository access**: every code repo your OKRs will touch + the mesh repo
- **Repository permissions**:
  - `Metadata` → read (auto)
  - `Issues` → read + write *(needed so the mesh can open PRD landing-issues in target code repos)*
  - `Contents` → read *(needed so the audit-report exporter can fetch canonical bytes from GitHub)*
- **Account permissions**: none

Click Generate, copy the token, paste it back into the Settings field, click Save.

The token never leaves your VS Code settings storage. It cannot modify code or trigger workflows (Contents=read, not write). Even if leaked, the blast radius is bounded.

> 💡 **Why fine-grained PATs?** Classic GitHub tokens are scoped too widely (your whole user, every repo). Fine-grained PATs scope to exactly the repos and capabilities the mesh needs. That matches the *least agency* principle the framework enforces everywhere else.

---

## Step 4 · Deploy workflows + agents + skills to the mesh

Settings → **Mesh Provisioning** has one big button: **Deploy All (workflows + actions + agents + skills)**. Click it.

This writes about a dozen files to the mesh repo and commits them:

- **3 per-agent workflows** (`market-research-agent.yml`, `prd-agent.yml`, `code-design-agent.yml`)
- **3 composite GitHub Actions** under `.github/actions/`
- **3 agent personas** under `.github/agents/`
- **20 pure-data Skills** under `.github/skills/`
- **Prompt packs** under `.caterpillar/prompts/`

The Deploy button is idempotent. Re-running it after we ship updates is the canonical way to keep your mesh current with the agentic-SDLC contract.

You should see a green "Deployed N files" toast and a green badge next to **Mesh Provisioning** showing the deploy SHA and timestamp.

> ⚠ **Two things to verify before moving on.** First, check your mesh repo on GitHub — you should see the new files committed to `main`. Second, in your mesh repo's GitHub Actions settings, make sure **Workflow permissions** are set to "Read and write" and "Allow GitHub Actions to create and approve pull requests" is enabled. The first run of the agents will fail with a permissions error if these aren't set.

---

## Step 5 · Scaffold the IMDB-Celebs sample OKR

In Looking Glass → portfolio, click **Scaffold sample**. The extension creates:

- A sample BAR: `APP-IMDB-002` — *"IMDB-Lite Celebrity Enrichment"*
- A sample OKR: `OKR-2026Q2-IMDB-001-celeb-api` — *"Add celebrity profile API to IMDB-Lite"*
- Three action slots: WHY (market research), HOW (PRD), WHAT (code design) — all status `pending`

Click into the OKR to see the detail page. Three phase cards appear: WHY, HOW, WHAT — each with a `Start Why` / `Start How` / `Start What` button. Only Start Why is enabled (the others are gated on the prior phase merging).

At the bottom of the OKR detail page, the footer has **📦 Export Full OKR Audit Rollup**. It's enabled but won't produce anything useful yet — there are no completed phases to roll up. We'll come back to it after the agents run.

---

## What you should see

After Step 5, your Looking Glass should look like:

- ✅ Mesh connected, deploy SHA visible
- ✅ Sample BAR + OKR in the portfolio
- ✅ OKR detail page rendering the three phase cards
- ✅ `Start Why` button live; `Start How` / `Start What` greyed out with "Gated on prior phase" tooltips
- ✅ Footer `Export Full OKR Audit Rollup` button live (will produce a PARTIAL verdict if clicked now — that's correct, you have 0 phases done)

If anything above is missing, the Settings → Mesh Provisioning page surfaces a deploy-status badge with a diagnostic link. The most common first-run gotcha is the workflow-permissions setting in step 4; the second is a PAT scoped to the wrong repo set.

---

## What's next

**[Chapter 2 → Read an audit report](/docs/onboarding/02-read-an-audit)**

Before you click `Start Why` and watch the agents run, let's understand what the system is going to produce at the end. Chapter 2 walks the sample audit report from top to bottom so you know what a *good* report looks like — and what to do when one is *not* good.

You can also click `Start Why` now and let it run in parallel; the WHY phase typically takes 5-12 minutes depending on your search-provider rate limits. By the time you've finished Chapter 2, your first signed artifact will be waiting in a PR.

---

> 💬 **Stuck?** Looking Glass → Settings → bottom of page has a **Report a bug** button that captures the panel state + recent extension logs into a clean GitHub issue. Use it. We're listening.
