<div class="docs-hero docs-hero-split docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/hat.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><span>Hatter's Tea Party</span></div>
    <div class="docs-eyebrow">Vision · In Development <span class="docs-hero-meta">~14 min read</span></div>
    <h1 class="docs-hero-title">The Hatter's Tea Party</h1>
    <p class="docs-hero-copy">
      The Hatter hosts the signed planning chain. The agents around the table turn a one-line objective into evidence-grounded research, an expert-refined product spec, and a code-grounded design. Every artifact is signed by the agent that produced it, with an ephemeral key only that session ever held. The chain is stitched end to end: planning events in the governance mesh, implementation events in each target repo, joined at the implementation PR's merge commit SHA.
    </p>
    <p class="docs-hero-copy">
      <strong>A stitched audit trail per OKR. One human gate per phase. Zero credential reissuance between agents.</strong> Trust earned, not granted.
    </p>
    <div class="docs-actions">
      <a href="/docs/red-queens-court" class="docs-button-secondary">Meet the Red Queen</a>
      <a href="/docs/agentic-sdlc-governance" class="docs-button-primary">Read the full governance story</a>
    </div>
    <span class="docs-hero-flourish">&ldquo;No room for unsigned intent.&rdquo;</span>
  </div>
  <figure class="docs-hero-figure">
    <img src="/images/tea-party.png" alt="The Hatter's Tea Party, host of governed intent" class="docs-hero-art" />
    <figcaption class="docs-visual-caption">The Hatter hosts the tea party of governed intent. Six teacups. One stitched chain — signed planning, replayed rails. No riddles.</figcaption>
  </figure>
</div>



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
  <text x="400" y="28" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">TWO VISIONS · ONE PIPELINE</text>
  <!-- Hatter's Tea Party (left) -->
  <rect x="30" y="50" width="320" height="190" rx="10" fill="rgba(165,180,252,0.06)" stroke="rgba(165,180,252,0.35)"/>
  <text x="190" y="76" text-anchor="middle" fill="#c4b5fd" font-size="13" font-weight="700" font-family="system-ui, sans-serif">Hatter's Tea Party</text>
  <text x="190" y="94" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Plans the work · governs intent upstream</text>
  <rect x="50" y="110" width="280" height="22" rx="6" fill="rgba(165,180,252,0.12)" stroke="rgba(165,180,252,0.3)"/>
  <text x="190" y="125" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">OKR → Market Research (4 oracles + JTBD)</text>
  <rect x="50" y="138" width="280" height="22" rx="6" fill="rgba(165,180,252,0.12)" stroke="rgba(165,180,252,0.3)"/>
  <text x="190" y="153" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">PRD (expert review · mesh-grounded gate)</text>
  <rect x="50" y="166" width="280" height="22" rx="6" fill="rgba(165,180,252,0.12)" stroke="rgba(165,180,252,0.3)"/>
  <text x="190" y="181" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">Code Design (implementation readiness)</text>
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
  <text x="610" y="94" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Enforces in code · governs action downstream</text>
  <rect x="470" y="110" width="280" height="22" rx="6" fill="rgba(244,114,182,0.12)" stroke="rgba(244,114,182,0.3)"/>
  <text x="610" y="125" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">deterministic tool checks</text>
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
  <text x="400" y="28" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">FIVE STAGES · ONE AUDIT CHAIN</text>
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
  <text x="564" y="138" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">repo fit · security controls</text>
  <text x="564" y="151" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Contract diffs</text>
  <text x="564" y="166" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="700" font-family="system-ui, sans-serif">READINESS CHECK</text>
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
  <text x="406" y="228" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Hatter's Tag chain · shared audit thread links every artifact and reviewer</text>
  <!-- Bottom callout -->
  <text x="406" y="262" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui, sans-serif">Audit Report Export · one readable closeout per action</text>
</svg>

The five stages are the chapters of the audit story. Every chapter writes a **Hatter's Tag**: a structured provenance record carrying the author agent's DID, model version, prompt-pack SHA, threat-model reference, reviewer DIDs, CALM nodes touched, OWASP categories, fitness results, scores, rationale. The chain ladder is what an auditor reads.

> 🍵 **How the audit chain gets built.** The chain that runs alongside this whole journey has three kinds of authors, and exactly three. The **runtime** records what the agent did (every skill call lands in the chain automatically, before the result returns to the agent). The **workflow** records what GitHub state shows (file changes, label flips, reviewer approvals; anything the workflow can recompute from the repo). The **agent** signs its own judgments (the review verdicts and gap-loop intent that only the agent can produce). Each kind of event has exactly one legitimate source. If the wrong author tries to emit something, the verifier rejects the chain. That separation is what makes the story a reviewer reads six months later trustworthy: the agent cannot get fabricated facts accepted, and the workflow cannot fake a judgment.



## Stage 1 · Intent: the OKR that started it all

An OKR card is **declarative intent that travels with the work.** It is not a Jira ticket. It is a single source of truth that every downstream agent reads at the start of its run.

The intent cascade (**Org → Role → Developer → User**) is the Court Hierarchy from the governance roadmap. Lower layers may only *narrow* the intent above them, never broaden. If the User-level intent ever drifts from the Org-level intent, the **White Rabbit's Pocket Watch** (a goal-drift rail at each phase boundary) catches it. Its drift signal is being upgraded from a brittle absolute-similarity cutoff to a more robust contrastive rank check; that contrastive version runs **advisory while it recalibrates, then blocks merge again** once certified (see the Why-stage guard table below).

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">Objective</div>
    <div class="docs-copy">One sentence. Ambitious. Aligned with platform strategy. E.g. <em>"Add celebrity profile API to IMDB-Lite, without introducing licensing or identity-disambiguation risk."</em></div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">Key Results</div>
    <div class="docs-copy">3-5 SMART metrics. <code>Identity-disambiguation false-merge &lt; 0.5%</code>. <code>Licensing-compliance audit 100%</code>. <code>p95 fetch &lt; 200ms</code>. Each KR gets a row in the final traceability matrix.</div>
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



## Stage 2 · Why: four independent sources of evidence, checked against itself

