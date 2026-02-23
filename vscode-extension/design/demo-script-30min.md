# MaintainabilityAI Demo — 30 Minutes
## "Through the Looking Glass: Governing the Architecture of Tomorrow"

**Presenter:** Shawn McCarthy — Chief Archeologist
**Duration:** ~30 minutes (edit points marked)
**Starting state:** VS Code open, governance mesh initialized, Looking Glass on the empty Application tab

---

## Cold Open

> *"In Alice in Wonderland, Alice steps through the looking glass and discovers a world where nothing is quite what it seems — where a cat grins without a body, a caterpillar asks impossible questions, and a white rabbit leads you somewhere you never expected to go.*
>
> *In enterprise architecture, we have our own looking glass moment. We've spent decades as the Great and Powerful Oz — hiding behind curtains, handing down edicts, enforcing standards nobody reads. But what if we became Alice instead? Curious. Enabling. Building worlds where teams can explore and deliver with confidence.*
>
> *I'm Shawn McCarthy — the Chief Archeologist — and today I'm going to show you what happens when you stop being Oz and start being Alice. When governance becomes a product, not a gate."*

---

## Act I — The Looking Glass

> *"We're sitting in the Looking Glass — our urban planning dashboard. I've already initialized a governance mesh, which is just a lightweight YAML structure that organizes a portfolio into platforms and business application repositories. Think of platforms as city districts and BARs as the buildings within them. Right now, the application tab is empty. We have a city plan but no buildings yet."*

**Switch to the Enterprise Architecture lens.**

> *"Before we build anything, we need to understand what we're building and why. This is the enterprise architecture view — business capabilities on the left, applications on the right. Capabilities are what the business does. Applications are how technology supports it. This is the 'what' before the 'how' — strategic business alignment, not code-first thinking."*

**Navigate the business capability tree.**

> *"You can see capabilities organized as a hierarchy — content management, user engagement, search and discovery. Each one represents a business function that needs technology behind it. This is the conversation we should be having with our CIOs: which capabilities matter most, and where are the gaps?"*

**Switch to the application view.**

> *"The application view maps BARs to those capabilities. Right now it's empty — so let's fix that."*

**Create a new platform: "IMDB Lite".**

> *"I'm creating a platform called IMDB Lite — a simple movie database application. This is our city district. Every platform gets its own directory in the governance mesh with room for multiple business applications inside it."*

**Create a BAR: "IMDB Lite Application".**

> *"And now the BAR — the business application repository. This is the single source of truth for one application: its architecture, its decisions, its threat model, its reviews. Everything about this application lives here."*

**Apply the three-tier archetype.**

> *"Rather than starting from scratch, I'm applying the three-tier web app archetype — this gives us a Web Frontend, a Movie API, and a Database as starting CALM nodes with sensible default relationships and controls. CALM is the Common Architecture Language Model — it's our canonical format. Think of it as the zoning plan for this district."*

**Show the context view diagram.**

> *"Here's our context view — this is how the outside world sees the system. We have an end user actor connecting to the web frontend, the frontend talking to the API, the API talking to the database. Simple, clear, communicable. Your CIO can read this."*

**Switch to the logical view.**

> *"The logical view goes deeper — internal components, interfaces, data flows. This is the architect's view. You can see the API has REST interfaces defined, the database has connection interfaces, and there are data flow relationships between them."*

**Click into the Movie API node. Show the controls panel.**

> *"Now here's where it gets interesting. Click into any node and you see the controls attached to it — authentication required, rate limiting, input validation. These aren't documentation. These are commitments. When we say this API endpoint requires authentication and rate limiting, that's not a wish — it's a specification that flows all the way through to implementation and verification."*

**Click a relationship. Show controls on the connection.**

> *"Same on relationships — this connection between the API and the database has TLS encryption and parameterized queries as controls. Every boundary, every data flow, every trust boundary has explicit controls defined."*

---

## Act II — The Caterpillar's Questions

**Navigate to the ADR section on the architecture pillar.**

> *"Absolem the Caterpillar sits on his mushroom and asks the most important question in architecture: 'Who are you?' What decisions define this system? Why were they made? Architecture Decision Records are our institutional memory — and they live right here alongside the architecture, not in a wiki nobody reads."*

**Create an ADR: "Use Express.js for the Movie API" — status: accepted.**

> *"I'm recording a decision — we're using Express.js for the Movie API. Status: accepted. I can set the characteristics — reversibility is high because Express is swappable, cost is low, complexity is low. These aren't just metadata — they help future architects understand the trade-offs when they inevitably revisit this decision."*

