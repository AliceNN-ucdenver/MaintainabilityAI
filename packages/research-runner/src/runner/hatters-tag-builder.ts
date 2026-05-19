/**
 * Hatter's Tag — versioned, signed-style YAML block appended to every
 * research / PRD artifact. Auditors use it to verify the artifact against
 * the recorded mesh sha + prompt-library version + audit chain root.
 *
 * Format choice: hand-rolled YAML emitter (no js-yaml dependency) because
 * the shape is fixed and the values are scalar — strings, numbers, dates,
 * and one nested object for guardrails. Keeps the package zero-runtime-dep
 * beyond zod.
 *
 * Output is always wrapped in a ```yaml fenced code block so it renders
 * cleanly in GitHub PR bodies + the rendered docs site.
 */
import type { GuardrailMode, LlmProvider } from '../schemas';

/**
 * v4 agentic-SDLC governance fields. All are OPTIONAL on the Hatter's
 * Tag input — legacy CI-only runs (without an OKR anchor) omit them
 * entirely and the emitted YAML skips those keys. OKR-anchored runs
 * (Phase B+) populate them so the audit chain can be walked across
 * repositories via `intent_thread_uuid`.
 *
 * See vscode-extension/design/agentic-sdlc.md §4.4 (intent_thread_uuid
 * lifecycle) and §11.1 (Hatter's Tag full provenance schema).
 */
export interface HattersTagOkrContext {
  /** Cross-repo audit correlation key, generated at OKR-create time. */
  intent_thread_uuid: string;
  /** Run id of the prior phase that produced the input artifact (null on Why). */
  parent_intent_thread?: string | null;
  /** OKR card id (human-readable name, e.g. OKR-2026Q1-IMDB-001-celeb-api). */
  okr_id: string;
  /** Which phase produced this artifact. */
  phase: 'why' | 'how' | 'what';
  /** Tier frozen at run start (mitigates tier creep, §6.2). */
  governance_tier: 'autonomous' | 'supervised' | 'restricted';
}

/**
 * Author + reviewer attestation block (v4 §11.1). All optional; legacy
 * runs without distinct agent DIDs omit it. Phase B+ stamps `author_did`
 * from the GitHub App installation id + agent name; reviewers fill in
 * `reviewer_dids[]` after their structured-review pack runs.
 */
export interface HattersTagAttestation {
  /** DID of the agent that authored this artifact. */
  author_did?: string;
  /** Prompt pack id + version cited by the author. */
  author_prompt_pack_version?: string;
  /** SHA256 of the author's system prompt at run time. */
  author_system_prompt_sha?: string;
  /** DIDs of reviewer-agent sessions that scored this PR. */
  reviewer_dids?: string[];
  /** Reviewer scores keyed by reviewer name. */
  reviewer_scores?: {
    architect?: number | null;
    security?: number | null;
  };
}

export interface HattersTagInput {
  run_id: string;
  /** Git SHA of the mesh repo at run start. */
  mesh_sha: string;
  /** Semver of the .caterpillar/prompts library. */
  prompt_library_version: string;
  /** Semver of @maintainabilityai/research-runner. */
  agent_version: string;
  llm: {
    provider: LlmProvider;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  };
  guardrails: {
    mode: GuardrailMode;
    blocks: number;
    warns: number;
  };
  /** Present on PRDs; omitted on research docs. */
  grounding?: {
    final_score: number;
    threshold: number;
    iterations: number;
    passed: boolean;
  };
  audit: {
    event_count: number;
    chain_root_hash: string;
    /** Path to the JSONL audit file relative to mesh root. */
    audit_log_path: string;
  };
  /** ISO timestamp the artifact was published (PR created). */
  published_at: string;
  /** v4: OKR-anchored runs populate this; legacy CI-only runs omit it. */
  okr?: HattersTagOkrContext;
  /** v4: Phase B+ agent runs populate this; legacy runs omit it. */
  attestation?: HattersTagAttestation;
}

function hasAnyAttestationField(a: HattersTagAttestation): boolean {
  return !!(
    a.author_did
    || a.author_prompt_pack_version
    || a.author_system_prompt_sha
    || (a.reviewer_dids && a.reviewer_dids.length > 0)
    || (a.reviewer_scores && (a.reviewer_scores.architect != null || a.reviewer_scores.security != null))
  );
}

