import * as fs from 'fs';
import * as path from 'path';
import { configService } from './ConfigService';
import type {
  ArchitectureDsl,
  CapabilityModelType,
  PortfolioConfig,
  PlatformConfig,
  PortfolioSummary,
  BarSummary,
  MeshScoringConfig,
  DriftWeights,
  Criticality,
  RecommendedPlatform,
  PolicyFile,
  NistControl,
} from '../types';
import { GovernanceScorer } from './GovernanceScorer';
import { BarService } from './BarService';
import { CapabilityModelService } from './CapabilityModelService';
import { MeshReader } from '../core/mesh-reader';
import {
  generateMeshYaml,
  generateMeshReadme,
  generatePortfolioDecisionsYaml,
  generateArchitectureStandards,
  generateSecurityBaseline,
  generateRiskFramework,
  generateOperationsStandards,
  generateNistControls,
  generatePlatformYaml,
  generatePlatformDecisionsYaml,
  generateSampleImdbPlatformArch,
} from '../templates/mesh';
import { generateOraculumWorkflow } from '../templates/codeRepoTemplates';

export { MeshReader } from '../core/mesh-reader';

export class MeshService {
  private barService: BarService;
  private scorer: GovernanceScorer;

  constructor() {
    this.scorer = new GovernanceScorer();
    this.barService = new BarService(this.scorer);
  }

  /** Create a MeshReader for the given path (VS Code-free). */
  createReader(meshPath: string): MeshReader {
    const scoringConfig = this.readScoringConfig(meshPath);
    return new MeshReader(meshPath, scoringConfig);
  }

  // ==========================================================================
  // Path resolution
  // ==========================================================================

  static getMeshPath(): string | null {
    const meshPath = configService.meshPath;
    if (!meshPath || !fs.existsSync(meshPath)) { return null; }
    return meshPath;
  }

  static async setMeshPath(meshPath: string): Promise<void> {
    await configService.setMeshPath(meshPath);
  }

  // ==========================================================================
  // Read operations — delegated to MeshReader (VS Code-free)
  // ==========================================================================

  readPortfolioConfig(meshPath: string): PortfolioConfig | null {
    return new MeshReader(meshPath).readPortfolioConfig();
  }

  static readonly DEFAULT_DRIFT_WEIGHTS: DriftWeights = { critical: 15, high: 5, medium: 2, low: 1 };

  readScoringConfig(meshPath: string): MeshScoringConfig {
    return new MeshReader(meshPath).readScoringConfig();
  }

  readDriftWeights(meshPath: string): DriftWeights {
    return new MeshReader(meshPath).readDriftWeights();
  }

  saveDriftWeights(meshPath: string, weights: DriftWeights): void {
    const meshYaml = path.join(meshPath, 'mesh.yaml');
    let content: string;
    try {
      content = fs.readFileSync(meshYaml, 'utf8');
    } catch {
      return;
    }
    const block = `drift_weights:\n    critical: ${weights.critical}\n    high: ${weights.high}\n    medium: ${weights.medium}\n    low: ${weights.low}`;

    // Replace existing drift_weights block or append after scoring section
    const existingMatch = content.match(/drift_weights:\s*\n(?:\s+\w+:\s*\d+\s*\n?)*/);
    if (existingMatch) {
      content = content.replace(existingMatch[0], block + '\n');
    } else if (content.includes('scoring:')) {
      // Append inside scoring section
      content = content.replace(/(scoring:\s*\n(?:\s+\w+:\s*\d+\s*\n?)*)/, `$1  ${block}\n`);
    } else {
      // Append scoring section with drift weights
      content = content.trimEnd() + `\n\nscoring:\n  ${block}\n`;
    }
    fs.writeFileSync(meshYaml, content, 'utf8');
  }

  /**
   * Enumerate all platforms by scanning platforms/ subdirectories.
   */
  listPlatforms(meshPath: string): PlatformConfig[] {
    return new MeshReader(meshPath).listPlatforms();
  }

  /**
   * Build a complete portfolio summary by scanning all platforms and BARs.
   */
  buildPortfolioSummary(meshPath: string): PortfolioSummary | null {
    const scoringConfig = this.readScoringConfig(meshPath);
    return new MeshReader(meshPath, scoringConfig).buildPortfolioSummary();
  }

  // ==========================================================================
  // Scaffold operations
  // ==========================================================================

  /**
   * Initialize a new governance mesh at the given path.
   */
  initializeMesh(targetPath: string, name: string, org: string, owner: string, architectureDsl: ArchitectureDsl = 'calm', capabilityModel: CapabilityModelType = 'insurance'): string {
    const dirs = [
      'platforms',
      'policies',
      'governance',
      'reports',
      'decorators',
    ];

    for (const dir of dirs) {
      const fullDir = path.join(targetPath, dir);
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }
    }

