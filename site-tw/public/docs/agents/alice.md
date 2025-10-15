# Alice Agent - The Good Maintainer

> **Purpose**: Autonomous security remediation agent that embodies the principles of excellent code maintainership.

![Alice Bot - The Good Maintainer](../../images/alice-bot.png)

> *"Why, sometimes I've believed as many as six impossible things before breakfast."* — Alice in Wonderland

Alice is an **agentic AI proof of concept** built on Claude Code that automates security remediation while keeping humans in control. She reads documentation, tests cautiously, questions assumptions, and documents her journey—just like a great maintainer would.

---

## Why "Alice"?

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin: 48px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #6EE7F9; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #6EE7F9; margin-top: 0; font-size: 20px; font-weight: 700;">The Rabbit Hole of Legacy Code</h3>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.7; margin: 0;">Software maintenance often feels like falling down a rabbit hole: legacy code with no comments, "temporary" fixes from years ago, technical debt everyone accepts as inevitable.</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #5eead4; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #5eead4; margin-top: 0; font-size: 20px; font-weight: 700;">Alice Brings Order to Chaos</h3>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.7; margin: 0;">Just as Alice in Wonderland carefully read labels before drinking mysterious potions, questioned illogical rules, and maintained her sense of self through bizarre transformations—<strong style="color: #5eead4;">Alice Agent embodies the principles of The Good Maintainer</strong>.</p>
</div>

</div>

---

## The Alice Way

<div style="text-align: center; margin: 32px 0 24px 0;">
  <p style="color: #cbd5e1; font-size: 18px; line-height: 1.6; margin: 0;">Alice embodies eight principles of The Good Maintainer</p>
</div>

<div style="background: #000000; border: 2px solid #14b8a6; border-radius: 16px; padding: 32px; margin: 40px 0; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);">

<div style="padding: 16px 0;">
  <h3 style="color: #5eead4; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">1. Read (Wisdom)</h3>
  <p style="color: #6EE7F9; font-size: 14px; font-style: italic; margin: 0 0 12px 0; line-height: 1.5;">"What is the use of a book without pictures or conversations?"</p>
  <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">Alice reads compact prompt packs (OWASP, STRIDE, Maintainability) before touching code. She analyzes CodeQL findings, commit history, test suites, and comments to understand context. Good maintainers don't guess—they gather context first.</p>
</div>

<div style="padding: 16px 0;">
  <h3 style="color: #5eead4; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">2. Test (Caution)</h3>
  <p style="color: #6EE7F9; font-size: 14px; font-style: italic; margin: 0 0 12px 0; line-height: 1.5;">"I wonder if I've been changed in the night?"</p>
  <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">Alice makes incremental changes with tests after each step. No massive refactors. Two-phase workflow: plan first, then implement. Incremental changes with tests keep systems stable while improving quality.</p>
</div>

<div style="padding: 16px 0;">
  <h3 style="color: #5eead4; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">3. Question (Curiosity)</h3>
  <p style="color: #6EE7F9; font-size: 14px; font-style: italic; margin: 0 0 12px 0; line-height: 1.5;">"Curiouser and curiouser!"</p>
  <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">Alice challenges technical debt: "Why is this a string concatenation?" "This 'temporary fix' from 2019—still temporary?" "Why does this function have 47 parameters?" Technical debt accumulates when teams accept "that's just how it works here."</p>
</div>

<div style="padding: 16px 0;">
  <h3 style="color: #5eead4; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">4. Maintain Identity (Guidance)</h3>
  <p style="color: #6EE7F9; font-size: 14px; font-style: italic; margin: 0 0 12px 0; line-height: 1.5;">"Who am I?"</p>
  <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">Alice maintains system integrity through refactoring. Function purpose stays clear, API contracts remain stable, business logic is validated by tests. Code can change form without losing its identity (purpose, behavior, contracts).</p>
</div>

<div style="padding: 16px 0;">
  <h3 style="color: #5eead4; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">5. Document (Wisdom)</h3>
  <p style="color: #6EE7F9; font-size: 14px; font-style: italic; margin: 0 0 12px 0; line-height: 1.5;">"I must keep my journal!"</p>
  <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">Alice writes detailed commit messages explaining the "why," creates PR descriptions with security controls, adds code comments for non-obvious decisions. Future maintainers need to understand not just what changed, but why and how it was validated.</p>
</div>

