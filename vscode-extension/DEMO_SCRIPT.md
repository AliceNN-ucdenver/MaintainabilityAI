# Alice Agent Live Demo Script
## Video Recording Guide with Timings

> **Total Demo Time**: ~15 minutes
> **Audience**: Technical leads, security teams, engineering managers
> **Goal**: Show complete Alice workflow from vulnerability detection → automated remediation → human review → merge

---

## 🎬 PART 1: Introduction & Framework Context (3 minutes)

### Scene 1: Opening Hook (30 seconds)

**[Screen: Desktop with browser ready]**

**YOU SAY:**
> "What if I told you that the security vulnerabilities CodeQL finds in your codebase could be automatically fixed, with a detailed remediation plan ready for human review, all in about 10 minutes? That's what we're going to demonstrate today with Alice, our autonomous security remediation agent built on Claude Code."

**[Pause 2 seconds]**

---

### Scene 2: The SDLC Framework Overview (1 minute)

**ACTION:** Navigate to `https://maintainability.ai/docs/sdlc/`

**YOU SAY:**
> "First, let me give you some context. This is our MaintainabilityAI SDLC framework—a complete 6-phase Software Development Lifecycle designed for AI-assisted engineering."

**ACTION:** Scroll slowly to show the 6 phases

**YOU SAY:**
> "Notice the framework integrates security gates at every phase. Here's the key insight from Addy Osmani's 'Beyond Vibe Coding'—the 70/30 rule."

**ACTION:** Highlight the 70/30 section

**YOU SAY:**
> "AI can handle about 70% of the work—the boilerplate, the patterns, the standard implementations. But the critical 30%—security architecture, edge cases, business logic validation—that requires human expertise."

**[Pause 1 second]**

**YOU SAY:**
> "Alice operates in this framework at Phase 3—Verification—where she automates security remediation while keeping humans in control. Let me show you how she works."

---

### Scene 3: Meet Alice (1 minute 30 seconds)

**ACTION:** Navigate to `https://maintainability.ai/docs/agents/alice`

**YOU SAY:**
> "Meet Alice—our Good Maintainer. She's named after Alice in Wonderland because, well, navigating legacy codebases often feels like falling down a rabbit hole."

**ACTION:** Scroll to "The Alice Way" section with the 8 principles

**YOU SAY:**
> "Alice embodies 8 principles of good code maintenance. She reads documentation before touching code—like Alice reading labels before drinking mysterious potions. She tests incrementally. She questions assumptions. She documents her journey."

**ACTION:** Scroll to "How Alice Works" - the two-phase workflow

**YOU SAY:**
> "Here's how Alice operates: Two phases with a human approval gate in between."

**ACTION:** Point to Phase 1 box

**YOU SAY:**
> "Phase 1 is pure curiosity—read-only permissions. Alice explores the codebase, reads the security prompts, and creates a detailed remediation plan. She can't break anything here."

**ACTION:** Point to Human Approval Gate

**YOU SAY:**
> "Then—and this is critical—a human reviews the plan. You decide if the approach is sound. This is your governance gate."

**ACTION:** Point to Phase 2 box

**YOU SAY:**
> "Only after approval does Phase 2 start—implementation. Alice creates a branch, makes the changes, runs tests, and creates a pull request. But she never auto-merges. Humans make that final decision."

**[Pause 2 seconds]**

**YOU SAY:**
> "Now let me show you this in action. We're going to push vulnerable code to a repository and watch Alice work her magic."

---

## 🎬 PART 2: The Live Demo - Down the Rabbit Hole (12 minutes)

### Scene 4: The Initial Commit (1 minute 6 seconds - Automated)

**ACTION:** Open terminal, navigate to your test repository

**YOU SAY:**
> "I have a test repository here with intentionally vulnerable code—SQL injection vulnerabilities, missing rate limiting, weak password hashing. Let's commit and push this code."

**ACTION:** Show the vulnerable file briefly in VS Code
```bash
code src/app.ts  # Show the vulnerable SQL concatenation
```

**YOU SAY:**
> "Look at this—string concatenation in SQL queries. This is a textbook SQL injection vulnerability. Let's push it."

