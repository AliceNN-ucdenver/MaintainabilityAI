# Vulnerable and Outdated Components — OWASP A06 Prompt Pack

> **OWASP A06: Vulnerable and Outdated Components** occurs when applications use libraries, frameworks, or other software modules with known vulnerabilities. This includes outdated dependencies, components without security patches, unmaintained libraries, and code loaded from untrusted sources without integrity verification.

---

## 🎯 What is A06?

**Definition**: Components such as libraries, frameworks, and other software modules run with the same privileges as the application. If a vulnerable component is exploited, such an attack can facilitate serious data loss or server takeover. Applications using components with known vulnerabilities may undermine application defenses and enable various attacks and impacts.

**Common Manifestations**:
- **Unpatched Dependencies**: Using npm packages with known CVEs listed in vulnerability databases
- **Outdated Versions**: Running old versions of frameworks (Express 3.x, React 16.x) without security updates
- **No Integrity Verification**: Loading external scripts without Subresource Integrity (SRI) checks
- **Eval() with Remote Code**: Executing untrusted JavaScript from CDNs or APIs
- **Wildcard Version Ranges**: Using `^` or `~` in package.json allowing vulnerable minor/patch versions
- **Unused Dependencies**: Bloated dependency trees increasing attack surface unnecessarily

**Why It Matters**: Vulnerable components ranked #6 in OWASP Top 10 2021, affecting 94% of applications tested. Automated tools like npm audit and Snyk make finding vulnerabilities easy for attackers. A single vulnerable dependency can compromise entire applications. Supply chain attacks targeting popular packages (event-stream, colors.js) demonstrate real-world exploitation.

---

## 🔗 Maps to STRIDE

**Primary**: **Tampering** (compromised dependencies inject malicious code)
**Secondary**: **Elevation of Privilege** (exploiting CVEs for system access), **Information Disclosure** (vulnerable libraries leak sensitive data)

See also: [STRIDE: Tampering](/docs/prompts/stride/tampering), [STRIDE: Elevation of Privilege](/docs/prompts/stride/elevation-of-privilege), and [STRIDE: Information Disclosure](/docs/prompts/stride/information-disclosure)

---

## 🤖 AI Prompt #1: Analyze Code for Vulnerable Component Issues

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security analyst specializing in vulnerable and outdated components (OWASP A06).

Context:
I have a Node.js + TypeScript application that uses third-party dependencies, loads external scripts from CDNs, and may dynamically load code. I need to identify all locations where vulnerable or outdated components pose security risks.

My codebase includes:
- package.json and package-lock.json with npm dependencies
- HTML pages loading external JavaScript libraries
- Code that fetches and executes remote scripts
- Dynamic code execution patterns
- Build and deployment pipelines

Task:
Analyze the following code/files for OWASP A06 vulnerabilities:

[PASTE YOUR CODE HERE - package.json, HTML with script tags, dynamic import/eval usage, build configs]

Identify:

1. **Outdated Dependencies**: Packages in package.json with known CVEs or outdated versions
2. **Wildcard Version Ranges**: Using ^ or ~ allowing automatic updates to vulnerable versions
3. **Missing Integrity Checks**: External scripts without SRI hashes in HTML
4. **Eval() with Remote Code**: Using eval(), Function(), or vm.runInContext() with fetched content
5. **Unused Dependencies**: Packages installed but not imported anywhere in code
6. **Unmaintained Packages**: Dependencies with no updates in 2+ years
7. **Transitive Vulnerabilities**: Vulnerable sub-dependencies deep in dependency tree
8. **No Vulnerability Scanning**: Missing npm audit or Snyk in CI/CD pipeline

For each vulnerability found:

**Location**: [File:Line or Package Name]
**Issue**: [Specific vulnerability or outdated component]
**Attack Vector**: [How an attacker would exploit this - CVE details, supply chain attack, etc.]
**Risk**: [Impact - RCE, data theft, supply chain compromise]
**Remediation**: [Specific fix - update to version X.Y.Z, add SRI hash, remove eval(), run npm audit]

