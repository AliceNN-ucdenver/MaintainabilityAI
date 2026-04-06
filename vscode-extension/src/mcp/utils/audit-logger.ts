/**
 * Audit Logger — structured audit trail for governance events.
 * Appends JSON-line entries to .redqueen/audit-log.jsonl in the mesh.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { AuditLogEntry, ScoreDelta } from '../../types/redqueen';

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export function createAuditEntry(
  action: string,
  barId: string,
  barName: string,
  payload: Record<string, unknown>,
  correlation?: {
    correlationId?: string;
    prNumber?: number;
    commitSha?: string;
    workflowRunId?: string;
  },
): AuditLogEntry {
  return {
    timestamp: new Date().toISOString(),
    action,
    barId,
    barName,
    correlationId: correlation?.correlationId,
    prNumber: correlation?.prNumber,
    commitSha: correlation?.commitSha,
    workflowRunId: correlation?.workflowRunId,
    payload,
  };
}

export function appendAuditLog(meshPath: string, entry: AuditLogEntry): void {
  const logDir = path.join(meshPath, '.redqueen');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logPath = path.join(logDir, 'audit-log.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
}

export function readAuditLog(meshPath: string, barId?: string, limit?: number): AuditLogEntry[] {
  const logPath = path.join(meshPath, '.redqueen', 'audit-log.jsonl');
  if (!fs.existsSync(logPath)) { return []; }

  const lines = fs.readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(line => line.trim().length > 0);

  let entries: AuditLogEntry[] = lines.map(line => JSON.parse(line));

  if (barId) {
    entries = entries.filter(e => e.barId === barId);
  }

  // Return most recent first
  entries.reverse();
  if (limit) {
    entries = entries.slice(0, limit);
  }

  return entries;
}

export function computeScoreDelta(
  barId: string,
  barName: string,
  previous: { composite: number; architecture: number; security: number; informationRisk: number; operations: number },
  current: { composite: number; architecture: number; security: number; informationRisk: number; operations: number },
  trigger: 'snapshot' | 'review' | 'decay' = 'snapshot',
): ScoreDelta {
  return {
    barId,
    barName,
    timestamp: new Date().toISOString(),
    previousComposite: previous.composite,
    currentComposite: current.composite,
    delta: current.composite - previous.composite,
    pillarDeltas: {
      architecture: current.architecture - previous.architecture,
      security: current.security - previous.security,
      informationRisk: current.informationRisk - previous.informationRisk,
      operations: current.operations - previous.operations,
    },
    trigger,
  };
}
