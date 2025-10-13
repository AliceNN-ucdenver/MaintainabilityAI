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

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated secure design code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Token Unpredictability</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All security tokens generated using crypto.randomBytes with minimum 32 bytes (256 bits) of entropy<br/>
    ✓ Tokens never derived from predictable sources like emails, usernames, timestamps, or sequential IDs<br/>
    ✓ Uses operating system CSPRNG via crypto module for cryptographically secure random values<br/>
    ✓ Tokens base64 or hex encoded for safe transmission<br/>
    ✓ No discernible patterns in token generation when collecting multiple samples<br/>
    ✓ Test: Generate 100 tokens and verify no patterns, sequential values, or predictable elements exist
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Token Expiration</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Every token has explicit expiration time appropriate to use case<br/>
    ✓ Password reset tokens expire within 15-30 minutes maximum<br/>
    ✓ Session tokens expire within hours to days depending on sensitivity<br/>
    ✓ Verification tokens expire within 24 hours maximum<br/>
    ✓ Expiration validated on every token use with creation timestamp comparison<br/>
    ✓ Expired tokens immediately deleted from storage<br/>
    ✓ Attempts to use expired tokens logged as security events<br/>
    ✓ Test: Create token, wait past expiration, attempt use and verify rejection with generic error
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">One-Time Token Usage</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Tokens for sensitive operations like password reset, email verification, or 2FA are single-use only<br/>
    ✓ Token marked as used in metadata after successful verification and action completion<br/>
    ✓ All subsequent attempts to use consumed tokens rejected<br/>
    ✓ Token reuse attempts logged as potential security incidents<br/>
    ✓ Multi-step workflows issue new tokens for each step rather than reusing single token<br/>
    ✓ Test: Use token successfully, attempt reuse and verify second attempt fails with logged security event
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Rate Limiting</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Rate limiting implemented on all security-sensitive operations<br/>
    ✓ Password reset requests limited to 3-5 per email per hour<br/>
    ✓ Login attempts limited to 5-10 per IP per 15 minutes<br/>
    ✓ Token verification attempts similarly rate limited<br/>
    ✓ Server-side implementation using in-memory structures or Redis/Memcached for distributed systems<br/>
    ✓ Generic error messages when rate limits exceeded without revealing specific limits or wait times<br/>
    ✓ Test: Make repeated requests until rate limit triggers and verify blocking with generic errors
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Token Storage Security</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Tokens never stored in plaintext, always hashed using bcrypt or SHA-256<br/>
    ✓ Token verification uses hash comparison with constant-time comparison to prevent timing attacks<br/>
    ✓ Token metadata stored separately including email/user ID, creation timestamp, expiration time, usage flag<br/>
    ✓ Metadata enables expiration checks and one-time use enforcement without exposing token value<br/>
    ✓ Storage compromise does not expose usable token values<br/>
    ✓ Test: Inspect token storage (database, memory) and verify only hashed tokens stored, never plaintext
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Defense in Depth</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Multiple independent security layers implemented with no single point of failure<br/>
    ✓ Layers include cryptographic token generation, token hashing, expiration enforcement, one-time use, rate limiting, logging<br/>
    ✓ Each layer fails independently without compromising other layers<br/>
    ✓ Rate limiting prevents brute force even if token discovered<br/>
    ✓ Expiration limits attack window even if rate limiting bypassed<br/>
    ✓ One-time use prevents replay even if token intercepted<br/>
    ✓ Test: Verify multiple protections exist and disabling one still leaves others protecting system
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Business Logic Validation</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All business operations validate inputs against business rules not just technical constraints<br/>
    ✓ Negative quantities in purchases or transfers prevented<br/>
    ✓ Self-transfers where from and to accounts are identical blocked<br/>
    ✓ Order totals validated to match sum of line items<br/>
    ✓ Refund amounts verified to not exceed original purchase<br/>
    ✓ Maximum transaction sizes enforced<br/>
    ✓ State transitions in multi-step workflows validated (no skipping steps)<br/>
    ✓ All checks happen server-side in business logic layer, never relying on client-side validation<br/>
    ✓ Test: Attempt invalid operations (negative quantity, self-transfer, excessive amounts) and verify server-side rejection
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Security Event Logging</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All security-relevant events logged with sufficient context for investigation<br/>
    ✓ Logged events include token generation, verification attempts (success and failure), rate limit violations, expiration checks, business logic validation failures<br/>
    ✓ Logs include masked user identifiers, IP addresses, timestamps, and actions taken<br/>
    ✓ Token values, passwords, and secrets never logged<br/>
    ✓ Structured JSON format for easy parsing and analysis<br/>
    ✓ Failed security events trigger alerts when patterns indicate attacks<br/>
    ✓ Logs sent to centralized system for tamper resistance<br/>
    ✓ Test: Trigger various security events and verify comprehensive logs with appropriate detail and no sensitive data exposure
  </div>
</div>

</div>

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
