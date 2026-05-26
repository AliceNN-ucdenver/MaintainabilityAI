<div class="docs-hero docs-hero-emerald">
  <div class="docs-hero-glyph"><img src="/images/glyphs/crown.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/agents/">Agents</a><span class="sep">/</span><span>Copilot Coding Agent</span></div>
    <div class="docs-eyebrow">Agentic · governed by The Red Queen <span class="docs-hero-meta">~3 min read</span></div>
    <h1 class="docs-hero-title">Copilot Coding Agent &mdash; autonomous in GitHub</h1>
    <p class="docs-hero-copy">Same governance mesh and policy engine as Claude Code Action &mdash; different hook adapter and config format. Drop-in for teams already standardized on Copilot, with the Red Queen rails still in place.</p>
    <span class="docs-hero-flourish">Two grins, one set of rules. The court does not care which agent you brought.</span>
  </div>
</div>

GitHub Copilot Coding Agent is an autonomous AI agent that runs on GitHub — triggered by issues, PR comments, or scheduled workflows. Like Claude Code Action, MaintainabilityAI governs it through **The Red Queen**.

---

## How It Works

The Copilot Coding Agent receives an issue or task, checks out your code, and implements changes autonomously. MaintainabilityAI adds governance enforcement through the same three-layer stack used by Claude Code Action:

1. **The Grin (MCP Server)** — Exposes governance mesh as queryable tools
2. **The Red Queen's Court** — Deterministic enforcement via TypeScript policy checks
3. **Red Queen Policy Engine** — Score-driven agent orchestration

Both agents call the **same validate\_action tool** and get **identical governance enforcement**. One governance mesh, two agents.

---

## Configuration Files

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-heading">Repo Settings UI</div>
<div class="docs-muted">MCP server configuration (JSON) — equivalent to Claude's .mcp.json</div>
<div class="docs-heading">.redqueen/mcp-runner.js</div>
<div class="docs-muted">Repo-local runner that resolves the live governance mesh and launches Red Queen MCP</div>
<div class="docs-heading">AGENTS.md</div>
<div class="docs-muted">Shared agent instructions (read by both Claude and Copilot agents)</div>
<div class="docs-heading">copilot-instructions.md</div>
<div class="docs-muted">Optional Copilot-specific instructions</div>
<div class="docs-heading">copilot-setup-steps.yml</div>
<div class="docs-muted">Environment setup workflow — checks out the mesh and starts the repo-local MCP runner</div>
</div>

</div>

### Environment Setup

The copilot-setup-steps.yml file runs before the agent starts, setting up the governance infrastructure:

<div class="docs-card docs-card-emerald">

<p class="docs-copy">copilot-setup-steps.yml</p>

<div class="docs-card docs-card-muted">

<span class="docs-copy">name:</span> Copilot Setup Steps<br/>
<span class="docs-copy">on:</span> workflow\_dispatch<br/>
<br/>
<span class="docs-copy">jobs:</span><br/>
&nbsp;&nbsp;<span class="docs-copy">setup:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">runs-on:</span> ubuntu-latest<br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">steps:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span class="docs-copy">uses:</span> actions/checkout@v4<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span class="docs-copy">name:</span> Checkout Governance Mesh<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">uses:</span> actions/checkout@v4<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">with:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">repository:</span> your-org/governance-mesh<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">path:</span> governance-mesh<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">token:</span> $\{\{ secrets.COPILOT\_MCP\_MESH\_TOKEN \}\}<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span class="docs-copy">name:</span> Start Red Queen MCP Server<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">run:</span> |<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;node .redqueen/mcp-runner.js &amp;

</div>

</div>

---

## Key Differences from Claude Code Action

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-heading">Capability</div>
<div class="docs-center-block">Claude Code Action</div>
<div class="docs-center-block">Copilot Coding Agent</div>

