import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { buildHattersTag } from './hatters-tag-builder';

const BASE_INPUT = {
  run_id: 'RES-2026-05-17-abcdef12',
  mesh_sha: 'abcdef1234567890abcdef1234567890abcdef12',
  prompt_library_version: '1.0.0',
  agent_version: '0.1.0',
  published_at: '2026-05-17T12:00:00.000Z',
  llm: {
    provider: 'anthropic' as const,
    model: 'claude-haiku-4-5',
    input_tokens: 1234,
    output_tokens: 567,
    cost_usd: 0.0123,
  },
  guardrails: { mode: 'default' as const, blocks: 0, warns: 1 },
  audit: {
    event_count: 12,
    chain_root_hash: 'a'.repeat(64),
    audit_log_path: '.research-audit/RES-2026-05-17-abcdef12.jsonl',
  },
};

test('buildHattersTag: emits a fenced yaml block under a level-2 heading', () => {
  const out = buildHattersTag(BASE_INPUT);
  assert.match(out, /^## Hatter.s Tag/m);
  assert.match(out, /```yaml/);
  assert.match(out, /```$/m);
});

test('buildHattersTag: includes every required pinning field', () => {
  const out = buildHattersTag(BASE_INPUT);
  for (const field of [
    'run_id: RES-2026-05-17-abcdef12',
    `mesh_sha: ${BASE_INPUT.mesh_sha}`,
    'prompt_library_version: 1.0.0',
    'agent_version: 0.1.0',
    'provider: anthropic',
    'model: claude-haiku-4-5',
    'input_tokens: 1234',
    'output_tokens: 567',
    'cost_usd: 0.0123',
    'mode: default',
    'blocks: 0',
    'warns: 1',
    'event_count: 12',
    `chain_root_hash: ${BASE_INPUT.audit.chain_root_hash}`,
  ]) {
    assert.match(out, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('buildHattersTag: omits the grounding block for research docs', () => {
  const out = buildHattersTag(BASE_INPUT);
  assert.doesNotMatch(out, /^grounding:/m);
});

test('buildHattersTag: includes the grounding block for PRDs', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    grounding: { final_score: 0.91, threshold: 0.85, iterations: 2, passed: true },
  });
  assert.match(out, /^grounding:/m);
  assert.match(out, /final_score: 0\.9100/);
  assert.match(out, /threshold: 0\.85/);
  assert.match(out, /iterations: 2/);
  assert.match(out, /passed: true/);
});
