<div class="docs-hero docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/spade.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/prompts/owasp/">Prompts</a><span class="sep">/</span><span>OWASP</span></div>
    <div class="docs-eyebrow">Prompt packs · OWASP Top 10 (2021) <span class="docs-hero-meta">~4 min read</span></div>
    <h1 class="docs-hero-title">Security-first prompts for the Queen&rsquo;s court</h1>
    <p class="docs-hero-copy">Ten ready-to-use prompt packs &mdash; one per OWASP category &mdash; with attack vectors, controls, and review checklists. Drop them into Claude Code, Copilot, or ChatGPT and the agent starts from a secure contract.</p>
    <span class="docs-hero-flourish">A is for Access control. The Ace of Spades, always.</span>
  </div>
</div>

<div class="docs-card docs-card-muted">
  <div class="docs-copy"><strong>Where this fits:</strong> Use STRIDE prompts during design, then use these OWASP packs during implementation and review. The workshop introduces them in <a href="/docs/workshop/part2-security-prompting" class="markdown-link">Part 2</a> and applies them to real remediation in <a href="/docs/workshop/part3-live-remediation" class="markdown-link">Part 3</a>.</div>
</div>

---

## 🎯 OWASP Top 10 Security Coverage Dashboard

<div class="docs-grid docs-grid-compact">

<div class="docs-card docs-card-rose">
  <div class="docs-flex-block">
    <div class="docs-icon">🔐</div>
    <div class="docs-card-kicker">Access Control</div>
  </div>
  <div class="docs-heading">#1</div>
  <div class="docs-copy">Most critical web vulnerability</div>
  <div class="docs-copy">A01 · IDOR · Privilege Escalation</div>
</div>

<div class="docs-card docs-card-orange">
  <div class="docs-flex-block">
    <div class="docs-icon">🔒</div>
    <div class="docs-card-kicker">Cryptography</div>
  </div>
  <div class="docs-heading">#2</div>
  <div class="docs-copy">Password & data encryption</div>
  <div class="docs-copy">A02 · bcrypt · AES-256-GCM</div>
</div>

<div class="docs-card docs-card-amber">
  <div class="docs-flex-block">
    <div class="docs-icon">💉</div>
    <div class="docs-card-kicker">Injection</div>
  </div>
  <div class="docs-heading">#3</div>
  <div class="docs-copy">SQL, NoSQL, command injection</div>
  <div class="docs-copy">A03 · Parameterized Queries</div>
</div>

<div class="docs-card docs-card-emerald">
  <div class="docs-flex-block">
    <div class="docs-icon">✅</div>
    <div class="docs-card-kicker">Coverage</div>
  </div>
  <div class="docs-heading">10/10</div>
  <div class="docs-copy">Complete OWASP coverage</div>
  <div class="docs-copy">All categories · Ready to use</div>
</div>

</div>

<div class="docs-card docs-card-muted">
  <div class="docs-center-block">
    <div class="docs-icon">🛡️</div>
    <div class="docs-heading">Security-First AI Development</div>
    <div class="docs-copy">Every prompt pack follows RCTRO: Role → Context → Task → Requirements → Output</div>
    <div class="docs-flex-block">
      <div>
        <div class="docs-heading">10</div>
        <div class="docs-card-kicker">OWASP Categories</div>
      </div>
      <div>
        <div class="docs-heading">3</div>
        <div class="docs-card-kicker">AI Platforms</div>
      </div>
      <div>
        <div class="docs-heading">5</div>
        <div class="docs-card-kicker">Components/Pack</div>
      </div>
      <div>
        <div class="docs-heading">100%</div>
        <div class="docs-card-kicker">Human Review</div>
      </div>
    </div>
  </div>
</div>

---

## 🎯 How to Use These Prompt Packs

<div class="docs-grid docs-grid-compact">

<div class="docs-center-block">
  <div class="docs-icon">1️⃣</div>
  <div class="docs-heading">Select Category</div>
  <div class="docs-copy">Choose OWASP category for your security work</div>
</div>

<div class="docs-center-block">
  <div class="docs-icon">2️⃣</div>
  <div class="docs-heading">Customize Context</div>
  <div class="docs-copy">Adapt for your tech stack and constraints</div>
</div>

<div class="docs-center-block">
  <div class="docs-icon">3️⃣</div>
  <div class="docs-heading">Generate Code</div>
  <div class="docs-copy">Use Claude, Copilot, or ChatGPT</div>
