# MaintainabilityAI Documentation

<div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(79, 70, 229, 0.4); border: 1px solid rgba(124, 58, 237, 0.3);">
  <div style="text-align: center;">
    <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
    <h2 style="margin: 0; font-size: 32px; color: #f1f5f9; font-weight: 800;">Complete Framework Documentation</h2>
    <div style="font-size: 16px; color: #e9d5ff; margin-top: 12px; max-width: 800px; margin-left: auto; margin-right: auto;">
      Security-first, maintainable AI-assisted software development. From OWASP prompt packs to evolutionary architecture patterns.
    </div>
  </div>
</div>

## 🚀 Quick Start

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 32px 0;">
  <a href="./workshop/part1-spectrum" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(100, 116, 139, 0.3); display: block; transition: transform 0.2s;">
    <div style="font-size: 32px; margin-bottom: 12px;">🎓</div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #f1f5f9; font-weight: 700;">New to the Framework?</h3>
    <p style="color: #cbd5e1; font-size: 14px; margin: 0; line-height: 1.6;">Start with Workshop Part 1: The Spectrum to understand AI development modes</p>
  </a>

  <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/owasp" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(100, 116, 139, 0.3); display: block;">
    <div style="font-size: 32px; margin-bottom: 12px;">🛡️</div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #f1f5f9; font-weight: 700;">Need Security Prompts?</h3>
    <p style="color: #cbd5e1; font-size: 14px; margin: 0; line-height: 1.6;">Download OWASP Top 10 prompt packs from GitHub (A01-A10)</p>
  </a>

  <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/maintainability" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(100, 116, 139, 0.3); display: block;">
    <div style="font-size: 32px; margin-bottom: 12px;">📐</div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #f1f5f9; font-weight: 700;">Need Maintainability Prompts?</h3>
    <p style="color: #cbd5e1; font-size: 14px; margin: 0; line-height: 1.6;">Download evolutionary architecture patterns and fitness functions</p>
  </a>

  <a href="./agents/" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(100, 116, 139, 0.3); display: block;">
    <div style="font-size: 32px; margin-bottom: 12px;">🤖</div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #f1f5f9; font-weight: 700;">Using AI Agents?</h3>
    <p style="color: #cbd5e1; font-size: 14px; margin: 0; line-height: 1.6;">Read AI Agent Guides to choose the right tool (Claude, Copilot, ChatGPT)</p>
  </a>
</div>

---

## 📚 Core Documentation

### SDLC Framework

Complete 6-phase framework integrating security and maintainability throughout the software development lifecycle:

- **[Overview](./sdlc/)** - Framework introduction and integration guide
- **[Phase 1: Design](./sdlc/phase1-design)** - Threat modeling with STRIDE methodology
- **[Phase 2: Implementation](./sdlc/phase2-implementation)** - Secure coding with AI agents
- **[Phase 3: Verification](./sdlc/phase3-verification)** - Testing, scanning, and fitness functions
- **[Phase 4: Governance](./sdlc/phase4-governance)** - PR reviews, policies, and human oversight
- **[Phase 5: Deployment](./sdlc/phase5-deployment)** - CI/CD with security gates
- **[Phase 6: Evolution](./sdlc/phase6-evolution)** - Metrics, monitoring, and continuous improvement

---

### Security (OWASP Top 10)

Security-first prompt packs for AI code generation. Each category includes comprehensive prompts, code examples, and testing checklists:

**Download from GitHub**: [/prompts/owasp/](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/owasp)

