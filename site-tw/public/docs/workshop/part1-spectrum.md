# Part 1: The Rabbit Hole

<div class="docs-workshop-hero docs-workshop-blue">
  <div class="docs-workshop-number">1</div>
  <div>
    <div class="docs-card-kicker">Workshop Part 1 · Orientation</div>
    <h2 class="docs-workshop-title">The Rabbit Hole</h2>
    <p class="docs-workshop-subtitle">The Spectrum of AI-Assisted Development</p>
  </div>
  <div class="docs-workshop-meta">
    <strong class="docs-strong">Duration:</strong> 45 minutes<br/>
    <strong class="docs-strong">Prerequisites:</strong> VS Code, GitHub account, the <a href="/docs/workshop/starter-pack" class="markdown-link"><code>imdb-lite-workshop-pack</code></a> cloned and running with <code>docker compose up</code><br/>
    <strong class="docs-strong">SDLC phase:</strong> Phase 1 (Design). Stage selection happens before any code.<br/>
    <strong class="docs-strong">Status:</strong> Available now
  </div>
</div>

> Three stages of maturity. Three autonomy tiers. By the end of this part you will know which stage suits each piece of work in front of you, why the **celeb-api** BAR starts in the strictest tier, and what humans are still uniquely responsible for in 2026-2027 even as the agents get better.

---

## What you will have built when you leave

1. The MaintainabilityAI VS Code extension installed and signed in.
2. A governance mesh initialised on your laptop.
3. The **IMDB Lite** sample platform created in Looking Glass, with two BARs visible: `APP-IMDB-001` (the brownfield movies app) and `APP-IMDB-002` (the greenfield celebrities app).
4. The `movie-api` repository (from the workshop pack) scaffolded with Cheshire so you can read its first Security Scorecard. This is the brownfield repo with real, planted-vulnerable code; you will see it sitting low and Restricted, and Parts 2 through 6 work directly on it.
5. A look at the **celeb-api** BAR (`APP-IMDB-002`), the greenfield sibling that ships no code yet and that you build from scratch in the Part 8 capstone, so you can see why a sparse, no-code BAR also lands in Restricted tier.
6. A defensible answer to "Which AI stage should this work be at?" on three sample features, plus a sense of the concrete decisions that stay in your hands in an agentic SDLC.
7. Golden Rule 1 internalised: **Choose the stage before you choose the prompt.**

---

## The 70/30 problem has not gone away. It evolved.

In 2024 the framing was simple. **AI handles 70% of the work brilliantly: the boilerplate, the CRUD, the scaffolding. The 30% that decides whether a system survives contact with production is still human work.**

The ratio is roughly the same in 2026-2027. What changed is what counts as "the 30%". The new 30% is *wider* than the old one because agents got better at the easy parts and gained the ability to act autonomously. More decisions now happen at machine speed, so more boundaries have to exist before the first prompt is written. Industry voices have started to call this the move "from creator to curator", or from coder to "cognitive architect", and the OWASP Top 10 for Agentic Applications (December 2025) added entirely new risk classes like Agent Goal Hijack and Tool Misuse that simply did not exist as named threats two years ago.

### Where humans still add the value, with concrete examples

These six areas are where a human's judgment, accountability, and authority cannot be delegated to an agent. Not in 2026. Not in 2027. Arguably not ever.

<div class="docs-card docs-card-muted">

**1. Architecture and intent**

Declaring the CALM model that the agent's actions are checked against. Writing the IntentSpec that says *what good looks like* for this feature. Choosing strangler-fig over big-bang for a migration. Approving a new shared database. Deciding that the search endpoint must never return more than 50 rows. The agent can propose architecture. Only a human can ratify it as the system's truth.

**2. Threat modeling and governance design**

Running STRIDE on a new endpoint before code exists. Naming the OWASP categories the Red Queen blocks and the ones it warns on. Deciding that the `?redirect=` URL parameter must be on an allowlist so open-redirect attacks fail closed. Writing the policy that an agent cannot move data across a trust boundary without an explicit ADR. Agents enforce these rules at machine speed once written. A human has to write them.

**3. Domain judgment and business tradeoffs**

