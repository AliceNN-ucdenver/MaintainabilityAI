# MaintainabilityAI SDLC Framework

> **Purpose**: A comprehensive, security-first Software Development Lifecycle for AI-assisted engineering.

This framework integrates **OWASP Top 10**, **Evolutionary Architecture** fitness functions, and **multi-agent AI orchestration** into a complete development lifecycle that maintains both velocity and security.

---

## The Engineering Imperative

<div style="margin-bottom: 16px;">

In a world where AI can generate code at unprecedented speed, the critical question isn't whether to use AI. It's how to maintain engineering excellence while leveraging it.

</div>

<div style="margin-bottom: 16px;">

[Recent research shows](https://arxiv.org/abs/2502.11844) that **62% of AI-generated code contains design flaws or security vulnerabilities**, even with the latest models. This isn't a temporary limitation. It's the fundamental nature of pattern-based learning systems.

</div>

<div style="margin-bottom: 16px;">

The organizations that win won't be those that generate the most code or adopt AI fastest. They'll be **those that maintain engineering discipline while leveraging AI's capabilities**.

</div>

<div style="margin-bottom: 16px;">

Your competitive advantage lies not in the speed of code generation but in the quality of architectural decisions, the robustness of security implementations, and the elegance of solutions that only experienced engineers can provide.

</div>

### The 70/30 Rule

As documented in [Addy Osmani's *Beyond Vibe Coding*](https://www.oreilly.com/library/view/beyond-vibe-coding/9798341634749/) (O'Reilly, 2025), every developer using AI tools has discovered the same pattern: **AI can get you 70% of the way there, but the last 30% requires human expertise**.

This framework operationalizes that insight:

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #3b82f6;">
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
<div>
<div style="font-size: 18px; font-weight: 700; color: #4ade80; margin-bottom: 12px;">✓ What AI Handles Well (The Commoditized 70%)</div>
<ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
<li>Boilerplate code and scaffolding</li>
<li>Standard CRUD operations</li>
<li>Common design patterns</li>
<li>API endpoint generation</li>
<li>Basic test creation</li>
<li>Documentation templates</li>
<li>Code formatting consistency</li>
<li>Simple refactoring tasks</li>
</ul>
</div>
<div>
<div style="font-size: 18px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">⚠️ What Requires Human Expertise (The Differentiating 30%)</div>
<ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
<li>Edge case identification and handling</li>
<li>Security architecture and threat modeling</li>
<li>Performance optimization at scale</li>
<li>Business logic validation</li>
<li>System integration boundaries</li>
<li>Architectural decisions</li>
<li>Technical debt management</li>
<li>Regulatory compliance implementation</li>
</ul>
</div>
</div>
</div>

**This framework ensures humans own the architecture and governance gates** (where systems succeed or fail), while AI handles implementation and verification (where speed matters most). Like building architects who ensure structures are safe, sound, and secure at scale, your engineering architects maintain oversight at critical decision points.

---

## SDLC Overview

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; margin: 32px 0; border: 1px solid rgba(100, 116, 139, 0.3);">
<div style="text-align: center; margin-bottom: 32px;">
<div style="font-size: 28px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">6-Phase Continuous Development Cycle</div>
<div style="font-size: 16px; color: #cbd5e1;">Security gates, AI integration, and fitness functions at every phase</div>
</div>

```mermaid
flowchart LR
    P1["1 Design"] --> P2["2 Implementation"]
    P2 --> P3["3 Verification"]
    P3 --> P4["4 Governance"]
    P4 --> P5["5 Deployment"]
    P5 --> P6["6 Evolution"]
    P6 -->|"Continuous Learning"| P1
```

<div style="text-align: center; padding: 12px 0;">
<div style="font-size: 14px; color: #cbd5e1;">Phase 6 feeds continuous learnings back to Phase 1</div>
</div>
</div>

---

## Quick Start

<div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid rgba(59, 130, 246, 0.3);">
<div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 16px;">Get started in 3 steps</div>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">

<div style="background: rgba(59, 130, 246, 0.1); border-radius: 8px; padding: 16px; border-left: 3px solid #3b82f6;">
  <div style="font-size: 13px; color: #93c5fd; font-weight: 700; margin-bottom: 4px;">Step 1: Read the Framework</div>
  <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">Start with <a href="./phase1-design" style="color: #93c5fd;">Phase 1: Design</a> to understand how threat modeling, OWASP mapping, and fitness functions shape your feature before code is written.</div>
</div>

<div style="background: rgba(245, 158, 11, 0.1); border-radius: 8px; padding: 16px; border-left: 3px solid #f59e0b;">
  <div style="font-size: 13px; color: #fcd34d; font-weight: 700; margin-bottom: 4px;">Step 2: Scaffold with Cheshire</div>
  <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">Install the <a href="https://marketplace.visualstudio.com/items?itemName=chiefarcheologist.maintainabilityai" style="color: #fcd34d;">VSCode extension</a> and run <strong>Scaffold SDLC Structure</strong> to set up CLAUDE.md, CodeQL, fitness functions, and PR templates.</div>
</div>

<div style="background: rgba(168, 85, 247, 0.1); border-radius: 8px; padding: 16px; border-left: 3px solid #a855f7;">
  <div style="font-size: 13px; color: #d8b4fe; font-weight: 700; margin-bottom: 4px;">Step 3: Follow the Phases</div>
  <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">Walk through phases 2-6 for each feature: implement with AI agents, verify with scanners, review with Golden Rules, deploy, and iterate.</div>
</div>

</div>
</div>

## MaintainabilityAI — The VSCode Extension

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; margin: 32px 0; border: 1px solid rgba(139, 92, 246, 0.3);">

<div style="display: flex; align-items: center; gap: 32px; flex-wrap: wrap; margin-bottom: 32px;">

<div style="flex-shrink: 0; text-align: center;">
  <img src="../../images/cheshire.png" alt="Cheshire Cat — The SDLC Guide" style="width: 140px; height: 140px; border-radius: 16px; border: 2px solid #a78bfa; box-shadow: 0 6px 24px rgba(139, 92, 246, 0.4);" />
</div>

<div style="flex: 1; min-width: 280px;">
  <div style="font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Two panels. One mission. Ship secure code.</div>
  <div style="font-size: 15px; color: #cbd5e1; line-height: 1.7; margin-bottom: 16px;">
    A <strong style="color: #c4b5fd;">VSCode extension</strong> that brings the MaintainabilityAI framework directly into your editor. The <strong style="color: #93c5fd;">Looking Glass</strong> governs your portfolio — architecture, scoring, and AI-assisted analysis. The <strong style="color: #c4b5fd;">Cheshire Cat</strong> secures your code — scaffolding, scorecards, and agent-driven remediation.
  </div>
  <div style="display: inline-block; background: rgba(139, 92, 246, 0.2); color: #c4b5fd; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; border: 1px solid rgba(139, 92, 246, 0.3);">v0.1.4</div>
</div>

</div>

<!-- ═══════════════════════════════════════════════ -->
<!-- LOOKING GLASS — Governance & Architecture      -->
<!-- ═══════════════════════════════════════════════ -->

<div id="looking-glass" style="margin-bottom: 12px;">
  <div style="font-size: 20px; font-weight: 700; color: #93c5fd; margin-bottom: 4px;">The Looking Glass — Governance & Architecture</div>
  <div style="font-size: 14px; color: #94a3b8;">The mirror that shows you what your organization really looks like.</div>
</div>

<div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); border-radius: 12px; padding: 16px 24px; box-shadow: 0 6px 24px rgba(37, 99, 235, 0.4); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
  <div>
    <div style="color: #f0f9ff; font-size: 16px; font-weight: 700;">🔮 Watch Absolem in Action</div>
    <div style="color: #dbeafe; font-size: 13px;">Architecture modeling → governance mesh → AI-assisted analysis</div>
  </div>
  <a href="https://youtu.be/Ua_4Msx2DYQ" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0f172a; color: #93c5fd; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.4); white-space: nowrap;">▶️ Watch the Demo</a>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px;">

