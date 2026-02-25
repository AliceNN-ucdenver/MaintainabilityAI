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
├── prompt-packs/                  # All prompt packs (bundled with extension)
│   ├── rabbit-hole/               # Code repo issue packs
│   │   ├── owasp/                 # 10 OWASP Top 10 packs (A01–A10)
│   │   ├── maintainability/       # 7 maintainability packs
│   │   ├── threat-modeling/       # 6 STRIDE packs
│   │   ├── default.md             # Security-first baseline
│   │   ├── scaffold.md            # Cheshire scaffold prompt
│   │   └── mappings.json          # CodeQL → OWASP cross-refs
│   ├── looking-glass/             # Governance mesh review packs
│   │   ├── default.md             # 4-pillar review baseline
│   │   ├── architecture.md        # Architecture review
│   │   ├── application-security.md # Security review
│   │   ├── information-risk.md    # Risk review
│   │   ├── operations.md          # Operations review
│   │   └── registry.yaml          # Pack metadata + ordering
│   └── templates/                 # Issue body templates ({{TOKEN}} replacement)
│       ├── rabbit-hole-issue.md   # Feature issue template
│       └── oraculum-issue.md      # Review issue template
├── code-templates/                # Templates scaffolded into user repos
│   ├── scripts/                   # CI scripts (cjs/js)
│   └── workflows/                 # GitHub Actions workflows (8 files)
├── src/
│   ├── extension.ts               # Main entry point (75 LOC, clean)
│   ├── commands/                  # Command handlers (8 files, 336 LOC)
│   │   ├── configureSecrets.ts    #  208 LOC — ⚠ heavy, has business logic
│   │   ├── bugReport.ts           #   53 LOC — bug report dialog
│   │   ├── browsePromptPacks.ts   #   40 LOC — thin + picker UI
│   │   ├── createIssue.ts         #    8 LOC — thin wrapper
│   │   ├── scaffoldRepo.ts        #    8 LOC — thin wrapper
│   │   ├── lookingGlass.ts        #    7 LOC — thin wrapper
│   │   ├── openScorecard.ts       #    6 LOC — thin wrapper
│   │   └── oraculum.ts            #    6 LOC — thin wrapper
│   ├── schemas/                   # CALM 1.2 JSON schemas (11 files, static)
│   ├── services/                  # Business logic (30 files, ~9,500 LOC)
│   │   ├── BarService.ts          # 1032 LOC — manifest, scoring, ADRs, reviews
│   │   ├── MeshService.ts         #  870 LOC — portfolio, platforms, policies
│   │   ├── GitHubService.ts       #  851 LOC — singleton ✓ API client, issues, org scan
│   │   ├── ThreatModelService.ts  #  752 LOC — STRIDE threat modeling with LLM
│   │   ├── ScorecardService.ts    #  733 LOC — metrics: security, deps, coverage
│   │   ├── AbsolemService.ts      #  676 LOC — multi-turn CALM refinement agent
│   │   ├── CalmTransformer.ts     #  409 LOC — CALM → Mermaid visualization
│   │   ├── GitSyncService.ts      #  375 LOC — singleton ✓ git status, per-BAR sync
│   │   ├── GovernanceScorer.ts    #  361 LOC — pillar artifact scoring
│   │   ├── OrgScannerService.ts   #  321 LOC — GitHub org scanning
│   │   ├── CapabilityModelService.ts # 303 LOC — capability model YAML I/O
│   │   ├── CalmWriteService.ts    #  279 LOC — JSON patch application
│   │   ├── PmatService.ts         #  258 LOC — exec wrapper for pmat tool
│   │   ├── AgentStatusService.ts  #  232 LOC — agent status from comments
│   │   ├── TechStackDetector.ts   #  225 LOC — language/framework detection
│   │   ├── PromptPackService.ts   #  ~700 LOC — singleton ✓ unified prompt packs (rabbit-hole + looking-glass), issue builders, override resolution, repo seeding
│   │   ├── CalmValidator.ts       #  179 LOC — JSON schema validation
│   │   ├── IssueMonitorService.ts #  153 LOC — issue polling + events
│   │   ├── PrerequisiteChecker.ts #  124 LOC — gh/git tool check
│   │   ├── RepoMetadata.ts        #  118 LOC — .github/repo-metadata.yml
│   │   ├── ConfigService.ts       #   83 LOC — singleton ✓ cached config
│   │   ├── FolderStateService.ts  #   77 LOC — singleton ✓ workspace state
│   │   ├── CalmFileWatcher.ts     #   76 LOC — *.arch.json watcher
│   │   ├── ScorecardHistoryService.ts # 67 LOC — score snapshot persistence
│   │   ├── LayoutPersistenceService.ts # 66 LOC — diagram layout I/O
│   │   ├── SecretsService.ts      #   58 LOC — secret detection helpers
│   │   └── llm/                   # LLM provider abstraction (good pattern)
│   │       ├── LlmService.ts      #  117 LOC — factory + orchestrator
│   │       ├── ClaudeProvider.ts   #   95 LOC
│   │       ├── OpenAiProvider.ts   #   94 LOC
│   │       ├── VsCodeLmProvider.ts #   97 LOC
│   │       └── OrgScannerPrompt.ts #  133 LOC — ⚠ misplaced (prompt, not provider)
│   ├── templates/                 # Code generation templates (3,647 LOC total)
│   │   ├── issueTemplates.ts      #   56  LOC — issue type defaults
│   │   ├── codeRepoTemplates.ts   #  387  LOC — code repo CI/CD generators (renamed from scaffoldTemplates)
│   │   └── mesh/                  # Governance mesh templates (renamed from scaffolding/)
│   │       ├── index.ts           #    5  LOC barrel
│   │       ├── archetypeTemplates.ts   # 332 LOC — 3-tier, event-driven, data-pipeline
│   │       ├── barTemplates.ts         # 887 LOC — BAR pillar artifact generators
│   │       ├── calmTemplates.ts        # 942 LOC — CALM architecture models
│   │       ├── capabilityModelTemplates.ts # 577 LOC — Insurance + Banking models
│   │       └── meshTemplates.ts        # 459 LOC — portfolio/platform/policy generators
│   ├── types/                     # Split in Phase 5 (1,117 LOC total)
│   │   ├── index.ts               #    6 LOC — barrel re-export
│   │   ├── governance.ts          #  397 LOC — BAR, mesh, platform, pillar types
│   │   ├── webview.ts             #  347 LOC — message protocols (all panels)
│   │   ├── scorecard.ts           #  179 LOC — scorecard data types
│   │   ├── github.ts              #  121 LOC — GitHub, issue, PR types
│   │   └── prompts.ts             #   67 LOC — prompt pack types
│   ├── utils/                     # Shared utilities (196 LOC total)
│   │   ├── Logger.ts              #   94 LOC — singleton OutputChannel logger
│   │   ├── git.ts                 #   47 LOC — GitHub URL parsing, remote detection
│   │   ├── errors.ts              #   41 LOC — toErrorMessage, handleError
│   │   ├── getNonce.ts            #    9 LOC — CSP nonce generation
│   │   └── exec.ts                #    5 LOC — promisified execFile
│   ├── views/                     # Tree data providers
│   │   ├── ActionsTreeProvider.ts  #   59 LOC
│   │   └── GovernanceTreeProvider.ts # 49 LOC
│   └── webview/                   # Panel classes (extension-side)
│       ├── BasePanel.ts           #   74 LOC — abstract base (Phase 2)
│       ├── LookingGlassPanel.ts   # 2800 LOC — 68 handlers ⚠ largest
│       ├── ScaffoldPanel.ts       # 1252 LOC
│       ├── IssueCreatorPanel.ts   # 1220 LOC
│       ├── ScorecardPanel.ts      # 1116 LOC
│       ├── OracularPanel.ts       #  776 LOC
│       ├── styles/                # Shared CSS (Phase 4)
│       │   ├── theme.ts           #   74 LOC — CSS variables
│       │   ├── components.ts      #   87 LOC — button/badge/spinner CSS
│       │   └── index.ts           #    9 LOC — barrel
│       └── app/                   # Webview frontend (browser-side IIFEs)
│           ├── lookingGlass.ts    # 3651 LOC (was 8000, Phase 6 extraction)
│           ├── oraculum.ts        # 1840 LOC
│           ├── main.ts            # 1193 LOC (Rabbit Hole / Issue Creator)
│           ├── scorecard.ts       #  816 LOC
│           ├── agentStatus.ts     #  288 LOC
│           ├── types.ts           #  499 LOC — ⚠ mirrors src/types/ (drift risk)
│           ├── components/        # Reusable HTML builders
│           │   ├── html.ts        #   81 LOC — button(), statusBadge(), deployStatusBadge()
│           │   ├── absolem.ts     #  682 LOC — Absolem FAB + chat overlay
│           │   ├── scoreRing.ts   #  SVG score ring
│           │   └── pillarCard.ts  #  Pillar card rendering
│           ├── views/             # Extracted view modules (Phase 6)
│           │   ├── portfolio.ts   # 1395 LOC — portfolio grid, filters, trend
│           │   ├── barDetail.ts   # 1608 LOC — BAR detail, pillar cards
│           │   ├── policies.ts    #  766 LOC — policy management
│           │   └── eaLenses.ts    #  349 LOC — EA lens views
│           ├── pillars/           # Pillar detail renderers (Phase 6)
│           │   ├── shared.ts      #  106 LOC — escapeHtml, renderMarkdown
│           │   ├── architecturePillar.ts # 676 LOC
│           │   ├── securityPillar.ts     # 205 LOC
│           │   ├── operationsPillar.ts   #  stub
│           │   └── infoRiskPillar.ts     #  stub
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

