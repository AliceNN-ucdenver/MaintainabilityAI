/**
 * llm-router — single entry point for every LLM hop in the runner.
 *
 * Picks the right provider client based on the brief's `llm_provider` and
 * the requested logical tier (`plan` for cheap structured-JSON work,
 * `synth` for higher-quality long-form synthesis). Translates the tier
 * into a provider-specific model name so node code never hard-codes a
 * model id.
 *
 * Returns a uniform result shape so plan_queries / synthesize_report can
 * use it without branching on provider in their own bodies.
 */
import type { LlmProvider } from '../schemas';
import { callAnthropic, type AnthropicModel } from './anthropic-client';
import { callGitHubModels, type GitHubModelsModel } from './github-models-client';

/**
 * Logical model tiers. Each is mapped to a concrete provider-specific id
 * inside the router. Keeping the surface this narrow avoids the runner
 * sprinkling model strings across nodes.
 */
export type LlmTier = 'plan' | 'synth';

/** Per-tier per-provider model id lookup. */
const MODEL_BY_TIER: Record<LlmTier, { anthropic: AnthropicModel; githubModels: GitHubModelsModel }> = {
  plan:  { anthropic: 'claude-haiku-4-5',  githubModels: 'openai/gpt-4o-mini' },
  synth: { anthropic: 'claude-sonnet-4-6', githubModels: 'openai/gpt-4.1' },
};

export interface CallLlmOpts {
  provider: LlmProvider;
  tier: LlmTier;
  /**
   * Anthropic API key (used when provider === 'anthropic'). For
   * 'github-models', leave undefined and supply `githubToken` instead.
   */
  anthropicApiKey?: string;
  /** GITHUB_TOKEN (used when provider === 'github-models'). */
  githubToken?: string;
  system?: string;
  prompt: string;
  maxTokens: number;
  temperature?: number;
  fetchImpl?: typeof fetch;
}

export interface CallLlmResult {
  provider: LlmProvider;
  /** The actual model id sent to the provider (e.g. `claude-haiku-4-5` or `openai/gpt-4o-mini`). */
  model: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  httpStatus: number;
}

export async function callLlm(opts: CallLlmOpts): Promise<CallLlmResult> {
  const tierModels = MODEL_BY_TIER[opts.tier];

  if (opts.provider === 'anthropic') {
    if (!opts.anthropicApiKey) {
      throw new Error(`callLlm: provider=anthropic requires anthropicApiKey (set ANTHROPIC_API_KEY).`);
    }
    const r = await callAnthropic({
      apiKey: opts.anthropicApiKey,
      model: tierModels.anthropic,
      system: opts.system,
      prompt: opts.prompt,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      fetchImpl: opts.fetchImpl,
    });
    return {
      provider: 'anthropic',
      model: tierModels.anthropic,
      text: r.text,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      costUsd: r.costUsd,
      httpStatus: r.httpStatus,
    };
  }

  if (opts.provider === 'github-models') {
    if (!opts.githubToken) {
      throw new Error(`callLlm: provider=github-models requires githubToken (set GITHUB_TOKEN; workflow needs \`permissions: models: read\`).`);
    }
    const r = await callGitHubModels({
      token: opts.githubToken,
      model: tierModels.githubModels,
      system: opts.system,
      prompt: opts.prompt,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      fetchImpl: opts.fetchImpl,
    });
    return {
      provider: 'github-models',
      model: tierModels.githubModels,
      text: r.text,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      costUsd: r.costUsd,
      httpStatus: r.httpStatus,
    };
  }

  throw new Error(`callLlm: provider "${opts.provider}" not yet implemented (phase 2c.1 ships anthropic + github-models; openai + azure-openai land later).`);
}