**Show the characteristics sliders and ADR links.**

> *"I can also link decisions together — this one depends on our Node.js runtime decision, it's related to our API design patterns decision. The ADR graph becomes a map of architectural intent."*

**Open the Absolem chat panel on the architecture tab.**

> *"But Absolem isn't just asking questions — he's helping us refine our answers. Absolem is our experimental architecture agent. He understands CALM natively and can propose changes to the architecture through conversation."*

**Type: "Add an authentication service to the architecture"**

> *"I'm asking Absolem to add an authentication service. Watch what happens."*

**Show Absolem proposing CALM patches — new node, new relationships, controls.**

> *"Absolem proposes a set of CALM patches — a new authentication service node, relationships connecting it to the API and frontend, and controls for token validation and session management. This is rendered as markdown right in the chat — you can read the reasoning, see the specific changes, and decide whether to accept them."*

**Click Apply on the patches. Watch the diagram update.**

> *"I'll apply the patches — and the architecture diagram updates immediately. A new node, new connections, new controls. Architecture as conversation, with every change reviewable before it lands."*

**Navigate to the Security pillar.**

> *"Now let's talk about threats. The CIO article I published talks about security posture as a portfolio health metric — 90% vulnerability-free as a target. But you can't fix what you haven't modeled. The security pillar lets us generate a STRIDE threat model directly from our CALM architecture."*

**Click Generate Threat Model.**

> **[PAUSE FOR EDIT]** — Threat model generation takes 30-60 seconds.

**Show the STRIDE threat model results — threats by category, risk levels.**

> *"The threat model is generated from the architecture — it knows about every node, every relationship, every data flow, every control we've already defined. Here are the results broken down by STRIDE category — spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege."*

**Show the Mermaid threat diagram.**

> *"There's a visual threat diagram showing the attack surface — you can see which components are most exposed and where the highest-risk boundaries are."*

**Click into a specific threat. Show attack vector, impact, recommended mitigations.**

> *"Let me click into this one — SQL injection on the Movie API. It shows the attack vector, the impact, the likelihood, and critically — the recommended mitigations. Parameterized queries, input validation, prepared statements. Now look — these mitigations map directly back to the controls we already defined on the CALM nodes. That's the security chain: threat model identifies the risk, mitigations define the response, controls encode it in the architecture, and implementation enforces it in code."*

---

## Act III — Down the Rabbit Hole

**Navigate back to the BAR detail page.**

> *"Now the White Rabbit appears — always hurrying, always leading us somewhere new. We have an architecture. We have a threat model. It's time to turn all of that into a running codebase."*

**Click "Implement based on architecture".**

> *"When I click 'Implement based on architecture,' the extension reads the CALM file and presents me with the components I can implement."*

**Show the component selector — Web Frontend, Movie API, Database.**

> *"Here are the CALM nodes — Web Frontend, Movie API, Database. Each one is a potential repository. I'm going to pick the Movie API."*

**Select "Movie API" — repo name auto-fills as `movie-api`.**

> *"The repo name auto-fills from the component name — movie-api. The full URL is constructed from the organization we detected. And notice — this URL is being added to the BAR's app.yaml. The architecture now knows which repository implements which component."*

**Click "Down the Rabbit Hole".**

> *"Down the rabbit hole we go. The scaffold panel opens — this is where we give the repository its SDLC skeleton."*

**Scaffold panel: select target folder.**

> *"I'll pick a target folder for the project."*

**Show the default selections: CLAUDE.md, GitHub Actions CI, PR template, CodeQL, fitness functions.**

> *"The defaults are already sensible — a CLAUDE.md file so AI agents understand the project, GitHub Actions CI pipeline, a pull request template with a security checklist, CodeQL for static analysis, and fitness functions for automated quality gates. This is the building's foundation — before a single line of application code is written, the governance infrastructure is in place."*

**Select language: TypeScript, runtime: Node.js, framework: Express.**

> *"TypeScript, Node.js, Express — matching our ADR decision."*

**Check "Create GitHub repository". Click "Scaffold Project".**

> *"I'll have it create the GitHub repository for me and scaffold the project."*

**On completion — click "Create Component Feature".**

> *"The scaffold is done. Now I click 'Create Component Feature' — the White Rabbit hands us off to the Rabbit Hole with all the context from the architecture baked in."*

**Rabbit Hole opens in create mode — show the pre-populated description.**

