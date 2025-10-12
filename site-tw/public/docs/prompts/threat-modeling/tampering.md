# STRIDE: Tampering with Data — Threat Modeling Prompt Pack

> **Tampering** is malicious modification of data or code in transit or at rest. This STRIDE category focuses on integrity failures where attackers alter application logic, user data, or system configurations without authorization.

---

## 🎯 What is Tampering?

**Definition**: An attacker modifies data, files, or code that they should not have permission to change. Tampering threatens **data integrity** — the assurance that information has not been altered in unauthorized ways.

**Common Tampering Attack Vectors**:
- **SQL Injection**: Manipulating database queries to modify data
- **Parameter Tampering**: Changing form fields, URL parameters, or API payloads
- **Man-in-the-Middle**: Intercepting and modifying network traffic
- **Code Injection**: Inserting malicious commands into application inputs
- **File Manipulation**: Modifying configuration files, binaries, or artifacts

**Why It Matters**: Successful tampering attacks can modify prices in e-commerce transactions, escalate privileges by changing user roles, corrupt databases, or inject backdoors into deployed code. Without integrity controls, you cannot trust that data means what it claims to mean.

---

## 🔗 Maps to OWASP

**Primary**: [A03 - Injection](/docs/prompts/owasp/A03_injection) (SQL, command, LDAP injection)
**Secondary**: [A08 - Software and Data Integrity Failures](/docs/prompts/owasp/A08_integrity_failures) (unsigned code, unverified updates)

---

## 🤖 AI Prompt: Identify Tampering Threats in Architecture

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into ChatGPT, Claude, or GitHub Copilot Chat:**

```
Role: You are a security architect specializing in data integrity and secure coding. Your task is to perform STRIDE threat modeling focusing on Tampering (T) threats.

Context:
I have the following architecture:

[PASTE YOUR ARCHITECTURE DIAGRAM OR DESCRIPTION HERE]

Example:
- React SPA with client-side form validation
- Node.js REST API accepting JSON payloads
- PostgreSQL database with user-generated content
- S3 bucket for file uploads
- CI/CD pipeline deploying from GitHub Actions
- Third-party JavaScript libraries from CDN
- Mobile app with local SQLite storage

Task:
Analyze this architecture for Tampering threats. For each data flow, storage location, and trust boundary, identify where an attacker could modify data or code without authorization.

Format:
For each threat, provide:

**Threat**: [One-line description]
**Component**: [Which part of the system is vulnerable]
**Attack Scenario**: [Step-by-step attack walkthrough]
**Impact**: [What happens if successful — data corruption, privilege escalation, etc.]
**Likelihood**: [High/Medium/Low based on common attacker capabilities]
**Mitigation**: [Specific controls to prevent or detect this attack]
**OWASP Mapping**: [A03, A08, etc.]
**Code Example**: [Show vulnerable pattern and secure fix]

Focus Areas:
Pay special attention to:
- Database queries (SQL injection, NoSQL injection)
- User input handling (form fields, URL parameters, JSON payloads)
- File uploads and processing
- API request/response modification
- Client-side data validation (easily bypassed)
- Code deployment and artifact integrity (unsigned binaries, CDN tampering)
- Local storage and caching mechanisms
- Inter-service communication (message queues, webhooks)

Output:
Provide 3-5 high-priority tampering threats with complete details. Prioritize threats that are both likely and high-impact.
```

</div>

---

## 📋 Example AI Output

### Threat 1: SQL Injection via Unsanitized Search Query

**Threat**: Attacker injects malicious SQL to modify database records

**Component**: `/api/users/search` endpoint

**Attack Scenario**:
1. User enters search term: `admin'; UPDATE users SET role='admin' WHERE username='attacker'--`
2. Backend concatenates input directly into SQL query
3. Database executes: `SELECT * FROM users WHERE username='admin'; UPDATE users SET role='admin' WHERE username='attacker'--'`
4. Attacker's account is now admin
5. Attacker gains full system access

**Impact**: Complete database compromise. Attacker can modify any data, delete records, or escalate privileges to administrator.

**Likelihood**: High (SQL injection is well-documented and widely attempted)

**Mitigation**:
```typescript
// BAD: String concatenation vulnerable to injection
app.get("/api/users/search", (req, res) => {
  const query = `SELECT * FROM users WHERE username='${req.query.username}'`;
  db.query(query, (err, results) => res.json(results));
});

// GOOD: Parameterized query with validation
import { z } from "zod";

const searchSchema = z.object({
  username: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Alphanumeric only")
});

app.get("/api/users/search", async (req, res) => {
  // Validate input
  const { username } = searchSchema.parse(req.query);

  // Use parameterized query
  const results = await db.query(
    "SELECT id, username, email FROM users WHERE username = $1",
    [username] // Driver escapes this safely
  );

  res.json(results);
});
```

