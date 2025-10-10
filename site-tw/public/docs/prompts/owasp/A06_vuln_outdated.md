# A06: Vulnerable and Outdated Components — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: dependency scanning, SRI, version pinning, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security engineer implementing OWASP A06:2021 - Vulnerable and Outdated Components.

Context:
- Node 18 + TypeScript
- Using npm/yarn for dependency management
- Loading external scripts and libraries
- Need to validate integrity and security of dependencies
- Implement Subresource Integrity (SRI) for CDN resources
- Avoid eval() and dynamic code execution

Security Requirements:
- Never use eval() or Function() constructor with remote code
- Verify integrity of external scripts with SRI hashes
- Pin dependency versions (avoid wildcard ranges)
- Regular security audits (npm audit, Snyk, Dependabot)
- Remove unused dependencies
- Use only trusted sources for dependencies
- Implement Content Security Policy (CSP)
- Validate and sanitize any loaded remote content

Task:
1) Refactor `examples/owasp/A06_vuln_outdated/insecure.ts` to remove dangerous code execution
2) Replace eval() with safe alternatives:
   - If loading JSON: use JSON.parse()
   - If loading modules: use dynamic import()
   - Never execute arbitrary remote code
3) Implement SRI verification for external scripts:
   - Generate SHA-384 hash of expected content
   - Verify hash before using content
4) Add dependency security checks:
   - Run npm audit
   - Pin versions in package.json (no ^, ~)
5) Implement CSP to restrict script sources
6) Run tests in `examples/owasp/A06_vuln_outdated/__tests__/vuln.test.ts` and ensure they pass

Security Checklist:
□ No eval() or Function() constructor usage
□ No dynamic code execution from remote sources
□ SRI hashes verified for external resources
□ Dependencies pinned to specific versions
□ npm audit runs clean (or issues triaged)
□ Unused dependencies removed
□ CSP implemented to restrict script sources
□ Tests verify safe code loading
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security engineer. Fix OWASP A06: Vulnerable and Outdated Components in examples/owasp/A06_vuln_outdated/insecure.ts.

Requirements:
- Remove all eval() usage (extremely dangerous)
- Replace dynamic code execution with safe alternatives (JSON.parse, import())
- Implement SRI verification for external scripts (SHA-384 hash check)
- Never execute untrusted remote code
- Use allowlist for permitted script sources
- Implement CSP to restrict code execution
- Tests must pass in __tests__/vuln.test.ts

Safe Alternatives:
- For JSON: JSON.parse() (not eval)
- For modules: dynamic import() (not eval)
- For scripts: Verify SRI hash before use
- For config: Environment variables (not remote code)
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
// ❌ INSECURE: eval() executes arbitrary remote code!
export async function loadRemoteCode(url: string) {
  const res = await fetch(url);
  eval(await res.text());  // ❌ EXTREMELY DANGEROUS!
}
```

**Problems**:
- eval() executes any JavaScript from remote source
- Attacker can compromise CDN/server and inject malicious code
- No integrity verification
- No content validation

### After (Secure)
```typescript
// ✅ SECURE: Safe loading with integrity verification
import crypto from 'crypto';

interface TrustedSource {
  url: string;
  integrity: string; // SRI hash (sha384-...)
  type: 'json' | 'module';
}

// ✅ Allowlist of trusted sources with SRI hashes
const TRUSTED_SOURCES: Record<string, TrustedSource> = {
  'config': {
    url: 'https://cdn.example.com/config.json',
    integrity: 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC',
    type: 'json'
  },
  'analytics': {
    url: 'https://cdn.example.com/analytics.js',
    integrity: 'sha384-...',
    type: 'module'
  }
};

function verifyIntegrity(content: string, expectedIntegrity: string): boolean {
  // Parse SRI hash format: "sha384-base64hash"
  const [algorithm, expectedHash] = expectedIntegrity.split('-');

  if (algorithm !== 'sha384') {
    throw new Error('Only SHA-384 is supported for SRI');
  }

  // ✅ Calculate hash of actual content
  const hash = crypto
    .createHash('sha384')
    .update(content)
    .digest('base64');

  // ✅ Constant-time comparison
  return hash === expectedHash;
}

