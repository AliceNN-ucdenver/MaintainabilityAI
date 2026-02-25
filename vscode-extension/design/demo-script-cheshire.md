# Cheshire Demo Video Script — "From Governance to Green Builds"

> **Runtime Target**: ~15-18 minutes
> **Tone**: Practitioner-focused, Wonderland-flavored, start-to-finish narrative
> **Premise**: Start with a governed BAR in the Looking Glass. Discover drift. Bring an ungoverned repo into the mesh. Scaffold security onto it. Show agent-driven remediation.
> **Key Story**: Architecture drift is real — code diverges from what was planned. We detect it, govern it, and remediate it.

---

## The Cast (for this demo)

| Character | Role in Demo |
|-----------|-------------|
| **Looking Glass** | Starting point — the BAR we're governing |
| **Absolem** | Discovers architecture drift, proposes CALM patches |
| **White Rabbit** | Bridges governance → code (adds repo to BAR) |
| **Cheshire Cat** | Scaffolds SDLC structure onto the repo |
| **Security Scorecard** | Shows the repo's security posture tile by tile |
| **Rabbit Hole** | Creates security issues with auto-selected prompt packs |
| **Alice** | The agent that remediates security findings |
| **You** | The architect — you approve every step |

---

## ACT 1: The BAR — Where We Start (2 min)

**[SCREEN: VS Code — Looking Glass panel, drilled into the IMDB Lite BAR]**

> We're inside the Looking Glass — our governance mesh. This is a BAR — a Business Application Resource — called IMDB Lite. It's the governance view of an application we've been building.
>
> **[Point to the CALM diagram]**
>
> Here's the architecture we designed. Three components — a React frontend, a Movie API service, and an IMDB Identity service. We agentically developed the frontend and the Movie API — they're already linked to repos, already building.
>
> But look — the IMDB Identity service is in the architecture but it's not linked to any repo in this BAR. It exists as a real codebase in our org, but it's not part of our governance mesh yet. That's a gap.
>
> There's also something else going on. When the team actually built the Movie API, they made a project decision: use **Postgres** instead of the **MongoDB** we had in our CALM diagram. That might have been the right call — but now there's drift between what we documented and what's running.
>
> Let's ask the Caterpillar.

---

## ACT 2: Absolem Discovers Drift (3 min)

**[Click the Absolem FAB (bottom-right circle) → chat overlay opens]**

>> This is Absolem — our AI governance assistant. Today we're using **Scan Repo** to compare what's actually in the code against what we documented.

**[Click the "Scan Repo" chip]**

> Let's give it the imdb-identity repo — the one that's in our architecture but not yet linked.