**ACTION:**
```bash
git add .
git commit -m "Initial vulnerable code"
git push origin main
```

**YOU SAY:**
> "Now watch what happens. This push triggers our first GitHub Action—CodeQL security scanning."

**ACTION:** Switch to browser, navigate to repository → Actions tab

**YOU SAY:**
> "Here's the CodeQL workflow starting. This will take about 1 minute to complete. While it runs, let me explain what happens next."

**[Show the workflow running, with logs expanding]**

**YOU SAY:**
> "CodeQL is analyzing the code for security vulnerabilities using GitHub's security-extended query pack. It's looking for SQL injection, XSS, hardcoded secrets, path traversal—all the OWASP Top 10 categories."

**[Wait for workflow to complete - ~1 minute total from push]**

**YOU SAY:**
> "There we go—completed. Let's see what it found."

---

### Scene 5: CodeQL Creates Security Issues (1 minute)

**ACTION:** Click on the completed workflow, show the "Process CodeQL Results" step

**YOU SAY:**
> "Here's where our automation kicks in. The 'Process CodeQL Results' step takes the SARIF output from CodeQL and creates GitHub issues with embedded security guidance."

**ACTION:** Navigate to Issues tab

**YOU SAY:**
> "And here they are—4 security issues automatically created, each labeled by severity and OWASP category."

**ACTION:** Click on the SQL injection issue (the one with multiple occurrences)

**YOU SAY:**
> "Let's look at this one: SQL Injection in app.ts with 4 occurrences. Notice the structure here."

**ACTION:** Scroll through the issue slowly

**YOU SAY:**
> "The issue shows all 4 vulnerable locations with code snippets. Then we have collapsed sections with detailed security guidance."

**ACTION:** Expand "OWASP Security Guidance"

**YOU SAY:**
> "This is our compact prompt pack—it shows vulnerable patterns with red X's and secure patterns with green checkmarks. These are the patterns Alice will follow."

**ACTION:** Collapse it, scroll to bottom

**YOU SAY:**
> "And down here—the Claude Remediation Zone. This is where the magic happens. Watch this."

---

### Scene 6: Summoning Alice - Phase 1 Planning (3 minutes)

**ACTION:** Copy the @claude prompt from the issue

**YOU SAY:**
> "I'm going to invoke Alice by copying this prompt and posting it as a comment."

**ACTION:** Paste in comment box, show it clearly on screen

```
@claude Please provide a remediation plan for all 4 occurrences of this vulnerability in src/app.ts following the security and maintainability guidelines provided.
```

**YOU SAY:**
> "Notice I'm asking for a remediation plan for ALL 4 occurrences. This is important—Alice needs to understand the full scope."

**ACTION:** Click "Comment"

**YOU SAY:**
> "And... posted. Now Alice's Phase 1 workflow kicks off. Let's watch."

**ACTION:** Navigate to Actions tab, show "Alice AI Remediation" workflow starting

**YOU SAY:**
> "Here's the 'analyze-and-plan' job starting. This is the read-only phase where Alice explores the codebase."

---

#### 📖 **Chapter 2: Reading the Label** (Narrative during workflow)

**ACTION:** Expand the "Claude Code Analysis & Planning" step, show logs streaming

**YOU SAY:**
> "Watch the logs here. This is Alice at the bottom of the rabbit hole—she's found herself in a long hallway lined with doors, and on a small glass table sits a bottle with a label."

**[Point to logs as they appear - weave in the story]:**

**LOG SHOWS:** `Reading vulnerable code file src/app.ts...`

**YOU SAY:**
> "The bottle says 'DRINK ME' in beautiful large letters. But Alice is sensible—she reads the label before drinking mysterious potions."

**LOG SHOWS:** `Extracting OWASP A03 Injection prompt from issue...`

**YOU SAY:**
> "Here's the label—the OWASP A03 Injection prompt. It shows her exactly what this vulnerability looks like and what good looks like: parameterized queries, input validation, generic error messages."

**LOG SHOWS:** `Found 4 occurrences of SQL injection at lines 45, 89, 134, 167...`

**YOU SAY:**
> "Now Alice begins to explore, moving through the codebase like she wandered through Wonderland's gardens. She's noting which paths lead to roses and which to thorns."

