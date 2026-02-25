import * as vscode from 'vscode';
import { handleError } from '../utils/errors';

/**
 * Abstract base class that eliminates shared boilerplate across all webview panels.
 *
 * @template TWebviewMsg  Union type for messages FROM the webview (incoming)
 * @template TExtMsg      Union type for messages TO the webview (outgoing)
 */
export abstract class BasePanel<TWebviewMsg, TExtMsg> {
  protected readonly panel: vscode.WebviewPanel;
  protected readonly context: vscode.ExtensionContext;
  protected readonly disposables: vscode.Disposable[] = [];

  protected constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
  ) {
    this.panel = panel;
    this.context = context;

    // Note: getHtmlContent() is called before subclass fields are initialized.
    // This is safe because all implementations are purely functional
    // (they only use webview, extensionUri, and getNonce() — no instance fields).
    this.panel.webview.html = this.getHtmlContent(panel.webview, context.extensionUri);

    this.panel.webview.onDidReceiveMessage(
      (msg: TWebviewMsg) => this.handleMessage(msg),
      null,
      this.disposables,
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /** Send a typed message to the webview. */
  protected postMessage(message: TExtMsg): void {
    this.panel.webview.postMessage(message);
  }

  /** Log error via Logger and send an error message to the webview. */
  protected handleAndNotifyError(context: string, err: unknown): void {
    const message = handleError(context, err);
    this.postMessage({ type: 'error', message: `${context}: ${message}` } as TExtMsg);
  }

  /** Return the full HTML string for this panel's webview. */
  protected abstract getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string;

  /** Route an incoming webview message to the appropriate handler. */
  protected abstract handleMessage(message: TWebviewMsg): void;

  /**
   * Clear the static `currentPanel` reference on the subclass.
   * Each subclass must implement this because static fields are per-class.
   */
  protected abstract clearCurrentPanel(): void;

  /**
   * Override to clean up panel-specific resources (timers, watchers, monitors).
   * Called at the beginning of dispose(), before the panel and disposables are torn down.
   */
  protected onDispose(): void {}

  private dispose(): void {
    this.onDispose();
    this.clearCurrentPanel();
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      d?.dispose();
    }
  }
}
