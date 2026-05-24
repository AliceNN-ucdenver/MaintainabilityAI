<div class="docs-hero docs-hero-split docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/hat.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><span>Hatter's Tea Party</span></div>
    <div class="docs-eyebrow">Vision · In Development <span class="docs-hero-meta">~14 min read</span></div>
    <h1 class="docs-hero-title">The Hatter's Tea Party</h1>
    <p class="docs-hero-copy">
      The Hatter is the chain signer. The agents around the table turn a one-line objective into evidence-grounded research, an expert-refined product spec, and a code-grounded design. Every artifact is signed by the agent that produced it, with an ephemeral key only that session ever held. The chain verifies end to end, from objective to merged pull request.
    </p>
    <p class="docs-hero-copy">
      <strong>One signed audit trail per OKR. One human gate per phase. Zero credential reissuance between agents.</strong> Trust earned, not granted.
    </p>
    <div class="docs-actions">
      <a href="/docs/red-queens-court" class="docs-button-secondary">Meet the Red Queen</a>
      <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/agentic-sdlc.md" class="docs-button-primary">Read the design (v4)</a>
    </div>
  </div>
  <figure class="docs-hero-figure">
    <img src="/images/tea-party.png" alt="The Hatter's Tea Party — host of governed intent" class="docs-hero-art" />
    <figcaption class="docs-visual-caption">The Hatter hosts the tea party of governed intent. Six teacups. One signed chain. No riddles.</figcaption>
  </figure>
</div>

---

## Two visions, one governed pipeline

The Red Queen (the chess piece, not the Queen of Hearts) runs the board. In Lewis Carroll's *Through the Looking-Glass* she famously says **"it takes all the running you can do, to keep in the same place"**: every piece must obey strict rules of movement or the game collapses. That's the right metaphor for the enforcement layer. She is the deterministic policy engine that **denies the wrong architectural action before it happens**: CALM flow constraints, security-critical paths, restricted-tier locks. The rails that make sure agent-generated code does not slip past governance.

But enforcement at the moment a PR opens is the *last* line of defense. The richer governance question is upstream:

> **Was the work the agent did even the right work?**
> Was the research grounded? Was the PRD anchored in the threat model? Was the design grounded in the actual code? Who approved each step, with what rationale?

That's the **Hatter's Tea Party.** Six guests around the table (the OKR, the four research oracles, the PRD, the code design) and a host (the Mad Hatter himself, in our metaphor: the orchestration layer) making sure every cup gets filled in the right order, with the right tea, and the right scoring. When the tea party ends well, the Red Queen has very little to deny. The agents arrive at her gate carrying provenance, not surprises.

<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="twoVisBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="twoVisArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
  </defs>
  <rect width="800" height="280" rx="12" fill="url(#twoVisBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">TWO VISIONS — ONE PIPELINE</text>
  <!-- Hatter's Tea Party (left) -->
  <rect x="30" y="50" width="320" height="190" rx="10" fill="rgba(165,180,252,0.06)" stroke="rgba(165,180,252,0.35)"/>
  <text x="190" y="76" text-anchor="middle" fill="#c4b5fd" font-size="13" font-weight="700" font-family="system-ui, sans-serif">Hatter's Tea Party</text>
  <text x="190" y="94" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Plans the work — governs intent upstream</text>
  <rect x="50" y="110" width="280" height="22" rx="6" fill="rgba(165,180,252,0.12)" stroke="rgba(165,180,252,0.3)"/>
  <text x="190" y="125" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">OKR → Market Research (4 oracles + JTBD)</text>
  <rect x="50" y="138" width="280" height="22" rx="6" fill="rgba(165,180,252,0.12)" stroke="rgba(165,180,252,0.3)"/>
  <text x="190" y="153" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">PRD (ask-experts — mesh-grounded gate)</text>
  <rect x="50" y="166" width="280" height="22" rx="6" fill="rgba(165,180,252,0.12)" stroke="rgba(165,180,252,0.3)"/>
  <text x="190" y="181" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">Code Design (code-grounded — the heavy gate)</text>
  <rect x="50" y="194" width="280" height="22" rx="6" fill="rgba(165,180,252,0.12)" stroke="rgba(165,180,252,0.3)"/>
  <text x="190" y="209" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">Per-repo issue fan-out (hand-off)</text>
  <text x="190" y="228" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Every step writes a Hatter's Tag</text>
  <!-- Bridge -->
  <line x1="350" y1="145" x2="450" y2="145" stroke="#a5b4fc" stroke-width="2" stroke-dasharray="6" marker-end="url(#twoVisArrow)"/>
  <text x="400" y="135" text-anchor="middle" fill="#a5b4fc" font-size="9" font-weight="600" letter-spacing="1" font-family="system-ui, sans-serif">HAND-OFF</text>
  <text x="400" y="160" text-anchor="middle" fill="#64748b" font-size="8" font-family="system-ui, sans-serif">audit-chained provenance</text>
  <!-- Red Queen (right) -->
  <rect x="450" y="50" width="320" height="190" rx="10" fill="rgba(244,114,182,0.06)" stroke="rgba(244,114,182,0.35)"/>
  <text x="610" y="76" text-anchor="middle" fill="#f9a8d4" font-size="13" font-weight="700" font-family="system-ui, sans-serif">The Red Queen</text>
  <text x="610" y="94" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Enforces in code — governs action downstream</text>
  <rect x="470" y="110" width="280" height="22" rx="6" fill="rgba(244,114,182,0.12)" stroke="rgba(244,114,182,0.3)"/>
  <text x="610" y="125" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">validate_action (MCP, deterministic)</text>
  <rect x="470" y="138" width="280" height="22" rx="6" fill="rgba(244,114,182,0.12)" stroke="rgba(244,114,182,0.3)"/>
  <text x="610" y="153" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">CALM flow constraints</text>
  <rect x="470" y="166" width="280" height="22" rx="6" fill="rgba(244,114,182,0.12)" stroke="rgba(244,114,182,0.3)"/>
  <text x="610" y="181" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">Permission tiers · path controls</text>
  <rect x="470" y="194" width="280" height="22" rx="6" fill="rgba(244,114,182,0.12)" stroke="rgba(244,114,182,0.3)"/>
  <text x="610" y="209" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">Interface-contract diff gate</text>
  <text x="610" y="228" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">"Allow / Conditional / Deny"</text>
  <!-- Footer phrase -->
  <rect x="200" y="252" width="400" height="22" rx="11" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
  <text x="400" y="267" text-anchor="middle" fill="#a5b4fc" font-size="10" font-weight="700" font-family="system-ui, sans-serif">If the Hatter does the work, the Red Queen rarely has to deny.</text>
</svg>

The two are **complementary, not competing.** The Hatter governs intent (the planning agents, on the Looking Glass side). The Red Queen governs action (the coding agents, in each code repo). The hand-off between them is the per-repo issue write that ends the Looking-Glass-side pipeline. That's the moment intent becomes implementation work.

---

## The journey: one OKR, five stages, one audit chain

Everything flows from a single anchor: an **OKR** (Objectives + Key Results, in the BTABoK card pattern). The OKR carries the **intent cascade** (Org → Role → Developer → User) so every downstream artifact can be traced back to a strategic outcome.

