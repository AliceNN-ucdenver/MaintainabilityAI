# Cryptographic Failures — OWASP A02 Prompt Pack

> **OWASP A02: Cryptographic Failures** occurs when applications fail to properly protect sensitive data through encryption. This includes using weak algorithms, hardcoding secrets, transmitting data without encryption, storing passwords in plaintext, and failing to implement authenticated encryption.

---

## 🎯 What is Cryptographic Failures?

**Definition**: Cryptographic failures occur when applications fail to adequately protect data in transit or at rest. This includes failures to use encryption where needed, use of weak cryptographic algorithms, poor key management, and storing sensitive data without proper encryption.

**Common Manifestations**:
- **Weak Encryption**: Using DES, 3DES, RC4, or MD5 instead of modern algorithms like AES-256-GCM
- **Hardcoded Secrets**: Encryption keys, passwords, or API keys stored in source code
- **Encoding vs Encryption**: Using base64 or hex encoding thinking it's encryption
- **Weak Password Hashing**: Using MD5, SHA1, or no hashing instead of bcrypt/Argon2
- **Missing TLS**: Transmitting sensitive data over HTTP instead of HTTPS
- **IV Reuse**: Using the same initialization vector for multiple encryptions

**Why It Matters**: Cryptographic failures expose sensitive data to attackers who intercept network traffic or gain database access. Data breaches from poor encryption affect millions of users and cost organizations billions annually. Proper cryptography is essential for protecting passwords, payment data, personal information, and confidential business data.

---

## 🔗 Maps to STRIDE

**Primary**: **Information Disclosure** (sensitive data exposed through weak encryption)
**Secondary**: **Tampering** (lack of authenticated encryption allows data modification)

See also: [STRIDE: Information Disclosure](/docs/prompts/stride/information-disclosure) and [STRIDE: Tampering](/docs/prompts/stride/tampering)

---

## 🤖 AI Prompt #1: Analyze Code for Cryptographic Vulnerabilities

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security analyst specializing in cryptographic vulnerabilities (OWASP A02).

Context:
I have a Node.js + TypeScript application that handles sensitive data including passwords, API keys, and user information. I need to identify all locations where cryptographic failures may expose this data.

My codebase includes:
- User authentication with password storage
- Encrypted data storage in database
- API communication with external services
- Configuration files with credentials
- File encryption/decryption functionality

Task:
Analyze the following code/files for OWASP A02 vulnerabilities:

[PASTE YOUR CODE HERE - authentication, encryption, configuration files]

Identify:

1. **Weak Encryption Algorithms**: DES, 3DES, RC4, MD5, SHA1 usage
2. **Hardcoded Secrets**: Keys, passwords, tokens in source code
3. **Encoding as Encryption**: base64, hex used instead of real encryption
4. **Weak Password Hashing**: MD5, SHA1, or plaintext passwords
5. **Missing Encryption**: Sensitive data stored or transmitted unencrypted
6. **IV/Nonce Reuse**: Same initialization vector used multiple times
7. **Unauthenticated Encryption**: CBC mode without integrity check
8. **Insufficient Key Length**: Keys shorter than 256 bits for symmetric encryption

For each vulnerability found:

**Location**: [File:Line or Function Name]
**Issue**: [Specific cryptographic failure]
**Attack Vector**: [How an attacker would exploit this]
**Risk**: [Impact - data exposure, credential theft, etc.]
**Remediation**: [Specific code fix with TypeScript example using Node.js crypto]

Requirements:
- Check password hashing (should be bcrypt with cost >= 12)
- Verify encryption uses AES-256-GCM (not base64 or weak algorithms)
- Identify hardcoded keys/secrets
- Check for proper key management (environment variables)
- Verify random number generation uses crypto.randomBytes