Additional controls:
- Use ORMs (TypeORM, Prisma) that parameterize by default
- Principle of least privilege: query user has SELECT only, no UPDATE/DELETE
- Input validation with allowlists (reject special SQL characters)
- Web Application Firewall (WAF) with SQL injection rules

**OWASP Mapping**: A03 - Injection

---

### Threat 2: Price Manipulation via Client-Side Parameter Tampering

**Threat**: Attacker modifies product price in checkout request

**Component**: `/api/orders/checkout` endpoint

**Attack Scenario**:
1. User adds $100 product to cart
2. Frontend sends POST request: `{"productId": 123, "price": 100}`
3. Attacker intercepts with Burp Suite, changes to: `{"productId": 123, "price": 1}`
4. Backend trusts client-provided price and processes order for $1
5. Attacker purchases $100 product for $1

**Impact**: Financial loss. Attacker can buy products at arbitrary prices, causing direct revenue impact.

**Likelihood**: High (easy to intercept HTTPS with browser DevTools or proxy)

**Mitigation**:
```typescript
// BAD: Trust client-provided price
app.post("/api/orders/checkout", async (req, res) => {
  const { productId, price } = req.body;
  await processPayment(price); // Uses attacker's price!
  res.json({ success: true });
});

// GOOD: Always fetch authoritative price from database
app.post("/api/orders/checkout", async (req, res) => {
  const { productId, quantity } = req.body;

  // Fetch price from server-side source of truth
  const product = await db.query(
    "SELECT price FROM products WHERE id = $1",
    [productId]
  );

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Calculate price server-side
  const totalPrice = product.price * quantity;

  // Log for forensics
  logger.info("Checkout", { productId, quantity, totalPrice, userId: req.user.id });

  await processPayment(totalPrice);
  res.json({ success: true, charged: totalPrice });
});
```

Additional controls:
- Never trust client-provided prices, quantities, or discounts
- Validate all business logic server-side
- Use read-only product catalog (prevent price modification)
- Monitor for anomalous pricing patterns (orders under $X threshold)

**OWASP Mapping**: A03 - Injection, A04 - Insecure Design

---

### Threat 3: Unsigned Artifact Tampering in CI/CD Pipeline

**Threat**: Attacker modifies deployment artifact to inject backdoor

**Component**: CI/CD pipeline deploying Docker images from registry

**Attack Scenario**:
1. Build pipeline creates Docker image and pushes to registry
2. Image is not signed or verified
3. Attacker compromises registry credentials
4. Attacker pushes malicious image with same tag (e.g., `app:latest`)
5. Deployment pulls and runs compromised image with backdoor
6. Attacker gains persistent access to production

**Impact**: Complete system compromise. Attacker has code execution in production environment.

**Likelihood**: Medium (requires registry access, but supply chain attacks are increasing)

**Mitigation**:
```yaml
# BAD: No signature verification
deploy:
  image: docker:latest
  script:
    - docker pull myregistry/app:latest
    - docker run myregistry/app:latest

# GOOD: Sign images and verify signatures
build:
  image: docker:latest
  script:
    # Sign image with Cosign (Sigstore)
    - docker build -t myregistry/app:${CI_COMMIT_SHA} .
    - docker push myregistry/app:${CI_COMMIT_SHA}
    - cosign sign --key cosign.key myregistry/app:${CI_COMMIT_SHA}

deploy:
  image: docker:latest
  script:
    # Verify signature before deployment
    - cosign verify --key cosign.pub myregistry/app:${CI_COMMIT_SHA}
    - docker pull myregistry/app:${CI_COMMIT_SHA}
    - docker run myregistry/app:${CI_COMMIT_SHA}
  only:
    - main
```

Additional controls:
- Use immutable tags (SHA-256 digest, not `latest`)
- Enable Docker Content Trust (DCT) for signature enforcement
- Implement admission controllers (Kubernetes OPA/Gatekeeper) to block unsigned images
- Audit registry access logs for unauthorized pushes
- Use private registries with role-based access control

**OWASP Mapping**: A08 - Software and Data Integrity Failures

---

## ✅ Human Review Checklist

After AI generates tampering threats, validate each finding before implementing mitigations. Here's what to verify:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 💉 Input Validation and Injection Prevention

All user inputs must be validated against strict schemas defining type, length, format, and allowed characters. Use allowlist validation (accept only known-good patterns) rather than blocklist (reject known-bad patterns). Database queries must use parameterized statements or prepared statements, never string concatenation. Check that special characters are properly escaped in all contexts: SQL, HTML, JavaScript, shell commands, LDAP queries.

