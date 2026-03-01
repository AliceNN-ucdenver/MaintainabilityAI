<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); border-radius: 16px; padding: 48px 40px; margin: 0 0 40px 0; text-align: center; position: relative; overflow: hidden;">
<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 30% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(circle at 70% 50%, rgba(139,92,246,0.06) 0%, transparent 60%);"></div>
<div style="position: relative; z-index: 1;">
<img src="/images/alice-bot.png" alt="MaintainabilityAI" style="width: 180px; height: 180px; border-radius: 50%; margin: 0 auto 24px auto; display: block; box-shadow: 0 0 40px rgba(99,102,241,0.3);" />
<div style="font-size: 36px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px; margin-bottom: 12px;">The Art of the Possible</div>
<div style="font-size: 18px; font-weight: 500; color: #818cf8; margin-bottom: 8px;">MaintainabilityAI</div>
<div style="font-size: 15px; color: #94a3b8; max-width: 600px; margin: 0 auto 24px auto; line-height: 1.6;">Architecture-First Governance for the Agentic Age. The only VS Code extension that makes your CALM architecture model the control plane for AI agents, security reviews, and governance scoring.</div>
<div style="display: inline-flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
<a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #f8fafc; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 4px 16px rgba(99,102,241,0.4);">Install from Marketplace</a>
<a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" style="display: inline-block; background: rgba(248,250,252,0.1); color: #f8fafc; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; border: 1px solid rgba(248,250,252,0.2);">View on GitHub</a>
</div>
</div>
</div>

---

## The World Changed. Architecture Governance Didn't.

AI agents generate code at unprecedented speed. Claude writes microservices in minutes. Copilot scaffolds entire applications in seconds. GitHub Actions chains them together autonomously.

But here's the problem no one is solving:

**These agents have no idea what they're building.**

They don't know your architecture. They don't understand your threat model. They can't see your governance scores. They don't know that Service A must never directly access the database, or that your payment processing system requires PCI-DSS compliance, or that the last three security reviews flagged the same authentication vulnerability.

Every AI agent in your organization operates in an **architectural vacuum**.

This is the 70/30 gap.

<svg viewBox="0 0 800 210" xmlns="http://www.w3.org/2000/svg" style="width: 100%; margin: 24px 0; display: block;">
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

<div style="margin: 24px 0; text-align: center;">
<img src="/images/looking-glass-governance.png" alt="Looking Glass governance dashboard showing four-pillar scoring across a portfolio of BARs" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);" />
</div>

A portfolio dashboard that doesn't just list your applications - it *understands* them.

Every Business Application Repository (BAR) in your portfolio is scored across **four governance pillars**: Architecture, Security, Information Risk, and Operations. Not checklist scores. Scores derived from actual artifacts - CALM architecture models, STRIDE threat models, NIST-mapped security controls, architectural decision records.

Interactive architecture diagrams built on ReactFlow and ELK.js - not static pictures, but living canvases where you can drag, drop, edit, and write changes directly back to your CALM model. Bidirectional editing means the diagram IS the architecture, and the architecture IS the diagram.

<div style="margin: 24px 0; text-align: center;">
<img src="/images/looking-glass-calm.png" alt="Interactive CALM architecture diagram with ReactFlow and ELK.js layout" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);" />
</div>

Trend sparklines show governance health over time. Drift indicators catch decay before it becomes crisis. Enterprise capability models (ACORD, BIAN) map business capabilities to the applications that implement them.

### Absolem - Your AI Architecture Advisor

<div style="margin: 24px 0; text-align: center;">
<img src="/images/looking-glass-absolem.png" alt="Absolem AI architecture advisor with seven specialized governance commands" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);" />
</div>

An AI governance assistant that doesn't just answer questions - it understands your architecture.

Seven specialized commands: drift analysis, component addition, CALM validation, cross-pillar gap analysis, ADR suggestions, image-to-CALM conversion, and freeform consultation. Each command operates with full awareness of your CALM model, threat model, governance scores, and architectural decisions.

**Image-to-CALM**: Take a photo of a whiteboard architecture diagram. Absolem converts it into a structured CALM 1.2 architecture model. No manual modeling. No weeks of documentation. Architecture governance that starts from where you are today.

**Scan Repo**: Point Absolem at a GitHub repository. It scans the codebase - package manifests, Docker configurations, CI workflows, source structure - and proposes CALM architecture patches that document reality. Bottom-up governance: derive architecture from running code.

