// ============================================================================
// Shared utilities for pillar detail renderers
// ============================================================================

export interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

export interface ThreatEntry {
  id: string;
  category: string;
  target: string;
  targetName: string;
  dataClassification: string;
  description: string;
  attackVector: string;
  impact: string;
  likelihood: string;
  existingControls: string[];
  controlEffectiveness: string;
  residualRisk: string;
  recommendedMitigations: string[];
  nistReferences: string[];
}

export interface ThreatModelResult {
  threats: ThreatEntry[];
  summary: {
    totalThreats: number;
    byCategory: Record<string, number>;
    byRisk: Record<string, number>;
    unmitigatedCount: number;
  };
  mermaidDiagram: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
