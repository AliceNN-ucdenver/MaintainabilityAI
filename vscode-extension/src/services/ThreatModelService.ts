// ============================================================================
// ThreatModelService — LLM-powered STRIDE threat model generation
// Reads BAR context (app.yaml, CALM files) and generates structured threats
// ============================================================================

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { ThreatEntry, ThreatModelResult } from '../types';
import { transformThreatsToMermaid } from './CalmTransformer';

// ============================================================================
// Input Gathering
// ============================================================================

interface ThreatModelInput {
  appYaml: string;
  barArch: string;
  decoratorJson?: string;
  /** Org's NIST SP 800-53 controls catalog from mesh policies/ */
  nistControlsYaml?: string;
}

function readThreatModelInput(barPath: string): ThreatModelInput | null {
  const appYamlPath = path.join(barPath, 'app.yaml');
  if (!fs.existsSync(appYamlPath)) { return null; }

  const appYaml = fs.readFileSync(appYamlPath, 'utf-8');

  const archDir = path.join(barPath, 'architecture');
  let barArch = '';
  let decoratorJson: string | undefined;

  const barArchPath = path.join(archDir, 'bar.arch.json');
  if (fs.existsSync(barArchPath)) {
    barArch = fs.readFileSync(barArchPath, 'utf-8');
  }

  const decoratorPath = path.join(archDir, 'decorator.json');
  if (fs.existsSync(decoratorPath)) {
    decoratorJson = fs.readFileSync(decoratorPath, 'utf-8');
  }

  if (!barArch) { return null; }

  // Read org's NIST control catalog from mesh policies/ if available
  // BAR path is: meshRoot/platforms/<plat>/bars/<app> — walk up 4 levels
  let nistControlsYaml: string | undefined;
  const meshRoot = path.resolve(barPath, '..', '..', '..', '..');
  const nistPath = path.join(meshRoot, 'policies', 'nist-800-53-controls.yaml');
  if (fs.existsSync(nistPath)) {
    nistControlsYaml = fs.readFileSync(nistPath, 'utf-8');
  }

  return { appYaml, barArch, decoratorJson, nistControlsYaml };
}

// ============================================================================
// Mermaid Diagram Sanitizer
// ============================================================================

/**
 * Post-process LLM-generated Mermaid diagrams to fix common syntax issues.
 * LLMs frequently produce node IDs with hyphens, HTML in labels, or
 * incorrect arrow syntax that causes Mermaid parse errors.
 */
function sanitizeMermaidDiagram(diagram: string): string {
  const lines = diagram.split('\n');
  const sanitized: string[] = [];

  for (const line of lines) {
    let fixed = line;

    // Fix HTML tags in labels — strip <b>, </b>, <br/>, <br>
    fixed = fixed.replace(/<\/?b>/g, '');
    fixed = fixed.replace(/<br\s*\/?>/g, ', ');

    // Fix quoted dotted arrow labels: -. "text" .-> becomes -.->|text|
    fixed = fixed.replace(/-\.\s*"([^"]+)"\s*\.->/g, '-.->|$1|');

    // Fix node IDs with hyphens: replace hyphens in IDs but not inside labels/strings
    fixed = fixNodeIdHyphens(fixed);

    // Replace pipe chars inside node labels — pipes break Mermaid parsing.
    // Handles ("..."), ["..."], and bare (...) / [...] labels.
    fixed = sanitizeLabelPipes(fixed);

    sanitized.push(fixed);
  }

  return sanitized.join('\n');
}

/**
 * Replace pipe characters inside Mermaid node label regions with a safe
 * separator (middle dot). Pipes inside edge label syntax (-->|text|) are
 * left alone since they are valid Mermaid.
 */
function sanitizeLabelPipes(line: string): string {
  // Replace pipes inside ("...") and ["..."] quoted labels
  let result = line.replace(/\("([^"]+)"\)/g, (_m, label: string) =>
    `("${label.replace(/\|/g, '\u00B7')}")`,
  );
  result = result.replace(/\["([^"]+)"\]/g, (_m, label: string) =>
    `["${label.replace(/\|/g, '\u00B7')}"]`,
  );

  // Replace pipes inside unquoted (...) node labels — but NOT inside -->|...|
  // Strategy: match parenthesised labels that follow a node ID (word chars)
  result = result.replace(/(\w)\(([^)]+)\)/g, (_m, pre: string, label: string) => {
    // Only sanitize if there's actually a pipe
    if (!label.includes('|')) { return _m; }
    return `${pre}(${label.replace(/\|/g, '\u00B7')})`;
  });

  return result;
}

