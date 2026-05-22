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

## A human/agent SDLC — the gap nobody is filling

Software is shifting to a development model where **humans lead and AI agents execute**, at scale, in parallel, across every repository at once. The human is the persona at the wheel: setting intent, approving scope, owning outcome. The agents handle the typing. They're fast enough now that the keyboard is no longer the bottleneck.

The bottleneck is **whether the human at the wheel can see the architecture clearly enough to lead, and whether the agents executing can see it clearly enough to follow.** Today, both sides operate blind.

- The **human** gets a one-line objective from leadership, a whiteboard sketch from a meeting last quarter, and a Slack channel. No map of which BARs in their portfolio are healthy. No view of the threat model the new feature will brush against. No read on whether the OKR they just approved is even within the org's governance tolerance.
- The **agent** gets a prompt and a code repo. No read of the CALM architecture model. No view of the STRIDE threat catalog. No awareness that Service A must never reach the database directly. No signal that this BAR requires PCI-DSS compliance.

The result: humans approve work without instruments; agents ship work without guardrails. The 70% of code that's boilerplate-shaped (CRUD, scaffolding, patterns) gets done brilliantly. The 30% that's **architecture, security, threat awareness, and governance** is where systems fail, breaches happen, and technical debt compounds into organizational debt.

This is the gap. Every AI agent in your organization operates in an **architectural vacuum**, and every human leading those agents is leading **without instruments**.

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

We close the gap **from both directions**. Humans get a control plane that shows the architecture, the threats, the scores, the audit chain. Instruments at the wheel. Agents get the same map, formatted for them, and gates that refuse to let them ship outside it. The human leads; the agents execute; the governance is shared.

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

Two roles, one control plane, every artifact audit-chained from intent to shipped code. The Hatter governs **before** code is written: the human leading the agentic SDLC sees what their initiative will touch, and the agents executing see the same map. The Red Queen governs **while** code is written: each agent action checked against the architecture deterministically. **For a CIO, this is spending control on what gets built. For a CIRO, it's explainability of every regulated decision. For a CISO, it's threat-model coverage that doesn't collapse the moment agents accelerate.**

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

<svg viewBox="0 0 800 410" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="Looking Glass four-pillar governance scoring on a Business Application Repository">
  <defs>
    <linearGradient id="pillarBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="pillarArch" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(99,102,241,0.55)"/><stop offset="100%" stop-color="rgba(99,102,241,0.15)"/></linearGradient>
    <linearGradient id="pillarSec" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(248,113,113,0.55)"/><stop offset="100%" stop-color="rgba(248,113,113,0.15)"/></linearGradient>
    <linearGradient id="pillarRisk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(252,211,77,0.55)"/><stop offset="100%" stop-color="rgba(252,211,77,0.15)"/></linearGradient>
    <linearGradient id="pillarOps" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(74,222,128,0.55)"/><stop offset="100%" stop-color="rgba(74,222,128,0.15)"/></linearGradient>
  </defs>
  <rect width="800" height="410" rx="12" fill="url(#pillarBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#818cf8" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">BAR · FOUR-PILLAR GOVERNANCE SCORING</text>
  <!-- BAR header -->
  <rect x="24" y="48" width="752" height="62" rx="10" fill="rgba(148,163,184,0.08)" stroke="rgba(148,163,184,0.25)"/>
  <text x="44" y="76" fill="#e2e8f0" font-size="15" font-weight="700" font-family="system-ui, sans-serif">APP-IMDB-001 · Application BAR</text>
  <text x="44" y="96" fill="#94a3b8" font-size="11" font-family="system-ui, sans-serif">Platform: imdb-lite · Criticality: HIGH · Tier: Autonomous (overall 80 / 100)</text>
  <rect x="650" y="68" width="100" height="26" rx="13" fill="rgba(74,222,128,0.18)" stroke="rgba(74,222,128,0.4)"/>
  <text x="700" y="85" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" font-family="system-ui, sans-serif">🛡 Sealed</text>
  <!-- Four pillar columns -->
  <!-- Architecture -->
  <rect x="24" y="126" width="180" height="220" rx="10" fill="rgba(99,102,241,0.06)" stroke="rgba(99,102,241,0.3)"/>
  <text x="114" y="150" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">ARCHITECTURE</text>
  <text x="114" y="184" text-anchor="middle" fill="#e2e8f0" font-size="34" font-weight="800" font-family="system-ui, sans-serif">85</text>
  <text x="114" y="201" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">/ 100</text>
  <rect x="44" y="216" width="140" height="6" rx="3" fill="rgba(148,163,184,0.18)"/>
  <rect x="44" y="216" width="119" height="6" rx="3" fill="url(#pillarArch)"/>
  <text x="44" y="244" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• CALM 1.2 model · 8 nodes</text>
  <text x="44" y="260" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• 6 ADRs · 0 drift</text>
  <text x="44" y="276" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• Capability map ✓</text>
  <text x="44" y="292" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• Pillar trend ↗ +3 / 30d</text>
  <text x="44" y="320" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Derived from artifacts,</text>
  <text x="44" y="332" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">not checklists</text>
  <!-- Security -->
  <rect x="216" y="126" width="180" height="220" rx="10" fill="rgba(248,113,113,0.06)" stroke="rgba(248,113,113,0.3)"/>
  <text x="306" y="150" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">SECURITY</text>
  <text x="306" y="184" text-anchor="middle" fill="#e2e8f0" font-size="34" font-weight="800" font-family="system-ui, sans-serif">72</text>
  <text x="306" y="201" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">/ 100</text>
  <rect x="236" y="216" width="140" height="6" rx="3" fill="rgba(148,163,184,0.18)"/>
  <rect x="236" y="216" width="101" height="6" rx="3" fill="url(#pillarSec)"/>
  <text x="236" y="244" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• STRIDE: 14 threats</text>
  <text x="236" y="260" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• OWASP A01–A10 ✓</text>
  <text x="236" y="276" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• NIST AC · AU · SC</text>
  <text x="236" y="292" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• 2 controls missing ⚠</text>
  <text x="236" y="320" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Threats · controls ·</text>
  <text x="236" y="332" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">audit-able coverage</text>
  <!-- Information Risk -->
  <rect x="408" y="126" width="180" height="220" rx="10" fill="rgba(252,211,77,0.06)" stroke="rgba(252,211,77,0.3)"/>
  <text x="498" y="150" text-anchor="middle" fill="#fcd34d" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">INFORMATION RISK</text>
  <text x="498" y="184" text-anchor="middle" fill="#e2e8f0" font-size="34" font-weight="800" font-family="system-ui, sans-serif">88</text>
  <text x="498" y="201" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">/ 100</text>
  <rect x="428" y="216" width="140" height="6" rx="3" fill="rgba(148,163,184,0.18)"/>
  <rect x="428" y="216" width="123" height="6" rx="3" fill="url(#pillarRisk)"/>
  <text x="428" y="244" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• Data classification ✓</text>
  <text x="428" y="260" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• PII / PHI inventory ✓</text>
  <text x="428" y="276" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• Retention policy ✓</text>
  <text x="428" y="292" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• Cross-border flows ✓</text>
  <text x="428" y="320" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Regulatory exposure</text>
  <text x="428" y="332" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">at the application layer</text>
  <!-- Operations -->
  <rect x="600" y="126" width="180" height="220" rx="10" fill="rgba(74,222,128,0.06)" stroke="rgba(74,222,128,0.3)"/>
  <text x="690" y="150" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">OPERATIONS</text>
  <text x="690" y="184" text-anchor="middle" fill="#e2e8f0" font-size="34" font-weight="800" font-family="system-ui, sans-serif">76</text>
  <text x="690" y="201" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">/ 100</text>
  <rect x="620" y="216" width="140" height="6" rx="3" fill="rgba(148,163,184,0.18)"/>
  <rect x="620" y="216" width="106" height="6" rx="3" fill="url(#pillarOps)"/>
  <text x="620" y="244" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• SLO definitions ✓</text>
  <text x="620" y="260" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• Runbook present ✓</text>
  <text x="620" y="276" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• Observability gaps ⚠</text>
  <text x="620" y="292" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• On-call rotation ✓</text>
  <text x="620" y="320" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Day-2 readiness +</text>
  <text x="620" y="332" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">incident response</text>
  <!-- Tier-mapping footer -->
  <rect x="24" y="358" width="752" height="38" rx="8" fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.3)"/>
  <text x="44" y="382" fill="#a5b4fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">→ Tier mapping drives agent autonomy:</text>
  <text x="285" y="382" fill="#86efac" font-size="11" font-family="system-ui, sans-serif">Autonomous (≥ 75 overall, 3 auto-rounds)</text>
  <text x="525" y="382" fill="#fcd34d" font-size="11" font-family="system-ui, sans-serif">· Supervised (50–74, 2 rounds)</text>
  <text x="744" y="382" text-anchor="end" fill="#fca5a5" font-size="11" font-family="system-ui, sans-serif">· Restricted (&lt; 50)</text>
