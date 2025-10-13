# Security Misconfiguration — OWASP A05 Prompt Pack

> **OWASP A05: Security Misconfiguration** occurs when applications fail to implement proper security settings, use insecure defaults, expose verbose error messages, or lack security hardening. This includes permissive CORS policies, missing security headers, default credentials, and environment-specific configuration failures.

---

## 🎯 What is Security Misconfiguration?

**Definition**: Security misconfiguration arises from improper or insecure configuration of applications, frameworks, web servers, databases, and cloud services. It's the most common vulnerability due to manual configuration complexity and lack of secure defaults.

**Common Manifestations**:
- **Permissive CORS**: Wildcard `*` origins allowing any website to make requests
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

## 🤖 AI Prompt #1: Analyze Code for Security Misconfiguration Vulnerabilities

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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
Analyze the following code/files for OWASP A05 vulnerabilities:

[PASTE YOUR CODE HERE - server config, CORS settings, error handlers, middleware, environment configs]

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

---

## 🤖 AI Prompt #2: Implement Secure Configuration

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: Permissive CORS and no security headers
import express from 'express';
import cors from 'cors';

const app = express();

// ❌ Allows requests from ANY origin
app.use(cors({
  origin: '*',
  exposeHeaders: ['X-Stack-Trace'] // ❌ Exposes internal errors!
}));

// ❌ No security headers configured

// ❌ Verbose error handling
app.use((err: Error, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack // ❌ Exposes stack trace to clients!
  });
});

// Attack: Any website can make authenticated requests (CSRF)
// Attack: Stack traces reveal internal structure and file paths
// Attack: No CSP allows XSS exploitation
```

### After (Secure Code)

```typescript
// ✅ SECURE: Restrictive CORS, security headers, safe error handling
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

const app = express();

// ✅ Environment detection
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ✅ Allowed origins from environment variable
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim());

// ✅ Restrictive CORS configuration
export function corsConfig() {
  return cors({
    // ✅ Validate origin against allowlist
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('CORS blocked', { origin, timestamp: new Date().toISOString() });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    // ✅ Only expose safe headers
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400, // 24 hours
  });
}

// ✅ Comprehensive security headers
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Adjust for your CSS needs
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

// ✅ Safe error handling middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // ✅ Log full error server-side only
  console.error('Application error:', {
    message: err.message,
    stack: IS_PRODUCTION ? undefined : err.stack, // Stack only in dev
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // ✅ Generic response in production
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
      requestId: req.headers['x-request-id'],
    });
  }
}

// ✅ Environment-specific configuration
export function getConfig() {
  return {
    // ✅ Server configuration
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // ✅ Database configuration (from environment)
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      // ❌ Never hardcode credentials
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },

    // ✅ Security configuration
    cors: {
      allowedOrigins: ALLOWED_ORIGINS,
    },

    // ✅ Feature flags (environment-specific)
    features: {
      debugMode: !IS_PRODUCTION,
      verboseLogging: !IS_PRODUCTION,
      apiDocumentation: !IS_PRODUCTION,
    },

    // ✅ Rate limiting (stricter in production)
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: IS_PRODUCTION ? 100 : 1000,
    },

    // ✅ Session configuration
    session: {
      secret: process.env.SESSION_SECRET,
      name: 'sessionId', // Don't reveal framework
      cookie: {
        httpOnly: true,
        secure: IS_PRODUCTION, // HTTPS only in production
        sameSite: 'strict' as const,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    },
  };
}

// ✅ Apply all security middleware
const config = getConfig();

app.use(securityHeaders());
app.use(corsConfig());

// ✅ Disable X-Powered-By header
app.disable('x-powered-by');

// ✅ Trust proxy if behind reverse proxy (for correct IP logging)
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

// ✅ Your routes here
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.nodeEnv
  });
});

// ✅ Error handler last
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
});

