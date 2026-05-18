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
import { cloneAndIndex } from './nodes/clone-and-index';
import { analyzeArchitecture, ANALYZER_VERSION } from './nodes/analyze-architecture';
import { identifyGaps } from './nodes/identify-gaps';
import type { ArchaeologyGap, ObservedArchitecture } from '../schemas';

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
  /** Whether gap_analysis fired this run. Research path only. */
  gap_analysis_ran: boolean;
  /** Number of archaeology gaps identified. Undefined on research-path runs. */
  archaeology_gap_count?: number;
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

  // Path-conditional outputs the synthesis + publish blocks consume below.
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  let rankedSources: RankedSource[] = [];
  const providerResultCounts: Record<string, number> = { tavily: 0, arxiv: 0, uspto: 0, hackernews: 0 };
  let gapAnalysisRan = false;
  let observedArchitecture: ObservedArchitecture | undefined;
  let archaeologyGaps: ArchaeologyGap[] = [];
  let cleanupCloneDir: string | null = null;
  let researchQueryPlan: import('../schemas').QueryPlan | undefined;

  if (brief.path === 'archaeology') {
    // ============================================================================
    // ARCHAEOLOGY PATH — replaces plan_queries + 4-provider search + gap-analysis
    // with clone → analyze → identify-gaps → web-research (tavily only).
    // ============================================================================
    if (!brief.target_repo) {
      throw new Error('Archaeology path requires brief.target_repo (owner/repo)');
    }

    // 1. clone_and_index (pure)
    const cloneStart = Date.now();
    const clone = cloneAndIndex({ targetRepo: brief.target_repo });
    cleanupCloneDir = clone.cloneDir;
    emitter.emit({
      node_kind: 'pure',
      node_name: 'clone_and_index',
      duration_ms: Date.now() - cloneStart,
      pure: {
        inputs_summary: `target=${brief.target_repo}`,
        outputs_summary: `clone_sha=${clone.cloneSha.slice(0, 12)}; files=${clone.inventory.totalFiles}; bytes=${clone.inventory.totalBytes}; manifests=${clone.inventory.rootManifests.join(',') || 'none'}`,
      },
    });

    // 2. analyze_architecture (pure, file-based)
    const analyzeStart = Date.now();
    observedArchitecture = analyzeArchitecture({
      cloneDir: clone.cloneDir,
      targetRepo: brief.target_repo,
      cloneSha: clone.cloneSha,
      inventory: clone.inventory,
    });
    emitter.emit({
      node_kind: 'pure',
      node_name: 'analyze_architecture',
      duration_ms: Date.now() - analyzeStart,
      pure: {
        inputs_summary: `clone_sha=${clone.cloneSha.slice(0, 12)}; analyzer=${ANALYZER_VERSION}`,
        outputs_summary: `languages=${observedArchitecture.profile.languages.join(',')}; frameworks=${observedArchitecture.profile.frameworks.join(',') || 'none'}; modules=${observedArchitecture.modules.length}; endpoints=${observedArchitecture.endpoints.length}`,
      },
    });

    // 3. identify_gaps (pure, comparison) → derives 3 web queries
    const gapsStart = Date.now();
    const gapsResult = identifyGaps({ observed: observedArchitecture, meshContext });
    archaeologyGaps = gapsResult.gaps;
    emitter.emit({
      node_kind: 'pure',
      node_name: 'identify_gaps',
      duration_ms: Date.now() - gapsStart,
      pure: {
        inputs_summary: `observed_modules=${observedArchitecture.modules.length}; calm_nodes=${(meshContext.bar?.calm_model && Array.isArray((meshContext.bar.calm_model as { nodes?: unknown[] }).nodes)) ? (meshContext.bar!.calm_model as { nodes: unknown[] }).nodes.length : 0}`,
        outputs_summary: `gaps=${archaeologyGaps.length} (${archaeologyGaps.filter(g => g.severity === 'HIGH').length} HIGH); web_queries=${gapsResult.webQueries.length}`,
      },
    });

    // 4. web_research via tavily (gap-derived queries, no other providers)
    if (tavilyApiKey) {
      const webStart = Date.now();
      const web = await runTavilySearch({
        apiKey: tavilyApiKey,
        queries: gapsResult.webQueries,
        fetchImpl: opts.fetchImpl,
      });
      const perQueryMs = Math.round((Date.now() - webStart) / Math.max(1, web.envelopes.length));
      for (const envelope of web.envelopes) {
        if (envelope.error) {
          emitter.emit({
            node_kind: 'node_error',
            node_name: 'tavily_search',
            duration_ms: 0,
            error: { message: `gap-derived query="${envelope.query.slice(0, 80)}": ${envelope.error}`, retryable: true },
          });
        } else {
          emitter.emit({
            node_kind: 'pure_api',
            node_name: 'tavily_search',
            duration_ms: perQueryMs,
            api: {
              provider: 'tavily',
              endpoint: 'POST /search (archaeology gap-derived)',
              request_summary: `query="${envelope.query.slice(0, 120)}"`,
              http_status: envelope.httpStatus,
              response_byte_count: envelope.responseBytes,
            },
          });
        }
      }
      providerResultCounts.tavily = web.results.length;

      // dedupe (smaller pool — just the gap-derived web results)
      const dedupeStart = Date.now();
      rankedSources = dedupeAndRank({ results: web.results, topN: 15 });
      emitter.emit({
        node_kind: 'pure',
        node_name: 'dedupe_and_rank',
        duration_ms: Date.now() - dedupeStart,
        pure: {
          inputs_summary: `raw_results=${web.results.length}; queries=${web.envelopes.length} (gap-derived)`,
          outputs_summary: `ranked_sources=${rankedSources.length}; top_score=${rankedSources[0]?.salience_score ?? 0}`,
        },
      });
    } else {
      // No tavily key — synthesise without external grounding (still useful from the gaps alone)
      emitter.emit({
        node_kind: 'node_error',
        node_name: 'tavily_search',
        duration_ms: 0,
        error: { message: 'TAVILY_API_KEY not configured — archaeology synthesis will lack external research grounding', retryable: false },
      });
    }
  } else {
    // ============================================================================
    // RESEARCH PATH (existing): plan_queries → 4 providers → dedupe → gap-analysis
    // ============================================================================
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
    researchQueryPlan = plan.queryPlan;
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

  // Record per-provider envelopes (audit log) + collect ProviderResult[] (dedupe input).
  // providerResultCounts is declared at the top of runArcheologist so the
  // archaeology branch can populate it too.
  const allProviderResults: ProviderResult[] = [];

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
  rankedSources = dedupeAndRank({ results: allProviderResults, topN: 20 });
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
  }  // end research-path else branch

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
    path: brief.path,
    observedArchitecture,
    archaeologyGaps,
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
    queryPlan: researchQueryPlan,
    archaeologySummary: observedArchitecture
      ? `Cloned \`${observedArchitecture.profile.slug}\` @ \`${observedArchitecture.profile.cloneSha.slice(0, 12)}\`. ${observedArchitecture.profile.totalFiles} files; languages: ${observedArchitecture.profile.languages.join(', ') || 'n/a'}; frameworks: ${observedArchitecture.profile.frameworks.join(', ') || 'n/a'}; ${observedArchitecture.modules.length} modules; ${observedArchitecture.endpoints.length} endpoints; ${archaeologyGaps.length} structural gaps identified.`
      : undefined,
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
      prompt_library_version: 'phase3a',
      agent_version: opts.agentVersion,
      published_at: new Date().toISOString(),
      llm: {
        provider: brief.llm_provider,
        // synthesis runs on both paths; archaeology runs skip plan_queries so we
        // use the synthesis model id as the "primary" model for the Hatter's Tag.
        model: synthesis.llm.model,
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

  // ----- archaeology cleanup: remove the shallow clone now that synthesis is done -----
  if (cleanupCloneDir) {
    try { fs.rmSync(cleanupCloneDir, { recursive: true, force: true }); }
    catch { /* leave on disk — non-fatal, just a tmpdir entry */ }
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
    /** archaeology path only — undefined for research runs */
    archaeology_gap_count: archaeologyGaps.length || undefined,
    conclusion_count: synthesis.citation_stats.conclusion_count,
    recommendation_count: synthesis.citation_stats.recommendation_count,
  };
}

