# MaintainabilityAI Documentation

Welcome to **MaintainabilityAI** - a comprehensive framework for security-first, maintainable AI-assisted software development.

---

## 🚀 Quick Start

- **New to the framework?** Start with [Workshop Part 1: The Spectrum](./workshop/part1-spectrum)
- **Need security prompts?** Download [OWASP Prompt Packs](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/owasp) from GitHub
- **Need maintainability prompts?** Download [Maintainability Prompt Packs](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/maintainability) from GitHub
- **Using AI agents?** Read [AI Agent Guides](./agents/) to choose the right tool (Claude, Copilot, ChatGPT)

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

Hands-on training for teams learning security-first AI development (90 minutes each, designed for junior → senior developers):

- **[Part 1: The Spectrum](./workshop/part1-spectrum)** - Understanding AI development modes (Vibe → AI-Assisted → Agentic)
- **[Part 2: Security-First Prompting](./workshop/part2-security-prompting)** - OWASP integration, prompt engineering techniques
- **[Part 3: Live Remediation Exercise](./workshop/part3-live-remediation)** - Hands-on: Fix A03 SQL Injection vulnerability
- **[Part 4: Fitness Functions Curriculum](./workshop/part4-fitness-functions)** - Implementing automated quality gates in CI/CD

💡 **Tip**: Start with Part 1 to understand the framework's approach to AI-assisted development.

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

### OWASP Security Prompts
**GitHub**: [/prompts/owasp/](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/owasp)

- 10 comprehensive prompt packs (A01-A10)
- Tool-specific variations for Claude, Copilot, and ChatGPT
- Before/after code examples
- Testing checklists with attack vectors

**How to use**: Copy the prompt pack for your OWASP category, paste into your AI agent with your specific context, and follow the security checklist.

### Maintainability Prompts
**GitHub**: [/prompts/maintainability/](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/prompts/maintainability)

- Fitness Functions - Automated quality gates
- Dependency Hygiene - 3-month freshness rule
- Strangler Fig - Incremental legacy migration
- Technical Debt - Structured tracking system

**How to use**: Combine with OWASP security prompts for production-grade, maintainable code.

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

Track these metrics to measure framework effectiveness:

### Security Metrics
- **Vulnerability Rate**: 0 high/critical vulnerabilities in production
- **Scan Pass Rate**: 100% CodeQL and Snyk scans passing before merge
- **OWASP Compliance**: All 10 categories addressed in production code

### Maintainability Metrics
- **Cyclomatic Complexity**: All functions ≤10 complexity
- **Dependency Freshness**: All dependencies ≤90 days old
- **Test Coverage**: ≥80% coverage with attack vectors included

### Velocity Metrics
- **Delivery Speed**: 2x faster feature delivery with AI (while maintaining quality)
- **Remediation Time**: Security fixes completed in <24 hours
- **Technical Debt**: P0 issues resolved within 7 days

### Governance Metrics
- **AI Disclosure**: 100% AI-generated code labeled with `🤖` in commits
- **Human Review**: 100% AI code reviewed before merge
- **Prompt Reuse**: Team sharing successful prompts in `/prompts/team/`

---

## ❓ Getting Help

- **Email**: [hello@maintainability.ai](mailto:hello@maintainability.ai)
- **GitHub Issues**: [Report bugs or request features](https://github.com/AliceNN-ucdenver/MaintainabilityAI/issues)
- **Documentation**: You're reading it! Explore the sections above.

---

**Ready to start?** → [Begin with Workshop Part 1](./workshop/part1-spectrum)
