/**
 * PRD pipeline orchestrator — Phase 4.
 *
 *   validate_brief            (pure)
 *   gather_mesh_context       (pure)
 *   --- refinement loop (1..max_iterations) ---
 *     synthesize_prd          (llm)
 *     architecture_review     (llm, parallel)
 *     security_review         (llm, parallel)
 *     verify_grounding        (pure: combines LLM scores + citation parser)
 *     verdict ∈ { PASS, ITERATE, EXHAUSTED }
 *   --- end loop ---
 *   generate_prd_manifest     (pure)
 *   publish                   (pure)
 *   verify_and_trigger        (run_complete)
 *
 * Refinement loop convergence: ITERATE re-runs synthesize_prd with prior
 * review feedback. EXHAUSTED is the terminal verdict when max_iterations
 * is reached — the orchestrator still publishes with passed=false so the
 * audit trail shows the loop gave up.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrdBrief } from '../schemas';
import { gatherMeshContext } from '../mesh/mesh-reader';
import { generateRunId } from '../utils/run-id';
import { AuditEmitter } from './audit-emitter';
import { buildHattersTag } from './hatters-tag-builder';
import { synthesizePrd, type PriorReviewFeedback } from './nodes/synthesize-prd';
import { runExpertReview, type ExpertReview } from './nodes/expert-review';
import { verifyGrounding } from './nodes/verify-grounding';
import { generatePrdManifest } from './nodes/generate-prd-manifest';
import {
  deterministicArchitectureReview,
  deterministicSecurityReview,
  type DeterministicReview,
} from './nodes/deterministic-review';

/** One iteration's full reviewer signals — collected for the final score-progression table. */
interface IterationSnapshot {
  iteration: number;
  det_arch: DeterministicReview;
  det_sec: DeterministicReview;
  llm_arch: ExpertReview;
  llm_sec: ExpertReview;
  composite_score: number;
  disagreement_delta: number;
  verdict: 'PASS' | 'ITERATE' | 'EXHAUSTED';
}

export interface PrdOptions {
  brief: unknown;
  meshDir: string;
  outputDir: string;          // prds/ destination
  auditDir: string;
  emitPrBodyPath?: string;
  agentVersion: string;
  anthropicApiKey?: string;
  githubToken?: string;
  fetchImpl?: typeof fetch;
}

export interface PrdResult {
  run_id: string;
  topic: string;
  artifact_path: string;
  manifest_path: string;
  audit_log_path: string;
  chain_root_hash: string;
  pr_body_path: string | null;
  /** PASS / ITERATE / EXHAUSTED — the final verdict of verify_grounding. */
  verdict: 'PASS' | 'ITERATE' | 'EXHAUSTED';
  final_score: number;
  iterations: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
}

