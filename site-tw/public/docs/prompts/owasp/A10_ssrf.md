# Server-Side Request Forgery (SSRF) — OWASP A10 Prompt Pack

> **OWASP A10: Server-Side Request Forgery (SSRF)** occurs when applications fetch remote resources based on user-supplied URLs without proper validation. Attackers exploit SSRF to access internal services, cloud metadata endpoints, private networks, or sensitive files, bypassing firewalls and network segmentation.

---

## 🎯 What is SSRF?

**Definition**: SSRF flaws occur whenever a web application fetches a remote resource without validating the user-supplied URL. Attackers can coerce the application to send crafted requests to unexpected destinations, even when protected by firewall, VPN, or network access control list (ACL).

**Common Manifestations**:
- **Internal Service Access**: Fetching `http://localhost:8080/admin` to access internal services
- **Cloud Metadata Exposure**: Accessing `http://169.254.169.254/latest/meta-data/` for AWS credentials
- **Private Network Scanning**: Using SSRF to scan internal network `http://192.168.1.0/24`
- **DNS Rebinding**: Domain initially resolves to public IP, then rebinds to private IP
- **Protocol Smuggling**: Using `file:///etc/passwd` or `gopher://internal-service` protocols
- **Redirect Abuse**: Allowed domain redirects to internal service
- **IP Format Bypass**: Using alternative IP representations like `http://127.1` or `http://2130706433`

**Why It Matters**: SSRF ranked #10 in OWASP Top 10 2021 with rising prevalence due to cloud adoption and microservices architecture. Modern applications increasingly fetch remote resources (webhooks, document processing, image proxies), expanding attack surface. Successful SSRF enables access to cloud metadata containing IAM credentials, internal databases, admin interfaces, and other services meant to be isolated. In cloud environments, SSRF can lead to full account compromise through metadata service exploitation.

---

## 🔗 Maps to STRIDE

**Primary**: **Tampering** (attackers manipulate server to make unauthorized requests)
**Secondary**: **Information Disclosure** (SSRF exposes internal services and metadata), **Elevation of Privilege** (accessing cloud credentials or admin interfaces)

See also: [STRIDE: Tampering](/docs/prompts/stride/tampering), [STRIDE: Information Disclosure](/docs/prompts/stride/information-disclosure), and [STRIDE: Elevation of Privilege](/docs/prompts/stride/elevation-of-privilege)

---

## 🤖 AI Prompt #1: Analyze Code for SSRF Vulnerabilities

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security analyst specializing in Server-Side Request Forgery vulnerabilities (OWASP A10).

Context:
I have a Node.js + TypeScript application that fetches remote resources, processes webhooks, proxies requests, or handles user-provided URLs. I need to identify all locations where SSRF vulnerabilities may exist.

My codebase includes:
- Webhook handlers accepting callback URLs
- Image/document processing fetching URLs
- URL shortener or proxy functionality
- API integrations with user-provided endpoints
- File upload with URL fetching
- RSS feed readers or web scrapers

Task:
Analyze the following code/files for OWASP A10 vulnerabilities:

[PASTE YOUR CODE HERE - fetch() calls, axios requests, webhook handlers, proxy functions]

Identify:

1. **Arbitrary URL Fetching**: fetch() or axios with user-supplied URL without validation
2. **Missing Protocol Validation**: Accepting file://, gopher://, ftp:// not just http/https
3. **No Domain Allowlist**: Fetching any domain instead of specific allowed domains
4. **Private IP Access**: No blocking of localhost, 127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
5. **Metadata Endpoint Access**: No blocking of 169.254.169.254 (AWS/Azure/GCP metadata)
6. **DNS Rebinding Risk**: Not validating resolved IP addresses before making request
7. **Redirect Following**: Automatically following redirects without validating redirect target
8. **No Timeout**: Missing timeout allowing slowloris attacks
9. **No Size Limit**: Missing response size limit enabling DoS

