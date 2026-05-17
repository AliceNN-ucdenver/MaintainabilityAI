/**
 * PRD pipeline orchestrator — Phase 1 stub.
 *
 * Same shape as runArcheologist: validates the brief, emits audit events,
 * writes a placeholder PRD, closes the chain. Real synthesis + parallel
 * expert reviews + refinement loop land in Phase 4.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrdBrief } from '../schemas';
import { generateRunId } from '../utils/run-id';
import { AuditEmitter } from './audit-emitter';
import { buildHattersTag } from './hatters-tag-builder';

export interface PrdOptions {
  brief: unknown;
  meshDir: string;
  outputDir: string;          // prds/ destination
  auditDir: string;
  emitPrBodyPath?: string;
  agentVersion: string;
}

export interface PrdResult {
  run_id: string;
  topic: string;
  artifact_path: string;
  manifest_path: string;
  audit_log_path: string;
  chain_root_hash: string;
  pr_body_path: string | null;
  final_score: number;
  iterations: number;
}

export async function runPrd(opts: PrdOptions): Promise<PrdResult> {
  const parsed = PrdBrief.safeParse(opts.brief);
  if (!parsed.success) {
    throw new Error(`Invalid PRD brief: ${parsed.error.message}`);
  }
  const brief = parsed.data;

  const runId = generateRunId('PRD');
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
      inputs_summary: `scope=${brief.scope.level}${brief.scope.id ? `(${brief.scope.id})` : ''}; mode=${brief.mode}; grounding=${brief.grounding}@${brief.grounding_threshold}`,
      outputs_summary: 'PrdBrief validated',
    },
  });

  emitter.emit({
    node_kind: 'pure',
    node_name: 'phase1_stub_synthesize_prd',
    duration_ms: 0,
    pure: {
      inputs_summary: 'phase 1 stub — no LLM call',
      outputs_summary: 'placeholder PrdDoc + grounding block produced',
    },
  });

  // Derive a topic placeholder from the research_source identifier
  const topic = brief.research_source.kind === 'pr'
    ? `PRD for ${brief.research_source.url}`
    : `PRD for ${brief.research_source.relative_path}`;

  const today = startedAt.toISOString().slice(0, 10);
  const slug = `prd-${today}-${runId.slice(-8)}`;
  const artifactPath = path.join(absoluteOutputDir, `${slug}.md`);
  const manifestPath = path.join(absoluteOutputDir, `${slug}.manifest.json`);

  const bodyMd = [
    `# ${topic}`,
    '',
    '> **Phase 1 stub** — runner is scaffold-only. Phase 4 will populate this with `## Input Premises`, `## Functional Requirements with Traceability`, `## Security Requirements with Threat Tracing`, `## Coverage Analysis`, and the rest of the canonical PRD sections.',
    '',
    `- **Run id:** \`${runId}\``,
    `- **Scope:** ${brief.scope.level}${brief.scope.id ? ` / ${brief.scope.id}` : ''}`,
    `- **Mode:** ${brief.mode}`,
    `- **Grounding:** ${brief.grounding} @ ${brief.grounding_threshold}`,
    `- **Max iterations:** ${brief.max_iterations}`,
    '',
  ].join('\n');

  fs.writeFileSync(artifactPath, bodyMd, 'utf8');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      run_id: runId,
      prd_topic: topic,
      mesh_sha: '0000000',
      target_repos: ['placeholder/repo'],
      endpoints: [],
      security_requirements: [],
      grounding: { final_score: 0, threshold: brief.grounding_threshold, iterations: 0, passed: false },
    }, null, 2) + '\n',
    'utf8',
  );

  emitter.emit({
    node_kind: 'pure',
    node_name: 'publish_stub',
    duration_ms: 0,
    pure: {
      inputs_summary: `wrote ${path.basename(artifactPath)} + ${path.basename(manifestPath)}`,
      outputs_summary: `${bodyMd.length} bytes md + manifest`,
    },
  });

  const complete = emitter.emitRunComplete({
    node_kind: 'run_complete',
    node_name: 'verify_and_trigger',
    duration_ms: Date.now() - startedAt.getTime(),
    outcome: {
      status: 'ok',
      mesh_sha: '0000000',
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
      artifact_paths: [
        path.relative(opts.meshDir, artifactPath),
        path.relative(opts.meshDir, manifestPath),
      ],
    },
  });

  let prBodyPath: string | null = null;
  if (opts.emitPrBodyPath) {
    const hattersTag = buildHattersTag({
      run_id: runId,
      mesh_sha: '0000000',
      prompt_library_version: 'phase1-stub',
      agent_version: opts.agentVersion,
      published_at: new Date().toISOString(),
      llm: { provider: brief.llm_provider, model: 'none', input_tokens: 0, output_tokens: 0, cost_usd: 0 },
      guardrails: { mode: brief.guardrails, blocks: 0, warns: 0 },
      grounding: { final_score: 0, threshold: brief.grounding_threshold, iterations: 0, passed: false },
      audit: {
        event_count: complete.event_id,
        chain_root_hash: complete.outcome.chain_root_hash,
        audit_log_path: path.relative(opts.meshDir, emitter.path),
      },
    });
    fs.writeFileSync(opts.emitPrBodyPath, `${bodyMd}\n\n${hattersTag}`, 'utf8');
    prBodyPath = opts.emitPrBodyPath;
  }

  return {
    run_id: runId,
    topic,
    artifact_path: artifactPath,
    manifest_path: manifestPath,
    audit_log_path: emitter.path,
    chain_root_hash: complete.outcome.chain_root_hash,
    pr_body_path: prBodyPath,
    final_score: 0,
    iterations: 0,
  };
}
