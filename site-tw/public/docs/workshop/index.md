# Workshop: Agentic Engineering, Secure by Design

<div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(79, 70, 229, 0.4); border: 1px solid rgba(124, 58, 237, 0.3);">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="font-size: 56px; margin-bottom: 16px;">🎓</div>
    <h2 style="margin: 0; font-size: 32px; color: #f1f5f9; font-weight: 800;">Agentic Engineering, Secure by Design</h2>
    <div style="font-size: 16px; color: #e9d5ff; margin-top: 12px;">A hands-on workshop series for security-first AI-assisted development</div>
  </div>
  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; margin-top: 24px;">
    <div style="color: #e9d5ff; font-size: 15px; line-height: 1.8;">
      Learn how to build secure, maintainable software using AI agents, OWASP security patterns, and evolutionary architecture principles. This workshop combines hands-on exercises with real-world security scenarios to transform your development practice.
    </div>
  </div>
</div>

---

## Workshop Overview

This comprehensive workshop guides teams through the transition from traditional development to AI-assisted, security-first engineering. Each part builds on the previous, creating a complete framework for modern software development.

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <div style="color: #a5b4fc; font-size: 14px; line-height: 1.8;">
    💡 <strong style="color: #c7d2fe;">Workshop Format:</strong> Each part includes theory, hands-on exercises, and real-world examples. Estimated time: 6-8 hours total (can be split across multiple sessions).
  </div>
</div>

---

