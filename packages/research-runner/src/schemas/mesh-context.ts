/**
 * MeshContext — what `gather_mesh_context` produces for every LLM node.
 *
 * Mirrors the shape defined in the design doc (§"gather_mesh_context — the
 * mesh IS the expert"). Every LLM call in both the Archeologist and PRD
 * pipelines receives this as its grounding payload.
 */
import { z } from 'zod';
import { GitSha, ScopeLevel } from './primitives';

/** A small projection of a research doc that lives in scope. */
const RelatedResearchSummary = z.object({
  research_id: z.string(),
  topic: z.string(),
  published_at: z.string(),
});

/** Structural gap kinds the GovernanceScorer detects per BAR. */
export const MeshGapKind = z.enum([
  'no_threat_model',
  'no_controls_mapping',
  'no_adrs',
  'stale_research',
  'missing_prd_for_planned_feature',
  'low_architecture_pillar',
  'low_security_pillar',
]);
export type MeshGapKind = z.infer<typeof MeshGapKind>;

const PillarScores = z.object({
  architecture: z.number(),
  security: z.number(),
  info_risk: z.number(),
  operations: z.number(),
});

const Adr = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  decision: z.string(),
});

export const MeshContext = z.object({
  scope: z.object({
    level: ScopeLevel,
    bar_id: z.string().optional(),       // present when level === 'bar'
    platform_id: z.string().optional(),  // present when level === 'platform' OR 'bar' (parent)
  }),

  /** Git SHA of the mesh repo at the moment context was read. */
  mesh_sha: GitSha,

  /** Always populated. */
  portfolio: z.object({
    name: z.string(),
    governance_policy: z.unknown(),
    capability_models: z.array(z.unknown()),
    related_research_summaries: z.array(RelatedResearchSummary),
  }),

  /** Populated when level is platform OR bar. */
  platform: z.object({
    platform_id: z.string(),
    architecture: z.unknown(),
    sibling_bars: z.array(z.object({
      bar_id: z.string(),
      name: z.string(),
      composite_score: z.number(),
      /** owner/repo entries parsed from each sibling BAR's app.yaml. */
      linked_repos: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)).default([]),
      /** CALM node ids the BAR owns. Used by generate-prd-manifest's
       *  impact classification to decide whether a sibling is HIGH
       *  confidence (one of these nodes is referenced by an endpoint)
       *  or LOW (no citation overlap). */
      calm_node_ids: z.array(z.string()).default([]),
      /** Threat ids declared in the BAR's threat-model.yaml. Used by the
       *  same impact classification to flag siblings whose threats are
       *  cited by the PRD's security requirements. */
      threat_ids: z.array(z.string()).default([]),
    })),
    related_research_summaries: z.array(RelatedResearchSummary),
  }).nullable(),

  /** Populated only when level is bar. */
  bar: z.object({
    bar_id: z.string(),
    name: z.string(),
    composite_score: z.number(),
    tier: z.enum(['restricted', 'supervised', 'autonomous']),
    calm_model: z.unknown(),
    threats: z.unknown().nullable(),
    controls: z.unknown().nullable(),
    adrs: z.array(Adr),
    pillar_scores: PillarScores,
    related_research: z.array(RelatedResearchSummary),
    related_prds: z.array(RelatedResearchSummary),
    mesh_gaps: z.array(MeshGapKind),
    /** owner/repo entries parsed from app.yaml application.repos — drives PrdManifest.target_repos. */
    linked_repos: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)).default([]),
  }).nullable(),
});

export type MeshContext = z.infer<typeof MeshContext>;
