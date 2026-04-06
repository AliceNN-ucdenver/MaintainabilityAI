# The Red Queen — Governance-Enforced Agent Intelligence

**Version:** 0.11.0 — Phase 6 Complete
**Date:** March 8, 2026
**Author:** Shawn McCarthy, VP & Chief Architect, Global Architecture, Risk and Governance

> *"Now, here, you see, it takes all the running you can do, to keep in the same place. If you want to get somewhere else, you must run at least twice as fast as that!"*
> — The Red Queen, Through the Looking Glass, Chapter 2

> **Status:** Phase 6 Complete (Phases 1-6 Complete)
> **Depends on:** GovernanceScorer (Complete), PromptPackService (Complete), Oraculum (Complete), Absolem (Complete)
> **Subsumes:** governance-grin.md (The Grin MCP server is now a component of The Red Queen)

## Changelog

| Version | Date | Sections Modified | Summary |
|---------|------|-------------------|---------|
| 0.13.0 | 2026-03-08 | 16, 17 | Phase 8 complete (package + distribution). `@maintainabilityai/redqueen-mcp` npm package with bin entry point for `npx` usage. Quick Start Guide README. Build pipeline (`scripts/prepare-npm-package.sh`, `prepare-npm` script). npm publish GitHub workflow (`.github/workflows/npm-publish.yml`) with auto-bump, `mcp-v*` tags, `[npm-publish]` guard. Copilot hooks: `generateCopilotHooksJson()` → `.github/hooks/redqueen.json`, `generateValidateToolSh()` → `.redqueen/hooks/validate-tool.sh` shared bash wrapper. Claude Code Action implementation workflow: `generateImplementationWorkflow()` → `.github/workflows/redqueen-implement.yml` (issue-labeled trigger). Hook command refs updated `.js` → `.sh` in `generateClaudeSettings()` and `RedQueenService.generateSettings()`. Hard enforcement gate (`redqueen-action`) and break-glass deferred to Phase 9. 25 tools, 219 tests passing. |
| 0.12.0 | 2026-03-08 | 7, 9, 16, 17 | Phase 7 complete. Review Board: `generateRedQueenReviewWorkflow()` generates agent-agnostic PR review workflow for claude/copilot/both; `resolveConsensus()` with any-flag-escalates/unanimous/majority rules; inline subagent definitions (security-reviewer.md, architecture-reviewer.md); self-contained consensus.js script scaffolded into code repos; `assembleReviewBoard()` in RedQueenService. Feedback Loop: `score_snapshot` MCP tool (T7, tool count 24→25); `audit-logger.ts` with JSONL append-only log, correlation fields, `computeScoreDelta()`. Score Decay: `score-decay.ts` with exponential decay (half-life 90d, grace 14d, min floor); `evaluatePolicy()` accepts optional `GovernanceTimestamps` for decay-adjusted tier decisions; decay visualization in Looking Glass BAR detail (`renderDecayIndicator()`). Agent type setting (claude/copilot/both) in Looking Glass Settings. 25 tools, 215 tests passing. |
| 0.11.2 | 2026-03-08 | 9, 16 | Rewrote Section 9 (Multi-Agent Review Board) — agent-agnostic step-based architecture. Single `pull_request` workflow with sequential steps: security review, architecture review, deterministic consensus. Same workflow structure for Claude and Copilot teams — only `uses:` action differs. `redqueen-consensus` GitHub Action runs `resolveConsensus()` as pure TypeScript. Complements existing CodeQL/Snyk CI jobs. Updated Phase 7 checklist: review workflow template, consensus action, role-specific prompts, `agent-type` config. Updated Phase 8 checklist: reorganized into package/scaffold/gate/break-glass sections. |
| 0.11.1 | 2026-03-08 | 16, 17 | Phase 6 continued. Auto-detect BAR from repo URL: `findBarForRepoUrl()` in `governanceBridge.ts` scans all `app.yaml` repos lists to find which BAR owns a given repository. Scorecard auto-detect: when no `decision.json` exists but repo URL matches a BAR, shows "Deploy Governance Files" one-click button. Resync auto-detect: `onResyncGovernance()` falls back to repo URL matching when no existing `decision.json`. Looking Glass "Deploy Gov" button on linked repo rows (open repos only) — writes all Red Queen files directly to repo workspace via `scaffoldAgentConfig()`. Eliminates requirement to scaffold from component picker for existing BAR repos. |
| 0.11.0 | 2026-03-08 | 16, 17 | Phase 6 complete. Cheshire Cat Governance UX Integration — governance woven into every panel. Governance Bridge: `governanceBridge.ts` reads `.redqueen/decision.json` from code repos; `config-scaffold.ts` writes `decision.json` during scaffold. White Rabbit pre-flight: tier banners (green/yellow/red) with pillar mini-scores and constraint tags in BAR detail component picker. ScaffoldPanel governance injection: governance checkbox in file grid, `scaffoldAgentConfig()` called during scaffold for both component-mode and standalone. Rabbit Hole governance posture: tier badge, pillar scores, constraints in input phase; mandated prompt packs auto-selected with 🔒 lock icon (checked+disabled); governance summary in review phase. Agent selection constraints: restricted tier disables secondary agent, supervised tier auto-assigns reviewer, human approval notice. Scorecard governance section: tier badge, pillar scores, constraints display + "Resync from Mesh" button to re-pull governance files. Cross-BAR dependencies: linked BAR table with relationship, score, tier badge; sibling BAR health panel with platform overrides; clickable rows navigate via `drillIntoBar`. 166 tests passing. |
| 0.10.0 | 2026-03-08 | 6, 13, 16, 17 | Phase 5 complete. RedQueenService — policy-driven orchestration replacing hardcoded `computeTier()`. Two-layer policy: mesh-level `orchestration:` (tier thresholds, prompt injection, criticality multipliers, escalation) + platform-level `governance:` (minimum scores, minTier cap, enforcement mode). New `get_orchestration_decision` MCP tool (T14). Generators: governance-context.md, settings.json, AGENTS.md. Tier badge in BAR detail. Editable orchestration policy editor in Settings (pulled forward from Phase 6). Platform governance modal with pencil icon. Reset to Defaults on both editors. Data-driven tests (38 unit + 5 integration). 24 tools, 165 tests passing. |
| 0.9.0 | 2026-03-07 | 2, 3, 4, 16, 17 | Phase 4 complete. Platform architecture support (platform.arch.json). Added readPlatformArchitecture, validatePlatformCalm, findLinkedBars to MeshReader. New tools: get_platform_architecture (T11), blast_radius (T12), validate_platform_calm (T13). Extended get_bar_context with linkedBars. PLAT-001 cross-BAR policy rule. CalmAdapter platform view, BarNode, SharedInfraNode React components, NodePalette platform items. LookingGlassPanel platform architecture handlers. 23 tools, 122 tests passing. |
| 0.8.0 | 2026-03-07 | 1, 2, 4, 16, 17 | Phase 3 complete. Replaced NeMo Guardrails with pure TypeScript policy engine ("The Red Queen's Court"). Added policy-engine.ts, validate_action (T9), get_constraints (T10). Updated config-scaffold: policy.json generation, Node.js hook script. 20 tools, 100 tests passing. |
| 0.7.0 | 2026-03-07 | 2, 14, 16, 17 | Phase 2 complete. Struck HTTP transport, bearer auth, rate limiting, REDQUEEN_ENV (local-only architecture). Moved blast_radius/flow_impact to Phase 4, score_snapshot/audit logging to Phase 7, AST diff to Phase 8. |
| 0.6.0 | 2026-03-07 | 16 | Phase 2 progress — 18 tools, 13 resources, 4 prompts, config scaffolding, 66 tests passing |
| 0.5.0 | 2026-03-07 | 16 | Phase 1 complete — MCP server, mesh-reader, 11 resources, 10 tools, 27 tests passing |
| 0.4.3 | 2026-03-02 | 4.6, 7, 9.3, 14 | Copilot hooks parity, stdio/HTTP transport split, config integrity validation, severity-weighted consensus, tree-sitter language coverage |
| 0.4.2 | 2026-03-01 | All | Design complete — three-layer enforcement, score decay, machine-checkable contracts, break-glass, audit trail |

---

## 1. Overview

### 1.1 The Problem

AI coding agents — Claude Code Action and GitHub Copilot coding agent — are being deployed into GitHub Actions as autonomous contributors. They open PRs, implement features, fix bugs, and review code. But they operate in an **architectural vacuum**:

1. **No governance awareness**: Agents receive the same CLAUDE.md instructions regardless of whether a BAR scores 95% or 25% on governance. A critical application with failing security scores gets the same agent behavior as a healthy internal tool.
2. **No architecture context**: Agents working on a BAR's repo have no awareness of its CALM architecture, governance scores, active threats, interface contracts, or architectural constraints. They write code in isolation.
3. **No deterministic enforcement**: Even with governance context in prompts, LLM-based agents can ignore instructions. There is no deterministic layer that **prevents** policy violations — only advisory guardrails that agents may or may not follow.
4. **No cross-repo governance**: When a frontend service and API service are linked in a CALM flow, changes to the API's interface contract should trigger governance validation on the frontend. Today, each repo is governed independently.
5. **No feedback loop**: Agent outputs (PRs, reviews, remediation) do not feed back into governance scores. Each session starts from zero.
6. **Agent fragmentation**: Claude Code Action reads `.mcp.json` and `CLAUDE.md`; Copilot coding agent reads repo Settings UI MCP config and `copilot-instructions.md`. Governing both requires a unified control plane.

### 1.2 The Solution

**The Red Queen** is a unified governance intelligence and enforcement system comprising three layers:

| Layer | Component | Role |
|-------|-----------|------|
| **Data** | The Grin (MCP Server) | Exposes the governance mesh as `calm://` resources, tools, and prompts to any MCP-compatible agent |
| **Enforcement** | The Red Queen's Court (Policy Engine) | Deterministic validation of agent actions against CALM flows, controls, threat models, and interface contracts using TypeScript policy rules |
| **Orchestration** | Red Queen Policy Engine | Score-driven agent configuration — dynamic CLAUDE.md, permission tiers, multi-agent review, feedback loops |

The Red Queen creates a **closed governance loop**: the mesh defines constraints → The Red Queen's Court enforces them deterministically → agents operate within bounds → outcomes feed back into scores → scores adjust constraints.

### 1.3 Design Principles