### Oraculum - Automated Architecture Review

<div style="margin: 24px 0; text-align: center;">
<img src="/images/looking-glass-oraculum-review.png" alt="Oraculum review configuration with four-pillar selection, prompt packs, and multi-repo targeting" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);" />
</div>

Architecture drift detection that actually runs.

Create a review. Select prompt packs. Assign Claude Code or Copilot Coding Agent as reviewers. A GitHub Action checks out your code repos, analyzes them against your CALM architecture model, and posts structured findings to a GitHub Issue - organized by governance pillar, rated by severity, mapped to NIST controls.

Real-time monitoring with avatar timelines. PR detection with checks status. Review metrics saved to your governance mesh. Active review banners with auto-refresh. This isn't a governance wishlist - it's a shipped, working review pipeline.

### The Security Backbone - Cheshire Cat

Security isn't a pillar bolted onto the side. It's woven into every interaction. The Cheshire Cat is the deterministic security engine that gives every code repository a governance scorecard - tracking code security, test coverage, technical debt, dependency freshness, and complexity management from actual repository artifacts.

<div style="margin: 24px 0; text-align: center;">
<img src="/images/cheshire-dashboard.png" alt="Cheshire Cat security scorecard dashboard with fitness functions" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);" />
</div>

From that scorecard, Cheshire scaffolds the security structure your repository needs - OWASP prompt packs, STRIDE threat model templates, architecture decision records, and CI/CD security gates - all wired into a governed development workflow.

<div style="margin: 24px 0; text-align: center;">
<img src="/images/cheshire-scaffold.png" alt="Cheshire Cat scaffolding OWASP prompt packs and security structure into a code repository" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);" />
</div>

But Cheshire doesn't stop at scaffolding. Describe a feature in plain text and the Cat generates a complete **RCTRO-formatted GitHub issue** — Role, Context, Task, Requirements, Output — with collapsible prompt pack guidance embedded directly in the issue body. The AI agent that picks up the issue doesn't just see "build a feature." It sees the full security playbook: which OWASP categories apply, what STRIDE threats to mitigate, and exactly which controls to implement.

<div style="margin: 24px 0; text-align: center;">
<img src="/images/cheshire-feature.png" alt="Cheshire Cat issue management — RCTRO-formatted GitHub issue with embedded prompt pack guidance" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3);" />
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

<div style="background: linear-gradient(135deg, rgba(74,222,128,0.12) 0%, rgba(99,102,241,0.12) 100%); border: 2px solid rgba(74,222,128,0.4); border-radius: 12px; padding: 24px 32px; margin: 24px 0; text-align: center;">
<div style="font-size: 28px; font-weight: 800; color: #4ade80; margin-bottom: 8px;">Free. Open Source. Forever.</div>
<div style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">No $100K enterprise license. No SaaS vendor lock-in. Your governance data lives in Git, version-controlled alongside your code.</div>
</div>

---

## What's Coming: The Red Queen - Governance-Enforced Agent Intelligence

<div style="display: flex; align-items: flex-start; gap: 24px; margin: 24px 0 32px 0; flex-wrap: wrap;">
  <img src="/images/redqueen.png" alt="The Red Queen" style="width: 200px; height: 200px; border-radius: 16px; border: 2px solid rgba(239, 68, 68, 0.4); box-shadow: 0 4px 24px rgba(239, 68, 68, 0.15); flex-shrink: 0;" />
  <div style="flex: 1; min-width: 280px; padding-top: 0; margin-top: 0;">
    <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0 !important;">
      Everything we've built so far creates the foundation. What comes next transforms how AI agents interact with your architecture — and introduces something no other tool in the market has: <strong style="color: #f87171;">deterministic governance enforcement</strong>.
    </p>
    <p style="color: #cbd5e1; font-size: 15px; line-height: 1.7; margin: 0 !important;">Three enforcement layers at three speeds make this possible:</p>
    <ul style="margin: 8px 0 0 0 !important; padding-left: 20px; list-style: none;">
      <li style="color: #7dd3fc; font-size: 14px; line-height: 1.6; margin: 6px 0 !important;">⚡ <strong style="color: #7dd3fc;">PreToolUse Hooks</strong> <span style="color: #94a3b8;">— millisecond inline blocking before any tool fires</span></li>
      <li style="color: #c4b5fd; font-size: 14px; line-height: 1.6; margin: 6px 0 !important;">🛡️ <strong style="color: #c4b5fd;">MCP Tools + NeMo Guardrails</strong> <span style="color: #94a3b8;">— agent-called validation with deterministic constraint enforcement</span></li>
      <li style="color: #fca5a5; font-size: 14px; line-height: 1.6; margin: 6px 0 !important;">♛ <strong style="color: #fca5a5;">CI Required Status Check</strong> <span style="color: #94a3b8;">— hard gate that blocks merge on governance violations</span></li>
    </ul>
  </div>
