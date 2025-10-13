# Identification and Authentication Failures — OWASP A07 Prompt Pack

> **OWASP A07: Identification and Authentication Failures** occurs when applications fail to properly authenticate users, manage sessions, or protect credentials. This includes weak password requirements, no brute force protection, session fixation, credential stuffing vulnerabilities, and missing multi-factor authentication.

---

## 🎯 What is A07?

**Definition**: Confirmation of the user's identity, authentication, and session management is critical to protect against authentication-related attacks. Authentication failures can allow attackers to assume other users' identities temporarily or permanently through credential stuffing, brute force, or session hijacking.

**Common Manifestations**:
- **Plaintext Passwords**: Storing passwords without hashing or using weak hashing (MD5, SHA-1)
- **No Brute Force Protection**: Unlimited login attempts allowing password guessing
- **Weak Session Management**: Predictable session IDs or sessions that never expire
- **No Multi-Factor Authentication**: Relying solely on password without additional verification
- **Credential Stuffing**: No rate limiting or breach detection for automated credential testing
- **Timing Attacks**: Non-constant-time password comparison leaking information

**Why It Matters**: Authentication failures ranked #7 in OWASP Top 10 2021, with 94% of applications tested having some form of broken authentication. Credential stuffing attacks using breached password databases are increasingly common. Weak authentication enables account takeover, identity theft, and unauthorized access to sensitive data and functions.

---

## 🔗 Maps to STRIDE

**Primary**: **Spoofing** (attackers impersonate legitimate users)
**Secondary**: **Elevation of Privilege** (gaining admin access through authentication bypass), **Repudiation** (no audit trail for authentication events)

See also: [STRIDE: Spoofing](/docs/prompts/stride/spoofing), [STRIDE: Elevation of Privilege](/docs/prompts/stride/elevation-of-privilege), and [STRIDE: Repudiation](/docs/prompts/stride/repudiation)

---

## 🤖 AI Prompt #1: Analyze Code for Authentication Vulnerabilities

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security analyst specializing in identification and authentication failures (OWASP A07).

Context:
I have a Node.js + TypeScript application with user authentication, session management, and login functionality. I need to identify all locations where authentication mechanisms may be weak or vulnerable to attack.

My codebase includes:
- User registration and login flows
- Password storage and verification
- Session management with cookies or tokens
- Password reset functionality
- Rate limiting (or lack thereof)
- Multi-factor authentication (or lack thereof)

Task:
Analyze the following code/files for OWASP A07 vulnerabilities:

[PASTE YOUR CODE HERE - authentication controllers, password hashing, session management, login endpoints]

Identify:

1. **Weak Password Storage**: Plaintext passwords, MD5/SHA-1 hashing, insufficient bcrypt cost factor
2. **Timing Attacks**: Using == or === for password comparison instead of constant-time
3. **No Brute Force Protection**: Missing rate limiting on login attempts
4. **No Account Lockout**: Unlimited password attempts per account
5. **Weak Session IDs**: Predictable or sequential session tokens
6. **No Session Expiration**: Sessions valid indefinitely or for excessive periods
7. **Missing MFA**: No two-factor authentication for sensitive accounts
8. **Information Disclosure**: Different error messages revealing user existence

For each vulnerability found:

**Location**: [File:Line or Function Name]
**Issue**: [Specific authentication weakness]
**Attack Vector**: [How an attacker would exploit - brute force, credential stuffing, timing attack, etc.]
**Risk**: [Impact - account takeover, unauthorized access, credential theft]
**Remediation**: [Specific fix - bcrypt with cost 12, rate limiting, constant-time comparison, MFA]

Requirements:
- Check password storage method (must be bcrypt with cost >= 12)
- Verify password comparison uses constant-time function
- Look for rate limiting on authentication endpoints
- Check for account lockout mechanisms
- Verify session ID generation is cryptographically secure
- Check session expiration settings
- Look for MFA implementation