**LOG SHOWS:** `Analyzing patterns... All 4 occurrences use string concatenation...`

**YOU SAY:**
> "And she discovers something curious—14 other functions with the same vulnerability, scattered throughout the repository like playing cards blown by the wind."

**[Pause, let this sink in]**

**YOU SAY:**
> "'Curiouser and curiouser!' Alice would say. 'Why string concatenation when PostgreSQL supports parameterized queries? Surely this was meant to be temporary?'"

**LOG SHOWS:** `Reviewing pg library documentation...`

**YOU SAY:**
> "She's checking—does this project already have the pg library? Yes, it's in the package.json. The tools are there, they just weren't being used properly."

**LOG SHOWS:** `Designing Zod validation schema...`

**YOU SAY:**
> "Alice sits down and composes a remediation plan. She's methodically addressing each design decision: Which library? The pg library that's already there. What validation? A Zod schema with an alphanumeric allowlist. How to refactor? Three careful steps."

**LOG SHOWS:** `Creating test strategy...`

**YOU SAY:**
> "She's even planning the tests—positive cases for valid input, attack vector tests for malicious payloads, edge cases for boundaries and empty input."

**LOG SHOWS:** `Generating remediation plan...`

**YOU SAY:**
> "This is the power of Phase 1. Alice isn't rushing to fix things. She's exploring, understanding the full context, and designing a solution that addresses the root cause, not just the symptoms."

**[Pause 2 seconds as workflow completes]**

**LOG SHOWS:** `✓ Posted remediation plan to issue #1`

**YOU SAY:**
> "And there it is—workflow complete. Alice has posted her remediation plan to the issue. This took about 3 minutes and cost roughly 33 cents. Now comes the critical part—the human review."

**[Continue to Scene 7]**

---

### Scene 7: The Caterpillar's Question - Human Review (1 minute 30 seconds)

**ACTION:** Navigate back to the issue, scroll to Alice's comment

**YOU SAY:**
> "Here's Alice's remediation plan. Let me walk you through this."

**ACTION:** Scroll through the plan, highlighting key sections

**YOU SAY:**
> "Root cause analysis—she understands WHY the vulnerability exists. Proposed solution—she's identified all 4 locations and has a common pattern to fix them all."

**ACTION:** Scroll to "Five Key Patterns"

**YOU SAY:**
> "Here are the 5 key patterns from the OWASP prompt: parameterized queries, input validation, no string concatenation, safe APIs, and generic error messages. She's documented how to apply each one."

**ACTION:** Scroll to "Code Examples"

**YOU SAY:**
> "She even provides before-and-after code examples. This is what the vulnerable code looks like, and here's the secure version."

**ACTION:** Scroll to "Security Design Checklist"

**YOU SAY:**
> "And here's the critical part—the design decisions. She's specified exactly which library to use, what the Zod schema should look like, how error handling should work. This is what I review before approval."

**[Pause 2 seconds]**

**YOU SAY:**
> "As the human in the loop, I'm checking: Are these technology choices appropriate? Is the approach sound? Will this actually fix the vulnerability without breaking anything?"

**ACTION:** Scroll to approval section

**YOU SAY:**
> "Everything looks good. Let's approve it."

---

### Scene 8: Approval & Phase 2 Implementation (8 minutes total, but narrate highlights)

**ACTION:** Copy the approval comment

```
@claude approved
```

**ACTION:** Post comment

**YOU SAY:**
> "Approval granted. Now Phase 2 kicks off—implementation. This is where Alice gets write permissions to create branches and make changes."

**ACTION:** Navigate to Actions, show "Implementation" job starting

**YOU SAY:**
> "This takes about 8 minutes. I'm going to narrate the highlights as the logs stream, but think of this as Alice's careful transformation."

---

#### 📖 **Chapter 4: Careful Transformation** (Narrative during 8-minute workflow)

**ACTION:** Expand the "Claude Code Implementation" step logs

**LOG SHOWS:** `Creating branch fix/issue-1-security...`

**YOU SAY:**
> "Alice ate from one side of the mushroom, and she began to shrink. Not physically, but the problem itself shrank down to a manageable size. She's creating an isolated branch—this is her safe space to make changes without risking the main codebase."

