/**
 * expert_review — shared LLM node for architecture_review + security_review.
 *
 * The two expert reviews differ only by:
 *   - which `.caterpillar/prompts/prd/{architecture-review,security-review}.md`
 *     pack they load
 *   - which mesh context they receive (CALM nodes/ADRs for arch;
 *     STRIDE/OWASP/NIST for sec)
 *
 * Both prompts contractually return a structured-text block:
 *   SCORE: <float 0.00 - 1.00>
 *   SEVERITY: <PASS | MINOR | MAJOR | BLOCKING>
 *   COVERED: <comma-separated IDs>
 *   MISSING: <comma-separated IDs>
 *   CHANGES:
 *   - <change 1>
 *   - <change 2>
 *
 * We parse this with regex; the parser is lenient about whitespace + casing.
 * Output flows directly into verify_grounding.
 */
import type { LlmProvider, MeshContext } from '../../schemas';
import { callLlm } from '../../llm/llm-router';
import { loadPrompt, type LoadedPrompt } from '../../mesh/prompt-loader';

export type ExpertKind = 'architecture' | 'security';
export type ReviewSeverity = 'PASS' | 'MINOR' | 'MAJOR' | 'BLOCKING';

export interface ExpertReview {
  expert: ExpertKind;
  iteration: number;
  score: number;
  severity: ReviewSeverity;
  /** Field names mirror GroundingBlock.iterations so verify_grounding can pass them through. */
  covered_ids: string[];
  missing_ids: string[];
  changes: string[];
}

export interface ExpertReviewOpts {
  meshDir: string;
  expert: ExpertKind;
  iteration: number;
  prdBody: string;
  meshContext: MeshContext;
  /** Prior iteration's review (passed back to the LLM for delta-checking). */
  priorReview?: ExpertReview;
  provider: LlmProvider;
  anthropicApiKey?: string;
  githubToken?: string;
  fetchImpl?: typeof fetch;
}

export interface ExpertReviewResult {
  review: ExpertReview;
  prompt: LoadedPrompt;
  llm: {
    provider: LlmProvider;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    attempts: number;
  };
}

const MAX_TOKENS = 1500;

export async function runExpertReview(opts: ExpertReviewOpts): Promise<ExpertReviewResult> {
  const packId = opts.expert === 'architecture'
    ? 'prd/architecture-review'
    : 'prd/security-review';

  const promptContext = buildPromptContext(opts.expert, opts.prdBody, opts.meshContext, opts.iteration, opts.priorReview);
  const prompt = loadPrompt({ meshDir: opts.meshDir, packId, context: promptContext });

  const system = opts.expert === 'architecture'
    ? 'You are a senior architect reviewing a PRD for grounding against the CALM model. Output strictly in the SCORE / SEVERITY / COVERED / MISSING / CHANGES format — no prose before or after. SEVERITY must be one of PASS / MINOR / MAJOR / BLOCKING.'
    : 'You are a senior application-security engineer reviewing a PRD for STRIDE / OWASP / NIST coverage. Output strictly in the SCORE / SEVERITY / COVERED / MISSING / CHANGES format — no prose before or after. SEVERITY must be one of PASS / MINOR / MAJOR / BLOCKING.';

  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let lastModel = '';
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const userPrompt = attempt === 1
      ? prompt.filled
      : `${prompt.filled}\n\n---\n\nYour previous response could not be parsed:\n${lastError}\n\nReturn EXACTLY this 5-field structured-text format, no prose:\nSCORE: <0..1>\nSEVERITY: <PASS|MINOR|MAJOR|BLOCKING>\nCOVERED: <ids>\nMISSING: <ids>\nCHANGES:\n- <change>`;

    const result = await callLlm({
      provider: opts.provider,
      tier: 'plan',          // reviews are tighter than synthesis — cheaper tier is fine
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

    const parsed = parseReviewResponse(result.text, opts.expert, opts.iteration);
    if (parsed.success) {
      return {
        review: parsed.data,
        prompt,
        llm: { provider: opts.provider, model: lastModel, inputTokens: totalInput, outputTokens: totalOutput, costUsd: totalCost, attempts: attempt },
      };
    }
    lastError = parsed.error;
  }

  throw new Error(`expert_review (${opts.expert}): could not parse SCORE/SEVERITY/COVERED/MISSING/CHANGES after 2 attempts. Last error: ${lastError}`);
}

// ============================================================================
// Response parsing
// ============================================================================

const VALID_SEVERITY = new Set<ReviewSeverity>(['PASS', 'MINOR', 'MAJOR', 'BLOCKING']);

export function parseReviewResponse(
  raw: string,
  expert: ExpertKind,
  iteration: number,
): { success: true; data: ExpertReview } | { success: false; error: string } {
  const text = stripFences(raw.trim());

  const score = parseScore(text);
  if (score === null) {
    return { success: false, error: 'SCORE: <float> line missing or unparseable' };
  }

  const severity = parseSeverity(text);
  if (!severity) {
    return { success: false, error: 'SEVERITY must be one of PASS / MINOR / MAJOR / BLOCKING' };
  }

  const covered_ids = parseIdList(text, /^COVERED:\s*(.*)$/im);
  const missing_ids = parseIdList(text, /^MISSING:\s*(.*)$/im);
  const changes = parseChangesBlock(text);

  return {
    success: true,
    data: {
      expert,
      iteration,
      score,
      severity,
      covered_ids,
      missing_ids,
      changes,
    },
  };
}

function parseScore(text: string): number | null {
  const m = text.match(/^SCORE:\s*([0-9.]+)\s*$/im);
  if (!m) { return null; }
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) { return null; }
  return Math.max(0, Math.min(1, n));
}

