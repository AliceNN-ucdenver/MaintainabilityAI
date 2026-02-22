// AbsolemService — Multi-turn CALM refinement agent
// Manages conversation state, LLM streaming, and calm-patches extraction

import * as vscode from 'vscode';
import type { AbsolemCommand } from '../types';
import type { CalmPatch } from './CalmWriteService';
import type { CalmValidationError } from './CalmValidator';

interface AbsolemMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AbsolemConversation {
  barPath: string;
  messages: AbsolemMessage[];
}

const MAX_REPORT_LENGTH = 4000;
const MAX_TURNS = 15;

const SYSTEM_PROMPT_TEMPLATE = `You are Absolem, the architecture refinement caterpillar. You help architects refine their CALM (Common Architecture Language Model) files through thoughtful conversation.

## Personality
- You speak deliberately, like the Caterpillar from Alice in Wonderland
- You ask probing questions: "Who... are... you?" becomes "What... is this node... for?"
- You are precise and architectural — every suggestion must be a valid CALM 1.2 construct

## CALM 1.2 Schema
Nodes have: unique-id, node-type (actor|system|service|database|network), name, description, data-classification, interfaces[], controls
Relationships have: unique-id, relationship-type (connects|interacts|composed-of)
  - connects: { source: { node, interface }, destination: { node, interface } }
  - interacts: { actor, nodes[] }
  - composed-of: { container, nodes[] }
Flows have: unique-id, name, description, transitions[]
  - transitions: { relationship-unique-id, sequence-number, summary }
Controls: { control-id: { description, requirements[] } }
Decorators: [{ $ref, mappings: { node-id: { capabilities: [] } } }]

## Rules
1. ALWAYS ask at least one clarifying question before proposing changes
2. Proposed changes MUST be expressed as a JSON array of CalmPatch operations
3. Valid patch operations: addNode, removeNode, addRelationship, removeRelationship, updateField, setControl, removeControl, setCapabilities, setInterfaces, updateComposedOf
4. When proposing patches, wrap them in a \`\`\`calm-patches code fence
5. Explain WHY each change is needed, not just WHAT
6. After patches are applied, offer to continue refining

## Current Architecture
{calmJson}

{reviewContext}`;

export class AbsolemService {
  private conversations: Map<string, AbsolemConversation> = new Map();

  async startConversation(
    barPath: string,
    command: AbsolemCommand,
    calmData: object,
    reviewReport: string | null,
    validationErrors: CalmValidationError[] | null,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<string> {
    // Build system prompt
    const calmJson = JSON.stringify(calmData, null, 2);
    let reviewContext = '';

    if (reviewReport) {
      const truncated = reviewReport.length > MAX_REPORT_LENGTH
        ? reviewReport.slice(0, MAX_REPORT_LENGTH) + '\n\n[...truncated]'
        : reviewReport;
      reviewContext = `## Latest Review Report\n${truncated}`;
    } else if (validationErrors && validationErrors.length > 0) {
      const summary = validationErrors.map(e => `- [${e.severity}] ${e.message} (${e.path})`).join('\n');
      reviewContext = `## Validation Results\n${summary}`;
    }

    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace('{calmJson}', calmJson)
      .replace('{reviewContext}', reviewContext);

    // Create conversation
    const conv: AbsolemConversation = {
      barPath,
      messages: [{ role: 'system', content: systemPrompt }],
    };
    this.conversations.set(barPath, conv);

    // For freeform, don't auto-send — wait for user input
    if (command === 'freeform') {
      return '';
    }

    // Build initial user message based on command
    const initialMessage = this.buildInitialMessage(command);
    conv.messages.push({ role: 'user', content: initialMessage });

    // Send to LLM and stream response
    const response = await this.sendToLlm(conv, onChunk);
    conv.messages.push({ role: 'assistant', content: response });

    return response;
  }

  async sendMessage(
    barPath: string,
    userMessage: string,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<string> {
    const conv = this.conversations.get(barPath);
    if (!conv) {
      throw new Error('No active Absolem conversation for this BAR.');
    }

    // Check turn limit
    const userTurns = conv.messages.filter(m => m.role === 'user').length;
    if (userTurns >= MAX_TURNS) {
      throw new Error('Conversation has reached the maximum number of turns. Please start a fresh conversation.');
    }

    conv.messages.push({ role: 'user', content: userMessage });

    const response = await this.sendToLlm(conv, onChunk);
    conv.messages.push({ role: 'assistant', content: response });

    return response;
  }

  extractPatches(responseText: string): { patches: CalmPatch[]; description: string } | null {
    const fenceRegex = /```calm-patches\s*\n([\s\S]*?)```/;
    const match = responseText.match(fenceRegex);
    if (!match) { return null; }

    try {
      const patches = JSON.parse(match[1]) as CalmPatch[];
      if (!Array.isArray(patches) || patches.length === 0) { return null; }

      // Extract description: text before the code fence
      const fenceStart = responseText.indexOf('```calm-patches');
      const description = responseText.slice(0, fenceStart).trim();
      return { patches, description };
    } catch {
      return null;
    }
  }

  getConversation(barPath: string): AbsolemConversation | null {
    return this.conversations.get(barPath) || null;
  }

  clearConversation(barPath: string): void {
    this.conversations.delete(barPath);
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private buildInitialMessage(command: AbsolemCommand): string {
    switch (command) {
      case 'drift-analysis':
        return 'Analyze my current CALM architecture against the latest review report. Identify missing nodes, phantom relationships, stale connections, and any mismatches between the documented architecture and what the review found in the codebase. Ask clarifying questions before proposing changes.';
      case 'add-components':
        return 'I want to add new components to my architecture. Please review the current CALM model and ask me what I would like to add — nodes, relationships, flows, or controls.';
      case 'validate':
        return 'Review the validation results for my current CALM architecture. For each issue, explain what is wrong and suggest a fix. Ask clarifying questions if the fix is ambiguous.';
      default:
        return '';
    }
  }

  private async sendToLlm(
    conv: AbsolemConversation,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<string> {
    const model = await this.selectModel();

    const messages = conv.messages.map(m => {
      if (m.role === 'system' || m.role === 'user') {
        return vscode.LanguageModelChatMessage.User(m.content);
      }
      return vscode.LanguageModelChatMessage.Assistant(m.content);
    });

    const response = await model.sendRequest(
      messages,
      {},
      new vscode.CancellationTokenSource().token,
    );

    let text = '';
    for await (const chunk of response.text) {
      text += chunk;
      onChunk(chunk, false);
    }
    onChunk('', true);

    return text;
  }

  private async selectModel(): Promise<vscode.LanguageModelChat> {
    const preferred = vscode.workspace
      .getConfiguration('maintainabilityai.llm')
      .get<string>('preferredFamily', 'gpt-4o');
    const families = [preferred, 'gpt-4o', 'gpt-4', 'codex', 'claude-sonnet']
      .filter((v, i, a) => a.indexOf(v) === i);

    for (const family of families) {
      const models = await vscode.lm.selectChatModels({ family });
      if (models.length > 0) { return models[0]; }
    }

    const allModels = await vscode.lm.selectChatModels();
    if (allModels.length > 0) { return allModels[0]; }

    throw new Error(
      'No VS Code Language Model available. Ensure GitHub Copilot is installed and signed in.'
    );
  }
}
