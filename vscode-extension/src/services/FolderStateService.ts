import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Singleton service that manages shared folder selection state across all panels.
 * Uses workspaceState for persistence and an EventEmitter for cross-panel sync.
 */
export class FolderStateService {
  private static instance: FolderStateService;
  private readonly workspaceState: vscode.Memento;

  private readonly _onDidChangeFolder = new vscode.EventEmitter<string>();
  readonly onDidChangeFolder = this._onDidChangeFolder.event;

  private static readonly KEY = 'maintainabilityai.selectedFolder';

  private constructor(workspaceState: vscode.Memento) {
    this.workspaceState = workspaceState;
  }

  static initialize(workspaceState: vscode.Memento): FolderStateService {
    if (!FolderStateService.instance) {
      FolderStateService.instance = new FolderStateService(workspaceState);
    }
    return FolderStateService.instance;
  }

  static getInstance(): FolderStateService {
    if (!FolderStateService.instance) {
      throw new Error('FolderStateService not initialized. Call initialize() first.');
    }
    return FolderStateService.instance;
  }

  /** Get the persisted selected folder, or fall back to the first git workspace folder. */
  getSelectedFolder(): string | undefined {
    const stored = this.workspaceState.get<string>(FolderStateService.KEY);
    if (stored && this.isStillInWorkspace(stored)) {
      return stored;
    }
    // Fallback: first workspace folder with .git
    const folders = vscode.workspace.workspaceFolders || [];
    const gitFolder = folders.find(f => {
      try { return fs.existsSync(path.join(f.uri.fsPath, '.git')); }
      catch { return false; }
    });
    return gitFolder?.uri.fsPath || folders[0]?.uri.fsPath;
  }

  /** Update the selected folder and notify all listeners. No-op if value unchanged. */
  setSelectedFolder(folderPath: string): void {
    const current = this.workspaceState.get<string>(FolderStateService.KEY);
    if (current === folderPath) { return; }
    this.workspaceState.update(FolderStateService.KEY, folderPath);
    this._onDidChangeFolder.fire(folderPath);
  }

  /** Get git-repo workspace folders for dropdown rendering. */
  getWorkspaceFolders(): { name: string; path: string }[] {
    return (vscode.workspace.workspaceFolders || [])
      .filter(f => {
        try { return fs.existsSync(path.join(f.uri.fsPath, '.git')); }
        catch { return true; }
      })
      .map(f => ({ name: f.name, path: f.uri.fsPath }));
  }

  private isStillInWorkspace(folderPath: string): boolean {
    const folders = vscode.workspace.workspaceFolders || [];
    return folders.some(f => f.uri.fsPath === folderPath);
  }

  dispose(): void {
    this._onDidChangeFolder.dispose();
  }
}
