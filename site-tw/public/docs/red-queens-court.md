<div class="docs-hero docs-hero-split docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/crown.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/agentic-sdlc-governance">Vision</a><span class="sep">/</span><span>Red Queen's Court</span></div>
    <div class="docs-eyebrow">Vision · Enforcement modality <span class="docs-hero-meta">~12 min read</span></div>
    <h1 class="docs-hero-title">The Red Queen's Court</h1>
    <p class="docs-hero-copy">
      Prompts ask agents to follow the architecture. The Red Queen makes the architecture enforceable.
    </p>
    <p class="docs-hero-copy">
      When an AI agent reaches for a tool, Red Queen checks the proposed action against the repo&rsquo;s CALM model, policy tiers, path controls, security rules, and team-defined constraints. Two layers ship today: PreToolUse hooks that block unsafe actions inline, and MCP <code>validate_action</code> for deliberate governance checks. Both write repo-local audit lines with the rule that fired.
    </p>
    <p class="docs-hero-copy">
      <strong>This is not "please follow the architecture." It is a board with rules of movement, and a queen who keeps them.</strong>
    </p>
    <div class="docs-actions">
      <a href="/docs/quickstart-redqueen" class="docs-button-primary">Install on a repo (quickstart)</a>
      <a href="/docs/hatters-tea-party" class="docs-button-secondary">See the planning side →</a>
    </div>
    <span class="docs-hero-flourish">&ldquo;All the ways about here belong to me.&rdquo;</span>
  </div>
  <figure class="docs-hero-figure">
    <img src="/images/redqueen.png" alt="The Red Queen, chess-piece queen from Through the Looking-Glass" class="docs-hero-art" />
    <figcaption class="docs-visual-caption">The Red Queen is a chess piece, not Queen of Hearts. Rules of movement on the board.</figcaption>
  </figure>
</div>



## The problem with prompts

Every governance tool today, including ours, relies on prompts to guide AI agents. "Please follow the architecture." "Please respect these security controls." "Please do not add direct database connections."

The problem? **Prompts are advisory.** Agents can and do ignore them. An LLM that is optimising for task completion might decide that a direct database connection is the fastest path to the solution. Your architecture constraints become suggestions. Your security controls become suggestions. Your governance becomes a suggestion.

The Red Queen is what stops that. She is the **enforcement modality** of the framework, the part where governance moves from advice into action. Where the Hatter&rsquo;s Tea Party (the [planning modality](/docs/hatters-tea-party)) governs intent before code is written, the Red Queen governs **action** at the moment an agent reaches for a tool inside the code repo.

> *"It takes all the running you can do, to keep in the same place."*

That Red Queen quote captures the discipline of enforcement: every piece on the board must obey the rules of movement, or the game is no longer chess. Every tool call by an agent must obey the rules of governance, or the architecture is no longer governed.



## Three layers of governance intelligence

The Red Queen is a unified governance intelligence and enforcement system. It does not just tell agents about your architecture; it **enforces** it. Two layers enforce today; the third lands in <a href="#queens-next-act" class="markdown-link">Queen&rsquo;s Next Act</a>.