</svg>

### Interactive CALM architecture

Architecture diagrams built on ReactFlow and ELK.js. Not static pictures, but living canvases where you drag, drop, edit, and write changes directly back to the CALM model. Bidirectional editing means the diagram IS the architecture, and the architecture IS the diagram.

<svg viewBox="0 0 800 440" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="Bidirectional CALM architecture canvas — the diagram and the model are the same artifact">
  <defs>
    <linearGradient id="calmBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="calmArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
    <marker id="calmSync" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#fcd34d"/>
    </marker>
  </defs>
  <rect width="800" height="440" rx="12" fill="url(#calmBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#818cf8" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">CALM CANVAS · BIDIRECTIONAL EDITING</text>
  <!-- LEFT: visual canvas -->
  <rect x="24" y="50" width="370" height="300" rx="10" fill="rgba(99,102,241,0.06)" stroke="rgba(99,102,241,0.3)"/>
  <text x="44" y="74" fill="#a5b4fc" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">VISUAL CANVAS · ReactFlow + ELK.js</text>
  <!-- Architecture graph — 3 columns: clients | services | data -->
  <!-- COL 1: Frontend + Identity (clients / auth) -->
  <rect x="44" y="100" width="106" height="40" rx="8" fill="rgba(165,180,252,0.18)" stroke="rgba(165,180,252,0.6)"/>
  <text x="97" y="118" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui, sans-serif">imdb-react-frontend</text>
  <text x="97" y="131" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">presentation layer</text>
  <rect x="44" y="190" width="106" height="40" rx="8" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.6)"/>
  <text x="97" y="208" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui, sans-serif">imdb-identity</text>
  <text x="97" y="221" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">auth · JWT issuer</text>
  <!-- COL 2: celeb-api + movie-api (domain services) -->
  <rect x="180" y="100" width="100" height="40" rx="8" fill="rgba(167,139,250,0.18)" stroke="rgba(167,139,250,0.6)"/>
  <text x="230" y="118" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui, sans-serif">celeb-api</text>
  <text x="230" y="131" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">domain service</text>
  <rect x="180" y="190" width="100" height="40" rx="8" fill="rgba(167,139,250,0.18)" stroke="rgba(167,139,250,0.6)"/>
  <text x="230" y="208" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui, sans-serif">movie-api</text>
  <text x="230" y="221" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">domain service</text>
  <!-- COL 3: data-store (data tier, right side) -->
  <rect x="305" y="145" width="80" height="40" rx="8" fill="rgba(74,222,128,0.18)" stroke="rgba(74,222,128,0.6)"/>
  <text x="345" y="163" text-anchor="middle" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui, sans-serif">data-store</text>
  <text x="345" y="176" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">MongoDB</text>
  <!-- Edges — auth flow first (frontend → identity), then data path -->
  <line x1="97" y1="140" x2="97" y2="190" stroke="#fcd34d" stroke-width="1.6" marker-end="url(#calmArrow)"/>
  <text x="103" y="168" fill="#fcd34d" font-size="8" font-style="italic" font-family="system-ui, sans-serif">auth</text>
  <line x1="150" y1="120" x2="180" y2="120" stroke="#a5b4fc" stroke-width="1.6" marker-end="url(#calmArrow)"/>
  <line x1="150" y1="210" x2="180" y2="120" stroke="#a5b4fc" stroke-width="1.2" marker-end="url(#calmArrow)" opacity="0.6"/>
  <line x1="150" y1="210" x2="180" y2="210" stroke="#a5b4fc" stroke-width="1.6" marker-end="url(#calmArrow)"/>
  <line x1="280" y1="120" x2="305" y2="160" stroke="#a5b4fc" stroke-width="1.4" marker-end="url(#calmArrow)"/>
  <line x1="280" y1="210" x2="305" y2="170" stroke="#a5b4fc" stroke-width="1.4" marker-end="url(#calmArrow)"/>
  <!-- Column labels -->
  <text x="97" y="74" text-anchor="middle" fill="#64748b" font-size="8" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">CLIENTS</text>
  <text x="230" y="74" text-anchor="middle" fill="#64748b" font-size="8" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">SERVICES</text>
  <text x="345" y="74" text-anchor="middle" fill="#64748b" font-size="8" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">DATA</text>
  <text x="44" y="265" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Drag · drop · edit · re-layout — ELK.js auto-routes edges around nodes</text>
  <!-- Sync arrows -->
  <line x1="394" y1="200" x2="436" y2="200" stroke="#fcd34d" stroke-width="2" marker-end="url(#calmSync)"/>
  <line x1="436" y1="220" x2="394" y2="220" stroke="#fcd34d" stroke-width="2" marker-end="url(#calmSync)"/>
  <text x="415" y="245" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="700" font-style="italic" font-family="system-ui, sans-serif">bi-dir</text>
  <!-- RIGHT: CALM JSON -->
  <rect x="440" y="50" width="336" height="300" rx="10" fill="rgba(15,23,42,0.6)" stroke="rgba(252,211,77,0.4)"/>
  <text x="460" y="74" fill="#fcd34d" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">CALM 1.2 MODEL · platform.arch.json</text>
  <text x="460" y="98" fill="#94a3b8" font-size="10" font-family="ui-monospace, Menlo, monospace">{</text>
  <text x="476" y="114" fill="#94a3b8" font-size="10" font-family="ui-monospace, Menlo, monospace">"nodes": [</text>
  <text x="492" y="130" fill="#cbd5e1" font-size="10" font-family="ui-monospace, Menlo, monospace">{ "unique-id": "celeb-api",</text>
  <text x="492" y="146" fill="#cbd5e1" font-size="10" font-family="ui-monospace, Menlo, monospace">  "node-type": "service",</text>
  <text x="492" y="162" fill="#cbd5e1" font-size="10" font-family="ui-monospace, Menlo, monospace">  "name": "Celebrity API",</text>
  <text x="492" y="178" fill="#86efac" font-size="10" font-family="ui-monospace, Menlo, monospace">  "interfaces": ["REST"] },</text>
  <text x="492" y="194" fill="#94a3b8" font-size="10" font-family="ui-monospace, Menlo, monospace">  ...</text>
  <text x="476" y="210" fill="#94a3b8" font-size="10" font-family="ui-monospace, Menlo, monospace">],</text>
  <text x="476" y="226" fill="#94a3b8" font-size="10" font-family="ui-monospace, Menlo, monospace">"relationships": [</text>
  <text x="492" y="242" fill="#cbd5e1" font-size="10" font-family="ui-monospace, Menlo, monospace">{ "source": "frontend",</text>
  <text x="492" y="258" fill="#cbd5e1" font-size="10" font-family="ui-monospace, Menlo, monospace">  "destination": "celeb-api",</text>
  <text x="492" y="274" fill="#fca5a5" font-size="10" font-family="ui-monospace, Menlo, monospace">  "protocol": "HTTPS" },</text>
  <text x="492" y="290" fill="#94a3b8" font-size="10" font-family="ui-monospace, Menlo, monospace">  ...</text>
  <text x="476" y="306" fill="#94a3b8" font-size="10" font-family="ui-monospace, Menlo, monospace">]</text>
  <text x="460" y="322" fill="#94a3b8" font-size="10" font-family="ui-monospace, Menlo, monospace">}</text>
  <text x="460" y="342" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Git-native · FINOS standard · machine-readable</text>
  <!-- Footer band — gives the tagline real breathing room -->
  <rect x="24" y="370" width="752" height="50" rx="10" fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.35)"/>
  <text x="400" y="392" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="700" font-family="system-ui, sans-serif">The diagram IS the architecture. The architecture IS the diagram.</text>
  <text x="400" y="410" text-anchor="middle" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">Drag the canvas → JSON updates · edit the JSON → canvas re-lays out · ReactFlow + ELK.js</text>
