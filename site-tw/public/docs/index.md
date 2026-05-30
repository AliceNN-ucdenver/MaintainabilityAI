# MaintainabilityAI Documentation

<div class="docs-hero">
  <div class="docs-hero-inner">
    <div class="docs-eyebrow">Start here <span class="docs-hero-meta">~3 min read</span></div>
    <h2 class="docs-hero-title">One framework for security-first, architecture-aware AI engineering.</h2>
    <p class="docs-hero-copy">Use these docs as a guided path: understand the vision, learn the framework, practice it in the workshop, then apply prompt packs, SDLC phases, Golden Rules, and Red Queen controls in real repositories.</p>
  </div>
</div>

## Find your starting point

Pick the lens you bring to AI engineering. Each persona has a focused two-page on-ramp that explains the framework in the language you already use.

<div class="docs-grid docs-grid-wide">
  <a href="./framework" class="docs-card docs-card-blue">
    <div class="docs-card-kicker">For architects</div>
    <h3 class="docs-card-title">Make architecture the agent contract</h3>
    <p class="docs-card-body">CALM as the source of truth. Threat models, fitness functions, and trust zones that travel with the work into every PR and every agent action.</p>
    <p class="docs-muted">Framework &middot; SDLC &middot; Evolutionary architecture &rarr;</p>
  </a>

  <a href="./workshop/" class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">For developers</div>
    <h3 class="docs-card-title">Ship faster without the rework</h3>
    <p class="docs-card-body">RCTRO prompts that produce reviewable PRs the first time, with attack-vector tests included. Apply OWASP packs in the editor or via your favourite coding agent.</p>
    <p class="docs-muted">Workshop &middot; OWASP packs &middot; Agent guides &rarr;</p>
  </a>

  <a href="./governance/governed-golden-rules" class="docs-card docs-card-rose">
    <div class="docs-card-kicker">For security &amp; compliance</div>
    <h3 class="docs-card-title">Get the evidence flowing</h3>
    <p class="docs-card-body">Deterministic policy enforcement and audit trails mapped to SOC&nbsp;2, ISO&nbsp;27001, NIST 800-53, and PCI&nbsp;DSS. Every allow / deny / override is recorded.</p>
    <p class="docs-muted">Golden Rules &middot; Compliance mapping &middot; STRIDE &rarr;</p>
  </a>

  <a href="./agentic-sdlc-governance" class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">For leadership</div>
    <h3 class="docs-card-title">Why the gap exists &mdash; and how to close it</h3>
    <p class="docs-card-body">The 70/30 gap between what AI accelerates and what governs whether systems survive. The market position, the operating model, the adoption path. Branches into the Hatter's Tea Party and Red Queen's Court.</p>
    <p class="docs-muted">Agentic governed SDLC &middot; Two modalities &middot; Audit chain &rarr;</p>
  </a>

  <a href="./onboarding/" class="docs-card docs-card-violet">
    <div class="docs-card-kicker">For your team on Monday</div>
    <h3 class="docs-card-title">Onboarding pack &mdash; ship your first signed OKR this week</h3>
    <p class="docs-card-body">Four short chapters: install &amp; seed the mesh, learn to read an audit report, run your first real OKR, triage when something fails. By the end you'll have a real signed audit rollup for a real OKR your team actually wanted to ship.</p>
    <p class="docs-muted">Install &middot; Read &middot; Run &middot; Recover &rarr;</p>
  </a>
</div>

## Prompt Pack Libraries

<div class="docs-panel">
  <p class="docs-panel-copy">All prompt packs follow the same operating model: provide role, context, task, requirements, and output criteria so humans and agents can validate the work instead of trusting generated code blindly.</p>
  <div class="docs-grid">
    <a href="./prompts/threat-modeling/" class="docs-card docs-card-orange">
      <h3 class="docs-card-title">STRIDE Threat Modeling</h3>
      <p class="docs-card-body">Design-phase prompts that identify threats and map them to OWASP controls before code is written.</p>
    </a>
    <a href="./prompts/owasp/" class="docs-card docs-card-rose">
      <h3 class="docs-card-title">OWASP Top 10</h3>
      <p class="docs-card-body">Security implementation prompts with attack scenarios, validation checklists, and remediation guidance.</p>
    </a>
    <a href="./prompts/maintainability/" class="docs-card docs-card-emerald">
      <h3 class="docs-card-title">Maintainability</h3>
      <p class="docs-card-body">Evolutionary architecture prompts for fitness functions, dependency hygiene, technical debt, and refactoring.</p>
    </a>
  </div>
</div>

## End-to-end walkthroughs

<div class="docs-panel">
  <p class="docs-panel-copy">Concrete walkthroughs that take one input (an Oraculum finding, a research request) and produce one outcome (a merged implementation PR with the full audit chain attached).</p>
  <div class="docs-grid">
    <a href="./walkthrough/research-prd-chain" class="docs-card docs-card-blue">
      <h3 class="docs-card-title">Research → PRD → Implementation</h3>
      <p class="docs-card-body">From a mesh gap to a merged PR. Includes the full scaffolding checklist for existing meshes &mdash; what to add when your governance repo predates the research/PRD agents.</p>
      <p class="docs-muted">VS Code extension &middot; Archeologist &middot; PRD agent &middot; Cross-repo bridge &rarr;</p>
    </a>
  </div>
</div>

## Framework Areas

