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

## 🤖 AI Prompt #1: Analyze Code for Integrity Failures

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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
Analyze the following code/files for OWASP A08 vulnerabilities:

[PASTE YOUR CODE HERE - plugin loaders, deserialization, downloads, CI/CD configs, update mechanisms]

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

---

## 🤖 AI Prompt #2: Implement Integrity Verification

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: Loads unsigned plugin from network
export async function loadPlugin(url: string) {
  const response = await fetch(url);
  const code = await response.text();

  // ❌ No signature or integrity verification!
  return eval(code); // ❌ Executes arbitrary code!
}

// ❌ CRITICAL: Insecure deserialization
export function deserialize(data: string): any {
  return eval(`(${data})`); // ❌ Code injection!
}

// Attack: Attacker compromises CDN, serves malicious plugin
// Attack: Man-in-the-middle modifies plugin during download
// Attack: Supply chain attack injects backdoor in dependency
```

### After (Secure Code)

```typescript
// ✅ SECURE: Comprehensive integrity verification
import crypto from 'crypto';
import { z } from 'zod';

interface PluginMetadata {
  name: string;
  url: string;
  version: string;
  signature: string; // HMAC-SHA256
  checksum: string;  // SHA-256 hash
}

// ✅ Allowlist of trusted plugins with signatures
const TRUSTED_PLUGINS: Record<string, PluginMetadata> = {
  'analytics': {
    name: 'analytics',
    url: 'https://cdn.example.com/plugins/analytics.js',
    version: '1.0.0',
    signature: 'hmac-sha256-abc123def456...',
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  }
};

// ✅ Get signing key from environment
function getSigningKey(): Buffer {
  const key = process.env.PLUGIN_SIGNING_KEY;
  if (!key) {
    throw new Error('PLUGIN_SIGNING_KEY not configured');
  }
  return Buffer.from(key, 'hex');
}

// ✅ Generate HMAC-SHA256 signature
export function generateSignature(content: string): string {
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(content, 'utf8');
  return 'hmac-sha256-' + hmac.digest('hex');
}

// ✅ Verify HMAC signature with constant-time comparison
function verifySignature(content: string, expectedSignature: string): boolean {
  if (!expectedSignature.startsWith('hmac-sha256-')) {
    throw new Error('Invalid signature format');
  }

  const actualSignature = generateSignature(content);

  // ✅ Constant-time comparison prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(actualSignature),
    Buffer.from(expectedSignature)
  );
}

// ✅ Calculate SHA-256 checksum
export function generateChecksum(content: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(content, 'utf8');
  return hash.digest('hex');
}

// ✅ Verify checksum with constant-time comparison
function verifyChecksum(content: string, expectedChecksum: string): boolean {
  const actualChecksum = generateChecksum(content);

  return crypto.timingSafeEqual(
    Buffer.from(actualChecksum),
    Buffer.from(expectedChecksum)
  );
}