Output:
Provide a prioritized list of authentication vulnerabilities (Critical > High > Medium) with specific remediation examples using bcrypt, rate limiting, session management, and MFA.
```

</div>

---

## 🤖 AI Prompt #2: Implement Secure Authentication

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security engineer implementing comprehensive secure authentication for a web application (OWASP A07 remediation).

Context:
I need to implement proper authentication and session management throughout my Node.js + TypeScript application.

Current state:
- Passwords stored in plaintext or with weak hashing
- Non-constant-time password comparison
- No rate limiting on login attempts
- No account lockout after failed attempts
- Weak or predictable session tokens
- Sessions never expire
- No multi-factor authentication

Requirements:
Implement the following secure authentication patterns:

1. **Password Hashing with bcrypt**
   - Function: registerUser(email: string, password: string): Promise<User>
   - Use bcrypt.hash() with cost factor 12 or higher
   - Validate password strength (min 12 chars, complexity requirements)
   - Store only password hash, never plaintext
   - Include TypeScript types for User

2. **Constant-Time Password Verification**
   - Function: login(email: string, password: string, ipAddress: string): Promise<Session>
   - Use bcrypt.compare() for timing-safe comparison
   - Never use == or === to compare passwords
   - Generic error messages (don't reveal if user exists)

3. **Account Lockout**
   - Track failed login attempts per account
   - Lock account after 5 consecutive failures
   - Lockout duration: 15 minutes minimum
   - Reset counter on successful login
   - Log lockout events for monitoring

4. **Rate Limiting**
   - Maximum 5 login attempts per IP per 15 minutes
   - Track requests in-memory Map or Redis
   - Generic error messages (don't reveal rate limit details)
   - Function: checkRateLimit(identifier: string, max: number, windowMs: number): boolean

5. **Secure Session Management**
   - Generate session IDs with crypto.randomBytes(32)
   - Store session metadata: userId, createdAt, lastAccessedAt, ipAddress
   - Implement idle timeout: 30 minutes of inactivity
   - Implement absolute timeout: 24 hours maximum
   - Regenerate session ID on login (prevent fixation)
   - Function: validateSession(sessionId: string): Promise<User | null>

6. **Multi-Factor Authentication**
   - Support TOTP (Time-based One-Time Password) with speakeasy
   - Function: setupMFA(userId: string): { secret: string; qrCode: string }
   - Function: verifyMFAToken(userId: string, token: string): boolean
   - Enforce MFA for admin accounts

7. **Test Coverage**
   - Unit tests for bcrypt hashing and verification
   - Tests for rate limiting enforcement
   - Tests for account lockout after 5 failures
   - Tests for session expiration (idle and absolute)
   - Tests for generic error messages

Implementation:
- Use bcrypt library with cost factor 12+
- Use crypto.randomBytes for session tokens
- TypeScript strict mode with proper typing
- Comprehensive inline security comments
- Generic error messages at all failure points
- Security event logging

Output:
Provide complete, executable TypeScript code for:
- `auth/register.ts` (user registration with bcrypt)
- `auth/login.ts` (login with rate limiting, lockout, session creation)
- `auth/sessions.ts` (session management with expiration)
- `auth/mfa.ts` (multi-factor authentication with TOTP)
- `__tests__/authentication.test.ts` (Jest tests for all security controls)
```

</div>

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: Plaintext password and timing attack vulnerability
const users = new Map<string, { email: string; password: string }>();

export function register(email: string, password: string) {
  // ❌ Stores password in plaintext!
  users.set(email, { email, password });
}

export function login(email: string, password: string): boolean {
  const user = users.get(email);
  if (!user) return false;

  // ❌ Non-constant-time comparison leaks timing information!
  // ❌ Compares plaintext passwords!
  return user.password === password;
}

// Attack: Database breach exposes all passwords
// Attack: Timing attack reveals if password is close to correct
// Attack: Unlimited brute force attempts
// Attack: No session management or expiration
```

### After (Secure Code)

```typescript
// ✅ SECURE: Comprehensive authentication with bcrypt, rate limiting, and session management
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import speakeasy from 'speakeasy';

const BCRYPT_ROUNDS = 12; // Cost factor for bcrypt
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

interface User {
  id: string;
  email: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil?: Date;
  mfaSecret?: string;
  mfaEnabled: boolean;
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

// ✅ Validate password strength
function validatePasswordStrength(password: string): void {
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

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
}

// ✅ Register user with bcrypt password hashing
export async function registerUser(email: string, password: string): Promise<User> {
  // ✅ Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format');
  }

  // ✅ Validate password strength
  validatePasswordStrength(password);

  // ✅ Check if user already exists
  if (users.has(email)) {
    throw new Error('Email already registered');
  }

  // ✅ Hash password with bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user: User = {
    id: crypto.randomBytes(16).toString('hex'),
    email,
    passwordHash, // ✅ Store hash, not plaintext
    failedAttempts: 0,
    mfaEnabled: false,
  };

  users.set(email, user);

  console.log('User registered', {
    userId: user.id,
    email: email.substring(0, 3) + '***',
    timestamp: new Date().toISOString()
  });

  return user;
}

