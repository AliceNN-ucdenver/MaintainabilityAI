# OWASP Top 10 (2021) — Security-First Prompt Packs

> **AI-powered secure development** starts with security-first prompts. This collection provides ready-to-use prompt packs for each OWASP Top 10 category, designed for Claude Code, GitHub Copilot, and ChatGPT.

---

## 🎯 How to Use These Prompt Packs

1. **Select the OWASP category** relevant to your security work
2. **Copy the prompt pack** for your AI tool (Claude Code, Copilot, or ChatGPT)
3. **Customize the Context section** with your tech stack and constraints
4. **Paste into your AI assistant** and let it generate secure code
5. **Apply human review** using the provided checklist

---

## 📚 OWASP Top 10 (2021) Prompt Packs

### [A01: Broken Access Control](./A01_broken_access_control)
**Focus**: RBAC/ABAC authorization, ownership checks, IDOR prevention

**Common Vulnerabilities**:
- Missing authorization checks
- Insecure direct object references (IDOR)
- Horizontal privilege escalation (accessing other users' data)
- Vertical privilege escalation (user → admin)

**Secure Pattern**: Deny-by-default with explicit role and ownership validation

**Use Cases**: User profile access, admin endpoints, resource ownership validation

---

### [A02: Cryptographic Failures](./A02_crypto_failures)
**Focus**: Password hashing, encryption at rest, TLS configuration

**Common Vulnerabilities**:
- Plain text passwords in database
- Weak hashing algorithms (MD5, SHA-1)
- Hardcoded encryption keys
- Missing TLS/SSL

**Secure Pattern**: bcrypt/Argon2 for passwords, AES-256-GCM for data, rotate keys

**Use Cases**: User registration, sensitive data storage, API key management

---

### [A03: Injection](./A03_injection)
**Focus**: SQL injection, NoSQL injection, command injection prevention

**Common Vulnerabilities**:
- String concatenation in SQL queries
- NoSQL operator injection ($where, $regex)
- OS command injection via unsanitized input
- LDAP/XPath injection

**Secure Pattern**: Parameterized queries, input validation with allowlist regex, ORM safe methods

**Use Cases**: Database queries, search functionality, user input processing

---

### [A04: Insecure Design](./A04_insecure_design)
**Focus**: Threat modeling, secure architecture patterns, business logic flaws

**Common Vulnerabilities**:
- Missing rate limiting
- Unrestricted resource consumption
- Business logic bypasses (coupon stacking, negative quantities)
- Missing security controls by design

**Secure Pattern**: Threat model first, apply security patterns (circuit breaker, rate limiter)

**Use Cases**: System architecture, API design, payment flows, authentication systems

---

### [A05: Security Misconfiguration](./A05_security_misconfig)
**Focus**: Security headers, CORS policies, debug mode toggles

**Common Vulnerabilities**:
- Default credentials unchanged
- Unnecessary features enabled
- Missing security headers (CSP, HSTS, X-Frame-Options)
- Overly permissive CORS
- Stack traces in production

**Secure Pattern**: Secure defaults, principle of least privilege, disable debug in production

**Use Cases**: Express/Fastify configuration, CORS setup, environment-specific configs

---

### [A06: Vulnerable and Outdated Components](./A06_vuln_outdated)
**Focus**: Dependency scanning, version pinning, supply chain security

**Common Vulnerabilities**:
- Outdated dependencies with known CVEs
- Unpinned versions in package.json
- No SCA (Software Composition Analysis) in CI
- Transitive dependencies with vulnerabilities

**Secure Pattern**: Lock files, automated scanning (Snyk, npm audit), 3-month update rule

**Use Cases**: Dependency management, CI/CD security gates, vulnerability remediation

---

### [A07: Identification and Authentication Failures](./A07_authn_failures)
**Focus**: Password policies, session management, MFA, credential storage

**Common Vulnerabilities**:
- Weak password requirements
- Session fixation
- Missing MFA
- Credential stuffing vulnerability
- Predictable session tokens

**Secure Pattern**: bcrypt + high cost factor, secure session tokens, rate limiting, MFA

**Use Cases**: User login, password reset, session management, OAuth integration

---

### [A08: Software and Data Integrity Failures](./A08_integrity_failures)
**Focus**: CI/CD pipeline security, code signing, supply chain attacks

**Common Vulnerabilities**:
- Unsigned artifacts
- Compromised build pipeline
- No integrity checks on dependencies
- Auto-merge without review
- Unsigned commits

**Secure Pattern**: Signed commits, SLSA framework, hash verification, artifact signing

**Use Cases**: CI/CD setup, package publishing, deployment pipelines

---

### [A09: Security Logging and Monitoring Failures](./A09_logging_monitoring)
**Focus**: Structured logging, PII redaction, security event detection

**Common Vulnerabilities**:
- No logging of security events (login failures, access control failures)
- PII in logs
- No alerting on suspicious activity
- Logs not retained long enough

**Secure Pattern**: Structured logs (JSON), PII redaction, centralized logging, alerting

**Use Cases**: Application logging, security monitoring, incident response

---

### [A10: Server-Side Request Forgery (SSRF)](./A10_ssrf)
**Focus**: URL validation, allowlist egress, metadata protection

**Common Vulnerabilities**:
- Unvalidated user-supplied URLs
- Access to cloud metadata endpoints (169.254.169.254)
- Internal network scanning
- DNS rebinding attacks

**Secure Pattern**: URL allowlist, deny private IPs, validate schemes (http/https only)

**Use Cases**: Webhook processing, URL fetching, image proxies, PDF generation

---

## 🛠️ Prompt Pack Structure

Each prompt pack follows the **5-component security-first pattern**:

```markdown
1. Role: Define the security engineer persona and OWASP category
2. Context: Tech stack, constraints, threat model
3. Requirements: Specific security controls to implement
4. Task: Step-by-step implementation instructions
5. Checklist: Validation criteria for human review
```

**Why this structure works**:
- **Role** sets the security mindset for the AI
- **Context** prevents AI from making wrong assumptions about your stack
- **Requirements** embed OWASP controls directly into generated code
- **Task** provides concrete, actionable steps
- **Checklist** guides human review (trust but verify)

---

## 🎓 Learning Path

**New to OWASP?** Start here:

1. **[Workshop Part 2: Security-First Prompting](/docs/workshop/part2-security-prompting)** — Learn the 5-component pattern
2. **[Workshop Part 3: Live Remediation](/docs/workshop/part3-live-remediation)** — Fix A03 SQL injection hands-on
3. **[A03: Injection](./A03_injection)** — Most common vulnerability, best place to start
4. **[A01: Broken Access Control](./A01_broken_access_control)** — Critical for multi-user apps
5. **[A07: Authentication Failures](./A07_authn_failures)** — Essential for login systems

**Advanced Topics**:
- **[A04: Insecure Design](./A04_insecure_design)** — Learn threat modeling and secure architecture
- **[A08: Integrity Failures](./A08_integrity_failures)** — Secure your CI/CD pipeline
- **[Framework Guide](/docs/framework)** — STRIDE threat modeling with LLMs

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

# Access all prompt packs
cd prompts/owasp

# Copy a prompt to clipboard (macOS)
cat A03_injection.md | pbcopy

# Copy a prompt to clipboard (Linux)
cat A03_injection.md | xclip -selection clipboard

# Copy a prompt to clipboard (Windows PowerShell)
Get-Content A03_injection.md | Set-Clipboard
```

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
- **[Workshop Series](/docs/workshop/)** — 8-part hands-on training
- **[SDLC Integration](/docs/sdlc/)** — Embedding security in development lifecycle
- **[Framework Guide](/docs/framework)** — Evolutionary architecture + security

---

**Ready to start?** Pick an OWASP category above and copy the prompt pack for your AI assistant. Remember: **AI generates, humans validate.**
