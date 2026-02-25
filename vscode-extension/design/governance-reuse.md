# Governance Reuse & Organization Opportunities

> *"Take care of the sense, and the sounds will take care of themselves."*

This document captures reuse, deduplication, and organizational opportunities identified across the MaintainabilityAI VS Code extension codebase. Items are prioritized by impact and grouped by category.

---

## Current Folder Structure

```
vscode-extension/
├── assets/                        # Extension icons (SVG/PNG)
│   ├── cheshire-activity-*.svg    # Activity bar icons (dark/light)
│   ├── cheshire-*.svg             # Panel icons (dark/light)
│   └── icon.png / icon.svg        # Marketplace icon
├── design/                        # Architecture & design documents
│   ├── governance-mesh.md         # Master design doc + backlog
│   ├── governance-reuse.md        # This file
│   ├── governance-absolem.md      # Absolem chat design
│   ├── governance-calm.md         # CALM integration design
│   ├── governance-catepillar.md   # Caterpillar (Absolem) concept
│   ├── governance-diagram-req.md  # Diagram requirements
│   ├── governance-whiterabbit.md  # White Rabbit bridge design
│   └── demo-script-30min.md       # Demo walkthrough
├── prompt-packs/                  # RCTRO prompt packs (bundled with extension)
│   ├── owasp/                     # 10 OWASP Top 10 packs (A01–A10)
│   ├── maintainability/           # 7 maintainability packs
│   ├── threat-modeling/           # 6 STRIDE packs
│   ├── mappings.json              # Pack ↔ pillar mapping
│   └── default.md                 # Default pack
├── scaffolding/                   # Templates scaffolded into user repos
│   ├── scripts/                   # CI scripts (cjs/js)
│   ├── workflows/                 # GitHub Actions workflows (8 files)
│   └── prompts/                   # Oraculum review prompts + registry
├── src/
│   ├── extension.ts               # Main entry point (75 LOC, clean)
│   ├── commands/                  # Command handlers (7 files)
│   │   ├── browsePromptPacks.ts   #   41 LOC — thin + picker UI
│   │   ├── configureSecrets.ts    #  252 LOC — ⚠ heavy, has business logic
│   │   ├── createIssue.ts         #    6 LOC — thin wrapper
│   │   ├── lookingGlass.ts        #    7 LOC — thin wrapper
│   │   ├── openScorecard.ts       #    6 LOC — thin wrapper
│   │   ├── oraculum.ts            #    6 LOC — thin wrapper
│   │   └── scaffoldRepo.ts        #    6 LOC — thin wrapper
│   ├── schemas/                   # CALM 1.2 JSON schemas (11 files, static)
│   ├── services/                  # Business logic (25+ files)
│   │   ├── AbsolemService.ts      #  500+ LOC
│   │   ├── AgentStatusService.ts  #  300+ LOC
│   │   ├── BarService.ts          # 1032  LOC
│   │   ├── CalmFileWatcher.ts
│   │   ├── CalmTransformer.ts
│   │   ├── CalmValidator.ts
│   │   ├── CalmWriteService.ts    #  400+ LOC
│   │   ├── CapabilityModelService.ts
│   │   ├── GitHubService.ts       #  840  LOC
│   │   ├── GitSyncService.ts      #  400+ LOC
│   │   ├── GovernanceScorer.ts    #  600+ LOC
│   │   ├── IssueBodyBuilder.ts
│   │   ├── IssueMonitorService.ts
│   │   ├── LayoutPersistenceService.ts
│   │   ├── MeshService.ts         #  872  LOC
│   │   ├── OrgScannerService.ts
│   │   ├── PmatService.ts
│   │   ├── PrerequisiteChecker.ts
│   │   ├── PromptPackService.ts
│   │   ├── RepoMetadata.ts
│   │   ├── ReviewService.ts
│   │   ├── ScorecardHistoryService.ts
│   │   ├── ScorecardService.ts    #  733  LOC
│   │   ├── TechStackDetector.ts
│   │   ├── ThreatModelService.ts  #  752  LOC
│   │   └── llm/                   # LLM provider abstraction (good pattern)
│   │       ├── LlmService.ts      #  118  LOC — factory + orchestrator
│   │       ├── ClaudeProvider.ts   #   95  LOC
│   │       ├── OpenAiProvider.ts   #   94  LOC
│   │       ├── VsCodeLmProvider.ts #   97  LOC
│   │       └── OrgScannerPrompt.ts #  133  LOC — ⚠ misplaced (prompt, not provider)
│   ├── templates/                 # Code generation templates
│   │   ├── issueTemplates.ts      #   56  LOC
│   │   ├── meshTemplates.ts       #    2  LOC — ⚠ broken barrel re-export
│   │   ├── scaffoldTemplates.ts   #  942  LOC
│   │   └── scaffolding/           # Mesh/BAR/CALM scaffold templates
│   │       ├── index.ts           #    1  LOC barrel
│   │       ├── archetypeTemplates.ts   # 332 LOC
│   │       ├── barTemplates.ts         # 887 LOC
│   │       ├── calmTemplates.ts        # 942 LOC
│   │       ├── capabilityModelTemplates.ts # 577 LOC
│   │       └── meshTemplates.ts        # 459 LOC
│   ├── types/
│   │   └── index.ts               # 1079 LOC — ⚠ monolith, should split
│   ├── views/                     # Tree data providers
│   │   ├── ActionsTreeProvider.ts  #   59 LOC
│   │   └── GovernanceTreeProvider.ts # 49 LOC
│   └── webview/                   # Panel classes (extension-side)
│       ├── LookingGlassPanel.ts   # 2816 LOC
│       ├── ScaffoldPanel.ts       # 1275 LOC
│       ├── IssueCreatorPanel.ts   # 1237 LOC
│       ├── ScorecardPanel.ts      # 1128 LOC
│       ├── OracularPanel.ts       #  806 LOC
│       └── app/                   # Webview frontend (browser-side IIFEs)
│           ├── lookingGlass.ts    # 8000 LOC — ⚠ monolithic IIFE
│           ├── oraculum.ts        # 1958 LOC
│           ├── main.ts            # 1234 LOC (Rabbit Hole / Issue Creator)
│           ├── scorecard.ts       #  825 LOC
│           ├── agentStatus.ts     #  311 LOC
│           ├── pillars/           # Extracted pillar renderers (good pattern)
│           │   ├── shared.ts      #  122 LOC — escapeHtml, renderMarkdown
│           │   ├── architecturePillar.ts # 696 LOC
│           │   ├── securityPillar.ts     # 205 LOC
│           │   ├── operationsPillar.ts   #  22 LOC (stub)
│           │   └── infoRiskPillar.ts     #  25 LOC (stub)
│           └── reactflow/         # CALM diagram subsystem (well-organized)
│               ├── CalmAdapter.ts       # 488 LOC
│               ├── CalmMutator.ts       # 475 LOC
│               ├── DiagramCanvas.tsx     # 786 LOC
│               ├── PropertyPanel.tsx     # 651 LOC
│               ├── CapabilitiesEditor.tsx
│               ├── ControlsEditor.tsx
│               ├── ElkLayout.ts
│               ├── ExportPng.ts
│               ├── InlineNameEditor.tsx
│               ├── NodePalette.tsx
│               ├── ReactBridge.ts
│               ├── LayoutTypes.ts
│               ├── assignEdgeHandles.ts
│               ├── containmentDetection.ts
│               ├── nodes/         # 8 node types + shared styles
│               └── edges/         # 1 custom edge type
├── esbuild.js                     # Build config (115 LOC, 5 entry points)
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript config
├── maintainabilityai-0.1.0.vsix   # ⚠ stale VSIX artifact (6.1 MB)
└── .vscodeignore                  # VSIX packaging exclusions
```

