# The Red Queen — Governance-Enforced Agent Intelligence

**Version:** 0.2.0 — Design
**Date:** February 28, 2026
**Author:** Shawn McCarthy, VP & Chief Architect, Global Architecture, Risk and Governance

> *"Now, here, you see, it takes all the running you can do, to keep in the same place. If you want to get somewhere else, you must run at least twice as fast as that!"*
> — The Red Queen, Through the Looking Glass, Chapter 2

> **Status:** Design Complete — Not Yet Implemented
> **Depends on:** GovernanceScorer (Complete), PromptPackService (Complete), Oraculum (Complete), Absolem (Complete)
> **Subsumes:** governance-grin.md (The Grin MCP server is now a component of The Red Queen)

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
| **Enforcement** | NeMo Guardrails Engine | Deterministic validation of agent actions against CALM flows, controls, threat models, and interface contracts using Colang 2.0 rails |
| **Orchestration** | Red Queen Policy Engine | Score-driven agent configuration — dynamic CLAUDE.md, permission tiers, multi-agent review, feedback loops |

The Red Queen creates a **closed governance loop**: the mesh defines constraints → NeMo Guardrails enforce them deterministically → agents operate within bounds → outcomes feed back into scores → scores adjust constraints.

### 1.3 Design Principles

1. **Deterministic over advisory**: NeMo Guardrails provide hard enforcement boundaries. Prompts advise; guardrails enforce. An agent cannot bypass a CALM flow constraint regardless of how it interprets its instructions.
2. **Agent-agnostic control plane**: MCP tools are the universal interface. Both Claude Code Action and Copilot coding agent call the same `validate_action` tool. The enforcement logic is identical regardless of which agent triggers it.
3. **Architecture as law**: CALM flows, controls, interfaces, and relationships are the governance constitution. The Red Queen doesn't invent rules — it enforces the architecture the organization has declared.
4. **Progressive autonomy**: Higher governance scores grant agents more autonomy. Lower scores tighten constraints and increase human oversight. This creates a natural incentive to improve governance.
5. **Cross-repo awareness**: When repositories are linked in CALM flows, governance is not per-repo — it's per-flow. A change to any node in a flow can trigger validation across all linked repositories.
6. **Zero infrastructure**: The Red Queen runs as a Node.js process reading governance mesh files. No database, no cloud service, no separate infrastructure.

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
│  │  │         NeMo Guardrails Engine                      │     │   │
│  │  │                                                     │     │   │
│  │  │  Colang 2.0 Rails:                                  │     │   │
│  │  │  ├─ Flow Constraint Rails (CALM transitions)        │     │   │
│  │  │  ├─ Control Adherence Rails (NIST controls)         │     │   │
│  │  │  ├─ Threat Model Rails (STRIDE mitigations)         │     │   │
│  │  │  ├─ Interface Contract Rails (cross-repo semantics) │     │   │
│  │  │  └─ Permission Tier Rails (score-based access)      │     │   │
│  │  │                                                     │     │   │
│  │  │  Custom Actions:                                    │     │   │
│  │  │  ├─ @action validate_flow_constraint()              │     │   │
│  │  │  ├─ @action validate_control_adherence()            │     │   │
│  │  │  ├─ @action validate_interface_contract()           │     │   │
│  │  │  └─ @action check_threat_model()                    │     │   │
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
│       ├── tools/
│       │   ├── query.ts               # Read-only query tools (find_bars, get_bar_context, etc.)
│       │   ├── analysis.ts            # Computed tools (blast_radius, governance_gaps)
│       │   ├── validation.ts          # validate_action — NeMo-backed enforcement
│       │   ├── orchestration.ts       # get_orchestration_decision, get_agent_constraints
│       │   └── cross-repo.ts          # validate_interface_contract, flow_impact
│       ├── prompts/
│       │   └── governance.ts          # MCP prompt templates (RCTRO pattern)
│       ├── guardrails/
│       │   ├── engine.ts              # NeMo Guardrails integration wrapper
│       │   ├── config-builder.ts      # Dynamic Colang 2.0 config from mesh data
│       │   ├── actions/
│       │   │   ├── flow-validator.ts  # @action validate_flow_constraint
│       │   │   ├── control-validator.ts # @action validate_control_adherence
│       │   │   ├── interface-validator.ts # @action validate_interface_contract
│       │   │   └── threat-validator.ts # @action check_threat_model
│       │   └── rails/
│       │       ├── flow-rails.co      # Colang 2.0: CALM flow enforcement
│       │       ├── control-rails.co   # Colang 2.0: CALM control enforcement
│       │       ├── interface-rails.co # Colang 2.0: cross-repo interface contracts
│       │       ├── threat-rails.co    # Colang 2.0: STRIDE threat model enforcement
│       │       └── permission-rails.co # Colang 2.0: score-based permission tiers
│       └── utils/
│           ├── mesh-reader.ts         # Governance mesh file I/O
│           ├── calm-reader.ts         # CALM JSON parsing
│           └── cross-repo.ts          # Multi-repo flow resolution
├── mcp-server.js                      # Standalone entry point (stdio)
└── mcp-server-http.js                 # HTTP entry point (CI/CD)
```

### 2.3 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| MCP SDK | `@modelcontextprotocol/sdk` v1.27+ | Official TypeScript SDK, full 2025-11-25 spec |
| NeMo Guardrails | `nemoguardrails` Python package + REST server | NVIDIA's deterministic guardrails framework; Colang 2.0 DSL for flow-based policy enforcement |
| Schema validation | `zod` | Already in project; MCP SDK uses Zod natively |
| Transport (local) | `StdioServerTransport` | Zero config for local clients |
| Transport (remote) | `NodeStreamableHTTPServerTransport` | Stateless mode for CI/CD |
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
| T3 | `blast_radius` | Read | Given a CALM node ID, compute downstream impact across relationships, capabilities, and dependent BARs |
| T4 | `governance_gaps` | Read | Identify all governance gaps — missing artifacts, weak scores, overdue reviews |
| T5 | `architecture_query` | Read | Natural language query against CALM model |
| T6 | `compare_bars` | Read | Side-by-side comparison of two BARs across all four pillars |
| T7 | `score_snapshot` | Write | Trigger a governance score snapshot |
| T8 | `validate_calm` | Read | Run CalmValidator against architecture file |
| T9 | `validate_action` | Enforce | **NeMo-backed**: Validate a proposed agent action against CALM flows, controls, and interface contracts |
| T10 | `get_constraints` | Read | Get active governance constraints for a BAR (tier, permissions, prompt packs) |
| T11 | `validate_interface_contract` | Enforce | **NeMo-backed**: Validate cross-repo interface adherence for linked BARs |
| T12 | `flow_impact` | Read | Compute downstream flow impact of a change — which BARs and interfaces are affected |
| T13 | `get_orchestration_decision` | Read | Get full Red Queen orchestration decision for a BAR |

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

#### T11: validate_interface_contract (Cross-Repo Semantics)

```typescript
server.registerTool(
  'validate_interface_contract',
  {
    title: 'Validate Cross-Repo Interface Contract',
    description: 'Validate that a change in one repository respects the interface contracts defined in CALM flows. When a frontend is linked to an API via a CALM flow, this tool verifies that frontend changes adhere to the API\'s declared interface specification.',
    inputSchema: z.object({
      sourceBarId: z.string().describe('BAR making the change (e.g., frontend)'),
      targetBarId: z.string().describe('BAR whose interface must be respected (e.g., API)'),
      flowId: z.string().optional().describe('Specific flow to validate (validates all shared flows if omitted)'),
      changeDescription: z.string().describe('What is being changed in the source BAR'),
      affectedEndpoints: z.array(z.string()).optional().describe('Specific endpoints or interfaces being affected')
    }),
    outputSchema: z.object({
      valid: z.boolean(),
      violations: z.array(z.object({
        interfaceId: z.string(),
        flowId: z.string(),
        constraint: z.string(),
        violation: z.string(),
        severity: z.enum(['error', 'warning'])
      })),
      recommendations: z.array(z.string())
    }),
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ sourceBarId, targetBarId, flowId, changeDescription, affectedEndpoints }) => {
    // 1. Resolve CALM flows linking source and target BARs
    // 2. Extract interface contracts from flow transitions
    // 3. Validate change against interface specifications
    // 4. Return violations with flow/interface references
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

## 4. NeMo Guardrails — Deterministic Governance Enforcement

### 4.1 Why NeMo Guardrails

The fundamental problem with LLM-based governance is that prompts are advisory — agents can and do ignore instructions. NeMo Guardrails provides a **deterministic enforcement layer** using Colang 2.0, NVIDIA's domain-specific language for defining conversational and action-level constraints.

Key properties that make NeMo the right framework:

| Property | Value for Governance |
|----------|---------------------|
| **Deterministic flows** | Colang 2.0 `flow` definitions execute as finite state machines, not LLM inference |
| **Custom actions** | `@action` decorator connects guardrails to external validation logic (CALM model queries, interface checks) |
| **Multi-config server** | `config_ids` parameter enables per-BAR guardrail selection at request time |
| **Dynamic config** | `RailsConfig.from_content()` + `+` operator allow runtime config construction from governance mesh data |
| **Five rail types** | Input, dialog, retrieval, execution, output rails cover the full agent lifecycle |

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

---

## 6. Orchestration Policies

### 6.1 Policy Definition Format

Policies are defined in `mesh.yaml` under the `orchestration` section and in per-BAR `app.yaml` for overrides.

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

  // 5. Add BAR-level constraints
  if (bar.orchestration?.additional_constraints) {
    constraints.push(...bar.orchestration.additional_constraints);
  }

  // 6. Build NeMo Guardrails config for this BAR
  const guardrailsConfig = buildGuardrailsConfig(bar, architecture, scores, policy);

  // 7. Resolve cross-repo links
  const crossRepoLinks = resolveCrossRepoLinks(bar);

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
| Hooks | `PreToolUse` / `PostToolUse` hooks | Not supported |
| MCP features | Tools, resources, prompts | **Tools only** (no resources, no prompts) |
| Environment setup | GitHub Actions workflow | `copilot-setup-steps.yml` |
| Secrets | Standard Actions secrets | `COPILOT_MCP_` prefixed, `copilot` environment |

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

### 9.1 Review Board Composition

When the orchestration decision specifies `agents: 2+`, the Red Queen assembles a review board:

```typescript
interface ReviewBoard {
  agents: ReviewAgent[];
  arbiter: 'human' | 'claude-opus';
  consensusRule: 'unanimous' | 'majority' | 'any-flag-escalates';
  timeout: number;
}

interface ReviewAgent {
  id: string;
  role: 'security' | 'architecture' | 'quality' | 'general';
  subagentConfig?: string;
  weight: number;
}
```

### 9.2 Review Patterns

**Pattern A: Dual-Agent Independent Review (Default for `restricted` tier)**

```
PR Created
    │
    ├──→ Claude Code (Security Focus, weight: 0.6)
    │    └── Uses security-reviewer subagent
    │    └── Reviews against OWASP packs + STRIDE threats
    │    └── Calls validate_action for each structural change
    │
    ├──→ Copilot (Quality Focus, weight: 0.4)
    │    └── Reviews code quality, test coverage, conventions
    │    └── Calls governance_gaps to check coverage
    │
    └──→ Results Aggregation
         ├── Both approve → PR ready for human review
         ├── One flags critical → Escalate immediately
         └── Disagreement → Arbiter synthesizes findings
```

**Pattern B: Pipeline Review (For `critical` BARs)**

```
PR Created
    │
    v
Stage 1: Static Analysis
    ├── CodeQL + Snyk scans
    └── Results attached to PR
    │
    v
Stage 2: AI Security Review (Claude Opus)
    ├── Full CALM context + threat model
    ├── validate_action for all structural changes
    ├── validate_interface_contract for cross-repo changes
    └── Security findings posted as review
    │
    v
Stage 3: AI Architecture Review (Claude Sonnet)
    ├── Architectural conformance check
    ├── ADR compliance verification
    └── Architecture findings posted as review
    │
    v
Stage 4: Human Architecture Board Review
    └── Final approval or rejection
```

### 9.3 Consensus Resolution

```typescript
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

  switch (rule) {
    case 'unanimous':
      return verdicts.every(v => v.approve)
        ? { outcome: 'approve', findings: [] }
        : { outcome: 'request-changes', findings: verdicts.flatMap(v => v.findings) };

    case 'majority': {
      const totalWeight = verdicts.reduce((sum, v) => sum + v.weight, 0);
      const approveWeight = verdicts.filter(v => v.approve).reduce((sum, v) => sum + v.weight, 0);
      return (approveWeight / totalWeight) > 0.5
        ? { outcome: 'approve', findings: [] }
        : { outcome: 'request-changes', findings: verdicts.flatMap(v => v.findings) };
    }

    case 'any-flag-escalates':
      return verdicts.some(v => !v.approve)
        ? { outcome: 'escalate', findings: verdicts.flatMap(v => v.findings), reason: 'Agent disagreement' }
        : { outcome: 'approve', findings: [] };
  }
}
```

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

### 11.2 Panel Integration

**Looking Glass:**
- Red Queen tier badge on BAR detail (autonomous/supervised/restricted) with colored indicator
- Tier badge click → popover showing policy reasoning, active constraints, NeMo rail status
- Cross-repo dependency graph visualization (linked BARs via CALM flows)
- Settings section: orchestration policy editor

**Oraculum:**
- Review depth auto-configured by Red Queen based on BAR tier
- Multi-agent review board assembly for restricted BARs
- Score delta tracking after review completion

**Rabbit Hole:**
- Issue creation pre-populates with governance context
- Agent selection guided by policy preferences
- Permission configuration scaffolded from tier settings

**White Rabbit / Scaffold:**
- New components inherit parent BAR's orchestration policy
- Initial `.claude/governance-context.md` generated
- `.mcp.json` with Red Queen server included in scaffold

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

### 13.1 RedQueenService

```typescript
// src/services/RedQueenService.ts

class RedQueenService {
  private meshPath: string;
  private policy: OrchestrationPolicy | null = null;
  private guardrailsEngine: NemoGuardrailsEngine;

  // ── Policy ────────────────────────────────────────────────
  loadPolicy(meshPath: string): OrchestrationPolicy;
  reloadPolicy(): void;
  evaluate(barId: string): Promise<OrchestrationDecision>;
  evaluateAll(): Promise<OrchestrationDecision[]>;

  // ── Agent Configuration ───────────────────────────────────
  generateGovernanceContext(decision: OrchestrationDecision, context: BarContextBundle): string;
  generateSettings(decision: OrchestrationDecision): object;
  generateSubagentDefinitions(decision: OrchestrationDecision, context: BarContextBundle): SubagentDefinition[];
  generateAgentsMd(decision: OrchestrationDecision): string;
  applyConfiguration(decision: OrchestrationDecision, repoPath: string): Promise<void>;

  // ── NeMo Guardrails ───────────────────────────────────────
  validateAction(barId: string, action: AgentAction): Promise<ValidationResult>;
  validateInterfaceContract(sourceBar: string, targetBar: string, change: string): Promise<InterfaceValidationResult>;
  buildGuardrailsConfig(barId: string): Promise<GuardrailsConfig>;

  // ── Cross-Repo ────────────────────────────────────────────
  resolveFlowAcrossBars(flowId: string): Promise<CrossRepoFlowGraph>;
  computeFlowImpact(barId: string, nodeId: string): Promise<FlowImpact>;
  getLinkedBars(barId: string): Promise<LinkedBar[]>;

  // ── Review Board ──────────────────────────────────────────
  assembleReviewBoard(decision: OrchestrationDecision): ReviewBoard;
  resolveConsensus(verdicts: ReviewVerdict[]): ConsensusResult;

  // ── Feedback Loop ─────────────────────────────────────────
  computeScoreDelta(barId: string, beforeScores: GovernanceScores): Promise<ScoreDelta>;
  recordDelta(barId: string, delta: ScoreDelta): Promise<void>;
  getAgentMemory(barId: string): Promise<AgentMemory>;
  updateAgentMemory(barId: string, learning: AgentLearning): Promise<void>;
  suggestPolicyRefinements(): Promise<PolicySuggestion[]>;
}

export const redQueenService = new RedQueenService();
```

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
  flows: string[];
  interfaces: string[];
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

### 14.1 stdio Transport (Local)

No authentication required. The server inherits filesystem permissions.

### 14.2 HTTP Transport (Remote / CI/CD)

Bearer token authentication for HTTP deployments:

```typescript
const REDQUEEN_AUTH_TOKEN = process.env.REDQUEEN_AUTH_TOKEN;

function validateRequest(req: IncomingMessage): boolean {
  if (!REDQUEEN_AUTH_TOKEN) return true;  // Open in local dev
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return false;
  return auth.slice(7) === REDQUEEN_AUTH_TOKEN;
}
```

### 14.3 Data Access Control

| Resource | Sensitivity | Access Policy |
|----------|------------|---------------|
| Portfolio/platform summaries | Low | Open read |
| CALM architecture | Medium | Open read (architecture is documentation) |
| Governance scores | Medium | Open read |
| Threat models | High | Open read (valuable but not secrets) |
| Controls / ADRs | Medium | Open read |
| Prompt packs | Low | Open read |
| validate_action (write) | Low | Available to any authenticated caller |
| score_snapshot (write) | Low | Requires explicit user approval |

> **Decision D9:** Governance mesh data is documentation, not secrets. API keys and credentials should never be stored in mesh files. Write operations require user confirmation.

---

## 15. Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Unified The Grin into The Red Queen as a single system | The Grin (MCP data layer) and Red Queen (enforcement + orchestration) are inseparable in practice. Every MCP tool call goes through governance enforcement. A single design eliminates coordination complexity. |
| D2 | NeMo Guardrails for deterministic enforcement, not LLM prompts | Prompts are advisory — agents can ignore them. NeMo's Colang 2.0 flows execute as state machines. A `validate_action` call returns a deterministic verdict regardless of which LLM invoked it. |
| D3 | MCP tools as universal control plane for agent-agnostic governance | Copilot coding agent only supports MCP tools (not resources or prompts). By exposing all enforcement through tools, both Claude Code and Copilot receive identical governance. |
| D4 | CALM flows + interfaces as cross-repo governance contracts | CALM already models service relationships, transitions, and interfaces. Using this existing structure as governance contracts avoids inventing a new schema and ensures architecture models and governance rules are always in sync. |
| D5 | `copilot-setup-steps.yml` + repo Settings UI for Copilot agent MCP | Copilot agent doesn't read committed MCP config files. The environment setup step starts the Red Queen server; the Settings UI points to it. This is the only pattern GitHub currently supports. |
| D6 | NeMo runs as a sidecar process, not embedded in Node.js | NeMo Guardrails is a Python package. Running it as a REST sidecar (`nemoguardrails server`) keeps the MCP server in pure Node.js while using NeMo's full Colang 2.0 engine. HTTP latency (~50ms) is negligible for PR-level validation. |
| D7 | `validate_action` called by agents, not as a pre-commit hook | Agents call `validate_action` proactively (instructed via AGENTS.md and governance-context.md). This is more informative than a binary hook — the agent receives reasons, conditions, and recommendations it can act on. |
| D8 | Three permission tiers (autonomous/supervised/restricted) | Maps to the governance maturity curve. High-scoring BARs earn autonomy; low-scoring BARs get guardrails. Simple enough to understand, flexible enough via criticality multipliers. |
| D9 | All governance data is read-open (no per-resource ACL) | Governance mesh is documentation and scores, not secrets. Simplicity over complexity — YAGNI for per-resource authorization. |
| D10 | Cross-repo notifications via GitHub Issues | When a change in BAR A violates an interface contract with BAR B, the Red Queen creates an issue in BAR B's repo. This integrates with existing workflows — developers see it in their issue tracker. |
| D11 | Agent memory stored in governance mesh (`.caterpillar/agent-memory/`) | Agent memory is governance data — version-controlled alongside the mesh, not in individual repos. Enables portfolio-level learning across all BARs. |
| D12 | Policy suggestions are advisory, not auto-applied | Governance policy changes require human judgment. The Red Queen surfaces data-driven suggestions, but a human architect decides. |
| D13 | `architecture_query` uses MCP sampling for LLM reasoning | Avoids requiring a separate LLM API key on the server. The query + CALM model are sent as a sampling request to the client's LLM. |
| D14 | Dynamic Colang 2.0 config from CALM model per-BAR | Each BAR's CALM architecture generates a unique NeMo configuration. `RailsConfig.from_content()` + `+` operator allow runtime composition. This ensures guardrails always reflect the current architecture. |
| D15 | `AGENTS.md` as shared governance instructions | Both Claude Code and Copilot coding agent read `AGENTS.md`. This file instructs both agents to call `validate_action` before structural changes and `validate_interface_contract` for cross-repo changes. |
| D16 | Custom `calm://` URI scheme for all resources | Domain-specific URIs make resources self-describing. Follows EventCatalog's `eventcatalog://` pattern. |

---

## 16. Implementation Phases

### Phase 1: Core MCP Server + Resources (The Grin Data Layer)

- [ ] Set up `src/mcp/` module structure
- [ ] Implement `server.ts` with `McpServer` initialization and stdio transport
- [ ] Implement `mesh-reader.ts` and `calm-reader.ts`
- [ ] Register all 14 resources (R1-R14) with URI templates and annotations
- [ ] Configure esbuild to produce `dist/mcp-server.js`
- [ ] Register `mcpServerDefinitionProviders` in `package.json`
- [ ] Implement VS Code extension host registration
- [ ] Test with Claude Desktop via stdio

**Value:** Agents can discover and read all governance mesh data.

### Phase 2: Query + Analysis Tools

- [ ] Implement T1-T8 (find_bars, get_bar_context, blast_radius, governance_gaps, architecture_query, compare_bars, score_snapshot, validate_calm)
- [ ] Implement T12 flow_impact and T13 get_orchestration_decision
- [ ] Add HTTP transport for CI/CD (`mcp-server-http.js`)
- [ ] Implement bearer token authentication
- [ ] Add MCP prompt templates (P1-P4)

**Value:** Agents can actively query governance intelligence and compute impact analysis.

### Phase 3: NeMo Guardrails Integration

- [ ] Set up NeMo Guardrails sidecar configuration
- [ ] Implement `config-builder.ts` — dynamic Colang 2.0 from CALM models
- [ ] Implement flow constraint rails (`flow-rails.co` + `flow-validator.ts`)
- [ ] Implement control adherence rails (`control-rails.co` + `control-validator.ts`)
- [ ] Implement threat model rails (`threat-rails.co` + `threat-validator.ts`)
- [ ] Implement permission tier rails (`permission-rails.co`)
- [ ] Implement T9 `validate_action` — NeMo-backed enforcement tool
- [ ] Implement T10 `get_constraints`
- [ ] Test enforcement scenarios end-to-end

**Value:** Deterministic governance enforcement. Agents cannot bypass architectural constraints regardless of prompt interpretation.

### Phase 4: Cross-Repo Semantic Governance

- [ ] Implement `cross-repo.ts` — multi-BAR flow resolution
- [ ] Implement interface contract rails (`interface-rails.co` + `interface-validator.ts`)
- [ ] Implement T11 `validate_interface_contract`
- [ ] Implement linked BAR discovery from `app.yaml` and CALM flow analysis
- [ ] Implement cross-repo notification system (GitHub Issues)
- [ ] Add `linkedBars` field to BAR resources
- [ ] Cross-repo flow visualization in Looking Glass

**Value:** Changes in one repo are validated against interface contracts in linked repos. The "huge" feature — semantic governance across repository boundaries.

### Phase 5: Policy Engine + Agent Configuration

- [ ] Define `OrchestrationPolicy` types
- [ ] Implement policy loading from `mesh.yaml` + per-BAR `app.yaml` overrides
- [ ] Implement `evaluatePolicy()` — tier determination, prompt injection, criticality adjustment
- [ ] Implement `generateGovernanceContext()` — dynamic CLAUDE.md
- [ ] Implement `generateSettings()` — `.claude/settings.json`
- [ ] Implement `generateAgentsMd()` — shared AGENTS.md
- [ ] Add Red Queen tier badge to Looking Glass BAR detail
- [ ] Add orchestration policy editor to Looking Glass Settings

**Value:** Every agent interaction receives governance-appropriate configuration based on scores, criticality, and policy.

### Phase 6: Multi-Agent Review Board + Feedback Loop

- [ ] Implement review board assembly
- [ ] Implement consensus resolution
- [ ] Generate specialized subagent definitions
- [ ] Implement score delta computation and persistence
- [ ] Implement agent memory read/write
- [ ] Implement policy suggestion engine
- [ ] Score delta visualization in Looking Glass

**Value:** Multi-agent review with consensus resolution. Continuous improvement via feedback loops.

### Phase 7: Agent-Agnostic CI/CD Deployment

- [ ] Create `@maintainabilityai/redqueen-mcp` npm package
- [ ] Create `copilot-setup-steps.yml` template
- [ ] Create Claude Code Action workflow template
- [ ] Scaffold `.mcp.json` and `AGENTS.md` into code repos via ScaffoldPanel
- [ ] Document configuration for all agent types
- [ ] Create `maintainabilityai/redqueen-action` GitHub Action for governance gate

**Value:** Zero-friction deployment. Both Claude Code Action and Copilot coding agent governed identically through MCP tools.

---

## 17. File Reference Summary

### Files Created

| File | Purpose |
|------|---------|
| `src/mcp/server.ts` | McpServer initialization, transport binding, resource/tool registration |
| `src/mcp/resources/*.ts` | MCP resource handlers (portfolio, bars, capabilities, prompts) |
| `src/mcp/tools/query.ts` | Read-only query tools (T1-T8) |
| `src/mcp/tools/validation.ts` | NeMo-backed enforcement tools (T9-T11) |
| `src/mcp/tools/orchestration.ts` | Orchestration tools (T12-T13) |
| `src/mcp/tools/cross-repo.ts` | Cross-repo validation tools |
| `src/mcp/prompts/governance.ts` | MCP prompt templates (P1-P4) |
| `src/mcp/guardrails/engine.ts` | NeMo Guardrails integration wrapper |
| `src/mcp/guardrails/config-builder.ts` | Dynamic Colang 2.0 config from CALM |
| `src/mcp/guardrails/actions/*.ts` | Custom NeMo actions (flow, control, interface, threat validators) |
| `src/mcp/guardrails/rails/*.co` | Colang 2.0 rail definitions |
| `src/mcp/utils/mesh-reader.ts` | Governance mesh file I/O |
| `src/mcp/utils/calm-reader.ts` | CALM JSON parsing |
| `src/mcp/utils/cross-repo.ts` | Multi-repo flow resolution |
| `src/services/RedQueenService.ts` | Orchestration engine — policy, config generation, feedback loop |
| `src/types/redqueen.ts` | All Red Queen types |
| `mcp-server.js` | Standalone stdio entry point |
| `mcp-server-http.js` | Standalone HTTP entry point |

### Files Modified

| File | Change |
|------|--------|
| `package.json` | Add `mcpServerDefinitionProviders`, `@modelcontextprotocol/sdk` dependency |
| `extension.ts` | Register MCP server definition provider |
| `esbuild.js` | Add mcp-server entry points |
| `src/types/index.ts` | Re-export redqueen.ts types |
| `src/webview/LookingGlassPanel.ts` | Red Queen tier badge, cross-repo visualization, policy editor |
| `src/webview/OracularPanel.ts` | Multi-agent review board, consensus UI |
| `src/webview/IssueCreatorPanel.ts` | Governance context injection |
| `src/webview/ScaffoldPanel.ts` | .mcp.json + AGENTS.md scaffolding |
| `src/services/MeshService.ts` | Read/write `orchestration` section in mesh.yaml |

### Mesh Files (New)

| File | Purpose |
|------|---------|
| `mesh.yaml` → `orchestration:` | Portfolio-level orchestration + guardrails policy |
| `app.yaml` → `orchestration:` | Per-BAR policy overrides + linked BARs |
| `app.yaml` → `linkedBars:` | Cross-repo BAR linkages |
| `.caterpillar/agent-memory/{barId}.yaml` | Per-BAR agent learnings + rail effectiveness |
| `.caterpillar/agent-memory/portfolio.yaml` | Portfolio-level agent effectiveness |
| `.caterpillar/.guardrails/` | Generated NeMo Guardrails configs per BAR |

### Generated Files (Written to Code Repos)

| File | Purpose |
|------|---------|
| `.claude/governance-context.md` | Dynamic governance context for Claude Code |
| `.claude/settings.json` | Governance-scoped permissions |
| `.claude/agents/security-reviewer.md` | Security review subagent |
| `.claude/agents/architecture-reviewer.md` | Architecture review subagent |
| `.mcp.json` | Red Queen MCP server configuration |
| `AGENTS.md` | Shared governance instructions for all agents |
| `.github/copilot-setup-steps.yml` | Copilot coding agent environment setup |
