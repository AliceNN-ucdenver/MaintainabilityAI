# A10: Server-Side Request Forgery (SSRF) — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: URL validation, allowlisting, network segmentation, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security engineer implementing OWASP A10:2021 - Server-Side Request Forgery (SSRF).

Context:
- Node 18 + TypeScript
- Implementing URL fetching/proxy functionality
- Need to prevent SSRF attacks
- Validate and sanitize all URLs from user input
- Use allowlist for permitted domains
- Block access to internal networks (localhost, 127.0.0.1, 169.254.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Implement network segmentation

Security Requirements:
- Never fetch arbitrary URLs from user input
- Validate URL format and protocol (only http/https)
- Use allowlist for permitted domains
- Block private IP ranges and localhost
- Block metadata services (169.254.169.254)
- Prevent DNS rebinding attacks
- Disable URL redirects or validate redirect targets
- Implement timeout for external requests
- Use network-level controls (firewall rules)
- Log SSRF attempts

Task:
1) Refactor `examples/owasp/A10_ssrf/insecure.ts` to prevent SSRF
2) Add URL validation:
   - Parse URL and validate protocol (http/https only)
   - Extract hostname and validate against allowlist
   - Block private IP ranges
   - Block cloud metadata endpoints
3) Implement domain allowlist:
   - Only permit specific trusted domains
   - Reject all other domains
4) Add DNS resolution validation:
   - Resolve hostname to IP
   - Verify IP is not in private ranges
   - Check for DNS rebinding
5) Configure request timeout (5 seconds)
6) Disable automatic redirects or validate redirect targets
7) Run tests in `examples/owasp/A10_ssrf/__tests__/ssrf.test.ts` and ensure they pass

Security Checklist:
□ URL format validated (http/https only)
□ Domain allowlist enforced
□ Private IP ranges blocked (127.0.0.1, 10.0.0.0/8, etc.)
□ Cloud metadata endpoints blocked (169.254.169.254)
□ DNS resolution verified before request
□ Request timeout configured (5 seconds)
□ Redirects disabled or validated
□ SSRF attempts logged
□ Tests verify blocked URLs are rejected
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security engineer. Fix OWASP A10: Server-Side Request Forgery in examples/owasp/A10_ssrf/insecure.ts.

Requirements:
- Add URL validation (protocol, hostname, IP range checks)
- Implement domain allowlist (reject all except permitted)
- Block private IP ranges (127.0.0.1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
- Block cloud metadata endpoints (169.254.169.254)
- Resolve DNS and validate IP before fetching
- Set request timeout (5 seconds)
- Disable redirects or validate redirect targets
- Log SSRF attempts
- Tests must pass in __tests__/ssrf.test.ts

Blocked Targets:
- Protocols: file://, gopher://, ftp:// (allow http/https only)
- Private IPs: 127.0.0.1, 10.*, 172.16-31.*, 192.168.*, 169.254.*
- Localhost: localhost, 127.0.0.1, [::1]
- Metadata: 169.254.169.254, metadata.google.internal
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
// ❌ INSECURE: Fetches arbitrary URLs from user input
export async function proxy(url: string) {
  const res = await fetch(url);  // ❌ No validation!
  return await res.text();
}
```

**Problems**:
- No URL validation
- Can access internal services (localhost, 127.0.0.1)
- Can access cloud metadata (169.254.169.254)
- Can access internal network ranges
- SSRF vulnerability

### After (Secure)
```typescript
// ✅ SECURE: Comprehensive SSRF protection
import { URL } from 'url';
import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';

// ✅ Allowlist of permitted domains
const ALLOWED_DOMAINS = new Set([
  'api.github.com',
  'api.example.com',
  'cdn.example.com',
]);

// ✅ Private IP ranges to block (CIDR notation)
const PRIVATE_IP_RANGES = [
  '127.0.0.0/8',    // Loopback
  '10.0.0.0/8',     // Private network
  '172.16.0.0/12',  // Private network
  '192.168.0.0/16', // Private network
  '169.254.0.0/16', // Link-local (includes metadata service)
  '::1/128',        // IPv6 loopback
  'fc00::/7',       // IPv6 private
  'fe80::/10',      // IPv6 link-local
];

// ✅ Known metadata endpoints to block
const METADATA_ENDPOINTS = [
  '169.254.169.254',           // AWS, Azure, GCP
  'metadata.google.internal',  // GCP
  'metadata.azure.com',        // Azure
];

function isPrivateIP(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);

    // Check against private ranges
    for (const range of PRIVATE_IP_RANGES) {
      const [rangeAddr, prefixLength] = range.split('/');
      const rangeIP = ipaddr.parse(rangeAddr);

      if (addr.kind() === rangeIP.kind()) {
        const cidr = ipaddr.parseCIDR(range);
        if (addr.match(cidr)) {
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    // If parsing fails, treat as suspicious
    return true;
  }
}

function validateURL(urlString: string): URL {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString);
  } catch (err) {
    throw new Error('Invalid URL format');
  }

  // ✅ Only allow http and https protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Protocol ${parsedUrl.protocol} not allowed. Use http or https.`);
  }

  // ✅ Check domain allowlist
  const hostname = parsedUrl.hostname.toLowerCase();

  if (!ALLOWED_DOMAINS.has(hostname)) {
    throw new Error(`Domain ${hostname} is not in allowlist`);
  }

  // ✅ Block known metadata endpoints
  if (METADATA_ENDPOINTS.includes(hostname)) {
    console.warn('SSRF attempt blocked: metadata endpoint', { hostname });
    throw new Error('Access to metadata endpoints is blocked');
  }

  // ✅ Block localhost variations
  const localhostVariations = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'];
  if (localhostVariations.includes(hostname)) {
    console.warn('SSRF attempt blocked: localhost access', { hostname });
    throw new Error('Access to localhost is blocked');
  }

  return parsedUrl;
}