<div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6;">
  <h4 style="color: #93c5fd; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">Governance Mesh & Scoring</h4>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">Portfolio → Platform → BAR hierarchy with live governance scoring across four pillars: Architecture, Security, Information Risk, and Operations. Track score history with sparklines, manage ADRs, and sync to git — all from a single dashboard.</p>
</div>

<div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 24px; border-left: 4px solid #2563eb;">
  <h4 style="color: #60a5fa; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">CALM Architecture Diagrams</h4>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">Interactive ReactFlow canvas with ELK.js auto-layout, custom node types for services, databases, actors, and networks. Drag-and-drop palette, inline editing, container collapse, and PNG export. Start from Three-Tier, Event-Driven, or Data Pipeline archetypes.</p>
</div>

<div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 24px; border-left: 4px solid #1d4ed8;">
  <h4 style="color: #818cf8; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">Absolem — AI Governance Assistant</h4>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">A floating chat assistant with 7 commands: drift analysis, component creation, CALM validation, gap analysis, ADR suggestions, image-to-CALM conversion, and freeform architecture questions. Generates structured patches you can preview, accept, or reject.</p>
</div>

</div>

<!-- ═══════════════════════════════════════════════ -->
<!-- CHESHIRE CAT — Code & Security                 -->
<!-- ═══════════════════════════════════════════════ -->

