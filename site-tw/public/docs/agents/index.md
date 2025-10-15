# AI Agent Guides

Tool-specific guidance for using the MaintainabilityAI framework with different AI assistants. Each guide provides platform-specific patterns, best practices, and integration strategies for security-first development.

---

## Available Agents

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 32px 0;">

<!-- Claude Card -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid #334155; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, border-color 0.3s ease;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: white; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">C</div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/claude" style="color: #f1f5f9; text-decoration: none;">Claude</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">Complex Refactoring Expert</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Deep codebase understanding for multi-file refactoring, comprehensive test generation, and evolutionary architecture guidance.</p>
  <div style="margin-bottom: 16px;">
    <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
    <p style="color: #e2e8f0; font-size: 14px; margin: 0;">Large-scale security refactoring • Architecture fitness functions • Technical debt analysis</p>
  </div>
  <a href="/docs/agents/claude" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: transform 0.2s ease; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);">View Guide →</a>
</div>

<!-- Copilot Card -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid #334155; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, border-color 0.3s ease;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">⚡</div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/copilot" style="color: #f1f5f9; text-decoration: none;">GitHub Copilot</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">In-Editor Code Generation</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">IDE-integrated real-time security-aware code completion with #codebase context understanding for fast iteration.</p>
  <div style="margin-bottom: 16px;">
    <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
    <p style="color: #e2e8f0; font-size: 14px; margin: 0;">In-editor secure code generation • Following patterns • Quick fixes • Single-function implementation</p>
  </div>
  <a href="/docs/agents/copilot" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: transform 0.2s ease; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">View Guide →</a>
</div>

<!-- ChatGPT Card -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid #334155; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, border-color 0.3s ease;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: white; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);">💬</div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/chatgpt" style="color: #f1f5f9; text-decoration: none;">ChatGPT</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">Threat Modeling & Analysis</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Structured security analysis with STRIDE and OWASP methodologies, long-form explanations, and Canvas mode for iterative hardening.</p>
  <div style="margin-bottom: 16px;">
    <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
    <p style="color: #e2e8f0; font-size: 14px; margin: 0;">Security threat modeling • OWASP compliance reviews • Architecture design • Documentation</p>
  </div>
  <a href="/docs/agents/chatgpt" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: transform 0.2s ease; box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);">View Guide →</a>
</div>

<!-- Alice Card -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid #6EE7F9; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 0 20px rgba(110, 231, 249, 0.2); transition: transform 0.3s ease, border-color 0.3s ease;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; border: 3px solid #6EE7F9; box-shadow: 0 4px 12px rgba(110, 231, 249, 0.4);">
      <img src="/images/alice-bot.png" alt="Alice Bot" style="width: 100%; height: 100%; object-fit: cover;" />
    </div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/alice" style="color: #f1f5f9; text-decoration: none;">Alice Agent 🐰</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #6EE7F9; font-weight: 600;">The Good Maintainer</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 12px; font-style: italic;">"Why, sometimes I've believed as many as six impossible things before breakfast."</p>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Autonomous security remediation agent with two-phase workflow (Curiosity → Approval → Implementation). Believes in fixing "impossible" code.</p>
  <div style="margin-bottom: 16px;">
    <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">The Eight Principles</p>
    <div style="color: #e2e8f0; font-size: 13px; line-height: 1.8;">
      📖 Read docs • 🧪 Test cautiously • 🤔 Question assumptions • 🎯 Maintain identity<br/>
      📝 Document journey • 🌟 Believe impossible • 🎪 Manage chaos • 🔍 Stay curious
    </div>
  </div>
  <div style="margin-bottom: 16px;">
    <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
    <p style="color: #e2e8f0; font-size: 14px; margin: 0;">CodeQL remediation • Legacy code refactoring • Technical debt reduction • CI/CD security automation</p>
  </div>
  <div style="background: rgba(110, 231, 249, 0.1); border-left: 3px solid #6EE7F9; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
    <p style="color: #6EE7F9; font-weight: 600; font-size: 12px; margin: 0 0 4px 0;">🤖 AGENTIC AI PROOF OF CONCEPT</p>
    <p style="color: #cbd5e1; font-size: 13px; margin: 0;">Autonomous agent with human-in-the-loop governance via two-phase workflow</p>
  </div>
  <a href="/docs/agents/alice" style="display: inline-block; background: linear-gradient(135deg, #6EE7F9 0%, #22d3ee 100%); color: #0f172a; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; transition: transform 0.2s ease; box-shadow: 0 2px 8px rgba(110, 231, 249, 0.4);">Enter Wonderland →</a>
</div>

