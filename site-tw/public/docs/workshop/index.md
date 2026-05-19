# Workshop: Agentic Engineering, Secure by Design

<div class="docs-hero">
  <div class="docs-hero-inner">
    <div class="docs-eyebrow">Canonical learner path <span class="docs-hero-meta">~2 min read</span></div>
    <h2 class="docs-hero-title">From the rabbit hole to governed autonomy.</h2>
    <p class="docs-hero-copy">This workshop teaches teams how to move from AI experimentation into security-first, maintainable, architecture-aware delivery. All eight parts are available now: from orientation, prompt packs, live remediation, fitness functions, and scanner triage through versioned prompt library, deterministic Red Queen enforcement, and a cross-cutting capstone that ships one feature with the complete evidence chain.</p>
  </div>
</div>

## How The Story Flows

The workshop should feel like one journey, not a pile of disconnected lessons:

1. **Choose the right AI mode.** Not every task should be agentic.
2. **Give AI the right prompt contract.** RCTRO plus OWASP turns intent into verifiable work.
3. **Fix real vulnerable code.** Learners see the full remediation workflow.
4. **Measure quality automatically.** Fitness functions turn principles into gates.
5. **Expand into governance.** Scanner triage, prompt libraries, multi-agent review, and Red Queen controls complete the operating model.

<div class="docs-note">
  <strong>Delivery note:</strong> The public learner path is self-guided. The team agenda at <a href="/agenda">/agenda</a> explains workshop delivery options, audience, and outcomes for organizations.
</div>

<div class="docs-panel">
  <p class="docs-panel-copy"><strong>Workshop format.</strong> Each part includes story, theory, and a hands-on exercise. Plan roughly <strong>45–90 minutes per part</strong>; the full available path runs about <strong>4 hours</strong> and can be split across multiple sessions. Bring an editor with an AI coding assistant connected (Claude Code, Copilot, or both).</p>
</div>

## All 8 parts available

<div class="docs-grid docs-grid-wide">
  <a href="/docs/workshop/part1-spectrum" class="docs-card docs-card-blue">
    <div class="docs-card-kicker">Part 1 &middot; ~45 min</div>
    <h3 class="docs-card-title docs-card-title-lg">The Rabbit Hole</h3>
    <div class="docs-card-subtitle">The Spectrum of AI-Assisted Development</div>
    <p class="docs-card-body">Understand vibe coding, AI-assisted engineering, and agentic coding. Learn when each mode is appropriate and where human judgment remains essential.</p>
  </a>

  <a href="/docs/workshop/part2-security-prompting" class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Part 2 &middot; ~60 min</div>
    <h3 class="docs-card-title docs-card-title-lg">Cheshire&rsquo;s Prompt Pack</h3>
    <div class="docs-card-subtitle">Security-First Prompting with OWASP</div>
    <p class="docs-card-body">Use Role, Context, Task, Requirements, and Output to give AI concrete security constraints and validation criteria.</p>
  </a>

  <a href="/docs/workshop/part3-live-remediation" class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Part 3 &middot; ~90 min</div>
    <h3 class="docs-card-title docs-card-title-lg">Alice Remediates</h3>
    <div class="docs-card-subtitle">Live A03 Injection Remediation</div>
    <p class="docs-card-body">Fix SQL injection in real TypeScript code, add validation, run tests, and prepare a reviewable AI-assisted change.</p>
  </a>

  <a href="/docs/workshop/part4-fitness-functions" class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Part 4 &middot; ~75 min</div>
    <h3 class="docs-card-title docs-card-title-lg">The Looking Glass Measures</h3>
    <div class="docs-card-subtitle">Fitness Functions and Quality Gates</div>
    <p class="docs-card-body">Implement automated checks for complexity, dependency freshness, test coverage, and performance regression.</p>
  </a>

  <a href="/docs/workshop/part5-security-pipeline" class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Part 5 &middot; ~75 min</div>
    <h3 class="docs-card-title docs-card-title-lg">The Caterpillar&rsquo;s Challenge</h3>
    <div class="docs-card-subtitle">Security Pipeline · CodeQL + Snyk + SARIF Triage</div>
    <p class="docs-card-body">Wire CodeQL and Snyk into the celeb-api, then triage SARIF findings through the same Cheshire enrich and assign-the-agent loop.</p>
  </a>

  <a href="/docs/workshop/part6-team-prompt-library" class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Part 6 &middot; ~60 min</div>
    <h3 class="docs-card-title docs-card-title-lg">The Hatter&rsquo;s Library</h3>
    <div class="docs-card-subtitle">Team Prompt Library · Versioning and Provenance</div>
    <p class="docs-card-body">Version the prompt packs with semver tags and wire the Hatter&rsquo;s Tag signed-manifest footer into every AI-assisted PR.</p>
  </a>

  <a href="/docs/workshop/part7-red-queens-court" class="docs-card docs-card-rose">
    <div class="docs-card-kicker">Part 7 &middot; ~90 min</div>
    <h3 class="docs-card-title docs-card-title-lg">The Red Queen&rsquo;s Court</h3>
    <div class="docs-card-subtitle">Deterministic Enforcement · MCP + PreToolUse Hooks</div>
    <p class="docs-card-body">Install the Red Queen, watch a PreToolUse hook block a CALM-violating action, and promote the Part 4 CALM-layer fitness function from advisory to deterministic.</p>
  </a>

  <a href="/docs/workshop/part8-governance-capstone" class="docs-card docs-card-indigo">
    <div class="docs-card-kicker">Part 8 &middot; capstone &middot; ~120 min (+30 min bonus)</div>
    <h3 class="docs-card-title docs-card-title-lg">Through the Looking Glass</h3>
    <div class="docs-card-subtitle">Governance Capstone · One Cross-Cutting PR with Full Evidence</div>
    <p class="docs-card-body">Ship one cross-cutting feature across all four IMDB-lite repos with the complete evidence chain: CALM, STRIDE, RCTRO, fitness, Hatter&rsquo;s Tag, Red Queen audit log. The bonus research-first prelude shows the Archeologist, PRD agent, and cross-repo bridge all firing before the implementation work begins &mdash; same evidence chain, two entry points.</p>
  </a>

  <a href="/docs/workshop/agentic-sdlc-touchpoints" class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Reference &middot; ~8 min</div>
    <h3 class="docs-card-title docs-card-title-lg">Agentic SDLC touchpoints</h3>
    <div class="docs-card-subtitle">Workshop &harr; mesh-artifact map</div>
    <p class="docs-card-body">Reference index: after each workshop Part, which mesh artifact lands on disk and how the agentic SDLC pipeline reads it. Open this alongside any workshop part to see how today&rsquo;s work feeds the OKR-driven pipeline.</p>
  </a>