<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="journeyBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="journeyArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
  </defs>
  <rect width="800" height="280" rx="12" fill="url(#journeyBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">FIVE STAGES — ONE AUDIT CHAIN</text>
  <!-- Stages -->
  <!-- 1. OKR -->
  <rect x="20" y="60" width="140" height="120" rx="10" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.4)"/>
  <text x="90" y="80" text-anchor="middle" fill="#a5b4fc" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">1 · INTENT</text>
  <text x="90" y="105" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700" font-family="system-ui, sans-serif">OKR</text>
  <text x="90" y="125" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Objective</text>
  <text x="90" y="138" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Key Results</text>
  <text x="90" y="151" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Intent cascade</text>
  <text x="90" y="166" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">(Org→Role→Dev→User)</text>
  <!-- 2. Why -->
  <rect x="178" y="60" width="140" height="120" rx="10" fill="rgba(125,211,252,0.10)" stroke="rgba(125,211,252,0.4)"/>
  <text x="248" y="80" text-anchor="middle" fill="#7dd3fc" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">2 · WHY</text>
  <text x="248" y="105" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700" font-family="system-ui, sans-serif">Research</text>
  <text x="248" y="125" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Tavily · arXiv</text>
  <text x="248" y="138" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">USPTO · HN</text>
  <text x="248" y="151" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">JTBD · gap loop</text>
  <text x="248" y="166" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Hatter-tagged</text>
  <!-- 3. How -->
  <rect x="336" y="60" width="140" height="120" rx="10" fill="rgba(110,231,183,0.10)" stroke="rgba(110,231,183,0.4)"/>
  <text x="406" y="80" text-anchor="middle" fill="#6ee7b7" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">3 · HOW</text>
  <text x="406" y="105" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700" font-family="system-ui, sans-serif">PRD</text>
  <text x="406" y="125" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">ask-experts</text>
  <text x="406" y="138" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">FR · NFR · SR</text>
  <text x="406" y="151" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Mesh-grounded gate</text>
  <text x="406" y="166" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">(arch · sec score)</text>
  <!-- 4. What -->
  <rect x="494" y="60" width="140" height="120" rx="10" fill="rgba(252,211,77,0.10)" stroke="rgba(252,211,77,0.4)"/>
  <text x="564" y="80" text-anchor="middle" fill="#fcd34d" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">4 · WHAT</text>
  <text x="564" y="105" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700" font-family="system-ui, sans-serif">Code Design</text>
  <text x="564" y="125" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">PRD + cloned repos</text>
  <text x="564" y="138" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">CALM drift · OWASP</text>
  <text x="564" y="151" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Contract diffs</text>
  <text x="564" y="166" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="700" font-family="system-ui, sans-serif">HEAVY GATE</text>
  <!-- 5. Fan-out -->
  <rect x="652" y="60" width="140" height="120" rx="10" fill="rgba(244,114,182,0.10)" stroke="rgba(244,114,182,0.4)"/>
  <text x="722" y="80" text-anchor="middle" fill="#f9a8d4" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">5 · HAND-OFF</text>
  <text x="722" y="105" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700" font-family="system-ui, sans-serif">Fan-out</text>
  <text x="722" y="125" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Per-repo issue</text>
  <text x="722" y="138" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">writes (no LLM)</text>
  <text x="722" y="151" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Coding agents</text>
  <text x="722" y="166" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">↳ Red Queen</text>
  <!-- Arrows between stages -->
  <line x1="160" y1="120" x2="178" y2="120" stroke="#a5b4fc" stroke-width="2" marker-end="url(#journeyArrow)"/>
  <line x1="318" y1="120" x2="336" y2="120" stroke="#a5b4fc" stroke-width="2" marker-end="url(#journeyArrow)"/>
  <line x1="476" y1="120" x2="494" y2="120" stroke="#a5b4fc" stroke-width="2" marker-end="url(#journeyArrow)"/>
  <line x1="634" y1="120" x2="652" y2="120" stroke="#a5b4fc" stroke-width="2" marker-end="url(#journeyArrow)"/>
  <!-- Audit chain band -->
  <rect x="20" y="208" width="772" height="32" rx="6" fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.3)"/>
  <text x="406" y="228" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Hatter's Tag chain — intent_thread_uuid links every artifact, every reviewer, every prompt SHA</text>
  <!-- Bottom callout -->
  <text x="406" y="262" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui, sans-serif">One zip Audit Report exports the entire chain — KR → Finding → FR/SR → Design element → Code PR</text>
</svg>

The five stages are the chapters of the audit story. Every chapter writes a **Hatter's Tag**: a structured provenance record carrying the author agent's DID, model version, prompt-pack SHA, threat-model reference, reviewer DIDs, CALM nodes touched, OWASP categories, fitness results, scores, rationale. The chain ladder is what an auditor reads.

> 🍵 **How the audit chain gets built.** The chain that runs alongside this whole journey has three kinds of authors, and exactly three. The **runtime** records what the agent did (every skill call lands in the chain automatically, before the result returns to the agent). The **workflow** records what GitHub state shows (file changes, label flips, reviewer approvals; anything the workflow can recompute from the repo). The **agent** signs its own judgments (the review verdicts and gap-loop intent that only the agent can produce). Each kind of event has exactly one legitimate source. If the wrong author tries to emit something, the verifier rejects the chain. That separation is what makes the story a reviewer reads six months later trustworthy: the agent cannot get fabricated facts accepted, and the workflow cannot fake a judgment.

---

## Stage 1 · Intent: the OKR that started it all

An OKR card is **declarative intent that travels with the work.** It is not a Jira ticket. It is a single source of truth that every downstream agent reads at the start of its run.

The intent cascade (**Org → Role → Developer → User**) is the Court Hierarchy from the governance roadmap. Lower layers may only *narrow* the intent above them, never broaden. If the User-level intent ever drifts from the Org-level intent, the **White Rabbit's Pocket Watch** (a goal-drift gate at each phase boundary) catches it before merge.

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">Objective</div>
    <div class="docs-copy">One sentence. Ambitious. Aligned with platform strategy. E.g. <em>"Add celebrity profile API to IMDB-Lite, without introducing licensing or identity-disambiguation risk."</em></div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">Key Results</div>
    <div class="docs-copy">3–5 SMART metrics. <code>Identity-disambiguation false-merge &lt; 0.5%</code>. <code>Licensing-compliance audit 100%</code>. <code>p95 fetch &lt; 200ms</code>. Each KR gets a row in the final traceability matrix.</div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">Intent cascade</div>
    <div class="docs-copy">Org, Role, Developer, User. Pre-filled at scaffold time for the workshop's IMDB sample; learners edit to match their context.</div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">Affected BARs</div>
    <div class="docs-copy">Which Business Application Repositories does this touch? The OKR derives the <strong>governance tier</strong> from the highest-risk BAR's pillar scores. Restricted-tier BAR = heaviest gates.</div>
  </div>
</div>

This is also where the **two-tier example** becomes concrete. IMDB-Lite ships with two BARs: **`APP-IMDB-001` (Lite App, Supervised)** and **`APP-IMDB-002` (Celebs, Restricted)**. Any OKR that touches Celebs runs into the harder governance gates. The workshop's central learning moment is feeling that wall, building the missing governance, and watching the gates unlock.

---

## Stage 2 · Why: four independent sources of evidence, checked against itself

Most "AI research" is a single web search and a summary. That's not research — that's a one-source brief. Build a product spec on top of it and the spec inherits whatever was wrong or missing in that single source.

This stage does the opposite. It pulls from **four independent kinds of evidence** in parallel — what the web is saying about the topic right now, what academic researchers have proven, what's been patented (the incumbent IP landscape), and what working developers complain about — and adds a fifth lens that asks **what the customer is actually trying to get done**. Then it grades its own coverage and runs one more targeted sweep if anything looks thin.

> 🔍 **Real evidence, not summary stats.** Every oracle hit (provider, query, title, URL, snippet) lands in the audit chain — up to 25 hits per skill_call. A reviewer who wants to verify that source citation `S-3` resolves to an actual arXiv paper or Tavily result can read the chain payload directly; there's no "trust the agent that it cited a real source" gap. The chain is the evidence.

> 🍵 **A second research mode is on the roadmap — codebase archaeology.** When the team wants to model what their *actual code* does (not what the world says about a topic), an archaeology mode reads the impacted repositories with a polyglot parser and extracts an *observed architecture* — modules, layers, cross-module calls, exposed interfaces. The same chain-of-evidence rigor applies: every claim about the code traces back to a parser event, every gap surfaces a targeted follow-up. This is a future capability — today the WHY phase is web-evidence only — but the design is reserved so the planning layer can ground itself in *what is*, not just *what the world says about what could be*.

<svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="researchBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <radialGradient id="researchCenter" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(165,180,252,0.30)"/>
      <stop offset="100%" stop-color="rgba(165,180,252,0.05)"/>
    </radialGradient>
    <marker id="researchArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
    <marker id="researchLoop" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#fcd34d"/>
    </marker>
  </defs>
  <rect width="800" height="380" rx="12" fill="url(#researchBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">MARKET RESEARCH — FOUR ORACLES + JTBD + GAP LOOP</text>
  <!-- Center: agent reasoning -->
  <circle cx="400" cy="200" r="90" fill="url(#researchCenter)" stroke="rgba(165,180,252,0.5)" stroke-width="1.5"/>
  <text x="400" y="180" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700" font-family="system-ui, sans-serif">market-research</text>
  <text x="400" y="196" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="700" font-family="system-ui, sans-serif">agent</text>
  <text x="400" y="217" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">reads OKR · plans</text>
  <text x="400" y="229" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">queries · synthesizes</text>
  <text x="400" y="245" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">(its own Copilot model)</text>
  <!-- 4 oracles + JTBD around the center -->
  <!-- Tavily (top-left) -->
  <rect x="40" y="60" width="180" height="76" rx="10" fill="rgba(125,211,252,0.12)" stroke="rgba(125,211,252,0.4)"/>
  <text x="130" y="82" text-anchor="middle" fill="#7dd3fc" font-size="12" font-weight="700" font-family="system-ui, sans-serif">🌐 Tavily — Web</text>
  <text x="130" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">What's being said today</text>
  <text x="130" y="115" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">trade press · vendor docs</text>
  <text x="130" y="128" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">regulatory guidance</text>
  <line x1="219" y1="120" x2="312" y2="170" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#researchArrow)"/>
  <!-- arXiv (top-right) -->
  <rect x="580" y="60" width="180" height="76" rx="10" fill="rgba(110,231,183,0.12)" stroke="rgba(110,231,183,0.4)"/>
  <text x="670" y="82" text-anchor="middle" fill="#6ee7b7" font-size="12" font-weight="700" font-family="system-ui, sans-serif">📚 arXiv — Academic</text>
  <text x="670" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">What researchers found</text>
  <text x="670" y="115" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">peer-reviewed methods</text>
  <text x="670" y="128" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">benchmarks · proofs</text>
  <line x1="580" y1="120" x2="488" y2="170" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#researchArrow)"/>
  <!-- USPTO (bottom-left) -->
  <rect x="40" y="264" width="180" height="76" rx="10" fill="rgba(252,211,77,0.12)" stroke="rgba(252,211,77,0.4)"/>
  <text x="130" y="286" text-anchor="middle" fill="#fcd34d" font-size="12" font-weight="700" font-family="system-ui, sans-serif">📜 USPTO — Patents</text>
  <text x="130" y="304" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">What's been invented</text>
  <text x="130" y="319" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">incumbent IP landscape</text>
  <text x="130" y="332" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">whitespace opportunities</text>
  <line x1="219" y1="280" x2="312" y2="230" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#researchArrow)"/>
  <!-- Hacker News (bottom-right) -->
  <rect x="580" y="264" width="180" height="76" rx="10" fill="rgba(251,146,60,0.12)" stroke="rgba(251,146,60,0.4)"/>
  <text x="670" y="286" text-anchor="middle" fill="#fb923c" font-size="12" font-weight="700" font-family="system-ui, sans-serif">🧑‍💻 HN — Community</text>
  <text x="670" y="304" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">What devs complain about</text>
  <text x="670" y="319" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">real-world pain points</text>
  <text x="670" y="332" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">working code · workarounds</text>
  <line x1="580" y1="280" x2="488" y2="230" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#researchArrow)"/>
  <!-- JTBD (top center) -->
  <rect x="310" y="40" width="180" height="60" rx="10" fill="rgba(196,181,253,0.12)" stroke="rgba(196,181,253,0.4)"/>
  <text x="400" y="62" text-anchor="middle" fill="#c4b5fd" font-size="12" font-weight="700" font-family="system-ui, sans-serif">🎯 JTBD — Customer jobs</text>
  <text x="400" y="80" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">What the user is hiring</text>
  <text x="400" y="93" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">the product to do</text>
  <line x1="400" y1="100" x2="400" y2="110" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#researchArrow)"/>
  <!-- Gap-refinement loop (right side curving back) -->
  <path d="M 490 200 Q 620 200, 620 210 Q 620 220, 590 220 Q 560 220, 540 200" fill="none" stroke="#fcd34d" stroke-width="1.5" stroke-dasharray="4"/>
  <path d="M 540 200 L 530 195 M 540 200 L 530 205" stroke="#fcd34d" stroke-width="1.5" fill="none"/>
  <text x="620" y="195" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">GAP REFINEMENT</text>
  <text x="620" y="232" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">low diversity?</text>
  <text x="620" y="244" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">contradiction?</text>
  <text x="620" y="256" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">topic uncovered?</text>
  <text x="620" y="268" text-anchor="middle" fill="#fcd34d" font-size="8" font-style="italic" font-family="system-ui, sans-serif">3 follow-up queries</text>
  <!-- Output -->
  <rect x="280" y="346" width="240" height="22" rx="11" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)"/>
  <text x="400" y="361" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">10-section research doc — every claim cites S[N]</text>
</svg>

### What the system does

**The agent reads the business context before it searches anything.** Before the first query is sent, it loads the objective, the success metrics, the strategy chain that links the objective from org leadership down to the end user, and the company's existing record of architecture, known security threats, and prior research on adjacent topics. From that grounding it writes search queries that are tailored to each source — a query that works on a general-purpose web search engine is useless on a patent database, and a casual phrasing that gets results on a developer forum gets ignored by an academic index. The system enforces this with worked examples baked into the prompt, so the agent can't drift into the vague phrasing that wastes a research budget without producing anything useful.

**Then it grades its own coverage.** After the first sweep of all five lenses, the agent asks three questions of the results: is there a finding that only one source supports? Are two sources contradicting each other? Is there a topic the original brief mentioned that came back with no evidence at all? If any answer is yes, the agent runs **one bounded follow-up sweep** — up to three additional queries, targeted at exactly the gap that prompted them, and only the lens where that gap exists. The bound is hard: one follow-up sweep, not a recursive loop. We tried unbounded loops in prototyping; they multiplied the cost without changing the conclusions. If coverage is still thin after the follow-up, the agent doesn't paper it over — it writes the unresolved gap out plainly in a section called **Evidence Gaps**, which the next stage inherits and a reviewer can challenge.

**The output is a structured research document with ten required sections** — an executive summary, a comparison across sources, an evidence-gaps list, a customer-needs analysis, a patent landscape, a whitespace map, formal conclusions with confidence ratings, and recommendations — and every claim in the document carries a tag pointing back to the source it came from. The next stage (the product spec) traces individual requirements back to specific source tags. There's no path for an unsupported claim to launder its way into the design.

### How it's guarded

The Why stage has no human-style reviewer because research is descriptive, not a design decision — there's no "architect's call" to grade. Instead the merge gate is mechanical: before the document can advance, the system independently confirms four things.

| Check | What it confirms |
|---|---|
| **The agent actually searched** | The run's activity log shows successful calls to each evidence source — not a silent fall-back to reading already-committed files |
| **The document is structurally complete** | All ten required sections are present, in the canonical order |
| **Every claim is sourced** | Every formal conclusion in the document cites at least one of the evidence tags |
| **The synthesis is on-topic** | The document's executive summary is semantically close to the original objective (a comparison based on meaning, not just shared keywords — catches an agent that drifted onto an adjacent topic) |

Only when all four pass does the system apply the green-flag label that unlocks merge. If any fail, it applies a specific failure label naming exactly which check failed, so a reviewer knows where to look. The repository's branch protection refuses merges without the green flag, so the gate is structural, not procedural.

### Why the audit is trustworthy

Three things happen automatically during every run, and together they make the result self-auditing — no separate process needs to "keep notes."

**1. The document carries its own receipt.** The artifact ships with a small block of metadata at the top — the objective it belongs to, the unique run identifier, the agent that produced it, and what mode it was in (was this a live search, or did it reuse already-known evidence?). The same block also appears in the pull-request description so reviewers see it without opening the file. If the document gets moved, copied, or quoted out of context six months later, the receipt is still attached.

**2. The activity log is tamper-evident — and we re-verify it before every merge.** Every search the agent ran, every analysis step it took, is recorded as a sequence of entries chained together by cryptographic hashes — each entry references the hash of the one before it. The same trick that secures a blockchain. You can't quietly edit an earlier entry without breaking every entry that follows, and the break is detectable. We don't just *trust* the chain exists — before any pull request can merge, an independent verification step replays the chain end-to-end and recomputes every hash. If the math doesn't balance — including the case where an agent tries to bypass the proper logging tool and hand-writes entries to look compliant — the merge refuses with a `chain-forgery-detected` label. The record proves itself, and the proof runs automatically on every audit.

**Knight's Seal — per-event, per-epoch cryptographic signatures on the chain (shipped).** Each agent session generates its own ephemeral Ed25519 signing key (one keypair per "signer epoch": the original agent invocation is epoch 1, the first revise-agent is epoch 2, and so on). Every event the agent emits is signed with that session's key; the public key is committed to the mesh as `audit/keys/<runId>.epoch-N.pub.pem`; the private key is destroyed when the session ends. The audit-and-drift workflow invokes the runner's own `audit-verify-chain` skill on every PR — same code path the runner uses to write the chain — which loads all epoch public keys and cryptographically verifies each agent event against the right one. Looking Glass shows a *"🛡 Sealed"* badge on each phase card when verification passes; if anyone tampers with the artifact or the chain after the run finishes, the badge flips and the merge refuses. **The next act:** cosign / sigstore-anchored persistent signing so a third-party auditor can verify a year-old artifact without trusting the public keys embedded in the audit log itself.

