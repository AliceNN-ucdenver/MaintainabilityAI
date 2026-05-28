/**
 * D-PR4 sub-PR 1 — Pre-flight per-repo status derivation.
 *
 * Combines:
 *   - GitHub probe results (harness presence, issue-write permission, repo existence)
 *   - Greenfield Cheshire scaffold status
 *   - Coordination row + upstream PR states (from chain-ladder.yaml)
 *   - Has-the-landing-issue-been-opened-already? flag
 *
 * Returns ONE discriminated PreflightStatus per repo, with a fix-path
 * `reason` when relevant. The Looking Glass fan-out engine (D-PR4)
 * gates "Fan out N of M ready" on this; the Stage 5 card (D-PR5)
 * uses it to render per-row state + affordances.
 *
 * Pure function. NO GitHub API, NO file I/O, NO clock reads. The
 * caller pre-resolves every probe and passes results in.
 *
 * Decision order matters — earlier conditions short-circuit later
 * ones. The order here matches the user's mental model: "Does the
 * repo exist? Do I have permission? Is the harness installed? Are
 * dependencies merged? OK, you're ready."
 */
import type {
  AnyProbeResult,
  PreflightInputs,
  PreflightStatus,
} from './types';

export interface PreflightDecision {
  status: PreflightStatus;
  /** Human-readable fix-path hint; matches the discriminated probe failure. */
  reason?: string;
}

/**
 * Derive the per-repo status from probe results + coordination state.
 *
 * Decision tree (top to bottom; first match wins):
 *
 *   1. impl PR already exists → pr-opened / pr-merged / pr-rejected
 *   2. landing issue already opened (per design-fan-out.yaml row history) → opened
 *   3. greenfield scaffold in-flight → pending-scaffold
 *   4. probe `fetch-error` on any axis → return uncertainty: NEVER advance to ready
 *   5. greenfield + repo already exists + non-empty → repo-exists-conflict
 *   6. brownfield + repo not-found → repo-not-found
 *   7. permission probe says missing → permission-blocked
 *   8. brownfield + harness probe says missing → harness-missing
 *   9. coordination has unmerged upstream → pending-on-upstream
 *  10. all green → ready
 */
