import * as vscode from 'vscode';
import { createIssueCommand } from './commands/createIssue';
import { scaffoldRepoCommand } from './commands/scaffoldRepo';
import { browsePromptPacksCommand } from './commands/browsePromptPacks';
import { configureSecretsCommand, SecretsTarget } from './commands/configureSecrets';
import { openScorecardCommand } from './commands/openScorecard';
import { lookingGlassCommand } from './commands/lookingGlass';
import { oraculumCommand } from './commands/oraculum';

import { checkPrerequisitesOnActivation } from './services/PrerequisiteChecker';
import { ActionsTreeProvider } from './views/ActionsTreeProvider';
import { GovernanceTreeProvider } from './views/GovernanceTreeProvider';
import { ScaffoldPanel } from './webview/ScaffoldPanel';
import { IssueCreatorPanel } from './webview/IssueCreatorPanel';

export function activate(context: vscode.ExtensionContext) {
  // Check for required CLI tools (gh, git) — non-blocking warning
  checkPrerequisitesOnActivation();

  // Register sidebar tree views
  const governanceProvider = new GovernanceTreeProvider();
  const actionsProvider = new ActionsTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('maintainabilityai.governance', governanceProvider),
    vscode.window.registerTreeDataProvider('maintainabilityai.actions', actionsProvider)
  );

  // Re-attach scaffold panel if it survived an extension host restart
  // (e.g. updateWorkspaceFolders converting single-folder → multi-root)
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer('maintainabilityai.scaffold', {
      async deserializeWebviewPanel(panel: vscode.WebviewPanel) {
        ScaffoldPanel.revive(panel, context);
      },
    })
  );

  // Recover from extension host restart after scaffold → "Create Component Feature"
  // (updateWorkspaceFolders single→multi-root restarts the extension host)
  const pending = context.globalState.get<{
    description: string;
    packs: import('./types').PromptPackSelection;
    repoUrl: string;
    stack?: import('./types').TechStack;
  }>('maintainabilityai.pendingIssueCreation');
  if (pending) {
    console.log('[activate] recovering pendingIssueCreation: repoUrl=%s, hasPacks=%s, hasDescription=%s',
      pending.repoUrl, !!pending.packs, !!pending.description);
    context.globalState.update('maintainabilityai.pendingIssueCreation', undefined);
    // Delay to let the workspace settle after restart
    setTimeout(() => {
      console.log('[activate] opening IssueCreatorPanel from pending state');
      IssueCreatorPanel.createOrShow(
        context,
        pending.description,
        pending.packs,
        pending.repoUrl,
        pending.stack,
      );
    }, 1000);
  } else {
    console.log('[activate] no pendingIssueCreation in workspace state');
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'maintainabilityai.createIssue',
      () => createIssueCommand(context)
    ),
    vscode.commands.registerCommand(
      'maintainabilityai.scaffoldRepo',
      () => scaffoldRepoCommand(context)
    ),
    vscode.commands.registerCommand(
      'maintainabilityai.browsePromptPacks',
      () => browsePromptPacksCommand(context)
    ),
    vscode.commands.registerCommand(
      'maintainabilityai.configureSecrets',
      (target?: SecretsTarget) => configureSecretsCommand(target)
    ),
    vscode.commands.registerCommand(
      'maintainabilityai.openScorecard',
      () => openScorecardCommand(context)
    ),
    vscode.commands.registerCommand(
      'maintainabilityai.lookingGlass',
      (barPath?: string, activeReview?: import('./types').ActiveReviewInfo) => lookingGlassCommand(context, barPath, activeReview)
    ),
    vscode.commands.registerCommand(
      'maintainabilityai.oraculum',
      (barPath?: string) => oraculumCommand(context, barPath)
    ),
  );
}

export function deactivate() {}
