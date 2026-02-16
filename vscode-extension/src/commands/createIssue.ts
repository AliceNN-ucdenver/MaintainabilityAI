import * as vscode from 'vscode';
import { IssueCreatorPanel } from '../webview/IssueCreatorPanel';

export function createIssueCommand(context: vscode.ExtensionContext) {
  IssueCreatorPanel.createOrShow(context);
}
