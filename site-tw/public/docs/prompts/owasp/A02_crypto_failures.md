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

After AI generates cryptographic code, carefully review each area before deploying:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 🔐 Encryption Algorithm

Verify that only AES-256-GCM is used for symmetric encryption, never DES, 3DES, RC4, or any ECB mode ciphers. The algorithm must provide both confidentiality and authenticity through authenticated encryption. GCM mode includes an authentication tag that prevents tampering. Check that the implementation uses the Node.js crypto module with the correct algorithm name 'aes-256-gcm'. Ensure no custom crypto implementations exist as these are prone to subtle vulnerabilities.

**Test it**: Encrypt data and verify the output includes IV, authentication tag, and ciphertext. Tamper with the ciphertext and verify decryption fails.

---

### 🔑 Key Management

All encryption keys must come from environment variables or a secrets management system, never hardcoded in source code or configuration files checked into Git. Keys should be exactly 32 bytes (256 bits) for AES-256. The application must validate key length on startup and fail fast with clear error messages if keys are missing or wrong length. Key rotation mechanisms should be documented and testable. Production keys must never appear in development environments or logs.

**Test it**: Remove encryption key from environment and verify application fails to start with clear error. Check Git history contains no committed keys.

---

### 🎲 Initialization Vector (IV) Generation

Every encryption operation must generate a fresh random IV using crypto.randomBytes(16). The IV must never be reused with the same key, as this breaks the security of most encryption modes including GCM. IVs should be prepended to the ciphertext so they're available for decryption. The IV itself doesn't need to be secret but must be unique for each encryption. Verify no static IVs or counters are used.

**Test it**: Encrypt the same plaintext twice and verify the outputs are completely different due to random IVs.

---

### 🔒 Password Hashing

Passwords must be hashed with bcrypt using a cost factor of at least 12, never with MD5, SHA1, SHA256, or stored in plaintext. Bcrypt automatically handles salt generation and is intentionally slow to resist brute force attacks. Password verification must use bcrypt.compare() which provides constant-time comparison to prevent timing attacks. Never implement custom password comparison logic. Passwords should never be logged, stored unhashed in memory longer than necessary, or transmitted except over TLS.

**Test it**: Hash the same password twice and verify hashes differ (random salt). Verify bcrypt.compare works correctly for valid and invalid passwords.

---

### 🎯 Authenticated Encryption

All encryption must include authentication to prevent tampering. GCM mode provides this through an authentication tag. After encryption, retrieve the auth tag with cipher.getAuthTag() and include it with the ciphertext. During decryption, set the auth tag with decipher.setAuthTag() before calling final(). If the tag doesn't match, the data was tampered with and decryption will throw an error. Never use CBC, CFB, or OFB modes without a separate HMAC for authentication.

**Test it**: Modify encrypted data before decryption and verify it's rejected with an error about authentication failure.

---

### 🔢 Random Number Generation

All cryptographic randomness must use crypto.randomBytes(), never Math.random(), Date.now(), or predictable sequences. This includes generating tokens, session IDs, password reset codes, IVs, and cryptographic keys. Math.random() is not cryptographically secure and can be predicted by attackers. Verify the application doesn't use any custom random number generators for security-sensitive operations. Random values should have sufficient entropy for their purpose (32 bytes for tokens, 16 bytes for IVs).

**Test it**: Generate multiple tokens and verify they're unpredictable and don't contain patterns or sequential values.

---

### 📦 Data in Transit

All network communication containing sensitive data must use TLS 1.2 or higher, never plain HTTP. APIs should reject HTTP requests for sensitive endpoints and redirect to HTTPS. Verify HTTPS is enforced in production through HSTS headers. TLS certificates must be valid and verified (not self-signed in production). Database connections must use TLS/SSL when communicating over networks. Verify no sensitive data is transmitted in URL query parameters where it may be logged.

**Test it**: Attempt to connect via HTTP to sensitive endpoints and verify it's rejected or redirected to HTTPS.

---

### 🚫 Sensitive Data in Logs

Logs must never contain passwords, API keys, tokens, encryption keys, credit cards, or other secrets. Implement logging sanitization that removes or masks these fields before writing to logs. Stack traces should be sanitized to not expose sensitive data. Log files must be protected with appropriate file permissions and encrypted at rest if they contain any potentially sensitive information. Error messages returned to clients should be generic and not leak information about cryptographic implementation details.

**Test it**: Trigger errors in encryption/authentication code and verify logs don't contain sensitive data, only generic messages.

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