For each vulnerability found:

**Location**: [File:Line or Function Name]
**Issue**: [Specific SSRF vulnerability]
**Attack Vector**: [Example payload like http://169.254.169.254/latest/meta-data/ and what attacker gains]
**Risk**: [Impact - cloud credentials exposure, internal network access, file system access]
**Remediation**: [Specific fix - URL allowlist, IP blocking, DNS validation, timeout, redirect disable]

Requirements:
- Check all fetch(), axios, http.request() calls for URL validation
- Verify protocol is restricted to http/https
- Look for domain allowlist implementation
- Check for private IP range blocking
- Verify DNS resolution happens and IP is validated
- Check redirect handling (should be disabled or validated)
- Verify timeout and response size limits

Output:
Provide a prioritized list of SSRF vulnerabilities (Critical > High > Medium) with specific remediation examples using URL parsing, domain allowlisting, IP blocking, and DNS validation.
```

</div>

---

## 🤖 AI Prompt #2: Implement SSRF Prevention

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a security engineer implementing comprehensive SSRF prevention for a web application (OWASP A10 remediation).

Context:
I need to implement proper SSRF protection throughout my Node.js + TypeScript application that fetches remote resources.

Current state:
- Fetching arbitrary URLs from user input without validation
- No protocol validation (accepting file://, gopher://, etc.)
- No domain allowlist
- No private IP range blocking
- No cloud metadata endpoint blocking
- DNS resolution not validated
- Redirects followed automatically without validation
- No timeout or size limits

Requirements:
Implement the following SSRF prevention patterns:

1. **URL Validation**
   - Function: validateURL(urlString: string): URL
   - Parse URL using Node.js URL class
   - Only allow http: and https: protocols (reject file://, gopher://, ftp://, etc.)
   - Validate hostname is not empty or malformed
   - Throw descriptive errors for invalid URLs

2. **Domain Allowlist**
   - Constant: ALLOWED_DOMAINS = Set(['api.github.com', 'api.example.com', 'cdn.example.com'])
   - Check URL hostname against allowlist (case-insensitive)
   - Reject all domains not explicitly allowed
   - Support subdomain matching if needed (*.example.com)
   - Log all blocked domain access attempts

3. **Private IP Blocking**
   - Use ipaddr.js library for IP parsing and validation
   - Block RFC1918 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
   - Block loopback: 127.0.0.0/8
   - Block link-local: 169.254.0.0/16 (includes AWS metadata 169.254.169.254)
   - Block IPv6 equivalents: ::1, fc00::/7, fe80::/10
   - Function: isPrivateIP(ip: string): boolean
   - Test against each CIDR range using ipaddr.js match()

4. **Metadata Endpoint Blocking**
   - Constant: METADATA_ENDPOINTS = ['169.254.169.254', 'metadata.google.internal', 'metadata.azure.com']
   - Block known cloud metadata hostnames and IPs
   - Check both hostname and resolved IP against metadata list
   - Log all metadata access attempts as critical security events

5. **DNS Resolution Validation**
   - Use dns.promises.resolve() to resolve hostname to IP addresses
   - Function: validateIPAddress(hostname: string): Promise<void>
   - For each resolved IP, verify it's not private using isPrivateIP()
   - Check resolved IP not in metadata endpoint list
   - Throw error if any resolved IP is private or metadata endpoint
   - Handle DNS resolution failures gracefully (treat as suspicious)

6. **Redirect Protection**
   - Configure fetch() with redirect: 'error' to disable automatic redirects
   - Alternative: if redirects needed, implement validateRedirect(redirectUrl: string, originalUrl: URL)
   - Ensure redirect stays within same allowed domain
   - Re-validate redirect target IP address
   - Limit redirect chain depth (max 3 redirects)

7. **Request Timeout and Size Limits**
   - Use AbortController with 5 second timeout for all requests
   - Check Content-Length header before fetching body
   - Limit response size to 10MB maximum
   - Function: safeFetch(url: string): Promise<string>
   - Clear timeout after successful request

8. **Comprehensive Proxy Function**
   - Function: fetchRemoteResource(urlString: string, options?: FetchOptions): Promise<string>
   - Implement all validation layers: URL format, domain allowlist, DNS validation, IP blocking
   - Add security logging: log all requests with hostname, outcome, response size
   - Generic error messages to clients: "Failed to fetch resource"
   - Detailed errors logged server-side with full context

9. **Network-Level Controls** (documentation)
   - Document firewall rules blocking egress to private IP ranges
   - Document network segmentation isolating application from internal services
   - Provide iptables example rules for Linux systems

10. **Test Coverage**
    - Unit tests with blocked URLs: localhost, 127.0.0.1, 169.254.169.254, private IPs
    - Tests with various protocols: file://, gopher://, ftp:// (all should fail)
    - Tests with IP format variations: 127.1, 0.0.0.0, [::1]
    - Tests with DNS rebinding simulation
    - Tests verifying timeout and size limits enforced
    - Tests verifying only allowed domains succeed

Implementation:
- Use Node.js URL class for parsing
- Use ipaddr.js for IP validation and CIDR matching
- Use dns/promises for DNS resolution
- Use AbortController for timeouts
- TypeScript strict mode with proper typing
- Comprehensive inline security comments
- Generic error messages to users (detailed logs server-side)

Output:
Provide complete, executable TypeScript code for:
- `ssrf/urlValidation.ts` (validateURL, domain allowlist checking)
- `ssrf/ipValidation.ts` (isPrivateIP, validateIPAddress, DNS resolution)
- `ssrf/safeFetch.ts` (fetchRemoteResource with all SSRF protections)
- `ssrf/constants.ts` (ALLOWED_DOMAINS, PRIVATE_IP_RANGES, METADATA_ENDPOINTS)
- `__tests__/ssrf.test.ts` (Jest tests covering all blocked scenarios)
```

</div>

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: SSRF vulnerability - fetches arbitrary URLs
import fetch from 'node-fetch';

export async function fetchWebhook(url: string): Promise<string> {
  // ❌ No validation whatsoever!
  const response = await fetch(url);
  const text = await response.text();
  return text;
}

// Attack examples:
// fetchWebhook('http://localhost:8080/admin') // Access internal admin interface
// fetchWebhook('http://169.254.169.254/latest/meta-data/iam/security-credentials/') // Steal AWS credentials
// fetchWebhook('file:///etc/passwd') // Read local files
// fetchWebhook('http://192.168.1.1/config') // Scan internal network
```

### After (Secure Code)

```typescript
// ✅ SECURE: Comprehensive SSRF protection with defense in depth
import { URL } from 'url';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';
import fetch from 'node-fetch';

// ✅ Domain allowlist (deny-by-default)
const ALLOWED_DOMAINS = new Set([
  'api.github.com',
  'api.example.com',
  'cdn.example.com',
  'webhook.site', // For testing only
]);

// ✅ Private IP ranges to block (CIDR notation)
const PRIVATE_IP_RANGES = [
  '127.0.0.0/8',    // Loopback
  '10.0.0.0/8',     // Private network (Class A)
  '172.16.0.0/12',  // Private network (Class B)
  '192.168.0.0/16', // Private network (Class C)
  '169.254.0.0/16', // Link-local (includes 169.254.169.254 metadata)
  '0.0.0.0/8',      // Current network
  '100.64.0.0/10',  // Shared address space
  '::1/128',        // IPv6 loopback
  'fc00::/7',       // IPv6 private
  'fe80::/10',      // IPv6 link-local
  'ff00::/8',       // IPv6 multicast
];

// ✅ Known cloud metadata endpoints to block
const METADATA_ENDPOINTS = [
  '169.254.169.254',           // AWS, Azure, GCP, DigitalOcean
  'metadata.google.internal',  // GCP alternative
  'metadata.azure.com',        // Azure alternative
  '169.254.169.253',           // AWS IMDSv2
  'fd00:ec2::254',             // AWS IPv6 metadata
];

// ✅ Localhost variations to block
const LOCALHOST_VARIATIONS = [
  'localhost',
  '127.0.0.1',
  '[::1]',
  '0.0.0.0',
  '0',
  '127.1',           // Alternative format for 127.0.0.1
  '2130706433',      // Decimal representation of 127.0.0.1
];

// ✅ Check if IP address is private
function isPrivateIP(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);

    // ✅ Check against each private CIDR range
    for (const range of PRIVATE_IP_RANGES) {
      try {
        const cidr = ipaddr.parseCIDR(range);

        // ✅ Ensure same IP version (IPv4 or IPv6)
        if (addr.kind() === cidr[0].kind()) {
          if (addr.match(cidr)) {
            return true; // Private IP detected
          }
        }
      } catch (err) {
        // Invalid CIDR, skip
        continue;
      }
    }

    return false; // Public IP
  } catch (err) {
    // ✅ If parsing fails, treat as suspicious (safer to block)
    console.warn('Failed to parse IP address', { ip, error: err });
    return true;
  }
}

