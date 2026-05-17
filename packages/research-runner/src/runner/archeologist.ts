/**
 * Archeologist pipeline orchestrator — Phase 1 stub.
 *
 * Wires up validate_brief + audit emission + a placeholder run_complete so
 * the workflow can be smoke-tested end-to-end on a real mesh. Subsequent
 * phases will replace the body of `run()` with the real node graph
 * (plan_queries → search → dedupe → synthesize → publish).
 *
 * The stub deliberately does NOT call any LLM or search API. It produces an
 * obvious placeholder research doc so reviewers can see the publish path
 * works before we add network nodes.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ResearchBrief } from '../schemas';
import { gatherMeshContext } from '../mesh/mesh-reader';
import { generateRunId } from '../utils/run-id';
import { AuditEmitter } from './audit-emitter';
import { buildHattersTag } from './hatters-tag-builder';

export interface ArcheologistOptions {
  brief: unknown;             // unvalidated input from CLI / workflow inputs
  meshDir: string;            // mesh repo root
  outputDir: string;          // research/ destination (relative to meshDir)
  auditDir: string;           // .research-audit/ destination (relative to meshDir)
  emitPrBodyPath?: string;    // absolute path to write the PR body markdown
  agentVersion: string;       // injected by CLI (from package.json)
}

export interface ArcheologistResult {
  run_id: string;
  topic: string;
  artifact_path: string;      // absolute path to the published md
  audit_log_path: string;     // absolute path to the JSONL
  chain_root_hash: string;
  pr_body_path: string | null;
}

export async function runArcheologist(opts: ArcheologistOptions): Promise<ArcheologistResult> {
  // ----- Phase 1: validate_brief (pure) -----
  const briefParsed = ResearchBrief.safeParse(opts.brief);
  if (!briefParsed.success) {
    throw new Error(`Invalid research brief: ${briefParsed.error.message}`);
  }
  const brief = briefParsed.data;

  const runId = generateRunId('RES');
  const startedAt = new Date();

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

  // ----- Phase 1 placeholder: synthesize_report (skipped) -----
  // Real synthesis lands in Phase 2b. For now emit a sentinel `pure` event
  // and write a placeholder research doc so the publish path can be observed.
  emitter.emit({
    node_kind: 'pure',
    node_name: 'phase1_stub_synthesize',
    duration_ms: 0,
    pure: {
      inputs_summary: 'phase 1 stub — no LLM call (mesh context available)',
      outputs_summary: 'placeholder ResearchDoc body produced',
    },
  });

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

  const bodyMd = [
    `# ${brief.topic}`,
    '',
    '> **Phase 2a stub** — `gather_mesh_context` is live; the LLM synthesis nodes land in Phase 2b. The mesh context summary below proves the runner can read the mesh; the source/synthesis sections will be populated by the real Tavily + Anthropic calls in the next phase.',
    '',
    `- **Run id:** \`${runId}\``,
    `- **Mesh sha:** \`${meshContext.mesh_sha.slice(0, 12)}\``,
    `- **Scope:** ${brief.scope.level}${brief.scope.id ? ` / ${brief.scope.id}` : ''}`,
    `- **Path:** ${brief.path}`,
    `- **Triggered by:** ${brief.trigger.kind}${brief.trigger.actor ? ` (${brief.trigger.actor})` : ''}`,
    '',
    '## Mesh Context (read by gather_mesh_context)',
    '',
    `Scope resolved to: ${meshSummary}.`,
    '',
    '## Source Premises',
    '',
    '_(phase 2b will populate this section with ranked Tavily / arXiv / USPTO / HN results)_',
    '',
    '## Executive Summary',
    '',
    '_(phase 2b LLM synthesis)_',
    '',
  ].join('\n');

  // ----- Phase 1 placeholder: publish (still pure — just writes the file) -----
  const writeStart = Date.now();
  fs.writeFileSync(artifactPath, bodyMd, 'utf8');
  emitter.emit({
    node_kind: 'pure',
    node_name: 'publish_stub',
    duration_ms: Date.now() - writeStart,
    pure: {
      inputs_summary: `wrote ${artifactPath}`,
      outputs_summary: `${bodyMd.length} bytes`,
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
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
      artifact_paths: [path.relative(opts.meshDir, artifactPath)],
    },
  });

  // ----- Optionally append a PR body that wraps the artifact + Hatter's Tag -----
  let prBodyPath: string | null = null;
  if (opts.emitPrBodyPath) {
    const hattersTag = buildHattersTag({
      run_id: runId,
      mesh_sha: meshContext.mesh_sha,
      prompt_library_version: 'phase2a-stub',
      agent_version: opts.agentVersion,
      published_at: new Date().toISOString(),
      llm: { provider: brief.llm_provider, model: 'none', input_tokens: 0, output_tokens: 0, cost_usd: 0 },
      guardrails: { mode: brief.guardrails, blocks: 0, warns: 0 },
      audit: {
        event_count: complete.event_id,
        chain_root_hash: complete.outcome.chain_root_hash,
        audit_log_path: path.relative(opts.meshDir, emitter.path),
      },
    });
    const prBody = [
      bodyMd,
      '',
      hattersTag,
    ].join('\n');
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
  };
}
