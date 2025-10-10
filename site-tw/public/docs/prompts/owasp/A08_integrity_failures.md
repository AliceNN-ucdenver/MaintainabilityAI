# A08: Software and Data Integrity Failures — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: digital signatures, integrity verification, secure CI/CD, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security engineer implementing OWASP A08:2021 - Software and Data Integrity Failures.

Context:
- Node 18 + TypeScript
- Loading plugins, updates, or external code
- CI/CD pipeline security
- Need to verify authenticity and integrity of code/data
- Implement digital signatures for critical operations
- Protect against supply chain attacks

Security Requirements:
- Verify digital signatures for all external code/plugins
- Use HMAC or digital signatures for critical data
- Implement secure deserialization (avoid unsafe formats)
- Verify checksums/hashes of downloaded files
- Use signed commits in Git
- Secure CI/CD pipeline with signed artifacts
- Validate integrity before executing code
- Use allowlist for trusted plugin sources

Task:
1) Refactor `examples/owasp/A08_integrity_failures/insecure.ts` to verify integrity
2) Replace unsigned plugin loading with signature verification:
   - Generate HMAC-SHA256 signatures for plugins
   - Verify signature before loading plugin code
   - Reject unsigned or tampered plugins
3) Implement secure deserialization:
   - Use JSON.parse() instead of eval() or pickle
   - Validate schema with Zod after deserialization
4) Add checksum verification for downloads:
   - Calculate SHA-256 hash of downloaded file
   - Compare with expected hash from trusted source
5) Create allowlist of trusted plugin sources
6) Run tests in `examples/owasp/A08_integrity_failures/__tests__/integrity.test.ts` and ensure they pass

Security Checklist:
□ Digital signatures verified for all plugins/updates
□ HMAC or signatures protect critical data
□ Checksums verified before using downloaded files
□ No unsafe deserialization (eval, pickle, yaml.load)
□ Plugin sources allowlisted
□ Tampered content rejected
□ CI/CD pipeline secured (signed commits, artifacts)
□ Tests verify signature validation
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security engineer. Fix OWASP A08: Software and Data Integrity Failures in examples/owasp/A08_integrity_failures/insecure.ts.

Requirements:
- Add HMAC-SHA256 signature verification for plugins
- Verify signature before loading any external code
- Calculate and verify SHA-256 checksums for downloads
- Use secure deserialization (JSON.parse + Zod validation)
- Create allowlist of trusted plugin sources
- Reject unsigned or tampered content
- Tests must pass in __tests__/integrity.test.ts

Integrity Standards:
- Signatures: HMAC-SHA256 or RSA-PSS
- Checksums: SHA-256 (minimum)
- Deserialization: JSON.parse + schema validation only
- Plugin sources: Explicit allowlist required
- Verification: Always before execution/use
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
// ❌ INSECURE: Accepts unsigned plugins from network
export async function loadPlugin(name: string) {
  const url = `https://cdn.example.com/plugins/${name}.js`;
  const code = await (await fetch(url)).text();
  // ❌ No signature validation!
  return code;
}
```

**Problems**:
- No signature or integrity verification
- Compromised CDN can serve malicious code
- Supply chain attack vector
- No validation of plugin authenticity

### After (Secure)
```typescript
// ✅ SECURE: Verify signatures before loading plugins
import crypto from 'crypto';
import { z } from 'zod';

interface SignedPlugin {
  name: string;
  url: string;
  signature: string;  // HMAC-SHA256 signature
  checksum: string;   // SHA-256 hash of plugin content
  version: string;
}

// ✅ Allowlist of trusted plugins with their signatures
const TRUSTED_PLUGINS: Record<string, SignedPlugin> = {
  'analytics': {
    name: 'analytics',
    url: 'https://cdn.example.com/plugins/analytics.js',
    signature: 'sha256-abc123...',  // HMAC signature
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    version: '1.0.0'
  }
};

// ✅ Secret key for HMAC (load from environment)
function getSigningKey(): Buffer {
  const key = process.env.PLUGIN_SIGNING_KEY;
  if (!key) {
    throw new Error('PLUGIN_SIGNING_KEY not configured');
  }
  return Buffer.from(key, 'hex');
}

function verifyHMACSignature(data: string, expectedSignature: string): boolean {
  // ✅ Calculate HMAC-SHA256 of data
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(data);
  const calculatedSignature = 'sha256-' + hmac.digest('hex');

  // ✅ Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(expectedSignature)
  );
}

function verifyChecksum(data: string, expectedChecksum: string): boolean {
  // ✅ Calculate SHA-256 hash
  const hash = crypto.createHash('sha256');
  hash.update(data);
  const calculatedChecksum = hash.digest('hex');

  // ✅ Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(calculatedChecksum),
    Buffer.from(expectedChecksum)
  );
}

