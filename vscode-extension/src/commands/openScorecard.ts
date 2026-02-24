import * as vscode from 'vscode';
import { ScorecardPanel } from '../webview/ScorecardPanel';

export function openScorecardCommand(context: vscode.ExtensionContext, folderPath?: string) {
  ScorecardPanel.createOrShow(context, folderPath);
}