</div>

<div class="docs-center-block">
  <div class="docs-icon">4️⃣</div>
  <div class="docs-heading">Human Review</div>
  <div class="docs-copy">Validate with provided checklist</div>
</div>

</div>

---

## 📚 OWASP Top 10 (2021) Prompt Packs

| Category | Focus | Common Vulnerability | Secure Pattern |
|----------|-------|---------------------|----------------|
| **[A01: Broken Access Control](A01_broken_access_control)** | RBAC/ABAC authorization, IDOR prevention | Missing authorization, horizontal/vertical privilege escalation | Deny-by-default with explicit role and ownership validation |
| **[A02: Cryptographic Failures](A02_crypto_failures)** | Password hashing, encryption at rest | Plain text passwords, weak hashing (MD5, SHA-1), hardcoded keys | bcrypt/Argon2 for passwords, AES-256-GCM for data |
| **[A03: Injection](A03_injection)** | SQL, NoSQL, command injection prevention | String concatenation in queries, unsanitized input | Parameterized queries, input validation with allowlist |
| **[A04: Insecure Design](A04_insecure_design)** | Threat modeling, secure architecture | Missing rate limiting, business logic bypasses | Threat model first, apply security patterns |
| **[A05: Security Misconfiguration](A05_security_misconfig)** | Security headers, CORS policies | Missing CSP/HSTS, overly permissive CORS, debug enabled | Secure defaults, principle of least privilege |
| **[A06: Vulnerable Components](A06_vuln_outdated)** | Dependency scanning, supply chain security | Outdated dependencies with CVEs, no SCA in CI | Lock files, automated scanning, 3-month update rule |
| **[A07: Authentication Failures](A07_authn_failures)** | Password policies, session management, MFA | Weak passwords, session fixation, missing MFA | bcrypt + high cost factor, rate limiting, MFA |
| **[A08: Integrity Failures](A08_integrity_failures)** | CI/CD security, code signing | Unsigned artifacts, compromised build pipeline | Signed commits, SLSA framework, hash verification |
| **[A09: Logging/Monitoring Failures](A09_logging_monitoring)** | Structured logging, PII redaction | No security event logging, PII in logs | Structured logs (JSON), PII redaction, alerting |
| **[A10: SSRF](A10_ssrf)** | URL validation, metadata protection | Unvalidated user URLs, access to cloud metadata | URL allowlist, deny private IPs, validate schemes |

**Quick Start**: New to OWASP? Start with **[A03: Injection](A03_injection)** (most common), then **[A01: Broken Access Control](A01_broken_access_control)** (most critical), followed by **[A07: Authentication Failures](A07_authn_failures)** (essential for login systems).

---

## 🔄 Security-First Development Workflow

<figure class="docs-visual">
  <img src="/images/diagrams/owasp-security-workflow.svg" alt="OWASP security-first workflow from threat modeling through prompt selection, AI generation, review, security checks, CI/CD, and deployment." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">OWASP prompt packs turn threat models into implementation constraints that can be reviewed and tested.</figcaption>
</figure>

**Key Stages**:
1. **Threat Modeling**: Identify OWASP categories that apply to your feature (STRIDE analysis)
2. **Select Pack**: Choose relevant prompt pack (A01-A10)
3. **Customize**: Adapt Context section for your tech stack (Node/Python/Java, etc.)
4. **Generate**: Use AI assistant (Claude/Copilot/ChatGPT) to generate secure code
5. **Review**: Apply human validation using provided checklist (trust but verify)
6. **Security Check**: Ensure all requirements met, no shortcuts taken
7. **CI/CD**: Automated scans (CodeQL, Snyk) validate in pipeline
8. **Deploy**: Ship to production with confidence

---

## 🛠️ Prompt Pack Structure

Each prompt pack follows the **RCTRO security-first pattern**:

```markdown
1. Role: Define the security engineer persona and OWASP category
2. Context: Tech stack, constraints, threat model
3. Task: Clear action — what to analyze, refactor, or implement
4. Requirements: Specific security controls with validation checkboxes
5. Output: Complete deliverables — file paths and executable code
```

**Why this structure works**:
- **Role** sets the security mindset for the AI
- **Context** prevents AI from making wrong assumptions about your stack
- **Task** provides a concrete, actionable starting point
- **Requirements** embed OWASP controls directly into generated code with validation criteria
- **Output** ensures complete, executable deliverables (not conceptual advice)

