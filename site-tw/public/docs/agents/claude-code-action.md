# Claude Code Action — Agentic Guide

> **Mode**: Autonomous GitHub agent (governance-enforced, runs in GitHub Actions)
>
> Looking for the interactive in-editor assistant? See [Claude Code](/docs/agents/claude).

Claude Code Action is an autonomous AI agent that runs via anthropics/claude-code-action@v1 in GitHub Actions. It's triggered by issues, PR comments, or scheduled workflows and operates **without human interaction** until PR review.

MaintainabilityAI governs Claude Code Action through **The Red Queen** — a three-layer governance stack that enforces your architecture constraints deterministically, not as suggestions.

---

## How MaintainabilityAI Governs It

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 32px; margin: 32px 0;">
<div style="display: grid; grid-template-rows: auto auto auto; gap: 16px; max-width: 700px; margin: 0 auto;">
<div style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.4); border-radius: 10px; padding: 20px;">
<div style="font-size: 16px; font-weight: 700; color: #7dd3fc;">Layer 1: The Grin (MCP Server)</div>
<div style="color: #94a3b8; font-size: 13px; margin-top: 8px;">Exposes your governance mesh as queryable MCP resources and tools. Claude Code Action gets full architecture context — models, scores, threats, controls, flows — in a single call.</div>
</div>
<div style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 10px; padding: 20px;">
<div style="font-size: 16px; font-weight: 700; color: #c4b5fd;">Layer 2: NeMo Guardrails (Colang 2.0)</div>
<div style="color: #94a3b8; font-size: 13px; margin-top: 8px;">NVIDIA's Colang 2.0 DSL enforces governance constraints as <strong>state machines</strong>. CALM flows, NIST controls, interface contracts, and threat model mitigations are enforced deterministically. The agent <strong>cannot</strong> bypass a flow constraint.</div>
</div>
<div style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 10px; padding: 20px;">
<div style="font-size: 16px; font-weight: 700; color: #a5b4fc;">Layer 3: Red Queen Policy Engine</div>
<div style="color: #94a3b8; font-size: 13px; margin-top: 8px;">Score-driven agent orchestration. Permission tiers, dynamic CLAUDE.md generation, multi-agent review boards, cross-repo governance, and feedback loops. Governance scores become the control plane for agent behavior.</div>
</div>
</div>
</div>

Unlike in-editor Claude Code where a human reviews each change, Claude Code Action is **deterministically governed**. NeMo Guardrails enforce your architecture as state machines — the agent literally cannot create connections not declared in your CALM model.

---

## Configuration Files

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; grid-template-columns: auto 1fr; gap: 12px 20px; font-size: 14px;">
<div style="color: #7dd3fc; font-weight: 600;">.mcp.json</div>
<div style="color: #94a3b8;">MCP server connection to The Grin</div>
<div style="color: #7dd3fc; font-weight: 600;">CLAUDE.md</div>
<div style="color: #94a3b8;">Agent instructions — dynamically generated per-BAR by Red Queen based on governance scores</div>
<div style="color: #7dd3fc; font-weight: 600;">.claude/settings.json</div>
<div style="color: #94a3b8;">Permission settings (allowed tools, edit permissions)</div>
<div style="color: #7dd3fc; font-weight: 600;">AGENTS.md</div>
<div style="color: #94a3b8;">Shared instructions read by both Claude Code Action and Copilot Coding Agent</div>
</div>

</div>

The Red Queen generates CLAUDE.md dynamically based on the BAR's governance scores. A BAR scoring 85% gets a permissive CLAUDE.md (auto-edit mode). A BAR scoring 40% gets a restrictive one (plan mode, mandatory reviews).

---

## MCP Resources (calm://)

