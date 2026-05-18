/**
 * PrdManifest — the machine-readable spec the spec-ready-handler reads on
 * the code-repo side to generate an RCTRO implementation issue.
 *
 * Lives alongside the PRD markdown as `<topic>.manifest.json`.
 */
import { z } from 'zod';
import { GitSha, RunId } from './primitives';

const Endpoint = z.object({
  /** HTTP method + path, e.g. "POST /favorites". */
  signature: z.string(),
  /** CALM node id this endpoint resides in. */
  calm_node: z.string(),
  /** FR-NN id from the PRD body that specifies this endpoint. */
  fr_id: z.string().regex(/^FR-\d+$/),
});

const SecurityRequirement = z.object({
  /** SR-NN id from the PRD body. */
  id: z.string().regex(/^SR-\d+$/),
  /** Citations: THR-NNN, A0X, NIST-XX-NN — at least one required. */
  citations: z.array(
    z.string().regex(/^(THR-\d+|A\d{2}|NIST-[A-Z]{2}-\d+)$/),
  ).min(1),
});

/**
 * Per-BAR impact classification. The PRD manifest carries the same set of
 * BARs the platform spans (when scope is platform) or just the single BAR
 * (when scope is bar), each tagged with the confidence that PRD work
 * actually touches it. `notify-code-repos.yml` reads this to decide which
 * code repos get a landing-issue (HIGH only) and which get a footer
 * mention as "other BARs in the platform — review needed?" (LOW).
 *
 * HIGH: the BAR owns at least one CALM node referenced by an endpoint, or
 *       owns at least one threat cited by a security requirement.
 * LOW : the BAR is part of the platform but has no direct citation in
 *       the manifest. Could still be impacted (shared infra, dependency
 *       chains) but no concrete signal from the PRD.
 */
const ImpactedBar = z.object({
  bar_id: z.string(),
  repos: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)),
  confidence: z.enum(['high', 'low']),
  reasoning: z.string(),
});
export type ImpactedBar = z.infer<typeof ImpactedBar>;

export const PrdManifest = z.object({
  run_id: RunId,
  prd_topic: z.string(),

  /** Mesh repo SHA at PRD publish time. */
  mesh_sha: GitSha,

  /**
   * Code repos `notify-code-repos.yml` opens a landing-issue in. Equals
   * the union of `impacted_bars[].repos` for HIGH-confidence entries.
   * LOW-confidence BARs are NOT included here — they only surface as
   * footer mentions in the HIGH BARs' landing-issues.
   */
  target_repos: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)).min(1),

  /**
   * Per-BAR impact classification. Drives which repos in `target_repos`
   * get an issue and what "Why this repo?" reasoning the issue body
   * carries. See ImpactedBar above for the HIGH vs LOW semantics.
   */
  impacted_bars: z.array(ImpactedBar).default([]),

  endpoints: z.array(Endpoint),
  security_requirements: z.array(SecurityRequirement),

  /** Final grounding state from the refinement loop. */
  grounding: z.object({
    final_score: z.number().min(0).max(1),
    threshold: z.number().min(0).max(1),
    iterations: z.number().int().min(1).max(5),
    passed: z.boolean(),
  }),
});

export type PrdManifest = z.infer<typeof PrdManifest>;