</div>

### The Problem With Prompts

Every governance tool today - including ours - relies on prompts to guide AI agents. "Please follow the architecture." "Please respect these security controls." "Please don't add direct database connections."

The problem? **Prompts are advisory.** Agents can and do ignore them. An LLM that's optimizing for task completion might decide that a direct database connection is the fastest path to the solution. Your architecture constraints become suggestions.

This is the fundamental gap. And we're closing it.

### The Red Queen - Three Layers of Governance Intelligence

> *Now, here, you see, it takes all the running you can do, to keep in the same place. If you want to get somewhere else, you must run at least twice as fast as that!*

**The Red Queen** is a unified governance intelligence and enforcement system. It doesn't just tell agents about your architecture - it **enforces** it.

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 32px; margin: 32px 0;">
<div style="display: grid; grid-template-rows: auto auto auto; gap: 16px; max-width: 700px; margin: 0 auto;">
<div style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.4); border-radius: 10px; padding: 20px;">
<div style="font-size: 16px; font-weight: 700; color: #7dd3fc;">Layer 1: PreToolUse Hooks — Millisecond Inline Blocking</div>
<div style="color: #94a3b8; font-size: 13px; margin-top: 8px;">Before any agent tool fires, lightweight hooks evaluate governance constraints and block violations inline. Zero latency overhead. Works with Claude Code and Copilot Coding Agent natively — no MCP round-trip required.</div>
</div>
<div style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 10px; padding: 20px;">
<div style="font-size: 16px; font-weight: 700; color: #c4b5fd;">Layer 2: The Grin (MCP Server) + NeMo Guardrails — Contextual Validation</div>
<div style="color: #94a3b8; font-size: 13px; margin-top: 8px;">14 calm:// resources and 13 MCP tools make your governance mesh queryable by any AI agent. NVIDIA's Colang 2.0 DSL enforces constraints as state machines — not LLM suggestions. CALM flows, controls, interface contracts, and threat model mitigations enforced <em>deterministically</em>. An agent <strong>cannot</strong> bypass a flow constraint.</div>
</div>
<div style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 10px; padding: 20px;">
<div style="font-size: 16px; font-weight: 700; color: #a5b4fc;">Layer 3: CI Required Status Check — Hard Merge Gate</div>
<div style="color: #94a3b8; font-size: 13px; margin-top: 8px;">The <code>redqueen-action</code> GitHub Action runs independent PR diff analysis as a required status check. No PR merges without governance clearance. Score-driven agent configuration — permission tiers, dynamic CLAUDE.md generation, cross-repo semantic governance, and feedback loops. Machine-checkable contract diffs powered by proven engines (oasdiff, buf, graphql-inspector).</div>
</div>
</div>
</div>

### Deterministic Governance - Prompts Advise, Guardrails Enforce

Your CALM architecture declares that **web-frontend** connects to **api-gateway**, which connects to **user-database**. A three-tier flow. Clean separation.

An AI agent implementing a feature decides: "I'll save time by querying the database directly from the frontend."

**Without The Red Queen:** The agent ignores the architecture guidance in its prompt, adds the direct connection, and creates a PR. Maybe a human catches it. Maybe they don't.

**With The Red Queen:** The agent calls **validate_action** before making any structural change. NeMo Guardrails' **flow constraint rail** checks the CALM model. No **web-frontend** → **user-database** relationship is declared. **Action denied.** The agent receives the denial reason and the correct architectural path: route through **api-gateway**.

This isn't an LLM judging whether the change is okay. It's a finite state machine evaluating the CALM model. Deterministic. Auditable. Unfoolable.

