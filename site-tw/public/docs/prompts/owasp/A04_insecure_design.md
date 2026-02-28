# Insecure Design — OWASP A04 Prompt Pack

> **OWASP A04: Insecure Design** occurs when security flaws are introduced during the design phase, before any code is written. This includes missing or ineffective security controls, business logic flaws, and failure to use threat modeling or secure design patterns. Unlike implementation bugs, these are fundamental architectural weaknesses.

---

## 🎯 What is Insecure Design?

**Definition**: Insecure design represents missing or ineffective control design, distinct from insecure implementation. A secure design can still have implementation defects, but an insecure design cannot be fixed by a perfect implementation alone.

**Common Manifestations**:
- **Predictable Tokens**: Sequential IDs, timestamp-based tokens allowing enumeration
- **Missing Rate Limiting**: Unlimited requests enabling brute force attacks
- **Business Logic Flaws**: Negative quantities, transfer to self, race conditions
- **Insufficient Threat Modeling**: Security not considered during design phase
- **No Token Expiration**: Tokens valid forever without time limits
- **Reusable Tokens**: Password reset tokens can be used multiple times

**Why It Matters**: Insecure design was new to the OWASP Top 10 in 2021, representing a shift towards more proactive security. Design flaws are costly to fix after deployment and require architectural changes rather than simple patches. Threat modeling and secure design principles must be applied before writing code.

---

## 🔗 Maps to STRIDE

**Primary**: **Spoofing** (predictable tokens enable impersonation)
**Secondary**: **Information Disclosure** (design flaws leak system state), **Tampering** (business logic bypass)

See also: [STRIDE: Spoofing](/docs/prompts/stride/spoofing), [STRIDE: Information Disclosure](/docs/prompts/stride/information-disclosure), and [STRIDE: Tampering](/docs/prompts/stride/tampering)

---

## Prompt 1: Analyze Code for Insecure Design Vulnerabilities

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Identifies predictable tokens, missing rate limits, business logic flaws, and design weaknesses</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a security architect specializing in insecure design vulnerabilities (OWASP A04).

Context:
I have a Node.js + TypeScript application with various security-sensitive features including password reset, account recovery, multi-step workflows, and financial transactions. I need to identify design-level security flaws that cannot be fixed with implementation alone.

My codebase includes:
- Password reset and account recovery flows
- Token generation for authentication and authorization
- Rate-sensitive operations (login, API calls, password reset)
- Business logic for transfers, purchases, and quantity management
- Multi-step workflows with state transitions

Task:
Analyze the code in the current workspace for OWASP A04 vulnerabilities.

Identify:

1. **Predictable Token Generation**: Sequential IDs, timestamp-based, email-derived tokens
2. **Missing Rate Limiting**: Operations vulnerable to brute force or enumeration
3. **Token Expiration Failures**: Tokens valid indefinitely or for excessive periods
4. **Reusable Tokens**: Password reset, session, or verification tokens usable multiple times
5. **Business Logic Flaws**: Negative quantities, self-transfers, race conditions
6. **Information Disclosure via Timing**: Different responses reveal system state
7. **Missing Defense in Depth**: Single security control with no backup
8. **Insufficient Threat Modeling**: Security not considered in design phase

For each vulnerability found:

**Location**: [File:Line or Function Name]
**Issue**: [Specific design flaw]
**Attack Vector**: [How an attacker would exploit this design weakness]
**Risk**: [Impact - account takeover, enumeration, business logic bypass]
**Remediation**: [Specific design changes with crypto.randomBytes, rate limiting, expiration]

Requirements:
- Focus on design flaws, not implementation bugs
- Check token generation for predictability
- Verify rate limiting exists for sensitive operations
- Validate token expiration and one-time use
- Examine business logic for edge cases
- Look for defense in depth (multiple security layers)

