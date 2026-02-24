# Absolem — Multi-Turn CALM Refinement Agent

**Version:** 1.0.0 — Implemented
**Date:** February 21, 2026 (Design) / February 23, 2026 (Implementation Complete)
**Author:** Shawn McCarthy, VP & Chief Architect, Global Architecture, Risk and Governance

---

## Overview

Absolem is a multi-turn conversational AI agent embedded in the Looking Glass BAR detail view as a floating chat widget. Named after the Caterpillar in *Alice in Wonderland* — **"Who... are... you?"** — Absolem guides architects through iterative CALM refinement by asking probing questions, analyzing drift reports, performing cross-pillar gap analysis, suggesting ADRs, generating architecture from diagram images, and applying targeted patches to `bar.arch.json`.

Absolem is the first multi-turn LLM capability in the extension. All existing LLM features (threat models, org scanning, policy baselines, top findings) are single-request/single-response. Absolem introduces a persistent conversation history that accumulates across turns, enabling clarification questions, incremental plan building, and staged CALM mutations.

> **Implementation status:** All phases complete. Absolem has been promoted from the architecture pillar toggle to a persistent floating chat widget at BAR detail level with 7 commands including 3 Phase 4 AI-Assisted Governance capabilities.

---

## Placement & Entry Point

### Floating Chat Widget (Implemented)

> **Design change:** Originally designed as a toggle button in the Architecture Views header. Promoted to a persistent floating chat widget at the BAR detail level for greater visibility and accessibility across all pillars.

Absolem renders as a collapsible floating panel at the bottom of the BAR detail view, after the pillar grid and score history, before the active pillar detail. It is always visible when a BAR is selected (collapsed by default, showing just the header bar).

```
┌─ BAR Detail ──────────────────────────────────────┐
│  Pillar grid, score history, etc.                  │
│                                                     │
│  ┌─ Absolem ──────────────────────── [▼ collapse] ─┐
│  │                                                   │
│  │  🐛 Who... are... you?                           │
│  │     I can help refine your architecture.          │
│  │                                                   │
│  │  Command chips (7):                               │
│  │  [Drift Analysis] [Add Components] [Validate]    │
│  │  [Gap Analysis] [Suggest ADR] [Image→CALM]       │
│  │  [Ask anything]                                   │
│  │                                                   │
│  │  Messages area (scrollable)                       │
│  │  ┌──────────────────────────────┐ [📎] [Send]   │
│  │  │ Or type a question...        │                 │
│  │  └──────────────────────────────┘                 │
│  └───────────────────────────────────────────────────┘
│                                                     │
│  Active pillar detail (Architecture, Security, etc.) │
└─────────────────────────────────────────────────────┘
```

Clicking the collapse/expand toggle hides or shows the chat body. When collapsed, only the header bar is visible.

---

## Conversation UI

### Chat Panel Layout

```
┌─ Absolem ──────────────────────────────── ✕ ─────┐
│                                                    │
│  🐛 Who... are... you?                            │
│     I can help refine your architecture.           │
│     What would you like to explore?                │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ ○ Update CALM from drift analysis            │ │
│  │ ○ Add missing nodes or relationships         │ │
│  │ ○ Review CALM validation issues              │ │
│  │ ○ Ask me anything about this architecture    │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────┐ [Send] │
│  │ Or type a question...                │         │
│  └──────────────────────────────────────┘         │
└────────────────────────────────────────────────────┘
```

### Visual Design

- **Chat bubbles**: LLM responses use a left-aligned `.absolem-bubble` with a caterpillar avatar. User messages use a right-aligned `.user-bubble`.
- **Streaming**: LLM responses stream token-by-token into the chat panel (re-using the existing `for await (const chunk of response.text)` pattern). Calm-patches fences are stripped from display and replaced with "Generating CALM architecture..." indicator.
- **Quick-action buttons**: 7 command chips appear below the greeting. Clicking one auto-sends the command.
- **Proposed Changes panel**: When Absolem proposes CALM mutations, they render as an artifact preview card. For `replaceFull` operations (image-to-CALM), the card shows a structured breakdown of nodes/relationships/flows with collapsible `<details>` sections, "Open in Editor" button, and "Apply to bar.arch.json" / "Skip" buttons.
- **Max height**: Chat panel has a max height of 400px with vertical scroll. Auto-scrolls to latest message (suppressed during calm-patches streaming to prevent scroll-jacking).

