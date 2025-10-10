import { loadRemoteCode } from '../insecure';

describe('A06 Vulnerable and Outdated Components', () => {
  it('should demonstrate unsafe remote code loading (to be fixed)', async () => {
    // This test documents the vulnerability but doesn't execute eval
    // Insecure: loads and executes arbitrary remote code
    // After remediation:
    // - Pin dependencies with lockfiles
    // - Verify integrity with SRI/checksums
    // - Never use eval() with remote content
    // - Use Snyk/Dependabot for vulnerability scanning
    expect(loadRemoteCode).toBeDefined();
  });

  it('should require integrity checks (to be fixed)', async () => {
    // After remediation, verify that:
    // - package-lock.json exists and is committed
    // - npm audit shows no critical vulnerabilities
    // - Subresource Integrity (SRI) used for CDN assets
    expect(true).toBe(true); // placeholder for actual integrity verification
  });
});
