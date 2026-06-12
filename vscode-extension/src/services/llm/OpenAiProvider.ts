import OpenAI from 'openai';
import { BaseLlmProvider } from './BaseLlmProvider';

export class OpenAiProvider extends BaseLlmProvider {
  readonly name = 'OpenAI';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o';
  }

  protected async callModel(systemPrompt: string, userContent: string, modelOverride?: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: modelOverride || this.model,
      max_tokens: 16384,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    });

    return response.choices[0]?.message?.content || '';
  }
}
