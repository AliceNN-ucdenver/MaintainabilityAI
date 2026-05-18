/**
 * End-to-end smoke for the PRD orchestrator. Mocks Anthropic to route by
 * prompt content:
 *   synthesize_prd prompt    → returns the canonical PRD body
 *   architecture_review prompt → returns SCORE/SEVERITY/COVERED/MISSING/CHANGES
 *   security_review prompt   → same shape, scored similarly
 *
 * Two scenarios:
 *   1. PASS on iteration 1 (both expert scores high enough that composite ≥ threshold)
 *   2. ITERATE then PASS on iteration 2 (first round low, second round high)
 *
 * The fixture mesh is seeded with the four PRD prompt packs the orchestrator
 * loads (`prd/synthesis.md`, `prd/architecture-review.md`, `prd/security-review.md`).
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runPrd } from './prd';
import { readAuditLog, verifyChain } from './audit-emitter';
import {
  buildFixtureMesh,
  destroyFixtureMesh,
  seedFixturePromptPack,
} from '../mesh/__test-helpers__/fixture-mesh';
import { CANONICAL_PRD_BODY } from './nodes/__test-helpers__/canonical-prd';

function seedPrdPrompts(handle: ReturnType<typeof buildFixtureMesh>): void {
  seedFixturePromptPack(handle, 'prd/synthesis');
  seedFixturePromptPack(handle, 'prd/architecture-review');
  seedFixturePromptPack(handle, 'prd/security-review');
}

interface ScoreSequence {
  /** Architecture review score per iteration (0-indexed). */
  architecture: number[];
  /** Security review score per iteration. */
  security: number[];
  /** Architecture severities per iteration. Default PASS. */
  archSeverity?: ('PASS' | 'MINOR' | 'MAJOR' | 'BLOCKING')[];
  /** Security severities per iteration. Default PASS. */
  secSeverity?: ('PASS' | 'MINOR' | 'MAJOR' | 'BLOCKING')[];
}

/** Routing mock — picks synth vs arch-review vs sec-review by prompt content. */
function buildAnthropicMock(scores: ScoreSequence): typeof fetch {
  let archIter = 0;
  let secIter = 0;
  return async (_url, init) => {
    const body = JSON.parse(String((init as RequestInit).body));
    const sys = body.system as string;
    const userPrompt = body.messages?.[0]?.content as string || '';

    if (sys?.includes('senior architect') || userPrompt.includes('Architecture Review')) {
      const i = Math.min(archIter, scores.architecture.length - 1);
      const score = scores.architecture[i];
      const sev = scores.archSeverity?.[i] ?? 'PASS';
      archIter += 1;
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: reviewResponse(score, sev, 'celeb-api', 'celeb-db', 'Tighten FR-01') }],
        usage: { input_tokens: 800, output_tokens: 120 },
      }), { status: 200 });
    }
    if (sys?.includes('senior application-security') || userPrompt.includes('Security Review')) {
      const i = Math.min(secIter, scores.security.length - 1);
      const score = scores.security[i];
      const sev = scores.secSeverity?.[i] ?? 'PASS';
      secIter += 1;
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: reviewResponse(score, sev, 'THR-001', 'A07', 'Add rate-limit to SR-02') }],
        usage: { input_tokens: 800, output_tokens: 120 },
      }), { status: 200 });
    }
    // Default: synthesize_prd → return canonical body
    return new Response(JSON.stringify({
      content: [{ type: 'text', text: CANONICAL_PRD_BODY }],
      usage: { input_tokens: 3000, output_tokens: 1500 },
    }), { status: 200 });
  };
}

function reviewResponse(score: number, severity: string, coveredA: string, coveredB: string, change: string): string {
  return `SCORE: ${score}
SEVERITY: ${severity}
COVERED: ${coveredA}, ${coveredB}
MISSING:
CHANGES:
- ${change}
`;
}

// ============================================================================
// scenarios
// ============================================================================

