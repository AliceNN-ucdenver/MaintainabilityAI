# Maintainability Prompt Packs — Evolutionary Architecture

> **Building software that lasts requires automated governance**. These prompt packs help you implement Evolutionary Architecture patterns using AI assistants — preventing architectural erosion through fitness functions, dependency hygiene, and systematic technical debt management.

---

## 🎯 Fitness Function Metrics Dashboard

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">📊</div>
    <div style="color: white; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Complexity</div>
  </div>
  <div style="color: white; font-size: 40px; font-weight: 700; margin-bottom: 8px;">≤10</div>
  <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-bottom: 16px;">Cyclomatic complexity per function</div>
  <div style="background: rgba(255, 255, 255, 0.2); border-radius: 8px; height: 8px; overflow: hidden;">
    <div style="background: white; height: 100%; width: 100%; border-radius: 8px;"></div>
  </div>
  <div style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin-top: 8px;">✅ 100% functions compliant</div>
</div>

<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(240, 147, 251, 0.25);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">📦</div>
    <div style="color: white; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Dependencies</div>
  </div>
  <div style="color: white; font-size: 40px; font-weight: 700; margin-bottom: 8px;">≤90d</div>
  <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-bottom: 16px;">Dependency freshness rule</div>
  <div style="background: rgba(255, 255, 255, 0.2); border-radius: 8px; height: 8px; overflow: hidden;">
    <div style="background: white; height: 100%; width: 85%; border-radius: 8px;"></div>
  </div>
  <div style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin-top: 8px;">⚠️ 85% packages current</div>
</div>

<div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(79, 172, 254, 0.25);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">🧪</div>
    <div style="color: white; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Coverage</div>
  </div>
  <div style="color: white; font-size: 40px; font-weight: 700; margin-bottom: 8px;">≥80%</div>
  <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-bottom: 16px;">Test coverage threshold</div>
  <div style="background: rgba(255, 255, 255, 0.2); border-radius: 8px; height: 8px; overflow: hidden;">
    <div style="background: white; height: 100%; width: 92%; border-radius: 8px;"></div>
  </div>
  <div style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin-top: 8px;">✅ 92% coverage achieved</div>
</div>

<div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(67, 233, 123, 0.25);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">⚡</div>
    <div style="color: white; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Performance</div>
  </div>
  <div style="color: white; font-size: 40px; font-weight: 700; margin-bottom: 8px;">&lt;200ms</div>
  <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-bottom: 16px;">p95 latency threshold</div>
  <div style="background: rgba(255, 255, 255, 0.2); border-radius: 8px; height: 8px; overflow: hidden;">
    <div style="background: white; height: 100%; width: 78%; border-radius: 8px;"></div>
  </div>
  <div style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin-top: 8px;">✅ 156ms average p95</div>
</div>

</div>

<div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(30, 58, 138, 0.3);">
  <div style="text-align: center; color: white;">
    <div style="font-size: 48px; margin-bottom: 16px;">🏆</div>
    <div style="font-size: 28px; font-weight: 700; margin-bottom: 12px;">Architecture Health Score</div>
    <div style="font-size: 72px; font-weight: 900; margin: 24px 0; text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);">89%</div>
    <div style="font-size: 16px; opacity: 0.9; margin-bottom: 24px;">Based on 4 fitness function metrics</div>
    <div style="display: flex; justify-content: center; gap: 32px; flex-wrap: wrap;">
      <div>
        <div style="font-size: 24px; font-weight: 700;">157</div>
        <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Functions Analyzed</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: 700;">34</div>
        <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Dependencies Tracked</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: 700;">2,847</div>
        <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Lines Covered</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: 700;">12</div>
        <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Endpoints Monitored</div>
      </div>
    </div>
  </div>
</div>

---

## 🏗️ What is Evolutionary Architecture?

<div style="background: rgba(99, 102, 241, 0.05); border-left: 4px solid #6366f1; padding: 24px; border-radius: 8px; margin: 24px 0;">

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

<div style="display: grid; gap: 24px; margin: 32px 0;">

<div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); transition: all 0.3s;">
  <div style="display: flex; align-items: start; gap: 20px;">
    <div style="font-size: 48px; line-height: 1;">📊</div>
    <div style="flex: 1;">
      <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #111827;"><a href="./fitness-functions" style="color: #6366f1; text-decoration: none;">Fitness Functions</a></h3>
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">Automated quality gates for complexity, dependencies, coverage, and performance</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
        <span style="background: #eff6ff; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">Complexity ≤10</span>
        <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">Deps ≤90 days</span>
        <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">Coverage ≥80%</span>
        <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">p95 &lt;200ms</span>
      </div>
      <div style="color: #374151; font-size: 14px; line-height: 1.6;">
        <strong>What you'll build:</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>TypeScript complexity analyzer (ts-morph)</li>
          <li>Dependency freshness checker</li>
          <li>Coverage baseline enforcement</li>
          <li>Performance regression detection</li>
          <li>GitHub Actions CI/CD integration</li>
        </ul>
      </div>
      <a href="/docs/workshop/part4-fitness-functions" style="display: inline-block; margin-top: 12px; color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 600;">
        📖 Workshop Part 4 →
      </a>
    </div>
  </div>
