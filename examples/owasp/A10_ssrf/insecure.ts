/**
 * A10 SSRF — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

// Insecure: fetches arbitrary URLs from user input
export async function proxy(url: string) {
  const res = await fetch(url);
  return await res.text();
}
