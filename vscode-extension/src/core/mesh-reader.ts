/**
 * MeshReader — VS Code-free mesh reading layer.
 *
 * Extracts pure file-I/O logic from MeshService so it can be shared
 * between the VS Code extension and the MCP server.
 * No vscode imports — only fs, path, and project types.
 */
import * as fs from 'fs';
import * as path from 'path';
import { GovernanceScorer } from '../services/GovernanceScorer';
import { BarService } from '../services/BarService';
import { CapabilityModelService } from '../services/CapabilityModelService';
import type {
  ArchitectureDsl,
  CapabilityModelType,
  PortfolioConfig,
  PlatformConfig,
  PortfolioSummary,
  PlatformSummary,
  BarSummary,
  MeshScoringConfig,
  DriftWeights,
  PolicyFile,
  NistControl,
} from '../types';

// ============================================================================
// Types (Phase 2)
// ============================================================================

export interface GovernanceGap {
  barId: string;
  barName: string;
  pillar: string;
  type: 'missing_artifact' | 'low_quality' | 'failing_score' | 'warning_score';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface CalmValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_DRIFT_WEIGHTS: DriftWeights = { critical: 15, high: 5, medium: 2, low: 1 };

// ============================================================================
// MeshReader
// ============================================================================

export class MeshReader {
  private meshPath: string;
  private scorer: GovernanceScorer;
  private barService: BarService;

  constructor(meshPath: string, scoringConfig?: Partial<MeshScoringConfig>) {
    this.meshPath = meshPath;
    this.scorer = new GovernanceScorer(scoringConfig);
    this.barService = new BarService(this.scorer);
  }

  /** The mesh directory path this reader is bound to. */
  get path(): string {
    return this.meshPath;
  }

  // ==========================================================================
  // Portfolio
  // ==========================================================================

