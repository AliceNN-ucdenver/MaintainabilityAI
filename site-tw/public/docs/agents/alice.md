<div class="docs-hero docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/rabbit.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/agents/">Agents</a><span class="sep">/</span><span>Alice</span></div>
    <div class="docs-eyebrow">Agentic · The Good Maintainer <span class="docs-hero-meta">~14 min read</span></div>
    <h1 class="docs-hero-title">Alice &mdash; autonomous security remediation</h1>
    <p class="docs-hero-copy">A two-phase remediation agent built on Claude Code: <em>curiosity</em> reads the issue and proposes a plan, <em>implementation</em> applies it under human approval. Designed for CodeQL fixes, legacy refactoring, and debt reduction without losing the audit trail.</p>
    <span class="docs-hero-flourish">&ldquo;Six impossible things before breakfast&rdquo; &mdash; she ships them with tests.</span>
  </div>
</div>

![Alice Bot - The Good Maintainer](../../images/alice-bot.png)

> *Why, sometimes I've believed as many as six impossible things before breakfast.* — Alice in Wonderland

Alice is an **agentic AI proof of concept** that automates security remediation while keeping humans in control. She reads documentation, tests cautiously, questions assumptions, and documents her journey—just like a great maintainer would.

> **Heads up — the `@alice` magic comment was retired.** Alice is now the **`alice-maintenance-agent`** Copilot persona, dispatched in one click from the **Cheshire Scorecard / Looking Glass** (via `assignCustomCopilotAgent`). No magic comment, no Anthropic key — Alice runs on the Actions `GITHUB_TOKEN`. The storybook chapters below keep the original `@alice` flavor as narrative; the actionable how-to in **How Alice Works** and **Quick Start** reflects the current dispatch model.

<div class="docs-center-block">
  <p class="docs-copy">
    🎥 Watch Alice in Action
  </p>
  <p class="docs-copy">
    See a complete live demo: from vulnerability detection → automated remediation → human review → merge
  </p>
  <a href="https://olucdenver-my.sharepoint.com/:v:/g/personal/shawn_mccarthy_ucdenver_edu/Ece2jtrqXuVPpGiVkg6aAkkBndoPRjlZWrqR1-waWv88CA?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=BF87Ii" target="_blank" rel="noopener noreferrer" class="docs-button-secondary">
    ▶️ Watch the 15-Minute Demo
  </a>
</div>

---

## Why "Alice"?

<div class="docs-grid">

<div class="docs-card docs-card-muted">
  <h3 class="docs-heading">The Rabbit Hole of Legacy Code</h3>
  <p class="docs-copy">Software maintenance often feels like falling down a rabbit hole: legacy code with no comments, "temporary" fixes from years ago, technical debt everyone accepts as inevitable.</p>
</div>

<div class="docs-card docs-card-muted">
  <h3 class="docs-heading">Alice Brings Order to Chaos</h3>
  <p class="docs-copy">Just as Alice in Wonderland carefully read labels before drinking mysterious potions, questioned illogical rules, and maintained her sense of self through bizarre transformations—<strong class="docs-strong">Alice Agent embodies the principles of The Good Maintainer</strong>.</p>
</div>

</div>

---

## The Alice Way

<div class="docs-center-block">
  <p class="docs-copy">Alice embodies eight principles of The Good Maintainer</p>
</div>

<div class="docs-card docs-card-emerald">

<div>
  <h3 class="docs-heading">1. Read (Wisdom)</h3>
  <p class="docs-copy">"What is the use of a book without pictures or conversations?"</p>
  <p class="docs-copy">Alice reads compact prompt packs (OWASP, STRIDE, Maintainability) before touching code. She analyzes CodeQL findings, commit history, test suites, and comments to understand context. Good maintainers don't guess—they gather context first.</p>
</div>

<div>
  <h3 class="docs-heading">2. Test (Caution)</h3>
  <p class="docs-copy">"I wonder if I've been changed in the night?"</p>
  <p class="docs-copy">Alice makes incremental changes with tests after each step. No massive refactors. Two-phase workflow: plan first, then implement. Incremental changes with tests keep systems stable while improving quality.</p>