- [A01: Broken Access Control](./prompts/owasp/A01_broken_access_control) - RBAC, IDOR prevention
- [A02: Cryptographic Failures](./prompts/owasp/A02_crypto_failures) - Encryption, hashing, TLS
- [A03: Injection](./prompts/owasp/A03_injection) - SQL injection, parameterized queries
- [A04: Insecure Design](./prompts/owasp/A04_insecure_design) - Threat modeling, secure architecture
- [A05: Security Misconfiguration](./prompts/owasp/A05_security_misconfig) - CORS, headers, hardening
- [A06: Vulnerable Components](./prompts/owasp/A06_vuln_outdated) - Dependency scanning, updates
- [A07: Authentication Failures](./prompts/owasp/A07_authn_failures) - MFA, session management
- [A08: Integrity Failures](./prompts/owasp/A08_integrity_failures) - Signatures, checksum verification
- [A09: Logging/Monitoring Failures](./prompts/owasp/A09_logging_monitoring) - Security events, alerting
- [A10: Server-Side Request Forgery](./prompts/owasp/A10_ssrf) - URL validation, IP allowlisting

---

### Maintainability (Evolutionary Architecture)

Fitness functions and patterns for building long-lived, maintainable systems:

**Download from GitHub**: [/prompts/maintainability/](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/maintainability)

- [Fitness Functions](./prompts/maintainability/fitness-functions) - Automated quality gates (complexity ≤10, coverage ≥80%, deps ≤90 days)
- [Dependency Hygiene](./prompts/maintainability/dependency-hygiene) - 3-month freshness rule with Renovate bot
- [Strangler Fig Pattern](./prompts/maintainability/strangler-fig) - Incremental legacy migration
- [Technical Debt Management](./prompts/maintainability/technical-debt) - Structured tracking (P0 issues ≤7 days)

---

### Governance & Framework

- [Golden Rules of Vibe Coding](./governance/vibe-golden-rules) - 6 essential rules for AI governance
- [Security Workflow](./framework) - 6-layer defense-in-depth pipeline (STRIDE + OWASP integration)
- [Framework Integration Guide](./framework) - How all pieces fit together across the SDLC

---

## 🎓 Workshop

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <div style="color: #a5b4fc; font-size: 14px; margin-bottom: 12px;">
    Hands-on training for teams learning security-first AI development. 4-part series designed for junior → senior developers.
  </div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 32px 0;">
  <a href="./workshop/part1-spectrum" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6; display: block;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #f1f5f9;">1</div>
      <h4 style="margin: 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">The Spectrum</h4>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">Understanding AI development modes: Vibe → AI-Assisted → Agentic</p>
    <div style="color: #60a5fa; font-size: 12px; margin-top: 8px;">45 minutes</div>
  </a>

  <a href="./workshop/part2-security-prompting" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #f59e0b; display: block;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #f1f5f9;">2</div>
      <h4 style="margin: 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Security-First Prompting</h4>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">OWASP integration and prompt engineering techniques</p>
    <div style="color: #fbbf24; font-size: 12px; margin-top: 8px;">60 minutes</div>
  </a>

  <a href="./workshop/part3-live-remediation" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #ef4444; display: block;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #f1f5f9;">3</div>
      <h4 style="margin: 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Live Remediation</h4>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">Hands-on: Fix A03 SQL Injection vulnerability step-by-step</p>
    <div style="color: #f87171; font-size: 12px; margin-top: 8px;">90 minutes</div>
  </a>

  <a href="./workshop/part4-fitness-functions" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #a855f7; display: block;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #f1f5f9;">4</div>
      <h4 style="margin: 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Fitness Functions</h4>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">Implementing automated quality gates in CI/CD</p>
    <div style="color: #c084fc; font-size: 12px; margin-top: 8px;">75 minutes</div>
  </a>
</div>

<div style="text-align: center; margin: 32px 0;">
  <a href="./workshop/" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #f1f5f9; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);">
    View Complete Workshop Overview →
  </a>
</div>

---

## 🤖 AI Agent Guides

Platform-specific guidance for security-first development with different AI tools:

| Agent | Best For | Guide |
|-------|----------|-------|
| **Claude** | Complex refactoring, multi-file changes, comprehensive testing | [Claude Guide](./agents/claude) |
| **GitHub Copilot** | In-editor completions, `#codebase` patterns, real-time constraints | [Copilot Guide](./agents/copilot) |
| **ChatGPT** | Threat modeling, architecture reviews, iterative refinement | [ChatGPT Guide](./agents/chatgpt) |
| **Multi-Agent** | Orchestrating multiple AI agents for complex workflows | [Multi-Agent Guide](./agents/multi-agent) |

