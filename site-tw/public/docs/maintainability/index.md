<div class="docs-hero docs-hero-emerald">
  <div class="docs-hero-glyph"><img src="/images/glyphs/hourglass.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><span>Maintainability</span></div>
    <div class="docs-eyebrow">Evolutionary architecture <span class="docs-hero-meta">~2 min read</span></div>
    <h1 class="docs-hero-title">Built to evolve &mdash; not just built once</h1>
    <p class="docs-hero-copy">Maintainability is an ongoing practice: automated fitness functions, incremental change patterns, and systematic technical-debt management keep the system healthy as the world changes around it.</p>
    <span class="docs-hero-flourish">&ldquo;The Time has come to talk of many things&hellip; of complexity and coverage.&rdquo;</span>
  </div>
</div>

> An evolutionary architecture supports guided, incremental change across multiple dimensions.
> — Neal Ford, Rebecca Parsons, Patrick Kua

---

## Core Guides

<div class="docs-grid docs-grid-wide">

<a href="./fitness-functions" class="docs-card docs-card-muted">
<div class="docs-card docs-card-emerald">
  <div class="docs-icon">📏</div>
  <h3 class="docs-heading">Fitness Functions</h3>
  <p class="docs-copy">
    Automated, objective checks that verify architectural characteristics at every commit
  </p>
  <div class="docs-copy">
    ✓ Complexity (cyclomatic ≤10)<br/>
    ✓ Dependency freshness (3-month rule)<br/>
    ✓ Security compliance (CodeQL + Snyk)<br/>
    ✓ Test coverage (≥80%, 100% for security paths)<br/>
    ✓ Performance (p95 &lt;200ms)
  </div>
</div>
</a>

<a href="./evolutionary-architecture" class="docs-card docs-card-muted">
<div class="docs-card docs-card-emerald">
  <div class="docs-icon">🔄</div>
  <h3 class="docs-heading">Evolutionary Architecture</h3>
  <p class="docs-copy">
    Incremental change patterns, technical debt management, and AI-assisted refactoring
  </p>
  <div class="docs-copy">
    ✓ Strangler Fig migrations<br/>
    ✓ Feature flags for safe rollout<br/>
    ✓ Branch by Abstraction<br/>
    ✓ Architecture Decision Records<br/>
    ✓ Technical debt tracking
  </div>
</div>
</a>

<a href="/docs/prompts/maintainability/" class="docs-card docs-card-muted">
<div class="docs-card docs-card-emerald">
  <div class="docs-icon">🤖</div>
  <h3 class="docs-heading">AI Prompt Packs</h3>
  <p class="docs-copy">
    Production-ready RCTRO prompts for AI-assisted maintainability work
  </p>
  <div class="docs-copy">
    ✓ Complexity reduction<br/>
    ✓ Dependency hygiene<br/>
    ✓ DRY principle enforcement<br/>
    ✓ Strangler Fig implementation<br/>
    ✓ Technical debt management
  </div>
</div>
</a>

</div>

---

## Why Maintainability Matters for Security

Maintainability and security are deeply intertwined. Code that is hard to understand is hard to audit, and code that is hard to audit harbors vulnerabilities.

<div class="docs-grid">

<div class="docs-card docs-card-emerald">
  <div class="docs-heading">Simple Code is Secure Code</div>
  <div class="docs-copy">Low complexity means fewer bugs, which means fewer vulnerabilities. Fitness function: cyclomatic complexity ≤10.</div>
</div>

<div class="docs-card docs-card-blue">
  <div class="docs-heading">Tested Code is Trustworthy Code</div>
  <div class="docs-copy">High coverage gives confidence that changes don't introduce regressions. Fitness function: coverage ≥80%.</div>
</div>

<div class="docs-card docs-card-orange">
  <div class="docs-heading">Fresh Code is Secure Code</div>
  <div class="docs-copy">Up-to-date dependencies mean fewer known CVEs. Fitness function: all packages less than 3 months old.</div>
</div>

<div class="docs-card docs-card-indigo">
  <div class="docs-heading">Documented Code is Auditable Code</div>
  <div class="docs-copy">Clear rationale enables faster security reviews. Fitness function: all security decisions documented.</div>
</div>

</div>

---

## Technical Debt as a Measured Quantity

Track debt with metrics and thresholds rather than subjective assessments:

<div class="docs-card docs-card-muted">

| Debt Type | Metric | Threshold | Action |
|-----------|--------|-----------|--------|
| **Security Debt** | CVE count | 0 high/critical | Patch immediately |
| **Complexity Debt** | Cyclomatic complexity | >10 per function | Refactor |
| **Dependency Debt** | Package age | >3 months | Upgrade |
| **Test Debt** | Coverage % | <80% | Add tests |
| **Documentation Debt** | Undocumented public APIs | >10% | Document |

</div>

---

## Success Metrics

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-blue">
  <div class="docs-heading">Leading Indicators (Process)</div>
  <div class="docs-copy">
    ✓ Fitness Function Pass Rate — target: >95%<br/>
    ✓ Refactoring Velocity — tech debt resolved per sprint<br/>
    ✓ Dependency Freshness — average package age target: <2 months
  </div>
</div>

<div class="docs-card docs-card-emerald">
  <div class="docs-heading">Lagging Indicators (Outcomes)</div>
  <div class="docs-copy">
    ✓ Defect Density — bugs per 1000 LOC target: <5<br/>
    ✓ Time to Fix — discovery to deploy target: <7 days<br/>
    ✓ Complexity Trend — average cyclomatic over time target: decreasing<br/>
    ✓ Security Incidents — production issues per quarter target: 0
  </div>
</div>

</div>

---

## Resources

- [Fitness Functions](./fitness-functions) — Automated quality gates with implementation code
- [Evolutionary Architecture](./evolutionary-architecture) — Incremental change patterns and technical debt management
- [Maintainability Prompt Packs](/docs/prompts/maintainability/) — AI prompts for complexity reduction, dependency hygiene, and more
- [SDLC Phase 6: Evolution](/docs/sdlc/phase6-evolution) — How maintainability integrates with the development lifecycle
- [Building Evolutionary Architectures](https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/) — Ford, Parsons, Kua (O'Reilly)
- [Back to Documentation](/docs/)

---

**Key principle**: Evolutionary architecture is about making change safe and incremental. Fitness functions are the guardrails that ensure every change moves the system toward its architectural goals, not away from them.