<div id="cheshire-cat" style="margin-top: 40px; margin-bottom: 12px;">
  <div style="font-size: 20px; font-weight: 700; color: #c4b5fd; margin-bottom: 4px;">The Cheshire Cat — Code & Security</div>
  <div style="font-size: 14px; color: #94a3b8;">The grin that stays with your repo long after the session ends.</div>
</div>

<div style="background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); border-radius: 12px; padding: 16px 24px; box-shadow: 0 6px 24px rgba(139, 92, 246, 0.4); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
  <div>
    <div style="color: #0f172a; font-size: 16px; font-weight: 700;">🎥 Watch Cheshire in Action</div>
    <div style="color: #1e293b; font-size: 13px;">Feature description → RCTRO generation → GitHub issue → agent implementation</div>
  </div>
  <a href="https://youtu.be/WtSRfwKrcFU?si=eapuXusdWhIa8Mor" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0f172a; color: #c4b5fd; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.4); white-space: nowrap;">▶️ Watch the Demo</a>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px;">

<div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 24px; border-left: 4px solid #a78bfa;">
  <h4 style="color: #c4b5fd; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">SDLC Scaffolding</h4>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">One command sets up your entire security-first pipeline: CLAUDE.md agent instructions, CodeQL workflows, fitness function automation, PR templates with AI disclosure, and OWASP prompt packs — all tailored to your detected tech stack.</p>
</div>

<div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 24px; border-left: 4px solid #818cf8;">
  <h4 style="color: #a5b4fc; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">Issue Management</h4>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">Describe a feature in plain text and Cheshire generates a complete RCTRO-formatted GitHub issue with collapsible prompt pack guidance, auto-created labels, and implementation zones for both Claude and Copilot.</p>
</div>

<div style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 24px; border-left: 4px solid #6366f1;">
  <h4 style="color: #93c5fd; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">Security Scorecard</h4>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">Six fitness functions score every repo: security compliance, dependency freshness, test coverage, cyclomatic complexity, technical debt, and CI/CD health. Action buttons on every tile let you create remediation issues directly from the dashboard.</p>
</div>

</div>

<div style="margin-top: 24px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 20px 24px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
  <img src="../../images/redqueen.png" alt="The Red Queen" style="width: 200px; height: 200px; border-radius: 12px; border: 2px solid rgba(239, 68, 68, 0.4); flex-shrink: 0;" />
  <div style="flex: 1; min-width: 240px;">
    <div style="font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 6px;">Coming Next: The Red Queen</div>
    <p style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
      Prompts are advisory. Agents can ignore them. The Red Queen adds <strong style="color: #f87171;">deterministic governance enforcement</strong> — an MCP server for architecture awareness, NeMo Guardrails for constraint enforcement, and a policy engine that ties agent autonomy to governance scores.
    </p>
    <a href="/docs/impossible-things#whats-coming-the-red-queen---governance-enforced-agent-intelligence" style="color: #f87171; font-size: 13px; font-weight: 600; text-decoration: none;">Read the Red Queen roadmap →</a>
  </div>
</div>

</div>

---

## SDLC Framework: Phases & Security Gates

<div style="background: linear-gradient(135deg, #0a1628 0%, #1e3a5f 100%); border-radius: 20px; padding: 40px; margin: 32px 0;">

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 30px;">

