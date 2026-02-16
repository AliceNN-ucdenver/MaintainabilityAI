import Anthropic from '@anthropic-ai/sdk';
import type { LlmProvider, RctroPrompt, TechStack } from '../../types';
import { RCTRO_SYSTEM_PROMPT } from './LlmService';
import { TechStackDetector } from '../TechStackDetector';

export class ClaudeProvider implements LlmProvider {
  readonly name = 'Claude (Anthropic)';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-opus-4-6';
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

    const response = await this.client.messages.create({
      model: modelOverride || this.model,
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    return this.parseRctroResponse(text);
  }

  private parseRctroResponse(text: string): RctroPrompt {
    // Strip markdown code fences if present
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