// ✅ Rate limiting
function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  const attempts = rateLimits.get(identifier) || [];
  const recentAttempts = attempts.filter(time => time > windowStart);

  if (recentAttempts.length >= maxRequests) {
    console.warn('Rate limit exceeded', {
      identifier: identifier.substring(0, 8) + '***',
      attempts: recentAttempts.length,
      timestamp: new Date().toISOString()
    });
    return false;
  }

  recentAttempts.push(now);
  rateLimits.set(identifier, recentAttempts);
  return true;
}

// ✅ Check if account is locked
function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false;

  const now = new Date();
  if (now < user.lockedUntil) {
    return true; // Still locked
  }

  // ✅ Auto-unlock after lockout period
  user.lockedUntil = undefined;
  user.failedAttempts = 0;
  return false;
}

// ✅ Secure login with comprehensive protections
export async function login(
  email: string,
  password: string,
  ipAddress: string,
  mfaToken?: string
): Promise<{ sessionId: string } | null> {
  // ✅ Rate limiting by IP address
  if (!checkRateLimit(ipAddress, MAX_REQUESTS_PER_WINDOW, RATE_LIMIT_WINDOW_MS)) {
    // ✅ Generic error (don't reveal rate limit details)
    throw new Error('Too many login attempts. Please try again later.');
  }

  // ✅ Find user
  const user = users.get(email);
  if (!user) {
    // ✅ Generic error (don't reveal if user exists)
    // Still consume time to prevent timing attacks
    await bcrypt.hash(password, BCRYPT_ROUNDS);
    throw new Error('Invalid credentials');
  }

  // ✅ Check account lockout
  if (isAccountLocked(user)) {
    // ✅ Generic error (don't reveal account is locked)
    throw new Error('Invalid credentials');
  }

  // ✅ Constant-time password verification with bcrypt
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    // ✅ Increment failed attempts
    user.failedAttempts++;

    // ✅ Lock account after max attempts
    if (user.failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      console.warn('Account locked due to failed attempts', {
        email: email.substring(0, 3) + '***',
        attempts: user.failedAttempts,
        lockedUntil: user.lockedUntil.toISOString()
      });
    }

    // ✅ Log failed attempt
    console.warn('Login failed', {
      email: email.substring(0, 3) + '***',
      ipAddress: ipAddress.split('.').slice(0, 3).join('.') + '.***',
      failedAttempts: user.failedAttempts,
      timestamp: new Date().toISOString()
    });

    // ✅ Generic error
    throw new Error('Invalid credentials');
  }

  // ✅ Verify MFA if enabled
  if (user.mfaEnabled) {
    if (!mfaToken) {
      throw new Error('MFA token required');
    }

    const isMFAValid = verifyMFAToken(user.id, mfaToken);
    if (!isMFAValid) {
      console.warn('MFA verification failed', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      throw new Error('Invalid MFA token');
    }
  }

  // ✅ Reset failed attempts on successful login
  user.failedAttempts = 0;
  user.lockedUntil = undefined;

  // ✅ Generate cryptographically secure session ID
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
  console.info('Login successful', {
    userId: user.id,
    ipAddress: ipAddress.split('.').slice(0, 3).join('.') + '.***',
    timestamp: new Date().toISOString()
  });

  return { sessionId };
}

// ✅ Validate session with expiration checks
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
    console.info('Session expired (absolute timeout)', { sessionId });
    return null;
  }

  // ✅ Check idle timeout (30 minutes from last access)
  const idleTime = now.getTime() - session.lastAccessedAt.getTime();
  if (idleTime > SESSION_IDLE_TIMEOUT_MS) {
    sessions.delete(sessionId);
    console.info('Session expired (idle timeout)', { sessionId });
    return null;
  }

  // ✅ Update last accessed time
  session.lastAccessedAt = now;
  sessions.set(sessionId, session);

  return { userId: session.userId };
}

// ✅ Logout
export function logout(sessionId: string): void {
  const session = sessions.get(sessionId);
  sessions.delete(sessionId);

  if (session) {
    console.info('User logged out', {
      userId: session.userId,
      timestamp: new Date().toISOString()
    });
  }
}

