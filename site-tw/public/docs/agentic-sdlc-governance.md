<div class="docs-hero docs-hero-split docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><span>Vision</span></div>
    <div class="docs-eyebrow">Vision · The agentic SDLC governance framework <span class="docs-hero-meta">~12 min read</span></div>
    <h1 class="docs-hero-title">An agentic governed SDLC</h1>
    <p class="docs-hero-copy">
      AI agents write 70% of the code well. The other 30% — architecture, security, threat awareness, governance — is where systems live or die. <strong>MaintainabilityAI gives humans and agents the architectural map, the planning rails, and the enforcement gates to ship governed code on purpose.</strong>
    </p>
    <p class="docs-hero-copy">
      One control plane. Two governance modalities. Every artifact audit-chained from intent to shipped code.
    </p>
    <div class="docs-actions">
      <a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" class="docs-button-primary">Install the Extension</a>
      <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" class="docs-button-secondary">View on GitHub</a>
    </div>
  </div>
  <figure class="docs-hero-figure">
    <img src="/images/alice-bot.png" alt="MaintainabilityAI architecture guide" class="docs-hero-art" />
    <figcaption class="docs-visual-caption">Architecture-first governance for the agentic age.</figcaption>
  </figure>
</div>

---

## The 70/30 gap

AI agents generate code at unprecedented speed. Claude writes microservices in minutes. Copilot scaffolds applications in seconds. GitHub Actions chains them together autonomously. But the agents have **no idea what they're building**. They don't know your architecture. They don't see your threat model. They can't read your governance scores. They don't know that Service A must never reach the database directly, or that your payment system requires PCI-DSS compliance.

Every AI agent in your organization operates in an **architectural vacuum**. This is the 70/30 gap.

<svg viewBox="0 0 800 210" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="gapBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="210" rx="12" fill="url(#gapBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#818cf8" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">THE 70/30 GAP</text>
  <rect x="24" y="46" width="366" height="50" rx="8" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)"/>
  <text x="44" y="77" fill="#4ade80" font-size="24" font-weight="800" font-family="system-ui, sans-serif">70%</text>
  <text x="104" y="77" fill="#e2e8f0" font-size="14" font-weight="600" font-family="system-ui, sans-serif">AI handles brilliantly</text>
  <rect x="24" y="106" width="178" height="28" rx="6" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.15)"/>
  <text x="113" y="124" text-anchor="middle" fill="#86efac" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Boilerplate</text>
  <rect x="212" y="106" width="178" height="28" rx="6" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.15)"/>
  <text x="301" y="124" text-anchor="middle" fill="#86efac" font-size="11" font-weight="600" font-family="system-ui, sans-serif">CRUD</text>
  <rect x="24" y="142" width="178" height="28" rx="6" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.15)"/>
  <text x="113" y="160" text-anchor="middle" fill="#86efac" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Scaffolding</text>
  <rect x="212" y="142" width="178" height="28" rx="6" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.15)"/>
  <text x="301" y="160" text-anchor="middle" fill="#86efac" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Patterns</text>
  <line x1="406" y1="46" x2="406" y2="170" stroke="rgba(148,163,184,0.15)" stroke-width="1" stroke-dasharray="4"/>
  <rect x="422" y="46" width="354" height="50" rx="8" fill="rgba(248,113,113,0.12)" stroke="rgba(248,113,113,0.3)"/>
  <text x="442" y="77" fill="#f87171" font-size="24" font-weight="800" font-family="system-ui, sans-serif">30%</text>
  <text x="502" y="77" fill="#e2e8f0" font-size="14" font-weight="600" font-family="system-ui, sans-serif">Makes or breaks</text>
  <rect x="422" y="106" width="172" height="28" rx="6" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.2)"/>
  <text x="508" y="124" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Architecture</text>
  <rect x="604" y="106" width="172" height="28" rx="6" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.2)"/>
  <text x="690" y="124" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Security Posture</text>
  <rect x="422" y="142" width="172" height="28" rx="6" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.2)"/>
  <text x="508" y="160" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Threat Awareness</text>
  <rect x="604" y="142" width="172" height="28" rx="6" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.2)"/>
  <text x="690" y="160" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Governance</text>
  <rect x="250" y="182" width="300" height="22" rx="11" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
  <text x="400" y="197" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">MaintainabilityAI closes the 30%</text>
</svg>

That 30% is where systems fail, breaches happen, and technical debt compounds into organizational debt. We close it by making governance visible to the people *and* the agents doing the work.

---

## The framework, end to end

Three things make it coherent. A **substrate** (Looking Glass) that everyone reads from. A **planning modality** (Hatter's Tea Party) that turns intent into governed artifacts. An **enforcement modality** (Red Queen's Court) that gates what actually ships. Every artifact carries provenance. Every gate is auditable.

