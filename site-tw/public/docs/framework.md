# MaintainabilityAI: Complete Integration Framework

> **The comprehensive security-first AI-assisted development framework that integrates OWASP Top 10, Evolutionary Architecture, Multi-Agent Orchestration, and the complete SDLC.**

---

## Framework Overview

MaintainabilityAI provides an end-to-end methodology for building secure, maintainable software with AI assistance:

```mermaid
flowchart TD
    A[Security First:<br/>OWASP Top 10] --> E[Complete Framework]
    B[AI Agents:<br/>Claude, Copilot, ChatGPT] --> E
    C[SDLC Phases:<br/>Design → Deploy] --> E
    D[Maintainability:<br/>Fitness Functions] --> E

    E --> F[Secure Software]
    E --> G[High Velocity]
    E --> H[Low Tech Debt]

    style E fill:#4CAF50
    style F fill:#2196F3
    style G fill:#2196F3
    style H fill:#2196F3
```

---

## Framework Components

The framework integrates three core pillars that work together throughout the software development lifecycle:

<div style="display: grid; gap: 32px; margin: 40px 0;">

<!-- SDLC Section -->
<div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 16px; padding: 40px; color: #f1f5f9; box-shadow: 0 8px 24px rgba(79, 70, 229, 0.3); border: 1px solid rgba(99, 102, 241, 0.3);">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
    <div style="font-size: 64px;">🔄</div>
    <div>
      <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px;">Software Development Lifecycle (SDLC)</div>
      <div style="color: #c7d2fe; font-size: 16px;">6 phases from design to evolution</div>
    </div>
  </div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">The Six Phases:</div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 14px; line-height: 1.8;">
      <div><strong>1. Design</strong> — Threat modeling with STRIDE, OWASP mapping</div>
      <div><strong>2. Implementation</strong> — Security-first prompts with AI agents</div>
      <div><strong>3. Verification</strong> — CodeQL, Snyk, fitness function validation</div>
      <div><strong>4. Governance</strong> — PR review with Golden Rules checklist</div>
      <div><strong>5. Deployment</strong> — CI/CD security gates, smoke tests</div>
      <div><strong>6. Evolution</strong> — Metrics, dependency updates, tech debt paydown</div>
    </div>
  </div>

  <div style="font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
    Each phase integrates AI assistance, security controls, and automated validation. The lifecycle is continuous — insights from production monitoring (Phase 6) feed back into design decisions (Phase 1). This creates a feedback loop where your development process becomes more secure and efficient over time.
  </div>

  <a href="/docs/sdlc/" style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #f1f5f9; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 15px; border: 1px solid rgba(255, 255, 255, 0.3); transition: background 0.2s;">
    Explore SDLC Phases →
  </a>
</div>

<!-- OWASP Section -->
<div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 16px; padding: 40px; color: #f1f5f9; box-shadow: 0 8px 24px rgba(220, 38, 38, 0.3); border: 1px solid rgba(239, 68, 68, 0.3);">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
    <div style="font-size: 64px;">🛡️</div>
    <div>
      <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px;">OWASP Top 10 Security</div>
      <div style="color: #fca5a5; font-size: 16px;">10 comprehensive prompt packs for secure AI development</div>
    </div>
  </div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Complete Coverage:</div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 13px; line-height: 1.6;">
      <div>✓ A01 — Broken Access Control</div>
      <div>✓ A02 — Cryptographic Failures</div>
      <div>✓ A03 — Injection</div>
      <div>✓ A04 — Insecure Design</div>
      <div>✓ A05 — Security Misconfiguration</div>
      <div>✓ A06 — Vulnerable Components</div>
      <div>✓ A07 — Authentication Failures</div>
      <div>✓ A08 — Integrity Failures</div>
      <div>✓ A09 — Logging/Monitoring</div>
      <div>✓ A10 — Server-Side Request Forgery</div>
    </div>
  </div>

  <div style="font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
    Every prompt pack follows the proven 5-component pattern: Role → Context → Requirements → Task → Checklist. Use these with Claude Code, GitHub Copilot, or ChatGPT to generate secure code by default. Each pack includes attack scenarios, secure patterns, and validation checklists so AI generates code that's secure from the start.
  </div>

  <a href="/docs/prompts/owasp/" style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #f1f5f9; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 15px; border: 1px solid rgba(255, 255, 255, 0.3); transition: background 0.2s;">
    Browse OWASP Prompt Packs →
  </a>
