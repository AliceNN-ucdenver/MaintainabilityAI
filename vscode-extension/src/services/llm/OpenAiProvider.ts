import OpenAI from 'openai';
import type { LlmProvider, RctroPrompt, TechStack } from '../../types';
import { RCTRO_SYSTEM_PROMPT } from './LlmService';
import { TechStackDetector } from '../TechStackDetector';

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
    return this.parseRctroResponse(text);
  }

  private parseRctroResponse(text: string): RctroPrompt {
    // Strategy 1: extract from ```json ... ``` code fence
    let jsonStr: string | undefined;
    const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n\s*```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    // Strategy 2: find the outermost { ... } brace pair
    if (!jsonStr) {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = text.substring(firstBrace, lastBrace + 1);
      }
    }

    if (!jsonStr) {
      throw new Error(`Failed to parse LLM response as RCTRO JSON — no JSON found. Raw response:\n${text.substring(0, 500)}`);
    }

    try {
      const parsed = JSON.parse(jsonStr);
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
    } catch (err) {
      throw new Error(`Failed to parse LLM response as RCTRO JSON. Error: ${err instanceof Error ? err.message : String(err)}\nRaw response:\n${text.substring(0, 500)}`);
    }
  }
}
