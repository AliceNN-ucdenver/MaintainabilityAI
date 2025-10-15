# Alice Agent - The Good Maintainer

> **Purpose**: Autonomous security remediation agent that embodies the principles of excellent code maintainership.

![Alice Bot - The Good Maintainer](../../images/alice-bot.png)

> *"Why, sometimes I've believed as many as six impossible things before breakfast."* — Alice in Wonderland

Alice is an **agentic AI proof of concept** built on Claude Code that automates security remediation while keeping humans in control. She reads documentation, tests cautiously, questions assumptions, and documents her journey—just like a great maintainer would.

---

## Why "Alice"?

<div style="background: linear-gradient(135deg, rgba(110, 231, 249, 0.1) 0%, rgba(34, 211, 238, 0.05) 100%); border-left: 4px solid #6EE7F9; border-radius: 12px; padding: 32px; margin: 24px 0;">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center;">
    <div>
      <h3 style="color: #6EE7F9; font-size: 20px; margin: 0 0 16px 0; font-weight: 700;">The Rabbit Hole of Legacy Code</h3>
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.8; margin: 0;">Software maintenance often feels like falling down a rabbit hole: legacy code with no comments, "temporary" fixes from years ago, technical debt everyone accepts as inevitable.</p>
    </div>
    <div>
      <h3 style="color: #6EE7F9; font-size: 20px; margin: 0 0 16px 0; font-weight: 700;">Alice Brings Order to Chaos</h3>
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.8; margin: 0;">Just as Alice in Wonderland carefully read labels before drinking mysterious potions, questioned illogical rules, and maintained her sense of self through bizarre transformations—<strong style="color: #6EE7F9;">Alice Agent embodies the principles of The Good Maintainer</strong>.</p>
    </div>
  </div>
</div>

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

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 32px 0;">

<!-- Alice Thrives On -->
<div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%); border: 2px solid #10b981; border-radius: 16px; padding: 28px;">
  <h3 style="color: #10b981; font-size: 22px; margin: 0 0 20px 0; display: flex; align-items: center; gap: 12px;">
    <span style="font-size: 32px;">✅</span>
    <span>Alice Thrives On</span>
  </h3>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #6EE7F9; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">🔒 Security Vulnerabilities</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">SQL injection, XSS, broken access control • OWASP Top 10 issues from CodeQL • Vulnerabilities everyone thought were "too hard to fix"</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #6EE7F9; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">📜 Legacy Code</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">1000-line functions with zero tests • "Temporary" fixes from years ago • Code with no comments or documentation</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #6EE7F9; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">⚠️ Technical Debt</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">High cyclomatic complexity (>10) • Code duplication and inconsistent patterns • Workarounds that bypass validation</p>
  </div>

  <div>
    <h4 style="color: #6EE7F9; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">🔄 CI/CD Integration</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">Automated security remediation in pipelines • Systematic OWASP compliance • Dependency upgrade assistance</p>
  </div>
</div>

<!-- Alice Gets Confused By -->
<div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%); border: 2px solid #ef4444; border-radius: 16px; padding: 28px;">
  <h3 style="color: #ef4444; font-size: 22px; margin: 0 0 20px 0; display: flex; align-items: center; gap: 12px;">
    <span style="font-size: 32px;">❌</span>
    <span>Alice Gets Confused By</span>
  </h3>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #fca5a5; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">🌱 Greenfield Features</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">No existing code to read/understand • Better suited for human design → AI implementation</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #fca5a5; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">❓ Ambiguous Requirements</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">"Make it better" without specifics • Needs clear success criteria</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #fca5a5; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">🏗️ Architectural Rewrites</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">Too large, too risky • Needs human design, not AI execution</p>
  </div>

  <div>
    <h4 style="color: #fca5a5; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">💬 Bikeshedding</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0;">Tabs vs spaces • Naming debates without security impact</p>
  </div>
</div>

</div>

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

<div style="text-align: center; margin: 32px 0 24px 0;">
  <p style="font-size: 24px; color: #6EE7F9; font-style: italic; margin: 0;">"Why, sometimes I've believed as many as six impossible things before breakfast."</p>
  <p style="font-size: 14px; color: #94a3b8; margin: 8px 0 0 0;">— The Queen, Alice in Wonderland</p>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin: 32px 0;">

