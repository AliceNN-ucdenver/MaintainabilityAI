/**
 * AuditEmitter — append-only JSONL writer with SHA-256 hash chain.
 *
 * Every node in both pipelines emits one event through this emitter; the
 * emitter:
 *   1. Assigns `event_id` (1, 2, 3, …) and `prev_event_hash` (sha256 of the
 *      previous event's full serialization).
 *   2. Computes `event_hash` (sha256 of this event with `event_hash` set to
 *      the canonical placeholder `''`).
 *   3. Appends the serialized event as one JSON line to
 *      `<audit-dir>/<run_id>.jsonl`.
 *
 * The chain is tamper-evident: changing any past event breaks every
 * subsequent `prev_event_hash`. The `run_complete` event pins the chain
 * root hash (= the final event's event_hash) so auditors only need to
 * verify one number to trust the whole run.
 *
 * Hash computation is deterministic regardless of object key order: we
 * canonicalize via a recursive key-sorted JSON stringify before hashing.
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AuditEvent,
  type AuditEvent as AuditEventType,
  type RunCompleteEvent,
} from '../schemas';

/**
 * Distributive Omit — preserves the discriminated union when stripping the
 * envelope fields the emitter fills in itself.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Caller-supplied partial event — the emitter fills in `run_id`, `event_id`,
 * `ts`, `prev_event_hash`, and `event_hash`. Per-variant payload fields
 * (`pure`, `llm`, `api`, `outcome`, `error`) come from the node.
 */
export type EventInput = DistributiveOmit<
  AuditEventType,
  'run_id' | 'event_id' | 'ts' | 'prev_event_hash' | 'event_hash'
> & {
  /** Optional ISO timestamp override for tests; defaults to "now". */
  ts?: string;
};

/** Helper input for `emitRunComplete` — same shape as EventInput restricted to run_complete, minus chain_root_hash. */
export type RunCompleteInput = DistributiveOmit<
  RunCompleteEvent,
  'run_id' | 'event_id' | 'ts' | 'prev_event_hash' | 'event_hash' | 'outcome'
> & {
  ts?: string;
  outcome: Omit<RunCompleteEvent['outcome'], 'chain_root_hash'>;
};

const PLACEHOLDER_HASH = '0'.repeat(64);

/** Recursively sort object keys so JSON.stringify produces a canonical form. */
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') { return value; }
  if (Array.isArray(value)) { return value.map(canonicalize); }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicalize(obj[key]);
  }
  return sorted;
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Hash an event with `event_hash` zeroed out so the hash itself is part of the JSON body. */
function hashEventBody(event: AuditEventType): string {
  const placeholderEvent = { ...event, event_hash: PLACEHOLDER_HASH };
  return sha256(JSON.stringify(canonicalize(placeholderEvent)));
}

export class AuditEmitter {
  private readonly filePath: string;
  private nextEventId = 1;
  private prevEventHash: string | null = null;
  private rootHash: string | null = null;
  private closed = false;

  /**
   * @param auditDir   target directory (created on demand)
   * @param runId      the run id; becomes `<runId>.jsonl`
   */
  constructor(auditDir: string, private readonly runId: string) {
    fs.mkdirSync(auditDir, { recursive: true });
    this.filePath = path.join(auditDir, `${runId}.jsonl`);
    // Refuse to clobber an existing run's audit file — log immutability is load-bearing.
    if (fs.existsSync(this.filePath)) {
      throw new Error(`Audit log already exists at ${this.filePath}; refusing to overwrite.`);
    }
    // Touch the file so concurrent readers see it.
    fs.writeFileSync(this.filePath, '', { flag: 'wx' });
  }

  /**
   * Emit one event. Returns the canonical serialized form (useful for tests).
   * Validates against the AuditEvent schema before writing.
   */
  emit(input: EventInput): AuditEventType {
    if (this.closed) {
      throw new Error('AuditEmitter is closed; cannot emit further events.');
    }
    const ts = input.ts ?? new Date().toISOString();
    // Build with a placeholder hash, hash, then overwrite event_hash with the real hash.
    const draft = {
      ...input,
      run_id: this.runId,
      event_id: this.nextEventId,
      ts,
      prev_event_hash: this.prevEventHash,
      event_hash: PLACEHOLDER_HASH,
    } as AuditEventType;

    const parsed = AuditEvent.parse(draft);
    const eventHash = hashEventBody(parsed);
    const finalEvent = { ...parsed, event_hash: eventHash } as AuditEventType;

    fs.appendFileSync(this.filePath, JSON.stringify(finalEvent) + '\n', 'utf8');

    this.nextEventId += 1;
    this.prevEventHash = eventHash;
    this.rootHash = eventHash;
    if (finalEvent.node_kind === 'run_complete') {
      this.closed = true;
    }
    return finalEvent;
  }

  /**
   * Emit a `run_complete` event. The emitter computes `chain_root_hash` itself
   * (the hash of the run_complete event), so callers leave that field blank
   * (or omit it) — it's filled in here.
   */
  emitRunComplete(input: RunCompleteInput): RunCompleteEvent {
    const enriched = {
      ...input,
      outcome: { ...input.outcome, chain_root_hash: PLACEHOLDER_HASH },
    } as EventInput;
    const event = this.emit(enriched) as RunCompleteEvent;
    // The emitted event_hash IS the chain root by definition — rewrite the
    // outcome.chain_root_hash to that value on the in-memory record we return.
    // (The serialized line on disk uses the placeholder for chain_root_hash;
    // we keep it that way so the event_hash matches the line. Auditors
    // verify the chain root by hashing the line as written.)
    return { ...event, outcome: { ...event.outcome, chain_root_hash: event.event_hash } };
  }

  /** SHA-256 of the most recent event — equal to `chain_root_hash` after run_complete. */
  get currentRootHash(): string | null {
    return this.rootHash;
  }

  /** Absolute path to the JSONL file this emitter writes to. */
  get path(): string {
    return this.filePath;
  }
}

/**
 * Parse a JSONL audit file back into typed events. Re-validates every event
 * against the schema; returns null on malformed input.
 */
export function readAuditLog(filePath: string): AuditEventType[] | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim().length > 0);
    const events: AuditEventType[] = [];
    for (const line of lines) {
      const parsed = AuditEvent.parse(JSON.parse(line));
      events.push(parsed);
    }
    return events;
  } catch {
    return null;
  }
}

/**
 * Verify the hash chain of a sequence of events.
 *   - Each event's prev_event_hash must match the previous event's event_hash.
 *   - Each event's event_hash must match a recomputation against the line.
 *   - The first event must have prev_event_hash === null.
 * Returns the chain root hash (= final event_hash) on success, null on any failure.
 */
export function verifyChain(events: AuditEventType[]): string | null {
  let prev: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.prev_event_hash !== prev) { return null; }
    const recomputed = hashEventBody(e);
    if (e.event_hash !== recomputed) { return null; }
    if (e.event_id !== i + 1) { return null; }
    prev = e.event_hash;
  }
  return prev;
}