Claude Code Action can read **resources** — rich, structured data from your governance mesh:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; grid-template-columns: auto auto 1fr; gap: 8px 20px; font-size: 13px;">
<div style="color: #e2e8f0; font-weight: 600;">Portfolio Summary</div>
<div style="color: #7dd3fc;">calm://portfolio</div>
<div style="color: #94a3b8;">All BARs with scores and health indicators</div>
<div style="color: #e2e8f0; font-weight: 600;">Platform List</div>
<div style="color: #7dd3fc;">calm://portfolio/platforms</div>
<div style="color: #94a3b8;">Platforms with aggregated scores</div>
<div style="color: #e2e8f0; font-weight: 600;">Platform Detail</div>
<div style="color: #7dd3fc;">calm://platforms/\{id\}</div>
<div style="color: #94a3b8;">BARs within a specific platform</div>
<div style="color: #e2e8f0; font-weight: 600;">BAR Summary</div>
<div style="color: #7dd3fc;">calm://bars/\{id\}</div>
<div style="color: #94a3b8;">Scores, metadata, linked BARs</div>
<div style="color: #e2e8f0; font-weight: 600;">Architecture</div>
<div style="color: #7dd3fc;">calm://bars/\{id\}/architecture</div>
<div style="color: #94a3b8;">Full CALM 1.2 JSON model</div>
<div style="color: #e2e8f0; font-weight: 600;">Scores</div>
<div style="color: #7dd3fc;">calm://bars/\{id\}/scores</div>
<div style="color: #94a3b8;">Four-pillar scores with history</div>
<div style="color: #e2e8f0; font-weight: 600;">Threats</div>
<div style="color: #7dd3fc;">calm://bars/\{id\}/threats</div>
<div style="color: #94a3b8;">STRIDE threat model</div>
<div style="color: #e2e8f0; font-weight: 600;">Controls</div>
<div style="color: #7dd3fc;">calm://bars/\{id\}/controls</div>
<div style="color: #94a3b8;">NIST-mapped security controls</div>
<div style="color: #e2e8f0; font-weight: 600;">Flows</div>
<div style="color: #7dd3fc;">calm://bars/\{id\}/flows</div>
<div style="color: #94a3b8;">CALM flows and relationships</div>
</div>

</div>

**Note**: Copilot Coding Agent does NOT have access to resources — only tools. This is Claude Code Action's unique advantage for architecture-aware work.

---

## MCP Tools

Both Claude Code Action and Copilot Coding Agent call the same tools:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; grid-template-columns: auto auto 1fr; gap: 8px 20px; font-size: 13px;">
<div style="color: #e2e8f0; font-weight: 600;">find\_bars</div>
<div style="color: #94a3b8;">Query</div>
<div style="color: #94a3b8;">Search BARs by name, platform, criticality, score range</div>
<div style="color: #e2e8f0; font-weight: 600;">get\_bar\_context</div>
<div style="color: #94a3b8;">Query</div>
<div style="color: #94a3b8;">Comprehensive context bundle (architecture, scores, threats, ADRs, controls, flows)</div>
<div style="color: #e2e8f0; font-weight: 600;">blast\_radius</div>
<div style="color: #94a3b8;">Analysis</div>
<div style="color: #94a3b8;">Downstream impact analysis across relationships and BARs</div>
<div style="color: #e2e8f0; font-weight: 600;">governance\_gaps</div>
<div style="color: #94a3b8;">Analysis</div>
<div style="color: #94a3b8;">Missing artifacts, weak scores, overdue reviews</div>
<div style="color: #e2e8f0; font-weight: 600;">flow\_impact</div>
<div style="color: #94a3b8;">Analysis</div>
<div style="color: #94a3b8;">Downstream impact of a change on linked BARs</div>
<div style="color: #e2e8f0; font-weight: 600;">get\_orchestration\_decision</div>
<div style="color: #94a3b8;">Query</div>
<div style="color: #94a3b8;">Full Red Queen decision for a BAR (tier, permissions, prompt packs)</div>
<div style="color: #4ade80; font-weight: 700;">validate\_action</div>
<div style="color: #4ade80; font-weight: 600;">Enforce</div>
<div style="color: #94a3b8;">NeMo-backed validation against CALM flows, controls, interface contracts</div>
<div style="color: #4ade80; font-weight: 700;">validate\_interface\_contract</div>
<div style="color: #4ade80; font-weight: 600;">Enforce</div>
<div style="color: #94a3b8;">Cross-repo interface adherence validation</div>
</div>

