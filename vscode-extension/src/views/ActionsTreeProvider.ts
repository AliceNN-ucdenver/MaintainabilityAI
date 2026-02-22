import * as vscode from 'vscode';

interface ActionItem {
  label: string;
  command: string;
  icon: string;
  args?: unknown[];
}

const ACTIONS: ActionItem[] = [
  {
    label: 'Scaffold SDLC Structure',
    command: 'maintainabilityai.scaffoldRepo',
    icon: 'rocket',
  },
  {
    label: 'Security Scorecard',
    command: 'maintainabilityai.openScorecard',
    icon: 'shield',
  },
  {
    label: 'Rabbit Hole',
    command: 'maintainabilityai.createIssue',
    icon: 'issues',
  },
  {
    label: 'Prompt Packs',
    command: 'maintainabilityai.browsePromptPacks',
    icon: 'book',
  },
  {
    label: 'Repository Secrets',
    command: 'maintainabilityai.configureSecrets',
    icon: 'lock',
    args: ['workspace'],
  },
];

class ActionTreeItem extends vscode.TreeItem {
  constructor(action: ActionItem) {
    super(action.label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(action.icon);
    this.command = {
      command: action.command,
      title: action.label,
      arguments: action.args,
    };
  }
}

export class ActionsTreeProvider implements vscode.TreeDataProvider<ActionTreeItem> {
  getTreeItem(element: ActionTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ActionTreeItem[] {
    return ACTIONS.map(a => new ActionTreeItem(a));
  }
}
