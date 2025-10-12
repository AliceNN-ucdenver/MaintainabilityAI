# Security Logging and Monitoring Failures — OWASP A09 Prompt Pack

> **OWASP A09: Security Logging and Monitoring Failures** occurs when applications fail to properly log security events, detect breaches, or alert on suspicious activity. This includes logging sensitive data (passwords, tokens), missing security event logs, unstructured logs difficult to analyze, no alerting on suspicious patterns, and insufficient log retention for forensic analysis.

---

## 🎯 What is A09?

**Definition**: Security logging and monitoring failures allow attackers to remain undetected in systems, escalate privileges, persist in networks, and extract or destroy data. Without proper logging, security incidents go unnoticed until significant damage occurs, and forensic investigation becomes impossible due to lack of evidence.

**Common Manifestations**:
- **Logging Sensitive Data**: Passwords, tokens, API keys, credit cards in plaintext logs
- **No Security Event Logging**: Failed logins, access denials, privilege escalations not logged
- **Unstructured Logs**: Console.log with inconsistent formats, difficult to parse or search
- **Missing Context**: Logs lack user ID, IP address, timestamp, or action details
- **No Alerting**: Security events logged but no real-time alerting to security team
- **Insufficient Retention**: Logs deleted too quickly for breach investigation
- **Log Tampering**: Logs stored insecurely where attackers can modify or delete
- **PII Exposure**: Email addresses, IP addresses logged in plaintext without masking

**Why It Matters**: Logging and monitoring failures ranked #9 in OWASP Top 10 2021. According to Verizon DBIR, most breaches go undetected for months. Attackers exploit this detection gap to escalate privileges, move laterally, and exfiltrate data. Proper logging is critical for detecting attacks in progress, conducting forensic analysis, meeting compliance requirements (PCI-DSS, HIPAA, GDPR), and improving security posture through metrics.

---

## 🔗 Maps to STRIDE

**Primary**: **Repudiation** (attackers deny actions due to lack of audit trail)
**Secondary**: **Information Disclosure** (logs expose sensitive data like passwords or PII)

See also: [STRIDE: Repudiation](/docs/prompts/stride/repudiation) and [STRIDE: Information Disclosure](/docs/prompts/stride/information-disclosure)

---

## 🤖 AI Prompt #1: Analyze Code for Logging and Monitoring Failures

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security analyst specializing in logging and monitoring failures (OWASP A09).

Context:
I have a Node.js + TypeScript application that handles authentication, authorization, and sensitive data. I need to identify all locations where security logging may be insufficient, logging sensitive data, or missing critical security events.

My codebase includes:
- Authentication and authorization flows
- User data processing
- API endpoints handling sensitive operations
- Error handling and logging statements
- Monitoring and alerting infrastructure (or lack thereof)

Task:
Analyze the following code/files for OWASP A09 vulnerabilities:

[PASTE YOUR CODE HERE - authentication controllers, logging statements, error handlers, monitoring setup]

Identify:

1. **Sensitive Data Logging**: Passwords, tokens, API keys, credit cards, session IDs in logs
2. **Missing Security Events**: Failed logins, access denials, privilege changes, validation failures not logged
3. **Unstructured Logging**: Using console.log instead of structured logger with JSON format
4. **Missing Context**: Logs lacking user ID, IP address, timestamp, action, or outcome
5. **No Alerting**: Critical security events logged but no real-time alerts configured
6. **PII Exposure**: Email addresses, IP addresses logged without masking
7. **Insufficient Retention**: Logs deleted too quickly (less than 30 days)
8. **Log Tampering Risk**: Logs stored in writable locations without integrity protection

For each vulnerability found:

**Location**: [File:Line or Function Name]
**Issue**: [Specific logging or monitoring failure]
**Attack Vector**: [How an attacker benefits from this gap - remains undetected, denies actions, etc.]
**Risk**: [Impact - breach goes undetected, no audit trail, compliance violation]
**Remediation**: [Specific fix - structured logging with Winston, PII masking, alerting rules]

Requirements:
- Check all authentication/authorization code for security event logging
- Verify logs use structured format (JSON)
- Look for sensitive data (passwords, tokens) in log statements
- Verify PII is masked (emails to u***@domain, IPs to x.x.x.***)
- Check for alerting rules on suspicious patterns
- Verify log retention meets compliance requirements (30-90 days minimum)

