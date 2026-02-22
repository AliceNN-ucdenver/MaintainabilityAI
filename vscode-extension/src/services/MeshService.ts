import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
  Criticality,
  RecommendedPlatform,
  PolicyFile,
  NistControl,
} from '../types';
import { GovernanceScorer } from './GovernanceScorer';
import { BarService } from './BarService';
import { CapabilityModelService } from './CapabilityModelService';
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
} from '../templates/meshTemplates';

export class MeshService {
  private barService: BarService;
  private scorer: GovernanceScorer;

  constructor() {
    this.scorer = new GovernanceScorer();
    this.barService = new BarService(this.scorer);
  }

  // ==========================================================================
  // Path resolution
  // ==========================================================================

  static getMeshPath(): string | null {
    const config = vscode.workspace.getConfiguration('maintainabilityai');
    const meshPath = config.get<string>('mesh.path', '');
    if (!meshPath || !fs.existsSync(meshPath)) { return null; }
    return meshPath;
  }

  static async setMeshPath(meshPath: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('maintainabilityai');
    await config.update('mesh.path', meshPath, vscode.ConfigurationTarget.Global);
  }

  // ==========================================================================
  // Read operations
  // ==========================================================================

  readPortfolioConfig(meshPath: string): PortfolioConfig | null {
    const yamlPath = path.join(meshPath, 'mesh.yaml');
    if (!fs.existsSync(yamlPath)) { return null; }

    try {
      const content = fs.readFileSync(yamlPath, 'utf8');
      return this.parsePortfolioConfig(content);
    } catch {
      return null;
    }
  }

  static readonly DEFAULT_DRIFT_WEIGHTS: DriftWeights = { critical: 15, high: 5, medium: 2, low: 1 };