**Test it**: Submit SQL injection payloads like `' OR '1'='1` to all input fields and verify they're rejected or safely escaped. Use sqlmap to test database endpoints.

---

### 🔒 Server-Side Business Logic Enforcement

Never trust client-provided data for security or business decisions. All prices, quantities, permissions, and calculations must be performed server-side using authoritative data sources. The server should fetch product prices from the database, not accept them from the client. User roles and permissions must be validated on every request using server-side session data, not client-provided tokens.

**Test it**: Use browser DevTools or Burp Suite to modify request payloads. Change prices to $0, quantities to negative numbers, or user IDs to other accounts. Verify the server rejects invalid values.

---

### 📝 Code and Artifact Integrity

All deployed code, container images, and dependencies must be signed with cryptographic signatures. The deployment pipeline should verify signatures before running any artifact. Use SHA-256 checksums for file integrity verification. Third-party JavaScript libraries loaded from CDNs must include Subresource Integrity (SRI) hashes. Package lockfiles (package-lock.json, yarn.lock) must be committed to prevent dependency tampering.

**Test it**: Attempt to deploy an unsigned artifact and verify it's rejected. Check that HTML includes SRI hashes for CDN scripts. Modify a dependency and confirm the lockfile detects the change.

---

### 🔐 Transport Security and MITM Prevention

All communication between components must use TLS 1.3 with strong cipher suites. Certificate validation must be enforced (no certificate warnings ignored). APIs should implement certificate pinning for mobile apps to prevent MITM attacks. Webhook receivers should validate sender signatures (HMAC) to prevent payload tampering. Internal microservices should use mutual TLS for authentication.

**Test it**: Use mitmproxy to intercept traffic and attempt to modify requests. Verify TLS connections fail if certificate is invalid. Check that webhook payloads include HMAC signatures.

---

### 🗄️ Database Access Controls

Database accounts used by the application should have minimal privileges. The query user should have only SELECT permission on most tables, with UPDATE/DELETE/INSERT restricted to specific tables. Use separate database accounts for different microservices. Enable database audit logging to track all modifications. Implement database triggers to prevent unauthorized updates to critical fields like user.role or product.price.

**Test it**: Attempt to execute UPDATE or DELETE statements through the application. Verify only SELECT queries succeed for read-only endpoints. Review database user permissions.

---

### 📦 File Upload Security

All file uploads must be validated by type (check magic bytes, not file extension), size (enforce maximum), and content (scan for malware). Store uploaded files outside the web root with randomized names. Never execute uploaded files or eval their contents. Implement Content Security Policy (CSP) to prevent execution of uploaded scripts. Scan uploads with antivirus before saving.

**Test it**: Upload a file with double extension like `malware.jpg.php` and verify it's rejected or stored safely. Upload an SVG with embedded JavaScript and confirm it doesn't execute.

---

### 🔍 Logging and Change Detection

All data modifications must be logged with who, what, when, where details. Use immutable audit logs stored in a separate system (cannot be modified by application). Implement file integrity monitoring (FIM) to detect unauthorized changes to critical files. Database should have row-level versioning or audit tables tracking all changes.

**Validate**: Review audit logs after making data changes. Verify logs include user ID, timestamp, old value, new value, and IP address. Test that logs are append-only.

---

### 🔬 Threat Scenario Realism

For each AI-generated threat, verify the attack scenario is technically feasible. Check that the impact assessment is accurate and specific. Validate that mitigations address the root cause (not just symptoms). Ensure code examples show both vulnerable and secure patterns. Verify OWASP mappings are correct.

**Red flags**: Threats that assume unrealistic attacker access, mitigations that break legitimate functionality, or scenarios that don't match your actual tech stack.

</div>

---

## 🔄 Next Steps

1. **Use the AI prompt** with ChatGPT or Claude to analyze your architecture
2. **Review generated threats** using the checklist above
3. **Prioritize by risk** — focus on high-likelihood, high-impact threats first
4. **Implement mitigations** using [OWASP A03](/docs/prompts/owasp/A03_injection) and [A08](/docs/prompts/owasp/A08_integrity_failures) prompt packs
5. **Test controls** — use Burp Suite, sqlmap, or penetration testing to verify
6. **Document decisions** — record accepted risks and compensating controls
7. **Move to next STRIDE category** → [Repudiation](repudiation)

---

## 📖 Additional Resources

- **[OWASP A03: Injection](/docs/prompts/owasp/A03_injection)** — SQL injection prevention
- **[OWASP A08: Integrity Failures](/docs/prompts/owasp/A08_integrity_failures)** — Signing and verification
- **[OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)** — Best practices

---

**Remember**: Tampering is prevented by validating inputs, authorizing changes, and verifying integrity. Never trust data you didn't create or cryptographically verify.
