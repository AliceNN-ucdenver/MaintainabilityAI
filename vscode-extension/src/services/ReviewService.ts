import * as fs from 'fs';
import * as path from 'path';
import type { ReviewScope, IssueComment } from '../types';

export interface PromptPackInfo {
  id: string;
  name: string;
  description: string;
  domain?: string;
  required?: boolean;
  available: boolean;
}

export class ReviewService {

  /**
   * Build the issue body for an Oraculum review request.
   * Contains a structured ```oraculum YAML block that the GitHub Action parses,
   * plus prompt pack content as collapsible sections and an
   * Implementation Zone with @claude / @copilot instructions.
   */
  buildIssueBody(
    appName: string,
    barPath: string,
    scope: ReviewScope,
    additionalContext?: string,
    promptPacks?: { name: string; content: string }[]
  ): string {
    const today = new Date().toISOString().slice(0, 10);
    const reposList = scope.includeRepos.map(r => `  - ${r}`).join('\n');
    const pillarsList = scope.pillars.map(p => `  - ${p}`).join('\n');
    const packIds = scope.promptPacks ?? (scope.promptPack ? [scope.promptPack] : ['default']);
    const packsList = packIds.map(p => `  - ${p}`).join('\n');

    let body = `## Architecture Review Request

**Business Application:** ${appName}
**Date:** ${today}

## Review Configuration

\`\`\`oraculum
issue_number: ISSUE_NUMBER
bar_path: ${barPath}
prompt_packs:
${packsList}
scope:
${pillarsList}
repos:
${reposList}
\`\`\`
`;

    // Review Directive — prominent, top-level instruction for any agent
    body += `\n## Review Directive

> **Architecture review**: Analyze code repositories against the BAR and produce review artifacts.

- **BAR** (at \`${barPath}/\`) = the documented expected architecture. Do not modify the BAR's architecture artifacts.
- **Code repos** (listed above) = the actual implementation. Analyze them against the BAR.
- **Direction**: Code \u2192 compared against \u2192 BAR. Report where code drifts from documentation.
- **Output**: Write a report to \`${barPath}/reports/review-ISSUE_NUMBER.md\`, update \`${barPath}/reviews.yaml\` with review metrics, and open a PR with \`Closes #ISSUE_NUMBER\`. Also post a brief summary comment on this issue.

`;

    if (additionalContext || scope.additionalContext) {
      body += `## Review Context\n${additionalContext || scope.additionalContext}\n`;
    } else {
      body += `## Review Context\nStandard architecture review across all selected pillars.\n`;
    }

    // Prompt pack file references — always visible even if embedded content truncates
    if (promptPacks && promptPacks.length > 0) {
      const packFileList = packIds.map(p => `- \`.caterpillar/prompts/${p}.md\``).join('\n');
      body += `\n## Prompt Packs

Read the following prompt pack files for detailed review instructions:
${packFileList}

Each pack file is also embedded below for reference.

`;

      // Include each prompt pack as its own collapsible section
      for (const pack of promptPacks) {
        body += `<details>
<summary>\u{1F4D8} <strong>Prompt Pack: ${pack.name}</strong></summary>

${pack.content}

</details>

`;
      }
    }

    // Implementation Zone
    body += `---

## \u{1F916} Implementation Zone

Both agents produce the same artifacts: a report file, updated \`reviews.yaml\` metrics, and a PR.

**Option A — Assign to Claude**:

Post \`@claude\` as a comment to trigger the Oraculum workflow.

**Option B — Assign to Copilot**:

Assign \`copilot-swe-agent\` to this issue.

### Expected Artifacts (both agents)

1. **Report file**: Write findings to \`${barPath}/reports/review-ISSUE_NUMBER.md\`
2. **Update reviews.yaml**: Append a review record to \`${barPath}/reviews.yaml\` with drift score and finding counts. **Do NOT modify app.yaml** — review history lives exclusively in \`reviews.yaml\`.
3. **Open a PR**: Branch \`fix/issue-ISSUE_NUMBER\`, title \`Oraculum Review: ${appName} #ISSUE_NUMBER\`, body containing \`Closes #ISSUE_NUMBER\`
4. **Post a summary comment on this issue**: After completing the review, post a comment on **this issue** (#ISSUE_NUMBER) with the summary table (pillar names, finding counts by severity) and the computed drift score. Use \`gh issue comment ISSUE_NUMBER --body "..."\` or the GitHub API.

---

`;

    // Metadata (collapsed)
    body += `<details>
<summary>\u{1F4CA} Additional Metadata</summary>

- **Created**: ${new Date().toISOString()}
- **Extension Version**: MaintainabilityAI VS Code Extension v0.1.0
- **Prompt Packs**: ${packIds.join(', ')}
- **Pillars**: ${scope.pillars.join(', ')}

</details>
`;

    return body;
  }