**[Paste: https://github.com/AliceNN-ucdenver/imdb-identity → Send]**

> Watch what happens. Absolem scans the repo — reading package.json, source structure, database connections, CI workflows. It's comparing what it finds against our CALM architecture.
>
> **[Absolem streams analysis — let it run]**
>
> And there it is. Absolem found the drift:
> - The code uses **PostgreSQL via pg** — but our CALM diagram shows MongoDB for this service
> - This was a conscious decision by the team, but it was never reflected in the architecture
> - Absolem is proposing **patches** — not replacing the architecture, just updating it to match reality
>
> **[Show the patches card — updateNode for database type, addRelationship if needed]**
>
> I can see exactly what it wants to change. It wants to update the database node from MongoDB to PostgreSQL, update the connection details. The existing service nodes stay. It's surgical.
>
> Now — was this the right decision? Absolem's analysis shows the team chose Postgres for relational data integrity in the identity domain. That's sound. But without this patch, any future review would flag this as a violation. Let's accept it.

**[Click "Accept" on the patches]**

> Patches applied. The CALM diagram now reflects what the code actually does. Architecture matches reality. That's bottom-up governance.
>
> **[Show the updated CALM diagram]**
>
> Now let's deal with that ungoverned identity service.

---

## ACT 3: Bring IMDB Identity Into the Mesh (5-6 min)

This is the big act — we add the repo, scaffold it, and walk through the scorecard.

### 3a: Add the Repo to the BAR (1 min)

**[Click "+ Add Repo" on the BAR detail view]**

> The IMDB Identity service exists as a repo in our org, but it's not linked to this BAR. Let's add it.

**[Paste: https://github.com/AliceNN-ucdenver/imdb-identity → Add]**

> Repo added. It's now listed under the BAR. The governance mesh knows about it.

### 3b: Clone and Open (30 sec)

**[Click the repo link → clone to workspace → VS Code adds it to the workspace]**

> We click the repo, clone it, and it's added to our workspace. Now let's see what we're working with.

### 3c: Open the Security Scorecard (30 sec)

**[Click the repo tile → Security Scorecard opens for imdb-identity]**

> Here's the Security Scorecard for this repo. And it's… bare. This is a codebase that was built without our security framework. No CodeQL. No CLAUDE.md. No prompt packs. No fitness functions. No PR template.
>
> Let's fix that.

### 3d: Scaffold Missing Files (1 min)

**[Click "Scaffold Missing Files" on the scorecard — or open Command Palette → Scaffold SDLC Structure]**

> The Cheshire Cat detects the tech stack — Node.js, Express, PostgreSQL. We're selecting:
> - **CLAUDE.md** — agent instructions tailored to this stack
> - **CodeQL workflow** — security scanning
> - **CodeQL → Issues** — auto-create issues from findings
> - **CI workflow** — build, test, failure reporting
> - **PR template** — with AI disclosure section
> - **Prompt packs** — OWASP, maintainability, and STRIDE
>
> We're leaving **fitness functions** unchecked for now — that's Act 4 territory.
>
> **[Click "Scaffold Project"]**
>
> Files created. CLAUDE.md, workflows, prompt packs, PR template — all landed in the repo.

### 3e: Commit and Push (30 sec)

**[git add, commit, push — show briefly]**

> We commit the scaffold and push. Now the deterministic workflows kick in — CodeQL starts scanning, CI runs.
>
> **[Narrator]**: We'll pause here and let the workflows complete. This takes a few minutes on first run.

### 3f: Walk the Scorecard Tiles (2-3 min)

**[SCREEN: Security Scorecard — all tiles visible after workflows complete]**

> Let's walk through each tile now that the workflows have run.
>
> **[Walk through each tile]**
>
> - **Security Compliance** — CodeQL ran. Found some findings — we'll address those in a moment.
> - **CI/CD Health** — Green. Our scaffold set this up, and the first build passed.
>
> Now here's where it gets interesting. The scorecard doesn't just show you numbers — it lets you act on them.
>
> - **Technical Debt** —
>
> **[Click into the Tech Debt tile → show issue creation form]**
>
> Look at this. The scorecard identified files with high complexity. I can create an issue directly from here — it pre-fills the description with the specific files, the complexity scores, the remediation guidance. It's customized to *this finding* in *this repo*.
>
> I'm not going to submit this right now — just showing the flow.
>
> **[Cancel / close the issue form]**
>
> - **Dependency Freshness** —
>
> **[Click into the Dependency Freshness tile → show stale packages → show issue creation]**
>
> Same pattern. Stale dependencies flagged. I can create an issue that lists the exact packages, their ages, and the recommended updates. Again — customized to what the scorecard found.
>
> **[Cancel / close]**
>
> The point: every tile on this scorecard is actionable. Each one can generate an issue that's tailored to the specific finding, with the right context for an agent to pick it up.

---

## ACT 4: The Rabbit Hole — Agent-Ready Security Issues (3 min)

**[SCREEN: VS Code — open the Rabbit Hole panel (IssueCreatorPanel)]**

> Now let's take one of those security findings from CodeQL and turn it into a proper agent-ready issue.

**[Select a security finding — e.g., a CodeQL-detected injection vulnerability]**

> I'm picking a security finding. Watch what happens with the prompt packs.
>
> **[Show the prompt pack auto-selection]**
>
> The Rabbit Hole auto-selects the right packs based on the finding type:
> - **A03 Injection** — because CodeQL flagged an injection vector
> - **Tampering** from the STRIDE threat model — because the mappings.json links injection to tampering
> - **Complexity Reduction** from maintainability — because the mappings associate injection fixes with reducing complexity
>
> This is the `mappings.json` at work — CodeQL finding → OWASP category → related STRIDE threats → related maintainability packs. All automatic.
>
> **[Show the RCTRO prompt being composed]**
>
> The issue body has everything:
> - The **RCTRO prompt** — Role, Context, Task, Requirements, Output
> - **Prompt pack file references** — where the agent can read the full `.md` files in the repo
> - **Embedded pack content** — collapsible sections with the full OWASP A03 guidance
> - The **Implementation Zone** — instructions for assigning to Claude or Copilot
>
> **[Click "Create Issue"]**
>
> Issue created on GitHub. Now let's assign it.

**[On GitHub — comment: @claude on the issue]**

> One comment: **@claude**. The agent picks up the issue, reads CLAUDE.md, reads the prompt packs in the `prompts/` directory, and starts working.
>
> **[Brief: show Claude entering Phase 1, proposing a plan]**
>
> Claude reads the OWASP A03 pack, proposes parameterized queries, input validation, safe error handling. The plan looks right.

**[Comment: @claude approved]**

> Phase 2 — implementation. Claude creates a branch, makes the fix, runs tests, opens a PR. CI runs. CodeQL re-scans. The vulnerability is gone.

---

## ACT 5: The Circle Closes (1-2 min)

**[SCREEN: VS Code — pull the changes, refresh the Scorecard]**

> Let's pull the fix and see the impact.

**[git pull → Refresh Security Scorecard]**

> Security Compliance — green. The finding is resolved.
>
> **[Show the Looking Glass panel — BAR detail]**
>
> And in the Looking Glass, the IMDB Identity service is now part of the governed mesh. Architecture matches code. Security framework in place. Agent-remediated findings. Green builds.
>
> We started with a governed BAR that had drift and a missing repo. We used Absolem to detect and patch the drift. We brought the ungoverned identity service into the mesh. Scaffolded security onto it. Walked the scorecard. Created an agent-ready issue through the Rabbit Hole. Let an agent fix it.
>
> **[Pause — show split: Looking Glass on left, Scorecard on right]**
>
> Governance → Architecture → Code → Security → Remediation → Governance.
>
> The Cat vanishes. The grin remains. As a secure, well-governed, maintainable codebase.
>
> **[End card: maintainability.ai]**

---

## Production Notes

### Timing

| Act | Duration | Content |
|-----|----------|---------|
| 1 — The BAR | 2 min | BAR detail, CALM diagram, identify drift + missing repo |
| 2 — Absolem Drift | 3 min | Scan Repo, Postgres vs Mongo discovery, patches |
| 3 — IMDB Identity | 5-6 min | Add repo, clone, scorecard, scaffold, push, walk tiles, show issue creation |
| ☕ Edit Point | — | Fast-forward CodeQL + CI workflows |
| 4 — Rabbit Hole | 3 min | Auto-selected prompt packs, RCTRO, create issue, assign agent |
| ☕ Edit Point | — | Fast-forward agent remediation |
| 5 — Close | 1-2 min | Pull fix, green scorecard, recap |
| **Total** | **~15-17 min** | |

### Pre-Recording Setup

1. **BAR ready**: IMDB Lite BAR with three-tier CALM diagram (React frontend, Movie API, IMDB Identity). Frontend and Movie API already linked to repos. IMDB Identity node exists in architecture but NO repo linked.
2. **IMDB Identity drift**: The CALM diagram shows MongoDB for the identity service, but the actual `imdb-identity` repo uses PostgreSQL. This is the drift Absolem will discover.
3. **imdb-identity repo ready**: Existing repo in the org with known CodeQL-detectable vulnerabilities. Must NOT have CLAUDE.md, workflows, or prompt packs (remove if present before recording).
4. **movie-api repo**: Already scaffolded and linked — this is "done" from a prior session.
5. **gh CLI authenticated**: `gh auth status` should show the correct org.
6. **GitHub MCP or gh CLI available**: for Absolem repo scanning.

### Edit Points

| Point | What to Cut | Resume When |
|-------|------------|-------------|
| After Act 3e (push) | Wait for CodeQL + CI first run | Scorecard tiles populated |
| During Act 4 (agent work) | Claude implementation time | PR is created |

### Key Moments to Emphasize

- **Drift discovery** — Absolem finds Postgres vs Mongo. This is the "aha" moment. Architecture doesn't match code.
- **Conscious decision validated** — The team chose Postgres for good reasons, but the architecture wasn't updated. Absolem patches it.
- **Ungoverned → governed** — IMDB Identity goes from "exists but unmanaged" to fully scaffolded and scanned.
- **Scorecard tiles are actionable** — Each tile can generate a customized issue. Show but don't submit for tech debt and dependency freshness.
- **Prompt pack auto-selection** — The Rabbit Hole knows which packs to select based on the finding type. Show the `mappings.json` chain.
- **Human approval gates** — You approve Absolem patches, you approve Claude's plan. Humans own decisions.
- **The circle closing** — governance → code → security → remediation → governance

### Wonderland Callbacks

- "The Caterpillar already knows" — Absolem discovering the Postgres drift
- "Down the rabbit hole" — creating the security issue with auto-selected packs
- "Follow the White Rabbit" — linking the identity repo into the mesh
- "The Cat vanishes, the grin remains" — closing with the green scorecard

### Screen Setup

- **1920x1080**, dark theme VS Code, browser in dark mode
- **Font size**: 14px in editor, zoom browser to 110% for GitHub
- **Panels**: Looking Glass and Scorecard should both be visible during relevant acts
- **Terminal**: visible but not dominant — split pane with editor

### What Changed from v1

| v1 | v2 | Reason |
|---|---|---|
| Act 2 scanned a generic repo | Act 2 discovers specific Postgres vs Mongo drift | Real-world story — project decision created drift |
| Act 3 was just "add repo" (1 min) | Act 3 is the big act — add, clone, scaffold, scorecard walkthrough | Shows the full Cheshire Cat flow end-to-end |
| Acts 4-5 were separate (scaffold + scorecard) | Merged into Act 3 | Tighter narrative — scaffold and scorecard are one flow |
| Scorecard was "first look" only | Scorecard walks each tile + shows issue creation (don't submit) | Demonstrates actionable tiles |
| No Rabbit Hole shown | Act 4 shows Rabbit Hole with auto-selected packs | Key differentiator — prompt pack auto-selection |
| 8 acts | 5 acts | Tighter, less fragmented |
| imdb-identity not mentioned | imdb-identity is the ungoverned repo we bring in | More realistic — not all repos start governed |
| Fitness functions scaffolded | Fitness functions deferred to "Act 4 / another day" | Keeps focus; fitness functions deserve their own segment |
