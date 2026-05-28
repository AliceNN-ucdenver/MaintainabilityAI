import * as fs from 'fs';
import * as path from 'path';
import { configService } from './ConfigService';
import { getMeshSha as getMeshShaImpl } from '../core/mesh-sha';
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
import { OKRService } from './OKRService';
import type { OkrCard, OkrCreateInput } from '../types/okr';

/**
 * Workshop repo names declared on each IMDB-Lite BAR (design doc §8.1).
 * Repos are **declared, not connected** — the GitHub repos may not
 * exist when the mesh is scaffolded. Looking Glass shows "Declared —
 * Not Connected" until a real repo is wired up (Phase A-PR4 ships the
 * Connect Repo flow on the BAR detail page).
 */
const WORKSHOP_REPOS_LITE = ['imdb-react-frontend', 'imdb-identity', 'movie-api'] as const;
const WORKSHOP_REPOS_CELEBS = ['celeb-api'] as const;
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
import { MESH_WORKFLOWS, DEPRECATED_MESH_FILES } from '../templates/codeRepoTemplates';

export { MeshReader } from '../core/mesh-reader';

// D-PR4 sub-PR 6 — design-fan-out.yaml I/O lives in a standalone
// module so vitest can exercise the round-trip without dragging in
// the VS Code runtime (MeshService -> ConfigService -> `vscode`).
import {
  readDesignFanOut as readDesignFanOutFile,
  writeDesignFanOut as writeDesignFanOutFile,
} from './coordination/designFanOutFile';

export class MeshService {
  private barService: BarService;
  private scorer: GovernanceScorer;
  private okrService: OKRService;

  constructor() {
    this.scorer = new GovernanceScorer();
    this.barService = new BarService(this.scorer);
    // OKRService gets a BarScoreSource backed by this MeshService so
    // tierFor() returns real scores derived from the affected BARs'
    // pillar composites (see design doc §6.2 — Restricted wins).
    this.okrService = new OKRService({
      compositeScoreFor: (meshPath: string, barId: string) => {
        const bar = this.findBarById(meshPath, barId);
        return bar?.compositeScore ?? null;
      },
    });
  }

  /**
   * Look up a BAR by its id (e.g. APP-IMDB-002) across all platforms in
   * the mesh. Returns null if no BAR matches. Used by OKRService.tierFor
   * (via the BarScoreSource adapter above) and by the OKR detail view's
   * "Affected BARs" section to render tier badges + scores.
   *
   * The implementation lists all BARs and finds by id — a linear scan.
   * For meshes with hundreds of BARs we'd want an index; today's scale
   * (single-digit-to-low-double-digit BARs per mesh) makes that
   * premature.
   */
  findBarById(meshPath: string, barId: string): BarSummary | null {
    const reader = this.createReader(meshPath);
    const bars = reader.listBars();
    return bars.find(b => b.id === barId) ?? null;
  }

  /**
   * Returns the wired OKRService instance. Exposed so panels (e.g.
   * LookingGlassPanel) can read/list OKRs without instantiating their
   * own service (which would skip the BarScoreSource wiring).
   */
  getOkrService(): OKRService {
    return this.okrService;
  }

  /** Create a MeshReader for the given path (VS Code-free). */
  createReader(meshPath: string): MeshReader {
    const scoringConfig = this.readScoringConfig(meshPath);
    return new MeshReader(meshPath, scoringConfig);
  }

  // ==========================================================================
  // D-PR4 sub-PR 6 — design-fan-out.yaml read/write (thin delegates).
  //
  // Implementation lives in `coordination/designFanOutFile.ts` so
  // vitest can exercise the round-trip without dragging in VS Code
  // (MeshService -> ConfigService -> `vscode`). The commit + push
  // (under MeshBranchGuard) lives in LookingGlassPanel.onFanOut.
  // ==========================================================================

  writeDesignFanOut(meshPath: string, doc: import('./coordination/types').DesignFanOutDoc): void {
    writeDesignFanOutFile(meshPath, doc);
  }

