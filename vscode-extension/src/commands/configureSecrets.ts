import * as vscode from 'vscode';
import { GitHubService } from '../services/GitHubService';
import { requireTool } from '../services/PrerequisiteChecker';
import {
  SECRETS,
  detectGovernanceRepo,
  detectWorkspaceRepo,
  type SecretDefinition,
  type SecretsTarget,
} from '../services/SecretsService';
import { handleError } from '../utils/errors';
import { logger } from '../utils/Logger';

export type { SecretsTarget };

export async function configureSecretsCommand(target?: SecretsTarget, folderPath?: string) {
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
        'No governance mesh repo detected. Configure a mesh path (with a GitHub remote) in Settings first.',
      );
      return;
    }
  } else if (target === 'workspace') {
    // Use the provided folder path for accurate repo detection
    if (folderPath) {
      const repoInfo = await github.detectRepoForFolder(folderPath);
      repo = repoInfo ? { owner: repoInfo.owner, repo: repoInfo.repo } : null;
    } else {
      repo = await detectWorkspaceRepo();
    }
    repoLabel = 'Workspace';
    if (!repo) {
      vscode.window.showErrorMessage(
        'No GitHub repository detected. Open a workspace with a GitHub remote first.',
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
        'No GitHub repositories detected. Open a workspace or configure a mesh path with a GitHub remote.',
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
  const pickItems = SECRETS.map(s => ({
    ...s,
    label: s.label,
    description: s.description,
    picked: s.picked,
  }));

  const selected = await vscode.window.showQuickPick(pickItems, {
    canPickMany: true,
    placeHolder: `Select secrets to configure for ${repo.owner}/${repo.repo}`,
    title: `$(lock) ${repoLabel} Secrets — ${repo.owner}/${repo.repo}`,
  });

  if (!selected || selected.length === 0) {
    return;
  }

  let configured = 0;

  for (const secret of selected as (SecretDefinition & vscode.QuickPickItem)[]) {
    const apiKey = await promptForKey(secret, repo);
    if (!apiKey) { continue; }

    await promptSaveLocally(secret, apiKey, repo);

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Setting ${secret.envName} on ${repo.owner}/${repo.repo}...`,
          cancellable: false,
        },
        async () => {
          await github.setRepoSecret(repo.owner, repo.repo, secret.envName, apiKey);
        },
      );
      configured++;
      logger.info(`Set secret ${secret.envName} on ${repo.owner}/${repo.repo}`);
    } catch (err) {
      handleError(`Failed to set ${secret.envName}`, err, { showNotification: true });
    }
  }

  if (configured > 0) {
    vscode.window.showInformationMessage(
      `$(lock) Configured ${configured} secret(s) on ${repo.owner}/${repo.repo}.`,
    );
  }
}

// ---- UI helpers (private to this command) ----

async function promptForKey(
  secret: SecretDefinition,
  repo: { owner: string; repo: string },
): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration();
  const existingValue = secret.settingKey
    ? config.get<string>(secret.settingKey, '')
    : '';

  if (existingValue) {
    const useExisting = await vscode.window.showQuickPick(
      [
        { label: 'Use existing key from settings', value: 'existing' },
        { label: 'Enter a new key', value: 'new' },
      ],
      {
        placeHolder: `${secret.label}: Found key in VS Code settings. Use it or enter a new one?`,
        title: `$(lock) Target: ${repo.owner}/${repo.repo}`,
      },
    );

    if (!useExisting) { return undefined; }
    if (useExisting.value === 'existing') { return existingValue; }
  }

  return vscode.window.showInputBox({
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
}

async function promptSaveLocally(
  secret: SecretDefinition,
  apiKey: string,
  repo: { owner: string; repo: string },
): Promise<void> {
  if (!secret.settingKey) { return; }

  const saveLocally = await vscode.window.showQuickPick(
    [
      { label: 'Yes — save to VS Code settings too', value: 'yes' },
      { label: 'No — only set as repo secret', value: 'no' },
    ],
    {
      placeHolder: `Also save ${secret.label} to VS Code settings for local LLM use?`,
      title: `$(lock) Target: ${repo.owner}/${repo.repo}`,
    },
  );

  if (saveLocally?.value === 'yes') {
    const config = vscode.workspace.getConfiguration();
    await config.update(secret.settingKey, apiKey, vscode.ConfigurationTarget.Global);
  }
}
