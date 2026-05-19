<div class="docs-hero docs-hero-cyan">
  <div class="docs-hero-glyph"><img src="/images/glyphs/crown.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/agents/">Agents</a><span class="sep">/</span><span>Claude Code Action</span></div>
    <div class="docs-eyebrow">Agentic · governed by The Red Queen <span class="docs-hero-meta">~4 min read</span></div>
    <h1 class="docs-hero-title">Claude Code Action &mdash; autonomous in GitHub</h1>
    <p class="docs-hero-copy">Runs via <code>anthropics/claude-code-action@v1</code> on issues, comments, or schedules. Full MCP access &mdash; resources, tools, prompts &mdash; with PreToolUse hooks and fail-closed review consensus enforcing the governance contract.</p>
    <span class="docs-hero-flourish">Autonomy without judgment is just velocity into a wall.</span>
  </div>
</div>

Claude Code Action is an autonomous AI agent that runs via anthropics/claude-code-action@v1 in GitHub Actions. It's triggered by issues, PR comments, or scheduled workflows and operates **without human interaction** until PR review.

MaintainabilityAI governs Claude Code Action through **The Red Queen** — a three-layer governance stack that enforces your architecture constraints deterministically, not as suggestions.

---

## How MaintainabilityAI Governs It

<div class="docs-card docs-card-muted">
<div class="docs-grid">
<div class="docs-card docs-card-cyan">
<div class="docs-heading">Layer 1: The Grin (MCP Server)</div>
<div class="docs-muted">Exposes your governance mesh as queryable MCP resources and tools. Claude Code Action gets full architecture context — models, scores, threats, controls, flows — in a single call.</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-heading">Layer 2: The Red Queen's Court</div>
<div class="docs-muted">A pure TypeScript policy engine enforces governance constraints deterministically. CALM flows, NIST controls, interface contracts, and threat model mitigations are checked before action. The agent <strong>cannot</strong> bypass a flow constraint.</div>
</div>
<div class="docs-card docs-card-indigo">
<div class="docs-heading">Layer 3: Red Queen Policy Engine</div>
<div class="docs-muted">Score-driven agent orchestration. Permission tiers, dynamic CLAUDE.md generation, multi-agent review boards, cross-repo governance, and feedback loops. Governance scores become the control plane for agent behavior.</div>
</div>
</div>
</div>

Unlike in-editor Claude Code where a human reviews each change, Claude Code Action is **deterministically governed**. The Red Queen's TypeScript policy engine enforces your architecture as declared CALM constraints, so the agent cannot create connections that are not declared in your model.

---

## Configuration Files

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-heading">.mcp.json</div>
<div class="docs-muted">MCP server config that launches the repo-local Red Queen runner</div>
<div class="docs-heading">.redqueen/mcp-runner.js</div>
<div class="docs-muted">Portable resolver for the live governance mesh and npm MCP server</div>
<div class="docs-heading">CLAUDE.md</div>
<div class="docs-muted">Agent instructions — dynamically generated per-BAR by Red Queen based on governance scores</div>
<div class="docs-heading">.claude/settings.json</div>
<div class="docs-muted">Permission settings (allowed tools, edit permissions)</div>
<div class="docs-heading">AGENTS.md</div>
<div class="docs-muted">Shared instructions read by both Claude Code Action and Copilot Coding Agent</div>
</div>

</div>

The Red Queen generates CLAUDE.md dynamically based on the BAR's governance scores. A BAR scoring 85% gets a permissive CLAUDE.md (auto-edit mode). A BAR scoring 40% gets a restrictive one (plan mode, mandatory reviews).

---

## MCP Resources (calm://)

