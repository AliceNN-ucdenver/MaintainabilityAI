import * as vscode from 'vscode';
import { createIssueCommand } from './commands/createIssue';
import { scaffoldRepoCommand } from './commands/scaffoldRepo';
import { browsePromptPacksCommand } from './commands/browsePromptPacks';
import { configureSecretsCommand, SecretsTarget } from './commands/configureSecrets';
import { openScorecardCommand } from './commands/openScorecard';
import { lookingGlassCommand } from './commands/lookingGlass';
import { oraculumCommand } from './commands/oraculum';
import { bugReportCommand } from './commands/bugReport';

import { checkPrerequisitesOnActivation } from './services/PrerequisiteChecker';
import { configService } from './services/ConfigService';
import { FolderStateService } from './services/FolderStateService';
import { promptPackService } from './services/PromptPackService';
import { ActionsTreeProvider } from './views/ActionsTreeProvider';
import { GovernanceTreeProvider } from './views/GovernanceTreeProvider';
import { ScaffoldPanel } from './webview/ScaffoldPanel';
import { logger } from './utils/Logger';
import type { WhiteRabbitBreadcrumb } from './types';

export function activate(context: vscode.ExtensionContext) {
  try {
    // Initialize cross-cutting infrastructure
    logger.initialize(context);
    configService.initialize(context);
    FolderStateService.initialize(context.workspaceState);
    promptPackService.initialize(context.extensionPath);
    logger.info('MaintainabilityAI activated');

    // Check for required CLI tools (gh, git) — non-blocking warning
    checkPrerequisitesOnActivation();

    // Register sidebar tree views
    const governanceProvider = new GovernanceTreeProvider();
    const actionsProvider = new ActionsTreeProvider();
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider('maintainabilityai.governance', governanceProvider),
      vscode.window.registerTreeDataProvider('maintainabilityai.actions', actionsProvider)
    );

    // Recover from workspace switch after White Rabbit "Down the Rabbit Hole".
    // LookingGlassPanel writes a breadcrumb to globalState before calling
    // vscode.openFolder, which restarts the extension host. We pick it up here
    // and auto-open ScaffoldPanel in the new workspace.
    const breadcrumb = context.globalState.get<WhiteRabbitBreadcrumb>(
      'maintainabilityai.whiteRabbitBreadcrumb',
    );
    if (breadcrumb) {
      context.globalState.update('maintainabilityai.whiteRabbitBreadcrumb', undefined);
      setTimeout(() => {
        ScaffoldPanel.createOrShow(context, breadcrumb.componentContext);
      }, 1000);
    }

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'maintainabilityai.createIssue',
        () => createIssueCommand(context)
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.scaffoldRepo',
        (folderPath?: string) => scaffoldRepoCommand(context, folderPath)
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.browsePromptPacks',
        () => browsePromptPacksCommand(context)
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.configureSecrets',
        (target?: SecretsTarget, folderPath?: string) => configureSecretsCommand(target, folderPath)
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.openScorecard',
        (folderPath?: string) => openScorecardCommand(context, folderPath)
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.lookingGlass',
        (barPath?: string, activeReview?: import('./types').ActiveReviewInfo) => lookingGlassCommand(context, barPath, activeReview)
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.oraculum',
        (barPath?: string) => oraculumCommand(context, barPath)
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.bugReport',
        () => bugReportCommand(context)
      ),
    );

    // Bug report status bar icon
    const bugItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    bugItem.text = '$(bug)';
    bugItem.tooltip = 'MaintainabilityAI: Report a Bug';
    bugItem.command = 'maintainabilityai.bugReport';
    bugItem.show();
    context.subscriptions.push(bugItem);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`MaintainabilityAI failed to activate: ${msg}`);
    throw err; // re-throw so VS Code knows activation failed
  }
}

export function deactivate() {}
