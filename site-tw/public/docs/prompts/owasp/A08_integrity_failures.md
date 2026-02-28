# Software and Data Integrity Failures — OWASP A08 Prompt Pack

> **OWASP A08: Software and Data Integrity Failures** occurs when code and infrastructure do not protect against integrity violations. This includes unsigned software updates, insecure deserialization, CI/CD pipeline compromises, and missing integrity verification for critical data or code.

---

## 🎯 What is A08?

**Definition**: Software and data integrity failures relate to code and infrastructure that does not protect against integrity violations. This occurs when an application relies on plugins, libraries, or modules from untrusted sources, repositories, or content delivery networks without verification. Insecure CI/CD pipelines and auto-update functionality without integrity verification can introduce unauthorized access, malicious code, or system compromise.

**Common Manifestations**:
- **Unsigned Updates**: Auto-updates download and install software without signature verification
- **Insecure Deserialization**: Using eval(), pickle, or unsafe YAML with untrusted data
- **No Digital Signatures**: Plugins or code loaded without HMAC or cryptographic signature checks
- **CI/CD Compromise**: Build pipelines without artifact signing or verification
- **Missing Checksums**: Downloaded files used without SHA-256 hash verification
- **Supply Chain Attacks**: Dependencies or build tools compromised, injecting malicious code

**Why It Matters**: Software integrity failures ranked #8 in OWASP Top 10 2021, newly added to reflect supply chain attack risks. High-profile breaches like SolarWinds and Codecov demonstrate real-world impact. Once malicious code is deployed through trusted channels, detection becomes extremely difficult. Integrity verification is critical for secure software supply chains.

---

## 🔗 Maps to STRIDE

**Primary**: **Tampering** (malicious code injected through compromised supply chain)
**Secondary**: **Elevation of Privilege** (malicious updates gain system access), **Repudiation** (unsigned changes have no accountability)

See also: [STRIDE: Tampering](/docs/prompts/stride/tampering), [STRIDE: Elevation of Privilege](/docs/prompts/stride/elevation-of-privilege), and [STRIDE: Repudiation](/docs/prompts/stride/repudiation)

---

## Prompt 1: Analyze Code for Integrity Failures

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Finds unsigned plugins, insecure deserialization, missing checksums, and CI/CD gaps — returns prioritized findings</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a security analyst specializing in software and data integrity failures (OWASP A08).

Context:
I have a Node.js + TypeScript application that loads plugins, processes external data, and may have CI/CD pipelines. I need to identify all locations where integrity verification is missing or insufficient.

My codebase includes:
- Plugin or module loading system
- Auto-update mechanisms
- Data deserialization (JSON, YAML, pickle)
- External file downloads
- CI/CD pipeline configurations
- Build and deployment scripts

Task:
Analyze the code in the current workspace for OWASP A08 vulnerabilities.

Identify:

1. **Unsigned Plugin Loading**: Loading code without HMAC or signature verification
2. **Insecure Deserialization**: Using eval(), pickle, or unsafe yaml.load()
3. **No Checksum Verification**: Downloaded files used without SHA-256 hash check
4. **CI/CD Pipeline Risks**: Missing artifact signing, unsigned commits, unverified dependencies
5. **Auto-Update Without Verification**: Software updates without signature or checksum validation
6. **Supply Chain Vulnerabilities**: Unverified third-party code or build tools
7. **Missing Integrity Metadata**: No HMAC, signatures, or hashes for critical data
8. **Replay Attack Risks**: Signed data without timestamps allowing reuse

For each vulnerability found:

**Location**: [File:Line or Function Name]
**Issue**: [Specific integrity failure]
**Attack Vector**: [How attacker exploits - supply chain, deserialization, tampered update, etc.]
**Risk**: [Impact - RCE, malicious code execution, data corruption]
**Remediation**: [Specific fix - HMAC-SHA256, signature verification, safe deserialization, CI/CD hardening]

Requirements:
- Check all plugin/module loading for signature verification
- Identify deserialization methods (must use safe alternatives)
- Verify download operations include checksum validation
- Review CI/CD pipelines for artifact signing
- Check for eval(), Function(), pickle, unsafe YAML
- Look for integrity metadata (signatures, HMACs, hashes)

