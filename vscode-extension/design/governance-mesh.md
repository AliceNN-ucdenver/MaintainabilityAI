# Cheshire: Governance Mesh Extension — Status & Roadmap

**Version:** February 23, 2026
**Author:** Shawn McCarthy, VP & Chief Architect, Global Architecture, Risk and Governance

---

## Extension Identity

**MaintainabilityAI** — a VS Code extension for governance-first architecture management. Named after the Cheshire Cat from Alice in Wonderland: each capability draws from a character in the story.

| Capability | Character | Purpose | Status |
|------------|-----------|---------|--------|
| **Looking Glass** | The Looking Glass | Portfolio dashboard, BAR management, CALM diagramming, policy viewer | Complete |
| **Oraculum** | The Oracle (Caterpillar) | Automated architecture review via GitHub Issues + Claude/Copilot | Complete |
| **Absolem** | Absolem the Caterpillar | Multi-turn AI governance assistant — gap analysis, ADR suggestions, image-to-CALM | Complete |
| **Rabbit Hole** | — | Issue management & agent monitoring; feature creation via Scorecard's "Create Feature" button | Complete |
| **Scorecard** | — | Repository health scorecard + "Create Feature" entry point | Complete |
| **Governance Tree** | — | Sidebar tree view of governance artifacts | Complete |
| **White Rabbit** | White Rabbit | Component scaffolding: ScaffoldPanel → Rabbit Hole with BAR context | Complete |

---

## Architecture

### Panels (Webview)

| Panel | File | Description |
|-------|------|-------------|
| Looking Glass | `LookingGlassPanel.ts` / `lookingGlass.ts` | Primary dashboard — portfolio grid, BAR detail, CALM diagrams, policies, settings |
| Oraculum | `OracularPanel.ts` / `oraculum.ts` | Architecture review hub — create/assign/monitor/results workflow |
| Rabbit Hole | `IssueCreatorPanel.ts` / `main.ts` | Issue hub, feature creation (RCTRO), agent assignment & monitoring |
| Scorecard | `ScorecardPanel.ts` / `scorecard.ts` | Repository health metrics |

### Services

| Service | Responsibility |
|---------|---------------|
| `MeshService` | Read/write mesh.yaml, platforms, policies, Oraculum workflow scaffolding |
| `BarService` | Read/write BAR artifacts (app.yaml, reviews.yaml, CALM files), drift scoring |
| `AbsolemService` | Multi-turn AI conversation, LLM streaming, patch extraction, image-to-CALM |
| `GitHubService` | GitHub API (issues, labels, comments, PRs, workflow checks, secrets) |
| `GitSyncService` | Git operations (status, add, commit, push, pull) |
| `ReviewService` | Oraculum issue body building, prompt pack embedding |
| `ThreatModelService` | LLM-powered threat model generation from BAR artifacts |
| `OrgScannerService` | LLM-powered organization scanning and platform recommendation |
| `CalmTransformer` | CALM JSON to Mermaid diagram conversion |
| `CalmWriteService` | Patch-based CALM JSON editing (incl. `replaceFull` for image-to-CALM) |
| `CalmValidator` | CALM 1.2 schema validation |
| `CapabilityModelService` | Enterprise capability model management |
| `IssueMonitorService` | Real-time GitHub issue polling (comments, labels, PR status) |
| `AgentStatusService` | Agent activity tracking and status display |
| `LlmService` | Multi-provider LLM abstraction (VS Code LM, Claude API, OpenAI) |

### DSL & Data

- **CALM 1.2** — canonical architecture format (nodes, relationships, flows, controls, decorators)
- **mesh.yaml** — portfolio identity, scoring config, drift weights
- **app.yaml** — per-BAR application metadata (name, criticality, repos, lifecycle)
- **reviews.yaml** — per-BAR review history (issue URL, agent, drift score, pillar findings)
- **Prompt packs** — `.caterpillar/prompts/` with YAML registry + markdown domain packs

---

## Design Documents