function parseSeverity(text: string): ReviewSeverity | null {
  const m = text.match(/^SEVERITY:\s*([A-Z]+)\s*$/im);
  if (!m) { return null; }
  const sev = m[1].toUpperCase() as ReviewSeverity;
  return VALID_SEVERITY.has(sev) ? sev : null;
}

function parseIdList(text: string, re: RegExp): string[] {
  const m = text.match(re);
  if (!m) { return []; }
  return m[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== '-' && s.toLowerCase() !== 'none');
}

function parseChangesBlock(text: string): string[] {
  const idx = text.search(/^CHANGES:\s*$/im);
  if (idx === -1) { return []; }
  const tail = text.slice(idx);
  const lines = tail.split('\n').slice(1);
  const changes: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+(.+)$/);
    if (m) {
      changes.push(m[1].trim());
    } else if (line.trim().length > 0 && !line.match(/^[A-Z]+:\s/)) {
      // Continuation lines for a multi-line change item
      if (changes.length > 0) { changes[changes.length - 1] += ' ' + line.trim(); }
    } else if (line.match(/^[A-Z_]+:\s/)) {
      // Hit the next header field — stop
      break;
    }
  }
  return changes;
}

function stripFences(s: string): string {
  const fenceMatch = s.match(/^```\s*([\s\S]*?)```\s*$/);
  return fenceMatch ? fenceMatch[1].trim() : s;
}

// ============================================================================
// Prompt context
// ============================================================================

function buildPromptContext(
  expert: ExpertKind,
  prdBody: string,
  meshContext: MeshContext,
  iteration: number,
  priorReview?: ExpertReview,
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    prd_doc: prdBody,
    iteration,
    prior_review: priorReview
      ? `Previous iteration (${priorReview.iteration}) — score ${priorReview.score.toFixed(2)}, severity ${priorReview.severity}. CHANGES requested:\n${priorReview.changes.map(c => `- ${c}`).join('\n')}`
      : '(first iteration — no prior review)',
  };
  if (expert === 'architecture') {
    ctx['mesh.bar.calm_summary'] = summarizeCalm(meshContext);
    ctx.calm_node_ids = extractCalmNodeIds(meshContext).join(', ') || '(none)';
    ctx.adrs_in_scope = (meshContext.bar?.adrs ?? []).map(a => a.id).join(', ') || '(none)';
  } else {
    ctx.stride_entries = extractStrideIds(meshContext).join(', ') || '(none)';
    ctx.owasp_in_scope = '(derived from STRIDE entries — see PRD body for current claims)';
    ctx.nist_controls = '(see policies/nist-800-53-controls.yaml in mesh)';
  }
  return ctx;
}

function summarizeCalm(mesh: MeshContext): string {
  const calm = mesh.bar?.calm_model;
  if (!calm || typeof calm !== 'object') { return '(no CALM model loaded)'; }
  const nodes = (calm as { nodes?: unknown[] }).nodes;
  if (!Array.isArray(nodes)) { return '(empty CALM model)'; }
  const lines: string[] = [`${nodes.length} node(s):`];
  for (const n of nodes.slice(0, 12)) {
    const o = n as Record<string, unknown>;
    lines.push(`  - ${o['unique-id']} (${o['node-type'] ?? 'unknown'}) — ${o.name ?? ''}`);
  }
  return lines.join('\n');
}

function extractCalmNodeIds(mesh: MeshContext): string[] {
  const calm = mesh.bar?.calm_model;
  if (!calm || typeof calm !== 'object') { return []; }
  const nodes = (calm as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) { return []; }
  return nodes.map(n => String((n as Record<string, unknown>)['unique-id'] ?? '')).filter(Boolean);
}

function extractStrideIds(mesh: MeshContext): string[] {
  const threats = mesh.bar?.threats;
  if (!Array.isArray(threats)) { return []; }
  return threats.map(t => String((t as { id?: string }).id ?? '')).filter(Boolean);
}
