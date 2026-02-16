import * as vscode from 'vscode';
import type { IssueCreationRequest, PromptPackContent, RctroPrompt } from '../types';

export class IssueBodyBuilder {
  build(request: IssueCreationRequest): string {
    const { title, rctroPrompt, packContents, labels } = request;
    const timestamp = new Date().toISOString();

    const categoryLabels = labels
      .filter(l => l.startsWith('owasp/') || l.startsWith('maintainability/') || l.startsWith('stride/'))
      .join(', ');

    let body = `## 🎯 Feature: ${title}

**Created by**: MaintainabilityAI VS Code Extension
**Created**: ${timestamp}
**Categories**: ${categoryLabels || 'General'}

---

### 📋 RCTRO Prompt

${this.renderRctro(rctroPrompt)}

---

`;

    // Add collapsible prompt pack sections (mirrors process-codeql-results.js format)
    const owaspPacks = packContents.filter(p => p.category === 'owasp');
    const maintPacks = packContents.filter(p => p.category === 'maintainability');
    const stridePacks = packContents.filter(p => p.category === 'threat-modeling');

    if (owaspPacks.length > 0) {
      body += this.renderCollapsibleSection(
        '📘', 'OWASP Security Guidance', owaspPacks, '🔒'
      );
    }

    if (maintPacks.length > 0) {
      body += this.renderCollapsibleSection(
        '🏗️', 'Maintainability Guidance', maintPacks, '📐'
      );
    }

    if (stridePacks.length > 0) {
      body += this.renderCollapsibleSection(
        '🎯', 'Threat Model Analysis (STRIDE)', stridePacks, '🎭'
      );
    }

    // Implementation Zone (supports both Claude and Copilot)
    body += `
---

## 🤖 Implementation Zone

**Option A — Assign to Claude** (2-phase: plan → approve → implement):

\`\`\`
@claude Please analyze this feature request and provide an implementation plan following the RCTRO prompt and security guidelines above.
\`\`\`

After reviewing the plan: \`@claude approved\`

**Option B — Assign to Copilot**: Assign this issue to Copilot. The RCTRO prompt above serves as the implementation spec.

---

`;

    // Metadata (collapsed)
    body += `
<details>
<summary>📊 Additional Metadata</summary>

- **Created**: ${timestamp}
- **Extension Version**: MaintainabilityAI VS Code Extension v0.1.0
- **Repository**: ${request.repo.owner}/${request.repo.repo}
- **Labels**: ${labels.join(', ')}
- **Tech Stack**: ${request.techStack.language}, ${request.techStack.runtime}, ${request.techStack.framework}

</details>
`;

    return body;
  }

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

  private renderCollapsibleSection(
    icon: string,
    title: string,
    packs: PromptPackContent[],
    innerIcon: string
  ): string {
    let section = `
<details>
<summary>${icon} <strong>${title}</strong> (${packs.length} ${packs.length === 1 ? 'guide' : 'guides'})</summary>

`;

    for (const pack of packs) {
      section += `
<details>
<summary>${innerIcon} <strong>${pack.name}</strong></summary>

${pack.content}

</details>

`;
    }

    section += `
</details>

`;

    return section;
  }

  generateLabels(request: IssueCreationRequest): string[] {
    const config = vscode.workspace
      .getConfiguration('maintainabilityai.github')
      .get<string[]>('defaultLabels', ['maintainabilityai', 'rctro-feature']);

    const labels = [...config];

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
}
