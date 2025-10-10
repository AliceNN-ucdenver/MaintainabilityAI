/**
 * A08 Integrity Failures — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

// Insecure: accepts unsigned plugins from network
export async function loadPlugin(name: string) {
  const url = `https://cdn.example.com/plugins/${name}.js`;
  const code = await (await fetch(url)).text();
  // no signature validation
  return code;
}
