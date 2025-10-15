# Alice Agent - The Good Maintainer

> **Purpose**: Autonomous security remediation agent that embodies the principles of excellent code maintainership.

![Alice Bot - The Good Maintainer](../../images/alice-bot.png)

> *"Why, sometimes I've believed as many as six impossible things before breakfast."* — Alice in Wonderland

Alice is an **agentic AI proof of concept** built on Claude Code that automates security remediation while keeping humans in control. She reads documentation, tests cautiously, questions assumptions, and documents her journey—just like a great maintainer would.

---

## Why "Alice"?

Software maintenance often feels like falling down a rabbit hole: legacy code with no comments, "temporary" fixes from years ago, technical debt everyone accepts as inevitable. **Alice brings order to chaos.**

Just as Alice in Wonderland carefully read labels before drinking mysterious potions, questioned illogical rules, and maintained her sense of self through bizarre transformations—**Alice Agent embodies the principles of The Good Maintainer**.

---

## The Eight Principles

Alice follows eight core principles of excellent code maintainership:

### 1. 📖 Read the Documentation
*"What is the use of a book without pictures or conversations?"*

Alice reads **compact prompt packs** (OWASP, STRIDE, Maintainability) before touching code. She analyzes CodeQL findings, commit history, test suites, and comments to understand context.

**Why it matters**: Good maintainers don't guess—they gather context first.

---

### 2. 🧪 Test Cautiously
*"I wonder if I've been changed in the night?"*

Alice makes **incremental changes** with tests after each step. No massive refactors. Two-phase workflow: plan first, then implement.

**Why it matters**: Incremental changes with tests keep systems stable while improving quality.

---

### 3. 🤔 Question Assumptions
*"Curiouser and curiouser!"*

Alice challenges technical debt:
- "Why is this a string concatenation? Could this be parameterized?"
- "This comment says 'temporary fix' from 2019—is it still temporary?"
- "Why does this function have 47 parameters?"

**Why it matters**: Technical debt accumulates when teams accept "that's just how it works here."

---

### 4. 🎯 Maintain Identity
*"Who am I?"*

Alice maintains **system integrity** through refactoring. Function purpose stays clear, API contracts remain stable, business logic is validated by tests.

**Why it matters**: Code can change form without losing its identity (purpose, behavior, contracts).

---

### 5. 📝 Document the Journey
*"I must keep my journal!"*

Alice writes **detailed commit messages** explaining the "why," creates PR descriptions with security controls, adds code comments for non-obvious decisions.

**Why it matters**: Future maintainers need to understand not just what changed, but why and how it was validated.

---

### 6. 🌟 Believe in Impossible Things
*"I can't believe that!" said Alice. "Can't you?" said the Queen. "Try."*

Alice believes:
- That 5-year-old 1000-line function? Use strangler fig to refactor incrementally
- That "unfixable" security vulnerability? OWASP patterns show proven remediation
- That test coverage stuck at 30%? Add tests function by function

**Why it matters**: Pessimism breeds stagnation. Alice approaches "impossible" problems with curiosity.

---

### 7. 🎪 Manage Chaos
*"We're all mad here."*

Codebases are chaos: spaghetti logic, inconsistent patterns, surprise side effects. Alice brings **order**:
- Complexity reduction (flatten nesting, extract functions)
- Strangler fig patterns (replace legacy incrementally)
- Fitness functions (automated quality gates)
- Defense in depth (multiple security layers)

**Why it matters**: Chaos compounds over time. Alice systematically transforms it into maintainable code.

---

### 8. 🔍 Stay Curious
*"Curiouser and curiouser!"*

Alice **explores before acting**. Phase 1 (Analysis) is pure curiosity—no code changes, just understanding. She uses Grep, Read, Glob to explore patterns, reads commit history, examines test coverage.

**Why it matters**: Good maintainers don't rush to "fix" things. They explore, understand, then propose solutions.

---

## How Alice Works

Alice operates in **two phases** with a human approval gate between them:

### Phase 1: Curiosity & Planning 🔍

**Trigger**: Comment **@alice** on any CodeQL issue

**Alice's mindset**: *"What's in this bottle? Let me read the label before drinking."*

