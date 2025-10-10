# A07: Identification and Authentication Failures — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: bcrypt hashing, rate limiting, MFA support, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security engineer implementing OWASP A07:2021 - Identification and Authentication Failures.

Context:
- Node 18 + TypeScript
- Implementing secure authentication system
- Use bcrypt for password hashing (cost factor >= 12)
- Implement constant-time comparison to prevent timing attacks
- Add rate limiting for login attempts
- Support multi-factor authentication (MFA)
- Secure session management

Security Requirements:
- Never store passwords in plaintext
- Use bcrypt.hash() with cost factor >= 12
- Use bcrypt.compare() for constant-time verification
- Implement account lockout after failed attempts (5 tries)
- Add rate limiting (max 5 login attempts per IP per 15 minutes)
- Generate cryptographically secure session tokens
- Implement session expiration (30 minutes idle, 24 hours absolute)
- Support MFA (TOTP, SMS, hardware keys)
- Log authentication events

Task:
1) Refactor `examples/owasp/A07_authn_failures/insecure.ts` to use secure authentication
2) Replace plaintext password comparison with bcrypt:
   - Hash passwords with bcrypt.hash(password, 12)
   - Verify with bcrypt.compare() for timing-safe comparison
3) Implement account lockout:
   - Track failed login attempts
   - Lock account after 5 consecutive failures
   - Unlock after 15 minutes or admin action
4) Add rate limiting:
   - Max 5 login attempts per IP per 15 minutes
   - Return generic error (don't reveal if account is locked)
5) Implement secure session management:
   - Generate random session IDs (crypto.randomBytes)
   - Store session metadata (user ID, expiry, IP)
   - Validate session on each request
6) Run tests in `examples/owasp/A07_authn_failures/__tests__/authn.test.ts` and ensure they pass

Security Checklist:
□ Bcrypt used for password hashing (cost >= 12)
□ Constant-time password comparison (bcrypt.compare)
□ Account lockout after 5 failed attempts
□ Rate limiting prevents brute force (5 attempts/15 min)
□ Session IDs are cryptographically random
□ Session expiration enforced
□ Generic error messages (don't leak user existence)
□ Authentication events logged
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security engineer. Fix OWASP A07: Identification and Authentication Failures in examples/owasp/A07_authn_failures/insecure.ts.

Requirements:
- Replace plaintext password storage with bcrypt hashing (cost 12)
- Replace == comparison with bcrypt.compare() (timing-safe)
- Implement account lockout (5 failed attempts, 15 min cooldown)
- Add rate limiting (5 login attempts per IP per 15 minutes)
- Generate secure session tokens (crypto.randomBytes)
- Implement session expiration (30 min idle, 24 hr absolute)
- Generic error messages
- Tests must pass in __tests__/authn.test.ts

Authentication Standards:
- Password hashing: bcrypt with cost factor 12
- Session tokens: 32 bytes random (crypto.randomBytes)
- Rate limit: 5 attempts per 15 minutes per IP
- Account lockout: 5 failures = 15 minute lockout
- Session expiry: 30 min idle OR 24 hr absolute
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
// ❌ INSECURE: Plaintext password and timing leak
export function login(userPass: string, input: string) {
  if (input == userPass) return true;  // ❌ Timing attack + plaintext!
  return false;
}
```

**Problems**:
- Passwords stored in plaintext
- Non-constant-time comparison (== operator)
- No rate limiting or account lockout
- Vulnerable to timing attacks and brute force

### After (Secure)
```typescript
// ✅ SECURE: Bcrypt hashing with proper authentication controls
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

interface User {
  id: string;
  email: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil?: Date;
}

interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  ipAddress: string;
}

// In-memory stores (use Redis/database in production)
const users = new Map<string, User>();
const sessions = new Map<string, Session>();
const rateLimits = new Map<string, number[]>();

// ✅ Register new user with bcrypt password hash
export async function registerUser(email: string, password: string): Promise<User> {
  // Validate password strength (implement separately)
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters');
  }

  // ✅ Hash password with bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user: User = {
    id: crypto.randomBytes(16).toString('hex'),
    email,
    passwordHash,
    failedAttempts: 0,
  };

  users.set(email, user);
  return user;
}

function checkRateLimit(ipAddress: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const attempts = rateLimits.get(ipAddress) || [];
  const recentAttempts = attempts.filter(time => time > windowStart);

  if (recentAttempts.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }

  recentAttempts.push(now);
  rateLimits.set(ipAddress, recentAttempts);
  return true;
}

function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false;

  const now = new Date();
  if (now < user.lockedUntil) {
    return true; // Still locked
  }

  // ✅ Unlock account and reset failed attempts
  user.lockedUntil = undefined;
  user.failedAttempts = 0;
  return false;
}