export { app };
```

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated security configuration code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">CORS Configuration</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Explicit allowlist of permitted origins used, never wildcard * which allows any website<br/>
    ✓ Origins loaded from environment variables and validated on every request<br/>
    ✓ Origin validation checks exact match including protocol and port<br/>
    ✓ Credentials only enabled when necessary and paired with specific allowed origins<br/>
    ✓ Exposed headers minimal, only safe values like Content-Length<br/>
    ✓ Preflight cache (maxAge) set to reasonable value, typically 24 hours<br/>
    ✓ Test: Attempt requests from allowed origin (succeed) and non-allowed origin (fail with CORS error)
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Security Headers</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Comprehensive security headers using helmet.js or manual configuration<br/>
    ✓ Content-Security-Policy restricts resource loading to trusted sources, typically 'self'<br/>
    ✓ Strict-Transport-Security enforces HTTPS with maxAge at least 1 year and includeSubDomains<br/>
    ✓ X-Frame-Options set to DENY or SAMEORIGIN to prevent clickjacking<br/>
    ✓ X-Content-Type-Options set to nosniff to prevent MIME sniffing attacks<br/>
    ✓ Referrer-Policy limits referrer information leakage<br/>
    ✓ Test: Use browser DevTools or curl to verify all security headers present with correct values
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Error Handling</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Error responses environment-aware, generic messages in production, detailed only in development<br/>
    ✓ Production errors never expose stack traces, file paths, SQL syntax, or internal system details<br/>
    ✓ All errors logged server-side with full context for debugging<br/>
    ✓ Error messages include request ID for correlation between client and server logs<br/>
    ✓ Different error types have specific status codes but don't leak sensitive details<br/>
    ✓ Error logs monitored for patterns indicating attacks<br/>
    ✓ Test: Trigger errors in production mode, verify generic messages to client, full details in server logs
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Environment Configuration</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Configuration externalized to environment variables, never hardcoded in source code<br/>
    ✓ Different .env files for development and production, never commit .env to version control<br/>
    ✓ All sensitive values (database passwords, API keys, session secrets) from environment variables<br/>
    ✓ .env.example template provided with placeholder values for developers<br/>
    ✓ Required environment variables validated at application startup with fail-fast behavior<br/>
    ✓ Environment-specific feature flags disable debug mode, verbose logging, API docs in production<br/>
    ✓ Test: Run application without required environment variables, verify clear error message and failure
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Cookie Security</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Session cookies have httpOnly flag to prevent JavaScript access, protecting against XSS<br/>
    ✓ Secure flag set in production ensuring cookies only transmitted over HTTPS<br/>
    ✓ SameSite attribute set to 'strict' or 'lax' to prevent CSRF attacks<br/>
    ✓ Cookie name generic, not revealing framework or technology<br/>
    ✓ Domain and path as restrictive as possible<br/>
    ✓ Appropriate expiration set matching session timeout<br/>
    ✓ Session ID regenerated after login to prevent fixation attacks<br/>
    ✓ Test: Inspect cookies in browser DevTools, verify httpOnly, secure, and sameSite flags set correctly
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Credential Management</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Never hardcode credentials, API keys, or secrets in source code<br/>
    ✓ All sensitive values loaded from environment variables or secure vault systems<br/>
    ✓ Default credentials changed before deployment<br/>
    ✓ Example passwords, test API keys, and demo secrets removed from production configuration<br/>
    ✓ Credentials rotated regularly, especially after personnel changes<br/>
    ✓ Strong, randomly generated secrets used for session signing and encryption<br/>
    ✓ Credentials stored encrypted at rest<br/>
    ✓ Secret scanning implemented in CI/CD to prevent accidental commits<br/>
    ✓ Test: Search codebase for patterns like "password=", "apiKey:", "secret:" and verify no hardcoded values
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Information Disclosure Prevention</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Server version headers like X-Powered-By disabled to not reveal technology stack<br/>
    ✓ Comments removed from production HTML/JavaScript that expose architecture or vulnerabilities<br/>
    ✓ Directory listing disabled in web server configuration<br/>
    ✓ Database errors configured to not expose table structures or query syntax<br/>
    ✓ Custom 404 pages implemented that don't reveal application structure<br/>
    ✓ Verbose logging turned off in production<br/>
    ✓ Stack traces and debug information only logged server-side, never sent to clients<br/>
    ✓ Test: Check HTTP response headers for version info, attempt non-existent paths and verify generic 404
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Defense in Depth</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Multiple independent layers of protection implemented in security configuration<br/>
    ✓ CORS restricts which websites can make requests<br/>
    ✓ Security headers protect against various attacks (XSS, clickjacking, MIME sniffing)<br/>
    ✓ Error handling prevents information leakage<br/>
    ✓ Rate limiting prevents abuse<br/>
    ✓ Input validation protects against injection<br/>
    ✓ Cookie settings prevent session hijacking<br/>
    ✓ Each layer functions independently, one failure doesn't compromise all protections<br/>
    ✓ Regular security audits verify all layers properly configured and functioning<br/>
    ✓ Test: Use automated security scanners (OWASP ZAP, Mozilla Observatory) to verify comprehensive configuration
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing configuration for security weaknesses
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate secure configuration with helmet.js and CORS allowlisting
4. **Review generated code** using the Human Review Checklist above
5. **Test thoroughly**: CORS validation, security headers, error messages, environment behavior
6. **Use security scanners**: Mozilla Observatory, SecurityHeaders.com, OWASP ZAP
7. **Implement environment-specific configs**: Separate dev and production settings
8. **Remove default credentials**: Change all default passwords and API keys
9. **Regular audits**: Review configuration quarterly for drift from secure baseline

---

## 📖 Additional Resources

- [OWASP A05:2021 - Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SecurityHeaders.com](https://securityheaders.com/)

---

**Remember**: Security misconfiguration is preventable through restrictive CORS (specific origins only), comprehensive security headers (helmet.js), safe error handling (generic messages in production), and environment-specific configuration (never hardcode credentials). Configuration is code and must be reviewed with same rigor.