<!-- Phase 1: Design & Architecture Gates -->
<div style="background: rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; border-left: 4px solid #3b82f6; transition: all 0.3s ease;">
  <h3 style="margin: 0 0 8px 0; font-size: 18px; display: flex; align-items: center; gap: 10px; color: #f1f5f9;">
    <span style="font-size: 24px;">1&#xFE0F;&#x20E3;</span>
    Design & Architecture Gates
  </h3>
  <div style="color: #8a9fb3; font-size: 12px; margin-bottom: 8px; font-style: italic;">The Architectural Layer (100% Human)</div>
  <div style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px; line-height: 1.5;"><strong style="color: #93c5fd;">Purpose:</strong> Requirements gathering, threat modeling with STRIDE, architecture design, OWASP category mapping, fitness function definitions</div>
  <div style="background: rgba(59, 130, 246, 0.15); padding: 8px 12px; border-radius: 6px; margin-bottom: 15px;">
    <div style="font-size: 11px; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Security Gate</div>
    <div style="font-size: 13px; color: #f1f5f9; font-weight: 600;">Threat coverage >95%</div>
  </div>
  <ul style="margin: 0 0 16px 0; padding-left: 20px; list-style: none;">
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Threat modeling for all STRIDE categories
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      OWASP Top 10 risk assessment
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Architecture fitness functions defined
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Security controls blueprint
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      AI assistance boundaries established
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
  </ul>

  <!-- Flow Indicators -->
  <div style="display: flex; gap: 8px; margin-bottom: 12px;">
    <div style="flex: 1; background: linear-gradient(135deg, #065f46 0%, #10b981 100%); border-radius: 6px; padding: 8px 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
      <div style="font-size: 10px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">✓ Success</div>
      <div style="font-size: 12px; color: #f1f5f9; font-weight: 600;">→ Phase 2</div>
    </div>
  </div>

  <a href="./phase1-design" style="display: inline-block; background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">View Phase 1 Details →</a>
</div>

<!-- Phase 2: Implementation Gates -->
<div style="background: rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; border-left: 4px solid #f59e0b; transition: all 0.3s ease;">
  <h3 style="margin: 0 0 8px 0; font-size: 18px; display: flex; align-items: center; gap: 10px; color: #f1f5f9;">
    <span style="font-size: 24px;">2&#xFE0F;&#x20E3;</span>
    Implementation Gates
  </h3>
  <div style="color: #8a9fb3; font-size: 12px; margin-bottom: 8px; font-style: italic;">The 70% Layer (AI-Assisted)</div>
  <div style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px; line-height: 1.5;"><strong style="color: #fcd34d;">Purpose:</strong> Agent selection, OWASP prompt packs, secure code generation, incremental development with local validation</div>
  <div style="background: rgba(245, 158, 11, 0.15); padding: 8px 12px; border-radius: 6px; margin-bottom: 15px;">
    <div style="font-size: 11px; color: #fcd34d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Security Gate</div>
    <div style="font-size: 13px; color: #f1f5f9; font-weight: 600;">ESLint, Jest pass</div>
  </div>
  <ul style="margin: 0 0 16px 0; padding-left: 20px; list-style: none;">
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      OWASP prompt packs deployment
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Boilerplate code generation
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Unit test creation (ESLint, Jest)
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Security pattern implementation
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Documentation generation
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
  </ul>

  <!-- Flow Indicators -->
  <div style="display: flex; gap: 8px; margin-bottom: 12px;">
    <div style="flex: 1; background: linear-gradient(135deg, #065f46 0%, #10b981 100%); border-radius: 6px; padding: 8px 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
      <div style="font-size: 10px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">✓ Success</div>
      <div style="font-size: 12px; color: #f1f5f9; font-weight: 600;">→ Phase 3</div>
    </div>
  </div>

  <a href="./phase2-implementation" style="display: inline-block; background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">View Phase 2 Details →</a>
</div>

<!-- Phase 3: Verification Gates -->
<div style="background: rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; border-left: 4px solid #ef4444; transition: all 0.3s ease;">
  <h3 style="margin: 0 0 8px 0; font-size: 18px; display: flex; align-items: center; gap: 10px; color: #f1f5f9;">
    <span style="font-size: 24px;">3&#xFE0F;&#x20E3;</span>
    Verification Gates
  </h3>
  <div style="color: #8a9fb3; font-size: 12px; margin-bottom: 8px; font-style: italic;">AI-Powered Analysis</div>
  <div style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px; line-height: 1.5;"><strong style="color: #fca5a5;">Purpose:</strong> Local testing (Jest, ESLint), security scanning (CodeQL, Snyk), fitness function validation, attack vector testing</div>
  <div style="background: rgba(239, 68, 68, 0.15); padding: 8px 12px; border-radius: 6px; margin-bottom: 15px;">
    <div style="font-size: 11px; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Security Gate</div>
    <div style="font-size: 13px; color: #f1f5f9; font-weight: 600;">No high-severity findings</div>
  </div>
  <ul style="margin: 0 0 16px 0; padding-left: 20px; list-style: none;">
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      CodeQL security scanning
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Snyk vulnerability detection
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Test coverage validation (≥80%)
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Fitness function automation
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Attack vector simulation
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
  </ul>

  <!-- Flow Indicators -->
  <div style="display: flex; gap: 8px; margin-bottom: 12px;">
    <div style="flex: 1; background: linear-gradient(135deg, #065f46 0%, #10b981 100%); border-radius: 6px; padding: 8px 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
      <div style="font-size: 10px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">✓ Pass</div>
      <div style="font-size: 12px; color: #f1f5f9; font-weight: 600;">→ Phase 4</div>
    </div>
    <div style="flex: 1; background: linear-gradient(135deg, #991b1b 0%, #ef4444 100%); border-radius: 6px; padding: 8px 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
      <div style="font-size: 10px; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">✗ Fail</div>
      <div style="font-size: 12px; color: #f1f5f9; font-weight: 600;">↩ Phase 2</div>
    </div>
  </div>

  <a href="./phase3-verification" style="display: inline-block; background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">View Phase 3 Details →</a>