interface BuildDocOpts {
  brief: ResearchBrief;
  runId: string;
  meshSummary: string;
  meshSha: string;
  /** Research path only — undefined on archaeology runs. */
  queryPlan?: import('../schemas').QueryPlan;
  /** Archaeology path only — short repo profile summary. */
  archaeologySummary?: string;
  /** The canonical synthesis markdown body. */
  synthesisBody: string;
}

/**
 * Compose the published artifact. The preamble differs by path:
 *   research:    <metadata> + <mesh context> + <Query Plan table>
 *   archaeology: <metadata> + <mesh context> + <Target Repo Profile>
 * The synthesis body owns every H2 from the canonical section list onward.
 * The Hatter's Tag is appended separately by the PR-body path.
 */
function buildResearchDoc(opts: BuildDocOpts): string {
  const lines: string[] = [];
  lines.push(`# ${opts.brief.topic}`);
  lines.push('');
  lines.push(`- **Run id:** \`${opts.runId}\``);
  lines.push(`- **Mesh sha:** \`${opts.meshSha.slice(0, 12)}\``);
  lines.push(`- **Path:** ${opts.brief.path}${opts.brief.target_repo ? ` (\`${opts.brief.target_repo}\`)` : ''}`);
  lines.push(`- **Scope:** ${opts.brief.scope.level}${opts.brief.scope.id ? ` / ${opts.brief.scope.id}` : ''}`);
  lines.push('');
  lines.push('## Run Metadata');
  lines.push('');
  lines.push(`Scope resolved to: ${opts.meshSummary}.`);
  lines.push('');

  if (opts.queryPlan) {
    lines.push('### Query Plan (per-provider, LLM-generated)');
    lines.push('');
    lines.push('| Provider | Queries |');
    lines.push('|---|---|');
    lines.push(`| **web** (Tavily) | ${opts.queryPlan.web.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
    lines.push(`| **arxiv** | ${opts.queryPlan.arxiv.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
    lines.push(`| **patent** (USPTO) | ${opts.queryPlan.patent.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
    lines.push(`| **community** (HN) | ${opts.queryPlan.community.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
    lines.push('');
  }
  if (opts.archaeologySummary) {
    lines.push('### Target Repository Profile (analyze_architecture)');
    lines.push('');
    lines.push(opts.archaeologySummary);
    lines.push('');
  }
  // The synthesis body owns every H2 from the canonical section list onward.
  lines.push(opts.synthesisBody.trim());
  lines.push('');
  return lines.join('\n');
}

function roundUsd(n: number): number {
  return Math.round(n * 10000) / 10000;
}