Output:
Provide a prioritized list of logging vulnerabilities (Critical > High > Medium) with specific remediation examples using Winston structured logging, PII masking functions, and alerting integration.
```

</div>

---

## 🤖 AI Prompt #2: Implement Secure Logging and Monitoring

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security engineer implementing comprehensive security logging and monitoring (OWASP A09 remediation).

Context:
I need to implement proper security event logging and monitoring throughout my Node.js + TypeScript application.

Current state:
- Using console.log with inconsistent formats
- Logging passwords, tokens, or other sensitive data
- Missing logs for authentication and authorization events
- No PII masking (emails and IPs in plaintext)
- No alerting on suspicious patterns
- No structured log format or log aggregation

Requirements:
Implement the following secure logging patterns:

1. **Structured Logging with Winston**
   - Configure Winston with JSON format and timestamps
   - Separate log files: error.log, combined.log, security.log
   - Log rotation: 10MB max file size, retain 30 files (30 days)
   - Include service name, environment, and version in all logs
   - Transport to console in development, files in production

2. **Sensitive Data Masking**
   - Function: sanitizeLogData(data: any): any
   - Never log: passwords, tokens, apiKey, secret, creditCard, sessionId
   - Mask emails: user@example.com → u***@example.com
   - Mask IPs: 192.168.1.100 → 192.168.1.***
   - Mask last 4 digits of credit cards: 1234-5678-9012-3456 → ****-****-****-3456
   - Function: maskEmail(email: string): string
   - Function: maskIP(ip: string): string

3. **Security Event Logging**
   - Define SecurityEventType enum: LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, ACCESS_DENIED, RATE_LIMIT_EXCEEDED, VALIDATION_FAILURE, PRIVILEGE_ESCALATION, SUSPICIOUS_ACTIVITY
   - Interface SecurityEvent with: type, userId, email, ipAddress, userAgent, resource, action, outcome, reason, metadata, timestamp
   - Function: logSecurityEvent(event: SecurityEvent): void
   - Log all authentication attempts (success and failure)
   - Log all authorization failures
   - Log input validation failures
   - Log rate limit violations
   - Log privilege changes

4. **Real-Time Alerting**
   - Function: shouldAlert(event: SecurityEvent): boolean
   - Alert on: >5 failed logins from same IP in 5 minutes
   - Alert on: privilege escalation attempts
   - Alert on: access denied to admin resources
   - Alert on: rate limit violations
   - Function: sendSecurityAlert(logEntry: any): Promise<void>
   - Integration with: Sentry, DataDog, PagerDuty, or Slack (placeholder)

5. **Contextual Metadata**
   - Include in every security log: userId, email (masked), ipAddress (masked), userAgent, timestamp, eventType, outcome, resource, action
   - Request ID for tracing across services
   - Session age and last accessed time
   - Geolocation from IP (optional)

6. **Log Integrity**
   - Append-only file permissions
   - Centralized log aggregation (send to SIEM like Splunk, Elastic, or CloudWatch)
   - Log signing for tampering detection (HMAC-SHA256)
   - Function: signLogEntry(entry: any, secret: string): string

7. **Test Coverage**
   - Unit tests verifying passwords never logged
   - Tests verifying PII is masked in logs
   - Tests verifying all security events logged
   - Tests verifying alerts triggered on suspicious patterns
   - Tests verifying log format is valid JSON

Implementation:
- Use Winston logger with JSON format
- TypeScript strict mode with proper typing
- Comprehensive inline security comments
- Never log raw sensitive data
- Generic error messages to clients (detailed logs server-side only)

Output:
Provide complete, executable TypeScript code for:
- `logging/logger.ts` (Winston configuration with structured JSON logging)
- `logging/sanitize.ts` (PII masking functions for emails, IPs, sensitive fields)
- `logging/securityEvents.ts` (logSecurityEvent, SecurityEventType enum, alerting rules)
- `logging/integrity.ts` (log signing and verification)
- `__tests__/logging.test.ts` (Jest tests verifying sensitive data masking and security event logging)
```

</div>

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: Logs passwords and tokens in plaintext
export function login(email: string, password: string) {
  console.log('Login attempt', { email, password }); // ❌ Logs password!

  const user = authenticateUser(email, password);

  if (user) {
    const token = generateToken(user.id);
    console.log('Login successful', { email, token }); // ❌ Logs session token!
    return token;
  }

  console.log('Login failed'); // ❌ Missing context: IP, timestamp, user agent
  return null;
}