Most "AI research" is a single web search and a summary. That's not research. It is a one-source brief. Build a product spec on top of it and the spec inherits whatever was wrong or missing in that single source.

This stage does the opposite. It pulls from **four independent kinds of evidence** in parallel: what the web is saying right now, what academic researchers have proven, what's been patented, and what working developers complain about. It adds a fifth lens that asks **what the customer is actually trying to get done**. Then it grades its own coverage and runs one more targeted sweep if anything looks thin.

> 🔍 **Real evidence, not summary stats.** Search events record the provider, query, title, URL, and bounded preview in the audit chain. After dedupe, the runner writes a hash-pinned source registry for the `S[N]` sources the agent is allowed to cite. A reviewer can verify that `S3` resolves to the source the agent actually saw, and the merge gate rejects a research document whose title or URL drifts from that registry. There is no "trust the agent that it cited a real source" gap.

**A second research mode is on the roadmap: codebase archaeology.** When the team wants to model what their actual code does, not what the world says about a topic, archaeology mode will read impacted repositories and extract the observed architecture: modules, layers, cross-module calls, exposed interfaces. Today the WHY phase is web-evidence only. The design is reserved so the planning layer can eventually ground itself in *what is*, not just *what the world says could be*.

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
  <text x="400" y="28" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">MARKET RESEARCH · FOUR ORACLES + JTBD + GAP LOOP</text>
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
  <text x="130" y="82" text-anchor="middle" fill="#7dd3fc" font-size="12" font-weight="700" font-family="system-ui, sans-serif">🌐 Tavily · Web</text>
  <text x="130" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">What's being said today</text>
  <text x="130" y="115" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">trade press · vendor docs</text>
  <text x="130" y="128" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">regulatory guidance</text>
  <line x1="219" y1="120" x2="312" y2="170" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#researchArrow)"/>
  <!-- arXiv (top-right) -->
  <rect x="580" y="60" width="180" height="76" rx="10" fill="rgba(110,231,183,0.12)" stroke="rgba(110,231,183,0.4)"/>
  <text x="670" y="82" text-anchor="middle" fill="#6ee7b7" font-size="12" font-weight="700" font-family="system-ui, sans-serif">📚 arXiv · Academic</text>
  <text x="670" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">What researchers found</text>
  <text x="670" y="115" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">peer-reviewed methods</text>
  <text x="670" y="128" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">benchmarks · proofs</text>
  <line x1="580" y1="120" x2="488" y2="170" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#researchArrow)"/>
  <!-- USPTO (bottom-left) -->
  <rect x="40" y="264" width="180" height="76" rx="10" fill="rgba(252,211,77,0.12)" stroke="rgba(252,211,77,0.4)"/>
  <text x="130" y="286" text-anchor="middle" fill="#fcd34d" font-size="12" font-weight="700" font-family="system-ui, sans-serif">📜 USPTO · Patents</text>
  <text x="130" y="304" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">What's been invented</text>
  <text x="130" y="319" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">incumbent IP landscape</text>
  <text x="130" y="332" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">whitespace opportunities</text>
  <line x1="219" y1="280" x2="312" y2="230" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#researchArrow)"/>
  <!-- Hacker News (bottom-right) -->
  <rect x="580" y="264" width="180" height="76" rx="10" fill="rgba(251,146,60,0.12)" stroke="rgba(251,146,60,0.4)"/>
  <text x="670" y="286" text-anchor="middle" fill="#fb923c" font-size="12" font-weight="700" font-family="system-ui, sans-serif">🧑‍💻 HN · Community</text>
  <text x="670" y="304" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">What devs complain about</text>
  <text x="670" y="319" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">real-world pain points</text>
  <text x="670" y="332" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">working code · workarounds</text>
  <line x1="580" y1="280" x2="488" y2="230" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#researchArrow)"/>
  <!-- JTBD (top center) -->
  <rect x="310" y="40" width="180" height="60" rx="10" fill="rgba(196,181,253,0.12)" stroke="rgba(196,181,253,0.4)"/>
  <text x="400" y="62" text-anchor="middle" fill="#c4b5fd" font-size="12" font-weight="700" font-family="system-ui, sans-serif">🎯 JTBD · Customer jobs</text>
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
  <text x="400" y="361" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">10-section research doc · every claim cites S[N]</text>
</svg>

### What the system does

**The agent reads the business context before it searches anything.** Before the first query is sent, it loads the objective, the success metrics, the strategy chain that links the objective from org leadership down to the end user, and the company's existing record of architecture, known security threats, and prior research on adjacent topics. From that grounding it writes search queries tailored to each source. A query that works on a general-purpose web search engine is useless on a patent database, and casual developer-forum phrasing gets ignored by an academic index. The system enforces this with worked examples, so the agent can't drift into vague phrasing that wastes a research budget.

**Then it grades its own coverage.** After the first sweep of all five lenses, the agent asks three questions of the results: is there a finding that only one source supports? Are two sources contradicting each other? Is there a topic the original brief mentioned that came back with no evidence at all? If any answer is yes, the agent runs **one bounded follow-up sweep**: up to three additional queries, targeted at exactly the gap that prompted them, and only the lens where that gap exists. The bound is hard: one follow-up sweep, not a recursive loop. We tried unbounded loops in prototyping; they multiplied the cost without changing the conclusions. If coverage is still thin after the follow-up, the agent writes the unresolved gap plainly in **Evidence Gaps**, which the next stage inherits and a reviewer can challenge.

**The output is a structured research document with ten required sections**: an executive summary, a comparison across sources, an evidence-gaps list, a customer-needs analysis, a patent landscape, a whitespace map, formal conclusions with confidence ratings, and recommendations. Every claim in the document carries a tag pointing back to the source it came from. The next stage traces individual requirements back to those tags. Unsupported claims have no path into the design.

### How it's guarded

The Why stage has no human-style reviewer because research is descriptive, not a design decision. There is no "architect's call" to grade. Instead the merge gate is mechanical: before the document can advance, the system independently runs **five blocking checks plus two advisory checks** (mission alignment and groundedness).