Requirements:
- Run npm audit and identify all vulnerabilities
- Check package versions against latest secure versions
- Verify external scripts have SRI integrity attributes
- Look for eval(), Function(), vm.runInContext() usage
- Identify unused dependencies with depcheck
- Check for components without recent updates

Output:
Provide a prioritized list of vulnerable components (Critical > High > Medium) with specific remediation examples including version upgrades, SRI implementation, and dependency removal.
```

</div>

---

## 🤖 AI Prompt #2: Implement Secure Dependency Management

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security engineer implementing comprehensive secure dependency management for a web application (OWASP A06 remediation).

Context:
I need to eliminate vulnerable and outdated components throughout my Node.js + TypeScript application.

Current state:
- Dependencies with wildcard version ranges (^, ~)
- External scripts loaded without integrity verification
- eval() used to execute remote code
- No automated vulnerability scanning
- Unused dependencies in package.json

Requirements:
Implement the following secure component patterns:

1. **Dependency Version Pinning**
   - Remove ^ and ~ from all package.json versions
   - Pin exact versions: "express": "4.18.2" (not "^4.18.2")
   - Include both dependencies and devDependencies
   - Regenerate package-lock.json with exact versions
   - Document reason for version choices

2. **Subresource Integrity (SRI)**
   - Function: generateSRIHash(content: string): string
   - Generate SHA-384 hash for external scripts
   - Add integrity attribute to all <script> and <link> tags
   - Verify integrity before using fetched content
   - Example: <script src="https://cdn.example.com/lib.js" integrity="sha384-..." crossorigin="anonymous">

3. **Safe Code Loading**
   - Replace eval() with JSON.parse() for data
   - Replace eval() with dynamic import() for modules
   - Never execute arbitrary remote code
   - Allowlist permitted script sources
   - Function: loadTrustedResource(name: string, expectedHash: string): Promise<any>

4. **Vulnerability Scanning**
   - Add npm audit to CI/CD pipeline
   - Configure audit level: --audit-level=moderate
   - Fail builds on high/critical vulnerabilities
   - Script: "audit": "npm audit --audit-level=moderate"
   - Optional: Integrate Snyk or Dependabot

5. **Dependency Cleanup**
   - Run depcheck to find unused dependencies
   - Remove unused packages from package.json
   - Document why each dependency is needed
   - Keep dependency tree minimal

6. **Test Coverage**
   - Unit tests verify SRI validation works
   - Tests verify eval() is not used
   - Tests verify integrity failures reject content
   - Integration tests check npm audit passes

Implementation:
- Use crypto.createHash('sha384') for SRI generation
- Use fetch() with integrity verification, not eval()
- TypeScript strict mode with proper typing
- Comprehensive inline security comments
- No wildcard version ranges
- Automated vulnerability scanning

Output:
Provide complete, executable TypeScript code for:
- `package.json` (pinned versions, audit script)
- `security/sri.ts` (generateSRIHash, loadTrustedResource functions)
- `security/csp.ts` (Content Security Policy configuration)
- `__tests__/components.test.ts` (Jest tests for SRI and dependency security)
```

</div>

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: eval() executes arbitrary remote code
export async function loadRemoteConfig(url: string) {
  const response = await fetch(url);
  const code = await response.text();

  // ❌ EXTREMELY DANGEROUS - executes any JavaScript!
  eval(code);
}

// package.json with vulnerable dependencies
{
  "dependencies": {
    "express": "^3.21.2",      // ❌ Old version with known CVEs
    "lodash": "~4.17.15",      // ❌ Vulnerable to prototype pollution
    "mongoose": "*"             // ❌ Wildcard allows any version!
  }
}

// HTML loading script without integrity check
<script src="https://cdn.example.com/library.js"></script>
// ❌ No SRI - if CDN is compromised, malicious code executes!

// Attack: Attacker compromises CDN or package, injects malicious code
// Attack: npm install pulls vulnerable version automatically
// Attack: Exploit known CVE in outdated Express 3.x
```

### After (Secure Code)

```typescript
// ✅ SECURE: Safe resource loading with integrity verification
import crypto from 'crypto';

interface TrustedResource {
  url: string;
  integrity: string; // SHA-384 SRI hash
  type: 'json' | 'script';
}