  readPortfolioConfig(): PortfolioConfig | null {
    const yamlPath = path.join(this.meshPath, 'mesh.yaml');
    if (!fs.existsSync(yamlPath)) { return null; }

    try {
      const content = fs.readFileSync(yamlPath, 'utf8');
      return parsePortfolioConfig(content);
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Scoring config
  // ==========================================================================

  readScoringConfig(): MeshScoringConfig {
    const yamlPath = path.join(this.meshPath, 'mesh.yaml');
    const defaults: MeshScoringConfig = { passingThreshold: 75, warningThreshold: 50 };
    if (!fs.existsSync(yamlPath)) { return defaults; }

    try {
      const content = fs.readFileSync(yamlPath, 'utf8');
      const passingMatch = content.match(/passing_threshold:\s*(\d+)/);
      const warningMatch = content.match(/warning_threshold:\s*(\d+)/);
      const config: MeshScoringConfig = {
        passingThreshold: passingMatch ? parseInt(passingMatch[1], 10) : defaults.passingThreshold,
        warningThreshold: warningMatch ? parseInt(warningMatch[1], 10) : defaults.warningThreshold,
      };

      const dwMatch = content.match(/drift_weights:\s*\n((?:\s+\w+:\s*\d+\s*\n?)*)/);
      if (dwMatch) {
        const block = dwMatch[1];
        const crit = block.match(/critical:\s*(\d+)/);
        const high = block.match(/high:\s*(\d+)/);
        const med = block.match(/medium:\s*(\d+)/);
        const low = block.match(/low:\s*(\d+)/);
        config.driftWeights = {
          critical: crit ? parseInt(crit[1], 10) : DEFAULT_DRIFT_WEIGHTS.critical,
          high: high ? parseInt(high[1], 10) : DEFAULT_DRIFT_WEIGHTS.high,
          medium: med ? parseInt(med[1], 10) : DEFAULT_DRIFT_WEIGHTS.medium,
          low: low ? parseInt(low[1], 10) : DEFAULT_DRIFT_WEIGHTS.low,
        };
      }
      return config;
    } catch {
      return defaults;
    }
  }

  readDriftWeights(): DriftWeights {
    const config = this.readScoringConfig();
    return config.driftWeights || DEFAULT_DRIFT_WEIGHTS;
  }

  // ==========================================================================
  // Platforms
  // ==========================================================================

  listPlatforms(): PlatformConfig[] {
    const platformsDir = path.join(this.meshPath, 'platforms');
    if (!fs.existsSync(platformsDir)) { return []; }

    const platforms: PlatformConfig[] = [];
    const entries = fs.readdirSync(platformsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
      const platformYaml = path.join(platformsDir, entry.name, 'platform.yaml');
      if (!fs.existsSync(platformYaml)) { continue; }

      try {
        const content = fs.readFileSync(platformYaml, 'utf8');
        platforms.push(parsePlatformConfig(content));
      } catch { /* skip unparseable */ }
    }

    return platforms;
  }

  // ==========================================================================
  // BARs
  // ==========================================================================

  /** List all BARs across all platforms with their governance scores. */
  listBars(): BarSummary[] {
    const platforms = this.listPlatforms();
    const allBars: BarSummary[] = [];

    for (const platform of platforms) {
      const slug = this.findPlatformSlug(platform.id);
      if (!slug) { continue; }
      const barsDir = path.join(this.meshPath, 'platforms', slug, 'bars');
      const bars = this.scanBars(barsDir, platform.id, platform.name);
      allBars.push(...bars);
    }

    return allBars;
  }

  /** Get a single BAR by name (case-insensitive slug match). */
  getBar(barName: string): BarSummary | null {
    const slug = barName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const bars = this.listBars();
    return bars.find(b => {
      const barSlug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return barSlug === slug || b.name.toLowerCase() === barName.toLowerCase();
    }) || null;
  }

  /** Score a BAR at a given path. */
  scoreBar(barPath: string, platformId: string, platformName: string): BarSummary | null {
    return this.barService.scorePillars(barPath, platformId, platformName);
  }

  /** Read the app manifest for a BAR. */
  readBarManifest(barPath: string) {
    return this.barService.readManifest(barPath);
  }

  // ==========================================================================
  // Portfolio summary
  // ==========================================================================

  buildPortfolioSummary(): PortfolioSummary | null {
    const portfolio = this.readPortfolioConfig();
    if (!portfolio) { return null; }

    // Re-initialize scorer with mesh scoring config
    const scoringConfig = this.readScoringConfig();
    this.scorer = new GovernanceScorer(scoringConfig);
    this.barService = new BarService(this.scorer);

    const platforms = this.listPlatforms();
    const platformSummaries: PlatformSummary[] = [];
    const allBars: BarSummary[] = [];

    for (const platform of platforms) {
      const platformSlug = this.findPlatformSlug(platform.id);
      if (!platformSlug) { continue; }

      const barsDir = path.join(this.meshPath, 'platforms', platformSlug, 'bars');
      const bars = this.scanBars(barsDir, platform.id, platform.name);

      const compositeHealth = bars.length > 0
        ? Math.round(bars.reduce((sum, b) => sum + b.compositeScore, 0) / bars.length)
        : 0;

      platformSummaries.push({
        id: platform.id,
        name: platform.name,
        barCount: bars.length,
        compositeHealth,
        bars,
      });

      allBars.push(...bars);
    }

    const totalBars = allBars.length;
    const portfolioHealth = totalBars > 0
      ? Math.round(allBars.reduce((sum, b) => sum + b.compositeScore, 0) / totalBars)
      : 0;
    const pendingDecisions = allBars.reduce((sum, b) => sum + b.pendingDecisions, 0);
    const governanceCoverage = totalBars > 0
      ? Math.round(
          (allBars.filter(b =>
            b.architecture.status !== 'failing' &&
            b.security.status !== 'failing' &&
            b.infoRisk.status !== 'failing' &&
            b.operations.status !== 'failing'
          ).length / totalBars) * 100
        )
      : 0;

    const capModelService = new CapabilityModelService();
    const capabilityModel = capModelService.buildCapabilityModelSummary(this.meshPath, allBars);

    return {
      portfolio,
      totalBars,
      portfolioHealth,
      pendingDecisions,
      governanceCoverage,
      platforms: platformSummaries,
      allBars,
      ...(capabilityModel ? { capabilityModel } : {}),
    };
  }

  // ==========================================================================
  // Policies
  // ==========================================================================

  readPolicies(): PolicyFile[] {
    const policiesDir = path.join(this.meshPath, 'policies');
    if (!fs.existsSync(policiesDir)) { return []; }

    const pillarMap: Record<string, PolicyFile['pillar']> = {
      'architecture-standards': 'architecture',
      'security-baseline': 'security',
      'risk-framework': 'risk',
      'operations-standards': 'operations',
      'nist-800-53-controls': 'nist',
    };

    const policies: PolicyFile[] = [];
    const entries = fs.readdirSync(policiesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.yaml')) { continue; }
      try {
        const content = fs.readFileSync(path.join(policiesDir, entry.name), 'utf8');
        const baseName = entry.name.replace('.yaml', '');
        const label = baseName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const pillar = pillarMap[baseName] || 'architecture';
        policies.push({ filename: entry.name, label, pillar, content });
      } catch { /* skip unreadable */ }
    }

    return policies;
  }

  readNistControls(): NistControl[] {
    const nistPath = path.join(this.meshPath, 'policies', 'nist-800-53-controls.yaml');
    if (!fs.existsSync(nistPath)) { return []; }

    try {
      const content = fs.readFileSync(nistPath, 'utf8');
      return parseNistControls(content);
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // ADRs
  // ==========================================================================

  /** List ADRs for a BAR (reads architecture/ADRs/ directory). */
  readAdrs(barPath: string): { filename: string; title: string; status: string; content: string }[] {
    const adrDir = path.join(barPath, 'architecture', 'ADRs');
    if (!fs.existsSync(adrDir)) { return []; }

    const adrs: { filename: string; title: string; status: string; content: string }[] = [];
    const entries = fs.readdirSync(adrDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) { continue; }
      try {
        const content = fs.readFileSync(path.join(adrDir, entry.name), 'utf8');
        const titleMatch = content.match(/^#\s+(.+)/m);
        const statusMatch = content.match(/^##\s+Status\s*\n+\s*(\S+)/mi);
        adrs.push({
          filename: entry.name,
          title: titleMatch ? titleMatch[1].trim() : entry.name,
          status: statusMatch ? statusMatch[1].trim() : 'unknown',
          content,
        });
      } catch { /* skip unreadable */ }
    }

    return adrs.sort((a, b) => a.filename.localeCompare(b.filename));
  }

  // ==========================================================================
  // CALM Flows (relationships from bar.arch.json)
  // ==========================================================================

  /** Read CALM flows/relationships from bar.arch.json. */
  readFlows(barPath: string): { nodes: unknown[]; relationships: unknown[]; flows?: unknown[] } | null {
    const archContent = this.readBarFile(barPath, 'architecture/bar.arch.json');
    if (!archContent) { return null; }

    try {
      const arch = JSON.parse(archContent);
      return {
        nodes: arch.nodes || [],
        relationships: arch.relationships || [],
        flows: arch.flows || [],
      };
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Governance gaps analysis
  // ==========================================================================

  /** Identify governance gaps across all BARs. */
  findGovernanceGaps(options?: { barName?: string; pillar?: string }): GovernanceGap[] {
    const bars = options?.barName ? [this.getBar(options.barName)].filter(Boolean) as BarSummary[] : this.listBars();
    const gaps: GovernanceGap[] = [];

    for (const bar of bars) {
      const pillars = ['architecture', 'security', 'infoRisk', 'operations'] as const;
      for (const pillar of pillars) {
        if (options?.pillar && pillar !== options.pillar) { continue; }

        const pillarScore = bar[pillar];
        // Missing artifacts
        for (const artifact of pillarScore.artifacts) {
          if (!artifact.present) {
            gaps.push({
              barId: bar.id,
              barName: bar.name,
              pillar,
              type: 'missing_artifact',
              severity: pillarScore.status === 'failing' ? 'high' : 'medium',
              description: `Missing artifact: ${artifact.label} (${artifact.path})`,
            });
          } else if (artifact.qualityScore < 30) {
            gaps.push({
              barId: bar.id,
              barName: bar.name,
              pillar,
              type: 'low_quality',
              severity: 'low',
              description: `Low quality artifact: ${artifact.label} (score: ${artifact.qualityScore}/100)`,
            });
          }
        }

        // Weak scores
        if (pillarScore.status === 'failing') {
          gaps.push({
            barId: bar.id,
            barName: bar.name,
            pillar,
            type: 'failing_score',
            severity: 'high',
            description: `${pillar} pillar is failing (score: ${pillarScore.score}/100)`,
          });
        } else if (pillarScore.status === 'warning') {
          gaps.push({
            barId: bar.id,
            barName: bar.name,
            pillar,
            type: 'warning_score',
            severity: 'medium',
            description: `${pillar} pillar is in warning (score: ${pillarScore.score}/100)`,
          });
        }
      }
    }

    return gaps;
  }

  // ==========================================================================
  // CALM validation
  // ==========================================================================

  /** Validate a CALM architecture file for structural correctness. */
  validateCalm(barPath: string): CalmValidationResult {
    const content = this.readBarFile(barPath, 'architecture/bar.arch.json');
    if (!content) {
      return { valid: false, errors: ['No architecture file found at architecture/bar.arch.json'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    let arch: { nodes?: unknown[]; relationships?: unknown[]; $schema?: string };
    try {
      arch = JSON.parse(content);
    } catch (e) {
      return { valid: false, errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`], warnings: [] };
    }

    // Check required sections
    if (!arch.nodes || !Array.isArray(arch.nodes)) {
      errors.push('Missing or invalid "nodes" array');
    } else {
      // Validate each node has required fields
      const nodeIds = new Set<string>();
      for (let i = 0; i < arch.nodes.length; i++) {
        const node = arch.nodes[i] as Record<string, unknown>;
        if (!node['unique-id']) { errors.push(`Node [${i}] missing "unique-id"`); }
        if (!node['name']) { warnings.push(`Node [${i}] missing "name"`); }
        if (!node['node-type']) { warnings.push(`Node [${i}] missing "node-type"`); }
        if (node['unique-id']) {
          if (nodeIds.has(node['unique-id'] as string)) {
            errors.push(`Duplicate node id: ${node['unique-id']}`);
          }
          nodeIds.add(node['unique-id'] as string);
        }
      }

      // Validate relationships reference valid nodes
      if (arch.relationships && Array.isArray(arch.relationships)) {
        for (let i = 0; i < arch.relationships.length; i++) {
          const rel = arch.relationships[i] as Record<string, unknown>;
          if (!rel['unique-id']) { errors.push(`Relationship [${i}] missing "unique-id"`); }
          const relType = rel['relationship-type'] as Record<string, unknown> | undefined;
          if (relType?.connects) {
            const connects = relType.connects as Record<string, { node?: string }>;
            if (connects.source?.node && !nodeIds.has(connects.source.node)) {
              errors.push(`Relationship [${i}] references unknown source node: ${connects.source.node}`);
            }
            if (connects.destination?.node && !nodeIds.has(connects.destination.node)) {
              errors.push(`Relationship [${i}] references unknown destination node: ${connects.destination.node}`);
            }
          }
        }
      }
    }

    if (!arch.$schema) {
      warnings.push('Missing "$schema" reference — recommend adding CALM schema URL');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ==========================================================================
  // Platform Architecture (Phase 4)
  // ==========================================================================

  /** Resolve the filesystem path for a platform by ID. */
  getPlatformPath(platformId: string): string | null {
    const slug = this.findPlatformSlug(platformId);
    if (!slug) { return null; }
    return path.join(this.meshPath, 'platforms', slug);
  }

  /** Read and parse the platform-level CALM architecture model. */
  readPlatformArchitecture(platformId: string): { nodes: unknown[]; relationships: unknown[] } | null {
    const platformPath = this.getPlatformPath(platformId);
    if (!platformPath) { return null; }

    const archPath = path.join(platformPath, 'platform.arch.json');
    if (!fs.existsSync(archPath)) { return null; }

    try {
      const content = fs.readFileSync(archPath, 'utf8');
      const arch = JSON.parse(content);
      return {
        nodes: arch.nodes || [],
        relationships: arch.relationships || [],
      };
    } catch {
      return null;
    }
  }

  /** Validate a platform-level CALM model for structural correctness. */
  validatePlatformCalm(platformId: string): CalmValidationResult {
    const platformPath = this.getPlatformPath(platformId);
    if (!platformPath) {
      return { valid: false, errors: [`Platform not found: ${platformId}`], warnings: [] };
    }

    const archPath = path.join(platformPath, 'platform.arch.json');
    if (!fs.existsSync(archPath)) {
      return { valid: false, errors: ['No platform architecture file found at platform.arch.json'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    let arch: { nodes?: unknown[]; relationships?: unknown[]; $schema?: string };
    try {
      const content = fs.readFileSync(archPath, 'utf8');
      arch = JSON.parse(content);
    } catch (e) {
      return { valid: false, errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`], warnings: [] };
    }

    if (!arch.nodes || !Array.isArray(arch.nodes)) {
      errors.push('Missing or invalid "nodes" array');
    } else {
      // Collect actual BAR slugs in this platform
      const barsDir = path.join(platformPath, 'bars');
      const barSlugs = new Set<string>();
      if (fs.existsSync(barsDir)) {
        const entries = fs.readdirSync(barsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            barSlugs.add(entry.name);
          }
        }
      }

      const nodeIds = new Set<string>();
      const validNodeTypes = ['bar', 'shared-infrastructure'];

      for (let i = 0; i < arch.nodes.length; i++) {
        const node = arch.nodes[i] as Record<string, unknown>;
        if (!node['unique-id']) { errors.push(`Node [${i}] missing "unique-id"`); }
        if (!node['name']) { warnings.push(`Node [${i}] missing "name"`); }

        const nodeType = node['node-type'] as string | undefined;
        if (!nodeType) {
          warnings.push(`Node [${i}] missing "node-type"`);
        } else if (!validNodeTypes.includes(nodeType)) {
          errors.push(`Node [${i}] has invalid node-type "${nodeType}". Platform nodes must be "bar" or "shared-infrastructure".`);
        }

        // BAR nodes must reference an actual BAR directory
        if (nodeType === 'bar') {
          const barId = node['bar-id'] as string | undefined;
          if (!barId) {
            errors.push(`Node [${i}] is type "bar" but missing "bar-id" field`);
          } else if (!barSlugs.has(barId)) {
            errors.push(`Node [${i}] references bar-id "${barId}" which does not exist in this platform`);
          }
        }

        if (node['unique-id']) {
          if (nodeIds.has(node['unique-id'] as string)) {
            errors.push(`Duplicate node id: ${node['unique-id']}`);
          }
          nodeIds.add(node['unique-id'] as string);
        }
      }

      // Validate relationships reference valid nodes
      if (arch.relationships && Array.isArray(arch.relationships)) {
        for (let i = 0; i < arch.relationships.length; i++) {
          const rel = arch.relationships[i] as Record<string, unknown>;
          if (!rel['unique-id']) { errors.push(`Relationship [${i}] missing "unique-id"`); }
          const relType = rel['relationship-type'] as Record<string, unknown> | undefined;
          if (relType?.connects) {
            const connects = relType.connects as Record<string, { node?: string }>;
            if (connects.source?.node && !nodeIds.has(connects.source.node)) {
              errors.push(`Relationship [${i}] references unknown source node: ${connects.source.node}`);
            }
            if (connects.destination?.node && !nodeIds.has(connects.destination.node)) {
              errors.push(`Relationship [${i}] references unknown destination node: ${connects.destination.node}`);
            }
          }
        }
      }
    }

    if (!arch.$schema) {
      warnings.push('Missing "$schema" reference — recommend adding CALM schema URL');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /** Find all BARs and shared infrastructure linked to a given BAR via the platform CALM model. */
  findLinkedBars(barName: string): { barName: string; barId: string; nodeId: string; relationship: string }[] {
    const bar = this.getBar(barName);
    if (!bar) { return []; }

    // Find the platform this BAR belongs to
    const platformArch = this.readPlatformArchitecture(bar.platformId);
    if (!platformArch) { return []; }

    // Find the BAR's node in the platform CALM by matching bar-id to the BAR's directory slug
    const barSlug = bar.path.split('/').pop() || '';
    const barNode = (platformArch.nodes as Array<Record<string, unknown>>).find(
      n => n['node-type'] === 'bar' && n['bar-id'] === barSlug
    );
    if (!barNode) { return []; }

    const barNodeId = barNode['unique-id'] as string;
    const linked: { barName: string; barId: string; nodeId: string; relationship: string }[] = [];
    const seen = new Set<string>();

    // Walk relationships to find connected nodes
    for (const rel of platformArch.relationships as Array<Record<string, unknown>>) {
      const relType = rel['relationship-type'] as Record<string, unknown> | undefined;
      const connects = relType?.connects as Record<string, { node?: string }> | undefined;
      if (!connects) { continue; }

      let connectedNodeId: string | undefined;
      if (connects.source?.node === barNodeId) {
        connectedNodeId = connects.destination?.node;
      } else if (connects.destination?.node === barNodeId) {
        connectedNodeId = connects.source?.node;
      }

      if (!connectedNodeId || seen.has(connectedNodeId)) { continue; }
      seen.add(connectedNodeId);

      // Find the connected node
      const connectedNode = (platformArch.nodes as Array<Record<string, unknown>>).find(
        n => n['unique-id'] === connectedNodeId
      );
      if (!connectedNode) { continue; }

      linked.push({
        barName: connectedNode['name'] as string || connectedNodeId,
        barId: (connectedNode['bar-id'] as string) || connectedNodeId,
        nodeId: connectedNodeId,
        relationship: connectedNode['node-type'] === 'bar' ? 'bar-to-bar' : 'bar-to-infrastructure',
      });
    }

    return linked;
  }

  // ==========================================================================
  // File reading helpers (for MCP resources)
  // ==========================================================================

  /** Read a file relative to a BAR path. Returns null if not found. */
  readBarFile(barPath: string, relativePath: string): string | null {
    const fullPath = path.join(barPath, relativePath);
    try {
      return fs.readFileSync(fullPath, 'utf8');
    } catch {
      return null;
    }
  }

  /** Read a file relative to the mesh root. */
  readMeshFile(relativePath: string): string | null {
    const fullPath = path.join(this.meshPath, relativePath);
    try {
      return fs.readFileSync(fullPath, 'utf8');
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private scanBars(barsDir: string, platformId: string, platformName: string): BarSummary[] {
    if (!fs.existsSync(barsDir)) { return []; }

    const bars: BarSummary[] = [];
    const entries = fs.readdirSync(barsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
      const barPath = path.join(barsDir, entry.name);
      const summary = this.barService.scorePillars(barPath, platformId, platformName);
      if (summary) { bars.push(summary); }
    }

    return bars;
  }

  private findPlatformSlug(platformId: string): string | null {
    const platformsDir = path.join(this.meshPath, 'platforms');
    if (!fs.existsSync(platformsDir)) { return null; }

    const entries = fs.readdirSync(platformsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
      const yamlPath = path.join(platformsDir, entry.name, 'platform.yaml');
      if (!fs.existsSync(yamlPath)) { continue; }

      try {
        const content = fs.readFileSync(yamlPath, 'utf8');
        const idMatch = content.match(/^\s*id:\s*(.+)$/m);
        if (idMatch && idMatch[1].trim() === platformId) {
          return entry.name;
        }
      } catch { /* skip */ }
    }

    return null;
  }
}

// ============================================================================
// Standalone parsers (exported for direct use)
// ============================================================================

export function parsePortfolioConfig(content: string): PortfolioConfig {
  const get = (key: string): string => {
    const match = content.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
    return match ? match[1].replace(/^["']|["']$/g, '').trim() : '';
  };

  const dslVal = get('architecture_dsl');
  const architectureDsl: ArchitectureDsl = dslVal === 'markdown' ? 'markdown' : 'calm';

  const capModelVal = get('capability_model');
  const capabilityModel: CapabilityModelType | undefined =
    capModelVal === 'banking' ? 'banking'
    : capModelVal === 'custom' ? 'custom'
    : capModelVal === 'insurance' ? 'insurance'
    : undefined;

  const repo = get('repo') || undefined;

  const agentTypeVal = get('agent_type');
  const agentType: 'claude' | 'copilot' | 'both' | undefined =
    agentTypeVal === 'claude' ? 'claude'
    : agentTypeVal === 'copilot' ? 'copilot'
    : agentTypeVal === 'both' ? 'both'
    : undefined;

  return {
    id: get('id'),
    name: get('name'),
    org: get('org'),
    owner: get('owner'),
    description: get('description'),
    repo,
    agentType,
    architectureDsl,
    capabilityModel,
  };
}

export function parsePlatformConfig(content: string): PlatformConfig {
  const get = (key: string): string => {
    const match = content.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
    return match ? match[1].replace(/^["']|["']$/g, '').trim() : '';
  };

  return {
    id: get('id'),
    name: get('name'),
    portfolio: get('portfolio'),
    owner: get('owner'),
    description: get('description'),
  };
}

export function parseNistControls(content: string): NistControl[] {
  const controls: NistControl[] = [];
  let currentFamilyId = '';
  let currentFamilyName = '';

  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const familyIdMatch = line.match(/^\s{2}-\s+id:\s*(\S+)/);
    if (familyIdMatch) {
      currentFamilyId = familyIdMatch[1];
      i++;
      continue;
    }

    const familyNameMatch = line.match(/^\s{4}name:\s*(.+)/);
    if (familyNameMatch) {
      currentFamilyName = familyNameMatch[1].trim();
      i++;
      continue;
    }

    const controlIdMatch = line.match(/^\s{6}-\s+id:\s*(\S+)/);
    if (controlIdMatch) {
      const id = controlIdMatch[1];
      let name = '';
      let description = '';
      let priority: 'high' | 'medium' | 'low' = 'medium';

      i++;
      while (i < lines.length) {
        const cl = lines[i];
        if (!cl.match(/^\s{8}\S/)) { break; }

        const nameMatch = cl.match(/^\s+name:\s*(.+)/);
        if (nameMatch) { name = nameMatch[1].trim(); }

        const descMatch = cl.match(/^\s+description:\s*"(.+)"/);
        if (descMatch) { description = descMatch[1].trim(); }

        const prioMatch = cl.match(/^\s+priority:\s*(\S+)/);
        if (prioMatch) { priority = prioMatch[1] as 'high' | 'medium' | 'low'; }

        i++;
      }

      controls.push({ id, name, family: currentFamilyName, familyId: currentFamilyId, description, priority });
      continue;
    }

    i++;
  }

  return controls;
}