**What Alice does**:
- Reads the "Drink Me" label (compact prompt packs for OWASP/STRIDE/Maintainability)
- Explores codebase (Grep, Read, commit history)
- Questions assumptions ("Why string concatenation?")
- Creates remediation plan addressing **design decisions** (technology choices, validation strategy, architecture)
- Outputs copy-paste approval statement

**Permissions**: Read-only (can't break anything)

**Result**: Detailed plan with questions for human review

---

### 👤 Human Approval Gate

*"Who are YOU?"* — The Caterpillar

**You review Alice's plan**:
- Are technology choices appropriate?
- Is refactoring approach sound?
- Are test cases comprehensive?

**Approve or provide feedback**:
- To approve: Comment **@alice approved**
- For changes: Comment with feedback, Alice updates plan

**Why this matters**: Alice proposes, humans approve. Critical governance gate.

---

### Phase 2: Implementation 🎯

**Trigger**: Human comments **@alice approved** (or "go ahead", "implement this", "looks good")

**Alice's mindset**: *"The Queen approved. Now I'll test each transformation carefully."*

**What Alice does**:
- Creates isolated branch **alice-fix-issue-{number}**
- Makes incremental changes (validates, refactors, error handling)
- Runs tests after each step
- Validates **verification checklist** (safe APIs, error handling, defense in depth)
- Documents journey in detailed commit message
- Creates PR with labels: **security**, **ai-assisted**, **remediation-in-progress**

**Permissions**: Write access to branches (NOT main)

**Result**: Branch with tested fixes, PR ready for human review

**Important**: Alice does NOT auto-merge. Humans review PR and merge when satisfied.

---

## The Wonderland Journey

*A whimsical tale of how Alice transforms chaos into order*

### 🐰 Down the Rabbit Hole

The codebase is Wonderland—strange, illogical, full of surprises. In a dusty corner of the repository, Alice discovers an old function that's been "temporarily" handling user searches since 2019. It concatenates strings into SQL queries like the Mad Hatter stacking teacups—precariously, without much thought for gravity or consequences.

CodeQL, ever the vigilant Cheshire Cat, grins knowingly and whispers: *"SQL injection, dear. Severity: High. Shall I show you the way out?"*

The developer, having fallen into this particular rabbit hole before, sighs and summons Alice: **@alice this looks bad, can you help?**

---

### 🍄 Reading the Label

*"DRINK ME,"* says the bottle. But Alice, being a cautious sort, reads the fine print first.

The label (a compact prompt pack called **OWASP A03 - Injection**) explains:
- Parameterized queries with **$1 placeholders** prevent SQL injection
- Input validation with **allowlist regex** catches malicious characters
- Generic error messages prevent **schema exposure**

Alice explores the codebase like she explored Wonderland's gardens—carefully noting which paths lead to roses and which to thorns. She discovers 14 other functions with similar vulnerabilities, a pattern as consistent as the Queen's croquet mallets (which are actually flamingos).

*"Curiouser and curiouser!"* Alice exclaims. *"Why string concatenation when PostgreSQL supports parameterized queries? This was meant to be temporary?"*

She creates a plan, addressing the design decisions: Which library? (pg—already in the package.) What validation? (Zod schema with alphanumeric allowlist.) How to refactor? (Three steps: validate, parameterize, safe errors.)

---

### 👤 The Caterpillar's Question

*"Who... are... YOU?"* asks the Caterpillar, each word punctuated by a puff of smoke.

The human reviews Alice's plan. The technology choices are sound—they already use pg and Zod everywhere. The incremental approach is sensible. The error handling strikes the right balance between user-friendly and secure.

**@alice approved,** says the human, and just like that, Alice begins her transformation.

---

### 🎩 Careful Transformation

Alice shrinks the problem down to size. First, she adds validation—a protective layer like gloves before handling thorns. She runs the tests. They pass. *"I wonder if I've been changed?"*

Then, she transforms the query itself, replacing string concatenation with parameterized placeholders. The SQL is now a proper teacup instead of a precariously stacked tower. Tests run again. Still passing. *"Curiouser and curiouser—it works!"*

Finally, she adds safe error handling, ensuring that database hiccups don't spill schema secrets to curious attackers. The function has transformed from a security vulnerability into a well-defended endpoint.

Alice documents her journey in a detailed commit message, like leaving breadcrumbs through the forest—not for herself, but for the next traveler who ventures this way.

---

### 🌹 Painting the Roses Red

In Wonderland, the Queen's gardeners frantically paint white roses red to meet expectations. In our codebase, the human reviewer carefully examines Alice's PR—the "painting the roses red" quality check.

They test with an SQL injection payload: **'; DROP TABLE users--**

The validation layer catches it immediately: *"Invalid username format."* The roses are indeed red. No white ones to lose heads over.

The human clicks **Merge pull request**.

---

### ✨ The Impossible Became Possible

What was "impossible":
- *"This code is too risky to touch—it's been here 2 years"*
- *"We don't have time to fix all the SQL injection issues"*
- *"We'd need to refactor the entire API layer"*

What Alice made possible:
- Fixed the vulnerability in one afternoon
- Incremental change (15 lines modified, 30 lines of tests)
- Zero breaking changes
- Detailed documentation for future maintainers
- Systematic approach for the other 13 instances

*"Why, sometimes I've believed as many as six impossible things before breakfast."*

**That's the Good Maintainer in action.**

---

## Quick Start

### Prerequisites
- GitHub repository with CodeQL enabled
- Claude Code API access (Anthropic API key)
- Node.js 20+ for running scripts

### Setup (5 Steps)

**1. Copy the framework**
```bash
# Clone MaintainabilityAI
git clone https://github.com/maintainabilityai/maintainabilityai.git

# Copy to your repo
cp -r maintainabilityai/examples/promptpack /path/to/your-repo/examples/
cp -r maintainabilityai/examples/agents /path/to/your-repo/examples/
```

**2. Generate security hashes**
```bash
cd /path/to/your-repo
node examples/agents/automation/generate-prompt-hashes.js
git add examples/agents/automation/prompt-hashes.json
git commit -m "chore: Add prompt pack integrity hashes"
```

**3. Install GitHub Actions workflows**
```bash
cp examples/agents/.github/workflows/*.yml .github/workflows/
```

**4. Set GitHub secret**
- Go to Settings → Secrets → Actions
- Add secret: **ANTHROPIC_API_KEY** = your API key

**5. Enable CodeQL scanning**
- Settings → Code security → Enable CodeQL

**Done!** Wait for CodeQL to find an issue, then comment **@alice** to start.

---

## How to Summon Alice

### On CodeQL Issues

When CodeQL creates an issue (labeled **codeql-finding**), comment:

```
@alice please analyze this vulnerability
```

Alice (Phase 1) will:
- Read relevant OWASP/STRIDE/Maintainability prompt packs
- Explore your codebase
- Create a remediation plan
- Ask you to review and approve

---

### Approve the Plan

Review Alice's plan. If satisfied, comment:

```
@alice approved
```

*Alternative approval commands*: **@alice go ahead**, **@alice implement this**, **@alice looks good**

Alice (Phase 2) will:
- Create branch **alice-fix-issue-{number}**
- Implement fixes incrementally with tests
- Create PR for your review

---

### Review and Merge PR

Alice creates a PR but does NOT auto-merge. You have final control:

- Review code changes
- Run tests locally
- Validate security controls
- Merge when satisfied

**Human approval is required at both gates**: plan approval AND PR merge.

---

## Security Controls

Alice isn't just curious—she's **cautious**. Built-in security controls prevent supply chain attacks:

### 🔐 SHA-256 Hash Verification

Every prompt file has a committed hash in **prompt-hashes.json**. Alice verifies integrity before using any prompt. If hash doesn't match, prompt is rejected.

**Prevents**: Malicious prompt injection, supply chain attacks

---

### 🌐 Domain Allowlist

Alice only fetches prompts from **raw.githubusercontent.com** with HTTPS. No other domains allowed.

**Prevents**: Remote code execution, untrusted content loading

---

### 📝 Structured Logging

All logs use structured JSON format with input sanitization (control chars removed, truncated to 500 chars).

**Prevents**: Log injection attacks, information disclosure

---

### 🚨 CI Hash Enforcement

GitHub Actions workflow validates prompt hashes on every commit. Build fails if prompts changed without updating hashes.

**Prevents**: Accidental or malicious prompt modifications

---

## Use Cases

### ✅ Alice Thrives On:

**Security Vulnerabilities**
- SQL injection, XSS, broken access control
- OWASP Top 10 issues from CodeQL
- Vulnerabilities everyone thought were "too hard to fix"

**Legacy Code**
- 1000-line functions with zero tests
- "Temporary" fixes from years ago
- Code with no comments or documentation

**Technical Debt**
- High cyclomatic complexity (>10)
- Code duplication and inconsistent patterns
- Workarounds that bypass validation

**CI/CD Integration**
- Automated security remediation in pipelines
- Systematic OWASP compliance
- Dependency upgrade assistance

---

### ❌ Alice Gets Confused By:

**Greenfield Features**
- No existing code to read/understand
- Better suited for human design → AI implementation

**Ambiguous Requirements**
- "Make it better" without specifics
- Needs clear success criteria

**Architectural Rewrites**
- Too large, too risky
- Needs human design, not AI execution

**Bikeshedding**
- Tabs vs spaces
- Naming debates without security impact

---

## Best Practices

### Give Alice Context

**Bad**: *"@alice fix this"*

**Good**:
```
@alice this is SQL injection in user search endpoint.

Context:
- PostgreSQL with pg library (v8.11.0)
- Added 2 years ago as "quick fix"
- 13 other similar patterns in /src/api

Please analyze and propose solution that works with our existing stack.
```

---

### Review Plans Critically

Alice is curious, not omniscient. Question her assumptions:
- *"Why this library over alternatives?"*
- *"Have you considered edge case X?"*
- *"What's the performance impact?"*

If the plan isn't right, provide feedback. Alice will update it.

---

### Test the PR Thoroughly

Alice runs automated tests, but you know the business logic:
- Run tests locally
- Try edge cases Alice might have missed
- Validate error messages are user-friendly
- Check performance with realistic data

**Trust but verify**: *"Alice says this is fixed—let me confirm with an actual SQL injection payload."*

---

### Share Winning Prompts

When Alice nails a remediation, document the pattern:
- What prompt worked well?
- What context was critical?
- How long did it save?
- Update compact prompt packs with lessons learned

---

## Believing in Impossible Things

*"Why, sometimes I've believed as many as six impossible things before breakfast."*

### Impossible Thing #1: Legacy Code Can Be Fixed

**The pessimism**: *"This 5-year-old function? Too risky to touch."*

**Alice's approach**: Strangler fig pattern—extract one method at a time, add tests first, refactor incrementally.

**Result**: Function reduced from 1000 → 200 lines over 5 PRs, fully tested, no regressions.

---

### Impossible Thing #2: Technical Debt Can Be Paid Down

**The pessimism**: *"We've been saying 'we'll refactor this later' for 3 years."*

**Alice's approach**: Fitness functions fail CI when complexity >10. One function per PR. Celebrate wins.

**Result**: Average complexity reduced from 18 → 9 in one quarter.

---

### Impossible Thing #3: Security Doesn't Slow You Down

**The pessimism**: *"If we fix all these OWASP issues, we'll never ship features."*

**Alice's approach**: Automate tedious parts (reading OWASP docs, writing tests). Humans focus on creative parts (design, business logic).

**Result**: Faster remediation with better quality—security becomes accelerator, not blocker.

---

### Impossible Thing #4: Chaos Can Become Order

**The pessimism**: *"This codebase is Wonderland—no saving it."*

**Alice's approach**: Bring structure incrementally. Fix one file, one function, one pattern at a time. Track metrics.

**Result**: 6 months ago: 47 high-severity issues. Today: 2.

---

## Configuration

### Adjust Allowed Tools

Edit **claude-remediation.yml** to restrict or expand Alice's tool access:

**Phase 1 (Analysis)** - Current tools:
```yaml
--allowedTools "Read,Glob,Grep,Bash(gh issue comment:*)"
```

**Phase 2 (Implementation)** - Current tools:
```yaml
--allowedTools "Bash(git:*),Bash(gh:*),Bash(npm test),Bash(npm run lint),Read,Edit,Write,Glob,Grep"
```

---

### Customize Approval Keywords

Edit the **if** condition in **claude-remediation.yml**:

```yaml
# Current: approved, go ahead, implement this, looks good
contains(github.event.comment.body, 'approved') ||
contains(github.event.comment.body, 'go ahead') ||
contains(github.event.comment.body, 'implement this') ||
contains(github.event.comment.body, 'looks good')
```

Add your own keyword by adding a new **contains()** line.

---

### Protected Branch Rules

**Recommended** (Settings → Branches → Add rule):
- ✅ Require pull request reviews (1 approval minimum)
- ✅ Require status checks to pass (CodeQL, tests, lint)
- ✅ Require branches to be up to date
- ✅ Do not allow bypassing (even for admins)

**Why**: Ensures humans review every change, even Alice's.

---

## Troubleshooting

### Alice Doesn't Respond

**Possible causes**:
1. Issue not labeled **codeql-finding** → Add label manually
2. Anthropic API key not set → Check GitHub Secrets
3. Workflow file not committed → Ensure **claude-remediation.yml** exists
4. Comment doesn't contain **@alice** → Use exact trigger keyword

---

### Phase 2 Doesn't Start After Approval

**Possible causes**:
1. Approval keyword not recognized → Use: **approved**, **go ahead**, **implement this**, **looks good**
2. Spelling or case issue → Keywords are case-insensitive but check spelling

---

### Prompt Integrity Verification Failed

**Error**: *"Prompt integrity verification FAILED"*

**Fix**:
```bash
# Regenerate hashes
node examples/agents/automation/generate-prompt-hashes.js

# Commit updated manifest
git add examples/agents/automation/prompt-hashes.json
git commit -m "chore: Update prompt hashes after content changes"
```

---

### CI Fails: Hash Mismatch

**Cause**: Prompt file modified but hash manifest not updated

**Fix**: Same as above—regenerate hashes and commit

---

## Related Documentation

### 📘 Security Guidance
- [OWASP Top 10 Prompts](../owasp/) — Detailed vulnerability guides
- [STRIDE Threat Modeling](../threat-modeling/) — Threat analysis patterns
- [Security Pipeline](../framework.md#security-pipeline) — 6-layer defense strategy

### 🔧 Maintainability Patterns
- [Complexity Reduction](../maintainability/complexity-reduction.md) — Lower cyclomatic complexity
- [Fitness Functions](../maintainability/fitness-functions.md) — Automated quality gates
- [Strangler Fig Pattern](../maintainability/strangler-fig.md) — Incremental legacy refactoring
- [Technical Debt Management](../maintainability/technical-debt.md) — Systematic debt tracking

### 🤖 AI Agent Guides
- [Claude Code Agent](./claude.md) — Complex refactoring, comprehensive testing
- [GitHub Copilot Agent](./copilot.md) — In-editor implementation
- [ChatGPT Agent](./chatgpt.md) — Threat modeling, OWASP validation
- [Multi-Agent Orchestration](./multi-agent.md) — Coordinating multiple AI agents

### 🎓 Workshop Materials
- [Part 1: The Spectrum](../workshop/part1-spectrum.md) — Vibe → AI-Assisted → Agentic
- [Part 2: Security-First Prompting](../workshop/part2-prompting.md) — Context + Constraints
- [Part 3: Live Remediation](../workshop/part3-live-remediation.md) — A03 Injection walkthrough

### 📜 Governance
- [Golden Rules](../governance/vibe-golden-rules.md) — 6 rules for AI-assisted development
- [Complete Framework](../framework.md) — 6-phase security-first SDLC

---

## Epilogue: Down the Rabbit Hole

*"It's no use going back to yesterday, because I was a different person then."* — Alice

Software maintenance is a journey through Wonderland. Code that makes no sense until you read the commit history. "Temporary" fixes from years ago that everyone's afraid to touch. Legacy systems held together by hope and duct tape.

**Alice doesn't accept "impossible."**

She reads the documentation. She tests cautiously. She questions assumptions. She maintains integrity through chaos. She documents her journey. And most importantly, **she believes**.

That SQL injection from 2019? Fixed in one afternoon.

That 1000-line function? Refactored incrementally with full test coverage.

That "unfixable" security vulnerability? Remediated with proven OWASP patterns.

That codebase everyone calls "unmaintainable"? Transformed, one PR at a time.

---

**The impossible becomes possible when you have:**
- 📖 Wisdom (compact prompt packs with proven patterns)
- 🧪 Caution (incremental changes with tests)
- 🤔 Curiosity (questioning technical debt)
- 👤 Guidance (human-in-the-loop approval)
- 🤖 Automation (Alice doing the tedious parts)

---

**Welcome to Wonderland. Welcome to better maintenance.**

🐰 **Ready to start? Comment @alice on your next CodeQL issue.**

---

*"Your codebase is different today than it was yesterday. Tomorrow, with Alice, it will be even better."*
