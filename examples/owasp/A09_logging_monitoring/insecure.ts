/**
 * A09 Logging & Monitoring — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

// Insecure: logs secrets & PII, no rate-limit metrics
export function logLogin(email: string, password: string) {
  console.log('LOGIN', { email, password }); // BAD
}