</div>

<div>
  <h3 class="docs-heading">3. Question (Curiosity)</h3>
  <p class="docs-copy">"Curiouser and curiouser!"</p>
  <p class="docs-copy">Alice challenges technical debt: "Why is this a string concatenation?" "This 'temporary fix' from 2019—still temporary?" "Why does this function have 47 parameters?" Technical debt accumulates when teams accept "that's just how it works here."</p>
</div>

<div>
  <h3 class="docs-heading">4. Maintain Identity (Guidance)</h3>
  <p class="docs-copy">"Who am I?"</p>
  <p class="docs-copy">Alice maintains system integrity through refactoring. Function purpose stays clear, API contracts remain stable, business logic is validated by tests. Code can change form without losing its identity (purpose, behavior, contracts).</p>
</div>

<div>
  <h3 class="docs-heading">5. Document (Wisdom)</h3>
  <p class="docs-copy">"I must keep my journal!"</p>
  <p class="docs-copy">Alice writes detailed commit messages explaining the "why," creates PR descriptions with security controls, adds code comments for non-obvious decisions. Future maintainers need to understand not just what changed, but why and how it was validated.</p>
</div>

<div>
  <h3 class="docs-heading">6. Believe (Curiosity)</h3>
  <p class="docs-copy">"I can't believe that!" said Alice. "Can't you?" said the Queen. "Try."</p>
  <p class="docs-copy">Alice believes that 5-year-old 1000-line function can be refactored incrementally with strangler fig. That "unfixable" security vulnerability has proven OWASP remediation patterns. That test coverage stuck at 30% can improve function by function. Pessimism breeds stagnation. Alice approaches "impossible" problems with curiosity.</p>
</div>

<div>
  <h3 class="docs-heading">7. Manage Chaos (Automation)</h3>
  <p class="docs-copy">"We're all mad here."</p>
  <p class="docs-copy">Codebases are chaos: spaghetti logic, inconsistent patterns, surprise side effects. Alice brings order through complexity reduction (flatten nesting, extract functions), strangler fig patterns (replace legacy incrementally), fitness functions (automated quality gates), and defense in depth (multiple security layers). Chaos compounds over time. Alice systematically transforms it into maintainable code.</p>
</div>

<div>
  <h3 class="docs-heading">8. Explore (Curiosity)</h3>
  <p class="docs-copy">"Curiouser and curiouser!"</p>
  <p class="docs-copy">Alice explores before acting. Phase 1 (Analysis) is pure curiosity—no code changes, just understanding. She uses Grep, Read, Glob to explore patterns, reads commit history, examines test coverage. Good maintainers don't rush to "fix" things. They explore, understand, then propose solutions.</p>
</div>

</div>

---

## How Alice Works

<div class="docs-card docs-card-muted">
  <p class="docs-copy">
    Alice operates in <strong class="docs-strong">two phases</strong> with a human approval gate between them. This ensures safety, quality, and human control throughout the remediation process.
  </p>
</div>