Output:
Provide a prioritized list of vulnerabilities (Critical > High > Medium) with specific code locations and remediation examples using Node.js crypto module and bcrypt.
```

</div>

---

## 🤖 AI Prompt #2: Implement Secure Cryptography

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px; 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security engineer implementing comprehensive cryptographic controls for a web application (OWASP A02 remediation).

Context:
I need to implement proper encryption and key management throughout my Node.js + TypeScript application.

Current state:
- Application stores sensitive user data
- Passwords need secure hashing
- API keys and secrets need encryption
- Files contain sensitive information
- Database stores PII and confidential data

Requirements:
Implement the following cryptographic patterns:

1. **Strong Encryption for Data**
   - Algorithm: AES-256-GCM (authenticated encryption)
   - Generate random IV for each encryption operation (crypto.randomBytes(16))
   - Load encryption key from environment variable (32 bytes)
   - Return IV + authTag + encrypted data
   - Include TypeScript types for encrypted data structure

2. **Secure Password Hashing**
   - Use bcrypt with cost factor >= 12
   - Function: hashPassword(password: string): Promise<string>
   - Function: verifyPassword(password: string, hash: string): Promise<boolean>
   - Use bcrypt.compare() for timing-safe comparison

3. **Key Management**
   - Load all keys from environment variables (never hardcode)
   - Validate key length (32 bytes for AES-256)
   - Function: getEncryptionKey(): Buffer
   - Throw error if key not configured or wrong length

4. **Secure Random Generation**
   - Use crypto.randomBytes() for all random values
   - Never use Math.random() for security purposes
   - Generate tokens, IVs, and salts cryptographically

5. **Test Coverage**
   - Encryption/decryption roundtrip tests
   - Password hashing and verification tests
   - Invalid key detection tests
   - Tampered ciphertext rejection (GCM auth tag validation)

Implementation:
- Use Node.js crypto module (built-in)
- Use bcrypt npm package for passwords
- TypeScript strict mode with proper typing
- Generic error messages (don't leak crypto details)
- Comprehensive inline comments explaining choices

Output:
Provide complete, executable TypeScript code for:
- `crypto/encryption.ts` (encryptData, decryptData, getEncryptionKey)
- `crypto/passwords.ts` (hashPassword, verifyPassword)
- `crypto/random.ts` (generateToken, generateIV)
- `__tests__/crypto.test.ts` (Jest test cases)
```

</div>

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: Base64 encoding is not encryption!
export function encryptData(data: string): string {
  const key = "hardcoded-secret-key-123"; // ❌ Hardcoded key
  return Buffer.from(data + key).toString('base64'); // ❌ Just encoding
}

// ❌ CRITICAL: Plaintext password storage
export function savePassword(password: string): void {
  database.insert({ password }); // ❌ Stored in plaintext
}

// ❌ CRITICAL: Weak hashing algorithm
export function hashPassword(password: string): string {
  return crypto.createHash('md5').update(password).digest('hex'); // ❌ MD5 is broken
}
```

### After (Secure Code)

```typescript
// ✅ SECURE: AES-256-GCM encryption with proper key management
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const BCRYPT_ROUNDS = 12;

