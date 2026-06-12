/**
 * Shared primitive enums + branded types used across every other schema.
 * Importing from here keeps the surface coherent and lets downstream tests
 * assert against canonical literal unions instead of free strings.
 */
import { z } from 'zod';

export const GuardrailMode = z.enum(['strict', 'default', 'lenient']);
export type GuardrailMode = z.infer<typeof GuardrailMode>;

export const GroundingMode = z.enum(['strict', 'default', 'lenient']);
export type GroundingMode = z.infer<typeof GroundingMode>;

// `anthropic` was retired (Cheshire v2) — research routes entirely through
// GitHub Models. `openai` / `azure-openai` remain as declared-but-unwired
// placeholders (callLlm throws "not yet implemented" for them).
export const LlmProvider = z.enum(['openai', 'azure-openai', 'github-models']);
export type LlmProvider = z.infer<typeof LlmProvider>;

/**
 * Providers that route through GitHub Models / Copilot use the workflow's
 * GITHUB_TOKEN with `permissions: models: read` — no separate API key needs
 * to live as a repo secret.
 */
export function providerNeedsApiKey(p: LlmProvider): boolean {
  return p !== 'github-models';
}

/**
 * Research / PRD scope. Portfolio scope was dropped — too abstract for
 * the agents to produce a targeted PRD. A run must be anchored to a
 * concrete architectural surface: a platform (multiple BARs sharing a
 * CALM model) or a single BAR.
 */
export const ScopeLevel = z.enum(['platform', 'bar']);
export type ScopeLevel = z.infer<typeof ScopeLevel>;

export const ResearchPath = z.enum(['research', 'archaeology']);
export type ResearchPath = z.infer<typeof ResearchPath>;

export const PrdMode = z.enum(['shallow', 'deep']);
export type PrdMode = z.infer<typeof PrdMode>;

export const SearchProvider = z.enum(['tavily', 'arxiv', 'uspto', 'hackernews']);
export type SearchProvider = z.infer<typeof SearchProvider>;

/** Run id format: `RES-YYYY-MM-DD-<8 hex>` (research) or `PRD-...` (prd). */
export const RunId = z.string().regex(/^(RES|PRD)-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/);
export type RunId = z.infer<typeof RunId>;

/** SHA-256 hex digest (64 chars). */
export const Sha256 = z.string().regex(/^[0-9a-f]{64}$/);
export type Sha256 = z.infer<typeof Sha256>;

/** Git commit SHA (7-40 hex chars). */
export const GitSha = z.string().regex(/^[0-9a-f]{7,40}$/);
export type GitSha = z.infer<typeof GitSha>;

/** ISO-8601 timestamp. We accept anything Date.parse can handle. */
export const IsoTimestamp = z.string().refine(
  v => !Number.isNaN(Date.parse(v)),
  { message: 'Must be an ISO-8601 timestamp parseable by Date.parse' },
);
export type IsoTimestamp = z.infer<typeof IsoTimestamp>;

/** Confidence rating attached to research conclusions. */
export const Confidence = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type Confidence = z.infer<typeof Confidence>;
