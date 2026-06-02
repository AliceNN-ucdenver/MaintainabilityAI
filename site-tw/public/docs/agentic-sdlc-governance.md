<div class="docs-hero docs-hero-split docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><span>Vision</span></div>
    <div class="docs-eyebrow">Vision · The agentic SDLC governance framework <span class="docs-hero-meta">Executive read + technical deep dive</span></div>
    <h1 class="docs-hero-title">An agentic governed SDLC</h1>
    <p class="docs-hero-copy">
      <strong>AI agents can move faster than the review process built for human teams.</strong> MaintainabilityAI makes that speed governable: every OKR becomes a signed trail of evidence, every phase has one human gate, and every artifact traces back to the business intent that approved it.
    </p>
    <p class="docs-hero-copy">
      The agent that produced an output is the one that signed it, with an ephemeral key only it ever held. No shared credentials. No mystery handoffs. One governance surface from intent to shipped code.
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


## Imagine a world

Imagine a world where you can ask "where did this design come from?" and get back a hash, a public key, and a verifiable chain back to the OKR your business approved last week. Not a hope. Not a model card. A cryptographic answer.

Now look at what most agentic systems actually deliver. Credentials reissued at every agent hop. Attribution dissolved. The chain of trust broken the moment a second agent touches the work. Audit becomes a guess. Compliance becomes a slide.

