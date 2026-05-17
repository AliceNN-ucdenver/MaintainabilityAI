/**
 * run-id — generate stable, sortable, low-collision run identifiers.
 *
 * Format: `<KIND>-YYYY-MM-DD-<8 hex chars>`
 *   KIND ∈ {RES, PRD}
 *
 * The date is the run's UTC start day; the 8-hex tail is the first 4 bytes
 * of a crypto.randomBytes call. 32 bits gives birthday-collision probability
 * around 1 in 65,536 for the same date — more than enough for human-scale
 * mesh-wide audit.
 */
import { randomBytes } from 'node:crypto';

export type RunKind = 'RES' | 'PRD';

export function generateRunId(kind: RunKind, now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const tail = randomBytes(4).toString('hex');
  return `${kind}-${yyyy}-${mm}-${dd}-${tail}`;
}
