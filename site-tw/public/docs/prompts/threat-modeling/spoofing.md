# STRIDE: Spoofing Identity — Threat Modeling Prompt Pack

> **Spoofing** is pretending to be someone or something else. This threat category focuses on authentication failures, weak identity verification, and credential theft.

---

## 🎯 What is Spoofing?

**Definition**: An attacker claims to be a user, system, or service they are not. Spoofing threatens **authentication** — the process of proving identity.

**Common Spoofing Attacks**:
- **Credential Theft**: Phishing, keylogging, credential stuffing
- **Session Hijacking**: Stealing or guessing session tokens
- **Token Replay**: Reusing captured authentication tokens
- **Weak Authentication**: No MFA, weak passwords, predictable tokens
- **Man-in-the-Middle**: Intercepting and impersonating in network communication

---

## 🔗 Maps to OWASP

**Primary**: [A07 - Identification and Authentication Failures](/docs/prompts/owasp/A07_authn_failures)
**Secondary**: [A02 - Cryptographic Failures](/docs/prompts/owasp/A02_crypto_failures)

---

## 🤖 AI Prompt: Analyze Architecture for Spoofing Threats

### Role
You are a security architect specializing in authentication and identity management. Your task is to perform STRIDE threat modeling focusing on **Spoofing (S)** threats.

### Context
I have the following architecture:

```
[PASTE YOUR ARCHITECTURE DIAGRAM OR DESCRIPTION HERE]

Example:
- React SPA frontend
- Node.js REST API
- PostgreSQL database
- JWT-based authentication
- Redis for session storage
```

### Task
Analyze this architecture for **Spoofing** threats. For each component and data flow:

1. **Identify Spoofing Threats**: Where could an attacker impersonate a user, service, or system?
2. **Describe Attack Scenario**: How would the attack work? What would the attacker do?
3. **Assess Impact**: What damage could this spoofing attack cause?
4. **Suggest Mitigations**: What controls would prevent or detect this threat?

### Format
For each threat, provide:

**Threat**: [Brief description]
**Component**: [Which part of the system]
**Attack Scenario**: [Step-by-step how it works]
**Impact**: [What happens if successful]
**Mitigation**: [How to prevent/detect]
**OWASP Mapping**: [A07 or A02]

### Focus Areas
Pay special attention to:
- Login/authentication endpoints
- Session management
- API authentication (API keys, tokens, OAuth)
- Service-to-service authentication
- Password reset flows
- "Remember me" functionality

---

## 📋 Example AI Output

### Threat 1: JWT Token Spoofing via Weak Secret

**Threat**: Attacker discovers JWT signing secret and forges valid tokens
**Component**: API authentication middleware
**Attack Scenario**:
1. Attacker finds hardcoded JWT secret in client-side code or GitHub
2. Attacker generates their own JWT with admin role
3. Attacker sends forged JWT to API
4. API validates signature (it matches!) and grants admin access

**Impact**: Complete authentication bypass. Attacker can impersonate any user including admins.

**Mitigation**:
- Store JWT secret in environment variables (never hardcode)
- Use strong, cryptographically random secrets (256+ bits)
- Rotate secrets regularly
- Consider asymmetric signing (RS256 instead of HS256)
- Implement short token expiration (15 mins) with refresh tokens

**OWASP Mapping**: A07 - Authentication Failures, A02 - Cryptographic Failures

---

### Threat 2: Session Hijacking via Insecure Cookies

**Threat**: Attacker steals session cookie and impersonates victim
**Component**: Browser → API session management
**Attack Scenario**:
1. User logs in over public WiFi
2. Attacker on same network captures session cookie (no `Secure` flag)
3. Attacker replays cookie in their own browser
4. API accepts cookie and grants access as victim

**Impact**: Account takeover. Attacker can perform actions as victim user.

**Mitigation**:
- Set `Secure` flag (HTTPS only)
- Set `HttpOnly` flag (no JavaScript access)
- Set `SameSite=Strict` (CSRF protection)
- Bind session to IP address (detect IP changes)
- Implement concurrent session detection
- Use short session timeouts

**OWASP Mapping**: A07 - Authentication Failures

---

### Threat 3: Password Reset Token Predictability

**Threat**: Attacker guesses password reset tokens to hijack accounts
**Component**: Password reset flow
**Attack Scenario**:
1. User requests password reset
2. System generates reset token: `timestamp_userid` (predictable!)
3. Attacker enumerates tokens for other users
4. Attacker uses guessed token to reset victim's password

**Impact**: Account takeover for any user.

**Mitigation**:
- Use cryptographically secure random tokens (`crypto.randomBytes(32)`)
- Make tokens long (256 bits minimum)
- Set short expiration (15-30 minutes)
- One-time use only (invalidate after use)
- Rate limit reset requests
- Log all password reset attempts

**OWASP Mapping**: A07 - Authentication Failures, A04 - Insecure Design

---

## ✅ Validation Checklist

After implementing mitigations, verify:

### Authentication
- [ ] Passwords hashed with bcrypt (cost factor ≥12)
- [ ] MFA enforced for sensitive accounts
- [ ] Account lockout after N failed attempts
- [ ] CAPTCHA on login after 3 failures
- [ ] No default credentials exist

### Tokens & Sessions
- [ ] JWT secrets stored in environment variables
- [ ] JWT secrets are 256+ bits of randomness
- [ ] Session tokens are cryptographically random
- [ ] Session cookies have `Secure`, `HttpOnly`, `SameSite=Strict`
- [ ] Token expiration implemented (≤15 minutes for JWTs)
- [ ] Refresh token rotation implemented

### Password Reset
- [ ] Reset tokens are cryptographically random (256 bits)
- [ ] Reset tokens expire (≤30 minutes)
- [ ] Reset tokens are one-time use
- [ ] Rate limiting on reset requests (5 per hour)
- [ ] Email notification when password changed

### Service Authentication
- [ ] API keys rotated regularly (90 days)
- [ ] Service-to-service uses mutual TLS
- [ ] No hardcoded credentials in code
- [ ] Secrets managed via secure vault (e.g., AWS Secrets Manager)

---

## 🔄 Next Steps

1. **Use this prompt** with ChatGPT or Claude to generate spoofing threats for your architecture
2. **Review AI output** — validate each threat is realistic
3. **Prioritize threats** — which have highest impact and likelihood?
4. **Implement mitigations** using [OWASP A07 prompt pack](/docs/prompts/owasp/A07_authn_failures)
5. **Test controls** — attempt attacks yourself to verify mitigations work
6. **Move to next STRIDE category** → [Tampering](tampering)

---

## 📖 Additional Resources

- **[OWASP A07: Authentication Failures](/docs/prompts/owasp/A07_authn_failures)** — Implementation guide
- **[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)** — Best practices
- **[NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)** — US government standards
- **[Back to STRIDE Overview](index)** — See all six categories

---

**Remember**: Spoofing is prevented by strong authentication. Weak authentication is the #1 cause of account takeovers.