<svg viewBox="0 0 800 240" xmlns="http://www.w3.org/2000/svg" style="width: 100%; margin: 24px 0; display: block;">
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
  <!-- NeMo Guardrails -->
  <rect x="350" y="55" width="140" height="70" rx="8" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.4)"/>
  <text x="420" y="82" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="700" font-family="system-ui, sans-serif">NeMo Guardrails</text>
  <text x="420" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Colang 2.0 Rails</text>
  <text x="420" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">State Machine</text>
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
  <text x="400" y="160" text-anchor="middle" fill="#64748b" font-size="10" font-weight="600" letter-spacing="1" font-family="system-ui, sans-serif">FIVE RAIL CATEGORIES EVALUATED</text>
  <rect x="50" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="115" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Flow Constraints</text>
  <rect x="190" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="255" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Control Adherence</text>
  <rect x="330" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="395" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Interface Contracts</text>
  <rect x="470" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="535" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Threat Model</text>
  <rect x="610" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="675" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Permission Tiers</text>
  <!-- Badge -->
  <rect x="310" y="210" width="180" height="22" rx="11" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)"/>
  <text x="400" y="225" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="600" font-family="system-ui, sans-serif">DETERMINISTIC  ·  AUDITABLE</text>
</svg>

**Five rails** enforce your governance: **Flow Constraints** (no undeclared connections), **Control Adherence** (NIST controls enforced - no endpoint without auth), **Interface Contracts** (cross-repo semantics respected), **Threat Model** (STRIDE mitigations validated), and **Permission Tiers** (agent autonomy bounded by governance scores).

### Cross-Repo Semantic Governance - The Breakthrough

This is the capability that doesn't exist anywhere else in the market.

Modern applications span multiple repositories. A frontend. An API. A database. Infrastructure-as-code. They're connected through CALM flows and interface contracts. But every governance tool today treats each repo independently.

**The Red Queen governs across repository boundaries.**

When your CALM model declares a flow from **checkout-ui** (frontend repo) through **order-api** (API repo) to **order-database** (API repo), The Red Queen understands the full dependency graph. Interface contracts are **machine-checkable** — OpenAPI specs diffed by oasdiff, protobuf by buf, GraphQL by graphql-inspector, AsyncAPI by asyncapi-diff. An agent working on the frontend that tries to call an endpoint not declared on the API's interface? **Interface contract violation.** The Red Queen blocks the change and creates a coordination issue in the API repo.

<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" style="width: 100%; margin: 24px 0; display: block;">
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
  <text x="400" y="141" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="600" font-family="monospace">validate_interface_contract</text>
  <rect x="290" y="162" width="220" height="32" rx="6" fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.4)"/>
  <text x="400" y="183" text-anchor="middle" fill="#d8b4fe" font-size="10" font-weight="600" font-family="system-ui, sans-serif">NeMo Interface Contract Rail</text>
  <rect x="325" y="204" width="150" height="24" rx="12" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)"/>
  <text x="400" y="220" text-anchor="middle" fill="#f87171" font-size="10" font-weight="700" font-family="system-ui, sans-serif">DENIED - Contract Violation</text>
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
| Frontend calls undeclared API endpoint | **Denied** - interface **order-api-v2** doesn't include that endpoint |
| API changes response format | **Conditional** - frontend-app consumes this interface, update frontend or update contract first |
| Database drops a column | **Denied** - blast radius: 4 nodes, 2 BARs, 1 flow. Requires migration ADR. |
| New service without auth middleware | **Blocked** - control **ctrl-auth-001** requires OAuth2 on all endpoints |

### Agent-Agnostic - One Control Plane, Every Agent

Organizations use Claude Code *and* Copilot Coding Agent. Different config files. Different instruction formats. Different MCP support.

**The Red Queen doesn't care.** Both agents call the same MCP tools. Both hit the same NeMo guardrails. Both are governed by the same CALM model. One config file for Copilot Coding Agent, one for Claude Code — the enforcement is identical.

### Progressive Autonomy - Governance Earns Trust

Three permission tiers, driven by governance scores:

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 32px; margin: 32px 0;">
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;">
<div style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; padding: 20px;">
<div style="font-size: 14px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Autonomous</div>
<div style="font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">80-100%</div>
<div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">Agents operate with minimal oversight. Auto-edit mode. NeMo Guardrails still enforce flow and control constraints - autonomy means trust, not lawlessness.</div>
</div>
<div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 20px;">
<div style="font-size: 14px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Supervised</div>
<div style="font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">50-79%</div>
<div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">Agents need human checkpoints. OWASP and STRIDE packs auto-injected for weak pillars. Cross-repo changes require validate_interface_contract.</div>
</div>
<div style="background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 12px; padding: 20px;">
<div style="font-size: 14px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Restricted</div>
<div style="font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">0-49%</div>
<div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">Maximum oversight. Plan-first mode. Multi-agent review board. NeMo blocks infrastructure changes entirely. Every action auditable.</div>
</div>
</div>
</div>