| Document | Status | Scope |
|----------|--------|-------|
| [`governance-catepillar.md`](governance-catepillar.md) | **1.0.0 Complete** | Oraculum architecture review — issue creation, multi-repo checkout, prompt packs, drift scoring, settings |
| [`governance-calm.md`](governance-calm.md) | **Complete** | CALM 1.2 as canonical DSL for all four architectural views + decorators |
| [`governance-diagram-req.md`](governance-diagram-req.md) | **Complete** | Looking Glass design surface — ReactFlow, ELK layout, CALM read/write, PNG export |
| [`governance-absolem.md`](governance-absolem.md) | **1.0.0 Complete** | Absolem multi-turn AI governance assistant — 7 commands, image-to-CALM, gap analysis, ADR suggestions |
| [`governance-whiterabbit.md`](governance-whiterabbit.md) | **Complete** | White Rabbit — BAR component scaffolding → Rabbit Hole with CALM/ADR/threat model context |

---

## What Ships Today

### Looking Glass Dashboard
- Portfolio grid with platform/BAR hierarchy
- BAR detail: composite score, four pillar scores, CALM diagrams (context + logical), Mermaid sequence/capability/threat diagrams
- Drift indicator with sparkline trend, tophat findings summary (LLM-powered)
- BAR table with drift score badges and review issue links
- ADR management (create/edit/delete)
- App.yaml inline editing with git sync
- Policy viewer with NIST 800-53 control lookup and LLM-powered baseline generation
- Enterprise Architecture lens with capability model navigation
- Org scanner (LLM-powered platform recommendations from GitHub org)
- Sample platform scaffolding (Insurance Operations with 3 CALM BARs)
- Settings gear: workflow deploy, issue template editor, LLM model preference, drift weights, mesh reinitialize

### Absolem AI Governance Assistant
- Floating chat widget at bottom of BAR detail view (collapsible, always visible when BAR selected)
- 7 command chips: drift-analysis, add-components, validate, gap-analysis, suggest-adr, image-to-calm, freeform
- Multi-turn conversation with streaming responses and markdown rendering
- Image-to-CALM via VS Code `LanguageModelDataPart` API (no external API key)
- CALM artifact preview card with structured breakdown and "Open in Editor" / "Apply" buttons
- Cross-pillar gap analysis and ADR suggestion engine

### Oraculum Architecture Review
- Hub/Create/Manage pattern for review lifecycle
- Programmatic GitHub issue creation with multi-select prompt packs
- Agent assignment (Claude Code via `@claude`, Copilot via `copilot-swe-agent`)
- Real-time monitor with avatar timeline, status detection, approve/replan
- PR detection with checks status
- Results rendering with full markdown report
- Review metrics saved to reviews.yaml with drift scoring
- Active review banner with 30-second polling and auto-refresh

### Rabbit Hole (formerly Issue Creator)
- Full-page issue hub (no sidebar in hub mode, matching Oraculum pattern)
- Feature creation via Security Scorecard's "Create Feature" button
- Template-based feature issues (API endpoint, auth, data pipeline, frontend)
- RCTRO prompt generation (Role/Context/Task/Requirements/Output) via LLM
- Multi-category prompt pack selection (OWASP, Maintainability, STRIDE)
- Implementation zone with Claude/Copilot assignment

### White Rabbit
- "Create New" repo → ScaffoldPanel → Rabbit Hole with CALM + ADRs + threat model + scaffold prompt pack → Scorecard
- Component scaffolding with BAR architecture context passed through the panel chain

### Supporting
- Governance sidebar tree view
- Repository scaffolding (CI workflows, CodeQL, fitness functions)
- Secrets configuration (API keys via `gh secret set`)
- Prompt pack browser
- CodeQL SARIF processing with extension rule lookup, numeric severity scoring, OWASP mapping, GitHub issue creation
- Prompt integrity verification (SHA-256 hash validation in CI)

---

## Phase 1 — MVP (Shipped)

