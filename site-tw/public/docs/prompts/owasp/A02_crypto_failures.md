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

## Prompt 1: Analyze Code for Cryptographic Vulnerabilities

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Scans your codebase for weak encryption, hardcoded secrets, and password hashing issues</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

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
Analyze the code in the current workspace for OWASP A02 vulnerabilities.

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
</details>

---

## Prompt 2: Implement Secure Cryptography

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generates AES-256-GCM encryption, bcrypt password hashing, and key management code</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

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
</details>

---

## Example Output

<details style="margin: 16px 0;">
<summary style="cursor: pointer; padding: 8px 0; font-size: 16px; font-weight: 700; color: #fca5a5;">
❌ Before — Vulnerable Code
</summary>

```typescript
export function encryptData(data: string): string {
  const key = "hardcoded-secret-key-123";
  return Buffer.from(data + key).toString('base64');
}

export function savePassword(password: string): void {
  database.insert({ password });
}

export function hashPassword(password: string): string {
  return crypto.createHash('md5').update(password).digest('hex');
}
```

</details>

<details style="margin: 16px 0;">
<summary style="cursor: pointer; padding: 8px 0; font-size: 16px; font-weight: 700; color: #86efac;">
✅ After — Secure Code
</summary>

```typescript
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const BCRYPT_ROUNDS = 12;

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

export function encryptData(plaintext: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Encryption failed');
  }
}

export function decryptData(encryptedData: string): string {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');

    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Decryption failed or data tampered');
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
```

</details>

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #dc2626;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated cryptographic code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Encryption Algorithm</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Only AES-256-GCM used for symmetric encryption (no DES, 3DES, RC4, ECB)<br/>
    ✓ GCM mode provides both confidentiality and authenticity<br/>
    ✓ Uses Node.js crypto module, no custom implementations<br/>
    <strong style="color: #94a3b8;">Test:</strong> Encrypt data and verify output includes IV + auth tag + ciphertext; tampering fails decryption
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Key Management & IV Generation</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All keys from environment variables, never hardcoded<br/>
    ✓ Keys validated as exactly 32 bytes (256 bits) on startup<br/>
    ✓ Fresh random IV via crypto.randomBytes(16) per encryption<br/>
    ✓ All randomness from crypto.randomBytes, never Math.random()<br/>
    <strong style="color: #94a3b8;">Test:</strong> Remove key from env — app fails fast; encrypt same text twice — outputs differ
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Password Hashing</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ bcrypt with cost factor >= 12 (no MD5, SHA1, plaintext)<br/>
    ✓ bcrypt.compare() for constant-time verification<br/>
    ✓ Passwords never logged or stored unhashed<br/>
    <strong style="color: #94a3b8;">Test:</strong> Hash same password twice — hashes differ; bcrypt.compare succeeds for valid, fails for invalid
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Data in Transit & Logging</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All sensitive data over TLS 1.2+, HSTS enforced in production<br/>
    ✓ No sensitive data in URL query parameters<br/>
    ✓ Logs never contain passwords, keys, tokens, or credit cards<br/>
    ✓ Error messages generic — no crypto implementation details leaked<br/>
    <strong style="color: #94a3b8;">Test:</strong> Attempt HTTP on sensitive endpoints — rejected; trigger errors — logs show only generic messages
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Use Prompt 1** to analyze your codebase for cryptographic vulnerabilities
2. **Use Prompt 2** to generate secure encryption and hashing implementations
3. **Review generated code** using the Human Review Checklist above
4. **Generate encryption key** using crypto.randomBytes(32), store in environment variable
5. **Implement key rotation** for production systems
6. **Audit quarterly** for new cryptographic vulnerabilities

---

## Resources

- [OWASP A02:2021 - Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Back to OWASP Overview](/docs/prompts/owasp/)

---

**Key principle**: Use strong algorithms (AES-256-GCM), proper key management (environment variables), and secure password hashing (bcrypt cost >= 12). Never use encoding as encryption.