</div>

<div class="docs-note">
  <strong>Going further:</strong> the standalone <a href="/docs/walkthrough/research-prd-chain" class="markdown-link">Research &rarr; PRD &rarr; Implementation walkthrough</a> covers the same chain outside the IMDB-lite fixture &mdash; useful when you want to run the loop against your own mesh. It includes the full scaffolding checklist for existing meshes.
</div>

## What You Need

| Area | Expectation |
|---|---|
| Technical baseline | JavaScript or TypeScript basics, Git, command-line comfort |
| Security baseline | Basic awareness of injection, authentication, authorization, and logging risks |
| Tools | VS Code or similar IDE, Node.js 18+, Git, and access to at least one AI coding assistant |
| Optional | GitHub Copilot, Claude Code, Docker, PostgreSQL for deeper local exercises |

## Resources Used Throughout

- [Framework overview](/docs/framework)
- [SDLC guide](/docs/sdlc/)
- [STRIDE threat modeling prompts](/docs/prompts/threat-modeling/)
- [OWASP prompt packs](/docs/prompts/owasp/)
- [Maintainability prompt packs](/docs/prompts/maintainability/)
- [Golden Rules](/docs/governance/governed-golden-rules)
- [Red Queen quickstart](/docs/quickstart-redqueen)
- [GitHub repository examples](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/examples)

## Coming next: Research + PRD agents

With all 8 parts live, the next chapter extends upstream of implementation. Two new mesh-side agents take a plain-English brief and produce an audit-grade research doc and a grounded PRD &mdash; the inputs Cheshire turns into RCTRO issues for the coding agents.

<div class="docs-grid">
  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Next &middot; mesh agent</div>
    <h3 class="docs-card-title docs-card-title-lg">The Archeologist</h3>
    <div class="docs-card-subtitle">Research Agent &middot; market research and code archaeology</div>
    <p class="docs-card-body">Plain-English brief in, mesh-grounded research doc out: per-provider queries (Tavily, arXiv, USPTO, HN), source-to-claim traceability, audit hash chain, Hatter&rsquo;s Tag.</p>
  </div>

  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Next &middot; mesh agent</div>
    <h3 class="docs-card-title docs-card-title-lg">The PRD Agent</h3>
    <div class="docs-card-subtitle">PRD Agent &middot; grounded against CALM, STRIDE, OWASP, NIST</div>
    <p class="docs-card-body">Research doc + mesh context in, PRD with bidirectional traceability out. Parallel architecture + security review nodes with a cyclic refinement loop until grounding threshold is met.</p>
  </div>
</div>

## Begin

<div class="docs-card-row">
  <div class="docs-actions docs-actions-center">
    <a href="/docs/workshop/part1-spectrum" class="docs-button-primary docs-button-large">Start Part 1</a>
    <a href="/agenda" class="docs-button-secondary docs-button-large">View Team Agenda</a>
  </div>
</div>
