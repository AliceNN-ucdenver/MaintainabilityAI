<div class="docs-hero docs-hero-violet">
  <div class="docs-hero-glyph"><img src="/images/glyphs/magnifier.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><span>Research</span><span class="sep">/</span><span>Agentic governance landscape</span></div>
    <div class="docs-eyebrow">Research &middot; May 2026 <span class="docs-hero-meta">~6 min read</span></div>
    <h1 class="docs-hero-title">Agentic SDLC governance &mdash; the 2026 landscape</h1>
    <p class="docs-hero-copy">Microsoft, GitHub, Snyk, Anthropic, and the standards bodies all shipped in Q1 2026. Here&rsquo;s where the market sits, where MaintainabilityAI fits, and what we&rsquo;re building next to cover the gaps an enterprise auditor will ask about.</p>
    <span class="docs-hero-flourish">&ldquo;If you don&rsquo;t know where you&rsquo;re going, every audit gets you there. Eventually.&rdquo;</span>
  </div>
</div>

## What changed in Q1 2026

Four shipments in three months reshaped the agentic governance conversation:

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-blue">
    <div class="docs-card-kicker">26 Feb 2026 &middot; Platform</div>
    <h3 class="docs-card-title">GitHub Enterprise AI Controls &amp; Agent Control Plane</h3>
    <p class="docs-card-body">GA. Consolidated AI Controls tab, policies for Copilot cloud agent, code review and custom agents, an &ldquo;AI manager&rdquo; role, an agent session audit log.</p>
  </div>

  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Mar 2026 &middot; Security tooling</div>
    <h3 class="docs-card-title">Snyk Evo AI-SPM &amp; Agent Security</h3>
    <p class="docs-card-body">RSAC 2026 launch. Discovery Agent builds a live AI-BOM, Risk Intelligence Agent enriches it, Policy Agent translates plain-English governance into CI guardrails, Agent Guard runtime tool-call blocking (private preview).</p>
  </div>

  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">2 Apr 2026 &middot; Runtime</div>
    <h3 class="docs-card-title">Microsoft Agent Governance Toolkit</h3>
    <p class="docs-card-body">MIT-licensed, seven packages, framework-agnostic. Claims OWASP Agentic Top 10 coverage at sub-ms latency. Application-layer Python-first; SDKs for TS, .NET, Rust, Go.</p>
  </div>

  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">2026 &middot; Standards</div>
    <h3 class="docs-card-title">OWASP Top 10 for Agentic Applications</h3>
    <p class="docs-card-body">Ten threats (T1&ndash;T10): memory poisoning, tool misuse, privilege compromise, resource overload, cascading hallucination, intent breaking, deceptive behaviour, repudiation, identity spoofing, HITL overwhelm.</p>
  </div>
</div>

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>The big regulatory deadline:</strong> the <strong>EU AI Act</strong> Article 12 (automatic logging) and Article 14 (human oversight) requirements for high-risk systems take effect on <strong>2 August 2026</strong>. Article 12 expects <em>full traceability</em> of inputs, outputs, decision points, model version, and operator identity for at least six months. If your customer-facing software is built <em>by</em> AI agents, the build pipeline needs to produce evidence too.</p>
</div>

## Two camps emerging

The market is partitioning into two complementary categories. Tools rarely do both well; the products that try, do.

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Camp A &middot; Runtime governance</div>
    <h3 class="docs-card-title">Govern the agent&rsquo;s actions</h3>
    <p class="docs-card-body">Intercept tool calls, validate against policy, sandbox execution, sign inter-agent messages, kill rogue runs.</p>
    <p class="docs-muted">Microsoft AGT &middot; Snyk Agent Guard &middot; GitHub agent control plane &middot; Anthropic hook architecture</p>
  </div>

  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Camp B &middot; Engineering process governance</div>
    <h3 class="docs-card-title">Govern the SDLC the agent participates in</h3>
    <p class="docs-card-body">Architecture-as-code, prompt packs as specs, fitness functions, threat models, PR review enrichment, audit chain. Treat the agent like a developer with a known trust score.</p>
    <p class="docs-muted">MaintainabilityAI (Looking Glass &middot; Cheshire Cat &middot; Red Queen) is the open-source reference for Camp B.</p>
  </div>
