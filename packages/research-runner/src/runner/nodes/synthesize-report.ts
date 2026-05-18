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
  ArchaeologyGap,
  LlmProvider,
  MeshContext,
  ObservedArchitecture,
  RankedSource,
  ResearchBrief,
  ResearchPath,
} from '../../schemas';
import { callLlm } from '../../llm/llm-router';
import { loadPrompt, type LoadedPrompt } from '../../mesh/prompt-loader';
import {
  validateSynthesis,
  type CitationStats,
  type ValidationReport,
} from './synthesis-validator';
import { validateArchaeologySynthesis } from './synthesis-archaeology-validator';

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
  /** Flipped true by the orchestrator after gap-analysis fires. */
  gapAnalysisRan?: boolean;
  /** Defaults to brief.path. Overrideable for tests. */
  path?: ResearchPath;
  /** Archaeology-path only: observed architecture extracted from the target repo. */
  observedArchitecture?: ObservedArchitecture;
  /** Archaeology-path only: gaps identified by identify_gaps. */
  archaeologyGaps?: ArchaeologyGap[];
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
  const path = opts.path ?? opts.brief.path;

  // Two different prompt packs + validators per path. Same LLM router, same
  // retry-with-feedback loop — only the pack name + the validator differ.
  const packId = path === 'archaeology' ? 'research/synthesis-archaeology' : 'research/synthesis';
  const validate = path === 'archaeology' ? validateArchaeologySynthesis : validateSynthesis;

  const promptContext = path === 'archaeology'
    ? buildArchaeologyPromptContext(opts.brief, opts.meshContext, opts.rankedSources, opts.observedArchitecture, opts.archaeologyGaps ?? [])
    : buildPromptContext(opts.brief, opts.meshContext, opts.rankedSources, opts.gapAnalysisRan ?? false);

  const prompt = loadPrompt({
    meshDir: opts.meshDir,
    packId,
    context: promptContext,
  });

  const system = path === 'archaeology'
    ? 'You write structured markdown architecture-archaeology reports with strict section discipline. Every gap (G[N]) carries a severity. Every Recommendation traces to a G[N] and cites at least one grounding token (S[N] or OA[…]). The 9 H2 sections appear in the exact order requested. No prose before the first `##` heading.'
    : 'You write structured markdown documents with strict section + citation discipline. Every claim has an S[N] citation; every C[N] cites ≥2 sources; every Recommendation traces to a C[N]. Headings appear in the exact order requested. No prose before the first `##` heading.';

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
    const report = validate(body);
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

/** Build the dotted-key context the archaeology synthesis prompt asks for. */
function buildArchaeologyPromptContext(
  brief: ResearchBrief,
  mesh: MeshContext,
  rankedSources: RankedSource[],
  observed: ObservedArchitecture | undefined,
  gaps: ArchaeologyGap[],
): Record<string, unknown> {
  return {
    target_repo: brief.target_repo ?? '(unknown target)',
    observed_architecture: observed
      ? formatObservedArchitecture(observed)
      : '(analyzer did not run)',
    mesh: {
      bar: {
        calm_summary: mesh.bar?.calm_model ? summarizeCalmModelArchaeology(mesh.bar.calm_model) : '(no CALM model loaded)',
        threats_summary: mesh.bar?.threats ? summarizeThreatsArchaeology(mesh.bar.threats) : '(no threat model on file)',
      },
    },
    gap_signals: gaps.length === 0 ? '(no structural gaps detected)' : gaps.map(g =>
      `- **${g.id}** [${g.severity}] ${g.kind}: ${g.summary}`,
    ).join('\n'),
    ranked_sources: rankedSources.length === 0
      ? '(no web sources retrieved)'
      : rankedSources.map(formatRankedSource).join('\n\n'),
  };
}

function formatObservedArchitecture(o: ObservedArchitecture): string {
  const lines: string[] = [];
  lines.push(`Repo: ${o.profile.slug} @ ${o.profile.cloneSha.slice(0, 12)}`);
  lines.push(`Languages: ${o.profile.languages.join(', ') || '(none detected)'}`);
  lines.push(`Frameworks: ${o.profile.frameworks.join(', ') || '(none detected)'}`);
  lines.push(`Manifests: ${o.profile.manifests.join(', ') || '(none)'}`);
  lines.push(`Files: ${o.profile.totalFiles} totalling ${o.profile.totalBytes} bytes`);
  lines.push('');
  lines.push('Modules (top 12 by file count):');
  for (const m of o.modules.slice(0, 12)) {
    lines.push(`  - OA[${m.name}] layer=${m.layer} files=${m.fileCount} endpoints=${m.endpointCount}`);
  }
  if (o.endpoints.length > 0) {
    lines.push('');
    lines.push('Endpoints (sample):');
    for (const e of o.endpoints.slice(0, 15)) {
      lines.push(`  - ${e.method} ${e.path} (${e.framework}) — ${e.file}`);
    }
  }
  if (o.dependencies.length > 0) {
    lines.push('');
    lines.push(`Direct dependencies (${o.dependencies.length}): ${o.dependencies.slice(0, 25).join(', ')}${o.dependencies.length > 25 ? ', …' : ''}`);
  }
  return lines.join('\n');
}

function summarizeCalmModelArchaeology(calm: unknown): string {
  if (!calm || typeof calm !== 'object') { return '(no CALM model loaded)'; }
  const obj = calm as { nodes?: unknown[]; relationships?: unknown[] };
  const nodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const relationships = Array.isArray(obj.relationships) ? obj.relationships : [];
  const lines: string[] = [];
  lines.push(`${nodes.length} node(s), ${relationships.length} relationship(s)`);
  for (const n of nodes.slice(0, 10)) {
    const o = n as Record<string, unknown>;
    lines.push(`  - ${o['unique-id'] ?? o.name ?? 'unknown'} (${o['node-type'] ?? 'unknown'})`);
  }
  return lines.join('\n');
}

function summarizeThreatsArchaeology(threats: unknown): string {
  if (!Array.isArray(threats) || threats.length === 0) { return '(no threats)'; }
  const byCategory: Record<string, number> = {};
  for (const t of threats) {
    const cat = (t as { category?: string }).category || 'unknown';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }
  return Object.entries(byCategory).map(([c, n]) => `${c} × ${n}`).join(', ');
}
