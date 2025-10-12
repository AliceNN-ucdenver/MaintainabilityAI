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

## 🤖 AI Prompt #1: Analyze Code for Insecure Design Vulnerabilities

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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
Analyze the following code/files for OWASP A04 vulnerabilities:

[PASTE YOUR CODE HERE - authentication flows, token generation, business logic, rate-sensitive operations]

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

---

## 🤖 AI Prompt #2: Implement Secure Design Patterns

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: Predictable token generation
export function generateResetToken(email: string): string {
  // ❌ Token is predictable (email + timestamp)
  return email + Date.now();
}

// ❌ CRITICAL: No expiration, no rate limiting
const resetTokens = new Map<string, string>();

export function requestPasswordReset(email: string): string {
  // ❌ No rate limiting - unlimited requests
  // ❌ Token never expires
  // ❌ Token can be reused
  const token = generateResetToken(email);
  resetTokens.set(token, email);
  return token;
}

// Attack: Attacker can enumerate valid emails by generating predictable tokens
// Attack: Brute force unlimited reset requests
// Attack: Reuse token multiple times to reset password repeatedly
```

### After (Secure Code)

```typescript
// ✅ SECURE: Cryptographically random tokens with comprehensive security controls
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

// ✅ Rate limiting with defense in depth
function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get recent requests for this identifier
  const requests = rateLimits.get(identifier) || [];
  const recentRequests = requests.filter(time => time > windowStart);

  if (recentRequests.length >= maxRequests) {
    console.warn('Rate limit exceeded', {
      identifier: identifier.substring(0, 3) + '***',
      attempts: recentRequests.length,
      timestamp: new Date().toISOString()
    });
    return false; // Rate limit exceeded
  }

  // Record this request
  recentRequests.push(now);
  rateLimits.set(identifier, recentRequests);
  return true;
}

// ✅ Cryptographically secure token generation
export async function generateResetToken(email: string): Promise<string> {
  // ✅ Check rate limit (defense in depth layer 1)
  if (!checkRateLimit(email, MAX_REQUESTS_PER_HOUR, RATE_LIMIT_WINDOW_MS)) {
    // ✅ Generic error message (don't reveal rate limit details)
    throw new Error('Please try again later');
  }

  // ✅ Generate cryptographically secure random token (256-bit)
  const token = crypto.randomBytes(32).toString('hex');

  // ✅ Hash token before storing (defense in depth layer 2)
  const tokenHash = await bcrypt.hash(token, 10);

  // ✅ Store token metadata with expiration and usage tracking
  resetTokens.set(tokenHash, {
    tokenHash,
    email,
    createdAt: new Date(), // Track creation time (defense in depth layer 3)
    used: false // One-time use flag (defense in depth layer 4)
  });

  // ✅ Log security event (no sensitive data)
  console.log('Password reset requested', {
    email: email.substring(0, 3) + '***',
    timestamp: new Date().toISOString()
  });

  // ✅ Return plaintext token (sent via email, only once)
  return token;
}

// ✅ Verify token with comprehensive security checks
export async function verifyResetToken(token: string, email: string): Promise<boolean> {
  // ✅ Find token by comparing hashes (constant-time)
  for (const [tokenHash, tokenData] of resetTokens.entries()) {
    const isMatch = await bcrypt.compare(token, tokenHash);

    if (isMatch && tokenData.email === email) {
      // ✅ Defense in depth layer 3: Check expiration
      const tokenAge = Date.now() - tokenData.createdAt.getTime();
      if (tokenAge > TOKEN_EXPIRY_MS) {
        // Clean up expired token
        resetTokens.delete(tokenHash);
        console.warn('Expired token attempted', {
          email: email.substring(0, 3) + '***',
          age: Math.floor(tokenAge / 1000) + 's'
        });
        throw new Error('Token expired');
      }

      // ✅ Defense in depth layer 4: Check one-time use
      if (tokenData.used) {
        console.warn('Token reuse attempted', {
          email: email.substring(0, 3) + '***',
          timestamp: new Date().toISOString()
        });
        throw new Error('Token already used');
      }

      // ✅ Mark token as used (one-time use enforcement)
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
  console.warn('Invalid token attempt', {
    email: email.substring(0, 3) + '***',
    timestamp: new Date().toISOString()
  });
  throw new Error('Invalid or expired token');
}

// ✅ Cleanup expired tokens periodically
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

// ✅ Business logic example: Prevent negative quantities
export function validatePurchaseQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }

  if (quantity > 1000) {
    throw new Error('Quantity exceeds maximum allowed');
  }

  if (!Number.isInteger(quantity)) {
    throw new Error('Quantity must be a whole number');
  }
}

