import * as vscode from 'vscode';
import { ScorecardPanel } from '../webview/ScorecardPanel';
import { FolderStateService } from '../services/FolderStateService';

/**
 * "Create Issue" — opens the Security Scorecard and auto-opens its inline
 * Rabbit Hole sheet in Create-feature mode (Cheshire v2; the standalone
 * IssueCreatorPanel was retired).
 */
export function createIssueCommand(context: vscode.ExtensionContext) {
  const folderPath = FolderStateService.getInstance().getSelectedFolder();
  ScorecardPanel.createOrShow(context, folderPath, {
    taskKind: 'rctro-feature',
    heading: 'Create feature',
    description: '',
    packs: { owasp: [], maintainability: [], threatModeling: [] },
  });
}
