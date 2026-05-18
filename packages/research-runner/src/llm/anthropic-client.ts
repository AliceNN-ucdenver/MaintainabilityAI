/**
 * anthropic-client — minimal `fetch`-based wrapper around Anthropic's
 * `/v1/messages` endpoint. Returns the LLM telemetry shape the audit
 * emitter wants.
 *
 * Why not the official SDK? Three reasons:
 *   1. Smaller install (~300kb saved)
 *   2. The runner needs to support multiple providers (anthropic, openai,
 *      azure-openai) and a uniform `fetch`-based abstraction keeps the
 *      switch deterministic and testable.
 *   3. Dependency-injecting `fetch` makes mocking trivial in node:test.
 */

export type AnthropicModel =
  | 'claude-haiku-4-5'      // cheap; plan_queries default
  | 'claude-sonnet-4-6'     // mid; synthesis default
  | 'claude-opus-4-7';      // expensive; reserved for hard cases

export interface CallAnthropicOpts {
  apiKey: string;
  model: AnthropicModel;
  /** Optional system prompt (instructions that bypass user-message framing). */
  system?: string;
  /** The user-message body — typically the filled prompt pack content. */
  prompt: string;
  /** Hard ceiling on response tokens. */
  maxTokens: number;
  /** Sampling temperature 0-1. Default 0 for deterministic shape. */
  temperature?: number;
  /** Test injection point; defaults to globalThis.fetch. */
  fetchImpl?: typeof fetch;
  /** Abort timeout (ms). Default 60s. */
  timeoutMs?: number;
}

export interface CallAnthropicResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** USD cost estimate from public pricing (haiku ~$0.25/$1.25, sonnet ~$3/$15, opus ~$15/$75 per Mtok). */
  costUsd: number;
  /** Anthropic HTTP status (200 on success). */
  httpStatus: number;
}

const PRICING: Record<AnthropicModel, { inputPerMtok: number; outputPerMtok: number }> = {
  'claude-haiku-4-5':  { inputPerMtok: 0.25, outputPerMtok: 1.25 },
  'claude-sonnet-4-6': { inputPerMtok: 3.00, outputPerMtok: 15.00 },
  'claude-opus-4-7':   { inputPerMtok: 15.00, outputPerMtok: 75.00 },
};

export async function callAnthropic(opts: CallAnthropicOpts): Promise<CallAnthropicResult> {
  if (!opts.apiKey) {
    throw new Error('ANTHROPIC_API_KEY missing — set the env var or pass apiKey directly');
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  // Sonnet at ~50–80 tok/s × 8K output = 100–160s, plus prompt-processing.
  // 120s aborted real synth runs mid-stream; 240s gives headroom for
  // slow days. (Real fix is streaming so the connection stays alive,
  // but the cost/benefit isn't worth it yet — single-shot is fine
  // until we hit 240s legitimately.)
  const timeoutMs = opts.timeoutMs ?? 240_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': opts.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature ?? 0,
        ...(opts.system ? { system: opts.system } : {}),
        messages: [{ role: 'user', content: opts.prompt }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Anthropic request timed out after ${timeoutMs}ms (model=${opts.model}, max_tokens=${opts.maxTokens})`);
    }
    throw new Error(`Anthropic fetch failed (model=${opts.model}): ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }

  const httpStatus = response.status;
  if (!response.ok) {
    const body = await safeText(response);
    throw new Error(`Anthropic returned ${httpStatus}: ${body.slice(0, 400)}`);
  }

  const data = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text = (data.content ?? [])
    .filter(b => b.type === 'text')
    .map(b => b.text ?? '')
    .join('');
  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;
  const pricing = PRICING[opts.model];
  const costUsd =
    (inputTokens / 1_000_000) * pricing.inputPerMtok +
    (outputTokens / 1_000_000) * pricing.outputPerMtok;

  return { text, inputTokens, outputTokens, costUsd, httpStatus };
}

async function safeText(r: Response): Promise<string> {
  try { return await r.text(); } catch { return ''; }
}
