# A04: Insecure Design — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: threat modeling, secure by design patterns, rate limiting, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security architect implementing OWASP A04:2021 - Insecure Design.

Context:
- Node 18 + TypeScript
- Designing secure password reset flows
- Implementing rate limiting and anti-automation controls
- Use cryptographically secure tokens
- Apply defense in depth principles
- Design with security requirements from the start

Security Requirements:
- Generate cryptographically secure reset tokens (crypto.randomBytes)
- Make tokens unpredictable and non-sequential
- Implement token expiration (15-30 minutes)
- Add rate limiting to prevent brute force
- Use one-time tokens (invalidate after use)
- Send tokens via secure channels only (email/SMS)
- Don't expose whether email exists in system
- Log security events for monitoring

Task:
1) Refactor `examples/owasp/A04_insecure_design/insecure.ts` to use secure design patterns
2) Replace predictable token generation with crypto.randomBytes(32)
3) Implement token storage with expiration:
   - Store token hash (not plaintext)
   - Include creation timestamp
   - Validate token age (max 30 minutes)
4) Add rate limiting to prevent token enumeration:
   - Max 3 reset requests per email per hour
   - Max 5 failed verification attempts per IP
5) Implement one-time token usage (invalidate after successful reset)
6) Generic responses (don't reveal if email exists)
7) Run tests in `examples/owasp/A04_insecure_design/__tests__/design.test.ts` and ensure they pass

Security Checklist:
□ Cryptographically secure token generation (crypto.randomBytes)
□ Tokens are unpredictable (no email, timestamp, or sequential patterns)
□ Token expiration enforced (15-30 minutes)
□ Rate limiting prevents brute force attempts
□ One-time token usage (invalidate after verification)
□ Tokens stored as hashes (not plaintext)
□ Generic error messages (don't leak email existence)
□ Security events logged for monitoring
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security architect. Fix OWASP A04: Insecure Design in examples/owasp/A04_insecure_design/insecure.ts.

Requirements:
- Replace predictable tokens with crypto.randomBytes(32)
- Store token hashes (bcrypt or SHA-256) not plaintext
- Implement 30-minute token expiration
- Add rate limiting (3 requests/hour per email)
- One-time token usage (invalidate after success)
- Generic responses (don't reveal email existence)
- Log security events
- Tests must pass in __tests__/design.test.ts

Secure Design Patterns:
- Unpredictable tokens: crypto.randomBytes (not email + timestamp)
- Token storage: hash + expiration timestamp
- Rate limiting: 3/hour per email, 5/hour per IP
- Defense in depth: multiple security layers
- Fail securely: default deny, generic errors
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
// ❌ INSECURE: Predictable token generation
export function generateResetToken(email: string) {
  return email + Date.now(); // ❌ Predictable & guessable!
}
```

**Problems**:
- Token is predictable (email + timestamp)
- Attacker can enumerate valid emails
- No expiration mechanism
- No rate limiting
- Tokens can be reused

### After (Secure)
```typescript
// ✅ SECURE: Cryptographically secure token with proper design
import crypto from 'crypto';
import bcrypt from 'bcrypt';

interface ResetToken {
  tokenHash: string;
  email: string;
  createdAt: Date;
  used: boolean;
}

// In-memory store (use Redis/database in production)
const resetTokens = new Map<string, ResetToken>();
const rateLimits = new Map<string, number[]>();

const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const MAX_REQUESTS_PER_HOUR = 3;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  // Get recent requests for this email
  const requests = rateLimits.get(email) || [];
  const recentRequests = requests.filter(time => time > hourAgo);

  if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
    return false; // Rate limit exceeded
  }

  // Record this request
  recentRequests.push(now);
  rateLimits.set(email, recentRequests);
  return true;
}

export async function generateResetToken(email: string): Promise<string> {
  // ✅ Check rate limit first
  if (!checkRateLimit(email)) {
    // ✅ Generic message (don't reveal rate limit details)
    throw new Error('Please try again later');
  }

  // ✅ Generate cryptographically secure random token
  const token = crypto.randomBytes(32).toString('hex');

  // ✅ Hash token before storing
  const tokenHash = await bcrypt.hash(token, 10);

  // ✅ Store token metadata
  resetTokens.set(tokenHash, {
    tokenHash,
    email,
    createdAt: new Date(),
    used: false
  });

  // ✅ Log security event (without sensitive data)
  console.log('Password reset requested', {
    email: email.substring(0, 3) + '***', // Partial masking
    timestamp: new Date().toISOString()
  });

  // ✅ Return token to be sent via email (only once)
  return token;
}

