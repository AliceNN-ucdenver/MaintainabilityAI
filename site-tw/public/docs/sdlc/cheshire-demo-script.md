# Cheshire Demo Video Script

> **Runtime Target**: ~12-15 minutes
> **Tone**: Energetic, practitioner-focused, Wonderland-flavored
> **Screen**: Start on maintainability.ai/docs/sdlc/

---

## ACT 1: The SDLC Framework (2 min)

**[SCREEN: maintainability.ai/docs/sdlc — SDLC Overview page]**

> Alright — you've got AI writing code faster than ever. But here's the question nobody wants to ask: **is it secure?**
>
> This is the MaintainabilityAI SDLC framework. Six phases. Security gates at every step. And today, we're going to walk through the entire thing — live — using a real assignment, a real VSCode extension, and a real AI agent.
>
> **[Scroll through the 6 phases slowly]**
>
> Design. Implementation. Verification. Governance. Deployment. Evolution. Each phase has security gates — some human, some automated, some AI-powered. The key principle: **humans own architecture and governance, AI accelerates everything in between**.
>
> But frameworks on a webpage don't ship code. So let me show you what does.

**[Scroll to the Cheshire section]**

> Meet the Cheshire Cat.
>
> This is our prototype VSCode extension. It takes the entire framework — the OWASP prompt packs, the STRIDE threat models, the maintainability patterns — and puts them directly in your editor. You describe what you want to build. The Cat generates structured security specifications. And then an AI agent implements them.
>
> Let's go down the rabbit hole.

---

## ACT 2: Into VSCode — The Scaffold (2 min)

**[SCREEN: Switch to VSCode — empty or fresh project folder]**

> Here we are in VSCode. Fresh project. No security workflows. No prompt packs. No governance. Just an empty repo waiting to become something.
>
> Watch this.

**[Open Command Palette → MaintainabilityAI: Scaffold SDLC Structure]**

> One command. **Scaffold SDLC Structure.**
>
> **[Show the scaffolding running — files appearing]**
>
> Look at what just happened. We've got a CLAUDE.md with agent instructions tailored to our tech stack. CodeQL workflow for security scanning. Fitness function automation — complexity limits, coverage thresholds, dependency freshness. A PR template with AI disclosure built in. And a full set of OWASP prompt packs.
>
> **[Click through a few generated files]**
>
> That's Phase 1 and Phase 5 of the SDLC — design governance and deployment pipeline — scaffolded in seconds. The Cat set up the guardrails. Now let's build something inside them.

---

## ACT 3: Assignment 2 — The Web API (3 min)

**[SCREEN: VSCode — click the Cheshire Cat icon in the editor title bar]**

> Here's the scenario. We've got Assignment 2 for our Web API class. We need to build a REST API — think user management, authentication, data endpoints. The kind of thing students spin up fast and ship insecure even faster.
>
> Not today. Today we're doing it right.

**[The Create RCTRO Feature Issue panel opens]**

> I click the Cheshire Cat — right there in the title bar — and it asks me one simple question: **What do you want to build?**
>
> **[Type the feature description]**
>
> *"Build a REST API for Assignment 2 — user registration and login with JWT authentication, a protected CRUD endpoint for managing student records, input validation on all endpoints, and proper error handling."*
>
> Now watch what happens.

**[Cheshire detects tech stack]**

> It detected our tech stack automatically — Node.js, TypeScript, Express, Jest. No configuration needed.
>
> **[Show prompt pack category selection]**
>
> Now it asks: which security categories apply? For a Web API with authentication and data access, we're selecting:
>
> - **A03 Injection** — because we've got database queries
> - **A07 Authentication Failures** — because we're doing JWT auth
> - **A01 Broken Access Control** — because we've got protected endpoints
> - **Complexity Reduction** from maintainability
> - **Spoofing** and **Tampering** from STRIDE
>
> **[Click generate]**
>
> And there it is. A complete RCTRO specification.

**[Scroll through the generated RCTRO in the preview pane]**

> **Role**: Senior backend engineer specializing in secure API development.
> **Context**: Node.js REST API with JWT, PostgreSQL, Express — assignment requirements plus production security standards.
> **Task**: Implement the full API with parameterized queries, bcrypt password hashing, JWT with proper expiration, input validation on every endpoint.
> **Requirements**: Look at this — it pulled in specific security controls from each prompt pack. Parameterized queries from A03. Constant-time password comparison from A07. Deny-by-default authorization from A01.
> **Output**: Working API with tests, security validation, and documentation.
>
> The Cat didn't just describe the feature. It described how to build it **securely**. Every OWASP control, every threat mitigation, baked right into the specification.
>
> I can edit this, refine it, add my own requirements. The Cat suggests — **I decide**.
>
> This looks good. Let's ship it.

**[Click Submit to GitHub]**

---

## ACT 4: The Issue — Assigning to Claude (2 min)

**[SCREEN: GitHub — the newly created issue]**

> Here's our issue on GitHub. Beautifully structured. Labels auto-created — `rctro-feature`, `owasp/a03`, `owasp/a07`, `owasp/a01`.
>
> **[Expand the collapsible prompt pack sections]**
>
> Open up these collapsible sections — every prompt pack we selected is embedded right in the issue. When Claude reads this issue, it doesn't just see "build an API." It sees the full security playbook. Parameterized queries. Bcrypt cost factors. JWT expiration policies. Input validation schemas. All of it.
>
> Now — here's where Alice enters Wonderland.

