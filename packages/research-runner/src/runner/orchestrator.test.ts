/**
 * End-to-end smoke tests for the orchestrators. Confirms the wiring at every
 * phase boundary:
 *   - validate_brief + gather_mesh_context (pure, no network)
 *   - plan_queries (LLM mock) + tavily_search × 5 (REST mock) + dedupe_and_rank
 *   - publish + run_complete; audit chain still verifies; PR body still
 *     carries the Hatter's Tag.
 *
 * Network is mocked via a single routing fetchImpl that dispatches by host.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runArcheologist } from './archeologist';
import { runPrd } from './prd';
import { readAuditLog, verifyChain } from './audit-emitter';
import {
  buildFixtureMesh,
  destroyFixtureMesh,
  seedFixturePromptPack,
} from '../mesh/__test-helpers__/fixture-mesh';

const VALID_PLAN = {
  web: [
    'agentic governance market 2026',
    'PRD generation standards 2026',
    'governance threat models 2026',
    'CALM architecture adoption 2026',
    'AI coding agent case studies 2026',
  ],
  arxiv: ['agentic planning', 'governed code generation', 'spec inference'],
  patent: [
    'governance AND mesh AND architecture',
    'agent AND policy AND enforcement',
    'mesh AND audit AND chain',
  ],
  community: ['agentic prd', 'mesh governance', 'red queen rules'],
};

/** Routing mock — anthropic + tavily on the same fetch. Returns a few results per query. */
function buildArcheologistFetchMock(opts: { tavilyDuplicates?: boolean } = {}): typeof fetch {
  return async (url, init) => {
    const u = String(url);
    if (u.startsWith('https://api.anthropic.com/')) {
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify(VALID_PLAN) }],
        usage: { input_tokens: 1200, output_tokens: 240 },
      }), { status: 200 });
    }
    if (u.startsWith('https://api.tavily.com/')) {
      const body = JSON.parse(String((init as RequestInit).body));
      const query = body.query as string;
      const slug = query.replace(/\W+/g, '-').slice(0, 30);
      // Two of the queries return the SAME url so dedupe has something to merge
      const sharedUrl = opts.tavilyDuplicates !== false ? 'https://shared.example/agentic-governance' : null;
      const results = [
        { title: `${query} — result 1`, url: `https://r1.example/${slug}/a`, content: 'snippet a', score: 0.9 },
        { title: `${query} — result 2`, url: `https://r2.example/${slug}/b`, content: 'snippet b', score: 0.7 },
      ];
      if (sharedUrl) {
        results.push({ title: 'shared piece', url: sharedUrl, content: 'shared snippet', score: 0.85 });
      }
      return new Response(JSON.stringify({ results }), { status: 200 });
    }
    throw new Error(`unexpected URL in fetch mock: ${u}`);
  };
}

test('runArcheologist: end-to-end with mocked LLM + Tavily', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/query-plan');
  try {
    const result = await runArcheologist({
      brief: {
        topic: 'agentic governance landscape',
        scope: { level: 'bar', id: 'APP-INS-001' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
      anthropicApiKey: 'sk-test',
      tavilyApiKey: 'tvly-test',
      fetchImpl: buildArcheologistFetchMock(),
    });

    assert.match(result.run_id, /^RES-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/);
    assert.ok(fs.existsSync(result.artifact_path));
    assert.ok(result.total_input_tokens > 0, 'should have recorded input tokens');
    assert.ok(result.total_output_tokens > 0);
    assert.ok(result.total_cost_usd > 0);
    assert.ok(result.source_count > 0, 'should have ranked at least one source');

    // Audit chain shape
    const events = readAuditLog(result.audit_log_path);
    assert.ok(events, 'audit log should parse');
    const nodeNames = events!.map(e => e.node_name);
    assert.deepEqual(nodeNames.slice(0, 3), ['validate_brief', 'gather_mesh_context', 'plan_queries']);
    // Five tavily_search events (one per web query)
    const tavilyCount = nodeNames.filter(n => n === 'tavily_search').length;
    assert.equal(tavilyCount, 5);
    assert.ok(nodeNames.includes('dedupe_and_rank'));
    assert.ok(nodeNames.includes('publish'));
    assert.equal(events![events!.length - 1].node_kind, 'run_complete');

    // Chain verifies
    assert.equal(verifyChain(events!), result.chain_root_hash);

    // plan_queries event has llm telemetry with a real prompt hash
    const llmEvent = events!.find(e => e.node_kind === 'llm');
    assert.ok(llmEvent);
    if (llmEvent && llmEvent.node_kind === 'llm') {
      assert.equal(llmEvent.llm.provider, 'anthropic');
      assert.match(llmEvent.llm.prompt_pack.sha256, /^[0-9a-f]{64}$/);
      assert.equal(llmEvent.llm.prompt_pack.path, '.caterpillar/prompts/research/query-plan.md');
      assert.equal(llmEvent.llm.input_tokens, 1200);
      assert.equal(llmEvent.llm.output_tokens, 240);
    }
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runArcheologist: PR body lists ranked source premises + Query Plan table', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/query-plan');
  const prBodyPath = path.join(handle.meshDir, 'pr-body.md');
  try {
    await runArcheologist({
      brief: {
        topic: 'celebrity following 2026',
        scope: { level: 'bar', id: 'APP-INS-001' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      emitPrBodyPath: prBodyPath,
      agentVersion: '0.1.0',
      anthropicApiKey: 'sk-test',
      tavilyApiKey: 'tvly-test',
      fetchImpl: buildArcheologistFetchMock(),
    });

    const body = fs.readFileSync(prBodyPath, 'utf8');
    assert.match(body, /^## Mesh Context/m);
    assert.match(body, /^## Query Plan/m);
    assert.match(body, /\*\*web\*\* \(Tavily\)/);
    assert.match(body, /\*\*S1\*\* —/);                       // ranked source list
    assert.match(body, /Salience: \d/);
    assert.match(body, new RegExp(`mesh_sha: ${handle.commitSha}`));
    assert.match(body, /chain_root_hash:/);
    // Hatter's Tag should report non-zero LLM usage now
    assert.match(body, /input_tokens: [1-9]/);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runArcheologist: rejects invalid brief', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/query-plan');
  try {
    await assert.rejects(
      () => runArcheologist({
        brief: { topic: 'x', scope: { level: 'bar' }, trigger: { kind: 'local_dev' } },
        meshDir: handle.meshDir,
        outputDir: 'research',
        auditDir: '.research-audit',
        agentVersion: '0.1.0',
        anthropicApiKey: 'k',
        tavilyApiKey: 'k',
        fetchImpl: buildArcheologistFetchMock(),
      }),
      /Invalid research brief/,
    );
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runPrd: still works end-to-end (phase 2a, no LLM yet)', async () => {
  // PRD orchestrator hasn't moved past phase 2a — no LLM/Tavily calls yet.
  const handle = buildFixtureMesh();
  try {
    const result = await runPrd({
      brief: {
        research_source: { kind: 'pr', url: 'https://github.com/x/y/pull/42' },
        scope: { level: 'bar', id: 'APP-INS-001' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'prds',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
    });

    assert.match(result.run_id, /^PRD-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/);
    assert.ok(fs.existsSync(result.artifact_path));
    const manifest = JSON.parse(fs.readFileSync(result.manifest_path, 'utf8'));
    assert.equal(manifest.mesh_sha, handle.commitSha);
    const events = readAuditLog(result.audit_log_path);
    assert.equal(verifyChain(events!), result.chain_root_hash);
  } finally {
    destroyFixtureMesh(handle);
  }
});