/**
 * Replace hyphens with underscores in Mermaid node IDs while preserving
 * hyphens inside label strings (text within quotes, parens, brackets).
 */
function fixNodeIdHyphens(line: string): string {
  const trimmed = line.trim();

  // Skip lines that are pure comments or empty
  if (!trimmed || trimmed.startsWith('%%')) { return line; }

  // Skip style lines — only fix the node ID part after 'style'
  if (trimmed.startsWith('style ')) {
    const parts = line.match(/^(\s*style\s+)(\S+)(.*)/);
    if (parts) {
      const [, prefix, nodeId, rest] = parts;
      return prefix + nodeId.replace(/-/g, '_') + rest;
    }
    return line;
  }

  // For subgraph lines: `subgraph node-id[Label]`
  if (trimmed.startsWith('subgraph ')) {
    const subgraphMatch = line.match(/^(\s*subgraph\s+)([^\s[]+)(.*)/);
    if (subgraphMatch) {
      const [, prefix, nodeId, rest] = subgraphMatch;
      return prefix + nodeId.replace(/-/g, '_') + rest;
    }
    return line;
  }

  // For general lines, replace hyphens in node IDs that appear before
  // shape delimiters or arrow operators. We use a token-based approach:
  // Split on label regions (inside quotes, parens with quotes, brackets)
  // and only replace hyphens in non-label regions.
  let result = '';
  let inLabel = false;
  let labelChar = '';
  let depth = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inLabel) {
      result += ch;
      if (ch === labelChar && (labelChar === '"' || labelChar === "'" || labelChar === '|')) {
        inLabel = false;
      } else if (labelChar === '(' && ch === '(') {
        depth++;
      } else if (labelChar === '(' && ch === ')') {
        depth--;
        if (depth === 0) { inLabel = false; }
      } else if (labelChar === '[' && ch === '[') {
        depth++;
      } else if (labelChar === '[' && ch === ']') {
        depth--;
        if (depth === 0) { inLabel = false; }
      }
    } else {
      if (ch === '"' || ch === "'") {
        inLabel = true;
        labelChar = ch;
        result += ch;
      } else if (ch === '|') {
        // Pipe-delimited label in arrow syntax: -->|label|
        inLabel = true;
        labelChar = '|';
        result += ch;
      } else if (ch === '(' || ch === '[') {
        inLabel = true;
        labelChar = ch;
        depth = 1;
        result += ch;
      } else if (ch === '-') {
        // Check if this is an arrow operator (-->, -.-, ->, etc.) or a hyphen in an ID
        const rest = line.substring(i);
        if (
          rest.startsWith('-->') || rest.startsWith('->') ||
          rest.startsWith('-.') || rest.startsWith('-.-') ||
          rest.startsWith('---')
        ) {
          // Arrow syntax — keep as-is
          result += ch;
        } else {
          // Hyphen in a node ID — replace with underscore
          result += '_';
        }
      } else {
        result += ch;
      }
    }
  }

  return result;
}

// ============================================================================
// LLM Prompt
// ============================================================================