Claude Code Action can read **resources** — rich, structured data from your governance mesh:

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-heading">Portfolio Summary</div>
<div>calm://portfolio</div>
<div class="docs-muted">All BARs with scores and health indicators</div>
<div class="docs-heading">Platform List</div>
<div>calm://portfolio/platforms</div>
<div class="docs-muted">Platforms with aggregated scores</div>
<div class="docs-heading">Platform Detail</div>
<div>calm://platforms/\{id\}</div>
<div class="docs-muted">BARs within a specific platform</div>
<div class="docs-heading">BAR Summary</div>
<div>calm://bars/\{id\}</div>
<div class="docs-muted">Scores, metadata, linked BARs</div>
<div class="docs-heading">Architecture</div>
<div>calm://bars/\{id\}/architecture</div>
<div class="docs-muted">Full CALM 1.2 JSON model</div>
<div class="docs-heading">Scores</div>
<div>calm://bars/\{id\}/scores</div>
<div class="docs-muted">Four-pillar scores with history</div>
<div class="docs-heading">Threats</div>
<div>calm://bars/\{id\}/threats</div>
<div class="docs-muted">STRIDE threat model</div>
<div class="docs-heading">Controls</div>
<div>calm://bars/\{id\}/controls</div>
<div class="docs-muted">NIST-mapped security controls</div>
<div class="docs-heading">Flows</div>
<div>calm://bars/\{id\}/flows</div>
<div class="docs-muted">CALM flows and relationships</div>
</div>

</div>

**Note**: Copilot Coding Agent does NOT have access to resources — only tools. This is Claude Code Action's unique advantage for architecture-aware work.

---

## MCP Tools

Both Claude Code Action and Copilot Coding Agent call the same tools:

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-heading">find\_bars</div>
<div class="docs-muted">Query</div>
<div class="docs-muted">Search BARs by name, platform, criticality, score range</div>
<div class="docs-heading">get\_bar\_context</div>
<div class="docs-muted">Query</div>
<div class="docs-muted">Comprehensive context bundle (architecture, scores, threats, ADRs, controls, flows)</div>
<div class="docs-heading">blast\_radius</div>
<div class="docs-muted">Analysis</div>
<div class="docs-muted">Downstream impact analysis across relationships and BARs</div>
<div class="docs-heading">governance\_gaps</div>
<div class="docs-muted">Analysis</div>
<div class="docs-muted">Missing artifacts, weak scores, overdue reviews</div>
<div class="docs-heading">flow\_impact</div>
<div class="docs-muted">Analysis</div>
<div class="docs-muted">Downstream impact of a change on linked BARs</div>
<div class="docs-heading">get\_orchestration\_decision</div>
<div class="docs-muted">Query</div>
<div class="docs-muted">Full Red Queen decision for a BAR (tier, permissions, prompt packs)</div>
<div class="docs-heading">validate\_action</div>
<div class="docs-heading">Enforce</div>
<div class="docs-muted">Policy-engine validation against CALM flows, controls, interface contracts</div>
<div class="docs-heading">validate\_interface\_contract</div>
<div class="docs-heading">Enforce</div>
<div class="docs-muted">Cross-repo interface adherence validation</div>
</div>

</div>

Enforcement tools return **Allow**, **Conditional** (with requirements), or **Deny** (with reason and correct path).

---

## Permission Tiers

Governance scores directly drive agent autonomy:

<div class="docs-card docs-card-muted">
<div class="docs-grid">
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Autonomous</div>
<div class="docs-heading">80-100%</div>
<div class="docs-muted">Auto-edit mode. Can edit src/\*\*, run tests/lint/build. Red Queen policy checks still enforce flow and control constraints.</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Supervised</div>
<div class="docs-heading">50-79%</div>
<div class="docs-muted">Ask-edit mode. Requires human approval. OWASP and STRIDE packs auto-injected for weak pillars.</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Restricted</div>
<div class="docs-heading">0-49%</div>
<div class="docs-muted">Plan mode only. 2 agent reviews + human approval. Red Queen blocks unapproved infrastructure changes.</div>
</div>
</div>
</div>

**Improve your governance scores, and the agent earns more autonomy.** Governance becomes a force multiplier, not a bureaucratic tax.

---

## Five Red Queen Policy Checks

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-flex-block">
<div class="docs-heading">Flow Constraints</div>
<div class="docs-muted">CALM flow transitions are law. No undeclared connections between components.</div>
</div>
<div class="docs-flex-block">
<div class="docs-heading">Control Adherence</div>
<div class="docs-muted">NIST controls enforced. No endpoint without authentication if control requires it.</div>
</div>
<div class="docs-flex-block">
<div class="docs-heading">Interface Contracts</div>
<div class="docs-muted">Cross-repo semantics respected. Frontend changes must match the API's interface spec.</div>
</div>
<div class="docs-flex-block">
<div class="docs-heading">Threat Model</div>
<div class="docs-muted">STRIDE mitigations validated. Changes introducing new threats are flagged or blocked.</div>
</div>
<div class="docs-flex-block">
<div class="docs-heading">Permission Tiers</div>
<div class="docs-muted">Score-based boundaries. Restricted-tier agents cannot modify infrastructure.</div>
</div>
</div>