What users actually need versus what a survey said they wanted. Whether the cache invalidation strategy is "evict on write" or "TTL plus stale-while-revalidate", and why one of those is wrong for billing. Whether the contract change is worth the consumer migration. What counts as PII in this jurisdiction. These are not technical questions. They are judgment calls grounded in context an agent cannot have.

**4. Ethics, compliance, and accountability**

Signing off on PHI encryption-at-rest changes before they ship. Authorising a 90-day key rotation rollout: which keys, which services, in what order, with what rollback. Naming when EU AI Act Article 14 requires meaningful human oversight. Owning the audit trail. The signature on the bottom of the page belongs to a human, in every jurisdiction worth shipping in.

**5. Trust calibration and override authority**

Approving a **break-glass override** when production is on fire: scoped, time-limited, with a written reason that goes into the audit chain. Revoking an agent's autonomy after an incident. Deciding when an agent has earned more tier. Calibrating the trust battery is a human responsibility because *being trusted* is a human relationship.

**6. Systems thinking and blast radius**

Reasoning about what *else* a change touches. An agent sees the endpoint; you see four downstream consumers, the shared `users` table, the migration that has to ship in this order or data is lost, the new OWASP Agentic risk of Tool Misuse if the agent's scope widens to a fifth repo. Systems thinking, *how the whole behaves when you change one piece*, is the discipline that makes the other five additive instead of brittle.

</div>

Everything outside those six areas is increasingly delegable. Everything inside them is yours.

---

## Your new job description

The six areas above are not aspirational. They are the work in front of you right now. To make the shift tangible, here is how the engineer's day-to-day changes.

| In 2024 you spent time on | In 2026-2027 you spend time on |
|---|---|
| Typing implementation code | Writing the RCTRO contract the AI fills in |
| Reviewing every PR diff line-by-line | Reviewing AI-assisted PRs against the contract. Ratifying autonomous PRs that already cleared policy. |
| Catching bugs in code review | Catching gaps in **intent** before code is written |
| Stack Overflow lookups and one-off fixes | Curating the prompt packs the team's AI reads on every task |
| Patching security issues after pentest | Designing the **policy** that prevents the class of bug in the first place |
| Owning a service | Owning a **Business Application Repository (BAR)**: its CALM model, its scorecard, its autonomy tier |
| One repo at a time | Cross-repo flows, interface contracts, blast radius |
| Asking for a code review | Asking for **evidence**: which prompt, which threat model, which fitness result, which reviewer |

The shorthand: **you move from code author to systems thinker, governance designer, and intent author.** The agent writes the code. You decide what *good* means, write down the rules that make it stick, and prove it stayed good after the agent shipped.

This is why mode selection is the first skill we teach. The engineer who can name when **Vibe** is appropriate, when **AI-Assisted** is the contract, and when **Agentic** has earned the right to run unattended is the engineer who can lead a team through the shift, not just survive it.

---

## The maturity progression

The three modes are not three styles you pick from a menu. They are a **maturity progression** for a piece of work, gated by how much governance the surrounding repository can prove.

