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
      case 'anthropic':              return await testAnthropic(key);
      case 'openai':                 return await testOpenai(key);
      case 'tavily':                 return await testTavily(key);
      case 'uspto':                  return { ok: true, message: 'USPTO key configured (no live test — pipeline degrades gracefully if invalid).' };
      case 'governance-mesh-token':  return await testGovernanceMeshToken(key);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`testResearchKey(${id}) failed: ${message}`);
    return { ok: false, message: `Network error: ${message}` };
  }
}

async function testAnthropic(key: string): Promise<KeyTestResult> {
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  });
  if (res.ok) { return { ok: true, message: 'Anthropic key valid.', status: res.status }; }
  if (res.status === 401) { return { ok: false, message: 'Anthropic rejected the key (401 unauthorized).', status: 401 }; }
  if (res.status === 403) { return { ok: false, message: 'Anthropic key lacks permissions (403).', status: 403 }; }
  return { ok: false, message: `Anthropic returned ${res.status}.`, status: res.status };
}

async function testOpenai(key: string): Promise<KeyTestResult> {
  const res = await fetchWithTimeout('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: { 'authorization': `Bearer ${key}` },
  });
  if (res.ok) { return { ok: true, message: 'OpenAI key valid.', status: res.status }; }
  if (res.status === 401) { return { ok: false, message: 'OpenAI rejected the key (401 unauthorized).', status: 401 }; }
  return { ok: false, message: `OpenAI returned ${res.status}.`, status: res.status };
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
  if (res.ok) { return { ok: true, message: 'GitHub token valid. Verify it has actions:write on code repos + contents:read on mesh.', status: res.status }; }
  if (res.status === 401) { return { ok: false, message: 'GitHub rejected the token (401 unauthorized).', status: 401 }; }
  if (res.status === 403) { return { ok: false, message: 'GitHub token lacks permissions (403 — needs at least read access).', status: 403 }; }
  return { ok: false, message: `GitHub returned ${res.status}.`, status: res.status };
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
