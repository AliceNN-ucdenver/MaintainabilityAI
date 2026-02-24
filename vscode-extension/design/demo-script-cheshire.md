# Cheshire Demo Video Script — "From Governance to Green Builds"

> **Runtime Target**: ~15-18 minutes
> **Tone**: Practitioner-focused, Wonderland-flavored, start-to-finish narrative
> **Premise**: Start with a governed BAR in the Looking Glass. End with a secure, scaffolded repo and agent-remediated security issues.
> **Key Story**: Bottom-up governance — the code already exists, we bring it into the mesh.

---

## The Cast (for this demo)

| Character | Role in Demo |
|-----------|-------------|
| **Looking Glass** | Starting point — the BAR we're governing |
| **Absolem** | Scans the repo, proposes CALM patches |
| **White Rabbit** | Bridges governance → code (adds repo to BAR) |
| **Cheshire Cat** | Scaffolds SDLC structure onto the repo |
| **Security Scorecard** | Shows the repo's security posture |
| **Alice** | The agent that remediates security findings |
| **You** | The architect — you approve every step |

---

## ACT 1: The BAR — Where We Start (2 min)

**[SCREEN: VS Code — Looking Glass panel, drilled into a BAR (e.g., "IMDB Lite")]**

> We're inside the Looking Glass — our governance mesh. This is a BAR — a Business Application Resource — called IMDB Lite. It's got an architecture, pillar scores, some ADRs. It's the governance view of an application we're building.
>
> **[Point to the CALM diagram]**
>
> Here's the architecture. We designed this top-down — a three-tier app with an API service, a frontend, and a database. It's what we *planned*.
>
> But here's the thing. We already have a repo. A real, running codebase. And it might not match what we drew on the whiteboard. That's architecture drift — and it's the #1 governance problem in enterprise software.
>
> So let's ask the Caterpillar.

---

## ACT 2: Absolem Scans the Repo (3 min)

**[Click the Absolem FAB (bottom-right circle) → chat overlay opens]**

> This is Absolem — our AI governance assistant. Seven commands, and today we're using a new one: **Scan Repo**.

**[Click the "Scan Repo" chip]**

> Absolem asks for a GitHub URL. Let's give it our movie-api repo.