**3. The audit IS the merge gate.** It isn't a side report someone has to remember to file. When a reviewer clicks **Run audit** in Looking Glass, the system inspects the run end-to-end and posts a replaceable summary comment on the pull request — what was searched, what was found, whether the document is structurally complete, whether the synthesis stayed on topic, **whether the activity-log chain still verifies**, **whether the Knight's Seal signature is intact**. Pass everything → green-flag label → merge unlocks. Fail anything → specific failure label naming the cause + the same comment showing where to look.

For a CIO walking into a regulator meeting: every research artifact that ships under this pipeline can be traced to the queries that produced it, the sources those queries returned, and a tamper-evident log of the whole run — all without anyone having to remember to take minutes.

---

## Stage 3 · How: the product spec, with every requirement tied to a real constraint

Stage 2 produced research. Stage 3 turns that research into a **Product Requirements Document** — the spec the team will build from. Asking an AI to "write a PRD" the naive way is how teams end up with requirements that look plausible but don't match the system they actually have and that nobody can trace back to a real constraint. Stage 3 won't let that happen.

It does three things the naive approach doesn't.

**It reads everything that matters before writing anything.** Before the first requirement is drafted, the agent loads the objective, the research document from Stage 2, every business system the objective touches, the architectural decisions already on record for those systems, the known security threats they face, and the company's quality standards (latency targets, availability commitments, that kind of thing). Nothing in the spec can be made up — the agent is required to cite the source of every claim, and the system rejects the spec if any citation is missing.

**Every requirement is traceable in both directions.** Each feature requirement carries a tag pointing back to the research finding or expert input it came from. Each security requirement carries a tag pointing to a known threat from the industry-standard catalogs (STRIDE for threat categorization, OWASP for application-security risks, NIST for control families). The downstream audit doesn't take the agent's word for it — it walks every requirement and rejects the document if any tag is missing or unresolvable.

**The agent then critiques its own draft, twice, from different angles.** This is the part that changed recently and is worth explaining clearly.

<svg viewBox="0 0 800 360" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="prdBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="prdArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
    <marker id="prdLoop" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#fb923c"/>
    </marker>
  </defs>
  <rect width="800" height="360" rx="12" fill="url(#prdBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#6ee7b7" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">PRD — SELF-CRITIQUED AS ARCHITECT + SECURITY</text>
  <!-- Mesh inputs (left) -->
  <rect x="30" y="60" width="180" height="120" rx="10" fill="rgba(125,211,252,0.10)" stroke="rgba(125,211,252,0.4)"/>
  <text x="120" y="82" text-anchor="middle" fill="#7dd3fc" font-size="12" font-weight="700" font-family="system-ui, sans-serif">Mesh inputs</text>
  <text x="120" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Merged research</text>
  <text x="120" y="115" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">BAR snapshots</text>
  <text x="120" y="130" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">ADRs · Threats</text>
  <text x="120" y="145" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Architecture · Security</text>
  <text x="120" y="160" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Quality standards</text>
  <text x="120" y="174" text-anchor="middle" fill="#7dd3fc" font-size="9" font-style="italic" font-family="system-ui, sans-serif">(no external search)</text>
  <line x1="210" y1="120" x2="260" y2="120" stroke="#a5b4fc" stroke-width="2" marker-end="url(#prdArrow)"/>
  <!-- prd-agent center -->
  <circle cx="345" cy="120" r="65" fill="rgba(110,231,183,0.15)" stroke="rgba(110,231,183,0.4)" stroke-width="1.5"/>
  <text x="345" y="105" text-anchor="middle" fill="#6ee7b7" font-size="12" font-weight="700" font-family="system-ui, sans-serif">prd-agent</text>
  <text x="345" y="122" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="600" font-family="system-ui, sans-serif">First-pass synthesis</text>
  <text x="345" y="138" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">FR-NN · NFR · SR-NN</text>
  <text x="345" y="151" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">bidirectional cites</text>
  <line x1="410" y1="120" x2="445" y2="120" stroke="#a5b4fc" stroke-width="2" marker-end="url(#prdArrow)"/>
  <!-- Self-critique personas (right) -->
  <rect x="450" y="62" width="200" height="50" rx="8" fill="rgba(165,180,252,0.15)" stroke="rgba(165,180,252,0.4)"/>
  <text x="550" y="80" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Architect persona</text>
  <text x="550" y="95" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">CALM coverage · ADR alignment</text>
  <text x="550" y="107" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">fitness-function impact</text>
  <rect x="450" y="120" width="200" height="50" rx="8" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)"/>
  <text x="550" y="138" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Security persona</text>
  <text x="550" y="153" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">STRIDE · OWASP · NIST</text>
  <text x="550" y="165" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">control coverage</text>
  <text x="700" y="98" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">SCORE</text>
  <text x="700" y="111" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">SEVERITY</text>
  <text x="700" y="142" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">COVERED</text>
  <text x="700" y="155" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">MISSING</text>
  <!-- Bounded loop arrow -->
  <path d="M 550 175 Q 550 220, 400 220 Q 290 220, 290 195" fill="none" stroke="#fb923c" stroke-width="2" stroke-dasharray="6" marker-end="url(#prdLoop)"/>
  <text x="400" y="238" text-anchor="middle" fill="#fb923c" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">BOUNDED SELF-CRITIQUE LOOP</text>
  <text x="400" y="252" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Autonomous: up to 3 rounds · Supervised: 2 · Restricted: 0 (human review)</text>
  <text x="400" y="266" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">stops early when both personas return PASS or MINOR with no MISSING items</text>
  <!-- Audit chain row -->
  <rect x="100" y="282" width="600" height="34" rx="6" fill="rgba(196,181,253,0.10)" stroke="rgba(196,181,253,0.3)"/>
  <text x="400" y="297" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700" font-family="system-ui, sans-serif">Every persona critique, every round → one tamper-evident audit event</text>
  <text x="400" y="310" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Architect round 1 · Security round 1 · Architect round 2 · ... (hash-chained alongside synthesis evidence)</text>
  <!-- Output -->
  <rect x="200" y="324" width="400" height="28" rx="8" fill="rgba(74,222,128,0.10)" stroke="rgba(74,222,128,0.3)"/>
  <text x="400" y="343" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" font-family="system-ui, sans-serif">PRD opens as PR · awaits Run Audit · merges to main</text>
</svg>

### Why one agent self-critiques instead of two separate reviewers

An earlier version of this stage ran two extra agents the moment the spec was opened for review — one playing "architect," one playing "security" — to grade it independently. In practice both extra agents were reading the same internal records the original agent had just read. The "independent review" was a re-grade of identical inputs by a differently-named agent. It added latency, doubled the failure surface (two more processes that could time out), and tripled the moving pieces — without changing the quality of the review.

So we collapsed it. The same agent that drafts the spec also critiques it, twice, from different angles:

- **First as an architect** — checking whether the spec aligns with the company's existing architectural decisions, fits the system's quality requirements, and doesn't propose work outside the declared boundaries. Produces a structured verdict: an overall score, a severity (`pass` / `minor` / `major` / `blocking`), what it covered well, what's missing, what should change.
- **Then as a security reviewer** — checking whether every security threat in scope has a corresponding requirement that addresses it, whether industry control categories triggered by the threat model are reflected in the spec. Same structured verdict shape.

If both critiques come back clean (`pass` or `minor` with no missing items), the loop exits. If either flagged gaps, the agent revises the spec and runs both critiques again. **The number of revision rounds is bounded by how much risk the system is willing to accept on automation alone.** A low-risk (Autonomous-tier) initiative gets up to 3 rounds, a medium-risk (Supervised) gets 2, a high-risk (Restricted) gets 0 and ships straight to human review. The agent doesn't decide its own bound. The business system's risk profile does.

Every critique becomes its own entry in the tamper-evident activity log. Round 1 architecture, round 1 security, round 2 architecture, and so on, hash-chained alongside the synthesis evidence. A reviewer walking the log later sees the debate the agent had with itself: what it caught, what it fixed, what it couldn't close. This is the contrarian pressure the old Tweedles design tried to deliver with two separate reviewer agents. The argument that improves the document is real, even though there is no second agent in the room.

