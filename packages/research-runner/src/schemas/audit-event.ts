/**
 * AuditEvent — the hash-chained JSONL events written to
 * `.research-audit/<run_id>.jsonl` by every node in both pipelines.
 *
 * Discriminated by `node_kind`. The common envelope at the top of every
 * variant carries the chain: `prev_event_hash` + `event_hash`, both
 * SHA-256. The first event in a run has `prev_event_hash: null`. The
 * `run_complete` event closes the run with a chain root hash.
 *
 * See docs/design/research-and-prd-agents.md §"Audit schema — per-node
 * JSONL events" for the canonical definitions.
 */
import { z } from 'zod';
import {
  GitSha,
  GuardrailMode,
  IsoTimestamp,
  LlmProvider,
  RunId,
  Sha256,
} from './primitives';

/** Common envelope present on every event (NOT a partial — shared base). */
const Envelope = z.object({
  run_id: RunId,
  /** Monotonically incrementing within a run, starting at 1. */
  event_id: z.number().int().positive(),
  ts: IsoTimestamp,
  node_name: z.string().min(1),
  duration_ms: z.number().int().nonnegative(),
  /** SHA-256 of the previous serialized event (without its own event_hash). Null on event 1. */
  prev_event_hash: Sha256.nullable(),
  /** SHA-256 of THIS event with `event_hash` set to the empty string. */
  event_hash: Sha256,
});

/** `pure_api` — deterministic external HTTP call (Tavily, arXiv, USPTO, HN, GitHub REST). */
const PureApiEvent = Envelope.extend({
  node_kind: z.literal('pure_api'),
  api: z.object({
    provider: z.string(),
    endpoint: z.string(),
    /** Redacted query / body — secrets must NOT appear here. */
    request_summary: z.string(),
    http_status: z.number().int(),
    response_byte_count: z.number().int().nonnegative(),
  }),
});

/** `llm` — non-deterministic LLM call (plan_queries, synthesize, expert reviews). */
const LlmEvent = Envelope.extend({
  node_kind: z.literal('llm'),
  llm: z.object({
    provider: LlmProvider,
    model: z.string(),
    prompt_pack: z.object({
      /** Path relative to mesh root, e.g. `.caterpillar/prompts/research/synthesis.md@v1.0.0`. */
      path: z.string(),
      sha256: Sha256,
    }),
    input_tokens: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
    /** USD cost estimate. */
    cost_usd: z.number().nonnegative(),
    /** Guardrail decisions for this hop. */
    guardrails: z.object({
      mode: GuardrailMode,
      pre: z.enum(['PASS', 'WARN', 'BLOCK']),
      post: z.enum(['PASS', 'WARN', 'BLOCK']),
    }),
  }),
});

/** `pure` — local-only deterministic computation (validate, dedupe, structural check). */
const PureEvent = Envelope.extend({
  node_kind: z.literal('pure'),
  pure: z.object({
    inputs_summary: z.string(),
    outputs_summary: z.string(),
  }),
});

/** `node_error` — any node failure, before any retry. */
const NodeErrorEvent = Envelope.extend({
  node_kind: z.literal('node_error'),
  error: z.object({
    message: z.string(),
    /** Optional stack — redacted of secrets. */
    stack: z.string().optional(),
    retryable: z.boolean(),
  }),
});

/** `run_complete` — final event emitted by verify_and_trigger. Closes the chain. */
const RunCompleteEvent = Envelope.extend({
  node_kind: z.literal('run_complete'),
  outcome: z.object({
    status: z.enum(['ok', 'failed', 'partial']),
    mesh_sha: GitSha,
    total_input_tokens: z.number().int().nonnegative(),
    total_output_tokens: z.number().int().nonnegative(),
    total_cost_usd: z.number().nonnegative(),
    artifact_paths: z.array(z.string()),
    pr_url: z.string().url().optional(),
    /** SHA-256 of the entire chain (the last event's event_hash). */
    chain_root_hash: Sha256,
  }),
});

export const AuditEvent = z.discriminatedUnion('node_kind', [
  PureApiEvent,
  LlmEvent,
  PureEvent,
  NodeErrorEvent,
  RunCompleteEvent,
]);

export type AuditEvent = z.infer<typeof AuditEvent>;
export type PureApiEvent = z.infer<typeof PureApiEvent>;
export type LlmEvent = z.infer<typeof LlmEvent>;
export type PureEvent = z.infer<typeof PureEvent>;
export type NodeErrorEvent = z.infer<typeof NodeErrorEvent>;
export type RunCompleteEvent = z.infer<typeof RunCompleteEvent>;
