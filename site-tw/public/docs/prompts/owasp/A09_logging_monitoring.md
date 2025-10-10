# A09: Security Logging and Monitoring Failures — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: structured logging, sensitive data masking, alerting, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security engineer implementing OWASP A09:2021 - Security Logging and Monitoring Failures.

Context:
- Node 18 + TypeScript
- Implementing comprehensive security event logging
- Use structured logging (Winston or Pino)
- Mask sensitive data (passwords, tokens, PII)
- Monitor for security events (failed logins, access violations)
- Implement alerting for critical security events
- Log integrity protection

Security Requirements:
- Never log passwords, tokens, API keys, or credit cards
- Mask PII (email, IP addresses partially)
- Use structured logging with JSON format
- Log all authentication events (success and failure)
- Log authorization failures
- Include contextual data (user ID, IP, timestamp, action)
- Implement log rotation and retention
- Set up alerts for suspicious patterns
- Protect log integrity (append-only, signed logs)
- Monitor rate of failed attempts

Task:
1) Refactor `examples/owasp/A09_logging_monitoring/insecure.ts` to implement secure logging
2) Replace insecure logging with structured logger:
   - Never log raw passwords or secrets
   - Mask sensitive fields (email, IP addresses)
   - Use consistent JSON format
3) Implement security event logging:
   - Authentication attempts (success/failure)
   - Authorization failures
   - Input validation failures
   - Rate limit violations
4) Add log data sanitization:
   - Mask passwords (never log)
   - Partial mask emails (u***@example.com)
   - Partial mask IPs (192.168.1.***)
5) Create alerting rules for security events
6) Run tests in `examples/owasp/A09_logging_monitoring/__tests__/logging.test.ts` and ensure they pass

Security Checklist:
□ Structured logging with JSON format
□ Never log passwords, tokens, or secrets
□ PII masked or partially redacted
□ All authentication events logged
□ Authorization failures logged
□ Contextual data included (user, IP, timestamp)
□ Log rotation and retention configured
□ Alerts set up for suspicious patterns
□ Tests verify sensitive data is masked
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security engineer. Fix OWASP A09: Security Logging and Monitoring Failures in examples/owasp/A09_logging_monitoring/insecure.ts.

Requirements:
- Remove password and secret logging
- Implement structured JSON logging (Winston or Pino)
- Mask sensitive data: passwords (never), emails (partial), IPs (partial)
- Log security events: authentication, authorization, validation failures
- Add contextual data: userId, IP, timestamp, action
- Configure log rotation
- Set up alerting for critical events
- Tests must pass in __tests__/logging.test.ts

Logging Standards:
- Format: Structured JSON
- Passwords: Never log
- Emails: Mask to u***@example.com
- IPs: Mask to 192.168.1.***
- Include: timestamp, level, userId, action, outcome
- Rotate: Daily, keep 30 days
- Alert: >5 failed logins in 5 minutes
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
// ❌ INSECURE: Logs secrets and PII
export function logLogin(email: string, password: string) {
  console.log('LOGIN', { email, password }); // ❌ Logs password!
}
```

**Problems**:
- Logs passwords in plaintext
- No data masking
- Unstructured logging
- No security event context

### After (Secure)
```typescript
// ✅ SECURE: Structured logging with sensitive data masking
import winston from 'winston';

// ✅ Configure structured logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-service' },
  transports: [
    // ✅ Error logs to separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 30,
    }),
    // ✅ All logs to combined file
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 30,
    }),
  ],
});

// ✅ Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// ✅ Sensitive data masking functions
function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) return '***';

  // Show first character only
  const maskedUsername = username[0] + '***';
  return `${maskedUsername}@${domain}`;
}

function maskIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    // Mask last octet: 192.168.1.***
    return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  }
  return '***';
}

function sanitizeLogData(data: any): any {
  const sanitized = { ...data };

  // ✅ Never log these fields
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  // ✅ Mask PII fields
  if (sanitized.email) {
    sanitized.email = maskEmail(sanitized.email);
  }

  if (sanitized.ipAddress) {
    sanitized.ipAddress = maskIP(sanitized.ipAddress);
  }

  return sanitized;
}

// ✅ Security event types
enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  ACCESS_DENIED = 'access_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  VALIDATION_FAILURE = 'validation_failure',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
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
}

export function logSecurityEvent(event: SecurityEvent): void {
  // ✅ Sanitize sensitive data
  const sanitized = sanitizeLogData(event);

  // ✅ Add timestamp and severity
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType: event.type,
    outcome: event.outcome,
    ...sanitized,
  };

  // ✅ Log at appropriate level
  if (event.outcome === 'failure') {
    logger.warn('Security event', logEntry);
  } else {
    logger.info('Security event', logEntry);
  }

  // ✅ Alert on critical events
  if (shouldAlert(event)) {
    sendSecurityAlert(logEntry);
  }
}

// ✅ Example: Log login attempt (secure)
export function logLogin(email: string, password: string, ipAddress: string, outcome: 'success' | 'failure', userId?: string): void {
  logSecurityEvent({
    type: outcome === 'success' ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILURE,
    userId,
    email,  // Will be masked by sanitizeLogData
    ipAddress,  // Will be masked by sanitizeLogData
    outcome,
    // ❌ Password is NOT included
  });
}

// ✅ Example: Log authorization failure
export function logAccessDenied(userId: string, resource: string, action: string, ipAddress: string): void {
  logSecurityEvent({
    type: SecurityEventType.ACCESS_DENIED,
    userId,
    resource,
    action,
    ipAddress,
    outcome: 'failure',
    reason: 'Insufficient permissions',
  });
}

// ✅ Track failed login attempts for alerting
const failedLoginAttempts = new Map<string, number[]>();

