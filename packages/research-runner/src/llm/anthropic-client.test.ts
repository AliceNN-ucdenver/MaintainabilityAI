import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { callAnthropic } from './anthropic-client';

/** Build a Response shim that satisfies the fields the client reads. */
function mockResponse(body: unknown, init: { status?: number } = {}): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(text, { status: init.status ?? 200, headers: { 'content-type': 'application/json' } });
}

test('callAnthropic: sends the expected request shape', async () => {
  let captured: { url: string; init: RequestInit } | null = null;
  const fetchImpl: typeof fetch = async (url, init) => {
    captured = { url: String(url), init: init as RequestInit };
    return mockResponse({
      content: [{ type: 'text', text: '{"web":[]}' }],
      usage: { input_tokens: 42, output_tokens: 7 },
    });
  };

  await callAnthropic({
    apiKey: 'sk-test',
    model: 'claude-haiku-4-5',
    system: 'You are terse',
    prompt: 'plan queries',
    maxTokens: 100,
    fetchImpl,
  });

  assert.ok(captured, 'fetch should have been called');
  assert.equal((captured as { url: string }).url, 'https://api.anthropic.com/v1/messages');
  const headers = ((captured as { init: RequestInit }).init.headers ?? {}) as Record<string, string>;
  assert.equal(headers['x-api-key'], 'sk-test');
  assert.equal(headers['anthropic-version'], '2023-06-01');
  const body = JSON.parse(String((captured as { init: RequestInit }).init.body));
  assert.equal(body.model, 'claude-haiku-4-5');
  assert.equal(body.system, 'You are terse');
  assert.equal(body.messages[0].content, 'plan queries');
  assert.equal(body.temperature, 0);
});

test('callAnthropic: parses text + usage + computes cost', async () => {
  const fetchImpl: typeof fetch = async () => mockResponse({
    content: [{ type: 'text', text: 'hello' }, { type: 'text', text: ' world' }],
    usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
  });

  const result = await callAnthropic({
    apiKey: 'sk-test',
    model: 'claude-haiku-4-5',
    prompt: 'x',
    maxTokens: 10,
    fetchImpl,
  });

  assert.equal(result.text, 'hello world');
  assert.equal(result.inputTokens, 1_000_000);
  assert.equal(result.outputTokens, 1_000_000);
  // haiku pricing: $0.25 + $1.25 per Mtok = $1.50
  assert.equal(result.costUsd, 1.5);
  assert.equal(result.httpStatus, 200);
});

test('callAnthropic: throws on non-2xx with status + body', async () => {
  const fetchImpl: typeof fetch = async () => mockResponse('rate limited', { status: 429 });
  await assert.rejects(
    () => callAnthropic({ apiKey: 'k', model: 'claude-haiku-4-5', prompt: 'x', maxTokens: 1, fetchImpl }),
    /Anthropic returned 429.*rate limited/,
  );
});

test('callAnthropic: throws when apiKey is missing', async () => {
  await assert.rejects(
    () => callAnthropic({ apiKey: '', model: 'claude-haiku-4-5', prompt: 'x', maxTokens: 1 }),
    /ANTHROPIC_API_KEY missing/,
  );
});