## Workshop Parts

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 32px 0;">

  <!-- Part 1 -->
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3); transition: transform 0.2s;">
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #f1f5f9;">1</div>
      <div>
        <h3 style="margin: 0; font-size: 20px; color: #f1f5f9; font-weight: 700;">The Spectrum</h3>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">45 minutes</div>
      </div>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
      Understand the evolution from Vibe Coding → AI-Assisted → Agentic development. Learn about the "70% problem" and why security-first prompting matters.
    </p>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">WHAT YOU'LL LEARN:</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
        • Vibe Coding: When speed matters more than rigor<br/>
        • AI-Assisted Engineering: Production-ready with human oversight<br/>
        • Agentic Coding: Autonomous task execution for well-defined problems<br/>
        • The 70% problem: Why AI struggles with the final 30%
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">HANDS-ON:</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
        Compare the same feature built three ways (vibe, assisted, agentic) and measure velocity vs. quality.
      </div>
    </div>
    <a href="/docs/workshop/part1-spectrum" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #f1f5f9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 12px;">
      Start Part 1 →
    </a>
  </div>

  <!-- Part 2 -->
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #f1f5f9;">2</div>
      <div>
        <h3 style="margin: 0; font-size: 20px; color: #f1f5f9; font-weight: 700;">Security-First Prompting</h3>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">60 minutes</div>
      </div>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
      Master the RCTRO prompt pattern: Role → Context → Task → Requirements → Output. Learn to craft prompts that generate secure code on the first try.
    </p>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">WHAT YOU'LL LEARN:</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
        • Prompt Anatomy: Role + Context + Task + Requirements + Output (RCTRO)<br/>
        • The OWASP Top 10 (2021) mapped to prompt patterns<br/>
        • Tool-specific variations: Claude Code, GitHub Copilot, ChatGPT
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">HANDS-ON:</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
        Build a file upload feature using A03 Injection + A05 Misconfiguration prompt packs. Compare "vague prompt" vs. "security-first prompt" outputs.
      </div>
    </div>
    <a href="/docs/workshop/part2-security-prompting" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #f1f5f9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 12px;">
      Start Part 2 →
    </a>
  </div>

  <!-- Part 3 -->
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 12px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #f1f5f9;">3</div>
      <div>
        <h3 style="margin: 0; font-size: 20px; color: #f1f5f9; font-weight: 700;">Live Remediation</h3>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">90 minutes</div>
      </div>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
      Step-by-step SQL injection remediation using real vulnerable code. Learn the complete workflow: identify → prompt → refactor → test → verify → commit.
    </p>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">WHAT YOU'LL LEARN:</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
        • Vulnerability analysis: Read insecure code, identify attack vectors<br/>
        • AI-assisted refactor: Use Copilot/Claude with security constraints<br/>
        • Validation: Parameterized queries, Zod schemas, generic errors<br/>
        • Testing: Jest tests with SQL injection payloads
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">HANDS-ON:</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
        Fix <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #e0e7ff;">examples/owasp/A03_injection/insecure.ts</code> using the A03 prompt pack. Make all tests pass. Submit a PR with AI disclosure.
      </div>
    </div>
    <a href="/docs/workshop/part3-live-remediation" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #f1f5f9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 12px;">
      Start Part 3 →
    </a>
  </div>

  <!-- Part 4 -->
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
      <div style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); border-radius: 12px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #f1f5f9;">4</div>
      <div>
        <h3 style="margin: 0; font-size: 20px; color: #f1f5f9; font-weight: 700;">Fitness Functions</h3>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">75 minutes</div>
      </div>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
      Implement Evolutionary Architecture fitness functions to prevent technical debt. Automate complexity checks, dependency freshness, coverage enforcement, and performance regression detection.
    </p>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">WHAT YOU'LL LEARN:</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
        • Complexity enforcement: Cyclomatic complexity ≤10 with ts-morph<br/>
        • Dependency hygiene: 3-month freshness rule<br/>
        • Coverage gates: Prevent regressions, enforce ≥80% threshold<br/>
        • Performance baselines: Track p95 latency, fail on regression
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">HANDS-ON:</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8;">
        Create 4 fitness functions (complexity, dependency age, coverage, performance). Wire them into CI to block PRs on violations.
      </div>
    </div>
    <a href="/docs/workshop/part4-fitness-functions" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); color: #f1f5f9; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 12px;">
      Start Part 4 →
    </a>
  </div>

  <!-- Part 5 - Coming Soon -->
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3); opacity: 0.75;">
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
      <div style="background: rgba(100, 116, 139, 0.3); border-radius: 12px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #94a3b8;">5</div>
      <div>
        <h3 style="margin: 0; font-size: 20px; color: #cbd5e1; font-weight: 700;">CodeQL + Snyk</h3>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">90 minutes</div>
      </div>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
      Master both CodeQL (SAST) and Snyk (SCA + SAST) for comprehensive security scanning. Learn to interpret findings, write custom queries, and integrate autofix guidance with AI tools.
    </p>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">WHAT YOU'LL LEARN:</div>
      <div style="color: #94a3b8; font-size: 13px; line-height: 1.8;">
        • CodeQL setup: GitHub Actions, security-extended queries, SARIF output<br/>
        • Custom CodeQL queries: Detect hardcoded secrets, eval usage<br/>
        • Snyk: Dependency vulnerability scanning + SAST for TypeScript<br/>
        • AI-assisted triage: Use ChatGPT to analyze and prioritize findings
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">HANDS-ON:</div>
      <div style="color: #94a3b8; font-size: 13px; line-height: 1.8;">
        Run CodeQL on OWASP examples, write a custom query for hardcoded API keys, configure Snyk policies, and create a PR that both scanners validate.
      </div>
    </div>
    <div style="display: inline-block; background: rgba(100, 116, 139, 0.2); color: #64748b; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 12px; cursor: default;">
      Coming Soon
    </div>
  </div>

  <!-- Part 6 - Coming Soon -->
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3); opacity: 0.75;">
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
      <div style="background: rgba(100, 116, 139, 0.3); border-radius: 12px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #94a3b8;">6</div>
      <div>
        <h3 style="margin: 0; font-size: 20px; color: #cbd5e1; font-weight: 700;">Team Prompt Library</h3>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">90 minutes</div>
      </div>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
      Create hybrid prompts combining security + maintainability requirements for production-grade outcomes. Build a shared, versioned prompt library for your team.
    </p>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">WHAT YOU'LL LEARN:</div>
      <div style="color: #94a3b8; font-size: 13px; line-height: 1.8;">
        • Hybrid prompts: Merge OWASP A03 + Fitness Functions (complexity ≤10)<br/>
        • Version control: Track prompt iterations and success rates<br/>
        • Customization: Adapt to your stack (Go, Python, Java)<br/>
        • Metrics: Measure effectiveness (acceptance rate, time to green)
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">HANDS-ON:</div>
      <div style="color: #94a3b8; font-size: 13px; line-height: 1.8;">
        Create a team prompt for "API endpoint with auth + validation + logging + maintainability." Combine OWASP A01 + A07 + A09 + Fitness Functions. Test with 3 developers, iterate on feedback.
      </div>
    </div>
    <div style="display: inline-block; background: rgba(100, 116, 139, 0.2); color: #64748b; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 12px; cursor: default;">
      Coming Soon
    </div>
  </div>

  <!-- Part 7 - Coming Soon -->
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3); opacity: 0.75;">
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
      <div style="background: rgba(100, 116, 139, 0.3); border-radius: 12px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #94a3b8;">7</div>
      <div>
        <h3 style="margin: 0; font-size: 20px; color: #cbd5e1; font-weight: 700;">Multi-Agent Orchestration</h3>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">90 minutes</div>
      </div>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
      Coordinate multiple AI agents for complex security workflows. Learn the Threat Modeler → Implementer → Validator pattern and consensus validation.
    </p>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">WHAT YOU'LL LEARN:</div>
      <div style="color: #94a3b8; font-size: 13px; line-height: 1.8;">
        • Agent selection: ChatGPT for design, Copilot for impl, Claude for validation<br/>
        • Sequential pattern: Threat model → Implementation → Security review<br/>
        • Parallel pattern: Multiple agents implement same spec, diff outputs<br/>
        • Consensus pattern: 3 agents validate, require 2/3 agreement
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">HANDS-ON:</div>
      <div style="color: #94a3b8; font-size: 13px; line-height: 1.8;">
        Build a password reset flow using multi-agent orchestration: ChatGPT threat models → Copilot implements → Claude + ChatGPT validate independently (consensus).
      </div>
    </div>
    <div style="display: inline-block; background: rgba(100, 116, 139, 0.2); color: #64748b; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 12px; cursor: default;">
      Coming Soon
    </div>
  </div>

  <!-- Part 8 - Coming Soon -->
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3); opacity: 0.75;">
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
      <div style="background: rgba(100, 116, 139, 0.3); border-radius: 12px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #94a3b8;">8</div>
      <div>
        <h3 style="margin: 0; font-size: 20px; color: #cbd5e1; font-weight: 700;">Governance & Golden Rules</h3>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">90 minutes</div>
      </div>
    </div>
    <p style="color: #94a3b8; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
      Implement the Golden Rules framework for responsible AI-assisted development. Learn pre-deploy checklists, metrics dashboards, and how to ship with confidence.
    </p>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">WHAT YOU'LL LEARN:</div>
      <div style="color: #94a3b8; font-size: 13px; line-height: 1.8;">
        • The 6 Golden Rules: Be specific, trust but verify, treat AI as junior dev, isolate changes, document rationale, share prompts<br/>
        • PR template: AI disclosure, security checklist, OWASP validation<br/>
        • Metrics dashboard: Track AI acceptance rate, security findings, velocity<br/>
        • Continuous improvement: Quarterly prompt library review
      </div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">HANDS-ON:</div>
      <div style="color: #94a3b8; font-size: 13px; line-height: 1.8;">
        Conduct a mock PR review of AI-generated code. Validate Golden Rules compliance, run ChatGPT OWASP checklist. Each team presents their prompt library, metrics, and governance model.
      </div>
    </div>
    <div style="display: inline-block; background: rgba(100, 116, 139, 0.2); color: #64748b; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 12px; cursor: default;">
      Coming Soon
    </div>
  </div>

