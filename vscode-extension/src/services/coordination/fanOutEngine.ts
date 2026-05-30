/**
 * D-PR4 sub-PR 3a — Looking Glass fan-out engine (pure orchestrator).
 *
 * Wires together every piece from sub-PRs 1 + 2 into a single API the
 * Looking Glass panel calls when the user clicks "Run pre-flight" on an
 * OKR detail card. The engine:
 *
 *   1. Parses coordination from the WHAT-phase code-design.md artifact.
 *   2. Verifies coordination against the OKR's `targetCodeRepos[]` using
 *      the same 7-rule (9-reason) verifier the workflow runs in
 *      audit-and-drift — so any verdict surfaced here reads identically
 *      to the workflow's audit comment.
 *   3. For each target repo, in parallel: runs the three pre-flight
 *      probes (harness presence for brownfield, issue-write permission,
 *      repo existence + isEmpty for greenfield) via the sub-PR 2
 *      adapters in `./probes`.
 *   4. Combines probe results + coordination row + caller-provided state
 *      (upstream PR states, greenfield scaffold status, already-opened
 *      flags, impl PR state) into a per-repo `PreflightDecision` using
 *      the pure `derivePreflightStatus` function from sub-PR 1.
 *   5. Returns a discriminated `FanOutPreflightReport`:
 *        - parse failure → `coordination-section-missing` or `coordination-yaml-malformed`
 *        - verify failure → `coordination-verify-failed` with the 9-reason verdict
 *        - happy path → per-repo entries + sorted ready slugs + topological waves
 *
 * The engine NEVER:
 *   - opens a landing issue (that's sub-PR 3b, panel-side wiring)
 *   - writes `design-fan-out.yaml` (that's sub-PR 6, MeshService)
 *   - dispatches the impl agent (sub-PR 3b reuses `assignCustomCopilotAgent`)
 *   - emits a signed audit event (Tier 2 audit trail = git history of
 *     `design-fan-out.yaml`; the `state_transition` kind stays
 *     workflow-owned per Bug Y)
 *
 * Pure orchestrator: takes a `GitHubService` for probe I/O + an inputs
 * struct for everything else. Tests mock `GitHubService` directly per
 * the existing `probes.test.ts` `fakeGithub({...})` pattern — no
 * Octokit, no real HTTP.
 *
 * Design doc: `vscode-extension/design/next-acts-tier-2-and-3.md` D-PR4.
 */
import type { GitHubService } from '../GitHubService';

import { applyConcurrencyCap, FANOUT_CONCURRENCY_CAP } from './concurrencyCap';
import { parseCoordination } from './parser';
import {
  derivePreflightStatus,
  readySlugs,
  type PreflightDecision,
} from './preflightDerivation';
import {
  getHarnessPresence,
  getIssueWritePermission,
  getRepoExistence,
  getRepoExistenceFull,
} from './probes';
import { topologicalWaves, verifyCoordination } from './topologicalSort';
import type {
  CoordinationDoc,
  CoordinationRow,
  ExistenceResult,
  PreflightInputs,
  PresenceResult,
} from './types';

/**
 * One target repo declared on the OKR (from `okr.yaml.actions[]
 * .objectiveAlignment.targetCodeRepos[]`). The status discriminator
 * mirrors A12.v1.1: `connected` = brownfield, `create` = greenfield.
 */
export interface FanOutTargetRepo {
  /** owner/name slug; MUST match the coordination row's `repo:` value. */
  slug: string;
  status: 'connected' | 'create';
}

/**
 * Inputs the engine consumes. Everything that's NOT a GitHub probe is
 * passed in by the caller (panel layer is responsible for reading
 * `design-fan-out.yaml`, polling impl PRs, etc., and feeding the engine
 * a snapshot).
 */
