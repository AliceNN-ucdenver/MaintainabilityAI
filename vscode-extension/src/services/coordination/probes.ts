/**
 * D-PR4 sub-PR 2 — Coordination probe adapters.
 *
 * Bridges between the GitHubService primitives (which return
 * `{ status: 'ok' | 'not-found' | 'fetch-error' }` shapes per the
 * Phase E rollup hardening) and the coordination types
 * (`PresenceResult` / `ExistenceResult` with `kind: 'present' |
 * 'exists' | 'missing' | 'fetch-error'`).
 *
 * Keeps the field-name + value translation in one place so neither
 * side has to know about the other's conventions. GitHubService stays
 * generic; coordination/* stays self-contained for testing.
 *
 * Each function in this module is a thin adapter — NO business logic,
 * NO Promise chaining, NO fallbacks. Failures from the underlying
 * service map 1:1 to coordination probe values.
 */
import type { GitHubService } from '../GitHubService';
import type {
  ExistenceResult,
  PresenceResult,
} from './types';

/** Path Cheshire scaffolds when installing the agentic harness. */
export const IMPLEMENTATION_AGENT_PATH = '.github/agents/implementation-agent.agent.md';

/**
 * Probe whether a target repo has the implementation agent template
 * installed. Returns `present` if the file exists on the default
 * branch, `missing` if it doesn't, `fetch-error` for transient or
 * permission failures.
 *
 * The fan-out engine uses this to decide brownfield row state:
 *   - `present`     → row can flow to `ready` (subject to other probes)
 *   - `missing`     → row goes to `harness-missing`; deflect to Cheshire
 *   - `fetch-error` → never advance to `ready` (refuse on uncertainty)
 */
export async function getHarnessPresence(
  github: GitHubService,
  owner: string,
  repo: string,
): Promise<PresenceResult> {
  const result = await github.getRepoFileStatus(owner, repo, IMPLEMENTATION_AGENT_PATH);
  if (result.status === 'ok') return { kind: 'present' };
  if (result.status === 'not-found') return { kind: 'missing' };
  return { kind: 'fetch-error', detail: result.reason };
}

/**
 * Probe whether the configured PAT has issues:write on a target repo.
 * Returns `present` only when GitHub reports `permissions.push: true`
 * on the repo metadata. Any read-only / no-access state maps to
 * `missing`; transient failures map to `fetch-error`.
 */
export async function getIssueWritePermission(
  github: GitHubService,
  owner: string,
  repo: string,
): Promise<PresenceResult> {
  const result = await github.checkIssueWritePermission(owner, repo);
  if (result.status === 'present') return { kind: 'present' };
  if (result.status === 'missing') return { kind: 'missing' };
  return { kind: 'fetch-error', detail: result.reason };
}

/**
 * Probe whether a target repo slug exists on GitHub. Returns the
 * discriminated `ExistenceResult`. For greenfield rows the fan-out
 * engine also checks the `isEmpty` flag (returned alongside
 * `'exists'`) to decide scaffold-over-empty vs repo-exists-conflict.
 *
 * Because `ExistenceResult` itself doesn't carry the emptiness or
 * default-branch fields, callers that need them should use
 * `github.getRepoExistence` directly. This adapter is for the simple
 * "does the row need to be opened?" decision.
 */
export async function getRepoExistence(
  github: GitHubService,
  owner: string,
  repo: string,
): Promise<ExistenceResult> {
  const result = await github.getRepoExistence(owner, repo);
  if (result.status === 'exists') return { kind: 'exists' };
  if (result.status === 'not-found') return { kind: 'missing' };
  return { kind: 'fetch-error', detail: result.reason };
}

/**
 * Convenience: when greenfield pre-flight needs BOTH the existence
 * answer AND the isEmpty flag, this returns the raw shape from
 * GitHubService directly (skip the `ExistenceResult` adapter). The
 * fan-out engine wires the `isEmpty` field into `PreflightInputs.existingRepoIsEmpty`.
 */
export async function getRepoExistenceFull(
  github: GitHubService,
  owner: string,
  repo: string,
): Promise<
  | { kind: 'exists'; isEmpty: boolean; defaultBranch: string }
  | { kind: 'missing' }
  | { kind: 'fetch-error'; detail: string }
> {
  const result = await github.getRepoExistence(owner, repo);
  if (result.status === 'exists') {
    return { kind: 'exists', isEmpty: result.isEmpty, defaultBranch: result.defaultBranch };
  }
  if (result.status === 'not-found') return { kind: 'missing' };
  return { kind: 'fetch-error', detail: result.reason };
}
