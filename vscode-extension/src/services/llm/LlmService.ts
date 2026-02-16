import * as vscode from 'vscode';
import type { LlmProvider, LlmProviderType, RctroPrompt, TechStack } from '../../types';
import { ClaudeProvider } from './ClaudeProvider';
import { VsCodeLmProvider } from './VsCodeLmProvider';
import { OpenAiProvider } from './OpenAiProvider';

const RCTRO_SYSTEM_PROMPT = `You are a security-first software architect generating RCTRO-formatted development prompts for the MaintainabilityAI framework.

## RCTRO Format

Generate a structured prompt with these 5 sections:

1. **Role**: Define the AI engineer's professional identity. Include the specific OWASP category and security mindset. Example: "You are a security engineer implementing OWASP A03:2021 - Injection prevention."

2. **Context**: Include the detected tech stack and relevant constraints. Be specific about libraries, versions, and patterns. Example: "Node 20 + TypeScript, PostgreSQL using pg library, Zod for validation, Jest for testing."

3. **Task**: Transform the user's feature requirement into a concrete, actionable task with security awareness built in. Be specific about what to implement and where.

4. **Requirements**: Generate one requirement per distinct feature or concern in the user's description (typically 3-8, but use as many as needed). NEVER consolidate or omit user-specified features — every distinct item the user describes must appear as its own requirement. Each requirement MUST have:
   - A bold title
   - 2-4 specific implementation details as bullet points
   - A validation checklist item: "Validation: ☐ [specific check]"
   - At least one security-specific control drawn from the reference prompt packs

5. **Output**: List the specific deliverable files (source code + tests). Use realistic file paths matching the project structure.

## Rules
- CRITICAL: Map every distinct feature, route, or component from the user's description to its own requirement. Do not merge or skip any.
- Every requirement must include a security control
- Use validation checklists (☐) for every requirement
- Reference specific OWASP patterns from the provided prompt packs
- Include test files in the output section
- Be specific: don't say "add validation" — specify the exact Zod schema or regex pattern
- Generate valid JSON matching the RctroPrompt interface

## Reference Prompt Packs
The following prompt packs provide security context. Use their patterns, checklists, and secure code examples to inform the requirements:

{promptPackContents}

## Response Format
Respond with ONLY valid JSON (no markdown code fences) matching this interface:
{
  "title": "string (concise GitHub issue title, e.g. 'feat: User authentication with JWT' — max 72 chars, use conventional commit prefix: feat/fix/refactor/security)",
  "role": "string",
  "context": "string",
  "task": "string",
  "requirements": [
    {
      "title": "string",
      "details": ["string", "string"],
      "validation": "string (the ☐ checklist item)"
    }
  ],
  "output": "string"
}`;

export class LlmService {
  private provider: LlmProvider;

  constructor() {
    this.provider = this.createProvider();
  }

  private createProvider(): LlmProvider {
    const config = vscode.workspace.getConfiguration('maintainabilityai.llm');
    const providerType = config.get<LlmProviderType>('provider', 'vscode-lm');

    switch (providerType) {
      case 'claude': {
        const apiKey = config.get<string>('claudeApiKey', '');
        const model = config.get<string>('model', '');
        if (!apiKey) {
          throw new Error('Anthropic API key is required when using the Claude provider. Set it in Settings > MaintainabilityAI > Claude API Key.');
        }
        return new ClaudeProvider(apiKey, model);
      }
      case 'openai': {
        const apiKey = config.get<string>('openaiApiKey', '');
        const model = config.get<string>('model', '');
        if (!apiKey) {
          throw new Error('OpenAI API key is required when using the OpenAI provider. Set it in Settings > MaintainabilityAI > OpenAI API Key.');
        }
        return new OpenAiProvider(apiKey, model);
      }
      case 'vscode-lm':
      default:
        return new VsCodeLmProvider();
    }
  }

  async generateRctro(
    description: string,
    techStack: TechStack,
    promptPackContents: string[],
    existingRctro?: RctroPrompt,
    modelOverride?: string
  ): Promise<RctroPrompt> {
    // Refresh provider in case settings changed
    this.provider = this.createProvider();
    return this.provider.generateRctro(description, techStack, promptPackContents, existingRctro, modelOverride);
  }

  getSystemPrompt(promptPackContents: string[]): string {
    return RCTRO_SYSTEM_PROMPT.replace(
      '{promptPackContents}',
      promptPackContents.length > 0
        ? promptPackContents.join('\n\n---\n\n')
        : '(No prompt packs selected — generate general security requirements)'
    );
  }

  get providerName(): string {
    return this.provider.name;
  }
}

export { RCTRO_SYSTEM_PROMPT };
