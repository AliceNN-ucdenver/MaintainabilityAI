/**
 * Public schema surface for @maintainabilityai/research-runner.
 *
 * Importers should reference schemas through this barrel so internal file
 * reorganisation doesn't break downstream code.
 *
 * Trimmed 2026-06-13: the archeologist/prd LLM-generation pipeline was
 * retired, so its I/O schemas (ResearchBrief, PrdBrief, QueryPlan, PrdDoc,
 * PrdManifest, ResearchDoc, ObservedArchitecture, MeshContext) and the
 * pipeline `node_kind` AuditEvent union were removed. The live agentic-SDLC
 * audit chain is keyed on `event_kind` and is defined inline in
 * `runner/skills.ts` (it does not use a schema here). What remains is the
 * search-rail surface the skills still use.
 */
export * from './primitives';
export * from './ranked-source';