**[Comment on the issue: @claude]**

> I type **@claude** and hit enter. That's it. Claude picks up the issue, reads the RCTRO specification, reads the embedded prompt packs, and starts working.
>
> **[Show Claude's Phase 1 response appearing — the analysis and plan]**
>
> Look at this. Claude is in **Phase 1 — Curiosity and Planning**. Just like Alice, it reads the label before drinking. It's analyzing our codebase, understanding the tech stack, mapping out a remediation plan.
>
> It's proposing:
> - Project structure with routes, middleware, controllers
> - Authentication flow with bcrypt and JWT
> - Input validation layer using Zod
> - Test strategy covering security scenarios
>
> **[Scroll through the plan]**
>
> This is the human approval gate. The Caterpillar's question: *"Who are you?"* Do I trust this plan? Are the technology choices sound? Is the approach incremental and testable?

---

## ACT 5: The Approval (1 min)

**[SCREEN: GitHub issue — reviewing Claude's plan]**

> The project structure looks right. Express with middleware separation — that's clean. Bcrypt with cost factor 12 — industry standard. JWT with 15-minute access tokens and refresh rotation — exactly what A07 recommends. Parameterized queries throughout — A03 covered. Zod validation on every endpoint — defense in depth.
>
> I'm satisfied. Let's go.

**[Comment: @claude approved]**

> **@claude approved.**
>
> And now Claude moves to Phase 2 — Implementation. It creates a branch, starts writing code, runs tests after each step, validates against the security checklist. We can watch it work in real time.
>
> **[Show Claude's implementation comments appearing — incremental progress]**
>
> Step one: validation layer. Tests pass. Step two: authentication middleware. Tests pass. Step three: protected CRUD endpoints. Tests pass. Every step incremental. Every step verified.
>
> **[Show the PR being created]**
>
> And there's the pull request. Labels: `security`, `ai-assisted`. Detailed description with every security control documented.

---

## ACT 6: Sync and the Security Dashboard (3 min)

**[SCREEN: VSCode — terminal]**

> The PR is merged. Let's pull it down.

**[Run git pull]**

> Code is local. Now let's see where we stand.

**[Click the MaintainabilityAI icon in the activity bar — Security Scorecard view]**

> This is the Security Scorecard. The Cheshire Cat's activity bar. From here I can see my project's security posture at a glance.
>
> **[Navigate to code coverage section]**
>
> Let's run our code coverage check.

**[Trigger code coverage from the scorecard]**

> Coverage is at 76%. Our fitness function threshold is 80%. We're close — but we're not there yet. And that's exactly the kind of thing a human decides what to do about.
>
> **[Navigate to dependency section]**
>
> Now let's check dependency freshness.

**[Trigger dependency refresh]**

> Two packages are more than 90 days old. The framework's rule is simple: dependencies older than 3 months are a risk. The scorecard flags them. The human decides the priority.
>
> Here's the key insight: **the scorecard shows you the state. You decide the action.** Technical debt issue creation, dependency updates, coverage improvements — these are governance decisions. Human decisions.
>
> But the Cat makes it easy to act on them. Watch this.

**[Click to create a new issue from the scorecard — improve code coverage]**

> Right from the scorecard, I can create a new issue to improve code coverage. Cheshire pre-fills it with context — which modules are under-covered, which security tests are missing, what the target threshold is.
>
> **[Show the issue being generated with RCTRO format]**
>
> Another RCTRO-formatted issue. Another structured specification. Ready for Claude or Copilot to pick up. The cycle continues.

---

## ACT 7: The Big Picture (1 min)

**[SCREEN: Split — SDLC page on left, VSCode on right]**

> Let's step back and look at what just happened.
>
> We started on the SDLC page — a framework with six phases and security gates. Then we went into VSCode and **lived it**.
>
> **Phase 1**: The Cheshire Cat scaffolded our governance — CLAUDE.md, CodeQL, fitness functions, PR templates.
> **Phase 2**: We described a feature, generated an RCTRO specification with embedded security controls, and an AI agent implemented it — incrementally, with tests at every step.
> **Phase 3**: Verification was automated — tests, linting, security scanning built into the workflow.
> **Phase 4**: We reviewed the plan, approved it, reviewed the PR. Human judgment at every critical gate.
> **Phase 5**: Merged and deployed through the scaffolded pipeline.
> **Phase 6**: The Security Scorecard showed us where to evolve — coverage gaps, stale dependencies, technical debt — and gave us one-click issue creation to start the cycle again.
>
> **[Pause]**
>
> Six phases. One extension. Security at every step.
>
> The Cat vanishes — but the grin remains. As a well-structured, secure, maintainable codebase.
>
> That's MaintainabilityAI. That's Cheshire.
>
> **[End card: maintainability.ai]**

---

## Production Notes

- **Screen recording**: 1920x1080, dark theme VSCode, browser in dark mode
- **Transitions**: Cut between browser and VSCode cleanly — no fancy transitions needed
- **Pacing**: Let the tool do the talking during generation steps — brief pauses while things load build anticipation
- **Key moments to emphasize**:
  - The scaffold creating all governance files at once
  - The RCTRO generation pulling in specific security controls from prompt packs
  - Claude's incremental implementation with tests after each step
  - The human approval gate — you decide, not the AI
  - The scorecard surfacing issues and enabling one-click issue creation
- **Wonderland callbacks**: "Down the rabbit hole" at the start, "The Cat vanishes but the grin remains" at the end — bookend the narrative
