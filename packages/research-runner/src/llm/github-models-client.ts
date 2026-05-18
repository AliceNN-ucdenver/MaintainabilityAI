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
 * `openai/gpt-4o-mini`, `anthropic/claude-3-5-sonnet`. The router (in
 * llm-router.ts) maps internal logical model tiers (`plan` / `synth`) to
 * the concrete provider-specific id.
 */

/** Subset of GitHub Models model ids we use. Extend as new tiers land. */
export type GitHubModelsModel =
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'anthropic/claude-3-5-sonnet'
  | 'anthropic/claude-3-5-haiku';

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);

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
