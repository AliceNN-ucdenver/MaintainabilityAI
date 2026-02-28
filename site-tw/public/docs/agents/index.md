# AI Agent Guides

MaintainabilityAI works with two categories of AI: **in-editor assistants** you interact with directly, and **agentic AI** that operates autonomously on GitHub. Each requires different guidance, governance, and trust models.

---

## In-Editor AI Assistants

<div style="font-size: 14px; color: #94a3b8; margin-bottom: 24px;">Human-in-the-loop. IDE-integrated. Interactive. You review every change.</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 0 0 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid #334155; display: flex; flex-direction: column;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: white;">C</div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/claude" style="color: #f1f5f9; text-decoration: none;">Claude Code</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Complex Refactoring &amp; Testing</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Deep codebase understanding for multi-file refactoring, comprehensive test generation with attack vectors, and security code review.</p>
  <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
  <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 16px 0;">Large-scale security refactoring · Multi-file coordination · Test generation · Technical debt analysis</p>
  <a href="/docs/agents/claude" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: auto; align-self: flex-start;">View Guide →</a>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid #334155; display: flex; flex-direction: column;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: white;">⚡</div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/copilot" style="color: #f1f5f9; text-decoration: none;">GitHub Copilot</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">In-Editor Code Generation</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">IDE-integrated real-time code completion with #codebase context. Fast iteration on single functions with security constraints.</p>
  <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
  <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 16px 0;">In-editor secure completions · Pattern following · Quick fixes · Single-function implementation</p>
  <a href="/docs/agents/copilot" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: auto; align-self: flex-start;">View Guide →</a>
</div>

</div>

---

## Agentic AI (Autonomous)

<div style="font-size: 14px; color: #94a3b8; margin-bottom: 24px;">Autonomous. GitHub-native. Governance-enforced by <a href="/docs/impossible-things" style="color: #818cf8;">The Red Queen</a>.</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 0 0 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid rgba(99, 102, 241, 0.5); box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); display: flex; flex-direction: column;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: white;">🤖</div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/claude-code-action" style="color: #f1f5f9; text-decoration: none;">Claude Code Action</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #818cf8; font-weight: 600;">Governed by The Red Queen</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Autonomous GitHub Actions agent with full MCP access — resources, tools, and prompts. Deterministic governance enforcement via NeMo Guardrails.</p>
  <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
  <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 16px 0;">Autonomous issue remediation · Governed PRs · Cross-repo enforcement · CI/CD governance</p>
  <a href="/docs/agents/claude-code-action" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: auto; align-self: flex-start;">View Guide →</a>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid rgba(74, 222, 128, 0.5); box-shadow: 0 0 20px rgba(74, 222, 128, 0.15); display: flex; flex-direction: column;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #047857 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: white;">🤖</div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/copilot-coding-agent" style="color: #f1f5f9; text-decoration: none;">Copilot Coding Agent</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #818cf8; font-weight: 600;">Governed by The Red Queen</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Autonomous GitHub agent with MCP tools (no resources/prompts). Same governance enforcement, different config mechanism.</p>
  <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
  <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 16px 0;">Autonomous issue remediation · Governed PRs · Teams already using Copilot</p>
  <a href="/docs/agents/copilot-coding-agent" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #047857 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: auto; align-self: flex-start;">View Guide →</a>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid #6EE7F9; box-shadow: 0 0 20px rgba(110, 231, 249, 0.2); display: flex; flex-direction: column;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; min-width: 60px; min-height: 60px; border-radius: 50%; overflow: hidden; border: 3px solid #6EE7F9; display: flex; align-items: center; justify-content: center;">
      <img src="/images/alice-bot.png" alt="Alice Bot" style="width: 100%; height: 100%; object-fit: cover; object-position: center center; margin: 0 !important; padding: 0; display: block;" />
    </div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/alice" style="color: #f1f5f9; text-decoration: none;">Alice Agent 🐰</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #6EE7F9; font-weight: 600;">The Good Maintainer</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Autonomous security remediation with two-phase workflow: Curiosity → Approval → Implementation. Built on Claude Code.</p>
  <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
  <p style="color: #e2e8f0; font-size: 14px; margin: 0 0 16px 0;">CodeQL remediation · Legacy refactoring · Technical debt reduction · CI/CD security automation</p>
  <a href="/docs/agents/alice" style="display: inline-block; background: linear-gradient(135deg, #6EE7F9 0%, #22d3ee 100%); color: #0f172a; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: auto; align-self: flex-start;">Enter Wonderland →</a>
