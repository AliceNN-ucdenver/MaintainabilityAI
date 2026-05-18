/**
 * Pure helpers that build the title + body for a research-request
 * issue. Split out from ResearchRequestService so they're testable
 * without the vscode runtime — the service imports githubService
 * (which imports vscode), but these builders touch nothing external.
 *
 * The body format mirrors the regex contracts in
 * code-templates/workflows/archeologist.yml:
 *   scope: <platform|bar>
 *   scope_id: <id>     (required — portfolio scope was removed)
 *   path: <research|archaeology>
 *   target_repo: <owner/repo>   (archaeology only)
 *
 * Anything outside those keyed lines is preserved as freeform brief
 * context the synthesis prompt picks up.
 */

export type ResearchPath = 'research' | 'archaeology';
export type ScopeLevel = 'platform' | 'bar';

export interface ResearchRequestBrief {
  brief: string;
  scope: { level: ScopeLevel; id: string };
  path: ResearchPath;
  targetRepo?: string;
  derivedFrom?: string;
}

export function buildResearchRequestBody(b: ResearchRequestBrief): string {
  const lines: string[] = [];
  if (b.derivedFrom) {
    lines.push(`> Derived from: ${b.derivedFrom}`);
    lines.push('');
  }
  lines.push(b.brief.trim());
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Run metadata');
  lines.push('');
  lines.push(`scope: ${b.scope.level}`);
  if (b.scope.id) {
    lines.push(`scope_id: ${b.scope.id}`);
  }
  lines.push(`path: ${b.path}`);
  if (b.path === 'archaeology' && b.targetRepo) {
    lines.push(`target_repo: ${b.targetRepo}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function buildResearchRequestTitle(brief: string): string {
  const firstLine = brief.split('\n').find(l => l.trim().length > 0)?.trim() ?? 'Research request';
  const stripped = firstLine.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '');
  const sliced = stripped.length > 80 ? stripped.slice(0, 77) + '…' : stripped;
  return `Research request: ${sliced}`;
}
