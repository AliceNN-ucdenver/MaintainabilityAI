import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

export interface ToolStatus {
  name: string;
  command: string;
  installed: boolean;
  version?: string;
  installUrl: string;
  required: boolean;
}

const TOOLS: Array<{
  name: string;
  command: string;
  versionArgs: string[];
  installUrl: string;
  required: boolean;
}> = [
  {
    name: 'GitHub CLI',
    command: 'gh',
    versionArgs: ['--version'],
    installUrl: 'https://cli.github.com/',
    required: true,
  },
  {
    name: 'Git',
    command: 'git',
    versionArgs: ['--version'],
    installUrl: 'https://git-scm.com/',
    required: true,
  },
];

async function checkTool(tool: typeof TOOLS[number]): Promise<ToolStatus> {
  try {
    const { stdout } = await execFileAsync(tool.command, tool.versionArgs, {
      timeout: 5000,
    });
    const version = stdout.trim().split('\n')[0];
    return {
      name: tool.name,
      command: tool.command,
      installed: true,
      version,
      installUrl: tool.installUrl,
      required: tool.required,
    };
  } catch {
    return {
      name: tool.name,
      command: tool.command,
      installed: false,
      installUrl: tool.installUrl,
      required: tool.required,
    };
  }
}

export async function checkAllPrerequisites(): Promise<ToolStatus[]> {
  return Promise.all(TOOLS.map(checkTool));
}

export async function checkGhCli(): Promise<ToolStatus> {
  return checkTool(TOOLS[0]);
}

/**
 * Require a specific tool before proceeding. Shows an error with install link if missing.
 * Returns true if the tool is available.
 */
export async function requireTool(command: string): Promise<boolean> {
  const tool = TOOLS.find(t => t.command === command);
  if (!tool) {
    return false;
  }

  const status = await checkTool(tool);
  if (status.installed) {
    return true;
  }

  const install = 'Install';
  const result = await vscode.window.showErrorMessage(
    `${status.name} (${status.command}) is required but not installed.`,
    install
  );
  if (result === install) {
    vscode.env.openExternal(vscode.Uri.parse(status.installUrl));
  }
  return false;
}

/**
 * Check all prerequisites on activation and warn about missing tools.
 */
export async function checkPrerequisitesOnActivation(): Promise<void> {
  const results = await checkAllPrerequisites();
  const missing = results.filter(r => !r.installed && r.required);

  if (missing.length === 0) {
    return;
  }

  const names = missing.map(m => `${m.name} (${m.command})`).join(', ');
  const install = 'Show Details';
  const result = await vscode.window.showWarningMessage(
    `MaintainabilityAI: Missing prerequisite(s): ${names}`,
    install
  );

  if (result === install) {
    const detail = missing
      .map(m => `- **${m.name}** (\`${m.command}\`): Install from ${m.installUrl}`)
      .join('\n');

    const doc = await vscode.workspace.openTextDocument({
      content: `# MaintainabilityAI — Missing Prerequisites\n\n${detail}\n\nInstall the missing tools and reload VS Code.\n`,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
  }
}