</div>

<div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); transition: all 0.3s;">
  <div style="display: flex; align-items: start; gap: 20px;">
    <div style="font-size: 48px; line-height: 1;">📦</div>
    <div style="flex: 1;">
      <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #111827;"><a href="./dependency-hygiene" style="color: #ec4899; text-decoration: none;">Dependency Hygiene</a></h3>
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">The 3-month freshness rule and automated dependency updates</p>
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="color: #991b1b; font-size: 14px; font-weight: 600; margin-bottom: 4px;">⚠️ Critical Insight</div>
        <div style="color: #7f1d1d; font-size: 13px;">80% of breaches involve unpatched dependencies. Upgrading v1.0→v1.1 is easy; v1.0→v5.0 is a nightmare.</div>
      </div>
      <div style="color: #374151; font-size: 14px; line-height: 1.6;">
        <strong>What you'll build:</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Renovate bot configuration</li>
          <li>Automated security vulnerability alerts</li>
          <li>Smart merge policies (patch auto-merge, major needs review)</li>
          <li>Dependency age dashboard</li>
        </ul>
      </div>
      <div style="margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
        <strong style="color: #166534; font-size: 13px;">3-Month Rule:</strong>
        <span style="color: #15803d; font-size: 13px;"> No dependency &gt;90 days behind latest version</span>
      </div>
    </div>
  </div>
</div>

<div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); transition: all 0.3s;">
  <div style="display: flex; align-items: start; gap: 20px;">
    <div style="font-size: 48px; line-height: 1;">🌳</div>
    <div style="flex: 1;">
      <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #111827;"><a href="./strangler-fig" style="color: #8b5cf6; text-decoration: none;">Strangler Fig Pattern</a></h3>
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">Incremental migration from legacy to modern architecture (no big-bang rewrites)</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div style="text-align: center; padding: 12px; background: #f0fdf4; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #166534;">0%</div>
          <div style="font-size: 11px; color: #15803d; text-transform: uppercase;">Start</div>
        </div>
        <div style="text-align: center; padding: 12px; background: #fef3c7; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #92400e;">10%</div>
          <div style="font-size: 11px; color: #78350f; text-transform: uppercase;">Testing</div>
        </div>
        <div style="text-align: center; padding: 12px; background: #fed7aa; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #9a3412;">50%</div>
          <div style="font-size: 11px; color: #7c2d12; text-transform: uppercase;">Migration</div>
        </div>
        <div style="text-align: center; padding: 12px; background: #dcfce7; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #166534;">100%</div>
          <div style="font-size: 11px; color: #14532d; text-transform: uppercase;">Complete</div>
        </div>
      </div>
      <div style="color: #374151; font-size: 14px; line-height: 1.6;">
        <strong>The Pattern:</strong> Build new implementation alongside legacy, route traffic gradually (0%→10%→50%→100%), monitor, then decommission old code.
      </div>
      <div style="margin-top: 12px; padding: 12px; background: #fef2f2; border-radius: 8px; border: 1px solid #fca5a5;">
        <strong style="color: #991b1b; font-size: 13px;">❌ Anti-Pattern:</strong>
        <span style="color: #7f1d1d; font-size: 13px;"> Big bang rewrite (18 months, no releases, 80% failure rate)</span>
      </div>
    </div>
  </div>
</div>

<div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); transition: all 0.3s;">
  <div style="display: flex; align-items: start; gap: 20px;">
    <div style="font-size: 48px; line-height: 1;">⚠️</div>
    <div style="flex: 1;">
      <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #111827;"><a href="./technical-debt" style="color: #f59e0b; text-decoration: none;">Technical Debt Management</a></h3>
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">Tracking, prioritizing, and paying down technical debt systematically</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; color: #374151;">Priority</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb; color: #374151;">Timeline</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #e5e7eb; color: #374151;">Blocks Release?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><span style="background: #fecaca; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 600;">P0</span> Production broken</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; color: #6b7280;">24-48 hours</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">✅ Yes</td>
          </tr>
          <tr style="background: #fefce8;">
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><span style="background: #fde68a; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: 600;">P1</span> Feature broken</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; color: #6b7280;">1-2 weeks</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">⚠️ Maybe</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 600;">P2</span> Quality issue</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; color: #6b7280;">Next sprint</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">❌ No</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><span style="background: #e5e7eb; color: #6b7280; padding: 2px 8px; border-radius: 4px; font-weight: 600;">P3</span> Nice-to-have</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; color: #6b7280;">Backlog</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">❌ No</td>
          </tr>
        </tbody>
      </table>
      <div style="color: #374151; font-size: 14px; line-height: 1.6;">
        <strong>Key principle:</strong> Budget 20% of sprint capacity for debt paydown. Make debt visible in GitHub Issues with priority labels.
      </div>
    </div>
  </div>
