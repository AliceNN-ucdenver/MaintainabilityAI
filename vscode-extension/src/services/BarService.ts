import * as fs from 'fs';
import * as path from 'path';
import type {
  AdrRecord,
  AppManifest,
  ArchitectureDsl,
  BarSummary,
  Criticality,
  GovernanceDecision,
  PillarFindingCounts,
  RationalizationStrategy,
  ReviewRecord,
} from '../types';
import { GovernanceScorer } from './GovernanceScorer';
import {
  generateAppYaml,
  generateConceptualView,
  generateLogicalView,
  generateContextView,
  generateSequenceView,
  generateTemplateAdr,
  generateFitnessFunctions,
  generateQualityAttributes,
  generateThreatModel,
  generateSecurityControls,
  generateVulnerabilityTracking,
  generateComplianceChecklist,
  generateIra,
  generateDataClassification,
  generateVism,
  generatePrivacyImpact,
  generateRunbook,
  generateServiceMapping,
  generateSlaDefinitions,
  generateIncidentResponse,
  generateBarDecisionsYaml,
  generateCalmBarArch,
  generateCalmDecorator,
  generateSampleClaimsProcessingArch,
  generateSampleCalmDecorator,
  generateSamplePolicyAdminArch,
  generateSampleFraudDetectionArch,
  generateSampleClaimsAdr002,
  generateSamplePolicyAdminAdr002,
  generateSampleFraudAdr002,
} from '../templates/meshTemplates';

export class BarService {
  private scorer: GovernanceScorer;

  constructor(scorer?: GovernanceScorer) {
    this.scorer = scorer || new GovernanceScorer();
  }

  /**
   * Read app.yaml and parse the application manifest.
   */
  readManifest(barPath: string): AppManifest | null {
    const yamlPath = path.join(barPath, 'app.yaml');
    if (!fs.existsSync(yamlPath)) { return null; }

    try {
      const content = fs.readFileSync(yamlPath, 'utf8');
      return this.parseAppYaml(content);
    } catch {
      return null;
    }
  }

  /**
   * Score all four pillars and return a complete BAR summary.
   */
  scorePillars(barPath: string, platformId: string, platformName: string): BarSummary | null {
    const manifest = this.readManifest(barPath);
    if (!manifest) { return null; }

    const scores = this.scorer.scoreAllPillars(barPath);
    const decisions = this.readDecisions(barPath);
    const pendingDecisions = decisions.filter(d => d.status === 'pending').length;
    const adrs = this.listAdrs(barPath);
    const repos = manifest.repos || [];
    const repoCount = repos.length;

    const reviews = this.readReviews(barPath) || undefined;
    const latestDriftScore = reviews && reviews.length > 0
      ? reviews[reviews.length - 1].driftScore
      : undefined;

    return {
      id: manifest.id,
      name: manifest.name,
      platformId,
      platformName,
      criticality: manifest.criticality,
      lifecycle: manifest.lifecycle,
      strategy: manifest.strategy,
      architecture: scores.architecture,
      security: scores.security,
      infoRisk: scores.infoRisk,
      operations: scores.operations,
      compositeScore: scores.compositeScore,
      pendingDecisions,
      adrCount: adrs.length,
      repos,
      repoCount,
      path: barPath,
      reviews,
      latestDriftScore,
    };
  }