---

## Codebase Snapshot

| Metric | Value |
|--------|-------|
| Total source files | 110+ |
| Largest file | `lookingGlass.ts` — 8,000 lines |
| Panel classes | 5 (all follow identical boilerplate) |
| Service classes | 25+ |
| Duplicated functions | 7 identified (500–700 lines estimated) |
| Webview app files | 5 (`lookingGlass`, `scorecard`, `main`, `oraculum`, `agentStatus`) |
| Type definitions | 1,079 lines in single monolith |
| Try-catch blocks | 93 (inconsistent error handling) |

---

## Priority 1 — Critical Duplications

### 1.1 `getNonce()` — 4 identical copies

Identical 8-line function in every Panel file:

| File | Location |
|------|----------|
| `LookingGlassPanel.ts` | line 2809 |
| `ScorecardPanel.ts` | line 1121 |
| `IssueCreatorPanel.ts` | line 1230 |
| `OracularPanel.ts` | line 18 |

**Action:** Extract to `src/utils/getNonce.ts` and import everywhere.

---

### 1.2 `escapeHtml()` / `escapeAttr()` — 5 locations

`escapeHtml` exists in `pillars/shared.ts` (the authoritative version) and is duplicated in 3 other webview app files with minor variations:

| File | Location | Notes |
|------|----------|-------|
| `pillars/shared.ts` | line 39 | Authoritative — used by pillars |
| `main.ts` | line 1006 | Inline copy |
| `scorecard.ts` | line 695 | Inline copy (includes extra escapes) |
| `oraculum.ts` | line 1207 | Inline copy |

