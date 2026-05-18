import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { callLlm } from './llm-router';

function anthropicMock(text: string): Response {
  return new Response(JSON.stringify({
    content: [{ type: 'text', text }],
    usage: { input_tokens: 100, output_tokens: 50 },
  }), { status: 200 });
}

function githubModelsMock(text: string): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: 100, completion_tokens: 50 },
  }), { status: 200 });
}

test('callLlm: anthropic + tier=plan routes to claude-haiku-4-5', async () => {
  let url = '';
  const fetchImpl: typeof fetch = async (u) => { url = String(u); return anthropicMock('ok'); };
  const result = await callLlm({
    provider: 'anthropic', tier: 'plan',
    anthropicApiKey: 'sk-test', prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(url, 'https://api.anthropic.com/v1/messages');
  assert.equal(result.provider, 'anthropic');
  assert.equal(result.model, 'claude-haiku-4-5');
});

test('callLlm: anthropic + tier=synth routes to claude-sonnet-4-6', async () => {
  const fetchImpl: typeof fetch = async () => anthropicMock('ok');
  const result = await callLlm({
    provider: 'anthropic', tier: 'synth',
    anthropicApiKey: 'sk-test', prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(result.model, 'claude-sonnet-4-6');
});

test('callLlm: github-models + tier=plan routes to openai/gpt-4o-mini at models.github.ai', async () => {
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
  assert.equal(body.model, 'openai/gpt-4o-mini');
  assert.equal(result.provider, 'github-models');
  assert.equal(result.model, 'openai/gpt-4o-mini');
  assert.equal(result.costUsd, 0);
});

test('callLlm: github-models + tier=synth (no anthropicApiKey) stays on openai/gpt-5-chat', async () => {
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

test('callLlm: github-models + tier=synth + anthropicApiKey → hybrid routes synth to Anthropic', async () => {
  // Why hybrid: GitHub Models free tier caps requests at ~8K input tokens
  // — the synthesis prompt routinely exceeds that. When an Anthropic key
  // is available, synth jumps to Claude Sonnet (200K context) while plan
  // stays on the cheap GH Models path.
  let url = '';
  const fetchImpl: typeof fetch = async (u) => {
    url = String(u);
    return anthropicMock('ok');
  };
  const result = await callLlm({
    provider: 'github-models', tier: 'synth',
    githubToken: 'ghs_test', anthropicApiKey: 'sk-test',
    prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(url, 'https://api.anthropic.com/v1/messages');
  assert.equal(result.provider, 'anthropic');
  assert.equal(result.model, 'claude-sonnet-4-6');
});

test('callLlm: github-models + tier=plan + anthropicApiKey → plan STAYS on github-models (no hybrid)', async () => {
  // Plan-tier prompts are small and fit inside the 8K cap; keep them on
  // the free path even when an Anthropic key is set.
  let url = '';
  const fetchImpl: typeof fetch = async (u) => {
    url = String(u);
    return githubModelsMock('ok');
  };
  const result = await callLlm({
    provider: 'github-models', tier: 'plan',
    githubToken: 'ghs_test', anthropicApiKey: 'sk-test',
    prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(url, 'https://models.github.ai/inference/chat/completions');
  assert.equal(result.provider, 'github-models');
  assert.equal(result.model, 'openai/gpt-4o-mini');
});

test('callLlm: anthropic without apiKey throws a clear error', async () => {
  await assert.rejects(
    () => callLlm({ provider: 'anthropic', tier: 'plan', prompt: 'x', maxTokens: 1 }),
    /provider=anthropic requires anthropicApiKey/,
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
