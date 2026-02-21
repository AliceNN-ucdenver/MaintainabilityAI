import * as fs from 'fs';
import * as path from 'path';
import type {
  GovernancePillarScore,
  PillarArtifact,
  PillarStatus,
  MeshScoringConfig,
} from '../types';

const DEFAULT_SCORING: MeshScoringConfig = {
  passingThreshold: 75,
  warningThreshold: 50,
};

// ============================================================================
// Artifact definitions per pillar
// ============================================================================

const ARCHITECTURE_ARTIFACTS_MARKDOWN = [
  { label: 'Conceptual View', path: 'architecture/views/conceptual.md' },
  { label: 'Logical View', path: 'architecture/views/logical.md' },
  { label: 'Context View', path: 'architecture/views/context.md' },
  { label: 'Sequence View', path: 'architecture/views/sequence.md' },
  { label: 'ADRs', path: 'architecture/ADRs' },
  { label: 'Fitness Functions', path: 'architecture/fitness-functions.yaml' },
  { label: 'Quality Attributes', path: 'architecture/quality-attributes.yaml' },
];

const ARCHITECTURE_ARTIFACTS_CALM = [
  { label: 'Architecture (CALM)', path: 'architecture/bar.arch.json' },
  { label: 'Capability Decorator (CALM)', path: 'architecture/decorator.json' },
  { label: 'ADRs', path: 'architecture/ADRs' },
  { label: 'Fitness Functions', path: 'architecture/fitness-functions.yaml' },
  { label: 'Quality Attributes', path: 'architecture/quality-attributes.yaml' },
];

function getArchitectureArtifacts(barPath: string): { label: string; path: string }[] {
  const isCalmBar = fs.existsSync(path.join(barPath, 'architecture/bar.arch.json'));
  return isCalmBar ? ARCHITECTURE_ARTIFACTS_CALM : ARCHITECTURE_ARTIFACTS_MARKDOWN;
}

const SECURITY_ARTIFACTS = [
  { label: 'Threat Model', path: 'security/threat-model.yaml' },
  { label: 'Security Controls', path: 'security/security-controls.yaml' },
  { label: 'Vulnerability Tracking', path: 'security/vulnerability-tracking.yaml' },
  { label: 'Compliance Checklist', path: 'security/compliance-checklist.yaml' },
];

const INFO_RISK_ARTIFACTS = [
  { label: 'Risk Assessment', path: 'information-risk/ira.md' },
  { label: 'Data Classification', path: 'information-risk/data-classification.yaml' },
  { label: 'VISM', path: 'information-risk/vism.yaml' },
  { label: 'Privacy Impact', path: 'information-risk/privacy-impact.yaml' },
];

const OPERATIONS_ARTIFACTS = [
  { label: 'Runbook', path: 'operations/runbook.md' },
  { label: 'Service Mapping', path: 'operations/service-mapping.yaml' },
  { label: 'SLA Definitions', path: 'operations/sla-definitions.yaml' },
  { label: 'Incident Response', path: 'operations/incident-response.yaml' },
];

// ============================================================================
// Scoring logic
// ============================================================================

function isNonEmpty(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      // For directories (like ADRs/), check if they contain at least one file
      const entries = fs.readdirSync(filePath).filter(f => !f.startsWith('.'));
      return entries.length > 0;
    }
    return stat.size > 0;
  } catch {
    return false;
  }
}

function isSubstantive(filePath: string): boolean {
  // A file is "substantive" if it exists and has more than just template comments
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      // For directories, at least one file inside must have substantive content
      const entries = fs.readdirSync(filePath).filter(f => !f.startsWith('.'));
      return entries.some(entry => {
        const entryPath = path.join(filePath, entry);
        return isSubstantive(entryPath);
      });
    }
    if (stat.size === 0) { return false; }
    const content = fs.readFileSync(filePath, 'utf8').trim();
    // Strip YAML/Markdown comments and whitespace — if nothing remains, it's just template
    const stripped = content
      .split('\n')
      .filter(line => !line.trimStart().startsWith('#') && line.trim() !== '')
      .join('');
    return stripped.length > 0;
  } catch {
    return false;
  }
}

function scoreArtifacts(
  barPath: string,
  definitions: { label: string; path: string }[]
): PillarArtifact[] {
  return definitions.map(def => {
    const fullPath = path.join(barPath, def.path);
    const present = isNonEmpty(fullPath);
    const nonEmpty = present && isSubstantive(fullPath);
    return {
      label: def.label,
      path: def.path,
      present,
      nonEmpty,
    };
  });
}

function computeStatus(
  score: number,
  config: MeshScoringConfig
): PillarStatus {
  if (score >= config.passingThreshold) { return 'passing'; }
  if (score >= config.warningThreshold) { return 'warning'; }
  return 'failing';
}

export class GovernanceScorer {
  private config: MeshScoringConfig;

  constructor(config?: Partial<MeshScoringConfig>) {
    this.config = { ...DEFAULT_SCORING, ...config };
  }

  scorePillar(
    barPath: string,
    pillar: 'architecture' | 'security' | 'information-risk' | 'operations'
  ): GovernancePillarScore {
    const definitions = this.getDefinitions(pillar, barPath);
    const artifacts = scoreArtifacts(barPath, definitions);
    const total = artifacts.length;
    const present = artifacts.filter(a => a.present).length;
    const score = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      pillar,
      score,
      status: computeStatus(score, this.config),
      artifacts,
    };
  }

  scoreAllPillars(barPath: string): {
    architecture: GovernancePillarScore;
    security: GovernancePillarScore;
    infoRisk: GovernancePillarScore;
    operations: GovernancePillarScore;
    compositeScore: number;
  } {
    const architecture = this.scorePillar(barPath, 'architecture');
    const security = this.scorePillar(barPath, 'security');
    const infoRisk = this.scorePillar(barPath, 'information-risk');
    const operations = this.scorePillar(barPath, 'operations');
    const compositeScore = Math.round(
      (architecture.score + security.score + infoRisk.score + operations.score) / 4
    );

    return { architecture, security, infoRisk, operations, compositeScore };
  }

  private getDefinitions(pillar: string, barPath: string): { label: string; path: string }[] {
    switch (pillar) {
      case 'architecture': return getArchitectureArtifacts(barPath);
      case 'security': return SECURITY_ARTIFACTS;
      case 'information-risk': return INFO_RISK_ARTIFACTS;
      case 'operations': return OPERATIONS_ARTIFACTS;
      default: return [];
    }
  }
}
