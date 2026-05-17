<div class="docs-hero docs-hero-split">
  <div class="docs-hero-inner">
    <div class="docs-eyebrow">Vision <span class="docs-hero-meta">~16 min read</span></div>
    <h1 class="docs-hero-title">The Art of the Possible</h1>
    <p class="docs-hero-copy">
      MaintainabilityAI brings architecture-first governance into the developer workflow. The VS Code extension turns your CALM architecture model into the control plane for AI agents, security reviews, and governance scoring.
    </p>
    <div class="docs-actions">
      <a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" class="docs-button-primary">Install from Marketplace</a>
      <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" class="docs-button-secondary">View on GitHub</a>
    </div>
  </div>
  <figure class="docs-hero-figure">
    <img src="/images/alice-bot.png" alt="MaintainabilityAI architecture guide" class="docs-hero-art" />
    <figcaption class="docs-visual-caption">Architecture-first governance for the agentic age.</figcaption>
  </figure>
</div>

---

## The World Changed. Architecture Governance Didn't.

AI agents generate code at unprecedented speed. Claude writes microservices in minutes. Copilot scaffolds entire applications in seconds. GitHub Actions chains them together autonomously.

But here's the problem no one is solving:

**These agents have no idea what they're building.**

They don't know your architecture. They don't understand your threat model. They can't see your governance scores. They don't know that Service A must never directly access the database, or that your payment processing system requires PCI-DSS compliance, or that the last three security reviews flagged the same authentication vulnerability.

Every AI agent in your organization operates in an **architectural vacuum**.

This is the 70/30 gap.

<svg viewBox="0 0 800 210" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="gapBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="210" rx="12" fill="url(#gapBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#818cf8" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">THE 70/30 GAP</text>
  <!-- 70% column -->
  <rect x="24" y="46" width="366" height="50" rx="8" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)"/>
  <text x="44" y="77" fill="#4ade80" font-size="24" font-weight="800" font-family="system-ui, sans-serif">70%</text>
  <text x="104" y="77" fill="#e2e8f0" font-size="14" font-weight="600" font-family="system-ui, sans-serif">AI handles brilliantly</text>
  <!-- 70% descriptors — 2x2 grid -->
  <rect x="24" y="106" width="178" height="28" rx="6" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.15)"/>
  <text x="113" y="124" text-anchor="middle" fill="#86efac" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Boilerplate</text>
  <rect x="212" y="106" width="178" height="28" rx="6" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.15)"/>
  <text x="301" y="124" text-anchor="middle" fill="#86efac" font-size="11" font-weight="600" font-family="system-ui, sans-serif">CRUD</text>
  <rect x="24" y="142" width="178" height="28" rx="6" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.15)"/>
  <text x="113" y="160" text-anchor="middle" fill="#86efac" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Scaffolding</text>
  <rect x="212" y="142" width="178" height="28" rx="6" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.15)"/>
  <text x="301" y="160" text-anchor="middle" fill="#86efac" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Patterns</text>
  <!-- Divider -->
  <line x1="406" y1="46" x2="406" y2="170" stroke="rgba(148,163,184,0.15)" stroke-width="1" stroke-dasharray="4"/>
  <!-- 30% column -->
  <rect x="422" y="46" width="354" height="50" rx="8" fill="rgba(248,113,113,0.12)" stroke="rgba(248,113,113,0.3)"/>
  <text x="442" y="77" fill="#f87171" font-size="24" font-weight="800" font-family="system-ui, sans-serif">30%</text>
  <text x="502" y="77" fill="#e2e8f0" font-size="14" font-weight="600" font-family="system-ui, sans-serif">Makes or breaks</text>
  <!-- 30% descriptors — 2x2 grid -->
  <rect x="422" y="106" width="172" height="28" rx="6" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.2)"/>
  <text x="508" y="124" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Architecture</text>
  <rect x="604" y="106" width="172" height="28" rx="6" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.2)"/>
  <text x="690" y="124" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Security Posture</text>
  <rect x="422" y="142" width="172" height="28" rx="6" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.2)"/>
  <text x="508" y="160" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Threat Awareness</text>
  <rect x="604" y="142" width="172" height="28" rx="6" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.2)"/>
  <text x="690" y="160" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Governance</text>
  <!-- Solution badge spanning the bottom -->
  <rect x="250" y="182" width="300" height="22" rx="11" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
  <text x="400" y="197" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">MaintainabilityAI closes the 30%</text>
</svg>

AI handles 70% of the work brilliantly - the boilerplate, the CRUD, the scaffolding. But the 30% that makes or breaks your system? Architecture decisions. Security posture. Threat awareness. Governance compliance. That 30% is where systems fail, breaches happen, and technical debt compounds into organizational debt.

**MaintainabilityAI closes that gap.**

---

## What We Built: Governance That Lives Where Developers Work

While enterprise architecture tools sit in browser dashboards disconnected from code, and developer portals catalog services without understanding architecture, we built something different.

**MaintainabilityAI is a VS Code extension that brings CALM-native architecture governance, security-embedded SDLC, and AI-powered review directly into the developer workflow.**

No separate tool. No context switching. No copy-pasting architecture context into prompts. Governance intelligence is embedded in the place developers actually work.

### The Looking Glass - See Everything

<div class="docs-center-block">
<img src="/images/looking-glass-governance.png" alt="Looking Glass governance dashboard showing four-pillar scoring across a portfolio of BARs" class="docs-inline-image" />
</div>

A portfolio dashboard that doesn't just list your applications - it *understands* them.

Every Business Application Repository (BAR) in your portfolio is scored across **four governance pillars**: Architecture, Security, Information Risk, and Operations. Not checklist scores. Scores derived from actual artifacts - CALM architecture models, STRIDE threat models, NIST-mapped security controls, architectural decision records.

Interactive architecture diagrams built on ReactFlow and ELK.js - not static pictures, but living canvases where you can drag, drop, edit, and write changes directly back to your CALM model. Bidirectional editing means the diagram IS the architecture, and the architecture IS the diagram.

