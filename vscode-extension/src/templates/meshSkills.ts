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
  // B24: self-critique in prd-agent.agent.md replaces separate
  // architect-reviewer + security-reviewer agents at PRD time. The
  // two reviewer .agent.md templates stay on disk under
  // code-templates/agents-v4/ in case Phase 3 (WHAT phase, code-
  // grounded review) wants to bring them back — but they're not
  // deployed to mesh repos right now.
  agentSpec('market-research-agent'),
  agentSpec('prd-agent'),
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
  // B5 — context (mesh aggregators; no LLM inside)
  skillSpec('context-architecture', 'context'),
  skillSpec('context-security', 'context'),
  skillSpec('context-quality', 'context'),
  // B29 — self-review provenance (pure-data; reads OKR action tier +
  // prompt pack, auto-emits skill_call so the chain proves the agent
  // entered each persona-switch round).
  skillSpec('self-review-architect', 'context'),
  skillSpec('self-review-security', 'context'),
  // B6 — audit
  skillSpec('audit-emit-event', 'audit'),
  // B7 — formatter
  skillSpec('format-research-issue-update', 'format'),
];

