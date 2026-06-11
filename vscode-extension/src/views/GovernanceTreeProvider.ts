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
  // (Oraculum entry removed — the panel is retired; reviews run inline on the
  // BAR page via the Review button → Run Governed Review sheet.)
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