1. **Deterministic over advisory**: The Red Queen's Court provides hard enforcement boundaries. Prompts advise; policy rules enforce. An agent cannot bypass a CALM flow constraint regardless of how it interprets its instructions.
2. **Agent-agnostic control plane**: MCP tools are the universal interface. Both Claude Code Action and Copilot coding agent call the same `validate_action` tool. The enforcement logic is identical regardless of which agent triggers it.
3. **Architecture as law**: CALM flows, controls, interfaces, and relationships are the governance constitution. The Red Queen doesn't invent rules — it enforces the architecture the organization has declared.
4. **Progressive autonomy**: Higher governance scores grant agents more autonomy. Lower scores tighten constraints and increase human oversight. This creates a natural incentive to improve governance.
5. **Cross-repo awareness**: When repositories are linked in CALM flows, governance is not per-repo — it's per-flow. A change to any node in a flow can trigger validation across all linked repositories.
6. **Minimal infrastructure**: The Red Queen runs as a Node.js process reading governance mesh files. No database, no cloud service, no sidecar. The policy engine runs in-process as pure TypeScript — no Python, no HTTP roundtrips. The process is ephemeral and stateless — spun up on demand in CI/CD or locally.

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                            │
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐               │
│  │  Claude Code     │         │  Copilot Coding  │               │
│  │  Action          │         │  Agent           │               │
│  │                  │         │                  │               │
│  │  Reads:          │         │  Reads:          │               │
│  │  - .mcp.json     │         │  - Repo Settings │               │
│  │  - CLAUDE.md     │         │  - AGENTS.md     │               │
│  │  - settings.json │         │  - copilot-      │               │
│  │                  │         │    instructions   │               │
│  └────────┬─────────┘         └────────┬─────────┘               │
│           │                            │                         │
│           │      MCP Tool Calls        │                         │
│           └────────────┬───────────────┘                         │
│                        │                                         │
│  ┌─────────────────────┴─────────────────────────────────────┐   │
│  │              The Red Queen (MCP Server)                     │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐    │   │
│  │  │              The Grin (Data Layer)                   │    │   │
│  │  │                                                     │    │   │
│  │  │  Resources (calm://)     Tools            Prompts   │    │   │
│  │  │  ├─ portfolio            ├─ find_bars     ├─ arch   │    │   │
│  │  │  ├─ bars/{id}            ├─ get_bar_ctx     review  │    │   │
│  │  │  ├─ bars/{id}/arch       ├─ blast_radius  ├─ remed  │    │   │
│  │  │  ├─ bars/{id}/scores     ├─ gov_gaps        plan    │    │   │
│  │  │  ├─ bars/{id}/threats    ├─ arch_query    ├─ threat  │    │   │
│  │  │  ├─ bars/{id}/controls   ├─ validate_calm   assess  │    │   │
│  │  │  ├─ bars/{id}/flows      ├─ compare_bars  ├─ adr    │    │   │
│  │  │  └─ capabilities         └─ score_snap      prop    │    │   │
│  │  └─────────────────────────────┬───────────────────────┘    │   │
│  │                                │                            │   │
│  │  ┌─────────────────────────────┴──────────────────────┐     │   │
│  │  │         The Red Queen's Court (Policy Engine)       │     │   │
│  │  │                                                     │     │   │
│  │  │  Policy Rules (TypeScript):                         │     │   │
│  │  │  ├─ TIER-001..003  (permission tier enforcement)    │     │   │
│  │  │  ├─ PATH-001       (read-only path protection)      │     │   │
│  │  │  ├─ SEC-001..002   (security-critical files)        │     │   │
│  │  │  ├─ CALM-001..004  (CALM flow constraints)          │     │   │
│  │  │  ├─ CTRL-001       (control adherence)              │     │   │
│  │  │  └─ PLAT-001       (cross-BAR shared node warning)  │     │   │
│  │  │                                                     │     │   │
│  │  │  Evaluation Layers:                                 │     │   │
│  │  │  ├─ Layer 1: Static rules (hooks, ~50ms)            │     │   │
│  │  │  └─ Layer 2: Full CALM evaluation (MCP, ~200ms)     │     │   │
│  │  └────────────────────────────────────────────────────┘      │   │
│  │                                │                            │   │
│  │  ┌─────────────────────────────┴──────────────────────┐     │   │
│  │  │         Red Queen Policy Engine                     │     │   │
│  │  │                                                     │     │   │
│  │  │  ├─ Policy Evaluator (score → tier → permissions)   │     │   │
│  │  │  ├─ Agent Configurator (CLAUDE.md, settings.json)   │     │   │
│  │  │  ├─ Review Board Assembly (multi-agent consensus)   │     │   │
│  │  │  ├─ Cross-Repo Validator (flow-level governance)    │     │   │
│  │  │  └─ Feedback Loop (score delta, agent memory)       │     │   │
│  │  └────────────────────────────────────────────────────┘      │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                │                                 │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   ~/governance-mesh/    │
                    │   mesh.yaml             │
                    │   platforms/            │
                    │     ├── platform.arch.json│
                    │     └── bars/           │
                    │         ├── app.yaml    │
                    │         ├── bar.arch.json│
                    │         ├── score-history│
                    │         ├── ADRs/       │
                    │         └── threats/    │
                    └─────────────────────────┘
```

### 2.2 Module Structure

```
vscode-extension/
├── src/
│   └── mcp/
│       ├── server.ts                  # McpServer setup, transport binding
│       ├── resources/
│       │   ├── portfolio.ts           # calm://portfolio/* resources
│       │   ├── bars.ts                # calm://bars/* resources (incl. flows, controls)
│       │   ├── capabilities.ts        # calm://capabilities/* resources
│       │   └── prompts.ts             # calm://prompts/* resources
│       ├── tools.ts                   # All MCP tools (23 tools in single module)
│       ├── prompts.ts                 # MCP prompt templates (RCTRO pattern)
│       ├── policy-engine.ts           # The Red Queen's Court — deterministic policy evaluation
│       ├── config-scaffold.ts         # Agent config scaffolding (hooks, policy.json, AGENTS.md)
│       └── __tests__/                 # Unit + integration tests (122 tests)
├── core/
│   └── mesh-reader.ts                # Governance mesh file I/O + CALM parsing
└── mcp-server.js                      # Standalone entry point (stdio)
```

### 2.3 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| MCP SDK | `@modelcontextprotocol/sdk` v1.27+ | Official TypeScript SDK, full 2025-11-25 spec |
| ~~NeMo Guardrails~~ | ~~`nemoguardrails` Python package~~ | ~~Struck: replaced by in-process TypeScript policy engine (The Red Queen's Court). No Python sidecar, no HTTP, same deterministic enforcement.~~ |
| Schema validation | `zod` | Already in project; MCP SDK uses Zod natively |
| Transport | `StdioServerTransport` | Zero config for local clients; agents clone mesh and run MCP locally |
| ~~Transport (remote)~~ | ~~`NodeStreamableHTTPServerTransport`~~ | ~~Struck: local-only architecture, no remote dependency~~ |
| File I/O | `fs` (Node.js) | Direct mesh file reads, no database |
| YAML parsing | `js-yaml` | Already in project for mesh.yaml/app.yaml |
| Build | esbuild | Bundle as standalone `.js` alongside extension |

---

## 3. The Grin — MCP Data Layer

The Grin is the MCP server that exposes the governance mesh as structured, queryable data. It is the persistent interface that remains visible to AI agents even when the VS Code extension is not open — like the Cheshire Cat's grin that remains after the cat disappears.

### 3.1 Resources

Resources are read-only data exposed via `calm://` URIs. All resources return JSON content.

| # | URI | Name | Description |
|---|-----|------|-------------|
| R1 | `calm://portfolio` | Portfolio Summary | mesh.yaml identity, platform count, BAR count, aggregate scores |
| R2 | `calm://portfolio/platforms` | Platform List | All platforms with BAR counts and aggregate scores |
| R3 | `calm://platforms/{platformId}` | Platform Detail | Platform metadata, BAR list, platform-level scoring |
| R4 | `calm://platforms/{platformId}/bars` | Platform BARs | All BARs under a platform with summary scores |
| R5 | `calm://bars/{barId}` | BAR Summary | app.yaml metadata, composite score, pillar scores, repo list |
| R6 | `calm://bars/{barId}/architecture` | BAR Architecture | Full CALM 1.2 JSON (bar.arch.json) |
| R7 | `calm://bars/{barId}/scores` | BAR Scores | Current pillar scores + score-history.yaml trend data |
| R8 | `calm://bars/{barId}/threats` | BAR Threat Model | STRIDE threat model (if generated) |
| R9 | `calm://bars/{barId}/adrs` | BAR ADRs | All architectural decision records |
| R10 | `calm://bars/{barId}/reviews` | BAR Reviews | reviews.yaml — Oraculum review history with drift scores |
| R11 | `calm://bars/{barId}/controls` | BAR Controls | CALM `controls` section — security controls with NIST references |
| R12 | `calm://bars/{barId}/flows` | BAR Flows | CALM `flows` section — transitions, relationships, interface contracts |
| R13 | `calm://capabilities` | Capability Model | Full capability model (L1/L2/L3) with BAR mappings |
| R14 | `calm://prompts/{domain}/{packId}` | Prompt Pack | Prompt pack content (rabbit-hole or looking-glass domain) |

#### Resource Content Shapes

```typescript
interface BarResource {
  id: string;                      // From app.yaml application.id
  name: string;                    // From app.yaml application.name
  platform: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  lifecycle: string;               // build | run | sunset
  strategy: string;                // REAP: reassess | extract | advance | prune
  owner: string;
  repos: string[];                 // GitHub repo URLs
  linkedBars: string[];            // BARs connected via CALM flows
  scores: {
    composite: number;
    architecture: number;
    security: number;
    informationRisk: number;
    operations: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  artifacts: {
    hasCalm: boolean;
    hasThreatModel: boolean;
    hasAdrs: boolean;
    hasReviews: boolean;
    hasControls: boolean;
    hasFlows: boolean;
  };
}

// R6: Full CALM 1.2 architecture
interface ArchitectureResource {
  $schema: string;
  nodes: CalmNode[];
  relationships: CalmRelationship[];
  flows?: CalmFlow[];
  controls?: Record<string, CalmControl>;
  decorators?: CalmDecorator[];
}

// R12: CALM flows with transitions and interface references
interface FlowsResource {
  flows: CalmFlow[];
  resolvedInterfaces: ResolvedInterface[];  // Interfaces expanded with node details
  crossRepoFlows: CrossRepoFlow[];          // Flows spanning multiple BARs
}

interface CrossRepoFlow {
  flowId: string;
  flowName: string;
  bars: string[];                            // BAR IDs involved in this flow
  transitions: CrossRepoTransition[];
}

interface CrossRepoTransition {
  sequenceNumber: number;
  sourceBar: string;                         // BAR ID of source node
  destinationBar: string;                    // BAR ID of destination node
  relationshipId: string;
  interfaces: CalmInterface[];               // Contracted interfaces
}
```

### 3.2 Tools

| # | Tool | Type | Description |
|---|------|------|-------------|
| T1 | `find_bars` | Read | Search BARs by name, platform, criticality, score range, or governance status |
| T2 | `get_bar_context` | Read | Comprehensive BAR context bundle — architecture + scores + threats + ADRs in one call |
| ~~T3~~ | ~~`blast_radius`~~ | ~~Read~~ | ~~Given a CALM node ID, compute downstream impact~~ — Moved to T12 with platform-level cross-BAR analysis |
| T4 | `governance_gaps` | Read | Identify all governance gaps — missing artifacts, weak scores, overdue reviews |
| T5 | `architecture_query` | Read | Natural language query against CALM model |
| T6 | `compare_bars` | Read | Side-by-side comparison of two BARs across all four pillars |
| T7 | `score_snapshot` | Write | Trigger a governance score snapshot |
| T8 | `validate_calm` | Read | Run CalmValidator against architecture file |
| T9 | `validate_action` | Enforce | **NeMo-backed**: Validate a proposed agent action against CALM flows, controls, and interface contracts |
| T10 | `get_constraints` | Read | Get active governance constraints for a BAR (tier, permissions, prompt packs) |
| T11 | `get_platform_architecture` | Read | Read platform-level CALM model (platform.arch.json) with nodes, relationships, and linked BAR metadata |
| T12 | `blast_radius` | Read | Compute cross-BAR impact for a given BAR — linked BARs, shared infrastructure, and platform-level connection analysis |
| T13 | `validate_platform_calm` | Read | Validate platform-level CALM architecture structure (nodes, relationships, unique IDs) |

#### T2: get_bar_context (Critical — Single-Call Context Bundle)

```typescript
server.registerTool(
  'get_bar_context',
  {
    title: 'Get Complete BAR Context',
    description: 'Retrieves a comprehensive context bundle for a BAR including architecture (CALM), governance scores, threat model, ADRs, recent reviews, security controls, flows, and interface contracts. Use this before working on any code in a BAR\'s repositories.',
    inputSchema: z.object({
      barId: z.string().describe('BAR identifier (platformDir/barDir)'),
      include: z.array(z.enum([
        'architecture', 'scores', 'threats', 'adrs', 'reviews',
        'controls', 'flows', 'interfaces', 'capabilities', 'prompts',
        'linkedBars', 'orchestration'
      ])).default(['architecture', 'scores', 'threats', 'adrs', 'controls', 'flows', 'orchestration'])
    }),
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ barId, include }) => { /* ... */ }
);
```

#### T9: validate_action (NeMo-Backed Enforcement)

The most critical tool — the deterministic enforcement point for all agent governance.

```typescript
server.registerTool(
  'validate_action',
  {
    title: 'Validate Agent Action',
    description: 'Validate a proposed action against CALM governance constraints. Returns approval, denial, or conditional approval with required modifications. This tool uses deterministic NeMo Guardrails — not LLM judgment — to enforce governance.',
    inputSchema: z.object({
      barId: z.string().describe('BAR the action targets'),
      actionType: z.enum([
        'create_service', 'modify_service', 'add_dependency',
        'add_database_connection', 'modify_interface', 'add_endpoint',
        'modify_authentication', 'change_data_flow', 'add_external_call',
        'modify_infrastructure', 'update_config'
      ]),
      details: z.object({
        sourceNode: z.string().optional().describe('CALM node ID of the source'),
        targetNode: z.string().optional().describe('CALM node ID of the target'),
        interfaceId: z.string().optional().describe('Interface being modified'),
        flowId: z.string().optional().describe('Flow being affected'),
        description: z.string().describe('What the agent intends to do'),
        affectedFiles: z.array(z.string()).optional()
      })
    }),
    outputSchema: z.object({
      allowed: z.boolean(),
      verdict: z.enum(['approved', 'denied', 'conditional']),
      rail: z.string().describe('Which guardrail evaluated this action'),
      reason: z.string(),
      conditions: z.array(z.string()).optional(),
      affectedFlows: z.array(z.string()).optional(),
      affectedInterfaces: z.array(z.string()).optional(),
      crossRepoImpact: z.array(z.object({
        barId: z.string(),
        repoUrl: z.string(),
        impact: z.string()
      })).optional()
    }),
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ barId, actionType, details }) => {
    // 1. Load BAR's CALM model + controls + flows
    // 2. Build NeMo Guardrails config from CALM constraints
    // 3. Run action through NeMo engine
    // 4. Return deterministic verdict
  }
);
```

#### T11: get_platform_architecture (Platform CALM Model)

```typescript
server.tool(
  'get_platform_architecture',
  'Read the platform-level CALM architecture model (platform.arch.json) showing cross-BAR relationships and shared infrastructure.',
  {
    platformName: z.string().describe('Platform name or ID'),
  },
  async ({ platformName }) => {
    // 1. Resolve platform by ID or name (case-insensitive)
    // 2. Read platform.arch.json from platform directory
    // 3. Return nodes, relationships, and linked BAR metadata
  }
);
```

#### T12: blast_radius (Cross-BAR Impact Analysis)

```typescript
server.tool(
  'blast_radius',
  'Find all BARs and shared infrastructure connected to a given BAR via the platform architecture. Shows cross-BAR impact for proposed changes.',
  {
    barName: z.string().describe('Name of the BAR to analyze'),
  },
  async ({ barName }) => {
    // 1. Find BAR and resolve platform membership
    // 2. Use findLinkedBars() to discover bar-to-bar and bar-to-infrastructure connections
    // 3. Compute impact level (high >3 connections, medium >0, none)
    // 4. Return linkedBars, sharedInfrastructure, impactLevel
  }
);
```

#### T13: validate_platform_calm (Platform CALM Validation)

```typescript
server.tool(
  'validate_platform_calm',
  'Validate platform-level CALM architecture file (platform.arch.json) for structural correctness: valid node types, bar-id references, valid relationships.',
  {
    platformName: z.string().describe('Platform name or ID to validate'),
  },
  async ({ platformName }) => {
    // 1. Resolve platform by ID or name
    // 2. Run validatePlatformCalm() — checks nodes, relationships, unique IDs
    // 3. Return valid/invalid with errors and warnings
  }
);
```

### 3.3 Prompts

MCP prompts are reusable templates exposed as slash commands in clients.

| # | Prompt | Description | Arguments |
|---|--------|-------------|-----------|
| P1 | `architecture-review` | Complete architecture review prompt for a BAR | barId, scope |
| P2 | `remediation-plan` | Generate a remediation plan for governance gaps | barId, pillar |
| P3 | `threat-assessment` | Assess security posture using CALM + controls + threat model | barId |
| P4 | `adr-proposal` | Draft an ADR based on architecture context | barId, title |

Prompts follow the RCTRO pattern (Role → Context → Task → Requirements → Output) and are built dynamically from BAR context:

```typescript
async ({ barId, pillars }) => {
  const context = await getBarContext(barId,
    ['architecture', 'scores', 'threats', 'adrs', 'controls', 'flows']);
  return {
    messages: [{
      role: 'user',
      content: { type: 'text', text: buildReviewPrompt(context, pillars) }
    }]
  };
};
```

---

## 4. ~~NeMo Guardrails~~ The Red Queen's Court — Deterministic Governance Enforcement

> **ARCHITECTURAL DECISION (v0.8.0):** NeMo Guardrails was originally planned as the enforcement backend. Research revealed NeMo is designed for **conversational AI safety** (chatbot dialogue flows), not deterministic governance policy enforcement. Our rules — tier checks, file path validation, CALM constraint enforcement — are condition→decision logic, not conversation state machines. Replaced with a **pure TypeScript policy engine** that runs in-process. This eliminates the Python sidecar, Colang DSL, and HTTP roundtrips while delivering identical deterministic enforcement. See `src/mcp/policy-engine.ts`.

### ~~4.1 Why NeMo Guardrails~~ 4.1 Why a TypeScript Policy Engine

The fundamental problem with LLM-based governance is that prompts are advisory — agents can and do ignore instructions. The Red Queen's Court provides a **deterministic enforcement layer** using TypeScript policy rules that evaluate conditions and return allow/deny decisions.

Key properties:

| Property | Value for Governance |
|----------|---------------------|
| **Deterministic rules** | TypeScript rule functions evaluate conditions and return verdicts — no LLM inference |
| **Two-layer evaluation** | Layer 1 (hooks): fast static rules from pre-computed policy.json (~50ms). Layer 2 (MCP tools): full CALM-aware evaluation (~200ms) |
| **In-process** | No sidecar, no HTTP, no Python. Runs in the same Node.js process as the MCP server |
| **Same test framework** | Policy rules are tested with vitest alongside all other MCP tests |
| **Five rule types** | TIER (permission enforcement), PATH (read-only protection), SEC (security-critical files), CALM (flow constraints), CTRL (control adherence) |

### 4.2 NeMo Integration Architecture

NeMo Guardrails runs as a sidecar process alongside the Red Queen MCP server. The MCP server delegates validation requests to NeMo, which evaluates them against dynamically-generated Colang 2.0 rails.

```
┌─────────────────────────────────────────────────────┐
│              Red Queen MCP Server (Node.js)           │
│                                                       │
│  validate_action() ──→ HTTP POST ──→ NeMo Guardrails │
│  validate_interface_contract() ──→     (Python)       │
│                                        │              │
│                              ┌─────────┴─────────┐   │
│                              │ Colang 2.0 Engine  │   │
│                              │                    │   │
│                              │ Per-BAR configs:   │   │
│                              │ ├─ bar-A/config.co │   │
│                              │ ├─ bar-B/config.co │   │
│                              │ └─ bar-C/config.co │   │
│                              │                    │   │
│                              │ Shared rails:      │   │
│                              │ ├─ flow-rails.co   │   │
│                              │ ├─ control-rails.co│   │
│                              │ ├─ interface.co    │   │
│                              │ └─ threat.co       │   │
│                              │                    │   │
│                              │ Custom actions:    │   │
│                              │ ├─ flow_validator  │   │
│                              │ ├─ control_check   │   │
│                              │ ├─ interface_check │   │
│                              │ └─ threat_check    │   │
│                              └────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

### 4.3 Dynamic Config Generation

The Red Queen dynamically builds NeMo Guardrails configurations from governance mesh data. Each BAR gets a unique configuration that reflects its CALM architecture, controls, flows, and governance scores.

```typescript
// src/mcp/guardrails/config-builder.ts

interface GuardrailsConfig {
  colangContent: string;       // Generated Colang 2.0 source
  yamlConfig: string;          // NeMo config.yml
  actions: ActionDefinition[]; // Custom actions to register
}

function buildGuardrailsConfig(
  bar: BarResource,
  architecture: ArchitectureResource,
  scores: ScoresResource,
  policy: OrchestrationPolicy
): GuardrailsConfig {

  let colang = '';

  // ── 1. Import shared rail definitions ──────────────────────
  colang += `import flow_constraint_rail\n`;
  colang += `import control_adherence_rail\n`;
  colang += `import interface_contract_rail\n`;
  colang += `import threat_model_rail\n\n`;

  // ── 2. Define CALM architecture facts ──────────────────────
  // Nodes become Colang variables the engine can reference
  for (const node of architecture.nodes) {
    colang += `define var $node_${sanitize(node['unique-id'])} = `;
    colang += `{"id": "${node['unique-id']}", "name": "${node.name}", `;
    colang += `"type": "${node['node-type']}"}\n`;
  }
  colang += '\n';

  // ── 3. Define allowed connections (from CALM relationships) ─
  const connects = architecture.relationships.filter(
    r => r['relationship-type']?.connects
  );
  colang += `define var $allowed_connections = [\n`;
  for (const rel of connects) {
    const conn = rel['relationship-type'].connects;
    colang += `  {"source": "${conn.source.node}", `;
    colang += `"destination": "${conn.destination.node}", `;
    colang += `"interfaces": ${JSON.stringify(conn.destination.interfaces || [])}},\n`;
  }
  colang += `]\n\n`;

  // ── 4. Define flows with transition order ──────────────────
  if (architecture.flows) {
    for (const flow of architecture.flows) {
      colang += `define var $flow_${sanitize(flow['unique-id'])} = {\n`;
      colang += `  "id": "${flow['unique-id']}",\n`;
      colang += `  "name": "${flow.name}",\n`;
      colang += `  "transitions": [\n`;
      for (const t of flow.transitions) {
        colang += `    {"seq": ${t['sequence-number']}, `;
        colang += `"rel_id": "${t['relationship-unique-id']}"},\n`;
      }
      colang += `  ]\n}\n\n`;
    }
  }

  // ── 5. Define controls as enforcement requirements ─────────
  if (architecture.controls) {
    colang += `define var $controls = [\n`;
    for (const [id, ctrl] of Object.entries(architecture.controls)) {
      colang += `  {"id": "${id}", "description": "${ctrl.description}", `;
      colang += `"requirements": ${JSON.stringify(ctrl.requirements)}},\n`;
    }
    colang += `]\n\n`;
  }

  // ── 6. Define interface contracts ──────────────────────────
  const interfaces = architecture.nodes.flatMap(
    n => (n.interfaces || []).map(i => ({ nodeId: n['unique-id'], ...i }))
  );
  colang += `define var $interface_contracts = [\n`;
  for (const iface of interfaces) {
    colang += `  {"nodeId": "${iface.nodeId}", "interfaceId": "${iface['unique-id']}", `;
    colang += `"host": "${iface.host || ''}", "port": ${iface.port || 0}},\n`;
  }
  colang += `]\n\n`;

  // ── 7. Define permission tier based on governance score ────
  const tier = resolveTier(scores, policy);
  colang += `define var $permission_tier = "${tier}"\n`;
  colang += `define var $governance_score = ${scores.current.composite}\n`;
  colang += `define var $bar_criticality = "${bar.criticality}"\n\n`;

  // ── 8. Activate rails ──────────────────────────────────────
  colang += `@active\nflow main\n`;
  colang += `  activate flow_constraint_rail\n`;
  colang += `  activate control_adherence_rail\n`;
  colang += `  activate interface_contract_rail\n`;
  colang += `  activate threat_model_rail\n`;
  colang += `  activate permission_tier_rail\n`;

  return {
    colangContent: colang,
    yamlConfig: buildNemoYaml(bar),
    actions: getCustomActions()
  };
}
```

### 4.4 Colang 2.0 Rail Definitions

#### 4.4.1 Flow Constraint Rails

Enforce that agent actions respect CALM flow transitions — services must be connected in the declared order.

```colang
# rails/flow-rails.co
# Enforces CALM flow transition ordering and relationship constraints

@action
async def validate_flow_constraint(action_type, source_node, target_node, flow_id):
    """Validate that a proposed action respects CALM flow transitions."""
    # Custom action implemented in Python — calls mesh reader
    pass

flow flow_constraint_rail
    """Prevent actions that violate CALM flow transition ordering."""

    match user said "validate_action"
        with $action_type = "add_dependency"
        or $action_type = "add_database_connection"
        or $action_type = "add_external_call"

    # Check if the proposed connection exists in declared flows
    $result = await validate_flow_constraint(
        action_type=$action_type,
        source_node=$source_node,
        target_node=$target_node,
        flow_id=$flow_id
    )

    if not $result.valid
        send bot said "Action denied: {$result.reason}"
        send bot said "This action would violate flow '{$result.flow_name}' which requires "
        send bot said "transitions in order: {$result.expected_order}"
        send bot said "The proposed connection from {$source_node} to {$target_node} "
        send bot said "is not declared in any CALM relationship."
        stop

    # Valid — allow the action to proceed
    send bot said "Action approved: connection is consistent with flow '{$result.flow_name}'"
```

**Example enforcement scenario:**

A CALM flow `user-registration-flow` declares transitions:
1. `web-frontend` → `api-gateway` (sequence 1)
2. `api-gateway` → `user-service` (sequence 2)
3. `user-service` → `user-database` (sequence 3)

If an agent tries to add a direct connection from `web-frontend` → `user-database`, the flow constraint rail **denies** the action because no CALM relationship declares that connection. The agent must route through `api-gateway` → `user-service` → `user-database`.

#### 4.4.2 Control Adherence Rails

Enforce that agent actions comply with declared CALM security controls.

```colang
# rails/control-rails.co
# Enforces CALM control requirements (NIST-mapped)

@action
async def validate_control_adherence(action_type, target_node, control_ids):
    """Validate that a proposed action maintains compliance with CALM controls."""
    pass

flow control_adherence_rail
    """Prevent actions that would violate declared CALM controls."""

    match user said "validate_action"
        with $action_type = "modify_authentication"
        or $action_type = "modify_service"
        or $action_type = "add_endpoint"
        or $action_type = "change_data_flow"

    # Load controls applicable to the target node
    $result = await validate_control_adherence(
        action_type=$action_type,
        target_node=$target_node,
        control_ids=$active_controls
    )

    if $result.has_violations
        send bot said "Action blocked: control violation detected"
        for $v in $result.violations
            send bot said "- Control {$v.control_id} ({$v.nist_ref}): {$v.violation}"
            send bot said "  Required: {$v.requirement}"
        stop

    if $result.has_warnings
        send bot said "Action conditionally approved with warnings:"
        for $w in $result.warnings
            send bot said "- {$w.control_id}: {$w.message}"
        # Allow but flag

    send bot said "Action approved: all controls satisfied"
```

**Example enforcement scenario:**

A BAR declares control `ctrl-auth-001` with description "NIST AC-3: Enforce approved authorizations for logical access" and requirement URL pointing to OAuth2 spec. If an agent tries to add an endpoint without authentication middleware, the control adherence rail **blocks** the action and reports the NIST AC-3 violation.

#### 4.4.3 Interface Contract Rails (Cross-Repo Semantics)

This is the "huge" capability — enforcing that changes in one repo respect interface contracts defined in CALM flows that span multiple repositories.

```colang
# rails/interface-rails.co
# Enforces cross-repo interface contracts defined in CALM flows

@action
async def validate_interface_contract(
    source_bar, target_bar, interface_id, change_description
):
    """Validate that a change in source_bar respects the interface
    contract declared on target_bar's node."""
    pass

@action
async def resolve_cross_repo_flows(source_bar, target_bar):
    """Find all CALM flows that link source_bar and target_bar."""
    pass

flow interface_contract_rail
    """Prevent changes that violate cross-repo interface contracts."""

    match user said "validate_interface_contract"
        with $source_bar and $target_bar

    # Step 1: Resolve all flows linking these BARs
    $flows = await resolve_cross_repo_flows(
        source_bar=$source_bar,
        target_bar=$target_bar
    )

    if len($flows) == 0
        send bot said "No CALM flows link {$source_bar} to {$target_bar}. No interface contracts to validate."
        stop

    # Step 2: For each shared flow, validate interface adherence
    $all_valid = True
    for $flow in $flows
        $result = await validate_interface_contract(
            source_bar=$source_bar,
            target_bar=$target_bar,
            interface_id=$flow.interface_id,
            change_description=$change_description
        )

        if not $result.valid
            $all_valid = False
            send bot said "Interface contract violation in flow '{$flow.name}':"
            send bot said "  Interface: {$result.interface_id} on node {$result.target_node}"
            send bot said "  Contract: {$result.contract_spec}"
            send bot said "  Violation: {$result.violation}"
            send bot said "  Impact: Changes to {$source_bar} would break compatibility with {$target_bar}"

    if not $all_valid
        send bot said "ACTION DENIED: Cross-repo interface contract violations detected."
        send bot said "The target BAR ({$target_bar}) must be updated first, or the proposed change must respect the existing contract."
        stop

    send bot said "Interface contracts validated across {len($flows)} shared flow(s)."
```

#### 4.4.4 Threat Model Rails

Enforce that agent actions don't introduce or worsen STRIDE threats.

```colang
# rails/threat-rails.co

@action
async def check_threat_model(action_type, target_node, threat_categories):
    """Check proposed action against active STRIDE threat model."""
    pass

flow threat_model_rail
    """Validate actions against the BAR's STRIDE threat model."""

    match user said "validate_action"
        with $action_type = "add_external_call"
        or $action_type = "modify_authentication"
        or $action_type = "change_data_flow"
        or $action_type = "add_endpoint"

    $result = await check_threat_model(
        action_type=$action_type,
        target_node=$target_node,
        threat_categories=$active_threats
    )

    if $result.introduces_threat
        send bot said "Action flagged: potential threat introduction"
        send bot said "STRIDE category: {$result.threat_category}"
        send bot said "Threat: {$result.threat_description}"
        send bot said "Existing mitigation: {$result.current_mitigation}"
        send bot said "Impact: {$result.impact_description}"

        if $result.severity == "critical"
            send bot said "ACTION DENIED: Critical threat would be introduced."
            stop

        send bot said "ACTION CONDITIONALLY APPROVED: Implement the following mitigation before proceeding:"
        send bot said "- {$result.required_mitigation}"

    send bot said "Threat model check passed."
```

#### 4.4.5 Permission Tier Rails

Enforce score-based permission boundaries.

```colang
# rails/permission-rails.co

flow permission_tier_rail
    """Enforce permission boundaries based on governance score tier."""

    match user said "validate_action"

    if $permission_tier == "restricted"
        if $action_type == "modify_infrastructure" or $action_type == "update_config"
            send bot said "ACTION DENIED: Infrastructure and configuration changes "
            send bot said "are not permitted under the 'restricted' tier "
            send bot said "(governance score: {$governance_score}%)."
            send bot said "Improve governance score above 50% for 'supervised' access."
            stop

    if $permission_tier == "supervised"
        if $action_type == "modify_infrastructure"
            send bot said "ACTION REQUIRES APPROVAL: Infrastructure changes under "
            send bot said "'supervised' tier require human approval."
            send bot said "Governance score: {$governance_score}%"
            # Allow but flag for human review

    # Autonomous tier — all actions permitted (within other rail constraints)
```

### 4.5 Custom Action Implementations

Custom actions bridge NeMo Guardrails to the governance mesh data:

```typescript
// src/mcp/guardrails/actions/flow-validator.ts

import { meshReader } from '../../utils/mesh-reader';
import { calmReader } from '../../utils/calm-reader';

interface FlowValidationResult {
  valid: boolean;
  reason?: string;
  flowName?: string;
  expectedOrder?: string;
}

/**
 * Validates that a proposed connection between two nodes is
 * declared in a CALM relationship and respects flow transition ordering.
 */
export async function validateFlowConstraint(
  barId: string,
  actionType: string,
  sourceNode: string,
  targetNode: string,
  flowId?: string
): Promise<FlowValidationResult> {
  const arch = await calmReader.loadArchitecture(barId);
  if (!arch) return { valid: true, reason: 'No CALM model — cannot validate' };

  // 1. Check if a relationship declares this connection
  const declaredConnection = arch.relationships.find(r => {
    const conn = r['relationship-type']?.connects;
    return conn &&
      conn.source.node === sourceNode &&
      conn.destination.node === targetNode;
  });

  if (!declaredConnection) {
    // Check reverse direction
    const reverseConnection = arch.relationships.find(r => {
      const conn = r['relationship-type']?.connects;
      return conn &&
        conn.source.node === targetNode &&
        conn.destination.node === sourceNode;
    });

    if (reverseConnection) {
      return {
        valid: false,
        reason: `Connection exists in reverse direction (${targetNode} → ${sourceNode}). ` +
                `The proposed direction ${sourceNode} → ${targetNode} violates the declared data flow.`
      };
    }

    return {
      valid: false,
      reason: `No CALM relationship declares a connection from ${sourceNode} to ${targetNode}. ` +
              `Add a 'connects' relationship to bar.arch.json before implementing this connection.`
    };
  }

  // 2. If a flow is specified, validate transition ordering
  if (flowId && arch.flows) {
    const flow = arch.flows.find(f => f['unique-id'] === flowId);
    if (flow) {
      const relId = declaredConnection['unique-id'];
      const transition = flow.transitions.find(
        t => t['relationship-unique-id'] === relId
      );

      if (!transition) {
        return {
          valid: false,
          reason: `Relationship ${relId} is not part of flow ${flow.name}`,
          flowName: flow.name
        };
      }

      // Validate direction against flow transition
      if (transition.direction === 'destination-to-source') {
        return {
          valid: false,
          reason: `Flow ${flow.name} expects data to flow from destination to source for this transition`,
          flowName: flow.name,
          expectedOrder: flow.transitions
            .sort((a, b) => a['sequence-number'] - b['sequence-number'])
            .map(t => t['relationship-unique-id'])
            .join(' → ')
        };
      }
    }
  }

  return { valid: true };
}
```

```typescript
// src/mcp/guardrails/actions/interface-validator.ts

/**
 * Validates that changes in a source BAR respect interface contracts
 * declared on nodes in a target BAR, where both BARs are linked via CALM flows.
 */
export async function validateInterfaceContract(
  sourceBarId: string,
  targetBarId: string,
  interfaceId: string,
  changeDescription: string
): Promise<InterfaceValidationResult> {
  const sourceArch = await calmReader.loadArchitecture(sourceBarId);
  const targetArch = await calmReader.loadArchitecture(targetBarId);

  if (!sourceArch || !targetArch) {
    return { valid: true, warnings: ['One or both BARs lack CALM models'] };
  }

  // 1. Resolve the interface contract on the target BAR
  const targetInterface = targetArch.nodes
    .flatMap(n => (n.interfaces || []).map(i => ({ node: n, iface: i })))
    .find(x => x.iface['unique-id'] === interfaceId);

  if (!targetInterface) {
    return { valid: false, violation: `Interface ${interfaceId} not found on target BAR` };
  }

  // 2. Find relationships in source BAR that reference this interface
  const sourceConnections = sourceArch.relationships.filter(r => {
    const conn = r['relationship-type']?.connects;
    return conn?.destination?.interfaces?.includes(interfaceId);
  });

  if (sourceConnections.length === 0) {
    return { valid: true, warnings: ['No source connections reference this interface'] };
  }

  // 3. Validate that the change doesn't break the interface contract
  const violations: InterfaceViolation[] = [];

  for (const conn of sourceConnections) {
    // Check host/port contract
    if (targetInterface.iface.host && targetInterface.iface.port) {
      // The interface declares a specific host:port contract
      // Changes to the source must still target this endpoint
      const contractSpec = `${targetInterface.iface.host}:${targetInterface.iface.port}`;

      // Semantic analysis: does the change description indicate
      // connecting to a different endpoint?
      if (changeDescription.toLowerCase().includes('different endpoint') ||
          changeDescription.toLowerCase().includes('new url') ||
          changeDescription.toLowerCase().includes('redirect')) {
        violations.push({
          interfaceId,
          targetNode: targetInterface.node['unique-id'],
          contractSpec,
          violation: `Proposed change may redirect traffic away from contracted endpoint ${contractSpec}`,
          severity: 'error'
        });
      }
    }

    // Check controls attached to the interface's node
    if (targetArch.controls) {
      for (const [ctrlId, ctrl] of Object.entries(targetArch.controls)) {
        // Controls with requirements that reference the target node
        if (ctrl.description.includes(targetInterface.node['unique-id']) ||
            ctrl.description.includes(targetInterface.node.name)) {
          violations.push({
            interfaceId,
            targetNode: targetInterface.node['unique-id'],
            contractSpec: `Control ${ctrlId}: ${ctrl.description}`,
            violation: `Changes must maintain compliance with control ${ctrlId}`,
            severity: 'warning'
          });
        }
      }
    }
  }

  return {
    valid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    recommendations: violations.map(v =>
      `Ensure ${v.contractSpec} is maintained when modifying ${v.interfaceId}`
    )
  };
}
```

### 4.5.1 Machine-Checkable Contract Artifacts

The interface validation above relies on CALM metadata (host, port) and description-level string matching. For **deterministic** interface contract enforcement, the Red Queen supports machine-checkable contract artifacts — formal schema definitions that can be diffed programmatically.

#### Contract Artifact Model

CALM interfaces are extended with an optional `contractArtifact` field that references a formal schema:

```typescript
interface CalmInterfaceExtended extends CalmInterface {
  'unique-id': string;
  host?: string;
  port?: number;
  protocol?: string;

  // Machine-checkable contract artifacts
  contractArtifact?: {
    type: 'openapi' | 'asyncapi' | 'protobuf' | 'graphql' | 'json-schema';
    path: string;            // Relative path within the BAR's repo (e.g., "specs/order-api-v2.yaml")
    version?: string;        // Schema version for compatibility checking
    breaking_change_policy?: 'deny' | 'warn' | 'allow';  // How to handle detected breaking changes
  };
}
```

#### Schema-Based Validation

When a contract artifact exists, the Red Queen performs **schema-level diff validation** instead of description-level string matching:

```typescript
async function validateContractArtifact(
  sourceBarId: string,
  targetBarId: string,
  iface: CalmInterfaceExtended,
  prDiff: PullRequestDiff
): Promise<ContractValidationResult> {
  if (!iface.contractArtifact) {
    // Fall back to description-level validation (Section 4.5)
    return { method: 'description', valid: true };
  }

  const artifact = iface.contractArtifact;

  switch (artifact.type) {
    case 'openapi': {
      // Use oasdiff or similar to compute breaking changes
      const baseSpec = await loadArtifactFromRef(targetBarId, artifact.path, 'main');
      const headSpec = await loadArtifactFromRef(targetBarId, artifact.path, 'HEAD');
      if (!headSpec) return { method: 'openapi', valid: true }; // Spec unchanged
      const breaking = computeOpenApiBreakingChanges(baseSpec, headSpec);
      return {
        method: 'openapi',
        valid: breaking.length === 0 || artifact.breaking_change_policy === 'allow',
        breakingChanges: breaking,
        // e.g., "Removed field 'email' from POST /users response (200)"
        // e.g., "Changed type of 'amount' from number to string in PUT /orders request"
      };
    }

    case 'protobuf': {
      // Use buf breaking to detect wire-incompatible changes
      const breaking = await computeProtobufBreakingChanges(targetBarId, artifact.path);
      return { method: 'protobuf', valid: breaking.length === 0, breakingChanges: breaking };
    }

    case 'asyncapi': {
      // Validate event schema compatibility
      const breaking = await computeAsyncApiBreakingChanges(targetBarId, artifact.path);
      return { method: 'asyncapi', valid: breaking.length === 0, breakingChanges: breaking };
    }

    case 'graphql': {
      // Use graphql-inspector for schema diff
      const breaking = await computeGraphqlBreakingChanges(targetBarId, artifact.path);
      return { method: 'graphql', valid: breaking.length === 0, breakingChanges: breaking };
    }

    case 'json-schema': {
      // Validate JSON Schema backward compatibility
      const breaking = await computeJsonSchemaBreakingChanges(targetBarId, artifact.path);
      return { method: 'json-schema', valid: breaking.length === 0, breakingChanges: breaking };
    }
  }
}
```

#### CALM Interface Declaration Example

```json
{
  "unique-id": "order-api-v2",
  "host": "api.example.com",
  "port": 443,
  "protocol": "HTTPS",
  "contractArtifact": {
    "type": "openapi",
    "path": "specs/order-api-v2.yaml",
    "version": "2.3.1",
    "breaking_change_policy": "deny"
  }
}
```

#### Validation Priority

When both CALM metadata and a contract artifact exist, the Red Queen validates both:

1. **CALM metadata** (host, port, protocol) — structural contract
2. **Contract artifact** (OpenAPI, protobuf, etc.) — semantic contract
3. **CALM controls** attached to the interface's node — compliance contract

A violation at any level blocks the action (if policy is `deny`). This layered approach means governance works even for BARs that haven't adopted formal schema artifacts yet — they get description-level validation as a floor, with schema-level validation as a ceiling.

#### Concrete Diff Engines and Breaking Change Rulesets

Each contract artifact type maps to a specific, proven diff engine with well-defined breaking change semantics:

| Artifact Type | Diff Engine | Breaking Change Rules | False Positive Strategy |
|--------------|-------------|----------------------|------------------------|
| **OpenAPI** | [oasdiff](https://github.com/Tufin/oasdiff) v2+ | [OpenAPI breaking changes spec](https://github.com/Tufin/oasdiff/blob/main/docs/BREAKING-CHANGES.md): removed endpoints, narrowed request types, widened required fields, removed response fields, changed status codes | `exclude` file per BAR for intentional breaks (e.g., deprecation-then-removal) |
| **Protobuf** | [buf breaking](https://buf.build/docs/breaking/overview/) | Wire compatibility by default: field number reuse, type changes, required field addition, enum value removal. Configurable via `buf.yaml` (`WIRE`, `WIRE_JSON`, `FILE`) | `buf.yaml` `except` list for planned migrations |
| **AsyncAPI** | [asyncapi-diff](https://github.com/asyncapi/diff) | Channel removal, message schema narrowing, required header addition, server removal | `ignore` annotations on channels marked for deprecation |
| **GraphQL** | [graphql-inspector](https://graphql-inspector.com/) | Removed types/fields, changed nullability (non-null → nullable is safe, reverse breaks), argument addition to existing fields | Suppression comments in `.graphql-inspector.yaml` |
| **JSON Schema** | [json-schema-diff](https://github.com/pwall567/json-schema-diff) + custom | Tighten (add `required`, narrow `enum`, reduce `maxLength`) is non-breaking for producers, breaking for consumers. Loosen (remove `required`, widen `enum`) is the reverse. Direction depends on `contractArtifact.role` (`provider` vs `consumer`). | Role-aware validation: provider changes validated against consumer expectations |

```typescript
interface ContractDiffConfig {
  engine: string;                      // e.g., "oasdiff", "buf", "graphql-inspector"
  engineVersion: string;               // Pinned version for reproducible results
  ruleSet: string;                     // e.g., "WIRE" for buf, "default" for oasdiff
  suppressionFile?: string;            // Path to false-positive suppression config
  role?: 'provider' | 'consumer';      // For JSON Schema directional validation
}
```

**Handling edge cases in CI:**

- **Generated specs** (e.g., OpenAPI from code annotations): The CI gate diffs the *committed* spec, not the generated output. If the BAR uses spec generation, the pipeline must include a "generate → commit → validate" step. The `contractArtifact.path` must point to the committed artifact.
- **Partial schema moves** (splitting one spec into multiple files): `oasdiff` and `buf` both support multi-file specs via `$ref` resolution. The Red Queen resolves refs before diffing.
- **Monorepo multi-spec**: When a monorepo contains specs for multiple interfaces, each CALM interface's `contractArtifact.path` points to its specific spec file. The CI gate validates only specs changed in the PR diff, not all specs in the repo.
- **Spec version mismatch**: If the committed spec version doesn't match `contractArtifact.version`, the CI gate emits a warning (not an error) and validates against the committed content regardless.

### 4.6 AST-Based Semantic Diff Analysis

The `blast_radius` tool (T3) computes impact at the CALM graph level — tracing node relationships and flow transitions. But CALM-level analysis cannot distinguish between a comment edit (zero risk) and an authentication logic change (critical risk) in the same file.

The Red Queen supplements CALM graph traversal with **AST-based semantic diff analysis** to classify code changes by risk tier.

#### 4.6.1 Risk Classification

```typescript
type ChangeRiskTier = 'cosmetic' | 'low' | 'medium' | 'high' | 'critical';

interface SemanticDiffResult {
  file: string;
  overallRisk: ChangeRiskTier;
  changes: ClassifiedChange[];
}

interface ClassifiedChange {
  type: 'added' | 'modified' | 'deleted';
  nodeType: string;              // AST node type (function, class, import, etc.)
  name: string;                  // Identifier name
  risk: ChangeRiskTier;
  reason: string;                // Why this risk level
  calmNodeId?: string;           // Mapped CALM node, if identifiable
}
```

#### 4.6.2 Risk Tier Definitions

| Tier | AST Change Type | Examples |
|------|----------------|---------|
| **Cosmetic** | Comments, whitespace, formatting, type annotations | JSDoc update, prettier reformatting |
| **Low** | Internal variable renames, private method refactoring | Rename local variable, extract helper function |
| **Medium** | Business logic changes, new functions, modified control flow | New API handler, changed validation rules |
| **High** | Interface changes, exported function signatures, dependency modifications | Changed function parameters, new `import`, modified `package.json` |
| **Critical** | Authentication/authorization, cryptography, data access patterns, security middleware | Modified auth middleware, changed bcrypt rounds, raw SQL queries, CORS config |

#### 4.6.3 Critical Pattern Detection

The AST analyzer detects patterns known to be security-sensitive:

```typescript
const CRITICAL_PATTERNS = [
  { pattern: /auth|authenticate|authorize|permission|rbac|abac/i, category: 'authentication' },
  { pattern: /bcrypt|argon|scrypt|crypto|encrypt|decrypt|hash|hmac/i, category: 'cryptography' },
  { pattern: /query|sql|exec|raw|knex\.|prisma\.\$|sequelize\.query/i, category: 'data-access' },
  { pattern: /cors|csp|helmet|x-frame|hsts|origin/i, category: 'security-headers' },
  { pattern: /cookie|session|token|jwt|oauth|bearer/i, category: 'session-management' },
  { pattern: /eval|Function\(|child_process|exec\(|spawn\(/i, category: 'code-execution' },
  { pattern: /\.env|secret|key|password|credential|api_key/i, category: 'secrets' },
];
```

#### 4.6.4 Integration with Blast Radius and Merge Gating

AST risk classification feeds into two downstream systems:

1. **`blast_radius` (T3)**: Risk tier is included in impact computation. A PR touching 10 files all classified as `cosmetic` has minimal blast radius despite a large diff. A PR touching 1 file classified as `critical` (auth logic) triggers maximum blast radius with cross-BAR notifications.

2. **`redqueen-action` (Section 14.3)**: The CI gate uses AST risk classification to determine validation depth:
   - `cosmetic`/`low` changes: Lightweight CALM relationship check only
   - `medium`/`high` changes: Full CALM flow + control validation
   - `critical` changes: Full validation + mandatory human review + cross-BAR notification

#### 4.6.5 Language Coverage and Extensibility

**Initial language set:** TypeScript/JavaScript and Python. These two language families cover the majority of enterprise codebases that GitHub Actions agents work on. TypeScript/JavaScript dominates frontend, API, and serverless applications. Python dominates data engineering, ML/AI, and scripting.

**Toolchain: tree-sitter**

Tree-sitter provides the parsing foundation with incremental parsing (fast re-parses on edits), a unified API across languages, and well-maintained grammars via npm packages:

- `tree-sitter-typescript` — Covers TypeScript and TSX
- `tree-sitter-javascript` — Pure JavaScript
- `tree-sitter-python` — Python 3

For semantic diff specifically, parse both versions of a file into ASTs, compute the tree diff, and classify changes by node type rather than line number.

**Risk classification by AST node type:**

| Risk Tier | TypeScript/JavaScript | Python | Examples |
|-----------|----------------------|--------|----------|
| **Critical** | Auth/crypto imports, JWT handling, `eval()`, `Function()` | `subprocess`, `os.system`, `exec`, `pickle`, auth decorators | Auth logic, command injection vectors |
| **High** | API route definitions, middleware, DB queries, env access | Flask/Django route decorators, ORM queries, `os.environ` | API surface, data access patterns |
| **Structural** | Class/function signatures, export changes, type definitions | Class/function definitions, import changes, type hints | Interface contracts, module structure |
| **Cosmetic** | Comments, formatting, variable renames (same scope) | Docstrings, formatting, variable renames (same scope) | No functional impact |

**Fallback for unsupported languages:**

For files in languages without tree-sitter grammar integration:
- **Default to "structural" risk tier:** Any file change in an unsupported language is classified as structural (not cosmetic), which triggers standard review but not the critical/high path.
- **Line-based heuristics:** Fall back to regex pattern matching against `CRITICAL_PATTERNS` (Section 4.6.3) for known security-sensitive patterns. Imprecise but catches obvious changes.
- **Opt-in grammar registration:** The Red Queen exposes a configuration point in `.redqueen/config-manifest.yaml` where teams can register additional tree-sitter grammars for their stack (Go, Rust, Java, C#, etc.) without modifying core code.

```yaml
# .redqueen/config-manifest.yaml (excerpt)
ast:
  grammars:
    - language: go
      package: tree-sitter-go
      critical_patterns:
        - pattern: "http\\.Handle|http\\.ListenAndServe"
          category: api-surface
        - pattern: "exec\\.Command|os\\.Exec"
          category: code-execution
```

**Execution context:** AST analysis runs in the CI gate (Layer 3) where full source is available. In the agent's local environment (Layers 1-2), file-path heuristics provide approximate risk classification without AST parsing. For TypeScript-heavy repos, the TypeScript Compiler API (`ts.createSourceFile`) provides richer type-aware analysis as a supplement to tree-sitter.

---

## 5. Cross-Repo Semantic Governance

### 5.1 The Problem

Modern applications are decomposed across multiple repositories — frontend, API, database, infrastructure. When these repositories are linked in CALM flows, a change in one repo can break assumptions in another:

| Change in Repo A | Breaks in Repo B |
|-------------------|------------------|
| Frontend calls new API endpoint | API doesn't expose that endpoint |
| API changes response schema | Frontend parses the old schema |
| API adds required auth header | Frontend doesn't send credentials |
| Database removes a column | API queries that column |
| Infrastructure changes port | API configured for old port |

CALM architecture models capture these relationships explicitly through **flows** (ordered transitions), **relationships** (connects, composed-of), and **interfaces** (host, port, protocol). The Red Queen uses this structure to enforce cross-repo governance.

### 5.2 CALM Flow Resolution Across BARs

When multiple BARs reference the same CALM nodes (or when a flow's transitions cross BAR boundaries), the Red Queen resolves the full dependency graph:

```typescript
// src/mcp/utils/cross-repo.ts

interface CrossRepoFlowGraph {
  flowId: string;
  flowName: string;
  transitions: ResolvedTransition[];
  bars: Map<string, BarResource>;          // All BARs involved
  interfaceContracts: InterfaceContract[]; // All interface boundaries
}

interface ResolvedTransition {
  sequenceNumber: number;
  sourceNode: string;
  sourceBar: string;              // Which BAR owns the source node
  destinationNode: string;
  destinationBar: string;         // Which BAR owns the destination node
  interfaces: CalmInterface[];    // Interface contracts at this boundary
  isCrossBar: boolean;            // True when source and destination are in different BARs
}

interface InterfaceContract {
  interfaceId: string;
  ownerBar: string;               // BAR that defines the interface
  consumerBars: string[];         // BARs that consume this interface
  spec: CalmInterface;            // The interface specification
  controls: CalmControl[];        // Controls attached to the interface's node
}

/**
 * Resolve a CALM flow across multiple BARs.
 *
 * Given a flow defined in one BAR, find all BARs that own nodes
 * referenced in the flow's transitions. This enables cross-repo
 * governance: if frontend-bar's flow transitions to api-bar's node,
 * changes to the frontend must respect the API's interface contract.
 */
async function resolveFlowAcrossBars(
  flowId: string,
  meshPath: string
): Promise<CrossRepoFlowGraph> {
  // 1. Find the BAR containing this flow
  const allBars = await meshReader.loadAllBars(meshPath);
  let flow: CalmFlow | undefined;
  let ownerBar: string | undefined;

  for (const [barId, arch] of allBars) {
    const found = arch.flows?.find(f => f['unique-id'] === flowId);
    if (found) {
      flow = found;
      ownerBar = barId;
      break;
    }
  }
  if (!flow || !ownerBar) throw new Error(`Flow ${flowId} not found`);

  // 2. For each transition, resolve which BAR owns each node
  const transitions: ResolvedTransition[] = [];
  const involvedBars = new Map<string, BarResource>();

  for (const t of flow.transitions) {
    // Find the relationship referenced by this transition
    const rel = findRelationship(allBars, t['relationship-unique-id']);
    if (!rel) continue;

    const conn = rel.relationship['relationship-type']?.connects;
    if (!conn) continue;

    const sourceBar = findNodeOwner(allBars, conn.source.node);
    const destBar = findNodeOwner(allBars, conn.destination.node);

    // Resolve interface contracts at the destination
    const destArch = allBars.get(destBar);
    const destNode = destArch?.nodes.find(n => n['unique-id'] === conn.destination.node);
    const interfaces = (conn.destination.interfaces || []).map(ifaceId =>
      destNode?.interfaces?.find(i => i['unique-id'] === ifaceId)
    ).filter(Boolean);

    transitions.push({
      sequenceNumber: t['sequence-number'],
      sourceNode: conn.source.node,
      sourceBar,
      destinationNode: conn.destination.node,
      destinationBar: destBar,
      interfaces,
      isCrossBar: sourceBar !== destBar
    });

    involvedBars.set(sourceBar, allBars.get(sourceBar)!);
    involvedBars.set(destBar, allBars.get(destBar)!);
  }

  // 3. Extract interface contracts at cross-BAR boundaries
  const contracts: InterfaceContract[] = [];
  for (const t of transitions.filter(t => t.isCrossBar)) {
    for (const iface of t.interfaces) {
      const ownerArch = allBars.get(t.destinationBar);
      const nodeControls = ownerArch?.controls
        ? Object.entries(ownerArch.controls)
            .filter(([_, ctrl]) =>
              ctrl.description.includes(t.destinationNode))
            .map(([_, ctrl]) => ctrl)
        : [];

      contracts.push({
        interfaceId: iface['unique-id'],
        ownerBar: t.destinationBar,
        consumerBars: [t.sourceBar],
        spec: iface,
        controls: nodeControls
      });
    }
  }

  return { flowId, flowName: flow.name, transitions, bars: involvedBars, interfaceContracts: contracts };
}
```

### 5.3 Cross-Repo Governance Scenarios

#### Scenario 1: Frontend Changes Must Respect API Interface

```
CALM Flow: "user-registration-flow"
Transitions:
  1. web-frontend (BAR: frontend-app) → api-gateway (BAR: api-service)
  2. api-gateway (BAR: api-service) → user-database (BAR: api-service)

Interface Contract on api-gateway:
  - unique-id: "api-registration-endpoint"
  - host: "api.example.com"
  - port: 443
  - protocol: HTTPS

Control on api-gateway:
  - ctrl-auth-002: "All API calls require OAuth2 bearer token (NIST IA-2)"
```

**Agent action in frontend-app:**
> "Add a new user registration flow that calls /api/v2/register"

**Red Queen validation:**
1. `validate_action` → loads frontend-app's CALM model
2. Detects `api-gateway` is in a different BAR (`api-service`)
3. Calls `validate_interface_contract(frontend-app, api-service, api-registration-endpoint, ...)`
4. NeMo interface contract rail validates:
   - Is `/api/v2/register` a declared endpoint on the interface? **Check**
   - Does the frontend include OAuth2 bearer token? **Check against ctrl-auth-002**
   - Is the connection source-to-destination per the flow? **Check**
5. Returns: `conditional` — "Include OAuth2 bearer token per control ctrl-auth-002"

#### Scenario 2: API Interface Change Triggers Downstream Notification

```
Agent action in api-service:
> "Change user-service response format from XML to JSON"
```

**Red Queen validation:**
1. `validate_action` → loads api-service's CALM model
2. Detects `user-service` node has interface `user-service-api`
3. `flow_impact` computes: `frontend-app` consumes this interface via `user-registration-flow`
4. Returns: `conditional` — "This change affects 1 downstream BAR (frontend-app). The following consumers must be updated: frontend-app uses interface user-service-api in flow user-registration-flow."
5. Optionally creates a GitHub issue in `frontend-app`'s repo: "Interface contract change notification: user-service response format changing from XML to JSON"

#### Scenario 3: Database Schema Change Ripples Through Flow

```
Agent action in api-service:
> "Drop the 'email_verified' column from user_profiles table"
```

**Red Queen validation:**
1. `validate_action` → detects `user-database` node modification
2. Traces flow backwards: `user-database` ← `user-service` ← `api-gateway` ← `web-frontend`
3. `blast_radius` computes: 4 nodes affected, 2 BARs involved, 1 CALM flow disrupted
4. Control check: ctrl-data-001 "All schema changes require migration plan (NIST CM-3)"
5. Returns: `denied` — "Schema changes require migration plan per control ctrl-data-001. Blast radius: 4 nodes, 2 BARs, 1 flow. Create an ADR documenting the migration before proceeding."

### 5.4 Linked BAR Discovery

BARs are linked when they share nodes in CALM flows or when `app.yaml` declares repository relationships:

```yaml
# app.yaml for frontend-app
application:
  id: frontend-app
  name: Frontend Application
  repos:
    - https://github.com/org/frontend
  linkedBars:                          # Explicit cross-BAR links
    - barId: api-service
      relationship: consumes           # This BAR consumes api-service
      flows:
        - user-registration-flow
        - order-processing-flow
```

The Red Queen also discovers implicit links by analyzing CALM flows — if a flow's transitions reference nodes owned by different BARs, those BARs are implicitly linked.

### 5.5 Intra-Platform Cross-BAR Governance

Section 5.2–5.4 covers cross-BAR governance driven by CALM flows — the strongest signal. But CALM flows require both BARs to have declared architecture with shared nodes and transitions. Within a platform, BARs share an organizational boundary that creates governance relationships even without explicit CALM linkage.

#### 5.5.1 Relationship Discovery Hierarchy

The Red Queen discovers cross-BAR relationships through four mechanisms, ordered by signal strength:

| # | Mechanism | Signal Strength | Requires CALM | Example |
|---|-----------|----------------|---------------|---------|
| 1 | **CALM flow analysis** | Strong | Yes | `checkout-ui` → `order-api` via `order-processing-flow` |
| 2 | **Explicit `linkedBars`** | Strong | No | `app.yaml` declares `APP-CLAIMS-001 consumes APP-FRAUD-001` |
| 3 | **Capability overlap** | Moderate | No | Two BARs mapped to same L2/L3 capability (e.g., "Claims Adjudication") |
| 4 | **Shared infrastructure** | Moderate | No | Two BARs listing repos in the same org, sharing database or event bus |

```typescript
interface PlatformRelationshipGraph {
  platformId: string;
  bars: Map<string, BarResource>;
  relationships: BarRelationship[];
  sharedInfrastructure: SharedInfrastructure[];
  capabilityOverlaps: CapabilityOverlap[];
}

interface BarRelationship {
  barA: string;
  barB: string;
  type: 'calm-flow' | 'declared' | 'capability-overlap' | 'shared-infrastructure';
  strength: 'strong' | 'moderate' | 'weak';
  details: string;                   // Human-readable description
  flows?: string[];                  // For calm-flow type
  capabilities?: string[];           // For capability-overlap type
  infrastructure?: string;           // For shared-infrastructure type
}

async function discoverPlatformRelationships(
  platformId: string,
  meshPath: string
): Promise<PlatformRelationshipGraph> {
  const bars = await meshReader.loadPlatformBars(platformId, meshPath);
  const relationships: BarRelationship[] = [];

  for (const [barIdA, barA] of bars) {
    for (const [barIdB, barB] of bars) {
      if (barIdA >= barIdB) continue; // avoid duplicates

      // 1. CALM flow linkage (strongest signal)
      const sharedFlows = await resolveSharedFlows(barIdA, barIdB);
      if (sharedFlows.length > 0) {
        relationships.push({
          barA: barIdA, barB: barIdB,
          type: 'calm-flow',
          strength: 'strong',
          flows: sharedFlows.map(f => f.flowId),
          details: `Linked via ${sharedFlows.length} CALM flow(s)`
        });
      }

      // 2. Explicit linkedBars declaration
      const explicitLink = barA.manifest.linkedBars?.find(
        l => l.barId === barIdB
      );
      if (explicitLink) {
        relationships.push({
          barA: barIdA, barB: barIdB,
          type: 'declared',
          strength: 'strong',
          details: `${barIdA} ${explicitLink.relationship} ${barIdB}`
        });
      }

      // 3. Capability overlap (same L2/L3 capability mapping)
      const sharedCapabilities = findSharedCapabilities(barA, barB);
      if (sharedCapabilities.length > 0) {
        relationships.push({
          barA: barIdA, barB: barIdB,
          type: 'capability-overlap',
          strength: 'moderate',
          capabilities: sharedCapabilities,
          details: `Both mapped to capability: ${sharedCapabilities.join(', ')}`
        });
      }

      // 4. Shared infrastructure (declared in platform.yaml)
      const sharedInfra = findSharedInfrastructure(platformId, barA, barB);
      if (sharedInfra.length > 0) {
        for (const infra of sharedInfra) {
          relationships.push({
            barA: barIdA, barB: barIdB,
            type: 'shared-infrastructure',
            strength: 'moderate',
            infrastructure: infra.name,
            details: `Both use ${infra.type}: ${infra.name}`
          });
        }
      }
    }
  }

  return { platformId, bars, relationships, ... };
}
```

#### 5.5.2 Platform Governance Policies

The platform level defines policies that apply to **all child BARs**, creating cross-BAR governance without requiring CALM flow linkage:

```yaml
# platforms/PLT-CLAIMS/platform.yaml
platform:
  id: PLT-CLAIMS
  name: Claims Processing Platform
  owner: claims-architecture@acme.com

  governance:
    # Minimum pillar scores for any BAR in this platform
    minimumScores:
      architecture: 60
      security: 70             # Higher security baseline for claims
      informationRisk: 65
      operations: 50

    # Shared infrastructure — changes require cross-BAR coordination
    sharedInfrastructure:
      - type: database
        name: claims-postgres
        bars: [APP-CLAIMS-001, APP-CLAIMS-002, APP-CLAIMS-003]
        constraint: "Schema changes require cross-BAR ADR and migration plan"
      - type: messageQueue
        name: claims-event-bus
        bars: [APP-CLAIMS-001, APP-FRAUD-001]
        constraint: "Event schema changes require consumer-side validation"

    # Cross-BAR review triggers
    crossBarReview:
      triggers:
        - "Any BAR modifying a shared infrastructure interface"
        - "Any BAR with security score drop > 10 points"
        - "New BAR added to platform"
      reviewers:
        - "platform-architecture-board"

    # Platform-level orchestration overrides
    orchestrationOverrides:
      enforcementMode: "strict"        # All BARs in this platform use strict NeMo enforcement
      minTier: "supervised"            # No BAR in this platform can be autonomous (claims data sensitivity)
```

The Red Queen evaluates platform policies **after** BAR-level policies. Platform governance acts as a floor — a BAR cannot have weaker governance than its platform requires:

```typescript
function applyPlatformOverrides(
  decision: OrchestrationDecision,
  platformPolicy: PlatformGovernancePolicy
): OrchestrationDecision {
  // Platform minimum scores — flag BARs below threshold
  for (const [pillar, minScore] of Object.entries(platformPolicy.minimumScores)) {
    const barScore = decision.bar.scores[pillar];
    if (barScore < minScore) {
      decision.constraints.push(
        `Platform ${platformPolicy.id} requires ${pillar} score ≥ ${minScore}% (current: ${barScore}%)`
      );
      decision.reasoning.push(
        `Platform minimum: ${pillar} ${barScore}% < required ${minScore}%`
      );
    }
  }

  // Platform minimum tier — cannot be more permissive than platform allows
  if (platformPolicy.orchestrationOverrides?.minTier) {
    const tierRank = { restricted: 0, supervised: 1, autonomous: 2 };
    const minTier = platformPolicy.orchestrationOverrides.minTier;
    if (tierRank[decision.tier] > tierRank[minTier]) {
      decision.tier = minTier;
      decision.reasoning.push(
        `Tier capped to "${minTier}" by platform policy (platform does not allow autonomous)`
      );
    }
  }

  // Shared infrastructure constraints
  const barInfra = platformPolicy.sharedInfrastructure?.filter(
    infra => infra.bars.includes(decision.bar.id)
  );
  if (barInfra?.length) {
    for (const infra of barInfra) {
      decision.constraints.push(infra.constraint);
      decision.reasoning.push(
        `Shared infrastructure: ${infra.type} "${infra.name}" — ${infra.bars.length} BARs affected`
      );
    }
  }

  return decision;
}
```

#### 5.5.3 Platform-Level Impact Analysis

When the Red Queen evaluates a change in one BAR, it computes platform-level blast radius:

```typescript
interface PlatformImpactAssessment {
  changedBar: string;
  platformId: string;
  directImpact: BarImpact[];        // BARs linked via CALM flows or declared linkedBars
  indirectImpact: BarImpact[];      // BARs sharing capabilities or infrastructure
  platformHealthDelta: number;      // Projected platform composite health change
  crossBarReviewRequired: boolean;  // Triggers from platform.yaml
  affectedCapabilities: string[];   // L2/L3 capabilities touched
  affectedInfrastructure: string[]; // Shared infrastructure affected
}

// Example: BAR APP-CLAIMS-001 modifies claims-postgres schema
// Direct impact:  APP-CLAIMS-002, APP-CLAIMS-003 (share claims-postgres)
// Indirect impact: APP-FRAUD-001 (shares claims-event-bus, may consume affected events)
// Platform health: 78% → 74% (projected if schema migration breaks consumers)
// Cross-BAR review: REQUIRED (shared infrastructure trigger)
// Affected capabilities: "Claims Processing", "Fraud Detection"
```

#### 5.5.4 Cross-BAR Governance Scenarios (Intra-Platform)

**Scenario: Shared Database Schema Change**

```
Platform: PLT-CLAIMS
BARs sharing claims-postgres: APP-CLAIMS-001, APP-CLAIMS-002, APP-CLAIMS-003

Agent action in APP-CLAIMS-001:
> "Add new column 'fraud_score' to claims table"

Red Queen enforcement:
1. validate_action detects claims-postgres is shared infrastructure (from platform.yaml)
2. Platform policy: "Schema changes require cross-BAR ADR and migration plan"
3. Blast radius: 3 BARs affected, 2 capabilities touched
4. Verdict: CONDITIONAL
   - "Create ADR documenting schema change"
   - "Migration plan must be reviewed by APP-CLAIMS-002 and APP-CLAIMS-003 teams"
   - "Coordinate via platform architecture board"
5. GitHub issue created in APP-CLAIMS-002 and APP-CLAIMS-003 repos:
   "Schema change notification: 'fraud_score' column being added to claims table"
```

**Scenario: Platform Minimum Score Enforcement**

```
Platform: PLT-CLAIMS (minimumScores.security: 70%)
BAR: APP-CLAIMS-003 (security score: 55%, would normally be tier: supervised)

Red Queen enforcement:
1. BAR score 55% qualifies for supervised tier
2. Platform policy: security minimum is 70%
3. Decision override: additional security constraints injected
   - "OWASP A01-A10 prompt packs mandated by platform policy"
   - "Security review required for all changes until score ≥ 70%"
4. Platform health dashboard flags APP-CLAIMS-003 as below platform minimum
```

---

## 6. Orchestration Policies

### 6.1 Policy Definition Format

Policies are defined at three levels, with each level able to tighten (but never loosen) the governance posture:

1. **`mesh.yaml`** — Portfolio-level defaults (apply to all BARs)
2. **`platform.yaml`** — Platform-level overrides (apply to all BARs in that platform, see Section 5.5.2)
3. **`app.yaml`** — BAR-level overrides (apply to a single BAR)

The policy evaluation order is: portfolio defaults → platform overrides → BAR overrides → criticality multipliers. Each level can only make governance **stricter** — a platform cannot grant a BAR autonomous tier if the portfolio policy caps it at supervised, and a BAR cannot override its platform's minimum security score.

**mesh.yaml (portfolio-level defaults):**

```yaml
orchestration:
  version: 1

  # Permission tiers based on composite governance score
  permission_tiers:
    autonomous:       # Score 80-100: agents operate with minimal oversight
      min_score: 80
      permissions:
        mode: "auto-edit"
        allow:
          - "Edit(src/**)"
          - "Write(src/**)"
          - "Bash(npm run test*)"
          - "Bash(npm run lint*)"
          - "Bash(npm run build*)"
        deny:
          - "Bash(git push --force*)"
          - "Edit(*.env*)"
          - "Write(*.env*)"
      review:
        agents: 1
        human_approval: false

    supervised:       # Score 50-79: agents need human checkpoints
      min_score: 50
      permissions:
        mode: "ask-edit"
        allow:
          - "Read"
          - "Glob"
          - "Grep"
          - "Edit(src/**)"
          - "Bash(npm run test*)"
        deny:
          - "Bash(git push*)"
          - "Bash(npm install*)"
          - "Write(*.config.*)"
      review:
        agents: 1
        human_approval: true

    restricted:       # Score 0-49: tight constraints, maximum oversight
      min_score: 0
      permissions:
        mode: "plan"
        allow:
          - "Read"
          - "Glob"
          - "Grep"
        deny:
          - "Edit(*)"
          - "Write(*)"
          - "Bash(*)"
        after_plan_approval:
          mode: "ask-edit"
          allow:
            - "Edit(src/**)"
            - "Bash(npm run test*)"
      review:
        agents: 2
        human_approval: true
        escalation: true

  # Pillar-specific prompt injection rules
  prompt_injection:
    security:
      threshold: 60
      packs:
        - "owasp/{mapped_category}"
        - "default"
        - "threat-modeling/stride"
      constraints:
        - "All database queries MUST use parameterized statements"
        - "All user input MUST be validated with Zod schemas"
        - "Never store secrets in source code"

    architecture:
      threshold: 70
      packs:
        - "default"
      constraints:
        - "Do not add direct database connections — route through the API layer"
        - "New services must be documented in bar.arch.json before implementation"
        - "Follow the architectural patterns established in the ADRs"

    informationRisk:
      threshold: 65
      packs:
        - "default"
      constraints:
        - "All PII must be encrypted at rest and in transit"
        - "Data classification labels must be applied to all new data stores"
        - "Audit logging is required for all data access operations"

    operations:
      threshold: 55
      packs:
        - "default"
      constraints:
        - "All new endpoints must include health check probes"
        - "Structured JSON logging is required for all services"
        - "Circuit breakers required for all external service calls"

  # Criticality overrides
  criticality_multipliers:
    critical:
      score_threshold_boost: 15
      require_multi_agent: true
      require_human_approval: true
    high:
      score_threshold_boost: 10
      require_human_approval: true
    medium:
      score_threshold_boost: 0
    low:
      score_threshold_boost: -10

  # NeMo Guardrails configuration
  guardrails:
    enabled: true
    enforcement_mode: "strict"         # strict | advisory | disabled
    rails:
      flow_constraints: true           # Enforce CALM flow transitions
      control_adherence: true          # Enforce CALM controls
      interface_contracts: true        # Enforce cross-repo interface semantics
      threat_model: true               # Enforce STRIDE threat model
      permission_tiers: true           # Enforce score-based permissions
    cross_repo:
      enabled: true
      notification_mode: "issue"       # issue | comment | none
      auto_validate_on_pr: true        # Validate interface contracts on PR open

  # Agent selection preferences
  agent_preferences:
    implementation:
      primary: "claude-code"
      fallback: "copilot-swe-agent"
    review:
      primary: "claude-code"
      secondary: "copilot-swe-agent"
    scanning:
      - "codeql"
      - "snyk"

  # Escalation rules
  escalation:
    score_drop_threshold: 10
    consecutive_failures: 3
    escalation_target: "architecture-review-board"
```

### 6.2 Policy Evaluation Algorithm

```typescript
interface OrchestrationDecision {
  bar: BarSummary;
  tier: 'autonomous' | 'supervised' | 'restricted';
  effectiveScore: number;
  permissions: PermissionConfig;
  promptPacks: string[];
  constraints: string[];
  reviewConfig: ReviewConfig;
  agentSelection: AgentSelection;
  guardrailsConfig: GuardrailsConfig;    // NeMo config for this BAR
  crossRepoLinks: CrossRepoLink[];       // Linked BARs and their interface contracts
  reasoning: string[];                    // Audit trail
}

function evaluatePolicy(
  bar: BarSummary,
  scores: GovernanceScores,
  policy: OrchestrationPolicy
): OrchestrationDecision {
  const reasoning: string[] = [];

  // 1. Compute effective score with criticality adjustment
  const critMultiplier = policy.criticality_multipliers[bar.criticality];
  const effectiveThresholdBoost = critMultiplier.score_threshold_boost;
  reasoning.push(
    `Composite score: ${scores.composite}%, Criticality: ${bar.criticality} (boost: +${effectiveThresholdBoost})`
  );

  // 2. Determine permission tier
  let tier: PermissionTier;
  if (bar.orchestration?.override_tier) {
    tier = bar.orchestration.override_tier;
    reasoning.push(`Tier forced to "${tier}" by BAR-level override`);
  } else {
    const autoThreshold = policy.permission_tiers.autonomous.min_score + effectiveThresholdBoost;
    const supThreshold = policy.permission_tiers.supervised.min_score + effectiveThresholdBoost;

    if (scores.composite >= autoThreshold) tier = 'autonomous';
    else if (scores.composite >= supThreshold) tier = 'supervised';
    else tier = 'restricted';

    reasoning.push(`Tier: "${tier}" (score ${scores.composite}% vs auto=${autoThreshold}, sup=${supThreshold})`);
  }

  // 3. Determine prompt injection based on weak pillars
  const promptPacks: string[] = [];
  const constraints: string[] = [];

  for (const [pillar, config] of Object.entries(policy.prompt_injection)) {
    const pillarScore = scores.pillars[pillar]?.score ?? 100;
    if (pillarScore < config.threshold) {
      promptPacks.push(...config.packs);
      constraints.push(...config.constraints);
      reasoning.push(
        `${pillar} score ${pillarScore}% < threshold ${config.threshold}% → injecting ${config.packs.length} packs`
      );
    }
  }

  // 4. Apply criticality overrides
  const reviewConfig = { ...policy.permission_tiers[tier].review };
  if (critMultiplier.require_multi_agent) {
    reviewConfig.agents = Math.max(reviewConfig.agents, 2);
    reasoning.push('Multi-agent review forced by criticality');
  }
  if (critMultiplier.require_human_approval) {
    reviewConfig.human_approval = true;
    reasoning.push('Human approval forced by criticality');
  }

  // 5. Apply platform-level governance (see Section 5.5.2)
  const platformPolicy = await loadPlatformPolicy(bar.platformId);
  if (platformPolicy?.governance) {
    // Platform minimum scores — inject constraints for pillars below threshold
    for (const [pillar, minScore] of Object.entries(platformPolicy.governance.minimumScores || {})) {
      const pillarScore = scores.pillars[pillar]?.score ?? 100;
      if (pillarScore < minScore) {
        constraints.push(
          `Platform ${bar.platformId} requires ${pillar} score ≥ ${minScore}% (current: ${pillarScore}%)`
        );
        reasoning.push(`Platform minimum: ${pillar} ${pillarScore}% < required ${minScore}%`);
      }
    }

    // Platform tier cap — cannot be more permissive than platform allows
    if (platformPolicy.governance.orchestrationOverrides?.minTier) {
      const tierRank = { restricted: 0, supervised: 1, autonomous: 2 };
      const minTier = platformPolicy.governance.orchestrationOverrides.minTier;
      if (tierRank[tier] > tierRank[minTier]) {
        tier = minTier;
        reasoning.push(`Tier capped to "${minTier}" by platform policy`);
      }
    }

    // Shared infrastructure constraints
    const barInfra = platformPolicy.governance.sharedInfrastructure?.filter(
      infra => infra.bars.includes(bar.id)
    );
    if (barInfra?.length) {
      for (const infra of barInfra) {
        constraints.push(infra.constraint);
        reasoning.push(`Shared ${infra.type} "${infra.name}" — ${infra.bars.length} BARs affected`);
      }
    }
  }

  // 6. Add BAR-level constraints
  if (bar.orchestration?.additional_constraints) {
    constraints.push(...bar.orchestration.additional_constraints);
  }

  // 7. Build NeMo Guardrails config for this BAR
  const guardrailsConfig = buildGuardrailsConfig(bar, architecture, scores, policy);

  // 8. Resolve cross-repo links (CALM flows + declared + platform siblings)
  const crossRepoLinks = resolveCrossRepoLinks(bar, platformPolicy);

  return {
    bar, tier,
    effectiveScore: scores.composite,
    permissions: policy.permission_tiers[tier].permissions,
    promptPacks: [...new Set(promptPacks)],
    constraints,
    reviewConfig,
    agentSelection: selectAgents(tier, reviewConfig, policy.agent_preferences),
    guardrailsConfig,
    crossRepoLinks,
    reasoning
  };
}
```

---

## 7. Agent-Agnostic Deployment

### 7.1 The Challenge

Claude Code Action and GitHub Copilot coding agent have different configuration mechanisms:

| Aspect | Claude Code Action | Copilot Coding Agent |
|--------|-------------------|---------------------|
| MCP config | `.mcp.json` in repo root (auto-detected) | Repo Settings UI (JSON, not committed) |
| Agent instructions | `CLAUDE.md` | `copilot-instructions.md`, `AGENTS.md` |
| Permissions | `.claude/settings.json` | Not configurable |
| Hooks | `.claude/settings.json` — `PreToolUse`, `PostToolUse` | `.github/hooks/*.json` — `preToolUse`, `postToolUse`, `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `errorOccurred` |
| Hook deny mechanism | Exit code 2 = deny | `{"permissionDecision":"deny"}` JSON stdout |
| Hook scope | Personal / project / admin tiers | Repository-wide (committed to default branch) |
| MCP features | Tools, resources, prompts | **Tools only** (no resources, no prompts) |
| Environment setup | GitHub Actions workflow | `copilot-setup-steps.yml` |
| Secrets | Standard Actions secrets | `COPILOT_MCP_` prefixed, `copilot` environment |

> **Key parity milestone:** both agents now support `preToolUse` hooks, giving the Red Queen deterministic Layer 1 enforcement for both agents. Copilot hooks are committed to the repository's default branch in `.github/hooks/` and activate automatically for both the coding agent (GitHub Actions) and Copilot CLI.

### 7.2 Unified Governance via MCP Tools

The key insight: **MCP tools are the universal control plane**. Both agents support MCP tool calls. By exposing all governance enforcement through tools (not resources or prompts), both agents receive identical governance.

```
┌─────────────────────────────────────────────────────┐
│            Agent-Agnostic MCP Tool Layer              │
│                                                       │
│  Both agents call the SAME tools:                     │
│                                                       │
│  validate_action()          → NeMo enforcement        │
│  get_bar_context()          → Full architecture ctx   │
│  get_constraints()          → Active governance rules │
│  validate_interface_contract() → Cross-repo checks    │
│  governance_gaps()          → What needs fixing        │
│  blast_radius()             → Impact analysis         │
│                                                       │
│  Resources & prompts (Claude Code only):              │
│  calm://bars/{id}/arch      → CALM architecture       │
│  architecture-review prompt → Review template         │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 7.3 Claude Code Action Configuration

```yaml
# .github/workflows/claude-code-governance.yml
name: Claude Code with Red Queen Governance
on:
  issues:
    types: [opened, assigned]
  pull_request:
    types: [opened, synchronize]

jobs:
  governance-agent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Checkout governance mesh
        uses: actions/checkout@v4
        with:
          repository: ${{ github.repository_owner }}/governance-mesh
          path: governance-mesh
          token: ${{ secrets.MESH_TOKEN }}

      - name: Start Red Queen MCP Server
        run: |
          npx @maintainabilityai/redqueen-mcp &
          sleep 2
        env:
          MESH_PATH: ${{ github.workspace }}/governance-mesh
          NEMO_GUARDRAILS_URL: http://localhost:8100  # NeMo sidecar

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: claude-sonnet-4-6
          mcp_config: |
            {
              "mcpServers": {
                "redqueen": {
                  "type": "url",
                  "url": "http://localhost:3100/mcp"
                }
              }
            }
```

**.mcp.json (committed to repo):**

```json
{
  "mcpServers": {
    "redqueen": {
      "command": "npx",
      "args": ["-y", "@maintainabilityai/redqueen-mcp"],
      "env": {
        "MESH_PATH": "${GOVERNANCE_MESH_PATH:-./governance-mesh}",
        "NEMO_GUARDRAILS_URL": "${NEMO_URL:-http://localhost:8100}"
      }
    }
  }
}
```

### 7.4 Copilot Coding Agent Configuration

**copilot-setup-steps.yml:**

```yaml
# .github/copilot-setup-steps.yml
# Environment setup for Copilot coding agent
steps:
  - name: Checkout governance mesh
    uses: actions/checkout@v4
    with:
      repository: ${{ github.repository_owner }}/governance-mesh
      path: governance-mesh
      token: ${{ secrets.COPILOT_MCP_MESH_TOKEN }}

  - name: Start Red Queen MCP Server
    run: |
      npx @maintainabilityai/redqueen-mcp --port 3100 &
      sleep 2
    env:
      MESH_PATH: ${{ github.workspace }}/governance-mesh
      NEMO_GUARDRAILS_URL: http://localhost:8100

  - name: Start NeMo Guardrails Sidecar
    run: |
      pip install nemoguardrails
      nemoguardrails server --port 8100 --config-dir $MESH_PATH/.guardrails &
      sleep 3
    env:
      MESH_PATH: ${{ github.workspace }}/governance-mesh
```

**Repo Settings → MCP Servers (JSON configured in GitHub UI):**

```json
{
  "mcpServers": {
    "redqueen": {
      "type": "url",
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

**Secrets** (configured in GitHub Settings under `copilot` environment):
- `COPILOT_MCP_MESH_TOKEN` — PAT with read access to governance mesh repo

### 7.5 Shared Agent Instructions

**AGENTS.md** (read by both Claude Code and Copilot):

```markdown
# Agent Governance Instructions

This repository is governed by **The Red Queen** governance system.

## Before Making Changes

1. Call `get_bar_context` to understand the application's architecture,
   governance scores, and active constraints.
2. Call `get_constraints` to get your current permission tier and
   any governance constraints that apply.
3. For any structural change (new service, database connection,
   external call), call `validate_action` BEFORE implementing it.

## Cross-Repository Changes

If this repository is linked to other BARs in a CALM flow:
- Call `validate_interface_contract` before changing any interface
- Call `flow_impact` to understand downstream effects
- Do NOT change interface contracts without checking linked BARs

## Governance Tiers

Your permission tier is determined by the BAR's governance score:
- **Autonomous** (80%+): You may implement freely within `src/`
- **Supervised** (50-79%): Changes require human review
- **Restricted** (<50%): Plan first, implement only after approval

## Required Validations

- All proposed structural changes: `validate_action()`
- Cross-repo interface modifications: `validate_interface_contract()`
- Before creating a PR: `governance_gaps()` to check for issues
```

### 7.6 Hook Generation (Layer 1 Enforcement)

During repository scaffolding, the Red Queen generates preToolUse hooks for **both** agents, ensuring identical Layer 1 enforcement regardless of which agent is assigned to a PR.

**Claude Code Action** (`.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./.redqueen/hooks/validate-tool.sh"
          }
        ]
      }
    ]
  }
}
```

**Copilot Coding Agent** (`.github/hooks/redqueen.json`):

```json
{
  "hooks": [
    {
      "type": "preToolUse",
      "tools": ["bash", "edit", "view"],
      "script": "./.redqueen/hooks/validate-tool.sh"
    }
  ]
}
```

Both hooks call the same shared validation script (`.redqueen/hooks/validate-tool.sh`). The script reads tool name and arguments from stdin (JSON), performs fast checks against CALM flow constraints, and returns the appropriate response format per agent:

- **Claude Code:** exit code 0 = approve, exit code 2 = deny (stderr is shown to agent)
- **Copilot:** JSON stdout `{"permissionDecision":"approve"|"deny", "permissionDecisionReason":"..."}`

The shared script detects which agent is calling it via the `AGENT_TYPE` environment variable (set by the respective workflow) and formats its response accordingly. The validation logic — CALM constraint checking, path restriction enforcement, and risk tier evaluation — is identical.

---

## 8. Agent Configuration Generation

### 8.1 Dynamic CLAUDE.md Generation

The Red Queen generates a governance-aware context file that supplements (does not replace) any existing project CLAUDE.md.

```typescript
function generateGovernanceContext(
  decision: OrchestrationDecision,
  context: BarContextBundle
): string {
  let md = `# Governance Context — Generated by The Red Queen\n\n`;
  md += `> **Auto-generated.** Do not edit manually.\n\n---\n\n`;

  // BAR identity and governance posture
  md += `## Application: ${context.bar.name}\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| **BAR ID** | ${context.bar.id} |\n`;
  md += `| **Criticality** | ${context.bar.criticality} |\n`;
  md += `| **Governance Score** | ${context.scores.current.composite}% |\n`;
  md += `| **Permission Tier** | ${decision.tier} |\n`;
  md += `| **Trend** | ${context.scores.trend.direction} |\n\n`;

  // Architecture constraints from CALM
  if (context.architecture) {
    md += `## Architecture Constraints\n\n`;
    const services = context.architecture.nodes.filter(n => n['node-type'] === 'service');
    md += `### Service Boundaries\n\n`;
    md += `Do not create new services without updating bar.arch.json:\n\n`;
    for (const svc of services) {
      md += `- **${svc.name}** (\`${svc['unique-id']}\`): ${svc.description}\n`;
    }

    const connects = context.architecture.relationships.filter(
      r => r['relationship-type']?.connects
    );
    md += `\n### Communication Patterns\n\n`;
    md += `Respect these declared connections:\n\n`;
    for (const rel of connects) {
      const conn = rel['relationship-type'].connects;
      md += `- \`${conn.source.node}\` → \`${conn.destination.node}\`: ${rel.description}\n`;
    }
    md += `\n**Do not introduce connections not declared in the architecture.**\n\n`;
  }

  // Cross-repo links
  if (decision.crossRepoLinks.length > 0) {
    md += `## Cross-Repository Dependencies\n\n`;
    md += `This BAR is linked to the following BARs via CALM flows.\n`;
    md += `**Changes to interfaces MUST be validated with \`validate_interface_contract\`.**\n\n`;
    for (const link of decision.crossRepoLinks) {
      md += `- **${link.targetBar}** (${link.relationship}): ${link.flows.join(', ')}\n`;
    }
    md += '\n';
  }

  // Security controls
  if (context.controls && Object.keys(context.controls).length > 0) {
    md += `## Security Controls (MUST be maintained)\n\n`;
    for (const [id, ctrl] of Object.entries(context.controls)) {
      md += `- **${id}**: ${ctrl.description}\n`;
    }
    md += '\n';
  }

  // Governance constraints (from policy evaluation)
  if (decision.constraints.length > 0) {
    md += `## Governance Constraints (MANDATORY)\n\n`;
    for (const c of decision.constraints) {
      md += `- ${c}\n`;
    }
    md += '\n';
  }

  // Active threats
  if (context.threats) {
    md += `## Active Threat Model\n\n`;
    md += `Changes must not worsen these identified threats.\n\n`;
  }

  // Decision audit trail
  md += `## Orchestration Decision Log\n\n`;
  md += `<details>\n<summary>Why these constraints?</summary>\n\n`;
  for (const reason of decision.reasoning) {
    md += `- ${reason}\n`;
  }
  md += `\n</details>\n`;

  return md;
}
```

### 8.2 Dynamic Subagent Definitions

For multi-agent review scenarios, the Red Queen generates specialized subagent definitions:

**Security Reviewer** (generated when security score < threshold):

```yaml
---
name: security-reviewer
description: Reviews code for security vulnerabilities against CALM controls
model: opus
tools: Read, Grep, Glob, Bash
---

You are a senior security engineer reviewing {{barName}}.

## Security Posture
- Security Score: {{securityScore}}%
- Active Threats: {{threatCount}} ({{criticalThreats}} critical)
- Controls: {{controlsList}}

## Required Validations
1. Call `validate_action` for any structural change
2. Cross-reference against STRIDE threat model
3. Verify declared security controls are maintained
4. Check for OWASP Top 10 violations

## Constraints
{{#each securityConstraints}}
- {{this}}
{{/each}}
```

**Architecture Reviewer** (generated when architecture score < threshold):

```yaml
---
name: architecture-reviewer
description: Reviews changes for architectural conformance against CALM model
model: sonnet
tools: Read, Grep, Glob
---

You are a software architect reviewing changes for {{barName}}.

## Architecture (CALM 1.2)
{{#each services}}
- {{name}} ({{unique-id}}): {{description}}
{{/each}}

## Cross-Repo Dependencies
{{#each linkedBars}}
- {{targetBar}} via flow {{flowName}} — interface: {{interfaceId}}
{{/each}}

## Required Validations
1. Call `validate_action` for structural changes
2. Call `validate_interface_contract` for cross-repo changes
3. Verify changes respect declared architecture boundaries
4. Review against active ADRs
```

---

## 9. Multi-Agent Review Board

### 9.1 Design Principle: Agent-Agnostic Step-Based Review

The review board is a **single GitHub Actions workflow** triggered on `pull_request` events. It uses **sequential steps** within one job — each step is the same agent framework (whichever the team uses), but with different role-specific instructions. This design ensures:

1. **Framework independence**: Teams using only Claude Code Action or only Copilot coding agent get identical review coverage. The workflow template is parameterized by `agent-type`.
2. **Same MCP tools**: Both agents call the same Red Queen MCP tools (`validate_action`, `get_constraints`, `get_bar_context`). The governance enforcement is identical regardless of agent.
3. **Deterministic consensus**: The consensus step is pure TypeScript (not AI). It collects structured verdicts from each review step and applies the resolution algorithm.
4. **Separation of concerns**: Implementation agent (issue-triggered) is decoupled from review agent (PR-triggered). A PR created by Copilot can be reviewed by Claude, or vice versa, or the same agent with different roles.

### 9.2 Review Board Composition

```typescript
interface ReviewBoard {
  steps: ReviewStep[];
  consensusRule: ConsensusRule;
  humanApproval: boolean;
  timeout: number;
}

interface ReviewStep {
  id: string;
  role: 'security' | 'architecture' | 'quality' | 'general';
  agentType: 'claude' | 'copilot';         // which agent runs this step
  instructions: string;                     // role-specific prompt/instructions
  mcpTools: string[];                       // Red Queen tools this reviewer should call
  requiredForTier: ('supervised' | 'restricted')[];  // which tiers require this step
}

type ConsensusRule = 'any-deny-is-deny' | 'majority' | 'unanimous';
```

### 9.3 Workflow Architecture

```
PR Created (by any agent, or human)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  redqueen-review.yml (pull_request trigger)                  │
│                                                              │
│  Step 0: Setup                                               │
│    ├── Checkout code + governance mesh                       │
│    ├── Start Red Queen MCP server                            │
│    └── Read decision.json → determine review depth           │
│                                                              │
│  Step 1: Security Review (same agent framework)              │
│    ├── Role: security reviewer                               │
│    ├── Instructions: OWASP, STRIDE, CALM controls            │
│    ├── Calls: get_bar_context, validate_action,              │
│    │         get_constraints, validate_interface_contract     │
│    └── Output: structured ReviewVerdict JSON                 │
│                                                              │
│  Step 2: Architecture Review (same agent framework)          │
│    ├── Role: architecture reviewer                           │
│    ├── Instructions: CALM conformance, ADR compliance,       │
│    │   cross-BAR interfaces, component boundaries            │
│    ├── Calls: get_bar_context, validate_action,              │
│    │         architecture_query, governance_gaps              │
│    └── Output: structured ReviewVerdict JSON                 │
│                                                              │
│  Step 3: Consensus (deterministic TypeScript — not AI)       │
│    ├── Collects verdicts from Steps 1-2                      │
│    ├── Runs resolveConsensus() algorithm                     │
│    ├── Posts combined review comment to PR                   │
│    └── Sets status check: pass / fail / pending-approval     │
│                                                              │
│  Step 4: Human Approval Gate (if tier requires it)           │
│    └── CODEOWNER approval required before merge              │
└─────────────────────────────────────────────────────────────┘
```

### 9.4 Workflow Template

The `redqueen-action` scaffolds this workflow into code repos during governance deployment. The `agent-type` parameter swaps the `uses:` action while keeping everything else identical.

**Claude Code Action variant:**

```yaml
name: Red Queen Governance Review
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  redqueen-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Checkout governance mesh
        uses: actions/checkout@v4
        with:
          repository: ${{ github.repository_owner }}/governance-mesh
          path: governance-mesh
          token: ${{ secrets.MESH_TOKEN }}

      - name: Start Red Queen MCP Server
        run: |
          npx @maintainabilityai/redqueen-mcp &
          sleep 2
        env:
          MESH_PATH: ${{ github.workspace }}/governance-mesh

      - name: Determine review depth
        id: review-depth
        run: |
          DECISION=$(cat .redqueen/decision.json 2>/dev/null || echo '{}')
          TIER=$(echo "$DECISION" | jq -r '.effectiveTier // "supervised"')
          AGENTS=$(echo "$DECISION" | jq -r '.review.agents // 1')
          HUMAN=$(echo "$DECISION" | jq -r '.review.human_approval // true')
          echo "tier=$TIER" >> $GITHUB_OUTPUT
          echo "agents=$AGENTS" >> $GITHUB_OUTPUT
          echo "human=$HUMAN" >> $GITHUB_OUTPUT

      # Step 1: Security Review
      - name: Security Review
        id: security-review
        if: steps.review-depth.outputs.tier != 'autonomous'
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: claude-sonnet-4-6
          direct_prompt: |
            You are a senior security engineer conducting a governance-enforced PR review.

            ## Your Role
            Review this pull request for security vulnerabilities, OWASP Top 10 violations,
            and STRIDE threat model adherence.

            ## Required Steps
            1. Call `get_bar_context` to load the application's CALM architecture and threat model
            2. Call `get_constraints` to understand active governance rules
            3. For each structural change in the diff, call `validate_action` to check CALM compliance
            4. For any cross-repo interface changes, call `validate_interface_contract`
            5. Call `governance_gaps` to identify uncovered security controls

            ## Output Format
            Post your review as a PR comment. End with a structured verdict block:
            ```json
            { "role": "security", "approve": true|false, "severity": "low|medium|high|critical",
              "findings": [{ "file": "...", "line": 0, "severity": "...", "description": "..." }],
              "caveats": ["..."] }
            ```

      # Step 2: Architecture Review
      - name: Architecture Review
        id: architecture-review
        if: steps.review-depth.outputs.agents >= 2
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: claude-sonnet-4-6
          direct_prompt: |
            You are a software architect conducting a governance-enforced PR review.

            ## Your Role
            Review this pull request for architectural conformance against the CALM model,
            ADR compliance, component boundary violations, and cross-BAR dependency impacts.

            ## Required Steps
            1. Call `get_bar_context` to load the CALM architecture and active ADRs
            2. Call `architecture_query` to check component relationships
            3. For structural changes, call `validate_action` to verify CALM conformance
            4. Call `governance_gaps` to identify architectural coverage gaps

            ## Output Format
            Post your review as a PR comment. End with a structured verdict block:
            ```json
            { "role": "architecture", "approve": true|false, "severity": "low|medium|high|critical",
              "findings": [{ "file": "...", "line": 0, "severity": "...", "description": "..." }],
              "caveats": ["..."] }
            ```

      # Step 3: Consensus (deterministic — not AI)
      - name: Governance Consensus
        if: always() && steps.review-depth.outputs.tier != 'autonomous'
        uses: maintainabilityai/redqueen-consensus@v1
        with:
          verdicts-from: security-review,architecture-review
          decision-json: .redqueen/decision.json
          # Posts combined review, sets status check
```

**Copilot coding agent variant** — identical structure, different `uses:`:

```yaml
      # Step 1: Security Review (Copilot)
      - name: Security Review
        id: security-review
        if: steps.review-depth.outputs.tier != 'autonomous'
        uses: github/copilot-coding-agent@v1
        with:
          instructions: |
            You are a senior security engineer conducting a governance-enforced PR review.
            [... same instructions as Claude variant ...]
          mcp_config: |
            { "mcpServers": { "redqueen": { "type": "url", "url": "http://localhost:3100/mcp" } } }

      # Step 2: Architecture Review (Copilot)
      - name: Architecture Review
        id: architecture-review
        if: steps.review-depth.outputs.agents >= 2
        uses: github/copilot-coding-agent@v1
        with:
          instructions: |
            You are a software architect conducting a governance-enforced PR review.
            [... same instructions as Claude variant ...]
```

### 9.5 Tier-Based Review Depth

The `determine review depth` step reads `decision.json` and controls which steps run:

| Tier | Security Review | Architecture Review | Consensus | Human Approval |
|------|----------------|--------------------|-----------| --------------|
| Autonomous | Skip (status check auto-passes) | Skip | Skip | No |
| Supervised | Run | Skip (unless `agents >= 2`) | Run | Yes |
| Restricted | Run | Run | Run (any-deny-is-deny) | Yes + CODEOWNER |

For `critical` criticality BARs, the review depth is always `restricted` regardless of score.

### 9.6 Consensus Resolution

The consensus step is a **deterministic GitHub Action** (`maintainabilityai/redqueen-consensus`), not an AI agent. It collects structured `ReviewVerdict` JSON from prior steps and applies the resolution algorithm.

#### 9.6.1 Resolution Rules

| Scenario | Security Reviewer | Architecture Reviewer | Resolution |
|----------|------------------|----------------------|------------|
| Agreement | Approve | Approve | Approve — merge allowed |
| Agreement | Deny (critical) | Deny (high) | Deny at highest severity |
| Split | Deny (any) | Approve | Deny — blocking finding wins |
| Split | Approve | Deny (any) | Deny — blocking finding wins |
| Conditional | Approve with caveats | Approve | Approve with merged caveats |

#### 9.6.2 Key Principles

- **Any deny is a deny:** If any reviewer returns a blocking finding, the PR is blocked. There is no majority vote. This is a **union of concerns**, not a democratic process.
- **Severity propagates upward:** The final verdict uses the highest severity from any reviewer. If security says "critical" and architecture says "medium," the combined verdict is "critical."
- **Caveats are merged:** If both reviewers approve but attach conditions (e.g., "add rate limiting" from security + "update ADR" from architecture), all conditions are surfaced in the PR comment.
- **No silent resolution:** When reviewers disagree, the PR comment explicitly shows both opinions. The blocking opinion is enforced, but the approving opinion is visible so the developer understands the full picture.

#### 9.6.3 Escalation Path

If a developer believes a blocking finding is incorrect (false positive):

1. Comment on the PR with a justification.
2. A CODEOWNER reviews the finding and either overrides (using break-glass, Section 14.3.5) or confirms.
3. If overridden, the break-glass procedure applies — escalating friction, quarterly budget, follow-up issue.

#### 9.6.4 Implementation

```typescript
interface ReviewVerdict {
  role: 'security' | 'architecture' | 'quality' | 'general';
  approve: boolean;
  severity?: Severity;
  findings: Finding[];
  caveats?: string[];
  rationale?: string;
}

interface Finding {
  file: string;
  line?: number;
  severity: Severity;
  description: string;
  control?: string;     // CALM control ID (e.g., ctrl-pci-001)
  rule?: string;        // Policy rule ID (e.g., PLAT-001)
}

type Severity = 'low' | 'medium' | 'high' | 'critical';

function resolveConsensus(
  verdicts: ReviewVerdict[],
  rule: ConsensusRule
): ConsensusResult {
  // Any critical finding → immediate escalation
  const criticalFindings = verdicts.flatMap(v =>
    v.findings.filter(f => f.severity === 'critical')
  );
  if (criticalFindings.length > 0) {
    return { outcome: 'escalate', reason: `${criticalFindings.length} critical finding(s)`, findings: criticalFindings };
  }

  // Collect all findings and caveats across reviewers
  const allFindings = verdicts.flatMap(v => v.findings);
  const allCaveats = verdicts.flatMap(v => v.caveats ?? []);

  // Any deny is a deny — union of concerns, not majority vote
  const anyDeny = verdicts.some(v => !v.approve);
  if (anyDeny) {
    // Use highest severity from any reviewer
    const maxSeverity = allFindings.reduce(
      (max, f) => severityRank(f.severity) > severityRank(max) ? f.severity : max,
      'low' as Severity
    );
    return {
      outcome: 'request-changes',
      severity: maxSeverity,
      findings: allFindings,
      // Include approving opinions for transparency
      dissent: verdicts.filter(v => v.approve).map(v => ({
        reviewer: v.role,
        opinion: 'approved',
        rationale: v.rationale,
      })),
    };
  }

  // All approve — merge caveats from all reviewers
  return {
    outcome: 'approve',
    findings: [],
    caveats: allCaveats.length > 0 ? allCaveats : undefined,
  };
}

function severityRank(s: Severity): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[s] ?? 0;
}
```

### 9.7 Relationship to Existing CI

The review workflow **complements** existing CI jobs, not replaces them:

```
PR Created
    │
    ├──→ CodeQL (existing) ──→ Security dashboard
    ├──→ Snyk (existing) ────→ Security dashboard
    ├──→ Tests (existing) ───→ Status check
    │
    └──→ redqueen-review.yml (new)
           ├── Security review step (AI agent)
           ├── Architecture review step (AI agent)
           ├── Consensus step (deterministic)
           └──→ Status check: redqueen/governance
```

CodeQL and Snyk results feed into the security dashboard (already implemented in Rabbit Hole CI jobs). The Red Queen review workflow adds **architecture-aware, CALM-informed** review on top — it reads the governance mesh context that static analysis tools don't have access to.

> The multi-agent review board is **additive** (union of concerns) rather than reductive (intersection). The cost is potential false-positive friction, but the break-glass mechanism (Section 14.3.5) provides a controlled release valve.

---

## 10. The Feedback Loop

### 10.1 Score Delta Tracking

After every agent intervention, the Red Queen computes governance score deltas:

```typescript
interface ScoreDelta {
  barId: string;
  event: 'pr_merged' | 'review_completed' | 'remediation_applied';
  agent: string;
  timestamp: string;
  before: GovernanceScores;
  after: GovernanceScores;
  delta: {
    composite: number;
    architecture: number;
    security: number;
    informationRisk: number;
    operations: number;
  };
  guardrailActions: {
    validated: number;        // Actions that went through validate_action
    approved: number;
    denied: number;
    conditional: number;
  };
  prUrl?: string;
}
```

### 10.2 Agent Memory

**BAR-level memory** (`.caterpillar/agent-memory/{barId}.yaml`):

```yaml
learnings:
  - date: "2026-02-28"
    agent: "claude-code"
    type: "architecture_violation"
    description: "Agent tried to add direct Redis connection from frontend — denied by flow constraint rail"
    rail: "flow_constraint_rail"
    prevented: true

  - date: "2026-02-27"
    agent: "copilot-swe-agent"
    type: "effective_pattern"
    description: "Zod schema validation at API boundary eliminated 3 injection findings"

  - date: "2026-02-26"
    agent: "claude-code"
    type: "cross_repo_violation"
    description: "Frontend change would break API interface contract — caught by interface_contract_rail"
    linked_bar: "api-service"
    rail: "interface_contract_rail"

effective_prompts:
  - pack: "owasp/A03_injection"
    effectiveness: 0.92

recurring_issues:
  - category: "authentication"
    frequency: 3
    last_seen: "2026-02-28"
    status: "tracked"
```

### 10.3 Adaptive Policy Refinement

The Red Queen uses agent memory to suggest policy refinements:

```typescript
interface PolicySuggestion {
  type: 'threshold_adjustment' | 'constraint_addition' | 'rail_effectiveness' | 'agent_preference';
  description: string;
  evidence: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number;
}

// Example suggestions:
// "Flow constraint rail has denied 8 actions in the last 30 days for bar 'frontend-app'.
//  Consider adding an architecture ADR documenting the allowed connection patterns."

// "Interface contract rail caught 3 cross-repo violations between frontend-app and api-service.
//  Consider requiring validate_interface_contract as a pre-commit hook."

// "Security prompt injection threshold should be raised from 60% to 70% —
//  BARs between 60-70% still show 2.3 security findings per review."
```

### 10.4 Score Decay Model — The Trust Battery

Governance scores must not be static snapshots. A BAR reviewed 6 months ago with a score of 85% is not as trustworthy as a BAR reviewed yesterday with the same score. Scores without decay create a false sense of governance health and remove the incentive for continuous maintenance.

The Red Queen implements a **trust battery** model: scores decay over time unless actively maintained, mimicking how trust works in human engineering teams.

#### 10.4.1 Decay Factors

| Factor | Decay Rate | Trigger | Rationale |
|--------|-----------|---------|-----------|
| **Review freshness** | -2 points/month after 30 days since last Oraculum review | No review in >30 days | Unreviewed code drifts from architecture |
| **Dependency staleness** | -1 point/month per critical dependency beyond 90 days old | `npm outdated` / `snyk test` age data | Stale dependencies accumulate CVEs |
| **Security scan staleness** | -3 points/month after 14 days since last CodeQL/Snyk scan | No scan results in >14 days | Security posture is unknown without recent scans |
| **Threat model staleness** | -1 point/month after 90 days since last threat model update | `threat-model.yaml` modification date | Threat landscape evolves; stale models miss new vectors |
| **ADR freshness** | -0.5 points/month after 180 days since last ADR | No new ADR in >180 days | Architectural decisions accumulate without documentation |

#### 10.4.2 Critical Failure Reset

Certain events trigger immediate score reductions rather than gradual decay:

| Event | Score Impact | Recovery Path |
|-------|-------------|---------------|
| **Critical CVE in dependency** | Security pillar → floor of 30% | Remediate CVE, re-scan, score recomputes |
| **NeMo rail denial on merged PR** | -10 points to affected pillar | Indicates enforcement bypass — investigate how denial was circumvented |
| **Failed security scan (high/critical)** | Security pillar capped at 50% until resolved | Fix findings, re-scan to lift cap |
| **Interface contract violation in production** | -15 points to architecture pillar | Update CALM model, validate all linked BARs |

#### 10.4.3 Decay Computation

Decay is computed **on read**, not as a background job. When any tool, panel, or CI workflow queries a BAR's governance scores, the Red Queen applies decay based on the current timestamp versus the last event timestamps:

```typescript
interface DecayConfig {
  reviewFreshness: { gracePeriodDays: number; decayPerMonth: number };
  dependencyAge: { thresholdDays: number; decayPerMonth: number };
  securityScan: { gracePeriodDays: number; decayPerMonth: number };
  threatModel: { gracePeriodDays: number; decayPerMonth: number };
  adrFreshness: { gracePeriodDays: number; decayPerMonth: number };
}

const DEFAULT_DECAY: DecayConfig = {
  reviewFreshness: { gracePeriodDays: 30, decayPerMonth: 2 },
  dependencyAge: { thresholdDays: 90, decayPerMonth: 1 },
  securityScan: { gracePeriodDays: 14, decayPerMonth: 3 },
  threatModel: { gracePeriodDays: 90, decayPerMonth: 1 },
  adrFreshness: { gracePeriodDays: 180, decayPerMonth: 0.5 }
};

function computeDecayedScore(
  rawScore: GovernanceScores,
  timestamps: GovernanceTimestamps,
  now: Date,
  config: DecayConfig = DEFAULT_DECAY
): GovernanceScores {
  const decayed = { ...rawScore };

  // Review freshness decay — affects all pillars
  const daysSinceReview = daysBetween(timestamps.lastReview, now);
  if (daysSinceReview > config.reviewFreshness.gracePeriodDays) {
    const monthsOverdue = (daysSinceReview - config.reviewFreshness.gracePeriodDays) / 30;
    const reviewDecay = monthsOverdue * config.reviewFreshness.decayPerMonth;
    decayed.composite = Math.max(0, decayed.composite - reviewDecay);
  }

  // Security scan staleness — affects security pillar
  const daysSinceScan = daysBetween(timestamps.lastSecurityScan, now);
  if (daysSinceScan > config.securityScan.gracePeriodDays) {
    const monthsOverdue = (daysSinceScan - config.securityScan.gracePeriodDays) / 30;
    const scanDecay = monthsOverdue * config.securityScan.decayPerMonth;
    decayed.security = Math.max(0, decayed.security - scanDecay);
  }

  // Dependency staleness — affects security + operations pillars
  if (timestamps.oldestCriticalDependencyDays > config.dependencyAge.thresholdDays) {
    const monthsOverdue = (timestamps.oldestCriticalDependencyDays - config.dependencyAge.thresholdDays) / 30;
    const depDecay = monthsOverdue * config.dependencyAge.decayPerMonth;
    decayed.security = Math.max(0, decayed.security - depDecay);
    decayed.operations = Math.max(0, decayed.operations - depDecay);
  }

  // Threat model staleness — affects security + informationRisk pillars
  const daysSinceThreatUpdate = daysBetween(timestamps.lastThreatModelUpdate, now);
  if (daysSinceThreatUpdate > config.threatModel.gracePeriodDays) {
    const monthsOverdue = (daysSinceThreatUpdate - config.threatModel.gracePeriodDays) / 30;
    const threatDecay = monthsOverdue * config.threatModel.decayPerMonth;
    decayed.security = Math.max(0, decayed.security - threatDecay);
    decayed.informationRisk = Math.max(0, decayed.informationRisk - threatDecay);
  }

  // Recompute composite from decayed pillars
  decayed.composite = Math.round(
    (decayed.architecture + decayed.security + decayed.informationRisk + decayed.operations) / 4
  );

  return decayed;
}
```

#### 10.4.4 Decay Visualization

The Looking Glass BAR detail shows decay as a distinct visual signal:

- **Score display**: Shows both raw score and decayed score when they differ: `Security: 85% → 72% (decayed)`
- **Decay warning**: Amber callout when decay exceeds 10 points: "Security score has decayed 13 points since last scan (47 days ago)"
- **Tier impact**: If decay pushes a BAR below a tier threshold, the tier badge shows both: `🟢 Autonomous → 🟡 Supervised (decayed)`
- **Recovery actions**: Each decay factor links to a remediation action: "Run Oraculum review to restore review freshness"

#### 10.4.5 Decay in Orchestration Decisions

The policy evaluator uses **decayed scores**, not raw scores, for all tier and constraint decisions. This means:

- A BAR with raw score 82% but decayed score 74% is evaluated as **supervised**, not autonomous
- Prompt pack injection thresholds compare against decayed scores
- Platform minimum score enforcement uses decayed scores
- Score delta tracking records both raw and decayed values

```typescript
interface GovernanceTimestamps {
  lastReview: Date | null;
  lastSecurityScan: Date | null;
  lastThreatModelUpdate: Date | null;
  lastAdrCreated: Date | null;
  oldestCriticalDependencyDays: number;
  lastCriticalFailure: Date | null;
  criticalFailureType: string | null;
}
```

---

## 11. VS Code Extension Integration

### 11.1 Extension Host MCP Registration

The Red Queen MCP server is bundled inside the VS Code extension:

```json
{
  "contributes": {
    "mcpServerDefinitionProviders": [
      {
        "id": "maintainabilityai.redqueen",
        "label": "MaintainabilityAI — The Red Queen"
      }
    ]
  }
}
```

```typescript
context.subscriptions.push(
  vscode.lm.registerMcpServerDefinitionProvider('maintainabilityai.redqueen', {
    onDidChangeMcpServerDefinitions: didChangeEmitter.event,
    provideMcpServerDefinitions: async () => {
      const meshPath = getMeshPath();
      if (!meshPath) return [];
      return [
        new vscode.McpStdioServerDefinition({
          label: 'MaintainabilityAI Red Queen',
          command: 'node',
          args: [path.join(context.extensionPath, 'dist', 'mcp-server.js')],
          env: { MESH_PATH: meshPath },
          version: context.extension.packageJSON.version
        })
      ];
    },
    resolveMcpServerDefinition: async (server) => {
      const meshPath = server.env?.MESH_PATH;
      if (!meshPath || !fs.existsSync(meshPath)) {
        vscode.window.showWarningMessage('Red Queen: governance mesh not found.');
        return undefined;
      }
      return server;
    }
  })
);
```

### 11.2 Cheshire Cat Governance UX — End-to-End

This section describes how Red Queen governance manifests in the Cheshire Cat user experience when a developer uses the extension to build features for governed applications. The key principle: governance is not a separate workflow — it is woven into every panel the user touches, from BAR exploration to feature implementation to post-merge feedback.

#### 11.2.1 Looking Glass — Governance Dashboard

The Looking Glass BAR detail view is the governance entry point. Every BAR displays its Red Queen posture.

**Tier Badge**

Displayed next to the BAR name in the detail header. The badge is the single most important governance signal.

| Tier | Color | Badge | Meaning |
|------|-------|-------|---------|
| Autonomous | Green | `🟢 Autonomous` | Score ≥ 80%. Agents operate with minimal oversight. |
| Supervised | Yellow | `🟡 Supervised` | Score 50–79%. Human review required before merge. |
| Restricted | Red | `🔴 Restricted` | Score < 50%. Plan-mode first, dual-agent review, human approval. |

Click → popover showing:
- Current composite score and pillar breakdown (architecture, security, info-risk, operations)
- Active NeMo rails (flow constraints, control adherence, interface contracts, threat model, permission tiers)
- Active governance constraints injected into agent instructions
- Reasoning audit trail ("Composite 72% vs autonomous=80%, supervised=50% → tier: supervised")
- Platform-level overrides if applicable ("Platform PLT-CLAIMS caps tier to supervised")

**Cross-BAR Dependency Panel**

Below the CALM architecture section, a new "Cross-BAR Dependencies" panel shows:
- Linked BARs discovered via CALM flows, explicit `linkedBars`, capability overlap, and shared infrastructure
- For each linked BAR: name, relationship type (consumes/provides/shares), shared flows, interface status
- Visual indicator per link: green (all interfaces validated), yellow (pending validation), red (active violations)
- "Validate All Interfaces" button — triggers `validate_interface_contract` across all linked BARs

**Platform Context**

- Platform health bar showing aggregate composite score across all sibling BARs
- Sibling BAR list with mini-scorecards (name, tier badge, composite score, trend arrow)
- Platform-level policies displayed as constraints (e.g., "Platform requires security ≥ 70% for all BARs")
- If current BAR is below any platform minimum, a warning callout appears

**Orchestration Policy Editor**

In the Settings tab of the BAR detail, users can view and edit:
- BAR-level orchestration overrides (tier override, additional constraints)
- Prompt injection rules (which packs are mandated at what score thresholds)
- Cross-repo notification preferences (issue, comment, or none)
- Agent selection preferences (primary/fallback for implementation and review)

#### 11.2.2 White Rabbit — Governance Pre-Flight

When the user clicks "🐇 Implement based on architecture" in the BAR detail, the White Rabbit flow begins. Before the Repo Picker modal opens, the Red Queen performs a pre-flight evaluation.

**Pre-flight sequence:**
1. `redQueenService.evaluate(barId)` → computes `OrchestrationDecision`
2. Platform policies applied via `applyPlatformOverrides()`
3. Cross-BAR dependencies resolved
4. Tier-specific UX path selected

**Tier-based UX adaptation:**

| Tier | Pre-flight Behavior |
|------|---------------------|
| **Autonomous** | Proceed directly to Repo Picker. Green banner at top of scaffold: "This BAR is in autonomous tier — agents will operate in auto-edit mode with full `src/` permissions." |
| **Supervised** | Proceed with yellow banner: "This BAR requires human review for all changes. Agent will operate in ask-edit mode. Changes to configuration files require approval." |
| **Restricted** | Warning dialog before Repo Picker: "This BAR is in restricted tier (score: 42%). Components will be scaffolded with plan-mode constraints. Dual-agent review and human approval are required for all changes." User must click "I understand — proceed" to continue. |

**Governance-enriched scaffolding:**

When the ScaffoldPanel runs, it injects governance artifacts into the scaffolded project:

| File | Content | Source |
|------|---------|--------|
| `.claude/governance-context.md` | Dynamic governance context — BAR identity, tier, scores, architecture constraints, cross-BAR deps, security controls, constraints, reasoning audit trail | `generateGovernanceContext()` |
| `.claude/settings.json` | Tier-scoped permissions — auto-edit/ask-edit/plan mode, allow/deny lists | `generateSettings()` |
| `.claude/agents/security-reviewer.md` | Security review subagent definition (if security score < threshold) | `generateSubagentDefinitions()` |
| `.claude/agents/architecture-reviewer.md` | Architecture review subagent definition (if architecture score < threshold) | `generateSubagentDefinitions()` |
| `.mcp.json` | Red Queen MCP server configuration | Static template + mesh path |
| `AGENTS.md` | Shared governance instructions for Claude and Copilot | `generateAgentsMd()` |
| `.github/copilot-setup-steps.yml` | Copilot coding agent environment setup | Static template |

This ensures that **any agent working in the scaffolded repo** — whether triggered via Rabbit Hole, manually, or via CI/CD — operates under Red Queen governance from day one.

#### 11.2.3 Rabbit Hole — Governance-Aware Feature Requests

The Rabbit Hole (IssueCreatorPanel) is where Red Queen governance is most visible to the user. This is the point where a human request becomes an agent task, and the Red Queen ensures governance constraints travel with that request.

**Pre-Population with Governance Context**

The Rabbit Hole's description field receives all BAR context (CALM, ADRs, threats) from the White Rabbit flow. The Red Queen enriches this with governance-specific content:

```markdown
## Feature Request — {barName}

### Governance Posture
| Property | Value |
|----------|-------|
| **Tier** | {tier} |
| **Composite Score** | {compositeScore}% |
| **Criticality** | {criticality} |
| **Active Constraints** | {constraintCount} |
| **Cross-BAR Dependencies** | {linkedBarCount} |
| **NeMo Rails** | {activeRailCount} active |

### Architecture (CALM)
<!-- Resolved from: bar.arch.json via CalmParser.parse() -->
<!-- Truncated to nodes + relationships + interfaces (no metadata) -->
<!-- Max 200 lines — if larger, include only nodes and relationship summaries -->
${calmContext.toMarkdown({ sections: ['nodes', 'relationships', 'interfaces'], maxLines: 200 })}

### Architecture Decision Records
<!-- Resolved from: governance/adrs/*.yaml via globSync('governance/adrs/*.yaml') -->
<!-- Each ADR rendered as: "- **ADR-{id}** ({status}): {title} — {decision summary (first 100 chars)}" -->
${adrFiles.map(adr => `- **ADR-${adr.id}** (${adr.status}): ${adr.title} — ${truncate(adr.decision, 100)}`).join('\n')}

### Threat Model
<!-- Resolved from: security/threat-model.yaml via ThreatModelParser.parse() -->
<!-- Access controlled by BAR's threat_model_access tier (Section 14.4.1): -->
<!--   open: full STRIDE categories with attack vectors -->
<!--   summary: risk ratings + mitigated control IDs only (DEFAULT) -->
<!--   restricted: returns "Access restricted — contact security team" -->
${threatModel.toMarkdown({ accessTier: barConfig.security.threat_model_access ?? 'summary' })}

### Governance Constraints (MANDATORY)
<!-- Resolved from: Red Queen policy evaluation (evaluatePolicy() in Section 7.3) -->
<!-- Each constraint sourced from one of: -->
<!--   1. CALM controls (ctrl-*) → "All {resource} MUST {control.requirement}" -->
<!--   2. NeMo rail violations on current codebase → "Do not {blocked pattern}" -->
<!--   3. Platform-level mandates (policy.yaml) → inherited constraints -->
<!--   4. Fitness function failures → "{metric} must be {operator} {threshold}" -->
${policyResult.constraints.map(c => `- ${c.requirement} _(source: ${c.sourceType}/${c.sourceId})_`).join('\n')}

### Cross-BAR Dependencies
<!-- Resolved from: CALM interfaces where this BAR appears as provider or consumer -->
<!-- Each linked BAR rendered with flow name and interface ID -->
<!-- Machine-checkable contract paths included when contractArtifact exists (Section 4.5.1) -->
${linkedBars.map(link => {
  const contract = link.interface.contractArtifact
    ? ` — contract: \`${link.interface.contractArtifact.path}\``
    : '';
  return `- **${link.barId}** (${link.role} via ${link.flowId}): interface ${link.interfaceId}${contract}`;
}).join('\n')}
  ⚠ Changes to these interfaces require `validate_interface_contract`

### Scaffold Guidelines
<!-- Resolved from: .cheshire/scaffold-default.md in the governance mesh -->
<!-- Falls back to built-in default if file doesn't exist -->
<!-- Content is included verbatim — it contains repo-specific coding standards -->
${fs.readFileSync(path.join(meshPath, '.cheshire', 'scaffold-default.md'), 'utf-8')
  ?? BUILTIN_SCAFFOLD_DEFAULTS}
```

**Governance-Driven Prompt Pack Selection**

The Red Queen's policy evaluation determines which prompt packs are pre-selected. Packs mandated by governance show a lock icon and cannot be deselected:

| Condition | Auto-Selected Packs | Locked? |
|-----------|---------------------|---------|
| Security pillar < 60% | OWASP mapped category, threat-modeling/stride | 🔒 Yes |
| Architecture pillar < 70% | Architecture conformance pack | 🔒 Yes |
| Information Risk pillar < 65% | Data classification, PII handling | 🔒 Yes |
| Operations pillar < 55% | Observability, health checks, SLA | 🔒 Yes |
| User-selected (optional) | Any additional packs | No |

The "Advanced Prompt Packs" collapsible section shows:
- Locked packs with reason: "🔒 Mandated — security score 58% is below platform threshold (70%)"
- Unlocked packs that the user can add or remove
- Pack count summary: "4 mandated + 2 optional"

**Pre-Submission Governance Validation**

Before the user clicks "Submit Issue", a **Governance Summary Panel** appears below the RCTRO preview. This is not dismissable — it ensures the user understands the governance posture before creating the agent task.

```
┌─────────────────────────────────────────────────────────┐
│  🔴 Red Queen Governance Summary                        │
│                                                         │
│  Tier: Supervised  |  Mode: ask-edit  |  Score: 72%     │
│  Criticality: high  |  Review: 1 agent + human approval │
│                                                         │
│  Constraints Injected: 5                                │
│  ├─ 3 from policy evaluation (security score < 60%)     │
│  └─ 2 from platform policy (PLT-CLAIMS shared infra)    │
│                                                         │
│  Prompt Packs: 4 mandated (🔒) + 2 optional             │
│                                                         │
│  ⚠ Cross-BAR Impact:                                   │
│  ├─ api-service: shares order-processing-flow            │
│  │   └─ Interface: order-api-v2 — agent will validate   │
│  └─ fraud-detector: shares fraud-check-flow              │
│      └─ Interface: fraud-api-v1 — agent will validate   │
│                                                         │
│  NeMo Rails Active: 5/5                                 │
│  ├─ flow_constraints ✓                                  │
│  ├─ control_adherence ✓                                 │
│  ├─ interface_contracts ✓                               │
│  ├─ threat_model ✓                                      │
│  └─ permission_tiers ✓                                  │
│                                                         │
│  [Submit with Governance]  [Review Full Constraints]    │
└─────────────────────────────────────────────────────────┘
```

If the BAR is in **restricted** tier, the panel shows additional warnings:
- "⚠ Restricted tier: Agent will start in plan-mode. Implementation requires plan approval."
- "⚠ Dual-agent review required. Secondary reviewer will be auto-assigned after implementation."
- "⚠ Human approval required before merge."

**Agent Selection Constrained by Policy**

The agent assignment phase respects the orchestration decision:

| Tier | Agent Selection UX |
|------|---------------------|
| **Autonomous** | Full choice: Claude, Copilot, Skip. No mandatory review. |
| **Supervised** | Full choice. Yellow banner: "Human review required before merge." |
| **Restricted** | Primary agent only (per `agent_preferences.implementation.primary`). Red banner: "Dual-agent review + human approval required. Secondary reviewer ({secondary agent}) will be auto-assigned after PR creation." |

For **critical**-criticality BARs, regardless of tier:
- Multi-agent review is mandatory
- Human approval is mandatory
- Banner: "Critical BAR — multi-agent review and human approval required per policy."

#### 11.2.4 Scorecard — Governance Monitoring During Agent Execution

After agent assignment, the Scorecard opens in the component repo's VS Code window. The Red Queen enhances the standard Scorecard with governance monitoring.

**Active Review Banner (Governance-Enhanced)**

```
┌─────────────────────────────────────────────────────────┐
│ ● Claude is implementing feature #42                    │
│                                                         │
│   Tier: Supervised  |  NeMo: Active (5 rails)          │
│                                                         │
│   Governance Activity:                                  │
│   ├─ validate_action calls: 3                           │
│   │   ├─ ✅ add_endpoint → approved                    │
│   │   ├─ ⚠️ add_database_connection → conditional       │
│   │   │   └─ "Requires migration plan per ctrl-data-001"│
│   │   └─ ✅ modify_service → approved                  │
│   ├─ validate_interface_contract: 1                     │
│   │   └─ ✅ order-api-v2 interface → passed            │
│   └─ NeMo denials: 0                                    │
│                                                         │
│   [View Issue]  [View PR]  [Governance Log]             │
└─────────────────────────────────────────────────────────┘
```

**Governance Event Stream**

As the agent works, governance events stream into a collapsible log:

```
14:23:05  ✅ get_bar_context: Loaded architecture (12 nodes, 8 relationships, 2 flows)
14:23:08  ✅ get_constraints: Tier supervised, 5 constraints active
14:23:42  ✅ validate_action: add_endpoint on user-api → approved
14:24:15  ⚠️ validate_action: add_database_connection → conditional
           └─ Condition: "Migration plan required per ctrl-data-001"
14:25:30  ✅ validate_interface_contract: order-api-v2 → passed
14:26:01  ❌ validate_action: add_external_call (web-ui → user-database) → DENIED
           └─ "No CALM relationship declares web-ui → user-database.
              Route through api-server per movie-search-flow."
14:26:05  ℹ️ Agent adjusted: routing through api-server instead
14:26:30  ✅ validate_action: add_external_call (web-ui → api-server) → approved
```

A NeMo denial (❌) triggers a visual pulse on the Scorecard badge to draw attention.

**Post-Completion: Score Delta and Feedback**

When the PR is merged:

```
┌─────────────────────────────────────────────────────────┐
│  📊 Governance Impact — Feature #42 Merged              │
│                                                         │
│  Score Before → After:                                  │
│  ├─ Composite:     72% → 78%  (+6)  ↑                  │
│  ├─ Architecture:  80% → 82%  (+2)  ↑                  │
│  ├─ Security:      58% → 72%  (+14) ↑↑                 │
│  ├─ Info Risk:     70% → 70%  (0)   →                  │
│  └─ Operations:    65% → 68%  (+3)  ↑                  │
│                                                         │
│  Tier Change: Supervised → Supervised (no change)       │
│  Platform Health: 74% → 76%  (+2)                       │
│                                                         │
│  Agent Performance:                                     │
│  ├─ validate_action: 5 calls (4 approved, 1 conditional)│
│  ├─ NeMo denials: 1 (agent self-corrected)             │
│  └─ Interface validations: 1 (passed)                   │
│                                                         │
│  [View Full Report]  [View Agent Memory]                │
└─────────────────────────────────────────────────────────┘
```

Score delta is persisted to `score-history.yaml` and agent learnings are recorded in `.caterpillar/agent-memory/{barId}.yaml`.

#### 11.2.5 Oraculum — Governance-Configured Reviews

The Oraculum (automated architecture review) integrates with Red Queen:

- **Review depth** auto-configured by tier: autonomous BARs get lightweight reviews, restricted BARs get deep reviews
- **Review board assembly**: For restricted and critical BARs, Oraculum assembles multi-agent review boards per Section 9
- **Score delta tracking**: After review completion, governance scores are recomputed and the delta is surfaced in Looking Glass
- **Cross-BAR impact**: If the review identifies changes affecting linked BARs, notifications are created per cross-repo policy

#### 11.2.6 End-to-End Governance Flow

```
Looking Glass (BAR Detail)
    │
    │ Red Queen evaluates OrchestrationDecision:
    │ ├─ Tier badge displayed (autonomous/supervised/restricted)
    │ ├─ Cross-BAR dependencies shown
    │ ├─ Platform context + sibling BAR health
    │ └─ Governance constraints visible
    │
    ▼
White Rabbit Trigger ("🐇 Implement based on architecture")
    │
    │ Pre-flight:
    │ ├─ evaluate(barId) → OrchestrationDecision
    │ ├─ applyPlatformOverrides() → platform constraints
    │ ├─ Tier-based UX: green banner / yellow banner / red warning dialog
    │ └─ If restricted → user acknowledgment required
    │
    ▼
Repo Picker → ScaffoldPanel
    │
    │ Scaffold injects governance artifacts:
    │ ├─ .claude/governance-context.md (dynamic — BAR identity, tier, constraints)
    │ ├─ .claude/settings.json (tier-scoped permissions)
    │ ├─ .claude/agents/ (subagent definitions for weak pillars)
    │ ├─ .mcp.json (Red Queen MCP server)
    │ ├─ AGENTS.md (governance instructions)
    │ └─ .github/copilot-setup-steps.yml (Copilot environment)
    │
    ▼
Rabbit Hole (Feature Request Creation)
    │
    │ Pre-populated with:
    │ ├─ CALM architecture + ADRs + threats (from White Rabbit)
    │ ├─ Governance posture table (tier, score, criticality)
    │ ├─ Mandatory constraints (from policy evaluation)
    │ ├─ Cross-BAR dependency warnings
    │ └─ Mandated prompt packs (🔒 locked, cannot deselect)
    │
    │ User reviews → Generate RCTRO → Governance Summary Panel
    │ Agent selection constrained by tier
    │
    ▼
Agent Execution (GitHub Actions)
    │
    │ Agent calls Red Queen MCP tools:
    │ ├─ get_bar_context() → full architecture awareness
    │ ├─ get_constraints() → permission boundaries + constraints
    │ ├─ validate_action() → NeMo deterministic enforcement
    │ │   └─ Approved / Denied / Conditional per CALM model
    │ ├─ validate_interface_contract() → cross-repo validation
    │ └─ governance_gaps() → pre-PR governance check
    │
    │ Scorecard shows governance events in real-time
    │ NeMo denials trigger visual alerts
    │
    ▼
PR Review (Governed)
    │
    │ Review board assembled per OrchestrationDecision:
    │ ├─ Autonomous: 1 agent, no human required
    │ ├─ Supervised: 1 agent + human approval
    │ └─ Restricted: 2 agents + human approval + escalation
    │
    │ Consensus resolution per Section 9.3
    │
    ▼
Merge → Feedback Loop
    │
    │ ├─ Score delta computed + persisted to score-history.yaml
    │ ├─ Agent memory updated (learnings, effective prompts, recurring issues)
    │ ├─ Platform health recalculated
    │ ├─ Tier re-evaluated (score improvement may unlock higher tier)
    │ └─ Policy suggestions generated (threshold adjustments, constraint additions)
```

### 11.3 File Watching

The Red Queen watches the governance mesh for changes:

```typescript
watch(meshPath, { recursive: true }, (eventType, filename) => {
  if (filename?.endsWith('.yaml') || filename?.endsWith('.json')) {
    const uri = filePathToResourceUri(meshPath, filename);
    if (uri) {
      server.notification({
        method: 'notifications/resources/updated',
        params: { uri }
      });
    }
    // Re-evaluate orchestration if mesh.yaml or app.yaml changed
    if (filename === 'mesh.yaml' || filename?.endsWith('app.yaml')) {
      reEvaluateAllBars();
    }
  }
});
```

---

## 12. Governance Scenarios — End-to-End

### Scenario A: Flow Constraint Enforcement

**Setup:**
- BAR: `imdb-lite-application` (composite score: 72%, tier: supervised)
- CALM flow `movie-search-flow`:
  1. `web-ui` → `api-server` (seq 1)
  2. `api-server` → `movie-database` (seq 2)

**Agent action:** Claude Code Action receives issue "Add full-text search directly from frontend to database"

**Red Queen enforcement:**
1. Agent calls `get_bar_context('imdb-lite-application')` — receives full CALM model
2. Agent plans to add `web-ui` → `movie-database` connection
3. Agent calls `validate_action({ barId: 'imdb-lite-application', actionType: 'add_database_connection', details: { sourceNode: 'web-ui', targetNode: 'movie-database' }})`
4. NeMo `flow_constraint_rail` fires:
   - Checks `$allowed_connections` — no `web-ui` → `movie-database` connection declared
   - Checks `movie-search-flow` — transition order requires `web-ui` → `api-server` → `movie-database`
   - **Verdict: DENIED** — "No CALM relationship declares web-ui → movie-database. The movie-search-flow requires routing through api-server."
5. Agent receives denial, implements search through `api-server` instead

### Scenario B: Control Adherence Enforcement

**Setup:**
- BAR: `payment-gateway` (composite score: 45%, tier: restricted, criticality: critical)
- CALM control `ctrl-pci-001`: "All cardholder data must be encrypted with AES-256 (PCI-DSS Req 3.4)"
- CALM control `ctrl-auth-003`: "All API endpoints require mutual TLS (NIST SC-8)"

**Agent action:** Copilot coding agent receives issue "Add endpoint to export transaction history as CSV"

**Red Queen enforcement:**
1. Agent calls `get_constraints('payment-gateway')` — receives restricted tier, critical criticality
2. Agent implements `/export/transactions` endpoint
3. Agent calls `validate_action({ actionType: 'add_endpoint', details: { targetNode: 'payment-api', description: 'CSV export of transaction history' }})`
4. NeMo `control_adherence_rail` fires:
   - Checks `ctrl-pci-001` — endpoint returns cardholder data → must encrypt
   - Checks `ctrl-auth-003` — new endpoint must require mTLS
   - **Verdict: CONDITIONAL** — "Approved with conditions: (1) Response must encrypt cardholder data per ctrl-pci-001, (2) Endpoint must require mTLS per ctrl-auth-003"
5. Agent implements endpoint with encryption and mTLS requirements

### Scenario C: Cross-Repo Interface Contract Enforcement

**Setup:**
- BAR: `frontend-app` (repos: `org/frontend`)
- BAR: `api-service` (repos: `org/api`)
- CALM flow `order-processing-flow`:
  1. `checkout-ui` (frontend-app) → `order-api` (api-service) via interface `order-api-v2`
  2. `order-api` (api-service) → `order-database` (api-service)
- Interface `order-api-v2`: `host: api.example.com, port: 443, protocol: HTTPS`
- Control on `order-api`: "All order mutations require idempotency key (ctrl-api-001)"

**Agent action in `org/frontend`:** "Migrate checkout to use new order creation endpoint /api/v3/orders"

**Red Queen enforcement:**
1. Agent calls `validate_action({ barId: 'frontend-app', actionType: 'modify_service', details: { targetNode: 'checkout-ui', description: 'Migrate to /api/v3/orders' }})`
2. Red Queen detects cross-BAR dependency: `checkout-ui` connects to `order-api` (different BAR)
3. Calls `validate_interface_contract({ sourceBarId: 'frontend-app', targetBarId: 'api-service', changeDescription: 'Migrate to /api/v3/orders' })`
4. NeMo `interface_contract_rail` fires:
   - Checks interface `order-api-v2` — the current contract is for v2, not v3
   - **Verdict: DENIED** — "Interface contract violation: The declared interface is order-api-v2. Endpoint /api/v3/orders is not part of this contract. The api-service BAR must update its interface declaration first."
5. Agent receives denial with recommendation: "Coordinate with api-service team to update the interface contract before migrating"
6. Red Queen creates a GitHub issue in `org/api`: "Interface contract change request from frontend-app: requires /api/v3/orders endpoint on order-api-v2 interface"

### Scenario D: Threat Model Enforcement

**Setup:**
- BAR: `user-service` (composite score: 62%, tier: supervised)
- STRIDE threat: "Spoofing — Unauthenticated access to user profile endpoints (severity: high, mitigation: OAuth2 + rate limiting)"

**Agent action:** "Add public endpoint /api/users/search for user discovery"

**Red Queen enforcement:**
1. Agent calls `validate_action({ actionType: 'add_endpoint', details: { targetNode: 'user-api', description: 'Public user search endpoint' }})`
2. NeMo `threat_model_rail` fires:
   - STRIDE category: Spoofing — new endpoint adds attack surface
   - Existing mitigation requires OAuth2 + rate limiting
   - **Verdict: CONDITIONAL** — "Endpoint must implement: (1) OAuth2 authentication, (2) Rate limiting (100 req/min), (3) Result pagination to prevent data enumeration. Existing threat 'Spoofing — Unauthenticated access' applies."

---

## 13. Service Architecture

### 13.1 RedQueenService ✅ (Implemented in Phase 5)

Stateless class — no vscode imports, usable from both extension host and MCP server.

```typescript
// src/services/RedQueenService.ts (actual implementation)

export class RedQueenService {
  // ── Policy Loading ────────────────────────────────────────
  loadPolicy(reader: MeshReader): OrchestrationPolicy;
  loadPlatformPolicy(reader: MeshReader, platformId: string): PlatformGovernancePolicy | null;

  // ── Policy Evaluation ─────────────────────────────────────
  evaluatePolicy(bar: BarSummary, policy: OrchestrationPolicy): OrchestrationDecision;
  applyPlatformOverrides(decision: OrchestrationDecision, platformPolicy: PlatformGovernancePolicy, bar: BarSummary, reader: MeshReader): OrchestrationDecision;
  getOrchestrationDecision(reader: MeshReader, barName: string): OrchestrationDecision | { error: string };

  // ── Agent Configuration Generators ────────────────────────
  generateGovernanceContext(decision: OrchestrationDecision, bar: BarSummary, policy: OrchestrationPolicy, reader?: MeshReader): string;
  generateSettings(decision: OrchestrationDecision): string;
  generateAgentsMd(decision: OrchestrationDecision, bar: BarSummary, policy: OrchestrationPolicy): string;
}
```

**Design notes:**
- Uses `MeshReader` (injected) rather than storing `meshPath` — fully stateless, no side effects
- Regex-based YAML parsing (same pattern as `readScoringConfig()`) — no YAML library dependency
- `DEFAULT_POLICY` constant provides sensible defaults when mesh.yaml has no `orchestration:` section
- Platform overrides can only restrict (cap tier down), never relax — security-first design
- All generators return strings (not objects) — caller decides where to write

**Planned for future phases:**
```typescript
  // ── Review Board (Phase 7) ────────────────────────────────
  assembleReviewBoard(decision: OrchestrationDecision): ReviewBoard;
  resolveConsensus(verdicts: ReviewVerdict[]): ConsensusResult;

  // ── Feedback Loop (Phase 7) ───────────────────────────────
  computeScoreDelta(barId: string, beforeScores: GovernanceScores): Promise<ScoreDelta>;
  recordDelta(barId: string, delta: ScoreDelta): Promise<void>;
  getAgentMemory(barId: string): Promise<AgentMemory>;
  updateAgentMemory(barId: string, learning: AgentLearning): Promise<void>;
  suggestPolicyRefinements(): Promise<PolicySuggestion[]>;
```

**Struck (NeMo replaced by policy-engine.ts in Phase 3):**
- ~~`validateAction()`~~ — implemented as `validate_action` MCP tool via `policy-engine.ts`
- ~~`buildGuardrailsConfig()`~~ — replaced by `generateStaticPolicy()` in `policy-engine.ts`
- ~~`validateInterfaceContract()`~~ — deferred to Phase 8 CI gate
- ~~`resolveFlowAcrossBars()`~~ — implemented as `findLinkedBars()` in `mesh-reader.ts`
- ~~`generateSubagentDefinitions()`~~ — deferred to Phase 7
- ~~`applyConfiguration()`~~ — scaffold writes files directly via `config-scaffold.ts`

### 13.2 Types

```typescript
// src/types/redqueen.ts

export type PermissionTier = 'autonomous' | 'supervised' | 'restricted';
export type ConsensusRule = 'unanimous' | 'majority' | 'any-flag-escalates';
export type AgentRole = 'security' | 'architecture' | 'quality' | 'general';
export type GuardrailEnforcementMode = 'strict' | 'advisory' | 'disabled';

export interface OrchestrationPolicy {
  version: number;
  permission_tiers: Record<PermissionTier, TierConfig>;
  prompt_injection: Record<string, PromptInjectionConfig>;
  criticality_multipliers: Record<string, CriticalityConfig>;
  guardrails: GuardrailsPolicy;
  agent_preferences: AgentPreferences;
  escalation: EscalationConfig;
}

export interface GuardrailsPolicy {
  enabled: boolean;
  enforcement_mode: GuardrailEnforcementMode;
  rails: {
    flow_constraints: boolean;
    control_adherence: boolean;
    interface_contracts: boolean;
    threat_model: boolean;
    permission_tiers: boolean;
  };
  cross_repo: {
    enabled: boolean;
    notification_mode: 'issue' | 'comment' | 'none';
    auto_validate_on_pr: boolean;
  };
}

export interface TierConfig {
  min_score: number;
  permissions: PermissionConfig;
  review: ReviewConfig;
}

export interface PermissionConfig {
  mode: 'auto-edit' | 'ask-edit' | 'plan';
  allow: string[];
  deny: string[];
  after_plan_approval?: PermissionConfig;
}

export interface ReviewConfig {
  agents: number;
  human_approval: boolean;
  escalation?: boolean;
  consensus_rule?: ConsensusRule;
}

export interface OrchestrationDecision {
  bar: BarSummary;
  tier: PermissionTier;
  effectiveScore: number;
  permissions: PermissionConfig;
  promptPacks: string[];
  constraints: string[];
  reviewConfig: ReviewConfig;
  agentSelection: AgentSelection;
  guardrailsConfig: GuardrailsConfig;
  crossRepoLinks: CrossRepoLink[];
  reasoning: string[];
}

export interface CrossRepoLink {
  targetBar: string;
  relationship: 'consumes' | 'provides' | 'composed-of';
  linkType: 'calm-flow' | 'declared' | 'capability-overlap' | 'shared-infrastructure';
  flows: string[];
  interfaces: string[];
}

// ── Platform Governance ─────────────────────────────────────

export interface PlatformGovernancePolicy {
  minimumScores?: Record<string, number>;           // Pillar → minimum score
  sharedInfrastructure?: SharedInfrastructure[];
  crossBarReview?: CrossBarReviewConfig;
  orchestrationOverrides?: {
    enforcementMode?: GuardrailEnforcementMode;
    minTier?: PermissionTier;                       // Floor — BARs cannot exceed this tier
  };
}

export interface SharedInfrastructure {
  type: 'database' | 'messageQueue' | 'apiGateway' | 'cache' | 'storage';
  name: string;
  bars: string[];                                    // BAR IDs sharing this resource
  constraint: string;                                // Human-readable governance constraint
}

export interface CrossBarReviewConfig {
  triggers: string[];
  reviewers: string[];
}

export interface PlatformRelationshipGraph {
  platformId: string;
  bars: Map<string, BarResource>;
  relationships: BarRelationship[];
  sharedInfrastructure: SharedInfrastructure[];
  capabilityOverlaps: CapabilityOverlap[];
}

export interface BarRelationship {
  barA: string;
  barB: string;
  type: 'calm-flow' | 'declared' | 'capability-overlap' | 'shared-infrastructure';
  strength: 'strong' | 'moderate' | 'weak';
  details: string;
  flows?: string[];
  capabilities?: string[];
  infrastructure?: string;
}

export interface PlatformImpactAssessment {
  changedBar: string;
  platformId: string;
  directImpact: BarImpact[];
  indirectImpact: BarImpact[];
  platformHealthDelta: number;
  crossBarReviewRequired: boolean;
  affectedCapabilities: string[];
  affectedInfrastructure: string[];
}

export interface BarImpact {
  barId: string;
  impact: string;
  severity: 'high' | 'medium' | 'low';
  linkType: 'calm-flow' | 'shared-infrastructure' | 'capability-overlap';
}

export interface ValidationResult {
  allowed: boolean;
  verdict: 'approved' | 'denied' | 'conditional';
  rail: string;
  reason: string;
  conditions?: string[];
  affectedFlows?: string[];
  crossRepoImpact?: CrossRepoImpact[];
}

export interface CrossRepoImpact {
  barId: string;
  repoUrl: string;
  impact: string;
  interfaceId: string;
}

export interface InterfaceViolation {
  interfaceId: string;
  targetNode: string;
  contractSpec: string;
  violation: string;
  severity: 'error' | 'warning';
}

export interface ScoreDelta {
  barId: string;
  event: string;
  agent: string;
  timestamp: string;
  before: GovernanceScores;
  after: GovernanceScores;
  delta: Record<string, number>;
  guardrailActions: { validated: number; approved: number; denied: number; conditional: number };
  prUrl?: string;
}

export interface AgentLearning {
  date: string;
  agent: string;
  type: 'false_positive' | 'effective_pattern' | 'architecture_violation' | 'cross_repo_violation' | 'security_finding';
  description: string;
  rail?: string;
  linkedBar?: string;
  prevented?: boolean;
}

export interface AgentMemory {
  learnings: AgentLearning[];
  effectivePrompts: { pack: string; effectiveness: number }[];
  recurringIssues: { category: string; frequency: number; lastSeen: string; status: string }[];
}

export interface ReviewBoard {
  agents: ReviewAgent[];
  arbiter: 'human' | 'claude-opus';
  consensusRule: ConsensusRule;
  timeout: number;
}

export interface ReviewAgent {
  id: string;
  role: AgentRole;
  subagentConfig?: string;
  weight: number;
}

export interface PolicySuggestion {
  type: string;
  description: string;
  evidence: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number;
}
```

---

## 14. Authentication & Security

### 14.1 stdio Transport (CI / Local)

The primary deployment model. Both Claude Code Action and Copilot coding agent spawn MCP servers as local child processes using stdio transport within the GitHub Actions runner. There is no remote HTTP call — the MCP server is a Node.js process that starts when the agent starts and communicates over stdin/stdout.

- **No network dependency:** The MCP server is co-located with the agent. If the runner is alive, the MCP server is reachable.
- **No separate SLA needed:** Availability is inherited from GitHub Actions' own SLA (99.9% for hosted runners).
- **No cold start:** The server starts as part of the agent's initialization, not as a separate service.

The governance mesh repository is cloned during the setup step (`copilot-setup-steps.yml` or a pre-step in the Claude Code Action workflow), so all governance data is local to the runner. No authentication is required — the server inherits runner process permissions.

**Fail-closed mesh clone:** If the governance mesh repository cannot be cloned (GitHub outage, permissions error), the agent session must not start. The workflow should tag the PR with a `governance-unavailable` label for manual review.

| Aspect | stdio (CI/Local) |
|--------|------------------|
| Auth | None — inherits runner permissions |
| Availability | Same as runner process |
| Mesh access | Git clone during setup step |
| Failure mode | Agent can't start — action fails |

### ~~14.2 HTTP Transport (Remote / Production)~~ — STRUCK

> **Decision:** The Red Queen uses a local-only architecture. Agents clone the governance mesh and run the MCP server locally via stdio. There is no remote HTTP server, so bearer auth, REDQUEEN_ENV detection, and rate limiting are unnecessary. This eliminates an entire class of infrastructure (uptime, auth, rate limiting, CORS) with no loss of functionality.

~~Bearer token authentication with **fail-closed semantics** for remote VS Code Extension integration and potential future production deployments:~~

```typescript
import { timingSafeEqual } from 'crypto';

// Environment detection
type RedQueenEnv = 'local' | 'ci' | 'production';
const REDQUEEN_ENV: RedQueenEnv =
  (process.env.REDQUEEN_ENV as RedQueenEnv) ?? 'local';
const REDQUEEN_AUTH_TOKEN = process.env.REDQUEEN_AUTH_TOKEN;

// Fail-closed: in CI/production, refuse to start without auth token
if (REDQUEEN_ENV !== 'local' && !REDQUEEN_AUTH_TOKEN) {
  throw new Error(
    `REDQUEEN_AUTH_TOKEN required in ${REDQUEEN_ENV} mode. ` +
    `Set REDQUEEN_ENV=local for unauthenticated development.`
  );
}

function validateRequest(req: IncomingMessage): boolean {
  if (REDQUEEN_ENV === 'local' && !REDQUEEN_AUTH_TOKEN) {
    return true;  // Open only in explicit local dev
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return false;
  // Constant-time comparison to prevent timing attacks
  const token = Buffer.from(auth.slice(7));
  const expected = Buffer.from(REDQUEEN_AUTH_TOKEN!);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(token, expected);
}
```

#### 14.2.1 Audit Logging

All tool invocations are logged with governance metadata for post-incident analysis:

```typescript
interface AuditLogEntry {
  timestamp: string;           // ISO 8601
  tool: string;                // e.g. "validate_action"
  caller: string;              // agent identity or CI job ID
  barId: string;
  action: string;              // action type attempted
  verdict: 'allow' | 'deny' | 'condition';
  governanceTier: 'autonomous' | 'supervised' | 'restricted';
  score: number;               // governance score at time of call
  durationMs: number;
  env: RedQueenEnv;
  // Only populated on deny/condition
  violations?: string[];
}

// Structured JSON to stdout — consumed by existing log aggregation
function emitAuditLog(entry: AuditLogEntry): void {
  console.log(JSON.stringify({ level: 'audit', ...entry }));
}
```

**Audit Trail Storage and Integrity**

| Concern | Approach |
|---------|----------|
| **Storage** | Audit logs emit to stdout as structured JSON. In CI (GitHub Actions), stdout is captured in workflow run logs with 90-day retention. In production, logs are forwarded to the organization's existing log aggregation (Splunk, Datadog, ELK) via standard container log drivers. The Red Queen does not implement its own log storage — it produces events; the org's observability stack stores them. |
| **Retention** | Minimum 90 days (GitHub Actions default). Organizations requiring longer retention configure their log aggregation pipeline. Break-glass events (Section 14.3.5) are additionally persisted as GitHub Issues, which have no expiration. |
| **Tamper-evidence** | Each `AuditLogEntry` includes a `correlationId` (SHA-256 of `timestamp + tool + barId + caller + verdict`) that can be independently recomputed from the log fields. In CI, the workflow run ID provides a tamper-evident anchor — GitHub Actions logs cannot be modified after the run completes. For production deployments, organizations should route audit events to append-only storage (e.g., S3 with Object Lock, immutable Datadog archives). |
| **Correlation** | Every audit entry includes `correlationId`, `prNumber` (when running in PR context), `commitSha`, and `workflowRunId`. This enables tracing a governance decision back to the exact PR, commit, agent session, and workflow run. Break-glass overrides include the `ticketRef` for incident correlation. |

```typescript
interface AuditLogEntry {
  // ... (existing fields above)
  correlationId: string;           // SHA-256(timestamp + tool + barId + caller + verdict)
  prNumber?: number;               // GitHub PR number (when in PR context)
  commitSha?: string;              // HEAD commit SHA at time of validation
  workflowRunId?: string;          // GitHub Actions run ID (CI only)
}
```

#### 14.2.2 Rate Limiting

Per-tool rate limits prevent runaway agents from overwhelming the governance server:

```typescript
interface RateLimitConfig {
  windowMs: number;         // Sliding window (default: 60_000)
  maxPerWindow: number;     // Max calls per window (default: 120)
  perToolLimits?: Record<string, number>;  // Override per tool
}

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  windowMs: 60_000,
  maxPerWindow: 120,
  perToolLimits: {
    validate_action: 200,       // High — called frequently
    architecture_query: 30,     // Low — LLM sampling is expensive
    score_snapshot: 10,         // Very low — write operation
  },
};
```

When a caller exceeds the rate limit, the server returns HTTP 429 with a `Retry-After` header. In `ci` and `production` modes, rate limit breaches are logged as audit events.

### 14.3 Merge Gating — The Hard Enforcement Boundary

The most critical lesson from real-world governance: **enforcement that depends on agent cooperation is advisory, not deterministic.** An agent that ignores `AGENTS.md`, one that's never configured with the Red Queen MCP server, or one that simply doesn't call `validate_action` faces zero enforcement if the only enforcement point is inside the agent's own tool calls.

The Red Queen solves this with a **CI-level hard gate** — a GitHub Actions workflow that runs independently of any agent, analyzes the PR diff against CALM constraints, and sets a **required status check** that blocks merge on violations.

#### 14.3.1 The Three-Layer Enforcement Model

```
Layer 1: PreToolUse Hooks (Fast Feedback — Milliseconds)
  Both agents: hooks intercept Edit/Write/Bash calls → validate against CALM
  Claude Code: .claude/settings.json PreToolUse → exit code 2 = deny
  Copilot:     .github/hooks/redqueen.json preToolUse → JSON deny response
  Same validation logic, same constraints, same enforcement — both agents
  Advisory — agent gets immediate feedback, can retry with corrected approach

Layer 2: Agent-Called Tools (Rich Feedback — Seconds)
  Agent calls validate_action proactively per AGENTS.md instructions
  Receives detailed reasons, conditions, recommendations
  Advisory — but informative enough that compliant agents self-correct

Layer 3: CI Required Status Check (Hard Gate — Minutes)
  redqueen-action runs on every pull_request event
  Independently analyzes PR diff against CALM model
  Required status check in branch protection rules
  DETERMINISTIC — merge is blocked regardless of agent cooperation
```

Layers 1 and 2 optimize the developer/agent experience by catching issues early. Layer 3 is the **only true enforcement boundary** — the line that cannot be crossed. With hooks now supported by both Claude Code Action and Copilot coding agent, **all three layers apply to both agents** — there is no enforcement asymmetry.

#### 14.3.2 `redqueen-action` GitHub Action

```yaml
# .github/workflows/redqueen-gate.yml
name: Red Queen Governance Gate
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  governance-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for diff analysis

      - name: Checkout governance mesh
        uses: actions/checkout@v4
        with:
          repository: ${{ github.repository_owner }}/governance-mesh
          path: governance-mesh
          token: ${{ secrets.MESH_TOKEN }}

      - name: Red Queen Governance Validation
        uses: maintainabilityai/redqueen-action@v1
        with:
          mesh_path: governance-mesh
          bar_id: ${{ vars.BAR_ID }}
          base_ref: ${{ github.event.pull_request.base.sha }}
          head_ref: ${{ github.event.pull_request.head.sha }}
          enforcement_mode: strict  # strict | advisory
          fail_on: error            # error | warning
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The action performs the following independent validation (no agent cooperation required):

1. **Diff analysis**: Computes the PR diff and classifies changed files by risk tier (see Section 4.6)
2. **CALM constraint validation**: Checks whether new connections, services, or dependencies introduced in the diff violate CALM flow or relationship declarations
3. **Interface contract validation**: For cross-repo changes, validates that modified endpoints/schemas still conform to declared interface contracts
4. **Control adherence check**: Verifies that changes to security-sensitive code (auth, crypto, data access) maintain compliance with declared CALM controls
5. **Schema diff validation**: If machine-checkable contract artifacts exist (OpenAPI, protobuf — see Section 4.5.1), validates the schema diff against the declared contract
6. **Score impact projection**: Estimates the governance score delta if the PR merges

The action posts results as a PR check with detailed findings:

```
Red Queen Governance Gate: ❌ Failed (2 errors, 1 warning)

Errors:
  ❌ CALM-FLOW-001: New connection src/api/directDb.ts:42 creates
     web-ui → user-database connection not declared in any CALM relationship.
     Expected path: web-ui → api-server → user-database (movie-search-flow)

  ❌ CTRL-AUTH-002: New endpoint src/routes/export.ts:15 lacks
     authentication middleware. Control ctrl-auth-001 requires OAuth2
     on all endpoints (NIST AC-3).

Warnings:
  ⚠️ IFACE-001: Modified response schema in src/api/users.ts:88 may
     affect interface user-api-v2 consumed by frontend-app.
     Run validate_interface_contract for confirmation.

Score Impact: 72% → 68% (projected -4 points)
```

#### 14.3.3 Branch Protection Configuration

For governed repositories, branch protection rules must include:

```
Required status checks:
  ✅ Red Queen Governance Gate  (required)
  ✅ CI Tests                   (required)
  ✅ CodeQL Security Scan       (required)

Required reviewers:
  - Determined by Red Queen tier:
    - Autonomous: 1 reviewer (can be agent)
    - Supervised: 1 reviewer (must be human)
    - Restricted: 2 reviewers (1 agent + 1 human)

Restrict pushes:
  - No direct pushes to main/protected branches
  - All changes via PR (ensures governance gate runs)
```

The ScaffoldPanel (Section 11.2.2) configures these branch protection rules automatically when scaffolding a governed repository, using the GitHub API.

#### 14.3.4 Relationship to Agent-Called Validation

Layer 3 (CI gate) does **not** replace Layers 1 and 2 — it complements them:

| Aspect | Layers 1-2 (Agent) | Layer 3 (CI Gate) |
|--------|-------------------|-------------------|
| **Timing** | During development | At PR creation/update |
| **Feedback quality** | Rich (reasons, conditions, alternatives) | Binary (pass/fail with findings) |
| **Agent cooperation** | Required | Not required |
| **Enforcement** | Advisory | Deterministic |
| **Bypass resistance** | Agent can ignore | Cannot be bypassed (branch protection) |
| **Coverage** | Only agents that call tools | All PRs regardless of author |

The ideal flow: Layer 1 catches issues in milliseconds → Layer 2 provides detailed guidance → the PR arrives at Layer 3 already clean. Layer 3 is the safety net, not the primary feedback mechanism.

#### 14.3.5 Break-Glass Procedure

A hard gate that cannot be overridden is a liability during incidents. The Red Queen defines a **controlled override mechanism** with full audit trail:

```typescript
interface BreakGlassOverride {
  pr: number;
  overriddenBy: string;        // GitHub username
  reason: 'incident' | 'hotfix' | 'false_positive' | 'other';
  justification: string;       // Free-text explanation (required)
  approvedBy: string[];        // Must include at least 1 CODEOWNER
  expiresAt: string;           // ISO 8601 — max 24 hours from creation
  violations: string[];        // Which specific checks are being overridden
  ticketRef?: string;          // Link to incident ticket (required for 'incident')
}
```

**Override Process:**

1. **Request:** Developer runs `gh workflow dispatch redqueen-break-glass.yml` with reason and justification
2. **Approval:** At least one CODEOWNER must approve via GitHub review (cannot self-approve)
3. **Time-limited bypass:** The override creates a temporary branch protection exception lasting **max 24 hours**
4. **Scoped:** The override applies only to the specific PR and the specific violations listed — all other checks remain enforced
5. **Audit:** The override is logged as a governance event and posted as a PR comment visible to all reviewers
6. **Follow-up required:** A follow-up issue is automatically created with label `governance:break-glass` tracking remediation of the overridden violations

```yaml
# .github/workflows/redqueen-break-glass.yml
name: Red Queen Break-Glass Override
on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to override'
        required: true
      reason:
        description: 'Override reason'
        required: true
        type: choice
        options: [incident, hotfix, false_positive, other]
      justification:
        description: 'Why this override is necessary'
        required: true
      ticket_ref:
        description: 'Incident ticket URL (required for incident reason)'
        required: false
```

**Guardrails on the override itself:**
- Cannot override if governance score is below `criticalThreshold` (default: 30%) — these BARs need remediation, not bypasses
- Maximum 3 active break-glass overrides per BAR at any time
- Overrides are tracked in governance score decay (see Section 10.4) — frequent overrides accelerate score decay
- Monthly break-glass report surfaces override patterns to platform architects

**Anti-Normalization Controls:**

Break-glass exists for genuine emergencies. Without active controls, it silently becomes the "normal path" — governance theater. The Red Queen prevents normalization through:

1. **Escalating friction:** Each successive break-glass for the same BAR within a 30-day window requires one additional CODEOWNER approver (1st override: 1 approver, 2nd: 2, 3rd: 3). The 4th triggers automatic escalation to the architecture review board.

2. **Break-glass budget:** Each BAR has a configurable `breakGlassBudget` per quarter (default: 3). Exceeding the budget triggers:
   - Automatic tier downgrade (e.g., supervised → restricted) until the next quarter
   - Platform architect notification with override history
   - Mandatory remediation plan (tracked as a GitHub Issue with `governance:remediation-required` label)

3. **Follow-up enforcement:** The auto-created follow-up issue from step 6 of the override process has a 14-day SLA. If not closed within 14 days, the BAR's governance score receives a -5 point penalty per week (additive to normal decay). This creates a hard incentive to remediate rather than "override and forget."

4. **Self-approve prevention:** The `overriddenBy` field is compared against the CODEOWNER list — the person requesting the override cannot be among the approvers. GitHub branch protection's "require review from Code Owners" enforces this at the platform level.

5. **Visibility:** All active break-glass overrides appear in the Looking Glass BAR detail as a red callout: "1 active break-glass override (expires in 18h) — PR #247: ctrl-auth-002 bypassed for hotfix." Platform-level dashboard aggregates override frequency across all BARs.

```typescript
interface BreakGlassBudget {
  perQuarter: number;                  // Default: 3
  currentUsage: number;
  escalationThreshold: number;         // Triggers arch board review (default: 4 in 30 days)
  followUpSlaDays: number;             // Default: 14
  penaltyPerWeekOverdue: number;       // Default: 5 points
}
```

### 14.4 Data Access Control

| Resource | Sensitivity | Access Policy |
|----------|------------|---------------|
| Portfolio/platform summaries | Low | Open read |
| CALM architecture | Medium | Open read (architecture is documentation) |
| Governance scores | Medium | Open read |
| Threat models | **Variable** | **Tier-based** (see below) |
| Controls / ADRs | Medium | Open read |
| Prompt packs | Low | Open read |
| validate_action (write) | Low | Available to any authenticated caller |
| score_snapshot (write) | Low | Requires explicit user approval |

#### 14.4.1 Threat Model Access Tiers

Threat models contain attack surfaces, risk ratings, and mitigation gaps — information that could aid an attacker if leaked. Access is configurable per BAR based on criticality:

```typescript
interface ThreatModelAccessPolicy {
  // Configured per BAR in mesh.yaml under security.threat_model_access
  tier: 'open' | 'summary' | 'restricted';
}
```

| Access Tier | Who Can Read | What They See | Use When |
|-------------|-------------|---------------|----------|
| `open` | Any authenticated caller | Full threat model YAML | Internal tools, low-criticality BARs |
| `summary` | Any authenticated caller | Risk ratings + mitigated controls only (attack vectors redacted) | Default for most BARs |
| `restricted` | Callers with `REDQUEEN_THREAT_MODEL_TOKEN` | Full threat model YAML | High-criticality BARs (PII, payments, auth) |

**Default:** `summary` — agents see enough to validate controls without exposing attack surface details.

**Configuration in mesh.yaml:**
```yaml
bars:
  payment-service:
    criticality: high
    security:
      threat_model_access: restricted
  movie-search:
    criticality: medium
    security:
      threat_model_access: summary  # default
  internal-tools:
    criticality: low
    security:
      threat_model_access: open
```

When an agent calls `get_bar_context` for a BAR with `summary` access, the returned threat model replaces attack vector details with references to control IDs: _"Mitigated by ctrl-auth-001, ctrl-crypto-002"_ — enough for governance validation without exposing the how-to-attack narrative.

> **Decision D9 (revised):** Most governance mesh data is documentation, not secrets. However, threat models are an exception — they describe attack surfaces and should be access-controlled by BAR criticality. API keys and credentials must never be stored in mesh files. Write operations require user confirmation.

### 14.5 Configuration Integrity Validation

Copilot coding agent's MCP server configuration lives in the GitHub Repo Settings UI (JSON, not committed to the repository). Someone could modify or remove the MCP server configuration without a PR or audit trail, silently disabling governance for Copilot. Claude Code Action's `.mcp.json` is committed to the repo and protected by branch protection rules, but even committed config can drift.

The Red Queen maintains a canonical configuration manifest for each governed repository, validated at three enforcement points.

#### 14.5.1 Configuration Manifest

During repository scaffolding, the Red Queen generates a `.redqueen/config-manifest.yaml` file committed to the repository:

```yaml
# .redqueen/config-manifest.yaml
# Generated by Red Queen scaffold — do not edit manually
version: 1
generated: "2026-03-02T14:30:00Z"
fingerprints:
  claude:
    source: ".mcp.json"
    sha256: "a1b2c3d4..."
    expected:
      server_name: "redqueen"
      required_tools:
        - validate_action
        - get_bar_context
        - get_constraints
  copilot:
    source: "repo-settings/mcp"
    sha256: "e5f6a7b8..."
    expected:
      server_name: "redqueen"
      required_tools:
        - validate_action
        - get_bar_context
        - get_constraints
  hooks:
    claude_source: ".claude/settings.json"
    copilot_source: ".github/hooks/redqueen.json"
    claude_sha256: "c9d0e1f2..."
    copilot_sha256: "d3e4f5a6..."
```

The fingerprint covers the MCP server name, URL/command, required tools, and required environment variable names (not values).

#### 14.5.2 Validation Points

**Layer 1 — Hook `sessionStart` (Advisory):**

The preToolUse hook (for both agents) performs a fast config check on session start. The hook computes a SHA-256 hash of the current `.mcp.json` (for Claude) and compares it to the expected fingerprint in the manifest. On mismatch, the hook outputs a warning but does not block — Layer 1 is advisory for config drift.

**Layer 3 — CI Gate (Hard Enforcement):**

The `redqueen-action` CI gate performs hard validation:
- **Claude Code Action:** hashes `.mcp.json` in the PR branch and compares to the manifest. A mismatch blocks the merge.
- **Copilot:** uses the GitHub API (`gh api repos/{owner}/{repo}/copilot/mcp-servers`) to read the current MCP server configuration from Repo Settings and compares to the manifest. Configuration modified outside of a PR fails with:

> Governance configuration drift detected: Copilot MCP server configuration in Repo Settings does not match `.redqueen/config-manifest.yaml`. Expected fingerprint: `abc123...` Current fingerprint: `def456...` Run `npx redqueen scaffold --repo <name>` to reconcile.

**Scheduled — Weekly Drift Detection:**

A scheduled GitHub Actions workflow runs weekly, computes the current config fingerprint for both agents, and compares to the manifest. On drift, it opens an issue assigned to CODEOWNERS with the `governance:config-drift` label.

```yaml
# .github/workflows/redqueen-config-check.yml
name: Red Queen Config Drift Check
on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9 AM UTC
  workflow_dispatch: {}

jobs:
  check-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: maintainabilityai/redqueen-action@v1
        with:
          mode: config-check
          manifest: .redqueen/config-manifest.yaml
```

---

## 15. Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Unified The Grin into The Red Queen as a single system | The Grin (MCP data layer) and Red Queen (enforcement + orchestration) are inseparable in practice. Every MCP tool call goes through governance enforcement. A single design eliminates coordination complexity. |
| D2 | ~~NeMo Guardrails~~ TypeScript policy engine for deterministic enforcement, not LLM prompts | Prompts are advisory — agents can ignore them. The Red Queen's Court evaluates policy rules deterministically. A `validate_action` call returns a deterministic verdict regardless of which LLM invoked it. (v0.8.0: NeMo replaced with in-process TypeScript engine — simpler, no Python sidecar.) |
| D3 | MCP tools as universal control plane for agent-agnostic governance | Copilot coding agent only supports MCP tools (not resources or prompts). By exposing all enforcement through tools, both Claude Code and Copilot receive identical governance. |
| D4 | CALM flows + interfaces as cross-repo governance contracts | CALM already models service relationships, transitions, and interfaces. Using this existing structure as governance contracts avoids inventing a new schema and ensures architecture models and governance rules are always in sync. |
| D5 | `copilot-setup-steps.yml` + repo Settings UI for Copilot agent MCP | Copilot agent doesn't read committed MCP config files. The environment setup step starts the Red Queen server; the Settings UI points to it. This is the only pattern GitHub currently supports. |
| D6 | ~~NeMo runs as a sidecar process~~ Policy engine runs in-process | ~~NeMo Guardrails is a Python package.~~ STRUCK (v0.8.0): Policy engine is pure TypeScript, runs in the same Node.js process as the MCP server. No sidecar, no HTTP, no Python dependency. |
| D7 | Three-layer enforcement: hooks → agent tools → CI gate | **Layer 1 (Fast feedback):** Claude Code `PreToolUse` hooks intercept `Edit`/`Write` calls and validate against CALM constraints in milliseconds — the agent gets immediate feedback before writing code. **Layer 2 (Rich feedback):** Agents call `validate_action` proactively (instructed via AGENTS.md) for detailed reasons, conditions, and recommendations they can act on. **Layer 3 (Hard gate):** `redqueen-action` GitHub Action runs independently on every PR as a **required status check** in branch protection — merge is blocked on governance violations regardless of whether the agent cooperated. Layers 1 and 2 are advisory (informative); Layer 3 is deterministic (the only true "hard enforcement boundary"). |
| D8 | Three permission tiers (autonomous/supervised/restricted) | Maps to the governance maturity curve. High-scoring BARs earn autonomy; low-scoring BARs get guardrails. Simple enough to understand, flexible enough via criticality multipliers. |
| D9 | All governance data is read-open (no per-resource ACL) | Governance mesh is documentation and scores, not secrets. Simplicity over complexity — YAGNI for per-resource authorization. |
| D10 | Cross-repo notifications via GitHub Issues | When a change in BAR A violates an interface contract with BAR B, the Red Queen creates an issue in BAR B's repo. This integrates with existing workflows — developers see it in their issue tracker. |
| D11 | Agent memory stored in governance mesh (`.caterpillar/agent-memory/`) | Agent memory is governance data — version-controlled alongside the mesh, not in individual repos. Enables portfolio-level learning across all BARs. |
| D12 | Policy suggestions are advisory, not auto-applied | Governance policy changes require human judgment. The Red Queen surfaces data-driven suggestions, but a human architect decides. |
| D13 | `architecture_query` uses MCP sampling for LLM reasoning | Avoids requiring a separate LLM API key on the server. The query + CALM model are sent as a sampling request to the client's LLM. |
| D14 | ~~Dynamic Colang 2.0 config~~ Static policy from CALM model per-BAR | ~~NeMo~~ STRUCK (v0.8.0): Each BAR's governance data generates a static `policy.json` during scaffold. The policy engine evaluates live CALM model data at Layer 2. This ensures policy rules always reflect the current architecture. |
| D15 | `AGENTS.md` as shared governance instructions | Both Claude Code and Copilot coding agent read `AGENTS.md`. This file instructs both agents to call `validate_action` before structural changes and `validate_interface_contract` for cross-repo changes. |
| D16 | Custom `calm://` URI scheme for all resources | Domain-specific URIs make resources self-describing. Follows EventCatalog's `eventcatalog://` pattern. |
| D17 | Three-level policy hierarchy (portfolio → platform → BAR) with tighten-only semantics | Platforms need governance authority over their BARs (shared infrastructure, minimum scores, tier caps), but cannot loosen portfolio-level rules. BAR overrides cannot loosen platform rules. This prevents governance erosion while allowing context-specific tightening. |
| D18 | Governance woven into Cheshire Cat UX, not a separate workflow | Users should not need a "governance mode" — governance context (tier badges, mandated packs, pre-submission summaries, policy event streams) appears naturally in every panel they already use. Reduces friction and ensures governance is never bypassed by simply not opening a governance panel. |
| D19 | Platform-level relationship discovery (4 mechanisms) | CALM flows are the strongest signal but not every BAR has CALM architecture. Supplementing with explicit `linkedBars`, capability overlap, and shared infrastructure declarations ensures cross-BAR governance works even for BARs at early governance maturity levels. |
| D20 | Three-layer enforcement model: hooks → agent tools → CI gate | Agent-called `validate_action` provides rich feedback but depends on agent cooperation. The CI gate (`redqueen-action` as a required status check) is the only true "hard enforcement boundary" — it runs independently of agent behavior and blocks merge on violations. Layers 1-2 optimize DX; Layer 3 ensures governance. |
| D21 | Machine-checkable contract artifacts for interface validation | Description-level string matching on change descriptions is best-effort, not deterministic. Extending CALM interfaces with `contractArtifact` references (OpenAPI, protobuf, AsyncAPI, GraphQL, JSON Schema) enables programmatic schema diffing — the only way to make "interface contract enforcement" truly machine-checkable. |
| D22 | Governance score decay (trust battery model) | Scores without time-based decay create a false sense of governance health. A BAR reviewed 6 months ago is not as trustworthy as one reviewed yesterday. Decay is computed on read (not as a background job) and feeds into all orchestration decisions, ensuring stale BARs cannot maintain high-autonomy tiers indefinitely. |
| D23 | AST-based semantic diff analysis for risk classification | CALM graph traversal computes impact at the architecture level but cannot distinguish a comment edit from an authentication logic change. Tree-sitter AST parsing classifies changes by risk tier (cosmetic → critical), enabling proportionate governance: lightweight checks for low-risk changes, full validation + mandatory human review for critical changes. |
| D24 | Critical failure score reset | Gradual decay handles staleness; critical failures (CVE in dependency, merged code that bypassed guardrails, production interface violation) require immediate score impact. This mimics the "trust battery" concept — trust accumulates slowly but can be lost quickly. |
| D25 | ~~"Minimal infrastructure" not "zero infrastructure"~~ True zero infrastructure | The Red Queen's Node.js MCP server is truly zero-infra (reads files, no database). With NeMo struck (v0.8.0), there is no sidecar — the policy engine runs in-process as pure TypeScript. Single process, zero dependencies beyond Node.js. |
| D26 | Fail-closed HTTP auth in CI/production | In `local` mode, missing `REDQUEEN_AUTH_TOKEN` is permissive (developer convenience). In `ci` or `production` mode, the server **refuses to start** without a token. This prevents accidental unauthenticated deployments. Constant-time token comparison (`timingSafeEqual`) prevents timing attacks. |
| D27 | Threat model access controlled by BAR criticality tier | Blanket "open read" for threat models risks leaking attack surface details. Three tiers (`open`/`summary`/`restricted`) let platform architects match access to BAR sensitivity. Default `summary` gives agents enough for governance validation (risk ratings + control IDs) without exposing attack vectors. |
| D28 | Break-glass override with scoped, time-limited bypass | A hard gate without an escape hatch is a liability during incidents. The break-glass procedure requires CODEOWNER approval, is scoped to specific violations on a specific PR, expires in 24 hours, auto-creates follow-up issues, and feeds into score decay. This balances safety with operational reality. |
| D29 | Concrete artifact-to-constraint resolution in system prompts | Template placeholders like `{STRIDE summary}` are load-bearing — if they resolve to empty strings, governance constraints silently disappear from agent context. Each placeholder now specifies its source artifact, parsing function, access control rules, and fallback behavior. Resolution failures surface as visible warnings, not silent omissions. |
| D30 | Pinned, proven diff engines per contract artifact type | "Programmatic schema diffing" is only robust if the breaking change rules are well-defined and reproducible. Each artifact type maps to a specific engine (`oasdiff` for OpenAPI, `buf` for protobuf, `graphql-inspector` for GraphQL, etc.) with pinned versions and documented rulesets. False-positive suppression is per-BAR via engine-native config files, not custom logic. |
| D31 | Audit trail integrity via correlation IDs and append-only storage | Audit events include `correlationId` (SHA-256 of key fields), `prNumber`, `commitSha`, and `workflowRunId` for full traceability. The Red Queen emits events; the organization's observability stack stores them. For CI, GitHub Actions log immutability provides tamper-evidence. For production, append-only storage (S3 Object Lock, immutable archives) is recommended. |
| D32 | Break-glass anti-normalization via escalating friction and budgets | Without active controls, break-glass becomes the normal path. Escalating CODEOWNER requirements per successive override, quarterly budgets with automatic tier downgrade on exhaustion, 14-day follow-up SLAs with score penalties, and self-approve prevention ensure break-glass remains the exception. |
| D33 | Copilot hooks parity enables symmetric Layer 1 enforcement | Copilot coding agent now supports preToolUse hooks via `.github/hooks/*.json`. The Red Queen scaffolds hooks for both agents calling the same validation logic, eliminating the enforcement asymmetry between Claude Code and Copilot. All three layers now apply to both agents. |
| D34 | stdio transport as primary MCP deployment model in CI | Both agents spawn MCP servers as local stdio child processes within the GitHub Actions runner. No network dependency, no separate SLA, no cold start. HTTP transport applies to VS Code Extension integration and future remote deployments, not the primary CI use case. |
| D35 | Configuration fingerprinting for MCP drift detection | Copilot's MCP config lives in Repo Settings UI (not committed). SHA-256 fingerprints in `.redqueen/config-manifest.yaml` detect drift at three points: sessionStart hooks (advisory), CI gate (hard enforcement), and weekly scheduled checks (proactive). Reconciliation via `npx redqueen scaffold --repo`. |
| D36 | Severity-weighted consensus for multi-agent review boards | Any deny is a deny — union of concerns, not majority vote. Highest severity from any reviewer becomes the combined verdict. Disagreements are surfaced transparently in PR comments with both opinions visible. Break-glass provides the release valve for false positives. |
| D37 | Tree-sitter for AST-based language coverage with grammar extensibility | TypeScript/JavaScript and Python first (widest blast radius). Teams register additional tree-sitter grammars via `.redqueen/config-manifest.yaml`. Unsupported languages default to "structural" risk tier with regex fallback against critical patterns. |

---

## 16. Implementation Phases

### Phase 1: Core MCP Server + Resources (The Grin Data Layer) ✅

- [x] Set up `src/mcp/` module structure
- [x] Implement `server.ts` with `McpServer` initialization and stdio transport
- [x] Implement `mesh-reader.ts` (VS Code-free, in `src/core/`)
- [x] Register 11 resources (4 static + 7 templates) with URI templates
- [x] Configure esbuild to produce `dist/mcp-server.js`
- [x] Implement 10 query tools with Zod validation
- [x] Refactor `MeshService` to delegate reads to `MeshReader` (no duplicate code)
- [x] Unit tests (14) + integration tests (13) — 27/27 passing
- [ ] Register `mcpServerDefinitionProviders` in `package.json`
- [ ] Implement VS Code extension host registration

**Value:** Agents can discover and read all governance mesh data.

### Phase 2: Query + Analysis Tools + Config Scaffolding ✅

- [x] Implement T1 `find_bars` — search with filters (name, platform, criticality, score range, status)
- [x] Implement T2 `get_bar_context` — comprehensive BAR context bundle in one call
- [x] Implement T4 `governance_gaps` — missing artifacts, weak scores, quality issues
- [x] Implement T6 `compare_bars` — side-by-side pillar comparison
- [x] Implement T8 `validate_calm` — structural validation of CALM architecture
- [x] Implement `get_adrs` — read all ADRs for a BAR
- [x] Add ADRs and flows resources (`calm://bar/{name}/adrs`, `calm://bar/{name}/flows`)
- [x] Add MCP prompt templates (P1-P4): architecture-review, remediation-plan, threat-assessment, adr-proposal
- [x] Implement `scaffold_agent_config` — generate .mcp.json, .claude/settings.json, AGENTS.md, hooks for a BAR
- [x] Implement `get_permission_tier` — query tier with reasoning
- [x] Implement `--scaffold` CLI mode with `--output` for file writing
- [x] Config manifest with SHA-256 fingerprints for drift detection
- [x] Tier-based agent permissions (autonomous/supervised/restricted)
- [x] Copilot governance setup steps generation from mesh org
- [x] Unit tests (33) + integration tests (33) — 66/66 passing

**Deferred to later phases:**
- T3 `blast_radius` → Phase 4 ✅ (implemented as T12 `blast_radius` with platform-level cross-BAR analysis)
- T7 `score_snapshot` → Phase 7 (write operation, part of feedback loop)
- T12 `flow_impact` / T13 `get_orchestration_decision` → Repurposed in Phase 4: T11 `get_platform_architecture`, T12 `blast_radius`, T13 `validate_platform_calm`
- AST-based semantic diff → Phase 8 CI gate (tree-sitter analysis belongs in `redqueen-action`)
- Risk classification in `blast_radius` → Phase 5 (requires orchestration policy context)

**Struck — will not implement (local-only architecture, no remote dependency):**
- ~~HTTP transport (`mcp-server-http.js`)~~ — stdio covers CI (GitHub Actions), local dev, and Codespaces. Agents clone the mesh and run MCP locally. No remote server.
- ~~Bearer token authentication~~ — no HTTP means no network auth needed. Runner process isolation is sufficient.
- ~~`REDQUEEN_ENV` detection (`local`/`ci`/`production`)~~ — single local mode only.
- ~~Per-tool rate limiting~~ — no shared server to protect. Each agent gets its own MCP process.
- ~~T5 `architecture_query` (natural language)~~ — requires LLM routing; agents already have LLM access and can query CALM data directly via existing tools.

**Kept but moved:**
- Audit logging → Phase 7 (feedback loop, useful but not blocking)
- Correlation fields → Phase 7 (same rationale)

**Value:** Agents can query all governance intelligence, scaffold agent configs from the mesh (single source of truth), and compute governance gaps. Config scaffolding enables "update mesh once → re-scaffold to all repos" workflow.

### Phase 3: Policy Engine + Enforcement Hooks (The Red Queen's Court) ✅

- [x] Create `policy-engine.ts` — The Red Queen's Court (5 rule types: TIER, PATH, SEC, CALM, CTRL)
- [x] Implement `evaluate()` — two-layer policy evaluation (Layer 1: fast static, Layer 2: full CALM)
- [x] Implement `generateStaticPolicy()` — pre-computed rules for `.redqueen/policy.json`
- [x] Implement `buildConstraintsSummary()` — session-start constraint reporting
- [x] Implement T9 `validate_action` — full CALM-aware policy evaluation via MCP tool
- [x] Implement T10 `get_constraints` — tier, permissions, and constraints for agents
- [x] Upgrade `validate-tool.sh` → `validate-tool.js` — Node.js PreToolUse hook for Layer 1
- [x] Add `.redqueen/policy.json` to scaffold output
- [x] Update AGENTS.md template with `validate_action` and `get_constraints` references
- [x] Add `matchesPattern()` glob utility for file path matching
- [x] Unit tests: 20+ policy engine tests (tier rules, path rules, security rules, CALM flow, constraints)
- [x] Integration tests: 9 tests (validate_action approve/deny/CALM, get_constraints)
- [x] All 100 tests passing, build succeeds

**Value:** Deterministic governance enforcement via three layers: fast hooks (~50ms), rich agent tools (~200ms), and CI gate backstop (Phase 8). Pure TypeScript, no Python sidecar.

### Phase 4: Cross-Repo & Platform Governance ✅

- [x] Platform architecture support (`platform.arch.json`) — platform-level CALM model with nodes, relationships, and BAR linkage
- [x] Implement `readPlatformArchitecture()` in MeshReader — reads platform.arch.json from platform directory
- [x] Implement `validatePlatformCalm()` in MeshReader — structural validation of platform CALM (nodes, relationships, unique IDs)
- [x] Implement `findLinkedBars()` in MeshReader — discovers sibling BAR relationships and shared infrastructure from platform architecture
- [x] Implement T11 `get_platform_architecture` — read platform-level CALM model with cross-BAR relationships
- [x] Implement T12 `blast_radius` — cross-BAR impact analysis (linked BARs, shared infrastructure, impact level computation)
- [x] Implement T13 `validate_platform_calm` — validate platform-level CALM architecture structure
- [x] Extend `get_bar_context` (T2) with `linkedBars` — platform architecture and linked BAR metadata included in BAR context bundle
- [x] Implement PLAT-001 cross-BAR policy rule — warns when modifying interfaces or data flows on nodes shared across BARs
- [x] CalmAdapter `calmPlatformToReactFlow()` — platform view with BarNode and SharedInfraNode rendering
- [x] BarNode and SharedInfraNode React components — custom ReactFlow nodes for platform architecture visualization
- [x] NodePalette platform items — draggable platform-specific node types
- [x] LookingGlassPanel platform architecture handlers — `requestPlatformArch` and `savePlatformArch` message handlers
- [x] Platform architecture data flow through `validate_action` evaluation context (`platformCalmModel`)
- [x] Unit tests: MeshReader platform methods (readPlatformArchitecture, validatePlatformCalm, findLinkedBars, PLAT-001)
- [x] Integration tests: get_platform_architecture, blast_radius, validate_platform_calm tools
- [x] All 122 tests passing, build succeeds

**Deferred to later phases:**
- Machine-checkable contract artifact validation (OpenAPI, protobuf, GraphQL, AsyncAPI diff) → Phase 8 CI gate
- Cross-repo notification system (GitHub Issues) → Phase 5 (orchestration)
- Risk classification in `blast_radius` → Phase 5 (requires orchestration policy context)
- Per-BAR false-positive suppression files for diff engines → Phase 8
- CI edge cases (generated specs, multi-file `$ref`, monorepo multi-spec) → Phase 8

**Value:** Platform-level architectural awareness across BARs. Agents see cross-BAR relationships, shared infrastructure, and blast radius before making changes. PLAT-001 policy rule provides deterministic enforcement for shared-node modifications. Platform CALM visualization in Looking Glass enables architectural governance at the platform level.

### Phase 5: Policy Engine + Agent Configuration ✅

- [x] Define `OrchestrationPolicy` types in `src/types/redqueen.ts` — `OrchestrationPolicy`, `TierConfig`, `PermissionConfig`, `ReviewConfig`, `PromptInjectionConfig`, `CriticalityConfig`, `EscalationConfig`, `OrchestrationDecision`, `PlatformGovernancePolicy`
- [x] Implement `RedQueenService` (`src/services/RedQueenService.ts`) — stateless, no vscode imports, usable from extension host and MCP server
- [x] Implement `loadPolicy()` — parse `orchestration:` block from mesh.yaml via regex, falls back to `DEFAULT_POLICY`
- [x] Implement `loadPlatformPolicy()` — parse `governance:` block from platform.yaml
- [x] Implement `evaluatePolicy()` — criticality boost → tier thresholds → pillar < 50 override → prompt injection → threat access → reasoning audit trail
- [x] Implement threat model access tiers (`open`/`summary`/`restricted`) per tier config
- [x] Implement `applyPlatformOverrides()` — platform `minTier` cap (can only restrict, never relax), minimum pillar scores, shared infrastructure constraints, cross-BAR topology from `platform.arch.json`
- [x] Implement `generateGovernanceContext()` — `.redqueen/governance-context.md` with identity, tier, constraints, cross-BAR deps, threat access, audit trail
- [x] Implement `generateSettings()` — `.claude/settings.json` with tier-based permissions and hooks
- [x] Implement `generateAgentsMd()` — AGENTS.md with tier info, prompt packs, governance tiers table
- [x] Upgrade `config-scaffold.ts` — optional `RedQueenService` param, governance-context.md in output, `OrchestrationDecision` in `ScaffoldResult`
- [x] Add `get_orchestration_decision` MCP tool (T14, tool count 23 → 24) — full decision with tier, permissions, prompt injections, threat access, reasoning
- [x] Add Red Queen tier badge to Looking Glass BAR detail (`computeDisplayTier()` — green/yellow/red)
- [x] Add orchestration policy editor to Looking Glass Settings — editable tier thresholds, prompt injection thresholds, escalation config with Load/Save/Reset to Defaults
- [x] Add platform governance editor — modal overlay from pencil icon on platform cards, editable minimum pillar scores, min tier, enforcement mode with Save/Reset to Defaults
- [x] Add message types to `webview.ts` — 8 new messages for orchestration/governance editors
- [x] Data-driven tests (`redqueen-service.test.ts`) — 38 tests reading fixture YAML for expected values
- [x] Integration tests — 5 new tests (tool count 24, orchestration decision, governance-context.md in scaffold)
- [x] All 165 tests passing, build clean

**Deferred to later phases:**
- Cross-repo notification system (GitHub Issues) → Phase 8
- Risk classification in `blast_radius` → needs orchestration context but deferred until needed

**Pulled forward from Phase 6:**
- ~~Editable orchestration policy UI~~ — implemented as part of Phase 5 (Settings editor + platform governance modal)

**Value:** Every agent interaction receives governance-appropriate configuration based on scores, criticality, platform membership, and policy. Two-layer policy (mesh + platform) with UI editors enables governance teams to tune thresholds without editing YAML.

### Phase 6: Cheshire Cat Governance UX Integration ✅ (Complete)

- [x] Governance Bridge: `governanceBridge.ts` reads `.redqueen/decision.json`; `config-scaffold.ts` writes `decision.json` during scaffold
- [x] White Rabbit pre-flight: tier-based banners (green/yellow/red) with pillar mini-scores and constraint tags in BAR detail component picker
- [x] ScaffoldPanel governance injection: governance checkbox in file grid + `scaffoldAgentConfig()` for both component-mode and standalone scaffolds
- [x] Rabbit Hole governance-aware feature creation: governance posture table, mandated prompt packs (🔒 checked+disabled), pre-submission governance summary panel
- [x] Rabbit Hole agent selection constraints by tier (restricted → primary agent only, supervised → reviewer auto-assigned, human approval notice)
- [x] Scorecard governance section: tier badge, pillar scores, constraints + "Resync from Mesh" button to re-pull governance files from mesh
- [x] Looking Glass cross-BAR dependency panel with linked BAR table (relationship, score, tier badge) — clickable rows navigate via `drillIntoBar`
- [x] Looking Glass platform context panel with sibling BAR health and platform policy overrides — clickable sibling rows
- [x] Auto-detect BAR from repo URL: `findBarForRepoUrl()` scans `app.yaml` repos lists across mesh
- [x] Scorecard auto-detect: "Deploy Governance Files" one-click button when repo matches BAR but no `decision.json` exists
- [x] Looking Glass "Deploy Gov" button on linked repo rows — deploys Red Queen files to open workspace repos

**Deferred to Phase 7:**
- Score delta display (needs delta computation + persistence)
- Agent performance summary (needs tracking infrastructure)
- Policy engine event stream / validate_action call log / denial alerts (needs audit logging)

**Pulled forward to Phase 5:**
- ~~Editable orchestration policy UI~~ — orchestration policy editor in Settings + platform governance modal with pencil icon (done in Phase 5)

**Value:** Governance is woven into every Cheshire Cat panel. Users see governance posture at every step — from BAR exploration to feature creation to agent monitoring.

### Phase 7: Step-Based Review Board + Feedback Loop + Score Decay ✅ (Complete)

**Review Board** — Agent-agnostic, step-based PR review (Section 9):
- [x] Create `redqueen-review.yml` workflow template — `generateRedQueenReviewWorkflow()` generates parameterized workflow for `agent-type: claude | copilot | both`
- [x] Implement `determine review depth` step — tier-based review depth (autonomous=skip, supervised=security, restricted=security+architecture)
- [x] Implement security review step prompt — OWASP, STRIDE, CALM controls, structured `ReviewVerdict` JSON output (inline template in `config-scaffold.ts`)
- [x] Implement architecture review step prompt — CALM conformance, ADR compliance, cross-BAR interfaces (inline template in `config-scaffold.ts`)
- [x] Implement consensus resolution (`resolveConsensus()` in `consensus.ts`)
  - [x] Parse `ReviewVerdict` JSON — deterministic merge by finding id, severity promotion
  - [x] Implement `resolveConsensus()` — any-flag-escalates (default), unanimous, majority rules
  - [x] Self-contained consensus script (`generateConsensusScript()`) scaffolded as `.redqueen/consensus.js`
  - [x] Caveat deduplication, human review flagging on critical findings
- [x] Generate role-specific subagent definitions (`.claude/agents/security-reviewer.md`, `architecture-reviewer.md`)
- [x] Add `agent-type` configuration to mesh.yaml (`agent_type: claude | copilot | both`) with Looking Glass Settings editor
- [x] Scaffold `redqueen-review.yml` + subagent definitions + consensus script during "Deploy Gov" via `scaffoldAgentConfig()`
- [x] Implement `assembleReviewBoard()` in `RedQueenService` — tier-based step assembly with agent-type doubling for "both"

**Feedback Loop** — Score evolution and audit logging:
- [x] Implement T7 `score_snapshot` MCP tool — trigger governance score snapshot with delta computation (tool count 24 → 25)
- [x] Add audit logging (`audit-logger.ts`) — `createAuditEntry()`, `appendAuditLog()`, `readAuditLog()` (JSONL format)
- [x] Add correlation fields to audit entries (`correlationId`, `prNumber`, `commitSha`, `workflowRunId`)
- [x] Implement score delta computation (`computeScoreDelta()`) — composite + per-pillar deltas with trigger tracking

**Score Decay** — Time-based governance health (trust battery):
- [x] Implement score decay model (`score-decay.ts`) — compute-on-read exponential decay with `GovernanceTimestamps`
- [x] `computeDecayedScore()` — grace window (14d), exponential decay (half-life 90d), min score floor
- [x] `computeDecayedPillarScores()` — applies decay to all four governance pillars
- [x] Add decay visualization to Looking Glass BAR detail — `renderDecayIndicator()` shows raw→decayed score, days since assessment, tier impact badge
- [x] Integrate decayed scores into `evaluatePolicy()` — optional `timestamps` parameter, decay reasoning in audit trail, backward-compatible
- [x] All 215 tests passing, build clean

**Deferred to later phases:**
- Agent memory read/write → Phase 9+
- Policy suggestion engine → Phase 9+
- Critical failure score reset logic → Phase 8 (with break-glass)

**Value:** Agent-agnostic PR review with step-based architecture — same workflow structure for Claude and Copilot teams, same MCP tools, deterministic consensus. Score decay ensures governance health reflects current reality. Continuous improvement via feedback loops.

**Testability note:** Phase 8 packages the MCP server as `@maintainabilityai/redqueen-mcp`. End-to-end testing is now possible: scaffold governance into a code repo, push to GitHub, create a PR, and verify the review workflow runs with consensus. Hard enforcement gate and break-glass override are deferred to Phase 9.

### Phase 8: CI/CD Deployment + Hard Enforcement ✅ (Complete — package + distribution)

**Package + Distribution:** ✅
- [x] Create `@maintainabilityai/redqueen-mcp` npm package (`packages/redqueen-mcp/`)
- [x] Create `copilot-setup-steps.yml` template (done in Phase 7, extended with hooks)
- [x] Create Claude Code Action implementation workflow template (`generateImplementationWorkflow()`)
- [x] Document configuration for all agent types (README.md Quick Start Guide)
- [x] Quick Start Guide for testing end-to-end PR review flow
- [x] npm publish GitHub workflow (`.github/workflows/npm-publish.yml`)
- [x] Build pipeline script (`scripts/prepare-npm-package.sh`, `prepare-npm` script)

**Scaffolding** (extends Phase 6+7 governance deployment): ✅
- [x] Scaffold `.mcp.json` and `AGENTS.md` into code repos via ScaffoldPanel (done in Phase 6)
- [x] Scaffold `.claude/settings.json` PreToolUse hooks — updated command to `.sh` (Section 7.6)
- [x] Scaffold `.github/hooks/redqueen.json` Copilot preToolUse hooks (`generateCopilotHooksJson()`)
- [x] Scaffold `.redqueen/hooks/validate-tool.sh` shared validation script (`generateValidateToolSh()`)
- [x] Scaffold `.redqueen/config-manifest.yaml` configuration fingerprints (done in Phase 6)
- [x] Scaffold `.github/workflows/redqueen-implement.yml` implementation workflow
- [x] ~~Scaffold `redqueen-review.yml` review workflow~~ — Done in Phase 7

**Hard Enforcement Gate** — deferred to Phase 9 — `redqueen-action` as required status check (Section 14.3):
- [ ] Create `maintainabilityai/redqueen-action` GitHub Action
  - [ ] Independent PR diff analysis against CALM constraints (no agent dependency)
  - [ ] AST-based risk classification via tree-sitter WASM (moved from Phase 2)
  - [ ] Schema-level contract artifact validation (OpenAPI, protobuf)
  - [ ] Structured PR check output with findings, severity, and score impact projection
- [ ] Create branch protection configuration templates (required checks, reviewer rules per tier)
- [ ] ScaffoldPanel auto-configures branch protection rules via GitHub API
- [ ] Implement scheduled config drift detection workflow (Section 14.5)

**Break-Glass** — deferred to Phase 9 (Section 14.3.5):
- [ ] Implement break-glass override workflow (`redqueen-break-glass.yml`)
- [ ] Implement CODEOWNER approval requirement and time-limited bypass (max 24h)
- [ ] Implement auto-creation of follow-up issues for overridden violations
- [ ] Integrate break-glass frequency into score decay model
- [ ] Implement break-glass anti-normalization: escalating CODEOWNER requirements, quarterly budgets, follow-up SLA enforcement, self-approve prevention
- [ ] Add break-glass budget tracking and automatic tier downgrade on exhaustion
- [ ] Add break-glass visibility to Looking Glass BAR detail and platform dashboard

**Value:** Zero-friction deployment with hard enforcement boundary. The CI gate ensures governance is enforced regardless of agent cooperation. Step-based review workflow works identically for Claude and Copilot teams. Break-glass provides controlled override with escalating accountability.

---

## 17. File Reference Summary

### Files Created (Actual)

| File | Purpose | Status |
|------|---------|--------|
| `src/core/mesh-reader.ts` | VS Code-free governance mesh reading layer | ✅ Phase 1 |
| `src/mcp/server.ts` | McpServer + stdio transport + `--scaffold` CLI mode | ✅ Phase 1-2 |
| `src/mcp/resources.ts` | 13 calm:// resources (4 static + 9 templates) | ✅ Phase 1-2 |
| `src/mcp/tools.ts` | 25 MCP tools (query, scaffold, policy, platform, orchestration, score_snapshot) | ✅ Phase 1-7 |
| `src/mcp/prompts.ts` | MCP prompt templates (P1-P4) | ✅ Phase 2 |
| `src/mcp/config-scaffold.ts` | Agent config generation (.mcp.json, settings, hooks, AGENTS.md) | ✅ Phase 2 |
| `src/mcp/__tests__/mesh-reader.test.ts` | 72 unit tests (mesh-reader, policy engine, platform methods) | ✅ |
| `src/mcp/__tests__/integration.test.ts` | 66 integration tests (all tools, resources, platform tools, orchestration, score_snapshot, scaffold review workflow, Copilot hooks, shell wrapper, implementation workflow) | ✅ |
| `src/mcp/__tests__/redqueen-service.test.ts` | 49 data-driven unit tests (policy loading, evaluation, overrides, generators, assembleReviewBoard, decay) | ✅ Phase 5-7 |
| `src/mcp/__tests__/phase7-utils.test.ts` | 32 unit tests (consensus resolution, score decay, audit logger) | ✅ Phase 7 |
| `src/mcp/__tests__/fixtures/test-mesh/` | Test mesh with 2 BARs, platform architecture, orchestration policy, platform governance | ✅ |
| `src/types/redqueen.ts` | Orchestration + Phase 7 type definitions (ReviewVerdict, Finding, ConsensusResult, DecayConfig, GovernanceTimestamps, etc.) | ✅ Phase 5-7 |
| `src/services/RedQueenService.ts` | Stateless orchestration engine — policy loading, evaluation, generators, assembleReviewBoard, decay integration, hook command `.sh` ref (Phase 8) | ✅ Phase 5-8 |
| `src/mcp/utils/score-decay.ts` | Score decay computation (trust battery model) — exponential decay, grace window, pillar decay | ✅ Phase 7 |
| `src/mcp/utils/consensus.ts` | Deterministic consensus resolution — `resolveConsensus()` with 3 rules, finding merge, severity promotion | ✅ Phase 7 |
| `src/mcp/utils/audit-logger.ts` | Structured audit logging — JSONL append-only, correlation fields, score delta computation | ✅ Phase 7 |
| `code-templates/agents/security-reviewer.md` | Security review subagent definition template | ✅ Phase 7 |
| `code-templates/agents/architecture-reviewer.md` | Architecture review subagent definition template | ✅ Phase 7 |
| `src/utils/governanceBridge.ts` | Read `.redqueen/decision.json` + `findBarForRepoUrl()` auto-detect BAR from repo URL | ✅ Phase 6 |
| `packages/redqueen-mcp/package.json` | npm package manifest with bin entry, files field, keywords | ✅ Phase 8 |
| `packages/redqueen-mcp/bin/redqueen-mcp.js` | CLI entry point (shebang + require) for `npx` usage | ✅ Phase 8 |
| `packages/redqueen-mcp/README.md` | Quick Start Guide — install, configure, MCP tools table, end-to-end testing | ✅ Phase 8 |
| `scripts/prepare-npm-package.sh` | Build + copy pipeline (esbuild → packages/redqueen-mcp/dist/) | ✅ Phase 8 |
| `.github/workflows/npm-publish.yml` | Automated npm publishing with auto-bump, `mcp-v*` tags, `[npm-publish]` guard | ✅ Phase 8 |

### Files Planned

| File | Purpose | Phase |
|------|---------|-------|
| ~~`src/mcp/tools/validation.ts`~~ | ~~NeMo-backed enforcement tools~~ — Replaced by `policy-engine.ts` + tools in `tools.ts` | ~~3~~ |
| ~~`src/mcp/tools/orchestration.ts`~~ | ~~Orchestration tools (T12-T13)~~ — T11-T13 implemented directly in `tools.ts` | ~~5~~ |
| ~~`src/mcp/tools/cross-repo.ts`~~ | ~~Cross-repo validation tools~~ — Platform tools implemented in `tools.ts`, discovery in `mesh-reader.ts` | ~~4~~ |
| ~~`src/mcp/guardrails/engine.ts`~~ | ~~NeMo Guardrails integration wrapper~~ — STRUCK (replaced by policy-engine.ts) | ~~3~~ |
| ~~`src/mcp/guardrails/config-builder.ts`~~ | ~~Dynamic Colang 2.0 config from CALM~~ — STRUCK | ~~3~~ |
| ~~`src/mcp/guardrails/rails/*.co`~~ | ~~Colang 2.0 rail definitions~~ — STRUCK | ~~3~~ |
| ~~`src/mcp/utils/cross-repo.ts`~~ | ~~Multi-repo flow resolution~~ — Implemented as `findLinkedBars()` in `mesh-reader.ts` | ~~4~~ |
| ~~`src/mcp/utils/platform-governance.ts`~~ | ~~Platform-level relationship discovery + policy enforcement~~ — Implemented as `readPlatformArchitecture()`, `validatePlatformCalm()` in `mesh-reader.ts` + PLAT-001 in `policy-engine.ts` | ~~4~~ |
| ~~`src/services/RedQueenService.ts`~~ | ~~Orchestration engine~~ — Implemented in Phase 5 (moved to Files Created) | ~~5~~ |
| ~~`src/types/redqueen.ts`~~ | ~~Red Queen types~~ — Implemented in Phase 5 (moved to Files Created) | ~~5~~ |
| `src/mcp/utils/semantic-diff.ts` | AST-based semantic diff analysis using tree-sitter |
| `src/mcp/utils/contract-validator.ts` | Machine-checkable contract artifact validation (OpenAPI, protobuf, etc.) |
| ~~`src/mcp/utils/score-decay.ts`~~ | ~~Score decay computation~~ — Implemented in Phase 7 (moved to Files Created) |
| `mcp-server.js` | Standalone stdio entry point |
| ~~`mcp-server-http.js`~~ | ~~Standalone HTTP entry point~~ — STRUCK (local-only architecture) |
| `.github/actions/redqueen-action/` | GitHub Action for CI governance gate (required status check) |
| `.github/workflows/redqueen-break-glass.yml` | Break-glass override workflow for merge gate bypass |
| ~~`src/mcp/utils/audit-logger.ts`~~ | ~~Structured audit logging~~ — Implemented in Phase 7 (moved to Files Created) |
| ~~`src/mcp/utils/rate-limiter.ts`~~ | ~~Per-tool rate limiting for HTTP transport~~ — STRUCK (local-only architecture) |
| `src/mcp/utils/threat-model-access.ts` | Tier-based threat model access control |

### Files Modified

| File | Change |
|------|--------|
| `package.json` | Add `mcpServerDefinitionProviders`, `@modelcontextprotocol/sdk` dependency |
| `extension.ts` | Register MCP server definition provider |
| `esbuild.js` | Add mcp-server entry point (stdio only) |
| `src/types/index.ts` | Re-export redqueen.ts types |
| `src/types/webview.ts` | Added 8 message types for orchestration/governance editors (Phase 5); `governanceData` + `barGovernanceContext` + `resyncGovernance` messages (Phase 6); `agentTypeLoaded/Saved`, `decayInfo` in `barDetail` (Phase 7) |
| `src/types/scorecard.ts` | Added `governanceTier` to `ComponentScaffoldContext` (Phase 6) |
| `src/mcp/config-scaffold.ts` | Optional `RedQueenService` param, governance-context.md generation (Phase 5); `decision.json` in scaffold output (Phase 6); `generateRedQueenReviewWorkflow()`, `generateConsensusScript()`, `generateSubagentDefinition()`, review workflow files in `scaffoldAgentConfig()` (Phase 7); `generateCopilotHooksJson()`, `generateValidateToolSh()`, `generateImplementationWorkflow()`, hook command `.js` → `.sh` (Phase 8) |
| `src/mcp/server.ts` | Instantiate `RedQueenService`, pass to `registerTools` (Phase 5) |
| `src/webview/LookingGlassPanel.ts` | Red Queen tier badge, cross-BAR dependency panel, platform context panel, policy editor, platform architecture handlers (`requestPlatformArch`, `savePlatformArch`), orchestration policy load/save, platform governance load/save (Phase 5); governance tier in `buildScaffoldDescription()`, `barGovernanceContext` with barPath/path for navigation, `onDeployGovernanceToRepo()` for linked repo governance deployment (Phase 6); agent type load/save, `decayInfo` computation in `onDrillIntoBar()` (Phase 7) |
| `src/webview/OracularPanel.ts` | Multi-agent review board, consensus UI, governance-configured review depth |
| `src/webview/IssueCreatorPanel.ts` | Governance-aware feature creation: `sendGovernanceData()` reads `decision.json`, posture table, mandated packs (🔒), pre-submission summary panel (Phase 6) |
| `src/webview/ScaffoldPanel.ts` | Governance checkbox in file grid, `scaffoldAgentConfig()` for component-mode and standalone scaffolds, governance step in progress UI (Phase 6) |
| `src/webview/app/lookingGlass.ts` | Cross-BAR dependency UI, platform health panel, tier badge popover, CalmAdapter platform view (`calmPlatformToReactFlow`), BarNode/SharedInfraNode React components, NodePalette platform items, orchestration policy editor, platform governance modal, reset buttons (Phase 5); barPath/path state for cross-BAR navigation (Phase 6) |
| `src/webview/app/views/barDetail.ts` | Tier badge + `computeDisplayTier()` in BAR detail header (Phase 5); pre-flight governance banner, cross-BAR dependency rendering, sibling BAR health, click handlers for `drillIntoBar` navigation, "Deploy Gov" button on linked repo rows (Phase 6); `renderDecayIndicator()` — raw→decayed score, days since assessment, tier impact badge (Phase 7) |
| `src/webview/app/views/portfolio.ts` | Pencil icon on platform cards, tier badge CSS (Phase 5) |
| `src/webview/app/main.ts` | Governance posture table in input phase, mandated pack locking (🔒 checked+disabled), governance summary in review phase, tier-based agent selection constraints in assign phase (Phase 6) |
| `src/webview/app/scorecard.ts` | Governance section with tier badge, pillar scores, constraints + "Resync from Mesh" button (Phase 6) |
| `src/webview/ScorecardPanel.ts` | `sendGovernanceData()` reads `decision.json`, `onResyncGovernance()` re-syncs governance files from mesh (Phase 6) |
| `src/services/MeshService.ts` | Read/write `orchestration` section in mesh.yaml + platform.yaml governance |

### Mesh Files (New)

| File | Purpose |
|------|---------|
| `mesh.yaml` → `orchestration:` | Portfolio-level orchestration + guardrails policy |
| `platform.yaml` → `governance:` | Platform-level minimum scores, shared infrastructure, cross-BAR review triggers, tier caps |
| `app.yaml` → `orchestration:` | Per-BAR policy overrides + linked BARs |
| `app.yaml` → `linkedBars:` | Cross-repo BAR linkages |
| `.caterpillar/agent-memory/{barId}.yaml` | Per-BAR agent learnings + rail effectiveness |
| `.caterpillar/agent-memory/portfolio.yaml` | Portfolio-level agent effectiveness |
| ~~`.caterpillar/.guardrails/`~~ | ~~Generated NeMo Guardrails configs per BAR~~ — STRUCK (replaced by `.redqueen/policy.json` in code repos) |

### Generated Files (Written to Code Repos)

| File | Purpose |
|------|---------|
| `.claude/governance-context.md` | Dynamic governance context for Claude Code |
| `.claude/settings.json` | Governance-scoped permissions + PreToolUse hook for Layer 1 enforcement (Section 7.6) |
| `.claude/agents/security-reviewer.md` | Security review subagent (Phase 7) |
| `.claude/agents/architecture-reviewer.md` | Architecture review subagent (Phase 7) |
| `.github/workflows/redqueen-review.yml` | Agent-agnostic PR review workflow — generated by `generateRedQueenReviewWorkflow()` (Phase 7) |
| `.redqueen/consensus.js` | Self-contained consensus resolution script for GitHub Actions (Phase 7) |
| `.redqueen/audit-log.jsonl` | Append-only audit log for governance events (Phase 7) |
| `.mcp.json` | Red Queen MCP server configuration |
| `.redqueen/decision.json` | Serialized OrchestrationDecision for code-repo panels (Phase 6) |
| `AGENTS.md` | Shared governance instructions for all agents |
| `.github/copilot-setup-steps.yml` | Copilot coding agent environment setup |
| `.github/hooks/redqueen.json` | Copilot preToolUse hook for Layer 1 enforcement (Section 7.6) |
| `.redqueen/hooks/validate-tool.sh` | Shared hook validation script called by both agents (Section 7.6) |
| `.github/workflows/redqueen-implement.yml` | Issue-triggered implementation workflow — generated by `generateImplementationWorkflow()` (Phase 8) |
| `.redqueen/hooks/validate-tool.sh` | Shared bash wrapper for hook validation — generated by `generateValidateToolSh()` (Phase 8) |
| `.redqueen/config-manifest.yaml` | Configuration integrity fingerprints for drift detection (Section 14.5) |
