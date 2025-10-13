# STRIDE: Information Disclosure — Threat Modeling Prompt Pack

> **Information Disclosure** is exposing sensitive data to unauthorized parties. This STRIDE category focuses on confidentiality failures where systems leak personally identifiable information (PII), credentials, business secrets, or technical details that aid attackers.

---

## 🎯 What is Information Disclosure?

**Definition**: An attacker gains access to information they should not be able to see. Information disclosure threatens **confidentiality** — the assurance that data is accessible only to authorized parties.

**Common Information Disclosure Attack Vectors**:
- **Broken Access Control**: IDOR vulnerabilities allowing access to other users' data
- **Verbose Error Messages**: Stack traces exposing file paths, database schemas, credentials
- **Insecure Storage**: Unencrypted databases, plaintext secrets in environment files
- **Oversharing APIs**: Endpoints returning more data fields than necessary
- **Cryptographic Failures**: Weak encryption, exposed keys, plaintext transmission

**Why It Matters**: Disclosed information fuels further attacks. Exposed PII enables identity theft and phishing. Leaked credentials grant unauthorized access. Technical details (stack traces, version numbers) help attackers craft targeted exploits. Confidentiality breaches violate regulations (GDPR, HIPAA, PCI DSS) and damage customer trust.

---

## 🔗 Maps to OWASP

**Primary**: [A01 - Broken Access Control](/docs/prompts/owasp/A01_broken_access_control) (IDOR, unauthorized data access)
**Secondary**: [A02 - Cryptographic Failures](/docs/prompts/owasp/A02_crypto_failures) (unencrypted data, weak crypto)

---

## 🤖 AI Prompt: Identify Information Disclosure Threats in Architecture

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into ChatGPT, Claude, or GitHub Copilot Chat:**

```
Role: You are a security architect specializing in data privacy, access control, and cryptography. Your task is to perform STRIDE threat modeling focusing on Information Disclosure (I) threats.

Context:
I have the following architecture:

[PASTE YOUR ARCHITECTURE DIAGRAM OR DESCRIPTION HERE]

Example:
- React SPA fetching user profile data
- Node.js REST API with JWT authentication
- PostgreSQL database storing PII (SSN, credit cards, health records)
- S3 bucket with user-uploaded documents
- Redis cache for session data
- Third-party analytics service receiving user events
- Error messages displayed to users in production
- Database backups stored unencrypted in S3

Task:
Analyze this architecture for Information Disclosure threats. For each data store, API endpoint, and trust boundary, identify where sensitive data could be exposed to unauthorized parties.

Format:
For each threat, provide:

**Threat**: [One-line description]
**Component**: [Which part of the system is vulnerable]
**Attack Scenario**: [Step-by-step attack walkthrough]
**Impact**: [What happens if successful — PII breach, credential theft, regulatory violation, etc.]
**Likelihood**: [High/Medium/Low based on common attacker capabilities]
**Mitigation**: [Specific controls to prevent or detect this attack]
**OWASP Mapping**: [A01, A02, etc.]
**Code Example**: [Show vulnerable pattern and secure fix]

Focus Areas:
Pay special attention to:
- API endpoints returning user data (check for IDOR, over-fetching)
- Error messages and exception handling (stack traces, SQL errors)
- Data at rest (databases, file storage, backups, cache)
- Data in transit (HTTP vs HTTPS, TLS configuration)
- Logging (ensure PII/secrets aren't logged)
- Third-party integrations (what data is shared externally)
- Access control checks (who can see what)
- Encryption keys and secrets management

Output:
Provide 3-5 high-priority information disclosure threats with complete details. Prioritize threats with highest privacy impact.
```

</div>

---

## 📋 Example AI Output

### Threat 1: IDOR Vulnerability Exposing User PII

**Threat**: Attacker accesses other users' personal data by manipulating resource IDs

**Component**: `/api/users/:userId/profile` endpoint

**Attack Scenario**:
1. Authenticated user logs in and views their profile: `GET /api/users/123/profile`
2. Attacker changes URL to `GET /api/users/124/profile`
3. API returns other user's profile including SSN, address, phone number
4. Attacker iterates through IDs 1-10000 to scrape all user data
5. Attacker sells PII database on dark web

