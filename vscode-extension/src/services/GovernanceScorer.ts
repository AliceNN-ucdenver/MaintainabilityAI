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
    // Read content directly — skip stat.size pre-check to avoid TOCTOU
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (content.length === 0) { return false; }
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

// ============================================================================
// Content quality assessment per artifact type
// ============================================================================

/** Required top-level keys per artifact label (for YAML files). */
const YAML_REQUIRED_KEYS: Record<string, string[]> = {
  'Threat Model':           ['threats'],
  'Security Controls':      ['controls'],
  'Vulnerability Tracking': ['vulnerabilities'],
  'Compliance Checklist':   ['checklist'],
  'Fitness Functions':      ['functions'],
  'Quality Attributes':     ['scenarios'],
  'Data Classification':    ['data_elements'],
  'VISM':                   ['assets'],
  'Privacy Impact':         ['assessment'],
  'Service Mapping':        ['services'],
  'SLA Definitions':        ['sla'],
  'Incident Response':      ['escalation'],
};

const MARKDOWN_ARTIFACTS = new Set([
  'Conceptual View', 'Logical View', 'Context View', 'Sequence View',
  'Risk Assessment', 'Runbook',
]);

const JSON_ARTIFACTS: Record<string, string> = {
  'Architecture (CALM)':          'nodes',
  'Capability Decorator (CALM)':  'definitions',
};

const DIRECTORY_ARTIFACTS = new Set(['ADRs']);

function assessYamlQuality(filePath: string, requiredKeys: string[]): number {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const nonCommentLines = lines.filter(l => l.trim() && !l.trimStart().startsWith('#'));
    if (nonCommentLines.length === 0) { return 0; }

    let score = 0;

    // +30 for valid structure (has key: value lines)
    if (nonCommentLines.some(l => /^\s*\S+:/.test(l))) { score += 30; }

    // +30 for required top-level keys present
    if (requiredKeys.length > 0) {
      const keysPresent = requiredKeys.filter(key =>
        nonCommentLines.some(l => new RegExp(`^\\s*${key}:`).test(l))
      );
      score += Math.round(30 * (keysPresent.length / requiredKeys.length));
    } else {
      score += 15; // No required keys defined — give partial credit
    }

    // +40 scaled by list entries (lines matching "  - ")
    const listEntries = nonCommentLines.filter(l => /^\s+-\s+/.test(l)).length;
    score += Math.min(40, listEntries * 10);

    return Math.min(100, score);
  } catch {
    return 0;
  }
}

function assessMarkdownQuality(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let score = 0;

    const headings = lines.filter(l => /^#+\s/.test(l)).length;
    if (headings >= 2) { score += 30; }
    else if (headings >= 1) { score += 15; }

    const bodyLines = lines.filter(l => !l.trimStart().startsWith('#') && l.trim());
    const wordCount = bodyLines.join(' ').split(/\s+/).filter(Boolean).length;
    if (wordCount > 300) { score += 50; }
    else if (wordCount > 100) { score += 30; }
    else if (wordCount > 30) { score += 15; }

    if (lines.some(l => /\|.*\|.*\|/.test(l)) || lines.some(l => /^\s*[-*]\s+/.test(l))) {
      score += 20;
    }

    return Math.min(100, score);
  } catch {
    return 0;
  }
}

function assessJsonQuality(filePath: string, requiredArrayKey?: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    let score = 40; // Valid JSON parse

    if (requiredArrayKey && parsed && typeof parsed === 'object') {
      const arr = parsed[requiredArrayKey];
      if (Array.isArray(arr)) {
        score += 30;
        score += Math.min(30, arr.length * 10);
      }
    } else if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      score += 30;
    }

    return Math.min(100, score);
  } catch {
    return 0;
  }
}

function assessDirectoryQuality(dirPath: string): number {
  try {
    const entries = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
    if (entries.length === 0) { return 0; }

    let totalQuality = 0;
    let count = 0;

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      try {
        const stat = fs.statSync(entryPath);
        if (stat.isFile()) {
          count++;
          if (entry.endsWith('.md')) {
            totalQuality += assessMarkdownQuality(entryPath);
          } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
            totalQuality += assessYamlQuality(entryPath, []);
          } else if (entry.endsWith('.json')) {
            totalQuality += assessJsonQuality(entryPath);
          } else {
            totalQuality += stat.size > 0 ? 50 : 0;
          }
        }
      } catch { /* skip unreadable entries */ }
    }

    return count > 0 ? Math.round(totalQuality / count) : 0;
  } catch {
    return 0;
  }
}

function assessArtifactQuality(filePath: string, label: string): number {
  if (YAML_REQUIRED_KEYS[label]) {
    return assessYamlQuality(filePath, YAML_REQUIRED_KEYS[label]);
  }
  if (MARKDOWN_ARTIFACTS.has(label)) {
    return assessMarkdownQuality(filePath);
  }
  if (JSON_ARTIFACTS[label] !== undefined) {
    return assessJsonQuality(filePath, JSON_ARTIFACTS[label]);
  }
  if (DIRECTORY_ARTIFACTS.has(label)) {
    return assessDirectoryQuality(filePath);
  }
  try {
    return fs.statSync(filePath).size > 0 ? 50 : 0;
  } catch {
    return 0;
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
    const qualityScore = present ? assessArtifactQuality(fullPath, def.label) : 0;
    return {
      label: def.label,
      path: def.path,
      present,
      nonEmpty,
      qualityScore,
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

    if (total === 0) {
      return { pillar, score: 0, status: 'failing', artifacts };
    }

    // Blended formula: present = base 60%, quality bonus up to 40%
    const artifactScores = artifacts.map(a =>
      a.present ? 60 + (a.qualityScore * 0.4) : 0
    );
    const score = Math.round(
      artifactScores.reduce((sum, s) => sum + s, 0) / total
    );

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
