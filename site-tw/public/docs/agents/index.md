# AI Agent Guides

Tool-specific guidance for using the MaintainabilityAI framework with different AI assistants. Each guide provides platform-specific patterns, best practices, and integration strategies for security-first development.

---

## Available Agents

### [Claude](/docs/agents/claude)
**Best For**: Complex refactoring, multi-file changes, comprehensive testing

**Strengths**:
- Deep codebase understanding and analysis
- Multi-file refactoring with security constraints
- Comprehensive test suite generation with attack vectors
- Detailed security explanations and documentation
- Evolutionary architecture guidance

**Use Cases**:
- Large-scale security refactoring
- Architecture fitness function implementation
- Technical debt analysis and remediation
- Complex OWASP compliance reviews
- Multi-phase migration planning

**Quick Start**: [Claude Guide](/docs/agents/claude)

---

### [GitHub Copilot](/docs/agents/copilot)
**Best For**: In-editor code generation, real-time completions, pattern following

**Strengths**:
- IDE-integrated (VS Code)
- Real-time security-aware code completion
- `#codebase` context understanding
- Fast iteration on single files
- Workspace agent for codebase analysis

**Use Cases**:
- In-editor secure code generation
- Following established patterns
- Quick fixes with security constraints
- Single-function implementation
- Incremental feature development

**Quick Start**: [Copilot Guide](/docs/agents/copilot)

---

### [ChatGPT](/docs/agents/chatgpt)
**Best For**: Threat modeling, analysis, documentation, iterative refinement

**Strengths**:
- Structured security analysis (STRIDE, OWASP)
- Long-form explanations and documentation
- Multi-turn refinement conversations
- Canvas mode for iterative hardening
- Educational responses explaining "why"

**Use Cases**:
- Security threat modeling
- OWASP compliance reviews
- Architecture design discussions
- Creating comprehensive documentation
- Test scenario generation

**Quick Start**: [ChatGPT Guide](/docs/agents/chatgpt)

---

### [Multi-Agent Orchestration](/docs/agents/multi-agent)
**Best For**: Complex workflows requiring specialized expertise

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
| **Implementation** | Copilot (Code Gen) | Claude (Refactoring) | Secure implementation |
| **Verification** | Claude (Test Gen) | CodeQL, Snyk | Test suite + scan results |
| **Governance** | ChatGPT (Review) | Human | Approval decision |
| **Deployment** | GitHub Actions | - | Production deployment |
| **Evolution** | Claude (Refactor) | ChatGPT (Analysis) | Technical debt reduction |

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
[Paste /prompts/owasp/A01_broken_access_control.md]

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
- [Multi-Agent Guide](/docs/agents/multi-agent) - Orchestration patterns

---

**Next Steps**:
1. Choose your primary AI agent
2. Review its specific guide
3. Download relevant OWASP prompt packs
4. Try the [Workshop](/docs/workshop/part1-spectrum) for hands-on practice
5. Build your team's agent-specific playbook