<svg viewBox="0 0 920 380" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-labelledby="maturityTitle maturityDesc">
  <title id="maturityTitle">AI-assisted development maturity progression</title>
  <desc id="maturityDesc">A three-step staircase rising from Vibe coding through AI-Assisted engineering to Agentic development. Each step shows who drives the work, what ships, and what governance enforcement is required.</desc>
  <defs>
    <linearGradient id="matBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1224"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="matStep1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(251, 191, 36, 0.18)"/>
      <stop offset="100%" stop-color="rgba(251, 191, 36, 0.04)"/>
    </linearGradient>
    <linearGradient id="matStep2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(96, 165, 250, 0.20)"/>
      <stop offset="100%" stop-color="rgba(96, 165, 250, 0.04)"/>
    </linearGradient>
    <linearGradient id="matStep3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(167, 139, 250, 0.22)"/>
      <stop offset="100%" stop-color="rgba(167, 139, 250, 0.04)"/>
    </linearGradient>
    <linearGradient id="matAxis" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(251, 191, 36, 0.6)"/>
      <stop offset="50%" stop-color="rgba(96, 165, 250, 0.6)"/>
      <stop offset="100%" stop-color="rgba(167, 139, 250, 0.6)"/>
    </linearGradient>
  </defs>
  <rect width="920" height="380" rx="14" fill="url(#matBg)"/>
  <text x="460" y="32" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="800" letter-spacing="1.5" font-family="system-ui, sans-serif">THE AI-ASSISTED DEVELOPMENT MATURITY PROGRESSION</text>
  <rect x="40" y="240" width="240" height="100" rx="10" fill="url(#matStep1)" stroke="rgba(251, 191, 36, 0.4)" stroke-width="1"/>
  <rect x="40" y="240" width="4" height="100" fill="#fbbf24"/>
  <text x="58" y="262" fill="#fbbf24" font-size="10" font-weight="700" letter-spacing="1.2" font-family="system-ui, sans-serif">STAGE 1</text>
  <text x="58" y="287" fill="#f8fafc" font-size="18" font-weight="800" font-family="system-ui, sans-serif">Vibe</text>
  <text x="58" y="308" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">AI proposes · you accept</text>
  <text x="58" y="324" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">Sandbox · no users · no data</text>
  <rect x="320" y="160" width="280" height="140" rx="10" fill="url(#matStep2)" stroke="rgba(96, 165, 250, 0.4)" stroke-width="1"/>
  <rect x="320" y="160" width="4" height="140" fill="#60a5fa"/>
  <text x="338" y="182" fill="#60a5fa" font-size="10" font-weight="700" letter-spacing="1.2" font-family="system-ui, sans-serif">STAGE 2 · THIS WORKSHOP</text>
  <text x="338" y="207" fill="#f8fafc" font-size="18" font-weight="800" font-family="system-ui, sans-serif">AI-Assisted</text>
  <text x="338" y="228" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">You write the RCTRO contract</text>
  <text x="338" y="244" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">AI fills it in</text>
  <text x="338" y="260" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">You review every line</text>
  <text x="338" y="282" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">Governance enforces the boundary</text>
  <rect x="640" y="80" width="240" height="180" rx="10" fill="url(#matStep3)" stroke="rgba(167, 139, 250, 0.4)" stroke-width="1"/>
  <rect x="640" y="80" width="4" height="180" fill="#a78bfa"/>
  <text x="658" y="102" fill="#a78bfa" font-size="10" font-weight="700" letter-spacing="1.2" font-family="system-ui, sans-serif">STAGE 3</text>
  <text x="658" y="127" fill="#f8fafc" font-size="18" font-weight="800" font-family="system-ui, sans-serif">Agentic</text>
  <text x="658" y="148" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">AI plans · executes · reports</text>
  <text x="658" y="164" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">Against acceptance criteria</text>
  <text x="658" y="180" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">you set up front</text>
  <text x="658" y="202" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">Policy engine enforces flows,</text>
  <text x="658" y="218" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">controls, contracts, autonomy</text>
  <text x="658" y="234" fill="#cbd5e1" font-size="12" font-family="system-ui, sans-serif">No PR merges without evidence</text>
  <line x1="280" y1="244" x2="320" y2="244" stroke="rgba(148, 163, 184, 0.4)" stroke-width="2" stroke-dasharray="4 4"/>
  <line x1="320" y1="164" x2="320" y2="244" stroke="rgba(148, 163, 184, 0.4)" stroke-width="2" stroke-dasharray="4 4"/>
  <line x1="600" y1="164" x2="640" y2="164" stroke="rgba(148, 163, 184, 0.4)" stroke-width="2" stroke-dasharray="4 4"/>
  <line x1="640" y1="84" x2="640" y2="164" stroke="rgba(148, 163, 184, 0.4)" stroke-width="2" stroke-dasharray="4 4"/>
  <line x1="40" y1="358" x2="880" y2="358" stroke="url(#matAxis)" stroke-width="2.5" stroke-linecap="round"/>
  <text x="40" y="375" fill="#64748b" font-size="10" font-weight="700" letter-spacing="2" font-family="system-ui, sans-serif">GOVERNANCE ENFORCEMENT REQUIRED →</text>
  <text x="880" y="375" text-anchor="end" fill="#64748b" font-size="10" font-weight="700" letter-spacing="2" font-family="system-ui, sans-serif">AUTONOMY EARNED</text>