</div>

<!-- Maintainability Section -->
<div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 16px; padding: 40px; color: #f1f5f9; box-shadow: 0 8px 24px rgba(5, 150, 105, 0.3); border: 1px solid rgba(16, 185, 129, 0.3);">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
    <div style="font-size: 64px;">📊</div>
    <div>
      <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px;">Evolutionary Architecture & Maintainability</div>
      <div style="color: #a7f3d0; font-size: 16px;">Automated fitness functions prevent architectural erosion</div>
    </div>
  </div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Automated Quality Gates:</div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 14px; line-height: 1.8;">
      <div><strong>Complexity ≤10</strong> — Cyclomatic complexity per function</div>
      <div><strong>Coverage ≥80%</strong> — Test coverage on critical paths</div>
      <div><strong>Deps &lt;90 days</strong> — No packages older than 3 months</div>
      <div><strong>p95 &lt;200ms</strong> — Performance regression detection</div>
    </div>
  </div>

  <div style="font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
    Fitness functions are automated checks that protect your architecture from decay. Without them, quality standards exist only in reviewers' heads. With them, standards are enforced in CI/CD before merge. Includes prompt packs for implementing complexity analyzers, dependency freshness checks, the Strangler Fig migration pattern, and systematic technical debt management.
  </div>

  <a href="/docs/prompts/maintainability/" style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #f1f5f9; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 15px; border: 1px solid rgba(255, 255, 255, 0.3); transition: background 0.2s;">
    Browse Maintainability Prompt Packs →
  </a>
</div>

</div>

<!-- Threat Modeling Section -->
<div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 16px; padding: 40px; color: #f1f5f9; box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3); border: 1px solid rgba(139, 92, 246, 0.3);">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
    <div style="font-size: 64px;">🎯</div>
    <div>
      <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px;">STRIDE Threat Modeling</div>
      <div style="color: #c4b5fd; font-size: 16px;">AI-powered security design with Microsoft's STRIDE methodology</div>
    </div>
  </div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Six Threat Categories:</div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 14px; line-height: 1.8;">
      <div><strong>S</strong>poofing — Identity impersonation</div>
      <div><strong>T</strong>ampering — Data manipulation</div>
      <div><strong>R</strong>epudiation — Denying actions</div>
      <div><strong>I</strong>nformation Disclosure — Data leaks</div>
      <div><strong>D</strong>enial of Service — Availability attacks</div>
      <div><strong>E</strong>levation of Privilege — Unauthorized access</div>
    </div>
  </div>

  <div style="font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
    STRIDE helps you systematically identify security threats during design — before writing code. Use ChatGPT or Claude to analyze your architecture diagram and generate comprehensive threat models in minutes. Each STRIDE category maps to specific OWASP vulnerabilities, creating a clear path from threat identification to secure implementation.
  </div>

  <a href="/docs/prompts/threat-modeling/" style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #f1f5f9; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 15px; border: 1px solid rgba(255, 255, 255, 0.3); transition: background 0.2s;">
    Browse STRIDE Prompt Packs →
  </a>
</div>

</div>

**How They Work Together**: Start with SDLC Phase 1 (Design) using STRIDE threat modeling. Apply OWASP prompt packs in Phase 2 (Implementation) to generate secure code. Validate with fitness functions in Phase 3 (Verification). This integrated approach ensures security and maintainability are built in from day one, not bolted on later.

---

## Security Pipeline: Defense in Depth