<!-- Impossible Thing 1 -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-left: 4px solid #8b5cf6; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);">1</div>
    <h3 style="color: #a78bfa; font-size: 18px; margin: 0; font-weight: 700;">Legacy Code Can Be Fixed</h3>
  </div>
  <p style="color: #ef4444; font-size: 14px; font-style: italic; margin: 0 0 12px 0;">"This 5-year-old function? Too risky to touch."</p>
  <p style="color: #10b981; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Alice's approach:</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Strangler fig pattern—extract one method at a time, add tests first, refactor incrementally.</p>
  <p style="color: #6EE7F9; font-size: 13px; font-weight: 600; margin: 0;">✨ Result: 1000 → 200 lines over 5 PRs, fully tested, no regressions</p>
</div>

<!-- Impossible Thing 2 -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-left: 4px solid #06b6d4; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);">2</div>
    <h3 style="color: #67e8f9; font-size: 18px; margin: 0; font-weight: 700;">Technical Debt Can Be Paid Down</h3>
  </div>
  <p style="color: #ef4444; font-size: 14px; font-style: italic; margin: 0 0 12px 0;">"We've been saying 'we'll refactor this later' for 3 years."</p>
  <p style="color: #10b981; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Alice's approach:</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Fitness functions fail CI when complexity >10. One function per PR. Celebrate wins.</p>
  <p style="color: #6EE7F9; font-size: 13px; font-weight: 600; margin: 0;">✨ Result: Average complexity reduced from 18 → 9 in one quarter</p>
</div>

<!-- Impossible Thing 3 -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-left: 4px solid #10b981; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">3</div>
    <h3 style="color: #6ee7b7; font-size: 18px; margin: 0; font-weight: 700;">Security Doesn't Slow You Down</h3>
  </div>
  <p style="color: #ef4444; font-size: 14px; font-style: italic; margin: 0 0 12px 0;">"If we fix all these OWASP issues, we'll never ship features."</p>
  <p style="color: #10b981; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Alice's approach:</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Automate tedious parts (reading OWASP docs, writing tests). Humans focus on creative parts (design, business logic).</p>
  <p style="color: #6EE7F9; font-size: 13px; font-weight: 600; margin: 0;">✨ Result: Faster remediation with better quality—security becomes accelerator</p>
</div>

<!-- Impossible Thing 4 -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-left: 4px solid #f59e0b; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">4</div>
    <h3 style="color: #fbbf24; font-size: 18px; margin: 0; font-weight: 700;">Chaos Can Become Order</h3>
  </div>
  <p style="color: #ef4444; font-size: 14px; font-style: italic; margin: 0 0 12px 0;">"This codebase is Wonderland—no saving it."</p>
  <p style="color: #10b981; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Alice's approach:</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Bring structure incrementally. Fix one file, one function, one pattern at a time. Track metrics.</p>
  <p style="color: #6EE7F9; font-size: 13px; font-weight: 600; margin: 0;">✨ Result: 6 months ago: 47 high-severity issues. Today: 2</p>
</div>

<!-- Impossible Thing 5 -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-left: 4px solid #ec4899; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);">5</div>
    <h3 style="color: #f9a8d4; font-size: 18px; margin: 0; font-weight: 700;">Zero Tests Can Become 80% Coverage</h3>
  </div>
  <p style="color: #ef4444; font-size: 14px; font-style: italic; margin: 0 0 12px 0;">"We don't have time to write tests for all this legacy code."</p>
  <p style="color: #10b981; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Alice's approach:</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Characterization tests first (capture current behavior), then refactor with safety net. One test suite per PR.</p>
  <p style="color: #6EE7F9; font-size: 13px; font-weight: 600; margin: 0;">✨ Result: 0% → 82% coverage in 3 months, caught 14 hidden bugs</p>
</div>

