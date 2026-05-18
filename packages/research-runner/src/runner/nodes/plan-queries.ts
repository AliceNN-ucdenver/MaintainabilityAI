/**
 * plan_queries — LLM node.
 *
 * Loads `.caterpillar/prompts/research/query-plan.md`, fills placeholders
 * from the ResearchBrief + MeshContext, calls Anthropic with `output-format:
 * json-only` semantics, then validates the response against the QueryPlan
 * schema. On validation failure, one retry with a clarifying nudge before
 * surfacing the error to the orchestrator.
 *
 * Returns the validated QueryPlan plus the LLM telemetry the audit emitter
 * needs to write a complete `llm` event.
 */
import { z } from 'zod';
import {
  type LlmProvider,
  type MeshContext,
  type QueryPlan,
  QueryPlan as QueryPlanSchema,
  type ResearchBrief,
} from '../../schemas';
import { callLlm } from '../../llm/llm-router';
import { loadPrompt, type LoadedPrompt } from '../../mesh/prompt-loader';

export interface PlanQueriesOpts {
  meshDir: string;
  brief: ResearchBrief;
  meshContext: MeshContext;
  /** Provider routing — comes from brief.llm_provider unless overridden. */
  provider?: LlmProvider;
  /** Required when provider === 'anthropic'. */
  anthropicApiKey?: string;
  /** Required when provider === 'github-models'. */
  githubToken?: string;
  fetchImpl?: typeof fetch;
}

export interface PlanQueriesResult {
  queryPlan: QueryPlan;
  prompt: LoadedPrompt;
  llm: {
    provider: LlmProvider;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    /** How many LLM calls we ended up making (1 happy path, 2 on retry). */
    attempts: number;
  };
}

export async function planQueries(opts: PlanQueriesOpts): Promise<PlanQueriesResult> {
  const provider = opts.provider ?? opts.brief.llm_provider;

  const promptContext = buildPromptContext(opts.brief, opts.meshContext);
  const prompt = loadPrompt({
    meshDir: opts.meshDir,
    packId: 'research/query-plan',
    context: promptContext,
  });

  const baseSystem = 'You output a SINGLE JSON object exactly matching the schema described. No prose before or after, no markdown fence. The first character of your response MUST be `{`.';

  let lastError: string | null = null;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let lastModel = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    const userPrompt = attempt === 1
      ? prompt.filled
      : `${prompt.filled}\n\n---\n\nYour previous response failed validation:\n${lastError}\n\nReturn a SINGLE JSON object with exactly 4 keys (web, arxiv, patent, community) and the exact counts (5, 3, 3, 3) requested. Web queries MUST contain a 4-digit year; patent queries MUST contain the literal token "AND".`;

    const result = await callLlm({
      provider,
      tier: 'plan',
      anthropicApiKey: opts.anthropicApiKey,
      githubToken: opts.githubToken,
      system: baseSystem,
      prompt: userPrompt,
      maxTokens: 2000,
      fetchImpl: opts.fetchImpl,
    });

    totalInput += result.inputTokens;
    totalOutput += result.outputTokens;
    totalCost += result.costUsd;
    lastModel = result.model;

    const parsed = parseQueryPlanResponse(result.text);
    if (parsed.success) {
      return {
        queryPlan: parsed.data,
        prompt,
        llm: { provider, model: lastModel, inputTokens: totalInput, outputTokens: totalOutput, costUsd: totalCost, attempts: attempt },
      };
    }
    lastError = parsed.error;
  }

  throw new Error(`plan_queries: LLM output failed QueryPlan validation after 2 attempts. Last error: ${lastError}`);
}

/** Walk the response, extract the first JSON object, validate against QueryPlan. */
function parseQueryPlanResponse(raw: string): { success: true; data: QueryPlan } | { success: false; error: string } {
  const trimmed = raw.trim();
  // Tolerate the model wrapping the JSON in ```json ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  let parsedJson: unknown;
  try { parsedJson = JSON.parse(candidate); }
  catch (e) { return { success: false, error: `not valid JSON: ${e instanceof Error ? e.message : String(e)}` }; }

  const result = QueryPlanSchema.safeParse(parsedJson);
  if (result.success) { return { success: true, data: result.data }; }
  return { success: false, error: result.error.issues.map(formatIssue).join('; ') };
}

function formatIssue(issue: z.ZodIssue): string {
  return `${issue.path.join('.') || '<root>'}: ${issue.message}`;
}

/** Project the inputs the prompt asks for into a flat-dotted shape. */
function buildPromptContext(brief: ResearchBrief, mesh: MeshContext): Record<string, unknown> {
  const calmSummary = mesh.bar?.calm_model ? summarizeCalmModel(mesh.bar.calm_model) : '(no CALM model loaded)';
  const threatsSummary = mesh.bar?.threats ? summarizeThreats(mesh.bar.threats) : '(no threat model on file)';
  const relatedResearch = mesh.bar?.related_research?.length
    ? mesh.bar.related_research.map(r => r.topic)
    : [];
  return {
    brief: {
      topic: brief.topic,
      scope_level: brief.scope.level,
    },
    mesh: {
      bar: {
        name: mesh.bar?.name ?? '(no bar in scope)',
        calm_summary: calmSummary,
        threats_summary: threatsSummary,
      },
      related_research: relatedResearch,
    },
  };
}

function summarizeCalmModel(calm: unknown): string {
  if (!calm || typeof calm !== 'object') { return '(no CALM model loaded)'; }
  const obj = calm as { nodes?: unknown[]; relationships?: unknown[] };
  const nodeCount = Array.isArray(obj.nodes) ? obj.nodes.length : 0;
  const relCount = Array.isArray(obj.relationships) ? obj.relationships.length : 0;
  const nodeKinds = Array.isArray(obj.nodes)
    ? Array.from(new Set(obj.nodes.map(n => (n as { 'node-type'?: string })['node-type'] || 'unknown'))).join(', ')
    : '';
  return `${nodeCount} node(s) [${nodeKinds || 'no node-types'}], ${relCount} relationship(s)`;
}

function summarizeThreats(threats: unknown): string {
  if (!Array.isArray(threats)) { return '(no threats)'; }
  if (threats.length === 0) { return '(no threats)'; }
  const byCategory: Record<string, number> = {};
  for (const t of threats) {
    const cat = (t as { category?: string }).category || 'unknown';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }
  return Object.entries(byCategory).map(([c, n]) => `${c} × ${n}`).join(', ');
}
