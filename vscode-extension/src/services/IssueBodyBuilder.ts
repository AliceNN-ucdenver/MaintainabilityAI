import type { IssueCreationRequest, PromptPackContent, RctroPrompt } from '../types';
import { configService } from './ConfigService';

const BODY_SAFE_LIMIT = 60_000; // leave headroom below GitHub's 65,536 char limit
const MAX_PACK_CONTENT_CHARS = 8_000; // per-pack content cap

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

    // Add default pack (always included) as a collapsible section
    const defaultPacks = packContents.filter(p => p.category === 'default');
    if (defaultPacks.length > 0) {
      body += this.renderCollapsibleSection(
        '🛡️', 'Security-First Baseline (Always Included)', defaultPacks, '📋'
      );
    }

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
    const metadataBlock = `
<details>
<summary>📊 Additional Metadata</summary>

- **Created**: ${timestamp}
- **Extension Version**: MaintainabilityAI VS Code Extension v0.1.0
- **Repository**: ${request.repo.owner}/${request.repo.repo}
- **Labels**: ${labels.join(', ')}
- **Tech Stack**: ${request.techStack.language}, ${request.techStack.runtime}, ${request.techStack.framework}

</details>
`;

    // Truncate body if it would exceed GitHub's limit
    if (body.length + metadataBlock.length > BODY_SAFE_LIMIT) {
      body = body.slice(0, BODY_SAFE_LIMIT - metadataBlock.length - 200);
      body += '\n\n> **Note:** Prompt pack content was truncated to stay within GitHub\'s 65 KB issue body limit.\n';
    }

    body += metadataBlock;

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
      let content = pack.content;
      if (content.length > MAX_PACK_CONTENT_CHARS) {
        content = content.slice(0, MAX_PACK_CONTENT_CHARS) + '\n\n*... (truncated)*';
      }
      section += `
<details>
<summary>${innerIcon} <strong>${pack.name}</strong></summary>

${content}

</details>

`;
    }

    section += `
</details>

`;

    return section;
  }

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
}