**LOG SHOWS:** `Reading approved remediation plan...`

**YOU SAY:**
> "She's reading the plan she created in Phase 1—the plan we just approved. She knows exactly what to do. No guessing, no improvising. The design is locked in."

---

**LOG SHOWS:** `Implementing security controls for occurrence 1 (lines 45-47)...`

**YOU SAY:**
> "Step One: Validation. She's adding input validation, a protective layer like gloves before handling thorny roses. She carefully writes the Zod schema, defining exactly what characters are allowed and what should be rejected."

**LOG SHOWS:** `Adding Zod validation schema...`
**LOG SHOWS:** `Running tests...`
**LOG SHOWS:** `✓ All tests passing`

**YOU SAY:**
> "She ran the tests. They passed. The code remained stable. 'I wonder if I've been changed?' Alice muses, looking at the function that's slowly becoming safer."

---

**LOG SHOWS:** `Implementing security controls for occurrence 2 (lines 89-91)...`

**YOU SAY:**
> "Step Two: Parameterization. Now she transforms the query itself. Out goes the string concatenation, replaced with proper parameterized placeholders. The SQL went from a precariously stacked tower of teacups to a single, stable, properly designed query."

**LOG SHOWS:** `Replacing string concatenation with parameterized query...`
**LOG SHOWS:** `Running tests...`
**LOG SHOWS:** `✓ All tests passing`

**YOU SAY:**
> "Tests ran again. Still passing. The code is getting better with each careful step. 'Curiouser and curiouser! It actually works!'"

---

**LOG SHOWS:** `Implementing security controls for occurrence 3 (lines 134-136)...`

**YOU SAY:**
> "Step Three: Safe Error Handling. She's adding safe error handling. No more leaking database schema details to curious attackers. Generic, friendly error messages for users. Detailed logs for the development team."

**LOG SHOWS:** `Adding safe error handling...`
**LOG SHOWS:** `Running tests...`
**LOG SHOWS:** `✓ All tests passing`

**YOU SAY:**
> "The function has completely transformed from a security vulnerability into a well-defended endpoint. And she's doing this for all 4 locations, applying the exact same pattern."

---

**LOG SHOWS:** `Implementing security controls for occurrence 4 (lines 167-169)...`
**LOG SHOWS:** `Running tests...`
**LOG SHOWS:** `✓ All tests passing`

**YOU SAY:**
> "There's the fourth and final occurrence. Same pattern—validate, parameterize, handle errors safely. Notice the consistency. This isn't four different approaches. It's one proven pattern applied systematically."

---

**LOG SHOWS:** `Validating security checklist...`

**YOU SAY:**
> "Now Alice validates the implementation checklist—items 4 through 6 from the OWASP prompt. She's running grep commands to verify no dangerous APIs are used, testing error messages are generic, confirming defense in depth."

**LOG SHOWS:** `✓ No eval() or Function() found`
**LOG SHOWS:** `✓ Error messages are generic`
**LOG SHOWS:** `✓ All attack vector tests pass`

**YOU SAY:**
> "All checks passing. The transformation is complete. Now she documents her journey."

---

**LOG SHOWS:** `Creating commit with detailed message...`

**YOU SAY:**
> "Before moving on, Alice documents her journey in a detailed commit message. Not for herself, but for the next traveler who will venture this way—like breadcrumbs through the forest showing the safe path home."

**LOG SHOWS:** `Commit message includes: Security Controls, Testing strategy, OWASP category, AI disclosure...`

**YOU SAY:**
> "The commit message explains the 'why,' not just the 'what.' It lists which OWASP prompts she used, which maintainability principles she followed, which STRIDE threats were addressed. Full transparency."

---

**LOG SHOWS:** `Pushing to remote...`
**LOG SHOWS:** `Creating pull request...`

**YOU SAY:**
> "Pushing the branch, creating the pull request. The transformation is complete. The code is secure. The tests are passing. It's time for human review."

**LOG SHOWS:** `✓ Pull request #2 created: [Security] Fix Issue #1: SQL Injection in app.ts (4 occurrences)`

