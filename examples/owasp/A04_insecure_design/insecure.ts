/**
 * A04 Insecure Design — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

// Insecure: predictable password reset tokens
export function generateResetToken(email: string) {
  return email + Date.now(); // predictable & guessable
}