The next stage (the code design) starts the same way. Persona-switch self-critique inside the code-design-agent, except the personas read **the actual code** in the target repositories, not just the spec. The contrarian pressure is the same; the evidence surface (actual code) is harder. The old Tweedle reviewer-agent idea was retired as a dispatch model, but its useful contrarian logic lives on here too. The author agent must switch hats, argue against its own design, and sign those review judgments into the audit chain. If future evidence shows this misses code-grounded findings, that becomes a new design review. It is not a current shipped path.

### How it's guarded

The same merge gate pattern as Stage 2 — the pull request stays blocked until the system can independently confirm the evidence, structure, traceability, drift checks, and self-critique outcome.

| Check | What it confirms |
|---|---|
| **The activity log is intact** | The system re-replays the agent's own activity log end-to-end and recomputes the cryptographic chain. If a single entry doesn't match — including the agent fabricating entries it never actually ran — the chain breaks and the merge refuses. This is the gate that survives a misbehaving agent: even if the agent tries to look compliant by hand-writing a clean log, the chain math gives it away |
| **The agent actually consulted the records** | The activity log shows the agent looked up the objective, the research, every affected business system, the relevant architectural decisions, the known threats, and the quality standards. A spec that grounded on nothing is a spec the agent invented |
| **The spec is structurally complete** | All ten required sections are present, in canonical order — problem statement, goals, feature requirements, non-functional requirements, security requirements, coverage analysis, risk matrix, success metrics, references |
| **Every feature requirement traces to a source** | Each feature requirement carries a tag pointing back to a specific research finding or expert input. Missing tags → reject |
| **Every security requirement traces to a known threat** | Each security requirement carries at least one industry-standard category (STRIDE threat id or OWASP risk category). Unbacked security claims → reject |
| **The spec hasn't drifted off the objective** | A meaning-based comparison (not just keyword overlap) between the original objective and the spec's problem statement. Catches an agent that started writing a spec for an adjacent problem |
| **The spec hasn't drifted from the research** | The same meaning-based comparison between the spec's problem statement and the prior-stage research summary. Catches an agent that quietly lost the research findings in translation |
| **The agent's self-critique converged** | The architect and security verdicts from the final round are both `pass` or `minor`. If the agent ran out of revision rounds without converging, the spec ships but flagged for mandatory human review |

When all checks pass, the system applies the green-flag label that unlocks merge. When any check fails, it applies a specific failure label naming exactly which check failed — one label per cause, so a reviewer reads the label and immediately knows where to look:

- **`prd-pass`** — clean, merge unlocked
- **`chain-forgery-detected`** — the activity-log chain didn't replay; an agent's claimed history doesn't match the math
- **`degraded-evidence`** — the agent didn't actually consult the records it claimed to
- **`structure-invalid`** — sections missing, or feature/security requirements missing their source tags
- **`goal-drift-detected`** — the spec drifted off the original objective
- **`caterpillar-drift-detected`** — the spec drifted off the upstream research
- **`self-review-exhausted`** — the agent ran out of revision rounds without resolving the gaps it identified itself

The audit comment posted on the pull request shows exactly what each check found, with the specific score on every meaning-comparison check (so a 0.71 vs a 0.43 isn't ambiguous about how close the spec was to passing).

> 🍵 **This stage is the intent gate, not the implementation gate.** A perfectly grounded spec can still propose something the actual code can't absorb without breaking. That's why the next stage exists.

---

## Stage 4 · What: the code design, grounded in the real repos

This is where the planning agents meet reality. The **code-design-agent** is the last agent on the Looking Glass side, and it produces the artifact that gets the **heaviest scoring** in the pipeline: a cross-cutting code design grounded on the **actual code in every impacted repository**.

Why one cross-cutting design, not per-repo? Because real features cross repo boundaries. An "add the celebrity API" OKR touches `celeb-api` (the new endpoint) **and** `imdb-react-frontend` (the consumer) **and** `imdb-identity` (the auth flow). A per-repo design loses the interface contracts that span them. The cross-cutting design lives in the mesh; **fan-out is automatic after merge** (Stage 5).

<svg viewBox="0 0 800 360" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="codeDesignBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="cdArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
  </defs>
  <rect width="800" height="360" rx="12" fill="url(#codeDesignBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#fcd34d" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">CODE DESIGN — GROUNDED IN ACTUAL CODE — THE HEAVY GATE</text>
  <!-- Inputs (left column) -->
  <rect x="30" y="58" width="180" height="30" rx="6" fill="rgba(110,231,183,0.12)" stroke="rgba(110,231,183,0.35)"/>
  <text x="120" y="78" text-anchor="middle" fill="#6ee7b7" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Merged PRD (FR · SR)</text>
  <rect x="30" y="100" width="180" height="30" rx="6" fill="rgba(125,211,252,0.12)" stroke="rgba(125,211,252,0.35)"/>
  <text x="120" y="120" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">repo: celeb-api</text>
  <rect x="30" y="142" width="180" height="30" rx="6" fill="rgba(125,211,252,0.12)" stroke="rgba(125,211,252,0.35)"/>
  <text x="120" y="162" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">repo: imdb-react-frontend</text>
  <rect x="30" y="184" width="180" height="30" rx="6" fill="rgba(125,211,252,0.12)" stroke="rgba(125,211,252,0.35)"/>
  <text x="120" y="204" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">repo: imdb-identity</text>
  <rect x="30" y="226" width="180" height="30" rx="6" fill="rgba(196,181,253,0.12)" stroke="rgba(196,181,253,0.35)"/>
  <text x="120" y="246" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="600" font-family="system-ui, sans-serif">reference-repos (curated)</text>
  <rect x="30" y="268" width="180" height="30" rx="6" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.35)"/>
  <text x="120" y="288" text-anchor="middle" fill="#d8b4fe" font-size="11" font-weight="600" font-family="system-ui, sans-serif">CALM model · threats · ADRs</text>
  <text x="120" y="316" text-anchor="middle" fill="#64748b" font-size="9" letter-spacing="1" font-family="system-ui, sans-serif">CLONED · INDEXED · READ</text>
  <!-- Center: code-design-agent -->
  <line x1="210" y1="75" x2="252" y2="135" stroke="#a5b4fc" stroke-width="1.2" marker-end="url(#cdArrow)"/>
  <line x1="210" y1="115" x2="252" y2="160" stroke="#a5b4fc" stroke-width="1.2" marker-end="url(#cdArrow)"/>
  <line x1="210" y1="157" x2="252" y2="180" stroke="#a5b4fc" stroke-width="1.2" marker-end="url(#cdArrow)"/>
  <line x1="210" y1="199" x2="252" y2="200" stroke="#a5b4fc" stroke-width="1.2" marker-end="url(#cdArrow)"/>
  <line x1="210" y1="241" x2="252" y2="220" stroke="#a5b4fc" stroke-width="1.2" marker-end="url(#cdArrow)"/>
  <line x1="210" y1="283" x2="252" y2="245" stroke="#a5b4fc" stroke-width="1.2" marker-end="url(#cdArrow)"/>
  <rect x="255" y="120" width="200" height="130" rx="10" fill="rgba(252,211,77,0.10)" stroke="rgba(252,211,77,0.45)"/>
  <text x="355" y="146" text-anchor="middle" fill="#fcd34d" font-size="13" font-weight="700" font-family="system-ui, sans-serif">code-design-agent</text>
  <text x="355" y="166" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">ONE cross-cutting</text>
  <text x="355" y="180" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">code-design.md</text>
  <text x="355" y="200" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Interface contracts</text>
  <text x="355" y="213" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Per-repo change list</text>
  <text x="355" y="226" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Migration · rollback</text>
  <text x="355" y="239" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">addresses: [FR-X, SR-Y]</text>
  <!-- Arrow to reviewers -->
  <line x1="455" y1="185" x2="497" y2="185" stroke="#a5b4fc" stroke-width="2" marker-end="url(#cdArrow)"/>
  <!-- Self-critique personas (right column) — same agent, two persona-switched rounds -->
  <rect x="500" y="98" width="270" height="70" rx="10" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.4)"/>
  <text x="635" y="121" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="700" font-family="system-ui, sans-serif">Architect persona</text>
  <text x="635" y="139" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">code-design/architecture-review prompt pack</text>
  <text x="635" y="154" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">CALM drift · interface contract diffs</text>
  <rect x="500" y="180" width="270" height="70" rx="10" fill="rgba(248,113,113,0.10)" stroke="rgba(248,113,113,0.4)"/>
  <text x="635" y="203" text-anchor="middle" fill="#fca5a5" font-size="12" font-weight="700" font-family="system-ui, sans-serif">Security persona</text>
  <text x="635" y="221" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">code-design/security-review prompt pack</text>
  <text x="635" y="236" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">OWASP scan · threat-model compliance</text>
  <text x="635" y="248" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">against actual repos · code-grounded</text>
  <!-- Code-grounded gate label -->
  <rect x="495" y="262" width="280" height="28" rx="14" fill="rgba(252,211,77,0.15)" stroke="rgba(252,211,77,0.4)" stroke-width="1.5"/>
  <text x="635" y="280" text-anchor="middle" fill="#fcd34d" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">CODE-GROUNDED — implementation gate</text>
  <!-- Outcome -->
  <rect x="200" y="305" width="400" height="38" rx="8" fill="rgba(74,222,128,0.10)" stroke="rgba(74,222,128,0.3)"/>
  <text x="400" y="323" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" font-family="system-ui, sans-serif">okrs/&lt;id&gt;/what/code-design.md merged · Hatter's Tag chain root</text>
  <text x="400" y="338" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Last agent step on the Looking Glass side</text>