export async function verifyResetToken(token: string, email: string): Promise<boolean> {
  // ✅ Find token by comparing hashes
  for (const [tokenHash, tokenData] of resetTokens.entries()) {
    const isMatch = await bcrypt.compare(token, tokenHash);

    if (isMatch && tokenData.email === email) {
      // ✅ Check if token is expired
      const tokenAge = Date.now() - tokenData.createdAt.getTime();
      if (tokenAge > TOKEN_EXPIRY_MS) {
        resetTokens.delete(tokenHash);
        throw new Error('Token expired');
      }

      // ✅ Check if token was already used
      if (tokenData.used) {
        throw new Error('Token already used');
      }

      // ✅ Mark token as used (one-time use)
      tokenData.used = true;
      resetTokens.set(tokenHash, tokenData);

      // ✅ Log successful verification
      console.log('Reset token verified', {
        email: email.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });

      return true;
    }
  }

  // ✅ Generic error (don't reveal why verification failed)
  throw new Error('Invalid or expired token');
}

// ✅ Cleanup expired tokens periodically
export function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [tokenHash, tokenData] of resetTokens.entries()) {
    const tokenAge = now - tokenData.createdAt.getTime();
    if (tokenAge > TOKEN_EXPIRY_MS) {
      resetTokens.delete(tokenHash);
    }
  }
}
```

---

## Common Insecure Design Failures

1. **Predictable Tokens/IDs**
   - Problem: Sequential IDs, timestamp-based tokens, email-based tokens
   - Fix: crypto.randomBytes() for unpredictable tokens

2. **Missing Rate Limiting**
   - Problem: Unlimited requests allow brute force attacks
   - Fix: Implement rate limiting at multiple levels (IP, email, global)

3. **No Token Expiration**
   - Problem: Tokens valid forever
   - Fix: Short expiration windows (15-30 minutes)

4. **Reusable Tokens**
   - Problem: Tokens can be used multiple times
   - Fix: One-time tokens, invalidate after use

5. **Information Disclosure**
   - Problem: Different errors reveal system state
   - Fix: Generic error messages

6. **Missing Business Logic Validation**
   - Problem: Can purchase negative quantities, transfer to self
   - Fix: Validate business rules in code

7. **No Defense in Depth**
   - Problem: Single security control
   - Fix: Multiple layers (rate limit + expiration + one-time use)

---

## Design Security Principles

1. **Secure by Default**
   - Deny all, then explicitly allow
   - Fail closed, not open

2. **Defense in Depth**
   - Multiple security layers
   - Don't rely on single control

3. **Least Privilege**
   - Minimum necessary permissions
   - Time-limited access

4. **Fail Securely**
   - Errors don't leak information
   - System remains secure during failures

5. **Complete Mediation**
   - Check every access attempt
   - Don't cache authorization decisions

---

## Testing Checklist

- [ ] Tokens are cryptographically random (not predictable)
- [ ] Token expiration enforced (reject after 30 minutes)
- [ ] Rate limiting prevents brute force (3 requests/hour)
- [ ] Tokens are one-time use (second use fails)
- [ ] Tokens stored as hashes (not plaintext)
- [ ] Generic error messages (no information leakage)
- [ ] Security events logged
- [ ] Tests cover both happy path and attack scenarios

---

## Attack Scenarios to Prevent

```typescript
// Test these attack scenarios - all should be blocked:
const attackScenarios = [
  "Token enumeration via predictable patterns",
  "Brute force token guessing (rate limit blocks)",
  "Token reuse after password reset",
  "Email enumeration via different error messages",
  "Expired token accepted",
  "Token from different email accepted",
  "Parallel reset requests bypass rate limit",
];
```

---

## Threat Modeling Checklist

- [ ] Identify assets (passwords, accounts, tokens)
- [ ] Identify threats (brute force, enumeration, replay)
- [ ] Identify vulnerabilities (predictable tokens, no rate limit)
- [ ] Define security requirements (random tokens, expiration, rate limit)
- [ ] Implement mitigations (crypto.randomBytes, expiry, one-time use)
- [ ] Validate with security tests

---

## Additional Resources

- [OWASP A04:2021 - Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)
- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP Attack Surface Analysis Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html)
