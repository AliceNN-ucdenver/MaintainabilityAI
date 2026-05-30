<div class="docs-hero docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><span>Framework</span></div>
    <div class="docs-eyebrow">Complete integration <span class="docs-hero-meta">~5 min read</span></div>
    <h1 class="docs-hero-title">One framework for security-first, architecture-aware AI engineering</h1>
    <p class="docs-hero-copy">OWASP Top 10, evolutionary architecture, multi-agent orchestration, and the complete SDLC — woven into one operating model your team and your agents can share.</p>
    <span class="docs-hero-flourish">&ldquo;If you don&rsquo;t know where you&rsquo;re going, any architecture will get you there.&rdquo;</span>
  </div>
</div>

---

## Framework Overview

The framework starts with one principle: <strong>architecture decisions and security controls must live where code is written, not where architects sit.</strong> Everything else (the prompt packs, the fitness functions, the multi-agent rails) is built to make that principle operational for both humans and agents.

<figure class="docs-visual">
  <img src="/images/diagrams/framework-overview.svg" alt="Four inputs converge into the MaintainabilityAI framework and produce secure software, higher velocity, and lower technical debt." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Open standards (CALM, OWASP, STRIDE, RCTRO, fitness functions) feed three capabilities (Looking Glass, Cheshire Cat, Red Queen) into one outcome: governed, reviewable, auditable AI engineering at velocity.</figcaption>
</figure>

