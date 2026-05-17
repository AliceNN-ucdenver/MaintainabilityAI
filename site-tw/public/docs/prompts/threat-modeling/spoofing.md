<div class="docs-hero docs-hero-amber">
  <div class="docs-hero-glyph"><img src="/images/glyphs/magnifier.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/prompts/threat-modeling/">STRIDE</a><span class="sep">/</span><span>Spoofing identity</span></div>
    <div class="docs-eyebrow">STRIDE · Spoofing <span class="docs-hero-meta">~6 min read</span></div>
    <h1 class="docs-hero-title">Spoofing identity</h1>
    <p class="docs-hero-copy">is pretending to be someone or something else to gain unauthorized access. This STRIDE category focuses on authentication failures where attackers impersonate legitimate users, systems, or services.</p>
    <span class="docs-hero-flourish">&ldquo;Who in the world am <em>I</em>?&rdquo; &mdash; the question every authn check answers.</span>
  </div>
</div>


## 🎯 What is Spoofing?

**Definition**: An attacker claims to be a user, system, or service they are not. Spoofing threatens **authentication** — the process of proving identity before granting access to resources.

**Common Spoofing Attack Vectors**:
- **Credential Theft**: Phishing, keylogging, credential stuffing against weak passwords
- **Session Hijacking**: Stealing or predicting session tokens to bypass login
- **Token Replay**: Reusing captured JWT or API tokens
- **Weak Secrets**: Guessing or brute-forcing predictable authentication tokens
- **Man-in-the-Middle**: Intercepting credentials during transmission

**Why It Matters**: Successful spoofing attacks lead to complete account takeover, unauthorized access to sensitive data, and privilege escalation. Authentication is the first line of defense — if it fails, all other security controls become irrelevant.

---

## 🔗 Maps to OWASP

**Primary**: [A07 - Identification and Authentication Failures](/docs/prompts/owasp/A07_authn_failures)
**Secondary**: [A02 - Cryptographic Failures](/docs/prompts/owasp/A02_crypto_failures) (weak secrets, insecure token generation)

---

## Prompt: Identify Spoofing Threats in Architecture

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span class="docs-copy">Analyze your architecture for identity spoofing threats across authentication, sessions, and API keys</span>
</summary>

<div>

```
Role: You are a security architect specializing in authentication and identity management. Your task is to perform STRIDE threat modeling focusing on Spoofing (S) threats.

Context:
Analyze the architecture of the current project.

Example:
- React SPA frontend (public internet)
- Node.js REST API (JWT authentication)
- PostgreSQL database
- Redis session store
- Auth0 for OAuth/SSO
- Microservices communicate via API keys
- Mobile app with biometric authentication
- Admin portal with separate login

Task:
Analyze this architecture for Spoofing threats. For each component, trust boundary, and data flow, identify where an attacker could impersonate a legitimate identity.

Format:
For each threat, provide:

**Threat**: [One-line description]
**Component**: [Which part of the system is vulnerable]
**Attack Scenario**: [Step-by-step attack walkthrough]
**Impact**: [What happens if successful — data breach, privilege escalation, etc.]
**Likelihood**: [High/Medium/Low based on common attacker capabilities]
**Mitigation**: [Specific controls to prevent or detect this attack]
**OWASP Mapping**: [A07, A02, etc.]
**Code Example**: [Show vulnerable pattern and secure fix]

Focus Areas:
Pay special attention to:
- Login and authentication endpoints (password, OAuth, SSO)
- Session management (cookies, JWTs, server-side sessions)
- API authentication (API keys, bearer tokens, OAuth scopes)
- Service-to-service authentication (microservice trust boundaries)
- Password reset and account recovery flows
- "Remember me" and persistent login mechanisms
- Multi-factor authentication bypass scenarios
- Token refresh and rotation logic

Output:
Provide 3-5 high-priority spoofing threats with complete details. Prioritize threats that are both likely and high-impact.
```

</div>
</details>

---

## Example AI Output

### Threat 1: JWT Token Forgery via Weak Signing Secret

**Threat**: Attacker discovers JWT signing secret and forges valid tokens for any user

**Component**: API authentication middleware (/api/auth/verify)

**Attack Scenario**:
1. Developer hardcodes JWT secret "supersecret123" in client-side React code
2. Attacker inspects browser JavaScript bundle and finds secret
3. Attacker uses jwt.io to generate new token with {"userId": 1, "role": "admin"}
4. Attacker signs token with discovered secret
5. API validates signature successfully and grants admin access

**Impact**: Complete authentication bypass. Attacker can impersonate any user including administrators, access all data, and perform privileged operations.

**Likelihood**: High (secrets in client code are trivially discoverable)

