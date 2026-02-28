# MaintainabilityAI Documentation

<div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(79, 70, 229, 0.4); border: 1px solid rgba(124, 58, 237, 0.3);">
  <div style="text-align: center;">
    <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
    <h2 style="margin: 0; font-size: 32px; color: #f1f5f9; font-weight: 800;">Complete Framework Documentation</h2>
    <div style="font-size: 16px; color: #ffffff; margin-top: 12px; max-width: 800px; margin-left: auto; margin-right: auto;">
      Security-first AI-assisted engineering. From OWASP prompt packs and threat modeling to governance tooling and evolutionary architecture.
    </div>
  </div>
</div>

## Start Here

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 32px 0;">
  <a href="./framework" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(100, 116, 139, 0.3); display: block;">
    <div style="font-size: 32px; margin-bottom: 12px;">🎯</div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #f1f5f9; font-weight: 700;">Framework Overview</h3>
    <p style="color: #cbd5e1; font-size: 14px; margin: 0; line-height: 1.6;">New here? See how OWASP, STRIDE, fitness functions, and the 6-phase SDLC work together</p>
  </a>

  <a href="./workshop/part1-spectrum" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(100, 116, 139, 0.3); display: block;">
    <div style="font-size: 32px; margin-bottom: 12px;">🎓</div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #f1f5f9; font-weight: 700;">Begin Workshop</h3>
    <p style="color: #cbd5e1; font-size: 14px; margin: 0; line-height: 1.6;">Hands-on? Start the 4-part series from The Spectrum to Fitness Functions</p>
  </a>

  <a href="./impossible-things" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border: 1px solid rgba(100, 116, 139, 0.3); display: block;">
    <div style="font-size: 32px; margin-bottom: 12px;">🎩</div>
    <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #f1f5f9; font-weight: 700;">Impossible Things</h3>
    <p style="color: #cbd5e1; font-size: 14px; margin: 0; line-height: 1.6;">Read the vision behind the framework and the art of the possible</p>
  </a>
</div>

---

## Prompt Pack Libraries

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

<div style="text-align: center; margin-bottom: 32px;">
  <h3 style="margin: 0 0 12px 0; font-size: 28px; color: #f1f5f9; font-weight: 800;">Production-Ready AI Prompts</h3>
  <p style="color: #94a3b8; font-size: 16px; margin: 0;">All prompt packs follow the proven <strong style="color: #c7d2fe;">RCTRO: Role → Context → Task → Requirements → Output</strong> pattern</p>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 32px;">

<a href="./prompts/owasp" style="text-decoration: none; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 12px; padding: 24px; display: block; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">🛡️</div>
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">OWASP Top 10 Security</div>
  <div style="color: #ffffff; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">10 comprehensive packs with before/after examples, attack vector tests, and remediation checklists</div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px;">
    <div style="color: #ffffff; font-size: 13px; line-height: 1.8;">
      ✓ 10 complete vulnerability categories<br/>
      ✓ Before/after code examples<br/>
      ✓ Attack vector test suites<br/>
      ✓ Human review checklists
    </div>
  </div>
</a>

<a href="./prompts/threat-modeling" style="text-decoration: none; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); border-radius: 12px; padding: 24px; display: block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">🎯</div>
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">STRIDE Threat Modeling</div>
  <div style="color: #ffffff; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">6 categories for AI-powered threat detection before code is written, with OWASP cross-references</div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px;">
    <div style="color: #ffffff; font-size: 13px; line-height: 1.8;">
      ✓ 6 STRIDE categories covered<br/>
      ✓ Auto-maps threats to OWASP<br/>
      ✓ Early detection before code<br/>
      ✓ Scenario-based analysis
    </div>
  </div>
</a>

<a href="./prompts/maintainability" style="text-decoration: none; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 12px; padding: 24px; display: block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
  <div style="font-size: 32px; margin-bottom: 12px;">📐</div>
  <div style="font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Evolutionary Architecture</div>
  <div style="color: #ffffff; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">Fitness functions and patterns for long-lived maintainable systems with AI-assisted refactoring</div>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px;">
    <div style="color: #ffffff; font-size: 13px; line-height: 1.8;">
      ✓ Fitness functions (complexity ≤10)<br/>
      ✓ Dependency hygiene (≤90 days)<br/>
      ✓ Strangler Fig migrations<br/>
      ✓ Technical debt tracking
    </div>
  </div>
</a>

</div>

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px;">
  <div style="color: #a5b4fc; font-size: 14px; line-height: 1.7;">
    <strong style="color: #c7d2fe;">Pro Tip:</strong> Clone the repository to use prompts with #file: references in Claude Code and Copilot
  </div>
</div>

</div>

---

## SDLC & Governance

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 32px 0;">