- [x] Initiative Mesh initialization (Portfolio > Platform > Business Application hierarchy)
- [x] mesh.yaml with portfolio metadata, platform registry, scoring configuration
- [x] Platform scaffolding with platform.yaml and decision log
- [x] BAR scaffolding with 3 template variants (Minimal / Standard / Full)
- [x] Four governance pillars per BAR: Architecture, Security, Information Risk, Operations
- [x] Structured identifiers: PF-<ORG>-<SEQ>, PLT-<ABBR>, APP-<PLT>-<SEQ>
- [x] File-presence governance scoring with configurable thresholds
- [x] Looking Glass webview dashboard (portfolio, platform, BAR detail views)
- [x] Grin command — quick pass/fail governance notification
- [x] Sidebar tree view for Looking Glass and Grin
- [x] GitHub repository creation on mesh init (git init + gh repo create)
- [x] Policy baseline templates (architecture-standards, security-baseline, risk-framework, operations-standards)

---

## Phase 2 — Enrichment & Discovery

### BAR Discovery
- [x] GitHub org scanning — discover BARs across GitHub org repositories via Octokit API + VS Code LLM recommendations
- [x] Drag-and-drop interface for organizing repos into platforms and BARs
- [x] Multi-repo BAR support — a BAR can govern one or more code repositories
- [ ] Auto-detect existing governance artifacts when onboarding a repo as a BAR

### Architecture DSL Integration
- [x] CALM as default architecture DSL with bar.arch.json (unified), decorator.json
- [x] Architecture DSL dropdown on Initialize Mesh form (CALM / Markdown)
- [x] `architecture_dsl` property in mesh.yaml
- [x] GovernanceScorer auto-detects CALM vs Markdown artifacts
- [x] Sample Platform button with Claims Processing BAR using CALM Schema 1.2
- [x] Template directory restructure to `src/templates/scaffolding/`
- [x] CALM → Mermaid diagram generation (sequence, capability views — kept for Mermaid)
- [x] ReactFlow + ELK.js interactive architecture canvas (context, logical diagrams)
- [x] Custom ReactFlow node components (SystemNode, ActorNode, ExternalSystemNode, ContainerNode, ServiceNode, DataStoreNode, NetworkNode)
- [x] Layout persistence via `.layout.json` files (drag-to-reposition saved per diagram)
- [x] PNG export from ReactFlow canvas
- [x] ELK.js automatic hierarchical layout engine with saved-position reconciliation
- [x] Inline architecture diagram rendering in BAR detail webview
- [x] NIST-mapped CALM controls (IA-2, SC-7, SC-28, AC-6, AU-2, SI-4, SC-13, IR-4) on sample BARs
- [x] Complex Claims Processing pipeline — IDP, verification, coverage, fraud, adjudication, settlement, payment/denial, appeals (human-in-the-loop), event-driven
- [x] Data classification on all sensitive CALM nodes
- [x] LLM-powered STRIDE threat model generation from CALM architecture + app.yaml
- [x] LLM-generated threat Mermaid diagram overlaid on logical architecture with grouped threat badges
- [x] CSV export for machine-readable threat model output
- [x] Generation progress indicators for diagrams and threat models
- [x] Diagram rendering spinner during mermaid processing
- [ ] CALM CLI validation integration (`calm validate`)
- [ ] CALM template bundle generation (`calm template` for diagrams)
- [x] Decorator-based portfolio capability aggregation in Looking Glass (via Business lens capability model)
- [x] Bidirectional editing — add/remove/modify nodes and edges from ReactFlow canvas → see [design surface spec](governance-diagram-req.md) §5–6
- [x] CALM write-back from visual edits (CalmMutator + CalmWriteService patch pipeline)
- [x] File watcher for external CALM edits (CalmFileWatcher with echo suppression via content hash)
- [x] CALM structural validation after mutations (CalmValidator with referential integrity checks)
- [x] Node palette with drag-and-drop creation (context-sensitive by diagram type)
- [x] Property panel for editing CALM fields on selected nodes/edges
- [x] Inline name editing on double-click + inline edge label editing
- [x] Container node collapse/expand toggle
- [x] Multi-select with marquee selection and bulk delete
- [x] Architecture Archetypes — 3 pattern-starter templates (Three-Tier, Event-Driven, Data Pipeline) selectable from BAR detail page → see [design surface spec](governance-diagram-req.md) §7
- [x] Property panel Interfaces section — inline add/remove of per-node interfaces (host, port, unique-id) with `setInterfaces` patch → see [design surface spec](governance-diagram-req.md) D26
- [x] Property panel Capabilities sub-view — tree picker for per-node business capability mappings via `setCapabilities` patch → see [design surface spec](governance-diagram-req.md) D27
- [x] Property panel Controls sub-view — architecture-level controls list editor with add/edit/remove via `setControl`/`removeControl` patches → see [design surface spec](governance-diagram-req.md) D28
- [x] Edge Target Interface dropdown — select destination interface on `connects` relationships → see [design surface spec](governance-diagram-req.md) D30
- [x] CapabilityModel prop wiring — Business lens capability model passed through to diagram canvas for the CapabilitiesEditor tree picker → see [design surface spec](governance-diagram-req.md) D27
- [ ] Timeline support for architectural transition modeling