---

## Commands

### Command 1: Update CALM from Drift Analysis

The flagship command. Reads the latest review report, compares findings against the current CALM architecture, and proposes targeted patches.

#### Flow

```
User clicks "Update CALM from drift analysis"
        │
        ▼
Extension reads:
  1. bar.arch.json (current CALM)
  2. reviews.yaml (latest review record)
  3. reports/review-{N}.md (latest report content)
        │
        ▼
LLM Turn 1: System prompt + CALM JSON + report content
  "Analyze this drift report against the current architecture.
   Identify missing nodes, phantom relationships, and mismatches.
   Ask clarifying questions before proposing changes."
        │
        ▼
Absolem responds with analysis + clarifying questions:
  "I found 3 potential gaps:
   1. The report mentions a Redis cache (not in CALM)
   2. The auth-service connects to user-db but no relationship exists
   3. The API gateway is described but has no interfaces defined

   Before I propose changes:
   - Is the Redis cache a new service or just a library?
   - Should auth-service → user-db be 'connects' or 'interacts'?
   - What protocol does the API gateway expose (REST, gRPC)?"
        │
        ▼
User answers questions (free text)
        │
        ▼
LLM Turn 2: Full conversation history + user answers
  "Based on your answers, here are the proposed CALM patches..."
        │
        ▼
Absolem renders proposed changes card:
  ┌─ Proposed Changes ──────────────────────────────┐
  │ + Add node: redis-cache (service)               │
  │ + Add relationship: auth-svc → user-db          │
  │ + Update field: api-gateway interfaces           │
  │                                                  │
  │              [Accept All]  [Review Each]  [Skip] │
  └──────────────────────────────────────────────────┘
        │
        ▼
On Accept: CalmWriteService.applyPatch() + validation
On Review Each: Step through patches one by one
```

#### Data Gathering

The extension host reads three artifacts before sending to the LLM:

1. **`bar.arch.json`** — Full CALM JSON (nodes, relationships, flows, controls, decorators)
2. **`reviews.yaml`** — Latest review record (drift score, pillar finding counts)
3. **`reports/review-{issueNumber}.md`** — Full markdown report from the latest review. Issue number is taken from the most recent entry in `reviews.yaml`.

If no reviews exist, Absolem falls back to running a CalmValidator check on the current CALM and suggesting improvements based on validation warnings.

### Command 2: Add Missing Nodes or Relationships

Interactive node/relationship creation guided by LLM suggestions.

#### Flow

1. LLM receives the current CALM JSON
2. Asks: "What component or connection are you looking to add?"
3. User describes (e.g., "we added a notification service that talks to the API via events")
4. Absolem proposes: node definition (type, name, description, data-classification) + relationship + optional flow transitions
5. User accepts, modifies, or asks for adjustments
6. Patches applied via CalmWriteService

### Command 3: Review CALM Validation Issues

Runs `CalmValidator.validate()` and presents the results conversationally:

1. Shows error/warning/info counts as a summary
2. For each error: explains the issue and proposes a fix
3. User can accept fixes individually or all at once

### Command 4: Free-Form Architecture Questions

Open-ended conversation mode. The LLM has the full CALM JSON as context and can answer questions like:
- "What data classifications are missing?"
- "Which nodes have no relationships?"
- "Suggest security controls for the payment-service"
- "Generate a sequence diagram for the checkout flow"

Free-form mode can also produce CALM patches when the conversation leads to concrete changes.

### Command 5: Gap Analysis (Phase 4)

Cross-pillar governance gap identification. Absolem receives full BAR context across all four pillars:
- All pillar artifact lists with presence/non-empty status (from `BarService.scorePillars()`)
- ADR summaries (all statuses)
- Threat model summary
- CALM data
- Security controls summary

Absolem identifies gaps — missing artifacts, incomplete content, inconsistencies between artifacts (e.g., threats with no controls, ADRs referencing removed nodes). Provides a prioritized list of issues to fix across architecture, security, information risk, and operations.

### Command 6: Suggest ADR (Phase 4)

