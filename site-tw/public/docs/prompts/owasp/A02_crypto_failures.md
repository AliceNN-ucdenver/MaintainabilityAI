# A02: Cryptographic Failures — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: strong encryption algorithms, key management, secure storage, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security engineer implementing OWASP A02:2021 - Cryptographic Failures.

Context:
- Node 18 + TypeScript
- Node.js crypto module for encryption
- Environment variables for key management
- AES-256-GCM for data encryption at rest
- TLS 1.3 for data in transit
- Bcrypt for password hashing (minimum 12 rounds)

Security Requirements:
- Use strong encryption: AES-256-GCM (not base64 encoding)
- Never hardcode encryption keys or secrets
- Store keys in environment variables or secret management systems
- Use cryptographically secure random number generation
- Hash passwords with bcrypt (cost factor >= 12)
- Implement key rotation mechanisms
- Use authenticated encryption (GCM mode)
- Generate initialization vectors (IV) randomly for each encryption

Task:
1) Refactor `examples/owasp/A02_crypto_failures/insecure.ts` to use proper encryption
2) Replace base64 encoding with AES-256-GCM encryption:
   - Use crypto.randomBytes() for IV generation
   - Load encryption key from environment variable
   - Return encrypted data with IV prepended
3) Implement secure password hashing with bcrypt
4) Add key validation (ensure key length is 32 bytes for AES-256)
5) Add error handling that doesn't leak cryptographic details
6) Run tests in `examples/owasp/A02_crypto_failures/__tests__/crypto.test.ts` and ensure they pass

Security Checklist:
□ AES-256-GCM used for encryption (not base64, DES, or MD5)
□ No hardcoded keys or secrets in code
□ Keys loaded from environment variables
□ Random IV generated for each encryption operation
□ Password hashing uses bcrypt with cost >= 12
□ Authenticated encryption mode (GCM) prevents tampering
□ Generic error messages (no crypto implementation details leaked)
□ Tests verify encryption/decryption roundtrip
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security engineer. Fix OWASP A02: Cryptographic Failures in examples/owasp/A02_crypto_failures/insecure.ts.

Requirements:
- Replace base64 encoding with AES-256-GCM encryption
- Use Node.js crypto module (crypto.createCipheriv)
- Load encryption keys from environment variables (never hardcode)
- Generate random IV using crypto.randomBytes(16)
- Hash passwords with bcrypt (cost factor 12)
- Implement authenticated encryption to prevent tampering
- Generic error messages
- Tests must pass in __tests__/crypto.test.ts

Crypto Standards:
- Encryption: AES-256-GCM
- Hashing: bcrypt (cost >= 12) or Argon2
- Random: crypto.randomBytes (not Math.random)
- Key size: 32 bytes (256 bits)
- IV size: 16 bytes (128 bits)
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
// ❌ INSECURE: Base64 is encoding, not encryption!
export function weakEncrypt(data: string): string {
  const key = "hardcoded-key-123"; // ❌ Hardcoded key
  return Buffer.from(data + key).toString('base64'); // ❌ Not encryption
}
```

**Problems**:
- Base64 is reversible encoding, not encryption
- Hardcoded key in source code
- No cryptographic protection

### After (Secure)
```typescript
// ✅ SECURE: AES-256-GCM with proper key management
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error('Encryption key must be 32 bytes (256 bits)');
  }

  return keyBuffer;
}

export function encryptData(data: string): string {
  try {
    // ✅ Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // ✅ Use AES-256-GCM authenticated encryption
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    // ✅ Get authentication tag
    const authTag = cipher.getAuthTag();

    // ✅ Return IV + authTag + encrypted data
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  } catch (err) {
    // ✅ Generic error message
    console.error('Encryption failed:', err);
    throw new Error('Encryption failed');
  }
}

export function decryptData(encryptedData: string): string {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extract IV, auth tag, and encrypted data
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // ✅ Use same algorithm and key
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    // ✅ Generic error message
    console.error('Decryption failed:', err);
    throw new Error('Decryption failed');
  }
}
```

### Password Hashing Example
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // ✅ Minimum 12 rounds

export async function hashPassword(password: string): Promise<string> {
  // ✅ Bcrypt automatically generates salt
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // ✅ Constant-time comparison
  return await bcrypt.compare(password, hash);
}
```

---

## Common Cryptographic Failures

1. **Weak Encryption Algorithms**
   - Problem: Using DES, 3DES, RC4, MD5, SHA1
   - Fix: Use AES-256-GCM, ChaCha20-Poly1305

2. **Hardcoded Keys/Secrets**
   - Problem: Keys in source code, config files, or Git history
   - Fix: Environment variables, secret management systems (Vault, AWS Secrets Manager)

3. **Encoding vs Encryption**
   - Problem: Using base64, hex, URL encoding as "encryption"
   - Fix: Use proper encryption algorithms (AES-256-GCM)

4. **Weak Password Hashing**
   - Problem: Plain text, MD5, SHA1, or fast hashes
   - Fix: Bcrypt (cost >= 12), Argon2, or PBKDF2

5. **IV/Nonce Reuse**
   - Problem: Using same IV for multiple encryptions
   - Fix: Generate random IV for each encryption operation

6. **Missing Authentication**
   - Problem: Encryption without integrity (CBC mode)
   - Fix: Use authenticated encryption (GCM, Poly1305)

7. **Insufficient Randomness**
   - Problem: Using Math.random() for cryptographic operations
   - Fix: Use crypto.randomBytes()

---

## Testing Checklist

- [ ] AES-256-GCM encryption used (not base64 or weak algorithms)
- [ ] No hardcoded keys in source code
- [ ] Keys loaded from environment variables
- [ ] Random IV generated for each encryption
- [ ] Encryption/decryption roundtrip works correctly
- [ ] Password hashing uses bcrypt with cost >= 12
- [ ] Generic error messages (no crypto details leaked)
- [ ] Tests verify tampered ciphertext is rejected (GCM auth tag validation)
- [ ] Key rotation mechanism exists

---

## Key Management Best Practices

```typescript
// ✅ Generate a secure encryption key (run once, store securely)
const generateKey = () => {
  const key = crypto.randomBytes(32); // 256 bits
  console.log('ENCRYPTION_KEY=' + key.toString('hex'));
};

// ✅ Load from environment
const key = process.env.ENCRYPTION_KEY;

// ❌ Never do this
const key = "my-secret-key-123";
const key = Buffer.from("hardcoded");
```

---

## Attack Scenarios to Prevent

```typescript
// Test these scenarios - all should be blocked:
const attackScenarios = [
  "Base64 decoding reveals plaintext",
  "Key extracted from source code",
  "Tampered ciphertext accepted (no auth tag)",
  "Password stored in plaintext",
  "MD5/SHA1 password hashes cracked",
  "Predictable IV allows pattern analysis",
];
```

---

## Additional Resources

- [OWASP A02:2021 - Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