## Codebase Snapshot (Post Phase 8.2)

| Metric | Before (Phase 0) | Current (Phase 7 Complete) |
|--------|-------------------|----------------------------|
| Total source lines | ~35,000 | 38,552 (net growth from features) |
| Largest panel | `LookingGlassPanel.ts` — 2,816 | 2,800 |
| Largest webview | `lookingGlass.ts` — 8,000 | 3,651 (53% reduction) |
| Service singletons | 1 (configService) | 5 (+ github, gitSync, promptPack, folderState) |
| GitHub URL regex copies | 11 | 1 (canonical in `utils/git.ts`) |
| Type monolith | 1,079 lines | Split into 5 domain files |
| Extracted view modules | 0 | 7 (portfolio, barDetail, policies, eaLenses, pillars) |
| Shared utilities | 2 | 7 (exec, getNonce, errors, Logger, git, ConfigService, html) |

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

### Phase 7 — HTML Components & Service Improvements (Complete)
- [x] Create component helper functions — `src/webview/app/components/html.ts` (`button()`, `statusBadge()`, `deployStatusBadge()`) adopted in scorecard.ts and lookingGlass.ts
- [x] Evaluate service registry pattern — targeted singletons: `promptPackService`, `githubService`, `gitSyncService` (following existing `configService` pattern). Eliminated 11 `new Service()` instantiations across 8 files.
- [x] Shared git utilities extraction — `src/utils/git.ts` (`parseGitHubUrl()`, `getRemoteOriginUrl()`, `getCurrentBranch()`, `detectGitHubRepo()`). Reduced GitHub URL regex from 11 to 1 canonical location. Updated GitHubService, SecretsService, LookingGlassPanel, OracularPanel.
- [x] Add prompt pack content caching in `PromptPackService` — singleton with `initialize()`, `getAllPacks()` cache, lazy-loaded mappings. Eliminated 3 separate instantiations + redundant disk reads.

