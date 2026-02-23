// ============================================================================
// Shared utilities for pillar detail renderers
// ============================================================================

export interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

export interface ThreatEntry {
  id: string;
  category: string;
  target: string;
  targetName: string;
  dataClassification: string;
  description: string;
  attackVector: string;
  impact: string;
  likelihood: string;
  existingControls: string[];
  controlEffectiveness: string;
  residualRisk: string;
  recommendedMitigations: string[];
  nistReferences: string[];
}

export interface ThreatModelResult {
  threats: ThreatEntry[];
  summary: {
    totalThreats: number;
    byCategory: Record<string, number>;
    byRisk: Record<string, number>;
    unmitigatedCount: number;
  };
  mermaidDiagram: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Lightweight markdown → HTML renderer (safe — escapes HTML first). */
export function renderMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Code blocks (``` ... ```) — must come before inline code
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: var(--vscode-textLink-foreground);">$1</a>');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h5 style="margin: 8px 0 4px;">$1</h5>');
  html = html.replace(/^### (.+)$/gm, '<h4 style="margin: 8px 0 4px;">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="margin: 8px 0 4px;">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3 style="margin: 10px 0 4px;">$1</h3>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid var(--vscode-panel-border); margin: 8px 0;" />');

  // Checkboxes
  html = html.replace(/^- \[x\] (.+)$/gm, '<div style="margin: 2px 0;">&#9745; $1</div>');
  html = html.replace(/^- \[ \] (.+)$/gm, '<div style="margin: 2px 0;">&#9744; $1</div>');

  // Unordered list items
  html = html.replace(/^- (.+)$/gm, '<div style="margin: 2px 0; padding-left: 12px;">&bull; $1</div>');

  // Ordered list items
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="margin: 2px 0; padding-left: 12px;">$1. $2</div>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left: 3px solid var(--vscode-panel-border); padding-left: 10px; color: var(--vscode-descriptionForeground); margin: 4px 0;">$1</blockquote>');

  // Tables
  html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) { return tableBlock; }
    const isSeparator = (row: string) => /^\|[\s:-]+\|/.test(row.replace(/<[^>]+>/g, ''));
    const hasSeparator = isSeparator(rows[1]);
    let tableHtml = '<table>';
    for (let i = 0; i < rows.length; i++) {
      if (i === 1 && hasSeparator) { continue; }
      const cells = rows[i].split('|').filter((_c, idx, arr) => idx > 0 && idx < arr.length - 1);
      const tag = (i === 0 && hasSeparator) ? 'th' : 'td';
      const rowHtml = cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('');
      if (i === 0 && hasSeparator) { tableHtml += `<thead><tr>${rowHtml}</tr></thead><tbody>`; }
      else { tableHtml += `<tr>${rowHtml}</tr>`; }
    }
    if (hasSeparator) { tableHtml += '</tbody>'; }
    tableHtml += '</table>';
    return tableHtml;
  });

  // Line breaks
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}