<!-- Multi-Agent Card -->
<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; border: 2px solid #334155; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease, border-color 0.3s ease;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: white; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">🔄</div>
    <div>
      <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #f1f5f9;"><a href="/docs/agents/multi-agent" style="color: #f1f5f9; text-decoration: none;">Multi-Agent</a></h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500;">Orchestration Patterns</p>
    </div>
  </div>
  <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">Complex workflows requiring specialized expertise through sequential pipelines, parallel execution, and consensus validation.</p>
  <div style="margin-bottom: 16px;">
    <p style="color: #6EE7F9; font-weight: 600; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Best For</p>
    <p style="color: #e2e8f0; font-size: 14px; margin: 0;">Complex features • Parallel development • Validation loops • Consensus-based approvals</p>
  </div>
  <a href="/docs/agents/multi-agent" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: transform 0.2s ease; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);">View Guide →</a>
</div>

</div>

---

## Choosing the Right Agent

**Patterns**:
- **Sequential Pipeline**: Threat Model → Design → Implement → Test → Review
- **Parallel Execution**: Multiple agents working on independent modules
- **Validator Loop**: One agent generates, another validates
- **Consensus Validation**: Multiple agents review and approve

**Key Workflow**: Threat Modeler (ChatGPT) → Architect (Claude) → Implementer (Copilot) → Validator (Claude) → Reviewer (ChatGPT)

**Quick Start**: [Multi-Agent Guide](/docs/agents/multi-agent)

---

## Choosing the Right Agent

### By Development Phase

| SDLC Phase | Primary Agent | Supporting Agents | Output |
|------------|---------------|-------------------|--------|
| **Design** | ChatGPT (Threat Modeling) | Claude (Architecture) | Threat model + design docs |
| **Implementation** | Copilot (Code Gen) | Claude (Refactoring), Alice (Remediation) | Secure implementation |
| **Verification** | Claude (Test Gen) | CodeQL, Snyk, Alice (Auto-fix) | Test suite + scan results |
| **Governance** | ChatGPT (Review) | Human | Approval decision |
| **Deployment** | GitHub Actions | Alice (CI/CD Remediation) | Production deployment |
| **Evolution** | Claude (Refactor) | ChatGPT (Analysis), Alice (Debt Reduction) | Technical debt reduction |

### By Task Type

| Task | Best Agent | Why |
|------|------------|-----|
| Threat modeling | ChatGPT | Structured analysis, STRIDE methodology |
| Multi-file refactoring | Claude | Deep codebase understanding, maintains consistency |
| Single function | Copilot | Fast, in-editor, real-time |
| Test generation | Claude | Comprehensive coverage, attack vectors |
| Architecture review | ChatGPT | Long-form analysis, explanations |
| Quick fixes | Copilot | IDE-integrated, pattern-aware |
| Documentation | ChatGPT | Detailed explanations, tutorials |
| Code review | Claude | Security-focused, detailed analysis |
| Dependency upgrades | Claude | Breaking change analysis, migration planning |
| **CodeQL remediation** | **Alice** | **Autonomous two-phase workflow, human approval gate** |
| **Legacy code refactoring** | **Alice** | **Incremental strangler fig, believes impossible things** |
| **Technical debt reduction** | **Alice** | **Systematic, documented, test-driven** |
| **CI/CD security fixes** | **Alice** | **Automated, hash-verified, governed** |

### By Complexity

**Low Complexity** (single file, clear requirements):
- **First Choice**: Copilot (in-editor, fast)
- **Alternative**: Claude (more thorough)

**Medium Complexity** (2-3 files, security constraints):
- **First Choice**: Claude (multi-file coordination)
- **Alternative**: ChatGPT + Copilot (design then implement)

**High Complexity** (5+ files, architectural changes):
- **Recommended**: Multi-agent workflow
  1. ChatGPT: Threat model and architecture
  2. Claude: Implementation and testing
  3. ChatGPT: Final security review

---

## Universal Best Practices

### 1. Always Reference OWASP Prompt Packs

```markdown
Reference the A01 Broken Access Control prompt pack at /docs/prompts/owasp/A01_broken_access_control

Apply this to my code:
[your specific context]
```

**All agents** benefit from explicit security requirements.

### 2. Provide Complete Context

```markdown
Context:
- Tech stack: Node 18 + TypeScript + Express + PostgreSQL
- OWASP categories: A01, A03, A07
- Constraints: Complexity ≤10, Coverage ≥80%
- Files: [list]

Task: [specific task]
```

### 3. Request Tests Alongside Implementation

```markdown
Generate:
1. Secure implementation
2. Comprehensive tests (positive + attack vectors)
3. Fitness function checks
```

### 4. Verify with Automated Tools

