<div class="docs-hero docs-hero-split docs-hero-violet">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/onboarding/">Onboarding</a><span class="sep">/</span><span>Chapter 1</span></div>
    <div class="docs-eyebrow">Chapter 1 of 4 · ~7 min walk <span class="docs-hero-meta">Install + seed the mesh</span></div>
    <h1 class="docs-hero-title">Install + seed the mesh</h1>
    <p class="docs-hero-copy">Install the extension. Connect a governance mesh repo. Deploy the workflows, agents, skills, and prompt packs. Seed the IMDB-Lite sample. End state: Looking Glass has a real OKR, a real mesh, and a clear next button.</p>
  </div>
</div>

## What you're about to do

You'll spend the next few minutes turning an empty Looking Glass panel into a launchpad. It will know where your mesh lives, which repo is allowed to hold governance state, which agents are deployed, which search providers the Coding Agent can reach, and which sample OKR you can run first.

No code changes yet. No production feature yet. Just the foundation.

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">1 · Mesh</div>
    <h3 class="docs-card-title">The governance repo</h3>
    <p class="docs-card-body">A normal Git repo that stores BARs, OKRs, architecture models, audit chains, and signing keys. Looking Glass writes mesh state here, and the branch guard keeps those writes on <code>main</code>.</p>
  </div>

  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">2 · Contract</div>
    <h3 class="docs-card-title">Agents + skills + workflows</h3>
    <p class="docs-card-body">Deploy All writes the three phase agents, their pure-data skills, the per-phase workflows, the shared actions, and the prompt packs the agents must follow.</p>
  </div>

  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">3 · Runtime</div>
    <h3 class="docs-card-title">Coding Agent environment</h3>
    <p class="docs-card-body">The Copilot Coding Agent needs its own <code>copilot</code> environment secrets and a small outbound allow-list. GitHub Actions secrets are not the same thing.</p>
  </div>

  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">4 · Sample</div>
    <h3 class="docs-card-title">The first wall</h3>
    <p class="docs-card-body">The IMDB-Lite sample includes a deliberately Restricted Celebs BAR. WHY and HOW can run. WHAT may block until governance improves. That is the lesson, not a bug.</p>
  </div>
</div>

If you've installed VS Code extensions before, the first three minutes will feel familiar. If you haven't connected a GitHub PAT before, that's the only step that needs a 30-second detour to the GitHub UI.

---

## Step 1 · Install the extension

Open VS Code. Open the Extensions panel (`⌘⇧X` on macOS, `Ctrl+Shift+X` on Windows/Linux). Search for **MaintainabilityAI**. Click Install.

Or, install from the command line:

```sh
code --install-extension chiefarcheologist.maintainabilityai
```

After install, you should see a new activity-bar icon: the Cheshire Cat. Click it. Two tree views appear: **Looking Glass** (governance / OKRs) and **The Cheshire Cat** (code-repo scaffolding). You want Looking Glass for this walk.

> 💡 **Two panels, two repo types.** Looking Glass is the *governance mesh* panel (lives in a non-code repo). The Cheshire Cat is the *code repo* scaffolding panel (lives in your actual project). They are intentionally separate. For this onboarding pack we work only in Looking Glass.

Open the Looking Glass panel from the activity bar. You'll see a portfolio shell with no BARs and no OKRs yet. That's expected.

---

## Step 2 · Connect or initialize a mesh repo

The **mesh** is a regular Git repo that holds your governance data: BARs (Business Application Repositories), OKRs, architecture models, threat models, ADRs, audit chains, signing keys, prompt packs, and deployed agent contracts. It is not your product code. It is the layer above your code.

In Looking Glass, open **Settings** (gear icon, top of the panel). The Settings page has four areas you care about right now:

1. **Mesh Provisioning**: deploy or redeploy workflows, actions, agents, skills, prompt packs, and labels.
2. **Coding Agent Environment**: check the `copilot` environment secrets and outbound firewall allow-list.
3. **Research + PRD Agents**: set `GOVERNANCE_MESH_TOKEN`, search keys, and provider preferences.
4. **Governance Mesh Secrets**: optional Anthropic / OpenAI secrets for mesh-side analysis workflows.