export async function loadTrustedResource(resourceName: string): Promise<any> {
  // ✅ Check if resource is in allowlist
  const source = TRUSTED_SOURCES[resourceName];
  if (!source) {
    throw new Error(`Resource ${resourceName} is not in trusted sources list`);
  }

  try {
    // ✅ Fetch content
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${response.statusText}`);
    }

    const content = await response.text();

    // ✅ Verify integrity before using
    if (!verifyIntegrity(content, source.integrity)) {
      throw new Error(`Integrity check failed for ${resourceName}`);
    }

    // ✅ Parse based on type (never eval!)
    if (source.type === 'json') {
      return JSON.parse(content); // ✅ Safe JSON parsing
    } else if (source.type === 'module') {
      // ✅ For modules, you could use dynamic import with blob URLs
      // But this is complex - better to bundle dependencies
      throw new Error('Dynamic module loading not recommended - use npm packages');
    }

    return content;
  } catch (err) {
    console.error(`Failed to load trusted resource ${resourceName}:`, err);
    throw new Error('Failed to load resource');
  }
}

// ✅ Generate SRI hash for a new resource (run this once, store the hash)
export function generateSRIHash(content: string): string {
  const hash = crypto
    .createHash('sha384')
    .update(content)
    .digest('base64');

  return `sha384-${hash}`;
}
```

### Dependency Management Example
```json
// ✅ package.json with pinned versions
{
  "name": "secure-app",
  "dependencies": {
    "express": "4.18.2",         // ✅ Pinned (not ^4.18.2)
    "bcrypt": "5.1.1",           // ✅ Pinned
    "zod": "3.22.4"              // ✅ Pinned
  },
  "devDependencies": {
    "@types/node": "20.10.0",    // ✅ Pinned
    "typescript": "5.3.2"        // ✅ Pinned
  },
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix"
  }
}
```

### HTML with SRI Example
```html
<!-- ✅ External script with SRI -->
<script
  src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
></script>
```

---

## Common Vulnerable Component Issues

1. **Using eval() with Remote Code**
   - Problem: eval() executes arbitrary JavaScript
   - Fix: Never use eval(), use JSON.parse() or safe alternatives

2. **No Integrity Verification**
   - Problem: Modified CDN content executes without validation
   - Fix: Implement SRI (Subresource Integrity)

3. **Wildcard Version Ranges**
   - Problem: ^1.0.0 or ~1.0.0 can pull vulnerable versions
   - Fix: Pin exact versions (1.0.0)

4. **Outdated Dependencies**
   - Problem: Known CVEs in old package versions
   - Fix: Regular npm audit, automated updates (Dependabot)

5. **Unused Dependencies**
   - Problem: Increased attack surface
   - Fix: Remove unused packages, use depcheck tool

6. **Untrusted Package Sources**
   - Problem: Typosquatting, malicious packages
   - Fix: Verify package authenticity, use npm scope (@org/package)

7. **No Security Monitoring**
   - Problem: Vulnerabilities discovered after deployment
   - Fix: Automated scanning (Snyk, Dependabot, npm audit)

---

## Dependency Security Workflow

```bash
# 1. Audit dependencies for known vulnerabilities
npm audit

# 2. Fix automatically (check changes carefully!)
npm audit fix

# 3. Check for unused dependencies
npx depcheck

# 4. Update package-lock.json (regenerate integrity hashes)
npm install

# 5. Verify no vulnerabilities remain
npm audit --audit-level=moderate

# 6. Check for outdated packages
npm outdated
```

---

## Testing Checklist

- [ ] No eval() or Function() constructor usage
- [ ] No dynamic code execution from remote sources
- [ ] SRI hashes verified for all external resources
- [ ] Dependencies pinned to exact versions (no ^, ~)
- [ ] npm audit shows no high/critical vulnerabilities
- [ ] Unused dependencies removed (depcheck)
- [ ] CSP implemented to restrict script sources
- [ ] Tests verify integrity check rejects tampered content

---

## Content Security Policy Example

```typescript
// ✅ Strict CSP to prevent unauthorized script execution
export function getCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' https://cdn.example.com", // ✅ Specific CDN only
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');
}
```

---

## Attack Scenarios to Prevent

```typescript
// Test these scenarios - all should be blocked:
const attackScenarios = [
  "eval() executes malicious remote code",
  "Compromised CDN serves modified JavaScript",
  "Typosquatted package name installed",
  "Vulnerable dependency exploited (known CVE)",
  "Attacker modifies package-lock.json",
  "Untrusted script source bypasses CSP",
];
```

---

## Dependency Allowlist Pattern

```typescript
// ✅ Explicit allowlist of permitted dependencies
const ALLOWED_DEPENDENCIES = new Set([
  'express',
  'bcrypt',
  'zod',
  'pg',
  // ... add all permitted packages
]);

export function validateDependencies(packageJson: any): void {
  const installed = Object.keys(packageJson.dependencies || {});

  for (const dep of installed) {
    if (!ALLOWED_DEPENDENCIES.has(dep)) {
      throw new Error(`Unauthorized dependency: ${dep}`);
    }
  }
}
```

---

## Additional Resources

- [OWASP A06:2021 - Vulnerable and Outdated Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [npm audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk Vulnerability Database](https://security.snyk.io/)
- [GitHub Dependabot](https://docs.github.com/en/code-security/dependabot)
