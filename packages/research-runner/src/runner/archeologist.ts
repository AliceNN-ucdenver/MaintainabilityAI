/**
 * Archeologist pipeline orchestrator — Phase 2d.
 *
 * Wires nodes for the research path:
 *   validate_brief         (pure)
 *   gather_mesh_context    (pure)
 *   plan_queries           (LLM)
 *   tavily_search × 5      (pure_api)
 *   arxiv_search × 3       (pure_api)              ← phase 2d
 *   uspto_search × 3       (pure_api, optional)    ← phase 2d
 *   hackernews_search × 3  (pure_api)              ← phase 2d
 *   dedupe_and_rank        (pure)
 *   [gap_analysis          (pure trigger + LLM)    ← phase 2d, optional]
 *   [tavily_search × 3     (pure_api, follow-up)   ← phase 2d, optional]
 *   [dedupe_and_rank       (pure, re-rank)         ← phase 2d, optional]
 *   synthesize_report      (LLM)
 *   publish                (pure)
 *   verify_and_trigger     (run_complete)
 *
 * Search runs across all 4 providers in parallel. uspto is skipped (logged
 * as node_error envelope) when USPTO_API_KEY is absent — coverage gap, not
 * a run failure. Gap-analysis is bounded one-shot: at most one follow-up
 * round of tavily queries before synthesis.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ResearchBrief, type RankedSource } from '../schemas';
import { gatherMeshContext } from '../mesh/mesh-reader';
import type { ProviderResult } from '../search/provider-result';
import { generateRunId } from '../utils/run-id';
import { AuditEmitter } from './audit-emitter';
import { buildHattersTag } from './hatters-tag-builder';
import { planQueries } from './nodes/plan-queries';
import { runTavilySearch } from './nodes/tavily-search';
import { runArxivSearch } from './nodes/arxiv-search';
import { runUsptoSearch } from './nodes/uspto-search';
import { runHackerNewsSearch } from './nodes/hackernews-search';
import { dedupeAndRank } from './nodes/dedupe-and-rank';
import { detectGapSignals, runGapAnalysis } from './nodes/gap-analysis';
import { synthesizeReport } from './nodes/synthesize-report';

export interface ArcheologistOptions {
  brief: unknown;             // unvalidated input from CLI / workflow inputs
  meshDir: string;            // mesh repo root
  outputDir: string;          // research/ destination (relative to meshDir)
  auditDir: string;           // .research-audit/ destination (relative to meshDir)
  emitPrBodyPath?: string;    // absolute path to write the PR body markdown
  agentVersion: string;       // injected by CLI (from package.json)
  /** Provider keys — supply only the one your brief.llm_provider needs. Default from process.env. */
  anthropicApiKey?: string;
  /** GITHUB_TOKEN — used when brief.llm_provider === 'github-models'. */
  githubToken?: string;
  tavilyApiKey?: string;
  /** Optional — when absent, uspto_search emits a node_error envelope and the run continues without patent coverage. */
  usptoApiKey?: string;
  /** Test injection point. */
  fetchImpl?: typeof fetch;
}

export interface ArcheologistResult {
  run_id: string;
  topic: string;
  artifact_path: string;
  audit_log_path: string;
  chain_root_hash: string;
  pr_body_path: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  source_count: number;
  /** Per-provider counts of raw results (post-dedupe deltas — useful for reviewer summary). */
  provider_result_counts: Record<string, number>;
  /** Whether gap_analysis fired this run. */
  gap_analysis_ran: boolean;
  /** Synthesis structural validator outputs — quick reviewer signal. */
  conclusion_count: number;
  recommendation_count: number;
}

