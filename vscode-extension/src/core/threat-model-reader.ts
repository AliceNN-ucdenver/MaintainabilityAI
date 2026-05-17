/**
 * threat-model-reader — VS Code-free parser for `security/threat-model.yaml`.
 *
 * Extracted from ThreatModelService so MeshReader (which serves both the
 * extension and the MCP server) can surface parsed STRIDE entries to the
 * research/PRD agents without dragging in a `vscode` dependency.
 *
 * The YAML format is the one written by ThreatModelService.writeThreatModelYaml().
 */
import * as fs from 'fs';
import * as path from 'path';
import type { ThreatEntry } from '../types';

export interface ThreatModelSummary {
  byCategory: Record<string, number>;
  byRisk: Record<string, number>;
  unmitigatedCount: number;
}

export interface ParsedThreatModel {
  threats: ThreatEntry[];
  summary: ThreatModelSummary;
}

/**
 * Parse the `security/threat-model.yaml` written by writeThreatModelYaml().
 * Returns an empty array if the content is malformed or has no threats.
 */
export function parseThreatModelYaml(content: string): ThreatEntry[] {
  const threats: ThreatEntry[] = [];
  const lines = content.split('\n');

  let current: Partial<ThreatEntry> | null = null;
  let collectingArray: 'mitigations' | 'none' = 'none';

  for (const line of lines) {
    if (/^\s+-\s+id:\s+(.+)/.test(line)) {
      if (current?.id) { threats.push(finalizeThreat(current)); }
      current = { id: line.match(/id:\s+(.+)/)?.[1]?.trim() || '' };
      collectingArray = 'none';
      continue;
    }

    if (!current) { continue; }

    // Block-list keys are written keyless (e.g. `    recommended_mitigations:`)
    // and the items follow on the next lines at 6-space indent. Match these
    // before the kv match (which requires a value after the colon).
    const blockKey = line.match(/^\s{4}(\w[\w_]*):\s*$/);
    if (blockKey) {
      const key = blockKey[1];
      if (key === 'recommended_mitigations') {
        collectingArray = 'mitigations';
        current.recommendedMitigations = [];
      } else {
        collectingArray = 'none';
      }
      continue;
    }

    const kv = line.match(/^\s{4}(\w[\w_]*):\s+(.+)/);
    if (kv) {
      const [, key, rawVal] = kv;
      const val = rawVal.replace(/^["']|["']$/g, '').trim();

      switch (key) {
        case 'category': current.category = val as ThreatEntry['category']; break;
        case 'target': current.target = val; break;
        case 'target_name': current.targetName = val; break;
        case 'data_classification': current.dataClassification = val; break;
        case 'description': current.description = val; break;
        case 'attack_vector': current.attackVector = val; break;
        case 'impact': current.impact = val as ThreatEntry['impact']; break;
        case 'likelihood': current.likelihood = val as ThreatEntry['likelihood']; break;
        case 'control_effectiveness': current.controlEffectiveness = val as ThreatEntry['controlEffectiveness']; break;
        case 'residual_risk': current.residualRisk = val as ThreatEntry['residualRisk']; break;
        case 'existing_controls': current.existingControls = parseInlineArray(rawVal); break;
        case 'nist_references': current.nistReferences = parseInlineArray(rawVal); break;
        // `recommended_mitigations:` is keyless — handled by the blockKey match above.
      }
      continue;
    }

    if (collectingArray === 'mitigations') {
      const item = line.match(/^\s{6}-\s+(.+)/);
      if (item) {
        current.recommendedMitigations = current.recommendedMitigations || [];
        current.recommendedMitigations.push(item[1].replace(/^["']|["']$/g, '').trim());
      } else if (line.trim() && !/^\s*#/.test(line) && !/^\s{6}/.test(line)) {
        collectingArray = 'none';
      }
    }
  }

  if (current?.id) { threats.push(finalizeThreat(current)); }
  return threats;
}

function parseInlineArray(raw: string): string[] {
  const match = raw.match(/\[([^\]]*)\]/);
  if (!match) { return []; }
  return match[1].split(',').map(s => s.replace(/^[\s"']+|[\s"']+$/g, '')).filter(Boolean);
}

function finalizeThreat(partial: Partial<ThreatEntry>): ThreatEntry {
  return {
    id: partial.id || 'THR-???',
    category: partial.category || 'spoofing',
    target: partial.target || '',
    targetName: partial.targetName || '',
    dataClassification: partial.dataClassification || '',
    description: partial.description || '',
    attackVector: partial.attackVector || '',
    impact: partial.impact || 'medium',
    likelihood: partial.likelihood || 'medium',
    existingControls: partial.existingControls || [],
    controlEffectiveness: partial.controlEffectiveness || 'none',
    residualRisk: partial.residualRisk || 'medium',
    recommendedMitigations: partial.recommendedMitigations || [],
    nistReferences: partial.nistReferences || [],
  };
}

/** Build the counts-by-category / counts-by-risk summary used in UI badges. */
export function summarizeThreatModel(threats: ThreatEntry[]): ThreatModelSummary {
  const byCategory: Record<string, number> = {};
  const byRisk: Record<string, number> = {};
  let unmitigatedCount = 0;
  for (const t of threats) {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    byRisk[t.residualRisk] = (byRisk[t.residualRisk] || 0) + 1;
    if (t.controlEffectiveness === 'none') { unmitigatedCount++; }
  }
  return { byCategory, byRisk, unmitigatedCount };
}

/**
 * Read + parse `<barPath>/security/threat-model.yaml`.
 * Returns null when the file is absent OR contains no parseable threats.
 */
export function readThreatModelFromBar(barPath: string): ParsedThreatModel | null {
  const yamlPath = path.join(barPath, 'security', 'threat-model.yaml');
  if (!fs.existsSync(yamlPath)) { return null; }

  let content: string;
  try {
    content = fs.readFileSync(yamlPath, 'utf-8');
  } catch {
    return null;
  }

  const threats = parseThreatModelYaml(content);
  if (threats.length === 0) { return null; }

  return { threats, summary: summarizeThreatModel(threats) };
}