</div>

## Where MaintainabilityAI sits

<div class="docs-panel">
  <p class="docs-panel-copy">No competitor combines two assets at the heart of our framework: <strong>architecture-as-code</strong> (CALM 1.2 in Looking Glass) feeding <strong>deterministic policy enforcement</strong> (Red Queen) keyed to that architecture model. Snyk&rsquo;s Policy Agent enforces security guardrails in CI but doesn&rsquo;t know an architecture flow; GitHub&rsquo;s AI Controls govern which agent can run but not which architectural edge it can cross; Port and OpsLevel know the service catalog but don&rsquo;t gate agent tool calls. The four-pillar BAR score feeding agent permission tiers is also unique &mdash; everyone else either denies/allows globally or uses static role-based controls.</p>
</div>

## What competitors ship that we&rsquo;re catching up on

We&rsquo;re honest about the gaps. The following are real capabilities competitors ship today that MaintainabilityAI is adding next.

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; audit chain</div>
    <h3 class="docs-card-title">Tamper-evident audit log + SIEM export</h3>
    <p class="docs-card-body">Microsoft AGT ships Merkle-chained logs + CloudEvents v1.0. Anthropic Compliance API streams ~30 typed events. We log Red Queen decisions but don&rsquo;t yet have a tamper-evident chain or SIEM-ready export. <strong>Building as &ldquo;The Court Recorder&rdquo;.</strong></p>
  </div>

  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; AI-BOM</div>
    <h3 class="docs-card-title">Live agent inventory</h3>
    <p class="docs-card-body">Snyk Evo AI-SPM Discovery Agent. ISO 42001 A.6.2.7 expects it; EU AI Act Art. 49 requires database registration for high-risk systems. We don&rsquo;t yet track every deployed agent, model version, and system prompt. <strong>Building as &ldquo;Agent Roster&rdquo; in Looking Glass.</strong></p>
  </div>

  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; per-PR provenance</div>
    <h3 class="docs-card-title">Model + prompt + threat-model fingerprint per commit</h3>
    <p class="docs-card-body">EU AI Act Art. 12 requires it; 2026 SOC 2 auditors now ask for the prompt as part of CC8.1 design evidence. Nobody ships this well yet. <strong>Building as &ldquo;The Hatter&rsquo;s Tag&rdquo;.</strong></p>
  </div>

  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; independence</div>
    <h3 class="docs-card-title">Tests that didn&rsquo;t come from the author</h3>
    <p class="docs-card-body">NIST 800-53 SA-11 and SOC 2 segregation of duties expect independent test evidence. Most teams let the same agent write code and tests. <strong>Shipping as persona-switch self-critique inside the author agent &mdash; Architect + Security personas in bounded rounds, each scoring against the same mesh state.</strong> Segregation is addressed via the persona contract plus the per-persona, per-round signed <code>self_review</code> events on the audit chain &mdash; the chain itself is the independence evidence.</p>
  </div>

  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; architecture tests</div>
    <h3 class="docs-card-title">Behavioural conformance to the CALM model</h3>
    <p class="docs-card-body">ArchUnit-style architecture tests exist, but none are CALM-aware. We have fitness functions for <em>code</em> (complexity, coverage, perf); we don&rsquo;t yet have them for <em>architecture behaviour</em> (declared flows, trust-zone crossings, interface contracts). <strong>Building as &ldquo;The Caterpillar&rsquo;s Challenge&rdquo;.</strong></p>
  </div>

  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; standards</div>
    <h3 class="docs-card-title">Crosswalks for EU AI Act + ISO 42001 + NIST AI RMF</h3>
    <p class="docs-card-body">Our existing <a href="/docs/governance/compliance-mapping" class="markdown-link">Compliance Mapping</a> covers SOC 2, ISO 27001, NIST 800-53, PCI DSS. The three AI-specific standards aren&rsquo;t yet mapped. <strong>Extending the mapping page next.</strong></p>
  </div>
</div>

## Two new disciplines surfaced in Q2 2026

Two related disciplines crystallised this quarter. Both are <strong>complementary</strong> to what we build, not alternatives &mdash; and both clarify where MaintainabilityAI plugs in.

