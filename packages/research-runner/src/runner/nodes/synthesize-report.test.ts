import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { synthesizeReport } from './synthesize-report';
import { CANONICAL_SYNTHESIS_BODY } from './__test-helpers__/canonical-synthesis';
import { buildFixtureMesh, destroyFixtureMesh, seedFixturePromptPack } from '../../mesh/__test-helpers__/fixture-mesh';
import { gatherMeshContext } from '../../mesh/mesh-reader';
import type { ResearchBrief, RankedSource } from '../../schemas';

const RANKED_SOURCES: RankedSource[] = [
  { id: 'S1', provider: 'tavily', title: 'First', url: 'https://a.example/', retrieved_at: '2026-05-17T00:00:00Z', salience_score: 0.92, excerpt: 'first excerpt' },
  { id: 'S2', provider: 'tavily', title: 'Second', url: 'https://b.example/', retrieved_at: '2026-05-17T00:00:00Z', salience_score: 0.81, excerpt: 'second excerpt' },
];

const BRIEF: ResearchBrief = {
  topic: 'agentic governance',
  scope: { level: 'bar', id: 'APP-INS-001' },
  path: 'research',
  guardrails: 'default',
  llm_provider: 'anthropic',
  cost_cap_tokens: 200_000,
  trigger: { kind: 'local_dev' },
};

function mockAnthropicResponse(text: string, init: { status?: number; usage?: { input_tokens?: number; output_tokens?: number } } = {}): Response {
  return new Response(JSON.stringify({
    content: [{ type: 'text', text }],
    usage: { input_tokens: init.usage?.input_tokens ?? 3000, output_tokens: init.usage?.output_tokens ?? 800 },
  }), { status: init.status ?? 200 });
}

test('synthesizeReport: happy path — validated canonical body returned', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/synthesis');
  try {
    const meshContext = gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'bar', id: 'APP-INS-001' } });
    const fetchImpl: typeof fetch = async () => mockAnthropicResponse(CANONICAL_SYNTHESIS_BODY);
    const result = await synthesizeReport({
      meshDir: handle.meshDir,
      brief: BRIEF,
      meshContext,
      rankedSources: RANKED_SOURCES,
      apiKey: 'sk-test',
      fetchImpl,
    });
    assert.equal(result.llm.attempts, 1);
    assert.equal(result.llm.model, 'claude-sonnet-4-6');
    assert.equal(result.validation.valid, true);
    assert.equal(result.citation_stats.source_count, 3);
    assert.equal(result.citation_stats.conclusion_count, 2);
    assert.equal(result.citation_stats.recommendation_count, 2);
    assert.match(result.prompt.packPath, /research\/synthesis\.md$/);
    assert.match(result.prompt.packSha256, /^[0-9a-f]{64}$/);
  } finally { destroyFixtureMesh(handle); }
});

test('synthesizeReport: unwraps ```markdown fenced output', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/synthesis');
  try {
    const meshContext = gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'bar', id: 'APP-INS-001' } });
    const fenced = '```markdown\n' + CANONICAL_SYNTHESIS_BODY + '\n```';
    const fetchImpl: typeof fetch = async () => mockAnthropicResponse(fenced);
    const result = await synthesizeReport({
      meshDir: handle.meshDir,
      brief: BRIEF,
      meshContext,
      rankedSources: RANKED_SOURCES,
      apiKey: 'k',
      fetchImpl,
    });
    assert.equal(result.validation.valid, true);
    assert.equal(result.body_md.startsWith('## Source Premises'), true);
  } finally { destroyFixtureMesh(handle); }
});

test('synthesizeReport: retries once with feedback when validation fails', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/synthesis');
  try {
    const meshContext = gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'bar', id: 'APP-INS-001' } });

    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      calls += 1;
      if (calls === 1) {
        return mockAnthropicResponse('## Source Premises\n\n**S1** only one source.\n\n## Executive Summary\n\nMissing 8 sections.');
      }
      const body = JSON.parse(String((init as RequestInit).body));
      assert.match(body.messages[0].content, /Your previous response failed structural validation/);
      return mockAnthropicResponse(CANONICAL_SYNTHESIS_BODY);
    };

    const result = await synthesizeReport({
      meshDir: handle.meshDir,
      brief: BRIEF,
      meshContext,
      rankedSources: RANKED_SOURCES,
      apiKey: 'k',
      fetchImpl,
    });
    assert.equal(result.llm.attempts, 2);
    assert.equal(calls, 2);
  } finally { destroyFixtureMesh(handle); }
});

test('synthesizeReport: throws after 2 failed attempts', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/synthesis');
  try {
    const meshContext = gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'bar', id: 'APP-INS-001' } });
    const fetchImpl: typeof fetch = async () => mockAnthropicResponse('## Wrong Section\n\nNothing here.');
    await assert.rejects(
      () => synthesizeReport({
        meshDir: handle.meshDir,
        brief: BRIEF,
        meshContext,
        rankedSources: RANKED_SOURCES,
        apiKey: 'k',
        fetchImpl,
      }),
      /structural validation failed after 2 attempts/,
    );
  } finally { destroyFixtureMesh(handle); }
});

test('synthesizeReport: token + cost accumulate across retries', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/synthesis');
  try {
    const meshContext = gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'bar', id: 'APP-INS-001' } });
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return mockAnthropicResponse('## Source Premises\n\n', { usage: { input_tokens: 1000, output_tokens: 100 } });
      }
      return mockAnthropicResponse(CANONICAL_SYNTHESIS_BODY, { usage: { input_tokens: 1500, output_tokens: 200 } });
    };
    const result = await synthesizeReport({
      meshDir: handle.meshDir,
      brief: BRIEF,
      meshContext,
      rankedSources: RANKED_SOURCES,
      apiKey: 'k',
      fetchImpl,
    });
    assert.equal(result.llm.inputTokens, 2500);
    assert.equal(result.llm.outputTokens, 300);
    // sonnet $3 input / $15 output per Mtok → (2500/1e6)*3 + (300/1e6)*15 = 0.012
    assert.ok(result.llm.costUsd > 0);
  } finally { destroyFixtureMesh(handle); }
});