/** Build the full Hatter's Tag block, including heading + fenced YAML. */
export function buildHattersTag(input: HattersTagInput): string {
  const lines: string[] = [];
  lines.push('## Hatter’s Tag');
  lines.push('');
  lines.push('```yaml');
  lines.push(`run_id: ${input.run_id}`);
  lines.push(`mesh_sha: ${input.mesh_sha}`);
  lines.push(`prompt_library_version: ${input.prompt_library_version}`);
  lines.push(`agent_version: ${input.agent_version}`);
  lines.push(`published_at: ${input.published_at}`);
  lines.push('llm:');
  lines.push(`  provider: ${input.llm.provider}`);
  lines.push(`  model: ${input.llm.model}`);
  lines.push(`  input_tokens: ${input.llm.input_tokens}`);
  lines.push(`  output_tokens: ${input.llm.output_tokens}`);
  lines.push(`  cost_usd: ${input.llm.cost_usd.toFixed(4)}`);
  lines.push('guardrails:');
  lines.push(`  mode: ${input.guardrails.mode}`);
  lines.push(`  blocks: ${input.guardrails.blocks}`);
  lines.push(`  warns: ${input.guardrails.warns}`);
  if (input.grounding) {
    lines.push('grounding:');
    lines.push(`  final_score: ${input.grounding.final_score.toFixed(4)}`);
    lines.push(`  threshold: ${input.grounding.threshold.toFixed(2)}`);
    lines.push(`  iterations: ${input.grounding.iterations}`);
    lines.push(`  passed: ${input.grounding.passed}`);
  }
  if (input.okr) {
    lines.push('okr:');
    lines.push(`  intent_thread_uuid: ${input.okr.intent_thread_uuid}`);
    if (input.okr.parent_intent_thread !== undefined) {
      lines.push(`  parent_intent_thread: ${input.okr.parent_intent_thread ?? 'null'}`);
    }
    lines.push(`  okr_id: ${input.okr.okr_id}`);
    lines.push(`  phase: ${input.okr.phase}`);
    lines.push(`  governance_tier: ${input.okr.governance_tier}`);
  }
  if (input.attestation && hasAnyAttestationField(input.attestation)) {
    lines.push('attestation:');
    if (input.attestation.author_did) {
      lines.push(`  author_did: ${input.attestation.author_did}`);
    }
    if (input.attestation.author_prompt_pack_version) {
      lines.push(`  author_prompt_pack_version: ${input.attestation.author_prompt_pack_version}`);
    }
    if (input.attestation.author_system_prompt_sha) {
      lines.push(`  author_system_prompt_sha: ${input.attestation.author_system_prompt_sha}`);
    }
    if (input.attestation.reviewer_dids && input.attestation.reviewer_dids.length > 0) {
      lines.push('  reviewer_dids:');
      for (const did of input.attestation.reviewer_dids) {
        lines.push(`    - ${did}`);
      }
    }
    if (input.attestation.reviewer_scores
        && (input.attestation.reviewer_scores.architect != null
            || input.attestation.reviewer_scores.security != null)) {
      lines.push('  reviewer_scores:');
      if (input.attestation.reviewer_scores.architect != null) {
        lines.push(`    architect: ${input.attestation.reviewer_scores.architect}`);
      }
      if (input.attestation.reviewer_scores.security != null) {
        lines.push(`    security: ${input.attestation.reviewer_scores.security}`);
      }
    }
  }
  lines.push('audit:');
  lines.push(`  event_count: ${input.audit.event_count}`);
  lines.push(`  chain_root_hash: ${input.audit.chain_root_hash}`);
  lines.push(`  audit_log_path: ${input.audit.audit_log_path}`);
  lines.push('```');
  lines.push('');
  lines.push('> **How to verify this artifact yourself:** check out the mesh at the recorded `mesh_sha`, replay the audit log at `audit_log_path`, and confirm the final event’s `event_hash` matches `chain_root_hash`.');
  return lines.join('\n');
}