Architecture Decision Record suggestion engine. Absolem reviews:
- Current CALM architecture (nodes, relationships, patterns)
- All existing ADRs (id, title, status, decision text)

Suggests new ADRs that should be documented based on patterns detected — technology choices, integration patterns, security decisions, or operational concerns that lack formal ADR documentation. Asks clarifying questions about context before proposing.

### Command 7: Image-to-CALM (Phase 4)

Generate `bar.arch.json` from an architecture diagram image. Uses VS Code's `LanguageModelDataPart.image()` API to send images directly through the embedded Copilot LM — no external API key needed.

#### Flow

```
User clicks "Generate CALM from architecture diagram" chip
        │
        ▼
File picker opens (accept: image/*)
        │
        ▼
User selects PNG/JPG architecture diagram
        │
        ▼
Webview reads file as base64 via FileReader
Posts { type: 'absolemImageStart', barPath, imageBase64, mimeType }
        │
        ▼
Extension host converts base64 → Uint8Array
Calls AbsolemService.startImageConversation()
        │
        ▼
LLM receives IMAGE_TO_CALM_SYSTEM_PROMPT + image via LanguageModelDataPart
Generates complete CALM 1.2 JSON with nested containers, relationships, flows
Outputs as ```calm-patches fence with single "replaceFull" patch
        │
        ▼
Chat shows "Generating CALM architecture..." during streaming
On completion, artifact preview card appears:
  ┌─ Generated CALM Architecture ─────────────────────┐
  │ ▸ 12 Nodes (3 actors, 2 systems, 5 services, ...) │
  │ ▸ 8 Relationships (5 connects, 3 composed-of)     │
  │ ▸ 2 Flows (Login flow, Checkout flow)              │
  │ ▸ Raw JSON                                         │
  │                                                     │
  │        [Open in Editor]  [Skip]  [Apply to bar.arch.json] │
  └─────────────────────────────────────────────────────┘
        │
        ▼
On Accept: CalmWriteService.applyPatch() with op: 'replaceFull'
  → Writes complete bar.arch.json
  → Deletes context.layout.json + logical.layout.json for fresh auto-layout
  → Diagram re-renders with ELK.js automatic layout
        │
        ▼
User can continue conversation to refine the generated architecture
```

#### System Prompt

`IMAGE_TO_CALM_SYSTEM_PROMPT` includes:
- Complete CALM 1.2 schema reference with JSON examples
- Nested relationship-type format (`"relationship-type": { "connects": {...} }`)
- 3-level container nesting with ASCII art visual → JSON mapping
- Steps-based flow format (`step-number`, `source-node`, `destination-node`)
- Container detection rules: "If a section has a label and contains other items, it is a container"
- Rule: "List ALL composed-of BEFORE connects"
- Rule: "Scan diagram carefully for containers inside containers — do NOT flatten nested groups"

---

## Multi-Turn Conversation Architecture

### State Model

```typescript
interface AbsolemConversation {
  id: string;                              // UUID for the conversation
  barPath: string;                         // Which BAR this conversation belongs to
  messages: AbsolemMessage[];              // Full conversation history
  proposedPatches: AbsolemPatchSet | null; // Pending CALM patches
  status: 'idle' | 'thinking' | 'awaiting-response' | 'reviewing-patches';
}

interface AbsolemMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AbsolemPatchSet {
  description: string;                     // Human-readable summary
  patches: CalmPatch[];                    // Patches to apply
  status: 'proposed' | 'accepted' | 'partial' | 'rejected';
}
```

### Conversation Lifecycle

1. **Start**: User clicks Caterpillar button → new conversation created with system prompt
2. **Accumulate**: Each user message + LLM response appended to `messages[]`
3. **Propose**: When LLM suggests changes, a `proposedPatches` set is created
4. **Apply**: User accepts → `CalmWriteService.applyPatch()` → `CalmValidator.validate()` → results shown
5. **Continue**: Conversation continues after applying patches (LLM sees updated CALM)
6. **End**: User closes the panel or navigates away

Conversations are **ephemeral** — they do not persist across panel reloads. Each time the Caterpillar button is clicked, a fresh conversation starts. This keeps the implementation simple and avoids stale context.

---

## System Prompt

```
You are Absolem, the architecture refinement caterpillar. You help architects
refine their CALM (Common Architecture Language Model) files through thoughtful
conversation.

