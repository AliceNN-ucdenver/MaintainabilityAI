import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { callGitHubModels } from './github-models-client';

function mockResponse(body: unknown, init: { status?: number } = {}): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(text, { status: init.status ?? 200, headers: { 'content-type': 'application/json' } });
}

test('callGitHubModels: sends OpenAI-compatible request to models.github.ai', async () => {
  let captured: { url: string; init: RequestInit } | null = null;
  const fetchImpl: typeof fetch = async (url, init) => {
    captured = { url: String(url), init: init as RequestInit };
    return mockResponse({
      choices: [{ message: { content: '{"web":[]}' } }],
      usage: { prompt_tokens: 42, completion_tokens: 7 },
    });
  };

  await callGitHubModels({
    token: 'ghs_test_token',
    model: 'openai/gpt-4o-mini',
    system: 'You are terse',
    prompt: 'plan queries',
    maxTokens: 100,
    fetchImpl,
  });

  assert.ok(captured);
  assert.equal((captured as { url: string }).url, 'https://models.github.ai/inference/chat/completions');
  const headers = ((captured as { init: RequestInit }).init.headers ?? {}) as Record<string, string>;
  assert.equal(headers['authorization'], 'Bearer ghs_test_token');
  const body = JSON.parse(String((captured as { init: RequestInit }).init.body));
  assert.equal(body.model, 'openai/gpt-4o-mini');
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[0].content, 'You are terse');
  assert.equal(body.messages[1].role, 'user');
  assert.equal(body.messages[1].content, 'plan queries');
  assert.equal(body.max_completion_tokens, 100);
  assert.equal(body.temperature, 0);
});

test('callGitHubModels: omits system message when not supplied', async () => {
  let body: Record<string, unknown> | null = null;
  const fetchImpl: typeof fetch = async (_url, init) => {
    body = JSON.parse(String((init as RequestInit).body));
    return mockResponse({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
  };
  await callGitHubModels({ token: 't', model: 'openai/gpt-4o', prompt: 'hi', maxTokens: 1, fetchImpl });
  const messages = (body as { messages: { role: string }[] }).messages;
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'user');
});

test('callGitHubModels: parses text + usage; cost reported as 0', async () => {
  const fetchImpl: typeof fetch = async () => mockResponse({
    choices: [{ message: { content: 'hello world' } }],
    usage: { prompt_tokens: 1000, completion_tokens: 500 },
  });
  const result = await callGitHubModels({
    token: 't', model: 'openai/gpt-4o', prompt: 'x', maxTokens: 10, fetchImpl,
  });
  assert.equal(result.text, 'hello world');
  assert.equal(result.inputTokens, 1000);
  assert.equal(result.outputTokens, 500);
  // GitHub Models pricing is opaque; client reports 0 — reviewers check GH billing.
  assert.equal(result.costUsd, 0);
  assert.equal(result.httpStatus, 200);
});

test('callGitHubModels: throws on non-2xx with status + body excerpt', async () => {
  const fetchImpl: typeof fetch = async () => mockResponse('models read scope required', { status: 403 });
  await assert.rejects(
    () => callGitHubModels({ token: 't', model: 'openai/gpt-4o', prompt: 'x', maxTokens: 1, fetchImpl }),
    /GitHub Models returned 403.*models read scope required/,
  );
});

test('callGitHubModels: throws when token missing', async () => {
  await assert.rejects(
    () => callGitHubModels({ token: '', model: 'openai/gpt-4o', prompt: 'x', maxTokens: 1 }),
    /GITHUB_TOKEN missing.*permissions: models: read/,
  );
});
