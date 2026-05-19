import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCloudEventsEnvelope, serializeCloudEventsEnvelope } from './court-recorder';

describe('buildCloudEventsEnvelope', () => {
  it('emits the canonical CloudEvents v1.0 shape', () => {
    const env = buildCloudEventsEnvelope({
      source: 'maintainabilityai/research-runner',
      eventKind: 'skill_call',
      phase: 'why',
      payload: { skill: 'tavily-search', duration_ms: 420 },
      id: '11111111-2222-4333-8444-555555555555',
      time: '2026-05-19T15:00:00.000Z',
    });
    assert.strictEqual(env.specversion, '1.0');
    assert.strictEqual(env.source, 'maintainabilityai/research-runner');
    assert.strictEqual(env.type, 'mai.skill_call');
    assert.strictEqual(env.id, '11111111-2222-4333-8444-555555555555');
    assert.strictEqual(env.time, '2026-05-19T15:00:00.000Z');
    assert.strictEqual(env.datacontenttype, 'application/json');
    assert.strictEqual(env.subject, 'why');
    assert.deepStrictEqual(env.data, { skill: 'tavily-search', duration_ms: 420 });
  });

  it('defaults id + time when not supplied', () => {
    const env = buildCloudEventsEnvelope({
      source: 'maintainabilityai/research-runner',
      eventKind: 'artifact_written',
      phase: 'how',
      payload: { path: 'okrs/X/how/prd.md' },
    });
    // UUID v4: 36 chars with dashes at the right positions
    assert.match(env.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    // ISO 8601 with milliseconds + Z
    assert.match(env.time, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('prefixes the eventKind with mai. so SIEM filters can split MaintainabilityAI events', () => {
    const env = buildCloudEventsEnvelope({
      source: 'maintainabilityai/research-runner',
      eventKind: 'state_transition',
      phase: 'how',
      payload: {},
    });
    assert.ok(env.type.startsWith('mai.'));
    assert.strictEqual(env.type, 'mai.state_transition');
  });
});

describe('serializeCloudEventsEnvelope', () => {
  it('produces a single-line JSON string with no trailing newline', () => {
    const env = buildCloudEventsEnvelope({
      source: 'maintainabilityai/research-runner',
      eventKind: 'skill_call',
      phase: 'why',
      payload: { x: 1 },
      id: '11111111-2222-4333-8444-555555555555',
      time: '2026-05-19T15:00:00.000Z',
    });
    const line = serializeCloudEventsEnvelope(env);
    assert.ok(!line.includes('\n'), 'no embedded newline');
    const roundtrip = JSON.parse(line);
    assert.strictEqual(roundtrip.specversion, '1.0');
    assert.strictEqual(roundtrip.data.x, 1);
  });
});