### Scoring Improvements
- [x] Content-quality scoring — go beyond file presence to evaluate actual content (YAML validity, Markdown completeness, required sections present). Blended formula: presence = 60% base, quality bonus up to 40% (YAML required keys, Markdown headings/word count, JSON structure). Per-artifact quality % shown in pillar cards.
- [ ] Weighted scoring — allow mesh.yaml to define per-pillar weights based on criticality
- [x] Scoring history — track governance scores over time with trend indicators. Persisted as `score-history.yaml` per BAR (version-controlled). Trend arrows (↑↓→) on composite and pillar scores. Governance sparkline chart after 2+ snapshots.
- [ ] Custom scoring rules — allow organizations to define additional artifacts and scoring criteria

### Policy Management
- [x] NIST SP 800-53 curated controls catalog (`policies/nist-800-53-controls.yaml`) — ~35 controls across 10 families
- [x] Policy viewer lens in Looking Glass (EA "Policies" tab) with policy cards and NIST controls table
- [x] Policy YAML editor with save capability
- [x] Clickable NIST references in threat model table → control detail popup
- [x] NIST controls fed into threat model generation prompt for accurate cross-referencing
- [x] Searchable NIST controls table grouped by family with priority indicators
- [x] LLM-powered "Generate Baseline" on policy cards — AI generates comprehensive, production-grade policy YAML from templates
- [x] NIST catalog creation for existing meshes (one-click from Policies tab)

### Policy Enforcement
- [ ] Policy-as-code — validate BAR artifacts against portfolio-level policy baselines
- [ ] Compliance gaps report — compare each BAR against required policy controls
- [ ] Policy versioning — track policy changes and re-evaluate compliance

### Webview Enhancements
- [x] Clickable pillar cards with expandable detail panels (Architecture, Security, Info Risk, Operations)
- [x] Pillar detail rendering extracted to separate files (`pillars/architecturePillar.ts`, `securityPillar.ts`, etc.)
- [x] BAR editing from webview — inline app.yaml editor (name, owner, description, criticality, lifecycle, strategy)
- [x] Architecture Decision Records (ADR) — BTABoK-inspired create/edit/delete with status tracking, written to `architecture/ADRs/` directory
- [x] ~~Sortable/paginated BAR table~~ — replaced by platform drill-down with App Tiles
- [ ] Platform-level health trend sparklines
- [ ] Drag-and-drop BAR reassignment between platforms
- [ ] Keyboard navigation and accessibility improvements

---

## Phase 3 — Automation & CI/CD

