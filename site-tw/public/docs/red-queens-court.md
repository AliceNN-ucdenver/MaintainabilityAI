<div class="docs-hero docs-hero-split docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/crown.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/agentic-sdlc-governance">Vision</a><span class="sep">/</span><span>Red Queen's Court</span></div>
    <div class="docs-eyebrow">Vision · Enforcement modality <span class="docs-hero-meta">~12 min read</span></div>
    <h1 class="docs-hero-title">The Red Queen's Court</h1>
    <p class="docs-hero-copy">
      Deterministic governance enforcement at the moment an AI agent proposes a structural change. Three layers — hooks, MCP, and a CI hard gate — built on a CALM-aware policy engine. <strong>Not "please follow the architecture." A board with rules of movement, and a queen who keeps them.</strong>
    </p>
    <div class="docs-actions">
      <a href="/docs/quickstart-redqueen" class="docs-button-primary">Install on a repo (quickstart)</a>
      <a href="/docs/hatters-tea-party" class="docs-button-secondary">See the planning side →</a>
    </div>
    <span class="docs-hero-flourish">&ldquo;All the ways about here belong to me.&rdquo;</span>
  </div>
  <figure class="docs-hero-figure">
    <img src="/images/redqueen.png" alt="The Red Queen — chess-piece queen from Through the Looking-Glass" class="docs-hero-art" />
    <figcaption class="docs-visual-caption">The Red Queen — chess piece, not Queen of Hearts. Rules of movement on the board.</figcaption>
  </figure>
</div>

---

## The problem with prompts

Every governance tool today — including ours — relies on prompts to guide AI agents. "Please follow the architecture." "Please respect these security controls." "Please don't add direct database connections."

The problem? **Prompts are advisory.** Agents can and do ignore them. An LLM that's optimizing for task completion might decide that a direct database connection is the fastest path to the solution. Your architecture constraints become suggestions. Your security controls become suggestions. Your governance becomes a suggestion.

The Red Queen is what stops that. She is the **enforcement modality** of the framework — the part where governance moves from advice into action. Where the Hatter's Tea Party (the [planning modality](/docs/hatters-tea-party)) governs intent before code is written, the Red Queen governs **action** at the moment an agent reaches for a tool inside the code repo.

> *"It takes all the running you can do, to keep in the same place."*

That Red Queen quote captures the discipline of enforcement: every piece on the board must obey the rules of movement, or the game is no longer chess. Every tool call by an agent must obey the rules of governance, or the architecture is no longer governed.

---

## Three layers of governance intelligence

The Red Queen is a unified governance intelligence and enforcement system. It doesn't just tell agents about your architecture — it **enforces** it.

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
  <rect x="20" y="55" width="120" height="70" rx="8" fill="rgba(14,165,233,0.15)" stroke="rgba(14,165,233,0.4)"/>
  <text x="80" y="85" text-anchor="middle" fill="#7dd3fc" font-size="13" font-weight="700" font-family="system-ui, sans-serif">AI Agent</text>
  <text x="80" y="108" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Proposes action</text>
  <line x1="140" y1="90" x2="172" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <rect x="175" y="55" width="140" height="70" rx="8" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
  <text x="245" y="82" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" font-family="monospace">validate_action</text>
  <text x="245" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">MCP Tool Call</text>
  <text x="245" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">via The Grin</text>
  <line x1="315" y1="90" x2="347" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <rect x="350" y="55" width="140" height="70" rx="8" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.4)"/>
  <text x="420" y="82" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Policy Engine</text>
  <text x="420" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">TypeScript Rules</text>
  <text x="420" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Deterministic</text>
  <line x1="490" y1="90" x2="522" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <rect x="525" y="55" width="120" height="70" rx="8" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)"/>
  <text x="585" y="82" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="700" font-family="system-ui, sans-serif">CALM Model</text>
  <text x="585" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Flows, Controls,</text>
  <text x="585" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Interfaces</text>
  <line x1="645" y1="90" x2="677" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <rect x="680" y="50" width="100" height="80" rx="8" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.3)"/>
  <text x="730" y="76" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Allow</text>
  <text x="730" y="96" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Conditional</text>
  <text x="730" y="116" text-anchor="middle" fill="#f87171" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Deny</text>
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
  <rect x="310" y="210" width="180" height="22" rx="11" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)"/>
  <text x="400" y="225" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="600" font-family="system-ui, sans-serif">DETERMINISTIC  ·  AUDITABLE</text>