  /**
   * Load the full markdown content of a prompt pack file.
   * Now loads 'default' as well (it has real content).
   */
  loadPromptPackContent(meshPath: string, packId: string): { name: string; content: string } | null {
    const filePath = path.join(meshPath, '.caterpillar', 'prompts', `${packId}.md`);
    if (!fs.existsSync(filePath)) { return null; }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const name = titleMatch ? titleMatch[1].replace(/\s*—.*/, '') : packId;
      return { name, content };
    } catch {
      return null;
    }
  }

  /**
   * Load content for multiple prompt packs at once.
   */
  loadMultiplePromptPacks(meshPath: string, packIds: string[]): { name: string; content: string }[] {
    return packIds
      .map(id => this.loadPromptPackContent(meshPath, id))
      .filter((p): p is { name: string; content: string } => p !== null);
  }

  /**
   * Scan the .caterpillar/prompts/ directory for available prompt packs.
   * Prefers registry.yaml for ordering and metadata; falls back to file scan.
   */
  loadPromptPacks(meshPath: string): PromptPackInfo[] {
    const promptsDir = path.join(meshPath, '.caterpillar', 'prompts');
    if (!fs.existsSync(promptsDir)) {
      return [{ id: 'default', name: 'Default', description: '4-pillar architecture governance review', domain: 'general', required: true, available: false }];
    }

    // Try registry.yaml first
    const registryPath = path.join(promptsDir, 'registry.yaml');
    if (fs.existsSync(registryPath)) {
      const packs = this.loadFromRegistry(registryPath, promptsDir);
      if (packs.length > 0) {
        // Also discover custom packs not in the registry
        const registeredIds = new Set(packs.map(p => p.id));
        const customPacks = this.discoverCustomPacks(promptsDir, registeredIds);
        return [...packs, ...customPacks];
      }
    }

    // Fallback: scan .md files directly
    return this.loadFromFiles(promptsDir);
  }

  /**
   * Parse registry.yaml for prompt pack metadata.
   * Uses hand-rolled YAML parsing consistent with existing codebase patterns.
   */
  private loadFromRegistry(registryPath: string, promptsDir: string): PromptPackInfo[] {
    try {
      const content = fs.readFileSync(registryPath, 'utf8');
      const packs: PromptPackInfo[] = [];
      let currentPack: Partial<PromptPackInfo> | null = null;

      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- id:')) {
          if (currentPack?.id) {
            packs.push(this.finalizePack(currentPack, promptsDir));
          }
          currentPack = { id: trimmed.replace('- id:', '').trim() };
        } else if (currentPack) {
          const kvMatch = trimmed.match(/^(\w+):\s*"?(.+?)"?\s*$/);
          if (kvMatch) {
            const [, key, value] = kvMatch;
            if (key === 'name') { currentPack.name = value; }
            else if (key === 'description') { currentPack.description = value; }
            else if (key === 'domain') { currentPack.domain = value; }
            else if (key === 'required') { currentPack.required = value === 'true'; }
          }
        }
      }
      if (currentPack?.id) {
        packs.push(this.finalizePack(currentPack, promptsDir));
      }

      return packs;
    } catch {
      return [];
    }
  }

  private finalizePack(partial: Partial<PromptPackInfo>, promptsDir: string): PromptPackInfo {
    const id = partial.id || 'unknown';
    const mdPath = path.join(promptsDir, `${id}.md`);
    return {
      id,
      name: partial.name || id,
      description: partial.description || `Prompt pack: ${id}`,
      domain: partial.domain,
      required: partial.required || false,
      available: fs.existsSync(mdPath),
    };
  }

  /**
   * Discover .md files not in the registry (custom packs).
   */
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

        customs.push({ id, name, description, domain: 'custom', available: true });
      }
    } catch { /* ignore */ }
    return customs;
  }

  /**
   * Fallback: scan .md files for prompt pack metadata (no registry).
   */
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

        packs.push({ id, name, description, domain: id === 'default' ? 'general' : undefined, required: id === 'default', available: true });
      }
    } catch { /* ignore */ }

    return packs.length > 0 ? packs : [{ id: 'default', name: 'Default', description: '4-pillar architecture governance review', domain: 'general', required: true, available: false }];
  }

  /**
   * Check if any comments contain structured review findings.
   */
  hasReviewFindings(comments: IssueComment[]): boolean {
    return comments.some(c =>
      c.isBot && (
        c.body.includes('## Oraculum Review') ||
        c.body.includes('### Architecture Findings') ||
        c.body.includes('### Security Findings')
      )
    );
  }
}
