import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/Logger';

const GITHUB_ISSUES_URL = 'https://github.com/AliceNN-ucdenver/MaintainabilityAI/issues/new';

export async function bugReportCommand(context: vscode.ExtensionContext): Promise<void> {
  const logText = logger.exportLog();

  if (!logText || logText.trim().length === 0) {
    vscode.window.showInformationMessage(
      'No log entries to report. Use the extension first, then try again.',
    );
    return;
  }

  // Write log to temp file in global storage so user can attach it
  const storageDir = context.globalStorageUri.fsPath;
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  const logFileName = `bug-report-${Date.now()}.log`;
  const logFilePath = path.join(storageDir, logFileName);
  fs.writeFileSync(logFilePath, logText, 'utf8');

  // Copy log to clipboard for easy paste
  await vscode.env.clipboard.writeText(logText);

  // Open the log file in editor so user can review / redact before submitting
  const doc = await vscode.workspace.openTextDocument(logFilePath);
  await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: true });

  // Open pre-filled GitHub issue — log is on clipboard for paste into the body
  const title = encodeURIComponent('Bug Report');
  const body = encodeURIComponent(
    '## Description\n\n<!-- Describe the issue -->\n\n'
    + '## Steps to Reproduce\n\n1. \n2. \n3. \n\n'
    + '## Extension Log\n\n'
    + '<!-- The extension log has been copied to your clipboard. Paste it here: -->\n\n'
    + '```\n\n```\n',
  );
  await vscode.env.openExternal(
    vscode.Uri.parse(`${GITHUB_ISSUES_URL}?title=${title}&body=${body}&labels=bug`),
  );

  vscode.window.showInformationMessage(
    'Extension log copied to clipboard. Paste it into the GitHub issue.',
    'Show Output Log',
  ).then(action => {
    if (action === 'Show Output Log') { logger.show(); }
  });
}
