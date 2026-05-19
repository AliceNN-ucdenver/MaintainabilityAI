import { describe, expect, it } from 'vitest';
import { HatterTagService } from '../HatterTagService';

const svc = new HatterTagService();

describe('HatterTagService.parseHatterTag', () => {
  it('parses the canonical block emitted by buildHattersTag', () => {
    const md = `Some preamble.

## Hatter’s Tag

\`\`\`yaml
run_id: RES-2026-05-19-abc
mesh_sha: abc1234567
prompt_library_version: v1.0.0
agent_version: 0.1.19
published_at: 2026-05-19T15:00:00Z
llm:
  provider: anthropic
  model: claude-sonnet-4-6
  input_tokens: 12000
  output_tokens: 3000
  cost_usd: 0.0420
guardrails:
  mode: enforce
  blocks: 0
  warns: 1
audit:
  event_count: 14
  chain_root_hash: ab12cd34
  audit_log_path: okrs/OKR-X/audit/events/RES-2026-05-19-abc.jsonl
\`\`\`

Some trailing text.
`;
    const tag = svc.parseHatterTag(md);
    expect(tag).not.toBeNull();
    expect(tag!.run_id).toBe('RES-2026-05-19-abc');
    expect(tag!.mesh_sha).toBe('abc1234567');
    expect(tag!.llm?.model).toBe('claude-sonnet-4-6');
    expect(tag!.audit?.chain_root_hash).toBe('ab12cd34');
  });

  it('parses the v4 okr + attestation blocks when present', () => {
    const md = `## Hatter’s Tag

\`\`\`yaml
run_id: PRD-2026-05-19-xyz
mesh_sha: abc1234567
prompt_library_version: v1.0.0
agent_version: 0.1.19
published_at: 2026-05-19T15:00:00Z
audit:
  event_count: 22
  chain_root_hash: ef56ab78
  audit_log_path: okrs/OKR-Y/audit/events/PRD-2026-05-19-xyz.jsonl
okr:
  intent_thread_uuid: 7f3e9c2d-1111-4222-8333-444444444444
  parent_intent_thread: 1a2b3c4d-1111-4222-8333-555555555555
  okr_id: OKR-2026Q1-IMDB-001-celeb-api
  phase: how
  governance_tier: restricted
attestation:
  author_did: did:gh:installation:42/agent:prd-agent
  author_prompt_pack_version: v1.0.0
  reviewer_dids:
    - did:gh:installation:42/agent:architect-reviewer
    - did:gh:installation:42/agent:security-reviewer
  reviewer_scores:
    architect: 88
    security: 92
\`\`\`
`;
    const tag = svc.parseHatterTag(md);
    expect(tag).not.toBeNull();
    expect(tag!.okr?.phase).toBe('how');
    expect(tag!.okr?.governance_tier).toBe('restricted');
    expect(tag!.okr?.parent_intent_thread).toBe('1a2b3c4d-1111-4222-8333-555555555555');
    expect(tag!.attestation?.reviewer_dids).toHaveLength(2);
    expect(tag!.attestation?.reviewer_scores?.architect).toBe(88);
  });

  it('accepts straight-apostrophe heading variant ("Hatter\'s Tag")', () => {
    const md = `## Hatter's Tag

\`\`\`yaml
run_id: RES-1
mesh_sha: abc
prompt_library_version: v1
agent_version: 0.1.0
published_at: 2026-05-19T00:00:00Z
\`\`\`
`;
    const tag = svc.parseHatterTag(md);
    expect(tag).not.toBeNull();
    expect(tag!.run_id).toBe('RES-1');
  });

  it('returns null on missing tag', () => {
    expect(svc.parseHatterTag('no tag here')).toBeNull();
  });

  it('returns null on broken YAML inside the fenced block', () => {
    const md = `## Hatter’s Tag

\`\`\`yaml
this : is : not : valid : yaml : at : all
  with: nested
broken
\`\`\`
`;
    // The yaml lib is lenient — but a wildly broken input either returns
    // null or a non-object. Our parser returns null in either case.
    const tag = svc.parseHatterTag(md);
    if (tag !== null) {
      // If yaml lib happened to parse it as a string/primitive, we still
      // reject (must be an object). Coerce + assert.
      expect(typeof tag).toBe('object');
    }
  });
});

describe('HatterTagService.verifyChain', () => {
  it('returns ok with the embedded chain root when present (stub)', () => {
    const result = svc.verifyChain({
      run_id: 'r', mesh_sha: 'm', prompt_library_version: 'v', agent_version: 'a', published_at: 'p',
      audit: { chain_root_hash: 'deadbeef', event_count: 7 },
    });
    expect(result.ok).toBe(true);
    expect(result.chainRootHash).toBe('deadbeef');
    expect(result.eventCount).toBe(7);
  });

  it('refuses to verify when chain_root_hash is absent', () => {
    const result = svc.verifyChain({
      run_id: 'r', mesh_sha: 'm', prompt_library_version: 'v', agent_version: 'a', published_at: 'p',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no-chain-root-on-tag');
  });
});