<svg viewBox="0 0 800 240" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="enfBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="enfArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8"/>
    </marker>
  </defs>
  <rect width="800" height="240" rx="12" fill="url(#enfBg)"/>
  <text x="400" y="30" text-anchor="middle" fill="#818cf8" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">GOVERNANCE ENFORCEMENT PIPELINE</text>
  <rect x="20" y="55" width="120" height="70" rx="8" fill="rgba(14,165,233,0.15)" stroke="rgba(14,165,233,0.4)"/>
  <text x="80" y="85" text-anchor="middle" fill="#7dd3fc" font-size="13" font-weight="700" font-family="system-ui, sans-serif">AI Agent</text>
  <text x="80" y="108" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Proposes action</text>
  <line x1="140" y1="90" x2="172" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <rect x="175" y="55" width="140" height="70" rx="8" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
  <text x="245" y="82" text-anchor="middle" fill="#a5b4fc" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Governance check</text>
  <text x="245" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Agent asks before</text>
  <text x="245" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">acting</text>
  <line x1="315" y1="90" x2="347" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <rect x="350" y="55" width="140" height="70" rx="8" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.4)"/>
  <text x="420" y="82" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Policy Engine</text>
  <text x="420" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Policy rules</text>
  <text x="420" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Deterministic</text>
  <line x1="490" y1="90" x2="522" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <rect x="525" y="55" width="120" height="70" rx="8" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)"/>
  <text x="585" y="82" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="700" font-family="system-ui, sans-serif">CALM Model</text>
  <text x="585" y="100" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Flows, Controls,</text>
  <text x="585" y="116" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Interfaces</text>
  <line x1="645" y1="90" x2="677" y2="90" stroke="#818cf8" stroke-width="2" marker-end="url(#enfArrow)"/>
  <rect x="680" y="50" width="100" height="80" rx="8" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.3)"/>
  <text x="730" y="76" text-anchor="middle" fill="#4ade80" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Allow</text>
  <text x="730" y="96" text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Conditional</text>
  <text x="730" y="116" text-anchor="middle" fill="#f87171" font-size="11" font-weight="700" font-family="system-ui, sans-serif">Deny</text>
  <text x="400" y="160" text-anchor="middle" fill="#64748b" font-size="10" font-weight="600" letter-spacing="1" font-family="system-ui, sans-serif">GOVERNANCE RAILS EVALUATED</text>
  <rect x="50" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="115" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Flow Constraints</text>
  <rect x="190" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="255" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Control Adherence</text>
  <rect x="330" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="395" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Path Controls</text>
  <rect x="470" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="535" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Platform Impact</text>
  <rect x="610" y="173" width="130" height="26" rx="6" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)"/>
  <text x="675" y="190" text-anchor="middle" fill="#c4b5fd" font-size="9" font-family="system-ui, sans-serif">Permission Tiers</text>
  <rect x="310" y="210" width="180" height="22" rx="11" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)"/>
  <text x="400" y="225" text-anchor="middle" fill="#4ade80" font-size="10" font-weight="600" font-family="system-ui, sans-serif">DETERMINISTIC  ·  POLICY-DRIVEN</text>
</svg>

<div class="docs-proof-list docs-proof-list-compact">
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Ships today</div>
    <div>
      <div class="docs-proof-title">Stop unsafe tool calls before they run</div>
      <p class="docs-proof-body">PreToolUse hooks sit in front of the agent&rsquo;s edit, write, and shell tools. They check the file path, the action being attempted, the repo&rsquo;s risk tier, protected governance files, security-sensitive paths, declared architecture flows, and team-defined rules. If the action violates a rule, it is blocked inline.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What the audit records:</strong> the tool, path, rule ID, session, and whether a human-approved override changed a deny into an allow.</div>
  </div>
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-shipped">✓ Ships today</div>
    <div>
      <div class="docs-proof-title">Let agents ask for a governance ruling</div>
      <p class="docs-proof-body">The MCP layer gives agents a deliberate way to ask, &ldquo;Is this action allowed?&rdquo; before they make a structural change. The Red Queen answers from the same policy model every time, not from another prompt. The result is a clear allow, warning, or deny with the reason attached.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What the audit records:</strong> every <code>validate_action</code> call, the decision returned, and the rule or warning that produced it.</div>
  </div>
  <div class="docs-proof-row">
    <div class="docs-proof-status docs-proof-status-queued">Next act</div>
    <div>
      <div class="docs-proof-title">Make governance a required merge gate</div>
      <p class="docs-proof-body">The CI hard gate moves Red Queen enforcement from &ldquo;the agent should ask&rdquo; to &ldquo;the PR cannot merge until the repo-level check passes.&rdquo; It will classify what changed, run the right checks for that risk, and require human review when the change touches sensitive architecture or security paths.</p>
    </div>
    <div class="docs-proof-evidence"><strong>What changes:</strong> Red Queen becomes a required GitHub status check, not just an inline guardrail.</div>
  </div>
