/**
 * github-models-client — fetch-based wrapper around the GitHub Models
 * inference endpoint (`https://models.github.ai/inference/chat/completions`).
 *
 * The endpoint is OpenAI-compatible: standard `messages` array, `model`,
 * `max_tokens`, `temperature`. Authentication is the workflow's GITHUB_TOKEN
 * with `permissions: models: read` — no separate API key as a repo secret.
 *
 * Returns the same telemetry shape as callAnthropic so plan_queries /
 * synthesize_report can route through either client without branching on
 * their result types.
 *
 * Model names use GitHub Models namespacing — e.g. `openai/gpt-4o`,
 * `openai/gpt-4o-mini`, `openai/gpt-5-mini`. The router (in
 * llm-router.ts) maps internal logical model tiers (`plan` / `synth`) to
 * the concrete provider-specific id.
 */

/**
 * Subset of GitHub Models model ids we use. Extend as new tiers land.
 *
 * GitHub Models has two relevant rate-limit tiers:
 *   - "high" — gpt-4o, gpt-4o-mini, gpt-4.1 etc. Per-request input is
 *     capped at ~8K tokens regardless of subscription. Fine for our
 *     plan-tier (small structured-JSON prompt).
 *   - "custom" — gpt-5 family, o-series. Per-request input scales to
 *     the model's advertised limit (200K for gpt-5-mini). Routed through
 *     Copilot-billed access, so the token-owner needs Copilot.
 *
 * Synth tier uses gpt-5-mini for the larger context window. Anthropic
 * remains the preferred synth target when an Anthropic key is set (see
 * llm-router.ts hybrid routing).
 */
export type GitHubModelsModel =
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'openai/gpt-4.1'
  | 'openai/gpt-4.1-mini'
  | 'openai/gpt-5'
  | 'openai/gpt-5-mini';

export interface CallGitHubModelsOpts {
  /** Workflow GITHUB_TOKEN. The model server checks the `models:read` permission scope. */
  token: string;
  model: GitHubModelsModel;
  system?: string;
  prompt: string;
  maxTokens: number;
  temperature?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Override the endpoint (for Azure-routed Models or test environments). */
  endpoint?: string;
}

export interface CallGitHubModelsResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /**
   * GitHub Models billing is opaque to the caller — pricing is org/quota
   * driven, not per-token-published. We report 0 so the audit envelope
   * stays well-typed; reviewers see `provider: github-models` and know to
   * check the GitHub billing surface for the actual spend.
   */
  costUsd: number;
  httpStatus: number;
}

const DEFAULT_ENDPOINT = 'https://models.github.ai/inference/chat/completions';

export async function callGitHubModels(opts: CallGitHubModelsOpts): Promise<CallGitHubModelsResult> {
  if (!opts.token) {
    throw new Error('GITHUB_TOKEN missing — `permissions: models: read` is required on the workflow');
  }
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
  // Synthesis prompts can produce 8K-token responses (and the "custom"
  // tier models like gpt-5-mini can return much more), which routinely
  // take 60–120s. Default to 120s so we don't abort mid-stream.
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (opts.system) { messages.push({ role: 'system', content: opts.system }); }
  messages.push({ role: 'user', content: opts.prompt });

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${opts.token}`,
        'content-type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature ?? 0,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`GitHub Models request timed out after ${timeoutMs}ms (model=${opts.model}, max_tokens=${opts.maxTokens})`);
    }
    throw new Error(`GitHub Models fetch failed (model=${opts.model}): ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }

  const httpStatus = response.status;
  if (!response.ok) {
    const body = await safeText(response);
    throw new Error(`GitHub Models returned ${httpStatus}: ${body.slice(0, 400)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = data.choices?.[0]?.message?.content ?? '';
  return {
    text,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    costUsd: 0,
    httpStatus,
  };
}

async function safeText(r: Response): Promise<string> {
  try { return await r.text(); } catch { return ''; }
}
