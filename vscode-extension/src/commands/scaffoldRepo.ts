import * as vscode from 'vscode';
import { ScaffoldPanel } from '../webview/ScaffoldPanel';
import { FolderStateService } from '../services/FolderStateService';

export async function scaffoldRepoCommand(context: vscode.ExtensionContext, folderPath?: string) {
  const resolved = folderPath || FolderStateService.getInstance().getSelectedFolder();
  ScaffoldPanel.createOrShow(context, undefined, resolved);
}