// ❌ CRITICAL: No security event logging
export function deleteUser(adminId: string, userId: string) {
  // ❌ No log of who deleted whom
  db.query('DELETE FROM users WHERE id = $1', [userId]);
  return { message: 'User deleted' };
}

// Attack: Passwords stored in logs, accessible to anyone with log access
// Attack: No audit trail for privilege escalation or data deletion
// Attack: Breaches go undetected for months due to missing security logs
```

### After (Secure Code)

```typescript
// ✅ SECURE: Structured logging with PII masking and security event tracking
import winston from 'winston';

// ✅ Configure structured logger with Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json() // ✅ Structured JSON format
  ),
  defaultMeta: {
    service: 'auth-service',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  },
  transports: [
    // ✅ Error logs in separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 30, // Keep 30 days
    }),
    // ✅ Security events in separate file
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'warn',
      maxsize: 10485760,
      maxFiles: 90, // Keep 90 days for compliance
    }),
    // ✅ All logs combined
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 30,
    }),
  ],
});

// ✅ Console transport in development only
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// ✅ Sensitive data masking functions
function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) return '***@***.***';

  // Show first character only: user@example.com → u***@example.com
  const maskedUsername = username.charAt(0) + '***';
  return `${maskedUsername}@${domain}`;
}

function maskIP(ip: string): string {
  const parts = ip.split('.');

  if (parts.length === 4) {
    // IPv4: 192.168.1.100 → 192.168.1.***
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }

  // IPv6: just show first segment
  const ipv6Parts = ip.split(':');
  return `${ipv6Parts[0]}:***`;
}

function maskCreditCard(cc: string): string {
  // Show only last 4 digits: 1234-5678-9012-3456 → ****-****-****-3456
  const digits = cc.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return '****-****-****-' + digits.slice(-4);
}

function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  // ✅ Never log these fields (complete removal)
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'secret',
    'sessionId',
    'authorization',
    'cookie',
    'creditCard',
    'ssn',
    'privateKey'
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field]; // ✅ Remove entirely
    }
  }

  // ✅ Mask PII fields (partial redaction)
  if (sanitized.email && typeof sanitized.email === 'string') {
    sanitized.email = maskEmail(sanitized.email);
  }

  if (sanitized.ipAddress && typeof sanitized.ipAddress === 'string') {
    sanitized.ipAddress = maskIP(sanitized.ipAddress);
  }

  if (sanitized.ip && typeof sanitized.ip === 'string') {
    sanitized.ip = maskIP(sanitized.ip);
  }

  // ✅ Recursively sanitize nested objects
  for (const key in sanitized) {
    if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

// ✅ Security event types
enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  ACCESS_DENIED = 'access_denied',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  VALIDATION_FAILURE = 'validation_failure',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  USER_DELETED = 'user_deleted',
  ROLE_CHANGED = 'role_changed',
}

interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  outcome: 'success' | 'failure';
  reason?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

// ✅ Track failed login attempts for alerting
const failedLoginAttempts = new Map<string, number[]>();

// ✅ Determine if security event requires real-time alert
function shouldAlert(event: SecurityEvent): boolean {
  const now = Date.now();

  // ✅ Alert on multiple failed logins from same IP (brute force)
  if (event.type === SecurityEventType.LOGIN_FAILURE && event.ipAddress) {
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const attempts = failedLoginAttempts.get(event.ipAddress) || [];
    const recentAttempts = attempts.filter(time => time > fiveMinutesAgo);
    recentAttempts.push(now);

    failedLoginAttempts.set(event.ipAddress, recentAttempts);

    // ✅ Alert if >5 failed logins in 5 minutes
    if (recentAttempts.length > 5) {
      return true;
    }
  }

  // ✅ Alert on privilege escalation attempts
  if (event.type === SecurityEventType.PRIVILEGE_ESCALATION) {
    return true;
  }

  // ✅ Alert on access denied to admin resources
  if (event.type === SecurityEventType.ACCESS_DENIED &&
      event.resource?.includes('admin')) {
    return true;
  }

  // ✅ Alert on rate limit violations
  if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
    return true;
  }

  // ✅ Alert on suspicious activity
  if (event.type === SecurityEventType.SUSPICIOUS_ACTIVITY) {
    return true;
  }

  // ✅ Alert on user/role changes
  if (event.type === SecurityEventType.USER_DELETED ||
      event.type === SecurityEventType.ROLE_CHANGED) {
    return true;
  }

  return false;
}