// ✅ Key management - load from environment
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars)`);
  }

  return keyBuffer;
}

// ✅ Encrypt data with AES-256-GCM
export function encryptData(plaintext: string): string {
  try {
    // ✅ Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // ✅ Create cipher with authenticated encryption
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    // ✅ Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    // ✅ Get authentication tag
    const authTag = cipher.getAuthTag();

    // ✅ Combine IV + authTag + encrypted data
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  } catch (err) {
    // ✅ Generic error message
    console.error('Encryption failed:', err);
    throw new Error('Encryption failed');
  }
}

// ✅ Decrypt data with integrity verification
export function decryptData(encryptedData: string): string {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extract IV, auth tag, and encrypted content
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // ✅ Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);

    // ✅ Set authentication tag for verification
    decipher.setAuthTag(authTag);

    // ✅ Decrypt and verify
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final() // Will throw if auth tag doesn't match (tampered data)
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    // ✅ Generic error message
    console.error('Decryption failed:', err);
    throw new Error('Decryption failed or data tampered');
  }
}

// ✅ Secure password hashing with bcrypt
export async function hashPassword(password: string): Promise<string> {
  // ✅ Bcrypt automatically generates salt and uses cost factor
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

// ✅ Constant-time password verification
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // ✅ bcrypt.compare uses constant-time comparison
  return await bcrypt.compare(password, hash);
}

// ✅ Generate cryptographically secure tokens
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
```

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #dc2626;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated cryptographic code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Encryption Algorithm</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Only AES-256-GCM used for symmetric encryption, never DES, 3DES, RC4, or ECB mode<br/>
    ✓ Algorithm provides both confidentiality and authenticity through authenticated encryption<br/>
    ✓ GCM mode includes authentication tag that prevents tampering<br/>
    ✓ Implementation uses Node.js crypto module with correct algorithm name<br/>
    ✓ No custom crypto implementations exist<br/>
    ✓ Test: Encrypt data and verify output includes IV, auth tag, and ciphertext - tampering fails decryption
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Key Management</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All encryption keys come from environment variables or secrets management system<br/>
    ✓ Never hardcoded in source code or configuration files checked into Git<br/>
    ✓ Keys are exactly 32 bytes (256 bits) for AES-256<br/>
    ✓ Application validates key length on startup and fails fast if missing or wrong length<br/>
    ✓ Key rotation mechanisms documented and testable<br/>
    ✓ Production keys never appear in development environments or logs<br/>
    ✓ Test: Remove key from environment - app fails to start with clear error, Git history has no keys
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">IV Generation & Randomness</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Every encryption operation generates fresh random IV using crypto.randomBytes(16)<br/>
    ✓ IV never reused with same key<br/>
    ✓ IVs prepended to ciphertext for decryption availability<br/>
    ✓ All cryptographic randomness uses crypto.randomBytes(), never Math.random() or Date.now()<br/>
    ✓ Random values have sufficient entropy (32 bytes for tokens, 16 bytes for IVs)<br/>
    ✓ No custom random number generators for security-sensitive operations<br/>
    ✓ Test: Encrypt same plaintext twice - outputs completely different due to random IVs
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Password Hashing</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Passwords hashed with bcrypt using cost factor of at least 12<br/>
    ✓ Never MD5, SHA1, SHA256, or plaintext storage<br/>
    ✓ Bcrypt automatically handles salt generation<br/>
    ✓ Password verification uses bcrypt.compare() for constant-time comparison<br/>
    ✓ Passwords never logged, stored unhashed in memory longer than necessary, or transmitted except over TLS<br/>
    ✓ Test: Hash same password twice - hashes differ (random salt), bcrypt.compare works for valid/invalid
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Authenticated Encryption</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All encryption includes authentication to prevent tampering<br/>
    ✓ GCM mode provides authentication through authentication tag<br/>
    ✓ After encryption, retrieve auth tag with cipher.getAuthTag() and include with ciphertext<br/>
    ✓ During decryption, set auth tag with decipher.setAuthTag() before calling final()<br/>
    ✓ Never use CBC, CFB, or OFB modes without separate HMAC<br/>
    ✓ Test: Modify encrypted data before decryption - verify rejection with authentication failure error
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Data in Transit</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All network communication containing sensitive data uses TLS 1.2 or higher, never plain HTTP<br/>
    ✓ APIs reject HTTP requests for sensitive endpoints or redirect to HTTPS<br/>
    ✓ HTTPS enforced in production through HSTS headers<br/>
    ✓ TLS certificates valid and verified (not self-signed in production)<br/>
    ✓ Database connections use TLS/SSL when communicating over networks<br/>
    ✓ No sensitive data transmitted in URL query parameters<br/>
    ✓ Test: Attempt HTTP connection to sensitive endpoints - verify rejection or redirect to HTTPS
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Sensitive Data in Logs</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Logs never contain passwords, API keys, tokens, encryption keys, credit cards, or other secrets<br/>
    ✓ Logging sanitization removes or masks sensitive fields before writing<br/>
    ✓ Stack traces sanitized to not expose sensitive data<br/>
    ✓ Log files protected with appropriate file permissions and encrypted at rest if needed<br/>
    ✓ Error messages to clients are generic and don't leak cryptographic implementation details<br/>
    ✓ Test: Trigger errors in encryption/authentication - logs contain only generic messages, no sensitive data
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing codebase for cryptographic vulnerabilities
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate secure encryption and hashing implementations
4. **Review generated code** using the Human Review Checklist above
5. **Test thoroughly**: Encryption/decryption roundtrips, password hashing, tampered data rejection
6. **Generate encryption key**: Run `crypto.randomBytes(32).toString('hex')` once, store in environment
7. **Update documentation**: Document key management procedures and rotation policy
8. **Rotate keys**: Implement key rotation for production systems
9. **Audit regularly**: Review cryptographic code quarterly for new vulnerabilities

---

## 📖 Additional Resources

- [OWASP A02:2021 - Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)

---

**Remember**: Cryptographic failures are preventable through strong algorithms (AES-256-GCM), proper key management (environment variables), and secure password hashing (bcrypt cost >= 12). Never use encoding as encryption, and always verify data integrity with authenticated encryption.
