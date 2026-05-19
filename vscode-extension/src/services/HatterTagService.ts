/**
 * HatterTagService — Phase B-PR4 surface for parsing + (eventually)
 * verifying the Hatter's Tag YAML block embedded in every agent-produced
 * artifact (research-doc.md, prd.md, code-design.md) and in the PR body.
 *
 * The Tag is built by `packages/research-runner/src/runner/hatters-tag-builder.ts`
 * via `buildHattersTag()` — this service is the read side. UI surface (the
 * slide-out sheet on the OKR detail Action card) calls `parseHatterTag` to
 * render the tag's full provenance.
 *
 * `verifyChain` is stubbed for B-PR4 — it returns the expected shape so the
 * UI can render a placeholder badge. Real chain verification lives in
 * `research-runner verify-chain` CLI (Phase E E2); this service is the
 * adapter Looking Glass will call once that CLI ships.
 *
 * See vscode-extension/design/agentic-sdlc.md §11 for the Tag schema and
 * §11.6 for the verify-chain contract.
 */
import { parse as parseYaml } from 'yaml';

/**
 * Parsed Hatter Tag shape. Mirrors the v4 emitter's output:
 *   - top-level provenance + LLM + guardrails + audit blocks (always)
 *   - optional `grounding` (PRDs only)
 *   - optional `okr` (Phase A-PR4+, populated for OKR-anchored runs)
 *   - optional `attestation` (Phase B+, populated when agent DIDs are
 *     captured by Queen's Keyring)
 */
export interface ParsedHatterTag {
  run_id: string;
  mesh_sha: string;
  prompt_library_version: string;
  agent_version: string;
  published_at: string;
  llm?: {
    provider?: string;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    cost_usd?: number;
  };
  guardrails?: {
    mode?: string;
    blocks?: number;
    warns?: number;
  };
  grounding?: {
    final_score?: number;
    threshold?: number;
    iterations?: number;
    passed?: boolean;
  };
  audit?: {
    event_count?: number;
    chain_root_hash?: string;
    audit_log_path?: string;
  };
  okr?: {
    intent_thread_uuid?: string;
    parent_intent_thread?: string | null;
    okr_id?: string;
    phase?: string;
    governance_tier?: string;
  };
  attestation?: {
    author_did?: string;
    author_prompt_pack_version?: string;
    author_system_prompt_sha?: string;
    reviewer_dids?: string[];
    reviewer_scores?: { architect?: number | null; security?: number | null };
  };
}

export interface ChainVerificationResult {
  ok: boolean;
  /** Number of events successfully verified, when ok. */
  eventCount?: number;
  /** Computed chain-root SHA-256, when ok. */
  chainRootHash?: string;
  /** When !ok, a human-readable reason. */
  reason?: string;
}

export class HatterTagService {
  /**
   * Extract + parse the `## Hatter's Tag` fenced YAML block from a markdown
   * artifact (PR body, research-doc.md, prd.md, etc.). Returns null if no
   * Tag is present OR the embedded YAML fails to parse.
   *
   * The emitter ALWAYS wraps the YAML in a ```yaml fenced block under a
   * `## Hatter's Tag` heading (curly apostrophe per the emitter source).
   * We match both straight + curly apostrophe variants so hand-edited
   * artifacts aren't accidentally rejected.
   */
  parseHatterTag(markdown: string): ParsedHatterTag | null {
    const headingMatch = markdown.match(/##\s+Hatter[’']s\s+Tag[\s\S]*?```yaml\n([\s\S]*?)\n```/);
    if (!headingMatch) { return null; }
    try {
      const parsed = parseYaml(headingMatch[1]);
      if (!parsed || typeof parsed !== 'object') { return null; }
      return parsed as ParsedHatterTag;
    } catch {
      return null;
    }
  }

  /**
   * Phase B-PR4 stub for chain verification. Real implementation lands in
   * Phase E E2 via `research-runner verify-chain` CLI. For now this returns
   * the OKR-side audit chain root so the UI badge has something to render
   * against. Callers that want actual verification fall back to the CLI
   * once it ships.
   */
  verifyChain(tag: ParsedHatterTag): ChainVerificationResult {
    if (!tag.audit?.chain_root_hash) {
      return { ok: false, reason: 'no-chain-root-on-tag' };
    }
    // Stub: trust the embedded chain_root_hash. Phase E swaps in real
    // event-by-event hash recomputation.
    return {
      ok: true,
      eventCount: tag.audit.event_count,
      chainRootHash: tag.audit.chain_root_hash,
    };
  }
}
