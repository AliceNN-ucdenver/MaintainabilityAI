/**
 * session-context — env-var-backed run identity for skill auto-emission (B28).
 *
 * Every agentic-SDLC run flows through a single GitHub Actions job. That job
 * already exports `MESH_PATH` for the runner; B28 extends the contract with
 * four more env vars so the runner can auto-emit `skill_call` audit events
 * without the agent having to call `audit-emit-event` after every skill.
 *
 * | env var               | shape                                              |
 * |-----------------------|----------------------------------------------------|
 * | `OKR_ID`              | non-empty string                                   |
 * | `RUN_ID`              | non-empty string (`IMPL-*` routes to target repo)  |
 * | `INTENT_THREAD_UUID`  | non-empty string (UUID expected but not validated) |
 * | `PHASE`               | `'why' \| 'how' \| 'what' \| 'implementation'`     |
 *
 * If ANY var is missing or `PHASE` is not one of the canonical values,
 * `readSessionContext()` returns `null` and the runner falls back to legacy
 * behavior — the agent emits audit events explicitly via the `audit-emit-event`
 * skill (or doesn't, and the workflow's chain-verify catches the gap). This
 * preserves backward compatibility with pre-B28 chains while letting new runs
 * benefit from deterministic emission.
 *
 * Codex-r3 Bug 1 (Tier 2 hand-off): `'implementation'` phase + `IMPL-*` run
 * id route the runner's audit writers to the TARGET REPO's
 * `.maintainability/audit/{events,keys}/...` rather than the mesh's
 * `okrs/<id>/audit/...`. The implementation-agent runs INSIDE the target
 * repo's working copy, so its evidence files live there. See
 * `auditBaseDir()` in skills.ts.
 *
 * The auto-emission itself happens in `runSkill()` (skills.ts) — this module
 * is just the env-var reader so it stays testable in isolation.
 */

export type RunPhase = 'why' | 'how' | 'what' | 'implementation';

export interface SessionContext {
  okrId: string;
  runId: string;
  intentThreadUuid: string;
  phase: RunPhase;
}

const PHASES: readonly RunPhase[] = ['why', 'how', 'what', 'implementation'];

function isRunPhase(value: string): value is RunPhase {
  return (PHASES as readonly string[]).includes(value);
}

/**
 * Read the four session-context env vars. Returns null if any are absent or
 * `PHASE` is invalid — callers MUST handle null as "no auto-emission, run
 * the skill anyway." Never throws.
 */
export function readSessionContext(): SessionContext | null {
  const okrId = process.env.OKR_ID;
  const runId = process.env.RUN_ID;
  const intentThreadUuid = process.env.INTENT_THREAD_UUID;
  const phase = process.env.PHASE;
  if (!okrId || !runId || !intentThreadUuid || !phase) { return null; }
  if (!isRunPhase(phase)) { return null; }
  return { okrId, runId, intentThreadUuid, phase };
}