  readScoringConfig(meshPath: string): MeshScoringConfig {
    const yamlPath = path.join(meshPath, 'mesh.yaml');
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
      // Parse drift weights if present
      const dwMatch = content.match(/drift_weights:\s*\n((?:\s+\w+:\s*\d+\s*\n?)*)/);
      if (dwMatch) {
        const block = dwMatch[1];
        const crit = block.match(/critical:\s*(\d+)/);
        const high = block.match(/high:\s*(\d+)/);
        const med = block.match(/medium:\s*(\d+)/);
        const low = block.match(/low:\s*(\d+)/);
        config.driftWeights = {
          critical: crit ? parseInt(crit[1], 10) : MeshService.DEFAULT_DRIFT_WEIGHTS.critical,
          high: high ? parseInt(high[1], 10) : MeshService.DEFAULT_DRIFT_WEIGHTS.high,
          medium: med ? parseInt(med[1], 10) : MeshService.DEFAULT_DRIFT_WEIGHTS.medium,
          low: low ? parseInt(low[1], 10) : MeshService.DEFAULT_DRIFT_WEIGHTS.low,
        };
      }
      return config;
    } catch {
      return defaults;
    }
  }

  readDriftWeights(meshPath: string): DriftWeights {
    const config = this.readScoringConfig(meshPath);
    return config.driftWeights || MeshService.DEFAULT_DRIFT_WEIGHTS;
  }

  saveDriftWeights(meshPath: string, weights: DriftWeights): void {
    const meshYaml = path.join(meshPath, 'mesh.yaml');
    if (!fs.existsSync(meshYaml)) { return; }
    let content = fs.readFileSync(meshYaml, 'utf8');
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
    const platformsDir = path.join(meshPath, 'platforms');
    if (!fs.existsSync(platformsDir)) { return []; }

    const platforms: PlatformConfig[] = [];
    const entries = fs.readdirSync(platformsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
      const platformYaml = path.join(platformsDir, entry.name, 'platform.yaml');
      if (!fs.existsSync(platformYaml)) { continue; }

      try {
        const content = fs.readFileSync(platformYaml, 'utf8');
        platforms.push(this.parsePlatformConfig(content));
      } catch { /* skip unparseable */ }
    }

    return platforms;
  }

  /**
   * Build a complete portfolio summary by scanning all platforms and BARs.
   */
  buildPortfolioSummary(meshPath: string): PortfolioSummary | null {
    const portfolio = this.readPortfolioConfig(meshPath);
    if (!portfolio) { return null; }

    // Apply scoring config
    const scoringConfig = this.readScoringConfig(meshPath);
    this.scorer = new GovernanceScorer(scoringConfig);
    this.barService = new BarService(this.scorer);

    const platforms = this.listPlatforms(meshPath);
    const platformSummaries: PlatformSummary[] = [];
    const allBars: BarSummary[] = [];

    for (const platform of platforms) {
      const platformSlug = this.findPlatformSlug(meshPath, platform.id);
      if (!platformSlug) { continue; }

      const barsDir = path.join(meshPath, 'platforms', platformSlug, 'bars');
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

    // Build capability model summary if model file exists
    const capModelService = new CapabilityModelService();
    const capabilityModel = capModelService.buildCapabilityModelSummary(meshPath, allBars);

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

    // Write .gitkeep files for empty dirs
    for (const dir of ['platforms', 'reports']) {
      const gitkeep = path.join(targetPath, dir, '.gitkeep');
      if (!fs.existsSync(gitkeep)) {
        fs.writeFileSync(gitkeep, '', 'utf8');
      }
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
          if (fs.existsSync(appYamlPath)) {
            let content = fs.readFileSync(appYamlPath, 'utf8');
            if (content.includes('repos: []') && repoUrls.length > 0) {
              const reposList = repoUrls.map(u => `    - "${u}"`).join('\n');
              content = content.replace('repos: []', `repos:\n${reposList}`);
              fs.writeFileSync(appYamlPath, content, 'utf8');
            }
          }

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

    this.barService.scaffoldImdbLiteSampleBar(
      barsDir, 'IMDB Lite Application', 'APP-IMDB-001', portfolioId, platformId, 'medium'
    );

    return { platformCount: 1, barCount: 1 };
  }

  // ==========================================================================
  // Oraculum (architecture review) provisioning
  // ==========================================================================

  /**
   * Write the Oraculum GitHub Action workflow, prompt pack registry,
   * and all domain prompt packs into the mesh directory.
   * Called during initMesh when createRepo=true and on workflow redeploy.
   */
  writeOraculumWorkflow(meshPath: string, extensionPath: string): void {
    const { generateOraculumWorkflow, generateOraculumDefaultPrompt, generateOraculumPromptPack, generateOraculumRegistry } = require('../templates/scaffoldTemplates');

    // Write GitHub Actions workflow
    const workflowDir = path.join(meshPath, '.github', 'workflows');
    fs.mkdirSync(workflowDir, { recursive: true });
    const workflowContent = generateOraculumWorkflow(extensionPath);
    if (workflowContent) {
      fs.writeFileSync(path.join(workflowDir, 'oraculum-review.yml'), workflowContent, 'utf8');
    }

    // Write prompt pack registry + all domain packs
    const promptsDir = path.join(meshPath, '.caterpillar', 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });

    // Registry
    const registryContent = generateOraculumRegistry(extensionPath);
    if (registryContent) {
      fs.writeFileSync(path.join(promptsDir, 'registry.yaml'), registryContent, 'utf8');
    }

    // Default prompt pack
    const defaultContent = generateOraculumDefaultPrompt(extensionPath);
    if (defaultContent) {
      fs.writeFileSync(path.join(promptsDir, 'default.md'), defaultContent, 'utf8');
    }

    // Domain prompt packs
    const domainPacks = ['architecture', 'information-risk', 'operations', 'application-security'];
    for (const packId of domainPacks) {
      const content = generateOraculumPromptPack(extensionPath, packId);
      if (content) {
        fs.writeFileSync(path.join(promptsDir, `${packId}.md`), content, 'utf8');
      }
    }

    // Write GitHub issue template (only if not already present — preserves user edits)
    const templateDir = path.join(meshPath, '.github', 'ISSUE_TEMPLATE');
    const templatePath = path.join(templateDir, 'oraculum-review.yml');
    if (!fs.existsSync(templatePath)) {
      fs.mkdirSync(templateDir, { recursive: true });
      fs.writeFileSync(templatePath, `name: Oraculum Architecture Review
description: Request an AI-powered architecture review for a BAR
title: "Architecture Review: [APP_NAME]"
labels: ["oraculum-review"]
body:
  - type: textarea
    id: config
    attributes:
      label: Review Configuration
      description: Oraculum YAML configuration block
      render: yaml
      value: |
        bar_path: platforms/<platform>/<bar>
        prompt_packs:
          - default
        scope:
          - architecture
          - security
          - risk
          - operations
        repos:
          - https://github.com/org/repo
    validations:
      required: true
  - type: textarea
    id: context
    attributes:
      label: Additional Context
      description: Any additional context for the review
`, 'utf8');
    }
  }

  // ==========================================================================
  // Policy operations
  // ==========================================================================

  readPolicies(meshPath: string): PolicyFile[] {
    const policiesDir = path.join(meshPath, 'policies');
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

  readNistControls(meshPath: string): NistControl[] {
    const nistPath = path.join(meshPath, 'policies', 'nist-800-53-controls.yaml');
    if (!fs.existsSync(nistPath)) { return []; }

    try {
      const content = fs.readFileSync(nistPath, 'utf8');
      return this.parseNistControls(content);
    } catch {
      return [];
    }
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

  private parseNistControls(content: string): NistControl[] {
    const controls: NistControl[] = [];
    let currentFamilyId = '';
    let currentFamilyName = '';

    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Match family list item: "  - id: AC" (exactly 2-space indent)
      const familyIdMatch = line.match(/^\s{2}-\s+id:\s*(\S+)/);
      if (familyIdMatch) {
        currentFamilyId = familyIdMatch[1];
        i++;
        continue;
      }

      // Match family name (indented under family): "    name: Access Control"
      const familyNameMatch = line.match(/^\s{4}name:\s*(.+)/);
      if (familyNameMatch) {
        currentFamilyName = familyNameMatch[1].trim();
        i++;
        continue;
      }

      // Match control list item: "      - id: AC-1"
      const controlIdMatch = line.match(/^\s{6}-\s+id:\s*(\S+)/);
      if (controlIdMatch) {
        const id = controlIdMatch[1];
        let name = '';
        let description = '';
        let priority: 'high' | 'medium' | 'low' = 'medium';

        // Read subsequent indented lines (8+ spaces for control fields)
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

        controls.push({
          id,
          name,
          family: currentFamilyName,
          familyId: currentFamilyId,
          description,
          priority,
        });
        continue;
      }

      i++;
    }

    return controls;
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
    if (!fs.existsSync(meshYaml)) { return; }

    const lines = fs.readFileSync(meshYaml, 'utf8').split('\n');
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

  private parsePortfolioConfig(content: string): PortfolioConfig {
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

    return {
      id: get('id'),
      name: get('name'),
      org: get('org'),
      owner: get('owner'),
      description: get('description'),
      architectureDsl,
      capabilityModel,
    };
  }

  private parsePlatformConfig(content: string): PlatformConfig {
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
}
