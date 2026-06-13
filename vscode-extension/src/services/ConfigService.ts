import * as vscode from 'vscode';

class ConfigService implements vscode.Disposable {
  private cache = new Map<string, unknown>();
  private disposable: vscode.Disposable | undefined;

  /** Called once from activate(). */
  initialize(context: vscode.ExtensionContext): void {
    this.disposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('maintainabilityai')) {
        this.cache.clear();
      }
    });
    context.subscriptions.push(this);
  }

  dispose(): void {
    this.disposable?.dispose();
    this.cache.clear();
  }

  // ---- LLM settings ----
  // Cheshire v2 runs a single engine (the VS Code Language Model / Copilot).
  // The Anthropic/OpenAI provider + its `llm.provider` / `llm.claudeApiKey` /
  // `llm.openaiApiKey` / `llm.model` settings were retired with the @claude path.

  get preferredFamily(): string {
    return this.get<string>('llm.preferredFamily', 'gpt-4o');
  }

  // ---- Mesh settings ----

  get meshPath(): string {
    return this.get<string>('mesh.path', '');
  }

  async setMeshPath(value: string): Promise<void> {
    await vscode.workspace
      .getConfiguration('maintainabilityai')
      .update('mesh.path', value, vscode.ConfigurationTarget.Global);
  }

  // ---- GitHub settings ----

  get defaultLabels(): string[] {
    return this.get<string[]>('github.defaultLabels', ['maintainabilityai', 'rctro-feature']);
  }

  // ---- Monitor settings ----

  get pollIntervalSeconds(): number {
    const raw = this.get<number>('monitor.pollIntervalSeconds', 12);
    return Math.max(5, Math.min(60, raw));
  }

  // ---- Internal ----

  private get<T>(key: string, defaultValue: T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    const config = vscode.workspace.getConfiguration('maintainabilityai');
    const value = config.get<T>(key, defaultValue);
    this.cache.set(key, value);
    return value;
  }
}

/** Singleton config service. Call configService.initialize(context) in activate(). */
export const configService = new ConfigService();