export interface FanOutPreflightInputs {
  /** OKR id for echo-back in the report — not used in any decision. */
  okrId: string;
  /** Raw markdown of the WHAT-phase code-design.md artifact. */
  designMarkdown: string;
  /** Target repos declared on the OKR. */
  targetRepos: readonly FanOutTargetRepo[];
  /**
   * Map of upstream slug → PR state. Drives `pending-on-upstream`.
   * Slugs not in the map default to `not-started`. Caller assembles
   * this from chain-ladder.yaml + live PR polling.
   */
  upstreamPrStates: ReadonlyMap<
    string,
    'pr-merged' | 'pr-opened' | 'not-started' | 'pr-rejected'
  >;
  /**
   * Greenfield slug → Cheshire scaffold status. Slugs not in the map
   * default to `idle`. Brownfield repos are ignored by
   * `derivePreflightStatus` (rule 3 gates only on `repoStatus === 'create'`).
   */
  greenfieldScaffoldStatus: ReadonlyMap<
    string,
    'idle' | 'scaffolding' | 'complete' | 'failed'
  >;
  /**
   * Slugs whose landing issue has already opened in this OKR's fan-out
   * (sourced from `design-fan-out.yaml` prior rows). Drives the
   * `opened` short-circuit in derivePreflightStatus.
   */
  alreadyOpenedRepos: ReadonlySet<string>;
  /**
   * Slug → impl PR state, once the impl agent opens a PR in the target
   * repo. Drives `pr-opened` / `pr-merged` / `pr-rejected`. Caller
   * sources this from periodic polling (D-PR5 Stage 5 card).
   */
  implPrStates: ReadonlyMap<string, 'pr-opened' | 'pr-merged' | 'pr-rejected'>;
}

/** Per-repo entry in the engine's report. */
export interface FanOutRepoEntry {
  slug: string;
  status: 'connected' | 'create';
  decision: PreflightDecision;
  /**
   * Coordination row for this repo (undefined only if the slug was in
   * `targetRepos` but absent from the coordination block — which
   * `verifyCoordination` would catch as `coordination-missing-repo`
   * before we ever get here, so this should be impossible on the
   * happy path).
   */
  coordinationRow?: CoordinationRow;
  /**
   * Bug-AAC — governance-tier warning for this repo's owning BAR,
   * populated by the panel AFTER the engine returns (the engine has no
   * mesh-reader access). Surfaces "restricted BAR → impl plan-only"
   * BEFORE dispatch so a plan-only PR isn't a surprise. Undefined when
   * the BAR can't be resolved or the tier imposes no constraint
   * (autonomous).
   */
  governance?: import('./governanceWarning').FanOutGovernanceWarning;
  /**
   * The impl PR opened on the TARGET code repo for this row, attached by
   * the panel AFTER the engine returns (sourced from the persisted
   * design-fan-out row's `implPrUrl`). Only present once the row reaches
   * `pr-opened`. Drives the OKR detail "Mark PR ready" affordance so a
   * draft Copilot-agent impl PR can be flipped to ready-for-review.
   */
  implPrUrl?: string;
  implPrNumber?: number;
}

/**
 * Engine output. Discriminated on `ok` + `reason` so the panel can
 * route each failure class to its own recovery affordance.
 */
export type FanOutPreflightReport =
  | {
      ok: false;
      okrId: string;
      reason: 'coordination-section-missing';
      detail: string;
    }
  | {
      ok: false;
      okrId: string;
      reason: 'coordination-yaml-malformed';
      detail: string;
    }
  | {
      ok: false;
      okrId: string;
      reason: 'coordination-verify-failed';
      /**
       * One of the 9 named reasons from `topologicalSort.verifyCoordination`.
       * Matches the workflow's audit-comment verdict string verbatim so
       * a panel-rendered failure reads the same as the GitHub audit
       * comment that would have flagged the same coordination block.
       */
      verifyReason: string;
    }
  | {
      ok: true;
      okrId: string;
      /** One entry per target repo, in the input order. */
      entries: FanOutRepoEntry[];
      /**
       * Sorted set of slugs whose decision is `ready`. Drives the
       * "Fan out N of M ready" button label and the per-row checkbox.
       */
      readyRepos: string[];
      /**
       * Topological wave grouping (index 0 = wave 1 = no deps). The
       * fan-out engine processes wave N only when all of wave N-1's
       * impl PRs have merged. Sourced from `topologicalWaves(doc)`.
       */
      waves: string[][];
      /**
       * Parsed + verified coordination doc — echoed so the panel can
       * render contract relationships in the Stage 5 card without
       * re-parsing the artifact.
       */
      coordinationDoc: CoordinationDoc;
      /**
       * Hard concurrency cap applied to this fan-out (FANOUT_CONCURRENCY_CAP).
       * Total in-flight impl runs are bounded to this value; excess ready
       * rows are demoted to `pending-on-cap` and drain via Re-check → Fan out.
       */
      cap: number;
      /**
       * Rows already in-flight (`opened` or `pr-opened`) when the cap was
       * applied. A chain head counts as 1 (its tail is `pending-on-upstream`).
       */
      inFlightCount: number;
      /**
       * Ready rows demoted to `pending-on-cap` this pass because the cap
       * was reached. They re-evaluate on the next Re-check.
       */
      queuedCount: number;
    };