</div>

<!-- Phase 4: Governance Gates -->
<div style="background: rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; border-left: 4px solid #a855f7; transition: all 0.3s ease;">
  <h3 style="margin: 0 0 8px 0; font-size: 18px; display: flex; align-items: center; gap: 10px; color: #f1f5f9;">
    <span style="font-size: 24px;">4&#xFE0F;&#x20E3;</span>
    Governance Gates
  </h3>
  <div style="color: #8a9fb3; font-size: 12px; margin-bottom: 8px; font-style: italic;">The Critical 30% (Human Judgment)</div>
  <div style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px; line-height: 1.5;"><strong style="color: #d8b4fe;">Purpose:</strong> PR review process, Golden Rules checklist, human-in-the-loop validation, OWASP compliance, merge criteria</div>
  <div style="background: rgba(168, 85, 247, 0.15); padding: 8px 12px; border-radius: 6px; margin-bottom: 15px;">
    <div style="font-size: 11px; color: #d8b4fe; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Security Gate</div>
    <div style="font-size: 13px; color: #f1f5f9; font-weight: 600;">Golden Rules compliance</div>
  </div>
  <ul style="margin: 0 0 16px 0; padding-left: 20px; list-style: none;">
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Architectural review & approval
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Security risk acceptance
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Business logic validation
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Compliance certification
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      AI disclosure documentation
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
  </ul>

  <!-- Flow Indicators -->
  <div style="display: flex; gap: 8px; margin-bottom: 12px;">
    <div style="flex: 1; background: linear-gradient(135deg, #065f46 0%, #10b981 100%); border-radius: 6px; padding: 8px 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
      <div style="font-size: 10px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">✓ Approve</div>
      <div style="font-size: 12px; color: #f1f5f9; font-weight: 600;">→ Phase 5</div>
    </div>
    <div style="flex: 1; background: linear-gradient(135deg, #991b1b 0%, #ef4444 100%); border-radius: 6px; padding: 8px 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
      <div style="font-size: 10px; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">✗ Reject</div>
      <div style="font-size: 12px; color: #f1f5f9; font-weight: 600;">↩ Phase 2</div>
    </div>
  </div>

  <a href="./phase4-governance" style="display: inline-block; background: rgba(168, 85, 247, 0.2); color: #a855f7; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">View Phase 4 Details →</a>
</div>

<!-- Phase 5: Deployment Gates -->
<div style="background: rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; border-left: 4px solid #10b981; transition: all 0.3s ease;">
  <h3 style="margin: 0 0 8px 0; font-size: 18px; display: flex; align-items: center; gap: 10px; color: #f1f5f9;">
    <span style="font-size: 24px;">5&#xFE0F;&#x20E3;</span>
    Deployment Gates
  </h3>
  <div style="color: #8a9fb3; font-size: 12px; margin-bottom: 8px; font-style: italic;">Automated with Human Override</div>
  <div style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px; line-height: 1.5;"><strong style="color: #6ee7b7;">Purpose:</strong> CI/CD pipeline configuration, production deployment, monitoring and alerting, rollback procedures</div>
  <div style="background: rgba(16, 185, 129, 0.15); padding: 8px 12px; border-radius: 6px; margin-bottom: 15px;">
    <div style="font-size: 11px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Security Gate</div>
    <div style="font-size: 13px; color: #f1f5f9; font-weight: 600;">Zero critical CVEs</div>
  </div>
  <ul style="margin: 0 0 16px 0; padding-left: 20px; list-style: none;">
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      All verification scans re-run
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Production smoke tests
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Monitoring configuration
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Rollback strategy approval
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Go/No-go decision
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
  </ul>

  <!-- Flow Indicators -->
  <div style="display: flex; gap: 8px; margin-bottom: 12px;">
    <div style="flex: 1; background: linear-gradient(135deg, #065f46 0%, #10b981 100%); border-radius: 6px; padding: 8px 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
      <div style="font-size: 10px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">✓ Success</div>
      <div style="font-size: 12px; color: #f1f5f9; font-weight: 600;">→ Phase 6</div>
    </div>
    <div style="flex: 1; background: linear-gradient(135deg, #991b1b 0%, #ef4444 100%); border-radius: 6px; padding: 8px 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
      <div style="font-size: 10px; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">✗ Rollback</div>
      <div style="font-size: 12px; color: #f1f5f9; font-weight: 600;">↩ Phase 4</div>
    </div>
  </div>

  <a href="./phase5-deployment" style="display: inline-block; background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">View Phase 5 Details →</a>
