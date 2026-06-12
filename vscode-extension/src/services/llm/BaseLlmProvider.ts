import type { LlmProvider, RctroPrompt, TechStack } from '../../types';
import { buildRctroPrompt } from './LlmService';
import { parseRctroResponse } from './RctroParser';

/**
 * Template-method base for every RCTRO provider (VsCodeLm / Claude / OpenAI).
 *
 * The three providers differ only in *how* they call their model — the
 * RCTRO prompt assembly (`buildRctroPrompt`, including the `## Repository
 * Context` grounding block) and the response parsing (`parseRctroResponse`)
 * are identical. Centralizing them here keeps each concrete provider down to
 * its one model-specific method and avoids the parallel-implementation
 * duplication the architecture-fitness check guards against.
 */
export abstract class BaseLlmProvider implements LlmProvider {
  abstract readonly name: string;

  async generateRctro(
    description: string,
    techStack: TechStack,
    promptPackContents: string[],
    existingRctro?: RctroPrompt,
    modelOverride?: string,
    repoContext?: string
  ): Promise<RctroPrompt> {
    const { systemPrompt, userContent } = buildRctroPrompt(
      description, techStack, promptPackContents, existingRctro, repoContext
    );
    const text = await this.callModel(systemPrompt, userContent, modelOverride);
    return parseRctroResponse(text);
  }

  /** Send the assembled system + user prompt to the concrete model and return
   *  its raw text response (parsing is handled by the base class). */
  protected abstract callModel(
    systemPrompt: string,
    userContent: string,
    modelOverride?: string
  ): Promise<string>;
}
