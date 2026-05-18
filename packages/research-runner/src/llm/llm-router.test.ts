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

test('callLlm: github-models + tier=plan routes to openai/gpt-4.1-mini at models.github.ai', async () => {
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
  assert.equal(body.model, 'openai/gpt-4.1-mini');
  assert.equal(result.provider, 'github-models');
  assert.equal(result.model, 'openai/gpt-4.1-mini');
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

test('callLlm: github-models + anthropicApiKey + GH success → stays on github-models (Anthropic is only fallback)', async () => {
  // Try-then-fallback: when GH Models succeeds, we never call Anthropic
  // even if its key is set. Respects the user's stated provider preference
  // (often paying for Copilot Pro and want to use it).
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (u) => {
    calls.push(String(u));
    return githubModelsMock('ok');
  };
  const result = await callLlm({
    provider: 'github-models', tier: 'synth',
    githubToken: 'ghs_test', anthropicApiKey: 'sk-test',
    prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('models.github.ai'));
  assert.equal(result.provider, 'github-models');
  assert.equal(result.model, 'openai/gpt-5-chat');
});

test('callLlm: github-models + anthropicApiKey + GH fails → falls back to Anthropic', async () => {
  // The fallback path: any GH Models failure (413 cap, 403 access, 5xx,
  // timeout) triggers a retry on Anthropic when the key is present.
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (u) => {
    calls.push(String(u));
    if (String(u).includes('models.github.ai')) {
      // Simulate the 413 we hit on gpt-4.1 earlier
      return new Response('{"error":{"code":"tokens_limit_reached","message":"Request body too large"}}', { status: 413 });
    }
    return anthropicMock('synth output ok');
  };
  const result = await callLlm({
    provider: 'github-models', tier: 'synth',
    githubToken: 'ghs_test', anthropicApiKey: 'sk-test',
    prompt: 'x', maxTokens: 1, fetchImpl,
  });
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('models.github.ai'));
  assert.ok(calls[1].includes('api.anthropic.com'));
  assert.equal(result.provider, 'anthropic');
  assert.equal(result.model, 'claude-sonnet-4-6');
});

test('callLlm: github-models + NO anthropicApiKey + GH fails → throws, no fallback', async () => {
  // Without an Anthropic key there's nothing to fall back to — surface
  // the original error so the caller knows the configured provider
  // didn't work.
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

test('callLlm: github-models + tier=plan stays on github-models (small prompt, cheap path)', async () => {
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
  assert.equal(result.model, 'openai/gpt-4.1-mini');
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