</div>

<!-- Phase 6: Evolution Gates -->
<div style="background: rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; border-left: 4px solid #ec4899; transition: all 0.3s ease;">
  <h3 style="margin: 0 0 8px 0; font-size: 18px; display: flex; align-items: center; gap: 10px; color: #f1f5f9;">
    <span style="font-size: 24px;">6&#xFE0F;&#x20E3;</span>
    Evolution Gates
  </h3>
  <div style="color: #8a9fb3; font-size: 12px; margin-bottom: 8px; font-style: italic;">Continuous Learning Loop</div>
  <div style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px; line-height: 1.5;"><strong style="color: #f9a8d4;">Purpose:</strong> Metrics collection and analysis, prompt library iteration, technical debt management, fitness function refinement</div>
  <div style="background: rgba(236, 72, 153, 0.15); padding: 8px 12px; border-radius: 6px; margin-bottom: 15px;">
    <div style="font-size: 11px; color: #f9a8d4; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Security Gate</div>
    <div style="font-size: 13px; color: #f1f5f9; font-weight: 600;">Metrics trending up</div>
  </div>
  <ul style="margin: 0 0 16px 0; padding-left: 20px; list-style: none;">
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Performance metrics analysis
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Technical debt tracking
      <span style="display: inline-block; background: rgba(76, 175, 80, 0.2); color: #4caf50; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">AI</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Prompt optimization
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Fitness function refinement
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
    <li style="margin: 8px 0; font-size: 14px; line-height: 1.4; position: relative; padding-left: 20px; color: #cbd5e1;">
      <span style="content: '▸'; position: absolute; left: 0; opacity: 0.5;">▸</span>
      Architecture evolution
      <span style="display: inline-block; background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 5px; font-weight: 600;">HUMAN</span>
    </li>
  </ul>

  <!-- Flow Indicators -->
  <div style="display: flex; gap: 8px; margin-bottom: 12px;">
    <div style="flex: 1; background: linear-gradient(135deg, #831843 0%, #ec4899 100%); border-radius: 6px; padding: 8px 12px; border: 1px solid rgba(236, 72, 153, 0.3);">
      <div style="font-size: 10px; color: #f9a8d4; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">↻ Loop</div>
      <div style="font-size: 12px; color: #f1f5f9; font-weight: 600;">→ Phase 1</div>
    </div>
  </div>

  <a href="./phase6-evolution" style="display: inline-block; background: rgba(236, 72, 153, 0.2); color: #ec4899; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">View Phase 6 Details →</a>
</div>

</div>

<!-- Flow Legend -->
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 30px 0;">

<div style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(16, 185, 129, 0.3);">
<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
<div style="font-size: 28px;">→</div>
<div style="font-size: 18px; font-weight: 700; color: #f1f5f9;">Forward Flow</div>
</div>
<p style="color: #d1fae5; font-size: 14px; margin: 0; line-height: 1.6;">
Normal progression through phases 1 → 2 → 3 → 4 → 5 → 6, then back to 1 for continuous improvement
</p>
</div>

<div style="background: linear-gradient(135deg, #991b1b 0%, #ef4444 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(239, 68, 68, 0.3);">
<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
<div style="font-size: 28px;">↩</div>
<div style="font-size: 18px; font-weight: 700; color: #f1f5f9;">Feedback Loops</div>
</div>
<p style="color: #fecaca; font-size: 14px; margin: 0; line-height: 1.6;">
Phase 3 (Verification) failures return to Phase 2. Phase 4 (Governance) rejections return to Phase 2. Phase 5 (Deployment) rollbacks return to Phase 4
</p>
</div>

</div>