<div>MCP Resources (calm://)</div>
<div class="docs-center-block">✅ Full access</div>
<div class="docs-center-block">❌</div>

<div>MCP Prompts</div>
<div class="docs-center-block">✅ Governance-aware</div>
<div class="docs-center-block">❌</div>

<div>MCP Tools</div>
<div class="docs-center-block">✅ All 13 tools</div>
<div class="docs-center-block">✅ All 13 tools</div>

<div>Config mechanism</div>
<div class="docs-center-block">.mcp.json file</div>
<div class="docs-center-block">Repo Settings UI (JSON)</div>

<div>Agent instructions</div>
<div class="docs-center-block">CLAUDE.md + AGENTS.md</div>
<div class="docs-center-block">copilot-instructions.md + AGENTS.md</div>

<div>Hook support</div>
<div class="docs-center-block">✅ PreToolUse/PostToolUse</div>
<div class="docs-center-block">❌</div>

<div>Environment setup</div>
<div class="docs-center-block">Built-in</div>
<div class="docs-center-block">Via copilot-setup-steps.yml</div>

<div>Red Queen enforcement</div>
<div class="docs-center-block">✅ Identical</div>
<div class="docs-center-block">✅ Identical</div>
</div>

</div>

**The critical difference**: Copilot Coding Agent supports MCP **tools only** — no resources, no prompts. It can call validate\_action and get\_bar\_context (tools), but cannot read calm://bars/\{id\}/architecture (resource) directly. The get\_bar\_context tool compensates by bundling architecture data into the tool response.

---

## MCP Tools Available

Same tools as Claude Code Action:

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-heading">find\_bars</div>
<div class="docs-muted">Query</div>
<div class="docs-muted">Search BARs by name, platform, criticality, score range</div>
<div class="docs-heading">get\_bar\_context</div>
<div class="docs-muted">Query</div>
<div class="docs-muted">Architecture, scores, threats, ADRs, controls, flows — all in one call</div>
<div class="docs-heading">blast\_radius</div>
<div class="docs-muted">Analysis</div>
<div class="docs-muted">Downstream impact across relationships and BARs</div>
<div class="docs-heading">governance\_gaps</div>
<div class="docs-muted">Analysis</div>
<div class="docs-muted">Missing artifacts, weak scores, overdue reviews</div>
<div class="docs-heading">flow\_impact</div>
<div class="docs-muted">Analysis</div>
<div class="docs-muted">Downstream impact on linked BARs</div>
<div class="docs-heading">get\_orchestration\_decision</div>
<div class="docs-muted">Query</div>
<div class="docs-muted">Red Queen decision (tier, permissions, prompt packs)</div>
<div class="docs-heading">validate\_action</div>
<div class="docs-heading">Enforce</div>
<div class="docs-muted">Policy-engine validation against CALM model</div>
<div class="docs-heading">validate\_interface\_contract</div>
<div class="docs-heading">Enforce</div>
<div class="docs-muted">Cross-repo interface adherence</div>
</div>

</div>

---

## Permission Tiers

Identical to Claude Code Action — governance scores drive agent autonomy:

<div class="docs-card docs-card-muted">
<div class="docs-grid">
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Autonomous</div>
<div class="docs-heading">80-100%</div>
<div class="docs-muted">Auto-edit mode, can edit src/\*\*, run tests/lint/build</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Supervised</div>
<div class="docs-heading">50-79%</div>
<div class="docs-muted">Requires human approval, OWASP packs auto-injected</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Restricted</div>
<div class="docs-heading">0-49%</div>
<div class="docs-muted">Plan mode only, 2 agent reviews + human approval required</div>
</div>
</div>
</div>

---

## Shared AGENTS.md

Both Claude Code Action and Copilot Coding Agent read AGENTS.md for shared governance instructions:

<div class="docs-card docs-card-muted">

<p class="docs-copy">Governance Workflow</p>

<p class="docs-copy">
Before making changes:<br/>
1. Call get\_bar\_context for architecture, scores, and constraints<br/>
2. Call get\_orchestration\_decision for your permission tier<br/>
3. Call validate\_action before any structural change<br/>
4. Call validate\_interface\_contract for cross-repo changes<br/>
5. Call governance\_gaps() before creating a PR
</p>

<p class="docs-copy">
<strong class="docs-strong">Autonomous</strong> (80%+): Implement freely within src/ ·
<strong class="docs-strong">Supervised</strong> (50-79%): Changes require human review ·
<strong class="docs-strong">Restricted</strong> (&lt;50%): Plan first, implement only after approval
</p>

</div>

---

## When to Use Copilot Coding Agent vs Claude Code Action

<div class="docs-grid">

<div class="docs-card docs-card-emerald">
<p class="docs-copy">Choose Copilot Coding Agent when:</p>
<p class="docs-copy">
- Your team already uses GitHub Copilot<br/>
- The task doesn't require rich architecture context (resources)<br/>
- You want consistent tooling with your in-editor Copilot experience
</p>
</div>

<div class="docs-card docs-card-indigo">
<p class="docs-copy">Choose Claude Code Action when:</p>
<p class="docs-copy">
- You need full MCP resource access (architecture models, threat data, score history)<br/>
- Cross-repo governance is critical (interface contract validation benefits from resource context)<br/>
- You want PreToolUse/PostToolUse hooks for additional validation
</p>
</div>

</div>

**Either way**: The governance enforcement is identical. Both agents call the same validate\_action tool, hit the same Red Queen policy engine, and are governed by the same CALM model.

---

## Further Reading

- [Red Queen's Court](/docs/red-queens-court) — The Red Queen vision and architecture
- [Claude Code Action](/docs/agents/claude-code-action) — The other governed agent
- [Multi-Agent Orchestration](/docs/agents/multi-agent) — Coordinating multiple agents
- [GitHub Copilot (In-Editor)](/docs/agents/copilot) — Interactive assistant guide
