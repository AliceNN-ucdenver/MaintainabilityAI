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
  // ── v4 agentic-SDLC governance fields (Phase A-PR4) ─────────────────
  // All three are OPTIONAL so legacy CI-only runs (without an OKR anchor)
  // continue to validate. Phase B+ OKR-anchored runs populate them so
  // verify-chain can stitch events across repos via intent_thread_uuid.
  // See vscode-extension/design/agentic-sdlc.md §4.4 + §11.1.6.
  /** Which OKR phase this event belongs to. */
  phase: z.enum(['why', 'how', 'what']).optional(),
  /** Anchor OKR id (human-readable). */
  okr_id: z.string().optional(),
  /** Cross-repo audit correlation key (UUID v4). */
  intent_thread_uuid: z.string().uuid().optional(),
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

/**
 * `iteration_summary` — emitted once per PRD refinement loop iteration after
 * `verify_grounding` resolves. Carries the 4 reviewer signals + composite +
 * verdict in one place so the published PRD can render a score-progression
 * table without re-parsing earlier events.
 */
const IterationSummaryEvent = Envelope.extend({
  node_kind: z.literal('iteration_summary'),
  iteration: z.number().int().min(1).max(5),
  summary: z.object({
    det_arch: z.object({
      severity: z.enum(['PASS', 'MINOR', 'MAJOR']),
      invalid_citations: z.number().int().nonnegative(),
      coverage_discrepancies: z.number().int().nonnegative(),
    }),
    det_sec: z.object({
      severity: z.enum(['PASS', 'MINOR', 'MAJOR']),
      invalid_citations: z.number().int().nonnegative(),
      coverage_discrepancies: z.number().int().nonnegative(),
    }),
    llm_arch: z.object({
      score: z.number().min(0).max(1),
      severity: z.enum(['PASS', 'MINOR', 'MAJOR', 'BLOCKING']),
    }),
    llm_sec: z.object({
      score: z.number().min(0).max(1),
      severity: z.enum(['PASS', 'MINOR', 'MAJOR', 'BLOCKING']),
    }),
    composite_score: z.number().min(0).max(1),
    /** |llm_arch.score - llm_sec.score| — used by verify_grounding for the disagreement rule. */
    disagreement_delta: z.number().min(0).max(1),
    verdict: z.enum(['PASS', 'ITERATE', 'EXHAUSTED']),
    reason: z.string(),
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
  IterationSummaryEvent,
  RunCompleteEvent,
]);

export type AuditEvent = z.infer<typeof AuditEvent>;
export type PureApiEvent = z.infer<typeof PureApiEvent>;
export type LlmEvent = z.infer<typeof LlmEvent>;
export type PureEvent = z.infer<typeof PureEvent>;
export type NodeErrorEvent = z.infer<typeof NodeErrorEvent>;
export type IterationSummaryEvent = z.infer<typeof IterationSummaryEvent>;
export type RunCompleteEvent = z.infer<typeof RunCompleteEvent>;
