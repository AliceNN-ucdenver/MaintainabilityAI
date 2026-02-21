import * as vscode from 'vscode';
import type { OrgRepo, OrgScanRecommendation, RecommendedPlatform, RecommendedBar, Criticality, ExistingStructureContext, ExistingBarUpdate } from '../types';
import { GitHubService } from './GitHubService';
import { buildSystemPrompt, buildUserPrompt } from './llm/OrgScannerPrompt';

export class OrgScannerService {
  private github: GitHubService;
  private progressCallback: (step: string, progress: number) => void;
  private preferredFamily?: string;

  constructor(
    github: GitHubService,
    progressCallback: (step: string, progress: number) => void
  ) {
    this.github = github;
    this.progressCallback = progressCallback;
  }

  async scanOrg(org: string, modelFamily?: string): Promise<OrgScanRecommendation> {
    this.preferredFamily = modelFamily;
    // 1. Fetch repos (0-30%)
    this.progressCallback('Fetching repositories...', 5);
    const repos = await this.github.listOrgRepos(org);

    if (repos.length === 0) {
      throw new Error(`No repositories found for "${org}". Check the organization name and your GitHub permissions.`);
    }

    this.progressCallback(`Found ${repos.length} repositories. Reading READMEs...`, 30);

    // 2. Fetch READMEs in parallel batches of 5 (30-60%)
    await this.fetchReadmes(repos, org);

    // 3. Call LLM for recommendations (60-90%)
    this.progressCallback('Connecting to AI model...', 62);
    const recommendation = await this.callLlm(repos, org);

    // 4. Done
    this.progressCallback('Complete', 100);
    return recommendation;
  }

  /**
   * Scan with pre-selected repos and optionally existing mesh context.
   * Only fetches READMEs for selected repos, then calls LLM with context.
   */
  async scanOrgWithRepos(
    org: string,
    repoNames: string[],
    existingContext?: ExistingStructureContext,
    modelFamily?: string
  ): Promise<OrgScanRecommendation> {
    this.preferredFamily = modelFamily;

    // 1. Fetch all org repos, filter to selected (0-30%)
    this.progressCallback('Fetching repository details...', 5);
    const allRepos = await this.github.listOrgRepos(org);
    const selectedRepos = allRepos.filter(r => repoNames.includes(r.name));

    if (selectedRepos.length === 0) {
      throw new Error(`None of the selected repositories were found in "${org}".`);
    }

    this.progressCallback(`Found ${selectedRepos.length} selected repositories. Reading READMEs...`, 30);

    // 2. Fetch READMEs for selected repos only (30-60%)
    await this.fetchReadmes(selectedRepos, org);

    // 3. Call LLM with context (60-90%)
    this.progressCallback('Connecting to AI model...', 62);
    const recommendation = await this.callLlmWithContext(selectedRepos, org, existingContext);

    // 4. Done
    this.progressCallback('Complete', 100);
    return recommendation;
  }