| Check | What it confirms | Gate |
|---|---|---|
| **The agent actually searched** | The run's activity log shows successful calls to each evidence source, not a silent fall-back to reading already-committed files | blocks |
| **The document is structurally complete** | All ten required sections are present, in the canonical order | blocks |
| **Every claim is sourced** | Every formal conclusion in the document cites at least one evidence tag, and each cited source tag must match the hash-pinned source registry | blocks |
| **The synthesis stays on mission** | The document's mission-bearing parts are compared against its *own* OKR objective **and** the objectives of other active OKRs. It should rank closest to its own mission, not merely clear one global cosine-similarity cutoff. That matters because research prose, PRD prose, and design prose read differently from a one-line objective; rank and margin are more stable than a fixed score. | advisory while the contrastive signal is calibrated; promotes to blocking after cert data |
| **No prompt injection in the evidence** | A local prompt-injection model (Llama Prompt Guard 2) scores the retrieved snippets and the source registry. A crafted "ignore your instructions"-style payload smuggled into a search result hard-fails the merge before it can steer the next stage. A quoted or code-fenced example of an attack is recognized as *discussion*, not an attack | blocks |
| **No PII or secrets leaked in** | A local PII model (Microsoft Presidio) scans the research doc and registry. Contact / identity / secret classes (SSN, card, private email, IP, tokens) hard-fail; public-figure names are allowed and recorded with a redaction summary; an ambiguous case in a sensitive context goes to human review | blocks |
| **Conclusions are grounded in their sources** | A local NLI model pairs each formal conclusion against the source excerpts it cites and checks the claim is actually *entailed* by them — catching a confident conclusion that cites a real source which doesn't support it. Ships **advisory** today (records every conclusion's grounding; not yet blocking) until a cert tunes its thresholds; a source that *contradicts* its claim is the signal it will block on first | advisory |

Only when all five blocking checks pass does the system apply the green-flag label that unlocks merge; the mission-alignment and groundedness checks record their verdicts alongside but do not yet gate. If any blocking check fails, the system applies a specific failure label naming exactly which one, so a reviewer knows where to look. The repository's branch protection refuses merges without the green flag, so the gate is structural, not procedural.

**What Pocket Watch records.** The receipt is not just "similarity passed." It names the slice of the artifact that was checked, the OKR it was supposed to match, the competing OKR that came closest, the rank, the margin, and the legacy cosine score as a logged-only reference. For WHY, the checked slice is the artifact's synthesis surface: executive summary, formal conclusions, recommendations, and the support-claims sidecar when present. That is the part that can drift from the approved objective; the source list and boilerplate do not get to drown out the mission signal.

### Why the audit is trustworthy

Three things happen automatically during every run. Together, they make the result self-auditing. No separate process needs to "keep notes."

**1. The document carries its own receipt.** The artifact ships with a small block of metadata at the top: the objective it belongs to, the unique run identifier, the agent that produced it, and whether this was a live search or reused evidence. The same block also appears in the pull-request description so reviewers see it without opening the file. If the document gets moved, copied, or quoted out of context six months later, the receipt is still attached.

**2. The activity log is tamper-evident, and we re-verify it before every merge.** Every search the agent ran and every analysis step it took is recorded as a sequence of entries chained together by cryptographic hashes. Each entry references the hash of the one before it. You can't quietly edit an earlier entry without breaking every entry that follows, and the break is detectable. Before any pull request can merge, an independent verification step replays the chain end-to-end and recomputes every hash. If the math doesn't balance, including the case where an agent hand-writes entries to look compliant, the merge refuses. The record proves itself, and the proof runs automatically on every audit.

**Knight's Seal proves which agent signed which event.** Each agent session gets its own short-lived signing key. The private key stays inside that session and disappears when the session ends. Every agent judgment is signed by the session that produced it, and the verifier checks those signatures before merge. Looking Glass shows a *"🛡 Sealed"* badge when the chain verifies. If someone edits the artifact or the chain after the run, the badge flips and the merge refuses. **The next act:** external anchoring with cosign / sigstore so a third-party auditor can verify an old artifact without trusting keys stored in the mesh.

**3. The audit is the merge gate.** It isn't a side report someone has to remember to file. When a reviewer clicks **Run audit** in Looking Glass, the system inspects the run end-to-end and posts a replaceable summary comment on the pull request: what was searched, what was found, whether the document is structurally complete, whether the synthesis stayed on topic, whether the activity-log chain still verifies, and whether the Knight's Seal signature is intact. Pass everything and merge unlocks. Fail anything and the PR gets a specific failure label plus the same comment showing where to look.