</svg>

The staircase only goes up if the repository earns the next step. That is where the **autonomy tier** comes in.

### Smell test: you are in the wrong stage when…

The hardest part of the maturity model is not the definition. It is the honest self-check. *Am I in the right stage for this piece of work right now?* These are the signals a chief engineer looks for in code review and in conversation.

| Stage | You are in the wrong stage when… |
|---|---|
| **Vibe** | Any real user depends on the output. Any data is real. The repo has a CALM model. You hesitated before accepting the diff. You are about to commit to a branch other people merge from. |
| **AI-Assisted** | You accepted code you cannot explain back to the team. The contract did not name OWASP categories the work obviously touches. You skipped the review because the diff "looked small". The prompt was a one-liner instead of an RCTRO. |
| **Agentic** | You cannot write machine-checkable acceptance criteria. The repo is not in Autonomous tier. The work crosses a security-critical path. The agent produced a contract change you did not approve up front. You are hoping the policy engine catches what you did not think of. |

A useful framing for the live class. *The right stage is not the one you feel most productive in. It is the one the work and the repo can both sustain.*

### Stage versus tier: the two axes

The stage is the *style of work*. The tier is the *posture of the repo*, and the repo's posture is computed from artifacts, not declared by a developer.

| Score | Tier | What the AI can do without per-step approval |
|---|---|---|
| 80–100 | **Autonomous** | Write, Edit, Bash within issue scope. The Red Queen still validates flows and controls. Autonomy is not lawlessness. |
| 50–79 | **Supervised** | Read freely. Structural changes must pass the deterministic PreToolUse policy (the CALM model still gates the work). Weak-pillar OWASP and STRIDE packs are injected into every prompt. |
| 0–49 | **Restricted** | Plan-first. Bash and Write are blocked by a PreToolUse hook. Edit requires a recorded human approval. Every decision is audited. |

A Restricted repo cannot run Stage 3 agentic work because the hooks refuse. An Autonomous repo *can* run Stage 1 vibe work, but you should not. The autonomy is for the agent, not for sloppy prompting. The combination this workshop targets is **Stage 2 (AI-Assisted) at the tier the repo has earned**. Today both IMDB Lite repos have earned exactly one tier: Restricted — the brownfield movie-api because its planted-vulnerable code scores low, the greenfield celeb-api because its governance is sparse and nothing is built yet.

---

## The agentic shift

In 2024, governance was a code review at the end. A human reading a diff, deciding if the AI made sense, merging or not. In 2026-2027, governance is a tier gate at the start. The scorecard decides what your AI is permitted to do before the first prompt is written. That is why a low-scoring repo (Restricted, every Bash blocked) feels nothing like a mature platform service (85/100, Autonomous, AI ships PRs unattended within policy).

The rest of this workshop is the **movie-api**'s journey from a low score to **65+**. The movie-api is the brownfield repo: it ships with real code and planted vulnerabilities, so it is the repo Parts 2 through 6 actually work on. Each part adds one capability that lifts its score and earns the repo more autonomy. The **celeb-api** is the greenfield sibling — no code yet — that you build from scratch as the Part 8 capstone.

- Part 2 adds prompt packs to the movie-api. **Code Security** pillar up.
- Part 3 ships a remediation on the movie-api using those packs. **Test Coverage** and **Code Security** up.
- Part 4 adds fitness functions. **Complexity** and **Dependency Freshness** under control.
- Part 5 wires scanners. **Code Security** to green.
- Part 6 versions the prompts. Reproducibility ratchet.
- Part 7 installs the Red Queen: a deterministic policy + PreToolUse hook, plus a one-click, scoped, audited break-glass for Restricted-tier work. Tier becomes deterministic instead of advisory.
- Part 8 builds the greenfield celeb-api from scratch and ships one PR with the full evidence chain. Capstone.

---

## Walkthrough: from zero to a Restricted-tier scorecard