  /**
   * Update a single field in app.yaml (e.g., strategy, criticality, lifecycle).
   */
  updateField(barPath: string, field: string, value: string): void {
    const yamlPath = path.join(barPath, 'app.yaml');
    if (!fs.existsSync(yamlPath)) {
      throw new Error(`app.yaml not found at ${yamlPath}`);
    }
    let content = fs.readFileSync(yamlPath, 'utf8');
    const regex = new RegExp(`^(\\s*${field}:\\s*)(.+)$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `$1${value}`);
    } else {
      // Field not present — insert after the last known field
      const insertAfter = /^(\s*lifecycle:\s*.+)$/m;
      content = content.replace(insertAfter, `$1\n  ${field}: ${value}`);
    }
    fs.writeFileSync(yamlPath, content, 'utf8');
  }

  /**
   * Read governance decisions from decisions.yaml.
   */
  readDecisions(barPath: string): GovernanceDecision[] {
    const decPath = path.join(barPath, 'governance', 'decisions.yaml');
    if (!fs.existsSync(decPath)) { return []; }

    try {
      const content = fs.readFileSync(decPath, 'utf8');
      return this.parseDecisions(content);
    } catch {
      return [];
    }
  }

  /**
   * List all files/directories in a BAR for the tree view.
   */
  readRepoTree(barPath: string): string[] {
    const entries: string[] = [];
    this.walkDir(barPath, barPath, entries);
    return entries;
  }

  /**
   * Scaffold a new BAR with the given template.
   */
  scaffoldBar(
    parentDir: string,
    name: string,
    appId: string,
    portfolioId: string,
    platformId: string,
    criticality: Criticality,
    template: 'minimal' | 'standard' | 'full',
    architectureDsl: ArchitectureDsl = 'calm'
  ): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const barPath = path.join(parentDir, slug);

    // Always create app.yaml and governance
    const files: { rel: string; content: string }[] = [
      { rel: 'app.yaml', content: generateAppYaml(appId, name, portfolioId, platformId, criticality) },
      { rel: 'governance/decisions.yaml', content: generateBarDecisionsYaml() },
    ];

    if (template === 'standard' || template === 'full') {
      const isFull = template === 'full';

      // Architecture — DSL-aware
      if (architectureDsl === 'calm') {
        files.push(
          { rel: 'architecture/bar.arch.json', content: isFull ? generateCalmBarArch(name, appId) : '' },
          { rel: 'architecture/decorator.json', content: isFull ? generateCalmDecorator() : '' },
        );
      } else {
        files.push(
          { rel: 'architecture/views/conceptual.md', content: isFull ? generateConceptualView(name) : '' },
          { rel: 'architecture/views/logical.md', content: isFull ? generateLogicalView(name) : '' },
          { rel: 'architecture/views/context.md', content: isFull ? generateContextView(name) : '' },
          { rel: 'architecture/views/sequence.md', content: isFull ? generateSequenceView(name) : '' },
        );
      }
      files.push(
        { rel: 'architecture/ADRs/001-initial-architecture.md', content: isFull ? generateTemplateAdr(name) : '' },
        { rel: 'architecture/fitness-functions.yaml', content: isFull ? generateFitnessFunctions() : '' },
        { rel: 'architecture/quality-attributes.yaml', content: isFull ? generateQualityAttributes() : '' },
      );

      // Security
      files.push(
        { rel: 'security/threat-model.yaml', content: isFull ? generateThreatModel(name) : '' },
        { rel: 'security/security-controls.yaml', content: isFull ? generateSecurityControls() : '' },
        { rel: 'security/vulnerability-tracking.yaml', content: isFull ? generateVulnerabilityTracking() : '' },
        { rel: 'security/compliance-checklist.yaml', content: isFull ? generateComplianceChecklist() : '' },
      );

      // Information Risk
      files.push(
        { rel: 'information-risk/ira.md', content: isFull ? generateIra(name) : '' },
        { rel: 'information-risk/data-classification.yaml', content: isFull ? generateDataClassification() : '' },
        { rel: 'information-risk/vism.yaml', content: isFull ? generateVism() : '' },
        { rel: 'information-risk/privacy-impact.yaml', content: isFull ? generatePrivacyImpact() : '' },
      );

      // Operations
      files.push(
        { rel: 'operations/runbook.md', content: isFull ? generateRunbook(name) : '' },
        { rel: 'operations/service-mapping.yaml', content: isFull ? generateServiceMapping() : '' },
        { rel: 'operations/sla-definitions.yaml', content: isFull ? generateSlaDefinitions() : '' },
        { rel: 'operations/incident-response.yaml', content: isFull ? generateIncidentResponse() : '' },
      );
    }

    // Write all files
    for (const file of files) {
      const fullPath = path.join(barPath, file.rel);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, file.content, 'utf8');
    }

    return barPath;
  }

  /**
   * Scaffold a sample BAR with populated CALM artifacts for Claims Processing.
   */
  scaffoldCalmSampleBar(
    parentDir: string,
    name: string,
    appId: string,
    portfolioId: string,
    platformId: string,
    criticality: Criticality
  ): string {
    return this.writeSampleBar(parentDir, name, appId, portfolioId, platformId, criticality, {
      arch: generateSampleClaimsProcessingArch(),
      decorator: generateSampleCalmDecorator(),
    }, [
      { rel: 'architecture/ADRs/002-event-driven-claims-pipeline.md', content: generateSampleClaimsAdr002() },
    ]);
  }

  /**
   * Scaffold a sample BAR for Policy Administration (linked to Claims Processing via interacts).
   */
  scaffoldPolicyAdminSampleBar(
    parentDir: string,
    name: string,
    appId: string,
    portfolioId: string,
    platformId: string,
    criticality: Criticality
  ): string {
    return this.writeSampleBar(parentDir, name, appId, portfolioId, platformId, criticality, {
      arch: generateSamplePolicyAdminArch(),
      decorator: generateSampleCalmDecorator(),
    }, [
      { rel: 'architecture/ADRs/002-postgresql-policy-datastore.md', content: generateSamplePolicyAdminAdr002() },
    ]);
  }

  /**
   * Scaffold a sample BAR for Fraud Detection (linked to Claims Processing via interacts).
   */
  scaffoldFraudDetectionSampleBar(
    parentDir: string,
    name: string,
    appId: string,
    portfolioId: string,
    platformId: string,
    criticality: Criticality
  ): string {
    return this.writeSampleBar(parentDir, name, appId, portfolioId, platformId, criticality, {
      arch: generateSampleFraudDetectionArch(),
      decorator: generateSampleCalmDecorator(),
    }, [
      { rel: 'architecture/ADRs/002-ml-model-serving-feature-store.md', content: generateSampleFraudAdr002() },
    ]);
  }

  private writeSampleBar(
    parentDir: string,
    name: string,
    appId: string,
    portfolioId: string,
    platformId: string,
    criticality: Criticality,
    calm: { arch: string; decorator: string },
    extraFiles: { rel: string; content: string }[] = [],
  ): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const barPath = path.join(parentDir, slug);

    const files: { rel: string; content: string }[] = [
      { rel: 'app.yaml', content: generateAppYaml(appId, name, portfolioId, platformId, criticality) },
      { rel: 'governance/decisions.yaml', content: generateBarDecisionsYaml() },
      // CALM architecture artifacts
      { rel: 'architecture/bar.arch.json', content: calm.arch },
      { rel: 'architecture/decorator.json', content: calm.decorator },
      { rel: 'architecture/ADRs/001-initial-architecture.md', content: generateTemplateAdr(name) },
      { rel: 'architecture/fitness-functions.yaml', content: generateFitnessFunctions() },
      { rel: 'architecture/quality-attributes.yaml', content: generateQualityAttributes() },
      // Security
      { rel: 'security/threat-model.yaml', content: generateThreatModel(name) },
      { rel: 'security/security-controls.yaml', content: generateSecurityControls() },
      { rel: 'security/vulnerability-tracking.yaml', content: generateVulnerabilityTracking() },
      { rel: 'security/compliance-checklist.yaml', content: generateComplianceChecklist() },
      // Information Risk
      { rel: 'information-risk/ira.md', content: generateIra(name) },
      { rel: 'information-risk/data-classification.yaml', content: generateDataClassification() },
      { rel: 'information-risk/vism.yaml', content: generateVism() },
      { rel: 'information-risk/privacy-impact.yaml', content: generatePrivacyImpact() },
      // Operations
      { rel: 'operations/runbook.md', content: generateRunbook(name) },
      { rel: 'operations/service-mapping.yaml', content: generateServiceMapping() },
      { rel: 'operations/sla-definitions.yaml', content: generateSlaDefinitions() },
      { rel: 'operations/incident-response.yaml', content: generateIncidentResponse() },
      ...extraFiles,
    ];

    for (const file of files) {
      const fullPath = path.join(barPath, file.rel);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, file.content, 'utf8');
    }

    return barPath;
  }

  // --------------------------------------------------------------------------
  // App.yaml full-form editing
  // --------------------------------------------------------------------------

  /**
   * Read the raw app.yaml content for form editing.
   */
  readAppYamlRaw(barPath: string): string | null {
    const yamlPath = path.join(barPath, 'app.yaml');
    if (!fs.existsSync(yamlPath)) { return null; }
    return fs.readFileSync(yamlPath, 'utf8');
  }

  /**
   * Update multiple fields in app.yaml at once.
   */
  updateMultipleFields(barPath: string, fields: Record<string, string>): void {
    for (const [field, value] of Object.entries(fields)) {
      this.updateField(barPath, field, value);
    }
  }

  /**
   * Append repository URLs to the repos array in app.yaml.
   * Deduplicates against existing repos. Returns count of newly added repos.
   */
  addRepos(barPath: string, repoUrls: string[]): number {
    const yamlPath = path.join(barPath, 'app.yaml');
    if (!fs.existsSync(yamlPath)) {
      throw new Error(`app.yaml not found at ${yamlPath}`);
    }

    let content = fs.readFileSync(yamlPath, 'utf8');
    const manifest = this.parseAppYaml(content);
    const existingRepos = new Set(manifest.repos || []);
    const newUrls = repoUrls.filter(u => !existingRepos.has(u));
    if (newUrls.length === 0) { return 0; }

    if (content.includes('repos: []')) {
      const reposList = newUrls.map(u => `    - "${u}"`).join('\n');
      content = content.replace('repos: []', `repos:\n${reposList}`);
    } else {
      const lines = content.split('\n');
      let lastRepoLineIdx = -1;
      let inReposSection = false;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*repos:/.test(lines[i])) { inReposSection = true; continue; }
        if (inReposSection) {
          if (/^\s*-\s+/.test(lines[i])) {
            lastRepoLineIdx = i;
          } else if (lines[i].trim() && !/^\s*#/.test(lines[i])) {
            break;
          }
        }
      }
      if (lastRepoLineIdx >= 0) {
        const newLines = newUrls.map(u => `    - "${u}"`);
        lines.splice(lastRepoLineIdx + 1, 0, ...newLines);
        content = lines.join('\n');
      }
    }

    fs.writeFileSync(yamlPath, content, 'utf8');
    return newUrls.length;
  }

  // --------------------------------------------------------------------------
  // Review Metrics (Design Drift)
  // --------------------------------------------------------------------------

  /**
   * Compute a drift score from pillar finding counts.
   * 100 = no drift (perfect), 0 = severe drift.
   * Deductions: critical -15, high -5, medium -2, low -1
   */
  static computeDriftScore(pillars: Record<string, PillarFindingCounts>): number {
    let deductions = 0;
    for (const counts of Object.values(pillars)) {
      deductions += counts.critical * 15;
      deductions += counts.high * 5;
      deductions += counts.medium * 2;
      deductions += counts.low * 1;
    }
    return Math.max(0, 100 - deductions);
  }

  /**
   * Append a review record to reviews.yaml (separate from app.yaml).
   */
  appendReviewRecord(barPath: string, review: ReviewRecord): void {
    const yamlPath = path.join(barPath, 'reviews.yaml');

    const pillarYaml = Object.entries(review.pillars).map(([name, counts]) =>
      `      ${name}:\n        findings: ${counts.findings}\n        critical: ${counts.critical}\n        high: ${counts.high}\n        medium: ${counts.medium}\n        low: ${counts.low}`
    ).join('\n');

    const reviewEntry = `  - issue_url: "${review.issueUrl}"\n    issue_number: ${review.issueNumber}\n    date: "${review.date}"\n    agent: ${review.agent}\n    drift_score: ${review.driftScore}\n    pillars:\n${pillarYaml}`;

    let content: string;
    if (fs.existsSync(yamlPath)) {
      content = fs.readFileSync(yamlPath, 'utf8').trimEnd() + '\n' + reviewEntry + '\n';
    } else {
      content = `# Oraculum Review History — generated by MaintainabilityAI\nreviews:\n${reviewEntry}\n`;
    }

    fs.writeFileSync(yamlPath, content, 'utf8');
  }

