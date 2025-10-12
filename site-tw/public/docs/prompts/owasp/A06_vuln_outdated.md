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

After AI generates secure component management code, carefully review each area before deploying:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 📦 Dependency Versions

All package versions in package.json must be pinned to exact versions without ^ or ~ prefixes. Wildcard characters allow automatic updates that may introduce vulnerabilities. Each dependency should specify exact major.minor.patch version like "express": "4.18.2". Review package-lock.json to ensure integrity hashes are present for every package and sub-dependency. When updating packages, review changelog and security advisories for breaking changes or new vulnerabilities. Document why each specific version was chosen in a DEPENDENCIES.md file or inline comments.

**Test it**: Run npm install and verify package-lock.json has not changed. Check that no ^ or ~ characters appear in package.json dependencies.

---

### 🔍 Vulnerability Scanning

Run npm audit in the project root and address all high and critical vulnerabilities before deployment. Configure CI/CD pipeline to fail builds if audit returns vulnerabilities above acceptable threshold. Review each vulnerability to understand the attack vector and affected code paths. Some vulnerabilities may not be exploitable in your specific usage - document these exceptions. Set up automated dependency scanning with GitHub Dependabot, Snyk, or WhiteSource to get alerts on new CVEs. Schedule regular dependency reviews quarterly to update outdated packages.

**Test it**: Run npm audit and verify exit code 0 with no vulnerabilities. Trigger build with known vulnerable package and verify build fails.

---

### 🔐 Subresource Integrity

Every external script and stylesheet loaded from CDN must have an integrity attribute with SHA-384 or SHA-512 hash. Generate SRI hashes using the generateSRIHash function and verify them before deploying. Include crossorigin="anonymous" attribute to enable CORS for integrity checking. If external resource changes, hash will mismatch and browser will refuse to load it - this is intentional protection. Maintain a registry of trusted resources with their current SRI hashes. Use require-sri-for script style in Content Security Policy to enforce SRI at HTTP header level.

**Test it**: Modify one character of the integrity hash and verify browser console shows SRI validation error and script does not execute.

---

### 🚫 No Dynamic Code Execution

Search entire codebase for eval(), Function(), vm.runInContext(), and vm.runInThisContext() calls. None of these should accept user input or remote content. For JSON data, use JSON.parse() which is safe and cannot execute code. For modules, use dynamic import() which goes through module resolution, not arbitrary code execution. If configuration must be loaded dynamically, parse as JSON and validate structure with Zod schema. Never deserialize or execute code from untrusted sources including CDNs, user uploads, or API responses.

**Test it**: Search codebase with grep -r "eval(" and verify no matches. Search for Function( and verify no matches. All dynamic content uses JSON.parse or import().

---

### 🧹 Unused Dependencies

Run npx depcheck to identify packages installed in package.json but not imported anywhere in code. Remove unused dependencies to reduce attack surface - each package is potential vulnerability entry point. Review dependencies of dependencies (transitive deps) with npm ls and ensure they're all necessary. Consider alternatives to large libraries - do you need all of lodash or just one function? Consolidate dependencies where possible - don't install both axios and node-fetch if one suffices. Document in package.json comments or DEPENDENCIES.md why each package is required and where it's used.

**Test it**: Run npx depcheck and verify "No depcheck issue" message. Review npm ls output for reasonable dependency tree depth (prefer shallow).

---

### 📅 Update Frequency

Check age of dependencies with npm outdated and review packages without updates in 2+ years. Unmaintained packages are security risks as vulnerabilities won't be patched. Research alternatives to abandoned packages before adopting them. For critical security packages (crypto, auth, input validation), prefer actively maintained options with frequent updates. Set calendar reminder to review dependencies quarterly. When major versions are released, evaluate upgrade path within 3-6 months. Balance stability with security - too-old dependencies become vulnerable, too-new might be unstable.

**Test it**: Run npm outdated and verify no packages are more than 1 major version behind current. Check last commit date on GitHub for each core dependency.

---

### 🔗 Supply Chain Security

Verify authenticity of packages before installing with npm view package-name to see publisher and verify it's official. Check package signature with npm audit signatures for packages that support it. Review package source code on GitHub for suspicious activity before adopting new dependencies. Avoid packages with obfuscated code or compiled binaries without source. Use npm scope for organizational packages to prevent typosquatting. Enable package-lock.json and commit it to git to ensure reproducible builds. Consider using npm private registry or Verdaccio for additional supply chain control.

**Test it**: Run npm audit signatures and verify results. Check NPM package page for publisher verification badge. Review top-level dependencies on GitHub.

---

### 🛡️ Content Security Policy

Configure Content Security Policy header to restrict where scripts can be loaded from. Use default-src 'self' to only allow same-origin by default. Add specific CDN domains to script-src directive for external scripts. Include require-sri-for script style directive to mandate SRI for all external resources. Use nonce or hash-based CSP for inline scripts if needed. Test CSP in report-only mode first to avoid breaking legitimate functionality. Monitor CSP violation reports to detect attack attempts. Never use unsafe-inline or unsafe-eval in script-src as they defeat CSP protection.

**Test it**: Load application and check browser DevTools Network tab for CSP header. Verify CSP violations are reported in console. Test with intentional violation.

---

### 🔄 Automated Updates

Configure Dependabot or Renovate to automatically create pull requests for dependency updates. Review and test automated update PRs before merging - don't blindly accept. Set up separate PR for major version updates requiring manual review vs minor/patch updates. Configure automated updates to only suggest if vulnerability is fixed. Use CI/CD to run full test suite on dependency update PRs. Consider staging environment for testing dependency updates before production. Balance automation with human review - automate discovery and proposal, manually approve critical changes.

**Test it**: Enable Dependabot and verify PRs are created for outdated dependencies. Review PR descriptions for changelog and vulnerability info.

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