Output:
Provide a prioritized list of integrity failures (Critical > High > Medium) with specific remediation examples using HMAC-SHA256, signature verification, and secure deserialization.
```

</div>
</details>

---

## Prompt 2: Implement Integrity Verification

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generates HMAC signing, checksum verification, safe deserialization, timestamped data, and CI/CD artifact signing</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a security engineer implementing comprehensive integrity verification for a web application (OWASP A08 remediation).

Context:
I need to implement integrity checks throughout my Node.js + TypeScript application.

Current state:
- Plugins loaded without signature verification
- No HMAC or checksums for critical data
- Deserialization using unsafe methods
- CI/CD pipeline without artifact signing
- Downloads used without hash verification

Requirements:
Implement the following integrity verification patterns:

1. **HMAC-SHA256 for Plugins**
   - Function: loadPlugin(pluginName: string): Promise<Plugin>
   - Generate HMAC-SHA256 signature using secret key
   - Store plugin metadata with signature
   - Verify signature before loading plugin code
   - Use crypto.createHmac('sha256', secretKey)
   - Allowlist trusted plugins with expected signatures

2. **Checksum Verification for Downloads**
   - Function: downloadAndVerify(url: string, expectedHash: string): Promise<Buffer>
   - Calculate SHA-256 hash of downloaded content
   - Compare with expected hash using constant-time comparison
   - Reject content if hash mismatch
   - Log integrity failures

3. **Secure Deserialization**
   - Use JSON.parse() for data, never eval()
   - Use Zod schema validation after parsing
   - Never use yaml.load() (use yaml.safeLoad())
   - Never use pickle or other code-executing deserializers
   - Function: deserializeData<T>(json: string, schema: ZodSchema<T>): T

4. **Signed Data with Timestamps**
   - Function: signData<T>(data: T): SignedData<T>
   - Include timestamp to prevent replay attacks
   - Generate HMAC of data + timestamp
   - Function: verifySignedData<T>(signedData: SignedData<T>): T
   - Validate signature and timestamp age (max 5 minutes)

5. **CI/CD Artifact Signing**
   - Generate SHA-256 checksums for build artifacts
   - Store checksums in separate file (checksums.txt)
   - Sign checksums file with GPG or HMAC
   - Verify signatures on deployment
   - Example GitHub Actions workflow

6. **Test Coverage**
   - Unit tests for HMAC generation and verification
   - Tests for tampered data rejection
   - Tests for checksum validation
   - Tests for safe deserialization
   - Tests for timestamp expiration

Implementation:
- Use crypto.createHmac for signatures
- Use crypto.createHash for checksums
- TypeScript strict mode with proper typing
- Comprehensive inline security comments
- Allowlist for trusted sources
- Constant-time comparisons

Output:
Provide complete, executable TypeScript code for:
- `security/integrity.ts` (HMAC, checksum, signing functions)
- `plugins/loader.ts` (secure plugin loading with verification)
- `data/deserialize.ts` (safe deserialization with Zod)
- `.github/workflows/sign-artifacts.yml` (CI/CD with signing)
- `__tests__/integrity.test.ts` (Jest tests for all integrity checks)
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
// CRITICAL: Loads unsigned plugin from network
export async function loadPlugin(url: string) {
  const response = await fetch(url);
  const code = await response.text();

  // No signature or integrity verification!
  return eval(code); // Executes arbitrary code!
}

// CRITICAL: Insecure deserialization
export function deserialize(data: string): any {
  return eval(`(${data})`); // Code injection!
}

// Attack: Attacker compromises CDN, serves malicious plugin
// Attack: Man-in-the-middle modifies plugin during download
// Attack: Supply chain attack injects backdoor in dependency
```

</details>

<details style="margin: 16px 0;">
<summary style="cursor: pointer; padding: 8px 0; font-size: 16px; font-weight: 700; color: #86efac;">
✅ After — Secure Code
</summary>