## Personality
- You speak deliberately, like the Caterpillar from Alice in Wonderland
- You ask probing questions: "Who... are... you?" becomes "What... is this
  node... for?"
- You are precise and architectural — every suggestion must be a valid CALM
  1.2 construct

## CALM 1.2 Schema
Nodes have: unique-id, node-type (actor|system|service|database|network),
name, description, data-classification, interfaces[], controls
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
3. Valid patch operations: addNode, removeNode, addRelationship,
   removeRelationship, updateField, setControl, removeControl,
   setCapabilities, setInterfaces, updateComposedOf, replaceFull
4. When proposing patches, wrap them in a ```calm-patches code fence
5. Explain WHY each change is needed, not just WHAT
6. After patches are applied, offer to continue refining

## Current Architecture
{calmJson}

## Review Context (if available)
{reviewReport}
```

### Patch Extraction

The extension parses LLM responses looking for fenced code blocks with the `calm-patches` language tag:

````
```calm-patches
[
  {
    "op": "addNode",
    "target": "redis-cache",
    "value": {
      "unique-id": "redis-cache",
      "node-type": "service",
      "name": "Redis Cache",
      "description": "In-memory cache for session data and API response caching"
    }
  },
  {
    "op": "addRelationship",
    "target": "rel-api-to-redis",
    "value": {
      "unique-id": "rel-api-to-redis",
      "relationship-type": {
        "connects": {
          "source": { "node": "api-gateway" },
          "destination": { "node": "redis-cache" }
        }
      }
    }
  }
]
```
````

The extension extracts the JSON array and stores it as `proposedPatches`. This format maps directly to `CalmPatch[]` from `CalmWriteService`.

---

## Message Protocol

### Webview → Extension (LookingGlassWebviewMessage)

```typescript
| { type: 'absolemStart'; barPath: string; command: AbsolemCommand }
| { type: 'absolemSend'; barPath: string; message: string }
| { type: 'absolemAcceptPatches'; barPath: string; patches: CalmPatch[] }
| { type: 'absolemRejectPatches'; barPath: string }
| { type: 'absolemClose'; barPath: string }
```

Where `AbsolemCommand` is:
```typescript
type AbsolemCommand =
  | 'drift-analysis'        // Update CALM from drift analysis
  | 'add-components'        // Add missing nodes or relationships
  | 'validate'              // Review CALM validation issues
  | 'gap-analysis'          // Analyze governance gaps across all pillars
  | 'suggest-adr'           // Suggest new ADRs from architecture
  | 'image-to-calm'         // Generate CALM from architecture diagram
  | 'freeform';             // Open-ended questions
```

Additional image message:
```typescript
| { type: 'absolemImageStart'; barPath: string; imageBase64: string; mimeType: string }
| { type: 'absolemPreviewJson'; barPath: string; json: string }
```

### Extension → Webview (LookingGlassExtensionMessage)

```typescript
| { type: 'absolemChunk'; barPath: string; chunk: string; done: boolean }
| { type: 'absolemPatches'; barPath: string; patches: CalmPatch[]; description: string }
| { type: 'absolemPatchesApplied'; barPath: string; validationErrors: CalmValidationError[] }
| { type: 'absolemError'; barPath: string; message: string }
```

The `absolemChunk` message streams tokens to the webview for real-time rendering. When `done: true`, the extension also scans the full response for `calm-patches` fences and sends `absolemPatches` if found.

---

## Extension Host Implementation

### AbsolemService (new file)

`src/services/AbsolemService.ts`

