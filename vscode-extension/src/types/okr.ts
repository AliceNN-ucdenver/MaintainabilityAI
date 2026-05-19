/**
 * OKR card types — the BTABoK 9-section structure plus the v4 extensions
 * (intent_thread_uuid lifecycle, intent_cascade Court Hierarchy, tier-aware
 * governance overrides, action ladder with reviewer scores).
 *
 * Spec'd in vscode-extension/design/agentic-sdlc.md §4.2 (schema) and
 * §4.4 (intent_thread_uuid lifecycle). This file is the SINGLE SOURCE OF
 * TRUTH for the OKR data model — OKRService imports types from here,
 * the webview imports types from here, the audit-emitter reads types
 * from here. If a field gets added in the design doc, add it here first.
 *
 * Validation strategy: Zod schemas at the file-system boundary
 * (OKRService.read), inferred TypeScript types everywhere else. Single
 * declaration; ambient code consumes z.infer types.
 */
import { z } from 'zod';
import type { GovernanceTier } from './governance';

// ── Enums ────────────────────────────────────────────────────────────

export const OkrStatusSchema = z.enum([
  'draft',           // OKR card created, no phase started
  'researching',     // Why phase in flight
  'prd-pending',     // Why merged, How not started
  'prd-blocked',     // How blocked (Restricted tier or reviewer fail)
  'design-pending',  // How merged, What not started
  'building',        // What merged, per-repo fan-out issues open
  'shipped',         // All target_code_repos report shipped
  'archived',        // OKR closed out (any reason)
]);
export type OkrStatus = z.infer<typeof OkrStatusSchema>;

/**
 * Zod schema for tier values. The TypeScript type itself (`GovernanceTier`)
 * is owned by `governance.ts` so OKRs reuse the same union string set as the
 * rest of the codebase. Re-export here for downstream consumers.
 */
export const GovernanceTierSchema = z.enum(['autonomous', 'supervised', 'restricted']);
export type { GovernanceTier };

export const OkrPhaseSchema = z.enum(['why', 'how', 'what']);
export type OkrPhase = z.infer<typeof OkrPhaseSchema>;

export const OkrActionStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'under_review',
  'revision_required',
  'human_gate',
  'blocked',
  'complete',
  'failed_timeout',
  'failed_skill',
  'stalled',
  'cancelled',
]);
export type OkrActionStatus = z.infer<typeof OkrActionStatusSchema>;

// ── Nested objects (BTABoK card sections) ────────────────────────────

export const KeyResultSchema = z.object({
  id: z.string().regex(/^KR-\d+$/, 'KR id must match KR-N'),
  metric: z.string().min(1),
  target: z.string().min(1),
  measurement: z.string().min(1),
  actual: z.string().optional(),       // populated on retrospective
  metTarget: z.boolean().optional(),   // populated on retrospective
  evidenceUrl: z.string().url().optional(),
});
export type KeyResult = z.infer<typeof KeyResultSchema>;

export const IntentCascadeSchema = z.object({
  org: z.string().default(''),
  role: z.string().default(''),
  developer: z.string().default(''),
  user: z.string().default(''),
});
export type IntentCascade = z.infer<typeof IntentCascadeSchema>;

export const TargetRepoStatusSchema = z.enum(['declared', 'connected', 'unreachable']);
export type TargetRepoStatus = z.infer<typeof TargetRepoStatusSchema>;

export const ObjectiveAlignmentSchema = z.object({
  name: z.string().default('Objective Alignment'),
  description: z.string().default(''),
  platformId: z.string(),
  affectedBarIds: z.array(z.string()).min(1),
  targetCodeRepos: z.array(z.string()).default([]),
  intentCascade: IntentCascadeSchema.default({ org: '', role: '', developer: '', user: '' }),
});
export type ObjectiveAlignment = z.infer<typeof ObjectiveAlignmentSchema>;

export const ReviewerScoresSchema = z.object({
  architect: z.number().nullable().optional(),
  security: z.number().nullable().optional(),
});
export type ReviewerScores = z.infer<typeof ReviewerScoresSchema>;

/**
 * One action == one agent run for one phase. The ladder of actions[]
 * IS the audit chain across phases. Walking it by sorting on createdAt
 * and following parentIntentThread reconstructs the cross-phase tree.
 */