</div>

Today the rails answer seven plain questions: is this agent allowed to act at this autonomy level, is the file protected, is the path security-sensitive, does the change respect the declared architecture flow, does it touch a control, does it affect a shared platform node, and has the team banned this pattern before? Contract checks across OpenAPI, protobuf, GraphQL, and deeper threat-model enforcement land in <a href="#queens-next-act" class="markdown-link">Queen&rsquo;s Next Act</a>.



## Deterministic governance: prompts advise, policy decides

Your CALM architecture declares that **web-frontend** connects to **api-gateway**, which connects to **user-database**. A three-tier flow. Clean separation.

An AI agent implementing a feature decides: "I'll save time by querying the database directly from the frontend."

**Without The Red Queen:** The agent ignores the architecture guidance in its prompt, adds the direct connection, and creates a PR. Maybe a human catches it. Maybe they don't.

**With The Red Queen:** The agent calls **validate_action** before making any structural change. The Red Queen's Court **CALM flow constraint rule** checks the architecture model. No **web-frontend** → **user-database** relationship is declared. **Action denied.** The agent receives the denial reason and the correct architectural path: route through **api-gateway**.

This isn't an LLM judging whether the change is okay. It's a deterministic policy engine evaluating the CALM model. Condition → decision. Auditable. Unfoolable.



## Cross-repo semantic governance: the breakthrough we are building

This is the capability that doesn't exist anywhere else in the market.

Modern applications span multiple repositories. A frontend. An API. A database. Infrastructure-as-code. They're connected through CALM flows and interface contracts. But every governance tool today treats each repo independently.

**The Red Queen is moving governance across repository boundaries.**

When your CALM model declares a flow from **checkout-ui** through **order-api** to **order-database**, Red Queen can already reason over the graph and warn on shared platform impact. <a href="#queens-next-act" class="markdown-link">Queen&rsquo;s Next Act</a> extends that warning into contract enforcement: if the frontend calls an endpoint the API does not declare, or the API changes a response the frontend depends on, the required check can fail and create coordination work in the owning repo.

