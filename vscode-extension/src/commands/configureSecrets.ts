import * as vscode from 'vscode';
import { GitHubService } from '../services/GitHubService';
import { requireTool } from '../services/PrerequisiteChecker';

interface SecretItem extends vscode.QuickPickItem {
  id: string;
  envName: string;
  settingKey?: string;
  prefix?: string;
}

const SECRETS: SecretItem[] = [
  {
    id: 'anthropic',
    envName: 'ANTHROPIC_API_KEY',
    settingKey: 'maintainabilityai.llm.claudeApiKey',
    prefix: 'sk-ant-',
    label: 'Anthropic API Key',
    description: 'ANTHROPIC_API_KEY — Required for Claude Code workflows',
    picked: true,
  },
  {
    id: 'openai',
    envName: 'OPENAI_API_KEY',
    settingKey: 'maintainabilityai.llm.openaiApiKey',
    prefix: 'sk-',
    label: 'OpenAI API Key',
    description: 'OPENAI_API_KEY — For OpenAI-powered workflows',
  },
];

export async function configureSecretsCommand() {
  // gh CLI is required for setting repo secrets
  if (!(await requireTool('gh'))) {
    return;
  }

  const github = new GitHubService();

  // Detect current repo
  const repoInfo = await github.detectRepo();
  if (!repoInfo) {
    vscode.window.showErrorMessage(
      'No GitHub repository detected. Open a workspace with a GitHub remote first.'
    );
    return;
  }

  // Let user pick which secrets to configure
  const selected = await vscode.window.showQuickPick(SECRETS, {
    canPickMany: true,
    placeHolder: `Select secrets to configure for ${repoInfo.owner}/${repoInfo.repo}`,
    title: 'MaintainabilityAI — Configure Repository Secrets',
  });

  if (!selected || selected.length === 0) {
    return;
  }

  let configured = 0;

  for (const secret of selected) {
    // Check if there's already a value in VS Code settings
    const config = vscode.workspace.getConfiguration();
    const existingValue = secret.settingKey
      ? config.get<string>(secret.settingKey, '')
      : '';

    let apiKey: string | undefined;

    if (existingValue) {
      const useExisting = await vscode.window.showQuickPick(
        [
          { label: 'Use existing key from settings', value: 'existing' },
          { label: 'Enter a new key', value: 'new' },
        ],
        {
          placeHolder: `${secret.label}: Found key in VS Code settings. Use it or enter a new one?`,
        }
      );

      if (!useExisting) {
        continue;
      }

      if (useExisting.value === 'existing') {
        apiKey = existingValue;
      }
    }

    if (!apiKey) {
      apiKey = await vscode.window.showInputBox({
        prompt: `Enter your ${secret.label}`,
        placeHolder: secret.prefix ? `${secret.prefix}api3-...` : 'Paste your API key here',
        password: true,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'API key cannot be empty';
          }
          if (secret.prefix && !value.startsWith(secret.prefix)) {
            return `Key should start with "${secret.prefix}"`;
          }
          return undefined;
        },
      });

      if (!apiKey) {
        continue;
      }
    }

    // Also save to VS Code settings for local LLM use
    const saveLocally = await vscode.window.showQuickPick(
      [
        { label: 'Yes — save to VS Code settings too', value: 'yes' },
        { label: 'No — only set as repo secret', value: 'no' },
      ],
      {
        placeHolder: `Also save ${secret.label} to VS Code settings for local LLM use?`,
      }
    );

    if (saveLocally?.value === 'yes' && secret.settingKey) {
      await config.update(secret.settingKey, apiKey, vscode.ConfigurationTarget.Global);
    }

    // Set as GitHub repo secret
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Setting ${secret.envName} on ${repoInfo.owner}/${repoInfo.repo}...`,
          cancellable: false,
        },
        async () => {
          await github.setRepoSecret(
            repoInfo.owner,
            repoInfo.repo,
            secret.envName,
            apiKey
          );
        }
      );
      configured++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(
        `Failed to set ${secret.envName}: ${message}`
      );
    }
  }

  if (configured > 0) {
    vscode.window.showInformationMessage(
      `Configured ${configured} secret(s) on ${repoInfo.owner}/${repoInfo.repo}. ` +
      'The alice-remediation workflow can now use these keys.'
    );
  }
}