export const OkrActionSchema = z.object({
  id: z.string().regex(/^ACT-\d+$/, 'Action id must match ACT-N'),
  phase: OkrPhaseSchema,
  description: z.string().min(1),
  agent: z.string().min(1),                       // e.g. "market-research-agent"
  runId: z.string().min(1),                       // e.g. "RES-2026-05-19-abc123"
  artifact: z.string().optional(),                // path relative to okr root
  pr: z.string().url().optional(),
  hatterChainRoot: z.string().optional(),         // sha256 of the chain head
  intentThreadUuid: z.string().uuid(),            // canonical thread id
  parentIntentThread: z.string().uuid().nullable().optional(),  // null on first phase
  targetRepo: z.string().optional(),              // set on What 3b per-repo actions
  reviewerScores: ReviewerScoresSchema.default({}),
  rounds: z.number().int().min(0).default(0),
  governanceTier: GovernanceTierSchema,
  status: OkrActionStatusSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export type OkrAction = z.infer<typeof OkrActionSchema>;

// ── Governance overrides ─────────────────────────────────────────────

/**
 * Per-OKR governance overrides. Effective gates are derived from tier
 * (see OKRService.tierFor). These overrides let an OKR opt into stricter
 * (or in audit-logged cases, looser) bounds than its tier default.
 */
export const OkrGovernanceSchema = z.object({
  scoreThreshold: z.number().min(0).max(100).optional(),
  maxAutoRounds: z.number().int().min(0).max(5).optional(),
  maxSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  maxCostUsd: z.number().min(0).optional(),
  pocketWatchThreshold: z.object({
    semanticSimilarityMin: z.number().min(0).max(1),
    editDistanceRatioMax: z.number().min(0).max(1),
  }).optional(),
}).optional();
export type OkrGovernance = z.infer<typeof OkrGovernanceSchema>;

// ── Retrospective + value-learning + downloads ───────────────────────

export const KeyResultRetrospectiveResultSchema = z.object({
  krId: z.string().regex(/^KR-\d+$/),
  actual: z.string(),
  metTarget: z.boolean(),
  evidenceUrl: z.string().url().optional(),
});
export type KeyResultRetrospectiveResult = z.infer<typeof KeyResultRetrospectiveResultSchema>;

export const ValueLearningEntrySchema = z.object({
  phase: OkrPhaseSchema,
  insight: z.string().min(1),
  date: z.string().datetime(),
});
export type ValueLearningEntry = z.infer<typeof ValueLearningEntrySchema>;

export const DownloadLinkSchema = z.object({
  kind: z.enum(['research-pr', 'prd-pr', 'design-prs', 'audit-export', 'other']),
  url: z.string().url().optional(),
  urls: z.array(z.string().url()).optional(),
});
export type DownloadLink = z.infer<typeof DownloadLinkSchema>;

// ── BTABoK 9-section sub-objects ─────────────────────────────────────

const BtabokSectionSchema = z.object({
  name: z.string().default(''),
  description: z.string().default(''),
  notes: z.string().optional(),
});

export const OkrMetaSchema = z.object({
  card: z.literal('BTABoKItem'),
  id: z.string().regex(/^OKR-/, 'OKR id must start with "OKR-"'),
  owner: z.string().min(1),
  status: OkrStatusSchema,
  paused: z.boolean().optional(),  // true while user-paused (§10.8)
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  intentThreadUuid: z.string().uuid(),  // generated at create-time (§4.4)
});
export type OkrMeta = z.infer<typeof OkrMetaSchema>;

export const OkrObjectiveSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  notes: z.string().optional(),
});
export type OkrObjective = z.infer<typeof OkrObjectiveSchema>;

// ── Top-level OKR card schema ────────────────────────────────────────

/**
 * The BTABoK 9-section OKR card. Mirrors the YAML structure in
 * vscode-extension/design/agentic-sdlc.md §4.2.
 *
 * Field-name convention: schema fields are camelCase (TypeScript
 * convention). The YAML on disk uses camelCase too (per the design
 * example: keyResults, objectiveAlignment, keyResultRetrospective,
 * valueLearning). OKRService handles the disk → memory mapping; there's
 * no naming translation needed for current fields.
 */
