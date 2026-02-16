import * as vscode from 'vscode';
import { PromptPackService } from '../services/PromptPackService';

export async function browsePromptPacksCommand(context: vscode.ExtensionContext) {
  const service = new PromptPackService(context.extensionPath);
  const packs = service.getAllPacks();

  const categories = [
    { label: 'OWASP Top 10', description: 'Security vulnerability prompt packs', id: 'owasp' },
    { label: 'Maintainability', description: 'Code quality and architecture patterns', id: 'maintainability' },
    { label: 'Threat Modeling (STRIDE)', description: 'STRIDE threat analysis prompts', id: 'threat-modeling' },
  ] as const;

  const categoryPick = await vscode.window.showQuickPick(
    categories.map(c => ({ label: c.label, description: c.description, id: c.id })),
    { placeHolder: 'Select a prompt pack category to browse' }
  );

  if (!categoryPick) {
    return;
  }

  const categoryPacks = packs.filter(p => p.category === categoryPick.id);
  const packPick = await vscode.window.showQuickPick(
    categoryPacks.map(p => ({ label: p.name, description: p.filename, id: p.id })),
    { placeHolder: `Select a ${categoryPick.label} prompt pack to view` }
  );

  if (!packPick) {
    return;
  }

  const content = service.getPackContent(packPick.id);
  if (content) {
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc, { preview: true });
  }
}