// ✅ Send security alert to monitoring system
async function sendSecurityAlert(logEntry: any): Promise<void> {
  // ✅ Console alert for development
  console.error('🚨 SECURITY ALERT:', JSON.stringify(logEntry, null, 2));

  // ✅ Production: send to monitoring service
  // Example integrations:

  // Sentry
  // Sentry.captureException(new Error('Security Alert'), {
  //   level: 'error',
  //   extra: logEntry,
  // });

  // DataDog
  // await datadogClient.sendEvent({
  //   title: 'Security Alert',
  //   text: JSON.stringify(logEntry),
  //   alert_type: 'error',
  // });

  // PagerDuty
  // await pagerduty.trigger({
  //   severity: 'high',
  //   summary: `Security Alert: ${logEntry.eventType}`,
  //   details: logEntry,
  // });

  // Slack
  // await slackClient.chat.postMessage({
  //   channel: '#security-alerts',
  //   text: `🚨 Security Alert: ${logEntry.eventType}`,
  //   attachments: [{ text: JSON.stringify(logEntry, null, 2) }],
  // });
}

// ✅ Log security event with sanitization and alerting
export function logSecurityEvent(event: SecurityEvent): void {
  // ✅ Sanitize sensitive data
  const sanitized = sanitizeLogData(event);

  // ✅ Add timestamp if not present
  const logEntry = {
    timestamp: event.timestamp || new Date().toISOString(),
    eventType: event.type,
    outcome: event.outcome,
    ...sanitized,
  };

  // ✅ Log at appropriate level
  if (event.outcome === 'failure') {
    logger.warn('Security event', logEntry);
  } else if (event.outcome === 'success') {
    logger.info('Security event', logEntry);
  }

  // ✅ Send alert if critical
  if (shouldAlert(event)) {
    sendSecurityAlert(logEntry).catch(err => {
      logger.error('Failed to send security alert', { error: err.message });
    });
  }
}

// ✅ Example: Secure login logging
export function login(email: string, password: string, ipAddress: string, userAgent: string) {
  const user = authenticateUser(email, password);

  if (user) {
    const token = generateToken(user.id);

    // ✅ Log successful login (password NOT included)
    logSecurityEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      userId: user.id,
      email, // Will be masked by sanitizeLogData
      ipAddress, // Will be masked by sanitizeLogData
      userAgent,
      outcome: 'success',
    });

    return token;
  }

  // ✅ Log failed login with context
  logSecurityEvent({
    type: SecurityEventType.LOGIN_FAILURE,
    email, // Will be masked
    ipAddress, // Will be masked
    userAgent,
    outcome: 'failure',
    reason: 'Invalid credentials',
  });

  return null;
}

// ✅ Example: Log authorization failure
export function deleteUser(adminId: string, userId: string, ipAddress: string) {
  const admin = getUserById(adminId);

  // ✅ Check authorization
  if (admin.role !== 'admin') {
    // ✅ Log access denied
    logSecurityEvent({
      type: SecurityEventType.ACCESS_DENIED,
      userId: adminId,
      resource: 'users',
      action: 'delete',
      ipAddress,
      outcome: 'failure',
      reason: 'Insufficient permissions',
      metadata: { targetUserId: userId },
    });

    throw new Error('Access denied');
  }

  // ✅ Perform deletion
  db.query('DELETE FROM users WHERE id = $1', [userId]);

  // ✅ Log user deletion
  logSecurityEvent({
    type: SecurityEventType.USER_DELETED,
    userId: adminId,
    resource: 'users',
    action: 'delete',
    ipAddress,
    outcome: 'success',
    metadata: { deletedUserId: userId },
  });

  return { message: 'User deleted' };
}

// ✅ Example: Log validation failure
export function validateInput(input: string, schema: any, ipAddress: string) {
  const result = schema.safeParse(input);

  if (!result.success) {
    // ✅ Log validation failure (don't log actual malicious input)
    logSecurityEvent({
      type: SecurityEventType.VALIDATION_FAILURE,
      ipAddress,
      outcome: 'failure',
      reason: 'Input validation failed',
      metadata: {
        errors: result.error.issues.map(i => i.message),
        // ❌ Don't log: input (may contain injection attempts)
      },
    });

    throw new Error('Invalid input');
  }

  return result.data;
}

