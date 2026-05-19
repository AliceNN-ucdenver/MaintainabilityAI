/**
 * AgentDeploymentService — writes the agentic-SDLC infrastructure (Skills,
 * Agents, retained workflows) into a mesh repo's `.github/` directory.
 *
 * Phase B-PR1 ships `deploySkills`. Subsequent sub-PRs add:
 *   - B-PR2: `deployAgents` (4 `.agent.md` files; refuses to deploy any
 *     agent whose declared `tools:` references a Skill not on disk).
 *   - B-PR2: `Settings → Mesh Provisioning` surface that calls into
 *     `deploySkills` / `deployAgents` and reports presence-by-name.
 *
 * Deployment model: idempotent overwrite. Skills + agents are versioned
 * extension-bundled templates, not user-editable artifacts. Re-running
 * deploy refreshes everything to the bundled-version state — equivalent
 * to a `git checkout -- .github/skills/`.
 *
 * Spec: vscode-extension/design/agentic-sdlc.md §7 (Skills), §5 (Agents),
 * §13 B1–B9.
 */
import * as fs from 'fs';
import * as path from 'path';
import { MESH_AGENTS, MESH_SKILLS, type MeshSkillSpec } from '../templates/meshSkills';

export interface DeploySkillsResult {
  /** Total skills attempted. */
  total: number;
  /** Skills whose body was successfully written this run. */
  written: number;
  /** Skills whose body matched the bundled template (no write needed). */
  unchanged: number;
  /** Per-skill outcomes — useful for the Settings panel summary. */
  perSkill: { name: string; family: MeshSkillSpec['family']; status: 'written' | 'unchanged' | 'empty-template' }[];
}

export interface DeployAgentsResult {
  total: number;
  written: number;
  unchanged: number;
  perAgent: { name: string; status: 'written' | 'unchanged' | 'empty-template' | 'skill-missing'; missingSkills?: string[] }[];
}

export class AgentDeploymentService {
  /**
   * @param extensionPath  Absolute path to the extension install dir. Used to
   *                       resolve bundled templates under `code-templates/`.
   */
  constructor(private readonly extensionPath: string) {}

  /**
   * Write every Skill in `MESH_SKILLS` to `<meshPath>/.github/skills/<name>/SKILL.md`.
   * Idempotent: only writes when the on-disk content differs from the bundled
   * template, so re-deploys are cheap and don't churn the mesh repo's git log.
   *
   * Returns a summary the Settings panel renders. Throws only on
   * filesystem-level failures (mkdir / write); a Skill whose bundled template
   * is missing is reported via `status: 'empty-template'` (non-fatal — surface
   * as a warning).
   */
  deploySkills(meshPath: string): DeploySkillsResult {
    const result: DeploySkillsResult = {
      total: MESH_SKILLS.length,
      written: 0,
      unchanged: 0,
      perSkill: [],
    };

    for (const skill of MESH_SKILLS) {
      const body = skill.generate(this.extensionPath);
      if (!body) {
        result.perSkill.push({ name: skill.name, family: skill.family, status: 'empty-template' });
        continue;
      }
      const destPath = path.join(meshPath, skill.relativePath);
      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });

      const existing = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf8') : null;
      if (existing === body) {
        result.unchanged += 1;
        result.perSkill.push({ name: skill.name, family: skill.family, status: 'unchanged' });
        continue;
      }
      fs.writeFileSync(destPath, body, 'utf8');
      result.written += 1;
      result.perSkill.push({ name: skill.name, family: skill.family, status: 'written' });
    }

    return result;
  }

  /**
   * Report which Skills are currently on disk in the mesh, grouped by family.
   * Drives the Settings panel's "Deployed: N/18" badge in Phase B-PR2.
   */
  listDeployedSkills(meshPath: string): { name: string; family: MeshSkillSpec['family']; deployed: boolean }[] {
    return MESH_SKILLS.map(skill => ({
      name: skill.name,
      family: skill.family,
      deployed: fs.existsSync(path.join(meshPath, skill.relativePath)),
    }));
  }

  /**
   * Deploy the four Phase B agents to `<meshPath>/.github/agents/<name>.agent.md`.
   * Refuses to deploy an agent whose `tools:` references a Skill not in
   * MESH_SKILLS — that would create a runtime "skill not found" failure on
   * first invocation. Refusal is per-agent: an agent with missing-skill
   * dependencies returns `status: 'skill-missing'` with the offending names;
   * other agents still deploy.
   *
   * Idempotent: only writes when on-disk content differs from the bundled
   * template, so re-deploys leave the mesh repo's git log clean.
   */
  deployAgents(meshPath: string): DeployAgentsResult {
    const knownSkillNames = new Set(MESH_SKILLS.map(s => s.name));
    const result: DeployAgentsResult = {
      total: MESH_AGENTS.length,
      written: 0,
      unchanged: 0,
      perAgent: [],
    };

    for (const agent of MESH_AGENTS) {
      const body = agent.generate(this.extensionPath);
      if (!body) {
        result.perAgent.push({ name: agent.name, status: 'empty-template' });
        continue;
      }

      // Parse the agent's tools: array out of the frontmatter and verify every
      // referenced Skill is on the bundled registry. Hard rule from §5.5.1.
      const declaredTools = parseToolsFromAgentBody(body);
      const missingSkills = declaredTools.filter(t => !knownSkillNames.has(t));
      if (missingSkills.length > 0) {
        result.perAgent.push({ name: agent.name, status: 'skill-missing', missingSkills });
        continue;
      }

      const destPath = path.join(meshPath, agent.relativePath);
      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });
      const existing = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf8') : null;
      if (existing === body) {
        result.unchanged += 1;
        result.perAgent.push({ name: agent.name, status: 'unchanged' });
        continue;
      }
      fs.writeFileSync(destPath, body, 'utf8');
      result.written += 1;
      result.perAgent.push({ name: agent.name, status: 'written' });
    }

    return result;
  }

  /**
   * Report which agents are currently on disk in the mesh. Drives the
   * Settings panel's "Agents deployed: N/4" badge.
   */
  listDeployedAgents(meshPath: string): { name: string; deployed: boolean }[] {
    return MESH_AGENTS.map(agent => ({
      name: agent.name,
      deployed: fs.existsSync(path.join(meshPath, agent.relativePath)),
    }));
  }
}

/**
 * Extract the YAML `tools:` array from an `.agent.md` body without pulling in
 * a yaml dependency. We only need this for deploy-time validation — the
 * frontmatter shape is well-known, so a tiny regex over the leading `---`
 * block is enough.
 */
function parseToolsFromAgentBody(body: string): string[] {
  const frontmatterMatch = body.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) { return []; }
  const fm = frontmatterMatch[1];
  const toolsBlock = fm.match(/^tools:\n((?:\s+-\s+\S.*\n?)+)/m);
  if (!toolsBlock) { return []; }
  return toolsBlock[1]
    .split('\n')
    .map(line => line.match(/^\s+-\s+(\S.*?)\s*$/)?.[1])
    .filter((s): s is string => !!s);
}
