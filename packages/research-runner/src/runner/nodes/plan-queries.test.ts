import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { planQueries } from './plan-queries';
import { buildFixtureMesh, destroyFixtureMesh, seedFixturePromptPack } from '../../mesh/__test-helpers__/fixture-mesh';
import { gatherMeshContext } from '../../mesh/mesh-reader';

/** A QueryPlan body the Zod schema accepts. */
const VALID_PLAN_JSON = JSON.stringify({
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
});

function mockLlmResponse(text: string, init: { status?: number; usage?: { input_tokens?: number; output_tokens?: number } } = {}): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: init.usage?.input_tokens ?? 100, completion_tokens: init.usage?.output_tokens ?? 50 },
  }), { status: init.status ?? 200 });
}


test('planQueries: happy path — single LLM call returns validated QueryPlan', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/query-plan');
  try {
    const meshContext = gatherMeshContext({
      meshDir: handle.meshDir,
      scope: { level: 'bar', id: 'APP-INS-001' },
    });
    const fetchImpl: typeof fetch = async () => mockLlmResponse(VALID_PLAN_JSON);

    const result = await planQueries({
      meshDir: handle.meshDir,
      brief: {
        topic: 'agentic governance landscape',
        scope: { level: 'bar', id: 'APP-INS-001' },
        path: 'research',
        guardrails: 'default',
        llm_provider: 'github-models',
        cost_cap_tokens: 200_000,
        trigger: { kind: 'local_dev' },
      },
      meshContext,
      githubToken: 'sk-test',
      fetchImpl,
    });

    assert.equal(result.queryPlan.web.length, 5);
    assert.equal(result.queryPlan.arxiv.length, 3);
    assert.equal(result.queryPlan.patent.length, 3);
    assert.equal(result.queryPlan.community.length, 3);
    assert.equal(result.llm.attempts, 1);
    assert.equal(result.llm.model, 'openai/gpt-5-chat');
    assert.match(result.prompt.packSha256, /^[0-9a-f]{64}$/);
    assert.equal(result.prompt.packPath, '.caterpillar/prompts/research/query-plan.md');
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('planQueries: tolerates ```json fenced output', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/query-plan');
  try {
    const meshContext = gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'bar', id: 'APP-INS-001' } });
    const fenced = '```json\n' + VALID_PLAN_JSON + '\n```';
    const fetchImpl: typeof fetch = async () => mockLlmResponse(fenced);
    const result = await planQueries({
      meshDir: handle.meshDir,
      brief: { topic: 't', scope: { level: 'bar', id: 'APP-INS-001' }, trigger: { kind: 'local_dev' } } as never,
      meshContext,
      provider: 'github-models',
      githubToken: 'k',
      fetchImpl,
    });
    assert.equal(result.queryPlan.web.length, 5);
  } finally { destroyFixtureMesh(handle); }
});

test('planQueries: retries once with feedback when validation fails', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/query-plan');
  try {
    const meshContext = gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'bar', id: 'APP-INS-001' } });

    let calls = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      calls += 1;
      if (calls === 1) {
        return mockLlmResponse(JSON.stringify({ web: ['too short list'] }));
      }
      // Second call should include the retry-feedback prefix. GitHub Models
      // sends [system, user]; the feedback rides on the user message.
      const body = JSON.parse(String((init as RequestInit).body));
      const userMsg = body.messages.find((m: { role: string }) => m.role === 'user');
      assert.match(userMsg.content, /Your previous response failed validation/);
      return mockLlmResponse(VALID_PLAN_JSON);
    };

    const result = await planQueries({
      meshDir: handle.meshDir,
      brief: { topic: 't', scope: { level: 'bar', id: 'APP-INS-001' }, trigger: { kind: 'local_dev' } } as never,
      meshContext,
      provider: 'github-models',
      githubToken: 'k',
      fetchImpl,
    });
    assert.equal(result.llm.attempts, 2);
    assert.equal(calls, 2);
  } finally { destroyFixtureMesh(handle); }
});

test('planQueries: throws after 2 failed attempts', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/query-plan');
  try {
    const meshContext = gatherMeshContext({ meshDir: handle.meshDir, scope: { level: 'bar', id: 'APP-INS-001' } });
    const fetchImpl: typeof fetch = async () => mockLlmResponse('not json at all');
    await assert.rejects(
      () => planQueries({
        meshDir: handle.meshDir,
        brief: { topic: 't', scope: { level: 'bar', id: 'APP-INS-001' }, trigger: { kind: 'local_dev' } } as never,
        meshContext,
        provider: 'github-models',
        githubToken: 'k',
        fetchImpl,
      }),
      /failed QueryPlan validation after 2 attempts/,
    );
  } finally { destroyFixtureMesh(handle); }
});