**YOU SAY:**
> "And there we go—pull request created in about 8 minutes for about a dollar fifty. Four vulnerable locations, systematically fixed, comprehensively tested, thoroughly documented. Let's look at it."

**[Continue to Scene 9]**

---

### Scene 9: Painting the Roses Red - The Pull Request (2 minutes)

**ACTION:** Navigate to Pull Requests tab, click the new PR

**YOU SAY:**
> "Here's Alice's pull request. Notice the labels: 'security' and 'ai-assisted'. Full transparency."

**ACTION:** Scroll through the PR description

**YOU SAY:**
> "The PR description is comprehensive. Summary of changes, which files were modified, all 4 security controls implemented."

---

#### 📖 **Chapter 5: Painting the Roses Red** (Critical Thinking Moment)

**ACTION:** Scroll to "Human Review Tasks" section

**YOU SAY:**
> "Now here's where the Wonderland story gets interesting. Remember the Queen's gardeners frantically painting white roses red? They were trying to fix a mistake with a quick surface solution."

**[Pause 2 seconds]**

**YOU SAY:**
> "As the human reviewer, I have to ask myself: Are we just painting roses red? Or is this the right fix?"

**ACTION:** Highlight the checklist items

**YOU SAY:**
> "Alice has extracted the 6 items from the OWASP prompt and provided specific verification steps. Let me read one: 'Parameterized Queries—Open app.ts lines 45-67 and confirm all queries use dollar-sign-one, dollar-sign-two placeholders.'"

**ACTION:** Click on "Files changed" tab

**YOU SAY:**
> "She's telling me exactly what to verify. This is my governance gate. Let me check the code."

**ACTION:** Scroll through the diff slowly, pointing at specific changes

**YOU SAY:**
> "Here's the first occurrence—string concatenation is completely gone, replaced with parameterized query. The Zod schema validates input before it even reaches the database. This isn't paint—this is a real fix."

**ACTION:** Scroll to another occurrence

**YOU SAY:**
> "Same pattern here. And here. And here. All 4 locations use the exact same secure approach. Consistency is key—if one is secure, they all are."

**ACTION:** Scroll to tests

**YOU SAY:**
> "And look at these tests—positive cases for valid input, attack vector tests with actual SQL injection payloads like 'DROP TABLE users', edge cases for empty input and special characters. This is production-ready code."

**ACTION:** Navigate to "Checks" tab

**YOU SAY:**
> "All CI checks passing—CodeQL, linting, tests. But here's my critical thinking question: This PR fixes 4 occurrences in this file. Remember Alice discovered 14 other functions with the same vulnerability?"

**[Pause, let this sink in]**

**YOU SAY:**
> "Should we tackle all 14 now? Or ship this one change first, demonstrate the pattern works in production, then systematically address the others? What's the risk versus reward?"

**ACTION:** Scroll back to "Conversation" tab

**YOU SAY:**
> "For this demo, my decision is: ship this focused fix now. Let it run in production. Prove the pattern works. Then create follow-up issues for the other 14. This is the value a human brings—not just quality control, but strategic thinking."

**[Pause 1 second]**

**YOU SAY:**
> "The fix is solid. The approach is sound. Let's merge."

---

### Scene 10: The Impossible Became Possible - The Merge (30 seconds)

**ACTION:** Click "Merge pull request"

**YOU SAY:**
> "Merging now. This triggers our final workflow—another CodeQL scan to verify the fix worked."

**ACTION:** Click "Confirm merge"

**YOU SAY:**
> "And... merged. The vulnerable code that existed 15 minutes ago is now fully remediated with comprehensive tests and documentation."

**ACTION:** Navigate to Actions tab

**YOU SAY:**
> "Watch this final workflow. CodeQL will scan again and process the results."

---

### Scene 11: The Circle Closes - Auto-Close Issues (1 minute 30 seconds)

**[Wait for workflow to complete - about 1 minute]**

**ACTION:** When workflow completes, navigate back to Issues

**YOU SAY:**
> "Workflow complete. Now watch what happens to our original issue."

---

#### 📖 **Chapter 6: The Impossible Became Possible**

