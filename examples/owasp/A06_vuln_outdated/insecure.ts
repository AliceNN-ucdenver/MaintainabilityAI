/**
 * A06 Vulnerable/Outdated — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

// Insecure: fetches unpinned, unverified remote script at runtime
export async function loadRemoteCode(url: string) {
  const res = await fetch(url);
  // eval is dangerous
  eval(await res.text());
}