export async function runPrd(opts: PrdOptions): Promise<PrdResult> {
  const briefParsed = PrdBrief.safeParse(opts.brief);
  if (!briefParsed.success) {
    throw new Error(`Invalid PRD brief: ${briefParsed.error.message}`);
  }
  const brief = briefParsed.data;

  const runId = generateRunId('PRD');
  const startedAt = new Date();
  const anthropicApiKey = opts.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
  const githubToken = opts.githubToken ?? process.env.GITHUB_TOKEN ?? '';

  const absoluteAuditDir = path.resolve(opts.meshDir, opts.auditDir);
  const absoluteOutputDir = path.resolve(opts.meshDir, opts.outputDir);
  fs.mkdirSync(absoluteOutputDir, { recursive: true });

  const emitter = new AuditEmitter(absoluteAuditDir, runId);

  // ----- validate_brief -----
  emitter.emit({
    node_kind: 'pure',
    node_name: 'validate_brief',
    duration_ms: 0,
    pure: {
      inputs_summary: `scope=${brief.scope.level}${brief.scope.id ? `(${brief.scope.id})` : ''}; mode=${brief.mode}; grounding=${brief.grounding}@${brief.grounding_threshold}; max=${brief.max_iterations}`,
      outputs_summary: 'PrdBrief validated',
    },
  });

  // ----- gather_mesh_context -----
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
      outputs_summary: `bar_loaded=${!!meshContext.bar}; calm_nodes=${calmNodeCount(meshContext)}; threats=${threatCount(meshContext)}; adrs=${meshContext.bar?.adrs.length ?? 0}`,
    },
  });

  // Phase 4 doesn't load ranked sources from the research PR yet — the
  // research-source linker lands in phase 4b. For now we run with an empty
  // ranked-source list; the synthesis prompt + validator both tolerate this.
  const rankedSources: import('../schemas').RankedSource[] = [];

  // ----- refinement loop -----
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  const reviewHistory: ExpertReview[] = [];
  let priorFeedback: PriorReviewFeedback | undefined;
  let lastSynthesis: Awaited<ReturnType<typeof synthesizePrd>> | null = null;
  let lastGrounding: ReturnType<typeof verifyGrounding> | null = null;
  let verdict: 'PASS' | 'ITERATE' | 'EXHAUSTED' = 'EXHAUSTED';
  let iteration = 0;
  const snapshots: IterationSnapshot[] = [];

  for (iteration = 1; iteration <= brief.max_iterations; iteration++) {
    // --- synthesize_prd (llm) ---
    const synthStart = Date.now();
    const synthesis = await synthesizePrd({
      meshDir: opts.meshDir,
      brief,
      meshContext,
      rankedSources,
      provider: brief.llm_provider,
      anthropicApiKey,
      githubToken,
      priorFeedback,
      fetchImpl: opts.fetchImpl,
    });
    lastSynthesis = synthesis;
    totalInputTokens += synthesis.llm.inputTokens;
    totalOutputTokens += synthesis.llm.outputTokens;
    totalCostUsd += synthesis.llm.costUsd;
    emitter.emit({
      node_kind: 'llm',
      node_name: `synthesize_prd[iter${iteration}]`,
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

    // --- architect_expert_review + security_expert_review (parallel llm) ---
    const reviewStart = Date.now();
    const priorArch = findLast(reviewHistory, r => r.expert === 'architecture');
    const priorSec  = findLast(reviewHistory, r => r.expert === 'security');

    const [archResult, secResult] = await Promise.all([
      runExpertReview({
        meshDir: opts.meshDir,
        expert: 'architecture',
        iteration,
        prdBody: synthesis.body_md,
        meshContext,
        priorReview: priorArch,
        provider: brief.llm_provider,
        anthropicApiKey,
        githubToken,
        fetchImpl: opts.fetchImpl,
      }),
      runExpertReview({
        meshDir: opts.meshDir,
        expert: 'security',
        iteration,
        prdBody: synthesis.body_md,
        meshContext,
        priorReview: priorSec,
        provider: brief.llm_provider,
        anthropicApiKey,
        githubToken,
        fetchImpl: opts.fetchImpl,
      }),
    ]);
    const reviewDuration = Date.now() - reviewStart;

    totalInputTokens += archResult.llm.inputTokens + secResult.llm.inputTokens;
    totalOutputTokens += archResult.llm.outputTokens + secResult.llm.outputTokens;
    totalCostUsd += archResult.llm.costUsd + secResult.llm.costUsd;

    const llmEventName = (k: 'architecture' | 'security') =>
      k === 'architecture' ? `architect_expert_review[iter${iteration}]` : `security_expert_review[iter${iteration}]`;
    for (const r of [archResult, secResult]) {
      emitter.emit({
        node_kind: 'llm',
        node_name: llmEventName(r.review.expert),
        duration_ms: Math.round(reviewDuration / 2),
        llm: {
          provider: r.llm.provider,
          model: r.llm.model,
          prompt_pack: { path: r.prompt.packPath, sha256: r.prompt.packSha256 },
          input_tokens: r.llm.inputTokens,
          output_tokens: r.llm.outputTokens,
          cost_usd: r.llm.costUsd,
          guardrails: { mode: brief.guardrails, pre: 'PASS', post: 'PASS' },
        },
      });
    }
    reviewHistory.push(archResult.review, secResult.review);

    // --- deterministic_architecture_review + deterministic_security_review (pure, parallel) ---
    const detStart = Date.now();
    const detArch = deterministicArchitectureReview({
      iteration,
      signals: synthesis.signals,
      meshContext,
    });
    const detSec = deterministicSecurityReview({
      iteration,
      signals: synthesis.signals,
      meshContext,
    });
    const detDuration = Date.now() - detStart;
    for (const d of [detArch, detSec]) {
      emitter.emit({
        node_kind: 'pure',
        node_name: `deterministic_${d.expert}_review[iter${iteration}]`,
        duration_ms: Math.round(detDuration / 2),
        pure: {
          inputs_summary: `signals(fr=${synthesis.signals.fr_entries.length}, sr=${synthesis.signals.sr_entries.length}, coverage_rows=${synthesis.signals.coverage_rows.length})`,
          outputs_summary: `severity=${d.severity}; invalid=${d.invalid_citations.length}; discrepancies=${d.coverage_discrepancies.length}`,
        },
      });
    }

    // --- verify_grounding (pure — 4-input now) ---
    const verifyStart = Date.now();
    const grounding = verifyGrounding({
      iteration,
      threshold: brief.grounding_threshold,
      mode: brief.grounding,
      signals: synthesis.signals,
      architecture: archResult.review,
      security: secResult.review,
      det_architecture: detArch,
      det_security: detSec,
      meshContext,
      history: reviewHistory.slice(0, -2),
    });
    lastGrounding = grounding;
    verdict = grounding.verdict;
    emitter.emit({
      node_kind: 'pure',
      node_name: `verify_grounding[iter${iteration}]`,
      duration_ms: Date.now() - verifyStart,
      pure: {
        inputs_summary: `arch=${archResult.review.score}/${archResult.review.severity}; sec=${secResult.review.score}/${secResult.review.severity}; det_arch=${detArch.severity}; det_sec=${detSec.severity}; threshold=${brief.grounding_threshold}`,
        outputs_summary: `verdict=${verdict}; composite=${grounding.grounding.final_score}; disagreement=${grounding.signals_snapshot.disagreement_delta}; reason="${grounding.reason.slice(0, 200)}"`,
      },
    });

    // --- iteration_summary (new audit event variant) ---
    snapshots.push({
      iteration,
      det_arch: detArch,
      det_sec: detSec,
      llm_arch: archResult.review,
      llm_sec: secResult.review,
      composite_score: grounding.signals_snapshot.composite_score,
      disagreement_delta: grounding.signals_snapshot.disagreement_delta,
      verdict,
    });
    emitter.emit({
      node_kind: 'iteration_summary',
      node_name: `iteration_summary[iter${iteration}]`,
      duration_ms: 0,
      iteration,
      summary: {
        det_arch: {
          severity: detArch.severity,
          invalid_citations: detArch.invalid_citations.length,
          coverage_discrepancies: detArch.coverage_discrepancies.length,
        },
        det_sec: {
          severity: detSec.severity,
          invalid_citations: detSec.invalid_citations.length,
          coverage_discrepancies: detSec.coverage_discrepancies.length,
        },
        llm_arch: { score: archResult.review.score, severity: archResult.review.severity },
        llm_sec:  { score: secResult.review.score,  severity: secResult.review.severity },
        composite_score: grounding.signals_snapshot.composite_score,
        disagreement_delta: grounding.signals_snapshot.disagreement_delta,
        verdict,
        reason: grounding.reason.slice(0, 500),
      },
    });

    if (verdict === 'PASS') { break; }

    // Compose the next iteration's feedback from ALL 4 reviewers.
    priorFeedback = {
      iteration,
      architecture: { score: archResult.review.score, severity: archResult.review.severity, changes: archResult.review.changes },
      security:     { score: secResult.review.score,  severity: secResult.review.severity,  changes: secResult.review.changes },
      det_architecture: {
        severity: detArch.severity,
        invalid_citations: detArch.invalid_citations,
        coverage_discrepancies: detArch.coverage_discrepancies.map(d => ({
          premise: d.premise, claimed_status: String(d.claimed_status), detail: d.detail,
        })),
      },
      det_security: {
        severity: detSec.severity,
        invalid_citations: detSec.invalid_citations,
        coverage_discrepancies: detSec.coverage_discrepancies.map(d => ({
          premise: d.premise, claimed_status: String(d.claimed_status), detail: d.detail,
        })),
      },
      disagreement_delta: grounding.signals_snapshot.disagreement_delta,
    };
  }

  // Hit max_iterations without PASS → EXHAUSTED
  if (verdict !== 'PASS') { verdict = 'EXHAUSTED'; }
  if (!lastSynthesis || !lastGrounding) {
    throw new Error('PRD pipeline: no synthesis completed (refinement loop did not run)');
  }

  // ----- generate_prd_manifest (pure) -----
  const manifestStart = Date.now();
  const manifest = generatePrdManifest({
    runId,
    brief,
    meshContext,
    prdBody: lastSynthesis.body_md,
    signals: lastSynthesis.signals,
    grounding: lastGrounding.grounding,
    threshold: brief.grounding_threshold,
  });
  emitter.emit({
    node_kind: 'pure',
    node_name: 'generate_prd_manifest',
    duration_ms: Date.now() - manifestStart,
    pure: {
      inputs_summary: `iteration=${iteration - (verdict === 'PASS' ? 0 : 0)}; verdict=${verdict}; threshold=${brief.grounding_threshold}`,
      outputs_summary: `endpoints=${manifest.endpoints.length}; security_reqs=${manifest.security_requirements.length}; target_repos=${manifest.target_repos.length}; grounding.passed=${manifest.grounding.passed}`,
    },
  });

  // ----- publish (pure) -----
  const topic = manifest.prd_topic;
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'prd';
  const today = startedAt.toISOString().slice(0, 10);
  const artifactPath = path.join(absoluteOutputDir, `${slug}-${today}.md`);
  const manifestPath = path.join(absoluteOutputDir, `${slug}-${today}.manifest.json`);

  const bodyMd = composePrdDoc({
    runId,
    meshSha: meshContext.mesh_sha,
    brief,
    verdict,
    iterations: lastGrounding.grounding.final_iteration,
    finalScore: lastGrounding.grounding.final_score,
    synthesisBody: lastSynthesis.body_md,
    snapshots,
  });

  const writeStart = Date.now();
  fs.writeFileSync(artifactPath, bodyMd, 'utf8');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  emitter.emit({
    node_kind: 'pure',
    node_name: 'publish',
    duration_ms: Date.now() - writeStart,
    pure: {
      inputs_summary: `wrote ${path.basename(artifactPath)} + ${path.basename(manifestPath)}`,
      outputs_summary: `${bodyMd.length} bytes md + manifest`,
    },
  });

  // ----- run_complete -----
  const complete = emitter.emitRunComplete({
    node_kind: 'run_complete',
    node_name: 'verify_and_trigger',
    duration_ms: Date.now() - startedAt.getTime(),
    outcome: {
      status: verdict === 'PASS' ? 'ok' : 'partial',
      mesh_sha: meshContext.mesh_sha,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_cost_usd: roundUsd(totalCostUsd),
      artifact_paths: [
        path.relative(opts.meshDir, artifactPath),
        path.relative(opts.meshDir, manifestPath),
      ],
    },
  });

  // ----- optional PR body -----
  let prBodyPath: string | null = null;
  if (opts.emitPrBodyPath) {
    const hattersTag = buildHattersTag({
      run_id: runId,
      mesh_sha: meshContext.mesh_sha,
      prompt_library_version: 'phase4',
      agent_version: opts.agentVersion,
      published_at: new Date().toISOString(),
      llm: {
        provider: brief.llm_provider,
        model: lastSynthesis.llm.model,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cost_usd: roundUsd(totalCostUsd),
      },
      guardrails: { mode: brief.guardrails, blocks: 0, warns: 0 },
      grounding: {
        final_score: lastGrounding.grounding.final_score,
        threshold: brief.grounding_threshold,
        iterations: lastGrounding.grounding.final_iteration,
        passed: lastGrounding.grounding.passed,
      },
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
    verdict,
    final_score: lastGrounding.grounding.final_score,
    iterations: lastGrounding.grounding.final_iteration,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    total_cost_usd: roundUsd(totalCostUsd),
  };
}

// ============================================================================
// helpers
// ============================================================================

function calmNodeCount(mesh: import('../schemas').MeshContext): number {
  const calm = mesh.bar?.calm_model;
  if (!calm || typeof calm !== 'object') { return 0; }
  const nodes = (calm as { nodes?: unknown[] }).nodes;
  return Array.isArray(nodes) ? nodes.length : 0;
}

function threatCount(mesh: import('../schemas').MeshContext): number {
  const t = mesh.bar?.threats;
  return Array.isArray(t) ? t.length : 0;
}

function findLast<T>(arr: T[], pred: (v: T) => boolean): T | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) { return arr[i]; }
  }
  return undefined;
}