---

## Phase 8 — Comprehensive Reuse & Organization Audit (February 2026)

Fresh analysis of the full codebase after Phases 1-7 complete. Identifies remaining opportunities grouped by impact.

### 8.1 Templates Rename — Resolve Naming Confusion ✅

**Problem:** "templates" and "scaffolding" are overloaded across two completely different domains:

| Current Path | Domain | Used By | Generates |
|-------------|--------|---------|-----------|
| `src/templates/scaffoldTemplates.ts` | Code repo | ScaffoldPanel (Cheshire Cat) | CI/CD workflows, CLAUDE.md, SECURITY.md |
| `src/templates/scaffolding/*.ts` | Governance mesh | LookingGlassPanel | BAR artifacts, CALM models, capability models |
| `vscode-extension/scaffolding/` | Code repo | scaffoldTemplates.ts (reads raw files) | Physical workflow/script files with `{{placeholders}}` |
| `src/templates/meshTemplates.ts` | Barrel re-export | — | 2-line re-export, confusing |

The word "scaffolding" inside `src/templates/` refers to mesh governance artifacts, but `vscode-extension/scaffolding/` at the root refers to code repo CI/CD files. This is backwards.

**Proposed rename:**

```
src/templates/
├── scaffoldTemplates.ts         → codeRepoTemplates.ts     # Code repo scaffolding (Cheshire Cat)
├── issueTemplates.ts            (keep)                     # Issue type templates
├── meshTemplates.ts             (delete)                   # Dead barrel re-export
└── scaffolding/                 → mesh/                    # Governance mesh generators
    ├── index.ts                 (keep)
    ├── meshTemplates.ts         → portfolioTemplates.ts    # Portfolio/platform/policy
    ├── barTemplates.ts          (keep)                     # BAR pillar artifacts
    ├── calmTemplates.ts         (keep)                     # CALM architecture models
    ├── capabilityModelTemplates.ts (keep)                  # Insurance/banking models
    └── archetypeTemplates.ts    (keep)                     # Architecture pattern starters

vscode-extension/scaffolding/    → code-templates/          # Physical CI/CD template files
├── workflows/                   (keep)
├── scripts/                     (keep)
└── prompts/                     (keep)
```

