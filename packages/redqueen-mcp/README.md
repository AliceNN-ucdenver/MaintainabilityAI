# @maintainabilityai/redqueen-mcp

**The Red Queen** — AI coding agent governance via CALM architecture.

Red Queen is an MCP (Model Context Protocol) server that provides governance controls for AI coding agents (Claude Code, GitHub Copilot). It reads a governance mesh — a structured repository of Business Architecture Requirements (BARs), platforms, policies, and CALM architecture models — and exposes 25 MCP tools for real-time governance decisions.

## Install

```bash
# Global install
npm install -g @maintainabilityai/redqueen-mcp

# Or run directly with npx (no install needed)
npx @maintainabilityai/redqueen-mcp --mesh-path ./governance-mesh
```

**Requirements:** Node.js >= 20

## Quick Start

### 1. Set up a governance mesh

A governance mesh is a directory containing your organization's governance artifacts:

```
governance-mesh/
├── mesh.yaml              # Portfolio config (org, BARs, agent type)
├── bars/
│   └── my-service/
│       ├── bar.yaml       # BAR definition (scores, criticality)
│       ├── architecture/  # CALM models, ADRs
│       └── security/      # Security controls, threat models
├── platforms/             # Platform architecture definitions
└── policies/              # Governance policies (YAML)
```

### 2. Start the MCP server

```bash
# Stdio mode (used by Claude Code / Copilot)
npx @maintainabilityai/redqueen-mcp --mesh-path /path/to/governance-mesh
```

### 3. Scaffold governance into a code repo

```bash
# CLI scaffold mode — generates governance config files for a code repo
npx @maintainabilityai/redqueen-mcp \
  --mesh-path /path/to/governance-mesh \
  --scaffold \
  --bar "My Service"
```

This generates:
- `.mcp.json` — MCP server configuration for Claude Code
- `.claude/settings.json` — PreToolUse hook configuration
- `.redqueen/hooks/validate-tool.js` — Hook validator script
- `.redqueen/hooks/validate-tool.sh` — Shell wrapper (shared entry point)
- `.redqueen/policy.json` — Static governance policy
- `.redqueen/governance-context.md` — Governance context for agents
- `.redqueen/decision.json` — Orchestration decision
- `.github/hooks/redqueen.json` — Copilot hooks configuration
- `.github/workflows/redqueen-review.yml` — PR review workflow
- `.github/workflows/redqueen-implement.yml` — Issue implementation workflow
- `AGENTS.md` — Agent instructions

## Configuration

### Claude Code (`.mcp.json`)

The scaffold generates this automatically, or configure manually:

```json
{
  "mcpServers": {
    "redqueen": {
      "command": "npx",
      "args": [
        "@maintainabilityai/redqueen-mcp",
        "--mesh-path", "/path/to/governance-mesh"
      ]
    }
  }
}
```

### GitHub Copilot

Add Red Queen as an MCP server in your repository settings, then add the governance setup steps:

**`.github/copilot-setup-steps.yml`:**
```yaml
steps:
  - name: Checkout governance mesh
    uses: actions/checkout@v4
    with:
      repository: your-org/governance-mesh
      path: governance-mesh
      token: ${{ secrets.COPILOT_MCP_MESH_TOKEN }}

  - name: Start Red Queen MCP Server
    run: |
      npx @maintainabilityai/redqueen-mcp --mesh-path ${{ github.workspace }}/governance-mesh &
      sleep 2
```

## MCP Tools (25)

| Tool | Description |
|------|-------------|
| `get_bar_score` | Get governance pillar scores for a BAR |
| `list_bars` | List all BARs in the mesh |
| `list_platforms` | List all platforms |
| `get_architecture` | Get CALM architecture model for a BAR |
| `get_threats` | Get threat model for a BAR |
| `get_controls` | Get security controls for a BAR |
| `get_fitness_functions` | Get fitness functions for a BAR |
| `get_review_history` | Get review history for a BAR |
| `get_policy` | Get governance policies |
| `get_mesh_summary` | Get full mesh summary |
| `find_bars` | Search BARs by name, platform, or criticality |
| `get_bar_context` | Get comprehensive BAR context |
| `governance_gaps` | Identify governance gaps for a BAR |
| `compare_bars` | Compare two BARs side-by-side |
| `validate_calm` | Validate CALM model compliance |
| `get_adrs` | Get Architecture Decision Records |
| `scaffold_agent_config` | Generate governance config files for a code repo |
| `get_permission_tier` | Get the computed permission tier for a BAR |
| `validate_action` | Validate a proposed action against governance policy |
| `get_constraints` | Get active constraints for a BAR |
| `get_platform_architecture` | Get platform-level CALM architecture |
| `blast_radius` | Compute blast radius for a change |
| `validate_platform_calm` | Validate platform CALM model |
| `get_orchestration_decision` | Get full orchestration decision (tier + review board) |
| `score_snapshot` | Record a governance score snapshot |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Required for Claude Code Action workflows |
| `GOVERNANCE_MESH_TOKEN` | GitHub token with access to the governance mesh repo |
| `COPILOT_MCP_MESH_TOKEN` | Token for Copilot setup steps mesh checkout |
| `GITHUB_TOKEN` | Standard GitHub token (auto-provided in Actions) |

## End-to-End Testing

```bash
# 1. Set up a governance mesh
mkdir -p governance-mesh/bars/my-app
# ... populate with mesh.yaml, bar.yaml, etc.

# 2. Scaffold governance into your code repo
cd /path/to/your-code-repo
npx @maintainabilityai/redqueen-mcp \
  --mesh-path /path/to/governance-mesh \
  --scaffold --bar "My App"

# 3. Verify generated files
ls -la .redqueen/ .claude/ .github/

# 4. Push to GitHub and create a PR
git add . && git commit -m "Add Red Queen governance"
git push origin feature/governance

# 5. The redqueen-review.yml workflow runs on PR,
#    using the MCP tools for governance-aware review
```

## How It Works

Red Queen implements the **CALM (Common Architecture Language Model)** governance model:

1. **Governance Mesh** — Central repository of architecture decisions, security controls, and operational policies
2. **BAR Scoring** — Each Business Architecture Requirement is scored across 4 pillars: Architecture, Security, Information Risk, Operations
3. **Tier Classification** — Composite scores determine the governance tier:
   - **Autonomous** (80%+): Agent operates freely within boundaries
   - **Supervised** (50-79%): Changes require human review
   - **Restricted** (<50%): Plan-first, implement after approval
4. **Hook Enforcement** — PreToolUse hooks validate agent actions against governance policy in real-time
5. **Review Board** — Multi-agent review with consensus resolution on PRs

## License

MIT