By 2026, the market question is not whether agents can write code. It is whether hybrid human-agent teams can be governed without slowing to a crawl. [Microsoft's 2026 Work Trend Index](https://www.microsoft.com/en-us/worklab/work-trend-index/agents-human-agency-and-the-opportunity-for-every-organization) frames the winning organization as human-led and agent-operated. [DORA's 2025 AI-assisted software delivery research](https://dora.dev/research/2025/dora-report/) is blunter: AI amplifies the organizational system underneath it. [Forrester's AEGIS framework](https://www.forrester.com/blogs/introducing-aegis-the-guardrails-cisos-need-for-the-agentic-enterprise/) says security now has to secure intent, provenance, and agent behavior, not just infrastructure.

The mesh you are about to see does not work that way.

**A stitched audit trail per OKR. One human gate per phase. Zero credential reissuance between agents.** Planning events live in the governance mesh; implementation events live in each target repo; the two halves stitch at the merge commit SHA. The agent that produced an output is the one that signed it, with an ephemeral key only it ever held. **Trust earned, not granted. Per agent, per session, per event.**

<svg viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="A stitched evidence chain from OKR to merged code. The Hatter signs each planning artifact in the top half, the Red Queen checks agent actions in the bottom half, the Cheshire Cat watches per-repo health, and a chain seam runs between them — planning events in the mesh, implementation events in each target repo, joined at the merge commit SHA, with zero credential reissuance between agents.">
  <defs>
    <linearGradient id="heroTopBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1138"/>
      <stop offset="100%" stop-color="#0f0a24"/>
    </linearGradient>
    <linearGradient id="heroBotBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a1828"/>
      <stop offset="100%" stop-color="#060f1c"/>
    </linearGradient>
    <linearGradient id="heroCup" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(196,181,253,0.32)"/>
      <stop offset="100%" stop-color="rgba(196,181,253,0.08)"/>
    </linearGradient>
    <linearGradient id="heroRepo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(125,211,252,0.28)"/>
      <stop offset="100%" stop-color="rgba(125,211,252,0.06)"/>
    </linearGradient>
    <linearGradient id="heroGate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(248,113,113,0.30)"/>
      <stop offset="100%" stop-color="rgba(248,113,113,0.08)"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="800" height="520" rx="12" fill="#06101a"/>
  <rect x="0" y="0" width="800" height="252" fill="url(#heroTopBg)"/>
  <text x="400" y="30" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="700" letter-spacing="3" font-family="system-ui, sans-serif">PLAN · THE HATTER (CHAIN SIGNER) SIGNS EACH ARTIFACT</text>
  <g transform="translate(40,58)">
    <rect x="0" y="0" width="220" height="178" rx="14" fill="url(#heroCup)" stroke="rgba(196,181,253,0.55)" stroke-width="1.5"/>
    <path d="M 70 30 Q 70 18 84 18 L 136 18 Q 150 18 150 30 L 150 60 Q 150 86 110 86 Q 70 86 70 60 Z" fill="rgba(196,181,253,0.22)" stroke="rgba(196,181,253,0.7)" stroke-width="1.4"/>
    <path d="M 150 38 Q 168 38 168 50 Q 168 62 150 62" fill="none" stroke="rgba(196,181,253,0.7)" stroke-width="1.4"/>
    <path d="M 88 12 Q 92 4 96 12" fill="none" stroke="rgba(196,181,253,0.55)" stroke-width="1.2"/>
    <path d="M 106 10 Q 110 2 114 10" fill="none" stroke="rgba(196,181,253,0.55)" stroke-width="1.2"/>
    <path d="M 124 12 Q 128 4 132 12" fill="none" stroke="rgba(196,181,253,0.55)" stroke-width="1.2"/>
    <text x="110" y="112" text-anchor="middle" fill="#ede9fe" font-size="13" font-weight="700" font-family="system-ui, sans-serif">Knowledge OKR</text>
    <text x="110" y="128" text-anchor="middle" fill="#a78bfa" font-size="9.5" font-weight="600" letter-spacing="1" font-family="system-ui, sans-serif">WHY PHASE · EPOCH 1</text>
    <rect x="32" y="142" width="156" height="22" rx="11" fill="rgba(196,181,253,0.14)" stroke="rgba(196,181,253,0.45)"/>
    <text x="110" y="157" text-anchor="middle" fill="#ddd6fe" font-size="9.5" font-weight="600" font-family="ui-monospace, Menlo, monospace">sig 0x7a4f...e9c2</text>
  </g>
  <g transform="translate(290,58)">
    <rect x="0" y="0" width="220" height="178" rx="14" fill="url(#heroCup)" stroke="rgba(196,181,253,0.55)" stroke-width="1.5"/>
    <path d="M 70 30 Q 70 18 84 18 L 136 18 Q 150 18 150 30 L 150 60 Q 150 86 110 86 Q 70 86 70 60 Z" fill="rgba(196,181,253,0.22)" stroke="rgba(196,181,253,0.7)" stroke-width="1.4"/>
    <path d="M 150 38 Q 168 38 168 50 Q 168 62 150 62" fill="none" stroke="rgba(196,181,253,0.7)" stroke-width="1.4"/>
    <path d="M 88 12 Q 92 4 96 12" fill="none" stroke="rgba(196,181,253,0.55)" stroke-width="1.2"/>
    <path d="M 106 10 Q 110 2 114 10" fill="none" stroke="rgba(196,181,253,0.55)" stroke-width="1.2"/>
    <path d="M 124 12 Q 128 4 132 12" fill="none" stroke="rgba(196,181,253,0.55)" stroke-width="1.2"/>
    <text x="110" y="112" text-anchor="middle" fill="#ede9fe" font-size="13" font-weight="700" font-family="system-ui, sans-serif">Product Spec</text>
    <text x="110" y="128" text-anchor="middle" fill="#a78bfa" font-size="9.5" font-weight="600" letter-spacing="1" font-family="system-ui, sans-serif">HOW PHASE · EPOCH 2</text>
    <rect x="32" y="142" width="156" height="22" rx="11" fill="rgba(196,181,253,0.14)" stroke="rgba(196,181,253,0.45)"/>
    <text x="110" y="157" text-anchor="middle" fill="#ddd6fe" font-size="9.5" font-weight="600" font-family="ui-monospace, Menlo, monospace">sig 0xb1c8...3da6</text>
  </g>
  <g transform="translate(540,58)">
    <rect x="0" y="0" width="220" height="178" rx="14" fill="url(#heroCup)" stroke="rgba(196,181,253,0.55)" stroke-width="1.5"/>
    <path d="M 70 30 Q 70 18 84 18 L 136 18 Q 150 18 150 30 L 150 60 Q 150 86 110 86 Q 70 86 70 60 Z" fill="rgba(196,181,253,0.22)" stroke="rgba(196,181,253,0.7)" stroke-width="1.4"/>
    <path d="M 150 38 Q 168 38 168 50 Q 168 62 150 62" fill="none" stroke="rgba(196,181,253,0.7)" stroke-width="1.4"/>
    <path d="M 88 12 Q 92 4 96 12" fill="none" stroke="rgba(196,181,253,0.55)" stroke-width="1.2"/>
    <path d="M 106 10 Q 110 2 114 10" fill="none" stroke="rgba(196,181,253,0.55)" stroke-width="1.2"/>
    <path d="M 124 12 Q 128 4 132 12" fill="none" stroke="rgba(196,181,253,0.55)" stroke-width="1.2"/>
    <text x="110" y="112" text-anchor="middle" fill="#ede9fe" font-size="13" font-weight="700" font-family="system-ui, sans-serif">Code Design</text>
    <text x="110" y="128" text-anchor="middle" fill="#a78bfa" font-size="9.5" font-weight="600" letter-spacing="1" font-family="system-ui, sans-serif">WHAT PHASE · EPOCH 3</text>
    <rect x="32" y="142" width="156" height="22" rx="11" fill="rgba(196,181,253,0.14)" stroke="rgba(196,181,253,0.45)"/>
    <text x="110" y="157" text-anchor="middle" fill="#ddd6fe" font-size="9.5" font-weight="600" font-family="ui-monospace, Menlo, monospace">sig 0xf3a0...8b41</text>
  </g>
  <rect x="0" y="252" width="800" height="42" fill="rgba(99,102,241,0.07)"/>
  <line x1="40" y1="273" x2="200" y2="273" stroke="rgba(165,180,252,0.4)" stroke-width="1.4" stroke-dasharray="3 4"/>
  <line x1="270" y1="273" x2="380" y2="273" stroke="rgba(165,180,252,0.4)" stroke-width="1.4" stroke-dasharray="3 4"/>
  <line x1="450" y1="273" x2="560" y2="273" stroke="rgba(165,180,252,0.4)" stroke-width="1.4" stroke-dasharray="3 4"/>
  <line x1="630" y1="273" x2="760" y2="273" stroke="rgba(165,180,252,0.4)" stroke-width="1.4" stroke-dasharray="3 4"/>
  <g transform="translate(225,273)">
    <ellipse cx="0" cy="0" rx="14" ry="8" fill="none" stroke="#c4b5fd" stroke-width="2.4"/>
    <ellipse cx="20" cy="0" rx="14" ry="8" fill="none" stroke="#7dd3fc" stroke-width="2.4"/>
  </g>
  <g transform="translate(405,273)">
    <ellipse cx="0" cy="0" rx="14" ry="8" fill="none" stroke="#c4b5fd" stroke-width="2.4"/>
    <ellipse cx="20" cy="0" rx="14" ry="8" fill="none" stroke="#7dd3fc" stroke-width="2.4"/>
  </g>
  <g transform="translate(585,273)">
    <ellipse cx="0" cy="0" rx="14" ry="8" fill="none" stroke="#c4b5fd" stroke-width="2.4"/>
    <ellipse cx="20" cy="0" rx="14" ry="8" fill="none" stroke="#7dd3fc" stroke-width="2.4"/>
  </g>
  <text x="400" y="290" text-anchor="middle" fill="#a5b4fc" font-size="10" font-weight="700" letter-spacing="3" font-family="system-ui, sans-serif">EPOCH-SIGNED HANDOFF · ZERO CREDENTIAL REISSUANCE</text>
  <rect x="0" y="294" width="800" height="226" fill="url(#heroBotBg)"/>
  <text x="400" y="320" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="700" letter-spacing="3" font-family="system-ui, sans-serif">ENFORCE · THE RED QUEEN (ACTION GATE) · THE CHESHIRE CAT (REPO HEALTH)</text>
  <g transform="translate(40,340)">
    <rect x="0" y="0" width="106" height="72" rx="9" fill="url(#heroRepo)" stroke="rgba(125,211,252,0.55)"/>
    <text x="53" y="20" text-anchor="middle" fill="#e0f2fe" font-size="10" font-weight="700" font-family="system-ui, sans-serif">api-auth</text>
    <text x="53" y="40" text-anchor="middle" fill="#7dd3fc" font-size="18" font-weight="800" font-family="system-ui, sans-serif">87</text>
    <text x="53" y="54" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">arch · sec · risk · ops</text>
    <text x="53" y="66" text-anchor="middle" fill="#86efac" font-size="9" font-weight="700" font-family="system-ui, sans-serif">Sealed</text>
    <circle cx="88" cy="11" r="2.2" fill="#fcd34d"/>
    <circle cx="96" cy="11" r="2.2" fill="#fcd34d"/>
  </g>
  <g transform="translate(156,340)">
    <rect x="0" y="0" width="106" height="72" rx="9" fill="url(#heroRepo)" stroke="rgba(125,211,252,0.55)"/>
    <text x="53" y="20" text-anchor="middle" fill="#e0f2fe" font-size="10" font-weight="700" font-family="system-ui, sans-serif">orders-svc</text>
    <text x="53" y="40" text-anchor="middle" fill="#7dd3fc" font-size="18" font-weight="800" font-family="system-ui, sans-serif">72</text>
    <text x="53" y="54" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">arch · sec · risk · ops</text>
    <text x="53" y="66" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="700" font-family="system-ui, sans-serif">Drift +2</text>
    <circle cx="88" cy="11" r="2.2" fill="#fcd34d"/>
    <circle cx="96" cy="11" r="2.2" fill="#fcd34d"/>
  </g>
  <g transform="translate(272,340)">
    <rect x="0" y="0" width="106" height="72" rx="9" fill="url(#heroRepo)" stroke="rgba(125,211,252,0.55)"/>
    <text x="53" y="20" text-anchor="middle" fill="#e0f2fe" font-size="10" font-weight="700" font-family="system-ui, sans-serif">web-ui</text>
    <text x="53" y="40" text-anchor="middle" fill="#7dd3fc" font-size="18" font-weight="800" font-family="system-ui, sans-serif">91</text>
    <text x="53" y="54" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">arch · sec · risk · ops</text>
    <text x="53" y="66" text-anchor="middle" fill="#86efac" font-size="9" font-weight="700" font-family="system-ui, sans-serif">Sealed</text>
    <circle cx="88" cy="11" r="2.2" fill="#fcd34d"/>
    <circle cx="96" cy="11" r="2.2" fill="#fcd34d"/>
  </g>
  <g transform="translate(388,340)">
    <rect x="0" y="0" width="106" height="72" rx="9" fill="url(#heroRepo)" stroke="rgba(125,211,252,0.55)"/>
    <text x="53" y="20" text-anchor="middle" fill="#e0f2fe" font-size="10" font-weight="700" font-family="system-ui, sans-serif">data-mesh</text>
    <text x="53" y="40" text-anchor="middle" fill="#7dd3fc" font-size="18" font-weight="800" font-family="system-ui, sans-serif">79</text>
    <text x="53" y="54" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">arch · sec · risk · ops</text>
    <text x="53" y="66" text-anchor="middle" fill="#86efac" font-size="9" font-weight="700" font-family="system-ui, sans-serif">Sealed</text>
    <circle cx="88" cy="11" r="2.2" fill="#fcd34d"/>
    <circle cx="96" cy="11" r="2.2" fill="#fcd34d"/>
  </g>
  <text x="60" y="432" fill="#7dd3fc" font-size="10" font-weight="700" letter-spacing="2" font-family="system-ui, sans-serif">CHESHIRE · PER-REPO HEALTH AT A GLANCE</text>
  <text x="60" y="448" fill="#94a3b8" font-size="9.5" font-family="system-ui, sans-serif">Four pillars (architecture, security, risk, operations) scored from artifacts.</text>
  <g transform="translate(520,340)">
    <rect x="0" y="0" width="240" height="138" rx="11" fill="url(#heroGate)" stroke="rgba(248,113,113,0.55)"/>
    <text x="120" y="22" text-anchor="middle" fill="#fda4af" font-size="10" font-weight="700" letter-spacing="2.5" font-family="system-ui, sans-serif">RED QUEEN · ACTION GATE</text>
    <rect x="42" y="42" width="8" height="60" rx="2" fill="rgba(248,113,113,0.65)"/>
    <rect x="190" y="42" width="8" height="60" rx="2" fill="rgba(248,113,113,0.65)"/>
    <rect x="42" y="42" width="156" height="8" rx="2" fill="rgba(248,113,113,0.65)"/>
    <rect x="68" y="64" width="104" height="24" rx="12" fill="rgba(74,222,128,0.18)" stroke="rgba(74,222,128,0.55)"/>
    <text x="120" y="80" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">chain verified</text>
    <text x="120" y="118" text-anchor="middle" fill="#fda4af" font-size="9" font-family="system-ui, sans-serif">deny by default · seven deterministic rails</text>
  </g>
  <text x="640" y="498" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">Hatter signs · Red Queen blocks actions · CI hard gate next</text>
  <rect x="0" y="504" width="800" height="16" fill="rgba(165,180,252,0.10)"/>
  <text x="400" y="516" text-anchor="middle" fill="#a5b4fc" font-size="9.5" font-weight="700" letter-spacing="4" font-family="system-ui, sans-serif">STITCHED EVIDENCE CHAIN · OKR TO MERGED CODE</text>
</svg>

### Three promises, plainly stated

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Promise 1</div>
    <div class="docs-heading">One stitched audit trail per OKR</div>
    <div class="docs-copy">Every artifact (research, product spec, code design) is signed by the agent that produced it, with an ephemeral Ed25519 keypair generated for that session alone. Per-epoch keys mean even revise rounds sign with a fresh key. The planning chain lives in the mesh and each implementation chain in its target repo, stitched at the merge commit SHA; the Oracle rail verdicts over the evidence are replayed, not signed. It all verifies end to end, from objective to merged pull request.</div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Promise 2</div>
    <div class="docs-heading">One human gate per phase</div>
    <div class="docs-copy">Three deliberate human decisions per OKR. Approve the WHY. Approve the HOW. Approve the WHAT. No more, no less. Your team's calendar stays sane while every agent decision in between stays auditable, attributable, and reversible.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Promise 3</div>
    <div class="docs-heading">Zero credential reissuance between agents</div>
    <div class="docs-copy">No agent ever gets handed another agent's keys. No proxy auth, no impersonation, no shared service account. The handoff between agents is the signature itself, verifiable by anyone with the public chain. The chain of trust never breaks at a hop.</div>
  </div>
</div>

### Seventy percent and thirty percent

The frontier team is no longer one developer with a faster autocomplete. It is a human setting intent, a mesh turning that intent into repeatable constraints, and agents doing the parts that are cheap to scale.

Agents do 70 percent of the work well. Drafting, searching, synthesizing, comparing sources, generating structured outputs, running in parallel.

Humans do 30 percent of the work better. Setting intent. Deciding what good looks like. Modeling threats. Choosing fitness ratchets. Writing the architecture decision that says "we don't do that, here's why."

The trap most agentic systems fall into is asking humans to do the 30 percent live, in the loop, on every run. That is how you choke agent speed with human latency.

**The mesh inverts it.** Your team captures the 30 percent once, as code. Architecture as code. Threats as code. Fitness functions as code. Risk assessments as code. ADRs explaining why.

**Thirty percent of human judgment, running at one hundred percent of agent speed.**

That is the difference between a pile of coding assistants and a governed hybrid team. The LLM synthesizes. The deterministic skills prove. The human owns the judgment. The audit chain remembers which is which.

<svg viewBox="0 0 800 230" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="Seventy percent of work done well by agents, thirty percent done better by humans and captured as code so the mesh inherits human judgment.">
  <defs>
    <linearGradient id="seventyThirtyBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="230" rx="12" fill="url(#seventyThirtyBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#818cf8" font-size="11" font-weight="700" letter-spacing="3" font-family="system-ui, sans-serif">70 / 30 · WHO DOES WHAT WELL, AND WHO CAPTURES IT</text>
  <rect x="24" y="48" width="380" height="60" rx="10" fill="rgba(125,211,252,0.12)" stroke="rgba(125,211,252,0.4)"/>
  <text x="44" y="80" fill="#7dd3fc" font-size="26" font-weight="800" font-family="system-ui, sans-serif">70%</text>
  <text x="120" y="76" fill="#e2e8f0" font-size="13" font-weight="700" font-family="system-ui, sans-serif">AGENTS do this well</text>
  <text x="120" y="96" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">drafting · searching · synthesizing · comparing</text>
  <rect x="24" y="116" width="184" height="26" rx="6" fill="rgba(125,211,252,0.07)" stroke="rgba(125,211,252,0.18)"/>
  <text x="116" y="133" text-anchor="middle" fill="#bae6fd" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Draft + research</text>
  <rect x="216" y="116" width="188" height="26" rx="6" fill="rgba(125,211,252,0.07)" stroke="rgba(125,211,252,0.18)"/>
  <text x="310" y="133" text-anchor="middle" fill="#bae6fd" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Synthesize + compare</text>
  <rect x="24" y="150" width="380" height="26" rx="6" fill="rgba(125,211,252,0.07)" stroke="rgba(125,211,252,0.18)"/>
  <text x="214" y="167" text-anchor="middle" fill="#bae6fd" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Generate structured output in parallel</text>
  <line x1="412" y1="48" x2="412" y2="200" stroke="rgba(148,163,184,0.18)" stroke-width="1" stroke-dasharray="4"/>
  <rect x="420" y="48" width="356" height="60" rx="10" fill="rgba(196,181,253,0.12)" stroke="rgba(196,181,253,0.4)"/>
  <text x="440" y="80" fill="#c4b5fd" font-size="26" font-weight="800" font-family="system-ui, sans-serif">30%</text>
  <text x="516" y="76" fill="#e2e8f0" font-size="13" font-weight="700" font-family="system-ui, sans-serif">HUMANS do this better</text>
  <text x="516" y="96" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">intent · threats · fitness · decisions</text>
  <rect x="420" y="116" width="172" height="26" rx="6" fill="rgba(196,181,253,0.07)" stroke="rgba(196,181,253,0.18)"/>
  <text x="506" y="133" text-anchor="middle" fill="#ddd6fe" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Architecture as code</text>
  <rect x="604" y="116" width="172" height="26" rx="6" fill="rgba(196,181,253,0.07)" stroke="rgba(196,181,253,0.18)"/>
  <text x="690" y="133" text-anchor="middle" fill="#ddd6fe" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Threats as code</text>
  <rect x="420" y="150" width="172" height="26" rx="6" fill="rgba(196,181,253,0.07)" stroke="rgba(196,181,253,0.18)"/>
  <text x="506" y="167" text-anchor="middle" fill="#ddd6fe" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Fitness functions</text>
  <rect x="604" y="150" width="172" height="26" rx="6" fill="rgba(196,181,253,0.07)" stroke="rgba(196,181,253,0.18)"/>
  <text x="690" y="167" text-anchor="middle" fill="#ddd6fe" font-size="10" font-weight="600" font-family="system-ui, sans-serif">ADRs with rationale</text>
  <rect x="100" y="196" width="600" height="22" rx="11" fill="rgba(165,180,252,0.18)" stroke="rgba(165,180,252,0.5)"/>
  <text x="400" y="211" text-anchor="middle" fill="#c7d2fe" font-size="11" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">MESH · 30% OF HUMAN JUDGMENT · 100% OF AGENT SPEED</text>
</svg>


<div class="docs-center-block">
<div class="docs-heading">This is the way: a governed evidence pipeline, not a loop</div>
<div class="docs-copy">Five lifecycle stages × four parallel rails (judgment · evidence · audit · governance) × a stitched evidence chain underneath. <strong>OKR → WHY → HOW → WHAT ships today, and BUILD fan-out shipped via the in-extension FanOutEngine.</strong> Planning lives in the mesh, implementation lives in each target repo, and the two are stitched at the merge commit. The full rail map sits in <a href="#how-we-keep-the-promises">How we keep the promises</a> below.</div>
</div>

## A Monday morning

It is Monday morning. A product leader writes one sentence into the mesh. "Let customers see their order status in one click, without exposing other accounts."

By Monday afternoon, the mesh has run four kinds of research in parallel. What the web is saying about the topic right now. What academic researchers have proven. What incumbents have patented. What working developers complain about. Sixteen sources, cross-checked against each other, gaps closed. The research draft is signed by the agent that produced it, with a key only it ever held. You read it. You approve.

Tuesday morning, the mesh writes the product spec. It asks clarifying questions anchored in your team's existing architecture, your existing threats, your existing decisions. The spec comes back with every requirement tied to a real constraint. Signed by a different agent, with a different key. You read it. You approve.

Tuesday afternoon, the mesh writes the code design. It reads the actual repositories the work will touch. It checks the design against your architecture rules. It flags drift before it ships. Signed by a third agent, with a third key. You read it. You approve.

**Tuesday evening, the design becomes repo work.** Looking Glass shows a pre-flight checklist for every target repo. Is this an existing repo? A new one? Waiting for another repo to land first? Ready rows can fan out immediately. Rows that need setup route through the owning BAR and Cheshire scaffold flow, so repo creation and harness setup happen in the place that already knows the system.

When you approve the ready rows, Looking Glass opens a landing issue in each repo. Each issue carries the repo's slice of the design, the OKR's governance tier, and the links back to the planning evidence. The implementation agent then works inside that repo, signs its own events, and reviews its work as Architect and Security before opening a pull request. The Red Queen checks risky tool actions before they run, blocks actions that violate the architecture, and records any approved override with the rule and approval source. The pull request carries the link back to the planning chain in the mesh.

By Wednesday morning, the work is in main. As each implementation PR merges, Looking Glass fetches that repo's audit events at the merge commit SHA, verifies they exist there, and stamps a row on the mesh's chain ladder with that SHA on it. Behind the merged code: a stitched evidence chain — three planning signatures in the mesh, one implementation signature per repo, every rung joined by a commit hash, and one human approval per planning phase plus one per fan-out dispatch.[^cert5] If anyone asks where any of it came from, you don't have to guess.

**The work happened. You read the receipts.**

[^cert5]: Numbers from cert run 5, May 2026, on the IMDB-Lite sample. Your numbers will vary as the mesh scales to more agents and bigger repos.


## Your team in this world

Agentic engineering reshapes who sits at the table. The keyboard is no longer the bottleneck. The bottleneck is intent, judgment, the architecture decisions that say "we don't do that, here's why," and the engineering craft that makes those decisions enforceable in milliseconds. Four human roles do the work the agents cannot, and a Jr seat rotates through the senior chairs so the bench keeps deepening.

<svg viewBox="0 0 800 540" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="Agentic team composition. Four human roles at the top set intent, curate the mesh, and own the harness. The mesh in the middle holds the Hatter, the Red Queen, the Cheshire Cat, the Caterpillar, and the Pocket Watch. Agents at the bottom execute in parallel against the repos.">
  <defs>
    <linearGradient id="teamBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#070d18"/>
    </linearGradient>
    <linearGradient id="teamHuman" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(165,180,252,0.30)"/>
      <stop offset="100%" stop-color="rgba(165,180,252,0.08)"/>
    </linearGradient>
    <linearGradient id="teamMesh" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(125,211,252,0.20)"/>
      <stop offset="100%" stop-color="rgba(125,211,252,0.05)"/>
    </linearGradient>
    <linearGradient id="teamAgent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(196,181,253,0.26)"/>
      <stop offset="100%" stop-color="rgba(196,181,253,0.06)"/>
    </linearGradient>
    <marker id="teamArrowDown" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc"/>
    </marker>
    <marker id="teamArrowUp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#86efac"/>
    </marker>
  </defs>
  <rect width="800" height="540" rx="12" fill="url(#teamBg)"/>
  <text x="400" y="30" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" letter-spacing="3" font-family="system-ui, sans-serif">AGENTIC TEAM · WHO SITS AT THE TABLE</text>
  <text x="20" y="62" fill="#c7d2fe" font-size="10" font-weight="700" letter-spacing="2" font-family="system-ui, sans-serif">HUMANS · SET INTENT, CURATE THE MESH, OWN THE HARNESS</text>
  <g transform="translate(18,76)">
    <rect x="0" y="0" width="180" height="120" rx="10" fill="url(#teamHuman)" stroke="rgba(165,180,252,0.55)" stroke-width="1.4"/>
    <text x="90" y="22" text-anchor="middle" fill="#ede9fe" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Agentic Team Orchestrator</text>
    <text x="90" y="40" text-anchor="middle" fill="#a5b4fc" font-size="9" letter-spacing="1" font-family="system-ui, sans-serif">replaces Scrum Master</text>
    <text x="14" y="62" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• owns OKR intent flow</text>
    <text x="14" y="78" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• approves the three gates</text>
    <text x="14" y="94" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• closes the stakeholder loop</text>
    <text x="14" y="112" fill="#94a3b8" font-size="8.5" font-style="italic" font-family="system-ui, sans-serif">one per team · player-coach</text>
  </g>
  <g transform="translate(213,76)">
    <rect x="0" y="0" width="180" height="120" rx="10" fill="url(#teamHuman)" stroke="rgba(165,180,252,0.55)" stroke-width="1.4"/>
    <text x="90" y="22" text-anchor="middle" fill="#ede9fe" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Software Architect</text>
    <text x="90" y="40" text-anchor="middle" fill="#a5b4fc" font-size="9" letter-spacing="1" font-family="system-ui, sans-serif">Mesh Steward</text>
    <text x="14" y="62" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• curates ADRs · CALM · threats</text>
    <text x="14" y="78" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• defines the fitness functions</text>
    <text x="14" y="94" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• reads designs for appetite</text>
    <text x="14" y="112" fill="#94a3b8" font-size="8.5" font-style="italic" font-family="system-ui, sans-serif">the 30% as code is their craft</text>
  </g>
  <g transform="translate(408,76)">
    <rect x="0" y="0" width="180" height="120" rx="10" fill="url(#teamHuman)" stroke="rgba(165,180,252,0.55)" stroke-width="1.4"/>
    <text x="90" y="22" text-anchor="middle" fill="#ede9fe" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Agentic Platform Engineer</text>
    <text x="90" y="40" text-anchor="middle" fill="#a5b4fc" font-size="9" letter-spacing="1" font-family="system-ui, sans-serif">Harness Steward</text>
    <text x="14" y="62" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• owns .agent.md + workflows</text>
    <text x="14" y="78" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• wires CI + quality gates</text>
    <text x="14" y="94" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• keeps the runtime pinned</text>
    <text x="14" y="112" fill="#94a3b8" font-size="8.5" font-style="italic" font-family="system-ui, sans-serif">the harness is their craft</text>
  </g>
  <g transform="translate(603,76)">
    <rect x="0" y="0" width="180" height="120" rx="10" fill="url(#teamHuman)" stroke="rgba(165,180,252,0.55)" stroke-width="1.4"/>
    <text x="90" y="22" text-anchor="middle" fill="#ede9fe" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Jr Agentic Architect</text>
    <text x="90" y="40" text-anchor="middle" fill="#a5b4fc" font-size="9" letter-spacing="1" font-family="system-ui, sans-serif">rotational seat</text>
    <text x="14" y="62" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• rotates through any chair</text>
    <text x="14" y="78" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• learns by writing artifacts</text>
    <text x="14" y="94" fill="#cbd5e1" font-size="8.5" font-family="system-ui, sans-serif">• tomorrow's senior bench</text>
    <text x="14" y="112" fill="#94a3b8" font-size="8.5" font-style="italic" font-family="system-ui, sans-serif">2 quarters on, back to product</text>
  </g>
  <line x1="108" y1="200" x2="108" y2="232" stroke="#a5b4fc" stroke-width="1.4" marker-end="url(#teamArrowDown)"/>
  <line x1="303" y1="200" x2="303" y2="232" stroke="#a5b4fc" stroke-width="1.4" marker-end="url(#teamArrowDown)"/>
  <line x1="498" y1="200" x2="498" y2="232" stroke="#a5b4fc" stroke-width="1.4" marker-end="url(#teamArrowDown)"/>
  <line x1="693" y1="200" x2="693" y2="232" stroke="#a5b4fc" stroke-width="1.4" marker-end="url(#teamArrowDown)"/>
  <text x="20" y="226" fill="#7dd3fc" font-size="10" font-weight="700" letter-spacing="2" font-family="system-ui, sans-serif">MESH · CARRIES INTENT, SIGNS WORK</text>
  <rect x="28" y="240" width="744" height="120" rx="10" fill="url(#teamMesh)" stroke="rgba(125,211,252,0.55)" stroke-width="1.4"/>
  <text x="80" y="266" text-anchor="middle" fill="#ddd6fe" font-size="10" font-weight="700" font-family="system-ui, sans-serif">the Hatter</text>
  <text x="80" y="280" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">chain signer</text>
  <text x="220" y="266" text-anchor="middle" fill="#fda4af" font-size="10" font-weight="700" font-family="system-ui, sans-serif">the Red Queen</text>
  <text x="220" y="280" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">action gate</text>
  <text x="360" y="266" text-anchor="middle" fill="#fcd34d" font-size="10" font-weight="700" font-family="system-ui, sans-serif">the Cheshire Cat</text>
  <text x="360" y="280" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">per-repo health</text>
  <text x="500" y="266" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">the Caterpillar</text>
  <text x="500" y="280" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">cross-phase drift</text>
  <text x="640" y="266" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700" font-family="system-ui, sans-serif">the Pocket Watch</text>
  <text x="640" y="280" text-anchor="middle" fill="#94a3b8" font-size="8" font-family="system-ui, sans-serif">goal drift gate</text>
  <line x1="60" y1="296" x2="720" y2="296" stroke="rgba(125,211,252,0.25)" stroke-width="1" stroke-dasharray="3 3"/>
  <text x="400" y="318" text-anchor="middle" fill="#bae6fd" font-size="10" font-weight="600" font-family="system-ui, sans-serif">CALM architecture · STRIDE threats · NIST controls · ADRs · fitness functions</text>
  <text x="400" y="338" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">human judgment captured once, applied to every agent run</text>
  <line x1="200" y1="364" x2="200" y2="394" stroke="#86efac" stroke-width="1.4" marker-end="url(#teamArrowDown)"/>
  <line x1="400" y1="364" x2="400" y2="394" stroke="#86efac" stroke-width="1.4" marker-end="url(#teamArrowDown)"/>
  <line x1="600" y1="364" x2="600" y2="394" stroke="#86efac" stroke-width="1.4" marker-end="url(#teamArrowDown)"/>
  <text x="20" y="390" fill="#c4b5fd" font-size="10" font-weight="700" letter-spacing="2" font-family="system-ui, sans-serif">AGENTS · EXECUTE IN PARALLEL</text>
  <g transform="translate(28,402)">
    <rect x="0" y="0" width="174" height="74" rx="9" fill="url(#teamAgent)" stroke="rgba(196,181,253,0.5)"/>
    <text x="87" y="22" text-anchor="middle" fill="#ede9fe" font-size="11" font-weight="700" font-family="system-ui, sans-serif">market-research-agent</text>
    <text x="87" y="40" text-anchor="middle" fill="#a78bfa" font-size="9" font-family="system-ui, sans-serif">epoch 1 · WHY</text>
    <text x="87" y="60" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">four oracles in parallel</text>
  </g>
  <g transform="translate(214,402)">
    <rect x="0" y="0" width="174" height="74" rx="9" fill="url(#teamAgent)" stroke="rgba(196,181,253,0.5)"/>
    <text x="87" y="22" text-anchor="middle" fill="#ede9fe" font-size="11" font-weight="700" font-family="system-ui, sans-serif">prd-agent</text>
    <text x="87" y="40" text-anchor="middle" fill="#a78bfa" font-size="9" font-family="system-ui, sans-serif">epoch 2 · HOW</text>
    <text x="87" y="60" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">mesh-anchored experts</text>
  </g>
  <g transform="translate(400,402)">
    <rect x="0" y="0" width="174" height="74" rx="9" fill="url(#teamAgent)" stroke="rgba(196,181,253,0.5)"/>
    <text x="87" y="22" text-anchor="middle" fill="#ede9fe" font-size="11" font-weight="700" font-family="system-ui, sans-serif">code-design-agent</text>
    <text x="87" y="40" text-anchor="middle" fill="#a78bfa" font-size="9" font-family="system-ui, sans-serif">epoch 3 · WHAT</text>
    <text x="87" y="60" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">grounded in every repo</text>
  </g>
  <g transform="translate(586,402)">
    <rect x="0" y="0" width="186" height="74" rx="9" fill="url(#teamAgent)" stroke="rgba(196,181,253,0.5)"/>
    <text x="93" y="22" text-anchor="middle" fill="#ede9fe" font-size="11" font-weight="700" font-family="system-ui, sans-serif">coding agents</text>
    <text x="93" y="40" text-anchor="middle" fill="#a78bfa" font-size="9" font-family="system-ui, sans-serif">in target repos</text>
    <text x="93" y="60" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">deterministic rails per tool call</text>
  </g>
  <rect x="0" y="494" width="800" height="46" fill="rgba(165,180,252,0.10)"/>
  <text x="400" y="514" text-anchor="middle" fill="#c7d2fe" font-size="11" font-weight="700" letter-spacing="3" font-family="system-ui, sans-serif">TEAMS CHANGE · OKRs MULTIPLY · IMPACT COMPOUNDS</text>
  <text x="400" y="530" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">2026 shift: smaller OKR-aligned capability teams, more of them, more experiments fixed capacity would never have prioritized.</text>
</svg>

The diagram is the structure. The **Orchestrator** owns OKR intent and the three human gates, replacing the Scrum Master role in agentic teams. The **Software Architect** writes the rules: CALM, STRIDE, ADRs, fitness function definitions. The **Agentic Platform Engineer** wires those rules into reality: the `.agent.md` packs, workflow YAMLs, finalize composite, and the CI gates that fail the build when somebody violates a rule the Architect wrote. The **Jr Agentic Architect** rotates through either senior chair on a two-quarter cadence, learning the craft by writing the artifacts a signed audit chain will preserve.

**Different teams weight these seats differently.** Greenfield platform work tilts toward the Architect, where most of the week is curating the mesh and naming the threats the agents will navigate. Brownfield reliability and high-throughput shipping tilt toward the Platform Engineer, where most of the week is hardening rails, tightening CI gates, and keeping the harness honest under load. *The four-seat structure stays the same*; what changes is whose chair the OKR's center of gravity sits over this quarter.

<div class="docs-card docs-card-amber">
  <div class="docs-card-kicker">Capacity shift</div>
  <div class="docs-heading">More OKRs in flight, the same bench</div>
  <div class="docs-copy">The four roles describe who sits on each team. The bigger shift is how many teams the same bench can run. Capacity stops being a tax on ambition. The headcount that used to staff one large feature team can now stand up several smaller, OKR-aligned capability teams in parallel. Experiments that never cleared the prioritization bar under fixed capacity finally get a path. Each team inherits the same mesh, the same signed audit chain, the same governance posture; what changes is how many bets are in flight at once and how fast the portfolio can rotate. The frontier organization is not the one with the most engineers. It is the one with the most OKRs it can govern at once.</div>
</div>

> **2026 market signal.** Microsoft's Work Trend Index says the frontier shift is human-led, agent-operated work. DORA says AI amplifies the organizational system underneath it. Forrester AEGIS says security leaders now have to secure intent, provenance, and machine-speed agent behavior. The mesh is what makes that shift governable instead of chaotic.


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
  <rect x="56" y="250" width="318" height="22" rx="6" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.25)"/>
  <text x="215" y="265" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">Why · Market research (4 oracles + gap loop)</text>
  <rect x="56" y="275" width="318" height="18" rx="5" fill="rgba(251,191,36,0.10)" stroke="rgba(251,191,36,0.35)"/>
  <text x="215" y="287" text-anchor="middle" fill="#fcd34d" font-size="8.5" font-family="system-ui, sans-serif">↳ Oracle Rails · PII + injection gate · groundedness (advisory)</text>
  <rect x="56" y="296" width="318" height="20" rx="6" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.25)"/>
  <text x="215" y="310" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">How · PRD (mesh-grounded gate · ask-experts)</text>
  <rect x="56" y="318" width="318" height="20" rx="6" fill="rgba(165,180,252,0.10)" stroke="rgba(165,180,252,0.25)"/>
  <text x="215" y="332" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">What · Code Design (code-grounded heavy gate)</text>
  <text x="215" y="350" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">Hatter's Tag · Audit Report Export · replay-verified rails</text>
  <rect x="410" y="200" width="350" height="156" rx="10" fill="url(#rqGrad)" stroke="rgba(244,114,182,0.45)"/>
  <text x="585" y="222" text-anchor="middle" fill="#f9a8d4" font-size="12" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">RED QUEEN'S COURT · ENFORCE</text>
  <text x="585" y="240" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Governs action inside code repos</text>
  <rect x="426" y="252" width="318" height="22" rx="6" fill="rgba(244,114,182,0.10)" stroke="rgba(244,114,182,0.25)"/>
  <text x="585" y="267" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">PreToolUse hooks · ms inline blocking</text>
  <rect x="426" y="278" width="318" height="22" rx="6" fill="rgba(244,114,182,0.10)" stroke="rgba(244,114,182,0.25)"/>
  <text x="585" y="293" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">MCP validate_action · deterministic policy</text>
  <rect x="426" y="304" width="318" height="22" rx="6" fill="rgba(244,114,182,0.10)" stroke="rgba(244,114,182,0.25)"/>
  <text x="585" y="319" text-anchor="middle" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">CI required status check (Queen&rsquo;s Next Act)</text>
  <text x="585" y="343" text-anchor="middle" fill="#94a3b8" font-size="9" font-style="italic" font-family="system-ui, sans-serif">allow · deny · override logged</text>
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