**4. The evidence itself is checked — and the check can be re-run from the bytes.** Pinning a source proves *where* a citation came from; it doesn't make the *content* safe, and it doesn't prove the source actually *says* what a conclusion claims. The **Oracle & Privacy Rails** close both gaps. External research is untrusted input, so before it enters the chain a deterministic guardrail envelope quarantines unsafe-URL and obviously-poisoned results, a prompt-injection rail (Llama Prompt Guard 2) refuses crafted instructions hidden in a snippet, and a PII rail (Presidio) refuses contact/identity/secret data. A fourth rail goes further — **groundedness**: it pairs every Formal Conclusion against the source excerpts it cites and uses a local NLI model to check the claim is actually *entailed* by the evidence, catching the confident-but-unsupported conclusion the citation check can't see. A claim entailed by any one cited source passes, so legitimate synthesis across multiple sources isn't punished; a source that *contradicts* its claim is the serious signal. (Groundedness ships **advisory** today — recording every conclusion's entailment, not yet blocking — until a cert tunes its thresholds.) These rails are the Hatter-side counterpart to the Red Queen: she governs what an agent may *do* at the tool boundary; the rails govern what evidence may *enter* the planning chain. And the trust model is **replay, not sign** — the closeout re-runs each rail's model and config over the committed bytes and compares to what was recorded at merge. For the enforcing rails (PII, injection) the model is pinned to a specific commit, so the replay is exact and a mismatch fails the rollup; it can never quietly pass. (Groundedness replays too, but its model isn't pinned yet — which is exactly why it stays advisory until the cert pins it.) The same evidence a reviewer saw is what an auditor re-derives later, from the bytes.

For a CIO walking into a regulator meeting: every research artifact that ships under this pipeline can be traced to the queries that produced it, the source registry the agent was allowed to cite, and a tamper-evident log of the whole run. No one has to remember to take minutes.



## Stage 3 · How: the product spec, with every requirement tied to a real constraint

Stage 2 produced research. Stage 3 turns that research into a **Product Requirements Document**: the spec the team will build from. Asking an AI to "write a PRD" the naive way is how teams end up with requirements that look plausible but don't match the system they actually have and that nobody can trace back to a real constraint. Stage 3 won't let that happen.

It does three things the naive approach doesn't.

**It reads everything that matters before writing anything.** Before the first requirement is drafted, the agent loads the objective, the research document from Stage 2, every business system the objective touches, the architectural decisions already on record for those systems, the known security threats they face, and the company's quality standards (latency targets, availability commitments, that kind of thing). Nothing in the spec can be made up. The agent is required to cite the source of every claim, and the system rejects the spec if any citation is missing.

**Every requirement is traceable in both directions.** Each feature requirement carries a tag pointing back to the research finding or expert input it came from. Each security requirement carries a tag pointing to a known threat or control category. The downstream audit doesn't take the agent's word for it. It walks every requirement and rejects the document if any tag is missing or unresolvable.

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
  <text x="400" y="28" text-anchor="middle" fill="#6ee7b7" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">PRD · SELF-CRITIQUED AS ARCHITECT + SECURITY</text>
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

An earlier version of this stage ran two extra agents the moment the spec was opened for review: one playing "architect," one playing "security." In practice both extra agents were reading the same internal records the original agent had just read. The "independent review" was a re-grade of identical inputs by a differently named agent. It added latency, doubled the failure surface, and tripled the moving pieces without changing the quality of the review.

So we collapsed it. The same agent that drafts the spec also critiques it, twice, from different angles:

- **First as an architect:** checking whether the spec aligns with the company's existing architectural decisions, fits the system's quality requirements, and doesn't propose work outside the declared boundaries. Produces a structured verdict: an overall score, severity, what it covered well, what's missing, and what should change.
- **Then as a security reviewer:** checking whether every security threat in scope has a corresponding requirement that addresses it, and whether the threat model is reflected in the spec. Same structured verdict shape.

If both critiques come back clean (`pass` or `minor` with no missing items), the loop exits. If either flagged gaps, the agent revises the spec and runs both critiques again. **The number of revision rounds is bounded by how much risk the system is willing to accept on automation alone.** A low-risk (Autonomous-tier) initiative gets up to 3 rounds, a medium-risk (Supervised) gets 2, a high-risk (Restricted) gets 0 and ships straight to human review. The agent doesn't decide its own bound. The business system's risk profile does.

Every critique becomes its own entry in the tamper-evident activity log. Round 1 architecture, round 1 security, round 2 architecture, and so on, hash-chained alongside the synthesis evidence. A reviewer walking the log later sees the debate the agent had with itself: what it caught, what it fixed, what it couldn't close. This is the contrarian pressure the old Tweedles design tried to deliver with two separate reviewer agents. The argument that improves the document is real, even though there is no second agent in the room.

The next stage (the code design) starts the same way. Persona-switch self-critique inside the code-design-agent, except the personas read **the actual code** in the target repositories, not just the spec. The contrarian pressure is the same; the evidence surface (actual code) is harder. The old Tweedle reviewer-agent idea was retired as a dispatch model, but its useful contrarian logic lives on here too. The author agent must switch hats, argue against its own design, and sign those review judgments into the audit chain. If future evidence shows this misses code-grounded findings, that becomes a new design review. It is not a current shipped path.

### How it's guarded

The same merge gate pattern as Stage 2 applies. The pull request stays blocked until the system can independently confirm the evidence, structure, traceability, cross-phase continuity (the Caterpillar), and self-critique outcome. Objective-alignment drift — the Pocket Watch rail — records advisorily while its contrastive signal recalibrates, then returns to blocking once certified.

| Check | What it confirms |
|---|---|
| **The activity log is intact** | The system replays the agent's own activity log end-to-end and recomputes the cryptographic chain. If a single entry doesn't match, including fabricated entries, the chain breaks and the merge refuses |
| **The agent actually consulted the records** | The activity log shows the agent looked up the objective, the research, every affected business system, the relevant architectural decisions, the known threats, and the quality standards. A spec that grounded on nothing is a spec the agent invented |
| **The spec is structurally complete** | All ten required sections are present, in canonical order |
| **Every feature requirement traces to a source** | Each feature requirement carries a tag pointing back to a specific research finding or expert input. Missing tags → reject |
| **Every security requirement traces to a known threat** | Each security requirement carries at least one industry-standard category (STRIDE threat id or OWASP risk category). Unbacked security claims → reject |
| **The spec stays on its own objective** | The spec's mission-bearing slice is ranked against its *own* OKR objective and the objectives of other active OKRs. For HOW, that slice is `Problem Statement`, `Goals/Non-Goals`, `Functional Requirements`, and `Security Requirements`, not every citation or formatting block. It catches an agent that started writing a spec for an adjacent problem, or another OKR's problem. (The Pocket Watch alignment rail; advisory while its contrastive signal is calibrated, then promotes to blocking.) |
| **The spec hasn't drifted from the research** | A separate cross-phase check (the Caterpillar): a meaning-based comparison between the spec's problem statement and the prior-stage research summary. Catches an agent that quietly lost the research findings in translation |
| **The agent's self-critique converged** | The architect and security verdicts from the final round are both `pass` or `minor`. If the agent ran out of revision rounds without converging, the spec ships but flagged for mandatory human review |

When all checks pass, the system applies the green-flag label that unlocks merge. When a check fails, the PR gets one plain failure label for the class of problem: chain integrity, evidence, structure, research drift (cross-phase), or self-review exhaustion. Objective-alignment drift (Pocket Watch) records advisorily while its contrastive signal recalibrates and does not apply a blocking label during that window; once certified it re-joins the blocking set. The audit comment carries the exact scores and findings, so the reviewer sees both the headline and the place to fix it.

> 🍵 **This stage is the intent gate, not the implementation gate.** A perfectly grounded spec can still propose something the actual code can't absorb without breaking. That's why the next stage exists.



## Stage 4 · What: the code design, grounded in the real repos

This is where the plan stops being theoretical. The agent opens the impacted repositories, reads the files it expects to change, and writes a design that answers a harder question: **can this be built in our actual system without breaking what already exists?**

That is different from a product spec. A PRD can be coherent and still be impossible to absorb safely. The code design has to name the repos touched, the files and interfaces that matter, the security controls that must survive, and the rollback path if the change goes wrong.

Why one cross-cutting design, not one design per repo? Because real features cross boundaries. An "add the celebrity API" OKR touches `celeb-api` (the new endpoint, greenfield), `imdb-react-frontend` (the consumer, brownfield), and the existing auth/RBAC contracts they both inherit. Split that too early and the interface story disappears. The cross-cutting design lives in the mesh; **fan-out is automatic after merge** (Stage 5).

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
  <text x="400" y="28" text-anchor="middle" fill="#fcd34d" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">CODE DESIGN · GROUNDED IN ACTUAL REPOS</text>
  <!-- Inputs (left column) -->
  <rect x="30" y="58" width="180" height="30" rx="6" fill="rgba(110,231,183,0.12)" stroke="rgba(110,231,183,0.35)"/>
  <text x="120" y="78" text-anchor="middle" fill="#6ee7b7" font-size="11" font-weight="600" font-family="system-ui, sans-serif">Merged PRD (FR · SR)</text>
  <rect x="30" y="100" width="180" height="30" rx="6" fill="rgba(125,211,252,0.12)" stroke="rgba(125,211,252,0.35)"/>
  <text x="120" y="120" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">repo: celeb-api</text>
  <rect x="30" y="142" width="180" height="30" rx="6" fill="rgba(125,211,252,0.12)" stroke="rgba(125,211,252,0.35)"/>
  <text x="120" y="162" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">repo: imdb-react-frontend</text>
  <rect x="30" y="184" width="180" height="30" rx="6" fill="rgba(148,163,184,0.10)" stroke="rgba(148,163,184,0.30)" stroke-dasharray="3 3"/>
  <text x="120" y="204" text-anchor="middle" fill="#cbd5e1" font-size="11" font-weight="600" font-family="system-ui, sans-serif">inherited auth contract</text>
  <rect x="30" y="226" width="180" height="30" rx="6" fill="rgba(196,181,253,0.12)" stroke="rgba(196,181,253,0.35)"/>
  <text x="120" y="246" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="600" font-family="system-ui, sans-serif">reference-repos (curated)</text>
  <rect x="30" y="268" width="180" height="30" rx="6" fill="rgba(168,85,247,0.12)" stroke="rgba(168,85,247,0.35)"/>
  <text x="120" y="288" text-anchor="middle" fill="#d8b4fe" font-size="11" font-weight="600" font-family="system-ui, sans-serif">architecture · threats · decisions</text>
  <text x="120" y="316" text-anchor="middle" fill="#64748b" font-size="9" letter-spacing="1" font-family="system-ui, sans-serif">READ FROM REAL REPOS</text>
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
  <text x="355" y="239" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">maps back to requirements</text>
  <!-- Arrow to reviewers -->
  <line x1="455" y1="185" x2="497" y2="185" stroke="#a5b4fc" stroke-width="2" marker-end="url(#cdArrow)"/>
  <!-- Self-critique personas (right column): same agent, two persona-switched rounds -->
  <rect x="500" y="98" width="270" height="70" rx="10" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.4)"/>
  <text x="635" y="121" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="700" font-family="system-ui, sans-serif">Architect persona</text>
  <text x="635" y="139" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">checks system fit</text>
  <text x="635" y="154" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">architecture fit · interface impact</text>
  <rect x="500" y="180" width="270" height="70" rx="10" fill="rgba(248,113,113,0.10)" stroke="rgba(248,113,113,0.4)"/>
  <text x="635" y="203" text-anchor="middle" fill="#fca5a5" font-size="12" font-weight="700" font-family="system-ui, sans-serif">Security persona</text>
  <text x="635" y="221" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">checks control fit</text>
  <text x="635" y="236" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">security controls · threat model</text>
  <text x="635" y="248" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">checked against actual repos</text>
  <!-- Code-grounded gate label -->
  <rect x="495" y="262" width="280" height="28" rx="14" fill="rgba(252,211,77,0.15)" stroke="rgba(252,211,77,0.4)" stroke-width="1.5"/>
  <text x="635" y="280" text-anchor="middle" fill="#fcd34d" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">IMPLEMENTATION-READINESS CHECK</text>
  <!-- Outcome -->
  <rect x="200" y="305" width="400" height="38" rx="8" fill="rgba(74,222,128,0.10)" stroke="rgba(74,222,128,0.3)"/>
  <text x="400" y="323" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" font-family="system-ui, sans-serif">okrs/&lt;id&gt;/what/code-design.md merged · Hatter's Tag chain root</text>
  <text x="400" y="338" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Last agent step on the Looking Glass side</text>
</svg>

The same author agent then changes hats twice and argues against its own design:

<div class="docs-proof-list docs-proof-list-compact">
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Shipped</div>
    <div>
      <div class="docs-proof-title">Architect review: will this fit the system?</div>
      <p class="docs-proof-body">The architect pass checks whether the proposed change respects the existing architecture, module boundaries, service relationships, and producer / consumer contracts.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What the audit records:</strong> the persona verdict, score, missing items, and the chain event that signed the judgment.</div>
  </div>
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Shipped</div>
    <div>
      <div class="docs-proof-title">Security review: will this preserve the controls?</div>
      <p class="docs-proof-body">The security pass checks the design against the threat model and the security requirements from the PRD. If the design proposes an unauthorized call path or weakens a control, this is where it should stop.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What the audit records:</strong> each review round, whether it passed, and what the agent changed before trying again.</div>
  </div>
</div>

Same self-critique pattern as the PRD stage, different evidence. The PRD review asks: *is the intent coherent?* The code-design review asks: *can this intent be implemented here without violating governance?* Restricted-tier work often stops here, and that is the point. This is the last chance to catch a bad design before the coding agents pick it up.

> 📁 **Real code, real reads, not paraphrased guesses.** For every brownfield repo, the agent must read the actual files it plans to touch. The audit chain records those reads, and the workflow checks every cited file path against the repo inventory. If the design names a file that does not exist, the PR fails instead of receiving a design-pass label.

**Pocket Watch changes scope again at WHAT.** Code design contains a lot of necessary repo detail: file trees, path citations, coordination YAML, and per-repo slices. Those are audited by deterministic path and coordination checks, but they are not the cleanest way to ask "did this design stay on the OKR?" For WHAT, Pocket Watch reads `API Endpoint Specifications` and `Design Rationale & Research Traceability`, then ranks that slice against the OKR objective and sibling OKRs. The receipt still shows rank #1 or not, the nearest competing OKR, the margin, the scoped text mode, and the legacy cosine score. The code-grounding checks answer "is this buildable here?"; Pocket Watch answers "is this still the approved work?"

When the code design merges, the Looking Glass-side planning artifacts are done. The chain ladder, however, continues — the next rung is an implementation chain inside each target repo, written by an implementation agent and stitched back to the mesh at the merge commit SHA.



## Stage 5 · The hand-off: one design becomes repo work

When the code design merges, the planning work is done. The design has answered the hard question: which repos change, in what order, and what contract each repo owes the others.

Stage 5 turns that approved design into repo work. It does not ask another agent to reinterpret the plan. Looking Glass shows a pre-flight pane, checks that each target repo is ready, asks the user to confirm the hand-off, and then opens the right landing issue in the right repo.

<div class="docs-proof-list docs-proof-list-compact">
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Shipped</div>
    <div>
      <div class="docs-proof-title">The design already says who goes first</div>
      <p class="docs-proof-body">Each repo slice names what it provides, what it consumes, and whether another repo must land first. The API work can wait for a foundation contract; the frontend can wait for the API. No one has to infer the order from a prose paragraph.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What the audit records:</strong> the coordination block from <code>code-design.md</code> and the same verifier result the merge gate used.</div>
  </div>
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Shipped</div>
    <div>
      <div class="docs-proof-title">The repos are checked before work is assigned</div>
      <p class="docs-proof-body">Brownfield repos must exist and be reachable. Greenfield repos go through Cheshire scaffolding first, so the implementation agent lands in a repo that already has CI, prompts, ownership, and provenance hooks.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What the audit records:</strong> ready, blocked, scaffold-needed, and unreachable states for each target repo.</div>
  </div>
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Shipped</div>
    <div>
      <div class="docs-proof-title">A human confirms the hand-off</div>
      <p class="docs-proof-body">The user sees the repo list, the blocked items, and the ready items before anything dispatches. The button says how much work is actually ready, so "fan out" is a deliberate governance act.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What the audit records:</strong> the fan-out state file in the mesh and the landing issue created for each ready repo.</div>
  </div>
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Shipped</div>
    <div>
      <div class="docs-proof-title">Each repo gets its own implementation agent</div>
      <p class="docs-proof-body">The landing issue carries the OKR context, the repo's slice of the design, the parent-chain markers, and the governance tier. The implementation agent starts inside that repo, with the local code and local scaffold in front of it.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What the audit records:</strong> the assigned agent, the parent run, the parent chain root, and the repo-specific implementation run.</div>
  </div>
</div>

In the IMDB example, `celeb-api` gets the API slice, `imdb-react-frontend` gets the consumer slice, and the inherited auth contract stays a contract instead of becoming a fake third repo PR.

### The chain continues in the target repo

The implementation agent writes its evidence where the code lives: `<repo>/.maintainability/audit/events/IMPL-*.jsonl`. Planning evidence stays in the mesh under `WHY-*`, `HOW-*`, and `WHAT-*`. Implementation evidence stays in the target repo under `IMPL-*`.

When the implementation PR opens, its body includes a continuation block: the IMPL run id, the parent run id, the parent intent thread, the parent chain root, the in-repo event log path, the public-key path, and the implementation chain's own root hash. When the PR merges, Looking Glass checks those files in GitHub at the merge commit SHA before it appends the implementation row to the mesh chain ladder. If the files are missing or cannot be fetched, the row waits for retry. No false-green seal lands.

> 🔐 **The hand-off is the signature.** Each agent session signs its own events with a session-only key. No credential is reissued between agents. The research agent signs research judgments, the PRD agent signs product judgments, the code-design agent signs design judgments, and the implementation agent signs implementation judgments inside the target repo. The mesh's chain ladder names every rung; the merge commit SHA proves the impl rung existed in the repo at the moment of merge.

<svg viewBox="0 0 800 360" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="handoffBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="handoffArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
  </defs>
  <rect width="800" height="360" rx="12" fill="url(#handoffBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#f9a8d4" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">REPO HAND-OFF · DESIGN BECOMES WORK</text>
  <!-- Source: code-design.md merged in the mesh -->
  <rect x="30" y="80" width="170" height="80" rx="10" fill="rgba(252,211,77,0.10)" stroke="rgba(252,211,77,0.4)"/>
  <text x="115" y="103" text-anchor="middle" fill="#fcd34d" font-size="11" font-weight="700" font-family="system-ui, sans-serif">code-design.md</text>
  <text x="115" y="120" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">merged in the mesh</text>
  <text x="115" y="134" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">per-repo slices + §10</text>
  <text x="115" y="148" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">coordination contract</text>
  <!-- FanOutEngine box (in-extension, deterministic) -->
  <line x1="200" y1="120" x2="232" y2="120" stroke="#a5b4fc" stroke-width="2" marker-end="url(#handoffArrow)"/>
  <rect x="235" y="60" width="200" height="170" rx="10" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.5)"/>
  <text x="335" y="80" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">FanOutEngine</text>
  <text x="335" y="93" text-anchor="middle" fill="#94a3b8" font-size="8" font-style="italic" font-family="system-ui, sans-serif">in-extension · deterministic</text>
  <!-- Engine steps -->
  <rect x="246" y="103" width="178" height="22" rx="4" fill="rgba(15,23,42,0.55)"/>
  <text x="335" y="118" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">1 · check repo order</text>
  <rect x="246" y="128" width="178" height="22" rx="4" fill="rgba(15,23,42,0.55)"/>
  <text x="335" y="143" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">2 · check repo readiness</text>
  <rect x="246" y="153" width="178" height="34" rx="4" fill="rgba(252,211,77,0.10)" stroke="rgba(252,211,77,0.4)"/>
  <text x="335" y="167" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="700" font-family="system-ui, sans-serif">3 · pre-flight pane</text>
  <text x="335" y="179" text-anchor="middle" fill="#cbd5e1" font-size="8" font-family="system-ui, sans-serif">user clicks "Fan out N of M"</text>
  <rect x="246" y="191" width="178" height="22" rx="4" fill="rgba(15,23,42,0.55)"/>
  <text x="335" y="206" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">4 · open issue + assign agent</text>
  <!-- Per-repo lanes -->
  <line x1="435" y1="90" x2="475" y2="80" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#handoffArrow)"/>
  <line x1="435" y1="145" x2="475" y2="155" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#handoffArrow)"/>
  <line x1="435" y1="200" x2="475" y2="230" stroke="#a5b4fc" stroke-width="1.5" marker-end="url(#handoffArrow)"/>
  <rect x="480" y="58" width="280" height="68" rx="8" fill="rgba(125,211,252,0.10)" stroke="rgba(125,211,252,0.4)"/>
  <text x="620" y="78" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">celeb-api · brownfield</text>
  <text x="620" y="93" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">landing issue + impl agent</text>
  <text x="620" y="106" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">impl chain in /.maintainability/audit/</text>
  <text x="620" y="119" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">↳ ladder back at merge SHA</text>
  <rect x="480" y="134" width="280" height="68" rx="8" fill="rgba(125,211,252,0.10)" stroke="rgba(125,211,252,0.4)"/>
  <text x="620" y="154" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">imdb-react-frontend · brownfield</text>
  <text x="620" y="169" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">landing issue + impl agent</text>
  <text x="620" y="182" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">impl chain in /.maintainability/audit/</text>
  <text x="620" y="195" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">↳ ladder back at merge SHA</text>
  <rect x="480" y="210" width="280" height="68" rx="8" fill="rgba(74,222,128,0.10)" stroke="rgba(74,222,128,0.4)"/>
  <text x="620" y="230" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" font-family="system-ui, sans-serif">checkout-svc · greenfield</text>
  <text x="620" y="245" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Cheshire scaffold first</text>
  <text x="620" y="258" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">then landing issue + impl agent</text>
  <text x="620" y="271" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">↳ ladder back at merge SHA</text>
  <!-- Bottom: stitch + Red Queen takes over -->
  <rect x="60" y="298" width="680" height="22" rx="11" fill="rgba(252,211,77,0.10)" stroke="rgba(252,211,77,0.4)"/>
  <text x="400" y="313" text-anchor="middle" fill="#fcd34d" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">mesh records repo evidence after checking it at the PR merge SHA</text>
  <rect x="160" y="328" width="480" height="22" rx="11" fill="rgba(244,114,182,0.12)" stroke="rgba(244,114,182,0.4)"/>
  <text x="400" y="343" text-anchor="middle" fill="#f9a8d4" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">↳ Red Queen governs the impl agent's tool calls inside each repo</text>