**[Paste: https://github.com/AliceNN-ucdenver/movie-api → Send]**

> Watch what happens. Absolem is scanning the repo — reading the package.json, the source structure, the README, looking for Docker configs, CI workflows, database connections.
>
> **[Absolem streams analysis — let it run]**
>
> It found:
> - An Express.js REST API — matches our "Movie API" node
> - MongoDB via Mongoose — but wait, we had PostgreSQL in our CALM diagram
> - No frontend yet — that node in CALM is aspirational
> - Mocha tests — good, but no CI/CD pipeline
>
> And here's the key: it's proposing **patches**, not a replacement. It wants to ADD a MongoDB node, ADD the connection from the API to MongoDB, and UPDATE the service description with the actual tech stack.
>
> **[Show the patches card — addNode, addRelationship, updateNode]**
>
> I can see exactly what it wants to change. The existing nodes stay. The existing relationships stay. It's only adding what the code reveals.

**[Click "Accept" on the patches]**

> Patches applied. Now my CALM diagram reflects reality — what the code actually does, not just what we planned. That's bottom-up governance.
>
> **[Show the updated CALM diagram with the MongoDB node]**
>
> Architecture updated. Now let's bring this repo fully into the mesh.

---

## ACT 3: Add the Repo to the BAR (1 min)

**[Click "+ Add Repo" button on the BAR detail view]**

> I'm adding the movie-api repo to this BAR. This updates app.yaml — the BAR's manifest — with the repository URL. Now the governance mesh knows this BAR has a living codebase.

**[Paste or select: https://github.com/AliceNN-ucdenver/movie-api → Add]**

> Repo added. I can see it listed under the BAR. The governance mesh and the code are now linked.
>
> But the repo doesn't have our security framework yet. No CodeQL. No fitness functions. No CLAUDE.md. No prompt packs. Time for the Cheshire Cat.

---

## ACT 4: Scaffold the Repo (3 min)

**[Open terminal — navigate to the cloned movie-api repo]**

> I've got the repo cloned locally. Let's add governance to it.

**[Open Command Palette → MaintainabilityAI: Scaffold SDLC Structure]**

> One command: **Scaffold SDLC Structure.**

**[The Scaffold panel opens — show the options]**

> The Cheshire Cat detects the tech stack automatically — JavaScript, CommonJS, Mocha, npm. It reads the repo-metadata.yml we saved earlier.
>
> I'm selecting:
> - **CLAUDE.md** — agent instructions with our tech stack baked in
> - **CodeQL workflow** — security scanning with SARIF processing
> - **Fitness functions** — complexity limits, coverage thresholds, dependency freshness
> - **PR template** — with AI disclosure section
> - **OWASP prompt packs** — A01 through A10
>
> **[Click "Scaffold Project"]**
>
> **[Show files being created — CLAUDE.md, workflows, templates, prompts]**
>
> Look at what just landed in the repo:
>
> **[Click through CLAUDE.md]**
>
> CLAUDE.md — tailored to this project. When an AI agent picks up an issue in this repo, it reads this first. Language, framework, testing tool, security expectations — all spelled out.
>
> **[Click through the CodeQL workflow]**
>
> CodeQL workflow — runs on every PR. When it finds a vulnerability, the `codeql-to-issues` workflow creates a GitHub issue with the OWASP prompt pack embedded. The agent doesn't just see "SQL injection found" — it sees the full A03 remediation playbook.
>
> **[Click through fitness-functions.yml]**
>
> Fitness functions — automated quality gates. Complexity under 10 per function. Coverage above 80%. Dependencies less than 90 days old. These run in CI and fail the build if the code doesn't meet the bar.

**[Push the scaffolded files to GitHub]**

> Let's push this up. The security pipeline is now live.

---

## ACT 5: The Security Scorecard — First Look (2 min)

**[SCREEN: VS Code — Click Security Scorecard in the activity bar]**

> Now let's see where we stand. This is the Security Scorecard — the Cheshire Cat's health check for any repo.

**[Select the movie-api folder from the dropdown]**

> Six metrics. Six fitness functions. One grade.
>
> **[Walk through each tile]**
>
> - **Security Compliance** — ⏳ Waiting for CodeQL to run. First scan takes a few minutes.
> - **Dependency Freshness** — Let's check.
>
> **[Click "Check Dependencies"]**
>
> Two packages over 90 days. The scorecard flags them.
>
> - **Test Coverage** — Let's run it.
>
> **[Click "Run Coverage"]**
>
> **[Terminal opens in the correct folder — coverage runs]**
>
> 68%. We need 80%. The scorecard shows the gap.
>
> - **Cyclomatic Complexity** — Moderate. Max 13 across 72 functions. One hotspot.
> - **Technical Debt** — A couple of files graded C.
> - **CI/CD Health** — Passing (our scaffold just set this up).
>
> This is the state of the repo *before* any remediation. The dashboard tells us exactly what to fix. Now let's wait for CodeQL.

---

## ☕ EDIT POINT — Wait for CodeQL (cut in post)

> **[Narrator]**: CodeQL takes a few minutes to complete its first run. We'll fast-forward to when the results are in.

---

## ACT 6: Security Issues Appear (2 min)

**[SCREEN: GitHub — Issues tab on movie-api repo]**

> CodeQL ran. And it found things.
>
> **[Show the auto-created issues]**
>
> The `codeql-to-issues` workflow processed the SARIF results and created GitHub issues. Each one has:
> - The vulnerability description from CodeQL
> - The file and line number
> - The CWE mapping
> - And — this is the key — the **OWASP prompt pack** embedded right in the issue body
>
> **[Open one issue — e.g., "SQL Injection in userController.js"]**
>
> Look at this. CodeQL found a potential injection. The issue has the A03 prompt pack collapsed inside — parameterized queries, input validation, Zod schemas, safe error handling. Everything an agent needs to fix this properly.
>
> Let's let Alice handle it.

---

## ACT 7: Agent Remediation (3 min)

**[Comment on the issue: @claude]**

> I assign Claude to the issue. One comment: **@claude**.
>
> **[Show Claude picking up the issue — Phase 1 analysis]**
>
> Claude reads the issue, reads CLAUDE.md, reads the embedded prompt packs. It enters Phase 1 — Curiosity and Planning. It's analyzing the vulnerability, understanding the codebase, proposing a fix.
>
> **[Show the plan]**
>
> The plan:
> - Replace string concatenation with parameterized queries
> - Add Zod input validation on the affected endpoint
> - Add tests that verify the injection vector is blocked
> - Update error handling to prevent schema leaks
>
> This looks right. Let's approve.

**[Comment: @claude approved]**

> **[Show Claude working — incremental commits, tests passing]**
>
> Phase 2 — Implementation. Claude creates a branch, makes the fix, runs tests. Every step incremental. Every step verified.
>
> **[Show the PR being created]**
>
> There's the PR. Security fix with full test coverage. CI is green — CodeQL re-scanned and the vulnerability is gone. Fitness functions pass. Coverage maintained.

---

## ACT 8: The Circle Closes (2 min)

**[SCREEN: VS Code — pull the changes, refresh the Scorecard]**

> Let's pull the fix and see the impact.

**[git pull → Refresh Security Scorecard]**

> Security Compliance — CodeQL findings: **0 high/critical**. Green.
>
> We started in the Looking Glass with a governed BAR. Asked Absolem to scan a repo and patch the architecture. Added the repo to the mesh. Scaffolded the security framework. Watched the scorecard surface issues. Let an agent remediate them. Pulled the fix. Green build.
>
> **[Pause — show the full scorecard, all tiles]**
>
> That's the full cycle. Governance → Architecture → Code → Security → Remediation → Governance.
>
> The Cat vanishes. The grin remains. As a secure, well-governed, maintainable codebase.

---

## CLOSING: What You Just Saw (1 min)

**[SCREEN: Split — Looking Glass on left, Scorecard on right]**

> Eight acts. One continuous flow.
>
> | Step | Who | What |
> |------|-----|------|
> | 1 | **You** | Start at a governed BAR |
> | 2 | **Absolem** | Scan a repo → propose CALM patches |
> | 3 | **You** | Accept patches → architecture matches reality |
> | 4 | **White Rabbit** | Add the repo to the BAR |
> | 5 | **Cheshire Cat** | Scaffold security framework onto the repo |
> | 6 | **Scorecard** | Surface security findings and gaps |
> | 7 | **Alice** | Remediate issues with embedded OWASP guidance |
> | 8 | **You** | Review, approve, merge → green build |
>
> Humans own architecture and governance. AI accelerates everything in between.
>
> That's MaintainabilityAI.
>
> **[End card: maintainability.ai]**

---

## Production Notes

### Timing

| Act | Duration | Content |
|-----|----------|---------|
| 1 — The BAR | 2 min | BAR detail, CALM diagram, set the scene |
| 2 — Absolem Scan | 3 min | Scan Repo command, streaming analysis, patches |
| 3 — Add Repo | 1 min | Add existing repo to BAR |
| 4 — Scaffold | 3 min | Scaffold SDLC, walk through generated files |
| 5 — Scorecard | 2 min | First security health check |
| ☕ Edit Point | — | Fast-forward CodeQL |
| 6 — Issues | 2 min | Show auto-created security issues |
| 7 — Agent Fix | 3 min | @claude → plan → approve → PR |
| 8 — Close | 2 min | Pull fix, green scorecard, recap |
| **Total** | **~18 min** | |

### Pre-Recording Setup

1. **BAR ready**: IMDB Lite BAR with a three-tier CALM diagram, some ADRs, pillar scores visible
2. **Repo ready**: movie-api repo with known CodeQL-detectable vulnerabilities (intentional — don't fix before recording)
3. **No scaffold yet**: repo should NOT have CLAUDE.md, workflows, or prompt packs (remove if present)
4. **gh CLI authenticated**: `gh auth status` should show the correct org
5. **GitHub MCP or gh CLI available**: for Absolem repo scanning
6. **Repo cloned locally**: ready to open in VS Code for scaffold step

### Edit Points

| Point | What to Cut | Resume When |
|-------|------------|-------------|
| After Act 5 | Wait for CodeQL first run | Issues appear on GitHub |
| During Act 7 | Claude implementation time | PR is created |

### Key Moments to Emphasize

- **Absolem proposing patches, not replacements** — this is the architectural insight
- **CALM diagram updating in real time** after patches are accepted
- **Scaffold creating ALL governance files at once** — the "one command" moment
- **CodeQL issues with embedded OWASP packs** — the agent sees the full playbook
- **Human approval gates** — you approve Absolem patches, you approve Claude's plan
- **The circle closing** — governance → code → security → remediation → governance

### Wonderland Callbacks

- "The Caterpillar already knows" — Absolem scanning the repo
- "Down the rabbit hole" — opening the scaffold
- "Follow the White Rabbit" — adding the repo to the BAR
- "The Cat vanishes, the grin remains" — closing with the green scorecard

### Screen Setup

- **1920x1080**, dark theme VS Code, browser in dark mode
- **Font size**: 14px in editor, zoom browser to 110% for GitHub
- **Panels**: Looking Glass and Scorecard should both be visible during relevant acts
- **Terminal**: visible but not dominant — split pane with editor