function buildSystemPrompt(): string {
  return `You are a security architect performing a STRIDE threat model analysis on a CALM (Common Architecture Language Model) architecture.

## Input
You will receive:
1. app.yaml — application metadata (criticality, lifecycle, repos)
2. bar.arch.json — unified CALM architecture containing actors, systems, services, databases, networks, all relationships (interacts, composed-of, connects), controls, and data flows
3. Existing Mermaid diagrams of the architecture (as reference for building the threat diagram)

## Task
1. Analyze the architecture and produce a comprehensive STRIDE threat model.
2. Generate a Mermaid threat diagram that overlays threats onto the logical architecture.

For each threat, identify:
- Which STRIDE category it belongs to
- Which node(s) or relationship(s) are affected (use the exact unique-id from the CALM JSON)
- The data classification of affected components
- Whether existing controls mitigate the threat
- Residual risk after controls

## Threat Diagram Instructions
Generate a Mermaid flowchart that shows the **logical architecture** with threat annotations overlaid.

CRITICAL Mermaid syntax rules:
- ALL node IDs must use ONLY letters, numbers, and underscores. NO hyphens in IDs. Replace any hyphens with underscores (e.g. \`claims_api\` not \`claims-api\`).
- Start with \`flowchart TD\`
- Reproduce the logical architecture nodes and connections (services, databases, networks, subgraphs), but replace all hyphens in node IDs with underscores
- For each architecture node that has threats, add a **single threat badge node** listing all threat IDs targeting it
- Badge node ID format: \`thr_<node_id>\` (all underscores, no hyphens)
- Badge label format uses round parens with plain text, no HTML and NO pipe characters: \`thr_claims_api("THR-001 Spoofing, THR-005 DoS")\`
- Use commas to separate multiple threats in a badge, NEVER use pipe | characters in labels
- Use readable STRIDE category labels: Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation
- Connect each badge to its target with a dotted arrow using pipe-label syntax: \`thr_claims_api -.->|threats| claims_api\`
- Style badge nodes by highest residual risk level:
  - critical or high: \`style thr_claims_api fill:#f85149,color:#fff,stroke:#f85149\`
  - medium: \`style thr_claims_api fill:#d29922,color:#fff,stroke:#d29922\`
  - low or negligible: \`style thr_claims_api fill:#3fb950,color:#fff,stroke:#3fb950\`
- Keep all text labels short — threat IDs with readable STRIDE category names, no full descriptions
- Do NOT use trapezoid shapes, HTML tags, quoted arrow labels, or pipe | characters inside node labels

## Output Format
Return ONLY valid JSON matching this schema:
{
  "threats": [
    {
      "id": "THR-001",
      "category": "spoofing|tampering|repudiation|information-disclosure|denial-of-service|elevation-of-privilege",
      "target": "node-unique-id or relationship-unique-id",
      "target_name": "Human readable name",
      "data_classification": "PII|Confidential|Public|...",
      "description": "Detailed threat description",
      "attack_vector": "How the threat could be exploited",
      "impact": "critical|high|medium|low",
      "likelihood": "high|medium|low",
      "existing_controls": ["control-id-1", "control-id-2"],
      "control_effectiveness": "full|partial|none",
      "residual_risk": "critical|high|medium|low|negligible",
      "recommended_mitigations": ["mitigation 1", "mitigation 2"],
      "nist_references": ["IA-2", "SC-7"]
    }
  ],
  "threat_diagram": "flowchart TD\\n  ...",
  "summary": {
    "total_threats": 12,
    "by_category": { "spoofing": 2, "tampering": 3, "repudiation": 1, "information-disclosure": 3, "denial-of-service": 2, "elevation-of-privilege": 1 },
    "by_risk": { "critical": 1, "high": 3, "medium": 5, "low": 3 },
    "unmitigated_count": 4
  }
}

Generate at least 8-12 threats covering all 6 STRIDE categories. Be thorough but realistic.`;
}

function buildUserPrompt(input: ThreatModelInput): string {
  const sections: string[] = [];

  sections.push('## app.yaml\n```yaml\n' + input.appYaml + '\n```');

  if (input.barArch) {
    sections.push('## bar.arch.json\n```json\n' + input.barArch + '\n```');
  }

  if (input.decoratorJson) {
    sections.push('## decorator.json\n```json\n' + input.decoratorJson + '\n```');
  }

  // Include org's NIST control catalog so LLM references controls that actually exist
  if (input.nistControlsYaml) {
    sections.push('## Available NIST Controls (use these control IDs in nist_references)\n```yaml\n' + input.nistControlsYaml + '\n```');
  }

  return sections.join('\n\n');
}

// ============================================================================
// Service
// ============================================================================

export class ThreatModelService {
  private progressCallback: (step: string, progress: number) => void;

  constructor(progressCallback: (step: string, progress: number) => void) {
    this.progressCallback = progressCallback;
  }

