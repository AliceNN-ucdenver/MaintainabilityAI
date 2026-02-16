import * as vscode from 'vscode';
import { ScorecardPanel } from '../webview/ScorecardPanel';

export function openScorecardCommand(context: vscode.ExtensionContext) {
  ScorecardPanel.createOrShow(context);
}