```typescript
class AbsolemService {
  private conversations: Map<string, AbsolemConversation>;  // keyed by barPath

  // Start a new conversation with system prompt + context
  async startConversation(
    barPath: string,
    command: AbsolemCommand,
    calmData: object,
    reviewReport: string | null,
    validationErrors: CalmValidationError[] | null,
  ): Promise<void>;

  // Send a user message and stream the LLM response
  async sendMessage(
    barPath: string,
    userMessage: string,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<string>;  // Returns full response text

  // Extract calm-patches from response text
  extractPatches(responseText: string): CalmPatch[] | null;

  // Get current conversation for a BAR
  getConversation(barPath: string): AbsolemConversation | null;

  // Clear conversation
  clearConversation(barPath: string): void;

  // Start an image-to-CALM conversation (uses LanguageModelDataPart)
  async startImageConversation(
    barPath: string,
    imageData: Uint8Array,
    mimeType: string,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<string>;

  // Build the initial user message based on command type
  private buildInitialMessage(
    command: AbsolemCommand,
    calmData: object,
    reviewReport: string | null,
    validationErrors: CalmValidationError[] | null,
  ): string;

  // Send message to LLM with optional image data (LanguageModelDataPart)
  private sendToLlmWithImage(
    conv: AbsolemConversation,
    imageData: Uint8Array,
    mimeType: string,
    onChunk: (chunk: string, done: boolean) => void,
  ): Promise<string>;

  // Select LLM model (reuses preferred family pattern)
  private selectModel(): Promise<vscode.LanguageModelChat>;
}
```

### LookingGlassPanel Handlers

The panel receives Absolem messages and delegates to `AbsolemService`:

- **`onAbsolemStart`**: Reads `bar.arch.json`, `reviews.yaml`, `reports/review-{N}.md`. Creates conversation. Sends initial message. Streams chunks to webview.
- **`onAbsolemSend`**: Appends user message. Sends to LLM with full history. Streams response. If `calm-patches` found, sends `absolemPatches`.
- **`onAbsolemAcceptPatches`**: Calls `CalmWriteService.applyPatch()`. Runs `CalmValidator.validate()`. Sends `absolemPatchesApplied` with validation results. Re-reads CALM data and updates the conversation's system context.
- **`onAbsolemRejectPatches`**: Clears `proposedPatches`. Appends a message noting rejection.
- **`onAbsolemClose`**: Clears the conversation.

### Context Window Management

The VS Code Language Model API has token limits. To keep conversations within bounds:

1. **System prompt**: ~500 tokens (template) + CALM JSON (varies, typically 1-3K tokens for a standard BAR)
2. **Review report**: Truncated to first 4000 characters if longer
3. **Conversation history**: If `messages.length > 20`, compress early messages into a summary
4. **Max conversation turns**: 15 back-and-forth exchanges before suggesting "let's start fresh"

---

## Webview Implementation

### State

New fields added to the Looking Glass webview state:

```typescript
absolemOpen: false,
absolemMessages: [] as { role: 'user' | 'assistant'; content: string }[],
absolemStreaming: '',          // Current streaming response (partial)
absolemStatus: 'idle' as 'idle' | 'thinking' | 'reviewing-patches',
absolemPatches: null as { patches: CalmPatch[]; description: string } | null,
```

### Render

`renderAbsolemPanel()` in `architecturePillar.ts` (or a new `absolemPanel.ts` pillar sub-module):

- Renders the chat panel between diagram section and ADR section
- Shows message history as alternating bubbles
- Shows streaming text with a blinking cursor
- Shows proposed patches card when `absolemPatches` is non-null
- Shows quick-action chips when conversation is empty
- Input field with send button at the bottom

### CSS

```css
.absolem-panel { ... }
.absolem-header { ... }
.absolem-messages { max-height: 400px; overflow-y: auto; }
.absolem-bubble { ... }   /* left-aligned, caterpillar avatar */
.user-bubble { ... }       /* right-aligned, user avatar */
.absolem-streaming { ... } /* blinking cursor effect */
.absolem-chips { ... }     /* quick-action command chips */
.absolem-input { ... }     /* input row with send button */
.absolem-patches { ... }   /* proposed changes card */
.patch-item { ... }        /* individual patch line item */
.patch-add { color: var(--passing); }
.patch-remove { color: var(--failing); }
.patch-update { color: var(--warning); }
```

---

## File Changes