    // Write .gitkeep files for empty dirs (exclusive create — no overwrite)
    for (const dir of ['platforms', 'reports']) {
      const gitkeep = path.join(targetPath, dir, '.gitkeep');
      try { fs.writeFileSync(gitkeep, '', { encoding: 'utf8', flag: 'wx' }); } catch { /* already exists */ }
    }

    // Write mesh.yaml
    fs.writeFileSync(
      path.join(targetPath, 'mesh.yaml'),
      generateMeshYaml(name, org, owner, architectureDsl, capabilityModel),
      'utf8'
    );

    // Write capability model
    const capModelService = new CapabilityModelService();
    capModelService.initializeModel(targetPath, capabilityModel);

    // Write README.md
    fs.writeFileSync(
      path.join(targetPath, 'README.md'),
      generateMeshReadme(name, org),
      'utf8'
    );

    // Write portfolio decisions
    fs.writeFileSync(
      path.join(targetPath, 'governance', 'decisions.yaml'),
      generatePortfolioDecisionsYaml(),
      'utf8'
    );

    // Write policy templates
    const policies: { file: string; content: string }[] = [
      { file: 'architecture-standards.yaml', content: generateArchitectureStandards() },
      { file: 'security-baseline.yaml', content: generateSecurityBaseline() },
      { file: 'risk-framework.yaml', content: generateRiskFramework() },
      { file: 'operations-standards.yaml', content: generateOperationsStandards() },
      { file: 'nist-800-53-controls.yaml', content: generateNistControls() },
    ];

    for (const policy of policies) {
      fs.writeFileSync(
        path.join(targetPath, 'policies', policy.file),
        policy.content,
        'utf8'
      );
    }