---

## 🎓 Learning Path

**New to OWASP?** Recommended learning path:

1. **[Workshop Part 2: Security-First Prompting](/docs/workshop/part2-security-prompting)** — Learn the RCTRO pattern
2. **[Workshop Part 3: Live Remediation](/docs/workshop/part3-live-remediation)** — Fix A03 SQL injection hands-on
3. **[A03: Injection](A03_injection)** → **[A01: Broken Access Control](A01_broken_access_control)** → **[A07: Authentication Failures](A07_authn_failures)**

**Advanced**: **[A04: Insecure Design](A04_insecure_design)** (threat modeling) · **[A08: Integrity Failures](A08_integrity_failures)** (CI/CD security) · **[Framework Guide](/docs/framework)** (STRIDE with LLMs)

---

## 💡 Customizing Prompt Packs for Your Stack

### Example: Adapting A03 for Python/Django

Original (Node/TypeScript):
```markdown
Context:
- Node 18 + TypeScript
- PostgreSQL using `pg` library
- Use parameterized queries with $1, $2 placeholders
```

Adapted (Python/Django):
```markdown
Context:
- Python 3.11 + Django 4.2
- PostgreSQL using Django ORM
- Use QuerySet methods (filter, exclude) — never raw SQL with string formatting
- If raw SQL required, use params argument
```

### Example: Adding Domain-Specific Constraints

For HIPAA-compliant healthcare app:
```markdown
Additional Requirements:
- PHI (Protected Health Information) must be encrypted at rest (AES-256-GCM)
- All PHI access must be logged to audit table with user ID, timestamp, action
- MRN format validation: ^\d{3}-\d{2}-\d{4}$
- Break-glass emergency access workflow required
```

---

## 🔄 Keeping Prompts Up to Date

OWASP releases a new Top 10 every 3-4 years. When a new version is published:

1. **Review the updated categories** — some may be merged/renamed/replaced
2. **Update prompt pack titles** to reference new OWASP year
3. **Add new categories** if introduced
4. **Deprecate removed categories** but keep for historical reference
5. **Update secure patterns** based on new attack vectors

**Current Version**: OWASP Top 10 (2021)
**Expected Next Release**: 2024/2025

---

## 📦 Downloading for Offline Use

```bash
# Clone the repository
git clone https://github.com/AliceNN-ucdenver/MaintainabilityAI.git
cd MaintainabilityAI

# Navigate to prompt packs (located in documentation site)
cd /docs/prompts/owasp

# Copy a prompt to clipboard (macOS)
cat A03_injection.md | pbcopy

# Copy a prompt to clipboard (Linux)
cat A03_injection.md | xclip -selection clipboard

# Copy a prompt to clipboard (Windows PowerShell)
Get-Content A03_injection.md | Set-Clipboard
```

**Note**: All prompt packs are stored at /docs/prompts/ to keep them synchronized with the online documentation.

---

## 🤝 Contributing

Found a security issue in a prompt pack? Have a better secure pattern?

1. **Open an issue** describing the security concern
2. **Submit a PR** with the fix and explanation
3. **Include test cases** demonstrating the vulnerability
4. **Reference OWASP documentation** supporting the change

**Please follow responsible disclosure** — don't include active exploit code.

---

## 📖 Additional Resources

- **[OWASP Top 10 Official Site](https://owasp.org/Top10/)** — Full documentation
- **[OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)** — Implementation guides
- **[Workshop Series](/docs/workshop/)** — Parts 1-4 available now, Parts 5-8 on the governance roadmap
- **[SDLC Integration](/docs/sdlc/)** — Embedding security in development lifecycle
- **[Framework Guide](/docs/framework)** — Evolutionary architecture + security

---

<div class="docs-center-block">
  <div class="docs-icon">🚀</div>
  <div class="docs-heading">Ready to Build Secure Software with AI?</div>
  <div class="docs-copy">Pick an OWASP category above and start generating secure code with your AI assistant. Remember: <strong class="docs-strong">AI generates, humans validate.</strong></div>
  <div class="docs-flex-block">
    <a href="A03_injection" class="docs-button-secondary">
      Start with A03: Injection →
    </a>
    <a href="/docs/framework" class="docs-button-secondary">
      View Full Framework →
    </a>
  </div>
</div>