### Oraculum — Architecture Review (implemented as "Oraculum", designed as "Caterpillar")
- [x] OracularPanel — 6-phase webview wizard (Select BAR → Configure → Submit → Assign Agent → Monitor → Results)
- [x] GitHub Action workflow template (`oraculum-review.yml`) — triggers on `oraculum-review` label, multi-repo checkout, Claude Code analysis
- [x] Default 4-pillar prompt pack (`oraculum-default.md`) — architecture drift, security, risk, operations analysis
- [x] ReviewService — issue body builder with structured ```oraculum YAML block, prompt pack loader
- [x] Mesh repo detection — parses `git remote get-url origin` on mesh directory for GitHub owner/repo
- [x] Workflow existence check — detects if `oraculum-review.yml` exists on the mesh repo via GitHub API
- [x] One-click workflow provisioning — writes workflow + prompt pack, commits, pushes to mesh repo
- [x] ANTHROPIC_API_KEY secret configuration during `initMesh` flow (password input + `gh secret set`)
- [x] Two-step assign pattern — issue created without trigger label, `oraculum-review` label added in Assign Agent phase
- [x] IssueMonitorService reuse — polls for Claude's analysis comments and displays in Monitor phase
- [x] Looking Glass integration — "Review" button on BAR detail page opens Oraculum pre-populated
- [x] Command palette: `MaintainabilityAI: Oraculum — Architecture Review` with optional BAR path
- [x] GitHubService extensions — `createIssueRaw()` for simple issue creation, `addIssueLabels()` for assign flow, `checkWorkflowExists()` reuse
- [ ] Structured findings parser — extract pillar/severity from Claude's comments into ReviewFinding objects
- [ ] Results view with severity summary table
- [ ] Review status badges on BAR cards in Looking Glass dashboard
- [ ] Scheduled reviews (cron-based issue creation)
- [ ] Additional prompt packs (critical, security-focused)

### CI/CD Integration
- [x] CodeQL SARIF processor (`process-codeql-results.cjs`) — parses SARIF output, extracts security-severity from extension rules, maps to OWASP categories, creates GitHub issues for findings above threshold
- [x] Prompt integrity verification (`validate-prompt-hashes.yml` + `generate-prompt-hashes.cjs`) — SHA-256 hash validation of prompt packs in CI
- [ ] GitHub Actions workflow for governance scoring — run on PR/push, report scores as check status
- [ ] Governance gate — block merges if governance score drops below threshold
- [ ] Webhook support — notify external systems (Slack, Teams) on governance changes
- [ ] Automated BAR creation from CI — scaffold BAR when new service repo is created

### Report Generation
- [ ] Portfolio governance report (HTML/PDF) — exportable summary of all platforms and BARs
- [ ] Executive dashboard — high-level metrics for leadership (aggregate health, trend, risk heatmap)
- [ ] Compliance report — per-BAR compliance status against policy baselines
- [ ] Delta report — changes since last review cadence

### Git Integration
- [x] Per-pillar git sync status indicators on pillar cards
- [x] Per-BAR aggregate sync indicator in BAR table
- [x] One-click sync (stage + commit + push) from BAR detail view
- [x] Git status refresh after write operations (threat model, ADR, app.yaml)
- [x] Push-to-remote banner with one-click push (detects no-upstream and ahead-of-remote states)
- [ ] Auto-commit on scaffold — commit new BAR/platform files with conventional commit message
- [ ] Branch-per-BAR workflow — create feature branches for BAR changes
- [ ] PR creation for governance updates — open PRs when scoring artifacts change

---

## Phase 3.5 — Enterprise Architecture Lenses

### EA Model Tabs
- [x] EA lens tabs (Business, Application, Data, Technology, Integration) with colored indicators
- [x] Application lens — existing portfolio/platform/BAR view re-labeled
- [ ] Data lens — Business Information Model (Coming Soon)
- [ ] Technology lens — Technology Reference Model (Coming Soon)
- [ ] Integration lens — Integration Patterns (Coming Soon)

### Business Capability Model
- [x] Insurance capability model (ACORD-inspired, 10 L1 / ~35 L2 / ~105 L3)
- [x] Banking capability model (BIAN-based, 5 L1 / ~48 L2 / ~290 L3)
- [x] Capability model stored at `decorators/capability-model.json`
- [x] Capability model selection during mesh initialization
- [x] Model switching from portfolio view (Insurance / Banking / Custom)
- [x] Custom capability model JSON upload

### Business Lens Drill-Down
- [x] L1 capability cards with child count and BAR count badges
- [x] L1 → L2 → L3 hierarchical drill-down with breadcrumb navigation
- [x] BAR-to-capability reverse mapping from CALM decorator files
- [x] L3 → BAR list with clickable rows navigating to BAR detail
- [x] Subtree BAR counting (L1 shows total BARs across all descendants)

### App Tiles & Platform Drill-Down
- [x] Reusable App Tile component (score ring, strategy/criticality badges, pillar mini-bars)
- [x] Business lens L3 drill-down shows App Tiles instead of plain rows
- [x] Application lens platform drill-down with App Tiles (platform cards → app tiles → BAR detail)
- [x] BAR detail shows linked repositories with Scorecard/Scaffold navigation

---

## Phase 4 — Multi-Agent & Intelligence

### Absolem AI Governance Assistant
- [x] Absolem promoted to BAR-level floating chat widget (moved from Architecture pillar toggle to persistent bottom-of-BAR-detail panel)
- [x] 7 command chips: drift-analysis, add-components, validate, gap-analysis, suggest-adr, image-to-calm, freeform
- [x] Collapsible chat panel with message history, streaming responses, and markdown rendering

### AI-Assisted Governance
- [x] LLM-powered gap analysis — analyze BAR artifacts across all four pillars and identify governance gaps (via Absolem `gap-analysis` command)
- [x] Auto-generate threat models from CALM architecture (STRIDE via VS Code LLM)
- [x] ADR suggestion engine — recommend architectural decisions based on CALM architecture and existing ADRs (via Absolem `suggest-adr` command)
- [x] Image-to-CALM — generate `bar.arch.json` from architecture diagram images via VS Code `LanguageModelDataPart` API (no external API key needed)
- [x] CALM artifact preview card — structured breakdown of nodes/relationships/flows with "Open in Editor" and "Apply to bar.arch.json" buttons
- [x] `replaceFull` patch operation — complete architecture replacement with automatic layout file cleanup for fresh auto-layout
- [ ] Risk scoring from code metrics — feed pmat/CodeQL data into information risk assessments

### Cross-BAR Analysis
- [ ] Dependency mapping between BARs — which applications depend on which
- [ ] Shared risk identification — common vulnerabilities across the portfolio
- [ ] Platform health correlation — identify systemic governance gaps

### Multi-Mesh Support
- [ ] Multiple mesh configurations — switch between meshes for different portfolios/orgs
- [ ] Mesh federation — aggregate scores across multiple governance meshes
- [ ] Role-based views — different dashboard perspectives for architects, security, operations

---

## Completed Work Log

### Design Surface — Phase 1: Read-Only Canvas (February 2026)

Interactive architecture visualization from CALM JSON. Details: [design surface spec](governance-diagram-req.md) §11 Phase 1.

- ReactFlow v12 canvas with 7 custom node types and custom ProtocolEdge
- ELK.js automatic layout (DOWN for context, RIGHT for logical) with saved-position reconciliation
- Post-layout handle assignment with angle-based algorithm and load balancing
- Bidirectional edge merging (A→B + B→A rendered as single double-arrow edge)
- Layout persistence (`.layout.json`) with drag-to-reposition and viewport save
- PNG export via html-to-image with toast feedback
- CSS bundled via custom esbuild inline-css plugin

### Design Surface — Phase 2: Bidirectional Editing & Archetypes (February 2026)

Canvas edits write back to CALM JSON on disk. Details: [design surface spec](governance-diagram-req.md) §11 Phase 2, decisions D20–D25.

**Write-back infrastructure:**
- CalmMutator (browser-side) — computes mutations against in-memory CALM, produces compact patches
- CalmWriteService (extension-host) — applies patches to `*.arch.json` with minimal diff
- CalmFileWatcher — watches `*.arch.json` with echo suppression via content MD5 hash
- CalmValidator — structural validation (referential integrity, required fields, duplicate IDs)
- Bespoke CALM-aware patch format: `addNode`, `removeNode`, `addRelationship`, `removeRelationship`, `updateField`

**Editing capabilities:**
- Node deletion with cascading relationship removal
- Edge deletion (handles bidirectional compound edge IDs)
- Node creation via drag-and-drop palette (Actor, System, External System, Container, Service, Data Store, Network)
- Edge creation via handle-to-handle drag
- Inline name editing (double-click node) with auto-focused input overlay
- Property panel (right-side) with debounced CALM field editors for nodes and edges
- Container collapse/expand toggle with animated chevron
- Multi-select (marquee + shift-click) with bulk delete

**Architecture Archetypes:**
- Three pattern-starter templates: Three-Tier Web Application, Event-Driven Microservices, Data Pipeline
- Selectable from BAR detail page (contextual action, not command palette)
- Generates `bar.arch.json` in BAR's `architecture/` directory
- Confirmation dialog when overwriting existing architecture files

### CALM as BAR DSL (February 2026)

Design analysis establishing CALM 1.2 as the single source of truth for the BAR. Details: [CALM DSL analysis](governance-calm.md).

- Four-view mapping: context, logical, sequence (native), conceptual (via decorators)
- Decorators over metadata for hierarchical business capabilities (L1/L2/L3)
- Cross-pillar artifact generation from single CALM model
- Pipeline integration design (validate → generate → consistency check → governance review)

### Oraculum Architecture Review — Design + Implementation (February 2026)

Automated architecture drift detection. Design: [Caterpillar spec](governance-catepillar.md). Implemented as "Oraculum" in the VS Code extension.

**Design (spec):**
- Architecture review via Claude Code + GitHub Issues + GitHub Actions
- Prompt pack–driven analysis comparing BAR governance artifacts against code reality
- Findings posted as structured issue comments mapped to four governance pillars

**Implementation (extension):**
- `OracularPanel` — 6-phase webview wizard mirroring the Cheshire Cat issue creator pattern
- `ReviewService` — issue body builder (structured ```oraculum YAML), prompt pack scanner
- `GitHubService` extensions — `createIssueRaw()`, `addIssueLabels()` for two-step assign flow
- GitHub Action workflow template (`oraculum-review.yml`) + default prompt pack (`oraculum-default.md`)
- Workflow existence check + one-click provisioning (write → commit → push)
- `initMesh` enhanced with workflow provisioning step + ANTHROPIC_API_KEY secret configuration
- Looking Glass "Review" button on BAR detail page opens Oraculum pre-populated
- Command: `maintainabilityai.oraculum` with optional `barPath` parameter
- New files: `OracularPanel.ts`, `oraculum.ts` (webview), `oraculum.ts` (command), `ReviewService.ts`
- Modified: `types/index.ts`, `GitHubService.ts`, `MeshService.ts`, `scaffoldTemplates.ts`, `LookingGlassPanel.ts`, `lookingGlass.ts`, `extension.ts`, `package.json`, `esbuild.js`