> *"Look at this description field. The Rabbit Hole didn't open blank — it's pre-populated with everything the implementing agent needs to know. The CALM architecture with nodes and relationships. The ADRs we recorded. The threat model summary. The scaffold guidelines. All of that context, assembled automatically from the governance mesh."*

**Scroll through: architecture context, ADR references, threat model summary.**

> *"CALM nodes and their interfaces. ADR-001: Use Express.js. The STRIDE threat analysis. Scaffold implementation guidelines. This is the architectural intent, translated into a structured specification."*

**Expand the Advanced Prompt Packs toggle. Show pre-selected packs.**

> *"Behind this toggle are the prompt packs — pre-selected based on the architecture. OWASP Top 10 categories relevant to this component, STRIDE threat modeling guides, maintainability packs for complexity and dependency hygiene. These are the detailed security and quality guides that get embedded in the GitHub issue. The agent sees all of this."*

**Click "Generate RCTRO".**

> *"Now I generate the RCTRO prompt — Role, Context, Task, Requirements, Output. This is our structured specification format."*

> **[PAUSE FOR EDIT]** — RCTRO generation takes 15-30 seconds.

**Show the generated RCTRO — walk through each section.**

> *"Here's the generated RCTRO. The Role defines who the agent is — a senior engineer implementing a governed component. The Context gives it the architecture and constraints. The Task is specific — implement the Movie API following these interfaces. And the Requirements — look at these. Each one is traceable to a security control or quality gate from our architecture. Input validation on all endpoints. Authentication middleware. Rate limiting. Structured logging. Test coverage above 80%. These aren't vague instructions — they're structured, verifiable requirements derived from our CALM controls and threat model."*

**Click "Submit Issue".**

> *"I'll submit this as a GitHub issue."*

> **[PAUSE FOR EDIT]** — Issue creation takes a few seconds.

**On the assign screen — click "Copilot".**

> *"The issue is created. Now I assign it to Copilot — the SWE agent picks up the issue and begins implementing against the RCTRO specification."*

**Switch to the browser. Show the GitHub issue.**

> *"Let's peek behind the curtain — not as Oz hiding back there, but as Alice, curious about what's actually happening. Here's the GitHub issue the agent is working from."*

**Walk through the issue body section by section.**

> *"At the top — the RCTRO prompt with all five sections. Below that — the Security-First Baseline. This is the default prompt pack that every issue gets, and we just updated it to be comprehensive. Full OWASP Top 10 implementation checklist. STRIDE build-time controls table. Maintainability quality gates. And a new section — CALM Architecture Controls — telling the agent to review every control on every node and relationship and implement them as coded enforcement, not just comments."*

**Expand the collapsible pack sections.**

> *"Below the baseline, the individual prompt packs are in collapsible sections — OWASP security guidance, maintainability guidance, STRIDE threat model analysis. Each one is a detailed remediation guide. The agent has everything it needs."*

**Navigate to the Copilot PR. Show "1 workflow awaiting approval".**

> *"Copilot has already started — there's a PR with a workflow awaiting approval. I need to approve the CI pipeline to run on this new repository."*

**Click "Approve and run".**

> *"Approved. Copilot is now implementing the Movie API — guided by our architecture, constrained by our security baseline, measured against our quality gates. Let's come back when it's done."*

> **[PAUSE FOR EDIT]** — Copilot implementation takes several minutes.

---

## Act IV — Through the Mirror

**Show the PR — code changes, CI checks.**

> *"The White Rabbit has done its work. Copilot's PR is ready — let's see what came back through the looking glass."*

**Scroll through the code changes. Point out security controls in the implementation.**

> *"Look at the implementation — parameterized queries on the database layer, input validation middleware using Zod schemas, authentication middleware on protected routes, rate limiting on the API endpoints, structured JSON logging. These aren't accidents — these are direct implementations of the controls we defined in the CALM architecture and the requirements in the RCTRO prompt."*

**Show CI checks passing.**

> *"CI checks are green — linting, tests, CodeQL security scan all passing."*

**Merge the PR.**

> *"I'll merge this."*

**Switch back to VS Code. Show the Security Scorecard with the active issue banner.**

> *"Back in VS Code, the Security Scorecard was tracking this the whole time — it detected the open issue, the draft PR, the CI status. Now that I've merged, the banner clears. The issue is closed, the PR is merged."*

**Click Sync — pull changes locally.**

> *"I'll sync to pull the changes down locally."*

**Show the scorecard updating with repository health metrics.**