### Harness engineering &mdash; <code>Agent = Model + Harness</code>

Ryan Lopopolo at OpenAI named the discipline on 11 February 2026: the <strong>harness</strong> is everything around an AI agent that isn&rsquo;t the model itself &mdash; system prompts, <code>AGENTS.md</code>, skills, tool descriptions, MCP servers, sandboxes, hooks, permission gates, memory, evaluators, drift detection, observability. Martin Fowler, Addy Osmani, and Augment Code have published in-depth treatments since.

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>The Ratchet principle (Addy Osmani):</strong> &ldquo;Every line in a good <code>AGENTS.md</code> should be traceable back to a specific thing that went wrong.&rdquo; That&rsquo;s the discipline. The harness gets tighter every time the agent slips.</p>
</div>

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Where they overlap with governance</div>
    <h3 class="docs-card-title">Hooks, sandboxes, fitness functions</h3>
    <p class="docs-card-body">Pre-tool hooks, post-edit hooks, pre-commit gates, sandbox isolation, structural tests &mdash; the canon of harness engineering names exactly the primitives MaintainabilityAI ships through Red Queen and Cheshire.</p>
  </div>
  <div class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Where the canon goes silent</div>
    <h3 class="docs-card-title">Audit, provenance, evidence</h3>
    <p class="docs-card-body">Fowler, Osmani, and the OpenAI post don&rsquo;t discuss audit trails, reproducibility across runs, or evidence chains. That gap &mdash; auditable engineering process around the harness &mdash; is where governance picks up.</p>
  </div>
</div>

**MaintainabilityAI&rsquo;s framing:** *we are the governance layer that compiles policy into the harness, then audits the trajectories the harness produces.* The Looking Glass holds the policy (BAR scores, CALM model, IntentSpecs). Harness Compiler (proposed) emits the harness config from that policy. The Court Recorder (proposed) captures the trajectories. The trio closes the audit gap the harness canon leaves open.

### Intent governance &mdash; declarative intent that travels with the work

Three converging threads:

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Microsoft &middot; Mar 2026</div>
    <h3 class="docs-card-title">Four-layer intent cascade</h3>
    <p class="docs-card-body">Organisational &rarr; Role &rarr; Developer &rarr; User. Deny-by-default cascade &mdash; lower layers can only narrow, never expand, what higher layers permit.</p>
  </div>
  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker"><a href="https://intentspec.org" class="markdown-link">IntentSpec.org</a> open standard</div>
    <h3 class="docs-card-title">Machine-readable spec artifact</h3>
    <p class="docs-card-body">Markdown + YAML frontmatter declaring <code>id</code>, <code>objective</code>, <code>outcomes</code>, <code>constraints</code>, <code>edgeCases</code>, <code>healthMetrics</code>. Validated by a GitHub Action; gates PRs that reference malformed specs.</p>
  </div>
  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">CSA &middot; Mar 2026</div>
    <h3 class="docs-card-title">Declarative governance</h3>
    <p class="docs-card-body">&ldquo;Defining intent rather than hard-coding permissions.&rdquo; The system continuously observes activity against expectations and intervenes when usage falls outside policy.</p>
  </div>
</div>

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>RCTRO is already a partial IntentSpec.</strong> Our prompt packs encode Role + Context + Task + Requirements + Output &mdash; most of the IntentSpec contract is already there. What&rsquo;s missing is the <strong>frontmatter schema</strong> (so CI can validate), a <strong>versioned spec ID</strong> (so commits can reference it), <strong>machine-readable acceptance checks</strong>, and the <strong>four-layer cascade through <code>mesh.yaml</code></strong>. Closing that gap is small in code and large in audit value.</p>
</div>

