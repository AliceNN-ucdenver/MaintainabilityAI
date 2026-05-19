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
import { MESH_SKILLS, type MeshSkillSpec } from '../templates/meshSkills';

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
}
