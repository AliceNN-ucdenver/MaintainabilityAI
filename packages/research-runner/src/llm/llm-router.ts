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
import { callGitHubModels, type GitHubModelsModel } from './github-models-client';

/**
 * Logical model tiers. Each is mapped to a concrete provider-specific id
 * inside the router. Keeping the surface this narrow avoids the runner
 * sprinkling model strings across nodes.
 */
export type LlmTier = 'plan' | 'synth';

/**
 * Per-tier per-provider model id lookup. `githubModelsFallback` (when
 * present) is tried automatically on 401/403/404 from the primary —
 * how we let users with a GMT (Copilot-Pro user PAT) reach the
 * "custom"-tier `gpt-5-chat` while users on a workflow bot token
 * still work via the "low"-tier fallback.
 */
const MODEL_BY_TIER: Record<LlmTier, {
  githubModels: GitHubModelsModel;
  githubModelsFallback?: GitHubModelsModel;
}> = {
  // Plan tier — small structured-JSON output, one shot, fits any cap.
  // Try gpt-5-chat first (custom tier, only reachable with a Copilot-
  // enrolled PAT like GMT). Fall back to gpt-4.1-mini (low tier, works
  // on every token including the Actions bot). Empirically equivalent
  // output quality on the V3-anchor prompt — the upgrade is "if free,
  // why not"; the fallback keeps everyone working.
  plan: {
    githubModels: 'openai/gpt-5-chat',
    githubModelsFallback: 'openai/gpt-4.1-mini',
  },
  // Synth tier — 200K context, non-reasoning (verified live with
  // reasoning_tokens=0, finish_reason=stop). Picked over gpt-5 and
  // gpt-5-mini because those are reasoning models that consume the
  // completion budget on hidden chain-of-thought before producing any
  // visible markdown. Synth needs predictable structured output. No
  // fallback model here — synth runs on the agent side now (Copilot
  // Coding Agent), so the runner doesn't fire synth itself.
  synth: { githubModels: 'openai/gpt-5-chat' },
};

export interface CallLlmOpts {
  provider: LlmProvider;
  tier: LlmTier;
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

/**
 * GitHub Models returns these statuses when the token can't reach the
 * requested model or is being throttled. All recoverable via the
 * github-models→github-models fallback (custom-tier → low-tier).
 *
 *   401 / 403 — token lacks `models:read` or hasn't been enrolled in
 *               the custom tier (workflow bot vs Copilot PAT)
 *   404      — model id not visible to this token tier
 *   429      — rate limited on the primary tier; the low-tier model
 *              has its own bucket so the fallback often succeeds
 *
 * Everything else (timeouts, 5xx, 413 token cap, parse errors)
 * propagates — those are not "wrong model" problems.
 */
function isModelAccessError(err: unknown): boolean {
  if (!(err instanceof Error)) { return false; }
  return /GitHub Models returned (?:401|403|404|429):/.test(err.message);
}

async function callGitHubModelsTier(
  opts: CallLlmOpts,
  tierModels: { githubModels: GitHubModelsModel; githubModelsFallback?: GitHubModelsModel },
): Promise<CallLlmResult> {
  if (!opts.githubToken) {
    throw new Error(`callLlm: provider=github-models requires githubToken (set GITHUB_TOKEN; workflow needs \`permissions: models: read\`).`);
  }
  const callOne = async (model: GitHubModelsModel): Promise<CallLlmResult> => {
    const r = await callGitHubModels({
      token: opts.githubToken!,
      model,
      system: opts.system,
      prompt: opts.prompt,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      fetchImpl: opts.fetchImpl,
    });
    return {
      provider: 'github-models',
      model,
      text: r.text,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      costUsd: r.costUsd,
      httpStatus: r.httpStatus,
    };
  };
  try {
    return await callOne(tierModels.githubModels);
  } catch (err) {
    if (tierModels.githubModelsFallback && isModelAccessError(err)) {
      const cause = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[research-runner] ⚠ github-models ${tierModels.githubModels} access-denied, falling back to ${tierModels.githubModelsFallback}. Cause: ${cause.slice(0, 200)}\n`);
      return await callOne(tierModels.githubModelsFallback);
    }
    throw err;
  }
}

export async function callLlm(opts: CallLlmOpts): Promise<CallLlmResult> {
  const tierModels = MODEL_BY_TIER[opts.tier];

  // GitHub Models is the only wired provider. The github-models→github-models
  // fallback (custom-tier → low-tier) lives in callGitHubModelsTier. The
  // Anthropic provider + its cross-provider fallback were retired (Cheshire v2)
  // — research routes entirely through GitHub Models / Copilot.
  if (opts.provider === 'github-models') {
    return await callGitHubModelsTier(opts, tierModels);
  }

  throw new Error(`callLlm: provider "${opts.provider}" not yet implemented (github-models is the only wired provider; openai + azure-openai land later).`);
}