### What we&rsquo;re adding from these disciplines

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; IntentSpec adoption</div>
    <h3 class="docs-card-title">Cheshire&rsquo;s IntentSpec</h3>
    <p class="docs-card-body">Adopt the open standard. Add MaintainabilityAI-specific frontmatter (<code>owasp_categories</code>, <code>stride_threats</code>, <code>calm_nodes</code>, <code>fitness_gates</code>, <code>governance_tier_required</code>) and ship a <code>validate-intentspec</code> GitHub Action.</p>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; four-layer cascade</div>
    <h3 class="docs-card-title">The Court Hierarchy</h3>
    <p class="docs-card-body">Extend <code>mesh.yaml</code> with <code>intent.layers.{organisational, role, developer, user}</code>. Red Queen evaluates top-down; an action must pass every layer above where it originates.</p>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; harness compiler</div>
    <h3 class="docs-card-title">Harness Compiler</h3>
    <p class="docs-card-body">Cheshire compiles BAR (governance scores) + IntentSpec (intent + constraints) + CALM (architecture) into a complete agent harness &mdash; <code>AGENTS.md</code>, hooks, skills, MCP config, <code>CLAUDE.md</code>. Re-runs when policy changes; harness is version-pinned to commit SHA.</p>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; intent provenance</div>
    <h3 class="docs-card-title">Intent Thread</h3>
    <p class="docs-card-body">Every IntentSpec gets a UUID. Every agent action, commit, PR, review, and merge stamps that UUID. The Court Recorder can answer &ldquo;show me everything that happened under <code>INT-EXPORT-JSON-001</code>&rdquo; in chronological order &mdash; across repos.</p>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gap &middot; intent fidelity</div>
    <h3 class="docs-card-title">Intent Fidelity gate</h3>
    <p class="docs-card-body">A new fitness function. Inputs: IntentSpec referenced by the PR, the diff, the test results. Mechanism: schema check (every declared outcome must have a referencing test) plus an LLM-judge semantic check. Fails CI on threshold breach.</p>
  </div>
</div>

## What we already have that competitors don&rsquo;t

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-cyan">
    <h3 class="docs-card-title">CALM-aware deterministic enforcement</h3>
    <p class="docs-card-body">Red Queen&rsquo;s deterministic policy checks the actual CALM flow model before allowing structural changes. No competitor enforces against an architecture-as-code model.</p>
  </div>

  <div class="docs-card docs-card-blue">
    <h3 class="docs-card-title">Score-gated agent autonomy</h3>
    <p class="docs-card-body">Permission tiers (Autonomous 80&ndash;100, Supervised 50&ndash;79, Restricted 0&ndash;49) keyed to four-pillar BAR governance score. Earn trust by improving score; lose it by neglect.</p>
  </div>

  <div class="docs-card docs-card-emerald">
    <h3 class="docs-card-title">RCTRO prompt-pack-as-spec</h3>
    <p class="docs-card-body">10 OWASP packs &middot; 6 STRIDE packs &middot; 7 maintainability packs, scaffolded into every repo via Cheshire. The pack is the agent contract <em>and</em> the reviewer&rsquo;s checklist.</p>
  </div>

  <div class="docs-card docs-card-rose">
    <h3 class="docs-card-title">6-phase SDLC framework</h3>
    <p class="docs-card-body">Design, implement, verify, govern, deploy, evolve &mdash; each phase has a measurable gate, every gate ties to compliance evidence. The agent fits inside this process, not around it.</p>
  </div>
</div>

## Complementary to Microsoft AGT

We acknowledge Microsoft&rsquo;s AGT explicitly: it&rsquo;s the strongest open-source runtime governance product shipped to date. Their <a href="https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/LIMITATIONS.md" class="markdown-link">LIMITATIONS.md</a> lists what they intentionally don&rsquo;t cover: RAG/knowledge provenance, credential lifecycle, prompt-injection detection, reasoning-trace correlation, and human-developer SDLC artifacts beyond CI pass/fail. Those are precisely where engineering-process governance picks up.

A team can &mdash; and we expect, increasingly will &mdash; run both:

- **Microsoft AGT** intercepting agent actions at runtime
- **MaintainabilityAI** governing the SDLC the agents participate in, with the audit chain flowing through both

Red Queen&rsquo;s MCP server can call AGT&rsquo;s policy engine for runtime decisions; AGT&rsquo;s audit chain merges with ours through CloudEvents v1.0. We&rsquo;re building the integration.

## The auditor&rsquo;s master question

Everything above maps to one question your security and compliance reviewer will ask:

