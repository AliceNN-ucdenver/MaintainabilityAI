import { weakEncrypt } from '../insecure';

describe('A02 Cryptographic Failures', () => {
  it('should demonstrate weak encryption (to be fixed)', () => {
    const encrypted = weakEncrypt('sensitive-data');
    // Insecure: base64 is encoding, not encryption
    // After remediation, this should use proper crypto (AES-256-GCM, bcrypt for passwords)
    expect(encrypted).toBeDefined();
  });

  it('should not use hardcoded keys (to be fixed)', () => {
    const result1 = weakEncrypt('test');
    const result2 = weakEncrypt('test');
    // After remediation, expect proper key management (env vars, key vault)
    expect(result1).toBe(result2); // demonstrates deterministic weakness
  });
});
