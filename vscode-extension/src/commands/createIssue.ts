import * as vscode from 'vscode';
import { IssueCreatorPanel } from '../webview/IssueCreatorPanel';
import { FolderStateService } from '../services/FolderStateService';

export function createIssueCommand(context: vscode.ExtensionContext) {
  const folderPath = FolderStateService.getInstance().getSelectedFolder();
  IssueCreatorPanel.createOrShow(context, undefined, undefined, undefined, undefined, folderPath);
}
