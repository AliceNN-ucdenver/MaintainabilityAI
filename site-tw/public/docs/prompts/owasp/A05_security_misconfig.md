# Security Misconfiguration — OWASP A05 Prompt Pack

> **OWASP A05: Security Misconfiguration** occurs when applications fail to implement proper security settings, use insecure defaults, expose verbose error messages, or lack security hardening. This includes permissive CORS policies, missing security headers, default credentials, and environment-specific configuration failures.

---

## 🎯 What is Security Misconfiguration?

**Definition**: Security misconfiguration arises from improper or insecure configuration of applications, frameworks, web servers, databases, and cloud services. It's the most common vulnerability due to manual configuration complexity and lack of secure defaults.

**Common Manifestations**:
- **Permissive CORS**: Wildcard origins allowing any website to make requests
- **Missing Security Headers**: No CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Verbose Error Messages**: Stack traces and internal paths exposed to clients
- **Default Credentials**: Admin/admin, unchanged API keys, example passwords
- **Debug Mode in Production**: Verbose logging, debug endpoints enabled
- **Directory Listing**: File system structure exposed via web server

**Why It Matters**: Security misconfiguration ranked #5 in OWASP Top 10 2021, appearing in 90% of applications. Attackers exploit misconfigurations to gain unauthorized access, leak sensitive information, or compromise entire systems. Proper configuration management and secure defaults are essential for defense in depth.

---

## 🔗 Maps to STRIDE

**Primary**: **Information Disclosure** (verbose errors expose internals)
**Secondary**: **Tampering** (permissive CORS enables CSRF), **Elevation of Privilege** (default credentials grant admin access)

See also: [STRIDE: Information Disclosure](/docs/prompts/stride/information-disclosure), [STRIDE: Tampering](/docs/prompts/stride/tampering), and [STRIDE: Elevation of Privilege](/docs/prompts/stride/elevation-of-privilege)

---

## Prompt 1: Analyze Code for Security Misconfiguration Vulnerabilities

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Scans your server config for permissive CORS, missing headers, verbose errors, and insecure defaults</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a security engineer specializing in security misconfiguration vulnerabilities (OWASP A05).

Context:
I have a Node.js + TypeScript application with Express.js that needs proper security configuration across CORS, error handling, security headers, and environment-specific settings. I need to identify all configuration weaknesses.

My codebase includes:
- Express.js server configuration
- CORS settings for cross-origin requests
- Error handling middleware
- Environment variables for production/development
- Security headers configuration
- Cookie settings for authentication

Task:
Analyze the code in the current workspace for OWASP A05 vulnerabilities.

Identify:

1. **Permissive CORS**: Wildcard `*` origins, exposed sensitive headers
2. **Missing Security Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
3. **Verbose Error Messages**: Stack traces exposed in production, internal paths revealed
4. **Debug Mode in Production**: Verbose logging, debug endpoints accessible
5. **Default Credentials**: Hardcoded passwords, unchanged API keys, example secrets
6. **Insecure Cookie Settings**: Missing httpOnly, secure, sameSite flags
7. **Server Information Leakage**: X-Powered-By header revealing framework
8. **Environment Configuration Failures**: Same config for dev and production

For each vulnerability found:

**Location**: [File:Line or Function Name]
**Issue**: [Specific misconfiguration]
**Attack Vector**: [How an attacker would exploit this misconfiguration]
**Risk**: [Impact - information disclosure, CSRF, credential exposure]
**Remediation**: [Specific configuration changes with helmet.js, CORS allowlist, generic errors]

Requirements:
- Check CORS for wildcard origins
- Verify security headers are present
- Validate error handling doesn't leak information
- Ensure environment-specific configurations exist
- Look for default/hardcoded credentials
- Check cookie security settings

Output:
Provide a prioritized list of misconfigurations (Critical > High > Medium) with specific remediation examples using helmet.js, CORS allowlisting, and environment-based configuration.
```

</div>
</details>

---

## Prompt 2: Implement Secure Configuration

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generates helmet.js headers, CORS allowlisting, safe error handling, and env-specific config</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a security engineer implementing comprehensive secure configuration for a web application (OWASP A05 remediation).

Context:
I need to implement proper security configuration throughout my Node.js + TypeScript + Express.js application.

Current state:
- CORS allows all origins with `origin: '*'`
- No security headers configured
- Stack traces exposed to clients
- Same configuration for development and production
- X-Powered-By header reveals Express version

Requirements:
Implement the following secure configuration patterns:

1. **Restrictive CORS Configuration**
   - Replace wildcard `*` with specific allowed origins from environment variable
   - Function: corsConfig() returns cors middleware
   - Validate origin against allowlist dynamically
   - Only expose safe headers (Content-Length, X-Request-Id)
   - Set credentials: true only if needed with specific origins

2. **Security Headers with Helmet.js**
   - Content-Security-Policy: default-src 'self', restrict scripts/styles/images
   - Strict-Transport-Security: max-age 31536000, includeSubDomains
   - X-Frame-Options: DENY (prevent clickjacking)
   - X-Content-Type-Options: nosniff (prevent MIME sniffing)
   - Referrer-Policy: strict-origin-when-cross-origin
   - Function: securityHeaders() returns helmet middleware

3. **Safe Error Handling**
   - Generic error messages in production ("Internal server error")
   - Detailed errors only in development environment
   - Server-side logging with full stack traces
   - No SQL syntax, table names, or file paths exposed
   - Function: errorHandler(err, req, res, next)

4. **Environment-Specific Configuration**
   - Load from environment variables (process.env)
   - Different configs for NODE_ENV=production vs development
   - Disable debug mode and verbose logging in production
   - Function: getConfig() returns environment-appropriate settings
   - Never hardcode credentials, use env vars

5. **Secure Cookie Configuration**
   - httpOnly: true (prevent XSS access)
   - secure: true in production (HTTPS only)
   - sameSite: 'strict' or 'lax' (CSRF protection)
   - Domain and path restrictions

6. **Test Coverage**
   - Unit tests for CORS (verify allowlist enforced)
   - Tests for security headers presence
   - Tests for generic error messages in production
   - Tests for environment-specific behavior

Implementation:
- Use helmet.js for security headers
- Use cors library with origin validation function
- TypeScript strict mode with proper typing
- Comprehensive inline security comments
- Environment variables for all sensitive config

Output:
Provide complete, executable TypeScript code for:
- `config/security.ts` (corsConfig, securityHeaders, errorHandler functions)
- `config/environment.ts` (getConfig with env-specific settings)
- `.env.example` (template for environment variables)
- `__tests__/securityConfig.test.ts` (Jest tests for all configurations)
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
import express from 'express';
import cors from 'cors';

const app = express();

// Allows requests from ANY origin
app.use(cors({
  origin: '*',
  exposeHeaders: ['X-Stack-Trace']
}));

// No security headers configured

// Verbose error handling
app.use((err: Error, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack
  });
});

// Attack: Any website can make authenticated requests (CSRF)
// Attack: Stack traces reveal internal structure and file paths
// Attack: No CSP allows XSS exploitation
```