<svg viewBox="0 0 800 460" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="frameBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="lookingGlassGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(125,211,252,0.18)"/>
      <stop offset="100%" stop-color="rgba(125,211,252,0.05)"/>
    </linearGradient>
    <linearGradient id="hatterGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(165,180,252,0.22)"/>
      <stop offset="100%" stop-color="rgba(165,180,252,0.06)"/>
    </linearGradient>
    <linearGradient id="rqGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(244,114,182,0.22)"/>
      <stop offset="100%" stop-color="rgba(244,114,182,0.06)"/>
    </linearGradient>
    <marker id="frameArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
    <marker id="frameArrowGrey" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/>
    </marker>
  </defs>
  <rect width="800" height="460" rx="12" fill="url(#frameBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">AGENTIC GOVERNED SDLC — END TO END</text>
  <rect x="300" y="48" width="200" height="46" rx="10" fill="rgba(99,102,241,0.18)" stroke="rgba(165,180,252,0.4)"/>
  <text x="400" y="68" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">INTENT</text>
  <text x="400" y="85" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600" font-family="system-ui, sans-serif">OKR · cascade · KRs</text>
  <rect x="40" y="110" width="720" height="68" rx="10" fill="url(#lookingGlassGrad)" stroke="rgba(125,211,252,0.5)"/>
  <text x="400" y="130" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="700" letter-spacing="2" font-family="system-ui, sans-serif">LOOKING GLASS · the governance substrate</text>
  <text x="400" y="150" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">CALM architecture · STRIDE threats · ADRs · NIST controls · four-pillar scores</text>
  <text x="400" y="166" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Both modalities read from this. Source of truth for "what is governed."</text>
  <line x1="400" y1="94" x2="400" y2="108" stroke="#a5b4fc" stroke-width="2" marker-end="url(#frameArrow)"/>
  <rect x="40" y="200" width="350" height="156" rx="10" fill="url(#hatterGrad)" stroke="rgba(165,180,252,0.45)"/>
  <text x="215" y="222" text-anchor="middle" fill="#c4b5fd" font-size="12" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">HATTER'S TEA PARTY · PLAN</text>
  <text x="215" y="240" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Governs intent upstream of code</text>
  <rect x="56" y="252" width="318" height="22" rx="6" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.25)"/>
  <text x="215" y="267" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">Why · Market research (4 oracles + gap loop)</text>
  <rect x="56" y="278" width="318" height="22" rx="6" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.25)"/>
  <text x="215" y="293" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">How · PRD (mesh-grounded gate · ask-experts)</text>
  <rect x="56" y="304" width="318" height="22" rx="6" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.25)"/>
  <text x="215" y="319" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">What · Code Design (code-grounded heavy gate)</text>
  <text x="215" y="343" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Hatter's Tag · Audit Report Export</text>
  <rect x="410" y="200" width="350" height="156" rx="10" fill="url(#rqGrad)" stroke="rgba(244,114,182,0.45)"/>
  <text x="585" y="222" text-anchor="middle" fill="#f9a8d4" font-size="12" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">RED QUEEN'S COURT · ENFORCE</text>
  <text x="585" y="240" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Governs action inside code repos</text>
  <rect x="426" y="252" width="318" height="22" rx="6" fill="rgba(244,114,182,0.10)" stroke="rgba(244,114,182,0.25)"/>
  <text x="585" y="267" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">PreToolUse hooks · ms inline blocking</text>
  <rect x="426" y="278" width="318" height="22" rx="6" fill="rgba(244,114,182,0.10)" stroke="rgba(244,114,182,0.25)"/>
  <text x="585" y="293" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">MCP validate_action · deterministic policy</text>
  <rect x="426" y="304" width="318" height="22" rx="6" fill="rgba(244,114,182,0.10)" stroke="rgba(244,114,182,0.25)"/>
  <text x="585" y="319" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">CI required status check (Phase 9)</text>
  <text x="585" y="343" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">"Allow · Conditional · Deny" — auditable</text>
  <line x1="215" y1="178" x2="215" y2="198" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3" marker-end="url(#frameArrowGrey)"/>
  <line x1="585" y1="178" x2="585" y2="198" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3" marker-end="url(#frameArrowGrey)"/>
  <path d="M 390 280 L 408 280" stroke="#a5b4fc" stroke-width="2" marker-end="url(#frameArrow)"/>
  <text x="399" y="272" text-anchor="middle" fill="#a5b4fc" font-size="8" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">HAND-OFF</text>
  <rect x="180" y="380" width="440" height="46" rx="10" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.35)"/>
  <text x="400" y="400" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">CODING AGENTS IN CODE REPOS</text>
  <text x="400" y="416" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">governed code · audit-chained · ready to ship</text>
  <line x1="215" y1="358" x2="320" y2="378" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#frameArrow)"/>
  <line x1="585" y1="358" x2="480" y2="378" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#frameArrow)"/>
  <text x="400" y="448" text-anchor="middle" fill="#64748b" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Hatter's Tag chain — intent_thread_uuid links every artifact, every reviewer, every prompt SHA across repos</text>
</svg>

The Hatter governs what should be built and how it should be designed. The Red Queen governs what an agent is allowed to do while it builds. They are complementary, not competing. Both read the same Looking Glass substrate, so an OKR-anchored design and a runtime enforcement decision reference the same CALM nodes, the same threat IDs, the same governance scores.

---

## Meet the two modalities

<div class="docs-flex-block">
  <img src="/images/tea-party.png" alt="The Hatter's Tea Party — host of the planning modality" class="docs-inline-image" />
  <div>
    <div class="docs-card-kicker" style="color:#a5b4fc">🎩 Plan · upstream of code</div>
    <div class="docs-heading">The Hatter's Tea Party</div>
    <p class="docs-copy">Turn an OKR into a code-grounded design, with provenance every reviewer can verify. The Hatter takes a one-line intent, grounds it in evidence, runs it past mesh-anchored experts, and lands a cross-cutting design that's been reviewed against the actual repos it will change.</p>
    <ul class="markdown-list list-disc">
      <li class="docs-list-item">Market research across four oracles: web, academic papers, patents, developer community, plus a Jobs-to-be-Done lens</li>
      <li class="docs-list-item">PRD refined by mesh-anchored clarifying questions; reviewers score it for mesh-grounding</li>
      <li class="docs-list-item">Cross-cutting code design grounded against every indexed target repo (the heaviest gate in the pipeline)</li>
      <li class="docs-list-item">One-click <strong>Audit Report Export</strong> bundles the whole thread for a CIO to read in one sitting</li>
    </ul>
    <p class="docs-copy"><a href="/docs/hatters-tea-party" class="docs-button-primary">Open the Tea Party →</a></p>
  </div>
</div>

<div class="docs-flex-block">
  <div>
    <div class="docs-card-kicker" style="color:#fda4af">♛ Enforce · inside the code repo</div>
    <div class="docs-heading">The Red Queen's Court</div>
    <p class="docs-copy">Architecture rules of movement. Every agent action checked against the CALM model, deterministically. Not "please follow the architecture." A board with rules, and a queen who keeps them.</p>
    <ul class="markdown-list list-disc">
      <li class="docs-list-item">PreToolUse hooks block in milliseconds before any agent tool fires</li>
      <li class="docs-list-item">MCP <code>validate_action</code> lets agents ask the deterministic policy engine before acting</li>
      <li class="docs-list-item">Six rails today: CALM flow constraints, security-critical paths, restricted-tier locks, control adherence, platform impact, permission tiers</li>
      <li class="docs-list-item">Cross-repo semantic governance and a CI hard merge gate land in Phase 9</li>
    </ul>
    <p class="docs-copy"><a href="/docs/red-queens-court" class="docs-button-primary">Open the Court →</a></p>
  </div>
  <img src="/images/redqueen.png" alt="The Red Queen — chess-piece queen, host of the enforcement modality" class="docs-inline-image" />
</div>

If the Hatter does the planning work well, the Red Queen rarely has to deny. If the Red Queen catches what the Hatter missed, the system stays safe. The two together are the agentic governed SDLC.

---

## Looking Glass: the substrate everything reads

A VS Code-native portfolio dashboard that doesn't just list your applications. It **understands** them. Every Business Application Repository (BAR) in your portfolio is scored across **four governance pillars**: Architecture, Security, Information Risk, and Operations. Not checklist scores. Scores derived from actual artifacts: CALM architecture models, STRIDE threat models, NIST-mapped security controls, architectural decision records.

<div class="docs-center-block">
<img src="/images/looking-glass-governance.png" alt="Looking Glass governance dashboard showing four-pillar scoring across a portfolio of BARs" class="docs-inline-image" />
</div>

### Interactive CALM architecture

Architecture diagrams built on ReactFlow and ELK.js. Not static pictures, but living canvases where you drag, drop, edit, and write changes directly back to the CALM model. Bidirectional editing means the diagram IS the architecture, and the architecture IS the diagram.

<div class="docs-center-block">
<img src="/images/looking-glass-calm.png" alt="Interactive CALM architecture diagram with ReactFlow and ELK.js layout" class="docs-inline-image" />
</div>

Trend sparklines show governance health over time. Drift indicators catch decay before it becomes crisis. Enterprise capability models (ACORD, BIAN) map business capabilities to the applications that implement them.

### Absolem: AI architecture advisor

<div class="docs-center-block">
<img src="/images/looking-glass-absolem.png" alt="Absolem AI architecture advisor with seven specialized governance commands" class="docs-inline-image" />
</div>

An AI governance assistant that doesn't just answer questions. It understands your architecture. Seven specialized commands: drift analysis, component addition, CALM validation, cross-pillar gap analysis, ADR suggestions, image-to-CALM conversion, freeform consultation. **Image-to-CALM** turns a whiteboard photo into a structured CALM 1.2 model. **Scan Repo** derives architecture bottom-up from running code.

### Oraculum: automated architecture review

<div class="docs-center-block">
<img src="/images/looking-glass-oraculum-review.png" alt="Oraculum review configuration with four-pillar selection, prompt packs, and multi-repo targeting" class="docs-inline-image" />
</div>

Create a review. Select prompt packs. Assign Claude Code or Copilot Coding Agent as reviewers. A GitHub Action checks out your code repos, analyzes them against your CALM model, and posts structured findings to a GitHub Issue, organized by governance pillar, rated by severity, mapped to NIST controls. Real-time monitoring with avatar timelines. PR detection with checks status. Review metrics saved to your governance mesh.

### CALM 1.2: architecture as code

We built on **FINOS CALM**, the Common Architecture Language Model — an open standard from the Linux Foundation backed by Morgan Stanley, JPMorgan, and ThoughtWorks. JSON-based. Git-native. Machine-readable. The architecture standard built for the agentic age. MaintainabilityAI is one of the earliest production implementations of CALM 1.2, already shipping what the ThoughtWorks Technology Radar is moving from "Trial" to "Adopt."

---

## What no one else has

We reviewed the leading vendors across Internal Developer Portals, Enterprise Architecture Management, and AI-Assisted Software Engineering. Each has real strengths. Every one is missing the same thing: **architecture governance that reaches the developer and the agent simultaneously.**

| Capability | MaintainabilityAI | Backstage | Port.io | LeanIX | EventCatalog | OpsLevel |
|:-----------|:-:|:-:|:-:|:-:|:-:|:-:|
| **CALM Architecture Modeling** | **Native** | — | — | ArchiMate | EDA only | — |
| **Four-Pillar Governance** | **Yes** | Plugin | Scorecards | Fact sheets | Linter | Maturity |
| **STRIDE Threat Modeling** | **AI-Generated** | — | — | — | — | — |
| **OWASP Prompt Packs** | **Embedded** | — | — | — | — | — |
| **Agentic Architecture Review** | **Oraculum** | — | — | — | Chat Q&A | AI assist |
| **Interactive Diagram Editor** | **ReactFlow + ELK** | — | — | Lucid-style | Auto-gen | — |
| **Image & Repo to Architecture** | **Both** | — | — | — | Photo (beta) | — |
| **Upstream intent governance** | **Hatter's Tea Party** | — | — | — | — | — |
| **Deterministic enforcement at agent action** | **Red Queen's Court** | — | — | — | — | — |
| **Cross-repo audit chain** | **intent_thread_uuid** | — | — | — | — | — |

Backstage catalogs services without understanding their architecture. Port.io tracks scorecards focused on operational health, not architecture governance. LeanIX models architecture from the CIO's dashboard, disconnected from code. EventCatalog documents event-driven systems with zero security features. OpsLevel measures service maturity, not architectural quality.

**MaintainabilityAI is the only tool that starts from the architecture model and makes governance real in the developer's workflow *and* the agent's tool call.**

<div class="docs-center-block">
<div class="docs-heading">Free. Open Source. Forever.</div>
<div class="docs-copy">No $100K enterprise license. No SaaS vendor lock-in. Your governance data lives in Git, version-controlled alongside your code.</div>
</div>

---

## Threat model: the Hatter feature

The Hatter's Tea Party is in design. Threat modeling is part of how we design it, not a checklist after the fact. The model below uses **STRIDE** because it's the language enterprise security teams already speak, and we publish it openly because honest design beats marketing claims. It covers the actors we expect, the threats we enumerate, the controls already in the design, and the gaps that remain.

### Threat actors

Five actors the Hatter must withstand:

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">External</div>
    <div class="docs-heading">External attacker</div>
    <div class="docs-copy">No legitimate access. Goals: exfiltrate IP from artifacts, poison the audit chain to discredit governance, exploit the GitHub App to reach target repos, or DoS the pipeline. Reaches the system via compromised auth credentials, supply-chain vectors, or social engineering of legitimate users.</div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">AI</div>
    <div class="docs-heading">Compromised agent</div>
    <div class="docs-copy">A legitimate agent session manipulated via prompt injection (most commonly from research-source content) or model jailbreak. Goal: produce artifacts that look governed but violate the intent. Hardest to detect because the agent is "supposed" to be there.</div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Insider</div>
    <div class="docs-heading">Malicious insider</div>
    <div class="docs-copy">Legitimate GitHub access. Goals: ship code that bypasses governance, manipulate BAR scores to unlock tier, coordinate a dual-signature override to push restricted work. The Tweedles, Pocket Watch, and tier-freeze controls are aimed here.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Insider</div>
    <div class="docs-heading">Careless insider</div>
    <div class="docs-copy">Well-intentioned. Pastes secrets into an OKR objective, oversigns an override request without reading it, mis-classifies sensitive research findings, or shares an audit export externally without redaction. Most common day-to-day risk.</div>
  </div>
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Supply chain</div>
    <div class="docs-heading">Supply-chain attacker</div>
    <div class="docs-copy">Targets the prompt-pack template repository, a Skill's external API, a model provider's account, or the Maintainability AI GitHub App itself. One compromised prompt pack propagates to every mesh that pulls the update.</div>
  </div>
</div>

### Threats and controls (STRIDE)

<svg viewBox="0 0 800 360" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="strideBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="360" rx="12" fill="url(#strideBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">STRIDE COVERAGE — HATTER FEATURE</text>
  <line x1="147" y1="48" x2="147" y2="248" stroke="rgba(148,163,184,0.10)" stroke-width="1"/>
  <line x1="273" y1="48" x2="273" y2="248" stroke="rgba(148,163,184,0.10)" stroke-width="1"/>
  <line x1="400" y1="48" x2="400" y2="248" stroke="rgba(148,163,184,0.10)" stroke-width="1"/>
  <line x1="527" y1="48" x2="527" y2="248" stroke="rgba(148,163,184,0.10)" stroke-width="1"/>
  <line x1="653" y1="48" x2="653" y2="248" stroke="rgba(148,163,184,0.10)" stroke-width="1"/>
  <text x="83" y="74" text-anchor="middle" fill="#e2e8f0" font-size="26" font-weight="800" font-family="system-ui, sans-serif">S</text>
  <text x="83" y="92" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">SPOOF</text>
  <text x="210" y="74" text-anchor="middle" fill="#e2e8f0" font-size="26" font-weight="800" font-family="system-ui, sans-serif">T</text>
  <text x="210" y="92" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">TAMPER</text>
  <text x="337" y="74" text-anchor="middle" fill="#e2e8f0" font-size="26" font-weight="800" font-family="system-ui, sans-serif">R</text>
  <text x="337" y="92" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">REPUDIATE</text>
  <text x="463" y="74" text-anchor="middle" fill="#e2e8f0" font-size="26" font-weight="800" font-family="system-ui, sans-serif">I</text>
  <text x="463" y="92" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">INFO LEAK</text>
  <text x="590" y="74" text-anchor="middle" fill="#e2e8f0" font-size="26" font-weight="800" font-family="system-ui, sans-serif">D</text>
  <text x="590" y="92" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">DOS</text>
  <text x="717" y="74" text-anchor="middle" fill="#e2e8f0" font-size="26" font-weight="800" font-family="system-ui, sans-serif">E</text>
  <text x="717" y="92" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">ELEVATE</text>
  <rect x="28" y="108" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="83" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Tweedles DID</text>
  <rect x="28" y="136" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="83" y="151" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Override fingerprint</text>
  <rect x="28" y="164" width="110" height="22" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="83" y="179" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Knight's Seal (B+)</text>
  <rect x="155" y="108" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="210" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Hash-chained JSONL</text>
  <rect x="155" y="136" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="210" y="151" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Concurrency groups</text>
  <rect x="155" y="164" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="210" y="179" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Pocket Watch gate</text>
  <rect x="155" y="192" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="210" y="207" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Tier freeze</text>
  <rect x="282" y="108" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="337" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Override audit YAML</text>
  <rect x="282" y="136" width="110" height="22" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="337" y="151" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="600" font-family="system-ui, sans-serif">author_did + chain</text>
  <rect x="408" y="108" width="110" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="463" y="123" text-anchor="middle" fill="#fca5a5" font-size="9" font-weight="600" font-family="system-ui, sans-serif">LLM provider audit</text>
  <rect x="408" y="136" width="110" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="463" y="151" text-anchor="middle" fill="#fca5a5" font-size="9" font-weight="600" font-family="system-ui, sans-serif">PII classification</text>
  <rect x="408" y="164" width="110" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="463" y="179" text-anchor="middle" fill="#fca5a5" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Export redaction</text>
  <rect x="535" y="108" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="590" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Cost caps (org/OKR)</text>
  <rect x="535" y="136" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="590" y="151" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Skill timeouts</text>
  <rect x="535" y="164" width="110" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="590" y="179" text-anchor="middle" fill="#fca5a5" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Fan-out cap</text>
  <rect x="662" y="108" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="717" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Tier deterministic</text>
  <rect x="662" y="136" width="110" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="717" y="151" text-anchor="middle" fill="#fca5a5" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Prompt injection</text>
  <rect x="662" y="164" width="110" height="22" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="717" y="179" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Pack signing (B+)</text>
  <line x1="20" y1="270" x2="780" y2="270" stroke="rgba(148,163,184,0.15)" stroke-width="1" stroke-dasharray="4"/>
  <text x="400" y="290" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">STATUS</text>
  <rect x="180" y="304" width="22" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="191" y="319" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" font-family="system-ui, sans-serif">✓</text>
  <text x="212" y="319" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">in design (Phase A)</text>
  <rect x="360" y="304" width="22" height="22" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="371" y="319" text-anchor="middle" fill="#fcd34d" font-size="11" font-weight="700" font-family="system-ui, sans-serif">🛠</text>
  <text x="392" y="319" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">partial — strong variant in B+</text>
  <rect x="572" y="304" width="22" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="583" y="319" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="700" font-family="system-ui, sans-serif">⚠</text>
  <text x="604" y="319" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">honest gap (named below)</text>
  <text x="400" y="346" text-anchor="middle" fill="#64748b" font-size="9" font-style="italic" font-family="system-ui, sans-serif">10 controls in design · 3 partial · 5 honest gaps · all open in GitHub for community review</text>
</svg>

Each row in the table below names a concrete threat, the design control that addresses it, and a status. **✓ in design** = spec'd in [the design doc](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/agentic-sdlc.md). **🛠 partial** = Phase A enforces a weaker variant; the strong variant is in a later phase. **⚠ gap** = open work, listed in the next section.

| STRIDE | Concrete threat | Control in design | Status |
|---|---|---|:-:|
| **Spoof** | Reviewer impersonates the author agent on the same PR | Tweedles check in `reviewer-bus.yml` reads `author_did` from PR-description Hatter Tag before assigning a reviewer; rotates DID or labels `tweedles-violation` on collision (§5.5.8) | ✓ |
| **Spoof** | Dual-signature override second-signer is impersonated | Fingerprint validation tying request to OKR + phase + reason + timestamp; Signer 2 confirmed via GitHub commenter handle or signed YAML commit; signer ≠ signer (§10.9.2) | ✓ |
| **Spoof** | Author identity in audit log forged | GitHub App installation ID + `system_prompt_sha` on every Hatter Tag at Phase A; cryptographic signature (Ed25519) in Phase B+ via Knight's Seal | 🛠 |
| **Tamper** | Merged artifact edited after the fact | Hatter Tag frontmatter is canonical, immutable via merged commit SHA; PR-description copy is the display mirror; `verify-chain` CLI validates frontmatter vs JSONL chain (§11.1.5) | 🛠 |
| **Tamper** | Audit JSONL chain modified | Hash-chained CloudEvents v1.0; partitioned per-run-id (eliminates contention); POSIX advisory locking within file; per-run filenames prevent cross-run collision (§11.1.6) | ✓ |
| **Tamper** | OKR YAML corrupted by simultaneous phase merges | `concurrency:` group on `okr-bus.yml` keyed by `okr_id` serializes writes per OKR; different OKRs run parallel (§9.1) | ✓ |
| **Tamper** | Goal drift via subtle objective rewrite | White Rabbit's Pocket Watch hashes the canonicalized objective; compares with semantic similarity ≥ 0.85 AND edit-distance ≤ 0.30; `goal-drift-detected` label blocks merge (§9.2) | ✓ |
| **Tamper** | Tier creep mid-pipeline as BAR score bumps | Governance tier frozen on the Hatter Tag at run start; recorded tier applies for the run regardless of mesh-state changes (§6.2) | ✓ |
| **Repudiate** | "I didn't authorize that override" | Dual-signature override YAML preserved under `okrs/<id>/audit/overrides/` with both signer DIDs, signed-at timestamps, fingerprint, and GitHub comment URL; CloudEvent emitted (§10.9.2) | ✓ |
| **Repudiate** | "That agent didn't produce that artifact" | `author_did` on Hatter Tag plus prev/this hash chain in audit JSONL; cryptographically sealed in Phase B+ | 🛠 |
| **Info disclosure** | LLM provider retains our prompts indefinitely | Out of our trust boundary; the design captures cost + token counts only, not prompt bodies | ⚠ |
| **Info disclosure** | Sensitive research-source content lands in audit export | Pure-data Skills emit structured findings; no automated sensitive-content classification on results | ⚠ |
| **Info disclosure** | Audit Report Export shared externally leaks design IP | Bundle includes merged research, PRD, and code-design verbatim; no redaction layer (PII / IP / secrets scrubbing) — Phase E follow-on | ⚠ |
| **DoS** | Cost-cap exhaustion via runaway agent runs | Per-Skill `max_skill_calls_per_run`, per-agent `max_tokens_per_run`, per-OKR `governance.max_cost_usd`, and per-org monthly cap; `cost-cap-reached` label freezes new assignments (§5.5.9 / §17.4) | ✓ |
| **DoS** | Skill chains time out exhausting GitHub Actions minutes | Per-Skill timeout + bounded retry policy (§5.5.3); workflow `timeout-minutes` on every bus workflow | ✓ |
| **DoS** | Fan-out blast radius — one OKR writes to N target repos | No upper bound today on `target_code_repos[]` length; `design-bus.yml` will write an issue per entry. Cap + warn threshold queued for Phase C | ⚠ |
| **EoP** | Tier bypass by faking BAR-score-raising artifacts | BAR pillar score is computed deterministically from real artifact presence (threat-model.yaml, controls block, ADRs). Inflation requires creating real artifacts that future agents will reference — the gate becomes self-reinforcing | ✓ |
| **EoP** | Prompt injection from a research-source page steers the agent | No content sanitization on Skill outputs; agent prompts don't explicitly partition data-vs-instructions | ⚠ |
| **EoP** | Compromised prompt pack version applied silently | Hatter Tag records `prompt_pack_version` + SHA; pack-deployment signature verification not in scope today | 🛠 |
| **Tamper** | Agent claims it called Skills it never actually invoked (evidence laundering) | `audit-validate.yml` (Phase B-PR1c) cross-checks the Hatter Tag's `evidence_mode` declaration against the per-run audit JSONL; if the agent declared `live` evidence but the log contains 0 successful `skill_call` events for any of the four search providers, the `degraded-evidence` label is applied and `okr-state-machine.yml` refuses to promote `governance-pass`. WHY-phase research PRs gate on `research-pass` from this same workflow. (§11.1.7) | ✓ |

### AEGIS overlay — where this design fits in the agentic-AI security landscape

STRIDE alone doesn't cover agent-specific failure modes (goal drift, evidence laundering, prompt injection from data-not-instructions confusion). Three industry frameworks sit on top of STRIDE for the agentic case. The Hatter's Tea Party design satisfies most of their controls; some gaps remain.

**Forrester AEGIS (Agentic AI Guardrails for Information Security)** — six domains, three core principles. The closest enterprise-governance framework for agentic systems, published 2025.

| Forrester domain | Forrester named control | Hatter's Tea Party implementation | Status |
|---|---|---|:-:|
| Governance, Risk & Compliance | Machine-executable, context-aware policy enforcement | Per-phase gate workflows (`market-research-agent.yml`, audit-validate, drift-gate) enforce policy in CI, not just at PR review | ✓ |
| Identity & Access Management | Agents as hybrid identities with just-in-time privileges | Per-agent `.agent.md` declares minimum-necessary `tools:` list; deployment refuses to land an agent referencing an undeclared Skill (§5.5.1) | ✓ |
| Data Security & Privacy | Data provenance, memory, enclaves | Hatter Tag pins `mesh_sha` + `prompt_pack_version` + chain root; every artifact traces back to source documents | ✓ |
| Application Security & DevSecOps | Prompt engineering + supply-chain validation | Prompt packs versioned + SHA-stamped; pack-signature verification queued for Phase B+ Knight's Seal | 🛠 |
| Threat Management & SecOps | Real-time monitoring + detection engineering | Hash-chained audit JSONL is queryable; `verify-chain` (Phase E) replays the full run from disk; gap-loop refinement events visible in audit trail | ✓ |
| Zero Trust | "Least agency" — minimum permissions per goal | Reviewer agents `tools:` deliberately omit `edit` (Tweedles boundary); skill backends are pure-data, can't mutate beyond their declared writes | ✓ |

**Core principles (all three):** _Least Agency_ ✓ (per-agent tool whitelists), _Continuous Assurance_ ✓ (every PR re-runs the gate workflows, not point-in-time review), _Explainable Outcomes_ ✓ (audit JSONL is both human- and machine-readable; correctness summary PR comment names the failure reasons literally).

**AEGIS Pre-Execution Firewall** ([arXiv 2603.12621](https://arxiv.org/abs/2603.12621)) — runtime tool-call interception with Ed25519 + SHA-256 hash-chained audit. Direct lineage to our `audit-emit-event` skill:

| AEGIS Pre-Execution Firewall control | Hatter's Tea Party implementation | Status |
|---|---|:-:|
| SHA-256 hash chain over every audit record | `prev_event_hash` linkage on every JSONL line; `chain_root_hash` pins the run | ✓ |
| Tamper-evident audit trail | Modifying any past event breaks every subsequent `prev_event_hash` — `verify-chain` catches it offline | ✓ |
| **Pre-merge chain re-verification (CI gate)** | `audit-and-drift` workflow replays the SHA-256 chain end-to-end against the canonical serialization before any PR can merge. Implemented inline (independent of the runner) so a runner bug can't silently pass; applies `chain-forgery-detected` label and blocks merge on mismatch. Closes the gap where an agent that lost access to the `audit-emit-event` runner could hand-write the JSONL with fabricated hashes (observed on PR #105) | ✓ |
| Pre-execution interception (log before side effect) | `skill-audit-emit-event` is the first call inside each skill invocation; recorded before the skill emits its result | ✓ |
| Ed25519 per-agent signing key | Phase A uses GitHub App installation ID + `system_prompt_sha`; Ed25519 lands in Knight's Seal (Phase B+) | 🛠 |
| Content-first risk scanning on extracted tool args | Pure-data skills return structured JSON the parent agent inspects; no prompt-vs-data conflation | ✓ |

**Aegis Protocol** ([arXiv 2508.19267](https://arxiv.org/abs/2508.19267)) — cryptographic protocol for open agentic ecosystems. Three pillars: W3C DIDs (non-spoofable agent identity), NIST PQC (communication integrity), Halo2 ZKP (verifiable, privacy-preserving policy compliance). Formalizes a game-based definition of "Excessive Agency."

The Aegis Protocol's _Excessive Agency_ game maps directly to our **Pocket Watch goal-drift** check (§9.2): if the agent's PR scope diverges too far from the OKR's frozen objective (cosine similarity < 0.85), the agent has exceeded its authorized agency and the workflow refuses to merge. The protocol's ZKP-based policy proofs are not yet implemented — they're a Phase B+ candidate when third-party verifiable governance attestation becomes a requirement.

**ASTRIDE** ([arXiv 2512.04785](https://arxiv.org/pdf/2512.04785)) — formal STRIDE extension that adds category **"A" for AI-Agent-Specific Attacks**: prompt manipulation, context/memory poisoning, inter-agent influence. Our threat model covers `A.prompt-injection` and `A.memory-poisoning` (Hatter Tag pins mesh_sha so a poisoned mesh state is detectable across runs); `A.inter-agent-influence` (an upstream agent's output steering a downstream agent toward a different goal) is partially addressed by the Caterpillar's Challenge cross-phase drift check.

A fourth A-category surfaced on PR #105 and is now in scope: **`A.false-audit-fabrication`** — an agent that loses access to the audit-emission runner reasons that *"the audit is non-blocking anyway"* and writes the JSONL by hand with fabricated hash values to appear compliant. The prompt-level mitigation is a hard rule against direct JSONL writes (the agent must STOP and post a PR comment if the runner is unreachable). The structural mitigation is the new pre-merge **`verify-chain`** CI step that re-replays the SHA-256 chain against the canonical serialization — implemented independently of the runner so a runner bug can't silently pass. On verification failure the merge gate refuses with a `chain-forgery-detected` label. This converts what was previously a silent governance-bypass into a blocking failure that names its own cause.

**What auditable evidence looks like under this overlay.** A reviewer (internal auditor, regulator, downstream consumer) can take just two files from any merged artifact — `okrs/<id>/<phase>/<artifact>.md` and `okrs/<id>/audit/events/<run>.jsonl` — and:

1. Verify the Hatter Tag's declared `chain_root_hash` matches the SHA-256 of the JSONL's last event (replay verification — AEGIS Pre-Execution Firewall pattern). This is the same check the pre-merge `verify-chain` CI step ran before the artifact was allowed to merge.
2. Confirm every claim in the artifact traces back to a `skill_call` event in the audit (provenance — Forrester Data Security)
3. Replay the agent's query plan from `payload.queries` on each search event (reproducibility — Forrester Explainable Outcomes)
4. Detect tampering: any modification to a past audit event breaks every subsequent `prev_event_hash` (tamper-evidence)

No live system access required. No proprietary tooling. Just two files and a SHA-256 implementation. The auditor's offline replay matches the CI's pre-merge replay — same algorithm, same result.

### Honest gaps for a future phase

These are open. They are the design's known unknowns. Each is queued for a named future phase or remains a research item:

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Highest impact</div>
    <div class="docs-heading">Prompt injection from external research</div>
    <div class="docs-copy">A Tavily / arXiv / HN result containing crafted prompt-injection text can manipulate the market-research-agent into following attacker-supplied instructions. Mitigation requires a sanitization layer on Skill outputs and an agent-prompt structure that explicitly partitions data from instructions. Research item; not in Phase B scope.</div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Phase B+</div>
    <div class="docs-heading">Knight's Seal — Ed25519 signing</div>
    <div class="docs-copy">Phase A enforces author identity via GitHub App installation ID + system-prompt SHA stamped on every Hatter Tag. The cryptographic seal that binds these together is Phase B+. Until it ships, a capable insider with mesh write access can tamper with merged artifacts; <code>verify-chain</code> catches it after the fact, not preventively.</div>
  </div>
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Phase B+</div>
    <div class="docs-heading">Prompt-pack signature verification</div>
    <div class="docs-copy">Packs deploy from the mesh template. Hatter Tag records the pack version and SHA on each run, so post-hoc auditing works — but a compromised template-repo committer can ship a malicious pack and we won't refuse to load it. Signed-pack-only deployment is queued for Phase B+ Settings → Mesh Provisioning.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Trust boundary</div>
    <div class="docs-heading">LLM-provider audit blind spot</div>
    <div class="docs-copy">Anthropic and GitHub Copilot store our prompts + outputs under their retention policies. Our audit chain stops at the request boundary; we record token counts and costs, not prompt bodies. This will not change until self-hosted inference is in scope, which is not on the current roadmap.</div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Policy gap</div>
    <div class="docs-heading">Org-separation on dual-signature override</div>
    <div class="docs-copy">Today: Signer 2 ≠ Signer 1, both must be human, both must have authority per the org's documented override policy. Not enforced: same-team coordination. Two engineers on the same team can pre-arrange overrides and the workflow won't catch it. Org-graph-based enforcement (different team, different cost-center) is a Phase C+ work item.</div>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Compliance</div>
    <div class="docs-heading">Audit Report Export redaction</div>
    <div class="docs-copy">The bundle includes merged research, PRD, and code-design verbatim. If the export is shared with an external auditor or regulator, IP details in the design surface to that audience. A redaction layer (PII / IP / secrets scrubbing) is a Phase E follow-on. Today: the export is intended for internal audit only.</div>
  </div>
</div>

We treat this list as **living**. As the design ships and we learn from real OKR runs, the gaps will move (some will close into the controls table; new ones will surface). The threat model lives in [the design doc](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/agentic-sdlc.md) and tracks alongside the deliverables map.

> 💬 **Responsible disclosure.** Found a threat we haven't named? Open an issue at [github.com/AliceNN-ucdenver/MaintainabilityAI](https://github.com/AliceNN-ucdenver/MaintainabilityAI) or contact [chiefarcheologist.com/contact](https://chiefarcheologist.com/contact). We treat security threats as design feedback, not as criticism.

---

## Where to start

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-emerald">
    <div class="docs-heading">Hands-on quickstart</div>
    <div class="docs-copy">Install hooks, the repo-local MCP runner, and review workflows on a real repo. Use the IMDB-Celebs BAR so the strictest enforcement path actually fires.</div>
    <div class="docs-copy"><a href="/docs/quickstart-redqueen" class="docs-button-secondary">Red Queen quickstart →</a></div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">The framework</div>
    <div class="docs-copy">The 6-phase SDLC that ties STRIDE, OWASP, fitness functions, agent guides, and the VS Code extension into one operating model.</div>
    <div class="docs-copy"><a href="/docs/framework" class="docs-button-secondary">Framework →</a></div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-heading">8-part workshop</div>
    <div class="docs-copy">Curriculum for teams adopting governed AI engineering. Eight parts. Run end-to-end against the IMDB-Lite sample.</div>
    <div class="docs-copy"><a href="/docs/workshop" class="docs-button-secondary">Workshop →</a></div>
  </div>
</div>

---

<div class="docs-hero-flourish">
  <em>"Why, sometimes I've believed as many as six impossible things before breakfast."</em>
  <br/><small>— Lewis Carroll</small>
</div>
