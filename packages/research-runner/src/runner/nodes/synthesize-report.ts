/**
 * synthesize_report — LLM node.
 *
 * Second LLM hop in the archeologist research path. Loads
 * `.caterpillar/prompts/research/synthesis.md`, fills it with the brief +
 * mesh context + ranked sources + gap_analysis flag, calls Anthropic
 * (sonnet by default — synthesis is more demanding than planning),
 * runs the structural validator on the body, and either returns the
 * validated body or retries once with feedback.
 *
 * Returns the synthesised body, the prompt-pack telemetry (path + sha256),
 * LLM token/cost totals, and the citation_stats the audit log + Hatter's
 * Tag both consume.
 */
import type {
  LlmProvider,
  MeshContext,
  RankedSource,
  ResearchBrief,
} from '../../schemas';
import { callLlm } from '../../llm/llm-router';
import { loadPrompt, type LoadedPrompt } from '../../mesh/prompt-loader';
import {
  validateSynthesis,
  type CitationStats,
  type ValidationReport,
} from './synthesis-validator';

export interface SynthesizeReportOpts {
  meshDir: string;
  brief: ResearchBrief;
  meshContext: MeshContext;
  rankedSources: RankedSource[];
  /** Provider routing — comes from brief.llm_provider unless overridden. */
  provider?: LlmProvider;
  /** Required when provider === 'anthropic'. */
  anthropicApiKey?: string;
  /** Required when provider === 'github-models'. */
  githubToken?: string;
  /** Phase 2d will flip this when gap-analysis ran; left false for 2c. */
  gapAnalysisRan?: boolean;
  fetchImpl?: typeof fetch;
}

export interface SynthesizeReportResult {
  body_md: string;
  prompt: LoadedPrompt;
  validation: ValidationReport;
  citation_stats: CitationStats;
  llm: {
    provider: LlmProvider;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    attempts: number;
  };
}

const MAX_TOKENS = 8000;

export async function synthesizeReport(opts: SynthesizeReportOpts): Promise<SynthesizeReportResult> {
  const provider = opts.provider ?? opts.brief.llm_provider;
  const promptContext = buildPromptContext(opts.brief, opts.meshContext, opts.rankedSources, opts.gapAnalysisRan ?? false);
  const prompt = loadPrompt({
    meshDir: opts.meshDir,
    packId: 'research/synthesis',
    context: promptContext,
  });

  const system = 'You write structured markdown documents with strict section + citation discipline. Every claim has an S[N] citation; every C[N] cites ≥2 sources; every Recommendation traces to a C[N]. Headings appear in the exact order requested. No prose before the first `##` heading.';

  let lastReport: ValidationReport | null = null;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let lastModel = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    const userPrompt = attempt === 1
      ? prompt.filled
      : `${prompt.filled}\n\n---\n\nYour previous response failed structural validation:\n${lastReport!.errors.map(e => `- ${e}`).join('\n')}\n\nRewrite the document and fix EVERY error above. The 10 H2 sections must appear in the exact order specified; every C[N] must cite ≥2 S[N] (or ≥1 if confidence is LOW); every Recommendation must reference at least one C[N].`;

    const result = await callLlm({
      provider,
      tier: 'synth',
      anthropicApiKey: opts.anthropicApiKey,
      githubToken: opts.githubToken,
      system,
      prompt: userPrompt,
      maxTokens: MAX_TOKENS,
      fetchImpl: opts.fetchImpl,
    });

    totalInput += result.inputTokens;
    totalOutput += result.outputTokens;
    totalCost += result.costUsd;
    lastModel = result.model;

    const body = stripFences(result.text);
    const report = validateSynthesis(body);
    if (report.valid) {
      return {
        body_md: body,
        prompt,
        validation: report,
        citation_stats: report.citation_stats,
        llm: { provider, model: lastModel, inputTokens: totalInput, outputTokens: totalOutput, costUsd: totalCost, attempts: attempt },
      };
    }
    lastReport = report;
  }

  throw new Error(`synthesize_report: structural validation failed after 2 attempts. Last errors: ${lastReport!.errors.join('; ')}`);
}

/** If the model wraps the doc in ```markdown … ``` fences, unwrap. Otherwise pass through. */
function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)```\s*$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/** Build the dotted-key context the synthesis prompt asks for. */
function buildPromptContext(
  brief: ResearchBrief,
  mesh: MeshContext,
  rankedSources: RankedSource[],
  gapAnalysisRan: boolean,
): Record<string, unknown> {
  return {
    brief: {
      topic: brief.topic,
      scope_level: brief.scope.level,
    },
    mesh: {
      context_summary: summarizeMeshContext(mesh),
    },
    ranked_sources: rankedSources.length === 0
      ? '(no sources retrieved)'
      : rankedSources.map(formatRankedSource).join('\n\n'),
    gap_analysis_ran: gapAnalysisRan,
  };
}

function summarizeMeshContext(mesh: MeshContext): string {
  const parts: string[] = [];
  parts.push(`Portfolio: ${mesh.portfolio.name}`);
  if (mesh.portfolio.related_research_summaries.length > 0) {
    parts.push(`Portfolio research (${mesh.portfolio.related_research_summaries.length}): ${mesh.portfolio.related_research_summaries.map(r => r.topic).slice(0, 5).join('; ')}`);
  }
  if (mesh.platform) {
    parts.push(`Platform: ${mesh.platform.platform_id} (${mesh.platform.sibling_bars.length} sibling BAR${mesh.platform.sibling_bars.length === 1 ? '' : 's'})`);
  }
  if (mesh.bar) {
    parts.push(`BAR: ${mesh.bar.name} (${mesh.bar.bar_id}); tier=${mesh.bar.tier}; ADRs=${mesh.bar.adrs.length}; prior research=${mesh.bar.related_research.length}; prior PRDs=${mesh.bar.related_prds.length}; mesh gaps: ${mesh.bar.mesh_gaps.join(', ') || 'none'}`);
    if (Array.isArray(mesh.bar.threats)) {
      const ts = mesh.bar.threats as Array<{ id?: string; category?: string }>;
      parts.push(`STRIDE threats (${ts.length}): ${ts.map(t => `${t.id}/${t.category}`).slice(0, 6).join('; ')}`);
    }
  }
  return parts.join('\n');
}

function formatRankedSource(s: RankedSource): string {
  const lines = [
    `- **${s.id}** "${s.title}" (${s.provider}, salience ${s.salience_score})`,
    `  URL: ${s.url}`,
    `  Retrieved: ${s.retrieved_at}`,
  ];
  if (s.published_at) { lines.push(`  Published: ${s.published_at}`); }
  if (s.excerpt) { lines.push(`  Excerpt: ${s.excerpt.slice(0, 280)}${s.excerpt.length > 280 ? '…' : ''}`); }
  return lines.join('\n');
}