The framework follows a **continuous 6-phase lifecycle** integrating security, AI agents, and quality gates at every phase. A [VSCode extension](/docs/sdlc/#maintainabilityai--the-vscode-extension) brings it all into your editor, and the [SDLC Overview](/docs/sdlc/) provides the complete phase-by-phase guide.

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>Operating model.</strong> Architects own the CALM model, threat library, and fitness thresholds. Developers work inside those boundaries with prompt packs scaffolded into the repo. Agents validate every structural action against the Red Queen policy engine before acting. CODEOWNER review remains the last gate. Every allow/deny decision lands in an audit trail suitable for SOC&nbsp;2, ISO&nbsp;27001, NIST&nbsp;800-53, PCI&nbsp;DSS, OWASP Agentic Top 10, NIST AI RMF, ISO 42001, and the EU AI Act &mdash; see the full <a href="/docs/governance/compliance-mapping" class="markdown-link">compliance mapping</a> for clause-by-clause artifacts.</p>
</div>

---

## Follow the Operating Model

Each step builds on the one before. Skip the early foundation work and later gates become rubber stamps. Start by making the architecture and threat model explicit, then select the right security prompts, enforce measurable quality gates, and finally let agents work inside those boundaries.

<div class="docs-grid docs-grid-wide">

<a href="/docs/sdlc/phase1-design" class="docs-card docs-card-indigo">
  <div class="docs-card-kicker">Step 1</div>
  <div class="docs-heading">Design the boundary</div>
  <div class="docs-copy">
    Use Phase 1 to define architecture context, map trust boundaries, and run STRIDE threat modeling before implementation begins.
  </div>
  <div class="docs-muted">
    CALM context • STRIDE threats • OWASP mapping • security requirements
  </div>
</a>

<a href="/docs/prompts/owasp/" class="docs-card docs-card-rose">
  <div class="docs-card-kicker">Step 2</div>
  <div class="docs-heading">Choose the security controls</div>
  <div class="docs-copy">
    Apply the OWASP prompt packs that match the threats you found. Each pack follows RCTRO format so humans and agents get the same implementation contract.
  </div>
  <div class="docs-muted">
    A01-A10 • attack scenarios • secure patterns • validation checklists
  </div>
</a>

<a href="/docs/maintainability/" class="docs-card docs-card-emerald">
  <div class="docs-card-kicker">Step 3</div>
  <div class="docs-heading">Enforce fitness functions</div>
  <div class="docs-copy">
    Convert quality expectations into automated gates so complexity, coverage, dependency freshness, security, and performance stay visible in CI.
  </div>
  <div class="docs-muted">
    Complexity <=10 • coverage >=80% • dependency freshness • p95 budgets
  </div>
</a>

<a href="/docs/agents/" class="docs-card docs-card-cyan">
  <div class="docs-card-kicker">Step 4</div>
  <div class="docs-heading">Govern the agents</div>
  <div class="docs-copy">
    Use in-editor agents for human-guided implementation and coding agents for governed automation, with Red Queen controls keeping architecture rules enforceable.
  </div>
  <div class="docs-muted">
    Claude Code • Copilot Coding Agent • RCTRO issues • review boards
  </div>
</a>

</div>

---

## Security Pipeline: Defense in Depth

MaintainabilityAI implements a **6-layer security pipeline** that catches vulnerabilities at every stage of development:

<figure class="docs-visual">
  <img src="/images/diagrams/security-pipeline.svg" alt="Six-layer security pipeline from developer prompt to production deployment." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Defense in depth turns prompts, tests, scans, reviews, and production monitoring into one continuous control path.</figcaption>
</figure>

### The Six Layers

**Example: Building a Document Sharing Feature** — *"Users should share documents with different permission levels"*

Click any layer to see how it applies to this real feature:

<div class="docs-layer-stack">

<details class="docs-details docs-card docs-card-rose">
  <summary class="docs-details-summary">Layer 1: IDE Security &middot; Prevention at the Source</summary>
  <div class="docs-copy">Use security-first prompts with OWASP categories. <strong>Prevents 60-70% of vulnerabilities</strong> before they're written.</div>

  <div class="docs-card docs-card-muted">
    <div class="docs-heading">RCTRO Prompt for Document Sharing:</div>

```
Role: Security engineer implementing secure document sharing.

Context:
- Node.js + TypeScript + PostgreSQL
- JWT authentication, permissions: read, write, admin
- OWASP categories: A01, A03, A09

Task:
Generate createShare() with full security controls, tests with
attack scenarios, and security event logging.

Requirements:
1. **Parameterized Queries**
   - Use pg $1 placeholders, never string concatenation
   - Validation: All queries use parameterized placeholders

2. **Input Validation**
   - Zod schemas with email format, permission enum
   - Validation: All user input validated before processing

3. **Authorization Controls**
   - Verify userId owns documentId before sharing
   - Validation: Non-owners receive 403 with generic message

4. **Audit Logging**
   - Log share created, auth failures, validation errors
   - Validation: Every mutation has audit trail

Output:
Complete TypeScript implementation with Jest test suite
including attack vector tests (SQL injection, IDOR).
```

  </div>

  <div class="docs-copy">
    <strong class="docs-strong">What AI generates:</strong> Code with authorization checks, parameterized queries, input validation, and audit logs built in from the start.
  </div>
</details>

<details class="docs-details docs-card docs-card-orange">
  <summary class="docs-details-summary">Layer 2: Local Checks &middot; Fast Feedback Loop</summary>
  <div class="docs-copy">ESLint catches dangerous patterns. Jest validates security controls with attack payloads.</div>

  <div class="docs-card docs-card-muted">
    <pre class="markdown-pre">npm run lint
✅ No eval() usage, no type-unsafe operations
✅ Complexity: Max 8 (threshold: 10)
npm test
✅ SQL injection blocked: "'; DROP TABLE--"
✅ IDOR attack blocked: Different user's doc
✅ Permission escalation blocked
✅ Coverage: 95% (threshold: 80%)</pre>
  </div>
</details>

<details class="docs-details docs-card docs-card-amber">
  <summary class="docs-details-summary">Layer 3: Pre-commit Hooks &middot; Last Defense Before Repo</summary>
  <div class="docs-copy">Snyk scans for hardcoded secrets and vulnerable patterns. Blocks commits that introduce risks.</div>

  <div class="docs-card docs-card-muted">
    <pre class="markdown-pre">git commit -m "feat: add document sharing"
Running pre-commit hooks...
✅ No hardcoded secrets detected
✅ No vulnerable patterns found
✅ All dependencies clean
[main abc123] feat: add document sharing</pre>
  </div>
</details>

<details class="docs-details docs-card docs-card-emerald">
  <summary class="docs-details-summary">Layer 4: CI/CD Gates &middot; Automated Deep Analysis</summary>
  <div class="docs-copy">CodeQL deep analysis, Snyk CVE scanning, fitness function validation.</div>

  <div class="docs-card docs-card-muted">
    <pre class="markdown-pre"><strong>CodeQL Security Analysis:</strong>
✅ SQL injection: None detected
✅ Access control: All checks present
✅ Hardcoded secrets: None
<strong>Snyk Dependency Scan:</strong>
✅ 0 high/critical CVEs
✅ All packages &lt;2 months old
<strong>Fitness Functions:</strong>
✅ Complexity ≤10: Pass
✅ Coverage ≥80%: Pass (95%)
✅ Performance p95 &lt;200ms: Pass (145ms)</pre>
  </div>
</details>

<details class="docs-details docs-card docs-card-cyan">
  <summary class="docs-details-summary">Layer 5: Human Review &middot; Critical Thinking</summary>
  <div class="docs-copy">Apply Golden Rules: trust but verify, understand every line, validate business logic.</div>

  <div class="docs-card docs-card-muted">
    <div class="docs-copy">
      ✅ <strong class="docs-strong">Understand every line:</strong> Can explain code to teammate<br/>
      ✅ <strong class="docs-strong">Verify security controls:</strong> Authorization, validation, error handling present<br/>
      ✅ <strong class="docs-strong">Check edge cases:</strong> What if email invalid? User deleted? Doc already shared?<br/>
      ✅ <strong class="docs-strong">AI disclosure:</strong> Commit labeled AI-assisted with tool and prompt pack<br/>
      ✅ <strong class="docs-strong">Business logic:</strong> Does this actually solve the user's problem securely?
    </div>
  </div>
</details>

<details class="docs-details docs-card docs-card-indigo">
  <summary class="docs-details-summary">Layer 6: Production Monitoring &middot; Runtime Protection</summary>
  <div class="docs-copy">Monitor security events, alert on anomalies, feed learnings back into prompts.</div>

  <div class="docs-card docs-card-muted">
    <pre class="markdown-pre"><strong>Week 1 Production Metrics:</strong>
🎉 1,200+ documents shared/day
⚡ p95 latency: 145ms (threshold: 200ms)
<strong>Security Events:</strong>
🛡️ 23 IDOR attempts/day → All blocked
🛡️ 5 SQL injection attempts/day → All blocked
🛡️ 0 unauthorized data access
<strong>Action Items:</strong>
→ Update A01 prompt with real attack patterns
→ Add alert for IDOR attempts &gt;50/day</pre>
  </div>
</details>

</div>

**Key Principle**: Each layer provides overlapping protection. If one layer misses a vulnerability, subsequent layers catch it. This defense-in-depth approach is essential when using AI code generation.

---

## The VSCode Extension &middot; Framework in Your Editor

Everything above lives in documentation until you bring it into the developer workflow. The **MaintainabilityAI VSCode extension** does exactly that: two panels that operationalize the entire framework.

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-blue">
  <div class="docs-heading">The Looking Glass &middot; Governance & Architecture</div>
  <div class="docs-copy">
    Portfolio → Platform → BAR hierarchy with live governance scoring across four pillars. Interactive CALM architecture diagrams with ELK.js auto-layout. Absolem AI assistant for drift analysis, gap detection, and architecture questions.
  </div>
  <a href="/docs/sdlc/#looking-glass" class="markdown-link">Looking Glass details →</a>
</div>

<div class="docs-card docs-card-muted">
  <div class="docs-heading">The Cheshire Cat &middot; Code & Security</div>
  <div class="docs-copy">
    One-command SDLC scaffolding with CLAUDE.md, CodeQL workflows, and OWASP prompt packs. RCTRO-formatted issue generation with embedded prompt pack guidance. Six-metric security scorecard with one-click remediation.
  </div>
  <a href="/docs/sdlc/#cheshire-cat" class="markdown-link">Cheshire Cat details →</a>
</div>

</div>

<div class="docs-flex-block">
  <img src="../images/redqueen.png" alt="The Red Queen" class="docs-inline-image" />
  <div>
    <div class="docs-heading">Available Now: The Red Queen</div>
    <p class="docs-copy">
      Prompts are advisory. Agents can ignore them. The Red Queen adds <strong class="docs-strong">deterministic governance control points</strong>: MCP architecture awareness, pre-tool hooks, scaffold doctor checks, an always-on impl-provenance gate that verifies the signed audit chain on every implementation PR, and a TypeScript policy engine that ties agent autonomy to governance scores.
    </p>
    <a href="/docs/red-queens-court" class="markdown-link">Read the Red Queen architecture →</a>
  </div>
</div>

---

## Framework Resources

<div class="docs-grid">

<div class="docs-card docs-card-muted">
  <div class="docs-heading">Core Documentation</div>
  <div class="docs-copy">
    <a href="/docs/sdlc/" class="markdown-link">SDLC Overview</a>: 6-phase lifecycle<br/>
    <a href="/docs/maintainability/" class="markdown-link">Maintainability</a>: Fitness functions<br/>
    <a href="/docs/prompts/owasp/" class="markdown-link">OWASP Packs</a>: Security prompts<br/>
    <a href="/docs/governance/governed-golden-rules" class="markdown-link">Golden Rules</a>: AI governance
  </div>
</div>

<div class="docs-card docs-card-muted">
  <div class="docs-heading">Learning Resources</div>
  <div class="docs-copy">
    <a href="/docs/workshop/" class="markdown-link">Workshop</a>: Parts 1-4 live, Parts 5-8 roadmap<br/>
    <a href="/docs/agents/" class="markdown-link">AI Agents</a>: In-Editor & Agentic guides<br/>
    <a href="/docs/prompts/maintainability/" class="markdown-link">Maintainability Packs</a>: Architecture prompts
  </div>
</div>

<div class="docs-card docs-card-muted">
  <div class="docs-heading">Extension & Vision</div>
  <div class="docs-copy">
    <a href="/docs/sdlc/#maintainabilityai--the-vscode-extension" class="markdown-link">VSCode Extension</a>: Looking Glass + Cheshire Cat<br/>
    <a href="/docs/agentic-sdlc-governance" class="markdown-link">Vision</a>: Agentic governed SDLC<br/>
    <a href="/docs/agents/alice" class="markdown-link">Alice</a>: Agentic AI proof of concept
  </div>
</div>

</div>

---

**Ready to build secure, maintainable software with AI? Start with [Phase 1: Design →](/docs/sdlc/phase1-design)**