<div class="docs-card docs-card-muted">
  <h3 class="docs-heading">🔍 Phase 1: Curiosity & Planning</h3>

  <div class="docs-card docs-card-muted">
    <div class="docs-heading">TRIGGER</div>
    <div class="docs-copy">Dispatch Alice from the <strong class="docs-strong">Cheshire Scorecard</strong> on any CodeQL issue (one click — assigns the <strong class="docs-strong">alice-maintenance-agent</strong> Copilot persona; no magic comment)</div>
  </div>

  <p class="docs-copy">"What's in this bottle? Let me read the label before drinking."</p>

  <p class="docs-copy"><strong class="docs-strong">What Alice Does:</strong></p>
  <ul class="markdown-list list-disc">
    <li>Reads the "Drink Me" label (compact prompt packs)</li>
    <li>Explores codebase (Grep, Read, commit history)</li>
    <li>Questions assumptions ("Why string concatenation?")</li>
    <li>Creates remediation plan with design decisions</li>
    <li>Outputs copy-paste approval statement</li>
  </ul>

  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">✓ Safety</div>
    <div class="docs-copy"><strong class="docs-strong">Permissions:</strong> Read-only (can't break anything)<br/><strong class="docs-strong">Result:</strong> Detailed plan for human review</div>
  </div>
</div>

<div class="docs-card docs-card-amber">
  <h3 class="docs-heading">⚡ Human Approval Gate</h3>

  <p class="docs-copy">"Who are YOU?" — The Caterpillar</p>

  <p class="docs-copy"><strong class="docs-strong">You Review Alice's Plan:</strong></p>
  <ul class="markdown-list list-disc">
    <li>✓ Are technology choices appropriate?</li>
    <li>✓ Is refactoring approach sound?</li>
    <li>✓ Are test cases comprehensive?</li>
  </ul>

  <div class="docs-card docs-card-muted">
    <div class="docs-heading">✅ To Authorize</div>
    <div class="docs-copy">On a Restricted-tier BAR, a human grants a scoped, audited <strong class="docs-strong">break-glass</strong> to let Alice write — review happens on the PR she opens</div>
  </div>

  <div class="docs-card docs-card-muted">
    <div class="docs-heading">⚠️ Why This Matters</div>
    <div class="docs-copy">Alice proposes, humans authorize. Critical governance gate — the break-glass grant is scoped and recorded.</div>
  </div>
</div>

<div class="docs-card docs-card-muted">
  <h3 class="docs-heading">🎯 Phase 2: Implementation</h3>

  <div class="docs-card docs-card-muted">
    <div class="docs-heading">TRIGGER</div>
    <div class="docs-copy">Human grants the scoped <strong class="docs-strong">break-glass</strong> on the Restricted-tier BAR<br/><span class="docs-copy">(the deterministic gate that authorizes Alice to write)</span></div>
  </div>

  <p class="docs-copy">"The Queen approved. Now I'll test each transformation carefully."</p>

  <p class="docs-copy"><strong class="docs-strong">What Alice Does:</strong></p>
  <ul class="markdown-list list-disc">
    <li>Creates isolated branch <strong>alice-fix-issue-{number}</strong></li>
    <li>Makes incremental changes (validate, refactor, error handling)</li>
    <li>Runs tests after each step</li>
    <li>Validates verification checklist</li>
    <li>Documents journey in detailed commit</li>
    <li>Creates PR with labels: <strong>security, ai-assisted</strong></li>
  </ul>

  <div class="docs-card docs-card-indigo">
    <div class="docs-heading">🎯 Safety & Results</div>
    <div class="docs-copy"><strong class="docs-strong">Permissions:</strong> Write to branches (NOT main)<br/><strong class="docs-strong">Result:</strong> PR ready for human review</div>
  </div>

  <div class="docs-card docs-card-rose">
    <div class="docs-heading">⚠️ IMPORTANT</div>
    <div class="docs-copy">Alice does NOT auto-merge. Humans review PR and merge when satisfied.</div>
  </div>
</div>

---

## Quick Start

For complete setup instructions and examples, see the [Alice Agent README](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/examples/agents) on GitHub.

**Quick summary:**
1. CodeQL creates security issues with the `codeql-finding` label
2. Dispatch Alice from the Cheshire Scorecard in one click — it assigns the `alice-maintenance-agent` Copilot persona to the issue (no magic comment)
3. Review Alice's remediation plan
4. On a Restricted-tier BAR, grant the scoped, audited break-glass to authorize implementation
5. Review and merge the PR

---

## The Wonderland Journey

<div class="docs-card docs-card-muted">

<p class="docs-copy">📖 The Wonderland Journey</p>
<p class="docs-copy">A whimsical tale of how Alice transforms chaos into order</p>

<style>
details {
  margin: 16px 0;
  border: 2px solid #a78bfa;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(139, 92, 246, 0.05);
}

details summary {
  padding: 20px 24px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 700;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.1);
  user-select: none;
  transition: background 0.3s ease;
}

details summary:hover {
  background: rgba(139, 92, 246, 0.2);
}

details[open] summary {
  background: rgba(139, 92, 246, 0.15);
  border-bottom: 2px solid #a78bfa;
}