<svg viewBox="0 0 800 280" xmlns="http://www.w3.org/2000/svg" class="docs-svg">
  <defs>
    <linearGradient id="crBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <marker id="crArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8"/>
    </marker>
  </defs>
  <rect width="800" height="280" rx="12" fill="url(#crBg)"/>
  <text x="400" y="28" text-anchor="middle" fill="#818cf8" font-size="12" font-weight="600" letter-spacing="2" font-family="system-ui, sans-serif">CROSS-REPO SEMANTIC GOVERNANCE</text>
  <rect x="30" y="48" width="200" height="110" rx="10" fill="rgba(14,165,233,0.08)" stroke="rgba(14,165,233,0.3)" stroke-dasharray="4"/>
  <text x="130" y="68" text-anchor="middle" fill="#7dd3fc" font-size="11" font-weight="600" font-family="system-ui, sans-serif">checkout-ui repo</text>
  <rect x="50" y="80" width="160" height="28" rx="6" fill="rgba(14,165,233,0.15)" stroke="rgba(14,165,233,0.4)"/>
  <text x="130" y="99" text-anchor="middle" fill="#7dd3fc" font-size="10" font-family="system-ui, sans-serif">Agent changes frontend</text>
  <rect x="50" y="118" width="160" height="28" rx="6" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)"/>
  <text x="130" y="137" text-anchor="middle" fill="#f87171" font-size="10" font-family="system-ui, sans-serif">Calls undeclared endpoint</text>
  <rect x="270" y="43" width="260" height="195" rx="10" fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.3)"/>
  <text x="400" y="66" text-anchor="middle" fill="#c4b5fd" font-size="12" font-weight="700" font-family="system-ui, sans-serif">The Red Queen</text>
  <rect x="290" y="78" width="220" height="32" rx="6" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)"/>
  <text x="400" y="99" text-anchor="middle" fill="#a5b4fc" font-size="10" font-weight="600" font-family="system-ui, sans-serif">CALM Flow Resolution</text>
  <rect x="290" y="120" width="220" height="32" rx="6" fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.4)"/>
  <text x="400" y="141" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="600" font-family="system-ui, sans-serif">flow check</text>
  <rect x="290" y="162" width="220" height="32" rx="6" fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.4)"/>
  <text x="400" y="183" text-anchor="middle" fill="#d8b4fe" font-size="10" font-weight="600" font-family="system-ui, sans-serif">Contract check (Next Act)</text>
  <rect x="325" y="204" width="150" height="24" rx="12" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)"/>
  <text x="400" y="220" text-anchor="middle" fill="#f87171" font-size="10" font-weight="700" font-family="system-ui, sans-serif">NEXT ACT GATE</text>
  <rect x="570" y="48" width="200" height="110" rx="10" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.3)" stroke-dasharray="4"/>
  <text x="670" y="68" text-anchor="middle" fill="#93c5fd" font-size="11" font-weight="600" font-family="system-ui, sans-serif">order-api repo</text>
  <rect x="590" y="80" width="160" height="28" rx="6" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)"/>
  <text x="670" y="99" text-anchor="middle" fill="#93c5fd" font-size="10" font-family="system-ui, sans-serif">Interface: order-api-v2</text>
  <rect x="590" y="118" width="160" height="28" rx="6" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.4)"/>
  <text x="670" y="137" text-anchor="middle" fill="#93c5fd" font-size="10" font-family="system-ui, sans-serif">Declared endpoints only</text>
  <line x1="230" y1="100" x2="288" y2="94" stroke="#818cf8" stroke-width="2" marker-end="url(#crArrow)"/>
  <line x1="512" y1="94" x2="568" y2="100" stroke="#818cf8" stroke-width="2" marker-end="url(#crArrow)"/>
  <path d="M 130 163 Q 130 260, 400 260 Q 670 260, 670 163" fill="none" stroke="rgba(99,102,241,0.4)" stroke-width="1.5" stroke-dasharray="6"/>
  <text x="400" y="275" text-anchor="middle" fill="#64748b" font-size="9" font-family="system-ui, sans-serif">CALM Flow: checkout-ui  →  order-api  →  order-database</text>
</svg>

| Agent Change | Red Queen Response |
|---|---|
| Frontend calls undeclared API endpoint | **Next Act gate**: interface **order-api-v2** does not include that endpoint |
| API changes response format | **Next Act conditional**: frontend-app consumes this interface, update frontend or update contract first |
| Database drops a column | **Next Act deny**: blast radius is 4 nodes, 2 BARs, 1 flow. Requires migration ADR. |
| New service touches shared platform node | **Available now**: `validate_action` surfaces platform-impact coordination warnings and logs the verdict |



## Agent-agnostic: one control plane, every agent

Organizations use Claude Code *and* Copilot Coding Agent. Different config files. Different instruction formats. Different hook mechanisms.

**The Red Queen doesn't care which agent is holding the keyboard.** Claude Code and Copilot Coding Agent get their own hook configuration, both adapters invoke the same validator, and both can call the same MCP tools against the same CALM model. A repo-local MCP runner resolves the live mesh from env, CI checkout, or manifest defaults; configuration fingerprints and the scaffold doctor catch drift before the setup quietly rots.



## Progressive autonomy: governance earns trust

Three permission tiers, driven by governance scores:

<div class="docs-card docs-card-muted">
<div class="docs-grid">
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Autonomous</div>
<div class="docs-heading">80-100%</div>
<div class="docs-muted">Agents operate with minimal oversight. Auto-edit mode. The Red Queen&rsquo;s Court still enforces flow and control constraints; autonomy means trust, not lawlessness.</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Supervised</div>
<div class="docs-heading">50-79%</div>
<div class="docs-muted">Agents need human checkpoints. Security and threat-model guidance is injected where the repo is weak. Structural changes are routed through <code>validate_action</code>; cross-repo contract gates arrive in Queen&rsquo;s Next Act.</div>
</div>
<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">Restricted</div>
<div class="docs-heading">0-49%</div>
<div class="docs-muted">Maximum oversight. Plan-first mode. Multi-agent review board. Hooks block Bash and Write, and Edit requires recorded approval. Every decision is auditable.</div>
</div>
</div>
</div>

**Improve your governance scores, and your agents earn more autonomy.** Governance becomes a force multiplier, not a bureaucratic tax. This is the same tier system the [Hatter&rsquo;s Tea Party](/docs/hatters-tea-party) uses to bound the planning-side recycle loop: one tier definition, two enforcement points (planning gates upstream, action gates inside code).

And when you genuinely need to bypass a constraint? A scoped, per-session override ships today, and every use lands in the audit log with the tool, the rule that was bypassed, and the session ID. Queen&rsquo;s Next Act makes that override process harder to abuse: written reasons, co-signing for sensitive areas, budgets, follow-up deadlines, and signed override records. The anti-normalisation principle is the same: the exception never becomes the rule.



## The feedback loop: agents that learn

Every agent interaction is measured. Governance scores before and after, guardrail actions counted, cross-repo violations tracked, and a per-decision record written to the local audit log. Today that log tells you what the agent tried, which rule fired, and whether the action was allowed, warned, denied, or approved by override. Queen&rsquo;s Next Act connects those decision records to the same signed evidence chain the Hatter already uses on the planning side.

Governance scores aren't static. They behave like a **trust battery**: scores decay over time based on review freshness, scan recency, and dependency age. Skip a security review? Your score drifts down. Let dependencies age? The trust battery drains. Active governance earns autonomy; neglect erodes it.

In Queen's Next Act, the Red Queen will build **agent memory**: which policy rules fire most, which prompt packs resolve issues on the first pass, which repos keep violating the same contracts. That memory will feed back into policy refinements. Agents get smarter. Policies get sharper. **Governance improves continuously.**



## Where the Red Queen meets the Hatter

The two modalities cross paths at the hand-off from design to implementation. The Hatter finishes the planning work and creates a landing issue in each target code repo. Each issue carries the approved design slice and the shared audit thread. The coding agent picks it up, and from the moment it reaches for a tool, the **Red Queen governs**. Same governance scores. Same CALM model. Different governance modality.

Today the Hatter evidence chain and the Red Queen decision log sit side by side. That is honest and useful, but not yet one unified enforcement chain. Closing that seam is Queen's Next Act.



## Queen's Next Act

Today the Red Queen makes deterministic policy decisions at the repo boundary and records them locally. The Hatter, on the planning side, already has the stronger trust story: observed facts come from the runtime, GitHub state comes from the workflow, agent judgments are signed by the agent, and the verifier rejects any event whose author does not match its kind.

Queen's Next Act brings that same trust model to implementation. The Hatter makes intent and design accountable. The Red Queen will make tool use, overrides, and merge enforcement accountable under the same rules.

