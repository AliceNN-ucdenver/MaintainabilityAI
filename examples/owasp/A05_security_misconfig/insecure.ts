/**
 * A05 Security Misconfiguration — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

// Insecure: permissive CORS & verbose errors
export function corsConfig() {
  return { origin: '*', exposeHeaders: ['X-Stack-Trace'] };
}