// ✅ Validate URL format and protocol
function validateURL(urlString: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString);
  } catch (err) {
    throw new Error('Invalid URL format');
  }

  // ✅ Only allow http and https protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    console.warn('SSRF attempt blocked: invalid protocol', {
      url: urlString,
      protocol: parsedUrl.protocol,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Protocol ${parsedUrl.protocol} not allowed. Use http or https only.`);
  }

  // ✅ Validate hostname is not empty
  if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
    throw new Error('URL must contain a valid hostname');
  }

  return parsedUrl;
}

// ✅ Check if domain is in allowlist
function isDomainAllowed(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  // ✅ Direct match
  if (ALLOWED_DOMAINS.has(normalized)) {
    return true;
  }

  // ✅ Check if subdomain of allowed domain (e.g., api.github.com)
  for (const allowedDomain of ALLOWED_DOMAINS) {
    if (normalized.endsWith('.' + allowedDomain)) {
      return true;
    }
  }

  return false;
}

// ✅ Validate domain against allowlist and known bad hosts
function validateDomain(hostname: string): void {
  const normalized = hostname.toLowerCase();

  // ✅ Block localhost variations
  if (LOCALHOST_VARIATIONS.includes(normalized)) {
    console.warn('SSRF attempt blocked: localhost access', {
      hostname: normalized,
      timestamp: new Date().toISOString()
    });
    throw new Error('Access to localhost is blocked');
  }

  // ✅ Block known metadata endpoints by hostname
  if (METADATA_ENDPOINTS.includes(normalized)) {
    console.error('SSRF attempt blocked: cloud metadata endpoint', {
      hostname: normalized,
      timestamp: new Date().toISOString()
    });
    throw new Error('Access to cloud metadata endpoints is blocked');
  }

  // ✅ Check domain allowlist
  if (!isDomainAllowed(normalized)) {
    console.warn('SSRF attempt blocked: domain not in allowlist', {
      hostname: normalized,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Domain ${hostname} is not in allowlist`);
  }
}

