/**
 * ObservedArchitecture — what analyze_architecture extracts from a cloned
 * target repo (archaeology path).
 *
 * Phase 3a is file-based: no AST parsing, no tree-sitter. We extract what
 * we can from filenames, manifest files, and regex-detected route handlers.
 * Phase 3b will add tree-sitter for deeper symbol-level analysis.
 *
 * The shape mirrors the spec in docs/design/research-and-prd-agents.md
 * §"What `analyze_architecture` extracts" but pares back depth we can't
 * deliver without an AST.
 */
import { z } from 'zod';

export const ObservedLayer = z.enum(['api', 'web', 'data', 'worker', 'shared', 'unknown']);
export type ObservedLayer = z.infer<typeof ObservedLayer>;

export const Endpoint = z.object({
  /** HTTP method like "GET" / "POST". */
  method: z.string(),
  /** Path template, e.g. "/users/:id". */
  path: z.string(),
  /** File the endpoint lives in (relative to repo root). */
  file: z.string(),
  /** Framework that surfaced it, e.g. "express" / "fastapi" / "flask" / "spring". */
  framework: z.string(),
});
export type Endpoint = z.infer<typeof Endpoint>;

export const Module = z.object({
  /** Top-level directory or src/<name> identifier. */
  name: z.string(),
  /** Inferred layer per the heuristics in analyze_architecture. */
  layer: ObservedLayer,
  /** File counts that landed in this module (excluding test files). */
  fileCount: z.number().int().nonnegative(),
  /** Endpoints declared in this module. */
  endpointCount: z.number().int().nonnegative(),
});
export type Module = z.infer<typeof Module>;

export const RepositoryProfile = z.object({
  /** owner/repo at the time of clone. */
  slug: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  /** Git SHA of the clone HEAD. */
  cloneSha: z.string(),
  /** Total tracked files (skips .git, node_modules, build, dist). */
  totalFiles: z.number().int().nonnegative(),
  /** Bytes counted across tracked files. */
  totalBytes: z.number().int().nonnegative(),
  /** File counts by extension (sorted desc by count in serialised form). */
  byExtension: z.record(z.string(), z.number().int()),
  /** Detected primary language(s) — derived from extension counts + manifests. */
  languages: z.array(z.string()),
  /** Detected primary framework(s) (express, fastapi, react, next, vue, …). */
  frameworks: z.array(z.string()),
  /** Manifest files present (package.json, pyproject.toml, Cargo.toml, …). */
  manifests: z.array(z.string()),
});
export type RepositoryProfile = z.infer<typeof RepositoryProfile>;

export const ObservedArchitecture = z.object({
  profile: RepositoryProfile,
  modules: z.array(Module),
  endpoints: z.array(Endpoint),
  /**
   * Direct external dependencies (production only, not dev). Source: the
   * detected manifests. Up to 60 dependencies, sorted alphabetically; the
   * runner truncates to keep audit payload sane.
   */
  dependencies: z.array(z.string()),
  /**
   * Tier-3 (CALM-relative) deviations the analyzer flagged. Populated by
   * `identify_gaps` after comparison — empty here.
   */
  deviations: z.array(z.string()),
});
export type ObservedArchitecture = z.infer<typeof ObservedArchitecture>;

/** A single gap surfaced by identify_gaps. */
export const ArchaeologyGap = z.object({
  /** Stable id like "G1", "G2", … assigned in the order signals were detected. */
  id: z.string().regex(/^G\d+$/),
  kind: z.enum([
    'missing_module',                  // CALM mentions X; code has no module
    'orphan_module',                   // code has Y; no matching CALM node
    'endpoint_not_in_calm',            // observed endpoint isn't represented as a CALM node
    'missing_security_control',        // CALM mentions a control; nothing in code suggests it
    'framework_choice_undeclared',     // code uses a framework not mentioned in mesh decisions
  ]),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  /** Human-readable summary the synthesis prompt cites. */
  summary: z.string(),
  /** Pointers into observed architecture — `OA[<module>]` / `OA[<endpoint>]`. */
  observedEvidence: z.array(z.string()),
  /** Pointers into mesh CALM — node ids, ADR refs, control ids. */
  meshReferences: z.array(z.string()),
});
export type ArchaeologyGap = z.infer<typeof ArchaeologyGap>;