export async function runArcheologist(opts: ArcheologistOptions): Promise<ArcheologistResult> {
  // ----- validate_brief (pure) -----
  const briefParsed = ResearchBrief.safeParse(opts.brief);
  if (!briefParsed.success) {
    throw new Error(`Invalid research brief: ${briefParsed.error.message}`);
  }
  const brief = briefParsed.data;

  const runId = generateRunId('RES');
  const startedAt = new Date();
  const anthropicApiKey = opts.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
  const githubToken = opts.githubToken ?? process.env.GITHUB_TOKEN ?? '';
  const tavilyApiKey = opts.tavilyApiKey ?? process.env.TAVILY_API_KEY ?? '';
  const usptoApiKey = opts.usptoApiKey ?? process.env.USPTO_API_KEY ?? '';

  const absoluteAuditDir = path.resolve(opts.meshDir, opts.auditDir);
  const absoluteOutputDir = path.resolve(opts.meshDir, opts.outputDir);
  fs.mkdirSync(absoluteOutputDir, { recursive: true });

  const emitter = new AuditEmitter(absoluteAuditDir, runId);

  emitter.emit({
    node_kind: 'pure',
    node_name: 'validate_brief',
    duration_ms: 0,
    pure: {
      inputs_summary: `topic="${brief.topic.slice(0, 80)}"; scope=${brief.scope.level}${brief.scope.id ? `(${brief.scope.id})` : ''}; path=${brief.path}`,
      outputs_summary: 'ResearchBrief validated',
    },
  });

  // ----- gather_mesh_context (pure) -----
  const meshStart = Date.now();
  const meshContext = gatherMeshContext({
    meshDir: opts.meshDir,
    scope: { level: brief.scope.level, id: brief.scope.id },
  });
  emitter.emit({
    node_kind: 'pure',
    node_name: 'gather_mesh_context',
    duration_ms: Date.now() - meshStart,
    pure: {
      inputs_summary: `scope=${meshContext.scope.level}${meshContext.scope.bar_id ? `(${meshContext.scope.bar_id})` : ''}; mesh_sha=${meshContext.mesh_sha.slice(0, 7)}`,
      outputs_summary: `portfolio.related_research=${meshContext.portfolio.related_research_summaries.length}; bar_loaded=${!!meshContext.bar}; mesh_gaps=${meshContext.bar?.mesh_gaps.join(',') || 'n/a'}; adrs=${meshContext.bar?.adrs.length ?? 0}; prior_prds=${meshContext.bar?.related_prds.length ?? 0}`,
    },
  });

  // ----- plan_queries (LLM) -----
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  const planStart = Date.now();
  const plan = await planQueries({
    meshDir: opts.meshDir,
    brief,
    meshContext,
    provider: brief.llm_provider,
    anthropicApiKey,
    githubToken,
    fetchImpl: opts.fetchImpl,
  });
  totalInputTokens += plan.llm.inputTokens;
  totalOutputTokens += plan.llm.outputTokens;
  totalCostUsd += plan.llm.costUsd;
  emitter.emit({
    node_kind: 'llm',
    node_name: 'plan_queries',
    duration_ms: Date.now() - planStart,
    llm: {
      provider: plan.llm.provider,
      model: plan.llm.model,
      prompt_pack: { path: plan.prompt.packPath, sha256: plan.prompt.packSha256 },
      input_tokens: plan.llm.inputTokens,
      output_tokens: plan.llm.outputTokens,
      cost_usd: plan.llm.costUsd,
      guardrails: { mode: brief.guardrails, pre: 'PASS', post: 'PASS' },
    },
  });

  // ----- four-provider search (pure_api each, parallel across providers) -----
  // We run all four providers concurrently with Promise.allSettled so a
  // provider-level failure (e.g. PatentsView outage) doesn't block the rest.
  const searchStart = Date.now();
  const [tavily, arxiv, hn, uspto] = await Promise.allSettled([
    runTavilySearch({ apiKey: tavilyApiKey, queries: plan.queryPlan.web, fetchImpl: opts.fetchImpl }),
    runArxivSearch({ queries: plan.queryPlan.arxiv, fetchImpl: opts.fetchImpl }),
    runHackerNewsSearch({ queries: plan.queryPlan.community, fetchImpl: opts.fetchImpl }),
    usptoApiKey
      ? runUsptoSearch({ apiKey: usptoApiKey, queries: plan.queryPlan.patent, fetchImpl: opts.fetchImpl })
      : Promise.reject(new Error('USPTO_API_KEY not configured — patent coverage skipped')),
  ]);
  const searchDuration = Date.now() - searchStart;

  // Record per-provider envelopes (audit log) + collect ProviderResult[] (dedupe input)
  const allProviderResults: ProviderResult[] = [];
  const providerResultCounts: Record<string, number> = { tavily: 0, arxiv: 0, uspto: 0, hackernews: 0 };

  // Helper: emit per-query envelopes (or one node_error per provider-level failure)
  const handleProvider = (
    settled: PromiseSettledResult<{ envelopes: Array<{ query: string; httpStatus: number; responseBytes: number; resultCount: number; error?: string }>; results: ProviderResult[] }>,
    nodeName: string,
    providerLabel: string,
    endpoint: string,
  ): void => {
    if (settled.status === 'rejected') {
      const msg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      emitter.emit({
        node_kind: 'node_error',
        node_name: nodeName,
        duration_ms: 0,
        error: { message: msg, retryable: false },
      });
      return;
    }
    const { envelopes, results } = settled.value;
    const perQueryMs = Math.round(searchDuration / Math.max(1, envelopes.length));
    for (const envelope of envelopes) {
      if (envelope.error) {
        emitter.emit({
          node_kind: 'node_error',
          node_name: nodeName,
          duration_ms: 0,
          error: { message: `query="${envelope.query.slice(0, 80)}": ${envelope.error}`, retryable: true },
        });
      } else {
        emitter.emit({
          node_kind: 'pure_api',
          node_name: nodeName,
          duration_ms: perQueryMs,
          api: {
            provider: providerLabel,
            endpoint,
            request_summary: `query="${envelope.query.slice(0, 120)}"`,
            http_status: envelope.httpStatus,
            response_byte_count: envelope.responseBytes,
          },
        });
      }
    }
    providerResultCounts[providerLabel] = results.length;
    allProviderResults.push(...results);
  };

  handleProvider(tavily, 'tavily_search', 'tavily', 'POST /search');
  handleProvider(arxiv, 'arxiv_search', 'arxiv', 'GET /api/query');
  handleProvider(hn, 'hackernews_search', 'hackernews', 'GET /api/v1/search');
  handleProvider(uspto, 'uspto_search', 'uspto', 'POST /api/v1/patent/');

  // ----- dedupe_and_rank (pure) — first pass -----
  let dedupeStart = Date.now();
  let rankedSources: RankedSource[] = dedupeAndRank({ results: allProviderResults, topN: 20 });
  emitter.emit({
    node_kind: 'pure',
    node_name: 'dedupe_and_rank',
    duration_ms: Date.now() - dedupeStart,
    pure: {
      inputs_summary: `raw_results=${allProviderResults.length}; providers=tavily(${providerResultCounts.tavily})+arxiv(${providerResultCounts.arxiv})+hn(${providerResultCounts.hackernews})+uspto(${providerResultCounts.uspto})`,
      outputs_summary: `ranked_sources=${rankedSources.length}; top_score=${rankedSources[0]?.salience_score ?? 0}`,
    },
  });

  // ----- gap_analysis (optional, bounded one-shot) -----
  const gapSignals = detectGapSignals({ brief, rankedSources });
  let gapAnalysisRan = false;
  if (gapSignals.length > 0) {
    emitter.emit({
      node_kind: 'pure',
      node_name: 'gap_analysis_trigger',
      duration_ms: 0,
      pure: {
        inputs_summary: `ranked_sources=${rankedSources.length}; providers=${Object.entries(providerResultCounts).filter(([, n]) => n > 0).map(([p, n]) => `${p}(${n})`).join('+')}`,
        outputs_summary: `signals=${gapSignals.map(s => s.kind).join(',')}`,
      },
    });

    const gapStart = Date.now();
    const gap = await runGapAnalysis({
      meshDir: opts.meshDir,
      brief,
      rankedSources,
      signals: gapSignals,
      provider: brief.llm_provider,
      anthropicApiKey,
      githubToken,
      fetchImpl: opts.fetchImpl,
    });
    totalInputTokens += gap.llm.inputTokens;
    totalOutputTokens += gap.llm.outputTokens;
    totalCostUsd += gap.llm.costUsd;
    emitter.emit({
      node_kind: 'llm',
      node_name: 'gap_analysis',
      duration_ms: Date.now() - gapStart,
      llm: {
        provider: gap.llm.provider,
        model: gap.llm.model,
        prompt_pack: { path: gap.prompt.packPath, sha256: gap.prompt.packSha256 },
        input_tokens: gap.llm.inputTokens,
        output_tokens: gap.llm.outputTokens,
        cost_usd: gap.llm.costUsd,
        guardrails: { mode: brief.guardrails, pre: 'PASS', post: 'PASS' },
      },
    });

    // Bounded follow-up: one extra round of tavily, then re-dedupe.
    if (tavilyApiKey) {
      const followStart = Date.now();
      const followUp = await runTavilySearch({
        apiKey: tavilyApiKey,
        queries: gap.followUpQueries,
        fetchImpl: opts.fetchImpl,
      });
      const followDuration = Date.now() - followStart;
      const followPerQueryMs = Math.round(followDuration / Math.max(1, followUp.envelopes.length));
      for (const envelope of followUp.envelopes) {
        if (envelope.error) {
          emitter.emit({
            node_kind: 'node_error',
            node_name: 'tavily_search',
            duration_ms: 0,
            error: { message: `gap-followup query="${envelope.query.slice(0, 80)}": ${envelope.error}`, retryable: true },
          });
        } else {
          emitter.emit({
            node_kind: 'pure_api',
            node_name: 'tavily_search',
            duration_ms: followPerQueryMs,
            api: {
              provider: 'tavily',
              endpoint: 'POST /search (gap-followup)',
              request_summary: `query="${envelope.query.slice(0, 120)}"`,
              http_status: envelope.httpStatus,
              response_byte_count: envelope.responseBytes,
            },
          });
        }
      }
      allProviderResults.push(...followUp.results);
      providerResultCounts.tavily += followUp.results.length;

      // Re-dedupe with the expanded result pool — emits a second dedupe event so
      // the audit log clearly shows the loop happened.
      dedupeStart = Date.now();
      rankedSources = dedupeAndRank({ results: allProviderResults, topN: 20 });
      emitter.emit({
        node_kind: 'pure',
        node_name: 'dedupe_and_rank',
        duration_ms: Date.now() - dedupeStart,
        pure: {
          inputs_summary: `raw_results=${allProviderResults.length} (post gap-followup)`,
          outputs_summary: `ranked_sources=${rankedSources.length}; top_score=${rankedSources[0]?.salience_score ?? 0}`,
        },
      });
    }
    gapAnalysisRan = true;
  }

  // ----- synthesize_report (LLM) -----
  const synthStart = Date.now();
  const synthesis = await synthesizeReport({
    meshDir: opts.meshDir,
    brief,
    meshContext,
    rankedSources,
    provider: brief.llm_provider,
    anthropicApiKey,
    githubToken,
    gapAnalysisRan,
    fetchImpl: opts.fetchImpl,
  });
  totalInputTokens += synthesis.llm.inputTokens;
  totalOutputTokens += synthesis.llm.outputTokens;
  totalCostUsd += synthesis.llm.costUsd;
  emitter.emit({
    node_kind: 'llm',
    node_name: 'synthesize_report',
    duration_ms: Date.now() - synthStart,
    llm: {
      provider: synthesis.llm.provider,
      model: synthesis.llm.model,
      prompt_pack: { path: synthesis.prompt.packPath, sha256: synthesis.prompt.packSha256 },
      input_tokens: synthesis.llm.inputTokens,
      output_tokens: synthesis.llm.outputTokens,
      cost_usd: synthesis.llm.costUsd,
      guardrails: { mode: brief.guardrails, pre: 'PASS', post: 'PASS' },
    },
  });

  // ----- publish (pure) -----
  const today = startedAt.toISOString().slice(0, 10);
  const fileSlug = brief.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'research';
  const artifactName = `${fileSlug}-${today}.md`;
  const artifactPath = path.join(absoluteOutputDir, artifactName);

  const meshSummary = meshContext.bar
    ? `bar **${meshContext.bar.name}** (\`${meshContext.bar.bar_id}\`), ${meshContext.bar.adrs.length} ADR(s), ${meshContext.bar.related_research.length} prior research doc(s), mesh gaps: ${meshContext.bar.mesh_gaps.join(', ') || '_none_'}`
    : meshContext.platform
      ? `platform **${meshContext.platform.platform_id}** (${meshContext.platform.sibling_bars.length} sibling BAR(s))`
      : `portfolio **${meshContext.portfolio.name}** (${meshContext.portfolio.related_research_summaries.length} prior research doc(s))`;

  const bodyMd = buildResearchDoc({
    brief,
    runId,
    meshSummary,
    meshSha: meshContext.mesh_sha,
    queryPlan: plan.queryPlan,
    synthesisBody: synthesis.body_md,
  });

  const writeStart = Date.now();
  fs.writeFileSync(artifactPath, bodyMd, 'utf8');
  emitter.emit({
    node_kind: 'pure',
    node_name: 'publish',
    duration_ms: Date.now() - writeStart,
    pure: {
      inputs_summary: `wrote ${artifactPath}`,
      outputs_summary: `${bodyMd.length} bytes; ${rankedSources.length} citations`,
    },
  });

  // ----- run_complete -----
  const complete = emitter.emitRunComplete({
    node_kind: 'run_complete',
    node_name: 'verify_and_trigger',
    duration_ms: Date.now() - startedAt.getTime(),
    outcome: {
      status: 'ok',
      mesh_sha: meshContext.mesh_sha,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_cost_usd: roundUsd(totalCostUsd),
      artifact_paths: [path.relative(opts.meshDir, artifactPath)],
    },
  });

  // ----- Optionally append a PR body that wraps the artifact + Hatter's Tag -----
  let prBodyPath: string | null = null;
  if (opts.emitPrBodyPath) {
    const hattersTag = buildHattersTag({
      run_id: runId,
      mesh_sha: meshContext.mesh_sha,
      prompt_library_version: 'phase2d',
      agent_version: opts.agentVersion,
      published_at: new Date().toISOString(),
      llm: {
        provider: brief.llm_provider,
        model: plan.llm.model,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cost_usd: roundUsd(totalCostUsd),
      },
      guardrails: { mode: brief.guardrails, blocks: 0, warns: 0 },
      audit: {
        event_count: complete.event_id,
        chain_root_hash: complete.outcome.chain_root_hash,
        audit_log_path: path.relative(opts.meshDir, emitter.path),
      },
    });
    const prBody = [bodyMd, '', hattersTag].join('\n');
    fs.writeFileSync(opts.emitPrBodyPath, prBody, 'utf8');
    prBodyPath = opts.emitPrBodyPath;
  }

  return {
    run_id: runId,
    topic: brief.topic,
    artifact_path: artifactPath,
    audit_log_path: emitter.path,
    chain_root_hash: complete.outcome.chain_root_hash,
    pr_body_path: prBodyPath,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    total_cost_usd: roundUsd(totalCostUsd),
    source_count: rankedSources.length,
    provider_result_counts: providerResultCounts,
    gap_analysis_ran: gapAnalysisRan,
    conclusion_count: synthesis.citation_stats.conclusion_count,
    recommendation_count: synthesis.citation_stats.recommendation_count,
  };
}

