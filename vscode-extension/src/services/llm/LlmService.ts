import type { LlmProvider, RctroPrompt, TechStack } from '../../types';
import { TechStackDetector } from '../TechStackDetector';
import { VsCodeLmProvider } from './VsCodeLmProvider';

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
- CRITICAL: Do NOT invent quantitative metrics. Never state a letter grade, score (e.g. "C+, 68/100"), percentage (e.g. "12.4% duplication"), nesting depth, line/block count, or defect/duplicate count unless that exact figure is present in the provided Repository Context or Tech Stack. When the context lacks a measured number, describe the structure qualitatively ("large inline-script blocks", "deeply nested shell logic", "repeated checkout/setup steps") instead of fabricating a precise value.
- Scope work to application code and tests. Do NOT make changes to CI/CD or workflow files (anything under \`.github/workflows/\`) a Requirement, and do not list them in Output, unless the user's description explicitly asks to modify CI. If a CI gate (fitness function, coverage gate, dependency-freshness check) would help, mention it briefly as a follow-up suggestion in the Task — never as a deliverable the agent must implement.
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
  // Cheshire v2 uses a single engine: the VS Code Language Model (Copilot /
  // GitHub Models, via the editor's `vscode.lm` API). The Anthropic/OpenAI
  // providers + their API-key settings were retired with the @claude path.
  private readonly provider: LlmProvider = new VsCodeLmProvider();

  async generateRctro(
    description: string,
    techStack: TechStack,
    promptPackContents: string[],
    existingRctro?: RctroPrompt,
    modelOverride?: string,
    repoContext?: string
  ): Promise<RctroPrompt> {
    return this.provider.generateRctro(description, techStack, promptPackContents, existingRctro, modelOverride, repoContext);
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

/**
 * Build the shared RCTRO system + user messages for every provider (VsCodeLm /
 * Claude / OpenAI). Centralized so the `## Repository Context` grounding block
 * lives in one place (and the providers don't duplicate the assembly).
 */
export function buildRctroPrompt(
  description: string,
  techStack: TechStack,
  promptPackContents: string[],
  existingRctro?: RctroPrompt,
  repoContext?: string,
): { systemPrompt: string; userContent: string } {
  const stackContext = new TechStackDetector().formatForContext(techStack);
  const systemPrompt = RCTRO_SYSTEM_PROMPT.replace(
    '{promptPackContents}',
    promptPackContents.length > 0
      ? promptPackContents.join('\n\n---\n\n')
      : '(No prompt packs selected — generate general security requirements)',
  );
  let userContent = `## Tech Stack\n${stackContext}`;
  if (repoContext) {
    userContent += `\n\n## Repository Context\nGround every Context/Requirement in these REAL files, folders, and frameworks — name actual paths; do not invent files, and do not invent metrics (grades, percentages, complexity, nesting depth, or line/defect counts) that are not shown here.\n\n${repoContext}`;
  }
  userContent += `\n\n## Feature Description\n${description}`;
  if (existingRctro) {
    userContent += `\n\n## Previous RCTRO (refine this)\n${JSON.stringify(existingRctro, null, 2)}`;
  }
  return { systemPrompt, userContent };
}
