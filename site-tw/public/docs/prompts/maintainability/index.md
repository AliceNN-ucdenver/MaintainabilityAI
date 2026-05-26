<div class="docs-hero docs-hero-emerald">
  <div class="docs-hero-glyph"><img src="/images/glyphs/hourglass.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/prompts/owasp/">Prompts</a><span class="sep">/</span><span>Maintainability</span></div>
    <div class="docs-eyebrow">Prompt packs · Evolutionary architecture <span class="docs-hero-meta">~3 min read</span></div>
    <h1 class="docs-hero-title">Prompts for software that survives next year</h1>
    <p class="docs-hero-copy">Fitness functions, dependency hygiene, complexity reduction, strangler refactors, and debt management &mdash; written as prompt packs so AI assistants keep systems evolvable, not just shippable.</p>
    <span class="docs-hero-flourish">&ldquo;Run twice as fast to stay in the same place.&rdquo; Or write better prompts.</span>
  </div>
</div>

<div class="docs-card docs-card-emerald">
  <div class="docs-copy"><strong>Where this fits:</strong> These packs keep AI-generated systems evolvable after the first secure implementation. The workshop introduces the first quality gates in <a href="/docs/workshop/part4-fitness-functions" class="markdown-link">Part 4</a>, and the SDLC feeds the results into <a href="/docs/sdlc/phase6-evolution" class="markdown-link">Phase 6: Evolution</a>.</div>
</div>

---

## 🎯 Fitness Function Metrics Dashboard

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-indigo">
  <div class="docs-flex-block">
    <div class="docs-icon">📊</div>
    <div class="docs-card-kicker">Complexity</div>
  </div>
  <div class="docs-heading">≤10</div>
  <div class="docs-copy">Cyclomatic complexity per function</div>
  <div class="docs-meter" aria-label="100 percent compliant">
    <div class="docs-meter-fill docs-meter-fill-full docs-meter-fill-indigo"></div>
  </div>
  <div class="docs-copy">✅ 100% functions compliant</div>
</div>

<div class="docs-card docs-card-indigo">
  <div class="docs-flex-block">
    <div class="docs-icon">📦</div>
    <div class="docs-card-kicker">Dependencies</div>
  </div>
  <div class="docs-heading">≤90d</div>
  <div class="docs-copy">Dependency freshness rule</div>
  <div class="docs-meter" aria-label="85 percent packages current">
    <div class="docs-meter-fill docs-meter-fill-85 docs-meter-fill-amber"></div>
  </div>
  <div class="docs-copy">⚠️ 85% packages current</div>
</div>

<div class="docs-card docs-card-cyan">
  <div class="docs-flex-block">
    <div class="docs-icon">🧪</div>
    <div class="docs-card-kicker">Coverage</div>
  </div>
  <div class="docs-heading">≥80%</div>
  <div class="docs-copy">Test coverage threshold</div>
  <div class="docs-meter" aria-label="92 percent coverage achieved">
    <div class="docs-meter-fill docs-meter-fill-92 docs-meter-fill-cyan"></div>
  </div>
  <div class="docs-copy">✅ 92% coverage achieved</div>
</div>

<div class="docs-card docs-card-emerald">
  <div class="docs-flex-block">
    <div class="docs-icon">⚡</div>
    <div class="docs-card-kicker">Performance</div>
  </div>
  <div class="docs-heading">&lt;200ms</div>
  <div class="docs-copy">p95 latency threshold</div>
  <div class="docs-meter" aria-label="78 percent performance budget used">
    <div class="docs-meter-fill docs-meter-fill-78 docs-meter-fill-emerald"></div>
  </div>
  <div class="docs-copy">✅ 156ms average p95</div>
</div>

</div>

<div class="docs-card docs-card-muted">
  <div class="docs-center-block">
    <div class="docs-icon">🏆</div>
    <div class="docs-heading">Architecture Health Score</div>
    <div class="docs-card docs-card-indigo">89%</div>
    <div class="docs-copy">Based on 4 fitness function metrics</div>
    <div class="docs-flex-block">
      <div>
        <div class="docs-heading">157</div>
        <div class="docs-card-kicker">Functions Analyzed</div>
      </div>
      <div>
        <div class="docs-heading">34</div>
        <div class="docs-card-kicker">Dependencies Tracked</div>
      </div>
      <div>
        <div class="docs-heading">2,847</div>
        <div class="docs-card-kicker">Lines Covered</div>
      </div>
      <div>
        <div class="docs-heading">12</div>
        <div class="docs-card-kicker">Endpoints Monitored</div>
      </div>
    </div>
  </div>
</div>

---

## 🏗️ What is Evolutionary Architecture?

<div class="docs-card docs-card-indigo">

**Traditional approach**: Architecture degrades over time
- ❌ Complexity increases unchecked
- ❌ Dependencies age and accumulate CVEs
- ❌ Tests become flaky and ignored
- ❌ Performance slowly degrades

**Evolutionary approach**: Architecture protected by **automated fitness functions**
- ✅ Complexity monitored per-function (≤10)
- ✅ Dependencies auto-updated (≤90 days)
- ✅ Coverage enforced in CI/CD (≥80%)
- ✅ Performance baselines tracked (p95 <200ms)

</div>

**Key insight**: Without automation, quality standards exist only in reviewers' heads. With fitness functions, standards are enforced in CI/CD before merge.

---

## 📚 Maintainability Prompt Packs