`escapeAttr` similarly duplicated in 4 files.

**Action:** All webview app files should import from `pillars/shared.ts` or a new `src/webview/app/utils/html.ts`. Since esbuild bundles each entry point separately, shared imports work fine.

---

### 1.3 `execFileAsync` — 8 locations

Every Panel class and several services independently create `const execFileAsync = promisify(execFile)`:

| File | Type |
|------|------|
| `LookingGlassPanel.ts` | Panel |
| `ScorecardPanel.ts` | Panel |
| `IssueCreatorPanel.ts` | Panel |
| `ScaffoldPanel.ts` | Panel |
| `OracularPanel.ts` | Panel |
| `GitSyncService.ts` | Service |
| `PrerequisiteChecker.ts` | Service |
| `GitHubService.ts` | Service (inline) |

**Action:** Extract to `src/utils/exec.ts`:
```typescript
import { promisify } from 'util';
import { execFile } from 'child_process';
export const execFileAsync = promisify(execFile);
```

---

### 1.4 `formatTimestamp()` — 3 copies

| File | Location |
|------|----------|
| `main.ts` | line 1022 |
| `scorecard.ts` | line 703 |
| `oraculum.ts` | line 1309 |

**Action:** Move to `src/webview/app/utils/format.ts`.

---

## Priority 2 — Panel Boilerplate (BasePanel Abstraction)

All 5 Panel classes follow an identical structural pattern:

### Duplicated Patterns

| Pattern | Description |
|---------|-------------|
| `static currentPanel` | Singleton instance field |
| `createOrShow()` | Static factory — reveal existing or create new |
| `private constructor()` | Panel + context + service init + message handler + dispose wiring |
| `dispose()` | Cleanup singleton, dispose panel, drain disposables array |
| `postMessage()` | One-liner wrapper around `panel.webview.postMessage()` |
| `getHtmlContent()` | CSP meta, nonce, script/style URIs, webview API bootstrap |

### Panel Line Counts

| Panel | Lines |
|-------|-------|
| `LookingGlassPanel.ts` | 2,816 |
| `ScaffoldPanel.ts` | 1,275 |
| `IssueCreatorPanel.ts` | 1,237 |
| `ScorecardPanel.ts` | 1,128 |
| `OracularPanel.ts` | 806 |

### Proposed: `BasePanel<TWebviewMsg, TExtMsg>`

```typescript
// src/webview/BasePanel.ts
export abstract class BasePanel<TWebviewMsg, TExtMsg> {
  protected panel: vscode.WebviewPanel;
  protected context: vscode.ExtensionContext;
  protected disposables: vscode.Disposable[] = [];

  // Subclass provides:
  abstract readonly viewType: string;
  abstract readonly title: string;
  abstract getHtmlContent(webview: vscode.Webview, extensionUri: vscode.Uri): string;
  abstract handleMessage(msg: TWebviewMsg): void;

  // Shared:
  protected postMessage(msg: TExtMsg) { ... }
  protected dispose() { ... }
  protected static createPanel(viewType, title, context) { ... }
}
```

**Estimated savings:** ~150 lines per Panel (750 total).

---

## Priority 3 — CSS & Theme System

### Current State

- CSS variables are defined **only** in `lookingGlass.ts` (lines 483–550)
- Other webview files (`scorecard.ts`, `main.ts`, `oraculum.ts`) reference `var(--accent)`, `var(--border)`, etc. but rely on their Panel's `getHtmlContent()` injecting a compatible style block
- No shared CSS file — each Panel independently generates `<style>` blocks
- 327+ instances of button/card class references across files (`.btn-primary`, `.btn-ghost`, `.card`)

### CSS Variables (defined in lookingGlass.ts)

```
--bg, --surface, --surface-raised, --border, --border-light
--text, --text-muted, --text-dim
--accent, --accent-hover, --accent-bg
--passing, --warning, --failing
--critical-color, --high-color, --medium-color, --low-color
--font, --font-mono, --radius, --radius-sm
```

### Proposed: Shared Theme File

```
src/webview/app/styles/
  theme.ts       — CSS variable definitions (exportable string)
  components.ts  — Shared button, card, badge, modal styles
  layout.ts      — Grid, flex, spacing utilities
```

