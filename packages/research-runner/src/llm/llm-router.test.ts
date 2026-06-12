import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { callLlm } from './llm-router';

function githubModelsMock(text: string): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: 100, completion_tokens: 50 },
  }), { status: 200 });
}

test('callLlm: github-models + tier=plan tries openai/gpt-5-chat first (custom tier — Copilot PAT path)', async () => {
  let url = '';
  let body: { model?: string } = {};
  const fetchImpl: typeof fetch = async (u, init) => {
    url = String(u);
    body = JSON.parse(String((init as RequestInit).body));
    return githubModelsMock('ok');
  };
  const result = await callLlm({
    provider: 'github-models', tier: 'plan',
    githubToken: 'ghs_test', prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(url, 'https://models.github.ai/inference/chat/completions');
  assert.equal(body.model, 'openai/gpt-5-chat');
  assert.equal(result.provider, 'github-models');
  assert.equal(result.model, 'openai/gpt-5-chat');
  assert.equal(result.costUsd, 0);
});

test('callLlm: github-models + tier=plan falls back to gpt-4.1-mini when gpt-5-chat returns 403', async () => {
  // The workflow bot token can't reach "custom" tier; we want a clean
  // fall-back to the "low" tier model so users on GITHUB_TOKEN still work.
  const bodies: { model?: string }[] = [];
  const fetchImpl: typeof fetch = async (_u, init) => {
    const body = JSON.parse(String((init as RequestInit).body)) as { model?: string };
    bodies.push(body);
    if (body.model === 'openai/gpt-5-chat') {
      return new Response('{"error":{"message":"Model access denied for token tier"}}', { status: 403 });
    }
    return githubModelsMock('ok');
  };
  const result = await callLlm({
    provider: 'github-models', tier: 'plan',
    githubToken: 'ghs_bot_token', prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].model, 'openai/gpt-5-chat');
  assert.equal(bodies[1].model, 'openai/gpt-4.1-mini');
  assert.equal(result.model, 'openai/gpt-4.1-mini');
});

test('callLlm: github-models + tier=plan falls back to gpt-4.1-mini when gpt-5-chat returns 429 (rate limit)', async () => {
  // The "custom" rate-limit-tier bucket throttles independently from
  // the "low" tier; falling back to gpt-4.1-mini often succeeds even
  // when gpt-5-chat is rate-limited.
  const bodies: { model?: string }[] = [];
  const fetchImpl: typeof fetch = async (_u, init) => {
    const body = JSON.parse(String((init as RequestInit).body)) as { model?: string };
    bodies.push(body);
    if (body.model === 'openai/gpt-5-chat') {
      return new Response('{"error":{"message":"Rate limit exceeded"}}', { status: 429 });
    }
    return githubModelsMock('ok');
  };
  const result = await callLlm({
    provider: 'github-models', tier: 'plan',
    githubToken: 'ghs_test', prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(bodies.length, 2);
  assert.equal(bodies[1].model, 'openai/gpt-4.1-mini');
  assert.equal(result.model, 'openai/gpt-4.1-mini');
});

test('callLlm: github-models + tier=plan does NOT fall back on non-access errors (e.g. 413 cap)', async () => {
  // 413 is a token-budget problem, not an access problem; falling back
  // to a lower-tier model wouldn't help (same caps). Propagate it.
  const fetchImpl: typeof fetch = async () =>
    new Response('{"error":{"code":"tokens_limit_reached"}}', { status: 413 });
  await assert.rejects(
    () => callLlm({
      provider: 'github-models', tier: 'plan',
      githubToken: 'ghs_test', prompt: 'x', maxTokens: 1, fetchImpl,
    }),
    /GitHub Models returned 413/,
  );
});

test('callLlm: github-models + tier=synth stays on openai/gpt-5-chat', async () => {
  let body: { model?: string } = {};
  const fetchImpl: typeof fetch = async (_u, init) => {
    body = JSON.parse(String((init as RequestInit).body));
    return githubModelsMock('ok');
  };
  const result = await callLlm({
    provider: 'github-models', tier: 'synth',
    githubToken: 'ghs_test', prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(body.model, 'openai/gpt-5-chat');
  assert.equal(result.model, 'openai/gpt-5-chat');
  assert.equal(result.provider, 'github-models');
});

test('callLlm: github-models + GH fails (413) → throws (no cross-provider fallback)', async () => {
  // Anthropic was retired — github-models is the only wired provider, so a
  // GH failure surfaces directly. The synth tier has no fallback model.
  const fetchImpl: typeof fetch = async () =>
    new Response('{"error":{"message":"tokens_limit_reached"}}', { status: 413 });
  await assert.rejects(
    () => callLlm({
      provider: 'github-models', tier: 'synth',
      githubToken: 'ghs_test',
      prompt: 'x', maxTokens: 1, fetchImpl,
    }),
    /GitHub Models returned 413/,
  );
});

test('callLlm: github-models without githubToken throws a clear error', async () => {
  await assert.rejects(
    () => callLlm({ provider: 'github-models', tier: 'plan', prompt: 'x', maxTokens: 1 }),
    /provider=github-models requires githubToken.*models: read/,
  );
});

test('callLlm: openai + azure-openai are still unimplemented (clear error)', async () => {
  await assert.rejects(
    () => callLlm({ provider: 'openai', tier: 'plan', prompt: 'x', maxTokens: 1 }),
    /provider "openai" not yet implemented/,
  );
});