## Meet the two modalities

Two roles, one control plane, every artifact audit-chained from intent to shipped code. The Hatter governs **before** code is written: the human leading the agentic SDLC sees what their initiative will touch, and the agents executing see the same map. The Red Queen governs **while** code is written: each agent action checked against the architecture deterministically. **For a CIO, this is spending control on what gets built. For a CIRO, it's explainability of every regulated decision. For a CISO, it's threat-model coverage that doesn't collapse the moment agents accelerate.**

<div class="docs-flex-block">
  <img src="/images/tea-party.png" alt="The Hatter's Tea Party, host of the planning modality" class="docs-inline-image" />
  <div>
    <div class="docs-card-kicker" style="color:#a5b4fc">🎩 Plan · upstream of code</div>
    <div class="docs-heading">The Hatter's Tea Party</div>
    <p class="docs-copy">Turn an OKR into a code-grounded design, with provenance every reviewer can verify. The Hatter takes a one-line intent, grounds it in evidence, runs it past mesh-anchored experts, and lands a cross-cutting design that's been reviewed against the actual repos it will change. It reads real file contents from each brownfield repo, so the design cites paths that exist and quotes code the agent actually saw.</p>
    <ul class="markdown-list list-disc">
      <li class="docs-list-item">Market research across four oracles: web, academic papers, patents, developer community, plus a Jobs-to-be-Done lens. Bounded result previews land in the signed audit events, and the deduped citable sources land in a hash-pinned source registry — so a reviewer can verify a source citation resolves to a real result, not a hallucinated one.</li>
      <li class="docs-list-item">PRD refined by mesh-anchored clarifying questions; reviewers score it for mesh-grounding</li>
      <li class="docs-list-item">Cross-cutting code design grounded against every indexed target repo (the heaviest gate in the pipeline). The agent reads actual file contents from each brownfield clone, and the workflow rejects the design if it cites any file path that does not exist in the repo's inventory.</li>
      <li class="docs-list-item"><strong>Audit Report Export:</strong> internal auditor closeout report ships now (one-click export of a markdown closeout per OKR action with a cryptographic pass/fail verdict, requirement traceability, and an event timeline). <em>The redacted external one-zip regulator bundle is the next act.</em></li>
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
      <li class="docs-list-item">Seven rails today: CALM flow constraints, security-critical paths, restricted-tier locks, control adherence, platform impact, permission tiers, custom team rules</li>
      <li class="docs-list-item">Every hook and <code>validate_action</code> decision writes a JSONL audit line with verdict, rule ID, tool, target path, and override attribution when an approval flips a deny into an allow</li>
      <li class="docs-list-item">Cross-repo semantic governance and a CI hard merge gate (<code>redqueen-action</code>) land in <a href="/docs/red-queens-court#queens-next-act" class="markdown-link">Queen&rsquo;s Next Act</a></li>
    </ul>
    <p class="docs-copy"><a href="/docs/red-queens-court" class="docs-button-primary">Open the Court →</a></p>
  </div>
  <img src="/images/redqueen.png" alt="The Red Queen, chess-piece queen and host of the enforcement modality" class="docs-inline-image" />
</div>

If the Hatter does the planning work well, the Red Queen rarely has to deny. If the Red Queen catches what the Hatter missed, the system stays safe. The two together are the agentic governed SDLC.


## Oracle &amp; Privacy Rails: governing the evidence, not just the actions

The Hatter governs **intent**. The Red Queen governs **actions**. But there's a third surface neither one watches: the **evidence** the agents pull in to plan with. The WHY phase reaches out to Tavily, arXiv, USPTO, and Hacker News — untrusted external content. A poisoned search result can carry a prompt-injection payload that tries to steer the agent; a snippet can carry PII or a secret that should never enter the audit chain. Pinning the source so you can prove *where* a citation came from doesn't make the *content* safe.

The **Oracle &amp; Privacy Rails** are the Hatter-side counterpart to the Red Queen: where the Red Queen governs the action boundary inside the code repo, the rails govern the **evidence boundary** as research enters the planning chain. They run on the WHY artifacts — the research doc and the source registry. The required rails (PII, injection) **fail the PR** when tripped; the groundedness rail ships advisory today — it records every conclusion's grounding but does not yet block, until a cert tunes its thresholds and pins its model.

