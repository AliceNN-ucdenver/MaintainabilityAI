/**
 * synthesize_prd — LLM node.
 *
 * Loads `.caterpillar/prompts/prd/synthesis.md`, fills in brief +
 * mesh-context + ranked-sources (carried over from the upstream research
 * doc), calls Anthropic / GitHub Models, runs prd-validator on the body.
 *
 * Unlike research's synthesize_report, this node has TWO call modes:
 *   - First iteration: standard prompt fill, no prior-review feedback
 *   - Subsequent iterations: same prompt + a feedback prefix block
 *     summarising the prior verify_grounding failure (CHANGES from
 *     architecture_review + security_review) so the LLM knows what to fix
 *
 * Returns the validated PRD body + the structural signals
 * verify_grounding needs, plus standard LLM telemetry.
 */
import type {
  LlmProvider,
  MeshContext,
  PrdBrief,
  RankedSource,
} from '../../schemas';
import { callLlm } from '../../llm/llm-router';
import { loadPrompt, type LoadedPrompt } from '../../mesh/prompt-loader';
import {
  validatePrd,
  type PrdCitationSignals,
  type PrdValidationReport,
} from './prd-validator';

export interface PriorReviewFeedback {
  iteration: number;
  architecture: { score: number; severity: string; changes: string[] };
  security:     { score: number; severity: string; changes: string[] };
}

export interface SynthesizePrdOpts {
  meshDir: string;
  brief: PrdBrief;
  meshContext: MeshContext;
  /** Sources carried over from the research doc (R[N] in the PRD body). */
  rankedSources: RankedSource[];
  /** Provider routing — comes from brief.llm_provider unless overridden. */
  provider?: LlmProvider;
  anthropicApiKey?: string;
  githubToken?: string;
  /** Present on iteration ≥ 2 — carries the prior round's review CHANGES. */
  priorFeedback?: PriorReviewFeedback;
  fetchImpl?: typeof fetch;
}

export interface SynthesizePrdResult {
  body_md: string;
  prompt: LoadedPrompt;
  validation: PrdValidationReport;
  signals: PrdCitationSignals;
  llm: {
    provider: LlmProvider;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    /** Number of LLM calls within this single iteration (1 happy, 2 on retry). */
    attempts: number;
  };
}

const MAX_TOKENS = 8000;

export async function synthesizePrd(opts: SynthesizePrdOpts): Promise<SynthesizePrdResult> {
  const provider = opts.provider ?? opts.brief.llm_provider;
  const promptContext = buildPromptContext(opts.brief, opts.meshContext, opts.rankedSources);
  const prompt = loadPrompt({
    meshDir: opts.meshDir,
    packId: 'prd/synthesis',
    context: promptContext,
  });

  const system = 'You write PRDs with strict section discipline and bidirectional traceability. Every Functional Requirement (FR-NN) cites at least one R[N] or E[N] premise. Every Security Requirement (SR-NN) cites at least one THR-NNN, A0X, or NIST-XX-NN identifier. The Coverage Analysis table includes a row for every premise. The 10 H2 sections appear in the exact order requested. No prose before the first `##` heading.';

  let lastReport: PrdValidationReport | null = null;
  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let lastModel = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    const feedbackBlock = attempt === 1 && opts.priorFeedback
      ? buildFeedbackBlock(opts.priorFeedback)
      : '';
    const validationBlock = attempt === 2 && lastReport
      ? `\n\n---\n\nYour previous response failed structural validation:\n${lastReport.errors.map(e => `- ${e}`).join('\n')}\n\nRewrite the document. Fix EVERY error above. Maintain section order. Every FR-NN must cite ≥1 R[N] or E[N]; every SR-NN must cite ≥1 THR/A0X/NIST identifier; the Coverage Analysis table must include every premise.`
      : '';
    const userPrompt = `${feedbackBlock}${prompt.filled}${validationBlock}`;

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
    const report = validatePrd(body);
    if (report.valid) {
      return {
        body_md: body,
        prompt,
        validation: report,
        signals: report.signals,
        llm: { provider, model: lastModel, inputTokens: totalInput, outputTokens: totalOutput, costUsd: totalCost, attempts: attempt },
      };
    }
    lastReport = report;
  }

  throw new Error(`synthesize_prd: structural validation failed after 2 attempts. Last errors: ${lastReport!.errors.join('; ')}`);
}

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)```\s*$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

/** Feedback block prepended on iteration 2+, summarising the prior round's expert reviews. */
function buildFeedbackBlock(feedback: PriorReviewFeedback): string {
  const lines: string[] = [];
  lines.push('# Prior Review Feedback (iteration ' + feedback.iteration + ')');
  lines.push('');
  lines.push('The previous PRD draft did not meet the grounding threshold. Two expert reviewers flagged the following changes — apply them to this draft.');
  lines.push('');
  lines.push(`## Architecture review (score ${feedback.architecture.score.toFixed(2)}, severity ${feedback.architecture.severity})`);
  for (const c of feedback.architecture.changes) { lines.push(`- ${c}`); }
  lines.push('');
  lines.push(`## Security review (score ${feedback.security.score.toFixed(2)}, severity ${feedback.security.severity})`);
  for (const c of feedback.security.changes) { lines.push(`- ${c}`); }
  lines.push('');
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

