import * as fs from 'fs';
import * as path from 'path';
import type {
  PackDomain, PackCategory,
  PromptPackInfo, PromptPackContent, PromptMappings, PromptPackSelection,
  IssueCreationRequest, RctroPrompt, ReviewScope,
} from '../types';
import { configService } from './ConfigService';
import { logger } from '../utils/Logger';

// ============================================================================
// Constants
// ============================================================================

const RABBIT_HOLE_CATEGORIES: Record<string, PackCategory> = {
  'owasp': 'owasp',
  'maintainability': 'maintainability',
  'threat-modeling': 'threat-modeling',
};

const BODY_SAFE_LIMIT = 60_000;       // GitHub's 65,536 limit minus headroom
const MAX_PACK_CONTENT_CHARS = 8_000;  // per-pack content cap

// ============================================================================
// Oraculum Issue Params (new type — not in types/ since only this service uses it)
// ============================================================================

export interface OraculumIssueParams {
  appName: string;
  barPath: string;
  scope: ReviewScope;
  additionalContext?: string;
}

// ============================================================================
// PromptPackService — Unified pack management for both domains
// ============================================================================

export class PromptPackService {
  private packsDir = '';                                  // <extensionPath>/prompt-packs/
  private meshPath: string | null = null;                 // set when Looking Glass opens a mesh
  private codeRepoRoot: string | null = null;             // set when a code repo workspace is open
  private templateCache = new Map<string, string>();
  private packCache = new Map<string, string>();
  private mappings: PromptMappings | null = null;
  private rabbitHolePacksCache: PromptPackInfo[] | null = null;

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /** Call once from activate() with the extension path. */
  initialize(extensionPath: string): void {
    this.packsDir = path.join(extensionPath, 'prompt-packs');
    this.mappings = null;
    this.packCache.clear();
    this.templateCache.clear();
    this.rabbitHolePacksCache = null;
  }

  /** Called when Looking Glass opens/closes a mesh. */
  setMeshPath(meshPath: string | null): void {
    this.meshPath = meshPath;
  }

  /** Called when a code repo workspace opens/closes. */
  setCodeRepoRoot(root: string | null): void {
    this.codeRepoRoot = root;
  }

  // ==========================================================================
  // Pack Discovery — Rabbit Hole (code repos)
  // ==========================================================================

  /**
   * Get all rabbit-hole packs (owasp, maintainability, threat-modeling).
   * Backward-compatible: no-arg call returns rabbit-hole packs.
   */
  getAllPacks(domain?: PackDomain): PromptPackInfo[] {
    if (domain === 'looking-glass') {
      return this.getLookingGlassPacks();
    }
    return this.getRabbitHolePacks();
  }

  private getRabbitHolePacks(): PromptPackInfo[] {
    if (this.rabbitHolePacksCache) { return this.rabbitHolePacksCache; }
    if (!this.packsDir) {
      logger.warn('PromptPackService.getAllPacks() called before initialize()');
      return [];
    }

    const packs: PromptPackInfo[] = [];
    for (const [category, dir] of Object.entries(RABBIT_HOLE_CATEGORIES)) {
      const catDir = path.join(this.packsDir, 'rabbit-hole', dir);
      if (!fs.existsSync(catDir)) { continue; }
      const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        packs.push({
          id: file.replace('.md', ''),
          category: category as PackCategory,
          name: this.formatName(file, category as PackCategory),
          filename: file,
          packDomain: 'rabbit-hole',
        });
      }
    }