```typescript
// SECURE: Comprehensive integrity verification
import crypto from 'crypto';
import { z } from 'zod';

interface PluginMetadata {
  name: string;
  url: string;
  version: string;
  signature: string; // HMAC-SHA256
  checksum: string;  // SHA-256 hash
}

// Allowlist of trusted plugins with signatures
const TRUSTED_PLUGINS: Record<string, PluginMetadata> = {
  'analytics': {
    name: 'analytics',
    url: 'https://cdn.example.com/plugins/analytics.js',
    version: '1.0.0',
    signature: 'hmac-sha256-abc123def456...',
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  }
};

// Get signing key from environment
function getSigningKey(): Buffer {
  const key = process.env.PLUGIN_SIGNING_KEY;
  if (!key) {
    throw new Error('PLUGIN_SIGNING_KEY not configured');
  }
  return Buffer.from(key, 'hex');
}

// Generate HMAC-SHA256 signature
export function generateSignature(content: string): string {
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(content, 'utf8');
  return 'hmac-sha256-' + hmac.digest('hex');
}

// Verify HMAC signature with constant-time comparison
function verifySignature(content: string, expectedSignature: string): boolean {
  if (!expectedSignature.startsWith('hmac-sha256-')) {
    throw new Error('Invalid signature format');
  }

  const actualSignature = generateSignature(content);

  // Constant-time comparison prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(actualSignature),
    Buffer.from(expectedSignature)
  );
}

// Calculate SHA-256 checksum
export function generateChecksum(content: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(content, 'utf8');
  return hash.digest('hex');
}

// Verify checksum with constant-time comparison
function verifyChecksum(content: string, expectedChecksum: string): boolean {
  const actualChecksum = generateChecksum(content);

  return crypto.timingSafeEqual(
    Buffer.from(actualChecksum),
    Buffer.from(expectedChecksum)
  );
}

// Secure plugin loading with integrity verification
export async function loadPlugin(pluginName: string): Promise<string> {
  // Check allowlist
  const metadata = TRUSTED_PLUGINS[pluginName];
  if (!metadata) {
    throw new Error(`Plugin '${pluginName}' not in trusted plugin list`);
  }

  try {
    // Download plugin
    const response = await fetch(metadata.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugin: ${response.statusText}`);
    }

    const content = await response.text();

    // Verify checksum (integrity)
    if (!verifyChecksum(content, metadata.checksum)) {
      console.error('Plugin checksum verification failed', { plugin: pluginName });
      throw new Error('Plugin integrity check failed');
    }

    // Verify signature (authenticity)
    if (!verifySignature(content, metadata.signature)) {
      console.error('Plugin signature verification failed', { plugin: pluginName });
      throw new Error('Plugin signature verification failed');
    }

    // Log successful verification
    console.info('Plugin verified successfully', {
      plugin: pluginName,
      version: metadata.version,
      timestamp: new Date().toISOString()
    });

    // Return content (don't execute with eval!)
    return content;
  } catch (err) {
    console.error('Plugin loading failed', {
      plugin: pluginName,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    throw new Error('Plugin loading failed');
  }
}

// Secure deserialization with schema validation
const UserDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest'])
});

type UserData = z.infer<typeof UserDataSchema>;

export function deserializeUserData(json: string): UserData {
  try {
    // Use JSON.parse (safe)
    const parsed = JSON.parse(json);

    // Validate schema with Zod
    const validated = UserDataSchema.parse(parsed);

    return validated;
  } catch (err) {
    console.error('Deserialization failed', err);
    throw new Error('Invalid data format');
  }
}

// NEVER do this:
// eval(serializedData);  // Code injection!
// yaml.load(yamlData);   // Unsafe! Use yaml.safeLoad()
// pickle.loads(data);    // Python only, but demonstrates unsafe deserialization

// Signed data with timestamp (prevents replay attacks)
interface SignedData<T> {
  data: T;
  signature: string;
  timestamp: string;
}

export function signData<T>(data: T): SignedData<T> {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify(data) + timestamp;

  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(payload);
  const signature = hmac.digest('hex');

  return {
    data,
    signature,
    timestamp
  };
}

export function verifySignedData<T>(signedData: SignedData<T>, maxAgeMs: number = 5 * 60 * 1000): T {
  const payload = JSON.stringify(signedData.data) + signedData.timestamp;

  // Verify signature
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signedData.signature))) {
    throw new Error('Signature verification failed - data may be tampered');
  }

  // Check timestamp (prevent replay attacks)
  const age = Date.now() - new Date(signedData.timestamp).getTime();
  if (age > maxAgeMs) {
    throw new Error('Signed data expired');
  }

  return signedData.data;
}