<div style="background: rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 25px; margin-top: 30px;">
<h3 style="margin: 0 0 12px 0; color: #4a9eff; font-size: 20px;">🎯 Framework Core Principles</h3>
<p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; font-style: italic;">
As <a href="https://www.deloitte.com/nz/en/services/consulting/perspectives/ai-assisted-software-engineering.html" style="color: #60a5fa; text-decoration: none;">Aravind Subramanian, Deloitte Partner and AI Advisor</a>, argues: "AI governance is more than just rules; it's about creating a foundation of trust that supports innovation. By keeping humans in the loop, we inject empathy and judgment, crucial for navigating complex ethical landscapes. Governance isn't a barrier; it's a facilitator that empowers us to explore new ideas responsibly."
</p>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">

<div style="padding: 12px;">
<div style="display: flex; align-items: flex-start; gap: 10px;">
<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #4a9eff, #00d4ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 12px; font-weight: bold;">✓</div>
<div style="flex: 1; font-size: 14px; line-height: 1.5; color: #cbd5e1;"><strong style="color: #4a9eff;">Humans Own Architecture:</strong> All system design and architectural decisions remain under human control</div>
</div>
</div>

<div style="padding: 12px;">
<div style="display: flex; align-items: flex-start; gap: 10px;">
<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #4a9eff, #00d4ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 12px; font-weight: bold;">✓</div>
<div style="flex: 1; font-size: 14px; line-height: 1.5; color: #cbd5e1;"><strong style="color: #4a9eff;">AI Accelerates Implementation:</strong> Leverage AI for the 70% routine work while maintaining quality gates</div>
</div>
</div>

<div style="padding: 12px;">
<div style="display: flex; align-items: flex-start; gap: 10px;">
<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #4a9eff, #00d4ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 12px; font-weight: bold;">✓</div>
<div style="flex: 1; font-size: 14px; line-height: 1.5; color: #cbd5e1;"><strong style="color: #4a9eff;">Security by Design:</strong> OWASP Top 10 and threat modeling integrated at every phase</div>
</div>
</div>

<div style="padding: 12px;">
<div style="display: flex; align-items: flex-start; gap: 10px;">
<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #4a9eff, #00d4ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 12px; font-weight: bold;">✓</div>
<div style="flex: 1; font-size: 14px; line-height: 1.5; color: #cbd5e1;"><strong style="color: #4a9eff;">Fitness Functions:</strong> Automated architectural governance ensures maintainability</div>
</div>
</div>

<div style="padding: 12px;">
<div style="display: flex; align-items: flex-start; gap: 10px;">
<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #4a9eff, #00d4ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 12px; font-weight: bold;">✓</div>
<div style="flex: 1; font-size: 14px; line-height: 1.5; color: #cbd5e1;"><strong style="color: #4a9eff;">Transparent AI Usage:</strong> Clear documentation of where and how AI assistance was utilized</div>
</div>
</div>

<div style="padding: 12px;">
<div style="display: flex; align-items: flex-start; gap: 10px;">
<div style="width: 24px; height: 24px; background: linear-gradient(135deg, #4a9eff, #00d4ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 12px; font-weight: bold;">✓</div>
<div style="flex: 1; font-size: 14px; line-height: 1.5; color: #cbd5e1;"><strong style="color: #4a9eff;">Continuous Evolution:</strong> Learn from each cycle to optimize the human-AI partnership</div>
</div>
</div>

</div>
</div>

</div>

---

## AI Agent Usage by Phase

**Two modes, one framework** — use in-editor AI assistance (Copilot) for real-time coding and agentic AI (Claude Code) for complex, multi-file tasks.