**ACTION:** Click on the SQL injection issue, show it's now closed

**YOU SAY:**
> "It's been automatically closed! Remember the White Queen's words: 'Why, sometimes I've believed as many as six impossible things before breakfast.'"

**ACTION:** Scroll to show the issue timeline

**YOU SAY:**
> "Fifteen minutes ago, this seemed impossible. Look at what we started with."

**ACTION:** Point to the issue details

**YOU SAY:**
> "A high-severity SQL injection vulnerability. Four occurrences. Code that's been here since 2019. No one on the team felt comfortable touching it. It was in the 'too risky' pile."

**[Pause 2 seconds]**

**ACTION:** Scroll to the closing comment

**YOU SAY:**
> "But then Alice arrived. And what seemed impossible became possible."

**ACTION:** Read from the auto-close comment

**YOU SAY:**
> "'All 4 occurrences of this vulnerability are no longer detected in the latest CodeQL scan.' The 'Process CodeQL Results' workflow verified the fix, saw the vulnerability is gone, and auto-closed with a full audit trail."

**ACTION:** Scroll through the comment showing details

**YOU SAY:**
> "Look at this—it shows what was fixed, when, which commit, which pull request. Complete traceability. If a security auditor asks 'how did you remediate this?' we have the full story."

**[Pause 1 second]**

**YOU SAY:**
> "Let me summarize what became possible: We fixed a high-severity vulnerability in one afternoon. Incremental, testable changes—15 lines modified, 30 lines of tests added. Zero breaking changes to the API. Comprehensive documentation for future maintainers. And most importantly—a proven pattern for systematically addressing those other 14 instances."

**ACTION:** Navigate back to Issues list

**YOU SAY:**
> "The impossible became possible. Not through magic, but through careful exploration, methodical planning, human oversight, and incremental transformation. This is the Good Maintainer in action."

---

## 🎬 PART 3: Wrap-Up & Key Takeaways (2 minutes)

### Scene 12: The Alice Way - Summary (1 minute 30 seconds)

**ACTION:** Navigate back to `https://maintainability.ai/docs/agents/alice`

**YOU SAY:**
> "So let's recap what we just saw, using Alice's 8 principles."

**ACTION:** Scroll to "The Alice Way" section

**YOU SAY:**
> "Read—Alice read the OWASP prompt pack before touching code. Test—she made incremental changes with tests after each step. Question—she challenged the string concatenation pattern. Maintain Identity—the code's behavior stayed the same, just more secure. Document—detailed commit messages and PR descriptions. Believe—what seemed like an overwhelming security backlog became manageable. Manage Chaos—4 vulnerable locations, systematically fixed. Explore—Phase 1 was pure exploration before any implementation."

**[Pause 2 seconds]**

---

### Scene 13: The Metrics (30 seconds)

**ACTION:** Show a simple slide or text overlay with the timings

**YOU SAY:**
> "Let's talk about the numbers. From vulnerable code commit to merged fix:"
> - Initial commit to CodeQL scan: 1 minute
> - CodeQL to security issue creation: 1 minute
> - Comment '@claude' to remediation plan: 3 minutes (cost: ~$0.33)
> - Approval to PR creation: 8 minutes (cost: ~$1.50)
> - Human review and merge: Your time and judgment
> - Final CodeQL scan and auto-close: 1 minute
>
> "Total automation time: about 14 minutes. Total cost: under $2. Total human time: maybe 10 minutes of actual review."

---

### Scene 14: Closing Hook (30 seconds)

**ACTION:** Navigate to `https://maintainability.ai`

**YOU SAY:**
> "This is the future of security-first development—AI handles the 70% of implementation work, humans own the 30% of architectural decisions and governance. Alice doesn't replace engineers. She amplifies them."

**[Pause 2 seconds]**

**YOU SAY:**
> "If you want to try this in your own repository, visit maintainability.ai. All the code, workflows, and prompt packs are open source. Thank you."

**[Screen fades or cuts]**

---

## 📋 Pre-Demo Checklist

### Before Recording:

- [ ] **Test repository prepared** with vulnerable code ready
- [ ] **All secrets configured** in GitHub repository settings:
  - `ANTHROPIC_API_KEY`
  - `GITHUB_TOKEN` (automatically available)