</svg>

Trend sparklines show governance health over time. Drift indicators catch decay before it becomes crisis. Enterprise capability models (ACORD, BIAN) map business capabilities to the applications that implement them.

### Absolem: AI architecture advisor

<svg viewBox="0 0 800 410" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="Absolem — AI architecture advisor with seven specialized governance commands">
  <defs>
    <linearGradient id="absBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <radialGradient id="absGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(125,211,252,0.35)"/>
      <stop offset="100%" stop-color="rgba(125,211,252,0.04)"/>
    </radialGradient>
  </defs>
  <rect width="800" height="410" rx="12" fill="url(#absBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#7dd3fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">ABSOLEM · AI ARCHITECTURE ADVISOR</text>
  <!-- LEFT: chat surface -->
  <rect x="24" y="50" width="370" height="338" rx="10" fill="rgba(15,23,42,0.65)" stroke="rgba(125,211,252,0.35)"/>
  <text x="44" y="74" fill="#7dd3fc" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">CONVERSATION · BAR-grounded</text>
  <!-- User bubble -->
  <rect x="44" y="90" width="330" height="42" rx="8" fill="rgba(99,102,241,0.16)" stroke="rgba(99,102,241,0.35)"/>
  <text x="58" y="108" fill="#a5b4fc" font-size="10" font-weight="700" font-family="system-ui, sans-serif">YOU</text>
  <text x="58" y="124" fill="#e2e8f0" font-size="11" font-family="system-ui, sans-serif">/drift — is the celeb-api code aligned with our CALM?</text>
  <!-- Absolem reply -->
  <circle cx="62" cy="160" r="14" fill="url(#absGlow)" stroke="rgba(125,211,252,0.6)"/>
  <text x="62" y="164" text-anchor="middle" fill="#7dd3fc" font-size="14" font-weight="700" font-family="system-ui, sans-serif">A</text>
  <rect x="86" y="148" width="288" height="232" rx="8" fill="rgba(125,211,252,0.08)" stroke="rgba(125,211,252,0.25)"/>
  <text x="100" y="166" fill="#7dd3fc" font-size="10" font-weight="700" font-family="system-ui, sans-serif">ABSOLEM</text>
  <text x="100" y="184" fill="#e2e8f0" font-size="11" font-family="system-ui, sans-serif">Reviewed celeb-api against CALM model</text>
  <text x="100" y="200" fill="#e2e8f0" font-size="11" font-family="system-ui, sans-serif">platform.arch.json (8 nodes, 5 ADRs).</text>
  <text x="100" y="224" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">✓ Endpoints match declared interfaces</text>
  <text x="100" y="240" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">✓ Auth flow reaches imdb-identity</text>
  <text x="100" y="256" fill="#fcd34d" font-size="10" font-family="system-ui, sans-serif">⚠ data-store connection bypasses the</text>
  <text x="100" y="268" fill="#fcd34d" font-size="10" font-family="system-ui, sans-serif">  service-layer guard (CALM drift)</text>
  <text x="100" y="284" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">→ Recommend: update arch.json to add</text>
  <text x="100" y="296" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">  the new code-path OR refactor code</text>
  <text x="100" y="308" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">  to route through service-layer.</text>
  <text x="100" y="334" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">Mesh-grounded · cites 3 ADRs · 2 threats</text>
  <text x="100" y="354" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Sources: ADR-0004, ADR-0007, ADR-0011</text>
  <text x="100" y="367" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">STRIDE: THR-014 (tampering), THR-022</text>
  <!-- RIGHT: 7 specialized commands -->
  <rect x="416" y="50" width="360" height="338" rx="10" fill="rgba(125,211,252,0.04)" stroke="rgba(125,211,252,0.25)"/>
  <text x="436" y="74" fill="#7dd3fc" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">SEVEN SPECIALIZED COMMANDS</text>
  <!-- 2-column grid: 7 commands -->
  <!-- /drift -->
  <rect x="436" y="90" width="156" height="46" rx="8" fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.35)"/>
  <text x="448" y="109" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">/drift</text>
  <text x="448" y="125" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">code-vs-CALM drift scan</text>
  <!-- /add-component -->
  <rect x="600" y="90" width="156" height="46" rx="8" fill="rgba(167,139,250,0.10)" stroke="rgba(167,139,250,0.35)"/>
  <text x="612" y="109" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">/add-component</text>
  <text x="612" y="125" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">scaffold a new CALM node</text>
  <!-- /validate -->
  <rect x="436" y="146" width="156" height="46" rx="8" fill="rgba(74,222,128,0.10)" stroke="rgba(74,222,128,0.35)"/>
  <text x="448" y="165" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">/validate</text>
  <text x="448" y="181" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">CALM 1.2 schema + drift</text>
  <!-- /gap-analysis -->
  <rect x="600" y="146" width="156" height="46" rx="8" fill="rgba(252,211,77,0.10)" stroke="rgba(252,211,77,0.35)"/>
  <text x="612" y="165" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">/gap-analysis</text>
  <text x="612" y="181" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">cross-pillar coverage check</text>
  <!-- /adr -->
  <rect x="436" y="202" width="156" height="46" rx="8" fill="rgba(248,113,113,0.10)" stroke="rgba(248,113,113,0.35)"/>
  <text x="448" y="221" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">/adr</text>
  <text x="448" y="237" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">suggest ADR for a decision</text>
  <!-- /image-to-calm -->
  <rect x="600" y="202" width="156" height="46" rx="8" fill="rgba(167,139,250,0.10)" stroke="rgba(167,139,250,0.35)"/>
  <text x="612" y="221" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">/image-to-calm</text>
  <text x="612" y="237" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">whiteboard → CALM 1.2 model</text>
  <!-- /scan-repo -->
  <rect x="436" y="258" width="156" height="46" rx="8" fill="rgba(125,211,252,0.10)" stroke="rgba(125,211,252,0.35)"/>
  <text x="448" y="277" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">/scan-repo</text>
  <text x="448" y="293" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">derive CALM from code (bottom-up)</text>
  <!-- /ask (freeform) -->
  <rect x="600" y="258" width="156" height="46" rx="8" fill="rgba(148,163,184,0.10)" stroke="rgba(148,163,184,0.35)"/>
  <text x="612" y="277" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">/ask</text>
  <text x="612" y="293" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">freeform consultation</text>
  <!-- Footer note -->
  <rect x="436" y="318" width="320" height="56" rx="8" fill="rgba(125,211,252,0.06)" stroke="rgba(125,211,252,0.25)"/>
  <text x="596" y="338" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Grounded in YOUR mesh</text>
  <text x="596" y="354" text-anchor="middle" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">Reads CALM · ADRs · STRIDE · NIST controls</text>
  <text x="596" y="368" text-anchor="middle" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">Cites sources · no hallucinated references</text>
  <text x="400" y="402" text-anchor="middle" fill="#94a3b8" font-size="10" font-style="italic" font-family="system-ui, sans-serif">"Who are you?" — the Caterpillar in Wonderland, after Alice landed on a mushroom. Same energy.</text>