| File | Change | Status |
|------|--------|--------|
| `src/types/index.ts` | Add `AbsolemCommand` (7 commands), `AbsolemConversation`, `AbsolemMessage`, `AbsolemPatchSet` types. Add webview + extension message types incl. `absolemImageStart`, `absolemPreviewJson`. | Complete |
| `src/services/AbsolemService.ts` | **New.** Multi-turn conversation manager, LLM streaming, patch extraction, `startImageConversation()`, `sendToLlmWithImage()`, `IMAGE_TO_CALM_SYSTEM_PROMPT`. | Complete |
| `src/services/CalmWriteService.ts` | Add `replaceFull` to `CalmPatch.op` union. Handle empty/missing files. Delete layout files on `replaceFull`. | Complete |
| `src/webview/LookingGlassPanel.ts` | Add message handlers incl. `onAbsolemImageStart()`, `onAbsolemPreviewJson()`. Read review report on start. Gap analysis context builder. | Complete |
| `src/webview/app/pillars/architecturePillar.ts` | ~~Add Caterpillar button~~ → Absolem toggle removed from Architecture Views header. Absolem UI moved to lookingGlass.ts. | Complete |
| `src/webview/app/lookingGlass.ts` | Add floating Absolem widget (`renderAbsolemFloating()`), artifact preview card, 7 command chips, image attach button, calm-patches stripping, streaming display, all Absolem CSS. | Complete |

---

## Phases

### Phase 1 — Core Conversation Loop (Complete)

- [x] `AbsolemService` with conversation management and LLM streaming
- [x] ~~Caterpillar button in architecture pillar header~~ → Promoted to floating BAR-level chat widget
- [x] Chat panel UI with message bubbles and streaming
- [x] Quick-action chips for 7 commands (originally 4, expanded with gap-analysis, suggest-adr, image-to-calm)
- [x] Free-form text input with send
- [x] Basic system prompt with CALM context
- [x] `absolemChunk` streaming to webview

### Phase 2 — CALM Mutation from Drift (Complete)

- [x] Read latest review report (`reports/review-{N}.md`) on drift-analysis command
- [x] Enhanced system prompt with review report context
- [x] `calm-patches` fence extraction from LLM responses
- [x] Proposed changes card with patch descriptions (enhanced: artifact preview card for `replaceFull`)
- [x] Accept All → `CalmWriteService.applyPatch()` → validation → diagram refresh
- [ ] Review Each mode (step through patches one by one)
- [x] Reject → clear state, confirm cancellation, continue conversation

### Phase 3 — Validation & Polish (Complete)

- [x] Validate command: run `CalmValidator.validate()`, present conversationally
- [x] Context window management (message compression, token counting)
- [x] Error handling: LLM unavailable, malformed patches, write failures
- [x] Conversation auto-scroll and UX polish (with scroll suppression during calm-patches streaming)
- [x] Keyboard shortcuts: Enter to send, Escape to close

### Phase 4 — AI-Assisted Governance (Complete)

- [x] Gap analysis command with full BAR context across all 4 pillars
- [x] ADR suggestion engine from CALM architecture + existing ADRs
- [x] Image-to-CALM via VS Code `LanguageModelDataPart` API
- [x] `replaceFull` CalmPatch operation for complete architecture replacement
- [x] Layout file cleanup on `replaceFull` for fresh auto-layout
- [x] CALM artifact preview card with structured breakdown and "Open in Editor"
- [x] IMAGE_TO_CALM_SYSTEM_PROMPT with nested containers, relationship-type format, steps-based flows

---

## Design Decisions

1. **Ephemeral conversations**: No persistence across reloads. Keeps implementation simple and avoids serving stale architecture context when CALM files change externally.

2. **`calm-patches` code fence**: Using a custom language tag in the response lets us cleanly separate conversational text from structured patch data, without requiring the LLM to produce pure JSON responses.

3. **Ask-first pattern**: The system prompt mandates at least one clarifying question before patches. This prevents the LLM from making assumptions about ambiguous drift findings and gives the architect control over the refinement direction.

4. **Patches are proposals, not auto-applied**: Every mutation goes through an explicit Accept step. This aligns with the "Trust but verify" golden rule and ensures the architect reviews all changes before they touch the CALM file.

5. **Single service file**: AbsolemService owns conversation state, LLM interaction, and patch extraction in one place, keeping the extension host handlers thin.

6. **Reuse existing infrastructure**: CalmWriteService for mutations, CalmValidator for post-mutation validation, preferred model selection pattern for LLM model choice. No new dependencies.
