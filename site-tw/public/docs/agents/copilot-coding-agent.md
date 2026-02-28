# Copilot Coding Agent — Agentic Guide

> **Mode**: Autonomous GitHub agent (governance-enforced, runs in GitHub Actions)
>
> Looking for the interactive in-editor assistant? See [GitHub Copilot](/docs/agents/copilot).

GitHub Copilot Coding Agent is an autonomous AI agent that runs on GitHub — triggered by issues, PR comments, or scheduled workflows. Like Claude Code Action, MaintainabilityAI governs it through **The Red Queen**.

---

## How It Works

The Copilot Coding Agent receives an issue or task, checks out your code, and implements changes autonomously. MaintainabilityAI adds governance enforcement through the same three-layer stack used by Claude Code Action:

1. **The Grin (MCP Server)** — Exposes governance mesh as queryable tools
2. **NeMo Guardrails** — Deterministic enforcement via Colang 2.0 state machines
3. **Red Queen Policy Engine** — Score-driven agent orchestration

Both agents call the **same validate\_action tool** and get **identical governance enforcement**. One governance mesh, two agents.

---

## Configuration Files

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; grid-template-columns: auto 1fr; gap: 12px 20px; font-size: 14px;">
<div style="color: #7dd3fc; font-weight: 600;">Repo Settings UI</div>
<div style="color: #94a3b8;">MCP server configuration (JSON) — equivalent to Claude's .mcp.json</div>
<div style="color: #7dd3fc; font-weight: 600;">AGENTS.md</div>
<div style="color: #94a3b8;">Shared agent instructions (read by both Claude and Copilot agents)</div>
<div style="color: #7dd3fc; font-weight: 600;">copilot-instructions.md</div>
<div style="color: #94a3b8;">Optional Copilot-specific instructions</div>
<div style="color: #7dd3fc; font-weight: 600;">copilot-setup-steps.yml</div>
<div style="color: #94a3b8;">Environment setup workflow — installs MCP server + NeMo sidecar</div>
</div>

</div>

### Environment Setup

The copilot-setup-steps.yml file runs before the agent starts, setting up the governance infrastructure:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

<p style="color: #10b981; font-weight: 700; font-size: 14px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">copilot-setup-steps.yml</p>

<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 20px; font-size: 13px; color: #e2e8f0; line-height: 1.8; font-family: monospace;">

<span style="color: #7dd3fc;">name:</span> Copilot Setup Steps<br/>
<span style="color: #7dd3fc;">on:</span> workflow\_dispatch<br/>
<br/>
<span style="color: #7dd3fc;">jobs:</span><br/>
&nbsp;&nbsp;<span style="color: #7dd3fc;">setup:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">runs-on:</span> ubuntu-latest<br/>
&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">steps:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style="color: #7dd3fc;">uses:</span> actions/checkout@v4<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style="color: #7dd3fc;">name:</span> Checkout Governance Mesh<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">uses:</span> actions/checkout@v4<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">with:</span><br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">repository:</span> your-org/governance-mesh<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">path:</span> governance-mesh<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">token:</span> $\{\{ secrets.COPILOT\_MCP\_MESH\_TOKEN \}\}<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style="color: #7dd3fc;">name:</span> Start Red Queen MCP Server<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">run:</span> |<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;npm install -g @maintainabilityai/red-queen-mcp<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;red-queen-mcp --mesh-path ./governance-mesh --port 3100 &amp;<br/>
<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- <span style="color: #7dd3fc;">name:</span> Start NeMo Guardrails<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color: #7dd3fc;">run:</span> |<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;pip install nemoguardrails<br/>
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;nemoguardrails server --config ./guardrails --port 8100 &amp;

</div>

</div>

---

## Key Differences from Claude Code Action

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; grid-template-columns: 1fr auto auto; gap: 8px 24px; font-size: 13px;">
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155;">Capability</div>
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155; text-align: center;">Claude Code Action</div>
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155; text-align: center;">Copilot Coding Agent</div>