<a href="./sdlc/" style="text-decoration: none; display: block;">
<div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border-radius: 16px; padding: 28px; box-shadow: 0 4px 16px rgba(79, 70, 229, 0.3); height: 100%; box-sizing: border-box;">
  <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
  <h3 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff; font-weight: 800;">SDLC Framework</h3>
  <p style="color: #ffffff; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    Complete 6-phase lifecycle integrating security and maintainability from design through evolution
  </p>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px;">
    <div style="color: #ffffff; font-size: 13px; line-height: 1.8;">
      Phase 1: Design & Threat Modeling<br/>
      Phase 2: Secure Implementation<br/>
      Phase 3: Verification & Testing<br/>
      Phase 4: Governance & Review<br/>
      Phase 5: CI/CD Deployment<br/>
      Phase 6: Evolution & Metrics
    </div>
  </div>
</div>
</a>

<a href="./governance/vibe-golden-rules" style="text-decoration: none; display: block;">
<div style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); border-radius: 16px; padding: 28px; box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3); height: 100%; box-sizing: border-box;">
  <div style="font-size: 32px; margin-bottom: 12px;">⚖️</div>
  <h3 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff; font-weight: 800;">Governance Golden Rules</h3>
  <p style="color: #ffffff; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    6 Golden Rules for AI-assisted development with human oversight and responsible AI usage
  </p>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px;">
    <div style="color: #ffffff; font-size: 13px; line-height: 1.8;">
      ✓ Be specific with AI prompts<br/>
      ✓ Trust but verify<br/>
      ✓ Treat AI like a junior dev<br/>
      ✓ Isolate AI changes<br/>
      ✓ Document rationale<br/>
      ✓ Share winning prompts
    </div>
  </div>
</div>
</a>

<a href="./framework" style="text-decoration: none; display: block;">
<div style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 16px; padding: 28px; box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3); height: 100%; box-sizing: border-box;">
  <div style="font-size: 32px; margin-bottom: 12px;">🔗</div>
  <h3 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff; font-weight: 800;">Framework Integration</h3>
  <p style="color: #ffffff; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    How SDLC, OWASP, STRIDE, and maintainability patterns work together across the entire lifecycle
  </p>
  <div style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 12px;">
    <div style="color: #ffffff; font-size: 13px; line-height: 1.8;">
      ✓ 6-layer security pipeline<br/>
      ✓ Multi-agent orchestration<br/>
      ✓ Expandable Six Layers<br/>
      ✓ Complete workflow guide
    </div>
  </div>
</div>
</a>

</div>

---

## AI Agent Guides

<div style="font-size: 14px; color: #94a3b8; margin-bottom: 24px;">Choose the right AI tool for the job. MaintainabilityAI supports two modes of AI assistance.</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <span style="display: inline-block; background: rgba(59, 130, 246, 0.2); color: #93c5fd; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">In-Editor</span>
    <span style="color: #64748b; font-size: 13px;">Human-in-the-loop, IDE-integrated</span>
  </div>
  <div style="display: grid; gap: 16px;">
    <a href="./agents/claude" style="text-decoration: none; display: flex; align-items: center; gap: 14px; background: rgba(99, 102, 241, 0.1); border-radius: 10px; padding: 16px; border: 1px solid rgba(99, 102, 241, 0.2);">
      <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; color: white; flex-shrink: 0;">C</div>
      <div>
        <div style="font-size: 16px; font-weight: 700; color: #f1f5f9;">Claude Code</div>
        <div style="font-size: 13px; color: #94a3b8;">Multi-file refactoring, test generation, security review</div>
      </div>
    </a>
    <a href="./agents/copilot" style="text-decoration: none; display: flex; align-items: center; gap: 14px; background: rgba(16, 185, 129, 0.1); border-radius: 10px; padding: 16px; border: 1px solid rgba(16, 185, 129, 0.2);">
      <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; flex-shrink: 0;">⚡</div>
      <div>
        <div style="font-size: 16px; font-weight: 700; color: #f1f5f9;">GitHub Copilot</div>
        <div style="font-size: 13px; color: #94a3b8;">In-editor completions, pattern following, quick fixes</div>
      </div>
    </a>
  </div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <span style="display: inline-block; background: rgba(168, 85, 247, 0.2); color: #d8b4fe; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">Agentic</span>
    <span style="color: #64748b; font-size: 13px;">Autonomous, GitHub-native, governance-enforced</span>
  </div>
  <div style="display: grid; gap: 16px;">
    <a href="./agents/claude-code-action" style="text-decoration: none; display: flex; align-items: center; gap: 14px; background: rgba(168, 85, 247, 0.1); border-radius: 10px; padding: 16px; border: 1px solid rgba(168, 85, 247, 0.2);">
      <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; color: white; flex-shrink: 0;">C</div>
      <div>
        <div style="font-size: 16px; font-weight: 700; color: #f1f5f9;">Claude Code Action</div>
        <div style="font-size: 13px; color: #94a3b8;">Autonomous PR agent via GitHub Actions</div>
      </div>
    </a>
    <a href="./agents/copilot-coding-agent" style="text-decoration: none; display: flex; align-items: center; gap: 14px; background: rgba(168, 85, 247, 0.1); border-radius: 10px; padding: 16px; border: 1px solid rgba(168, 85, 247, 0.2);">
      <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; flex-shrink: 0;">⚡</div>
      <div>
        <div style="font-size: 16px; font-weight: 700; color: #f1f5f9;">Copilot Coding Agent</div>
        <div style="font-size: 13px; color: #94a3b8;">GitHub-native autonomous coding via Issues/PRs</div>
      </div>
    </a>
  </div>