</div>

---

## What You'll Learn

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin: 32px 0;">

  <div style="background: rgba(79, 70, 229, 0.1); border-radius: 12px; padding: 24px; border: 1px solid rgba(99, 102, 241, 0.3);">
    <div style="font-size: 32px; margin-bottom: 12px;">🛡️</div>
    <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #f1f5f9;">Security-First Development</h3>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">
      Integrate OWASP Top 10 security patterns directly into your AI prompts. Build secure code from the start, not as an afterthought.
    </p>
  </div>

  <div style="background: rgba(245, 158, 11, 0.1); border-radius: 12px; padding: 24px; border: 1px solid rgba(251, 191, 36, 0.3);">
    <div style="font-size: 32px; margin-bottom: 12px;">🤖</div>
    <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #f1f5f9;">AI-Assisted Workflows</h3>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">
      Master Claude Code, GitHub Copilot, and ChatGPT for different development tasks. Learn when to use each tool and how to combine them.
    </p>
  </div>

  <div style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 24px; border: 1px solid rgba(248, 113, 113, 0.3);">
    <div style="font-size: 32px; margin-bottom: 12px;">⚡</div>
    <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #f1f5f9;">Automated Quality Gates</h3>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">
      Implement fitness functions that automatically enforce architecture standards. CodeQL, Snyk, ESLint, and custom metrics work together.
    </p>
  </div>

  <div style="background: rgba(168, 85, 247, 0.1); border-radius: 12px; padding: 24px; border: 1px solid rgba(192, 132, 252, 0.3);">
    <div style="font-size: 32px; margin-bottom: 12px;">📐</div>
    <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #f1f5f9;">Evolutionary Architecture</h3>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0;">
      Build systems that can evolve safely. Use fitness functions to guide refactoring and prevent architectural decay over time.
    </p>
  </div>