Each Panel's `getHtmlContent()` would import and inject the shared theme:
```typescript
import { themeCSS, componentCSS } from '../app/styles';
```

---

## Priority 4 — lookingGlass.ts Decomposition

At **8,000 lines**, `lookingGlass.ts` is the single largest maintenance risk. It's a monolithic IIFE containing:

### Logical Sections

| Section | Approx Lines | Description |
|---------|-------------|-------------|
| State & types | 1–200 | State interface, type mirrors, initial state |
| CSS styles | 200–900 | All CSS in a single template literal |
| Render dispatch | 900–1200 | `renderView()` switch, navigation |
| Portfolio view | 1200–2000 | Platform cards, BAR list, portfolio grid |
| EA Lenses | 2000–3000 | Business, Application, Data, Technology, Integration |
| Policy management | 3000–3500 | NIST controls, policy YAML editor |
| BAR detail | 3500–5500 | Pillar grid, score history, pillar detail |
| Architecture pillar | 5500–6500 | CALM diagrams, ADRs, sequence diagrams |
| Absolem chat | 6500–7200 | FAB, overlay, message rendering, patches |
| Utilities | 7200–7500 | escapeHtml, markdown, helpers |
| Event wiring | 7500–8000 | Click handlers, message dispatch |

### Proposed Split

```
src/webview/app/
  lookingGlass.ts          — Entry point, state, render dispatch (~500 lines)
  views/
    portfolio.ts           — Portfolio & platform rendering
    barDetail.ts           — BAR detail, pillar grid, score history
    eaLenses.ts            — Enterprise Architecture lens views
    policies.ts            — NIST policy management
  pillars/
    architecturePillar.ts  — Already extracted (exists)
    securityPillar.ts      — Already extracted (exists, 205 LOC)
    operationsPillar.ts    — Already extracted (exists, stub 22 LOC)
    infoRiskPillar.ts      — Already extracted (exists, stub 25 LOC)
    shared.ts              — Already extracted (exists, 122 LOC)
  components/
    absolem.ts             — FAB + chat overlay
    scoreRing.ts           — SVG score ring component
    pillarCard.ts          — Pillar card rendering
    sparkline.ts           — Score history sparklines
  styles/
    theme.ts               — CSS variables
    components.ts          — Shared component styles
```

**Note:** The `pillars/` folder already follows this extraction pattern. The remaining views, components, and styles should follow suit.

---

## Priority 5 — Types Monolith Split

### Current State

`src/types/index.ts` is **1,079 lines** — a single file containing all type definitions for the entire extension:

| Domain | Approx Lines | Types |
|--------|-------------|-------|
| RCTRO | 18 | `RctroPrompt`, `RctroRequirement` |
| Prompt Packs | 56 | `PromptPackInfo`, `PromptPackSelection` |
| Tech Stack | 8 | `TechStack` |
| GitHub / Issues | 93 | `RepoInfo`, `IssueTemplate`, `IssueComment`, `PullRequest` |
| LLM Provider | 23 | `LlmProvider`, `LlmConfig` |
| Workflow Phases | 28 | `WorkflowPhase`, `AgentStatusPhase` |
| Webview Messages | 100+ | `WebviewMessage`, `ExtensionMessage`, unions |
| Scorecard | 100+ | `ScorecardData`, `MetricResult`, `ScorecardWebviewMessage` |
| Governance Mesh | 250+ | `Bar`, `Platform`, `Mesh`, `Criticality`, `PillarStatus`, etc. |
| Scaffold | 14 | `ComponentContext`, `ScaffoldOptions` |
| Agent Status | 30 | `AgentStatusInfo` |

### Proposed Split

```
src/types/
  index.ts              — Barrel re-export
  rctro.ts              — RCTRO prompt types
  github.ts             — GitHub, issues, PRs
  llm.ts                — LLM providers
  scorecard.ts          — Scorecard data types
  governance.ts         — BAR, mesh, platforms, pillars
  messages.ts           — Webview ↔ extension message protocols
  workflow.ts           — Workflow phases, agent status
  scaffold.ts           — Scaffold options, component context
```

**Impact:** Better discoverability, smaller diffs, clearer domain ownership.

---

## Priority 6 — Service Layer Opportunities

### Service Inventory (25+ files)