// ✅ Allowlist of trusted external resources with SRI hashes
const TRUSTED_RESOURCES: Record<string, TrustedResource> = {
  'app-config': {
    url: 'https://cdn.example.com/config.json',
    integrity: 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC',
    type: 'json'
  },
  'analytics-lib': {
    url: 'https://cdn.jsdelivr.net/npm/analytics@1.0.0/dist/analytics.min.js',
    integrity: 'sha384-abc123def456...',
    type: 'script'
  }
};

// ✅ Generate SRI hash for a resource (run once, store result)
export function generateSRIHash(content: string): string {
  const hash = crypto
    .createHash('sha384')
    .update(content, 'utf8')
    .digest('base64');

  return `sha384-${hash}`;
}

// ✅ Verify content integrity before using
function verifyIntegrity(content: string, expectedIntegrity: string): boolean {
  // Parse SRI format: "sha384-base64hash"
  const [algorithm, expectedHash] = expectedIntegrity.split('-');

  if (!['sha256', 'sha384', 'sha512'].includes(algorithm)) {
    throw new Error(`Unsupported SRI algorithm: ${algorithm}`);
  }

  // ✅ Calculate hash of actual content
  const actualHash = crypto
    .createHash(algorithm as 'sha256' | 'sha384' | 'sha512')
    .update(content, 'utf8')
    .digest('base64');

  // ✅ Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(actualHash),
    Buffer.from(expectedHash)
  );
}

