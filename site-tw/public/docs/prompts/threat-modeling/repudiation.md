# STRIDE: Repudiation — Threat Modeling Prompt Pack

> **Repudiation** is denying actions without proof to contradict the claim. This STRIDE category focuses on accountability failures where systems cannot prove who performed an action, when it occurred, or what changed.

---

## 🎯 What is Repudiation?

**Definition**: An attacker performs malicious actions and then denies having done so, with no audit trail to prove otherwise. Repudiation threatens **non-repudiation** — the ability to prove that a specific action was performed by a specific actor at a specific time.

**Common Repudiation Attack Vectors**:
- **Missing Audit Logs**: No record of who accessed or modified data
- **Log Tampering**: Attacker deletes or modifies logs to cover their tracks
- **Unauthenticated Actions**: Anonymous operations with no identity binding
- **Insufficient Detail**: Logs don't capture enough context (IP, user, timestamp)
- **Log Injection**: Attacker pollutes logs with fake entries

**Why It Matters**: Without comprehensive audit trails, you cannot detect insider threats, investigate security incidents, meet compliance requirements (GDPR, HIPAA, SOC 2), or prosecute attackers. Repudiation enables attackers to operate invisibly and deny responsibility when caught.

---

## 🔗 Maps to OWASP

**Primary**: [A09 - Security Logging and Monitoring Failures](/docs/prompts/owasp/A09_logging_monitoring)
**Secondary**: [A08 - Software and Data Integrity Failures](/docs/prompts/owasp/A08_integrity_failures) (log integrity)

---

## 🤖 AI Prompt: Identify Repudiation Threats in Architecture

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into ChatGPT, Claude, or GitHub Copilot Chat:**

```
Role: You are a security architect specializing in audit logging, compliance, and incident response. Your task is to perform STRIDE threat modeling focusing on Repudiation (R) threats.

Context:
I have the following architecture:

[PASTE YOUR ARCHITECTURE DIAGRAM OR DESCRIPTION HERE]

Example:
- React SPA frontend with user dashboard
- Node.js REST API with Express
- PostgreSQL database storing user data
- Admin portal with elevated privileges
- Payment processing integration
- Email notification system
- No centralized logging (logs to local files)
- No log retention policy

Task:
Analyze this architecture for Repudiation threats. For each sensitive action, data modification, or privileged operation, identify where an attacker could perform actions without leaving a verifiable audit trail.

Format:
For each threat, provide:

**Threat**: [One-line description]
**Component**: [Which part of the system is vulnerable]
**Attack Scenario**: [Step-by-step attack walkthrough]
**Impact**: [What happens if successful — inability to detect breach, compliance failure, etc.]
**Likelihood**: [High/Medium/Low based on common attacker capabilities]
**Mitigation**: [Specific controls to prevent or detect this attack]
**OWASP Mapping**: [A09, A08, etc.]
**Code Example**: [Show vulnerable pattern and secure logging]

Focus Areas:
Pay special attention to:
- Authentication and authorization events (login, logout, password reset, privilege changes)
- Data access and modifications (SELECT with PII, UPDATE/DELETE operations)
- Administrative actions (user deletion, configuration changes, system settings)
- Financial transactions (payments, refunds, balance changes)
- Security-relevant events (failed auth attempts, suspicious patterns)
- Log storage and integrity (where logs are stored, who can access/modify them)
- Log retention and rotation policies
- Anonymous or unauthenticated actions

Output:
Provide 3-5 high-priority repudiation threats with complete details. Prioritize threats that impact incident response and compliance.
```

</div>

---

## 📋 Example AI Output

### Threat 1: Missing Audit Logs for Admin User Deletion

**Threat**: Admin deletes user account with no audit trail of who or when

**Component**: `/api/admin/users/:id` DELETE endpoint

**Attack Scenario**:
1. Malicious admin (or attacker with stolen admin credentials) accesses admin portal
2. Admin deletes competitor's user account
3. No log entry is created recording the deletion
4. User complains their account is missing
5. Support team cannot determine who deleted the account or when
6. Admin denies involvement, no evidence to contradict

**Impact**: Inability to investigate insider threats, compliance violations (GDPR right to know who accessed data), damaged customer trust, potential legal liability.

**Likelihood**: High (insider threats are common, logging is often overlooked)

**Mitigation**:
```typescript
// BAD: No logging of deletion
app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
  await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// GOOD: Comprehensive audit logging
import winston from "winston";

const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: "audit.log",
      options: { flags: "a" } // Append-only
    }),
    new winston.transports.Console() // Also log to centralized system
  ]
});

app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
  const userId = req.params.id;

  // Fetch user details before deletion
  const user = await db.query("SELECT username, email FROM users WHERE id = $1", [userId]);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Delete user
  await db.query("DELETE FROM users WHERE id = $1", [userId]);

  // Log with comprehensive context
  auditLogger.info({
    event: "user_deleted",
    actor: {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role
    },
    target: {
      userId: user.id,
      username: user.username,
      email: user.email
    },
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    requestId: req.id // Trace to original request
  });

  res.json({ success: true });
});
```