**If you already have a mesh repo on GitHub** (e.g., your org's `governance-mesh`):

```sh
git clone https://github.com/<your-org>/governance-mesh ~/Documents/governance-mesh
```

Point Looking Glass at the clone, then click **Pull mesh** to verify the connection works.

**If you don't have a mesh repo yet:**

Click **Initialize Governance Mesh**. Pick a folder. The extension scaffolds an empty mesh structure (`/platforms`, `/okrs`, `/.caterpillar`, `/audit`, `mesh.yaml`) and commits it. Push it to a new GitHub repo when you're ready.

> ⚠ **Direct-to-main convention.** Looking Glass writes mesh state to `main` directly: deploys, resets, dispatch state, and sample scaffolds. The agent-produced artifacts (research-doc, PRD, code design) still go through PR review. The `MeshBranchGuard` checks the local mesh branch before writes. If your checkout is on a PR branch, it refuses or offers a clean switch back to `main` instead of silently writing to the wrong branch.

---

## Step 3 · Configure the governance mesh token

The mesh workflows need a fine-grained GitHub PAT named `GOVERNANCE_MESH_TOKEN`. This token is not a code-write token. It is used so mesh workflows can open PRD landing issues in linked code repos, cross-reference code-repo files, and route GitHub Models calls through your account when configured.

In **Settings → Research + PRD Agents**, find **Governance Mesh Token** and click **Create**. The extension opens GitHub's fine-grained PAT page with the scope checklist in front of you:

- **Repository access**: every code repo your OKRs will touch + the mesh repo
- **Repository permissions**:
  - `Metadata` → read (auto)
  - `Issues` → read + write *(needed so the mesh can open PRD landing-issues in target code repos)*
  - `Contents` → read *(needed so workflows can cross-reference code-repo files)*
  - `Models` → read *(needed when routing GitHub Models through your Copilot tier)*
- **Account permissions**: none

Click Generate, copy the token, paste it back into the Settings field, click Save, then **Push to mesh**.

The token lives on the mesh repo as a secret. It cannot modify code or trigger workflows (`Contents=read`, not write). Even if leaked, the blast radius is bounded to issue creation, file reads, and model access within the repos you selected.

> 💡 **Why fine-grained PATs?** Classic GitHub tokens are scoped too widely (your whole user, every repo). Fine-grained PATs scope to exactly the repos and capabilities the mesh needs. That matches the *least agency* principle the framework enforces everywhere else.

---

## Step 4 · Deploy workflows + agents + skills to the mesh

Settings → **Mesh Provisioning** has one big button: **Deploy All (workflows + actions + agents + skills)**. Click it.

This writes the contract the agents must run under and commits it to the mesh:

- **Per-agent workflows** (`market-research-agent.yml`, `prd-agent.yml`, `code-design-agent.yml`)
- **Shared composite actions** under `.github/actions/`
- **Three agent prompts** under `.github/agents/`
- **Pure-data Skills** under `.github/skills/`
- **Prompt packs** under `.caterpillar/prompts/`
- **Mesh labels** used by the PR audit gates

The Deploy button is idempotent. Re-running it after we ship updates is the canonical way to keep your mesh current with the agentic-SDLC contract.

You should see a green "Deployed N files" toast and a green badge next to **Mesh Provisioning** showing the deploy SHA and timestamp.

> ⚠ **Two things to verify before moving on.** First, check your mesh repo on GitHub: you should see the new files committed to `main`. Second, in your mesh repo's GitHub Actions settings, make sure **Workflow permissions** are set to "Read and write" and "Allow GitHub Actions to create and approve pull requests" is enabled. The first run of the agents will fail with a permissions error if these aren't set.

---

## Step 5 · Configure the Coding Agent runtime

The Copilot Coding Agent runs in a different place than GitHub Actions. That means two more checks live in **Settings → Coding Agent Environment**:

1. **Environment secrets** in the GitHub `copilot` environment. For live WHY evidence, set at least `TAVILY_API_KEY` and `USPTO_API_KEY`. `ANTHROPIC_API_KEY` is optional if you want Claude as a provider.
2. **Outbound firewall allow-list** for the search providers. Paste the hosts the Settings page lists: Tavily, USPTO, arXiv, and Hacker News. Even arXiv and HN need allow-list entries because the Coding Agent blocks non-GitHub egress by default.

Click **Check status**. Green required-secret badges + copied hosts means the WHY agent can gather live evidence instead of falling back to a degraded run.

---

## Step 6 · Scaffold the IMDB-Lite sample

In Looking Glass → portfolio, click **Sample Platform** and choose **IMDB-Lite**. The extension creates:

- Two sample BARs: `APP-IMDB-001` (*IMDB Lite Application*) and `APP-IMDB-002` (*IMDB Celebs*)
- A sample OKR for the current quarter, shaped like `OKR-2026Q2-IMDB-001-celeb-api`: *"Add celebrity profile API to IMDB-Lite"*
- Three action slots: WHY (market research), HOW (PRD), WHAT (code design), all status `pending`

Click into the OKR to see the detail page. Three phase cards appear: WHY, HOW, WHAT. Each has a `Start Why` / `Start How` / `Start What` button. Only Start Why is enabled; the others are gated on the prior phase merging.

At the bottom of the OKR detail page, the footer has **📦 Export Full OKR Audit Rollup**. It's enabled but won't produce anything useful yet because there are no completed phases to roll up. We'll come back to it after the agents run.

> 💡 **Why the Celebs BAR starts strict.** The sample is designed to teach the governance wall. `APP-IMDB-002` starts Restricted because it is intentionally sparse: fewer controls, fewer threats, fewer ADRs. WHY and HOW can still run. WHAT may stay blocked until you improve the BAR's governance score or choose a lower-risk real OKR. That is the system doing its job.

---

## What you should see

After Step 6, your Looking Glass should look like:

- ✅ Mesh connected, deploy SHA visible
- ✅ IMDB-Lite platform with Lite + Celebs BARs
- ✅ Sample OKR in the portfolio
- ✅ OKR detail page rendering the three phase cards
- ✅ `Start Why` button live; `Start How` / `Start What` greyed out with "Gated on prior phase" tooltips
- ✅ Footer `Export Full OKR Audit Rollup` button live. If clicked now, it produces a PARTIAL verdict. That's correct: you have 0 phases done.
- ✅ Coding Agent Environment shows required search secrets present, or clearly names what is missing

If anything above is missing, Settings surfaces the relevant badge. The most common first-run gotcha is the workflow-permissions setting in Step 4. The second is the Coding Agent firewall: the agent has the key, but GitHub blocks outbound calls until the host is allow-listed.

---

## What's next

**[Chapter 2 → Read an audit report](/docs/onboarding/02-read-an-audit)**

Before you click `Start Why` and watch the agents run, let's understand what the system is going to produce at the end. Chapter 2 walks the sample audit report from top to bottom so you know what a *good* report looks like, and what to do when one is *not* good.

You can also click `Start Why` now and let it run in parallel. The WHY phase typically takes 5-12 minutes depending on provider rate limits. By the time you've finished Chapter 2, your first signed artifact may be waiting in a PR.

---

> 💬 **Stuck?** Looking Glass → Settings → bottom of page has a **Report a bug** button that captures the panel state + recent extension logs into a clean GitHub issue. Use it. We're listening.