<div style="padding: 16px 0;">
  <h3 style="color: #5eead4; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">6. Believe (Curiosity)</h3>
  <p style="color: #6EE7F9; font-size: 14px; font-style: italic; margin: 0 0 12px 0; line-height: 1.5;">"I can't believe that!" said Alice. "Can't you?" said the Queen. "Try."</p>
  <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">Alice believes that 5-year-old 1000-line function can be refactored incrementally with strangler fig. That "unfixable" security vulnerability has proven OWASP remediation patterns. That test coverage stuck at 30% can improve function by function. Pessimism breeds stagnation. Alice approaches "impossible" problems with curiosity.</p>
</div>

<div style="padding: 16px 0;">
  <h3 style="color: #5eead4; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">7. Manage Chaos (Automation)</h3>
  <p style="color: #6EE7F9; font-size: 14px; font-style: italic; margin: 0 0 12px 0; line-height: 1.5;">"We're all mad here."</p>
  <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">Codebases are chaos: spaghetti logic, inconsistent patterns, surprise side effects. Alice brings order through complexity reduction (flatten nesting, extract functions), strangler fig patterns (replace legacy incrementally), fitness functions (automated quality gates), and defense in depth (multiple security layers). Chaos compounds over time. Alice systematically transforms it into maintainable code.</p>
</div>

<div style="padding: 16px 0;">
  <h3 style="color: #5eead4; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">8. Explore (Curiosity)</h3>
  <p style="color: #6EE7F9; font-size: 14px; font-style: italic; margin: 0 0 12px 0; line-height: 1.5;">"Curiouser and curiouser!"</p>
  <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">Alice explores before acting. Phase 1 (Analysis) is pure curiosity—no code changes, just understanding. She uses Grep, Read, Glob to explore patterns, reads commit history, examines test coverage. Good maintainers don't rush to "fix" things. They explore, understand, then propose solutions.</p>
</div>

</div>

---

## How Alice Works

<div style="background: #000000; border: 2px solid #a78bfa; border-radius: 12px; padding: 32px; margin: 32px 0; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);">
  <p style="color: #cbd5e1; font-size: 17px; line-height: 1.8; margin: 0;">
    Alice operates in <strong style="color: #a78bfa;">two phases</strong> with a human approval gate between them. This ensures safety, quality, and human control throughout the remediation process.
  </p>
</div>