**Improve your governance scores, and your agents earn more autonomy.** Governance becomes a force multiplier, not a bureaucratic tax.

And when you genuinely need to bypass a constraint? A **break-glass procedure** — scoped, time-limited, CODEOWNER-approved, with anti-normalization controls that prevent overrides from becoming habit. Quarterly budgets, escalating friction, and follow-up SLAs ensure the exception never becomes the rule.

### The Feedback Loop - Agents That Learn

Every agent interaction is measured — governance scores before and after, guardrail actions counted, cross-repo violations tracked, every decision correlated to a specific PR, commit, and workflow run via SHA-256 audit trail.

Governance scores aren't static — they behave like a **trust battery**. Scores decay over time based on review freshness, scan recency, and dependency age. Skip a security review? Your score drifts down. Let dependencies age? The trust battery drains. Active governance earns autonomy; neglect erodes it.

Over time, the Red Queen builds **agent memory**: which guardrails fire most, which prompt packs resolve issues on the first pass, which repos keep violating the same contracts. That memory feeds back into policy refinements. Agents get smarter. Policies get sharper. **Governance improves continuously.**

---

## The Architecture-First Agentic SDLC

Everything above - Looking Glass, Absolem, Oraculum, Cheshire, The Red Queen - isn't a collection of features. It's a stack. Five layers, each building on the one below, intelligence flowing upward.

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 40px 32px; margin: 40px 0; text-align: center;">
<div style="font-size: 14px; font-weight: 600; color: #818cf8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px;">The MaintainabilityAI Stack</div>
<div style="display: grid; grid-template-rows: auto auto auto auto auto; gap: 16px; max-width: 700px; margin: 0 auto; text-align: left;">
<div style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 10px; padding: 16px;">
<div style="font-size: 16px; font-weight: 700; color: #c4b5fd;">Red Queen Policy Engine + CI Hard Gate</div>
<div style="color: #94a3b8; font-size: 13px;"><strong style="color: #e2e8f0;">Orchestrates and enforces</strong> across three layers: PreToolUse hooks (ms), MCP tool validation (s), and CI required status checks (min). Permission tiers drive agent autonomy. Trust battery scores decay with neglect, recharge with active governance. Break-glass overrides with anti-normalization controls.</div>
</div>
<div style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 10px; padding: 16px;">
<div style="font-size: 16px; font-weight: 700; color: #d8b4fe;">NeMo Guardrails (Colang 2.0)</div>
<div style="color: #94a3b8; font-size: 13px;"><strong style="color: #e2e8f0;">Enforces</strong> constraints as state machines, not suggestions. CALM flow transitions, NIST control adherence, interface contracts, threat model mitigations, and permission boundaries are all deterministic.</div>
</div>
<div style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 10px; padding: 16px;">
<div style="font-size: 16px; font-weight: 700; color: #a5b4fc;">The Grin (MCP Server)</div>
<div style="color: #94a3b8; font-size: 13px;"><strong style="color: #e2e8f0;">Exposes</strong> architecture intelligence to every AI agent via calm:// resources and tools. Claude Code, Copilot Coding Agent, Cursor, GitHub Actions — any MCP client gets the same governance context. Machine-checkable contract diffs via oasdiff, buf, graphql-inspector, and asyncapi-diff.</div>
</div>
<div style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 10px; padding: 16px;">
<div style="font-size: 16px; font-weight: 700; color: #93c5fd;">Looking Glass + Absolem + Oraculum</div>
<div style="color: #94a3b8; font-size: 13px;"><strong style="color: #e2e8f0;">Visualizes</strong> and quantifies governance. Looking Glass dashboards score every BAR. Absolem advises on architecture decisions. Oraculum runs automated reviews against CALM models.</div>
</div>
<div style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.4); border-radius: 10px; padding: 16px;">
<div style="font-size: 16px; font-weight: 700; color: #7dd3fc;">CALM 1.2 + STRIDE + OWASP</div>
<div style="color: #94a3b8; font-size: 13px;"><strong style="color: #e2e8f0;">Creates</strong> the structured intelligence. CALM architecture models, STRIDE threat assessments, OWASP prompt packs, and NIST controls - version-controlled in Git, machine-readable, powering everything above.</div>
</div>
</div>
</div>