function shouldAlert(event: SecurityEvent): boolean {
  // Alert on multiple failed logins from same IP
  if (event.type === SecurityEventType.LOGIN_FAILURE && event.ipAddress) {
    const now = Date.now();
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

  // Alert on rate limit violations
  if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
    return true;
  }

  // Alert on access to sensitive resources
  if (event.type === SecurityEventType.ACCESS_DENIED &&
      event.resource?.includes('admin')) {
    return true;
  }

  return false;
}

function sendSecurityAlert(logEntry: any): void {
  // ✅ Send alert to security team
  console.error('SECURITY ALERT:', JSON.stringify(logEntry, null, 2));

  // In production: send to alerting system (PagerDuty, Slack, email, etc.)
  // await notificationService.send({
  //   severity: 'high',
  //   title: 'Security Alert',
  //   message: logEntry,
  // });
}

// ✅ Log validation failures
export function logValidationFailure(input: any, validationErrors: string[], ipAddress: string): void {
  logSecurityEvent({
    type: SecurityEventType.VALIDATION_FAILURE,
    ipAddress,
    outcome: 'failure',
    reason: 'Input validation failed',
    metadata: {
      errors: validationErrors,
      // ❌ Don't log actual input (may contain injection attempts)
    },
  });
}
```

---

## Common Logging and Monitoring Failures

1. **Logging Sensitive Data**
   - Problem: Passwords, tokens, credit cards in logs
   - Fix: Never log secrets, mask PII

2. **No Security Event Logging**
   - Problem: Failed logins, access denials not logged
   - Fix: Log all authentication and authorization events

3. **Unstructured Logs**
   - Problem: Difficult to parse and search
   - Fix: Structured JSON logging

4. **No Alerting**
   - Problem: Security events go unnoticed
   - Fix: Real-time alerts for suspicious patterns

5. **Insufficient Context**
   - Problem: Logs missing user ID, IP, timestamp
   - Fix: Include contextual metadata

6. **No Log Retention**
   - Problem: Logs deleted before investigation
   - Fix: Retain logs for 30-90 days minimum

7. **Log Tampering**
   - Problem: Attackers can modify or delete logs
   - Fix: Append-only, centralized logging, log signing

---

## Alerting Rules Examples

```typescript
interface AlertRule {
  name: string;
  condition: (events: SecurityEvent[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const alertRules: AlertRule[] = [
  {
    name: 'Brute Force Login Attempt',
    condition: (events) => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentFailures = events.filter(
        e => e.type === SecurityEventType.LOGIN_FAILURE &&
             new Date(e.timestamp || 0).getTime() > fiveMinutesAgo
      );
      return recentFailures.length > 5;
    },
    severity: 'high',
  },
  {
    name: 'Privilege Escalation Attempt',
    condition: (events) => {
      return events.some(
        e => e.type === SecurityEventType.ACCESS_DENIED &&
             e.resource?.includes('admin')
      );
    },
    severity: 'critical',
  },
  {
    name: 'Multiple Validation Failures',
    condition: (events) => {
      const oneMinuteAgo = Date.now() - 60 * 1000;
      const recentFailures = events.filter(
        e => e.type === SecurityEventType.VALIDATION_FAILURE &&
             new Date(e.timestamp || 0).getTime() > oneMinuteAgo
      );
      return recentFailures.length > 10;
    },
    severity: 'medium',
  },
];
```

---

## Log Monitoring Dashboard Metrics

```typescript
// ✅ Metrics to monitor
const securityMetrics = {
  // Authentication metrics
  totalLoginAttempts: 0,
  failedLoginAttempts: 0,
  successfulLogins: 0,
  accountLockouts: 0,

  // Authorization metrics
  accessDenials: 0,
  privilegeEscalationAttempts: 0,

  // Attack detection
  rateLimitViolations: 0,
  validationFailures: 0,
  suspiciousIPs: new Set<string>(),

  // Response metrics
  alertsSent: 0,
  incidentsCreated: 0,
};
```

---

## Testing Checklist

- [ ] Passwords never logged
- [ ] Tokens and secrets never logged
- [ ] Emails masked (u***@example.com)
- [ ] IP addresses masked (192.168.1.***)
- [ ] All authentication events logged
- [ ] Authorization failures logged
- [ ] Validation failures logged
- [ ] Structured JSON format used
- [ ] Contextual data included (user, IP, timestamp)
- [ ] Alerts triggered for suspicious patterns
- [ ] Log rotation configured
- [ ] Tests verify sensitive data masking

---

## What to Log

```typescript
// ✅ Always log these security events:
const securityEventsToLog = [
  'Authentication attempts (success and failure)',
  'Authorization failures (access denied)',
  'Input validation failures',
  'Rate limit violations',
  'Password reset requests',
  'Account lockouts',
  'Privilege changes',
  'Sensitive data access',
  'Configuration changes',
  'Application errors and exceptions',
];

// ❌ Never log these:
const neverLog = [
  'Passwords (plaintext or hashed)',
  'Session tokens',
  'API keys or secrets',
  'Credit card numbers',
  'Social Security numbers',
  'Cryptographic keys',
  'Complete stack traces in production',
];
```

---

## Log Format Example

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "warn",
  "service": "auth-service",
  "eventType": "login_failure",
  "outcome": "failure",
  "userId": null,
  "email": "u***@example.com",
  "ipAddress": "192.168.1.***",
  "userAgent": "Mozilla/5.0...",
  "reason": "Invalid credentials",
  "attemptNumber": 3,
  "requestId": "abc-123-def-456"
}
```

---

## Additional Resources

- [OWASP A09:2021 - Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Application Logging Vocabulary](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)
- [Winston Logger Documentation](https://github.com/winstonjs/winston)
- [Pino Logger Documentation](https://getpino.io/)