| Service | Lines | Domain |
|---------|-------|--------|
| `BarService.ts` | 1,032 | BAR scoring, pillar computation |
| `MeshService.ts` | 872 | Mesh file I/O, YAML read/write |
| `GitHubService.ts` | 840 | GitHub API, issue creation, repo detection |
| `ThreatModelService.ts` | 752 | LLM threat model generation |
| `ScorecardService.ts` | 733 | Security metrics collection |
| `GovernanceScorer.ts` | 600+ | Pillar scoring from artifacts |
| `AbsolemService.ts` | 500+ | Chat, patches, LLM interaction |
| `GitSyncService.ts` | 400+ | Git operations, sync status |
| `CalmWriteService.ts` | 400+ | CALM JSON generation |
| `AgentStatusService.ts` | 300+ | Agent monitoring, polling |
| Others (15+) | 150–300 | Smaller focused services |

### Observations

- **No shared service base class** — each service is standalone, which is fine for small services but leads to repeated patterns in larger ones
- **Service initialization** duplicated across Panel constructors — each Panel creates its own instances of `GitHubService`, `AgentStatusService`, etc.
- **No dependency injection** — services are `new`'d directly in constructors
- **Shared git utilities** — `GitSyncService` and `GitHubService` both shell out to `git` commands with similar patterns
- **LLM service abstraction** — `AbsolemService`, `ThreatModelService`, `CalmWriteService` all interact with LLMs via `LlmService` but have duplicated prompt formatting

### Potential Improvements

1. **Service registry / factory** — centralize service creation, allow shared instances
2. **Shared git utilities** — extract common git operations
3. **LLM prompt formatting** — shared prompt builder utility

---

## Priority 7 — Commands Layer Cleanup

### `configureSecrets.ts` Contains Business Logic (252 LOC)

Most command files are 6-line thin wrappers that delegate to Panels. `configureSecrets.ts` is the exception at 252 lines — it contains:

- `detectGovernanceRepo()` (lines 41–56) — git operations that belong in `GitSyncService`
- `detectWorkspaceRepo()` (lines 61–66) — belongs in `GitHubService`
- `SECRETS` array definition (lines 17–35) — could be in a config or constants file
- Mixed UI (vscode.window.showQuickPick) with business logic

**Action:** Extract business logic to a `SecretsConfigService`, keep command as thin wrapper.

---

## Priority 8 — Cross-Cutting Concerns

### Error Handling (93 try-catch blocks, inconsistent)

Current patterns across the codebase:

| Pattern | Count | Issue |
|---------|-------|-------|
| Catch + `vscode.window.showErrorMessage` | ~30 | Good — shows user |
| Catch + `console.error` only | ~40 | Silent — user doesn't know |
| Catch + empty body | ~10 | Swallowed errors |
| Catch + rethrow | ~13 | Good — propagates |

**Action:** Create `src/utils/errors.ts`:
```typescript
export function handleError(error: unknown, context: string, showUI = true): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] ${msg}`);
  if (showUI) { vscode.window.showErrorMessage(`${context}: ${msg}`); }
}
```

### Logging (no centralized logger)

- `console.log` and `console.error` scattered across all files
- No structured logging, no log levels, no output channel

**Action:** Create `src/utils/Logger.ts` with VS Code OutputChannel:
```typescript
export class Logger {
  private static channel = vscode.window.createOutputChannel('MaintainabilityAI');
  static info(context: string, msg: string) { ... }
  static error(context: string, error: unknown) { ... }
  static debug(context: string, msg: string) { ... }
}
```

### Configuration Access (15+ ad-hoc reads)

`vscode.workspace.getConfiguration('maintainabilityai')` called directly in 15+ places with no caching.

**Action:** Create `src/utils/ConfigService.ts`:
```typescript
export class ConfigService {
  static getLlmProvider(): string { ... }
  static getMeshPath(): string | undefined { ... }
  static getDefaultLabels(): string[] { ... }
  // Cache for session, invalidate on config change
}
```

---

## Priority 9 — Build & Packaging

### Esbuild Config Duplication

`esbuild.js` (115 LOC) defines 5 entry points with nearly identical webview configs:

| Entry | Format | Platform | Special |
|-------|--------|----------|---------|
| `extension.ts` | CommonJS | Node | — |
| `main.ts` | IIFE | Browser | — |
| `scorecard.ts` | IIFE | Browser | — |
| `lookingGlass.ts` | IIFE | Browser | CSS inlining plugin, JSX |
| `oraculum.ts` | IIFE | Browser | — |

4 webview configs are near-identical — only `lookingGlass` has extra plugins/jsx.

**Action:** Create a `webviewConfig(entryPoint, overrides?)` factory function to reduce duplication.

### Stale VSIX Artifact

`maintainabilityai-0.1.0.vsix` (6.1 MB) is checked into the repo. Should be gitignored.

**Action:**
```bash
echo '*.vsix' >> .gitignore
git rm --cached maintainabilityai-0.1.0.vsix
```

---

## Priority 10 — Webview Type Mirroring

### The Problem

Webview app files run in a browser context (IIFE) and cannot import TypeScript types from `src/types/index.ts`. Types like `Criticality`, `LifecycleStage`, `PillarStatus`, `ViewName` are **manually mirrored** at the top of each webview app file:

```typescript
// Types (mirrored from extension types — cannot import in browser context)
type Criticality = 'critical' | 'high' | 'medium' | 'low';
type LifecycleStage = 'build' | 'run' | 'retire' | 'proposed';
```

All 4 webview app files re-declare `VsCodeApi`, `TechStack`, `RctroPrompt`, `MetricResult`, etc.

### Recommendation

**Accept the duplication for now.** It's intentional, well-commented, and manageable (~40 lines per file). However, consolidate into a single `src/webview/app/types.ts` that all entry points import — esbuild will inline the types during bundling.

---

## Priority 11 — HTML Component Library

### Current State

All HTML generation uses inline template literals. Common patterns appear hundreds of times:

```typescript
// Button — appears 150+ times with variations
`<button class="btn-primary" id="btn-${id}">${label}</button>`

