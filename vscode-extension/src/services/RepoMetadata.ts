import * as fs from 'fs';
import * as path from 'path';

export interface RepoMetadata {
  language?: string;
  module_system?: string;
  testing?: string;
  package_manager?: string;
  framework?: string;
  database?: string;
  llm?: {
    model_family?: string;
  };
  /** Selected fitness-function tool per category (duplicate, dead-code, …). */
  fitness?: Record<string, string>;
}

const METADATA_PATH = '.github/repo-metadata.yml';

export function readRepoMetadata(workspaceRoot: string): RepoMetadata | null {
  const filePath = path.join(workspaceRoot, METADATA_PATH);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return parseMetadataYaml(raw);
  } catch {
    return null;
  }
}

export function serializeMetadataYaml(meta: RepoMetadata): string {
  const lines: string[] = ['# Project metadata — written by MaintainabilityAI'];

  if (meta.language) { lines.push(`language: ${meta.language}`); }
  if (meta.module_system) { lines.push(`module_system: ${meta.module_system}`); }
  if (meta.testing) { lines.push(`testing: ${meta.testing}`); }
  if (meta.package_manager) { lines.push(`package_manager: ${meta.package_manager}`); }
  if (meta.framework) { lines.push(`framework: ${meta.framework}`); }
  if (meta.database) { lines.push(`database: ${meta.database}`); }
  if (meta.llm?.model_family) {
    lines.push('llm:');
    lines.push(`  model_family: ${meta.llm.model_family}`);
  }
  if (meta.fitness && Object.keys(meta.fitness).length > 0) {
    lines.push('fitness:');
    for (const [category, tool] of Object.entries(meta.fitness)) {
      lines.push(`  ${category}: ${tool}`);
    }
  }

  return lines.join('\n') + '\n';
}

function parseMetadataYaml(raw: string): RepoMetadata {
  const meta: RepoMetadata = {};
  const lines = raw.split('\n');
  let inLlm = false;
  let inFitness = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) { continue; }

    if (trimmed === 'llm:') {
      inLlm = true; inFitness = false;
      meta.llm = {};
      continue;
    }
    if (trimmed === 'fitness:') {
      inFitness = true; inLlm = false;
      meta.fitness = {};
      continue;
    }

    if (inLlm && line.startsWith('  ')) {
      const match = trimmed.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (key === 'model_family') {
          meta.llm = meta.llm || {};
          meta.llm.model_family = value;
        }
      }
      continue;
    }
    if (inFitness && line.startsWith('  ')) {
      const match = trimmed.match(/^([\w-]+):\s*(.+)$/);
      if (match) {
        meta.fitness = meta.fitness || {};
        meta.fitness[match[1]] = match[2];
      }
      continue;
    }

    // Top-level keys
    inLlm = false; inFitness = false;
    const match = trimmed.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      switch (key) {
        case 'language': meta.language = value; break;
        case 'module_system': meta.module_system = value; break;
        case 'testing': meta.testing = value; break;
        case 'package_manager': meta.package_manager = value; break;
        case 'framework': meta.framework = value; break;
        case 'database': meta.database = value; break;
      }
    }
  }

  return meta;
}