Output:
Provide a prioritized list of design vulnerabilities (Critical > High > Medium) with specific remediation examples using secure design patterns, crypto.randomBytes for tokens, and defense in depth principles.
```

</div>
</details>

---

## Prompt 2: Implement Secure Design Patterns

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generates secure token management, rate limiting, expiration, and business logic validation</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a security architect implementing comprehensive secure design patterns for a web application (OWASP A04 remediation).

Context:
I need to implement security-first design throughout my Node.js + TypeScript application, focusing on password reset flows, token management, and rate limiting.

Current state:
- Password reset tokens generated with email + timestamp (predictable)
- No rate limiting on reset requests
- Tokens never expire
- Tokens can be reused multiple times
- No defense in depth (single layer of security)

Requirements:
Implement the following secure design patterns:

1. **Cryptographically Secure Token Generation**
   - Use crypto.randomBytes(32) for unpredictable tokens
   - Function: generateResetToken(email: string): Promise<string>
   - Token must be 256-bit random, never derived from user data
   - Store token hash (bcrypt or SHA-256), not plaintext
   - Include TypeScript types for token metadata

2. **Token Expiration**
   - Tokens valid for maximum 30 minutes
   - Store creation timestamp with token metadata
   - Validate age on verification
   - Automatically cleanup expired tokens
   - Example: validateTokenAge(createdAt: Date, maxAgeMinutes: number)

3. **One-Time Token Usage**
   - Mark tokens as used after successful verification
   - Reject already-used tokens
   - Store usage flag in token metadata
   - Log attempts to reuse consumed tokens

4. **Rate Limiting**
   - Maximum 3 reset requests per email per hour
   - Maximum 5 verification attempts per IP per 15 minutes
   - Track requests in-memory Map or Redis
   - Generic error messages (don't reveal rate limit details)
   - Function: checkRateLimit(identifier: string, max: number, windowMs: number)

5. **Defense in Depth**
   - Multiple security layers: rate limit + expiration + one-time use
   - Token hashing (don't store plaintext)
   - Generic error messages at all failure points
   - Security event logging
   - Email confirmation for sensitive actions

6. **Test Coverage**
   - Unit tests for token generation (verify randomness)
   - Tests for expiration enforcement
   - Tests for one-time use validation
   - Tests for rate limiting (verify blocked after limit)
   - Tests for generic error messages

Implementation:
- Use crypto.randomBytes for token generation
- Use bcrypt for token hashing
- TypeScript strict mode with proper typing
- Comprehensive inline security comments
- No predictable token patterns
- Multiple independent security controls

Output:
Provide complete, executable TypeScript code for:
- `auth/resetTokens.ts` (generateResetToken, verifyResetToken with all security controls)
- `middleware/rateLimiting.ts` (checkRateLimit, cleanupExpired functions)
- `validation/tokenSchemas.ts` (Zod schemas for token validation)
- `__tests__/secureDesign.test.ts` (Jest tests for all security controls)
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
export function generateResetToken(email: string): string {
  // Token is predictable (email + timestamp)
  return email + Date.now();
}

const resetTokens = new Map<string, string>();

export function requestPasswordReset(email: string): string {
  // No rate limiting - unlimited requests
  // Token never expires
  // Token can be reused
  const token = generateResetToken(email);
  resetTokens.set(token, email);
  return token;
}

// Attack: Attacker can enumerate valid emails by generating predictable tokens
// Attack: Brute force unlimited reset requests
// Attack: Reuse token multiple times to reset password repeatedly
```

</details>

<details style="margin: 16px 0;">
<summary style="cursor: pointer; padding: 8px 0; font-size: 16px; font-weight: 700; color: #86efac;">
✅ After — Secure Code
</summary>

