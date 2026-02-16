import * as vscode from 'vscode';
import { ScaffoldPanel } from '../webview/ScaffoldPanel';

export async function scaffoldRepoCommand(context: vscode.ExtensionContext) {
  ScaffoldPanel.createOrShow(context);
}