**Completed:**
- [x] `src/templates/scaffolding/` → `src/templates/mesh/` (governance mesh templates)
- [x] `src/templates/scaffoldTemplates.ts` → `src/templates/codeRepoTemplates.ts` (code repo CI/CD generators)
- [x] `vscode-extension/scaffolding/` → `vscode-extension/code-templates/` (physical template files)
- [x] Deleted `src/templates/meshTemplates.ts` (dead 2-line barrel re-export)
- [x] Updated `readScaffoldFile()` path from `'scaffolding'` → `'code-templates'`
- [x] Updated `LookingGlassPanel.ts` — 2 static + 2 dynamic imports
- [x] Updated `ScaffoldPanel.ts` — 1 static import
- [x] Updated `ScorecardPanel.ts` — 1 static import
- [x] Updated `CapabilityModelService.ts` — 1 static import
- [x] Updated `MeshService.ts` — 1 static import + 1 require
- [x] Updated `BarService.ts` — 1 static import
- [x] Clean build verified

### 8.2 Unified Prompt Pack Service — Consolidate PromptPackService + ReviewService ✅

Full design and implementation details: [governance-prompt-packs.md](governance-prompt-packs.md)

- [x] Restructured `prompt-packs/` into `rabbit-hole/` and `looking-glass/` subdirectories (13 git mv operations)
- [x] Created `{{TOKEN}}` issue body templates: `templates/rabbit-hole-issue.md`, `templates/oraculum-issue.md`
- [x] Expanded `PromptPackService` (209 → ~700 LOC) — unified domain-aware scanning, override resolution, issue builders, repo seeding
- [x] Added `PackDomain`, `PackCategory` types to `types/prompts.ts`; unified `PromptPackInfo` across both domains
- [x] Absorbed `ReviewService` methods (loadFromRegistry, discoverCustomPacks, loadFromFiles, buildIssueBody)
- [x] Absorbed `IssueBodyBuilder` methods (build, generateLabels, renderCollapsibleSection, renderRctro)
- [x] Updated 6 consumers: `GitHubService`, `OracularPanel`, `LookingGlassPanel`, `ScaffoldPanel`, `MeshService`, `codeRepoTemplates`
- [x] Deleted `IssueBodyBuilder.ts` (182 LOC), `ReviewService.ts` (304 LOC), `code-templates/prompts/` directory
- [x] Scaffold checkbox defaults to checked, includes all 3 pack categories
- [x] "Refresh Prompts" button in Looking Glass Settings (force-reseed `.caterpillar/prompts/`)
- [x] Git sync banner shows uncommitted changes with "Commit All" button
- [x] Clean build + type check verified

---

### 8.2 Remaining Service Duplication (Pending)

#### 8.2a YAML Parsing — 8+ methods with inline regex

Multiple services implement ad-hoc regex-based YAML key extraction:

| Service | Methods |
|---------|---------|
| `BarService.ts` | `parseAppYaml()`, `parseReviewsYaml()`, `parseDecisions()`, `parseScoreHistoryYaml()` |
| `MeshService.ts` | `parsePortfolioConfig()`, `parsePlatformConfig()`, `parseNistControls()`, `readScoringConfig()` |
| `GovernanceScorer.ts` | inline regex for YAML value extraction |
| `ThreatModelService.ts` | `parseThreatModelYaml()`, `parseInlineArray()` |

**Why not use a YAML library?** These are lightweight governance YAML files (not complex nested docs). A full YAML parser would be overkill. But the regex patterns are duplicated.

**Opportunity:** Extract `src/utils/yaml.ts` with helpers:
- `yamlGetString(content, key)` — extract single value
- `yamlGetArray(content, key)` — extract inline `[a, b, c]` array
- `yamlGetSection(content, key)` — extract indented block under a key

