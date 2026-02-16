import * as vscode from 'vscode';
import { createIssueCommand } from './commands/createIssue';
import { scaffoldRepoCommand } from './commands/scaffoldRepo';
import { browsePromptPacksCommand } from './commands/browsePromptPacks';
import { configureSecretsCommand } from './commands/configureSecrets';
import { openScorecardCommand } from './commands/openScorecard';
import { checkPrerequisitesOnActivation } from './services/PrerequisiteChecker';
import { ActionsTreeProvider } from './views/ActionsTreeProvider';

export function activate(context: vscode.ExtensionContext) {
  // Check for required CLI tools (gh, git) — non-blocking warning
  checkPrerequisitesOnActivation();

  // Register the sidebar tree view
  const actionsProvider = new ActionsTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('maintainabilityai.actions', actionsProvider)
  );

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
      () => configureSecretsCommand()
    ),
    vscode.commands.registerCommand(
      'maintainabilityai.openScorecard',
      () => openScorecardCommand(context)
    )
  );
}

export function deactivate() {}
