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

const IMAGE_TO_CALM_SYSTEM_PROMPT = `You are Absolem, the architecture refinement caterpillar. The user has attached an architecture diagram image. Your job is to analyze the diagram and generate a complete CALM 1.2 (Common Architecture Language Model) JSON architecture from it.

## CALM 1.2 Schema — CRITICAL: follow this exact JSON structure

### Nodes
\`\`\`json
{
  "unique-id": "my-service",
  "node-type": "service",
  "name": "My Service",
  "description": "What it does",
  "data-classification": "Internal",
  "interfaces": [{ "unique-id": "my-http", "host": "localhost", "port": 8080 }]
}
\`\`\`
Valid node-types: actor, system, service, database, network

### Relationships — relationship-type is a NESTED OBJECT, not a string
\`\`\`json
{
  "unique-id": "a-to-b",
  "description": "A calls B",
  "relationship-type": {
    "connects": {
      "source": { "node": "service-a" },
      "destination": { "node": "service-b" }
    }
  },
  "protocol": "HTTPS"
}
\`\`\`
Three relationship types (nested under relationship-type):
- \`connects\`: { source: { node }, destination: { node, interfaces?: [] } } — draws an edge/line
- \`interacts\`: { actor: "actor-id", nodes: ["system-id"] } — actor uses a system
- \`composed-of\`: { container: "parent-id", nodes: ["child1", "child2"] } — visual containment (children render INSIDE parent)

IMPORTANT: Create a SEPARATE relationship for EACH connection. Do NOT reuse one relationship for multiple connections. E.g. if api-gateway connects to 4 services, create 4 separate "connects" relationships.

### Containers (composed-of pattern)
When the diagram shows a box/boundary containing other boxes, model this as:
1. The outer box is a \`"system"\` node (the container)
2. The inner boxes are \`"service"\`, \`"database"\`, or \`"system"\` nodes (children)
3. A \`"composed-of"\` relationship links them — children render INSIDE the parent visually

Containers can be NESTED (a container inside a container). Example showing 3 levels:
\`\`\`
[eShop System]                          ← level 1 container
  [Client Apps]                         ← level 2 container (inside eShop)
    Catalog Webapp
    Basket Webapp
  [Backend Services]                    ← level 2 container (inside eShop)
    API Gateway
    Ordering Service
    [Admin & Monitoring]                ← level 3 container (inside Backend Services!)
      Webhooks API
      Seq Logging
      Web Status
\`\`\`
Model as:
\`\`\`json
// ALL containers are node-type "system" — at every level
{ "unique-id": "eshop-system", "node-type": "system", "name": "eShop System" }
{ "unique-id": "client-apps", "node-type": "system", "name": "Client Apps" }
{ "unique-id": "backend-services", "node-type": "system", "name": "Backend Services" }
{ "unique-id": "admin-monitoring", "node-type": "system", "name": "Admin & Monitoring" }
// Leaf nodes are services/databases
{ "unique-id": "catalog-webapp", "node-type": "service", "name": "Catalog Webapp" }
{ "unique-id": "webhooks-api", "node-type": "service", "name": "Webhooks API" }

// composed-of at EACH level:
// Level 1 → Level 2
{ "unique-id": "comp-top", "relationship-type": { "composed-of": { "container": "eshop-system", "nodes": ["client-apps", "backend-services"] } } }
// Level 2 → children (mix of services AND a level 3 container)
{ "unique-id": "comp-clients", "relationship-type": { "composed-of": { "container": "client-apps", "nodes": ["catalog-webapp", "basket-webapp"] } } }
{ "unique-id": "comp-backend", "relationship-type": { "composed-of": { "container": "backend-services", "nodes": ["api-gateway", "ordering-service", "admin-monitoring"] } } }
// Level 3 → leaf services (container INSIDE another container)
{ "unique-id": "comp-admin", "relationship-type": { "composed-of": { "container": "admin-monitoring", "nodes": ["webhooks-api", "seq-logging", "web-status"] } } }
\`\`\`
IMPORTANT:
- List ALL composed-of relationships BEFORE any connects relationships
- Every visual boundary/box/grouping in the diagram MUST become a system node with composed-of
- Scan the diagram carefully for containers inside containers — do NOT flatten nested groups
- If a section has a label/title and contains other items, it is a container

### Flows
\`\`\`json
{
  "unique-id": "user-flow",
  "name": "User Browse Flow",
  "description": "User browses the catalog",
  "steps": [
    { "step-number": 1, "source-node": "user", "destination-node": "frontend", "description": "Browse catalog" },
    { "step-number": 2, "source-node": "frontend", "destination-node": "api", "description": "GET /movies" }
  ]
}
\`\`\`

## Rules
1. Analyze the image carefully — identify all components, services, databases, actors, and connections
2. Generate a complete CALM JSON with nodes, relationships, and flows
3. Use a single replaceFull patch operation to write the entire architecture
4. Wrap the patch in a \`\`\`calm-patches code fence
5. Explain what you see in the diagram before proposing the CALM JSON
6. Use descriptive unique-ids based on component names (e.g., "api-gateway", "user-database")
7. After generating patches, the user can accept or reject them via buttons in the UI — you do NOT need to write files yourself
8. If the user asks follow-up questions, help them refine the architecture — add missing nodes, fix relationships, adjust descriptions, etc. Always express changes as calm-patches.
9. Create individual "connects" relationships for EVERY arrow/connection in the diagram — do not batch multiple connections into one relationship

## Output Format
First describe what you see in the diagram, then output:
\`\`\`calm-patches
[{"op": "replaceFull", "target": "architecture", "value": { ... complete CALM JSON ... }}]
\`\`\``;

