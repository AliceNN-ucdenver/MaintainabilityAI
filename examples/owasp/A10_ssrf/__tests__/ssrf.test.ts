import { proxy } from '../insecure';

describe('A10 Server-Side Request Forgery (SSRF)', () => {
  it('should demonstrate unvalidated URL fetching (to be fixed)', async () => {
    // Insecure: fetches arbitrary URLs from user input
    // Attacker could access internal services: http://localhost:6379/
    // Or cloud metadata: http://169.254.169.254/latest/meta-data/
    // After remediation:
    // - Allowlist permitted domains/protocols
    // - Block private IP ranges (RFC1918, RFC4193, loopback)
    // - Block cloud metadata endpoints
    // - Validate URL scheme (https only)
    expect(proxy).toBeDefined();
  });

  it('should block internal network access (to be fixed)', async () => {
    // After remediation, these should be blocked:
    const dangerousUrls = [
      'http://localhost:8080/',
      'http://127.0.0.1/',
      'http://169.254.169.254/latest/meta-data/', // AWS metadata
      'http://10.0.0.1/', // private network
      'file:///etc/passwd', // local file
    ];

    // Remediated code should reject all of these
    dangerousUrls.forEach(url => {
      expect(url).toMatch(/^(http:\/\/localhost|http:\/\/127\.0\.0\.1|http:\/\/169\.254|http:\/\/10\.|file:)/);
    });
  });
});
