import * as vscode from 'vscode';

interface GovernanceItem {
  label: string;
  command: string;
  icon: string;
  args?: unknown[];
}

const GOVERNANCE_ACTIONS: GovernanceItem[] = [
  {
    label: 'Looking Glass',
    command: 'maintainabilityai.lookingGlass',
    icon: 'eye',
  },
  {
    label: 'Oraculum',
    command: 'maintainabilityai.oraculum',
    icon: 'telescope',
  },
  {
    label: 'Repository Secrets',
    command: 'maintainabilityai.configureSecrets',
    icon: 'lock',
    args: ['governance'],
  },
];

class GovernanceTreeItem extends vscode.TreeItem {
  constructor(item: GovernanceItem) {
    super(item.label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(item.icon);
    this.command = {
      command: item.command,
      title: item.label,
      arguments: item.args,
    };
  }
}

export class GovernanceTreeProvider implements vscode.TreeDataProvider<GovernanceTreeItem> {
  getTreeItem(element: GovernanceTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): GovernanceTreeItem[] {
    return GOVERNANCE_ACTIONS.map(a => new GovernanceTreeItem(a));
  }
}
