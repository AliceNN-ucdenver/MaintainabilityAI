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
  // B6 — audit
  skillSpec('audit-emit-event', 'audit'),
  // B7 — formatter
  skillSpec('format-research-issue-update', 'format'),
];

