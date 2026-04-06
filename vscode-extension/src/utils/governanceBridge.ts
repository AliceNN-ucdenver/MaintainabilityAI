/**
 * Governance Bridge — reads `.redqueen/decision.json` from code repos.
 *
 * Enables code-repo panels (Scorecard, Rabbit Hole) to display governance
 * context without a live connection to the governance mesh. The decision.json
 * is written by `scaffoldAgentConfig()` when RedQueenService is available.
 */

import * as fs from 'fs';
import * as path from 'path';

/** Lightweight governance data for webview display. */
export interface GovernanceBridgeData {
  barId: string;
  barName: string;
  platformId: string;
  compositeScore: number;
  criticality: string;
  tier: 'autonomous' | 'supervised' | 'restricted';
  effectiveTier: 'autonomous' | 'supervised' | 'restricted';
  pillarScores: {
    architecture: number;
    security: number;
    infoRisk: number;
    operations: number;
  };
  promptInjections?: {
    pillar: string;
    score: number;
    threshold: number;
    packs: string[];
    constraints: string[];
  }[];
  platformOverrides?: string[];
  reasoning?: string[];
  review?: { agents: number; human_approval: boolean };
  permissions?: { mode: string; allow: string[]; deny: string[] };
  linkedBars?: { barName: string; relationship: string }[];
}

/**
 * Normalize a repo URL for comparison — strip protocol, trailing .git, trailing slash.
 */
function normalizeRepoUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^git@github\.com:/, 'github.com/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

/**
 * Find which BAR in the mesh owns a given repo URL.
 * Scans all BAR `app.yaml` files and checks the `repos` array.
 * Returns `{ barName, barPath }` or null if no match.
 */
export function findBarForRepoUrl(
  meshPath: string,
  repoUrl: string,
): { barName: string; barPath: string } | null {
  try {
    const normalizedTarget = normalizeRepoUrl(repoUrl);
    // Walk portfolio → platforms → bars looking for app.yaml with matching repo
    const portfolioYaml = path.join(meshPath, 'mesh.yaml');
    if (!fs.existsSync(portfolioYaml)) { return null; }

    // Scan all directories recursively for app.yaml files
    const barDirs: string[] = [];
    const scanDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) { continue; }
          if (entry.name.startsWith('.')) { continue; }
          const child = path.join(dir, entry.name);
          if (fs.existsSync(path.join(child, 'app.yaml'))) {
            barDirs.push(child);
          }
          scanDir(child);
        }
      } catch { /* permission or read error — skip */ }
    };
    scanDir(meshPath);

    for (const barDir of barDirs) {
      try {
        const appYaml = fs.readFileSync(path.join(barDir, 'app.yaml'), 'utf8');
        // Simple YAML parsing for repos array — look for repos: lines
        const reposMatch = appYaml.match(/^\s*repos:\s*$/m);
        if (!reposMatch) { continue; }
        // Extract repo URLs from indented list items after repos:
        const lines = appYaml.split('\n');
        const reposIdx = lines.findIndex(l => /^\s*repos:\s*$/.test(l));
        if (reposIdx < 0) { continue; }
        for (let i = reposIdx + 1; i < lines.length; i++) {
          const itemMatch = lines[i].match(/^\s+-\s+"?([^"]+)"?\s*$/);
          if (!itemMatch) { break; } // end of list
          const repoInYaml = normalizeRepoUrl(itemMatch[1]);
          if (repoInYaml === normalizedTarget) {
            // Found! Extract barName from app.yaml
            const nameMatch = appYaml.match(/^\s*name:\s*"?([^"\n]+)"?\s*$/m);
            const barName = nameMatch ? nameMatch[1].trim() : path.basename(barDir);
            return { barName, barPath: barDir };
          }
        }
      } catch { /* skip unreadable */ }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read the full OrchestrationDecision from `.redqueen/decision.json`.
 * Returns null if the file doesn't exist or can't be parsed.
 */
export function readGovernanceDecision(workspacePath: string): GovernanceBridgeData | null {
  try {
    const filePath = path.join(workspacePath, '.redqueen', 'decision.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    if (!parsed || !parsed.barId || !parsed.tier) { return null; }

    // Map OrchestrationDecision fields to GovernanceBridgeData
    return {
      barId: parsed.barId,
      barName: parsed.barName,
      platformId: parsed.platformId || '',
      compositeScore: parsed.compositeScore ?? 0,
      criticality: parsed.criticality || 'medium',
      tier: parsed.tier,
      effectiveTier: parsed.effectiveTier || parsed.tier,
      pillarScores: parsed.pillarScores || {
        architecture: 0, security: 0, infoRisk: 0, operations: 0,
      },
      promptInjections: parsed.promptInjections,
      platformOverrides: parsed.platformOverrides,
      reasoning: parsed.reasoning,
      review: parsed.review,
      permissions: parsed.permissions,
      linkedBars: parsed.linkedBars,
    };
  } catch {
    return null;
  }
}
