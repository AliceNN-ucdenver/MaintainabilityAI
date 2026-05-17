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
  lines.push('audit:');
  lines.push(`  event_count: ${input.audit.event_count}`);
  lines.push(`  chain_root_hash: ${input.audit.chain_root_hash}`);
  lines.push(`  audit_log_path: ${input.audit.audit_log_path}`);
  lines.push('```');
  lines.push('');
  lines.push('> **How to verify this artifact yourself:** check out the mesh at the recorded `mesh_sha`, replay the audit log at `audit_log_path`, and confirm the final event’s `event_hash` matches `chain_root_hash`.');
  return lines.join('\n');
}