<div style="color: #e2e8f0;">MCP Resources (calm://)</div>
<div style="text-align: center;">✅ Full access</div>
<div style="text-align: center;">❌</div>

<div style="color: #e2e8f0;">MCP Prompts</div>
<div style="text-align: center;">✅ Governance-aware</div>
<div style="text-align: center;">❌</div>

<div style="color: #e2e8f0;">MCP Tools</div>
<div style="text-align: center;">✅ All 13 tools</div>
<div style="text-align: center;">✅ All 13 tools</div>

<div style="color: #e2e8f0;">Config mechanism</div>
<div style="text-align: center;">.mcp.json file</div>
<div style="text-align: center;">Repo Settings UI (JSON)</div>

<div style="color: #e2e8f0;">Agent instructions</div>
<div style="text-align: center;">CLAUDE.md + AGENTS.md</div>
<div style="text-align: center;">copilot-instructions.md + AGENTS.md</div>

<div style="color: #e2e8f0;">Hook support</div>
<div style="text-align: center;">✅ PreToolUse/PostToolUse</div>
<div style="text-align: center;">❌</div>

<div style="color: #e2e8f0;">Environment setup</div>
<div style="text-align: center;">Built-in</div>
<div style="text-align: center;">Via copilot-setup-steps.yml</div>

<div style="color: #e2e8f0;">NeMo enforcement</div>
<div style="text-align: center;">✅ Identical</div>
<div style="text-align: center;">✅ Identical</div>
</div>

</div>

**The critical difference**: Copilot Coding Agent supports MCP **tools only** — no resources, no prompts. It can call validate\_action and get\_bar\_context (tools), but cannot read calm://bars/\{id\}/architecture (resource) directly. The get\_bar\_context tool compensates by bundling architecture data into the tool response.

---

## MCP Tools Available

Same tools as Claude Code Action:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; grid-template-columns: auto auto 1fr; gap: 8px 20px; font-size: 13px;">
<div style="color: #e2e8f0; font-weight: 600;">find\_bars</div>
<div style="color: #94a3b8;">Query</div>
<div style="color: #94a3b8;">Search BARs by name, platform, criticality, score range</div>
<div style="color: #e2e8f0; font-weight: 600;">get\_bar\_context</div>
<div style="color: #94a3b8;">Query</div>
<div style="color: #94a3b8;">Architecture, scores, threats, ADRs, controls, flows — all in one call</div>
<div style="color: #e2e8f0; font-weight: 600;">blast\_radius</div>
<div style="color: #94a3b8;">Analysis</div>
<div style="color: #94a3b8;">Downstream impact across relationships and BARs</div>
<div style="color: #e2e8f0; font-weight: 600;">governance\_gaps</div>
<div style="color: #94a3b8;">Analysis</div>
<div style="color: #94a3b8;">Missing artifacts, weak scores, overdue reviews</div>
<div style="color: #e2e8f0; font-weight: 600;">flow\_impact</div>
<div style="color: #94a3b8;">Analysis</div>
<div style="color: #94a3b8;">Downstream impact on linked BARs</div>
<div style="color: #e2e8f0; font-weight: 600;">get\_orchestration\_decision</div>
<div style="color: #94a3b8;">Query</div>
<div style="color: #94a3b8;">Red Queen decision (tier, permissions, prompt packs)</div>
<div style="color: #4ade80; font-weight: 700;">validate\_action</div>
<div style="color: #4ade80; font-weight: 600;">Enforce</div>
<div style="color: #94a3b8;">NeMo-backed validation against CALM model</div>
<div style="color: #4ade80; font-weight: 700;">validate\_interface\_contract</div>
<div style="color: #4ade80; font-weight: 600;">Enforce</div>
<div style="color: #94a3b8;">Cross-repo interface adherence</div>
</div>

</div>

---

## Permission Tiers

Identical to Claude Code Action — governance scores drive agent autonomy:

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 32px; margin: 24px 0;">
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;">
<div style="background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; padding: 20px;">
<div style="font-size: 14px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Autonomous</div>
<div style="font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">80-100%</div>
<div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">Auto-edit mode, can edit src/\*\*, run tests/lint/build</div>
</div>
<div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 20px;">
<div style="font-size: 14px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Supervised</div>
<div style="font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">50-79%</div>
<div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">Requires human approval, OWASP packs auto-injected</div>
</div>
<div style="background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 12px; padding: 20px;">
<div style="font-size: 14px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Restricted</div>
<div style="font-size: 28px; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">0-49%</div>
<div style="color: #94a3b8; font-size: 13px; line-height: 1.6;">Plan mode only, 2 agent reviews + human approval required</div>
</div>
</div>
</div>

---

## Shared AGENTS.md

Both Claude Code Action and Copilot Coding Agent read AGENTS.md for shared governance instructions:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<p style="color: #6EE7F9; font-weight: 700; font-size: 16px; margin: 0 0 16px 0;">Governance Workflow</p>

<p style="color: #e2e8f0; font-size: 14px; line-height: 1.8; margin: 0 0 16px 0;">
Before making changes:<br/>
1. Call get\_bar\_context for architecture, scores, and constraints<br/>
2. Call get\_orchestration\_decision for your permission tier<br/>
3. Call validate\_action before any structural change<br/>
4. Call validate\_interface\_contract for cross-repo changes<br/>
5. Call governance\_gaps() before creating a PR
</p>

<p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
<strong style="color: #4ade80;">Autonomous</strong> (80%+): Implement freely within src/ ·
<strong style="color: #fbbf24;">Supervised</strong> (50-79%): Changes require human review ·
<strong style="color: #f87171;">Restricted</strong> (&lt;50%): Plan first, implement only after approval
</p>

</div>

---

## When to Use Copilot Coding Agent vs Claude Code Action

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #10b981;">
<p style="color: #10b981; font-weight: 700; font-size: 15px; margin: 0 0 12px 0;">Choose Copilot Coding Agent when:</p>
<p style="color: #94a3b8; font-size: 13px; line-height: 1.8; margin: 0;">
- Your team already uses GitHub Copilot<br/>
- The task doesn't require rich architecture context (resources)<br/>
- You want consistent tooling with your in-editor Copilot experience
</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #6366f1;">
<p style="color: #6366f1; font-weight: 700; font-size: 15px; margin: 0 0 12px 0;">Choose Claude Code Action when:</p>
<p style="color: #94a3b8; font-size: 13px; line-height: 1.8; margin: 0;">
- You need full MCP resource access (architecture models, threat data, score history)<br/>
- Cross-repo governance is critical (interface contract validation benefits from resource context)<br/>
- You want PreToolUse/PostToolUse hooks for additional validation
</p>
</div>

</div>

**Either way**: The governance enforcement is identical. Both agents call the same validate\_action tool, hit the same NeMo guardrails, and are governed by the same CALM model.

---

## Further Reading

- [Impossible Things](/docs/impossible-things) — The Red Queen vision and architecture
- [Claude Code Action](/docs/agents/claude-code-action) — The other governed agent
- [Multi-Agent Orchestration](/docs/agents/multi-agent) — Coordinating multiple agents
- [GitHub Copilot (In-Editor)](/docs/agents/copilot) — Interactive assistant guide