// ✅ Resolve hostname to IPs and validate none are private
async function validateIPAddress(hostname: string): Promise<void> {
  let addresses: string[];

  try {
    // ✅ Resolve hostname to IP addresses
    addresses = await dns.resolve(hostname);
  } catch (err) {
    // ✅ DNS resolution failed - treat as suspicious
    console.warn('DNS resolution failed', {
      hostname,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    throw new Error(`DNS resolution failed for ${hostname}`);
  }

  // ✅ Validate each resolved IP address
  for (const ip of addresses) {
    // ✅ Check if IP is private
    if (isPrivateIP(ip)) {
      console.error('SSRF attempt blocked: private IP resolution', {
        hostname,
        resolvedIP: ip,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Hostname ${hostname} resolves to private IP address: ${ip}`);
    }

    // ✅ Check if IP is metadata endpoint
    if (METADATA_ENDPOINTS.includes(ip)) {
      console.error('SSRF attempt blocked: metadata IP resolution', {
        hostname,
        resolvedIP: ip,
        timestamp: new Date().toISOString()
      });
      throw new Error('Hostname resolves to cloud metadata endpoint');
    }
  }

  // ✅ All IPs validated successfully
  console.debug('DNS validation passed', {
    hostname,
    resolvedIPs: addresses.length,
    timestamp: new Date().toISOString()
  });
}

// ✅ Safe fetch with comprehensive SSRF protection
export async function fetchRemoteResource(urlString: string): Promise<string> {
  try {
    // ✅ Layer 1: Validate URL format and protocol
    const parsedUrl = validateURL(urlString);

    // ✅ Layer 2: Validate domain against allowlist
    validateDomain(parsedUrl.hostname);

    // ✅ Layer 3: Resolve DNS and validate IPs are not private
    await validateIPAddress(parsedUrl.hostname);

    // ✅ Layer 4: Fetch with security controls
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000); // ✅ 5 second timeout

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      // ✅ Disable automatic redirects (prevent redirect to internal service)
      redirect: 'error',
      headers: {
        'User-Agent': 'SecureApp/1.0',
      },
      // ✅ Additional security options
      follow: 0,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // ✅ Layer 5: Validate response size before reading
    const contentLength = response.headers.get('content-length');
    const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB

    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      console.warn('Response size exceeds limit', {
        url: parsedUrl.hostname,
        contentLength,
        limit: MAX_RESPONSE_SIZE
      });
      throw new Error('Response size exceeds limit');
    }

    // ✅ Read response with size limit enforcement
    const text = await response.text();

    if (text.length > MAX_RESPONSE_SIZE) {
      throw new Error('Response size exceeds limit');
    }

    // ✅ Log successful request
    console.info('External request completed', {
      hostname: parsedUrl.hostname,
      status: response.status,
      size: text.length,
      timestamp: new Date().toISOString()
    });

    return text;

  } catch (err) {
    // ✅ Log SSRF prevention trigger
    if (err instanceof Error) {
      console.error('SSRF prevention triggered', {
        url: urlString,
        error: err.message,
        timestamp: new Date().toISOString()
      });

      // ✅ Send security alert for suspicious patterns
      if (err.message.includes('metadata') ||
          err.message.includes('localhost') ||
          err.message.includes('private IP')) {
        // Alert security team (implement actual alerting)
        console.error('🚨 SECURITY ALERT: SSRF attack attempt', {
          url: urlString,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // ✅ Generic error message to client (don't leak internal details)
    throw new Error('Failed to fetch resource');
  }
}

// ✅ Alternative: Validate redirect if redirects are needed
async function validateRedirect(redirectUrl: string, originalUrl: URL): Promise<void> {
  // ✅ Parse redirect URL
  const parsedRedirect = validateURL(redirectUrl);

  // ✅ Ensure redirect stays within same allowed domain
  if (parsedRedirect.hostname.toLowerCase() !== originalUrl.hostname.toLowerCase()) {
    console.warn('Redirect to different domain blocked', {
      original: originalUrl.hostname,
      redirect: parsedRedirect.hostname,
      timestamp: new Date().toISOString()
    });
    throw new Error('Redirects to different domains are not allowed');
  }

  // ✅ Validate redirect target IP
  await validateIPAddress(parsedRedirect.hostname);
}

// ✅ Example usage with error handling
export async function handleWebhook(webhookUrl: string): Promise<void> {
  try {
    const response = await fetchRemoteResource(webhookUrl);
    console.log('Webhook delivered successfully', {
      url: new URL(webhookUrl).hostname,
      responseSize: response.length
    });
  } catch (err) {
    console.error('Webhook delivery failed', {
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    throw new Error('Webhook delivery failed');
  }
}

// ✅ Additional security patterns:
// - URL format and protocol validation (http/https only)
// - Domain allowlist enforced (deny-by-default)
// - Private IP ranges blocked (RFC1918, loopback, link-local)
// - Cloud metadata endpoints blocked (169.254.169.254)
// - DNS resolution validated before request
// - Request timeout enforced (5 seconds)
// - Response size limited (10MB)
// - Redirects disabled (or validated if needed)
// - SSRF attempts logged as security events
// - Generic error messages to clients
// - Detailed errors logged server-side for investigation

// ✅ Network-level controls (additional defense layer):
// Firewall rules should also block egress to private IPs:
// iptables -A OUTPUT -d 10.0.0.0/8 -j REJECT
// iptables -A OUTPUT -d 172.16.0.0/12 -j REJECT
// iptables -A OUTPUT -d 192.168.0.0/16 -j REJECT
// iptables -A OUTPUT -d 169.254.0.0/16 -j REJECT
// iptables -A OUTPUT -d 127.0.0.0/8 -j REJECT
```

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated SSRF prevention code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">URL Validation</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All user-supplied URLs parsed using Node.js URL class which handles edge cases and malformed URLs<br/>
    ✓ Protocol restricted to http and https only, rejecting file://, gopher://, ftp://, data:, javascript:, and other schemes<br/>
    ✓ URL parsing happens before any other validation for consistent parsing and bypass prevention<br/>
    ✓ Hostname validated as not empty and properly formed<br/>
    ✓ URL encoding bypasses checked like %2F for forward slash or %3A for colon<br/>
    ✓ URLs normalized before comparison to prevent case sensitivity or encoding bypasses<br/>
    ✓ Tested with various malformed URLs and alternative IP representations to ensure correct parser handling<br/>
    ✓ Test: Submit file:///etc/passwd, gopher://internal, data:text/html, javascript:alert() verify all non-http/https blocked
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Domain Allowlist</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Deny-by-default domain allowlist implemented where only explicitly permitted domains can be accessed<br/>
    ✓ Allowlist maintained as configuration not hardcoded throughout application<br/>
    ✓ Both exact domain matching and subdomain matching supported if needed using suffix checks<br/>
    ✓ Domains normalized to lowercase before comparison to prevent case sensitivity bypasses<br/>
    ✓ Wildcards used carefully as *.example.com could be exploited if attacker registers evil-example.com<br/>
    ✓ All blocked domain access attempts logged with full URL and timestamp for security monitoring<br/>
    ✓ Allowlist regularly reviewed to remove unused domains reducing attack surface<br/>
    ✓ Temporary testing domains like webhook.site documented with justification and removal timeline<br/>
    ✓ Separate allowlists per feature or environment implemented if different trust levels exist<br/>
    ✓ Test: Attempt localhost, internal IPs, external domains not in allowlist verify all blocked with specific errors
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Private IP Blocking</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All RFC1918 private IP ranges blocked (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) using proper CIDR matching with ipaddr.js<br/>
    ✓ Loopback range 127.0.0.0/8 blocked not just 127.0.0.1, includes 127.0.0.2 and 127.1 shorthand<br/>
    ✓ Link-local range 169.254.0.0/16 blocked which includes cloud metadata endpoint 169.254.169.254<br/>
    ✓ Carrier-grade NAT range 100.64.0.0/10 blocked<br/>
    ✓ IPv6 ranges blocked: loopback ::1, private fc00::/7, link-local fe80::/10, multicast ff00::/8<br/>
    ✓ ipaddr.js match() method used which properly handles CIDR notation and IP version compatibility<br/>
    ✓ Decimal IP representation (2130706433 for 127.0.0.1), octal, and hex representations tested<br/>
    ✓ 0.0.0.0 blocked which refers to current host<br/>
    ✓ Test: Attempt 127.0.0.1, 127.1, 10.0.0.1, 172.16.0.1, 192.168.1.1, 169.254.169.254, [::1] verify all blocked
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Metadata Endpoint Protection</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All known cloud metadata endpoints blocked (169.254.169.254 for AWS/Azure/GCP/DigitalOcean, metadata.google.internal, metadata.azure.com, fd00:ec2::254)<br/>
    ✓ Both hostname and resolved IP checked against metadata endpoint list<br/>
    ✓ Metadata access is critical vulnerability exposing IAM credentials, API keys, instance metadata without authentication<br/>
    ✓ All metadata access attempts logged as critical security events requiring immediate investigation<br/>
    ✓ Entire 169.254.0.0/16 range considered for blocking as multiple cloud providers use this space<br/>
    ✓ Docker metadata at 172.17.0.1 blocked for containerized environments<br/>
    ✓ Metadata endpoint list updated as new cloud providers emerge or existing providers add endpoints<br/>
    ✓ Test: Attempt 169.254.169.254, metadata.google.internal, metadata.azure.com directly and via DNS verify all blocked and logged
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">DNS Validation</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Hostname resolved to IP addresses using dns.promises.resolve() before HTTP request to prevent DNS rebinding attacks<br/>
    ✓ Every resolved IP address validated against private IP ranges and metadata endpoints<br/>
    ✓ If any resolved IP is private or metadata, entire request rejected<br/>
    ✓ DNS resolution failures handled by rejecting request rather than proceeding without validation<br/>
    ✓ DNS rebinding TTL tricks where attacker sets very low TTL considered and mitigated<br/>
    ✓ DNS response caching with security checks or DNS resolver that blocks private IPs considered<br/>
    ✓ For highest security, DNS resolved, IPs validated, then resolved IP used directly with Host header bypassing client-side DNS<br/>
    ✓ Test: Create test domain resolving to private IP or 169.254.169.254 verify blocked, test domain with multiple IPs including mix
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Redirect Handling</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Automatic redirect following disabled using fetch() option redirect: 'error' to prevent allowed domain redirecting to internal service<br/>
    ✓ If redirects are business requirement, manual redirect handling validates redirect target URL through full validation chain<br/>
    ✓ Redirect chain depth limited to maximum 3 redirects preventing infinite loops<br/>
    ✓ Redirect stays within same allowed domain or uses separate allowlist for redirect targets<br/>
    ✓ All redirects logged with original and target URLs for security monitoring<br/>
    ✓ Location header can contain relative or absolute URLs requiring careful parsing<br/>
    ✓ Some HTTP clients follow redirects even for error status codes like 401 or 403 considered<br/>
    ✓ Test: Set up allowed domain redirecting to localhost or 169.254.169.254 verify redirect blocked, test redirect chains and cross-domain
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Timeout Protection</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Request timeout implemented using AbortController with maximum 5 seconds to prevent slowloris attacks<br/>
    ✓ Timeout cleared after successful request completion to prevent resource leaks<br/>
    ✓ Separate timeouts considered for DNS resolution (1s), connection establishment (2s), data transfer (5s) for finer control<br/>
    ✓ Timeout applies to entire request lifecycle not just initial connection<br/>
    ✓ In production, timeout values tuned based on legitimate request patterns but never exceed 10 seconds total<br/>
    ✓ Timeout events logged as potential attack indicators<br/>
    ✓ Connection pooling with maximum concurrent connections limit preventing resource exhaustion<br/>
    ✓ Keep-alive timeout implemented to close idle connections<br/>
    ✓ Test: Create slow HTTP server delaying response verify request times out after 5 seconds, monitor resource usage during timeout
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Response Size Limits</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Content-Length header checked before fetching response body, rejected if exceeds maximum 10MB to prevent memory exhaustion DoS<br/>
    ✓ If Content-Length header missing or lies, limit enforced by measuring actual data received and aborting if exceeds threshold<br/>
    ✓ Response read in chunks with size validation rather than single response.text() call<br/>
    ✓ Different limits considered for different content types like 100KB for JSON API responses vs 10MB for document downloads<br/>
    ✓ Large response attempts logged with source URL and size<br/>
    ✓ Rate limiting implemented on total bandwidth consumed per IP or per time period<br/>
    ✓ For streaming responses, timeout on total transfer time not just initial connection<br/>
    ✓ Memory usage monitored during large responses to detect issues before production impact<br/>
    ✓ Test: Create response with Content-Length claiming 1KB but sending 50MB verify abort, test without Content-Length header
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Defense in Depth</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Multiple independent layers of SSRF protection implemented where failure of one layer doesn't expose vulnerability<br/>
    ✓ Application-level controls include URL validation, domain allowlist, DNS validation, IP blocking, timeout, size limits<br/>
    ✓ Network-level controls include firewall egress rules blocking private IPs, network segmentation isolating application from internal services, proxy server for all external requests<br/>
    ✓ Infrastructure controls include running application in container or VM with minimal network access, cloud security groups restricting egress, monitoring network traffic for suspicious patterns<br/>
    ✓ Administrative controls include security testing for SSRF in CI/CD, regular security audits, incident response procedures<br/>
    ✓ Each layer provides redundancy so compromise of application doesn't automatically expose internal network<br/>
    ✓ Test: Verify both application validation and network firewall rules block private IPs, try bypassing each layer individually verify others protect
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing codebase for SSRF vulnerabilities
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate comprehensive SSRF protection
4. **Review generated code** using the Human Review Checklist above
5. **Implement domain allowlist**: Define allowed external domains
6. **Add IP validation**: Block private IP ranges and metadata endpoints
7. **Configure DNS validation**: Resolve and validate IPs before requests
8. **Disable redirects**: Use redirect: 'error' or validate redirect targets
9. **Add timeouts**: Implement 5 second timeout with AbortController
10. **Set size limits**: Enforce 10MB maximum response size
11. **Test thoroughly**: Attempt access to localhost, private IPs, metadata endpoints
12. **Add network controls**: Configure firewall rules blocking egress to private IPs
13. **Monitor logs**: Set up alerts for SSRF attempt patterns
14. **Regular testing**: Include SSRF in penetration testing and security audits

---

## 📖 Additional Resources

- **[OWASP A10:2021 - Server-Side Request Forgery](https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)** — Official OWASP documentation
- **[OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)** — Comprehensive prevention guide
- **[PortSwigger SSRF Guide](https://portswigger.net/web-security/ssrf)** — Attack techniques and defenses
- **[AWS SSRF Protection with IMDSv2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)** — Metadata security
- **[Cloud Metadata SSRF](https://blog.appsecco.com/an-ssrf-privileged-aws-keys-and-the-capital-one-breach-4c3c2cded3af)** — Capital One breach analysis
- **[Back to OWASP Overview](/docs/prompts/owasp/)** — See all 10 categories

---

**Remember**: SSRF is preventable through defense in depth. Validate URL format and protocol (http/https only), enforce domain allowlist (deny-by-default), block private IP ranges (RFC1918, loopback, link-local) and cloud metadata endpoints (169.254.169.254), resolve DNS and validate IPs before requests (prevent DNS rebinding), disable automatic redirects or validate redirect targets, implement request timeout (5 seconds) and response size limits (10MB), and deploy network-level egress filtering. SSRF in cloud environments can lead to full account compromise through metadata service exploitation. Validate, validate, validate.
