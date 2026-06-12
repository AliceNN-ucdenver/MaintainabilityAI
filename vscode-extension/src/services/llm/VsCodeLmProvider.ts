import * as vscode from 'vscode';
import { BaseLlmProvider } from './BaseLlmProvider';

export class VsCodeLmProvider extends BaseLlmProvider {
  readonly name = 'VS Code Language Model (Copilot)';

  /**
   * Resolve a usable chat model: the caller's override, then the configured
   * `preferredFamily`, then common fallbacks, then ANY available model.
   *
   * `selectChatModels({ family })` returns `[]` whenever that exact family
   * isn't in the user's Copilot model set, so the previous single hardcoded
   * `family: 'codex'` filter threw "no LM available" even when the VS Code LM
   * was present and serving other families (gpt-4o, claude-sonnet, …). This
   * mirrors `ThreatModelService.selectModel()` so every LM caller degrades the
   * same way.
   */
  private async selectModel(modelOverride?: string): Promise<vscode.LanguageModelChat> {
    const preferred = modelOverride
      || vscode.workspace.getConfiguration('maintainabilityai.llm').get<string>('preferredFamily', 'gpt-4o');
    const families = [preferred, 'gpt-4o', 'gpt-4', 'codex', 'claude-sonnet']
      .filter((v, i, a) => a.indexOf(v) === i);

    for (const family of families) {
      const models = await vscode.lm.selectChatModels({ family });
      if (models.length > 0) { return models[0]; }
    }

    // Fallback: any available model (the family filter matched nothing).
    const allModels = await vscode.lm.selectChatModels();
    if (allModels.length > 0) { return allModels[0]; }

    throw new Error(
      'No VS Code Language Model available. Ensure GitHub Copilot is installed and signed in, and that you have access to a chat model (Copilot Chat).'
    );
  }

  protected async callModel(systemPrompt: string, userContent: string, modelOverride?: string): Promise<string> {
    const model = await this.selectModel(modelOverride);
    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userContent),
    ];

    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

    let text = '';
    for await (const chunk of response.text) {
      text += chunk;
    }
    return text;
  }
}