  private async fetchReadmes(repos: OrgRepo[], org: string): Promise<void> {
    const batchSize = 5;
    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);
      const readmes = await Promise.all(
        batch.map(r => this.github.getRepoReadme(org, r.name))
      );
      for (let j = 0; j < batch.length; j++) {
        batch[j].readme = readmes[j];
      }
      const progress = 30 + Math.round(((i + batch.length) / repos.length) * 30);
      this.progressCallback(`Reading READMEs... (${Math.min(i + batchSize, repos.length)}/${repos.length})`, progress);
    }
  }

  private async selectModel(): Promise<vscode.LanguageModelChat> {
    let model: vscode.LanguageModelChat | undefined;
    const configPreferred = vscode.workspace.getConfiguration('maintainabilityai.llm').get<string>('preferredFamily', 'gpt-4o');
    const families = [this.preferredFamily, configPreferred, 'gpt-4o', 'gpt-4', 'codex', 'claude-sonnet']
      .filter((v): v is string => !!v)
      .filter((v, i, a) => a.indexOf(v) === i);

    for (const family of families) {
      const models = await vscode.lm.selectChatModels({ family });
      if (models.length > 0) {
        model = models[0];
        break;
      }
    }

    if (!model) {
      const allModels = await vscode.lm.selectChatModels();
      if (allModels.length > 0) {
        model = allModels[0];
      }
    }

    if (!model) {
      throw new Error(
        'No VS Code Language Model available. Ensure GitHub Copilot is installed and signed in.'
      );
    }

    return model;
  }

  private async streamLlmResponse(model: vscode.LanguageModelChat, systemPrompt: string, userPrompt: string): Promise<string> {
    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt),
    ];

    const response = await model.sendRequest(
      messages,
      {},
      new vscode.CancellationTokenSource().token
    );

    let text = '';
    let chunkCount = 0;
    for await (const chunk of response.text) {
      text += chunk;
      chunkCount++;
      if (chunkCount % 5 === 0) {
        const charCount = text.length;
        const progress = Math.min(65 + Math.round((charCount / 3000) * 20), 88);
        this.progressCallback(`Analyzing... (${charCount.toLocaleString()} chars received)`, progress);
      }
    }

    return text;
  }

  private async callLlm(repos: OrgRepo[], org: string): Promise<OrgScanRecommendation> {
    const model = await this.selectModel();
    this.progressCallback(`Analyzing ${repos.length} repos with ${model.name}...`, 65);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(repos, org);
    const text = await this.streamLlmResponse(model, systemPrompt, userPrompt);

    this.progressCallback('Parsing AI recommendations...', 90);
    return this.parseResponse(text, repos);
  }

  private async callLlmWithContext(
    repos: OrgRepo[],
    org: string,
    existingContext?: ExistingStructureContext
  ): Promise<OrgScanRecommendation> {
    const model = await this.selectModel();
    this.progressCallback(`Analyzing ${repos.length} repos with ${model.name}...`, 65);

    const systemPrompt = buildSystemPrompt(existingContext);
    const userPrompt = buildUserPrompt(repos, org);
    const text = await this.streamLlmResponse(model, systemPrompt, userPrompt);

    this.progressCallback('Parsing AI recommendations...', 90);
    return this.parseResponse(text, repos, existingContext);
  }

  private parseResponse(
    text: string,
    repos: OrgRepo[],
    existingContext?: ExistingStructureContext
  ): OrgScanRecommendation {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/m, '')
      .replace(/\n?```\s*$/m, '')
      .trim();

    let parsed: {
      platforms: Array<{
        name: string;
        abbreviation: string;
        rationale: string;
        bars: Array<{
          name: string;
          criticality: string;
          rationale: string;
          repos: string[];
        }>;
      }>;
      unassigned: string[];
      updates?: Array<{
        barId: string;
        addRepos: string[];
        rationale: string;
      }>;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse AI response as JSON. Raw response:\n${text.substring(0, 500)}`);
    }

    // Build a lookup map of repos by name
    const repoMap = new Map<string, OrgRepo>();
    for (const repo of repos) {
      repoMap.set(repo.name, repo);
    }

    // Track which repos have been assigned
    const assignedRepos = new Set<string>();
    let platformCounter = 0;
    let barCounter = 0;

    const platforms: RecommendedPlatform[] = (parsed.platforms || []).map(p => {
      platformCounter++;
      const bars: RecommendedBar[] = (p.bars || []).map(b => {
        barCounter++;
        const barRepos: OrgRepo[] = [];
        for (const repoName of (b.repos || [])) {
          const repo = repoMap.get(repoName);
          if (repo) {
            barRepos.push(repo);
            assignedRepos.add(repoName);
          }
        }

        const criticality = (['critical', 'high', 'medium', 'low'].includes(b.criticality)
          ? b.criticality
          : 'medium') as Criticality;

        return {
          id: `bar-${barCounter}`,
          name: b.name || `Application ${barCounter}`,
          repos: barRepos,
          criticality,
          rationale: b.rationale || '',
        };
      });

      return {
        id: `plat-${platformCounter}`,
        name: p.name || `Platform ${platformCounter}`,
        abbreviation: (p.abbreviation || `P${platformCounter}`).toUpperCase().slice(0, 6),
        bars,
        rationale: p.rationale || '',
      };
    });

    // Parse updates to existing BARs
    const updates: ExistingBarUpdate[] = [];
    if (parsed.updates && existingContext) {
      // Build a lookup from barId to existing BAR info
      const barLookup = new Map<string, { path: string; name: string; platformName: string }>();
      for (const p of existingContext.platforms) {
        for (const b of p.bars) {
          barLookup.set(b.id, { path: b.path, name: b.name, platformName: p.name });
        }
      }

      for (const u of parsed.updates) {
        const bar = barLookup.get(u.barId);
        if (bar) {
          const addRepoUrls = (u.addRepos || []).map(repoName => {
            const repo = repoMap.get(repoName);
            return repo ? repo.url : '';
          }).filter(Boolean);

          if (addRepoUrls.length > 0) {
            updates.push({
              barPath: bar.path,
              barName: bar.name,
              platformName: bar.platformName,
              addRepos: addRepoUrls,
              rationale: u.rationale || '',
            });
            for (const repoName of u.addRepos) {
              assignedRepos.add(repoName);
            }
          }
        }
      }
    }

    // Collect unassigned repos — include explicitly unassigned + any repos not mentioned
    const unassigned: OrgRepo[] = [];
    const explicitUnassigned = parsed.unassigned || [];
    for (const repoName of explicitUnassigned) {
      const repo = repoMap.get(repoName);
      if (repo) {
        unassigned.push(repo);
        assignedRepos.add(repoName);
      }
    }

    // Any repos not referenced at all go to unassigned
    for (const repo of repos) {
      if (!assignedRepos.has(repo.name)) {
        unassigned.push(repo);
      }
    }

    return {
      platforms,
      unassigned,
      ...(updates.length > 0 ? { updates } : {}),
    };
  }
}