</svg>

What ends here: the **Looking-Glass-side planning artifacts**. What continues: the chain ladder itself. The Hatter's Tea Party concludes with an internal auditor closeout — one per-action report plus the **whole-OKR rollup**, a single closeout report **over** the signed evidence that folds WHY + HOW + WHAT + every implementation row together with the verdict first, then the evidence, traceability, event timeline, and cross-phase ladder. The rollup is not itself a signed artifact; it re-verifies the chain ladder at export time, so what the auditor reads is what the chain says today, not what it said when each phase sealed. The external redacted bundle is next-act work: same evidence, packaged for people who should not receive raw mesh internals.

What begins next: the **implementation agents** working inside each target repo, governed by the Red Queen on their tool calls. That's the other story. Read [the Red Queen's Court](/docs/red-queens-court) for the deep dive, or jump straight to the [quickstart](/docs/quickstart-redqueen) to install hooks on a real repo.



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
  <text x="92" y="38" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Looking Glass · Platforms / IMDB-Lite / OKR-2026Q1-IMDB-001-celeb-api</text>
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
  <!-- Why card (complete): research signals, sources, refinement, coverage -->
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
  <!-- How card (blocked): PRD signals, ask-experts, FR/SR counts, mesh-grounding -->
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
  <!-- What card (gated): code-design signals and reviewer scores -->
  <rect x="534" y="194" width="246" height="160" rx="8" fill="url(#okrCardBg)" stroke="rgba(252,211,77,0.4)"/>
  <text x="548" y="216" fill="#fcd34d" font-size="11" font-weight="700" font-family="system-ui, sans-serif">☐ What · Code Design</text>
  <text x="766" y="216" text-anchor="end" fill="#fcd34d" font-size="9" font-family="system-ui, sans-serif">readiness gate</text>
  <line x1="548" y1="226" x2="766" y2="226" stroke="rgba(252,211,77,0.25)"/>
  <text x="548" y="240" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Agent:    code-design-agent</text>
  <text x="548" y="253" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Inputs:   PRD + 3 repos (indexed)</text>
  <text x="548" y="266" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Reviews: Architect · Security</text>
  <text x="548" y="279" fill="#fcd34d" font-size="9" font-family="system-ui, sans-serif">Will score: Arch · Sec</text>
  <text x="548" y="292" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">          repo fit · contracts · controls</text>
  <text x="548" y="305" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Gated on: How merged</text>
  <text x="548" y="318" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Fan-out → celeb-api · react · auth contract</text>
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
  <text x="400" y="450" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui, sans-serif">OKR detail · every phase status, score, and Hatter Tag chip lives on one scrolling page.</text>
  <text x="400" y="465" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui, sans-serif">No tab switching. No copy-paste. The audit chain is one click away at any phase.</text>