// ✅ Secure plugin loading with integrity verification
export async function loadPlugin(pluginName: string): Promise<string> {
  // ✅ Check allowlist
  const metadata = TRUSTED_PLUGINS[pluginName];
  if (!metadata) {
    throw new Error(`Plugin '${pluginName}' not in trusted plugin list`);
  }

  try {
    // ✅ Download plugin
    const response = await fetch(metadata.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugin: ${response.statusText}`);
    }

    const content = await response.text();

    // ✅ Verify checksum (integrity)
    if (!verifyChecksum(content, metadata.checksum)) {
      console.error('Plugin checksum verification failed', { plugin: pluginName });
      throw new Error('Plugin integrity check failed');
    }

    // ✅ Verify signature (authenticity)
    if (!verifySignature(content, metadata.signature)) {
      console.error('Plugin signature verification failed', { plugin: pluginName });
      throw new Error('Plugin signature verification failed');
    }

    // ✅ Log successful verification
    console.info('Plugin verified successfully', {
      plugin: pluginName,
      version: metadata.version,
      timestamp: new Date().toISOString()
    });

    // ✅ Return content (don't execute with eval!)
    return content;
  } catch (err) {
    console.error('Plugin loading failed', {
      plugin: pluginName,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    throw new Error('Plugin loading failed');
  }
}

// ✅ Secure deserialization with schema validation
const UserDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest'])
});

type UserData = z.infer<typeof UserDataSchema>;

export function deserializeUserData(json: string): UserData {
  try {
    // ✅ Use JSON.parse (safe)
    const parsed = JSON.parse(json);

    // ✅ Validate schema with Zod
    const validated = UserDataSchema.parse(parsed);

    return validated;
  } catch (err) {
    console.error('Deserialization failed', err);
    throw new Error('Invalid data format');
  }
}

// ❌ NEVER do this:
// eval(serializedData);  // Code injection!
// yaml.load(yamlData);   // Unsafe! Use yaml.safeLoad()
// pickle.loads(data);    // Python only, but demonstrates unsafe deserialization

// ✅ Signed data with timestamp (prevents replay attacks)
interface SignedData<T> {
  data: T;
  signature: string;
  timestamp: string;
}

export function signData<T>(data: T): SignedData<T> {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify(data) + timestamp;

  // ✅ Create HMAC signature
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

  // ✅ Verify signature
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signedData.signature))) {
    throw new Error('Signature verification failed - data may be tampered');
  }

  // ✅ Check timestamp (prevent replay attacks)
  const age = Date.now() - new Date(signedData.timestamp).getTime();
  if (age > maxAgeMs) {
    throw new Error('Signed data expired');
  }

  return signedData.data;
}

// ✅ Download with checksum verification
export async function downloadAndVerify(url: string, expectedChecksum: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const content = Buffer.from(buffer);

    // ✅ Calculate checksum
    const hash = crypto.createHash('sha256');
    hash.update(content);
    const actualChecksum = hash.digest('hex');

    // ✅ Verify checksum
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
      # ✅ Verify signed commits
      - name: Verify commit signature
        run: git verify-commit HEAD || echo "Warning: Unsigned commit"

      - uses: actions/checkout@v4

      # ✅ Pin action versions (not @main)
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      # ✅ Use lockfile for integrity
      - name: Install dependencies
        run: npm ci

      # ✅ Run security audit
      - name: Security audit
        run: npm audit --audit-level=moderate

      - name: Build
        run: npm run build

      # ✅ Generate checksums for artifacts
      - name: Generate checksums
        run: |
          cd dist
          sha256sum * > checksums.txt
          cd ..

      # ✅ Sign checksums file
      - name: Sign checksums
        env:
          SIGNING_KEY: ${{ secrets.SIGNING_KEY }}
        run: |
          echo "$SIGNING_KEY" | base64 -d > signing.key
          # Sign checksums file with HMAC
          openssl dgst -sha256 -hmac "$(cat signing.key)" dist/checksums.txt > dist/checksums.sig
          rm signing.key

      # ✅ Upload artifacts with signatures
      - uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            dist/
            dist/checksums.txt
            dist/checksums.sig
```

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated integrity verification code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Digital Signatures</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All plugins, updates, and critical code verified using HMAC-SHA256 or digital signatures before execution<br/>
    ✓ Signing key stored securely in environment variables or secret management systems, never hardcoded<br/>
    ✓ Signatures generated for trusted content during build process and stored with metadata<br/>
    ✓ Signature verification uses constant-time comparison to prevent timing attacks<br/>
    ✓ Allowlist maintained of trusted sources with their expected signatures<br/>
    ✓ Content with missing, invalid, or mismatched signatures rejected<br/>
    ✓ All signature verification failures logged as security events<br/>
    ✓ Test: Tamper with one byte of plugin content, verify signature check fails and logs show integrity violation
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Checksum Verification</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ SHA-256 checksums calculated for all downloaded files and compared against expected values before use<br/>
    ✓ Expected checksums fetched from trusted source over HTTPS, ideally from different channel than file<br/>
    ✓ Constant-time comparison used for checksum validation to prevent timing attacks<br/>
    ✓ Checksums stored alongside artifacts in version control or secure storage<br/>
    ✓ Verification happens immediately after download, before parsing or executing content<br/>
    ✓ Streaming hash calculation considered for large files to reduce memory usage<br/>
    ✓ Checksum verification never skipped even for "trusted" sources<br/>
    ✓ Test: Download file, modify one byte, verify checksum validation fails and file rejected
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Safe Deserialization</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Never use eval(), Function(), or vm.runInContext() with external data<br/>
    ✓ JSON parsed with JSON.parse() which is safe and cannot execute code<br/>
    ✓ Structure validated with Zod or similar schema validator after parsing<br/>
    ✓ YAML uses yaml.safeLoad() not yaml.load() to prevent code execution<br/>
    ✓ Never deserialize Python pickle, PHP unserialize, or Java ObjectInputStream from untrusted sources<br/>
    ✓ Deserialization formats allowing code execution validated and safer alternatives considered<br/>
    ✓ Allowlist implemented for accepted data types, unexpected structures rejected<br/>
    ✓ Test: Attempt malicious payload deserialization, verify safe methods reject them, JSON.parse throws SyntaxError
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Supply Chain Security</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Dependency integrity verified during installation using package-lock.json integrity hashes<br/>
    ✓ npm audit run to check for known vulnerabilities in dependencies<br/>
    ✓ GitHub Action versions pinned to specific commit SHAs, not @main or @latest<br/>
    ✓ Dependency tree reviewed with npm ls, unnecessary transitive dependencies questioned<br/>
    ✓ Dependabot or Renovate enabled for automated dependency updates with security scanning<br/>
    ✓ npm private registry or artifact repository considered for additional control<br/>
    ✓ Allowlist implemented of approved packages for critical applications<br/>
    ✓ Signed commits required from contributors<br/>
    ✓ Test: Modify package-lock.json integrity hash verify npm ci fails, check npm audit in CI/CD
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">CI/CD Pipeline Security</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ CI/CD pipelines secured with artifact signing and verification at each stage<br/>
    ✓ Build artifacts signed using HMAC or GPG during build process<br/>
    ✓ Signatures stored alongside artifacts<br/>
    ✓ Signatures verified before deployment to any environment<br/>
    ✓ Separate signing keys used for different environments (dev, staging, prod)<br/>
    ✓ Access to signing keys restricted using secret management<br/>
    ✓ Immutable build artifacts implemented - never modified after build<br/>
    ✓ Reproducible builds used where possible to verify artifact integrity<br/>
    ✓ All artifact generation and verification events logged<br/>
    ✓ Deployment fails if signature verification fails<br/>
    ✓ Test: Deploy artifact without signature verify deployment fails, tamper post-build verify verification fails
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Replay Attack Prevention</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Timestamp included in all signed data structures to prevent replay attacks<br/>
    ✓ Timestamp age validated on verification, data older than threshold (typically 5 minutes) rejected<br/>
    ✓ ISO 8601 format timestamps used for consistency<br/>
    ✓ Nonce (random value) included for additional replay prevention in high-security scenarios<br/>
    ✓ Recently used nonces stored to detect duplicates<br/>
    ✓ Sequence numbers considered for ordered operations<br/>
    ✓ Replay attack attempts logged<br/>
    ✓ Timestamp tolerance balanced with security - tighter windows more secure but may reject legitimate delayed requests<br/>
    ✓ Test: Create signed data, wait past expiration time, attempt use and verify rejection due to age
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Integrity Metadata</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Comprehensive metadata maintained for all trusted external resources (name, version, URL, signature, checksum, last verification date)<br/>
    ✓ Metadata stored in version control alongside code for auditability<br/>
    ✓ Verification process documented for adding new trusted resources<br/>
    ✓ Metadata schema validation included to prevent malformed entries<br/>
    ✓ Metadata versioning implemented to track changes over time<br/>
    ✓ Tools provided to regenerate signatures and checksums when resources update<br/>
    ✓ Metadata validation automated in CI/CD to catch misconfigurations<br/>
    ✓ Code never allowed to specify its own integrity metadata<br/>
    ✓ Test: Add resource to allowlist without proper metadata, verify loading fails with clear error message
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Integrity Failure Logging</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All integrity verification events logged including successful verifications and failures<br/>
    ✓ Failure logs include resource identifier, expected vs actual signature/checksum, timestamp, action taken<br/>
    ✓ Signing keys or full signatures never logged in plaintext logs<br/>
    ✓ Sensitive information masked while preserving forensic value<br/>
    ✓ Alerts set up for integrity failures as they may indicate active attacks<br/>
    ✓ Integrity failure patterns aggregated to detect systematic attacks<br/>
    ✓ Integrity logs retained separately from application logs for security analysis<br/>
    ✓ Logs forwarded to SIEM or security monitoring system for correlation<br/>
    ✓ Test: Trigger integrity failure, verify comprehensive log entry created with all necessary details
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing code for integrity verification gaps
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate integrity verification with HMAC and checksums
4. **Review generated code** using the Human Review Checklist above
5. **Implement signatures**: Add HMAC-SHA256 for all plugins and updates
6. **Add checksums**: Verify SHA-256 hashes for all downloads
7. **Secure deserialization**: Replace eval() and unsafe formats with JSON.parse + Zod
8. **Sign CI/CD artifacts**: Add checksum generation and signing to build pipeline
9. **Test integrity checks**: Verify tampered content is rejected
10. **Monitor failures**: Set up alerts for integrity verification failures

---

## 📖 Additional Resources

- [OWASP A08:2021 - Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)
- [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [Sigstore - Code Signing for Software Supply Chain](https://www.sigstore.dev/)
- [SLSA Framework - Supply Chain Security](https://slsa.dev/)
- [GitHub Artifact Attestations](https://docs.github.com/en/actions/security-guides/using-artifact-attestations)
- [npm Package Signatures](https://docs.npmjs.com/cli/v9/commands/npm-audit)

---

**Remember**: Software integrity failures are preventable through digital signatures (HMAC-SHA256 for plugins), checksum verification (SHA-256 for downloads), secure deserialization (JSON.parse + Zod, never eval), signed CI/CD artifacts, and timestamp validation (prevent replay attacks). Never execute unsigned code or deserialize untrusted data without verification.