    this.rabbitHolePacksCache = packs;
    return packs;
  }

  getPacksByCategory(category: PackCategory): PromptPackInfo[] {
    return this.getAllPacks().filter(p => p.category === category);
  }

  // ==========================================================================
  // Pack Discovery — Looking Glass (governance mesh)
  // ==========================================================================

  /**
   * Get looking-glass packs from the mesh's .caterpillar/prompts/.
   * Uses registry.yaml for ordering when available; falls back to file scan.
   */
  private getLookingGlassPacks(): PromptPackInfo[] {
    if (!this.meshPath) {
      return [this.defaultLookingGlassPack(false)];
    }

    const promptsDir = path.join(this.meshPath, '.caterpillar', 'prompts');
    if (!fs.existsSync(promptsDir)) {
      return [this.defaultLookingGlassPack(false)];
    }

    // Try registry.yaml first
    const registryPath = path.join(promptsDir, 'registry.yaml');
    if (fs.existsSync(registryPath)) {
      const packs = this.loadFromRegistry(registryPath, promptsDir);
      if (packs.length > 0) {
        const registeredIds = new Set(packs.map(p => p.id));
        const customPacks = this.discoverCustomPacks(promptsDir, registeredIds);
        return [...packs, ...customPacks];
      }
    }

    // Fallback: scan .md files directly
    return this.loadFromFiles(promptsDir);
  }

  private defaultLookingGlassPack(available: boolean): PromptPackInfo {
    return {
      id: 'default',
      name: 'Default',
      filename: 'default.md',
      packDomain: 'looking-glass',
      category: 'governance',
      description: '4-pillar architecture governance review',
      required: true,
      available,
    };
  }

  // ==========================================================================
  // Pack Content Loading
  // ==========================================================================

  /** Load content for a rabbit-hole pack by id. */
  getPackContent(packId: string): string | null {
    if (this.packCache.has(packId)) {
      return this.packCache.get(packId)!;
    }

    for (const dir of Object.values(RABBIT_HOLE_CATEGORIES)) {
      const filePath = path.join(this.packsDir, 'rabbit-hole', dir, `${packId}.md`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.packCache.set(packId, content);
        return content;
      }
    }

    return null;
  }

  getSelectedPackContents(selection: PromptPackSelection): PromptPackContent[] {
    const contents: PromptPackContent[] = [];

    for (const id of selection.owasp) {
      const content = this.getPackContent(id);
      if (content) {
        contents.push({ id, category: 'owasp', name: this.formatName(`${id}.md`, 'owasp'), filename: `${id}.md`, content });
      }
    }

    for (const id of selection.maintainability) {
      const content = this.getPackContent(id);
      if (content) {
        contents.push({ id, category: 'maintainability', name: this.formatName(`${id}.md`, 'maintainability'), filename: `${id}.md`, content });
      }
    }

    for (const id of selection.threatModeling) {
      const content = this.getPackContent(id);
      if (content) {
        contents.push({ id, category: 'threat-modeling', name: this.formatName(`${id}.md`, 'threat-modeling'), filename: `${id}.md`, content });
      }
    }

    return contents;
  }

  getRelatedPacks(selection: PromptPackSelection): PromptPackSelection {
    const mappings = this.getMappingsInternal();
    const related: PromptPackSelection = {
      owasp: [...selection.owasp],
      maintainability: [...selection.maintainability],
      threatModeling: [...selection.threatModeling],
    };

    for (const owaspId of selection.owasp) {
      const category = mappings.owasp_categories[owaspId];
      if (!category) { continue; }

      for (const threat of category.threat_model) {
        if (!related.threatModeling.includes(threat)) {
          related.threatModeling.push(threat);
        }
      }

      for (const maint of category.maintainability) {
        if (!related.maintainability.includes(maint)) {
          related.maintainability.push(maint);
        }
      }
    }

    return related;
  }

  /** Get the rabbit-hole default.md security-first baseline. */
  getDefaultPackContent(): string {
    const defaultPath = path.join(this.packsDir, 'rabbit-hole', 'default.md');
    if (fs.existsSync(defaultPath)) {
      return fs.readFileSync(defaultPath, 'utf8');
    }
    return '';
  }

  /** Get the rabbit-hole scaffold.md content (for BAR component scaffold). */
  getScaffoldPackContent(): string {
    const scaffoldPath = path.join(this.packsDir, 'rabbit-hole', 'scaffold.md');
    if (fs.existsSync(scaffoldPath)) {
      return fs.readFileSync(scaffoldPath, 'utf8');
    }
    return '';
  }

  getMappings(): PromptMappings {
    return this.getMappingsInternal();
  }

  // ==========================================================================
  // Override Resolution
  // ==========================================================================

  /**
   * Load pack content with override resolution: local repo → bundled fallback.
   * Looking Glass: <meshPath>/.caterpillar/prompts/<packId>.md
   * Rabbit Hole:   <codeRepoRoot>/.cheshire/prompts/<category>/<packId>.md
   */
  getEffectivePack(domain: PackDomain, packId: string): { content: string; source: 'local' | 'bundled' } | null {
    // Check local override first
    const localPath = this.getLocalPackPath(domain, packId);
    if (localPath && fs.existsSync(localPath)) {
      try {
        return { content: fs.readFileSync(localPath, 'utf8'), source: 'local' };
      } catch { /* fall through */ }
    }

    // Bundled fallback
    const bundledPath = this.getBundledPackPath(domain, packId);
    if (bundledPath && fs.existsSync(bundledPath)) {
      try {
        return { content: fs.readFileSync(bundledPath, 'utf8'), source: 'bundled' };
      } catch { /* fall through */ }
    }

    return null;
  }

  getEffectivePacks(domain: PackDomain, packIds: string[]): { name: string; content: string; source: 'local' | 'bundled' }[] {
    const results: { name: string; content: string; source: 'local' | 'bundled' }[] = [];
    for (const id of packIds) {
      const pack = this.getEffectivePack(domain, id);
      if (pack) {
        const titleMatch = pack.content.match(/^#\s+(.+)$/m);
        const name = titleMatch ? titleMatch[1].replace(/\s*—.*/, '') : id;
        results.push({ name, content: pack.content, source: pack.source });
      }
    }
    return results;
  }

  private getLocalPackPath(domain: PackDomain, packId: string): string | null {
    if (domain === 'looking-glass') {
      if (!this.meshPath) { return null; }
      return path.join(this.meshPath, '.caterpillar', 'prompts', `${packId}.md`);
    }
    // rabbit-hole: need to find the category
    if (!this.codeRepoRoot) { return null; }
    const pack = this.findRabbitHolePack(packId);
    if (pack?.category) {
      return path.join(this.codeRepoRoot, '.cheshire', 'prompts', pack.category, `${packId}.md`);
    }
    return path.join(this.codeRepoRoot, '.cheshire', 'prompts', `${packId}.md`);
  }

  private getBundledPackPath(domain: PackDomain, packId: string): string | null {
    if (domain === 'looking-glass') {
      return path.join(this.packsDir, 'looking-glass', `${packId}.md`);
    }
    // rabbit-hole: search category dirs
    for (const dir of Object.values(RABBIT_HOLE_CATEGORIES)) {
      const filePath = path.join(this.packsDir, 'rabbit-hole', dir, `${packId}.md`);
      if (fs.existsSync(filePath)) { return filePath; }
    }
    // top-level rabbit-hole files (default.md, scaffold.md)
    const topLevel = path.join(this.packsDir, 'rabbit-hole', `${packId}.md`);
    if (fs.existsSync(topLevel)) { return topLevel; }
    return null;
  }

  private findRabbitHolePack(packId: string): PromptPackInfo | null {
    return this.getRabbitHolePacks().find(p => p.id === packId) || null;
  }

  // ==========================================================================
  // Issue Body Builders
  // ==========================================================================

  /** Build a Rabbit Hole issue body from an IssueCreationRequest. */
  buildRabbitHoleIssue(request: IssueCreationRequest): string {
    const { title, rctroPrompt, packContents, labels } = request;
    const timestamp = new Date().toISOString();

    const categoryLabels = labels
      .filter(l => l.startsWith('owasp/') || l.startsWith('maintainability/') || l.startsWith('stride/'))
      .join(', ');

    // Check if .cheshire/prompts/ exists for pack file refs
    const hasLocalPacks = this.codeRepoRoot
      && fs.existsSync(path.join(this.codeRepoRoot, '.cheshire', 'prompts'));

    const template = this.loadTemplate('rabbit-hole-issue');
    const vars: Record<string, string> = {
      TITLE: title,
      TIMESTAMP: timestamp,
      CATEGORIES: categoryLabels || 'General',
      RCTRO_BLOCK: this.renderRctro(rctroPrompt),
      PACK_FILE_REFS: hasLocalPacks ? this.renderPackFileRefs('rabbit-hole', packContents) : '',
      PACK_SECTIONS: this.renderPackSections(packContents),
      METADATA: this.renderMetadata({
        Created: timestamp,
        'Extension Version': 'MaintainabilityAI VS Code Extension v0.1.0',
        Repository: `${request.repo.owner}/${request.repo.repo}`,
        Labels: labels.join(', '),
        'Tech Stack': `${request.techStack.language}, ${request.techStack.runtime}, ${request.techStack.framework}`,
      }),
    };

    let body = this.renderTemplate(template, vars);

    // Truncate if needed
    if (body.length > BODY_SAFE_LIMIT) {
      body = body.slice(0, BODY_SAFE_LIMIT - 200);
      body += '\n\n> **Note:** Prompt pack content was truncated to stay within GitHub\'s 65 KB issue body limit.\n';
    }

    return body;
  }

  /** Build an Oraculum review issue body. */
  buildOraculumIssue(params: OraculumIssueParams): string {
    const { appName, barPath, scope, additionalContext } = params;
    const today = new Date().toISOString().slice(0, 10);
    const packIds = scope.promptPacks ?? (scope.promptPack ? [scope.promptPack] : ['default']);

    // Load pack contents from mesh (override resolution)
    const promptPacks = this.getEffectivePacks('looking-glass', packIds);

    const template = this.loadTemplate('oraculum-issue');
    const contextText = additionalContext || scope.additionalContext
      || 'Standard architecture review across all selected pillars.';

    const vars: Record<string, string> = {
      APP_NAME: appName,
      DATE: today,
      BAR_PATH: barPath,
      PACKS_YAML: packIds.map(p => `  - ${p}`).join('\n'),
      PILLARS_YAML: scope.pillars.map(p => `  - ${p}`).join('\n'),
      REPOS_YAML: scope.includeRepos.map(r => `  - ${r}`).join('\n'),
      CONTEXT_BLOCK: `## Review Context\n${contextText}\n`,
      PACK_FILE_REFS: promptPacks.length > 0
        ? this.renderPackFileRefs('looking-glass', promptPacks.map(p => ({ id: p.name, category: 'governance' as const, name: p.name, filename: '', content: p.content })), packIds)
        : '',
      PACK_SECTIONS: this.renderOraculumPackSections(promptPacks),
      METADATA: this.renderMetadata({
        Created: new Date().toISOString(),
        'Extension Version': 'MaintainabilityAI VS Code Extension v0.1.0',
        'Prompt Packs': packIds.join(', '),
        Pillars: scope.pillars.join(', '),
      }),
    };

    let body = this.renderTemplate(template, vars);

    if (body.length > BODY_SAFE_LIMIT) {
      body = body.slice(0, BODY_SAFE_LIMIT - 200);
      body += '\n\n> **Note:** Prompt pack content was truncated to stay within GitHub\'s 65 KB issue body limit.\n';
    }

    return body;
  }

  /** Generate labels for a Rabbit Hole issue. */
  generateLabels(request: IssueCreationRequest): string[] {
    const labels = [...configService.defaultLabels];

    for (const id of request.selectedPacks.owasp) {
      labels.push(`owasp/${id.toLowerCase()}`);
    }
    for (const id of request.selectedPacks.maintainability) {
      labels.push(`maintainability/${id}`);
    }
    for (const id of request.selectedPacks.threatModeling) {
      labels.push(`stride/${id}`);
    }

    return [...new Set(labels)];
  }

  // ==========================================================================
  // Repo Seeding
  // ==========================================================================

  /**
   * Copy bundled looking-glass packs → mesh .caterpillar/prompts/.
   * Idempotent: skips files that already exist (preserves user customizations).
   */
  seedMeshPrompts(meshPath: string, force = false): void {
    const promptsDir = path.join(meshPath, '.caterpillar', 'prompts');
    fs.mkdirSync(promptsDir, { recursive: true });

    const sourceDir = path.join(this.packsDir, 'looking-glass');
    if (!fs.existsSync(sourceDir)) { return; }

    try {
      const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) { continue; }
        const target = path.join(promptsDir, entry.name);
        if (force || !fs.existsSync(target)) {
          fs.copyFileSync(path.join(sourceDir, entry.name), target);
        }
      }
    } catch (err) {
      logger.warn(`Failed to seed mesh prompts: ${err}`);
    }
  }

  /**
   * Returns all rabbit-hole packs for scaffolding into .cheshire/prompts/.
   * Used by ScaffoldPanel when user selects "Prompt Packs" checkbox.
   */
  getScaffoldFiles(): { relativePath: string; content: string }[] {
    const files: { relativePath: string; content: string }[] = [];
    const rabbitDir = path.join(this.packsDir, 'rabbit-hole');

    // Copy category subdirectories (owasp, maintainability, threat-modeling)
    for (const [, dir] of Object.entries(RABBIT_HOLE_CATEGORIES)) {
      const catDir = path.join(rabbitDir, dir);
      if (!fs.existsSync(catDir)) { continue; }
      try {
        const entries = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
        for (const file of entries) {
          const content = fs.readFileSync(path.join(catDir, file), 'utf8');
          files.push({ relativePath: `.cheshire/prompts/${dir}/${file}`, content });
        }
      } catch { /* ignore */ }
    }

    // Copy top-level files (default.md, mappings.json)
    for (const topFile of ['default.md', 'mappings.json']) {
      const filePath = path.join(rabbitDir, topFile);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          files.push({ relativePath: `.cheshire/prompts/${topFile}`, content });
        } catch { /* ignore */ }
      }
    }

    return files;
  }

  // ==========================================================================
  // Private — Template Engine
  // ==========================================================================

  private loadTemplate(name: string): string {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name)!;
    }
    const filePath = path.join(this.packsDir, 'templates', `${name}.md`);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.templateCache.set(name, content);
      return content;
    } catch {
      logger.warn(`Failed to load template: ${name}`);
      return '';
    }
  }

  private renderTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  }

  // ==========================================================================
  // Private — Render Helpers
  // ==========================================================================

  private renderRctro(rctro: RctroPrompt): string {
    let md = '';
    md += `#### Role\n${rctro.role}\n\n`;
    md += `#### Context\n${rctro.context}\n\n`;
    md += `#### Task\n${rctro.task}\n\n`;
    md += `#### Requirements\n\n`;
    rctro.requirements.forEach((req, i) => {
      md += `${i + 1}. **${req.title}**\n`;
      for (const detail of req.details) {
        md += `   - ${detail}\n`;
      }
      md += `   - Validation: ${req.validation}\n\n`;
    });
    md += `#### Output\n${rctro.output}\n`;
    return md;
  }

  private renderPackFileRefs(
    domain: PackDomain,
    packs: { id: string; category?: string }[],
    packIds?: string[],
  ): string {
    let paths: string[];

    if (domain === 'looking-glass') {
      const ids = packIds ?? packs.map(p => p.id);
      paths = ids.map(id => `.caterpillar/prompts/${id}.md`);
    } else {
      paths = packs.map(p => {
        if (p.category && p.category !== 'default') {
          return `.cheshire/prompts/${p.category}/${p.id}.md`;
        }
        return `.cheshire/prompts/${p.id}.md`;
      });
    }

    const verb = domain === 'looking-glass' ? 'review instructions' : 'implementation guidance';

    return `## Prompt Packs\n\nRead the following prompt pack files for detailed ${verb}:\n`
      + paths.map(p => `- \`${p}\``).join('\n')
      + '\n\nEach pack file is also embedded below for reference.\n';
  }

  /** Render collapsible pack sections for rabbit-hole issues (grouped by category). */
  private renderPackSections(packs: PromptPackContent[]): string {
    const groups = [
      { icon: '\u{1F6E1}\uFE0F', title: 'Security-First Baseline (Always Included)', innerIcon: '\u{1F4CB}', category: 'default' },
      { icon: '\u{1F4D8}', title: 'OWASP Security Guidance', innerIcon: '\u{1F512}', category: 'owasp' },
      { icon: '\u{1F3D7}\uFE0F', title: 'Maintainability Guidance', innerIcon: '\u{1F4D0}', category: 'maintainability' },
      { icon: '\u{1F3AF}', title: 'Threat Model Analysis (STRIDE)', innerIcon: '\u{1F3AD}', category: 'threat-modeling' },
    ];

    let html = '';
    for (const group of groups) {
      const groupPacks = packs.filter(p => p.category === group.category);
      if (groupPacks.length === 0) { continue; }

      html += `<details>\n<summary>${group.icon} <strong>${group.title}</strong> (${groupPacks.length} ${groupPacks.length === 1 ? 'guide' : 'guides'})</summary>\n\n`;

      for (const pack of groupPacks) {
        let content = pack.content;
        if (content.length > MAX_PACK_CONTENT_CHARS) {
          content = content.slice(0, MAX_PACK_CONTENT_CHARS) + '\n\n*... (truncated)*';
        }
        html += `<details>\n<summary>${group.innerIcon} <strong>${pack.name}</strong></summary>\n\n${content}\n\n</details>\n\n`;
      }

      html += '</details>\n\n';
    }
    return html;
  }

  /** Render collapsible pack sections for oraculum issues (flat, each pack is a section). */
  private renderOraculumPackSections(packs: { name: string; content: string }[]): string {
    let html = '';
    for (const pack of packs) {
      let content = pack.content;
      if (content.length > MAX_PACK_CONTENT_CHARS) {
        content = content.slice(0, MAX_PACK_CONTENT_CHARS) + '\n\n*... (truncated)*';
      }
      html += `<details>\n<summary>\u{1F4D8} <strong>Prompt Pack: ${pack.name}</strong></summary>\n\n${content}\n\n</details>\n\n`;
    }
    return html;
  }

  private renderMetadata(vars: Record<string, string>): string {
    const lines = Object.entries(vars).map(([k, v]) => `- **${k}**: ${v}`).join('\n');
    return `<details>\n<summary>\u{1F4CA} Additional Metadata</summary>\n\n${lines}\n\n</details>`;
  }

  // ==========================================================================
  // Private — Mappings
  // ==========================================================================

  private getMappingsInternal(): PromptMappings {
    if (this.mappings) { return this.mappings; }
    this.mappings = this.loadMappings();
    return this.mappings;
  }

  private loadMappings(): PromptMappings {
    const mappingsPath = path.join(this.packsDir, 'rabbit-hole', 'mappings.json');
    try {
      return JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
    } catch {
      return {
        codeql_to_owasp: {},
        owasp_categories: {},
        maintainability_triggers: {},
        severity_mapping: {},
        label_mapping: {},
      };
    }
  }

  private formatName(filename: string, category: PackCategory): string {
    const mappings = this.getMappingsInternal();
    const base = filename.replace('.md', '');

    if (category === 'owasp') {
      const owaspCat = mappings.owasp_categories[base];
      if (owaspCat) { return owaspCat.name; }
      const match = base.match(/A(\d{2})_(.*)/);
      if (match) {
        return `A${match[1]} - ${match[2].split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
      }
    }

    return base
      .split(/[-_]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // ==========================================================================
  // Private — Looking Glass Registry Scanning (absorbed from ReviewService)
  // ==========================================================================

  private loadFromRegistry(registryPath: string, promptsDir: string): PromptPackInfo[] {
    try {
      const content = fs.readFileSync(registryPath, 'utf8');
      const packs: PromptPackInfo[] = [];
      let currentPack: Partial<PromptPackInfo> | null = null;

      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- id:')) {
          if (currentPack?.id) {
            packs.push(this.finalizeLookingGlassPack(currentPack, promptsDir));
          }
          currentPack = { id: trimmed.replace('- id:', '').trim() };
        } else if (currentPack) {
          const kvMatch = trimmed.match(/^(\w+):\s*"?(.+?)"?\s*$/);
          if (kvMatch) {
            const [, key, value] = kvMatch;
            if (key === 'name') { currentPack.name = value; }
            else if (key === 'description') { currentPack.description = value; }
            else if (key === 'required') { currentPack.required = value === 'true'; }
          }
        }
      }
      if (currentPack?.id) {
        packs.push(this.finalizeLookingGlassPack(currentPack, promptsDir));
      }

      return packs;
    } catch {
      return [];
    }
  }

  private finalizeLookingGlassPack(partial: Partial<PromptPackInfo>, promptsDir: string): PromptPackInfo {
    const id = partial.id || 'unknown';
    const mdPath = path.join(promptsDir, `${id}.md`);
    return {
      id,
      name: partial.name || id,
      filename: `${id}.md`,
      packDomain: 'looking-glass',
      category: 'governance',
      description: partial.description || `Prompt pack: ${id}`,
      required: partial.required || false,
      available: fs.existsSync(mdPath),
    };
  }

  private discoverCustomPacks(promptsDir: string, registeredIds: Set<string>): PromptPackInfo[] {
    const customs: PromptPackInfo[] = [];
    try {
      const entries = fs.readdirSync(promptsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) { continue; }
        const id = entry.name.replace('.md', '');
        if (registeredIds.has(id)) { continue; }

        const content = fs.readFileSync(path.join(promptsDir, entry.name), 'utf8');
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const name = titleMatch ? titleMatch[1].replace(/\s*—.*/, '') : id;
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        const description = lines[0]?.trim().slice(0, 100) || `Custom prompt pack: ${id}`;

        customs.push({
          id,
          name,
          filename: `${id}.md`,
          packDomain: 'looking-glass',
          category: 'governance',
          description,
          available: true,
        });
      }
    } catch { /* ignore */ }
    return customs;
  }

  private loadFromFiles(promptsDir: string): PromptPackInfo[] {
    const packs: PromptPackInfo[] = [];
    try {
      const entries = fs.readdirSync(promptsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) { continue; }
        const id = entry.name.replace('.md', '');
        const content = fs.readFileSync(path.join(promptsDir, entry.name), 'utf8');

        const titleMatch = content.match(/^#\s+(.+)$/m);
        const name = titleMatch ? titleMatch[1].replace(/\s*—.*/, '') : id;
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        const description = lines[0]?.trim().slice(0, 100) || `Prompt pack: ${id}`;

        packs.push({
          id,
          name,
          filename: `${id}.md`,
          packDomain: 'looking-glass',
          category: 'governance',
          description,
          required: id === 'default',
          available: true,
        });
      }
    } catch { /* ignore */ }

    return packs.length > 0 ? packs : [this.defaultLookingGlassPack(false)];
  }
}

/** Singleton prompt pack service. Call promptPackService.initialize(extensionPath) in activate(). */
export const promptPackService = new PromptPackService();
