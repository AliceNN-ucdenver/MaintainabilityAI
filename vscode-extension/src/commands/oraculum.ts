import * as vscode from 'vscode';
import { OracularPanel } from '../webview/OracularPanel';

export function oraculumCommand(context: vscode.ExtensionContext, barPath?: string) {
  OracularPanel.createOrShow(context, barPath);
}
