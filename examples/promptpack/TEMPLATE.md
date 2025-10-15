# Compact Prompt Pack Template

This template is used to create condensed versions of the full prompt packs from `/site-tw/public/docs/prompts/` for use in AI agent contexts where token efficiency matters (e.g., Claude Code remediation agent).

## Purpose

**Full Prompt Packs** (in `/site-tw/public/docs/prompts/`):
- Comprehensive tutorials (15-35KB)
- Multiple AI prompts with full context
- Detailed explanations and examples
- Extensive checklists (30+ items)
- Educational content for learning

**Compact Prompt Packs** (in `/examples/promptpack/`):
- Focused remediation reference (3-5KB)
- Single consolidated guide
- Essential patterns only
- Succinct checklist (4-6 high-level items)
- Quick reference for AI agents

## Template Structure

```markdown
# [Topic] — Compact Remediation Guide

## What is [Topic]?
[1-2 sentence definition explaining the vulnerability/pattern and its impact]

## STRIDE Mapping (for OWASP) OR Related OWASP (for others)
- **Primary**: [Main threat or OWASP category]
- **Secondary**: [Additional threats or related categories]

## Types/Patterns of [Topic]
- **Type 1**: Brief description
- **Type 2**: Brief description
- **Type 3**: Brief description
- **Type 4**: Brief description (if applicable)

## What It Looks Like (TypeScript)

\`\`\`typescript
// ❌ VULNERABLE: [Brief description]
[5-10 lines of vulnerable code showing the anti-pattern]
// Attack: [Example attack and impact]

// ❌ VULNERABLE: [Another variant if needed]
[5-10 lines showing another vulnerable pattern]
// Attack: [Example attack]
\`\`\`

## What Good Looks Like (TypeScript)

\`\`\`typescript
// ✅ SECURE: [Brief description of secure approach]
[10-20 lines of secure code with key patterns highlighted]

// ✅ Key Patterns:
// 1. [Pattern 1 with brief explanation]
// 2. [Pattern 2 with brief explanation]
// 3. [Pattern 3 with brief explanation]
// 4. [Pattern 4 with brief explanation]
// 5. [Pattern 5 with brief explanation]
\`\`\`

## Human Review Checklist

- [ ] **Category 1** — [High-level check description] (validate [specific aspect], ensure [implementation detail])

- [ ] **Category 2** — [High-level check description] (verify [specific aspect], check [implementation detail])

- [ ] **Category 3** — [High-level check description] (grep for [anti-patterns], confirm [secure patterns])

- [ ] **Category 4** — [High-level check description] (test [scenarios], validate [expected behavior])

- [ ] **Category 5** — [High-level check description] (audit [components], verify [configurations])

- [ ] **Category 6** — [High-level check description] (ensure [defense-in-depth], monitor [indicators])

---

**Key Takeaway**: [One sentence summarizing the most important principle to remember]
```

## Section Guidelines

### Header
- Format: `# [Topic] — Compact Remediation Guide`
- Use exact terminology from OWASP/STRIDE
- Include compact designation for clarity

### What is [Topic]?
- **Length**: 1-2 sentences maximum
- **Content**: Define the issue and state the impact
- **Example**: "Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query, allowing attackers to execute unintended commands or access unauthorized data."

### STRIDE/OWASP Mapping
- **For OWASP prompts**: Map to STRIDE threat model
  - Primary: Main threat (e.g., Tampering, Information Disclosure)
  - Secondary: Additional applicable threats
- **For Maintainability prompts**: Map to relevant OWASP categories
- **For STRIDE prompts**: Map to OWASP categories that address this threat

### Types/Patterns
- **Format**: Bullet list with brief descriptions
- **Count**: 4-6 items typically
- **Content**: Specific variants or manifestations
- **Example**: "SQL Injection: Malicious SQL in user input modifies database queries"

### What It Looks Like (Vulnerable)
- **Length**: 5-10 lines per example
- **Count**: 1-2 examples showing different variants
- **Format**:
  ```typescript
  // ❌ VULNERABLE: [Why it's bad]
  [minimal code showing the flaw]
  // Attack: [concrete attack example]
  ```
- **Focus**: Show the anti-pattern clearly, minimal boilerplate
- **Language**: TypeScript (Node.js context)

### What Good Looks Like (Secure)
- **Length**: 10-20 lines total
- **Format**:
  ```typescript
  // ✅ SECURE: [Why it's good]
  [code showing proper implementation]

  // ✅ Key Patterns:
  // 1-5 numbered list of critical patterns
  ```
- **Focus**: Show the complete secure pattern with imports and typing
- **Annotations**: Inline comments explaining security decisions
- **Patterns**: Numbered list extracting the key principles

### Human Review Checklist
- **Count**: 4-6 high-level categories
- **Format**: Each item has:
  - Bold category name
  - High-level description
  - Parenthetical with specific validation steps
- **Example**:
  ```markdown
  - [ ] **Parameterized Queries** — All database queries use placeholders (validate each query uses parameters array, not string concatenation)
  ```
- **Focus**: Actionable, verifiable checks
- **Guidance**: Include grep patterns, test scenarios, or audit steps in parentheses

### Key Takeaway
- **Length**: One sentence
- **Content**: Most critical principle to remember
- **Example**: "Always separate code from data using parameterized queries and input validation."

## Conversion Process

1. **Read source file** from `/site-tw/public/docs/prompts/[category]/`
2. **Extract definition** from "What is..." section
3. **Identify STRIDE/OWASP mapping** from existing content
4. **List types** from "Common Manifestations" or similar sections
5. **Condense examples**:
   - Pick 1-2 most representative vulnerable patterns
   - Create focused secure example with key patterns
6. **Distill checklist**:
   - Group detailed checks into 4-6 high-level categories
   - Add validation guidance in parentheses
7. **Write key takeaway** summarizing the core principle

## Quality Standards

- ✅ **Token Efficient**: 3-5KB target (vs 15-35KB original)
- ✅ **Self-Contained**: All essential info included
- ✅ **Actionable**: Checklist items are concrete and verifiable
- ✅ **TypeScript**: Examples use modern TypeScript patterns
- ✅ **Practical**: Focus on what developers need during remediation
- ✅ **Complete**: No external dependencies to understand the guide

## Usage in Agents

These compact guides are designed to be:
- **Embedded in issues** for Claude Code remediation
- **Fetched by automation** in examples/agents workflows
- **Consumed by LLMs** with limited context windows
- **Referenced quickly** by developers during code review

## Maintenance

When updating this template:
1. Update `TEMPLATE.md` (this file)
2. Document changes in a changelog entry
3. Regenerate affected prompt packs using updated template
4. Test with Claude Code agent to ensure effectiveness

---

**Version**: 1.0
**Last Updated**: 2025-10-15
**Maintained By**: MaintainabilityAI Project