📖 **[View All Agent Guides](./agents/)** - Detailed comparison and selection guide

---

## 📦 Downloadable Prompt Packs

All prompt packs follow the proven **Role + Context + Requirements + Task + Checklist** pattern.

### Setup: Clone the Repository

**Recommended for best UX** (works with Claude Code and Copilot):
```bash
git clone https://github.com/AliceNN-ucdenver/MaintainabilityAI.git
cd MaintainabilityAI
```

Now you can reference prompts by local file path instead of copy/paste:
- Claude Code: "Use `/path/to/MaintainabilityAI/prompts/owasp/A03_injection.md` to refactor..."
- Copilot: `#file:/prompts/owasp/A03_injection.md` + your request

**Alternative** (for ChatGPT web users): Copy prompts from [GitHub](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts) and paste.

### OWASP Security Prompts
**Location**: `/prompts/owasp/` | **GitHub**: [View Online](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/owasp)

- 10 comprehensive prompt packs (A01-A10)
- Before/after code examples
- Testing checklists with attack vectors
- Tool-specific guidance for Claude, Copilot, ChatGPT

### Maintainability Prompts
**Location**: `/prompts/maintainability/` | **GitHub**: [View Online](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/maintainability)

- [Fitness Functions](./prompts/maintainability/fitness-functions) - Automated quality gates
- [Dependency Hygiene](./prompts/maintainability/dependency-hygiene) - 3-month freshness rule
- [Strangler Fig](./prompts/maintainability/strangler-fig) - Incremental legacy migration
- [Technical Debt](./prompts/maintainability/technical-debt) - Structured tracking system

### Keeping Prompts Updated

```bash
# Pull latest prompt improvements
cd MaintainabilityAI
git pull origin main
```

---

## 🔗 Quick Links

