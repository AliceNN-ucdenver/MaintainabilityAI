/**
 * D-PR4 sub-PR 1 — Cross-repo coordination types.
 *
 * These types model the §10 H3 `### Cross-Repo Fan-Out & Dependency
 * Ordering` block that the code-design-agent emits (per D-PR4-prep.3)
 * and the coordination verifier checks (per D-PR4-prep.4 in
 * code-design-agent.yml). They are consumed by the Looking Glass
 * fan-out engine (D-PR4) to decide topological ordering, by the Stage 5
 * card (D-PR5) to render per-repo state, and by the rollup exporter
 * (D-PR8) to thread implementation rows into chain-ladder.yaml.
 *
 * Discriminated unions throughout — never collapse failure classes to
 * a generic `failed`. Matches the Phase E hardening lessons.
 */

/**
 * Per-repo role hint set by the agent during code-design synthesis.
 * Not used for verifier logic (that's based on `depends_on`); but
 * surfaces as a label in the Stage 5 card and helps reviewers scan
 * the coordination block.
 */
export type CoordinationRole = 'foundation' | 'provider' | 'consumer' | 'independent';

/**
 * A contract entry inside `provides[]` or `consumes[]`. The shape is
 * the same for both directions; provider rows fill `consumed_by[]`,
 * consumer rows fill `from`. Rule 7 (contract reciprocity) checks
 * that provider.consumed_by ↔ consumer.from line up for the same
 * `contract` slug.
 */
export interface CoordinationContract {
  /** Short slug identifying the contract (e.g. "GET /api/profile/:id" or "jwt-claim:profile_access"). */
  contract: string;
  /** Provider-side: which target repos consume this contract. */
  consumed_by?: string[];
  /** Consumer-side: which target repo provides this contract. */
  from?: string;
  /** Consumer-side: which FR/SR identifiers this contract enables. */
  required_for?: string[];
  /** Provider-side optional note (e.g. "must merge before consumers"). */
  readiness?: string;
}

export interface CoordinationRow {
  /** Owner/name slug; MUST appear in the OKR's targetCodeRepos[]. */
  repo: string;
  /** 1 = no deps; N = 1 + max(dep.wave). Verifier enforces minimality. */
  fanout_wave: number;
  coordination_role: CoordinationRole;
  /** Other target-repo slugs this repo depends on. */
  depends_on: string[];
  provides: CoordinationContract[];
  consumes: CoordinationContract[];
  /** One-sentence human-readable rationale. */
  rationale?: string;
}

export interface CoordinationDoc {
  coordination: CoordinationRow[];
}

/**
 * Per Phase E source-atomicity discipline: discriminated parse result.
 * Failure cases carry enough detail for the caller to surface a
 * specific fix path to the user (no silent fallback to empty array).
 */
export type CoordinationParseResult =
  | { ok: true; doc: CoordinationDoc }
  | { ok: false; reason: 'coordination-section-missing' }
  | { ok: false; reason: 'coordination-yaml-malformed'; detail: string };

/**
 * Verifier result. The `reason` string matches the workflow's 7 named
 * failure conditions verbatim so a single set of named reasons covers
 * both the workflow (Python+PyYAML) and the extension (TypeScript) —
 * the verdict shown to a user via Stage 5 is the same string the
 * workflow emits in the audit comment.
 */
export type CoordinationVerifyResult =
  | { ok: true }
  | {
      ok: false;
      /**
       * One of the 9 discriminated named reasons. Suffix carries
       * specifics (slug, contract, etc.) per the workflow contract:
       *   - coordination-section-missing
       *   - coordination-yaml-malformed
       *   - coordination-missing-repo:<slug>
       *   - coordination-unknown-dep:<slug>→<unknown>
       *   - coordination-cycle:[a→b→c→a]
       *   - coordination-wave-mismatch:<slug>@wave=N deps-in-wave=M
       *   - coordination-consumes-not-in-depends:<slug>→<from>
       *   - coordination-wave-nonminimal:<slug>@wave=N expected=M
       *   - coordination-contract-mismatch:<provider>→<consumer>:<contract>
       */
      reason: string;
    };

/**
 * Pre-flight per-repo status. Drives the Stage 5 card's status column
 * AND the fan-out engine's "is this row ready to open a landing issue?"
 * decision. Discriminated states each map to a distinct fix path:
 *
 *   - `ready`                — pre-flight passed; landing issue NOT yet opened
 *   - `opened`               — landing issue created, impl agent dispatched
 *   - `pending-on-upstream`  — coordination dep PR has not merged yet
 *   - `pending-scaffold`     — greenfield Cheshire scaffold in flight
 *   - `harness-missing`      — brownfield repo lacks .github/agents/implementation-agent.agent.md
 *   - `permission-blocked`   — PAT can't create issue (brownfield) or repo (greenfield)
 *   - `repo-not-found`       — brownfield slug 404 OR greenfield repo not yet created
 *   - `repo-exists-conflict` — greenfield request but the repo already exists + is non-empty
 *   - `pr-opened`            — impl PR live in target repo
 *   - `pr-merged`            — slice done
 *   - `pr-rejected`          — slice failed review (closed without merge)
 */