</div>

---

## Prerequisites

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 32px 0; border: 1px solid rgba(100, 116, 139, 0.3);">
  <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #f1f5f9;">Before You Start</h3>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
    <div>
      <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Required Knowledge</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
        ✓ JavaScript/TypeScript basics<br/>
        ✓ Git version control<br/>
        ✓ Basic security awareness<br/>
        ✓ Command line familiarity
      </div>
    </div>
    <div>
      <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Required Tools</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
        ✓ VS Code or similar IDE<br/>
        ✓ Node.js 18+ installed<br/>
        ✓ Git installed<br/>
        ✓ AI tool access (Claude/Copilot/ChatGPT)
      </div>
    </div>
    <div>
      <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Optional Setup</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
        ✓ GitHub account (for Copilot)<br/>
        ✓ Claude Code extension<br/>
        ✓ PostgreSQL (for Part 3)<br/>
        ✓ Docker (for testing)
      </div>
    </div>
  </div>
</div>

---

## Workshop Resources

- **Repository**: [github.com/AliceNN-ucdenver/MaintainabilityAI](https://github.com/AliceNN-ucdenver/MaintainabilityAI)
- **OWASP Prompt Packs**: [Browse all 10 categories](../prompts/owasp/)
- **Maintainability Patterns**: [Architecture prompts](../prompts/maintainability/)
- **Golden Rules**: [Governance framework](../governance/vibe-golden-rules)
- **SDLC Guide**: [Complete 6-phase framework](../sdlc/)

---

## Ready to Begin?

<div style="text-align: center; margin: 48px 0;">
  <a href="/docs/workshop/part1-spectrum" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #f1f5f9; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-size: 18px; font-weight: 700; box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);">
    🚀 Start Workshop Part 1 →
  </a>
  <div style="color: #94a3b8; font-size: 14px; margin-top: 16px;">
    Estimated time: 45 minutes
  </div>
</div>

---

**Questions or feedback?** Open an issue on [GitHub](https://github.com/AliceNN-ucdenver/MaintainabilityAI/issues) or join the discussion.