<!-- Impossible Thing 6 -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-left: 4px solid #6EE7F9; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 0 16px rgba(110, 231, 249, 0.2);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6EE7F9 0%, #22d3ee 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #0f172a; box-shadow: 0 4px 12px rgba(110, 231, 249, 0.6);">6</div>
    <h3 style="color: #6EE7F9; font-size: 18px; margin: 0; font-weight: 700;">"Impossible" Deadlines Can Be Met</h3>
  </div>
  <p style="color: #ef4444; font-size: 14px; font-style: italic; margin: 0 0 12px 0;">"Security audit in 2 weeks? We have 50 vulnerabilities!"</p>
  <p style="color: #10b981; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Alice's approach:</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">Parallel remediation (Alice on 3 issues simultaneously), humans review in batches, systematic triage by severity.</p>
  <p style="color: #6EE7F9; font-size: 13px; font-weight: 600; margin: 0;">✨ Result: 50 vulnerabilities → 3 low-severity in 10 days, audit passed</p>
</div>

</div>

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

<div style="background: linear-gradient(135deg, rgba(110, 231, 249, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%); border-radius: 20px; padding: 48px; margin: 48px 0; border: 3px solid #6EE7F9; box-shadow: 0 8px 32px rgba(110, 231, 249, 0.2);">

  <div style="text-align: center; margin-bottom: 32px;">
    <p style="font-size: 20px; color: #6EE7F9; font-style: italic; margin: 0; line-height: 1.6;">"It's no use going back to yesterday, because I was a different person then."</p>
    <p style="font-size: 14px; color: #94a3b8; margin: 8px 0 0 0;">— Alice</p>
  </div>

  <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 28px; margin-bottom: 32px;">
    <p style="color: #cbd5e1; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">Software maintenance is a journey through Wonderland. Code that makes no sense until you read the commit history. "Temporary" fixes from years ago that everyone's afraid to touch. Legacy systems held together by hope and duct tape.</p>
    <p style="color: #6EE7F9; font-size: 20px; font-weight: 700; text-align: center; margin: 0;">Alice doesn't accept "impossible."</p>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px;">
    <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8b5cf6; padding: 16px; border-radius: 8px;">
      <p style="color: #a78bfa; font-weight: 600; margin: 0 0 8px 0;">The Eight Principles in Action</p>
      <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">She reads the documentation. She tests cautiously. She questions assumptions. She maintains integrity through chaos. She documents her journey. And most importantly, <strong style="color: #6EE7F9;">she believes</strong>.</p>
    </div>
    <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 16px; border-radius: 8px;">
      <p style="color: #6ee7b7; font-weight: 600; margin: 0 0 8px 0;">The Results Speak</p>
      <div style="color: #e2e8f0; font-size: 14px; line-height: 1.8; margin: 0;">
        ✅ SQL injection from 2019? Fixed in one afternoon<br/>
        ✅ 1000-line function? Refactored incrementally<br/>
        ✅ "Unfixable" vulnerability? Remediated<br/>
        ✅ "Unmaintainable" codebase? Transformed
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin-bottom: 32px; border: 2px solid #334155;">
    <h3 style="color: #6EE7F9; font-size: 18px; margin: 0 0 20px 0; text-align: center; font-weight: 700;">The impossible becomes possible when you have:</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
      <div style="text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">📖</div>
        <p style="color: #6EE7F9; font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">Wisdom</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Compact prompt packs with proven patterns</p>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">🧪</div>
        <p style="color: #6EE7F9; font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">Caution</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Incremental changes with tests</p>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">🤔</div>
        <p style="color: #6EE7F9; font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">Curiosity</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Questioning technical debt</p>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">👤</div>
        <p style="color: #6EE7F9; font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">Guidance</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Human-in-the-loop approval</p>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">🤖</div>
        <p style="color: #6EE7F9; font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">Automation</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Alice doing the tedious parts</p>
      </div>
    </div>
  </div>

  <div style="text-align: center; padding: 32px 0;">
    <p style="color: #f1f5f9; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">Welcome to Wonderland.<br/>Welcome to better maintenance.</p>
    <div style="background: linear-gradient(135deg, #6EE7F9 0%, #22d3ee 100%); display: inline-block; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(110, 231, 249, 0.4); margin-bottom: 24px;">
      <p style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0;">🐰 Ready to start? Comment @alice on your next CodeQL issue.</p>
    </div>
    <p style="color: #94a3b8; font-size: 15px; font-style: italic; margin: 0;">Your codebase is different today than it was yesterday.<br/>Tomorrow, with Alice, it will be even better.</p>
  </div>

</div>