// ✅ Business logic example: Prevent self-transfer
export function validateTransfer(fromUserId: string, toUserId: string, amount: number): void {
  if (fromUserId === toUserId) {
    throw new Error('Cannot transfer to yourself');
  }

  if (amount <= 0) {
    throw new Error('Transfer amount must be positive');
  }

  // Add additional validation for balance, limits, etc.
}
```

---

## ✅ Human Review Checklist

After AI generates secure design code, carefully review each area before deploying:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 🎲 Token Unpredictability

All security tokens must be generated using cryptographically secure random number generators, specifically crypto.randomBytes with minimum 32 bytes (256 bits) of entropy. Tokens must never be derived from predictable sources like email addresses, usernames, timestamps, sequential IDs, or any combination thereof. The crypto module's randomBytes function uses the operating system's CSPRNG which is suitable for security-sensitive random values. Test token generation by collecting multiple samples and verifying no discernible patterns exist. Tokens should be base64 or hex encoded for safe transmission.

**Test it**: Generate 100 tokens and verify no patterns, sequential values, or predictable elements. Entropy should be approximately 256 bits.

---

### ⏱️ Token Expiration

Every token must have an explicit expiration time appropriate to its use case. Password reset tokens should expire within 15-30 minutes, session tokens within hours to days depending on sensitivity, and verification tokens within 24 hours maximum. Expiration must be validated on every token use, not just at generation. Store creation timestamp with token metadata and compare age against maximum allowed. Expired tokens should be immediately deleted from storage and attempts to use them logged as security events. Never extend token validity once issued.

**Test it**: Create token, wait past expiration time, attempt to use it. Should be rejected with generic error message.

---

### 🔒 One-Time Token Usage

Tokens for sensitive operations like password reset, email verification, or two-factor authentication must be single-use only. Once a token is successfully verified and the associated action completed, mark the token as used in metadata and reject any subsequent attempts to use it. This prevents replay attacks where an attacker intercepts a token and attempts to reuse it. Attempts to reuse consumed tokens should be logged as potential security incidents. For workflows requiring multiple steps, issue new tokens for each step rather than reusing a single token.

**Test it**: Use token successfully, attempt to use same token again. Second attempt should fail with logged security event.

---

### 🚦 Rate Limiting

Implement rate limiting on all security-sensitive operations to prevent brute force and enumeration attacks. Password reset requests should be limited to 3-5 per email per hour. Login attempts should be limited to 5-10 per IP per 15 minutes. Token verification attempts should be limited similarly. Rate limits must be implemented server-side using either in-memory data structures for single-server deployments or Redis/Memcached for distributed systems. When rate limits are exceeded, return generic error messages without revealing the specific limit or how long to wait.

**Test it**: Make repeated requests until rate limit triggers. Verify subsequent requests are blocked and error messages are generic.

---

### 🗂️ Token Storage Security

Never store tokens in plaintext. Hash tokens using bcrypt or SHA-256 before storing in database or memory. This ensures that even if token storage is compromised, attackers cannot use stored values. When verifying tokens, hash the provided token and compare against stored hashes using constant-time comparison. Store token metadata separately: email/user ID, creation timestamp, expiration time, and usage flag. This metadata enables expiration checks and one-time use enforcement without exposing the actual token value.

**Test it**: Inspect token storage (database, memory) and verify only hashed tokens are stored, never plaintext values.

---

### 🛡️ Defense in Depth

Security must never rely on a single control. Implement multiple independent layers: cryptographically secure token generation, token hashing in storage, expiration enforcement, one-time use validation, rate limiting, and security event logging. If one layer fails or is bypassed, remaining layers should still protect the system. For example, even if an attacker discovers a token, rate limiting prevents brute force guessing, expiration limits window of opportunity, and one-time use prevents replay. Each layer should fail independently without compromising other layers.

**Test it**: Verify multiple protections exist. Disable one protection (in test environment) and confirm others still block attacks.

---

### 📊 Business Logic Validation

All business operations must validate inputs against business rules, not just technical constraints. Prevent negative quantities in purchases or transfers. Prevent self-transfers where from and to accounts are identical. Validate that order totals match sum of line items. Check that refund amounts don't exceed original purchase. Enforce maximum transaction sizes. Validate state transitions in multi-step workflows (can't skip from step 1 to step 5). These checks must happen server-side in business logic layer, never relying on client-side validation.

**Test it**: Attempt invalid business operations (negative quantity, self-transfer, excessive amounts). All should be rejected server-side.

---

### 📝 Security Event Logging

All security-relevant events must be logged with sufficient context for investigation but without exposing sensitive data. Log token generation, verification attempts (success and failure), rate limit violations, expiration checks, and business logic validation failures. Include masked user identifiers, IP addresses, timestamps, and action taken. Never log token values, passwords, or other secrets. Logs should be structured (JSON) for easy parsing. Failed security events should trigger alerts when patterns indicate attacks. Log to centralized system for tamper resistance.

**Test it**: Trigger various security events and verify comprehensive logs created with appropriate detail and no sensitive data exposure.

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing codebase for design-level security flaws
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate secure design implementations
4. **Review generated code** using the Human Review Checklist above
5. **Test thoroughly**: Token randomness, expiration, one-time use, rate limiting
6. **Conduct threat modeling**: Identify security requirements before implementation
7. **Apply defense in depth**: Multiple independent security layers
8. **Implement business logic validation**: Validate against business rules
9. **Monitor and iterate**: Log security events, analyze patterns, improve design

---

## 📖 Additional Resources

- [OWASP A04:2021 - Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)
- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP Attack Surface Analysis Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html)

---

**Remember**: Insecure design is preventable through threat modeling during design phase, cryptographically secure token generation (crypto.randomBytes), defense in depth (multiple security layers), and comprehensive business logic validation. Security must be designed in, not bolted on.