</div>

Enforcement tools return **Allow**, **Conditional** (with requirements), or **Deny** (with reason and correct path).

---

## Permission Tiers

Governance scores directly drive agent autonomy:

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 32px; margin: 32px 0;">
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;">
<div style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; padding: 20px;">
<div style="font-size: 14px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Autonomous</div>
<div style="font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">80-100%</div>
<div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">Auto-edit mode. Can edit src/\*\*, run tests/lint/build. NeMo Guardrails still enforce flow and control constraints.</div>
</div>
<div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 20px;">
<div style="font-size: 14px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Supervised</div>
<div style="font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">50-79%</div>
<div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">Ask-edit mode. Requires human approval. OWASP and STRIDE packs auto-injected for weak pillars.</div>
</div>
<div style="background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 12px; padding: 20px;">
<div style="font-size: 14px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Restricted</div>
<div style="font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">0-49%</div>
<div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">Plan mode only. 2 agent reviews + human approval. NeMo blocks infrastructure changes entirely.</div>
</div>
</div>
</div>

**Improve your governance scores, and the agent earns more autonomy.** Governance becomes a force multiplier, not a bureaucratic tax.

---

## Five NeMo Guardrails

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; gap: 16px;">
<div style="display: flex; gap: 16px; align-items: baseline;">
<div style="color: #c4b5fd; font-weight: 700; font-size: 14px; min-width: 160px;">Flow Constraints</div>
<div style="color: #94a3b8; font-size: 13px;">CALM flow transitions are law. No undeclared connections between components.</div>
</div>
<div style="display: flex; gap: 16px; align-items: baseline;">
<div style="color: #c4b5fd; font-weight: 700; font-size: 14px; min-width: 160px;">Control Adherence</div>
<div style="color: #94a3b8; font-size: 13px;">NIST controls enforced. No endpoint without authentication if control requires it.</div>
</div>
<div style="display: flex; gap: 16px; align-items: baseline;">
<div style="color: #c4b5fd; font-weight: 700; font-size: 14px; min-width: 160px;">Interface Contracts</div>
<div style="color: #94a3b8; font-size: 13px;">Cross-repo semantics respected. Frontend changes must match the API's interface spec.</div>
</div>
<div style="display: flex; gap: 16px; align-items: baseline;">
<div style="color: #c4b5fd; font-weight: 700; font-size: 14px; min-width: 160px;">Threat Model</div>
<div style="color: #94a3b8; font-size: 13px;">STRIDE mitigations validated. Changes introducing new threats are flagged or blocked.</div>
</div>
<div style="display: flex; gap: 16px; align-items: baseline;">
<div style="color: #c4b5fd; font-weight: 700; font-size: 14px; min-width: 160px;">Permission Tiers</div>
<div style="color: #94a3b8; font-size: 13px;">Score-based boundaries. Restricted-tier agents cannot modify infrastructure.</div>
</div>
</div>

</div>

All enforcement is **deterministic** — finite state machines evaluating the CALM model, not an LLM judging whether a change is "okay."

---

## Cross-Repo Governance

When your CALM model declares a flow across repositories (e.g., checkout-ui → order-api → order-database), the Red Queen understands the full dependency graph.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; gap: 16px;">
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #334155;">
<div style="color: #e2e8f0; font-size: 14px;">Frontend calls undeclared API endpoint</div>
<div><span style="color: #f87171; font-weight: 700;">Denied</span> <span style="color: #94a3b8; font-size: 13px;">— interface doesn't include that endpoint</span></div>
</div>
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #334155;">
<div style="color: #e2e8f0; font-size: 14px;">API changes response format</div>
<div><span style="color: #fbbf24; font-weight: 700;">Conditional</span> <span style="color: #94a3b8; font-size: 13px;">— downstream BAR consumes this interface, update it first</span></div>
</div>
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #334155;">
<div style="color: #e2e8f0; font-size: 14px;">Database drops a column</div>
<div><span style="color: #f87171; font-weight: 700;">Denied</span> <span style="color: #94a3b8; font-size: 13px;">— blast radius: 4 nodes, 2 BARs. Requires migration ADR.</span></div>
</div>
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
<div style="color: #e2e8f0; font-size: 14px;">New service without auth middleware</div>
<div><span style="color: #f87171; font-weight: 700;">Blocked</span> <span style="color: #94a3b8; font-size: 13px;">— control requires OAuth2 on all endpoints</span></div>
</div>
</div>