interface BuildDocOpts {
  brief: ResearchBrief;
  runId: string;
  meshSummary: string;
  meshSha: string;
  queryPlan: import('../schemas').QueryPlan;
  /** The canonical 10-section markdown body emitted by synthesize_report. */
  synthesisBody: string;
}

/**
 * Compose the published artifact:
 *   <H1 topic>
 *   <metadata block + Run metadata + Mesh Context summary + Query Plan table>
 *   <synthesis body — H2 Source Premises through H2 References>
 * The Hatter's Tag is appended separately by the PR-body path.
 */
function buildResearchDoc(opts: BuildDocOpts): string {
  const lines: string[] = [];
  lines.push(`# ${opts.brief.topic}`);
  lines.push('');
  lines.push(`- **Run id:** \`${opts.runId}\``);
  lines.push(`- **Mesh sha:** \`${opts.meshSha.slice(0, 12)}\``);
  lines.push(`- **Scope:** ${opts.brief.scope.level}${opts.brief.scope.id ? ` / ${opts.brief.scope.id}` : ''}`);
  lines.push('');
  lines.push('## Run Metadata');
  lines.push('');
  lines.push(`Scope resolved to: ${opts.meshSummary}.`);
  lines.push('');
  lines.push('### Query Plan (per-provider, LLM-generated)');
  lines.push('');
  lines.push('| Provider | Queries |');
  lines.push('|---|---|');
  lines.push(`| **web** (Tavily) | ${opts.queryPlan.web.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
  lines.push(`| **arxiv** | ${opts.queryPlan.arxiv.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
  lines.push(`| **patent** (USPTO) | ${opts.queryPlan.patent.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
  lines.push(`| **community** (HN) | ${opts.queryPlan.community.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
  lines.push('');
  lines.push('_arxiv / patent / community searches land in phase 2d; this run was web-only._');
  lines.push('');
  // The synthesis body owns every H2 from "Source Premises" through "References".
  lines.push(opts.synthesisBody.trim());
  lines.push('');
  return lines.join('\n');
}

function roundUsd(n: number): number {
  return Math.round(n * 10000) / 10000;
}
