import * as vscode from 'vscode';
import type { LlmProvider, RctroPrompt, TechStack } from '../../types';
import { RCTRO_SYSTEM_PROMPT } from './LlmService';
import { TechStackDetector } from '../TechStackDetector';

export class VsCodeLmProvider implements LlmProvider {
  readonly name = 'VS Code Language Model (Copilot)';

  async generateRctro(
    description: string,
    techStack: TechStack,
    promptPackContents: string[],
    existingRctro?: RctroPrompt,
    modelOverride?: string
  ): Promise<RctroPrompt> {
    const family = modelOverride || 'codex';
    const models = await vscode.lm.selectChatModels({ family });
    if (models.length === 0) {
      throw new Error(
        'No VS Code Language Model available. Ensure GitHub Copilot is installed and signed in, or switch to the Claude/OpenAI provider in settings.'
      );
    }

    const model = models[0];
    const detector = new TechStackDetector();
    const stackContext = detector.formatForContext(techStack);

    const systemPrompt = RCTRO_SYSTEM_PROMPT.replace(
      '{promptPackContents}',
      promptPackContents.length > 0
        ? promptPackContents.join('\n\n---\n\n')
        : '(No prompt packs selected — generate general security requirements)'
    );

    let userContent = `## Tech Stack\n${stackContext}\n\n## Feature Description\n${description}`;

    if (existingRctro) {
      userContent += `\n\n## Previous RCTRO (refine this)\n${JSON.stringify(existingRctro, null, 2)}`;
    }

    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(userContent),
    ];

    const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

    let text = '';
    for await (const chunk of response.text) {
      text += chunk;
    }

    return this.parseRctroResponse(text);
  }

  private parseRctroResponse(text: string): RctroPrompt {
    const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return {
        title: parsed.title || undefined,
        role: parsed.role || '',
        context: parsed.context || '',
        task: parsed.task || '',
        requirements: Array.isArray(parsed.requirements)
          ? parsed.requirements.map((r: Record<string, unknown>) => ({
              title: String(r.title || ''),
              details: Array.isArray(r.details) ? r.details.map(String) : [],
              validation: String(r.validation || ''),
            }))
          : [],
        output: parsed.output || '',
      };
    } catch {
      throw new Error(`Failed to parse LLM response as RCTRO JSON. Raw response:\n${text.substring(0, 500)}`);
    }
  }
}