</svg>

The code-design-agent runs **different prompt packs** in its two personas than it did at PRD time:

- **`code-design/architecture-review`** (Code-Architect persona-switch inside `code-design-agent`): CALM drift analysis against the indexed code (does the proposed design respect the existing flow graph?), interface contract diffs (`oasdiff` for OpenAPI, `buf` for protobuf, `graphql-inspector` for GraphQL; a contract break in one repo that breaks a consumer in another is caught here, not at a Red Queen gate later), module-boundary respect.
- **`code-design/security-review`** (Code-Security persona-switch inside `code-design-agent`): OWASP pattern scan against the actual code, threat-model compliance check applied to "the code as it will exist after this design." If the design proposes calling a service the threat model doesn't authorize, this is where it dies.

Same self-critique pattern as the PRD stage — **different scoring inputs**. The PRD review asked: *is the intent coherent?* The code-design review asks: *is the intent implementable here, without violating governance?* Both gates use the **bounded recycle loop** (`MAX_AUTO_ROUNDS` per tier). Restricted-tier BAR with a code-grounded security failure here is the most common stopping point, and the workshop's pedagogical sweet spot.

> 📁 **Real code, real reads — not paraphrased guesses.** For every brownfield target repo, the agent clones the repo (`knowledge-code`) AND reads the actual file contents of the entry points it plans to modify (`knowledge-code-read`). Every read auto-emits a `skill_call` event, so the audit chain records exactly which files the agent consulted while writing the design. The workflow then cross-checks every brownfield path the design cites against the cloned repo's file inventory — any path that doesn't exist fails the structural gate with `cited-path-not-in-inventory: <repo> <path>`. Hallucinated file paths land in the audit comment as a failure, not a `design-pass` label.

> 🍵 **This is the final agent step on the Looking Glass side.** When the code-design merges, the Looking Glass-side governance is done. From here it's a workflow (no LLM), then the coding agents in each target repo, on the Red Queen's side.

---

## Stage 5 · The hand-off: per-repo issue fan-out, coding agents take over

The instant the code-design merges, `design-bus.yml` (a workflow, **not** an agent) reads `target_code_repos[]` from the manifest and writes one issue per repo. Each issue lands **in that target code repo** with a canonical body: OKR context, the merged PRD reference, the slice of the code-design relevant to *this* repo, and HTML-comment markers that pin the cross-repo audit thread — `okr_id`, `intent_thread_uuid` (same value across the whole OKR), `parent_intent_thread` (the code-design's run thread), `design_pr_url`. The same `intent_thread_uuid` flows from the OKR Card all the way to each landing issue. The audit chain crosses repositories without breaking.

From here, the coding agents in each repo (Copilot, Claude Code, Cursor, take your pick) pick up the work. They're governed by **The Red Queen** on the code side: `validate_action` MCP calls, CALM flow constraints, security-critical path locks. Each agent's PR opens with its own Hatter's Tag whose `parent_intent_thread` points back to the code-design run — that's what makes the audit chain reconstruct end-to-end, from "the OKR an org leader set" to "the line of code that shipped because of it." That's a different story, told elsewhere. But it doesn't start cold. It starts with provenance.

> 🔐 **Per-epoch signing closes the gap.** Each agent session along the tea-party path (research, product spec, code design, plus any revise round) is its own signer epoch with an ephemeral Ed25519 keypair. The public key is committed to the mesh as `<runId>.epoch-N.pub.pem`; the private key never leaves the session that created it. Every emitted event carries `signer_epoch: N`. Chain verification loads every epoch public key and picks the right one per event. **No credential is ever reissued between agents. The handoff is the signature itself.**

<svg viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="handoffBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="handoffArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
  </defs>
  <rect width="800" height="320" rx="12" fill="url(#handoffBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#f9a8d4" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">HAND-OFF — INTENT BECOMES IMPLEMENTATION</text>
  <!-- Source: code-design.md -->
  <rect x="30" y="120" width="170" height="80" rx="10" fill="rgba(252,211,77,0.10)" stroke="rgba(252,211,77,0.4)"/>
  <text x="115" y="143" text-anchor="middle" fill="#fcd34d" font-size="11" font-weight="700" font-family="system-ui, sans-serif">code-design.md</text>
  <text x="115" y="160" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">merged · scored</text>
  <text x="115" y="175" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Hatter's Tag stamped</text>
  <text x="115" y="190" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">intent_thread_uuid</text>
  <!-- design-bus.yml -->
  <line x1="200" y1="160" x2="232" y2="160" stroke="#a5b4fc" stroke-width="2" marker-end="url(#handoffArrow)"/>
  <rect x="235" y="130" width="160" height="60" rx="10" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.4)"/>
  <text x="315" y="155" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">design-bus.yml</text>
  <text x="315" y="172" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">workflow (no LLM)</text>
  <text x="315" y="184" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">pure fan-out</text>
  <!-- Per-repo issues (right column) -->
  <line x1="395" y1="135" x2="475" y2="80" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#handoffArrow)"/>
  <line x1="395" y1="160" x2="475" y2="160" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#handoffArrow)"/>
  <line x1="395" y1="185" x2="475" y2="240" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#handoffArrow)"/>
  <rect x="480" y="58" width="280" height="50" rx="8" fill="rgba(125,211,252,0.10)" stroke="rgba(125,211,252,0.4)"/>
  <text x="620" y="78" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">issue → celeb-api repo</text>
  <text x="620" y="94" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">slice: §3 entity resolver, §4.1 opt-out</text>
  <rect x="480" y="138" width="280" height="50" rx="8" fill="rgba(125,211,252,0.10)" stroke="rgba(125,211,252,0.4)"/>
  <text x="620" y="158" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">issue → imdb-react-frontend repo</text>
  <text x="620" y="174" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">slice: §2.3 SWR cache, §5 consumer</text>
  <rect x="480" y="218" width="280" height="50" rx="8" fill="rgba(125,211,252,0.10)" stroke="rgba(125,211,252,0.4)"/>
  <text x="620" y="238" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">issue → imdb-identity repo</text>
  <text x="620" y="254" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">slice: §2.1 token scope additions</text>
  <!-- Bottom: red queen takes over -->
  <rect x="160" y="280" width="480" height="28" rx="14" fill="rgba(244,114,182,0.12)" stroke="rgba(244,114,182,0.4)"/>
  <text x="400" y="298" text-anchor="middle" fill="#f9a8d4" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">↳ coding agents pick up · Red Queen governs from here</text>
</svg>

What ends here: the **Looking-Glass-side pipeline**. The Hatter's Tea Party concludes. The audit chain has reached the point where one zip captures everything from Org-level intent to per-repo design decisions, with every reviewer, every prompt SHA, every threat model snapshot, every chain root hash documented inside.

