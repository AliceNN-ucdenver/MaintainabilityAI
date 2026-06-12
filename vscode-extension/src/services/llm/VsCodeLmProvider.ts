import * as vscode from 'vscode';
import { BaseLlmProvider } from './BaseLlmProvider';

export class VsCodeLmProvider extends BaseLlmProvider {
  readonly name = 'VS Code Language Model (Copilot)';

  protected async callModel(systemPrompt: string, userContent: string, modelOverride?: string): Promise<string> {
    const family = modelOverride || 'codex';
    const models = await vscode.lm.selectChatModels({ family });
    if (models.length === 0) {
      throw new Error(
        'No VS Code Language Model available. Ensure GitHub Copilot is installed and signed in, or switch to the Claude/OpenAI provider in settings.'
      );
    }

    const model = models[0];
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