### Design Surface — Phase 2g: Complete Property Panel (February 2026)

Property Panel extended to cover all CALM data structures. Details: [design surface spec](governance-diagram-req.md) §6.4, decisions D26–D30.

**New patch operations:**
- Extended CalmPatch with `setControl`, `removeControl`, `setCapabilities`, `setInterfaces` ops
- CalmMutator (browser) and CalmWriteService (host) both handle all 4 new operations

**Property Panel enhancements:**
- Interfaces section (inline): add/remove per-node interfaces with unique-id, host, port
- Capabilities sub-view: tree picker for L1/L2/L3 business capabilities from CapabilityModelSummary
- Controls sub-view: architecture-level controls list editor with add/edit/remove
- Edge Target Interface dropdown: select destination interface on `connects` relationships
- Sub-view navigation with back arrow (Capabilities and Controls replace panel content)

**New components:**
- `CapabilitiesEditor.tsx` — tree picker for per-node capability mappings
- `ControlsEditor.tsx` — architecture-level controls list editor

### Unified CALM Architecture File (February 2026)

Migration from two separate CALM files (`context.arch.json` + `logical.arch.json`) to a single unified `bar.arch.json`. Decisions D31–D33.

- Single `bar.arch.json` replaces `context.arch.json` + `logical.arch.json` — all CALM data lives in one file
- Context and logical are projections (derived views), not separate sources
- View derivation rules: Context view shows actors + system-of-interest (collapsed) + external systems; Logical view shows system-of-interest expanded as container + composed-of children
- CALM 1.2 schema stored locally at `src/schemas/calm/1.2/`