    return targetPath;
  }

  /**
   * Add a platform to the mesh.
   */
  addPlatform(
    meshPath: string,
    name: string,
    abbreviation: string,
    owner: string
  ): { id: string; slug: string } {
    const id = `PLT-${abbreviation.toUpperCase()}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const platformDir = path.join(meshPath, 'platforms', slug);

    // Create directories
    fs.mkdirSync(path.join(platformDir, 'bars'), { recursive: true });
    fs.mkdirSync(path.join(platformDir, 'governance'), { recursive: true });

    // Write .gitkeep
    fs.writeFileSync(path.join(platformDir, 'bars', '.gitkeep'), '', 'utf8');

    // Read portfolio ID
    const portfolio = this.readPortfolioConfig(meshPath);
    const portfolioId = portfolio?.id || 'PF-UNKNOWN';

    // Write platform.yaml
    fs.writeFileSync(
      path.join(platformDir, 'platform.yaml'),
      generatePlatformYaml(id, name, portfolioId, owner),
      'utf8'
    );

    // Write decisions.yaml
    fs.writeFileSync(
      path.join(platformDir, 'governance', 'decisions.yaml'),
      generatePlatformDecisionsYaml(),
      'utf8'
    );

    // Update mesh.yaml platforms array
    this.registerPlatformInMesh(meshPath, id, name, `platforms/${slug}`, owner);

    return { id, slug };
  }

  /**
   * Scaffold a new BAR under a platform and return the generated app ID.
   */
  scaffoldBar(
    meshPath: string,
    platformId: string,
    name: string,
    criticality: Criticality,
    template: 'minimal' | 'standard' | 'full'
  ): { id: string; path: string } | null {
    const platformSlug = this.findPlatformSlug(meshPath, platformId);
    if (!platformSlug) { return null; }

    const barsDir = path.join(meshPath, 'platforms', platformSlug, 'bars');
    const portfolio = this.readPortfolioConfig(meshPath);
    const portfolioId = portfolio?.id || 'PF-UNKNOWN';

    // Generate sequential ID
    const existingBars = this.scanBars(barsDir, platformId, '');
    const seq = String(existingBars.length + 1).padStart(3, '0');
    const abbr = platformId.replace('PLT-', '');
    const appId = `APP-${abbr}-${seq}`;

    const dsl = portfolio?.architectureDsl || 'calm';

    const barPath = this.barService.scaffoldBar(
      barsDir, name, appId, portfolioId, platformId, criticality, template, dsl
    );

    return { id: appId, path: barPath };
  }

  /**
   * Bulk scaffold platforms and BARs from org scan recommendations.
   * Creates all platforms and their BARs, writing repo references into each BAR.
   */
  bulkScaffold(
    meshPath: string,
    platforms: RecommendedPlatform[],
    template: 'minimal' | 'standard' | 'full'
  ): { platformCount: number; barCount: number } {
    let platformCount = 0;
    let barCount = 0;

    for (const platform of platforms) {
      if (platform.bars.length === 0) { continue; }

      const { id: platformId } = this.addPlatform(
        meshPath,
        platform.name,
        platform.abbreviation,
        ''
      );
      platformCount++;

      for (const bar of platform.bars) {
        if (bar.repos.length === 0) { continue; }

        const repoUrls = bar.repos.map(r => r.url);
        const result = this.scaffoldBar(
          meshPath,
          platformId,
          bar.name,
          bar.criticality,
          template
        );

        if (result) {
          // Update app.yaml with repo URLs
          const appYamlPath = path.join(result.path, 'app.yaml');
          try {
            let content = fs.readFileSync(appYamlPath, 'utf8');
            if (content.includes('repos: []') && repoUrls.length > 0) {
              const reposList = repoUrls.map(u => `    - "${u}"`).join('\n');
              content = content.replace('repos: []', `repos:\n${reposList}`);
              fs.writeFileSync(appYamlPath, content, 'utf8');
            }
          } catch { /* app.yaml does not exist yet — skip */ }

          barCount++;
        }
      }
    }

    return { platformCount, barCount };
  }

  /**
   * Scaffold a sample platform with 3 linked CALM BARs:
   * Claims Processing, Policy Administration, and Fraud Detection.
   * Their CALM context architectures reference each other via interacts relationships.
   * Overwrites any existing sample platform so the latest templates are always used.
   */
  scaffoldSamplePlatform(meshPath: string): { platformCount: number; barCount: number } {
    // Remove existing sample platform if present
    const existingSlug = 'insurance-operations';
    const existingDir = path.join(meshPath, 'platforms', existingSlug);
    if (fs.existsSync(existingDir)) {
      fs.rmSync(existingDir, { recursive: true, force: true });
      this.unregisterPlatformFromMesh(meshPath, 'PLT-INS');
    }

    const { id: platformId, slug } = this.addPlatform(meshPath, 'Insurance Operations', 'INS', '');

    const barsDir = path.join(meshPath, 'platforms', slug, 'bars');
    const portfolio = this.readPortfolioConfig(meshPath);
    const portfolioId = portfolio?.id || 'PF-UNKNOWN';

    const nextId = (seq: number) => `APP-INS-${String(seq).padStart(3, '0')}`;

    // BAR 1: Claims Processing (high criticality — core business)
    this.barService.scaffoldCalmSampleBar(
      barsDir, 'Claims Processing', nextId(1), portfolioId, platformId, 'high'
    );

    // BAR 2: Policy Administration (high criticality — system of record)
    this.barService.scaffoldPolicyAdminSampleBar(
      barsDir, 'Policy Administration', nextId(2), portfolioId, platformId, 'high'
    );

    // BAR 3: Fraud Detection (medium criticality — supporting service)
    this.barService.scaffoldFraudDetectionSampleBar(
      barsDir, 'Fraud Detection', nextId(3), portfolioId, platformId, 'medium'
    );

    return { platformCount: 1, barCount: 3 };
  }

  /**
   * Create a sample IMDB Lite platform with a single BAR representing a 3-tier
   * web application (React + Express API + MongoDB).
   * Overwrites any existing IMDB Lite platform so the latest templates are always used.
   */
  scaffoldImdbLitePlatform(meshPath: string): { platformCount: number; barCount: number } {
    // Remove existing sample platform if present
    const existingSlug = 'imdb-lite';
    const existingDir = path.join(meshPath, 'platforms', existingSlug);
    if (fs.existsSync(existingDir)) {
      fs.rmSync(existingDir, { recursive: true, force: true });
      this.unregisterPlatformFromMesh(meshPath, 'PLT-IMDB');
    }

    const { id: platformId, slug } = this.addPlatform(meshPath, 'IMDB Lite', 'IMDB', '');

    const barsDir = path.join(meshPath, 'platforms', slug, 'bars');
    const portfolio = this.readPortfolioConfig(meshPath);
    const portfolioId = portfolio?.id || 'PF-UNKNOWN';

    // BAR 1: IMDB Lite Application (movie catalog, reviews, ratings)
    this.barService.scaffoldImdbLiteSampleBar(
      barsDir, 'IMDB Lite Application', 'APP-IMDB-001', portfolioId, platformId, 'medium'
    );

    // BAR 2: IMDB Celebs (celebrity news & profiles, linked to IMDB Lite)
    this.barService.scaffoldImdbCelebsSampleBar(
      barsDir, 'IMDB Celebs', 'APP-IMDB-002', portfolioId, platformId, 'medium'
    );

    // Platform architecture: cross-BAR relationships + shared infrastructure
    const platformDir = path.join(meshPath, 'platforms', slug);
    fs.writeFileSync(
      path.join(platformDir, 'platform.arch.json'),
      generateSampleImdbPlatformArch(),
      'utf8'
    );

    return { platformCount: 1, barCount: 2 };
  }

  // ==========================================================================
  // Oraculum (architecture review) provisioning
  // ==========================================================================

  /**
   * Write the Oraculum GitHub Action workflow into the mesh directory.
   * Prompt packs are now seeded separately via promptPackService.seedMeshPrompts().
   */
  writeOraculumWorkflow(meshPath: string, extensionPath: string): void {
    const workflowDir = path.join(meshPath, '.github', 'workflows');
    fs.mkdirSync(workflowDir, { recursive: true });
    const workflowContent = generateOraculumWorkflow(extensionPath);
    if (workflowContent) {
      fs.writeFileSync(path.join(workflowDir, 'oraculum-review.yml'), workflowContent, 'utf8');
    }
  }

  // ==========================================================================
  // Policy operations
  // ==========================================================================

  readPolicies(meshPath: string): PolicyFile[] {
    return new MeshReader(meshPath).readPolicies();
  }

  readNistControls(meshPath: string): NistControl[] {
    return new MeshReader(meshPath).readNistControls();
  }

  savePolicyFile(meshPath: string, filename: string, content: string): void {
    // Validate filename: only alphanumeric, hyphens, dots
    if (!/^[a-zA-Z0-9._-]+\.yaml$/.test(filename)) {
      throw new Error('Invalid policy filename. Use alphanumeric characters, hyphens, and .yaml extension.');
    }
    const policiesDir = path.join(meshPath, 'policies');
    if (!fs.existsSync(policiesDir)) {
      fs.mkdirSync(policiesDir, { recursive: true });
    }
    fs.writeFileSync(path.join(policiesDir, filename), content, 'utf8');
  }

  // ==========================================================================
  // Private helpers (scaffold operations only)
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

  private findPlatformSlug(meshPath: string, platformId: string): string | null {
    const platformsDir = path.join(meshPath, 'platforms');
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

  private registerPlatformInMesh(
    meshPath: string,
    id: string,
    name: string,
    platformPath: string,
    owner: string
  ): void {
    const meshYaml = path.join(meshPath, 'mesh.yaml');
    if (!fs.existsSync(meshYaml)) { return; }

    let content = fs.readFileSync(meshYaml, 'utf8');

    // Replace "platforms: []" with actual entry
    if (content.includes('platforms: []')) {
      content = content.replace(
        'platforms: []',
        `platforms:\n  - id: ${id}\n    name: "${name}"\n    path: ${platformPath}\n    owner: "${owner}"`
      );
    } else {
      // Append to existing platforms list — find last platform entry
      const lines = content.split('\n');
      let lastPlatformLine = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^\s+-\s+id:\s+PLT-/)) {
          // Find the end of this platform block
          let j = i + 1;
          while (j < lines.length && lines[j].match(/^\s{4}/)) { j++; }
          lastPlatformLine = j - 1;
        }
      }

      if (lastPlatformLine >= 0) {
        const entry = `  - id: ${id}\n    name: "${name}"\n    path: ${platformPath}\n    owner: "${owner}"`;
        lines.splice(lastPlatformLine + 1, 0, entry);
        content = lines.join('\n');
      }
    }

    fs.writeFileSync(meshYaml, content, 'utf8');
  }

  /** Remove a platform entry from mesh.yaml by its ID (e.g., PLT-INS). */
  private unregisterPlatformFromMesh(meshPath: string, platformId: string): void {
    const meshYaml = path.join(meshPath, 'mesh.yaml');
    let rawContent: string;
    try { rawContent = fs.readFileSync(meshYaml, 'utf8'); } catch { return; }
    const lines = rawContent.split('\n');
    const result: string[] = [];
    let i = 0;

    while (i < lines.length) {
      // Check if this line starts a platform entry matching the target ID
      const idMatch = lines[i].match(/^\s+-\s+id:\s+(PLT-\S+)/);
      if (idMatch && idMatch[1] === platformId) {
        // Skip this platform block (indented lines following the id line)
        i++;
        while (i < lines.length && lines[i].match(/^\s{4}\S/)) { i++; }
        continue;
      }
      result.push(lines[i]);
      i++;
    }

    // If all platforms were removed, ensure "platforms:" has empty array
    const content = result.join('\n');
    const hasPlatformEntry = content.match(/^\s+-\s+id:\s+PLT-/m);
    const final = !hasPlatformEntry
      ? content.replace(/^platforms:\s*$/m, 'platforms: []')
      : content;

    fs.writeFileSync(meshYaml, final, 'utf8');
  }

}