// ✅ Additional security patterns:
// - All authentication events logged (success and failure)
// - All authorization failures logged
// - Sensitive data never logged (passwords, tokens, secrets)
// - PII masked (emails, IPs)
// - Structured JSON format for easy parsing
// - Real-time alerting on suspicious patterns
// - Log rotation with 30+ day retention
// - Contextual metadata (userId, IP, timestamp, action)
```

---

## ✅ Human Review Checklist

After AI generates logging and monitoring code, carefully review each area before deploying:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 📝 Structured Logging

Verify all logging uses Winston or similar structured logger with JSON format, never plain console.log statements. Every log entry should include consistent fields like timestamp, level, service name, environment, and event type. JSON format enables easy parsing by SIEM tools like Splunk, Elastic Stack, or CloudWatch Logs. Configure separate log files for different severity levels such as error.log for errors, security.log for security events, and combined.log for all entries. Implement log rotation with maximum file size (10MB) and retention period (30-90 days) to prevent disk space exhaustion while maintaining audit history. Console transport should only be enabled in development, not production. All logs must use UTF-8 encoding and be properly escaped to prevent log injection attacks.

**Test it**: Grep codebase for console.log/console.error and verify all replaced with logger.info/logger.error. Check logs are valid JSON with jq or JSON parser.

---

### 🔐 Sensitive Data Masking

Verify that passwords, tokens, API keys, session IDs, private keys, and other secrets are never logged under any circumstances. These fields should be completely removed from log data, not just masked. Implement automatic sanitization function that strips sensitive fields from all objects before logging. PII such as email addresses should be partially masked showing only first character plus asterisks like u***@example.com to maintain usefulness for debugging while protecting privacy. IP addresses should mask the last octet for IPv4 like 192.168.1.*** and last segments for IPv6. Credit card numbers should show only last 4 digits. Social Security Numbers should never be logged. Sanitization must happen recursively for nested objects and arrays. Create allowlist of fields that can be logged unmasked rather than blocklist of fields to mask, ensuring new sensitive fields are protected by default.

**Test it**: Search logs for literal passwords, tokens, or full email addresses and verify none exist. Test sanitization function with sensitive data and verify complete removal or proper masking.

---

### 🎯 Security Event Logging

All authentication events must be logged including successful logins, failed login attempts, logout, and session expiration. Authorization failures such as access denied to resources or privilege escalation attempts require logging with sufficient context. Input validation failures should be logged as potential attack indicators without logging the actual malicious input which may contain injection payloads. Rate limiting violations indicate automated attacks and must be logged. Privilege changes such as role modifications, user creation/deletion, and permission grants require audit trail. Each security event log should include user identifier, IP address (masked), user agent, resource accessed, action attempted, outcome (success/failure), reason for failure, and timestamp. Use standardized event type enumeration rather than freeform strings to enable pattern analysis and alerting rules.

**Test it**: Trigger various security events (failed login, access denied, validation error) and verify all logged with complete context. Check event types use consistent enum values.

---

### 📊 Contextual Metadata

Every security log entry must contain sufficient contextual metadata for forensic analysis including user identifier (ID, not full email), masked email address, masked IP address, user agent string, timestamp in ISO 8601 format with timezone, resource being accessed, action being performed, outcome (success or failure), and reason for failure. Include request ID or trace ID for correlating logs across distributed services. Session age and last accessed time help detect session hijacking. Geographic location derived from IP address can identify suspicious login locations. For audit compliance, logs must answer who did what to which resource at what time from where with what result. Avoid logging stack traces or technical details in security logs which should focus on security events rather than debugging information.

**Test it**: Review sample security logs and verify they answer the six questions: who, what, where, when, why, and how. Verify request tracing works across multiple services.

---

### 🚨 Real-Time Alerting

Critical security events must trigger real-time alerts to security team rather than waiting for log review. Implement alerting rules for brute force attacks such as more than 5 failed login attempts from same IP in 5 minutes. Privilege escalation attempts including access denied to admin resources or role modification should alert immediately. Account lockouts indicate sustained attack attempts. Multiple validation failures in short time suggest automated scanning. Successful login after multiple failures may indicate credential stuffing success. Configure alert destinations such as Sentry for application monitoring, DataDog or New Relic for infrastructure monitoring, PagerDuty for incident response, Slack or email for security team notifications. Implement alert throttling to prevent notification flooding during sustained attacks. Alerts should include actionable information like attacker IP, targeted account, and recommended mitigation steps. Test alert delivery regularly to ensure monitoring system reliability.

**Test it**: Trigger each alerting condition (5 failed logins, admin access denied) and verify alerts delivered to configured destinations within acceptable time (under 1 minute).

---

### 🕒 Log Retention

Logs must be retained for sufficient duration to enable forensic investigation of security incidents which often aren't discovered until weeks or months after initial compromise. Minimum retention period is 30 days for general logs and 90 days for security logs to meet common compliance requirements like PCI-DSS. Consider longer retention such as 1 year for highly regulated industries like healthcare (HIPAA) or finance (SOX). Implement automated log rotation based on file size (10MB max) or time period (daily rotation). Archived logs should be compressed to save storage space. Logs older than retention period should be automatically deleted to comply with data minimization principles and reduce liability. For critical systems, consider immutable log storage in WORM (write once read many) systems or cloud services like S3 with object lock. Document log retention policy and ensure it meets industry compliance requirements and organizational security standards.

**Test it**: Verify log rotation creates new files at size/time limits. Check old logs are compressed and eventually deleted. Verify retention period matches compliance requirements.

---

### 🔒 Log Integrity

Logs must be protected from tampering by attackers who gained system access. Implement append-only file permissions where logs can be written but not modified or deleted. Use centralized log aggregation sending logs to remote SIEM system immediately so local deletion doesn't destroy evidence. Consider log signing using HMAC-SHA256 where each log entry includes signature computed from entry content plus secret key, enabling detection of modified or forged entries. Store logs in separate security domain with restricted access preventing application compromises from affecting log integrity. For highest security requirements, use blockchain-based audit logs providing cryptographic proof of log integrity and ordering. Implement alerting on log modification or deletion attempts. Regular audit of log permissions and access controls ensures logs remain trustworthy forensic evidence. In containerized environments, mount log volumes as read-only from application perspective with separate log collector having write access.

**Test it**: Verify log files have restricted permissions (640 or stricter). Attempt to modify log entries and verify detection or prevention. Test log shipping to remote aggregator continues even if local logs deleted.

---

### 📈 Monitoring Dashboard

Implement centralized monitoring dashboard visualizing security metrics and trends over time. Track authentication metrics including total login attempts, successful logins, failed logins, and account lockouts. Monitor authorization metrics like access denials and privilege escalation attempts. Display rate limiting violations and validation failures indicating attack activity. Show geographic distribution of login attempts to identify unusual locations. Implement anomaly detection alerting on deviations from normal patterns such as logins from new countries, unusual login times, or sudden spike in failed attempts. Create pre-built queries for common security investigations like all events for specific user, all access attempts to sensitive resource, or all activity from suspicious IP. Dashboard should update in real-time or near real-time (under 1 minute latency). Provide role-based access controls where security team sees full details while other teams see anonymized aggregates. Export capabilities enable ad-hoc analysis in tools like Excel or Jupyter notebooks.

**Test it**: Verify dashboard shows security metrics accurately. Test real-time updates by triggering events and verifying they appear within expected latency. Test queries return correct results.

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing codebase for logging and monitoring gaps
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate structured logging with Winston, PII masking, and alerting
4. **Review generated code** using the Human Review Checklist above
5. **Replace console.log**: Convert all to Winston structured logging
6. **Implement sanitization**: Add PII masking for emails, IPs, and sensitive data
7. **Add security events**: Log all authentication, authorization, and validation events
8. **Configure alerting**: Set up real-time alerts for suspicious patterns
9. **Test logging**: Verify sensitive data masked and all security events logged
10. **Deploy gradually**: Start with authentication logs, expand to all security events
11. **Set up dashboard**: Create monitoring dashboard visualizing security metrics
12. **Document policies**: Define log retention, access controls, and incident response procedures

---

## 📖 Additional Resources

- **[OWASP A09:2021 - Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/)** — Official OWASP documentation
- **[OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)** — Comprehensive logging best practices
- **[OWASP Logging Vocabulary Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)** — Standardized event types
- **[Winston Logger Documentation](https://github.com/winstonjs/winston)** — Node.js structured logging library
- **[Pino Logger Documentation](https://getpino.io/)** — High-performance JSON logger
- **[Back to OWASP Overview](/docs/prompts/owasp/)** — See all 10 categories

---

**Remember**: Security logging failures allow breaches to go undetected for months. Implement structured JSON logging with Winston, never log sensitive data (passwords, tokens, secrets), mask PII (emails to u***@domain, IPs to x.x.x.***), log all security events (authentication, authorization, validation failures), configure real-time alerting on suspicious patterns (>5 failed logins, privilege escalation), retain logs for 30-90 days minimum, and protect log integrity with append-only permissions and centralized aggregation. Detection capability is security capability.