details .chapter-content {
  padding: 24px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<!-- Chapter 1: Down the Rabbit Hole -->
<details open>
<summary>🐰 Chapter 1: Down the Rabbit Hole</summary>
<div class="chapter-content">

<p class="docs-copy">
  It was an ordinary Tuesday morning when the White Rabbit came rushing past Alice's desk, his waistcoat flapping wildly behind him.
</p>

<p class="docs-copy">
  "I'm late! I'm late! For a very important feature!" he cried, clutching his pocket watch with one paw while frantically scrolling through pull requests with the other. "No time to fix these security issues now! The client demo is tomorrow morning!"
</p>

<p class="docs-copy">
  But Alice, ever curious, noticed something the Rabbit had dropped in his haste. A glowing red alert, pulsing like a warning beacon in the darkness. She picked it up and read:
</p>

<div class="docs-card docs-card-rose">
  <p class="docs-copy">"SQL injection, dear. Severity: High. Shall I show you the way out?"</p>
  <p class="docs-copy">— CodeQL, the vigilant Cheshire Cat</p>
</div>

<p class="docs-copy">
  The codebase, Alice realized, was Wonderland itself. Strange, illogical, full of curious surprises and forgotten corners. She peered into the repository and discovered an old function tucked away like a dusty bottle on a shelf. The comment at the top read: <em class="docs-emphasis">"Temporary search handler - will refactor later"</em>. The date? June 2019.
</p>

<p class="docs-copy">
  The function concatenated strings into SQL queries like the Mad Hatter stacking teacups at his chaotic tea party, precariously balanced and without much thought for gravity, physics, or the consequences of dropping malicious input into the mix.
</p>

<p class="docs-copy">
  The developer appeared beside her, sighing deeply. They had fallen into this particular rabbit hole before.
</p>

<p class="docs-copy">
  With a weary but hopeful voice, they typed a single comment: <strong class="docs-strong">@alice this looks bad, can you help?</strong>
</p>

<p class="docs-copy">
  And just like that, Alice tumbled down into the rabbit hole of legacy code, ready to explore.
</p>

</div>
</details>

<!-- Chapter 2: Reading the Label -->
<details>
<summary>🍄 Chapter 2: Reading the Label</summary>
<div class="chapter-content">

<p class="docs-copy">
  At the bottom of the rabbit hole, Alice found herself in a long hallway lined with doors. On a small glass table sat a bottle with a paper label tied around its neck.
</p>

<p class="docs-copy">
  <em class="docs-emphasis">"DRINK ME,"</em> it said in beautiful large letters.
</p>

<p class="docs-copy">
  But Alice was a sensible girl. She had read enough stories to know that drinking mysterious potions without reading the fine print was generally unwise. So she turned the bottle over and examined the label carefully.
</p>

<div class="docs-card docs-card-indigo">
  <p class="docs-copy">📜 THE LABEL</p>
  <p class="docs-copy">OWASP A03 - Injection Prevention</p>
  <ul class="markdown-list list-disc">
    <li>Parameterized queries with $1 placeholders prevent SQL injection</li>
    <li>Input validation with allowlist regex catches malicious characters</li>
    <li>Generic error messages prevent schema exposure</li>
  </ul>
</div>

<p class="docs-copy">
  Alice began to explore, moving through the codebase as she once wandered through Wonderland's gardens. She noted which paths led to roses and which to thorns. In her exploration, she discovered something curious: fourteen other functions with the same vulnerability, scattered throughout the repository like playing cards blown by the wind.
</p>

<p class="docs-copy">
  "Curiouser and curiouser!" she exclaimed. "Why string concatenation when PostgreSQL supports parameterized queries? Surely this was meant to be temporary?"
</p>

<p class="docs-copy">
  The pattern was as consistent as the Queen's croquet mallets, which turned out to be flamingos. Every instance used the same dangerous approach, as if copied and pasted from a single template of technical debt.
</p>

<p class="docs-copy">
  Alice sat down and composed a remediation plan, methodically addressing each design decision:
</p>

<p class="docs-copy">
  <strong class="docs-strong">Which library?</strong> The pg library was already in the package, waiting to be used properly.
</p>

<p class="docs-copy">
  <strong class="docs-strong">What validation?</strong> A Zod schema with an alphanumeric allowlist would catch malicious characters before they reached the database.
</p>

<p class="docs-copy">
  <strong class="docs-strong">How to refactor?</strong> Three careful steps: validate inputs, parameterize the query, implement safe error handling.
</p>

</div>
</details>

<!-- Chapter 3: The Caterpillar's Question -->
<details>
<summary>🐛 Chapter 3: The Caterpillar's Question</summary>
<div class="chapter-content">

<p class="docs-copy">
  Alice presented her plan to the human, laying it out like a map of Wonderland with all its twists and turns marked clearly.
</p>

<p class="docs-copy">
  The human sat atop a mushroom (or perhaps it was just a very comfortable office chair), reviewing Alice's proposal with careful attention. Smoke from their coffee drifted upward in lazy circles as they considered each detail.
</p>

<div class="docs-card docs-card-amber">
  <p class="docs-copy">"Who... are... YOU?"</p>
  <p class="docs-copy">— The Caterpillar, each word punctuated by a puff of smoke</p>
</div>

<p class="docs-copy">
  It was not a question about identity, but about understanding. The Caterpillar wanted to know: Who are you to propose this solution? Do you understand the context? Have you thought through the consequences?
</p>

<p class="docs-copy">
  The human reviewed each part of Alice's plan:
</p>

<p class="docs-copy">
  ✓ The technology choices were sound. They already used pg and Zod everywhere in the codebase.
</p>

<p class="docs-copy">
  ✓ The incremental approach was sensible. Fix one instance first, prove the pattern, then systematically address the others.
</p>

<p class="docs-copy">
  ✓ The error handling struck the right balance between user-friendly and secure.
</p>

<p class="docs-copy">
  After a thoughtful pause, the human smiled and typed the magic words:
</p>

<div class="docs-center-block">
  <p class="docs-copy">@alice approved</p>
</div>

<p class="docs-copy">
  And just like that, Alice began her transformation. The plan was sound. The human had approved. Now it was time to make the changes real.
</p>

</div>
</details>

<!-- Chapter 4: Careful Transformation -->
<details>
<summary>🎩 Chapter 4: Careful Transformation</summary>
<div class="chapter-content">

<p class="docs-copy">
  Alice ate from one side of the mushroom, and she began to shrink. Not physically, of course, but the problem itself shrank down to a manageable size.
</p>

<p class="docs-copy">
  <strong class="docs-strong">Step One: Validation</strong>
</p>

<p class="docs-copy">
  First, she added input validation, a protective layer like gloves before handling thorny roses. She carefully wrote the Zod schema, defining exactly what characters were allowed and what should be rejected.
</p>

<p class="docs-copy">
  She ran the tests. They passed. The code remained stable.
</p>

<p class="docs-copy">
  "I wonder if I've been changed?" Alice mused, looking at the function that was slowly becoming safer.
</p>

<p class="docs-copy">
  <strong class="docs-strong">Step Two: Parameterization</strong>
</p>

<p class="docs-copy">
  Then she transformed the query itself. Out went the string concatenation, replaced with proper parameterized placeholders. The SQL went from a precariously stacked tower of teacups to a single, stable, properly designed query.
</p>

<p class="docs-copy">
  Tests ran again. Still passing. The code was getting better with each careful step.
</p>

<p class="docs-copy">
  "Curiouser and curiouser! It actually works!"
</p>

<p class="docs-copy">
  <strong class="docs-strong">Step Three: Safe Error Handling</strong>
</p>

<p class="docs-copy">
  Finally, she added safe error handling. No more leaking database schema details to curious attackers. Generic, friendly error messages for users. Detailed logs for the development team. The function had completely transformed from a security vulnerability into a well-defended endpoint.
</p>

<div class="docs-card docs-card-muted">
  <p class="docs-copy">📝 BREADCRUMBS FOR TRAVELERS</p>
  <p class="docs-copy">Before moving on, Alice documented her journey in a detailed commit message. Not for herself, but for the next traveler who would venture this way, like breadcrumbs through the forest showing the safe path home.</p>
</div>

<p class="docs-copy">
  The transformation was complete. The code was secure. The tests were passing. It was time for human review.
</p>

</div>
</details>

<!-- Chapter 5: Painting the Roses Red -->
<details>
<summary>🌹 Chapter 5: Painting the Roses Red</summary>
<div class="chapter-content">

<p class="docs-copy">
  In the Queen's garden, three gardeners frantically painted white roses red. They worked in a panic, slapping paint on petals, trying to fix their mistake before the Queen arrived for her croquet match.
</p>

<p class="docs-copy">
  "We planted the wrong color!" they cried. "The Queen wanted red, and we planted white by mistake!"
</p>

<p class="docs-copy">
  It was a quick fix, a surface solution to avoid immediate consequences. But it wasn't a real solution at all.
</p>

<p class="docs-copy">
  The human reviewer paused at Alice's pull request, thinking deeply about a similar question: Are we just painting roses red? Or is this the time to dig deeper and plant the right roses in the first place?
</p>

<div class="docs-card docs-card-amber">
  <p class="docs-copy">🤔 THE HUMAN'S CRITICAL THINKING</p>
  <p class="docs-copy">"This PR fixes the immediate SQL injection vulnerability. That's good. But I found 13 other instances of the same pattern. Should we tackle them all now? Or ship this one change first, demonstrate the pattern works, and then systematically address the others? What's the risk versus reward?"</p>
</div>

<p class="docs-copy">
  To verify the fix worked, the human manually tested with a classic SQL injection payload:
</p>

<div class="docs-card docs-card-rose">
  <p class="docs-copy">SQL INJECTION TEST PAYLOAD</p>
  <p class="docs-copy">'; DROP TABLE users--</p>
</div>

<div class="docs-card docs-card-muted">
  <p class="docs-copy">✅ VALIDATION LAYER RESPONSE</p>
  <p class="docs-copy">"Invalid username format."</p>
</div>

<p class="docs-copy">
  Perfect. The malicious input was caught and rejected before it ever reached the database. The fix was solid.
</p>

<p class="docs-copy">
  After careful consideration, the human made a strategic decision: ship this one fix now. Let it run in production. Demonstrate the pattern works. Then create a systematic plan to address the other 13 instances.
</p>

<div class="docs-card docs-card-amber">
  <p class="docs-copy">💡 THE HUMAN INSIGHT</p>
  <p class="docs-copy">This is the value a human brings. Not just quality control, but strategic thinking. Sometimes painting the roses red IS the right answer: a focused, testable change that can be deployed quickly. Other times, it's the signal to dig deeper and redesign the garden. The human knows which is which.</p>
</div>

<p class="docs-copy">
  ✓ Merge pull request
</p>

</div>
</details>

<!-- Chapter 6: The Impossible Became Possible -->
<details>
<summary>✨ Chapter 6: The Impossible Became Possible</summary>
<div class="chapter-content">

<p class="docs-copy">
  "Why, sometimes I've believed as many as six impossible things before breakfast," the White Queen once told Alice.
</p>

<p class="docs-copy">
  At first glance, fixing this security vulnerability seemed impossible:
</p>

<div class="docs-card docs-card-rose">
  <p class="docs-copy">❌ WHAT SEEMED "IMPOSSIBLE"</p>
  <ul class="markdown-list list-disc">
    <li>"This code is too risky to touch. It's been here since 2019 and we don't fully understand it."</li>
    <li>"We don't have time to fix all these SQL injection issues. The backlog is already overwhelming."</li>
    <li>"This would require refactoring the entire API layer. That's a quarter-long project."</li>
    <li>"Nobody on the team is familiar enough with this part of the codebase to make changes safely."</li>
  </ul>
</div>

<p class="docs-copy">
  These weren't unreasonable concerns. They were the kind of very sensible objections that keep risky changes from breaking production systems.
</p>

<p class="docs-copy">
  But then Alice arrived. And what seemed impossible became possible:
</p>

<div class="docs-card docs-card-indigo">
  <p class="docs-copy">✅ WHAT ALICE MADE POSSIBLE</p>
  <ul class="markdown-list list-disc">
    <li>Fixed the high-severity vulnerability in one afternoon</li>
    <li>Incremental, testable change (15 lines modified, 30 lines of tests)</li>
    <li>Zero breaking changes to the API</li>
    <li>Comprehensive documentation for future maintainers</li>
    <li>A proven pattern for systematically addressing the other 13 instances</li>
    <li>Increased team confidence in making security improvements</li>
  </ul>
</div>

<p class="docs-copy">
  The impossible had become possible. Not through magic, but through careful exploration, methodical planning, human oversight, and incremental transformation.
</p>

<p class="docs-copy">
  This was the Good Maintainer in action. Not rushing to fix everything at once, but taking one careful step at a time. Exploring before acting. Planning before implementing. Seeking approval before committing. Testing at every step. Documenting the journey.
</p>

<p class="docs-copy">
  "Why, sometimes I've believed as many as six impossible things before breakfast."
</p>

<p class="docs-copy">
  That's the Good Maintainer in action.
</p>

<p class="docs-copy">
  — The End —
</p>

</div>
</details>

</div>

---

## Use Cases

<div class="docs-grid">

<div class="docs-card docs-card-emerald">
  <h3 class="docs-heading">✅ Alice Thrives On</h3>

  <div>
    <h4 class="docs-heading">Security Vulnerabilities</h4>
    <p class="docs-copy">SQL injection, XSS, hardcoded secrets, path traversal—CodeQL finds them, Alice fixes them with OWASP patterns.</p>
  </div>

  <div>
    <h4 class="docs-heading">Legacy Code</h4>
    <p class="docs-copy">1000-line functions, 18 cyclomatic complexity, technical debt from 2019—Alice brings incremental improvement.</p>
  </div>

  <div>
    <h4 class="docs-heading">Technical Debt</h4>
    <p class="docs-copy">Strangler fig refactoring, complexity reduction, test coverage improvements—systematic quality upgrades.</p>
  </div>

  <div>
    <h4 class="docs-heading">CI/CD Integration</h4>
    <p class="docs-copy">Automated on every PR, runs in GitHub Actions, integrates with existing workflows.</p>
  </div>
</div>

<div class="docs-card docs-card-rose">
  <h3 class="docs-heading">❌ Alice Gets Confused By</h3>

  <div>
    <h4 class="docs-heading">Greenfield Features</h4>
    <p class="docs-copy">"Build a new dashboard from scratch"—Alice is a maintainer, not a product designer. Use Claude/Copilot for new features.</p>
  </div>

  <div>
    <h4 class="docs-heading">Ambiguous Requirements</h4>
    <p class="docs-copy">"Make it better"—Alice needs specific vulnerabilities or code smells. CodeQL provides this specificity.</p>
  </div>

  <div>
    <h4 class="docs-heading">Architectural Rewrites</h4>
    <p class="docs-copy">"Migrate from REST to GraphQL"—too large scope. Alice works incrementally, function by function.</p>
  </div>

  <div>
    <h4 class="docs-heading">Bikeshedding</h4>
    <p class="docs-copy">"Should we use tabs or spaces?"—Alice focuses on security and maintainability, not style debates.</p>
  </div>
</div>

</div>

---

## Six Impossible Things

<div class="docs-card docs-card-muted">
  <p class="docs-copy">
    "Why, sometimes I've believed as many as six impossible things before breakfast." — The Queen, Alice in Wonderland
  </p>
</div>

<div class="docs-grid">

<div class="docs-card docs-card-indigo">
  <h3 class="docs-heading">1. Legacy Code Can Be Fixed</h3>
  <p class="docs-copy">"This code is too old to touch safely"</p>
  <p class="docs-copy"><strong class="docs-strong">Alice's approach:</strong> Strangler fig pattern—wrap, test, replace incrementally.</p>
  <p class="docs-copy"><strong>Result:</strong> 1000 lines → 200 lines, fully tested</p>
</div>

<div class="docs-card docs-card-cyan">
  <h3 class="docs-heading">2. Technical Debt Can Be Paid Down</h3>
  <p class="docs-copy">"We'll never get test coverage above 30%"</p>
  <p class="docs-copy"><strong class="docs-strong">Alice's approach:</strong> Add tests function by function, validate with every change.</p>
  <p class="docs-copy"><strong>Result:</strong> 0% → 82% coverage in 12 weeks</p>
</div>

<div class="docs-card docs-card-emerald">
  <h3 class="docs-heading">3. Security Doesn't Slow You Down</h3>
  <p class="docs-copy">"Security fixes take too long"</p>
  <p class="docs-copy"><strong class="docs-strong">Alice's approach:</strong> Automated remediation with human approval, OWASP patterns pre-loaded.</p>
  <p class="docs-copy"><strong>Result:</strong> Security PRs ready in 2 hours, not 2 weeks</p>
</div>

<div class="docs-card docs-card-amber">
  <h3 class="docs-heading">4. Chaos Can Become Order</h3>
  <p class="docs-copy">"This codebase is spaghetti, no documentation"</p>
  <p class="docs-copy"><strong class="docs-strong">Alice's approach:</strong> Document as you fix, extract functions, reduce complexity systematically.</p>
  <p class="docs-copy"><strong>Result:</strong> Complexity 18 → 9, with inline docs</p>
</div>

<div class="docs-card docs-card-pink">
  <h3 class="docs-heading">5. Zero Tests Can Become 80% Coverage</h3>
  <p class="docs-copy">"This module has no tests, we can't add them now"</p>
  <p class="docs-copy"><strong class="docs-strong">Alice's approach:</strong> Add characterization tests first, then security tests, then edge cases.</p>
  <p class="docs-copy"><strong>Result:</strong> 0% → 83% coverage in 8 weeks</p>
</div>

<div class="docs-card docs-card-muted">
  <h3 class="docs-heading">6. "Impossible" Deadlines Can Be Met</h3>
  <p class="docs-copy">"We need 47 security fixes by Friday"</p>
  <p class="docs-copy"><strong class="docs-strong">Alice's approach:</strong> Automated analysis, batched fixes, systematic testing—parallel remediation.</p>
  <p class="docs-copy"><strong>Result:</strong> 47 security PRs created in 1 day</p>
</div>

</div>

---

## Epilogue

<div class="docs-card docs-card-muted">
  <p class="docs-copy">
    "Begin at the beginning," the King said, very gravely, "and go on till you come to the end: then stop."
  </p>
  <p class="docs-copy">
    In Wonderland, Alice learned that curiosity conquers chaos. In your codebase, Alice brings the same transformation: reading labels before drinking, questioning illogical patterns, maintaining identity through refactoring, documenting the journey for future travelers.
  </p>
</div>

<div class="docs-grid">

<div class="docs-card docs-card-muted">
  <h3 class="docs-heading">Eight Principles in Action</h3>
  <ul class="markdown-list list-disc">
    <li>Documentation first, changes second</li>
    <li>Incremental improvements with tests</li>
    <li>Questions assumptions, challenges debt</li>
    <li>Maintains system integrity</li>
    <li>Detailed commit messages</li>
    <li>Believes in impossible improvements</li>
    <li>Manages chaos systematically</li>
    <li>Explores before acting</li>
  </ul>
</div>

<div class="docs-card docs-card-muted">
  <h3 class="docs-heading">Results Speak</h3>
  <ul class="markdown-list list-disc">
    <li>1000-line function → 200 lines</li>
    <li>Complexity 18 → 9</li>
    <li>Coverage 0% → 82%</li>
    <li>Security PRs in hours, not weeks</li>
    <li>Technical debt → Maintainable code</li>
    <li>Chaos → Order</li>
  </ul>
</div>

</div>

<div class="docs-center-block">
  <p class="docs-copy">
    🐰 Ready to start? Dispatch <strong>Alice</strong> from the Cheshire Scorecard on your next CodeQL issue — one click, no magic comment.
  </p>
</div>

<p class="docs-copy">That's the Good Maintainer in action.</p>
