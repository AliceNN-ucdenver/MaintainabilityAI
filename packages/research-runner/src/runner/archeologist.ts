/**
 * Archeologist pipeline orchestrator — Phase 2b.
 *
 * Wires nodes for the research path:
 *   validate_brief    (pure)
 *   gather_mesh_context (pure)
 *   plan_queries      (LLM)        ← phase 2b
 *   tavily_search × 5 (pure_api)   ← phase 2b
 *   dedupe_and_rank   (pure)       ← phase 2b
 *   synthesize_report (LLM)        ← stub until phase 2c
 *   publish           (pure)
 *   verify_and_trigger (run_complete)
 *
 * The synthesise step is still a stub — phase 2c replaces it with the real
 * Anthropic call against `.caterpillar/prompts/research/synthesis.md`. For
 * now the published doc lists the ranked sources so a reviewer can see the
 * search pipeline worked.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ResearchBrief, type RankedSource } from '../schemas';
import { gatherMeshContext } from '../mesh/mesh-reader';
import { generateRunId } from '../utils/run-id';
import { AuditEmitter } from './audit-emitter';
import { buildHattersTag } from './hatters-tag-builder';
import { planQueries } from './nodes/plan-queries';
import { runTavilySearch } from './nodes/tavily-search';
import { dedupeAndRank } from './nodes/dedupe-and-rank';

export interface ArcheologistOptions {
  brief: unknown;             // unvalidated input from CLI / workflow inputs
  meshDir: string;            // mesh repo root
  outputDir: string;          // research/ destination (relative to meshDir)
  auditDir: string;           // .research-audit/ destination (relative to meshDir)
  emitPrBodyPath?: string;    // absolute path to write the PR body markdown
  agentVersion: string;       // injected by CLI (from package.json)
  /** API keys — defaults read from process.env. */
  anthropicApiKey?: string;
  tavilyApiKey?: string;
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
  const tavilyApiKey = opts.tavilyApiKey ?? process.env.TAVILY_API_KEY ?? '';

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
    apiKey: anthropicApiKey,
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
      provider: 'anthropic',
      model: plan.llm.model,
      prompt_pack: { path: plan.prompt.packPath, sha256: plan.prompt.packSha256 },
      input_tokens: plan.llm.inputTokens,
      output_tokens: plan.llm.outputTokens,
      cost_usd: plan.llm.costUsd,
      guardrails: { mode: brief.guardrails, pre: 'PASS', post: 'PASS' },
    },
  });

  // ----- tavily_search × 5 (pure_api each) -----
  const searchStart = Date.now();
  const searchResult = await runTavilySearch({
    apiKey: tavilyApiKey,
    queries: plan.queryPlan.web,
    fetchImpl: opts.fetchImpl,
  });
  const searchDuration = Date.now() - searchStart;
  for (const envelope of searchResult.envelopes) {
    if (envelope.error) {
      emitter.emit({
        node_kind: 'node_error',
        node_name: 'tavily_search',
        duration_ms: 0,
        error: { message: `query="${envelope.query.slice(0, 80)}": ${envelope.error}`, retryable: true },
      });
    } else {
      emitter.emit({
        node_kind: 'pure_api',
        node_name: 'tavily_search',
        duration_ms: Math.round(searchDuration / Math.max(1, searchResult.envelopes.length)),
        api: {
          provider: 'tavily',
          endpoint: 'POST /search',
          request_summary: `query="${envelope.query.slice(0, 120)}"`,
          http_status: envelope.httpStatus,
          response_byte_count: envelope.responseBytes,
        },
      });
    }
  }

  // ----- dedupe_and_rank (pure) -----
  const dedupeStart = Date.now();
  const rankedSources: RankedSource[] = dedupeAndRank({
    allResults: searchResult.allResults,
    topN: 20,
  });
  emitter.emit({
    node_kind: 'pure',
    node_name: 'dedupe_and_rank',
    duration_ms: Date.now() - dedupeStart,
    pure: {
      inputs_summary: `raw_results=${searchResult.allResults.length}; queries=${searchResult.envelopes.length}`,
      outputs_summary: `ranked_sources=${rankedSources.length}; top_score=${rankedSources[0]?.salience_score ?? 0}`,
    },
  });

  // ----- synthesize_report (LLM) — STUB until phase 2c -----
  emitter.emit({
    node_kind: 'pure',
    node_name: 'phase2b_stub_synthesize',
    duration_ms: 0,
    pure: {
      inputs_summary: `ranked_sources=${rankedSources.length}; mesh_context loaded`,
      outputs_summary: 'placeholder synthesis body; real LLM call lands in phase 2c',
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
    rankedSources,
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
      prompt_library_version: 'phase2b-stub',
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
  };
}

interface BuildDocOpts {
  brief: ResearchBrief;
  runId: string;
  meshSummary: string;
  meshSha: string;
  queryPlan: import('../schemas').QueryPlan;
  rankedSources: RankedSource[];
}

function buildResearchDoc(opts: BuildDocOpts): string {
  const lines: string[] = [];
  lines.push(`# ${opts.brief.topic}`);
  lines.push('');
  lines.push('> **Phase 2b** — plan_queries + tavily_search + dedupe_and_rank are live. The Source Premises section below is populated from real Tavily results. Synthesis (Executive Summary, Cross-Source Analysis, etc.) lands in phase 2c when the synthesize_report LLM node ships.');
  lines.push('');
  lines.push(`- **Run id:** \`${opts.runId}\``);
  lines.push(`- **Mesh sha:** \`${opts.meshSha.slice(0, 12)}\``);
  lines.push(`- **Scope:** ${opts.brief.scope.level}${opts.brief.scope.id ? ` / ${opts.brief.scope.id}` : ''}`);
  lines.push('');
  lines.push('## Mesh Context (read by gather_mesh_context)');
  lines.push('');
  lines.push(`Scope resolved to: ${opts.meshSummary}.`);
  lines.push('');
  lines.push('## Query Plan (plan_queries)');
  lines.push('');
  lines.push('Generated by the LLM, per-provider tuned:');
  lines.push('');
  lines.push('| Provider | Queries |');
  lines.push('|---|---|');
  lines.push(`| **web** (Tavily) | ${opts.queryPlan.web.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
  lines.push(`| **arxiv** | ${opts.queryPlan.arxiv.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
  lines.push(`| **patent** (USPTO) | ${opts.queryPlan.patent.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
  lines.push(`| **community** (HN) | ${opts.queryPlan.community.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
  lines.push('');
  lines.push('_(arxiv / patent / community searches land in phase 2d; phase 2b is web-only)_');
  lines.push('');
  lines.push('## Source Premises');
  lines.push('');
  if (opts.rankedSources.length === 0) {
    lines.push('_No web results returned for any of the planned queries. Check that TAVILY_API_KEY is configured and the queries are reasonable._');
  } else {
    for (const s of opts.rankedSources) {
      lines.push(`**${s.id}** — ${escapeMd(s.title)}`);
      lines.push(`- URL: ${s.url}`);
      lines.push(`- Salience: ${s.salience_score} · Provider: ${s.provider} · Retrieved: ${s.retrieved_at}`);
      if (s.published_at) { lines.push(`- Published: ${s.published_at}`); }
      if (s.excerpt) { lines.push(`- Excerpt: ${escapeMd(s.excerpt.slice(0, 280))}${s.excerpt.length > 280 ? '…' : ''}`); }
      lines.push('');
    }
  }
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('_(phase 2c LLM synthesis)_');
  lines.push('');
  return lines.join('\n');
}

function escapeMd(s: string): string {
  return s.replace(/[*_`[\]]/g, c => `\\${c}`);
}

function roundUsd(n: number): number {
  return Math.round(n * 10000) / 10000;
}