</svg>

The screen is **deliberately linear, not tabbed.** Tabs let a user open How without reading Why; the linear page enforces the reading order that matches the audit trail. The "Restricted blocks auto-revise" banner is inline because Restricted-gate context shouldn't require a sub-navigation. Hatter Tag access is one click on every Action card.

**Signals are phase-specific.** Each Action card surfaces what actually matters at that stage, not a generic score column:

- **Why (Research)** shows what the research pipeline actually produced: sources count, refinement loops, findings cited, JTBD/brief-topic coverage. Reviewer scores exist (every PR gets reviewed) but the headline is the evidence base.
- **How (PRD)** shows PRD-specific signals: ask-experts Q&A count, FR/NFR/SR counts, and **mesh-grounding scores** (the PRD-pack reviewers score against CALM/ADRs and STRIDE/OWASP, not against code yet). MISSING items from the reviewers are inline.
- **What (Code Design)** is where the Architecture and Security scores are grounded in the actual repositories. The agent reads the code it plans to touch, checks whether the design fits the existing architecture, checks whether the security requirements still hold, and signs both review judgments into the chain. This is the implementation-readiness gate, and it is where "Arch 88 ✓ · Sec 84 ✓" earns its weight.



## The audit closeout: one report, one answer

Compliance reviews are slow because the evidence is scattered. The CALM model lives in one place, the threat model in another, the PRD in a Confluence space, the design in a Notion doc, the PR in GitHub, the reviewer comments somewhere in a Slack thread. To answer "how was this built?" an auditor opens six tabs and asks four people for permissions. That is the gap the audit closeout closes.