No other tool connects all five layers. That's the impossible thing we built.

---

## Three Markets. One Gap. We Fill It.

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 32px; margin: 32px 0;">
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;">
<div style="text-align: center; padding: 16px;">
<div style="font-size: 32px; font-weight: 800; color: #818cf8;">$23.9B</div>
<div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Platform Engineering by 2030</div>
<div style="color: #64748b; font-size: 13px; margin-top: 8px;">Backstage, Port, OpsLevel - catalogs without architecture</div>
<div style="color: #475569; font-size: 10px; margin-top: 4px;">Source: Grand View Research, 23.7% CAGR</div>
</div>
<div style="text-align: center; padding: 16px;">
<div style="font-size: 32px; font-weight: 800; color: #818cf8;">$1.6B</div>
<div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Enterprise Architecture Tools by 2030</div>
<div style="color: #64748b; font-size: 13px; margin-top: 8px;">LeanIX, Ardoq, MEGA - architecture without developers</div>
<div style="color: #475569; font-size: 10px; margin-top: 4px;">Source: Grand View Research, 6.0% CAGR</div>
</div>
<div style="text-align: center; padding: 16px;">
<div style="font-size: 32px; font-weight: 800; color: #818cf8;">$26.0B</div>
<div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">AI Code Tools by 2030</div>
<div style="color: #64748b; font-size: 13px; margin-top: 8px;">Claude Code, Copilot Coding Agent, Cursor — agents without architecture awareness</div>
<div style="color: #475569; font-size: 10px; margin-top: 4px;">Source: Grand View Research, 27.1% CAGR</div>
</div>
</div>
<div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(148, 163, 184, 0.2);">
<div style="font-size: 18px; font-weight: 700; color: #f8fafc;">The gap between these markets is architecture governance that reaches the developer.</div>
<div style="color: #94a3b8; font-size: 14px; margin-top: 8px;">MaintainabilityAI is the bridge.</div>
</div>
</div>

---

