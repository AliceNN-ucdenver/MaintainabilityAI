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

## Prompt 1: Analyze Code for Logging and Monitoring Failures

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Finds sensitive data in logs, missing security events, unstructured logging, and PII exposure — returns prioritized findings</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

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
Analyze the code in the current workspace for OWASP A09 vulnerabilities.

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
</details>

---

## Prompt 2: Implement Secure Logging and Monitoring

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generates Winston structured logging, PII masking, security event tracking, real-time alerting, and test coverage</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

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
</details>

---

## Example Output

<details style="margin: 16px 0;">
<summary style="cursor: pointer; padding: 8px 0; font-size: 16px; font-weight: 700; color: #fca5a5;">
❌ Before — Vulnerable Code
</summary>

```typescript
// CRITICAL: Logs passwords and tokens in plaintext
export function login(email: string, password: string) {
  console.log('Login attempt', { email, password }); // Logs password!

  const user = authenticateUser(email, password);

  if (user) {
    const token = generateToken(user.id);
    console.log('Login successful', { email, token }); // Logs session token!
    return token;
  }

  console.log('Login failed'); // Missing context: IP, timestamp, user agent
  return null;
}

// CRITICAL: No security event logging
export function deleteUser(adminId: string, userId: string) {
  // No log of who deleted whom
  db.query('DELETE FROM users WHERE id = $1', [userId]);
  return { message: 'User deleted' };
}

// Attack: Passwords stored in logs, accessible to anyone with log access
// Attack: No audit trail for privilege escalation or data deletion
// Attack: Breaches go undetected for months due to missing security logs
```

</details>

<details style="margin: 16px 0;">
<summary style="cursor: pointer; padding: 8px 0; font-size: 16px; font-weight: 700; color: #86efac;">
✅ After — Secure Code
</summary>

```typescript
// SECURE: Structured logging with PII masking and security event tracking
import winston from 'winston';

// Configure structured logger with Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json() // Structured JSON format
  ),
  defaultMeta: {
    service: 'auth-service',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  },
  transports: [
    // Error logs in separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 30, // Keep 30 days
    }),
    // Security events in separate file
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'warn',
      maxsize: 10485760,
      maxFiles: 90, // Keep 90 days for compliance
    }),
    // All logs combined
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 30,
    }),
  ],
});

// Console transport in development only
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Sensitive data masking functions
function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) return '***@***.***';

  // Show first character only: user@example.com -> u***@example.com
  const maskedUsername = username.charAt(0) + '***';
  return `${maskedUsername}@${domain}`;
}

function maskIP(ip: string): string {
  const parts = ip.split('.');

  if (parts.length === 4) {
    // IPv4: 192.168.1.100 -> 192.168.1.***
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }

  // IPv6: just show first segment
  const ipv6Parts = ip.split(':');
  return `${ipv6Parts[0]}:***`;
}

function maskCreditCard(cc: string): string {
  // Show only last 4 digits: 1234-5678-9012-3456 -> ****-****-****-3456
  const digits = cc.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return '****-****-****-' + digits.slice(-4);
}

function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  // Never log these fields (complete removal)
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
      delete sanitized[field]; // Remove entirely
    }
  }

  // Mask PII fields (partial redaction)
  if (sanitized.email && typeof sanitized.email === 'string') {
    sanitized.email = maskEmail(sanitized.email);
  }

  if (sanitized.ipAddress && typeof sanitized.ipAddress === 'string') {
    sanitized.ipAddress = maskIP(sanitized.ipAddress);
  }

  if (sanitized.ip && typeof sanitized.ip === 'string') {
    sanitized.ip = maskIP(sanitized.ip);
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

// Security event types
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

// Track failed login attempts for alerting
const failedLoginAttempts = new Map<string, number[]>();

// Determine if security event requires real-time alert
function shouldAlert(event: SecurityEvent): boolean {
  const now = Date.now();

  // Alert on multiple failed logins from same IP (brute force)
  if (event.type === SecurityEventType.LOGIN_FAILURE && event.ipAddress) {
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const attempts = failedLoginAttempts.get(event.ipAddress) || [];
    const recentAttempts = attempts.filter(time => time > fiveMinutesAgo);
    recentAttempts.push(now);

    failedLoginAttempts.set(event.ipAddress, recentAttempts);

    // Alert if >5 failed logins in 5 minutes
    if (recentAttempts.length > 5) {
      return true;
    }
  }

  // Alert on privilege escalation attempts
  if (event.type === SecurityEventType.PRIVILEGE_ESCALATION) {
    return true;
  }

  // Alert on access denied to admin resources
  if (event.type === SecurityEventType.ACCESS_DENIED &&
      event.resource?.includes('admin')) {
    return true;
  }

  // Alert on rate limit violations
  if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
    return true;
  }

  // Alert on suspicious activity
  if (event.type === SecurityEventType.SUSPICIOUS_ACTIVITY) {
    return true;
  }

  // Alert on user/role changes
  if (event.type === SecurityEventType.USER_DELETED ||
      event.type === SecurityEventType.ROLE_CHANGED) {
    return true;
  }

  return false;
}

// Send security alert to monitoring system
async function sendSecurityAlert(logEntry: any): Promise<void> {
  // Console alert for development
  console.error('SECURITY ALERT:', JSON.stringify(logEntry, null, 2));

  // Production: send to monitoring service
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
  //   text: `Security Alert: ${logEntry.eventType}`,
  //   attachments: [{ text: JSON.stringify(logEntry, null, 2) }],
  // });
}

// Log security event with sanitization and alerting
export function logSecurityEvent(event: SecurityEvent): void {
  // Sanitize sensitive data
  const sanitized = sanitizeLogData(event);

  // Add timestamp if not present
  const logEntry = {
    timestamp: event.timestamp || new Date().toISOString(),
    eventType: event.type,
    outcome: event.outcome,
    ...sanitized,
  };

  // Log at appropriate level
  if (event.outcome === 'failure') {
    logger.warn('Security event', logEntry);
  } else if (event.outcome === 'success') {
    logger.info('Security event', logEntry);
  }

  // Send alert if critical
  if (shouldAlert(event)) {
    sendSecurityAlert(logEntry).catch(err => {
      logger.error('Failed to send security alert', { error: err.message });
    });
  }
}

// Example: Secure login logging
export function login(email: string, password: string, ipAddress: string, userAgent: string) {
  const user = authenticateUser(email, password);

  if (user) {
    const token = generateToken(user.id);

    // Log successful login (password NOT included)
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

  // Log failed login with context
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

// Example: Log authorization failure
export function deleteUser(adminId: string, userId: string, ipAddress: string) {
  const admin = getUserById(adminId);

  // Check authorization
  if (admin.role !== 'admin') {
    // Log access denied
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

  // Perform deletion
  db.query('DELETE FROM users WHERE id = $1', [userId]);

  // Log user deletion
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

// Example: Log validation failure
export function validateInput(input: string, schema: any, ipAddress: string) {
  const result = schema.safeParse(input);

  if (!result.success) {
    // Log validation failure (don't log actual malicious input)
    logSecurityEvent({
      type: SecurityEventType.VALIDATION_FAILURE,
      ipAddress,
      outcome: 'failure',
      reason: 'Input validation failed',
      metadata: {
        errors: result.error.issues.map(i => i.message),
        // Don't log: input (may contain injection attempts)
      },
    });

    throw new Error('Invalid input');
  }

  return result.data;
}

// Additional security patterns:
// - All authentication events logged (success and failure)
// - All authorization failures logged
// - Sensitive data never logged (passwords, tokens, secrets)
// - PII masked (emails, IPs)
// - Structured JSON format for easy parsing
// - Real-time alerting on suspicious patterns
// - Log rotation with 30+ day retention
// - Contextual metadata (userId, IP, timestamp, action)
```

