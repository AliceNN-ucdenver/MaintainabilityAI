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

After AI generates SSRF prevention code, carefully review each area before deploying:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 🌐 URL Validation

Verify all user-supplied URLs are parsed using Node.js URL class which properly handles edge cases and malformed URLs. Protocol must be restricted to http and https only, rejecting file://, gopher://, ftp://, data:, javascript:, and any other schemes. URL parsing should happen before any other validation to ensure consistent parsing and prevent bypass through encoding tricks. Validate hostname is not empty and properly formed. Check for URL encoding bypasses like %2F for forward slash or %3A for colon. Normalize URLs before comparison to prevent case sensitivity or encoding bypasses. Test with various malformed URLs and alternative IP representations to ensure parser handles them correctly. Consider using a URL parsing library specifically designed for security like url-parse with known vulnerabilities patched.

**Test it**: Submit various URL formats including file:///etc/passwd, gopher://internal, data:text/html, and javascript:alert(). All non-http/https should be blocked.

---

### 🔐 Domain Allowlist

Implement deny-by-default domain allowlist where only explicitly permitted domains can be accessed. Allowlist should be maintained as configuration not hardcoded throughout application. Support both exact domain matching and subdomain matching if needed using suffix checks. Normalize domains to lowercase before comparison to prevent case sensitivity bypasses. Consider using wildcards carefully as *.example.com could be exploited if attacker registers evil-example.com. Log all blocked domain access attempts with full URL and timestamp for security monitoring. Regularly review allowlist to remove unused domains reducing attack surface. For temporary testing domains like webhook.site, document why they're allowed and when they should be removed. Implement separate allowlists per feature or environment if different trust levels exist.

**Test it**: Attempt to access domains not in allowlist including localhost, internal IPs, and external domains. All should be blocked with specific error messages.

---

### 🚫 Private IP Blocking

Block all RFC1918 private IP ranges including 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16 using proper CIDR matching with ipaddr.js library. Block loopback range 127.0.0.0/8 not just 127.0.0.1 as attackers may use 127.0.0.2 or 127.1 (shorthand for 127.0.0.1). Block link-local range 169.254.0.0/16 which includes cloud metadata endpoint 169.254.169.254. Block carrier-grade NAT range 100.64.0.0/10. For IPv6, block loopback ::1, private fc00::/7, link-local fe80::/10, and multicast ff00::/8. Use ipaddr.js match() method which properly handles CIDR notation and IP version compatibility. Test against decimal IP representation (2130706433 for 127.0.0.1), octal, and hex representations. Block 0.0.0.0 which refers to current host.

**Test it**: Attempt access to 127.0.0.1, 127.1, 10.0.0.1, 172.16.0.1, 192.168.1.1, 169.254.169.254, [::1], and alternative representations. All should be blocked.

---

### ☁️ Metadata Endpoint Protection

Block all known cloud metadata endpoints including 169.254.169.254 (AWS, Azure, GCP, DigitalOcean), metadata.google.internal (GCP DNS name), metadata.azure.com (Azure alternative), and fd00:ec2::254 (AWS IPv6). Check both hostname and resolved IP against metadata endpoint list. Metadata access is critical vulnerability as endpoints expose IAM credentials, API keys, instance metadata, and user data without authentication. Log all metadata access attempts as critical security events requiring immediate investigation. Consider blocking entire 169.254.0.0/16 range as multiple cloud providers use this space. For containerized environments, also block Docker metadata at 172.17.0.1. Update metadata endpoint list as new cloud providers emerge or existing providers add endpoints.

**Test it**: Attempt access to 169.254.169.254, metadata.google.internal, metadata.azure.com directly and via DNS that resolves to these. All should be blocked and logged.

---

### 🔍 DNS Validation

