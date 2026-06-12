import Anthropic from '@anthropic-ai/sdk';
import { BaseLlmProvider } from './BaseLlmProvider';

export class ClaudeProvider extends BaseLlmProvider {
  readonly name = 'Claude (Anthropic)';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-opus-4-6';
  }

  protected async callModel(systemPrompt: string, userContent: string, modelOverride?: string): Promise<string> {
    const response = await this.client.messages.create({
      model: modelOverride || this.model,
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');
  }
}