// Card — appears 80+ times
`<div class="card"><div class="card-header">...</div><div class="card-body">...</div></div>`

// Badge — appears 40+ times
`<span class="badge badge-${variant}">${text}</span>`
```

### Proposed: Component Helpers

```typescript
// src/webview/app/components/html.ts
export function button(label: string, opts: ButtonOpts): string { ... }
export function card(header: string, body: string, opts?: CardOpts): string { ... }
export function badge(text: string, variant: string): string { ... }
export function metricTile(label: string, value: string, status: string): string { ... }
```

**Impact:** Consistency, fewer typos, easier bulk style changes. Lower priority since current inline approach works.

---

## Additional Findings (Second Pass)

### Templates: Broken Barrel Export

`src/templates/meshTemplates.ts` is a 2-line file that re-exports from `./scaffolding/`. Meanwhile `src/templates/scaffolding/meshTemplates.ts` (459 LOC) has the actual content. The top-level file adds confusion.

**Action:** Remove the barrel or consolidate the template entry point.

### LLM: Misplaced Prompt File

`src/services/llm/OrgScannerPrompt.ts` (133 LOC) is a prompt definition, not an LLM provider. It sits alongside `ClaudeProvider.ts`, `OpenAiProvider.ts`, and `VsCodeLmProvider.ts` where it doesn't belong.

**Action:** Move to `src/services/OrgScannerPrompt.ts` alongside `OrgScannerService.ts`.

### ReactFlow: Well-Organized (No Changes Needed)

The `reactflow/` subsystem is the best-organized part of the codebase:
- Clear adapter pattern (`CalmAdapter`, `CalmMutator`)
- Proper component separation (`nodes/`, `edges/`)
- Clean bridge to VS Code (`ReactBridge.ts`)
- Only minor suggestion: add React error boundary in `DiagramCanvas.tsx`

### Pillar Extraction: Good Pattern, Continue

The `pillars/` folder demonstrates the extraction pattern that should extend to the rest of `lookingGlass.ts`:
- `shared.ts` — shared utilities (escapeHtml, renderMarkdown)
- `architecturePillar.ts` — 696 LOC, fully extracted
- `securityPillar.ts` — 205 LOC, extracted
- `operationsPillar.ts` — 22 LOC stub (will grow)
- `infoRiskPillar.ts` — 25 LOC stub (will grow)

### Extension.ts: Minor Hardening

`extension.ts` (75 LOC) is clean but lacks error boundary in `activate()`. If `PrerequisiteChecker` throws, the extension silently fails.

**Action:** Wrap activation in try-catch with user notification.

### Prompt Packs: Well-Organized (No Changes Needed)

The `prompt-packs/` folder is cleanly structured:
- `owasp/` — 10 packs (A01–A10)
- `maintainability/` — 7 packs
- `threat-modeling/` — 6 packs
- `mappings.json` — pack ↔ pillar mapping
- `default.md` — fallback

### Scaffolding Scripts: Verify No Stale Files

Git status shows deleted `.js` files and new `.cjs` files:
```
D scaffolding/scripts/generate-prompt-hashes.js
D scaffolding/scripts/process-codeql-results.js
? scaffolding/scripts/generate-prompt-hashes.cjs
? scaffolding/scripts/process-codeql-results.cjs
```

These were renamed from `.js` to `.cjs` in a previous session. The deletions and additions are staged correctly. No further action needed — just ensure the workflow YAML files reference `.cjs`.

---

## Implementation Roadmap

### Phase 1 — Quick Wins (low risk, immediate cleanup) ✅ Complete
- [x] Extract `getNonce()` → `src/utils/getNonce.ts` (removed 4 copies from Panel files)
- [x] Extract `execFileAsync` → `src/utils/exec.ts` (removed 8 copies from Panels + services)
- [x] Extract `escapeHtml()`, `escapeAttr()`, `formatTimestamp()` → canonical versions in `pillars/shared.ts` (removed copies from lookingGlass, scorecard, main, oraculum)
- [x] Add `*.vsix` to `.gitignore`
- [x] Verified `src/templates/meshTemplates.ts` barrel — working correctly as pass-through re-export, no change needed
- [x] Move `OrgScannerPrompt.ts` from `llm/` to `services/` (alongside `OrgScannerService.ts`)
- [x] Update all imports, verify clean build
- [x] Consolidate webview type mirrors → `src/webview/app/types.ts` (completed in Phase 5)

### Phase 2 — BasePanel Abstraction (medium risk, high payoff) ✅ Complete
- [x] Created `src/webview/BasePanel.ts` — generic abstract base class `BasePanel<TWebviewMsg, TExtMsg>`
  - Shared: `panel`, `context`, `disposables` fields + `postMessage()` + `dispose()` lifecycle
  - Abstract: `getHtmlContent()`, `handleMessage()`, `clearCurrentPanel()`
  - Hook: `onDispose()` (no-op default for optional subclass cleanup)
- [x] Migrated `ScaffoldPanel` first (simplest — no cleanup, proved the pattern)
- [x] Migrated `OracularPanel` — `onDispose()` calls `monitorService.dispose()`
- [x] Migrated `ScorecardPanel` — `onDispose()` clears `pollTimer`
- [x] Migrated `IssueCreatorPanel` — `onDispose()` calls `monitorService.dispose()`
- [x] Migrated `LookingGlassPanel` (most complex) — `onDispose()` calls `stopActiveReviewPolling()` + `calmFileWatcher.stop()`
- [x] Clean build verified after each migration (`node esbuild.js --production`)
- [x] Eliminated ~75-100 lines of duplicated boilerplate across 5 panels

### Phase 3 — Cross-Cutting Infrastructure (medium risk) ✅ Complete
- [x] Created `src/utils/Logger.ts` — singleton with OutputChannel + 500-entry circular buffer, 4 log levels (debug/info/warn/error), `exportLog()` for bug reports
- [x] Created `src/utils/errors.ts` — `toErrorMessage()` standardizes err handling, `handleError()` logs + optional notification
- [x] Added `handleAndNotifyError()` convenience method to `BasePanel.ts` — log + postMessage in one call
- [x] Created `src/services/ConfigService.ts` — cached typed getters for all `maintainabilityai.*` settings, auto-invalidates on config change
- [x] Bug Report feature — `$(bug)` status bar icon → opens pre-filled GitHub issue at `AliceNN-ucdenver/MaintainabilityAI`, copies log to clipboard, writes log to temp file for review
- [x] Migrated config access in `MeshService`, `LlmService`, `IssueBodyBuilder`, `IssueMonitorService` to use `configService`
- [x] Migrated 5 Node-side `console.*` calls in `LookingGlassPanel.ts` → `logger.*`
- [x] Extracted `configureSecrets.ts` → `SecretsService.ts` (business logic) + slimmed command to UI orchestrator
- [x] Clean build verified
- [x] Migrated all 68 `err instanceof Error ? err.message : String(err)` → `toErrorMessage(err)` across 9 files (LookingGlassPanel 38, OracularPanel 10, IssueCreatorPanel 10, ScorecardPanel 4, GitSyncService 2, GitHubService 1, + 3 LLM providers)

### Phase 4 — Shared CSS/Theme (medium risk) ✅
- [x] Created `src/webview/styles/theme.ts` — unified `:root` CSS variables mapped to VS Code tokens, with compat aliases (`--bg`, `--fg`, `--text`, `--surface`, etc.) for backward compatibility
- [x] Created `src/webview/styles/components.ts` — shared reset, body, button (.btn-primary/.btn-secondary/.btn-success/.btn-ghost/.btn-link/.btn-sm/.btn-icon), error-msg, spinner (+variants), loading-overlay
- [x] Created `src/webview/styles/index.ts` — barrel with `getSharedStyles()` helper
- [x] Migrated ScaffoldPanel — replaced `:root` + reset with shared, kept panel-specific button pattern + layout
- [x] Migrated ScorecardPanel — replaced `:root` + reset + buttons + spinner + error-msg with shared
- [x] Migrated IssueCreatorPanel — replaced `:root` + reset + buttons + spinner + error-msg with shared
- [x] Bridged LookingGlass — 10 hardcoded GitHub-dark `:root` colors now use VS Code tokens with fallbacks (e.g., `--bg: var(--vscode-editor-background, #0d1117)`) — adapts to light themes
- [x] Migrated Oraculum — imported shared theme + components, removed duplicate reset/body/buttons/spinner/@keyframes, replaced 40+ direct `var(--vscode-*)` tokens with shared variable names
- [x] Clean production build verified

### Phase 5 — Types & Build (low risk) ✅ COMPLETE
- [x] Consolidate webview type mirrors → `src/webview/app/types.ts` (56 types, ~240 lines removed from 8 files)
- [x] Split `src/types/index.ts` into 5 domain files (`prompts.ts`, `github.ts`, `scorecard.ts`, `governance.ts`, `webview.ts`) + barrel re-export
- [x] Refactor `esbuild.js` with `webviewEntry()` config factory (115 → 75 LOC)
- [x] Add try-catch error boundary to `extension.ts` activation
- [x] Add React error boundary to `DiagramCanvas.tsx` with retry button
- [x] Fixed `LinkedPullRequest` drift (added missing `reviewRequested` field)
- [x] Created `BarSummarySlim` type for Oraculum's 9-field subset
- [x] Replaced `CapabilityNode`/`CapabilityModelSummary` mirrors in DiagramCanvas.tsx

### Phase 6 — lookingGlass.ts Decomposition (high risk, high payoff) ✅
- [x] Extract Absolem to `src/webview/app/components/absolem.ts` (620 LOC)
- [x] Extract portfolio view to `src/webview/app/views/portfolio.ts` (1,390 LOC)
- [x] Extract BAR detail to `src/webview/app/views/barDetail.ts` (1,597 LOC)
- [x] Extract EA lenses to `src/webview/app/views/eaLenses.ts` (349 LOC)
- [x] Extract policies to `src/webview/app/views/policies.ts` (766 LOC)
- [x] Verify each extraction with build + manual testing — lookingGlass.ts 7,643→3,612 LOC (53% reduction)

### Phase 7 — HTML Components & Service Improvements (low priority, on hold)
- [ ] Create component helper functions
- [ ] Evaluate service registry pattern
- [ ] Consider shared git utilities extraction
- [ ] Add prompt pack content caching in `PromptPackService`

---

## File Creation Summary

| New File | Purpose | Phase |
|----------|---------|-------|
| `src/utils/getNonce.ts` | Nonce generation for CSP | 1 |
| `src/utils/exec.ts` | Promisified execFile | 1 |
| `src/webview/app/utils/html.ts` | escapeHtml, escapeAttr, formatTimestamp | 1 |
| `src/webview/app/types.ts` | Shared webview type mirrors | 1 |
| `src/webview/BasePanel.ts` | Abstract panel base class | 2 |
| `src/utils/Logger.ts` | Centralized logging with OutputChannel | 3 |
| `src/utils/ConfigService.ts` | Cached configuration access | 3 |
| `src/utils/errors.ts` | Shared error handling | 3 |
| `src/webview/app/styles/theme.ts` | CSS variables | 4 |
| `src/webview/app/styles/components.ts` | Shared button/card/badge CSS | 4 |
| `src/types/governance.ts` | BAR, mesh, platform types | 5 |
| `src/types/messages.ts` | Webview message protocols | 5 |
| `src/types/scorecard.ts` | Scorecard data types | 5 |
| `src/types/github.ts` | GitHub, issue, PR types | 5 |
| `src/webview/app/views/portfolio.ts` | Portfolio rendering | 6 |
| `src/webview/app/views/barDetail.ts` | BAR detail rendering | 6 |
| `src/webview/app/views/eaLenses.ts` | EA lens views | 6 |
| `src/webview/app/views/policies.ts` | Policy management | 6 |
| `src/webview/app/components/absolem.ts` | Absolem FAB + chat | 6 |
| `src/webview/app/components/scoreRing.ts` | SVG score ring | 6 |
| `src/webview/app/components/pillarCard.ts` | Pillar card rendering | 6 |
