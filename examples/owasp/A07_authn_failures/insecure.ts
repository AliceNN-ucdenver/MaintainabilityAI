/**
 * A07 AuthN Failures — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

// Insecure: plaintext password compare, weak policy
export function login(userPass: string, input: string) {
  if (input == userPass) return true; // timing leak & plaintext storage
  return false;
}