MaintainabilityAI implements a **6-layer security pipeline** that catches vulnerabilities at every stage of development:

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant IDE as IDE<br/>(AI Assistant)
    participant Local as Local<br/>(Lint/Test)
    participant Git as Pre-commit<br/>(Snyk)
    participant CI as CI/CD<br/>(CodeQL/Snyk)
    participant Human as Human Review
    participant Prod as Production

    Dev->>IDE: Prompt with security constraints
    IDE-->>Dev: Secure code generation
    Dev->>Local: npm test && npm run lint
    Local-->>Dev: ✅ Quality checks pass
    Dev->>Git: git commit
    Git-->>Dev: ✅ Security scan pass
    Dev->>CI: git push (PR)
    CI-->>Dev: ✅ CodeQL + Snyk pass
    Dev->>Human: Request review
    Human-->>Dev: ✅ Golden Rules applied
    Human->>Prod: Merge & Deploy
```

### The Six Layers

**Example: Building a Document Sharing Feature** — *"Users should share documents with different permission levels"*

Click any layer to see how it applies to this real feature:

<div style="display: grid; gap: 16px; margin: 24px 0;">

<details style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 12px; padding: 20px; color: #f1f5f9; cursor: pointer;">
  <summary style="font-size: 24px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ Layer 1: IDE Security — Prevention at the Source</summary>
  <div style="color: #fca5a5; font-size: 14px; margin: 16px 0 12px 0;">Use security-first prompts with OWASP categories. <strong>Prevents 60-70% of vulnerabilities</strong> before they're written.</div>

  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.7;">
    <strong style="display: block; margin-bottom: 8px;">📋 User Story: Document Sharing</strong>
    <strong>Requirement:</strong> Users can share documents via email with read/write/admin permissions<br/>
    <strong>Threats Identified:</strong> IDOR attacks, SQL injection, permission escalation, no audit trail
  </div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 16px 0;">
    <strong style="display: block; margin-bottom: 12px; font-size: 16px;">💡 The Prompt:</strong>
    <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.6; color: #f1f5f9;">
<strong>Role:</strong> Security engineer implementing secure document sharing

<strong>Context:</strong>
- Node.js + TypeScript + PostgreSQL
- User authentication via JWT (user ID available)
- Document permissions: read, write, admin
- OWASP categories: A01 (Access Control), A03 (Injection), A09 (Logging)

<strong>Functional Requirements:</strong>
1. Implement createShare(documentId, recipientEmail, permission, userId)
2. Verify userId owns documentId before sharing (prevent IDOR)
3. Validate recipientEmail exists in users table
4. Insert share record with permission level
5. Return share ID on success

<strong>Non-Functional Requirements (Security & Quality):</strong>
- Use parameterized queries ($1, $2 placeholders) - <a href="/docs/prompts/owasp/A03_injection" style="color: #fca5a5;">OWASP A03</a>
- Validate all inputs with Zod (email format, permission enum)
- Verify resource ownership before any operation - <a href="/docs/prompts/owasp/A01_broken_access_control" style="color: #fca5a5;">OWASP A01</a>
- Log security events (share created, failures) - <a href="/docs/prompts/owasp/A09_logging_monitoring" style="color: #fca5a5;">OWASP A09</a>
- Generic error messages to client, detailed logs server-side
- Cyclomatic complexity ≤10 per function
- Test coverage ≥80% with attack payloads

<strong>Fitness Functions to Satisfy:</strong>
- Dependency freshness <90 days - <a href="/docs/prompts/maintainability/dependency-hygiene" style="color: #86efac;">See prompt pack</a>
- No eval() or type-unsafe operations
- All async operations have error handling

<strong>Task:</strong>
Generate createShare() function with full security controls and tests.</pre>
  </div>

  <div style="font-size: 14px; line-height: 1.7;">
    <strong>What AI generates:</strong> Code with authorization checks, parameterized queries, input validation, and audit logs built in from the start.
  </div>
</details>

<details style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); border-radius: 12px; padding: 20px; color: #f1f5f9; cursor: pointer;">
  <summary style="font-size: 24px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ Layer 2: Local Checks — Fast Feedback Loop</summary>
  <div style="color: #fdba74; font-size: 14px; margin: 16px 0 12px 0;">ESLint catches dangerous patterns. Jest validates security controls with attack payloads.</div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 16px 0;">
    <strong style="display: block; margin-bottom: 12px; font-size: 16px;">✅ Running Local Tests:</strong>
    <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6; color: #f1f5f9;">
npm run lint
✅ No eval() usage
✅ No type-unsafe operations
✅ Complexity: Max 8 (threshold: 10)

npm test
✅ SQL injection blocked: "'; DROP TABLE--"
✅ IDOR attack blocked: Different user's doc
✅ Permission escalation blocked
✅ Coverage: 95% (threshold: 80%)</pre>
  </div>

  <div style="font-size: 14px; line-height: 1.7;">
    <strong>Outcome:</strong> Immediate feedback — if security controls aren't working, you know before committing.
  </div>
</details>

<details style="background: linear-gradient(135deg, #ca8a04 0%, #eab308 100%); border-radius: 12px; padding: 20px; color: #f1f5f9; cursor: pointer;">
  <summary style="font-size: 24px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ Layer 3: Pre-commit Hooks — Last Defense Before Repo</summary>
  <div style="color: #fde047; font-size: 14px; margin: 16px 0 12px 0;">Snyk scans for hardcoded secrets and vulnerable patterns. Blocks commits that introduce risks.</div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 16px 0;">
    <strong style="display: block; margin-bottom: 12px; font-size: 16px;">🔍 Pre-commit Scan:</strong>
    <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6; color: #f1f5f9;">
git commit -m "feat: add document sharing"

Running pre-commit hooks...
✅ No hardcoded secrets detected
✅ No vulnerable patterns found
✅ All dependencies clean

[main abc123] feat: add document sharing</pre>
  </div>

  <div style="font-size: 14px; line-height: 1.7;">
    <strong>Outcome:</strong> Can't accidentally commit API keys, passwords, or known vulnerable code.
  </div>
</details>

<details style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); border-radius: 12px; padding: 20px; color: #f1f5f9; cursor: pointer;">
  <summary style="font-size: 24px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ Layer 4: CI/CD Gates — Automated Deep Analysis</summary>
  <div style="color: #86efac; font-size: 14px; margin: 16px 0 12px 0;">CodeQL deep analysis, Snyk CVE scanning, fitness function validation.</div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 16px 0;">
    <strong style="display: block; margin-bottom: 12px; font-size: 16px;">🤖 CI Pipeline (GitHub Actions):</strong>
    <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6; color: #f1f5f9;">
<strong>CodeQL Security Analysis:</strong>
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

  <div style="font-size: 14px; line-height: 1.7;">
    <strong>Outcome:</strong> Deep semantic analysis finds issues local tools miss. Code quality enforced automatically.
  </div>
</details>

<details style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 12px; padding: 20px; color: #f1f5f9; cursor: pointer;">
  <summary style="font-size: 24px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ Layer 5: Human Review — Critical Thinking</summary>
  <div style="color: #67e8f9; font-size: 14px; margin: 16px 0 12px 0;">Apply Golden Rules: trust but verify, understand every line, validate business logic.</div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 16px 0;">
    <strong style="display: block; margin-bottom: 12px; font-size: 16px;">👤 Reviewer Checklist:</strong>
    <div style="font-size: 13px; line-height: 1.8;">
      ✅ <strong>Understand every line:</strong> Can explain code to teammate<br/>
      ✅ <strong>Verify security controls:</strong> Authorization, validation, error handling present<br/>
      ✅ <strong>Check edge cases:</strong> What if email invalid? User deleted? Doc already shared?<br/>
      ✅ <strong>AI disclosure:</strong> Commit labeled 🤖 AI-assisted with Copilot using A01, A03<br/>
      ✅ <strong>Business logic:</strong> Does this actually solve the user's problem securely?
    </div>
  </div>

  <div style="font-size: 14px; line-height: 1.7;">
    <strong>Outcome:</strong> AI validates technical controls. Human validates if it's the right solution.
  </div>
</details>

<details style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 12px; padding: 20px; color: #f1f5f9; cursor: pointer;">
  <summary style="font-size: 24px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ Layer 6: Production Monitoring — Runtime Protection</summary>
  <div style="color: #c4b5fd; font-size: 14px; margin: 16px 0 12px 0;">Monitor security events, alert on anomalies, log for forensics and compliance.</div>

  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 16px 0;">
    <strong style="display: block; margin-bottom: 12px; font-size: 16px;">📊 Week 1 Production Metrics:</strong>
    <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.6; color: #f1f5f9;">
<strong>Feature Performance:</strong>
🎉 1,200+ documents shared/day
⚡ p95 latency: 145ms (threshold: 200ms)

<strong>Security Events:</strong>
🛡️ 23 IDOR attempts/day → <strong>All blocked</strong>
🛡️ 5 SQL injection attempts/day → <strong>All blocked</strong>
🛡️ 0 unauthorized data access

<strong>Action Items:</strong>
→ Update A01 prompt with real attack patterns
→ Add alert for IDOR attempts &gt;50/day</pre>
  </div>

  <div style="font-size: 14px; line-height: 1.7;">
    <strong>Outcome:</strong> Real attacks improve your prompts. Team gets better at security over time.
  </div>
</details>

</div>

### PR Security Review Checklist

When reviewing AI-assisted code, apply these checks to ensure security requirements are met:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">

<div>
  <div style="font-size: 18px; font-weight: 700; color: #ef4444; margin-bottom: 12px;">🔒 Security Controls</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    <strong style="color: #f1f5f9;">Input Validation:</strong> Allowlist validation, length limits, type checking<br/>
    <strong style="color: #f1f5f9;">Output Encoding:</strong> Context-appropriate encoding (HTML, SQL, JSON)<br/>
    <strong style="color: #f1f5f9;">Auth/Authz:</strong> Horizontal & vertical access control verified<br/>
    <strong style="color: #f1f5f9;">Error Handling:</strong> Generic messages, detailed server-side logs
  </div>
</div>

<div>
  <div style="font-size: 18px; font-weight: 700; color: #f97316; margin-bottom: 12px;">🧪 Testing</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    <strong style="color: #f1f5f9;">Attack Scenarios:</strong> SQL injection, XSS, IDOR payloads tested<br/>
    <strong style="color: #f1f5f9;">Edge Cases:</strong> Empty input, null/undefined, service failures<br/>
    <strong style="color: #f1f5f9;">Coverage:</strong> Critical paths ≥80%, positive + negative cases
  </div>
</div>

<div>
  <div style="font-size: 18px; font-weight: 700; color: #eab308; margin-bottom: 12px;">🤖 AI Disclosure</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    <strong style="color: #f1f5f9;">Commit Label:</strong> 🤖 AI-assisted with [tool] using [pack]<br/>
    <strong style="color: #f1f5f9;">Prompt Quality:</strong> OWASP categories referenced, constraints specified<br/>
    <strong style="color: #f1f5f9;">Understanding:</strong> Can you explain every line to a teammate?
  </div>
</div>

<div>
  <div style="font-size: 18px; font-weight: 700; color: #22c55e; margin-bottom: 12px;">✅ Approval Criteria</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    <strong style="color: #10b981;">Approve:</strong> All controls present, tests comprehensive, code understandable<br/>
    <strong style="color: #ef4444;">Block:</strong> Vulnerabilities found, missing security tests, CI failing<br/>
    <strong style="color: #94a3b8;">Comment:</strong> Minor improvements, edge case suggestions
  </div>
</div>

</div>

</div>

**Key Principle**: Each layer provides overlapping protection. If one layer misses a vulnerability, subsequent layers catch it. This defense-in-depth approach is essential when using AI code generation.

---

## AI Agents in the Framework

Different AI agents excel at different phases of the SDLC. Choose the right tool for each task:

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">💬</div>
  <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">ChatGPT</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    <strong>Best for:</strong> Threat modeling, OWASP validation, metrics analysis
  </div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px; font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
    <strong>Phases:</strong> 1 (Design), 4 (Governance), 6 (Evolution)
  </div>
  <a href="/CHATGPT" style="color: #c7d2fe; text-decoration: underline; font-size: 14px;">→ See CHATGPT.md for prompts</a>
</div>

<div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">🧑‍💻</div>
  <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">GitHub Copilot</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    <strong>Best for:</strong> In-editor implementation, pattern following, boilerplate
  </div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px; font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
    <strong>Phases:</strong> 2 (Implementation), quick fixes
  </div>
  <a href="/COPILOT" style="color: #ddd6fe; text-decoration: underline; font-size: 14px;">→ See COPILOT.md for #codebase tips</a>
</div>

<div style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">🤖</div>
  <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Claude Code</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    <strong>Best for:</strong> Complex refactoring, test generation, multi-file changes
  </div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px; font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
    <strong>Phases:</strong> 3 (Verification), 6 (Evolution), debt reduction
  </div>
  <a href="/CLAUDE" style="color: #cffafe; text-decoration: underline; font-size: 14px;">→ See CLAUDE.md for workflows</a>
</div>

</div>

**Multi-Agent Strategy**: Use [AGENTS.md](/AGENTS) to coordinate multiple AI agents across phases — e.g., ChatGPT for threat model → Copilot for implementation → Claude for test generation.

---

## Success Metrics

Each framework component has measurable outcomes. Track these dashboards to monitor health:

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">🛡️</div>
  <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Security Metrics</div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.8; margin-bottom: 16px;">
    <strong>OWASP Coverage:</strong> 100% (target)<br/>
    <strong>Vuln Remediation:</strong> &lt;7 days<br/>
    <strong>Scan Pass Rate:</strong> &gt;90%<br/>
    <strong>Threats Found Pre-Code:</strong> 93%
  </div>
  <a href="/docs/prompts/owasp" style="color: #fca5a5; text-decoration: underline; font-size: 14px;">→ View OWASP dashboard</a>
</div>

<div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">🏗️</div>
  <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Quality Metrics</div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.8; margin-bottom: 16px;">
    <strong>Complexity:</strong> ≤10 per function<br/>
    <strong>Test Coverage:</strong> ≥80%<br/>
    <strong>Performance:</strong> p95 &lt;200ms<br/>
    <strong>Dependencies:</strong> &lt;90 days old
  </div>
  <a href="/docs/prompts/maintainability" style="color: #c7d2fe; text-decoration: underline; font-size: 14px;">→ View fitness function dashboard</a>
</div>

<div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">🎯</div>
  <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Threat Modeling Metrics</div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.8; margin-bottom: 16px;">
    <strong>STRIDE Coverage:</strong> 6/6 categories<br/>
    <strong>Time Saved:</strong> 4hrs per feature<br/>
    <strong>OWASP Mapping:</strong> 100% auto-linked<br/>
    <strong>Threats Identified:</strong> 93% pre-code
  </div>
  <a href="/docs/prompts/threat-modeling" style="color: #fdba74; text-decoration: underline; font-size: 14px;">→ View threat modeling dashboard</a>
</div>

<div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">⚡</div>
  <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Velocity Metrics</div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.8; margin-bottom: 16px;">
    <strong>Time to Delivery:</strong> &lt;5 days<br/>
    <strong>AI Acceptance Rate:</strong> &gt;85%<br/>
    <strong>Cycle Time:</strong> &lt;24 hours<br/>
    <strong>Prompt Reuse:</strong> &gt;70%
  </div>
  <div style="color: #d1fae5; font-size: 14px;">→ Track in your CI/CD pipeline</div>
</div>

</div>

**Key Insight**: Security and velocity metrics are not in conflict. When AI generates secure code from the start (using OWASP prompts), you save time on remediation and ship faster.

---

## Quick Start: First Feature in 1 Hour

Apply this framework to your next feature using this practical workflow:

<div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

<div style="display: grid; gap: 24px;">

<div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 20px; border-radius: 8px;">
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">⏱️ 5 min — Threat Model</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
    Ask ChatGPT: <em>"Run STRIDE analysis on [your feature]. Map threats to OWASP categories."</em>
  </div>
  <div style="background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 6px; font-size: 13px; color: #94a3b8;">
    <strong style="color: #f1f5f9;">You get:</strong> List of threats + which OWASP prompt packs to use
  </div>
</div>

<div style="background: rgba(124, 58, 237, 0.1); border-left: 4px solid #7c3aed; padding: 20px; border-radius: 8px;">
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">⏱️ 30 min — Implement Securely</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
    Open <a href="/docs/prompts/owasp" style="color: #a78bfa;">OWASP prompt pack</a> (e.g., A01, A03). Copy prompt into Copilot/Claude with your requirements.
  </div>
  <div style="background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 6px; font-size: 13px; color: #94a3b8;">
    <strong style="color: #f1f5f9;">You get:</strong> Code with security controls built in from the start
  </div>
</div>

<div style="background: rgba(14, 165, 233, 0.1); border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 8px;">
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">⏱️ 10 min — Validate Locally</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
    Run <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">npm run lint && npm test</code>. Tests should include attack payloads.
  </div>
  <div style="background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 6px; font-size: 13px; color: #94a3b8;">
    <strong style="color: #f1f5f9;">You get:</strong> Immediate feedback if security controls fail
  </div>
</div>

<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px;">
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">⏱️ 15 min — Human Review</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
    Review your own code using <a href="/docs/governance/vibe-golden-rules" style="color: #5eead4;">Golden Rules checklist</a>. Can you explain every line?
  </div>
  <div style="background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 6px; font-size: 13px; color: #94a3b8;">
    <strong style="color: #f1f5f9;">You get:</strong> Confidence that AI didn't introduce hidden issues
  </div>
</div>

</div>

<div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="color: #22c55e; font-size: 24px; font-weight: 700; margin-bottom: 8px;">✅ Ship to Production</div>
  <div style="color: #94a3b8; font-size: 14px;">CI/CD re-validates everything. Security monitoring tracks real attacks. You're done.</div>
</div>

</div>

**What You Just Learned**:
1. Threat modeling takes minutes with AI (not hours)
2. OWASP prompts prevent vulnerabilities before they're written
3. Automated + human checks catch what each other misses
4. The whole process is faster than traditional "write then fix" workflows

---

## Framework Resources

### Core Documentation
- **[SDLC Overview](/docs/sdlc/)** - 6-phase development lifecycle
- **[Maintainability Framework](/docs/maintainability/)** - Fitness functions and evolutionary architecture
- **[OWASP Prompt Packs](/docs/prompts/owasp/)** - Security-first prompts
- **[Maintainability Prompt Packs](/docs/prompts/maintainability/)** - Evolutionary architecture patterns

### Agent Guides
- **[COPILOT.md](/COPILOT.md)** - GitHub Copilot integration
- **[CHATGPT.md](/CHATGPT.md)** - ChatGPT workflows
- **[CLAUDE.md](/CLAUDE.md)** - Claude Code usage
- **[AGENTS.md](/AGENTS.md)** - Multi-agent orchestration

### Governance
- **[Golden Rules](/docs/governance/vibe-golden-rules)** - Core principles and AI governance

### Learning
- **[Workshop](/docs/workshop/)** - 8-part training modules
- **[Examples](/examples/owasp/)** - Hands-on OWASP remediation

---

**Ready to build secure, maintainable software with AI? Start with [Phase 1: Design →](/docs/sdlc/phase1-design)**