</svg>

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

**Six rails** guide and enforce governance today: **Permission Tiers** (agent autonomy bounded by governance scores), **Path Controls** (generated governance files stay read-only), **Security-Critical Paths** (restricted-tier agents cannot modify sensitive areas), **CALM Flow Constraints** (declared relationships are checked), **Control Warnings** (security-control impact is surfaced), and **Platform Impact** (shared nodes trigger coordination warnings). Interface contract diffing and deeper STRIDE mitigation enforcement move into the Phase 9 hard gate.

---

## Deterministic governance — prompts advise, policy decides

Your CALM architecture declares that **web-frontend** connects to **api-gateway**, which connects to **user-database**. A three-tier flow. Clean separation.

An AI agent implementing a feature decides: "I'll save time by querying the database directly from the frontend."

**Without The Red Queen:** The agent ignores the architecture guidance in its prompt, adds the direct connection, and creates a PR. Maybe a human catches it. Maybe they don't.

**With The Red Queen:** The agent calls **validate_action** before making any structural change. The Red Queen's Court **CALM flow constraint rule** checks the architecture model. No **web-frontend** → **user-database** relationship is declared. **Action denied.** The agent receives the denial reason and the correct architectural path: route through **api-gateway**.

This isn't an LLM judging whether the change is okay. It's a deterministic policy engine evaluating the CALM model. Condition → decision. Auditable. Unfoolable.

---

## Cross-repo semantic governance — the breakthrough we are building

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
  <rect x="30" y="48" width="200" height="110" rx="10" fill="rgba(14,165,233,0.08)" stroke="rgba(14,165,233,0.3)" stroke-dasharray="4"/>
  <text x="130" y="68" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">checkout-ui repo</text>
  <rect x="50" y="80" width="160" height="28" rx="6" fill="rgba(14,165,233,0.15)" stroke="rgba(14,165,233,0.4)"/>
  <text x="130" y="99" text-anchor="middle" fill="#7dd3fc" font-size="10" font-family="system-ui, sans-serif">Agent changes frontend</text>
  <rect x="50" y="118" width="160" height="28" rx="6" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)"/>
  <text x="130" y="137" text-anchor="middle" fill="#f87171" font-size="10" font-family="system-ui, sans-serif">Calls undeclared endpoint</text>
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
  <rect x="570" y="48" width="200" height="110" rx="10" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.3)" stroke-dasharray="4"/>
  <text x="670" y="68" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="600" font-family="system-ui, sans-serif">order-api repo</text>
  <rect x="590" y="80" width="160" height="28" rx="6" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)"/>
  <text x="670" y="99" text-anchor="middle" fill="#93c5fd" font-size="10" font-family="system-ui, sans-serif">Interface: order-api-v2</text>
  <rect x="590" y="118" width="160" height="28" rx="6" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)"/>
  <text x="670" y="137" text-anchor="middle" fill="#93c5fd" font-size="10" font-family="system-ui, sans-serif">Declared endpoints only</text>
  <line x1="230" y1="100" x2="288" y2="94" stroke="#818cf8" stroke-width="2" marker-end="url(#crArrow)"/>
  <line x1="512" y1="94" x2="568" y2="100" stroke="#818cf8" stroke-width="2" marker-end="url(#crArrow)"/>
  <path d="M 130 163 Q 130 260, 400 260 Q 670 260, 670 163" fill="none" stroke="rgba(99,102,241,0.4)" stroke-width="1.5" stroke-dasharray="6"/>
  <text x="400" y="275" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui, sans-serif">CALM Flow: checkout-ui  →  order-api  →  order-database</text>
