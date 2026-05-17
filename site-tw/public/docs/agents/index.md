<div class="docs-hero docs-hero-violet">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mushroom.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><span>Agents</span></div>
    <div class="docs-eyebrow">Agent guides <span class="docs-hero-meta">~3 min read</span></div>
    <h1 class="docs-hero-title">Choose the agent. The governance is the same.</h1>
    <p class="docs-hero-copy">Two categories of AI: <strong>in-editor assistants</strong> you drive directly, and <strong>agentic AI</strong> that operates autonomously on GitHub. Each gets its own guide; both run inside the Red Queen rails.</p>
    <span class="docs-hero-flourish">&ldquo;Who are <em>you</em>?&rdquo; &mdash; said the Caterpillar.</span>
  </div>
</div>

MaintainabilityAI works with two categories of AI: **in-editor assistants** you interact with directly, and **agentic AI** that operates autonomously on GitHub. Each requires different guidance, governance, and trust models &mdash; but both sit under the same Red Queen rails, so policy enforcement, audit trails, and CODEOWNER review are identical regardless of which agent holds the keyboard.

---

## In-editor AI assistants

<p class="docs-muted">Human-in-the-loop. IDE-integrated. Interactive. You review every change.</p>

<div class="docs-grid docs-grid-wide">

<a href="/docs/agents/claude" class="docs-card docs-card-indigo">
  <div class="docs-card-kicker">Claude Code</div>
  <h3 class="docs-card-title">Complex refactoring &amp; testing</h3>
  <p class="docs-card-body">Deep codebase understanding for multi-file refactoring, comprehensive test generation with attack vectors, and security code review.</p>
  <p class="docs-card-body"><strong>Best for:</strong> large-scale security refactoring · multi-file coordination · test generation · technical-debt analysis.</p>
  <p class="docs-card-body"><strong>View guide &rarr;</strong></p>
</a>

<a href="/docs/agents/copilot" class="docs-card docs-card-blue">
  <div class="docs-card-kicker">GitHub Copilot</div>
  <h3 class="docs-card-title">In-editor code generation</h3>
  <p class="docs-card-body">Real-time IDE completion with <code>#codebase</code> context. Fast iteration on single functions with security constraints in the prompt.</p>
  <p class="docs-card-body"><strong>Best for:</strong> in-editor secure completions · pattern following · quick fixes · single-function implementation.</p>
  <p class="docs-card-body"><strong>View guide &rarr;</strong></p>
</a>

</div>

---

## Agentic AI &mdash; autonomous

<p class="docs-muted">Autonomous. GitHub-native. Governance-enforced by <a href="/docs/impossible-things" class="markdown-link">The Red Queen</a>.</p>

<div class="docs-grid docs-grid-wide">

<a href="/docs/agents/claude-code-action" class="docs-card docs-card-cyan">
  <div class="docs-card-kicker">Claude Code Action</div>
  <h3 class="docs-card-title">Autonomous in GitHub Actions</h3>
  <p class="docs-card-body">Full MCP access &mdash; resources, tools, prompts. Governed by Red Queen MCP validation, pre-tool hooks, and fail-closed review consensus.</p>
  <p class="docs-card-body"><strong>Best for:</strong> autonomous issue remediation · governed PRs · cross-repo enforcement · CI/CD governance.</p>
  <p class="docs-card-body"><strong>View guide &rarr;</strong></p>
</a>

<a href="/docs/agents/copilot-coding-agent" class="docs-card docs-card-emerald">
  <div class="docs-card-kicker">Copilot Coding Agent</div>
  <h3 class="docs-card-title">Autonomous in GitHub</h3>
  <p class="docs-card-body">Same governance mesh and policy engine; different hook and config adapter. Drop-in for teams already standardised on Copilot.</p>
  <p class="docs-card-body"><strong>Best for:</strong> autonomous issue remediation · governed PRs · teams on Copilot.</p>
  <p class="docs-card-body"><strong>View guide &rarr;</strong></p>
</a>

<a href="/docs/agents/alice" class="docs-card docs-card-rose">
  <div class="docs-card-kicker">Alice Agent 🐰</div>
  <h3 class="docs-card-title">The Good Maintainer</h3>
  <p class="docs-card-body">Autonomous security remediation with a two-phase workflow: <em>curiosity &rarr; approval &rarr; implementation</em>. Built on Claude Code.</p>
  <p class="docs-card-body"><strong>Best for:</strong> CodeQL remediation · legacy refactoring · debt reduction · CI/CD security automation.</p>
  <p class="docs-card-body"><strong>Enter Wonderland &rarr;</strong></p>
</a>

<a href="/docs/agents/multi-agent" class="docs-card docs-card-amber">
  <div class="docs-card-kicker">Multi-agent orchestration</div>
  <h3 class="docs-card-title">Patterns &mdash; sequential, parallel, validator, consensus</h3>
  <p class="docs-card-body">When one agent isn&rsquo;t enough. How specialists hand off evidence to each other inside the Red Queen rails.</p>
  <p class="docs-card-body"><strong>Best for:</strong> security review boards · architecture-aware policy checks · risk-tier appropriate autonomy.</p>
  <p class="docs-card-body"><strong>View guide &rarr;</strong></p>
</a>

</div>

---

## Choosing the Right Mode

### In-Editor vs Agentic

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-heading"></div>
<div class="docs-heading">In-Editor (Claude Code, Copilot)</div>
<div class="docs-heading">Agentic (Code Action, Coding Agent, Alice)</div>