async function validateIPAddress(hostname: string): Promise<void> {
  try {
    // ✅ Resolve hostname to IP addresses
    const addresses = await dns.resolve(hostname);

    // ✅ Check each resolved IP
    for (const ip of addresses) {
      if (isPrivateIP(ip)) {
        console.warn('SSRF attempt blocked: private IP', { hostname, ip });
        throw new Error(`Hostname resolves to private IP address: ${ip}`);
      }

      // ✅ Check for metadata service IP
      if (METADATA_ENDPOINTS.includes(ip)) {
        console.warn('SSRF attempt blocked: metadata IP', { hostname, ip });
        throw new Error('Access to metadata service blocked');
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('private IP')) {
      throw err;
    }
    // DNS resolution failed - could be transient, but safer to reject
    throw new Error(`DNS resolution failed for ${hostname}`);
  }
}

export async function proxy(urlString: string): Promise<string> {
  try {
    // ✅ Validate URL format and domain
    const parsedUrl = validateURL(urlString);

    // ✅ Validate resolved IP is not private
    await validateIPAddress(parsedUrl.hostname);

    // ✅ Fetch with security controls
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      // ✅ Disable automatic redirects
      redirect: 'error',
      headers: {
        'User-Agent': 'SecureApp/1.0',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // ✅ Limit response size to prevent DoS
    const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
    const contentLength = response.headers.get('content-length');

    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw new Error('Response size exceeds limit');
    }

    const text = await response.text();

    // ✅ Log successful request
    console.info('External request completed', {
      url: parsedUrl.hostname,
      status: response.status,
      size: text.length,
    });

    return text;
  } catch (err) {
    // ✅ Log SSRF attempt
    if (err instanceof Error) {
      console.error('SSRF prevention triggered', {
        url: urlString,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }

    // ✅ Generic error message
    throw new Error('Failed to fetch resource');
  }
}

// ✅ Alternative: Validate redirect target if redirects are enabled
async function validateRedirect(redirectUrl: string, originalUrl: URL): Promise<void> {
  const parsedRedirect = validateURL(redirectUrl);

  // ✅ Ensure redirect stays within allowed domains
  if (parsedRedirect.hostname !== originalUrl.hostname) {
    throw new Error('Redirects to different domains are not allowed');
  }

  // ✅ Validate redirect target IP
  await validateIPAddress(parsedRedirect.hostname);
}
```

---

## Common SSRF Attack Vectors

1. **Internal Services Access**
   - Attack: `http://localhost:8080/admin`
   - Fix: Block localhost and 127.0.0.1

2. **Cloud Metadata Access**
   - Attack: `http://169.254.169.254/latest/meta-data/`
   - Fix: Block 169.254.169.254 and metadata hostnames

3. **Private Network Scanning**
   - Attack: `http://192.168.1.1/config`
   - Fix: Block private IP ranges

4. **DNS Rebinding**
   - Attack: Domain resolves to public IP, then rebinds to private IP
   - Fix: Validate DNS resolution before each request

5. **Protocol Smuggling**
   - Attack: `file:///etc/passwd`, `gopher://internal-service`
   - Fix: Only allow http/https protocols

6. **URL Encoding Bypass**
   - Attack: `http://127.0.0.1` as `http://127.1` or `http://2130706433`
   - Fix: Parse and normalize URLs before validation

7. **Redirect Abuse**
   - Attack: Allowed domain redirects to internal service
   - Fix: Disable redirects or validate redirect targets

---

## IP Address Validation Examples

```typescript
// ✅ Test various IP formats
const testIPs = [
  '127.0.0.1',       // ✅ Blocked - loopback
  '10.0.0.1',        // ✅ Blocked - private
  '172.16.0.1',      // ✅ Blocked - private
  '192.168.1.1',     // ✅ Blocked - private
  '169.254.169.254', // ✅ Blocked - metadata
  '8.8.8.8',         // ✅ Allowed - public (if domain allowlisted)
  '1.1.1.1',         // ✅ Allowed - public (if domain allowlisted)
  '::1',             // ✅ Blocked - IPv6 loopback
  'fc00::1',         // ✅ Blocked - IPv6 private
];
```

---

## URL Validation Edge Cases

```typescript
// Test these URL formats - all should be blocked:
const dangerousURLs = [
  'http://localhost/admin',
  'http://127.0.0.1/internal',
  'http://127.1',                    // Alternative localhost format
  'http://0.0.0.0',                  // Localhost
  'http://[::1]/admin',              // IPv6 localhost
  'http://169.254.169.254/metadata', // AWS metadata
  'http://metadata.google.internal', // GCP metadata
  'http://192.168.1.1/router',       // Private network
  'file:///etc/passwd',              // File protocol
  'gopher://internal-service',       // Gopher protocol
  'http://evil.com@localhost',       // URL with embedded auth
];
```

---

## Testing Checklist

- [ ] Private IP ranges blocked (127.0.0.1, 10.*, 172.16-31.*, 192.168.*)
- [ ] Localhost variations blocked (localhost, 127.0.0.1, [::1])
- [ ] Cloud metadata endpoints blocked (169.254.169.254)
- [ ] Non-HTTP protocols rejected (file://, gopher://, ftp://)
- [ ] Domain allowlist enforced
- [ ] DNS resolution validated
- [ ] Request timeout enforced (5 seconds)
- [ ] Redirects disabled or validated
- [ ] SSRF attempts logged
- [ ] Tests verify all blocked URLs are rejected

---

## Defense in Depth

```typescript
// ✅ Multiple layers of SSRF protection

// Layer 1: URL validation
// - Protocol check (http/https only)
// - Domain allowlist

// Layer 2: DNS validation
// - Resolve hostname to IP
// - Check IP against private ranges

// Layer 3: Network controls
// - Firewall rules blocking egress to private IPs
// - Network segmentation (app server can't reach internal services)

// Layer 4: Request controls
// - Timeout (prevent slowloris)
// - Size limit (prevent DoS)
// - Disable redirects

// Layer 5: Monitoring
// - Log all external requests
// - Alert on suspicious patterns
```

---

## Network Segmentation Best Practices

```bash
# ✅ Firewall rules (iptables example)
# Block outbound connections to private IP ranges from app server

iptables -A OUTPUT -d 127.0.0.0/8 -j REJECT
iptables -A OUTPUT -d 10.0.0.0/8 -j REJECT
iptables -A OUTPUT -d 172.16.0.0/12 -j REJECT
iptables -A OUTPUT -d 192.168.0.0/16 -j REJECT
iptables -A OUTPUT -d 169.254.0.0/16 -j REJECT

# Allow only specific external destinations if needed
iptables -A OUTPUT -d 8.8.8.8 -p tcp --dport 443 -j ACCEPT
```

---

## Attack Scenarios to Prevent

```typescript
// Test these scenarios - all should be blocked:
const attackScenarios = [
  "Access AWS metadata service (169.254.169.254)",
  "Scan internal network (192.168.1.0/24)",
  "Access localhost services (localhost:8080)",
  "Read local files (file:///etc/passwd)",
  "DNS rebinding attack (public IP -> private IP)",
  "Redirect to internal service",
  "Protocol smuggling (gopher://, ftp://)",
];
```

---

## Additional Resources

- [OWASP A10:2021 - Server-Side Request Forgery](https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [PortSwigger SSRF Guide](https://portswigger.net/web-security/ssrf)
- [AWS IMDS v2 (SSRF mitigation)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