### Core Principles
| Pattern | Focus | Key Metric | Use Case |
|---------|-------|------------|----------|
| **[🧩 Complexity Reduction](./complexity-reduction)** | Simplifying complex code | Cyclomatic complexity ≤10 per function | Refactoring nested logic, Extract Method pattern, Strategy pattern |
| **[♻️ DRY Principle](./dry-principle)** | Eliminating duplication | Code duplication <3% | Extract reusable functions, centralize constants, abstract patterns |
| **[🎯 Single Responsibility](./single-responsibility)** | One function, one purpose | One reason to change per module | Layered architecture, separation of concerns, focused functions |

### Evolutionary Architecture
| Pattern | Focus | Key Metric | Use Case |
|---------|-------|------------|----------|
| **[📊 Fitness Functions](./fitness-functions)** | Automated quality gates | Complexity ≤10, Coverage ≥80%, Deps <90d, p95 <200ms | CI/CD gates, pre-commit hooks, code quality enforcement |
| **[📦 Dependency Hygiene](./dependency-hygiene)** | 3-month freshness rule | All packages <90 days old | Renovate automation, security patching, version management |
| **[🌳 Strangler Fig Pattern](./strangler-fig)** | Incremental legacy migration | Traffic routing 0%→100% | Avoiding big-bang rewrites, safe modernization |
| **[⚠️ Technical Debt Management](./technical-debt)** | Systematic refactoring | 20% sprint capacity for paydown | Backlog prioritization, debt tracking, quality improvement |

**Quick Start**: New to maintainability? Start with **[Complexity Reduction](./complexity-reduction)** and **[DRY Principle](./dry-principle)** to improve existing code, then implement **[Fitness Functions](./fitness-functions)** to prevent future regressions.

---

## 🎯 How to Use These Prompt Packs

<div class="docs-grid docs-grid-compact">

<div class="docs-center-block">
  <div class="docs-icon">1️⃣</div>
  <div class="docs-heading">Choose Pattern</div>
  <div class="docs-copy">Start with core principles (complexity, DRY, SRP) or evolutionary patterns (fitness functions, dependency hygiene)</div>
</div>

<div class="docs-center-block">
  <div class="docs-icon">2️⃣</div>
  <div class="docs-heading">Customize Stack</div>
  <div class="docs-copy">Adapt for Node/Python/Java with your specific tools</div>
</div>

<div class="docs-center-block">
  <div class="docs-icon">3️⃣</div>
  <div class="docs-heading">Implement with AI</div>
  <div class="docs-copy">Use Claude, Copilot, or ChatGPT to generate code</div>
</div>

<div class="docs-center-block">
  <div class="docs-icon">4️⃣</div>
  <div class="docs-heading">Integrate CI/CD</div>
  <div class="docs-copy">Start in warning mode, establish baselines, then block merges</div>
</div>

</div>

---

## 🔄 Evolutionary Architecture Workflow

<figure class="docs-visual">
  <img src="/images/diagrams/maintainability-evolution-loop.svg" alt="Maintainability loop from feature request through constraints, AI implementation, fitness functions, human review, deployment, monitoring, and baseline updates." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Fitness functions make evolutionary architecture executable rather than aspirational.</figcaption>
</figure>

**Key Stages**:
1. **Design with Constraints**: Define quality thresholds upfront
2. **Implement with AI**: Use prompt packs to generate code
3. **Fitness Functions**: Automated validation in CI/CD
4. **Refactor**: Fix violations before merge
5. **Monitor**: Track architectural drift post-deploy
6. **Iterate**: Tighten thresholds over time

---

## 🎓 Learning Path

**New to Evolutionary Architecture?** Recommended sequence:

1. **[Workshop Part 4: Fitness Functions](/docs/workshop/part4-fitness-functions)** — Build your first fitness function
2. **[Fitness Functions](./fitness-functions)** → **[Dependency Hygiene](./dependency-hygiene)** — Start with quality gates and automation
3. **[Framework Guide](/docs/framework)** — See how maintainability integrates with security and SDLC

**Advanced**: **[Strangler Fig Pattern](./strangler-fig)** (legacy migration) · **[Technical Debt Management](./technical-debt)** (systematic refactoring) · **[SDLC Integration](/docs/sdlc/)** (full lifecycle)

---

## 📖 Recommended Reading

**Books**:
- *Building Evolutionary Architectures* (Ford, Parsons, Kua) — The definitive guide
- *Release It!* (Nygard) — Stability patterns and operational excellence
- *Accelerate* (Forsgren, Humble, Kim) — DORA metrics and high-performing teams
- *Working Effectively with Legacy Code* (Feathers) — Refactoring strategies

**Tools**:
- **ts-morph** (TypeScript AST analysis) | **radon** (Python complexity) | **SonarQube** (Multi-language quality)
- **Renovate** (Dependency automation) | **autocannon** (Performance testing) | **CodeQL** (Security scanning)

---

## 🔗 Related Resources

- **[STRIDE Threat Modeling](/docs/prompts/threat-modeling/)** — Design-phase security analysis
- **[OWASP Prompt Packs](/docs/prompts/owasp/)** — Security-first development
- **[AI Agent Guides](/docs/agents/)** — Claude, Copilot, ChatGPT integration
- **[Workshop Series](/docs/workshop/)** — Hands-on training modules
- **[SDLC Framework](/docs/sdlc/)** — End-to-end secure development
- **[Framework Guide](/docs/framework)** — Complete methodology

---

<div class="docs-center-block">
  <div class="docs-icon">🚀</div>
  <div class="docs-heading">Ready to Prevent Architectural Erosion?</div>
  <div class="docs-copy">Pick a prompt pack above and start implementing automated governance in your CI/CD pipeline. Remember: <strong class="docs-strong">Architecture is not a phase, it's continuous validation.</strong></div>
  <a href="./fitness-functions" class="docs-button-secondary">
    Start with Fitness Functions →
  </a>
</div>