</div>

</div>

---

## 🎯 How to Use These Prompt Packs

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
  <div style="font-size: 48px; margin-bottom: 12px;">1️⃣</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Choose Pattern</div>
  <div style="font-size: 14px; opacity: 0.9;">Select fitness function, dependency hygiene, strangler fig, or tech debt</div>
</div>

<div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; color: white;">
  <div style="font-size: 48px; margin-bottom: 12px;">2️⃣</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Customize Stack</div>
  <div style="font-size: 14px; opacity: 0.9;">Adapt for Node/Python/Java with your specific tools</div>
</div>

<div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 12px; color: white;">
  <div style="font-size: 48px; margin-bottom: 12px;">3️⃣</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Implement with AI</div>
  <div style="font-size: 14px; opacity: 0.9;">Use Claude, Copilot, or ChatGPT to generate code</div>
</div>

<div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); border-radius: 12px; color: white;">
  <div style="font-size: 48px; margin-bottom: 12px;">4️⃣</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Integrate CI/CD</div>
  <div style="font-size: 14px; opacity: 0.9;">Start in warning mode, establish baselines, then block merges</div>
</div>

</div>

---

## 🔄 Evolutionary Architecture Workflow

```mermaid
flowchart TD
    A[Feature Request] --> B[Design with Constraints]
    B --> C[Implement with AI]
    C --> D[Fitness Functions]
    D -->|Pass| E[Human Review]
    D -->|Fail| F[Refactor]
    F --> D
    E --> G[Merge & Deploy]
    G --> H[Monitor Metrics]
    H --> I[Update Baselines]
    I --> B

    style A fill:#e0e7ff,stroke:#6366f1,color:#1e40af
    style D fill:#fef3c7,stroke:#f59e0b,color:#92400e
    style E fill:#dbeafe,stroke:#3b82f6,color:#1e40af
    style F fill:#fecaca,stroke:#ef4444,color:#991b1b
    style G fill:#d1fae5,stroke:#10b981,color:#065f46
```

**Key Stages**:
1. **Design with Constraints**: Define quality thresholds upfront
2. **Implement with AI**: Use prompt packs to generate code
3. **Fitness Functions**: Automated validation in CI/CD
4. **Refactor**: Fix violations before merge
5. **Monitor**: Track architectural drift post-deploy
6. **Iterate**: Tighten thresholds over time

---

## 🎓 Learning Path

**New to Evolutionary Architecture?** Start here:

1. **[Workshop Part 4: Fitness Functions](/docs/workshop/part4-fitness-functions)** — Build your first fitness function
2. **[Fitness Functions Prompt Pack](./fitness-functions)** — Implement complexity checks
3. **[Dependency Hygiene Prompt Pack](./dependency-hygiene)** — Automate updates
4. **[Framework Guide](/docs/framework)** — Understand the big picture

**Advanced Topics**:
- **[Strangler Fig Pattern](./strangler-fig)** — Migrate legacy systems safely
- **[Technical Debt Management](./technical-debt)** — Systematize refactoring
- **[SDLC Integration](/docs/sdlc/)** — Embed into development lifecycle

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

- **[OWASP Prompt Packs](/docs/prompts/owasp/)** — Security-first development
- **[AI Agent Guides](/docs/agents/)** — Claude, Copilot, ChatGPT integration
- **[Workshop Series](/docs/workshop/)** — Hands-on training modules
- **[SDLC Framework](/docs/sdlc/)** — End-to-end secure development
- **[Framework Guide](/docs/framework)** — Complete methodology

---

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 40px; text-align: center; color: white; margin: 40px 0;">
  <div style="font-size: 56px; margin-bottom: 16px;">🚀</div>
  <div style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">Ready to Prevent Architectural Erosion?</div>
  <div style="font-size: 16px; opacity: 0.95; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">Pick a prompt pack above and start implementing automated governance in your CI/CD pipeline. Remember: <strong>Architecture is not a phase, it's continuous validation.</strong></div>
  <a href="./fitness-functions" style="display: inline-block; background: white; color: #667eea; padding: 16px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);">
    Start with Fitness Functions →
  </a>
</div>