</details>

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 16px;">Before merging AI-generated logging code:</div>

<div style="display: grid; gap: 12px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Structured Logging & Sensitive Data</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All logging uses Winston (or similar) with JSON format — no console.log<br/>
    ✓ Passwords, tokens, API keys, session IDs never logged<br/>
    ✓ Emails masked (u***@domain), IPs masked (x.x.x.***)<br/>
    ✓ Sanitization is recursive for nested objects<br/>
    ✓ Separate log files: error.log, security.log, combined.log<br/>
    ✓ <strong style="color: #94a3b8;">Test:</strong> grep codebase for console.log verify replaced; search logs for literal passwords/tokens verify none
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fdba74; margin-bottom: 8px;">Security Event Coverage</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All auth events logged: login success/failure, logout, session expiry<br/>
    ✓ Authorization failures logged with userId, resource, action, IP<br/>
    ✓ Validation failures and rate-limit violations logged<br/>
    ✓ Privilege changes (role modifications, user deletion) have audit trail<br/>
    ✓ Standardized SecurityEventType enum — not freeform strings<br/>
    ✓ <strong style="color: #94a3b8;">Test:</strong> trigger failed login, access denied, validation error — verify all logged with context
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #93c5fd; margin-bottom: 8px;">Alerting & Retention</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Real-time alerts for brute force (>5 failures/5 min), privilege escalation, admin access denied<br/>
    ✓ Alert destinations configured (Sentry, DataDog, PagerDuty, Slack)<br/>
    ✓ Alert throttling prevents notification flooding<br/>
    ✓ Log rotation: 10MB max, 30-day general / 90-day security retention<br/>
    ✓ <strong style="color: #94a3b8;">Test:</strong> trigger 6 failed logins from same IP — verify alert fires within 1 minute
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #86efac; margin-bottom: 8px;">Log Integrity & Monitoring</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Append-only file permissions; centralized aggregation to SIEM<br/>
    ✓ Log signing (HMAC-SHA256) for tamper detection<br/>
    ✓ Every log answers: who, what, where, when, outcome<br/>
    ✓ Request/trace ID for cross-service correlation<br/>
    ✓ <strong style="color: #94a3b8;">Test:</strong> verify log file permissions (640+); attempt modification verify detection; test log shipping
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Prompt 1** → analyze existing codebase for logging gaps
2. **Prioritize** by risk (Critical > High > Medium)
3. **Prompt 2** → generate Winston logging, PII masking, and alerting
4. **Review** with the checklist above
5. **Replace all console.log** with structured Winston logging
6. **Configure alerting** for brute force and privilege escalation patterns

---

## Resources

- [OWASP A09:2021 - Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Logging Vocabulary Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)
- [Winston Logger Documentation](https://github.com/winstonjs/winston)
- [Back to OWASP Overview](/docs/prompts/owasp/)

---

**Key principle**: Never log secrets, always mask PII, log every security event in structured JSON, alert in real-time on suspicious patterns, and retain logs long enough for forensic analysis. Detection capability is security capability.
