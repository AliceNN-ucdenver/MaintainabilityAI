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

// v4 — OKR / attestation extensions (Phase A-PR4)

test('buildHattersTag: omits the okr block when no OKR anchor (legacy CI runs)', () => {
  const out = buildHattersTag(BASE_INPUT);
  assert.doesNotMatch(out, /^okr:/m);
  assert.doesNotMatch(out, /intent_thread_uuid:/);
});

test('buildHattersTag: emits the okr block when OKR anchor present', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    okr: {
      intent_thread_uuid: '7f3e9c2d-aaaa-bbbb-cccc-dddddddddddd',
      parent_intent_thread: null,
      okr_id: 'OKR-2026Q1-IMDB-001-celeb-api',
      phase: 'why',
      governance_tier: 'restricted',
    },
  });
  assert.match(out, /^okr:/m);
  assert.match(out, /  intent_thread_uuid: 7f3e9c2d-aaaa-bbbb-cccc-dddddddddddd/);
  assert.match(out, /  parent_intent_thread: null/);
  assert.match(out, /  okr_id: OKR-2026Q1-IMDB-001-celeb-api/);
  assert.match(out, /  phase: why/);
  assert.match(out, /  governance_tier: restricted/);
});

test('buildHattersTag: omits parent_intent_thread when undefined (root phase)', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    okr: {
      intent_thread_uuid: '7f3e9c2d-aaaa-bbbb-cccc-dddddddddddd',
      okr_id: 'OKR-TEST',
      phase: 'why',
      governance_tier: 'supervised',
    },
  });
  assert.doesNotMatch(out, /parent_intent_thread:/);
});

test('buildHattersTag: chains phases by emitting parent_intent_thread (How references Why run_id)', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    okr: {
      intent_thread_uuid: '7f3e9c2d-aaaa-bbbb-cccc-dddddddddddd',
      parent_intent_thread: 'RES-2026-05-17-abcdef12',
      okr_id: 'OKR-TEST',
      phase: 'how',
      governance_tier: 'supervised',
    },
  });
  assert.match(out, /parent_intent_thread: RES-2026-05-17-abcdef12/);
  assert.match(out, /phase: how/);
});

test('buildHattersTag: omits the attestation block when no fields supplied', () => {
  const out = buildHattersTag({ ...BASE_INPUT, attestation: {} });
  assert.doesNotMatch(out, /^attestation:/m);
});

test('buildHattersTag: emits attestation when author_did + prompt pack supplied', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    attestation: {
      author_did: 'did:gh:installation:1234567/agent:market-research-agent',
      author_prompt_pack_version: 'research/query-plan@v3',
      author_system_prompt_sha: 'sha256:a8c2def01923456789abcdef01234567',
    },
  });
  assert.match(out, /^attestation:/m);
  assert.match(out, /  author_did: did:gh:installation:1234567\/agent:market-research-agent/);
  assert.match(out, /  author_prompt_pack_version: research\/query-plan@v3/);
  assert.match(out, /  author_system_prompt_sha: sha256:a8c2def01923456789abcdef01234567/);
});

test('buildHattersTag: emits reviewer DIDs as a YAML list', () => {
  // Post-B24 / Bug-V: the prd-agent + code-design-agent inhabit
  // Architect + Security personas internally via prompt-switch — there
  // are NO separate reviewer agents at PRD time. The `reviewer_dids`
  // field stays in the schema as dormant capacity for any future
  // genuinely-separate reviewer (e.g. a code-grounded WHAT-phase
  // reviewer per the Phase-D open question). The test fixture uses
  // a generic agent name so deleted agent IDs don't get cargo-culted
  // back into the codebase by future readers grepping for examples.
  const out = buildHattersTag({
    ...BASE_INPUT,
    attestation: {
      reviewer_dids: [
        'did:gh:installation:7654321/agent:future-reviewer-a',
        'did:gh:installation:7654321/agent:future-reviewer-b',
      ],
    },
  });
  assert.match(out, /  reviewer_dids:/);
  assert.match(out, /    - did:gh:installation:7654321\/agent:future-reviewer-a/);
  assert.match(out, /    - did:gh:installation:7654321\/agent:future-reviewer-b/);
});

test('buildHattersTag: emits reviewer scores when supplied', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    attestation: {
      reviewer_scores: { architect: 85, security: 78 },
    },
  });
  assert.match(out, /  reviewer_scores:/);
  assert.match(out, /    architect: 85/);
  assert.match(out, /    security: 78/);
});

test('buildHattersTag: handles partial reviewer scores (architect only)', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    attestation: {
      reviewer_scores: { architect: 85, security: null },
    },
  });
  assert.match(out, /    architect: 85/);
  assert.doesNotMatch(out, /    security:/);
});

test('buildHattersTag: legacy runs (no okr, no attestation) still emit valid YAML', () => {
  // Sanity check that the schema bumps stay backwards-compatible.
  const out = buildHattersTag(BASE_INPUT);
  assert.match(out, /^## Hatter.s Tag/m);
  assert.match(out, /run_id: RES-2026-05-17-abcdef12/);
  assert.match(out, /chain_root_hash: /);
  // No new sections leaked
  assert.doesNotMatch(out, /^okr:/m);
  assert.doesNotMatch(out, /^attestation:/m);
  assert.doesNotMatch(out, /^evidence:/m);
});

test('buildHattersTag: emits evidence block when present (live mode)', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    evidence: { evidence_mode: 'live', fresh_provider_search_performed: true },
  });
  assert.match(out, /^evidence:/m);
  assert.match(out, /evidence_mode: live/);
  assert.match(out, /fresh_provider_search_performed: true/);
  assert.doesNotMatch(out, /degraded_reason:/);
});

test('buildHattersTag: emits degraded_reason when evidence_mode is cached', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    evidence: {
      evidence_mode: 'cached',
      fresh_provider_search_performed: false,
      degraded_reason: 'tavily-skill-backend-missing',
    },
  });
  assert.match(out, /evidence_mode: cached/);
  assert.match(out, /fresh_provider_search_performed: false/);
  assert.match(out, /degraded_reason: tavily-skill-backend-missing/);
});

test('buildHattersTag: quotes degraded_reason when it contains YAML-sensitive chars', () => {
  const out = buildHattersTag({
    ...BASE_INPUT,
    evidence: {
      evidence_mode: 'mixed',
      fresh_provider_search_performed: true,
      degraded_reason: 'rerun-after-review: 2026-05-19, #2',
    },
  });
  // The colon would otherwise break the YAML scalar — should be JSON-quoted.
  assert.match(out, /degraded_reason: "rerun-after-review: 2026-05-19, #2"/);
});

test('buildHattersTag: legacy runs (evidence undefined) emit no evidence block', () => {
  const out = buildHattersTag(BASE_INPUT);
  assert.doesNotMatch(out, /^evidence:/m);
});