</div>

All enforcement is **deterministic** — finite state machines evaluating the CALM model, not an LLM judging whether a change is "okay."

---

## Cross-Repo Governance

When your CALM model declares a flow across repositories (e.g., checkout-ui → order-api → order-database), the Red Queen understands the full dependency graph.

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-grid">
<div class="docs-copy">Frontend calls undeclared API endpoint</div>
<div><span class="docs-copy">Denied</span> <span class="docs-copy">— interface doesn't include that endpoint</span></div>
</div>
<div class="docs-grid">
<div class="docs-copy">API changes response format</div>
<div><span class="docs-copy">Conditional</span> <span class="docs-copy">— downstream BAR consumes this interface, update it first</span></div>
</div>
<div class="docs-grid">
<div class="docs-copy">Database drops a column</div>
<div><span class="docs-copy">Denied</span> <span class="docs-copy">— blast radius: 4 nodes, 2 BARs. Requires migration ADR.</span></div>
</div>
<div class="docs-grid">
<div class="docs-copy">New service without auth middleware</div>
<div><span class="docs-copy">Blocked</span> <span class="docs-copy">— control requires OAuth2 on all endpoints</span></div>
</div>
</div>

</div>

---

## GitHub Actions Workflow

<div class="docs-card docs-card-indigo">

<p class="docs-copy">claude-code-governance.yml</p>

<div class="docs-card docs-card-muted">

<span class="docs-copy">name:</span> Claude Code Governance<br/>
<span class="docs-copy">on:</span><br/>
&nbsp;&nbsp;<span class="docs-copy">issues:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">types:</span> [opened, labeled]<br/>
<br/>
<span class="docs-copy">jobs:</span><br/>
&nbsp;&nbsp;<span class="docs-copy">claude-fix:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">runs-on:</span> ubuntu-latest<br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">steps:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span class="docs-copy">uses:</span> actions/checkout@v4<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span class="docs-copy">name:</span> Start Red Queen MCP Server<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">run:</span> |<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;node .redqueen/mcp-runner.js &amp;<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span class="docs-copy">name:</span> Run Claude Code Action<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">uses:</span> anthropics/claude-code-action@v1<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">with:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="docs-copy">anthropic\_api\_key:</span> $\{\{ secrets.ANTHROPIC\_API\_KEY \}\}

</div>

</div>

The repo-local MCP runner starts before Claude Code Action runs. The agent calls validate\_action before any structural change, and The Red Queen's Court enforces governance constraints deterministically.

---

## What Claude Code Action Has That In-Editor Doesn't

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-heading">Capability</div>
<div class="docs-center-block">In-Editor</div>
<div class="docs-center-block">Agentic</div>

<div>MCP Resources (calm://)</div>
<div class="docs-center-block">❌</div>
<div class="docs-center-block">✅</div>

<div>MCP Prompts</div>
<div class="docs-center-block">❌</div>
<div class="docs-center-block">✅</div>

<div>Red Queen Policy Checks</div>
<div class="docs-center-block">❌</div>
<div class="docs-center-block">✅</div>

<div>PreToolUse/PostToolUse Hooks</div>
<div class="docs-center-block">❌</div>
<div class="docs-center-block">✅</div>

<div>Dynamic CLAUDE.md</div>
<div class="docs-center-block">❌</div>
<div class="docs-center-block">✅</div>

<div>Cross-repo enforcement</div>
<div class="docs-center-block">❌</div>
<div class="docs-center-block">✅</div>

<div>Permission tiers</div>
<div class="docs-center-block">❌</div>
<div class="docs-center-block">✅</div>
</div>

</div>

---

## Further Reading

- [Red Queen's Court](/docs/red-queens-court) — The Red Queen vision and full architecture
- [Copilot Coding Agent](/docs/agents/copilot-coding-agent) — The other governed agent
- [Multi-Agent Orchestration](/docs/agents/multi-agent) — Coordinating multiple agents
- [Claude Code (In-Editor)](/docs/agents/claude) — Interactive assistant guide