```typescript
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
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Rate limiting with defense in depth
function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  const requests = rateLimits.get(identifier) || [];
  const recentRequests = requests.filter(time => time > windowStart);

  if (recentRequests.length >= maxRequests) {
    console.warn('Rate limit exceeded', {
      identifier: identifier.substring(0, 3) + '***',
      attempts: recentRequests.length,
      timestamp: new Date().toISOString()
    });
    return false;
  }

  recentRequests.push(now);
  rateLimits.set(identifier, recentRequests);
  return true;
}

// Cryptographically secure token generation
export async function generateResetToken(email: string): Promise<string> {
  if (!checkRateLimit(email, MAX_REQUESTS_PER_HOUR, RATE_LIMIT_WINDOW_MS)) {
    throw new Error('Please try again later');
  }

  // 256-bit random token
  const token = crypto.randomBytes(32).toString('hex');

  // Hash token before storing
  const tokenHash = await bcrypt.hash(token, 10);

  resetTokens.set(tokenHash, {
    tokenHash,
    email,
    createdAt: new Date(),
    used: false
  });

  console.log('Password reset requested', {
    email: email.substring(0, 3) + '***',
    timestamp: new Date().toISOString()
  });

  return token;
}

// Verify token with comprehensive security checks
export async function verifyResetToken(token: string, email: string): Promise<boolean> {
  for (const [tokenHash, tokenData] of resetTokens.entries()) {
    const isMatch = await bcrypt.compare(token, tokenHash);

    if (isMatch && tokenData.email === email) {
      // Check expiration
      const tokenAge = Date.now() - tokenData.createdAt.getTime();
      if (tokenAge > TOKEN_EXPIRY_MS) {
        resetTokens.delete(tokenHash);
        console.warn('Expired token attempted', {
          email: email.substring(0, 3) + '***',
          age: Math.floor(tokenAge / 1000) + 's'
        });
        throw new Error('Token expired');
      }

      // Check one-time use
      if (tokenData.used) {
        console.warn('Token reuse attempted', {
          email: email.substring(0, 3) + '***',
          timestamp: new Date().toISOString()
        });
        throw new Error('Token already used');
      }

      // Mark as used
      tokenData.used = true;
      resetTokens.set(tokenHash, tokenData);

      console.log('Reset token verified', {
        email: email.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });

      return true;
    }
  }

  console.warn('Invalid token attempt', {
    email: email.substring(0, 3) + '***',
    timestamp: new Date().toISOString()
  });
  throw new Error('Invalid or expired token');
}

// Cleanup expired tokens periodically
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [tokenHash, tokenData] of resetTokens.entries()) {
    const tokenAge = now - tokenData.createdAt.getTime();
    if (tokenAge > TOKEN_EXPIRY_MS) {
      resetTokens.delete(tokenHash);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log('Cleaned up expired tokens', { count: cleaned });
  }
}

// Business logic: Prevent negative quantities
export function validatePurchaseQuantity(quantity: number): void {
  if (quantity <= 0) throw new Error('Quantity must be positive');
  if (quantity > 1000) throw new Error('Quantity exceeds maximum allowed');
  if (!Number.isInteger(quantity)) throw new Error('Quantity must be a whole number');
}

// Business logic: Prevent self-transfer
export function validateTransfer(fromUserId: string, toUserId: string, amount: number): void {
  if (fromUserId === toUserId) throw new Error('Cannot transfer to yourself');
  if (amount <= 0) throw new Error('Transfer amount must be positive');
}
```

</details>

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated secure design code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Token Unpredictability & Storage</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All tokens generated via crypto.randomBytes(32) — never from email, timestamp, or sequential IDs<br/>
    ✓ Tokens stored as hashes (bcrypt or SHA-256), never plaintext<br/>
    ✓ No patterns visible when collecting multiple token samples<br/>
    <strong style="color: #94a3b8;">Test:</strong> Generate 100 tokens — verify no patterns or predictable elements; inspect storage — only hashes present
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Expiration & One-Time Use</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Reset tokens expire within 15-30 minutes; session tokens within hours/days<br/>
    ✓ Expiration validated on every use via creation timestamp<br/>
    ✓ Tokens marked as used after successful verification — reuse rejected<br/>
    ✓ Reuse attempts logged as security events<br/>
    <strong style="color: #94a3b8;">Test:</strong> Use token past expiration — rejected; use token twice — second attempt fails with logged event
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Rate Limiting & Business Logic</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Rate limits on all sensitive operations (3-5 resets/hour, 5-10 logins/15min)<br/>
    ✓ Generic error messages when limits exceeded<br/>
    ✓ Negative quantities, self-transfers, and excessive amounts rejected server-side<br/>
    ✓ Multi-step workflows validate state transitions (no step skipping)<br/>
    <strong style="color: #94a3b8;">Test:</strong> Exceed rate limit — blocked with generic error; attempt negative quantity or self-transfer — rejected
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Defense in Depth & Logging</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Multiple independent layers: rate limit + expiration + one-time use + hashing<br/>
    ✓ Each layer fails independently without compromising others<br/>
    ✓ All security events logged with masked identifiers, never token values<br/>
    <strong style="color: #94a3b8;">Test:</strong> Disable one layer — others still protect; trigger security events — logs contain masked data only
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Use Prompt 1** to analyze your codebase for design-level security flaws
2. **Use Prompt 2** to generate secure token management and rate limiting
3. **Review generated code** using the Human Review Checklist above
4. **Conduct threat modeling** before implementing new features
5. **Apply defense in depth** with multiple independent security layers
6. **Monitor security events** and analyze patterns for attack detection

---

## Resources

- [OWASP A04:2021 - Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)
- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP Attack Surface Analysis Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html)
- [Back to OWASP Overview](/docs/prompts/owasp/)

---

**Key principle**: Security must be designed in, not bolted on. Use crypto.randomBytes for tokens, enforce expiration and one-time use, and layer multiple independent controls.
