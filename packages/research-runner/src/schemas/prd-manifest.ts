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

export const PrdManifest = z.object({
  run_id: RunId,
  prd_topic: z.string(),

  /** Mesh repo SHA at PRD publish time. */
  mesh_sha: GitSha,

  /** Code repos the spec dispatches to (mesh notify-code-repos.yml uses this). */
  target_repos: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)).min(1),

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
