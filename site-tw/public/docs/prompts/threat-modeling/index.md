# STRIDE Threat Modeling — AI-Powered Security Design

> **Threat modeling is security design done right**. STRIDE helps you systematically identify threats before writing code. When combined with AI assistants, threat modeling becomes accessible to every developer — not just security specialists.

---

## 🎯 Threat Detection Success Metrics

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(220, 38, 38, 0.3); border: 1px solid rgba(239, 68, 68, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">🎯</div>
    <div style="color: #f1f5f9; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Threats Found</div>
  </div>
  <div style="color: #f1f5f9; font-size: 40px; font-weight: 700; margin-bottom: 8px;">93%</div>
  <div style="color: #cbd5e1; font-size: 14px; margin-bottom: 8px;">Before code is written</div>
  <div style="color: #fca5a5; font-size: 12px;">AI-assisted threat modeling</div>
</div>

<div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(234, 88, 12, 0.3); border: 1px solid rgba(249, 115, 22, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">⚡</div>
    <div style="color: #f1f5f9; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Time Saved</div>
  </div>
  <div style="color: #f1f5f9; font-size: 40px; font-weight: 700; margin-bottom: 8px;">4hrs</div>
  <div style="color: #cbd5e1; font-size: 14px; margin-bottom: 8px;">Per feature threat model</div>
  <div style="color: #fdba74; font-size: 12px;">5min with AI vs 4h manual</div>
</div>

<div style="background: linear-gradient(135deg, #ca8a04 0%, #eab308 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(202, 138, 4, 0.3); border: 1px solid rgba(234, 179, 8, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">🛡️</div>
    <div style="color: #f1f5f9; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Coverage</div>
  </div>
  <div style="color: #f1f5f9; font-size: 40px; font-weight: 700; margin-bottom: 8px;">6/6</div>
  <div style="color: #cbd5e1; font-size: 14px; margin-bottom: 8px;">STRIDE categories analyzed</div>
  <div style="color: #fde047; font-size: 12px;">Complete threat coverage</div>
</div>

<div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(22, 163, 74, 0.3); border: 1px solid rgba(34, 197, 94, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="font-size: 32px;">📋</div>
    <div style="color: #f1f5f9; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">OWASP Mapped</div>
  </div>
  <div style="color: #f1f5f9; font-size: 40px; font-weight: 700; margin-bottom: 8px;">100%</div>
  <div style="color: #cbd5e1; font-size: 14px; margin-bottom: 8px;">Threats map to OWASP</div>
  <div style="color: #86efac; font-size: 12px;">Auto-linked to prompt packs</div>
</div>

</div>

---

## 🎯 Threat Modeling Process Overview

```mermaid
flowchart LR
    A[Design Feature] --> B[Create Architecture Diagram]
    B --> C[Apply STRIDE Analysis]
    C --> D[Identify Threats]
    D --> E[Map to OWASP]
    E --> F[Generate Mitigations]
    F --> G[Implement with AI]

    style A fill:#4f46e5,stroke:#6366f1,color:#f1f5f9
    style C fill:#dc2626,stroke:#ef4444,color:#f1f5f9
    style E fill:#ea580c,stroke:#f97316,color:#f1f5f9
    style G fill:#059669,stroke:#10b981,color:#f1f5f9
```

<div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(15, 23, 42, 0.5); border: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="text-align: center; color: #f1f5f9;">
    <div style="font-size: 48px; margin-bottom: 16px;">💡</div>
    <div style="font-size: 24px; font-weight: 700; margin-bottom: 12px;">Why Threat Model with AI?</div>
    <div style="font-size: 15px; color: #cbd5e1; line-height: 1.7; max-width: 700px; margin: 0 auto;">
      Traditional threat modeling requires security expertise and takes hours. With AI assistants like ChatGPT or Claude, you can generate comprehensive threat models in minutes. The AI knows STRIDE, understands common attack patterns, and can map threats to OWASP categories automatically. <strong style="color: #818cf8;">You provide the architecture, AI provides the security thinking.</strong>
    </div>
  </div>
</div>

---

## 📚 STRIDE Categories & Prompt Packs

**STRIDE** is Microsoft's mnemonic for six threat categories. Each prompt pack helps you use AI to identify threats in that category and maps them to OWASP mitigations:

| STRIDE Category | Common Threats | Primary OWASP | Secondary OWASP | Example Scenario |
|-----------------|----------------|---------------|-----------------|------------------|
| **[🎭 Spoofing Identity](./spoofing)** | Weak authentication, credential theft, session hijacking, token replay attacks | [A07 (Authentication)](/docs/prompts/owasp/A07_authn_failures) | [A02 (Crypto)](/docs/prompts/owasp/A02_crypto_failures) | User logs in but session token is predictable, allowing attackers to guess valid sessions |
| **[✏️ Tampering with Data](./tampering)** | SQL injection, parameter manipulation, man-in-the-middle attacks, unsigned artifacts | [A03 (Injection)](/docs/prompts/owasp/A03_injection) | [A08 (Integrity)](/docs/prompts/owasp/A08_integrity_failures) | Attacker modifies product price in POST request from $100 to $1, bypassing server validation |
| **[🙈 Repudiation](./repudiation)** | Missing audit logs, unauthenticated actions, log tampering, insufficient logging | [A09 (Logging)](/docs/prompts/owasp/A09_logging_monitoring) | — | Administrator deletes user account but no audit log records who performed the action or when |
| **[🔓 Information Disclosure](./information-disclosure)** | Exposed PII, verbose error messages, directory listing, insecure storage, IDOR | [A01 (Access Control)](/docs/prompts/owasp/A01_broken_access_control) | [A02 (Crypto)](/docs/prompts/owasp/A02_crypto_failures) | API returns full user object including password hash and SSN when only username is needed |
| **[💥 Denial of Service](./denial-of-service)** | Resource exhaustion, algorithmic complexity attacks, missing rate limits, unbounded queries | [A04 (Insecure Design)](/docs/prompts/owasp/A04_insecure_design) | [A05 (Misconfig)](/docs/prompts/owasp/A05_security_misconfig) | Search endpoint accepts regex with no timeout, attacker sends ReDoS pattern causing CPU spike |
| **[👑 Elevation of Privilege](./elevation-of-privilege)** | Missing authorization, insecure defaults, role confusion, vertical privilege escalation | [A01 (Access Control)](/docs/prompts/owasp/A01_broken_access_control) | [A07 (Authentication)](/docs/prompts/owasp/A07_authn_failures) | Regular user changes 'role=user' to 'role=admin' in JWT and gains admin access without validation |

**Quick Start**: New to threat modeling? Start with **[Spoofing Identity](./spoofing)** and **[Tampering with Data](./tampering)** — these cover the most common threats (authentication and injection attacks).

---

## 🏗️ Example: Threat Model with Architecture Diagram

Here's how to use AI to analyze an architecture and identify threats using STRIDE:

### Sample Architecture: E-commerce Checkout

```mermaid
flowchart TB
    User([User Browser]) -->|HTTPS| LB[Load Balancer]
    LB --> API[API Server]
    API -->|Query| DB[(Database)]
    API -->|Charge| Payment[Payment Gateway]
    API -->|Send| Email[Email Service]

    API -->|Log| Logs[(Log Storage)]
    API -->|Cache| Redis[(Redis Cache)]

    style User fill:#4f46e5,stroke:#6366f1,color:#f1f5f9
    style API fill:#dc2626,stroke:#ef4444,color:#f1f5f9
    style DB fill:#ea580c,stroke:#f97316,color:#f1f5f9
    style Payment fill:#059669,stroke:#10b981,color:#f1f5f9
```

### Threats Identified by AI (STRIDE Analysis)

<div style="background: rgba(220, 38, 38, 0.1); border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <div style="font-weight: 700; color: #dc2626; margin-bottom: 12px;">🎭 Spoofing: Session Hijacking at Load Balancer</div>
  <div style="color: #475569; font-size: 14px; line-height: 1.7;">
    <strong>Threat:</strong> If HTTPS is terminated at load balancer and backend uses HTTP, attacker on internal network can intercept session tokens.<br/>
    <strong>Mitigation:</strong> Use end-to-end TLS. Implement mutual TLS between LB and API. Use secure, HttpOnly, SameSite cookies.<br/>
    <strong>OWASP:</strong> <a href="/docs/prompts/owasp/A07_authn_failures">A07 - Authentication Failures</a>
  </div>
</div>

<div style="background: rgba(234, 88, 12, 0.1); border-left: 4px solid #ea580c; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <div style="font-weight: 700; color: #ea580c; margin-bottom: 12px;">✏️ Tampering: Price Manipulation in Checkout</div>
  <div style="color: #475569; font-size: 14px; line-height: 1.7;">
    <strong>Threat:</strong> If client sends product price to API, attacker can modify price parameter to pay $1 for $1000 product.<br/>
    <strong>Mitigation:</strong> Server-side price lookup from database. Validate cart total independently. Sign cart contents.<br/>
    <strong>OWASP:</strong> <a href="/docs/prompts/owasp/A04_insecure_design">A04 - Insecure Design</a>
  </div>
</div>

<div style="background: rgba(14, 165, 233, 0.1); border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <div style="font-weight: 700; color: #0ea5e9; margin-bottom: 12px;">🔓 Information Disclosure: Payment Token Exposure</div>
  <div style="color: #475569; font-size: 14px; line-height: 1.7;">
    <strong>Threat:</strong> If payment gateway tokens are logged or cached in Redis, sensitive card data could be exposed.<br/>
    <strong>Mitigation:</strong> Never log payment tokens. Use tokenization. Set short TTL on cached payment data. Encrypt sensitive cache values.<br/>
    <strong>OWASP:</strong> <a href="/docs/prompts/owasp/A02_crypto_failures">A02 - Cryptographic Failures</a>
  </div>
</div>

<div style="background: rgba(124, 58, 237, 0.1); border-left: 4px solid #7c3aed; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <div style="font-weight: 700; color: #7c3aed; margin-bottom: 12px;">💥 Denial of Service: Email Service Overload</div>
  <div style="color: #475569; font-size: 14px; line-height: 1.7;">
    <strong>Threat:</strong> Attacker places 1000 orders with fake payment, causing email service to exhaust rate limits and block legitimate emails.<br/>
    <strong>Mitigation:</strong> Rate limit orders per user. Verify payment before sending email. Use queue with circuit breaker for email service.<br/>
    <strong>OWASP:</strong> <a href="/docs/prompts/owasp/A04_insecure_design">A04 - Insecure Design</a>
  </div>
</div>

---

## 🎓 How to Use These Prompt Packs

### Step 1: Create Architecture Diagram
Draw your system components (frontend, API, database, external services) and data flows.

### Step 2: Select STRIDE Categories
Review which threat categories apply to your architecture. Usually, all six apply to some degree.

### Step 3: Use AI with Prompt Pack
Copy the relevant prompt pack (e.g., [Spoofing](./spoofing)), customize with your architecture details, and paste into ChatGPT or Claude.

### Step 4: Review AI Output
AI will generate a list of potential threats. Validate each one — is it realistic? Does it apply to your specific design?

### Step 5: Map to OWASP
For each threat, identify which OWASP category it falls under. Use the corresponding OWASP prompt pack to implement mitigations.

### Step 6: Document in Threat Model
Create a threat model document listing: Threat → STRIDE Category → OWASP Mapping → Mitigation → Status.

---

## 🔄 STRIDE to OWASP Workflow

STRIDE identifies *what* can go wrong. OWASP provides *how* to fix it:

1. **Design Phase**: Run STRIDE analysis with AI → identify threats (use table above)
2. **Implementation Phase**: Use OWASP prompt pack → implement mitigations
3. **Verification Phase**: Test with attack scenarios → validate controls

---

## 📖 Additional Resources

- **[OWASP Prompt Packs](/docs/prompts/owasp/)** — Implement mitigations for identified threats
- **[SDLC Framework](/docs/sdlc/)** — Integrate threat modeling into Phase 1 (Design)
- **[Microsoft STRIDE Docs](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)** — Official STRIDE documentation
- **[Threat Modeling Manifesto](https://www.threatmodelingmanifesto.org/)** — Industry best practices

---

<div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 40px; text-align: center; color: #f1f5f9; margin: 40px 0; border: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="font-size: 56px; margin-bottom: 16px;">🚀</div>
  <div style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">Ready to Threat Model with AI?</div>
  <div style="font-size: 16px; color: #cbd5e1; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">Pick a STRIDE category above and start generating threat models with ChatGPT or Claude. Remember: <strong style="color: #dc2626;">Threat modeling is security design done right.</strong></div>
  <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
    <a href="./spoofing" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #f1f5f9; padding: 16px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
      Start with Spoofing →
    </a>
    <a href="/docs/framework" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #f1f5f9; padding: 16px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
      View Full Framework →
    </a>
  </div>
</div>