  // --------------------------------------------------------------------------
  // ADR (Architecture Decision Records) — BTABoK-inspired
  // --------------------------------------------------------------------------

  /**
   * List all ADR files in the BAR's architecture/ADRs/ directory.
   */
  listAdrs(barPath: string): AdrRecord[] {
    const adrDir = path.join(barPath, 'architecture', 'ADRs');
    if (!fs.existsSync(adrDir)) { return []; }

    const files = fs.readdirSync(adrDir)
      .filter(f => f.endsWith('.md'))
      .sort();

    return files.map(f => this.parseAdrFile(path.join(adrDir, f))).filter(Boolean) as AdrRecord[];
  }

  /**
   * Create a new ADR file. Auto-assigns the next sequence number.
   */
  createAdr(barPath: string, adr: AdrRecord): AdrRecord {
    const adrDir = path.join(barPath, 'architecture', 'ADRs');
    if (!fs.existsSync(adrDir)) {
      fs.mkdirSync(adrDir, { recursive: true });
    }

    // Auto-assign ID if not provided or placeholder
    const existingFiles = fs.existsSync(adrDir)
      ? fs.readdirSync(adrDir).filter(f => f.endsWith('.md')).sort()
      : [];
    const nextSeq = existingFiles.length + 1;
    const id = `ADR-${String(nextSeq).padStart(3, '0')}`;
    adr.id = id;

    if (!adr.date) {
      adr.date = new Date().toISOString().split('T')[0];
    }

    const filename = `${String(nextSeq).padStart(3, '0')}-${this.slugify(adr.title)}.md`;
    const content = this.serializeAdr(adr);
    fs.writeFileSync(path.join(adrDir, filename), content, 'utf8');

    return adr;
  }