**Impact:** ~120 lines of duplicated regex → ~40 lines in one utility. Medium priority.

#### 8.2b Score/Status Computation — Repeated thresholds

| Service | Pattern |
|---------|---------|
| `ScorecardService.ts` | `scoreToStatus()` (green/yellow/red), `computeGrade()` (A–F) |
| `GovernanceScorer.ts` | `scorePillar()` (60% present + 40% quality bonus) |
| `BarService.ts` | `computeDriftScore()` (pillar findings → 0-100) |
| `barDetail.ts` (webview) | Inline score → color mapping |

**Opportunity:** Extract `src/utils/scoring.ts` with configurable thresholds. Low priority — different domains use different formulas deliberately.

#### 8.2c Services Still Instantiated Per-Panel

Phase 7 converted GitHubService, GitSyncService, PromptPackService to singletons. Remaining:

| Service | Instantiation Sites | Stateful? | Singleton Candidate? |
|---------|---------------------|-----------|---------------------|
| `MeshService` | 2 (LookingGlass, Oraculum) | No (static methods + fs reads) | Yes |
| `BarService` | 2 (LookingGlass, Oraculum) | Accepts GovernanceScorer in constructor | Yes (with default scorer) |
| `ThreatModelService` | 1 (LookingGlass) | Takes progress callback in constructor | No — stateful per-operation |
| `OrgScannerService` | 1 (LookingGlass) | Takes GitHubService + callback in constructor | No — stateful per-operation |
| `ScorecardService` | 1 (Scorecard) | Takes 3 deps in constructor | No — intentionally composed |

**Opportunity:** Convert `MeshService` and `BarService` to singletons. Low priority — only 2 instantiation sites each.

---

### 8.3 Webview Frontend Duplication (Pending)

#### 8.3a renderIssueRow() — 2 near-identical copies

```
main.ts:624       renderIssueRow(issue) — issue #, title, labels, assignee, comments, createdAt
oraculum.ts:151   renderIssueRow(issue) — same but filters labels, adds "reviewing" badge, uses updatedAt
```

~80% identical. **Opportunity:** Extract to `components/issueRow.ts` with render options.

#### 8.3b renderFolderDropdown() — 2 near-identical copies

```
main.ts:544       renderFolderDropdown() — with isComponentMode early exit
scorecard.ts:169  renderFolderDropdown() — simpler version
```

~95% identical. **Opportunity:** Extract to `components/folderDropdown.ts`.

#### 8.3c CSS Import Inconsistency

- `main.ts` and `oraculum.ts` — import from `../styles`
- `scorecard.ts` and `lookingGlass.ts` — do NOT import from `../styles`, build CSS inline

**Opportunity:** Standardize all webview apps to use `styles/theme.ts` + `styles/components.ts`. Low effort.

#### 8.3d button() / statusBadge() Helpers — Defined but Underused

`components/html.ts` defines `button()`, `statusBadge()`, `deployStatusBadge()` but:
- `deployStatusBadge()` — used in 2 files (good)
- `button()` — **not used anywhere** (87+ buttons still inline HTML)
- `statusBadge()` — **not used anywhere**

**Decision needed:** Either adopt incrementally (settings sections first) or remove unused exports.

---

### 8.4 Large File Candidates for Splitting (Pending)

#### 8.4a LookingGlassPanel.ts — 2,800 lines, 68 message handlers

Largest panel by far. Handles portfolio, platforms, BARs, git sync, threat models, org scanning, capability models, Absolem delegation, CALM mutations, policy baselines, Oraculum workflow provisioning, issue templates, and settings.

**Extraction candidates:**

| Method/Group | Lines | Extract To |
|-------------|-------|------------|
| `onInitMesh()` | 213 | `MeshService.initializeMeshWithGitHub()` |
| `onSummarizeTopFindings()` | 120 | `BarService` or new `FindingsService` |
| `onGeneratePolicyBaseline()` | 120 | `MeshService.generatePolicyBaseline()` |
| Org scanning handlers (5) | ~200 | Already delegated to `OrgScannerService`, but coordination is large |
| Issue template handlers (3) | ~80 | Could move to a template helper |

**Realistic target:** 2,800 → ~2,000 lines by extracting `onInitMesh`, policy baseline, and findings summary into services. The panel would become a thinner coordinator.

#### 8.4b ScaffoldPanel.ts — 1,252 lines

