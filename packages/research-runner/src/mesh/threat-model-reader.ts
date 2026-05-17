/**
 * threat-model-reader — parse `<bar>/security/threat-model.yaml` into structured
 * STRIDE entries the LLM nodes can ground against.
 *
 * Uses js-yaml directly (the file is valid YAML — we don't need the
 * line-by-line parser that the vscode-extension uses for its writer-specific
 * format). We DO normalise the field names to camelCase to match the shape
 * the LLM prompts expect.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

export type StrideCategory =
  | 'spoofing' | 'tampering' | 'repudiation'
  | 'information-disclosure' | 'denial-of-service' | 'elevation-of-privilege';

export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low';
export type LikelihoodLevel = 'high' | 'medium' | 'low';
export type ControlEffectiveness = 'full' | 'partial' | 'none';
export type ResidualRisk = 'critical' | 'high' | 'medium' | 'low' | 'negligible';

export interface ThreatEntry {
  id: string;
  category: StrideCategory;
  target: string;
  targetName: string;
  dataClassification: string;
  description: string;
  attackVector: string;
  impact: ImpactLevel;
  likelihood: LikelihoodLevel;
  existingControls: string[];
  controlEffectiveness: ControlEffectiveness;
  residualRisk: ResidualRisk;
  recommendedMitigations: string[];
  nistReferences: string[];
}

export interface ThreatModelSummary {
  byCategory: Record<string, number>;
  byRisk: Record<string, number>;
  unmitigatedCount: number;
}

export interface ParsedThreatModel {
  threats: ThreatEntry[];
  summary: ThreatModelSummary;
}

/** Snake-case YAML keys → camelCase TS fields. Missing fields get safe defaults. */
function normalizeThreat(raw: unknown, fallbackIndex: number): ThreatEntry | null {
  if (!raw || typeof raw !== 'object') { return null; }
  const r = raw as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : `THR-${String(fallbackIndex + 1).padStart(3, '0')}`,
    category: (r.category as StrideCategory) || 'spoofing',
    target: typeof r.target === 'string' ? r.target : '',
    targetName: typeof r.target_name === 'string' ? r.target_name : '',
    dataClassification: typeof r.data_classification === 'string' ? r.data_classification : '',
    description: typeof r.description === 'string' ? r.description : '',
    attackVector: typeof r.attack_vector === 'string' ? r.attack_vector : '',
    impact: (r.impact as ImpactLevel) || 'medium',
    likelihood: (r.likelihood as LikelihoodLevel) || 'medium',
    existingControls: Array.isArray(r.existing_controls) ? r.existing_controls.filter(s => typeof s === 'string') as string[] : [],
    controlEffectiveness: (r.control_effectiveness as ControlEffectiveness) || 'none',
    residualRisk: (r.residual_risk as ResidualRisk) || 'medium',
    recommendedMitigations: Array.isArray(r.recommended_mitigations) ? r.recommended_mitigations.filter(s => typeof s === 'string') as string[] : [],
    nistReferences: Array.isArray(r.nist_references) ? r.nist_references.filter(s => typeof s === 'string') as string[] : [],
  };
}

export function parseThreatModelYaml(content: string): ThreatEntry[] {
  let doc: unknown;
  try { doc = yaml.load(content); } catch { return []; }
  if (!doc || typeof doc !== 'object') { return []; }
  const threatsRaw = (doc as { threats?: unknown }).threats;
  if (!Array.isArray(threatsRaw)) { return []; }
  return threatsRaw
    .map((t, i) => normalizeThreat(t, i))
    .filter((t): t is ThreatEntry => t !== null);
}

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

export function readThreatModelFromBar(barPath: string): ParsedThreatModel | null {
  const yamlPath = path.join(barPath, 'security', 'threat-model.yaml');
  if (!fs.existsSync(yamlPath)) { return null; }
  let content: string;
  try { content = fs.readFileSync(yamlPath, 'utf8'); } catch { return null; }
  const threats = parseThreatModelYaml(content);
  if (threats.length === 0) { return null; }
  return { threats, summary: summarizeThreatModel(threats) };
}