What begins next: the **coding agents** working in each target repo, governed by the Red Queen's `validate_action` MCP gates. That's the *other* story. Read [the Red Queen's Court](/docs/red-queens-court) for the deep dive, or jump straight to the [quickstart](/docs/quickstart-redqueen) to install hooks on a real repo.

---

## Inside the Looking Glass: the OKR detail screen

Looking Glass is the VS Code surface where the Hatter's Tea Party plays out. Every OKR gets a detail screen with three Action cards (Why · How · What) walking the user through the journey, with phase status, reviewer scores, Hatter Tag access, and the audit export button right there. No tab switching. No copy-paste. No "wait, where's the threat model snapshot from when I ran this?"

<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="okrUiBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="okrCardBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(30,41,59,0.95)"/>
      <stop offset="100%" stop-color="rgba(15,23,42,0.95)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="480" rx="12" fill="url(#okrUiBg)"/>
  <!-- Window chrome -->
  <rect x="20" y="20" width="760" height="28" rx="6" fill="rgba(30,41,59,0.7)" stroke="rgba(148,163,184,0.2)"/>
  <circle cx="38" cy="34" r="5" fill="#f87171"/>
  <circle cx="54" cy="34" r="5" fill="#fcd34d"/>
  <circle cx="70" cy="34" r="5" fill="#4ade80"/>
  <text x="92" y="38" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Looking Glass — Platforms / IMDB-Lite / OKR-2026Q1-IMDB-001-celeb-api</text>
  <!-- Header -->
  <rect x="20" y="56" width="760" height="80" rx="8" fill="url(#okrCardBg)" stroke="rgba(165,180,252,0.3)"/>
  <text x="36" y="78" fill="#a5b4fc" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">🎯  OKR-2026Q1-IMDB-001-celeb-api</text>
  <rect x="540" y="68" width="100" height="18" rx="9" fill="rgba(252,211,77,0.15)" stroke="rgba(252,211,77,0.4)"/>
  <text x="590" y="80" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="700" font-family="system-ui, sans-serif">How-Pending</text>
  <rect x="650" y="68" width="120" height="18" rx="9" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)"/>
  <text x="710" y="80" text-anchor="middle" fill="#fca5a5" font-size="9" font-weight="700" font-family="system-ui, sans-serif">⚠ Restricted Tier</text>
  <text x="36" y="104" fill="#e2e8f0" font-size="14" font-weight="700" font-family="system-ui, sans-serif">Add celebrity profile API to IMDB-Lite</text>
  <text x="36" y="124" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Enable IMDB-Lite to surface enriched celebrity profile data without identity-disambiguation or licensing risk.</text>
  <!-- KR strip -->
  <rect x="20" y="146" width="760" height="38" rx="6" fill="rgba(30,41,59,0.55)" stroke="rgba(148,163,184,0.15)"/>
  <text x="36" y="162" fill="#a5b4fc" font-size="9" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">KEY RESULTS</text>
  <text x="36" y="177" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">☐ KR-1  False-merge &lt;0.5%      ☐ KR-2  Licensing audit 100%      ☐ KR-3  p95 fetch &lt;200ms</text>
  <!-- Action cards -->
  <!-- Why card -->
  <!-- Why card (complete) — research signals: sources, refinement, coverage -->
  <rect x="20" y="194" width="246" height="160" rx="8" fill="url(#okrCardBg)" stroke="rgba(74,222,128,0.4)"/>
  <text x="34" y="216" fill="#86efac" font-size="11" font-weight="700" font-family="system-ui, sans-serif">✓ Why  · Research</text>
  <text x="252" y="216" text-anchor="end" fill="#86efac" font-size="9" font-family="system-ui, sans-serif">Rounds 1</text>
  <line x1="34" y1="226" x2="252" y2="226" stroke="rgba(74,222,128,0.2)"/>
  <text x="34" y="240" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Agent:    market-research-agent</text>
  <text x="34" y="253" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Sources:  47 ranked · 4 providers</text>
  <text x="34" y="266" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Refine:   1 gap-loop · 3 follow-ups</text>
  <text x="34" y="279" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Findings: 12 · S1–S38 cited</text>
  <text x="34" y="292" fill="#86efac" font-size="9" font-family="system-ui, sans-serif">Coverage: 3/3 brief topics ✓</text>
  <text x="34" y="305" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Hatter:   chain_root a8c2…</text>
  <rect x="34" y="316" width="80" height="20" rx="4" fill="rgba(165,180,252,0.15)" stroke="rgba(165,180,252,0.3)"/>
  <text x="74" y="330" text-anchor="middle" fill="#a5b4fc" font-size="9" font-family="system-ui, sans-serif">View Tag ↗</text>
  <rect x="120" y="316" width="100" height="20" rx="4" fill="rgba(165,180,252,0.15)" stroke="rgba(165,180,252,0.3)"/>
  <text x="170" y="330" text-anchor="middle" fill="#a5b4fc" font-size="9" font-family="system-ui, sans-serif">Verify Chain ↗</text>
  <!-- How card (blocked) — PRD signals: ask-experts, FR/SR counts, mesh-grounding -->
  <rect x="277" y="194" width="246" height="160" rx="8" fill="url(#okrCardBg)" stroke="rgba(248,113,113,0.4)"/>
  <text x="291" y="216" fill="#fca5a5" font-size="11" font-weight="700" font-family="system-ui, sans-serif">⚠ How · PRD</text>
  <text x="509" y="216" text-anchor="end" fill="#fca5a5" font-size="9" font-family="system-ui, sans-serif">Rounds 1/0</text>
  <line x1="291" y1="226" x2="509" y2="226" stroke="rgba(248,113,113,0.2)"/>
  <text x="291" y="240" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Agent:   prd-agent</text>
  <text x="291" y="253" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Ask-expt: 5 Qs · 5 answered</text>
  <text x="291" y="266" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Reqs:    12 FR · 6 NFR · 4 SR</text>
  <text x="291" y="279" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Mesh-gnd: Arch 78 ✓ · Sec 42 ✗</text>
  <text x="291" y="292" fill="#fca5a5" font-size="9" font-family="system-ui, sans-serif">MISSING: threat-model on Celebs</text>
  <text x="291" y="305" fill="#fca5a5" font-size="9" font-family="system-ui, sans-serif">⛔ Restricted blocks auto-revise</text>
  <rect x="291" y="316" width="100" height="20" rx="4" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="341" y="330" text-anchor="middle" fill="#fcd34d" font-size="9" font-family="system-ui, sans-serif">Escalate BAR</text>
  <rect x="397" y="316" width="106" height="20" rx="4" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="450" y="330" text-anchor="middle" fill="#fca5a5" font-size="9" font-family="system-ui, sans-serif">Human Override</text>
  <!-- What card (gated) — code-design signals: code-grounded reviewers, this is where Arch/Sec scoring lives -->
  <rect x="534" y="194" width="246" height="160" rx="8" fill="url(#okrCardBg)" stroke="rgba(252,211,77,0.4)"/>
  <text x="548" y="216" fill="#fcd34d" font-size="11" font-weight="700" font-family="system-ui, sans-serif">☐ What · Code Design</text>
  <text x="766" y="216" text-anchor="end" fill="#fcd34d" font-size="9" font-family="system-ui, sans-serif">heavy gate</text>
  <line x1="548" y1="226" x2="766" y2="226" stroke="rgba(252,211,77,0.25)"/>
  <text x="548" y="240" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Agent:    code-design-agent</text>
  <text x="548" y="253" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Inputs:   PRD + 3 repos (indexed)</text>
  <text x="548" y="266" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Personas: code-design/arch · code-design/sec</text>
  <text x="548" y="279" fill="#fcd34d" font-size="9" font-family="system-ui, sans-serif">Will score: Arch · Sec (code-grnd)</text>
  <text x="548" y="292" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">          CALM drift · contracts · OWASP</text>
  <text x="548" y="305" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Gated on: How merged</text>
  <text x="548" y="318" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Fan-out → celeb-api · react · identity</text>
  <text x="548" y="335" fill="#fcd34d" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Last Looking-Glass agent step</text>
  <!-- Footer action bar -->
  <rect x="20" y="370" width="760" height="50" rx="8" fill="rgba(30,41,59,0.7)" stroke="rgba(148,163,184,0.2)"/>
  <rect x="40" y="384" width="180" height="22" rx="4" fill="rgba(99,102,241,0.20)" stroke="rgba(99,102,241,0.45)"/>
  <text x="130" y="399" text-anchor="middle" fill="#a5b4fc" font-size="10" font-weight="700" font-family="system-ui, sans-serif">📦 Export Audit Report</text>
  <rect x="232" y="384" width="120" height="22" rx="4" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.3)"/>
  <text x="292" y="399" text-anchor="middle" fill="#a5b4fc" font-size="10" font-family="system-ui, sans-serif">🔍 Verify Chain</text>
  <rect x="364" y="384" width="80" height="22" rx="4" fill="rgba(148,163,184,0.10)" stroke="rgba(148,163,184,0.25)"/>
  <text x="404" y="399" text-anchor="middle" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">⏸ Pause</text>
  <rect x="456" y="384" width="160" height="22" rx="4" fill="rgba(148,163,184,0.10)" stroke="rgba(148,163,184,0.25)"/>
  <text x="536" y="399" text-anchor="middle" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">📂 Open Mesh Folder</text>
  <!-- Caption -->
  <text x="400" y="450" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui, sans-serif">OKR detail — every phase status, score, and Hatter Tag chip lives on one scrolling page.</text>
  <text x="400" y="465" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui, sans-serif">No tab switching. No copy-paste. The audit chain is one click away — at any phase.</text>
