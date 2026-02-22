# Cheshire: Governance Mesh Extension — Status Overview

**Version:** February 21, 2026
**Author:** Shawn McCarthy, VP & Chief Architect, Global Architecture, Risk and Governance

---

## Extension Identity

**MaintainabilityAI** — a VS Code extension for governance-first architecture management. Named after the Cheshire Cat from Alice in Wonderland: each capability draws from a character in the story.

| Capability | Character | Purpose | Status |
|------------|-----------|---------|--------|
| **Looking Glass** | The Looking Glass | Portfolio dashboard, BAR management, CALM diagramming, policy viewer | Complete |
| **Oraculum** | The Oracle (Caterpillar) | Automated architecture review via GitHub Issues + Claude/Copilot | Complete |
| **Absolem** | Absolem the Caterpillar | Multi-turn CALM refinement agent — "Who are you?" | Design |
| **Rabbit Hole** | — | Issue management & agent monitoring; feature creation via Scorecard's "Create Feature" button | Complete |
| **Scorecard** | — | Repository health scorecard + "Create Feature" entry point | Complete |
| **Governance Tree** | — | Sidebar tree view of governance artifacts | Complete |
| **White Rabbit** | White Rabbit | Component scaffolding: ScaffoldPanel → Rabbit Hole with BAR context | Design |

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
| `GitHubService` | GitHub API (issues, labels, comments, PRs, workflow checks, secrets) |
| `GitSyncService` | Git operations (status, add, commit, push, pull) |
| `ReviewService` | Oraculum issue body building, prompt pack embedding |
| `ThreatModelService` | LLM-powered threat model generation from BAR artifacts |
| `OrgScannerService` | LLM-powered organization scanning and platform recommendation |
| `CalmTransformer` | CALM JSON to Mermaid diagram conversion |
| `CalmWriteService` | Patch-based CALM JSON editing |
| `CalmValidator` | CALM 1.2 schema validation |
| `CapabilityModelService` | Enterprise capability model management |
| `IssueMonitorService` | Real-time GitHub issue polling (comments, labels, PR status) |
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
| [`governance-absolem.md`](governance-absolem.md) | **Design** | Absolem multi-turn CALM refinement agent |
| [`governance-whiterabbit.md`](governance-whiterabbit.md) | **Design** | White Rabbit — BAR component scaffolding → Rabbit Hole with CALM/ADR/threat model context |

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
- Feature creation via Security Scorecard's "Create Feature" button (🐇)
- Template-based feature issues (API endpoint, auth, data pipeline, frontend)
- RCTRO prompt generation (Role/Context/Task/Requirements/Output) via LLM
- Multi-category prompt pack selection (OWASP, Maintainability, STRIDE)
- Implementation zone with Claude/Copilot assignment

### Supporting
- Governance sidebar tree view
- Repository scaffolding (CI workflows, CodeQL, fitness functions)
- Secrets configuration (API keys via `gh secret set`)
- Prompt pack browser
- White Rabbit: "Create New" repo → ScaffoldPanel → Rabbit Hole with CALM + ADRs + threat model + scaffold prompt pack → Scorecard
