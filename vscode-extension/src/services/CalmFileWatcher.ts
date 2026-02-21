// CalmFileWatcher — watches *.arch.json for external changes
// Includes echo suppression to avoid reacting to our own writes

import * as vscode from 'vscode';
import * as fs from 'fs';
import { computeHash } from './CalmWriteService';

export type CalmFileChangedCallback = (filePath: string) => void;

export class CalmFileWatcher {
  private watcher: vscode.FileSystemWatcher | null = null;
  private lastWrittenHash = new Map<string, string>();
  private callback: CalmFileChangedCallback | null = null;

  /**
   * Start watching *.arch.json files for changes.
   * The callback fires only for external changes (not our own writes).
   */
  start(callback: CalmFileChangedCallback): void {
    this.callback = callback;

    this.watcher = vscode.workspace.createFileSystemWatcher('**/*.arch.json');

    this.watcher.onDidChange(uri => this.onFileChanged(uri));
    this.watcher.onDidCreate(uri => this.onFileChanged(uri));
    this.watcher.onDidDelete(uri => {
      // Clear any cached hash for deleted files
      this.lastWrittenHash.delete(uri.fsPath);
    });
  }

  /**
   * Mark a file as recently written by us (echo suppression).
   * Call this immediately after CalmWriteService writes a file.
   */
  markWritten(filePath: string, contentHash: string): void {
    this.lastWrittenHash.set(filePath, contentHash);
  }

  /**
   * Stop watching and clean up resources.
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }
    this.lastWrittenHash.clear();
    this.callback = null;
  }

  private onFileChanged(uri: vscode.Uri): void {
    const filePath = uri.fsPath;

    // Read the current file content and compute hash
    let currentHash: string;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      currentHash = computeHash(content);
    } catch {
      // File might be temporarily unavailable
      return;
    }

    // Echo suppression: if the hash matches our last write, skip
    const lastHash = this.lastWrittenHash.get(filePath);
    if (lastHash && lastHash === currentHash) {
      // This is our own write — suppress
      return;
    }

    // External change detected — notify
    this.lastWrittenHash.delete(filePath);
    this.callback?.(filePath);
  }
}
