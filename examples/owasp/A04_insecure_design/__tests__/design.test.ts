import { generateResetToken } from '../insecure';

describe('A04 Insecure Design', () => {
  it('should demonstrate predictable token generation (to be fixed)', () => {
    const token1 = generateResetToken('user@example.com');
    const token2 = generateResetToken('user@example.com');
    // Insecure: tokens are predictable and guessable
    // After remediation, use cryptographically secure random tokens with expiry
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2); // even this weak impl creates different tokens
  });

  it('should not expose email in token (to be fixed)', () => {
    const email = 'victim@example.com';
    const token = generateResetToken(email);
    // After remediation, tokens should not contain PII
    expect(token).toContain(email); // demonstrates the leak
  });
});