export type PreflightStatus =
  | 'ready'
  | 'opened'
  | 'pending-on-upstream'
  | 'pending-scaffold'
  | 'harness-missing'
  | 'permission-blocked'
  | 'repo-not-found'
  | 'repo-exists-conflict'
  | 'pr-opened'
  | 'pr-merged'
  | 'pr-rejected';

/**
 * Discriminated probe results — `getRepoFileStatus` pattern from
 * Phase E. NEVER collapse `missing` and `fetch-error` to `null`;
 * pre-flight refuses to dispatch on uncertainty (`fetch-error`).
 *
 * Two flavors keep the discriminator narrowing predictable in
 * TypeScript: presence probes use `'present'`, existence probes use
 * `'exists'`. (A single generic `ProbeResult<TPresent>` widens to
 * `{ kind: string }` at certain call sites and breaks narrowing.)
 */
export type PresenceResult =
  | { kind: 'present' }
  | { kind: 'missing' }
  | { kind: 'fetch-error'; detail: string };

export type ExistenceResult =
  | { kind: 'exists' }
  | { kind: 'missing' }
  | { kind: 'fetch-error'; detail: string };

/** Either probe shape — used in helpers that just care about `'fetch-error'`. */
export type AnyProbeResult = PresenceResult | ExistenceResult;

/**
 * Inputs the pre-flight state-derivation function consumes. All
 * GitHub-API probes are pre-resolved by the caller; this function is
 * pure (no I/O).
 */
export interface PreflightInputs {
  /** Target repo slug being evaluated (owner/name). */
  repo: string;
  /** A12.v1.1 targetCodeRepoStatus for this repo. */
  repoStatus: 'connected' | 'create';
  /**
   * Probe results from the caller. All are discriminated unions so
   * `fetch-error` is distinct from `missing` from `present`.
   */
  harnessPresence: PresenceResult;
  issueWritePermission: PresenceResult;
  repoExistence: ExistenceResult;
  /**
   * For greenfield repos: is the existing repo (if any) empty? Only
   * consulted when `repoExistence.kind === 'exists'`. Empty = ok to
   * scaffold over; non-empty = repo-exists-conflict.
   */
  existingRepoIsEmpty?: boolean;
  /** Coordination row for this repo from the parsed §10 H3 block. */
  coordinationRow?: CoordinationRow;
  /**
   * Map of upstream repo slug → its current PR-state. Used to decide
   * `pending-on-upstream` vs `ready` for rows with `depends_on`.
   */
  upstreamPrStates: Map<string, 'pr-merged' | 'pr-opened' | 'not-started' | 'pr-rejected'>;
  /**
   * Greenfield-specific: Cheshire's scaffold state for this repo, when
   * the user has triggered the greenfield mode but scaffold hasn't
   * yet completed. Drives the `pending-scaffold` state.
   */
  greenfieldScaffoldStatus?: 'idle' | 'scaffolding' | 'complete' | 'failed';
  /**
   * Has the landing issue for this repo already been created in
   * this OKR's fan-out? When true, the row should reflect `opened`
   * (or a later PR-state) rather than `ready`.
   */
  alreadyOpened: boolean;
  /**
   * Once the impl PR opens in the target repo, this is its state.
   * Drives `pr-opened` / `pr-merged` / `pr-rejected`.
   */
  implPrState?: 'pr-opened' | 'pr-merged' | 'pr-rejected';
}

/**
 * Per-repo row in `okrs/<id>/what/design-fan-out.yaml`. Git history
 * of this file IS the Tier 2 audit trail (per design doc key call #5).
 * NOT signed (the `state_transition` event kind is workflow-owned and
 * unsigned by contract; emitting it from the app would violate Bug Y).
 *
 * NOT exported in sub-PR 1 — the writer lives in sub-PR 6 (MeshService
 * `writeDesignFanOut`). Will be `export`ed when D-PR4 sub-PR 6 lands.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface DesignFanOutRow {
  repo: string;
  status: PreflightStatus;
  /** Optional fix-path hint; matches the discriminated probe failure. */
  reason?: string;
  /** Landing issue URL once opened. */
  landingIssueUrl?: string;
  /** Greenfield: was the repo created by this fan-out run? */
  repo_created?: boolean;
  /** Implementation PR URL once the impl agent opens one. */
  implPrUrl?: string;
  /** IMPL-<date>-<slug>-<nonce> per the D-PR7 storage contract. */
  implementation_run_id?: string;
  /** ISO 8601 timestamp of the latest state change. */
  updatedAt?: string;
  /** ISO 8601 timestamp of when the landing issue first opened. */
  openedAt?: string;
}