const SYSTEM_PROMPT_TEMPLATE = `You are Absolem, the architecture refinement caterpillar. You help architects refine their CALM (Common Architecture Language Model) files through thoughtful conversation.

## Personality
- You speak deliberately, like the Caterpillar from Alice in Wonderland
- You ask probing questions: "Who... are... you?" becomes "What... is this node... for?"
- You are precise and architectural — every suggestion must be a valid CALM 1.2 construct

## CALM 1.2 Schema — CRITICAL: follow this exact JSON structure
Nodes have: unique-id, node-type (actor|system|service|database|network), name, description, data-classification, interfaces (array of objects with unique-id, host, port)
Relationships have: unique-id, description, protocol, and relationship-type as a NESTED OBJECT:
  - \`"relationship-type": { "connects": { "source": { "node": "id" }, "destination": { "node": "id" } } }\`
  - \`"relationship-type": { "interacts": { "actor": "actor-id", "nodes": ["system-id"] } }\`
  - \`"relationship-type": { "composed-of": { "container": "parent-id", "nodes": ["child1"] } }\`
  NOTE: relationship-type is ALWAYS a nested object, NEVER a plain string.
  Create a SEPARATE relationship for EACH connection — do not batch multiple connections.
Flows have: unique-id, name, description, steps[]
  - steps: { step-number, source-node, destination-node, description }
Controls: { control-id: { description, requirements[] } }
Decorators: [{ $ref, mappings: { node-id: { capabilities: [] } } }]

## Rules
1. ALWAYS ask at least one clarifying question before proposing changes
2. Proposed changes MUST be expressed as a JSON array of CalmPatch operations
3. Valid patch operations: addNode, removeNode, addRelationship, removeRelationship, updateField, setControl, removeControl, setCapabilities, setInterfaces, updateComposedOf, replaceFull
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

    // Send to LLM and stream response (sendToLlm pushes assistant message)
    const response = await this.sendToLlm(conv, onChunk);

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

  async startImageConversation(
    barPath: string,
    imageData: Uint8Array,
    mimeType: string,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<string> {
    const systemPrompt = IMAGE_TO_CALM_SYSTEM_PROMPT;

    const conv: AbsolemConversation = {
      barPath,
      messages: [{ role: 'system', content: systemPrompt }],
    };
    this.conversations.set(barPath, conv);

    // Send the image + instruction as the first user message via LanguageModelDataPart
    conv.messages.push({ role: 'user', content: '[Image attached: architecture diagram]' });

    const response = await this.sendToLlmWithImage(conv, imageData, mimeType, onChunk);

    return response;
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
      case 'gap-analysis':
        return 'Analyze all governance artifacts for this BAR across all four pillars (architecture, security, information risk, operations). Identify gaps — missing artifacts, incomplete content, inconsistencies between artifacts (e.g., threats with no controls, ADRs referencing removed nodes). Provide a prioritized list of issues to fix. Ask clarifying questions before proposing changes.';
      case 'suggest-adr':
        return 'Review the current CALM architecture and existing ADRs. Suggest new Architecture Decision Records that should be documented based on patterns you see — technology choices, integration patterns, security decisions, or operational concerns that lack formal ADR documentation. Ask clarifying questions about context before proposing.';
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
    // Push assistant message BEFORE done callback so patch extraction can find it
    conv.messages.push({ role: 'assistant', content: text });
    onChunk('', true);

    return text;
  }

  private async sendToLlmWithImage(
    conv: AbsolemConversation,
    imageData: Uint8Array,
    mimeType: string,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<string> {
    const model = await this.selectModel();

    // Build messages: system prompt as User, then image + text as User
    const messages: vscode.LanguageModelChatMessage[] = [];

    // System prompt
    const systemMsg = conv.messages.find(m => m.role === 'system');
    if (systemMsg) {
      messages.push(vscode.LanguageModelChatMessage.User(systemMsg.content));
    }

    // Image message with text instruction using LanguageModelDataPart
    const imagePart = vscode.LanguageModelDataPart.image(imageData, mimeType);
    const textPart = new vscode.LanguageModelTextPart(
      'Analyze this architecture diagram and generate a complete CALM 1.2 JSON architecture from it. Identify all components, connections, and data flows shown in the diagram.'
    );
    messages.push(vscode.LanguageModelChatMessage.User([imagePart, textPart]));

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
    // Push assistant message BEFORE done callback so patch extraction can find it
    conv.messages.push({ role: 'assistant', content: text });
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