  async generateThreatModel(barPath: string): Promise<ThreatModelResult> {
    // 1. Read input files (0-10%)
    this.progressCallback('Reading architecture files...', 5);
    const input = readThreatModelInput(barPath);
    if (!input) {
      throw new Error('No CALM architecture file found in BAR. Ensure bar.arch.json exists.');
    }
    this.progressCallback('Architecture files loaded', 10);

    // 2. Select LLM (10-20%)
    this.progressCallback('Connecting to AI model...', 15);
    const model = await this.selectModel();
    this.progressCallback(`Using ${model.name}`, 20);

    // 3. Call LLM (20-80%)
    this.progressCallback('Analyzing architecture for threats...', 25);
    const rawResult = await this.callLlm(model, input);

    // 4. Parse result (80-90%)
    this.progressCallback('Parsing threat model...', 85);
    const { threats, llmDiagram } = this.parseResponse(rawResult);

    // 5. Use LLM-generated diagram, fall back to programmatic if empty/invalid
    this.progressCallback('Generating threat diagram...', 90);
    let mermaidDiagram = '';
    if (llmDiagram && llmDiagram.startsWith('flowchart')) {
      mermaidDiagram = sanitizeMermaidDiagram(llmDiagram);
    } else {
      // Fallback: programmatic diagram from CalmTransformer
      let barArch = null;
      if (input.barArch) {
        try { barArch = JSON.parse(input.barArch); } catch { /* skip */ }
      }
      mermaidDiagram = transformThreatsToMermaid(threats, barArch);
    }

    // 6. Write to BAR (95-98%)
    this.progressCallback('Writing threat model to BAR...', 95);
    this.writeThreatModelYaml(barPath, threats);
    if (mermaidDiagram) {
      this.writeThreatDiagramMd(barPath, mermaidDiagram);
    }

    // 7. Build result
    const summary = this.buildSummary(threats);
    this.progressCallback('Complete', 100);

    return { threats, summary, mermaidDiagram };
  }

  private async selectModel(): Promise<vscode.LanguageModelChat> {
    const preferred = vscode.workspace.getConfiguration('maintainabilityai.llm').get<string>('preferredFamily', 'gpt-4o');
    const families = [preferred, 'gpt-4o', 'gpt-4', 'codex', 'claude-sonnet'].filter((v, i, a) => a.indexOf(v) === i);

    for (const family of families) {
      const models = await vscode.lm.selectChatModels({ family });
      if (models.length > 0) { return models[0]; }
    }

    // Fallback: any available model
    const allModels = await vscode.lm.selectChatModels();
    if (allModels.length > 0) { return allModels[0]; }

    throw new Error(
      'No VS Code Language Model available. Ensure GitHub Copilot is installed and signed in.'
    );
  }