/**
 * Run pre-flight for an OKR. Pure orchestrator: parse → verify → probe
 * (in parallel) → derive → return.
 *
 * No retries, no caching, no clock reads. The panel layer is
 * responsible for caching reports per OKR (D-PR5 will add a 60s poll
 * cadence on top of this engine).
 */
export async function runFanOutPreflight(
  github: GitHubService,
  inputs: FanOutPreflightInputs,
): Promise<FanOutPreflightReport> {
  // 1. Parse the coordination block from the WHAT artifact.
  const parsed = parseCoordination(inputs.designMarkdown);
  if (!parsed.ok) {
    if (parsed.reason === 'coordination-section-missing') {
      return {
        ok: false,
        okrId: inputs.okrId,
        reason: 'coordination-section-missing',
        detail:
          'The code-design.md artifact is missing the §10 H3 `### Cross-Repo Fan-Out & Dependency Ordering` block. Re-run WHAT — the agent prompt requires this section.',
      };
    }
    return {
      ok: false,
      okrId: inputs.okrId,
      reason: 'coordination-yaml-malformed',
      detail: parsed.detail,
    };
  }
  const doc = parsed.doc;

  // 2. Verify against the OKR's declared target repos. Match the
  //    workflow's audit-and-drift contract bit-for-bit — same 9 reasons.
  const verify = verifyCoordination(
    doc,
    inputs.targetRepos.map(r => r.slug),
  );
  if (!verify.ok) {
    return {
      ok: false,
      okrId: inputs.okrId,
      reason: 'coordination-verify-failed',
      verifyReason: verify.reason,
    };
  }

  // 3. Build a slug → coordination-row index for the per-repo step.
  const slugToRow = new Map<string, CoordinationRow>();
  for (const row of doc.coordination) slugToRow.set(row.repo, row);

  // 4. Probe each target repo in parallel. Empty `targetRepos` is a
  //    valid no-op happy-path (the OKR has nothing to fan out yet).
  const entries = await Promise.all(
    inputs.targetRepos.map(target =>
      buildEntry(github, target, slugToRow.get(target.slug), inputs),
    ),
  );

  // 5. Compose the waves (computed ONCE; reused for the cap pass below
  //    AND the returned `waves` field so admission order matches what
  //    the panel renders).
  const waves = topologicalWaves(doc);

  // 6. Apply the hard global concurrency cap. This MUTATES the
  //    `entry.decision` objects of any ready rows demoted to
  //    `pending-on-cap` — and `entries` is exactly what the panel
  //    renders, so the demotions are visible there. We compute the
  //    ready set AFTER the cap so `readyRepos` excludes capped rows.
  const cap = applyConcurrencyCap(entries, waves, FANOUT_CONCURRENCY_CAP);

  const decisionMap = new Map<string, PreflightDecision>();
  for (const e of entries) decisionMap.set(e.slug, e.decision);

  return {
    ok: true,
    okrId: inputs.okrId,
    entries,
    readyRepos: readySlugs(decisionMap),
    waves,
    coordinationDoc: doc,
    cap: FANOUT_CONCURRENCY_CAP,
    inFlightCount: cap.inFlight,
    queuedCount: cap.queued,
  };
}

/* ───────────────────────── helpers ───────────────────────── */

interface PerRepoProbes {
  harness: PresenceResult;
  permission: PresenceResult;
  existence: ExistenceResult;
  /** Only set for greenfield repos when existence is `exists`. */
  isEmpty?: boolean;
}