// ✅ Load and verify trusted external resource
export async function loadTrustedResource(resourceName: string): Promise<any> {
  // ✅ Check if resource is in allowlist
  const resource = TRUSTED_RESOURCES[resourceName];
  if (!resource) {
    throw new Error(`Resource '${resourceName}' not in trusted resource list`);
  }

  try {
    // ✅ Fetch content
    const response = await fetch(resource.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${resource.url}: ${response.statusText}`);
    }

    const content = await response.text();

    // ✅ Verify integrity BEFORE using content
    if (!verifyIntegrity(content, resource.integrity)) {
      console.error('Integrity check failed', {
        resource: resourceName,
        url: resource.url,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Integrity verification failed for ${resourceName}`);
    }

    // ✅ Parse based on type (never eval!)
    if (resource.type === 'json') {
      return JSON.parse(content); // ✅ Safe JSON parsing
    } else if (resource.type === 'script') {
      // ✅ For scripts, better to bundle as npm dependency
      // Dynamic script loading is inherently risky
      console.warn('Dynamic script loading not recommended - use npm packages instead');
      return content; // Return content, don't execute
    }

    return content;
  } catch (err) {
    console.error('Failed to load trusted resource', {
      resource: resourceName,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    throw new Error('Resource loading failed');
  }
}

// ✅ Safe configuration loading
export async function loadRemoteConfig(configName: string): Promise<Record<string, any>> {
  // ✅ Use JSON.parse, never eval()
  const config = await loadTrustedResource(configName);

  // ✅ Validate config structure
  if (typeof config !== 'object' || config === null) {
    throw new Error('Invalid configuration format');
  }

  return config;
}

// ✅ Content Security Policy helper
export function getSecureCSP(): string {
  return [
    "default-src 'self'",
    // ✅ Only allow scripts from specific CDN with SRI
    "script-src 'self' https://cdn.jsdelivr.net",
    // ✅ Require SRI for external scripts
    "require-sri-for script style",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
}

// ❌ NEVER do this:
// eval(remoteCode);  // Executes arbitrary code!
// Function(remoteCode)();  // Same as eval!
// vm.runInContext(remoteCode, context);  // Dangerous!
```

### Secure package.json

```json
{
  "name": "secure-app",
  "version": "1.0.0",
  "description": "Application with secure dependency management",
  "dependencies": {
    "express": "4.18.2",
    "helmet": "7.1.0",
    "bcrypt": "5.1.1",
    "zod": "3.22.4",
    "pg": "8.11.3",
    "winston": "3.11.0"
  },
  "devDependencies": {
    "@types/node": "20.10.5",
    "@types/express": "4.17.21",
    "typescript": "5.3.3",
    "jest": "29.7.0",
    "ts-jest": "29.1.1",
    "eslint": "8.56.0"
  },
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "check-outdated": "npm outdated",
    "check-unused": "npx depcheck",
    "update-sri": "node scripts/generate-sri.js"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### Secure HTML with SRI

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- ✅ Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; require-sri-for script style;">

  <title>Secure Application</title>

  <!-- ✅ External script with SRI -->
  <script
    src="https://cdn.jsdelivr.net/npm/vue@3.3.13/dist/vue.global.prod.js"
    integrity="sha384-qH4M5EkT4JsFVrzLIgzSQJQVcr0lWtN7P4lqLsPlgHYrqh7C6vKwMDLU7t3r0ZqN"
    crossorigin="anonymous"
  ></script>

  <!-- ✅ External CSS with SRI -->
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
    integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
    crossorigin="anonymous"
  >
</head>
<body>
  <!-- Application content -->
  <div id="app"></div>

  <!-- ✅ Local scripts (no SRI needed for same-origin) -->
  <script src="/js/app.js"></script>
</body>
</html>
```

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated dependency management code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Dependency Version Pinning</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All package versions in package.json pinned to exact versions without ^ or ~ prefixes<br/>
    ✓ Each dependency specifies exact major.minor.patch version like "express": "4.18.2"<br/>
    ✓ Package-lock.json contains integrity hashes for every package and sub-dependency<br/>
    ✓ Package updates include review of changelog and security advisories<br/>
    ✓ Version choices documented in DEPENDENCIES.md file or inline comments<br/>
    ✓ Test: Run npm install and verify package-lock.json unchanged, no ^ or ~ in package.json
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Vulnerability Scanning</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ npm audit run in project root, all high and critical vulnerabilities addressed before deployment<br/>
    ✓ CI/CD pipeline configured to fail builds if audit returns vulnerabilities above threshold<br/>
    ✓ Each vulnerability reviewed to understand attack vector and affected code paths<br/>
    ✓ Non-exploitable vulnerabilities documented with justification<br/>
    ✓ Automated dependency scanning set up with GitHub Dependabot, Snyk, or WhiteSource<br/>
    ✓ Regular dependency reviews scheduled quarterly to update outdated packages<br/>
    ✓ Test: Run npm audit verify exit code 0, trigger build with vulnerable package verify build fails
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Subresource Integrity</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Every external script and stylesheet from CDN has integrity attribute with SHA-384 or SHA-512 hash<br/>
    ✓ SRI hashes generated and verified before deploying<br/>
    ✓ crossorigin="anonymous" attribute included to enable CORS for integrity checking<br/>
    ✓ Registry maintained of trusted resources with current SRI hashes<br/>
    ✓ require-sri-for script style directive used in Content Security Policy<br/>
    ✓ Resource changes cause hash mismatch and browser refuses to load as intended protection<br/>
    ✓ Test: Modify one character of integrity hash, verify browser shows SRI error and script doesn't execute
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">No Dynamic Code Execution</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ No eval(), Function(), vm.runInContext(), or vm.runInThisContext() calls with user input or remote content<br/>
    ✓ JSON data parsed with JSON.parse() which is safe and cannot execute code<br/>
    ✓ Modules loaded with dynamic import() which goes through module resolution not arbitrary execution<br/>
    ✓ Dynamic configuration parsed as JSON and validated with Zod schema<br/>
    ✓ Never deserialize or execute code from untrusted sources (CDNs, user uploads, API responses)<br/>
    ✓ Test: Search codebase with grep -r "eval(", verify no matches for Function(, all dynamic content uses safe methods
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Unused Dependencies Cleanup</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ npx depcheck identifies packages in package.json but not imported anywhere<br/>
    ✓ Unused dependencies removed to reduce attack surface<br/>
    ✓ Transitive dependencies reviewed with npm ls to ensure necessity<br/>
    ✓ Large libraries evaluated - use specific functions rather than entire library if possible<br/>
    ✓ Dependencies consolidated - don't install multiple similar packages<br/>
    ✓ Documentation in package.json comments or DEPENDENCIES.md explaining why each package required<br/>
    ✓ Test: Run npx depcheck verify "No depcheck issue", review npm ls for reasonable tree depth
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Update Frequency & Maintenance</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Dependency age checked with npm outdated, packages without updates in 2+ years reviewed<br/>
    ✓ Unmaintained packages identified as security risks, alternatives researched<br/>
    ✓ Critical security packages (crypto, auth, validation) are actively maintained with frequent updates<br/>
    ✓ Calendar reminder set for quarterly dependency reviews<br/>
    ✓ Major version releases evaluated for upgrade within 3-6 months<br/>
    ✓ Balance maintained between stability and security<br/>
    ✓ Test: Run npm outdated verify no packages more than 1 major version behind, check GitHub commit dates
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Supply Chain Security</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Package authenticity verified before installing with npm view package-name to check publisher<br/>
    ✓ Package signatures checked with npm audit signatures for supported packages<br/>
    ✓ Source code on GitHub reviewed for suspicious activity before adopting new dependencies<br/>
    ✓ Packages with obfuscated code or compiled binaries without source avoided<br/>
    ✓ npm scope used for organizational packages to prevent typosquatting<br/>
    ✓ Package-lock.json enabled and committed to git for reproducible builds<br/>
    ✓ npm private registry or Verdaccio considered for additional supply chain control<br/>
    ✓ Test: Run npm audit signatures, check NPM package page for verification badge, review deps on GitHub
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Content Security Policy</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ CSP header configured to restrict where scripts can be loaded from<br/>
    ✓ default-src 'self' allows only same-origin by default<br/>
    ✓ Specific CDN domains added to script-src directive for external scripts<br/>
    ✓ require-sri-for script style directive mandates SRI for all external resources<br/>
    ✓ Nonce or hash-based CSP used for inline scripts if needed<br/>
    ✓ CSP tested in report-only mode first to avoid breaking legitimate functionality<br/>
    ✓ CSP violation reports monitored to detect attack attempts<br/>
    ✓ Never use unsafe-inline or unsafe-eval in script-src as they defeat CSP protection<br/>
    ✓ Test: Load app check DevTools Network tab for CSP header, verify violations reported, test intentional violation
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Automated Updates</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Dependabot or Renovate configured to automatically create PRs for dependency updates<br/>
    ✓ Automated update PRs reviewed and tested before merging, not blindly accepted<br/>
    ✓ Separate PRs for major version updates requiring manual review vs minor/patch updates<br/>
    ✓ Automated updates configured to only suggest when vulnerability is fixed<br/>
    ✓ CI/CD runs full test suite on dependency update PRs<br/>
    ✓ Staging environment considered for testing dependency updates before production<br/>
    ✓ Automation balanced with human review - automate discovery, manually approve critical changes<br/>
    ✓ Test: Enable Dependabot verify PRs created for outdated deps, review PR descriptions for changelogs
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing dependencies and external resource usage
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate secure dependency management with pinned versions and SRI
4. **Review generated code** using the Human Review Checklist above
5. **Run npm audit**: Address all high/critical vulnerabilities immediately
6. **Pin versions**: Remove all ^ and ~ from package.json
7. **Add SRI**: Generate integrity hashes for all external scripts
8. **Remove eval()**: Replace with JSON.parse or dynamic import()
9. **Integrate scanning**: Add npm audit to CI/CD pipeline
10. **Regular audits**: Review dependencies quarterly, update within 3 months

---

## 📖 Additional Resources

- [OWASP A06:2021 - Vulnerable and Outdated Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/)
- [OWASP Dependency Check Project](https://owasp.org/www-project-dependency-check/)
- [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [npm audit Documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [Snyk Vulnerability Database](https://security.snyk.io/)
- [GitHub Advisory Database](https://github.com/advisories)

---

**Remember**: Vulnerable components are preventable through pinned dependency versions (no ^ or ~), regular vulnerability scanning (npm audit in CI/CD), Subresource Integrity for external scripts (SHA-384 hashes), and never using eval() with remote content. Dependencies are code you didn't write but are responsible for securing.