**Impact**: Mass privacy breach affecting all users. GDPR violation (up to 4% revenue fine). Identity theft risk. Reputational damage and loss of customer trust.

**Likelihood**: High (IDOR is common and easy to exploit)

**Mitigation**:
```typescript
// BAD: No authorization check, trusts URL parameter
app.get("/api/users/:userId/profile", isAuthenticated, async (req, res) => {
  const profile = await db.query(
    "SELECT * FROM users WHERE id = $1",
    [req.params.userId]
  );
  res.json(profile); // Returns other users' data!
});

// GOOD: Verify requesting user owns the resource
app.get("/api/users/:userId/profile", isAuthenticated, async (req, res) => {
  const requestedUserId = parseInt(req.params.userId);

  // Authorization: verify user can only access their own profile
  if (req.user.id !== requestedUserId) {
    logger.warn({
      event: "idor_attempt",
      requestingUser: req.user.id,
      targetUser: requestedUserId,
      ip: req.ip
    });

    return res.status(403).json({
      error: "Forbidden"
    });
  }

  // Fetch only necessary fields (principle of least privilege)
  const profile = await db.query(
    "SELECT id, username, email, display_name FROM users WHERE id = $1",
    [requestedUserId]
  );

  if (!profile) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(profile);
});
```

Additional controls:
- Implement centralized authorization middleware checking resource ownership
- Use UUIDs instead of sequential integers for resource IDs
- Rate limit API endpoints to slow down scraping (100 requests/hour)
- Alert on suspicious patterns (accessing many user IDs in short time)
- Never return sensitive fields (SSN, credit card) unless absolutely necessary

**OWASP Mapping**: A01 - Broken Access Control

---

### Threat 2: Verbose Error Messages Exposing Database Schema

**Threat**: Production error messages leak technical details aiding attackers

**Component**: Global error handler in Express API

**Attack Scenario**:
1. Attacker sends malformed request: `GET /api/products?id=abc`
2. Database throws error: `Invalid input syntax for type integer: "abc"`
3. API returns full stack trace to attacker:
   ```
   Error: column "id" is of type integer but expression is of type text
   at Connection.parseE (/app/node_modules/pg/lib/connection.js:614:13)
   at /app/src/database/queries.js:42:15
   ```
4. Attacker learns database is PostgreSQL, file structure, and query patterns
5. Attacker crafts targeted SQL injection attack using schema knowledge

**Impact**: Technical information disclosure enables more sophisticated attacks. Reveals technology stack, file paths, and potential vulnerabilities.

**Likelihood**: High (verbose errors in production are common oversight)

**Mitigation**:
```typescript
// BAD: Expose full error details to client
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack, // Never expose in production!
    query: err.query  // Exposes database structure
  });
});

// GOOD: Generic errors to client, detailed logs server-side
app.use((err, req, res, next) => {
  // Log full error details server-side for debugging
  logger.error({
    event: "unhandled_error",
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code
    },
    request: {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      ip: req.ip
    },
    requestId: req.id
  });

  // Return generic error to client
  const statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === "production") {
    return res.status(statusCode).json({
      error: "Internal server error",
      requestId: req.id // Allow user to reference in support ticket
    });
  }

  // Development: include details for debugging
  res.status(statusCode).json({
    error: err.message,
    requestId: req.id
  });
});
```

Additional controls:
- Set `NODE_ENV=production` in production environments
- Never log sensitive data (passwords, tokens) even server-side
- Implement custom error classes for expected errors (validation, not found)
- Use error monitoring (Sentry, Rollbar) for structured error tracking
- Sanitize all user input to prevent error-based injection attacks

**OWASP Mapping**: A01 - Broken Access Control, A05 - Security Misconfiguration

---

### Threat 3: Unencrypted Database Backups Stored in S3

**Threat**: Attacker gains access to S3 bucket and downloads plaintext database backups

**Component**: Automated database backup job storing to S3