<div class="docs-center-block">
<img src="/images/looking-glass-calm.png" alt="Interactive CALM architecture diagram with ReactFlow and ELK.js layout" class="docs-inline-image" />
</div>

Trend sparklines show governance health over time. Drift indicators catch decay before it becomes crisis. Enterprise capability models (ACORD, BIAN) map business capabilities to the applications that implement them.

### Absolem - Your AI Architecture Advisor

<div class="docs-center-block">
<img src="/images/looking-glass-absolem.png" alt="Absolem AI architecture advisor with seven specialized governance commands" class="docs-inline-image" />
</div>

An AI governance assistant that doesn't just answer questions - it understands your architecture.

Seven specialized commands: drift analysis, component addition, CALM validation, cross-pillar gap analysis, ADR suggestions, image-to-CALM conversion, and freeform consultation. Each command operates with full awareness of your CALM model, threat model, governance scores, and architectural decisions.

**Image-to-CALM**: Take a photo of a whiteboard architecture diagram. Absolem converts it into a structured CALM 1.2 architecture model. No manual modeling. No weeks of documentation. Architecture governance that starts from where you are today.

**Scan Repo**: Point Absolem at a GitHub repository. It scans the codebase - package manifests, Docker configurations, CI workflows, source structure - and proposes CALM architecture patches that document reality. Bottom-up governance: derive architecture from running code.

### Oraculum - Automated Architecture Review

<div class="docs-center-block">
<img src="/images/looking-glass-oraculum-review.png" alt="Oraculum review configuration with four-pillar selection, prompt packs, and multi-repo targeting" class="docs-inline-image" />
</div>

Architecture drift detection that actually runs.

Create a review. Select prompt packs. Assign Claude Code or Copilot Coding Agent as reviewers. A GitHub Action checks out your code repos, analyzes them against your CALM architecture model, and posts structured findings to a GitHub Issue - organized by governance pillar, rated by severity, mapped to NIST controls.

Real-time monitoring with avatar timelines. PR detection with checks status. Review metrics saved to your governance mesh. Active review banners with auto-refresh. This isn't a governance wishlist - it's a shipped, working review pipeline.

### The Security Backbone - Cheshire Cat

Security isn't a pillar bolted onto the side. It's woven into every interaction. The Cheshire Cat is the deterministic security engine that gives every code repository a governance scorecard - tracking code security, test coverage, technical debt, dependency freshness, and complexity management from actual repository artifacts.

<div class="docs-center-block">
<img src="/images/cheshire-dashboard.png" alt="Cheshire Cat security scorecard dashboard with fitness functions" class="docs-inline-image" />
</div>

From that scorecard, Cheshire scaffolds the security structure your repository needs - OWASP prompt packs, STRIDE threat model templates, architecture decision records, and CI/CD security gates - all wired into a governed development workflow.

<div class="docs-center-block">
<img src="/images/cheshire-scaffold.png" alt="Cheshire Cat scaffolding OWASP prompt packs and security structure into a code repository" class="docs-inline-image" />
</div>

But Cheshire doesn't stop at scaffolding. Describe a feature in plain text and the Cat generates a complete **RCTRO-formatted GitHub issue** — Role, Context, Task, Requirements, Output — with collapsible prompt pack guidance embedded directly in the issue body. The AI agent that picks up the issue doesn't just see "build a feature." It sees the full security playbook: which OWASP categories apply, what STRIDE threats to mitigate, and exactly which controls to implement.

<div class="docs-center-block">
<img src="/images/cheshire-feature.png" alt="Cheshire Cat issue management — RCTRO-formatted GitHub issue with embedded prompt pack guidance" class="docs-inline-image" />
</div>

