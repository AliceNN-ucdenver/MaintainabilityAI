/**
 * OKRService — file-system surface for the OKR data model.
 *
 * Owns reads + writes of `okrs/<id>/okr.yaml`. All mutations go through
 * this service so the audit invariants stay enforceable:
 *
 *  - `intent_thread_uuid` is generated exactly once, at create-time,
 *    and propagates unchanged through every action of the OKR. See
 *    vscode-extension/design/agentic-sdlc.md §4.4 (lifecycle).
 *
 *  - `actions[]` is append-only via `appendAction`. The OKR YAML is the
 *    audit ladder; rewriting it would break the chain. Updates to an
 *    existing action's status/scores/rounds go through `updateAction`
 *    which preserves immutable fields (id, phase, runId, intentThreadUuid,
 *    governanceTier, createdAt).
 *
 *  - Concurrency: `okr-bus.yml` is the only writer in production
 *    (it serializes via GitHub Actions `concurrency:` group keyed by
 *    okr_id, see §9.1). Looking Glass also writes (Pause/Resume,
 *    retrospective). We keep writes simple — read, mutate, write —
 *    relying on the workflow's concurrency primitive for serialization.
 *    If a write-write race ever materializes here, the layer to add
 *    locking at is this one, not the YAML.
 *
 * Conventions match BarService + MeshService:
 *   - Sync fs (matches the rest of the codebase; no async file I/O)
 *   - Graceful null returns on missing files (no exceptions for
 *     not-found; caller decides whether absence is an error)
 *   - Zod validation at the FS boundary (read), trusted types in memory
 *   - Path-first method signatures (`meshPath: string` as first arg)
 *
 * Phase A scope (this PR): readAll, read, create, appendAction,
 * updateAction, updateStatus, setPaused, targetCodeReposFor, tierFor.
 * exportAuditReport ships in Phase E (stub here returns 'not implemented').
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'yaml';
import {
  OkrCardSchema,
  OkrCreateInputSchema,
  type OkrCard,
  type OkrCreateInput,
  type OkrAction,
  type OkrStatus,
  type OkrSummary,
  type OkrPhaseProgress,
  type GovernanceTier,
} from '../types/okr';

/**
 * Tier thresholds from design doc §6.2:
 *   Autonomous: 80-100   Supervised: 50-79   Restricted: 0-49
 * Tier is derived from the lowest pillar score across all affected
 * BARs (Restricted wins — the weakest BAR drives the gate).
 */
const TIER_AUTONOMOUS_MIN = 80;
const TIER_SUPERVISED_MIN = 50;

/**
 * Optional BarService dependency. Injected via the constructor so
 * OKRService can be unit-tested without a real BarService. Phase A
 * tests pass an in-memory fake; production wires the real BarService
 * from `vscode-extension/src/services/BarService.ts`.
 */
export interface BarScoreSource {
  /** Returns a composite score [0–100] for a BAR or null if unknown. */
  compositeScoreFor(meshPath: string, barId: string): number | null;
}

export class OKRService {
  constructor(private readonly barScoreSource?: BarScoreSource) {}