</svg>

| Agent Change | Red Queen Response |
|---|---|
| Frontend calls undeclared API endpoint | **Phase 9 gate** — interface **order-api-v2** does not include that endpoint |
| API changes response format | **Phase 9 conditional** — frontend-app consumes this interface, update frontend or update contract first |
| Database drops a column | **Phase 9 deny** — blast radius: 4 nodes, 2 BARs, 1 flow. Requires migration ADR. |
| New service touches shared platform node | **Available now** — `validate_action` surfaces platform-impact coordination warnings |

---

## Agent-agnostic — one control plane, every agent

Organizations use Claude Code *and* Copilot Coding Agent. Different config files. Different instruction formats. Different hook mechanisms.

**The Red Queen doesn't care which agent is holding the keyboard.** Claude Code and Copilot Coding Agent get their own hook configuration, both adapters invoke the same validator, and both can call the same MCP tools against the same CALM model. A repo-local MCP runner resolves the live mesh from env, CI checkout, or manifest defaults; configuration fingerprints and the scaffold doctor catch drift before the setup quietly rots.

---

## Progressive autonomy — governance earns trust

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

**Improve your governance scores, and your agents earn more autonomy.** Governance becomes a force multiplier, not a bureaucratic tax. This is the same tier system the [Hatter's Tea Party](/docs/hatters-tea-party) uses to bound the planning-side recycle loop — one tier definition, two enforcement points (planning gates upstream, action gates inside code).

And when you genuinely need to bypass a constraint? A **break-glass procedure** is planned for Phase 9 — scoped, time-limited, CODEOWNER-approved, with anti-normalization controls that prevent overrides from becoming habit. Quarterly budgets, escalating friction, and follow-up SLAs will ensure the exception never becomes the rule.

---

## The feedback loop — agents that learn

Every agent interaction is measured — governance scores before and after, guardrail actions counted, cross-repo violations tracked, every decision correlated to a specific PR, commit, and workflow run via SHA-256 audit trail.

Governance scores aren't static — they behave like a **trust battery**. Scores decay over time based on review freshness, scan recency, and dependency age. Skip a security review? Your score drifts down. Let dependencies age? The trust battery drains. Active governance earns autonomy; neglect erodes it.

In Phase 9, the Red Queen will build **agent memory**: which policy rules fire most, which prompt packs resolve issues on the first pass, which repos keep violating the same contracts. That memory will feed back into policy refinements. Agents get smarter. Policies get sharper. **Governance improves continuously.**

---

## Where the Red Queen meets the Hatter

The two modalities cross paths at exactly one point: the per-repo issue write that ends the Hatter's Tea Party pipeline. The Hatter's `design-bus.yml` workflow writes a landing issue in each target code repo, carrying the merged code-design slice and the OKR's `intent_thread_uuid`. The coding agent in that repo picks up the issue — and from the moment it reaches for a tool, the **Red Queen governs**. Same audit chain. Same governance scores. Same CALM model. Different governance modality.

That seam is the single most-instrumented surface in the framework: every PR opened by a coding agent under a Hatter-issued landing issue carries the Hatter's Tag forward into the Red Queen's audit log, and every Red Queen `allow / conditional / deny` decision adds to that thread. Audit Report Export (from the OKR detail screen) reads both ends; the chain is unbroken.

---

## The road ahead — Phase 9 and beyond

The Red Queen ships eight phases today. Phase 9 — coming next — closes the loop with the CI hard merge gate and the audit-grade evidence chain that EU AI Act Article 12 and ISO/IEC 42001 ask for.

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Red Queen Phase 9</div>
    <div class="docs-heading">The hard gate</div>
    <div class="docs-copy"><code>redqueen-action</code> CI hard gate with tree-sitter AST semantic diff, machine-checkable contract diffs, break-glass budgets, agent memory, and adaptive policy refinement.</div>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Audit chain</div>
    <div class="docs-heading">The Court Recorder</div>
    <div class="docs-copy">Merkle-chained, append-only audit log of every Red Queen allow / deny / override. CloudEvents v1.0 envelopes. Inclusion-proof CLI. SIEM export to Splunk, Sentinel, Datadog. Built for EU AI Act Art. 12 retention.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Looking Glass pillar</div>
    <div class="docs-heading">Agent Roster</div>
    <div class="docs-copy">Live AI-BOM of every deployed agent: identity, model version, system-prompt hash, scope of access, owner, governance tier. ISO 42001 A.6.2.7 evidence in one place.</div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Fitness function</div>
    <div class="docs-heading">The Caterpillar's Challenge</div>
    <div class="docs-copy">CALM-derived architecture conformance tests: declared-flow checks, trust-zone crossings, interface-contract diffs (oasdiff, buf, graphql-inspector). Fitness functions that test <em>architecture behaviour</em>, not just code metrics.</div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Compliance</div>
    <div class="docs-heading">Regulatory evidence — expanded</div>
    <div class="docs-copy">Beyond the existing SOC 2, ISO 27001, NIST 800-53, and PCI DSS crosswalks, add <strong>EU AI Act</strong>, <strong>ISO/IEC 42001</strong>, and <strong>NIST AI RMF + Generative AI Profile</strong> — the three standards specific to AI engineering that enterprise auditors are asking about in 2026.</div>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Hands-on</div>
    <div class="docs-heading">Quickstart on a real repo</div>
    <div class="docs-copy">Install hooks, MCP runner, and review workflows on the IMDB-Celebs BAR end-to-end. Watch a deny fire on a real action.</div>
    <div class="docs-copy"><a href="/docs/quickstart-redqueen" class="docs-button-secondary">Open quickstart →</a></div>
  </div>
</div>

For the full landscape — what Microsoft, GitHub, Snyk, and the EU AI Act are pulling forward in 2026 — read the [agentic governance research](/docs/research/agentic-governance-landscape).

---

## Where to go next

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-rose">
    <div class="docs-heading">Quickstart on a real repo</div>
    <div class="docs-copy">Hands-on walkthrough: install hooks, repo-local MCP runner, review workflow, and first-run doctor against the IMDB-Celebs BAR (low score, Restricted tier — the strictest enforcement path fires).</div>
    <div class="docs-copy"><a href="/docs/quickstart-redqueen" class="docs-button-secondary">Quickstart →</a></div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">🎩 Hatter's Tea Party</div>
    <div class="docs-copy">The other governance modality — upstream of code. OKR → research → PRD → code design, all audit-chained.</div>
    <div class="docs-copy"><a href="/docs/hatters-tea-party" class="docs-button-secondary">Tea Party →</a></div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">Vision overview</div>
    <div class="docs-copy">The full agentic governed SDLC — both modalities + the Looking Glass substrate that hosts them.</div>
    <div class="docs-copy"><a href="/docs/agentic-sdlc-governance" class="docs-button-secondary">Read the vision →</a></div>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-heading">Workshop Part 7</div>
    <div class="docs-copy">90-minute hands-on workshop installing the Red Queen on a real BAR. Watch a PreToolUse hook block before it fires; promote Golden Rule 6 from advisory to deterministic.</div>
    <div class="docs-copy"><a href="/docs/workshop/part7-red-queens-court" class="docs-button-secondary">Workshop →</a></div>
  </div>
</div>

---

<div class="docs-hero-flourish">
  <em>"Speak when you're spoken to."</em>
  <br/><small>— the Red Queen</small>
</div>