  private async callLlm(
    model: vscode.LanguageModelChat,
    input: ThreatModelInput,
  ): Promise<string> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input);

    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userPrompt),
    ];

    const response = await model.sendRequest(
      messages,
      {},
      new vscode.CancellationTokenSource().token,
    );

    let text = '';
    let chunkCount = 0;
    for await (const chunk of response.text) {
      text += chunk;
      chunkCount++;
      if (chunkCount % 5 === 0) {
        const progress = Math.min(25 + Math.round((text.length / 5000) * 50), 80);
        this.progressCallback(`Analyzing... (${text.length.toLocaleString()} chars)`, progress);
      }
    }

    return text;
  }

  private parseResponse(text: string): { threats: ThreatEntry[]; llmDiagram: string } {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/m, '')
      .replace(/\n?```\s*$/m, '')
      .trim();

    let parsed: {
      threats: Array<{
        id: string;
        category: string;
        target: string;
        target_name: string;
        data_classification: string;
        description: string;
        attack_vector: string;
        impact: string;
        likelihood: string;
        existing_controls: string[];
        control_effectiveness: string;
        residual_risk: string;
        recommended_mitigations: string[];
        nist_references: string[];
      }>;
      threat_diagram?: string;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse AI threat model response as JSON. Raw response:\n${text.substring(0, 500)}`);
    }

    if (!parsed.threats || !Array.isArray(parsed.threats)) {
      throw new Error('AI response missing "threats" array.');
    }

    const threats = parsed.threats.map(t => ({
      id: t.id || 'THR-???',
      category: (t.category || 'spoofing') as ThreatEntry['category'],
      target: t.target || '',
      targetName: t.target_name || t.target || '',
      dataClassification: t.data_classification || '',
      description: t.description || '',
      attackVector: t.attack_vector || '',
      impact: (t.impact || 'medium') as ThreatEntry['impact'],
      likelihood: (t.likelihood || 'medium') as ThreatEntry['likelihood'],
      existingControls: t.existing_controls || [],
      controlEffectiveness: (t.control_effectiveness || 'none') as ThreatEntry['controlEffectiveness'],
      residualRisk: (t.residual_risk || 'medium') as ThreatEntry['residualRisk'],
      recommendedMitigations: t.recommended_mitigations || [],
      nistReferences: t.nist_references || [],
    }));

    // Extract LLM-generated diagram (unescape newlines from JSON string)
    const llmDiagram = (parsed.threat_diagram || '')
      .replace(/\\n/g, '\n')
      .trim();

    return { threats, llmDiagram };
  }

  private buildSummary(threats: ThreatEntry[]): ThreatModelResult['summary'] {
    const byCategory: Record<string, number> = {};
    const byRisk: Record<string, number> = {};
    let unmitigatedCount = 0;

    for (const t of threats) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byRisk[t.residualRisk] = (byRisk[t.residualRisk] || 0) + 1;
      if (t.controlEffectiveness === 'none') { unmitigatedCount++; }
    }

    return {
      totalThreats: threats.length,
      byCategory,
      byRisk,
      unmitigatedCount,
    };
  }

  private writeThreatModelYaml(barPath: string, threats: ThreatEntry[]): void {
    const securityDir = path.join(barPath, 'security');
    if (!fs.existsSync(securityDir)) { return; }

    const threatModelPath = path.join(securityDir, 'threat-model.yaml');

    const lines: string[] = [
      '# Threat Model — AI-Generated STRIDE Analysis',
      '# Generated by MaintainabilityAI Looking Glass',
      '',
      'metadata:',
      `  generated: "${new Date().toISOString().split('T')[0]}"`,
      `  method: STRIDE`,
      `  total_threats: ${threats.length}`,
      '',
      'threats:',
    ];

    for (const t of threats) {
      lines.push(`  - id: ${t.id}`);
      lines.push(`    category: ${t.category}`);
      lines.push(`    target: "${t.target}"`);
      lines.push(`    target_name: "${t.targetName}"`);
      lines.push(`    data_classification: "${t.dataClassification}"`);
      lines.push(`    description: "${t.description.replace(/"/g, '\\"')}"`);
      lines.push(`    attack_vector: "${t.attackVector.replace(/"/g, '\\"')}"`);
      lines.push(`    impact: ${t.impact}`);
      lines.push(`    likelihood: ${t.likelihood}`);
      lines.push(`    existing_controls: [${t.existingControls.map(c => `"${c}"`).join(', ')}]`);
      lines.push(`    control_effectiveness: ${t.controlEffectiveness}`);
      lines.push(`    residual_risk: ${t.residualRisk}`);
      lines.push(`    recommended_mitigations:`);
      for (const m of t.recommendedMitigations) {
        lines.push(`      - "${m.replace(/"/g, '\\"')}"`);
      }
      lines.push(`    nist_references: [${t.nistReferences.map(r => `"${r}"`).join(', ')}]`);
      lines.push('');
    }

    fs.writeFileSync(threatModelPath, lines.join('\n'), 'utf-8');
  }

  private writeThreatDiagramMd(barPath: string, mermaidDiagram: string): void {
    const securityDir = path.join(barPath, 'security');
    if (!fs.existsSync(securityDir)) { return; }

    const mdPath = path.join(securityDir, 'threat-model.md');
    const content = [
      '# Threat Model Diagram',
      '',
      '> Auto-generated by MaintainabilityAI Looking Glass — STRIDE analysis',
      '',
      '```mermaid',
      mermaidDiagram,
      '```',
      '',
    ].join('\n');

    fs.writeFileSync(mdPath, content, 'utf-8');
  }
}

// ============================================================================
// CSV Export
// ============================================================================

export function exportThreatModelCsv(result: ThreatModelResult): string {
  const headers = [
    'ID', 'Category', 'Target', 'Target Name', 'Data Classification',
    'Description', 'Attack Vector', 'Impact', 'Likelihood',
    'Existing Controls', 'Control Effectiveness', 'Residual Risk',
    'Recommended Mitigations', 'NIST References',
  ];

  const escapeCsv = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = result.threats.map(t => [
    t.id,
    t.category,
    t.target,
    t.targetName,
    t.dataClassification,
    t.description,
    t.attackVector,
    t.impact,
    t.likelihood,
    t.existingControls.join('; '),
    t.controlEffectiveness,
    t.residualRisk,
    t.recommendedMitigations.join('; '),
    t.nistReferences.join('; '),
  ].map(escapeCsv).join(','));

  return [headers.join(','), ...rows].join('\n');
}