<div class="docs-cta">
  <h2 class="docs-cta-title">&ldquo;Show me how this feature was built.&rdquo;</h2>
  <p class="docs-cta-copy">By which agent. With which prompt. Against which threat model. With what test coverage. Who approved. What was the rationale.</p>
  <div class="docs-actions docs-actions-center">
    <a href="/docs/governance/compliance-mapping" class="docs-button-primary">See the compliance mapping &rarr;</a>
    <a href="/docs/red-queens-court#queens-next-act" class="docs-button-secondary">See Queen&rsquo;s Next Act</a>
  </div>
</div>

The combination of <strong>The Court Recorder</strong> (audit chain), <strong>The Hatter&rsquo;s Tag</strong> (per-PR provenance), <strong>The Knight&rsquo;s Seal</strong> (per-event, per-epoch Ed25519 signing of audit events &mdash; original agent = epoch 1, each revise-agent dispatch = epoch 2, 3, &hellip;; every event signed under its epoch&rsquo;s keypair, the public key committed to the mesh so any third-party auditor can verify offline), <strong>persona-switch self-critique</strong> (Architect + Security personas in the author agent, each emitting a signed <code>self_review</code> audit event per persona per round), and <strong>The Caterpillar&rsquo;s Challenge</strong> (architecture conformance tests) is designed to answer that question completely &mdash; from one PR back to the prompt, model version, threat model, and approval rationale that produced it.

---

## References

- [Microsoft Agent Governance Toolkit announcement &mdash; 2 Apr 2026](https://opensource.microsoft.com/blog/2026/04/02/introducing-the-agent-governance-toolkit-open-source-runtime-security-for-ai-agents/)
- [microsoft/agent-governance-toolkit on GitHub](https://github.com/microsoft/agent-governance-toolkit)
- [Microsoft AGT LIMITATIONS doc](https://github.com/microsoft/agent-governance-toolkit/blob/main/docs/LIMITATIONS.md)
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [NIST AI RMF + Generative AI Profile (NIST-AI-600-1)](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- [ISO/IEC 42001:2023 AI management system](https://www.iso.org/standard/42001)
- [EU AI Act Annex IV technical documentation](https://artificialintelligenceact.eu/annex/4/)
- [GitHub Enterprise AI Controls GA &mdash; 26 Feb 2026](https://github.blog/changelog/2026-02-26-enterprise-ai-controls-agent-control-plane-now-generally-available/)
- [Snyk Evo AI-SPM &amp; Agent Security at RSAC 2026](https://snyk.io/news/snyk-launches-agent-security-solution/)
- [Anthropic Compliance API](https://www.anthropic.com/news/compliance-api)
- [Port &mdash; agentic engineering platform](https://www.port.io/blog/backstage-is-dead)

### Harness engineering canon

- [Harness engineering &mdash; OpenAI (Ryan Lopopolo, 11 Feb 2026)](https://openai.com/index/harness-engineering/)
- [Harness Engineering &mdash; Martin Fowler / Birgitta B&ouml;ckeler](https://martinfowler.com/articles/harness-engineering.html)
- [Agent Harness Engineering &mdash; Addy Osmani](https://addyosmani.com/blog/agent-harness-engineering/)
- [Harness Engineering for AI Coding Agents &mdash; Augment Code](https://www.augmentcode.com/guides/harness-engineering-ai-coding-agents)
- [awesome-harness-engineering on GitHub](https://github.com/ai-boost/awesome-harness-engineering)

### Intent governance / engineering

- [Microsoft Security Blog &mdash; Aligning User, Developer, Role, and Organizational Intent](https://techcommunity.microsoft.com/blog/microsoft-security-blog/governing-ai-agent-behavior-aligning-user-developer-role-and-organizational-inte/4503551)
- [CSA &mdash; Building a Declarative Governance Framework for the Agentic Era](https://cloudsecurityalliance.org/blog/2026/03/05/building-a-declarative-governance-framework-for-the-agentic-era)
- [IntentSpec open standard](https://intentspec.org/)
- [Pathmode &mdash; Intent Engineering](https://pathmode.io/glossary/intent-engineering)
- [InfoQ &mdash; Architectural Governance at AI Speed](https://www.infoq.com/articles/architectural-governance-ai-speed/)