The shipped closeout has two levels.

<div class="docs-proof-list docs-proof-list-compact">
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Shipped</div>
    <div>
      <div class="docs-proof-title">Full OKR rollup</div>
      <p class="docs-proof-body">One report answers the executive question: did the whole OKR make it from Why to How to What with verified evidence? It opens with PASS / FAIL, then shows the phase rollup, trust posture, chain ladder, control coverage, outstanding gaps, and verifier commands.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Best for:</strong> internal audit, CISO review, incident review, and OKR closeout before downstream implementation.</div>
  </div>
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Shipped</div>
    <div>
      <div class="docs-proof-title">Per-action closeout</div>
      <p class="docs-proof-body">Each phase also has its own detailed report. The phase report shows the runner verdict, evidence source breakdown, skill calls, self-review trail, workflow facts, event timeline, control mapping, and the exact command to verify the chain again.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Best for:</strong> reviewers who need to inspect one phase deeply without reading the whole OKR.</div>
  </div>
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Shipped</div>
    <div>
      <div class="docs-proof-title">Rendered sample for the story</div>
      <p class="docs-proof-body">The governance page now includes a lightweight rendered sample, so a buyer or auditor can see the closeout as a readable report instead of a markdown wall.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Best for:</strong> demos, walkthroughs, and first-reader comprehension.</div>
  </div>
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-queued">Next act</div>
    <div>
      <div class="docs-proof-title">External redacted bundle</div>
      <p class="docs-proof-body">The reports are internal-grade today because they cite raw mesh artifacts. External sharing still needs a redaction pass. The next act packages the same evidence for regulators, downstream consumers, and third-party auditors without leaking prompt internals or proprietary references.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What changes:</strong> automated PII, IP, and secrets scrubbing before export.</div>
  </div>