</div>

---

## GitHub Actions Workflow

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #6366f1;">

<p style="color: #6366f1; font-weight: 700; font-size: 14px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">claude-code-governance.yml</p>

<div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 20px; font-size: 13px; color: #e2e8f0; line-height: 1.8; font-family: monospace;">

<span style="color: #7dd3fc;">name:</span> Claude Code Governance<br/>
<span style="color: #7dd3fc;">on:</span><br/>
&nbsp;&nbsp;<span style="color: #7dd3fc;">issues:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">types:</span> [opened, labeled]<br/>
<br/>
<span style="color: #7dd3fc;">jobs:</span><br/>
&nbsp;&nbsp;<span style="color: #7dd3fc;">claude-fix:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">runs-on:</span> ubuntu-latest<br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">steps:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style="color: #7dd3fc;">uses:</span> actions/checkout@v4<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style="color: #7dd3fc;">name:</span> Start Red Queen MCP Server<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">run:</span> |<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;npm install -g @maintainabilityai/red-queen-mcp<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;red-queen-mcp --mesh-path ./governance-mesh --port 3100 &amp;<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style="color: #7dd3fc;">name:</span> Start NeMo Guardrails<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">run:</span> |<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;pip install nemoguardrails<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;nemoguardrails server --config ./guardrails --port 8100 &amp;<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style="color: #7dd3fc;">name:</span> Run Claude Code Action<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">uses:</span> anthropics/claude-code-action@v1<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">with:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">anthropic\_api\_key:</span> $\{\{ secrets.ANTHROPIC\_API\_KEY \}\}

</div>

</div>

The MCP server and NeMo sidecar start before Claude Code Action runs. The agent calls validate\_action before any structural change, and NeMo enforces governance constraints deterministically.

---

## What Claude Code Action Has That In-Editor Doesn't

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; grid-template-columns: 1fr auto auto; gap: 8px 24px; font-size: 13px;">
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155;">Capability</div>
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155; text-align: center;">In-Editor</div>
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155; text-align: center;">Agentic</div>

<div style="color: #e2e8f0;">MCP Resources (calm://)</div>
<div style="text-align: center;">❌</div>
<div style="text-align: center;">✅</div>

<div style="color: #e2e8f0;">MCP Prompts</div>
<div style="text-align: center;">❌</div>
<div style="text-align: center;">✅</div>

<div style="color: #e2e8f0;">NeMo Guardrails</div>
<div style="text-align: center;">❌</div>
<div style="text-align: center;">✅</div>

<div style="color: #e2e8f0;">PreToolUse/PostToolUse Hooks</div>
<div style="text-align: center;">❌</div>
<div style="text-align: center;">✅</div>

<div style="color: #e2e8f0;">Dynamic CLAUDE.md</div>
<div style="text-align: center;">❌</div>
<div style="text-align: center;">✅</div>

<div style="color: #e2e8f0;">Cross-repo enforcement</div>
<div style="text-align: center;">❌</div>
<div style="text-align: center;">✅</div>

<div style="color: #e2e8f0;">Permission tiers</div>
<div style="text-align: center;">❌</div>
<div style="text-align: center;">✅</div>
</div>

</div>

---

## Further Reading

- [Impossible Things](/docs/impossible-things) — The Red Queen vision and full architecture
- [Copilot Coding Agent](/docs/agents/copilot-coding-agent) — The other governed agent
- [Multi-Agent Orchestration](/docs/agents/multi-agent) — Coordinating multiple agents
- [Claude Code (In-Editor)](/docs/agents/claude) — Interactive assistant guide