export const OkrCardSchema = z.object({
  // Section 0 — meta (provenance, not BTABoK)
  meta: OkrMetaSchema,

  // Section 1 — overview
  overview: BtabokSectionSchema.default({
    name: 'OKR Card',
    description: '',
  }),

  // Section 2 — howToUse
  howToUse: BtabokSectionSchema.default({
    name: 'How to use this card',
    description: '',
  }),

  // Section 3 — objective
  objective: OkrObjectiveSchema,

  // Section 4 — keyResults (3–5 SMART metrics)
  keyResults: z.array(KeyResultSchema).min(1).max(7),

  // Section 5 — actions (audit ladder — written by agents over time)
  actions: z.array(OkrActionSchema).default([]),

  // Section 6 — keyResultRetrospective
  keyResultRetrospective: z.object({
    name: z.string().default('Key Result Retrospective'),
    description: z.string().default(''),
    results: z.array(KeyResultRetrospectiveResultSchema).default([]),
  }).default({ name: 'Key Result Retrospective', description: '', results: [] }),

  // Section 7 — objectiveAlignment (platform + BARs + intent cascade)
  objectiveAlignment: ObjectiveAlignmentSchema,

  // Section 8 — valueLearning
  valueLearning: z.object({
    name: z.string().default('Value & Learning'),
    description: z.string().default(''),
    learnings: z.array(ValueLearningEntrySchema).default([]),
  }).default({ name: 'Value & Learning', description: '', learnings: [] }),

  // Section 9 — downloads
  downloads: z.object({
    name: z.string().default('Downloads'),
    description: z.string().default(''),
    links: z.array(DownloadLinkSchema).default([]),
  }).default({ name: 'Downloads', description: '', links: [] }),

  // Optional governance overrides
  governance: OkrGovernanceSchema,
});
export type OkrCard = z.infer<typeof OkrCardSchema>;

// ── Draft inputs (used by OKRService.create) ─────────────────────────

/**
 * Minimum fields a caller must provide to create a new OKR. Everything
 * else is defaulted by OKRService.create() — id is generated, meta is
 * filled, intent_thread_uuid is generated, lifecycle timestamps are
 * stamped.
 */
export const OkrCreateInputSchema = z.object({
  idSuffix: z.string().regex(/^[a-z0-9-]+$/, 'idSuffix must be slug-safe').optional(),  // e.g. "celeb-api"; auto-generated if omitted
  quarter: z.string().regex(/^\d{4}Q[1-4]$/, 'quarter must match YYYYQN').optional(),    // e.g. "2026Q1"; defaults to current quarter
  owner: z.string().min(1),
  objective: OkrObjectiveSchema,
  keyResults: z.array(KeyResultSchema).min(1).max(7),
  objectiveAlignment: z.object({
    platformId: z.string(),
    affectedBarIds: z.array(z.string()).min(1),
    targetCodeRepos: z.array(z.string()).default([]),
    intentCascade: IntentCascadeSchema.partial().default({}),
  }),
  governance: OkrGovernanceSchema.optional(),
});
export type OkrCreateInput = z.infer<typeof OkrCreateInputSchema>;

// ── Computed views (not stored — derived from the card) ──────────────

/**
 * The phase-progress summary surfaced on the OKR list view (§10.1).
 * Computed from actions[] by OKRService.read(); never stored on disk.
 */
export interface OkrPhaseProgress {
  why: 'not_started' | 'in_progress' | 'complete';
  how: 'not_started' | 'in_progress' | 'complete';
  what: 'not_started' | 'in_progress' | 'complete';
}

/**
 * The Action card sub-state surfaced on the OKR detail view (§10.3 +
 * §10.8). Computed per-phase from the latest action[] entry + PR merge
 * state + tier. Never stored.
 */
export type OkrActionSubstate =
  | 'not-started'
  | 'gated'
  | 'in-progress'
  | 'under-review'
  | 'revision-required'
  | 'blocked'
  | 'human-gate'
  | 'complete'
  | 'failed-timeout'
  | 'failed-skill'
  | 'stalled';

export interface OkrSummary {
  id: string;
  objective: string;
  ownerHandle: string;
  platformId: string;
  primaryBarId: string;
  primaryBarTier: GovernanceTier;
  status: OkrStatus;
  paused: boolean;
  intentThreadUuid: string;
  phaseProgress: OkrPhaseProgress;
  lastActivityAt: string;     // ISO timestamp
  chainRootShort: string;     // first 12 chars of the latest action's hatterChainRoot
  targetCodeRepos: string[];
  /** Filesystem path to this OKR's directory (mesh-relative or absolute, caller's choice). */
  path: string;
}