</div>

</div>

---

## Choosing the Right Mode

### In-Editor vs Agentic

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 24px; font-size: 13px;">
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155;"></div>
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155;">In-Editor (Claude Code, Copilot)</div>
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155;">Agentic (Code Action, Coding Agent, Alice)</div>

<div style="color: #e2e8f0; font-weight: 600;">Interaction</div>
<div style="color: #94a3b8;">Human reviews each change</div>
<div style="color: #94a3b8;">Autonomous until PR review</div>

<div style="color: #e2e8f0; font-weight: 600;">Where it runs</div>
<div style="color: #94a3b8;">VS Code / IDE</div>
<div style="color: #94a3b8;">GitHub Actions</div>

<div style="color: #e2e8f0; font-weight: 600;">Governance</div>
<div style="color: #94a3b8;">Prompt packs + human judgment</div>
<div style="color: #94a3b8;">The Red Queen: MCP + NeMo Guardrails</div>

<div style="color: #e2e8f0; font-weight: 600;">Enforcement</div>
<div style="color: #94a3b8;">Advisory (prompts guide)</div>
<div style="color: #94a3b8;">Deterministic (guardrails enforce)</div>

<div style="color: #e2e8f0; font-weight: 600;">Best for</div>
<div style="color: #94a3b8;">Interactive development, learning, complex decisions</div>
<div style="color: #94a3b8;">Issue remediation, bulk fixes, CI/CD automation</div>
</div>

</div>

### By Task Type

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #334155;">

<div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px 24px; font-size: 13px;">
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155;">Task</div>
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155;">Best Choice</div>
<div style="color: #94a3b8; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #334155;">Why</div>

<div style="color: #e2e8f0;">Multi-file refactoring</div>
<div style="color: #7dd3fc;">Claude Code (in-editor)</div>
<div style="color: #94a3b8;">Deep codebase understanding, interactive</div>

<div style="color: #e2e8f0;">Single function fix</div>
<div style="color: #7dd3fc;">Copilot (in-editor)</div>
<div style="color: #94a3b8;">Fast, pattern-aware</div>

<div style="color: #e2e8f0;">Test generation</div>
<div style="color: #7dd3fc;">Claude Code (in-editor)</div>
<div style="color: #94a3b8;">Comprehensive attack vectors</div>

<div style="color: #e2e8f0;">Issue remediation</div>
<div style="color: #c4b5fd;">Claude Code Action / Copilot Coding Agent</div>
<div style="color: #94a3b8;">Autonomous, governed</div>

<div style="color: #e2e8f0;">Security bulk fixes</div>
<div style="color: #6EE7F9;">Alice Agent</div>
<div style="color: #94a3b8;">Two-phase workflow, human approval</div>

<div style="color: #e2e8f0;">Cross-repo changes</div>
<div style="color: #c4b5fd;">Claude Code Action</div>
<div style="color: #94a3b8;">Full MCP resources + interface contract validation</div>

<div style="color: #e2e8f0;">Dependency upgrades</div>
<div style="color: #7dd3fc;">Claude Code (in-editor)</div>
<div style="color: #94a3b8;">Breaking change analysis</div>
</div>

</div>

### Orchestrating Multiple Agents

For complex workflows requiring multiple agents in sequence or parallel, see the [Multi-Agent Orchestration Guide](/docs/agents/multi-agent).

---

## Further Reading

- [OWASP Prompt Packs](/docs/prompts/owasp/) — Security-first prompts for all agents
- [SDLC Framework](/docs/sdlc/) — 6-phase framework integration
- [Golden Rules](/docs/governance/vibe-golden-rules) — Governance principles
- [Impossible Things](/docs/impossible-things) — The Red Queen vision and architecture