The trust model is **replay, not sign.** Agent and runtime events are signed (Knight's Seal). Rail verdicts are *replayed*: the closeout re-runs the rail's model and config over the committed bytes and compares the result to what was recorded at merge. For the required rails the model is pinned to a specific Hugging Face commit, so the replay is exact and a mismatch — or a rail that never ran — fails the rollup; it can never quietly pass. (The groundedness rail's model is not pinned yet, which is precisely why it stays advisory.) The same evidence a reviewer saw before merge is what an auditor re-derives later, from the bytes.

<div class="docs-proof-list">
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-proof-title">Phase 1 — Guardrail envelope (deterministic)</p>
      <p class="docs-proof-body">A pure-Node <code>withGuardrails</code> envelope wraps the oracle search skills in the research-runner. Before synthesis it quarantines any result with an unsafe or malformed URL, a non-allowlisted provider, or a high-confidence prompt-control marker ("ignore previous instructions" and friends) — deterministic tripwires, no model. Quarantined results never reach the synthesis or the source registry.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Production-proven</strong> on a live WHY run (quarantined 2 of 5 results with unparseable URLs).</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-proof-title">Phase 2 — PII rail (Microsoft Presidio, tiered)</p>
      <p class="docs-proof-body">A tiered-policy rail over the WHY research doc + source registry. Contact / identity / secret classes (SSN, card, bank, private email/phone, IP, government IDs, secret tokens) <strong>hard-fail</strong>; public-figure entities (person, public org, public location) are <strong>allowed and recorded with a redaction summary</strong> — legitimate content in a public-figure research domain; an allowed entity in a sensitive context escalates to <strong>needs-review</strong>. The report stores only the entity type and a safe location ref, never a raw value.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Cert-verified</strong> on a live WHY run: 0 blocked, 658 redacted, verdict pass, CI model-replay reproduced.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-proof-title">Phase 3 — Injection rail (Llama Prompt Guard 2 86M) · a required gate</p>
      <p class="docs-proof-body">Scores the retrieved snippets / source registry for prompt injection with a local <a href="https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-86M">Llama Prompt Guard 2 86M</a> model, pinned to a specific Hugging Face commit. A confirmed injection <strong>hard-fails the WHY PR.</strong> A quoted / cited / code-fenced carve-out means a security-research corpus that <em>discusses</em> an attack isn't flagged for <em>delivering</em> one — the model reads the actual malicious class from its own config, never an assumed index, and fails closed on an unpinned model. This closes the prompt-injection-from-external-research threat that was open research a release ago.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Cert-verified:</strong> hostile fixture blocked (exit 2), benign fixture clean (exit 0); promoted to a required gate.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-partial">⚠ Built · advisory</span>
    <div>
      <p class="docs-proof-title">Phase 4 — Groundedness rail (NLI cross-encoder)</p>
      <p class="docs-proof-body">The semantic layer above provenance. The citation check proves a conclusion <em>cites</em> a real source; this proves the cited source actually <em>says</em> what the conclusion claims — conclusion ⊨ cited source. It is a <strong>pairing rail</strong>: it reads the synthesis doc's Formal Conclusions (the hypotheses) and pairs each against the registry excerpt of the S-tags it cites (the premises), running a local NLI cross-encoder (<a href="https://huggingface.co/MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli">DeBERTa MNLI/FEVER/ANLI</a>). A claim entailed by <em>any one</em> cited source passes, so legitimate cross-source synthesis isn't punished. Policy is tiered: a source that <strong>contradicts</strong> its claim is the serious signal; <strong>unsupported</strong> (neither entailed nor contradicted) is needs-review, not failure.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Built, shipping advisory:</strong> it runs + records on every WHY run but does not yet hard-fail. The cert pins the model and promotes contradiction-blocking; until then it is honest visibility, not a gate.</div>
  </div>
</div>

> 🔑 **Red Queen governs actions; Oracle Rails govern evidence.** Two different boundaries, one honesty contract: every pass label has a check behind it, and every check can be re-run from the committed bytes.


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
  <path d="M 150 135 Q 215 155, 230 190" fill="none" stroke="#a5b4fc" stroke-width="1.6" marker-end="url(#calmArrow)"/>
  <line x1="280" y1="120" x2="305" y2="160" stroke="#a5b4fc" stroke-width="1.4" marker-end="url(#calmArrow)"/>
  <line x1="280" y1="210" x2="305" y2="170" stroke="#a5b4fc" stroke-width="1.4" marker-end="url(#calmArrow)"/>
  <!-- Column labels (positioned below the panel header at y=74, above the node rects at y=100) -->
  <text x="97" y="92" text-anchor="middle" fill="#64748b" font-size="8" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">CLIENTS</text>
  <text x="230" y="92" text-anchor="middle" fill="#64748b" font-size="8" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">SERVICES</text>
  <text x="345" y="92" text-anchor="middle" fill="#64748b" font-size="8" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">DATA</text>
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

<svg viewBox="0 0 800 410" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="Absolem — AI architecture advisor with eight governance commands">
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
  <!-- RIGHT: 8 governance commands -->
  <rect x="416" y="50" width="360" height="338" rx="10" fill="rgba(125,211,252,0.04)" stroke="rgba(125,211,252,0.25)"/>
  <text x="436" y="74" fill="#7dd3fc" font-size="11" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">EIGHT GOVERNANCE COMMANDS</text>
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
  <text x="448" y="181" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">CALM 1.2 schema check</text>
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

An AI governance assistant grounded in your mesh. You chat with it the way you chat with any LLM, but every answer is anchored to the CALM model, the ADRs, the threat catalog, and the NIST controls you have already curated. Citations are real. References do not hallucinate.

The commands are not a menu to memorize. They are three doors an architect walks through when the model, the code, and the next decision need to line up.

<div class="docs-proof-list docs-proof-list-compact">
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">Reality</span>
    <div>
      <p class="docs-proof-title">What does my architecture actually look like right now?</p>
      <p class="docs-proof-body"><code>/scan-repo</code> derives a draft CALM model from running code. <code>/validate</code> checks whether the CALM document is well-formed. <code>/drift</code> checks whether the CALM document still describes the running system.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Key distinction:</strong> <code>/validate</code> can be green while <code>/drift</code> is red. One proves the model is valid. The other proves it is still true.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">Decision</span>
    <div>
      <p class="docs-proof-title">What should I decide next, and how do I explain it?</p>
      <p class="docs-proof-body"><code>/gap-analysis</code> ranks missing governance artifacts across architecture, security, risk, and operations. <code>/adr</code> turns a plain-English decision into an Architecture Decision Record. <code>/ask</code> answers freeform architecture questions with citations back to CALM, ADRs, and STRIDE threats.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Outcome:</strong> the architect gets a ranked next move or a merge-ready rationale, not a generic chat answer.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">Change</span>
    <div>
      <p class="docs-proof-title">How do I bring something new into the model?</p>
      <p class="docs-proof-body"><code>/add-component</code> scaffolds a new CALM node with schema, linkages, security-control placeholders, and threat-reference slots. <code>/image-to-calm</code> turns a whiteboard photo into a structured CALM 1.2 draft after a workshop or design session.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Outcome:</strong> the architecture memory gets updated while the idea is still fresh, before the code and the wiki diverge.</div>
  </div>
</div>

The point is not command syntax. The point is that architectural judgment becomes queryable, updateable, and tied to evidence the next agent run can inherit.

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
  <text x="238" y="194" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">celeb-api (greenfield)</text>
  <text x="238" y="207" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">imdb-react-frontend (brownfield)</text>
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

We built on **FINOS CALM**, the Common Architecture Language Model. It is an open standard from the Linux Foundation backed by Morgan Stanley, JPMorgan, and ThoughtWorks. JSON-based. Git-native. Machine-readable. The architecture standard built for the agentic age. MaintainabilityAI is one of the earliest production implementations of CALM 1.2, already shipping what the ThoughtWorks Technology Radar is moving from "Trial" to "Adopt."


## What no one else has

We reviewed the landscape across internal developer portals, enterprise architecture tools, event catalogs, service scorecards, and AI-assisted coding platforms. Each category is useful. Each category also stops at a different boundary.

Developer portals and service scorecards tell teams what exists and whether it is healthy. Enterprise architecture tools help leaders reason about portfolios and dependencies. Event catalogs document message flows. Coding agents accelerate implementation. Governance dashboards collect evidence after the fact.

The missing layer is the one in the middle: **architecture governance that reaches the developer, the agent, and the governance system at the same time.**

<div class="docs-proof-list docs-proof-list-compact">
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">Developer</span>
    <div>
      <p class="docs-proof-title">Constraints show up where work happens</p>
      <p class="docs-proof-body">Developers see the CALM model, BAR score, threats, ADRs, and fitness expectations inside Looking Glass before the code design lands. The design is not a detached architecture artifact; it is the map the work has to follow.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Different from:</strong> catalog-only tools that know a service exists but cannot prove a new PRD or code design respected its architecture.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">Agent</span>
    <div>
      <p class="docs-proof-title">Agent actions hit deterministic rails</p>
      <p class="docs-proof-body">Planning agents must cite mesh evidence, source tags, and real code paths. Coding agents face Red Queen action checks before side effects. The agent can synthesize, but deterministic skills prove what it saw and deterministic gates decide what it may do.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Different from:</strong> coding assistants that move fast but leave provenance, tool use, and policy enforcement to screenshots, logs, or human memory.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">Governance</span>
    <div>
      <p class="docs-proof-title">Audit evidence is born with the work</p>
      <p class="docs-proof-body">Every WHY, HOW, and WHAT action produces a signed chain, a human gate, and an internal closeout report. The same evidence a reviewer sees before merge is what the auditor can replay later.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Different from:</strong> governance dashboards that collect artifacts after the fact, when the chain of causality is already blurry.</div>
  </div>
</div>

That is the claim: not "one more portal," not "one more reviewer bot," and not "AI governance as a spreadsheet." MaintainabilityAI starts from the architecture model and makes it executable across intent, developer workflow, and agent tool calls.

**Court Recorder Auto-Logging: the agent cannot write its own alibi.**

**What it prevents:** Most AI governance logs are still self-reports: the agent says what it did, the platform stores the claim, and a reviewer has to trust the narrator. The Court Recorder removes that weak spot. Facts are recorded by the system that observes them, not by the model that benefits from looking compliant.

**How it works:** The audit chain has three legitimate authors. The runtime records tool use before the tool result returns to the agent. The workflow records facts it can recompute from GitHub, such as which artifact was written and which state changed. The agent signs only the judgments that actually require judgment, such as self-review scores and gap-loop intent. The event shape is documented in a canonical contract and pinned by a regression test, so emitter drift breaks before production.

**What the auditor sees:** Every event has one allowed source. If the wrong source tries to emit it, the verifier rejects the chain. That is the trust upgrade: the audit log is not a polished story about the run; it is the run's source-of-record.


**The Tweedles, inside one agent: a bounded contrarian debate that improves the artifact.**

**What it prevents:** A single-pass PRD or code design usually looks confident before it is complete. It may list functional requirements without acceptance boundaries, name a latency target without a budget, or describe threat coverage in prose without turning it into security requirements. The Tweedles loop forces the draft to survive pressure before a human approves it.

**How it works:** After the author agent drafts the artifact, it switches hats. The **Architect persona** checks whether functional requirements map to real CALM nodes, ADRs, interface contracts, and brownfield code paths. The **Security persona** checks whether security requirements map to actual threats, OWASP categories, and control families instead of vague assurance language. Both personas also look for non-functional gaps: p95 targets without evidence, availability claims without failure budgets, rollout plans without rollback rules.

Each persona writes a structured self-review block on the PR and signs a `self_review` event under the session's key. If either persona finds gaps, the author revises and the loop runs again, up to a ceiling set by the business system's risk tier: three rounds for Autonomous, two for Supervised, zero for Restricted, which goes straight to human review.

**What the auditor sees:** A convergence ladder on the audit chain. Architect MINOR round 1, Security MINOR round 1, Architect PASS round 2, Security PASS round 2. The artifact got better, and the evidence shows which round closed which gap. This is not independence theatre; the point is disciplined pressure, not extra agents.


**Court Recorder records. Knight's Seal proves. Audit Report explains.** Three primitives, one sequence.

**What each does:** The Court Recorder lanes split who-can-emit-what so the chain has one legitimate source per event. Knight's Seal v1 (per-event Ed25519 signing under a per-session ephemeral keypair) makes each agent-emitted event cryptographically tied to the session that produced it; any tamper breaks the signature, and the runner re-verifies on every PR. The Audit Report Export turns the chain into a one-click markdown closeout per OKR action: cryptographic pass/fail verdict at the top, requirement traceability in the middle, event timeline at the bottom. An auditor reads one document instead of grepping JSONL.

**What the auditor sees:** A single self-contained markdown closeout per merged action, plus the core source files it cites: the artifact, JSONL chain, ladder, and public keys. Persistent external verification (cosign-anchored Knight's Seal v2) and the redacted external one-zip regulator bundle are the next act.

<div class="docs-center-block">
<div class="docs-heading">Every event has one legitimate author. Anything else is forgery.</div>
</div>

<svg viewBox="0 0 800 560" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="Three-lane trust model. Runtime records facts, the agent signs judgment, the workflow records state. All three converge into the Court Recorder canonical contract, then Knight's Seal seals every agent event with a per-session Ed25519 signature, and the Audit Report Export turns the chain into a one-click reviewer document.">
  <defs>
    <linearGradient id="tlmBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0c1426"/>
      <stop offset="100%" stop-color="#070d1a"/>
    </linearGradient>
    <linearGradient id="tlmRuntime" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(125,211,252,0.28)"/>
      <stop offset="100%" stop-color="rgba(125,211,252,0.06)"/>
    </linearGradient>
    <linearGradient id="tlmAgent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(167,139,250,0.32)"/>
      <stop offset="100%" stop-color="rgba(167,139,250,0.08)"/>
    </linearGradient>
    <linearGradient id="tlmWorkflow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(253,186,116,0.28)"/>
      <stop offset="100%" stop-color="rgba(253,186,116,0.06)"/>
    </linearGradient>
    <linearGradient id="tlmCourt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(148,163,184,0.32)"/>
      <stop offset="100%" stop-color="rgba(148,163,184,0.10)"/>
    </linearGradient>
    <linearGradient id="tlmSeal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(134,239,172,0.40)"/>
      <stop offset="100%" stop-color="rgba(134,239,172,0.10)"/>
    </linearGradient>
    <linearGradient id="tlmReport" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(129,140,248,0.36)"/>
      <stop offset="100%" stop-color="rgba(129,140,248,0.10)"/>
    </linearGradient>
    <filter id="tlmGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="0" y="0" width="800" height="560" rx="12" fill="url(#tlmBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#cbd5e1" font-size="10.5" font-weight="700" letter-spacing="3" font-family="system-ui, sans-serif">THE THREE-LANE TRUST MODEL</text>
  <text x="400" y="46" text-anchor="middle" fill="#64748b" font-size="9.5" letter-spacing="1.5" font-family="system-ui, sans-serif">RUNTIME · AGENT · WORKFLOW — separated at emission, joined at the chain</text>

  <!-- ── Three lane headers ─────────────────────────────────────── -->
  <g transform="translate(40,72)">
    <!-- Runtime lane -->
    <rect x="0" y="0" width="220" height="38" rx="8" fill="url(#tlmRuntime)" stroke="rgba(125,211,252,0.55)" stroke-width="1.4"/>
    <circle cx="22" cy="19" r="8" fill="rgba(125,211,252,0.20)" stroke="rgba(125,211,252,0.75)" stroke-width="1.3"/>
    <path d="M 18 19 L 21 22 L 26 16" stroke="#7dd3fc" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="40" y="17" fill="#e0f2fe" font-size="11" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">RUNTIME</text>
    <text x="40" y="31" fill="#7dd3fc" font-size="9" font-weight="600" font-family="system-ui, sans-serif">records factual tool use</text>
  </g>
  <g transform="translate(290,72)">
    <!-- Agent lane -->
    <rect x="0" y="0" width="220" height="38" rx="8" fill="url(#tlmAgent)" stroke="rgba(167,139,250,0.65)" stroke-width="1.4"/>
    <circle cx="22" cy="19" r="8" fill="rgba(167,139,250,0.24)" stroke="rgba(167,139,250,0.85)" stroke-width="1.3"/>
    <path d="M 18 22 L 18 18 Q 18 14 22 14 Q 26 14 26 18 L 26 22 Z" fill="#a78bfa" stroke="#a78bfa" stroke-width="0.8"/>
    <rect x="16" y="21" width="12" height="5" rx="1.2" fill="#c4b5fd"/>
    <text x="40" y="17" fill="#ede9fe" font-size="11" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">AGENT</text>
    <text x="40" y="31" fill="#a78bfa" font-size="9" font-weight="600" font-family="system-ui, sans-serif">signs only what it judges</text>
  </g>
  <g transform="translate(540,72)">
    <!-- Workflow lane -->
    <rect x="0" y="0" width="220" height="38" rx="8" fill="url(#tlmWorkflow)" stroke="rgba(253,186,116,0.65)" stroke-width="1.4"/>
    <circle cx="22" cy="19" r="8" fill="rgba(253,186,116,0.20)" stroke="rgba(253,186,116,0.85)" stroke-width="1.3"/>
    <rect x="17" y="14" width="10" height="10" rx="1.2" fill="none" stroke="#fdba74" stroke-width="1.4"/>
    <path d="M 19 18 L 25 18 M 19 21 L 25 21" stroke="#fdba74" stroke-width="1.2"/>
    <text x="40" y="17" fill="#fef3c7" font-size="11" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">WORKFLOW</text>
    <text x="40" y="31" fill="#fdba74" font-size="9" font-weight="600" font-family="system-ui, sans-serif">records re-derivable state</text>
  </g>

  <!-- ── Event-kind cards per lane ─────────────────────────────── -->
  <g transform="translate(40,124)">
    <!-- Runtime events -->
    <rect x="0" y="0" width="220" height="48" rx="6" fill="rgba(15,23,42,0.55)" stroke="rgba(125,211,252,0.32)" stroke-width="1"/>
    <text x="14" y="16" fill="#e0f2fe" font-size="10.5" font-weight="700" font-family="ui-monospace, Menlo, monospace">skill_call</text>
    <text x="14" y="30" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">tavily · knowledge-code · context-*</text>
    <text x="14" y="42" fill="#7dd3fc" font-size="8.5" font-weight="600" font-family="system-ui, sans-serif">🔒 signed under agent epoch</text>
  </g>
  <g transform="translate(40,180)">
    <rect x="0" y="0" width="220" height="48" rx="6" fill="rgba(15,23,42,0.55)" stroke="rgba(125,211,252,0.32)" stroke-width="1"/>
    <text x="14" y="16" fill="#e0f2fe" font-size="10.5" font-weight="700" font-family="ui-monospace, Menlo, monospace">llm_call</text>
    <text x="14" y="30" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">model · token counts · cost</text>
    <text x="14" y="42" fill="#7dd3fc" font-size="8.5" font-weight="600" font-family="system-ui, sans-serif">🔒 signed under agent epoch</text>
  </g>
  <g transform="translate(290,124)">
    <!-- Agent events -->
    <rect x="0" y="0" width="220" height="48" rx="6" fill="rgba(15,23,42,0.55)" stroke="rgba(167,139,250,0.42)" stroke-width="1"/>
    <text x="14" y="16" fill="#ede9fe" font-size="10.5" font-weight="700" font-family="ui-monospace, Menlo, monospace">self_review</text>
    <text x="14" y="30" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">architect · security · score · severity</text>
    <text x="14" y="42" fill="#a78bfa" font-size="8.5" font-weight="600" font-family="system-ui, sans-serif">🔒 signed · the only judgment lane</text>
  </g>
  <g transform="translate(290,180)">
    <rect x="0" y="0" width="220" height="48" rx="6" fill="rgba(15,23,42,0.55)" stroke="rgba(167,139,250,0.42)" stroke-width="1"/>
    <text x="14" y="16" fill="#ede9fe" font-size="10.5" font-weight="700" font-family="ui-monospace, Menlo, monospace">gap_loop</text>
    <text x="14" y="30" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">refinement queries from research gaps</text>
    <text x="14" y="42" fill="#a78bfa" font-size="8.5" font-weight="600" font-family="system-ui, sans-serif">🔒 signed under agent epoch</text>
  </g>
  <g transform="translate(540,124)">
    <!-- Workflow events -->
    <rect x="0" y="0" width="220" height="48" rx="6" fill="rgba(15,23,42,0.55)" stroke="rgba(253,186,116,0.42)" stroke-width="1"/>
    <text x="14" y="16" fill="#fef3c7" font-size="10.5" font-weight="700" font-family="ui-monospace, Menlo, monospace">artifact_written</text>
    <text x="14" y="30" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">path · sha256 · bytes · merge_sha</text>
    <text x="14" y="42" fill="#fdba74" font-size="8.5" font-weight="600" font-family="system-ui, sans-serif">— unsigned · re-derivable from git</text>
  </g>
  <g transform="translate(540,180)">
    <rect x="0" y="0" width="220" height="48" rx="6" fill="rgba(15,23,42,0.55)" stroke="rgba(253,186,116,0.42)" stroke-width="1"/>
    <text x="14" y="16" fill="#fef3c7" font-size="10.5" font-weight="700" font-family="ui-monospace, Menlo, monospace">state_transition</text>
    <text x="14" y="30" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">from → to · PR # · merge_sha</text>
    <text x="14" y="42" fill="#fdba74" font-size="8.5" font-weight="600" font-family="system-ui, sans-serif">— unsigned · re-derivable from labels</text>
  </g>

  <!-- ── Forgery rejection callout ─────────────────────────────── -->
  <g transform="translate(40,244)">
    <rect x="0" y="0" width="720" height="46" rx="8" fill="rgba(248,113,113,0.08)" stroke="rgba(248,113,113,0.35)" stroke-width="1" stroke-dasharray="3,2"/>
    <circle cx="20" cy="14" r="7" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.75)" stroke-width="1.2"/>
    <text x="20" y="18" text-anchor="middle" fill="#fca5a5" font-size="10" font-weight="700" font-family="system-ui, sans-serif">!</text>
    <text x="38" y="18" fill="#fecaca" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Wrong source, signed workflow event, or missing epoch?</text>
    <text x="38" y="34" fill="#fecaca" font-size="10" font-weight="600" font-family="system-ui, sans-serif">The verifier rejects the chain. Tested.</text>
  </g>

  <!-- ── Convergence funnel ───────────────────────────────────── -->
  <g transform="translate(0,288)">
    <path d="M 150 0 L 380 56" stroke="rgba(125,211,252,0.55)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M 400 0 L 400 56" stroke="rgba(167,139,250,0.65)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M 650 0 L 420 56" stroke="rgba(253,186,116,0.55)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="150" cy="0" r="3" fill="#7dd3fc"/>
    <circle cx="400" cy="0" r="3" fill="#a78bfa"/>
    <circle cx="650" cy="0" r="3" fill="#fdba74"/>
  </g>

  <!-- ── Court Recorder bar ───────────────────────────────────── -->
  <g transform="translate(140,352)">
    <rect x="0" y="0" width="520" height="46" rx="10" fill="url(#tlmCourt)" stroke="rgba(148,163,184,0.55)" stroke-width="1.4"/>
    <g transform="translate(18,11)">
      <rect x="0" y="6" width="18" height="14" rx="1.2" fill="none" stroke="#cbd5e1" stroke-width="1.4"/>
      <path d="M 3 10 L 15 10 M 3 14 L 15 14 M 3 18 L 11 18" stroke="#cbd5e1" stroke-width="1"/>
      <path d="M 9 0 L 9 6 M 4 3 L 14 3" stroke="#cbd5e1" stroke-width="1.4" stroke-linecap="round"/>
    </g>
    <text x="48" y="20" fill="#f1f5f9" font-size="12.5" font-weight="700" font-family="system-ui, sans-serif">Court Recorder</text>
    <text x="48" y="35" fill="#cbd5e1" font-size="10" font-family="system-ui, sans-serif">canonical event-payload contract · pinned by regression test · any drift fails CI</text>
  </g>

  <!-- ── Down arrow ────────────────────────────────────────────── -->
  <path d="M 400 406 L 400 422" stroke="#94a3b8" stroke-width="1.4"/>
  <path d="M 394 418 L 400 426 L 406 418" stroke="#94a3b8" stroke-width="1.4" fill="none" stroke-linejoin="round"/>

  <!-- ── Knight's Seal band ───────────────────────────────────── -->
  <g transform="translate(140,432)">
    <rect x="0" y="0" width="520" height="50" rx="10" fill="url(#tlmSeal)" stroke="rgba(134,239,172,0.65)" stroke-width="1.6" filter="url(#tlmGlow)"/>
    <g transform="translate(18,11)">
      <path d="M 14 0 L 26 4 L 26 16 Q 26 24 14 28 Q 2 24 2 16 L 2 4 Z" fill="rgba(134,239,172,0.25)" stroke="#86efac" stroke-width="1.4"/>
      <path d="M 9 14 L 13 18 L 19 11" stroke="#86efac" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="50" y="22" fill="#dcfce7" font-size="13" font-weight="700" font-family="system-ui, sans-serif">🛡  Knight's Seal v1</text>
    <text x="50" y="38" fill="#86efac" font-size="10" font-family="system-ui, sans-serif">per-event Ed25519 signature · per-session epoch key · verifier replays on every PR</text>
  </g>

  <!-- ── Down arrow ────────────────────────────────────────────── -->
  <path d="M 400 490 L 400 506" stroke="#94a3b8" stroke-width="1.4"/>
  <path d="M 394 502 L 400 510 L 406 502" stroke="#94a3b8" stroke-width="1.4" fill="none" stroke-linejoin="round"/>

  <!-- ── Audit Report Export band ─────────────────────────────── -->
  <g transform="translate(140,516)">
    <rect x="0" y="0" width="520" height="38" rx="8" fill="url(#tlmReport)" stroke="rgba(129,140,248,0.65)" stroke-width="1.5"/>
    <g transform="translate(18,8)">
      <rect x="0" y="0" width="18" height="22" rx="1.5" fill="rgba(129,140,248,0.18)" stroke="#a5b4fc" stroke-width="1.3"/>
      <path d="M 4 6 L 14 6 M 4 10 L 14 10 M 4 14 L 12 14 M 4 18 L 10 18" stroke="#a5b4fc" stroke-width="1"/>
    </g>
    <text x="50" y="17" fill="#e0e7ff" font-size="12" font-weight="700" font-family="system-ui, sans-serif">📄  Audit Report Export</text>
    <text x="50" y="30" fill="#a5b4fc" font-size="9.5" font-family="system-ui, sans-serif">internal closeout: verdict + control map + timeline (shipped) · redacted external zip (next act)</text>
  </g>
</svg>


**Evidence lives in two places.** The planning phases — WHY, HOW, WHAT — write their signed events into the governance mesh. The implementation phase writes its signed events into the target repo where the code actually lands. Same per-run signing key, same evidence rules, same score scale (0.00–1.00 plus PASS / MINOR / MAJOR / BLOCKING). Only the file location differs.

**They join at the merge commit.** When an implementation pull request opens, its body carries a small block pointing back to the planning run in the mesh. When the PR merges, Looking Glass goes to the target repo, reads the signed events and the public key *at the exact commit the PR merged at*, confirms they are present there, then appends one row to the mesh's chain ladder with that commit hash stamped on it. If the read fails, the row is held as pending instead of sealed. The auditor reads one ladder; the commit hash is the proof that the planning side and the implementation side belong to the same story.

**The whole-OKR rollup is the buyer's story.** One click in Looking Glass produces a single closeout report **over** the signed evidence — folding WHY + HOW + WHAT + every implementation row into one auditor-readable document. The rollup is not itself a signed artifact; it is a report that re-verifies the underlying chain ladder at export time, so what it says reflects the chain as it stands today — not as it stood when each phase sealed. The verdict comes first, then the evidence, traceability, event timeline, and cross-phase ladder.

<svg viewBox="0 0 800 440" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="The stitched evidence chain. Planning events write to the mesh, implementation events write to each target repo, and the two halves stitch at the pull request's merge commit SHA. Looking Glass fetches the target-repo events and public key at the merge SHA before appending a row to the mesh chain ladder.">
  <defs>
    <linearGradient id="stitchBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0c1426"/>
      <stop offset="100%" stop-color="#070d1a"/>
    </linearGradient>
    <linearGradient id="stitchMesh" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(196,181,253,0.18)"/>
      <stop offset="100%" stop-color="rgba(196,181,253,0.04)"/>
    </linearGradient>
    <linearGradient id="stitchRepo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(125,211,252,0.18)"/>
      <stop offset="100%" stop-color="rgba(125,211,252,0.04)"/>
    </linearGradient>
    <linearGradient id="stitchSeam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(252,211,77,0.18)"/>
      <stop offset="100%" stop-color="rgba(252,211,77,0.04)"/>
    </linearGradient>
    <marker id="stitchArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#86efac"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="800" height="440" rx="12" fill="url(#stitchBg)"/>
  <text x="400" y="26" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" letter-spacing="3" font-family="system-ui, sans-serif">STITCHED EVIDENCE CHAIN · MESH + TARGET REPO</text>
  <!-- MESH band -->
  <rect x="20" y="50" width="760" height="100" rx="10" fill="url(#stitchMesh)" stroke="rgba(196,181,253,0.5)" stroke-width="1.2"/>
  <text x="36" y="72" fill="#ddd6fe" font-size="10" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">MESH REPO · planning chain</text>
  <text x="36" y="86" fill="#a78bfa" font-size="9" font-family="ui-monospace, Menlo, monospace">&lt;mesh&gt;/okrs/&lt;id&gt;/audit/events/&lt;runId&gt;.jsonl</text>
  <!-- Mesh chain rungs (pill-shaped so labels fit) -->
  <rect x="148" y="108" width="44" height="24" rx="12" fill="rgba(134,239,172,0.30)" stroke="#86efac" stroke-width="1.4"/>
  <text x="170" y="125" text-anchor="middle" fill="#dcfce7" font-size="11" font-weight="700" font-family="system-ui, sans-serif">WHY</text>
  <text x="170" y="146" text-anchor="middle" fill="#a78bfa" font-size="8" font-family="ui-monospace, Menlo, monospace">WHY-*</text>
  <rect x="288" y="108" width="44" height="24" rx="12" fill="rgba(134,239,172,0.30)" stroke="#86efac" stroke-width="1.4"/>
  <text x="310" y="125" text-anchor="middle" fill="#dcfce7" font-size="11" font-weight="700" font-family="system-ui, sans-serif">HOW</text>
  <text x="310" y="146" text-anchor="middle" fill="#a78bfa" font-size="8" font-family="ui-monospace, Menlo, monospace">HOW-*</text>
  <rect x="428" y="108" width="44" height="24" rx="12" fill="rgba(134,239,172,0.30)" stroke="#86efac" stroke-width="1.4"/>
  <text x="450" y="125" text-anchor="middle" fill="#dcfce7" font-size="11" font-weight="700" font-family="system-ui, sans-serif">WHAT</text>
  <text x="450" y="146" text-anchor="middle" fill="#a78bfa" font-size="8" font-family="ui-monospace, Menlo, monospace">WHAT-*</text>
  <path d="M 192 120 L 288 120 M 332 120 L 428 120" stroke="rgba(134,239,172,0.55)" stroke-width="1.4"/>
  <!-- Ladder row block on the right -->
  <rect x="540" y="92" width="220" height="44" rx="6" fill="rgba(15,23,42,0.55)" stroke="rgba(252,211,77,0.4)" stroke-width="1"/>
  <text x="650" y="108" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="700" font-family="system-ui, sans-serif">chain-ladder.yaml</text>
  <text x="650" y="122" text-anchor="middle" fill="#cbd5e1" font-size="8" font-family="system-ui, sans-serif">WHY · HOW · WHAT · impl rows ↓</text>
  <text x="650" y="132" text-anchor="middle" fill="#94a3b8" font-size="7" font-family="ui-monospace, Menlo, monospace">stamped with merge_commit_sha</text>
  <!-- SEAM band: FanOutEngine -->
  <rect x="20" y="170" width="760" height="76" rx="10" fill="url(#stitchSeam)" stroke="rgba(252,211,77,0.5)" stroke-width="1.2"/>
  <text x="36" y="192" fill="#fef3c7" font-size="10" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">SEAM · FanOutEngine in Looking Glass extension</text>
  <text x="36" y="206" fill="#fcd34d" font-size="9" font-family="system-ui, sans-serif">pre-flight pane → user clicks Fan out N of M → assignCustomCopilotAgent ×N</text>
  <rect x="540" y="186" width="220" height="46" rx="6" fill="rgba(15,23,42,0.55)" stroke="rgba(252,211,77,0.4)" stroke-width="1"/>
  <text x="650" y="202" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="700" font-family="system-ui, sans-serif">landing issue</text>
  <text x="650" y="216" text-anchor="middle" fill="#cbd5e1" font-size="8" font-family="ui-monospace, Menlo, monospace">&lt;!-- governance_tier: ... --&gt;</text>
  <text x="650" y="227" text-anchor="middle" fill="#94a3b8" font-size="7" font-family="ui-monospace, Menlo, monospace">+ parent_chain_root, parent_intent_thread</text>
  <!-- arrows down from mesh into seam (3) then down from seam into repo (3) -->
  <line x1="170" y1="150" x2="170" y2="170" stroke="rgba(252,211,77,0.55)" stroke-width="1.2"/>
  <line x1="310" y1="150" x2="310" y2="170" stroke="rgba(252,211,77,0.55)" stroke-width="1.2"/>
  <line x1="450" y1="150" x2="450" y2="170" stroke="rgba(252,211,77,0.55)" stroke-width="1.2"/>
  <line x1="170" y1="246" x2="170" y2="266" stroke="rgba(125,211,252,0.55)" stroke-width="1.2"/>
  <line x1="310" y1="246" x2="310" y2="266" stroke="rgba(125,211,252,0.55)" stroke-width="1.2"/>
  <line x1="450" y1="246" x2="450" y2="266" stroke="rgba(125,211,252,0.55)" stroke-width="1.2"/>
  <!-- TARGET REPO band -->
  <rect x="20" y="266" width="760" height="100" rx="10" fill="url(#stitchRepo)" stroke="rgba(125,211,252,0.5)" stroke-width="1.2"/>
  <text x="36" y="288" fill="#e0f2fe" font-size="10" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">TARGET REPOS · implementation chain (one per repo)</text>
  <text x="36" y="302" fill="#7dd3fc" font-size="9" font-family="ui-monospace, Menlo, monospace">&lt;repo&gt;/.maintainability/audit/events/IMPL-*.jsonl</text>
  <rect x="148" y="324" width="44" height="24" rx="12" fill="rgba(134,239,172,0.30)" stroke="#86efac" stroke-width="1.4"/>
  <text x="170" y="341" text-anchor="middle" fill="#dcfce7" font-size="11" font-weight="700" font-family="system-ui, sans-serif">IMPL</text>
  <text x="170" y="362" text-anchor="middle" fill="#7dd3fc" font-size="8" font-family="ui-monospace, Menlo, monospace">celeb-api</text>
  <rect x="288" y="324" width="44" height="24" rx="12" fill="rgba(134,239,172,0.30)" stroke="#86efac" stroke-width="1.4"/>
  <text x="310" y="341" text-anchor="middle" fill="#dcfce7" font-size="11" font-weight="700" font-family="system-ui, sans-serif">IMPL</text>
  <text x="310" y="362" text-anchor="middle" fill="#7dd3fc" font-size="8" font-family="ui-monospace, Menlo, monospace">imdb-react-frontend</text>
  <rect x="428" y="324" width="44" height="24" rx="12" fill="rgba(134,239,172,0.30)" stroke="#86efac" stroke-width="1.4"/>
  <text x="450" y="341" text-anchor="middle" fill="#dcfce7" font-size="11" font-weight="700" font-family="system-ui, sans-serif">IMPL</text>
  <text x="450" y="362" text-anchor="middle" fill="#7dd3fc" font-size="8" font-family="ui-monospace, Menlo, monospace">checkout-svc · greenfield</text>
  <!-- Stitch back into chain-ladder: routed OUTSIDE the right column so it doesn't cross the landing-issue / Stage-5 / chain-ladder boxes -->
  <path d="M 760 316 C 794 316, 794 114, 762 114" fill="none" stroke="#86efac" stroke-width="1.8" marker-end="url(#stitchArrow)"/>
  <rect x="540" y="282" width="220" height="68" rx="6" fill="rgba(15,23,42,0.55)" stroke="rgba(134,239,172,0.5)" stroke-width="1"/>
  <text x="650" y="298" text-anchor="middle" fill="#86efac" font-size="9" font-weight="700" font-family="system-ui, sans-serif">Stage 5 stitches</text>
  <text x="650" y="312" text-anchor="middle" fill="#cbd5e1" font-size="8" font-family="system-ui, sans-serif">fetch events + key at pr.merge_commit_sha</text>
  <text x="650" y="324" text-anchor="middle" fill="#cbd5e1" font-size="8" font-family="system-ui, sans-serif">verify exists → append ladder row</text>
  <text x="650" y="338" text-anchor="middle" fill="#cbd5e1" font-size="8" font-family="system-ui, sans-serif">stamp merge SHA on the row</text>
  <text x="650" y="346" text-anchor="middle" fill="#94a3b8" font-size="7" font-style="italic" font-family="system-ui, sans-serif">fetch fail → retry-pending, not sealed</text>
  <!-- Legend -->
  <rect x="20" y="382" width="760" height="42" rx="8" fill="rgba(15,23,42,0.55)" stroke="rgba(148,163,184,0.25)" stroke-width="1"/>
  <text x="36" y="402" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif"><tspan fill="#a78bfa" font-weight="700">Mesh:</tspan> WHY · HOW · WHAT plans + ladder.   <tspan fill="#fcd34d" font-weight="700">Seam:</tspan> FanOutEngine + landing issues (governance_tier frozen).   <tspan fill="#7dd3fc" font-weight="700">Target repos:</tspan> impl chain per repo.</text>
  <text x="36" y="416" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif"><tspan fill="#86efac" font-weight="700">Stitch:</tspan> the merge_commit_sha is the cryptographic anchor that joins the planning chain to the implementation chain — one signed story, two rooms.</text>
</svg>


## How we keep the promises

Earlier we said most agentic systems break the chain of trust. Here is how we do not. Three promises, with four rails underneath: judgment, evidence, audit, and governance. Every one is enforced by code that runs on every PR, not by a slide.

<div class="docs-center-block">
<div class="docs-heading">The new SDLC is not a loop. It is a governed evidence pipeline.</div>
</div>

<img src="/images/diagrams/governed-sdlc-rail-map.svg" alt="The governed SDLC rail map. Five lifecycle stages: OKR, WHY, HOW, WHAT, and BUILD fan-out, all shipped. Each carries four parallel rails: agent judgment, evidence capture, deterministic audit, and human governance. The planning chain lives in the mesh; the implementation chain lives in each target repo; the two stitch at the merge commit." class="docs-svg" />


<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Promise 1</div>
    <div class="docs-heading">One stitched audit trail per OKR</div>
    <div class="docs-copy">Every agent session generates its own ephemeral signing key. The public key is committed to the mesh; the private key never leaves the session that created it. Every event the agent emits carries a signature plus the session number. Verification picks the right key per event and walks the trail end to end — signed planning events in the mesh, signed implementation events in each target repo, and the replayed Oracle rail reports over the evidence, joined at the merge commit SHA.</div>
    <div class="docs-copy" style="margin-top:8px;font-size:11px;color:#94a3b8"><strong>How it's enforced:</strong> a regression test pins the revise-round path so a second agent session can never overwrite the first epoch's keypair. The verifier rejects any chain with an unsigned agent-emitted event or an event missing <code>signer_epoch</code>. Only workflow-emitted events may be unsigned (post-agent context, no key). One contract, no legacy escape hatch.</div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Promise 2</div>
    <div class="docs-heading">One human gate per phase</div>
    <div class="docs-copy">A single phase contract owns the WHY, HOW, and WHAT phases end to end. The same finalize step runs for all three. The shape of the audit comment a reviewer sees is locked by a regression test, so drift between what the workflow writes and what the dashboard reads breaks at test time, not in production.</div>
    <div class="docs-copy" style="margin-top:8px;font-size:11px;color:#94a3b8"><strong>How it's enforced:</strong> a parity test verifies the same set of required sections appears in the agent prompt, the synthesis pack, and the workflow's structural check. Three layers, one source of truth.</div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Promise 3</div>
    <div class="docs-heading">Zero credential reissuance between agents</div>
    <div class="docs-copy">The runtime refuses to overwrite a published key. When a revise round starts, the system detects that the prior session is closed and advances to a fresh key automatically. No agent is ever handed another agent's credentials. The handoff between agents is the signature on the prior event. No shared service account. No proxy auth. No impersonation.</div>
    <div class="docs-copy" style="margin-top:8px;font-size:11px;color:#94a3b8"><strong>How it's enforced:</strong> committed public keys are immutable by contract. The chain is the only credential. Two unit tests fail loudly the moment a future change tries to relax either rule.</div>
  </div>
</div>

<svg viewBox="0 0 800 260" xmlns="http://www.w3.org/2000/svg" class="docs-svg" role="img" aria-label="Receipts at a glance. Runtime tests, dashboard tests, field-bug regressions, and deterministic audit contracts all gate every push to main.">
  <defs>
    <linearGradient id="receiptsBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1424"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="260" rx="12" fill="url(#receiptsBg)"/>
  <text x="400" y="32" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" letter-spacing="3" font-family="system-ui, sans-serif">RECEIPTS · AT A GLANCE</text>
  <g transform="translate(28,56)">
    <rect x="0" y="0" width="178" height="84" rx="10" fill="rgba(74,222,128,0.10)" stroke="rgba(74,222,128,0.4)"/>
    <text x="89" y="38" text-anchor="middle" fill="#86efac" font-size="22" font-weight="800" font-family="system-ui, sans-serif">✓ all green</text>
    <text x="89" y="56" text-anchor="middle" fill="#bbf7d0" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">RUNTIME TESTS</text>
    <text x="89" y="72" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">signing, chain, drift, allowlist</text>
  </g>
  <g transform="translate(214,56)">
    <rect x="0" y="0" width="178" height="84" rx="10" fill="rgba(74,222,128,0.10)" stroke="rgba(74,222,128,0.4)"/>
    <text x="89" y="38" text-anchor="middle" fill="#86efac" font-size="22" font-weight="800" font-family="system-ui, sans-serif">✓ all green</text>
    <text x="89" y="56" text-anchor="middle" fill="#bbf7d0" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">DASHBOARD TESTS</text>
    <text x="89" y="72" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">UI, audit, phase parity, seal</text>
  </g>
  <g transform="translate(400,56)">
    <rect x="0" y="0" width="178" height="84" rx="10" fill="rgba(125,211,252,0.10)" stroke="rgba(125,211,252,0.4)"/>
    <text x="89" y="38" text-anchor="middle" fill="#7dd3fc" font-size="22" font-weight="800" font-family="system-ui, sans-serif">✓ regressed</text>
    <text x="89" y="56" text-anchor="middle" fill="#bae6fd" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">FIELD BUGS</text>
    <text x="89" y="72" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui, sans-serif">every cert-run finding has a test</text>
  </g>
  <g transform="translate(586,56)">
    <rect x="0" y="0" width="186" height="84" rx="10" fill="rgba(196,181,253,0.10)" stroke="rgba(196,181,253,0.4)"/>
    <text x="93" y="36" text-anchor="middle" fill="#c4b5fd" font-size="22" font-weight="800" font-family="system-ui, sans-serif">✓ checked</text>
    <text x="93" y="54" text-anchor="middle" fill="#ddd6fe" font-size="10" font-weight="700" letter-spacing="1" font-family="system-ui, sans-serif">AUDIT CONTRACTS</text>
    <text x="93" y="68" text-anchor="middle" fill="#94a3b8" font-size="8.5" font-family="system-ui, sans-serif">sources · reqs · paths · SHA</text>
    <text x="93" y="79" text-anchor="middle" fill="#94a3b8" font-size="8.5" font-family="system-ui, sans-serif">replayed rail reports</text>
  </g>
  <rect x="28" y="160" width="744" height="44" rx="10" fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.35)"/>
  <text x="400" y="180" text-anchor="middle" fill="#c7d2fe" font-size="11" font-weight="700" letter-spacing="2" font-family="system-ui, sans-serif">AUDIT GATES · WHY SOURCES · HOW REQUIREMENTS · WHAT PATHS · BUILD MERGE SHA</text>
  <text x="400" y="196" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Evidence is captured as the work happens. Audit checks decide whether a pass label is allowed.</text>
  <text x="400" y="232" text-anchor="middle" fill="#94a3b8" font-size="10" font-style="italic" font-family="system-ui, sans-serif">Trust earned, not granted. Per agent, per session, per event.</text>
</svg>

**How the three lanes work.** The runtime logs every skill call automatically; the agent never touches that log. The agent signs its own review scores because judgment is not deterministic, and a signature is what makes it auditable later. The workflow records what it can re-derive from git and pull-request state: file changes, label flips, reviewer approvals. Each event kind belongs to exactly one of those three lanes; if the wrong lane tries to emit something, the verifier won't accept it.

The threat model section below names the gaps we have not yet closed. We publish them openly because honest design beats marketing claims.


## Threat model: the Hatter feature

The Hatter's Tea Party is live, and its threat model evolves with every hardening round. Threat modeling is part of how we design and harden it, not a checklist after the fact. The model below uses **STRIDE** because it's the language enterprise security teams already speak, and we publish it openly because honest design beats marketing claims. It covers the actors we expect, the threats we enumerate, the controls already shipped, and the gaps that remain.

### Threat actors

Five actors the Hatter must withstand, shown by where they enter the governed SDLC and which checks meet them first:

<img src="/images/diagrams/threat-actor-entry-lanes.svg" alt="Five threat actors and where they enter the governed SDLC: external attacker, compromised agent, malicious insider, careless insider, and supply-chain attacker. Each lane shows the entry path, attempted damage, and first control before the governed evidence chain." class="docs-svg" />

These actors do not all attack the same layer. The point of the framework is that each entry path meets a specific check before it can become a trusted artifact.

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
  <text x="83" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Author DID</text>
  <rect x="28" y="136" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="83" y="151" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Override fingerprint</text>
  <rect x="28" y="164" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="83" y="179" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Knight's Seal v1</text>
  <rect x="155" y="108" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="210" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Hash-chained JSONL</text>
  <rect x="155" y="136" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="210" y="151" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Concurrency groups</text>
  <rect x="155" y="164" width="110" height="22" rx="6" fill="rgba(252,211,77,0.16)" stroke="rgba(252,211,77,0.4)"/>
  <text x="210" y="179" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Pocket Watch (calibrating)</text>
  <rect x="155" y="192" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="210" y="207" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Tier freeze</text>
  <rect x="282" y="108" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="337" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Override audit YAML</text>
  <rect x="282" y="136" width="110" height="22" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="337" y="151" text-anchor="middle" fill="#fcd34d" font-size="9" font-weight="600" font-family="system-ui, sans-serif">cosign anchoring (v2)</text>
  <rect x="408" y="108" width="110" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="463" y="123" text-anchor="middle" fill="#fca5a5" font-size="9" font-weight="600" font-family="system-ui, sans-serif">LLM provider audit</text>
  <rect x="408" y="136" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="463" y="151" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">PII rail ✓</text>
  <rect x="408" y="164" width="110" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="463" y="179" text-anchor="middle" fill="#fca5a5" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Export redaction</text>
  <rect x="535" y="108" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="590" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Cost caps (org/OKR)</text>
  <rect x="535" y="136" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="590" y="151" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Skill timeouts</text>
  <rect x="535" y="164" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="590" y="179" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Fan-out cap</text>
  <rect x="662" y="108" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="717" y="123" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Tier deterministic</text>
  <rect x="662" y="136" width="110" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="717" y="151" text-anchor="middle" fill="#86efac" font-size="9" font-weight="600" font-family="system-ui, sans-serif">Injection rail ✓</text>
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
  <rect x="28" y="300" width="180" height="42" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.45)"/>
  <text x="118" y="316" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">A.prompt-injection ✓</text>
  <text x="118" y="332" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">shipped · Prompt Guard 2 rail</text>
  <rect x="216" y="300" width="180" height="42" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="306" y="316" text-anchor="middle" fill="#fcd34d" font-size="10" font-weight="700" font-family="system-ui, sans-serif">A.memory-poisoning</text>
  <text x="306" y="332" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">partial · mesh_sha detects, no rejection</text>
  <rect x="404" y="300" width="180" height="42" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="494" y="316" text-anchor="middle" fill="#fcd34d" font-size="10" font-weight="700" font-family="system-ui, sans-serif">A.inter-agent-influence</text>
  <text x="494" y="332" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">partial · Caterpillar's Challenge</text>
  <rect x="592" y="300" width="180" height="42" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="682" y="316" text-anchor="middle" fill="#86efac" font-size="10" font-weight="700" font-family="system-ui, sans-serif">A.false-audit-fabrication</text>
  <text x="682" y="332" text-anchor="middle" fill="#cbd5e1" font-size="9" font-family="system-ui, sans-serif">verify-chain + kind→source map</text>
  <!-- Companion-threats annotation: A.audit-skip + A.audit-forge-payload close under the same defense -->
  <text x="400" y="357" text-anchor="middle" fill="#86efac" font-size="9" font-style="italic" font-family="system-ui, sans-serif">↳ same defense closes A.audit-skip (omission) + A.audit-forge-payload (fabrication)</text>
  <!-- Status legend (relocated below the ASTRIDE row) -->
  <line x1="20" y1="368" x2="780" y2="368" stroke="rgba(148,163,184,0.15)" stroke-width="1" stroke-dasharray="4"/>
  <text x="400" y="388" text-anchor="middle" fill="#94a3b8" font-size="9" font-weight="700" letter-spacing="1.5" font-family="system-ui, sans-serif">STATUS LEGEND (applies to all cells above)</text>
  <rect x="120" y="404" width="22" height="22" rx="6" fill="rgba(74,222,128,0.16)" stroke="rgba(74,222,128,0.4)"/>
  <text x="131" y="419" text-anchor="middle" fill="#86efac" font-size="11" font-weight="700" font-family="system-ui, sans-serif">✓</text>
  <text x="152" y="419" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">shipped / enforced today</text>
  <rect x="320" y="404" width="22" height="22" rx="6" fill="rgba(252,211,77,0.18)" stroke="rgba(252,211,77,0.4)"/>
  <text x="331" y="419" text-anchor="middle" fill="#fcd34d" font-size="11" font-weight="700" font-family="system-ui, sans-serif">🛠</text>
  <text x="352" y="419" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">designed but not fully enforced</text>
  <rect x="552" y="404" width="22" height="22" rx="6" fill="rgba(248,113,113,0.18)" stroke="rgba(248,113,113,0.4)"/>
  <text x="563" y="419" text-anchor="middle" fill="#fca5a5" font-size="11" font-weight="700" font-family="system-ui, sans-serif">⚠</text>
  <text x="584" y="419" fill="#e2e8f0" font-size="10" font-family="system-ui, sans-serif">honest gap (named below)</text>
  <text x="400" y="452" text-anchor="middle" fill="#a5b4fc" font-size="10" font-weight="700" font-family="system-ui, sans-serif">Covered, partial, and open controls are named below</text>
  <text x="400" y="470" text-anchor="middle" fill="#64748b" font-size="9" font-style="italic" font-family="system-ui, sans-serif">All open in GitHub for community review — honesty beats marketing claims</text>
</svg>

**The executive read.** STRIDE covers classic software threats; ASTRIDE adds the AI-agent failure modes STRIDE misses. The diagram tells a plain story: green controls are shipped or designed into the current path, yellow controls are partially covered, and red controls are honest gaps. Row-by-row detail lives in the [design doc](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/agentic-sdlc.md); the high-level summary by STRIDE category sits below.

<div class="docs-proof-list">
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-proof-title">Identity cannot be faked</p>
      <p class="docs-proof-body">Every artifact is signed by the agent session that produced it. At PRD and code-design time, the same agent inhabits Architect + Security personas in bounded self-critique. Impersonation is structurally impossible because there are no separate reviewer agents to spoof.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Proof:</strong> Knight's Seal signs every agent event with a per-event, per-epoch Ed25519 signature; CI replays the runner verifier before merge.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-proof-title">The audit record is tamper-evident</p>
      <p class="docs-proof-body">Every step the agent takes is hash-chained. Modifying a past entry breaks every entry after it, detectable online in CI and offline by an auditor replaying the JSONL.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Proof:</strong> <code>audit-verify-chain</code> replays the SHA-256 chain; Pocket Watch catches goal drift; tier is frozen at run start.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-proof-title">Claims must trace to evidence</p>
      <p class="docs-proof-body">Research claims trace to provider results; PRD requirements trace to source tags; code-design paths trace to real inventories and file reads. The agent can synthesize, but it cannot pass cleanly by inventing sources or paths.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Proof:</strong> WHY runs write a hash-pinned source registry for citable research tags; WHAT brownfield runs require <code>knowledge-code-read</code> and reject cited paths outside inventory.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-proof-title">Every decision is attributable</p>
      <p class="docs-proof-body">"Who approved this?" and "Which agent produced this?" both have one-step answers. Overrides preserve signer identities, reason, timestamp, and GitHub comment URL.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Proof:</strong> Agent judgments are signed; workflow facts are re-derived; override records preserve the human approval chain.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-queued">🛠 Queued</span>
    <div>
      <p class="docs-proof-title">External-shareable audit bundle needs a redaction layer</p>
      <p class="docs-proof-body">The internal auditor closeout report ships today (markdown export, cryptographic pass/fail verdict, requirement traceability). It includes research, PRD, and design references verbatim. That is powerful for internal audit and incident response, but external sharing with regulators or downstream consumers needs an automated PII / IP / secrets scrubbing pass first. That redaction layer plus the one-zip packaging is what's queued for the next act.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Current state:</strong> token and cost counts are captured; prompt bodies are not stored. Redacted export is queued with Audit Report Export.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-proof-title">Cost + fan-out caps are shipped</p>
      <p class="docs-proof-body">Per-skill, per-agent, per-OKR, and per-org caps freeze new assignments before runaway spend. Workflow timeouts cap CI-minute exposure. The fan-out path now bounds simultaneous in-flight implementation runs with a hard concurrency cap.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Shipped:</strong> a hard concurrency cap (5) now bounds simultaneous in-flight impl runs; dependency chains serialize via topological waves; excess ready rows queue as <code>pending-on-cap</code> and drain as runs complete.</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-partial">⚠ Partial</span>
    <div>
      <p class="docs-proof-title">Tier escalation requires real artifacts</p>
      <p class="docs-proof-body">BAR pillar scores derive from real artifact presence: CALM models, threat models, controls, and ADRs. Faking a higher tier requires creating artifacts future agents will reference.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Open items:</strong> supply-chain signing on prompt-pack deployment. (Prompt injection from external content is now closed by the Oracle &amp; Privacy Rails — shipped.)</div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-proof-title">Forged audit chains fail at the gate</p>
      <p class="docs-proof-body">On PR #105 an agent lost access to the audit-emission runner and hand-wrote JSONL with fabricated hashes. The pre-merge workflow now invokes the runner's verifier, so the writer and verifier are one implementation.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Proof:</strong> forged or mismatched chains apply <code>chain-integrity-failed</code> and block merge. This is the AI-agent-specific threat pure STRIDE does not cover.</div>
  </div>
</div>

<details>
<summary><strong>Row-by-row detail for security teams:</strong> every concrete threat + the specific control in design + status (click to expand)</summary>

| STRIDE | Concrete threat | Control in design | Status |
|---|---|---|:-:|
| **Spoof** | Reviewer impersonates the author on the same PR | At PRD AND code-design time there is no separate reviewer agent. The author agent (prd-agent / code-design-agent) inhabits Architect + Security personas in bounded self-critique, so impersonation is structurally impossible. There is only one DID per artifact run; each persona-round emits its own agent-signed `self_review` audit event from inside the persona-prompt section. The workflow no longer synthesizes unsigned review events (Bug V, 2026-05-23) | ✓ |
| **Spoof** | Dual-signature override second-signer is impersonated | Fingerprint validation tying request to OKR + phase + reason + timestamp; Signer 2 confirmed via GitHub commenter handle or signed YAML commit; signer ≠ signer | ✓ |
| **Spoof** | Author identity in audit log forged | GitHub App installation ID + `system_prompt_sha` on every Hatter Tag; **Knight's Seal: per-event, per-epoch ephemeral Ed25519 signing** (each agent session is its own signer epoch with its own keypair; revise rounds advance to epoch 2, 3, etc.; the runner's `audit-verify-chain` skill cryptographically verifies every event against the right epoch's pub key on every PR using the same code path the runner uses to write the chain). Cosign-anchored persistent signing for long-term third-party verifiability is the next act | ✓ |
| **Tamper** | Merged artifact edited after the fact | Hatter Tag frontmatter is canonical, immutable via merged commit SHA; PR-description copy is the display mirror; `verify-chain` CLI validates frontmatter vs JSONL chain | 🛠 |
| **Tamper** | Audit JSONL chain modified | Hash-chained CloudEvents v1.0; partitioned per-run-id; POSIX advisory locking within file; per-run filenames prevent cross-run collision | ✓ |
| **Tamper** | OKR YAML corrupted by simultaneous phase merges | `concurrency:` group on `okr-bus.yml` keyed by `okr_id` serializes writes per OKR; different OKRs run parallel | ✓ |
| **Tamper** | Goal drift via subtle objective rewrite | White Rabbit's Pocket Watch hashes the canonicalized objective, then checks the phase artifact ranks its *own* OKR above other active OKRs' objectives — a contrastive rank/margin signal that replaces a brittle absolute-similarity cutoff (a genuinely on-mission artifact can fall under a fixed threshold purely on register, so ranking is the robust axis); the `goal-drift-detected` label blocks merge. Contrastive scoring ships advisory while calibrated, then promotes to the blocking gate | 🛠 |
| **Tamper** | Tier creep mid-pipeline as BAR score bumps | Governance tier frozen on the Hatter Tag at run start; recorded tier applies for the run regardless of mesh-state changes | ✓ |
| **Tamper** | Agent claims it called Skills it never actually invoked (evidence laundering) | `audit-validate.yml` cross-checks the Hatter Tag's `evidence_mode` declaration against the per-run audit JSONL; if the agent declared `live` evidence but the log contains 0 successful `skill_call` events for any of the four search providers, the `degraded-evidence` label is applied and `okr-state-machine.yml` refuses to promote `governance-pass`. WHY-phase research PRs gate on `research-pass` from this same workflow | ✓ |
| **Tamper** | Agent cites fake sources or fake brownfield paths | WHY search skills record provider queries and bounded result previews. After dedupe, the runner writes a hash-pinned source registry for the `S[N]` rows the research document is allowed to cite. The WHY audit verifies titles and URLs against that registry, with preview fallback for legacy runs. WHAT-phase brownfield runs record `inventory_paths` from `knowledge-code`, require `knowledge-code-read` per brownfield repo, and fail the path-citation gate if any cited path is missing from the inventory | ✓ |
| **Tamper** | Dashboard shows a green seal or inflated metrics on a chain CI would reject | Looking Glass uses the shared `chainVerify.ts` contract: event kind must match origin, runtime/agent/workflow signing rules mirror the runner, malformed JSONL is treated as tampered, and forged events are excluded from metric extraction before CI finishes | ✓ |
| **Repudiate** | "I didn't authorize that override" | Dual-signature override YAML preserved under `okrs/<id>/audit/overrides/` with both signer DIDs, signed-at timestamps, fingerprint, and GitHub comment URL; CloudEvent emitted | ✓ |
| **Repudiate** | "That agent didn't produce that artifact" | `author_did` on Hatter Tag plus prev/this hash chain in audit JSONL; **Knight's Seal** (shipped) signs every event with the session's own ephemeral Ed25519 keypair. Each agent session is its own signer epoch, so the agent's session is the only thing that could have produced the signature. The chain plus the per-epoch pub keys committed to the mesh are sufficient to reconstruct who signed what. Persistent third-party verifiability (cosign / sigstore) is the next act | ✓ |
| **Info disclosure** | LLM provider retains our prompts indefinitely | Out of our trust boundary; the design captures cost + token counts only, not prompt bodies | ⚠ |
| **Info disclosure** | Sensitive research-source content lands in audit export | **PII rail (Presidio, shipped)** classifies the WHY research doc + source registry under a tiered policy: contact/identity/secret classes hard-fail, public-figure entities are recorded with a redaction summary. Cert-verified on a live run. External-bundle redaction-for-sharing is still queued | ✓ |
| **Info disclosure** | Audit Report Export shared externally leaks design IP | Bundle includes merged research, PRD, and code-design verbatim; no redaction layer (PII / IP / secrets scrubbing) yet. Queued for a future release | ⚠ |
| **DoS** | Cost-cap exhaustion via runaway agent runs | Per-Skill `max_skill_calls_per_run`, per-agent `max_tokens_per_run`, per-OKR `governance.max_cost_usd`, and per-org monthly cap; `cost-cap-reached` label freezes new assignments | ✓ |
| **DoS** | Skill chains time out exhausting GitHub Actions minutes | Per-Skill timeout + bounded retry policy; workflow `timeout-minutes` on every bus workflow | ✓ |
| **DoS** | Fan-out blast radius: one OKR writes to N target repos | FanOutEngine admits ≤ 5 concurrent in-flight impl runs (hard CAP); dependency chains self-serialize via topological waves (`pending-on-upstream`); excess ready rows queue as `pending-on-cap` and drain as runs complete | ✓ |
| **EoP** | Tier bypass by faking BAR-score-raising artifacts | BAR pillar score is computed deterministically from real artifact presence (threat-model.yaml, controls block, ADRs). Inflation requires creating real artifacts that future agents will reference, so the gate becomes self-reinforcing | ✓ |
| **EoP** | Prompt injection from a research-source page steers the agent | **Injection rail (Llama Prompt Guard 2 86M, shipped, required gate)** scores retrieved snippets / source registry and hard-fails the WHY PR on a confirmed injection, behind a deterministic guardrail envelope that quarantines unsafe-URL / non-allowlisted / high-marker results before synthesis. Replayed, not signed | ✓ |
| **EoP** | Compromised prompt pack version applied silently | Hatter Tag records `prompt_pack_version` + SHA; pack-deployment signature verification not in scope today | 🛠 |
| **Tamper** | Real, correctly-cited source — but the conclusion it supports isn't actually entailed by it (evidence laundering by misattribution) | **Groundedness rail (NLI cross-encoder, built · advisory):** pairs each formal conclusion against the registry excerpts it cites and checks entailment. It records today (a *contradiction* — a source that refutes its claim — will be the blocking signal once a cert tunes thresholds + pins the model; an *unsupported* claim stays needs-review). Replay-verified | ⚠ |
| **ASTRIDE: A.prompt-injection** | Attacker-controlled web content steers a search agent | **Oracle &amp; Privacy Rails (shipped):** the Phase-1 guardrail envelope quarantines unsafe results deterministically, and the Phase-3 injection rail (Llama Prompt Guard 2 86M, required gate) scores the retrieved evidence and hard-fails on a confirmed injection — replay-verified at closeout. Hatter Tag still pins `mesh_sha` for provenance | ✓ |
| **ASTRIDE: A.memory-poisoning** | Poisoned mesh artifact corrupts downstream runs | mesh_sha pinning lets `verify-chain` **detect** poisoned state across runs; **deterministic rejection of poisoned mesh artifacts is queued**. Detection only today | 🛠 |
| **ASTRIDE: A.inter-agent-influence** | Upstream agent's output steers a downstream agent | Partial coverage via Caterpillar's Challenge cross-phase semantic-drift check (PRD vs research; design vs PRD); full coverage requires agent-to-agent provenance signing | 🛠 |
| **ASTRIDE: A.false-audit-fabrication** | Agent fabricates the audit log to appear compliant | Pre-merge CI step invokes the runner's `audit-verify-chain` skill, using the same code path the runner uses to write the chain. It replays the SHA-256 hash chain AND cryptographically verifies every per-epoch Ed25519 signature; mismatch applies `chain-integrity-failed` and blocks merge (shipped) | ✓ |

</details>

### AEGIS overlay: where this design fits in the agentic-AI security landscape

**Bottom line for an enterprise security leader.** MaintainabilityAI now covers both sides of the agentic SDLC problem: the Hatter proves where intent, research, PRD, and code design came from; the Red Queen records what agents were allowed to do at the action boundary. We publish the specific controls we satisfy, the ones in flight, and the gaps that remain. No marketing claims. Every row is open in GitHub.

STRIDE alone doesn't cover agent-specific failure modes like goal drift, evidence laundering, or prompt injection from data-not-instructions confusion. Three industry frameworks sit on top of STRIDE for the agentic case. Each is summarized below as an executive question, the proof MaintainabilityAI offers today, and the honest remaining gap.

<div class="docs-proof-list docs-proof-list-compact">
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ 5 of 6 domains</span>
    <div>
      <p class="docs-proof-title">Forrester AEGIS</p>
      <p class="docs-proof-body"><strong>Executive question:</strong> can this agent be governed like a real enterprise system? Hatter proves intent, provenance, monitoring, explainability, continuous review, and control evidence across the planning chain. Red Queen now adds per-decision action evidence at the repo boundary.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Remaining gap:</strong> signed prompt-pack provenance via cosign / sigstore. <br><a href="https://www.forrester.com/blogs/introducing-aegis-the-guardrails-cisos-need-for-the-agentic-enterprise/">Forrester AEGIS</a></div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-shipped">✓ 6 of 6 controls</span>
    <div>
      <p class="docs-proof-title">AEGIS Pre-Execution Firewall</p>
      <p class="docs-proof-body"><strong>Executive question:</strong> can the agent act before policy sees it? Skill calls are recorded by the runtime, file changes are re-derived by the workflow, review judgments are signed by the agent, and Red Queen records hook / MCP decisions before the side effect proceeds.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Proof:</strong> Hatter events are hash-chained and signed today. The Red Queen's decision log is durable JSONL today; a finalize-time signing step now <strong>seals the prefix it read</strong> onto the implementation chain, and the provenance gate <strong>re-hashes that prefix at the merge SHA</strong> to verify it — validated end-to-end on a live cert run (celeb-api PR #14). A seal mismatch fails the PR; the post-seal commit-time tail stays advisory. <br><a href="https://arxiv.org/abs/2603.12621">arXiv 2603.12621</a></div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-partial">🛠 Partial</span>
    <div>
      <p class="docs-proof-title">Aegis Protocol</p>
      <p class="docs-proof-body"><strong>Executive question:</strong> can we prove the agent stayed on the approved goal? Pocket Watch ranks each phase artifact against its own OKR <em>and</em> other active OKRs, and flags it when another OKR is a better match than its own — a contrastive rank check that is more robust than scoring against a single absolute cutoff. Advisory while the signal is calibrated, then it blocks merge on drift.</p>
    </div>
    <div class="docs-proof-evidence"><strong>Not claimed:</strong> decentralized identity, post-quantum channels, or zero-knowledge policy proofs. <br><a href="https://arxiv.org/abs/2508.19267">arXiv 2508.19267</a></div>
  </div>
  <div class="docs-proof-row">
    <span class="docs-proof-status docs-proof-status-partial">🛠 2 of 4 shipped</span>
    <div>
      <p class="docs-proof-title">ASTRIDE</p>
      <p class="docs-proof-body"><strong>Executive question:</strong> are AI-agent-specific threats named, tested, and controlled? All four agent-specific failure modes are explicit rows in the threat model: prompt manipulation, poisoned memory, inter-agent influence, fake audit trails. Audit-fabrication is closed by the three-class ownership contract; prompt injection is now closed by the Oracle &amp; Privacy Rails; memory poisoning and inter-agent influence are partially controlled today (named gaps, not silent gaps).</p>
    </div>
    <div class="docs-proof-evidence"><strong>Shipped (2 of 4):</strong> event ownership is fixed by kind, runtime facts are auto-recorded, workflow facts are re-derived, agent judgments are signed, and mismatched origin is forgery — closing A.false-audit-fabrication + A.audit-skip + A.audit-forge-payload. <strong>A.prompt-injection</strong> is now closed by the Oracle &amp; Privacy Rails: a deterministic guardrail envelope quarantines unsafe results, and the injection rail (Llama Prompt Guard 2 86M, required gate, replay-verified) hard-fails the WHY PR on a confirmed injection. <strong>Partial (2 of 4):</strong> A.memory-poisoning (mesh_sha detects, deterministic rejection queued); A.inter-agent-influence (Caterpillar's Challenge catches cross-phase semantic drift; full agent-to-agent provenance signing queued). <br><a href="https://arxiv.org/pdf/2512.04785">arXiv 2512.04785</a></div>
  </div>
</div>

<details>
<summary><strong>Forrester AEGIS:</strong> row-by-row detail for security teams (click to expand)</summary>

| Forrester domain | Forrester named control | MaintainabilityAI implementation | Status |
|---|---|---|:-:|
| Governance, Risk & Compliance | Machine-executable, context-aware policy enforcement | Hatter per-phase gate workflows (`market-research-agent.yml`, `prd-agent.yml`, audit-validate, drift-gate) enforce policy in CI; Red Queen policy files enforce repo-local action rules before tool execution | ✓ |
| Identity & Access Management | Agents as hybrid identities with just-in-time privileges | Per-agent `.agent.md` declares minimum-necessary `tools:` list; deployment refuses to land an agent referencing an undeclared Skill | ✓ |
| Data Security & Privacy | Data provenance, memory, enclaves | Hatter Tag pins `mesh_sha` + `prompt_pack_version` + chain root; every artifact traces back to source documents | ✓ |
| Application Security & DevSecOps | Prompt engineering + supply-chain validation | Prompt packs versioned + SHA-stamped. **Pack-signature verification via cosign / sigstore** is a future enhancement that pairs with the persistent Knight's Seal evolution (v1 ephemeral keys, v2 cosign-anchored) | 🛠 |
| Threat Management & SecOps | Real-time monitoring + detection engineering | Hatter hash-chained audit JSONL is queryable and replayable; Red Queen `.redqueen/audit-log.jsonl` records every hook and `validate_action` decision with verdict, rule ID, and override attribution. The prefix of that log is sealed onto the signed implementation chain at finalize (shipped, cert-verified); a standalone `redqueen-action` gate + SIEM / CloudEvents export remain Queen's Next Act | ✓ / 🛠 |
| Zero Trust | "Least agency": minimum permissions per goal | Each agent's `.agent.md` declares a minimum-per-task `tools:` list; skill backends are pure-data and can't mutate beyond their declared writes. Red Queen enforces least agency at action time through pre-tool hooks, MCP `validate_action`, permission tiers, and custom team rules. There are no separate reviewer agents; the author agent's tool scope is bounded to what its persona-switch self-critique requires | ✓ |

**Core principles satisfaction.** *Least Agency* ✓ (per-agent tool whitelists). *Continuous Assurance* ✓ (every PR re-runs the gate workflows, not point-in-time review). *Explainable Outcomes* ✓ (audit JSONL is both human- and machine-readable; correctness summary PR comment names the failure reasons literally).

</details>

<details>
<summary><strong>AEGIS Pre-Execution Firewall:</strong> row-by-row detail for security teams (click to expand)</summary>

| AEGIS Pre-Execution Firewall control | MaintainabilityAI implementation | Status |
|---|---|:-:|
| SHA-256 hash chain over every audit record | `prev_event_hash` linkage on every JSONL line; `chain_root_hash` pins the run | ✓ |
| Tamper-evident audit trail | Modifying any past event breaks every subsequent `prev_event_hash`; the runner's `audit-verify-chain` skill catches it both online (CI) and offline (auditor re-run) | ✓ |
| **Pre-merge chain verification (CI gate)** | `audit-and-drift` workflow calls the runner's `audit-verify-chain` skill, using the same code path the runner uses to write the chain, pinned to a specific runner version per workflow template. Verifies SHA-256 hash chain integrity AND per-epoch Ed25519 signatures against every committed `<runId>.epoch-N.pub.pem`. One implementation, one source of truth, no drift between writer and verifier. Sealed chains that fail signature verification block merge with `chain-integrity-failed`; per-epoch chains that arrive unsealed are rejected too (the contract says signed). Closed the gap where an agent that lost access to the `audit-emit-event` runner could hand-write the JSONL with fabricated hashes (observed on PR #105) | ✓ |
| **Three-class event ownership (Court Recorder Auto-Logging + Bug V/W/Y/Z)** | The skill runtime emits `skill_call` events inside `runSkill()` itself. The workflow re-derives `artifact_written` from `git diff` and `state_transition` / `human_gate` from PR labels + reviewer state. The agent emits `self_review` via `audit-emit-event` from inside its persona-prompt section while its per-epoch private key is still in scope, and the runner signs it cryptographically. The split is deterministic-vs-LLM: facts that deterministic code can derive are workflow-emitted; signed LLM judgment (persona-critique scoring) is agent-emitted; everything is cross-checked against the chain. Closes three threats in one design: A.false-audit-fabrication, A.audit-skip, A.audit-forge-payload. Bug Z also keeps the privileged runtime emitter off the package export surface so `internal:true` is not a consumer-callable API. | ✓ |
| **Audit-event payload contract pinned with a regression test** | The emitted event shape is documented in a canonical contract (`design/audit-event-shape.md`) and pinned by an automated test that asserts the flat-merge behavior, canonical-field-wins-on-collision, and absence of nested `payload.audit_metadata`. Any future drift between emitter + downstream auditor breaks the test before reaching production. Closes the operational-drift class of bugs where the contract was implicit and a workflow could silently read the wrong key | ✓ |
| **Phase-spec cross-layer consistency tests** | The per-phase strings (agent name, label variants, artifact path, workflow file, meta-status transitions) live in a single source-of-truth map (`src/types/phaseSpec.ts`). Cross-layer consistency tests assert every label / agent / workflow this map references is also in the deploy registries. Drift between the extension and what's deployed to the mesh repo fails at test time, not at production-run time. Closes the class of bugs where a label was renamed in one place and silently broke `gh pr edit` somewhere else | ✓ |
| Pre-execution interception (log before side effect) | `runSkill()` wraps every handler: emit the audit event before the result returns to the caller. The window between "skill ran" and "audit recorded" doesn't exist because they're the same function | ✓ |
| **Ed25519 per-event, per-epoch signing (Knight's Seal)** | Each agent session is its own signer epoch with its own ephemeral Ed25519 keypair. The original agent invocation is epoch 1; the first revise-agent is epoch 2; the second revise is epoch 3; etc. The private key never leaves the session that created it; the public key is committed to the mesh at `audit/keys/<runId>.epoch-N.pub.pem`. Every emitted event carries its signature plus the `signer_epoch` value. CI invokes the runner's `audit-verify-chain` skill, using the same code path the runner uses to write the chain, which loads all epoch pub keys and verifies each event against the right one. A green Sealed badge surfaces in the Looking Glass phase card + the PR audit comment. Cosign / sigstore-anchored persistent signing is the next act | ✓ |
| Content-first risk scanning on extracted tool args | Pure-data skills return structured JSON the parent agent inspects; no prompt-vs-data conflation | ✓ |
| **Red Queen pre-side-effect decision log** | Claude Code and Copilot hooks validate Edit / Write / Bash before the action proceeds. Built-in rails emit stable rule IDs (`TIER-*`, `CTRL-*`, `SEC-*`, `CALM-*`, `PLAT-*`), and `customRules[]` lets teams add their own regex-scoped rule IDs. Every hook decision appends a fail-soft JSONL line with verdict, rule ID, tool, path, and session context | ✓ |
| **Override attribution at action time** | When `REDQUEEN_TOOL_APPROVED`, `REDQUEEN_PLAN_APPROVED`, or `toolInput.redqueenApproved` flips a deny into an allow, the audit line records `override: true`, `bypassedRuleId`, and `approvalSource`. An override no longer looks like an ordinary allow | ✓ |
| Signed Red Queen enforcement chain | **Shipped (prefix sealing, cert-verified celeb-api PR #14):** the implementation agent's last governed action seals the prefix of the Red Queen decision log (covered bytes + sha256) onto the per-event Ed25519 implementation chain, and the provenance gate re-hashes that prefix at the merge SHA — a mismatch fails the PR; the post-seal commit-time tail is reported as an honest, named advisory. **Remaining (Queen's Next Act):** the standalone `redqueen-action` required status check (AST + contract diffs), cross-chain inclusion proofs, and SIEM / CloudEvents export | ✓ / 🛠 |

</details>

#### One closeout report. Source files underneath.

**What it prevents:** An audit should not depend on a meeting. Without a readable closeout, a reviewer opens a folder of logs and has to ask someone else the basic questions: did the chain pass, which claims are facts, which agent signed what, and which requirement was this supposed to satisfy? The closeout report puts those answers in one place.

**How it works:** When an OKR action completes, Looking Glass exports one markdown report at `okrs/<id>/audit/exports/<runId>-report.md`. The report starts with the answer, then shows the evidence behind it:

- **Pass or fail.** The same chain checker CI uses says whether the signatures, hashes, chain head, and event count line up.
- **Source posture.** The report names where each input came from and whether the report used the same bytes the checker verified.
- **What happened.** Skills called, files written, PR merged, and state changes, separated from the agent's own claims.
- **Why the judgment changed.** Architect and Security review rounds, with event IDs for each score.
- **Requirement trace.** Security requirements mapped back to the PRD, the design, and any declared OWASP or STRIDE category.
- **Timeline and ladder.** Every event in this action, plus how this action links to the surrounding WHY, HOW, and WHAT chains.

The report also points to the source files, so a reviewer can drill in without guessing where the evidence lives:

- `okrs/<id>/<phase>/<artifact>.md`: the merged research document, PRD, or code design.
- `okrs/<id>/audit/events/<run>.jsonl`: the activity log.
- `okrs/<id>/audit/keys/<run>.epoch-*.pub.pem`: the public keys used to check signatures.
- `okrs/<id>/audit/sources/<run>.source-registry.json`: the source registry for WHY research.
- `okrs/<id>/audit/chain-ladder.yaml`: the cross-phase ladder.
- `okrs/<id>/how/prd.md`: the PRD used for control mapping.

**What the auditor sees:** Open one document. Read the verdict. Check the evidence. Drill into the source files only when needed. Nothing to grep, nothing to install, nothing to wait for. An internal auditor, a security architect, or an incident-response team at 3 AM sees the same evidence CI checked before merge.

<div class="docs-report-preview-callout">
  <div>
    <div class="docs-card-kicker">Proof, rendered</div>
    <div class="docs-heading">Open the sample audit report</div>
    <div class="docs-copy">See the OKR closeout the way an auditor would read it: verdict first, then phase rollup, chain ladder, control coverage, and verifier command.</div>
  </div>
  <button type="button" class="docs-button-primary" data-audit-report-preview>View sample audit report</button>
</div>

**What external audiences get next.** The closeout is internal-grade today: it cites research, PRD, and design references verbatim, which is powerful inside the org but not safe to hand to a regulator without review. External sharing currently requires a manual review pass. The next act bundles the closeout plus the source files into one downloadable zip after an automated PII / IP / secrets scrubbing pass, so the same evidence can land with regulators, downstream consumers, and third-party auditors without leaking prompt internals or proprietary code references.

No live system access. No proprietary tooling. Five checks land the story:

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Check 1 · Chain replay</div>
    <div class="docs-heading">Is the record intact?</div>
    <div class="docs-copy">Replay the JSONL from top to bottom. Each line points to the one before it, and the first line must match the <code>chain_root_hash</code> stamped into the artifact. This is the same check CI ran before merge, so the offline audit and the merge gate use one rule.</div>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Check 2 · Provenance</div>
    <div class="docs-heading">Did the agent use evidence?</div>
    <div class="docs-copy">Research findings, PRD requirements, and design decisions must trace back to recorded skill calls, source IDs, or code paths. If a claim has no source, it is treated as ungrounded and the phase cannot pass cleanly.</div>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Check 3 · Reproducibility</div>
    <div class="docs-heading">Can the evidence be replayed?</div>
    <div class="docs-copy">Search events keep the queries and bounded previews; WHY runs also keep a hash-pinned source registry for every citable research source. Code-grounding events keep the file inventory and explicit file reads. A reviewer can see what the agent saw, rerun the important calls, and separate real provider drift from invented evidence.</div>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Check 4 · Tamper detection</div>
    <div class="docs-heading">Was anything altered?</div>
    <div class="docs-copy">Changing a past event breaks the hash chain. Substituting an agent event also breaks Knight's Seal because every agent event is signed with that session's Ed25519 key. Workflow events are allowed to be unsigned only because they are re-derived from GitHub state; signed workflow events are rejected as suspicious.</div>
  </div>
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Check 5 · Three-class event ownership</div>
    <div class="docs-heading">Who produced each event?</div>
    <div class="docs-copy">Each event kind has one allowed source. Runtime produces tool-call facts. Workflow produces GitHub facts. The agent signs review judgments and gap-loop decisions. A mismatched source is forgery, not a warning. That keeps the simple mental model intact: deterministic code proves facts; the agent signs its judgments; CI checks both.</div>
  </div>
</div>

<div class="docs-card docs-card-cyan">
  <div class="docs-card-kicker">Auditor proof</div>
  <div class="docs-heading">One record that survives replay</div>
  <div class="docs-copy">
    <p><strong>Compliance proof:</strong> the same chain supports EU AI Act Article 12 evidence (retention, model, inputs, operator, timestamps) and SOC 2 CC8.1 change-control review. The offline auditor check matches the pre-merge CI check: facts produced by deterministic code, judgments signed by the agent.</p>
    <p><strong>Live-run proof:</strong> in the May 2026 cert run, all three planning agents shipped a real OKR on the open IMDB-Celebs sample end-to-end. The exported whole-OKR rollup verdict reads <strong><code>✅ PASS — All 3 phases present, runner-verified, and source-atomic</code></strong>. WHY, HOW, and WHAT each landed signed (every agent event under a per-session Ed25519 key), source-atomic (canonical GitHub on every input the report cites), and threaded through one <code>intent_thread_uuid</code> in the cross-phase ladder. The control-mapping section traced every PRD-declared security requirement back to its STRIDE / OWASP roots and forward to the design citation. Outstanding gaps: <em>none</em>. Click the <em>View sample audit report</em> button above to see the full rollup the way an auditor would read it.</p>
    <p><strong>Hardening proof:</strong> this trust model is the result of multiple adversarial audit rounds with both LLM-based code review and human chief-auditor passes. Each round made the boundary more precise. The current model is what survived.</p>
  </div>
</div>

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">WHY · research phase</div>
    <div class="docs-copy">Signed chain end-to-end. Evidence mode logged honestly when sources failed (rate-limited APIs, zero-result searches). No fabrication of coverage the agent did not actually have.</div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">HOW · product spec phase</div>
    <div class="docs-copy">Signed chain end-to-end. Reviewer personas converged from MINOR to PASS in bounded rounds. The tier the agent declared matched the tier the runtime measured. No tier hallucination.</div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">WHAT · code design phase</div>
    <div class="docs-copy">Signed chain end-to-end across multiple PRs covering both modes: one grounded against an existing repo (cited file inventory at a specific commit), one returning a scaffolding spec for a repo that did not exist yet. Both modes recorded so a reviewer can verify the agent grounded each correctly.</div>
  </div>
</div>

<p style="text-align:center; font-size:0.9rem; color:#94a3b8; margin-top:1rem;">The full exported closeout report, including cryptographic pass/fail verdict, requirement traceability, and event timeline, is in the mesh repo under <code>okrs/&lt;id&gt;/audit/exports/&lt;runId&gt;-report.md</code>.</p>

The "the agent cannot fabricate the audit log" claim is now a measured property of merged runs, not a design assertion. The audit-event shape is regression-locked across the runtime, the workflow that reads the chain, and the dashboard that displays it. Drift between any two layers breaks at test time.

### What we're still closing

We publish this list because honest design beats marketing claims. Every status badge in the tables above maps to one of the items below: what's shipped, what's queued for a named phase, what's open research with no committed date, and what's explicitly out of scope. Reviewers can scan it left to right.

<div class="docs-gap-list">
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-queued">🛠 Queued</span>
    <div>
      <p class="docs-gap-title">Knight's Seal v2: persistent external verification (cosign / sigstore)</p>
      <p class="docs-gap-body">Knight's Seal v1 ships today (per-event, per-epoch Ed25519 signing; see hero promise + Court Recorder above) and is sufficient for internal replay: any reviewer with the mesh repo can verify any chain in place via the runner's <code>audit-verify-chain</code> skill. v2 anchors the same chain to cosign / sigstore so an external auditor a year out can verify a year-old artifact without trusting the key material embedded in its own audit log. Same signing primitive, durable external root of trust.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-gap-title">Shipped: Red Queen signed enforcement chain</p>
      <p class="docs-gap-body">Red Queen writes a per-decision JSON log for every hook + <code>validate_action</code> call: verdict, rule ID, target, override attribution. That log is now folded into the same signed chain the Hatter side uses. Because it is a live append-only sidecar (the hook fires on the agent's own final commit), the implementation agent's last governed action <strong>seals the prefix it read</strong> (covered bytes + sha256) onto the per-event Ed25519 implementation chain, and the provenance gate <strong>re-hashes that exact prefix at the merge SHA</strong> to verify it. A seal mismatch fails the PR; the agent's own post-seal commit-time decisions are reported as an honest, named tail. <strong>Verified end-to-end on a live cert run</strong> (celeb-api PR #14: <em>signed &amp; verified · 32 decisions sealed · 3 post-seal, allow-only</em>).</p>
      <p class="docs-gap-next"><strong>Remaining (Queen's Next Act):</strong> the standalone <code>redqueen-action</code> hard merge gate (AST + contract diffs), cross-chain inclusion proofs, and SIEM / CloudEvents export.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-gap-title">Shipped: Internal Audit Report Export — per-action reports plus whole-OKR rollup</p>
      <p class="docs-gap-body">One-click markdown export from Looking Glass produces a per-action closeout per merged phase containing the cryptographic pass/fail verdict, shape-level seal verdict, per-skill evidence table, per-persona self-review trail with <code>event_id</code> citations, workflow facts (<code>artifact_written</code> + <code>state_transition</code>), collapsible event timeline, a requirement traceability table tying security requirements to STRIDE, OWASP, the PRD, and the design, and the cross-phase WHY→HOW→WHAT ladder. Saved to <code>okrs/&lt;id&gt;/audit/exports/&lt;runId&gt;-report.md</code> for durable record. A whole-OKR rollup folds the per-action reports plus every implementation row into one auditor-readable document, re-verifying the chain ladder at export time.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-queued">🛠 Queued</span>
    <div>
      <p class="docs-gap-title">Redacted external bundle, one zip for regulators</p>
      <p class="docs-gap-body">The internal closeout ships now. The next act packages it plus its source files (artifact, JSONL chain, ladder, pub keys) into a single downloadable zip, after running an automated PII / IP / secrets scrubbing pass so the bundle is safe to share with external auditors, regulators, or downstream consumers without exposing prompt internals or proprietary code references verbatim.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-queued">🛠 Queued</span>
    <div>
      <p class="docs-gap-title">Org-separation on dual-signature override</p>
      <p class="docs-gap-body">Today's override gate requires Signer 2 ≠ Signer 1, both human, both authorized by the org's override policy. What it doesn't catch: two engineers on the same team coordinating an override between themselves.</p>
      <p class="docs-gap-next"><strong>Next:</strong> org-graph-aware enforcement with different team and different cost-center required for the second signature.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-queued">🛠 Queued</span>
    <div>
      <p class="docs-gap-title">Prompt-pack signature verification</p>
      <p class="docs-gap-body">Prompt packs deploy from the mesh template. The Hatter Tag records the pack version and SHA on every run, so post-hoc auditing works today. What's open: a malicious commit to the template repo could ship a poisoned pack and the runtime won't refuse to load it.</p>
      <p class="docs-gap-next"><strong>Next:</strong> signed-pack-only deployment, anchored in the same cosign-based root of trust as the Knight's Seal evolution above.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-queued">⚠ Built · advisory</span>
    <div>
      <p class="docs-gap-title">Built (advisory): Groundedness rail (Oracle &amp; Privacy Rails, Phase 4)</p>
      <p class="docs-gap-body">All four Oracle &amp; Privacy Rails are now built: the deterministic guardrail envelope, the PII rail (Presidio), the injection rail (Llama Prompt Guard 2, a required gate), and the groundedness rail. The groundedness rail is the semantic layer above provenance — a <strong>pairing rail</strong> that pairs each Formal Conclusion (hypothesis) against the registry excerpt of the S-tags it cites (premise) and runs a local NLI cross-encoder (DeBERTa MNLI/FEVER/ANLI), so a claim entailed by any one cited source passes. It runs + records on every WHY run today under a <strong>tiered</strong> policy (contradiction is the serious signal; unsupported is needs-review). It is <strong>advisory</strong>: the model isn't pinned yet, so it does not hard-fail the PR.</p>
      <p class="docs-gap-next"><strong>Next (cert → promote):</strong> a fixture corpus + a live WHY sample tune the entailment/contradiction thresholds, then pin the model commit and promote <em>contradiction</em> to blocking — same replay-verified gate treatment as the PII + injection rails. <em>Unsupported</em> stays needs-review (it must not punish legitimate cross-source synthesis).</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-gap-title">Shipped: Prompt injection from external research (Oracle &amp; Privacy Rails, Phase 3)</p>
      <p class="docs-gap-body">A Tavily / arXiv / Hacker News result carrying crafted prompt-injection text can no longer steer the market-research-agent unnoticed. Two layers now guard it: a deterministic <strong>guardrail envelope</strong> in the research-runner (Phase 1) that quarantines results with unsafe URLs, non-allowlisted providers, or high-confidence injection markers before synthesis; and an <strong>injection rail</strong> (Phase 3) that scores the retrieved snippets / source registry with <a href="https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-86M">Llama Prompt Guard 2 86M</a> and hard-fails the WHY PR on a confirmed injection. The rail is <strong>a required gate</strong>, pinned to a specific Hugging Face commit, with a quoted/cited/code-fenced carve-out so a security-research corpus that <em>discusses</em> injection isn't flagged for <em>delivering</em> it. Verdicts are <strong>replayed, not signed</strong>: the closeout re-runs the pinned model over the committed bytes and compares — a mismatch fails the rollup, never a silent pass.</p>
      <p class="docs-gap-next"><strong>Phase 4:</strong> a groundedness rail (NLI cross-encoder) proving each conclusion is entailed by a cited source — now built and shipping advisory (see below).</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-shipped">✓ Shipped</span>
    <div>
      <p class="docs-gap-title">Shipped: PII in research evidence (Oracle &amp; Privacy Rails, Phase 2)</p>
      <p class="docs-gap-body">A <strong>PII rail</strong> built on <a href="https://microsoft.github.io/presidio/">Microsoft Presidio</a> scans the WHY research doc and source registry under a tiered policy: contact / identity / secret classes (SSN, card, bank, private email/phone, IP, government IDs, secret tokens) <strong>hard-fail</strong> the PR; public-figure entities (person, public org, public location) are <strong>allowed and recorded with a redaction summary</strong>; an allowed entity in a sensitive context escalates to <strong>needs-review</strong>. Cert-verified on a live WHY run (0 blocked, 658 redacted, verdict pass). Like the injection rail, it is <strong>replayed, not signed</strong> — the model re-runs over committed bytes at closeout. The report never stores a raw value, only the entity type and a safe location ref.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <span class="docs-gap-status docs-gap-status-scope">Out of scope</span>
    <div>
      <p class="docs-gap-title">LLM-provider audit blind spot</p>
      <p class="docs-gap-body">Anthropic and GitHub Copilot retain our prompts and outputs under their own retention policies. Our audit chain stops at the request boundary; we record token counts and costs, not prompt bodies.</p>
      <p class="docs-gap-next"><strong>Status:</strong> only changes if self-hosted inference is in scope, which it isn't on the current roadmap.</p>
    </div>
  </div>
</div>

We treat this list as **living**. As the design ships and we learn from real OKR runs, items move (some close into the controls tables above, new ones surface). The threat model lives in [the design doc](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/agentic-sdlc.md) and tracks alongside the deliverables map.

> 💬 **Responsible disclosure.** Found a threat we haven't named? Open an issue at [github.com/AliceNN-ucdenver/MaintainabilityAI](https://github.com/AliceNN-ucdenver/MaintainabilityAI) or contact [chiefarcheologist.com/contact](https://chiefarcheologist.com/contact). We treat security threats as design feedback, not as criticism.


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


## Manage intent. Quality follows.

The shift is not "AI will do more of the work." That part is settled. The shift is whether the work it does is governed, attributable, and worth the speed.

Three human gates per OKR. Per-epoch signatures on every agent event. A stitched evidence chain from OKR intent to merged code — planning events in the mesh, implementation events in each target repo, joined at the merge commit SHA. A control plane your architect, your compliance lead, and your CISO can all read from the same screen. **A stitched audit trail per OKR. One human gate per phase. Zero credential reissuance between agents.** Trust earned, not granted.

Manage intent. Quality follows.

<div class="docs-center-block">
<div class="docs-heading">Free. Open Source. Forever.</div>
<div class="docs-copy">No $100K enterprise license. No SaaS vendor lock-in. Your governance data lives in Git, version-controlled alongside your code.</div>
</div>

<div class="docs-actions docs-actions-center">
  <a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" class="docs-button-primary">Install the Extension</a>
  <a href="/docs/onboarding/" class="docs-button-secondary">Onboarding pack &rarr; first OKR this week</a>
  <a href="/docs/hatters-tea-party" class="docs-button-secondary">Read the Hatter's Tea Party</a>
  <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI" class="docs-button-secondary">View on GitHub</a>
</div>


<div class="docs-hero-flourish">
  <em>"Why, sometimes I've believed as many as six impossible things before breakfast."</em>
  <br/><small>Lewis Carroll</small>
</div>