</div>

This is what closes the **EU AI Act Article 12** requirement (automatic logging, ≥6-month retention, model + inputs + operator + timestamps; deadline 2 August 2026) and what makes **SOC 2 CC8.1** ("prompt as design evidence") demonstrable. It is also what makes incident review survivable. When something ships wrong, the question is no longer "who approved this?" It's "click the OKR. Export the audit. Open the chain ladder."



## Why this is the right way to govern AI engineering

Three claims, each falsifiable.

**Claim 1: Governance upstream is cheaper than governance at the gate.** If the Hatter's Tea Party catches a missing threat model on a Restricted-tier BAR during PRD review, the cost is one revision round. If the Red Queen catches the same issue when a coding agent tries to call an unauthorized service, the cost is a half-implemented PR, a rollback, and an incident retrospective. The earlier the gate, the smaller the blast radius.

**Claim 2: Audit chains across repository boundaries are a feature, not a footnote.** Every artifact this pipeline produces carries the same audit thread. The mesh repo's research doc, the same mesh's PRD, the same mesh's code design, each target repo's landing issue, and each target repo's code PR are all readable as one chain. Microsoft's Agent Governance Toolkit calls this the "reasoning-trace correlation gap." We close it from the OKR forward.

**Claim 3: The right place to test implementation readiness is the code design.** A PRD can be well grounded and still be hard to build safely. The code design is the first artifact with both sides in view: what the business asked for and what the repositories can absorb. That is where the Architect and Security personas can say whether the work is buildable without breaking what is already there.

> 🎩 **Where this runs.** The Hatter's Tea Party runs on GitHub's hosted coding-agent runtime. There is no separate agent platform to deploy, no inference infrastructure to operate, and no model gateway to stand up before a team can try it. The mesh is a GitHub repo. The agents are committed as repo files. The gates are GitHub Actions. The value is the audit chain and threat model, not a bespoke runtime. Cost ceiling: a few dollars per OKR pipeline. Onboarding ceiling: one GitHub App install.



## Where to read next

This page is the Hatter's story: how one OKR becomes grounded research, an expert-reviewed PRD, a code-ready design, and an auditor-readable evidence chain. The next click depends on what you want to understand next: the enforcement layer, the full governance story, or the hands-on workshop path.

<div class="docs-grid docs-grid-wide">
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



<div class="docs-hero-flourish">
  <em>"Have I gone mad?"</em> · <em>"I'm afraid so. You're entirely bonkers. But I'll tell you a secret. All the best people are."</em>
  <br/><small>Lewis Carroll</small>
</div>
