import { login } from '../insecure';

describe('A07 Identification and Authentication Failures', () => {
  it('should demonstrate plaintext password comparison (to be fixed)', () => {
    const storedPassword = 'password123';
    const result = login(storedPassword, 'password123');
    // Insecure: plaintext storage and comparison
    // After remediation, use bcrypt/argon2 with salt
    expect(result).toBe(true);
  });

  it('should demonstrate timing attack vulnerability (to be fixed)', () => {
    // Insecure: uses == which can leak timing information
    // After remediation, use constant-time comparison
    const result1 = login('secret', 'wrong');
    const result2 = login('secret', 'secre');
    expect(result1).toBe(false);
    expect(result2).toBe(false);
  });

  it('should enforce password policy (to be fixed)', () => {
    // After remediation, enforce:
    // - Min 12 chars
    // - Complexity requirements
    // - No common passwords (check against breach database)
    // - Rate limiting on login attempts
    // - MFA support
    const weakPassword = '123';
    expect(weakPassword.length).toBeLessThan(12); // demonstrates weakness
  });
});