Additional controls:
- Send logs to immutable storage (AWS CloudWatch, Splunk, ELK)
- Alert security team on sensitive actions (user deletion, privilege escalation)
- Require multi-person approval for destructive admin actions
- Maintain separate audit database that application cannot modify

**OWASP Mapping**: A09 - Logging and Monitoring Failures

---

### Threat 2: Log Tampering via Application Access

**Threat**: Attacker modifies or deletes logs to erase evidence of compromise

**Component**: Application logging to local file system (`/var/log/app.log`)

**Attack Scenario**:
1. Attacker compromises application server
2. Attacker performs malicious actions (data exfiltration, privilege escalation)
3. Logs are written to local file with read/write access for app user
4. Attacker deletes or modifies log entries showing their activity
5. Incident response team finds no evidence of breach
6. Attacker operates undetected

**Impact**: Inability to detect security incidents, corrupted forensic evidence, compliance violations, extended dwell time for attackers.

**Likelihood**: Medium (requires initial compromise, but log tampering is common)

**Mitigation**:
```typescript
// BAD: Logs stored locally where app can modify them
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: "app.log" })
  ]
});

// GOOD: Logs sent to immutable external system
import { CloudWatchLogs } from "@aws-sdk/client-cloudwatch-logs";

const cloudwatch = new CloudWatchLogs({ region: "us-east-1" });

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),

    // Send to CloudWatch (immutable, append-only)
    new WinstonCloudWatch({
      logGroupName: "/app/production",
      logStreamName: `${process.env.HOSTNAME}-${Date.now()}`,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY,
      awsSecretKey: process.env.AWS_SECRET_KEY,
      awsRegion: "us-east-1"
    })
  ]
});

// Enable log integrity verification
logger.on("data", (info) => {
  // Generate HMAC signature for each log entry
  const signature = crypto.createHmac("sha256", process.env.LOG_SIGNING_KEY)
    .update(JSON.stringify(info))
    .digest("hex");

  info.signature = signature;
});
```

Additional controls:
- Use write-only log destinations (application cannot read or delete)
- Implement log signing with HMAC to detect tampering
- Set IAM policies preventing app from modifying CloudWatch logs
- Enable log file integrity monitoring (FIM) if using local files
- Require separate credentials for log access (not application credentials)

**OWASP Mapping**: A09 - Logging and Monitoring Failures, A08 - Integrity Failures

---

### Threat 3: Insufficient Context in Authentication Logs

**Threat**: Failed login attempts logged without IP or user context

**Component**: `/api/auth/login` endpoint

**Attack Scenario**:
1. Attacker attempts credential stuffing attack with 10,000 username/password pairs
2. System logs: `"Login failed"` (no username, IP, or timestamp)
3. Security team cannot identify attack pattern or block malicious IPs
4. Attacker eventually guesses valid credentials
5. Forensic investigation cannot determine how many accounts were compromised
6. Attacker denies targeting specific accounts

**Impact**: Inability to detect brute force attacks, cannot block malicious IPs, compliance violations (failed auth attempts are required for SOC 2, PCI DSS).

**Likelihood**: High (authentication is commonly targeted, logging details are often missed)

**Mitigation**:
```typescript
// BAD: Minimal logging with no context
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await authenticateUser(username, password);

  if (!user) {
    logger.info("Login failed");
    return res.status(401).json({ error: "Invalid credentials" });
  }

  logger.info("Login successful");
  res.json({ token: generateToken(user) });
});

// GOOD: Comprehensive authentication logging
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  const logContext = {
    username: username, // Safe to log username
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
    requestId: req.id,
    geolocation: await geolocateIP(req.ip)
  };

  const user = await authenticateUser(username, password);

  if (!user) {
    logger.warn({
      event: "login_failed",
      reason: "invalid_credentials",
      ...logContext
    });

    // Increment failed attempt counter
    await rateLimiter.increment(`failed_login:${req.ip}`);

    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Check for suspicious login patterns
  if (await isAnomalousLogin(user.id, req.ip)) {
    logger.warn({
      event: "anomalous_login",
      userId: user.id,
      reason: "new_location",
      ...logContext
    });

    // Send alert to user
    await sendSecurityAlert(user.email, logContext);
  }

  logger.info({
    event: "login_success",
    userId: user.id,
    ...logContext
  });

  res.json({ token: generateToken(user) });
});
```

Additional controls:
- Log both successful and failed authentication attempts
- Include IP, User-Agent, timestamp, geolocation in all auth logs
- Never log passwords (even hashed) or sensitive tokens
- Alert on suspicious patterns (new location, impossible travel time)
- Integrate with SIEM for correlation across systems