// ✅ Setup MFA (TOTP)
export function setupMFA(userId: string): { secret: string; qrCode: string } {
  const user = Array.from(users.values()).find(u => u.id === userId);
  if (!user) {
    throw new Error('User not found');
  }

  // ✅ Generate MFA secret
  const secret = speakeasy.generateSecret({
    name: `SecureApp (${user.email})`,
    length: 32,
  });

  // ✅ Store secret for user (encrypt in production)
  user.mfaSecret = secret.base32;
  user.mfaEnabled = true;

  console.info('MFA enabled', {
    userId: user.id,
    timestamp: new Date().toISOString()
  });

  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url || '',
  };
}

// ✅ Verify MFA token
export function verifyMFAToken(userId: string, token: string): boolean {
  const user = Array.from(users.values()).find(u => u.id === userId);

  if (!user?.mfaSecret || !user.mfaEnabled) {
    return false;
  }

  // ✅ Verify TOTP token with time window
  return speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token,
    window: 2, // Allow ±1 minute time drift
  });
}

// ✅ Cookie configuration for session management
export function getSecureCookieOptions() {
  return {
    httpOnly: true, // Prevent XSS access to cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' as const, // CSRF protection
    maxAge: SESSION_ABSOLUTE_TIMEOUT_MS,
    path: '/',
  };
}
```

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated authentication code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Password Storage</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All passwords hashed using bcrypt with cost factor of at least 12<br/>
    ✓ Never store passwords in plaintext or use weak algorithms (MD5, SHA-1, SHA-256)<br/>
    ✓ bcrypt library handles salt generation automatically with slow, memory-hard algorithm resistant to GPU acceleration<br/>
    ✓ Passwords hashed immediately before storing on user registration<br/>
    ✓ Passwords never logged or included in error messages<br/>
    ✓ bcrypt version and cost factor documented for future migration planning<br/>
    ✓ Test: Inspect database verify only bcrypt hashes stored, register with same password twice verify different hashes
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Timing Attack Prevention</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Password verification uses constant-time comparison to prevent timing attacks<br/>
    ✓ bcrypt.compare() performs constant-time comparison internally, never use ==, ===, or string operators<br/>
    ✓ Failed login attempts consume similar time by hashing against dummy hash when user doesn't exist<br/>
    ✓ Prevents user enumeration through timing analysis<br/>
    ✓ Response times similar for wrong password vs wrong user within ~10ms<br/>
    ✓ Test: Measure response time for wrong password vs wrong user, times should be similar
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Brute Force Protection</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Multi-layered protection using both IP-based rate limiting and per-account lockout<br/>
    ✓ Rate limiting restricts login attempts to 5 per IP per 15 minutes<br/>
    ✓ Attempts tracked in memory using Map for small deployments or Redis for production<br/>
    ✓ Account lockout activates after 5 consecutive failed attempts, locks for 15 minutes minimum<br/>
    ✓ Failed attempt counter reset on successful login<br/>
    ✓ All rate limit violations and lockouts logged as security events<br/>
    ✓ Generic error messages that don't reveal whether rate limit or lockout triggered<br/>
    ✓ Test: Make 6 attempts from same IP verify 6th blocked, 5 wrong passwords verify account locks
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Account Lockout</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Failed login attempts tracked per account, automatic lock after reaching threshold<br/>
    ✓ Lockout timestamp stored with user record, checked on every login attempt<br/>
    ✓ Locked accounts return same generic "Invalid credentials" error as wrong password<br/>
    ✓ Automatic unlock after lockout duration expires without admin intervention<br/>
    ✓ Progressive lockout considered where duration increases with repeated lockouts<br/>
    ✓ Lockout events logged with masked user identifier and timestamp<br/>
    ✓ Account recovery mechanism provided for legitimate users who forgot password<br/>
    ✓ Test: Enter wrong password 5 times verify lock, wait duration verify auto-unlock, check logs
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Session Management</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Session IDs generated using crypto.randomBytes with minimum 32 bytes (256 bits) entropy<br/>
    ✓ Session metadata stored including userId, creation timestamp, last accessed timestamp, IP address<br/>
    ✓ Both idle timeout (30 min inactivity) and absolute timeout (24 hours from creation) implemented<br/>
    ✓ Both timeouts validated on every session check<br/>
    ✓ Session ID regenerated on login to prevent session fixation attacks<br/>
    ✓ Sessions stored server-side (memory, Redis, database), never trust client-side session data<br/>
    ✓ Session deleted from storage on logout<br/>
    ✓ Last accessed timestamp updated on each authenticated request for idle timeout<br/>
    ✓ Test: Login verify session works, wait 31 min idle verify expired, wait 25 hours verify expired
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Secure Cookies</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Session cookies have httpOnly flag preventing JavaScript access defending against XSS<br/>
    ✓ Secure flag true in production ensuring transmission only over HTTPS<br/>
    ✓ SameSite attribute set to 'strict' or 'lax' to prevent CSRF attacks<br/>
    ✓ Appropriate maxAge set matching session absolute timeout<br/>
    ✓ Generic cookie name like 'sessionId' not revealing technology stack<br/>
    ✓ Path set to minimum required scope, typically '/'<br/>
    ✓ __Host- prefix considered for cookies to enforce secure and path restrictions<br/>
    ✓ Never store sensitive data in cookies, only session identifier referencing server-side storage<br/>
    ✓ Test: Inspect cookies in DevTools verify httpOnly, secure, sameSite flags, attempt JavaScript access verify undefined
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Multi-Factor Authentication</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ TOTP (Time-based One-Time Password) implemented using libraries like speakeasy<br/>
    ✓ Cryptographically secure random secrets generated (32 bytes minimum) for each user<br/>
    ✓ QR codes provided for easy setup in authenticator apps (Google Authenticator, Authy)<br/>
    ✓ MFA secret stored encrypted in database<br/>
    ✓ Tokens verified with time window (±1-2 minutes) to account for clock drift<br/>
    ✓ MFA enforced for admin accounts, offered as option for regular users<br/>
    ✓ Backup codes provided for account recovery if MFA device lost<br/>
    ✓ MFA setup and verification events logged<br/>
    ✓ Same token never accepted twice (replay prevention implemented)<br/>
    ✓ Test: Enable MFA scan QR verify token works, test expired token verify rejection, test reused token verify rejection
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Generic Error Messages</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All authentication failures return identical generic error messages to prevent user enumeration<br/>
    ✓ "Invalid credentials" used for wrong password, wrong username, locked account, disabled account, rate limit exceeded<br/>
    ✓ Never reveal whether specific username exists, password is close, or account is locked<br/>
    ✓ Time-based user enumeration prevented by constant-time password comparison<br/>
    ✓ Registration doesn't reveal if email already exists until after email verification<br/>
    ✓ Password reset doesn't reveal if email exists in system<br/>
    ✓ Different code paths take similar time to prevent timing-based enumeration<br/>
    ✓ Test: Login with wrong user, wrong password, locked account verify identical error with similar response times
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Security Event Logging</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All authentication events logged including successful logins, failed attempts, account lockouts, MFA setup/verification, password changes, logout<br/>
    ✓ Contextual data included: masked user identifier (first 3 chars + ***), masked IP address (last octet hidden), timestamp, user agent, action outcome<br/>
    ✓ Passwords, session IDs, and MFA secrets never logged<br/>
    ✓ Logs sent to centralized system with restricted access<br/>
    ✓ Alerts set up for suspicious patterns like many failed logins from single IP, rapid sequential failed attempts, successful login after multiple failures<br/>
    ✓ Logs retained for minimum 90 days for forensic analysis<br/>
    ✓ Test: Trigger various authentication events verify all logged with appropriate detail, check no sensitive data in logs
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing authentication implementation
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate secure authentication with bcrypt, rate limiting, and MFA
4. **Review generated code** using the Human Review Checklist above
5. **Test bcrypt**: Verify cost factor 12+, hashes stored not plaintext
6. **Test rate limiting**: Verify IP-based blocking after 5 attempts
7. **Test account lockout**: Verify account locks after 5 failed attempts
8. **Test session expiration**: Verify idle and absolute timeouts work
9. **Implement MFA**: Add TOTP support for admin accounts
10. **Monitor logs**: Set up alerts for brute force and credential stuffing patterns

---

## 📖 Additional Resources

- [OWASP A07:2021 - Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Credential Stuffing Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)

---

**Remember**: Authentication failures are preventable through bcrypt password hashing (cost 12+), constant-time comparison (bcrypt.compare), rate limiting (5 attempts/15 min), account lockout (5 failures = 15 min lock), cryptographically secure session IDs (crypto.randomBytes), session expiration (30 min idle + 24 hr absolute), and MFA support (TOTP). Never store plaintext passwords or use timing-vulnerable comparisons.