`runScaffold()` method is 241 lines — an entire phase-loop state machine. Could extract a `ScaffoldOrchestrator` but it's a single-use flow, so the payoff is low.

#### 8.4c configureSecrets.ts — 208 lines

A command file with substantial business logic (repo detection, secret setup flow with QuickPick UI). Should move logic to `SecretsService.configureForTarget()`, leaving the command as a thin wrapper (~30 lines).

#### 8.4d BarService.ts — 1,032 lines

Handles manifest I/O, scoring, field updates, ADR CRUD, review metrics, score history, scaffolding, tree walking. Could split ADR methods into `BarAdrService` (6 methods, ~200 lines).

---

### 8.5 Tree Provider Duplication (Pending)

`ActionsTreeProvider.ts` (53 lines) and `GovernanceTreeProvider.ts` (43 lines) are ~90% identical — both implement `TreeDataProvider<TreeItem>` with an array of `{label, icon, command}` items.

**Opportunity:** Extract `GenericTreeProvider` base class (~25 lines), reduce each provider to ~10 lines of item definitions. Low impact but clean.

---

### 8.6 Type System Duplication (Pending)

`src/types/` (1,117 lines across 5 files) vs `src/webview/app/types.ts` (499 lines).

The webview `types.ts` is a **manual mirror** of server-side types. Every type change must be made in two places. Risk of drift is real.

**Why it exists:** esbuild bundles webview apps as separate IIFEs — they can't import from `src/types/` at runtime because they run in the browser. The types file was created in Phase 1 as a pragmatic mirror.

**Options:**
1. **Build-time generation** — script that copies relevant interfaces from `src/types/` → `webview/app/types.ts`
2. **Shared declaration file** — `.d.ts` that both sides reference (esbuild resolves at compile time, not runtime)
3. **Status quo** — keep manual sync, accept the risk

**Recommendation:** Option 2 (shared `.d.ts`) is lowest friction. esbuild already resolves TypeScript types at build time — a shared `src/shared-types.ts` imported by both sides would work since types are erased and never appear in the runtime bundle. Medium priority.

---

### 8.7 Remaining Naming & Organization Issues (Pending)

| Issue | Current | Suggested | Impact |
|-------|---------|-----------|--------|
| `src/templates/meshTemplates.ts` | 2-line barrel re-export | Delete (consumers import from `mesh/` directly) | Cleanup |
| `src/services/llm/OrgScannerPrompt.ts` | Prompt templates in llm/ directory | Move to `src/services/OrgScannerPrompt.ts` | Already noted in Phase 1 |
| `src/webview/app/pillars/shared.ts` | escapeHtml, renderMarkdown | Could be `src/webview/app/utils.ts` (more discoverable) | Low |
| `configureSecrets.ts` command | 208 lines of business logic | Extract to `SecretsService`, thin command wrapper | Medium |
| `SecretsService.ts` | 58 lines — very thin | Absorb configureSecrets logic → single service | Pairs with above |

---

### 8.8 Priority Ranking & Progress

- [x] **8.1 Templates rename** (`scaffolding/` → `mesh/`, root → `code-templates/`) — Small effort, High impact (clarity)
- [x] **8.2 Unified PromptPackService** (consolidate ReviewService + IssueBodyBuilder, restructure prompt-packs/, {{TOKEN}} templates) — Medium effort, High impact (eliminates 486 LOC of dead code, unifies two systems)
- [ ] **8.3 Shared webview types** (eliminate mirror in `app/types.ts`) — Medium effort, High impact (prevents drift)
- [ ] **8.4 Extract renderIssueRow + renderFolderDropdown** — Small effort, Medium impact (DRY)
- [ ] **8.5 configureSecrets → SecretsService** — Small effort, Medium impact (architecture)
- [ ] **8.6 YAML parsing utility** — Medium effort, Medium impact (DRY)
- [ ] **8.7 LookingGlassPanel extraction** (onInitMesh, policy baseline) — Medium effort, Medium impact (readability)
- [ ] **8.8 CSS import standardization** — Small effort, Low impact (consistency)
- [ ] **8.9 Tree provider base class** — Small effort, Low impact (DRY)
- [ ] **8.10 MeshService + BarService singletons** — Small effort, Low impact (only 2 sites each)

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
| `src/utils/git.ts` | Shared git URL parsing + remote detection | 7 |
| `src/webview/app/components/html.ts` | Button, badge HTML component helpers | 7 |