**Attack Scenario**:
1. Automated job dumps PostgreSQL database to `/backups/db-2024-01-15.sql`
2. Backup uploaded to S3 bucket `my-company-backups` (public-read by mistake)
3. Attacker finds bucket through reconnaissance (Google dorks, bucket enumeration tools)
4. Attacker downloads 100GB backup containing all user PII, passwords, credit cards
5. Attacker has complete database history for past year

**Impact**: Total data breach. All historical data compromised. GDPR/HIPAA violation. Passwords may be crackable. Credit card data theft.

**Likelihood**: Medium (requires misconfigured S3 bucket, but misconfigurations are common)

**Mitigation**:
```bash
# BAD: Unencrypted backup to potentially misconfigured bucket
pg_dump -U postgres mydb > /tmp/backup.sql
aws s3 cp /tmp/backup.sql s3://my-company-backups/

# GOOD: Encrypted backup with proper access controls
# 1. Encrypt backup with GPG before upload
pg_dump -U postgres mydb | \
  gpg --symmetric --cipher-algo AES256 \
    --passphrase "$BACKUP_ENCRYPTION_KEY" \
    --batch --yes \
  > /tmp/backup.sql.gpg

# 2. Upload to private S3 bucket
aws s3 cp /tmp/backup.sql.gpg \
  s3://my-company-backups-encrypted/backup-$(date +%Y%m%d).sql.gpg \
  --storage-class STANDARD_IA \
  --server-side-encryption aws:kms \
  --ssekms-key-id "$KMS_KEY_ID"

# 3. Set restrictive bucket policy (only allow specific IAM roles)
# 4. Enable S3 Block Public Access
# 5. Securely delete local backup
shred -vfz -n 3 /tmp/backup.sql.gpg
```

Additional controls in code:
```typescript
// Verify bucket configuration before backup
import { S3Client, GetBucketAclCommand } from "@aws-sdk/client-s3";

async function validateBackupBucket(bucketName: string) {
  const s3 = new S3Client({ region: "us-east-1" });

  // Check bucket ACL
  const acl = await s3.send(new GetBucketAclCommand({
    Bucket: bucketName
  }));

  // Fail if bucket is public
  const isPublic = acl.Grants?.some(grant =>
    grant.Grantee?.URI?.includes("AllUsers") ||
    grant.Grantee?.URI?.includes("AuthenticatedUsers")
  );

  if (isPublic) {
    throw new Error("Backup bucket must not be public!");
  }

  logger.info("Backup bucket security validated", { bucketName });
}
```

Additional controls:
- Enable S3 Block Public Access at account level
- Use AWS KMS for encryption key management (rotate keys quarterly)
- Implement bucket policies allowing access only to backup service IAM role
- Enable S3 access logging and alert on unexpected downloads
- Implement backup retention policy (delete after 90 days for GDPR compliance)
- Test backup restoration regularly to ensure encryption keys work

**OWASP Mapping**: A02 - Cryptographic Failures, A05 - Security Misconfiguration

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #3b82f6;">

<div style="font-size: 20px; font-weight: 700; color: #93c5fd; margin-bottom: 20px;">Before merging AI-generated Information Disclosure threat mitigation code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Access Control and Authorization</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Every API endpoint returning user data verifies requesting user is authorized to access that specific resource<br/>
    ✓ Centralized authorization middleware checks resource ownership before fetching data<br/>
    ✓ Never trust client-provided IDs without validation<br/>
    ✓ Deny-by-default policies implemented where access must be explicitly granted<br/>
    ✓ Test: Log in as User A, capture API requests, change resource IDs to User B's resources, and verify access denial with 403 Forbidden
  </div>
</div>

