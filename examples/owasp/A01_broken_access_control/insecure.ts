/**
 * A01 Broken Access Control — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

// No auth check at all — IDOR risk
export function getUserDocument(userId: string, docOwnerId: string) {
  // Insecure: returns data regardless of ownership
  return { owner: docOwnerId, content: "secret data" };
}