test('runPrd: PASS on iteration 1 when both reviews score high', async () => {
  const handle = buildFixtureMesh();
  seedPrdPrompts(handle);
  try {
    const fetchImpl = buildAnthropicMock({
      architecture: [0.95],
      security: [0.95],
    });
    const result = await runPrd({
      brief: {
        research_source: { kind: 'pr', url: 'https://github.com/x/y/pull/42' },
        scope: { level: 'bar', id: 'APP-INS-001' },
        mode: 'deep', grounding: 'default', grounding_threshold: 0.85, max_iterations: 3,
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'prds',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
      anthropicApiKey: 'sk-test',
      fetchImpl,
    });

    assert.equal(result.verdict, 'PASS');
    assert.equal(result.iterations, 1);
    assert.ok(result.final_score >= 0.85);
    assert.ok(fs.existsSync(result.artifact_path));
    assert.ok(fs.existsSync(result.manifest_path));

    const manifest = JSON.parse(fs.readFileSync(result.manifest_path, 'utf8'));
    assert.equal(manifest.grounding.passed, true);
    assert.equal(manifest.run_id, result.run_id);
    assert.ok(manifest.endpoints.length >= 1);
    assert.ok(manifest.security_requirements.length >= 1);

    const events = readAuditLog(result.audit_log_path);
    assert.ok(events);
    // One synth + two parallel reviews + one verify per iteration; PASS on iter 1.
    const nodeNames = events!.map(e => e.node_name);
    assert.ok(nodeNames.includes('synthesize_prd[iter1]'));
    assert.ok(nodeNames.includes('architect_expert_review[iter1]'));
    assert.ok(nodeNames.includes('security_expert_review[iter1]'));
    assert.ok(nodeNames.includes('deterministic_architecture_review[iter1]'));
    assert.ok(nodeNames.includes('deterministic_security_review[iter1]'));
    assert.ok(nodeNames.includes('verify_grounding[iter1]'));
    assert.ok(nodeNames.includes('iteration_summary[iter1]'));
    assert.ok(nodeNames.includes('generate_prd_manifest'));
    assert.equal(events![events!.length - 1].node_kind, 'run_complete');
    assert.equal(verifyChain(events!), result.chain_root_hash);

    // iteration_summary event carries the 4 reviewer signals
    const iterSummary = events!.find(e => e.node_kind === 'iteration_summary' && e.node_name === 'iteration_summary[iter1]');
    assert.ok(iterSummary, 'iteration_summary event missing');
    if (iterSummary && iterSummary.node_kind === 'iteration_summary') {
      assert.equal(iterSummary.summary.verdict, 'PASS');
      assert.equal(iterSummary.summary.det_arch.severity, 'PASS');
      assert.equal(iterSummary.summary.det_sec.severity, 'PASS');
      assert.ok(iterSummary.summary.composite_score >= 0.85);
    }

    // Published PRD body carries the 4-column score-progression table
    const publishedBody = fs.readFileSync(result.artifact_path, 'utf8');
    assert.match(publishedBody, /## Refinement Loop Trace/);
    assert.match(publishedBody, /\| Iter \| det_arch \| det_sec \| llm_arch \| llm_sec \| composite \| Δ \| verdict \|/);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runPrd: ITERATE then PASS — refinement loop reruns synthesis with feedback', async () => {
  const handle = buildFixtureMesh();
  seedPrdPrompts(handle);
  try {
    const fetchImpl = buildAnthropicMock({
      architecture: [0.5, 0.95],
      security:     [0.5, 0.95],
      archSeverity: ['MAJOR', 'MINOR'],
      secSeverity:  ['MAJOR', 'MINOR'],
    });
    const result = await runPrd({
      brief: {
        research_source: { kind: 'pr', url: 'https://github.com/x/y/pull/42' },
        scope: { level: 'bar', id: 'APP-INS-001' },
        mode: 'deep', grounding: 'default', grounding_threshold: 0.85, max_iterations: 3,
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'prds',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
      anthropicApiKey: 'sk-test',
      fetchImpl,
    });

    assert.equal(result.verdict, 'PASS');
    assert.equal(result.iterations, 2);

    const events = readAuditLog(result.audit_log_path);
    const nodeNames = events!.map(e => e.node_name);
    // Both iterations emitted their own synth + 4 reviews + verify + iteration_summary events
    for (const n of [
      'synthesize_prd[iter1]', 'architect_expert_review[iter1]', 'security_expert_review[iter1]',
      'deterministic_architecture_review[iter1]', 'deterministic_security_review[iter1]',
      'verify_grounding[iter1]', 'iteration_summary[iter1]',
      'synthesize_prd[iter2]', 'architect_expert_review[iter2]', 'security_expert_review[iter2]',
      'deterministic_architecture_review[iter2]', 'deterministic_security_review[iter2]',
      'verify_grounding[iter2]', 'iteration_summary[iter2]',
    ]) {
      assert.ok(nodeNames.includes(n), `missing expected event: ${n}`);
    }
    assert.equal(verifyChain(events!), result.chain_root_hash);

    // The 4-column trace renders both rows
    const publishedBody = fs.readFileSync(result.artifact_path, 'utf8');
    const traceRows = publishedBody.match(/^\| [12] \|/gm);
    assert.equal(traceRows?.length, 2, 'expected one trace row per iteration');
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runPrd: EXHAUSTED when max_iterations reached without PASS', async () => {
  const handle = buildFixtureMesh();
  seedPrdPrompts(handle);
  try {
    const fetchImpl = buildAnthropicMock({
      architecture: [0.4, 0.4],
      security:     [0.4, 0.4],
      archSeverity: ['MAJOR', 'MAJOR'],
      secSeverity:  ['MAJOR', 'MAJOR'],
    });
    const result = await runPrd({
      brief: {
        research_source: { kind: 'pr', url: 'https://github.com/x/y/pull/42' },
        scope: { level: 'bar', id: 'APP-INS-001' },
        mode: 'deep', grounding: 'default', grounding_threshold: 0.85, max_iterations: 2,
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'prds',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
      anthropicApiKey: 'sk-test',
      fetchImpl,
    });

    assert.equal(result.verdict, 'EXHAUSTED');
    assert.equal(result.iterations, 2);
    // Still publishes — manifest reflects passed=false
    const manifest = JSON.parse(fs.readFileSync(result.manifest_path, 'utf8'));
    assert.equal(manifest.grounding.passed, false);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runPrd: writes PR body with Hatter Tag including grounding block', async () => {
  const handle = buildFixtureMesh();
  seedPrdPrompts(handle);
  const prBodyPath = path.join(handle.meshDir, 'pr.md');
  try {
    const fetchImpl = buildAnthropicMock({ architecture: [0.95], security: [0.95] });
    await runPrd({
      brief: {
        research_source: { kind: 'pr', url: 'https://github.com/x/y/pull/42' },
        scope: { level: 'bar', id: 'APP-INS-001' },
        mode: 'deep', grounding: 'default', grounding_threshold: 0.85, max_iterations: 3,
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'prds',
      auditDir: '.research-audit',
      emitPrBodyPath: prBodyPath,
      agentVersion: '0.1.0',
      anthropicApiKey: 'sk-test',
      fetchImpl,
    });
    const body = fs.readFileSync(prBodyPath, 'utf8');
    assert.match(body, /Grounding verdict:\*\* PASS/);
    assert.match(body, /^## Hatter.s Tag/m);
    assert.match(body, /^grounding:/m);
    assert.match(body, /passed: true/);
    assert.match(body, new RegExp(`mesh_sha: ${handle.commitSha}`));
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runPrd: rejects invalid brief with a clear error', async () => {
  const handle = buildFixtureMesh();
  seedPrdPrompts(handle);
  try {
    await assert.rejects(
      () => runPrd({
        brief: { /* missing research_source + scope.id */
          scope: { level: 'bar' },
          trigger: { kind: 'local_dev' },
        },
        meshDir: handle.meshDir,
        outputDir: 'prds',
        auditDir: '.research-audit',
        agentVersion: '0.1.0',
        anthropicApiKey: 'k',
        fetchImpl: async () => new Response(''),
      }),
      /Invalid PRD brief/,
    );
  } finally {
    destroyFixtureMesh(handle);
  }
});