</svg>

An AI governance assistant that doesn't just answer questions. It understands your architecture. Seven specialized commands: drift analysis, component addition, CALM validation, cross-pillar gap analysis, ADR suggestions, image-to-CALM conversion, freeform consultation. **Image-to-CALM** turns a whiteboard photo into a structured CALM 1.2 model. **Scan Repo** derives architecture bottom-up from running code.

### Oraculum: automated architecture review

<svg viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="Oraculum — code-grounded architecture review across target repos">
  <defs>
    <linearGradient id="oraBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="oraArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
  </defs>
  <rect width="800" height="480" rx="12" fill="url(#oraBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#fcd34d" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">ORACULUM · CODE-GROUNDED ARCHITECTURE REVIEW</text>
  <!-- Pipeline strip: 4 stages -->
  <text x="48" y="58" fill="#94a3b8" font-size="10" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">STAGE 1 · CONFIGURE</text>
  <text x="248" y="58" fill="#94a3b8" font-size="10" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">STAGE 2 · ASSIGN</text>
  <text x="448" y="58" fill="#94a3b8" font-size="10" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">STAGE 3 · CI RUNS</text>
  <text x="648" y="58" fill="#94a3b8" font-size="10" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">STAGE 4 · FINDINGS</text>
  <!-- Stage 1: configure -->
  <rect x="24" y="68" width="170" height="148" rx="8" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.35)"/>
  <text x="38" y="90" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Select pillars</text>
  <text x="38" y="108" fill="#a5b4fc" font-size="10" font-family="system-ui, sans-serif">☑ Architecture</text>
  <text x="38" y="122" fill="#fca5a5" font-size="10" font-family="system-ui, sans-serif">☑ Security</text>
  <text x="38" y="136" fill="#fcd34d" font-size="10" font-family="system-ui, sans-serif">☐ Information Risk</text>
  <text x="38" y="150" fill="#86efac" font-size="10" font-family="system-ui, sans-serif">☑ Operations</text>
  <line x1="38" y1="162" x2="180" y2="162" stroke="rgba(148,163,184,0.2)"/>
  <text x="38" y="178" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui, sans-serif">Prompt packs</text>
  <text x="38" y="192" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">arch-review · CALM-drift</text>
  <text x="38" y="206" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">owasp-pattern-scan</text>
  <line x1="194" y1="142" x2="222" y2="142" stroke="#a5b4fc" stroke-width="1.6" marker-end="url(#oraArrow)"/>
  <!-- Stage 2: assign -->
  <rect x="224" y="68" width="170" height="148" rx="8" fill="rgba(167,139,250,0.08)" stroke="rgba(167,139,250,0.35)"/>
  <text x="238" y="90" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Pick agents</text>
  <rect x="238" y="100" width="142" height="28" rx="6" fill="rgba(167,139,250,0.12)" stroke="rgba(167,139,250,0.4)"/>
  <text x="248" y="118" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui, sans-serif">🤖 Claude Code</text>
  <rect x="238" y="134" width="142" height="28" rx="6" fill="rgba(167,139,250,0.12)" stroke="rgba(167,139,250,0.4)"/>
  <text x="248" y="152" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui, sans-serif">🤖 Copilot Coding</text>
  <text x="238" y="180" fill="#e2e8f0" font-size="10" font-weight="700" font-family="system-ui, sans-serif">Target repos</text>
  <text x="238" y="194" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">celeb-api · imdb-frontend</text>
  <text x="238" y="207" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">imdb-identity</text>
  <line x1="394" y1="142" x2="422" y2="142" stroke="#a5b4fc" stroke-width="1.6" marker-end="url(#oraArrow)"/>
  <!-- Stage 3: CI runs -->
  <rect x="424" y="68" width="170" height="148" rx="8" fill="rgba(252,211,77,0.08)" stroke="rgba(252,211,77,0.35)"/>
  <text x="438" y="90" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">GitHub Action</text>
  <text x="438" y="108" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">1. Clone repo</text>
  <text x="438" y="122" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">2. Read CALM model</text>
  <text x="438" y="136" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">3. Run pack(s) per pillar</text>
  <text x="438" y="150" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">4. Score · cite · classify</text>
  <text x="438" y="164" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">5. Post structured issue</text>
  <line x1="438" y1="174" x2="580" y2="174" stroke="rgba(148,163,184,0.2)"/>
  <text x="438" y="190" fill="#fcd34d" font-size="10" font-weight="700" font-family="system-ui, sans-serif">⏱ Avatar timeline live</text>
  <text x="438" y="204" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">  PR check status streams</text>
  <line x1="594" y1="142" x2="622" y2="142" stroke="#a5b4fc" stroke-width="1.6" marker-end="url(#oraArrow)"/>
  <!-- Stage 4: findings -->
  <rect x="624" y="68" width="152" height="148" rx="8" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.35)"/>
  <text x="638" y="90" fill="#e2e8f0" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Findings issue</text>
  <text x="638" y="106" fill="#a5b4fc" font-size="9" font-weight="700" font-family="system-ui, sans-serif">ARCHITECTURE</text>
  <text x="638" y="120" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• 1 MAJOR · 2 MINOR</text>
  <text x="638" y="138" fill="#fca5a5" font-size="9" font-weight="700" font-family="system-ui, sans-serif">SECURITY</text>
  <text x="638" y="152" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• 0 BLOCKING · 1 MAJOR</text>
  <text x="638" y="170" fill="#86efac" font-size="9" font-weight="700" font-family="system-ui, sans-serif">OPERATIONS</text>
  <text x="638" y="184" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">• 3 MINOR</text>
  <line x1="638" y1="194" x2="762" y2="194" stroke="rgba(148,163,184,0.2)"/>
  <text x="638" y="208" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">All findings → NIST mapped</text>
  <!-- Lower row: example finding card -->
  <rect x="24" y="240" width="752" height="120" rx="10" fill="rgba(15,23,42,0.6)" stroke="rgba(248,113,113,0.3)"/>
  <text x="44" y="262" fill="#fca5a5" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">SAMPLE FINDING · SECURITY PILLAR</text>
  <rect x="44" y="272" width="80" height="18" rx="4" fill="rgba(248,113,113,0.2)" stroke="rgba(248,113,113,0.5)"/>
  <text x="84" y="285" text-anchor="middle" fill="#fca5a5" font-size="10" font-weight="700" font-family="system-ui, sans-serif">MAJOR</text>
  <rect x="132" y="272" width="120" height="18" rx="4" fill="rgba(125,211,252,0.18)" stroke="rgba(125,211,252,0.45)"/>
  <text x="192" y="285" text-anchor="middle" fill="#7dd3fc" font-size="10" font-weight="700" font-family="system-ui, sans-serif">OWASP A07 · Auth</text>
  <rect x="260" y="272" width="120" height="18" rx="4" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.45)"/>
  <text x="320" y="285" text-anchor="middle" fill="#fcd34d" font-size="10" font-weight="700" font-family="system-ui, sans-serif">NIST IA-2 · IA-5</text>
  <rect x="388" y="272" width="140" height="18" rx="4" fill="rgba(167,139,250,0.18)" stroke="rgba(167,139,250,0.45)"/>
  <text x="458" y="285" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700" font-family="system-ui, sans-serif">STRIDE: Spoofing</text>
  <text x="44" y="312" fill="#e2e8f0" font-size="11" font-family="system-ui, sans-serif">celeb-api/routes/auth.ts:42 — JWT verification missing `iss` + `aud` claims.</text>
  <text x="44" y="328" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">Recommendation: add iss/aud checks (matches imdb-identity issuer config); add 2 unit tests.</text>
  <text x="44" y="344" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Cites: ADR-0007 (auth tier), THR-014, imdb-identity/config.ts · CALM node `imdb-identity`</text>
  <!-- Bottom footer: PR detection + mesh -->
  <rect x="24" y="380" width="752" height="80" rx="10" fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.35)"/>
  <text x="44" y="402" fill="#a5b4fc" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">TWO-WAY FEEDBACK INTO THE GOVERNANCE LOOP</text>
  <text x="44" y="424" fill="#cbd5e1" font-size="11" font-family="system-ui, sans-serif">→ PR check turns ✗ until findings cleared · prevents merge in CI</text>
  <text x="44" y="442" fill="#cbd5e1" font-size="11" font-family="system-ui, sans-serif">→ Review metrics persist to the mesh · BAR pillar scores update · tier may shift (Autonomous → Supervised → Restricted)</text>