<div style="background: #000000; border: 2px solid #a78bfa; border-radius: 12px; padding: 28px; margin: 32px 0; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);">
  <h3 style="color: #a78bfa; margin-top: 0; font-size: 22px; font-weight: 700;">🔍 Phase 1: Curiosity & Planning</h3>

  <div style="background: rgba(139, 92, 246, 0.1); border-radius: 8px; padding: 16px; margin: 20px 0;">
    <div style="color: #a78bfa; font-weight: 600; margin-bottom: 8px;">TRIGGER</div>
    <div style="color: #e2e8f0; line-height: 1.6;">Comment <strong style="color: #a78bfa;">@alice</strong> on any CodeQL issue</div>
  </div>

  <p style="color: #c4b5fd; font-size: 15px; font-style: italic; line-height: 1.5; margin: 16px 0;">"What's in this bottle? Let me read the label before drinking."</p>

  <p style="color: #cbd5e1; line-height: 1.7; margin-top: 16px;"><strong style="color: #f1f5f9;">What Alice Does:</strong></p>
  <ul style="color: #cbd5e1; line-height: 1.7;">
    <li>Reads the "Drink Me" label (compact prompt packs)</li>
    <li>Explores codebase (Grep, Read, commit history)</li>
    <li>Questions assumptions ("Why string concatenation?")</li>
    <li>Creates remediation plan with design decisions</li>
    <li>Outputs copy-paste approval statement</li>
  </ul>

  <div style="background: rgba(139, 92, 246, 0.1); border-radius: 8px; padding: 16px; margin-top: 20px; border-left: 3px solid #8b5cf6;">
    <div style="color: #a78bfa; font-weight: 600; margin-bottom: 8px;">✓ Safety</div>
    <div style="color: #e2e8f0; line-height: 1.6;"><strong style="color: #f1f5f9;">Permissions:</strong> Read-only (can't break anything)<br/><strong style="color: #f1f5f9;">Result:</strong> Detailed plan for human review</div>
  </div>
</div>

<div style="background: #000000; border: 2px solid #f59e0b; border-radius: 12px; padding: 28px; margin: 32px 0; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);">
  <h3 style="color: #fbbf24; margin-top: 0; font-size: 22px; font-weight: 700;">⚡ Human Approval Gate</h3>

  <p style="color: #fde047; font-size: 15px; font-style: italic; line-height: 1.5; margin: 16px 0;">"Who are YOU?" — The Caterpillar</p>

  <p style="color: #cbd5e1; line-height: 1.7; margin-top: 16px;"><strong style="color: #f1f5f9;">You Review Alice's Plan:</strong></p>
  <ul style="color: #cbd5e1; line-height: 1.7;">
    <li>✓ Are technology choices appropriate?</li>
    <li>✓ Is refactoring approach sound?</li>
    <li>✓ Are test cases comprehensive?</li>
  </ul>

  <div style="background: rgba(245, 158, 11, 0.1); border-radius: 8px; padding: 16px; margin-top: 20px;">
    <div style="color: #fbbf24; font-weight: 600; margin-bottom: 8px;">✅ To Approve</div>
    <div style="color: #e2e8f0; line-height: 1.6;">Comment <strong style="color: #fbbf24;">@alice approved</strong></div>
  </div>

  <div style="background: rgba(245, 158, 11, 0.1); border-radius: 8px; padding: 16px; margin-top: 12px; border-left: 3px solid #f59e0b;">
    <div style="color: #fbbf24; font-weight: 600; margin-bottom: 8px;">⚠️ Why This Matters</div>
    <div style="color: #e2e8f0; line-height: 1.6;">Alice proposes, humans approve. Critical governance gate.</div>
  </div>
</div>

<div style="background: #000000; border: 2px solid #a78bfa; border-radius: 12px; padding: 28px; margin: 32px 0; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);">
  <h3 style="color: #a78bfa; margin-top: 0; font-size: 22px; font-weight: 700;">🎯 Phase 2: Implementation</h3>

  <div style="background: rgba(139, 92, 246, 0.1); border-radius: 8px; padding: 16px; margin: 20px 0;">
    <div style="color: #a78bfa; font-weight: 600; margin-bottom: 8px;">TRIGGER</div>
    <div style="color: #e2e8f0; line-height: 1.6;">Human comments <strong style="color: #a78bfa;">@alice approved</strong><br/><span style="font-size: 13px; color: #94a3b8;">(or "go ahead", "implement this", "looks good")</span></div>
  </div>

  <p style="color: #c4b5fd; font-size: 15px; font-style: italic; line-height: 1.5; margin: 16px 0;">"The Queen approved. Now I'll test each transformation carefully."</p>

  <p style="color: #cbd5e1; line-height: 1.7; margin-top: 16px;"><strong style="color: #f1f5f9;">What Alice Does:</strong></p>
  <ul style="color: #cbd5e1; line-height: 1.7;">
    <li>Creates isolated branch <strong>alice-fix-issue-{number}</strong></li>
    <li>Makes incremental changes (validate, refactor, error handling)</li>
    <li>Runs tests after each step</li>
    <li>Validates verification checklist</li>
    <li>Documents journey in detailed commit</li>
    <li>Creates PR with labels: <strong>security, ai-assisted</strong></li>
  </ul>

  <div style="background: rgba(139, 92, 246, 0.1); border-radius: 8px; padding: 16px; margin-top: 20px; border-left: 3px solid #8b5cf6;">
    <div style="color: #a78bfa; font-weight: 600; margin-bottom: 8px;">🎯 Safety & Results</div>
    <div style="color: #e2e8f0; line-height: 1.6;"><strong style="color: #f1f5f9;">Permissions:</strong> Write to branches (NOT main)<br/><strong style="color: #f1f5f9;">Result:</strong> PR ready for human review</div>
  </div>

  <div style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 16px; margin-top: 12px; border-left: 3px solid #ef4444;">
    <div style="color: #fca5a5; font-weight: 600; margin-bottom: 8px;">⚠️ IMPORTANT</div>
    <div style="color: #e2e8f0; line-height: 1.6;">Alice does NOT auto-merge. Humans review PR and merge when satisfied.</div>
  </div>
</div>

---

## Quick Start

For complete setup instructions and examples, see the [Alice Agent README](https://github.com/AliceNN-ucdenver/MaintainabilityAI/tree/main/examples/agents) on GitHub.

**Quick summary:**
1. Alice triggers automatically when CodeQL creates security issues
2. Comment `@alice` on any issue with the `codeql-finding` label
3. Review Alice's remediation plan
4. Comment `@alice approved` to trigger implementation
5. Review and merge the PR

---

## The Wonderland Journey

<div style="background: #000000; border: 2px solid #a78bfa; border-radius: 16px; padding: 40px; margin: 32px 0; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);">

<p style="color: #a78bfa; font-size: 20px; font-weight: 700; text-align: center; margin: 0 0 12px 0;">📖 The Wonderland Journey</p>
<p style="color: #94a3b8; font-size: 15px; font-style: italic; text-align: center; margin: 0 0 32px 0;">A whimsical tale of how Alice transforms chaos into order</p>

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

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  It was an ordinary Tuesday morning when the White Rabbit came rushing past Alice's desk, his waistcoat flapping wildly behind him.
</p>

<p style="color: #fde047; font-style: italic; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  "I'm late! I'm late! For a very important feature!" he cried, clutching his pocket watch with one paw while frantically scrolling through pull requests with the other. "No time to fix these security issues now! The client demo is tomorrow morning!"
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  But Alice, ever curious, noticed something the Rabbit had dropped in his haste. A glowing red alert, pulsing like a warning beacon in the darkness. She picked it up and read:
</p>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <p style="color: #fca5a5; font-style: italic; font-size: 15px; margin: 0 0 8px 0;">"SQL injection, dear. Severity: High. Shall I show you the way out?"</p>
  <p style="color: #94a3b8; font-size: 13px; margin: 0;">— CodeQL, the vigilant Cheshire Cat</p>
</div>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  The codebase, Alice realized, was Wonderland itself. Strange, illogical, full of curious surprises and forgotten corners. She peered into the repository and discovered an old function tucked away like a dusty bottle on a shelf. The comment at the top read: <em style="color: #94a3b8;">"Temporary search handler - will refactor later"</em>. The date? June 2019.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  The function concatenated strings into SQL queries like the Mad Hatter stacking teacups at his chaotic tea party, precariously balanced and without much thought for gravity, physics, or the consequences of dropping malicious input into the mix.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  The developer appeared beside her, sighing deeply. They had fallen into this particular rabbit hole before.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0;">
  With a weary but hopeful voice, they typed a single comment: <strong style="color: #a78bfa;">@alice this looks bad, can you help?</strong>
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 16px 0 0 0;">
  And just like that, Alice tumbled down into the rabbit hole of legacy code, ready to explore.
</p>

</div>
</details>

<!-- Chapter 2: Reading the Label -->
<details>
<summary>🍄 Chapter 2: Reading the Label</summary>
<div class="chapter-content">

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  At the bottom of the rabbit hole, Alice found herself in a long hallway lined with doors. On a small glass table sat a bottle with a paper label tied around its neck.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  <em style="color: #c4b5fd;">"DRINK ME,"</em> it said in beautiful large letters.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  But Alice was a sensible girl. She had read enough stories to know that drinking mysterious potions without reading the fine print was generally unwise. So she turned the bottle over and examined the label carefully.
</p>

<div style="background: rgba(139, 92, 246, 0.15); border: 2px solid #8b5cf6; border-radius: 12px; padding: 20px; margin: 24px 0;">
  <p style="color: #a78bfa; font-weight: 700; font-size: 15px; margin: 0 0 12px 0; text-align: center;">📜 THE LABEL</p>
  <p style="color: #c4b5fd; font-size: 14px; margin: 0 0 12px 0; font-style: italic;">OWASP A03 - Injection Prevention</p>
  <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0; padding-left: 20px;">
    <li>Parameterized queries with $1 placeholders prevent SQL injection</li>
    <li>Input validation with allowlist regex catches malicious characters</li>
    <li>Generic error messages prevent schema exposure</li>
  </ul>
</div>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  Alice began to explore, moving through the codebase as she once wandered through Wonderland's gardens. She noted which paths led to roses and which to thorns. In her exploration, she discovered something curious: fourteen other functions with the same vulnerability, scattered throughout the repository like playing cards blown by the wind.
</p>

<p style="color: #c4b5fd; font-style: italic; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  "Curiouser and curiouser!" she exclaimed. "Why string concatenation when PostgreSQL supports parameterized queries? Surely this was meant to be temporary?"
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  The pattern was as consistent as the Queen's croquet mallets, which turned out to be flamingos. Every instance used the same dangerous approach, as if copied and pasted from a single template of technical debt.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  Alice sat down and composed a remediation plan, methodically addressing each design decision:
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 8px 0;">
  <strong style="color: #a78bfa;">Which library?</strong> The pg library was already in the package, waiting to be used properly.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 8px 0;">
  <strong style="color: #a78bfa;">What validation?</strong> A Zod schema with an alphanumeric allowlist would catch malicious characters before they reached the database.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0;">
  <strong style="color: #a78bfa;">How to refactor?</strong> Three careful steps: validate inputs, parameterize the query, implement safe error handling.
</p>

</div>
</details>

<!-- Chapter 3: The Caterpillar's Question -->
<details>
<summary>🐛 Chapter 3: The Caterpillar's Question</summary>
<div class="chapter-content">

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  Alice presented her plan to the human, laying it out like a map of Wonderland with all its twists and turns marked clearly.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  The human sat atop a mushroom (or perhaps it was just a very comfortable office chair), reviewing Alice's proposal with careful attention. Smoke from their coffee drifted upward in lazy circles as they considered each detail.
</p>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <p style="color: #fbbf24; font-style: italic; font-size: 15px; margin: 0 0 8px 0;">"Who... are... YOU?"</p>
  <p style="color: #94a3b8; font-size: 13px; margin: 0;">— The Caterpillar, each word punctuated by a puff of smoke</p>
</div>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  It was not a question about identity, but about understanding. The Caterpillar wanted to know: Who are you to propose this solution? Do you understand the context? Have you thought through the consequences?
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  The human reviewed each part of Alice's plan:
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 8px 0;">
  ✓ The technology choices were sound. They already used pg and Zod everywhere in the codebase.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 8px 0;">
  ✓ The incremental approach was sensible. Fix one instance first, prove the pattern, then systematically address the others.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  ✓ The error handling struck the right balance between user-friendly and secure.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  After a thoughtful pause, the human smiled and typed the magic words:
</p>

<div style="background: rgba(245, 158, 11, 0.15); border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
  <p style="color: #fbbf24; font-size: 18px; font-weight: 700; margin: 0;">@alice approved</p>
</div>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0;">
  And just like that, Alice began her transformation. The plan was sound. The human had approved. Now it was time to make the changes real.
</p>

</div>
</details>

<!-- Chapter 4: Careful Transformation -->
<details>
<summary>🎩 Chapter 4: Careful Transformation</summary>
<div class="chapter-content">

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  Alice ate from one side of the mushroom, and she began to shrink. Not physically, of course, but the problem itself shrank down to a manageable size.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  <strong style="color: #a78bfa;">Step One: Validation</strong>
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  First, she added input validation, a protective layer like gloves before handling thorny roses. She carefully wrote the Zod schema, defining exactly what characters were allowed and what should be rejected.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  She ran the tests. They passed. The code remained stable.
</p>

<p style="color: #c4b5fd; font-style: italic; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  "I wonder if I've been changed?" Alice mused, looking at the function that was slowly becoming safer.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  <strong style="color: #a78bfa;">Step Two: Parameterization</strong>
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  Then she transformed the query itself. Out went the string concatenation, replaced with proper parameterized placeholders. The SQL went from a precariously stacked tower of teacups to a single, stable, properly designed query.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  Tests ran again. Still passing. The code was getting better with each careful step.
</p>

<p style="color: #c4b5fd; font-style: italic; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  "Curiouser and curiouser! It actually works!"
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  <strong style="color: #a78bfa;">Step Three: Safe Error Handling</strong>
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  Finally, she added safe error handling. No more leaking database schema details to curious attackers. Generic, friendly error messages for users. Detailed logs for the development team. The function had completely transformed from a security vulnerability into a well-defended endpoint.
</p>

<div style="background: rgba(139, 92, 246, 0.15); border-radius: 8px; padding: 20px; margin: 24px 0;">
  <p style="color: #a78bfa; font-weight: 600; font-size: 14px; margin: 0 0 12px 0;">📝 BREADCRUMBS FOR TRAVELERS</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">Before moving on, Alice documented her journey in a detailed commit message. Not for herself, but for the next traveler who would venture this way, like breadcrumbs through the forest showing the safe path home.</p>
</div>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0;">
  The transformation was complete. The code was secure. The tests were passing. It was time for human review.
</p>

</div>
</details>

<!-- Chapter 5: Painting the Roses Red -->
<details>
<summary>🌹 Chapter 5: Painting the Roses Red</summary>
<div class="chapter-content">

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  In the Queen's garden, three gardeners frantically painted white roses red. They worked in a panic, slapping paint on petals, trying to fix their mistake before the Queen arrived for her croquet match.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  "We planted the wrong color!" they cried. "The Queen wanted red, and we planted white by mistake!"
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  It was a quick fix, a surface solution to avoid immediate consequences. But it wasn't a real solution at all.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  The human reviewer paused at Alice's pull request, thinking deeply about a similar question: Are we just painting roses red? Or is this the time to dig deeper and plant the right roses in the first place?
</p>

<div style="background: rgba(245, 158, 11, 0.15); border-radius: 8px; padding: 20px; margin: 24px 0;">
  <p style="color: #fbbf24; font-weight: 600; font-size: 14px; margin: 0 0 12px 0;">🤔 THE HUMAN'S CRITICAL THINKING</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">"This PR fixes the immediate SQL injection vulnerability. That's good. But I found 13 other instances of the same pattern. Should we tackle them all now? Or ship this one change first, demonstrate the pattern works, and then systematically address the others? What's the risk versus reward?"</p>
</div>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  To verify the fix worked, the human manually tested with a classic SQL injection payload:
</p>

<div style="background: rgba(239, 68, 68, 0.15); border-radius: 8px; padding: 16px; margin: 16px 0;">
  <p style="color: #fca5a5; font-weight: 600; font-size: 13px; margin: 0 0 8px 0;">SQL INJECTION TEST PAYLOAD</p>
  <p style="color: #e2e8f0; font-family: monospace; font-size: 13px; margin: 0;">'; DROP TABLE users--</p>
</div>

<div style="background: rgba(139, 92, 246, 0.15); border-radius: 8px; padding: 16px; margin: 16px 0;">
  <p style="color: #a78bfa; font-weight: 600; font-size: 13px; margin: 0 0 8px 0;">✅ VALIDATION LAYER RESPONSE</p>
  <p style="color: #e2e8f0; font-size: 13px; margin: 0;">"Invalid username format."</p>
</div>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  Perfect. The malicious input was caught and rejected before it ever reached the database. The fix was solid.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  After careful consideration, the human made a strategic decision: ship this one fix now. Let it run in production. Demonstrate the pattern works. Then create a systematic plan to address the other 13 instances.
</p>

<div style="background: rgba(245, 158, 11, 0.15); border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #f59e0b;">
  <p style="color: #fbbf24; font-weight: 600; font-size: 14px; margin: 0 0 12px 0;">💡 THE HUMAN INSIGHT</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">This is the value a human brings. Not just quality control, but strategic thinking. Sometimes painting the roses red IS the right answer: a focused, testable change that can be deployed quickly. Other times, it's the signal to dig deeper and redesign the garden. The human knows which is which.</p>
</div>

<p style="color: #fbbf24; font-size: 16px; font-weight: 600; margin: 16px 0 0 0; text-align: center;">
  ✓ Merge pull request
</p>

</div>
</details>

<!-- Chapter 6: The Impossible Became Possible -->
<details>
<summary>✨ Chapter 6: The Impossible Became Possible</summary>
<div class="chapter-content">

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  "Why, sometimes I've believed as many as six impossible things before breakfast," the White Queen once told Alice.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  At first glance, fixing this security vulnerability seemed impossible:
</p>

<div style="background: rgba(239, 68, 68, 0.15); border-radius: 8px; padding: 20px; margin: 24px 0;">
  <p style="color: #fca5a5; font-weight: 600; font-size: 14px; margin: 0 0 12px 0;">❌ WHAT SEEMED "IMPOSSIBLE"</p>
  <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0; padding-left: 20px;">
    <li>"This code is too risky to touch. It's been here since 2019 and we don't fully understand it."</li>
    <li>"We don't have time to fix all these SQL injection issues. The backlog is already overwhelming."</li>
    <li>"This would require refactoring the entire API layer. That's a quarter-long project."</li>
    <li>"Nobody on the team is familiar enough with this part of the codebase to make changes safely."</li>
  </ul>
</div>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  These weren't unreasonable concerns. They were the kind of very sensible objections that keep risky changes from breaking production systems.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  But then Alice arrived. And what seemed impossible became possible:
</p>

<div style="background: rgba(139, 92, 246, 0.15); border: 2px solid #8b5cf6; border-radius: 12px; padding: 20px; margin: 24px 0;">
  <p style="color: #a78bfa; font-weight: 600; font-size: 14px; margin: 0 0 12px 0;">✅ WHAT ALICE MADE POSSIBLE</p>
  <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0; padding-left: 20px;">
    <li>Fixed the high-severity vulnerability in one afternoon</li>
    <li>Incremental, testable change (15 lines modified, 30 lines of tests)</li>
    <li>Zero breaking changes to the API</li>
    <li>Comprehensive documentation for future maintainers</li>
    <li>A proven pattern for systematically addressing the other 13 instances</li>
    <li>Increased team confidence in making security improvements</li>
  </ul>
</div>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  The impossible had become possible. Not through magic, but through careful exploration, methodical planning, human oversight, and incremental transformation.
</p>

<p style="color: #cbd5e1; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
  This was the Good Maintainer in action. Not rushing to fix everything at once, but taking one careful step at a time. Exploring before acting. Planning before implementing. Seeking approval before committing. Testing at every step. Documenting the journey.
</p>

<p style="color: #a78bfa; font-style: italic; font-size: 17px; text-align: center; margin: 24px 0 12px 0;">
  "Why, sometimes I've believed as many as six impossible things before breakfast."
</p>

<p style="color: #cbd5e1; font-size: 16px; font-weight: 600; text-align: center; margin: 0 0 24px 0;">
  That's the Good Maintainer in action.
</p>

<p style="color: #94a3b8; font-size: 14px; text-align: center; margin: 24px 0 0 0; font-style: italic;">
  — The End —
</p>

</div>
</details>

</div>

---

## Use Cases

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin: 48px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #10b981; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #6ee7b7; margin-top: 0; font-size: 22px; font-weight: 700;">✅ Alice Thrives On</h3>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #6ee7b7; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">Security Vulnerabilities</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">SQL injection, XSS, hardcoded secrets, path traversal—CodeQL finds them, Alice fixes them with OWASP patterns.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #6ee7b7; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">Legacy Code</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">1000-line functions, 18 cyclomatic complexity, technical debt from 2019—Alice brings incremental improvement.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #6ee7b7; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">Technical Debt</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">Strangler fig refactoring, complexity reduction, test coverage improvements—systematic quality upgrades.</p>
  </div>

  <div>
    <h4 style="color: #6ee7b7; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">CI/CD Integration</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">Automated on every PR, runs in GitHub Actions, integrates with existing workflows.</p>
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #ef4444; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #fca5a5; margin-top: 0; font-size: 22px; font-weight: 700;">❌ Alice Gets Confused By</h3>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #fca5a5; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">Greenfield Features</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">"Build a new dashboard from scratch"—Alice is a maintainer, not a product designer. Use Claude/Copilot for new features.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #fca5a5; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">Ambiguous Requirements</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">"Make it better"—Alice needs specific vulnerabilities or code smells. CodeQL provides this specificity.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="color: #fca5a5; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">Architectural Rewrites</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">"Migrate from REST to GraphQL"—too large scope. Alice works incrementally, function by function.</p>
  </div>

  <div>
    <h4 style="color: #fca5a5; font-size: 16px; margin: 0 0 8px 0; font-weight: 600;">Bikeshedding</h4>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">"Should we use tabs or spaces?"—Alice focuses on security and maintainability, not style debates.</p>
  </div>
</div>

</div>

---

## Six Impossible Things

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; border-left: 4px solid #a78bfa;">
  <p style="color: #a78bfa; font-size: 19px; font-style: italic; text-align: center; margin: 0;">
    "Why, sometimes I've believed as many as six impossible things before breakfast." — The Queen, Alice in Wonderland
  </p>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin: 48px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #8b5cf6; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #a78bfa; margin-top: 0; font-size: 20px; font-weight: 700;">1. Legacy Code Can Be Fixed</h3>
  <p style="color: #94a3b8; font-size: 14px; font-style: italic; line-height: 1.5; margin: 12px 0;">"This code is too old to touch safely"</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 12px 0;"><strong style="color: #a78bfa;">Alice's approach:</strong> Strangler fig pattern—wrap, test, replace incrementally.</p>
  <p style="color: #6EE7F9; font-size: 14px; margin: 0;"><strong>Result:</strong> 1000 lines → 200 lines, fully tested</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #06b6d4; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #67e8f9; margin-top: 0; font-size: 20px; font-weight: 700;">2. Technical Debt Can Be Paid Down</h3>
  <p style="color: #94a3b8; font-size: 14px; font-style: italic; line-height: 1.5; margin: 12px 0;">"We'll never get test coverage above 30%"</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 12px 0;"><strong style="color: #67e8f9;">Alice's approach:</strong> Add tests function by function, validate with every change.</p>
  <p style="color: #6EE7F9; font-size: 14px; margin: 0;"><strong>Result:</strong> 0% → 82% coverage in 12 weeks</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #10b981; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #6ee7b7; margin-top: 0; font-size: 20px; font-weight: 700;">3. Security Doesn't Slow You Down</h3>
  <p style="color: #94a3b8; font-size: 14px; font-style: italic; line-height: 1.5; margin: 12px 0;">"Security fixes take too long"</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 12px 0;"><strong style="color: #6ee7b7;">Alice's approach:</strong> Automated remediation with human approval, OWASP patterns pre-loaded.</p>
  <p style="color: #6EE7F9; font-size: 14px; margin: 0;"><strong>Result:</strong> Security PRs ready in 2 hours, not 2 weeks</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #f59e0b; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #fbbf24; margin-top: 0; font-size: 20px; font-weight: 700;">4. Chaos Can Become Order</h3>
  <p style="color: #94a3b8; font-size: 14px; font-style: italic; line-height: 1.5; margin: 12px 0;">"This codebase is spaghetti, no documentation"</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 12px 0;"><strong style="color: #fbbf24;">Alice's approach:</strong> Document as you fix, extract functions, reduce complexity systematically.</p>
  <p style="color: #6EE7F9; font-size: 14px; margin: 0;"><strong>Result:</strong> Complexity 18 → 9, with inline docs</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #ec4899; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #f9a8d4; margin-top: 0; font-size: 20px; font-weight: 700;">5. Zero Tests Can Become 80% Coverage</h3>
  <p style="color: #94a3b8; font-size: 14px; font-style: italic; line-height: 1.5; margin: 12px 0;">"This module has no tests, we can't add them now"</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 12px 0;"><strong style="color: #f9a8d4;">Alice's approach:</strong> Add characterization tests first, then security tests, then edge cases.</p>
  <p style="color: #6EE7F9; font-size: 14px; margin: 0;"><strong>Result:</strong> 0% → 83% coverage in 8 weeks</p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #6EE7F9; box-shadow: 0 4px 16px rgba(110, 231, 249, 0.3);">
  <h3 style="color: #6EE7F9; margin-top: 0; font-size: 20px; font-weight: 700;">6. "Impossible" Deadlines Can Be Met</h3>
  <p style="color: #94a3b8; font-size: 14px; font-style: italic; line-height: 1.5; margin: 12px 0;">"We need 47 security fixes by Friday"</p>
  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 12px 0;"><strong style="color: #6EE7F9;">Alice's approach:</strong> Automated analysis, batched fixes, systematic testing—parallel remediation.</p>
  <p style="color: #6EE7F9; font-size: 14px; margin: 0;"><strong>Result:</strong> 47 security PRs created in 1 day</p>
</div>

</div>

---

## Epilogue

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; border-left: 4px solid #6EE7F9;">
  <p style="color: #6EE7F9; font-size: 19px; font-style: italic; text-align: center; margin: 0 0 24px 0;">
    "Begin at the beginning," the King said, very gravely, "and go on till you come to the end: then stop."
  </p>
  <p style="color: #cbd5e1; font-size: 16px; line-height: 1.8; margin: 0; text-align: center;">
    In Wonderland, Alice learned that curiosity conquers chaos. In your codebase, Alice brings the same transformation: reading labels before drinking, questioning illogical patterns, maintaining identity through refactoring, documenting the journey for future travelers.
  </p>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin: 48px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #5eead4; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #5eead4; margin-top: 0; font-size: 20px; font-weight: 700;">Eight Principles in Action</h3>
  <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
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

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #6EE7F9; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <h3 style="color: #6EE7F9; margin-top: 0; font-size: 20px; font-weight: 700;">Results Speak</h3>
  <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
    <li>1000-line function → 200 lines</li>
    <li>Complexity 18 → 9</li>
    <li>Coverage 0% → 82%</li>
    <li>Security PRs in hours, not weeks</li>
    <li>Technical debt → Maintainable code</li>
    <li>Chaos → Order</li>
  </ul>
</div>

</div>

<div style="background: linear-gradient(135deg, #6EE7F9 0%, #22d3ee 100%); border-radius: 12px; padding: 32px; margin: 48px 0; text-align: center; box-shadow: 0 6px 24px rgba(110, 231, 249, 0.4);">
  <p style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0;">
    🐰 Ready to start? Comment <strong>@alice</strong> on your next CodeQL issue.
  </p>
</div>

<p style="text-align: center; font-size: 18px; font-weight: 600; margin: 32px 0;">That's the Good Maintainer in action.</p>
