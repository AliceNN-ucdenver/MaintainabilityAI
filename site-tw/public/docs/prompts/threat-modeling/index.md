<div class="docs-hero docs-hero-amber">
  <div class="docs-hero-glyph"><img src="/images/glyphs/magnifier.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/prompts/owasp/">Prompts</a><span class="sep">/</span><span>STRIDE</span></div>
    <div class="docs-eyebrow">Prompt packs · STRIDE <span class="docs-hero-meta">~4 min read</span></div>
    <h1 class="docs-hero-title">Looking for threats before they look for you</h1>
    <p class="docs-hero-copy">Six categories &mdash; Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege &mdash; turned into AI prompts your designers can run before the first commit.</p>
    <span class="docs-hero-flourish">&ldquo;If you don&rsquo;t know where you&rsquo;re going, every road leads to a breach.&rdquo;</span>
  </div>
</div>

<div class="docs-card docs-card-orange">
  <div class="docs-copy"><strong>Where this fits:</strong> STRIDE is the design entry point. Use it in <a href="/docs/sdlc/phase1-design" class="markdown-link">SDLC Phase 1</a> to identify threats, then map those threats to <a href="/docs/prompts/owasp/" class="markdown-link">OWASP prompt packs</a> before implementation.</div>
</div>

---

## 🎯 Threat Detection Success Metrics

<div class="docs-grid docs-grid-compact">

<div class="docs-card docs-card-rose">
  <div class="docs-flex-block">
    <div class="docs-icon">🎯</div>
    <div class="docs-card-kicker">Threats Found</div>
  </div>
  <div class="docs-heading">93%</div>
  <div class="docs-copy">Before code is written</div>
  <div class="docs-copy">AI-assisted threat modeling</div>
</div>

<div class="docs-card docs-card-orange">
  <div class="docs-flex-block">
    <div class="docs-icon">⚡</div>
    <div class="docs-card-kicker">Time Saved</div>
  </div>
  <div class="docs-heading">4hrs</div>
  <div class="docs-copy">Per feature threat model</div>
  <div class="docs-copy">5min with AI vs 4h manual</div>
</div>

<div class="docs-card docs-card-amber">
  <div class="docs-flex-block">
    <div class="docs-icon">🛡️</div>
    <div class="docs-card-kicker">Coverage</div>
  </div>
  <div class="docs-heading">6/6</div>
  <div class="docs-copy">STRIDE categories analyzed</div>
  <div class="docs-copy">Complete threat coverage</div>
</div>

<div class="docs-card docs-card-emerald">
  <div class="docs-flex-block">
    <div class="docs-icon">📋</div>
    <div class="docs-card-kicker">OWASP Mapped</div>
  </div>
  <div class="docs-heading">100%</div>
  <div class="docs-copy">Threats map to OWASP</div>
  <div class="docs-copy">Auto-linked to prompt packs</div>
</div>

</div>

---

## 🎯 Threat Modeling Process Overview

<figure class="docs-visual">
  <img src="/images/diagrams/stride-threat-modeling.svg" alt="STRIDE workflow from feature design through architecture diagram, threat analysis, OWASP mapping, mitigations, and AI implementation." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">STRIDE gives AI-assisted threat modeling a repeatable path from architecture to mitigation.</figcaption>
</figure>

<div class="docs-card docs-card-muted">
  <div class="docs-center-block">
    <div class="docs-icon">💡</div>
    <div class="docs-heading">Why Threat Model with AI?</div>
    <div class="docs-copy">
      Traditional threat modeling requires security expertise and takes hours. With AI assistants like ChatGPT or Claude, you can generate comprehensive threat models in minutes. The AI knows STRIDE, understands common attack patterns, and can map threats to OWASP categories automatically. <strong class="docs-strong">You provide the architecture, AI provides the security thinking.</strong>
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

<figure class="docs-visual">
  <img src="/images/diagrams/checkout-architecture.svg" alt="E-commerce checkout architecture with browser, load balancer, API server, database, payment, email, logs, and cache." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">A clear architecture picture gives threat modeling enough context to be useful.</figcaption>
</figure>

### Threats Identified by AI (STRIDE Analysis)

<div class="docs-card docs-card-rose">
  <div class="docs-heading">🎭 Spoofing: Session Hijacking at Load Balancer</div>
  <div class="docs-muted">
    <strong>Threat:</strong> If HTTPS is terminated at load balancer and backend uses HTTP, attacker on internal network can intercept session tokens.<br/>
    <strong>Mitigation:</strong> Use end-to-end TLS. Implement mutual TLS between LB and API. Use secure, HttpOnly, SameSite cookies.<br/>
    <strong>OWASP:</strong> <a href="/docs/prompts/owasp/A07_authn_failures">A07 - Authentication Failures</a>
  </div>
</div>

<div class="docs-card docs-card-orange">
  <div class="docs-heading">✏️ Tampering: Price Manipulation in Checkout</div>
  <div class="docs-muted">
    <strong>Threat:</strong> If client sends product price to API, attacker can modify price parameter to pay $1 for $1000 product.<br/>
    <strong>Mitigation:</strong> Server-side price lookup from database. Validate cart total independently. Sign cart contents.<br/>
    <strong>OWASP:</strong> <a href="/docs/prompts/owasp/A04_insecure_design">A04 - Insecure Design</a>
  </div>
</div>

<div class="docs-card docs-card-cyan">
  <div class="docs-heading">🔓 Information Disclosure: Payment Token Exposure</div>
  <div class="docs-muted">
    <strong>Threat:</strong> If payment gateway tokens are logged or cached in Redis, sensitive card data could be exposed.<br/>
    <strong>Mitigation:</strong> Never log payment tokens. Use tokenization. Set short TTL on cached payment data. Encrypt sensitive cache values.<br/>
    <strong>OWASP:</strong> <a href="/docs/prompts/owasp/A02_crypto_failures">A02 - Cryptographic Failures</a>
  </div>
</div>

<div class="docs-card docs-card-indigo">
  <div class="docs-heading">💥 Denial of Service: Email Service Overload</div>
  <div class="docs-muted">
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
Open the relevant prompt pack (e.g., [Spoofing](./spoofing)) and use it with Claude Code, Copilot, or ChatGPT — customize the architecture context for your project.

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

<div class="docs-center-block">
  <div class="docs-icon">🚀</div>
  <div class="docs-heading">Ready to Threat Model with AI?</div>
  <div class="docs-copy">Pick a STRIDE category above and start generating threat models with ChatGPT or Claude. Remember: <strong class="docs-strong">Threat modeling is security design done right.</strong></div>
  <div class="docs-flex-block">
    <a href="./spoofing" class="docs-button-secondary">
      Start with Spoofing →
    </a>
    <a href="/docs/framework" class="docs-button-secondary">
      View Full Framework →
    </a>
  </div>
</div>
