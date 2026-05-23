// Extension entrypoint for the MaintainabilityAI VS Code surface.
// Bug V (Codex round-6) ships narrowed workflow allowlist + persona-
// prompt self_review signing — see packages/research-runner/src/runner/skills.ts.
import * as vscode from 'vscode';
import { createIssueCommand } from './commands/createIssue';
import { scaffoldRepoCommand } from './commands/scaffoldRepo';
import { browsePromptPacksCommand } from './commands/browsePromptPacks';
import { configureSecretsCommand, SecretsTarget } from './commands/configureSecrets';
import { openScorecardCommand } from './commands/openScorecard';
import { lookingGlassCommand } from './commands/lookingGlass';
import { oraculumCommand } from './commands/oraculum';
import { bugReportCommand } from './commands/bugReport';
import { createResearchRequestCommand, type CreateResearchRequestPrefill } from './commands/createResearchRequest';
import { NewResearchPanel, type PrefillInputs } from './webview/NewResearchPanel';
import { ActiveRunsPanel } from './webview/ActiveRunsPanel';
import { ResearchLibraryPanel } from './webview/ResearchLibraryPanel';
import { ActiveRunsService } from './services/ActiveRunsService';
import { RunStatusTailer } from './services/RunStatusTailer';
import { RunNotificationService } from './services/RunNotificationService';
import type { AgentKind } from './services/ResearchPreflightService';

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
    const activeRunsSvc = ActiveRunsService.initialize(context);
    // Start the tailer so any persisted in-flight runs from a prior session
    // get refreshed on activation. Disposed in deactivate().
    RunStatusTailer.start(activeRunsSvc);
    // Surface toasts for run state transitions (dispatch / pass / fail /
    // blocked). Attaches to ActiveRunsService internally.
    RunNotificationService.start(activeRunsSvc);
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
      vscode.commands.registerCommand(
        'maintainabilityai.newResearch',
        (agent?: AgentKind, prefill?: PrefillInputs) =>
          NewResearchPanel.createOrShow(context, agent ?? 'archeologist', prefill ?? null),
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.activeRuns',
        () => ActiveRunsPanel.createOrShow(context)
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.researchLibrary',
        () => ResearchLibraryPanel.createOrShow(context)
      ),
      vscode.commands.registerCommand(
        'maintainabilityai.createResearchRequest',
        (prefill?: CreateResearchRequestPrefill) => createResearchRequestCommand(prefill ?? {})
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

export function deactivate() {
  RunStatusTailer.stop();
  RunNotificationService.stop();
}