After AI generation:
- Run ESLint security rules
- Execute Jest tests (including attack vectors)
- Run CodeQL or Snyk scan
- Check complexity with fitness functions

### 5. Document AI Decisions

```typescript
/**
 * SECURITY: OWASP A03 - Injection Prevention
 * Uses parameterized queries to prevent SQL injection
 * AI-assisted implementation with Claude
 */
```

---

## Integration with Framework

### Prompt Pack Structure

All agents work with the same prompt pack format:

```markdown
Role: [Security Engineer, Architect, etc.]

Context:
- Tech stack: [specific versions]
- Security level: [Production/Development]
- Compliance: [OWASP, PCI-DSS, etc.]

Requirements:
- [Specific security controls]
- [Maintainability constraints]

Task:
- [Explicit implementation steps]

Checklist:
- ☐ [Verification item 1]
- ☐ [Verification item 2]

Success Criteria:
- [How to verify it works]
```

### SDLC Integration

Each agent integrates at specific SDLC phases:

1. **Phase 1 - Design**: ChatGPT for threat modeling
2. **Phase 2 - Implementation**: Copilot/Claude for secure coding
3. **Phase 3 - Verification**: Claude for test generation
4. **Phase 4 - Governance**: ChatGPT for compliance review
5. **Phase 5 - Deployment**: Automated tools (CodeQL, Snyk)
6. **Phase 6 - Evolution**: Claude for refactoring, ChatGPT for analysis

See [SDLC Framework](/docs/sdlc/) for details.

---

## Measuring Agent Effectiveness

### Quality Metrics
- **Security Scan Pass Rate**: % passing CodeQL/Snyk first try
- **Test Coverage**: % coverage on AI-generated code (target ≥80%)
- **OWASP Compliance**: % of checklist items addressed without re-prompting
- **Complexity Adherence**: % of functions meeting ≤10 complexity threshold

### Efficiency Metrics
- **Time to Implementation**: AI-assisted vs. manual
- **Iterations Required**: Prompts needed for secure implementation
- **Context Switches**: Reduced documentation lookups

### Team Metrics
- **Prompt Reuse Rate**: Frequency of shared prompts
- **Agent Adoption**: % of team using each agent
- **Security Knowledge Transfer**: Developer OWASP understanding improvement

---

## Quick Reference: When to Use Each Agent

### Use ChatGPT when you need:
- ✅ Threat modeling with STRIDE methodology
- ✅ Security architecture reviews
- ✅ Long-form documentation
- ✅ Educational explanations of security concepts
- ✅ Multi-turn iterative refinement

### Use Claude when you need:
- ✅ Large-scale refactoring (5+ files)
- ✅ Comprehensive test generation with attack vectors
- ✅ Technical debt analysis
- ✅ Complex security code reviews
- ✅ Evolutionary architecture implementation

### Use Copilot when you need:
- ✅ In-editor secure code completion
- ✅ Fast single-function implementation
- ✅ Following established patterns
- ✅ Quick security fixes
- ✅ Real-time constraint enforcement

### Use Alice when you need:
- ✅ Autonomous CodeQL security remediation
- ✅ Legacy code refactoring with zero tests
- ✅ Technical debt that's "too hard to fix"
- ✅ CI/CD-integrated security automation
- ✅ Human-approved two-phase workflows
- ✅ Believing in "impossible" fixes

### Use Multi-Agent when you need:
- ✅ Complex feature requiring multiple specialties
- ✅ Parallel development across modules
- ✅ Validation loops (generate + review cycles)
- ✅ Consensus-based approvals

---

## Further Reading

### Core Documentation
- [OWASP Prompt Packs](/docs/prompts/owasp/) - Security-first prompts for all agents
- [Maintainability Prompts](/docs/prompts/maintainability/) - Fitness functions and patterns
- [SDLC Framework](/docs/sdlc/) - 6-phase framework integration
- [Golden Rules](/docs/governance/vibe-golden-rules) - Governance principles

### Agent-Specific Guides
- [Claude Guide](/docs/agents/claude) - Complex refactoring and testing
- [Copilot Guide](/docs/agents/copilot) - In-editor security-first coding
- [ChatGPT Guide](/docs/agents/chatgpt) - Threat modeling and analysis
- [Alice Guide](/docs/agents/alice) - Autonomous security remediation (agentic AI proof of concept)
- [Multi-Agent Guide](/docs/agents/multi-agent) - Orchestration patterns

---

**Next Steps**:
1. Choose your primary AI agent
2. Review its specific guide
3. Download relevant OWASP prompt packs
4. Try the [Workshop](/docs/workshop/part1-spectrum) for hands-on practice
5. Build your team's agent-specific playbook
