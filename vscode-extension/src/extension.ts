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
