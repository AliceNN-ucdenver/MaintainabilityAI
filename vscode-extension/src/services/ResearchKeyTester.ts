import type { ResearchSecretId } from './SecretsService';
import { logger } from '../utils/Logger';

/**
 * Validates research-pipeline API keys against their providers with a minimal
 * live call. Used by the Looking Glass Settings UI's per-key "Test" buttons.
 *
 * Each test:
 *   - issues a single low-cost request (smallest model / smallest response)
 *   - reports `ok: false` with a human-readable message on auth failure,
 *     network failure, or unexpected response shape
 *   - never throws — all errors are converted into `KeyTestResult`
 *
 * Uses Node 18+ global `fetch`.
 */

export interface KeyTestResult {
  ok: boolean;
  message: string;
  /** HTTP status returned by the provider, when applicable. */
  status?: number;
}

const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function testResearchKey(id: ResearchSecretId, key: string): Promise<KeyTestResult> {
  if (!key || key.trim().length === 0) {
    return { ok: false, message: 'No key configured.' };
  }
  try {
    switch (id) {
      case 'tavily':                 return await testTavily(key);
      case 'uspto':                  return await testUspto(key);
      case 'huggingface':            return await testHuggingface(key);
      case 'governance-mesh-token':  return await testGovernanceMeshToken(key);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`testResearchKey(${id}) failed: ${message}`);
    return { ok: false, message: `Network error: ${message}` };
  }
}

async function testGovernanceMeshToken(key: string): Promise<KeyTestResult> {
  // Hit /user — every valid GitHub PAT/GHA token returns 200 here.
  // Fails fast on a bad token without consuming any quota meaningfully.
  const res = await fetchWithTimeout('https://api.github.com/user', {
    method: 'GET',
    headers: {
      authorization: `Bearer ${key}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
  });
  if (res.ok) { return { ok: true, message: 'GitHub token valid. Verify it has Issues=write on each linked code repo (needed for POST /repos/.../issues).', status: res.status }; }
  if (res.status === 401) { return { ok: false, message: 'GitHub rejected the token (401 unauthorized).', status: 401 }; }
  if (res.status === 403) { return { ok: false, message: 'GitHub token lacks permissions (403 — needs at least read access).', status: 403 }; }
  return { ok: false, message: `GitHub returned ${res.status}.`, status: res.status };
}

const USPTO_ENDPOINT = 'https://api.uspto.gov/api/v1/patent/applications/search';

async function testUspto(key: string): Promise<KeyTestResult> {
  // USPTO Open Data Portal REST. Mirrors the runner's uspto-client.ts
  // and the NCMS archeologist_agent.py reference: GET with X-API-Key
  // (capital K) and the query as a URL-encoded q= param.
  //
  // The probe wraps its own fetch in a focused try/catch so we can surface
  // the underlying `error.cause` (DNS failure, TLS issue, firewall, etc.)
  // instead of the generic `fetch failed` from undici's wrapper.
  const probeUrl = `${USPTO_ENDPOINT}?q=${encodeURIComponent('method')}&limit=1&offset=0`;
  let res: Response;
  try {
    res = await fetchWithTimeout(probeUrl, {
      method: 'GET',
      headers: { 'X-API-Key': key, accept: 'application/json' },
    });
  } catch (err) {
    return { ok: false, message: describeFetchFailure(err, USPTO_ENDPOINT) };
  }
  if (res.ok) { return { ok: true, message: 'USPTO ODP key valid (api.uspto.gov).', status: res.status }; }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: 'USPTO ODP rejected the key (auth failed).', status: res.status };
  }
  if (res.status === 429) {
    return { ok: false, message: 'USPTO ODP rate-limited the probe (429). Key may still be valid; try again later.', status: 429 };
  }
  let bodySnippet = '';
  try { bodySnippet = (await res.text()).slice(0, 240); } catch { /* ignore */ }
  return { ok: false, message: `USPTO ODP returned ${res.status}${bodySnippet ? `: ${bodySnippet}` : ''}.`, status: res.status };
}

/**
 * Turn a fetch failure into a human-readable diagnostic. Undici wraps the
 * real network error in `error.cause`; the top-level message is usually
 * just "fetch failed". Extract the cause's code + message so users see
 * what's actually broken (DNS, TLS, firewall, host unreachable, ...).
 */
function describeFetchFailure(err: unknown, url: string): string {
  const top = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cause = (err as any)?.cause;
  if (cause) {
    const causeMsg = cause instanceof Error ? cause.message : String(cause);
    const causeCode = (cause as { code?: string })?.code;
    const detail = causeCode ? `${causeCode}: ${causeMsg}` : causeMsg;
    return `Network error reaching ${url} — ${detail}`;
  }
  return `Network error reaching ${url} — ${top}`;
}

async function testHuggingface(key: string): Promise<KeyTestResult> {
  // /api/whoami-v2 validates the token itself. A valid token can STILL 403 on
  // the gated Llama Prompt Guard 2 model until the account accepts its license,
  // so this probe verifies the token only and the success message flags that
  // second requirement explicitly (the cert/rail surfaces the actual 403).
  const res = await fetchWithTimeout('https://huggingface.co/api/whoami-v2', {
    method: 'GET',
    headers: { authorization: `Bearer ${key}` },
  });
  if (res.ok) {
    return { ok: true, message: 'Hugging Face token valid. Ensure your account has ACCEPTED the model license at huggingface.co/meta-llama/Llama-Prompt-Guard-2-86M — a valid token still 403s on the gated model until then.', status: res.status };
  }
  if (res.status === 401) { return { ok: false, message: 'Hugging Face rejected the token (401 unauthorized).', status: 401 }; }
  if (res.status === 403) { return { ok: false, message: 'Hugging Face token lacks permissions (403).', status: 403 }; }
  return { ok: false, message: `Hugging Face returned ${res.status}.`, status: res.status };
}

async function testTavily(key: string): Promise<KeyTestResult> {
  const res = await fetchWithTimeout('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query: 'ping',
      max_results: 1,
      search_depth: 'basic',
    }),
  });
  if (res.ok) { return { ok: true, message: 'Tavily key valid.', status: res.status }; }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: 'Tavily rejected the key (auth failed).', status: res.status };
  }
  if (res.status === 432) {
    return { ok: false, message: 'Tavily account out of credits.', status: 432 };
  }
  return { ok: false, message: `Tavily returned ${res.status}.`, status: res.status };
}