</svg>

The screen is **deliberately linear, not tabbed.** Tabs let a user open How without reading Why; the linear page enforces the reading order that matches the audit trail. The "Restricted blocks auto-revise" banner is inline because Restricted-gate context shouldn't require a sub-navigation. Hatter Tag access is one click on every Action card.

**Signals are phase-specific.** Each Action card surfaces what actually matters at that stage, not a generic score column:

- **Why (Research)** shows what the research pipeline actually produced: sources count, refinement loops, findings cited, JTBD/brief-topic coverage. Reviewer scores exist (every PR gets reviewed) but the headline is the evidence base.
- **How (PRD)** shows PRD-specific signals: ask-experts Q&A count, FR/NFR/SR counts, and **mesh-grounding scores** (the PRD-pack reviewers score against CALM/ADRs and STRIDE/OWASP, not against code yet). MISSING items from the reviewers are inline.
- **What (Code Design)** is where the **code-grounded** Architecture and Security scores live. The `code-design-agent` persona-switches through `code-design/architecture-review` + `code-design/security-review` against the actual indexed code repos: CALM drift analysis, interface contract diffs (`oasdiff` / `buf` / `graphql-inspector`), OWASP pattern scan in real code, threat-model compliance applied to code-as-it-will-exist. **This is the heaviest gate** and where "Arch 88 ✓ · Sec 84 ✓" earns its weight.

---

## What the CIO gets — coming in the next act: one zip, one answer

Compliance reviews are slow because the evidence is scattered. The CALM model lives in one place, the threat model in another, the PRD in a Confluence space, the design in a Notion doc, the PR in GitHub, the reviewer comments somewhere in a Slack thread. To answer "how was this built?" an auditor opens six tabs and asks four people for permissions.

> 🪧 **Status note (honest).** The Audit Report Export bundle described below is **coming in the next act of the framework.** It is queued, scoped, and the chain ladder + per-phase artifacts that feed it are already in production today — every piece is linkable and verifiable in place from the Looking Glass right now. The work that remains is the single-bundle export + the redaction layer that ships at the same time. Until then, an internal auditor can already walk the chain artifact-by-artifact in the Looking Glass; the export consolidates that walk into one downloadable.

When it lands, the Audit Report Export will be a **single zip** generated from the OKR detail screen. It will be deterministic: the same OKR plus the same mesh state will produce a byte-identical bundle.

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">README.md</div>
    <div class="docs-copy">The auditor starts here. Quotes the master question, points to every sub-answer's location in the bundle, summarizes chain integrity, tier history, persona-switch convergence (Architect + Security personas in the author agent both PASS), goal-drift, and prompt-pack versions used.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">okr-card.pdf</div>
    <div class="docs-copy">The BTABoK 9-section card rendered as a PDF. The Org → Role → Developer → User intent cascade is right there on page one.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">traceability.html / .csv</div>
    <div class="docs-copy">The headline table: <strong>KR → Research Finding S[N] → PRD FR/SR → Code Design element → Code Repo + PR → Hatter Tag chain root</strong>. Sortable, filterable, deep-linked to GitHub PRs. The CIO's question ("show me from outcome to code") is one column-scroll.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">Per-phase artifacts</div>
    <div class="docs-copy">For each of Why / How / What: the merged markdown, the Hatter's Tag YAML, the CloudEvents JSONL audit log, the chain-verification output, a snapshot of the PR description, the reviewer scores. Frozen at export time.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">Frozen prompt packs</div>
    <div class="docs-copy">Every prompt pack version cited by any Hatter's Tag in the bundle, copied byte-exact. The auditor can reconstruct what the agent was told, not just what it did.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">Threat model + CALM snapshots</div>
    <div class="docs-copy">Per-phase snapshots: what the threat model and architecture model looked like at the moment each phase ran. Catches model drift that would otherwise hide between phases.</div>
  </div>
</div>

This is what closes the **EU AI Act Article 12** requirement (automatic logging, ≥6-month retention, model + inputs + operator + timestamps; deadline 2 August 2026) and what makes **SOC 2 CC8.1** ("prompt as design evidence") demonstrable. It is also what makes incident review survivable. When something ships wrong, the question is no longer "who approved this?" It's "click the OKR. Export the audit. Open the chain ladder."

---

## Why this is the right way to govern AI engineering

Three claims, each falsifiable.

**Claim 1: Governance upstream is cheaper than governance at the gate.** If the Hatter's Tea Party catches a missing threat model on a Restricted-tier BAR during PRD review, the cost is one revision round. If the Red Queen catches the same issue when a coding agent tries to call an unauthorized service, the cost is a half-implemented PR, a rollback, and an incident retrospective. The earlier the gate, the smaller the blast radius.

**Claim 2: Audit chains across repository boundaries are a feature, not a footnote.** Every artifact this pipeline produces carries the same `intent_thread_uuid`. The mesh repo's research doc, the same mesh's PRD, the same mesh's code-design, each target repo's landing issue, each target repo's code PR are all readable as one chain. Microsoft's Agent Governance Toolkit calls this the "reasoning-trace correlation gap." We close it from the OKR forward.

**Claim 3: The right place to put the heavy gate is the code design.** A PRD that's mesh-grounded can still be code-impossible. A design that's code-grounded but mesh-misaligned was already caught by the PRD gate. Only the code-design has both inputs in scope, and only there can the Architect and Security personas (running code-grounded prompt packs against the actual repos) tell you whether what intent demanded is what code can deliver, without breaking what's already there.

> 🎩 **Where this runs.** Every agent in the Hatter's Tea Party runs in **GitHub's hosted Coding Cloud agent** runtime — no agent-orchestration stack to deploy, no inference infra to operate, no third-party model platform required. The mesh is a GitHub repo, the agents are `.github/agents/*.agent.md` files, the gates are GitHub Actions workflows, and the LLM is reached through the Coding Agent's built-in MCP routes. Cost ceiling: a few dollars per OKR pipeline. Onboarding ceiling: one GitHub App install. We considered enterprise inference targets (Azure AI Foundry, self-hosted) and chose not to — the audit chain + threat model are the differentiators, not the runtime, and the value of one-click adoption beats the value of running our own stack.

---

## Where this lives, and where to read next

Everything here is **design**. Implementation is phased; you can track progress inline in the design doc itself (Phase A → E, with checkboxes for every deliverable).

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">Read the full design (v4)</div>
    <div class="docs-copy">The complete agentic SDLC design: OKR schema, agent personas, Hatter's Tag full schema, audit-report bundle structure, deliverables map with status.</div>
    <div class="docs-copy"><a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/agentic-sdlc.md" class="docs-button-secondary">Open on GitHub →</a></div>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-heading">Meet the Red Queen's Court</div>
    <div class="docs-copy">The downstream half of the pipeline. How coding agents are governed at the moment they propose a structural change: three layers, six rails, cross-repo semantic governance.</div>
    <div class="docs-copy"><a href="/docs/red-queens-court" class="docs-button-secondary">Deep dive →</a>&nbsp;&nbsp;<a href="/docs/quickstart-redqueen" class="docs-button-secondary">Quickstart →</a></div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">The full vision</div>
    <div class="docs-copy">Why architecture-first governance is the missing piece. The end-to-end agentic governed SDLC: Looking Glass substrate, Hatter's Tea Party + Red Queen's Court modalities, the 70/30 framing.</div>
    <div class="docs-copy"><a href="/docs/agentic-sdlc-governance" class="docs-button-secondary">Read the vision →</a></div>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-heading">Workshop</div>
    <div class="docs-copy">Eight-part curriculum for teams adopting governed AI engineering. Includes the IMDB-Lite sample where you can run the tea party end-to-end yourself.</div>
    <div class="docs-copy"><a href="/agenda" class="docs-button-secondary">See the agenda →</a></div>
  </div>
</div>

---

<div class="docs-hero-flourish">
  <em>"Have I gone mad?"</em> · <em>"I'm afraid so. You're entirely bonkers. But I'll tell you a secret. All the best people are."</em>
  <br/><small>— Lewis Carroll</small>
</div>