// Download with checksum verification
export async function downloadAndVerify(url: string, expectedChecksum: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const content = Buffer.from(buffer);

    // Calculate checksum
    const hash = crypto.createHash('sha256');
    hash.update(content);
    const actualChecksum = hash.digest('hex');

    // Verify checksum
    if (!crypto.timingSafeEqual(Buffer.from(actualChecksum), Buffer.from(expectedChecksum))) {
      console.error('Download checksum mismatch', { url });
      throw new Error('File integrity verification failed');
    }

    console.info('Download verified', { url, size: content.length });
    return content;
  } catch (err) {
    console.error('Download failed', { url, error: err instanceof Error ? err.message : 'Unknown' });
    throw new Error('Download failed');
  }
}
```

</details>

### CI/CD Artifact Signing Example

```yaml
# .github/workflows/sign-artifacts.yml
name: Build and Sign Artifacts

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      # Verify signed commits
      - name: Verify commit signature
        run: git verify-commit HEAD || echo "Warning: Unsigned commit"

      - uses: actions/checkout@v4

      # Pin action versions (not @main)
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      # Use lockfile for integrity
      - name: Install dependencies
        run: npm ci

      # Run security audit
      - name: Security audit
        run: npm audit --audit-level=moderate

      - name: Build
        run: npm run build

      # Generate checksums for artifacts
      - name: Generate checksums
        run: |
          cd dist
          sha256sum * > checksums.txt
          cd ..

      # Sign checksums file
      - name: Sign checksums
        env:
          SIGNING_KEY: ${{ secrets.SIGNING_KEY }}
        run: |
          echo "$SIGNING_KEY" | base64 -d > signing.key
          # Sign checksums file with HMAC
          openssl dgst -sha256 -hmac "$(cat signing.key)" dist/checksums.txt > dist/checksums.sig
          rm signing.key

      # Upload artifacts with signatures
      - uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            dist/
            dist/checksums.txt
            dist/checksums.sig
```

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 16px;">Before merging AI-generated integrity verification code:</div>

<div style="display: grid; gap: 12px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Signatures & Checksums</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All plugins and updates verified with HMAC-SHA256 before execution<br/>
    ✓ SHA-256 checksums calculated and compared for all downloads<br/>
    ✓ Signing keys in env vars or secret manager — never hardcoded<br/>
    ✓ Constant-time comparison for all signature/checksum checks<br/>
    ✓ Missing or invalid signatures cause immediate rejection<br/>
    ✓ All verification failures logged as security events<br/>
    ✓ <strong style="color: #94a3b8;">Test:</strong> tamper one byte of plugin content, verify signature check fails and logs integrity violation
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fdba74; margin-bottom: 8px;">Safe Deserialization & Replay Prevention</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ No eval(), Function(), or unsafe yaml.load() with external data<br/>
    ✓ JSON.parse() + Zod schema validation for all deserialization<br/>
    ✓ Signed data includes timestamp; reject if older than 5 minutes<br/>
    ✓ Nonces used for high-security replay prevention<br/>
    ✓ <strong style="color: #94a3b8;">Test:</strong> attempt malicious payload deserialization verify rejection; create signed data, wait past expiry, verify rejected
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #93c5fd; margin-bottom: 8px;">Supply Chain & CI/CD Security</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ package-lock.json integrity hashes verified on install (npm ci)<br/>
    ✓ GitHub Action versions pinned to commit SHAs, not @main<br/>
    ✓ Build artifacts signed with HMAC or GPG; verified before deploy<br/>
    ✓ Deployment fails if signature verification fails<br/>
    ✓ Signed commits required from contributors<br/>
    ✓ <strong style="color: #94a3b8;">Test:</strong> modify lock integrity hash verify npm ci fails; deploy unsigned artifact verify rejection
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #86efac; margin-bottom: 8px;">Integrity Metadata & Logging</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Trusted resource registry maintained with name, version, signature, checksum<br/>
    ✓ Metadata stored in version control for auditability<br/>
    ✓ All integrity events logged (success and failure) with resource details<br/>
    ✓ Alerts configured for integrity failures (may indicate active attack)<br/>
    ✓ <strong style="color: #94a3b8;">Test:</strong> add resource without proper metadata, verify loading fails with clear error
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Prompt 1** → analyze existing code for integrity verification gaps
2. **Prioritize** by risk (Critical > High > Medium)
3. **Prompt 2** → generate HMAC, checksums, safe deserialization, and CI/CD signing
4. **Review** with the checklist above
5. **Replace eval()** with JSON.parse + Zod everywhere
6. **Sign CI/CD artifacts** and verify on deployment

---

## Resources

- [OWASP A08:2021 - Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)
- [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [Sigstore - Code Signing for Software Supply Chain](https://www.sigstore.dev/)
- [SLSA Framework - Supply Chain Security](https://slsa.dev/)
- [Back to OWASP Overview](/docs/prompts/owasp/)

---

**Key principle**: Sign everything with HMAC-SHA256, verify checksums before use, deserialize only with JSON.parse + Zod (never eval), and sign CI/CD artifacts. Never execute unsigned code.
