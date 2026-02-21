import * as vscode from 'vscode';
import { GitHubService } from '../services/GitHubService';
import { MeshService } from '../services/MeshService';
import { requireTool } from '../services/PrerequisiteChecker';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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

/**
 * Detect the governance mesh repo (owner/repo) from the configured mesh path.
 * Uses git remote origin URL, same pattern as OracularPanel.detectMeshRepo().
 */
async function detectGovernanceRepo(): Promise<{ owner: string; repo: string } | null> {
  const meshPath = MeshService.getMeshPath();
  if (!meshPath) { return null; }

  try {
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: meshPath });
    const url = stdout.trim();
    const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch {
    // No git remote — mesh is local only
  }
  return null;
}

/**
 * Detect the workspace repo (owner/repo) from the open folder's git remote.
 */
async function detectWorkspaceRepo(): Promise<{ owner: string; repo: string } | null> {
  const github = new GitHubService();
  const repoInfo = await github.detectRepo();
  if (!repoInfo) { return null; }
  return { owner: repoInfo.owner, repo: repoInfo.repo };
}

export type SecretsTarget = 'governance' | 'workspace';

export async function configureSecretsCommand(target?: SecretsTarget) {
  // gh CLI is required for setting repo secrets
  if (!(await requireTool('gh'))) {
    return;
  }

  const github = new GitHubService();

  // Resolve the target repo based on context
  let repo: { owner: string; repo: string } | null = null;
  let repoLabel: string;

  if (target === 'governance') {
    repo = await detectGovernanceRepo();
    repoLabel = 'Governance Mesh';
    if (!repo) {
      vscode.window.showErrorMessage(
        'No governance mesh repo detected. Configure a mesh path (with a GitHub remote) in Settings first.'
      );
      return;
    }
  } else if (target === 'workspace') {
    repo = await detectWorkspaceRepo();
    repoLabel = 'Workspace';
    if (!repo) {
      vscode.window.showErrorMessage(
        'No GitHub repository detected. Open a workspace with a GitHub remote first.'
      );
      return;
    }
  } else {
    // No target specified — detect both and let the user pick
    const govRepo = await detectGovernanceRepo();
    const wsRepo = await detectWorkspaceRepo();

    const choices: { label: string; description: string; value: SecretsTarget; repo: { owner: string; repo: string } }[] = [];
    if (govRepo) {
      choices.push({
        label: `$(telescope) Governance Mesh — ${govRepo.owner}/${govRepo.repo}`,
        description: 'Oraculum review workflows',
        value: 'governance',
        repo: govRepo,
      });
    }
    if (wsRepo) {
      choices.push({
        label: `$(folder) Workspace — ${wsRepo.owner}/${wsRepo.repo}`,
        description: 'CI/CD and app workflows',
        value: 'workspace',
        repo: wsRepo,
      });
    }

    if (choices.length === 0) {
      vscode.window.showErrorMessage(
        'No GitHub repositories detected. Open a workspace or configure a mesh path with a GitHub remote.'
      );
      return;
    }

    const picked = await vscode.window.showQuickPick(choices, {
      placeHolder: 'Which repository should receive the secrets?',
      title: 'MaintainabilityAI — Select Target Repository',
    });
    if (!picked) { return; }

    repo = picked.repo;
    repoLabel = picked.value === 'governance' ? 'Governance Mesh' : 'Workspace';
  }

  // Let user pick which secrets to configure
  const selected = await vscode.window.showQuickPick(SECRETS, {
    canPickMany: true,
    placeHolder: `Select secrets to configure for ${repo.owner}/${repo.repo}`,
    title: `$(lock) ${repoLabel} Secrets — ${repo.owner}/${repo.repo}`,
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
          title: `$(lock) Target: ${repo.owner}/${repo.repo}`,
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
        prompt: `Enter your ${secret.label} → ${repo.owner}/${repo.repo}`,
        placeHolder: secret.prefix ? `${secret.prefix}api3-...` : 'Paste your API key here',
        password: true,
        title: `$(lock) Target: ${repo.owner}/${repo.repo}`,
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
        title: `$(lock) Target: ${repo.owner}/${repo.repo}`,
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
          title: `Setting ${secret.envName} on ${repo.owner}/${repo.repo}...`,
          cancellable: false,
        },
        async () => {
          await github.setRepoSecret(
            repo.owner,
            repo.repo,
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
      `$(lock) Configured ${configured} secret(s) on ${repo.owner}/${repo.repo}.`
    );
  }
}
