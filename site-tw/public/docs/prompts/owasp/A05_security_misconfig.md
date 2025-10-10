# A05: Security Misconfiguration — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: secure defaults, restrictive CORS, error sanitization, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security engineer implementing OWASP A05:2021 - Security Misconfiguration.

Context:
- Node 18 + TypeScript
- Express.js or similar web framework
- Configuring CORS, error handling, and security headers
- Production deployment requires secure defaults
- Follow principle of least privilege for configurations
- Remove development/debug features in production

Security Requirements:
- Restrict CORS to specific trusted origins (not wildcard *)
- Remove verbose error messages in production
- Add security headers (CSP, HSTS, X-Frame-Options, etc.)
- Disable directory listing and debug modes
- Remove default credentials and example code
- Keep dependencies updated
- Use environment-specific configurations
- Never expose stack traces or internal details

Task:
1) Refactor `examples/owasp/A05_security_misconfig/insecure.ts` to use secure configuration
2) Fix CORS configuration:
   - Replace origin: '*' with specific allowed origins
   - Remove dangerous headers from exposeHeaders
   - Set credentials: true only if needed
3) Implement proper error handling:
   - Generic error messages in production
   - No stack traces exposed to clients
   - Detailed logs server-side only
4) Add security headers middleware:
   - Content-Security-Policy
   - Strict-Transport-Security
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
5) Environment-specific configuration (dev vs prod)
6) Run tests in `examples/owasp/A05_security_misconfig/__tests__/misconfig.test.ts` and ensure they pass

Security Checklist:
□ CORS restricted to specific origins (no wildcard)
□ No sensitive headers exposed (X-Stack-Trace, etc.)
□ Generic error messages in production
□ Security headers properly configured
□ No debug mode or verbose logging in production
□ Environment variables used for sensitive config
□ Default credentials removed
□ Tests verify secure configuration
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security engineer. Fix OWASP A05: Security Misconfiguration in examples/owasp/A05_security_misconfig/insecure.ts.

Requirements:
- Replace CORS origin: '*' with specific allowed origins
- Remove X-Stack-Trace from exposed headers
- Add security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- Generic error messages (no stack traces in production)
- Environment-based configuration (dev vs prod)
- Disable debug mode in production
- Tests must pass in __tests__/misconfig.test.ts

Security Headers Required:
- Content-Security-Policy: default-src 'self'
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
// ❌ INSECURE: Permissive CORS and verbose errors
export function corsConfig() {
  return {
    origin: '*',  // ❌ Allows any origin!
    exposeHeaders: ['X-Stack-Trace']  // ❌ Exposes internal errors!
  };
}
```

**Problems**:
- CORS allows any origin (CSRF risk)
- Exposes stack traces to clients
- No security headers
- Same config for dev and production

### After (Secure)
```typescript
// ✅ SECURE: Restrictive CORS and secure error handling
import cors from 'cors';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ✅ Allowed origins from environment variable
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim());

export function corsConfig() {
  return cors({
    // ✅ Restrict to specific origins
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    // ✅ Only expose safe headers
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400, // 24 hours
  });
}

// ✅ Security headers middleware
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Adjust as needed
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    strictTransportSecurity: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny', // X-Frame-Options: DENY
    },
    noSniff: true, // X-Content-Type-Options: nosniff
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  });
}

// ✅ Error handling middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // ✅ Log full error server-side
  console.error('Error:', {
    message: err.message,
    stack: IS_PRODUCTION ? undefined : err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // ✅ Generic response to client
  if (IS_PRODUCTION) {
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.headers['x-request-id'] || 'unknown',
    });
  } else {
    // ✅ Detailed errors in development only
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
}