**OWASP Mapping**: A09 - Logging and Monitoring Failures

---

## ✅ Human Review Checklist

After AI generates repudiation threats, validate each finding before implementing mitigations. Here's what to verify:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 📊 Audit Log Coverage

Every security-relevant action must be logged with sufficient detail for forensic investigation. This includes authentication events (login, logout, password reset, MFA enrollment), authorization changes (role modifications, permission grants), data access to sensitive resources (PII, financial data, healthcare records), and administrative actions (user deletion, config changes, system settings). Each log entry should answer who, what, when, where, and how.

**Test it**: Perform a sensitive action (delete user, change password) and verify a log entry appears with complete context. Check that logs include user ID, IP address, timestamp, and action details.

---

### 🔒 Log Integrity and Immutability

Audit logs must be stored in append-only systems that the application cannot modify or delete. Use centralized logging platforms like CloudWatch, Splunk, or ELK with IAM policies preventing write access from application accounts. Implement cryptographic signing (HMAC-SHA256) for each log entry to detect tampering. Store logs in a separate account or subscription from the application to prevent lateral movement.

**Test it**: Attempt to modify or delete a log entry from the application. Verify access is denied. Check that log signatures are generated and can be verified.

---

### 🕰️ Log Retention and Compliance

Logs must be retained for durations that satisfy compliance requirements: 90 days minimum for SOC 2, 1 year for PCI DSS, 7 years for some HIPAA records. Implement automated log rotation and archival to cold storage (S3 Glacier, Azure Archive) after active retention period. Document retention policies and implement automated deletion after compliance period expires.

**Validate**: Review log retention settings in your logging platform. Verify old logs are archived and available for retrieval. Confirm automated deletion is configured.

---

### 🔍 Sensitive Data Masking

Never log passwords, session tokens, credit card numbers, Social Security numbers, or API keys. Implement automatic PII detection and redaction using regex or library functions. Log identifiers (user ID, email) instead of full names. Be especially careful with request bodies, error messages, and debug logs that might expose secrets.

**Test it**: Submit a request with a credit card number and verify it's masked in logs (shows only last 4 digits). Check that passwords never appear in any log file.

---

### 🚨 Real-Time Alerting

High-severity security events should trigger immediate alerts to security teams via PagerDuty, Slack, email, or SIEM. Define alert rules for failed authentication bursts, privilege escalation attempts, anomalous data access patterns, and admin actions. Alerts should include enough context to triage without accessing full logs.

**Test it**: Trigger a high-severity event (10 failed logins in 1 minute) and verify an alert is sent within 30 seconds. Check alert includes actionable details.

---

### 🔗 Log Correlation and Tracing

Each log entry should include a correlation ID or request ID that links related events across services. This enables tracing a single user action through microservices architecture. Use structured logging (JSON format) with consistent field names across all services. Integrate with distributed tracing tools (Jaeger, Zipkin) for performance and security correlation.

**Validate**: Generate a request ID at ingress and verify it appears in all downstream logs. Test that you can search for a specific request ID and see all related events.

---

### 📈 Monitoring and Anomaly Detection

Implement dashboards showing authentication trends, failed login rates, data access patterns, and admin action frequency. Use statistical anomaly detection to alert on unusual patterns (10x normal login attempts, access to 100+ user records in 5 minutes). Regularly review dashboards for suspicious activity during security reviews.

**Set up**: Create dashboards in your logging platform showing key security metrics. Configure thresholds for alerts based on historical baselines.

---

### 🔬 Threat Scenario Realism

For each AI-generated threat, verify the attack scenario is technically feasible. Check that log coverage recommendations align with your compliance requirements. Validate that alerting thresholds won't cause alert fatigue with false positives. Ensure logging doesn't impact application performance (async logging, sampling for high-volume endpoints).

**Red flags**: Logging passwords or tokens, synchronous logging on hot paths causing latency, missing correlation IDs, logs stored where app can delete them.

</div>

---

## 🔄 Next Steps

1. **Use the AI prompt** with ChatGPT or Claude to analyze your architecture
2. **Review generated threats** using the checklist above
3. **Implement comprehensive audit logging** using [OWASP A09](/docs/prompts/owasp/A09_logging_monitoring) prompt pack
4. **Set up centralized logging** (CloudWatch, Splunk, ELK)
5. **Configure alerting rules** for high-severity security events
6. **Test log integrity** — verify logs cannot be tampered with
7. **Document retention policies** and ensure compliance
8. **Move to next STRIDE category** → [Information Disclosure](information-disclosure)

---

## 📖 Additional Resources

- **[OWASP A09: Logging and Monitoring Failures](/docs/prompts/owasp/A09_logging_monitoring)** — Implementation guide
- **[OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)** — Best practices

---

**Remember**: Repudiation is prevented by comprehensive, immutable audit logs. If you can't prove it happened, it might as well not have happened — log everything security-relevant.