<div style="background: rgba(139, 92, 246, 0.15); border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">Data Minimization and Field Filtering</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ APIs return only minimum data necessary for specific use case<br/>
    ✓ Never return entire database rows with SELECT * queries<br/>
    ✓ Explicitly list fields in queries and filter sensitive data (SSN, full credit card numbers, passwords) from responses<br/>
    ✓ Response schemas define exactly which fields are exposed<br/>
    ✓ Separate read models used for different contexts (admin vs user vs public)<br/>
    ✓ Test: Inspect API responses and verify no sensitive fields present, check database queries specify exact columns not SELECT *
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Error Handling and Information Leakage</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Production applications never expose stack traces, SQL queries, file paths, or technology details in error responses<br/>
    ✓ Global error handlers return generic messages to clients while logging details server-side<br/>
    ✓ NODE_ENV=production set to disable verbose errors<br/>
    ✓ Custom error classes created for expected errors (validation, not found) with safe messages<br/>
    ✓ Error monitoring services used for internal debugging<br/>
    ✓ Test: Send malformed requests and verify error responses are generic, check stack traces never appear in API responses
  </div>
</div>

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #06b6d4; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Encryption at Rest</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All sensitive data encrypted in databases, file storage, backups, and caches<br/>
    ✓ AES-256-GCM used for encryption with keys managed by AWS KMS, Azure Key Vault, or HashiCorp Vault<br/>
    ✓ Never store encryption keys in code or environment variables alongside the data<br/>
    ✓ Encryption enabled for databases (PostgreSQL TDE, MySQL encryption), S3 buckets (SSE-KMS), and EBS volumes<br/>
    ✓ Backups encrypted before uploading to storage<br/>
    ✓ Test: Inspect database files, S3 objects, and backup files to verify encryption enabled, attempt to access raw data without decryption keys
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Encryption in Transit</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All communication uses TLS 1.3 or 1.2 with strong cipher suites<br/>
    ✓ TLS 1.0/1.1 and weak ciphers (RC4, DES) disabled<br/>
    ✓ HTTPS Strict Transport Security (HSTS) enabled with max-age=31536000; includeSubDomains; preload<br/>
    ✓ Certificate pinning used in mobile apps<br/>
    ✓ WebSocket connections use WSS (not WS)<br/>
    ✓ Internal service-to-service communication uses TLS<br/>
    ✓ Test: Use SSL Labs or testssl.sh to scan domain, verify A or A+ rating with TLS 1.3 support and no weak ciphers
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Secrets Management</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Never hardcode API keys, database passwords, encryption keys, or OAuth secrets in source code<br/>
    ✓ Environment variables loaded from secure vaults (AWS Secrets Manager, Azure Key Vault, Doppler)<br/>
    ✓ Secrets rotated quarterly<br/>
    ✓ Secret scanning implemented in CI/CD (trufflehog, git-secrets) to prevent accidental commits<br/>
    ✓ Separate secrets used for each environment (dev, staging, prod)<br/>
    ✓ Test: Search codebase for hardcoded secrets using regex, verify secrets loaded from environment variables or vault services
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Logging and Monitoring Privacy</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Logs never contain passwords, session tokens, credit card numbers, SSNs, or API keys<br/>
    ✓ Automatic PII redaction implemented using regex patterns or libraries<br/>
    ✓ Log only identifiers (user ID, transaction ID) instead of sensitive values<br/>
    ✓ All log statements reviewed to ensure compliance<br/>
    ✓ Log sampling configured for high-volume endpoints to reduce storage costs while maintaining security visibility<br/>
    ✓ Validate: Search logs for sensitive patterns (credit card regex, SSN format), verify PII is masked or absent, test authentication failures don't log passwords
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use the AI prompt** with ChatGPT or Claude to analyze your architecture
2. **Review generated threats** using the checklist above
3. **Audit API endpoints** for IDOR vulnerabilities and over-fetching
4. **Implement encryption** for data at rest and in transit
5. **Fix error handling** to prevent information leakage
6. **Scan for secrets** in codebase and Git history
7. **Test access controls** by attempting unauthorized data access
8. **Move to next STRIDE category** → [Denial of Service](denial-of-service)

---

## 📖 Additional Resources

- **[OWASP A01: Broken Access Control](/docs/prompts/owasp/A01_broken_access_control)** — IDOR prevention
- **[OWASP A02: Cryptographic Failures](/docs/prompts/owasp/A02_crypto_failures)** — Encryption guidance
- **[OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)** — Best practices

---

**Remember**: Information disclosure is prevented by access control, encryption, and minimal data exposure. Default to privacy — share only what's necessary, encrypt everything sensitive, and verify authorization on every request.
