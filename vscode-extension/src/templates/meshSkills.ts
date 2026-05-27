/**
 * Canonical registry of every PURE-data Skill Looking Glass deploys into the
 * mesh repo's `.github/skills/<name>/SKILL.md` directory. Used by
 * `AgentDeploymentService.deploySkills` for the write path and by the
 * Settings → Mesh Provisioning surface (Phase B-PR2) for the
 * deployed-vs-not check.
 *
 * Each entry is a path-and-loader pair (same shape as `MESH_WORKFLOWS` in
 * `codeRepoTemplates.ts`). Loader reads from the extension's
 * `code-templates/skills/<name>/SKILL.md` so packaged extensions ship the
 * Skill bodies with no runtime template generation.
 *
 * Adding a new Skill: drop a `SKILL.md` under `code-templates/skills/<name>/`
 * and register it here. Order is deterministic — drives the Settings panel's
 * presentation and the deploy-all idempotency check.
 *
 * See vscode-extension/design/agentic-sdlc.md §7 for the design intent and
 * §13 B2-B7 for the phase tracking.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface MeshSkillSpec {
  /** Skill name — matches the `name:` frontmatter and the directory under .github/skills/. */
  name: string;
  /** Phase B-PR2 group on the Mesh Provisioning surface. */
  family: 'search' | 'rank' | 'knowledge' | 'context' | 'audit' | 'format';
  /** Path inside the mesh repo, e.g. `.github/skills/tavily-search/SKILL.md`. */
  relativePath: string;
  /** Returns the SKILL.md body for this Skill. */
  generate: (extensionPath: string) => string;
}

function readSkillTemplate(extensionPath: string, name: string): string {
  const filePath = path.join(extensionPath, 'code-templates', 'skills', name, 'SKILL.md');
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function skillSpec(name: string, family: MeshSkillSpec['family']): MeshSkillSpec {
  return {
    name,
    family,
    relativePath: `.github/skills/${name}/SKILL.md`,
    generate: (extensionPath) => readSkillTemplate(extensionPath, name),
  };
}

/**
 * Phase B-PR2 agent spec — `.agent.md` files Looking Glass deploys into the
 * mesh's `.github/agents/` directory. Each agent declares the Skills it
 * uses in its `tools:` frontmatter; `AgentDeploymentService.deployAgents`
 * refuses to deploy an agent whose tools reference a Skill not present
 * in MESH_SKILLS.
 *
 * See §5.5 in `vscode-extension/design/agentic-sdlc.md` for the agent
 * runtime contract (system-prompt template, Skill ordering, timeout/retry
 * policy, completion sequence).
 */
export interface MeshAgentSpec {
  /** Agent name — matches the `name:` frontmatter and the file under .github/agents/. */
  name: string;
  /** Path inside the mesh repo, e.g. `.github/agents/prd-agent.agent.md`. */
  relativePath: string;
  /** Returns the .agent.md body for this agent. */
  generate: (extensionPath: string) => string;
}

function readAgentTemplate(extensionPath: string, name: string): string {
  const filePath = path.join(extensionPath, 'code-templates', 'agents-v4', `${name}.agent.md`);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function agentSpec(name: string): MeshAgentSpec {
  return {
    name,
    relativePath: `.github/agents/${name}.agent.md`,
    generate: (extensionPath) => readAgentTemplate(extensionPath, name),
  };
}

export const MESH_AGENTS: MeshAgentSpec[] = [
  // B24 + Bug V (2026-05-23): persona-switch self-critique inside the
  // author agent replaces the separate-reviewer model at every phase.
  // The architect-reviewer + security-reviewer .agent.md templates
  // were DELETED in Bug V; this list is the authoritative set of
  // mesh-deployable agents.
  agentSpec('market-research-agent'),
  agentSpec('prd-agent'),
  // D-PR1 — code-design-agent (Phase D / WHAT). Third and last Looking-
  // Glass-side agent. Persona-switch self-critique (B24 pattern carried
  // forward) via self-review-code-architect / self-review-code-security
  // Skills above. Per-repo grounding via knowledge-code Skill (3-mode
  // brownfield / greenfield / refuse per A12.v1.1 targetCodeRepoStatus).
  agentSpec('code-design-agent'),
];

/**
 * Ordered registry — search → rank → knowledge → context → audit → format.
 * Matches the §13 B-section grouping (B2 search, B3 rank, B4 knowledge,
 * B5 context, B6 audit, B7 format) so deployment progress maps 1:1 onto
 * the design doc's checklist.
 */
export const MESH_SKILLS: MeshSkillSpec[] = [
  // B2 — search Skills
  skillSpec('tavily-search', 'search'),
  skillSpec('arxiv-search', 'search'),
  skillSpec('uspto-search', 'search'),
  skillSpec('hackernews-search', 'search'),
  // B3 — rank
  skillSpec('dedupe-and-rank', 'rank'),
  // B4 — knowledge (read-from-mesh)
  skillSpec('knowledge-okr', 'knowledge'),
  skillSpec('knowledge-mesh-bar', 'knowledge'),
  skillSpec('knowledge-mesh-platform', 'knowledge'),
  skillSpec('knowledge-mesh-threats', 'knowledge'),
  skillSpec('knowledge-mesh-adrs', 'knowledge'),
  skillSpec('knowledge-research', 'knowledge'),
  skillSpec('knowledge-prd', 'knowledge'),
  skillSpec('knowledge-code', 'knowledge'),
  // Bug-Q phase 2 — knowledge-code-read pairs with knowledge-code:
  // knowledge-code clones + classifies (returns inventory); knowledge-
  // code-read returns bounded file content from the cached clone so
  // the agent can ground design with real code excerpts. Reading paths
  // are cross-checked by the workflow path-citation gate against the
  // chain's inventory_paths payload.
  skillSpec('knowledge-code-read', 'knowledge'),
  // D-PR3 — knowledge-reference-repos: optional exemplar grounding for
  // the code-design-agent. Reads `.caterpillar/reference-repos/*.yml`
  // configs in the mesh, clones each, runs the same tree-sitter
  // polyglot classification as knowledge-code, returns with
  // `reference: true` so the agent treats them as read-only EXEMPLARS
  // (never edit targets). Primary motivation: greenfield runs have no
  // in-repo grounding without an exemplar Skill. Brownfield runs may
  // also benefit when the team has a canonical reference pattern.
  // The workflow's path-citation gate rejects any design that cites a
  // reference-repo path as an edit target with `cited-reference-repo-
  // as-edit-target:<path>`.
  skillSpec('knowledge-reference-repos', 'knowledge'),
  // B5 — context (mesh aggregators; no LLM inside)
  skillSpec('context-architecture', 'context'),
  skillSpec('context-security', 'context'),
  skillSpec('context-quality', 'context'),
  // B29 — self-review provenance (pure-data; reads OKR action tier +
  // prompt pack, auto-emits skill_call so the chain proves the agent
  // entered each persona-switch round).
  skillSpec('self-review-architect', 'context'),
  skillSpec('self-review-security', 'context'),
  // D-PR1 — code-phase persona-switch packs. Same B29 contract, reads
  // .caterpillar/prompts/code-design/* packs instead of prd/* packs.
  // The code-design-agent (Phase D / WHAT) uses these for its self-
  // critique loop the same way prd-agent uses the PRD-phase pair.
  skillSpec('self-review-code-architect', 'context'),
  skillSpec('self-review-code-security', 'context'),
  // B6 — audit
  skillSpec('audit-emit-event', 'audit'),
  // B7 — formatter
  skillSpec('format-research-issue-update', 'format'),
];