### Absolem Promotion & Image-to-CALM (February 2026)

Absolem AI assistant promoted from hidden Architecture pillar toggle to persistent BAR-level floating chat widget. Three new commands added for Phase 4 AI-Assisted Governance. Details: [Absolem spec](governance-absolem.md).

**Absolem UI overhaul:**
- Floating chat widget at bottom of BAR detail view (collapsible, always visible when BAR selected)
- 7 command chips: drift-analysis, add-components, validate, gap-analysis, suggest-adr, image-to-calm, freeform
- Calm-patches fences stripped from chat display — clean streaming UX with "Generating CALM architecture..." indicator
- CALM artifact preview card with structured node/relationship/flow breakdown, "Open in Editor" (VS Code tab), "Apply to bar.arch.json"
- Reject button clears state and confirms cancellation

**Image-to-CALM pipeline:**
- File picker for PNG/JPG architecture diagrams → base64 → `LanguageModelDataPart.image()` via VS Code LM API
- Comprehensive system prompt with nested relationship-type format, 3-level container nesting, steps-based flows
- `replaceFull` CalmPatch operation for complete architecture replacement
- Layout file cleanup (`context.layout.json` / `logical.layout.json`) on replaceFull for fresh auto-layout

**New AI commands:**
- `gap-analysis` — full BAR context (all 4 pillar artifacts, ADRs, threats, CALM, controls) for cross-pillar gap identification
- `suggest-adr` — reviews CALM + existing ADRs to propose missing architectural decision records

