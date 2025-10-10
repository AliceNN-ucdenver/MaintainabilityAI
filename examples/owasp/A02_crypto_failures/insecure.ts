/**
 * A02 Crypto Failures — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

// Insecure: "encrypting" with base64, storing key inline
export function weakEncrypt(data: string): string {
  const key = "hardcoded-key-123"; // BAD
  return Buffer.from(data + key).toString('base64');
}