<div class="docs-grid docs-grid-wide">
  <a href="./sdlc/" class="docs-card docs-card-muted">
    <h3 class="docs-card-title">SDLC Framework</h3>
    <p class="docs-card-body">Six phases from design through evolution, with security and maintainability gates in each phase.</p>
  </a>
  <a href="./maintainability/" class="docs-card docs-card-muted">
    <h3 class="docs-card-title">Evolutionary Architecture</h3>
    <p class="docs-card-body">Fitness functions and change patterns that keep systems adaptable as AI accelerates delivery.</p>
  </a>
  <a href="./governance/compliance-mapping" class="docs-card docs-card-muted">
    <h3 class="docs-card-title">Compliance Mapping</h3>
    <p class="docs-card-body">Every framework artifact mapped to SOC&nbsp;2, ISO&nbsp;27001, NIST 800-53, PCI&nbsp;DSS, OWASP Agentic Top 10, NIST AI RMF, ISO 42001, and the EU AI Act.</p>
  </a>
  <a href="./research/agentic-governance-landscape" class="docs-card docs-card-muted">
    <h3 class="docs-card-title">Agentic Governance Landscape</h3>
    <p class="docs-card-body">2026 market research: Microsoft AGT, GitHub, Snyk, the EU AI Act. Where MaintainabilityAI sits and what we&rsquo;re building next.</p>
  </a>
  <a href="./quickstart-redqueen" class="docs-card docs-card-red">
    <h3 class="docs-card-title">Red Queen Quickstart</h3>
    <p class="docs-card-body">Scaffold hooks, MCP validation, review workflows, and governance doctor checks into a real repository.</p>
  </a>
</div>

## Agent Guides

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>Two categories of AI.</strong> In-editor assistants you drive directly, and agentic AI that operates autonomously on GitHub. Each needs different guidance, governance, and trust. Start with the agent you have, then see how the framework wraps it.</p>

  <div class="docs-card-kicker">In-editor assistants</div>
  <div class="docs-grid">
    <a href="./agents/claude" class="docs-card docs-card-indigo">
      <div class="docs-card-subtitle">Claude Code</div>
      <h3 class="docs-card-title">Complex refactoring &amp; testing</h3>
      <p class="docs-card-body">Multi-file refactoring, comprehensive attack-vector test suites, technical-debt analysis. Strong at cross-file coordination.</p>
    </a>
    <a href="./agents/copilot" class="docs-card docs-card-blue">
      <div class="docs-card-subtitle">GitHub Copilot</div>
      <h3 class="docs-card-title">In-editor code generation</h3>
      <p class="docs-card-body">Real-time IDE completion with #codebase context. Fast iteration on single functions with security constraints in the prompt.</p>
    </a>
  </div>

  <div class="docs-card-kicker">Agentic AI · governed by The Red Queen</div>
  <div class="docs-grid">
    <a href="./agents/claude-code-action" class="docs-card docs-card-cyan">
      <div class="docs-card-subtitle">Claude Code Action</div>
      <h3 class="docs-card-title">Autonomous in GitHub Actions</h3>
      <p class="docs-card-body">Full MCP access — resources, tools, prompts. Pre-tool hooks + embedded self-review and an always-on impl-provenance gate over the signed audit chain. Best for autonomous issue remediation.</p>
    </a>
    <a href="./agents/copilot-coding-agent" class="docs-card docs-card-emerald">
      <div class="docs-card-subtitle">Copilot Coding Agent</div>
      <h3 class="docs-card-title">Autonomous in GitHub</h3>
      <p class="docs-card-body">Same governance mesh and policy engine; different hook and config adapter. Drop-in for teams standardized on Copilot.</p>
    </a>
    <a href="./agents/alice" class="docs-card docs-card-rose">
      <div class="docs-card-subtitle">Alice Agent 🐰</div>
      <h3 class="docs-card-title">The Good Maintainer</h3>
      <p class="docs-card-body">Two-phase autonomous remediation: curiosity → approval → implementation. Built on Claude Code for CodeQL fixes and debt reduction.</p>
    </a>
    <a href="./agents/multi-agent" class="docs-card docs-card-amber">
      <div class="docs-card-subtitle">Multi-Agent</div>
      <h3 class="docs-card-title">Orchestration patterns</h3>
      <p class="docs-card-body">Sequential pipelines, parallel workstreams, validator loops, and consensus review boards. How agents hand off evidence to each other.</p>
    </a>
  </div>
</div>

## Recommended Routes

| If you are... | Start with | Then read |
|---|---|---|
| New to the story | [Vision](./agentic-sdlc-governance) | [Framework](./framework), [Workshop](./workshop/) |
| Teaching a team | [Workshop](./workshop/) | [OWASP packs](./prompts/owasp/), [Golden Rules](./governance/governed-golden-rules) |
| Hardening a repo | [SDLC](./sdlc/) | [Maintainability](./maintainability/), [Red Queen Quickstart](./quickstart-redqueen) |
| Enabling agents | [Agent Guides](./agents/) | [Framework](./framework), [Red Queen's Court](./red-queens-court) |
| Preparing for audit | [Compliance Mapping](./governance/compliance-mapping) | [Golden Rules](./governance/governed-golden-rules), [Phase 4: Governance](./sdlc/phase4-governance) |

---

<div class="docs-cta">
  <h2 class="docs-cta-title">Ready to get hands-on?</h2>
  <p class="docs-cta-copy">Start with the workshop if you want practice, or read the framework if you want the complete operating model first.</p>
  <div class="docs-actions docs-actions-center">
    <a href="./workshop/" class="docs-button-primary">Begin Workshop</a>
    <a href="./framework" class="docs-button-secondary">Read Framework</a>
  </div>
</div>