**Modified files:** `AbsolemService.ts`, `CalmWriteService.ts`, `LookingGlassPanel.ts`, `lookingGlass.ts`, `architecturePillar.ts`, `types/index.ts`

### CodeQL SARIF Processing & Issue Generation (February 2026)

Automated security finding triage: CodeQL SARIF → severity classification → GitHub issue creation.

- Extension rule lookup — builds rule index from both `driver.rules` and `tool.extensions[].rules` (CodeQL security-extended packs)
- Numeric `security-severity` score as primary severity signal (fallback to SARIF level)
- `numericToSeverity()` — 9.0+ critical, 7.0+ high, 4.0+ medium, else low
- OWASP category mapping from CWE tags
- Diagnostic logging for SARIF structure debugging
- Prompt hash validation workflow for CI integrity checks

**Modified files:** `process-codeql-results.cjs`, `process-codeql-results.js`, `validate-prompt-hashes.yml`, `generate-prompt-hashes.cjs`

### White Rabbit — Component Scaffolding (February 2026)

BAR-to-code implementation workflow. Details: [White Rabbit spec](governance-whiterabbit.md).

- "Create New" repo tab in repo picker modal
- ScaffoldPanel accepts `ComponentScaffoldContext` for BAR-aware scaffolding
- `buildScaffoldDescription()` gathers CALM + ADRs + threat model + scaffold prompt pack into pre-built markdown
- Rabbit Hole pre-populated with BAR context and collapsible "Advanced Prompt Packs"
- Copilot assignment fix: `assignIssue(['copilot-swe-agent[bot]'])` instead of `@copilot` comment
- Default scaffold prompt pack (`cheshire-scaffold-default.md`) with OWASP + STRIDE + maintainability checklists

---

## Ideas / Backlog (Unprioritized)

- [ ] Governance maturity model visualization (levels 1-5 per pillar)
- [ ] Integration with JIRA/ServiceNow for decision tracking
- [ ] Calendar view for review cadence deadlines
- [ ] Governance diff — compare two BAR snapshots side by side
- [ ] Template marketplace — share BAR templates across organizations
- [ ] Offline mode — cache mesh data for disconnected environments
- [ ] Import from existing governance tools (Archer, ServiceNow GRC)
- [ ] Export mesh structure as Mermaid/PlantUML diagrams
- [ ] Remote BAR resolution — support BARs stored as separate GitHub repos (not just monorepo subdirectories)
- [ ] Standardize VS Code LLM usage — align VsCodeLmProvider (Issue Creator) with OrgScanner patterns: add multi-family fallback chain, streaming progress, consistent default model family, and uniform model listing properties
- [ ] Threat model diff — compare before/after threat models when controls change
- [ ] Threat model review workflow — assign threats to owners, track remediation status
- [ ] CALM controls validation — verify declared controls against actual implementation evidence
- [ ] Cross-BAR threat correlation — identify shared threat patterns across the portfolio
- [x] Threat model versioning — inherent via git version control (commit history provides audit trail)