## The Road Ahead

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 32px; margin: 24px 0;">
<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
<div style="width: 14px; height: 14px; border-radius: 50%; background: #4ade80; flex-shrink: 0;"></div>
<div style="font-size: 13px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: 1.5px;">Available Now</div>
</div>
<div style="background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 10px; padding: 14px; margin-bottom: 10px;">
<div style="font-size: 15px; font-weight: 700; color: #86efac;">🪞 Looking Glass</div>
<div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Portfolio dashboard with four-pillar governance scoring, CALM architecture diagrams, and enterprise capability models.</div>
</div>
<div style="background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 10px; padding: 14px; margin-bottom: 10px;">
<div style="font-size: 15px; font-weight: 700; color: #86efac;">🐛 Absolem</div>
<div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">AI governance assistant with 7 commands including image-to-CALM and repo-to-CALM architecture extraction.</div>
</div>
<div style="background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 10px; padding: 14px; margin-bottom: 10px;">
<div style="font-size: 15px; font-weight: 700; color: #86efac;">📜 Oraculum</div>
<div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Automated architecture review via Claude Code / Copilot Coding Agent on GitHub Issues - continuous governance in your CI pipeline.</div>
</div>
<div style="background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 10px; padding: 14px; margin-bottom: 10px;">
<div style="font-size: 15px; font-weight: 700; color: #86efac;">🐇 White Rabbit</div>
<div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">BAR-to-code scaffolding pipeline with full architecture context passthrough from mesh to repository.</div>
</div>
<div style="background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 10px; padding: 14px; margin-bottom: 10px;">
<div style="font-size: 15px; font-weight: 700; color: #86efac;">🕳️ Rabbit Hole</div>
<div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Issue management with RCTRO prompt generation and multi-category prompt packs for security-first development.</div>
</div>
<div style="background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 10px; padding: 14px; margin-bottom: 10px;">
<div style="font-size: 15px; font-weight: 700; color: #86efac;">🐱 Cheshire Cat</div>
<div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">The original security scaffolding engine. Deterministic management of fitness functions, SDLC completeness, security compliance, dependency freshness, test coverage, and complexity - all scored from real repository artifacts.</div>
</div>
<div style="display: flex; gap: 10px; margin-bottom: 24px;">
<div style="flex: 1; background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 10px; padding: 14px;">
<div style="font-size: 15px; font-weight: 700; color: #86efac;">📊 Security Scorecard</div>
<div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Repository health metrics with "Create Feature" entry point into governed workflows.</div>
</div>
<div style="flex: 1; background: rgba(74,222,128,0.06); border: 1px solid rgba(74,222,128,0.2); border-radius: 10px; padding: 14px;">
<div style="font-size: 15px; font-weight: 700; color: #86efac;">📦 Prompt Packs</div>
<div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">OWASP, maintainability, and STRIDE guidance embedded in every workflow.</div>
</div>
</div>
<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
<div style="width: 14px; height: 14px; border-radius: 50%; background: #818cf8; flex-shrink: 0;"></div>
<div style="font-size: 13px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 1.5px;">Coming Next</div>
</div>
<div style="background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.3); border-radius: 10px; padding: 14px; margin-bottom: 24px;">
<div style="font-size: 15px; font-weight: 700; color: #a5b4fc;">♛ The Red Queen</div>
<div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Unified governance intelligence and enforcement - MCP server (The Grin), NeMo Guardrails with Colang 2.0 deterministic enforcement, progressive autonomy agent orchestration, cross-repo semantic governance via CALM flow/interface contracts, and an agent-agnostic control plane supporting Claude Code and Copilot Coding Agent.</div>
</div>
<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
<div style="width: 14px; height: 14px; border-radius: 50%; background: #64748b; flex-shrink: 0;"></div>
<div style="font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">On the Horizon</div>
</div>
<div style="display: flex; gap: 10px; margin-bottom: 10px;">
<div style="flex: 1; background: rgba(100,116,139,0.06); border: 1px solid rgba(100,116,139,0.2); border-radius: 10px; padding: 14px;">
<div style="font-size: 14px; font-weight: 700; color: #94a3b8;">Predictive Health</div>
<div style="color: #64748b; font-size: 12px; margin-top: 4px;">Time-series forecasting of governance score trajectories.</div>
</div>
<div style="flex: 1; background: rgba(100,116,139,0.06); border: 1px solid rgba(100,116,139,0.2); border-radius: 10px; padding: 14px;">
<div style="font-size: 14px; font-weight: 700; color: #94a3b8;">Pattern Detection</div>
<div style="color: #64748b; font-size: 12px; margin-top: 4px;">Graph algorithms detecting patterns and anti-patterns in CALM topology.</div>
</div>
<div style="flex: 1; background: rgba(100,116,139,0.06); border: 1px solid rgba(100,116,139,0.2); border-radius: 10px; padding: 14px;">
<div style="font-size: 14px; font-weight: 700; color: #94a3b8;">Supply Chain Gov.</div>
<div style="color: #64748b; font-size: 12px; margin-top: 4px;">SBOM + SLSA integration as a governance dimension.</div>
</div>
</div>
<div style="display: flex; gap: 10px;">
<div style="flex: 1; background: rgba(100,116,139,0.06); border: 1px solid rgba(100,116,139,0.2); border-radius: 10px; padding: 14px;">
<div style="font-size: 14px; font-weight: 700; color: #94a3b8;">Knowledge Graph</div>
<div style="color: #64748b; font-size: 12px; margin-top: 4px;">Semantic graph powering cross-portfolio reasoning.</div>
</div>
<div style="flex: 1; background: rgba(100,116,139,0.06); border: 1px solid rgba(100,116,139,0.2); border-radius: 10px; padding: 14px;">
<div style="font-size: 14px; font-weight: 700; color: #94a3b8;">Runtime Validation</div>
<div style="color: #64748b; font-size: 12px; margin-top: 4px;">OpenTelemetry traces compared against CALM models for drift detection.</div>
</div>
<div style="flex: 1; background: rgba(100,116,139,0.06); border: 1px solid rgba(100,116,139,0.2); border-radius: 10px; padding: 14px;">
<div style="font-size: 14px; font-weight: 700; color: #94a3b8;">Regulatory Compliance</div>
<div style="color: #64748b; font-size: 12px; margin-top: 4px;">SOC2, ISO 27001, PCI-DSS evidence from governance artifacts.</div>
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

<div style="text-align: center; padding: 40px 0;">
<div style="font-size: 14px; color: #64748b; margin-bottom: 16px;">Built on FINOS CALM 1.2 | Powered by VS Code | Free and Open</div>
<a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #f8fafc; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);">Install from VS Code Marketplace</a>
</div>