- [ ] **Workflows enabled** in repository settings
- [ ] **Browser tabs pre-opened** (but not pre-loaded):
  - Tab 1: `https://maintainability.ai/docs/sdlc/`
  - Tab 2: `https://maintainability.ai/docs/agents/alice`
  - Tab 3: Your test repository on GitHub
  - Tab 4: Terminal ready
- [ ] **VS Code** open with vulnerable file ready to show
- [ ] **Screen resolution** set to 1920x1080 for best recording
- [ ] **Font sizes increased** for readability:
  - Browser zoom: 125%
  - Terminal font: 16pt
  - VS Code font: 16pt
- [ ] **Notifications disabled** (Do Not Disturb mode)
- [ ] **Desktop clean** (hide personal files/icons)
- [ ] **Browser extensions** disabled or hidden
- [ ] **Practice run completed** at least once

### Test Repository Requirements:

Your test repo should have:
```
repo/
├── src/
│   └── app.ts              # Vulnerable code (SQL injection, etc.)
├── .github/
│   └── workflows/
│       ├── codeql.yml      # CodeQL workflow
│       ├── codeql-to-issues.yml  # Issue creation workflow
│       └── alice-remediation.yml # Alice workflow
├── examples/
│   └── agents/
│       └── automation/
│           ├── process-codeql-results.js
│           ├── prompt-mappings.json
│           └── prompt-hashes.json
├── package.json
└── tsconfig.json
```

---

## 🎯 Pacing & Timing Notes

| Section | Duration | Purpose | Key Message |
|---------|----------|---------|-------------|
| Introduction | 3 min | Hook + Context | AI + Humans = Better Security |
| Initial Commit | 1 min | Show vulnerability | This is real, exploitable code |
| CodeQL Scan | 1 min | Automated detection | Security scanning in CI/CD |
| Issue Creation | 1 min | Rich context | Not just alerts—actionable guidance |
| Phase 1 Planning | 3 min | Alice explores | Read-only, safe, thorough |
| Human Review | 1.5 min | Critical gate | Humans approve, not just rubber-stamp |
| Phase 2 Implementation | 8 min (highlights) | Alice implements | Incremental, tested, documented |
| Pull Request Review | 2 min | Human verification | Detailed checklist, full transparency |
| Merge & Auto-Close | 1.5 min | Full circle | System validates, issues auto-close |
| Wrap-Up | 2 min | Reinforce message | The Alice Way works |

---

## 💬 Optional Ad-Libs for Different Audiences

### For Security Teams:
> "Notice how the OWASP prompt packs are embedded in every issue. This isn't AI guessing—these are the exact security patterns from the OWASP Top 10 documentation, wrapped in a format AI can follow reliably."

### For Engineering Managers:
> "Think about your current security backlog. CodeQL finds 47 issues, your team is overwhelmed. With Alice, those 47 issues can have remediation plans in a few hours, ready for systematic review. Your team goes from drowning in alerts to methodically addressing them."

### For Developers:
> "This isn't replacing you. Alice is doing the tedious work—reading docs, applying patterns, running tests. You're doing the important work—reviewing the approach, verifying it makes sense, making the final call."

---

## 🎥 Recording Tips

1. **Speak slowly and clearly** - Technical demos benefit from slower pacing
2. **Pause between sections** - Gives viewers time to process
3. **Use your mouse to highlight** - Circle or underline key text on screen
4. **Zoom in on important details** - Especially code snippets and log output
5. **Cut dead time** - Fast-forward through the 8-minute implementation if needed
6. **Add captions** - Auto-caption after recording for accessibility
7. **Background music** - Soft, non-distracting during transitions (optional)

---

## 🚨 Troubleshooting During Demo

### If workflows fail:
> "In a live demo, sometimes things don't go perfectly. Let me show you a previous successful run..."

### If timing is off:
> "While this is running, let me show you something interesting in the documentation..."

### If you need to restart:
> "Actually, let me back up and show you this more clearly..."

**Remember:** Authenticity beats perfection. If something goes wrong, acknowledge it and adapt.

---

**Good luck with your recording!** 🎬