**Key principle**: Security-first prompts matter more than which mode you use.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 32px 0; border: 1px solid rgba(100, 116, 139, 0.3);">
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: rgba(71, 85, 105, 0.3);">
        <th style="padding: 12px; text-align: left; border: 1px solid rgba(100, 116, 139, 0.3); color: #f1f5f9;">Phase</th>
        <th style="padding: 12px; text-align: left; border: 1px solid rgba(100, 116, 139, 0.3); color: #f1f5f9;">Your Task</th>
        <th style="padding: 12px; text-align: left; border: 1px solid rgba(100, 116, 139, 0.3); color: #f1f5f9;">Mode</th>
        <th style="padding: 12px; text-align: left; border: 1px solid rgba(100, 116, 139, 0.3); color: #f1f5f9;">Why</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="color: #93c5fd; font-weight: 600;">1: Design</span></td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">Threat modeling (STRIDE)</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="display: inline-block; background: rgba(59, 130, 246, 0.2); color: #93c5fd; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">In-Editor</span> Claude Code | Copilot</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #94a3b8;">Structured analysis and documentation across files</td>
      </tr>
      <tr style="background: rgba(71, 85, 105, 0.2);">
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="color: #fcd34d; font-weight: 600;">2: Implement</span></td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">Real-time coding</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="display: inline-block; background: rgba(59, 130, 246, 0.2); color: #93c5fd; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">In-Editor</span> Claude Code | Copilot</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #94a3b8;">Autocomplete and inline suggestions as you type</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="color: #fcd34d; font-weight: 600;">2: Implement</span></td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">Large refactoring</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="display: inline-block; background: rgba(168, 85, 247, 0.2); color: #d8b4fe; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">Agentic</span> Claude Code | Copilot Coding Agent</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #94a3b8;">Handles complex multi-file edits autonomously</td>
      </tr>
      <tr style="background: rgba(71, 85, 105, 0.2);">
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="color: #fca5a5; font-weight: 600;">3: Verify</span></td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">Test generation</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="display: inline-block; background: rgba(168, 85, 247, 0.2); color: #d8b4fe; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">Agentic</span> Claude Code | Copilot Coding Agent</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #94a3b8;">Comprehensive test suites with attack vector coverage</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="color: #d8b4fe; font-weight: 600;">4: Govern</span></td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">Code review checklist</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="display: inline-block; background: rgba(59, 130, 246, 0.2); color: #93c5fd; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">In-Editor</span> Claude Code | Copilot</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #94a3b8;">Inline review comments and validation suggestions</td>
      </tr>
      <tr style="background: rgba(71, 85, 105, 0.2);">
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="color: #6ee7b7; font-weight: 600;">5: Deploy</span></td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">CI/CD automation</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="display: inline-block; background: rgba(16, 185, 129, 0.2); color: #6ee7b7; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">Pipeline</span> GitHub Actions</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #94a3b8;">Automated, auditable pipeline</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="color: #f9a8d4; font-weight: 600;">6: Evolve</span></td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;">Refactoring tech debt</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #cbd5e1;"><span style="display: inline-block; background: rgba(168, 85, 247, 0.2); color: #d8b4fe; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">Agentic</span> Claude Code | Copilot Coding Agent</td>
        <td style="padding: 12px; border: 1px solid rgba(100, 116, 139, 0.3); color: #94a3b8;">Large-scale codebase analysis and refactoring</td>
      </tr>
    </tbody>
  </table>
</div>

---

## 📈 Success Metrics

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 24px;">
  <div style="font-size: 32px; margin-bottom: 12px;">⚡</div>
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 16px;">Velocity Metrics</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 2;">
    <strong style="color: #818cf8;">Time to Delivery:</strong> &lt;5 days<br/>
    <strong style="color: #818cf8;">Cycle Time:</strong> &lt;24 hours<br/>
    <strong style="color: #818cf8;">Deploy Frequency:</strong> &gt;10/week
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 24px;">
  <div style="font-size: 32px; margin-bottom: 12px;">🎯</div>
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 16px;">Quality Metrics</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 2;">
    <strong style="color: #a78bfa;">Scan Pass Rate:</strong> &gt;90%<br/>
    <strong style="color: #a78bfa;">Test Coverage:</strong> &gt;80%<br/>
    <strong style="color: #a78bfa;">Defect Rate:</strong> &lt;5/1000 LOC
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 24px;">
  <div style="font-size: 32px; margin-bottom: 12px;">🔒</div>
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 16px;">Security Metrics</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 2;">
    <strong style="color: #22d3ee;">OWASP Coverage:</strong> 100%<br/>
    <strong style="color: #22d3ee;">Remediation Time:</strong> &lt;7 days<br/>
    <strong style="color: #22d3ee;">False Positives:</strong> &lt;10%
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 12px; padding: 24px;">
  <div style="font-size: 32px; margin-bottom: 12px;">📊</div>
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 16px;">Process Metrics</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 2;">
    <strong style="color: #5eead4;">Prompt Reuse:</strong> &gt;70%<br/>
    <strong style="color: #5eead4;">Agent Effectiveness:</strong> &gt;85%<br/>
    <strong style="color: #5eead4;">Review Time:</strong> &lt;30 min
  </div>
</div>

</div>

---

<div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 40px; text-align: center; color: #f1f5f9; margin: 40px 0; border: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="font-size: 56px; margin-bottom: 16px;">🎯</div>
  <div style="font-size: 28px; font-weight: 700; margin-bottom: 16px;">Ready to Start?</div>
  <div style="font-size: 16px; color: #cbd5e1; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">Begin your secure AI-assisted development journey with Phase 1. Follow the six phases systematically for maximum velocity and security.</div>
  <a href="./phase1-design" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #f1f5f9; padding: 16px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
    Begin with Phase 1: Design Intent →
  </a>
</div>