</div>

</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 0 0 32px 0;">

<a href="./agents/multi-agent" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(100, 116, 139, 0.3); display: flex; align-items: center; gap: 14px;">
  <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; flex-shrink: 0;">🔀</div>
  <div>
    <div style="font-size: 16px; font-weight: 700; color: #f1f5f9;">Multi-Agent Orchestration</div>
    <div style="font-size: 13px; color: #94a3b8;">Coordinating multiple AI agents for complex workflows</div>
  </div>
</a>

</div>

<div style="text-align: center;">
  <a href="./agents/" style="color: #818cf8; text-decoration: none; font-size: 14px; font-weight: 600;">View Full Agent Comparison & Selection Guide →</a>
</div>

---

## Workshop

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <div style="color: #a5b4fc; font-size: 14px;">
    Hands-on training for teams learning security-first AI development. 4-part series designed for junior → senior developers.
  </div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 32px 0;">
  <a href="./workshop/part1-spectrum" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6; display: block;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #f1f5f9;">1</div>
      <h4 style="margin: 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">The Spectrum</h4>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">Understanding AI development modes: Vibe → AI-Assisted → Agentic</p>
    <div style="color: #60a5fa; font-size: 12px; margin-top: 8px;">45 minutes</div>
  </a>

  <a href="./workshop/part2-security-prompting" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #f59e0b; display: block;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #f1f5f9;">2</div>
      <h4 style="margin: 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Security-First Prompting</h4>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">OWASP integration and prompt engineering techniques</p>
    <div style="color: #fbbf24; font-size: 12px; margin-top: 8px;">60 minutes</div>
  </a>

  <a href="./workshop/part3-live-remediation" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #ef4444; display: block;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #f1f5f9;">3</div>
      <h4 style="margin: 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Live Remediation</h4>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">Hands-on: Fix A03 SQL Injection vulnerability step-by-step</p>
    <div style="color: #f87171; font-size: 12px; margin-top: 8px;">90 minutes</div>
  </a>

  <a href="./workshop/part4-fitness-functions" style="text-decoration: none; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #a855f7; display: block;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #f1f5f9;">4</div>
      <h4 style="margin: 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Fitness Functions</h4>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.6;">Implementing automated quality gates in CI/CD</p>
    <div style="color: #c084fc; font-size: 12px; margin-top: 8px;">75 minutes</div>
  </a>
</div>

<div style="text-align: center;">
  <a href="./workshop/" style="color: #818cf8; text-decoration: none; font-size: 14px; font-weight: 600;">View Complete Workshop Overview →</a>
</div>

---

## Getting Help

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 32px 0;">
  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 28px; margin-bottom: 8px;">💬</div>
    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">GitHub Issues</h4>
    <a href="https://github.com/AliceNN-ucdenver/MaintainabilityAI/issues" style="color: #818cf8; text-decoration: none; font-size: 14px;">Report bugs or request features</a>
  </div>

  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 28px; margin-bottom: 8px;">🏛️</div>
    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Contact Chief Archeologist</h4>
    <a href="https://chiefarcheologist.com/contact" style="color: #818cf8; text-decoration: none; font-size: 14px;">Team training and consulting</a>
  </div>

  <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(100, 116, 139, 0.3);">
    <div style="font-size: 28px; margin-bottom: 8px;">📖</div>
    <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #f1f5f9; font-weight: 700;">Documentation</h4>
    <div style="color: #94a3b8; font-size: 14px;">You're reading it! Explore above.</div>
  </div>
</div>

---

<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 32px; margin: 32px 0; text-align: center; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);">
  <div style="font-size: 40px; margin-bottom: 16px;">🚀</div>
  <h2 style="margin: 0 0 12px 0; font-size: 28px; color: #f1f5f9; font-weight: 800;">Ready to Get Started?</h2>
  <p style="color: #d1fae5; font-size: 16px; margin: 0 0 24px 0; max-width: 600px; margin-left: auto; margin-right: auto;">
    Read the vision, get hands-on with the workshop, or contact us to bring this training to your team
  </p>
  <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
    <a href="./impossible-things" style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #f1f5f9; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; border: 2px solid rgba(255, 255, 255, 0.3);">
      Impossible Things →
    </a>
    <a href="./workshop/part1-spectrum" style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #f1f5f9; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; border: 2px solid rgba(255, 255, 255, 0.3);">
      Begin Workshop →
    </a>
    <a href="https://chiefarcheologist.com/contact" style="display: inline-block; background: rgba(255, 255, 255, 0.95); color: #059669; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700;">
      Contact Chief Archeologist
    </a>
  </div>
</div>