  /**
   * Update an existing ADR file by matching its ID.
   */
  updateAdr(barPath: string, adr: AdrRecord): AdrRecord {
    const adrDir = path.join(barPath, 'architecture', 'ADRs');
    if (!fs.existsSync(adrDir)) {
      throw new Error('ADRs directory not found');
    }

    // Find the file that contains this ADR ID
    const files = fs.readdirSync(adrDir).filter(f => f.endsWith('.md'));
    let targetFile: string | null = null;
    for (const f of files) {
      const content = fs.readFileSync(path.join(adrDir, f), 'utf8');
      if (content.includes(`# ${adr.id}:`) || content.includes(`# ${adr.id} `)) {
        targetFile = f;
        break;
      }
    }

    if (!targetFile) {
      throw new Error(`ADR ${adr.id} not found`);
    }

    const content = this.serializeAdr(adr);
    fs.writeFileSync(path.join(adrDir, targetFile), content, 'utf8');
    return adr;
  }

  /**
   * Delete an ADR file by its ID.
   */
  deleteAdr(barPath: string, adrId: string): void {
    const adrDir = path.join(barPath, 'architecture', 'ADRs');
    if (!fs.existsSync(adrDir)) { return; }

    const files = fs.readdirSync(adrDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(adrDir, f), 'utf8');
      if (content.includes(`# ${adrId}:`) || content.includes(`# ${adrId} `)) {
        fs.unlinkSync(path.join(adrDir, f));
        return;
      }
    }
  }

  private parseAdrFile(filePath: string): AdrRecord | null {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const getSection = (heading: string): string => {
        const regex = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`, 'm');
        const match = content.match(regex);
        return match ? match[1].trim() : '';
      };

      // Parse title from first heading: # ADR-001: Title
      const titleMatch = content.match(/^# (ADR-\d+):\s*(.+)$/m);
      if (!titleMatch) {
        // Try legacy format: # ADR-001 Title
        const legacyMatch = content.match(/^# (ADR-\d+)\s+(.+)$/m);
        if (!legacyMatch) { return null; }
        return {
          id: legacyMatch[1],
          title: legacyMatch[2].trim(),
          status: (getSection('Status').toLowerCase().trim() || 'proposed') as AdrRecord['status'],
          date: getSection('Date') || '',
          deciders: getSection('Deciders') || '',
          context: getSection('Context'),
          decision: getSection('Decision'),
          consequences: getSection('Consequences'),
          alternatives: getSection('Alternatives') || undefined,
          references: getSection('References') || undefined,
          links: this.parseLinksSection(getSection('Links')),
          characteristics: this.parseCharacteristicsSection(getSection('Characteristics')),
        };
      }

      return {
        id: titleMatch[1],
        title: titleMatch[2].trim(),
        status: (getSection('Status').toLowerCase().trim() || 'proposed') as AdrRecord['status'],
        date: getSection('Date') || '',
        deciders: getSection('Deciders') || '',
        context: getSection('Context'),
        decision: getSection('Decision'),
        consequences: getSection('Consequences'),
        alternatives: getSection('Alternatives') || undefined,
        references: getSection('References') || undefined,
        links: this.parseLinksSection(getSection('Links')),
        characteristics: this.parseCharacteristicsSection(getSection('Characteristics')),
      };
    } catch {
      return null;
    }
  }

  private parseLinksSection(text: string): import('../types').AdrLink[] | undefined {
    if (!text) { return undefined; }
    const links: import('../types').AdrLink[] = [];
    const regex = /^-\s+(supersedes|depends-on|related):\s*(ADR-\d+)/gm;
    let m;
    while ((m = regex.exec(text)) !== null) {
      links.push({ type: m[1] as import('../types').AdrLinkType, targetId: m[2] });
    }
    return links.length > 0 ? links : undefined;
  }

  private parseCharacteristicsSection(text: string): import('../types').AdrCharacteristics | undefined {
    if (!text) { return undefined; }
    const get = (key: string): number => {
      const m = text.match(new RegExp(`^${key}:\\s*(\\d+)`, 'm'));
      if (!m) { return 0; }
      return Math.max(1, Math.min(5, parseInt(m[1], 10)));
    };
    const chars = {
      reversibility: get('reversibility'),
      cost: get('cost'),
      risk: get('risk'),
      complexity: get('complexity'),
      effort: get('effort'),
    };
    // Only return if at least one dimension was set
    if (Object.values(chars).every(v => v === 0)) { return undefined; }
    return chars;
  }

  private serializeAdr(adr: AdrRecord): string {
    let content = `# ${adr.id}: ${adr.title}\n\n`;
    content += `## Status\n\n${adr.status}\n\n`;
    content += `## Date\n\n${adr.date}\n\n`;
    content += `## Deciders\n\n${adr.deciders}\n\n`;
    content += `## Context\n\n${adr.context}\n\n`;
    content += `## Decision\n\n${adr.decision}\n\n`;
    content += `## Consequences\n\n${adr.consequences}\n`;
    if (adr.alternatives) {
      content += `\n## Alternatives\n\n${adr.alternatives}\n`;
    }
    if (adr.references) {
      content += `\n## References\n\n${adr.references}\n`;
    }
    if (adr.characteristics) {
      const c = adr.characteristics;
      content += `\n## Characteristics\n\n`;
      if (c.reversibility) { content += `reversibility: ${c.reversibility}\n`; }
      if (c.cost) { content += `cost: ${c.cost}\n`; }
      if (c.risk) { content += `risk: ${c.risk}\n`; }
      if (c.complexity) { content += `complexity: ${c.complexity}\n`; }
      if (c.effort) { content += `effort: ${c.effort}\n`; }
    }
    if (adr.links && adr.links.length > 0) {
      content += `\n## Links\n\n`;
      for (const link of adr.links) {
        content += `- ${link.type}: ${link.targetId}\n`;
      }
    }
    return content;
  }

  /**
   * When an ADR has `supersedes` links, auto-update target ADRs to `superseded` status.
   * Returns list of ADR IDs that were changed.
   */
  autoUpdateSuperseded(barPath: string, adr: AdrRecord): string[] {
    if (!adr.links) { return []; }
    const supersedesLinks = adr.links.filter(l => l.type === 'supersedes');
    if (supersedesLinks.length === 0) { return []; }

    const changed: string[] = [];
    const adrs = this.listAdrs(barPath);
    for (const link of supersedesLinks) {
      const target = adrs.find(a => a.id === link.targetId);
      if (target && target.status !== 'superseded') {
        target.status = 'superseded';
        this.updateAdr(barPath, target);
        changed.push(target.id);
      }
    }
    return changed;
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private parseAppYaml(content: string): AppManifest {
    // Simple YAML parser for app.yaml — avoids adding a YAML dependency
    const get = (key: string): string => {
      const match = content.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
      return match ? match[1].replace(/^["']|["']$/g, '').trim() : '';
    };

    const getArray = (key: string): string[] => {
      const idx = content.indexOf(`${key}:`);
      if (idx === -1) { return []; }
      const after = content.slice(idx);
      const items: string[] = [];
      const lines = after.split('\n').slice(1);
      for (const line of lines) {
        const m = line.match(/^\s*-\s*(.+)/);
        if (m) { items.push(m[1].replace(/^["']|["']$/g, '').trim()); }
        else if (line.trim() && !line.match(/^\s*#/)) { break; }
      }
      return items;
    };

    const strategyVal = get('strategy') || 'reassess';
    const validStrategies: RationalizationStrategy[] = ['reassess', 'extract', 'advance', 'prune'];
    const strategy: RationalizationStrategy = validStrategies.includes(strategyVal as RationalizationStrategy)
      ? strategyVal as RationalizationStrategy
      : 'reassess';

    return {
      id: get('id'),
      name: get('name'),
      portfolio: get('portfolio'),
      platform: get('platform'),
      criticality: (get('criticality') || 'medium') as Criticality,
      lifecycle: (get('lifecycle') || 'build') as AppManifest['lifecycle'],
      strategy,
      owner: get('owner'),
      description: get('description'),
      repos: getArray('repos'),
    };
  }

  /**
   * Read review records from reviews.yaml (separate file in BAR root).
   * Falls back to app.yaml reviews section for backward compatibility.
   */
  readReviews(barPath: string): ReviewRecord[] | undefined {
    // Primary: reviews.yaml
    const yamlPath = path.join(barPath, 'reviews.yaml');
    if (fs.existsSync(yamlPath)) {
      try {
        const content = fs.readFileSync(yamlPath, 'utf8');
        const result = this.parseReviewsYaml(content);
        if (result) { return result; }
      } catch { /* fall through */ }
    }

    // Fallback: reviews section inside app.yaml (backward compat)
    const appYamlPath = path.join(barPath, 'app.yaml');
    if (fs.existsSync(appYamlPath)) {
      try {
        const content = fs.readFileSync(appYamlPath, 'utf8');
        if (content.includes('reviews:')) {
          return this.parseReviewsYaml(content);
        }
      } catch { /* ignore */ }
    }

    return undefined;
  }

  private parseReviewsYaml(content: string): ReviewRecord[] | undefined {
    const reviewsIdx = content.indexOf('reviews:');
    if (reviewsIdx === -1) { return undefined; }

    const after = content.slice(reviewsIdx);
    const reviews: ReviewRecord[] = [];
    // Split on list items: handle both snake_case (issue_url) and camelCase (issueUrl)
    const blocks = after.split(/\n\s+-\s+(?:issue_url|issueUrl):\s*/);

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      // Generic key getter: tries exact key, then camelCase and snake_case variants
      const get = (key: string, ...altKeys: string[]): string => {
        const keys = [key, ...altKeys];
        for (const k of keys) {
          const m = block.match(new RegExp(`(?:^|\\n)\\s*${k}:\\s*(.+)`, 'm'));
          if (m) { return m[1].replace(/^["']|["']$/g, '').trim(); }
        }
        return '';
      };

      const issueUrl = block.split('\n')[0].replace(/^["']|["']$/g, '').trim();
      const issueNumber = parseInt(get('issue_number', 'issueNumber'), 10) || 0;
      const date = get('date');
      const agent = (get('agent') || 'manual') as ReviewRecord['agent'];
      const driftScore = parseInt(get('drift_score', 'driftScore'), 10) || 0;

      const pillars: Record<string, PillarFindingCounts> = {};
      // Map of canonical name → variants agents might use
      const pillarVariants: Record<string, string[]> = {
        'architecture': ['architecture'],
        'security': ['security'],
        'information-risk': ['information-risk', 'informationrisk', 'information_risk', 'infoRisk', 'info-risk'],
        'operations': ['operations'],
      };

      for (const [canonical, variants] of Object.entries(pillarVariants)) {
        // Find which variant exists in the block
        let pIdx = -1;
        for (const v of variants) {
          pIdx = block.indexOf(`${v}:`);
          if (pIdx !== -1) { break; }
        }
        if (pIdx === -1) { continue; }

        const pBlock = block.slice(pIdx, pIdx + 300);

        // Handle both inline { findings: 8, critical: 0, ... } and multi-line format
        const inlineMatch = pBlock.match(/:\s*\{([^}]+)\}/);
        if (inlineMatch) {
          const getInline = (k: string): number => {
            const m = inlineMatch[1].match(new RegExp(`${k}:\\s*(\\d+)`));
            return m ? parseInt(m[1], 10) : 0;
          };
          pillars[canonical] = {
            findings: getInline('findings'),
            critical: getInline('critical'),
            high: getInline('high'),
            medium: getInline('medium'),
            low: getInline('low'),
          };
        } else {
          const getN = (k: string): number => {
            const m = pBlock.match(new RegExp(`${k}:\\s*(\\d+)`, 'm'));
            return m ? parseInt(m[1], 10) : 0;
          };
          pillars[canonical] = {
            findings: getN('findings'),
            critical: getN('critical'),
            high: getN('high'),
            medium: getN('medium'),
            low: getN('low'),
          };
        }
      }

      reviews.push({ issueUrl, issueNumber, date, agent, pillars, driftScore });
    }

    return reviews.length > 0 ? reviews : undefined;
  }

  private parseDecisions(content: string): GovernanceDecision[] {
    const decisions: GovernanceDecision[] = [];
    const blocks = content.split(/\n\s*-\s+id:\s*/);
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const get = (key: string): string => {
        const m = block.match(new RegExp(`${key}:\\s*(.+)`, 'm'));
        return m ? m[1].replace(/^["']|["']$/g, '').trim() : '';
      };
      decisions.push({
        id: get('') || `DEC-${i}`,
        title: get('title'),
        status: (get('status') || 'pending') as GovernanceDecision['status'],
        date: get('date'),
        owner: get('owner'),
      });
    }
    return decisions;
  }

  private walkDir(rootPath: string, currentPath: string, entries: string[]): void {
    try {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        if (item.startsWith('.')) { continue; }
        const fullPath = path.join(currentPath, item);
        const relativePath = path.relative(rootPath, fullPath);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          entries.push(relativePath + '/');
          this.walkDir(rootPath, fullPath, entries);
        } else {
          entries.push(relativePath);
        }
      }
    } catch { /* ignore unreadable dirs */ }
  }
}
