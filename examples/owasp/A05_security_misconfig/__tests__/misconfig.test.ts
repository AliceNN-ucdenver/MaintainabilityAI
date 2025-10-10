import { corsConfig } from '../insecure';

describe('A05 Security Misconfiguration', () => {
  it('should demonstrate overly permissive CORS (to be fixed)', () => {
    const config = corsConfig();
    // Insecure: accepts requests from any origin
    // After remediation, use explicit allowlist of trusted origins
    expect(config.origin).toBe('*');
  });

  it('should not expose sensitive headers (to be fixed)', () => {
    const config = corsConfig();
    // Insecure: exposes stack traces to clients
    // After remediation, remove debug headers in production
    expect(config.exposeHeaders).toContain('X-Stack-Trace');
  });
});