// ✅ Environment-specific configuration
export function getConfig() {
  return {
    // ✅ Load from environment variables
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // ✅ Database configuration
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      // ❌ Never hardcode credentials
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },

    // ✅ Feature flags
    debug: !IS_PRODUCTION,
    verboseLogging: !IS_PRODUCTION,

    // ✅ Security settings
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: IS_PRODUCTION ? 100 : 1000,
  };
}
```

### Express.js Integration Example
```typescript
import express from 'express';
import { corsConfig, securityHeaders, errorHandler, getConfig } from './config';

const app = express();
const config = getConfig();

// ✅ Apply security middleware
app.use(securityHeaders());
app.use(corsConfig());

// ✅ Disable X-Powered-By header
app.disable('x-powered-by');

// ✅ Your routes here
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ✅ Error handler last
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
```

---

## Common Security Misconfigurations

1. **Permissive CORS**
   - Problem: origin: '*' allows any website to make requests
   - Fix: Whitelist specific origins

2. **Verbose Error Messages**
   - Problem: Stack traces and internal paths exposed
   - Fix: Generic errors in production, detailed logs server-side

3. **Missing Security Headers**
   - Problem: No CSP, HSTS, X-Frame-Options
   - Fix: Use helmet.js or implement manually

4. **Default Credentials**
   - Problem: Admin/admin, default API keys
   - Fix: Force credential change on first use

5. **Debug Mode in Production**
   - Problem: Verbose logging, debug endpoints enabled
   - Fix: Environment-specific configuration

6. **Unpatched Dependencies**
   - Problem: Known vulnerabilities in dependencies
   - Fix: Regular npm audit and updates

7. **Exposed Sensitive Endpoints**
   - Problem: /admin, /debug, /metrics publicly accessible
   - Fix: Authentication required, IP whitelist

---

## Security Headers Explained

```typescript
// Content-Security-Policy: Prevents XSS and injection attacks
"Content-Security-Policy": "default-src 'self'"

// Strict-Transport-Security: Forces HTTPS
"Strict-Transport-Security": "max-age=31536000; includeSubDomains"

// X-Frame-Options: Prevents clickjacking
"X-Frame-Options": "DENY"

// X-Content-Type-Options: Prevents MIME sniffing
"X-Content-Type-Options": "nosniff"

// Referrer-Policy: Controls referrer information
"Referrer-Policy": "strict-origin-when-cross-origin"

// Permissions-Policy: Controls browser features
"Permissions-Policy": "geolocation=(), microphone=(), camera=()"
```

---

## Testing Checklist

- [ ] CORS only allows whitelisted origins
- [ ] No wildcard (*) in CORS configuration
- [ ] Error responses don't include stack traces in production
- [ ] Security headers are present in responses
- [ ] X-Powered-By header removed
- [ ] Debug endpoints disabled in production
- [ ] Environment variables used for sensitive config
- [ ] Tests verify configuration for both dev and prod environments

---

## Configuration Audit Checklist

- [ ] CORS origin whitelist reviewed and minimal
- [ ] All security headers implemented
- [ ] Error handling doesn't leak information
- [ ] Debug/verbose modes disabled in production
- [ ] Default credentials removed/changed
- [ ] Directory listing disabled
- [ ] Unnecessary HTTP methods disabled (OPTIONS, TRACE)
- [ ] TLS/SSL properly configured (minimum TLS 1.2)
- [ ] Cookie settings secure (httpOnly, secure, sameSite)

---

## Environment Variables Template

```bash
# .env.production (never commit this file!)

NODE_ENV=production
PORT=3000

# Allowed CORS origins (comma-separated)
ALLOWED_ORIGINS=https://example.com,https://www.example.com

# Database credentials
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_USER=app_user
DB_PASSWORD=<strong-password-here>

# Encryption keys
ENCRYPTION_KEY=<64-char-hex-string>
JWT_SECRET=<strong-random-secret>

# Feature flags
DEBUG_MODE=false
VERBOSE_LOGGING=false
```

---

## Additional Resources

- [OWASP A05:2021 - Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SecurityHeaders.com](https://securityheaders.com/)