**Mitigation**:
```typescript
// BAD: Hardcoded secret
const SECRET = "supersecret123";
const token = jwt.sign(payload, SECRET);

// GOOD: Environment variable + strong secret
const SECRET = process.env.JWT_SECRET; // 256-bit random value
if (!SECRET || SECRET.length < 32) {
  throw new Error("JWT_SECRET must be 32+ characters");
}
const token = jwt.sign(payload, SECRET, {
  algorithm: "HS256",
  expiresIn: "15m" // Short-lived tokens
});
```

Additional controls:
- Rotate secrets quarterly
- Consider asymmetric signing (RS256) for public key distribution
- Implement token revocation list for compromised tokens
- Monitor for tokens with impossible claims (e.g., userId that doesn't exist)

**OWASP Mapping**: A07 - Authentication Failures, A02 - Cryptographic Failures

---

### Threat 2: Session Hijacking via Insecure Cookie Configuration

**Threat**: Attacker intercepts session cookie and impersonates victim user

**Component**: Browser-to-API session management

**Attack Scenario**:
1. User logs in from coffee shop WiFi
2. API sets session cookie without Secure or HttpOnly flags
3. Attacker on same network runs Wireshark, captures cookie in plaintext
4. Attacker injects cookie into their own browser
5. API accepts cookie and grants access as victim

**Impact**: Account takeover for any user on insecure networks. Attacker can read messages, change settings, make purchases.

**Likelihood**: Medium (requires network access, but public WiFi is common)

**Mitigation**:
```typescript
// BAD: Insecure cookie
res.cookie("sessionId", sessionId, {
  maxAge: 86400000 // 24 hours, no security flags
});

// GOOD: Secure cookie configuration
res.cookie("sessionId", sessionId, {
  httpOnly: true,        // Prevent XSS access
  secure: true,          // HTTPS only
  sameSite: "strict",    // CSRF protection
  maxAge: 3600000,       // 1 hour
  domain: ".example.com" // Explicit domain binding
});
```

Additional controls:
- Regenerate session ID after login (prevent fixation)
- Bind session to IP address + User-Agent (detect session transfer)
- Log concurrent sessions and alert user
- Implement absolute timeout (max 8 hours) regardless of activity

**OWASP Mapping**: A07 - Authentication Failures

---

### Threat 3: Password Reset Token Prediction

**Threat**: Attacker guesses password reset tokens to hijack accounts

**Component**: /api/auth/reset-password endpoint

**Attack Scenario**:
1. Victim requests password reset
2. System generates token using timestamp + userId pattern
3. Attacker requests their own reset to observe token format
4. Attacker enumerates tokens: 1672531200_1, 1672531200_2, etc.
5. Attacker uses guessed token to reset victim's password

**Impact**: Account takeover for any user. Attacker can lock out legitimate user and steal data.

**Likelihood**: Medium (requires understanding token format, but enumeration is fast)

**Mitigation**:
```typescript
// BAD: Predictable token
const resetToken = `${Date.now()}_${userId}`;

// GOOD: Cryptographically secure random token
import crypto from "crypto";

const resetToken = crypto.randomBytes(32).toString("hex"); // 256 bits
await db.saveResetToken({
  userId,
  token: await bcrypt.hash(resetToken, 12), // Hash before storing
  expires: Date.now() + 15 * 60 * 1000,     // 15-minute expiration
  used: false                                // One-time use
});
```

Additional controls:
- Rate limit reset requests (5 per hour per email)
- Send token only to registered email (never display in UI)
- Invalidate token after single use
- Log all reset attempts with IP/User-Agent for forensics
- Email user when password is changed (detection control)

**OWASP Mapping**: A07 - Authentication Failures, A04 - Insecure Design

---

## Human Review Checklist

<div class="docs-card docs-card-indigo">

<div class="docs-heading">Before merging AI-generated Spoofing threat mitigation code, verify:</div>

<div class="docs-grid">

<div class="docs-card docs-card-muted">
  <div class="docs-heading">Password and Credential Storage</div>
  <div class="docs-copy">
    ✓ System never stores passwords in plaintext or uses weak hashing algorithms like MD5 or SHA-1<br/>
    ✓ All passwords hashed with bcrypt at cost factor 12 or higher (approximately 250ms computation time)<br/>
    ✓ Password policies enforce minimum complexity requirements: 12+ characters with mixed case, numbers, symbols<br/>
    ✓ Credentials are never logged, transmitted in URLs, or exposed in error messages<br/>
    <strong class="docs-strong">Test:</strong> Attempt login with weak passwords like password123 and verify rejection, inspect database to confirm hashed passwords
  </div>
</div>

<div class="docs-card docs-card-rose">
  <div class="docs-heading">Token and Session Management</div>
  <div class="docs-copy">
    ✓ JWT secrets stored in environment variables, never hardcoded in source code or client bundles<br/>
    ✓ Secrets are cryptographically random with at least 256 bits of entropy<br/>
    ✓ All tokens have expiration timestamps: 15 minutes for access tokens, 7 days for refresh tokens<br/>
    ✓ Session cookies use HttpOnly, Secure, and SameSite=Strict flags to prevent XSS and CSRF attacks<br/>
    ✓ Tokens invalidated on logout and refresh token rotation is implemented<br/>
    <strong class="docs-strong">Test:</strong> Inspect cookies in browser DevTools to verify security flags, try replaying expired token and confirm rejection
  </div>
</div>

<div class="docs-card docs-card-orange">
  <div class="docs-heading">Password Reset and Account Recovery</div>
  <div class="docs-copy">
    ✓ Password reset tokens generated using crypto.randomBytes(32) or equivalent, producing 256 bits of unpredictable randomness<br/>
    ✓ Tokens expire within 15-30 minutes and are single-use only (invalidated after consumption)<br/>
    ✓ Rate limiting enforced at 5 reset requests per hour per email address<br/>
    ✓ System sends email notifications whenever passwords are changed for unauthorized reset detection<br/>
    <strong class="docs-strong">Test:</strong> Request multiple resets rapidly and verify rate limiting blocks excessive requests, check token expiration and reuse prevention
  </div>
</div>

<div class="docs-card docs-card-blue">
  <div class="docs-heading">Multi-Factor Authentication</div>
  <div class="docs-copy">
    ✓ For high-value accounts (admin, financial), multi-factor authentication is mandatory, not optional<br/>
    ✓ System supports TOTP via authenticator apps, SMS codes, or hardware keys<br/>
    ✓ Backup codes generated at enrollment for account recovery<br/>
    ✓ MFA cannot be bypassed through alternate authentication paths like password reset or remember this device shortcuts<br/>
    <strong class="docs-strong">Test:</strong> Attempt login to admin account without MFA and verify access denial, try bypassing MFA through password reset flow
  </div>
</div>

<div class="docs-card docs-card-amber">
  <div class="docs-heading">API and Service Authentication</div>
  <div class="docs-copy">
    ✓ API keys are 32+ characters of random data, stored hashed in database, and rotated every 90 days<br/>
    ✓ For service-to-service communication, use mutual TLS or OAuth client credentials flow instead of static API keys<br/>
    ✓ Never embed API keys in mobile apps or client-side JavaScript where they can be extracted<br/>
    ✓ Key scoping implemented to limit what each API key can access<br/>
    <strong class="docs-strong">Test:</strong> Extract API key from mobile app binary and verify minimal permissions, attempt to use key outside intended scope
  </div>
</div>

<div class="docs-card docs-card-cyan">
  <div class="docs-heading">Brute Force and Account Lockout</div>
  <div class="docs-copy">
    ✓ Login endpoints implement progressive delays or account lockout after 5 failed authentication attempts<br/>
    ✓ Lockouts last 15-30 minutes or require email verification to unlock<br/>
    ✓ CAPTCHA added after 3 failed attempts to block automated attacks<br/>
    ✓ Monitoring for distributed brute force attacks across multiple accounts with IP-based rate limiting<br/>
    <strong class="docs-strong">Test:</strong> Attempt brute force login with 10 incorrect passwords, verify account locks and CAPTCHA appears
  </div>
</div>

<div class="docs-card docs-card-emerald">
  <div class="docs-heading">Authentication Logging and Monitoring</div>
  <div class="docs-copy">
    ✓ All authentication events logged with timestamp, IP address, User-Agent, success/failure status, and user identifier<br/>
    ✓ Logs sent to centralized logging system (ELK, Splunk, CloudWatch) for correlation<br/>
    ✓ Alerts configured for suspicious patterns: logins from new geolocations, multiple failed attempts, concurrent sessions from different IPs, privilege escalation<br/>
    ✓ PII like passwords is never logged<br/>
    <strong class="docs-strong">Test:</strong> Review authentication logs and verify actionable forensic data, test that password values never appear in any log
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Use the AI prompt** with ChatGPT or Claude to analyze your architecture
2. **Review generated threats** using the checklist above
3. **Prioritize by risk** — focus on high-likelihood, high-impact threats first
4. **Implement mitigations** using [OWASP A07](/docs/prompts/owasp/A07_authn_failures) and [A02](/docs/prompts/owasp/A02_crypto_failures) prompt packs
5. **Test controls** — attempt attacks yourself or hire penetration testers
6. **Move to next STRIDE category** → [Tampering](tampering)

---

## Resources

- **[OWASP A07: Authentication Failures](/docs/prompts/owasp/A07_authn_failures)** — Implementation guidance
- **[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)** — Best practices
- **[Back to STRIDE Overview](/docs/prompts/threat-modeling/)** — See all six categories

---

**Key principle**: Spoofing is prevented by strong authentication. Every authentication bypass is a potential account takeover — verify identity rigorously before granting access.