export async function login(
  email: string,
  password: string,
  ipAddress: string
): Promise<{ sessionId: string } | null> {
  // ✅ Check rate limit first
  if (!checkRateLimit(ipAddress)) {
    // ✅ Generic error (don't reveal rate limit details)
    throw new Error('Too many login attempts. Please try again later.');
  }

  // ✅ Find user
  const user = users.get(email);
  if (!user) {
    // ✅ Generic error (don't reveal if user exists)
    throw new Error('Invalid credentials');
  }

  // ✅ Check if account is locked
  if (isAccountLocked(user)) {
    // ✅ Generic error (don't reveal account is locked)
    throw new Error('Invalid credentials');
  }

  // ✅ Constant-time password verification
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    // ✅ Increment failed attempts
    user.failedAttempts++;

    // ✅ Lock account after max attempts
    if (user.failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      console.log('Account locked', {
        email: email.substring(0, 3) + '***',
        attempts: user.failedAttempts,
        lockedUntil: user.lockedUntil.toISOString(),
      });
    }

    // ✅ Log failed attempt
    console.log('Login failed', {
      email: email.substring(0, 3) + '***',
      ipAddress,
      timestamp: new Date().toISOString(),
    });

    // ✅ Generic error
    throw new Error('Invalid credentials');
  }

  // ✅ Reset failed attempts on successful login
  user.failedAttempts = 0;
  user.lockedUntil = undefined;

  // ✅ Create secure session
  const sessionId = crypto.randomBytes(32).toString('hex');
  const session: Session = {
    id: sessionId,
    userId: user.id,
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    ipAddress,
  };

  sessions.set(sessionId, session);

  // ✅ Log successful login
  console.log('Login successful', {
    userId: user.id,
    ipAddress,
    timestamp: new Date().toISOString(),
  });

  return { sessionId };
}

export function validateSession(sessionId: string): { userId: string } | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null; // Session not found
  }

  const now = new Date();

  // ✅ Check absolute timeout (24 hours from creation)
  const sessionAge = now.getTime() - session.createdAt.getTime();
  if (sessionAge > SESSION_ABSOLUTE_TIMEOUT_MS) {
    sessions.delete(sessionId);
    return null; // Session expired
  }

  // ✅ Check idle timeout (30 minutes from last access)
  const idleTime = now.getTime() - session.lastAccessedAt.getTime();
  if (idleTime > SESSION_IDLE_TIMEOUT_MS) {
    sessions.delete(sessionId);
    return null; // Session expired due to inactivity
  }

  // ✅ Update last accessed time
  session.lastAccessedAt = now;
  sessions.set(sessionId, session);

  return { userId: session.userId };
}

export function logout(sessionId: string): void {
  sessions.delete(sessionId);
  console.log('User logged out', { sessionId });
}
```

---

## Common Authentication Failures

1. **Plaintext Password Storage**
   - Problem: Database breach exposes all passwords
   - Fix: Use bcrypt with cost factor >= 12

2. **Timing Attacks**
   - Problem: == comparison leaks timing information
   - Fix: Use bcrypt.compare() (constant-time)

3. **No Rate Limiting**
   - Problem: Unlimited login attempts allow brute force
   - Fix: Rate limit by IP (5 attempts per 15 minutes)

4. **No Account Lockout**
   - Problem: Unlimited password guessing per account
   - Fix: Lock account after 5 failed attempts

5. **Weak Session IDs**
   - Problem: Predictable session tokens
   - Fix: crypto.randomBytes(32) for session IDs

6. **No Session Expiration**
   - Problem: Sessions valid forever
   - Fix: Idle timeout (30 min) + absolute timeout (24 hours)

7. **Information Disclosure**
   - Problem: Different errors reveal user existence
   - Fix: Generic "Invalid credentials" for all failures

---

## Password Policy Best Practices

```typescript
export function validatePasswordStrength(password: string): void {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain special characters');
  }

  // Check against common password list (implement separately)
  if (isCommonPassword(password)) {
    errors.push('Password is too common');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
}
```

---

## Multi-Factor Authentication (MFA) Example

```typescript
import speakeasy from 'speakeasy';

interface UserWithMFA extends User {
  mfaSecret?: string;
  mfaEnabled: boolean;
}

export function setupMFA(userId: string): { secret: string; qrCode: string } {
  const secret = speakeasy.generateSecret({
    name: 'MyApp',
    length: 32,
  });

  // Store secret for user (in production, encrypt before storing)
  const user = users.get(userId) as UserWithMFA;
  user.mfaSecret = secret.base32;

  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url || '',
  };
}

export function verifyMFAToken(userId: string, token: string): boolean {
  const user = users.get(userId) as UserWithMFA;

  if (!user?.mfaSecret) {
    return false;
  }

  return speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps (±1 minute)
  });
}
```

---

## Testing Checklist

- [ ] Passwords hashed with bcrypt (cost >= 12)
- [ ] Password verification uses bcrypt.compare (constant-time)
- [ ] Account locked after 5 failed attempts
- [ ] Lockout duration is 15 minutes
- [ ] Rate limiting prevents brute force (5 attempts/15 min)
- [ ] Session IDs are cryptographically random
- [ ] Session expiration enforced (idle + absolute)
- [ ] Generic error messages (no user enumeration)
- [ ] Authentication events logged
- [ ] MFA supported and tested

---

## Attack Scenarios to Prevent

```typescript
// Test these scenarios - all should be blocked:
const attackScenarios = [
  "Brute force attack (rate limit blocks after 5 attempts)",
  "Timing attack to enumerate users (constant-time comparison)",
  "Account enumeration via error messages (generic errors)",
  "Session fixation (regenerate session ID on login)",
  "Session hijacking (validate IP, user agent)",
  "Credential stuffing (rate limit, MFA, breach monitoring)",
  "Password spraying (account lockout prevents)",
];
```

---

## Session Security Checklist

- [ ] Session IDs generated with crypto.randomBytes(32)
- [ ] Session ID regenerated on login (prevent fixation)
- [ ] Session expires after 30 minutes idle
- [ ] Session expires after 24 hours absolute
- [ ] Session invalidated on logout
- [ ] Session cookies have HttpOnly, Secure, SameSite flags
- [ ] Session IP/User-Agent validated (optional)

---

## Additional Resources

- [OWASP A07:2021 - Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Credential Stuffing Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