async function buildEntry(
  github: GitHubService,
  target: FanOutTargetRepo,
  coordinationRow: CoordinationRow | undefined,
  inputs: FanOutPreflightInputs,
): Promise<FanOutRepoEntry> {
  const [owner, name] = splitSlug(target.slug);
  const probes = await probesForRepo(github, owner, name, target.status);

  const preflightInputs: PreflightInputs = {
    repo: target.slug,
    repoStatus: target.status,
    harnessPresence: probes.harness,
    issueWritePermission: probes.permission,
    repoExistence: probes.existence,
    existingRepoIsEmpty: probes.isEmpty,
    coordinationRow,
    upstreamPrStates: cloneMap(inputs.upstreamPrStates),
    // Caller-passed scaffold status wins. Otherwise, for create-repo
    // targets, infer from observable facts:
    //   - repo exists + harness file present  → scaffold-complete
    //     (the harness file is what Cheshire writes at the end of
    //     scaffold, so its presence is the post-scaffold ground truth)
    //   - everything else                     → idle (the natural reading
    //     of "no caller record + no observable scaffold artifacts"
    //     is "scaffold hasn't been initiated yet")
    // Brownfield repos pass through `undefined` because rule 3 in
    // derivePreflightStatus only consults this field for
    // `repoStatus === 'create'`.
    greenfieldScaffoldStatus:
      inputs.greenfieldScaffoldStatus.get(target.slug) ??
      (target.status === 'create'
        ? (probes.existence.kind === 'exists' && probes.harness.kind === 'present'
            ? 'complete'
            : 'idle')
        : undefined),
    alreadyOpened: inputs.alreadyOpenedRepos.has(target.slug),
    implPrState: inputs.implPrStates.get(target.slug),
  };

  return {
    slug: target.slug,
    status: target.status,
    decision: derivePreflightStatus(preflightInputs),
    coordinationRow,
  };
}

/**
 * Brownfield runs the three probes. Greenfield ALSO runs all three:
 * harness is meaningless pre-scaffold (will return `missing` because
 * the repo 404s, which is fine — rule 8 in derivePreflightStatus is
 * brownfield-only so it short-circuits regardless), but POST-scaffold
 * harness presence is the ground-truth signal that scaffold completed.
 * The engine's buildEntry uses `harness.kind === 'present'` AND
 * `existence.kind === 'exists'` to infer `greenfieldScaffoldStatus
 * === 'complete'` when the caller has nothing better to pass, which
 * lets the "Re-check after scaffold" flow flip pending-scaffold →
 * ready without any cross-panel breadcrumb state.
 *
 * Greenfield uses the FULL existence probe to surface `isEmpty` for
 * the scaffold-over-empty carve-out (rule 5 in
 * `derivePreflightStatus`).
 */
async function probesForRepo(
  github: GitHubService,
  owner: string,
  name: string,
  status: 'connected' | 'create',
): Promise<PerRepoProbes> {
  if (status === 'create') {
    const [permission, existenceFull, harness] = await Promise.all([
      getIssueWritePermission(github, owner, name),
      getRepoExistenceFull(github, owner, name),
      getHarnessPresence(github, owner, name),
    ]);
    return {
      harness,
      permission,
      existence: collapseToExistence(existenceFull),
      isEmpty: existenceFull.kind === 'exists' ? existenceFull.isEmpty : undefined,
    };
  }

  const [harness, permission, existence] = await Promise.all([
    getHarnessPresence(github, owner, name),
    getIssueWritePermission(github, owner, name),
    getRepoExistence(github, owner, name),
  ]);
  return { harness, permission, existence };
}

function collapseToExistence(
  full: Awaited<ReturnType<typeof getRepoExistenceFull>>,
): ExistenceResult {
  if (full.kind === 'exists') return { kind: 'exists' };
  if (full.kind === 'missing') return { kind: 'missing' };
  return { kind: 'fetch-error', detail: full.detail };
}

function splitSlug(slug: string): [string, string] {
  const i = slug.indexOf('/');
  if (i < 0) return [slug, ''];
  return [slug.slice(0, i), slug.slice(i + 1)];
}

function cloneMap<K, V>(m: ReadonlyMap<K, V>): Map<K, V> {
  const out = new Map<K, V>();
  for (const [k, v] of m) out.set(k, v);
  return out;
}
