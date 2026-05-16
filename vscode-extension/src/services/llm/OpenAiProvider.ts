import OpenAI from 'openai';
import type { LlmProvider, RctroPrompt, TechStack } from '../../types';
import { RCTRO_SYSTEM_PROMPT } from './LlmService';
import { TechStackDetector } from '../TechStackDetector';
import { parseRctroResponse } from './RctroParser';

export class OpenAiProvider implements LlmProvider {
  readonly name = 'OpenAI';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o';
  }

  async generateRctro(
    description: string,
    techStack: TechStack,
    promptPackContents: string[],
    existingRctro?: RctroPrompt,
    modelOverride?: string
  ): Promise<RctroPrompt> {
    const detector = new TechStackDetector();
    const stackContext = detector.formatForContext(techStack);

    const systemPrompt = RCTRO_SYSTEM_PROMPT.replace(
      '{promptPackContents}',
      promptPackContents.length > 0
        ? promptPackContents.join('\n\n---\n\n')
        : '(No prompt packs selected — generate general security requirements)'
    );

    let userMessage = `## Tech Stack\n${stackContext}\n\n## Feature Description\n${description}`;

    if (existingRctro) {
      userMessage += `\n\n## Previous RCTRO (refine this based on the description above)\n${JSON.stringify(existingRctro, null, 2)}`;
    }

    const response = await this.client.chat.completions.create({
      model: modelOverride || this.model,
      max_tokens: 16384,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message?.content || '';
    return parseRctroResponse(text);
  }
}
