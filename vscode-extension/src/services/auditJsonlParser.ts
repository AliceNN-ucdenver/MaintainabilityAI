/**
 * auditJsonlParser — pure parser for `.research-audit/<run_id>.jsonl`.
 *
 * The runner writes one JSON event per line, hash-chained. This parser
 * pulls out the minimal fields the Active Runs UI needs — `node_kind`,
 * `node_name`, `ts`, and (when present) the `run_complete` outcome —
 * without depending on the runner package or its Zod schemas.
 *
 * Lenient by design: skips blank lines and malformed JSON; treats events
 * with missing fields as "still parseable" so an in-flight log can be
 * tailed even if the most recent line was written half-way through a
 * flush. The UI cares about *what's the latest event we can show*, not
 * about strict schema conformance.
 */

export type ParsedNodeKind = 'pure_api' | 'llm' | 'pure' | 'node_error' | 'iteration_summary' | 'run_complete' | string;
export type RunCompleteStatus = 'ok' | 'failed' | 'partial';

export interface ParsedAuditEvent {
  event_id: number;
  ts: string;
  node_kind: ParsedNodeKind;
  node_name: string;
  /** Original raw record — UI can render specific kinds (e.g. iteration_summary tables). */
  raw: Record<string, unknown>;
}

export interface AuditJsonlSnapshot {
  events: ParsedAuditEvent[];
  /** Most recent successfully-parsed event, or null when the log is empty. */
  lastEvent: ParsedAuditEvent | null;
  /** True iff a `run_complete` event has been seen. */
  isComplete: boolean;
  /** Outcome reported by the run_complete event, when present. */
  runCompleteOutcome: RunCompleteStatus | null;
  /** Count of malformed lines that were skipped — diagnostic. */
  skippedLineCount: number;
}

/**
 * Parse a JSONL blob into the event snapshot the UI consumes.
 * Always succeeds — invalid lines are skipped, not thrown.
 */
export function parseAuditJsonl(text: string): AuditJsonlSnapshot {
  const events: ParsedAuditEvent[] = [];
  let skipped = 0;
  let runCompleteOutcome: RunCompleteStatus | null = null;
  let isComplete = false;

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) { continue; }
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      skipped += 1;
      continue;
    }
    if (!parsed || typeof parsed !== 'object') {
      skipped += 1;
      continue;
    }
    const obj = parsed as Record<string, unknown>;
    const event_id = typeof obj.event_id === 'number' ? obj.event_id : NaN;
    const ts = typeof obj.ts === 'string' ? obj.ts : '';
    const node_kind = typeof obj.node_kind === 'string' ? obj.node_kind : '';
    const node_name = typeof obj.node_name === 'string' ? obj.node_name : '';
    if (!Number.isFinite(event_id) || !ts || !node_kind || !node_name) {
      skipped += 1;
      continue;
    }
    events.push({ event_id, ts, node_kind, node_name, raw: obj });

    if (node_kind === 'run_complete') {
      isComplete = true;
      const outcome = obj.outcome as Record<string, unknown> | undefined;
      const status = outcome?.status;
      if (status === 'ok' || status === 'failed' || status === 'partial') {
        runCompleteOutcome = status;
      }
    }
  }

  return {
    events,
    lastEvent: events.length > 0 ? events[events.length - 1] : null,
    isComplete,
    runCompleteOutcome,
    skippedLineCount: skipped,
  };
}

/**
 * Format a node_name like `synthesize_prd[iter2]` into a short human-readable
 * label for status displays.
 */
export function humanizeNodeName(nodeName: string): string {
  const iterMatch = nodeName.match(/^(.+?)\[iter(\d+)\]$/);
  if (iterMatch) {
    return `${iterMatch[1].replace(/_/g, ' ')} (iter ${iterMatch[2]})`;
  }
  return nodeName.replace(/_/g, ' ');
}