<div class="docs-heading">Interaction</div>
<div class="docs-muted">Human reviews each change</div>
<div class="docs-muted">Autonomous until PR review</div>

<div class="docs-heading">Where it runs</div>
<div class="docs-muted">VS Code / IDE</div>
<div class="docs-muted">GitHub Actions</div>

<div class="docs-heading">Governance</div>
<div class="docs-muted">Prompt packs + human judgment</div>
<div class="docs-muted">The Red Queen: MCP + hooks + policy engine</div>

<div class="docs-heading">Enforcement</div>
<div class="docs-muted">Advisory (prompts guide)</div>
<div class="docs-muted">Deterministic (guardrails enforce)</div>

<div class="docs-heading">Best for</div>
<div class="docs-muted">Interactive development, learning, complex decisions</div>
<div class="docs-muted">Issue remediation, bulk fixes, CI/CD automation</div>
</div>

</div>

### By Task Type

<div class="docs-card docs-card-muted">

<div class="docs-grid">
<div class="docs-heading">Task</div>
<div class="docs-heading">Best Choice</div>
<div class="docs-heading">Why</div>

<div>Multi-file refactoring</div>
<div><span class="docs-pill docs-card-blue">In-Editor</span> <span class="docs-copy">Claude Code</span></div>
<div class="docs-muted">Deep codebase understanding, interactive</div>

<div>Single function fix</div>
<div><span class="docs-pill docs-card-blue">In-Editor</span> <span class="docs-copy">Copilot</span></div>
<div class="docs-muted">Fast, pattern-aware</div>

<div>Test generation</div>
<div><span class="docs-pill docs-card-blue">In-Editor</span> <span class="docs-copy">Claude Code</span></div>
<div class="docs-muted">Comprehensive attack vectors</div>

<div>Issue remediation</div>
<div><span class="docs-pill docs-card-indigo">Agentic</span> <span class="docs-copy">Claude Code Action | Copilot Coding Agent</span></div>
<div class="docs-muted">Autonomous, governed</div>

<div>Security bulk fixes</div>
<div><span class="docs-pill docs-card-indigo">Agentic</span> <span class="docs-copy">Alice Agent</span></div>
<div class="docs-muted">Two-phase workflow, human approval</div>

<div>Cross-repo changes</div>
<div><span class="docs-pill docs-card-indigo">Agentic</span> <span class="docs-copy">Claude Code Action</span></div>
<div class="docs-muted">Full MCP context + Phase 9 interface contract gate</div>

<div>Dependency upgrades</div>
<div><span class="docs-pill docs-card-blue">In-Editor</span> <span class="docs-copy">Claude Code</span></div>
<div class="docs-muted">Breaking change analysis</div>
</div>

</div>

### Orchestrating Multiple Agents

For complex workflows requiring multiple agents in sequence or parallel, see the [Multi-Agent Orchestration Guide](/docs/agents/multi-agent).

---

## Permission tiers &mdash; agent autonomy is earned

Not every agent gets the same keys to the keyboard. The Red Queen issues a permission tier per repository based on its current governance score &mdash; and the tier sets which actions any agent can take.

<div class="docs-grid docs-grid-compact">
  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Score 80&ndash;100</div>
    <h3 class="docs-card-title">Autonomous</h3>
    <p class="docs-card-body">Auto-edit mode for in-editor agents. Agentic AI can open PRs unattended. CALM flow constraints still enforced. Single-reviewer human sign-off.</p>
  </div>
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Score 50&ndash;79</div>
    <h3 class="docs-card-title">Supervised</h3>
    <p class="docs-card-body">Ask-edit mode in the IDE. Agentic AI requires human approval before merge. Security-critical files trigger Cheshire-injected OWASP packs.</p>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Score 0&ndash;49</div>
    <h3 class="docs-card-title">Restricted</h3>
    <p class="docs-card-body">Plan-first mode. Bash and Write are hook-blocked. Edit requires recorded approval. Multi-agent review board on every structural change.</p>
  </div>
</div>

The same agent &mdash; Claude Code, Copilot, or an autonomous coding agent &mdash; behaves differently in a restricted-tier repo than in an autonomous-tier one. The governance score, not the agent vendor, is what changes the rules. Improve the score and your agents earn autonomy. Let it decay and they tighten.

<div class="docs-cta">
  <h2 class="docs-cta-title">Put an agent inside the rails</h2>
  <p class="docs-cta-copy">The fastest way to feel how this works is to scaffold the Red Queen into a restricted-tier repo and watch the pre-tool hooks fire as the agent works.</p>
  <div class="docs-actions docs-actions-center">
    <a href="/docs/quickstart-redqueen" class="docs-button-primary">Red Queen quickstart &rarr;</a>
    <a href="/docs/impossible-things#the-red-queen---governance-enforced-agent-intelligence" class="docs-button-secondary">Why deterministic enforcement</a>
  </div>
</div>

---

## Further Reading

- [OWASP Prompt Packs](/docs/prompts/owasp/) &mdash; security-first prompts for all agents
- [SDLC Framework](/docs/sdlc/) &mdash; 6-phase framework integration
- [Golden Rules](/docs/governance/governed-golden-rules) &mdash; the human review layer
- [Impossible Things](/docs/impossible-things) &mdash; the Red Queen vision and architecture