<div class="docs-gap-list">
  <div class="docs-gap-row">
    <div class="docs-gap-status docs-gap-status-queued">Queued</div>
    <div>
      <div class="docs-gap-title">The hard merge gate</div>
      <p class="docs-gap-body">A Red Queen required status check blocks PRs that violate architecture, security, or team policy. Low-risk changes get lightweight checks. Sensitive changes require the deeper review path.</p>
      <p class="docs-gap-next"><strong>Next:</strong> make the Red Queen verdict a required GitHub check before merge.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <div class="docs-gap-status docs-gap-status-queued">Queued</div>
    <div>
      <div class="docs-gap-title">Signed enforcement chain</div>
      <p class="docs-gap-body">Red Queen allow, warning, deny, and override decisions move from a local decision log into the same verifier-checked evidence model the Hatter uses today.</p>
      <p class="docs-gap-next"><strong>Next:</strong> sign enforcement events by their legitimate author: runtime for observed tool attempts, workflow for GitHub state, agent or human session for judgments and overrides.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <div class="docs-gap-status docs-gap-status-queued">Queued</div>
    <div>
      <div class="docs-gap-title">Cross-repo contract checks</div>
      <p class="docs-gap-body">If a frontend calls an API route that does not exist, or an API response changes in a way a consumer cannot handle, the governance check should see that before merge.</p>
      <p class="docs-gap-next"><strong>Next:</strong> compare declared interfaces across repos and fail the check when a producer and consumer no longer agree.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <div class="docs-gap-status docs-gap-status-queued">Queued</div>
    <div>
      <div class="docs-gap-title">Break-glass accountability</div>
      <p class="docs-gap-body">Overrides should be rare, scoped, and reviewable. The next version records who approved the bypass, why it was needed, how long it lasts, and which follow-up work it creates.</p>
      <p class="docs-gap-next"><strong>Next:</strong> add override budgets, written reasons, co-signing for sensitive areas, and follow-up SLAs.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <div class="docs-gap-status docs-gap-status-queued">Queued</div>
    <div>
      <div class="docs-gap-title">Agent roster and policy learning</div>
      <p class="docs-gap-body">Auditors need to know which agents exist, what they are allowed to touch, and which rules they keep hitting. Teams need that same memory to improve prompts and policies.</p>
      <p class="docs-gap-next"><strong>Next:</strong> show agent identity, owner, model, prompt hash, access scope, and repeated policy failures in Looking Glass.</p>
    </div>
  </div>
  <div class="docs-gap-row">
    <div class="docs-gap-status docs-gap-status-queued">Queued</div>
    <div>
      <div class="docs-gap-title">Architecture fitness tests</div>
      <p class="docs-gap-body">Code quality metrics are not enough. The architecture itself needs tests: declared flows, trust-zone crossings, interface compatibility, and whether repo changes still match the CALM model.</p>
      <p class="docs-gap-next"><strong>Next:</strong> turn architecture rules into repeatable checks teams can run like any other fitness function.</p>
    </div>
  </div>
</div>

For the full landscape (what Microsoft, GitHub, Snyk, and the EU AI Act are pulling forward in 2026) read the [agentic governance research](/docs/research/agentic-governance-landscape).



## Where to go next

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-rose">
    <div class="docs-heading">Quickstart on a real repo</div>
    <div class="docs-copy">Hands-on walkthrough: install hooks, repo-local MCP runner, review workflow, and first-run doctor against the IMDB-Celebs BAR (low score, Restricted tier, so the strictest enforcement path fires).</div>
    <div class="docs-copy"><a href="/docs/quickstart-redqueen" class="docs-button-secondary">Quickstart →</a></div>
  </div>
  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">🎩 Hatter's Tea Party</div>
    <div class="docs-copy">The other governance modality, upstream of code. OKR &rarr; research &rarr; PRD &rarr; code design, all audit-chained.</div>
    <div class="docs-copy"><a href="/docs/hatters-tea-party" class="docs-button-secondary">Tea Party →</a></div>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-heading">Vision overview</div>
    <div class="docs-copy">The full agentic governed SDLC: both modalities plus the Looking Glass substrate that hosts them.</div>
    <div class="docs-copy"><a href="/docs/agentic-sdlc-governance" class="docs-button-secondary">Read the vision →</a></div>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-heading">Workshop Part 7</div>
    <div class="docs-copy">90-minute hands-on workshop installing the Red Queen on a real BAR. Watch a PreToolUse hook block before it fires; promote Golden Rule 6 from advisory to deterministic.</div>
    <div class="docs-copy"><a href="/docs/workshop/part7-red-queens-court" class="docs-button-secondary">Workshop →</a></div>
  </div>
</div>



<div class="docs-hero-flourish">
  <em>"Speak when you're spoken to."</em>
  <br/><small>(the Red Queen)</small>
</div>