This walkthrough is self-contained. You will install the extension, initialise a governance mesh, seed the **IMDB Lite** sample platform, inspect the greenfield **celeb-api** BAR, and scaffold the brownfield `movie-api` repo from the workshop pack. By the end you will be looking at a real Security Scorecard.

### Step 1. Install the MaintainabilityAI VS Code extension

Open VS Code. Go to **Extensions**. Search for **MaintainabilityAI**. Install. The publisher is `chiefarcheologist`.

After install you will see two new icons in the Activity Bar.

- **Looking Glass** (portfolio and governance mesh)
- **The Cheshire Cat** (repo-side scaffolding and scorecard)

### Step 2. Initialise a governance mesh

Click the **Looking Glass** icon. The first time you open it, you will see a banner: **No governance mesh configured**. Click **Initialize Mesh**.

You will be prompted for a folder. Pick anything outside your code repos. The pack ships with one pre-seeded at `imdb-lite-workshop-pack/governance-mesh`. Use that folder.

The extension writes a starter `mesh.yaml`, a `portfolio/` directory, and an empty `platforms/` directory. The Looking Glass panel reloads and shows your portfolio: empty.

### Step 3. Create the IMDB Lite sample platform

In the Looking Glass panel toolbar, click **Create Sample Platform**. A quick-pick appears.

```
[ ] Insurance Operations  — 3 BARs: Claims, Policy Admin, Fraud Detection
[ ] IMDB Lite             — 3-tier web app: React + Express API + DB
```

Choose **IMDB Lite**. The extension scaffolds two BARs into your mesh.

- `APP-IMDB-001` — IMDB Lite Application (movies, reviews, ratings). **Brownfield**: ships with real code (`movie-api`, `imdb-identity`, `imdb-react-frontend`) and planted vulnerabilities. This is the remediation track.
- `APP-IMDB-002` — IMDB Celebs (celebrity profiles, search, news). **Greenfield**: no code yet, and an intentionally sparse governance model (no security pillar). This is the repo you build from scratch in the Part 8 capstone.

Each BAR comes with a CALM architecture template, capability mappings, and an empty governance scorecard waiting on real artifacts.

### Step 4. Inspect the celeb-api BAR — the sparse-Restricted asymmetry

In Looking Glass, expand **Portfolio → IMDB Lite → APP-IMDB-002 (IMDB Celebs)**. You will see the CALM architecture for this BAR.

- Nodes: `celeb-frontend`, `celeb-api`, `celeb-db`, `news-feed`
- Flows: `celeb-frontend → celeb-api → celeb-db`, plus `celeb-api → news-feed`
- **No declared flow** from `celeb-frontend → celeb-db`.

Memorise that last line. It is what the Red Queen will block in Part 7 when an over-eager AI tries to query the database directly from the frontend.

Note *why* this BAR is Restricted: not because of planted code vulnerabilities (there is no code yet), but because the BAR's governance is intentionally sparse (no security pillar) **and** nothing has been built. A no-code, under-governed BAR lands in Restricted tier just as surely as a brownfield repo full of bugs. That asymmetry — same tier, two completely different causes — is the lesson here. The celeb-api is the greenfield sibling you build in Part 8; the rest of the hands-on work below targets the brownfield `movie-api`.

### Step 5. Scaffold the movie-api code repo with Cheshire

The workshop pack already cloned the repos to `imdb-lite-workshop-pack/repos/`. Open the `movie-api` folder in a new VS Code window (`File → Open Folder`). This is the brownfield repo with real, planted-vulnerable code — the repo Parts 2 through 6 work on.

Click the **Cheshire Cat** icon. Choose **Scaffold SDLC Structure**. A panel opens with a multi-select of artifact groups. Leave the defaults for now (Alice agent persona, repo metadata, GitHub workflows, PR template, SECURITY.md, `.cheshire/prompts/` directory). **Uncheck** the `Red Queen governance files` option for now; we will come back to it in Part 7.

Click **Scaffold**. Cheshire writes about 20 files. Watch the side panel show each step. The repo now has:

- A `.cheshire/prompts/` directory pre-seeded with OWASP, STRIDE, and maintainability prompt packs.
- GitHub workflows for CodeQL, CI, and a CodeQL-to-issues flow that can dispatch Alice.
- The **Alice agent persona** (`alice-maintenance-agent`) plus repo-metadata declaring the BAR context for any agent that opens the repo.

### Step 6. Read the score

Still in the Cheshire Cat panel, click **Security Scorecard**. You will see something close to this.

```
movie-api                                  5 / 100      RESTRICTED
  Code Security                            0 / 25       red    (planted vulnerabilities, no scanners run)
  Test Coverage                            5 / 20       red    (only smoke tests)
  Technical Debt                           0 / 15       red    (4 open TODO items)
  Dependency Freshness                     0 / 15       red    (lodash CVE + deps > 6 months old)
  Complexity                               0 / 15       red    (one function over 12)
  Architecture                             0 / 10       red    (no CALM linkage yet)
```

This is the honest baseline. The movie-api ships with planted vulnerabilities (A03 NoSQL/operator injection on `GET /movies?genre=`, A01 unauthenticated `POST /movies`, A10 SSRF in `poster-proxy`, A02 hardcoded secret in `ratings-feed`, a lodash CVE) and stale dependencies on purpose. Every subsequent part of the workshop fixes one slice of this scorecard.

The small number is the point. The movie-api is an existing, unsecured CRUD service in the same shape thousands of internal APIs start in. We are using it because it is the most honest starting point you can give a real class.

---

## Q&amp;A

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 1. The movie-api scores 5/100 and lands in Restricted tier. Can a teammate flip it to Autonomous so the AI can move faster?</summary>

No. The tier is computed from the scorecard, not selected from a dropdown. The Red Queen reads the score and applies the matching policy. The only way to move from Restricted to Supervised to Autonomous is to **change the artifacts that feed the score**. Add prompt packs (Part 2), raise test coverage (Part 3), add fitness gates (Part 4), close TODOs and refresh dependencies (Parts 4 and 5). That is the entire arc of this workshop. For Restricted-tier work there is a one-click, scoped, time-limited, audited **break-glass** override; every grant and every decision lands in `.redqueen/audit-log.jsonl`. The richer UX (scoped budgets, written reasons captured at override time, signed override events, CODEOWNER co-signing) is <a href="/docs/red-queens-court#queens-next-act" class="markdown-link">Queen&rsquo;s Next Act</a>. "The AI was being slow" is not on the allowed list under either model.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 2. A junior on my team wants to vibe-code the celeb-api search endpoint. What is the right answer?</summary>

Two answers, both true. (a) *Today, in this repo*, vibe coding will fail closed. The PreToolUse hooks we install in Part 7 block Bash and Write outright, and the review workflow will not approve a PR without a recorded prompt. (b) *In principle, anywhere*, vibe coding belongs to a personal sandbox, not a service that touches user data. Restricted tier says out loud what good engineers already know. Production code is not the place to find out what works.

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Question 3. Why are we orienting around the repository's score instead of the developer's skill?</summary>

Because the score travels with the code, and the developer does not. A senior engineer can write a careful prompt for a low-scoring repo and ship safely. A junior can adopt the same prompt pack on the same repo and ship at the same level of safety. The tier system makes the repo's posture portable across people and across AI agents (Claude Code, Copilot Coding Agent, Cursor all read the same MCP context). That is how a team gets a consistent floor regardless of who is holding the keyboard.

</details>

---

## Try it yourself: the Cheshire workflow you will repeat every part

Every feature shipped through this workshop starts the same way. A plain-English description goes into **Cheshire Cat → Issue Management → New Feature**. Cheshire converts it into an **RCTRO-formatted GitHub issue** with the relevant OWASP, STRIDE, and maintainability prompt packs embedded in the issue body, so whichever AI agent picks it up (Claude Code, Copilot Coding Agent) reads the full security playbook before writing a line.

We will deep-dive on the RCTRO format in Part 2. For Part 1, just see the **shape** of what Cheshire produces and make the **stage and tier decision** based on what you see.

### The workflow