</details>

<details style="margin: 16px 0;">
<summary style="cursor: pointer; padding: 8px 0; font-size: 16px; font-weight: 700; color: #86efac;">
✅ After — Secure Code
</summary>

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

const app = express();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim());

// Restrictive CORS configuration
export function corsConfig() {
  return cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('CORS blocked', { origin, timestamp: new Date().toISOString() });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
  });
}

// Comprehensive security headers
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

// Safe error handling middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Application error:', {
    message: err.message,
    stack: IS_PRODUCTION ? undefined : err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  if (IS_PRODUCTION) {
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.headers['x-request-id'] || 'unknown',
    });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      requestId: req.headers['x-request-id'],
    });
  }
}

// Environment-specific configuration
export function getConfig() {
  return {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },

    cors: { allowedOrigins: ALLOWED_ORIGINS },

    features: {
      debugMode: !IS_PRODUCTION,
      verboseLogging: !IS_PRODUCTION,
      apiDocumentation: !IS_PRODUCTION,
    },

    rateLimiting: {
      windowMs: 15 * 60 * 1000,
      maxRequests: IS_PRODUCTION ? 100 : 1000,
    },

    session: {
      secret: process.env.SESSION_SECRET,
      name: 'sessionId',
      cookie: {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'strict' as const,
        maxAge: 24 * 60 * 60 * 1000,
      },
    },
  };
}

const config = getConfig();

app.use(securityHeaders());
app.use(corsConfig());
app.disable('x-powered-by');

if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: config.nodeEnv });
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
});

export { app };
```

</details>

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated security configuration code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">CORS & Security Headers</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Explicit origin allowlist from env vars — never wildcard *<br/>
    ✓ CSP restricts resources to trusted sources; HSTS with max-age >= 1 year<br/>
    ✓ X-Frame-Options: DENY; X-Content-Type-Options: nosniff<br/>
    ✓ X-Powered-By disabled; exposed headers minimal<br/>
    <strong style="color: #94a3b8;">Test:</strong> Request from allowed origin succeeds, non-allowed fails; curl verifies all security headers present
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Error Handling & Environment Config</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Production errors generic — no stack traces, file paths, or SQL syntax<br/>
    ✓ Full error details logged server-side only<br/>
    ✓ Environment-specific configs: debug/verbose logging disabled in production<br/>
    ✓ Required env vars validated at startup with fail-fast behavior<br/>
    <strong style="color: #94a3b8;">Test:</strong> Trigger errors in production mode — client sees only generic messages; missing env var — app fails to start
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Cookies & Credentials</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Cookies: httpOnly, secure (in prod), sameSite strict/lax, generic name<br/>
    ✓ Session ID regenerated after login to prevent fixation<br/>
    ✓ No hardcoded credentials — all secrets from env vars or vault<br/>
    ✓ Secret scanning in CI/CD to prevent accidental commits<br/>
    <strong style="color: #94a3b8;">Test:</strong> Inspect cookies in DevTools for correct flags; grep codebase for "password=", "apiKey:", "secret:"
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Defense in Depth</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Multiple independent layers: CORS + headers + error handling + rate limiting + cookies<br/>
    ✓ Directory listing disabled; custom 404 pages; no version info in responses<br/>
    ✓ Each layer functions independently — one failure does not compromise all<br/>
    <strong style="color: #94a3b8;">Test:</strong> Run OWASP ZAP or Mozilla Observatory to verify comprehensive configuration
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Use Prompt 1** to analyze your existing configuration for security weaknesses
2. **Use Prompt 2** to generate secure config with helmet.js and CORS allowlisting
3. **Review generated code** using the Human Review Checklist above
4. **Run security scanners**: Mozilla Observatory, SecurityHeaders.com, OWASP ZAP
5. **Remove default credentials** and change all example passwords
6. **Audit quarterly** for configuration drift from secure baseline

---

## Resources

- [OWASP A05:2021 - Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SecurityHeaders.com](https://securityheaders.com/)
- [Back to OWASP Overview](/docs/prompts/owasp/)

---

**Key principle**: Configuration is code — apply restrictive CORS, comprehensive security headers via helmet.js, and environment-specific settings. Never expose stack traces or use default credentials in production.