> *"And now the scorecard refreshes with actual data from the repository — health score, security findings, test coverage, dependency status. Remember the CIO article's metrics? Release quality, security posture, technical foundation. This is where those portfolio health metrics come alive at the repository level."*

**Walk through scorecard sections: health score, security findings, coverage, dependencies.**

> *"Overall health score. Security findings from CodeQL and Snyk — any vulnerabilities detected in the code or dependencies. Test coverage metrics — are we hitting that 80% gate? Dependency health — are packages up to date?"*

**Click on a finding. Show the option to create an issue.**

> *"Here's the powerful part. Every finding is actionable. I can click on any one of these — say, a coverage gap on the authentication module — and create a GitHub issue directly from it. The same RCTRO pipeline fires. I can assign it to an agent. The governance loop continues."*

**Click "Create Feature" on the scorecard.**

> *"Or I can use the Create Feature button to build something new — a new endpoint, a new capability. Same Rabbit Hole, same RCTRO process, same agent assignment. The scorecard isn't just a dashboard — it's a launchpad."*

**Switch back to the Looking Glass. Navigate to the IMDB Lite BAR.**

> *"Now let's go back to the Looking Glass and ask the harder question. We've implemented the Movie API — but what about the rest of the architecture?"*

**Open the Oraculum — start a design review.**

> *"The Oraculum is our architecture review agent — named after the Caterpillar's oracle. It reads the CALM architecture, checks what's actually been implemented, and tells us where the gaps are."*

> **[PAUSE FOR EDIT]** — Review generation takes 30-60 seconds.

**Show the review results — pillar scores, findings.**

> *"Here are the results. The Movie API scores well — it has an implementation, security controls are present, ADRs are recorded. But look at the drift. The Web Frontend — defined in the architecture, no implementing repository. The Database — defined, no implementation. The Oraculum sees the gap between what we designed and what we've actually built."*

**Highlight the drift scoring and missing implementations.**

> *"This is evolutionary architecture in practice. Not a point-in-time review that gets filed and forgotten. Continuous validation. The architecture is alive, the Caterpillar is always watching, and drift is measured — not as punishment, but as a backlog. These gaps become the next items the White Rabbit leads us to implement."*

---

## Closing

> *"Let's step back from the rabbit hole for a moment.*
>
> *What we just did in 30 minutes would have taken weeks in a traditional enterprise architecture practice. We defined a business capability model. Created a CALM architecture with typed controls on every boundary. Generated a STRIDE threat model. Recorded architecture decisions. Scaffolded a secure project with CI/CD and quality gates baked in. Wrote a structured implementation specification with traceable requirements. Assigned it to an AI agent. Reviewed and merged the code. Used automated quality gates to identify what's missing. And ran a design review that told us exactly where to go next.*
>
> *Every step was governed. Every decision recorded. Every control traceable from architecture to code.*
>
> *The CIO article talks about the shift from Oz to Alice — from control to enablement. This is what enablement looks like. Platforms and guardrails that make doing the right thing the easy thing. Not gates that slow you down, but rails that keep you moving in the right direction.*
>
> *The Cheshire Cat grins because he knows something we're just starting to understand: in a world of AI-assisted engineering, governance isn't the enemy of speed — it's the source of it.*
>
> *Thank you."*

---

## Edit Points Summary

| # | What to cut | Resume when |
|---|---|---|
| 1 | Threat model generation | Results appear on screen |
| 2 | RCTRO prompt generation | Generated prompt visible |
| 3 | Issue creation | Issue confirmed |
| 4 | Copilot implementation | PR ready for review |
| 5 | Oraculum design review | Review results appear |

---

## Pre-Demo Checklist

- [ ] VS Code open with governance mesh initialized, Looking Glass on empty Application tab
- [ ] GitHub org accessible with Copilot SWE agent enabled
- [ ] LLM API key configured (Claude or OpenAI for RCTRO/threat model generation)
- [ ] Extension installed and activated
- [ ] Screen recording software ready
- [ ] GitHub repo `movie-api` does NOT already exist
- [ ] Browser tab ready for GitHub

## Pacing Guide

| Section | Duration | Cumulative |
|---------|----------|------------|
| Cold Open | 1 min | 1 min |
| Act I — Looking Glass (capability, application, CALM, controls) | 8 min | 9 min |
| Act II — ADRs, Absolem, Threat Model | 5 min | 14 min |
| Act III — Component picker, scaffold, RCTRO, assign, GitHub issue, approve | 10 min | 24 min |
| Act IV — Review, merge, sync, scorecard, Oraculum review | 5 min | 29 min |
| Closing | 1 min | 30 min |