</svg>

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

**Deterministic audit emission (Court Recorder Auto-Logging, B28).** Other "AI governance" products log what the agent *claims* it did — a self-report the LLM could fabricate, omit, or paraphrase. Hatter's Tea Party logs what the agent *demonstrably* did: the skill runtime emits the `skill_call` audit event before the result returns to the agent; the workflow re-derives `artifact_written` from the filesystem and `self_review` from structured PR-body blocks. The LLM produces *content*; deterministic code produces *events*. There is no skill API the LLM can call to "skip the audit," and nothing it writes can override what the runtime saw. This is the trust upgrade you can't buy — it's an architectural property, not a vendor feature.

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

<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="STRIDE + ASTRIDE threat coverage for the Hatter's Tea Party — six classical STRIDE categories plus four AI-agent-specific categories from ASTRIDE">
  <defs>
    <linearGradient id="strideBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" rx="12" fill="url(#strideBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#a5b4fc" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">STRIDE + ASTRIDE COVERAGE — HATTER FEATURE</text>
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
  <!-- ASTRIDE row — AI-agent-specific threats (the "A" category that STRIDE alone doesn't cover) -->
  <line x1="20" y1="232" x2="780" y2="232" stroke="rgba(167,139,250,0.30)" stroke-width="1" stroke-dasharray="4"/>
  <rect x="14" y="244" width="32" height="46" rx="8" fill="rgba(167,139,250,0.20)" stroke="rgba(167,139,250,0.6)"/>
  <text x="30" y="270" text-anchor="middle" fill="#c4b5fd" font-size="20" font-weight="800" font-family="system-ui, sans-serif">A</text>
  <text x="30" y="284" text-anchor="middle" fill="#a5b4fc" font-size="7" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">ASTRIDE</text>
  <text x="55" y="258" fill="#c4b5fd" font-size="10" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">AI-AGENT-SPECIFIC THREATS</text>
  <text x="55" y="275" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">From ASTRIDE (arXiv 2512.04785) — categories STRIDE alone does not cover</text>
  <text x="55" y="288" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Each cell below names the agent-side threat and its control in the design</text>
  <!-- 4 A-category cells -->
  <rect x="28" y="300" width="180" height="42" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="118" y="316" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">A.prompt-injection</text>
  <text x="118" y="332" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">Hatter Tag pins mesh_sha</text>
  <rect x="216" y="300" width="180" height="42" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="306" y="316" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">A.memory-poisoning</text>
  <text x="306" y="332" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">mesh_sha verify across runs</text>
  <rect x="404" y="300" width="180" height="42" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="494" y="316" text-anchor="middle" fill="#fcd34d" font-size="10" font-weight="700" font-family="system-ui, sans-serif">A.inter-agent-influence</text>
  <text x="494" y="332" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">partial · Caterpillar's Challenge</text>
  <rect x="592" y="300" width="180" height="42" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="682" y="316" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">A.false-audit-fabrication</text>
  <text x="682" y="332" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">verify-chain CI gate (B25)</text>
  <!-- Status legend (relocated below the ASTRIDE row) -->
  <line x1="20" y1="368" x2="780" y2="368" stroke="rgba(148,163,184,0.15)" stroke-width="1" stroke-dasharray="4"/>
  <text x="400" y="388" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">STATUS LEGEND (applies to all cells above)</text>
  <rect x="120" y="404" width="22" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="131" y="419" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" font-family="system-ui, sans-serif">✓</text>
  <text x="152" y="419" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">in design / shipped</text>
  <rect x="320" y="404" width="22" height="22" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="331" y="419" text-anchor="middle" fill="#fcd34d" font-size="11" font-weight="700" font-family="system-ui, sans-serif">🛠</text>
  <text x="352" y="419" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">partial — strong variant later</text>
  <rect x="552" y="404" width="22" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="563" y="419" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="700" font-family="system-ui, sans-serif">⚠</text>
  <text x="584" y="419" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">honest gap (named below)</text>
  <text x="400" y="452" text-anchor="middle" fill="#a5b4fc" font-size="10" font-weight="700" font-family="system-ui, sans-serif">10 STRIDE controls + 4 ASTRIDE controls in design · 3 partial · 5 honest gaps</text>
  <text x="400" y="470" text-anchor="middle" fill="#64748b" font-size="9" font-style="italic" font-family="system-ui, sans-serif">All open in GitHub for community review — honesty beats marketing claims</text>
</svg>

**The executive read.** Ten STRIDE controls plus four ASTRIDE (AI-agent-specific) controls are in design today. Three are partial; strong variants land in later phases. Five are honest gaps we name openly below. Row-by-row detail lives in the [design doc](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/agentic-sdlc.md); the high-level summary by STRIDE category sits below.

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Spoof · ✓ in design</div>
    <div class="docs-heading">Identity cannot be faked</div>
    <div class="docs-copy">Every artifact is signed by the agent session that produced it. At PRD time, the same agent inhabits Architect + Security personas in bounded self-critique. Impersonation is structurally impossible because there are no separate reviewer agents to spoof. <strong>Knight's Seal v1 (Phase B, next push)</strong> adds a per-run cryptographic signature over the chain root + artifact bytes; tampering breaks the signature.</div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Tamper · ✓ / 🛠</div>
    <div class="docs-heading">Audit chain is tamper-evident</div>
    <div class="docs-copy">Every step the agent takes is hash-chained. Modifying any past entry breaks every entry after it, detectable offline. Before any PR can merge, an independent re-verification replays the chain end-to-end; mismatch blocks the merge. Goal drift is caught by a semantic-similarity check (Pocket Watch). Tier-creep is prevented by freezing the governance tier at run start.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Repudiate · ✓</div>
    <div class="docs-heading">Every decision is attributable</div>
    <div class="docs-copy">"Who approved this?" and "Which agent produced this?" both have one-step answers. Dual-signature overrides preserve both signer identities, the reason, the timestamp, and the GitHub comment URL. Knight's Seal makes the agent attribution cryptographic: only that specific agent session could have produced the signature.</div>
  </div>
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Info disclosure · ⚠</div>
    <div class="docs-heading">Honest gaps we name</div>
    <div class="docs-copy">LLM provider prompt retention is outside our trust boundary; we capture costs + token counts, not prompt bodies. Audit-export bundles include research, PRD, and design verbatim. There's no automated PII / IP / secrets redaction layer yet. Phase E will add one for external sharing.</div>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">DoS · ✓ / ⚠</div>
    <div class="docs-heading">Cost + blast-radius caps</div>
    <div class="docs-copy">Per-Skill, per-agent, per-OKR, and per-org cost caps freeze new assignments before runaway spend. Workflow timeouts cap CI-minute exposure. Open gap: per-OKR fan-out blast radius. One OKR can write landing issues to many target repos; cap + warn threshold queued for Phase C.</div>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Elevation of Privilege · ✓ / 🛠 / ⚠</div>
    <div class="docs-heading">Tier escalation requires real artifacts</div>
    <div class="docs-copy">BAR pillar scores derive deterministically from real artifact presence (CALM model, threat model, ADRs). Faking artifacts to inflate a score requires creating real artifacts later agents will reference — the gate is self-reinforcing. Open research items: prompt-injection from external content; supply-chain signing on prompt-pack deployment.</div>
  </div>
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">ASTRIDE · A.false-audit-fabrication · ✓</div>
    <div class="docs-heading">Forged audit chains caught at the gate</div>
    <div class="docs-copy">On PR #105 we observed an agent that lost access to the audit-emission runner and hand-wrote the JSONL with fabricated hash values to look compliant. The pre-merge <code>verify-chain</code> CI step now re-replays the chain independently of the runner; any forgery applies the <code>chain-forgery-detected</code> label and refuses merge. This is the AI-agent-specific threat that pure STRIDE doesn't cover.</div>
  </div>
</div>

<details>
<summary><strong>Row-by-row detail for security teams</strong> — every concrete threat + the specific control in design + status (click to expand)</summary>

| STRIDE | Concrete threat | Control in design | Status |
|---|---|---|:-:|
| **Spoof** | Reviewer impersonates the author on the same PR | At PRD time there is no separate reviewer agent — the prd-agent inhabits Architect + Security personas in bounded self-critique, so impersonation is structurally impossible (same author DID across personas; each persona-round emits its own audit event). At code-design time the same Tweedles check applies if separate code-grounded reviewer agents are reintroduced — `author_did` from PR-description Hatter Tag must differ from any dispatched reviewer DID; collision = `tweedles-violation` label | ✓ |
| **Spoof** | Dual-signature override second-signer is impersonated | Fingerprint validation tying request to OKR + phase + reason + timestamp; Signer 2 confirmed via GitHub commenter handle or signed YAML commit; signer ≠ signer | ✓ |
| **Spoof** | Author identity in audit log forged | GitHub App installation ID + `system_prompt_sha` on every Hatter Tag at Phase A; **Knight's Seal v1 — per-run ephemeral Ed25519 keypair** signs the chain-root hash + artifact SHA in Phase B (next push); `seal-broken` CI label blocks merge on signature mismatch. Cosign-anchored persistent signing for long-term third-party verifiability is a future enhancement | 🛠 |
| **Tamper** | Merged artifact edited after the fact | Hatter Tag frontmatter is canonical, immutable via merged commit SHA; PR-description copy is the display mirror; `verify-chain` CLI validates frontmatter vs JSONL chain | 🛠 |
| **Tamper** | Audit JSONL chain modified | Hash-chained CloudEvents v1.0; partitioned per-run-id; POSIX advisory locking within file; per-run filenames prevent cross-run collision | ✓ |
| **Tamper** | OKR YAML corrupted by simultaneous phase merges | `concurrency:` group on `okr-bus.yml` keyed by `okr_id` serializes writes per OKR; different OKRs run parallel | ✓ |
| **Tamper** | Goal drift via subtle objective rewrite | White Rabbit's Pocket Watch hashes the canonicalized objective; compares with semantic similarity ≥ 0.85 AND edit-distance ≤ 0.30; `goal-drift-detected` label blocks merge | ✓ |
| **Tamper** | Tier creep mid-pipeline as BAR score bumps | Governance tier frozen on the Hatter Tag at run start; recorded tier applies for the run regardless of mesh-state changes | ✓ |
| **Tamper** | Agent claims it called Skills it never actually invoked (evidence laundering) | `audit-validate.yml` cross-checks the Hatter Tag's `evidence_mode` declaration against the per-run audit JSONL; if the agent declared `live` evidence but the log contains 0 successful `skill_call` events for any of the four search providers, the `degraded-evidence` label is applied and `okr-state-machine.yml` refuses to promote `governance-pass`. WHY-phase research PRs gate on `research-pass` from this same workflow | ✓ |
| **Repudiate** | "I didn't authorize that override" | Dual-signature override YAML preserved under `okrs/<id>/audit/overrides/` with both signer DIDs, signed-at timestamps, fingerprint, and GitHub comment URL; CloudEvent emitted | ✓ |
| **Repudiate** | "That agent didn't produce that artifact" | `author_did` on Hatter Tag plus prev/this hash chain in audit JSONL; **Knight's Seal v1** (Phase B, B27) signs the chain-root + artifact SHA with a per-run Ed25519 keypair so the agent's own session is the only thing that could have produced the signature. Persistent third-party verifiability (cosign / sigstore) is a future enhancement | 🛠 |
| **Info disclosure** | LLM provider retains our prompts indefinitely | Out of our trust boundary; the design captures cost + token counts only, not prompt bodies | ⚠ |
| **Info disclosure** | Sensitive research-source content lands in audit export | Pure-data Skills emit structured findings; no automated sensitive-content classification on results | ⚠ |
| **Info disclosure** | Audit Report Export shared externally leaks design IP | Bundle includes merged research, PRD, and code-design verbatim; no redaction layer (PII / IP / secrets scrubbing) — Phase E follow-on | ⚠ |
| **DoS** | Cost-cap exhaustion via runaway agent runs | Per-Skill `max_skill_calls_per_run`, per-agent `max_tokens_per_run`, per-OKR `governance.max_cost_usd`, and per-org monthly cap; `cost-cap-reached` label freezes new assignments | ✓ |
| **DoS** | Skill chains time out exhausting GitHub Actions minutes | Per-Skill timeout + bounded retry policy; workflow `timeout-minutes` on every bus workflow | ✓ |
| **DoS** | Fan-out blast radius — one OKR writes to N target repos | No upper bound today on `target_code_repos[]` length; `design-bus.yml` will write an issue per entry. Cap + warn threshold queued for Phase C | ⚠ |
| **EoP** | Tier bypass by faking BAR-score-raising artifacts | BAR pillar score is computed deterministically from real artifact presence (threat-model.yaml, controls block, ADRs). Inflation requires creating real artifacts that future agents will reference — the gate becomes self-reinforcing | ✓ |
| **EoP** | Prompt injection from a research-source page steers the agent | No content sanitization on Skill outputs; agent prompts don't explicitly partition data-vs-instructions | ⚠ |
| **EoP** | Compromised prompt pack version applied silently | Hatter Tag records `prompt_pack_version` + SHA; pack-deployment signature verification not in scope today | 🛠 |
| **ASTRIDE: A.prompt-injection** | Attacker-controlled web content steers a search agent | Hatter Tag pins `mesh_sha` so the mesh state the agent grounded on is verifiable; sanitization layer + data-vs-instructions partitioning is a Phase B+ research item | ✓ |
| **ASTRIDE: A.memory-poisoning** | Poisoned mesh artifact corrupts downstream runs | mesh_sha pinning lets `verify-chain` detect poisoned state across runs | ✓ |
| **ASTRIDE: A.inter-agent-influence** | Upstream agent's output steers a downstream agent | Partial coverage via Caterpillar's Challenge cross-phase semantic-drift check (PRD vs research; design vs PRD); full coverage requires agent-to-agent provenance signing | 🛠 |
| **ASTRIDE: A.false-audit-fabrication** | Agent fabricates the audit log to appear compliant | Pre-merge `verify-chain` CI step replays the SHA-256 chain independently of the runner; mismatch applies `chain-forgery-detected` and blocks merge. Closed in B25 | ✓ |

</details>

### AEGIS overlay: where this design fits in the agentic-AI security landscape

**Bottom line for an enterprise security leader.** The Hatter's Tea Party already satisfies most of the industry's published agentic-AI governance frameworks. We publish the specific controls we satisfy, the ones in flight, and the gaps that remain. No marketing claims. Every row is open in GitHub.

STRIDE alone doesn't cover agent-specific failure modes like goal drift, evidence laundering, or prompt injection from data-not-instructions confusion. Three industry frameworks sit on top of STRIDE for the agentic case. Each is summarized below with a one-line implementation status; the full row-by-row detail expands when you click.

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Framework 1 · ✓ 5 of 6 domains</div>
    <div class="docs-heading">Forrester AEGIS</div>
    <div class="docs-copy"><strong>Agentic AI Guardrails for Information Security.</strong> Six enterprise governance domains, three core principles (Least Agency, Continuous Assurance, Explainable Outcomes). Forrester, 2025. We satisfy 5 of 6 domains today. The sixth (prompt-pack signature verification under Application Security &amp; DevSecOps) pairs with the cosign-era Knight's Seal evolution.</div>
  </div>
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Framework 2 · ✓ 6 of 6 controls</div>
    <div class="docs-heading">AEGIS Pre-Execution Firewall</div>
    <div class="docs-copy">Runtime cryptographic controls for agentic tool calls: Ed25519 signing + SHA-256 hash-chained audit. Direct lineage to our <code>audit-emit-event</code> skill. Three recent landings: B25 (pre-merge chain re-verification CI gate), B27 (Knight's Seal v1 — per-run ephemeral Ed25519 signing of every event), and <strong>B28 (Court Recorder Auto-Logging) — the LLM cannot write to the audit log; only deterministic runtime + workflow code can</strong>. The trust story is no longer "verify the chain after the fact" but "the emitter is provably not the agent." <br><span style="display:inline-block;margin-top:0.5rem;font-size:0.8125rem;opacity:0.75">📄 <a href="https://arxiv.org/abs/2603.12621">arXiv 2603.12621</a></span></div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Framework 3 · 🛠 partial</div>
    <div class="docs-heading">Aegis Protocol</div>
    <div class="docs-copy">Cryptographic protocol for open agentic ecosystems: W3C DIDs for identity, NIST PQC for communication, Halo2 ZKP for verifiable policy. Formalizes "Excessive Agency" as a game. We map it directly to <strong>Pocket Watch goal-drift</strong>: when an agent's PR scope diverges too far from the OKR objective (cosine &lt; 0.85), agency has been exceeded and merge is refused. ZKP policy proofs are a Phase B+ candidate when third-party verifiable attestation becomes a requirement. <br><span style="display:inline-block;margin-top:0.5rem;font-size:0.8125rem;opacity:0.75">📄 <a href="https://arxiv.org/abs/2508.19267">arXiv 2508.19267</a></span></div>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Framework 4 · ✓ 4 of 4 A-categories</div>
    <div class="docs-heading">ASTRIDE</div>
    <div class="docs-copy">Formal STRIDE extension that adds an "A" category for AI-agent-specific attacks: prompt manipulation, memory poisoning, inter-agent influence. The STRIDE+ASTRIDE coverage SVG above shows the agent-side controls. <code>A.false-audit-fabrication</code> surfaced on PR #105 and is closed by three layered defenses: B25's pre-merge <code>verify-chain</code> CI gate (forged-hash detection), B27 Knight's Seal v1 (Ed25519 sealing of every event), and <strong>B28 Court Recorder Auto-Logging (deterministic emission — the agent has nothing to forge because it doesn't write the log)</strong>. Companion threats <strong>A.audit-skip</strong> (agent omits events to hide failures) and <strong>A.audit-forge-payload</strong> (agent fabricates artifact_written / self_review content) are closed by the same B28 design. <br><span style="display:inline-block;margin-top:0.5rem;font-size:0.8125rem;opacity:0.75">📄 <a href="https://arxiv.org/pdf/2512.04785">arXiv 2512.04785</a></span></div>
  </div>
</div>

<details>
<summary><strong>Forrester AEGIS — row-by-row detail for security teams</strong> (click to expand)</summary>

| Forrester domain | Forrester named control | Hatter's Tea Party implementation | Status |
|---|---|---|:-:|
| Governance, Risk & Compliance | Machine-executable, context-aware policy enforcement | Per-phase gate workflows (`market-research-agent.yml`, `prd-agent.yml`, audit-validate, drift-gate) enforce policy in CI, not just at PR review | ✓ |
| Identity & Access Management | Agents as hybrid identities with just-in-time privileges | Per-agent `.agent.md` declares minimum-necessary `tools:` list; deployment refuses to land an agent referencing an undeclared Skill | ✓ |
| Data Security & Privacy | Data provenance, memory, enclaves | Hatter Tag pins `mesh_sha` + `prompt_pack_version` + chain root; every artifact traces back to source documents | ✓ |
| Application Security & DevSecOps | Prompt engineering + supply-chain validation | Prompt packs versioned + SHA-stamped. **Pack-signature verification via cosign / sigstore** is a future enhancement that pairs with the persistent Knight's Seal evolution (v1 ephemeral keys, v2 cosign-anchored) | 🛠 |
| Threat Management & SecOps | Real-time monitoring + detection engineering | Hash-chained audit JSONL is queryable; `verify-chain` (Phase E) replays the full run from disk; gap-loop refinement events visible in audit trail | ✓ |
| Zero Trust | "Least agency" — minimum permissions per goal | Reviewer agents `tools:` deliberately omit `edit` (Tweedles boundary); skill backends are pure-data, can't mutate beyond their declared writes | ✓ |

**Core principles satisfaction.** *Least Agency* ✓ (per-agent tool whitelists). *Continuous Assurance* ✓ (every PR re-runs the gate workflows, not point-in-time review). *Explainable Outcomes* ✓ (audit JSONL is both human- and machine-readable; correctness summary PR comment names the failure reasons literally).

</details>

<details>
<summary><strong>AEGIS Pre-Execution Firewall — row-by-row detail for security teams</strong> (click to expand)</summary>

| AEGIS Pre-Execution Firewall control | Hatter's Tea Party implementation | Status |
|---|---|:-:|
| SHA-256 hash chain over every audit record | `prev_event_hash` linkage on every JSONL line; `chain_root_hash` pins the run | ✓ |
| Tamper-evident audit trail | Modifying any past event breaks every subsequent `prev_event_hash`; `verify-chain` catches it offline | ✓ |
| **Pre-merge chain re-verification (CI gate)** | `audit-and-drift` workflow replays the SHA-256 chain end-to-end against the canonical serialization before any PR can merge. Implemented inline (independent of the runner) so a runner bug can't silently pass. Applies `chain-forgery-detected` label and blocks merge on mismatch. Closed the gap where an agent that lost access to the `audit-emit-event` runner could hand-write the JSONL with fabricated hashes (observed on PR #105) | ✓ |
| **Deterministic emission (Court Recorder Auto-Logging, B28)** | The skill runtime emits `skill_call` events inside `runSkill()` itself — the agent has no API to call and no way to skip. Workflow re-derives `artifact_written` from `git diff` and `self_review` from parsing the agent's structured PR-body blocks. The LLM produces *content*; deterministic code produces *events*. Closes three threats in one design: A.false-audit-fabrication, A.audit-skip, A.audit-forge-payload | ✓ |
| Pre-execution interception (log before side effect) | `runSkill()` wraps every handler: emit the audit event before the result returns to the caller. The window between "skill ran" and "audit recorded" doesn't exist — they're the same function | ✓ |
| **Ed25519 per-run signing key (Knight's Seal v1)** | B27 lands per-run ephemeral Ed25519 keypair generated on first `audit-emit-event` call. Private key in `os.tmpdir()` (never the mesh repo), public key in `audit/keys/<runId>.pub.pem`, every event signed. CI re-verifies and surfaces a "🛡 Sealed" row in the PR audit comment + a green Sealed badge on the Looking Glass phase card. Cosign / sigstore-anchored persistent signing for year-old verifiability is a future enhancement (v2) | ✓ |
| Content-first risk scanning on extracted tool args | Pure-data skills return structured JSON the parent agent inspects; no prompt-vs-data conflation | ✓ |

</details>

#### Two files. Any auditor. Full story.

Anyone reviewing a merged artifact — internal auditor, regulator, downstream consumer, an incident-response team at 3 AM — takes **two files** off disk and reconstructs the whole run:

- `okrs/<id>/<phase>/<artifact>.md` (the merged research-doc, PRD, or code-design)
- `okrs/<id>/audit/events/<run>.jsonl` (the hash-chained activity log)

No live system access. No proprietary tooling. Just SHA-256. Four checks land the story:

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Check 1 · Chain replay</div>
    <div class="docs-heading">The chain still verifies</div>
    <div class="docs-copy">Recompute the SHA-256 chain over the JSONL. The result must match the <code>chain_root_hash</code> in the Hatter Tag. This is the same check the pre-merge <code>verify-chain</code> CI step ran before the artifact was allowed to merge. Same algorithm, same result, offline.</div>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Check 2 · Provenance</div>
    <div class="docs-heading">Every claim has a source</div>
    <div class="docs-copy">Every research finding, PRD requirement, or design decision traces back to a <code>skill_call</code> event in the audit log. No source = no claim. Maps directly to Forrester's Data Security domain.</div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Check 3 · Reproducibility</div>
    <div class="docs-heading">Replay the queries</div>
    <div class="docs-copy">Each search event carries its <code>payload.queries</code> verbatim. Re-running them six months later produces a comparable result set (subject to provider drift). Forrester Explainable Outcomes, on the cheap.</div>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Check 4 · Tamper detection</div>
    <div class="docs-heading">Modifications break the chain</div>
    <div class="docs-copy">Any edit to a past audit event breaks every subsequent <code>prev_event_hash</code>. Knight's Seal v1 (B27, shipped) also signs every event with the run's per-run Ed25519 keypair, so substitution attempts fail the signature check too. The runner refuses to verify a chain where signatures are present on some events and missing on others (partial-signature tampering).</div>
  </div>
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Check 5 · Deterministic emitter</div>
    <div class="docs-heading">The LLM did not write the log</div>
    <div class="docs-copy">Court Recorder Auto-Logging (B28, shipped) moves audit emission out of the agent's prompt and into the runner runtime + workflow. <code>skill_call</code> events are emitted inside <code>runSkill()</code> before the result returns to the agent. <code>artifact_written</code> events are emitted by the workflow from <code>git diff</code>. <code>self_review</code> events are parsed from structured PR-body blocks. The agent <strong>has no API to call</strong> and <strong>has nothing to skip</strong>. Trust shifts from "verify the chain after the fact" to "the emitter is provably not the LLM."</div>
  </div>
</div>

> 🍵 **This is what closes EU AI Act Article 12** (≥6 month retention; model + inputs + operator + timestamps; deadline 2 August 2026) and what makes **SOC 2 CC8.1** demonstrable on every artifact the pipeline produces. The auditor's offline check matches the pre-merge CI check. One algorithm. Two replays. One trustworthy record — produced by deterministic code, not by the LLM.

> 🎯 **Validated end-to-end (2026-05-22).** Phase A + Phase B both green on the IMDB-Celebs sample OKR — first two agents (`market-research-agent` and `prd-agent`) ran on Claude Sonnet 4.6 with every defense above firing on real merged PRs. Audit JSONLs in the open mesh repo show 19 events for WHY (PR&nbsp;#116, evidence_mode `mixed` honestly logging arXiv 429 + USPTO 404 + zero-result Hacker News searches), 13 events for HOW (PR&nbsp;#118, including the new B29 self-review provenance skills with `tier:supervised, should_proceed:true` — no tier hallucination). Both phases display the green 🛡 Sealed badge in Looking Glass; the chain-ladder file links the two phases via `parent_intent_thread`. The architecture's "the LLM cannot fabricate the audit log" claim is now a measured property of merged runs, not a design assertion.

### Honest gaps — what we will address

Every framework claim above has a status badge. This section names the **gaps that remain** — the ones we have not closed yet, with the named phase that will close each, and a clear distinction between "queued for a specific phase" and "research item, no committed date."

We publish this list publicly because honest design beats marketing claims, and because an executive reviewer reading the AEGIS / ASTRIDE tables above deserves to know exactly where each `🛠` or `⚠` lands on the roadmap.

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Highest impact</div>
    <div class="docs-heading">Prompt injection from external research</div>
    <div class="docs-copy">A Tavily / arXiv / HN result containing crafted prompt-injection text can manipulate the market-research-agent into following attacker-supplied instructions. Mitigation requires a sanitization layer on Skill outputs and an agent-prompt structure that explicitly partitions data from instructions. Research item; not in Phase B scope.</div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Phase B — planned next</div>
    <div class="docs-heading">Knight's Seal — Ed25519 signing</div>
    <div class="docs-copy">Phase A enforces author identity via GitHub App installation ID + system-prompt SHA stamped on every Hatter Tag. <strong>Knight's Seal v1 (B27 in the implementation plan) ships an ephemeral per-run Ed25519 keypair</strong> — generated at agent dispatch, signs the chain-root hash + final artifact SHA, public key + signature posted in the <code>artifact_written</code> audit event, private key destroyed at session end. CI verifies the signature before merge and blocks with <code>seal-broken</code> on mismatch. Looking Glass surfaces a <em>"Phase seal-checked ✓"</em> badge on each phase card so reviewers see the signature status without leaving the UI. <strong>Future evolution:</strong> persistent signing via cosign / sigstore so a third-party auditor can verify a year-old artifact without trusting the public key embedded in its own audit log.</div>
  </div>
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Future — cosign era</div>
    <div class="docs-heading">Prompt-pack signature verification</div>
    <div class="docs-copy">Packs deploy from the mesh template. Hatter Tag records the pack version and SHA on each run, so post-hoc auditing works — but a compromised template-repo committer can ship a malicious pack and we won't refuse to load it. <strong>Signed-pack-only deployment</strong> pairs with the cosign-anchored Knight's Seal evolution: both prompt packs and Hatter Tag signatures land in the same persistent-signing root of trust.</div>
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