1. In VS Code, click the **Cheshire Cat** icon in the Activity Bar.
2. Open **Issue Management → New Feature**.
3. Paste the plain-English description.
4. Cheshire detects applicable OWASP and STRIDE categories from the description and lets you confirm them.
5. Click **Generate**. Cheshire writes the RCTRO and opens a real GitHub issue against your repo.
6. **Read the RCTRO** before you decide what stage and tier are appropriate.

### Feature A. Add celebrity name search (walked through)

**Plain English you would paste into Cheshire:**

> Add a `GET /search?q={query}` endpoint to the celeb-api that returns up to 20 celebrities whose name matches the query string. Called from the celeb-frontend.

**What Cheshire generates** (the RCTRO issue body. Collapsed for now, expand to peek.)

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">▶ Show the RCTRO issue Cheshire would produce</summary>

```markdown
## Role
Senior backend engineer adding a query endpoint to the celeb-api.

## Context
- BAR: APP-IMDB-002 (celeb-api, greenfield). Tier: Restricted. Stack: TypeScript / Express / MongoDB (Mongoose).
- Existing CALM flow: celeb-frontend → celeb-api → celeb-db (unchanged).
- Applicable prompt packs: /docs/prompts/owasp/A03_injection, /docs/prompts/owasp/A01_broken_access_control.
- Relevant fitness functions: complexity ≤10, coverage ≥80% on new code.

## Task
Implement `GET /search?q={query}` returning up to 20 celebrities whose name
contains the query string.

## Requirements
- Validate `q` with a Zod schema that parses it as `z.string()` (not `z.unknown()`), max 100 chars, allowlist regex `/^[a-zA-Z0-9 .\-']+$/`, and **explicitly rejects any object whose keys start with `$`** so `?q[$ne]=` cannot bypass.
- Build the Mongo selector from the parsed value, not the raw `req.query.q`. Never call `.find(req.body)` / `.find(req.query)`.
- No `$where`, `$accumulator`, or `$function`; any value passed to `$regex` is escaped (RE2-style, no unbounded backtracking).
- Chain `.limit(20)` server-side and apply a projection allowlist (`.project({ name: 1, bio: 1 })` or equivalent) so password / internalNotes never reach the wire.
- Generic error response on failure. No driver error, collection schema, or stack-trace leakage.
- Tests: valid search, empty query, operator-injection (`q[$ne]=`), `$where` payload, regex DoS (`.*.*.*.*x`), oversized payload, unicode payload.

## Output
- `src/routes/search.ts` (new route)
- `src/validators/search.ts` (Zod schema)
- `src/routes/__tests__/search.test.ts` (Jest tests)
- No new runtime dependencies.
- PR labelled `🤖 AI-assisted · A03 · A01`.
```

</details>

**Your decision.** Given this RCTRO, what stage of work is this? What tier does the celeb-api need to be in to ship it?

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work. Feature A.</summary>

**Stage 2 (AI-Assisted).** The RCTRO is specific, the constraints are real (Zod `$`-key reject, escaped regex, server-side `.limit(20)`, projection allowlist), and the security categories are named. This is exactly the work AI-Assisted mode is for. A human writes the contract, the AI fills it in, the human reviews every line.

**Tier needed: Supervised (50–79) at minimum.** Search endpoints are an A03 injection surface. The new route must pass the Red Queen's deterministic PreToolUse policy — the CALM model still gates the work, confirming the route respects the existing flow before any write lands. Today the greenfield celeb-api is Restricted, so to ship this you either earn the tier first or open a scoped, time-limited, audited break-glass for the work. The arc from Part 2 onward (on the brownfield movie-api) is what earns the score lift. **Do not ship until the tier matches the work, or you have a recorded break-glass for it.**

</details>

### Feature B. Rename `bio → biography` (your turn)

**Plain English you would paste into Cheshire:**

> Rename the JSON field `bio` to `biography` everywhere it appears in the celeb-api response and update the celeb-frontend to read the new field name. No new validation, no new attack surface. A pure renaming refactor.

Now you do it. Open **Cheshire → Issue Management → New Feature**, paste the description, generate the RCTRO, read it, then decide stage and tier.

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work. Feature B.</summary>

The RCTRO Cheshire generates will have **no OWASP categories** (it is a rename, not new attack surface), a strong **test-coverage requirement** on changed contracts, and an acceptance criterion around **interface contract diff** (no breaking change to API consumers).

**Stage 3 (Agentic)** is the right call. The work is mechanical, the success criteria are machine-checkable, and the diff can be verified by tooling (the OpenAPI/protobuf/GraphQL contract-diff gate lands in <a href="/docs/red-queens-court#queens-next-act" class="markdown-link">Queen&rsquo;s Next Act</a>). **Tier needed: Autonomous (80–100).** An Agentic rename in a Restricted-tier repo with patchy tests is how you ship a silent breaking change to your frontend. Today's celeb-api cannot ship this yet, and that is the correct answer.

</details>

### Feature C. Personal latency-graph sandbox (your turn)

**Plain English you might paste into Cheshire:**

> On my laptop, a tiny Node script that pings the celeb-api every 10 seconds and graphs p50/p95 latency in a terminal chart. Just for me. Not for the team, not for production.

**Trick question.** Should you even use Cheshire for this one?

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">✓ Check your work. Feature C.</summary>

**Do not use Cheshire.** This code is not governed by the celeb-api BAR. It is a personal sandbox with no users, no data, no production blast radius. **Stage 1 (Vibe)** on your own laptop is exactly right. Open a fresh terminal, prompt your editor's AI freely, ship it to nowhere.

Knowing **when not to reach for the governance tooling** is part of Golden Rule 1. The Cheshire / Red Queen apparatus exists because production code needs a contract and a policy. A throwaway latency grapher needs neither.

</details>

---

## What you learned

- **The 70/30 problem evolved.** AI still handles 70% of the work, but the human 30% widened. Agents now act autonomously, so more boundaries have to exist before the first prompt.
- **Six areas humans still own**, with named decisions: architecture and intent (CALM model, IntentSpec), threat modeling and governance design (STRIDE, open-redirect allowlist), domain judgment (cache invalidation choices, PII jurisdiction), ethics and compliance (PHI encryption, key rotation rollout, EU AI Act Article 14), trust calibration (break-glass override), systems thinking (blast radius, cross-repo impact).
- **The maturity progression is a staircase, not a menu.** Vibe → AI-Assisted → Agentic. Each step requires more governance enforcement than the one before.
- **A repository's autonomy tier is computed from its scorecard**, not chosen by a developer. Score travels with the code; the engineer cannot flip a Restricted repo to Autonomous to ship faster.
- **The smell test is the honest self-check.** The right stage is the one the *work and the repo can both sustain*, not the one you feel most productive in.
- **The IMDB Lite sample is real, and it is two tracks.** Looking Glass → Initialize Mesh → Create Sample Platform creates two BARs (`APP-IMDB-001`, `APP-IMDB-002`) with full CALM models. The brownfield `movie-api` (under `APP-IMDB-001`) you scaffolded is the remediation scenario for Parts 2 through 6; the greenfield `celeb-api` (under `APP-IMDB-002`) is the from-scratch capstone in Part 8.
- **The Cheshire workflow is the template** you will repeat every part: plain-English description → Cheshire generates an RCTRO → decide stage and tier → dispatch (or do not dispatch) Alice. We saw it once today; we run it for real on the movie-api in Part 3.

---

## The Golden Rule for this part

> **Rule 1. Choose the stage before you choose the prompt.**
>
> Stage and tier together set the bar for everything that follows. Get this wrong and no prompt pack, fitness function, or policy gate will save you from the wrong AI doing the wrong thing in the wrong repository.

We will add one Golden Rule per part. By Part 8 you will have the full set.

---

## What is next: Part 2. Cheshire's Prompt Pack

The movie-api is open. The score is honest. Stage and tier are decided. The six areas where humans still own the work are named.

Part 2 introduces the **contract language** we use to talk to the AI on a Restricted repo. We will tour `.cheshire/prompts/`, learn the **RCTRO** pattern (Role, Context, Task, Requirements, Output), and write contracts against the movie-api's biggest scorecard weakness: Code Security.

[Continue to Part 2 →](/docs/workshop/part2-security-prompting)