  readDesignFanOut(meshPath: string, okrId: string): import('./coordination/types').DesignFanOutDoc | null {
    return readDesignFanOutFile(meshPath, okrId);
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

  /**
   * Return the current git SHA of the mesh repo (HEAD). Null when the mesh
   * directory isn't a git repo, git isn't installed, or the call fails.
   *
   * Used by the Research + PRD agents' audit log to pin every artifact to a
   * specific mesh commit — so an auditor can later check out the exact mesh
   * state the agent read. Canonical impl lives in core/mesh-sha.ts so it can
   * be reused from vscode-free code paths and tested without mocking vscode.
   */
  static getMeshSha(meshPath: string): string | null {
    return getMeshShaImpl(meshPath);
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
  /**
   * Scaffold the IMDB-Lite sample platform with two BARs (Lite + Celebs).
   *
   * In Phase A-PR2 (and beyond), each BAR's `app.yaml.repos[]` is seeded
   * with the four workshop repo names per design doc §8.1. These repos
   * are **declared, not connected** — the GitHub repos may not exist
   * yet. Users replace `<org>` with their actual GitHub org by editing
   * each app.yaml, or by passing `opts.githubOrg` here (Looking Glass
   * passes the configured org when scaffolding from the UI).
   *
   * The asymmetric CALM density between the two BARs is preserved (see
   * §8: imdb-lite-application has 8 nodes + NIST controls; imdb-celebs
   * has 6 nodes + no controls). That asymmetry is the workshop's
   * Restricted-tier-gate teaching moment; do NOT auto-enrich Celebs
   * at scaffold time.
   */
  scaffoldImdbLitePlatform(
    meshPath: string,
    opts: { githubOrg?: string } = {},
  ): { platformCount: number; barCount: number } {
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

    // Workshop repo names per design doc §8.1. `<org>` is a literal
    // placeholder if no org is supplied — users find/replace post-scaffold,
    // or Looking Glass passes the configured org via opts.githubOrg.
    const org = opts.githubOrg ?? '<org>';
    const liteRepos = WORKSHOP_REPOS_LITE.map(r => `https://github.com/${org}/${r}`);
    const celebsRepos = WORKSHOP_REPOS_CELEBS.map(r => `https://github.com/${org}/${r}`);

    // BAR 1: IMDB Lite Application (movie catalog, reviews, ratings)
    this.barService.scaffoldImdbLiteSampleBar(
      barsDir, 'IMDB Lite Application', 'APP-IMDB-001', portfolioId, platformId, 'medium',
      liteRepos,
    );

    // BAR 2: IMDB Celebs (celebrity news & profiles, linked to IMDB Lite)
    this.barService.scaffoldImdbCelebsSampleBar(
      barsDir, 'IMDB Celebs', 'APP-IMDB-002', portfolioId, platformId, 'medium',
      celebsRepos,
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

  /**
   * Seed the Celebs-anchored sample OKR alongside the IMDB-Lite platform.
   * See design doc §8.1 for the rationale (Celebs is Restricted tier, so
   * an OKR anchored on it lets every learner hit the governance wall in
   * their first hour and feel the "escalate to unlock autonomy" loop).
   *
   * Idempotent: if a celeb-api sample OKR already exists under this mesh
   * (any quarter, any serial), returns the existing card unchanged. Avoids
   * accumulating OKR-2026Q1-IMDB-001-celeb-api / OKR-2026Q1-IMDB-002-celeb-api
   * dupes each time a user re-clicks Scaffold IMDB-Lite.
   *
   * Doesn't validate that the platform exists — `objectiveAlignment.platformId`
   * can point at not-yet-scaffolded BARs and still be a valid seed (callers
   * usually scaffoldImdbLitePlatform first, but it's not enforced).
   */
  scaffoldImdbLiteOkr(
    meshPath: string,
    opts: { owner?: string; githubOrg?: string } = {},
  ): OkrCard | null {
    // Idempotent: any existing sample wins. Pattern: OKR-<quarter>-IMDB-<NNN>-celeb-api
    const existing = this.okrService.readAll(meshPath)
      .find(s => /^OKR-\d{4}Q[1-4]-IMDB-\d+-celeb-api$/.test(s.id));
    if (existing) {
      const card = this.okrService.read(meshPath, existing.id);
      if (!card) { return null; }
      // Self-heal: if the existing OKR carries the <org> placeholder in
      // its targetCodeRepos AND the BARs now declare real URLs, refresh
      // the OKR in place. Catches "user re-scaffolded the platform with
      // a real org but the existing OKR still has the placeholder URLs"
      // — the common case after detectMeshOwner started supplying a real
      // org to the platform scaffold. Preserves any other user edits
      // (objective text, KRs, intent cascade) since we only patch
      // targetCodeRepos.
      const hasStaleUrls = card.objectiveAlignment.targetCodeRepos
        .some(u => u.includes('<org>'));
      if (!hasStaleUrls) { return card; }
      const refreshed = this.collectCelebSampleTargetRepos(meshPath, opts.githubOrg ?? '<org>');
      const stillStale = refreshed.some(u => u.includes('<org>'));
      if (stillStale) { return card; }  // BARs also stale — nothing to refresh from
      return this.okrService.update(meshPath, existing.id, {
        objectiveAlignment: { targetCodeRepos: refreshed },
      });
    }
    const owner = opts.owner ?? 'maintainabilityai';
    const org = opts.githubOrg ?? '<org>';

    const draft: OkrCreateInput = {
      idSuffix: 'celeb-api',
      quarter: undefined,  // OKRService.create defaults to currentQuarter()
      owner,
      objective: {
        name: 'Add celebrity profile API to IMDB-Lite',
        description: [
          'Enable IMDB-Lite to surface enriched celebrity profile data',
          'without introducing identity-disambiguation or licensing risk.',
        ].join(' '),
        notes: 'Aligned with platform growth goals.',
      },
      keyResults: [
        {
          id: 'KR-1',
          metric: 'Identity-disambiguation false-merge rate',
          target: '< 0.5%',
          measurement: 'Production telemetry, post-launch week 2',
        },
        {
          id: 'KR-2',
          metric: 'Licensing-compliance audit pass rate',
          target: '100%',
          measurement: 'Legal review checklist at GA',
        },
        {
          id: 'KR-3',
          metric: 'p95 celebrity-profile fetch latency',
          target: '< 200ms',
          measurement: 'Synthetic monitoring, 28-day rolling',
        },
      ],
      objectiveAlignment: {
        platformId: 'PLT-IMDB',
        // Celebs FIRST — it's the Restricted-tier BAR and drives the gate.
        affectedBarIds: ['APP-IMDB-002', 'APP-IMDB-001'],
        // Source target repos directly from the affected BARs' app.yaml
        // repos[] — guarantees the OKR sample uses the EXACT same URL
        // format the BARs declare (no second construction site to drift).
        // Falls back to placeholder URLs only if the BARs haven't been
        // scaffolded yet (uncommon — Looking Glass calls
        // scaffoldImdbLitePlatform first).
        targetCodeRepos: this.collectCelebSampleTargetRepos(meshPath, org),
        intentCascade: {
          org: 'Grow IMDB monthly active users 15% YoY by enriching profile depth',
          role: 'Engineering Lead — maintain p95 < 250ms across platform endpoints; keep new APIs behind feature flags during ramp',
          developer: 'Ship the celeb-api endpoint with identity disambiguation; mount under /api/celebs/* in the React frontend',
          user: 'Browse celebrity filmographies and bios without flicker on mobile',
        },
      },
      governance: {
        // Effective gate is derived from BAR tier — Restricted on APP-IMDB-002
        // wins. These overrides are informational defaults; users may relax
        // (audit-logged) post-scaffold.
        scoreThreshold: 75,
        maxAutoRounds: 0,
        maxSeverity: 'MEDIUM',
      },
    };

    return this.okrService.create(meshPath, draft);
  }

  /**
   * Curated subset of BAR repos the celebrity-features sample OKR targets.
   * Returns URLs taken VERBATIM from the affected BARs' app.yaml repos[]
   * — same construction site, same format. Falls back to constructed
   * placeholder URLs only if no BAR repos exist yet (the platform hasn't
   * been scaffolded; rare since Looking Glass scaffolds platform first).
   *
   * The curated subset (celeb-api + imdb-react-frontend) teaches the
   * "targetCodeRepos is the subset of BAR repos this feature actually
   * touches" lesson — APP-IMDB-001's imdb-identity / movie-api repos
   * aren't touched by the celebrity-features OKR.
   */
  private collectCelebSampleTargetRepos(meshPath: string, fallbackOrg: string): string[] {
    const celebs = this.findBarById(meshPath, 'APP-IMDB-002');
    const app = this.findBarById(meshPath, 'APP-IMDB-001');
    const allBarRepos = [...(celebs?.repos ?? []), ...(app?.repos ?? [])];
    const TARGET_NAMES = ['celeb-api', 'imdb-react-frontend'];
    const matched: string[] = [];
    for (const name of TARGET_NAMES) {
      const found = allBarRepos.find(url => {
        // basename match — handles both `https://github.com/<org>/<repo>`
        // and the legacy `<org>/<repo>` short form just in case.
        const base = url.split('/').filter(Boolean).pop();
        return base === name;
      });
      // Fall back to constructed full-URL placeholder if BARs aren't on disk.
      matched.push(found ?? `https://github.com/${fallbackOrg}/${name}`);
    }
    return matched;
  }

  // ==========================================================================
  // Mesh workflow provisioning (Oraculum + Research/PRD agents)
  // ==========================================================================

  /**
   * Write every Looking Glass-owned GitHub Action workflow into the mesh
   * directory's `.github/workflows/`. Always overwrites — these are
   * extension-managed and should track the bundled version exactly.
   *
   * Prompt packs are seeded separately via promptPackService.seedMeshPrompts().
   *
   * Returns the relative paths of the files written, for commit messages and
   * progress reporting.
   */
  writeMeshWorkflows(meshPath: string, extensionPath: string): string[] {
    // Per-spec mkdir so we handle both `.github/workflows/*.yml` and
    // `.github/actions/<name>/action.yml` (composite actions need a
    // per-action subdirectory). Previously this only created
    // `.github/workflows/`, which silently dropped composite actions.
    const written: string[] = [];
    for (const spec of MESH_WORKFLOWS) {
      const content = spec.generate(extensionPath);
      if (!content) { continue; }
      const destPath = path.join(meshPath, spec.relativePath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, content, 'utf8');
      written.push(spec.relativePath);
    }
    return written;
  }

  /**
   * Delete superseded workflow/action files from the mesh repo. Used after
   * `writeMeshWorkflows` so the Redeploy click leaves the .github/ tree
   * clean as the per-agent consolidation rolls out incrementally.
   *
   * Returns the list of files actually deleted (paths that didn't exist
   * are silently skipped). Caller commits + pushes — this function only
   * touches the working tree.
   */
  pruneDeprecatedWorkflows(meshPath: string): string[] {
    const removed: string[] = [];
    for (const relativePath of DEPRECATED_MESH_FILES) {
      const fullPath = path.join(meshPath, relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        removed.push(relativePath);
      }
    }
    return removed;
  }

  /**
   * Returns true when every Looking Glass-owned workflow file exists in the
   * mesh repo. Used by the Settings UI to decide between "Deploy" and
   * "Redeploy" labels.
   */
  hasAllMeshWorkflows(meshPath: string): boolean {
    return MESH_WORKFLOWS.every(spec => fs.existsSync(path.join(meshPath, spec.relativePath)));
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
