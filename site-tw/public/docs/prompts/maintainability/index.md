# Maintainability Prompt Packs — Evolutionary Architecture

> **Building software that lasts requires automated governance**. These prompt packs help you implement Evolutionary Architecture patterns using AI assistants — preventing architectural erosion through fitness functions, dependency hygiene, and systematic technical debt management.

---

## 🎯 Fitness Function Metrics Dashboard

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3); border: 1px solid rgba(99, 102, 241, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">📊</div>
    <div style="color: #f1f5f9; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Complexity</div>
  </div>
  <div style="color: #f1f5f9; font-size: 40px; font-weight: 700; margin-bottom: 8px;">≤10</div>
  <div style="color: #cbd5e1; font-size: 14px; margin-bottom: 16px;">Cyclomatic complexity per function</div>
  <div style="background: rgba(241, 245, 249, 0.2); border-radius: 8px; height: 8px; overflow: hidden;">
    <div style="background: #818cf8; height: 100%; width: 100%; border-radius: 8px;"></div>
  </div>
  <div style="color: #cbd5e1; font-size: 12px; margin-top: 8px;">✅ 100% functions compliant</div>
</div>

<div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3); border: 1px solid rgba(139, 92, 246, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">📦</div>
    <div style="color: #f1f5f9; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Dependencies</div>
  </div>
  <div style="color: #f1f5f9; font-size: 40px; font-weight: 700; margin-bottom: 8px;">≤90d</div>
  <div style="color: #cbd5e1; font-size: 14px; margin-bottom: 16px;">Dependency freshness rule</div>
  <div style="background: rgba(241, 245, 249, 0.2); border-radius: 8px; height: 8px; overflow: hidden;">
    <div style="background: #a78bfa; height: 100%; width: 85%; border-radius: 8px;"></div>
  </div>
  <div style="color: #cbd5e1; font-size: 12px; margin-top: 8px;">⚠️ 85% packages current</div>
</div>

<div style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(14, 165, 233, 0.3); border: 1px solid rgba(6, 182, 212, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">🧪</div>
    <div style="color: #f1f5f9; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Coverage</div>
  </div>
  <div style="color: #f1f5f9; font-size: 40px; font-weight: 700; margin-bottom: 8px;">≥80%</div>
  <div style="color: #cbd5e1; font-size: 14px; margin-bottom: 16px;">Test coverage threshold</div>
  <div style="background: rgba(241, 245, 249, 0.2); border-radius: 8px; height: 8px; overflow: hidden;">
    <div style="background: #22d3ee; height: 100%; width: 92%; border-radius: 8px;"></div>
  </div>
  <div style="color: #cbd5e1; font-size: 12px; margin-top: 8px;">✅ 92% coverage achieved</div>
</div>

<div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3); border: 1px solid rgba(20, 184, 166, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">⚡</div>
    <div style="color: #f1f5f9; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Performance</div>
  </div>
  <div style="color: #f1f5f9; font-size: 40px; font-weight: 700; margin-bottom: 8px;">&lt;200ms</div>
  <div style="color: #cbd5e1; font-size: 14px; margin-bottom: 16px;">p95 latency threshold</div>
  <div style="background: rgba(241, 245, 249, 0.2); border-radius: 8px; height: 8px; overflow: hidden;">
    <div style="background: #5eead4; height: 100%; width: 78%; border-radius: 8px;"></div>
  </div>
  <div style="color: #cbd5e1; font-size: 12px; margin-top: 8px;">✅ 156ms average p95</div>
</div>

</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(15, 23, 42, 0.5); border: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="text-align: center; color: #f1f5f9;">
    <div style="font-size: 48px; margin-bottom: 16px;">🏆</div>
    <div style="font-size: 28px; font-weight: 700; margin-bottom: 12px;">Architecture Health Score</div>
    <div style="font-size: 72px; font-weight: 900; margin: 24px 0; background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">89%</div>
    <div style="font-size: 16px; color: #cbd5e1; margin-bottom: 24px;">Based on 4 fitness function metrics</div>
    <div style="display: flex; justify-content: center; gap: 32px; flex-wrap: wrap;">
      <div>
        <div style="font-size: 24px; font-weight: 700; color: #818cf8;">157</div>
        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Functions Analyzed</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: 700; color: #a78bfa;">34</div>
        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Dependencies Tracked</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: 700; color: #22d3ee;">2,847</div>
        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Lines Covered</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: 700; color: #5eead4;">12</div>
        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Endpoints Monitored</div>
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

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
  <div style="display: flex; align-items: start; gap: 20px;">
    <div style="font-size: 48px; line-height: 1;">📊</div>
    <div style="flex: 1;">
      <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #f1f5f9;"><a href="./fitness-functions" style="color: #818cf8; text-decoration: none;">Fitness Functions</a></h3>
      <p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">Automated quality gates for complexity, dependencies, coverage, and performance</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
        <span style="background: rgba(129, 140, 248, 0.2); color: #a5b4fc; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500; border: 1px solid rgba(129, 140, 248, 0.3);">Complexity ≤10</span>
        <span style="background: rgba(167, 139, 250, 0.2); color: #c4b5fd; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500; border: 1px solid rgba(167, 139, 250, 0.3);">Deps ≤90 days</span>
        <span style="background: rgba(34, 211, 238, 0.2); color: #67e8f9; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500; border: 1px solid rgba(34, 211, 238, 0.3);">Coverage ≥80%</span>
        <span style="background: rgba(94, 234, 212, 0.2); color: #5eead4; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500; border: 1px solid rgba(94, 234, 212, 0.3);">p95 &lt;200ms</span>
      </div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        <strong style="color: #f1f5f9;">What you'll build:</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>TypeScript complexity analyzer (ts-morph)</li>
          <li>Dependency freshness checker</li>
          <li>Coverage baseline enforcement</li>
          <li>Performance regression detection</li>
          <li>GitHub Actions CI/CD integration</li>
        </ul>
      </div>
      <a href="/docs/workshop/part4-fitness-functions" style="display: inline-block; margin-top: 12px; color: #818cf8; text-decoration: none; font-size: 14px; font-weight: 600;">
        📖 Workshop Part 4 →
      </a>
    </div>
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
  <div style="display: flex; align-items: start; gap: 20px;">
    <div style="font-size: 48px; line-height: 1;">📦</div>
    <div style="flex: 1;">
      <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #f1f5f9;"><a href="./dependency-hygiene" style="color: #a78bfa; text-decoration: none;">Dependency Hygiene</a></h3>
      <p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">The 3-month freshness rule and automated dependency updates</p>
      <div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="color: #fca5a5; font-size: 14px; font-weight: 600; margin-bottom: 4px;">⚠️ Critical Insight</div>
        <div style="color: #cbd5e1; font-size: 13px;">80% of breaches involve unpatched dependencies. Upgrading v1.0→v1.1 is easy; v1.0→v5.0 is a nightmare.</div>
      </div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        <strong style="color: #f1f5f9;">What you'll build:</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Renovate bot configuration</li>
          <li>Automated security vulnerability alerts</li>
          <li>Smart merge policies (patch auto-merge, major needs review)</li>
          <li>Dependency age dashboard</li>
        </ul>
      </div>
      <div style="margin-top: 12px; padding: 12px; background: rgba(16, 185, 129, 0.15); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
        <strong style="color: #5eead4; font-size: 13px;">3-Month Rule:</strong>
        <span style="color: #cbd5e1; font-size: 13px;"> No dependency &gt;90 days behind latest version</span>
      </div>
    </div>
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
  <div style="display: flex; align-items: start; gap: 20px;">
    <div style="font-size: 48px; line-height: 1;">🌳</div>
    <div style="flex: 1;">
      <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #f1f5f9;"><a href="./strangler-fig" style="color: #c4b5fd; text-decoration: none;">Strangler Fig Pattern</a></h3>
      <p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">Incremental migration from legacy to modern architecture (no big-bang rewrites)</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px;">
        <div style="text-align: center; padding: 12px; background: rgba(16, 185, 129, 0.15); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
          <div style="font-size: 24px; font-weight: 700; color: #5eead4;">0%</div>
          <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Start</div>
        </div>
        <div style="text-align: center; padding: 12px; background: rgba(251, 191, 36, 0.15); border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.3);">
          <div style="font-size: 24px; font-weight: 700; color: #fbbf24;">10%</div>
          <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Testing</div>
        </div>
        <div style="text-align: center; padding: 12px; background: rgba(249, 115, 22, 0.15); border-radius: 8px; border: 1px solid rgba(249, 115, 22, 0.3);">
          <div style="font-size: 24px; font-weight: 700; color: #fb923c;">50%</div>
          <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Migration</div>
        </div>
        <div style="text-align: center; padding: 12px; background: rgba(16, 185, 129, 0.15); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
          <div style="font-size: 24px; font-weight: 700; color: #10b981;">100%</div>
          <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Complete</div>
        </div>
      </div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        <strong style="color: #f1f5f9;">The Pattern:</strong> Build new implementation alongside legacy, route traffic gradually (0%→10%→50%→100%), monitor, then decommission old code.
      </div>
      <div style="margin-top: 12px; padding: 12px; background: rgba(239, 68, 68, 0.15); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
        <strong style="color: #fca5a5; font-size: 13px;">❌ Anti-Pattern:</strong>
        <span style="color: #cbd5e1; font-size: 13px;"> Big bang rewrite (18 months, no releases, 80% failure rate)</span>
      </div>
    </div>
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
  <div style="display: flex; align-items: start; gap: 20px;">
    <div style="font-size: 48px; line-height: 1;">⚠️</div>
    <div style="flex: 1;">
      <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #f1f5f9;"><a href="./technical-debt" style="color: #fbbf24; text-decoration: none;">Technical Debt Management</a></h3>
      <p style="margin: 0 0 16px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">Tracking, prioritizing, and paying down technical debt systematically</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
        <thead>
          <tr style="background: rgba(71, 85, 105, 0.3);">
            <th style="padding: 8px; text-align: left; border: 1px solid rgba(100, 116, 139, 0.3); color: #f1f5f9;">Priority</th>
            <th style="padding: 8px; text-align: left; border: 1px solid rgba(100, 116, 139, 0.3); color: #f1f5f9;">Timeline</th>
            <th style="padding: 8px; text-align: center; border: 1px solid rgba(100, 116, 139, 0.3); color: #f1f5f9;">Blocks Release?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="background: rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 2px 8px; border-radius: 4px; font-weight: 600;">P0</span> Production broken</td>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">24-48 hours</td>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); text-align: center; color: #cbd5e1;">✅ Yes</td>
          </tr>
          <tr style="background: rgba(71, 85, 105, 0.2);">
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="background: rgba(251, 191, 36, 0.3); color: #fbbf24; padding: 2px 8px; border-radius: 4px; font-weight: 600;">P1</span> Feature broken</td>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">1-2 weeks</td>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); text-align: center; color: #cbd5e1;">⚠️ Maybe</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="background: rgba(129, 140, 248, 0.3); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-weight: 600;">P2</span> Quality issue</td>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">Next sprint</td>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); text-align: center; color: #cbd5e1;">❌ No</td>
          </tr>
          <tr style="background: rgba(71, 85, 105, 0.2);">
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="background: rgba(100, 116, 139, 0.3); color: #94a3b8; padding: 2px 8px; border-radius: 4px; font-weight: 600;">P3</span> Nice-to-have</td>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">Backlog</td>
            <td style="padding: 8px; border: 1px solid rgba(100, 116, 139, 0.3); text-align: center; color: #cbd5e1;">❌ No</td>
          </tr>
        </tbody>
      </table>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        <strong style="color: #f1f5f9;">Key principle:</strong> Budget 20% of sprint capacity for debt paydown. Make debt visible in GitHub Issues with priority labels.
      </div>
    </div>
  </div>
</div>

</div>

---

## 🎯 How to Use These Prompt Packs

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 12px; color: #f1f5f9; border: 1px solid rgba(99, 102, 241, 0.3);">
  <div style="font-size: 48px; margin-bottom: 12px;">1️⃣</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Choose Pattern</div>
  <div style="font-size: 14px; color: #cbd5e1;">Select fitness function, dependency hygiene, strangler fig, or tech debt</div>
</div>

<div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 12px; color: #f1f5f9; border: 1px solid rgba(139, 92, 246, 0.3);">
  <div style="font-size: 48px; margin-bottom: 12px;">2️⃣</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Customize Stack</div>
  <div style="font-size: 14px; color: #cbd5e1;">Adapt for Node/Python/Java with your specific tools</div>
</div>

<div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 12px; color: #f1f5f9; border: 1px solid rgba(6, 182, 212, 0.3);">
  <div style="font-size: 48px; margin-bottom: 12px;">3️⃣</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Implement with AI</div>
  <div style="font-size: 14px; color: #cbd5e1;">Use Claude, Copilot, or ChatGPT to generate code</div>
</div>

<div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 12px; color: #f1f5f9; border: 1px solid rgba(20, 184, 166, 0.3);">
  <div style="font-size: 48px; margin-bottom: 12px;">4️⃣</div>
  <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Integrate CI/CD</div>
  <div style="font-size: 14px; color: #cbd5e1;">Start in warning mode, establish baselines, then block merges</div>
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

<div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 40px; text-align: center; color: #f1f5f9; margin: 40px 0; border: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="font-size: 56px; margin-bottom: 16px;">🚀</div>
  <div style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">Ready to Prevent Architectural Erosion?</div>
  <div style="font-size: 16px; color: #cbd5e1; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">Pick a prompt pack above and start implementing automated governance in your CI/CD pipeline. Remember: <strong style="color: #818cf8;">Architecture is not a phase, it's continuous validation.</strong></div>
  <a href="./fitness-functions" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #f1f5f9; padding: 16px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
    Start with Fitness Functions →
  </a>
</div>