export function derivePreflightStatus(inputs: PreflightInputs): PreflightDecision {
  // 1. If the impl PR has already opened, that's the source of truth.
  if (inputs.implPrState === 'pr-merged') return { status: 'pr-merged' };
  if (inputs.implPrState === 'pr-rejected') {
    return {
      status: 'pr-rejected',
      reason: 'Implementation PR was closed without merging; revise the impl agent OR roll back the slice.',
    };
  }
  if (inputs.implPrState === 'pr-opened') return { status: 'pr-opened' };

  // 2. Landing issue already created in a prior fan-out wave?
  if (inputs.alreadyOpened) return { status: 'opened' };

  // 3. Greenfield scaffold mid-flight? Even if the rest of the probes
  //    look good, we shouldn't open the landing issue until scaffold
  //    completes (the impl-agent.agent.md file gets written by Cheshire
  //    during scaffold; opening the issue before is a race).
  if (
    inputs.repoStatus === 'create' &&
    (inputs.greenfieldScaffoldStatus === 'scaffolding' ||
      inputs.greenfieldScaffoldStatus === 'idle')
  ) {
    return { status: 'pending-scaffold', reason: greenfieldScaffoldHint(inputs.greenfieldScaffoldStatus) };
  }
  if (inputs.repoStatus === 'create' && inputs.greenfieldScaffoldStatus === 'failed') {
    return {
      status: 'pending-scaffold',
      reason: 'Greenfield Cheshire scaffold failed — retry from the Cheshire panel.',
    };
  }

  // 4. Probe uncertainty. NEVER advance to `ready` if we can't
  //    distinguish "definitely missing" from "couldn't tell". Phase E
  //    hardening lesson: surface the uncertainty in the UX.
  const fetchErrors = [
    probeFetchErrorDetail('harness presence', inputs.harnessPresence),
    probeFetchErrorDetail('issue-write permission', inputs.issueWritePermission),
    probeFetchErrorDetail('repo existence', inputs.repoExistence),
  ].filter((v): v is string => v !== null);
  if (fetchErrors.length > 0) {
    return {
      status: inputs.repoStatus === 'create' ? 'repo-not-found' : 'permission-blocked',
      reason: `Pre-flight probe failed: ${fetchErrors.join('; ')}. Retry pre-flight once GitHub recovers.`,
    };
  }

  // 5. Greenfield + repo already exists. ONLY a conflict when scaffold
  //    has NOT already completed — once scaffold is done, the repo is
  //    SUPPOSED to exist + have content (the seed commit + harness files).
  //    Without this carve-out, every successful greenfield run would
  //    falsely report `repo-exists-conflict` on the next pre-flight.
  if (
    inputs.repoStatus === 'create' &&
    inputs.repoExistence.kind === 'exists' &&
    inputs.greenfieldScaffoldStatus !== 'complete'
  ) {
    if (inputs.existingRepoIsEmpty === true) {
      // Existing empty repo: treat as ready-to-scaffold (do not block).
      // Fall through to subsequent checks; scaffold-status drives the rest.
      // (This branch is intentionally permissive: scaffold-over-empty is
      // safe; the seed commit is the first content.)
    } else {
      return {
        status: 'repo-exists-conflict',
        reason: `Greenfield repo ${inputs.repo} already exists and is not empty. Either rename the OKR's target slug OR remove the repo + retry.`,
      };
    }
  }

  // 6. Brownfield + repo doesn't exist on GitHub.
  if (inputs.repoStatus === 'connected' && inputs.repoExistence.kind === 'missing') {
    return {
      status: 'repo-not-found',
      reason: `Brownfield slug ${inputs.repo} returns 404. Check the slug in the OKR card's Target Code Repos.`,
    };
  }

  // 7. Permission check.
  if (inputs.issueWritePermission.kind === 'missing') {
    const perm = inputs.repoStatus === 'create' ? 'org repo-create' : 'issues:write';
    return {
      status: 'permission-blocked',
      reason: `PAT lacks ${perm} permission on ${inputs.repo}. Update the fine-grained PAT scopes in Settings → Secrets & Models.`,
    };
  }

  // 8. Brownfield harness check. Greenfield repos won't have the
  //    harness yet — that's the whole point of greenfield scaffold —
  //    so don't gate on this for greenfield.
  if (inputs.repoStatus === 'connected' && inputs.harnessPresence.kind === 'missing') {
    return {
      status: 'harness-missing',
      reason: `${inputs.repo} is missing .github/agents/implementation-agent.agent.md. Open the repo in workspace and run Cheshire → Scaffold to add the missing files; merge that PR, then re-check pre-flight.`,
    };
  }

  // 9. Coordination upstream dependency check. Only consult when there's
  //    a coordination row (single-repo OKRs skip this entirely).
  if (inputs.coordinationRow && inputs.coordinationRow.depends_on.length > 0) {
    const pending: string[] = [];
    for (const dep of inputs.coordinationRow.depends_on) {
      const depState = inputs.upstreamPrStates.get(dep) ?? 'not-started';
      if (depState !== 'pr-merged') pending.push(`${dep} (${depState})`);
    }
    if (pending.length > 0) {
      return {
        status: 'pending-on-upstream',
        reason: `Waiting on upstream PRs to merge: ${pending.join(', ')}.`,
      };
    }
  }

  // 10. All green — ready to open the landing issue.
  return { status: 'ready' };
}

function greenfieldScaffoldHint(status: PreflightInputs['greenfieldScaffoldStatus']): string {
  if (status === 'scaffolding') return 'Greenfield Cheshire scaffold in progress; row will flip to ready when scaffold completes.';
  if (status === 'idle') return 'Greenfield ready to scaffold; click Prepare in BAR on this row to open the affected BAR and launch Cheshire.';
  return 'Greenfield repo not yet scaffolded.';
}

function probeFetchErrorDetail(label: string, probe: AnyProbeResult): string | null {
  if (probe.kind === 'fetch-error') return `${label}: ${probe.detail}`;
  return null;
}

/**
 * Helper for the fan-out engine: given a set of pre-flight decisions,
 * return the slugs that are `ready` (eligible for "Fan out N of M ready"
 * click). Used to populate the button label + the per-row checkbox.
 */
export function readySlugs(decisions: Map<string, PreflightDecision>): string[] {
  const out: string[] = [];
  for (const [slug, d] of decisions) {
    if (d.status === 'ready') out.push(slug);
  }
  return out.sort();
}