- **Issue management with RCTRO format** — describe what you want to build, select security categories, and Cheshire generates a structured specification with auto-created labels and implementation zones for Claude Code and Copilot Coding Agent
- **OWASP Top 10 prompt packs** scaffolded into every code repository at **.cheshire/prompts/** - RCTRO-formatted guidance that both humans and AI agents consume
- **STRIDE threat models** generated from your CALM architecture by AI, overlaid on your diagrams, with NIST 800-53 control cross-references
- **CodeQL SARIF processing** that creates GitHub Issues with severity scoring, OWASP category mapping, and prompt pack references - so remediation agents know exactly which security guidance to follow
- **Four-pillar governance scoring** that tracks security as a first-class metric alongside architecture, risk, and operations

### CALM 1.2 - Architecture as Code

We built on **FINOS CALM** - the Common Architecture Language Model, an open standard from the Linux Foundation backed by Morgan Stanley, JPMorgan, and ThoughtWorks. JSON-based. Git-native. Machine-readable. The architecture standard built for the agentic age.

MaintainabilityAI is one of the earliest production implementations of CALM 1.2 - already shipping what the ThoughtWorks Technology Radar is moving from "Trial" to "Adopt."

---

## What No One Else Has

We reviewed the leading vendors across Internal Developer Portals, Enterprise Architecture Management, and AI-Assisted Software Engineering - looking for who's solving the architecture-agentic SDLC problem. Each has real strengths. But every one of them is missing the same thing: **architecture governance that reaches the developer and the agent simultaneously.** That gap is our passion, and one of the impossible things we're going after.

| Capability | MaintainabilityAI | Backstage | Port.io | LeanIX | EventCatalog | OpsLevel |
|:-----------|:-:|:-:|:-:|:-:|:-:|:-:|
| **CALM Architecture Modeling** | **Native** | - | - | ArchiMate | EDA only | - |
| **Four-Pillar Governance** | **Yes** | Plugin | Scorecards | Fact sheets | Linter | Maturity |
| **STRIDE Threat Modeling** | **AI-Generated** | - | - | - | - | - |
| **OWASP Prompt Packs** | **Embedded** | - | - | - | - | - |
| **Agentic Architecture Review** | **Oraculum** | - | - | - | Chat Q&A | AI assist |
| **Interactive Diagram Editor** | **ReactFlow + ELK** | - | - | Lucid-style | Auto-gen | - |
| **Image & Repo to Architecture** | **Both** | - | - | - | Photo (beta) | - |

Backstage catalogs services - it doesn't understand their architecture. Port.io tracks scorecards - but they're operational health, not architecture governance. LeanIX models architecture - but from the CIO's dashboard, disconnected from code. EventCatalog documents event-driven systems - but has zero security features. OpsLevel measures service maturity - not architectural quality.

**MaintainabilityAI is the only tool that starts from the architecture model and makes governance real in the developer's workflow.**

<div class="docs-center-block">
<div class="docs-heading">Free. Open Source. Forever.</div>
<div class="docs-copy">No $100K enterprise license. No SaaS vendor lock-in. Your governance data lives in Git, version-controlled alongside your code.</div>
</div>

---

## The Red Queen - Governance-Enforced Agent Intelligence

<div class="docs-flex-block">
  <img src="/images/redqueen.png" alt="The Red Queen" class="docs-inline-image" />
  <div>
    <p class="docs-copy">
      Everything we've built creates the foundation. The Red Queen transforms how AI agents interact with your architecture — delivering something no other tool in the market has: <strong class="docs-strong">deterministic governance enforcement</strong>.
    </p>
    <p class="docs-copy">Three enforcement layers at three speeds make this possible (two shipping now, one coming in Phase 9):</p>
    <ul class="markdown-list list-disc">
      <li class="docs-list-item">⚡ <strong class="docs-strong">PreToolUse Hooks</strong> <span class="docs-copy">— millisecond inline blocking before any tool fires</span></li>
      <li class="docs-list-item">🛡️ <strong class="docs-strong">MCP Tools + The Red Queen's Court</strong> <span class="docs-copy">— agent-called validation with deterministic constraint enforcement</span></li>
      <li class="docs-list-item">♛ <strong class="docs-strong">CI Required Status Check</strong> <span class="docs-copy">— hard gate that blocks merge on governance violations</span> <span class="docs-copy">(Phase 9)</span></li>
    </ul>
  </div>
</div>

Start with the working path: [Red Queen quickstart](/docs/quickstart-redqueen) scaffolds hooks, a repo-local MCP runner, review workflows, and the first-run doctor into a real repository. The code repo carries the governance harness; the live governance mesh remains the source of truth and is resolved at runtime.

### The Problem With Prompts

Every governance tool today - including ours - relies on prompts to guide AI agents. "Please follow the architecture." "Please respect these security controls." "Please don't add direct database connections."

The problem? **Prompts are advisory.** Agents can and do ignore them. An LLM that's optimizing for task completion might decide that a direct database connection is the fastest path to the solution. Your architecture constraints become suggestions.

This is the fundamental gap. And we're closing it.

### The Red Queen - Three Layers of Governance Intelligence

> *Now, here, you see, it takes all the running you can do, to keep in the same place. If you want to get somewhere else, you must run at least twice as fast as that!*

**The Red Queen** is a unified governance intelligence and enforcement system. It doesn't just tell agents about your architecture - it **enforces** it.

<div class="docs-card docs-card-muted">
<div class="docs-grid">
<div class="docs-card docs-card-cyan">
<div class="docs-heading">Layer 1: PreToolUse Hooks — Millisecond Inline Blocking</div>
<div class="docs-muted">Before an agent tool runs, lightweight hooks evaluate static governance rules and block tool, path, restricted-tier, and declared CALM connection violations inline. Claude Code (<code>.claude/settings.json</code>) and Copilot Coding Agent (<code>.github/hooks/</code>) use agent-specific adapters that call the same validator, with no MCP round-trip required for the fast path.</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-heading">Layer 2: The Grin (MCP Server) + The Red Queen's Court — Contextual Validation</div>
<div class="docs-muted">14 calm:// resources and 25 MCP tools make your governance mesh queryable by AI agents. The Red Queen's Court policy engine evaluates constraints deterministically — not as LLM suggestions. Today it covers tier, path, security-critical files, CALM flows, platform impact, and control-aware warnings through TypeScript rule evaluation. The agent receives an auditable allow, conditional, or deny decision.</div>
</div>
<div class="docs-card docs-card-indigo">
<div class="docs-heading">Layer 3: CI Required Status Check — Hard Merge Gate <span class="docs-copy">(Phase 9)</span></div>
<div class="docs-muted">The <code>redqueen-action</code> GitHub Action will run independent PR diff analysis as a required status check. No PR merges without governance clearance. Tree-sitter AST semantic diff will classify every code change by risk tier — cosmetic edits get lightweight checks, auth logic changes trigger full validation plus mandatory human review. Machine-checkable contract diffs powered by proven engines (oasdiff, buf, graphql-inspector).</div>
</div>
</div>
</div>

### Deterministic Governance - Prompts Advise, Policy Decides

Your CALM architecture declares that **web-frontend** connects to **api-gateway**, which connects to **user-database**. A three-tier flow. Clean separation.

An AI agent implementing a feature decides: "I'll save time by querying the database directly from the frontend."

**Without The Red Queen:** The agent ignores the architecture guidance in its prompt, adds the direct connection, and creates a PR. Maybe a human catches it. Maybe they don't.

**With The Red Queen:** The agent calls **validate_action** before making any structural change. The Red Queen's Court **CALM flow constraint rule** checks the architecture model. No **web-frontend** → **user-database** relationship is declared. **Action denied.** The agent receives the denial reason and the correct architectural path: route through **api-gateway**.

This isn't an LLM judging whether the change is okay. It's a deterministic policy engine evaluating the CALM model. Condition → decision. Auditable. Unfoolable.

<svg viewBox="0 0 800 240" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="enfBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="enfArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8"/>
    </marker>
  </defs>
  <rect width="800" height="240" rx="12" fill="url(#enfBg)"/>
  <text x="400" y="30" text-anchor="middle" fill="#818cf8" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">GOVERNANCE ENFORCEMENT PIPELINE</text>
  <!-- AI Agent -->
  <rect x="20" y="55" width="120" height="70" rx="8" fill="rgba(14,165,233,0.15)" stroke="rgba(14,165,233,0.4)"/>
  <text x="80" y="85" text-anchor="middle" fill="#7dd3fc" font-size="13" font-weight="700" font-family="system-ui, sans-serif">AI Agent</text>
  <text x="80" y="108" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Proposes action</text>
  <line x1="140" y1="90" x2="172" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <!-- validate_action -->
  <rect x="175" y="55" width="140" height="70" rx="8" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
  <text x="245" y="82" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" font-family="monospace">validate_action</text>
  <text x="245" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">MCP Tool Call</text>
  <text x="245" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">via The Grin</text>
  <line x1="315" y1="90" x2="347" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <!-- The Red Queen's Court -->
  <rect x="350" y="55" width="140" height="70" rx="8" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.4)"/>
  <text x="420" y="82" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Policy Engine</text>
  <text x="420" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">TypeScript Rules</text>
  <text x="420" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Deterministic</text>
  <line x1="490" y1="90" x2="522" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <!-- CALM Model -->
  <rect x="525" y="55" width="120" height="70" rx="8" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)"/>
  <text x="585" y="82" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="700" font-family="system-ui, sans-serif">CALM Model</text>
  <text x="585" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Flows, Controls,</text>
  <text x="585" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Interfaces</text>
  <line x1="645" y1="90" x2="677" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <!-- Result -->
  <rect x="680" y="50" width="100" height="80" rx="8" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.3)"/>
  <text x="730" y="76" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Allow</text>
  <text x="730" y="96" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Conditional</text>
  <text x="730" y="116" text-anchor="middle" fill="#f87171" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Deny</text>
  <!-- Bottom rail labels -->
  <text x="400" y="160" text-anchor="middle" fill="#64748b" font-size="10" font-weight="600" letter-spacing="1" font-family="system-ui, sans-serif">GOVERNANCE RAILS EVALUATED</text>
  <rect x="50" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="115" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Flow Constraints</text>
  <rect x="190" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="255" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Control Adherence</text>
  <rect x="330" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="395" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Path Controls</text>
  <rect x="470" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="535" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Platform Impact</text>
  <rect x="610" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="675" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Permission Tiers</text>
  <!-- Badge -->
  <rect x="310" y="210" width="180" height="22" rx="11" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)"/>
  <text x="400" y="225" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="600" font-family="system-ui, sans-serif">DETERMINISTIC  ·  AUDITABLE</text>
</svg>

**Six rails** guide and enforce governance today: **Permission Tiers** (agent autonomy bounded by governance scores), **Path Controls** (generated governance files stay read-only), **Security-Critical Paths** (restricted-tier agents cannot modify sensitive areas), **CALM Flow Constraints** (declared relationships are checked), **Control Warnings** (security-control impact is surfaced), and **Platform Impact** (shared nodes trigger coordination warnings). Interface contract diffing and deeper STRIDE mitigation enforcement move into the Phase 9 hard gate.

### Cross-Repo Semantic Governance - The Breakthrough We Are Building

This is the capability that doesn't exist anywhere else in the market.

Modern applications span multiple repositories. A frontend. An API. A database. Infrastructure-as-code. They're connected through CALM flows and interface contracts. But every governance tool today treats each repo independently.

**The Red Queen is moving governance across repository boundaries.**

When your CALM model declares a flow from **checkout-ui** through **order-api** to **order-database**, Red Queen can already reason over the graph and warn on shared platform impact. Phase 9 extends this into machine-checkable interface contracts — OpenAPI specs diffed by oasdiff, protobuf by buf, GraphQL by graphql-inspector, AsyncAPI by asyncapi-diff — so cross-repo contract violations can fail a required check and create coordination work in the owning repo.

<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="crBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="crArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8"/>
    </marker>
  </defs>
  <rect width="800" height="280" rx="12" fill="url(#crBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#818cf8" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">CROSS-REPO SEMANTIC GOVERNANCE</text>
  <!-- Repo A: checkout-ui -->
  <rect x="30" y="48" width="200" height="110" rx="10" fill="rgba(14,165,233,0.08)" stroke="rgba(14,165,233,0.3)" stroke-dasharray="4"/>
  <text x="130" y="68" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">checkout-ui repo</text>
  <rect x="50" y="80" width="160" height="28" rx="6" fill="rgba(14,165,233,0.15)" stroke="rgba(14,165,233,0.4)"/>
  <text x="130" y="99" text-anchor="middle" fill="#7dd3fc" font-size="10" font-family="system-ui, sans-serif">Agent changes frontend</text>
  <rect x="50" y="118" width="160" height="28" rx="6" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)"/>
  <text x="130" y="137" text-anchor="middle" fill="#f87171" font-size="10" font-family="system-ui, sans-serif">Calls undeclared endpoint</text>
  <!-- The Red Queen (center) -->
  <rect x="270" y="43" width="260" height="195" rx="10" fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.3)"/>
  <text x="400" y="66" text-anchor="middle" fill="#c4b5fd" font-size="12" font-weight="700" font-family="system-ui, sans-serif">The Red Queen</text>
  <rect x="290" y="78" width="220" height="32" rx="6" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
  <text x="400" y="99" text-anchor="middle" fill="#a5b4fc" font-size="10" font-weight="600" font-family="system-ui, sans-serif">CALM Flow Resolution</text>
  <rect x="290" y="120" width="220" height="32" rx="6" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.4)"/>
  <text x="400" y="141" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="600" font-family="monospace">validate_action</text>
  <rect x="290" y="162" width="220" height="32" rx="6" fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.4)"/>
  <text x="400" y="183" text-anchor="middle" fill="#d8b4fe" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Contract Diff (Phase 9)</text>
  <rect x="325" y="204" width="150" height="24" rx="12" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)"/>
  <text x="400" y="220" text-anchor="middle" fill="#f87171" font-size="10" font-weight="700" font-family="system-ui, sans-serif">PHASE 9 GATE</text>
  <!-- Repo B: order-api -->
  <rect x="570" y="48" width="200" height="110" rx="10" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.3)" stroke-dasharray="4"/>
  <text x="670" y="68" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="600" font-family="system-ui, sans-serif">order-api repo</text>
  <rect x="590" y="80" width="160" height="28" rx="6" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)"/>
  <text x="670" y="99" text-anchor="middle" fill="#93c5fd" font-size="10" font-family="system-ui, sans-serif">Interface: order-api-v2</text>
  <rect x="590" y="118" width="160" height="28" rx="6" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)"/>
  <text x="670" y="137" text-anchor="middle" fill="#93c5fd" font-size="10" font-family="system-ui, sans-serif">Declared endpoints only</text>
  <!-- Connecting arrows -->
  <line x1="230" y1="100" x2="288" y2="94" stroke="#818cf8" stroke-width="2" marker-end="url(#crArrow)"/>
  <line x1="512" y1="94" x2="568" y2="100" stroke="#818cf8" stroke-width="2" marker-end="url(#crArrow)"/>
  <!-- CALM flow arc connecting repos -->
  <path d="M 130 163 Q 130 260, 400 260 Q 670 260, 670 163" fill="none" stroke="rgba(99,102,241,0.4)" stroke-width="1.5" stroke-dasharray="6"/>
  <text x="400" y="275" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui, sans-serif">CALM Flow: checkout-ui  →  order-api  →  order-database</text>
</svg>

| Agent Change | Red Queen Response |
|---|---|
| Frontend calls undeclared API endpoint | **Phase 9 gate** - interface **order-api-v2** does not include that endpoint |
| API changes response format | **Phase 9 conditional** - frontend-app consumes this interface, update frontend or update contract first |
| Database drops a column | **Phase 9 deny** - blast radius: 4 nodes, 2 BARs, 1 flow. Requires migration ADR. |
| New service touches shared platform node | **Available now** - `validate_action` surfaces platform-impact coordination warnings |

### Agent-Agnostic - One Control Plane, Every Agent

Organizations use Claude Code *and* Copilot Coding Agent. Different config files. Different instruction formats. Different hook mechanisms.

**The Red Queen doesn't care which agent is holding the keyboard.** Claude Code and Copilot Coding Agent get their own hook configuration, both adapters invoke the same validator, and both can call the same MCP tools against the same CALM model. A repo-local MCP runner resolves the live mesh from env, CI checkout, or manifest defaults; configuration fingerprints and the scaffold doctor catch drift before the setup quietly rots.

### Progressive Autonomy - Governance Earns Trust

Three permission tiers, driven by governance scores:

<div class="docs-card docs-card-muted">
<div class="docs-grid">
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Autonomous</div>
<div class="docs-heading">80-100%</div>
<div class="docs-muted">Agents operate with minimal oversight. Auto-edit mode. The Red Queen's Court still enforces flow and control constraints — autonomy means trust, not lawlessness.</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Supervised</div>
<div class="docs-heading">50-79%</div>
<div class="docs-muted">Agents need human checkpoints. OWASP and STRIDE packs are injected for weak pillars. Structural changes are routed through <code>validate_action</code>; machine-checkable interface contract gates arrive in Phase 9.</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Restricted</div>
<div class="docs-heading">0-49%</div>
<div class="docs-muted">Maximum oversight. Plan-first mode. Multi-agent review board. Hooks block Bash and Write, and Edit requires recorded approval. Every decision is auditable.</div>
</div>
</div>
</div>

**Improve your governance scores, and your agents earn more autonomy.** Governance becomes a force multiplier, not a bureaucratic tax.

And when you genuinely need to bypass a constraint? A **break-glass procedure** is planned for Phase 9 — scoped, time-limited, CODEOWNER-approved, with anti-normalization controls that prevent overrides from becoming habit. Quarterly budgets, escalating friction, and follow-up SLAs will ensure the exception never becomes the rule.

### The Feedback Loop - Agents That Learn

Every agent interaction is measured — governance scores before and after, guardrail actions counted, cross-repo violations tracked, every decision correlated to a specific PR, commit, and workflow run via SHA-256 audit trail.

Governance scores aren't static — they behave like a **trust battery**. Scores decay over time based on review freshness, scan recency, and dependency age. Skip a security review? Your score drifts down. Let dependencies age? The trust battery drains. Active governance earns autonomy; neglect erodes it.

In Phase 9, the Red Queen will build **agent memory**: which policy rules fire most, which prompt packs resolve issues on the first pass, which repos keep violating the same contracts. That memory will feed back into policy refinements. Agents get smarter. Policies get sharper. **Governance improves continuously.**

---

## The Architecture-First Agentic SDLC

Everything above - Looking Glass, Absolem, Oraculum, Cheshire, The Red Queen - isn't a collection of features. It's a stack. Five layers, each building on the one below, intelligence flowing upward.

<div class="docs-center-block">
<div class="docs-card-kicker">The MaintainabilityAI Stack</div>
<div class="docs-grid">
<div class="docs-card docs-card-muted">
<div class="docs-heading">Red Queen Policy Engine + Orchestration</div>
<div class="docs-muted"><strong class="docs-strong">Orchestrates and enforces</strong> across two layers today: PreToolUse hooks for both agents (ms) and MCP tool validation (s). Configuration fingerprints detect drift. Permission tiers drive agent autonomy. Trust battery scores decay with neglect. Severity-weighted multi-agent consensus. <em>Phase 9 adds CI hard gate with tree-sitter AST semantic diff and break-glass overrides.</em></div>
</div>
<div class="docs-card docs-card-indigo">
<div class="docs-heading">The Red Queen's Court (Policy Engine)</div>
<div class="docs-muted"><strong class="docs-strong">Evaluates</strong> constraints as deterministic rules, not suggestions. Permission boundaries, generated-file paths, security-critical files, CALM flow transitions, control-aware warnings, and platform impact are evaluated by a pure TypeScript policy engine running in-process.</div>
</div>
<div class="docs-card docs-card-indigo">
<div class="docs-heading">The Grin (MCP Server)</div>
<div class="docs-muted"><strong class="docs-strong">Exposes</strong> architecture intelligence to every AI agent via 14 calm:// resources and 25 MCP tools. Claude Code, Copilot Coding Agent, Cursor, GitHub Actions — any MCP client gets the same governance context. Published as <code>@maintainabilityai/redqueen-mcp</code> on npm; scaffolded repos launch it through a portable local runner.</div>
</div>
<div class="docs-card docs-card-blue">
<div class="docs-heading">Looking Glass + Absolem + Oraculum</div>
<div class="docs-muted"><strong class="docs-strong">Visualizes</strong> and quantifies governance. Looking Glass dashboards score every BAR. Absolem advises on architecture decisions. Oraculum runs automated reviews against CALM models.</div>
</div>
<div class="docs-card docs-card-cyan">
<div class="docs-heading">CALM 1.2 + STRIDE + OWASP</div>
<div class="docs-muted"><strong class="docs-strong">Creates</strong> the structured intelligence. CALM architecture models, STRIDE threat assessments, OWASP prompt packs, and NIST controls - version-controlled in Git, machine-readable, powering everything above.</div>
</div>
</div>
</div>

No other tool connects all five layers. That's the impossible thing we built.

---

## Three Markets. One Gap. We Fill It.

<div class="docs-card docs-card-muted">
<div class="docs-grid">
<div class="docs-center-block">
<div class="docs-icon">$23.9B</div>
<div class="docs-card-kicker">Platform Engineering by 2030</div>
<div class="docs-muted">Backstage, Port, OpsLevel - catalogs without architecture</div>
<div class="docs-muted">Source: Grand View Research, 23.7% CAGR</div>
</div>
<div class="docs-center-block">
<div class="docs-icon">$1.6B</div>
<div class="docs-card-kicker">Enterprise Architecture Tools by 2030</div>
<div class="docs-muted">LeanIX, Ardoq, MEGA - architecture without developers</div>
<div class="docs-muted">Source: Grand View Research, 6.0% CAGR</div>
</div>
<div class="docs-center-block">
<div class="docs-icon">$26.0B</div>
<div class="docs-card-kicker">AI Code Tools by 2030</div>
<div class="docs-muted">Claude Code, Copilot Coding Agent, Cursor — agents without architecture awareness</div>
<div class="docs-muted">Source: Grand View Research, 27.1% CAGR</div>
</div>
</div>
<div class="docs-center-block">
<div class="docs-heading">The gap between these markets is architecture governance that reaches the developer.</div>
<div class="docs-muted">MaintainabilityAI is the bridge.</div>
</div>
</div>

---

## The Road Ahead

<div class="docs-roadmap">

<svg viewBox="0 0 1080 170" xmlns="http://www.w3.org/2000/svg" class="docs-roadmap-rail" role="img" aria-labelledby="roadAheadTitle roadAheadDesc">
  <title id="roadAheadTitle">The Road Ahead — three chapters from today to tomorrow</title>
  <desc id="roadAheadDesc">A glowing horizontal trail connecting three milestones: today through the looking glass, the Red Queen running now, and the next six impossible things on the horizon.</desc>
  <defs>
    <linearGradient id="raTrail" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#22d3ee"/>
      <stop offset=".5" stop-color="#fb7185"/>
      <stop offset="1" stop-color="#a78bfa"/>
    </linearGradient>
    <radialGradient id="raDotA" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#22d3ee"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="raDotB" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fb7185"/>
      <stop offset="1" stop-color="#fb7185" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="raDotC" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#a78bfa"/>
      <stop offset="1" stop-color="#a78bfa" stop-opacity="0"/>
    </radialGradient>
    <style>
      .raLabel{font:800 14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:2.5px;text-transform:uppercase;fill:#cbd5e1}
      .raSub{font:500 13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;fill:#94a3b8}
    </style>
  </defs>
  <path d="M70 70 Q 270 30 540 70 T 1010 70" fill="none" stroke="url(#raTrail)" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
  <path d="M70 70 Q 270 30 540 70 T 1010 70" fill="none" stroke="url(#raTrail)" stroke-width="14" stroke-linecap="round" opacity="0.18"/>
  <g>
    <circle cx="70" cy="70" r="34" fill="url(#raDotA)"/>
    <circle cx="70" cy="70" r="8" fill="#0b1224" stroke="#22d3ee" stroke-width="2.5"/>
    <text x="20" y="125" text-anchor="start" class="raLabel" fill="#67e8f9">Chapter I</text>
    <text x="20" y="148" text-anchor="start" class="raSub">Through the looking glass today</text>
  </g>
  <g>
    <circle cx="540" cy="70" r="36" fill="url(#raDotB)"/>
    <circle cx="540" cy="70" r="9" fill="#0b1224" stroke="#fb7185" stroke-width="2.5"/>
    <text x="540" y="125" text-anchor="middle" class="raLabel" fill="#fda4af">Chapter II</text>
    <text x="540" y="148" text-anchor="middle" class="raSub">The Red Queen runs now</text>
  </g>
  <g>
    <circle cx="1010" cy="70" r="34" fill="url(#raDotC)"/>
    <circle cx="1010" cy="70" r="8" fill="#0b1224" stroke="#a78bfa" stroke-width="2.5"/>
    <text x="1060" y="125" text-anchor="end" class="raLabel" fill="#c4b5fd">Chapter III</text>
    <text x="1060" y="148" text-anchor="end" class="raSub">Six more impossible things</text>
  </g>
</svg>

<div class="docs-chapter docs-chapter-blue">
  <div class="docs-chapter-head">
    <div class="docs-chapter-numeral">I</div>
    <div>
      <span class="docs-chapter-meta">Chapter I · Available now</span>
      <h3 class="docs-chapter-title">Through the looking glass today</h3>
      <p class="docs-chapter-lede">Eight shipping capabilities turn the governance mesh into the operating model for the developer's day. Architecture becomes visible, security travels with the work, and scaffolding becomes a habit.</p>
    </div>
  </div>
  <div class="docs-roadmap-theme">
    <div class="docs-roadmap-theme-head">
      <span class="docs-roadmap-theme-kicker">Theme 1 &middot; See the portfolio</span>
      <h4 class="docs-roadmap-theme-title">Make the architecture you already own visible and queryable</h4>
      <p class="docs-roadmap-theme-lede">Mesh-side capabilities that turn CALM models and governance scores into a daily operating picture for architects, leads, and reviewers.</p>
    </div>
    <div class="docs-grid docs-grid-wide">
      <div class="docs-card docs-card-blue">
        <div class="docs-card-kicker">Mesh dashboard</div>
        <h4 class="docs-card-title">Looking Glass</h4>
        <p class="docs-card-body">Portfolio dashboard with four-pillar governance scoring, interactive CALM architecture diagrams, and enterprise capability models (ACORD, BIAN).</p>
      </div>
      <div class="docs-card docs-card-indigo">
        <div class="docs-card-kicker">AI advisor</div>
        <h4 class="docs-card-title">Absolem</h4>
        <p class="docs-card-body">AI governance assistant with seven commands: drift analysis, component addition, CALM validation, gap analysis, ADR suggestions, image-to-CALM, and repo-to-CALM.</p>
      </div>
      <div class="docs-card docs-card-cyan">
        <div class="docs-card-kicker">Automated review</div>
        <h4 class="docs-card-title">Oraculum</h4>
        <p class="docs-card-body">Architecture drift detection that runs. Claude Code or Copilot Coding Agent reviews codebases against your CALM model and posts findings to GitHub Issues, organized by pillar.</p>
      </div>
    </div>
  </div>

  <div class="docs-roadmap-theme">
    <div class="docs-roadmap-theme-head">
      <span class="docs-roadmap-theme-kicker">Theme 2 &middot; Scaffold into repos</span>
      <h4 class="docs-roadmap-theme-title">Push governance from the mesh down into the code that ships</h4>
      <p class="docs-roadmap-theme-lede">Repo-side capabilities that scaffold the security spine into every BAR, then carry CALM architecture context into the features developers and agents build.</p>
    </div>
    <div class="docs-grid docs-grid-wide">
      <div class="docs-card docs-card-emerald">
        <div class="docs-card-kicker">Security spine</div>
        <h4 class="docs-card-title">Cheshire Cat</h4>
        <p class="docs-card-body">Deterministic security engine. Scaffolds OWASP prompt packs, STRIDE templates, ADRs, and CI security gates into every repository &mdash; with a fitness scorecard the agent sees first.</p>
      </div>
      <div class="docs-card docs-card-emerald">
        <div class="docs-card-kicker">BAR-to-repo</div>
        <h4 class="docs-card-title">White Rabbit</h4>
        <p class="docs-card-body">BAR-to-code scaffolding. Architecture context from the governance mesh travels into the repository every time a new service, library, or interface is stood up.</p>
      </div>
      <div class="docs-card docs-card-emerald">
        <div class="docs-card-kicker">RCTRO issues</div>
        <h4 class="docs-card-title">Rabbit Hole</h4>
        <p class="docs-card-body">RCTRO-formatted GitHub issue generation. Describe a feature in plain text and Cheshire produces the full security playbook agents need before they touch the keyboard.</p>
      </div>
    </div>
  </div>

  <div class="docs-roadmap-theme">
    <div class="docs-roadmap-theme-head">
      <span class="docs-roadmap-theme-kicker">Theme 3 &middot; Measure and guide</span>
      <h4 class="docs-roadmap-theme-title">The shared spine every BAR and every agent draws from</h4>
      <p class="docs-roadmap-theme-lede">Continuous fitness signals and prompt guidance &mdash; the metrics that drive autonomy tiers, and the prompt packs both humans and agents consume.</p>
    </div>
    <div class="docs-grid docs-grid-wide">
      <div class="docs-card docs-card-amber">
        <div class="docs-card-kicker">Repo fitness</div>
        <h4 class="docs-card-title">Security Scorecard</h4>
        <p class="docs-card-body">Repository health metrics &mdash; code security, test coverage, technical debt, dependency freshness, complexity &mdash; with a Create Feature entry point into governed workflows.</p>
      </div>
      <div class="docs-card docs-card-amber">
        <div class="docs-card-kicker">Shared guidance</div>
        <h4 class="docs-card-title">Prompt Packs</h4>
        <p class="docs-card-body">OWASP Top 10, maintainability, and STRIDE guidance embedded in every workflow. RCTRO-formatted prompts both humans and AI agents read &mdash; the contract between intent and implementation.</p>
      </div>
    </div>
  </div>
</div>

<div class="docs-chapter docs-chapter-rose">
  <div class="docs-chapter-head">
    <div class="docs-chapter-numeral">II</div>
    <div>
      <span class="docs-chapter-meta">Chapter II · Shipping governance control</span>
      <h3 class="docs-chapter-title">The Red Queen begins her run</h3>
      <p class="docs-chapter-lede">Eight phases of unified intelligence and enforcement are live. Governance moves from prompt advice into deterministic policy, hooks, and audited evidence.</p>
    </div>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-heading">The Red Queen — Phases 1-8</div>
    <div class="docs-muted">The Grin MCP server with 25 tools and 14 calm:// resources. The Red Queen's Court TypeScript policy engine. Progressive autonomy tiers and trust battery score decay. Multi-agent review boards. PreToolUse hook generation for Claude Code and Copilot Coding Agent. GitHub Actions workflow generation, audit logging, repo-local MCP runner, and <a href="https://www.npmjs.com/package/@maintainabilityai/redqueen-mcp" class="markdown-link">npm package</a> distribution.</div>
  </div>
</div>

<div class="docs-chapter docs-chapter-indigo">
  <div class="docs-chapter-head">
    <div class="docs-chapter-numeral">III</div>
    <div>
      <span class="docs-chapter-meta">Chapter III · On the horizon</span>
      <h3 class="docs-chapter-title">Audit-grade evidence for the agentic SDLC</h3>
      <p class="docs-chapter-lede">The 2026 market &mdash; Microsoft, GitHub, Snyk, the EU AI Act &mdash; pulled the auditability conversation forward. Chapter III answers the question every reviewer now asks: <em>show me how this feature was built, by which agent, with which prompt, against which threat model.</em> Read the full landscape and roadmap in our <a href="/docs/research/agentic-governance-landscape" class="markdown-link">agentic governance research</a>.</p>
    </div>
  </div>
  <div class="docs-roadmap-theme">
    <div class="docs-roadmap-theme-head">
      <span class="docs-roadmap-theme-kicker">Theme 1 &middot; The evidence chain</span>
      <h4 class="docs-roadmap-theme-title">Make every AI-assisted change traceable</h4>
      <p class="docs-roadmap-theme-lede">Audit chain, agent inventory, per-PR provenance. The auditor&rsquo;s &ldquo;how was this built?&rdquo; answered with a single query.</p>
    </div>
    <div class="docs-grid docs-grid-wide">
      <div class="docs-card docs-card-rose">
        <div class="docs-card-kicker">Red Queen extension</div>
        <h4 class="docs-card-title">The Court Recorder</h4>
        <p class="docs-card-body">Merkle-chained, append-only audit log of every Red Queen allow / deny / override. CloudEvents v1.0 envelopes. Inclusion-proof CLI. SIEM export to Splunk, Sentinel, Datadog. Built for EU AI Act Art. 12 retention.</p>
      </div>
      <div class="docs-card docs-card-cyan">
        <div class="docs-card-kicker">Looking Glass pillar</div>
        <h4 class="docs-card-title">Agent Roster</h4>
        <p class="docs-card-body">Live AI-BOM of every deployed agent: identity, model version, system-prompt hash, scope of access, owner, governance tier. ISO 42001 A.6.2.7 evidence in one place.</p>
      </div>
      <div class="docs-card docs-card-emerald">
        <div class="docs-card-kicker">Cheshire artifact</div>
        <h4 class="docs-card-title">The Hatter&rsquo;s Tag</h4>
        <p class="docs-card-body">Signed provenance manifest attached to every AI-assisted PR: agent, model version, system-prompt fingerprint, prompt-pack version, threat-model reference, OWASP categories, fitness results, reviewer rationale.</p>
      </div>
    </div>
  </div>

  <div class="docs-roadmap-theme">
    <div class="docs-roadmap-theme-head">
      <span class="docs-roadmap-theme-kicker">Theme 2 &middot; Architecture &amp; intent</span>
      <h4 class="docs-roadmap-theme-title">Test that the architecture you declared is the architecture you got</h4>
      <p class="docs-roadmap-theme-lede">Move fitness functions from code metrics to architecture behaviour. Compile the harness from policy. Catch drift before merge.</p>
    </div>
    <div class="docs-grid docs-grid-wide">
      <div class="docs-card docs-card-amber">
        <div class="docs-card-kicker">Cheshire fitness</div>
        <h4 class="docs-card-title">The Caterpillar&rsquo;s Challenge</h4>
        <p class="docs-card-body">CALM-derived architecture conformance tests: declared-flow checks, trust-zone crossings, interface-contract diffs (oasdiff, buf, graphql-inspector). Fitness functions that test <em>architecture behaviour</em>, not just code metrics.</p>
      </div>
      <div class="docs-card docs-card-blue">
        <div class="docs-card-kicker">Cheshire compiler</div>
        <h4 class="docs-card-title">Harness Compiler</h4>
        <p class="docs-card-body">Compiles <code>AGENTS.md</code>, hooks, skills, MCP config, and <code>CLAUDE.md</code> from the BAR&rsquo;s governance score plus the IntentSpec plus the CALM model. Re-runs on policy change; harness is version-pinned to commit SHA.</p>
      </div>
      <div class="docs-card docs-card-violet">
        <div class="docs-card-kicker">Cheshire fitness</div>
        <h4 class="docs-card-title">Intent Fidelity gate</h4>
        <p class="docs-card-body">New fitness function. Schema check (every declared outcome must have a referencing test) plus an LLM-judge semantic check against the referenced IntentSpec. Fails CI on threshold breach &mdash; catches goal drift before merge, not after incident.</p>
      </div>
    </div>
  </div>

  <div class="docs-roadmap-theme">
    <div class="docs-roadmap-theme-head">
      <span class="docs-roadmap-theme-kicker">Theme 3 &middot; Hard gates &amp; regulatory reach</span>
      <h4 class="docs-roadmap-theme-title">The deterministic merge gate, mapped to the standards your auditor names</h4>
      <p class="docs-roadmap-theme-lede">From advisory to enforceable. From four crosswalks to eight. The artifacts an enterprise procurement team checks for.</p>
    </div>
    <div class="docs-grid docs-grid-wide">
      <div class="docs-card docs-card-indigo">
        <div class="docs-card-kicker">Red Queen Phase 9</div>
        <h4 class="docs-card-title">The hard gate</h4>
        <p class="docs-card-body"><code>redqueen-action</code> CI hard gate with tree-sitter AST semantic diff, machine-checkable contract diffs, break-glass budgets, agent memory, and adaptive policy refinement.</p>
      </div>
      <div class="docs-card docs-card-muted">
        <div class="docs-card-kicker">Compliance mapping</div>
        <h4 class="docs-card-title">Regulatory evidence &mdash; expanded</h4>
        <p class="docs-card-body">Beyond the existing SOC 2, ISO 27001, NIST 800-53, and PCI&nbsp;DSS crosswalks, add <strong>EU AI Act</strong>, <strong>ISO/IEC 42001</strong>, and <strong>NIST AI RMF + Generative AI Profile</strong> &mdash; the three standards specific to AI engineering that enterprise auditors are asking about in 2026.</p>
      </div>
    </div>
  </div>
</div>

</div>

---

## Six Impossible Things Before Breakfast

> *Why, sometimes I've believed as many as six impossible things before breakfast.*

That AI agents could understand your architecture. That governance could live where developers work. That security enforcement could be deterministic, not advisory. That a single open-source extension could bridge three $20B+ markets. That architecture models could become the control plane for autonomous agents. That all of this could be free.

**Six impossible things. We're building every one of them.**

MaintainabilityAI starts with the architecture model and makes everything else flow from it - governance scores from artifacts, threat models from architecture, agent permissions from governance, security guidance from gaps, review depth from risk. Every decision auditable, traceable, and version-controlled in Git.

This is the architecture-first agentic SDLC. This is MaintainabilityAI.

---

<div class="docs-center-block">
<div class="docs-muted">Built on FINOS CALM 1.2 | Powered by VS Code | Free and Open</div>
<a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" class="docs-button-secondary">Install from VS Code Marketplace</a>
</div>