export async function loadPlugin(pluginName: string): Promise<string> {
  // ✅ Check if plugin is in allowlist
  const pluginMeta = TRUSTED_PLUGINS[pluginName];
  if (!pluginMeta) {
    throw new Error(`Plugin ${pluginName} is not in trusted plugins list`);
  }

  try {
    // ✅ Download plugin content
    const response = await fetch(pluginMeta.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugin: ${response.statusText}`);
    }

    const content = await response.text();

    // ✅ Verify checksum (integrity)
    if (!verifyChecksum(content, pluginMeta.checksum)) {
      console.error('Plugin integrity check failed', { plugin: pluginName });
      throw new Error('Plugin integrity verification failed');
    }

    // ✅ Verify HMAC signature (authenticity)
    if (!verifyHMACSignature(content, pluginMeta.signature)) {
      console.error('Plugin signature verification failed', { plugin: pluginName });
      throw new Error('Plugin signature verification failed');
    }

    // ✅ Log successful verification
    console.log('Plugin verified successfully', {
      plugin: pluginName,
      version: pluginMeta.version,
      timestamp: new Date().toISOString()
    });

    return content;
  } catch (err) {
    console.error('Failed to load plugin:', err);
    throw new Error('Plugin loading failed');
  }
}

// ✅ Generate HMAC signature for a new plugin (run once, store signature)
export function generatePluginSignature(content: string): string {
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(content);
  return 'sha256-' + hmac.digest('hex');
}

// ✅ Generate checksum for a new plugin
export function generateChecksum(content: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}
```

### Secure Deserialization Example
```typescript
import { z } from 'zod';

// ✅ Define expected schema
const UserDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime()
});

type UserData = z.infer<typeof UserDataSchema>;

export function deserializeUserData(serialized: string): UserData {
  try {
    // ✅ Parse JSON (safe)
    const parsed = JSON.parse(serialized);

    // ✅ Validate schema
    const validated = UserDataSchema.parse(parsed);

    return validated;
  } catch (err) {
    console.error('Deserialization failed:', err);
    throw new Error('Invalid user data format');
  }
}

// ❌ NEVER do this:
// const data = eval(serialized);  // Unsafe!
// const data = yaml.load(serialized);  // Unsafe without safeLoad!
```

### Signed Data Example
```typescript
interface SignedData<T> {
  data: T;
  signature: string;
  timestamp: string;
}

export function signData<T>(data: T): SignedData<T> {
  const payload = JSON.stringify(data);
  const timestamp = new Date().toISOString();

  // ✅ Create signature of data + timestamp
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(payload + timestamp);
  const signature = hmac.digest('hex');

  return {
    data,
    signature,
    timestamp
  };
}

export function verifySignedData<T>(signedData: SignedData<T>): T {
  const payload = JSON.stringify(signedData.data);

  // ✅ Verify signature
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(payload + signedData.timestamp);
  const expectedSignature = hmac.digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signedData.signature)
  )) {
    throw new Error('Signature verification failed - data may be tampered');
  }

  // ✅ Check timestamp (prevent replay attacks)
  const age = Date.now() - new Date(signedData.timestamp).getTime();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  if (age > maxAge) {
    throw new Error('Signed data expired');
  }

  return signedData.data;
}
```

---

## Common Integrity Failure Types

1. **Unsigned Updates/Plugins**
   - Problem: Auto-updates without signature verification
   - Fix: Verify digital signatures before installing

2. **No Checksum Verification**
   - Problem: Downloaded files not verified for tampering
   - Fix: SHA-256 checksum validation

3. **Unsafe Deserialization**
   - Problem: eval(), pickle, yaml.load() execute code
   - Fix: JSON.parse() + schema validation

4. **Supply Chain Attacks**
   - Problem: Compromised dependencies or build tools
   - Fix: SRI, signed commits, secure CI/CD

5. **Tampered CI/CD Artifacts**
   - Problem: Build artifacts modified after creation
   - Fix: Sign artifacts, verify signatures on deployment

6. **Missing Code Signing**
   - Problem: Executables/binaries not signed
   - Fix: Code signing certificates, signature verification

7. **Insecure Auto-Update Mechanism**
   - Problem: Updates downloaded over HTTP or without verification
   - Fix: HTTPS + signature verification

---

## CI/CD Security Best Practices

```yaml
# .github/workflows/secure-build.yml
name: Secure Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      # ✅ Verify signed commits
      - name: Verify commit signature
        run: git verify-commit HEAD

      # ✅ Pin action versions (not @main)
      - uses: actions/checkout@v4.1.0

      # ✅ Use dependency hash verification
      - name: Install dependencies
        run: npm ci  # Uses package-lock.json hashes

      # ✅ Run security audit
      - name: Security audit
        run: npm audit --audit-level=moderate

      # ✅ Build and test
      - name: Build
        run: npm run build

      # ✅ Sign artifacts
      - name: Sign build artifacts
        run: |
          sha256sum dist/* > checksums.txt
          # Sign checksums file (use GPG or cosign)
```

---

## Testing Checklist

- [ ] Signatures verified before loading plugins/code
- [ ] Checksums verified for all downloads
- [ ] Tampered content rejected
- [ ] Unsigned plugins/updates rejected
- [ ] Safe deserialization (JSON.parse + validation)
- [ ] No unsafe formats (eval, pickle, unsafe yaml)
- [ ] Plugin sources allowlisted
- [ ] Tests verify signature validation works
- [ ] Tests verify tampered data is rejected

---

## Attack Scenarios to Prevent

```typescript
// Test these scenarios - all should be blocked:
const attackScenarios = [
  "Modified plugin loaded (checksum mismatch)",
  "Unsigned plugin accepted",
  "Tampered data signature fails",
  "Malicious dependency in supply chain",
  "Compromised CI/CD artifact deployed",
  "Unsafe deserialization executes code",
  "Replay attack with old signed data",
];
```

---

## Dependency Integrity

```bash
# ✅ Verify npm package integrity
npm audit signatures

# ✅ Use package-lock.json integrity hashes
npm ci  # Verifies integrity hashes

# ✅ Verify specific package signature
npm view express dist.integrity
```

---

## Additional Resources

- [OWASP A08:2021 - Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)
- [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [Sigstore - Signing, verification for software supply chain](https://www.sigstore.dev/)
- [SLSA - Supply-chain Levels for Software Artifacts](https://slsa.dev/)
- [Node.js Code Signing](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [GitHub Artifact Attestations](https://docs.github.com/en/actions/security-guides/using-artifact-attestations)