/** Build the dotted-key context the PRD synthesis prompt asks for. */
function buildPromptContext(
  brief: PrdBrief,
  mesh: MeshContext,
  rankedSources: RankedSource[],
): Record<string, unknown> {
  // Premise IDs: R1..RN from the research doc's ranked sources;
  // E1..EN come from mesh-extracted expert points + ask_experts answers.
  // Phase 4 doesn't run ask_experts yet — E IDs come from the mesh BAR's
  // STRIDE entries + ADRs + mesh_gaps as inferred expert input.
  const meshExpertPoints = extractMeshExpertPoints(mesh);

  return {
    brief: {
      topic: deriveTopic(brief),
    },
    scope: {
      bar_id: brief.scope.id ?? '(portfolio scope)',
    },
    research_findings: rankedSources.map((s, i) =>
      `R${i + 1}: ${s.title} — ${s.url} (provider=${s.provider}, salience=${s.salience_score})`,
    ).join('\n'),
    mesh_expert_input: meshExpertPoints.length === 0
      ? '(no expert input — BAR mesh artifacts are sparse)'
      : meshExpertPoints.map((p, i) => `E${i + 1}: ${p}`).join('\n'),
    clarifying_answers: '(none — ask_experts deferred to phase 4b)',
    calm_endpoints: extractCalmEndpoints(mesh).join(', ') || '(none)',
    stride_entries: extractThreatIds(mesh).join(', ') || '(none)',
    nist_controls: '(none documented in mesh)',
    owasp_in_scope: '(derived per threat at synthesis time)',
  };
}

function deriveTopic(brief: PrdBrief): string {
  if (brief.research_source.kind === 'pr') {
    const m = brief.research_source.url.match(/\/pull\/(\d+)/);
    return m ? `PRD from research PR #${m[1]}` : 'PRD (research source: PR)';
  }
  const base = brief.research_source.relative_path.split('/').pop()?.replace(/\.md$/, '') ?? 'topic';
  return base.replace(/-/g, ' ');
}

function extractMeshExpertPoints(mesh: MeshContext): string[] {
  const out: string[] = [];
  const bar = mesh.bar;
  if (!bar) { return out; }
  for (const adr of bar.adrs.slice(0, 6)) {
    out.push(`ADR ${adr.id} (${adr.status}): ${adr.title}`);
  }
  for (const gap of bar.mesh_gaps) {
    out.push(`mesh gap: ${gap}`);
  }
  return out;
}

function extractCalmEndpoints(mesh: MeshContext): string[] {
  const calm = mesh.bar?.calm_model;
  if (!calm || typeof calm !== 'object') { return []; }
  const nodes = (calm as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) { return []; }
  return nodes
    .map(n => (n as Record<string, unknown>)['unique-id'])
    .filter((id): id is string => typeof id === 'string');
}

function extractThreatIds(mesh: MeshContext): string[] {
  const threats = mesh.bar?.threats;
  if (!Array.isArray(threats)) { return []; }
  return threats
    .map(t => (t as { id?: string }).id)
    .filter((id): id is string => typeof id === 'string');
}
