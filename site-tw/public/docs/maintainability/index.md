# Maintainability Framework

<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);">
  <div style="text-align: center;">
    <h2 style="margin: 0; font-size: 28px; color: #f1f5f9; font-weight: 800;">Evolutionary Architecture for Long-Lived Systems</h2>
    <div style="font-size: 15px; color: #d1fae5; margin-top: 12px; max-width: 700px; margin-left: auto; margin-right: auto;">
      Maintainability is not a one-time achievement — it's an ongoing practice enforced through automated fitness functions, incremental change patterns, and systematic technical debt management.
    </div>
  </div>
</div>

> "An evolutionary architecture supports guided, incremental change across multiple dimensions."
> — Neal Ford, Rebecca Parsons, Patrick Kua

---

## Core Guides

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 32px 0;">

<a href="./fitness-functions" style="text-decoration: none; display: block;">
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid rgba(16, 185, 129, 0.3); height: 100%; box-sizing: border-box;">
  <div style="font-size: 32px; margin-bottom: 12px;">📏</div>
  <h3 style="margin: 0 0 12px 0; font-size: 20px; color: #f1f5f9; font-weight: 800;">Fitness Functions</h3>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    Automated, objective checks that verify architectural characteristics at every commit
  </p>
  <div style="color: #6ee7b7; font-size: 13px; line-height: 1.8;">
    ✓ Complexity (cyclomatic ≤10)<br/>
    ✓ Dependency freshness (3-month rule)<br/>
    ✓ Security compliance (CodeQL + Snyk)<br/>
    ✓ Test coverage (≥80%, 100% for security paths)<br/>
    ✓ Performance (p95 &lt;200ms)
  </div>
</div>
</a>

<a href="./evolutionary-architecture" style="text-decoration: none; display: block;">
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid rgba(16, 185, 129, 0.3); height: 100%; box-sizing: border-box;">
  <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
  <h3 style="margin: 0 0 12px 0; font-size: 20px; color: #f1f5f9; font-weight: 800;">Evolutionary Architecture</h3>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    Incremental change patterns, technical debt management, and AI-assisted refactoring
  </p>
  <div style="color: #6ee7b7; font-size: 13px; line-height: 1.8;">
    ✓ Strangler Fig migrations<br/>
    ✓ Feature flags for safe rollout<br/>
    ✓ Branch by Abstraction<br/>
    ✓ Architecture Decision Records<br/>
    ✓ Technical debt tracking
  </div>
</div>
</a>

<a href="/docs/prompts/maintainability/" style="text-decoration: none; display: block;">
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid rgba(16, 185, 129, 0.3); height: 100%; box-sizing: border-box;">
  <div style="font-size: 32px; margin-bottom: 12px;">🤖</div>
  <h3 style="margin: 0 0 12px 0; font-size: 20px; color: #f1f5f9; font-weight: 800;">AI Prompt Packs</h3>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    Production-ready RCTRO prompts for AI-assisted maintainability work
  </p>
  <div style="color: #6ee7b7; font-size: 13px; line-height: 1.8;">
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

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #10b981;">
  <div style="font-size: 15px; font-weight: 700; color: #6ee7b7; margin-bottom: 8px;">Simple Code is Secure Code</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">Low complexity means fewer bugs, which means fewer vulnerabilities. Fitness function: cyclomatic complexity ≤10.</div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6;">
  <div style="font-size: 15px; font-weight: 700; color: #93c5fd; margin-bottom: 8px;">Tested Code is Trustworthy Code</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">High coverage gives confidence that changes don't introduce regressions. Fitness function: coverage ≥80%.</div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #f97316;">
  <div style="font-size: 15px; font-weight: 700; color: #fdba74; margin-bottom: 8px;">Fresh Code is Secure Code</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">Up-to-date dependencies mean fewer known CVEs. Fitness function: all packages less than 3 months old.</div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #8b5cf6;">
  <div style="font-size: 15px; font-weight: 700; color: #c4b5fd; margin-bottom: 8px;">Documented Code is Auditable Code</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">Clear rationale enables faster security reviews. Fitness function: all security decisions documented.</div>
</div>

</div>

---

## Technical Debt as a Measured Quantity

Track debt with metrics and thresholds rather than subjective assessments:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3); overflow-x: auto;">

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

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6;">
  <div style="font-size: 15px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Leading Indicators (Process)</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
    ✓ Fitness Function Pass Rate — target: >95%<br/>
    ✓ Refactoring Velocity — tech debt resolved per sprint<br/>
    ✓ Dependency Freshness — average package age target: <2 months
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #10b981;">
  <div style="font-size: 15px; font-weight: 700; color: #6ee7b7; margin-bottom: 12px;">Lagging Indicators (Outcomes)</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
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