Resolve hostname to IP addresses using dns.promises.resolve() before making HTTP request to prevent DNS rebinding attacks where attacker-controlled domain initially resolves to public IP then rebinds to private IP. Validate every resolved IP address against private IP ranges and metadata endpoints. If any resolved IP is private or metadata, reject entire request. Handle DNS resolution failures by rejecting request rather than proceeding without validation. Be aware of DNS rebinding time-to-live (TTL) tricks where attacker sets very low TTL causing re-resolution between your checks and actual fetch. Consider implementing DNS response caching with security checks or using DNS resolver that blocks private IPs. For highest security, resolve DNS, validate IPs, then use resolved IP directly with Host header for request bypassing client-side DNS entirely.

**Test it**: Create test domain that resolves to private IP or 169.254.169.254 and verify access is blocked. Test domain that resolves to multiple IPs including mix of public and private.

---

### 🔄 Redirect Handling

Disable automatic redirect following using fetch() option redirect: 'error' to prevent attacker from using allowed domain that redirects to internal service. If redirects are business requirement, implement manual redirect handling that validates redirect target URL through full validation chain including protocol check, domain allowlist, DNS resolution, and IP validation. Limit redirect chain depth to maximum 3 redirects preventing infinite loops. Ensure redirect stays within same allowed domain or use separate allowlist for redirect targets. Log all redirects with original and target URLs for security monitoring. Consider that Location header can contain relative or absolute URLs requiring careful parsing. Be aware some HTTP clients follow redirects even for error status codes like 401 or 403. Test redirect handling with various redirect chains and cross-domain redirects.

**Test it**: Set up allowed domain that redirects to localhost or 169.254.169.254 and verify redirect is blocked. Test redirect chains and cross-domain redirects.

---

### ⏱️ Timeout Protection

Implement request timeout using AbortController with maximum 5 seconds to prevent slowloris attacks where server sends data very slowly holding connection open indefinitely. Clear timeout after successful request completion to prevent resource leaks. Consider separate timeouts for DNS resolution (1 second), connection establishment (2 seconds), and data transfer (5 seconds) for finer control. Timeout should apply to entire request lifecycle not just initial connection. In production, tune timeout values based on legitimate request patterns but never exceed 10 seconds total. Log timeout events as potential attack indicators. Implement connection pooling with maximum concurrent connections limit preventing resource exhaustion from many slow requests. Use keep-alive timeout to close idle connections.

**Test it**: Create slow HTTP server that delays response and verify request times out after 5 seconds. Monitor resource usage during timeout to ensure cleanup.

---

### 📊 Response Size Limits

Check Content-Length header before fetching response body and reject if exceeds maximum 10MB to prevent memory exhaustion DoS attacks. If Content-Length header is missing or lies, enforce limit by measuring actual data received and aborting if exceeds threshold. Read response in chunks with size validation rather than single response.text() call. Consider different limits for different content types like 100KB for JSON API responses vs 10MB for document downloads. Log large response attempts with source URL and size. Implement rate limiting on total bandwidth consumed per IP or per time period. For streaming responses, implement timeout on total transfer time not just initial connection. Monitor memory usage during large responses to detect issues before production impact.

**Test it**: Create response with Content-Length header claiming 1KB but actually sending 50MB and verify request is aborted. Test without Content-Length header.

---

### 🛡️ Defense in Depth

Implement multiple independent layers of SSRF protection where failure of one layer doesn't expose vulnerability. Application-level controls include URL validation, domain allowlist, DNS validation, IP blocking, timeout, and size limits. Network-level controls include firewall egress rules blocking private IPs, network segmentation isolating application from internal services, and using proxy server for all external requests. Infrastructure controls include running application in container or VM with minimal network access, using cloud security groups restricting egress, and monitoring network traffic for suspicious patterns. Administrative controls include security testing for SSRF in CI/CD, regular security audits, and incident response procedures. Each layer provides redundancy so compromise of application doesn't automatically expose internal network.

**Test it**: Verify both application validation and network firewall rules block private IPs. Try bypassing each layer individually and verify others still protect.

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