  /**
   * List all OKRs under <meshPath>/okrs/. Returns a list of computed
   * summaries suitable for the OKR list view. Skips entries that fail
   * schema validation (logs nothing to stderr — callers can re-`read`
   * for details if they care which one was malformed).
   */
  readAll(meshPath: string): OkrSummary[] {
    const okrsDir = path.join(meshPath, 'okrs');
    if (!fs.existsSync(okrsDir)) { return []; }
    const entries = fs.readdirSync(okrsDir, { withFileTypes: true });
    const out: OkrSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) { continue; }
      if (!entry.name.startsWith('OKR-')) { continue; }
      const summary = this.summarize(meshPath, entry.name);
      if (summary) { out.push(summary); }
    }
    out.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    return out;
  }

  /**
   * Read a single OKR card by id. Returns null if the directory is
   * missing or the file fails Zod validation. Callers needing the
   * underlying error should use `readRaw` which surfaces issues.
   */
  read(meshPath: string, okrId: string): OkrCard | null {
    const yamlPath = this.okrYamlPath(meshPath, okrId);
    if (!fs.existsSync(yamlPath)) { return null; }
    try {
      const content = fs.readFileSync(yamlPath, 'utf8');
      const parsed = yaml.parse(content);
      const result = OkrCardSchema.safeParse(parsed);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Validate-and-return variant. Returns { ok, value? , error? } so
   * callers can surface schema errors in the UI (e.g. "okr.yaml on
   * disk doesn't validate — open in editor: <path>").
   */
  readRaw(
    meshPath: string,
    okrId: string,
  ): { ok: true; value: OkrCard } | { ok: false; error: string } {
    const yamlPath = this.okrYamlPath(meshPath, okrId);
    if (!fs.existsSync(yamlPath)) {
      return { ok: false, error: `OKR not found: ${yamlPath}` };
    }
    let content: string;
    try {
      content = fs.readFileSync(yamlPath, 'utf8');
    } catch (err) {
      return { ok: false, error: `Failed to read ${yamlPath}: ${(err as Error).message}` };
    }
    let parsed: unknown;
    try {
      parsed = yaml.parse(content);
    } catch (err) {
      return { ok: false, error: `YAML parse error in ${yamlPath}: ${(err as Error).message}` };
    }
    const result = OkrCardSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: `Schema validation failed: ${result.error.message}` };
    }
    return { ok: true, value: result.data };
  }

  /**
   * Create a new OKR under <meshPath>/okrs/<id>/okr.yaml. Generates the
   * id from quarter + idSuffix (or auto-generates if omitted), stamps
   * `meta.intentThreadUuid` (new v4 UUID — see §4.4), seeds the BTABoK
   * section defaults, and writes the YAML. Returns the OkrCard.
   *
   * Idempotency: refuses to overwrite an existing OKR (returns null);
   * callers should check `read()` first if they need upsert semantics.
   */
  create(meshPath: string, draft: OkrCreateInput): OkrCard | null {
    const validated = OkrCreateInputSchema.parse(draft);
    const id = this.buildOkrId(validated, meshPath);
    const okrDir = path.join(meshPath, 'okrs', id);
    if (fs.existsSync(okrDir)) { return null; }
    const now = new Date().toISOString();
    const card: OkrCard = {
      meta: {
        card: 'BTABoKItem',
        id,
        owner: validated.owner,
        status: 'draft',
        paused: false,
        createdAt: now,
        updatedAt: now,
        intentThreadUuid: crypto.randomUUID(),
      },
      overview: {
        name: 'OKR Card',
        description: 'Defines a structured approach for setting objectives, measuring progress, and aligning with strategic outcomes.',
        notes: 'Bridges strategy and execution within BTABoK.',
      },
      howToUse: {
        name: 'How to use this card',
        description: [
          '1. Draft the objective (concise, ambitious, aligned with org strategy).',
          '2. Define 3-5 SMART key results.',
          '3. Click `Start Why` on the OKR detail page to run market research.',
          '4. After Why merges, click `Start How` to run the PRD agent.',
          '5. After How merges, click `Start What` for the code-design + per-repo fan-out.',
          '6. After delivery, complete keyResultRetrospective and valueLearning.',
        ].join('\n'),
        notes: 'Iterative — re-run any phase from the OKR detail page.',
      },
      objective: validated.objective,
      keyResults: validated.keyResults,
      actions: [],
      keyResultRetrospective: {
        name: 'Key Result Retrospective',
        description: '',
        results: [],
      },
      objectiveAlignment: {
        name: 'Objective Alignment',
        description: 'Links this OKR to strategic outcome areas (intent cascade + impacted BARs).',
        platformId: validated.objectiveAlignment.platformId,
        affectedBarIds: validated.objectiveAlignment.affectedBarIds,
        targetCodeRepos: validated.objectiveAlignment.targetCodeRepos,
        intentCascade: {
          org: validated.objectiveAlignment.intentCascade.org ?? '',
          role: validated.objectiveAlignment.intentCascade.role ?? '',
          developer: validated.objectiveAlignment.intentCascade.developer ?? '',
          user: validated.objectiveAlignment.intentCascade.user ?? '',
        },
      },
      valueLearning: { name: 'Value & Learning', description: 'Insights captured during execution.', learnings: [] },
      downloads: { name: 'Downloads', description: 'Supporting materials and references.', links: [] },
      governance: validated.governance,
    };

    fs.mkdirSync(okrDir, { recursive: true });
    fs.mkdirSync(path.join(okrDir, 'why'), { recursive: true });
    fs.mkdirSync(path.join(okrDir, 'how'), { recursive: true });
    fs.mkdirSync(path.join(okrDir, 'what'), { recursive: true });
    fs.mkdirSync(path.join(okrDir, 'audit', 'events'), { recursive: true });
    // .gitkeep on empty dirs so the structure round-trips through git
    for (const dir of ['why', 'how', 'what', 'audit/events']) {
      const gitkeep = path.join(okrDir, dir, '.gitkeep');
      try { fs.writeFileSync(gitkeep, '', { encoding: 'utf8', flag: 'wx' }); } catch { /* exists */ }
    }
    // Initial chain ladder file (empty — gets populated as phases complete)
    fs.writeFileSync(
      path.join(okrDir, 'audit', 'chain-ladder.yaml'),
      '# Cross-phase audit chain ladder. Written by okr-bus.yml as each phase merges.\nchain: []\n',
      'utf8',
    );

    this.writeCard(meshPath, card);
    return card;
  }

  /**
   * Append a new action to the OKR. Used by okr-bus.yml on each
   * agent-run dispatch. Validates the action shape and the
   * intentThreadUuid invariant (must match the OKR's meta value).
   *
   * Returns the updated card or null if validation fails (caller logs).
   */
  appendAction(meshPath: string, okrId: string, action: OkrAction): OkrCard | null {
    const card = this.read(meshPath, okrId);
    if (!card) { return null; }
    if (action.intentThreadUuid !== card.meta.intentThreadUuid) {
      throw new Error(
        `Action intentThreadUuid (${action.intentThreadUuid}) does not match OKR's ` +
        `(${card.meta.intentThreadUuid}). Refusing to break the audit chain.`,
      );
    }
    // Refuse to add a duplicate action id
    if (card.actions.some(a => a.id === action.id)) {
      throw new Error(`Action ${action.id} already exists on OKR ${okrId}`);
    }
    card.actions.push(action);
    card.meta.updatedAt = new Date().toISOString();
    this.writeCard(meshPath, card);
    return card;
  }

  /**
   * Patch an existing action's mutable fields (status, scores, rounds,
   * artifact, pr, hatterChainRoot, completedAt). Immutable fields
   * (id, phase, agent, runId, intentThreadUuid, parentIntentThread,
   * governanceTier, targetRepo, createdAt) are NOT overwritable —
   * attempts to change them throw to prevent audit-chain corruption.
   */
  updateAction(
    meshPath: string,
    okrId: string,
    actionId: string,
    patch: Partial<Pick<OkrAction,
      | 'status'
      | 'reviewerScores'
      | 'rounds'
      | 'artifact'
      | 'pr'
      | 'hatterChainRoot'
      | 'completedAt'
      | 'description'
    >>,
  ): OkrCard | null {
    const card = this.read(meshPath, okrId);
    if (!card) { return null; }
    const idx = card.actions.findIndex(a => a.id === actionId);
    if (idx === -1) { return null; }
    const immutableViolation = (patch as Record<string, unknown>);
    for (const k of ['id', 'phase', 'agent', 'runId', 'intentThreadUuid', 'parentIntentThread', 'governanceTier', 'targetRepo', 'createdAt']) {
      if (k in immutableViolation) {
        throw new Error(`Cannot patch immutable action field: ${k}`);
      }
    }
    card.actions[idx] = { ...card.actions[idx], ...patch };
    card.meta.updatedAt = new Date().toISOString();
    this.writeCard(meshPath, card);
    return card;
  }

  /**
   * Set the OKR's top-level status field. Validates transition is
   * forward-only (no `shipped → draft` accidents). Pause toggles use
   * `setPaused` instead.
   */
  updateStatus(meshPath: string, okrId: string, newStatus: OkrStatus): OkrCard | null {
    const card = this.read(meshPath, okrId);
    if (!card) { return null; }
    if (!isForwardStatusTransition(card.meta.status, newStatus)) {
      throw new Error(`Refusing backward status transition: ${card.meta.status} -> ${newStatus}`);
    }
    card.meta.status = newStatus;
    card.meta.updatedAt = new Date().toISOString();
    this.writeCard(meshPath, card);
    return card;
  }

  /** Pause / unpause the OKR. Pause freezes Start buttons in Looking Glass; it does NOT cancel in-flight runs. */
  setPaused(meshPath: string, okrId: string, paused: boolean): OkrCard | null {
    const card = this.read(meshPath, okrId);
    if (!card) { return null; }
    card.meta.paused = paused;
    card.meta.updatedAt = new Date().toISOString();
    this.writeCard(meshPath, card);
    return card;
  }

  /**
   * Derive the list of code repos the What phase will fan out to. The
   * OKR declares `objectiveAlignment.targetCodeRepos` explicitly today;
   * a future enhancement will also fold in the union of
   * `bar.app.yaml.repos[]` across affected BARs (de-duplicating against
   * the explicit list). For Phase A we return what the OKR declares.
   */
  targetCodeReposFor(meshPath: string, okrId: string): string[] {
    const card = this.read(meshPath, okrId);
    if (!card) { return []; }
    return [...card.objectiveAlignment.targetCodeRepos];
  }

  /**
   * Derive the effective governance tier for this OKR. Reads pillar
   * scores from each `affectedBarIds` entry via the injected
   * BarScoreSource; returns the LOWEST tier across them (Restricted
   * wins — the weakest BAR drives the gate). Returns 'restricted' if
   * any BAR's score is unknown — fail safe.
   *
   * If `governance.maxAutoRounds === 0` is set in the OKR's overrides,
   * we still derive tier from scores (the override sets BEHAVIOR; the
   * tier is the SOURCE-OF-TRUTH gate). Recording the tier on the
   * Hatter's Tag at run start is what mitigates tier creep (§6.2).
   */
  tierFor(meshPath: string, okrId: string): GovernanceTier {
    const card = this.read(meshPath, okrId);
    if (!card) { return 'restricted'; }
    return this.tierForCard(meshPath, card);
  }

  /** Same as tierFor but works on an in-memory card (avoids a second disk read). */
  tierForCard(meshPath: string, card: OkrCard): GovernanceTier {
    if (!this.barScoreSource) { return 'restricted'; }
    let minScore = 100;
    for (const barId of card.objectiveAlignment.affectedBarIds) {
      const score = this.barScoreSource.compositeScoreFor(meshPath, barId);
      if (score === null || score === undefined) { return 'restricted'; }
      if (score < minScore) { minScore = score; }
    }
    if (minScore >= TIER_AUTONOMOUS_MIN) { return 'autonomous'; }
    if (minScore >= TIER_SUPERVISED_MIN) { return 'supervised'; }
    return 'restricted';
  }

  /**
   * Compute the OKR list-view summary. Source-of-truth for what shows
   * up on the OKR list (§10.1). Returns null if the OKR can't be read.
   */
  summarize(meshPath: string, okrId: string): OkrSummary | null {
    const card = this.read(meshPath, okrId);
    if (!card) { return null; }
    const phaseProgress = computePhaseProgress(card);
    const lastAction = card.actions[card.actions.length - 1];
    const lastActivityAt = lastAction?.completedAt ?? lastAction?.createdAt ?? card.meta.updatedAt;
    const chainRootShort = (lastAction?.hatterChainRoot ?? '').slice(0, 12);
    const primaryBarId = card.objectiveAlignment.affectedBarIds[0] ?? '';
    return {
      id: card.meta.id,
      objective: card.objective.name,
      ownerHandle: card.meta.owner,
      platformId: card.objectiveAlignment.platformId,
      primaryBarId,
      primaryBarTier: this.tierForCard(meshPath, card),
      status: card.meta.status,
      paused: card.meta.paused ?? false,
      intentThreadUuid: card.meta.intentThreadUuid,
      phaseProgress,
      lastActivityAt,
      chainRootShort,
      targetCodeRepos: [...card.objectiveAlignment.targetCodeRepos],
      path: path.join(meshPath, 'okrs', card.meta.id),
    };
  }

  /**
   * Phase E feature — bundles every artifact from the OKR's lifetime
   * into a zip with traceability + chain verification. Stubbed in Phase A.
   * See vscode-extension/design/agentic-sdlc.md §11.6 for the bundle
   * structure spec.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  exportAuditReport(meshPath: string, okrId: string): { ok: false; reason: string } {
    return { ok: false, reason: 'not-implemented-yet (Phase E)' };
  }

  // ── Internals ───────────────────────────────────────────────────────

  private okrYamlPath(meshPath: string, okrId: string): string {
    return path.join(meshPath, 'okrs', okrId, 'okr.yaml');
  }

  private writeCard(meshPath: string, card: OkrCard): void {
    const okrDir = path.join(meshPath, 'okrs', card.meta.id);
    fs.mkdirSync(okrDir, { recursive: true });
    // yaml.stringify produces stable, diff-friendly output; we accept its
    // defaults (no fancy formatting) so git diffs stay small across edits.
    const content = yaml.stringify(card, { lineWidth: 0, defaultStringType: 'PLAIN' });
    fs.writeFileSync(path.join(okrDir, 'okr.yaml'), content, 'utf8');
  }

  private buildOkrId(input: OkrCreateInput, meshPath: string): string {
    if (input.idSuffix) {
      const quarter = input.quarter ?? currentQuarter();
      const platformShort = input.objectiveAlignment.platformId.replace(/^PLT-/, '');
      // Pattern: OKR-<quarter>-<platformShort>-<NNN>-<idSuffix>
      const next = this.nextOkrSerial(meshPath, quarter, platformShort);
      return `OKR-${quarter}-${platformShort}-${String(next).padStart(3, '0')}-${input.idSuffix}`;
    }
    const quarter = input.quarter ?? currentQuarter();
    const platformShort = input.objectiveAlignment.platformId.replace(/^PLT-/, '');
    const next = this.nextOkrSerial(meshPath, quarter, platformShort);
    return `OKR-${quarter}-${platformShort}-${String(next).padStart(3, '0')}`;
  }

  private nextOkrSerial(meshPath: string, quarter: string, platformShort: string): number {
    const prefix = `OKR-${quarter}-${platformShort}-`;
    const okrsDir = path.join(meshPath, 'okrs');
    if (!fs.existsSync(okrsDir)) { return 1; }
    const entries = fs.readdirSync(okrsDir);
    let max = 0;
    for (const entry of entries) {
      if (!entry.startsWith(prefix)) { continue; }
      const rest = entry.substring(prefix.length);
      const numStr = rest.split('-')[0];
      const n = parseInt(numStr, 10);
      if (!isNaN(n) && n > max) { max = n; }
    }
    return max + 1;
  }
}

// ── Pure helpers (exported for unit tests) ────────────────────────────

/**
 * Linear order of statuses. Used by `updateStatus` to refuse backward
 * transitions. Pause/Unpause goes through `setPaused` instead so it
 * doesn't pollute this order.
 */
const STATUS_ORDER: OkrStatus[] = [
  'draft',
  'researching',
  'prd-pending',
  'prd-blocked',     // can rejoin into prd-pending after escalation
  'design-pending',
  'building',
  'shipped',
  'archived',
];

export function isForwardStatusTransition(from: OkrStatus, to: OkrStatus): boolean {
  if (from === to) { return true; }
  // 'prd-blocked' -> 'prd-pending' is allowed (escalation unlocks)
  if (from === 'prd-blocked' && to === 'prd-pending') { return true; }
  // Any state -> 'archived' is allowed (admin close-out)
  if (to === 'archived') { return true; }
  const fromIdx = STATUS_ORDER.indexOf(from);
  const toIdx = STATUS_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) { return false; }
  return toIdx >= fromIdx;
}

export function computePhaseProgress(card: OkrCard): OkrPhaseProgress {
  const phaseStatus = (phase: 'why' | 'how' | 'what'): 'not_started' | 'in_progress' | 'complete' => {
    const actions = card.actions.filter(a => a.phase === phase);
    if (actions.length === 0) { return 'not_started'; }
    if (actions.some(a => a.status === 'complete')) { return 'complete'; }
    return 'in_progress';
  };
  return {
    why: phaseStatus('why'),
    how: phaseStatus('how'),
    what: phaseStatus('what'),
  };
}

export function currentQuarter(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();  // 0-11
  const q = Math.floor(month / 3) + 1;
  return `${year}Q${q}`;
}
