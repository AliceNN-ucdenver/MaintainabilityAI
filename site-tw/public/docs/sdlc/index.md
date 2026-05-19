<div class="docs-hero docs-hero-cyan">
  <div class="docs-hero-glyph"><img src="/images/glyphs/watch.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><span>SDLC</span></div>
    <div class="docs-eyebrow">Continuous SDLC <span class="docs-hero-meta">~7 min read</span></div>
    <h1 class="docs-hero-title">A security-first lifecycle for AI-assisted engineering</h1>
    <p class="docs-hero-copy">Six phases, six measurable gates, one feedback loop. Where OWASP Top 10, evolutionary architecture fitness functions, and multi-agent orchestration meet in the developer&rsquo;s day.</p>
    <span class="docs-hero-flourish">&ldquo;Begin at the beginning, and go on till you come to the end: then stop.&rdquo;</span>
  </div>
</div>

---

## The Engineering Imperative

<div>

In a world where AI can generate code at unprecedented speed, the critical question isn't whether to use AI. It's how to maintain engineering excellence while leveraging it.

</div>

<div>

[Recent research shows](https://arxiv.org/abs/2502.11844) that **62% of AI-generated code contains design flaws or security vulnerabilities**, even with the latest models. This isn't a temporary limitation. It's the fundamental nature of pattern-based learning systems.

</div>

<div>

The organizations that win won't be those that generate the most code or adopt AI fastest. They'll be **those that maintain engineering discipline while leveraging AI's capabilities**.

</div>

<div>

Your competitive advantage lies not in the speed of code generation but in the quality of architectural decisions, the robustness of security implementations, and the elegance of solutions that only experienced engineers can provide.

</div>

To operationalise this conviction we need to understand exactly what AI does well and where humans must own the decisions. That split is what the rest of the framework is engineered around.

### The 70/30 Rule

As documented in [Addy Osmani's *Beyond Vibe Coding*](https://www.oreilly.com/library/view/beyond-vibe-coding/9798341634749/) (O'Reilly, 2025), every developer using AI tools has discovered the same pattern: **AI can get you 70% of the way there, but the last 30% requires human expertise**.

This framework operationalizes that insight:

<div class="docs-card docs-card-blue">
<div class="docs-grid">
<div>
<div class="docs-heading">✓ What AI Handles Well (The Commoditized 70%)</div>
<ul class="markdown-list list-disc">
<li>Boilerplate code and scaffolding</li>
<li>Standard CRUD operations</li>
<li>Common design patterns</li>
<li>API endpoint generation</li>
<li>Basic test creation</li>
<li>Documentation templates</li>
<li>Code formatting consistency</li>
<li>Simple refactoring tasks</li>
</ul>
</div>
<div>
<div class="docs-heading">⚠️ What Requires Human Expertise (The Differentiating 30%)</div>
<ul class="markdown-list list-disc">
<li>Edge case identification and handling</li>
<li>Security architecture and threat modeling</li>
<li>Performance optimization at scale</li>
<li>Business logic validation</li>
<li>System integration boundaries</li>
<li>Architectural decisions</li>
<li>Technical debt management</li>
<li>Regulatory compliance implementation</li>
</ul>
</div>
</div>
</div>

**This framework ensures humans own the architecture and governance gates** (where systems succeed or fail), while AI handles implementation and verification (where speed matters most). Like building architects who ensure structures are safe, sound, and secure at scale, your engineering architects maintain oversight at critical decision points.

---

## SDLC Overview

<div class="docs-card docs-card-muted">
<div class="docs-center-block">
<div class="docs-heading">6-Phase Continuous Development Cycle</div>
<div class="docs-copy">Security gates, AI integration, and fitness functions at every phase</div>
</div>

<figure class="docs-visual">
  <img src="/images/diagrams/sdlc-cycle.svg" alt="Six-phase continuous SDLC cycle from design through evolution." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Phase 6 feeds production learning back into Phase 1 so the architecture improves with every release.</figcaption>
</figure>
</div>

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>Each phase has a security gate.</strong> Threat coverage above 95% before Phase 2. Tests, CodeQL, Snyk, and fitness functions clean before Phase 3 hands off to humans. CODEOWNER sign-off with attached evidence before Phase 4 releases for deployment. Rollback path proven before Phase 5 ships. Production metrics returning into the next design pass. Agents can draft the work; <strong>governance approves the boundary</strong>. The audit trail of every allow, deny, and override is the evidence your SOC&nbsp;2, ISO&nbsp;27001, and NIST&nbsp;800-53 reviewers ask for.</p>
</div>

---

## Quick Start

<div class="docs-card docs-card-blue">
<div class="docs-heading">Get started in 3 steps</div>
<div class="docs-grid">

<div class="docs-card docs-card-muted">
  <div class="docs-heading">Step 1: Read the Framework</div>
  <div class="docs-copy">Start with <a href="./phase1-design" class="markdown-link">Phase 1: Design</a> to understand how threat modeling, OWASP mapping, and fitness functions shape your feature before code is written.</div>
</div>

<div class="docs-card docs-card-amber">
  <div class="docs-heading">Step 2: Scaffold with Cheshire</div>
  <div class="docs-copy">Install the <a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" class="markdown-link">VSCode extension</a> and run <strong>Scaffold SDLC Structure</strong> to set up CLAUDE.md, CodeQL, fitness functions, and PR templates.</div>
</div>

<div class="docs-card docs-card-indigo">
  <div class="docs-heading">Step 3: Follow the Phases</div>
  <div class="docs-copy">Walk through phases 2-6 for each feature: implement with AI agents, verify with scanners, review with Golden Rules, deploy, and iterate.</div>
</div>

</div>
</div>

## MaintainabilityAI — The VS Code Extension

<div class="docs-card docs-card-muted">
<div class="docs-extension-hero">
  <img src="/images/cheshire.png" alt="" class="docs-extension-icon" />
  <div>
    <div class="docs-card-kicker">VS Code extension · v0.1.18</div>
    <div class="docs-heading">Two panels. One mission.</div>
    <p class="docs-copy">The <strong class="docs-strong">Looking Glass</strong> governs your portfolio. The <strong class="docs-strong">Cheshire Cat</strong> secures your code. Both ship as a single VS Code extension that brings the MaintainabilityAI framework directly into your editor.</p>
    <a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" class="docs-button-primary">Install from Marketplace</a>
  </div>
</div>

<!-- ═══════════════════════════════════════════════ -->
<!-- LOOKING GLASS — Governance & Architecture      -->
<!-- ═══════════════════════════════════════════════ -->

<div id="looking-glass">
  <div class="docs-heading">The Looking Glass — Governance & Architecture</div>
  <div class="docs-muted">The mirror that shows you what your organization really looks like.</div>
</div>

<div class="docs-flex-block">
  <div>
    <div class="docs-heading">🔮 Watch Absolem in Action</div>
    <div class="docs-copy">Architecture modeling → governance mesh → AI-assisted analysis</div>
  </div>
  <a href="https://youtu.be/Ua_4Msx2DYQ" target="_blank" rel="noopener noreferrer" class="docs-button-secondary">▶️ Watch the Demo</a>
</div>

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-blue">
  <h4 class="docs-heading">Governance Mesh & Scoring</h4>
  <p class="docs-copy">Portfolio → Platform → BAR hierarchy with live governance scoring across four pillars: Architecture, Security, Information Risk, and Operations. Track score history with sparklines, manage ADRs, and sync to git — all from a single dashboard.</p>
</div>

<div class="docs-card docs-card-blue">
  <h4 class="docs-heading">CALM Architecture Diagrams</h4>
  <p class="docs-copy">Interactive ReactFlow canvas with ELK.js auto-layout, custom node types for services, databases, actors, and networks. Drag-and-drop palette, inline editing, container collapse, and PNG export. Start from Three-Tier, Event-Driven, or Data Pipeline archetypes.</p>
</div>

<div class="docs-card docs-card-blue">
  <h4 class="docs-heading">Absolem — AI Governance Assistant</h4>
  <p class="docs-copy">A floating chat assistant with 7 commands: drift analysis, component creation, CALM validation, gap analysis, ADR suggestions, image-to-CALM conversion, and freeform architecture questions. Generates structured patches you can preview, accept, or reject.</p>
</div>

</div>

<!-- ═══════════════════════════════════════════════ -->
<!-- CHESHIRE CAT — Code & Security                 -->
<!-- ═══════════════════════════════════════════════ -->

<div id="cheshire-cat">
  <div class="docs-heading">The Cheshire Cat — Code & Security</div>
  <div class="docs-muted">The grin that stays with your repo long after the session ends.</div>
</div>

<div class="docs-flex-block">
  <div>
    <div class="docs-heading">🎥 Watch Cheshire in Action</div>
    <div class="docs-copy">Feature description → RCTRO generation → GitHub issue → agent implementation</div>
  </div>
  <a href="https://youtu.be/WtSRfwKrcFU?si=eapuXusdWhIa8Mor" target="_blank" rel="noopener noreferrer" class="docs-button-secondary">▶️ Watch the Demo</a>
</div>

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-muted">
  <h4 class="docs-heading">SDLC Scaffolding</h4>
  <p class="docs-copy">One command sets up your entire security-first pipeline: CLAUDE.md agent instructions, CodeQL workflows, fitness function automation, PR templates with AI disclosure, and OWASP prompt packs — all tailored to your detected tech stack.</p>
</div>

<div class="docs-card docs-card-indigo">
  <h4 class="docs-heading">Issue Management</h4>
  <p class="docs-copy">Describe a feature in plain text and Cheshire generates a complete RCTRO-formatted GitHub issue with collapsible prompt pack guidance, auto-created labels, and implementation zones for both Claude and Copilot.</p>
</div>

<div class="docs-card docs-card-indigo">
  <h4 class="docs-heading">Security Scorecard</h4>
  <p class="docs-copy">Six fitness functions score every repo: security compliance, dependency freshness, test coverage, cyclomatic complexity, technical debt, and CI/CD health. Action buttons on every tile let you create remediation issues directly from the dashboard.</p>
</div>

</div>

<div class="docs-flex-block">
  <img src="../../images/redqueen.png" alt="The Red Queen" class="docs-inline-image" />
  <div>
    <div class="docs-heading">Available Now: The Red Queen</div>
    <p class="docs-copy">
      Prompts are advisory. Agents can ignore them. The Red Queen adds <strong class="docs-strong">deterministic governance control points</strong> — MCP architecture awareness, pre-tool hooks, scaffold doctor checks, fail-closed review consensus, and a TypeScript policy engine that ties agent autonomy to governance scores.
    </p>
    <a href="/docs/red-queens-court" class="markdown-link">Read the Red Queen architecture →</a>
  </div>
</div>

</div>

---

## SDLC Framework: Phases & Security Gates

The framework is a controlled learning loop. Design and governance stay human-owned; implementation, verification, and release automation accelerate the work inside explicit security gates.

<figure class="docs-visual">
  <img src="/images/diagrams/sdlc-security-gates.svg" alt="Six SDLC phases with ownership model and security gate for each phase." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Every phase has a named owner, a measurable gate, and a feedback path when evidence is not strong enough.</figcaption>
</figure>

<div class="docs-grid docs-grid-wide">

<a href="./phase1-design" class="docs-card docs-card-blue">
  <div class="docs-card-kicker">Phase 1</div>
  <div class="docs-heading">Design</div>
  <div class="docs-copy">Human-owned architecture, STRIDE threat modeling, OWASP mapping, and fitness function definition.</div>
  <div class="docs-muted">Gate: threat coverage >95%</div>
</a>

<a href="./phase2-implementation" class="docs-card docs-card-indigo">
  <div class="docs-card-kicker">Phase 2</div>
  <div class="docs-heading">Implementation</div>
  <div class="docs-copy">AI-assisted development from architecture context, prompt packs, secure patterns, and local validation.</div>
  <div class="docs-muted">Gate: lint and tests pass</div>
</a>

<a href="./phase3-verification" class="docs-card docs-card-rose">
  <div class="docs-card-kicker">Phase 3</div>
  <div class="docs-heading">Verification</div>
  <div class="docs-copy">Automated evidence from Jest, ESLint, CodeQL, Snyk, attack vectors, and fitness functions.</div>
  <div class="docs-muted">Gate: no high-severity findings</div>
</a>

<a href="./phase4-governance" class="docs-card docs-card-cyan">
  <div class="docs-card-kicker">Phase 4</div>
  <div class="docs-heading">Governance</div>
  <div class="docs-copy">Human review of AI-assisted code, business logic, architecture fit, risk acceptance, and disclosure.</div>
  <div class="docs-muted">Gate: Golden Rules compliance</div>
</a>

<a href="./phase5-deployment" class="docs-card docs-card-amber">
  <div class="docs-card-kicker">Phase 5</div>
  <div class="docs-heading">Deployment</div>
  <div class="docs-copy">Release automation, rescanning, smoke tests, monitoring, and rollback readiness.</div>
  <div class="docs-muted">Gate: zero critical CVEs</div>
</a>

<a href="./phase6-evolution" class="docs-card docs-card-emerald">
  <div class="docs-card-kicker">Phase 6</div>
  <div class="docs-heading">Evolution</div>
  <div class="docs-copy">Production signals refine prompts, debt priorities, security gates, and architecture decisions.</div>
  <div class="docs-muted">Gate: quality metrics trending up</div>
</a>

</div>

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-emerald">
  <div class="docs-heading">Forward flow</div>
  <div class="docs-copy">Design -> implementation -> verification -> governance -> deployment -> evolution, with evidence carried forward at each step.</div>
</div>

<div class="docs-card docs-card-rose">
  <div class="docs-heading">Feedback loops</div>
  <div class="docs-copy">Failed verification returns to implementation. Governance rejection returns to implementation. Deployment rollback returns to governance. Evolution returns to design.</div>
</div>

</div>

<div class="docs-panel">
  <div class="docs-card-kicker">Core principles</div>
  <div class="docs-grid docs-grid-wide">
    <div class="docs-card docs-card-muted">
      <div class="docs-heading">Humans own architecture</div>
      <div class="docs-copy">System design, risk acceptance, and architectural tradeoffs remain human decisions.</div>
    </div>
    <div class="docs-card docs-card-muted">
      <div class="docs-heading">AI accelerates the routine work</div>
      <div class="docs-copy">Agents generate, refactor, test, and document inside the constraints provided by the framework.</div>
    </div>
    <div class="docs-card docs-card-muted">
      <div class="docs-heading">Security is designed in</div>
      <div class="docs-copy">STRIDE and OWASP shape the feature before code is written, then scanners and tests verify the result.</div>
    </div>
    <div class="docs-card docs-card-muted">
      <div class="docs-heading">Fitness functions keep score</div>
      <div class="docs-copy">Complexity, coverage, dependency freshness, boundaries, and debt are measured continuously.</div>
    </div>
  </div>
</div>
---

## AI Agent Usage by Phase

**Two modes, one framework** — use in-editor AI assistance (Copilot) for real-time coding and agentic AI (Claude Code) for complex, multi-file tasks.

**Key principle**: Security-first prompts matter more than which mode you use.

<div class="docs-card docs-card-muted">
  <table class="markdown-table">
    <thead>
      <tr class="docs-table-row">
        <th class="markdown-th">Phase</th>
        <th class="markdown-th">Your Task</th>
        <th class="markdown-th">Mode</th>
        <th class="markdown-th">Why</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="markdown-td"><span class="docs-copy">1: Design</span></td>
        <td class="markdown-td">Threat modeling (STRIDE)</td>
        <td class="markdown-td"><span class="docs-pill docs-card-blue">In-Editor</span> Claude Code | Copilot</td>
        <td class="markdown-td">Structured analysis and documentation across files</td>
      </tr>
      <tr class="docs-table-row">
        <td class="markdown-td"><span class="docs-copy">2: Implement</span></td>
        <td class="markdown-td">Real-time coding</td>
        <td class="markdown-td"><span class="docs-pill docs-card-blue">In-Editor</span> Claude Code | Copilot</td>
        <td class="markdown-td">Autocomplete and inline suggestions as you type</td>
      </tr>
      <tr>
        <td class="markdown-td"><span class="docs-copy">2: Implement</span></td>
        <td class="markdown-td">Large refactoring</td>
        <td class="markdown-td"><span class="docs-pill docs-card-indigo">Agentic</span> Claude Code | Copilot Coding Agent</td>
        <td class="markdown-td">Handles complex multi-file edits autonomously</td>
      </tr>
      <tr class="docs-table-row">
        <td class="markdown-td"><span class="docs-copy">3: Verify</span></td>
        <td class="markdown-td">Test generation</td>
        <td class="markdown-td"><span class="docs-pill docs-card-indigo">Agentic</span> Claude Code | Copilot Coding Agent</td>
        <td class="markdown-td">Comprehensive test suites with attack vector coverage</td>
      </tr>
      <tr>
        <td class="markdown-td"><span class="docs-copy">4: Govern</span></td>
        <td class="markdown-td">Code review checklist</td>
        <td class="markdown-td"><span class="docs-pill docs-card-blue">In-Editor</span> Claude Code | Copilot</td>
        <td class="markdown-td">Inline review comments and validation suggestions</td>
      </tr>
      <tr class="docs-table-row">
        <td class="markdown-td"><span class="docs-copy">5: Deploy</span></td>
        <td class="markdown-td">CI/CD automation</td>
        <td class="markdown-td"><span class="docs-pill docs-card-emerald">Pipeline</span> GitHub Actions</td>
        <td class="markdown-td">Automated, auditable pipeline</td>
      </tr>
      <tr>
        <td class="markdown-td"><span class="docs-copy">6: Evolve</span></td>
        <td class="markdown-td">Refactoring tech debt</td>
        <td class="markdown-td"><span class="docs-pill docs-card-indigo">Agentic</span> Claude Code | Copilot Coding Agent</td>
        <td class="markdown-td">Large-scale codebase analysis and refactoring</td>
      </tr>
    </tbody>
  </table>
</div>

---

## 📈 Success Metrics

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-muted">
  <div class="docs-icon">⚡</div>
  <div class="docs-heading">Velocity Metrics</div>
  <div class="docs-copy">
    <strong class="docs-strong">Time to Delivery:</strong> &lt;5 days<br/>
    <strong class="docs-strong">Cycle Time:</strong> &lt;24 hours<br/>
    <strong class="docs-strong">Deploy Frequency:</strong> &gt;10/week
  </div>
</div>

<div class="docs-card docs-card-muted">
  <div class="docs-icon">🎯</div>
  <div class="docs-heading">Quality Metrics</div>
  <div class="docs-copy">
    <strong class="docs-strong">Scan Pass Rate:</strong> &gt;90%<br/>
    <strong class="docs-strong">Test Coverage:</strong> &gt;80%<br/>
    <strong class="docs-strong">Defect Rate:</strong> &lt;5/1000 LOC
  </div>
</div>

<div class="docs-card docs-card-muted">
  <div class="docs-icon">🔒</div>
  <div class="docs-heading">Security Metrics</div>
  <div class="docs-copy">
    <strong class="docs-strong">OWASP Coverage:</strong> 100%<br/>
    <strong class="docs-strong">Remediation Time:</strong> &lt;7 days<br/>
    <strong class="docs-strong">False Positives:</strong> &lt;10%
  </div>
</div>

<div class="docs-card docs-card-muted">
  <div class="docs-icon">📊</div>
  <div class="docs-heading">Process Metrics</div>
  <div class="docs-copy">
    <strong class="docs-strong">Prompt Reuse:</strong> &gt;70%<br/>
    <strong class="docs-strong">Agent Effectiveness:</strong> &gt;85%<br/>
    <strong class="docs-strong">Review Time:</strong> &lt;30 min
  </div>
</div>

</div>

---

<div class="docs-center-block">
  <div class="docs-icon">🎯</div>
  <div class="docs-heading">Ready to Start?</div>
  <div class="docs-copy">Begin your secure AI-assisted development journey with Phase 1. Follow the six phases systematically for maximum velocity and security.</div>
  <a href="./phase1-design" class="docs-button-secondary">
    Begin with Phase 1: Design Intent →
  </a>
</div>
