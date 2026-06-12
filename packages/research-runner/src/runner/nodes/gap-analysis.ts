/**
 * gap_analysis — pure trigger + LLM hop, bounded one-shot.
 *
 * After the first-pass dedupe, this module:
 *   1) Decides whether to fire at all (pure, deterministic).
 *   2) If yes, asks the LLM for exactly 3 follow-up web queries.
 *
 * Trigger conditions (any one fires):
 *   - low_source_diversity:  fewer than `minSources` total ranked sources
 *     across the whole first pass.
 *   - topic_uncovered:       at least one topic keyword from the brief is
 *     mentioned in zero result titles/excerpts.
 *   - low_provider_overlap:  most sources came from a single provider
 *     (the synthesis prompt's Cross-Source Analysis falls apart when
 *     there's no cross-source angle).
 *
 * The bounded loop (one extra round of tavily, no further) is enforced by
 * the orchestrator — not this node. We return the queries; the caller
 * decides what to do with them.
 */
import { z } from 'zod';
import { callLlm } from '../../llm/llm-router';
import { loadPrompt } from '../../mesh/prompt-loader';
import type {
  LlmProvider,
  RankedSource,
  ResearchBrief,
} from '../../schemas';

const FollowUpQueriesSchema = z.array(z.string().min(3)).length(3);

export type GapSignalKind =
  | 'low_source_diversity'
  | 'topic_uncovered'
  | 'low_provider_overlap';

export interface GapSignal {
  kind: GapSignalKind;
  /** Short human-readable explanation for the audit log. */
  evidence: string;
}

export interface ShouldRunGapAnalysisOpts {
  brief: ResearchBrief;
  rankedSources: RankedSource[];
  /** Trigger when total < this. Default 5. */
  minSources?: number;
  /** Trigger when one provider holds > this fraction. Default 0.85. */
  dominantProviderRatio?: number;
}

/**
 * Pure deterministic trigger check. Returns the gap signals found; an
 * empty array means "do not run gap_analysis".
 */
export function detectGapSignals(opts: ShouldRunGapAnalysisOpts): GapSignal[] {
  const signals: GapSignal[] = [];
  const minSources = opts.minSources ?? 5;
  const dominantRatio = opts.dominantProviderRatio ?? 0.85;
  const { rankedSources, brief } = opts;

  if (rankedSources.length < minSources) {
    signals.push({
      kind: 'low_source_diversity',
      evidence: `only ${rankedSources.length} ranked source(s); threshold ${minSources}`,
    });
  }

  if (rankedSources.length > 0) {
    const byProvider = new Map<string, number>();
    for (const r of rankedSources) {
      byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + 1);
    }
    const maxCount = Math.max(...byProvider.values());
    const ratio = maxCount / rankedSources.length;
    if (ratio > dominantRatio && rankedSources.length >= 4) {
      const dominant = [...byProvider.entries()].find(([, n]) => n === maxCount)?.[0];
      signals.push({
        kind: 'low_provider_overlap',
        evidence: `${(ratio * 100).toFixed(0)}% of sources from ${dominant}; no cross-source signal`,
      });
    }
  }

  // Topic-uncoverage heuristic: split brief.topic into 3+ char keywords,
  // check each appears in at least one result title or excerpt. If a
  // keyword appears nowhere, that's a topic-uncovered signal.
  const keywords = extractTopicKeywords(brief.topic);
  const haystack = rankedSources.map(r => `${r.title} ${r.excerpt}`).join(' ').toLowerCase();
  const uncovered = keywords.filter(k => !haystack.includes(k));
  if (uncovered.length > 0) {
    signals.push({
      kind: 'topic_uncovered',
      evidence: `brief keyword(s) absent from any result: ${uncovered.slice(0, 5).join(', ')}`,
    });
  }

  return signals;
}

function extractTopicKeywords(topic: string): string[] {
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'about', 'over', 'after', 'before']);
  return topic
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4 && !stop.has(w))
    .slice(0, 10);
}

// ---------- LLM hop ----------

export interface RunGapAnalysisOpts {
  meshDir: string;
  brief: ResearchBrief;
  rankedSources: RankedSource[];
  signals: GapSignal[];
  provider: LlmProvider;
  githubToken?: string;
  fetchImpl?: typeof fetch;
}

export interface GapAnalysisResult {
  /** Exactly 3 follow-up web queries the LLM produced. */
  followUpQueries: string[];
  /** Prompt-pack telemetry for the audit log. */
  prompt: { packPath: string; packSha256: string };
  llm: {
    provider: LlmProvider;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    attempts: number;
  };
}

export async function runGapAnalysis(opts: RunGapAnalysisOpts): Promise<GapAnalysisResult> {
  const promptContext = {
    brief: { topic: opts.brief.topic },
    first_pass: {
      summary: `${opts.rankedSources.length} ranked source(s); top providers: ${topProviderSummary(opts.rankedSources)}`,
      gaps: opts.signals.map(s => `- ${s.kind}: ${s.evidence}`).join('\n'),
    },
  };

  const prompt = loadPrompt({
    meshDir: opts.meshDir,
    packId: 'research/gap-analysis',
    context: promptContext,
  });

  const system = 'You output a SINGLE JSON array of exactly 3 strings. No prose before or after, no markdown fence. The first character of your response MUST be `[`.';

  let totalInput = 0;
  let totalOutput = 0;
  let totalCost = 0;
  let lastModel = '';
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const userPrompt = attempt === 1
      ? prompt.filled
      : `${prompt.filled}\n\n---\n\nYour previous response failed validation:\n${lastError}\n\nReturn a SINGLE JSON array of exactly 3 strings (each a follow-up web query). No prose, no markdown.`;

    const result = await callLlm({
      provider: opts.provider,
      tier: 'plan',                          // cheap tier; this is structural follow-up
      githubToken: opts.githubToken,
      system,
      prompt: userPrompt,
      maxTokens: 1000,
      fetchImpl: opts.fetchImpl,
    });

    totalInput += result.inputTokens;
    totalOutput += result.outputTokens;
    totalCost += result.costUsd;
    lastModel = result.model;

    const parsed = parseFollowUpQueries(result.text);
    if (parsed.success) {
      return {
        followUpQueries: parsed.data,
        prompt: { packPath: prompt.packPath, packSha256: prompt.packSha256 },
        llm: { provider: opts.provider, model: lastModel, inputTokens: totalInput, outputTokens: totalOutput, costUsd: totalCost, attempts: attempt },
      };
    }
    lastError = parsed.error;
  }

  throw new Error(`gap_analysis: LLM output failed validation after 2 attempts. Last error: ${lastError}`);
}

function parseFollowUpQueries(raw: string): { success: true; data: string[] } | { success: false; error: string } {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  let parsedJson: unknown;
  try { parsedJson = JSON.parse(candidate); }
  catch (e) { return { success: false, error: `not valid JSON: ${e instanceof Error ? e.message : String(e)}` }; }
  const result = FollowUpQueriesSchema.safeParse(parsedJson);
  if (result.success) { return { success: true, data: result.data }; }
  return { success: false, error: result.error.issues.map(i => `${i.path.join('.') || '<root>'}: ${i.message}`).join('; ') };
}

function topProviderSummary(sources: RankedSource[]): string {
  const counts = new Map<string, number>();
  for (const s of sources) { counts.set(s.provider, (counts.get(s.provider) ?? 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p}=${n}`).join(', ');
}