- **GitHub Repository**: [AliceNN-ucdenver/MaintainabilityAI](https://github.com/AliceNN-ucdenver/MaintainabilityAI)
- **Vulnerable Code Examples**: [/examples/owasp/](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/examples/owasp) (for practice remediation)
- **CI/CD Workflows**: [/.github/workflows/](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/.github/workflows) (CodeQL, Snyk integration)
- **Workshop Agenda**: [View Workshop Schedule](/agenda)

---

## 📖 How to Use This Framework

### Step-by-Step Implementation

1. **Choose your AI tool**: [Review Agent Guides](./agents/) to select Claude (refactoring), Copilot (inline), or ChatGPT (design)
2. **Start with a workshop**: [Part 1: The Spectrum](./workshop/part1-spectrum) teaches the fundamental approach
3. **Download prompt packs**: Get [OWASP](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/owasp) + [Maintainability](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/maintainability) prompts from GitHub
4. **Follow the SDLC**: Design → Implement → Verify → Govern → Deploy → Evolve ([SDLC Overview](./sdlc/))
5. **Apply Golden Rules**: [Read the 6 rules](./governance/vibe-golden-rules) - be specific, trust but verify, treat AI as junior dev
6. **Measure outcomes**: Track security scan pass rate, complexity adherence, and velocity

### Typical Workflow Example

```markdown
1. Threat Model (ChatGPT + STRIDE)
2. Design with security controls (Claude + OWASP A01, A03, A07)
3. Implement with AI agent (Copilot + prompt packs)
4. Generate tests (Claude + attack vectors)
5. Verify with fitness functions (complexity ≤10, coverage ≥80%)
6. Scan with CodeQL and Snyk
7. Human review against Golden Rules
8. Deploy with CI/CD gates
```

---

## 🎯 Success Metrics

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <div style="color: #a5b4fc; font-size: 14px;">
    Track these metrics to measure framework effectiveness and demonstrate ROI
  </div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin: 32px 0;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 36px; margin-bottom: 16px;">🔒</div>
    <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #f1f5f9; font-weight: 700;">Security Metrics</h3>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
      <div style="margin-bottom: 12px;">
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Vulnerability Rate</div>
        <div style="color: #94a3b8; font-size: 13px;">0 high/critical in production</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Scan Pass Rate</div>
        <div style="color: #94a3b8; font-size: 13px;">100% CodeQL + Snyk passing</div>
      </div>
      <div>
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">OWASP Compliance</div>
        <div style="color: #94a3b8; font-size: 13px;">All 10 categories addressed</div>
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 36px; margin-bottom: 16px;">📐</div>
    <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #f1f5f9; font-weight: 700;">Maintainability Metrics</h3>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
      <div style="margin-bottom: 12px;">
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Cyclomatic Complexity</div>
        <div style="color: #94a3b8; font-size: 13px;">All functions ≤10</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Dependency Freshness</div>
        <div style="color: #94a3b8; font-size: 13px;">All deps ≤90 days old</div>
      </div>
      <div>
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Test Coverage</div>
        <div style="color: #94a3b8; font-size: 13px;">≥80% with attack vectors</div>
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 36px; margin-bottom: 16px;">⚡</div>
    <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #f1f5f9; font-weight: 700;">Velocity Metrics</h3>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
      <div style="margin-bottom: 12px;">
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Delivery Speed</div>
        <div style="color: #94a3b8; font-size: 13px;">2x faster with AI</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Remediation Time</div>
        <div style="color: #94a3b8; font-size: 13px;">Security fixes <24 hours</div>
      </div>
      <div>
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Technical Debt</div>
        <div style="color: #94a3b8; font-size: 13px;">P0 issues ≤7 days</div>
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 36px; margin-bottom: 16px;">🏛️</div>
    <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #f1f5f9; font-weight: 700;">Governance Metrics</h3>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
      <div style="margin-bottom: 12px;">
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">AI Disclosure</div>
        <div style="color: #94a3b8; font-size: 13px;">100% labeled with 🤖</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Human Review</div>
        <div style="color: #94a3b8; font-size: 13px;">100% reviewed before merge</div>
      </div>
      <div>
        <div style="color: #818cf8; font-weight: 600; font-size: 13px;">Prompt Reuse</div>
        <div style="color: #94a3b8; font-size: 13px;">Team library growing</div>
      </div>
    </div>
  </div>
</div>

---

## ❓ Getting Help

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 32px 0;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 28px; margin-bottom: 8px;">📧</div>
    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Email Support</h4>
    <a href="mailto:hello@maintainability.ai" style="color: #818cf8; text-decoration: none; font-size: 14px;">hello@maintainability.ai</a>
  </div>

  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 28px; margin-bottom: 8px;">💬</div>
    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">GitHub Issues</h4>
    <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI/issues" style="color: #818cf8; text-decoration: none; font-size: 14px;">Report bugs or request features</a>
  </div>

  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 28px; margin-bottom: 8px;">📖</div>
    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Documentation</h4>
    <div style="color: #94a3b8; font-size: 14px;">You're reading it! Explore above.</div>
  </div>
</div>

---

<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 32px; margin: 32px 0; text-align: center; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);">
  <div style="font-size: 40px; margin-bottom: 16px;">🚀</div>
  <h2 style="margin: 0 0 12px 0; font-size: 28px; color: #f1f5f9; font-weight: 800;">Ready to Get Started?</h2>
  <p style="color: #d1fae5; font-size: 16px; margin: 0 0 24px 0; max-width: 600px; margin-left: auto; margin-right: auto;">
    Get hands-on with the workshop or contact us to bring this training to your team
  </p>
  <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
    <a href="./workshop/part1-spectrum" style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #f1f5f9; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; border: 2px solid rgba(255, 255, 255, 0.3);">
      Begin Workshop →
    </a>
    <a href="https://chiefarcheologist.com/contact" style="display: inline-block; background: rgba(255, 255, 255, 0.95); color: #059669; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700;">
      Contact Chief Archeologist
    </a>
  </div>
</div>