function roundUsd(n: number): number {
  return Math.round(n * 10000) / 10000;
}

interface ComposeDocOpts {
  runId: string;
  meshSha: string;
  brief: import('../schemas').PrdBrief;
  verdict: 'PASS' | 'ITERATE' | 'EXHAUSTED';
  iterations: number;
  finalScore: number;
  synthesisBody: string;
  /** Per-iteration reviewer snapshots — rendered as the 4-column progression table. */
  snapshots: IterationSnapshot[];
}

/**
 * Compose the published artifact:
 *   <metadata header (verdict + score + iterations)>
 *   <H2 "Refinement Loop Trace" + 4-column score-progression table>
 *   <synthesis body — H2 Input Premises through H2 References>
 * Hatter's Tag is appended separately by the PR-body path.
 */
function composePrdDoc(opts: ComposeDocOpts): string {
  const lines: string[] = [];
  lines.push(`- **Run id:** \`${opts.runId}\``);
  lines.push(`- **Mesh sha:** \`${opts.meshSha.slice(0, 12)}\``);
  lines.push(`- **Scope:** ${opts.brief.scope.level}${opts.brief.scope.id ? ` / ${opts.brief.scope.id}` : ''}`);
  lines.push(`- **Grounding verdict:** ${opts.verdict} (final score ${opts.finalScore.toFixed(4)} after ${opts.iterations} iteration${opts.iterations === 1 ? '' : 's'})`);
  lines.push('');
  if (opts.snapshots.length > 0) {
    lines.push('## Refinement Loop Trace');
    lines.push('');
    lines.push('| Iter | det_arch | det_sec | llm_arch | llm_sec | composite | Δ | verdict |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const s of opts.snapshots) {
      const archLlm = `${s.llm_arch.score.toFixed(2)} / ${s.llm_arch.severity}`;
      const secLlm  = `${s.llm_sec.score.toFixed(2)} / ${s.llm_sec.severity}`;
      const archDet = `${s.det_arch.severity}${s.det_arch.invalid_citations.length > 0 ? ` (×${s.det_arch.invalid_citations.length} bad cites)` : ''}`;
      const secDet  = `${s.det_sec.severity}${s.det_sec.invalid_citations.length > 0 ? ` (×${s.det_sec.invalid_citations.length} bad cites)` : ''}`;
      lines.push(`| ${s.iteration} | ${archDet} | ${secDet} | ${archLlm} | ${secLlm} | ${s.composite_score.toFixed(4)} | ${s.disagreement_delta.toFixed(2)} | ${s.verdict} |`);
    }
    lines.push('');
  }
  lines.push(opts.synthesisBody.trim());
  lines.push('');
  return lines.join('\n');
}
